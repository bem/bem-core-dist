var BEMHTML;!function(t){function e(e){var n={},i=function(e,n){return function(i){if("object"==typeof n&&"undefined"!=typeof e)e.exports=i();else if("function"==typeof define&&define.amd)define([],i);else{var s;s="undefined"!=typeof window?window:"undefined"!=typeof t?t:"undefined"!=typeof self?self:this,s.bemhtml=i()}}(function(){return function t(e,n,i){function s(o,h){if(!n[o]){if(!e[o]){var c="function"==typeof require&&require;if(!h&&c)return c(o,!0);if(r)return r(o,!0);var l=new Error("Cannot find module '"+o+"'");throw l.code="MODULE_NOT_FOUND",l}var a=n[o]={exports:{}};e[o][0].call(a.exports,function(t){var n=e[o][1][t];return s(n?n:t)},a,a.exports,t,e,n,i)}return n[o].exports}for(var r="function"==typeof require&&require,o=0;o<i.length;o++)s(i[o]);return s}({1:[function(t,e,n){function i(t){this.bemxjst=t,this.jsClass=null,this.tag=new r(this),this.attrs=new r(this),this.mod=new r(this),this.js=new r(this),this.mix=new r(this),this.bem=new r(this),this.cls=new r(this),o.apply(this,arguments)}var s=t("inherits"),r=t("../bemxjst/match").Match,o=t("../bemxjst/entity").Entity;s(i,o),n.Entity=i,i.prototype.init=function(t,e){this.block=t,this.elem=e,this.jsClass=this.bemxjst.classBuilder.build(this.block,this.elem)},i.prototype._initRest=function(t){"default"===t?this.rest[t]=this.def:"tag"===t||"attrs"===t||"js"===t||"mix"===t||"bem"===t||"cls"===t||"content"===t?this.rest[t]=this[t]:this.rest.hasOwnProperty(t)||(this.rest[t]=new r(this))},i.prototype.defaultBody=function(t){var e=this.tag.exec(t);void 0===e&&(e=t.ctx.tag);var n;t.ctx.js!==!1&&(n=this.js.exec(t));var i=this.bem.exec(t),s=this.cls.exec(t),r=this.mix.exec(t),o=this.attrs.exec(t),h=this.content.exec(t);return 0===this.content.count&&void 0===h&&(h=t.ctx.content),this.bemxjst.render(t,this,e,n,i,s,r,o,h)}},{"../bemxjst/entity":5,"../bemxjst/match":7,inherits:10}],2:[function(t,e,n){function i(t){h.apply(this,arguments);var e="undefined"==typeof t.xhtml?!0:t.xhtml;this._shortTagCloser=e?"/>":">"}var s=t("inherits"),r=t("../bemxjst/utils"),o=t("./entity").Entity,h=t("../bemxjst");s(i,h),e.exports=i,i.prototype.Entity=o,i.prototype.runMany=function(t){var e="",n=this.context,i=n.position,s=n._notNewList;if(s?n._listLength+=t.length-1:(n.position=0,n._listLength=t.length),n._notNewList=!0,this.canFlush)for(var r=0;r<t.length;r++)e+=n._flush(this._run(t[r]));else for(var r=0;r<t.length;r++)e+=this._run(t[r]);return s||(n.position=i),e},i.prototype.render=function(t,e,n,i,s,o,h,c,l){var a=t.ctx;if(void 0===n&&(n="div"),!n)return this.renderNoTag(t,i,s,o,h,c,l);var u="<"+n,p=a.js;p!==!1&&(i===!0&&(i={}),i?p!==!0&&(i=r.extend(p,i)):i=p===!0?{}:p);var f;i&&(f={},f[e.jsClass]=i);var d=s;void 0===d&&(d=void 0===a.bem?e.block||e.elem:a.bem),d=!!d,void 0===o&&(o=a.cls);var m=e.block&&f&&!e.elem;if(!d&&!o)return this.renderClose(u,t,n,c,d,a,l);if(u+=' class="',d){var y=e.elem?t.elemMods:t.mods;u+=e.jsClass,u+=this.buildModsClasses(e.block,e.elem,y);var v=h;if(a.mix&&(v=v?[].concat(v,a.mix):a.mix),v){var x=this.renderMix(e,v,f,m);u+=x.out,f=x.jsParams,m=x.addJSInitClass}o&&(u+=" "+o)}else o&&(u+=o);return u+=m?' i-bem"':'"',d&&f&&(u+=" data-bem='"+r.jsAttrEscape(JSON.stringify(f))+"'"),this.renderClose(u,t,n,c,d,a,l)},i.prototype.renderClose=function(t,e,n,i,s,o,h){var c=t;if(i=r.extend(i,o.attrs)){var l;for(l in i){var a=i[l];void 0!==a&&a!==!1&&null!==a&&(c+=a===!0?" "+l:" "+l+'="'+r.attrEscape(r.isSimple(a)?a:this.context.reapply(a))+'"')}}return r.isShortTag(n)?(c+=this._shortTagCloser,this.canFlush&&(c=e._flush(c))):(c+=">",this.canFlush&&(c=e._flush(c)),(h||0===h)&&(c+=this.renderContent(h,s)),c+="</"+n+">"),this.canFlush&&(c=e._flush(c)),c},i.prototype.renderMix=function(t,e,n,i){var s={},o=this.context,h=n,c=i;s[t.jsClass]=!0,r.isArray(e)||(e=[e]);for(var l=this.classBuilder,a="",u=0;u<e.length;u++){var p=e[u];if(p){"string"==typeof p&&(p={block:p,elem:void 0});var f=!1;p.elem?f=p.elem!==t.elem&&p.elem!==o.elem||p.block&&p.block!==t.block:p.block&&(f=!(p.block===t.block&&p.mods)||p.mods&&t.elem);var d=p.block||p._block||o.block,m=p.elem||p._elem||o.elem,y=l.build(d,m),v=p.elem||p._elem||(p.block?void 0:o.elem);if(f&&(a+=" "+l.build(d,v)),a+=this.buildModsClasses(d,v,p.elem||!p.block&&(p._elem||o.elem)?p.elemMods:p.mods),p.js&&(h||(h={}),h[l.build(d,p.elem)]=p.js===!0?{}:p.js,c||(c=d&&!p.elem)),f&&!s[y]){s[y]=!0;var x=this.entities[y];if(x){var b=o.block,g=o.elem,k=x.mix.exec(o);if(o.elem=g,o.block=b,k)for(var w=0;w<k.length;w++){var M=k[w];(M.block||M.elem)&&s[l.build(M.block,M.elem)]||(M._block=d,M._elem=m,e=e.slice(0,u+1).concat(M,e.slice(u+1)))}}}}}return{out:a,jsParams:h,addJSInitClass:c}},i.prototype.buildModsClasses=function(t,e,n){if(!n)return"";var i,s="";for(i in n)if(n.hasOwnProperty(i)&&""!==i){var r=n[i];if(r||0===r){"boolean"!=typeof r&&(r+="");var o=this.classBuilder;s+=" "+(e?o.buildElemClass(t,e,i,r):o.buildBlockClass(t,i,r))}}return s},i.prototype.renderNoTag=function(t,e,n,i,s,r,o){return o||0===o?this._run(o):""}},{"../bemxjst":6,"../bemxjst/utils":9,"./entity":1,inherits:10}],3:[function(t,e,n){function i(t){this.modDelim=t.mod||"_",this.elemDelim=t.elem||"__"}n.ClassBuilder=i,i.prototype.build=function(t,e){return e?t+this.elemDelim+e:t},i.prototype.buildModPostfix=function(t,e){var n=this.modDelim+t;return e!==!0&&(n+=this.modDelim+e),n},i.prototype.buildBlockClass=function(t,e,n){var i=t;return n&&(i+=this.buildModPostfix(e,n)),i},i.prototype.buildElemClass=function(t,e,n,i){var s=this.buildBlockClass(t)+this.elemDelim+e;return i&&(s+=this.buildModPostfix(n,i)),s},i.prototype.split=function(t){return t.split(this.elemDelim,2)}},{}],4:[function(t,e,n){function i(t){this._bemxjst=t,this.ctx=null,this.block="",this._currBlock="",this.elem=null,this.mods={},this.elemMods={},this.position=0,this._listLength=0,this._notNewList=!1,this._onceRef={}}var s=t("./utils");n.Context=i,i.prototype._flush=null,i.prototype.isArray=s.isArray,i.prototype.isSimple=s.isSimple,i.prototype.isShortTag=s.isShortTag,i.prototype.extend=s.extend,i.prototype.identify=s.identify,i.prototype.xmlEscape=s.xmlEscape,i.prototype.attrEscape=s.attrEscape,i.prototype.jsAttrEscape=s.jsAttrEscape,i.prototype.isFirst=function(){return 1===this.position},i.prototype.isLast=function(){return this.position===this._listLength},i.prototype.generateId=function(){return s.identify(this.ctx)},i.prototype.reapply=function(t){return this._bemxjst.run(t)}},{"./utils":9}],5:[function(t,e,n){function i(t,e,n,i){this.bemxjst=t,this.block=null,this.elem=null,this.options={},this.canFlush=!0,this.def=new o(this),this.content=new o(this),this.rest={},this.init(e,n),this.initModes(i)}function s(){return this.ctx.content}var r=t("./utils"),o=t("./match").Match,h=t("./tree"),c=h.Template,l=h.PropertyMatch,a=h.CompilerOptions;n.Entity=i,i.prototype.init=function(t,e){this.block=t,this.elem=e},i.prototype.initModes=function(t){for(var e=0;e<t.length;e++){for(var n=t[e],i=n.predicates.length-1;i>=0;i--){var s=n.predicates[i];if(s instanceof l&&"_mode"===s.key){n.predicates.splice(i,1),this._initRest(s.value),this.rest[s.value].push(n);break}}-1===i&&this.def.push(n);for(var i=n.predicates.length-1;i>=0;i--){var s=n.predicates[i];s instanceof a&&(this.options=r.extend(this.options,s.options))}}},i.prototype.prepend=function(t){for(var e=Object.keys(this.rest),n=0;n<e.length;n++){var i=e[n];t.rest[i]&&this.rest[i].prepend(t.rest[i])}e=Object.keys(t.rest);for(var n=0;n<e.length;n++){var i=e[n];this.rest[i]||(this._initRest(i),this.rest[i].prepend(t.rest[i]))}},i.prototype.run=function(t){return 0!==this.def.count?this.def.exec(t):this.defaultBody(t)},i.prototype.setDefaults=function(){if(0!==this.content.count&&this.content.push(new c([],s)),0!==this.def.count){this.canFlush=this.options.flush||!1;var t=this;this.def.push(new c([],function(){return t.defaultBody(this)}))}}},{"./match":7,"./tree":8,"./utils":9}],6:[function(t,e,n){function i(t){this.options=t||{},this.entities=null,this.defaultEnt=null,this.tree=null,this.match=null,this.contextConstructor=function(t){h.call(this,t)},s(this.contextConstructor,h),this.context=null,this.classBuilder=new c(this.options.naming||{}),this.depth=0,this.canFlush=!1,this.oninit=null,this.defaultEnt=new this.Entity(this,"","",[]),this.defaultElemEnt=new this.Entity(this,"","",[])}var s=t("inherits"),r=t("./tree").Tree,o=t("./tree").PropertyMatch,h=t("./context").Context,c=t("./class-builder").ClassBuilder,l=t("./utils");e.exports=i,i.prototype.locals=r.methods.concat("local","applyCtx","applyNext","apply"),i.prototype.compile=function(t){function e(){return o._run(o.context.ctx)}function n(t,n){return n?o.local(n,function(){return o.local({ctx:t},e)}):o.local({ctx:t},e)}function i(t,e){return o.applyMode(t,e)}function s(t){return function(e){return o.local(t,e)}}var o=this,h=new r({refs:{applyCtx:n,local:s}}),c=this.recompileInput(t),l=h.build(c,[s,n,function u(t){return t?o.local(t,u):o.applyNext()},i]);this.tree&&(l={templates:l.templates.concat(this.tree.templates),oninit:this.tree.oninit.concat(l.oninit)}),this.tree=l;var a=this.groupEntities(l.templates);a=this.transformEntities(a),this.entities=a,this.oninit=l.oninit},i.prototype.recompileInput=function(t){var e=t.toString(),n=i.prototype.locals;return"function"==typeof t&&t.length===n.length?t:(e=e.replace(/^function[^{]+{|}$/g,""),e=new Function(n.join(", "),e))},i.prototype.groupEntities=function(t){for(var e={},n=0;n<t.length;n++){var i,s=t[n].clone(),r=null;i=void 0;for(var h=0;h<s.predicates.length;h++){var c=s.predicates[h];if(c instanceof o){if("block"===c.key)r=c.value;else{if("elem"!==c.key)continue;i=c.value}s.predicates.splice(h,1),h--}}if(null===r)throw new Error('block("...") not found in one of the templates');var l=this.classBuilder.build(r,i);e[l]||(e[l]=[]),e[l].push(s)}return e},i.prototype.transformEntities=function(t){for(var e=[],n=Object.keys(t),i=0;i<n.length;i++){var s=n[i],r=this.classBuilder.split(s),o=r[0],h=r[1];"*"===h&&e.push(o),t[s]=new this.Entity(this,o,h,t[s])}if(t.hasOwnProperty("*")){for(var c=t["*"],i=0;i<n.length;i++){var s=n[i];"*"!==s&&t[s].prepend(c)}this.defaultEnt.prepend(c),this.defaultElemEnt.prepend(c)}for(var i=0;i<e.length;i++){for(var o=e[i],l=this.classBuilder.build(o,"*"),c=t[l],i=0;i<n.length;i++){var s=n[i];if(s!==l){var a=t[s];a.block===o&&void 0!==a.elem&&t[s].prepend(c)}}this.defaultElemEnt.prepend(c)}for(var i=0;i<n.length;i++){var s=n[i];t[s].setDefaults(),this.defaultEnt.setDefaults(),this.defaultElemEnt.setDefaults()}return t},i.prototype._run=function(t){var e;return e=void 0===t||""===t||null===t?this.runEmpty():l.isArray(t)?this.runMany(t):l.isSimple(t)?this.runSimple(t):this.runOne(t)},i.prototype.run=function(t){var e=this.match,n=this.context;this.match=null,this.context=new this.contextConstructor(this),this.canFlush=null!==this.context._flush,this.depth=0;var i=this._run(t);return this.canFlush&&(i=this.context._flush(i)),this.match=e,this.context=n,i},i.prototype.runEmpty=function(){return this.context._listLength--,""},i.prototype.runSimple=function(t){this.context._listLength--;var e="";return(t&&t!==!0||0===t)&&(e+=t),e},i.prototype.runOne=function(t){var e=this.context,n=e.ctx,i=e.block,s=e._currBlock,r=e.elem,o=e.mods,h=e.elemMods;t.block||t.elem?e._currBlock="":e._currBlock=e.block,e.ctx=t,t.block?(e.block=t.block,t.mods?e.mods=t.mods:e.mods={}):t.elem?s&&(e.block=s):e.block="",e.elem=t.elem,t.elemMods?e.elemMods=t.elemMods:e.elemMods={};var c=e.block||"",l=e.elem;c||l?e.position++:e._listLength--,this.depth++;var a=this.classBuilder.build(c,l),u=!1,p=this.entities[a];p?this.canFlush&&!p.canFlush&&(u=!0,this.canFlush=!1):(p=this.defaultEnt,void 0!==l&&(p=this.defaultElemEnt),p.init(c,l));var f=p.run(e);return e.ctx=n,e.block=i,e.elem=r,e.mods=o,e.elemMods=h,e._currBlock=s,this.depth--,u&&(this.canFlush=!0),f},i.prototype.renderContent=function(t,e){var n=this.context,i=n.position,s=n._listLength,r=n._notNewList;n._notNewList=!1,e&&(n.position=0,n._listLength=1);var o=this._run(t);return n.position=i,n._listLength=s,n._notNewList=r,o},i.prototype.local=function(t,e){for(var n=Object.keys(t),i=[],s=0;s<n.length;s++){for(var r=n[s],o=r.split("."),h=this.context,c=0;c<o.length-1;c++)h=h[o[c]];i.push({parts:o,value:h[o[c]]}),h[o[c]]=t[r]}for(var l=e.call(this.context),s=0;s<i.length;s++){for(var o=i[s].parts,h=this.context,c=0;c<o.length-1;c++)h=h[o[c]];h[o[c]]=i[s].value}return l},i.prototype.applyNext=function(){return this.match.exec(this.context)},i.prototype.applyMode=function(t,e){var n=this.match.entity.rest[t];if(n){if(!e)return n.exec(this.context);var i=this,s=function(){return n.exec(i.context)};return this.local(e,s)}},i.prototype.exportApply=function(t){var e=this;t.apply=function(t){return e.run(t)},t.compile=function(t){return e.compile(t)};var n={};t.BEMContext=this.contextConstructor,n.BEMContext=t.BEMContext;for(var i=0;i<this.oninit.length;i++){var s=this.oninit[i];s(t,n)}}},{"./class-builder":3,"./context":4,"./tree":8,"./utils":9,inherits:10}],7:[function(t,e,n){function i(t,e){this.template=t,this.key=e.key,this.value=e.value}function s(t,e){this.template=t,this.keys=e.key,this.value=e.value}function r(t,e){this.template=t,this.key=e.key}function o(t,e){this.template=t,this.body=e.body}function h(t){this.template=t,this.once=null}function c(t){this.template=t,this.wrap=null}function l(t,e){this.mode=t,this.predicates=new Array(e.predicates.length),this.body=e.body;for(var n=[],l=0,a=0;l<this.predicates.length;l++,a++){var p=e.predicates[l];p instanceof f?u.isArray(p.key)?this.predicates[a]=new s(this,p):this.predicates[a]=new i(this,p):p instanceof y?this.predicates[a]=new r(this,p):p instanceof v?this.predicates[a]=new o(this,p):p instanceof d?(a--,n.push(new h(this))):p instanceof m?(a--,n.push(new c(this))):a--}for(var l=0;l<n.length;l++,a++)this.predicates[a]=n[l];this.predicates.length!==a&&(this.predicates.length=a)}function a(t){this.entity=t,this.bemxjst=this.entity.bemxjst,this.templates=[],this.mask=[0],this.maskSize=0,this.maskOffset=0,this.count=0,this.depth=-1,this.thrownError=null}var u=t("./utils"),p=t("./tree"),f=p.PropertyMatch,d=p.OnceMatch,m=p.WrapMatch,y=p.PropertyAbsent,v=p.CustomMatch;i.prototype.exec=function(t){return t[this.key]===this.value},s.prototype.exec=function(t){for(var e=t,n=0;n<this.keys.length-1;n++)if(e=e[this.keys[n]],!e)return!1;return e[this.keys[n]]===this.value},r.prototype.exec=function(t){return!t[this.key]},o.prototype.exec=function(t){return this.body.call(t,t,t.ctx)},h.prototype.exec=function(t){var e=this.once!==t._onceRef;return this.once=t._onceRef,e},c.prototype.exec=function(t){var e=this.wrap!==t.ctx;return this.wrap=t.ctx,e},n.MatchTemplate=l,n.Match=a,a.prototype.clone=function(t){var e=new a(t);return e.templates=this.templates.slice(),e.mask=this.mask.slice(),e.maskSize=this.maskSize,e.count=this.count,e},a.prototype.prepend=function(t){for(this.templates=t.templates.concat(this.templates),this.count+=t.count;Math.ceil(this.count/31)>this.mask.length;)this.mask.push(0);this.maskSize=this.mask.length},a.prototype.push=function(t){this.templates.push(new l(this,t)),this.count++,Math.ceil(this.count/31)>this.mask.length&&this.mask.push(0),this.maskSize=this.mask.length},a.prototype.tryCatch=function(t,e){try{return t.call(e,e,e.ctx)}catch(n){this.thrownError=n}},a.prototype.exec=function(t){for(var e,n=this.checkDepth(),i=this.maskOffset,s=this.mask[i],r=1,o=0;o<this.count;o++){if(0===(s&r)){e=this.templates[o];for(var h=0;h<e.predicates.length;h++){var c=e.predicates[h];if(!c.exec(t))break}if(h===e.predicates.length)break}1073741824===r?(i++,s=this.mask[i],r=1):r<<=1}if(o!==this.count){var l=s,a=this.bemxjst.match;this.mask[i]|=r,this.bemxjst.match=this,this.thrownError=null;var u;u="function"==typeof e.body?this.tryCatch(e.body,t):e.body,this.mask[i]=l,this.bemxjst.match=a,this.restoreDepth(n);var p=this.thrownError;if(null!==p)throw this.thrownError=null,p;return u}},a.prototype.checkDepth=function(){if(-1===this.depth)return this.depth=this.bemxjst.depth,-1;if(this.bemxjst.depth===this.depth)return this.depth;var t=this.depth;for(this.depth=this.bemxjst.depth,this.maskOffset+=this.maskSize;this.mask.length<this.maskOffset+this.maskSize;)this.mask.push(0);return t},a.prototype.restoreDepth=function(t){-1!==t&&t!==this.depth&&(this.maskOffset-=this.maskSize),this.depth=t}},{"./tree":8,"./utils":9}],8:[function(t,e,n){function i(t,e){this.predicates=t,this.body=e}function s(){}function r(t,e){this.conditions=[],this.children=[];for(var n=e.length-1;n>=0;n--){var i=e[n];i instanceof s?this.conditions.push(i):i===t.boundBody?this.children[n]=t.queue.pop():this.children[n]=i}}function o(){s.call(this)}function h(t){s.call(this),this.refs=t}function c(t){s.call(this),this.refs=t}function l(t){s.call(this),this.refs=t}function a(t){s.call(this),this.options=t}function u(t,e){s.call(this),this.key=t,this.value=e}function p(t){s.call(this),this.key=t}function f(t){s.call(this),this.body=t}function d(t){this.options=t,this.refs=this.options.refs,this.boundBody=this.body.bind(this);for(var e=this.methods("body"),n=0;n<e.length;n++){var i=e[n];this.boundBody[d.methods[n]]=i}this.queue=[],this.templates=[],this.initializers=[]}function m(t,e,n){var i=t[n],s=t.boundBody;return"body"!==e?"replace"===n||"extend"===n||"wrap"===n?function(){return i.apply(t,arguments)}:function(){return i.apply(t,arguments),s}:function(){var e=i.apply(t,arguments),r=t.queue.pop(),o=t.queue[t.queue.length-1];return o.conditions=o.conditions.concat(r.conditions),o.children=o.children.concat(r.children),"replace"===n||"extend"===n||"wrap"===n?e:s}}var y=t("minimalistic-assert"),v=t("inherits");n.Template=i,i.prototype.wrap=function(){for(var t=this.body,e=0;e<this.predicates.length;e++){var n=this.predicates[e];t=n.wrapBody(t)}this.body=t},i.prototype.clone=function(){return new i(this.predicates.slice(),this.body)},n.MatchBase=s,s.prototype.wrapBody=function(t){return t},v(o,s),n.OnceMatch=o,v(h,s),n.WrapMatch=h,h.prototype.wrapBody=function(t){var e=this.refs.applyCtx;return"function"!=typeof t?function(){return e(t)}:function(){return e(t.call(this))}},v(c,s),n.ReplaceMatch=c,c.prototype.wrapBody=function(t){var e=this.refs.applyCtx;return"function"!=typeof t?function(){return e(t)}:function(){return e(t.call(this))}},v(l,s),n.ExtendMatch=l,l.prototype.wrapBody=function(t){var e=this.refs.applyCtx,n=this.refs.local;return"function"!=typeof t?function(){for(var i={},s=Object.keys(t),r=0;r<s.length;r++)i["ctx."+s[r]]=t[s[r]];return n(i)(function(){return e(this.ctx)})}:function(){for(var i={},s=t.call(this),r=Object.keys(s),o=0;o<r.length;o++)i["ctx."+r[o]]=s[r[o]];return n(i)(function(){return e(this.ctx)})}},v(a,s),n.CompilerOptions=a,v(u,s),n.PropertyMatch=u,v(p,s),n.PropertyAbsent=p,v(f,s),n.CustomMatch=f,n.Tree=d,d.methods=["match","once","wrap","elemMatch","block","elem","mode","mod","elemMod","def","tag","attrs","cls","js","bem","mix","content","replace","extend","oninit","xjstOptions"],d.prototype.build=function(t,e){var n=this.methods("global").concat(e);return n[0]=this.match.bind(this),t.apply({},n),{templates:this.templates.slice().reverse(),oninit:this.initializers}},d.prototype.methods=function(t){for(var e=new Array(d.methods.length),n=0;n<e.length;n++){var i=d.methods[n];e[n]=m(this,t,i)}return e},d.prototype.flush=function(t,e){var n;n=e.conditions?t.concat(e.conditions):e.conditions;for(var s=0;s<e.children.length;s++){var o=e.children[s];if(o instanceof r)this.flush(n,e.children[s]);else{var h=new i(t,o);h.wrap(),this.templates.push(h)}}},d.prototype.body=function(){for(var t=new Array(arguments.length),e=0;e<arguments.length;e++)t[e]=arguments[e];var n=new r(this,t);return this.queue[this.queue.length-1].children.push(n),1===this.queue.length&&this.flush([],this.queue.shift()),this.boundBody},d.prototype.match=function(){for(var t=new Array(arguments.length),e=0;e<arguments.length;e++){var n=arguments[e];"function"==typeof n&&(n=new f(n)),y(n instanceof s,"Wrong .match() argument"),t[e]=n}return this.queue.push(new r(this,t)),this.boundBody},d.prototype.once=function(){if(arguments.length)throw new Error("Predicate once() should not have arguments");return this.match(new o)},d.prototype.applyMode=function(t,e){if(t.length)throw new Error("Predicate should not have arguments but "+JSON.stringify(t)+" passed");return this.mode(e)},d.prototype.wrap=function(){return this.def.apply(this,arguments).match(new h(this.refs))},d.prototype.xjstOptions=function(t){return this.queue.push(new r(this,[new a(t)])),this.boundBody},d.prototype.block=function(t){return this.match(new u("block",t))},d.prototype.elemMatch=function(){return this.match.apply(this,arguments)},d.prototype.elem=function(t){return this.match(new u("elem",t))},d.prototype.mode=function(t){return this.match(new u("_mode",t))},d.prototype.mod=function(t,e){return this.match(new u(["mods",t],e))},d.prototype.elemMod=function(t,e){return this.match(new u(["elemMods",t],e))},d.prototype.def=function(){return this.applyMode(arguments,"default")},d.prototype.tag=function(){return this.applyMode(arguments,"tag")},d.prototype.attrs=function(){return this.applyMode(arguments,"attrs")},d.prototype.cls=function(){return this.applyMode(arguments,"cls")},d.prototype.js=function(){return this.applyMode(arguments,"js")},d.prototype.bem=function(){return this.applyMode(arguments,"bem")},d.prototype.mix=function(){return this.applyMode(arguments,"mix")},d.prototype.content=function(){return this.applyMode(arguments,"content")},d.prototype.replace=function(){return this.def.apply(this,arguments).match(new c(this.refs))},d.prototype.extend=function(){return this.def.apply(this,arguments).match(new l(this.refs))},d.prototype.oninit=function(t){this.initializers.push(t)}},{inherits:10,"minimalistic-assert":11}],9:[function(t,e,n){function i(){return l+ ++o}var s=Object.prototype.toString;n.isArray=Array.isArray,n.isArray||(n.isArray=function(t){return"[object Array]"===s.call(t)}),n.xmlEscape=function(t){return(t+"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")},n.attrEscape=function(t){return(t+"").replace(/&/g,"&amp;").replace(/"/g,"&quot;")},n.jsAttrEscape=function(t){return(t+"").replace(/&/g,"&amp;").replace(/'/g,"&#39;")},n.extend=function(t,e){if(!t||!e)return t||e;var n,i={};for(n in t)t.hasOwnProperty(n)&&(i[n]=t[n]);for(n in e)e.hasOwnProperty(n)&&(i[n]=e[n]);return i};var r={area:1,base:1,br:1,col:1,command:1,embed:1,hr:1,img:1,input:1,keygen:1,link:1,meta:1,param:1,source:1,wbr:1};n.isShortTag=function(t){return r.hasOwnProperty(t)},n.isSimple=function(t){return t&&t!==!0?"string"==typeof t||"number"==typeof t:!0};var o=0,h=+new Date,c="__"+h,l="uniq"+h;n.getUniq=i,n.identify=function(t,e){if(!t)return i();if(e||t[c])return t[c];var n=i();return t[c]=n,n}},{}],10:[function(t,e,n){"function"==typeof Object.create?e.exports=function(t,e){t.super_=e,t.prototype=Object.create(e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}})}:e.exports=function(t,e){t.super_=e;var n=function(){};n.prototype=e.prototype,t.prototype=new n,t.prototype.constructor=t}},{}],11:[function(t,e,n){function i(t,e){if(!t)throw new Error(e||"Assertion failed")}e.exports=i,i.equal=function(t,e,n){if(t!=e)throw new Error(n||"Assertion failed: "+t+" != "+e)}},{}]},{},[2])(2)}),e.exports||n.BEMHTML}({},{}),s=new i({wrap:!1});return s.compile(function(t,i,s,r,o,h,c,l,a,u,p,f,d,m,y,v,x,b,g,k,w,M,E,_,j){o("ua")(p()("script"),y()(!1),x()(["(function(e,c){",'e[c]=e[c].replace(/(ua_js_)no/g,"$1yes");','})(document.documentElement,"className");'])),o("page")(u().match(function(){return!this._pageInit})(function(){var t=this.ctx;return this._nonceCsp=t.nonce,M({_pageInit:!0})(function(){return E([t.doctype||"<!DOCTYPE html>",{tag:"html",cls:"ua_js_no",content:[{elem:"head",content:[{tag:"meta",attrs:{charset:"utf-8"}},t.uaCompatible===!1?"":{tag:"meta",attrs:{"http-equiv":"X-UA-Compatible",content:t.uaCompatible||"IE=edge"}},{tag:"title",content:t.title},{block:"ua",attrs:{nonce:t.nonce}},t.head,t.styles,t.favicon?{elem:"favicon",url:t.favicon}:""]},t]}])})}),p()("body"),x()(function(){return[_(),this.ctx.scripts]}),h("head")(y()(!1),p()("head")),h("meta")(y()(!1),p()("meta")),h("link")(y()(!1),p()("link")),h("favicon")(y()(!1),p()("link"),f()(function(){return{rel:"shortcut icon",href:this.ctx.url}}))),o("page").elem("css")(y()(!1),p()("style"),t(function(){return this.ctx.url})(p()("link"),f()(function(){return{rel:"stylesheet",href:this.ctx.url}}))),o("page").elem("css").match(function(){return this.ctx.hasOwnProperty("ie")})(s()(function(){var t=this.ctx.ie,e=t?"!IE"===t?[t,"<!-->","<!--"]:[t,"",""]:["gt IE 9","<!-->","<!--"];return["<!--[if "+e[0]+"]>"+e[1],this.ctx,e[2]+"<![endif]-->"]}),u().match(function(){return this.ctx.ie===!0})(function(){var t=this.ctx.url;return E([6,7,8,9].map(function(e){return{elem:"css",url:t+".ie"+e+".css",ie:"IE "+e}}))})),o("page").elem("js")(y()(!1),p()("script"),f()(function(){var t={};return this.ctx.url?t.src=this.ctx.url:this._nonceCsp&&(t.nonce=this._nonceCsp),t})),o("ua").content()(function(){return[_(),"(function(d,n){","d.documentElement.className+=",'" ua_svg_"+(d[n]&&d[n]("http://www.w3.org/2000/svg","svg").createSVGRect?"yes":"no");','})(document,"createElementNS");']}),o("page").elem("conditional-comment")(p()(!1),x()(function(){var t=this.ctx,e=t.condition.replace("<","lt").replace(">","gt").replace("=","e"),n=e.indexOf("!")>-1,i=t.msieOnly===!1,s=n||i;return["<!--[if "+e+"]>",i?"<!":"",s?"-->":"",_(),s?"<!--":"","<![endif]-->"]})),o("i-bem").elem("i18n").def()(function(){if(!this.ctx)return"";var t=this.ctx,e=t.keyset,i=t.key,s=t.params||{};return e||i?("undefined"!=typeof t.content&&null===t.content||(s.content=n.apply(t.content)),void this._buf.push(BEM.I18N(e,i,s))):""}),k(function(){!function(t,e){if(!e.I18N){t.BEM=e;var n=t.BEM.I18N=function(t,e){return e};n.keyset=function(){return n},n.key=function(t){return t},n.lang=function(){}}}(this,"undefined"==typeof BEM?{}:BEM)}),k(function(t,n){var i=t.BEMContext||n.BEMContext;i.prototype.require=function(t){return e[t]}})}),s.exportApply(n),n}var n=!0;"object"==typeof module&&"object"==typeof module.exports&&(exports.BEMHTML=e({}),n=!1),"object"==typeof modules&&(modules.define("BEMHTML",[],function(t){t(e({}))}),n=!1),n&&(BEMHTML=e({}),t.BEMHTML=BEMHTML)}("undefined"!=typeof window?window:global);