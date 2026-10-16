#!/usr/bin/env node
// Smoke test every lab route against a base URL.
// usage: node scripts/smoke.mjs https://<endpoint> [labKey]
import crypto from 'node:crypto';

const base = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '');
const key = process.argv[3] || process.env.LAB_KEY || '';
const j = async (p, o) => {
  const t0 = performance.now();
  const r = await fetch(base + p, o);
  const txt = await r.text();
  let body; try { body = JSON.parse(txt); } catch { body = txt.slice(0, 120); }
  return { status: r.status, env: r.headers.get('x-lab-env'), ms: Math.round(performance.now() - t0), body };
};
const log = (name, v) => console.log(`\n## ${name}\n` + JSON.stringify(v, null, 2));

log('whoami', await j('/api/whoami'));
log('io 300ms', await j('/api/io?ms=300'));
log('cpu worker', await j('/api/cpu?n=100'));
log('cpu main', await j('/api/cpu?n=100&mode=main'));
log('cache x3 concurrent', (await Promise.all([1, 2, 3].map(() => j('/api/cache?key=smoke-' + Date.now())))).map((r) => r.body.source));

// 20 MB request body generated in memory (deliberately > Event Functions' 6 MB cap)
const body = crypto.randomBytes(20 * 1048576);
const up = await j('/api/upload', { method: 'POST', body, headers: { 'content-type': 'application/octet-stream' } });
log('upload 20MB', { ...up, localSha256: crypto.createHash('sha256').update(body).digest('hex'), match: up.body.sha256 === crypto.createHash('sha256').update(body).digest('hex') });

const d0 = performance.now();
const dl = await fetch(base + '/api/download?mb=10');
const bytes = (await dl.arrayBuffer()).byteLength;
log('download 10MB', { status: dl.status, bytes, ms: Math.round(performance.now() - d0) });

const ev = await (await fetch(base + '/api/events?seconds=2')).text();
log('sse events', ev.trim().split('\n\n').length + ' events');

const page = await fetch(base + '/');
log('SSR page', { status: page.status, bytes: (await page.text()).length, cacheControl: page.headers.get('cache-control') });
const asset = await fetch(base + '/assets/app.js');
log('asset', { status: asset.status, cacheControl: asset.headers.get('cache-control') });

const probe = await j('/api/probe');
const { envVars, ...probeShort } = probe.body;
log('probe', probeShort);

const chat = await fetch(base + '/api/chat?q=' + encodeURIComponent('Say hi in five words.'), { headers: key ? { 'x-lab-key': key } : {} });
const chatTxt = await chat.text();
log('chat', { status: chat.status, tail: chatTxt.trim().split('\n').slice(-1)[0] });
