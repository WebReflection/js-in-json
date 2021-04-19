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

module.exports = class Session extends Map {
  constructor(modules) {
    super([['_', modules._]]);
    this.flushed = new Set;
    this.modules = modules;
  }
  add(module) {
    if (!this.has(module)) {
      const {module: m, code, dependencies} = this.modules[module];
      for (let i = 0, {length} = dependencies; i < length; i++)
        this.add(dependencies[i]);
      this.set(module, {module: m, code});
    }
    return this;
  }
  flush() {
    const output = [];
    this.forEach(({module, code}, name) => {
      if (!this.flushed.has(name)) {
        this.flushed.add(name);
        output.push(module);
      }
      if (0 < code.length)
        output.push(code);
    });
    this.clear();
    return output.join('\n');
  }
}
