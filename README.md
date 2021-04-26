# JS in JSON

A server side agnostic way to stream JavaScript, ideal for:

  * inline hydration
  * network free ad-hoc dependencies
  * bootstrap on demand
  * libraries on demand
  * one JSON file to rule all SSR cases

The **Session** utility is currently available for:

  * [JS](https://github.com/WebReflection/js-in-json-session#readme)
  * [PHP](https://github.com/WebReflection/js-in-json-session/blob/main/php/session.php)
  * [Python](https://github.com/WebReflection/js-in-json-session/blob/main/python/session.py)

- - -

An "*islands friendly*" approach to Server Side Rendering able to produce *stream-able JS* on demand, via any programming language, through a single JSON bundle file instrumented to *flush()* any script, after optional transpilation and/or minification.

The produced output can be also pre-generated and served as static content, with the advantages that **js-in-json bundles require zero network activity**: forget round-trips, thousand *ESM* requests per library or project, and simply provide all it's needed right on the page.

```js
// a basic serving example
const {JSinJSON} = require('js-in-json');

// see ## Options
const {options} = require('./js-in-json-options.js');

const islands = JSinJSON(options);
// islands.save(); when needed to create the JSON bundle

http.createServer((req, res) => {
  // see ## Session
  const js = islands.session();
  js.add('Main');
  res.writeHead(200, {'content-type': 'text/html'});
  res.write(`
    <!doctype html>
    <script src="//external.cdn.js"></script>
    <script>${js.flush()}</script>
    <body>
      <div class="component"></div>
      <script>${js.add('UI/component').flush()}</script>
    </body>
  `.trim());
  js.add('Footer');
  if (global.condition) {
    js.add('SpecialCondition');
    res.write(`<script>${js.flush()}</script>`);
  }
  res.end();
});
```

## Session

A *js-in-json* session can be initialized right away via `js-in-json/session` exported *Session* class, or through the main `JSinJSON(options).session()` utility.

A session created via `JSinJSON` optionally accepts a JSON bundle, retrieved from *options*, if not provided, and it exposes 2 methods:

  * `add("ModuleName")` to *flush* its content *only once* and, if repeatedly added, and available, bootstrap its *code*
  * `flush()` to return all modules and their dependencies previously added and, if available, their code to bootstrap

In order to have a *session*, a JSON bundle must be created.


## Options

Following the object literal with all its defaults that can be passed to the `JSinJSON(options)` export.

```js
const {save, session} = JSinJSON({

  // TOP LEVEL CONFIG ONLY

  // MANDATORY
  // the root folder from which each `input` is retrieved
  // used to resolve the optional output, if relative to this folder
  root: '/full/project/root/folder'

  // OPTIONAL
  // where to store the resulting JSON cache usable via JSinJSON.session(cache)
  // if omitted, the cache is still processed and returned
  output: './bundle.json',
  // the global context used to attach the `require` like function
  global: 'self',
  // the `require` like unique function name, automatically generated,
  // and it's different per each saved JSON (hint: don't specify it)
  prefix: '_uid',


  // OPTIONAL EXTRAS: CAN BE OVERWRITTEN PER EACH MODULE
  // use Babel transformer to target @babel/preset-env
  babel: true,
  // use terser to minify produced code
  minify: true,
  // transform specific bare imports into other imports, it's {} by default
  // see: rollup-plugin-includepaths
  replace: {
    // example: replace CE polyfill with an empty file
    '@ungap/custom-elements': './empty.js'
  },
  // executed each time a JSinJSON.session.flush() happens
  // no matter which module has been added to the stack
  // it's missing/no-op by default and it has no access
  // to the outer scope of this file (it's serialized as function)
  code(require) {
    // each code receives the `require` like function
    const {upgradeAll} = require('Bootstrap');
    upgradeAll();
  },
  // an object literal to define all modules flushed in the page
  // whenever any of these is needed
  modules: {
    // the module name available via the `require` like function
    Bootstrap: {
      // MANDATORY
      // the ESM entry point for this module
      input: './bootstrap.js',

      // OPTIONAL: overwrite top level options per each module
      // don't transform and/or don't minify
      babel: false,
      minify: false,
      // will be merged with the top level
      replace: {'other': './file.js'},
      // don't flush anything when injected
      code: null
    },

    // other module example
    Login: {
      input: './login.js',
      code() {
        document.documentElement.classList.add('wait');
        fetch('/login/challenge').then(b => b.json).then(result => {
          self.challenge = result;
          document.documentElement.classList.remove('wait');
        });
      }
    }
  }
});
```

### Options Rules / Limitations

  * the `root` should better be a fully qualified path, instead of relative
  * the `code` is always transformed with `@babel/preset-env` target
  * the `code` **cannot be asynchronous**
  * modules *cannot* have `_` as name prefix, that's reserved for internal resolutions
  * modules *should* have *non-npm* modules names, to avoid conflicts/clashing with imports
  * modules *can* be capitalized
