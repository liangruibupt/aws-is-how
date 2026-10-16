// CPU-bound work executed off the main event loop.
// A Web Function environment has 2 vCPUs, but Node.js runs JS on ONE thread:
// without worker_threads the second vCPU is idle and a CPU-heavy request
// blocks every other in-flight request in the same environment.
import { parentPort } from 'node:worker_threads';
import { cpuBurn } from './cpu.js';

parentPort.on('message', ({ id, n }) => {
  const t0 = performance.now();
  const result = cpuBurn(n);
  parentPort.postMessage({ id, result, ms: performance.now() - t0 });
});
