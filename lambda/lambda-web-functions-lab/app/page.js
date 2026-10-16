// Server-side rendered dashboard. The HTML is rendered per request with the
// live state of the environment that served it; the JS/CSS under /assets are
// immutable and meant to be cached by CloudFront.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function renderPage({ snap, modelId, needsKey }) {
  const rows = Object.entries(snap)
    .map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td><code>${esc(v)}</code></td></tr>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lambda Web Functions Lab</title>
<link rel="stylesheet" href="/assets/style.css">
</head>
<body>
<header>
  <h1>Lambda Web Functions Lab</h1>
  <p>One standard Express server. This page was rendered by environment
  <strong><code>${esc(snap.envId)}</code></strong> (${esc(snap.version)}, ${esc(snap.region)}, ${esc(snap.azId)})
  which has served <strong>${esc(snap.served)}</strong> requests so far.</p>
</header>
<main>
<section aria-labelledby="h-env">
  <h2 id="h-env">This environment (SSR snapshot)</h2>
  <table>${rows}</table>
</section>

<section aria-labelledby="h-live">
  <h2 id="h-live">Live stream (SSE, one long-lived request)</h2>
  <button type="button" id="btn-live">Stream 30 s of environment stats</button>
  <pre id="out-live" aria-live="polite"></pre>
</section>

<section aria-labelledby="h-pack">
  <h2 id="h-pack">1. Concurrency packing</h2>
  <p>Fire N concurrent requests that each wait 2 s on "I/O". Count how many distinct environments served them.</p>
  <label>N <input id="pack-n" type="number" value="100" min="1" max="500"></label>
  <button type="button" id="btn-pack">Run</button>
  <pre id="out-pack" aria-live="polite"></pre>
</section>

<section aria-labelledby="h-cache">
  <h2 id="h-cache">2. Shared in-process cache with request coalescing</h2>
  <p>50 concurrent requests for the same cold key. Event Functions would make up to 50 upstream calls.</p>
  <button type="button" id="btn-cache">Run</button>
  <pre id="out-cache" aria-live="polite"></pre>
</section>

<section aria-labelledby="h-cpu">
  <h2 id="h-cpu">3. CPU work: main thread vs worker_threads (2 vCPUs)</h2>
  <button type="button" id="btn-cpu">Compare</button>
  <pre id="out-cpu" aria-live="polite"></pre>
</section>

<section aria-labelledby="h-chat">
  <h2 id="h-chat">4. Bedrock token streaming</h2>
  <p>Model: <code>${esc(modelId)}</code>. Long wall-clock, tiny CPU.</p>
  ${needsKey ? '<label>Lab key <input id="chat-key" type="password" autocomplete="off"></label>' : ''}
  <label>Prompt <input id="chat-q" type="text" size="60" value="Compare Lambda Web Functions with Event Functions in 5 bullets."></label>
  <button type="button" id="btn-chat">Stream</button>
  <pre id="out-chat" aria-live="polite"></pre>
</section>

<section aria-labelledby="h-big">
  <h2 id="h-big">5. Big payloads (streamed, no 6 MB cap)</h2>
  <label>MB <input id="big-mb" type="number" value="50" min="1" max="400"></label>
  <button type="button" id="btn-up">Upload to /tmp + sha256</button>
  <button type="button" id="btn-down">Download</button>
  <pre id="out-big" aria-live="polite"></pre>
</section>

<section aria-labelledby="h-probe">
  <h2 id="h-probe">6. Sandbox probe (vCPU, memory, /tmp, limits)</h2>
  <button type="button" id="btn-probe">Probe</button>
  <pre id="out-probe" aria-live="polite"></pre>
</section>
</main>
<script src="/assets/app.js" defer></script>
</body>
</html>`;
}
