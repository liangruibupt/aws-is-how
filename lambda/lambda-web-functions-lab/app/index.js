// Lambda Web Functions Lab -- a plain Express 5 server.
// Nothing here is Lambda-specific except reading AWS_LAMBDA_HTTP_ENDPOINT.
// Every route is an experiment that makes one Web Functions property visible.
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import v8 from 'node:v8';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { setTimeout as sleep } from 'node:timers/promises';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { cpuBurn } from './cpu.js';
import { renderPage } from './page.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROCESS_T0 = Date.now() - Math.round(process.uptime() * 1000);

// ---------------------------------------------------------------------------
// Identity of THIS execution environment. Lambda never tells you "which
// environment am I", so we mint one at startup. Because the process lives for
// many requests, every response tagged with the same ENV_ID was served by the
// same long-running server.
// ---------------------------------------------------------------------------
const ENV_ID = crypto.randomBytes(4).toString('hex');
const VERSION = process.env.APP_VERSION || 'v1';
const REGION = process.env.AWS_REGION || 'local';
const LAB_KEY = process.env.LAB_KEY || '';           // guards the Bedrock route
const MODEL_ID = process.env.MODEL_ID || 'global.anthropic.claude-haiku-4-5-20251001-v1:0';

const stats = {
  served: 0,
  inflight: 0,
  peakInflight: 0,
  routes: {},
  bytesIn: 0,
  bytesOut: 0,
};

const loopDelay = monitorEventLoopDelay({ resolution: 10 });
loopDelay.enable();

// Availability Zone via the Lambda metadata endpoint (read once, cached).
let azId = 'unknown';
async function loadAz() {
  const api = process.env.AWS_LAMBDA_METADATA_API;
  const token = process.env.AWS_LAMBDA_METADATA_TOKEN;
  if (!api || !token) return;
  try {
    const r = await fetch(`http://${api}/2026-01-15/metadata/execution-environment`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(1000),
    });
    if (r.ok) azId = (await r.json()).AvailabilityZoneID || azId;
  } catch { /* local run or metadata unavailable */ }
}

// ---------------------------------------------------------------------------
// worker_threads pool: one worker per vCPU.
// ---------------------------------------------------------------------------
const POOL_SIZE = Math.max(1, os.availableParallelism());
const pool = [];
const pending = new Map();
let nextJob = 0;
function startPool() {
  for (let i = 0; i < POOL_SIZE; i++) {
    const w = new Worker(path.join(__dirname, 'worker.js'));
    w.on('message', ({ id, result, ms }) => {
      const p = pending.get(id);
      if (p) { pending.delete(id); p.resolve({ result, ms }); }
    });
    w.unref();
    pool.push(w);
  }
}
function runOnPool(n) {
  const id = nextJob++;
  return new Promise((resolve) => {
    pending.set(id, { resolve });
    pool[id % pool.length].postMessage({ id, n });
  });
}

// ---------------------------------------------------------------------------
// In-process cache with single-flight. Event Functions see 1 request per
// environment, so N concurrent misses = N upstream calls. A Web Function
// environment sees them all at once and can coalesce them into ONE call.
// ---------------------------------------------------------------------------
const cache = new Map();          // key -> { value, at }
const inflightLoads = new Map();  // key -> Promise
let upstreamCalls = 0;
async function slowUpstream(key) {
  upstreamCalls++;
  await sleep(800);               // pretend this is a DB / 3rd-party API
  return { key, value: crypto.createHash('sha256').update(key).digest('hex').slice(0, 16), loadedBy: ENV_ID };
}
async function cachedGet(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 60_000) return { ...hit.value, source: 'hit' };
  if (inflightLoads.has(key)) return { ...(await inflightLoads.get(key)), source: 'coalesced' };
  const p = slowUpstream(key).finally(() => inflightLoads.delete(key));
  inflightLoads.set(key, p);
  const value = await p;
  if (cache.size > 1000) cache.delete(cache.keys().next().value);  // bound growth
  cache.set(key, { value, at: Date.now() });
  return { ...value, source: 'miss' };
}

function snapshot() {
  const mem = process.memoryUsage();
  return {
    envId: ENV_ID,
    version: VERSION,
    region: REGION,
    azId,
    pid: process.pid,
    envAgeSec: Math.round((Date.now() - PROCESS_T0) / 1000),
    served: stats.served,
    inflight: stats.inflight,
    peakInflight: stats.peakInflight,
    rssMB: Math.round(mem.rss / 1048576),
    heapUsedMB: Math.round(mem.heapUsed / 1048576),
    eventLoopP99ms: Math.round(loopDelay.percentile(99) / 1e6),
    cpuUserMs: Math.round(process.cpuUsage().user / 1000),
    cacheEntries: cache.size,
    upstreamCalls,
  };
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = express();
app.disable('x-powered-by');

// Per-environment, per-client limiter for the routes that touch the file system
// (/tmp writes, /proc reads). It complements -- does not replace -- the
// endpoint-level `rateLimit`, which Lambda enforces across all environments.
// Client = last X-Forwarded-For hop (Lambda appends the connecting IP; behind
// CloudFront that is the edge IP, so this degrades to per-edge limiting).
const clientKey = (req) => (req.get('x-forwarded-for') || req.socket.remoteAddress || 'unknown').split(',').pop().trim();
const fsLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: clientKey,
  validate: { xForwardedForHeader: false, ip: false },
});

// Per-request accounting + identity headers on every response.
app.use((req, res, next) => {
  stats.served++;
  stats.inflight++;
  stats.peakInflight = Math.max(stats.peakInflight, stats.inflight);
  const route = req.path.startsWith('/assets') ? '/assets' : req.path;
  stats.routes[route] = (stats.routes[route] || 0) + 1;
  res.setHeader('x-lab-env', ENV_ID);
  res.setHeader('x-lab-version', VERSION);
  res.setHeader('x-lab-region', REGION);
  res.setHeader('x-lab-inflight-at-arrival', String(stats.inflight));
  let done = false;
  const finish = () => { if (!done) { done = true; stats.inflight--; } };
  res.on('finish', finish);
  res.on('close', finish);
  next();
});

// Static assets: long-lived, immutable -> CloudFront caches them at the edge.
app.use('/assets', express.static(path.join(__dirname, 'public'), {
  immutable: true,
  maxAge: '365d',
}));

// Server-side rendered dashboard (dynamic, never cached).
app.get('/', (req, res) => {
  res.setHeader('cache-control', 'no-store');
  res.type('html').send(renderPage({ snap: snapshot(), modelId: MODEL_ID, needsKey: !!LAB_KEY }));
});

app.get('/api/whoami', (req, res) => {
  res.setHeader('cache-control', 'no-store');
  res.json({ ...snapshot(), requestId: req.get('lambda-web-request-id') || null });
});

// 1) I/O-bound request: almost zero CPU, lots of wall-clock.
//    Shows multi-concurrency packing and active-CPU billing.
app.get('/api/io', async (req, res) => {
  const ms = Math.min(Number(req.query.ms) || 1000, 60_000);
  const inflightAtStart = stats.inflight;
  const cpu0 = process.cpuUsage();
  await sleep(ms);
  const cpu = process.cpuUsage(cpu0);
  res.setHeader('cache-control', 'no-store');
  res.json({
    envId: ENV_ID, waitedMs: ms, inflightAtStart,
    peakInflight: stats.peakInflight,
    processCpuMsDuringWait: Math.round((cpu.user + cpu.system) / 1000),
  });
});

// 2) CPU-bound request, either on the main thread (blocks the event loop for
//    every concurrent request) or on the worker pool (uses both vCPUs).
app.get('/api/cpu', async (req, res) => {
  const n = Math.min(Number(req.query.n) || 200, 5000);
  const mode = req.query.mode === 'main' ? 'main' : 'worker';
  const t0 = performance.now();
  let result;
  if (mode === 'main') result = cpuBurn(n);
  else result = (await runOnPool(n)).result;
  res.setHeader('cache-control', 'no-store');
  res.json({ envId: ENV_ID, mode, n, ms: Math.round(performance.now() - t0), poolSize: POOL_SIZE, result });
});

// 2b) Deterministic in-environment benchmark: run `jobs` CPU jobs inside ONE
//     environment and measure (a) wall time and (b) the worst stall a 10 ms
//     ticker saw -- i.e. how long every other concurrent request would freeze.
app.get('/api/cpubench', async (req, res) => {
  const jobs = Math.min(Number(req.query.jobs) || 4, 16);
  const n = Math.min(Number(req.query.n) || 1000, 5000);
  const out = {};
  for (const mode of ['main', 'worker']) {
    let last = performance.now(); let worstStall = 0;
    const ticker = setInterval(() => {
      const now = performance.now(); worstStall = Math.max(worstStall, now - last - 10); last = now;
    }, 10);
    await sleep(30);
    const t0 = performance.now();
    if (mode === 'main') {
      for (let i = 0; i < jobs; i++) { cpuBurn(n); await sleep(0); }
    } else {
      await Promise.all(Array.from({ length: jobs }, () => runOnPool(n)));
    }
    const wall = performance.now() - t0;
    await sleep(30);
    clearInterval(ticker);
    out[mode] = { wallMs: Math.round(wall), worstEventLoopStallMs: Math.round(worstStall) };
  }
  res.setHeader('cache-control', 'no-store');
  res.json({ envId: ENV_ID, jobs, n, vcpus: os.availableParallelism(), poolSize: POOL_SIZE, ...out,
    speedup: +(out.main.wallMs / Math.max(1, out.worker.wallMs)).toFixed(2) });
});

// 3) Shared in-process cache with request coalescing.
app.get('/api/cache', async (req, res) => {
  const key = String(req.query.key || 'product-42').slice(0, 64);
  const t0 = performance.now();
  const v = await cachedGet(key);
  res.setHeader('cache-control', 'no-store');
  res.json({ envId: ENV_ID, ...v, ms: Math.round(performance.now() - t0), upstreamCalls });
});

// 4) Streaming request body -> /tmp, hashed on the fly. No 6 MB payload cap:
//    the body is streamed to the app as it arrives.
app.post('/api/upload', fsLimiter, async (req, res) => {
  const file = path.join(os.tmpdir(), `upload-${crypto.randomUUID()}`);
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  const t0 = performance.now();
  try {
    await pipeline(
      req,
      async function* (src) {
        for await (const chunk of src) {
          bytes += chunk.length;
          if (bytes > 400 * 1048576) throw new Error('limit: 400 MB for this demo (/tmp is 512 MB)');
          hash.update(chunk);
          yield chunk;
        }
      },
      fs.createWriteStream(file),
    );
    stats.bytesIn += bytes;
    const st = await fsp.statfs(os.tmpdir());
    res.json({
      envId: ENV_ID, bytes, mb: +(bytes / 1048576).toFixed(1), sha256: hash.digest('hex'),
      seconds: +((performance.now() - t0) / 1000).toFixed(2),
      tmpFreeMB: Math.round((st.bavail * st.bsize) / 1048576),
    });
  } catch (e) {
    res.status(413).json({ error: String(e.message || e) });
  } finally {
    await fsp.rm(file, { force: true });   // /tmp is shared by all concurrent requests
  }
});

// 5) Streaming a large response (Event Functions: 6 MB buffered, 200 MB streamed).
app.get('/api/download', async (req, res) => {
  const mb = Math.min(Number(req.query.mb) || 20, 1024);
  const chunk = crypto.randomBytes(1048576);
  res.setHeader('content-type', 'application/octet-stream');
  res.setHeader('content-length', String(mb * 1048576));
  res.setHeader('cache-control', 'no-store');
  let i = 0;
  const src = new Readable({
    read() { if (i++ < mb) this.push(chunk); else this.push(null); },
  });
  stats.bytesOut += mb * 1048576;
  await pipeline(src, res).catch(() => {});
});

// 6) Server-sent events: a long-lived stream of this environment's live stats.
app.get('/api/events', async (req, res) => {
  const seconds = Math.min(Number(req.query.seconds) || 30, 600);
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' });
  let closed = false;
  req.on('close', () => { closed = true; });
  for (let i = 0; i < seconds && !closed; i++) {
    res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
    await sleep(1000);
  }
  res.end();
});

// 7) LLM token streaming from Amazon Bedrock via SSE. The request stays open
//    for seconds while using only milliseconds of CPU -> the case active-CPU
//    billing was designed for. Guarded by LAB_KEY because it costs money.
let bedrock;
app.get('/api/chat', async (req, res) => {
  if (LAB_KEY && req.get('x-lab-key') !== LAB_KEY && req.query.k !== LAB_KEY) {
    return res.status(401).json({ error: 'missing or wrong lab key' });
  }
  const q = String(req.query.q || 'Explain Lambda Web Functions in 3 bullet points.').slice(0, 500);
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' });
  const ac = new AbortController();
  req.on('close', () => ac.abort());                 // stop upstream work on disconnect
  const t0 = performance.now();
  const cpu0 = process.cpuUsage();
  let ttft = null; let chars = 0;
  try {
    if (!bedrock) {
      const { BedrockRuntimeClient } = await import('@aws-sdk/client-bedrock-runtime');
      bedrock = new BedrockRuntimeClient({});        // lazy init keeps cold start small
    }
    const { ConverseStreamCommand } = await import('@aws-sdk/client-bedrock-runtime');
    const out = await bedrock.send(new ConverseStreamCommand({
      modelId: MODEL_ID,
      messages: [{ role: 'user', content: [{ text: q }] }],
      inferenceConfig: { maxTokens: 600 },
    }), { abortSignal: ac.signal });
    for await (const ev of out.stream) {
      const t = ev.contentBlockDelta?.delta?.text;
      if (t) {
        ttft ??= performance.now() - t0;
        chars += t.length;
        res.write(`event: token\ndata: ${JSON.stringify(t)}\n\n`);
      }
    }
    const cpu = process.cpuUsage(cpu0);
    res.write(`event: done\ndata: ${JSON.stringify({
      envId: ENV_ID, region: REGION, model: MODEL_ID, chars,
      ttftMs: Math.round(ttft ?? 0), wallMs: Math.round(performance.now() - t0),
      processCpuMs: Math.round((cpu.user + cpu.system) / 1000),
    })}\n\n`);
  } catch (e) {
    if (!ac.signal.aborted) res.write(`event: error\ndata: ${JSON.stringify(String(e.message || e))}\n\n`);
  }
  res.end();
});

// 8) Probe: empirically verify what the docs say about the sandbox.
const SAFE_ENV = /^(AWS_REGION|AWS_LAMBDA_HTTP_ENDPOINT|AWS_LAMBDA_FUNCTION_\w+|AWS_LAMBDA_LOG_\w+|AWS_LAMBDA_NODEJS_ENTRYPOINT|AWS_EXECUTION_ENV|NODE_OPTIONS|NODE_PATH|TZ|LANG|PATH|APP_VERSION|MODEL_ID|LAMBDA_TASK_ROOT|LAMBDA_RUNTIME_DIR)$/;
function readMaybe(p) { try { return fs.readFileSync(p, 'utf8').trim(); } catch { return null; } }
function canWrite(dir) {
  const f = path.join(dir, `.probe-${ENV_ID}`);
  try { fs.writeFileSync(f, 'x'); fs.rmSync(f); return true; } catch { return false; }
}
app.get('/api/probe', fsLimiter, async (req, res) => {
  const tmp = await fsp.statfs(os.tmpdir()).catch(() => null);
  const limits = (readMaybe('/proc/self/limits') || '').split('\n')
    .filter((l) => /open files|processes|address space/i.test(l)).map((l) => l.replace(/\s{2,}/g, ' | '));
  const env = {};
  for (const k of Object.keys(process.env).sort()) {
    env[k] = SAFE_ENV.test(k) ? process.env[k] : '<redacted>';
  }
  const heap = v8.getHeapStatistics();
  res.setHeader('cache-control', 'no-store');
  res.json({
    envId: ENV_ID,
    node: process.version,
    arch: process.arch,
    kernel: os.release(),
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model,
    availableParallelism: os.availableParallelism(),
    totalMemMB: Math.round(os.totalmem() / 1048576),
    freeMemMB: Math.round(os.freemem() / 1048576),
    cgroupMemoryMax: readMaybe('/sys/fs/cgroup/memory.max'),
    cgroupCpuMax: readMaybe('/sys/fs/cgroup/cpu.max'),
    v8HeapLimitMB: Math.round(heap.heap_size_limit / 1048576),
    tmp: tmp && {
      dir: os.tmpdir(),
      sizeMB: Math.round((tmp.blocks * tmp.bsize) / 1048576),
      freeMB: Math.round((tmp.bavail * tmp.bsize) / 1048576),
    },
    writable: { tmp: canWrite(os.tmpdir()), cwd: canWrite(process.cwd()), root: canWrite('/') },
    cwd: process.cwd(),
    uid: process.getuid?.(),
    limits,
    uptimeSec: Math.round(process.uptime()),
    envVars: env,
  });
});

// ---------------------------------------------------------------------------
// Start: listen FIRST (Lambda gives us 10 s), then do optional init.
// ---------------------------------------------------------------------------
const [host, port] = (process.env.AWS_LAMBDA_HTTP_ENDPOINT || '127.0.0.1:3000').split(':');
const server = app.listen(Number(port), host, () => {
  const initMs = Date.now() - PROCESS_T0;
  console.log(JSON.stringify({ msg: 'listening', envId: ENV_ID, host, port, version: VERSION, region: REGION, initMs }));
  startPool();
  loadAz();
});
// Long SSE / upload requests: don't let Node's own timeouts cut them short.
server.requestTimeout = 0;
server.headersTimeout = 60_000;
server.keepAliveTimeout = 65_000;

// Scale-down: Lambda sends SIGTERM and gives us ~1 s.
process.on('SIGTERM', () => {
  console.log(JSON.stringify({ msg: 'SIGTERM', ...snapshot(), routes: stats.routes, bytesIn: stats.bytesIn, bytesOut: stats.bytesOut }));
  process.exit(0);
});
