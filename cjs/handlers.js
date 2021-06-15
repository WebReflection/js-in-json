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

const etag = (m => /* c8 ignore start */ m.__esModule ? m.default : m /* c8 ignore stop */)(require('etag'));
const {dirname, resolve} = require('path');
const {iife} = require('./rollup.js');
const {
  getGlobal, getModule, getName, hasOwnProperty, isJS, isLocal
} = require('./utils.js');

const createCacheEntry = async (
  CommonJS, module, dependencies, innerName
) => {
  const {cache} = module;
  if (!dependencies.has(innerName))
      dependencies.add(innerName);
  if (!hasOwnProperty.call(cache, innerName)) {
    const body = await iife(
      CommonJS.resolve(innerName),
      innerName,
      false,
      module
    );
    cache[innerName] = {
      module: body,
      etag: etag(body),
      code: '',
      dependencies: []
    };
  }
};

const createLocalEntry = async (
  CommonJS, dependencies, module, parsed, remove,
  input,
  moduleTransformer,
  ifLocal
) => {
  await moduleTransformer(
    CommonJS, '',
    {...module, input},
    dependencies, parsed, remove
  );
  const newName = getName(input);
  await ifLocal(remove.has(newName) ? newName : input);
};

const exportHandler = async (
  CommonJS, input, dependencies, module, parsed, remove, innerName,
  {
    addCacheEntry,
    moduleTransformer,
    ifModule,
    ifLocal
  }
) => {
  const {graph} = module;
  if (isLocal(innerName)) {
    if (!isJS(innerName))
      return;
    innerName = resolve(dirname(input), innerName);
    const {count, name} = graph.get(innerName);
    if (count > 1) {
      innerName = name;
      if (!dependencies.has(name))
        dependencies.add(name);
      await addCacheEntry(CommonJS, innerName, module, parsed, remove);
      await ifModule(innerName);
    }
    else {
      await createLocalEntry(
        CommonJS, dependencies, module, parsed, remove,
        innerName,
        moduleTransformer,
        ifLocal
      );
    }
  }
  else {
    await createCacheEntry(CommonJS, module, dependencies, innerName);
    await ifModule(innerName);
  }
};
exports.exportHandler = exportHandler;

const importHandler = async (
  CommonJS, input, dependencies, module, parsed, remove, innerName,
  {
    addCacheEntry,
    moduleTransformer,
    ifModule,
    ifLocal,
    specifiers
  }
) => {
  const {graph, require} = module;
  if (isLocal(innerName)) {
    if (!isJS(innerName))
      return;
    innerName = resolve(dirname(input), innerName);
    const {count, name} = graph.get(innerName);
    if (count > 1) {
      innerName = name;
      if (!dependencies.has(name))
        dependencies.add(name);
      await addCacheEntry(CommonJS, innerName, module, parsed, remove);
    }
    else {
      await createLocalEntry(
        CommonJS, dependencies, module, parsed, remove,
        innerName,
        moduleTransformer,
        ifLocal
      );
      return;
    }
  }
  else {
    await createCacheEntry(CommonJS, module, dependencies, innerName);
  }
  const imports = [];
  const names = [];
  for (const {type, imported, local} of specifiers) {
    switch(type) {
      case 'ImportDefaultSpecifier':
        imports.push(
          `const ${local.name} = ${getModule(require, innerName)};`
        );
        break;
      case 'ImportNamespaceSpecifier':
        imports.push(
          `const ${local.name} = ${getGlobal(require, innerName)};`
        );
        break;
      case 'ImportSpecifier':
        names.push(
          local.name === imported.name ?
          local.name :
          `${imported.name}: ${local.name}`
        );
        break;
    }
  }

  if (names.length) {
    const rep = getGlobal(require, innerName);
    imports.push(`const {${names.join(', ')}} = ${rep};`);
  }

  ifModule(imports.join('\n'));
};
exports.importHandler = importHandler;
