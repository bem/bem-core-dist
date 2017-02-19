/**
 * Modules
 *
 * Copyright (c) 2013 Filatov Dmitry (dfilatov@yandex-team.ru)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 * @version 0.1.2
 */

(function(global) {

var undef,

    DECL_STATES = {
        NOT_RESOLVED : 'NOT_RESOLVED',
        IN_RESOLVING : 'IN_RESOLVING',
        RESOLVED     : 'RESOLVED'
    },

    /**
     * Creates a new instance of modular system
     * @returns {Object}
     */
    create = function() {
        var curOptions = {
                trackCircularDependencies : true,
                allowMultipleDeclarations : true
            },

            modulesStorage = {},
            waitForNextTick = false,
            pendingRequires = [],

            /**
             * Defines module
             * @param {String} name
             * @param {String[]} [deps]
             * @param {Function} declFn
             */
            define = function(name, deps, declFn) {
                if(!declFn) {
                    declFn = deps;
                    deps = [];
                }

                var module = modulesStorage[name];
                if(!module) {
                    module = modulesStorage[name] = {
                        name : name,
                        decl : undef
                    };
                }

                module.decl = {
                    name       : name,
                    prev       : module.decl,
                    fn         : declFn,
                    state      : DECL_STATES.NOT_RESOLVED,
                    deps       : deps,
                    dependents : [],
                    exports    : undef
                };
            },

            /**
             * Requires modules
             * @param {String|String[]} modules
             * @param {Function} cb
             * @param {Function} [errorCb]
             */
            require = function(modules, cb, errorCb) {
                if(typeof modules === 'string') {
                    modules = [modules];
                }

                if(!waitForNextTick) {
                    waitForNextTick = true;
                    nextTick(onNextTick);
                }

                pendingRequires.push({
                    deps : modules,
                    cb   : function(exports, error) {
                        error?
                            (errorCb || onError)(error) :
                            cb.apply(global, exports);
                    }
                });
            },

            /**
             * Returns state of module
             * @param {String} name
             * @returns {String} state, possible values are NOT_DEFINED, NOT_RESOLVED, IN_RESOLVING, RESOLVED
             */
            getState = function(name) {
                var module = modulesStorage[name];
                return module?
                    DECL_STATES[module.decl.state] :
                    'NOT_DEFINED';
            },

            /**
             * Returns whether the module is defined
             * @param {String} name
             * @returns {Boolean}
             */
            isDefined = function(name) {
                return !!modulesStorage[name];
            },

            /**
             * Sets options
             * @param {Object} options
             */
            setOptions = function(options) {
                for(var name in options) {
                    if(options.hasOwnProperty(name)) {
                        curOptions[name] = options[name];
                    }
                }
            },

            getStat = function() {
                var res = {},
                    module;

                for(var name in modulesStorage) {
                    if(modulesStorage.hasOwnProperty(name)) {
                        module = modulesStorage[name];
                        (res[module.decl.state] || (res[module.decl.state] = [])).push(name);
                    }
                }

                return res;
            },

            onNextTick = function() {
                waitForNextTick = false;
                applyRequires();
            },

            applyRequires = function() {
                var requiresToProcess = pendingRequires,
                    i = 0, require;

                pendingRequires = [];

                while(require = requiresToProcess[i++]) {
                    requireDeps(null, require.deps, [], require.cb);
                }
            },

            requireDeps = function(fromDecl, deps, path, cb) {
                var unresolvedDepsCnt = deps.length;
                if(!unresolvedDepsCnt) {
                    cb([]);
                }

                var decls = [],
                    onDeclResolved = function(_, error) {
                        if(error) {
                            cb(null, error);
                            return;
                        }

                        if(!--unresolvedDepsCnt) {
                            var exports = [],
                                i = 0, decl;
                            while(decl = decls[i++]) {
                                exports.push(decl.exports);
                            }
                            cb(exports);
                        }
                    },
                    i = 0, len = unresolvedDepsCnt,
                    dep, decl;

                while(i < len) {
                    dep = deps[i++];
                    if(typeof dep === 'string') {
                        if(!modulesStorage[dep]) {
                            cb(null, buildModuleNotFoundError(dep, fromDecl));
                            return;
                        }

                        decl = modulesStorage[dep].decl;
                    }
                    else {
                        decl = dep;
                    }

                    decls.push(decl);

                    startDeclResolving(decl, path, onDeclResolved);
                }
            },

            startDeclResolving = function(decl, path, cb) {
                if(decl.state === DECL_STATES.RESOLVED) {
                    cb(decl.exports);
                    return;
                }
                else if(decl.state === DECL_STATES.IN_RESOLVING) {
                    curOptions.trackCircularDependencies && isDependenceCircular(decl, path)?
                        cb(null, buildCircularDependenceError(decl, path)) :
                        decl.dependents.push(cb);
                    return;
                }

                decl.dependents.push(cb);

                if(decl.prev && !curOptions.allowMultipleDeclarations) {
                    provideError(decl, buildMultipleDeclarationError(decl));
                    return;
                }

                curOptions.trackCircularDependencies && (path = path.slice()).push(decl);

                var isProvided = false,
                    deps = decl.prev? decl.deps.concat([decl.prev]) : decl.deps;

                decl.state = DECL_STATES.IN_RESOLVING;
                requireDeps(
                    decl,
                    deps,
                    path,
                    function(depDeclsExports, error) {
                        if(error) {
                            provideError(decl, error);
                            return;
                        }

                        depDeclsExports.unshift(function(exports, error) {
                            if(isProvided) {
                                cb(null, buildDeclAreadyProvidedError(decl));
                                return;
                            }

                            isProvided = true;
                            error?
                                provideError(decl, error) :
                                provideDecl(decl, exports);
                        });

                        decl.fn.apply(
                            {
                                name   : decl.name,
                                deps   : decl.deps,
                                global : global
                            },
                            depDeclsExports);
                    });
            },

            provideDecl = function(decl, exports) {
                decl.exports = exports;
                decl.state = DECL_STATES.RESOLVED;

                var i = 0, dependent;
                while(dependent = decl.dependents[i++]) {
                    dependent(exports);
                }

                decl.dependents = undef;
            },

            provideError = function(decl, error) {
                decl.state = DECL_STATES.NOT_RESOLVED;

                var i = 0, dependent;
                while(dependent = decl.dependents[i++]) {
                    dependent(null, error);
                }

                decl.dependents = [];
            };

        return {
            create     : create,
            define     : define,
            require    : require,
            getState   : getState,
            isDefined  : isDefined,
            setOptions : setOptions,
            getStat    : getStat
        };
    },

    onError = function(e) {
        nextTick(function() {
            throw e;
        });
    },

    buildModuleNotFoundError = function(name, decl) {
        return Error(decl?
            'Module "' + decl.name + '": can\'t resolve dependence "' + name + '"' :
            'Required module "' + name + '" can\'t be resolved');
    },

    buildCircularDependenceError = function(decl, path) {
        var strPath = [],
            i = 0, pathDecl;
        while(pathDecl = path[i++]) {
            strPath.push(pathDecl.name);
        }
        strPath.push(decl.name);

        return Error('Circular dependence has been detected: "' + strPath.join(' -> ') + '"');
    },

    buildDeclAreadyProvidedError = function(decl) {
        return Error('Declaration of module "' + decl.name + '" has already been provided');
    },

    buildMultipleDeclarationError = function(decl) {
        return Error('Multiple declarations of module "' + decl.name + '" have been detected');
    },

    isDependenceCircular = function(decl, path) {
        var i = 0, pathDecl;
        while(pathDecl = path[i++]) {
            if(decl === pathDecl) {
                return true;
            }
        }
        return false;
    },

    nextTick = (function() {
        var fns = [],
            enqueueFn = function(fn) {
                return fns.push(fn) === 1;
            },
            callFns = function() {
                var fnsToCall = fns, i = 0, len = fns.length;
                fns = [];
                while(i < len) {
                    fnsToCall[i++]();
                }
            };

        if(typeof process === 'object' && process.nextTick) { // nodejs
            return function(fn) {
                enqueueFn(fn) && process.nextTick(callFns);
            };
        }

        if(global.setImmediate) { // ie10
            return function(fn) {
                enqueueFn(fn) && global.setImmediate(callFns);
            };
        }

        if(global.postMessage && !global.opera) { // modern browsers
            var isPostMessageAsync = true;
            if(global.attachEvent) {
                var checkAsync = function() {
                        isPostMessageAsync = false;
                    };
                global.attachEvent('onmessage', checkAsync);
                global.postMessage('__checkAsync', '*');
                global.detachEvent('onmessage', checkAsync);
            }

            if(isPostMessageAsync) {
                var msg = '__modules' + (+new Date()),
                    onMessage = function(e) {
                        if(e.data === msg) {
                            e.stopPropagation && e.stopPropagation();
                            callFns();
                        }
                    };

                global.addEventListener?
                    global.addEventListener('message', onMessage, true) :
                    global.attachEvent('onmessage', onMessage);

                return function(fn) {
                    enqueueFn(fn) && global.postMessage(msg, '*');
                };
            }
        }

        var doc = global.document;
        if('onreadystatechange' in doc.createElement('script')) { // ie6-ie8
            var head = doc.getElementsByTagName('head')[0],
                createScript = function() {
                    var script = doc.createElement('script');
                    script.onreadystatechange = function() {
                        script.parentNode.removeChild(script);
                        script = script.onreadystatechange = null;
                        callFns();
                    };
                    head.appendChild(script);
                };

            return function(fn) {
                enqueueFn(fn) && createScript();
            };
        }

        return function(fn) { // old browsers
            enqueueFn(fn) && setTimeout(callFns, 0);
        };
    })();

if(typeof exports === 'object') {
    module.exports = create();
}
else {
    global.modules = create();
}

})(typeof window !== 'undefined' ? window : global);

/* begin: ../../common.blocks/cookie/cookie.js */
/**
 * @module cookie
 * @description Inspired from $.cookie plugin by Klaus Hartl (stilbuero.de)
 */

modules.define('cookie', function(provide) {

provide(/** @exports */{
    /**
     * Returns cookie by given name
     * @param {String} name
     * @returns {String|null}
     */
    get : function(name) {
        var res = null;
        if(document.cookie && document.cookie !== '') {
            var cookies = document.cookie.split(';');
            for(var i = 0; i < cookies.length; i++) {
                var cookie = cookies[i].trim();
                // Does this cookie string begin with the name we want?
                if(cookie.substring(0, name.length + 1) === (name + '=')) {
                    res = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return res;
    },

    /**
     * Sets cookie by given name
     * @param {String} name
     * @param {String} val
     * @param {Object} options
     * @returns {cookie} this
     */
    set : function(name, val, options) {
        options = options || {};
        if(val === null) {
            val = '';
            options.expires = -1;
        }
        var expires = '';
        if(options.expires && (typeof options.expires === 'number' || options.expires.toUTCString)) {
            var date;
            if(typeof options.expires === 'number') {
                date = new Date();
                date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
            } else {
                date = options.expires;
            }
            expires = '; expires=' + date.toUTCString(); // use expires attribute, max-age is not supported by IE
        }
        // CAUTION: Needed to parenthesize options.path and options.domain
        // in the following expressions, otherwise they evaluate to undefined
        // in the packed version for some reason...
        var path = options.path? '; path=' + (options.path) : '',
            domain = options.domain? '; domain=' + (options.domain) : '',
            secure = options.secure? '; secure' : '';
        document.cookie = [name, '=', encodeURIComponent(val), expires, path, domain, secure].join('');

        return this;
    }
});

});

/* end: ../../common.blocks/cookie/cookie.js */
/* begin: ../../common.blocks/dom/dom.js */
/**
 * @module dom
 * @description some DOM utils
 */

modules.define('dom', ['jquery'], function(provide, $) {

provide(/** @exports */{
    /**
     * Checks whether a DOM elem is in a context
     * @param {jQuery} ctx DOM elem where check is being performed
     * @param {jQuery} domElem DOM elem to check
     * @returns {Boolean}
     */
    contains : function(ctx, domElem) {
        var res = false;

        domElem.each(function() {
            var domNode = this;
            do {
                if(~ctx.index(domNode)) return !(res = true);
            } while(domNode = domNode.parentNode);

            return res;
        });

        return res;
    },

    /**
     * Returns current focused DOM elem in document
     * @returns {jQuery}
     */
    getFocused : function() {
        // "Error: Unspecified error." in iframe in IE9
        try { return $(document.activeElement); } catch(e) {}
    },

    /**
     * Checks whether a DOM element contains focus
     * @param {jQuery} domElem
     * @returns {Boolean}
     */
    containsFocus : function(domElem) {
        return this.contains(domElem, this.getFocused());
    },

    /**
    * Checks whether a browser currently can set focus on DOM elem
    * @param {jQuery} domElem
    * @returns {Boolean}
    */
    isFocusable : function(domElem) {
        var domNode = domElem[0];

        if(!domNode) return false;
        if(domNode.hasAttribute('tabindex')) return true;

        switch(domNode.tagName.toLowerCase()) {
            case 'iframe':
                return true;

            case 'input':
            case 'button':
            case 'textarea':
            case 'select':
                return !domNode.disabled;

            case 'a':
                return !!domNode.href;
        }

        return false;
    },

    /**
    * Checks whether a domElem is intended to edit text
    * @param {jQuery} domElem
    * @returns {Boolean}
    */
    isEditable : function(domElem) {
        var domNode = domElem[0];

        if(!domNode) return false;

        switch(domNode.tagName.toLowerCase()) {
            case 'input':
                var type = domNode.type;
                return (type === 'text' || type === 'password') && !domNode.disabled && !domNode.readOnly;

            case 'textarea':
                return !domNode.disabled && !domNode.readOnly;

            default:
                return domNode.contentEditable === 'true';
        }
    }
});

});

/* end: ../../common.blocks/dom/dom.js */
/* begin: ../../common.blocks/jquery/jquery.js */
/**
 * @module jquery
 * @description Provide jQuery (load if it does not exist).
 */

modules.define(
    'jquery',
    ['loader_type_js', 'jquery__config'],
    function(provide, loader, cfg) {

/* global jQuery */

function doProvide(preserveGlobal) {
    /**
     * @exports
     * @type Function
     */
    provide(preserveGlobal? jQuery : jQuery.noConflict(true));
}

typeof jQuery !== 'undefined'?
    doProvide(true) :
    loader(cfg.url, doProvide);
});

/* end: ../../common.blocks/jquery/jquery.js */
/* begin: ../../common.blocks/jquery/__config/jquery__config.js */
/**
 * @module jquery__config
 * @description Configuration for jQuery
 */

modules.define('jquery__config', function(provide) {

provide(/** @exports */{
    /**
     * URL for loading jQuery if it does not exist
     * @type {String}
     */
    url : 'https://yastatic.net/jquery/3.1.0/jquery.min.js'
});

});

/* end: ../../common.blocks/jquery/__config/jquery__config.js */
/* begin: ../../desktop.blocks/jquery/__config/jquery__config.js */
/**
 * @module jquery__config
 * @description Configuration for jQuery
 */

modules.define(
    'jquery__config',
    ['ua', 'objects'],
    function(provide, ua, objects, base) {

provide(
    ua.msie && parseInt(ua.version, 10) < 9?
        objects.extend(
            base,
            {
                url : 'https://yastatic.net/jquery/1.12.3/jquery.min.js'
            }) :
        base);

});

/* end: ../../desktop.blocks/jquery/__config/jquery__config.js */
/* begin: ../../desktop.blocks/ua/ua.js */
/**
 * @module ua
 * @description Detect some user agent features (works like jQuery.browser in jQuery 1.8)
 * @see http://code.jquery.com/jquery-migrate-1.1.1.js
 */

modules.define('ua', function(provide) {

var ua = navigator.userAgent.toLowerCase(),
    match = /(chrome)[ \/]([\w.]+)/.exec(ua) ||
        /(webkit)[ \/]([\w.]+)/.exec(ua) ||
        /(opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) ||
        /(msie) ([\w.]+)/.exec(ua) ||
        ua.indexOf('compatible') < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) ||
        [],
    matched = {
        browser : match[1] || '',
        version : match[2] || '0'
    },
    browser = {};

if(matched.browser) {
    browser[matched.browser] = true;
    browser.version = matched.version;
}

if(browser.chrome) {
    browser.webkit = true;
} else if(browser.webkit) {
    browser.safari = true;
}

/**
 * @exports
 * @type Object
 */
provide(browser);

});

/* end: ../../desktop.blocks/ua/ua.js */
/* begin: ../../common.blocks/objects/objects.vanilla.js */
/**
 * @module objects
 * @description A set of helpers to work with JavaScript objects
 */

modules.define('objects', function(provide) {

var hasOwnProp = Object.prototype.hasOwnProperty;

provide(/** @exports */{
    /**
     * Extends a given target by
     * @param {Object} target object to extend
     * @param {Object} source
     * @returns {Object}
     */
    extend : function(target, source) {
        (typeof target !== 'object' || target === null) && (target = {});

        for(var i = 1, len = arguments.length; i < len; i++) {
            var obj = arguments[i];
            if(obj) {
                for(var key in obj) {
                    hasOwnProp.call(obj, key) && (target[key] = obj[key]);
                }
            }
        }

        return target;
    },

    /**
     * Check whether a given object is empty (contains no enumerable properties)
     * @param {Object} obj
     * @returns {Boolean}
     */
    isEmpty : function(obj) {
        for(var key in obj) {
            if(hasOwnProp.call(obj, key)) {
                return false;
            }
        }

        return true;
    },

    /**
     * Generic iterator function over object
     * @param {Object} obj object to iterate
     * @param {Function} fn callback
     * @param {Object} [ctx] callbacks's context
     */
    each : function(obj, fn, ctx) {
        for(var key in obj) {
            if(hasOwnProp.call(obj, key)) {
                ctx? fn.call(ctx, obj[key], key) : fn(obj[key], key);
            }
        }
    }
});

});

/* end: ../../common.blocks/objects/objects.vanilla.js */
/* begin: ../../common.blocks/events/events.vanilla.js */
/**
 * @module events
 */

modules.define(
    'events',
    ['identify', 'inherit', 'functions'],
    function(provide, identify, inherit, functions) {

var undef,
    storageExpando = '__' + (+new Date) + 'storage',

    /**
     * @class Event
     * @exports events:Event
     */
    Event = inherit(/** @lends Event.prototype */{
        /**
         * @constructor
         * @param {String} type
         * @param {Object} target
         */
        __constructor : function(type, target) {
            /**
             * Type
             * @member {String}
             */
            this.type = type;

            /**
             * Target
             * @member {Object}
             */
            this.target = target;

            /**
             * Data
             * @member {*}
             */
            this.data = undef;

            this._isDefaultPrevented = false;
            this._isPropagationStopped = false;
        },

        /**
         * Prevents default action
         */
        preventDefault : function() {
            this._isDefaultPrevented = true;
        },

        /**
         * Returns whether is default action prevented
         * @returns {Boolean}
         */
        isDefaultPrevented : function() {
            return this._isDefaultPrevented;
        },

        /**
         * Stops propagation
         */
        stopPropagation : function() {
            this._isPropagationStopped = true;
        },

        /**
         * Returns whether is propagation stopped
         * @returns {Boolean}
         */
        isPropagationStopped : function() {
            return this._isPropagationStopped;
        }
    }),

    /**
     * @class Emitter
     * @exports events:Emitter
     */
    Emitter = inherit(/** @lends Emitter.prototype */{
        /**
         * Adds an event handler
         * @param {String} e Event type
         * @param {Object} [data] Additional data that the handler gets as e.data
         * @param {Function} fn Handler
         * @param {Object} [ctx] Handler context
         * @returns {Emitter} this
         */
        on : function(e, data, fn, ctx, _special) {
            if(typeof e === 'string') {
                if(functions.isFunction(data)) {
                    ctx = fn;
                    fn = data;
                    data = undef;
                }

                var id = identify(fn, ctx),
                    storage = this[storageExpando] || (this[storageExpando] = {}),
                    eventTypes = e.split(' '), eventType,
                    i = 0, list, item,
                    eventStorage;

                while(eventType = eventTypes[i++]) {
                    eventStorage = storage[eventType] || (storage[eventType] = { ids : {}, list : {} });
                    if(!(id in eventStorage.ids)) {
                        list = eventStorage.list;
                        item = { fn : fn, data : data, ctx : ctx, special : _special };
                        if(list.last) {
                            list.last.next = item;
                            item.prev = list.last;
                        } else {
                            list.first = item;
                        }
                        eventStorage.ids[id] = list.last = item;
                    }
                }
            } else {
                for(var key in e) {
                    e.hasOwnProperty(key) && this.on(key, e[key], data, _special);
                }
            }

            return this;
        },

        /**
         * Adds a one time handler for the event.
         * Handler is executed only the next time the event is fired, after which it is removed.
         * @param {String} e Event type
         * @param {Object} [data] Additional data that the handler gets as e.data
         * @param {Function} fn Handler
         * @param {Object} [ctx] Handler context
         * @returns {Emitter} this
         */
        once : function(e, data, fn, ctx) {
            return this.on(e, data, fn, ctx, { once : true });
        },

        /**
         * Removes event handler or handlers
         * @param {String} [e] Event type
         * @param {Function} [fn] Handler
         * @param {Object} [ctx] Handler context
         * @returns {Emitter} this
         */
        un : function(e, fn, ctx) {
            if(typeof e === 'string' || typeof e === 'undefined') {
                var storage = this[storageExpando];
                if(storage) {
                    if(e) { // if event type was passed
                        var eventTypes = e.split(' '),
                            i = 0, eventStorage;
                        while(e = eventTypes[i++]) {
                            if(eventStorage = storage[e]) {
                                if(fn) {  // if specific handler was passed
                                    var id = identify(fn, ctx),
                                        ids = eventStorage.ids;
                                    if(id in ids) {
                                        var list = eventStorage.list,
                                            item = ids[id],
                                            prev = item.prev,
                                            next = item.next;

                                        if(prev) {
                                            prev.next = next;
                                        } else if(item === list.first) {
                                            list.first = next;
                                        }

                                        if(next) {
                                            next.prev = prev;
                                        } else if(item === list.last) {
                                            list.last = prev;
                                        }

                                        delete ids[id];
                                    }
                                } else {
                                    delete this[storageExpando][e];
                                }
                            }
                        }
                    } else {
                        delete this[storageExpando];
                    }
                }
            } else {
                for(var key in e) {
                    e.hasOwnProperty(key) && this.un(key, e[key], fn);
                }
            }

            return this;
        },

        /**
         * Fires event handlers
         * @param {String|events:Event} e Event
         * @param {Object} [data] Additional data
         * @returns {Emitter} this
         */
        emit : function(e, data) {
            var storage = this[storageExpando],
                eventInstantiated = false;

            if(storage) {
                var eventTypes = [typeof e === 'string'? e : e.type, '*'],
                    i = 0, eventType, eventStorage;
                while(eventType = eventTypes[i++]) {
                    if(eventStorage = storage[eventType]) {
                        var item = eventStorage.list.first,
                            lastItem = eventStorage.list.last,
                            res;
                        while(item) {
                            if(!eventInstantiated) { // instantiate Event only on demand
                                eventInstantiated = true;
                                typeof e === 'string' && (e = new Event(e));
                                e.target || (e.target = this);
                            }

                            e.data = item.data;
                            res = item.fn.apply(item.ctx || this, arguments);
                            if(res === false) {
                                e.preventDefault();
                                e.stopPropagation();
                            }

                            item.special && item.special.once &&
                                this.un(e.type, item.fn, item.ctx);

                            if(item === lastItem) {
                                break;
                            }

                            item = item.next;
                        }
                    }
                }
            }

            return this;
        }
    });

provide({
    Emitter : Emitter,
    Event : Event
});

});

/* end: ../../common.blocks/events/events.vanilla.js */
/* begin: ../../common.blocks/inherit/inherit.vanilla.js */
/**
 * @module inherit
 * @version 2.2.1
 * @author Filatov Dmitry <dfilatov@yandex-team.ru>
 * @description This module provides some syntax sugar for "class" declarations, constructors, mixins, "super" calls and static members.
 */

(function(global) {

var hasIntrospection = (function(){'_';}).toString().indexOf('_') > -1,
    emptyBase = function() {},
    hasOwnProperty = Object.prototype.hasOwnProperty,
    objCreate = Object.create || function(ptp) {
        var inheritance = function() {};
        inheritance.prototype = ptp;
        return new inheritance();
    },
    objKeys = Object.keys || function(obj) {
        var res = [];
        for(var i in obj) {
            hasOwnProperty.call(obj, i) && res.push(i);
        }
        return res;
    },
    extend = function(o1, o2) {
        for(var i in o2) {
            hasOwnProperty.call(o2, i) && (o1[i] = o2[i]);
        }

        return o1;
    },
    toStr = Object.prototype.toString,
    isArray = Array.isArray || function(obj) {
        return toStr.call(obj) === '[object Array]';
    },
    isFunction = function(obj) {
        return toStr.call(obj) === '[object Function]';
    },
    noOp = function() {},
    needCheckProps = true,
    testPropObj = { toString : '' };

for(var i in testPropObj) { // fucking ie hasn't toString, valueOf in for
    testPropObj.hasOwnProperty(i) && (needCheckProps = false);
}

var specProps = needCheckProps? ['toString', 'valueOf'] : null;

function getPropList(obj) {
    var res = objKeys(obj);
    if(needCheckProps) {
        var specProp, i = 0;
        while(specProp = specProps[i++]) {
            obj.hasOwnProperty(specProp) && res.push(specProp);
        }
    }

    return res;
}

function override(base, res, add) {
    var addList = getPropList(add),
        j = 0, len = addList.length,
        name, prop;
    while(j < len) {
        if((name = addList[j++]) === '__self') {
            continue;
        }
        prop = add[name];
        if(isFunction(prop) &&
                (!hasIntrospection || prop.toString().indexOf('.__base') > -1)) {
            res[name] = (function(name, prop) {
                var baseMethod = base[name]?
                        base[name] :
                        name === '__constructor'? // case of inheritance from plane function
                            res.__self.__parent :
                            noOp;
                return function() {
                    var baseSaved = this.__base;
                    this.__base = baseMethod;
                    var res = prop.apply(this, arguments);
                    this.__base = baseSaved;
                    return res;
                };
            })(name, prop);
        } else {
            res[name] = prop;
        }
    }
}

function applyMixins(mixins, res) {
    var i = 1, mixin;
    while(mixin = mixins[i++]) {
        res?
            isFunction(mixin)?
                inherit.self(res, mixin.prototype, mixin) :
                inherit.self(res, mixin) :
            res = isFunction(mixin)?
                inherit(mixins[0], mixin.prototype, mixin) :
                inherit(mixins[0], mixin);
    }
    return res || mixins[0];
}

/**
* Creates class
* @exports
* @param {Function|Array} [baseClass|baseClassAndMixins] class (or class and mixins) to inherit from
* @param {Object} prototypeFields
* @param {Object} [staticFields]
* @returns {Function} class
*/
function inherit() {
    var args = arguments,
        withMixins = isArray(args[0]),
        hasBase = withMixins || isFunction(args[0]),
        base = hasBase? withMixins? applyMixins(args[0]) : args[0] : emptyBase,
        props = args[hasBase? 1 : 0] || {},
        staticProps = args[hasBase? 2 : 1],
        res = props.__constructor || (hasBase && base.prototype.__constructor)?
            function() {
                return this.__constructor.apply(this, arguments);
            } :
            hasBase?
                function() {
                    return base.apply(this, arguments);
                } :
                function() {};

    if(!hasBase) {
        res.prototype = props;
        res.prototype.__self = res.prototype.constructor = res;
        return extend(res, staticProps);
    }

    extend(res, base);

    res.__parent = base;

    var basePtp = base.prototype,
        resPtp = res.prototype = objCreate(basePtp);

    resPtp.__self = resPtp.constructor = res;

    props && override(basePtp, resPtp, props);
    staticProps && override(base, res, staticProps);

    return res;
}

inherit.self = function() {
    var args = arguments,
        withMixins = isArray(args[0]),
        base = withMixins? applyMixins(args[0], args[0][0]) : args[0],
        props = args[1],
        staticProps = args[2],
        basePtp = base.prototype;

    props && override(basePtp, basePtp, props);
    staticProps && override(base, base, staticProps);

    return base;
};

var defineAsGlobal = true;
if(typeof exports === 'object') {
    module.exports = inherit;
    defineAsGlobal = false;
}

if(typeof modules === 'object') {
    modules.define('inherit', function(provide) {
        provide(inherit);
    });
    defineAsGlobal = false;
}

if(typeof define === 'function') {
    define(function(require, exports, module) {
        module.exports = inherit;
    });
    defineAsGlobal = false;
}

defineAsGlobal && (global.inherit = inherit);

})(this);

/* end: ../../common.blocks/inherit/inherit.vanilla.js */
/* begin: ../../common.blocks/identify/identify.vanilla.js */
/**
 * @module identify
 */

modules.define('identify', function(provide) {

var counter = 0,
    expando = '__' + (+new Date),
    global = this.global,
    get = function() {
        return 'uniq' + (++counter);
    },
    identify = function(obj) {
        if((typeof obj === 'object' && obj !== null) || typeof obj === 'function') {
            var key;
            if('uniqueID' in obj) {
                obj === global.document && (obj = obj.documentElement);
                key = 'uniqueID';
            } else {
                key = expando;
            }
            return key in obj?
                obj[key] :
                obj[key] = get();
        }

        return '';
    };

provide(
    /**
     * Makes unique ID
     * @exports
     * @param {?...Object} obj Object that needs to be identified
     * @returns {String} ID
     */
    function(obj) {
        if(arguments.length) {
            if(arguments.length === 1) {
                return identify(obj);
            }

            var res = [];
            for(var i = 0, len = arguments.length; i < len; i++) {
                res.push(identify(arguments[i]));
            }
            return res.sort().join('');
        }

        return get();
    }
);

});

/* end: ../../common.blocks/identify/identify.vanilla.js */
/* begin: ../../common.blocks/functions/functions.vanilla.js */
/**
 * @module functions
 * @description A set of helpers to work with JavaScript functions
 */

modules.define('functions', function(provide) {

var toStr = Object.prototype.toString;

provide(/** @exports */{
    /**
     * Checks whether a given object is function
     * @param {*} obj
     * @returns {Boolean}
     */
    isFunction : function(obj) {
        return toStr.call(obj) === '[object Function]';
    },

    /**
     * Empty function
     */
    noop : function() {}
});

});

/* end: ../../common.blocks/functions/functions.vanilla.js */
/* begin: ../../common.blocks/events/__channels/events__channels.vanilla.js */
/**
 * @module events__channels
 */

modules.define('events__channels', ['events'], function(provide, events) {

var undef,
    channels = {};

provide(
    /**
     * Returns/destroys a named communication channel
     * @exports
     * @param {String} [id='default'] Channel ID
     * @param {Boolean} [drop=false] Destroy the channel
     * @returns {events:Emitter|undefined} Communication channel
     */
    function(id, drop) {
        if(typeof id === 'boolean') {
            drop = id;
            id = undef;
        }

        id || (id = 'default');

        if(drop) {
            if(channels[id]) {
                channels[id].un();
                delete channels[id];
            }
            return;
        }

        return channels[id] || (channels[id] = new events.Emitter());
    });
});

/* end: ../../common.blocks/events/__channels/events__channels.vanilla.js */
/* begin: ../../common.blocks/events/__observable/events__observable.js */
/**
 * @module events__observable
 */

modules.define(
    'events__observable',
    ['inherit'],
    function(provide, inherit) {

/**
 * @class Observable
 */
var Observable = inherit(/** @lends Observable.prototype */{
    /**
     * @constructor
     * @param {Object} emitter
     */
    __constructor : function(emitter) {
        this._emitter = emitter;
    },

    /**
     * Adds an event handler
     * @param {String} e Event type
     * @param {Object} [data] Additional data that the handler gets as e.data
     * @param {Function} fn Handler
     * @param {Object} [fnCtx] Context
     * @returns {Observable} this
     */
    on : function(e, data, fn, fnCtx) {
        this._emitter.on.apply(this._emitter, arguments);
        return this;
    },

    /**
     * Adds an event handler
     * @param {String} e Event type
     * @param {Object} [data] Additional data that the handler gets as e.data
     * @param {Function} fn Handler
     * @param {Object} [fnCtx] Context
     * @returns {Observable} this
     */
    once : function(e, data, fn, fnCtx) {
        this._emitter.once.apply(this._emitter, arguments);
        return this;
    },

    /**
     * Removes event handler
     * @param {String} [e] Event type
     * @param {Function} [fn] Handler
     * @param {Object} [fnCtx] Context
     * @returns {Observable} this
     */
    un : function(e, fn, fnCtx) {
        this._emitter.un.apply(this._emitter, arguments);
        return this;
    }
});

provide(
    /**
     * Creates new observable
     * @exports
     * @param {events:Emitter} emitter
     * @returns {Observable}
     */
    function(emitter) {
        return new Observable(emitter);
    }
);

});

/* end: ../../common.blocks/events/__observable/events__observable.js */
/* begin: ../../common.blocks/i-bem-dom/i-bem-dom.js */
/**
 * @module i-bem-dom
 */

modules.define(
    'i-bem-dom',
    [
        'i-bem',
        'i-bem__internal',
        'i-bem-dom__collection',
        'i-bem-dom__events_type_dom',
        'i-bem-dom__events_type_bem',
        'inherit',
        'identify',
        'objects',
        'functions',
        'jquery',
        'dom'
    ],
    function(
        provide,
        bem,
        bemInternal,
        BemDomCollection,
        domEvents,
        bemEvents,
        inherit,
        identify,
        objects,
        functions,
        $,
        dom) {

var undef,
    /**
     * Storage for DOM elements by unique key
     * @type Object
     */
    uniqIdToDomElems = {},

    /**
     * Storage for blocks by unique key
     * @type Object
     */
    uniqIdToEntity = {},

    /**
    * Storage for DOM element's parent nodes
    * @type Object
    */
    domNodesToParents = {},

    /**
     * Storage for block parameters
     * @type Object
     */
    domElemToParams = {},

    /**
     * Storage for DOM nodes that are being destructed
     * @type Object
     */
    destructingDomNodes = {},

    entities = bem.entities,

    BEM_CLASS_NAME = 'i-bem',
    BEM_SELECTOR = '.' + BEM_CLASS_NAME,
    BEM_PARAMS_ATTR = 'data-bem',

    NAME_PATTERN = bemInternal.NAME_PATTERN,

    MOD_DELIM = bemInternal.MOD_DELIM,
    ELEM_DELIM = bemInternal.ELEM_DELIM,

    buildModPostfix = bemInternal.buildModPostfix,
    buildClassName = bemInternal.buildClassName,

    reverse = Array.prototype.reverse,
    slice = Array.prototype.slice,

    domEventManagerFactory = new domEvents.EventManagerFactory(getEntityCls),
    bemEventManagerFactory = new bemEvents.EventManagerFactory(getEntityCls),

    bemDom;

/**
 * Initializes entities on a DOM element
 * @param {jQuery} domElem DOM element
 * @param {String} uniqInitId ID of the "initialization wave"
 * @param {Object} [dropElemCacheQueue] queue of elems to be droped from cache
 */
function initEntities(domElem, uniqInitId, dropElemCacheQueue) {
    var domNode = domElem[0],
        params = getParams(domNode),
        entityName,
        splitted,
        blockName,
        elemName;

    for(entityName in params) {
        if(dropElemCacheQueue) {
            splitted = entityName.split(ELEM_DELIM);
            blockName = splitted[0];
            elemName = splitted[1];
            elemName &&
                ((dropElemCacheQueue[blockName] ||
                    (dropElemCacheQueue[blockName] = {}))[elemName] = true);
        }

        initEntity(
            entityName,
            domElem,
            processParams(params[entityName], entityName, uniqInitId));
    }
}

/**
 * Initializes a specific entity on a DOM element, or returns the existing entity if it was already created
 * @param {String} entityName Entity name
 * @param {jQuery} domElem DOM element
 * @param {Object} [params] Initialization parameters
 * @param {Boolean} [ignoreLazyInit=false] Ignore lazy initialization
 * @param {Function} [callback] Handler to call after complete initialization
 */
function initEntity(entityName, domElem, params, ignoreLazyInit, callback) {
    var domNode = domElem[0];

    if(destructingDomNodes[identify(domNode)]) return;

    params || (params = processParams(getEntityParams(domNode, entityName), entityName));

    var uniqId = params.uniqId,
        entity = uniqIdToEntity[uniqId];

    if(entity) {
        if(entity.domElem.index(domNode) < 0) {
            entity.domElem = entity.domElem.add(domElem);
            objects.extend(entity.params, params);
        }

        return entity;
    }

    uniqIdToDomElems[uniqId] = uniqIdToDomElems[uniqId]?
        uniqIdToDomElems[uniqId].add(domElem) :
        domElem;

    var parentDomNode = domNode.parentNode;
    if(!parentDomNode || parentDomNode.nodeType === 11) { // jquery doesn't unique disconnected node
        $.unique(uniqIdToDomElems[uniqId]);
    }

    var entityCls = getEntityCls(entityName);

    entityCls._processInit();

    if(!entityCls.lazyInit || ignoreLazyInit || params.lazyInit === false) {
        ignoreLazyInit && domElem.addClass(BEM_CLASS_NAME); // add css class for preventing memory leaks in further destructing

        entity = new entityCls(uniqIdToDomElems[uniqId], params, !!ignoreLazyInit);
        delete uniqIdToDomElems[uniqId];
        callback && callback.apply(entity, slice.call(arguments, 4));
        return entity;
    }
}

function getEntityCls(entityName) {
    if(entities[entityName]) return entities[entityName];

    var splitted = entityName.split(ELEM_DELIM);
    return splitted[1]?
        bemDom.declElem(splitted[0], splitted[1], {}, { lazyInit : true }, true) :
        bemDom.declBlock(entityName, {}, { lazyInit : true }, true);
}

/**
 * Processes and adds necessary entity parameters
 * @param {Object} params Initialization parameters
 * @param {String} entityName Entity name
 * @param {String} [uniqInitId] ID of the "initialization wave"
 */
function processParams(params, entityName, uniqInitId) {
    params.uniqId ||
        (params.uniqId = (params.id?
            entityName + '-id-' + params.id :
            identify()) + (uniqInitId || identify()));

    return params;
}

/**
 * Helper for searching for a DOM element using a selector inside the context, including the context itself
 * @param {jQuery} ctx Context
 * @param {String} selector CSS selector
 * @param {Boolean} [excludeSelf=false] Exclude context from search
 * @returns {jQuery}
 */
function findDomElem(ctx, selector, excludeSelf) {
    var res = ctx.find(selector);
    return excludeSelf?
       res :
       res.add(ctx.filter(selector));
}

/**
 * Returns parameters of an entity's DOM element
 * @param {HTMLElement} domNode DOM node
 * @returns {Object}
 */
function getParams(domNode) {
    var uniqId = identify(domNode);
    return domElemToParams[uniqId] ||
        (domElemToParams[uniqId] = extractParams(domNode));
}

/**
 * Returns parameters of an entity extracted from DOM node
 * @param {HTMLElement} domNode DOM node
 * @param {String} blockName
 * @returns {Object}
 */

function getEntityParams(domNode, blockName) {
    var params = getParams(domNode);
    return params[blockName] || (params[blockName] = {});
}

/**
 * Retrieves entity parameters from a DOM element
 * @param {HTMLElement} domNode DOM node
 * @returns {Object}
 */
function extractParams(domNode) {
    var attrVal = domNode.getAttribute(BEM_PARAMS_ATTR);
    return attrVal? JSON.parse(attrVal) : {};
}

/**
 * Uncouple DOM node from the entity. If this is the last node, then destroys the entity.
 * @param {BemDomEntity} entity entity
 * @param {HTMLElement} domNode DOM node
 */
function removeDomNodeFromEntity(entity, domNode) {
    if(entity.domElem.length === 1) {
        entity._delInitedMod();
        delete uniqIdToEntity[entity._uniqId];
    } else {
        entity.domElem = entity.domElem.not(domNode);
    }
}

/**
 * Stores DOM node's parent nodes to the storage
 * @param {jQuery} domElem
 */
function storeDomNodeParents(domElem) {
    domElem.each(function() {
        domNodesToParents[identify(this)] = this.parentNode;
    });
}

/**
 * Clears the cache for elements in context
 * @param {jQuery} ctx
 */
function dropElemCacheForCtx(ctx, dropElemCacheQueue) {
    ctx.add(ctx.parents()).each(function(_, domNode) {
        var params = domElemToParams[identify(domNode)];

        params && objects.each(params, function(entityParams) {
            var entity = uniqIdToEntity[entityParams.uniqId];
            if(entity) {
                var elemNames = dropElemCacheQueue[entity.__self._blockName];
                elemNames && entity._dropElemCache(Object.keys(elemNames));
            }
        });
    });

    dropElemCacheQueue = {};
}

/**
 * Build key for elem
 * @param {Function|String|Object} elem Element class or name or description elem, modName, modVal
 * @returns {Object}
 */
function buildElemKey(elem) {
    if(typeof elem === 'string') {
        elem = { elem : elem };
    } else if(functions.isFunction(elem)) {
        elem = { elem : elem.getName() };
    } else if(functions.isFunction(elem.elem)) {
        elem.elem = elem.elem.getName();
    }

    return {
        elem : elem.elem,
        mod : buildModPostfix(elem.modName, elem.modVal)
    };
}

// jscs:disable requireMultipleVarDecl

/**
 * Returns jQuery collection for provided HTML
 * @param {jQuery|String} html
 * @returns {jQuery}
 */
function getJqueryCollection(html) {
    return $(typeof html === 'string'? $.parseHTML(html, null, true) : html);
}

/**
 * @class BemDomEntity
 * @description Base mix for BEM entities that have DOM representation
 */
var BemDomEntity = inherit(/** @lends BemDomEntity.prototype */{
    /**
     * @constructor
     * @private
     * @param {jQuery} domElem DOM element that the entity is created on
     * @param {Object} params parameters
     * @param {Boolean} [initImmediately=true]
     */
    __constructor : function(domElem, params, initImmediately) {
        /**
         * DOM elements of entity
         * @member {jQuery}
         * @readonly
         */
        this.domElem = domElem;

        /**
         * Cache for elements collections
         * @member {Object}
         * @private
         */
        this._elemsCache = {};

        /**
         * Cache for elements
         * @member {Object}
         * @private
         */
        this._elemCache = {};

        /**
         * References to parent entities which found current entity ever
         * @type {Array}
         * @private
         */
        this._findBackRefs = [];

        uniqIdToEntity[params.uniqId || identify(this)] = this;

        this.__base(null, params, initImmediately);
    },

    /**
     * @abstract
     * @protected
     * @returns {Block}
     */
    _block : function() {},

    /**
     * Lazy search for elements nested in a block (caches results)
     * @protected
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @returns {BemDomCollection}
     */
    _elems : function(Elem) {
        var key = buildElemKey(Elem),
            elemsCache = this._elemsCache[key.elem];

        if(elemsCache && key.mod in elemsCache)
            return elemsCache[key.mod];

        var res = (elemsCache || (this._elemsCache[key.elem] = {}))[key.mod] =
            this.findMixedElems(Elem).concat(this.findChildElems(Elem));

        res.forEach(function(entity) {
            entity._findBackRefs.push(this);
        }, this);

        return res;
    },

    /**
     * Lazy search for the first element nested in a block (caches results)
     * @protected
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @returns {Elem}
     */
    _elem : function(Elem) {
        var key = buildElemKey(Elem),
            elemCache = this._elemCache[key.elem];

        // NOTE: can use this._elemsCache but it's too rare case
        if(elemCache && key.mod in elemCache)
            return elemCache[key.mod];

        var res = (elemCache || (this._elemCache[key.elem] = {}))[key.mod] =
            this.findMixedElem(Elem) || this.findChildElem(Elem);

        res && res._findBackRefs.push(this);

        return res;
    },

    /**
     * Clears the cache for elements
     * @private
     * @param {?...(Function|String|Object)} elems Nested elements names or description elem, modName, modVal
     * @returns {BemDomEntity} this
     */
    _dropElemCache : function(elems) {
        if(!arguments.length) {
            this._elemsCache = {};
            this._elemCache = {};
            return this;
        }

        (Array.isArray(elems)? elems : slice.call(arguments)).forEach(function(elem) {
            var key = buildElemKey(elem);
            if(key.mod) {
                this._elemsCache[key.elem] && delete this._elemsCache[key.elem][key.mod];
                this._elemCache[key.elem] && delete this._elemCache[key.elem][key.mod];
            } else {
                delete this._elemsCache[key.elem];
                delete this._elemCache[key.elem];
            }
        }, this);

        return this;
    },

    /**
     * Finds the first child block
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {Block}
     */
    findChildBlock : function(Block) {
        // TODO: throw if Block passed as a string
        return this._findEntities('find', Block, true);
    },

    /**
     * Finds child blocks
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {BemDomCollection}
     */
    findChildBlocks : function(Block) {
        return this._findEntities('find', Block);
    },

    /**
     * Finds the first parent block
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {Block}
     */
    findParentBlock : function(Block) {
        return this._findEntities('parents', Block, true);
    },

    /**
     * Finds parent blocks
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {BemDomCollection}
     */
    findParentBlocks : function(Block) {
        return this._findEntities('parents', Block);
    },

    /**
     * Finds first mixed block
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {Block}
     */
    findMixedBlock : function(Block) {
        return this._findEntities('filter', Block, true);
    },

    /**
     * Finds mixed blocks
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {BemDomCollection}
     */
    findMixedBlocks : function(Block) {
        return this._findEntities('filter', Block);
    },

    /**
     * Finds the first child element
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @param {Boolean} [strictMode=false]
     * @returns {Elem}
     */
    findChildElem : function(Elem, strictMode) {
        return strictMode?
            this._filterFindElemResults(this._findEntities('find', Elem)).get(0) :
            this._findEntities('find', Elem, true);
    },

    /**
     * Finds child elements
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @param {Boolean} [strictMode=false]
     * @returns {BemDomCollection}
     */
    findChildElems : function(Elem, strictMode) {
        var res = this._findEntities('find', Elem);

        return strictMode?
            this._filterFindElemResults(res) :
            res;
    },

    /**
     * Finds the first parent element
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @param {Boolean} [strictMode=false]
     * @returns {Elem}
     */
    findParentElem : function(Elem, strictMode) {
        return strictMode?
            this._filterFindElemResults(this._findEntities('parents', Elem))[0] :
            this._findEntities('parents', Elem, true);
    },

    /**
     * Finds parent elements
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @param {Boolean} [strictMode=false]
     * @returns {BemDomCollection}
     */
    findParentElems : function(Elem, strictMode) {
        var res = this._findEntities('parents', Elem);
        return strictMode? this._filterFindElemResults(res) : res;
    },

    /**
     * Finds the first mixed element
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @returns {Elem}
     */
    findMixedElem : function(Elem) {
        return this._findEntities('filter', Elem, true);
    },

    /**
     * Finds mixed elements.
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @returns {BemDomCollection}
     */
    findMixedElems : function(Elem) {
        return this._findEntities('filter', Elem);
    },

    /**
     * Filters results of findElem helper execution in strict mode
     * @private
     * @param {BemDomCollection} res Elements
     * @returns {BemDomCollection}
     */
    _filterFindElemResults : function(res) {
        var block = this._block();
        return res.filter(function(elem) {
            return elem._block() === block;
        });
    },

    /**
     * Finds entities
     * @private
     * @param {String} select
     * @param {Function|String|Object} entity
     * @param {Boolean} [onlyFirst=false]
     * @returns {*}
     */
    _findEntities : function(select, entity, onlyFirst) {
        var entityName = functions.isFunction(entity)?
                entity.getEntityName() :
                typeof entity === 'object'?
                    entity.block?
                        entity.block.getEntityName() :
                        typeof entity.elem === 'string'?
                            this.__self._blockName + ELEM_DELIM + entity.elem :
                            entity.elem.getEntityName() :
                    this.__self._blockName + ELEM_DELIM + entity,
            selector = '.' +
                (typeof entity === 'object'?
                    buildClassName(
                        entityName,
                        entity.modName,
                        typeof entity.modVal === 'undefined'?
                            true :
                            entity.modVal) :
                    entityName) +
                (onlyFirst? ':first' : ''),
            domElems = this.domElem[select](selector);

        if(onlyFirst) return domElems[0]?
            initEntity(entityName, domElems.eq(0), undef, true)._setInitedMod() :
            null;

        var res = [],
            uniqIds = {};

        domElems.each(function(i, domElem) {
            var block = initEntity(entityName, $(domElem), undef, true)._setInitedMod();
            if(!uniqIds[block._uniqId]) {
                uniqIds[block._uniqId] = true;
                res.push(block);
            }
        });

        return new BemDomCollection(res);
    },

    /**
     * Returns an manager to bind and unbind DOM events for particular context
     * @protected
     * @param {Function|String|Object|Elem|BemDomCollection|document|window} [ctx=this.domElem] context to bind,
     *     can be BEM-entity class, instance, collection of BEM-entities,
     *     element name or description (elem, modName, modVal), document or window
     * @returns {EventManager}
     */
    _domEvents : function(ctx) {
        return domEventManagerFactory.getEventManager(this, ctx, this.domElem);
    },

    /**
     * Returns an manager to bind and unbind BEM events for particular context
     * @protected
     * @param {Function|String|BemDomEntity|BemDomCollection|Object} [ctx=this.domElem] context to bind,
     *     can be BEM-entity class, instance, collection of BEM-entities,
     *     element name or description (elem, modName, modVal)
     * @returns {EventManager}
     */
    _events : function(ctx) {
        return bemEventManagerFactory.getEventManager(this, ctx, this.domElem);
    },

    /**
     * Executes the BEM entity's event handlers and delegated handlers
     * @protected
     * @param {String|Object|events:Event} e Event name
     * @param {Object} [data] Additional information
     * @returns {BemEntity} this
     */
    _emit : function(e, data) {
        if((typeof e === 'object' && e.modName === 'js') || this.hasMod('js', 'inited')) {
            bemEvents.emit(this, e, data);
        }

        return this;
    },

    /** @override */
    _extractModVal : function(modName) {
        var domNode = this.domElem[0],
            matches;

        domNode &&
            (matches = domNode.className
                .match(this.__self._buildModValRE(modName)));

        return matches? matches[2] || true : '';
    },

    /** @override */
    _onSetMod : function(modName, modVal, oldModVal) {
        var _self = this.__self,
            name = _self.getName();

        this._findBackRefs.forEach(function(ref) {
            oldModVal === '' || ref._dropElemCache({ elem : name, modName : modName, modVal : oldModVal });
            ref._dropElemCache(modVal === ''? name : { elem : name, modName : modName, modVal : modVal });
        });

        this.__base.apply(this, arguments);

        if(modName !== 'js' || modVal !== '') {
            var classNamePrefix = _self._buildModClassNamePrefix(modName),
                classNameRE = _self._buildModValRE(modName),
                needDel = modVal === '';

            this.domElem.each(function() {
                var className = this.className,
                    modClassName = classNamePrefix;

                modVal !== true && (modClassName += MOD_DELIM + modVal);

                (oldModVal === true?
                    classNameRE.test(className) :
                    (' ' + className).indexOf(' ' + classNamePrefix + MOD_DELIM) > -1)?
                        this.className = className.replace(
                            classNameRE,
                            (needDel? '' : '$1' + modClassName)) :
                        needDel || $(this).addClass(modClassName);
            });
        }
    },

    /** @override */
    _afterSetMod : function(modName, modVal, oldModVal) {
        var eventData = { modName : modName, modVal : modVal, oldModVal : oldModVal };
        this
            ._emit({ modName : modName, modVal : '*' }, eventData)
            ._emit({ modName : modName, modVal : modVal }, eventData);
    },

    /**
     * Checks whether an entity is in the entity
     * @param {BemDomEntity} entity entity
     * @returns {Boolean}
     */
    containsEntity : function(entity) {
        return dom.contains(this.domElem, entity.domElem);
    }

}, /** @lends BemDomEntity */{
    /** @override */
    create : function() {
        throw Error('bemDom entities can not be created otherwise than from DOM');
    },

    /** @override */
    _processInit : function(heedInit) {
        /* jshint eqeqeq: false */
        if(this.onInit && this._inited == heedInit) {
            this.__base(heedInit);

            this.onInit();

            var name = this.getName(),
                origOnInit = this.onInit;

            // allow future calls of init only in case of inheritance in other block
            this.init = function() {
                this.getName() === name && origOnInit.apply(this, arguments);
            };
        }
    },

    /**
     * Returns an manager to bind and unbind events for particular context
     * @protected
     * @param {Function|String|Object} [ctx] context to bind,
     *     can be BEM-entity class, instance, element name or description (elem, modName, modVal)
     * @returns {EventManager}
     */
    _domEvents : function(ctx) {
        return domEventManagerFactory.getEventManager(this, ctx, bemDom.scope);
    },

    /**
     * Returns an manager to bind and unbind BEM events for particular context
     * @protected
     * @param {Function|String|Object} [ctx] context to bind,
     *     can be BEM-entity class, instance, element name or description (block or elem, modName, modVal)
     * @returns {EventManager}
     */
    _events : function(ctx) {
        return bemEventManagerFactory.getEventManager(this, ctx, bemDom.scope);
    },

    /**
     * Builds a prefix for the CSS class of a DOM element of the entity, based on modifier name
     * @private
     * @param {String} modName Modifier name
     * @returns {String}
     */
    _buildModClassNamePrefix : function(modName) {
        return this.getEntityName() + MOD_DELIM + modName;
    },

    /**
     * Builds a regular expression for extracting modifier values from a DOM element of an entity
     * @private
     * @param {String} modName Modifier name
     * @returns {RegExp}
     */
    _buildModValRE : function(modName) {
        return new RegExp(
            '(\\s|^)' +
            this._buildModClassNamePrefix(modName) +
            '(?:' + MOD_DELIM + '(' + NAME_PATTERN + '))?(?=\\s|$)');
    },

    /**
     * Builds a CSS class name corresponding to the entity and modifier
     * @protected
     * @param {String} [modName] Modifier name
     * @param {String} [modVal] Modifier value
     * @returns {String}
     */
    _buildClassName : function(modName, modVal) {
        return buildClassName(this.getEntityName(), modName, modVal);
    },

    /**
     * Builds a CSS selector corresponding to an entity and modifier
     * @protected
     * @param {String} [modName] Modifier name
     * @param {String} [modVal] Modifier value
     * @returns {String}
     */
    _buildSelector : function(modName, modVal) {
        return '.' + this._buildClassName(modName, modVal);
    }
});

/**
 * @class Block
 * @description Base class for creating BEM blocks that have DOM representation
 * @augments i-bem:Block
 * @exports i-bem-dom:Block
 */
var Block = inherit([bem.Block, BemDomEntity], /** @lends Block.prototype */{
    /** @override */
    _block : function() {
        return this;
    }
});

/**
 * @class Elem
 * @description Base class for creating BEM elements that have DOM representation
 * @augments i-bem:Elem
 * @exports i-bem-dom:Elem
 */
var Elem = inherit([bem.Elem, BemDomEntity], /** @lends Elem.prototype */{
    /** @override */
    _block : function() {
        return this._blockInstance || (this._blockInstance = this.findParentBlock(getEntityCls(this.__self._blockName)));
    }
});

/**
 * Returns a block on a DOM element and initializes it if necessary
 * @param {Function} BemDomEntity entity
 * @param {Object} [params] entity parameters
 * @returns {BemDomEntity|null}
 */
$.fn.bem = function(BemDomEntity, params) {
    var entity = initEntity(BemDomEntity.getEntityName(), this, params, true);
    return entity? entity._setInitedMod() : null;
};

$(function() {

bemDom = /** @exports */{
    /**
     * Scope
     * @type jQuery
     */
    scope : $('body'),

    /**
     * Document shortcut
     * @type jQuery
     */
    doc : $(document),

    /**
     * Window shortcut
     * @type jQuery
     */
    win : $(window),

    /**
     * Base bemDom block
     * @type Function
     */
    Block : Block,

    /**
     * Base bemDom element
     * @type Function
     */
    Elem : Elem,

    /**
     * @param {*} entity
     * @returns {Boolean}
     */
    isEntity : function(entity) {
        return entity instanceof Block || entity instanceof Elem;
    },

    /**
     * Declares DOM-based block and creates block class
     * @param {String|Function} blockName Block name or block class
     * @param {Function|Array[Function]} [base] base block + mixes
     * @param {Object} [props] Methods
     * @param {Object} [staticProps] Static methods
     * @returns {Function} Block class
     */
    declBlock : function(blockName, base, props, staticProps) {
        if(!base || (typeof base === 'object' && !Array.isArray(base))) {
            staticProps = props;
            props = base;
            base = typeof blockName === 'string'?
                entities[blockName] || Block :
                blockName;
        }

        return bem.declBlock(blockName, base, props, staticProps);
    },

    /**
     * Declares elem and creates elem class
     * @param {String} blockName Block name
     * @param {String} elemName Elem name
     * @param {Function|Array[Function]} [base] base elem + mixes
     * @param {Object} [props] Methods
     * @param {Object} [staticProps] Static methods
     * @returns {Function} Elem class
     */
    declElem : function(blockName, elemName, base, props, staticProps) {
        if(!base || (typeof base === 'object' && !Array.isArray(base))) {
            staticProps = props;
            props = base;
            base = entities[blockName + ELEM_DELIM + elemName] || Elem;
        }

        return bem.declElem(blockName, elemName, base, props, staticProps);
    },

    declMixin : bem.declMixin,

    /**
     * Initializes blocks on a fragment of the DOM tree
     * @param {jQuery|String} [ctx=scope] Root DOM node
     * @returns {jQuery} ctx Initialization context
     */
    init : function(ctx) {
        ctx = typeof ctx === 'string'?
            $(ctx) :
            ctx || bemDom.scope;

        var dropElemCacheQueue = ctx === bemDom.scope? {} : undef,
            uniqInitId = identify();

        findDomElem(ctx, BEM_SELECTOR).each(function() {
            initEntities($(this), uniqInitId, dropElemCacheQueue);
        });

        bem._runInitFns();

        dropElemCacheQueue && dropElemCacheForCtx(ctx, dropElemCacheQueue);

        return ctx;
    },

    /**
     * @param {jQuery} ctx Root DOM node
     * @param {Boolean} [excludeSelf=false] Exclude the main domElem
     * @param {Boolean} [destructDom=false] Remove DOM node during destruction
     * @private
     */
    _destruct : function(ctx, excludeSelf, destructDom) {
        var _ctx,
            currentDestructingDomNodes = [];

        storeDomNodeParents(_ctx = excludeSelf? ctx.children() : ctx);

        reverse.call(findDomElem(_ctx, BEM_SELECTOR)).each(function(_, domNode) {
            var params = getParams(domNode),
                domNodeId = identify(domNode);

            destructingDomNodes[domNodeId] = true;
            currentDestructingDomNodes.push(domNodeId);

            objects.each(params, function(entityParams) {
                if(entityParams.uniqId) {
                    var entity = uniqIdToEntity[entityParams.uniqId];
                    entity?
                        removeDomNodeFromEntity(entity, domNode) :
                        delete uniqIdToDomElems[entityParams.uniqId];
                }
            });
            delete domElemToParams[identify(domNode)];
        });

        // NOTE: it was moved here as jquery events aren't triggered on detached DOM elements
        destructDom &&
            (excludeSelf? ctx.empty() : ctx.remove());

        // flush parent nodes storage that has been filled above
        domNodesToParents = {};

        currentDestructingDomNodes.forEach(function(domNodeId) {
            delete destructingDomNodes[domNodeId];
        });
    },

    /**
     * Destroys blocks on a fragment of the DOM tree
     * @param {jQuery} ctx Root DOM node
     * @param {Boolean} [excludeSelf=false] Exclude the main domElem
     */
    destruct : function(ctx, excludeSelf) {
        this._destruct(ctx, excludeSelf, true);
    },

    /**
     * Detaches blocks on a fragment of the DOM tree without DOM tree destruction
     * @param {jQuery} ctx Root DOM node
     * @param {Boolean} [excludeSelf=false] Exclude the main domElem
     */
    detach : function(ctx, excludeSelf) {
        this._destruct(ctx, excludeSelf);
    },

    /**
     * Replaces a fragment of the DOM tree inside the context, destroying old blocks and intializing new ones
     * @param {jQuery} ctx Root DOM node
     * @param {jQuery|String} content New content
     * @returns {jQuery} Updated root DOM node
     */
    update : function(ctx, content) {
        this.destruct(ctx, true);
        return this.init(ctx.html(content));
    },

    /**
     * Changes a fragment of the DOM tree including the context and initializes blocks.
     * @param {jQuery} ctx Root DOM node
     * @param {jQuery|String} content Content to be added
     * @returns {jQuery} New content
     */
    replace : function(ctx, content) {
        var prev = ctx.prev(),
            parent = ctx.parent();

        content = getJqueryCollection(content);

        this.destruct(ctx);

        return this.init(prev.length?
            content.insertAfter(prev) :
            content.prependTo(parent));
    },

    /**
     * Adds a fragment of the DOM tree at the end of the context and initializes blocks
     * @param {jQuery} ctx Root DOM node
     * @param {jQuery|String} content Content to be added
     * @returns {jQuery} New content
     */
    append : function(ctx, content) {
        return this.init(getJqueryCollection(content).appendTo(ctx));
    },

    /**
     * Adds a fragment of the DOM tree at the beginning of the context and initializes blocks
     * @param {jQuery} ctx Root DOM node
     * @param {jQuery|String} content Content to be added
     * @returns {jQuery} New content
     */
    prepend : function(ctx, content) {
        return this.init(getJqueryCollection(content).prependTo(ctx));
    },

    /**
     * Adds a fragment of the DOM tree before the context and initializes blocks
     * @param {jQuery} ctx Contextual DOM node
     * @param {jQuery|String} content Content to be added
     * @returns {jQuery} New content
     */
    before : function(ctx, content) {
        return this.init(getJqueryCollection(content).insertBefore(ctx));
    },

    /**
     * Adds a fragment of the DOM tree after the context and initializes blocks
     * @param {jQuery} ctx Contextual DOM node
     * @param {jQuery|String} content Content to be added
     * @returns {jQuery} New content
     */
    after : function(ctx, content) {
        return this.init(getJqueryCollection(content).insertAfter(ctx));
    }
};

provide(bemDom);

});

});

(function() {

var origDefine = modules.define,
    storedDeps = []; // NOTE: see https://github.com/bem/bem-core/issues/1446

modules.define = function(name, deps, decl) {
    origDefine.apply(modules, arguments);

    if(name !== 'i-bem-dom__init' && arguments.length > 2 && ~deps.indexOf('i-bem-dom')) {
        storedDeps.push(name);
        storedDeps.length === 1 && modules.define('i-bem-dom__init', storedDeps, function(provide) {
            provide(arguments[arguments.length - 1]);
            storedDeps = [];
        });
    }
};

})();

/* end: ../../common.blocks/i-bem-dom/i-bem-dom.js */
/* begin: ../../common.blocks/i-bem-dom/__init/i-bem-dom__init.js */
/**
 * @module i-bem-dom__init
 */

modules.define('i-bem-dom__init', ['i-bem-dom'], function(provide, bemDom) {

provide(
    /**
     * Initializes blocks on a fragment of the DOM tree
     * @exports
     * @param {jQuery} [ctx=scope] Root DOM node
     * @returns {jQuery} ctx Initialization context
     */
    function(ctx) {
        return bemDom.init(ctx);
    });
});

/* end: ../../common.blocks/i-bem-dom/__init/i-bem-dom__init.js */
/* begin: ../../common.blocks/i-bem/i-bem.vanilla.js */
/**
 * @module i-bem
 */

modules.define(
    'i-bem',
    [
        'i-bem__internal',
        'inherit',
        'identify',
        'next-tick',
        'objects',
        'functions'
    ],
    function(
        provide,
        bemInternal,
        inherit,
        identify,
        nextTick,
        objects,
        functions) {

var undef,

    ELEM_DELIM = bemInternal.ELEM_DELIM,

    /**
     * Storage for block init functions
     * @private
     * @type Array
     */
    initFns = [],

    /**
     * Storage for block declarations (hash by block name)
     * @private
     * @type Object
     */
    entities = {};

/**
 * Builds the name of the handler method for setting a modifier
 * @param {String} prefix
 * @param {String} modName Modifier name
 * @param {String} modVal Modifier value
 * @returns {String}
 */
function buildModFnName(prefix, modName, modVal) {
    return '__' + prefix +
       '__mod' +
       (modName? '_' + modName : '') +
       (modVal? '_' + modVal : '');
}

/**
 * Builds the function for the handler method for setting a modifier
 * for special syntax
 * @param {String} modVal Declared modifier value
 * @param {Function} curModFn Declared modifier handler
 * @param {Function} [prevModFn] Previous handler
 * @param {Function} [condition] Condition function
 * (called with declared, set and previous modifier values)
 * @returns {Function}
 */
function buildSpecialModFn(modVal, curModFn, prevModFn, condition) {
    return prevModFn || condition?
        function(_modName, _modVal, _prevModVal) {
            var res1, res2;
            prevModFn &&
                (res1 = prevModFn.apply(this, arguments) === false);
            (condition? condition(modVal, _modVal, _prevModVal) : true) &&
                (res2 = curModFn.apply(this, arguments) === false);
            if(res1 || res2) return false;
        } :
        curModFn;
}

var specialModConditions = {
    '!' : function(modVal, _modVal, _prevModVal) {
        return _modVal !== modVal;
    },
    '~' : function(modVal, _modVal, _prevModVal) {
        return _prevModVal === modVal;
    }
};

/**
 * Transforms a hash of modifier handlers to methods
 * @param {String} prefix
 * @param {Object} modFns
 * @param {Object} props
 */
function modFnsToProps(prefix, modFns, props) {
    if(functions.isFunction(modFns)) {
        props[buildModFnName(prefix, '*', '*')] = modFns;
    } else {
        var modName, modVal, modFn;
        for(modName in modFns) {
            modFn = modFns[modName];
            if(functions.isFunction(modFn)) {
                props[buildModFnName(prefix, modName, '*')] = modFn;
            } else {
                var starModFnName = buildModFnName(prefix, modName, '*');
                for(modVal in modFn) {
                    var curModFn = modFn[modVal],
                        modValPrefix = modVal[0];

                    if(modValPrefix === '!' || modValPrefix === '~' || modVal === '*') {
                        modVal === '*' || (modVal = modVal.substr(1));
                        props[starModFnName] = buildSpecialModFn(
                            modVal,
                            curModFn,
                            props[starModFnName],
                            specialModConditions[modValPrefix]);
                    } else {
                        props[buildModFnName(prefix, modName, modVal)] = curModFn;
                    }
                }
            }
        }
    }
}

function buildCheckMod(modName, modVal) {
    return modVal?
        Array.isArray(modVal)?
            function(block) {
                var i = 0, len = modVal.length;
                while(i < len)
                    if(checkMod(block, modName, modVal[i++]))
                        return true;
                return false;
            } :
            function(block) {
                return checkMod(block, modName, modVal);
            } :
        function(block) {
            return checkMod(block, modName, true);
        };
}

function checkMod(block, modName, modVal) {
    var prevModVal = block._processingMods[modName];

    // check if a block has either current or previous modifier value equal to passed modVal
    return modVal === '*'?
        /* jshint eqnull: true */
        block.hasMod(modName) || prevModVal != null :
        block.hasMod(modName, modVal) || prevModVal === modVal;
}

function convertModHandlersToMethods(props) {
    if(props.beforeSetMod) {
        modFnsToProps('before', props.beforeSetMod, props);
        delete props.beforeSetMod;
    }

    if(props.onSetMod) {
        modFnsToProps('after', props.onSetMod, props);
        delete props.onSetMod;
    }
}

function declEntity(baseCls, entityName, base, props, staticProps) {
    base || (base = entities[entityName] || baseCls);

    Array.isArray(base) || (base = [base]);

    if(!base[0].__bemEntity) {
        base = base.slice();
        base.unshift(entities[entityName] || baseCls);
    }

    props && convertModHandlersToMethods(props);

    var entityCls;

    entityName === base[0].getEntityName()?
        // makes a new "init" if the old one was already executed
        (entityCls = inherit.self(base, props, staticProps))._processInit(true) :
        (entityCls = entities[entityName] = inherit(base, props, staticProps));

    return entityCls;
}

// jscs:disable requireMultipleVarDecl

/**
 * @class BemEntity
 * @description Base block for creating BEM blocks
 */
var BemEntity = inherit(/** @lends BemEntity.prototype */ {
    /**
     * @constructor
     * @private
     * @param {Object} mods BemEntity modifiers
     * @param {Object} params BemEntity parameters
     * @param {Boolean} [initImmediately=true]
     */
    __constructor : function(mods, params, initImmediately) {
        /**
         * Cache of modifiers
         * @member {Object}
         * @private
         */
        this._modCache = mods || {};

        /**
         * Current modifiers in the stack
         * @member {Object}
         * @private
         */
        this._processingMods = {};

        /**
         * BemEntity parameters, taking into account the defaults
         * @member {Object}
         * @readonly
         */
        this.params = objects.extend(this._getDefaultParams(), params);

        /**
         * @member {String} Unique entity ID
         * @private
         */
        this._uniqId = this.params.uniqId || identify(this);

        initImmediately !== false?
            this._setInitedMod() :
            initFns.push(this._setInitedMod, this);
    },

    /**
     * Initializes a BEM entity
     * @private
     */
    _setInitedMod : function() {
        return this.setMod('js', 'inited');
    },

    /**
     * Deletes a BEM entity
     * @private
     */
    _delInitedMod : function() {
        this.delMod('js');
    },

    /**
     * Checks whether a BEM entity has a modifier
     * @param {String} modName Modifier name
     * @param {String|Boolean} [modVal] Modifier value. If not of type String or Boolean, it is casted to String
     * @returns {Boolean}
     */
    hasMod : function(modName, modVal) {
        var typeModVal = typeof modVal;
        typeModVal === 'undefined' || typeModVal === 'boolean' || (modVal = modVal.toString());

        var res = this.getMod(modName) === (modVal || '');
        return arguments.length === 1? !res : res;
    },

    /**
     * Returns the value of the modifier of the BEM entity
     * @param {String} modName Modifier name
     * @returns {String} Modifier value
     */
    getMod : function(modName) {
        var modCache = this._modCache;
        return modName in modCache?
            modCache[modName] || '' :
            modCache[modName] = this._extractModVal(modName);
    },

    /**
     * Sets the modifier for a BEM entity
     * @param {String} modName Modifier name
     * @param {String|Boolean} [modVal=true] Modifier value. If not of type String or Boolean, it is casted to String
     * @returns {BemEntity} this
     */
    setMod : function(modName, modVal) {
        var typeModVal = typeof modVal;
        if(typeModVal === 'undefined') {
            modVal = true;
        } else if(typeModVal === 'boolean') {
            modVal === false && (modVal = '');
        } else {
            modVal = modVal.toString();
        }

        /* jshint eqnull: true */
        if(this._processingMods[modName] != null) return this;

        var curModVal = this.getMod(modName);
        if(curModVal === modVal) return this;

        this._processingMods[modName] = curModVal;

        var needSetMod = true,
            modFnParams = [modName, modVal, curModVal],
            modVars = [['*', '*'], [modName, '*'], [modName, modVal]],
            prefixes = ['before', 'after'],
            i = 0, prefix, j, modVar;

        while(prefix = prefixes[i++]) {
            j = 0;
            while(modVar = modVars[j++]) {
                if(this._callModFn(prefix, modVar[0], modVar[1], modFnParams) === false) {
                    needSetMod = false;
                    break;
                }
            }

            if(!needSetMod) break;

            if(prefix === 'before') {
                this._modCache[modName] = modVal;
                this._onSetMod(modName, modVal, curModVal);
            }
        }

        this._processingMods[modName] = null;
        needSetMod && this._afterSetMod(modName, modVal, curModVal);

        return this;
    },

    /**
     * @protected
     * @param {String} modName Modifier name
     * @param {String} modVal Modifier value
     * @param {String} oldModVal Old modifier value
     */
    _onSetMod : function(modName, modVal, oldModVal) {},

    /**
     * @protected
     * @param {String} modName Modifier name
     * @param {String} modVal Modifier value
     * @param {String} oldModVal Old modifier value
     */
    _afterSetMod : function(modName, modVal, oldModVal) {},

    /**
     * Sets a modifier for a BEM entity, depending on conditions.
     * If the condition parameter is passed: when true, modVal1 is set; when false, modVal2 is set.
     * If the condition parameter is not passed: modVal1 is set if modVal2 was set, or vice versa.
     * @param {String} modName Modifier name
     * @param {String} [modVal1=true] First modifier value, optional for boolean modifiers
     * @param {String} [modVal2] Second modifier value
     * @param {Boolean} [condition] Condition
     * @returns {BemEntity} this
     */
    toggleMod : function(modName, modVal1, modVal2, condition) {
        typeof modVal1 === 'undefined' && (modVal1 = true); // boolean mod

        if(typeof modVal2 === 'undefined') {
            modVal2 = '';
        } else if(typeof modVal2 === 'boolean') {
            condition = modVal2;
            modVal2 = '';
        }

        var modVal = this.getMod(modName);
        (modVal === modVal1 || modVal === modVal2) &&
            this.setMod(
                modName,
                typeof condition === 'boolean'?
                    (condition? modVal1 : modVal2) :
                    this.hasMod(modName, modVal1)? modVal2 : modVal1);

        return this;
    },

    /**
     * Removes a modifier from a BEM entity
     * @param {String} modName Modifier name
     * @returns {BemEntity} this
     */
    delMod : function(modName) {
        return this.setMod(modName, '');
    },

    /**
     * Executes handlers for setting modifiers
     * @private
     * @param {String} prefix
     * @param {String} modName Modifier name
     * @param {String} modVal Modifier value
     * @param {Array} modFnParams Handler parameters
     */
    _callModFn : function(prefix, modName, modVal, modFnParams) {
        var modFnName = buildModFnName(prefix, modName, modVal);
        return this[modFnName]?
           this[modFnName].apply(this, modFnParams) :
           undef;
    },

    _extractModVal : function(modName) {
        return '';
    },

    /**
     * Returns a BEM entity's default parameters
     * @protected
     * @returns {Object}
     */
    _getDefaultParams : function() {
        return {};
    },

    /**
     * Executes given callback on next turn eventloop in BEM entity's context
     * @protected
     * @param {Function} fn callback
     * @returns {BemEntity} this
     */
    _nextTick : function(fn) {
        var _this = this;
        nextTick(function() {
            _this.hasMod('js', 'inited') && fn.call(_this);
        });
        return this;
    }
}, /** @lends BemEntity */{
    /**
     * Factory method for creating an instance
     * @param {Object} mods modifiers
     * @param {Object} params params
     * @returns {BemEntity}
     */
    create : function(mods, params) {
        return new this(mods, params);
    },

    /**
     * Declares modifier
     * @param {Object} mod
     * @param {String} mod.modName
     * @param {String|Boolean|Array} [mod.modVal]
     * @param {Object} props
     * @param {Object} [staticProps]
     * @returns {Function}
     */
    declMod : function(mod, props, staticProps) {
        props && convertModHandlersToMethods(props);

        var checkMod = buildCheckMod(mod.modName, mod.modVal),
            basePtp = this.prototype;

        objects.each(props, function(prop, name) {
            functions.isFunction(prop) &&
                (props[name] = function() {
                    var method;
                    if(checkMod(this)) {
                        method = prop;
                    } else {
                        var baseMethod = basePtp[name];
                        baseMethod && baseMethod !== prop &&
                            (method = this.__base);
                    }
                    return method?
                        method.apply(this, arguments) :
                        undef;
                });
        });

        return inherit.self(this, props, staticProps);
    },

    __bemEntity : true,

    _name : null,

    /**
     * Processes a BEM entity's init
     * @private
     * @param {Boolean} [heedInit=false] Whether to take into account that the BEM entity already processed its init property
     */
    _processInit : function(heedInit) {
        this._inited = true;
    },

    /**
     * Returns the name of the current BEM entity
     * @returns {String}
     */
    getName : function() {
        return this._name;
    },

    /**
     * Returns the name of the current BEM entity
     * @returns {String}
     */
    getEntityName : function() {
        return this._name;
    }
});

/**
 * @class Block
 * @description Class for creating BEM blocks
 * @augments BemEntity
 */
var Block = BemEntity;

/**
 * @class Elem
 * @description Class for creating BEM elems
 * @augments BemEntity
 */
var Elem = inherit(BemEntity, /** @lends Elem.prototype */ {
    /**
     * Returns the own block of current element
     * @protected
     * @returns {Block}
     */
    _block : function() {
        return this._blockInstance;
    }
}, /** @lends Elem */{
    /**
     * Factory method for creating an instance
     * @param {Object} block block instance
     * @param {Object} mods modifiers
     * @param {Object} params params
     * @returns {BemEntity}
     */
    create : function(block, mods, params) {
        var res = new this(mods, params);
        res._blockInstance = block;
        return res;
    },

    /**
     * Returns the name of the current BEM entity
     * @returns {String}
     */
    getEntityName : function() {
        return this._blockName + ELEM_DELIM + this._name;
    }
});

provide(/** @exports */{
    /**
     * Block class
     * @type Function
     */
    Block : Block,

    /**
     * Elem class
     * @type Function
     */
    Elem : Elem,

    /**
     * Storage for block declarations (hash by block name)
     * @type Object
     */
    entities : entities,

    /**
     * Declares block and creates a block class
     * @param {String|Function} blockName Block name or block class
     * @param {Function|Array[Function]} [base] base block + mixes
     * @param {Object} [props] Methods
     * @param {Object} [staticProps] Static methods
     * @returns {Function} Block class
     */
    declBlock : function(blockName, base, props, staticProps) {
        if(typeof base === 'object' && !Array.isArray(base)) {
            staticProps = props;
            props = base;
            base = undef;
        }

        var baseCls = Block;
        if(typeof blockName !== 'string') {
            baseCls = blockName;
            blockName = blockName.getEntityName();
        }

        var res = declEntity(baseCls, blockName, base, props, staticProps);
        res._name = res._blockName = blockName;
        return res;
    },

    /**
     * Declares elem and creates an elem class
     * @param {String} [blockName] Block name
     * @param {String|Function} elemName Elem name or elem class
     * @param {Function|Function[]} [base] base elem + mixes
     * @param {Object} [props] Methods
     * @param {Object} [staticProps] Static methods
     * @returns {Function} Elem class
     */
    declElem : function(blockName, elemName, base, props, staticProps) {
        var baseCls = Elem,
            entityName;

        if(typeof blockName !== 'string') {
            staticProps = props;
            props = base;
            base = elemName;
            elemName = blockName._name;
            baseCls = blockName;
            blockName = baseCls._blockName;
            entityName = baseCls.getEntityName();
        } else {
            entityName = blockName + ELEM_DELIM + elemName;
        }

        if(typeof base === 'object' && !Array.isArray(base)) {
            staticProps = props;
            props = base;
            base = undef;
        }

        var res = declEntity(baseCls, entityName, base, props, staticProps);
        res._blockName = blockName;
        res._name = elemName;
        return res;
    },

    /**
     * Declares mixin
     * @param {Object} [props] Methods
     * @param {Object} [staticProps] Static methods
     * @returns {Function} mix
     */
    declMixin : function(props, staticProps) {
        convertModHandlersToMethods(props || (props = {}));
        return inherit(props, staticProps);
    },

    /**
     * Executes the block init functions
     * @private
     */
    _runInitFns : function() {
        if(initFns.length) {
            var fns = initFns,
                fn, i = 0;

            initFns = [];
            while(fn = fns[i]) {
                fn.call(fns[i + 1]);
                i += 2;
            }
        }
    }
});

});

/* end: ../../common.blocks/i-bem/i-bem.vanilla.js */
/* begin: ../../common.blocks/i-bem/__internal/i-bem__internal.vanilla.js */
/**
 * @module i-bem__internal
 */

modules.define('i-bem__internal', function(provide) {

var undef,
    /**
     * Separator for modifiers and their values
     * @const
     * @type String
     */
    MOD_DELIM = '_',

    /**
     * Separator between names of a block and a nested element
     * @const
     * @type String
     */
    ELEM_DELIM = '__',

    /**
     * Pattern for acceptable element and modifier names
     * @const
     * @type String
     */
    NAME_PATTERN = '[a-zA-Z0-9-]+';

function isSimple(obj) {
    var typeOf = typeof obj;
    return typeOf === 'string' || typeOf === 'number' || typeOf === 'boolean';
}

function buildModPostfix(modName, modVal) {
    var res = '';
    /* jshint eqnull: true */
    if(modVal != null && modVal !== false) {
        res += MOD_DELIM + modName;
        modVal !== true && (res += MOD_DELIM + modVal);
    }
    return res;
}

function buildBlockClassName(name, modName, modVal) {
    return name + buildModPostfix(modName, modVal);
}

function buildElemClassName(block, name, modName, modVal) {
    return buildBlockClassName(block, undef, undef) +
        ELEM_DELIM + name +
        buildModPostfix(modName, modVal);
}

provide(/** @exports */{
    NAME_PATTERN : NAME_PATTERN,

    MOD_DELIM : MOD_DELIM,
    ELEM_DELIM : ELEM_DELIM,

    buildModPostfix : buildModPostfix,

    /**
     * Builds the class name of a block or element with a modifier
     * @param {String} block Block name
     * @param {String} [elem] Element name
     * @param {String} [modName] Modifier name
     * @param {String|Number} [modVal] Modifier value
     * @returns {String} Class name
     */
    buildClassName : function(block, elem, modName, modVal) {
        if(isSimple(modName)) {
            if(!isSimple(modVal)) {
                modVal = modName;
                modName = elem;
                elem = undef;
            }
        } else if(typeof modName !== 'undefined') {
            modName = undef;
        } else if(elem && typeof elem !== 'string') {
            elem = undef;
        }

        if(!(elem || modName)) { // optimization for simple case
            return block;
        }

        return elem?
            buildElemClassName(block, elem, modName, modVal) :
            buildBlockClassName(block, modName, modVal);
    },

    /**
     * Builds full class names for a buffer or element with modifiers
     * @param {String} block Block name
     * @param {String} [elem] Element name
     * @param {Object} [mods] Modifiers
     * @returns {String} Class
     */
    buildClassNames : function(block, elem, mods) {
        if(elem && typeof elem !== 'string') {
            mods = elem;
            elem = undef;
        }

        var res = elem?
            buildElemClassName(block, elem, undef, undef) :
            buildBlockClassName(block, undef, undef);

        if(mods) {
            for(var modName in mods) {
                if(mods.hasOwnProperty(modName) && mods[modName]) {
                    res += ' ' + (elem?
                        buildElemClassName(block, elem, modName, mods[modName]) :
                        buildBlockClassName(block, modName, mods[modName]));
                }
            }
        }

        return res;
    }
});

});

/* end: ../../common.blocks/i-bem/__internal/i-bem__internal.vanilla.js */
/* begin: ../../common.blocks/next-tick/next-tick.vanilla.js */
/**
 * @module next-tick
 */

modules.define('next-tick', function(provide) {

/**
 * Executes given function on next tick.
 * @exports
 * @type Function
 * @param {Function} fn
 */

var global = this.global,
    fns = [],
    enqueueFn = function(fn) {
        fns.push(fn);
        return fns.length === 1;
    },
    callFns = function() {
        var fnsToCall = fns, i = 0, len = fns.length;
        fns = [];
        while(i < len) {
            fnsToCall[i++]();
        }
    };

    /* global process */
    if(typeof process === 'object' && process.nextTick) { // nodejs
        return provide(function(fn) {
            enqueueFn(fn) && process.nextTick(callFns);
        });
    }

    if(global.setImmediate) { // ie10
        return provide(function(fn) {
            enqueueFn(fn) && global.setImmediate(callFns);
        });
    }

    if(global.postMessage) { // modern browsers
        var isPostMessageAsync = true;
        if(global.attachEvent) {
            var checkAsync = function() {
                    isPostMessageAsync = false;
                };
            global.attachEvent('onmessage', checkAsync);
            global.postMessage('__checkAsync', '*');
            global.detachEvent('onmessage', checkAsync);
        }

        if(isPostMessageAsync) {
            var msg = '__nextTick' + (+new Date),
                onMessage = function(e) {
                    if(e.data === msg) {
                        e.stopPropagation && e.stopPropagation();
                        callFns();
                    }
                };

            global.addEventListener?
                global.addEventListener('message', onMessage, true) :
                global.attachEvent('onmessage', onMessage);

            return provide(function(fn) {
                enqueueFn(fn) && global.postMessage(msg, '*');
            });
        }
    }

    var doc = global.document;
    if('onreadystatechange' in doc.createElement('script')) { // ie6-ie8
        var head = doc.getElementsByTagName('head')[0],
            createScript = function() {
                var script = doc.createElement('script');
                script.onreadystatechange = function() {
                    script.parentNode.removeChild(script);
                    script = script.onreadystatechange = null;
                    callFns();
                };
                head.appendChild(script);
            };

        return provide(function(fn) {
            enqueueFn(fn) && createScript();
        });
    }

    provide(function(fn) { // old browsers
        enqueueFn(fn) && global.setTimeout(callFns, 0);
    });
});

/* end: ../../common.blocks/next-tick/next-tick.vanilla.js */
/* begin: ../../common.blocks/i-bem-dom/__events/i-bem-dom__events.js */
/**
 * @module i-bem-dom__events
 */
modules.define(
    'i-bem-dom__events',
    [
        'i-bem__internal',
        'i-bem-dom__collection',
        'inherit',
        'identify',
        'objects',
        'jquery',
        'functions'
    ],
    function(
        provide,
        bemInternal,
        BemDomCollection,
        inherit,
        identify,
        objects,
        $,
        functions) {

var undef,
    winNode = window,
    docNode = document,
    winId = identify(winNode),
    docId = identify(docNode),
    eventStorage = {},

    /**
     * @class EventManager
     */
    EventManager = inherit(/** @lends EventManager.prototype */{
        /**
         * @constructor
         * @param {Object} params EventManager parameters
         * @param {Function} fnWrapper Wrapper function to build event handler
         * @param {Function} eventBuilder Function to build event
         */
        __constructor : function(params, fnWrapper, eventBuilder) {
            this._params = params;
            this._fnWrapper = fnWrapper;
            this._eventBuilder = eventBuilder;
            this._storage = {};
        },

        /**
         * Adds an event handler
         * @param {String|Object|events:Event} e Event type
         * @param {*} [data] Additional data that the handler gets as e.data
         * @param {Function} fn Handler
         * @returns {EventManager} this
         */
        on : function(e, data, fn, _fnCtx, _isOnce) {
            var params = this._params,
                event = this._eventBuilder(e, params);

            if(functions.isFunction(data)) {
                _isOnce = _fnCtx;
                _fnCtx = fn;
                fn = data;
                data = undef;
            }

            var fnStorage = this._storage[event] || (this._storage[event] = {}),
                fnId = identify(fn, _fnCtx);

            if(!fnStorage[fnId]) {
                var bindDomElem = params.bindDomElem,
                    bindSelector = params.bindSelector,
                    _this = this,
                    handler = fnStorage[fnId] = this._fnWrapper(
                        _isOnce?
                            function() {
                                _this.un(e, fn, _fnCtx);
                                fn.apply(this, arguments);
                            } :
                            fn,
                        _fnCtx,
                        fnId);

                bindDomElem.on(event, bindSelector, data, handler);
                bindSelector && bindDomElem.is(bindSelector) && bindDomElem.on(event, data, handler);
                // FIXME: "once" won't properly work in case of nested and mixed elem with the same name
            }

            return this;
        },

        /**
         * Adds an event handler
         * @param {String} e Event type
         * @param {*} [data] Additional data that the handler gets as e.data
         * @param {Function} fn Handler
         * @returns {EventManager} this
         */
        once : function(e, data, fn, _fnCtx) {
            if(functions.isFunction(data)) {
                _fnCtx = fn;
                fn = data;
                data = undef;
            }

            return this.on(e, data, fn, _fnCtx, true);
        },

        /**
         * Removes event handler or handlers
         * @param {String|Object|events:Event} [e] Event type
         * @param {Function} [fn] Handler
         * @returns {EventManager} this
         */
        un : function(e, fn, _fnCtx) {
            var argsLen = arguments.length;
            if(argsLen) {
                var params = this._params,
                    event = this._eventBuilder(e, params);

                if(argsLen === 1) {
                    this._unbindByEvent(this._storage[event], event);
                } else {
                    var wrappedFn,
                        fnId = identify(fn, _fnCtx),
                        fnStorage = this._storage[event],
                        bindDomElem = params.bindDomElem,
                        bindSelector = params.bindSelector;

                    if(wrappedFn = fnStorage && fnStorage[fnId])
                        delete fnStorage[fnId];

                    var handler = wrappedFn || fn;

                    bindDomElem.off(event, params.bindSelector, handler);
                    bindSelector && bindDomElem.is(bindSelector) && bindDomElem.off(event, handler);
                }
            } else {
                objects.each(this._storage, this._unbindByEvent, this);
            }

            return this;
        },

        _unbindByEvent : function(fnStorage, e) {
            var params = this._params,
                bindDomElem = params.bindDomElem,
                bindSelector = params.bindSelector,
                unbindWithoutSelector = bindSelector && bindDomElem.is(bindSelector);

            fnStorage && objects.each(fnStorage, function(fn) {
                bindDomElem.off(e, bindSelector, fn);
                unbindWithoutSelector && bindDomElem.off(e, fn);
            });
            this._storage[e] = null;
        }
    }),
    buildForEachEventManagerProxyFn = function(methodName) {
        return function() {
            var args = arguments;

            this._eventManagers.forEach(function(eventManager) {
                eventManager[methodName].apply(eventManager, args);
            });

            return this;
        };
    },
    /**
     * @class CollectionEventManager
     */
    CollectionEventManager = inherit(/** @lends CollectionEventManager.prototype */{
        /**
         * @constructor
         * @param {Array} eventManagers Array of event managers
         */
        __constructor : function(eventManagers) {
            this._eventManagers = eventManagers;
        },

        /**
         * Adds an event handler
         * @param {String|Object|events:Event} e Event type
         * @param {Object} [data] Additional data that the handler gets as e.data
         * @param {Function} fn Handler
         * @returns {CollectionEventManager} this
         */
        on : buildForEachEventManagerProxyFn('on'),

        /**
         * Adds an event handler
         * @param {String} e Event type
         * @param {Object} [data] Additional data that the handler gets as e.data
         * @param {Function} fn Handler
         * @returns {CollectionEventManager} this
         */
        once : buildForEachEventManagerProxyFn('once'),

        /**
         * Removes event handler or handlers
         * @param {String|Object|events:Event} [e] Event type
         * @param {Function} [fn] Handler
         * @returns {CollectionEventManager} this
         */
        un : buildForEachEventManagerProxyFn('un')
    }),
    /**
     * @class EventManagerFactory
     * @exports i-bem-dom__events:EventManagerFactory
     */
    EventManagerFactory = inherit(/** @lends EventManagerFactory.prototype */{
        __constructor : function(getEntityCls) {
            this._storageSuffix = identify();
            this._getEntityCls = getEntityCls;
            this._eventManagerCls = EventManager;
        },

        /**
         * Instantiates event manager
         * @param {Function|i-bem-dom:BemDomEntity} ctx BemDomEntity class or instance
         * @param {*} bindCtx context to bind
         * @param {jQuery} bindScope bind scope
         * @returns {EventManager}
         */
        getEventManager : function(ctx, bindCtx, bindScope) {
            if(bindCtx instanceof BemDomCollection) {
                return new CollectionEventManager(bindCtx.map(function(entity) {
                    return this.getEventManager(ctx, entity, bindScope);
                }, this));
            }

            var ctxId = identify(ctx),
                ctxStorage = eventStorage[ctxId],
                storageSuffix = this._storageSuffix,
                isBindToInstance = typeof ctx !== 'function',
                ctxCls,
                selector = '';

            if(isBindToInstance) {
                ctxCls = ctx.__self;
            } else {
                ctxCls = ctx;
                selector = ctx._buildSelector();
            }

            var params = this._buildEventManagerParams(bindCtx, bindScope, selector, ctxCls),
                storageKey = params.key + storageSuffix;

            if(!ctxStorage) {
                ctxStorage = eventStorage[ctxId] = {};
                if(isBindToInstance) {
                    ctx._events().on({ modName : 'js', modVal : '' }, function() {
                        params.bindToArbitraryDomElem && ctxStorage[storageKey] &&
                            ctxStorage[storageKey].un();
                        delete ctxStorage[ctxId];
                    });
                }
            }

            return ctxStorage[storageKey] ||
                (ctxStorage[storageKey] = this._createEventManager(ctx, params, isBindToInstance));
        },

        _buildEventManagerParams : function(bindCtx, bindScope, ctxSelector, ctxCls) {
            var res = {
                bindEntityCls : null,
                bindDomElem : bindScope,
                bindToArbitraryDomElem : false,
                bindSelector : ctxSelector,
                ctxSelector : ctxSelector,
                key : ''
            };

            if(bindCtx) {
                var typeOfCtx = typeof bindCtx;

                if(bindCtx.jquery) {
                    res.bindDomElem = bindCtx;
                    res.key = identify.apply(null, bindCtx.get());
                    res.bindToArbitraryDomElem = true;
                } else if(bindCtx === winNode || bindCtx === docNode || (typeOfCtx === 'object' && bindCtx.nodeType === 1)) { // NOTE: duck-typing check for "is-DOM-element"
                    res.bindDomElem = $(bindCtx);
                    res.key = identify(bindCtx);
                    res.bindToArbitraryDomElem = true;
                } else if(typeOfCtx === 'object' && bindCtx.__self) { // bem entity instance
                    res.bindDomElem = bindCtx.domElem;
                    res.key = bindCtx._uniqId;
                    res.bindEntityCls = bindCtx.__self;
                } else if(typeOfCtx === 'string' || typeOfCtx === 'object' || typeOfCtx === 'function') {
                    var blockName, elemName, modName, modVal;
                    if(typeOfCtx === 'string') { // elem name
                        blockName = ctxCls._blockName;
                        elemName = bindCtx;
                    } else if(typeOfCtx === 'object') { // bem entity with optional mod val
                        blockName = bindCtx.block?
                            bindCtx.block.getName() :
                            ctxCls._blockName;
                        elemName = typeof bindCtx.elem === 'function'?
                            bindCtx.elem.getName() :
                            bindCtx.elem;
                        modName = bindCtx.modName;
                        modVal = bindCtx.modVal;
                    } else if(bindCtx.getName() === bindCtx.getEntityName()) { // block class
                        blockName = bindCtx.getName();
                    } else { // elem class
                        blockName = ctxCls._blockName;
                        elemName = bindCtx.getName();
                    }

                    var entityName = bemInternal.buildClassName(blockName, elemName);
                    res.bindEntityCls = this._getEntityCls(entityName);
                    res.bindSelector = '.' + (res.key = entityName + bemInternal.buildModPostfix(modName, modVal));
                }
            } else {
                res.bindEntityCls = ctxCls;
            }

            return res;
        },

        _createEventManager : function(ctx, params, isInstance) {
            throw new Error('not implemented');
        }
    });

provide({
    EventManagerFactory : EventManagerFactory
});

});

/* end: ../../common.blocks/i-bem-dom/__events/i-bem-dom__events.js */
/* begin: ../../common.blocks/i-bem-dom/__collection/i-bem-dom__collection.js */
/**
 * @module i-bem-dom__collection
 */
modules.define('i-bem-dom__collection', ['inherit', 'i-bem__collection'], function(provide, inherit, BemCollection) {

/**
 * @class BemDomCollection
 */
var BemDomCollection = inherit(BemCollection, /** @lends BemDomCollection.prototype */{
    /**
     * Finds the first child block for every entities in collection
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {BemDomCollection}
     */
    findChildBlock : buildProxyMethodForOne('findChildBlock'),

    /**
     * Finds child block for every entities in collections
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {BemDomCollection}
     */
    findChildBlocks : buildProxyMethodForMany('findChildBlocks'),

    /**
     * Finds the first parent block for every entities in collection
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {BemDomCollection}
     */
    findParentBlock : buildProxyMethodForOne('findParentBlock'),

    /**
     * Finds parent block for every entities in collections
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {BemDomCollection}
     */
    findParentBlocks : buildProxyMethodForMany('findParentBlocks'),

    /**
     * Finds first mixed bloc for every entities in collectionk
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {BemDomCollection}
     */
    findMixedBlock : buildProxyMethodForOne('findMixedBlock'),

    /**
     * Finds mixed block for every entities in collections
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {BemDomCollection}
     */
    findMixedBlocks : buildProxyMethodForMany('findMixedBlocks'),

    /**
     * Finds the first child elemen for every entities in collectiont
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @param {Boolean} [strictMode=false]
     * @returns {BemDomCollection}
     */
    findChildElem : buildProxyMethodForOne('findChildElem'),

    /**
     * Finds child element for every entities in collections
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @param {Boolean} [strictMode=false]
     * @returns {BemDomCollection}
     */
    findChildElems : buildProxyMethodForMany('findChildElems'),

    /**
     * Finds the first parent elemen for every entities in collectiont
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @param {Boolean} [strictMode=false]
     * @returns {BemDomCollection}
     */
    findParentElem : buildProxyMethodForOne('findParentElem'),

    /**
     * Finds parent element for every entities in collections
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @param {Boolean} [strictMode=false]
     * @returns {BemDomCollection}
     */
    findParentElems : buildProxyMethodForMany('findParentElems'),

    /**
     * Finds the first mixed elemen for every entities in collectiont
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @returns {BemDomCollection}
     */
    findMixedElem : buildProxyMethodForOne('findMixedElem'),

    /**
     * Finds mixed element for every entities in collections
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @returns {BemDomCollection}
     */
    findMixedElems : buildProxyMethodForMany('findMixedElems')
});

function collectionMapMethod(collection, methodName, args) {
    return collection.map(function(entity) {
        return entity[methodName].apply(entity, args);
    });
}

function buildProxyMethodForOne(methodName) {
    return function() {
        return new BemDomCollection(collectionMapMethod(this, methodName, arguments));
    };
}

function buildProxyMethodForMany(methodName) {
    return function() {
        var res = [];

        collectionMapMethod(this, methodName, arguments).forEach(function(collection) {
            collection.forEach(function(entity) {
                res.push(entity);
            });
        });

        return new BemDomCollection(res);
    };
}

provide(BemDomCollection);

});

/* end: ../../common.blocks/i-bem-dom/__collection/i-bem-dom__collection.js */
/* begin: ../../common.blocks/i-bem/__collection/i-bem__collection.js */
/**
 * @module i-bem__collection
 */
modules.define('i-bem__collection', ['inherit'], function(provide, inherit) {

/**
 * @class BemCollection
 */
var BemCollection = inherit(/** @lends BemCollection.prototype */{
    /**
     * @constructor
     * @param {Array} entities BEM entities
     */
    __constructor : function(entities) {
        var _entities = this._entities = [],
            uniq = {};
        (Array.isArray(entities)? entities : arraySlice.call(arguments)).forEach(function(entity) {
            if(!uniq[entity._uniqId]) {
                uniq[entity._uniqId] = true;
                _entities.push(entity);
            }
        });
    },

    /**
     * Sets the modifier for entities in Collection.
     * @param {String} modName Modifier name
     * @param {String|Boolean} [modVal=true] Modifier value. If not of type String or Boolean, it is casted to String
     * @returns {Collection} this
     */
    setMod : buildForEachEntityMethodProxyFn('setMod'),

    /**
     * Removes the modifier from entities in Collection.
     * @param {String} modName Modifier name
     * @returns {Collection} this
     */
    delMod : buildForEachEntityMethodProxyFn('delMod'),

    /**
     * Sets a modifier for entities in Collection, depending on conditions.
     * If the condition parameter is passed: when true, modVal1 is set; when false, modVal2 is set.
     * If the condition parameter is not passed: modVal1 is set if modVal2 was set, or vice versa.
     * @param {String} modName Modifier name
     * @param {String} modVal1 First modifier value
     * @param {String} [modVal2] Second modifier value
     * @param {Boolean} [condition] Condition
     * @returns {Collection} this
     */
    toggleMod : buildForEachEntityMethodProxyFn('toggleMod'),

    /**
     * Checks whether every entity in Collection has a modifier.
     * @param {String} modName Modifier name
     * @param {String|Boolean} [modVal] Modifier value. If not of type String or Boolean, it is casted to String
     * @returns {Boolean}
     */
    everyHasMod : buildComplexProxyFn('every', 'hasMod'),

    /**
     * Checks whether some entities in Collection has a modifier.
     * @param {String} modName Modifier name
     * @param {String|Boolean} [modVal] Modifier value. If not of type String or Boolean, it is casted to String
     * @returns {Boolean}
     */
    someHasMod : buildComplexProxyFn('some', 'hasMod'),

    /**
     * Returns entity by index.
     * @param {Number} i Index
     * @returns {BemEntity}
     */
    get : function(i) {
        return this._entities[i];
    },

    /**
     * Calls callback once for each entity in collection.
     * @param {Function} fn Callback
     * @param {Object} ctx Callback context
     */
    forEach : buildEntitiesMethodProxyFn('forEach'),

    /**
     * Creates an array with the results of calling callback on every entity in collection.
     * @param {Function} fn Callback
     * @param {Object} ctx Callback context
     * @returns {Array}
     */
    map : buildEntitiesMethodProxyFn('map'),

    /**
     * Applies callback against an accumulator and each entity in collection (from left-to-right)
     * to reduce it to a single value.
     * @param {Function} fn Callback
     * @param {Object} [initial] Initial value
     * @returns {Array}
     */
    reduce : buildEntitiesMethodProxyFn('reduce'),

    /**
     * Applies callback against an accumulator and each entity in collection (from right-to-left)
     * to reduce it to a single value.
     * @param {Function} fn Callback
     * @param {Object} [initial] Initial value
     * @returns {Array}
     */
    reduceRight : buildEntitiesMethodProxyFn('reduceRight'),

    /**
     * Creates a new collection with all entities that pass the test implemented by the provided callback.
     * @param {Function} fn Callback
     * @param {Object} ctx Callback context
     * @returns {Collection}
     */
    filter : function() {
        return new this.__self(buildEntitiesMethodProxyFn('filter').apply(this, arguments));
    },

    /**
     * Tests whether some entities in the collection passes the test implemented by the provided callback.
     * @param {Function} fn Callback
     * @param {Object} ctx Callback context
     * @returns {Boolean}
     */
    some : buildEntitiesMethodProxyFn('some'),

    /**
     * Tests whether every entities in the collection passes the test implemented by the provided callback.
     * @param {Function} fn Callback
     * @param {Object} ctx Callback context
     * @returns {Boolean}
     */
    every : buildEntitiesMethodProxyFn('every'),

    /**
     * Returns a boolean asserting whether an entity is present in the collection.
     * @param {BemEntity} entity BEM entity
     * @returns {Boolean}
     */
    has : function(entity) {
        return this._entities.indexOf(entity) > -1;
    },

    /**
     * Returns an entity, if it satisfies the provided testing callback.
     * @param {Function} fn Callback
     * @param {Object} ctx Callback context
     * @returns {BemEntity}
     */
    find : function(fn, ctx) {
        ctx || (ctx = this);
        var entities = this._entities,
            i = 0,
            entity;

        while(entity = entities[i])
            if(fn.call(ctx, entities[i], i++, this))
                return entity;

        return null;
    },

    /**
     * Returns a new collection comprised of collection on which it is called joined with
     * the collection(s) and/or array(s) and/or entity(es) provided as arguments.
     * @param {?...(Collection|Array|BemEntity)} args
     * @returns {Collection}
     */
    concat : function() {
        var i = 0,
            l = arguments.length,
            arg,
            argsForConcat = [];

        while(i < l) {
            arg = arguments[i++];
            argsForConcat.push(
                arg instanceof BemCollection?  arg._entities : arg);
        }

        return new BemCollection(arrayConcat.apply(this._entities, argsForConcat));
    },

    /**
     * Returns size of the collection.
     * @returns {Number}
     */
    size : function() {
        return this._entities.length;
    },

    /**
     * Converts the collection into array.
     * @returns {Array}
     */
    toArray : function() {
        return this._entities.slice();
    }
});

function buildForEachEntityMethodProxyFn(methodName) {
    return function() {
        var args = arguments;
        this._entities.forEach(function(entity) {
            entity[methodName].apply(entity, args);
        });
        return this;
    };
}

function buildEntitiesMethodProxyFn(methodName) {
    return function() {
        var entities = this._entities;
        return entities[methodName].apply(entities, arguments);
    };
}

function buildComplexProxyFn(arrayMethodName, entityMethodName) {
    return function() {
        var args = arguments;
        return this._entities[arrayMethodName](function(entity) {
            return entity[entityMethodName].apply(entity, args);
        });
    };
}

var arrayConcat = Array.prototype.concat,
    arraySlice = Array.prototype.slice;

provide(BemCollection);

});

/* end: ../../common.blocks/i-bem/__collection/i-bem__collection.js */
/* begin: ../../common.blocks/i-bem-dom/__events/_type/i-bem-dom__events_type_bem.js */
/**
 * @module i-bem-dom__events_type_bem
 */
modules.define(
    'i-bem-dom__events_type_bem',
    [
        'i-bem-dom__events',
        'i-bem__internal',
        'inherit',
        'functions',
        'jquery',
        'identify',
        'events'
    ],
    function(
        provide,
        bemDomEvents,
        bemInternal,
        inherit,
        functions,
        $,
        identify,
        events) {

var EVENT_PREFIX = '__bem__',
    MOD_CHANGE_EVENT = 'modchange',

    specialEvents = $.event.special,
    specialEventsStorage = {},

    createSpecialEvent = function(event) {
        return {
            setup : function() {
                specialEventsStorage[event] || (specialEventsStorage[event] = true);
            },
            teardown : functions.noop
        };
    },

    eventBuilder = function(e, params) {
        var event = EVENT_PREFIX + params.bindEntityCls.getEntityName() +
            (typeof e === 'object'?
                e instanceof events.Event?
                    e.type :
                    bemInternal.buildModPostfix(e.modName, e.modVal) :
                e);

        specialEvents[event] ||
            (specialEvents[event] = createSpecialEvent(event));

        return event;
    },

    /**
     * @class EventManagerFactory
     * @augments i-bem-dom__events:EventManagerFactory
     * @exports i-bem-dom__events_type_bem:EventManagerFactory
     */
    EventManagerFactory = inherit(bemDomEvents.EventManagerFactory,/** @lends EventManagerFactory.prototype */{
        /** @override */
        _createEventManager : function(ctx, params, isInstance) {
            function wrapperFn(fn, fnCtx, fnId) {
                return function(e, data, flags, originalEvent) {
                    if(flags.fns[fnId]) return;

                    var instance,
                        instanceDomElem;

                    if(isInstance) {
                        instance = ctx;
                        instanceDomElem = instance.domElem;
                    } else {
                        // TODO: we could optimize all these "closest" to a single traversing
                        instanceDomElem = $(e.target).closest(params.ctxSelector);
                        instanceDomElem.length && (instance = instanceDomElem.bem(ctx));
                    }

                    if(instance &&
                        (!flags.propagationStoppedDomNode ||
                            !$.contains(instanceDomElem[0], flags.propagationStoppedDomNode))) {
                        originalEvent.data = e.data;
                        // TODO: do we really need both target and bemTarget?
                        originalEvent.bemTarget = originalEvent.target;
                        flags.fns[fnId] = true;
                        fn.call(fnCtx || instance, originalEvent, data);

                        if(originalEvent.isPropagationStopped()) {
                            e.stopPropagation();
                            flags.propagationStoppedDomNode = instanceDomElem[0];
                        }
                    }
                };
            }

            return new this._eventManagerCls(params, wrapperFn, eventBuilder);
        }
    });

provide({
    /**
     * @param {BemDomEntity} ctx
     * @param {String|Object|events:Event} e Event name
     * @param {Object} [data]
     */
    emit : function(ctx, e, data) {
        var originalEvent;
        if(typeof e === 'string') {
            originalEvent = new events.Event(e, ctx);
        } else if(e.modName) {
            originalEvent = new events.Event(MOD_CHANGE_EVENT, ctx);
        } else if(!e.target) {
            e.target = ctx;
            originalEvent = e;
        }

        var event = eventBuilder(e, { bindEntityCls : ctx.__self });

        specialEventsStorage[event] &&
            ctx.domElem.trigger(event, [data, { fns : {}, propagationStoppedDomNode : null }, originalEvent]);
    },

    EventManagerFactory : EventManagerFactory
});

});

/* end: ../../common.blocks/i-bem-dom/__events/_type/i-bem-dom__events_type_bem.js */
/* begin: ../../common.blocks/functions/__debounce/functions__debounce.vanilla.js */
/**
 * @module functions__debounce
 */

modules.define('functions__debounce', function(provide) {

var global = this.global;

provide(
    /**
     * Debounces given function
     * @exports
     * @param {Function} fn function to debounce
     * @param {Number} timeout debounce interval
     * @param {Boolean} [invokeAsap=false] invoke before first interval
     * @param {Object} [ctx] context of function invocation
     * @returns {Function} debounced function
     */
    function(fn, timeout, invokeAsap, ctx) {
        if(arguments.length === 3 && typeof invokeAsap !== 'boolean') {
            ctx = invokeAsap;
            invokeAsap = false;
        }

        var timer;
        return function() {
            var args = arguments;
            ctx || (ctx = this);

            invokeAsap && !timer && fn.apply(ctx, args);

            global.clearTimeout(timer);

            timer = global.setTimeout(function() {
                invokeAsap || fn.apply(ctx, args);
                timer = null;
            }, timeout);
        };
    });
});

/* end: ../../common.blocks/functions/__debounce/functions__debounce.vanilla.js */
/* begin: ../../common.blocks/functions/__throttle/functions__throttle.vanilla.js */
/**
 * @module functions__throttle
 */

modules.define('functions__throttle', function(provide) {

var global = this.global;

provide(
    /**
     * Throttle given function
     * @exports
     * @param {Function} fn function to throttle
     * @param {Number} timeout throttle interval
     * @param {Boolean} [invokeAsap=true] invoke before first interval
     * @param {Object} [ctx] context of function invocation
     * @returns {Function} throttled function
     */
    function(fn, timeout, invokeAsap, ctx) {
        var typeofInvokeAsap = typeof invokeAsap;
        if(typeofInvokeAsap === 'undefined') {
            invokeAsap = true;
        } else if(arguments.length === 3 && typeofInvokeAsap !== 'boolean') {
            ctx = invokeAsap;
            invokeAsap = true;
        }

        var timer, args, needInvoke,
            wrapper = function() {
                if(needInvoke) {
                    fn.apply(ctx, args);
                    needInvoke = false;
                    timer = global.setTimeout(wrapper, timeout);
                } else {
                    timer = null;
                }
            };

        return function() {
            args = arguments;
            ctx || (ctx = this);
            needInvoke = true;

            if(!timer) {
                invokeAsap?
                    wrapper() :
                    timer = global.setTimeout(wrapper, timeout);
            }
        };
    });

});

/* end: ../../common.blocks/functions/__throttle/functions__throttle.vanilla.js */
/* begin: ../../common.blocks/i-bem-dom/__init/_auto/i-bem-dom__init_auto.js */
/**
 * Auto initialization on DOM ready
 */

modules.require(
    ['i-bem-dom__init', 'jquery', 'next-tick'],
    function(init, $, nextTick) {

$(function() {
    nextTick(init);
});

});

/* end: ../../common.blocks/i-bem-dom/__init/_auto/i-bem-dom__init_auto.js */
/* begin: ../../common.blocks/idle/idle.js */
/**
 * @module idle
 */

modules.define('idle', ['inherit', 'events', 'jquery'], function(provide, inherit, events, $) {

var IDLE_TIMEOUT = 3000,
    USER_EVENTS = 'mousemove keydown click',
    /**
     * @class Idle
     * @augments events:Emitter
     */
    Idle = inherit(events.Emitter, /** @lends Idle.prototype */{
        /**
         * @constructor
         */
        __constructor : function() {
            this._timer = null;
            this._isStarted = false;
            this._isIdle = false;
        },

        /**
         * Starts monitoring of idle state
         */
        start : function() {
            if(!this._isStarted) {
                this._isStarted = true;
                this._startTimer();
                $(document).on(USER_EVENTS, $.proxy(this._onUserAction, this));
            }
        },

        /**
         * Stops monitoring of idle state
         */
        stop : function() {
            if(this._isStarted) {
                this._isStarted = false;
                this._stopTimer();
                $(document).off(USER_EVENTS, this._onUserAction);
            }
        },

        /**
         * Returns whether state is idle
         * @returns {Boolean}
         */
        isIdle : function() {
            return this._isIdle;
        },

        _onUserAction : function() {
            if(this._isIdle) {
                this._isIdle = false;
                this.emit('wakeup');
            }

            this._stopTimer();
            this._startTimer();
        },

        _startTimer : function() {
            var _this = this;
            this._timer = setTimeout(
                function() {
                    _this._onTimeout();
                },
                IDLE_TIMEOUT);
        },

        _stopTimer : function() {
            this._timer && clearTimeout(this._timer);
        },

        _onTimeout : function() {
            this._isIdle = true;
            this.emit('idle');
        }
    });

provide(
    /**
     * @exports
     * @type Idle
     */
    new Idle());

});

/* end: ../../common.blocks/idle/idle.js */
/* begin: ../../common.blocks/idle/_start/idle_start_auto.js */
/**
 * Automatically starts idle module
 */

modules.require(['idle'], function(idle) {

idle.start();

});

/* end: ../../common.blocks/idle/_start/idle_start_auto.js */
/* begin: ../../common.blocks/jquery/__event/_type/jquery__event_type_pointerclick.js */
modules.define('jquery', ['next-tick'], function(provide, nextTick, $) {

var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
    event = $.event.special.pointerclick = {
        setup : function() {
            if(isIOS) {
                $(this)
                    .on('pointerdown', event.onPointerdown)
                    .on('pointerup', event.onPointerup)
                    .on('pointerleave pointercancel', event.onPointerleave);
            } else {
                $(this).on('click', event.handler);
            }
        },

        teardown : function() {
            if(isIOS) {
                $(this)
                    .off('pointerdown', event.onPointerdown)
                    .off('pointerup', event.onPointerup)
                    .off('pointerleave pointercancel', event.onPointerleave);
            } else {
                $(this).off('click', event.handler);
            }
        },

        handler : function(e) {
            if(!e.button) {
                var type = e.type;
                e.type = 'pointerclick';
                $.event.dispatch.apply(this, arguments);
                e.type = type;
            }
        },

        onPointerdown : function(e) {
            pointerdownEvent = e;
        },

        onPointerleave : function() {
            pointerdownEvent = null;
        },

        onPointerup : function(e) {
            if(!pointerdownEvent) return;

            if(!pointerDownUpInProgress) {
                nextTick(function() {
                    pointerDownUpInProgress = false;
                    pointerdownEvent = null;
                });
                pointerDownUpInProgress = true;
            }

            event.handler.apply(this, arguments);
        }
    },
    pointerDownUpInProgress = false,
    pointerdownEvent;

provide($);

});

/* end: ../../common.blocks/jquery/__event/_type/jquery__event_type_pointerclick.js */
/* begin: ../../common.blocks/jquery/__event/_type/jquery__event_type_pointernative.js */
;(function(global, factory) {

if(typeof modules === 'object' && modules.isDefined('jquery')) {
    modules.define('jquery', function(provide, $) {
        factory(this.global, $);
        provide($);
    });
} else if(typeof jQuery === 'function') {
    factory(global, jQuery);
}

}(this, function(window, $) {

var jqEvent = $.event;

// NOTE: Remove jQuery special fixes for pointerevents – we fix them ourself
delete jqEvent.special.pointerenter;
delete jqEvent.special.pointerleave;

if(window.PointerEvent) {
    // Have native PointerEvent support, nothing to do than
    return;
}

/*!
 * Most of source code is taken from PointerEvents Polyfill
 * written by Polymer Team (https://github.com/Polymer/PointerEvents)
 * and licensed under the BSD License.
 */

var doc = document,
    HAS_BITMAP_TYPE = window.MSPointerEvent && typeof window.MSPointerEvent.MSPOINTER_TYPE_MOUSE === 'number',
    undef;

/*!
 * Returns a snapshot of the event, with writable properties.
 *
 * @param {Event} event An event that contains properties to copy.
 * @returns {Object} An object containing shallow copies of `inEvent`'s
 *    properties.
 */
function cloneEvent(event) {
    var eventCopy = $.extend(new $.Event(), event);
    if(event.preventDefault) {
        eventCopy.preventDefault = function() {
            event.preventDefault();
        };
    }
    return eventCopy;
}

/*!
 * Dispatches the event to the target, taking event's bubbling into account.
 */
function dispatchEvent(event, target) {
    return event.bubbles?
        jqEvent.trigger(event, null, target) :
        jqEvent.dispatch.call(target, event);
}

var MOUSE_PROPS = {
        bubbles : false,
        cancelable : false,
        view : null,
        detail : null,
        screenX : 0,
        screenY : 0,
        clientX : 0,
        clientY : 0,
        ctrlKey : false,
        altKey : false,
        shiftKey : false,
        metaKey : false,
        button : 0,
        relatedTarget : null,
        pageX : 0,
        pageY : 0
    },
    mouseProps = Object.keys(MOUSE_PROPS),
    mousePropsLen = mouseProps.length,
    mouseDefaults = mouseProps.map(function(prop) { return MOUSE_PROPS[prop] });

/*!
 * Pointer event constructor
 *
 * @param {String} type
 * @param {Object} [params]
 * @returns {Event}
 * @constructor
 */
function PointerEvent(type, params) {
    params || (params = {});

    var e = $.Event(type);

    // define inherited MouseEvent properties
    for(var i = 0, p; i < mousePropsLen; i++) {
        p = mouseProps[i];
        e[p] = params[p] || mouseDefaults[i];
    }

    e.buttons = params.buttons || 0;

    // add x/y properties aliased to clientX/Y
    e.x = e.clientX;
    e.y = e.clientY;

    // Spec requires that pointers without pressure specified use 0.5 for down
    // state and 0 for up state.
    var pressure = 0;
    if(params.pressure) {
        pressure = params.pressure;
    } else {
        pressure = e.buttons? 0.5 : 0;
    }

    // define the properties of the PointerEvent interface
    e.pointerId = params.pointerId || 0;
    e.width = params.width || 0;
    e.height = params.height || 0;
    e.pressure = pressure;
    e.tiltX = params.tiltX || 0;
    e.tiltY = params.tiltY || 0;
    e.pointerType = params.pointerType || '';
    e.hwTimestamp = params.hwTimestamp || 0;
    e.isPrimary = params.isPrimary || false;

    // add some common jQuery properties
    e.which = typeof params.which === 'undefined'? 1 : params.which;

    return e;
}

function SparseArrayMap() {
    this.array = [];
    this.size = 0;
}

SparseArrayMap.prototype = {
    set : function(k, v) {
        if(v === undef) {
            return this['delete'](k);
        }
        if(!this.has(k)) {
            this.size++;
        }
        this.array[k] = v;
    },

    has : function(k) {
        return this.array[k] !== undef;
    },

    'delete' : function(k) {
        if(this.has(k)){
            delete this.array[k];
            this.size--;
        }
    },

    get : function(k) {
        return this.array[k];
    },

    clear : function() {
        this.array.length = 0;
        this.size = 0;
    },

    // return value, key, map
    forEach : function(callback, ctx) {
        return this.array.forEach(function(v, k) {
            callback.call(ctx, v, k, this);
        }, this);
    }
};

// jscs:disable requireMultipleVarDecl
var PointerMap = window.Map && window.Map.prototype.forEach? Map : SparseArrayMap,
    pointerMap = new PointerMap();

var dispatcher = {
    eventMap : {},
    eventSourceList : [],

    /*!
     * Add a new event source that will generate pointer events
     */
    registerSource : function(name, source) {
        var newEvents = source.events;
        if(newEvents) {
            newEvents.forEach(function(e) {
                source[e] && (this.eventMap[e] = function() { source[e].apply(source, arguments) });
            }, this);
            this.eventSourceList.push(source);
        }
    },

    register : function(element) {
        var len = this.eventSourceList.length;
        for(var i = 0, es; (i < len) && (es = this.eventSourceList[i]); i++) {
            // call eventsource register
            es.register.call(es, element);
        }
    },

    unregister : function(element) {
        var l = this.eventSourceList.length;
        for(var i = 0, es; (i < l) && (es = this.eventSourceList[i]); i++) {
            // call eventsource register
            es.unregister.call(es, element);
        }
    },

    down : function(event) {
        event.bubbles = true;
        this.fireEvent('pointerdown', event);
    },

    move : function(event) {
        event.bubbles = true;
        this.fireEvent('pointermove', event);
    },

    up : function(event) {
        event.bubbles = true;
        this.fireEvent('pointerup', event);
    },

    enter : function(event) {
        event.bubbles = false;
        this.fireEvent('pointerenter', event);
    },

    leave : function(event) {
        event.bubbles = false;
        this.fireEvent('pointerleave', event);
    },

    over : function(event) {
        event.bubbles = true;
        this.fireEvent('pointerover', event);
    },

    out : function(event) {
        event.bubbles = true;
        this.fireEvent('pointerout', event);
    },

    cancel : function(event) {
        event.bubbles = true;
        this.fireEvent('pointercancel', event);
    },

    leaveOut : function(event) {
        this.out(event);
        this.enterLeave(event, this.leave);
    },

    enterOver : function(event) {
        this.over(event);
        this.enterLeave(event, this.enter);
    },

    enterLeave : function(event, fn) {
        var target = event.target,
            relatedTarget = event.relatedTarget;

        if(!this.contains(target, relatedTarget)) {
            while(target && target !== relatedTarget) {
                event.target = target;
                fn.call(this, event);

                target = target.parentNode;
            }
        }
    },

    contains : function(target, relatedTarget) {
        return target === relatedTarget || $.contains(target, relatedTarget);
    },

    // LISTENER LOGIC
    eventHandler : function(e) {
        // This is used to prevent multiple dispatch of pointerevents from
        // platform events. This can happen when two elements in different scopes
        // are set up to create pointer events, which is relevant to Shadow DOM.
        if(e._handledByPE) {
            return;
        }

        var type = e.type, fn;
        (fn = this.eventMap && this.eventMap[type]) && fn(e);

        e._handledByPE = true;
    },

    /*!
     * Sets up event listeners
     */
    listen : function(target, events) {
        events.forEach(function(e) {
            this.addEvent(target, e);
        }, this);
    },

    /*!
     * Removes event listeners
     */
    unlisten : function(target, events) {
        events.forEach(function(e) {
            this.removeEvent(target, e);
        }, this);
    },

    addEvent : function(target, eventName) {
        $(target).on(eventName, boundHandler);
    },

    removeEvent : function(target, eventName) {
        $(target).off(eventName, boundHandler);
    },

    getTarget : function(event) {
        return event._target;
    },

    /*!
     * Creates a new Event of type `type`, based on the information in `event`
     */
    makeEvent : function(type, event) {
        var e = new PointerEvent(type, event);
        if(event.preventDefault) {
            e.preventDefault = event.preventDefault;
        }

        e._target = e._target || event.target;

        return e;
    },

    /*!
     * Dispatches the event to its target
     */
    dispatchEvent : function(event) {
        var target = this.getTarget(event);
        if(target) {
            if(!event.target) {
                event.target = target;
            }

            return dispatchEvent(event, target);
        }
    },

    /*!
     * Makes and dispatch an event in one call
     */
    fireEvent : function(type, event) {
        var e = this.makeEvent(type, event);
        return this.dispatchEvent(e);
    }
};

function boundHandler() {
    dispatcher.eventHandler.apply(dispatcher, arguments);
}

var CLICK_COUNT_TIMEOUT = 200,
    // Radius around touchend that swallows mouse events
    MOUSE_DEDUP_DIST = 25,
    MOUSE_POINTER_ID = 1,
    // This should be long enough to ignore compat mouse events made by touch
    TOUCH_DEDUP_TIMEOUT = 2500,
    // A distance for which touchmove should fire pointercancel event
    TOUCHMOVE_HYSTERESIS = 20;

// handler block for native mouse events
var mouseEvents = {
    POINTER_TYPE : 'mouse',
    events : [
        'mousedown',
        'mousemove',
        'mouseup',
        'mouseover',
        'mouseout'
    ],

    register : function(target) {
        dispatcher.listen(target, this.events);
    },

    unregister : function(target) {
        dispatcher.unlisten(target, this.events);
    },

    lastTouches : [],

    // collide with the global mouse listener
    isEventSimulatedFromTouch : function(event) {
        var lts = this.lastTouches,
            x = event.clientX,
            y = event.clientY;

        for(var i = 0, l = lts.length, t; i < l && (t = lts[i]); i++) {
            // simulated mouse events will be swallowed near a primary touchend
            var dx = Math.abs(x - t.x), dy = Math.abs(y - t.y);
            if(dx <= MOUSE_DEDUP_DIST && dy <= MOUSE_DEDUP_DIST) {
                return true;
            }
        }
    },

    prepareEvent : function(event) {
        var e = cloneEvent(event);
        e.pointerId = MOUSE_POINTER_ID;
        e.isPrimary = true;
        e.pointerType = this.POINTER_TYPE;
        return e;
    },

    mousedown : function(event) {
        if(!this.isEventSimulatedFromTouch(event)) {
            if(pointerMap.has(MOUSE_POINTER_ID)) {
                // http://crbug/149091
                this.cancel(event);
            }

            pointerMap.set(MOUSE_POINTER_ID, event);

            var e = this.prepareEvent(event);
            dispatcher.down(e);
        }
    },

    mousemove : function(event) {
        if(!this.isEventSimulatedFromTouch(event)) {
            var e = this.prepareEvent(event);
            dispatcher.move(e);
        }
    },

    mouseup : function(event) {
        if(!this.isEventSimulatedFromTouch(event)) {
            var p = pointerMap.get(MOUSE_POINTER_ID);
            if(p && p.button === event.button) {
                var e = this.prepareEvent(event);
                dispatcher.up(e);
                this.cleanupMouse();
            }
        }
    },

    mouseover : function(event) {
        if(!this.isEventSimulatedFromTouch(event)) {
            var e = this.prepareEvent(event);
            dispatcher.enterOver(e);
        }
    },

    mouseout : function(event) {
        if(!this.isEventSimulatedFromTouch(event)) {
            var e = this.prepareEvent(event);
            dispatcher.leaveOut(e);
        }
    },

    cancel : function(inEvent) {
        var e = this.prepareEvent(inEvent);
        dispatcher.cancel(e);
        this.cleanupMouse();
    },

    cleanupMouse : function() {
        pointerMap['delete'](MOUSE_POINTER_ID);
    }
};

var touchEvents = {
    events : [
        'touchstart',
        'touchmove',
        'touchend',
        'touchcancel'
    ],

    register : function(target) {
        dispatcher.listen(target, this.events);
    },

    unregister : function(target) {
        dispatcher.unlisten(target, this.events);
    },

    POINTER_TYPE : 'touch',
    clickCount : 0,
    resetId : null,
    firstTouch : null,

    isPrimaryTouch : function(touch) {
        return this.firstTouch === touch.identifier;
    },

    /*!
     * Sets primary touch if there no pointers, or the only pointer is the mouse
     */
    setPrimaryTouch : function(touch) {
        if(pointerMap.size === 0 ||
                (pointerMap.size === 1 && pointerMap.has(MOUSE_POINTER_ID))) {
            this.firstTouch = touch.identifier;
            this.firstXY = { X : touch.clientX, Y : touch.clientY };
            this.scrolling = null;

            this.cancelResetClickCount();
        }
    },

    removePrimaryPointer : function(pointer) {
        if(pointer.isPrimary) {
            this.firstTouch = null;
            // TODO(@narqo): It seems that, flushing `firstXY` flag explicitly in `touchmove` handler is enough.
            // Original code from polymer doing `this.firstXY = null` on every `removePrimaryPointer` call, but looks
            // like it is harmful in some of our usecases.
            this.resetClickCount();
        }
    },

    resetClickCount : function() {
        var _this = this;
        this.resetId = setTimeout(function() {
            _this.clickCount = 0;
            _this.resetId = null;
        }, CLICK_COUNT_TIMEOUT);
    },

    cancelResetClickCount : function() {
        this.resetId && clearTimeout(this.resetId);
    },

    typeToButtons : function(type) {
        return type === 'touchstart' || type === 'touchmove'? 1 : 0;
    },

    findTarget : function(event) {
        // Currently we don't interested in shadow dom handling
        return doc.elementFromPoint(event.clientX, event.clientY);
    },

    touchToPointer : function(touch) {
        var cte = this.currentTouchEvent,
            e = cloneEvent(touch);

        // Spec specifies that pointerId 1 is reserved for Mouse.
        // Touch identifiers can start at 0.
        // Add 2 to the touch identifier for compatibility.
        e.pointerId = touch.identifier + 2;
        e.target = this.findTarget(e);
        e.bubbles = true;
        e.cancelable = true;
        e.detail = this.clickCount;
        e.button = 0;
        e.buttons = this.typeToButtons(cte.type);
        e.width = touch.webkitRadiusX || touch.radiusX || 0;
        e.height = touch.webkitRadiusY || touch.radiusY || 0;
        e.pressure = touch.mozPressure || touch.webkitForce || touch.force || 0.5;
        e.isPrimary = this.isPrimaryTouch(touch);
        e.pointerType = this.POINTER_TYPE;

        // forward touch preventDefaults
        var _this = this;
        e.preventDefault = function() {
            _this.scrolling = false;
            _this.firstXY = null;
            cte.preventDefault();
        };

        return e;
    },

    processTouches : function(event, fn) {
        var tl = event.originalEvent.changedTouches;
        this.currentTouchEvent = event;
        for(var i = 0, t; i < tl.length; i++) {
            t = tl[i];
            fn.call(this, this.touchToPointer(t));
        }
    },

    shouldScroll : function(touchEvent) {
        // return "true" for things to be much easier
        return true;
    },

    findTouch : function(touches, pointerId) {
        for(var i = 0, l = touches.length, t; i < l && (t = touches[i]); i++) {
            if(t.identifier === pointerId) {
                return true;
            }
        }
    },

    /*!
     * In some instances, a touchstart can happen without a touchend.
     * This leaves the pointermap in a broken state.
     * Therefore, on every touchstart, we remove the touches
     * that did not fire a touchend event.
     *
     * To keep state globally consistent, we fire a pointercancel
     * for this "abandoned" touch
     */
    vacuumTouches : function(touchEvent) {
        var touches = touchEvent.touches;
        // `pointermap.size` should be less than length of touches here, as the touchstart has not
        // been processed yet.
        if(pointerMap.size >= touches.length) {
            var d = [];

            pointerMap.forEach(function(pointer, pointerId) {
                // Never remove pointerId == 1, which is mouse.
                // Touch identifiers are 2 smaller than their pointerId, which is the
                // index in pointermap.
                if(pointerId === MOUSE_POINTER_ID || this.findTouch(touches, pointerId - 2)) return;
                d.push(pointer.outEvent);
            }, this);

            d.forEach(this.cancelOut, this);
        }
    },

    /*!
     * Prevents synth mouse events from creating pointer events
     */
    dedupSynthMouse : function(touchEvent) {
        var lts = mouseEvents.lastTouches,
            t = touchEvent.changedTouches[0];

        // only the primary finger will synth mouse events
        if(this.isPrimaryTouch(t)) {
            // remember x/y of last touch
            var lt = { x : t.clientX, y : t.clientY };
            lts.push(lt);

            setTimeout(function() {
                var i = lts.indexOf(lt);
                i > -1 && lts.splice(i, 1);
            }, TOUCH_DEDUP_TIMEOUT);
        }
    },

    touchstart : function(event) {
        var touchEvent = event.originalEvent;

        this.vacuumTouches(touchEvent);
        this.setPrimaryTouch(touchEvent.changedTouches[0]);
        this.dedupSynthMouse(touchEvent);

        if(!this.scrolling) {
            this.clickCount++;
            this.processTouches(event, this.overDown);
        }
    },

    touchmove : function(event) {
        var touchEvent = event.originalEvent;
        if(!this.scrolling) {
            if(this.scrolling === null && this.shouldScroll(touchEvent)) {
                this.scrolling = true;
            } else {
                event.preventDefault();
                this.processTouches(event, this.moveOverOut);
            }
        } else if(this.firstXY) {
            var firstXY = this.firstXY,
                touch = touchEvent.changedTouches[0],
                dx = touch.clientX - firstXY.X,
                dy = touch.clientY - firstXY.Y,
                dd = Math.sqrt(dx * dx + dy * dy);
            if(dd >= TOUCHMOVE_HYSTERESIS) {
                this.touchcancel(event);
                this.scrolling = true;
                this.firstXY = null;
            }
        }
    },

    touchend : function(event) {
        var touchEvent = event.originalEvent;
        this.dedupSynthMouse(touchEvent);
        this.processTouches(event, this.upOut);
    },

    touchcancel : function(event) {
        this.processTouches(event, this.cancelOut);
    },

    overDown : function(pEvent) {
        var target = pEvent.target;
        pointerMap.set(pEvent.pointerId, {
            target : target,
            outTarget : target,
            outEvent : pEvent
        });
        dispatcher.over(pEvent);
        dispatcher.enter(pEvent);
        dispatcher.down(pEvent);
    },

    moveOverOut : function(pEvent) {
        var pointer = pointerMap.get(pEvent.pointerId);

        // a finger drifted off the screen, ignore it
        if(!pointer) {
            return;
        }

        dispatcher.move(pEvent);

        var outEvent = pointer.outEvent,
            outTarget = pointer.outTarget;

        if(outEvent && outTarget !== pEvent.target) {
            pEvent.relatedTarget = outTarget;
            outEvent.relatedTarget = pEvent.target;
            // recover from retargeting by shadow
            outEvent.target = outTarget;

            if(pEvent.target) {
                dispatcher.leaveOut(outEvent);
                dispatcher.enterOver(pEvent);
            } else {
                // clean up case when finger leaves the screen
                pEvent.target = outTarget;
                pEvent.relatedTarget = null;
                this.cancelOut(pEvent);
            }
        }

        pointer.outEvent = pEvent;
        pointer.outTarget = pEvent.target;
    },

    upOut : function(pEvent) {
        dispatcher.up(pEvent);
        dispatcher.out(pEvent);
        dispatcher.leave(pEvent);

        this.cleanUpPointer(pEvent);
    },

    cancelOut : function(pEvent) {
        dispatcher.cancel(pEvent);
        dispatcher.out(pEvent);
        dispatcher.leave(pEvent);
        this.cleanUpPointer(pEvent);
    },

    cleanUpPointer : function(pEvent) {
        pointerMap['delete'](pEvent.pointerId);
        this.removePrimaryPointer(pEvent);
    }
};

var msEvents = {
    events : [
        'MSPointerDown',
        'MSPointerMove',
        'MSPointerUp',
        'MSPointerOut',
        'MSPointerOver',
        'MSPointerCancel'
    ],

    register : function(target) {
        dispatcher.listen(target, this.events);
    },

    unregister : function(target) {
        dispatcher.unlisten(target, this.events);
    },

    POINTER_TYPES : [
        '',
        'unavailable',
        'touch',
        'pen',
        'mouse'
    ],

    prepareEvent : function(event) {
        var e = cloneEvent(event);
        HAS_BITMAP_TYPE && (e.pointerType = this.POINTER_TYPES[event.pointerType]);
        return e;
    },

    MSPointerDown : function(event) {
        pointerMap.set(event.pointerId, event);
        var e = this.prepareEvent(event);
        dispatcher.down(e);
    },

    MSPointerMove : function(event) {
        var e = this.prepareEvent(event);
        dispatcher.move(e);
    },

    MSPointerUp : function(event) {
        var e = this.prepareEvent(event);
        dispatcher.up(e);
        this.cleanup(event.pointerId);
    },

    MSPointerOut : function(event) {
        var e = this.prepareEvent(event);
        dispatcher.leaveOut(e);
    },

    MSPointerOver : function(event) {
        var e = this.prepareEvent(event);
        dispatcher.enterOver(e);
    },

    MSPointerCancel : function(event) {
        var e = this.prepareEvent(event);
        dispatcher.cancel(e);
        this.cleanup(event.pointerId);
    },

    cleanup : function(id) {
        pointerMap['delete'](id);
    }
};

var navigator = window.navigator;
if(navigator.msPointerEnabled) {
    dispatcher.registerSource('ms', msEvents);
} else {
    dispatcher.registerSource('mouse', mouseEvents);
    if(typeof window.ontouchstart !== 'undefined') {
        dispatcher.registerSource('touch', touchEvents);
    }
}

dispatcher.register(doc);

}));

/* end: ../../common.blocks/jquery/__event/_type/jquery__event_type_pointernative.js */
/* begin: ../../common.blocks/keyboard/__codes/keyboard__codes.js */
/**
 * @module keyboard__codes
 */
modules.define('keyboard__codes', function(provide) {

provide(/** @exports */{
    /** @type {Number} */
    BACKSPACE : 8,
    /** @type {Number} */
    TAB : 9,
    /** @type {Number} */
    ENTER : 13,
    /** @type {Number} */
    CAPS_LOCK : 20,
    /** @type {Number} */
    ESC : 27,
    /** @type {Number} */
    SPACE : 32,
    /** @type {Number} */
    PAGE_UP : 33,
    /** @type {Number} */
    PAGE_DOWN : 34,
    /** @type {Number} */
    END : 35,
    /** @type {Number} */
    HOME : 36,
    /** @type {Number} */
    LEFT : 37,
    /** @type {Number} */
    UP : 38,
    /** @type {Number} */
    RIGHT : 39,
    /** @type {Number} */
    DOWN : 40,
    /** @type {Number} */
    INSERT : 45,
    /** @type {Number} */
    DELETE : 46
});

});

/* end: ../../common.blocks/keyboard/__codes/keyboard__codes.js */
/* begin: ../../common.blocks/loader/_type/loader_type_bundle.js */
/**
 * @module loader_type_bundle
 * @description Load BEM bundle (JS+CSS) from external URL.
 */

modules.define('loader_type_bundle', function(provide) {

var LOADING_TIMEOUT = 30000,
    global = this.global,
    doc = document,
    head,
    bundles = {},

    handleError = function(bundleId) {
        var bundleDesc = bundles[bundleId];

        if(!bundleDesc) return;

        var fns = bundleDesc.errorFns,
            fn;

        clearTimeout(bundleDesc.timer);

        while(fn = fns.shift()) fn();
        delete bundles[bundleId];
    },

    appendCss = function(css) {
        var style = doc.createElement('style');
        style.type = 'text/css';
        head.appendChild(style); // ie needs to insert style before setting content
        style.styleSheet?
            style.styleSheet.cssText = css :
            style.appendChild(doc.createTextNode(css));
    },

    /**
     * Loads bundle
     * @exports
     * @param {String} id
     * @param {String} url
     * @param {Function} onSuccess
     * @param {Function} [onError]
     */
    load = function(id, url, onSuccess, onError) {
        var bundle = bundles[id];
        if(bundle) {
            if(bundle.successFns) { // bundle is being loaded
                bundle.successFns.push(onSuccess);
                onError && bundle.errorFns.push(onError);
            } else { // bundle was loaded before
                setTimeout(onSuccess, 0);
            }
            return;
        }

        var script = doc.createElement('script'),
            errorFn = function() {
                handleError(id);
            };

        script.type = 'text/javascript';
        script.charset = 'utf-8';
        script.src = url;
        script.onerror = errorFn; // for browsers that support
        setTimeout(function() {
            (head || (head = doc.getElementsByTagName('head')[0])).insertBefore(script, head.firstChild);
        }, 0);

        bundles[id] = {
            successFns : [onSuccess],
            errorFns : onError? [onError] : [],
            timer : setTimeout(errorFn, LOADING_TIMEOUT)
        };
    };

load._loaded = function(bundle) {
    var bundleDesc = bundles[bundle.id];

    if(!bundleDesc) return;

    clearTimeout(bundleDesc.timer);

    bundle.js && bundle.js.call(global);

    bundle.css && appendCss(bundle.css);

    if(bundle.hcss) {
        var styles = [],
            _ycssjs = window._ycssjs;

        bundle.hcss.forEach(function(hsh) {
            if(_ycssjs) {
                if(hsh[0] in _ycssjs) return;
                _ycssjs(hsh[0]);
            }

            styles.push(hsh[1]);
        });

        styles.length && appendCss(styles.join(''));
    }

    function onSuccess() {
        var fns = bundleDesc.successFns, fn;
        while(fn = fns.shift()) fn();
        delete bundleDesc.successFns;
    }

    modules.isDefined('i-bem__dom_init')?
        modules.require(['i-bem__dom_init'], onSuccess) :
        onSuccess();
};

provide(load);

});

/* end: ../../common.blocks/loader/_type/loader_type_bundle.js */
/* begin: ../../common.blocks/strings/__escape/strings__escape.vanilla.js */
/**
 * @module strings__escape
 * @description A set of string escaping functions
 */

modules.define('strings__escape', function(provide) {

var symbols = {
        '"' : '&quot;',
        '\'' : '&apos;',
        '&' : '&amp;',
        '<' : '&lt;',
        '>' : '&gt;'
    },
    mapSymbol = function(s) {
        return symbols[s] || s;
    },
    buildEscape = function(regexp) {
        regexp = new RegExp(regexp, 'g');
        return function(str) {
            return ('' + str).replace(regexp, mapSymbol);
        };
    };

provide(/** @exports */{
    /**
     * Escape string to use in XML
     * @type Function
     * @param {String} str
     * @returns {String}
     */
    xml : buildEscape('[&<>]'),

    /**
     * Escape string to use in HTML
     * @type Function
     * @param {String} str
     * @returns {String}
     */
    html : buildEscape('[&<>]'),

    /**
     * Escape string to use in attributes
     * @type Function
     * @param {String} str
     * @returns {String}
     */
    attr : buildEscape('["\'&<>]')
});

});

/* end: ../../common.blocks/strings/__escape/strings__escape.vanilla.js */
/* begin: ../../common.blocks/tick/tick.vanilla.js */
/**
 * @module tick
 * @description Helpers for polling anything
 */

modules.define('tick', ['inherit', 'events'], function(provide, inherit, events) {

var TICK_INTERVAL = 50,
    global = this.global,

    /**
     * @class Tick
     * @augments events:Emitter
     */
    Tick = inherit(events.Emitter, /** @lends Tick.prototype */{
        /**
         * @constructor
         */
        __constructor : function() {
            this._timer = null;
            this._isStarted = false;
        },

        /**
         * Starts polling
         */
        start : function() {
            if(!this._isStarted) {
                this._isStarted = true;
                this._scheduleTick();
            }
        },

        /**
         * Stops polling
         */
        stop : function() {
            if(this._isStarted) {
                this._isStarted = false;
                global.clearTimeout(this._timer);
            }
        },

        _scheduleTick : function() {
            var _this = this;
            this._timer = global.setTimeout(
                function() {
                    _this._onTick();
                },
                TICK_INTERVAL);
        },

        _onTick : function() {
            this.emit('tick');

            this._isStarted && this._scheduleTick();
        }
    });

provide(
    /**
     * @exports
     * @type Tick
     */
    new Tick());

});

/* end: ../../common.blocks/tick/tick.vanilla.js */
/* begin: ../../common.blocks/tick/_start/tick_start_auto.vanilla.js */
/**
 * Automatically starts tick module
 */

modules.require(['tick'], function(tick) {

tick.start();

});

/* end: ../../common.blocks/tick/_start/tick_start_auto.vanilla.js */
/* begin: ../../common.blocks/uri/uri.vanilla.js */
/**
 * @module uri
 * @description A set of helpers to work with URI
 */

modules.define('uri',  function(provide) {

// Equivalency table for cp1251 and utf8.
var map = { '%D0' : '%D0%A0', '%C0' : '%D0%90', '%C1' : '%D0%91', '%C2' : '%D0%92', '%C3' : '%D0%93', '%C4' : '%D0%94', '%C5' : '%D0%95', '%A8' : '%D0%81', '%C6' : '%D0%96', '%C7' : '%D0%97', '%C8' : '%D0%98', '%C9' : '%D0%99', '%CA' : '%D0%9A', '%CB' : '%D0%9B', '%CC' : '%D0%9C', '%CD' : '%D0%9D', '%CE' : '%D0%9E', '%CF' : '%D0%9F', '%D1' : '%D0%A1', '%D2' : '%D0%A2', '%D3' : '%D0%A3', '%D4' : '%D0%A4', '%D5' : '%D0%A5', '%D6' : '%D0%A6', '%D7' : '%D0%A7', '%D8' : '%D0%A8', '%D9' : '%D0%A9', '%DA' : '%D0%AA', '%DB' : '%D0%AB', '%DC' : '%D0%AC', '%DD' : '%D0%AD', '%DE' : '%D0%AE', '%DF' : '%D0%AF', '%E0' : '%D0%B0', '%E1' : '%D0%B1', '%E2' : '%D0%B2', '%E3' : '%D0%B3', '%E4' : '%D0%B4', '%E5' : '%D0%B5', '%B8' : '%D1%91', '%E6' : '%D0%B6', '%E7' : '%D0%B7', '%E8' : '%D0%B8', '%E9' : '%D0%B9', '%EA' : '%D0%BA', '%EB' : '%D0%BB', '%EC' : '%D0%BC', '%ED' : '%D0%BD', '%EE' : '%D0%BE', '%EF' : '%D0%BF', '%F0' : '%D1%80', '%F1' : '%D1%81', '%F2' : '%D1%82', '%F3' : '%D1%83', '%F4' : '%D1%84', '%F5' : '%D1%85', '%F6' : '%D1%86', '%F7' : '%D1%87', '%F8' : '%D1%88', '%F9' : '%D1%89', '%FA' : '%D1%8A', '%FB' : '%D1%8B', '%FC' : '%D1%8C', '%FD' : '%D1%8D', '%FE' : '%D1%8E', '%FF' : '%D1%8F' };

function convert(str) {
    // Symbol code in cp1251 (hex) : symbol code in utf8)
    return str.replace(
        /%.{2}/g,
        function($0) {
            return map[$0] || $0;
        });
}

function decode(fn,  str) {
    var decoded = '';

    // Try/catch block for getting the encoding of the source string.
    // Error is thrown if a non-UTF8 string is input.
    // If the string was not decoded, it is returned without changes.
    try {
        decoded = fn(str);
    } catch (e1) {
        try {
            decoded = fn(convert(str));
        } catch (e2) {
            decoded = str;
        }
    }

    return decoded;
}

provide(/** @exports */{
    /**
     * Decodes URI string
     * @param {String} str
     * @returns {String}
     */
    decodeURI : function(str) {
        return decode(decodeURI,  str);
    },

    /**
     * Decodes URI component string
     * @param {String} str
     * @returns {String}
     */
    decodeURIComponent : function(str) {
        return decode(decodeURIComponent,  str);
    }
});

});

/* end: ../../common.blocks/uri/uri.vanilla.js */
/* begin: ../../common.blocks/uri/__querystring/uri__querystring.vanilla.js */
/**
 * @module uri__querystring
 * @description A set of helpers to work with query strings
 */

modules.define('uri__querystring', ['uri'], function(provide, uri) {

var hasOwnProperty = Object.prototype.hasOwnProperty;

function addParam(res, name, val) {
    /* jshint eqnull: true */
    res.push(encodeURIComponent(name) + '=' + (val == null? '' : encodeURIComponent(val)));
}

provide(/** @exports */{
    /**
     * Parse a query string to an object
     * @param {String} str
     * @returns {Object}
     */
    parse : function(str) {
        if(!str) {
            return {};
        }

        return str.split('&').reduce(
            function(res, pair) {
                if(!pair) {
                    return res;
                }

                var eq = pair.indexOf('='),
                    name, val;

                if(eq >= 0) {
                    name = pair.substr(0, eq);
                    val = pair.substr(eq + 1);
                } else {
                    name = pair;
                    val = '';
                }

                name = uri.decodeURIComponent(name);
                val = uri.decodeURIComponent(val);

                hasOwnProperty.call(res, name)?
                    Array.isArray(res[name])?
                        res[name].push(val) :
                        res[name] = [res[name], val] :
                    res[name] = val;

                return res;
            },
            {});
    },

    /**
     * Serialize an object to a query string
     * @param {Object} obj
     * @returns {String}
     */
    stringify : function(obj) {
        return Object.keys(obj)
            .reduce(
                function(res, name) {
                    var val = obj[name];
                    Array.isArray(val)?
                        val.forEach(function(val) {
                            addParam(res, name, val);
                        }) :
                        addParam(res, name, val);
                    return res;
                },
                [])
            .join('&');
    }
});

});

/* end: ../../common.blocks/uri/__querystring/uri__querystring.vanilla.js */
/* begin: ../../common.blocks/vow/vow.vanilla.js */
/**
 * @module vow
 * @author Filatov Dmitry <dfilatov@yandex-team.ru>
 * @version 0.4.13
 * @license
 * Dual licensed under the MIT and GPL licenses:
 *   * http://www.opensource.org/licenses/mit-license.php
 *   * http://www.gnu.org/licenses/gpl.html
 */

(function(global) {

var undef,
    nextTick = (function() {
        var fns = [],
            enqueueFn = function(fn) {
                fns.push(fn);
                return fns.length === 1;
            },
            callFns = function() {
                var fnsToCall = fns, i = 0, len = fns.length;
                fns = [];
                while(i < len) {
                    fnsToCall[i++]();
                }
            };

        if(typeof setImmediate === 'function') { // ie10, nodejs >= 0.10
            return function(fn) {
                enqueueFn(fn) && setImmediate(callFns);
            };
        }

        if(typeof process === 'object' && process.nextTick) { // nodejs < 0.10
            return function(fn) {
                enqueueFn(fn) && process.nextTick(callFns);
            };
        }

        var MutationObserver = global.MutationObserver || global.WebKitMutationObserver; // modern browsers
        if(MutationObserver) {
            var num = 1,
                node = document.createTextNode('');

            new MutationObserver(callFns).observe(node, { characterData : true });

            return function(fn) {
                enqueueFn(fn) && (node.data = (num *= -1));
            };
        }

        if(global.postMessage) {
            var isPostMessageAsync = true;
            if(global.attachEvent) {
                var checkAsync = function() {
                        isPostMessageAsync = false;
                    };
                global.attachEvent('onmessage', checkAsync);
                global.postMessage('__checkAsync', '*');
                global.detachEvent('onmessage', checkAsync);
            }

            if(isPostMessageAsync) {
                var msg = '__promise' + Math.random() + '_' +new Date,
                    onMessage = function(e) {
                        if(e.data === msg) {
                            e.stopPropagation && e.stopPropagation();
                            callFns();
                        }
                    };

                global.addEventListener?
                    global.addEventListener('message', onMessage, true) :
                    global.attachEvent('onmessage', onMessage);

                return function(fn) {
                    enqueueFn(fn) && global.postMessage(msg, '*');
                };
            }
        }

        var doc = global.document;
        if('onreadystatechange' in doc.createElement('script')) { // ie6-ie8
            var createScript = function() {
                    var script = doc.createElement('script');
                    script.onreadystatechange = function() {
                        script.parentNode.removeChild(script);
                        script = script.onreadystatechange = null;
                        callFns();
                };
                (doc.documentElement || doc.body).appendChild(script);
            };

            return function(fn) {
                enqueueFn(fn) && createScript();
            };
        }

        return function(fn) { // old browsers
            enqueueFn(fn) && setTimeout(callFns, 0);
        };
    })(),
    throwException = function(e) {
        nextTick(function() {
            throw e;
        });
    },
    isFunction = function(obj) {
        return typeof obj === 'function';
    },
    isObject = function(obj) {
        return obj !== null && typeof obj === 'object';
    },
    toStr = Object.prototype.toString,
    isArray = Array.isArray || function(obj) {
        return toStr.call(obj) === '[object Array]';
    },
    getArrayKeys = function(arr) {
        var res = [],
            i = 0, len = arr.length;
        while(i < len) {
            res.push(i++);
        }
        return res;
    },
    getObjectKeys = Object.keys || function(obj) {
        var res = [];
        for(var i in obj) {
            obj.hasOwnProperty(i) && res.push(i);
        }
        return res;
    },
    defineCustomErrorType = function(name) {
        var res = function(message) {
            this.name = name;
            this.message = message;
        };

        res.prototype = new Error();

        return res;
    },
    wrapOnFulfilled = function(onFulfilled, idx) {
        return function(val) {
            onFulfilled.call(this, val, idx);
        };
    };

/**
 * @class Deferred
 * @exports vow:Deferred
 * @description
 * The `Deferred` class is used to encapsulate newly-created promise object along with functions that resolve, reject or notify it.
 */

/**
 * @constructor
 * @description
 * You can use `vow.defer()` instead of using this constructor.
 *
 * `new vow.Deferred()` gives the same result as `vow.defer()`.
 */
var Deferred = function() {
    this._promise = new Promise();
};

Deferred.prototype = /** @lends Deferred.prototype */{
    /**
     * Returns the corresponding promise.
     *
     * @returns {vow:Promise}
     */
    promise : function() {
        return this._promise;
    },

    /**
     * Resolves the corresponding promise with the given `value`.
     *
     * @param {*} value
     *
     * @example
     * ```js
     * var defer = vow.defer(),
     *     promise = defer.promise();
     *
     * promise.then(function(value) {
     *     // value is "'success'" here
     * });
     *
     * defer.resolve('success');
     * ```
     */
    resolve : function(value) {
        this._promise.isResolved() || this._promise._resolve(value);
    },

    /**
     * Rejects the corresponding promise with the given `reason`.
     *
     * @param {*} reason
     *
     * @example
     * ```js
     * var defer = vow.defer(),
     *     promise = defer.promise();
     *
     * promise.fail(function(reason) {
     *     // reason is "'something is wrong'" here
     * });
     *
     * defer.reject('something is wrong');
     * ```
     */
    reject : function(reason) {
        if(this._promise.isResolved()) {
            return;
        }

        if(vow.isPromise(reason)) {
            reason = reason.then(function(val) {
                var defer = vow.defer();
                defer.reject(val);
                return defer.promise();
            });
            this._promise._resolve(reason);
        }
        else {
            this._promise._reject(reason);
        }
    },

    /**
     * Notifies the corresponding promise with the given `value`.
     *
     * @param {*} value
     *
     * @example
     * ```js
     * var defer = vow.defer(),
     *     promise = defer.promise();
     *
     * promise.progress(function(value) {
     *     // value is "'20%'", "'40%'" here
     * });
     *
     * defer.notify('20%');
     * defer.notify('40%');
     * ```
     */
    notify : function(value) {
        this._promise.isResolved() || this._promise._notify(value);
    }
};

var PROMISE_STATUS = {
    PENDING   : 0,
    RESOLVED  : 1,
    FULFILLED : 2,
    REJECTED  : 3
};

/**
 * @class Promise
 * @exports vow:Promise
 * @description
 * The `Promise` class is used when you want to give to the caller something to subscribe to,
 * but not the ability to resolve or reject the deferred.
 */

/**
 * @constructor
 * @param {Function} resolver See https://github.com/domenic/promises-unwrapping/blob/master/README.md#the-promise-constructor for details.
 * @description
 * You should use this constructor directly only if you are going to use `vow` as DOM Promises implementation.
 * In other case you should use `vow.defer()` and `defer.promise()` methods.
 * @example
 * ```js
 * function fetchJSON(url) {
 *     return new vow.Promise(function(resolve, reject, notify) {
 *         var xhr = new XMLHttpRequest();
 *         xhr.open('GET', url);
 *         xhr.responseType = 'json';
 *         xhr.send();
 *         xhr.onload = function() {
 *             if(xhr.response) {
 *                 resolve(xhr.response);
 *             }
 *             else {
 *                 reject(new TypeError());
 *             }
 *         };
 *     });
 * }
 * ```
 */
var Promise = function(resolver) {
    this._value = undef;
    this._status = PROMISE_STATUS.PENDING;

    this._fulfilledCallbacks = [];
    this._rejectedCallbacks = [];
    this._progressCallbacks = [];

    if(resolver) { // NOTE: see https://github.com/domenic/promises-unwrapping/blob/master/README.md
        var _this = this,
            resolverFnLen = resolver.length;

        resolver(
            function(val) {
                _this.isResolved() || _this._resolve(val);
            },
            resolverFnLen > 1?
                function(reason) {
                    _this.isResolved() || _this._reject(reason);
                } :
                undef,
            resolverFnLen > 2?
                function(val) {
                    _this.isResolved() || _this._notify(val);
                } :
                undef);
    }
};

Promise.prototype = /** @lends Promise.prototype */ {
    /**
     * Returns the value of the fulfilled promise or the reason in case of rejection.
     *
     * @returns {*}
     */
    valueOf : function() {
        return this._value;
    },

    /**
     * Returns `true` if the promise is resolved.
     *
     * @returns {Boolean}
     */
    isResolved : function() {
        return this._status !== PROMISE_STATUS.PENDING;
    },

    /**
     * Returns `true` if the promise is fulfilled.
     *
     * @returns {Boolean}
     */
    isFulfilled : function() {
        return this._status === PROMISE_STATUS.FULFILLED;
    },

    /**
     * Returns `true` if the promise is rejected.
     *
     * @returns {Boolean}
     */
    isRejected : function() {
        return this._status === PROMISE_STATUS.REJECTED;
    },

    /**
     * Adds reactions to the promise.
     *
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Function} [onProgress] Callback that will be invoked with a provided value after the promise has been notified
     * @param {Object} [ctx] Context of the callbacks execution
     * @returns {vow:Promise} A new promise, see https://github.com/promises-aplus/promises-spec for details
     */
    then : function(onFulfilled, onRejected, onProgress, ctx) {
        var defer = new Deferred();
        this._addCallbacks(defer, onFulfilled, onRejected, onProgress, ctx);
        return defer.promise();
    },

    /**
     * Adds only a rejection reaction. This method is a shorthand for `promise.then(undefined, onRejected)`.
     *
     * @param {Function} onRejected Callback that will be called with a provided 'reason' as argument after the promise has been rejected
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    'catch' : function(onRejected, ctx) {
        return this.then(undef, onRejected, ctx);
    },

    /**
     * Adds only a rejection reaction. This method is a shorthand for `promise.then(null, onRejected)`. It's also an alias for `catch`.
     *
     * @param {Function} onRejected Callback to be called with the value after promise has been rejected
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    fail : function(onRejected, ctx) {
        return this.then(undef, onRejected, ctx);
    },

    /**
     * Adds a resolving reaction (for both fulfillment and rejection).
     *
     * @param {Function} onResolved Callback that will be invoked with the promise as an argument, after the promise has been resolved.
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    always : function(onResolved, ctx) {
        var _this = this,
            cb = function() {
                return onResolved.call(this, _this);
            };

        return this.then(cb, cb, ctx);
    },

    /**
     * Adds a progress reaction.
     *
     * @param {Function} onProgress Callback that will be called with a provided value when the promise has been notified
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    progress : function(onProgress, ctx) {
        return this.then(undef, undef, onProgress, ctx);
    },

    /**
     * Like `promise.then`, but "spreads" the array into a variadic value handler.
     * It is useful with the `vow.all` and the `vow.allResolved` methods.
     *
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Object} [ctx] Context of the callbacks execution
     * @returns {vow:Promise}
     *
     * @example
     * ```js
     * var defer1 = vow.defer(),
     *     defer2 = vow.defer();
     *
     * vow.all([defer1.promise(), defer2.promise()]).spread(function(arg1, arg2) {
     *     // arg1 is "1", arg2 is "'two'" here
     * });
     *
     * defer1.resolve(1);
     * defer2.resolve('two');
     * ```
     */
    spread : function(onFulfilled, onRejected, ctx) {
        return this.then(
            function(val) {
                return onFulfilled.apply(this, val);
            },
            onRejected,
            ctx);
    },

    /**
     * Like `then`, but terminates a chain of promises.
     * If the promise has been rejected, this method throws it's "reason" as an exception in a future turn of the event loop.
     *
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Function} [onProgress] Callback that will be invoked with a provided value after the promise has been notified
     * @param {Object} [ctx] Context of the callbacks execution
     *
     * @example
     * ```js
     * var defer = vow.defer();
     * defer.reject(Error('Internal error'));
     * defer.promise().done(); // exception to be thrown
     * ```
     */
    done : function(onFulfilled, onRejected, onProgress, ctx) {
        this
            .then(onFulfilled, onRejected, onProgress, ctx)
            .fail(throwException);
    },

    /**
     * Returns a new promise that will be fulfilled in `delay` milliseconds if the promise is fulfilled,
     * or immediately rejected if the promise is rejected.
     *
     * @param {Number} delay
     * @returns {vow:Promise}
     */
    delay : function(delay) {
        var timer,
            promise = this.then(function(val) {
                var defer = new Deferred();
                timer = setTimeout(
                    function() {
                        defer.resolve(val);
                    },
                    delay);

                return defer.promise();
            });

        promise.always(function() {
            clearTimeout(timer);
        });

        return promise;
    },

    /**
     * Returns a new promise that will be rejected in `timeout` milliseconds
     * if the promise is not resolved beforehand.
     *
     * @param {Number} timeout
     * @returns {vow:Promise}
     *
     * @example
     * ```js
     * var defer = vow.defer(),
     *     promiseWithTimeout1 = defer.promise().timeout(50),
     *     promiseWithTimeout2 = defer.promise().timeout(200);
     *
     * setTimeout(
     *     function() {
     *         defer.resolve('ok');
     *     },
     *     100);
     *
     * promiseWithTimeout1.fail(function(reason) {
     *     // promiseWithTimeout to be rejected in 50ms
     * });
     *
     * promiseWithTimeout2.then(function(value) {
     *     // promiseWithTimeout to be fulfilled with "'ok'" value
     * });
     * ```
     */
    timeout : function(timeout) {
        var defer = new Deferred(),
            timer = setTimeout(
                function() {
                    defer.reject(new vow.TimedOutError('timed out'));
                },
                timeout);

        this.then(
            function(val) {
                defer.resolve(val);
            },
            function(reason) {
                defer.reject(reason);
            });

        defer.promise().always(function() {
            clearTimeout(timer);
        });

        return defer.promise();
    },

    _vow : true,

    _resolve : function(val) {
        if(this._status > PROMISE_STATUS.RESOLVED) {
            return;
        }

        if(val === this) {
            this._reject(TypeError('Can\'t resolve promise with itself'));
            return;
        }

        this._status = PROMISE_STATUS.RESOLVED;

        if(val && !!val._vow) { // shortpath for vow.Promise
            val.isFulfilled()?
                this._fulfill(val.valueOf()) :
                val.isRejected()?
                    this._reject(val.valueOf()) :
                    val.then(
                        this._fulfill,
                        this._reject,
                        this._notify,
                        this);
            return;
        }

        if(isObject(val) || isFunction(val)) {
            var then;
            try {
                then = val.then;
            }
            catch(e) {
                this._reject(e);
                return;
            }

            if(isFunction(then)) {
                var _this = this,
                    isResolved = false;

                try {
                    then.call(
                        val,
                        function(val) {
                            if(isResolved) {
                                return;
                            }

                            isResolved = true;
                            _this._resolve(val);
                        },
                        function(err) {
                            if(isResolved) {
                                return;
                            }

                            isResolved = true;
                            _this._reject(err);
                        },
                        function(val) {
                            _this._notify(val);
                        });
                }
                catch(e) {
                    isResolved || this._reject(e);
                }

                return;
            }
        }

        this._fulfill(val);
    },

    _fulfill : function(val) {
        if(this._status > PROMISE_STATUS.RESOLVED) {
            return;
        }

        this._status = PROMISE_STATUS.FULFILLED;
        this._value = val;

        this._callCallbacks(this._fulfilledCallbacks, val);
        this._fulfilledCallbacks = this._rejectedCallbacks = this._progressCallbacks = undef;
    },

    _reject : function(reason) {
        if(this._status > PROMISE_STATUS.RESOLVED) {
            return;
        }

        this._status = PROMISE_STATUS.REJECTED;
        this._value = reason;

        this._callCallbacks(this._rejectedCallbacks, reason);
        this._fulfilledCallbacks = this._rejectedCallbacks = this._progressCallbacks = undef;
    },

    _notify : function(val) {
        this._callCallbacks(this._progressCallbacks, val);
    },

    _addCallbacks : function(defer, onFulfilled, onRejected, onProgress, ctx) {
        if(onRejected && !isFunction(onRejected)) {
            ctx = onRejected;
            onRejected = undef;
        }
        else if(onProgress && !isFunction(onProgress)) {
            ctx = onProgress;
            onProgress = undef;
        }

        var cb;

        if(!this.isRejected()) {
            cb = { defer : defer, fn : isFunction(onFulfilled)? onFulfilled : undef, ctx : ctx };
            this.isFulfilled()?
                this._callCallbacks([cb], this._value) :
                this._fulfilledCallbacks.push(cb);
        }

        if(!this.isFulfilled()) {
            cb = { defer : defer, fn : onRejected, ctx : ctx };
            this.isRejected()?
                this._callCallbacks([cb], this._value) :
                this._rejectedCallbacks.push(cb);
        }

        if(this._status <= PROMISE_STATUS.RESOLVED) {
            this._progressCallbacks.push({ defer : defer, fn : onProgress, ctx : ctx });
        }
    },

    _callCallbacks : function(callbacks, arg) {
        var len = callbacks.length;
        if(!len) {
            return;
        }

        var isResolved = this.isResolved(),
            isFulfilled = this.isFulfilled(),
            isRejected = this.isRejected();

        nextTick(function() {
            var i = 0, cb, defer, fn;
            while(i < len) {
                cb = callbacks[i++];
                defer = cb.defer;
                fn = cb.fn;

                if(fn) {
                    var ctx = cb.ctx,
                        res;
                    try {
                        res = ctx? fn.call(ctx, arg) : fn(arg);
                    }
                    catch(e) {
                        defer.reject(e);
                        continue;
                    }

                    isResolved?
                        defer.resolve(res) :
                        defer.notify(res);
                }
                else if(isFulfilled) {
                    defer.resolve(arg);
                }
                else if(isRejected) {
                    defer.reject(arg);
                }
                else {
                    defer.notify(arg);
                }
            }
        });
    }
};

/** @lends Promise */
var staticMethods = {
    /**
     * Coerces the given `value` to a promise, or returns the `value` if it's already a promise.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    cast : function(value) {
        return vow.cast(value);
    },

    /**
     * Returns a promise, that will be fulfilled only after all the items in `iterable` are fulfilled.
     * If any of the `iterable` items gets rejected, then the returned promise will be rejected.
     *
     * @param {Array|Object} iterable
     * @returns {vow:Promise}
     */
    all : function(iterable) {
        return vow.all(iterable);
    },

    /**
     * Returns a promise, that will be fulfilled only when any of the items in `iterable` are fulfilled.
     * If any of the `iterable` items gets rejected, then the returned promise will be rejected.
     *
     * @param {Array} iterable
     * @returns {vow:Promise}
     */
    race : function(iterable) {
        return vow.anyResolved(iterable);
    },

    /**
     * Returns a promise that has already been resolved with the given `value`.
     * If `value` is a promise, the returned promise will have `value`'s state.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    resolve : function(value) {
        return vow.resolve(value);
    },

    /**
     * Returns a promise that has already been rejected with the given `reason`.
     *
     * @param {*} reason
     * @returns {vow:Promise}
     */
    reject : function(reason) {
        return vow.reject(reason);
    }
};

for(var prop in staticMethods) {
    staticMethods.hasOwnProperty(prop) &&
        (Promise[prop] = staticMethods[prop]);
}

var vow = /** @exports vow */ {
    Deferred : Deferred,

    Promise : Promise,

    /**
     * Creates a new deferred. This method is a factory method for `vow:Deferred` class.
     * It's equivalent to `new vow.Deferred()`.
     *
     * @returns {vow:Deferred}
     */
    defer : function() {
        return new Deferred();
    },

    /**
     * Static equivalent to `promise.then`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Function} [onProgress] Callback that will be invoked with a provided value after the promise has been notified
     * @param {Object} [ctx] Context of the callbacks execution
     * @returns {vow:Promise}
     */
    when : function(value, onFulfilled, onRejected, onProgress, ctx) {
        return vow.cast(value).then(onFulfilled, onRejected, onProgress, ctx);
    },

    /**
     * Static equivalent to `promise.fail`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} onRejected Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    fail : function(value, onRejected, ctx) {
        return vow.when(value, undef, onRejected, ctx);
    },

    /**
     * Static equivalent to `promise.always`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} onResolved Callback that will be invoked with the promise as an argument, after the promise has been resolved.
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    always : function(value, onResolved, ctx) {
        return vow.when(value).always(onResolved, ctx);
    },

    /**
     * Static equivalent to `promise.progress`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} onProgress Callback that will be invoked with a provided value after the promise has been notified
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    progress : function(value, onProgress, ctx) {
        return vow.when(value).progress(onProgress, ctx);
    },

    /**
     * Static equivalent to `promise.spread`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Object} [ctx] Context of the callbacks execution
     * @returns {vow:Promise}
     */
    spread : function(value, onFulfilled, onRejected, ctx) {
        return vow.when(value).spread(onFulfilled, onRejected, ctx);
    },

    /**
     * Static equivalent to `promise.done`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Function} [onProgress] Callback that will be invoked with a provided value after the promise has been notified
     * @param {Object} [ctx] Context of the callbacks execution
     */
    done : function(value, onFulfilled, onRejected, onProgress, ctx) {
        vow.when(value).done(onFulfilled, onRejected, onProgress, ctx);
    },

    /**
     * Checks whether the given `value` is a promise-like object
     *
     * @param {*} value
     * @returns {Boolean}
     *
     * @example
     * ```js
     * vow.isPromise('something'); // returns false
     * vow.isPromise(vow.defer().promise()); // returns true
     * vow.isPromise({ then : function() { }); // returns true
     * ```
     */
    isPromise : function(value) {
        return isObject(value) && isFunction(value.then);
    },

    /**
     * Coerces the given `value` to a promise, or returns the `value` if it's already a promise.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    cast : function(value) {
        return value && !!value._vow?
            value :
            vow.resolve(value);
    },

    /**
     * Static equivalent to `promise.valueOf`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @returns {*}
     */
    valueOf : function(value) {
        return value && isFunction(value.valueOf)? value.valueOf() : value;
    },

    /**
     * Static equivalent to `promise.isFulfilled`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @returns {Boolean}
     */
    isFulfilled : function(value) {
        return value && isFunction(value.isFulfilled)? value.isFulfilled() : true;
    },

    /**
     * Static equivalent to `promise.isRejected`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @returns {Boolean}
     */
    isRejected : function(value) {
        return value && isFunction(value.isRejected)? value.isRejected() : false;
    },

    /**
     * Static equivalent to `promise.isResolved`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @returns {Boolean}
     */
    isResolved : function(value) {
        return value && isFunction(value.isResolved)? value.isResolved() : true;
    },

    /**
     * Returns a promise that has already been resolved with the given `value`.
     * If `value` is a promise, the returned promise will have `value`'s state.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    resolve : function(value) {
        var res = vow.defer();
        res.resolve(value);
        return res.promise();
    },

    /**
     * Returns a promise that has already been fulfilled with the given `value`.
     * If `value` is a promise, the returned promise will be fulfilled with the fulfill/rejection value of `value`.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    fulfill : function(value) {
        var defer = vow.defer(),
            promise = defer.promise();

        defer.resolve(value);

        return promise.isFulfilled()?
            promise :
            promise.then(null, function(reason) {
                return reason;
            });
    },

    /**
     * Returns a promise that has already been rejected with the given `reason`.
     * If `reason` is a promise, the returned promise will be rejected with the fulfill/rejection value of `reason`.
     *
     * @param {*} reason
     * @returns {vow:Promise}
     */
    reject : function(reason) {
        var defer = vow.defer();
        defer.reject(reason);
        return defer.promise();
    },

    /**
     * Invokes the given function `fn` with arguments `args`
     *
     * @param {Function} fn
     * @param {...*} [args]
     * @returns {vow:Promise}
     *
     * @example
     * ```js
     * var promise1 = vow.invoke(function(value) {
     *         return value;
     *     }, 'ok'),
     *     promise2 = vow.invoke(function() {
     *         throw Error();
     *     });
     *
     * promise1.isFulfilled(); // true
     * promise1.valueOf(); // 'ok'
     * promise2.isRejected(); // true
     * promise2.valueOf(); // instance of Error
     * ```
     */
    invoke : function(fn, args) {
        var len = Math.max(arguments.length - 1, 0),
            callArgs;
        if(len) { // optimization for V8
            callArgs = Array(len);
            var i = 0;
            while(i < len) {
                callArgs[i++] = arguments[i];
            }
        }

        try {
            return vow.resolve(callArgs?
                fn.apply(global, callArgs) :
                fn.call(global));
        }
        catch(e) {
            return vow.reject(e);
        }
    },

    /**
     * Returns a promise, that will be fulfilled only after all the items in `iterable` are fulfilled.
     * If any of the `iterable` items gets rejected, the promise will be rejected.
     *
     * @param {Array|Object} iterable
     * @returns {vow:Promise}
     *
     * @example
     * with array:
     * ```js
     * var defer1 = vow.defer(),
     *     defer2 = vow.defer();
     *
     * vow.all([defer1.promise(), defer2.promise(), 3])
     *     .then(function(value) {
     *          // value is "[1, 2, 3]" here
     *     });
     *
     * defer1.resolve(1);
     * defer2.resolve(2);
     * ```
     *
     * @example
     * with object:
     * ```js
     * var defer1 = vow.defer(),
     *     defer2 = vow.defer();
     *
     * vow.all({ p1 : defer1.promise(), p2 : defer2.promise(), p3 : 3 })
     *     .then(function(value) {
     *          // value is "{ p1 : 1, p2 : 2, p3 : 3 }" here
     *     });
     *
     * defer1.resolve(1);
     * defer2.resolve(2);
     * ```
     */
    all : function(iterable) {
        var defer = new Deferred(),
            isPromisesArray = isArray(iterable),
            keys = isPromisesArray?
                getArrayKeys(iterable) :
                getObjectKeys(iterable),
            len = keys.length,
            res = isPromisesArray? [] : {};

        if(!len) {
            defer.resolve(res);
            return defer.promise();
        }

        var i = len;
        vow._forEach(
            iterable,
            function(value, idx) {
                res[keys[idx]] = value;
                if(!--i) {
                    defer.resolve(res);
                }
            },
            defer.reject,
            defer.notify,
            defer,
            keys);

        return defer.promise();
    },

    /**
     * Returns a promise, that will be fulfilled only after all the items in `iterable` are resolved.
     *
     * @param {Array|Object} iterable
     * @returns {vow:Promise}
     *
     * @example
     * ```js
     * var defer1 = vow.defer(),
     *     defer2 = vow.defer();
     *
     * vow.allResolved([defer1.promise(), defer2.promise()]).spread(function(promise1, promise2) {
     *     promise1.isRejected(); // returns true
     *     promise1.valueOf(); // returns "'error'"
     *     promise2.isFulfilled(); // returns true
     *     promise2.valueOf(); // returns "'ok'"
     * });
     *
     * defer1.reject('error');
     * defer2.resolve('ok');
     * ```
     */
    allResolved : function(iterable) {
        var defer = new Deferred(),
            isPromisesArray = isArray(iterable),
            keys = isPromisesArray?
                getArrayKeys(iterable) :
                getObjectKeys(iterable),
            i = keys.length,
            res = isPromisesArray? [] : {};

        if(!i) {
            defer.resolve(res);
            return defer.promise();
        }

        var onResolved = function() {
                --i || defer.resolve(iterable);
            };

        vow._forEach(
            iterable,
            onResolved,
            onResolved,
            defer.notify,
            defer,
            keys);

        return defer.promise();
    },

    allPatiently : function(iterable) {
        return vow.allResolved(iterable).then(function() {
            var isPromisesArray = isArray(iterable),
                keys = isPromisesArray?
                    getArrayKeys(iterable) :
                    getObjectKeys(iterable),
                rejectedPromises, fulfilledPromises,
                len = keys.length, i = 0, key, promise;

            if(!len) {
                return isPromisesArray? [] : {};
            }

            while(i < len) {
                key = keys[i++];
                promise = iterable[key];
                if(vow.isRejected(promise)) {
                    rejectedPromises || (rejectedPromises = isPromisesArray? [] : {});
                    isPromisesArray?
                        rejectedPromises.push(promise.valueOf()) :
                        rejectedPromises[key] = promise.valueOf();
                }
                else if(!rejectedPromises) {
                    (fulfilledPromises || (fulfilledPromises = isPromisesArray? [] : {}))[key] = vow.valueOf(promise);
                }
            }

            if(rejectedPromises) {
                throw rejectedPromises;
            }

            return fulfilledPromises;
        });
    },

    /**
     * Returns a promise, that will be fulfilled if any of the items in `iterable` is fulfilled.
     * If all of the `iterable` items get rejected, the promise will be rejected (with the reason of the first rejected item).
     *
     * @param {Array} iterable
     * @returns {vow:Promise}
     */
    any : function(iterable) {
        var defer = new Deferred(),
            len = iterable.length;

        if(!len) {
            defer.reject(Error());
            return defer.promise();
        }

        var i = 0, reason;
        vow._forEach(
            iterable,
            defer.resolve,
            function(e) {
                i || (reason = e);
                ++i === len && defer.reject(reason);
            },
            defer.notify,
            defer);

        return defer.promise();
    },

    /**
     * Returns a promise, that will be fulfilled only when any of the items in `iterable` is fulfilled.
     * If any of the `iterable` items gets rejected, the promise will be rejected.
     *
     * @param {Array} iterable
     * @returns {vow:Promise}
     */
    anyResolved : function(iterable) {
        var defer = new Deferred(),
            len = iterable.length;

        if(!len) {
            defer.reject(Error());
            return defer.promise();
        }

        vow._forEach(
            iterable,
            defer.resolve,
            defer.reject,
            defer.notify,
            defer);

        return defer.promise();
    },

    /**
     * Static equivalent to `promise.delay`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Number} delay
     * @returns {vow:Promise}
     */
    delay : function(value, delay) {
        return vow.resolve(value).delay(delay);
    },

    /**
     * Static equivalent to `promise.timeout`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Number} timeout
     * @returns {vow:Promise}
     */
    timeout : function(value, timeout) {
        return vow.resolve(value).timeout(timeout);
    },

    _forEach : function(promises, onFulfilled, onRejected, onProgress, ctx, keys) {
        var len = keys? keys.length : promises.length,
            i = 0;

        while(i < len) {
            vow.when(
                promises[keys? keys[i] : i],
                wrapOnFulfilled(onFulfilled, i),
                onRejected,
                onProgress,
                ctx);
            ++i;
        }
    },

    TimedOutError : defineCustomErrorType('TimedOut')
};

var defineAsGlobal = true;
if(typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = vow;
    defineAsGlobal = false;
}

if(typeof modules === 'object' && isFunction(modules.define)) {
    modules.define('vow', function(provide) {
        provide(vow);
    });
    defineAsGlobal = false;
}

if(typeof define === 'function') {
    define(function(require, exports, module) {
        module.exports = vow;
    });
    defineAsGlobal = false;
}

defineAsGlobal && (global.vow = vow);

})(typeof window !== 'undefined'? window : global);

/* end: ../../common.blocks/vow/vow.vanilla.js */
/* begin: ../../desktop.blocks/jquery/__event/_type/jquery__event_type_winresize.js */
/**
 * @module jquery
 */

modules.define('jquery', ['ua'], function(provide, ua, $) {

// IE8 and below, https://msdn.microsoft.com/en-us/library/ie/ms536959%28v=vs.85%29.aspx
if(ua.msie && document.documentMode < 9) {
    var win = window,
        $win = $(window),
        winWidth = $win.width(),
        winHeight = $win.height();

    ($.event.special.resize || ($.event.special.resize = {})).preDispatch = function(e) {
        if(e.target === win) {
            var curWinWidth = $win.width(),
                curWinHeight = $win.height();

            if(curWinWidth === winWidth && curWinHeight === winHeight) {
                return false;
            } else {
                winWidth = curWinWidth;
                winHeight = curWinHeight;
            }
        }
    };
}

provide($);

});

/* end: ../../desktop.blocks/jquery/__event/_type/jquery__event_type_winresize.js */
/* begin: ../../common.blocks/loader/_type/loader_type_js.js */
/**
 * @module loader_type_js
 * @description Load JS from external URL.
 */

modules.define('loader_type_js', function(provide) {

var loading = {},
    loaded = {},
    head = document.getElementsByTagName('head')[0],
    runCallbacks = function(path, type) {
        var cbs = loading[path], cb, i = 0;
        delete loading[path];
        while(cb = cbs[i++]) {
            cb[type] && cb[type]();
        }
    },
    onSuccess = function(path) {
        loaded[path] = true;
        runCallbacks(path, 'success');
    },
    onError = function(path) {
        runCallbacks(path, 'error');
    };

provide(
    /**
     * @exports
     * @param {String} path resource link
     * @param {Function} [success] to be called if the script succeeds
     * @param {Function} [error] to be called if the script fails
     */
    function(path, success, error) {
        if(loaded[path]) {
            success && success();
            return;
        }

        if(loading[path]) {
            loading[path].push({ success : success, error : error });
            return;
        }

        loading[path] = [{ success : success, error : error }];

        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.charset = 'utf-8';
        script.src = (location.protocol === 'file:' && !path.indexOf('//')? 'http:' : '') + path;

        if('onload' in script) {
            script.onload = function() {
                script.onload = script.onerror = null;
                onSuccess(path);
            };

            script.onerror = function() {
                script.onload = script.onerror = null;
                onError(path);
            };
        } else {
            script.onreadystatechange = function() {
                var readyState = this.readyState;
                if(readyState === 'loaded' || readyState === 'complete') {
                    script.onreadystatechange = null;
                    onSuccess(path);
                }
            };
        }

        head.insertBefore(script, head.lastChild);
    }
);

});

/* end: ../../common.blocks/loader/_type/loader_type_js.js */
/* begin: ../../common.blocks/events/__observable/_type/events__observable_type_bem-dom.js */
/**
 * @module events__observable
 */

modules.define(
    'events__observable',
    ['i-bem-dom'],
    function(provide, bemDom, observable) {

provide(
    /**
     * Creates new observable
     * @exports
     * @param {i-bem-dom:Block|i-bem-dom:Elem|events:Emitter} bemEntity
     * @returns {Observable}
     */
    function(bemEntity) {
        return observable(bemDom.isEntity(bemEntity)?
            bemEntity._events() :
            bemEntity);
    }
);

});

/* end: ../../common.blocks/events/__observable/_type/events__observable_type_bem-dom.js */
/* begin: ../../common.blocks/i-bem-dom/__events/_type/i-bem-dom__events_type_dom.js */
/**
 * @module i-bem-dom__events_type_dom
 */
modules.define(
    'i-bem-dom__events_type_dom',
    [
        'i-bem-dom__events',
        'inherit',
        'jquery'
    ],
    function(
        provide,
        bemDomEvents,
        inherit,
        $) {

var eventBuilder = function(e) {
        return e;
    },
    /**
     * @class EventManagerFactory
     * @augments i-bem-dom__events:EventManagerFactory
     * @exports i-bem-dom__events_type_dom:EventManagerFactory
     */
    EventManagerFactory = inherit(bemDomEvents.EventManagerFactory,/** @lends EventManagerFactory.prototype */{
        /** @override */
        _createEventManager : function(ctx, params, isInstance) {
            function wrapperFn(fn) {
                return function(e) {
                    var instance;

                    if(isInstance) {
                        instance = ctx;
                    } else {
                        // TODO: we could optimize all these "closest" to a single traversing
                        var entityDomNode = $(e.target).closest(params.ctxSelector);
                        entityDomNode.length && (instance = entityDomNode.bem(ctx));
                    }

                    if(instance) {
                        params.bindEntityCls && (e.bemTarget = $(this).bem(params.bindEntityCls));
                        fn.call(instance, e);
                    }
                };
            }

            return new this._eventManagerCls(params, wrapperFn, eventBuilder);
        }
    });

provide({ EventManagerFactory : EventManagerFactory });

});

/* end: ../../common.blocks/i-bem-dom/__events/_type/i-bem-dom__events_type_dom.js */
/* begin: ../../common.blocks/jquery/__event/_type/jquery__event_type_pointerpressrelease.js */
modules.define('jquery', function(provide, $) {

$.each({
    pointerpress : 'pointerdown',
    pointerrelease : 'pointerup pointercancel'
}, function(fix, origEvent) {
    function eventHandler(e) {
        if(e.which === 1) {
            var fixedEvent = cloneEvent(e);
            fixedEvent.type = fix;
            fixedEvent.originalEvent = e;
            return $.event.dispatch.call(this, fixedEvent);
        }
    }

    $.event.special[fix] = {
        setup : function() {
            $(this).on(origEvent, eventHandler);
            return false;
        },
        teardown : function() {
            $(this).off(origEvent, eventHandler);
            return false;
        }
    };
});

function cloneEvent(event) {
    var eventCopy = $.extend(new $.Event(), event);
    if(event.preventDefault) {
        eventCopy.preventDefault = function() {
            event.preventDefault();
        };
    }
    return eventCopy;
}

provide($);

});

/* end: ../../common.blocks/jquery/__event/_type/jquery__event_type_pointerpressrelease.js */


(function (global) {
    var __i18n__ = ((function () {
            var data;

            /**
             * @exports
             * @param {String} keyset
             * @param {String} key
             * @param {Object} [params]
             * @returns {String}
             */
            function i18n(keyset, key, params) {
                if(!data) throw Error('i18n need to be filled with data');
                var val = data[keyset] && data[keyset][key];
                return typeof val === 'undefined'?
                keyset + ':' + key :
                    typeof val === 'string'?
                        val :
                        val.call(i18n, params, i18n);
            }

            i18n.decl = function(i18nData) {
                if(!data) {
                    data = i18nData;
                    return this;
                }

                for(var ks in i18nData) {
                    var dataKs = data[ks] || (data[ks] = {}),
                        i18nDataKs = i18nData[ks];

                    for(var k in i18nDataKs)
                        dataKs[k] = i18nDataKs[k];
                }

                return this;
            };

            return i18n;
        })()).decl({}),
        defineAsGlobal = true;


    // YModules
    if (typeof modules === "object") {
        modules.define("i18n", function (provide) {
            provide(__i18n__);
        });

    }

    if (defineAsGlobal) {

        (global.BEM || (global.BEM = {})).I18N = __i18n__;
    }
})(typeof window !== "undefined" ? window : global);
var BEMHTML;

(function(global) {
    function buildBemXjst(__bem_xjst_libs__) {
        var exports = {};

        /// -------------------------------------
/// --------- BEM-XJST Runtime Start ----
/// -------------------------------------
var BEMHTML = function(module, exports) {
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.bemhtml = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var inherits = require('inherits');
var Match = require('../bemxjst/match').Match;
var BemxjstEntity = require('../bemxjst/entity').Entity;

/**
 * @class Entity
 * @param {BEMXJST} bemxjst
 * @param {String} block
 * @param {String} elem
 * @param {Array} templates
 */
function Entity(bemxjst) {
  this.bemxjst = bemxjst;

  this.jsClass = null;

  // "Fast modes"
  this.tag = new Match(this, 'tag');
  this.attrs = new Match(this, 'attrs');
  this.js = new Match(this, 'js');
  this.mix = new Match(this, 'mix');
  this.bem = new Match(this, 'bem');
  this.cls = new Match(this, 'cls');

  BemxjstEntity.apply(this, arguments);
}

inherits(Entity, BemxjstEntity);
exports.Entity = Entity;

Entity.prototype.init = function init(block, elem) {
  this.block = block;
  this.elem = elem;

  // Class for jsParams
  this.jsClass = this.bemxjst.classBuilder.build(this.block, this.elem);
};

Entity.prototype._initRest = function _initRest(key) {
  if (key === 'default') {
    this.rest[key] = this.def;
  } else if (key === 'tag' ||
    key === 'attrs' ||
    key === 'js' ||
    key === 'mix' ||
    key === 'bem' ||
    key === 'cls' ||
    key === 'content') {
    this.rest[key] = this[key];
  } else {
    if (!this.rest.hasOwnProperty(key))
      this.rest[key] = new Match(this, key);
  }
};

Entity.prototype.defaultBody = function defaultBody(context) {
  var tag = this.tag.exec(context);
  var js = this.js.exec(context);
  var bem = this.bem.exec(context);
  var cls = this.cls.exec(context);
  var mix = this.mix.exec(context);
  var attrs = this.attrs.exec(context);
  var content = this.content.exec(context);

  return this.bemxjst.render(context,
                             this,
                             tag,
                             js,
                             bem,
                             cls,
                             mix,
                             attrs,
                             content);
};

},{"../bemxjst/entity":5,"../bemxjst/match":8,"inherits":11}],2:[function(require,module,exports){
var inherits = require('inherits');
var utils = require('../bemxjst/utils');
var Entity = require('./entity').Entity;
var BEMXJST = require('../bemxjst');

function BEMHTML(options) {
  BEMXJST.apply(this, arguments);

  var xhtml = typeof options.xhtml === 'undefined' ? false : options.xhtml;
  this._shortTagCloser = xhtml ? '/>' : '>';

  this._elemJsInstances = options.elemJsInstances;
}

inherits(BEMHTML, BEMXJST);
module.exports = BEMHTML;

BEMHTML.prototype.Entity = Entity;

BEMHTML.prototype.runMany = function runMany(arr) {
  var out = '';
  var context = this.context;
  var prevPos = context.position;
  var prevNotNewList = context._notNewList;

  if (prevNotNewList) {
    context._listLength += arr.length - 1;
  } else {
    context.position = 0;
    context._listLength = arr.length;
  }
  context._notNewList = true;

  if (this.canFlush) {
    for (var i = 0; i < arr.length; i++)
      out += context._flush(this._run(arr[i]));
  } else {
    for (var i = 0; i < arr.length; i++)
      out += this._run(arr[i]);
  }

  if (!prevNotNewList)
    context.position = prevPos;

  return out;
};

BEMHTML.prototype.render = function render(context,
                                           entity,
                                           tag,
                                           js,
                                           bem,
                                           cls,
                                           mix,
                                           attrs,
                                           content) {
  var ctx = context.ctx;

  if (tag === undefined)
    tag = 'div';

  if (!tag)
    return this.renderNoTag(context, js, bem, cls, mix, attrs, content);

  var out = '<' + tag;

  if (js === true)
    js = {};

  var jsParams;
  if (js) {
    jsParams = {};
    jsParams[entity.jsClass] = js;
  }

  var isBEM = bem;
  if (isBEM === undefined) {
    if (ctx.bem === undefined)
      isBEM = entity.block || entity.elem;
    else
      isBEM = ctx.bem;
  }
  isBEM = !!isBEM;

  if (cls === undefined)
    cls = ctx.cls;

  var addJSInitClass = jsParams && (
    this._elemJsInstances ?
      (entity.block || entity.elem) :
      (entity.block && !entity.elem)
  );

  if (!isBEM && !cls) {
    return this.renderClose(out, context, tag, attrs, isBEM, ctx, content);
  }

  out += ' class="';
  if (isBEM) {
    var mods = entity.elem ? context.elemMods : context.mods;

    out += entity.jsClass;
    out += this.buildModsClasses(entity.block, entity.elem, mods);

    if (mix) {
      var m = this.renderMix(entity, mix, jsParams, addJSInitClass);
      out += m.out;
      jsParams = m.jsParams;
      addJSInitClass = m.addJSInitClass;
    }

    if (cls)
      out += ' ' + (typeof cls === 'string' ?
                    utils.attrEscape(cls).trim() : cls);
  } else {
    if (cls)
      out += cls.trim ? utils.attrEscape(cls).trim() : cls;
  }

  if (addJSInitClass)
    out += ' i-bem"';
  else
    out += '"';

  if (isBEM && jsParams)
    out += ' data-bem=\'' + utils.jsAttrEscape(JSON.stringify(jsParams)) + '\'';

  return this.renderClose(out, context, tag, attrs, isBEM, ctx, content);
};

BEMHTML.prototype.renderClose = function renderClose(prefix,
                                                     context,
                                                     tag,
                                                     attrs,
                                                     isBEM,
                                                     ctx,
                                                     content) {
  var out = prefix;

  out += this.renderAttrs(attrs);

  if (utils.isShortTag(tag)) {
    out += this._shortTagCloser;
    if (this.canFlush)
      out = context._flush(out);
  } else {
    out += '>';
    if (this.canFlush)
      out = context._flush(out);

    // TODO(indutny): skip apply next flags
    if (content || content === 0)
      out += this.renderContent(content, isBEM);

    out += '</' + tag + '>';
  }

  if (this.canFlush)
    out = context._flush(out);
  return out;
};

BEMHTML.prototype.renderAttrs = function renderAttrs(attrs) {
  var out = '';

  // NOTE: maybe we need to make an array for quicker serialization
  if (utils.isObj(attrs)) {

    /* jshint forin : false */
    for (var name in attrs) {
      var attr = attrs[name];
      if (attr === undefined || attr === false || attr === null)
        continue;

      if (attr === true)
        out += ' ' + name;
      else
        out += ' ' + name + '="' +
          utils.attrEscape(utils.isSimple(attr) ?
                           attr :
                           this.context.reapply(attr)) +
                           '"';
    }
  }

  return out;
};

BEMHTML.prototype.renderMix = function renderMix(entity,
                                                 mix,
                                                 jsParams,
                                                 addJSInitClass) {
  var visited = {};
  var context = this.context;
  var js = jsParams;
  var addInit = addJSInitClass;

  visited[entity.jsClass] = true;

  // Transform mix to the single-item array if it's not array
  if (!Array.isArray(mix))
    mix = [ mix ];

  var classBuilder = this.classBuilder;

  var out = '';
  for (var i = 0; i < mix.length; i++) {
    var item = mix[i];
    if (!item)
      continue;
    if (typeof item === 'string')
      item = { block: item, elem: undefined };

    var hasItem = false;

    if (item.elem) {
      hasItem = item.elem !== entity.elem && item.elem !== context.elem ||
        item.block && item.block !== entity.block;
    } else if (item.block) {
      hasItem = !(item.block === entity.block && item.mods) ||
        item.mods && entity.elem;
    }

    var block = item.block || item._block || context.block;
    var elem = item.elem || item._elem || context.elem;
    var key = classBuilder.build(block, elem);

    var classElem = item.elem ||
                    item._elem ||
                    (item.block ? undefined : context.elem);
    if (hasItem)
      out += ' ' + classBuilder.build(block, classElem);

    out += this.buildModsClasses(block, classElem,
      (item.elem || !item.block && (item._elem || context.elem)) ?
        item.elemMods : item.mods);

    if (item.js) {
      if (!js)
        js = {};

      js[classBuilder.build(block, item.elem)] =
          item.js === true ? {} : item.js;
      if (!addInit)
        addInit = block && !item.elem;
    }

    // Process nested mixes
    if (!hasItem || visited[key])
      continue;

    visited[key] = true;
    var nestedEntity = this.entities[key];
    if (!nestedEntity)
      continue;

    var oldBlock = context.block;
    var oldElem = context.elem;
    var nestedMix = nestedEntity.mix.exec(context);
    context.elem = oldElem;
    context.block = oldBlock;

    if (!nestedMix)
      continue;

    for (var j = 0; j < nestedMix.length; j++) {
      var nestedItem = nestedMix[j];
      if (!nestedItem) continue;

      if (!nestedItem.block &&
          !nestedItem.elem ||
          !visited[classBuilder.build(nestedItem.block, nestedItem.elem)]) {
        if (nestedItem.block) continue;

        nestedItem._block = block;
        nestedItem._elem = elem;
        mix = mix.slice(0, i + 1).concat(
          nestedItem,
          mix.slice(i + 1)
        );
      }
    }
  }

  return {
    out: out,
    jsParams: js,
    addJSInitClass: addInit
  };
};

BEMHTML.prototype.buildModsClasses = function buildModsClasses(block,
                                                               elem,
                                                               mods) {
  if (!mods)
    return '';

  var res = '';

  var modName;

  /*jshint -W089 */
  for (modName in mods) {
    if (!mods.hasOwnProperty(modName) || modName === '')
      continue;

    var modVal = mods[modName];
    if (!modVal && modVal !== 0) continue;
    if (typeof modVal !== 'boolean')
      modVal += '';

    var builder = this.classBuilder;
    res += ' ' + (elem ?
                  builder.buildElemClass(block, elem, modName, modVal) :
                  builder.buildBlockClass(block, modName, modVal));
  }

  return res;
};

BEMHTML.prototype.renderNoTag = function renderNoTag(context,
                                                     js,
                                                     bem,
                                                     cls,
                                                     mix,
                                                     attrs,
                                                     content) {

  // TODO(indutny): skip apply next flags
  if (content || content === 0)
    return this._run(content);
  return '';
};

},{"../bemxjst":7,"../bemxjst/utils":10,"./entity":1,"inherits":11}],3:[function(require,module,exports){
function ClassBuilder(options) {
  this.modDelim = options.mod || '_';
  this.elemDelim = options.elem || '__';
}
exports.ClassBuilder = ClassBuilder;

ClassBuilder.prototype.build = function build(block, elem) {
  if (!elem)
    return block;
  else
    return block + this.elemDelim + elem;
};

ClassBuilder.prototype.buildModPostfix = function buildModPostfix(modName,
                                                                  modVal) {
  var res = this.modDelim + modName;
  if (modVal !== true) res += this.modDelim + modVal;
  return res;
};

ClassBuilder.prototype.buildBlockClass = function buildBlockClass(name,
                                                                  modName,
                                                                  modVal) {
  var res = name;
  if (modVal) res += this.buildModPostfix(modName, modVal);
  return res;
};

ClassBuilder.prototype.buildElemClass = function buildElemClass(block,
                                                                name,
                                                                modName,
                                                                modVal) {
  var res = this.buildBlockClass(block) + this.elemDelim + name;
  if (modVal) res += this.buildModPostfix(modName, modVal);
  return res;
};

ClassBuilder.prototype.split = function split(key) {
  return key.split(this.elemDelim, 2);
};

},{}],4:[function(require,module,exports){
var utils = require('./utils');

function Context(bemxjst) {
  this._bemxjst = bemxjst;

  this.ctx = null;
  this.block = '';

  // Save current block until the next BEM entity
  this._currBlock = '';

  this.elem = null;
  this.mods = {};
  this.elemMods = {};

  this.position = 0;
  this._listLength = 0;
  this._notNewList = false;

  // (miripiruni) this will be changed in next major release
  this.escapeContent = bemxjst.options.escapeContent !== false;

  // Used in `OnceMatch` check to detect context change
  this._onceRef = {};
}
exports.Context = Context;

Context.prototype._flush = null;

Context.prototype.isSimple = utils.isSimple;

Context.prototype.isShortTag = utils.isShortTag;
Context.prototype.extend = utils.extend;
Context.prototype.identify = utils.identify;

Context.prototype.xmlEscape = utils.xmlEscape;
Context.prototype.attrEscape = utils.attrEscape;
Context.prototype.jsAttrEscape = utils.jsAttrEscape;

Context.prototype.isFirst = function isFirst() {
  return this.position === 1;
};

Context.prototype.isLast = function isLast() {
  return this.position === this._listLength;
};

Context.prototype.generateId = function generateId() {
  return utils.identify(this.ctx);
};

Context.prototype.reapply = function reapply(ctx) {
  return this._bemxjst.run(ctx);
};

},{"./utils":10}],5:[function(require,module,exports){
var utils = require('./utils');
var Match = require('./match').Match;
var tree = require('./tree');
var Template = tree.Template;
var PropertyMatch = tree.PropertyMatch;
var CompilerOptions = tree.CompilerOptions;

function Entity(bemxjst, block, elem, templates) {
  this.bemxjst = bemxjst;

  this.block = null;
  this.elem = null;

  // Compiler options via `xjstOptions()`
  this.options = {};

  // `true` if entity has just a default renderer for `def()` mode
  this.canFlush = true;

  // "Fast modes"
  this.def = new Match(this);
  this.content = new Match(this, 'content');

  // "Slow modes"
  this.rest = {};

  // Initialize
  this.init(block, elem);
  this.initModes(templates);
}
exports.Entity = Entity;

Entity.prototype.init = function init(block, elem) {
  this.block = block;
  this.elem = elem;
};

function contentMode() {
  return this.ctx.content;
}

Entity.prototype.initModes = function initModes(templates) {
  /* jshint maxdepth : false */
  for (var i = 0; i < templates.length; i++) {
    var template = templates[i];

    for (var j = template.predicates.length - 1; j >= 0; j--) {
      var pred = template.predicates[j];
      if (!(pred instanceof PropertyMatch))
        continue;

      if (pred.key !== '_mode')
        continue;

      template.predicates.splice(j, 1);
      this._initRest(pred.value);

      // All templates should go there anyway
      this.rest[pred.value].push(template);
      break;
    }

    if (j === -1)
      this.def.push(template);

    // Merge compiler options
    for (var j = template.predicates.length - 1; j >= 0; j--) {
      var pred = template.predicates[j];
      if (!(pred instanceof CompilerOptions))
        continue;

      this.options = utils.extend(this.options, pred.options);
    }
  }
};

Entity.prototype.prepend = function prepend(other) {
  // Prepend to the slow modes, fast modes are in this hashmap too anyway
  var keys = Object.keys(this.rest);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (!other.rest[key])
      continue;

    this.rest[key].prepend(other.rest[key]);
  }

  // Add new slow modes
  keys = Object.keys(other.rest);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (this.rest[key])
      continue;

    this._initRest(key);
    this.rest[key].prepend(other.rest[key]);
  }
};

// NOTE: This could be potentially compiled into inlined invokations
Entity.prototype.run = function run(context) {
  if (this.def.count !== 0)
    return this.def.exec(context);

  return this.defaultBody(context);
};

Entity.prototype.setDefaults = function setDefaults() {
  // Default .content() template for applyNext()
  if (this.content.count !== 0)
    this.content.push(new Template([], contentMode));

  // .def() default
  if (this.def.count !== 0) {
    this.canFlush = this.options.flush || false;
    var self = this;
    this.def.push(new Template([], function defaultBodyProxy() {
      return self.defaultBody(this);
    }));
  }
};

},{"./match":8,"./tree":9,"./utils":10}],6:[function(require,module,exports){
function BEMXJSTError(msg, func) {
  this.name = 'BEMXJSTError';
  this.message = msg;

  if (Error.captureStackTrace)
    Error.captureStackTrace(this, func || this.constructor);
  else
    this.stack = (new Error()).stack;
}

BEMXJSTError.prototype = Object.create(Error.prototype);
BEMXJSTError.prototype.constructor = BEMXJSTError;

exports.BEMXJSTError = BEMXJSTError;

},{}],7:[function(require,module,exports){
var inherits = require('inherits');

var Tree = require('./tree').Tree;
var PropertyMatch = require('./tree').PropertyMatch;
var AddMatch = require('./tree').AddMatch;
var Context = require('./context').Context;
var ClassBuilder = require('./class-builder').ClassBuilder;
var utils = require('./utils');

function BEMXJST(options) {
  this.options = options || {};

  this.entities = null;
  this.defaultEnt = null;

  // Current tree
  this.tree = null;

  // Current match
  this.match = null;

  // Create new Context constructor for overriding prototype
  this.contextConstructor = function ContextChild(bemxjst) {
    Context.call(this, bemxjst);
  };
  inherits(this.contextConstructor, Context);
  this.context = null;

  this.classBuilder = new ClassBuilder(this.options.naming || {});

  // Execution depth, used to invalidate `applyNext` bitfields
  this.depth = 0;

  // Do not call `_flush` on overridden `def()` mode
  this.canFlush = false;

  // oninit templates
  this.oninit = null;

  // Initialize default entity (no block/elem match)
  this.defaultEnt = new this.Entity(this, '', '', []);
  this.defaultElemEnt = new this.Entity(this, '', '', []);
}
module.exports = BEMXJST;

BEMXJST.prototype.locals = Tree.methods
    .concat('local', 'applyCtx', 'applyNext', 'apply');

BEMXJST.prototype.compile = function compile(code) {
  var self = this;

  function applyCtx() {
    return self._run(self.context.ctx);
  }

  function applyCtxWrap(ctx, changes) {
    // Fast case
    if (!changes)
      return self.local({ ctx: ctx }, applyCtx);

    return self.local(changes, function() {
      return self.local({ ctx: ctx }, applyCtx);
    });
  }

  function apply(mode, changes) {
    return self.applyMode(mode, changes);
  }

  function localWrap(changes) {
    return function localBody(body) {
      return self.local(changes, body);
    };
  }

  var tree = new Tree({
    refs: {
      applyCtx: applyCtxWrap,
      local: localWrap,
      apply: apply
    }
  });

  // Yeah, let people pass functions to us!
  var templates = this.recompileInput(code);

  var out = tree.build(templates, [
    localWrap,
    applyCtxWrap,
    function applyNextWrap(changes) {
      if (changes)
        return self.local(changes, applyNextWrap);
      return self.applyNext();
    },
    apply
  ]);

  // Concatenate templates with existing ones
  // TODO(indutny): it should be possible to incrementally add templates
  if (this.tree) {
    out = {
      templates: out.templates.concat(this.tree.templates),
      oninit: this.tree.oninit.concat(out.oninit)
    };
  }
  this.tree = out;

  // Group block+elem entities into a hashmap
  var ent = this.groupEntities(out.templates);

  // Transform entities from arrays to Entity instances
  ent = this.transformEntities(ent);

  this.entities = ent;
  this.oninit = out.oninit;
};

BEMXJST.prototype.recompileInput = function recompileInput(code) {
  var args = BEMXJST.prototype.locals;
  // Reuse function if it already has right arguments
  if (typeof code === 'function' && code.length === args.length)
    return code;

  var out = code.toString();

  // Strip the function
  out = out.replace(/^function[^{]+{|}$/g, '');

  // And recompile it with right arguments
  out = new Function(args.join(', '), out);

  return out;
};

BEMXJST.prototype.groupEntities = function groupEntities(tree) {
  var res = {};
  for (var i = 0; i < tree.length; i++) {
    // Make sure to change only the copy, the original is cached in `this.tree`
    var template = tree[i].clone();
    var block = null;
    var elem;

    elem = undefined;
    for (var j = 0; j < template.predicates.length; j++) {
      var pred = template.predicates[j];
      if (!(pred instanceof PropertyMatch) &&
        !(pred instanceof AddMatch))
        continue;

      if (pred.key === 'block')
        block = pred.value;
      else if (pred.key === 'elem')
        elem = pred.value;
      else
        continue;

      // Remove predicate, we won't much against it
      template.predicates.splice(j, 1);
      j--;
    }

    if (block === null) {
      var msg = 'block(…) subpredicate is not found.\n' +
      '    See template with subpredicates:\n     * ';

      for (var j = 0; j < template.predicates.length; j++) {
        var pred = template.predicates[j];

        if (j !== 0)
          msg += '\n     * ';

        if (pred.key === '_mode') {
          msg += pred.value + '()';
        } else {
          if (Array.isArray(pred.key)) {
            msg += pred.key[0].replace('mods', 'mod')
              .replace('elemMods', 'elemMod') +
              '(\'' + pred.key[1] + '\', \'' + pred.value + '\')';
          } else if (!pred.value || !pred.key) {
            msg += 'match(…)';
          } else {
            msg += pred.key + '(\'' + pred.value + '\')';
          }
        }
      }

      msg += '\n    And template body: \n    (' +
        (typeof template.body === 'function' ?
          template.body :
          JSON.stringify(template.body)) + ')';

      if (typeof BEMXJSTError === 'undefined') {
        BEMXJSTError = require('./error').BEMXJSTError;
      }

      throw new BEMXJSTError(msg);
    }

    var key = this.classBuilder.build(block, elem);

    if (!res[key])
      res[key] = [];
    res[key].push(template);
  }
  return res;
};

BEMXJST.prototype.transformEntities = function transformEntities(entities) {
  var wildcardElems = [];

  var keys = Object.keys(entities);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];

    // TODO(indutny): pass this values over
    var parts = this.classBuilder.split(key);
    var block = parts[0];
    var elem = parts[1];

    if (elem === '*')
      wildcardElems.push(block);

    entities[key] = new this.Entity(
      this, block, elem, entities[key]);
  }

  // Merge wildcard block templates
  if (entities.hasOwnProperty('*')) {
    var wildcard = entities['*'];
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (key === '*')
        continue;

      entities[key].prepend(wildcard);
    }
    this.defaultEnt.prepend(wildcard);
    this.defaultElemEnt.prepend(wildcard);
  }

  // Merge wildcard elem templates
  for (var i = 0; i < wildcardElems.length; i++) {
    var block = wildcardElems[i];
    var wildcardKey = this.classBuilder.build(block, '*');
    var wildcard = entities[wildcardKey];
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (key === wildcardKey)
        continue;

      var entity = entities[key];
      if (entity.block !== block)
        continue;

      if (entity.elem === undefined)
        continue;

      entities[key].prepend(wildcard);
    }
    this.defaultElemEnt.prepend(wildcard);
  }

  // Set default templates after merging with wildcard
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    entities[key].setDefaults();
    this.defaultEnt.setDefaults();
    this.defaultElemEnt.setDefaults();
  }

  return entities;
};

BEMXJST.prototype._run = function _run(context) {
  var res;
  if (context === undefined || context === '' || context === null)
    res = this.runEmpty();
  else if (Array.isArray(context))
    res = this.runMany(context);
  else if (
    typeof context.html === 'string' &&
    !context.tag &&
    typeof context.block === 'undefined' &&
    typeof context.elem === 'undefined' &&
    typeof context.cls === 'undefined' &&
    typeof context.attrs === 'undefined'
  )
    res = this.runUnescaped(context.html);
  else if (utils.isSimple(context))
    res = this.runSimple(context);
  else
    res = this.runOne(context);
  return res;
};

BEMXJST.prototype.run = function run(json) {
  var match = this.match;
  var context = this.context;

  this.match = null;
  this.context = new this.contextConstructor(this);
  this.canFlush = this.context._flush !== null;
  this.depth = 0;
  var res = this._run(json);

  if (this.canFlush)
    res = this.context._flush(res);

  this.match = match;
  this.context = context;

  return res;
};


BEMXJST.prototype.runEmpty = function runEmpty() {
  this.context._listLength--;
  return '';
};

BEMXJST.prototype.runUnescaped = function runUnescaped(context) {
  this.context._listLength--;
  return '' + context;
};

BEMXJST.prototype.runSimple = function runSimple(simple) {
  this.context._listLength--;
  var res = '';
  if (simple && simple !== true || simple === 0) {
    res += typeof simple === 'string' && this.context.escapeContent ?
      utils.xmlEscape(simple) :
      simple;
  }

  return res;
};

BEMXJST.prototype.runOne = function runOne(json) {
  var context = this.context;

  var oldCtx = context.ctx;
  var oldBlock = context.block;
  var oldCurrBlock = context._currBlock;
  var oldElem = context.elem;
  var oldMods = context.mods;
  var oldElemMods = context.elemMods;

  if (json.block || json.elem)
    context._currBlock = '';
  else
    context._currBlock = context.block;

  context.ctx = json;
  if (json.block) {
    context.block = json.block;

    if (json.mods)
      context.mods = json.mods;
    else if (json.block !== oldBlock || !json.elem)
      context.mods = {};
  } else {
    if (!json.elem)
      context.block = '';
    else if (oldCurrBlock)
      context.block = oldCurrBlock;
  }

  context.elem = json.elem;
  if (json.elemMods)
    context.elemMods = json.elemMods;
  else
    context.elemMods = {};

  var block = context.block || '';
  var elem = context.elem;

  // Control list position
  if (block || elem)
    context.position++;
  else
    context._listLength--;

  // To invalidate `applyNext` flags
  this.depth++;

  var key = this.classBuilder.build(block, elem);

  var restoreFlush = false;
  var ent = this.entities[key];
  if (ent) {
    if (this.canFlush && !ent.canFlush) {
      // Entity does not support flushing, do not flush anything nested
      restoreFlush = true;
      this.canFlush = false;
    }
  } else {
    // No entity - use default one
    ent = this.defaultEnt;
    if (elem !== undefined)
      ent = this.defaultElemEnt;
    ent.init(block, elem);
  }

  var res = ent.run(context);
  context.ctx = oldCtx;
  context.block = oldBlock;
  context.elem = oldElem;
  context.mods = oldMods;
  context.elemMods = oldElemMods;
  context._currBlock = oldCurrBlock;
  this.depth--;
  if (restoreFlush)
    this.canFlush = true;

  return res;
};

BEMXJST.prototype.renderContent = function renderContent(content, isBEM) {
  var context = this.context;
  var oldPos = context.position;
  var oldListLength = context._listLength;
  var oldNotNewList = context._notNewList;

  context._notNewList = false;
  if (isBEM) {
    context.position = 0;
    context._listLength = 1;
  }

  var res = this._run(content);

  context.position = oldPos;
  context._listLength = oldListLength;
  context._notNewList = oldNotNewList;

  return res;
};

BEMXJST.prototype.local = function local(changes, body) {
  var keys = Object.keys(changes);
  var restore = [];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var parts = key.split('.');

    var value = this.context;
    for (var j = 0; j < parts.length - 1; j++)
      value = value[parts[j]];

    restore.push({
      parts: parts,
      value: value[parts[j]]
    });
    value[parts[j]] = changes[key];
  }

  var res = body.call(this.context);

  for (var i = 0; i < restore.length; i++) {
    var parts = restore[i].parts;
    var value = this.context;
    for (var j = 0; j < parts.length - 1; j++)
      value = value[parts[j]];

    value[parts[j]] = restore[i].value;
  }

  return res;
};

BEMXJST.prototype.applyNext = function applyNext() {
  return this.match.exec(this.context);
};

BEMXJST.prototype.applyMode = function applyMode(mode, changes) {
  var match = this.match.entity.rest[mode];
  if (!match)
    return this.context.ctx[mode];

  if (!changes)
    return match.exec(this.context);

  var self = this;

  // Allocate function this way, to prevent allocation at the top of the
  // `applyMode`
  var fn = function localBody() {
    return match.exec(self.context);
  };
  return this.local(changes, fn);
};

BEMXJST.prototype.exportApply = function exportApply(exports) {
  var self = this;
  exports.apply = function apply(context) {
    return self.run(context);
  };

  // Add templates at run time
  exports.compile = function compile(templates) {
    return self.compile(templates);
  };

  var sharedContext = {};

  exports.BEMContext = this.contextConstructor;
  sharedContext.BEMContext = exports.BEMContext;

  for (var i = 0; i < this.oninit.length; i++) {
    var oninit = this.oninit[i];

    oninit(exports, sharedContext);
  }
};

},{"./class-builder":3,"./context":4,"./error":6,"./tree":9,"./utils":10,"inherits":11}],8:[function(require,module,exports){
var tree = require('./tree');
var PropertyMatch = tree.PropertyMatch;
var AddMatch = tree.AddMatch;
var WrapMatch = tree.WrapMatch;
var CustomMatch = tree.CustomMatch;

function MatchProperty(template, pred) {
  this.template = template;
  this.key = pred.key;
  this.value = pred.value;
}

MatchProperty.prototype.exec = function exec(context) {
  return context[this.key] === this.value;
};

function MatchNested(template, pred) {
  this.template = template;
  this.keys = pred.key;
  this.value = pred.value;
}

MatchNested.prototype.exec = function exec(context) {
  var val = context;

  for (var i = 0; i < this.keys.length - 1; i++) {
    val = val[this.keys[i]];
    if (!val)
      return false;
  }

  val = val[this.keys[i]];

  if (this.value === true)
    return val !== undefined && val !== '' && val !== false && val !== null;

  return String(val) === this.value;
};

function MatchCustom(template, pred) {
  this.template = template;
  this.body = pred.body;
}

MatchCustom.prototype.exec = function exec(context) {
  return this.body.call(context, context, context.ctx);
};

function MatchWrap(template) {
  this.template = template;
  this.wrap = null;
}

MatchWrap.prototype.exec = function exec(context) {
  var res = this.wrap !== context.ctx;
  this.wrap = context.ctx;
  return res;
};

function AddWrap(template, pred) {
  this.template = template;
  this.key = pred.key;
  this.value = pred.value;
}

AddWrap.prototype.exec = function exec(context) {
  return context[this.key] === this.value;
};

function MatchTemplate(mode, template) {
  this.mode = mode;
  this.predicates = new Array(template.predicates.length);
  this.body = template.body;

  var postpone = [];

  for (var i = 0, j = 0; i < this.predicates.length; i++, j++) {
    var pred = template.predicates[i];
    if (pred instanceof PropertyMatch) {
      if (Array.isArray(pred.key))
        this.predicates[j] = new MatchNested(this, pred);
      else
        this.predicates[j] = new MatchProperty(this, pred);
    } else if (pred instanceof AddMatch) {
      this.predicates[j] = new AddWrap(this, pred);
    } else if (pred instanceof CustomMatch) {
      this.predicates[j] = new MatchCustom(this, pred);

      // Push MatchWrap later, they should not be executed first.
      // Otherwise they will set flag too early, and body might not be executed
    } else if (pred instanceof WrapMatch) {
      j--;
      postpone.push(new MatchWrap(this));
    } else {
      // Skip
      j--;
    }
  }

  // Insert late predicates
  for (var i = 0; i < postpone.length; i++, j++)
    this.predicates[j] = postpone[i];

  if (this.predicates.length !== j)
    this.predicates.length = j;
}
exports.MatchTemplate = MatchTemplate;

function Match(entity, modeName) {
  this.entity = entity;
  this.modeName = modeName;
  this.bemxjst = this.entity.bemxjst;
  this.templates = [];

  // applyNext mask
  this.mask = [ 0 ];

  // We are going to create copies of mask for nested `applyNext()`
  this.maskSize = 0;
  this.maskOffset = 0;

  this.count = 0;
  this.depth = -1;

  this.thrownError = null;
}
exports.Match = Match;

Match.prototype.clone = function clone(entity) {
  var res = new Match(entity, this.modeName);

  res.templates = this.templates.slice();
  res.mask = this.mask.slice();
  res.maskSize = this.maskSize;
  res.count = this.count;

  return res;
};

Match.prototype.prepend = function prepend(other) {
  this.templates = other.templates.concat(this.templates);
  this.count += other.count;

  while (Math.ceil(this.count / 31) > this.mask.length)
    this.mask.push(0);

  this.maskSize = this.mask.length;
};

Match.prototype.push = function push(template) {
  this.templates.push(new MatchTemplate(this, template));
  this.count++;

  if (Math.ceil(this.count / 31) > this.mask.length)
    this.mask.push(0);

  this.maskSize = this.mask.length;
};

Match.prototype.tryCatch = function tryCatch(fn, ctx) {
  try {
    return fn.call(ctx, ctx, ctx.ctx);
  } catch (e) {
    this.thrownError = e;
  }
};

Match.prototype.exec = function exec(context) {
  var save = this.checkDepth();

  var template;
  var bitIndex = this.maskOffset;
  var mask = this.mask[bitIndex];
  var bit = 1;
  for (var i = 0; i < this.count; i++) {
    if ((mask & bit) === 0) {
      template = this.templates[i];
      for (var j = 0; j < template.predicates.length; j++) {
        var pred = template.predicates[j];

        /* jshint maxdepth : false */
        if (!pred.exec(context))
          break;
      }

      // All predicates matched!
      if (j === template.predicates.length)
        break;
    }

    if (bit === 0x40000000) {
      bitIndex++;
      mask = this.mask[bitIndex];
      bit = 1;
    } else {
      bit <<= 1;
    }
  }

  if (i === this.count)
    return context.ctx[this.modeName];

  var oldMask = mask;
  var oldMatch = this.bemxjst.match;
  this.mask[bitIndex] |= bit;
  this.bemxjst.match = this;

  this.thrownError = null;

  var out;
  if (typeof template.body === 'function')
    out = this.tryCatch(template.body, context);
  else
    out = template.body;

  this.mask[bitIndex] = oldMask;
  this.bemxjst.match = oldMatch;
  this.restoreDepth(save);

  var e = this.thrownError;
  if (e !== null) {
    this.thrownError = null;
    throw e;
  }

  return out;
};

Match.prototype.checkDepth = function checkDepth() {
  if (this.depth === -1) {
    this.depth = this.bemxjst.depth;
    return -1;
  }

  if (this.bemxjst.depth === this.depth)
    return this.depth;

  var depth = this.depth;
  this.depth = this.bemxjst.depth;

  this.maskOffset += this.maskSize;

  while (this.mask.length < this.maskOffset + this.maskSize)
    this.mask.push(0);

  return depth;
};

Match.prototype.restoreDepth = function restoreDepth(depth) {
  if (depth !== -1 && depth !== this.depth)
    this.maskOffset -= this.maskSize;
  this.depth = depth;
};

},{"./tree":9}],9:[function(require,module,exports){
var assert = require('minimalistic-assert');
var inherits = require('inherits');
var utils = require('./utils');

function Template(predicates, body) {
  this.predicates = predicates;

  this.body = body;
}
exports.Template = Template;

Template.prototype.wrap = function wrap() {
  var body = this.body;
  for (var i = 0; i < this.predicates.length; i++) {
    var pred = this.predicates[i];
    body = pred.wrapBody(body);
  }
  this.body = body;
};

Template.prototype.clone = function clone() {
  return new Template(this.predicates.slice(), this.body);
};

function MatchBase() {
}
exports.MatchBase = MatchBase;

MatchBase.prototype.wrapBody = function wrapBody(body) {
  return body;
};

function Item(tree, children) {
  this.conditions = [];
  this.children = [];

  for (var i = children.length - 1; i >= 0; i--) {
    var arg = children[i];
    if (arg instanceof MatchBase)
      this.conditions.push(arg);
    else if (arg === tree.boundBody)
      this.children[i] = tree.queue.pop();
    else
      this.children[i] = arg;
  }
}

function WrapMatch(refs) {
  MatchBase.call(this);

  this.refs = refs;
}
inherits(WrapMatch, MatchBase);
exports.WrapMatch = WrapMatch;

WrapMatch.prototype.wrapBody = function wrapBody(body) {
  var applyCtx = this.refs.applyCtx;

  if (typeof body !== 'function') {
    return function inlineAdaptor() {
      return applyCtx(body);
    };
  }

  return function wrapAdaptor() {
    return applyCtx(body.call(this, this, this.ctx));
  };
};

function ReplaceMatch(refs) {
  MatchBase.call(this);

  this.refs = refs;
}
inherits(ReplaceMatch, MatchBase);
exports.ReplaceMatch = ReplaceMatch;

ReplaceMatch.prototype.wrapBody = function wrapBody(body) {
  var applyCtx = this.refs.applyCtx;

  if (typeof body !== 'function') {
    return function inlineAdaptor() {
      return applyCtx(body);
    };
  }

  return function replaceAdaptor() {
    return applyCtx(body.call(this, this, this.ctx));
  };
};

function ExtendMatch(refs) {
  MatchBase.call(this);

  this.refs = refs;
}
inherits(ExtendMatch, MatchBase);
exports.ExtendMatch = ExtendMatch;

ExtendMatch.prototype.wrapBody = function wrapBody(body) {
  var refs = this.refs;
  var applyCtx = refs.applyCtx;
  var local = refs.local;

  if (typeof body !== 'function') {
    return function inlineAdaptor() {
      var changes = {};

      var keys = Object.keys(body);
      for (var i = 0; i < keys.length; i++)
        changes['ctx.' + keys[i]] = body[keys[i]];

      return local(changes)(function preApplyCtx() {
        return applyCtx(this.ctx);
      });
    };
  }

  return function localAdaptor() {
    var changes = {};

    var obj = body.call(this);
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++)
      changes['ctx.' + keys[i]] = obj[keys[i]];

    return local(changes)(function preApplyCtx() {
      return applyCtx(this.ctx);
    });
  };
};

function AddMatch(mode, refs) {
  MatchBase.call(this);

  this.mode = mode;
  this.refs = refs;
}
inherits(AddMatch, MatchBase);
exports.AddMatch = AddMatch;

AddMatch.prototype.wrapBody = function wrapBody(body) {
  return this[this.mode + 'WrapBody'](body);
};

AddMatch.prototype.appendContentWrapBody =
  function appendContentWrapBody(body) {
  var refs = this.refs;
  var applyCtx = refs.applyCtx;
  var apply = refs.apply;

  if (typeof body !== 'function') {
    return function inlineAppendContentAddAdaptor() {
      return [ apply('content') , body ];
    };
  }

  return function appendContentAddAdaptor() {
    return [ apply('content'), applyCtx(body.call(this, this, this.ctx)) ];
  };
};

AddMatch.prototype.prependContentWrapBody =
  function prependContentWrapBody(body) {
  var refs = this.refs;
  var applyCtx = refs.applyCtx;
  var apply = refs.apply;

  if (typeof body !== 'function') {
    return function inlinePrependContentAddAdaptor() {
      return [ body, apply('content') ];
    };
  }

  return function prependContentAddAdaptor() {
    return [ applyCtx(body.call(this, this, this.ctx)), apply('content') ];
  };
};

AddMatch.prototype.mixWrapBody = function mixWrapBody(body) {
  var refs = this.refs;
  var apply = refs.apply;

  if (typeof body !== 'function') {
    return function inlineAddMixAdaptor() {
      var ret = apply('mix');
      if (!Array.isArray(ret)) ret = [ ret ];
      return ret.concat(body);
    };
  }

  return function addMixAdaptor() {
    var ret = apply('mix');
    if (!Array.isArray(ret)) ret = [ ret ];
    return ret.concat(body.call(this, this, this.ctx));
  };
};

AddMatch.prototype.attrsWrapBody = function attrsWrapBody(body) {
  var refs = this.refs;
  var apply = refs.apply;

  if (typeof body !== 'function') {
    return function inlineAttrsAddAdaptor() {
      return utils.extend(apply('attrs') || {}, body);
    };
  }

  return function addAttrsAdaptor() {
    return utils.extend(apply('attrs') || {}, body.call(this, this, this.ctx));
  };
};

AddMatch.prototype.jsWrapBody = function jsWrapBody(body) {
  var refs = this.refs;
  var apply = refs.apply;

  if (typeof body !== 'function') {
    return function inlineJsAddAdaptor() {
      return utils.extend(apply('js') || {}, body);
    };
  }

  return function jsAddAdaptor() {
    return utils.extend(apply('js') || {}, body.call(this, this, this.ctx));
  };
};

function CompilerOptions(options) {
  MatchBase.call(this);
  this.options = options;
}
inherits(CompilerOptions, MatchBase);
exports.CompilerOptions = CompilerOptions;

function PropertyMatch(key, value) {
  MatchBase.call(this);

  this.key = key;
  this.value = value;
}
inherits(PropertyMatch, MatchBase);
exports.PropertyMatch = PropertyMatch;

function CustomMatch(body) {
  MatchBase.call(this);

  this.body = body;
}
inherits(CustomMatch, MatchBase);
exports.CustomMatch = CustomMatch;

function Tree(options) {
  this.options = options;
  this.refs = this.options.refs;

  this.boundBody = this.body.bind(this);

  var methods = this.methods('body');
  for (var i = 0; i < methods.length; i++) {
    var method = methods[i];
    // NOTE: method.name is empty because of .bind()
    this.boundBody[Tree.methods[i]] = method;
  }

  this.queue = [];
  this.templates = [];
  this.initializers = [];
}
exports.Tree = Tree;

Tree.methods = [
  // Subpredicates:
  'match', 'block', 'elem', 'mod', 'elemMod',
  // Runtime related:
  'oninit', 'xjstOptions',
  // Output generators:
  'wrap', 'replace', 'extend', 'mode', 'def',
  'content', 'appendContent', 'prependContent',
  'attrs', 'addAttrs', 'js', 'addJs', 'mix', 'addMix',
  'tag', 'cls', 'bem'
];

Tree.prototype.build = function build(templates, apply) {
  var methods = this.methods('global').concat(apply);
  methods[0] = this.match.bind(this);

  templates.apply({}, methods);

  return {
    templates: this.templates.slice().reverse(),
    oninit: this.initializers
  };
};

function methodFactory(self, kind, name) {
  var method = self[name];
  var boundBody = self.boundBody;

  if (kind !== 'body') {
    if (name === 'replace' || name === 'extend' || name === 'wrap') {
      return function wrapExtended() {
        return method.apply(self, arguments);
      };
    }

    return function wrapNotBody() {
      method.apply(self, arguments);
      return boundBody;
    };
  }

  return function wrapBody() {
    var res = method.apply(self, arguments);

    // Insert body into last item
    var child = self.queue.pop();
    var last = self.queue[self.queue.length - 1];
    last.conditions = last.conditions.concat(child.conditions);
    last.children = last.children.concat(child.children);

    if (name === 'replace' || name === 'extend' || name === 'wrap')
      return res;
    return boundBody;
  };
}

Tree.prototype.methods = function methods(kind) {
  var out = new Array(Tree.methods.length);

  for (var i = 0; i < out.length; i++) {
    var name = Tree.methods[i];
    out[i] = methodFactory(this, kind, name);
  }

  return out;
};

// Called after all matches
Tree.prototype.flush = function flush(conditions, item) {
  var subcond;

  if (item.conditions)
    subcond = conditions.concat(item.conditions);
  else
    subcond = item.conditions;

  for (var i = 0; i < item.children.length; i++) {
    var arg = item.children[i];

    // Go deeper
    if (arg instanceof Item) {
      this.flush(subcond, item.children[i]);

    // Body
    } else {
      var template = new Template(conditions, arg);
      template.wrap();
      this.templates.push(template);
    }
  }
};

Tree.prototype.body = function body() {
  var children = new Array(arguments.length);
  for (var i = 0; i < arguments.length; i++)
    children[i] = arguments[i];

  var child = new Item(this, children);
  this.queue[this.queue.length - 1].children.push(child);

  if (this.queue.length === 1)
    this.flush([], this.queue.shift());

  return this.boundBody;
};

Tree.prototype.match = function match() {
  var children = new Array(arguments.length);
  for (var i = 0; i < arguments.length; i++) {
    var arg = arguments[i];
    if (typeof arg === 'function')
      arg = new CustomMatch(arg);
    assert(arg instanceof MatchBase, 'Wrong .match() argument');
    children[i] = arg;
  }

  this.queue.push(new Item(this, children));

  return this.boundBody;
};

Tree.prototype.applyMode = function applyMode(args, mode) {
  if (args.length) {
    throw new Error('Predicate should not have arguments but ' +
      JSON.stringify(args) + ' passed');
  }

  return this.mode(mode);
};

Tree.prototype.wrap = function wrap() {
  return this.def.apply(this, arguments).match(new WrapMatch(this.refs));
};

Tree.prototype.xjstOptions = function xjstOptions(options) {
  this.queue.push(new Item(this, [
    new CompilerOptions(options)
  ]));
  return this.boundBody;
};

Tree.prototype.block = function block(name) {
  return this.match(new PropertyMatch('block', name));
};

Tree.prototype.elem = function elem(name) {
  return this.match(new PropertyMatch('elem', name));
};

Tree.prototype.mode = function mode(name) {
  return this.match(new PropertyMatch('_mode', name));
};

Tree.prototype.mod = function mod(name, value) {
  return this.match(new PropertyMatch([ 'mods', name ],
                                  value === undefined ? true : String(value)));
};

Tree.prototype.elemMod = function elemMod(name, value) {
  return this.match(new PropertyMatch([ 'elemMods', name ],
                                  value === undefined ?  true : String(value)));
};

Tree.prototype.def = function def() {
  return this.applyMode(arguments, 'default');
};

Tree.prototype.tag = function tag() {
  return this.applyMode(arguments, 'tag');
};

Tree.prototype.attrs = function attrs() {
  return this.applyMode(arguments, 'attrs');
};

Tree.prototype.addAttrs = function addAttrs() {
  return this.attrs.apply(this, arguments)
    .match(new AddMatch('attrs', this.refs));
};

Tree.prototype.cls = function cls() {
  return this.applyMode(arguments, 'cls');
};

Tree.prototype.js = function js() {
  return this.applyMode(arguments, 'js');
};

Tree.prototype.addJs = function addAttrs() {
  return this.js.apply(this, arguments).match(new AddMatch('js', this.refs));
};

Tree.prototype.bem = function bem() {
  return this.applyMode(arguments, 'bem');
};

Tree.prototype.addMix = function addMix() {
  return this.mix.apply(this, arguments).match(new AddMatch('mix', this.refs));
};

Tree.prototype.mix = function mix() {
  return this.applyMode(arguments, 'mix');
};

Tree.prototype.content = function content() {
  return this.applyMode(arguments, 'content');
};

Tree.prototype.appendContent = function appendContent() {
  return this.content.apply(this, arguments)
    .match(new AddMatch('appendContent', this.refs));
};


Tree.prototype.prependContent = function prependContent() {
  return this.content.apply(this, arguments)
    .match(new AddMatch('prependContent', this.refs));
};

Tree.prototype.replace = function replace() {
  return this.def.apply(this, arguments).match(new ReplaceMatch(this.refs));
};

Tree.prototype.extend = function extend() {
  return this.def.apply(this, arguments).match(new ExtendMatch(this.refs));
};

Tree.prototype.oninit = function oninit(fn) {
  this.initializers.push(fn);
};

},{"./utils":10,"inherits":11,"minimalistic-assert":12}],10:[function(require,module,exports){
var amp = '&amp;';
var lt = '&lt;';
var gt = '&gt;';
var quot = '&quot;';
var singleQuot = '&#39;';

var matchXmlRegExp = /[&<>]/;

exports.xmlEscape = function(string) {
  var str = '' + string;
  var match = matchXmlRegExp.exec(str);

  if (!match)
    return str;

  var escape;
  var html = '';
  var index = 0;
  var lastIndex = 0;

  for (index = match.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 38: // &
        escape = amp;
        break;
      case 60: // <
        escape = lt;
        break;
      case 62: // >
        escape = gt;
        break;
      default:
        continue;
    }

    if (lastIndex !== index)
      html += str.substring(lastIndex, index);

    lastIndex = index + 1;
    html += escape;
  }

  return lastIndex !== index ?
    html + str.substring(lastIndex, index) :
    html;
};

var matchAttrRegExp = /["&]/;

exports.attrEscape = function(string) {
  var str = '' + string;
  var match = matchAttrRegExp.exec(str);

  if (!match)
    return str;

  var escape;
  var html = '';
  var index = 0;
  var lastIndex = 0;

  for (index = match.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34: // "
        escape = quot;
        break;
      case 38: // &
        escape = amp;
        break;
      default:
        continue;
    }

    if (lastIndex !== index)
      html += str.substring(lastIndex, index);

    lastIndex = index + 1;
    html += escape;
  }

  return lastIndex !== index ?
    html + str.substring(lastIndex, index) :
    html;
};

var matchJsAttrRegExp = /['&]/;

exports.jsAttrEscape = function(string) {
  var str = '' + string;
  var match = matchJsAttrRegExp.exec(str);

  if (!match)
    return str;

  var escape;
  var html = '';
  var index = 0;
  var lastIndex = 0;

  for (index = match.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 38: // &
        escape = amp;
        break;
      case 39: // '
        escape = singleQuot;
        break;
      default:
        continue;
    }

    if (lastIndex !== index)
      html += str.substring(lastIndex, index);

    lastIndex = index + 1;
    html += escape;
  }

  return lastIndex !== index ?
    html + str.substring(lastIndex, index) :
    html;
};

exports.extend = function extend(o1, o2) {
  if (!o1 || !o2)
    return o1 || o2;

  var res = {};
  var n;

  for (n in o1)
    if (o1.hasOwnProperty(n))
      res[n] = o1[n];
  for (n in o2)
    if (o2.hasOwnProperty(n))
      res[n] = o2[n];
  return res;
};

var SHORT_TAGS = { // хэш для быстрого определения, является ли тэг коротким
  area: 1, base: 1, br: 1, col: 1, command: 1, embed: 1, hr: 1, img: 1,
  input: 1, keygen: 1, link: 1, meta: 1, param: 1, source: 1, wbr: 1
};

exports.isShortTag = function isShortTag(t) {
  return SHORT_TAGS.hasOwnProperty(t);
};

exports.isSimple = function isSimple(obj) {
  if (!obj || obj === true) return true;
  if (!obj.block &&
      !obj.elem &&
      !obj.tag &&
      !obj.cls &&
      !obj.attrs &&
      obj.hasOwnProperty('html') &&
      isSimple(obj.html))
    return true;
  return typeof obj === 'string' || typeof obj === 'number';
};

exports.isObj = function isObj(val) {
  return val && typeof val === 'object' && !Array.isArray(val) &&
    val !== null;
};

var uniqCount = 0;
var uniqId = +new Date();
var uniqExpando = '__' + uniqId;
var uniqPrefix = 'uniq' + uniqId;

function getUniq() {
  return uniqPrefix + (++uniqCount);
}
exports.getUniq = getUniq;

exports.identify = function identify(obj, onlyGet) {
  if (!obj)
    return getUniq();
  if (onlyGet || obj[uniqExpando])
    return obj[uniqExpando];

  var u = getUniq();
  obj[uniqExpando] = u;
  return u;
};

exports.fnToString = function fnToString(code) {
  // It is fine to compile without templates at first
  if (!code)
    return '';

  if (typeof code === 'function') {
    // Examples:
    //   function () { … }
    //   function name() { … }
    //   function (a, b) { … }
    //   function name(a, b) { … }
    var regularFunction = /^function\s*[^{]+{|}$/g;

    // Examples:
    //   () => { … }
    //   (a, b) => { … }
    //   _ => { … }
    var arrowFunction = /^(_|\(\w|[^=>]+\))\s=>\s{|}$/g;

    code = code.toString();
    code = code.replace(
      code.indexOf('function') === 0 ? regularFunction : arrowFunction,
    '');
  }

  return code;
};

},{}],11:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],12:[function(require,module,exports){
module.exports = assert;

function assert(val, msg) {
  if (!val)
    throw new Error(msg || 'Assertion failed');
}

assert.equal = function assertEqual(l, r, msg) {
  if (l != r)
    throw new Error(msg || ('Assertion failed: ' + l + ' != ' + r));
};

},{}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvYmVtaHRtbC9lbnRpdHkuanMiLCJsaWIvYmVtaHRtbC9pbmRleC5qcyIsImxpYi9iZW14anN0L2NsYXNzLWJ1aWxkZXIuanMiLCJsaWIvYmVteGpzdC9jb250ZXh0LmpzIiwibGliL2JlbXhqc3QvZW50aXR5LmpzIiwibGliL2JlbXhqc3QvZXJyb3IuanMiLCJsaWIvYmVteGpzdC9pbmRleC5qcyIsImxpYi9iZW14anN0L21hdGNoLmpzIiwibGliL2JlbXhqc3QvdHJlZS5qcyIsImxpYi9iZW14anN0L3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvbWluaW1hbGlzdGljLWFzc2VydC9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsZ0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ROQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xudmFyIE1hdGNoID0gcmVxdWlyZSgnLi4vYmVteGpzdC9tYXRjaCcpLk1hdGNoO1xudmFyIEJlbXhqc3RFbnRpdHkgPSByZXF1aXJlKCcuLi9iZW14anN0L2VudGl0eScpLkVudGl0eTtcblxuLyoqXG4gKiBAY2xhc3MgRW50aXR5XG4gKiBAcGFyYW0ge0JFTVhKU1R9IGJlbXhqc3RcbiAqIEBwYXJhbSB7U3RyaW5nfSBibG9ja1xuICogQHBhcmFtIHtTdHJpbmd9IGVsZW1cbiAqIEBwYXJhbSB7QXJyYXl9IHRlbXBsYXRlc1xuICovXG5mdW5jdGlvbiBFbnRpdHkoYmVteGpzdCkge1xuICB0aGlzLmJlbXhqc3QgPSBiZW14anN0O1xuXG4gIHRoaXMuanNDbGFzcyA9IG51bGw7XG5cbiAgLy8gXCJGYXN0IG1vZGVzXCJcbiAgdGhpcy50YWcgPSBuZXcgTWF0Y2godGhpcywgJ3RhZycpO1xuICB0aGlzLmF0dHJzID0gbmV3IE1hdGNoKHRoaXMsICdhdHRycycpO1xuICB0aGlzLmpzID0gbmV3IE1hdGNoKHRoaXMsICdqcycpO1xuICB0aGlzLm1peCA9IG5ldyBNYXRjaCh0aGlzLCAnbWl4Jyk7XG4gIHRoaXMuYmVtID0gbmV3IE1hdGNoKHRoaXMsICdiZW0nKTtcbiAgdGhpcy5jbHMgPSBuZXcgTWF0Y2godGhpcywgJ2NscycpO1xuXG4gIEJlbXhqc3RFbnRpdHkuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn1cblxuaW5oZXJpdHMoRW50aXR5LCBCZW14anN0RW50aXR5KTtcbmV4cG9ydHMuRW50aXR5ID0gRW50aXR5O1xuXG5FbnRpdHkucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiBpbml0KGJsb2NrLCBlbGVtKSB7XG4gIHRoaXMuYmxvY2sgPSBibG9jaztcbiAgdGhpcy5lbGVtID0gZWxlbTtcblxuICAvLyBDbGFzcyBmb3IganNQYXJhbXNcbiAgdGhpcy5qc0NsYXNzID0gdGhpcy5iZW14anN0LmNsYXNzQnVpbGRlci5idWlsZCh0aGlzLmJsb2NrLCB0aGlzLmVsZW0pO1xufTtcblxuRW50aXR5LnByb3RvdHlwZS5faW5pdFJlc3QgPSBmdW5jdGlvbiBfaW5pdFJlc3Qoa2V5KSB7XG4gIGlmIChrZXkgPT09ICdkZWZhdWx0Jykge1xuICAgIHRoaXMucmVzdFtrZXldID0gdGhpcy5kZWY7XG4gIH0gZWxzZSBpZiAoa2V5ID09PSAndGFnJyB8fFxuICAgIGtleSA9PT0gJ2F0dHJzJyB8fFxuICAgIGtleSA9PT0gJ2pzJyB8fFxuICAgIGtleSA9PT0gJ21peCcgfHxcbiAgICBrZXkgPT09ICdiZW0nIHx8XG4gICAga2V5ID09PSAnY2xzJyB8fFxuICAgIGtleSA9PT0gJ2NvbnRlbnQnKSB7XG4gICAgdGhpcy5yZXN0W2tleV0gPSB0aGlzW2tleV07XG4gIH0gZWxzZSB7XG4gICAgaWYgKCF0aGlzLnJlc3QuaGFzT3duUHJvcGVydHkoa2V5KSlcbiAgICAgIHRoaXMucmVzdFtrZXldID0gbmV3IE1hdGNoKHRoaXMsIGtleSk7XG4gIH1cbn07XG5cbkVudGl0eS5wcm90b3R5cGUuZGVmYXVsdEJvZHkgPSBmdW5jdGlvbiBkZWZhdWx0Qm9keShjb250ZXh0KSB7XG4gIHZhciB0YWcgPSB0aGlzLnRhZy5leGVjKGNvbnRleHQpO1xuICB2YXIganMgPSB0aGlzLmpzLmV4ZWMoY29udGV4dCk7XG4gIHZhciBiZW0gPSB0aGlzLmJlbS5leGVjKGNvbnRleHQpO1xuICB2YXIgY2xzID0gdGhpcy5jbHMuZXhlYyhjb250ZXh0KTtcbiAgdmFyIG1peCA9IHRoaXMubWl4LmV4ZWMoY29udGV4dCk7XG4gIHZhciBhdHRycyA9IHRoaXMuYXR0cnMuZXhlYyhjb250ZXh0KTtcbiAgdmFyIGNvbnRlbnQgPSB0aGlzLmNvbnRlbnQuZXhlYyhjb250ZXh0KTtcblxuICByZXR1cm4gdGhpcy5iZW14anN0LnJlbmRlcihjb250ZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZW0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNscyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWl4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRycyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCk7XG59O1xuIiwidmFyIGluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL2JlbXhqc3QvdXRpbHMnKTtcbnZhciBFbnRpdHkgPSByZXF1aXJlKCcuL2VudGl0eScpLkVudGl0eTtcbnZhciBCRU1YSlNUID0gcmVxdWlyZSgnLi4vYmVteGpzdCcpO1xuXG5mdW5jdGlvbiBCRU1IVE1MKG9wdGlvbnMpIHtcbiAgQkVNWEpTVC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gIHZhciB4aHRtbCA9IHR5cGVvZiBvcHRpb25zLnhodG1sID09PSAndW5kZWZpbmVkJyA/IGZhbHNlIDogb3B0aW9ucy54aHRtbDtcbiAgdGhpcy5fc2hvcnRUYWdDbG9zZXIgPSB4aHRtbCA/ICcvPicgOiAnPic7XG5cbiAgdGhpcy5fZWxlbUpzSW5zdGFuY2VzID0gb3B0aW9ucy5lbGVtSnNJbnN0YW5jZXM7XG59XG5cbmluaGVyaXRzKEJFTUhUTUwsIEJFTVhKU1QpO1xubW9kdWxlLmV4cG9ydHMgPSBCRU1IVE1MO1xuXG5CRU1IVE1MLnByb3RvdHlwZS5FbnRpdHkgPSBFbnRpdHk7XG5cbkJFTUhUTUwucHJvdG90eXBlLnJ1bk1hbnkgPSBmdW5jdGlvbiBydW5NYW55KGFycikge1xuICB2YXIgb3V0ID0gJyc7XG4gIHZhciBjb250ZXh0ID0gdGhpcy5jb250ZXh0O1xuICB2YXIgcHJldlBvcyA9IGNvbnRleHQucG9zaXRpb247XG4gIHZhciBwcmV2Tm90TmV3TGlzdCA9IGNvbnRleHQuX25vdE5ld0xpc3Q7XG5cbiAgaWYgKHByZXZOb3ROZXdMaXN0KSB7XG4gICAgY29udGV4dC5fbGlzdExlbmd0aCArPSBhcnIubGVuZ3RoIC0gMTtcbiAgfSBlbHNlIHtcbiAgICBjb250ZXh0LnBvc2l0aW9uID0gMDtcbiAgICBjb250ZXh0Ll9saXN0TGVuZ3RoID0gYXJyLmxlbmd0aDtcbiAgfVxuICBjb250ZXh0Ll9ub3ROZXdMaXN0ID0gdHJ1ZTtcblxuICBpZiAodGhpcy5jYW5GbHVzaCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKVxuICAgICAgb3V0ICs9IGNvbnRleHQuX2ZsdXNoKHRoaXMuX3J1bihhcnJbaV0pKTtcbiAgfSBlbHNlIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKylcbiAgICAgIG91dCArPSB0aGlzLl9ydW4oYXJyW2ldKTtcbiAgfVxuXG4gIGlmICghcHJldk5vdE5ld0xpc3QpXG4gICAgY29udGV4dC5wb3NpdGlvbiA9IHByZXZQb3M7XG5cbiAgcmV0dXJuIG91dDtcbn07XG5cbkJFTUhUTUwucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uIHJlbmRlcihjb250ZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YWcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAganMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVtLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNscyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0cnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCkge1xuICB2YXIgY3R4ID0gY29udGV4dC5jdHg7XG5cbiAgaWYgKHRhZyA9PT0gdW5kZWZpbmVkKVxuICAgIHRhZyA9ICdkaXYnO1xuXG4gIGlmICghdGFnKVxuICAgIHJldHVybiB0aGlzLnJlbmRlck5vVGFnKGNvbnRleHQsIGpzLCBiZW0sIGNscywgbWl4LCBhdHRycywgY29udGVudCk7XG5cbiAgdmFyIG91dCA9ICc8JyArIHRhZztcblxuICBpZiAoanMgPT09IHRydWUpXG4gICAganMgPSB7fTtcblxuICB2YXIganNQYXJhbXM7XG4gIGlmIChqcykge1xuICAgIGpzUGFyYW1zID0ge307XG4gICAganNQYXJhbXNbZW50aXR5LmpzQ2xhc3NdID0ganM7XG4gIH1cblxuICB2YXIgaXNCRU0gPSBiZW07XG4gIGlmIChpc0JFTSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKGN0eC5iZW0gPT09IHVuZGVmaW5lZClcbiAgICAgIGlzQkVNID0gZW50aXR5LmJsb2NrIHx8IGVudGl0eS5lbGVtO1xuICAgIGVsc2VcbiAgICAgIGlzQkVNID0gY3R4LmJlbTtcbiAgfVxuICBpc0JFTSA9ICEhaXNCRU07XG5cbiAgaWYgKGNscyA9PT0gdW5kZWZpbmVkKVxuICAgIGNscyA9IGN0eC5jbHM7XG5cbiAgdmFyIGFkZEpTSW5pdENsYXNzID0ganNQYXJhbXMgJiYgKFxuICAgIHRoaXMuX2VsZW1Kc0luc3RhbmNlcyA/XG4gICAgICAoZW50aXR5LmJsb2NrIHx8IGVudGl0eS5lbGVtKSA6XG4gICAgICAoZW50aXR5LmJsb2NrICYmICFlbnRpdHkuZWxlbSlcbiAgKTtcblxuICBpZiAoIWlzQkVNICYmICFjbHMpIHtcbiAgICByZXR1cm4gdGhpcy5yZW5kZXJDbG9zZShvdXQsIGNvbnRleHQsIHRhZywgYXR0cnMsIGlzQkVNLCBjdHgsIGNvbnRlbnQpO1xuICB9XG5cbiAgb3V0ICs9ICcgY2xhc3M9XCInO1xuICBpZiAoaXNCRU0pIHtcbiAgICB2YXIgbW9kcyA9IGVudGl0eS5lbGVtID8gY29udGV4dC5lbGVtTW9kcyA6IGNvbnRleHQubW9kcztcblxuICAgIG91dCArPSBlbnRpdHkuanNDbGFzcztcbiAgICBvdXQgKz0gdGhpcy5idWlsZE1vZHNDbGFzc2VzKGVudGl0eS5ibG9jaywgZW50aXR5LmVsZW0sIG1vZHMpO1xuXG4gICAgaWYgKG1peCkge1xuICAgICAgdmFyIG0gPSB0aGlzLnJlbmRlck1peChlbnRpdHksIG1peCwganNQYXJhbXMsIGFkZEpTSW5pdENsYXNzKTtcbiAgICAgIG91dCArPSBtLm91dDtcbiAgICAgIGpzUGFyYW1zID0gbS5qc1BhcmFtcztcbiAgICAgIGFkZEpTSW5pdENsYXNzID0gbS5hZGRKU0luaXRDbGFzcztcbiAgICB9XG5cbiAgICBpZiAoY2xzKVxuICAgICAgb3V0ICs9ICcgJyArICh0eXBlb2YgY2xzID09PSAnc3RyaW5nJyA/XG4gICAgICAgICAgICAgICAgICAgIHV0aWxzLmF0dHJFc2NhcGUoY2xzKS50cmltKCkgOiBjbHMpO1xuICB9IGVsc2Uge1xuICAgIGlmIChjbHMpXG4gICAgICBvdXQgKz0gY2xzLnRyaW0gPyB1dGlscy5hdHRyRXNjYXBlKGNscykudHJpbSgpIDogY2xzO1xuICB9XG5cbiAgaWYgKGFkZEpTSW5pdENsYXNzKVxuICAgIG91dCArPSAnIGktYmVtXCInO1xuICBlbHNlXG4gICAgb3V0ICs9ICdcIic7XG5cbiAgaWYgKGlzQkVNICYmIGpzUGFyYW1zKVxuICAgIG91dCArPSAnIGRhdGEtYmVtPVxcJycgKyB1dGlscy5qc0F0dHJFc2NhcGUoSlNPTi5zdHJpbmdpZnkoanNQYXJhbXMpKSArICdcXCcnO1xuXG4gIHJldHVybiB0aGlzLnJlbmRlckNsb3NlKG91dCwgY29udGV4dCwgdGFnLCBhdHRycywgaXNCRU0sIGN0eCwgY29udGVudCk7XG59O1xuXG5CRU1IVE1MLnByb3RvdHlwZS5yZW5kZXJDbG9zZSA9IGZ1bmN0aW9uIHJlbmRlckNsb3NlKHByZWZpeCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRycyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNCRU0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN0eCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCkge1xuICB2YXIgb3V0ID0gcHJlZml4O1xuXG4gIG91dCArPSB0aGlzLnJlbmRlckF0dHJzKGF0dHJzKTtcblxuICBpZiAodXRpbHMuaXNTaG9ydFRhZyh0YWcpKSB7XG4gICAgb3V0ICs9IHRoaXMuX3Nob3J0VGFnQ2xvc2VyO1xuICAgIGlmICh0aGlzLmNhbkZsdXNoKVxuICAgICAgb3V0ID0gY29udGV4dC5fZmx1c2gob3V0KTtcbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJz4nO1xuICAgIGlmICh0aGlzLmNhbkZsdXNoKVxuICAgICAgb3V0ID0gY29udGV4dC5fZmx1c2gob3V0KTtcblxuICAgIC8vIFRPRE8oaW5kdXRueSk6IHNraXAgYXBwbHkgbmV4dCBmbGFnc1xuICAgIGlmIChjb250ZW50IHx8IGNvbnRlbnQgPT09IDApXG4gICAgICBvdXQgKz0gdGhpcy5yZW5kZXJDb250ZW50KGNvbnRlbnQsIGlzQkVNKTtcblxuICAgIG91dCArPSAnPC8nICsgdGFnICsgJz4nO1xuICB9XG5cbiAgaWYgKHRoaXMuY2FuRmx1c2gpXG4gICAgb3V0ID0gY29udGV4dC5fZmx1c2gob3V0KTtcbiAgcmV0dXJuIG91dDtcbn07XG5cbkJFTUhUTUwucHJvdG90eXBlLnJlbmRlckF0dHJzID0gZnVuY3Rpb24gcmVuZGVyQXR0cnMoYXR0cnMpIHtcbiAgdmFyIG91dCA9ICcnO1xuXG4gIC8vIE5PVEU6IG1heWJlIHdlIG5lZWQgdG8gbWFrZSBhbiBhcnJheSBmb3IgcXVpY2tlciBzZXJpYWxpemF0aW9uXG4gIGlmICh1dGlscy5pc09iaihhdHRycykpIHtcblxuICAgIC8qIGpzaGludCBmb3JpbiA6IGZhbHNlICovXG4gICAgZm9yICh2YXIgbmFtZSBpbiBhdHRycykge1xuICAgICAgdmFyIGF0dHIgPSBhdHRyc1tuYW1lXTtcbiAgICAgIGlmIChhdHRyID09PSB1bmRlZmluZWQgfHwgYXR0ciA9PT0gZmFsc2UgfHwgYXR0ciA9PT0gbnVsbClcbiAgICAgICAgY29udGludWU7XG5cbiAgICAgIGlmIChhdHRyID09PSB0cnVlKVxuICAgICAgICBvdXQgKz0gJyAnICsgbmFtZTtcbiAgICAgIGVsc2VcbiAgICAgICAgb3V0ICs9ICcgJyArIG5hbWUgKyAnPVwiJyArXG4gICAgICAgICAgdXRpbHMuYXR0ckVzY2FwZSh1dGlscy5pc1NpbXBsZShhdHRyKSA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29udGV4dC5yZWFwcGx5KGF0dHIpKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAnXCInO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59O1xuXG5CRU1IVE1MLnByb3RvdHlwZS5yZW5kZXJNaXggPSBmdW5jdGlvbiByZW5kZXJNaXgoZW50aXR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1peCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBqc1BhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRKU0luaXRDbGFzcykge1xuICB2YXIgdmlzaXRlZCA9IHt9O1xuICB2YXIgY29udGV4dCA9IHRoaXMuY29udGV4dDtcbiAgdmFyIGpzID0ganNQYXJhbXM7XG4gIHZhciBhZGRJbml0ID0gYWRkSlNJbml0Q2xhc3M7XG5cbiAgdmlzaXRlZFtlbnRpdHkuanNDbGFzc10gPSB0cnVlO1xuXG4gIC8vIFRyYW5zZm9ybSBtaXggdG8gdGhlIHNpbmdsZS1pdGVtIGFycmF5IGlmIGl0J3Mgbm90IGFycmF5XG4gIGlmICghQXJyYXkuaXNBcnJheShtaXgpKVxuICAgIG1peCA9IFsgbWl4IF07XG5cbiAgdmFyIGNsYXNzQnVpbGRlciA9IHRoaXMuY2xhc3NCdWlsZGVyO1xuXG4gIHZhciBvdXQgPSAnJztcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBtaXgubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IG1peFtpXTtcbiAgICBpZiAoIWl0ZW0pXG4gICAgICBjb250aW51ZTtcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKVxuICAgICAgaXRlbSA9IHsgYmxvY2s6IGl0ZW0sIGVsZW06IHVuZGVmaW5lZCB9O1xuXG4gICAgdmFyIGhhc0l0ZW0gPSBmYWxzZTtcblxuICAgIGlmIChpdGVtLmVsZW0pIHtcbiAgICAgIGhhc0l0ZW0gPSBpdGVtLmVsZW0gIT09IGVudGl0eS5lbGVtICYmIGl0ZW0uZWxlbSAhPT0gY29udGV4dC5lbGVtIHx8XG4gICAgICAgIGl0ZW0uYmxvY2sgJiYgaXRlbS5ibG9jayAhPT0gZW50aXR5LmJsb2NrO1xuICAgIH0gZWxzZSBpZiAoaXRlbS5ibG9jaykge1xuICAgICAgaGFzSXRlbSA9ICEoaXRlbS5ibG9jayA9PT0gZW50aXR5LmJsb2NrICYmIGl0ZW0ubW9kcykgfHxcbiAgICAgICAgaXRlbS5tb2RzICYmIGVudGl0eS5lbGVtO1xuICAgIH1cblxuICAgIHZhciBibG9jayA9IGl0ZW0uYmxvY2sgfHwgaXRlbS5fYmxvY2sgfHwgY29udGV4dC5ibG9jaztcbiAgICB2YXIgZWxlbSA9IGl0ZW0uZWxlbSB8fCBpdGVtLl9lbGVtIHx8IGNvbnRleHQuZWxlbTtcbiAgICB2YXIga2V5ID0gY2xhc3NCdWlsZGVyLmJ1aWxkKGJsb2NrLCBlbGVtKTtcblxuICAgIHZhciBjbGFzc0VsZW0gPSBpdGVtLmVsZW0gfHxcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5fZWxlbSB8fFxuICAgICAgICAgICAgICAgICAgICAoaXRlbS5ibG9jayA/IHVuZGVmaW5lZCA6IGNvbnRleHQuZWxlbSk7XG4gICAgaWYgKGhhc0l0ZW0pXG4gICAgICBvdXQgKz0gJyAnICsgY2xhc3NCdWlsZGVyLmJ1aWxkKGJsb2NrLCBjbGFzc0VsZW0pO1xuXG4gICAgb3V0ICs9IHRoaXMuYnVpbGRNb2RzQ2xhc3NlcyhibG9jaywgY2xhc3NFbGVtLFxuICAgICAgKGl0ZW0uZWxlbSB8fCAhaXRlbS5ibG9jayAmJiAoaXRlbS5fZWxlbSB8fCBjb250ZXh0LmVsZW0pKSA/XG4gICAgICAgIGl0ZW0uZWxlbU1vZHMgOiBpdGVtLm1vZHMpO1xuXG4gICAgaWYgKGl0ZW0uanMpIHtcbiAgICAgIGlmICghanMpXG4gICAgICAgIGpzID0ge307XG5cbiAgICAgIGpzW2NsYXNzQnVpbGRlci5idWlsZChibG9jaywgaXRlbS5lbGVtKV0gPVxuICAgICAgICAgIGl0ZW0uanMgPT09IHRydWUgPyB7fSA6IGl0ZW0uanM7XG4gICAgICBpZiAoIWFkZEluaXQpXG4gICAgICAgIGFkZEluaXQgPSBibG9jayAmJiAhaXRlbS5lbGVtO1xuICAgIH1cblxuICAgIC8vIFByb2Nlc3MgbmVzdGVkIG1peGVzXG4gICAgaWYgKCFoYXNJdGVtIHx8IHZpc2l0ZWRba2V5XSlcbiAgICAgIGNvbnRpbnVlO1xuXG4gICAgdmlzaXRlZFtrZXldID0gdHJ1ZTtcbiAgICB2YXIgbmVzdGVkRW50aXR5ID0gdGhpcy5lbnRpdGllc1trZXldO1xuICAgIGlmICghbmVzdGVkRW50aXR5KVxuICAgICAgY29udGludWU7XG5cbiAgICB2YXIgb2xkQmxvY2sgPSBjb250ZXh0LmJsb2NrO1xuICAgIHZhciBvbGRFbGVtID0gY29udGV4dC5lbGVtO1xuICAgIHZhciBuZXN0ZWRNaXggPSBuZXN0ZWRFbnRpdHkubWl4LmV4ZWMoY29udGV4dCk7XG4gICAgY29udGV4dC5lbGVtID0gb2xkRWxlbTtcbiAgICBjb250ZXh0LmJsb2NrID0gb2xkQmxvY2s7XG5cbiAgICBpZiAoIW5lc3RlZE1peClcbiAgICAgIGNvbnRpbnVlO1xuXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBuZXN0ZWRNaXgubGVuZ3RoOyBqKyspIHtcbiAgICAgIHZhciBuZXN0ZWRJdGVtID0gbmVzdGVkTWl4W2pdO1xuICAgICAgaWYgKCFuZXN0ZWRJdGVtKSBjb250aW51ZTtcblxuICAgICAgaWYgKCFuZXN0ZWRJdGVtLmJsb2NrICYmXG4gICAgICAgICAgIW5lc3RlZEl0ZW0uZWxlbSB8fFxuICAgICAgICAgICF2aXNpdGVkW2NsYXNzQnVpbGRlci5idWlsZChuZXN0ZWRJdGVtLmJsb2NrLCBuZXN0ZWRJdGVtLmVsZW0pXSkge1xuICAgICAgICBpZiAobmVzdGVkSXRlbS5ibG9jaykgY29udGludWU7XG5cbiAgICAgICAgbmVzdGVkSXRlbS5fYmxvY2sgPSBibG9jaztcbiAgICAgICAgbmVzdGVkSXRlbS5fZWxlbSA9IGVsZW07XG4gICAgICAgIG1peCA9IG1peC5zbGljZSgwLCBpICsgMSkuY29uY2F0KFxuICAgICAgICAgIG5lc3RlZEl0ZW0sXG4gICAgICAgICAgbWl4LnNsaWNlKGkgKyAxKVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgb3V0OiBvdXQsXG4gICAganNQYXJhbXM6IGpzLFxuICAgIGFkZEpTSW5pdENsYXNzOiBhZGRJbml0XG4gIH07XG59O1xuXG5CRU1IVE1MLnByb3RvdHlwZS5idWlsZE1vZHNDbGFzc2VzID0gZnVuY3Rpb24gYnVpbGRNb2RzQ2xhc3NlcyhibG9jayxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2RzKSB7XG4gIGlmICghbW9kcylcbiAgICByZXR1cm4gJyc7XG5cbiAgdmFyIHJlcyA9ICcnO1xuXG4gIHZhciBtb2ROYW1lO1xuXG4gIC8qanNoaW50IC1XMDg5ICovXG4gIGZvciAobW9kTmFtZSBpbiBtb2RzKSB7XG4gICAgaWYgKCFtb2RzLmhhc093blByb3BlcnR5KG1vZE5hbWUpIHx8IG1vZE5hbWUgPT09ICcnKVxuICAgICAgY29udGludWU7XG5cbiAgICB2YXIgbW9kVmFsID0gbW9kc1ttb2ROYW1lXTtcbiAgICBpZiAoIW1vZFZhbCAmJiBtb2RWYWwgIT09IDApIGNvbnRpbnVlO1xuICAgIGlmICh0eXBlb2YgbW9kVmFsICE9PSAnYm9vbGVhbicpXG4gICAgICBtb2RWYWwgKz0gJyc7XG5cbiAgICB2YXIgYnVpbGRlciA9IHRoaXMuY2xhc3NCdWlsZGVyO1xuICAgIHJlcyArPSAnICcgKyAoZWxlbSA/XG4gICAgICAgICAgICAgICAgICBidWlsZGVyLmJ1aWxkRWxlbUNsYXNzKGJsb2NrLCBlbGVtLCBtb2ROYW1lLCBtb2RWYWwpIDpcbiAgICAgICAgICAgICAgICAgIGJ1aWxkZXIuYnVpbGRCbG9ja0NsYXNzKGJsb2NrLCBtb2ROYW1lLCBtb2RWYWwpKTtcbiAgfVxuXG4gIHJldHVybiByZXM7XG59O1xuXG5CRU1IVE1MLnByb3RvdHlwZS5yZW5kZXJOb1RhZyA9IGZ1bmN0aW9uIHJlbmRlck5vVGFnKGNvbnRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZW0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNscyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWl4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRycyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCkge1xuXG4gIC8vIFRPRE8oaW5kdXRueSk6IHNraXAgYXBwbHkgbmV4dCBmbGFnc1xuICBpZiAoY29udGVudCB8fCBjb250ZW50ID09PSAwKVxuICAgIHJldHVybiB0aGlzLl9ydW4oY29udGVudCk7XG4gIHJldHVybiAnJztcbn07XG4iLCJmdW5jdGlvbiBDbGFzc0J1aWxkZXIob3B0aW9ucykge1xuICB0aGlzLm1vZERlbGltID0gb3B0aW9ucy5tb2QgfHwgJ18nO1xuICB0aGlzLmVsZW1EZWxpbSA9IG9wdGlvbnMuZWxlbSB8fCAnX18nO1xufVxuZXhwb3J0cy5DbGFzc0J1aWxkZXIgPSBDbGFzc0J1aWxkZXI7XG5cbkNsYXNzQnVpbGRlci5wcm90b3R5cGUuYnVpbGQgPSBmdW5jdGlvbiBidWlsZChibG9jaywgZWxlbSkge1xuICBpZiAoIWVsZW0pXG4gICAgcmV0dXJuIGJsb2NrO1xuICBlbHNlXG4gICAgcmV0dXJuIGJsb2NrICsgdGhpcy5lbGVtRGVsaW0gKyBlbGVtO1xufTtcblxuQ2xhc3NCdWlsZGVyLnByb3RvdHlwZS5idWlsZE1vZFBvc3RmaXggPSBmdW5jdGlvbiBidWlsZE1vZFBvc3RmaXgobW9kTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZFZhbCkge1xuICB2YXIgcmVzID0gdGhpcy5tb2REZWxpbSArIG1vZE5hbWU7XG4gIGlmIChtb2RWYWwgIT09IHRydWUpIHJlcyArPSB0aGlzLm1vZERlbGltICsgbW9kVmFsO1xuICByZXR1cm4gcmVzO1xufTtcblxuQ2xhc3NCdWlsZGVyLnByb3RvdHlwZS5idWlsZEJsb2NrQ2xhc3MgPSBmdW5jdGlvbiBidWlsZEJsb2NrQ2xhc3MobmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZE5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2RWYWwpIHtcbiAgdmFyIHJlcyA9IG5hbWU7XG4gIGlmIChtb2RWYWwpIHJlcyArPSB0aGlzLmJ1aWxkTW9kUG9zdGZpeChtb2ROYW1lLCBtb2RWYWwpO1xuICByZXR1cm4gcmVzO1xufTtcblxuQ2xhc3NCdWlsZGVyLnByb3RvdHlwZS5idWlsZEVsZW1DbGFzcyA9IGZ1bmN0aW9uIGJ1aWxkRWxlbUNsYXNzKGJsb2NrLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbW9kTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2RWYWwpIHtcbiAgdmFyIHJlcyA9IHRoaXMuYnVpbGRCbG9ja0NsYXNzKGJsb2NrKSArIHRoaXMuZWxlbURlbGltICsgbmFtZTtcbiAgaWYgKG1vZFZhbCkgcmVzICs9IHRoaXMuYnVpbGRNb2RQb3N0Zml4KG1vZE5hbWUsIG1vZFZhbCk7XG4gIHJldHVybiByZXM7XG59O1xuXG5DbGFzc0J1aWxkZXIucHJvdG90eXBlLnNwbGl0ID0gZnVuY3Rpb24gc3BsaXQoa2V5KSB7XG4gIHJldHVybiBrZXkuc3BsaXQodGhpcy5lbGVtRGVsaW0sIDIpO1xufTtcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuZnVuY3Rpb24gQ29udGV4dChiZW14anN0KSB7XG4gIHRoaXMuX2JlbXhqc3QgPSBiZW14anN0O1xuXG4gIHRoaXMuY3R4ID0gbnVsbDtcbiAgdGhpcy5ibG9jayA9ICcnO1xuXG4gIC8vIFNhdmUgY3VycmVudCBibG9jayB1bnRpbCB0aGUgbmV4dCBCRU0gZW50aXR5XG4gIHRoaXMuX2N1cnJCbG9jayA9ICcnO1xuXG4gIHRoaXMuZWxlbSA9IG51bGw7XG4gIHRoaXMubW9kcyA9IHt9O1xuICB0aGlzLmVsZW1Nb2RzID0ge307XG5cbiAgdGhpcy5wb3NpdGlvbiA9IDA7XG4gIHRoaXMuX2xpc3RMZW5ndGggPSAwO1xuICB0aGlzLl9ub3ROZXdMaXN0ID0gZmFsc2U7XG5cbiAgLy8gKG1pcmlwaXJ1bmkpIHRoaXMgd2lsbCBiZSBjaGFuZ2VkIGluIG5leHQgbWFqb3IgcmVsZWFzZVxuICB0aGlzLmVzY2FwZUNvbnRlbnQgPSBiZW14anN0Lm9wdGlvbnMuZXNjYXBlQ29udGVudCAhPT0gZmFsc2U7XG5cbiAgLy8gVXNlZCBpbiBgT25jZU1hdGNoYCBjaGVjayB0byBkZXRlY3QgY29udGV4dCBjaGFuZ2VcbiAgdGhpcy5fb25jZVJlZiA9IHt9O1xufVxuZXhwb3J0cy5Db250ZXh0ID0gQ29udGV4dDtcblxuQ29udGV4dC5wcm90b3R5cGUuX2ZsdXNoID0gbnVsbDtcblxuQ29udGV4dC5wcm90b3R5cGUuaXNTaW1wbGUgPSB1dGlscy5pc1NpbXBsZTtcblxuQ29udGV4dC5wcm90b3R5cGUuaXNTaG9ydFRhZyA9IHV0aWxzLmlzU2hvcnRUYWc7XG5Db250ZXh0LnByb3RvdHlwZS5leHRlbmQgPSB1dGlscy5leHRlbmQ7XG5Db250ZXh0LnByb3RvdHlwZS5pZGVudGlmeSA9IHV0aWxzLmlkZW50aWZ5O1xuXG5Db250ZXh0LnByb3RvdHlwZS54bWxFc2NhcGUgPSB1dGlscy54bWxFc2NhcGU7XG5Db250ZXh0LnByb3RvdHlwZS5hdHRyRXNjYXBlID0gdXRpbHMuYXR0ckVzY2FwZTtcbkNvbnRleHQucHJvdG90eXBlLmpzQXR0ckVzY2FwZSA9IHV0aWxzLmpzQXR0ckVzY2FwZTtcblxuQ29udGV4dC5wcm90b3R5cGUuaXNGaXJzdCA9IGZ1bmN0aW9uIGlzRmlyc3QoKSB7XG4gIHJldHVybiB0aGlzLnBvc2l0aW9uID09PSAxO1xufTtcblxuQ29udGV4dC5wcm90b3R5cGUuaXNMYXN0ID0gZnVuY3Rpb24gaXNMYXN0KCkge1xuICByZXR1cm4gdGhpcy5wb3NpdGlvbiA9PT0gdGhpcy5fbGlzdExlbmd0aDtcbn07XG5cbkNvbnRleHQucHJvdG90eXBlLmdlbmVyYXRlSWQgPSBmdW5jdGlvbiBnZW5lcmF0ZUlkKCkge1xuICByZXR1cm4gdXRpbHMuaWRlbnRpZnkodGhpcy5jdHgpO1xufTtcblxuQ29udGV4dC5wcm90b3R5cGUucmVhcHBseSA9IGZ1bmN0aW9uIHJlYXBwbHkoY3R4KSB7XG4gIHJldHVybiB0aGlzLl9iZW14anN0LnJ1bihjdHgpO1xufTtcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBNYXRjaCA9IHJlcXVpcmUoJy4vbWF0Y2gnKS5NYXRjaDtcbnZhciB0cmVlID0gcmVxdWlyZSgnLi90cmVlJyk7XG52YXIgVGVtcGxhdGUgPSB0cmVlLlRlbXBsYXRlO1xudmFyIFByb3BlcnR5TWF0Y2ggPSB0cmVlLlByb3BlcnR5TWF0Y2g7XG52YXIgQ29tcGlsZXJPcHRpb25zID0gdHJlZS5Db21waWxlck9wdGlvbnM7XG5cbmZ1bmN0aW9uIEVudGl0eShiZW14anN0LCBibG9jaywgZWxlbSwgdGVtcGxhdGVzKSB7XG4gIHRoaXMuYmVteGpzdCA9IGJlbXhqc3Q7XG5cbiAgdGhpcy5ibG9jayA9IG51bGw7XG4gIHRoaXMuZWxlbSA9IG51bGw7XG5cbiAgLy8gQ29tcGlsZXIgb3B0aW9ucyB2aWEgYHhqc3RPcHRpb25zKClgXG4gIHRoaXMub3B0aW9ucyA9IHt9O1xuXG4gIC8vIGB0cnVlYCBpZiBlbnRpdHkgaGFzIGp1c3QgYSBkZWZhdWx0IHJlbmRlcmVyIGZvciBgZGVmKClgIG1vZGVcbiAgdGhpcy5jYW5GbHVzaCA9IHRydWU7XG5cbiAgLy8gXCJGYXN0IG1vZGVzXCJcbiAgdGhpcy5kZWYgPSBuZXcgTWF0Y2godGhpcyk7XG4gIHRoaXMuY29udGVudCA9IG5ldyBNYXRjaCh0aGlzLCAnY29udGVudCcpO1xuXG4gIC8vIFwiU2xvdyBtb2Rlc1wiXG4gIHRoaXMucmVzdCA9IHt9O1xuXG4gIC8vIEluaXRpYWxpemVcbiAgdGhpcy5pbml0KGJsb2NrLCBlbGVtKTtcbiAgdGhpcy5pbml0TW9kZXModGVtcGxhdGVzKTtcbn1cbmV4cG9ydHMuRW50aXR5ID0gRW50aXR5O1xuXG5FbnRpdHkucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiBpbml0KGJsb2NrLCBlbGVtKSB7XG4gIHRoaXMuYmxvY2sgPSBibG9jaztcbiAgdGhpcy5lbGVtID0gZWxlbTtcbn07XG5cbmZ1bmN0aW9uIGNvbnRlbnRNb2RlKCkge1xuICByZXR1cm4gdGhpcy5jdHguY29udGVudDtcbn1cblxuRW50aXR5LnByb3RvdHlwZS5pbml0TW9kZXMgPSBmdW5jdGlvbiBpbml0TW9kZXModGVtcGxhdGVzKSB7XG4gIC8qIGpzaGludCBtYXhkZXB0aCA6IGZhbHNlICovXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGVtcGxhdGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHRlbXBsYXRlID0gdGVtcGxhdGVzW2ldO1xuXG4gICAgZm9yICh2YXIgaiA9IHRlbXBsYXRlLnByZWRpY2F0ZXMubGVuZ3RoIC0gMTsgaiA+PSAwOyBqLS0pIHtcbiAgICAgIHZhciBwcmVkID0gdGVtcGxhdGUucHJlZGljYXRlc1tqXTtcbiAgICAgIGlmICghKHByZWQgaW5zdGFuY2VvZiBQcm9wZXJ0eU1hdGNoKSlcbiAgICAgICAgY29udGludWU7XG5cbiAgICAgIGlmIChwcmVkLmtleSAhPT0gJ19tb2RlJylcbiAgICAgICAgY29udGludWU7XG5cbiAgICAgIHRlbXBsYXRlLnByZWRpY2F0ZXMuc3BsaWNlKGosIDEpO1xuICAgICAgdGhpcy5faW5pdFJlc3QocHJlZC52YWx1ZSk7XG5cbiAgICAgIC8vIEFsbCB0ZW1wbGF0ZXMgc2hvdWxkIGdvIHRoZXJlIGFueXdheVxuICAgICAgdGhpcy5yZXN0W3ByZWQudmFsdWVdLnB1c2godGVtcGxhdGUpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKGogPT09IC0xKVxuICAgICAgdGhpcy5kZWYucHVzaCh0ZW1wbGF0ZSk7XG5cbiAgICAvLyBNZXJnZSBjb21waWxlciBvcHRpb25zXG4gICAgZm9yICh2YXIgaiA9IHRlbXBsYXRlLnByZWRpY2F0ZXMubGVuZ3RoIC0gMTsgaiA+PSAwOyBqLS0pIHtcbiAgICAgIHZhciBwcmVkID0gdGVtcGxhdGUucHJlZGljYXRlc1tqXTtcbiAgICAgIGlmICghKHByZWQgaW5zdGFuY2VvZiBDb21waWxlck9wdGlvbnMpKVxuICAgICAgICBjb250aW51ZTtcblxuICAgICAgdGhpcy5vcHRpb25zID0gdXRpbHMuZXh0ZW5kKHRoaXMub3B0aW9ucywgcHJlZC5vcHRpb25zKTtcbiAgICB9XG4gIH1cbn07XG5cbkVudGl0eS5wcm90b3R5cGUucHJlcGVuZCA9IGZ1bmN0aW9uIHByZXBlbmQob3RoZXIpIHtcbiAgLy8gUHJlcGVuZCB0byB0aGUgc2xvdyBtb2RlcywgZmFzdCBtb2RlcyBhcmUgaW4gdGhpcyBoYXNobWFwIHRvbyBhbnl3YXlcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnJlc3QpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICBpZiAoIW90aGVyLnJlc3Rba2V5XSlcbiAgICAgIGNvbnRpbnVlO1xuXG4gICAgdGhpcy5yZXN0W2tleV0ucHJlcGVuZChvdGhlci5yZXN0W2tleV0pO1xuICB9XG5cbiAgLy8gQWRkIG5ldyBzbG93IG1vZGVzXG4gIGtleXMgPSBPYmplY3Qua2V5cyhvdGhlci5yZXN0KTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgaWYgKHRoaXMucmVzdFtrZXldKVxuICAgICAgY29udGludWU7XG5cbiAgICB0aGlzLl9pbml0UmVzdChrZXkpO1xuICAgIHRoaXMucmVzdFtrZXldLnByZXBlbmQob3RoZXIucmVzdFtrZXldKTtcbiAgfVxufTtcblxuLy8gTk9URTogVGhpcyBjb3VsZCBiZSBwb3RlbnRpYWxseSBjb21waWxlZCBpbnRvIGlubGluZWQgaW52b2thdGlvbnNcbkVudGl0eS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gcnVuKGNvbnRleHQpIHtcbiAgaWYgKHRoaXMuZGVmLmNvdW50ICE9PSAwKVxuICAgIHJldHVybiB0aGlzLmRlZi5leGVjKGNvbnRleHQpO1xuXG4gIHJldHVybiB0aGlzLmRlZmF1bHRCb2R5KGNvbnRleHQpO1xufTtcblxuRW50aXR5LnByb3RvdHlwZS5zZXREZWZhdWx0cyA9IGZ1bmN0aW9uIHNldERlZmF1bHRzKCkge1xuICAvLyBEZWZhdWx0IC5jb250ZW50KCkgdGVtcGxhdGUgZm9yIGFwcGx5TmV4dCgpXG4gIGlmICh0aGlzLmNvbnRlbnQuY291bnQgIT09IDApXG4gICAgdGhpcy5jb250ZW50LnB1c2gobmV3IFRlbXBsYXRlKFtdLCBjb250ZW50TW9kZSkpO1xuXG4gIC8vIC5kZWYoKSBkZWZhdWx0XG4gIGlmICh0aGlzLmRlZi5jb3VudCAhPT0gMCkge1xuICAgIHRoaXMuY2FuRmx1c2ggPSB0aGlzLm9wdGlvbnMuZmx1c2ggfHwgZmFsc2U7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuZGVmLnB1c2gobmV3IFRlbXBsYXRlKFtdLCBmdW5jdGlvbiBkZWZhdWx0Qm9keVByb3h5KCkge1xuICAgICAgcmV0dXJuIHNlbGYuZGVmYXVsdEJvZHkodGhpcyk7XG4gICAgfSkpO1xuICB9XG59O1xuIiwiZnVuY3Rpb24gQkVNWEpTVEVycm9yKG1zZywgZnVuYykge1xuICB0aGlzLm5hbWUgPSAnQkVNWEpTVEVycm9yJztcbiAgdGhpcy5tZXNzYWdlID0gbXNnO1xuXG4gIGlmIChFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSlcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBmdW5jIHx8IHRoaXMuY29uc3RydWN0b3IpO1xuICBlbHNlXG4gICAgdGhpcy5zdGFjayA9IChuZXcgRXJyb3IoKSkuc3RhY2s7XG59XG5cbkJFTVhKU1RFcnJvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVycm9yLnByb3RvdHlwZSk7XG5CRU1YSlNURXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQkVNWEpTVEVycm9yO1xuXG5leHBvcnRzLkJFTVhKU1RFcnJvciA9IEJFTVhKU1RFcnJvcjtcbiIsInZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbnZhciBUcmVlID0gcmVxdWlyZSgnLi90cmVlJykuVHJlZTtcbnZhciBQcm9wZXJ0eU1hdGNoID0gcmVxdWlyZSgnLi90cmVlJykuUHJvcGVydHlNYXRjaDtcbnZhciBBZGRNYXRjaCA9IHJlcXVpcmUoJy4vdHJlZScpLkFkZE1hdGNoO1xudmFyIENvbnRleHQgPSByZXF1aXJlKCcuL2NvbnRleHQnKS5Db250ZXh0O1xudmFyIENsYXNzQnVpbGRlciA9IHJlcXVpcmUoJy4vY2xhc3MtYnVpbGRlcicpLkNsYXNzQnVpbGRlcjtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuZnVuY3Rpb24gQkVNWEpTVChvcHRpb25zKSB7XG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgdGhpcy5lbnRpdGllcyA9IG51bGw7XG4gIHRoaXMuZGVmYXVsdEVudCA9IG51bGw7XG5cbiAgLy8gQ3VycmVudCB0cmVlXG4gIHRoaXMudHJlZSA9IG51bGw7XG5cbiAgLy8gQ3VycmVudCBtYXRjaFxuICB0aGlzLm1hdGNoID0gbnVsbDtcblxuICAvLyBDcmVhdGUgbmV3IENvbnRleHQgY29uc3RydWN0b3IgZm9yIG92ZXJyaWRpbmcgcHJvdG90eXBlXG4gIHRoaXMuY29udGV4dENvbnN0cnVjdG9yID0gZnVuY3Rpb24gQ29udGV4dENoaWxkKGJlbXhqc3QpIHtcbiAgICBDb250ZXh0LmNhbGwodGhpcywgYmVteGpzdCk7XG4gIH07XG4gIGluaGVyaXRzKHRoaXMuY29udGV4dENvbnN0cnVjdG9yLCBDb250ZXh0KTtcbiAgdGhpcy5jb250ZXh0ID0gbnVsbDtcblxuICB0aGlzLmNsYXNzQnVpbGRlciA9IG5ldyBDbGFzc0J1aWxkZXIodGhpcy5vcHRpb25zLm5hbWluZyB8fCB7fSk7XG5cbiAgLy8gRXhlY3V0aW9uIGRlcHRoLCB1c2VkIHRvIGludmFsaWRhdGUgYGFwcGx5TmV4dGAgYml0ZmllbGRzXG4gIHRoaXMuZGVwdGggPSAwO1xuXG4gIC8vIERvIG5vdCBjYWxsIGBfZmx1c2hgIG9uIG92ZXJyaWRkZW4gYGRlZigpYCBtb2RlXG4gIHRoaXMuY2FuRmx1c2ggPSBmYWxzZTtcblxuICAvLyBvbmluaXQgdGVtcGxhdGVzXG4gIHRoaXMub25pbml0ID0gbnVsbDtcblxuICAvLyBJbml0aWFsaXplIGRlZmF1bHQgZW50aXR5IChubyBibG9jay9lbGVtIG1hdGNoKVxuICB0aGlzLmRlZmF1bHRFbnQgPSBuZXcgdGhpcy5FbnRpdHkodGhpcywgJycsICcnLCBbXSk7XG4gIHRoaXMuZGVmYXVsdEVsZW1FbnQgPSBuZXcgdGhpcy5FbnRpdHkodGhpcywgJycsICcnLCBbXSk7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEJFTVhKU1Q7XG5cbkJFTVhKU1QucHJvdG90eXBlLmxvY2FscyA9IFRyZWUubWV0aG9kc1xuICAgIC5jb25jYXQoJ2xvY2FsJywgJ2FwcGx5Q3R4JywgJ2FwcGx5TmV4dCcsICdhcHBseScpO1xuXG5CRU1YSlNULnByb3RvdHlwZS5jb21waWxlID0gZnVuY3Rpb24gY29tcGlsZShjb2RlKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBmdW5jdGlvbiBhcHBseUN0eCgpIHtcbiAgICByZXR1cm4gc2VsZi5fcnVuKHNlbGYuY29udGV4dC5jdHgpO1xuICB9XG5cbiAgZnVuY3Rpb24gYXBwbHlDdHhXcmFwKGN0eCwgY2hhbmdlcykge1xuICAgIC8vIEZhc3QgY2FzZVxuICAgIGlmICghY2hhbmdlcylcbiAgICAgIHJldHVybiBzZWxmLmxvY2FsKHsgY3R4OiBjdHggfSwgYXBwbHlDdHgpO1xuXG4gICAgcmV0dXJuIHNlbGYubG9jYWwoY2hhbmdlcywgZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gc2VsZi5sb2NhbCh7IGN0eDogY3R4IH0sIGFwcGx5Q3R4KTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFwcGx5KG1vZGUsIGNoYW5nZXMpIHtcbiAgICByZXR1cm4gc2VsZi5hcHBseU1vZGUobW9kZSwgY2hhbmdlcyk7XG4gIH1cblxuICBmdW5jdGlvbiBsb2NhbFdyYXAoY2hhbmdlcykge1xuICAgIHJldHVybiBmdW5jdGlvbiBsb2NhbEJvZHkoYm9keSkge1xuICAgICAgcmV0dXJuIHNlbGYubG9jYWwoY2hhbmdlcywgYm9keSk7XG4gICAgfTtcbiAgfVxuXG4gIHZhciB0cmVlID0gbmV3IFRyZWUoe1xuICAgIHJlZnM6IHtcbiAgICAgIGFwcGx5Q3R4OiBhcHBseUN0eFdyYXAsXG4gICAgICBsb2NhbDogbG9jYWxXcmFwLFxuICAgICAgYXBwbHk6IGFwcGx5XG4gICAgfVxuICB9KTtcblxuICAvLyBZZWFoLCBsZXQgcGVvcGxlIHBhc3MgZnVuY3Rpb25zIHRvIHVzIVxuICB2YXIgdGVtcGxhdGVzID0gdGhpcy5yZWNvbXBpbGVJbnB1dChjb2RlKTtcblxuICB2YXIgb3V0ID0gdHJlZS5idWlsZCh0ZW1wbGF0ZXMsIFtcbiAgICBsb2NhbFdyYXAsXG4gICAgYXBwbHlDdHhXcmFwLFxuICAgIGZ1bmN0aW9uIGFwcGx5TmV4dFdyYXAoY2hhbmdlcykge1xuICAgICAgaWYgKGNoYW5nZXMpXG4gICAgICAgIHJldHVybiBzZWxmLmxvY2FsKGNoYW5nZXMsIGFwcGx5TmV4dFdyYXApO1xuICAgICAgcmV0dXJuIHNlbGYuYXBwbHlOZXh0KCk7XG4gICAgfSxcbiAgICBhcHBseVxuICBdKTtcblxuICAvLyBDb25jYXRlbmF0ZSB0ZW1wbGF0ZXMgd2l0aCBleGlzdGluZyBvbmVzXG4gIC8vIFRPRE8oaW5kdXRueSk6IGl0IHNob3VsZCBiZSBwb3NzaWJsZSB0byBpbmNyZW1lbnRhbGx5IGFkZCB0ZW1wbGF0ZXNcbiAgaWYgKHRoaXMudHJlZSkge1xuICAgIG91dCA9IHtcbiAgICAgIHRlbXBsYXRlczogb3V0LnRlbXBsYXRlcy5jb25jYXQodGhpcy50cmVlLnRlbXBsYXRlcyksXG4gICAgICBvbmluaXQ6IHRoaXMudHJlZS5vbmluaXQuY29uY2F0KG91dC5vbmluaXQpXG4gICAgfTtcbiAgfVxuICB0aGlzLnRyZWUgPSBvdXQ7XG5cbiAgLy8gR3JvdXAgYmxvY2srZWxlbSBlbnRpdGllcyBpbnRvIGEgaGFzaG1hcFxuICB2YXIgZW50ID0gdGhpcy5ncm91cEVudGl0aWVzKG91dC50ZW1wbGF0ZXMpO1xuXG4gIC8vIFRyYW5zZm9ybSBlbnRpdGllcyBmcm9tIGFycmF5cyB0byBFbnRpdHkgaW5zdGFuY2VzXG4gIGVudCA9IHRoaXMudHJhbnNmb3JtRW50aXRpZXMoZW50KTtcblxuICB0aGlzLmVudGl0aWVzID0gZW50O1xuICB0aGlzLm9uaW5pdCA9IG91dC5vbmluaXQ7XG59O1xuXG5CRU1YSlNULnByb3RvdHlwZS5yZWNvbXBpbGVJbnB1dCA9IGZ1bmN0aW9uIHJlY29tcGlsZUlucHV0KGNvZGUpIHtcbiAgdmFyIGFyZ3MgPSBCRU1YSlNULnByb3RvdHlwZS5sb2NhbHM7XG4gIC8vIFJldXNlIGZ1bmN0aW9uIGlmIGl0IGFscmVhZHkgaGFzIHJpZ2h0IGFyZ3VtZW50c1xuICBpZiAodHlwZW9mIGNvZGUgPT09ICdmdW5jdGlvbicgJiYgY29kZS5sZW5ndGggPT09IGFyZ3MubGVuZ3RoKVxuICAgIHJldHVybiBjb2RlO1xuXG4gIHZhciBvdXQgPSBjb2RlLnRvU3RyaW5nKCk7XG5cbiAgLy8gU3RyaXAgdGhlIGZ1bmN0aW9uXG4gIG91dCA9IG91dC5yZXBsYWNlKC9eZnVuY3Rpb25bXntdK3t8fSQvZywgJycpO1xuXG4gIC8vIEFuZCByZWNvbXBpbGUgaXQgd2l0aCByaWdodCBhcmd1bWVudHNcbiAgb3V0ID0gbmV3IEZ1bmN0aW9uKGFyZ3Muam9pbignLCAnKSwgb3V0KTtcblxuICByZXR1cm4gb3V0O1xufTtcblxuQkVNWEpTVC5wcm90b3R5cGUuZ3JvdXBFbnRpdGllcyA9IGZ1bmN0aW9uIGdyb3VwRW50aXRpZXModHJlZSkge1xuICB2YXIgcmVzID0ge307XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdHJlZS5sZW5ndGg7IGkrKykge1xuICAgIC8vIE1ha2Ugc3VyZSB0byBjaGFuZ2Ugb25seSB0aGUgY29weSwgdGhlIG9yaWdpbmFsIGlzIGNhY2hlZCBpbiBgdGhpcy50cmVlYFxuICAgIHZhciB0ZW1wbGF0ZSA9IHRyZWVbaV0uY2xvbmUoKTtcbiAgICB2YXIgYmxvY2sgPSBudWxsO1xuICAgIHZhciBlbGVtO1xuXG4gICAgZWxlbSA9IHVuZGVmaW5lZDtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHRlbXBsYXRlLnByZWRpY2F0ZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgIHZhciBwcmVkID0gdGVtcGxhdGUucHJlZGljYXRlc1tqXTtcbiAgICAgIGlmICghKHByZWQgaW5zdGFuY2VvZiBQcm9wZXJ0eU1hdGNoKSAmJlxuICAgICAgICAhKHByZWQgaW5zdGFuY2VvZiBBZGRNYXRjaCkpXG4gICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICBpZiAocHJlZC5rZXkgPT09ICdibG9jaycpXG4gICAgICAgIGJsb2NrID0gcHJlZC52YWx1ZTtcbiAgICAgIGVsc2UgaWYgKHByZWQua2V5ID09PSAnZWxlbScpXG4gICAgICAgIGVsZW0gPSBwcmVkLnZhbHVlO1xuICAgICAgZWxzZVxuICAgICAgICBjb250aW51ZTtcblxuICAgICAgLy8gUmVtb3ZlIHByZWRpY2F0ZSwgd2Ugd29uJ3QgbXVjaCBhZ2FpbnN0IGl0XG4gICAgICB0ZW1wbGF0ZS5wcmVkaWNhdGVzLnNwbGljZShqLCAxKTtcbiAgICAgIGotLTtcbiAgICB9XG5cbiAgICBpZiAoYmxvY2sgPT09IG51bGwpIHtcbiAgICAgIHZhciBtc2cgPSAnYmxvY2so4oCmKSBzdWJwcmVkaWNhdGUgaXMgbm90IGZvdW5kLlxcbicgK1xuICAgICAgJyAgICBTZWUgdGVtcGxhdGUgd2l0aCBzdWJwcmVkaWNhdGVzOlxcbiAgICAgKiAnO1xuXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHRlbXBsYXRlLnByZWRpY2F0ZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdmFyIHByZWQgPSB0ZW1wbGF0ZS5wcmVkaWNhdGVzW2pdO1xuXG4gICAgICAgIGlmIChqICE9PSAwKVxuICAgICAgICAgIG1zZyArPSAnXFxuICAgICAqICc7XG5cbiAgICAgICAgaWYgKHByZWQua2V5ID09PSAnX21vZGUnKSB7XG4gICAgICAgICAgbXNnICs9IHByZWQudmFsdWUgKyAnKCknO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHByZWQua2V5KSkge1xuICAgICAgICAgICAgbXNnICs9IHByZWQua2V5WzBdLnJlcGxhY2UoJ21vZHMnLCAnbW9kJylcbiAgICAgICAgICAgICAgLnJlcGxhY2UoJ2VsZW1Nb2RzJywgJ2VsZW1Nb2QnKSArXG4gICAgICAgICAgICAgICcoXFwnJyArIHByZWQua2V5WzFdICsgJ1xcJywgXFwnJyArIHByZWQudmFsdWUgKyAnXFwnKSc7XG4gICAgICAgICAgfSBlbHNlIGlmICghcHJlZC52YWx1ZSB8fCAhcHJlZC5rZXkpIHtcbiAgICAgICAgICAgIG1zZyArPSAnbWF0Y2go4oCmKSc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1zZyArPSBwcmVkLmtleSArICcoXFwnJyArIHByZWQudmFsdWUgKyAnXFwnKSc7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIG1zZyArPSAnXFxuICAgIEFuZCB0ZW1wbGF0ZSBib2R5OiBcXG4gICAgKCcgK1xuICAgICAgICAodHlwZW9mIHRlbXBsYXRlLmJvZHkgPT09ICdmdW5jdGlvbicgP1xuICAgICAgICAgIHRlbXBsYXRlLmJvZHkgOlxuICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHRlbXBsYXRlLmJvZHkpKSArICcpJztcblxuICAgICAgaWYgKHR5cGVvZiBCRU1YSlNURXJyb3IgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIEJFTVhKU1RFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3InKS5CRU1YSlNURXJyb3I7XG4gICAgICB9XG5cbiAgICAgIHRocm93IG5ldyBCRU1YSlNURXJyb3IobXNnKTtcbiAgICB9XG5cbiAgICB2YXIga2V5ID0gdGhpcy5jbGFzc0J1aWxkZXIuYnVpbGQoYmxvY2ssIGVsZW0pO1xuXG4gICAgaWYgKCFyZXNba2V5XSlcbiAgICAgIHJlc1trZXldID0gW107XG4gICAgcmVzW2tleV0ucHVzaCh0ZW1wbGF0ZSk7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn07XG5cbkJFTVhKU1QucHJvdG90eXBlLnRyYW5zZm9ybUVudGl0aWVzID0gZnVuY3Rpb24gdHJhbnNmb3JtRW50aXRpZXMoZW50aXRpZXMpIHtcbiAgdmFyIHdpbGRjYXJkRWxlbXMgPSBbXTtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGVudGl0aWVzKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGtleSA9IGtleXNbaV07XG5cbiAgICAvLyBUT0RPKGluZHV0bnkpOiBwYXNzIHRoaXMgdmFsdWVzIG92ZXJcbiAgICB2YXIgcGFydHMgPSB0aGlzLmNsYXNzQnVpbGRlci5zcGxpdChrZXkpO1xuICAgIHZhciBibG9jayA9IHBhcnRzWzBdO1xuICAgIHZhciBlbGVtID0gcGFydHNbMV07XG5cbiAgICBpZiAoZWxlbSA9PT0gJyonKVxuICAgICAgd2lsZGNhcmRFbGVtcy5wdXNoKGJsb2NrKTtcblxuICAgIGVudGl0aWVzW2tleV0gPSBuZXcgdGhpcy5FbnRpdHkoXG4gICAgICB0aGlzLCBibG9jaywgZWxlbSwgZW50aXRpZXNba2V5XSk7XG4gIH1cblxuICAvLyBNZXJnZSB3aWxkY2FyZCBibG9jayB0ZW1wbGF0ZXNcbiAgaWYgKGVudGl0aWVzLmhhc093blByb3BlcnR5KCcqJykpIHtcbiAgICB2YXIgd2lsZGNhcmQgPSBlbnRpdGllc1snKiddO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICBpZiAoa2V5ID09PSAnKicpXG4gICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICBlbnRpdGllc1trZXldLnByZXBlbmQod2lsZGNhcmQpO1xuICAgIH1cbiAgICB0aGlzLmRlZmF1bHRFbnQucHJlcGVuZCh3aWxkY2FyZCk7XG4gICAgdGhpcy5kZWZhdWx0RWxlbUVudC5wcmVwZW5kKHdpbGRjYXJkKTtcbiAgfVxuXG4gIC8vIE1lcmdlIHdpbGRjYXJkIGVsZW0gdGVtcGxhdGVzXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgd2lsZGNhcmRFbGVtcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBibG9jayA9IHdpbGRjYXJkRWxlbXNbaV07XG4gICAgdmFyIHdpbGRjYXJkS2V5ID0gdGhpcy5jbGFzc0J1aWxkZXIuYnVpbGQoYmxvY2ssICcqJyk7XG4gICAgdmFyIHdpbGRjYXJkID0gZW50aXRpZXNbd2lsZGNhcmRLZXldO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICBpZiAoa2V5ID09PSB3aWxkY2FyZEtleSlcbiAgICAgICAgY29udGludWU7XG5cbiAgICAgIHZhciBlbnRpdHkgPSBlbnRpdGllc1trZXldO1xuICAgICAgaWYgKGVudGl0eS5ibG9jayAhPT0gYmxvY2spXG4gICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICBpZiAoZW50aXR5LmVsZW0gPT09IHVuZGVmaW5lZClcbiAgICAgICAgY29udGludWU7XG5cbiAgICAgIGVudGl0aWVzW2tleV0ucHJlcGVuZCh3aWxkY2FyZCk7XG4gICAgfVxuICAgIHRoaXMuZGVmYXVsdEVsZW1FbnQucHJlcGVuZCh3aWxkY2FyZCk7XG4gIH1cblxuICAvLyBTZXQgZGVmYXVsdCB0ZW1wbGF0ZXMgYWZ0ZXIgbWVyZ2luZyB3aXRoIHdpbGRjYXJkXG4gIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgIGVudGl0aWVzW2tleV0uc2V0RGVmYXVsdHMoKTtcbiAgICB0aGlzLmRlZmF1bHRFbnQuc2V0RGVmYXVsdHMoKTtcbiAgICB0aGlzLmRlZmF1bHRFbGVtRW50LnNldERlZmF1bHRzKCk7XG4gIH1cblxuICByZXR1cm4gZW50aXRpZXM7XG59O1xuXG5CRU1YSlNULnByb3RvdHlwZS5fcnVuID0gZnVuY3Rpb24gX3J1bihjb250ZXh0KSB7XG4gIHZhciByZXM7XG4gIGlmIChjb250ZXh0ID09PSB1bmRlZmluZWQgfHwgY29udGV4dCA9PT0gJycgfHwgY29udGV4dCA9PT0gbnVsbClcbiAgICByZXMgPSB0aGlzLnJ1bkVtcHR5KCk7XG4gIGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoY29udGV4dCkpXG4gICAgcmVzID0gdGhpcy5ydW5NYW55KGNvbnRleHQpO1xuICBlbHNlIGlmIChcbiAgICB0eXBlb2YgY29udGV4dC5odG1sID09PSAnc3RyaW5nJyAmJlxuICAgICFjb250ZXh0LnRhZyAmJlxuICAgIHR5cGVvZiBjb250ZXh0LmJsb2NrID09PSAndW5kZWZpbmVkJyAmJlxuICAgIHR5cGVvZiBjb250ZXh0LmVsZW0gPT09ICd1bmRlZmluZWQnICYmXG4gICAgdHlwZW9mIGNvbnRleHQuY2xzID09PSAndW5kZWZpbmVkJyAmJlxuICAgIHR5cGVvZiBjb250ZXh0LmF0dHJzID09PSAndW5kZWZpbmVkJ1xuICApXG4gICAgcmVzID0gdGhpcy5ydW5VbmVzY2FwZWQoY29udGV4dC5odG1sKTtcbiAgZWxzZSBpZiAodXRpbHMuaXNTaW1wbGUoY29udGV4dCkpXG4gICAgcmVzID0gdGhpcy5ydW5TaW1wbGUoY29udGV4dCk7XG4gIGVsc2VcbiAgICByZXMgPSB0aGlzLnJ1bk9uZShjb250ZXh0KTtcbiAgcmV0dXJuIHJlcztcbn07XG5cbkJFTVhKU1QucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uIHJ1bihqc29uKSB7XG4gIHZhciBtYXRjaCA9IHRoaXMubWF0Y2g7XG4gIHZhciBjb250ZXh0ID0gdGhpcy5jb250ZXh0O1xuXG4gIHRoaXMubWF0Y2ggPSBudWxsO1xuICB0aGlzLmNvbnRleHQgPSBuZXcgdGhpcy5jb250ZXh0Q29uc3RydWN0b3IodGhpcyk7XG4gIHRoaXMuY2FuRmx1c2ggPSB0aGlzLmNvbnRleHQuX2ZsdXNoICE9PSBudWxsO1xuICB0aGlzLmRlcHRoID0gMDtcbiAgdmFyIHJlcyA9IHRoaXMuX3J1bihqc29uKTtcblxuICBpZiAodGhpcy5jYW5GbHVzaClcbiAgICByZXMgPSB0aGlzLmNvbnRleHQuX2ZsdXNoKHJlcyk7XG5cbiAgdGhpcy5tYXRjaCA9IG1hdGNoO1xuICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuXG4gIHJldHVybiByZXM7XG59O1xuXG5cbkJFTVhKU1QucHJvdG90eXBlLnJ1bkVtcHR5ID0gZnVuY3Rpb24gcnVuRW1wdHkoKSB7XG4gIHRoaXMuY29udGV4dC5fbGlzdExlbmd0aC0tO1xuICByZXR1cm4gJyc7XG59O1xuXG5CRU1YSlNULnByb3RvdHlwZS5ydW5VbmVzY2FwZWQgPSBmdW5jdGlvbiBydW5VbmVzY2FwZWQoY29udGV4dCkge1xuICB0aGlzLmNvbnRleHQuX2xpc3RMZW5ndGgtLTtcbiAgcmV0dXJuICcnICsgY29udGV4dDtcbn07XG5cbkJFTVhKU1QucHJvdG90eXBlLnJ1blNpbXBsZSA9IGZ1bmN0aW9uIHJ1blNpbXBsZShzaW1wbGUpIHtcbiAgdGhpcy5jb250ZXh0Ll9saXN0TGVuZ3RoLS07XG4gIHZhciByZXMgPSAnJztcbiAgaWYgKHNpbXBsZSAmJiBzaW1wbGUgIT09IHRydWUgfHwgc2ltcGxlID09PSAwKSB7XG4gICAgcmVzICs9IHR5cGVvZiBzaW1wbGUgPT09ICdzdHJpbmcnICYmIHRoaXMuY29udGV4dC5lc2NhcGVDb250ZW50ID9cbiAgICAgIHV0aWxzLnhtbEVzY2FwZShzaW1wbGUpIDpcbiAgICAgIHNpbXBsZTtcbiAgfVxuXG4gIHJldHVybiByZXM7XG59O1xuXG5CRU1YSlNULnByb3RvdHlwZS5ydW5PbmUgPSBmdW5jdGlvbiBydW5PbmUoanNvbikge1xuICB2YXIgY29udGV4dCA9IHRoaXMuY29udGV4dDtcblxuICB2YXIgb2xkQ3R4ID0gY29udGV4dC5jdHg7XG4gIHZhciBvbGRCbG9jayA9IGNvbnRleHQuYmxvY2s7XG4gIHZhciBvbGRDdXJyQmxvY2sgPSBjb250ZXh0Ll9jdXJyQmxvY2s7XG4gIHZhciBvbGRFbGVtID0gY29udGV4dC5lbGVtO1xuICB2YXIgb2xkTW9kcyA9IGNvbnRleHQubW9kcztcbiAgdmFyIG9sZEVsZW1Nb2RzID0gY29udGV4dC5lbGVtTW9kcztcblxuICBpZiAoanNvbi5ibG9jayB8fCBqc29uLmVsZW0pXG4gICAgY29udGV4dC5fY3VyckJsb2NrID0gJyc7XG4gIGVsc2VcbiAgICBjb250ZXh0Ll9jdXJyQmxvY2sgPSBjb250ZXh0LmJsb2NrO1xuXG4gIGNvbnRleHQuY3R4ID0ganNvbjtcbiAgaWYgKGpzb24uYmxvY2spIHtcbiAgICBjb250ZXh0LmJsb2NrID0ganNvbi5ibG9jaztcblxuICAgIGlmIChqc29uLm1vZHMpXG4gICAgICBjb250ZXh0Lm1vZHMgPSBqc29uLm1vZHM7XG4gICAgZWxzZSBpZiAoanNvbi5ibG9jayAhPT0gb2xkQmxvY2sgfHwgIWpzb24uZWxlbSlcbiAgICAgIGNvbnRleHQubW9kcyA9IHt9O1xuICB9IGVsc2Uge1xuICAgIGlmICghanNvbi5lbGVtKVxuICAgICAgY29udGV4dC5ibG9jayA9ICcnO1xuICAgIGVsc2UgaWYgKG9sZEN1cnJCbG9jaylcbiAgICAgIGNvbnRleHQuYmxvY2sgPSBvbGRDdXJyQmxvY2s7XG4gIH1cblxuICBjb250ZXh0LmVsZW0gPSBqc29uLmVsZW07XG4gIGlmIChqc29uLmVsZW1Nb2RzKVxuICAgIGNvbnRleHQuZWxlbU1vZHMgPSBqc29uLmVsZW1Nb2RzO1xuICBlbHNlXG4gICAgY29udGV4dC5lbGVtTW9kcyA9IHt9O1xuXG4gIHZhciBibG9jayA9IGNvbnRleHQuYmxvY2sgfHwgJyc7XG4gIHZhciBlbGVtID0gY29udGV4dC5lbGVtO1xuXG4gIC8vIENvbnRyb2wgbGlzdCBwb3NpdGlvblxuICBpZiAoYmxvY2sgfHwgZWxlbSlcbiAgICBjb250ZXh0LnBvc2l0aW9uKys7XG4gIGVsc2VcbiAgICBjb250ZXh0Ll9saXN0TGVuZ3RoLS07XG5cbiAgLy8gVG8gaW52YWxpZGF0ZSBgYXBwbHlOZXh0YCBmbGFnc1xuICB0aGlzLmRlcHRoKys7XG5cbiAgdmFyIGtleSA9IHRoaXMuY2xhc3NCdWlsZGVyLmJ1aWxkKGJsb2NrLCBlbGVtKTtcblxuICB2YXIgcmVzdG9yZUZsdXNoID0gZmFsc2U7XG4gIHZhciBlbnQgPSB0aGlzLmVudGl0aWVzW2tleV07XG4gIGlmIChlbnQpIHtcbiAgICBpZiAodGhpcy5jYW5GbHVzaCAmJiAhZW50LmNhbkZsdXNoKSB7XG4gICAgICAvLyBFbnRpdHkgZG9lcyBub3Qgc3VwcG9ydCBmbHVzaGluZywgZG8gbm90IGZsdXNoIGFueXRoaW5nIG5lc3RlZFxuICAgICAgcmVzdG9yZUZsdXNoID0gdHJ1ZTtcbiAgICAgIHRoaXMuY2FuRmx1c2ggPSBmYWxzZTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gTm8gZW50aXR5IC0gdXNlIGRlZmF1bHQgb25lXG4gICAgZW50ID0gdGhpcy5kZWZhdWx0RW50O1xuICAgIGlmIChlbGVtICE9PSB1bmRlZmluZWQpXG4gICAgICBlbnQgPSB0aGlzLmRlZmF1bHRFbGVtRW50O1xuICAgIGVudC5pbml0KGJsb2NrLCBlbGVtKTtcbiAgfVxuXG4gIHZhciByZXMgPSBlbnQucnVuKGNvbnRleHQpO1xuICBjb250ZXh0LmN0eCA9IG9sZEN0eDtcbiAgY29udGV4dC5ibG9jayA9IG9sZEJsb2NrO1xuICBjb250ZXh0LmVsZW0gPSBvbGRFbGVtO1xuICBjb250ZXh0Lm1vZHMgPSBvbGRNb2RzO1xuICBjb250ZXh0LmVsZW1Nb2RzID0gb2xkRWxlbU1vZHM7XG4gIGNvbnRleHQuX2N1cnJCbG9jayA9IG9sZEN1cnJCbG9jaztcbiAgdGhpcy5kZXB0aC0tO1xuICBpZiAocmVzdG9yZUZsdXNoKVxuICAgIHRoaXMuY2FuRmx1c2ggPSB0cnVlO1xuXG4gIHJldHVybiByZXM7XG59O1xuXG5CRU1YSlNULnByb3RvdHlwZS5yZW5kZXJDb250ZW50ID0gZnVuY3Rpb24gcmVuZGVyQ29udGVudChjb250ZW50LCBpc0JFTSkge1xuICB2YXIgY29udGV4dCA9IHRoaXMuY29udGV4dDtcbiAgdmFyIG9sZFBvcyA9IGNvbnRleHQucG9zaXRpb247XG4gIHZhciBvbGRMaXN0TGVuZ3RoID0gY29udGV4dC5fbGlzdExlbmd0aDtcbiAgdmFyIG9sZE5vdE5ld0xpc3QgPSBjb250ZXh0Ll9ub3ROZXdMaXN0O1xuXG4gIGNvbnRleHQuX25vdE5ld0xpc3QgPSBmYWxzZTtcbiAgaWYgKGlzQkVNKSB7XG4gICAgY29udGV4dC5wb3NpdGlvbiA9IDA7XG4gICAgY29udGV4dC5fbGlzdExlbmd0aCA9IDE7XG4gIH1cblxuICB2YXIgcmVzID0gdGhpcy5fcnVuKGNvbnRlbnQpO1xuXG4gIGNvbnRleHQucG9zaXRpb24gPSBvbGRQb3M7XG4gIGNvbnRleHQuX2xpc3RMZW5ndGggPSBvbGRMaXN0TGVuZ3RoO1xuICBjb250ZXh0Ll9ub3ROZXdMaXN0ID0gb2xkTm90TmV3TGlzdDtcblxuICByZXR1cm4gcmVzO1xufTtcblxuQkVNWEpTVC5wcm90b3R5cGUubG9jYWwgPSBmdW5jdGlvbiBsb2NhbChjaGFuZ2VzLCBib2R5KSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoY2hhbmdlcyk7XG4gIHZhciByZXN0b3JlID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgIHZhciBwYXJ0cyA9IGtleS5zcGxpdCgnLicpO1xuXG4gICAgdmFyIHZhbHVlID0gdGhpcy5jb250ZXh0O1xuICAgIGZvciAodmFyIGogPSAwOyBqIDwgcGFydHMubGVuZ3RoIC0gMTsgaisrKVxuICAgICAgdmFsdWUgPSB2YWx1ZVtwYXJ0c1tqXV07XG5cbiAgICByZXN0b3JlLnB1c2goe1xuICAgICAgcGFydHM6IHBhcnRzLFxuICAgICAgdmFsdWU6IHZhbHVlW3BhcnRzW2pdXVxuICAgIH0pO1xuICAgIHZhbHVlW3BhcnRzW2pdXSA9IGNoYW5nZXNba2V5XTtcbiAgfVxuXG4gIHZhciByZXMgPSBib2R5LmNhbGwodGhpcy5jb250ZXh0KTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc3RvcmUubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcGFydHMgPSByZXN0b3JlW2ldLnBhcnRzO1xuICAgIHZhciB2YWx1ZSA9IHRoaXMuY29udGV4dDtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IHBhcnRzLmxlbmd0aCAtIDE7IGorKylcbiAgICAgIHZhbHVlID0gdmFsdWVbcGFydHNbal1dO1xuXG4gICAgdmFsdWVbcGFydHNbal1dID0gcmVzdG9yZVtpXS52YWx1ZTtcbiAgfVxuXG4gIHJldHVybiByZXM7XG59O1xuXG5CRU1YSlNULnByb3RvdHlwZS5hcHBseU5leHQgPSBmdW5jdGlvbiBhcHBseU5leHQoKSB7XG4gIHJldHVybiB0aGlzLm1hdGNoLmV4ZWModGhpcy5jb250ZXh0KTtcbn07XG5cbkJFTVhKU1QucHJvdG90eXBlLmFwcGx5TW9kZSA9IGZ1bmN0aW9uIGFwcGx5TW9kZShtb2RlLCBjaGFuZ2VzKSB7XG4gIHZhciBtYXRjaCA9IHRoaXMubWF0Y2guZW50aXR5LnJlc3RbbW9kZV07XG4gIGlmICghbWF0Y2gpXG4gICAgcmV0dXJuIHRoaXMuY29udGV4dC5jdHhbbW9kZV07XG5cbiAgaWYgKCFjaGFuZ2VzKVxuICAgIHJldHVybiBtYXRjaC5leGVjKHRoaXMuY29udGV4dCk7XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8vIEFsbG9jYXRlIGZ1bmN0aW9uIHRoaXMgd2F5LCB0byBwcmV2ZW50IGFsbG9jYXRpb24gYXQgdGhlIHRvcCBvZiB0aGVcbiAgLy8gYGFwcGx5TW9kZWBcbiAgdmFyIGZuID0gZnVuY3Rpb24gbG9jYWxCb2R5KCkge1xuICAgIHJldHVybiBtYXRjaC5leGVjKHNlbGYuY29udGV4dCk7XG4gIH07XG4gIHJldHVybiB0aGlzLmxvY2FsKGNoYW5nZXMsIGZuKTtcbn07XG5cbkJFTVhKU1QucHJvdG90eXBlLmV4cG9ydEFwcGx5ID0gZnVuY3Rpb24gZXhwb3J0QXBwbHkoZXhwb3J0cykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGV4cG9ydHMuYXBwbHkgPSBmdW5jdGlvbiBhcHBseShjb250ZXh0KSB7XG4gICAgcmV0dXJuIHNlbGYucnVuKGNvbnRleHQpO1xuICB9O1xuXG4gIC8vIEFkZCB0ZW1wbGF0ZXMgYXQgcnVuIHRpbWVcbiAgZXhwb3J0cy5jb21waWxlID0gZnVuY3Rpb24gY29tcGlsZSh0ZW1wbGF0ZXMpIHtcbiAgICByZXR1cm4gc2VsZi5jb21waWxlKHRlbXBsYXRlcyk7XG4gIH07XG5cbiAgdmFyIHNoYXJlZENvbnRleHQgPSB7fTtcblxuICBleHBvcnRzLkJFTUNvbnRleHQgPSB0aGlzLmNvbnRleHRDb25zdHJ1Y3RvcjtcbiAgc2hhcmVkQ29udGV4dC5CRU1Db250ZXh0ID0gZXhwb3J0cy5CRU1Db250ZXh0O1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5vbmluaXQubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgb25pbml0ID0gdGhpcy5vbmluaXRbaV07XG5cbiAgICBvbmluaXQoZXhwb3J0cywgc2hhcmVkQ29udGV4dCk7XG4gIH1cbn07XG4iLCJ2YXIgdHJlZSA9IHJlcXVpcmUoJy4vdHJlZScpO1xudmFyIFByb3BlcnR5TWF0Y2ggPSB0cmVlLlByb3BlcnR5TWF0Y2g7XG52YXIgQWRkTWF0Y2ggPSB0cmVlLkFkZE1hdGNoO1xudmFyIFdyYXBNYXRjaCA9IHRyZWUuV3JhcE1hdGNoO1xudmFyIEN1c3RvbU1hdGNoID0gdHJlZS5DdXN0b21NYXRjaDtcblxuZnVuY3Rpb24gTWF0Y2hQcm9wZXJ0eSh0ZW1wbGF0ZSwgcHJlZCkge1xuICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGU7XG4gIHRoaXMua2V5ID0gcHJlZC5rZXk7XG4gIHRoaXMudmFsdWUgPSBwcmVkLnZhbHVlO1xufVxuXG5NYXRjaFByb3BlcnR5LnByb3RvdHlwZS5leGVjID0gZnVuY3Rpb24gZXhlYyhjb250ZXh0KSB7XG4gIHJldHVybiBjb250ZXh0W3RoaXMua2V5XSA9PT0gdGhpcy52YWx1ZTtcbn07XG5cbmZ1bmN0aW9uIE1hdGNoTmVzdGVkKHRlbXBsYXRlLCBwcmVkKSB7XG4gIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgdGhpcy5rZXlzID0gcHJlZC5rZXk7XG4gIHRoaXMudmFsdWUgPSBwcmVkLnZhbHVlO1xufVxuXG5NYXRjaE5lc3RlZC5wcm90b3R5cGUuZXhlYyA9IGZ1bmN0aW9uIGV4ZWMoY29udGV4dCkge1xuICB2YXIgdmFsID0gY29udGV4dDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMua2V5cy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICB2YWwgPSB2YWxbdGhpcy5rZXlzW2ldXTtcbiAgICBpZiAoIXZhbClcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHZhbCA9IHZhbFt0aGlzLmtleXNbaV1dO1xuXG4gIGlmICh0aGlzLnZhbHVlID09PSB0cnVlKVxuICAgIHJldHVybiB2YWwgIT09IHVuZGVmaW5lZCAmJiB2YWwgIT09ICcnICYmIHZhbCAhPT0gZmFsc2UgJiYgdmFsICE9PSBudWxsO1xuXG4gIHJldHVybiBTdHJpbmcodmFsKSA9PT0gdGhpcy52YWx1ZTtcbn07XG5cbmZ1bmN0aW9uIE1hdGNoQ3VzdG9tKHRlbXBsYXRlLCBwcmVkKSB7XG4gIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgdGhpcy5ib2R5ID0gcHJlZC5ib2R5O1xufVxuXG5NYXRjaEN1c3RvbS5wcm90b3R5cGUuZXhlYyA9IGZ1bmN0aW9uIGV4ZWMoY29udGV4dCkge1xuICByZXR1cm4gdGhpcy5ib2R5LmNhbGwoY29udGV4dCwgY29udGV4dCwgY29udGV4dC5jdHgpO1xufTtcblxuZnVuY3Rpb24gTWF0Y2hXcmFwKHRlbXBsYXRlKSB7XG4gIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtcbiAgdGhpcy53cmFwID0gbnVsbDtcbn1cblxuTWF0Y2hXcmFwLnByb3RvdHlwZS5leGVjID0gZnVuY3Rpb24gZXhlYyhjb250ZXh0KSB7XG4gIHZhciByZXMgPSB0aGlzLndyYXAgIT09IGNvbnRleHQuY3R4O1xuICB0aGlzLndyYXAgPSBjb250ZXh0LmN0eDtcbiAgcmV0dXJuIHJlcztcbn07XG5cbmZ1bmN0aW9uIEFkZFdyYXAodGVtcGxhdGUsIHByZWQpIHtcbiAgdGhpcy50ZW1wbGF0ZSA9IHRlbXBsYXRlO1xuICB0aGlzLmtleSA9IHByZWQua2V5O1xuICB0aGlzLnZhbHVlID0gcHJlZC52YWx1ZTtcbn1cblxuQWRkV3JhcC5wcm90b3R5cGUuZXhlYyA9IGZ1bmN0aW9uIGV4ZWMoY29udGV4dCkge1xuICByZXR1cm4gY29udGV4dFt0aGlzLmtleV0gPT09IHRoaXMudmFsdWU7XG59O1xuXG5mdW5jdGlvbiBNYXRjaFRlbXBsYXRlKG1vZGUsIHRlbXBsYXRlKSB7XG4gIHRoaXMubW9kZSA9IG1vZGU7XG4gIHRoaXMucHJlZGljYXRlcyA9IG5ldyBBcnJheSh0ZW1wbGF0ZS5wcmVkaWNhdGVzLmxlbmd0aCk7XG4gIHRoaXMuYm9keSA9IHRlbXBsYXRlLmJvZHk7XG5cbiAgdmFyIHBvc3Rwb25lID0gW107XG5cbiAgZm9yICh2YXIgaSA9IDAsIGogPSAwOyBpIDwgdGhpcy5wcmVkaWNhdGVzLmxlbmd0aDsgaSsrLCBqKyspIHtcbiAgICB2YXIgcHJlZCA9IHRlbXBsYXRlLnByZWRpY2F0ZXNbaV07XG4gICAgaWYgKHByZWQgaW5zdGFuY2VvZiBQcm9wZXJ0eU1hdGNoKSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShwcmVkLmtleSkpXG4gICAgICAgIHRoaXMucHJlZGljYXRlc1tqXSA9IG5ldyBNYXRjaE5lc3RlZCh0aGlzLCBwcmVkKTtcbiAgICAgIGVsc2VcbiAgICAgICAgdGhpcy5wcmVkaWNhdGVzW2pdID0gbmV3IE1hdGNoUHJvcGVydHkodGhpcywgcHJlZCk7XG4gICAgfSBlbHNlIGlmIChwcmVkIGluc3RhbmNlb2YgQWRkTWF0Y2gpIHtcbiAgICAgIHRoaXMucHJlZGljYXRlc1tqXSA9IG5ldyBBZGRXcmFwKHRoaXMsIHByZWQpO1xuICAgIH0gZWxzZSBpZiAocHJlZCBpbnN0YW5jZW9mIEN1c3RvbU1hdGNoKSB7XG4gICAgICB0aGlzLnByZWRpY2F0ZXNbal0gPSBuZXcgTWF0Y2hDdXN0b20odGhpcywgcHJlZCk7XG5cbiAgICAgIC8vIFB1c2ggTWF0Y2hXcmFwIGxhdGVyLCB0aGV5IHNob3VsZCBub3QgYmUgZXhlY3V0ZWQgZmlyc3QuXG4gICAgICAvLyBPdGhlcndpc2UgdGhleSB3aWxsIHNldCBmbGFnIHRvbyBlYXJseSwgYW5kIGJvZHkgbWlnaHQgbm90IGJlIGV4ZWN1dGVkXG4gICAgfSBlbHNlIGlmIChwcmVkIGluc3RhbmNlb2YgV3JhcE1hdGNoKSB7XG4gICAgICBqLS07XG4gICAgICBwb3N0cG9uZS5wdXNoKG5ldyBNYXRjaFdyYXAodGhpcykpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTa2lwXG4gICAgICBqLS07XG4gICAgfVxuICB9XG5cbiAgLy8gSW5zZXJ0IGxhdGUgcHJlZGljYXRlc1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHBvc3Rwb25lLmxlbmd0aDsgaSsrLCBqKyspXG4gICAgdGhpcy5wcmVkaWNhdGVzW2pdID0gcG9zdHBvbmVbaV07XG5cbiAgaWYgKHRoaXMucHJlZGljYXRlcy5sZW5ndGggIT09IGopXG4gICAgdGhpcy5wcmVkaWNhdGVzLmxlbmd0aCA9IGo7XG59XG5leHBvcnRzLk1hdGNoVGVtcGxhdGUgPSBNYXRjaFRlbXBsYXRlO1xuXG5mdW5jdGlvbiBNYXRjaChlbnRpdHksIG1vZGVOYW1lKSB7XG4gIHRoaXMuZW50aXR5ID0gZW50aXR5O1xuICB0aGlzLm1vZGVOYW1lID0gbW9kZU5hbWU7XG4gIHRoaXMuYmVteGpzdCA9IHRoaXMuZW50aXR5LmJlbXhqc3Q7XG4gIHRoaXMudGVtcGxhdGVzID0gW107XG5cbiAgLy8gYXBwbHlOZXh0IG1hc2tcbiAgdGhpcy5tYXNrID0gWyAwIF07XG5cbiAgLy8gV2UgYXJlIGdvaW5nIHRvIGNyZWF0ZSBjb3BpZXMgb2YgbWFzayBmb3IgbmVzdGVkIGBhcHBseU5leHQoKWBcbiAgdGhpcy5tYXNrU2l6ZSA9IDA7XG4gIHRoaXMubWFza09mZnNldCA9IDA7XG5cbiAgdGhpcy5jb3VudCA9IDA7XG4gIHRoaXMuZGVwdGggPSAtMTtcblxuICB0aGlzLnRocm93bkVycm9yID0gbnVsbDtcbn1cbmV4cG9ydHMuTWF0Y2ggPSBNYXRjaDtcblxuTWF0Y2gucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24gY2xvbmUoZW50aXR5KSB7XG4gIHZhciByZXMgPSBuZXcgTWF0Y2goZW50aXR5LCB0aGlzLm1vZGVOYW1lKTtcblxuICByZXMudGVtcGxhdGVzID0gdGhpcy50ZW1wbGF0ZXMuc2xpY2UoKTtcbiAgcmVzLm1hc2sgPSB0aGlzLm1hc2suc2xpY2UoKTtcbiAgcmVzLm1hc2tTaXplID0gdGhpcy5tYXNrU2l6ZTtcbiAgcmVzLmNvdW50ID0gdGhpcy5jb3VudDtcblxuICByZXR1cm4gcmVzO1xufTtcblxuTWF0Y2gucHJvdG90eXBlLnByZXBlbmQgPSBmdW5jdGlvbiBwcmVwZW5kKG90aGVyKSB7XG4gIHRoaXMudGVtcGxhdGVzID0gb3RoZXIudGVtcGxhdGVzLmNvbmNhdCh0aGlzLnRlbXBsYXRlcyk7XG4gIHRoaXMuY291bnQgKz0gb3RoZXIuY291bnQ7XG5cbiAgd2hpbGUgKE1hdGguY2VpbCh0aGlzLmNvdW50IC8gMzEpID4gdGhpcy5tYXNrLmxlbmd0aClcbiAgICB0aGlzLm1hc2sucHVzaCgwKTtcblxuICB0aGlzLm1hc2tTaXplID0gdGhpcy5tYXNrLmxlbmd0aDtcbn07XG5cbk1hdGNoLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gcHVzaCh0ZW1wbGF0ZSkge1xuICB0aGlzLnRlbXBsYXRlcy5wdXNoKG5ldyBNYXRjaFRlbXBsYXRlKHRoaXMsIHRlbXBsYXRlKSk7XG4gIHRoaXMuY291bnQrKztcblxuICBpZiAoTWF0aC5jZWlsKHRoaXMuY291bnQgLyAzMSkgPiB0aGlzLm1hc2subGVuZ3RoKVxuICAgIHRoaXMubWFzay5wdXNoKDApO1xuXG4gIHRoaXMubWFza1NpemUgPSB0aGlzLm1hc2subGVuZ3RoO1xufTtcblxuTWF0Y2gucHJvdG90eXBlLnRyeUNhdGNoID0gZnVuY3Rpb24gdHJ5Q2F0Y2goZm4sIGN0eCkge1xuICB0cnkge1xuICAgIHJldHVybiBmbi5jYWxsKGN0eCwgY3R4LCBjdHguY3R4KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHRoaXMudGhyb3duRXJyb3IgPSBlO1xuICB9XG59O1xuXG5NYXRjaC5wcm90b3R5cGUuZXhlYyA9IGZ1bmN0aW9uIGV4ZWMoY29udGV4dCkge1xuICB2YXIgc2F2ZSA9IHRoaXMuY2hlY2tEZXB0aCgpO1xuXG4gIHZhciB0ZW1wbGF0ZTtcbiAgdmFyIGJpdEluZGV4ID0gdGhpcy5tYXNrT2Zmc2V0O1xuICB2YXIgbWFzayA9IHRoaXMubWFza1tiaXRJbmRleF07XG4gIHZhciBiaXQgPSAxO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuY291bnQ7IGkrKykge1xuICAgIGlmICgobWFzayAmIGJpdCkgPT09IDApIHtcbiAgICAgIHRlbXBsYXRlID0gdGhpcy50ZW1wbGF0ZXNbaV07XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHRlbXBsYXRlLnByZWRpY2F0ZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdmFyIHByZWQgPSB0ZW1wbGF0ZS5wcmVkaWNhdGVzW2pdO1xuXG4gICAgICAgIC8qIGpzaGludCBtYXhkZXB0aCA6IGZhbHNlICovXG4gICAgICAgIGlmICghcHJlZC5leGVjKGNvbnRleHQpKVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICAvLyBBbGwgcHJlZGljYXRlcyBtYXRjaGVkIVxuICAgICAgaWYgKGogPT09IHRlbXBsYXRlLnByZWRpY2F0ZXMubGVuZ3RoKVxuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAoYml0ID09PSAweDQwMDAwMDAwKSB7XG4gICAgICBiaXRJbmRleCsrO1xuICAgICAgbWFzayA9IHRoaXMubWFza1tiaXRJbmRleF07XG4gICAgICBiaXQgPSAxO1xuICAgIH0gZWxzZSB7XG4gICAgICBiaXQgPDw9IDE7XG4gICAgfVxuICB9XG5cbiAgaWYgKGkgPT09IHRoaXMuY291bnQpXG4gICAgcmV0dXJuIGNvbnRleHQuY3R4W3RoaXMubW9kZU5hbWVdO1xuXG4gIHZhciBvbGRNYXNrID0gbWFzaztcbiAgdmFyIG9sZE1hdGNoID0gdGhpcy5iZW14anN0Lm1hdGNoO1xuICB0aGlzLm1hc2tbYml0SW5kZXhdIHw9IGJpdDtcbiAgdGhpcy5iZW14anN0Lm1hdGNoID0gdGhpcztcblxuICB0aGlzLnRocm93bkVycm9yID0gbnVsbDtcblxuICB2YXIgb3V0O1xuICBpZiAodHlwZW9mIHRlbXBsYXRlLmJvZHkgPT09ICdmdW5jdGlvbicpXG4gICAgb3V0ID0gdGhpcy50cnlDYXRjaCh0ZW1wbGF0ZS5ib2R5LCBjb250ZXh0KTtcbiAgZWxzZVxuICAgIG91dCA9IHRlbXBsYXRlLmJvZHk7XG5cbiAgdGhpcy5tYXNrW2JpdEluZGV4XSA9IG9sZE1hc2s7XG4gIHRoaXMuYmVteGpzdC5tYXRjaCA9IG9sZE1hdGNoO1xuICB0aGlzLnJlc3RvcmVEZXB0aChzYXZlKTtcblxuICB2YXIgZSA9IHRoaXMudGhyb3duRXJyb3I7XG4gIGlmIChlICE9PSBudWxsKSB7XG4gICAgdGhpcy50aHJvd25FcnJvciA9IG51bGw7XG4gICAgdGhyb3cgZTtcbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59O1xuXG5NYXRjaC5wcm90b3R5cGUuY2hlY2tEZXB0aCA9IGZ1bmN0aW9uIGNoZWNrRGVwdGgoKSB7XG4gIGlmICh0aGlzLmRlcHRoID09PSAtMSkge1xuICAgIHRoaXMuZGVwdGggPSB0aGlzLmJlbXhqc3QuZGVwdGg7XG4gICAgcmV0dXJuIC0xO1xuICB9XG5cbiAgaWYgKHRoaXMuYmVteGpzdC5kZXB0aCA9PT0gdGhpcy5kZXB0aClcbiAgICByZXR1cm4gdGhpcy5kZXB0aDtcblxuICB2YXIgZGVwdGggPSB0aGlzLmRlcHRoO1xuICB0aGlzLmRlcHRoID0gdGhpcy5iZW14anN0LmRlcHRoO1xuXG4gIHRoaXMubWFza09mZnNldCArPSB0aGlzLm1hc2tTaXplO1xuXG4gIHdoaWxlICh0aGlzLm1hc2subGVuZ3RoIDwgdGhpcy5tYXNrT2Zmc2V0ICsgdGhpcy5tYXNrU2l6ZSlcbiAgICB0aGlzLm1hc2sucHVzaCgwKTtcblxuICByZXR1cm4gZGVwdGg7XG59O1xuXG5NYXRjaC5wcm90b3R5cGUucmVzdG9yZURlcHRoID0gZnVuY3Rpb24gcmVzdG9yZURlcHRoKGRlcHRoKSB7XG4gIGlmIChkZXB0aCAhPT0gLTEgJiYgZGVwdGggIT09IHRoaXMuZGVwdGgpXG4gICAgdGhpcy5tYXNrT2Zmc2V0IC09IHRoaXMubWFza1NpemU7XG4gIHRoaXMuZGVwdGggPSBkZXB0aDtcbn07XG4iLCJ2YXIgYXNzZXJ0ID0gcmVxdWlyZSgnbWluaW1hbGlzdGljLWFzc2VydCcpO1xudmFyIGluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuZnVuY3Rpb24gVGVtcGxhdGUocHJlZGljYXRlcywgYm9keSkge1xuICB0aGlzLnByZWRpY2F0ZXMgPSBwcmVkaWNhdGVzO1xuXG4gIHRoaXMuYm9keSA9IGJvZHk7XG59XG5leHBvcnRzLlRlbXBsYXRlID0gVGVtcGxhdGU7XG5cblRlbXBsYXRlLnByb3RvdHlwZS53cmFwID0gZnVuY3Rpb24gd3JhcCgpIHtcbiAgdmFyIGJvZHkgPSB0aGlzLmJvZHk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5wcmVkaWNhdGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHByZWQgPSB0aGlzLnByZWRpY2F0ZXNbaV07XG4gICAgYm9keSA9IHByZWQud3JhcEJvZHkoYm9keSk7XG4gIH1cbiAgdGhpcy5ib2R5ID0gYm9keTtcbn07XG5cblRlbXBsYXRlLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uIGNsb25lKCkge1xuICByZXR1cm4gbmV3IFRlbXBsYXRlKHRoaXMucHJlZGljYXRlcy5zbGljZSgpLCB0aGlzLmJvZHkpO1xufTtcblxuZnVuY3Rpb24gTWF0Y2hCYXNlKCkge1xufVxuZXhwb3J0cy5NYXRjaEJhc2UgPSBNYXRjaEJhc2U7XG5cbk1hdGNoQmFzZS5wcm90b3R5cGUud3JhcEJvZHkgPSBmdW5jdGlvbiB3cmFwQm9keShib2R5KSB7XG4gIHJldHVybiBib2R5O1xufTtcblxuZnVuY3Rpb24gSXRlbSh0cmVlLCBjaGlsZHJlbikge1xuICB0aGlzLmNvbmRpdGlvbnMgPSBbXTtcbiAgdGhpcy5jaGlsZHJlbiA9IFtdO1xuXG4gIGZvciAodmFyIGkgPSBjaGlsZHJlbi5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIHZhciBhcmcgPSBjaGlsZHJlbltpXTtcbiAgICBpZiAoYXJnIGluc3RhbmNlb2YgTWF0Y2hCYXNlKVxuICAgICAgdGhpcy5jb25kaXRpb25zLnB1c2goYXJnKTtcbiAgICBlbHNlIGlmIChhcmcgPT09IHRyZWUuYm91bmRCb2R5KVxuICAgICAgdGhpcy5jaGlsZHJlbltpXSA9IHRyZWUucXVldWUucG9wKCk7XG4gICAgZWxzZVxuICAgICAgdGhpcy5jaGlsZHJlbltpXSA9IGFyZztcbiAgfVxufVxuXG5mdW5jdGlvbiBXcmFwTWF0Y2gocmVmcykge1xuICBNYXRjaEJhc2UuY2FsbCh0aGlzKTtcblxuICB0aGlzLnJlZnMgPSByZWZzO1xufVxuaW5oZXJpdHMoV3JhcE1hdGNoLCBNYXRjaEJhc2UpO1xuZXhwb3J0cy5XcmFwTWF0Y2ggPSBXcmFwTWF0Y2g7XG5cbldyYXBNYXRjaC5wcm90b3R5cGUud3JhcEJvZHkgPSBmdW5jdGlvbiB3cmFwQm9keShib2R5KSB7XG4gIHZhciBhcHBseUN0eCA9IHRoaXMucmVmcy5hcHBseUN0eDtcblxuICBpZiAodHlwZW9mIGJvZHkgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gaW5saW5lQWRhcHRvcigpIHtcbiAgICAgIHJldHVybiBhcHBseUN0eChib2R5KTtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIHdyYXBBZGFwdG9yKCkge1xuICAgIHJldHVybiBhcHBseUN0eChib2R5LmNhbGwodGhpcywgdGhpcywgdGhpcy5jdHgpKTtcbiAgfTtcbn07XG5cbmZ1bmN0aW9uIFJlcGxhY2VNYXRjaChyZWZzKSB7XG4gIE1hdGNoQmFzZS5jYWxsKHRoaXMpO1xuXG4gIHRoaXMucmVmcyA9IHJlZnM7XG59XG5pbmhlcml0cyhSZXBsYWNlTWF0Y2gsIE1hdGNoQmFzZSk7XG5leHBvcnRzLlJlcGxhY2VNYXRjaCA9IFJlcGxhY2VNYXRjaDtcblxuUmVwbGFjZU1hdGNoLnByb3RvdHlwZS53cmFwQm9keSA9IGZ1bmN0aW9uIHdyYXBCb2R5KGJvZHkpIHtcbiAgdmFyIGFwcGx5Q3R4ID0gdGhpcy5yZWZzLmFwcGx5Q3R4O1xuXG4gIGlmICh0eXBlb2YgYm9keSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBmdW5jdGlvbiBpbmxpbmVBZGFwdG9yKCkge1xuICAgICAgcmV0dXJuIGFwcGx5Q3R4KGJvZHkpO1xuICAgIH07XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24gcmVwbGFjZUFkYXB0b3IoKSB7XG4gICAgcmV0dXJuIGFwcGx5Q3R4KGJvZHkuY2FsbCh0aGlzLCB0aGlzLCB0aGlzLmN0eCkpO1xuICB9O1xufTtcblxuZnVuY3Rpb24gRXh0ZW5kTWF0Y2gocmVmcykge1xuICBNYXRjaEJhc2UuY2FsbCh0aGlzKTtcblxuICB0aGlzLnJlZnMgPSByZWZzO1xufVxuaW5oZXJpdHMoRXh0ZW5kTWF0Y2gsIE1hdGNoQmFzZSk7XG5leHBvcnRzLkV4dGVuZE1hdGNoID0gRXh0ZW5kTWF0Y2g7XG5cbkV4dGVuZE1hdGNoLnByb3RvdHlwZS53cmFwQm9keSA9IGZ1bmN0aW9uIHdyYXBCb2R5KGJvZHkpIHtcbiAgdmFyIHJlZnMgPSB0aGlzLnJlZnM7XG4gIHZhciBhcHBseUN0eCA9IHJlZnMuYXBwbHlDdHg7XG4gIHZhciBsb2NhbCA9IHJlZnMubG9jYWw7XG5cbiAgaWYgKHR5cGVvZiBib2R5ICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGlubGluZUFkYXB0b3IoKSB7XG4gICAgICB2YXIgY2hhbmdlcyA9IHt9O1xuXG4gICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGJvZHkpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKVxuICAgICAgICBjaGFuZ2VzWydjdHguJyArIGtleXNbaV1dID0gYm9keVtrZXlzW2ldXTtcblxuICAgICAgcmV0dXJuIGxvY2FsKGNoYW5nZXMpKGZ1bmN0aW9uIHByZUFwcGx5Q3R4KCkge1xuICAgICAgICByZXR1cm4gYXBwbHlDdHgodGhpcy5jdHgpO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiBsb2NhbEFkYXB0b3IoKSB7XG4gICAgdmFyIGNoYW5nZXMgPSB7fTtcblxuICAgIHZhciBvYmogPSBib2R5LmNhbGwodGhpcyk7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmopO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKylcbiAgICAgIGNoYW5nZXNbJ2N0eC4nICsga2V5c1tpXV0gPSBvYmpba2V5c1tpXV07XG5cbiAgICByZXR1cm4gbG9jYWwoY2hhbmdlcykoZnVuY3Rpb24gcHJlQXBwbHlDdHgoKSB7XG4gICAgICByZXR1cm4gYXBwbHlDdHgodGhpcy5jdHgpO1xuICAgIH0pO1xuICB9O1xufTtcblxuZnVuY3Rpb24gQWRkTWF0Y2gobW9kZSwgcmVmcykge1xuICBNYXRjaEJhc2UuY2FsbCh0aGlzKTtcblxuICB0aGlzLm1vZGUgPSBtb2RlO1xuICB0aGlzLnJlZnMgPSByZWZzO1xufVxuaW5oZXJpdHMoQWRkTWF0Y2gsIE1hdGNoQmFzZSk7XG5leHBvcnRzLkFkZE1hdGNoID0gQWRkTWF0Y2g7XG5cbkFkZE1hdGNoLnByb3RvdHlwZS53cmFwQm9keSA9IGZ1bmN0aW9uIHdyYXBCb2R5KGJvZHkpIHtcbiAgcmV0dXJuIHRoaXNbdGhpcy5tb2RlICsgJ1dyYXBCb2R5J10oYm9keSk7XG59O1xuXG5BZGRNYXRjaC5wcm90b3R5cGUuYXBwZW5kQ29udGVudFdyYXBCb2R5ID1cbiAgZnVuY3Rpb24gYXBwZW5kQ29udGVudFdyYXBCb2R5KGJvZHkpIHtcbiAgdmFyIHJlZnMgPSB0aGlzLnJlZnM7XG4gIHZhciBhcHBseUN0eCA9IHJlZnMuYXBwbHlDdHg7XG4gIHZhciBhcHBseSA9IHJlZnMuYXBwbHk7XG5cbiAgaWYgKHR5cGVvZiBib2R5ICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGlubGluZUFwcGVuZENvbnRlbnRBZGRBZGFwdG9yKCkge1xuICAgICAgcmV0dXJuIFsgYXBwbHkoJ2NvbnRlbnQnKSAsIGJvZHkgXTtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIGFwcGVuZENvbnRlbnRBZGRBZGFwdG9yKCkge1xuICAgIHJldHVybiBbIGFwcGx5KCdjb250ZW50JyksIGFwcGx5Q3R4KGJvZHkuY2FsbCh0aGlzLCB0aGlzLCB0aGlzLmN0eCkpIF07XG4gIH07XG59O1xuXG5BZGRNYXRjaC5wcm90b3R5cGUucHJlcGVuZENvbnRlbnRXcmFwQm9keSA9XG4gIGZ1bmN0aW9uIHByZXBlbmRDb250ZW50V3JhcEJvZHkoYm9keSkge1xuICB2YXIgcmVmcyA9IHRoaXMucmVmcztcbiAgdmFyIGFwcGx5Q3R4ID0gcmVmcy5hcHBseUN0eDtcbiAgdmFyIGFwcGx5ID0gcmVmcy5hcHBseTtcblxuICBpZiAodHlwZW9mIGJvZHkgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gaW5saW5lUHJlcGVuZENvbnRlbnRBZGRBZGFwdG9yKCkge1xuICAgICAgcmV0dXJuIFsgYm9keSwgYXBwbHkoJ2NvbnRlbnQnKSBdO1xuICAgIH07XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24gcHJlcGVuZENvbnRlbnRBZGRBZGFwdG9yKCkge1xuICAgIHJldHVybiBbIGFwcGx5Q3R4KGJvZHkuY2FsbCh0aGlzLCB0aGlzLCB0aGlzLmN0eCkpLCBhcHBseSgnY29udGVudCcpIF07XG4gIH07XG59O1xuXG5BZGRNYXRjaC5wcm90b3R5cGUubWl4V3JhcEJvZHkgPSBmdW5jdGlvbiBtaXhXcmFwQm9keShib2R5KSB7XG4gIHZhciByZWZzID0gdGhpcy5yZWZzO1xuICB2YXIgYXBwbHkgPSByZWZzLmFwcGx5O1xuXG4gIGlmICh0eXBlb2YgYm9keSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBmdW5jdGlvbiBpbmxpbmVBZGRNaXhBZGFwdG9yKCkge1xuICAgICAgdmFyIHJldCA9IGFwcGx5KCdtaXgnKTtcbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShyZXQpKSByZXQgPSBbIHJldCBdO1xuICAgICAgcmV0dXJuIHJldC5jb25jYXQoYm9keSk7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiBhZGRNaXhBZGFwdG9yKCkge1xuICAgIHZhciByZXQgPSBhcHBseSgnbWl4Jyk7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHJldCkpIHJldCA9IFsgcmV0IF07XG4gICAgcmV0dXJuIHJldC5jb25jYXQoYm9keS5jYWxsKHRoaXMsIHRoaXMsIHRoaXMuY3R4KSk7XG4gIH07XG59O1xuXG5BZGRNYXRjaC5wcm90b3R5cGUuYXR0cnNXcmFwQm9keSA9IGZ1bmN0aW9uIGF0dHJzV3JhcEJvZHkoYm9keSkge1xuICB2YXIgcmVmcyA9IHRoaXMucmVmcztcbiAgdmFyIGFwcGx5ID0gcmVmcy5hcHBseTtcblxuICBpZiAodHlwZW9mIGJvZHkgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gaW5saW5lQXR0cnNBZGRBZGFwdG9yKCkge1xuICAgICAgcmV0dXJuIHV0aWxzLmV4dGVuZChhcHBseSgnYXR0cnMnKSB8fCB7fSwgYm9keSk7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiBhZGRBdHRyc0FkYXB0b3IoKSB7XG4gICAgcmV0dXJuIHV0aWxzLmV4dGVuZChhcHBseSgnYXR0cnMnKSB8fCB7fSwgYm9keS5jYWxsKHRoaXMsIHRoaXMsIHRoaXMuY3R4KSk7XG4gIH07XG59O1xuXG5BZGRNYXRjaC5wcm90b3R5cGUuanNXcmFwQm9keSA9IGZ1bmN0aW9uIGpzV3JhcEJvZHkoYm9keSkge1xuICB2YXIgcmVmcyA9IHRoaXMucmVmcztcbiAgdmFyIGFwcGx5ID0gcmVmcy5hcHBseTtcblxuICBpZiAodHlwZW9mIGJvZHkgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gaW5saW5lSnNBZGRBZGFwdG9yKCkge1xuICAgICAgcmV0dXJuIHV0aWxzLmV4dGVuZChhcHBseSgnanMnKSB8fCB7fSwgYm9keSk7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiBqc0FkZEFkYXB0b3IoKSB7XG4gICAgcmV0dXJuIHV0aWxzLmV4dGVuZChhcHBseSgnanMnKSB8fCB7fSwgYm9keS5jYWxsKHRoaXMsIHRoaXMsIHRoaXMuY3R4KSk7XG4gIH07XG59O1xuXG5mdW5jdGlvbiBDb21waWxlck9wdGlvbnMob3B0aW9ucykge1xuICBNYXRjaEJhc2UuY2FsbCh0aGlzKTtcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbn1cbmluaGVyaXRzKENvbXBpbGVyT3B0aW9ucywgTWF0Y2hCYXNlKTtcbmV4cG9ydHMuQ29tcGlsZXJPcHRpb25zID0gQ29tcGlsZXJPcHRpb25zO1xuXG5mdW5jdGlvbiBQcm9wZXJ0eU1hdGNoKGtleSwgdmFsdWUpIHtcbiAgTWF0Y2hCYXNlLmNhbGwodGhpcyk7XG5cbiAgdGhpcy5rZXkgPSBrZXk7XG4gIHRoaXMudmFsdWUgPSB2YWx1ZTtcbn1cbmluaGVyaXRzKFByb3BlcnR5TWF0Y2gsIE1hdGNoQmFzZSk7XG5leHBvcnRzLlByb3BlcnR5TWF0Y2ggPSBQcm9wZXJ0eU1hdGNoO1xuXG5mdW5jdGlvbiBDdXN0b21NYXRjaChib2R5KSB7XG4gIE1hdGNoQmFzZS5jYWxsKHRoaXMpO1xuXG4gIHRoaXMuYm9keSA9IGJvZHk7XG59XG5pbmhlcml0cyhDdXN0b21NYXRjaCwgTWF0Y2hCYXNlKTtcbmV4cG9ydHMuQ3VzdG9tTWF0Y2ggPSBDdXN0b21NYXRjaDtcblxuZnVuY3Rpb24gVHJlZShvcHRpb25zKSB7XG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gIHRoaXMucmVmcyA9IHRoaXMub3B0aW9ucy5yZWZzO1xuXG4gIHRoaXMuYm91bmRCb2R5ID0gdGhpcy5ib2R5LmJpbmQodGhpcyk7XG5cbiAgdmFyIG1ldGhvZHMgPSB0aGlzLm1ldGhvZHMoJ2JvZHknKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXRob2RzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIG1ldGhvZCA9IG1ldGhvZHNbaV07XG4gICAgLy8gTk9URTogbWV0aG9kLm5hbWUgaXMgZW1wdHkgYmVjYXVzZSBvZiAuYmluZCgpXG4gICAgdGhpcy5ib3VuZEJvZHlbVHJlZS5tZXRob2RzW2ldXSA9IG1ldGhvZDtcbiAgfVxuXG4gIHRoaXMucXVldWUgPSBbXTtcbiAgdGhpcy50ZW1wbGF0ZXMgPSBbXTtcbiAgdGhpcy5pbml0aWFsaXplcnMgPSBbXTtcbn1cbmV4cG9ydHMuVHJlZSA9IFRyZWU7XG5cblRyZWUubWV0aG9kcyA9IFtcbiAgLy8gU3VicHJlZGljYXRlczpcbiAgJ21hdGNoJywgJ2Jsb2NrJywgJ2VsZW0nLCAnbW9kJywgJ2VsZW1Nb2QnLFxuICAvLyBSdW50aW1lIHJlbGF0ZWQ6XG4gICdvbmluaXQnLCAneGpzdE9wdGlvbnMnLFxuICAvLyBPdXRwdXQgZ2VuZXJhdG9yczpcbiAgJ3dyYXAnLCAncmVwbGFjZScsICdleHRlbmQnLCAnbW9kZScsICdkZWYnLFxuICAnY29udGVudCcsICdhcHBlbmRDb250ZW50JywgJ3ByZXBlbmRDb250ZW50JyxcbiAgJ2F0dHJzJywgJ2FkZEF0dHJzJywgJ2pzJywgJ2FkZEpzJywgJ21peCcsICdhZGRNaXgnLFxuICAndGFnJywgJ2NscycsICdiZW0nXG5dO1xuXG5UcmVlLnByb3RvdHlwZS5idWlsZCA9IGZ1bmN0aW9uIGJ1aWxkKHRlbXBsYXRlcywgYXBwbHkpIHtcbiAgdmFyIG1ldGhvZHMgPSB0aGlzLm1ldGhvZHMoJ2dsb2JhbCcpLmNvbmNhdChhcHBseSk7XG4gIG1ldGhvZHNbMF0gPSB0aGlzLm1hdGNoLmJpbmQodGhpcyk7XG5cbiAgdGVtcGxhdGVzLmFwcGx5KHt9LCBtZXRob2RzKTtcblxuICByZXR1cm4ge1xuICAgIHRlbXBsYXRlczogdGhpcy50ZW1wbGF0ZXMuc2xpY2UoKS5yZXZlcnNlKCksXG4gICAgb25pbml0OiB0aGlzLmluaXRpYWxpemVyc1xuICB9O1xufTtcblxuZnVuY3Rpb24gbWV0aG9kRmFjdG9yeShzZWxmLCBraW5kLCBuYW1lKSB7XG4gIHZhciBtZXRob2QgPSBzZWxmW25hbWVdO1xuICB2YXIgYm91bmRCb2R5ID0gc2VsZi5ib3VuZEJvZHk7XG5cbiAgaWYgKGtpbmQgIT09ICdib2R5Jykge1xuICAgIGlmIChuYW1lID09PSAncmVwbGFjZScgfHwgbmFtZSA9PT0gJ2V4dGVuZCcgfHwgbmFtZSA9PT0gJ3dyYXAnKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gd3JhcEV4dGVuZGVkKCkge1xuICAgICAgICByZXR1cm4gbWV0aG9kLmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiB3cmFwTm90Qm9keSgpIHtcbiAgICAgIG1ldGhvZC5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIGJvdW5kQm9keTtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIHdyYXBCb2R5KCkge1xuICAgIHZhciByZXMgPSBtZXRob2QuYXBwbHkoc2VsZiwgYXJndW1lbnRzKTtcblxuICAgIC8vIEluc2VydCBib2R5IGludG8gbGFzdCBpdGVtXG4gICAgdmFyIGNoaWxkID0gc2VsZi5xdWV1ZS5wb3AoKTtcbiAgICB2YXIgbGFzdCA9IHNlbGYucXVldWVbc2VsZi5xdWV1ZS5sZW5ndGggLSAxXTtcbiAgICBsYXN0LmNvbmRpdGlvbnMgPSBsYXN0LmNvbmRpdGlvbnMuY29uY2F0KGNoaWxkLmNvbmRpdGlvbnMpO1xuICAgIGxhc3QuY2hpbGRyZW4gPSBsYXN0LmNoaWxkcmVuLmNvbmNhdChjaGlsZC5jaGlsZHJlbik7XG5cbiAgICBpZiAobmFtZSA9PT0gJ3JlcGxhY2UnIHx8IG5hbWUgPT09ICdleHRlbmQnIHx8IG5hbWUgPT09ICd3cmFwJylcbiAgICAgIHJldHVybiByZXM7XG4gICAgcmV0dXJuIGJvdW5kQm9keTtcbiAgfTtcbn1cblxuVHJlZS5wcm90b3R5cGUubWV0aG9kcyA9IGZ1bmN0aW9uIG1ldGhvZHMoa2luZCkge1xuICB2YXIgb3V0ID0gbmV3IEFycmF5KFRyZWUubWV0aG9kcy5sZW5ndGgpO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgb3V0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIG5hbWUgPSBUcmVlLm1ldGhvZHNbaV07XG4gICAgb3V0W2ldID0gbWV0aG9kRmFjdG9yeSh0aGlzLCBraW5kLCBuYW1lKTtcbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59O1xuXG4vLyBDYWxsZWQgYWZ0ZXIgYWxsIG1hdGNoZXNcblRyZWUucHJvdG90eXBlLmZsdXNoID0gZnVuY3Rpb24gZmx1c2goY29uZGl0aW9ucywgaXRlbSkge1xuICB2YXIgc3ViY29uZDtcblxuICBpZiAoaXRlbS5jb25kaXRpb25zKVxuICAgIHN1YmNvbmQgPSBjb25kaXRpb25zLmNvbmNhdChpdGVtLmNvbmRpdGlvbnMpO1xuICBlbHNlXG4gICAgc3ViY29uZCA9IGl0ZW0uY29uZGl0aW9ucztcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGl0ZW0uY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYXJnID0gaXRlbS5jaGlsZHJlbltpXTtcblxuICAgIC8vIEdvIGRlZXBlclxuICAgIGlmIChhcmcgaW5zdGFuY2VvZiBJdGVtKSB7XG4gICAgICB0aGlzLmZsdXNoKHN1YmNvbmQsIGl0ZW0uY2hpbGRyZW5baV0pO1xuXG4gICAgLy8gQm9keVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdGVtcGxhdGUgPSBuZXcgVGVtcGxhdGUoY29uZGl0aW9ucywgYXJnKTtcbiAgICAgIHRlbXBsYXRlLndyYXAoKTtcbiAgICAgIHRoaXMudGVtcGxhdGVzLnB1c2godGVtcGxhdGUpO1xuICAgIH1cbiAgfVxufTtcblxuVHJlZS5wcm90b3R5cGUuYm9keSA9IGZ1bmN0aW9uIGJvZHkoKSB7XG4gIHZhciBjaGlsZHJlbiA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspXG4gICAgY2hpbGRyZW5baV0gPSBhcmd1bWVudHNbaV07XG5cbiAgdmFyIGNoaWxkID0gbmV3IEl0ZW0odGhpcywgY2hpbGRyZW4pO1xuICB0aGlzLnF1ZXVlW3RoaXMucXVldWUubGVuZ3RoIC0gMV0uY2hpbGRyZW4ucHVzaChjaGlsZCk7XG5cbiAgaWYgKHRoaXMucXVldWUubGVuZ3RoID09PSAxKVxuICAgIHRoaXMuZmx1c2goW10sIHRoaXMucXVldWUuc2hpZnQoKSk7XG5cbiAgcmV0dXJuIHRoaXMuYm91bmRCb2R5O1xufTtcblxuVHJlZS5wcm90b3R5cGUubWF0Y2ggPSBmdW5jdGlvbiBtYXRjaCgpIHtcbiAgdmFyIGNoaWxkcmVuID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGgpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBhcmcgPSBhcmd1bWVudHNbaV07XG4gICAgaWYgKHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbicpXG4gICAgICBhcmcgPSBuZXcgQ3VzdG9tTWF0Y2goYXJnKTtcbiAgICBhc3NlcnQoYXJnIGluc3RhbmNlb2YgTWF0Y2hCYXNlLCAnV3JvbmcgLm1hdGNoKCkgYXJndW1lbnQnKTtcbiAgICBjaGlsZHJlbltpXSA9IGFyZztcbiAgfVxuXG4gIHRoaXMucXVldWUucHVzaChuZXcgSXRlbSh0aGlzLCBjaGlsZHJlbikpO1xuXG4gIHJldHVybiB0aGlzLmJvdW5kQm9keTtcbn07XG5cblRyZWUucHJvdG90eXBlLmFwcGx5TW9kZSA9IGZ1bmN0aW9uIGFwcGx5TW9kZShhcmdzLCBtb2RlKSB7XG4gIGlmIChhcmdzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcignUHJlZGljYXRlIHNob3VsZCBub3QgaGF2ZSBhcmd1bWVudHMgYnV0ICcgK1xuICAgICAgSlNPTi5zdHJpbmdpZnkoYXJncykgKyAnIHBhc3NlZCcpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMubW9kZShtb2RlKTtcbn07XG5cblRyZWUucHJvdG90eXBlLndyYXAgPSBmdW5jdGlvbiB3cmFwKCkge1xuICByZXR1cm4gdGhpcy5kZWYuYXBwbHkodGhpcywgYXJndW1lbnRzKS5tYXRjaChuZXcgV3JhcE1hdGNoKHRoaXMucmVmcykpO1xufTtcblxuVHJlZS5wcm90b3R5cGUueGpzdE9wdGlvbnMgPSBmdW5jdGlvbiB4anN0T3B0aW9ucyhvcHRpb25zKSB7XG4gIHRoaXMucXVldWUucHVzaChuZXcgSXRlbSh0aGlzLCBbXG4gICAgbmV3IENvbXBpbGVyT3B0aW9ucyhvcHRpb25zKVxuICBdKSk7XG4gIHJldHVybiB0aGlzLmJvdW5kQm9keTtcbn07XG5cblRyZWUucHJvdG90eXBlLmJsb2NrID0gZnVuY3Rpb24gYmxvY2sobmFtZSkge1xuICByZXR1cm4gdGhpcy5tYXRjaChuZXcgUHJvcGVydHlNYXRjaCgnYmxvY2snLCBuYW1lKSk7XG59O1xuXG5UcmVlLnByb3RvdHlwZS5lbGVtID0gZnVuY3Rpb24gZWxlbShuYW1lKSB7XG4gIHJldHVybiB0aGlzLm1hdGNoKG5ldyBQcm9wZXJ0eU1hdGNoKCdlbGVtJywgbmFtZSkpO1xufTtcblxuVHJlZS5wcm90b3R5cGUubW9kZSA9IGZ1bmN0aW9uIG1vZGUobmFtZSkge1xuICByZXR1cm4gdGhpcy5tYXRjaChuZXcgUHJvcGVydHlNYXRjaCgnX21vZGUnLCBuYW1lKSk7XG59O1xuXG5UcmVlLnByb3RvdHlwZS5tb2QgPSBmdW5jdGlvbiBtb2QobmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIHRoaXMubWF0Y2gobmV3IFByb3BlcnR5TWF0Y2goWyAnbW9kcycsIG5hbWUgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IFN0cmluZyh2YWx1ZSkpKTtcbn07XG5cblRyZWUucHJvdG90eXBlLmVsZW1Nb2QgPSBmdW5jdGlvbiBlbGVtTW9kKG5hbWUsIHZhbHVlKSB7XG4gIHJldHVybiB0aGlzLm1hdGNoKG5ldyBQcm9wZXJ0eU1hdGNoKFsgJ2VsZW1Nb2RzJywgbmFtZSBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID09PSB1bmRlZmluZWQgPyAgdHJ1ZSA6IFN0cmluZyh2YWx1ZSkpKTtcbn07XG5cblRyZWUucHJvdG90eXBlLmRlZiA9IGZ1bmN0aW9uIGRlZigpIHtcbiAgcmV0dXJuIHRoaXMuYXBwbHlNb2RlKGFyZ3VtZW50cywgJ2RlZmF1bHQnKTtcbn07XG5cblRyZWUucHJvdG90eXBlLnRhZyA9IGZ1bmN0aW9uIHRhZygpIHtcbiAgcmV0dXJuIHRoaXMuYXBwbHlNb2RlKGFyZ3VtZW50cywgJ3RhZycpO1xufTtcblxuVHJlZS5wcm90b3R5cGUuYXR0cnMgPSBmdW5jdGlvbiBhdHRycygpIHtcbiAgcmV0dXJuIHRoaXMuYXBwbHlNb2RlKGFyZ3VtZW50cywgJ2F0dHJzJyk7XG59O1xuXG5UcmVlLnByb3RvdHlwZS5hZGRBdHRycyA9IGZ1bmN0aW9uIGFkZEF0dHJzKCkge1xuICByZXR1cm4gdGhpcy5hdHRycy5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgLm1hdGNoKG5ldyBBZGRNYXRjaCgnYXR0cnMnLCB0aGlzLnJlZnMpKTtcbn07XG5cblRyZWUucHJvdG90eXBlLmNscyA9IGZ1bmN0aW9uIGNscygpIHtcbiAgcmV0dXJuIHRoaXMuYXBwbHlNb2RlKGFyZ3VtZW50cywgJ2NscycpO1xufTtcblxuVHJlZS5wcm90b3R5cGUuanMgPSBmdW5jdGlvbiBqcygpIHtcbiAgcmV0dXJuIHRoaXMuYXBwbHlNb2RlKGFyZ3VtZW50cywgJ2pzJyk7XG59O1xuXG5UcmVlLnByb3RvdHlwZS5hZGRKcyA9IGZ1bmN0aW9uIGFkZEF0dHJzKCkge1xuICByZXR1cm4gdGhpcy5qcy5hcHBseSh0aGlzLCBhcmd1bWVudHMpLm1hdGNoKG5ldyBBZGRNYXRjaCgnanMnLCB0aGlzLnJlZnMpKTtcbn07XG5cblRyZWUucHJvdG90eXBlLmJlbSA9IGZ1bmN0aW9uIGJlbSgpIHtcbiAgcmV0dXJuIHRoaXMuYXBwbHlNb2RlKGFyZ3VtZW50cywgJ2JlbScpO1xufTtcblxuVHJlZS5wcm90b3R5cGUuYWRkTWl4ID0gZnVuY3Rpb24gYWRkTWl4KCkge1xuICByZXR1cm4gdGhpcy5taXguYXBwbHkodGhpcywgYXJndW1lbnRzKS5tYXRjaChuZXcgQWRkTWF0Y2goJ21peCcsIHRoaXMucmVmcykpO1xufTtcblxuVHJlZS5wcm90b3R5cGUubWl4ID0gZnVuY3Rpb24gbWl4KCkge1xuICByZXR1cm4gdGhpcy5hcHBseU1vZGUoYXJndW1lbnRzLCAnbWl4Jyk7XG59O1xuXG5UcmVlLnByb3RvdHlwZS5jb250ZW50ID0gZnVuY3Rpb24gY29udGVudCgpIHtcbiAgcmV0dXJuIHRoaXMuYXBwbHlNb2RlKGFyZ3VtZW50cywgJ2NvbnRlbnQnKTtcbn07XG5cblRyZWUucHJvdG90eXBlLmFwcGVuZENvbnRlbnQgPSBmdW5jdGlvbiBhcHBlbmRDb250ZW50KCkge1xuICByZXR1cm4gdGhpcy5jb250ZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICAubWF0Y2gobmV3IEFkZE1hdGNoKCdhcHBlbmRDb250ZW50JywgdGhpcy5yZWZzKSk7XG59O1xuXG5cblRyZWUucHJvdG90eXBlLnByZXBlbmRDb250ZW50ID0gZnVuY3Rpb24gcHJlcGVuZENvbnRlbnQoKSB7XG4gIHJldHVybiB0aGlzLmNvbnRlbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgIC5tYXRjaChuZXcgQWRkTWF0Y2goJ3ByZXBlbmRDb250ZW50JywgdGhpcy5yZWZzKSk7XG59O1xuXG5UcmVlLnByb3RvdHlwZS5yZXBsYWNlID0gZnVuY3Rpb24gcmVwbGFjZSgpIHtcbiAgcmV0dXJuIHRoaXMuZGVmLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykubWF0Y2gobmV3IFJlcGxhY2VNYXRjaCh0aGlzLnJlZnMpKTtcbn07XG5cblRyZWUucHJvdG90eXBlLmV4dGVuZCA9IGZ1bmN0aW9uIGV4dGVuZCgpIHtcbiAgcmV0dXJuIHRoaXMuZGVmLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykubWF0Y2gobmV3IEV4dGVuZE1hdGNoKHRoaXMucmVmcykpO1xufTtcblxuVHJlZS5wcm90b3R5cGUub25pbml0ID0gZnVuY3Rpb24gb25pbml0KGZuKSB7XG4gIHRoaXMuaW5pdGlhbGl6ZXJzLnB1c2goZm4pO1xufTtcbiIsInZhciBhbXAgPSAnJmFtcDsnO1xudmFyIGx0ID0gJyZsdDsnO1xudmFyIGd0ID0gJyZndDsnO1xudmFyIHF1b3QgPSAnJnF1b3Q7JztcbnZhciBzaW5nbGVRdW90ID0gJyYjMzk7JztcblxudmFyIG1hdGNoWG1sUmVnRXhwID0gL1smPD5dLztcblxuZXhwb3J0cy54bWxFc2NhcGUgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgdmFyIHN0ciA9ICcnICsgc3RyaW5nO1xuICB2YXIgbWF0Y2ggPSBtYXRjaFhtbFJlZ0V4cC5leGVjKHN0cik7XG5cbiAgaWYgKCFtYXRjaClcbiAgICByZXR1cm4gc3RyO1xuXG4gIHZhciBlc2NhcGU7XG4gIHZhciBodG1sID0gJyc7XG4gIHZhciBpbmRleCA9IDA7XG4gIHZhciBsYXN0SW5kZXggPSAwO1xuXG4gIGZvciAoaW5kZXggPSBtYXRjaC5pbmRleDsgaW5kZXggPCBzdHIubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgc3dpdGNoIChzdHIuY2hhckNvZGVBdChpbmRleCkpIHtcbiAgICAgIGNhc2UgMzg6IC8vICZcbiAgICAgICAgZXNjYXBlID0gYW1wO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgNjA6IC8vIDxcbiAgICAgICAgZXNjYXBlID0gbHQ7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSA2MjogLy8gPlxuICAgICAgICBlc2NhcGUgPSBndDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAobGFzdEluZGV4ICE9PSBpbmRleClcbiAgICAgIGh0bWwgKz0gc3RyLnN1YnN0cmluZyhsYXN0SW5kZXgsIGluZGV4KTtcblxuICAgIGxhc3RJbmRleCA9IGluZGV4ICsgMTtcbiAgICBodG1sICs9IGVzY2FwZTtcbiAgfVxuXG4gIHJldHVybiBsYXN0SW5kZXggIT09IGluZGV4ID9cbiAgICBodG1sICsgc3RyLnN1YnN0cmluZyhsYXN0SW5kZXgsIGluZGV4KSA6XG4gICAgaHRtbDtcbn07XG5cbnZhciBtYXRjaEF0dHJSZWdFeHAgPSAvW1wiJl0vO1xuXG5leHBvcnRzLmF0dHJFc2NhcGUgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgdmFyIHN0ciA9ICcnICsgc3RyaW5nO1xuICB2YXIgbWF0Y2ggPSBtYXRjaEF0dHJSZWdFeHAuZXhlYyhzdHIpO1xuXG4gIGlmICghbWF0Y2gpXG4gICAgcmV0dXJuIHN0cjtcblxuICB2YXIgZXNjYXBlO1xuICB2YXIgaHRtbCA9ICcnO1xuICB2YXIgaW5kZXggPSAwO1xuICB2YXIgbGFzdEluZGV4ID0gMDtcblxuICBmb3IgKGluZGV4ID0gbWF0Y2guaW5kZXg7IGluZGV4IDwgc3RyLmxlbmd0aDsgaW5kZXgrKykge1xuICAgIHN3aXRjaCAoc3RyLmNoYXJDb2RlQXQoaW5kZXgpKSB7XG4gICAgICBjYXNlIDM0OiAvLyBcIlxuICAgICAgICBlc2NhcGUgPSBxdW90O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzg6IC8vICZcbiAgICAgICAgZXNjYXBlID0gYW1wO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChsYXN0SW5kZXggIT09IGluZGV4KVxuICAgICAgaHRtbCArPSBzdHIuc3Vic3RyaW5nKGxhc3RJbmRleCwgaW5kZXgpO1xuXG4gICAgbGFzdEluZGV4ID0gaW5kZXggKyAxO1xuICAgIGh0bWwgKz0gZXNjYXBlO1xuICB9XG5cbiAgcmV0dXJuIGxhc3RJbmRleCAhPT0gaW5kZXggP1xuICAgIGh0bWwgKyBzdHIuc3Vic3RyaW5nKGxhc3RJbmRleCwgaW5kZXgpIDpcbiAgICBodG1sO1xufTtcblxudmFyIG1hdGNoSnNBdHRyUmVnRXhwID0gL1snJl0vO1xuXG5leHBvcnRzLmpzQXR0ckVzY2FwZSA9IGZ1bmN0aW9uKHN0cmluZykge1xuICB2YXIgc3RyID0gJycgKyBzdHJpbmc7XG4gIHZhciBtYXRjaCA9IG1hdGNoSnNBdHRyUmVnRXhwLmV4ZWMoc3RyKTtcblxuICBpZiAoIW1hdGNoKVxuICAgIHJldHVybiBzdHI7XG5cbiAgdmFyIGVzY2FwZTtcbiAgdmFyIGh0bWwgPSAnJztcbiAgdmFyIGluZGV4ID0gMDtcbiAgdmFyIGxhc3RJbmRleCA9IDA7XG5cbiAgZm9yIChpbmRleCA9IG1hdGNoLmluZGV4OyBpbmRleCA8IHN0ci5sZW5ndGg7IGluZGV4KyspIHtcbiAgICBzd2l0Y2ggKHN0ci5jaGFyQ29kZUF0KGluZGV4KSkge1xuICAgICAgY2FzZSAzODogLy8gJlxuICAgICAgICBlc2NhcGUgPSBhbXA7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOTogLy8gJ1xuICAgICAgICBlc2NhcGUgPSBzaW5nbGVRdW90O1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChsYXN0SW5kZXggIT09IGluZGV4KVxuICAgICAgaHRtbCArPSBzdHIuc3Vic3RyaW5nKGxhc3RJbmRleCwgaW5kZXgpO1xuXG4gICAgbGFzdEluZGV4ID0gaW5kZXggKyAxO1xuICAgIGh0bWwgKz0gZXNjYXBlO1xuICB9XG5cbiAgcmV0dXJuIGxhc3RJbmRleCAhPT0gaW5kZXggP1xuICAgIGh0bWwgKyBzdHIuc3Vic3RyaW5nKGxhc3RJbmRleCwgaW5kZXgpIDpcbiAgICBodG1sO1xufTtcblxuZXhwb3J0cy5leHRlbmQgPSBmdW5jdGlvbiBleHRlbmQobzEsIG8yKSB7XG4gIGlmICghbzEgfHwgIW8yKVxuICAgIHJldHVybiBvMSB8fCBvMjtcblxuICB2YXIgcmVzID0ge307XG4gIHZhciBuO1xuXG4gIGZvciAobiBpbiBvMSlcbiAgICBpZiAobzEuaGFzT3duUHJvcGVydHkobikpXG4gICAgICByZXNbbl0gPSBvMVtuXTtcbiAgZm9yIChuIGluIG8yKVxuICAgIGlmIChvMi5oYXNPd25Qcm9wZXJ0eShuKSlcbiAgICAgIHJlc1tuXSA9IG8yW25dO1xuICByZXR1cm4gcmVzO1xufTtcblxudmFyIFNIT1JUX1RBR1MgPSB7IC8vINGF0Y3RiCDQtNC70Y8g0LHRi9GB0YLRgNC+0LPQviDQvtC/0YDQtdC00LXQu9C10L3QuNGPLCDRj9Cy0LvRj9C10YLRgdGPINC70Lgg0YLRjdCzINC60L7RgNC+0YLQutC40LxcbiAgYXJlYTogMSwgYmFzZTogMSwgYnI6IDEsIGNvbDogMSwgY29tbWFuZDogMSwgZW1iZWQ6IDEsIGhyOiAxLCBpbWc6IDEsXG4gIGlucHV0OiAxLCBrZXlnZW46IDEsIGxpbms6IDEsIG1ldGE6IDEsIHBhcmFtOiAxLCBzb3VyY2U6IDEsIHdicjogMVxufTtcblxuZXhwb3J0cy5pc1Nob3J0VGFnID0gZnVuY3Rpb24gaXNTaG9ydFRhZyh0KSB7XG4gIHJldHVybiBTSE9SVF9UQUdTLmhhc093blByb3BlcnR5KHQpO1xufTtcblxuZXhwb3J0cy5pc1NpbXBsZSA9IGZ1bmN0aW9uIGlzU2ltcGxlKG9iaikge1xuICBpZiAoIW9iaiB8fCBvYmogPT09IHRydWUpIHJldHVybiB0cnVlO1xuICBpZiAoIW9iai5ibG9jayAmJlxuICAgICAgIW9iai5lbGVtICYmXG4gICAgICAhb2JqLnRhZyAmJlxuICAgICAgIW9iai5jbHMgJiZcbiAgICAgICFvYmouYXR0cnMgJiZcbiAgICAgIG9iai5oYXNPd25Qcm9wZXJ0eSgnaHRtbCcpICYmXG4gICAgICBpc1NpbXBsZShvYmouaHRtbCkpXG4gICAgcmV0dXJuIHRydWU7XG4gIHJldHVybiB0eXBlb2Ygb2JqID09PSAnc3RyaW5nJyB8fCB0eXBlb2Ygb2JqID09PSAnbnVtYmVyJztcbn07XG5cbmV4cG9ydHMuaXNPYmogPSBmdW5jdGlvbiBpc09iaih2YWwpIHtcbiAgcmV0dXJuIHZhbCAmJiB0eXBlb2YgdmFsID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheSh2YWwpICYmXG4gICAgdmFsICE9PSBudWxsO1xufTtcblxudmFyIHVuaXFDb3VudCA9IDA7XG52YXIgdW5pcUlkID0gK25ldyBEYXRlKCk7XG52YXIgdW5pcUV4cGFuZG8gPSAnX18nICsgdW5pcUlkO1xudmFyIHVuaXFQcmVmaXggPSAndW5pcScgKyB1bmlxSWQ7XG5cbmZ1bmN0aW9uIGdldFVuaXEoKSB7XG4gIHJldHVybiB1bmlxUHJlZml4ICsgKCsrdW5pcUNvdW50KTtcbn1cbmV4cG9ydHMuZ2V0VW5pcSA9IGdldFVuaXE7XG5cbmV4cG9ydHMuaWRlbnRpZnkgPSBmdW5jdGlvbiBpZGVudGlmeShvYmosIG9ubHlHZXQpIHtcbiAgaWYgKCFvYmopXG4gICAgcmV0dXJuIGdldFVuaXEoKTtcbiAgaWYgKG9ubHlHZXQgfHwgb2JqW3VuaXFFeHBhbmRvXSlcbiAgICByZXR1cm4gb2JqW3VuaXFFeHBhbmRvXTtcblxuICB2YXIgdSA9IGdldFVuaXEoKTtcbiAgb2JqW3VuaXFFeHBhbmRvXSA9IHU7XG4gIHJldHVybiB1O1xufTtcblxuZXhwb3J0cy5mblRvU3RyaW5nID0gZnVuY3Rpb24gZm5Ub1N0cmluZyhjb2RlKSB7XG4gIC8vIEl0IGlzIGZpbmUgdG8gY29tcGlsZSB3aXRob3V0IHRlbXBsYXRlcyBhdCBmaXJzdFxuICBpZiAoIWNvZGUpXG4gICAgcmV0dXJuICcnO1xuXG4gIGlmICh0eXBlb2YgY29kZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIEV4YW1wbGVzOlxuICAgIC8vICAgZnVuY3Rpb24gKCkgeyDigKYgfVxuICAgIC8vICAgZnVuY3Rpb24gbmFtZSgpIHsg4oCmIH1cbiAgICAvLyAgIGZ1bmN0aW9uIChhLCBiKSB7IOKApiB9XG4gICAgLy8gICBmdW5jdGlvbiBuYW1lKGEsIGIpIHsg4oCmIH1cbiAgICB2YXIgcmVndWxhckZ1bmN0aW9uID0gL15mdW5jdGlvblxccypbXntdK3t8fSQvZztcblxuICAgIC8vIEV4YW1wbGVzOlxuICAgIC8vICAgKCkgPT4geyDigKYgfVxuICAgIC8vICAgKGEsIGIpID0+IHsg4oCmIH1cbiAgICAvLyAgIF8gPT4geyDigKYgfVxuICAgIHZhciBhcnJvd0Z1bmN0aW9uID0gL14oX3xcXChcXHd8W149Pl0rXFwpKVxccz0+XFxze3x9JC9nO1xuXG4gICAgY29kZSA9IGNvZGUudG9TdHJpbmcoKTtcbiAgICBjb2RlID0gY29kZS5yZXBsYWNlKFxuICAgICAgY29kZS5pbmRleE9mKCdmdW5jdGlvbicpID09PSAwID8gcmVndWxhckZ1bmN0aW9uIDogYXJyb3dGdW5jdGlvbixcbiAgICAnJyk7XG4gIH1cblxuICByZXR1cm4gY29kZTtcbn07XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gYXNzZXJ0O1xuXG5mdW5jdGlvbiBhc3NlcnQodmFsLCBtc2cpIHtcbiAgaWYgKCF2YWwpXG4gICAgdGhyb3cgbmV3IEVycm9yKG1zZyB8fCAnQXNzZXJ0aW9uIGZhaWxlZCcpO1xufVxuXG5hc3NlcnQuZXF1YWwgPSBmdW5jdGlvbiBhc3NlcnRFcXVhbChsLCByLCBtc2cpIHtcbiAgaWYgKGwgIT0gcilcbiAgICB0aHJvdyBuZXcgRXJyb3IobXNnIHx8ICgnQXNzZXJ0aW9uIGZhaWxlZDogJyArIGwgKyAnICE9ICcgKyByKSk7XG59O1xuIl19
;
  return module.exports ||
      exports.BEMHTML;
}({}, {});
/// -------------------------------------
/// --------- BEM-XJST Runtime End ------
/// -------------------------------------

var api = new BEMHTML({"elemJsInstances":true});
/// -------------------------------------
/// ------ BEM-XJST User-code Start -----
/// -------------------------------------
api.compile(function(match, block, elem, mod, elemMod, oninit, xjstOptions, wrap, replace, extend, mode, def, content, appendContent, prependContent, attrs, addAttrs, js, addJs, mix, addMix, tag, cls, bem, local, applyCtx, applyNext, apply) {
/* begin: /Users/tadatuta/projects/bem/bem-core/common.blocks/ua/ua.bemhtml.js */
block('ua')(
    tag()('script'),
    bem()(false),
    content()([
        '(function(e,c){',
            'e[c]=e[c].replace(/(ua_js_)no/g,"$1yes");',
        '})(document.documentElement,"className");'
    ])
);

/* end: /Users/tadatuta/projects/bem/bem-core/common.blocks/ua/ua.bemhtml.js */
/* begin: /Users/tadatuta/projects/bem/bem-core/common.blocks/page/page.bemhtml.js */
block('page')(

    mode('doctype')(function() {
        return { html : this.ctx.doctype || '<!DOCTYPE html>' };
    }),

    wrap()(function() {
        var ctx = this.ctx;
        this._nonceCsp = ctx.nonce;

        return [
            apply('doctype'),
            {
                tag : 'html',
                attrs : { lang : ctx.lang },
                cls : 'ua_js_no',
                content : [
                    {
                        elem : 'head',
                        content : [
                            { tag : 'meta', attrs : { charset : 'utf-8' } },
                            ctx.uaCompatible === false? '' : {
                                tag : 'meta',
                                attrs : {
                                    'http-equiv' : 'X-UA-Compatible',
                                    content : ctx.uaCompatible || 'IE=edge'
                                }
                            },
                            { tag : 'title', content : ctx.title },
                            { block : 'ua', attrs : { nonce : ctx.nonce } },
                            ctx.head,
                            ctx.styles,
                            ctx.favicon? { elem : 'favicon', url : ctx.favicon } : ''
                        ]
                    },
                    ctx
                ]
            }
        ];
    }),

    tag()('body'),

    content()(function() {
        return [
            applyNext(),
            this.ctx.scripts
        ];
    }),

    elem('head')(
        bem()(false),
        tag()('head')
    ),

    elem('meta')(
        bem()(false),
        tag()('meta')
    ),

    elem('link')(
        bem()(false),
        tag()('link')
    ),

    elem('favicon')(
        bem()(false),
        tag()('link'),
        attrs()(function() { return { rel : 'shortcut icon', href : this.ctx.url }; })
    )

);

/* end: /Users/tadatuta/projects/bem/bem-core/common.blocks/page/page.bemhtml.js */
/* begin: /Users/tadatuta/projects/bem/bem-core/common.blocks/page/__css/page__css.bemhtml.js */
block('page').elem('css')(
    bem()(false),
    tag()('style'),
    match(function() { return this.ctx.url; })(
        tag()('link'),
        attrs()(function() { return { rel : 'stylesheet', href : this.ctx.url }; })
    )
);

/* end: /Users/tadatuta/projects/bem/bem-core/common.blocks/page/__css/page__css.bemhtml.js */
/* begin: /Users/tadatuta/projects/bem/bem-core/common.blocks/page/__js/page__js.bemhtml.js */
block('page').elem('js')(
    bem()(false),
    tag()('script'),
    attrs()(function() {
        var attrs = {};
        if(this.ctx.url) {
            attrs.src = this.ctx.url;
        } else if(this._nonceCsp) {
            attrs.nonce = this._nonceCsp;
        }

        return attrs;
    })
);

/* end: /Users/tadatuta/projects/bem/bem-core/common.blocks/page/__js/page__js.bemhtml.js */
/* begin: /Users/tadatuta/projects/bem/bem-core/common.blocks/ua/__svg/ua__svg.bemhtml.js */
block('ua').content()(function() {
    return [
        applyNext(),
        {
            html : [
                '(function(d,n){',
                    'd.documentElement.className+=',
                    '" ua_svg_"+(d[n]&&d[n]("http://www.w3.org/2000/svg","svg").createSVGRect?"yes":"no");',
                '})(document,"createElementNS");'
            ].join('')
        }
    ];
});

/* end: /Users/tadatuta/projects/bem/bem-core/common.blocks/ua/__svg/ua__svg.bemhtml.js */
/* begin: /Users/tadatuta/projects/bem/bem-core/desktop.blocks/page/__conditional-comment/page__conditional-comment.bemhtml.js */
block('page').elem('conditional-comment')(
    tag()(false),

    content()(function() {
        var ctx = this.ctx,
            cond = ctx.condition
                .replace('<', 'lt')
                .replace('>', 'gt')
                .replace('=', 'e'),
            hasNegation = cond.indexOf('!') > -1,
            includeOthers = ctx.msieOnly === false,
            hasNegationOrIncludeOthers = hasNegation || includeOthers;

        return [
            { html : '<!--[if ' + cond + ']>' },
            includeOthers? { html : '<!' } : '',
            hasNegationOrIncludeOthers? { html : '-->' } : '',
            applyNext(),
            hasNegationOrIncludeOthers? { html : '<!--' } : '',
            { html : '<![endif]-->' }
        ];
    })
);

/* end: /Users/tadatuta/projects/bem/bem-core/desktop.blocks/page/__conditional-comment/page__conditional-comment.bemhtml.js */
oninit(function(exports, context) {
    var BEMContext = exports.BEMContext || context.BEMContext;
    // Provides third-party libraries from different modular systems
    BEMContext.prototype.require = function(lib) {
       return __bem_xjst_libs__[lib];
    };
});;
});
api.exportApply(exports);
/// -------------------------------------
/// ------ BEM-XJST User-code End -------
/// -------------------------------------


        return exports;
    };

    

    var defineAsGlobal = true;

    // Provide with CommonJS
    if (typeof module === 'object' && typeof module.exports === 'object') {
        exports['BEMHTML'] = buildBemXjst({
    
}
);
        defineAsGlobal = false;
    }

    // Provide to YModules
    if (typeof modules === 'object') {
        modules.define(
            'BEMHTML',
            [],
            function(
                provide
                
                ) {
                    provide(buildBemXjst({
    
}
));
                }
            );

        defineAsGlobal = false;
    }

    // Provide to global scope
    if (defineAsGlobal) {
        BEMHTML = buildBemXjst({
    
}
);
        global['BEMHTML'] = BEMHTML;
    }
})(typeof window !== "undefined" ? window : global || this);
