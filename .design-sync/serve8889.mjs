import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, resolve, join } from 'node:path';

const root = resolve(process.argv[2] ?? './ds-bundle');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.otf': 'font/otf',
};
createServer((req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    let f = join(root, p);
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.setHeader('Content-Type', MIME[extname(f)] ?? 'application/octet-stream');
    res.end(readFileSync(f));
  } catch {
    res.statusCode = 404;
    res.end('not found');
  }
}).listen(8889, '127.0.0.1', () => console.log('http://127.0.0.1:8889/'));
