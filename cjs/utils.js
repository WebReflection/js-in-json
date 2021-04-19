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

const {extname, resolve} = require('path');

const parser = require('@babel/parser');

const {keys} = Object;
const {stringify} = JSON;
const {hasOwnProperty} = {};

exports.hasOwnProperty = hasOwnProperty;
exports.keys = keys;
exports.stringify = stringify;

// TODO: find out in which case this is actually needed as rollup is forced to export names
const asModule = name => `(m=>m.__esModule&&m.default||m)(${name})`;
exports.asModule = asModule;

const getBody = code => parser.parse(code, parserOptions).program.body;
exports.getBody = getBody;

const getCallback = callback => ''.replace.call(
  callback,
  /^\s*([^(]+)/,
  (_, $1) => {
    return /^(?:function|)$/.test($1.trim()) ? $1 : 'function';
  }
);
exports.getCallback = getCallback;

const getGlobal = (namespace, name) =>
  `${namespace}${isSimple(name) ? `.${name}` : `[${stringify(name)}]`}`;
exports.getGlobal = getGlobal;

const getInclude = (root, hash) => {
  const include = {};
  for (const key of keys(hash))
    include[key] = resolve(root, hash[key]);
  return include;
};
exports.getInclude = getInclude;

const getModule = (require, name) => name[0] === '_' ?
                          getGlobal(require, name) :
                          asModule(getGlobal(require, name));
exports.getModule = getModule;

const getName = name => {
  const ext = extname(name);
  return `${name.slice(0, -ext.length)}@JSinJSON${ext}`;
};
exports.getName = getName;

const getNames = specifiers => {
  const imports = [];
  const exports = [];
  for (const {local, exported} of specifiers) {
    const {name} = exported;
    imports.push(local.name == name ? name : `${local.name}: ${name}`);
    exports.push(name);
  }
  return {imports, exports};
};
exports.getNames = getNames;

const getRealName = (code, source, replace) => {
  let name = slice(code, source).slice(1, -1);
  if (replace && hasOwnProperty.call(replace, name))
    name = replace[name];
  return name;
};
exports.getRealName = getRealName;

const isJS = name => /^\.[mc]?js$/i.test(extname(name));
exports.isJS = isJS;
const isLocal = name => /^[./]/.test(name);
exports.isLocal = isLocal;
const isSimple = name => /^[_0-9a-z]+$/i.test(name);
exports.isSimple = isSimple;

const slice = (code, info) => code.slice(info.start, info.end);
exports.slice = slice;

const warn = (...args) => {
  console.warn('⚠ \x1b[1mWarning\x1b[0m', ...args);
};
exports.warn = warn;

const defaults = {
  babel: true,
  minify: true,
  global: 'self',
  prefix: `_${Date.now().toString(36).slice(-2)}`
};
exports.defaults = defaults;

const babelOptions = {
  presets: ['@babel/preset-env'],
  plugins: [['@babel/plugin-transform-runtime', {useESModules: true}]]
};
exports.babelOptions = babelOptions;

const parserOptions = {
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
exports.parserOptions = parserOptions;
