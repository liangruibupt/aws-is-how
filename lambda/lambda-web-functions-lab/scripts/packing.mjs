#!/usr/bin/env node
// Experiment 1: concurrency packing + scale-from-zero.
// Fires C concurrent I/O-bound requests (each waits MS on "I/O"), for R rounds,
// and reports how many distinct execution environments served them.
//
// usage: node scripts/packing.mjs <baseUrl> [concurrency=200] [ms=2000] [rounds=3]
const [base, C = '200', MS = '2000', R = '3'] = process.argv.slice(2);
if (!base) { console.error('usage: packing.mjs <baseUrl> [concurrency] [ms] [rounds]'); process.exit(1); }
const conc = Number(C), ms = Number(MS), rounds = Number(R);

async function one() {
  const t0 = performance.now();
  try {
    const r = await fetch(`${base.replace(/\/$/, '')}/api/io?ms=${ms}`);
    const b = await r.json().catch(() => ({}));
    return { status: r.status, env: r.headers.get('x-lab-env'), err: r.headers.get('lambda-web-error-type'),
      inflight: b.inflightAtStart, ms: performance.now() - t0 };
  } catch (e) { return { status: 0, err: e.cause?.code || e.message, ms: performance.now() - t0 }; }
}
const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(p * a.length))];

for (let round = 1; round <= rounds; round++) {
  const t0 = performance.now();
  const res = await Promise.all(Array.from({ length: conc }, one));
  const wall = performance.now() - t0;
  const envs = {};
  const statuses = {};
  for (const r of res) {
    statuses[r.status + (r.err ? ` ${r.err}` : '')] = (statuses[r.status + (r.err ? ` ${r.err}` : '')] || 0) + 1;
    if (r.env) envs[r.env] = (envs[r.env] || 0) + 1;
  }
  const lat = res.filter((r) => r.status === 200).map((r) => Math.round(r.ms - ms)).sort((a, b) => a - b);
  const maxInflight = Math.max(0, ...res.map((r) => r.inflight || 0));
  console.log(JSON.stringify({
    round, concurrency: conc, waitMs: ms, wallMs: Math.round(wall), statuses,
    distinctEnvironments: Object.keys(envs).length,
    requestsPerEnvironment: Object.values(envs).sort((a, b) => b - a),
    maxInflightSeenInOneEnv: maxInflight,
    overheadMs: { p50: pct(lat, 0.5), p90: pct(lat, 0.9), p99: pct(lat, 0.99), max: lat.at(-1) },
    eventFunctionsWouldNeed: `${conc} environments (1 request each)`,
  }));
  await new Promise((r) => setTimeout(r, 1500));
}
