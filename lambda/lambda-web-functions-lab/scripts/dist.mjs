#!/usr/bin/env node
// Count which revision (x-lab-version) / Region (x-lab-region) / environment
// served N requests. Used for canary (90/10) and multi-region experiments.
//
// usage: node scripts/dist.mjs <baseUrl> [requests=200] [parallel=20]
const [base, N = '200', P = '20'] = process.argv.slice(2);
if (!base) { console.error('usage: dist.mjs <baseUrl> [requests] [parallel]'); process.exit(1); }
const count = { version: {}, region: {}, status: {} };
const envs = new Set();
let left = Number(N);
const lat = [];
async function worker() {
  while (left-- > 0) {
    const t0 = performance.now();
    const r = await fetch(`${base.replace(/\/$/, '')}/api/whoami`).catch(() => null);
    lat.push(performance.now() - t0);
    const s = r ? r.status : 0;
    count.status[s] = (count.status[s] || 0) + 1;
    if (!r) continue;
    await r.arrayBuffer();
    const v = r.headers.get('x-lab-version'); const g = r.headers.get('x-lab-region');
    count.version[v] = (count.version[v] || 0) + 1;
    count.region[g] = (count.region[g] || 0) + 1;
    envs.add(r.headers.get('x-lab-env'));
  }
}
await Promise.all(Array.from({ length: Number(P) }, worker));
lat.sort((a, b) => a - b);
console.log(JSON.stringify({ requests: Number(N), ...count, distinctEnvironments: envs.size,
  latencyMs: { p50: Math.round(lat[Math.floor(lat.length / 2)]), p90: Math.round(lat[Math.floor(lat.length * 0.9)]) } }, null, 2));
