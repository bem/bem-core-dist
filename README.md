# bem-core

Страница библиотеки - https://bem.info/libs/bem-core/

## Состав
Доступны отдельные наборы файлов для двух платформ:
* desktop
* touch

Каждый набор включает в себя:
* bem-core.bemhtml.js — BEMHTML-шаблоны
* bem-core.bh.js — BH-шаблоны
* bem-core.css — стили
* bem-core.dev.bemhtml.js — неминимизированные BEMHTML-шаблоны
* bem-core.dev.bh.js — неминимизированные BH-шаблоны
* bem-core.dev.css — неминимизированные стили
* bem-core.dev.js — неминимизированные скрипты
* bem-core.dev.js+bemhtml.js — неминимизированные скрипты + BEMHTML-шаблоны
* bem-core.dev.js+bh.js — неминимизированные скрипты + BH-шаблоны
* bem-core.js — скрипты
* bem-core.js+bemhtml.js — скрипты + BEMHTML-шаблоны
* bem-core.js+bh.js — скрипты + BH-шаблоны

## Пример использования

```html
<!DOCTYPE html>
<html class="ua_js_no">
<head>
    <!--[if lt IE 9]><script src="//yastatic.net/es5-shims/0.0.1/es5-shims.min.js"></script><![endif]-->
    <meta charset="utf-8"/><meta http-equiv="X-UA-Compatible" content="IE=edge"/>
    <title>bem-core dist</title>
    <script>(function(e,c){e[c]=e[c].replace(/(ua_js_)no/g,"$1yes");})(document.documentElement,"className");(function(d,n){d.documentElement.className+=" ua_svg_"+(d[n]&&d[n]("http://www.w3.org/2000/svg","svg").createSVGRect?"yes":"no");})(document,"createElementNS");</script>
    <!--[if gt IE 8]><!--><link rel="stylesheet" href="dist/desktop/bem-core.css"/>
</head>
<body class="page page_theme_islands">
<!-- write your code here -->
<script src="dist/desktop/bem-core.js+bh.js"></script>
</body>
</html>
```
