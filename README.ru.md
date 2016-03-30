# bem-core

Страница библиотеки - https://bem.info/libs/bem-core/

## Состав
Доступны отдельные наборы файлов для двух платформ:
* desktop
* touch

Каждый набор включает в себя:
* bem-core.css — стили
* bem-core.dev.css — неминимизированные стили

* bem-core.bemhtml.js — [BEMHTML](https://ru.bem.info/technology/bemhtml/)-шаблоны
* bem-core.dev.bemhtml.js — неминимизированные BEMHTML-шаблоны

* bem-core.bh.js — [BH](https://ru.bem.info/technology/bh/)-шаблоны
* bem-core.dev.bh.js — неминимизированные BH-шаблоны

Бандлы с автоинициализацией используются, если вы НЕ планируете добавлять собственный код на [i-bem.js](https://ru.bem.info/technology/i-bem/):

* bem-core.js — скрипты с автоинициализацией
* bem-core.js+bemhtml.js — скрипты с автоинициализацией + BEMHTML-шаблоны
* bem-core.js+bh.js — скрипты с автоинициализацией + BH-шаблоны

* bem-core.dev.js — неминимизированные скрипты с автоинициализацией
* bem-core.dev.js+bemhtml.js — неминимизированные скрипты с автоинициализацией + BEMHTML-шаблоны
* bem-core.dev.js+bh.js — неминимизированные скрипты с автоинициализацией + BH-шаблоны

Бандлы без автоинициализации используются, если вы планируете добавлять собственный код на `i-bem.js`:

* bem-core.no-autoinit.js — скрипты без автоинициализации
* bem-core.no-autoinit.js+bemhtml.js — скрипты без автоинициализации + BEMHTML-шаблоны
* bem-core.no-autoinit.js+bh.js — скрипты без автоинициализации + BH-шаблоны

* bem-core.dev.no-autoinit.js — неминимизированные скрипты без автоинициализации
* bem-core.dev.no-autoinit.js+bemhtml.js — неминимизированные скрипты без автоинициализации + BEMHTML-шаблоны
* bem-core.dev.no-autoinit.js+bh.js — неминимизированные скрипты без автоинициализации + BH-шаблоны

## Пример использования

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
