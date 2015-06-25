(function(g) {
  var __bem_xjst = function(exports) {
     var $$mode = "", $$block = "", $$elem = "", $$elemMods = null, $$mods = null;

var __$ref = {};

function apply(ctx) {
    ctx = ctx || this;
    $$mods = ctx["mods"];
    $$elemMods = ctx["elemMods"];
    $$elem = ctx["elem"];
    $$block = ctx["block"];
    $$mode = ctx["_mode"];
    try {
        return applyc(ctx, __$ref);
    } catch (e) {
        e.xjstContext = ctx;
        throw e;
    }
}

exports.apply = apply;

function applyc(__$ctx, __$ref) {
    var __$t = $$mode;
    if (__$t === "content") {
        var __$t = $$block;
        if (__$t === "page") {
            if ($$elem === "conditional-comment" && (__$ctx.__$a0 & 1) === 0) {
                var __$r = __$b1(__$ctx, __$ref);
                if (__$r !== __$ref) return __$r;
            }
            if (!$$elem && (__$ctx.__$a0 & 16) === 0) {
                return [ function __$lb__$29() {
                    var __$r__$30;
                    var __$l0__$31 = __$ctx.__$a0;
                    __$ctx.__$a0 = __$ctx.__$a0 | 16;
                    __$r__$30 = applyc(__$ctx, __$ref);
                    __$ctx.__$a0 = __$l0__$31;
                    return __$r__$30;
                }(), __$ctx.ctx.scripts ];
            }
        } else if (__$t === "ua") {
            if (!$$elem && (__$ctx.__$a0 & 2) === 0) {
                return [ function __$lb__$8() {
                    var __$r__$9;
                    var __$l0__$10 = __$ctx.__$a0;
                    __$ctx.__$a0 = __$ctx.__$a0 | 2;
                    __$r__$9 = applyc(__$ctx, __$ref);
                    __$ctx.__$a0 = __$l0__$10;
                    return __$r__$9;
                }(), "(function(d,n){", "d.documentElement.className+=", '" ua_svg_"+(d[n]&&d[n]("http://www.w3.org/2000/svg","svg").createSVGRect?"yes":"no");', '})(document,"createElementNS");' ];
            }
        }
        return __$ctx.ctx.content;
        if ($$block === "ua" && !$$elem) {
            return [ "(function(e,c){", 'e[c]=e[c].replace(/(ua_js_)no/g,"$1yes");', '})(document.documentElement,"className");' ];
        }
    } else if (__$t === "tag") {
        var __$t = $$block;
        if (__$t === "page") {
            var __$t = $$elem;
            if (__$t === "conditional-comment") {
                return false;
            } else if (__$t === "js") {
                return "script";
            } else if (__$t === "css") {
                if (__$ctx.ctx.url) {
                    return "link";
                }
                return "style";
            } else if (__$t === "favicon") {
                return "link";
            } else if (__$t === "link") {
                return "link";
            } else if (__$t === "meta") {
                return "meta";
            } else if (__$t === "head") {
                return "head";
            }
            if (!$$elem) {
                return "body";
            }
        }
        return undefined;
        if ($$block === "ua" && !$$elem) {
            return "script";
        }
    } else if (__$t === "js") {
        return undefined;
    } else if (__$t === "attrs") {
        var __$t = $$block;
        if (__$t === "page") {
            var __$t = $$elem;
            if (__$t === "js") {
                var __$r = __$b18(__$ctx, __$ref);
                if (__$r !== __$ref) return __$r;
            } else if (__$t === "css") {
                if (__$ctx.ctx.url) {
                    return {
                        rel: "stylesheet",
                        href: __$ctx.ctx.url
                    };
                }
            } else if (__$t === "favicon") {
                return {
                    rel: "shortcut icon",
                    href: __$ctx.ctx.url
                };
            }
        }
        return undefined;
    } else if (__$t === "bem") {
        var __$t = $$block;
        if (__$t === "page") {
            var __$t = $$elem;
            if (__$t === "js") {
                return false;
            } else if (__$t === "css") {
                return false;
            } else if (__$t === "favicon") {
                return false;
            } else if (__$t === "link") {
                return false;
            } else if (__$t === "meta") {
                return false;
            } else if (__$t === "head") {
                return false;
            }
        }
        return undefined;
        if ($$block === "ua" && !$$elem) {
            return false;
        }
    } else if (__$t === "default") {
        var __$t = $$block;
        if (__$t === "page") {
            var __$t = $$elem;
            if (__$t === "css") {
                var __$t = __$ctx.ctx.hasOwnProperty("ie");
                if (__$t) {
                    if (__$ctx.ctx.ie === true && (__$ctx.__$a0 & 4) === 0) {
                        var __$r = __$b30(__$ctx, __$ref);
                        if (__$r !== __$ref) return __$r;
                    }
                    if ((__$ctx.__$a0 & 8) === 0) {
                        var __$r = __$b31(__$ctx, __$ref);
                        if (__$r !== __$ref) return __$r;
                    }
                }
            }
            if (!$$elem && (__$ctx.__$a0 & 32) === 0) {
                var __$r = __$b32(__$ctx, __$ref);
                if (__$r !== __$ref) return __$r;
            }
        } else if (__$t === "i-bem") {
            if ($$elem === "i18n") {
                var __$r = __$b33(__$ctx, __$ref);
                if (__$r !== __$ref) return __$r;
            }
        }
        var __$r = __$b34(__$ctx, __$ref);
        if (__$r !== __$ref) return __$r;
    } else if (__$t === "mix") {
        return undefined;
    } else if (__$t === "cls") {
        return undefined;
    } else if (__$t === "") {
        if (__$ctx.ctx && __$ctx.ctx._vow && (__$ctx.__$a0 & 64) === 0) {
            var __$r = __$b37(__$ctx, __$ref);
            if (__$r !== __$ref) return __$r;
        }
        if (__$ctx.isSimple(__$ctx.ctx)) {
            var __$r = __$b38(__$ctx, __$ref);
            if (__$r !== __$ref) return __$r;
        }
        if (!__$ctx.ctx) {
            var __$r = __$b39(__$ctx, __$ref);
            if (__$r !== __$ref) return __$r;
        }
        if (__$ctx.isArray(__$ctx.ctx)) {
            var __$r = __$b40(__$ctx, __$ref);
            if (__$r !== __$ref) return __$r;
        }
        var __$r = __$b41(__$ctx, __$ref);
        if (__$r !== __$ref) return __$r;
    }
}

[ function(exports, context) {
    var undef, BEM_ = {}, toString = Object.prototype.toString, slice = Array.prototype.slice, isArray = Array.isArray || function(obj) {
        return toString.call(obj) === "[object Array]";
    }, SHORT_TAGS = {
        area: 1,
        base: 1,
        br: 1,
        col: 1,
        command: 1,
        embed: 1,
        hr: 1,
        img: 1,
        input: 1,
        keygen: 1,
        link: 1,
        meta: 1,
        param: 1,
        source: 1,
        wbr: 1
    };
    (function(BEM, undefined) {
        var MOD_DELIM = "_", ELEM_DELIM = "__", NAME_PATTERN = "[a-zA-Z0-9-]+";
        function buildModPostfix(modName, modVal) {
            var res = MOD_DELIM + modName;
            if (modVal !== true) res += MOD_DELIM + modVal;
            return res;
        }
        function buildBlockClass(name, modName, modVal) {
            var res = name;
            if (modVal) res += buildModPostfix(modName, modVal);
            return res;
        }
        function buildElemClass(block, name, modName, modVal) {
            var res = buildBlockClass(block) + ELEM_DELIM + name;
            if (modVal) res += buildModPostfix(modName, modVal);
            return res;
        }
        BEM.INTERNAL = {
            NAME_PATTERN: NAME_PATTERN,
            MOD_DELIM: MOD_DELIM,
            ELEM_DELIM: ELEM_DELIM,
            buildModPostfix: buildModPostfix,
            buildClass: function(block, elem, modName, modVal) {
                var typeOfModName = typeof modName;
                if (typeOfModName === "string" || typeOfModName === "boolean") {
                    var typeOfModVal = typeof modVal;
                    if (typeOfModVal !== "string" && typeOfModVal !== "boolean") {
                        modVal = modName;
                        modName = elem;
                        elem = undef;
                    }
                } else if (typeOfModName !== "undefined") {
                    modName = undef;
                } else if (elem && typeof elem !== "string") {
                    elem = undef;
                }
                if (!(elem || modName)) {
                    return block;
                }
                return elem ? buildElemClass(block, elem, modName, modVal) : buildBlockClass(block, modName, modVal);
            },
            buildModsClasses: function(block, elem, mods) {
                var res = "";
                if (mods) {
                    var modName;
                    for (modName in mods) {
                        if (!mods.hasOwnProperty(modName)) continue;
                        var modVal = mods[modName];
                        if (!modVal && modVal !== 0) continue;
                        typeof modVal !== "boolean" && (modVal += "");
                        res += " " + (elem ? buildElemClass(block, elem, modName, modVal) : buildBlockClass(block, modName, modVal));
                    }
                }
                return res;
            },
            buildClasses: function(block, elem, mods) {
                var res = "";
                res += elem ? buildElemClass(block, elem) : buildBlockClass(block);
                res += this.buildModsClasses(block, elem, mods);
                return res;
            }
        };
    })(BEM_);
    context.BEMContext = BEMContext;
    function BEMContext(context, apply_) {
        this.ctx = typeof context === "undefined" ? "" : context;
        this.apply = apply_;
        this._str = "";
        var _this = this;
        this._buf = {
            push: function() {
                var chunks = slice.call(arguments).join("");
                _this._str += chunks;
            },
            join: function() {
                return this._str;
            }
        };
        this._ = this;
        this._start = true;
        this._mode = "";
        this._listLength = 0;
        this._notNewList = false;
        this.position = 0;
        this.block = undef;
        this.elem = undef;
        this.mods = undef;
        this.elemMods = undef;
    }
    BEMContext.prototype.isArray = isArray;
    BEMContext.prototype.isSimple = function isSimple(obj) {
        if (!obj || obj === true) return true;
        var t = typeof obj;
        return t === "string" || t === "number";
    };
    BEMContext.prototype.isShortTag = function isShortTag(t) {
        return SHORT_TAGS.hasOwnProperty(t);
    };
    BEMContext.prototype.extend = function extend(o1, o2) {
        if (!o1 || !o2) return o1 || o2;
        var res = {}, n;
        for (n in o1) o1.hasOwnProperty(n) && (res[n] = o1[n]);
        for (n in o2) o2.hasOwnProperty(n) && (res[n] = o2[n]);
        return res;
    };
    var cnt = 0, id = +new Date(), expando = "__" + id, get = function() {
        return "uniq" + id + ++cnt;
    };
    BEMContext.prototype.identify = function(obj, onlyGet) {
        if (!obj) return get();
        if (onlyGet || obj[expando]) {
            return obj[expando];
        } else {
            return obj[expando] = get();
        }
    };
    BEMContext.prototype.xmlEscape = function xmlEscape(str) {
        return (str + "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };
    BEMContext.prototype.attrEscape = function attrEscape(str) {
        return (str + "").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    };
    BEMContext.prototype.jsAttrEscape = function jsAttrEscape(str) {
        return (str + "").replace(/&/g, "&amp;").replace(/'/g, "&#39;");
    };
    BEMContext.prototype.BEM = BEM_;
    BEMContext.prototype.isFirst = function isFirst() {
        return this.position === 1;
    };
    BEMContext.prototype.isLast = function isLast() {
        return this.position === this._listLength;
    };
    BEMContext.prototype.generateId = function generateId() {
        return this.identify(this.ctx);
    };
    var oldApply = exports.apply;
    exports.apply = BEMContext.apply = function BEMContext_apply(context) {
        var ctx = new BEMContext(context || this, oldApply);
        ctx.apply();
        return ctx._str;
    };
    BEMContext.prototype.reapply = BEMContext.apply;
}, function() {
    (function(global, bem_) {
        if (bem_.I18N) {
            return;
        }
        global.BEM = bem_;
        var i18n = global.BEM.I18N = function(keyset, key) {
            return key;
        };
        i18n.keyset = function() {
            return i18n;
        };
        i18n.key = function(key) {
            return key;
        };
        i18n.lang = function() {
            return;
        };
    })(this, typeof BEM === "undefined" ? {} : BEM);
} ].forEach(function(fn) {
    fn(exports, this);
}, {
    recordExtensions: function(ctx) {
        ctx["__$a0"] = 0;
        ctx["_mode"] = undefined;
        ctx["ctx"] = undefined;
        ctx["_str"] = undefined;
        ctx["block"] = undefined;
        ctx["elem"] = undefined;
        ctx["_notNewList"] = undefined;
        ctx["position"] = undefined;
        ctx["_listLength"] = undefined;
        ctx["_currBlock"] = undefined;
        ctx["mods"] = undefined;
        ctx["elemMods"] = undefined;
    },
    resetApplyNext: function(ctx) {
        ctx["__$a0"] = 0;
    }
});

function __$b1(__$ctx, __$ref) {
    var ctx__$0 = __$ctx.ctx, cond__$1 = ctx__$0.condition.replace("<", "lt").replace(">", "gt").replace("=", "e"), hasNegation__$2 = cond__$1.indexOf("!") > -1, includeOthers__$3 = ctx__$0.msieOnly === false, hasNegationOrIncludeOthers__$4 = hasNegation__$2 || includeOthers__$3;
    return [ "<!--[if " + cond__$1 + "]>", includeOthers__$3 ? "<!" : "", hasNegationOrIncludeOthers__$4 ? "-->" : "", function __$lb__$5() {
        var __$r__$6;
        var __$l0__$7 = __$ctx.__$a0;
        __$ctx.__$a0 = __$ctx.__$a0 | 1;
        __$r__$6 = applyc(__$ctx, __$ref);
        __$ctx.__$a0 = __$l0__$7;
        return __$r__$6;
    }(), hasNegationOrIncludeOthers__$4 ? "<!--" : "", "<![endif]-->" ];
}

function __$b18(__$ctx, __$ref) {
    var attrs__$11 = {};
    if (__$ctx.ctx.url) {
        attrs__$11.src = __$ctx.ctx.url;
    } else if (__$ctx._nonceCsp) {
        attrs__$11.nonce = __$ctx._nonceCsp;
    }
    return attrs__$11;
}

function __$b30(__$ctx, __$ref) {
    var url__$12 = __$ctx.ctx.url;
    var __$r__$14;
    var __$l0__$15 = $$mode;
    $$mode = "";
    var __$l1__$16 = __$ctx.ctx;
    __$ctx.ctx = [ 6, 7, 8, 9 ].map(function(v) {
        return {
            elem: "css",
            url: url__$12 + ".ie" + v + ".css",
            ie: "IE " + v
        };
    });
    var __$r__$18;
    var __$l2__$19 = __$ctx.__$a0;
    __$ctx.__$a0 = __$ctx.__$a0 | 4;
    __$r__$18 = applyc(__$ctx, __$ref);
    __$ctx.__$a0 = __$l2__$19;
    __$r__$14 = __$r__$18;
    $$mode = __$l0__$15;
    __$ctx.ctx = __$l1__$16;
    return __$r__$14;
}

function __$b31(__$ctx, __$ref) {
    var ie__$20 = __$ctx.ctx.ie, hideRule__$21 = !ie__$20 ? [ "gt IE 9", "<!-->", "<!--" ] : ie__$20 === "!IE" ? [ ie__$20, "<!-->", "<!--" ] : [ ie__$20, "", "" ];
    var __$r__$23;
    var __$l0__$24 = $$mode;
    $$mode = "";
    var __$l1__$25 = __$ctx.ctx;
    __$ctx.ctx = [ "<!--[if " + hideRule__$21[0] + "]>" + hideRule__$21[1], __$ctx.ctx, hideRule__$21[2] + "<![endif]-->" ];
    var __$r__$27;
    var __$l2__$28 = __$ctx.__$a0;
    __$ctx.__$a0 = __$ctx.__$a0 | 8;
    __$r__$27 = applyc(__$ctx, __$ref);
    __$ctx.__$a0 = __$l2__$28;
    __$r__$23 = __$r__$27;
    $$mode = __$l0__$24;
    __$ctx.ctx = __$l1__$25;
    return __$r__$23;
}

function __$b32(__$ctx, __$ref) {
    var ctx__$32 = __$ctx.ctx;
    __$ctx._nonceCsp = ctx__$32.nonce;
    var __$r__$34;
    var __$l0__$35 = $$mode;
    $$mode = "";
    var __$l1__$36 = __$ctx.ctx;
    __$ctx.ctx = [ ctx__$32.doctype || "<!DOCTYPE html>", {
        tag: "html",
        cls: "ua_js_no",
        content: [ {
            elem: "head",
            content: [ {
                tag: "meta",
                attrs: {
                    charset: "utf-8"
                }
            }, ctx__$32.uaCompatible === false ? "" : {
                tag: "meta",
                attrs: {
                    "http-equiv": "X-UA-Compatible",
                    content: ctx__$32.uaCompatible || "IE=edge"
                }
            }, {
                tag: "title",
                content: ctx__$32.title
            }, {
                block: "ua",
                attrs: {
                    nonce: ctx__$32.nonce
                }
            }, ctx__$32.head, ctx__$32.styles, ctx__$32.favicon ? {
                elem: "favicon",
                url: ctx__$32.favicon
            } : "" ]
        }, ctx__$32 ]
    } ];
    var __$r__$38;
    var __$l2__$39 = __$ctx.__$a0;
    __$ctx.__$a0 = __$ctx.__$a0 | 32;
    __$r__$38 = applyc(__$ctx, __$ref);
    __$ctx.__$a0 = __$l2__$39;
    __$r__$34 = __$r__$38;
    $$mode = __$l0__$35;
    __$ctx.ctx = __$l1__$36;
    return __$r__$34;
}

function __$b33(__$ctx, __$ref) {
    if (!__$ctx.ctx) return "";
    var ctx__$40 = __$ctx.ctx, keyset__$41 = ctx__$40.keyset, key__$42 = ctx__$40.key, params__$43 = ctx__$40.params || {};
    if (!(keyset__$41 || key__$42)) return "";
    if (typeof ctx__$40.content === "undefined" || ctx__$40.content !== null) {
        params__$43.content = exports.apply(ctx__$40.content);
    }
    __$ctx._buf.push(BEM.I18N(keyset__$41, key__$42, params__$43));
    return;
}

function __$b34(__$ctx, __$ref) {
    var BEM_INTERNAL__$44 = __$ctx.BEM.INTERNAL, ctx__$45 = __$ctx.ctx, isBEM__$46, tag__$47, res__$48;
    var __$r__$50;
    var __$l0__$51 = __$ctx._str;
    __$ctx._str = "";
    var vBlock__$52 = $$block;
    var __$r__$54;
    var __$l1__$55 = $$mode;
    $$mode = "tag";
    __$r__$54 = applyc(__$ctx, __$ref);
    $$mode = __$l1__$55;
    tag__$47 = __$r__$54;
    typeof tag__$47 !== "undefined" || (tag__$47 = ctx__$45.tag);
    typeof tag__$47 !== "undefined" || (tag__$47 = "div");
    if (tag__$47) {
        var jsParams__$56, js__$57;
        if (vBlock__$52 && ctx__$45.js !== false) {
            var __$r__$58;
            var __$l2__$59 = $$mode;
            $$mode = "js";
            __$r__$58 = applyc(__$ctx, __$ref);
            $$mode = __$l2__$59;
            js__$57 = __$r__$58;
            js__$57 = js__$57 ? __$ctx.extend(ctx__$45.js, js__$57 === true ? {} : js__$57) : ctx__$45.js === true ? {} : ctx__$45.js;
            js__$57 && ((jsParams__$56 = {})[BEM_INTERNAL__$44.buildClass(vBlock__$52, ctx__$45.elem)] = js__$57);
        }
        __$ctx._str += "<" + tag__$47;
        var __$r__$60;
        var __$l3__$61 = $$mode;
        $$mode = "bem";
        __$r__$60 = applyc(__$ctx, __$ref);
        $$mode = __$l3__$61;
        isBEM__$46 = __$r__$60;
        typeof isBEM__$46 !== "undefined" || (isBEM__$46 = typeof ctx__$45.bem !== "undefined" ? ctx__$45.bem : ctx__$45.block || ctx__$45.elem);
        var __$r__$63;
        var __$l4__$64 = $$mode;
        $$mode = "cls";
        __$r__$63 = applyc(__$ctx, __$ref);
        $$mode = __$l4__$64;
        var cls__$62 = __$r__$63;
        cls__$62 || (cls__$62 = ctx__$45.cls);
        var addJSInitClass__$65 = ctx__$45.block && jsParams__$56 && !ctx__$45.elem;
        if (isBEM__$46 || cls__$62) {
            __$ctx._str += ' class="';
            if (isBEM__$46) {
                __$ctx._str += BEM_INTERNAL__$44.buildClasses(vBlock__$52, ctx__$45.elem, ctx__$45.elemMods || ctx__$45.mods);
                var __$r__$67;
                var __$l5__$68 = $$mode;
                $$mode = "mix";
                __$r__$67 = applyc(__$ctx, __$ref);
                $$mode = __$l5__$68;
                var mix__$66 = __$r__$67;
                ctx__$45.mix && (mix__$66 = mix__$66 ? [].concat(mix__$66, ctx__$45.mix) : ctx__$45.mix);
                if (mix__$66) {
                    var visited__$69 = {}, visitedKey__$70 = function(block, elem) {
                        return (block || "") + "__" + (elem || "");
                    };
                    visited__$69[visitedKey__$70(vBlock__$52, $$elem)] = true;
                    __$ctx.isArray(mix__$66) || (mix__$66 = [ mix__$66 ]);
                    for (var i__$71 = 0; i__$71 < mix__$66.length; i__$71++) {
                        var mixItem__$72 = mix__$66[i__$71];
                        typeof mixItem__$72 === "string" && (mixItem__$72 = {
                            block: mixItem__$72
                        });
                        var hasItem__$73 = mixItem__$72.block && (vBlock__$52 !== ctx__$45.block || mixItem__$72.block !== vBlock__$52) || mixItem__$72.elem, mixBlock__$74 = mixItem__$72.block || mixItem__$72._block || $$block, mixElem__$75 = mixItem__$72.elem || mixItem__$72._elem || $$elem;
                        hasItem__$73 && (__$ctx._str += " ");
                        __$ctx._str += BEM_INTERNAL__$44[hasItem__$73 ? "buildClasses" : "buildModsClasses"](mixBlock__$74, mixItem__$72.elem || mixItem__$72._elem || (mixItem__$72.block ? undefined : $$elem), mixItem__$72.elemMods || mixItem__$72.mods);
                        if (mixItem__$72.js) {
                            (jsParams__$56 || (jsParams__$56 = {}))[BEM_INTERNAL__$44.buildClass(mixBlock__$74, mixItem__$72.elem)] = mixItem__$72.js === true ? {} : mixItem__$72.js;
                            addJSInitClass__$65 || (addJSInitClass__$65 = mixBlock__$74 && !mixItem__$72.elem);
                        }
                        if (hasItem__$73 && !visited__$69[visitedKey__$70(mixBlock__$74, mixElem__$75)]) {
                            visited__$69[visitedKey__$70(mixBlock__$74, mixElem__$75)] = true;
                            var __$r__$77;
                            var __$l6__$78 = $$mode;
                            $$mode = "mix";
                            var __$l7__$79 = $$block;
                            $$block = mixBlock__$74;
                            var __$l8__$80 = $$elem;
                            $$elem = mixElem__$75;
                            __$r__$77 = applyc(__$ctx, __$ref);
                            $$mode = __$l6__$78;
                            $$block = __$l7__$79;
                            $$elem = __$l8__$80;
                            var nestedMix__$76 = __$r__$77;
                            if (nestedMix__$76) {
                                Array.isArray(nestedMix__$76) || (nestedMix__$76 = [ nestedMix__$76 ]);
                                for (var j__$81 = 0; j__$81 < nestedMix__$76.length; j__$81++) {
                                    var nestedItem__$82 = nestedMix__$76[j__$81];
                                    if (!nestedItem__$82.block && !nestedItem__$82.elem || !visited__$69[visitedKey__$70(nestedItem__$82.block, nestedItem__$82.elem)]) {
                                        nestedItem__$82._block = mixBlock__$74;
                                        nestedItem__$82._elem = mixElem__$75;
                                        mix__$66.splice(i__$71 + 1, 0, nestedItem__$82);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            cls__$62 && (__$ctx._str += isBEM__$46 ? " " + cls__$62 : cls__$62);
            __$ctx._str += addJSInitClass__$65 ? ' i-bem"' : '"';
        }
        if (isBEM__$46 && jsParams__$56) {
            __$ctx._str += " data-bem='" + __$ctx.jsAttrEscape(JSON.stringify(jsParams__$56)) + "'";
        }
        var __$r__$84;
        var __$l9__$85 = $$mode;
        $$mode = "attrs";
        __$r__$84 = applyc(__$ctx, __$ref);
        $$mode = __$l9__$85;
        var attrs__$83 = __$r__$84;
        attrs__$83 = __$ctx.extend(attrs__$83, ctx__$45.attrs);
        if (attrs__$83) {
            var name__$86, attr__$87;
            for (name__$86 in attrs__$83) {
                attr__$87 = attrs__$83[name__$86];
                if (typeof attr__$87 === "undefined") continue;
                __$ctx._str += " " + name__$86 + '="' + __$ctx.attrEscape(__$ctx.isSimple(attr__$87) ? attr__$87 : __$ctx.reapply(attr__$87)) + '"';
            }
        }
    }
    if (__$ctx.isShortTag(tag__$47)) {
        __$ctx._str += "/>";
    } else {
        tag__$47 && (__$ctx._str += ">");
        var __$r__$89;
        var __$l10__$90 = $$mode;
        $$mode = "content";
        __$r__$89 = applyc(__$ctx, __$ref);
        $$mode = __$l10__$90;
        var content__$88 = __$r__$89;
        if (content__$88 || content__$88 === 0) {
            isBEM__$46 = vBlock__$52 || $$elem;
            var __$r__$91;
            var __$l11__$92 = $$mode;
            $$mode = "";
            var __$l12__$93 = __$ctx._notNewList;
            __$ctx._notNewList = false;
            var __$l13__$94 = __$ctx.position;
            __$ctx.position = isBEM__$46 ? 1 : __$ctx.position;
            var __$l14__$95 = __$ctx._listLength;
            __$ctx._listLength = isBEM__$46 ? 1 : __$ctx._listLength;
            var __$l15__$96 = __$ctx.ctx;
            __$ctx.ctx = content__$88;
            __$r__$91 = applyc(__$ctx, __$ref);
            $$mode = __$l11__$92;
            __$ctx._notNewList = __$l12__$93;
            __$ctx.position = __$l13__$94;
            __$ctx._listLength = __$l14__$95;
            __$ctx.ctx = __$l15__$96;
        }
        tag__$47 && (__$ctx._str += "</" + tag__$47 + ">");
    }
    res__$48 = __$ctx._str;
    __$r__$50 = undefined;
    __$ctx._str = __$l0__$51;
    __$ctx._buf.push(res__$48);
    return;
}

function __$b37(__$ctx, __$ref) {
    var __$r__$98;
    var __$l0__$99 = $$mode;
    $$mode = "";
    var __$l1__$100 = __$ctx.ctx;
    __$ctx.ctx = __$ctx.ctx._value;
    var __$r__$102;
    var __$l2__$103 = __$ctx.__$a0;
    __$ctx.__$a0 = __$ctx.__$a0 | 64;
    __$r__$102 = applyc(__$ctx, __$ref);
    __$ctx.__$a0 = __$l2__$103;
    __$r__$98 = __$r__$102;
    $$mode = __$l0__$99;
    __$ctx.ctx = __$l1__$100;
    return;
}

function __$b38(__$ctx, __$ref) {
    __$ctx._listLength--;
    var ctx__$104 = __$ctx.ctx;
    if (ctx__$104 && ctx__$104 !== true || ctx__$104 === 0) {
        __$ctx._str += ctx__$104 + "";
    }
    return;
}

function __$b39(__$ctx, __$ref) {
    __$ctx._listLength--;
    return;
}

function __$b40(__$ctx, __$ref) {
    var ctx__$105 = __$ctx.ctx, len__$106 = ctx__$105.length, i__$107 = 0, prevPos__$108 = __$ctx.position, prevNotNewList__$109 = __$ctx._notNewList;
    if (prevNotNewList__$109) {
        __$ctx._listLength += len__$106 - 1;
    } else {
        __$ctx.position = 0;
        __$ctx._listLength = len__$106;
    }
    __$ctx._notNewList = true;
    while (i__$107 < len__$106) (function __$lb__$110() {
        var __$r__$111;
        var __$l0__$112 = __$ctx.ctx;
        __$ctx.ctx = ctx__$105[i__$107++];
        __$r__$111 = applyc(__$ctx, __$ref);
        __$ctx.ctx = __$l0__$112;
        return __$r__$111;
    })();
    prevNotNewList__$109 || (__$ctx.position = prevPos__$108);
    return;
}

function __$b41(__$ctx, __$ref) {
    __$ctx.ctx || (__$ctx.ctx = {});
    var vBlock__$113 = __$ctx.ctx.block, vElem__$114 = __$ctx.ctx.elem, block__$115 = __$ctx._currBlock || $$block;
    var __$r__$117;
    var __$l0__$118 = $$mode;
    $$mode = "default";
    var __$l1__$119 = $$block;
    $$block = vBlock__$113 || (vElem__$114 ? block__$115 : undefined);
    var __$l2__$120 = __$ctx._currBlock;
    __$ctx._currBlock = vBlock__$113 || vElem__$114 ? undefined : block__$115;
    var __$l3__$121 = $$elem;
    $$elem = vElem__$114;
    var __$l4__$122 = $$mods;
    $$mods = vBlock__$113 ? __$ctx.ctx.mods || (__$ctx.ctx.mods = {}) : $$mods;
    var __$l5__$123 = $$elemMods;
    $$elemMods = __$ctx.ctx.elemMods || {};
    $$block || $$elem ? __$ctx.position = (__$ctx.position || 0) + 1 : __$ctx._listLength--;
    applyc(__$ctx, __$ref);
    __$r__$117 = undefined;
    $$mode = __$l0__$118;
    $$block = __$l1__$119;
    __$ctx._currBlock = __$l2__$120;
    $$elem = __$l3__$121;
    $$mods = __$l4__$122;
    $$elemMods = __$l5__$123;
    return;
};
     return exports;
  }
  var defineAsGlobal = true;
  if(typeof exports === "object") {
    exports["BEMHTML"] = __bem_xjst({});
    defineAsGlobal = false;
  }
  if(typeof modules === "object") {
    modules.define("BEMHTML",
      function(provide) {
        provide(__bem_xjst({})) });
    defineAsGlobal = false;
  }
  defineAsGlobal && (g["BEMHTML"] = __bem_xjst({}));
})(this);