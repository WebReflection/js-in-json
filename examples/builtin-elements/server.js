import http from 'http';
import {env} from 'process';

import {render, html, Hole} from 'uhtml-ssr';
function JS(name) { return new Hole(this.add(name).flush()); }

import {ready, session} from './js-in-json.js';

const handler = (req, res) => {
  if (req.url === '/favicon.ico') {
    res.writeHead(404)
    res.write('Not Found');
  }
  else {
    const js = JS.bind(session());
    res.writeHead(200, {'content-type': 'text/html;charset=utf-8'});
    render(res, html`
<!doctype html>
<html lang="en">
  <head>
    <meta name="viewport" content="initial-scale=1">
    <title>JS in JSON</title>
    <script type="module">${js('builtin-elements')}</script>
  </head>
  <main></main>
  <script type="module">${js('@main')}</script>
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
