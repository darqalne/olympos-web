import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = 6666;

// English URL aliases, mirroring the rewrites in vercel.json
const enAliases = {
  '/shop': '/magaza.html', '/about': '/hakkimizda.html', '/contact': '/iletisim.html', '/faq': '/sss.html',
  '/privacy-policy': '/gizlilik-politikasi.html', '/shipping-returns': '/teslimat-ve-iade.html',
  '/distance-sales-agreement': '/mesafeli-satis-sozlesmesi.html', '/pre-contract-information': '/on-bilgilendirme-formu.html',
  '/login': '/giris.html', '/register': '/kayit.html', '/cart': '/sepet.html', '/checkout': '/odeme.html',
  '/account': '/hesabim.html', '/my-info': '/bilgilerim.html', '/track-order': '/siparis-takip.html', '/product': '/urun.html'
};

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
};

function send(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  else if (enAliases[urlPath]) urlPath = enAliases[urlPath];
  const filePath = path.join(root, urlPath);
  if (!filePath.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // clean-URL fallback: /magaza -> magaza.html, mirroring the
      // vercel.json "cleanUrls" behavior used in production
      if (!path.extname(filePath)) { send(res, filePath + '.html'); return; }
      res.writeHead(404); res.end('Not found: ' + urlPath); return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => console.log(`Olympos Leather serving at http://localhost:${port}`));
