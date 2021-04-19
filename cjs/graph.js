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

const {readFile} = require('fs/promises');
const {dirname, resolve} = require('path');

const {
  getBody, getInclude, hasOwnProperty, isJS, isLocal, slice
} = require('./utils.js');

const {keys} = Object;

const parse = async (file, entry, map, include, index, key) => {
  if (!map.has(file))
    map.set(file, {
      name: '_' + (index.i++).toString(36),
      code: (await readFile(file)).toString(),
      count: 0,
      key
    });

  const info = map.get(file);

  if (entry)
    info.name = entry;

  if (info.count++)
    return;

  // TODO: the AST for crawled files could be stored too
  for (const {type, source} of getBody(info.code)) {
    switch (type) {
      case 'ExportNamedDeclaration':
        if (!source)
          break;
      case 'ExportAllDeclaration':
      case 'ImportDeclaration':
        let name = slice(info.code, source).slice(1, -1);
        if (hasOwnProperty.call(include, name))
          name = include[name];
        if (isJS(name) && isLocal(name))
          await parse(
            resolve(dirname(file), name), '', map, include, index, key
          );
        break;
    }
  }
};

const crawl = async (options) => {
  const map = new Map;
  const index = {i: 0};
  const {modules, root} = options;
  for (const entry of keys(modules)) {
    const {input, replace} = modules[entry];
    const include = getInclude(root, replace || options.replace || {});
    await parse(resolve(root, input), entry, map, include, index, entry);
  }
  return new Map([...map.entries()].sort(
    ([a, {count: A}], [z, {count: Z}]) => (Z - A)
  ));
};
exports.crawl = crawl;
