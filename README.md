# bem-core-dist

This is precompiled version of [bem-core](https://en.bem.info/libs/bem-core/) library. All the files are also available at CDN. For more info please refer to [usage documentation](https://en.bem.info/libs/bem-core/current/#use).

## Contents
There are two sets for different platforms:
* desktop
* touch

Each of them includes:
* bem-core.bemhtml.js — BEMHTML templates
* bem-core.bh.js — BH templates

* bem-core.css — styles

* bem-core.dev.bemhtml.js — non-minified BEMHTML templates
* bem-core.dev.bh.js — non-minified BH templates
* bem-core.dev.css — non-minified styles
* bem-core.dev.js — non-minified scripts
* bem-core.dev.js+bemhtml.js — non-minified scripts + BEMHTML templates
* bem-core.dev.js+bh.js — non-minified scripts + BH templates
* bem-core.js — scripts
* bem-core.js+bemhtml.js — scripts + BEMHTML templates
* bem-core.js+bh.js — scripts + BH templates

* bem-core.dev.no-autoinit.js — non-minified scripts with autoinit
* bem-core.dev.no-autoinit.js+bemhtml.js — non-minified scripts with autoinit + BEMHTML templates
* bem-core.dev.no-autoinit.js+bh.js — non-minified scripts with autoinit + BH templates

* bem-core.no-autoinit.js — scripts without autoinit
* bem-core.no-autoinit.js+bemhtml.js — scripts without autoinit + BEMHTML templates
* bem-core.no-autoinit.js+bh.js — scripts without autoinit + BH templates

Important: If you're going to write your own code with `i-bem.js` you must use bundles without autoinit and call initialization manually.

## HTML template to use the dist with

```html
<!DOCTYPE html>
<html class="ua_js_no">
<head>
    <!--[if lt IE 9]><script src="//yastatic.net/es5-shims/0.0.1/es5-shims.min.js"></script><![endif]-->
    <meta charset="utf-8"/><meta http-equiv="X-UA-Compatible" content="IE=edge"/>
    <title>bem-core dist</title>
    <!--[if gt IE 8]><!--><link rel="stylesheet" href="dist/desktop/bem-core.css"/>
</head>
<body class="page page_theme_islands">
<!-- write your code here -->
<script src="dist/desktop/bem-core.no-autoinit.js+bemhtml.js"></script>
<script>
    modules.require('i-bem__dom_init', function(init) {
        init();
    });
</script>
</body>
</html>
```
