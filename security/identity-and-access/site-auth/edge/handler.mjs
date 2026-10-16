// handler.mjs — Lambda@Edge viewer-request：未登录的请求跳到 Cognito 托管登录页，登录后用 HttpOnly cookie 放行
// Lambda@Edge 不能用环境变量，配置（用户池、各站点的 app client、JWKS）在打包时由 scripts/deploy.sh 写进 config.json
// 入口是 index.mjs；一个函数服务多个分发：按 Host 头找站点配置，没配的 Host 一律 403
import crypto from "node:crypto";
import { CognitoJwtVerifier } from "aws-jwt-verify";

const ID = "sa_id", RT = "sa_rt", ST = "sa_state";          // ID token、refresh token、登录中的 state + PKCE verifier

export function makeHandler(cfg, { fetch: doFetch = fetch, now = () => Date.now() } = {}) {
  const sites = new Map(Object.values(cfg.sites).map(s => {
    const verifier = CognitoJwtVerifier.create({ userPoolId: cfg.userPoolId, tokenUse: "id", clientId: s.clientId });
    verifier.cacheJwks(cfg.jwks);                           // 预置 JWKS：边缘节点冷启动不用回源拉公钥；密钥轮换后按 kid 自动再拉
    return [s.host, { ...s, verifier, callback: `${s.authPrefix}/callback`, logout: `${s.authPrefix}/logout` }];
  }));

  return async function handler(event) {
    const req = event.Records[0].cf.request, host = req.headers.host?.[0]?.value, site = sites.get(host);
    if (!site) return respond(403, "text/plain", "forbidden");
    const cookies = parseCookies(req.headers.cookie), qs = new URLSearchParams(req.querystring);
    const redirectUri = `https://${host}${site.callback}`;

    if (req.uri === site.callback) return callback(site, cookies, qs, redirectUri);
    if (req.uri === site.logout) {
      const to = `${cfg.domain}/logout?${new URLSearchParams({ client_id: site.clientId, logout_uri: `https://${host}${site.home}` })}`;
      return redirect(302, to, [clear(ID, site.cookiePath), clear(RT, site.cookiePath)]);
    }

    if (cookies[ID]) {
      try {
        await site.verifier.verify(cookies[ID]);
        return pass(req, site);
      } catch { /* 过期或无效：下面先试 refresh token，再重新登录 */ }
    }
    const isApi = (site.api ?? []).some(p => req.uri.startsWith(p));
    if (cookies[RT]) {
      const t = await token(site, { grant_type: "refresh_token", refresh_token: cookies[RT] });
      if (t?.id_token) {
        // 307 保留方法和请求体：API 的 POST 刷新后原样重发
        const self = req.uri + (req.querystring ? `?${req.querystring}` : "");
        return redirect(307, self, [set(ID, t.id_token, site.cookiePath, t.expires_in)]);
      }
    }
    if (isApi) return respond(401, "application/json", JSON.stringify({ error: { code: "unauthorized", message: "请先登录（刷新页面）" } }));

    const nonce = b64(crypto.randomBytes(18)), verifier = b64(crypto.randomBytes(32));
    const challenge = b64(crypto.createHash("sha256").update(verifier).digest());
    const back = req.uri + (req.querystring ? `?${req.querystring}` : "");
    const to = `${cfg.domain}/oauth2/authorize?${new URLSearchParams({
      response_type: "code", client_id: site.clientId, redirect_uri: redirectUri, scope: "openid",
      state: `${nonce}.${b64(Buffer.from(back))}`, code_challenge: challenge, code_challenge_method: "S256",
    })}`;
    return redirect(302, to, [set(ST, `${nonce}.${verifier}`, site.authPrefix, 600)]);
  };

  async function callback(site, cookies, qs, redirectUri) {
    const [nonce, back64] = (qs.get("state") ?? "").split("."), [want, verifier] = (cookies[ST] ?? "").split(".");
    if (!qs.get("code") || !nonce || nonce !== want || !verifier) return respond(400, "text/plain", "login expired, reload the page");
    const t = await token(site, { grant_type: "authorization_code", code: qs.get("code"), redirect_uri: redirectUri, code_verifier: verifier });
    if (!t?.id_token) return respond(401, "text/plain", "login failed, reload the page");
    try { await site.verifier.verify(t.id_token); } catch { return respond(401, "text/plain", "login failed, reload the page"); }
    return redirect(302, safePath(Buffer.from(back64 ?? "", "base64url").toString(), site.home), [
      set(ID, t.id_token, site.cookiePath, t.expires_in),
      ...(t.refresh_token ? [set(RT, t.refresh_token, site.cookiePath, site.refreshDays * 86400)] : []),
      clear(ST, site.authPrefix),
    ]);
  }

  async function token(site, params) {
    try {
      const r = await doFetch(`${cfg.domain}/oauth2/token`, {
        method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: site.clientId, ...params }), signal: AbortSignal.timeout(3000),
      });
      return r.ok ? await r.json() : null;
    } catch { return null; }
  }
}

/** 放行：去掉本模块的 cookie 再回源；SPA 站点把无扩展名的路径改写到 /index.html（替代原来的 CloudFront Function） */
function pass(req, site) {
  const rest = (req.headers.cookie ?? []).flatMap(h => h.value.split(";")).map(s => s.trim())
    .filter(s => s && ![ID, RT, ST].includes(s.split("=")[0]));
  if (rest.length) req.headers.cookie = [{ key: "Cookie", value: rest.join("; ") }];
  else delete req.headers.cookie;
  if (site.spa && !(site.api ?? []).some(p => req.uri.startsWith(p)) && !req.uri.includes(".")) req.uri = "/index.html";
  return req;
}

/** 登录后回到哪里：只接受本站的绝对路径，挡住 //evil.com 之类的开放重定向 */
export function safePath(p, fallback) {
  return typeof p === "string" && p.startsWith("/") && !p.startsWith("//") && !p.includes("\\") ? p : fallback;
}

function parseCookies(headers = []) {
  const out = {};
  for (const h of headers) for (const part of h.value.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

const b64 = buf => buf.toString("base64url");
const set = (k, v, path, maxAge) => `${k}=${v}; Path=${path}; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Lax`;
const clear = (k, path) => set(k, "", path, 0);
const header = (key, value) => [{ key, value }];

function redirect(status, location, cookies = []) {
  return {
    status: String(status), statusDescription: status === 307 ? "Temporary Redirect" : "Found",
    headers: {
      location: header("Location", location), "cache-control": header("Cache-Control", "no-store"),
      "set-cookie": cookies.map(value => ({ key: "Set-Cookie", value })),
    },
  };
}

function respond(status, type, body) {
  return { status: String(status), headers: { "content-type": header("Content-Type", type), "cache-control": header("Cache-Control", "no-store") }, body };
}
