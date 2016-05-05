var BEMHTML;!function(t){function e(e){var n={},i=function(e,n){return function(i){if("object"==typeof n&&"undefined"!=typeof e)e.exports=i();else if("function"==typeof define&&define.amd)define([],i);else{var r;r="undefined"!=typeof window?window:"undefined"!=typeof t?t:"undefined"!=typeof self?self:this,r.bemhtml=i()}}(function(){return function t(e,n,i){function r(o,c){if(!n[o]){if(!e[o]){var h="function"==typeof require&&require;if(!c&&h)return h(o,!0);if(s)return s(o,!0);var a=new Error("Cannot find module '"+o+"'");throw a.code="MODULE_NOT_FOUND",a}var l=n[o]={exports:{}};e[o][0].call(l.exports,function(t){var n=e[o][1][t];return r(n?n:t)},l,l.exports,t,e,n,i)}return n[o].exports}for(var s="function"==typeof require&&require,o=0;o<i.length;o++)r(i[o]);return r}({1:[function(t,e,n){function i(t){this.bemxjst=t,this.jsClass=null,this.tag=new s(this),this.attrs=new s(this),this.mod=new s(this),this.js=new s(this),this.mix=new s(this),this.bem=new s(this),this.cls=new s(this),o.apply(this,arguments)}var r=t("inherits"),s=t("../bemxjst/match").Match,o=t("../bemxjst/entity").Entity;r(i,o),n.Entity=i,i.prototype.init=function(t,e){this.block=t,this.elem=e,this.jsClass=this.bemxjst.classBuilder.build(this.block,this.elem)},i.prototype._initRest=function(t){"default"===t?this.rest[t]=this.def:"tag"===t||"attrs"===t||"js"===t||"mix"===t||"bem"===t||"cls"===t||"content"===t?this.rest[t]=this[t]:this.rest.hasOwnProperty(t)||(this.rest[t]=new s(this))},i.prototype.defaultBody=function(t){var e=this.tag.exec(t);void 0===e&&(e=t.ctx.tag);var n;t.ctx.js!==!1&&(n=this.js.exec(t));var i=this.bem.exec(t),r=this.cls.exec(t),s=this.mix.exec(t),o=this.attrs.exec(t),c=this.content.exec(t);return 0===this.content.count&&void 0===c&&(c=t.ctx.content),this.bemxjst.render(t,this,e,n,i,r,s,o,c)}},{"../bemxjst/entity":5,"../bemxjst/match":8,inherits:11}],2:[function(t,e,n){function i(t){c.apply(this,arguments);var e="undefined"==typeof t.xhtml?!0:t.xhtml;this._shortTagCloser=e?"/>":">",this._elemJsInstances=t.elemJsInstances}var r=t("inherits"),s=t("../bemxjst/utils"),o=t("./entity").Entity,c=t("../bemxjst");r(i,c),e.exports=i,i.prototype.Entity=o,i.prototype.runMany=function(t){var e="",n=this.context,i=n.position,r=n._notNewList;if(r?n._listLength+=t.length-1:(n.position=0,n._listLength=t.length),n._notNewList=!0,this.canFlush)for(var s=0;s<t.length;s++)e+=n._flush(this._run(t[s]));else for(var s=0;s<t.length;s++)e+=this._run(t[s]);return r||(n.position=i),e},i.prototype.render=function(t,e,n,i,r,o,c,h,a){var l=t.ctx;if(void 0===n&&(n="div"),!n)return this.renderNoTag(t,i,r,o,c,h,a);var u="<"+n,p=l.js;p!==!1&&(i===!0&&(i={}),i?p!==!0&&(i=s.extend(p,i)):i=p===!0?{}:p);var f;i&&(f={},f[e.jsClass]=i);var d=r;void 0===d&&(d=void 0===l.bem?e.block||e.elem:l.bem),d=!!d,void 0===o&&(o=l.cls);var m=f&&(this._elemJsInstances?e.block||e.elem:e.block&&!e.elem);if(!d&&!o)return this.renderClose(u,t,n,h,d,l,a);if(u+=' class="',d){var y=e.elem?t.elemMods:t.mods;u+=e.jsClass,u+=this.buildModsClasses(e.block,e.elem,y);var v=c;if(l.mix&&(v=v?[].concat(v,l.mix):l.mix),v){var x=this.renderMix(e,v,f,m);u+=x.out,f=x.jsParams,m=x.addJSInitClass}o&&(u+=" "+o)}else o&&(u+=o);return u+=m?' i-bem"':'"',d&&f&&(u+=" data-bem='"+s.jsAttrEscape(JSON.stringify(f))+"'"),this.renderClose(u,t,n,h,d,l,a)},i.prototype.renderClose=function(t,e,n,i,r,o,c){var h=t;if(i=s.extend(i,o.attrs)){var a;for(a in i){var l=i[a];void 0!==l&&l!==!1&&null!==l&&(h+=l===!0?" "+a:" "+a+'="'+s.attrEscape(s.isSimple(l)?l:this.context.reapply(l))+'"')}}return s.isShortTag(n)?(h+=this._shortTagCloser,this.canFlush&&(h=e._flush(h))):(h+=">",this.canFlush&&(h=e._flush(h)),(c||0===c)&&(h+=this.renderContent(c,r)),h+="</"+n+">"),this.canFlush&&(h=e._flush(h)),h},i.prototype.renderMix=function(t,e,n,i){var r={},o=this.context,c=n,h=i;r[t.jsClass]=!0,s.isArray(e)||(e=[e]);for(var a=this.classBuilder,l="",u=0;u<e.length;u++){var p=e[u];if(p){"string"==typeof p&&(p={block:p,elem:void 0});var f=!1;p.elem?f=p.elem!==t.elem&&p.elem!==o.elem||p.block&&p.block!==t.block:p.block&&(f=!(p.block===t.block&&p.mods)||p.mods&&t.elem);var d=p.block||p._block||o.block,m=p.elem||p._elem||o.elem,y=a.build(d,m),v=p.elem||p._elem||(p.block?void 0:o.elem);if(f&&(l+=" "+a.build(d,v)),l+=this.buildModsClasses(d,v,p.elem||!p.block&&(p._elem||o.elem)?p.elemMods:p.mods),p.js&&(c||(c={}),c[a.build(d,p.elem)]=p.js===!0?{}:p.js,h||(h=d&&!p.elem)),f&&!r[y]){r[y]=!0;var x=this.entities[y];if(x){var b=o.block,g=o.elem,k=x.mix.exec(o);if(o.elem=g,o.block=b,k)for(var w=0;w<k.length;w++){var E=k[w];(E.block||E.elem)&&r[a.build(E.block,E.elem)]||(E._block=d,E._elem=m,e=e.slice(0,u+1).concat(E,e.slice(u+1)))}}}}}return{out:l,jsParams:c,addJSInitClass:h}},i.prototype.buildModsClasses=function(t,e,n){if(!n)return"";var i,r="";for(i in n)if(n.hasOwnProperty(i)&&""!==i){var s=n[i];if(s||0===s){"boolean"!=typeof s&&(s+="");var o=this.classBuilder;r+=" "+(e?o.buildElemClass(t,e,i,s):o.buildBlockClass(t,i,s))}}return r},i.prototype.renderNoTag=function(t,e,n,i,r,s,o){return o||0===o?this._run(o):""}},{"../bemxjst":7,"../bemxjst/utils":10,"./entity":1,inherits:11}],3:[function(t,e,n){function i(t){this.modDelim=t.mod||"_",this.elemDelim=t.elem||"__"}n.ClassBuilder=i,i.prototype.build=function(t,e){return e?t+this.elemDelim+e:t},i.prototype.buildModPostfix=function(t,e){var n=this.modDelim+t;return e!==!0&&(n+=this.modDelim+e),n},i.prototype.buildBlockClass=function(t,e,n){var i=t;return n&&(i+=this.buildModPostfix(e,n)),i},i.prototype.buildElemClass=function(t,e,n,i){var r=this.buildBlockClass(t)+this.elemDelim+e;return i&&(r+=this.buildModPostfix(n,i)),r},i.prototype.split=function(t){return t.split(this.elemDelim,2)}},{}],4:[function(t,e,n){function i(t){this._bemxjst=t,this.ctx=null,this.block="",this._currBlock="",this.elem=null,this.mods={},this.elemMods={},this.position=0,this._listLength=0,this._notNewList=!1,this.escapeContent=t.options.escapeContent===!0,this._onceRef={}}var r=t("./utils");n.Context=i,i.prototype._flush=null,i.prototype.isArray=r.isArray,i.prototype.isSimple=r.isSimple,i.prototype.isShortTag=r.isShortTag,i.prototype.extend=r.extend,i.prototype.identify=r.identify,i.prototype.xmlEscape=r.xmlEscape,i.prototype.attrEscape=r.attrEscape,i.prototype.jsAttrEscape=r.jsAttrEscape,i.prototype.isFirst=function(){return 1===this.position},i.prototype.isLast=function(){return this.position===this._listLength},i.prototype.generateId=function(){return r.identify(this.ctx)},i.prototype.reapply=function(t){return this._bemxjst.run(t)}},{"./utils":10}],5:[function(t,e,n){function i(t,e,n,i){this.bemxjst=t,this.block=null,this.elem=null,this.options={},this.canFlush=!0,this.def=new o(this),this.content=new o(this),this.rest={},this.init(e,n),this.initModes(i)}function r(){return this.ctx.content}var s=t("./utils"),o=t("./match").Match,c=t("./tree"),h=c.Template,a=c.PropertyMatch,l=c.CompilerOptions;n.Entity=i,i.prototype.init=function(t,e){this.block=t,this.elem=e},i.prototype.initModes=function(t){for(var e=0;e<t.length;e++){for(var n=t[e],i=n.predicates.length-1;i>=0;i--){var r=n.predicates[i];if(r instanceof a&&"_mode"===r.key){n.predicates.splice(i,1),this._initRest(r.value),this.rest[r.value].push(n);break}}-1===i&&this.def.push(n);for(var i=n.predicates.length-1;i>=0;i--){var r=n.predicates[i];r instanceof l&&(this.options=s.extend(this.options,r.options))}}},i.prototype.prepend=function(t){for(var e=Object.keys(this.rest),n=0;n<e.length;n++){var i=e[n];t.rest[i]&&this.rest[i].prepend(t.rest[i])}e=Object.keys(t.rest);for(var n=0;n<e.length;n++){var i=e[n];this.rest[i]||(this._initRest(i),this.rest[i].prepend(t.rest[i]))}},i.prototype.run=function(t){return 0!==this.def.count?this.def.exec(t):this.defaultBody(t)},i.prototype.setDefaults=function(){if(0!==this.content.count&&this.content.push(new h([],r)),0!==this.def.count){this.canFlush=this.options.flush||!1;var t=this;this.def.push(new h([],function(){return t.defaultBody(this)}))}}},{"./match":8,"./tree":9,"./utils":10}],6:[function(t,e,n){function i(t,e){this.name="BEMXJSTError",this.message=t,Error.captureStackTrace?Error.captureStackTrace(this,e||this.constructor):this.stack=(new Error).stack}i.prototype=Object.create(Error.prototype),i.prototype.constructor=i,n.BEMXJSTError=i},{}],7:[function(t,e,n){function i(t){this.options=t||{},this.entities=null,this.defaultEnt=null,this.tree=null,this.match=null,this.contextConstructor=function(t){c.call(this,t)},r(this.contextConstructor,c),this.context=null,this.classBuilder=new h(this.options.naming||{}),this.depth=0,this.canFlush=!1,this.oninit=null,this.defaultEnt=new this.Entity(this,"","",[]),this.defaultElemEnt=new this.Entity(this,"","",[])}var r=t("inherits"),s=t("./tree").Tree,o=t("./tree").PropertyMatch,c=t("./context").Context,h=t("./class-builder").ClassBuilder,a=t("./utils");e.exports=i,i.prototype.locals=s.methods.concat("local","applyCtx","applyNext","apply"),i.prototype.compile=function(t){function e(){return o._run(o.context.ctx)}function n(t,n){return n?o.local(n,function(){return o.local({ctx:t},e)}):o.local({ctx:t},e)}function i(t,e){return o.applyMode(t,e)}function r(t){return function(e){return o.local(t,e)}}var o=this,c=new s({refs:{applyCtx:n,local:r}}),h=this.recompileInput(t),a=c.build(h,[r,n,function u(t){return t?o.local(t,u):o.applyNext()},i]);this.tree&&(a={templates:a.templates.concat(this.tree.templates),oninit:this.tree.oninit.concat(a.oninit)}),this.tree=a;var l=this.groupEntities(a.templates);l=this.transformEntities(l),this.entities=l,this.oninit=a.oninit},i.prototype.recompileInput=function(t){var e=t.toString(),n=i.prototype.locals;return"function"==typeof t&&t.length===n.length?t:(e=e.replace(/^function[^{]+{|}$/g,""),e=new Function(n.join(", "),e))},i.prototype.groupEntities=function(e){for(var n={},i=0;i<e.length;i++){var r,s=e[i].clone(),c=null;r=void 0;for(var h=0;h<s.predicates.length;h++){var a=s.predicates[h];if(a instanceof o){if("block"===a.key)c=a.value;else{if("elem"!==a.key)continue;r=a.value}s.predicates.splice(h,1),h--}}if(null===c){for(var l="block(…) subpredicate is not found.\n    See template with subpredicates:\n     * ",h=0;h<s.predicates.length;h++){var a=s.predicates[h];0!==h&&(l+="\n     * "),l+="_mode"===a.key?a.value+"()":Array.isArray(a.key)?a.key[0].replace("mods","mod").replace("elemMods","elemMod")+"('"+a.key[1]+"', '"+a.value+"')":a.value&&a.key?a.key+"('"+a.value+"')":"match(…)"}throw l+="\n    And template body: \n    ("+("function"==typeof s.body?s.body:JSON.stringify(s.body))+")","undefined"==typeof BEMXJSTError&&(BEMXJSTError=t("./error").BEMXJSTError),new BEMXJSTError(l)}var u=this.classBuilder.build(c,r);n[u]||(n[u]=[]),n[u].push(s)}return n},i.prototype.transformEntities=function(t){for(var e=[],n=Object.keys(t),i=0;i<n.length;i++){var r=n[i],s=this.classBuilder.split(r),o=s[0],c=s[1];"*"===c&&e.push(o),t[r]=new this.Entity(this,o,c,t[r])}if(t.hasOwnProperty("*")){for(var h=t["*"],i=0;i<n.length;i++){var r=n[i];"*"!==r&&t[r].prepend(h)}this.defaultEnt.prepend(h),this.defaultElemEnt.prepend(h)}for(var i=0;i<e.length;i++){for(var o=e[i],a=this.classBuilder.build(o,"*"),h=t[a],i=0;i<n.length;i++){var r=n[i];if(r!==a){var l=t[r];l.block===o&&void 0!==l.elem&&t[r].prepend(h)}}this.defaultElemEnt.prepend(h)}for(var i=0;i<n.length;i++){var r=n[i];t[r].setDefaults(),this.defaultEnt.setDefaults(),this.defaultElemEnt.setDefaults()}return t},i.prototype._run=function(t){var e;return e=void 0===t||""===t||null===t?this.runEmpty():a.isArray(t)?this.runMany(t):a.isSimple(t)?this.runSimple(t):t.html&&"string"==typeof t.html&&"undefined"==typeof t.block&&"undefined"==typeof t.elem&&"undefined"==typeof t.tag&&"undefined"==typeof t.cls&&"undefined"==typeof t.attrs?this.runUnescaped(t.html):this.runOne(t)},i.prototype.run=function(t){var e=this.match,n=this.context;this.match=null,this.context=new this.contextConstructor(this),this.canFlush=null!==this.context._flush,this.depth=0;var i=this._run(t);return this.canFlush&&(i=this.context._flush(i)),this.match=e,this.context=n,i},i.prototype.runEmpty=function(){return this.context._listLength--,""},i.prototype.runUnescaped=function(t){return this.context._listLength--,""+t},i.prototype.runSimple=function(t){this.context._listLength--;var e="";return(t&&t!==!0||0===t)&&(e+="string"==typeof t&&this.context.escapeContent?a.xmlEscape(t):t),e},i.prototype.runOne=function(t){var e=this.context,n=e.ctx,i=e.block,r=e._currBlock,s=e.elem,o=e.mods,c=e.elemMods;t.block||t.elem?e._currBlock="":e._currBlock=e.block,e.ctx=t,t.block?(e.block=t.block,t.mods?e.mods=t.mods:e.mods={}):t.elem?r&&(e.block=r):e.block="",e.elem=t.elem,t.elemMods?e.elemMods=t.elemMods:e.elemMods={};var h=e.block||"",a=e.elem;h||a?e.position++:e._listLength--,this.depth++;var l=this.classBuilder.build(h,a),u=!1,p=this.entities[l];p?this.canFlush&&!p.canFlush&&(u=!0,this.canFlush=!1):(p=this.defaultEnt,void 0!==a&&(p=this.defaultElemEnt),p.init(h,a));var f=p.run(e);return e.ctx=n,e.block=i,e.elem=s,e.mods=o,e.elemMods=c,e._currBlock=r,this.depth--,u&&(this.canFlush=!0),f},i.prototype.renderContent=function(t,e){var n=this.context,i=n.position,r=n._listLength,s=n._notNewList;n._notNewList=!1,e&&(n.position=0,n._listLength=1);var o=this._run(t);return n.position=i,n._listLength=r,n._notNewList=s,o},i.prototype.local=function(t,e){for(var n=Object.keys(t),i=[],r=0;r<n.length;r++){for(var s=n[r],o=s.split("."),c=this.context,h=0;h<o.length-1;h++)c=c[o[h]];i.push({parts:o,value:c[o[h]]}),c[o[h]]=t[s]}for(var a=e.call(this.context),r=0;r<i.length;r++){for(var o=i[r].parts,c=this.context,h=0;h<o.length-1;h++)c=c[o[h]];c[o[h]]=i[r].value}return a},i.prototype.applyNext=function(){return this.match.exec(this.context)},i.prototype.applyMode=function(t,e){var n=this.match.entity.rest[t];if(n){if(!e)return n.exec(this.context);var i=this,r=function(){return n.exec(i.context)};return this.local(e,r)}},i.prototype.exportApply=function(t){var e=this;t.apply=function(t){return e.run(t)},t.compile=function(t){return e.compile(t)};var n={};t.BEMContext=this.contextConstructor,n.BEMContext=t.BEMContext;for(var i=0;i<this.oninit.length;i++){var r=this.oninit[i];r(t,n)}}},{"./class-builder":3,"./context":4,"./error":6,"./tree":9,"./utils":10,inherits:11}],8:[function(t,e,n){function i(t,e){this.template=t,this.key=e.key,this.value=e.value}function r(t,e){this.template=t,this.keys=e.key,this.value=e.value}function s(t,e){this.template=t,this.key=e.key}function o(t,e){this.template=t,this.body=e.body}function c(t){this.template=t,this.once=null}function h(t){this.template=t,this.wrap=null}function a(t,e){this.mode=t,this.predicates=new Array(e.predicates.length),this.body=e.body;for(var n=[],a=0,l=0;a<this.predicates.length;a++,l++){var p=e.predicates[a];p instanceof f?u.isArray(p.key)?this.predicates[l]=new r(this,p):this.predicates[l]=new i(this,p):p instanceof y?this.predicates[l]=new s(this,p):p instanceof v?this.predicates[l]=new o(this,p):p instanceof d?(l--,n.push(new c(this))):p instanceof m?(l--,n.push(new h(this))):l--}for(var a=0;a<n.length;a++,l++)this.predicates[l]=n[a];this.predicates.length!==l&&(this.predicates.length=l)}function l(t){this.entity=t,this.bemxjst=this.entity.bemxjst,this.templates=[],this.mask=[0],this.maskSize=0,this.maskOffset=0,this.count=0,this.depth=-1,this.thrownError=null}var u=t("./utils"),p=t("./tree"),f=p.PropertyMatch,d=p.OnceMatch,m=p.WrapMatch,y=p.PropertyAbsent,v=p.CustomMatch;i.prototype.exec=function(t){return t[this.key]===this.value},r.prototype.exec=function(t){for(var e=t,n=0;n<this.keys.length-1;n++)if(e=e[this.keys[n]],!e)return!1;return e[this.keys[n]]===this.value},s.prototype.exec=function(t){return!t[this.key]},o.prototype.exec=function(t){return this.body.call(t,t,t.ctx)},c.prototype.exec=function(t){var e=this.once!==t._onceRef;return this.once=t._onceRef,e},h.prototype.exec=function(t){var e=this.wrap!==t.ctx;return this.wrap=t.ctx,e},n.MatchTemplate=a,n.Match=l,l.prototype.clone=function(t){var e=new l(t);return e.templates=this.templates.slice(),e.mask=this.mask.slice(),e.maskSize=this.maskSize,e.count=this.count,e},l.prototype.prepend=function(t){for(this.templates=t.templates.concat(this.templates),this.count+=t.count;Math.ceil(this.count/31)>this.mask.length;)this.mask.push(0);this.maskSize=this.mask.length},l.prototype.push=function(t){this.templates.push(new a(this,t)),this.count++,Math.ceil(this.count/31)>this.mask.length&&this.mask.push(0),this.maskSize=this.mask.length},l.prototype.tryCatch=function(t,e){try{return t.call(e,e,e.ctx)}catch(n){this.thrownError=n}},l.prototype.exec=function(t){for(var e,n=this.checkDepth(),i=this.maskOffset,r=this.mask[i],s=1,o=0;o<this.count;o++){if(0===(r&s)){e=this.templates[o];for(var c=0;c<e.predicates.length;c++){var h=e.predicates[c];if(!h.exec(t))break}if(c===e.predicates.length)break}1073741824===s?(i++,r=this.mask[i],s=1):s<<=1}if(o!==this.count){var a=r,l=this.bemxjst.match;this.mask[i]|=s,this.bemxjst.match=this,this.thrownError=null;var u;u="function"==typeof e.body?this.tryCatch(e.body,t):e.body,this.mask[i]=a,this.bemxjst.match=l,this.restoreDepth(n);var p=this.thrownError;if(null!==p)throw this.thrownError=null,p;return u}},l.prototype.checkDepth=function(){if(-1===this.depth)return this.depth=this.bemxjst.depth,-1;if(this.bemxjst.depth===this.depth)return this.depth;var t=this.depth;for(this.depth=this.bemxjst.depth,this.maskOffset+=this.maskSize;this.mask.length<this.maskOffset+this.maskSize;)this.mask.push(0);return t},l.prototype.restoreDepth=function(t){-1!==t&&t!==this.depth&&(this.maskOffset-=this.maskSize),this.depth=t}},{"./tree":9,"./utils":10}],9:[function(t,e,n){function i(t,e){this.predicates=t,this.body=e}function r(){}function s(t,e){this.conditions=[],this.children=[];for(var n=e.length-1;n>=0;n--){var i=e[n];i instanceof r?this.conditions.push(i):i===t.boundBody?this.children[n]=t.queue.pop():this.children[n]=i}}function o(){r.call(this)}function c(t){r.call(this),this.refs=t}function h(t){r.call(this),this.refs=t}function a(t){r.call(this),this.refs=t}function l(t){r.call(this),this.options=t}function u(t,e){r.call(this),this.key=t,this.value=e}function p(t){r.call(this),this.key=t}function f(t){r.call(this),this.body=t}function d(t){this.options=t,this.refs=this.options.refs,this.boundBody=this.body.bind(this);for(var e=this.methods("body"),n=0;n<e.length;n++){var i=e[n];this.boundBody[d.methods[n]]=i}this.queue=[],this.templates=[],this.initializers=[]}function m(t,e,n){var i=t[n],r=t.boundBody;return"body"!==e?"replace"===n||"extend"===n||"wrap"===n?function(){return i.apply(t,arguments)}:function(){return i.apply(t,arguments),r}:function(){var e=i.apply(t,arguments),s=t.queue.pop(),o=t.queue[t.queue.length-1];return o.conditions=o.conditions.concat(s.conditions),o.children=o.children.concat(s.children),"replace"===n||"extend"===n||"wrap"===n?e:r}}var y=t("minimalistic-assert"),v=t("inherits");n.Template=i,i.prototype.wrap=function(){for(var t=this.body,e=0;e<this.predicates.length;e++){var n=this.predicates[e];t=n.wrapBody(t)}this.body=t},i.prototype.clone=function(){return new i(this.predicates.slice(),this.body)},n.MatchBase=r,r.prototype.wrapBody=function(t){return t},v(o,r),n.OnceMatch=o,v(c,r),n.WrapMatch=c,c.prototype.wrapBody=function(t){var e=this.refs.applyCtx;return"function"!=typeof t?function(){return e(t)}:function(){return e(t.call(this,this,this.ctx))}},v(h,r),n.ReplaceMatch=h,h.prototype.wrapBody=function(t){var e=this.refs.applyCtx;return"function"!=typeof t?function(){return e(t)}:function(){return e(t.call(this,this,this.ctx))}},v(a,r),n.ExtendMatch=a,a.prototype.wrapBody=function(t){var e=this.refs.applyCtx,n=this.refs.local;return"function"!=typeof t?function(){for(var i={},r=Object.keys(t),s=0;s<r.length;s++)i["ctx."+r[s]]=t[r[s]];return n(i)(function(){return e(this.ctx)})}:function(){for(var i={},r=t.call(this),s=Object.keys(r),o=0;o<s.length;o++)i["ctx."+s[o]]=r[s[o]];return n(i)(function(){return e(this.ctx)})}},v(l,r),n.CompilerOptions=l,v(u,r),n.PropertyMatch=u,v(p,r),n.PropertyAbsent=p,v(f,r),n.CustomMatch=f,n.Tree=d,d.methods=["match","once","wrap","elemMatch","block","elem","mode","mod","elemMod","def","tag","attrs","cls","js","bem","mix","content","replace","extend","oninit","xjstOptions"],d.prototype.build=function(t,e){var n=this.methods("global").concat(e);return n[0]=this.match.bind(this),t.apply({},n),{templates:this.templates.slice().reverse(),oninit:this.initializers}},d.prototype.methods=function(t){for(var e=new Array(d.methods.length),n=0;n<e.length;n++){var i=d.methods[n];e[n]=m(this,t,i)}return e},d.prototype.flush=function(t,e){var n;n=e.conditions?t.concat(e.conditions):e.conditions;for(var r=0;r<e.children.length;r++){var o=e.children[r];if(o instanceof s)this.flush(n,e.children[r]);else{var c=new i(t,o);c.wrap(),this.templates.push(c)}}},d.prototype.body=function(){for(var t=new Array(arguments.length),e=0;e<arguments.length;e++)t[e]=arguments[e];var n=new s(this,t);return this.queue[this.queue.length-1].children.push(n),1===this.queue.length&&this.flush([],this.queue.shift()),this.boundBody},d.prototype.match=function(){for(var t=new Array(arguments.length),e=0;e<arguments.length;e++){var n=arguments[e];"function"==typeof n&&(n=new f(n)),y(n instanceof r,"Wrong .match() argument"),t[e]=n}return this.queue.push(new s(this,t)),this.boundBody},d.prototype.once=function(){if(arguments.length)throw new Error("Predicate once() should not have arguments");return this.match(new o)},d.prototype.applyMode=function(t,e){if(t.length)throw new Error("Predicate should not have arguments but "+JSON.stringify(t)+" passed");return this.mode(e)},d.prototype.wrap=function(){return this.def.apply(this,arguments).match(new c(this.refs))},d.prototype.xjstOptions=function(t){return this.queue.push(new s(this,[new l(t)])),this.boundBody},d.prototype.block=function(t){return this.match(new u("block",t))},d.prototype.elemMatch=function(){return this.match.apply(this,arguments)},d.prototype.elem=function(t){return this.match(new u("elem",t))},d.prototype.mode=function(t){return this.match(new u("_mode",t))},d.prototype.mod=function(t,e){return this.match(new u(["mods",t],e))},d.prototype.elemMod=function(t,e){return this.match(new u(["elemMods",t],e))},d.prototype.def=function(){return this.applyMode(arguments,"default")},d.prototype.tag=function(){return this.applyMode(arguments,"tag")},d.prototype.attrs=function(){return this.applyMode(arguments,"attrs")},d.prototype.cls=function(){return this.applyMode(arguments,"cls")},d.prototype.js=function(){return this.applyMode(arguments,"js")},d.prototype.bem=function(){return this.applyMode(arguments,"bem")},d.prototype.mix=function(){return this.applyMode(arguments,"mix")},d.prototype.content=function(){return this.applyMode(arguments,"content")},d.prototype.replace=function(){return this.def.apply(this,arguments).match(new h(this.refs))},d.prototype.extend=function(){return this.def.apply(this,arguments).match(new a(this.refs))},d.prototype.oninit=function(t){this.initializers.push(t)}},{inherits:11,"minimalistic-assert":12}],10:[function(t,e,n){function i(){return a+ ++o}var r=Object.prototype.toString;n.isArray=Array.isArray,n.isArray||(n.isArray=function(t){return"[object Array]"===r.call(t)}),n.xmlEscape=function(t){return(t+"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")},n.attrEscape=function(t){return(t+"").replace(/&/g,"&amp;").replace(/"/g,"&quot;")},n.jsAttrEscape=function(t){return(t+"").replace(/&/g,"&amp;").replace(/'/g,"&#39;")},n.extend=function(t,e){if(!t||!e)return t||e;var n,i={};for(n in t)t.hasOwnProperty(n)&&(i[n]=t[n]);for(n in e)e.hasOwnProperty(n)&&(i[n]=e[n]);return i};var s={area:1,base:1,br:1,col:1,command:1,embed:1,hr:1,img:1,input:1,keygen:1,link:1,meta:1,param:1,source:1,wbr:1};n.isShortTag=function(t){return s.hasOwnProperty(t)},n.isSimple=function(t){return t&&t!==!0?"string"==typeof t||"number"==typeof t:!0};var o=0,c=+new Date,h="__"+c,a="uniq"+c;n.getUniq=i,n.identify=function(t,e){if(!t)return i();if(e||t[h])return t[h];var n=i();return t[h]=n,n}},{}],11:[function(t,e,n){"function"==typeof Object.create?e.exports=function(t,e){t.super_=e,t.prototype=Object.create(e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}})}:e.exports=function(t,e){t.super_=e;var n=function(){};n.prototype=e.prototype,t.prototype=new n,t.prototype.constructor=t}},{}],12:[function(t,e,n){function i(t,e){if(!t)throw new Error(e||"Assertion failed")}e.exports=i,i.equal=function(t,e,n){if(t!=e)throw new Error(n||"Assertion failed: "+t+" != "+e)}},{}]},{},[2])(2)}),e.exports||n.BEMHTML}({},{}),r=new i({});return r.compile(function(t,i,r,s,o,c,h,a,l,u,p,f,d,m,y,v,x,b,g,k,w,E,M,_,j){o("ua")(p()("script"),y()(!1),x()(["(function(e,c){",'e[c]=e[c].replace(/(ua_js_)no/g,"$1yes");','})(document.documentElement,"className");'])),o("page")(u().match(function(){return!this._pageInit})(function(){var t=this.ctx;return this._nonceCsp=t.nonce,E({_pageInit:!0})(function(){return M([t.doctype||"<!DOCTYPE html>",{tag:"html",cls:"ua_js_no",content:[{elem:"head",content:[{tag:"meta",attrs:{charset:"utf-8"}},t.uaCompatible===!1?"":{tag:"meta",attrs:{"http-equiv":"X-UA-Compatible",content:t.uaCompatible||"IE=edge"}},{tag:"title",content:t.title},{block:"ua",attrs:{nonce:t.nonce}},t.head,t.styles,t.favicon?{elem:"favicon",url:t.favicon}:""]},t]}])})}),p()("body"),x()(function(){return[_(),this.ctx.scripts]}),c("head")(y()(!1),p()("head")),c("meta")(y()(!1),p()("meta")),c("link")(y()(!1),p()("link")),c("favicon")(y()(!1),p()("link"),f()(function(){return{rel:"shortcut icon",href:this.ctx.url}}))),o("page").elem("css")(y()(!1),p()("style"),t(function(){return this.ctx.url})(p()("link"),f()(function(){return{rel:"stylesheet",href:this.ctx.url}}))),o("page").elem("css").match(function(){return this.ctx.hasOwnProperty("ie")})(r()(function(){var t=this.ctx.ie,e=t?"!IE"===t?[t,"<!-->","<!--"]:[t,"",""]:["gt IE 9","<!-->","<!--"];return["<!--[if "+e[0]+"]>"+e[1],this.ctx,e[2]+"<![endif]-->"]}),u().match(function(){return this.ctx.ie===!0})(function(){var t=this.ctx.url;return M([6,7,8,9].map(function(e){return{elem:"css",url:t+".ie"+e+".css",ie:"IE "+e}}))})),o("page").elem("js")(y()(!1),p()("script"),f()(function(){var t={};return this.ctx.url?t.src=this.ctx.url:this._nonceCsp&&(t.nonce=this._nonceCsp),t})),o("ua").content()(function(){return[_(),"(function(d,n){","d.documentElement.className+=",'" ua_svg_"+(d[n]&&d[n]("http://www.w3.org/2000/svg","svg").createSVGRect?"yes":"no");','})(document,"createElementNS");']}),o("page").elem("conditional-comment")(p()(!1),x()(function(){var t=this.ctx,e=t.condition.replace("<","lt").replace(">","gt").replace("=","e"),n=e.indexOf("!")>-1,i=t.msieOnly===!1,r=n||i;return["<!--[if "+e+"]>",i?"<!":"",r?"-->":"",_(),r?"<!--":"","<![endif]-->"]})),o("i-bem").elem("i18n").def()(function(){if(!this.ctx)return"";var t=this.ctx,e=t.keyset,i=t.key,r=t.params||{};return e||i?("undefined"!=typeof t.content&&null===t.content||(r.content=n.apply(t.content)),void this._buf.push(BEM.I18N(e,i,r))):""}),k(function(){!function(t,e){if(!e.I18N){t.BEM=e;var n=t.BEM.I18N=function(t,e){return e};n.keyset=function(){return n},n.key=function(t){return t},n.lang=function(){}}}(this,"undefined"==typeof BEM?{}:BEM)}),k(function(t,n){var i=t.BEMContext||n.BEMContext;i.prototype.require=function(t){return e[t]}})}),r.exportApply(n),n}var n=!0;"object"==typeof module&&"object"==typeof module.exports&&(exports.BEMHTML=e({}),n=!1),"object"==typeof modules&&(modules.define("BEMHTML",[],function(t){t(e({}))}),n=!1),n&&(BEMHTML=e({}),t.BEMHTML=BEMHTML)}("undefined"!=typeof window?window:global||this);