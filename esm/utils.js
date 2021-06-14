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

import {extname, resolve} from 'path';

import * as parser from '@babel/parser';

const {keys} = Object;
const {stringify} = JSON;
const {hasOwnProperty} = {};

export {hasOwnProperty, keys, stringify};

// TODO: find out in which case this is actually needed as rollup is forced to export names
export const asModule = name => `(m=>m.__esModule&&m.default||m)(${name})`;

export const getBody = code => parser.parse(code, parserOptions).program.body;

export const getCallback = callback => ''.replace.call(
  callback,
  /^\s*([^(]+)/,
  (_, $1) => {
    return /^(?:function|)$/.test($1.trim()) ? $1 : 'function';
  }
);

export const getGlobal = (namespace, name) =>
  `${namespace}${isSimple(name) ? `.${name}` : `[${stringify(name)}]`}`;

export const getInclude = (root, hash) => {
  const include = {};
  for (const key of keys(hash))
    include[key] = resolve(root, hash[key]);
  return include;
};

export const getModule = (require, name) => name[0] === '_' ?
                          getGlobal(require, name) :
                          asModule(getGlobal(require, name));

export const getName = name => {
  const ext = extname(name);
  return `${name.slice(0, -ext.length)}@JSinJSON${ext}`;
};

export const getNames = specifiers => {
  const imports = [];
  const exports = [];
  for (const {local, exported} of specifiers) {
    const {name} = exported;
    imports.push(local.name == name ? name : `${local.name}: ${name}`);
    exports.push(name);
  }
  return {imports, exports};
};

export const getRealName = (code, source, replace) => {
  let name = slice(code, source).slice(1, -1);
  if (replace && hasOwnProperty.call(replace, name))
    name = replace[name];
  return name;
};

export const isJS = name => /^\.[mc]?js$/i.test(extname(name));
export const isLocal = name => /^[./]/.test(name);
export const isSimple = name => /^[$_a-z]+[$_0-9a-z]*$/i.test(name);

export const slice = (code, info) => code.slice(info.start, info.end);

export const warn = (...args) => {
  console.warn('⚠ \x1b[1mWarning\x1b[0m', ...args);
};

export const defaults = {
  babel: true,
  minify: true,
  global: 'self',
  prefix: `_${Date.now().toString(36).slice(-2)}`
};

export const babelOptions = {
  presets: ['@babel/preset-env'],
  plugins: [['@babel/plugin-transform-runtime', {useESModules: true}]]
};

export const parserOptions = {
  allowAwaitOutsideFunction: true,
  sourceType: 'module',
  plugins: [
    // 'estree',
    'jsx',
    'typescript',
    'exportExtensions',
    'exportDefaultFrom',
    'exportNamespaceFrom',
    'dynamicImport',
    'importMeta',
    'asyncGenerators',
    'bigInt',
    'classProperties',
    'classPrivateProperties',
    'classPrivateMethods',
    ['decorators', {decoratorsBeforeExport: true}],
    'doExpressions',
    'functionBind',
    'functionSent',
    'logicalAssignment',
    'nullishCoalescingOperator',
    'numericSeparator',
    'objectRestSpread',
    'optionalCatchBinding',
    'optionalChaining',
    'partialApplication',
    ['pipelineOperator', {proposal: 'minimal'}],
    'throwExpressions',
    'topLevelAwait'
  ]
};
