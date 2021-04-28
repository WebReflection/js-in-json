import {existsSync} from 'fs';
import {join} from 'path';

import info from 'umeta';

import {JSinJSON} from '../../esm/index.js';

const {dirName: root} = info(import.meta);
const output = join(root, 'js-in.json');

const {save, session} = JSinJSON({
  root,
  output,
  babel: false,
  modules: {
    '@main': {
      input: './js/main.js',
      code(require) {
        const {upgrade} = require('builtin-elements');
        const {Main} = require('@main');
        document.querySelectorAll('main').forEach(node => {
          upgrade(node, Main);
        });
      }
    }
  }
});

export {session};

export const ready = existsSync(output) ? Promise.resolve() : save();
