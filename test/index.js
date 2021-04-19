const {join} = require('path');

const {JSinJSON} = require('../cjs');


const {save, session} = JSinJSON({
  root: join(__dirname, 'project'),
  output: join(__dirname, 'test.json'),
  // babel: false,
  // minify: false,
  modules: {
    imports: {
      input: './imports.js'
    },
    exports: {
      input: './exports.js',
      code() {
        console.log(456);
      }
    }
  }
});

save().then(() => {
  const ssr = session();
  console.log(ssr.add('imports').flush());
  console.log('');
  console.log(ssr.add('imports').flush());
  console.log('');
  console.log(ssr.add('exports').flush());
  console.log('');
  console.log(ssr.add('exports').flush());
});
