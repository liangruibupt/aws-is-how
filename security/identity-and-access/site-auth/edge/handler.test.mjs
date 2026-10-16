import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { makeHandler, safePath } from "./handler.mjs";

// 本地签发 Cognito 形状的 ID token：自己的 RSA 密钥 + 对应的 JWKS，不连网
const POOL = "us-east-1_TestPool1", ISS = `https://cognito-idp.us-east-1.amazonaws.com/${POOL}`, KID = "k1";
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwks = { keys: [{ ...publicKey.export({ format: "jwk" }), kid: KID, alg: "RS256", use: "sig" }] };
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");
function idToken(aud, { exp = Math.floor(Date.now() / 1000) + 3600, iss = ISS } = {}) {
  const head = b64({ alg: "RS256", kid: KID, typ: "JWT" }), body = b64({ iss, aud, token_use: "id", sub: "u1", exp, iat: exp - 3600, auth_time: exp - 3600 });
  return `${head}.${body}.${crypto.sign("RSA-SHA256", Buffer.from(`${head}.${body}`), privateKey).toString("base64url")}`;
}

const cfg = {
  userPoolId: POOL, domain: "https://login.example.auth.us-east-1.amazoncognito.com", jwks,
  sites: {
    app: { host: "app.cloudfront.net", clientId: "appclient", home: "/", authPrefix: "/_auth", cookiePath: "/", api: ["/api/"], spa: true, refreshDays: 30 },
    deck: { host: "deck.cloudfront.net", clientId: "deckclient", home: "/deck/", authPrefix: "/deck/_auth", cookiePath: "/deck/", refreshDays: 30 },
  },
};
const ev = (host, uri, { cookie, qs = "", method = "GET" } = {}) => ({ Records: [{ cf: { request: {
  uri, querystring: qs, method, headers: { host: [{ key: "Host", value: host }], ...(cookie ? { cookie: [{ key: "Cookie", value: cookie }] } : {}) },
} } }] });
const cookiesOf = r => (r.headers["set-cookie"] ?? []).map(c => c.value);
const tokenEndpoint = reply => {
  const calls = [];
  return { calls, fetch: async (url, init) => { calls.push({ url, body: Object.fromEntries(init.body) }); return reply(calls.at(-1)); } };
};
const json = (o, ok = true) => ({ ok, json: async () => o });

test("an unknown host is refused", async () => {
  const r = await makeHandler(cfg)(ev("other.cloudfront.net", "/"));
  assert.equal(r.status, "403");
});

test("no cookie: redirect to the hosted login with PKCE, and remember state for the callback", async () => {
  const r = await makeHandler(cfg)(ev("app.cloudfront.net", "/c5", { qs: "x=1" }));
  assert.equal(r.status, "302");
  const to = new URL(r.headers.location[0].value), q = to.searchParams;
  assert.equal(to.origin + to.pathname, `${cfg.domain}/oauth2/authorize`);
  assert.equal(q.get("client_id"), "appclient");
  assert.equal(q.get("redirect_uri"), "https://app.cloudfront.net/_auth/callback");
  assert.equal(q.get("code_challenge_method"), "S256");
  const [nonce, back] = q.get("state").split(".");
  assert.equal(Buffer.from(back, "base64url").toString(), "/c5?x=1");
  const st = cookiesOf(r).find(c => c.startsWith("sa_state="));
  assert.match(st, new RegExp(`^sa_state=${nonce}\\.[\\w-]+; Path=/_auth; Max-Age=600; Secure; HttpOnly; SameSite=Lax$`));
  const verifier = st.split(";")[0].split(".")[1];
  assert.equal(crypto.createHash("sha256").update(verifier).digest("base64url"), q.get("code_challenge"));
});

test("a valid ID token passes; our cookies are stripped and SPA paths are rewritten", async () => {
  const h = makeHandler(cfg), tok = idToken("appclient");
  const page = await h(ev("app.cloudfront.net", "/c5", { cookie: `theme=dark; sa_id=${tok}; sa_rt=abc` }));
  assert.equal(page.uri, "/index.html");
  assert.deepEqual(page.headers.cookie, [{ key: "Cookie", value: "theme=dark" }]);
  const asset = await h(ev("app.cloudfront.net", "/assets/app.js", { cookie: `sa_id=${tok}` }));
  assert.equal(asset.uri, "/assets/app.js");
  assert.equal(asset.headers.cookie, undefined);
  const api = await h(ev("app.cloudfront.net", "/api/health", { cookie: `sa_id=${tok}` }));
  assert.equal(api.uri, "/api/health");
  const deck = await h(ev("deck.cloudfront.net", "/deck/talk", { cookie: `sa_id=${idToken("deckclient")}` }));
  assert.equal(deck.uri, "/deck/talk", "no SPA rewrite on a non-SPA site");
});

test("a token for another site, an expired token or a forged one does not pass", async () => {
  const h = makeHandler(cfg), forged = idToken("appclient").replace(/\.[^.]+$/, ".AAAA");
  for (const tok of [idToken("deckclient"), idToken("appclient", { exp: 1000 }), idToken("appclient", { iss: "https://evil.example" }), forged]) {
    const r = await h(ev("app.cloudfront.net", "/", { cookie: `sa_id=${tok}` }));
    assert.equal(r.status, "302", tok.slice(-12));
  }
});

test("the API gets 401 instead of a login redirect", async () => {
  const r = await makeHandler(cfg)(ev("app.cloudfront.net", "/api/usage/reset", { method: "POST" }));
  assert.equal(r.status, "401");
  assert.equal(JSON.parse(r.body).error.code, "unauthorized");
});

test("an expired ID token with a refresh token: refresh and replay the same request with 307", async () => {
  const fresh = idToken("appclient"), te = tokenEndpoint(() => json({ id_token: fresh, expires_in: 43200 }));
  const r = await makeHandler(cfg, te)(ev("app.cloudfront.net", "/api/judge", { cookie: `sa_id=${idToken("appclient", { exp: 1000 })}; sa_rt=RT1`, qs: "a=b", method: "POST" }));
  assert.equal(r.status, "307");
  assert.equal(r.headers.location[0].value, "/api/judge?a=b");
  assert.deepEqual(te.calls[0].body, { client_id: "appclient", grant_type: "refresh_token", refresh_token: "RT1" });
  assert.deepEqual(cookiesOf(r), [`sa_id=${fresh}; Path=/; Max-Age=43200; Secure; HttpOnly; SameSite=Lax`]);
});

test("a refresh that fails falls back to login (pages) or 401 (API)", async () => {
  const te = tokenEndpoint(() => json({ error: "invalid_grant" }, false)), h = makeHandler(cfg, te);
  assert.equal((await h(ev("app.cloudfront.net", "/", { cookie: "sa_rt=old" }))).status, "302");
  assert.equal((await h(ev("app.cloudfront.net", "/api/x", { cookie: "sa_rt=old" }))).status, "401");
});

test("callback: state must match the cookie, the code is exchanged with the PKCE verifier, then back to the page", async () => {
  const fresh = idToken("deckclient"), te = tokenEndpoint(() => json({ id_token: fresh, refresh_token: "RT2", expires_in: 43200 }));
  const h = makeHandler(cfg, te), back = Buffer.from("/deck/talk.html").toString("base64url");
  const bad = await h(ev("deck.cloudfront.net", "/deck/_auth/callback", { qs: `code=C&state=n1.${back}`, cookie: "sa_state=n2.V" }));
  assert.equal(bad.status, "400");
  assert.equal(te.calls.length, 0, "no token exchange on a state mismatch");

  const r = await h(ev("deck.cloudfront.net", "/deck/_auth/callback", { qs: `code=C&state=n1.${back}`, cookie: "sa_state=n1.V" }));
  assert.equal(r.status, "302");
  assert.equal(r.headers.location[0].value, "/deck/talk.html");
  assert.deepEqual(te.calls[0].body, { client_id: "deckclient", grant_type: "authorization_code", code: "C", redirect_uri: "https://deck.cloudfront.net/deck/_auth/callback", code_verifier: "V" });
  assert.deepEqual(cookiesOf(r), [
    `sa_id=${fresh}; Path=/deck/; Max-Age=43200; Secure; HttpOnly; SameSite=Lax`,
    "sa_rt=RT2; Path=/deck/; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax",
    "sa_state=; Path=/deck/_auth; Max-Age=0; Secure; HttpOnly; SameSite=Lax",
  ]);
});

test("callback: a token for another client is rejected", async () => {
  const te = tokenEndpoint(() => json({ id_token: idToken("appclient"), expires_in: 3600 }));
  const r = await makeHandler(cfg, te)(ev("deck.cloudfront.net", "/deck/_auth/callback", { qs: "code=C&state=n1.Lw", cookie: "sa_state=n1.V" }));
  assert.equal(r.status, "401");
});

test("logout clears the cookies and goes through the Cognito logout endpoint", async () => {
  const r = await makeHandler(cfg)(ev("deck.cloudfront.net", "/deck/_auth/logout"));
  const to = new URL(r.headers.location[0].value);
  assert.equal(to.pathname, "/logout");
  assert.equal(to.searchParams.get("logout_uri"), "https://deck.cloudfront.net/deck/");
  assert.ok(cookiesOf(r).every(c => c.includes("Max-Age=0")));
});

test("the return path after login stays on this site", () => {
  assert.equal(safePath("/c5?x=1", "/"), "/c5?x=1");
  for (const p of ["//evil.com", "https://evil.com", "/\\evil.com", "", undefined]) assert.equal(safePath(p, "/"), "/", String(p));
});
