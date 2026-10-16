// Browser side of the lab. Uses relative URLs so it works on the Lambda
// domain, behind CloudFront, or on localhost.
const $ = (id) => document.getElementById(id);
const show = (id, v) => { $(id).textContent = typeof v === 'string' ? v : JSON.stringify(v, null, 2); };

function summarize(results) {
  const envs = {};
  for (const r of results) envs[r.env] = (envs[r.env] || 0) + 1;
  const lat = results.map((r) => r.ms).sort((a, b) => a - b);
  const pct = (p) => lat[Math.min(lat.length - 1, Math.floor(p * lat.length))];
  return { requests: results.length, distinctEnvironments: Object.keys(envs).length, perEnvironment: envs,
    latencyMs: { p50: pct(0.5), p90: pct(0.9), max: lat.at(-1) } };
}
async function timed(url, opts) {
  const t0 = performance.now();
  const r = await fetch(url, opts);
  const body = await r.json().catch(() => ({}));
  return { status: r.status, env: r.headers.get('x-lab-env'), ms: Math.round(performance.now() - t0), body };
}

$('btn-live').onclick = () => {
  const es = new EventSource('/api/events?seconds=30');
  es.onmessage = (e) => show('out-live', JSON.parse(e.data));
  es.onerror = () => es.close();
};

$('btn-pack').onclick = async () => {
  const n = Math.min(Number($('pack-n').value) || 100, 500);
  show('out-pack', `firing ${n} concurrent requests (browsers cap ~6 connections per host on HTTP/1.1;\nrun scripts/packing.mjs for a real burst)...`);
  const res = await Promise.all(Array.from({ length: n }, () => timed('/api/io?ms=2000')));
  show('out-pack', summarize(res));
};

$('btn-cache').onclick = async () => {
  const key = 'k-' + Math.random().toString(36).slice(2, 8);
  const res = await Promise.all(Array.from({ length: 50 }, () => timed(`/api/cache?key=${key}`)));
  const sources = {};
  for (const r of res) sources[r.body.source] = (sources[r.body.source] || 0) + 1;
  show('out-cache', { key, sources, ...summarize(res) });
};

$('btn-cpu').onclick = async () => {
  show('out-cpu', 'running 4 CPU jobs on the main thread, then on the worker pool, inside one environment...');
  show('out-cpu', (await timed('/api/cpubench?jobs=4&n=1500')).body);
};

$('btn-chat').onclick = () => {
  const q = encodeURIComponent($('chat-q').value);
  const k = $('chat-key') ? `&k=${encodeURIComponent($('chat-key').value)}` : '';
  show('out-chat', '');
  const es = new EventSource(`/api/chat?q=${q}${k}`);
  es.addEventListener('token', (e) => { $('out-chat').textContent += JSON.parse(e.data); });
  es.addEventListener('done', (e) => { $('out-chat').textContent += '\n\n' + JSON.stringify(JSON.parse(e.data), null, 2); es.close(); });
  es.addEventListener('error', (e) => { if (e.data) $('out-chat').textContent += '\nERROR ' + e.data; es.close(); });
};

$('btn-up').onclick = async () => {
  const mb = Math.min(Number($('big-mb').value) || 50, 400);
  show('out-big', `uploading ${mb} MB...`);
  const buf = new Uint8Array(mb * 1048576);
  for (let i = 0; i < buf.length; i += 65536) crypto.getRandomValues(buf.subarray(i, i + 65536));
  const r = await timed('/api/upload', { method: 'POST', body: buf });
  show('out-big', { status: r.status, clientMs: r.ms, ...r.body });
};

$('btn-down').onclick = async () => {
  const mb = Math.min(Number($('big-mb').value) || 50, 400);
  const t0 = performance.now();
  const r = await fetch(`/api/download?mb=${mb}`);
  const reader = r.body.getReader();
  let bytes = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; }
  const s = (performance.now() - t0) / 1000;
  show('out-big', { status: r.status, env: r.headers.get('x-lab-env'), mb: +(bytes / 1048576).toFixed(1), seconds: +s.toFixed(2), MBps: +((bytes / 1048576) / s).toFixed(1) });
};

$('btn-probe').onclick = async () => show('out-probe', (await timed('/api/probe')).body);
