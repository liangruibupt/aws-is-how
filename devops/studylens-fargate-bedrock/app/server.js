// Basic-Auth front door for StudyLens.
//
// StudyLens ships no authentication, and the App Runner URL is public, so we
// put a single HTTP Basic Auth gate in front of the whole app (static SPA +
// /api/*). Credentials come from env:
//   STUDYLENS_AUTH_USER / STUDYLENS_AUTH_PASS
// If STUDYLENS_AUTH_PASS is unset we fail closed (refuse all requests) rather
// than exposing the notes and the LLM key to the open internet.
const express = require('express');
const crypto = require('crypto');
const studylens = require('studylens/server/index.js'); // exported Express app

const USER = process.env.STUDYLENS_AUTH_USER || 'studylens';
const PASS = process.env.STUDYLENS_AUTH_PASS || '';

// Timing-safe compare to avoid leaking length/prefix via response timing.
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

const gate = express();

gate.use((req, res, next) => {
  if (!PASS) {
    return res.status(503).send('Server not configured: STUDYLENS_AUTH_PASS missing.');
  }
  const header = req.headers['authorization'] || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    const u = decoded.slice(0, idx);
    const p = decoded.slice(idx + 1);
    if (safeEqual(u, USER) && safeEqual(p, PASS)) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="StudyLens", charset="UTF-8"');
  return res.status(401).send('Authentication required.');
});

// Everything past the gate is handled by the real StudyLens app.
gate.use(studylens);

const PORT = process.env.PORT || 3000;
gate.listen(PORT, () => console.log(`StudyLens (auth-gated) running on :${PORT}`));
