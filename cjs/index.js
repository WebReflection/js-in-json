'use strict';
/*!
 * ISC License
 *
 * Copyright (c) 2021, Andrea Giammarchi, @WebReflection
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
 * SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
 * OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
 * CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

const {createRequire} = require('module');
const {join, resolve} = require('path');
const {writeFile} = require('fs/promises');

const {parse} = require('./bundler.js');
const {crawl} = require('./graph.js');
const {getGlobal, getInclude, isSimple, keys, stringify} = require('./utils.js');
const Session = (m => /* c8 ignore start */ m.__esModule ? m.default : m /* c8 ignore stop */)(require('./session.js'));

const defaults = {
  babel: true,
  minify: true,
  global: 'self',
  prefix: `_${Date.now().toString(36).slice(-2)}`,
  code: null,
  replace: null
};

const createModuleEntry = (module, options) => ({
  input: resolve(options.root, module.input),
  babel: !!getEntryValue('babel', module, options),
  minify: !!getEntryValue('minify', module, options),
  code: getEntryValue('code', module, options),
  replace: getEntryValue('replace', module, options),
});

const getEntryValue = (name, module, options) => {
  let value = module[name];
  if (value == null) {
    value = options[name];
    if (value == null)
      value = defaults[name];
  }
  return value;
};

let instances = 0;
const JSinJSON = options => {
  const {output, root} = options;
  const id = (instances++).toString(36);
  const CommonJS = createRequire(join(root, 'node_modules'));
  let json = null;
  return {
    session(cache = json) {
      return new Session(cache || (json = CommonJS(resolve(root, output))));
    },
    async save() {
      const graph = await crawl(options);
      const main = `${getEntryValue('prefix', {}, options)}${id}`;
      const global = getEntryValue('global', {}, options);
      const namespace = getGlobal(global, main);
      const require = isSimple(main) ? main : namespace;
      const cache = {
        _: {
          module: `${namespace}=function _($){return _[$]};`,
          code: '',
          dependencies: []
        }
      };
      const modules = {};
      for (const key of keys(options.modules)) {
        const entry = createModuleEntry(options.modules[key], options);
        if (entry.replace)
          entry.replace = getInclude(root, entry.replace);
        modules[key] = {
          ...entry,
          global,
          namespace,
          require,
          cache,
          graph
        };
      }
      await parse(CommonJS, graph, modules);
      if (output)
        await writeFile(
          resolve(root, output),
          stringify(cache, null, 2)
        );
      return cache;
    }
  };
};
exports.JSinJSON = JSinJSON;

exports.Session = Session;
