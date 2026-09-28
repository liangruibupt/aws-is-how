import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { serve } from '../lib/serve.mjs';

const get = (port, p, headers = {}) => new Promise((ok, no) => {
  http.get({ host: '127.0.0.1', port, path: p, headers }, res => {
    const b = []; res.on('data', d => b.push(d)); res.on('end', () => ok({ status: res.statusCode, headers: res.headers, body: Buffer.concat(b) }));
  }).on('error', no);
});

test('static server: files, index, mime, 404, traversal, range', async t => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'serve-')), dir = path.join(base, 'root');
  fs.mkdirSync(path.join(dir, 'film'), { recursive: true });
  fs.writeFileSync(path.join(base, 'secret.txt'), 'secret');
  fs.writeFileSync(path.join(dir, 'film/index.html'), '<p>hi</p>');
  fs.writeFileSync(path.join(dir, 'film/a.js'), 'export default 1;');
  fs.writeFileSync(path.join(dir, 'film/v.mp4'), Buffer.from([...Array(100).keys()]));
  const s = await serve(dir, 0);
  t.after(() => s.close());

  const js = await get(s.port, '/film/a.js');
  assert.equal(js.status, 200);
  assert.match(js.headers['content-type'], /^text\/javascript/);
  assert.equal(js.body.toString(), 'export default 1;');

  assert.equal((await get(s.port, '/film')).status, 301);
  const idx = await get(s.port, '/film/?render&sku=rose');
  assert.equal(idx.status, 200);
  assert.match(idx.headers['content-type'], /^text\/html/);

  assert.equal((await get(s.port, '/film/nope.js')).status, 404);
  for (const p of ['/../secret.txt', '/..%2fsecret.txt', '/film/..%2f..%2fsecret.txt']) {
    const r = await get(s.port, p);
    assert.ok([403, 404].includes(r.status), `${p} → ${r.status}`);
    assert.notEqual(r.body.toString(), 'secret');
  }

  const part = await get(s.port, '/film/v.mp4', { Range: 'bytes=10-19' });
  assert.equal(part.status, 206);
  assert.equal(part.headers['content-range'], 'bytes 10-19/100');
  assert.deepEqual([...part.body], [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  const tail = await get(s.port, '/film/v.mp4', { Range: 'bytes=-5' });
  assert.deepEqual([...tail.body], [95, 96, 97, 98, 99]);
  assert.equal((await get(s.port, '/film/v.mp4', { Range: 'bytes=200-' })).status, 416);
});
