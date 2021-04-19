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

const {rollup} = require('rollup');
const includePaths = (m => /* c8 ignore start */ m.__esModule ? m.default : m /* c8 ignore stop */)(require('rollup-plugin-includepaths'));
const {terser} = require('rollup-plugin-terser');
const babel = (m => /* c8 ignore start */ m.__esModule ? m.default : m /* c8 ignore stop */)(require('@rollup/plugin-babel'));
const {nodeResolve} = require('@rollup/plugin-node-resolve');
const commonjs = (m => /* c8 ignore start */ m.__esModule ? m.default : m /* c8 ignore stop */)(require('@rollup/plugin-commonjs'));

const {babelOptions, getGlobal} = require('./utils.js');

const iife = async (input, name, esModule, {
  babel: transpile,
  minify,
  global,
  namespace,
  replace,
  require
}) => {
  const bundle = await rollup({
    input,
    plugins: [].concat(
      replace ? [includePaths({include: replace})] : [],
      [nodeResolve()],
      [commonjs()],
      transpile ? [babel({...babelOptions, babelHelpers: 'runtime'})] : [],
      minify ? [terser()] : []
    )
  });
  const ignore = namespace === require ? global : require;
  const {output} = await bundle.generate({
    esModule,
    name: '__',
    format: 'iife',
    exports: 'named',
    globals: esModule ? {} : {[ignore]: ignore}
  });
  const module = output.map(({code}) => code).join('\n').trim();
  return module.replace(
    /^(?:var|const|let)\s+__\s*=/,
    `${getGlobal(require, name)}=`
  );
};
exports.iife = iife;
