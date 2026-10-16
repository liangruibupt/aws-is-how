#!/usr/bin/env node
// Experiment: endpoint rateLimit. Sends requests at a fixed target RPS for a few
// seconds and tallies 200 vs 429 (with lambda-web-error-type).
//
// usage: node scripts/ratelimit.mjs <baseUrl> [rps=300] [seconds=5]
const [base, RPS = '300', S = '5'] = process.argv.slice(2);
if (!base) { console.error('usage: ratelimit.mjs <baseUrl> [rps] [seconds]'); process.exit(1); }
const rps = Number(RPS), secs = Number(S);
const tally = {};
const perSecond = [];
const jobs = [];
for (let s = 0; s < secs; s++) {
  const bucket = {};
  perSecond.push(bucket);
  for (let i = 0; i < rps; i++) {
    jobs.push((async () => {
      await new Promise((r) => setTimeout(r, s * 1000 + (i * 1000) / rps));
      const r = await fetch(`${base.replace(/\/$/, '')}/api/whoami`).catch((e) => ({ status: 0, headers: new Headers(), arrayBuffer: async () => {} }));
      await r.arrayBuffer?.();
      const k = `${r.status}${r.headers.get('lambda-web-error-type') ? ' ' + r.headers.get('lambda-web-error-type') : ''}`;
      tally[k] = (tally[k] || 0) + 1;
      bucket[k] = (bucket[k] || 0) + 1;
    })());
  }
}
await Promise.all(jobs);
console.log(JSON.stringify({ targetRps: rps, seconds: secs, total: tally, perSecond }, null, 2));
