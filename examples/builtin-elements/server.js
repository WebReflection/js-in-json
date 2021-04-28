import http from 'http';
import {env} from 'process';

import {render, html} from 'uhtml-ssr';

import {ready, session} from './js-in-json.js';

const handler = (req, res) => {
  if (req.url === '/favicon.ico') {
    res.writeHead(404)
    res.write('Not Found');
  }
  else {
    const current = session();
    res.writeHead(200, {'content-type': 'text/html;charset=utf-8'});
    render(res, html`
<!doctype html>
<html lang="en">
  <head>
    <meta name="viewport" content="initial-scale=1">
    <title>JS in JSON</title>
    <script type="module">${html([current.add('builtin-elements').flush()])}</script>
  </head>
  <main></main>
  <script type="module" async>${html([current.add('@main').flush()])}</script>
</html>
    `);
  }
  res.end();
};

ready.then(() => {
  const server = http.createServer(handler).listen(
    env.PORT || 0,
    () => {
      const {port} = server.address();
      console.log(`http://localhost:${port}/`);
    }
  );
});
