#!/usr/bin/env node
// Experiment 1b: sustained, RAMPED load (closed-loop clients).
// A cold burst hits Lambda's *dynamic* per-environment concurrency limit,
// which starts low and adapts to observed resource usage. This script ramps
// virtual users step by step and shows how far the limit climbs per env.
//
// usage: node scripts/ramp.mjs <baseUrl> [steps=10,25,50,100,200] [secondsPerStep=20] [ioMs=1000]
const [base, STEPS = '10,25,50,100,200', SPS = '20', IO = '1000'] = process.argv.slice(2);
if (!base) { console.error('usage: ramp.mjs <baseUrl> [steps] [secondsPerStep] [ioMs]'); process.exit(1); }
const url = `${base.replace(/\/$/, '')}/api/io?ms=${IO}`;
const steps = STEPS.split(',').map(Number);

let step = null;
let users = 0;
async function user(id) {
  while (id < users) {
    const t0 = performance.now();
    let k, env = null, inflight = 0;
    try {
      const r = await fetch(url);
      const b = await r.json().catch(() => ({}));
      k = `${r.status}${r.headers.get('lambda-web-error-type') ? ' ' + r.headers.get('lambda-web-error-type') : ''}`;
      env = r.headers.get('x-lab-env'); inflight = b.inflightAtStart || 0;
    } catch (e) { k = `ERR ${e.cause?.code || e.message}`; }
    const s = step;
    s.tally[k] = (s.tally[k] || 0) + 1;
    if (env) { s.envs.add(env); s.maxInflight = Math.max(s.maxInflight, inflight); s.inflightSum += inflight; s.ok++; s.lat.push(performance.now() - t0 - Number(IO)); }
    if (k.startsWith('429')) await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));  // backoff + jitter
  }
}
for (const vu of steps) {
  step = { tally: {}, envs: new Set(), maxInflight: 0, inflightSum: 0, ok: 0, lat: [] };
  const prev = users; users = vu;
  for (let i = prev; i < vu; i++) user(i);
  await new Promise((r) => setTimeout(r, Number(SPS) * 1000));
  const lat = step.lat.sort((a, b) => a - b);
  console.log(JSON.stringify({
    virtualUsers: vu, tally: step.tally, distinctEnvironments: step.envs.size,
    maxConcurrentInOneEnv: step.maxInflight,
    avgConcurrentPerEnvAtArrival: +(step.inflightSum / Math.max(1, step.ok)).toFixed(1),
    overheadMsP50: Math.round(lat[Math.floor(lat.length / 2)] ?? 0), overheadMsP99: Math.round(lat[Math.floor(lat.length * 0.99)] ?? 0),
  }));
}
users = 0;
await new Promise((r) => setTimeout(r, Number(IO) + 2000));
process.exit(0);
