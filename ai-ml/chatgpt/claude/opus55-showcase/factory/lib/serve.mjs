// serve.mjs — 静态文件服务，根目录为 opus55-showcase/（这样 ../factory/ 的导入能解析）；支持 Range，画廊里的视频可以拖动
// 命令行：node factory/lib/serve.mjs [端口]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain } from './args.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.woff2': 'font/woff2',
};
const stat = p => { try { return fs.statSync(p); } catch { return null; } };

export function serve(root = ROOT, port = 0) {
  root = path.resolve(root);
  const srv = http.createServer((req, res) => {
    let rel;
    try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
    let p = path.join(root, rel), st = stat(p);
    if (p !== root && !p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (st?.isDirectory()) {
      if (!rel.endsWith('/')) { res.writeHead(301, { Location: `${rel}/` }).end(); return; }
      p = path.join(p, 'index.html'); st = stat(p);
    }
    if (!st?.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found'); return; }
    const head = { 'Content-Type': MIME[path.extname(p).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
    if (m && (m[1] || m[2])) {
      const a = m[1] ? +m[1] : Math.max(0, st.size - +m[2]), b = m[1] && m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
      if (a > b || a >= st.size) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }).end(); return; }
      res.writeHead(206, { ...head, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1 });
      if (req.method === 'HEAD') res.end(); else fs.createReadStream(p, { start: a, end: b }).pipe(res);
      return;
    }
    res.writeHead(200, { ...head, 'Content-Length': st.size });
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(p).pipe(res);
  });
  return new Promise((ok, no) => {
    srv.once('error', no);
    srv.listen(port, '127.0.0.1', () => {
      const { port: pt } = srv.address();
      ok({ port: pt, url: `http://127.0.0.1:${pt}`, close: () => new Promise(r => { srv.closeAllConnections?.(); srv.close(r); }) });
    });
  });
}

if (isMain(import.meta.url)) {
  const s = await serve(ROOT, +(process.argv[2] ?? 8765));
  console.log(`serving ${ROOT}\n  ${s.url}/`);
}
