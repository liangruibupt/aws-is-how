#!/usr/bin/env node
// Local tunnel to the dsh Web UI inside a Lambda MicroVM.
//
// Browsers cannot attach the X-aws-proxy-auth header to page loads, so this listens on
// 127.0.0.1:<port>, adds a MicroVM auth token (minted with your AWS CLI credentials and
// refreshed before its 60-minute limit) to every request and WebSocket upgrade, and forwards
// to the MicroVM's HTTPS endpoint. Then open http://127.0.0.1:<port>/__sidecar/launch.
//
// Usage: node scripts/connect.mjs [--port 3080] [--microvm microvm-...] [--endpoint https://...]
// Reads MICROVM_ID / MICROVM_ENDPOINT from .microvm.env (written by run.sh) by default.
// No npm dependencies; requires Node >= 18 and the AWS CLI with lambda-microvms commands.

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(here, '..', '.microvm.env');
const fileEnv = fs.existsSync(envFile)
  ? Object.fromEntries(fs.readFileSync(envFile, 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => l.split(/=(.*)/s).slice(0, 2)))
  : {};
const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : dflt; };

const MICROVM_ID = arg('microvm', process.env.MICROVM_ID || fileEnv.MICROVM_ID);
const ENDPOINT = new URL(arg('endpoint', process.env.MICROVM_ENDPOINT || fileEnv.MICROVM_ENDPOINT));
const LOCAL_PORT = Number(arg('port', 3080));
const TARGET_PORT = String(arg('target-port', 8080));
const REGION = process.env.AWS_REGION || fileEnv.AWS_REGION || 'us-east-1';
if (!MICROVM_ID) { console.error('No MicroVM id: run scripts/run.sh first or pass --microvm'); process.exit(1); }

let token = null;
let tokenExpires = 0;
function mintToken() {
  return new Promise((resolve, reject) => {
    execFile('aws', ['lambda-microvms', 'create-microvm-auth-token', '--region', REGION, '--microvm-identifier', MICROVM_ID,
      '--expiration-in-minutes', '60', '--allowed-ports', JSON.stringify([{ port: Number(TARGET_PORT) }]),
      '--query', 'authToken."X-aws-proxy-auth"', '--output', 'text'], (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      token = stdout.trim();
      tokenExpires = Date.now() + 55 * 60 * 1000;
      console.log(`[connect] auth token refreshed (valid ~60 min) for ${MICROVM_ID}`);
      resolve(token);
    });
  });
}
async function getToken() { if (!token || Date.now() > tokenExpires) await mintToken(); return token; }

function upstreamHeaders(reqHeaders, auth) {
  const h = { ...reqHeaders, host: ENDPOINT.host, 'x-aws-proxy-auth': auth, 'x-aws-proxy-port': TARGET_PORT };
  delete h['proxy-connection'];
  return h;
}

const server = http.createServer(async (req, res) => {
  let auth;
  try { auth = await getToken(); } catch (e) { res.writeHead(502).end(`token mint failed: ${e.message}`); return; }
  const up = https.request({ host: ENDPOINT.hostname, port: 443, method: req.method, path: req.url, headers: upstreamHeaders(req.headers, auth) }, (upRes) => {
    if (upRes.statusCode === 401 || upRes.statusCode === 403) tokenExpires = 0; // re-mint next time
    res.writeHead(upRes.statusCode, upRes.headers);
    upRes.pipe(res);
  });
  up.on('error', (e) => { if (!res.headersSent) res.writeHead(502).end(`upstream: ${e.message}`); else res.destroy(); });
  req.pipe(up);
});

server.on('upgrade', async (req, socket, head) => {
  let auth;
  try { auth = await getToken(); } catch { socket.destroy(); return; }
  const up = https.request({ host: ENDPOINT.hostname, port: 443, method: req.method, path: req.url, headers: upstreamHeaders(req.headers, auth) });
  up.on('upgrade', (upRes, upSocket, upHead) => {
    let raw = `HTTP/1.1 ${upRes.statusCode} ${upRes.statusMessage}\r\n`;
    for (let i = 0; i < upRes.rawHeaders.length; i += 2) raw += `${upRes.rawHeaders[i]}: ${upRes.rawHeaders[i + 1]}\r\n`;
    socket.write(raw + '\r\n');
    if (upHead?.length) socket.write(upHead);
    if (head?.length) upSocket.write(head);
    upSocket.pipe(socket); socket.pipe(upSocket);
    const close = () => { upSocket.destroy(); socket.destroy(); };
    upSocket.on('error', close); socket.on('error', close);
  });
  up.on('response', (upRes) => { socket.end(`HTTP/1.1 ${upRes.statusCode} ${upRes.statusMessage}\r\n\r\n`); });
  up.on('error', () => socket.destroy());
  up.end();
});

await mintToken().catch((e) => { console.error(`[connect] cannot mint auth token: ${e.message}`); process.exit(1); });
server.listen(LOCAL_PORT, '127.0.0.1', () => {
  console.log(`[connect] ${ENDPOINT.origin} (port ${TARGET_PORT}) <- http://127.0.0.1:${LOCAL_PORT}`);
  console.log(`[connect] open http://127.0.0.1:${LOCAL_PORT}/__sidecar/launch`);
});
