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

const {writeFile, unlink} = require('fs/promises');
const {env} = require('process');

const {transformSync} = require("@babel/core");
const {minify: terser} = require('terser');

const {iife} = require('./rollup.js');

const {
  babelOptions,
  getBody,
  getCallback,
  getGlobal,
  getModule,
  getName,
  getNames,
  getRealName,
  hasOwnProperty,
  stringify,
  slice,
  warn
} = require('./utils.js');

const {exportHandler, importHandler} = require('./handlers.js');

const addCacheEntry = async (CommonJS, name, module, parsed, remove) => {
  const {cache, code} = module;
  if (hasOwnProperty.call(cache, name))
    return;
  const dependencies = new Set;
  cache[name] = {
    module: await moduleTransformer(
      CommonJS, name, module, dependencies, parsed, remove
    ),
    code: code ? await codeTransformer(module) : '',
    dependencies: [...dependencies]
  };
};

const chunk = (info, esm, cjs) => ({
  start: info.start,
  end: info.end,
  esm, cjs
});

const codeTransformer = async ({babel, code, minify, require}) => {
  let output = `(${getCallback(code)})(${require});`;
  if (babel)
    output = transformSync(
      output, babelOptions).code.replace(/^"use strict";/, ''
    );
  if (minify)
    output = (await terser(output)).code;
  return output;
};

const getOutput = (code, chunks) => {
  const output = [];
  const {length} = chunks;
  let c = 0;
  for (let i = 0; i < length; i++) {
    output.push(
      code.slice(c, chunks[i].start),
      chunks[i].cjs
    );
    c = chunks[i].end;
  }
  output.push(length ? code.slice(c) : code);
  return output.join('').trim();
};

const moduleTransformer = async (
  CommonJS, name, module, dependencies, parsed, remove
) => {
  let {graph, input, replace, require} = module;
  if (parsed.has(input))
    return;
  parsed.add(input);
  const {code} = graph.get(input);
  const chunks = [];
  for (const item of getBody(code)) {
    const {source} = item;
    const esm = slice(code, item);
    switch (item.type) {
      case 'ExportAllDeclaration': {
        await exportHandler(
          CommonJS, input, dependencies, module, parsed, remove,
          getRealName(code, source, replace),
          {
            ...exportUtils,
            // TODO: find a way to resolve modules via their entry point
            //       only if these modules are ESM ... otherwise think about
            //       warning here and but the bundler include the whole library?
            async ifModule(name) {
              warn(
                'export * from',
                `\x1b[1m${name[0] === '_' ? input : name}\x1b[0m`,
                'is being exported instead as default'
              );
              const rep = `export default ${getGlobal(require, name)};`;
              chunks.push(chunk(item, esm, rep));
            },
            ifLocal(name) {
              const rep = esm.replace(slice(code, source), stringify(name));
              chunks.push(chunk(item, esm, rep));
            }
          }
        );
        break;
      }
      case 'ExportNamedDeclaration': {
        if (source) {
          const {specifiers} = item;
          await exportHandler(
            CommonJS, input, dependencies, module, parsed, remove,
            getRealName(code, source, replace),
            {
              ...exportUtils,
              ifModule(name) {
                const {imports, exports} = getNames(specifiers);
                const rep = imports.join(', ');
                chunks.push(chunk(item, esm, [
                  `const {${rep}} = ${getModule(require, name)};`,
                  `export {${exports.join(', ')}};`
                ].join('\n')));
              },
              ifLocal(name) {
                const {imports, exports} = getNames(specifiers);
                const rep = imports.map(n => n.replace(':', ' as')).join(', ');
                chunks.push(chunk(item, esm, [
                  `import {${rep}} from ${stringify(name)};`,
                  `export {${exports.join(', ')}};`
                ].join('\n')));
              }
            }
          );
        }
        break;
      }
      case 'ImportDeclaration': {
        await importHandler(
          CommonJS, input, dependencies, module, parsed, remove,
          getRealName(code, source, replace),
          {
            ...exportUtils,
            specifiers: item.specifiers,
            ifModule(names) {
              chunks.push(chunk(item, esm, names));
            },
            ifLocal(name) {
              const rep = esm.replace(slice(code, source), stringify(name));
              chunks.push(chunk(item, esm, rep));
            }
          }
        );
        break;
      }
    }
  }
  if (chunks.length) {
    input = getName(input);
    await saveFile(input, code, chunks, remove);
  }
  return name ? (await iife(input, name, false, module)) : '';
};

const saveFile = (file, code, chunks, remove) => {
  if (remove.has(file)) {
    warn(`possible circular dependency for ${file}`);
    return;
  }
  remove.add(file);
  return writeFile(file, getOutput(code, chunks));
};

const exportUtils = {addCacheEntry, moduleTransformer};

const parse = async (CommonJS, graph, modules) => {
  const parsed = new Set;
  const remove = new Set;
  for (const [input, {name, count, key}] of graph.entries()) {
    if (count > 1 || name === key) {
      const module = modules[name] || modules[key];
      await addCacheEntry(
        CommonJS, name, {...module, input}, parsed, remove
      );
      }
  }
  if (!/^(?:1|true|y|yes)$/i.test(env.JS_IN_JSON_DEBUG))
    await Promise.all([...remove].map(file => unlink(file)));
};
exports.parse = parse;
