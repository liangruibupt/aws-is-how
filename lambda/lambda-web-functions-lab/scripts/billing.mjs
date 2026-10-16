#!/usr/bin/env node
// Pull the Web Function's own billing-relevant CloudWatch metrics and estimate the bill.
//   EnvironmentCPUTime    -> what vCPU is billed on (active CPU only)
//   EnvironmentActiveTime -> how long environments existed; memory is billed over
//                            this, at the memory each environment consumed
// usage: node scripts/billing.mjs [function=wf-lab] [minutes=60] [region=us-east-1]
import { execFileSync } from 'node:child_process';

const [FN = 'wf-lab', MIN = '60', REGION = 'us-east-1'] = process.argv.slice(2);
const end = new Date(); const start = new Date(end - Number(MIN) * 60_000);
const aws = (...a) => JSON.parse(execFileSync('aws', [...a, '--region', REGION, '--output', 'json'], { encoding: 'utf8' }));
const stat = (ns, metric, statistic, dims) => {
  const r = aws('cloudwatch', 'get-metric-statistics', '--namespace', ns, '--metric-name', metric,
    '--dimensions', ...dims.map((d) => `Name=${d.Name},Value=${d.Value}`),
    '--start-time', start.toISOString(), '--end-time', end.toISOString(),
    '--period', String(Number(MIN) * 60), '--statistics', statistic);
  return r.Datapoints.reduce((s, d) => s + d[statistic], 0) / (statistic === 'Average' ? Math.max(1, r.Datapoints.length) : 1);
};
const fnDim = [{ Name: 'FunctionName', Value: FN }];
const cpuMs = stat('AWS/Lambda/Web', 'EnvironmentCPUTime', 'Sum', fnDim);
const activeMs = stat('AWS/Lambda/Web', 'EnvironmentActiveTime', 'Sum', fnDim);
const memMb = stat('AWS/Lambda/Web', 'EnvironmentMaxMemoryUsage', 'Average', fnDim);
const reqDims = aws('cloudwatch', 'list-metrics', '--namespace', 'AWS/Lambda/Web/Usage', '--metric-name', 'ExecutedRequests')
  .Metrics.map((m) => m.Dimensions).filter((d) => d.some((x) => x.Name === 'FunctionName' && x.Value === FN));
const reqs = reqDims.reduce((s, d) => s + stat('AWS/Lambda/Web/Usage', 'ExecutedRequests', 'Sum', d), 0);

const VCPU_S = 0.0000276944, GB_S = 0.0000036667, PER_M = 0.30;  // us-east-1 Arm list prices, Oct 2026
const cpu$ = (cpuMs / 1000) * VCPU_S;
const mem$ = (activeMs / 1000) * (memMb / 1024) * GB_S;           // approximation: avg consumed MB x lifetime
const req$ = (reqs / 1e6) * PER_M;
console.log(`function             : ${FN} (last ${MIN} min, ${REGION})`);
console.log(`requests             : ${Math.round(reqs).toLocaleString()}`);
console.log(`active CPU           : ${(cpuMs / 1000).toFixed(1)} vCPU-s -> $${cpu$.toFixed(4)}`);
console.log(`environment lifetime : ${(activeMs / 1000).toFixed(0)} s (${(activeMs / 3.6e6).toFixed(2)} env-hours), avg ${memMb.toFixed(0)} MB -> $${mem$.toFixed(4)}`);
console.log(`request charge       : $${req$.toFixed(4)}`);
console.log(`estimated total      : $${(cpu$ + mem$ + req$).toFixed(4)} (excl. free tier and data transfer)`);
console.log(`CPU-active share of environment lifetime: ${((100 * cpuMs) / Math.max(activeMs, 1)).toFixed(2)}%`);
