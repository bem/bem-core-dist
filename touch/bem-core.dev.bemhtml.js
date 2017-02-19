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
/* begin: /Users/tadatuta/projects/bem/bem-core/touch.blocks/page/page.bemhtml.js */
block('page')(

    def()(function() {
        return applyNext({ _zoom : this.ctx.zoom });
    }),

    elem('head').content()(function() {
        return [
            applyNext(),
            {
                elem : 'meta',
                attrs : {
                    name : 'viewport',
                    content : 'width=device-width,' +
                        (this._zoom?
                            'initial-scale=1' :
                            'maximum-scale=1,initial-scale=1,user-scalable=no')
                }
            },
            { elem : 'meta', attrs : { name : 'format-detection', content : 'telephone=no' } },
            { elem : 'link', attrs : { name : 'apple-mobile-web-app-capable', content : 'yes' } }
        ];
    }),

    mix()(function() {
        var mix = applyNext(),
            uaMix = [{ block : 'ua', attrs : { nonce : this._nonceCsp }, js : true }];

        return mix? uaMix.concat(mix) : uaMix;
    })
);

/* end: /Users/tadatuta/projects/bem/bem-core/touch.blocks/page/page.bemhtml.js */
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
/* begin: /Users/tadatuta/projects/bem/bem-core/touch.blocks/ua/ua.bemhtml.js */
block('ua').js()(true);

/* end: /Users/tadatuta/projects/bem/bem-core/touch.blocks/ua/ua.bemhtml.js */
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
/* begin: /Users/tadatuta/projects/bem/bem-core/touch.blocks/page/__icon/page__icon.bemhtml.js */
block('page').elem('icon').def()(function() {
    var ctx = this.ctx;
    return applyCtx([
        ctx.src16 && {
            elem : 'link',
            attrs : { rel : 'shortcut icon', href : ctx.src16 }
        },
        ctx.src114 && {
            elem : 'link',
            attrs : {
                rel : 'apple-touch-icon-precomposed',
                sizes : '114x114',
                href : ctx.src114
            }
        },
        ctx.src72 && {
            elem : 'link',
            attrs : {
                rel : 'apple-touch-icon-precomposed',
                sizes : '72x72',
                href : ctx.src72
            }
        },
        ctx.src57 && {
            elem : 'link',
            attrs : { rel : 'apple-touch-icon-precomposed', href : ctx.src57 }
        }
    ]);
});

/* end: /Users/tadatuta/projects/bem/bem-core/touch.blocks/page/__icon/page__icon.bemhtml.js */
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
