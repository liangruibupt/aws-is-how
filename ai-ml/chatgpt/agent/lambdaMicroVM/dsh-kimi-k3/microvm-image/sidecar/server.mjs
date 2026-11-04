// Root sidecar for DeepSeek Harness (dsh) on AWS Lambda MicroVMs.
//
// One process, four jobs:
//   :9000  lifecycle hooks  POST /aws/lambda-microvms/runtime/v1/{ready,validate,run,resume,suspend,terminate}
//   :8080  ingress gateway  everything the MicroVM HTTPS endpoint forwards (default port 8080):
//            /__sidecar/*  task runner (dsh headless), file download, health, launch redirect
//            everything else -> dsh Web UI on 127.0.0.1:3080 (HTTP + WebSocket), Host/Origin rewritten
//   127.0.0.1:8787  Bedrock proxy  /openai/v1/{chat/completions,responses}, SigV4-signed with the
//            MicroVM execution role (IMDSv2) and forwarded to bedrock-runtime; model allowlist enforced
//   supervisor      runs `dsh --profile web` as the unprivileged agent user and restarts it
//
// The agent (dsh and every tool it runs) is uid 1000 with no capabilities and no_new_privs,
// has no AWS credentials in its environment, and is policy-routed away from IMDS, so the
// only AWS capability it has is "call the allowlisted Bedrock models through this proxy".

import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

const execFileP = promisify(execFile);

// ---------------------------------------------------------------- config
const env = process.env;
const REGION = env.BEDROCK_REGION || env.AWS_REGION || env.AWS_DEFAULT_REGION || 'us-east-1';
const ALLOWED_MODELS = new Set((env.ALLOWED_MODELS || 'us.moonshotai.kimi-k3,global.moonshotai.kimi-k3')
  .split(',').map((s) => s.trim()).filter(Boolean));
const HOOK_PORT = Number(env.HOOK_PORT || 9000);
const GATEWAY_PORT = Number(env.GATEWAY_PORT || 8080);
const PROXY_PORT = Number(env.BEDROCK_PROXY_PORT || 8787);
const DSH_WEB_PORT = Number(env.DSH_WEB_PORT || 3080);
const AGENT_UID = Number(env.AGENT_UID || 1000);
const AGENT_HOME = env.AGENT_HOME || '/home/agent';
const WORKSPACE = env.WORKSPACE || '/workspace';
const DSH_HOME = env.DSH_HOME || path.join(AGENT_HOME, '.dsh');
const DSH_PATCH = env.DSH_PATCH || '/opt/dsh/bedrock-kimi.patch.yml';
const DSH_BIN = env.DSH_BIN || 'dsh';
const MAX_TASKS = Number(env.MAX_CONCURRENT_TASKS || 2);
const TASK_PERMISSION_MODE = env.TASK_PERMISSION_MODE || 'workspace-write';
const ROTATE_ON_RUN = (env.DSH_WEB_ROTATE_ON_RUN || 'true') === 'true';
const IS_ROOT = process.getuid?.() === 0;
const HOOK_PREFIX = '/aws/lambda-microvms/runtime/v1';
const DSH_AUTHORITY = `127.0.0.1:${DSH_WEB_PORT}`;

const log = (component, msg, extra) =>
  console.log(`[${new Date().toISOString()}] [${component}] ${msg}${extra ? ' ' + JSON.stringify(extra) : ''}`);

// ---------------------------------------------------------------- helpers
async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw Object.assign(new Error('request body too large'), { status: 413 });
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

function openAiError(res, status, message, type = 'invalid_request_error') {
  sendJson(res, status, { error: { message, type } });
}

// Environment for everything that runs as the agent: no AWS_* variables, ever.
function agentEnv(extra = {}) {
  return {
    PATH: '/usr/local/bin:/usr/bin:/bin',
    HOME: AGENT_HOME,
    USER: 'agent',
    LANG: 'C.UTF-8',
    DSH_HOME,
    BEDROCK_PROXY_API_KEY: 'sigv4-proxy',
    ...extra,
  };
}

// Run a command as the agent: uid/gid 1000, empty capability sets, no_new_privs.
function spawnAsAgent(argv, opts = {}) {
  const full = IS_ROOT
    ? ['setpriv', `--reuid=${AGENT_UID}`, `--regid=${AGENT_UID}`, '--clear-groups',
       '--bounding-set=-all', '--inh-caps=-all', '--no-new-privs', ...argv]
    : argv;
  return spawn(full[0], full.slice(1), { env: agentEnv(opts.env), cwd: opts.cwd || WORKSPACE, stdio: opts.stdio || 'pipe' });
}

// ---------------------------------------------------------------- IMDS fence for the agent uid
// The guest kernel has no xt_owner/nft inet, but policy routing by uid works:
// uid 1000's sockets look up table 100 first, which only holds `prohibit` routes.
const fence = { applied: false, verified: false, detail: 'not attempted' };
async function applyImdsFence() {
  if (!IS_ROOT) { fence.detail = 'sidecar not root; fence skipped'; return; }
  const table = '100';
  const sh = async (args) => execFileP('ip', args).catch((e) => ({ error: e }));
  try {
    const rules = (await execFileP('ip', ['rule', 'show'])).stdout;
    if (!rules.includes(`uidrange ${AGENT_UID}-${AGENT_UID} lookup ${table}`)) {
      await execFileP('ip', ['rule', 'add', 'uidrange', `${AGENT_UID}-${AGENT_UID}`, 'lookup', table, 'priority', '100']);
    }
    for (const dst of ['169.254.169.254/32', '169.254.170.2/32', '169.254.170.23/32']) {
      await execFileP('ip', ['route', 'replace', 'prohibit', dst, 'table', table]);
    }
    // IPv6 IMDS; ignore failure if the guest has no IPv6.
    await sh(['-6', 'rule', 'add', 'uidrange', `${AGENT_UID}-${AGENT_UID}`, 'lookup', table, 'priority', '100']);
    await sh(['-6', 'route', 'replace', 'prohibit', 'fd00:ec2::254/128', 'table', table]);
    fence.applied = true;
  } catch (e) {
    fence.applied = false;
    fence.detail = `ip rule/route failed (needs CAP_NET_ADMIN): ${e.stderr || e.message}`;
    log('fence', 'WARNING ' + fence.detail);
    return;
  }
  // Prove it from the agent's side: connecting to IMDS must fail.
  const probe = spawnAsAgent(['curl', '-s', '-m', '2', '-o', '/dev/null', '-w', '%{http_code}',
    '-X', 'PUT', 'http://169.254.169.254/latest/api/token', '-H', 'X-aws-ec2-metadata-token-ttl-seconds: 10']);
  let out = '';
  probe.stdout.on('data', (d) => { out += d; });
  const code = await new Promise((r) => probe.on('close', r));
  fence.verified = code !== 0 && !/^2\d\d$/.test(out.trim());
  fence.detail = `agent IMDS probe: curl exit=${code} http=${out.trim() || '-'}`;
  log('fence', fence.verified ? 'IMDS unreachable for agent uid (good)' : 'WARNING agent can reach IMDS', { detail: fence.detail });
}

// ---------------------------------------------------------------- Bedrock SigV4 proxy
let credentialProvider = fromNodeProviderChain();
function invalidateCredentials(reason) {
  credentialProvider = fromNodeProviderChain();
  log('bedrock', `credential cache reset (${reason})`);
}

const bedrockHost = `bedrock-runtime.${REGION}.amazonaws.com`;
const PROXY_PATHS = new Set(['/openai/v1/chat/completions', '/openai/v1/responses']);
const stats = { requests: 0, errors: 0, byModel: {} };

async function signedForward(pathname, body, accept) {
  const credentials = await credentialProvider();
  const signer = new SignatureV4({ service: 'bedrock', region: REGION, credentials, sha256: Sha256 });
  const signed = await signer.sign({
    method: 'POST', protocol: 'https:', hostname: bedrockHost, path: pathname,
    headers: { host: bedrockHost, 'content-type': 'application/json', accept: accept || 'application/json' },
    body,
  });
  return new Promise((resolve, reject) => {
    const up = https.request({ host: bedrockHost, method: 'POST', path: pathname, headers: signed.headers, timeout: 600000 },
      (upRes) => resolve({ up, upRes }));
    up.on('timeout', () => up.destroy(new Error('upstream idle timeout')));
    up.on('error', reject);
    up.end(body);
  });
}

async function handleBedrock(req, res) {
  const url = new URL(req.url, 'http://local');
  if (req.method === 'GET' && url.pathname === '/openai/v1/models') {
    return sendJson(res, 200, { object: 'list', data: [...ALLOWED_MODELS].map((id) => ({ id, object: 'model', owned_by: 'amazon-bedrock' })) });
  }
  if (req.method === 'GET' && url.pathname === '/healthz') return sendJson(res, 200, { ok: true, region: REGION, stats });
  if (req.method !== 'POST' || !PROXY_PATHS.has(url.pathname)) return openAiError(res, 404, `unsupported route ${req.method} ${url.pathname}`);

  let body;
  try { body = await readBody(req, 50 * 1024 * 1024); } catch (e) { return openAiError(res, e.status || 400, e.message); }
  let model;
  try { model = JSON.parse(body.toString('utf8')).model; } catch { return openAiError(res, 400, 'body is not JSON'); }
  if (!ALLOWED_MODELS.has(model)) return openAiError(res, 403, `model '${model}' is not allowlisted by the MicroVM proxy`, 'permission_error');

  const t0 = Date.now();
  stats.requests++;
  stats.byModel[model] = (stats.byModel[model] || 0) + 1;
  let attempt = 0;
  while (true) {
    attempt++;
    let up, upRes;
    try {
      ({ up, upRes } = await signedForward(url.pathname, body, req.headers.accept));
    } catch (e) {
      stats.errors++;
      log('bedrock', 'upstream error', { model, error: e.message });
      if (!res.headersSent) return openAiError(res, 502, `bedrock upstream error: ${e.message}`, 'api_error');
      return res.destroy();
    }
    // Expired/rotated role credentials (e.g. right after resume): reset once and retry.
    if (upRes.statusCode === 403 && attempt === 1) {
      const errBody = (await readBody(upRes, 1 << 20)).toString();
      if (/expired|security token/i.test(errBody)) { invalidateCredentials('403 from bedrock'); continue; }
      stats.errors++;
      res.writeHead(403, { 'content-type': upRes.headers['content-type'] || 'application/json' });
      return res.end(errBody);
    }
    if (upRes.statusCode >= 400) stats.errors++;
    const headers = {};
    for (const h of ['content-type', 'x-amzn-requestid', 'x-amzn-bedrock-invocation-latency']) {
      if (upRes.headers[h]) headers[h] = upRes.headers[h];
    }
    res.writeHead(upRes.statusCode, headers);
    upRes.pipe(res);
    req.on('close', () => { if (!res.writableEnded) up.destroy(); });
    upRes.on('end', () => log('bedrock', `${url.pathname} ${upRes.statusCode}`, { model, ms: Date.now() - t0, requestId: upRes.headers['x-amzn-requestid'] }));
    return;
  }
}

// ---------------------------------------------------------------- dsh Web UI supervisor
const dshWeb = { status: 'stopped', pid: null, launchToken: null, restarts: 0, startedAt: null, readyAt: null, lastLines: [] };
let dshChild = null;
let shuttingDown = false;
let readyWaiters = [];

function startDshWeb() {
  dshWeb.status = 'starting';
  dshWeb.launchToken = null;
  dshWeb.startedAt = Date.now();
  const child = spawnAsAgent([DSH_BIN, '--profile', 'web', '--patch', DSH_PATCH, '--no-open', '--port', String(DSH_WEB_PORT)]);
  dshChild = child;
  dshWeb.pid = child.pid;
  const onLine = (line) => {
    dshWeb.lastLines.push(line);
    if (dshWeb.lastLines.length > 40) dshWeb.lastLines.shift();
    const m = line.match(/dsh web:\s*(https?:\/\/\S+)/);
    if (m && child === dshChild) {
      try { dshWeb.launchToken = new URL(m[1]).searchParams.get('token'); } catch { /* ignore */ }
      dshWeb.status = 'ready';
      dshWeb.readyAt = Date.now();
      log('dsh-web', `ready in ${dshWeb.readyAt - dshWeb.startedAt} ms (pid ${child.pid})`);
      readyWaiters.splice(0).forEach((r) => r());
      return;
    }
    // Never log the tokenized URL; everything else goes to CloudWatch.
    if (!/token=/.test(line)) console.log(`[dsh-web] ${line}`);
  };
  for (const s of [child.stdout, child.stderr]) {
    let buf = '';
    s.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { onLine(buf.slice(0, i)); buf = buf.slice(i + 1); } });
  }
  child.on('exit', (code, signal) => {
    if (child !== dshChild) return;
    dshWeb.status = 'exited';
    dshWeb.pid = null;
    log('dsh-web', `exited code=${code} signal=${signal}`);
    if (!shuttingDown) { dshWeb.restarts++; setTimeout(startDshWeb, 2000); }
  });
}

function waitDshReady(timeoutMs) {
  if (dshWeb.status === 'ready') return Promise.resolve(true);
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(false), timeoutMs);
    readyWaiters.push(() => { clearTimeout(t); resolve(true); });
  });
}

// Restart dsh web so each MicroVM gets its own launch token and cookie-signing key
// instead of the ones captured in the shared image snapshot.
function rotateDshWeb() {
  const old = dshChild;
  dshChild = null;
  if (old) { old.removeAllListeners('exit'); old.kill('SIGTERM'); setTimeout(() => old.kill('SIGKILL'), 3000).unref(); }
  startDshWeb();
}

// ---------------------------------------------------------------- headless task runner
const tasks = new Map();
const TASK_LOG_ROOT = path.join(WORKSPACE, '.tasks');

async function createTask({ prompt, permissionMode }) {
  const running = [...tasks.values()].filter((t) => t.status === 'running').length;
  if (running >= MAX_TASKS) throw Object.assign(new Error(`${running} tasks already running (limit ${MAX_TASKS})`), { status: 429 });
  const id = `${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}-${crypto.randomBytes(3).toString('hex')}`;
  const dir = path.join(WORKSPACE, 'tasks', id);
  const logDir = path.join(TASK_LOG_ROOT, id);
  await fsp.mkdir(dir, { recursive: true });
  await fsp.mkdir(logDir, { recursive: true });
  if (IS_ROOT) await fsp.chown(dir, AGENT_UID, AGENT_UID);
  const task = { id, status: 'running', prompt: prompt.slice(0, 500), dir: `tasks/${id}`, startedAt: new Date().toISOString(), finishedAt: null, exitCode: null, events: 0 };
  tasks.set(id, task);
  const events = fs.createWriteStream(path.join(logDir, 'events.ndjson'));
  const stderr = fs.createWriteStream(path.join(logDir, 'stderr.log'));
  const mode = permissionMode || TASK_PERMISSION_MODE;
  // dsh 0.2.1 selects the permission preset from DSH_PERMISSION_MODE (newer builds also take
  // --permission-mode); there is no human to approve anything in a headless task.
  const child = spawnAsAgent([DSH_BIN, '--profile', 'headless', '--patch', DSH_PATCH, '--json', '-'],
    { cwd: dir, env: { DSH_PERMISSION_MODE: mode } });
  task.pid = child.pid;
  child.stdin.end(prompt);
  // Keep a small summary of the NDJSON run events: counts, token usage, final answer.
  task.toolCalls = 0;
  task.usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
  task.finalText = null;
  let pending = '';
  child.stdout.on('data', (d) => {
    pending += d;
    let i;
    while ((i = pending.indexOf('\n')) >= 0) {
      const line = pending.slice(0, i); pending = pending.slice(i + 1);
      task.events++;
      try {
        const ev = JSON.parse(line);
        if (ev.type === 'tool_call') task.toolCalls++;
        if (ev.type === 'status' && ev.phase === 'step_end' && ev.usage) {
          for (const k of Object.keys(task.usage)) task.usage[k] += ev.usage[k] || 0;
        }
        if (ev.type === 'final') task.finalText = String(ev.text ?? '').slice(0, 4000);
        if (ev.type === 'session') task.sessionId = ev.sessionId;
        if (ev.type === 'error') task.error = ev.message;
      } catch { /* non-JSON line */ }
    }
  });
  child.stdout.pipe(events);
  child.stderr.pipe(stderr);
  child.on('exit', (code, signal) => {
    task.status = code === 0 ? 'succeeded' : (signal ? 'cancelled' : 'failed');
    task.exitCode = code;
    task.finishedAt = new Date().toISOString();
    log('task', `${id} ${task.status} code=${code}`);
  });
  child.on('error', (e) => { task.status = 'failed'; task.error = e.message; });
  task.kill = () => child.kill('SIGTERM');
  log('task', `${id} started`, { mode, promptChars: prompt.length });
  return task;
}

const publicTask = ({ kill, ...t }) => t;

async function tailFile(file, maxBytes) {
  try {
    const st = await fsp.stat(file);
    const fh = await fsp.open(file, 'r');
    const len = Math.min(st.size, maxBytes);
    const buf = Buffer.alloc(len);
    await fh.read(buf, 0, len, st.size - len);
    await fh.close();
    return buf.toString('utf8');
  } catch { return ''; }
}

// Resolve a client path inside WORKSPACE; refuse anything that escapes it (incl. via symlinks).
async function resolveWorkspacePath(rel) {
  const abs = path.resolve(WORKSPACE, '.' + path.sep + decodeURIComponent(rel));
  const real = await fsp.realpath(abs);
  const root = await fsp.realpath(WORKSPACE);
  if (real !== root && !real.startsWith(root + path.sep)) throw Object.assign(new Error('path escapes workspace'), { status: 403 });
  return real;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript',
  '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.csv': 'text/csv; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.ndjson': 'application/x-ndjson' };

async function handleSidecarApi(req, res, url) {
  const p = url.pathname.replace(/^\/__sidecar/, '') || '/';
  try {
    if (req.method === 'GET' && p === '/health') {
      return sendJson(res, 200, { dshWeb: { status: dshWeb.status, restarts: dshWeb.restarts, startedAt: dshWeb.startedAt, readyAt: dshWeb.readyAt },
        bedrock: { region: REGION, allowedModels: [...ALLOWED_MODELS], ...stats }, imdsFence: fence,
        tasks: { running: [...tasks.values()].filter((t) => t.status === 'running').length, total: tasks.size } });
    }
    if (req.method === 'GET' && p === '/launch') {
      if (!(await waitDshReady(30000)) || !dshWeb.launchToken) return sendJson(res, 503, { error: 'dsh web not ready', status: dshWeb.status, tail: dshWeb.lastLines.slice(-10) });
      res.writeHead(302, { location: `/?token=${encodeURIComponent(dshWeb.launchToken)}`, 'cache-control': 'no-store' });
      return res.end();
    }
    if (req.method === 'POST' && p === '/tasks') {
      const body = JSON.parse((await readBody(req, 1 << 20)).toString() || '{}');
      if (typeof body.prompt !== 'string' || !body.prompt.trim()) return sendJson(res, 400, { error: 'prompt (string) is required' });
      if (body.permissionMode && !['read-only', 'workspace-write', 'danger-full-access'].includes(body.permissionMode)) return sendJson(res, 400, { error: 'bad permissionMode' });
      return sendJson(res, 202, publicTask(await createTask(body)));
    }
    if (req.method === 'GET' && p === '/tasks') return sendJson(res, 200, [...tasks.values()].map(publicTask));
    let m = p.match(/^\/tasks\/([\w-]+)(\/events|\/stderr|\/cancel)?$/);
    if (m) {
      const task = tasks.get(m[1]);
      if (!task) return sendJson(res, 404, { error: 'no such task' });
      if (!m[2] && req.method === 'GET') {
        return sendJson(res, 200, { ...publicTask(task), stderrTail: await tailFile(path.join(TASK_LOG_ROOT, task.id, 'stderr.log'), 2000),
          lastEvents: (await tailFile(path.join(TASK_LOG_ROOT, task.id, 'events.ndjson'), 6000)).split('\n').filter(Boolean).slice(-5) });
      }
      if (m[2] === '/events' && req.method === 'GET') {
        res.writeHead(200, { 'content-type': 'application/x-ndjson' });
        return fs.createReadStream(path.join(TASK_LOG_ROOT, task.id, 'events.ndjson')).pipe(res);
      }
      if (m[2] === '/stderr' && req.method === 'GET') {
        res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
        return fs.createReadStream(path.join(TASK_LOG_ROOT, task.id, 'stderr.log')).pipe(res);
      }
      if (m[2] === '/cancel' && req.method === 'POST') { task.kill?.(); return sendJson(res, 202, { cancelling: task.id }); }
    }
    m = p.match(/^\/files(?:\/(.*))?$/);
    if (m && req.method === 'GET') {
      const abs = await resolveWorkspacePath(m[1] || '');
      const st = await fsp.stat(abs);
      if (st.isDirectory()) {
        const entries = await fsp.readdir(abs, { withFileTypes: true });
        return sendJson(res, 200, entries.filter((e) => !e.name.startsWith('.')).map((e) => ({ name: e.name, dir: e.isDirectory() })));
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream', 'content-length': st.size });
      return fs.createReadStream(abs).pipe(res);
    }
    return sendJson(res, 404, { error: `no sidecar route ${req.method} ${p}` });
  } catch (e) {
    if (e.code === 'ENOENT') return sendJson(res, 404, { error: 'not found' });
    return sendJson(res, e.status || 500, { error: e.message });
  }
}

// ---------------------------------------------------------------- gateway -> dsh web
const HOP = new Set(['connection', 'keep-alive', 'proxy-connection', 'te', 'trailer', 'transfer-encoding', 'upgrade']);

// dsh's browser-trust fence only accepts loopback (or --trusted-host) authorities, and the
// MicroVM endpoint host is only known at run time, after the snapshot. Rewriting Host/Origin
// to the loopback authority keeps one image valid for every MicroVM; authentication is the
// MicroVM proxy token in front of us plus dsh's own launch token and signed cookie.
function rewriteHeaders(headers, keepUpgrade) {
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    if (!keepUpgrade && HOP.has(k)) continue;
    if (k.startsWith('x-aws-proxy')) continue;
    out[k] = v;
  }
  out.host = DSH_AUTHORITY;
  if (out.origin) out.origin = `http://${DSH_AUTHORITY}`;
  if (out.referer) { try { const r = new URL(out.referer); out.referer = `http://${DSH_AUTHORITY}${r.pathname}${r.search}`; } catch { delete out.referer; } }
  return out;
}

function proxyHttpToDsh(req, res) {
  const up = http.request({ host: '127.0.0.1', port: DSH_WEB_PORT, method: req.method, path: req.url, headers: rewriteHeaders(req.headers, false) }, (upRes) => {
    const headers = { ...upRes.headers };
    for (const h of HOP) delete headers[h];
    if (headers.location) headers.location = headers.location.replace(`http://${DSH_AUTHORITY}`, '');
    res.writeHead(upRes.statusCode, headers);
    upRes.pipe(res);
  });
  up.on('error', () => { if (!res.headersSent) sendJson(res, 503, { error: 'dsh web not reachable', status: dshWeb.status }); else res.destroy(); });
  req.pipe(up);
}

function proxyUpgradeToDsh(req, socket, head) {
  const upstream = net.connect(DSH_WEB_PORT, '127.0.0.1', () => {
    const headers = rewriteHeaders(req.headers, true);
    let raw = `${req.method} ${req.url} HTTP/1.1\r\n`;
    for (const [k, v] of Object.entries(headers)) for (const vv of [].concat(v)) raw += `${k}: ${vv}\r\n`;
    upstream.write(raw + '\r\n');
    if (head?.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  const close = () => { upstream.destroy(); socket.destroy(); };
  upstream.on('error', close);
  socket.on('error', close);
}

// ---------------------------------------------------------------- servers
const gateway = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://local');
  if (url.pathname.startsWith('/__sidecar/')) return void handleSidecarApi(req, res, url);
  proxyHttpToDsh(req, res);
});
gateway.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/__sidecar/')) return socket.destroy();
  proxyUpgradeToDsh(req, socket, head);
});
gateway.requestTimeout = 0;
gateway.headersTimeout = 60000;

const proxy = http.createServer((req, res) => void handleBedrock(req, res));
proxy.requestTimeout = 0;

const hookServer = http.createServer(async (req, res) => {
  const name = req.url.startsWith(HOOK_PREFIX + '/') ? req.url.slice(HOOK_PREFIX.length + 1) : null;
  const body = await readBody(req, 1 << 20).catch(() => Buffer.alloc(0));
  log('hook', `${req.method} ${req.url}`, body.length ? { payloadBytes: body.length } : undefined);
  switch (name) {
    case 'ready':
      // Snapshot only once dsh web has fully booted, so a run skips its init.
      return void res.writeHead(dshWeb.status === 'ready' ? 200 : 503).end();
    case 'validate':
      return void res.writeHead(dshWeb.status === 'ready' ? 200 : 503).end();
    case 'run':
      invalidateCredentials('run');
      await applyImdsFence();
      if (ROTATE_ON_RUN) rotateDshWeb();
      return void res.writeHead(200).end();
    case 'resume':
      // Outbound connections die on resume; role credentials may have rotated.
      invalidateCredentials('resume');
      return void res.writeHead(200).end();
    case 'suspend':
      return void res.writeHead(200).end();
    case 'terminate':
      shuttingDown = true;
      for (const t of tasks.values()) t.kill?.();
      dshChild?.kill('SIGTERM');
      return void res.writeHead(200).end();
    default:
      return void res.writeHead(404).end();
  }
});

async function main() {
  await fsp.mkdir(TASK_LOG_ROOT, { recursive: true });
  await applyImdsFence();
  proxy.listen(PROXY_PORT, '127.0.0.1', () => log('bedrock', `SigV4 proxy on 127.0.0.1:${PROXY_PORT} -> ${bedrockHost}`, { models: [...ALLOWED_MODELS] }));
  hookServer.listen(HOOK_PORT, '0.0.0.0', () => log('hook', `lifecycle hooks on :${HOOK_PORT}`));
  gateway.listen(GATEWAY_PORT, '0.0.0.0', () => log('gateway', `ingress gateway on :${GATEWAY_PORT} -> dsh web ${DSH_AUTHORITY}`));
  startDshWeb();
}

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => { shuttingDown = true; dshChild?.kill('SIGTERM'); for (const t of tasks.values()) t.kill?.(); setTimeout(() => process.exit(0), 1500); });
}

main().catch((e) => { console.error(e); process.exit(1); });
