# 03 · 闻境 Perfume Product-Video Factory — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared video-factory engine plus the 闻境 perfume film, so that one command renders a batch of platform-ready MP4 product videos (every aspect ratio, colour option, language, cut and promo) from a single template.

**Architecture:** A browser-side engine (native ES modules, Three.js 0.170 via importmap, no build step) evaluates a *film* as pure functions of `(variant, t)`: an edit list picks the shot, each shot returns camera intent + text layers + post settings, the engine frames the camera per aspect ratio, renders the scene (the film supplies a custom glass/liquid refraction pass), post-processes, and draws text on a 2D canvas. The live page previews any variant; Node scripts drive headless Chromium (Metal GPU) frame by frame and pipe PNGs into ffmpeg; audio is synthesized in WebAudio and rendered offline; voice-over clips come from the deployed Kokoro Lambda through `tts.sh`.

**Tech Stack:** Three.js 0.170.0 · WebAudio / OfflineAudioContext · Canvas 2D · Node 22 (`node:test`, `node:http`, `child_process`) · Playwright 1.57.0 · ffmpeg / ffprobe · Kokoro-82M on Lambda (`kokoro-tts:live`, us-east-1)

**Spec:** `ai-ml/chatgpt/claude/opus55-showcase/docs/specs/2026-09-28-03-perfume-video-factory-design.md`

**Paths:** every path below is relative to `ai-ml/chatgpt/claude/opus55-showcase/` (called **SHOW**) unless it starts with `/` or `ai-ml/`. Run every command from SHOW.

## Global Constraints

- Three.js **exactly 0.170.0** via importmap: `"three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"`, `"three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"`. No bundler, no build step. Pages are opened over HTTP from SHOW.
- npm: one `SHOW/package.json` with devDependencies **only** `playwright@1.57.0` and `three@0.170.0` (three is for Node tests). `node_modules/` is gitignored. Playwright 1.57.0's Chromium build 1200 is already in `~/Library/Caches/ms-playwright`.
- Tests: `npm test` = `node --test '*/test/*.test.mjs'`, using only `node:test` + `node:assert/strict`.
- Chromium: `chromium.launch({ headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })`. Abort a job if the WebGL renderer string contains `SwiftShader`. (Spike 2026-09-28 on this M1 Pro: default headless = SwiftShader at ~1100 ms/frame; with these flags = Metal, `canvas.toDataURL('image/png')` at 1080×1920 ≈ 56 ms/frame.)
- Frame transfer: `toDataURL('image/png')` of the composited output canvas, piped to ffmpeg as `-f image2pipe -c:v png -i -`.
- Output sizes: `9x16` 1080×1920, `1x1` 1080×1080, `16x9` 1920×1080. Default 30 fps; `--fps 60` optional.
- Encode: `-c:v libx264 -profile:v high -pix_fmt yuv420p -crf 18 -preset slow -movflags +faststart`; audio `-c:a aac -b:a 192k -ar 48000`, encoded on its own first and copied into the MP4 (`-c:a copy`).
- Loudness (Task 15): measure the mix with `loudnorm`, add the gain to reach −14 LUFS, `alimiter` at −3 dBFS, measure again, then add the make-up gain back to −14 LUFS. Both gains are plain `volume`: `loudnorm` only measures, because its linear mode silently falls back to dynamic compression. Encode that to AAC and measure it. If the true peak is above −1.5 dBTP (AAC raises it), lower the limit by the excess + 0.3 dB and encode again, at most 4 times. Acceptance, measured on the finished MP4: I within ±1 LU of −14, true peak ≤ −1 dBTP.
- Determinism: nothing evaluated per frame or per audio event may call `Math.random`, `Date.now` or `performance.now`; use `factory/engine/rng.js`. A frame is a function of `(variant, t)` only. A cut's audio mix renders to the same samples every time: no WebAudio node input takes more than two connections (`sum()` in `audio.js`, Task 15).
- Assets: no texture, model or audio files are loaded, except the committed voice-over clips in `03-perfume/assets/vo/` and fonts from jsDelivr fontsource.
- The first frame of every cut is fully lit (no fade from black): feeds autoplay from frame 0 and platforms often use frame 0 as the thumbnail.
- Minimum text size: every text layer ≥ **3.5%** of the frame's short side on `9x16` and `1x1`, ≥ **3.0%** on `16x9`. A string that still overflows at the minimum → red box in preview/sheet, job failure in render mode. Never silently clipped.
- Music grid (refines spec §8.1): one bar = **3.0 s** = four beats (80 bpm) for every scent; scents differ in mode, voices and rhythm, not tempo. Music onsets sit on the sixteenth-note grid (0.1875 s). Every hit point lands on a multiple of **1.5 s** (Task 7), and in the 03 cuts every hit is a downbeat (Task 15).
- Brand: fictional 闻境 WENJING. READMEs carry the fictional-brand note. No real brands.
- Code style: match 02 — 2-space indent, ES modules, compact functions, sparse Chinese comments, section headers like `// ── 标题 ──`. READMEs in Chinese.
- Kokoro: `ai-ml/aigc/audio_models/Kokoro/tts.sh`, `REGION=us-east-1`, `FUNC=kokoro-tts:live` (env overrides `KOKORO_TTS`, `REGION`, `FUNC`). One request per voice at a time: the Lambda names its output by voice and second, so parallel requests for one voice overwrite each other (Task 16).
- Voice-over (Task 16): voices `zm_yunxi` (zh) and `bf_emma` (en), chosen by audition. Every clip is trimmed, brought to −20 LUFS, peak-limited at −6 dBFS and stored as mono 48 kbps MP3. In the mix the clips play at gain 0.6, and the music ducks −9 dB under every line (0.12 s attack, 0.3 s release).
- Git: branch `opus55-03-perfume-factory`. Every commit message ends with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

Inputs and failure modes the spec implies but no happy-path test exercises — each has a test pinned in the owning task:

1. **Scrub / jump / loop in the live preview, then look at a frame** — expected identical to sequential playback. Pinned by `factory/check.mjs` (Task 10: every cut's key frames and transition midpoints drawn forward, then backward, PNG bytes compared; Step 8 proves the check fails on a leaked scene mutation) and by `film.reset()` being called before every shot evaluation (Task 8).
2. **Fonts still loading when the first frame renders** (fontsource CJK subsets load lazily) — expected: the page waits, and render mode refuses to start if a family never loaded. Pinned in Task 8 (`createApp` loads every string of the variant and checks that every returned face is `loaded` *and has the requested weight* — a missing weight otherwise comes back as the nearest one) and checked by `check.mjs` in Task 10.
3. **English copy longer than Chinese in the narrow 9:16 zones** (e.g. "Global Shopping Festival", "Blackcurrant") — expected: wrap/shrink, never clip, never below the minimum size. Pinned by `03-perfume/test/text-fit.test.mjs` (Task 7): every string × zone × ratio × language through `layout()` with a conservative width model.
4. **Interrupted or re-run batch** — a half-written MP4 must never count as done. Pinned in Task 10: encode to `<name>.mp4.part`, rename after ffprobe checks pass; `isDone()` needs both `.mp4` and the `.json` sidecar (`factory/test/jobs.test.mjs`).
5. **A voice-over line missing from the clip index, out of date, or longer than its slot** (e.g. a new price in a promo line, or a copy edit without re-running `vo.mjs`) — expected: loud failure, not silent narration gaps or the old words. Pinned in Task 16: `03-perfume/test/vo.test.mjs` checks that every planned line has a clip made from its current words, voice and speed that fits its slot, and that no two different lines share a recording. `voPlan` throws on a missing, stale or too-long clip, so the preview, `render.mjs` and `check.mjs` all fail on it (Step 8 proves it for a missing index and a missing clip). `vo.mjs` exits 1 on a line still too long at 1.15×.

---

## File Map

```
SHOW/
├── package.json · .gitignore                  Task 1
├── README.md                                  Task 21  showcase index: the 03 row, npm run serve, the factory note
├── factory/
│   ├── engine/
│   │   ├── rng.js · ease.js · particles.js    Task 1   seeded PRNG, easing, closed-form drifting particles
│   │   ├── variant.js                         Task 2   axes, URL/manifest parsing, grid expansion, naming, safe areas
│   │   ├── timeline.js                        Task 3   edit list → shot + local time, transitions, hit points
│   │   ├── framing.js                         Task 4   shot intent + aspect ratio → camera pose
│   │   ├── text.js                            Task 5   text tokenize/wrap/fit, conservative width model, layer drawing → Task 20 (a boxed layer's padding counts in the fit; left/right boxes sit on the zone edge)
│   │   ├── mix.js                             Task 6   ducking curve, float WAV writer, clip keys, grid check
│   │   ├── post.js                            Task 8   MSAA scene target, DoF, bloom, AgX + grade + dissolve/flash
│   │   ├── app.js                             Task 8   the frame loop: resolve → shot → framing → render → text
│   │   ├── player.js · player.css             Task 8   live preview UI
│   │   ├── sheet.js                           Task 9   ?sheet contact sheet, ?safe overlay
│   │   ├── exporter.js                        Task 10  start / frame / png / cover / audio
│   │   └── audio.js                           Task 15  synth voices, offline mix, preview sound → Task 16 (voice-over clips + duck)
│   ├── lib/ serve.mjs · args.mjs · browser.mjs   Task 8   static server, CLI args, Chromium launch + GPU check
│   ├── lib/ ffmpeg.mjs · jobs.mjs             Task 10 (encode, probe, job selection, done-markers, index, worker pool) → Task 15 (loudness)
│   ├── snap.mjs                               Task 8   one frame → PNG
│   ├── sheet.mjs                              Task 9   contact sheet → PNG
│   ├── check.mjs                              Task 10  GPU, fonts, determinism, overflow, speed → Task 15 (audio) → Task 16 (voice-over)
│   ├── render.mjs                             Task 10  batch renderer (audio from Task 15)
│   ├── vo.mjs                                 Task 16  Kokoro voice-over generation + audition
│   ├── gallery.html                           Task 10
│   ├── test/*.test.mjs                        Tasks 1–6, 8–10, 13 (post), 15 (audio, loudness), 16 (voice-over plan, duck), 20 (text)
│   └── README.md                              Task 21  film contract + commands (Chinese)
├── 03-perfume/
│   ├── meta.js · skus.js · copy.js · promos.js · captions.js · layouts.js · manifest.json   Task 7 (pure data); copy.js → Task 16 (voices, end slot)
│   ├── index.html · film.js                   Task 8; film.js → Tasks 11–19 (bottle, render, worlds, score, voice-over)
│   ├── js/shots.js                            Task 8 (skeleton) → Task 14
│   ├── js/bottle.js                           Task 8 (proxy) → Task 11 → Tasks 12, 14
│   ├── js/glass.js                            Task 12 → Task 14  layered glass/liquid refraction, ground caustics, the over layer
│   ├── js/drop.js · spray.js                  Task 14  the drop falling into the bottle, the spray mist
│   ├── js/score.js                            Task 15  arrangements, shared SFX + sonic logo (pure data) → Tasks 17–19 (one arrangement per scent)
│   ├── js/worlds/common.js                    Task 8 (envMap) → Task 13 (env from world.env, haze, sky, dew, driftField, billboards)
│   ├── js/worlds/studio.js                    Task 8   neutral studio (debug world, ?world=studio)
│   ├── js/worlds/whitetea.js                  Task 13  misty tea garden, 一芽二叶 dew macro
│   ├── js/worlds/osmanthus.js · seasalt.js · rose.js   Tasks 17–19
│   ├── assets/vo/                             Task 16  committed mp3 clips + index.json
│   ├── test/ data · layouts · text-fit        Task 7;  bottle Task 11;  glass Task 12;  worlds Task 13;  effects Task 14;  score Task 15;  vo Task 16
│   ├── out/                                   gitignored render output
│   └── README.md                              Task 21
└── .claude/skills/new-film/SKILL.md           Task 21
```

**Film contract** (what `03-perfume/film.js` default-exports; the engine reads nothing else). `id`, `axes`, `sceneAxes`, `cuts` and `fileName` come from `03-perfume/meta.js` (`META`, Task 7), so Node scripts and tests can import them without Three.js:

```js
{
  id: '03-perfume',                       // = directory name
  axes: { sku, lang, cut, promo },        // film axes; ar and vo are engine axes (variant.js)
  sceneAxes: ['sku'],                     // changing these rebuilds the scene; others switch live
  cuts: { 15: { shots, hits, cover }, 6: {...} },
  fileName(v),                            // output base name
  layouts,                                // layouts[ar][shot] = { anchor, size, maxW, align, zones: { name: [x, y, w, h] } }
  fonts(v) → [{ family, weight, text }],  // = fontsFor(v): exact strings to preload for this variant
  async setup(ctx),                       // build the scene for ctx.variant.sku
  reset(ctx),                             // restore every per-frame mutable before a shot is evaluated
  shots: { macro(ctx, s), drop, hero, anatomy, spray, end },   // → { camera, text: layers, post }
  render?(ctx, target),                   // optional: draw ctx.scene into the HDR target (03: glass passes, Task 12); default renderer.render(scene, camera)
  score(v, built) → { notes, reverb },    // Task 15: note events for engine/audio.js
  voLines(v) → [{ id, text, voice, speed, at, max }],          // Task 16: the narration; engine/audio.js places it, vo.mjs records it
  audition: { [lang]: [voice, …] },       // Task 16: candidate voices for vo.mjs --audition
}
```

`ctx` (built by `app.js`): `{ THREE, renderer, scene, camera, variant, W, H, ar, post, clips, world, subjects, postDefaults, built, mode, params }`. `mode` is `'live'`, `'render'` or `'sheet'` (Task 9); `params` is the page's `URLSearchParams`.

**World module contract** (`03-perfume/js/worlds/<id>.js`, chosen by `film.setup` from `WORLDS[sku]`): `build(ctx) → { env, haze, post?, macro: { root, camera(s) → intent, post? }, update?(ctx, s), reset?(), dispose?() }`.
- `build` sets `scene.background` and adds its own lights and meshes. It must not touch `ctx.renderer`: from Task 13 a world only describes its reflections as `env = { base?, strip?, k?, fill?(add, B, es) }`, and `film.setup` turns that into `scene.environment` with `envMap`. So every world builds in Node.
- `post` holds the world's grade, merged over `POST_DEFAULTS`. `update` animates the world for the current shot; `reset` restores whatever `update` mutated.
- `haze` is the world's `haze()` from `common.js` (Task 13). From Task 14 the drop inside the bottle and the spray are coloured by it.
- `macro` is the world's opening close-up. Its camera may be a `'fit'` intent, which takes `anchor` / `size` / `maxW` from the layout row, as any fit shot does.
- The macro ends on the hand-off to the drop shot (Task 14). A dew drop gathers at the ingredient's tip and lets go in the macro's last `DROP.pre` seconds. Once released it falls by `fallen(tau)` and stretches by `stretch(tau)` from `drop.js`, with `tau = lt − (dur − DROP.pre)`. The film hard-cuts to the same fall inside the bottle.
- The rules, tested for every world by `03-perfume/test/worlds.test.mjs` (Task 13):
  - a shadow-casting key `DirectionalLight`, and flat ground at y = 0 under the bottle, one `MeshStandardMaterial` without maps. The caustic (Task 12) lands there and reads only `color` / `roughness` / `metalness`;
  - everything within 190 m of the origin (the camera's far plane is 200 m);
  - the macro set outside every bottle shot's frustum and outside the key light's shadow frustum; the bottle outside the macro frame; the macro subject clear of the macro row's text zones;
  - `reset` + `update` give the same scene in whatever order the timeline is visited;
  - from Task 14, `haze` is a `haze()`.

**Bottle interface** (`03-perfume/js/bottle.js`; Task 8 ships a box proxy, Task 11 the real model): `buildBottle(ctx, sku, { logo = null } = {}) → { root, parts: { glass, liquid, collar, pump, cap }, pose({ explode = 0, capLift = 0, press = 0, ripple = 0 }), anchor(name) → [x, y, z], liquidTop() }`. Anchors: `'cap' | 'collar' | 'liquid' | 'nozzle'`. The proxy ignores `logo` and `ripple` and has no `'nozzle'` anchor. Task 11 adds the exports `GLASS`, `SHAPE` (the glass, cavity and liquid as half-plane prisms, for Task 12), `RIPPLE`, `rippleHeight(r, age)` and `logoMask()`. Task 12 adds `bottle.posed` (the last full pose, which `glass.js` reads for the ripple) and makes the dip tube clear. It also puts the glass on layer 2 and the liquid on layer 1; everything else stays on layer 0. Task 14 adds `RIPPLE.at`, the landing point the ripple spreads from. It also hides the pump chamber in the shoulder, and puts what floats in front of the bottle (the spray) on `LAYER.over` (3).
`s` (per shot call): `{ name, lt, dur, u, from, t, row }`. `from` is the entry's `from` (a trimmed shot starts part-way into its own timeline; captions reveal relative to it). `row` = `layouts[ar][name]`.

---

### Task 1: Scaffold + seeded randomness, easing, closed-form particles

**Files:**
- Create: `package.json`, `.gitignore`
- Create: `factory/engine/rng.js`, `factory/engine/ease.js`, `factory/engine/particles.js`
- Test: `factory/test/core.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `rng.js`: `mulberry32(seed) → () => number∈[0,1)`, `hashU32(x) → uint32`, `rand(seed, i) → number∈[0,1)` (stateless), `seedOf(str) → uint32` (FNV-1a).
  - `ease.js`: `clamp(x, a=0, b=1)`, `lerp(a, b, k)`, `inv(a, b, x)` (clamped), `smooth(k)`, `ss(a, b, x)` (smoothstep), `easeInOut(k)`, `easeOut(k)`, `easeIn(k)` (cubic), `expOut(k, s=6)`, `win(x, a, b, c, d)` (fade in a→b, out c→d).
  - `particles.js`: `drift(seed, i, t, box, { vel=[0,-0.1,0], sway=0, swayHz=0.3 }) → [x, y, z, phase, fade]`, box = `[x0, y0, z0, x1, y1, z1]`.

- [ ] **Step 1: Create the scaffold**

`package.json`:

```json
{
  "name": "opus55-showcase",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test '*/test/*.test.mjs'",
    "serve": "node factory/lib/serve.mjs 8765"
  },
  "devDependencies": {
    "playwright": "1.57.0",
    "three": "0.170.0"
  }
}
```

`.gitignore`:

```
node_modules/
*/out/
.DS_Store
```

Run: `npm install` (from SHOW). Expected: `added N packages`, no postinstall browser download needed (build 1200 is cached). Then `git status --short` must not list `node_modules/`.

- [ ] **Step 2: Write the failing test** — `factory/test/core.test.mjs`

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, hashU32, rand, seedOf } from '../engine/rng.js';
import { clamp, lerp, inv, smooth, ss, easeInOut, easeOut, easeIn, expOut, win } from '../engine/ease.js';
import { drift } from '../engine/particles.js';

test('rand is stateless and in [0, 1)', () => {
  const a = [0, 1, 2, 999].map(i => rand(7, i));
  rand(7, 12345); mulberry32(3)(); Math.random();
  assert.deepEqual([0, 1, 2, 999].map(i => rand(7, i)), a);
  for (let i = 0; i < 5000; i++) { const x = rand(42, i); assert.ok(x >= 0 && x < 1); }
  assert.notEqual(rand(7, 1), rand(8, 1));
  assert.notEqual(rand(7, 1), rand(7, 2));
});

test('rand is roughly uniform', () => {
  let s = 0; const n = 20000;
  for (let i = 0; i < n; i++) s += rand(1, i);
  assert.ok(Math.abs(s / n - 0.5) < 0.01);
});

test('mulberry32 repeats for the same seed', () => {
  const a = mulberry32(99), b = mulberry32(99);
  for (let i = 0; i < 10; i++) assert.equal(a(), b());
});

test('hashU32 and seedOf are stable uint32', () => {
  assert.equal(hashU32(0), hashU32(0));
  assert.ok(Number.isInteger(hashU32(123)) && hashU32(123) >= 0 && hashU32(123) < 2 ** 32);
  assert.equal(seedOf('whitetea'), seedOf('whitetea'));
  assert.notEqual(seedOf('whitetea'), seedOf('rose'));
  assert.equal(seedOf(''), 0x811c9dc5);
});

test('easing endpoints and shape', () => {
  assert.equal(clamp(2), 1); assert.equal(clamp(-1), 0); assert.equal(clamp(5, 0, 10), 5);
  assert.equal(lerp(2, 4, 0.5), 3);
  assert.equal(inv(2, 4, 3), 0.5); assert.equal(inv(2, 4, 9), 1);
  for (const f of [smooth, easeInOut, easeOut, easeIn, expOut]) {
    assert.equal(f(0), 0); assert.ok(Math.abs(f(1) - 1) < 1e-12); assert.ok(f(0.5) > 0 && f(0.5) < 1);
    assert.equal(f(-1), 0); assert.ok(Math.abs(f(2) - 1) < 1e-12);
  }
  assert.equal(smooth(0.5), 0.5); assert.equal(ss(0, 2, 1), 0.5);
  assert.equal(win(0, 1, 2, 3, 4), 0); assert.equal(win(2.5, 1, 2, 3, 4), 1); assert.equal(win(5, 1, 2, 3, 4), 0);
});

test('drift is a pure function of (seed, i, t)', () => {
  const box = [-1, 0, -1, 1, 2, 1], o = { vel: [0, -0.3, 0], sway: 0.1 };
  const a = drift(5, 3, 4.2, box, o);
  drift(5, 3, 0.1, box, o); drift(5, 4, 9, box, o);
  assert.deepEqual(drift(5, 3, 4.2, box, o), a);
});

test('drift stays in the box (plus sway), fades near the wrap, moves smoothly', () => {
  const box = [-1, 0, -1, 1, 2, 1], o = { vel: [0, -0.3, 0], sway: 0.1 };
  for (let i = 0; i < 200; i++) for (let t = 0; t < 20; t += 0.37) {
    const [x, y, z, ph, f] = drift(1, i, t, box, o);
    assert.ok(x >= -1.11 && x <= 1.11 && z >= -1.07 && z <= 1.07, `x/z out of box: ${x} ${z}`);
    assert.ok(y >= 0 && y <= 2, `y out of box: ${y}`);
    assert.ok(ph >= 0 && ph < 1 && f >= 0 && f <= 1);
    const [, y2, , , f2] = drift(1, i, t + 1 / 60, box, o);
    if (Math.abs(y2 - y) > 0.1) assert.ok(f < 0.05 && f2 < 0.05, 'a wrap jump must be invisible');
  }
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../factory/engine/rng.js'`.

- [ ] **Step 4: Implement** `factory/engine/rng.js`

```js
// rng.js — 可复现的伪随机：画面与音频里凡是"随机"都从这里取，同一种子、同一序号永远给出同一个数

export function mulberry32(a) {
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 32 位整数哈希（lowbias32） */
export function hashU32(x) {
  x = (x ^ (x >>> 16)) >>> 0; x = Math.imul(x, 0x7feb352d) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0; x = Math.imul(x, 0x846ca68b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/** 无状态随机：第 i 个数只由 (seed, i) 决定 */
export const rand = (seed, i) => hashU32((seed ^ hashU32((i + 0x9e3779b9) >>> 0)) >>> 0) / 4294967296;

/** 字符串 → 种子（FNV-1a） */
export function seedOf(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
```

`factory/engine/ease.js`

```js
// ease.js — 插值与缓动（输入先夹到 0–1）

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const inv = (a, b, x) => clamp((x - a) / (b - a));
export const smooth = k => { k = clamp(k); return k * k * (3 - 2 * k); };
export const ss = (a, b, x) => smooth((x - a) / (b - a));
export const easeInOut = k => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
export const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
export const easeIn = k => Math.pow(clamp(k), 3);
export const expOut = (k, s = 6) => (1 - Math.exp(-s * clamp(k))) / (1 - Math.exp(-s));
/** 窗口：a→b 渐入，c→d 渐出 */
export const win = (x, a, b, c, d) => ss(a, b, x) * (1 - ss(c, d, x));
```

`factory/engine/particles.js`

```js
// particles.js — 闭式粒子：第 i 颗在时刻 t 的位置只由 (seed, i, t) 决定，没有逐帧模拟，任意跳转都一致
import { rand } from './rng.js';
import { win } from './ease.js';

const wrap = (x, a, b) => a + ((((x - a) % (b - a)) + (b - a)) % (b - a));

/**
 * box = [x0, y0, z0, x1, y1, z1]；vel = 每秒位移（每颗 ±30% 随机）；sway / swayHz = 横向摆幅与频率
 * 返回 [x, y, z, phase, fade]：phase ∈ [0, 1) 供自转用；fade 在主运动轴绕回边界附近淡出，绕回时不闪现
 */
export function drift(seed, i, t, box, { vel = [0, -0.1, 0], sway = 0, swayHz = 0.3 } = {}) {
  const r = j => rand(seed, i * 8 + j), k = 0.7 + 0.6 * r(3);
  let main = 0; for (let a = 1; a < 3; a++) if (Math.abs(vel[a]) > Math.abs(vel[main])) main = a;
  const p = [0, 0, 0]; let fade = 1;
  for (let a = 0; a < 3; a++) {
    const lo = box[a], hi = box[a + 3];
    p[a] = wrap(lo + (hi - lo) * r(a) + vel[a] * k * t, lo, hi);
    if (a === main && vel[a]) fade = win((p[a] - lo) / (hi - lo), 0, 0.08, 0.92, 1);
  }
  const ph = r(4) * Math.PI * 2, w = 2 * Math.PI * swayHz * (0.8 + 0.4 * r(5));
  p[0] += sway * Math.sin(w * t + ph); p[2] += 0.6 * sway * Math.cos(0.7 * w * t + ph);
  return [p[0], p[1], p[2], (((r(6) + t * (0.1 + 0.2 * r(7))) % 1) + 1) % 1, fade];
}
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore factory/engine/rng.js factory/engine/ease.js factory/engine/particles.js factory/test/core.test.mjs
git commit -m "Add factory scaffold: seeded PRNG, easing, closed-form particles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: Variant system

**Files:**
- Create: `factory/engine/variant.js`
- Test: `factory/test/variant.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ASPECTS = { '9x16': [1080, 1920], '1x1': [1080, 1080], '16x9': [1920, 1080] }`
  - `ENGINE_AXES = { ar: ['9x16', '1x1', '16x9'], vo: ['on', 'off'] }`
  - `UNSAFE[ar] → [[x, y, w, h], ...]` platform-UI rectangles in frame fractions (y down); `MARGIN = 0.04`
  - `MIN_TEXT = { '9x16': 0.035, '1x1': 0.035, '16x9': 0.03 }` (fraction of the short side)
  - `allAxes(film) → { ...film.axes, ar, vo }` (this key order is the canonical axis order)
  - `parseVariant(film, params: URLSearchParams | object) → variant` (missing → first value; unknown → throws `unknown <axis>: <value>`; `cut` comes back as the number from `film.axes`)
  - `expandJobs(film, manifest, { all = false }) → variant[]` (deduped by `film.fileName`, manifest order; `all` = full grid with `vo: 'on'`)
  - `variantQuery(film, v) → 'sku=…&lang=…&cut=…&promo=…&ar=…&vo=…'`, `variantName(film, v) → film.fileName(v)`

- [ ] **Step 1: Write the failing test** — `factory/test/variant.test.mjs`

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { ASPECTS, ENGINE_AXES, UNSAFE, MIN_TEXT, allAxes, parseVariant, expandJobs, variantQuery, variantName } from '../engine/variant.js';

const film = {
  axes: { sku: ['a', 'b'], lang: ['zh', 'en'], cut: [15, 6], promo: ['none', 'x'] },
  fileName: v => `t_${v.sku}_${v.cut}s_${v.ar}_${v.lang}${v.promo === 'none' ? '' : '_' + v.promo}${v.vo === 'off' ? '_novo' : ''}`,
};

test('aspects, engine axes, safe areas', () => {
  assert.deepEqual(Object.keys(ASPECTS), ['9x16', '1x1', '16x9']);
  assert.deepEqual(ENGINE_AXES.vo, ['on', 'off']);
  for (const ar of ENGINE_AXES.ar) { assert.ok(Array.isArray(UNSAFE[ar])); assert.ok(MIN_TEXT[ar] >= 0.03); }
  assert.deepEqual(Object.keys(allAxes(film)), ['sku', 'lang', 'cut', 'promo', 'ar', 'vo']);
});

test('parseVariant: defaults, URL params, numbers, errors', () => {
  assert.deepEqual(parseVariant(film, {}), { sku: 'a', lang: 'zh', cut: 15, promo: 'none', ar: '9x16', vo: 'on' });
  const v = parseVariant(film, new URLSearchParams('cut=6&ar=16x9&render'));
  assert.equal(v.cut, 6); assert.equal(v.ar, '16x9');
  assert.throws(() => parseVariant(film, { sku: 'zzz' }), /unknown sku: zzz/);
  assert.throws(() => parseVariant(film, { ar: '4x3' }), /unknown ar/);
});

test('variantQuery round-trips', () => {
  const v = { sku: 'b', lang: 'en', cut: 6, promo: 'x', ar: '1x1', vo: 'off' };
  assert.equal(variantQuery(film, v), 'sku=b&lang=en&cut=6&promo=x&ar=1x1&vo=off');
  assert.deepEqual(parseVariant(film, new URLSearchParams(variantQuery(film, v))), v);
  assert.equal(variantName(film, v), 't_b_6s_1x1_en_x_novo');
});

test('expandJobs: "*", explicit lists, defaults, dedupe, order', () => {
  const jobs = expandJobs(film, { jobs: [
    { sku: ['*'], ar: ['*'], lang: ['zh'], cut: [15], promo: ['none'] },
    { sku: ['a'], ar: ['9x16'], lang: ['zh'], cut: [15], promo: ['none'] },   // duplicate of the first grid
    { sku: ['b'], ar: ['1x1'], lang: ['en'], cut: [6], promo: ['x'], vo: ['off'] },
  ] });
  assert.equal(jobs.length, 2 * 3 + 1);
  assert.deepEqual(jobs[0], { sku: 'a', lang: 'zh', cut: 15, promo: 'none', ar: '9x16', vo: 'on' });
  assert.equal(jobs.at(-1).vo, 'off');
  assert.equal(new Set(jobs.map(film.fileName)).size, jobs.length);
});

test('expandJobs: all = full grid with voice-over on', () => {
  const jobs = expandJobs(film, { jobs: [] }, { all: true });
  assert.equal(jobs.length, 2 * 2 * 2 * 2 * 3);
  assert.ok(jobs.every(j => j.vo === 'on'));
});

test('expandJobs rejects unknown axes and values', () => {
  assert.throws(() => expandJobs(film, { jobs: [{ colour: ['red'] }] }), /unknown axis colour/);
  assert.throws(() => expandJobs(film, { jobs: [{ cut: [30] }] }), /unknown cut: 30/);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test factory/test/variant.test.mjs`
Expected: FAIL — `Cannot find module '.../factory/engine/variant.js'`.

- [ ] **Step 3: Implement** `factory/engine/variant.js`

```js
// variant.js — 变体：每条轴取一个值（香型、比例、语言、时长、促销、配音）；URL / 清单解析、网格展开、文件命名

export const ASPECTS = { '9x16': [1080, 1920], '1x1': [1080, 1080], '16x9': [1920, 1080] };
export const ENGINE_AXES = { ar: Object.keys(ASPECTS), vo: ['on', 'off'] };
// 平台界面（图标列、标题与字幕带、状态栏）会盖住的区域：画面比例坐标 [x, y, w, h]，y 向下
export const UNSAFE = {
  '9x16': [[0, 0, 1, 0.07], [0.86, 0.34, 0.14, 0.52], [0, 0.82, 1, 0.18]],
  '1x1': [],
  '16x9': [],
};
export const MARGIN = 0.04;
// 最小字号：画面短边的比例
export const MIN_TEXT = { '9x16': 0.035, '1x1': 0.035, '16x9': 0.03 };

export const allAxes = film => ({ ...film.axes, ...ENGINE_AXES });

const pick = (name, list, s) => {
  const v = list.find(x => String(x) === String(s));
  if (v === undefined) throw new Error(`unknown ${name}: ${s} (expected ${list.join(' | ')})`);
  return v;
};

export function parseVariant(film, params = {}) {
  const get = k => (params instanceof URLSearchParams ? params.get(k) : params[k]);
  const v = {};
  for (const [k, list] of Object.entries(allAxes(film))) {
    const s = get(k);
    v[k] = s == null || s === '' ? list[0] : pick(k, list, s);
  }
  return v;
}

/** 清单 { jobs: [{ axis: [值 | '*'] }] } → 变体列表；未写的轴取第一个值；按文件名去重 */
export function expandJobs(film, manifest, { all = false } = {}) {
  const axes = allAxes(film);
  const grids = all ? [{ ...Object.fromEntries(Object.keys(axes).map(k => [k, ['*']])), vo: ['on'] }] : manifest.jobs;
  const out = new Map();
  for (const g of grids) {
    for (const k of Object.keys(g)) if (!(k in axes)) throw new Error(`manifest: unknown axis ${k}`);
    let combos = [{}];
    for (const [k, list] of Object.entries(axes)) {
      const want = g[k] ?? [list[0]], vals = want.includes('*') ? list : want.map(s => pick(k, list, s));
      combos = combos.flatMap(c => vals.map(x => ({ ...c, [k]: x })));
    }
    for (const c of combos) { const n = film.fileName(c); if (!out.has(n)) out.set(n, c); }
  }
  return [...out.values()];
}

export const variantQuery = (film, v) => Object.keys(allAxes(film)).map(k => `${k}=${encodeURIComponent(v[k])}`).join('&');
export const variantName = (film, v) => film.fileName(v);
```

- [ ] **Step 4: Run the tests**

Run: `node --test factory/test/variant.test.mjs`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add factory/engine/variant.js factory/test/variant.test.mjs
git commit -m "Add factory variant system: axes, manifest expansion, naming, safe areas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: Timeline (edit-list resolution)

**Files:**
- Create: `factory/engine/timeline.js`
- Test: `factory/test/timeline.test.mjs`

**Interfaces:**
- Consumes: `smooth`, `clamp` from `ease.js`.
- Produces:
  - Cut data (film side): `{ shots: [{ shot, dur, from = 0, transition = { type: 'cut' } }], hits: { name: seconds }, cover: seconds }`; `transition.type ∈ 'cut' | 'flash' | 'dissolve'`, with `transition.dur` (seconds) for flash/dissolve. A transition belongs to the entry it leads *into*.
  - `buildCut(cut) → built = { entries: [{ shot, start, end, from, dur, transition }], duration, hits, cover }` where `dur = from + entry.dur` (the shot's own local length). Throws on an empty list, `dur ≤ 0`, unknown transition type, or a transition longer than its entry.
  - `resolve(built, t) → { index, shot, lt, dur, u, start, end, flash, prev }`:
    - `lt = from + (t − start)`; `u = clamp(lt / dur)`; `t` is clamped to `[0, duration]`; `t = duration` resolves to the last entry with `u = 1`.
    - `flash ∈ [0, 1]` = `1 − into / transition.dur` during a flash (else 0).
    - `prev = null` or `{ shot, lt, dur, u, k }` during a dissolve: the outgoing shot keeps running past its end (`lt > dur`, `u = 1`); `k = smooth(into / transition.dur)` is the weight of the incoming shot.
  - `shotAt(built, name) → entry | undefined` (first entry of that shot).

- [ ] **Step 1: Write the failing test** — `factory/test/timeline.test.mjs`

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCut, resolve, shotAt } from '../engine/timeline.js';

// 与 03-perfume/meta.js 相同的两条剪辑表（本测试自带一份，不依赖成片数据）
const C15 = { shots: [
  { shot: 'macro', dur: 2.25 }, { shot: 'drop', dur: 2.25 },
  { shot: 'hero', dur: 3.0, transition: { type: 'dissolve', dur: 0.3 } },
  { shot: 'anatomy', dur: 3.0 },
  { shot: 'spray', dur: 1.5, transition: { type: 'dissolve', dur: 0.25 } },
  { shot: 'end', dur: 3.0, transition: { type: 'dissolve', dur: 0.4 } },
], hits: { land: 3.0, streak: 6.0, logo: 12.0 }, cover: 6.4 };
const C6 = { shots: [
  { shot: 'drop', dur: 1.5, from: 0.75 },
  { shot: 'hero', dur: 1.5, from: 0.75, transition: { type: 'flash', dur: 0.2 } },
  { shot: 'end', dur: 3.0, transition: { type: 'dissolve', dur: 0.3 } },
], hits: { land: 0, logo: 3.0 }, cover: 2.6 };
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} ≠ ${b}`);

test('buildCut: starts, ends, durations', () => {
  const b = buildCut(C15);
  near(b.duration, 15);
  assert.deepEqual(b.entries.map(e => e.start), [0, 2.25, 4.5, 7.5, 10.5, 12]);
  assert.equal(b.entries[2].dur, 3.0);
  const b6 = buildCut(C6);
  near(b6.duration, 6); assert.equal(b6.entries[0].dur, 2.25); assert.equal(b6.entries[0].from, 0.75);
  assert.deepEqual(b6.hits, { land: 0, logo: 3.0 }); assert.equal(b6.cover, 2.6);
  assert.equal(shotAt(b, 'anatomy').start, 7.5);
});

test('buildCut validates', () => {
  assert.throws(() => buildCut({ shots: [] }), /empty/);
  assert.throws(() => buildCut({ shots: [{ shot: 'a', dur: 0 }] }), /dur/);
  assert.throws(() => buildCut({ shots: [{ shot: 'a', dur: 1 }, { shot: 'b', dur: 1, transition: { type: 'wipe', dur: 0.2 } }] }), /transition/);
  assert.throws(() => buildCut({ shots: [{ shot: 'a', dur: 1 }, { shot: 'b', dur: 0.2, transition: { type: 'dissolve', dur: 0.5 } }] }), /longer/);
});

test('resolve: exact boundaries go to the next shot', () => {
  const b = buildCut(C15);
  assert.equal(resolve(b, 0).shot, 'macro'); near(resolve(b, 0).lt, 0);
  assert.equal(resolve(b, 2.2499).shot, 'macro');
  const r = resolve(b, 2.25); assert.equal(r.shot, 'drop'); near(r.lt, 0);
  assert.equal(resolve(b, 7.5).shot, 'anatomy');
});

test('resolve: local time, u, from-trim, clamping', () => {
  const b = buildCut(C15), r = resolve(b, 3.0);
  assert.equal(r.shot, 'drop'); near(r.lt, 0.75); near(r.u, 0.75 / 2.25);
  const b6 = buildCut(C6), s = resolve(b6, 0);
  assert.equal(s.shot, 'drop'); near(s.lt, 0.75); near(s.u, 0.75 / 2.25);
  const h = resolve(b6, 1.5); assert.equal(h.shot, 'hero'); near(h.lt, 0.75);
  const e = resolve(b6, 6); assert.equal(e.shot, 'end'); near(e.u, 1);
  assert.equal(resolve(b6, 99).shot, 'end'); assert.equal(resolve(b6, -1).shot, 'drop');
});

test('resolve: flash decays linearly over its length', () => {
  const b6 = buildCut(C6);
  near(resolve(b6, 1.5).flash, 1); near(resolve(b6, 1.6).flash, 0.5); near(resolve(b6, 1.7).flash, 0);
  assert.equal(resolve(b6, 1.0).flash, 0); assert.equal(resolve(b6, 1.6).prev, null);
});

test('resolve: dissolve keeps the outgoing shot running', () => {
  const b = buildCut(C15), r = resolve(b, 4.65);
  assert.equal(r.shot, 'hero'); near(r.lt, 0.15);
  assert.equal(r.prev.shot, 'drop'); near(r.prev.lt, 2.4); near(r.prev.u, 1);
  near(r.prev.k, 0.5);
  assert.equal(resolve(b, 4.85).prev, null);
  assert.equal(resolve(b, 4.5).prev.k, 0);
});

test('resolve is pure: any call order gives the same answers', () => {
  const b = buildCut(C15), ts = [0, 14.99, 3.3, 7.6, 1, 12.2, 4.6, 15];
  const a = ts.map(t => resolve(b, t));
  const c = [...ts].reverse().map(t => resolve(b, t)).reverse();
  assert.deepEqual(a, c);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test factory/test/timeline.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `factory/engine/timeline.js`

```js
// timeline.js — 剪辑表：[{ shot, dur, from, transition }] → 任意时刻 t 在哪个镜头、镜头本地时间、转场状态
// 转场属于"切入"的那一条；叠化时上一镜头继续往后播（lt 超过自身时长），闪白从 1 线性衰减到 0
import { clamp, smooth } from './ease.js';

const TYPES = ['cut', 'flash', 'dissolve'];

export function buildCut(cut) {
  if (!cut?.shots?.length) throw new Error('cut: empty edit list');
  let start = 0;
  const entries = cut.shots.map((e, i) => {
    if (!(e.dur > 0)) throw new Error(`cut: entry ${i} (${e.shot}) needs dur > 0`);
    const transition = e.transition ?? { type: 'cut' };
    if (!TYPES.includes(transition.type)) throw new Error(`cut: entry ${i} has unknown transition ${transition.type}`);
    if (transition.type !== 'cut' && !(transition.dur > 0 && transition.dur <= e.dur)) throw new Error(`cut: entry ${i} transition is longer than the entry`);
    const from = e.from ?? 0, out = { shot: e.shot, start, end: start + e.dur, from, dur: from + e.dur, transition };
    start += e.dur;
    return out;
  });
  return { entries, duration: start, hits: { ...(cut.hits ?? {}) }, cover: cut.cover ?? 0 };
}

const local = (e, t) => { const lt = e.from + (t - e.start); return { shot: e.shot, lt, dur: e.dur, u: clamp(lt / e.dur) }; };

export function resolve(built, t) {
  const { entries, duration } = built;
  t = clamp(t, 0, duration);
  let index = entries.findIndex(e => t < e.end - 1e-9);
  if (index < 0) index = entries.length - 1;
  const e = entries[index], into = t - e.start, tr = e.transition;
  let flash = 0, prev = null;
  if (tr.type === 'flash' && into < tr.dur) flash = 1 - into / tr.dur;
  if (tr.type === 'dissolve' && index > 0 && into < tr.dur) prev = { ...local(entries[index - 1], t), k: smooth(into / tr.dur) };
  return { index, ...local(e, t), start: e.start, end: e.end, flash, prev };
}

export const shotAt = (built, name) => built.entries.find(e => e.shot === name);
```

- [ ] **Step 4: Run the tests**

Run: `node --test factory/test/timeline.test.mjs`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add factory/engine/timeline.js factory/test/timeline.test.mjs
git commit -m "Add factory timeline: edit lists, trims, flash and dissolve transitions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: Framing solver

**Files:**
- Create: `factory/engine/framing.js`
- Test: `factory/test/framing.test.mjs`

**Interfaces:**
- Consumes: `three` (Node resolves it from `SHOW/node_modules`, the browser from the importmap); `lerp` from `ease.js`.
- Produces:
  - Frame coordinates everywhere: fractions of the full frame, `x` right, `y` **down**, `(0,0)` top-left.
  - A **pose** is plain data: `{ position: [x,y,z], target: [x,y,z], up: [0,1,0], fov (vertical, degrees), offset: [ox, oy] }`.
  - Shot camera **intents** (returned by shots as `camera`):
    - `{ type: 'fit', box: THREE.Box3, dir: [x,y,z], fov, up?, scale?, anchor?, size?, maxW? }` — `dir` points from the subject toward the camera; anchor/size/maxW default to the layout row; `scale` multiplies `size`.
    - `{ type: 'free', position, target, fov, up?, fovAxis?: 'v' | 'short', offset? }` — `'short'` makes `fov` apply to the frame's short side (portrait frames widen the vertical fov).
    - `{ type: 'blend', a: intent, b: intent, k }`.
  - `fitPose({ box, dir, up, fov, aspect, anchor, size, maxW }) → pose`: camera on the ray `center + dir·d`, `d` bisected so the projected box height = `size` (or its width = `maxW`, whichever binds first); `offset` = projected box centre − anchor.
  - `freePose(intent, aspect) → pose`, `blendPose(a, b, k) → pose`
  - `solvePose(intent, layoutRow, aspect) → pose` (layoutRow = `layouts[ar][shot]`)
  - `applyPose(camera, pose, W, H)` — sets fov/aspect/position/up/lookAt, `setViewOffset(W, H, ox·W, oy·H, W, H)` (or `clearViewOffset()`), updates matrices.
  - `project(camera, box) → { minX, maxX, minY, maxY }` in frame fractions; `projectPoint(camera, [x,y,z]) → [fx, fy]`.

- [ ] **Step 1: Write the failing test** — `factory/test/framing.test.mjs`

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { fitPose, freePose, blendPose, solvePose, applyPose, project, projectPoint } from '../engine/framing.js';
import { ASPECTS } from '../engine/variant.js';

const bottle = new THREE.Box3(new THREE.Vector3(-0.36, 0, -0.23), new THREE.Vector3(0.36, 1.34, 0.23));
const cam = () => new THREE.PerspectiveCamera(30, 1, 0.01, 200);
const fitIn = (ar, row, dir = [0.35, 0.15, 1]) => {
  const [W, H] = ASPECTS[ar], c = cam();
  applyPose(c, solvePose({ type: 'fit', box: bottle, dir, fov: 28 }, row, W / H), W, H);
  return project(c, bottle);
};

test('fit: box height = size and centre = anchor (±1% of frame) in every ratio', () => {
  for (const ar of Object.keys(ASPECTS)) {
    const row = { anchor: [0.46, 0.4], size: 0.46, maxW: 0.9 }, p = fitIn(ar, row);
    assert.ok(Math.abs(p.maxY - p.minY - 0.46) < 0.01, `${ar} height ${p.maxY - p.minY}`);
    assert.ok(Math.abs((p.minX + p.maxX) / 2 - 0.46) < 0.01, `${ar} cx`);
    assert.ok(Math.abs((p.minY + p.maxY) / 2 - 0.4) < 0.01, `${ar} cy`);
  }
});

test('fit: width limit binds on narrow frames', () => {
  const p = fitIn('9x16', { anchor: [0.5, 0.5], size: 0.8, maxW: 0.3 });
  assert.ok(p.maxX - p.minX <= 0.3 + 0.01);
  assert.ok(p.maxY - p.minY < 0.8);
});

test('fit: perspective is identical across ratios when height binds', () => {
  const row = { anchor: [0.5, 0.45], size: 0.5, maxW: 0.9 };
  const a = fitPose({ box: bottle, dir: [0.35, 0.15, 1], fov: 28, aspect: 1, ...row });
  const b = fitPose({ box: bottle, dir: [0.35, 0.15, 1], fov: 28, aspect: 16 / 9, ...row });
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(a.position[i] - b.position[i]) < 1e-6);
});

test('fit: scale and anchor override the layout row', () => {
  const row = { anchor: [0.5, 0.5], size: 0.4, maxW: 0.9 }, [W, H] = ASPECTS['1x1'], c = cam();
  applyPose(c, solvePose({ type: 'fit', box: bottle, dir: [0, 0, 1], fov: 28, scale: 1.5, anchor: [0.3, 0.6] }, row, W / H), W, H);
  const p = project(c, bottle);
  assert.ok(Math.abs(p.maxY - p.minY - 0.6) < 0.01);
  assert.ok(Math.abs((p.minX + p.maxX) / 2 - 0.3) < 0.01 && Math.abs((p.minY + p.maxY) / 2 - 0.6) < 0.01);
});

test('free: short-axis fov widens the vertical fov on portrait frames only', () => {
  const i = { type: 'free', position: [0, 0, 3], target: [0, 0, 0], fov: 30, fovAxis: 'short' };
  assert.ok(freePose(i, 9 / 16).fov > 30);
  assert.equal(freePose(i, 16 / 9).fov, 30);
  assert.equal(freePose({ ...i, fovAxis: 'v' }, 9 / 16).fov, 30);
  const [W, H] = ASPECTS['9x16'], c = cam(); applyPose(c, freePose(i, W / H), W, H);
  const [fx, fy] = projectPoint(c, [0, 0, 0]);
  assert.ok(Math.abs(fx - 0.5) < 1e-6 && Math.abs(fy - 0.5) < 1e-6);
});

test('blend interpolates poses', () => {
  const a = freePose({ position: [0, 0, 2], target: [0, 0, 0], fov: 20 }, 1);
  const b = freePose({ position: [2, 0, 2], target: [0, 1, 0], fov: 40, offset: [0.1, 0] }, 1);
  const m = blendPose(a, b, 0.5);
  assert.deepEqual(m.position, [1, 0, 2]); assert.deepEqual(m.target, [0, 0.5, 0]);
  assert.equal(m.fov, 30); assert.deepEqual(m.offset, [0.05, 0]);
  assert.deepEqual(solvePose({ type: 'blend', a: { type: 'free', ...a }, b: { type: 'free', ...b }, k: 0 }, {}, 1).position, a.position);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test factory/test/framing.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `factory/engine/framing.js`

```js
// framing.js — 镜头意图 → 相机位姿。镜头只说"拍谁、从哪个方向、占画面多高、放在哪"，
// 这里按比例反解相机距离，再用 setViewOffset 平移画面（不转相机），所以三种比例的透视完全一致
import * as THREE from 'three';
import { lerp } from './ease.js';

const _v = new THREE.Vector3();

export function project(camera, box) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < 8; i++) {
    _v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
    const x = (_v.x + 1) / 2, y = (1 - _v.y) / 2;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return { minX, maxX, minY, maxY };
}

export function projectPoint(camera, p) {
  _v.fromArray(p).project(camera);
  return [(_v.x + 1) / 2, (1 - _v.y) / 2];
}

export function fitPose({ box, dir, up = [0, 1, 0], fov, aspect, anchor, size, maxW = 0.9 }) {
  const c = box.getCenter(new THREE.Vector3()), r = box.getBoundingSphere(new THREE.Sphere()).radius;
  const d0 = new THREE.Vector3(...dir).normalize(), cam = new THREE.PerspectiveCamera(fov, aspect, 0.001, 1e4);
  const at = d => {
    cam.position.copy(c).addScaledVector(d0, d); cam.up.fromArray(up); cam.lookAt(c);
    cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    return project(cam, box);
  };
  let lo = r * 1.001, hi = r * 400;
  for (let i = 0; i < 60; i++) {                                   // 几何二分：投影尺寸随距离单调变小
    const mid = Math.sqrt(lo * hi), p = at(mid);
    if (p.maxY - p.minY <= size && p.maxX - p.minX <= maxW) hi = mid; else lo = mid;
  }
  const p = at(hi);
  return { position: cam.position.toArray(), target: c.toArray(), up, fov, offset: [(p.minX + p.maxX) / 2 - anchor[0], (p.minY + p.maxY) / 2 - anchor[1]] };
}

export function freePose({ position, target, fov, up = [0, 1, 0], fovAxis = 'v', offset = [0, 0] }, aspect) {
  const v = fovAxis === 'short' && aspect < 1 ? 2 * Math.atan(Math.tan(fov * Math.PI / 360) / aspect) * 180 / Math.PI : fov;
  return { position: [...position], target: [...target], up, fov: v, offset: [...offset] };
}

export function blendPose(a, b, k) {
  const L = (x, y) => x.map((v, i) => lerp(v, y[i], k));
  return { position: L(a.position, b.position), target: L(a.target, b.target), up: a.up, fov: lerp(a.fov, b.fov, k), offset: L(a.offset, b.offset) };
}

export function solvePose(intent, row, aspect) {
  if (intent.type === 'blend') return blendPose(solvePose(intent.a, row, aspect), solvePose(intent.b, row, aspect), intent.k);
  if (intent.type === 'free') return freePose(intent, aspect);
  return fitPose({ ...intent, aspect, anchor: intent.anchor ?? row.anchor, size: (intent.size ?? row.size) * (intent.scale ?? 1), maxW: intent.maxW ?? row.maxW ?? 0.9 });
}

export function applyPose(camera, pose, W, H) {
  camera.fov = pose.fov; camera.aspect = W / H;
  camera.position.fromArray(pose.position); camera.up.fromArray(pose.up ?? [0, 1, 0]); camera.lookAt(...pose.target);
  const [ox, oy] = pose.offset ?? [0, 0];
  if (ox || oy) camera.setViewOffset(W, H, ox * W, oy * H, W, H); else camera.clearViewOffset();
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test factory/test/framing.test.mjs`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add factory/engine/framing.js factory/test/framing.test.mjs
git commit -m "Add factory framing solver: fit/free/blend poses with view-offset anchoring

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: Text layout and layer drawing

**Files:**
- Create: `factory/engine/text.js`
- Test: `factory/test/text.test.mjs`

**Interfaces:**
- Consumes: `clamp`, `smooth`, `inv`, `ss` from `ease.js`.
- Produces:
  - `NO_START = '，。、；：！？）》」』’”…·%,.;:!?)]}'`, `NO_END = '（《「『‘“([{¥$'`
  - `fontStr(font, px) → CSS font string`; `font = { family, weight = 400, style = 'normal', fallback = 'serif' }`
  - `tokenize(text, lang) → string[]` — en: words (`\n` kept as its own token); zh: single characters, but Latin/digit runs (`50`, `ml`, `WENJING`, `11.11`) stay whole.
  - `wrap(tokens, fits: (s) => bool, lang) → string[]` — greedy; zh applies 避头尾 by pulling the previous character down.
  - `measure(s, font, trackingPx) → px` is always injected: `canvasMeasure(ctx)` in the browser, `approxMeasure` in Node (a deliberately wide model: CJK 1.0 em, caps 0.72, lowercase 0.56, digits/currency 0.62, space 0.3, other 0.4, plus tracking per character).
  - `layout(measure, { text, lang, font, zone: [x,y,w,h] px, size px, min px = size/2, lineHeight = 1.25, maxLines = ∞, tracking em = 0 }) → { size, font (string), tracking (px), lines, width, height, overflow }` — shrinks 4% per step down to `min`; `overflow` = still doesn't fit at `min`.
  - Layer spec (film side, see Task 7 `captions.js`): `{ id, text, lang, font: fontObj, zone: 'name', size: fraction of short side, min?, in?: [a,b], out?: [c,d], align = 'left'|'center'|'right', valign = 'top'|'middle'|'bottom', color, tracking?, lineHeight?, maxLines?, box?: { fill, color, pad, radius }, strike?, pop?, shadow?: { color, blur }, leader?: { world: [x,y,z], color? } }`
  - `prepareLayer(spec, { lt, zones, W, H, minFrac, preview }) → layer in pixels` with `reveal = inv(in)` (1 if absent), `alpha = 1 − ss(out)` (1 if absent), `min = max(spec.min ?? 0, minFrac) · short side`, `showOverflow = preview`. Throws `text layer <id>: no zone <zone>`. (The app converts `leader.world` to `leader.at = [px, py]` before calling it.)
  - `drawLayer(ctx, layer, measure) → layout result` — per-line staggered reveal, badge box, strike-through, pop scale, leader line + dot, red overflow box when `showOverflow`.

- [ ] **Step 1: Write the failing test** — `factory/test/text.test.mjs`

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { NO_START, NO_END, fontStr, tokenize, wrap, layout, approxMeasure as M, prepareLayer } from '../engine/text.js';

const F = { family: 'Test', weight: 600 };
const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≠ ${b}`);

test('fontStr and approxMeasure', () => {
  assert.equal(fontStr(F, 40), 'normal 600 40.00px "Test", serif');
  assert.equal(M('闻境', fontStr(F, 40)), 80);
  assert.equal(M('闻境', fontStr(F, 40), 4), 88);
  assert.ok(M('WENJING', fontStr(F, 40)) > M('wenjing', fontStr(F, 40)));
});

test('tokenize keeps Latin runs whole inside Chinese', () => {
  assert.deepEqual(tokenize('50 ml · 浓香水', 'zh').filter(s => s.trim()), ['50', 'ml', '·', '浓', '香', '水']);
  assert.ok(tokenize('WENJING 闻境', 'zh').includes('WENJING'));
  assert.ok(tokenize('双11 到手价', 'zh').includes('11'));
  assert.deepEqual(tokenize('TOP\nBergamot  Tea', 'en'), ['TOP', '\n', 'Bergamot', 'Tea']);
});

test('en wraps per word and never splits a word', () => {
  const r = layout(M, { text: 'Global Shopping Festival', lang: 'en', font: F, zone: [0, 0, 330, 400], size: 40, min: 30 });
  assert.ok(r.lines.length >= 2);
  assert.equal(r.lines.join(' '), 'Global Shopping Festival');
  assert.equal(r.overflow, false);
});

test('zh never starts a line with closing punctuation, never ends with an opening one', () => {
  const texts = ['一滴晨露，一片茶山。清晨的第一缕光，落在叶尖上。', '限时（双11）好价，到手更低！《闻境》新品「白茶」'];
  for (const text of texts) for (let w = 120; w < 640; w += 7) {
    const r = layout(M, { text, lang: 'zh', font: F, zone: [0, 0, w, 4000], size: 40, min: 40 });
    for (const l of r.lines) {
      assert.ok(!NO_START.includes(l[0]), `"${l}" starts with punctuation at width ${w}`);
      assert.ok(!NO_END.includes(l.at(-1)), `"${l}" ends with an opening bracket at width ${w}`);
    }
    assert.equal(r.lines.join(''), text);
  }
});

test('\\n forces a break', () => {
  const r = layout(M, { text: 'TOP\nBergamot · Green Tea', lang: 'en', font: F, zone: [0, 0, 2000, 400], size: 40, min: 30 });
  assert.deepEqual(r.lines, ['TOP', 'Bergamot · Green Tea']);
});

test('shrinks to fit, respects maxLines, never goes below min', () => {
  const r = layout(M, { text: 'Eau de Parfum', lang: 'en', font: F, zone: [0, 0, 260, 200], size: 60, min: 20, maxLines: 1 });
  assert.equal(r.lines.length, 1); assert.ok(r.size < 60 && r.size >= 20); assert.ok(r.width <= 260.5); assert.equal(r.overflow, false);
  const o = layout(M, { text: 'Supercalifragilistic', lang: 'en', font: F, zone: [0, 0, 100, 400], size: 40, min: 30 });
  assert.equal(o.overflow, true); near(o.size, 30);
  const h = layout(M, { text: '一二三四五六七八九十', lang: 'zh', font: F, zone: [0, 0, 100, 60], size: 40, min: 12 });
  assert.ok(h.height <= 60.5 && !h.overflow);
});

test('prepareLayer: pixels, min size rule, reveal and fade windows', () => {
  const env = { lt: 0.75, zones: { z: [0.1, 0.5, 0.8, 0.1] }, W: 1080, H: 1920, minFrac: 0.035, preview: true };
  const L = prepareLayer({ id: 'x', text: 'a', lang: 'en', font: F, zone: 'z', size: 0.01, in: [0.5, 1.0] }, env);
  assert.deepEqual(L.zone.map(Math.round), [108, 960, 864, 192]);
  near(L.size, 10.8); near(L.min, 37.8); near(L.reveal, 0.5); assert.equal(L.alpha, 1); assert.equal(L.showOverflow, true);
  const O = prepareLayer({ id: 'y', text: 'a', lang: 'en', font: F, zone: 'z', size: 0.05, out: [0.5, 1.0] }, env);
  near(O.alpha, 0.5); assert.equal(O.reveal, 1);
  assert.throws(() => prepareLayer({ id: 'q', zone: 'nope', size: 0.05 }, env), /text layer q: no zone nope/);
});

test('layout starts at the minimum when the requested size is smaller', () => {
  const r = layout(M, { text: 'a', lang: 'en', font: F, zone: [0, 0, 500, 500], size: 10, min: 37.8 });
  near(r.size, 37.8);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test factory/test/text.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `factory/engine/text.js`

```js
// text.js — 画布文字：分词、折行（中文按字 + 避头尾，英文按词）、自动缩字到最小字号、图层绘制
// 量字函数由调用方注入：浏览器里用 canvas 实测，Node 测试里用偏宽的估算模型
import { clamp, smooth, inv, ss } from './ease.js';

export const NO_START = '，。、；：！？）》」』’”…·%,.;:!?)]}';
export const NO_END = '（《「『‘“([{¥$';

export const fontStr = (f, px) => `${f.style ?? 'normal'} ${f.weight ?? 400} ${px.toFixed(2)}px "${f.family}", ${f.fallback ?? 'serif'}`;

export function tokenize(text, lang) {
  if (lang === 'en') return text.split(/(\n)/).flatMap(p => (p === '\n' ? ['\n'] : p.split(/ +/).filter(Boolean)));
  return text.match(/\n|[A-Za-z0-9][A-Za-z0-9.,:%'’\-\/]*|[^\S\n]+|./gu) ?? [];
}

export function wrap(tokens, fits, lang) {
  const J = lang === 'en' ? ' ' : '', lines = [];
  let cur = [];
  const push = () => { lines.push(cur.join(J).trim()); cur = []; };
  for (const tk of tokens) {
    if (tk === '\n') { push(); continue; }
    if (!cur.length && !tk.trim()) continue;                              // 行首空白丢掉
    if (!cur.length || fits([...cur, tk].join(J).trim())) { cur.push(tk); continue; }
    const carry = [tk];
    if (lang !== 'en') {
      while (cur.length > 1 && NO_START.includes(carry[0][0])) carry.unshift(cur.pop());       // 标点不落行首：带上一个字下来
      while (cur.length > 1 && NO_END.includes(cur.at(-1).at(-1))) carry.unshift(cur.pop());   // 开括号不留行尾
    }
    push();
    cur = carry.filter((x, i) => i || x.trim());
  }
  if (cur.length) push();
  return lines;
}

const EM = ch => (ch.codePointAt(0) >= 0x2e80 ? 1 : /[A-Z]/.test(ch) ? 0.72 : /[a-z]/.test(ch) ? 0.56 : /[\d$¥€£]/.test(ch) ? 0.62 : ch === ' ' ? 0.3 : 0.4);
/** 偏宽的字宽估算（Node 测试用）：只会高估，测试通过则真实字体也放得下 */
export function approxMeasure(s, font, tracking = 0) {
  const px = parseFloat(/([\d.]+)px/.exec(font)[1]);
  let w = 0;
  for (const ch of s) w += EM(ch) * px + tracking;
  return w;
}
export const canvasMeasure = ctx => (s, font, tracking = 0) => { ctx.font = font; ctx.letterSpacing = `${tracking}px`; return ctx.measureText(s).width; };

export function layout(measure, o) {
  const { text, lang, font, zone, lineHeight = 1.25, maxLines = Infinity, tracking = 0 } = o;
  const zw = zone[2], zh = zone[3], min = o.min ?? o.size / 2;
  for (let size = Math.max(o.size, min); ; size = Math.max(min, size * 0.96)) {
    const f = fontStr(font, size), tr = tracking * size, fits = s => measure(s, f, tr) <= zw;
    const lines = wrap(tokenize(text, lang), fits, lang);
    const width = Math.max(0, ...lines.map(l => measure(l, f, tr))), height = size * lineHeight * lines.length;
    const ok = width <= zw + 0.5 && height <= zh + 0.5 && lines.length <= maxLines;
    if (ok || size <= min + 1e-9) return { size, font: f, tracking: tr, lines, width, height, overflow: !ok };
  }
}

export function prepareLayer(L, { lt, zones, W, H, minFrac, preview = false }) {
  const z = zones?.[L.zone], short = Math.min(W, H);
  if (!z) throw new Error(`text layer ${L.id}: no zone ${L.zone}`);
  return {
    ...L,
    zone: [z[0] * W, z[1] * H, z[2] * W, z[3] * H],
    size: L.size * short,
    min: Math.max(L.min ?? 0, minFrac) * short,
    reveal: L.in ? inv(L.in[0], L.in[1], lt) : 1,
    alpha: (L.out ? 1 - ss(L.out[0], L.out[1], lt) : 1) * (L.alpha ?? 1),
    showOverflow: preview,
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export function drawLayer(ctx, L, measure) {
  const r = layout(measure, L), [zx, zy, zw, zh] = L.zone, lh = r.size * (L.lineHeight ?? 1.25), n = r.lines.length, bh = lh * n;
  const y0 = L.valign === 'bottom' ? zy + zh - bh : L.valign === 'middle' ? zy + (zh - bh) / 2 : zy;
  const xOf = w => (L.align === 'center' ? zx + (zw - w) / 2 : L.align === 'right' ? zx + zw - w : zx);
  const rev = L.reveal ?? 1, a = L.alpha ?? 1;
  ctx.save();
  if (L.box && rev > 0) {                                                  // 角标底色块
    const pad = (L.box.pad ?? 0.35) * r.size, x = xOf(r.width) - pad;
    ctx.globalAlpha = a * smooth(rev * 2); ctx.fillStyle = L.box.fill;
    roundRect(ctx, x, y0 - pad * 0.4, r.width + 2 * pad, bh + pad * 0.8, (L.box.radius ?? 0.25) * r.size); ctx.fill();
  }
  if (L.leader?.at && rev > 0) {                                           // 引线：从部件点向文字延伸
    const [px, py] = L.leader.at, left = px < zx, ex = left ? xOf(r.width) - 0.4 * r.size : xOf(r.width) + r.width + 0.4 * r.size, ey = y0 + lh * 0.5;
    const k = smooth(rev * 1.6), c = L.leader.color ?? L.color;
    ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = Math.max(1.5, 0.045 * r.size);
    ctx.beginPath(); ctx.arc(px, py, 0.09 * r.size, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + (ex - px) * k, py + (ey - py) * k); ctx.stroke();
  }
  ctx.font = r.font; ctx.letterSpacing = `${r.tracking}px`; ctx.textBaseline = 'middle';
  if (L.shadow) { ctx.shadowColor = L.shadow.color; ctx.shadowBlur = (L.shadow.blur ?? 0.3) * r.size; }
  r.lines.forEach((line, i) => {
    const k = smooth(clamp(rev * (1 + 0.35 * (n - 1)) - 0.35 * i)), w = measure(line, r.font, r.tracking);
    if (k <= 0) return;
    const x = xOf(w), y = y0 + lh * (i + 0.5) + (1 - k) * 0.25 * r.size;
    ctx.globalAlpha = a * k; ctx.fillStyle = L.box?.color ?? L.color;
    ctx.save();
    if (L.pop) { const s = 0.82 + 0.18 * k + 0.1 * Math.sin(Math.PI * k); ctx.translate(x + w / 2, y); ctx.scale(s, s); ctx.translate(-(x + w / 2), -y); }
    ctx.fillText(line, x, y);
    if (L.strike) { ctx.shadowBlur = 0; ctx.fillRect(x - 0.05 * r.size, y - 0.04 * r.size, (w + 0.1 * r.size) * k, Math.max(1.5, 0.07 * r.size)); }
    ctx.restore();
  });
  if (r.overflow && L.showOverflow) { ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.strokeStyle = '#ff2a2a'; ctx.lineWidth = 4; ctx.strokeRect(zx, zy, zw, zh); }
  ctx.restore();
  return r;
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test factory/test/text.test.mjs`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add factory/engine/text.js factory/test/text.test.mjs
git commit -m "Add factory text layout: zh/en wrapping with kinsoku, auto-fit, min size, layers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: Mix helpers (pure audio math)

**Files:**
- Create: `factory/engine/mix.js`
- Test: `factory/test/mix.test.mjs`

**Interfaces:**
- Consumes: `seedOf` from `rng.js`.
- Produces:
  - `duckPoints(slots: [[start, end], ...], { depth = -9, attack = 0.12, release = 0.3 }) → [[t, gain], ...]` — music-bus gain polyline; slots closer than `attack + release` merge (the music stays down between them).
  - `duckAt(points, t) → gain` (linear interpolation; the live preview and the offline render both use these points).
  - `wavFloat32(channels: Float32Array[], sampleRate) → ArrayBuffer` (RIFF/WAVE, format 3 = IEEE float, 32-bit, interleaved).
  - `clipKey(text, voice, speed) → 16-hex string` (cache key of a voice-over clip).
  - `offGrid(times, grid = 1.5, eps = 1e-6) → times not on a multiple of grid`.

- [ ] **Step 1: Write the failing test** — `factory/test/mix.test.mjs`

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { duckPoints, duckAt, wavFloat32, clipKey, offGrid } from '../engine/mix.js';

const G = Math.pow(10, -9 / 20);
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} ≠ ${b}`);

test('duck: one slot ramps down before speech and back up after', () => {
  const p = duckPoints([[4.7, 6.9]]);
  near(duckAt(p, 0), 1); near(duckAt(p, 4.58), 1); near(duckAt(p, 4.7), G); near(duckAt(p, 6.9), G); near(duckAt(p, 7.2), 1);
  near(duckAt(p, 4.64), (1 + G) / 2); assert.ok(duckAt(p, 7.05) > G && duckAt(p, 7.05) < 1);
  near(duckAt(p, 99), 1);
});

test('duck: close slots merge, far slots do not', () => {
  const m = duckPoints([[1, 2], [2.3, 3]]);
  near(duckAt(m, 2.15), G);
  const f = duckPoints([[1, 2], [5, 6]]);
  near(duckAt(f, 3.5), 1);
  assert.deepEqual(duckPoints([[5, 6], [1, 2]]), f);
});

test('duck: a slot at t = 0 starts ducked', () => {
  const p = duckPoints([[0, 1]]);
  near(duckAt(p, 0), G);
});

test('wavFloat32 writes a valid float WAV', () => {
  const L = new Float32Array([0, 0.5, -0.5]), R = new Float32Array([1, -1, 0.25]), buf = wavFloat32([L, R], 48000), v = new DataView(buf);
  const s = (o, n) => String.fromCharCode(...new Uint8Array(buf, o, n));
  assert.equal(s(0, 4), 'RIFF'); assert.equal(s(8, 4), 'WAVE'); assert.equal(s(12, 4), 'fmt '); assert.equal(s(36, 4), 'data');
  assert.equal(v.getUint16(20, true), 3); assert.equal(v.getUint16(22, true), 2); assert.equal(v.getUint32(24, true), 48000);
  assert.equal(v.getUint32(28, true), 48000 * 8); assert.equal(v.getUint16(32, true), 8); assert.equal(v.getUint16(34, true), 32);
  assert.equal(v.getUint32(40, true), 3 * 2 * 4); assert.equal(buf.byteLength, 44 + 24); assert.equal(v.getUint32(4, true), 36 + 24);
  assert.deepEqual([...new Float32Array(buf, 44)], [0, 1, 0.5, -1, -0.5, 0.25]);
});

test('clipKey is stable and sensitive to every input', () => {
  const k = clipKey('闻境白茶。', 'zm_yunjian', 1);
  assert.match(k, /^[0-9a-f]{16}$/);
  assert.equal(clipKey('闻境白茶。', 'zm_yunjian', 1), k);
  assert.notEqual(clipKey('闻境白茶！', 'zm_yunjian', 1), k);
  assert.notEqual(clipKey('闻境白茶。', 'zm_yunxi', 1), k);
  assert.notEqual(clipKey('闻境白茶。', 'zm_yunjian', 1.1), k);
});

test('offGrid finds times off the 1.5 s grid', () => {
  assert.deepEqual(offGrid([0, 1.5, 3, 4.5, 6, 12, 15]), []);
  assert.deepEqual(offGrid([3.1, 6, 2.25]), [3.1, 2.25]);
  assert.deepEqual(offGrid([0.75, 2.25], 0.75), []);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test factory/test/mix.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** `factory/engine/mix.js`

```js
// mix.js — 混音里的纯函数：配音压低音乐的增益折线、32 位浮点 WAV、配音片段的缓存键、节拍网格检查
// 实时预览与离线导出共用这些函数，所以两边的混音一致
import { seedOf } from './rng.js';

/** slots = [[开始, 结束], ...]（秒）→ [[t, 增益], ...]；两段间隔不足 attack + release 时合并，中间不回升 */
export function duckPoints(slots, { depth = -9, attack = 0.12, release = 0.3 } = {}) {
  const g = Math.pow(10, depth / 20), spans = [];
  for (const [s, e] of [...slots].sort((a, b) => a[0] - b[0])) {
    const last = spans.at(-1);
    if (last && s - attack <= last[1] + release) last[1] = Math.max(last[1], e); else spans.push([s, e]);
  }
  const pts = spans.length && spans[0][0] <= 0 ? [] : [[0, 1]];
  for (const [s, e] of spans) {
    if (s > 0) pts.push([Math.max(0, s - attack), 1]);
    pts.push([Math.max(0, s), g], [e, g], [e + release, 1]);
  }
  return pts;
}

export function duckAt(pts, t) {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [t1, g1] = pts[i];
    if (t <= t1) { const [t0, g0] = pts[i - 1]; return t1 > t0 ? g0 + (g1 - g0) * (t - t0) / (t1 - t0) : g1; }
  }
  return pts.at(-1)[1];
}

export function wavFloat32(chs, sr) {
  const n = chs[0].length, nc = chs.length, bytes = n * nc * 4, buf = new ArrayBuffer(44 + bytes), v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + bytes, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 3, true); v.setUint16(22, nc, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * nc * 4, true); v.setUint16(32, nc * 4, true); v.setUint16(34, 32, true);
  str(36, 'data'); v.setUint32(40, bytes, true);
  const out = new Float32Array(buf, 44);
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) out[i * nc + c] = chs[c][i];
  return buf;
}

const hex = x => x.toString(16).padStart(8, '0');
export const clipKey = (text, voice, speed) => { const s = `${voice}|${speed}|${text}`; return hex(seedOf(s)) + hex(seedOf(`${s}#`)); };

export const offGrid = (times, grid = 1.5, eps = 1e-6) => times.filter(t => Math.abs(t / grid - Math.round(t / grid)) * grid > eps);
```

- [ ] **Step 4: Run the tests**

Run: `node --test factory/test/mix.test.mjs`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add factory/engine/mix.js factory/test/mix.test.mjs
git commit -m "Add factory mix helpers: VO ducking curve, float WAV writer, clip keys

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7: Film data — meta, SKUs, copy, promos, captions, layouts, manifest

Everything in this task is pure data plus small pure functions, shared by the browser and Node tests. No Three.js scene code.

**Files:**
- Create: `03-perfume/meta.js`, `03-perfume/skus.js`, `03-perfume/copy.js`, `03-perfume/promos.js`, `03-perfume/captions.js`, `03-perfume/layouts.js`, `03-perfume/manifest.json`
- Test: `03-perfume/test/data.test.mjs`, `03-perfume/test/layouts.test.mjs`, `03-perfume/test/text-fit.test.mjs`

**Interfaces:**
- Consumes: `expandJobs`, `allAxes`, `ASPECTS`, `UNSAFE`, `MARGIN`, `MIN_TEXT` (Task 2); `buildCut`, `shotAt` (Task 3); `solvePose`, `applyPose`, `project` (Task 4); `prepareLayer`, `layout`, `approxMeasure` (Task 5); `offGrid` (Task 6).
- Produces:
  - `meta.js`:
    - `BAR = 3.0`, `GRID = 1.5`, `SHOTS` (the six names), `EV = { land: 0.75, streak: 1.5 }` (shot-local event times).
    - `CUTS[15 | 6] = { shots, hits, cover }` (Task 3 cut format).
    - `DIMS`, `EXPLODE`, `BOX.bottle` / `BOX.exploded` as `[[x0,y0,z0],[x1,y1,z1]]` in metres. `bottle.js` (Task 11) must build to these numbers.
    - `VIEW[shot] = { box, pitch, yaw: [from, to], fov }`, `viewDir(pitch, yaw) → [x,y,z]`. `shots.js` (Tasks 8, 13) must use these for its fit shots.
    - `META = { id, axes, sceneAxes, cuts, fileName }`, the Node-safe subset of the film contract.
  - `skus.js`: `SKUS[id] = { name{zh,en}, image{zh,en}, notes{zh,en}[3], price{CNY,USD}, deal{CNY,USD}, liquid{color, absorb[3] per metre}, cap: 'silver'|'gold'|'frost'|'lacquer', world, particle, score, palette{ink, soft, accent, cta, ctaInk, shadow}, voice?{zh?,en?} }`.
  - `copy.js`: `FONTS{zh{display,body}, en{display,body}, num}`, `T[lang]{sub, tagline, edp, tiers[3], cta, currency}`, `money(n, lang)`, `sayNum(n, lang)`, `VOICE`, `AUDITION`, `SPEED`, `SLOTS[cut][slot] = [at, max]`, `voLines(v) → [{ id, text, voice, speed, at, max }]`.
  - `promos.js`: `PROMO_T`, `RED`, `promoLayers(v, { a, align, pal }) → layers` (zones `line1`–`line3`).
  - `captions.js`: `PARTS = ['cap', 'collar', 'liquid']`, `layersFor(v, s) → layer specs` (`s = { name, from, dur, row }`). The anatomy layers carry `leader: { part, color }`; the shot adds `leader.world`. Also `fontsFor(v) → [{ family, weight, text }]`.
  - `layouts.js`: `LAYOUTS[ar][shot] = { anchor?, size?, maxW?, align?, zones?: { name: [x, y, w, h] } }`. These are frame fractions with y down.

- [ ] **Step 1: Write the failing tests**

`03-perfume/test/data.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { META, CUTS, EV, SHOTS, GRID, BAR } from '../meta.js';
import { SKUS } from '../skus.js';
import { T, sayNum, voLines, SLOTS } from '../copy.js';
import { promoLayers } from '../promos.js';
import { layersFor, fontsFor } from '../captions.js';
import { expandJobs, allAxes } from '../../factory/engine/variant.js';
import { buildCut, shotAt } from '../../factory/engine/timeline.js';
import { offGrid } from '../../factory/engine/mix.js';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url)));
const every = () => expandJobs(META, { jobs: [] }, { all: true });

test('file names', () => {
  const v = { sku: 'rose', lang: 'en', cut: 6, promo: '1111', ar: '1x1', vo: 'off' };
  assert.equal(META.fileName(v), 'wenjing_rose_6s_1x1_en_1111_novo');
  assert.equal(META.fileName({ ...v, promo: 'none', vo: 'on' }), 'wenjing_rose_6s_1x1_en');
});

test('default manifest = 24 jobs using every axis value; --all = 144', () => {
  const jobs = expandJobs(META, manifest);
  assert.equal(jobs.length, 24);
  for (const [k, list] of Object.entries(allAxes(META))) {
    if (k === 'vo') continue;
    for (const x of list) assert.ok(jobs.some(j => j[k] === x), `default batch never uses ${k}=${x}`);
  }
  assert.equal(every().length, 144);
});

test('cuts: lengths, shot names, hits on the grid and on the shot events', () => {
  assert.equal(BAR, 2 * GRID);
  for (const [c, cut] of Object.entries(CUTS)) {
    const b = buildCut(cut);
    assert.ok(Math.abs(b.duration - Number(c)) < 1e-9, `cut ${c} lasts ${b.duration}`);
    for (const e of cut.shots) assert.ok(SHOTS.includes(e.shot));
    assert.deepEqual(offGrid(Object.values(cut.hits)), [], `cut ${c} has off-grid hits`);
    const at = (name, lt) => { const e = shotAt(b, name); return e.start + lt - e.from; };
    assert.ok(Math.abs(cut.hits.land - at('drop', EV.land)) < 1e-9, 'land hit ≠ drop landing');
    if ('streak' in cut.hits) assert.ok(Math.abs(cut.hits.streak - at('hero', EV.streak)) < 1e-9, 'streak hit ≠ light streak');
    assert.equal(cut.hits.logo, shotAt(b, 'end').start);
    const h = shotAt(b, 'hero'); assert.ok(b.cover > h.start && b.cover < h.end, 'cover frame must be in the hero shot');
  }
});

test('skus: complete for both languages, deal below price', () => {
  assert.deepEqual(Object.keys(SKUS), META.axes.sku);
  for (const [id, k] of Object.entries(SKUS)) {
    for (const L of META.axes.lang) {
      assert.ok(k.name[L] && k.image[L], `${id} ${L}`); assert.equal(k.notes[L].length, 3);
    }
    for (const c of ['CNY', 'USD']) assert.ok(k.deal[c] < k.price[c], `${id} deal ${c}`);
    assert.match(k.liquid.color, /^#[0-9a-f]{6}$/); assert.equal(k.liquid.absorb.length, 3);
    for (const f of ['ink', 'soft', 'accent', 'cta', 'ctaInk', 'shadow']) assert.ok(k.palette[f], `${id} palette.${f}`);
  }
});

test('sayNum reads numbers the way a narrator would', () => {
  const zh = { 0: '零', 9: '九', 10: '十', 15: '十五', 110: '一百一十', 469: '四百六十九', 499: '四百九十九', 509: '五百零九', 1000: '一千', 1050: '一千零五十' };
  for (const [n, s] of Object.entries(zh)) assert.equal(sayNum(+n, 'zh'), s);
  const en = { 0: 'zero', 13: 'thirteen', 20: 'twenty', 69: 'sixty-nine', 95: 'ninety-five', 109: 'one hundred nine', 1200: 'one thousand two hundred' };
  for (const [n, s] of Object.entries(en)) assert.equal(sayNum(+n, 'en'), s);
});

test('voice-over lines: no digits, inside the cut, no overlaps, stable ids', () => {
  const byId = new Map();
  for (const v of every()) {
    const lines = voLines(v), dur = Number(v.cut);
    assert.equal(lines.length, Object.keys(SLOTS[v.cut]).length);
    lines.forEach((l, i) => {
      assert.doesNotMatch(l.text, /\d/, `${l.id}: spell numbers out`);
      assert.ok(l.at >= 0 && l.at + l.max <= dur, `${l.id} slot leaves the cut`);
      if (i) assert.ok(lines[i - 1].at + lines[i - 1].max <= l.at, `${l.id} overlaps the previous line`);
      assert.ok(l.voice && l.speed > 0);
      if (byId.has(l.id)) assert.equal(byId.get(l.id), l.text, `${l.id} means two different lines`); else byId.set(l.id, l.text);
    });
    assert.deepEqual(voLines({ ...v, vo: 'off' }), []);
  }
  assert.ok(byId.get('rose_zh_15_end_1111').includes('五百八十九'));
});

test('promo cards pull prices from the sku table', () => {
  const pal = SKUS.rose.palette;
  const zh = promoLayers({ sku: 'rose', lang: 'zh', promo: '1111' }, { pal });
  assert.equal(zh.find(l => l.id === 'price').text, '到手价 ¥589');
  assert.equal(zh.find(l => l.id === 'was').text, '日常价 ¥799');
  const en = promoLayers({ sku: 'rose', lang: 'en', promo: '1111' }, { pal });
  assert.equal(en.find(l => l.id === 'price').text, 'Now $79');
  assert.ok(promoLayers({ sku: 'rose', lang: 'en', promo: 'none' }, { pal }).some(l => l.text === T.en.cta));
});

test('captions: unique ids per shot, leaders on the notes, fonts cover every character', () => {
  for (const v of every()) {
    for (const e of CUTS[v.cut].shots) {
      const ls = layersFor(v, { name: e.shot, from: e.from ?? 0, dur: e.dur });
      assert.equal(new Set(ls.map(l => l.id)).size, ls.length);
      for (const l of ls) assert.ok(l.text && l.font?.family && l.zone && l.size > 0, `${e.shot}.${l.id}`);
      if (e.shot === 'anatomy') assert.equal(ls.filter(l => l.leader).length, 3);
    }
    const fonts = fontsFor(v);
    for (const e of CUTS[v.cut].shots) for (const l of layersFor(v, { name: e.shot, from: e.from ?? 0 })) {
      const f = fonts.find(x => x.family === l.font.family && x.weight === (l.font.weight ?? 400));
      for (const ch of l.text.replace(/\s/g, '')) assert.ok(f.text.includes(ch), `${l.font.family} misses ${ch}`);
    }
  }
});
```

`03-perfume/test/layouts.test.mjs` checks the bottle with the real framing solver, the same `VIEW` directions the shots use, and five yaw samples across each shot's orbit:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LAYOUTS } from '../layouts.js';
import { CUTS, VIEW, BOX, viewDir } from '../meta.js';
import { META } from '../meta.js';
import { layersFor } from '../captions.js';
import { ASPECTS, UNSAFE, MARGIN, expandJobs } from '../../factory/engine/variant.js';
import { solvePose, applyPose, project } from '../../factory/engine/framing.js';

const hit = (a, b, eps = 1e-3) => a[0] < b[0] + b[2] - eps && b[0] < a[0] + a[2] - eps && a[1] < b[1] + b[3] - eps && b[1] < a[1] + a[3] - eps;
const inside = r => r[0] >= MARGIN - 1e-9 && r[1] >= MARGIN - 1e-9 && r[0] + r[2] <= 1 - MARGIN + 1e-9 && r[1] + r[3] <= 1 - MARGIN + 1e-9;
const box3 = ([a, b]) => new THREE.Box3(new THREE.Vector3(...a), new THREE.Vector3(...b));

/** 该比例下镜头 shot 的瓶子投影矩形 [x, y, w, h]；yaw 取镜头机位范围内的 5 个值 */
function subjectRects(ar, shot) {
  const [W, H] = ASPECTS[ar], V = VIEW[shot], row = LAYOUTS[ar][shot], cam = new THREE.PerspectiveCamera();
  return [0, 0.25, 0.5, 0.75, 1].map(k => {
    const yaw = V.yaw[0] + (V.yaw[1] - V.yaw[0]) * k;
    applyPose(cam, solvePose({ type: 'fit', box: box3(BOX[V.box]), dir: viewDir(V.pitch, yaw), fov: V.fov }, row, W / H), W, H);
    const p = project(cam, box3(BOX[V.box]));
    return [p.minX, p.minY, p.maxX - p.minX, p.maxY - p.minY];
  });
}

test('every aspect ratio has a row for every shot used by a cut', () => {
  const used = new Set(Object.values(CUTS).flatMap(c => c.shots.map(e => e.shot)));
  for (const ar of Object.keys(ASPECTS)) for (const s of used) assert.ok(LAYOUTS[ar][s], `${ar}.${s}`);
});

test('text zones stay inside the margin and out of platform UI', () => {
  for (const [ar, rows] of Object.entries(LAYOUTS)) for (const [shot, row] of Object.entries(rows)) {
    for (const [z, r] of Object.entries(row.zones ?? {})) {
      assert.ok(inside(r), `${ar}.${shot}.${z} crosses the margin`);
      for (const u of UNSAFE[ar]) assert.ok(!hit(r, u), `${ar}.${shot}.${z} is under platform UI`);
    }
  }
});

test('every zone a caption asks for exists', () => {
  for (const v of expandJobs(META, { jobs: [] }, { all: true })) for (const e of CUTS[v.cut].shots) {
    const row = LAYOUTS[v.ar][e.shot];
    for (const l of layersFor(v, { name: e.shot, from: e.from ?? 0, row })) assert.ok(row.zones?.[l.zone], `${v.ar}.${e.shot} has no zone ${l.zone}`);
  }
});

test('the bottle stays in the safe frame and clear of the text zones', () => {
  for (const ar of Object.keys(ASPECTS)) for (const shot of Object.keys(VIEW)) {
    const row = LAYOUTS[ar][shot];
    for (const r of subjectRects(ar, shot)) {
      assert.ok(inside(r), `${ar}.${shot} bottle crosses the margin: ${r.map(x => x.toFixed(3))}`);
      for (const u of UNSAFE[ar]) assert.ok(!hit(r, u), `${ar}.${shot} bottle is under platform UI`);
      for (const [z, zr] of Object.entries(row.zones ?? {})) assert.ok(!hit(r, zr), `${ar}.${shot} bottle overlaps ${z}`);
    }
  }
});
```

`03-perfume/test/text-fit.test.mjs` is Review Focus #3. It lays out every caption of all 144 variants with the deliberately wide width model:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { META, CUTS } from '../meta.js';
import { LAYOUTS } from '../layouts.js';
import { layersFor } from '../captions.js';
import { ASPECTS, MIN_TEXT, expandJobs } from '../../factory/engine/variant.js';
import { prepareLayer, layout, approxMeasure } from '../../factory/engine/text.js';

// 每个变体 × 每个镜头 × 每个图层，用偏宽的字宽模型排版：必须放得下，且不低于最小字号
test('every caption fits its zone at or above the minimum size', () => {
  let n = 0;
  const bad = [];
  for (const v of expandJobs(META, { jobs: [] }, { all: true })) {
    const [W, H] = ASPECTS[v.ar];
    for (const e of CUTS[v.cut].shots) {
      const row = LAYOUTS[v.ar][e.shot];
      for (const spec of layersFor(v, { name: e.shot, from: e.from ?? 0, dur: e.dur, row })) {
        const L = prepareLayer(spec, { lt: 99, zones: row.zones, W, H, minFrac: MIN_TEXT[v.ar] }), r = layout(approxMeasure, L);
        n++;
        if (r.overflow) bad.push(`${v.ar} ${v.sku} ${v.lang} ${v.promo} ${e.shot}.${spec.id}: "${spec.text}"`);
        assert.ok(r.size >= L.min - 1e-9);
      }
    }
  }
  assert.deepEqual(bad, []);
  assert.ok(n > 1000, `only ${n} layouts checked`);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test '03-perfume/test/*.test.mjs'`
Expected: FAIL — `Cannot find module '.../03-perfume/meta.js'`.

- [ ] **Step 3: Implement** `03-perfume/meta.js`

```js
// meta.js — 成片骨架（纯数据，浏览器与 Node 测试共用）：轴、剪辑表、命中点、封面时刻、瓶子尺寸与机位、文件命名

export const BAR = 3.0, GRID = 1.5;                    // 一小节 3 秒；命中点都落在 1.5 秒网格上
export const SHOTS = ['macro', 'drop', 'hero', 'anatomy', 'spray', 'end'];
// 镜头内部的事件（镜头本地秒）：水滴落进液面、光带扫过峰值
export const EV = { land: 0.75, streak: 1.5 };

export const CUTS = {
  15: {
    shots: [
      { shot: 'macro', dur: 2.25 }, { shot: 'drop', dur: 2.25 },
      { shot: 'hero', dur: 3.0, transition: { type: 'dissolve', dur: 0.3 } },
      { shot: 'anatomy', dur: 3.0 },
      { shot: 'spray', dur: 1.5, transition: { type: 'dissolve', dur: 0.25 } },
      { shot: 'end', dur: 3.0, transition: { type: 'dissolve', dur: 0.4 } },
    ],
    hits: { land: 3.0, streak: 6.0, logo: 12.0 }, cover: 6.4,
  },
  6: {
    shots: [
      { shot: 'drop', dur: 1.5, from: 0.75 },
      { shot: 'hero', dur: 1.5, from: 0.75, transition: { type: 'flash', dur: 0.2 } },
      { shot: 'end', dur: 3.0, transition: { type: 'dissolve', dur: 0.3 } },
    ],
    hits: { land: 0, logo: 3.0 }, cover: 2.6,
  },
};

// 瓶子尺寸（米）：瓶身 7.4 × 4.6 × 10.5 cm，金属颈圈 1.2 cm，瓶盖 4.5 cm；分解图里各部件上抬的距离
export const DIMS = { w: 0.074, d: 0.046, body: 0.105, collar: 0.012, cap: 0.045 };
export const EXPLODE = { pump: 0.035, collar: 0.065, cap: 0.09 };
const TOP = DIMS.body + DIMS.collar + DIMS.cap;
export const BOX = {
  bottle: [[-DIMS.w / 2, 0, -DIMS.d / 2], [DIMS.w / 2, TOP, DIMS.d / 2]],
  exploded: [[-DIMS.w / 2, 0, -DIMS.d / 2], [DIMS.w / 2, TOP + EXPLODE.cap, DIMS.d / 2]],
};
// 各镜头框取的对象与机位：pitch 仰角、yaw 绕竖轴（度，[起, 止] 随镜头进度变化），shots.js 与 layouts 测试共用
export const VIEW = {
  drop: { box: 'bottle', pitch: 12, yaw: [-8, -8], fov: 30 },
  hero: { box: 'bottle', pitch: 6, yaw: [-25, 15], fov: 28 },
  anatomy: { box: 'exploded', pitch: 8, yaw: [30, 30], fov: 26 },
  spray: { box: 'bottle', pitch: 5, yaw: [-35, -35], fov: 30 },
  end: { box: 'bottle', pitch: 7, yaw: [10, 4], fov: 28 },
};
const R = Math.PI / 180;
export const viewDir = (pitch, yaw) => [Math.sin(yaw * R) * Math.cos(pitch * R), Math.sin(pitch * R), Math.cos(yaw * R) * Math.cos(pitch * R)];

export const META = {
  id: '03-perfume',
  axes: { sku: ['whitetea', 'osmanthus', 'seasalt', 'rose'], lang: ['zh', 'en'], cut: [15, 6], promo: ['none', '1111', 'launch'] },
  sceneAxes: ['sku'],
  cuts: CUTS,
  fileName: v => `wenjing_${v.sku}_${v.cut}s_${v.ar}_${v.lang}${v.promo === 'none' ? '' : `_${v.promo}`}${v.vo === 'off' ? '_novo' : ''}`,
};
```

`03-perfume/skus.js` (the palettes and absorption values are starting points, tuned in Tasks 13–19 by looking at `?sheet`):

```js
// skus.js — 四款香型：名称、香调、价格、液体颜色与吸收、瓶盖、世界、配色、配乐（纯数据）
// absorb：液体每米的 RGB 吸收系数（比尔–朗伯），越厚颜色越深；palette：该世界里文字与按钮的配色

export const SKUS = {
  whitetea: {
    name: { zh: '白茶', en: 'White Tea' },
    image: { zh: '一滴晨露，一片茶山', en: 'Morning dew on the tea hills' },
    notes: { zh: ['佛手柑', '白茶', '白麝香'], en: ['Bergamot', 'White Tea', 'White Musk'] },
    price: { CNY: 699, USD: 95 }, deal: { CNY: 499, USD: 69 },
    liquid: { color: '#cfe3b8', absorb: [9, 3, 11] }, cap: 'silver',
    world: 'whitetea', particle: 'mist', score: 'whitetea',
    palette: { ink: '#22332a', soft: '#4a6453', accent: '#6f9460', cta: '#22332a', ctaInk: '#f4f1e8', shadow: 'rgba(255,255,248,0.6)' },
  },
  osmanthus: {
    name: { zh: '桂花', en: 'Osmanthus' },
    image: { zh: '一树金桂，满城秋香', en: 'Golden blossom, autumn air' },
    notes: { zh: ['杏子', '桂花', '檀香'], en: ['Apricot', 'Osmanthus', 'Sandalwood'] },
    price: { CNY: 699, USD: 95 }, deal: { CNY: 499, USD: 69 },
    liquid: { color: '#e8a93c', absorb: [4, 14, 40] }, cap: 'gold',
    world: 'osmanthus', particle: 'florets', score: 'osmanthus',
    palette: { ink: '#fff6e4', soft: '#f1d9aa', accent: '#e8a93c', cta: '#e8a93c', ctaInk: '#2a1a06', shadow: 'rgba(40,20,0,0.6)' },
  },
  seasalt: {
    name: { zh: '海盐', en: 'Sea Salt' },
    image: { zh: '一缕海风，一片澄蓝', en: 'Sea breeze, clear blue light' },
    notes: { zh: ['海盐', '鼠尾草', '琥珀木'], en: ['Sea Salt', 'Sage', 'Amberwood'] },
    price: { CNY: 659, USD: 89 }, deal: { CNY: 469, USD: 65 },
    liquid: { color: '#bfe6ea', absorb: [10, 3, 2.5] }, cap: 'frost',
    world: 'seasalt', particle: 'spray', score: 'seasalt',
    palette: { ink: '#123a4a', soft: '#3d6978', accent: '#2f9fb2', cta: '#123a4a', ctaInk: '#eefafc', shadow: 'rgba(255,255,255,0.55)' },
  },
  rose: {
    name: { zh: '玫瑰', en: 'Rose' },
    image: { zh: '一瓣玫瑰，一夜丝绒', en: 'One petal, deep as velvet' },
    notes: { zh: ['黑加仑', '玫瑰', '广藿香'], en: ['Blackcurrant', 'Rose', 'Patchouli'] },
    price: { CNY: 799, USD: 109 }, deal: { CNY: 589, USD: 79 },
    liquid: { color: '#9c1f35', absorb: [6, 70, 45] }, cap: 'lacquer',
    world: 'rose', particle: 'petals', score: 'rose',
    palette: { ink: '#f7e9ea', soft: '#d8a8b0', accent: '#c9a45c', cta: '#c9a45c', ctaInk: '#1c0a0e', shadow: 'rgba(0,0,0,0.65)' },
  },
};
```

- [ ] **Step 4: Implement copy, promos and captions**

`03-perfume/copy.js`. The voice-over wording targets Kokoro's pace: about 4.5 zh characters or 2.5 en words per second at speed 1. Task 16 measures the real clips, and a line that still overflows its slot gets reworded there.

```js
// copy.js — 文案：字体、界面用语、价格、配音台词与时段（纯数据）
// 配音里的数字一律写成汉字 / 英文单词：Kokoro 直接读阿拉伯数字不稳定
import { SKUS } from './skus.js';

export const FONTS = {
  zh: { display: { family: 'Noto Serif SC', weight: 600 }, body: { family: 'Noto Serif SC', weight: 500 } },
  en: { display: { family: 'Cormorant Garamond', weight: 600 }, body: { family: 'Cormorant Garamond', weight: 500 } },
  num: { family: 'Noto Sans SC', weight: 700, fallback: 'sans-serif' },
};
export const T = {
  zh: { sub: '闻境 · WENJING', tagline: '闻香 · 入境', edp: '50 ml · 浓香水', tiers: ['前调', '中调', '后调'], cta: '点击购买', currency: 'CNY' },
  en: { sub: 'WENJING', tagline: 'Breathe in. Step in.', edp: '50 ml · Eau de Parfum', tiers: ['TOP', 'HEART', 'BASE'], cta: 'Shop now', currency: 'USD' },
};
export const money = (n, lang) => (lang === 'zh' ? `¥${n}` : `$${n}`);

const ZH = '零一二三四五六七八九', UNIT = ['', '十', '百', '千'];
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function zhNum(n) {
  if (n === 0) return '零';
  const ds = [...String(n)].map(Number);
  let s = '', zero = false;
  ds.forEach((d, i) => {
    const u = UNIT[ds.length - 1 - i];
    if (d === 0) { zero = true; return; }
    if (zero) { s += '零'; zero = false; }
    s += (d === 1 && u === '十' && i === 0 ? '' : ZH[d]) + u;
  });
  return s;
}
function enNum(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${enNum(n % 100)}` : ''}`;
  return `${enNum(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${enNum(n % 1000)}` : ''}`;
}
/** 0–9999 → 读法 */
export const sayNum = (n, lang) => (lang === 'zh' ? zhNum(n) : enNum(n));

// ── 配音 ──
export const VOICE = { zh: 'zm_yunjian', en: 'am_michael' };           // Task 16 试听后定稿
export const AUDITION = { zh: ['zf_xiaoxiao', 'zf_xiaoyi', 'zm_yunjian', 'zm_yunxi'], en: ['af_heart', 'bf_emma', 'am_michael', 'bm_george'] };
export const SPEED = { zh: 1, en: 1 };
// 时段（成片秒）：[开始, 最长]
export const SLOTS = { 15: { hero: [4.6, 2.8], notes: [7.7, 2.6], end: [12.3, 2.6] }, 6: { one: [1.1, 3.7] } };

const END = {
  zh: { none: (k, d) => `闻境${k.name.zh}，闻香入境。`, 1111: (k, d) => `双十一，到手${d}元。`, launch: k => `闻境新品，${k.name.zh}首发。` },
  en: { none: k => `Wenjing ${k.name.en}. Breathe in.`, 1111: (k, d) => `Eleven-eleven price: ${d} dollars.`, launch: k => `New from Wenjing: ${k.name.en}.` },
};
const ONE = {
  zh: { none: k => `闻境${k.name.zh}，${k.image.zh}。`, 1111: (k, d) => `闻境${k.name.zh}，双十一到手${d}元。`, launch: k => `闻境新品，${k.name.zh}首发。` },
  en: { none: k => `Wenjing ${k.name.en}. ${k.image.en}.`, 1111: (k, d) => `Wenjing ${k.name.en}, now ${d} dollars.`, launch: k => `New from Wenjing: ${k.name.en}.` },
};

/** 变体 → 配音台词 [{ id, text, voice, speed, at, max }]；同一 id 在所有变体里文字相同 */
export function voLines(v) {
  if (v.vo === 'off') return [];
  const k = SKUS[v.sku], L = v.lang, d = sayNum(k.deal[T[L].currency], L), voice = k.voice?.[L] ?? VOICE[L];
  const line = (slot, key, text) => { const [at, max] = SLOTS[v.cut][slot]; return { id: `${v.sku}_${L}_${v.cut}_${key}`, text, voice, speed: SPEED[L], at, max }; };
  if (v.cut === 6) return [line('one', `one_${v.promo}`, ONE[L][v.promo](k, d))];
  const [n0, n1, n2] = k.notes[L];
  return [
    line('hero', 'hero', L === 'zh' ? `${k.image.zh}。` : `${k.image.en}.`),
    line('notes', 'notes', L === 'zh' ? `${n0}、${n1}、${n2}。` : `${n0}, ${n1}, ${n2}.`),
    line('end', `end_${v.promo}`, END[L][v.promo](k, d)),
  ];
}
```

`03-perfume/promos.js`:

```js
// promos.js — 片尾卡的三种预设：none（标语 + 购买按钮）、1111（双11 价签）、launch（新品首发）
// 价格与文案从香型表、语言表里取；图层放在 end 镜头的 line1–line3 三个区
import { SKUS } from './skus.js';
import { T, FONTS, money } from './copy.js';

export const PROMO_T = {
  zh: { ribbon: '双11 狂欢价', deal: '到手价', was: '日常价', launch: '新品首发', gift: '首发赠 2 ml 随行装' },
  en: { ribbon: '11.11 Global Shopping Festival', deal: 'Now', was: 'Was', launch: 'New Arrival', gift: 'Free 2 ml travel spray' },
};
export const RED = '#e1251b';

/** a = 入场起点（镜头本地秒），pal = 香型配色 */
export function promoLayers(v, { a = 0, align = 'center', pal }) {
  const k = SKUS[v.sku], L = v.lang, P = PROMO_T[L], F = FONTS[L], cur = T[L].currency;
  const base = { lang: L, align, valign: 'middle', color: pal.ink, shadow: { color: pal.shadow, blur: 0.35 } };
  const pill = (id, zone, text, t0, fill, ink) => ({ ...base, id, zone, text, font: FONTS.num, size: 0.04, tracking: 0.06, in: [t0, t0 + 0.5], box: { fill, color: ink, pad: 0.55, radius: 0.5 }, shadow: null });
  if (v.promo === '1111') return [
    { ...pill('ribbon', 'line1', P.ribbon, a, RED, '#ffffff'), size: 0.042, box: { fill: RED, color: '#ffffff', pad: 0.45, radius: 0.15 } },
    { ...base, id: 'price', zone: 'line2', text: `${P.deal} ${money(k.deal[cur], L)}`, font: FONTS.num, size: 0.075, lineHeight: 1.1, in: [a + 0.3, a + 0.7], pop: true },
    { ...base, id: 'was', zone: 'line3', text: `${P.was} ${money(k.price[cur], L)}`, font: FONTS.num, size: 0.038, in: [a + 0.6, a + 1.0], strike: true, color: pal.soft },
  ];
  if (v.promo === 'launch') return [
    pill('ribbon', 'line1', P.launch, a, pal.accent, pal.ctaInk),
    { ...base, id: 'gift', zone: 'line2', text: P.gift, font: F.body, size: 0.046, tracking: 0.03, in: [a + 0.3, a + 0.8] },
    pill('cta', 'line3', T[L].cta, a + 0.6, pal.cta, pal.ctaInk),
  ];
  return [
    { ...base, id: 'tagline', zone: 'line1', text: T[L].tagline, font: F.display, size: 0.05, tracking: L === 'zh' ? 0.2 : 0.04, in: [a, a + 0.6] },
    pill('cta', 'line2', T[L].cta, a + 0.5, pal.cta, pal.ctaInk),
  ];
}
```

`03-perfume/captions.js`:

```js
// captions.js — 各镜头的字幕图层（纯数据）：文字、字体、区、字号（画面短边比例）、入场 / 退场（镜头本地秒）
// 入场时段相对 s.from（这一条剪辑里镜头的起始本地时间），所以 6 秒版从中段切入的镜头字幕照样完整入场
import { CUTS } from './meta.js';
import { SKUS } from './skus.js';
import { T, FONTS } from './copy.js';
import { promoLayers } from './promos.js';

export const PARTS = ['cap', 'collar', 'liquid'];          // 前 / 中 / 后调引线指向的部件（shots.js 填世界坐标）

/** s = { name, from, dur, row } → 图层数组 */
export function layersFor(v, s) {
  const k = SKUS[v.sku], L = v.lang, F = FONTS[L], pal = k.palette, a = s.from ?? 0, align = s.row?.align ?? 'center';
  const base = { lang: L, align, valign: 'top', color: pal.ink, shadow: { color: pal.shadow, blur: 0.4 } };
  switch (s.name) {
    case 'macro': return [
      { ...base, id: 'hook', zone: 'hook', text: k.image[L], font: F.display, size: L === 'zh' ? 0.058 : 0.054, tracking: L === 'zh' ? 0.08 : 0.01, lineHeight: 1.35, in: [a + 0.35, a + 0.95] },
    ];
    case 'hero': return [
      { ...base, id: 'title', zone: 'title', text: k.name[L], font: F.display, size: 0.09, tracking: L === 'zh' ? 0.2 : 0.04, maxLines: 1, in: [a + 0.3, a + 0.9] },
      { ...base, id: 'sub', zone: 'sub', text: T[L].sub, font: F.body, size: 0.038, tracking: 0.3, color: pal.soft, in: [a + 0.6, a + 1.2] },
    ];
    case 'anatomy': return [
      ...k.notes[L].map((n, i) => ({
        ...base, id: `n${i}`, zone: `n${i}`, text: `${T[L].tiers[i]}\n${n}`, font: F.body, size: 0.042, tracking: 0.04,
        in: [a + 0.5 + 0.2 * i, a + 0.9 + 0.2 * i], out: [a + 2.15, a + 2.4], leader: { part: PARTS[i], color: pal.accent },
      })),
      { ...base, id: 'edp', zone: 'edp', text: T[L].edp, font: F.body, size: 0.04, tracking: 0.06, color: pal.soft, in: [a + 1.2, a + 1.6] },
    ];
    case 'end': return [
      { ...base, id: 'logo', zone: 'logo', lang: 'zh', text: '闻境', font: FONTS.zh.display, size: 0.11, tracking: 0.3, lineHeight: 1.05, maxLines: 1, in: [a, a + 0.5] },
      { ...base, id: 'brand', zone: 'brand', lang: 'en', text: 'WENJING', font: FONTS.en.display, size: 0.036, tracking: 0.55, color: pal.soft, in: [a + 0.2, a + 0.7] },
      ...promoLayers(v, { a: a + 0.3, align, pal }),
    ];
    default: return [];
  }
}

/** 变体用到的每种字体及其全部字符：页面在第一帧前按这些字符加载字体子集 */
export function fontsFor(v) {
  const m = new Map();
  for (const e of CUTS[v.cut].shots) for (const L of layersFor(v, { name: e.shot, from: e.from ?? 0, dur: e.dur })) {
    const key = `${L.font.family}|${L.font.weight ?? 400}`;
    m.set(key, (m.get(key) ?? '') + L.text);
  }
  return [...m].map(([key, text]) => { const [family, weight] = key.split('|'); return { family, weight: +weight, text: [...new Set(text.replace(/\s/g, ''))].join('') }; });
}
```

- [ ] **Step 5: Implement layouts and the manifest**

`03-perfume/layouts.js`:

```js
// layouts.js — 每种比例 × 每个镜头的构图：瓶子锚点（画面比例坐标，y 向下）、占画面高度、最大宽度、文字区 [x, y, w, h]、对齐
// 9:16 避开抖音 / 淘宝的右侧图标列和底部标题带（variant.js 的 UNSAFE），安全区中心在 x ≈ 0.45

export const LAYOUTS = {
  '9x16': {
    macro: { align: 'center', zones: { hook: [0.08, 0.64, 0.74, 0.1] } },
    drop: { anchor: [0.45, 0.42], size: 0.5 },
    hero: { anchor: [0.45, 0.35], size: 0.44, align: 'center', zones: { title: [0.08, 0.58, 0.74, 0.1], sub: [0.08, 0.68, 0.74, 0.06] } },
    anatomy: { anchor: [0.3, 0.4], size: 0.54, maxW: 0.36, align: 'left', zones: { n0: [0.5, 0.14, 0.34, 0.1], n1: [0.5, 0.33, 0.34, 0.1], n2: [0.5, 0.55, 0.34, 0.1], edp: [0.08, 0.72, 0.74, 0.06] } },
    spray: { anchor: [0.45, 0.45], size: 0.46 },
    end: { anchor: [0.45, 0.28], size: 0.34, align: 'center', zones: { logo: [0.1, 0.49, 0.7, 0.08], brand: [0.1, 0.57, 0.7, 0.04], line1: [0.1, 0.625, 0.7, 0.05], line2: [0.1, 0.675, 0.7, 0.07], line3: [0.1, 0.745, 0.7, 0.05] } },
  },
  '1x1': {
    macro: { align: 'center', zones: { hook: [0.08, 0.8, 0.84, 0.1] } },
    drop: { anchor: [0.5, 0.45], size: 0.62 },
    hero: { anchor: [0.5, 0.4], size: 0.56, align: 'center', zones: { title: [0.08, 0.72, 0.84, 0.13], sub: [0.08, 0.85, 0.84, 0.07] } },
    anatomy: { anchor: [0.34, 0.47], size: 0.78, maxW: 0.4, align: 'left', zones: { n0: [0.56, 0.12, 0.37, 0.14], n1: [0.56, 0.38, 0.37, 0.14], n2: [0.56, 0.64, 0.37, 0.14], edp: [0.08, 0.87, 0.84, 0.07] } },
    spray: { anchor: [0.5, 0.48], size: 0.6 },
    end: { anchor: [0.5, 0.3], size: 0.42, align: 'center', zones: { logo: [0.1, 0.55, 0.8, 0.11], brand: [0.1, 0.66, 0.8, 0.05], line1: [0.1, 0.73, 0.8, 0.06], line2: [0.1, 0.79, 0.8, 0.09], line3: [0.1, 0.88, 0.8, 0.06] } },
  },
  '16x9': {
    macro: { align: 'left', zones: { hook: [0.06, 0.74, 0.54, 0.12] } },
    drop: { anchor: [0.66, 0.5], size: 0.74 },
    hero: { anchor: [0.68, 0.5], size: 0.72, align: 'left', zones: { title: [0.07, 0.34, 0.43, 0.18], sub: [0.07, 0.53, 0.43, 0.09] } },
    anatomy: { anchor: [0.66, 0.5], size: 0.82, maxW: 0.3, align: 'left', zones: { n0: [0.07, 0.16, 0.37, 0.14], n1: [0.07, 0.4, 0.37, 0.14], n2: [0.07, 0.64, 0.37, 0.14], edp: [0.07, 0.83, 0.43, 0.08] } },
    spray: { anchor: [0.66, 0.52], size: 0.7 },
    end: { anchor: [0.72, 0.5], size: 0.66, align: 'left', zones: { logo: [0.07, 0.22, 0.45, 0.16], brand: [0.07, 0.38, 0.45, 0.07], line1: [0.07, 0.52, 0.45, 0.08], line2: [0.07, 0.6, 0.45, 0.13], line3: [0.07, 0.73, 0.45, 0.08] } },
  },
};
```

`03-perfume/manifest.json` (spec §5.5):

```json
{ "jobs": [
  { "sku": ["*"], "ar": ["*"],            "lang": ["zh"], "cut": [15], "promo": ["none"]   },
  { "sku": ["*"], "ar": ["9x16", "1x1"],  "lang": ["zh"], "cut": [6],  "promo": ["1111"]   },
  { "sku": ["*"], "ar": ["16x9"],         "lang": ["en"], "cut": [15], "promo": ["launch"] }
] }
```

- [ ] **Step 6: Run the tests**

Run: `node --test '03-perfume/test/*.test.mjs'`
Expected: PASS, 13 tests. Then run `npm test`. Expected: every factory and film test passes.

If `text-fit` fails, the message names `ar sku lang promo shot.layer` and the text. Fix it by widening or heightening that zone in `layouts.js`, then rerun `layouts.test.mjs`. Never lower a size below `MIN_TEXT`, and never shorten a product name.

- [ ] **Step 7: Commit**

```bash
git add 03-perfume/meta.js 03-perfume/skus.js 03-perfume/copy.js 03-perfume/promos.js 03-perfume/captions.js 03-perfume/layouts.js 03-perfume/manifest.json 03-perfume/test
git commit -m "Add 03-perfume film data: cuts, SKUs, copy, promos, captions, layouts, manifest

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 8: Browser engine skeleton — server, post chain, frame loop, player, first frames

This task puts the pure modules from Tasks 1–7 on screen. By the end, `snap.mjs` renders real frames of every variant under headless Metal. The bottle is a proxy (boxes built to `DIMS`) and the world is a neutral studio; Tasks 11–13 replace both without touching the engine.

**Files:**
- Create: `factory/lib/serve.mjs`, `factory/lib/args.mjs`, `factory/lib/browser.mjs`, `factory/snap.mjs`
- Create: `factory/engine/post.js`, `factory/engine/app.js`, `factory/engine/player.js`, `factory/engine/player.css`
- Create: `03-perfume/index.html`, `03-perfume/film.js`, `03-perfume/js/shots.js` (skeleton), `03-perfume/js/bottle.js` (proxy), `03-perfume/js/worlds/common.js`, `03-perfume/js/worlds/studio.js`
- Test: `factory/test/serve.test.mjs`; browser smoke test through `snap.mjs` (Step 9)

**Interfaces:**
- Consumes: `parseVariant`, `allAxes`, `ASPECTS`, `MIN_TEXT` (Task 2); `buildCut`, `resolve` (Task 3); `solvePose`, `applyPose`, `projectPoint` (Task 4); `prepareLayer`, `drawLayer`, `canvasMeasure`, `fontStr` (Task 5); `clamp`, `lerp`, `easeInOut`, `ss` (Task 1); everything in `03-perfume/*.js` (Task 7).
- Produces:
  - `lib/serve.mjs`: `ROOT` (= SHOW), `serve(root = ROOT, port = 0) → Promise<{ port, url, close() }>`. It is also a CLI: `node factory/lib/serve.mjs [port]`.
  - `lib/args.mjs`: `parseArgs(argv) → { pos: string[], o: { key: string | true } }`.
  - `lib/browser.mjs`:
    - `CHROME_ARGS`, `launch() → Browser`.
    - `openFilm(browser, { base, film, query, ar, timeout }) → { page, info: { gpu, W, H, duration, fonts }, logs }`. The viewport is the output size. It throws if the page raises an error, `__app.ready` rejects, or the GPU is software.
    - `frameAt(page, t) → { png: Buffer, overflow: string[], shot }`.
  - `engine/post.js`:
    - `POST_DEFAULTS`, and `mergePost(...xs)`, which merges defaults → world → shot, with `bloom` merged field by field. Task 13 makes the default `focus: 'target'` and adds `focusOn(P, pose)`, which `app.js` applies to the solved pose.
    - `createPost(renderer) → { sceneRT, prevRT, taps, W, H, setSize(W, H), render({ camera, settings, t, target = null, prev = null, k = 1, flash = 0 }) }`.
    - `sceneRT` is MSAA ×4 HalfFloat with a `DepthTexture`.
    - Layered passes (Task 12): set `renderer.autoClear = false` and keep drawing into `sceneRT`. Each `renderer.render` resolves into `sceneRT.texture` / `depthTexture`, which the next pass may sample.
  - `engine/app.js`:
    - `boot(film)` sets `window.__app` and adds the player in live mode.
    - `createApp(film, { params, root })` returns `app = { ctx, film, mode: 'live' | 'render', gpu, overlays: [(g2d, ctx) => void], t, playing, hq, fonts, draw(t) → { t, shot, overflow }, size(), png(), jpeg(q), on('variant' | 'time', f), seek, play, pause, toggle, setHQ, redraw, setVariant(patch) → Promise, ready: Promise<{ gpu, W, H, duration, fonts }> }`.
    - `ctx = { THREE, renderer, scene, camera, variant, W, H, ar, post, clips, world, subjects, postDefaults, built, mode, params }`.
    - URL flags: `?render` (exact output size, no UI, no loop), `?paused`, `?t=`, plus one `?<axis>=` per axis.
  - `engine/player.js`: `createPlayer(app) → { bar, fail }`.
  - World module (`js/worlds/*.js`): `build(ctx) → { post?, macro: { root, camera(s) → intent, post? }, update?(ctx, s), reset?(), dispose?() }`. `build` sets `scene.environment` / `background` and adds its own lights and meshes. Task 13 replaces the `scene.environment` part with a returned `env` (see the World module contract above).
  - `js/worlds/common.js`: `envMap(renderer, { base, strip, k }, fill(add, B)) → PMREM texture`. Task 13 moves `fill` into the options as `fill(add, B, es)`, so a world can return them as `env` and `film.setup` calls `envMap`. It also adds `NOISE`, `haze`, `sky`, `dewMaterial`, `driftField`, `puffAtlas` and `billboards`.
  - `js/bottle.js` (proxy): `buildBottle(ctx, sku) → { root, parts: { glass, liquid, collar, pump, cap }, pose({ explode = 0, capLift = 0, press = 0 }), anchor(name) → [x, y, z], liquidTop() }`, with anchors `'cap' | 'collar' | 'liquid'`. The origin is at the base centre and the numbers come from `DIMS` / `EXPLODE`. Task 11 replaces the file. It keeps these members and adds the `logo` option, `pose({ ripple })`, the `'nozzle'` anchor and the `GLASS` / `SHAPE` / `RIPPLE` / `rippleHeight` / `logoMask` exports.
  - `js/shots.js`: `SHOTS = { macro, drop, hero, anatomy, spray, end }`, each `(ctx, s) → { camera, text, post? }`. Fit shots come from `VIEW`; leader layers get `leader.world = bottle.anchor(part)`.

- [ ] **Step 1: Write the failing server test**

`factory/test/serve.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { serve } from '../lib/serve.mjs';

const get = (port, p, headers = {}) => new Promise((ok, no) => {
  http.get({ host: '127.0.0.1', port, path: p, headers }, res => {
    const b = []; res.on('data', d => b.push(d)); res.on('end', () => ok({ status: res.statusCode, headers: res.headers, body: Buffer.concat(b) }));
  }).on('error', no);
});

test('static server: files, index, mime, 404, traversal, range', async t => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'serve-')), dir = path.join(base, 'root');
  fs.mkdirSync(path.join(dir, 'film'), { recursive: true });
  fs.writeFileSync(path.join(base, 'secret.txt'), 'secret');
  fs.writeFileSync(path.join(dir, 'film/index.html'), '<p>hi</p>');
  fs.writeFileSync(path.join(dir, 'film/a.js'), 'export default 1;');
  fs.writeFileSync(path.join(dir, 'film/v.mp4'), Buffer.from([...Array(100).keys()]));
  const s = await serve(dir, 0);
  t.after(() => s.close());

  const js = await get(s.port, '/film/a.js');
  assert.equal(js.status, 200);
  assert.match(js.headers['content-type'], /^text\/javascript/);
  assert.equal(js.body.toString(), 'export default 1;');

  assert.equal((await get(s.port, '/film')).status, 301);
  const idx = await get(s.port, '/film/?render&sku=rose');
  assert.equal(idx.status, 200);
  assert.match(idx.headers['content-type'], /^text\/html/);

  assert.equal((await get(s.port, '/film/nope.js')).status, 404);
  for (const p of ['/../secret.txt', '/..%2fsecret.txt', '/film/..%2f..%2fsecret.txt']) {
    const r = await get(s.port, p);
    assert.ok([403, 404].includes(r.status), `${p} → ${r.status}`);
    assert.notEqual(r.body.toString(), 'secret');
  }

  const part = await get(s.port, '/film/v.mp4', { Range: 'bytes=10-19' });
  assert.equal(part.status, 206);
  assert.equal(part.headers['content-range'], 'bytes 10-19/100');
  assert.deepEqual([...part.body], [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  const tail = await get(s.port, '/film/v.mp4', { Range: 'bytes=-5' });
  assert.deepEqual([...tail.body], [95, 96, 97, 98, 99]);
  assert.equal((await get(s.port, '/film/v.mp4', { Range: 'bytes=200-' })).status, 416);
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node --test factory/test/serve.test.mjs`
Expected: FAIL with `Cannot find module '.../factory/lib/serve.mjs'`.

- [ ] **Step 3: Write the server and the argument parser**

`factory/lib/serve.mjs`:

```js
// serve.mjs — 静态文件服务，根目录为 opus55-showcase/（这样 ../factory/ 的导入能解析）；支持 Range，画廊里的视频可以拖动
// 命令行：node factory/lib/serve.mjs [端口]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.woff2': 'font/woff2',
};
const stat = p => { try { return fs.statSync(p); } catch { return null; } };

export function serve(root = ROOT, port = 0) {
  root = path.resolve(root);
  const srv = http.createServer((req, res) => {
    let rel;
    try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
    let p = path.join(root, rel), st = stat(p);
    if (p !== root && !p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (st?.isDirectory()) {
      if (!rel.endsWith('/')) { res.writeHead(301, { Location: `${rel}/` }).end(); return; }
      p = path.join(p, 'index.html'); st = stat(p);
    }
    if (!st?.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found'); return; }
    const head = { 'Content-Type': MIME[path.extname(p).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
    if (m && (m[1] || m[2])) {
      const a = m[1] ? +m[1] : Math.max(0, st.size - +m[2]), b = m[1] && m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
      if (a > b || a >= st.size) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }).end(); return; }
      res.writeHead(206, { ...head, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1 });
      if (req.method === 'HEAD') res.end(); else fs.createReadStream(p, { start: a, end: b }).pipe(res);
      return;
    }
    res.writeHead(200, { ...head, 'Content-Length': st.size });
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(p).pipe(res);
  });
  return new Promise((ok, no) => {
    srv.once('error', no);
    srv.listen(port, '127.0.0.1', () => {
      const { port: pt } = srv.address();
      ok({ port: pt, url: `http://127.0.0.1:${pt}`, close: () => new Promise(r => { srv.closeAllConnections?.(); srv.close(r); }) });
    });
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const s = await serve(ROOT, +(process.argv[2] ?? 8765));
  console.log(`serving ${ROOT}\n  ${s.url}/`);
}
```

`factory/lib/args.mjs`:

```js
// args.mjs — 命令行参数：位置参数 + --键 值（没有值的 --键 记为 true）
export function parseArgs(argv) {
  const pos = [], o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { pos.push(a); continue; }
    const k = a.slice(2), next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) o[k] = true; else { o[k] = next; i++; }
  }
  return { pos, o };
}
```

Run: `node --test factory/test/serve.test.mjs`
Expected: PASS (1 test).

- [ ] **Step 4: Write the post chain**

A note on three 0.170, checked in its source (`WebGLTextures.js`): when a multisampled target resolves, three calls `invalidateFramebuffer` only on the Oculus browser. In desktop Chromium the multisample buffer survives. So the glass passes in Task 12 draw straight on top of `sceneRT` and sample what the previous pass resolved. A prototype confirmed this under headless Metal: drawing into `sceneRT` while sampling `sceneRT.texture` gave `gl.getError() === 0` and the expected pixels.

`factory/engine/post.js`:

```js
// post.js — 后期：MSAA 场景目标（带深度纹理）→ 景深 → 泛光（输入钳制）→ AgX + 调色 + 暗角 + 颗粒 + 闪白 / 叠化 → 屏幕或目标
// 分几次叠画（如玻璃折射）：每次 renderer.render 结束，three 把 sceneRT 的多重采样缓冲解析到 sceneRT.texture / depthTexture，
// 多重采样缓冲本身保留（three 只在 Oculus 浏览器上作废它）。所以下一遍可以关掉 autoClear 接着往 sceneRT 画，同时采样上一遍解析出的颜色和深度
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export const POST_DEFAULTS = {
  exposure: 1,
  focus: 0.5, aperture: 0, maxBlur: 0.012,          // 对焦距离（米）；景深强度（0 = 关）；最大弥散圆半径（画面短边比例）
  bloom: { strength: 0.22, radius: 0.45, threshold: 0.85 },
  lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], saturation: 1,
  vignette: 0.22, grain: 0.03, flashColor: [1, 0.98, 0.94],
};
/** 后期参数逐层覆盖：默认 → 世界 → 镜头；bloom 按字段合并 */
export const mergePost = (...xs) => xs.reduce((a, x) => (x ? { ...a, ...x, bloom: { ...a.bloom, ...x.bloom } } : a), POST_DEFAULTS);

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const quad = (fragmentShader, uniforms) => new FullScreenQuad(new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false }));

const DOF = /* glsl */`
uniform sampler2D tColor, tDepth; uniform vec2 res; uniform float focus, aperture, maxR, near, far; uniform int taps;
varying vec2 vUv;
float lin(float d) { return near * far / (far - d * (far - near)); }
float coc(float z) { return clamp(aperture * abs(1.0 - focus / z), 0.0, 1.0) * maxR; }
void main() {
  float z0 = lin(texture2D(tDepth, vUv).x), c0 = coc(z0);
  vec3 acc = texture2D(tColor, vUv).rgb; float ws = 1.0;
  if (maxR > 0.5 && aperture > 0.0) for (int i = 0; i < 64; i++) {
    if (i >= taps) break;
    float fi = float(i) + 0.5, r = sqrt(fi / float(taps)) * maxR, a = fi * 2.39996323;    // 黄金角螺旋采样
    vec2 uv = vUv + vec2(cos(a), sin(a)) * r / res;
    float z = lin(texture2D(tDepth, uv).x), c = coc(z);
    if (z > z0) c = min(c, c0);                        // 背后的虚化不溢到清晰的前景上
    float w = clamp(c - r + 1.0, 0.0, 1.0);
    acc += texture2D(tColor, uv).rgb * w; ws += w;
  }
  gl_FragColor = vec4(acc / ws, 1.0);
}`;

// AgX 取自 three 0.170 的 tonemapping_pars_fragment（输入输出都是线性 sRGB）
const GRADE = /* glsl */`
uniform sampler2D tDiffuse, tPrev; uniform vec2 res;
uniform float exposure, saturation, vignette, grain, seed, flash, mixK;
uniform vec3 lift, gamma, gain, flashColor;
varying vec2 vUv;
const mat3 S2R = mat3(vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.0880), vec3(0.0433, 0.0113, 0.8956));
const mat3 R2S = mat3(vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187));
const mat3 INSET = mat3(vec3(0.856627153315983, 0.137318972929847, 0.11189821299995), vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903), vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859));
const mat3 OUTSET = mat3(vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826), vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294), vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405));
vec3 agx(vec3 c) {
  c = INSET * (S2R * c);
  c = clamp((log2(max(c, 1e-10)) + 12.47393) / 16.5, 0.0, 1.0);
  vec3 x2 = c * c, x4 = x2 * x2;
  c = 15.5 * x4 * x2 - 40.14 * x4 * c + 31.96 * x4 - 6.868 * x2 * c + 0.4298 * x2 + 0.1191 * c - 0.00232;
  return clamp(R2S * pow(max(OUTSET * c, 0.0), vec3(2.2)), 0.0, 1.0);
}
vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
void main() {
  vec3 c = agx(texture2D(tDiffuse, vUv).rgb * exposure);
  c = mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, saturation);
  c = pow(max(c * gain + lift * (1.0 - c), 0.0), 1.0 / gamma);
  float r = length(vUv - 0.5) * 1.4142;
  c *= 1.0 - vignette * smoothstep(0.3, 1.05, r);
  c = srgb(clamp(c, 0.0, 1.0));
  c += (hash(gl_FragCoord.xy + seed * 61.7) - 0.5) * grain;
  c = mix(c, flashColor, flash);
  c = mix(texture2D(tPrev, vUv).rgb, c, mixK);
  gl_FragColor = vec4(c, 1.0);
}`;

export function createPost(renderer) {
  const sceneRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(1, 1) });
  const dofRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  const prevRT = new THREE.WebGLRenderTarget(1, 1);                   // 叠化时上一镜头的成品（已编码 sRGB）
  const dof = quad(DOF, { tColor: { value: null }, tDepth: { value: null }, res: { value: new THREE.Vector2() }, focus: { value: 1 }, aperture: { value: 0 }, maxR: { value: 0 }, near: { value: 0.01 }, far: { value: 100 }, taps: { value: 32 } });
  const U = { tDiffuse: { value: dofRT.texture }, tPrev: { value: null }, res: { value: new THREE.Vector2() }, seed: { value: 0 }, flash: { value: 0 }, mixK: { value: 1 } };
  for (const k of ['exposure', 'saturation', 'vignette', 'grain']) U[k] = { value: 0 };
  for (const k of ['lift', 'gamma', 'gain', 'flashColor']) U[k] = { value: new THREE.Vector3() };
  const grade = quad(GRADE, U);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.2, 0.4, 0.85);
  // 泛光输入钳制：玻璃棱边与金属件的针尖高光可达上百倍 HDR，不钳制会被放大成整片光晕（同 02）
  const hp = bloom.materialHighPassFilter, TEX = 'vec4 texel = texture2D( tDiffuse, vUv );';
  if (!hp.fragmentShader.includes(TEX)) throw new Error('post: UnrealBloomPass high-pass shader changed');
  hp.fragmentShader = hp.fragmentShader.replace(TEX, `${TEX}\n\ttexel.rgb *= min( 1.0, 6.0 / max( 1e-4, max( texel.r, max( texel.g, texel.b ) ) ) );`);
  hp.needsUpdate = true;
  const black = new THREE.DataTexture(new Uint8Array(4), 1, 1); black.needsUpdate = true;

  const post = {
    sceneRT, prevRT, taps: 32, W: 1, H: 1,
    setSize(W, H) {
      post.W = W; post.H = H;
      for (const rt of [sceneRT, dofRT, prevRT]) rt.setSize(W, H);
      bloom.setSize(W, H); U.res.value.set(W, H); dof.material.uniforms.res.value.set(W, H);
    },
    /** sceneRT → 景深 → 泛光 → 调色 → target（null = 画布）；prev / k = 叠化；flash = 闪白 0..1；t 决定颗粒 */
    render({ camera, settings: P, t, target = null, prev = null, k = 1, flash = 0 }) {
      const d = dof.material.uniforms;
      d.tColor.value = sceneRT.texture; d.tDepth.value = sceneRT.depthTexture;
      d.focus.value = P.focus; d.aperture.value = P.aperture; d.maxR.value = P.maxBlur * Math.min(post.W, post.H);
      d.near.value = camera.near; d.far.value = camera.far; d.taps.value = post.taps;
      renderer.setRenderTarget(dofRT); dof.render(renderer);
      bloom.strength = P.bloom.strength; bloom.radius = P.bloom.radius; bloom.threshold = P.bloom.threshold;
      if (P.bloom.strength > 0) bloom.render(renderer, null, dofRT, 0, false);
      U.exposure.value = P.exposure; U.saturation.value = P.saturation; U.vignette.value = P.vignette; U.grain.value = P.grain;
      U.lift.value.fromArray(P.lift); U.gamma.value.fromArray(P.gamma); U.gain.value.fromArray(P.gain); U.flashColor.value.fromArray(P.flashColor);
      U.seed.value = Math.round(t * 60) % 997; U.flash.value = flash;
      U.tPrev.value = prev ?? black; U.mixK.value = prev ? k : 1;
      renderer.setRenderTarget(target); grade.render(renderer);
    },
  };
  return post;
}
```

- [ ] **Step 5: Write the frame loop**

`factory/engine/app.js`:

```js
// app.js — 引擎主循环：变体 → 剪辑表 → 镜头 → 取景 → 渲染 → 后期 → 字幕合成。一帧只由 (变体, t) 决定
// 页面里有两张画布：WebGL 画 3D 与后期，2D 画布把它拷过来再叠字幕；导出和截图都取 2D 画布
import * as THREE from 'three';
import { parseVariant, ASPECTS, MIN_TEXT } from './variant.js';
import { buildCut, resolve } from './timeline.js';
import { solvePose, applyPose, projectPoint } from './framing.js';
import { prepareLayer, drawLayer, canvasMeasure, fontStr } from './text.js';
import { createPost, mergePost } from './post.js';
import { clamp } from './ease.js';

/** 页面入口：film.js 的默认导出 → window.__app；预览模式再挂上播放器 */
export function boot(film) {
  const params = new URLSearchParams(location.search);
  const app = createApp(film, { params });
  window.__app = app;
  if (app.mode === 'live') import('./player.js').then(m => m.createPlayer(app));
  return app;
}

function disposeTree(root) {
  root.traverse(o => {
    o.geometry?.dispose();
    for (const m of [].concat(o.material ?? [])) {
      for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
      m.dispose();
    }
  });
}

export function createApp(film, { params = new URLSearchParams(), root = document.getElementById('stage') } = {}) {
  const mode = params.has('render') ? 'render' : 'live';
  document.documentElement.dataset.mode = mode;
  const preview = mode === 'live' || params.has('sheet');
  const gl = Object.assign(document.createElement('canvas'), { className: 'gl' });
  const out = Object.assign(document.createElement('canvas'), { className: 'out' });
  root.append(gl, out);
  const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const g = out.getContext('2d'), measure = canvasMeasure(g);
  const glx = renderer.getContext(), dbg = glx.getExtension('WEBGL_debug_renderer_info');
  const gpu = dbg ? glx.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : glx.getParameter(glx.RENDERER);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.01, 200);
  const post = createPost(renderer);
  const ctx = { THREE, renderer, scene, camera, variant: null, W: 0, H: 0, ar: null, post, clips: null, world: null, subjects: {}, postDefaults: {}, built: null, mode, params };
  const listeners = { variant: [], time: [] }, emit = (ev, x) => listeners[ev].forEach(f => f(x));
  let sceneKey = null, fonts = [], clock = clamp(+(params.get('t') ?? 0) || 0, 0, 1e9), playing = false, dirty = true, hq = true, last = null;

  // ── 尺寸：导出时正好是成片尺寸；预览时按舞台大小缩小 ──
  function size() {
    const [OW, OH] = ASPECTS[ctx.variant.ar];
    let k = 1;
    if (mode === 'live') {                                         // 舞台按比例塞进窗口（下方留出播放器）
      const s = Math.min((innerWidth * 0.96) / OW, Math.max(200, innerHeight - 150) / OH);
      root.style.width = `${Math.round(OW * s)}px`; root.style.height = `${Math.round(OH * s)}px`;
      k = Math.min(1, s * devicePixelRatio) * (hq ? 1 : 0.6);
    }
    const W = Math.round(OW * k), H = Math.round(OH * k);
    post.taps = hq ? 32 : 12;
    if (W === ctx.W && H === ctx.H) return;
    ctx.W = W; ctx.H = H; renderer.setSize(W, H, false); out.width = W; out.height = H; post.setSize(W, H); dirty = true;
  }

  // ── 字体：按变体的确切字符加载；有字体（或这一字重）没加载上就报错，不用回退字体出片 ──
  // 缺了某个字重时浏览器会拿相近字重顶上并照样返回，所以要逐个核对返回的字重
  const weightOk = (face, w) => { const [a, b = a] = String(face.weight).split(' ').map(x => (x === 'normal' ? 400 : x === 'bold' ? 700 : +x)); return w >= a && w <= b; };
  async function loadFonts(v) {
    const list = film.fonts(v), bad = [];
    await Promise.all(list.map(async f => {
      const faces = await document.fonts.load(fontStr(f, 40), f.text), w = f.weight ?? 400;
      if (!faces.length || faces.some(x => x.status !== 'loaded' || !weightOk(x, w))) bad.push(`${w} ${f.family}`);
    }));
    if (bad.length) throw new Error(`fonts not loaded: ${bad.join(', ')}`);
    return list.map(f => `${f.weight} ${f.family}`);
  }

  async function load(v) {
    ctx.variant = v; ctx.ar = v.ar; ctx.built = buildCut(film.cuts[v.cut]);
    size();
    const fontsP = loadFonts(v), key = film.sceneAxes.map(k => v[k]).join('|');
    if (key !== sceneKey) {
      ctx.world?.dispose?.(); disposeTree(scene); scene.clear();
      scene.environment?.dispose(); scene.environment = null; scene.background = null;
      ctx.subjects = {}; ctx.world = null;
      await film.setup(ctx);
      sceneKey = key;
      await renderer.compileAsync(scene, camera);
    }
    fonts = await fontsP;
    for (const e of ctx.built.entries) draw(e.start + (e.end - e.start) / 2);   // 每个镜头先画一帧：编译只在某些镜头出现的着色器
    clock = clamp(clock, 0, ctx.built.duration); dirty = true;
    emit('variant', v);
  }

  // ── 一个镜头的求值：复位 → 镜头函数 → 取景 → 字幕图层（引线端点按这一镜头的相机投影）──
  function evalShot(index, t) {
    const e = ctx.built.entries[index], lt = e.from + (t - e.start);
    const row = film.layouts[ctx.ar]?.[e.shot] ?? {};
    const s = { name: e.shot, lt, dur: e.dur, u: clamp(lt / e.dur), from: e.from, t, row };
    film.reset(ctx);
    const o = film.shots[e.shot](ctx, s);
    applyPose(camera, solvePose(o.camera, row, ctx.W / ctx.H), ctx.W, ctx.H);
    const text = (o.text ?? []).map(L => {
      const P = prepareLayer(L, { lt, zones: row.zones, W: ctx.W, H: ctx.H, minFrac: MIN_TEXT[ctx.ar], preview });
      if (L.leader?.world) { const [x, y] = projectPoint(camera, L.leader.world); P.leader = { ...L.leader, at: [x * ctx.W, y * ctx.H] }; }
      return P;
    });
    return { s, text, post: mergePost(ctx.postDefaults, o.post) };
  }
  function renderShot(E, target, mix = {}) {
    if (film.render) film.render(ctx, post.sceneRT);
    else { renderer.setRenderTarget(post.sceneRT); renderer.clear(); renderer.render(scene, camera); }
    post.render({ camera, settings: E.post, t: E.s.t, target, ...mix });
  }

  /** 画出 t 时刻的完整一帧（3D + 后期 + 字幕），返回 { t, shot, overflow: [图层 id] } */
  function draw(t) {
    t = clamp(t, 0, ctx.built.duration);
    const r = resolve(ctx.built, t);
    let prev = null;
    if (r.prev) { prev = evalShot(r.index - 1, t); renderShot(prev, post.prevRT); }
    const cur = evalShot(r.index, t);
    renderShot(cur, null, { prev: prev && post.prevRT.texture, k: r.prev?.k ?? 1, flash: r.flash });
    g.save(); g.globalAlpha = 1; g.drawImage(gl, 0, 0); g.restore();
    const overflow = [];
    if (prev) for (const L of prev.text) drawLayer(g, { ...L, alpha: L.alpha * (1 - r.prev.k) }, measure);
    for (const L of cur.text) if (drawLayer(g, L, measure).overflow) overflow.push(`${r.shot}.${L.id}`);
    for (const f of app.overlays) f(g, ctx);
    return { t, shot: r.shot, overflow };
  }

  function loop(now) {
    if (last != null && playing) { clock += (now - last) / 1000; if (clock >= ctx.built.duration) clock %= ctx.built.duration; dirty = true; }
    last = now;
    if (dirty && ctx.built) { size(); draw(clock); dirty = false; emit('time', clock); }
    requestAnimationFrame(loop);
  }

  let chain = Promise.resolve();
  const app = {
    ctx, film, mode, gpu, overlays: [],
    get t() { return clock; }, get playing() { return playing; }, get hq() { return hq; }, get fonts() { return fonts; },
    draw, size,
    png: () => out.toDataURL('image/png'),
    jpeg: (q = 0.92) => out.toDataURL('image/jpeg', q),
    on(ev, f) { listeners[ev].push(f); },
    seek(t) { clock = clamp(t, 0, ctx.built.duration); dirty = true; },
    play() { playing = true; }, pause() { playing = false; }, toggle() { playing = !playing; },
    setHQ(on) { hq = on; ctx.W = 0; size(); },
    redraw() { dirty = true; },
    /** 换变体：场景轴（如香型）变了才重建场景，其余即时切换；调用按顺序排队 */
    setVariant(patch) { chain = chain.then(() => load(parseVariant(film, { ...ctx.variant, ...patch }))); return chain; },
  };
  app.ready = (async () => {
    await load(parseVariant(film, params));
    if (mode === 'live') { playing = !params.has('paused'); requestAnimationFrame(loop); addEventListener('resize', () => { dirty = true; }); }
    return { gpu, W: ctx.W, H: ctx.H, duration: ctx.built.duration, fonts };
  })();
  return app;
}
```

- [ ] **Step 6: Write the live preview player**

`factory/engine/player.js`:

```js
// player.js — 预览播放器：各轴的变体选择、播放 / 暂停、按镜头分段的时间轴、高画质开关、快捷键；变体写回地址栏，刷新后保持
import { allAxes } from './variant.js';

const FRAME = 1 / 30;

export function createPlayer(app) {
  const { film } = app, axes = allAxes(film);
  const bar = document.createElement('nav');
  bar.className = 'player';
  bar.innerHTML = `
    <div class="axes"></div>
    <div class="transport">
      <button class="play" type="button" title="播放 / 暂停（空格）">❚❚</button>
      <div class="track"><div class="shots"></div><input class="scrub" type="range" min="0" max="1" step="0.001" value="0" aria-label="时间" /></div>
      <output class="time">0.00 s</output>
      <label class="hq" title="高画质（Q）"><input type="checkbox" checked /> HQ</label>
    </div>
    <p class="keys">空格 播放 · ← → 0.5 秒 · Shift + ← → 一帧 · 1–9 跳到第 n 个镜头 · Q 高画质</p>
    <p class="err" hidden></p>`;
  document.body.append(bar);
  const $ = s => bar.querySelector(s), scrub = $('.scrub'), time = $('.time'), play = $('.play'), hq = $('.hq input'), err = $('.err');
  const fail = e => { console.error(e); err.hidden = false; err.textContent = String(e?.message ?? e); };

  const selects = {};
  for (const [k, list] of Object.entries(axes)) {
    const sel = document.createElement('select');
    sel.setAttribute('aria-label', k);
    sel.innerHTML = list.map(x => `<option value="${x}">${x}</option>`).join('');
    sel.onchange = () => { err.hidden = true; app.setVariant({ [k]: sel.value }).catch(fail); };
    const lab = document.createElement('label'); lab.append(k, sel); $('.axes').append(lab);
    selects[k] = sel;
  }

  function onVariant(v) {
    for (const [k, sel] of Object.entries(selects)) sel.value = String(v[k]);
    const b = app.ctx.built;
    scrub.max = b.duration;
    $('.shots').innerHTML = b.entries.map(e => `<span style="left:${(e.start / b.duration) * 100}%;width:${((e.end - e.start) / b.duration) * 100}%">${e.shot}</span>`).join('');
    const q = new URLSearchParams(location.search);
    for (const k of Object.keys(axes)) q.set(k, v[k]);
    q.delete('t');
    history.replaceState(null, '', `?${q}`);
  }
  function onTime(t) {
    scrub.value = t; time.textContent = `${t.toFixed(2)} s`;
    play.textContent = app.playing ? '❚❚' : '▶';
  }
  app.on('variant', onVariant);
  app.on('time', onTime);
  app.ready.then(() => { onVariant(app.ctx.variant); onTime(app.t); }, fail);

  play.onclick = () => { app.toggle(); onTime(app.t); };
  scrub.oninput = () => { app.pause(); app.seek(+scrub.value); };
  hq.onchange = () => app.setHQ(hq.checked);
  addEventListener('keydown', e => {
    if (e.target.closest?.('select, input') && e.key !== ' ') return;
    const b = app.ctx.built;
    if (e.key === ' ') { e.preventDefault(); app.toggle(); onTime(app.t); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { app.pause(); app.seek(app.t + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? FRAME : 0.5)); }
    else if (/^[1-9]$/.test(e.key) && b.entries[+e.key - 1]) { app.pause(); app.seek(b.entries[+e.key - 1].start); }
    else if (e.key === 'q' || e.key === 'Q') { hq.checked = !hq.checked; app.setHQ(hq.checked); }
  });
  return { bar, fail };
}
```

`factory/engine/player.css`:

```css
/* player.css — 预览页：画面居中按比例缩放，下方是播放器；导出模式（?render）只留画面 */
:root { color-scheme: dark; --ui: #d9d6cf; --dim: #8a877f; --line: #34332f; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: #111110; color: var(--ui); font: 13px/1.4 system-ui, -apple-system, "PingFang SC", sans-serif; }
body { display: flex; flex-direction: column; align-items: center; }
#stage { position: relative; margin-top: 16px; background: #000; box-shadow: 0 10px 40px #0008; }
#stage canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
#stage canvas.gl { visibility: hidden; }

.player { width: min(960px, 96vw); padding: 10px 0 0; }
.player .axes { display: flex; flex-wrap: wrap; gap: 6px 14px; justify-content: center; }
.player label { display: inline-flex; align-items: center; gap: 6px; color: var(--dim); }
.player select { background: #1d1c1a; color: var(--ui); border: 1px solid var(--line); border-radius: 4px; padding: 2px 4px; }
.player .transport { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
.player .play { width: 34px; height: 28px; background: #1d1c1a; color: var(--ui); border: 1px solid var(--line); border-radius: 4px; cursor: pointer; }
.player .track { position: relative; flex: 1; height: 28px; }
.player .shots { position: absolute; inset: 0; }
.player .shots span { position: absolute; top: 0; bottom: 0; border-left: 1px solid var(--line); padding: 1px 4px; color: var(--dim); font-size: 11px; overflow: hidden; white-space: nowrap; }
.player .scrub { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; margin: 0; accent-color: #c9a45c; }
.player .time { width: 64px; text-align: right; font-variant-numeric: tabular-nums; }
.player .keys { margin: 6px 0 0; text-align: center; color: var(--dim); font-size: 12px; }
.player .err { margin: 6px 0 0; padding: 6px 10px; background: #4a1512; color: #ffd9d4; border-radius: 4px; white-space: pre-wrap; }

html[data-mode="render"], html[data-mode="render"] body { overflow: hidden; background: #000; }
html[data-mode="render"] body { display: block; }
html[data-mode="render"] #stage { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; margin: 0; box-shadow: none; }
```

- [ ] **Step 7: Write the Chromium launcher and `snap.mjs`**

`factory/lib/browser.mjs`:

```js
// browser.mjs — 启动无头 Chromium（走 Metal GPU）、打开成片页面并等 __app.ready；拿到软件渲染（SwiftShader）直接报错
import { chromium } from 'playwright';
import { ASPECTS } from '../engine/variant.js';

export const CHROME_ARGS = ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'];

export const launch = () => chromium.launch({ headless: true, args: CHROME_ARGS });

/**
 * 打开 <base>/<film>/?<query>，视口 = 成片尺寸。页面报错、字体没加载上、GPU 是软件渲染都会抛错。
 * 返回 { page, info: { gpu, W, H, duration, fonts }, logs: 控制台 error 级消息 }
 */
export async function openFilm(browser, { base, film, query = '', ar = '9x16', timeout = 90_000 }) {
  const [width, height] = ASPECTS[ar];
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [], logs = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') logs.push(m.text()); });
  const fail = msg => { throw new Error([msg, ...errors.map(e => `  page: ${e}`), ...logs.map(e => `  console: ${e}`)].join('\n')); };
  const died = new Promise(res => page.once('pageerror', res));      // 启动时抛错就别等到超时
  await page.goto(`${base}/${film}/?${query}`);
  await Promise.race([page.waitForFunction(() => window.__app, null, { timeout }), died.then(e => { throw e; })]).catch(() => fail(`${film}: page never created window.__app`));
  let info;
  try { info = await page.evaluate(() => window.__app.ready); } catch (e) { fail(`${film}: __app.ready rejected: ${e.message.split('\n')[0]}`); }
  if (/swiftshader|llvmpipe|software/i.test(info.gpu)) fail(`${film}: software WebGL (${info.gpu}); refusing to render`);
  if (errors.length) fail(`${film}: page errors`);
  return { page, info, logs };
}

/** 页面里画 t 时刻的一帧，返回 { png: Buffer, overflow, shot } */
export async function frameAt(page, t) {
  const r = await page.evaluate(t => { const d = window.__app.draw(t); return { ...d, url: window.__app.png() }; }, t);
  return { png: Buffer.from(r.url.slice(r.url.indexOf(',') + 1), 'base64'), overflow: r.overflow, shot: r.shot };
}
```

`factory/snap.mjs`:

```js
// snap.mjs — 按成片尺寸渲染几帧 PNG，供目视检查：
//   node factory/snap.mjs 03-perfume --t 1,6.4,12 --ar 9x16 --sku rose --lang en [--world studio] [--out 目录]
// 未写的轴取第一个值；输出 <film>/out/snap/<文件名>_t<秒>.png；有字幕溢出时列出图层并以状态码 1 退出
import fs from 'node:fs'; import path from 'node:path';
import { serve, ROOT } from './lib/serve.mjs';
import { launch, openFilm, frameAt } from './lib/browser.mjs';
import { parseArgs } from './lib/args.mjs';

const { pos: [film], o } = parseArgs(process.argv.slice(2));
if (!film || !fs.existsSync(path.join(ROOT, film, 'film.js'))) { console.error('usage: node factory/snap.mjs <film-dir> [--t 1,6.4] [--ar 9x16] [--<axis> value] [--out dir]'); process.exit(2); }
const times = String(o.t ?? '0').split(',').map(Number), outDir = path.resolve(o.out ?? path.join(ROOT, film, 'out', 'snap'));
const q = new URLSearchParams({ render: '', paused: '' });
for (const [k, v] of Object.entries(o)) if (!['t', 'out'].includes(k)) q.set(k, v === true ? '' : v);

const srv = await serve(ROOT), browser = await launch();
let bad = 0;
try {
  const { page, info } = await openFilm(browser, { base: srv.url, film, query: q.toString(), ar: o.ar ?? '9x16' });
  const name = await page.evaluate(() => window.__app.film.fileName(window.__app.ctx.variant));
  console.log(`${name}  ${info.W}×${info.H}  ${info.duration}s  gpu: ${info.gpu}\n  fonts: ${info.fonts.join(', ')}`);
  fs.mkdirSync(outDir, { recursive: true });
  for (const t of times) {
    const t0 = Date.now(), { png, overflow, shot } = await frameAt(page, t), file = path.join(outDir, `${name}_t${t}.png`);
    fs.writeFileSync(file, png);
    console.log(`  t=${t} ${shot}  ${Date.now() - t0} ms  → ${path.relative(ROOT, file)}${overflow.length ? `  OVERFLOW: ${overflow.join(', ')}` : ''}`);
    bad += overflow.length;
  }
} finally {
  await browser.close(); await srv.close();
}
process.exit(bad ? 1 : 0);
```

- [ ] **Step 8: Write the film skeleton: page, film module, shots, proxy bottle, studio world**

`03-perfume/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>闻境 WENJING · 香水产品视频工厂</title>
  <meta name="description" content="一个模板批量出片：闻境香水的电商产品视频，覆盖三种画面比例、四款香型、中英文、15 / 6 秒和促销版本。" />
  <link rel="icon" href="data:," />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/noto-serif-sc@5/500.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/noto-serif-sc@5/600.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5/700.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/cormorant-garamond@5/500.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/cormorant-garamond@5/600.css" />
  <link rel="stylesheet" href="../factory/engine/player.css" />
  <script type="importmap">
    {
      "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
      }
    }
  </script>
</head>
<body>
  <main id="stage" aria-label="闻境产品视频预览"></main>
  <script type="module">
    import { boot } from '../factory/engine/app.js';
    import film from './film.js';
    boot(film);
  </script>
</body>
</html>
```

`03-perfume/film.js`:

```js
// film.js — 闻境成片模板：把数据（轴、剪辑表、构图、字体）、场景（世界 + 瓶子）和六个镜头交给引擎（见 factory/README.md 的成片约定）
import { META } from './meta.js';
import { SKUS } from './skus.js';
import { LAYOUTS } from './layouts.js';
import { fontsFor } from './captions.js';
import { buildBottle } from './js/bottle.js';
import { SHOTS } from './js/shots.js';

const studio = () => import('./js/worlds/studio.js');
// 各香型的世界；还没做的先用中性影棚。?world=studio 可强制影棚，单独调瓶子和玻璃
const WORLDS = { studio, whitetea: studio, osmanthus: studio, seasalt: studio, rose: studio };

export default {
  ...META,
  layouts: LAYOUTS,
  fonts: fontsFor,
  async setup(ctx) {
    const sku = SKUS[ctx.variant.sku], id = ctx.params.get('world') ?? sku.world;
    if (!WORLDS[id]) throw new Error(`unknown world: ${id} (expected ${Object.keys(WORLDS).join(' | ')})`);
    ctx.world = await (await WORLDS[id]()).build(ctx);
    ctx.postDefaults = ctx.world.post ?? {};
    const bottle = buildBottle(ctx, sku);
    ctx.scene.add(bottle.root);
    ctx.subjects = { bottle };
  },
  /** 每次求值镜头前复位所有逐帧可变的状态：跳着看和顺序播放得到同一帧 */
  reset(ctx) {
    ctx.subjects.bottle.pose();
    ctx.world.reset?.();
  },
  shots: SHOTS,
};
```

`03-perfume/js/shots.js`:

```js
// shots.js — 六个镜头：每个镜头只由镜头本地时间 s.lt 决定相机意图、瓶子姿态、字幕与后期
// 框取对象、仰角、方位角都写在 meta.js 的 VIEW 表里（layouts 测试也用它），这里只管随时间怎么动
import * as THREE from 'three';
import { VIEW, BOX, viewDir } from '../meta.js';
import { layersFor } from '../captions.js';
import { lerp, easeInOut, ss } from '../../factory/engine/ease.js';

const box3 = ([a, b]) => new THREE.Box3(new THREE.Vector3(...a), new THREE.Vector3(...b));
const BOXES = { bottle: box3(BOX.bottle), exploded: box3(BOX.exploded) };

/** 按 VIEW 表框取；方位角随镜头进度 u 从起值缓动到止值 */
function fit(name, s, extra = {}) {
  const V = VIEW[name];
  return { type: 'fit', box: BOXES[V.box], dir: viewDir(V.pitch, lerp(V.yaw[0], V.yaw[1], easeInOut(s.u))), fov: V.fov, ...extra };
}
/** 本镜头的字幕图层；带引线的图层补上部件的世界坐标（引擎按这一镜头的相机投影到画面） */
const text = (ctx, s) => layersFor(ctx.variant, s).map(L => (L.leader ? { ...L, leader: { ...L.leader, world: ctx.subjects.bottle.anchor(L.leader.part) } } : L));
const world = (ctx, s) => ctx.world.update?.(ctx, s);

export const SHOTS = {
  macro(ctx, s) {
    world(ctx, s);
    const m = ctx.world.macro;
    return { camera: m.camera(s), text: text(ctx, s), post: m.post };
  },
  drop(ctx, s) {
    world(ctx, s);
    return { camera: fit('drop', s), text: text(ctx, s) };
  },
  hero(ctx, s) {
    world(ctx, s);
    return { camera: fit('hero', s), text: text(ctx, s) };
  },
  anatomy(ctx, s) {
    world(ctx, s);
    ctx.subjects.bottle.pose({ explode: easeInOut(ss(0.15, 1.1, s.lt)) * (1 - easeInOut(ss(2.2, 2.9, s.lt))) });
    return { camera: fit('anatomy', s), text: text(ctx, s) };
  },
  spray(ctx, s) {
    world(ctx, s);
    ctx.subjects.bottle.pose({ press: ss(0.25, 0.4, s.lt) * (1 - ss(0.8, 1.0, s.lt)) });
    return { camera: fit('spray', s), text: text(ctx, s) };
  },
  end(ctx, s) {
    world(ctx, s);
    return { camera: fit('end', s), text: text(ctx, s) };
  },
};
```

`03-perfume/js/bottle.js` is a proxy. It has the right size and interface, but its glass is a flat transparent box. Task 11 replaces it:

```js
// bottle.js — 瓶子（Task 8 的替身：方块瓶身 + 颈圈 + 瓶盖；尺寸和基本接口与 Task 11 的正式瓶子一致）
import * as THREE from 'three';
import { DIMS, EXPLODE } from '../meta.js';

const CAP = { silver: ['#c9ccd0', 0.35], gold: ['#d4a64a', 0.2], frost: ['#eef2f3', 0.55], lacquer: ['#141214', 0.15] };

export function buildBottle(ctx, sku) {
  const { w, d, body, collar, cap } = DIMS, root = new THREE.Group();
  const M = (o) => new THREE.MeshPhysicalMaterial(o);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(w, body, d), M({ color: '#e8eef0', roughness: 0.05, transparent: true, opacity: 0.35 }));
  glass.position.y = body / 2;
  const liquid = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, body * 0.62, d * 0.76), M({ color: sku.liquid.color, roughness: 0.1 }));
  liquid.position.y = body * 0.08 + body * 0.31;
  const coll = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, collar, 32), M({ color: '#d4a64a', metalness: 1, roughness: 0.25 }));
  const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, collar * 1.4, 16), M({ color: '#cccccc', metalness: 1, roughness: 0.3 }));
  const [cc, cr] = CAP[sku.cap];
  const capM = new THREE.Mesh(new THREE.BoxGeometry(0.036, cap, 0.036), M({ color: cc, metalness: sku.cap === 'lacquer' ? 0 : 1, roughness: cr, clearcoat: sku.cap === 'lacquer' ? 1 : 0 }));
  for (const m of [glass, liquid, coll, pump, capM]) { m.castShadow = true; root.add(m); }
  const parts = { glass, liquid, collar: coll, pump, cap: capM }, _v = new THREE.Vector3();
  const bottle = {
    root, parts,
    /** explode 0..1 分解程度；capLift 瓶盖额外上抬（米）；press 喷头按下 0..1 */
    pose({ explode = 0, capLift = 0, press = 0 } = {}) {
      coll.position.y = body + collar / 2 + EXPLODE.collar * explode;
      pump.position.y = body + collar * 0.7 + EXPLODE.pump * explode - 0.002 * press;
      capM.position.y = body + collar + cap / 2 + EXPLODE.cap * explode + capLift;
      root.updateMatrixWorld(true);
    },
    /** 引线端点（世界坐标）：'cap' | 'collar' | 'liquid' */
    anchor(name) { return parts[name].getWorldPosition(_v).toArray(); },
    liquidTop: () => liquid.position.y + body * 0.31,
  };
  bottle.pose();
  return bottle;
}
```

`03-perfume/js/worlds/common.js`:

```js
// common.js — 各世界共用的场景件：反射环境（PMREM，总带几条隐藏的长条灯）
import * as THREE from 'three';

/**
 * 用一个程序场景生成反射环境。fill(add, B) 往里放发光面：add(w, h, [x, y, z], mat) 放一块朝向中心的面片，B(颜色, 倍数) 是发光材质。
 * 另外总放左右后方两条竖长条灯和顶上一条横长条灯：玻璃棱边靠它们勾出清楚的亮线
 */
export function envMap(renderer, { base = '#1c1d20', strip = '#ffffff', k = 5 } = {}, fill = () => {}) {
  const es = new THREE.Scene();
  const B = (c, s = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(s), side: THREE.DoubleSide });
  const add = (w, h, pos, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(...pos); m.lookAt(0, 0, 0); es.add(m); return m; };
  const room = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), B(base)); room.material.side = THREE.BackSide; es.add(room);
  const S = B(strip, k);
  add(0.9, 16, [-9, 3, -5], S); add(0.9, 16, [9, 3, -5], S); add(16, 0.9, [0, 12, 1], S);
  fill(add, B);
  const pm = new THREE.PMREMGenerator(renderer), tex = pm.fromScene(es, 0.02).texture;
  pm.dispose();
  es.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
  return tex;
}
```

`03-perfume/js/worlds/studio.js`:

```js
// studio.js — 中性影棚：无缝背景弯、两侧长条柔光、一盏主光。单独调瓶子和玻璃时用（?world=studio），也是还没做世界的香型的替身
import * as THREE from 'three';
import { envMap } from './common.js';

/** 背景弯：地面 → 圆弧 → 背墙，一张弯曲的平面 */
function sweep({ width = 14, floor = 3, R = 0.8, wall = 3, z0 = 1.2 }) {
  const g = new THREE.PlaneGeometry(width, 1, 1, 96), p = g.attributes.position, arc = (Math.PI / 2) * R, L = floor + arc + wall;
  for (let i = 0; i < p.count; i++) {
    const s = (0.5 - p.getY(i)) * L;
    let y, z;
    if (s < floor) { y = 0; z = z0 - s; }
    else if (s < floor + arc) { const a = (s - floor) / R; y = R * (1 - Math.cos(a)); z = z0 - floor - R * Math.sin(a); }
    else { y = R + (s - floor - arc); z = z0 - floor - R; }
    p.setXYZ(i, p.getX(i), y, z);
  }
  g.computeVertexNormals();
  return g;
}

export async function build(ctx) {
  const { scene, renderer } = ctx;
  scene.environment = envMap(renderer, { base: '#17181b' }, (add, B) => {
    add(8, 5, [0, 5, 12], B('#fff6ec', 1.4));                 // 正面大柔光
    add(3, 8, [-10, 3, 6], B('#dfe8ff', 2.2));                // 左前冷光
    add(3, 8, [10, 3, 6], B('#ffe8d2', 1.8));                 // 右前暖光
  });
  scene.environmentIntensity = 1;
  scene.background = new THREE.Color('#0f1012');
  const bg = new THREE.Mesh(sweep({}), new THREE.MeshStandardMaterial({ color: '#2b2d31', roughness: 0.82, side: THREE.DoubleSide }));
  bg.receiveShadow = true; scene.add(bg);
  const key = new THREE.DirectionalLight('#fff3e6', 2.4);
  key.position.set(-0.5, 0.9, 0.7); key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -0.5, right: 0.5, top: 0.5, bottom: -0.5, near: 0.1, far: 3 });
  key.shadow.camera.updateProjectionMatrix(); key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 4;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight('#dfe9ff', 1.2); rim.position.set(0.6, 0.5, -0.8); scene.add(rim);

  // 特写的替身：一块卵石顶着一颗水珠
  const macro = new THREE.Group(); macro.position.set(0.5, 0, -0.3);
  const pebble = new THREE.Mesh(new THREE.IcosahedronGeometry(0.02, 3), new THREE.MeshStandardMaterial({ color: '#8a8478', roughness: 0.6 }));
  pebble.scale.set(1.4, 0.6, 1); pebble.position.y = 0.012; pebble.castShadow = true;
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.004, 32, 16), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.02, transmission: 1, thickness: 0.004, ior: 1.33 }));
  drop.position.set(0, 0.0245, 0);
  macro.add(pebble, drop); scene.add(macro);

  return {
    post: { exposure: 1.0, aperture: 0, vignette: 0.25, grain: 0.025 },
    macro: {
      root: macro,
      camera: s => ({ type: 'free', position: [0.5 + 0.05 * Math.sin(0.3 + 0.2 * s.lt), 0.045, -0.3 + 0.09], target: [0.5, 0.02, -0.3], fov: 24, fovAxis: 'short' }),
      post: { aperture: 0.6, maxBlur: 0.01 },
    },
    update() {},
    dispose() {},
  };
}
```

- [ ] **Step 9: Smoke-test in headless Metal**

This needs network access for three and the fonts, which come from jsDelivr.

Run:

```bash
node factory/snap.mjs 03-perfume --t 1,4,6.4,9,12.5,14 --ar 9x16
node factory/snap.mjs 03-perfume --t 1,4.6,6.4,9,14 --ar 16x9 --lang en
node factory/snap.mjs 03-perfume --t 1,4.6,6.4,9,14 --ar 1x1 --sku rose
node factory/snap.mjs 03-perfume --cut 6 --promo 1111 --t 0.2,1.55,2.6,5.5 --sku osmanthus
node factory/snap.mjs 03-perfume --promo launch --lang en --t 14 --sku seasalt
```

Expected for each command:
- The header line shows `gpu: ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, …)` and `fonts:` lists 4 faces.
- One line per frame, about 60–110 ms after the first, with no `OVERFLOW`, and exit code 0.
- PNGs are in `03-perfume/out/snap/`.

Open the PNGs (Read tool or Finder) and check:
- **macro** (t=1): a pebble with a water drop fills the frame; the hook line is in its zone.
- **drop / hero**: the bottle sits at the layout anchor. 9x16 is left of centre, clear of the right icon column. 16x9 puts the bottle on the right and the title on the left.
- **t=4.6** is mid-dissolve: two bottle poses overlap.
- **6 s cut t=1.55** is washed toward white by the flash transition. Frame 0 (t=0.2) is fully lit.
- **anatomy** (t=9): cap, collar and pump lifted. Three leader lines run from a dot on each part to 前调 / 中调 / 后调 (TOP / HEART / BASE).
- **end**: 闻境 plus WENJING, then the promo card. none shows a tagline and a 点击购买 pill. 1111 shows a red ribbon, 到手价 ¥499 and a struck-through 日常价 ¥699. launch shows New Arrival, the gift line and Shop now.
- The bottle casts a soft shadow on the studio floor, and the studio sweep fills the frame in every ratio.

The whitetea and seasalt text shadows are pale and look soft on this dark studio. That is expected: those palettes are designed for their bright worlds (Tasks 13 and 18).

Then check that a missing font fails loudly (Review Focus 2):

```bash
cp -R 03-perfume /tmp/03-nofont && rm -rf /tmp/03-nofont/out && sed -i '' '/cormorant-garamond@5\/600/d' /tmp/03-nofont/index.html && mv /tmp/03-nofont ./03-nofont
node factory/snap.mjs 03-nofont --t 1; echo "exit $?"; rm -rf 03-nofont
```

Expected: `Error: 03-nofont: __app.ready rejected: … fonts not loaded: 600 Cormorant Garamond`, then `exit 1`. The browser would otherwise quietly substitute the 500 face, so `loadFonts` checks the weight of every face it gets back.

- [ ] **Step 10: Check the live preview**

Run: `npm run serve`, then open `http://127.0.0.1:8765/03-perfume/?sku=rose&t=9&paused` in Chrome.

Expected:
- The 9:16 frame is centred with the player below it: axis selects, play button, a timeline split into macro … end, time readout, HQ toggle.
- Changing `ar` to 16x9 resizes the stage and keeps the time.
- Keys `1`–`6` jump to each shot; `Space` plays and loops.
- The address bar follows the selects (`?sku=rose&…&ar=16x9&vo=on`).
- Changing `sku` rebuilds the scene; changing `lang` or `promo` switches instantly.
- The console shows no errors.

- [ ] **Step 11: Run all tests and commit**

Run: `npm test`
Expected: PASS, 54 tests.

```bash
git add factory/lib factory/snap.mjs factory/engine/post.js factory/engine/app.js factory/engine/player.js factory/engine/player.css factory/test/serve.test.mjs 03-perfume/index.html 03-perfume/film.js 03-perfume/js
git commit -m "Add factory browser engine (post chain, frame loop, player, snap) and 03 skeleton film

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 9: Review tools — `?safe` overlay, `?sheet` contact sheet, `sheet.mjs`

The build loop from here on is: change a shot → run `sheet.mjs` → look at the PNG. This task builds that loop.
- `?safe` draws three things over the frame: the platform UI zones (red), the 4% margin (blue dashed) and the current shot's text zones (yellow). The `S` key in the player toggles it.
- `?sheet` renders the key frames of one variant for every ratio × language and tiles them into one image.
- `sheet.mjs` saves that image as a PNG, so a review is one command.

**Files:**
- Create: `factory/engine/sheet.js`, `factory/sheet.mjs`
- Modify: `factory/engine/app.js` (boot, mode, overlay arguments, `app.canvas`), `factory/engine/player.js` (`S` key), `factory/engine/player.css` (sheet mode)
- Test: `factory/test/sheet.test.mjs`; visual check through `sheet.mjs` (Step 6)

**Interfaces:**
- Consumes:
  - `allAxes`, `UNSAFE`, `MARGIN` (Task 2); `buildCut` (Task 3, tests only).
  - From Task 8: `app.setVariant`, `app.draw(t) → { t, shot, overflow }`, `app.ctx.{ W, H, ar, built, variant }`, `app.overlays`, `app.redraw`.
  - From Task 8: `openFilm`, `serve`, `parseArgs`.
- Produces:
  - `engine/sheet.js`:
    - `safeOverlay(g, ctx, { t, shot, row })`, an overlay function.
    - `sheetPlan(film, params) → { params, plan: { rows: [{ ar, lang? }], times: number[], scale } }`. It throws on bad times or a scale outside (0, 1].
    - `keyTimes(built) → number[]`: 60% into each entry.
    - `showSheet(app, plan) → Promise<{ name, url, W, H, overflow: string[] }>`.
  - `app.js` changes:
    - Overlays are now called as `f(g, ctx, { t, shot, row })`, where `row = film.layouts[ar][shot]`.
    - `app.canvas` is the composited 2D output canvas.
    - `mode` can now also be `'sheet'`: exact output size, no loop, no player, overflow drawn as red boxes.
    - `window.__sheet` is the `showSheet` promise in sheet mode.
  - URL flags:
    - `?safe`.
    - `?sheet[=t1,t2…]`. In sheet mode `ar` and `lang` may be comma lists; a missing axis means every value.
    - `?scale=` sets the cell scale; default 0.25.
  - CLI: `node factory/sheet.mjs <film> [--ar a,b] [--lang a,b] [--t …] [--scale k] [--safe] [--<axis> v] [--out dir]` writes `<film>/out/sheet/<name>.png`. The name is `sheet_<fixed axis values>_<ars>[_<langs>]`. Exit code 1 on overflow.

- [ ] **Step 1: Write the failing test**

`factory/test/sheet.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { sheetPlan, keyTimes } from '../engine/sheet.js';
import { parseVariant } from '../engine/variant.js';
import { buildCut } from '../engine/timeline.js';

const film = { axes: { sku: ['a', 'b'], lang: ['zh', 'en'], cut: [15, 6], promo: ['none', 'x'] } };
const plan = q => sheetPlan(film, new URLSearchParams(q));

test('sheetPlan: every ratio × language by default, first row drives the initial variant', () => {
  const { params, plan: p } = plan('sheet&sku=b');
  assert.deepEqual(p.rows.map(r => `${r.ar} ${r.lang}`), ['9x16 zh', '9x16 en', '1x1 zh', '1x1 en', '16x9 zh', '16x9 en']);
  assert.deepEqual(p.times, []);
  assert.equal(p.scale, 0.25);
  assert.deepEqual(parseVariant(film, params), { sku: 'b', lang: 'zh', cut: 15, promo: 'none', ar: '9x16', vo: 'on' });
});

test('sheetPlan: comma lists narrow the rows; times and scale parse', () => {
  const { params, plan: p } = plan('sheet=1,4.6,9&ar=16x9,1x1&lang=en&scale=0.5');
  assert.deepEqual(p.rows, [{ ar: '16x9', lang: 'en' }, { ar: '1x1', lang: 'en' }]);
  assert.deepEqual(p.times, [1, 4.6, 9]);
  assert.equal(p.scale, 0.5);
  assert.equal(params.get('ar'), '16x9');
  assert.equal(params.get('lang'), 'en');
});

test('sheetPlan: a film without a lang axis gets one row per ratio', () => {
  const { plan: p } = sheetPlan({ axes: { sku: ['a'] } }, new URLSearchParams('sheet'));
  assert.deepEqual(p.rows, [{ ar: '9x16' }, { ar: '1x1' }, { ar: '16x9' }]);
});

test('sheetPlan: bad times or scale fail loudly', () => {
  assert.throws(() => plan('sheet=1,x'), /bad times/);
  assert.throws(() => plan('sheet&scale=2'), /scale/);
});

test('keyTimes: 60% into every entry of the edit list', () => {
  const b = buildCut({ shots: [{ shot: 'a', dur: 2 }, { shot: 'b', dur: 3, transition: { type: 'dissolve', dur: 0.5 } }] });
  assert.deepEqual(keyTimes(b), b.entries.map(e => Math.round((e.start + 0.6 * (e.end - e.start)) * 100) / 100));
  assert.equal(keyTimes(b)[0], 1.2);
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node --test factory/test/sheet.test.mjs`
Expected: FAIL with `Cannot find module '.../factory/engine/sheet.js'`.

- [ ] **Step 3: Write `sheet.js`**

`sheet.js` has no top-level DOM access, so Node can import it for the tests. `showSheet` touches the DOM only when it runs. Set `letterSpacing` explicitly in the overlay. `canvasMeasure` (Task 5) sets it on the shared 2D context outside `save`/`restore`, so without the reset the zone labels come out letter-spaced.

`factory/engine/sheet.js`:

```js
// sheet.js — 审片工具。?safe：在画面上标出平台界面会盖住的区域、边距和这一镜头的字幕区；
// ?sheet：把一个变体的关键帧按「比例 × 语言」拼成一张联系表（页面里显示，sheet.mjs 存成 PNG）
import { allAxes, UNSAFE, MARGIN } from './variant.js';

/** 叠加层（挂在 app.overlays 上）：红 = 平台图标 / 标题带，蓝虚线 = 4% 边距，黄 = 这一镜头的字幕区 */
export function safeOverlay(g, ctx, { row }) {
  const { W, H } = ctx, lw = Math.max(1, Math.round(Math.min(W, H) / 540));
  g.save();
  g.lineWidth = lw;
  for (const [x, y, w, h] of UNSAFE[ctx.ar] ?? []) {
    g.fillStyle = 'rgba(255, 40, 40, 0.22)'; g.fillRect(x * W, y * H, w * W, h * H);
    g.strokeStyle = 'rgba(255, 70, 70, 0.9)'; g.strokeRect(x * W, y * H, w * W, h * H);
  }
  g.setLineDash([6 * lw, 4 * lw]); g.strokeStyle = 'rgba(90, 200, 255, 0.9)';
  g.strokeRect(MARGIN * W, MARGIN * H, (1 - 2 * MARGIN) * W, (1 - 2 * MARGIN) * H);
  g.strokeStyle = 'rgba(255, 210, 60, 0.9)'; g.fillStyle = 'rgba(255, 210, 60, 0.9)';
  g.font = `${Math.round(Math.min(W, H) * 0.02)}px system-ui, sans-serif`; g.textBaseline = 'top'; g.textAlign = 'left'; g.letterSpacing = '0px';   // 字幕量宽时改过字距
  for (const [name, [x, y, w, h]] of Object.entries(row?.zones ?? {})) {
    g.strokeRect(x * W, y * H, w * W, h * H);
    g.fillText(name, x * W + 3 * lw, y * H + 3 * lw);
  }
  g.restore();
}

/**
 * ?sheet[=t1,t2…]&ar=…&lang=… → 要拼的行与时刻。ar、lang 可写逗号列表，不写就取全部（片子没有 lang 轴时只按比例分行）；
 * 不写时刻就取每条剪辑的 60% 处（字幕都已入场）。返回 { params: 首行变体的参数, plan: { rows, times, scale } }
 */
export function sheetPlan(film, params) {
  const axes = allAxes(film), p = new URLSearchParams(params);
  const list = k => (p.get(k) ? p.get(k).split(',') : axes[k].map(String));
  const ars = list('ar'), langs = axes.lang ? list('lang') : [null];
  p.set('ar', ars[0]);
  if (axes.lang) p.set('lang', langs[0]);
  const times = (params.get('sheet') ?? '').split(',').filter(Boolean).map(Number);
  if (times.some(t => !Number.isFinite(t))) throw new Error(`sheet: bad times "${params.get('sheet')}"`);
  const scale = +(params.get('scale') || 0.25);
  if (!(scale > 0 && scale <= 1)) throw new Error(`sheet: scale must be in (0, 1], got ${params.get('scale')}`);
  const rows = ars.flatMap(ar => langs.map(lang => (lang ? { ar, lang } : { ar })));
  return { params: p, plan: { rows, times, scale } };
}

export const keyTimes = built => built.entries.map(e => Math.round((e.start + 0.6 * (e.end - e.start)) * 100) / 100);

const LABEL = 88, CAP = 22, GAP = 10, PAD = 14, HEAD = 40;

/** 逐行换变体、画关键帧、缩小拼接；页面里显示成图片。返回 { name, url, W, H, overflow: ['9x16 zh t=6 hero.title'] } */
export async function showSheet(app, { rows, times, scale }) {
  const { film } = app, lines = [], overflow = [];
  for (const row of rows) {
    await app.setVariant(row);
    const { ctx } = app, w = Math.round(ctx.W * scale), h = Math.round(ctx.H * scale);
    const label = Object.values(row).join(' '), cells = [];
    for (const t of times.length ? times : keyTimes(ctx.built)) {
      const d = app.draw(t), c = new OffscreenCanvas(w, h), cg = c.getContext('2d');
      cg.imageSmoothingQuality = 'high'; cg.drawImage(app.canvas, 0, 0, w, h);
      cells.push({ c, t: d.t, shot: d.shot, overflow: d.overflow });
      overflow.push(...d.overflow.map(id => `${label} t=${d.t} ${id}`));
    }
    lines.push({ label, cells, w, h });
  }
  const v = app.ctx.variant, fixed = Object.keys(allAxes(film)).filter(k => !(k in rows[0]));
  const name = `sheet_${fixed.map(k => v[k]).join('_')}_${[...new Set(rows.map(r => r.ar))].join('-')}${rows[0].lang ? `_${[...new Set(rows.map(r => r.lang))].join('-')}` : ''}`;
  const W = PAD * 2 + LABEL + Math.max(...lines.map(l => l.cells.length * (l.w + GAP) - GAP));
  const H = HEAD + lines.reduce((s, l) => s + l.h + CAP + GAP, 0) + PAD;
  const cv = Object.assign(document.createElement('canvas'), { width: W, height: H }), g = cv.getContext('2d');
  g.fillStyle = '#161615'; g.fillRect(0, 0, W, H);
  g.textBaseline = 'middle';
  g.font = '600 16px system-ui, sans-serif'; g.fillStyle = '#e6e2d8';
  g.fillText(`${film.id} · ${fixed.map(k => `${k}=${v[k]}`).join(' · ')}`, PAD, HEAD / 2);
  if (overflow.length) { g.fillStyle = '#ff5a4e'; g.fillText(`OVERFLOW ×${overflow.length}`, W - PAD - 160, HEAD / 2); }
  let y = HEAD;
  for (const l of lines) {
    g.font = '600 15px system-ui, sans-serif'; g.fillStyle = '#e6e2d8';
    l.label.split(' ').forEach((s, i) => g.fillText(s, PAD, y + 14 + i * 20));
    l.cells.forEach((c, i) => {
      const x = PAD + LABEL + i * (l.w + GAP);
      g.drawImage(c.c, x, y);
      if (c.overflow.length) { g.strokeStyle = '#ff3b30'; g.lineWidth = 3; g.strokeRect(x + 1.5, y + 1.5, l.w - 3, l.h - 3); }
      g.font = '12px system-ui, sans-serif'; g.fillStyle = c.overflow.length ? '#ff5a4e' : '#9a968c';
      g.fillText(`t=${c.t} ${c.shot}${c.overflow.length ? `  OVERFLOW ${c.overflow.join(', ')}` : ''}`, x, y + l.h + CAP / 2);
    });
    y += l.h + CAP + GAP;
  }
  const url = cv.toDataURL('image/png');
  document.body.append(Object.assign(new Image(), { className: 'sheet', src: url, alt: name }));
  return { name, url, W, H, overflow };
}
```

Run: `node --test factory/test/sheet.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 4: Wire it into the engine**

Make these exact replacements in `factory/engine/app.js`:

1. Replace:

```js
import { clamp } from './ease.js';
```

   with:

```js
import { clamp } from './ease.js';
import { safeOverlay, sheetPlan, showSheet } from './sheet.js';
```

2. Replace:

```js
/** 页面入口：film.js 的默认导出 → window.__app；预览模式再挂上播放器 */
export function boot(film) {
  const params = new URLSearchParams(location.search);
  const app = createApp(film, { params });
  window.__app = app;
  if (app.mode === 'live') import('./player.js').then(m => m.createPlayer(app));
  return app;
}
```

   with:

```js
/** 页面入口：film.js 的默认导出 → window.__app；预览模式再挂上播放器，?sheet 拼联系表（window.__sheet），?safe 叠安全区 */
export function boot(film) {
  let params = new URLSearchParams(location.search), plan = null;
  if (params.has('sheet') && !params.has('render')) ({ params, plan } = sheetPlan(film, params));
  const app = createApp(film, { params });
  window.__app = app;
  if (params.has('safe')) app.overlays.push(safeOverlay);
  if (plan) window.__sheet = app.ready.then(() => showSheet(app, plan));
  else if (app.mode === 'live') import('./player.js').then(m => m.createPlayer(app));
  return app;
}
```

3. Replace:

```js
  const mode = params.has('render') ? 'render' : 'live';
  document.documentElement.dataset.mode = mode;
  const preview = mode === 'live' || params.has('sheet');
```

   with:

```js
  const mode = params.has('render') ? 'render' : params.has('sheet') ? 'sheet' : 'live';
  document.documentElement.dataset.mode = mode;
  const preview = mode !== 'render';                               // 预览和联系表里溢出画红框；导出时溢出只报错
```

4. Replace:

```js
    for (const f of app.overlays) f(g, ctx);
```

   with:

```js
    for (const f of app.overlays) f(g, ctx, { t, shot: r.shot, row: film.layouts[ctx.ar]?.[r.shot] ?? {} });
```

5. Replace:

```js
    ctx, film, mode, gpu, overlays: [],
```

   with:

```js
    ctx, film, mode, gpu, overlays: [], canvas: out,
```


Make these replacements in `factory/engine/player.js`:

1. Replace:

```js
// player.js — 预览播放器：各轴的变体选择、播放 / 暂停、按镜头分段的时间轴、高画质开关、快捷键；变体写回地址栏，刷新后保持
import { allAxes } from './variant.js';
```

   with:

```js
// player.js — 预览播放器：各轴的变体选择、播放 / 暂停、按镜头分段的时间轴、高画质与安全区开关、快捷键；变体写回地址栏，刷新后保持
import { allAxes } from './variant.js';
import { safeOverlay } from './sheet.js';
```

2. Replace:

```js
1–9 跳到第 n 个镜头 · Q 高画质</p>
```

   with:

```js
1–9 跳到第 n 个镜头 · S 安全区 · Q 高画质</p>
```

3. Replace:

```js
    else if (e.key === 'q' || e.key === 'Q') { hq.checked = !hq.checked; app.setHQ(hq.checked); }
```

   with:

```js
    else if (e.key === 'q' || e.key === 'Q') { hq.checked = !hq.checked; app.setHQ(hq.checked); }
    else if (e.key === 's' || e.key === 'S') toggleSafe();
```

4. Replace:

```js
  play.onclick = () => { app.toggle(); onTime(app.t); };
```

   with:

```js
  function toggleSafe() {                                       // 安全区叠加层开关，同步到地址栏的 ?safe
    const i = app.overlays.indexOf(safeOverlay), q = new URLSearchParams(location.search);
    if (i < 0) { app.overlays.push(safeOverlay); q.set('safe', ''); } else { app.overlays.splice(i, 1); q.delete('safe'); }
    history.replaceState(null, '', `?${q}`); app.redraw();
  }

  play.onclick = () => { app.toggle(); onTime(app.t); };
```


Make these replacements in `factory/engine/player.css`:

1. Replace:

```css
/* player.css — 预览页：画面居中按比例缩放，下方是播放器；导出模式（?render）只留画面 */
```

   with:

```css
/* player.css — 预览页：画面居中按比例缩放，下方是播放器；导出模式（?render）只留画面；联系表模式（?sheet）只留拼图 */
```

2. Replace:

```css
html[data-mode="render"] #stage { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; margin: 0; box-shadow: none; }
```

   with:

```css
html[data-mode="render"] #stage { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; margin: 0; box-shadow: none; }

/* ?sheet：舞台移出视野继续渲染，只显示拼好的联系表 */
html[data-mode="sheet"] #stage { position: absolute; left: -100000px; top: 0; margin: 0; }
img.sheet { display: block; max-width: 98vw; height: auto; margin: 12px auto; }
```

- [ ] **Step 5: Write `sheet.mjs`**

`factory/sheet.mjs`:

```js
// sheet.mjs — 联系表：一个变体的关键帧按「比例 × 语言」拼成一张 PNG，供审片：
//   node factory/sheet.mjs 03-perfume --sku rose [--ar 9x16,1x1] [--lang zh] [--t 1,4.6,9] [--scale 0.25] [--safe] [--out 目录]
// --ar / --lang 不写就取全部；--t 不写就取每个镜头的 60% 处。输出 <film>/out/sheet/<名>.png；有字幕溢出时列出并以状态码 1 退出
import fs from 'node:fs'; import path from 'node:path';
import { serve, ROOT } from './lib/serve.mjs';
import { launch, openFilm } from './lib/browser.mjs';
import { parseArgs } from './lib/args.mjs';

const { pos: [film], o } = parseArgs(process.argv.slice(2));
if (!film || !fs.existsSync(path.join(ROOT, film, 'film.js'))) { console.error('usage: node factory/sheet.mjs <film-dir> [--ar 9x16,1x1] [--lang zh,en] [--t 1,4.6] [--scale 0.25] [--safe] [--<axis> value] [--out dir]'); process.exit(2); }
const outDir = path.resolve(o.out ?? path.join(ROOT, film, 'out', 'sheet'));
const q = new URLSearchParams({ sheet: o.t && o.t !== true ? String(o.t) : '' });
for (const [k, v] of Object.entries(o)) if (!['t', 'out'].includes(k)) q.set(k, v === true ? '' : v);

const srv = await serve(ROOT), browser = await launch();
let bad = 0;
try {
  const t0 = Date.now(), { page, info } = await openFilm(browser, { base: srv.url, film, query: q.toString() });
  const r = await page.evaluate(() => window.__sheet.then(s => ({ name: s.name, url: s.url, W: s.W, H: s.H, overflow: s.overflow })));
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${r.name}.png`);
  fs.writeFileSync(file, Buffer.from(r.url.slice(r.url.indexOf(',') + 1), 'base64'));
  console.log(`${r.name}  ${r.W}×${r.H}  ${((Date.now() - t0) / 1000).toFixed(1)} s  gpu: ${info.gpu}\n  → ${path.relative(ROOT, file)}`);
  for (const x of r.overflow) console.log(`  OVERFLOW: ${x}`);
  bad = r.overflow.length;
} finally {
  await browser.close(); await srv.close();
}
process.exit(bad ? 1 : 0);
```

- [ ] **Step 6: Visual check**

Run:

```bash
node factory/sheet.mjs 03-perfume --ar 9x16
node factory/sheet.mjs 03-perfume --sku rose --ar 16x9,1x1 --lang en --safe
node factory/sheet.mjs 03-perfume --cut 6 --promo 1111 --t 0.2,1.55,2.6,5.5
node factory/sheet.mjs 03-perfume --ar 9x16 --lang en --safe --t 9.3 --scale 0.4
```

Expected output:
- Each run prints `<name>  <W>×<H>  <seconds> s  gpu: ANGLE (Apple, ANGLE Metal Renderer: …)` and `→ 03-perfume/out/sheet/<name>.png`, with no `OVERFLOW` and exit code 0.
- The first sheet is about 1786×1078 with two rows (9x16 zh, 9x16 en). Its cells are at t=1.35 macro, 3.6 drop, 6.3 hero, 9.3 anatomy, 11.4 spray and 13.8 end.
- The whole run takes 2–5 s.

Open each PNG and check:
- The header reads `03-perfume · sku=… · cut=… · promo=… · vo=on`.
- Row labels (`9x16` / `zh`) are on the left, with `t=… shot` under each cell.
- In the `--safe` sheets:
  - 9x16 has red bands across the top 7% and the bottom 18%, and a red column on the right from 34% to 86% of the height.
  - The blue dashed margin sits 4% in from each edge.
  - Each shot's text zones are yellow boxes with their names (`title`, `sub`, `n0`…, `logo`, `line1`…) in plain, unspaced letters. All text sits inside its zone and no text or bottle sits in red.
  - 1x1 and 16x9 have no red.
- In the 6 s 1111 sheet, the 1.55 column is washed toward white in every row.

Then check a bad time list:

```bash
node factory/sheet.mjs 03-perfume --t 1,x; echo "exit $?"
```

Expected: within a few seconds (`openFilm` stops waiting as soon as the page throws), `Error: 03-perfume: page never created window.__app` followed by `page: sheet: bad times "1,x"`, then `exit 1`.

- [ ] **Step 7: Check the live tools**

With `npm run serve` running, open `http://127.0.0.1:8765/03-perfume/?t=6.3&paused` in Chrome.

Expected:
- Pressing `S` draws the overlay: red bands and column, blue margin, yellow `title` / `sub` boxes. The address bar gains `&safe=`. Pressing `S` again removes both.
- Opening `http://127.0.0.1:8765/03-perfume/?sheet&ar=1x1` shows the 1x1 zh/en sheet as one image, with no player.

- [ ] **Step 8: Run all tests and commit**

Run: `npm test`
Expected: PASS, 59 tests.

```bash
git add factory/engine/sheet.js factory/sheet.mjs factory/test/sheet.test.mjs factory/engine/app.js factory/engine/player.js factory/engine/player.css
git commit -m "Add review tools: ?safe overlay, ?sheet contact sheet and sheet.mjs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 10: Batch export — `exporter.js`, `lib/ffmpeg.mjs`, `lib/jobs.mjs`, `render.mjs`, `check.mjs`, `gallery.html`

This task turns the page into a renderer. The flow for one video:
- `render.mjs` opens `/03-perfume/?render&paused&<variant>` in its own page and calls `exporter.start(fps)`.
- Each `exporter.frame()` draws `t = i / fps` and returns the composited PNG as a data URL. Node decodes it and writes it to ffmpeg's stdin. No temp frame files are written.
- ffmpeg writes `<name>.mp4.part`. After it exits, the script saves the cover JPEG and checks the file with ffprobe (size, fps, frame count, duration, audio stream). Only then does it rename to `.mp4` and write the `<name>.json` sidecar.

A video counts as done only when both `.mp4` and `.json` exist, so a killed or failed run never leaves something that looks finished. A re-run skips finished videos and redoes the rest. `index.json` collects every sidecar, so the gallery can show a batch built over several runs.

Audio arrives in Task 15. Until then the encode has no audio track (`-an`), and sidecars say `audio: false, lufs: null`.

`check.mjs` is the pre-flight for a batch:
- It prints the GPU and fonts. `openFilm` already refuses software GL and missing font weights.
- It proves determinism: for each cut, the key frames plus the middle of every transition are drawn forward, then backward, and the PNGs are compared byte for byte.
- It checks every manifest variant for caption overflow. Caption layout depends on the shot, not on `t`, so one frame per shot is enough.
- It measures ms/frame.

Measured on this M1 Pro with the proxy bottle:
- About 100 ms/frame for draw + PNG at 9x16.
- One worker gives about 7.7 fps end to end (encode included). Two workers give 11–14 fps combined, because `-preset slow` keeps several cores busy.
- The default 24-video batch is 8640 frames, about 12–15 min.

**Files:**
- Create: `factory/lib/ffmpeg.mjs`, `factory/lib/jobs.mjs`, `factory/engine/exporter.js`, `factory/render.mjs`, `factory/check.mjs`, `factory/gallery.html`
- Modify: `factory/engine/app.js` (attach `app.exporter`)
- Test: `factory/test/ffmpeg.test.mjs`, `factory/test/jobs.test.mjs`; end-to-end runs in Steps 6–9

**Interfaces:**
- Consumes:
  - Task 2: `ASPECTS`, `allAxes`, `expandJobs(film, manifest)`, `variantQuery(film, v)`.
  - Task 7: `META.{ id, axes, sceneAxes, cuts, fileName }` from `03-perfume/meta.js` (`cuts[cut] = { shots: [{ shot, dur, … }], hits, cover }`), and `03-perfume/manifest.json`.
  - Task 8, Node side: `serve`, `ROOT`, `launch`, `openFilm(browser, { base, film, query, ar }) → { page, info: { gpu, W, H, duration, fonts } }`, `parseArgs(argv) → { pos, o }`.
  - Task 8, page side: `app.draw(t) → { t, shot, overflow }`, `app.png()`, `app.jpeg(q)`, `app.pause()`, `app.setVariant(patch)`, `app.ctx.{ W, H, built, variant }`, `app.film.cuts`.
  - Task 9: `keyTimes(built)`, which the page imports from `/factory/engine/sheet.js`.
- Produces:
  - `lib/ffmpeg.mjs`:
    - `X264` and `AAC` (the argument lists) and `hasFfmpeg()`.
    - `encodeArgs({ fps, out, audio = null, afilter = null }) → string[]`. `out` may end in `.part`, because the container is forced to mp4.
    - `startEncode(args) → { write(buf): Promise, end(): Promise<{ code, stderr }>, kill() }`. `write` applies backpressure. After ffmpeg dies it throws `ffmpeg stopped: …`.
    - `probe(file) → { duration, bytes, width, height, fps, frames, audio }`.
    - `checkProbe(p, { duration, width, height, fps, audio }) → string[]`, where an empty list means it passes.
    - Task 15 changes `audio` to an AAC file that its `encodeAudio` has already encoded, which the MP4 copies unchanged. It removes `afilter` and adds loudness measurement.
  - `lib/jobs.mjs`:
    - `pickJobs(film, o, manifestFile) → variants[]`, the same selection rules for every CLI.
    - `outPaths(dir, name) → { mp4, part, json, cover }`.
    - `isDone(p)`, `resetJob(p)`, `finishJob(p, meta)`.
    - `writeIndex(dir, extra) → { ...extra, videos }`.
    - `pool(items, n, fn) → results[]`, with `{ error }` for failures.
  - `engine/exporter.js`: `createExporter(app)`, attached as `app.exporter`:
    - `start(fps = 30) → { fps, frames, W, H, duration }`.
    - `frame() → { i, t, shot, overflow, url } | null`.
    - `cover(q = 0.92) → { t, overflow, url }`.
    - Task 15 adds `audio()`.
  - Sidecar `<name>.json`, also used as the entries of `index.json` `videos`: `{ name, file, cover, variant, duration, width, height, fps, frames, bytes, audio, lufs, renderMs }`. `index.json` is `{ film, group, axes, failed: [{ name, error }], videos }`, where `group` is `META.sceneAxes[0]`.
  - CLIs:
    - `node factory/render.mjs <film> [--all] [--<axis> v1,v2|'*'] [--fps 30] [--workers 2] [--force] [--dry] [--out dir]`.
    - `node factory/check.mjs <film> [--all] [--<axis> v1,v2]`.
    - Both exit with code 1 on any failure and 2 on bad arguments.
  - Page: `factory/gallery.html?film=<film>[&<axis>=<value>…]`.

- [ ] **Step 1: Write the failing tests**

`factory/test/ffmpeg.test.mjs`. The real-encode tests build their PNG frames with a 12-line encoder, so no image dependency is needed. They are skipped, not failed, when ffmpeg is missing:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import zlib from 'node:zlib';
import { encodeArgs, startEncode, probe, checkProbe, hasFfmpeg, X264, AAC } from '../lib/ffmpeg.mjs';

/** 最小的 RGB PNG 编码器：测试里造帧，不引入依赖 */
function png(w, h, rgb) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4), crc = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type), data]);
    len.writeUInt32BE(data.length); crc.writeUInt32BE(zlib.crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set(rgb, y * (w * 3 + 1) + 1 + x * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

test('encodeArgs: PNG frames on stdin, the fixed x264 settings, mp4 container even for a .part name', () => {
  const a = encodeArgs({ fps: 30, out: 'x.mp4.part' });
  const s = a.join(' ');
  assert.match(s, /-f image2pipe -framerate 30 -c:v png -i - /);
  assert.ok(s.includes(X264.join(' ')));
  assert.ok(a.includes('-an'));
  assert.deepEqual(a.slice(-3), ['-f', 'mp4', 'x.mp4.part']);
  const b = encodeArgs({ fps: 60, out: 'y.mp4', audio: 'mix.wav', afilter: 'alimiter' }).join(' ');
  assert.match(b, /-i mix\.wav/);
  assert.match(b, /-map 1:a:0 -af alimiter/);
  assert.ok(b.includes(AAC.join(' ')));
  assert.ok(!b.includes('-an'));
});

test('checkProbe: passes a matching file, names every mismatch', () => {
  const want = { duration: 15, width: 1080, height: 1920, fps: 30, audio: true };
  assert.deepEqual(checkProbe({ duration: 15.02, width: 1080, height: 1920, fps: 30, frames: 450, audio: true }, want), []);
  const bad = checkProbe({ duration: 14.5, width: 1920, height: 1080, fps: 25, frames: 449, audio: false }, want);
  assert.equal(bad.length, 5);
  assert.match(bad.join('|'), /size.*frames.*duration.*no audio/s);
});

test('startEncode + probe: 15 piped frames become a 0.5 s mp4 that passes checkProbe', { skip: !hasFfmpeg() && 'ffmpeg not found' }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-')), out = path.join(dir, 'a.mp4.part');
  const enc = startEncode(encodeArgs({ fps: 30, out }));
  for (let i = 0; i < 15; i++) await enc.write(png(64, 32, [i * 16, 80, 200]));
  const { code, stderr } = await enc.end();
  assert.equal(code, 0, stderr);
  const p = probe(out);
  assert.deepEqual(checkProbe(p, { duration: 0.5, width: 64, height: 32, fps: 30, audio: false }), []);
  assert.ok(p.bytes > 0);
  fs.rmSync(dir, { recursive: true });
});

test('startEncode: a broken frame fails with ffmpeg\'s message, not a hang', { skip: !hasFfmpeg() && 'ffmpeg not found' }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-'));
  const enc = startEncode(encodeArgs({ fps: 30, out: path.join(dir, 'b.mp4') }));
  await enc.write(Buffer.from('not a png at all'));
  const { code, stderr } = await enc.end();
  assert.notEqual(code, 0);
  assert.ok(stderr.length > 0);
  fs.rmSync(dir, { recursive: true });
});
```

`factory/test/jobs.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { pickJobs, outPaths, isDone, resetJob, finishJob, writeIndex, pool } from '../lib/jobs.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'jobs-'));

test('pickJobs: axis flags make a grid, --all fills in the rest, no flags read the manifest', () => {
  const film = { axes: { sku: ['a', 'b'], cut: [15, 6] }, fileName: v => `${v.sku}_${v.cut}_${v.ar}_${v.vo}` };
  const mf = path.join(tmp(), 'manifest.json'), names = o => pickJobs(film, o, mf).map(film.fileName);
  fs.writeFileSync(mf, JSON.stringify({ jobs: [{ sku: ['b'], cut: [6] }] }));
  assert.deepEqual(names({ fps: '60', force: true }), ['b_6_9x16_on']);                // 不是轴的选项不影响选片
  assert.deepEqual(names({ sku: 'a,b', ar: '1x1' }), ['a_15_1x1_on', 'b_15_1x1_on']);
  assert.equal(names({ all: true }).length, 2 * 2 * 3);                                // 旁白只出 on
  assert.deepEqual(names({ all: true, sku: 'a', cut: '6' }), ['a_6_9x16_on', 'a_6_1x1_on', 'a_6_16x9_on']);
  assert.throws(() => names({ sku: 'x' }), /unknown sku: x/);
});

test('outPaths: mp4, part, sidecar and cover next to each other', () => {
  assert.deepEqual(outPaths('/o', 'a_15s'), { mp4: '/o/a_15s.mp4', part: '/o/a_15s.mp4.part', json: '/o/a_15s.json', cover: '/o/a_15s_cover.jpg' });
});

test('isDone: a half-written or unverified video never counts as done', () => {
  const d = tmp(), p = outPaths(d, 'v');
  assert.equal(isDone(p), false);
  fs.writeFileSync(p.part, 'half');                            // 编码到一半被打断
  assert.equal(isDone(p), false);
  fs.writeFileSync(p.mp4, 'x');                                // 改了名但说明文件还没写
  assert.equal(isDone(p), false);
  fs.writeFileSync(p.json, '{}');
  assert.equal(isDone(p), true);
  resetJob(p);
  for (const f of Object.values(p)) assert.equal(fs.existsSync(f), false);
});

test('finishJob renames the part and writes the sidecar; writeIndex collects finished videos only', () => {
  const d = tmp();
  for (const n of ['b', 'a']) {
    const p = outPaths(d, n);
    fs.writeFileSync(p.part, 'video');
    finishJob(p, { file: `${n}.mp4`, name: n });
    assert.ok(isDone(p)); assert.equal(fs.existsSync(p.part), false);
  }
  fs.writeFileSync(path.join(d, 'c.json'), JSON.stringify({ file: 'c.mp4', name: 'c' }));   // 说明文件在、视频不在
  fs.writeFileSync(path.join(d, 'c.mp4.part'), 'half');
  const idx = writeIndex(d, { film: 't' });
  assert.equal(idx.film, 't');
  assert.deepEqual(idx.videos.map(v => v.name), ['a', 'b']);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(d, 'index.json'), 'utf8')), idx);
  assert.deepEqual(writeIndex(d).videos.map(v => v.name), ['a', 'b']);   // 重跑时不把 index.json 自己算进去
});

test('pool: bounded concurrency, results in order, a failure does not stop the others', async () => {
  let live = 0, peak = 0;
  const r = await pool([30, 10, 20, 5, 15], 2, async (ms, i) => {
    live++; peak = Math.max(peak, live);
    await new Promise(ok => setTimeout(ok, ms));
    live--;
    if (i === 1) throw new Error('boom');
    return ms * 2;
  });
  assert.equal(peak, 2);
  assert.deepEqual([r[0], r[2], r[3], r[4]], [60, 40, 10, 30]);
  assert.match(r[1].error.message, /boom/);
  assert.deepEqual(await pool([], 3, async () => 1), []);
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `node --test factory/test/ffmpeg.test.mjs factory/test/jobs.test.mjs`
Expected: FAIL with `Cannot find module '.../factory/lib/ffmpeg.mjs'` and `Cannot find module '.../factory/lib/jobs.mjs'`.

- [ ] **Step 3: Write `lib/ffmpeg.mjs`**

Frames arrive on stdin as PNG (`-f image2pipe -c:v png`). The output container is forced with `-f mp4`, because ffmpeg can't infer it from a `.part` name. `-count_packets` makes ffprobe report the real frame count (`nb_read_packets`); the header's `nb_frames` is only a claim. The duration check allows one frame plus 50 ms, because AAC priming adds a few ms at the start once audio exists.

`factory/lib/ffmpeg.mjs`:

```js
// ffmpeg.mjs — 编码与校验：PNG 帧经 stdin 管道进 ffmpeg（不落临时帧文件）→ H.264 MP4；ffprobe 核对时长、尺寸、帧率、帧数、音轨
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';

export const X264 = ['-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart'];
export const AAC = ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000'];

export const hasFfmpeg = () => spawnSync('ffmpeg', ['-version']).status === 0 && spawnSync('ffprobe', ['-version']).status === 0;

/** ffmpeg 参数：stdin 上的 PNG 帧 (+ 可选的 WAV 音轨) → out（容器写死 mp4，所以 out 可以是 .mp4.part） */
export function encodeArgs({ fps, out, audio = null, afilter = null }) {
  const a = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-'];
  if (audio) a.push('-i', audio);
  a.push('-map', '0:v:0', ...X264, '-r', String(fps));
  if (audio) a.push('-map', '1:a:0', ...(afilter ? ['-af', afilter] : []), ...AAC); else a.push('-an');
  a.push('-f', 'mp4', out);
  return a;
}

/** 起一个编码进程：write(buf) 带背压，end() → { code, stderr } */
export function startEncode(args) {
  const p = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = '', dead = null;
  p.stderr.on('data', d => { stderr += d; });
  p.stdin.on('error', e => { dead = e; });                     // ffmpeg 提前退出时写管道会 EPIPE，留到 end() 一并报告
  const exited = once(p, 'close');
  return {
    async write(buf) {
      if (dead) throw new Error(`ffmpeg stopped: ${stderr.trim() || dead.message}`);
      if (!p.stdin.write(buf)) await Promise.race([once(p.stdin, 'drain'), exited]);
    },
    async end() {
      p.stdin.end();
      const [code] = await exited;
      return { code, stderr: stderr.trim() };
    },
    kill: () => p.kill('SIGKILL'),
  };
}

/** ffprobe → { duration, width, height, fps, frames, audio, bytes } */
export function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-count_packets', '-show_entries',
    'stream=codec_type,width,height,r_frame_rate,nb_read_packets:format=duration,size', '-of', 'json', file], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffprobe ${file}: ${r.stderr.trim()}`);
  const j = JSON.parse(r.stdout), v = j.streams.find(s => s.codec_type === 'video'), [a, b] = (v?.r_frame_rate ?? '0/1').split('/').map(Number);
  return {
    duration: +j.format.duration, bytes: +j.format.size, width: v?.width, height: v?.height,
    fps: b ? a / b : 0, frames: +(v?.nb_read_packets ?? 0), audio: j.streams.some(s => s.codec_type === 'audio'),
  };
}

/** 探测结果与预期比对，返回问题列表（空 = 通过）。时长允许差一帧再加 50 ms（AAC 编码的首尾补白） */
export function checkProbe(p, { duration, width, height, fps, audio }) {
  const bad = [], frames = Math.round(duration * fps);
  if (p.width !== width || p.height !== height) bad.push(`size ${p.width}×${p.height} ≠ ${width}×${height}`);
  if (Math.abs(p.fps - fps) > 1e-3) bad.push(`fps ${p.fps} ≠ ${fps}`);
  if (p.frames !== frames) bad.push(`frames ${p.frames} ≠ ${frames}`);
  if (Math.abs(p.duration - duration) > 1 / fps + 0.05) bad.push(`duration ${p.duration.toFixed(3)} s ≠ ${duration} s`);
  if (p.audio !== audio) bad.push(audio ? 'no audio stream' : 'unexpected audio stream');
  return bad;
}
```

- [ ] **Step 4: Write `lib/jobs.mjs`**

The order inside `finishJob` matters:
1. Rename `.part` to `.mp4`.
2. Write the sidecar through a `.tmp` file plus a rename.

A crash between the two steps leaves an `.mp4` with no `.json`. `isDone` treats that as unfinished and `resetJob` clears it on the next run. `writeIndex` skips sidecars whose video has gone.

`factory/lib/jobs.mjs`:

```js
// jobs.mjs — 批量出片的记账：输出路径、完成标记、索引、并发池
// 先编码到 <名>.mp4.part，校验通过才改名成 .mp4，再写 <名>.json；两个都在才算做完，所以中断或重跑都不会把半截文件当成品
import fs from 'node:fs';
import path from 'node:path';
import { allAxes, expandJobs } from '../engine/variant.js';

/** 命令行选项 → 变体列表：写了轴（--sku a,b）就出这些轴的网格，没写的轴取第一个值，加 --all 时取全部；只写 --all 出全部（旁白只出 on）；都没写就读清单 */
export function pickJobs(film, o, manifestFile) {
  const axes = allAxes(film);
  const cli = Object.fromEntries(Object.keys(axes).filter(k => typeof o[k] === 'string').map(k => [k, o[k].split(',')]));
  const all = o.all ? { ...Object.fromEntries(Object.keys(axes).map(k => [k, ['*']])), vo: ['on'] } : null;
  const manifest = all || Object.keys(cli).length ? { jobs: [{ ...all, ...cli }] } : JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  return expandJobs(film, manifest);
}

export const outPaths = (dir, name) => ({
  mp4: path.join(dir, `${name}.mp4`), part: path.join(dir, `${name}.mp4.part`),
  json: path.join(dir, `${name}.json`), cover: path.join(dir, `${name}_cover.jpg`),
});

export const isDone = p => fs.existsSync(p.mp4) && fs.existsSync(p.json);

/** 清掉上一次没做完留下的文件 */
export function resetJob(p) {
  for (const f of [p.part, p.mp4, p.json, p.cover]) fs.rmSync(f, { force: true });
}

/** .part → .mp4，然后写说明文件（先写临时文件再改名，写到一半断电也不会留下坏的 .json） */
export function finishJob(p, meta) {
  fs.renameSync(p.part, p.mp4);
  fs.writeFileSync(`${p.json}.tmp`, `${JSON.stringify(meta, null, 2)}\n`);
  fs.renameSync(`${p.json}.tmp`, p.json);
}

/** 汇总目录里所有成片的说明文件 → index.json；只收 .mp4 也在的 */
export function writeIndex(dir, extra = {}) {
  const videos = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'index.json').sort()
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
    .filter(m => m.file && fs.existsSync(path.join(dir, m.file)));
  const index = { ...extra, videos };
  fs.writeFileSync(path.join(dir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  return index;
}

/** 至多 n 个并发地跑 fn(item, i)；结果按原顺序，失败记为 { error } 而不中断其余任务 */
export async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try { out[i] = await fn(items[i], i); } catch (error) { out[i] = { error }; }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, items.length)) }, worker));
  return out;
}
```

Run: `node --test factory/test/ffmpeg.test.mjs factory/test/jobs.test.mjs`
Expected: PASS (9 tests: 4 ffmpeg, 5 jobs).

- [ ] **Step 5: Write the exporter and attach it**

The exporter steps a fixed clock (`t = i / fps`), so wall-clock speed never changes a frame. It pauses the live loop first. `frames = round(duration × fps)`: 450 for 15 s and 180 for 6 s at 30 fps.

`factory/engine/exporter.js`:

```js
// exporter.js — 导出：按固定帧间隔逐帧出图（t = i / fps），不依赖实时帧率；封面取剪辑表里的 cover 时刻
// 帧数 = 时长 × fps；每帧返回合成后的 PNG（3D + 字幕），由 render.mjs 经管道送进 ffmpeg
export function createExporter(app) {
  let fps = 30, i = 0, n = 0;
  return {
    /** 从头开始；返回 { fps, frames, W, H, duration } */
    start(f = 30) {
      app.pause();
      fps = f; i = 0; n = Math.round(app.ctx.built.duration * fps);
      return { fps, frames: n, W: app.ctx.W, H: app.ctx.H, duration: app.ctx.built.duration };
    },
    /** 下一帧 → { i, t, shot, overflow, url }；画完了返回 null */
    frame() {
      if (i >= n) return null;
      const t = i / fps, d = app.draw(t);
      return { i: i++, t, shot: d.shot, overflow: d.overflow, url: app.png() };
    },
    /** 封面 JPEG → { t, overflow, url } */
    cover(q = 0.92) {
      const t = app.film.cuts[app.ctx.variant.cut].cover, d = app.draw(t);
      return { t, overflow: d.overflow, url: app.jpeg(q) };
    },
  };
}
```

Make these exact replacements in `factory/engine/app.js`:

1. Replace:

```js
import { safeOverlay, sheetPlan, showSheet } from './sheet.js';
```

   with:

```js
import { safeOverlay, sheetPlan, showSheet } from './sheet.js';
import { createExporter } from './exporter.js';
```

2. Replace:

```js
  app.ready = (async () => {
```

   with:

```js
  app.exporter = createExporter(app);
  app.ready = (async () => {
```

- [ ] **Step 6: Write `render.mjs` and render two videos**

Each job gets its own page, so a crashed page takes down only that job. `pool` runs `--workers` jobs at once. Overflow in any frame or in the cover fails the job; export never ships a clipped caption.

`factory/render.mjs`:

```js
// render.mjs — 批量出片：清单（或 --all、或命令行给的网格）→ 每个变体开一页无头 Chromium，逐帧 PNG 经管道进 ffmpeg → MP4 + 封面 + 说明文件 → out/index.json
//   node factory/render.mjs 03-perfume [--all] [--<axis> v1,v2 | '*'] [--fps 30] [--workers 2] [--force] [--dry] [--out 目录]
// 命令行写了轴就只出这些轴的网格（没写的轴取第一个值；和 --all 合用时没写的轴取全部）；
// 已做完（.mp4 与 .json 都在）的跳过，除非 --force；有一条失败就以状态码 1 结束
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { serve, ROOT } from './lib/serve.mjs';
import { launch, openFilm } from './lib/browser.mjs';
import { parseArgs } from './lib/args.mjs';
import { encodeArgs, startEncode, probe, checkProbe, hasFfmpeg } from './lib/ffmpeg.mjs';
import { pickJobs, outPaths, isDone, resetJob, finishJob, writeIndex, pool } from './lib/jobs.mjs';
import { ASPECTS, allAxes, variantQuery } from './engine/variant.js';

const { pos: [film], o } = parseArgs(process.argv.slice(2));
if (!film || !fs.existsSync(path.join(ROOT, film, 'meta.js'))) { console.error("usage: node factory/render.mjs <film-dir> [--all] [--<axis> v1,v2|'*'] [--fps 30] [--workers 2] [--force] [--dry] [--out dir]"); process.exit(2); }
const { META } = await import(pathToFileURL(path.join(ROOT, film, 'meta.js')));
const axes = allAxes(META), fps = +(o.fps ?? 30), workers = +(o.workers ?? 2), outDir = path.resolve(o.out ?? path.join(ROOT, film, 'out'));
const rel = f => (path.relative(ROOT, f).startsWith('..') ? f : path.relative(ROOT, f));
let jobs;
try { jobs = pickJobs(META, o, path.join(ROOT, film, 'manifest.json')); } catch (e) { console.error(e.message); process.exit(2); }
const frames = v => Math.round(META.cuts[v.cut].shots.reduce((s, e) => s + e.dur, 0) * fps);
const total = jobs.reduce((s, v) => s + frames(v), 0);
console.log(`${film}: ${jobs.length} videos, ${total} frames at ${fps} fps, ${workers} workers → ${rel(outDir)}`);
if (o.dry) { for (const v of jobs) console.log(`  ${META.fileName(v)}  (${frames(v)} frames)`); process.exit(0); }
if (!hasFfmpeg()) { console.error('ffmpeg / ffprobe not found on PATH (brew install ffmpeg)'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });

const b64 = url => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
const srv = await serve(ROOT), browser = await launch();

async function renderJob(v, k) {
  const name = META.fileName(v), p = outPaths(outDir, name), tag = `[${k + 1}/${jobs.length}] ${name}`;
  if (!o.force && isDone(p)) { console.log(`${tag}  skip (done)`); return { name, skipped: true }; }
  resetJob(p);
  const t0 = Date.now(), [W, H] = ASPECTS[v.ar];
  let page = null, enc = null;
  try {
    ({ page } = await openFilm(browser, { base: srv.url, film, query: `render&paused&${variantQuery(META, v)}`, ar: v.ar }));
    const job = await page.evaluate(f => window.__app.exporter.start(f), fps);
    if (job.W !== W || job.H !== H) throw new Error(`canvas ${job.W}×${job.H}, expected ${W}×${H}`);
    enc = startEncode(encodeArgs({ fps, out: p.part }));
    for (let i = 0; i < job.frames; i++) {
      const f = await page.evaluate(() => window.__app.exporter.frame());
      if (f.overflow.length) throw new Error(`text overflow at t=${f.t.toFixed(3)}: ${f.overflow.join(', ')}`);
      await enc.write(b64(f.url));
    }
    const r = await enc.end(); enc = null;
    if (r.code !== 0) throw new Error(`ffmpeg exited ${r.code}: ${r.stderr.split('\n').slice(-3).join(' | ')}`);
    const c = await page.evaluate(() => window.__app.exporter.cover());
    if (c.overflow.length) throw new Error(`text overflow on the cover: ${c.overflow.join(', ')}`);
    fs.writeFileSync(p.cover, b64(c.url));
    const pr = probe(p.part), bad = checkProbe(pr, { duration: job.duration, width: W, height: H, fps, audio: false });
    if (bad.length) throw new Error(`ffprobe: ${bad.join('; ')}`);
    const ms = Date.now() - t0;
    finishJob(p, {
      name, file: path.basename(p.mp4), cover: path.basename(p.cover), variant: v,
      duration: job.duration, width: W, height: H, fps, frames: pr.frames, bytes: pr.bytes, audio: false, lufs: null, renderMs: ms,
    });
    console.log(`${tag}  ${pr.frames} frames  ${(ms / 1000).toFixed(1)} s (${(pr.frames / (ms / 1000)).toFixed(1)} fps)  ${(pr.bytes / 1e6).toFixed(1)} MB`);
    return { name };
  } catch (e) {
    enc?.kill(); resetJob(p);
    console.log(`${tag}  FAILED\n    ${e.message.split('\n').join('\n    ')}`);
    throw e;
  } finally {
    await page?.context().close();
  }
}

const t0 = Date.now();
let results;
try {
  results = await pool(jobs, workers, renderJob);
} finally {
  await browser.close(); await srv.close();
}
const failed = results.flatMap((r, i) => (r.error ? [{ name: META.fileName(jobs[i]), error: r.error.message.split('\n')[0] }] : []));
const skipped = results.filter(r => r.skipped);
writeIndex(outDir, { film: META.id, group: META.sceneAxes[0], axes, failed });
console.log(`done ${results.length - failed.length - skipped.length}, skipped ${skipped.length}, failed ${failed.length}  ·  ${((Date.now() - t0) / 60000).toFixed(1)} min  ·  ${rel(path.join(outDir, 'index.json'))}`);
process.exit(failed.length ? 1 : 0);
```

Run:

```bash
node factory/render.mjs 03-perfume --dry | head -3
node factory/render.mjs 03-perfume --sku whitetea --ar 9x16 --cut 15,6
```

Expected:
- The dry run prints `03-perfume: 24 videos, 8640 frames at 30 fps, 2 workers → 03-perfume/out`, then `  wenjing_whitetea_15s_9x16_zh  (450 frames)` and `  wenjing_whitetea_15s_1x1_zh  (450 frames)`.
- The render prints one line per video, with the 6 s one usually first, e.g. `[2/2] wenjing_whitetea_6s_9x16_zh  180 frames  30.5 s (5.9 fps)  4.9 MB` and `[1/2] wenjing_whitetea_15s_9x16_zh  450 frames  55.3 s (8.1 fps)  12.1 MB`.
- It ends with `done 2, skipped 0, failed 0  ·  0.9 min  ·  03-perfume/out/index.json` and exit code 0. Sizes will change once the real bottle and worlds land.

Then check the files:

```bash
ls 03-perfume/out
ffprobe -v error -show_entries stream=codec_name,profile,pix_fmt,width,height,r_frame_rate,nb_frames -of compact 03-perfume/out/wenjing_whitetea_15s_9x16_zh.mp4
ffmpeg -loglevel error -y -ss 6.4 -i 03-perfume/out/wenjing_whitetea_15s_9x16_zh.mp4 -frames:v 1 /tmp/f64.png
```

Expected:
- `out/` holds `.mp4`, `_cover.jpg` and `.json` for both names, plus `index.json`. There is no `.part`.
- ffprobe prints `stream|codec_name=h264|profile=High|width=1080|height=1920|pix_fmt=yuv420p|r_frame_rate=30/1|nb_frames=450`.
- `/tmp/f64.png` matches `wenjing_whitetea_15s_9x16_zh_cover.jpg`: the hero shot, with the 白茶 title and the 闻境 · WENJING line under the bottle.

- [ ] **Step 7: Check the re-run and failure paths**

Run:

```bash
node factory/render.mjs 03-perfume --sku whitetea --ar 9x16 --cut 15,6; echo "exit $?"
node factory/render.mjs 03-perfume --sku nope; echo "exit $?"
```

Expected:
- The first command prints `[1/2] wenjing_whitetea_15s_9x16_zh  skip (done)`, the same for the 6 s video, `done 0, skipped 2, failed 0 …` and `exit 0`.
- The second prints `unknown sku: nope (expected whitetea | osmanthus | seasalt | rose)` and `exit 2`.

Now prove that a job failing mid-encode leaves nothing that looks finished. Make a throwaway copy that throws at frame 10 of every 6 s job:

```bash
sed 's/await enc.write(b64(f.url));/await enc.write(b64(f.url)); if (i === 10 \&\& v.cut === 6) throw new Error("injected");/' factory/render.mjs > factory/render-fail.mjs
node factory/render-fail.mjs 03-perfume --sku seasalt --ar 1x1 --cut 6,15; echo "exit $?"
ls 03-perfume/out | grep seasalt; node -e "const i=require('./03-perfume/out/index.json'); console.log(i.failed, i.videos.length)"
rm factory/render-fail.mjs
```

Expected:
- `[1/2] wenjing_seasalt_6s_1x1_zh  FAILED` with `    injected` under it, while the 15 s job still finishes.
- Then `done 1, skipped 0, failed 1 …` and `exit 1`.
- `ls` shows only the `wenjing_seasalt_15s_1x1_zh` files, with no `6s` `.part`, `.mp4` or `.json`.
- The index prints `[ { name: 'wenjing_seasalt_6s_1x1_zh', error: 'injected' } ] 3`.

- [ ] **Step 8: Write `check.mjs` and run it**

`factory/check.mjs`:

```js
// check.mjs — 批量出片前的自检：GPU、字体、确定性、清单里每个变体的字幕溢出、速度
//   node factory/check.mjs 03-perfume [--all] [--<axis> v1,v2]
// 确定性：每个剪辑的关键帧和转场中点先顺着画、再倒着画，两遍逐字节相同；溢出：每个变体每个镜头画一帧（同一镜头的字幕排版与时刻无关）
// 任何一项不过就以状态码 1 结束
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { serve, ROOT } from './lib/serve.mjs';
import { launch, openFilm } from './lib/browser.mjs';
import { parseArgs } from './lib/args.mjs';
import { pickJobs } from './lib/jobs.mjs';
import { variantQuery } from './engine/variant.js';

const { pos: [film], o } = parseArgs(process.argv.slice(2));
if (!film || !fs.existsSync(path.join(ROOT, film, 'meta.js'))) { console.error('usage: node factory/check.mjs <film-dir> [--all] [--<axis> v1,v2]'); process.exit(2); }
const { META } = await import(pathToFileURL(path.join(ROOT, film, 'meta.js')));
const fps = 30;
let jobs;
try { jobs = pickJobs(META, o, path.join(ROOT, film, 'manifest.json')); } catch (e) { console.error(e.message); process.exit(2); }
const sceneKey = v => META.sceneAxes.map(k => v[k]).join('|');
jobs.sort((a, b) => sceneKey(a).localeCompare(sceneKey(b)));       // 同一场景的变体排在一起，少重建几次场景

let failed = 0;
const report = (name, pass, detail) => { console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name.padEnd(12)} ${detail}`); if (!pass) failed++; };
const srv = await serve(ROOT), browser = await launch();
try {
  const t0 = Date.now(), { page, info } = await openFilm(browser, { base: srv.url, film, query: `render&paused&${variantQuery(META, jobs[0])}`, ar: jobs[0].ar });
  report('gpu', true, info.gpu);                                     // openFilm 已拒绝软件渲染和缺字重
  report('fonts', true, `${info.fonts.join(', ')}  (${Date.now() - t0} ms to first frame)`);

  const det = await page.evaluate(async cuts => {
    const app = window.__app, { keyTimes } = await import('/factory/engine/sheet.js'), bad = [];
    let n = 0;
    for (const cut of cuts) {
      await app.setVariant({ cut });
      const b = app.ctx.built, ts = [...keyTimes(b), ...b.entries.filter(e => e.transition.type !== 'cut').map(e => e.start + e.transition.dur / 2)];
      const shot = t => (app.draw(t), app.png()), fwd = ts.map(shot), back = [...ts].reverse().map(shot).reverse();
      ts.forEach((t, i) => { n++; if (fwd[i] !== back[i]) bad.push(`cut ${cut} t=${t.toFixed(2)}`); });
    }
    return { n, bad };
  }, Object.keys(META.cuts));
  report('determinism', !det.bad.length, det.bad.length ? `frames differ between passes: ${det.bad.join(', ')}` : `${det.n} frames identical forward and backward`);

  const t1 = Date.now(), over = [];
  for (const v of jobs) {
    const r = await page.evaluate(async v => {
      const app = window.__app, { keyTimes } = await import('/factory/engine/sheet.js');
      await app.setVariant(v);
      return keyTimes(app.ctx.built).flatMap(t => app.draw(t).overflow);
    }, v);
    if (r.length) over.push(`${META.fileName(v)}: ${r.join(', ')}`);
  }
  report('overflow', !over.length, over.length ? `\n      ${over.join('\n      ')}` : `${jobs.length} variants, no caption overflows  (${((Date.now() - t1) / 1000).toFixed(1)} s)`);

  await page.evaluate(v => window.__app.setVariant(v), jobs[0]);
  const n = 60, job = await page.evaluate(f => window.__app.exporter.start(f), fps), t2 = Date.now();
  for (let i = 0; i < Math.min(n, job.frames); i++) await page.evaluate(() => window.__app.exporter.frame());
  const ms = (Date.now() - t2) / Math.min(n, job.frames);
  const total = jobs.reduce((s, v) => s + Math.round(META.cuts[v.cut].shots.reduce((a, e) => a + e.dur, 0) * fps), 0);
  report('speed', true, `${ms.toFixed(0)} ms/frame at ${job.W}×${job.H} (draw + PNG, before encoding) → manifest ${total} frames ≈ ${(total * ms / 60000).toFixed(1)} min on one worker`);
} finally {
  await browser.close(); await srv.close();
}
console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exit(failed ? 1 : 0);
```

Run: `node factory/check.mjs 03-perfume; echo "exit $?"`

Expected (about 15 s):

```
ok    gpu          ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)
ok    fonts        600 Noto Serif SC, 500 Noto Serif SC, 600 Cormorant Garamond, 700 Noto Sans SC  (2136 ms to first frame)
ok    determinism  14 frames identical forward and backward
ok    overflow     24 variants, no caption overflows  (4.3 s)
ok    speed        101 ms/frame at 1080×1920 (draw + PNG, before encoding) → manifest 8640 frames ≈ 14.5 min on one worker
all checks passed
exit 0
```

The 14 determinism frames are 6 key times plus 3 transition midpoints for the 15 s cut, and 3 plus 2 for the 6 s cut.

Prove the determinism check can fail. Make a throwaway copy whose hero shot leaks state between frames:

```bash
sed "s|const app = window.__app, { keyTimes } = await import('/factory/engine/sheet.js'), bad = \[\];|&  const h = app.film.shots.hero; app.film.shots.hero = (c, s) => { c.scene.rotation.y += 0.01; return h(c, s); };|" factory/check.mjs > factory/check-bad.mjs
node factory/check-bad.mjs 03-perfume | grep determinism; rm factory/check-bad.mjs
```

Expected: `FAIL  determinism  frames differ between passes: cut 6 t=0.90, cut 6 t=2.40, …`, and exit code 1. It lists 12 of the 14 frames. The other two (cut 15 t=10.63 and t=12.20) are drawn back to back at the turn between the two passes, so they see the same leaked rotation.

- [ ] **Step 9: Write the gallery and look at it**

The gallery is one static file with no dependencies, served from SHOW like the film:
- Tiles are grouped by `index.group` and keep their real aspect ratio at a fixed height of 240 px.
- The filter buttons list only values that occur in the batch, and they write to the URL, so a filtered view can be shared.
- The first hover loads the video, muted and looping. Leaving the tile stops and rewinds it.
- A click opens a `<dialog>` with sound and controls. `Esc` or clicking the backdrop closes it.
- Without `index.json`, the page says how to render one.

`factory/gallery.html`:

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>成片画廊</title>
  <link rel="icon" href="data:," />
  <!-- gallery.html — 批量出片的成片画廊：?film=03-perfume 读 <film>/out/index.json；按场景轴分组，每格按真实比例显示封面；
       按轴筛选（写进网址，可分享）；鼠标悬停静音预览，点击带声音播放；每格标出文件大小、时长、响度 -->
  <style>
    :root { color-scheme: dark; --ui: #d9d6cf; --dim: #8a877f; --line: #34332f; --gold: #c9a45c; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 18px 22px 40px; background: #111110; color: var(--ui); font: 13px/1.4 system-ui, -apple-system, "PingFang SC", sans-serif; }
    header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 18px; margin-bottom: 12px; }
    h1 { margin: 0; font-size: 18px; font-weight: 600; }
    .sum { color: var(--dim); }
    .failed { color: #ff8a80; }
    .filters { display: flex; flex-wrap: wrap; gap: 8px 20px; margin-bottom: 18px; }
    .axis { display: inline-flex; align-items: center; gap: 4px; }
    .axis b { margin-right: 4px; color: var(--dim); font-weight: 500; }
    .axis button { background: #1d1c1a; color: var(--ui); border: 1px solid var(--line); border-radius: 4px; padding: 2px 9px; font: inherit; cursor: pointer; }
    .axis button[aria-pressed="true"] { border-color: var(--gold); color: var(--gold); }
    section { margin-bottom: 26px; }
    h2 { margin: 0 0 10px; font-size: 15px; font-weight: 600; }
    h2 small { margin-left: 8px; color: var(--dim); font-weight: 400; }
    .grid { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 14px; }
    .tile { display: flex; flex-direction: column; gap: 5px; padding: 0; background: none; border: 0; color: inherit; font: inherit; text-align: left; cursor: pointer; }
    .frame { position: relative; height: 240px; overflow: hidden; background: #000; border-radius: 3px; box-shadow: 0 6px 20px #0007; }
    .frame img, .frame video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
    .frame video { opacity: 0; transition: opacity 0.15s; }
    .tile:hover .frame video.on, .tile:focus-visible .frame video.on { opacity: 1; }
    .tile:focus-visible .frame { outline: 2px solid var(--gold); outline-offset: 2px; }
    .cap { max-width: 100%; font-size: 12px; }
    .cap .v { color: var(--ui); }
    .cap .m { color: var(--dim); font-variant-numeric: tabular-nums; }
    .empty { margin-top: 40px; color: var(--dim); white-space: pre-wrap; }
    dialog { padding: 0; background: #000; border: 0; border-radius: 4px; color: var(--ui); }
    dialog::backdrop { background: #000c; }
    dialog video { display: block; max-width: 92vw; max-height: 84vh; }
    dialog p { margin: 0; padding: 8px 12px; background: #161614; font-size: 12px; }
  </style>
</head>
<body>
  <header><h1 id="title">成片画廊</h1><span class="sum" id="sum"></span><span class="failed" id="failed"></span></header>
  <div class="filters" id="filters"></div>
  <main id="groups"></main>
  <dialog id="player"><video controls playsinline></video><p></p></dialog>
  <script type="module">
    const q = new URLSearchParams(location.search), film = q.get('film') ?? '03-perfume', base = `../${film}/out/`;
    const $ = id => document.getElementById(id);
    const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
    const mb = b => `${(b / 1e6).toFixed(1)} MB`;
    const loud = m => (!m.audio ? '无音轨' : m.lufs == null ? '— LUFS' : `${m.lufs.toFixed(1)} LUFS`);

    let index;
    try {
      const r = await fetch(`${base}index.json`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`${r.status}`);
      index = await r.json();
    } catch (e) {
      $('groups').append(el('p', { className: 'empty', textContent: `还没有 ${film}/out/index.json（${e.message}）。\n先出片：node factory/render.mjs ${film}` }));
      throw e;
    }
    const { videos, axes } = index, group = index.group ?? Object.keys(axes)[0];
    $('title').textContent = `${index.film ?? film} · 成片画廊`;
    document.title = $('title').textContent;

    // 筛选：每个轴只列出成片里出现过的值；选中状态写进网址
    const shown = Object.keys(axes).filter(k => k !== group).sort((a, b) => (b === 'ar') - (a === 'ar')).map(k => [k, axes[k].filter(x => videos.some(v => String(v.variant[k]) === String(x))).map(String)]).filter(([, vals]) => vals.length);
    const pick = Object.fromEntries(shown.map(([k, vals]) => [k, vals.includes(q.get(k)) ? q.get(k) : null]));
    for (const [k, vals] of shown) {
      const box = el('span', { className: 'axis' }, el('b', { textContent: k }));
      for (const x of [null, ...vals]) {
        const b = el('button', { textContent: x ?? '全部' });
        b.onclick = () => { pick[k] = x; render(); };
        b.dataset.axis = k; b.dataset.value = x ?? '';
        box.append(b);
      }
      $('filters').append(box);
    }

    const player = $('player'), pv = player.querySelector('video');
    player.addEventListener('click', e => { if (e.target === player) player.close(); });
    player.addEventListener('close', () => { pv.pause(); pv.removeAttribute('src'); pv.load(); });
    function open(m) {
      pv.src = base + m.file; pv.muted = false;
      player.querySelector('p').textContent = `${m.name}  ·  ${m.width}×${m.height}  ·  ${m.duration} s  ·  ${mb(m.bytes)}  ·  ${loud(m)}`;
      player.showModal(); pv.play().catch(() => {});
    }

    function tile(m) {
      const frame = el('div', { className: 'frame' }, el('img', { src: base + m.cover, alt: m.name, loading: 'lazy' }));
      frame.style.aspectRatio = `${m.width} / ${m.height}`;
      const t = el('button', { className: 'tile', title: m.name }, frame,
        el('div', { className: 'cap' },
          el('div', { className: 'v', textContent: shown.map(([k]) => m.variant[k]).join(' · ') }),
          el('div', { className: 'm', textContent: `${mb(m.bytes)} · ${m.duration} s · ${loud(m)}` })));
      t.querySelector('.cap').style.width = `${Math.round(240 * m.width / m.height)}px`;
      let v = null;
      const start = () => {                                              // 第一次悬停才加载视频
        if (!v) { v = el('video', { src: base + m.file, muted: true, loop: true, playsInline: true, preload: 'auto' }); frame.append(v); v.addEventListener('playing', () => v.classList.add('on')); }
        v.play().catch(() => {});
      };
      const stop = () => { if (v) { v.pause(); v.currentTime = 0; v.classList.remove('on'); } };
      t.addEventListener('mouseenter', start); t.addEventListener('focus', start);
      t.addEventListener('mouseleave', stop); t.addEventListener('blur', stop);
      t.onclick = () => { stop(); open(m); };
      return t;
    }

    function render() {
      const u = new URL(location.href);
      for (const [k, x] of Object.entries(pick)) x == null ? u.searchParams.delete(k) : u.searchParams.set(k, x);
      history.replaceState(null, '', u);
      for (const b of $('filters').querySelectorAll('button')) b.setAttribute('aria-pressed', String((pick[b.dataset.axis] ?? '') === b.dataset.value));
      const list = videos.filter(m => Object.entries(pick).every(([k, x]) => x == null || String(m.variant[k]) === x));
      $('sum').textContent = `${list.length} / ${videos.length} 条 · ${mb(list.reduce((s, m) => s + m.bytes, 0))} · ${list.reduce((s, m) => s + m.duration, 0)} s`;
      $('failed').textContent = index.failed?.length ? `上次出片失败 ${index.failed.length} 条：${index.failed.map(f => `${f.name}（${f.error}）`).join('；')}` : '';
      const groups = $('groups'); groups.replaceChildren();
      for (const g of axes[group] ?? [...new Set(list.map(m => m.variant[group]))]) {
        const items = list.filter(m => String(m.variant[group]) === String(g));
        if (!items.length) continue;
        groups.append(el('section', {}, el('h2', { textContent: g }, el('small', { textContent: `${group} · ${items.length} 条` })), el('div', { className: 'grid' }, ...items.map(tile))));
      }
      if (!list.length) groups.append(el('p', { className: 'empty', textContent: '没有符合筛选条件的成片。' }));
    }
    render();
  </script>
</body>
</html>
```

With `npm run serve` running, open `http://127.0.0.1:8765/factory/gallery.html?film=03-perfume` in Chrome.

Expected:
- The header reads `03-perfume · 成片画廊`, then `3 / 3 条 · … MB · 36 s`, then in red `上次出片失败 1 条：wenjing_seasalt_6s_1x1_zh（injected）` (left over from Step 7).
- The filter rows are `ar`, `lang`, `cut`, `promo`, `vo`, each starting with `全部`.
- There are sections `whitetea` (two 9:16 tiles) and `seasalt` (one square tile). Each caption reads like `9x16 · zh · 15 · none · on` / `12.1 MB · 15 s · 无音轨`.
- Hovering a tile plays it muted within a second. Clicking opens it large with sound controls, and the caption line shows name, size, duration and `无音轨`.
- Clicking `ar` → `1x1` leaves only the seasalt tile and adds `&ar=1x1` to the address. Reloading keeps the filter.
- `?film=99-none` shows `还没有 99-none/out/index.json（404）。` and the render command.

Re-run `node factory/render.mjs 03-perfume --sku seasalt --ar 1x1 --cut 6` to clear the failure line, then reload. The header loses the red text and seasalt shows two tiles.

- [ ] **Step 10: Run all tests and commit**

Run: `npm test`
Expected: PASS, 68 tests.

```bash
git add factory/lib/ffmpeg.mjs factory/lib/jobs.mjs factory/engine/exporter.js factory/engine/app.js factory/render.mjs factory/check.mjs factory/gallery.html factory/test/ffmpeg.test.mjs factory/test/jobs.test.mjs
git commit -m "Add batch export: exporter, ffmpeg pipe + ffprobe checks, resumable render.mjs, check.mjs, gallery

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 11: The real bottle — `bottle.js`

This task replaces the Task 8 box proxy with the real 闻境 flacon. The interface stays the same, and it gains a few extras:
- **Glass:** a thick-based octagonal prism, with rounded vertical edges and rounded top and bottom edges, plus a glass neck.
- **Liquid:** a body plus a separate surface mesh. The surface has a meniscus that climbs the wall, and the ripple rings from the drop shot.
- **Metal:** a gold collar with a lip and a groove; a pump with an actuator, a nozzle facing −x, a stem, a chamber and a curved dip tube; and a faceted cap in the SKU's finish.
- **Logo:** 闻境 · WENJING as a roughness map on the front face.
- **Contact shadow:** a soft blob under the base. Glass and liquid cast no shadow.

Three geometry choices matter for Task 12, whose refraction reads this geometry:
- **Exact normals on the glass.** The prisms are built layer by layer from an exact outline: the octagon core, grown by the vertical round and then by the edge round. Normals are computed from the shape, so every big face has one normal all the way to where its rounds start. `toCreasedNormals` would average the round normals into the faces, and under refraction each face would act like a weak lens. The lathed parts (neck, collar) still use `toCreasedNormals`, after scaling to millimetres, because it merges vertices on a 0.01-unit grid.
- **`SHAPE` exports the bodies as half-planes.** The outer glass, the cavity and the liquid are each a convex octagonal prism: 8 half-planes `[nx, nz, d]` plus a `y` range. `glass.js` uses them to compute exact path lengths through the glass and the liquid in the shader.
- **The liquid sits 0.3 mm inside the cavity.** The test checks this for every vertex, at rest and at the tallest ripple, so the liquid never pokes through the glass.

The drop shot drives the ripple. `pose({ ripple })` takes seconds since the drop landed (`s.lt − EV.land`). `rippleHeight(r, age)` is closed-form, so any frame can be computed on its own. The surface only rebuilds when `age` changes, and `pose()` restores every value, so `film.reset` still gives the same frame whichever frame was drawn before.

`EXPLODE.collar` is 0.065, not 0.055 (Task 7 already has the new value). At 0.055 the pump actuator ends up inside the lifted collar. The top of `BOX.exploded` is the cap, so the box does not change.

**Files:**
- Replace: `03-perfume/js/bottle.js` (whole file; the Task 8 proxy goes away)
- Modify: `03-perfume/film.js`, `03-perfume/js/shots.js`
- Test: `03-perfume/test/bottle.test.mjs`

**Interfaces:**
- Consumes:
  - Task 7: `DIMS`, `EXPLODE`, `BOX.bottle` / `BOX.exploded`, `EV.land` from `meta.js`; `SKUS[id].liquid.color` and `SKUS[id].cap` (`'silver' | 'gold' | 'frost' | 'lacquer'`) from `skus.js`; `FONTS.{zh,en}.display` from `copy.js`; `PARTS` from `captions.js`.
  - Task 5: `fontStr(font, px)`.
  - Task 1: `clamp(x, a = 0, b = 1)`, `ss(a, b, x)`.
  - Task 8: `film.setup` / `film.reset` and the `drop` shot in `js/shots.js`.
- Produces (Task 12 onwards rely on these):
  - `buildBottle(ctx, sku, { logo = null } = {}) → { root, parts: { glass, liquid, collar, pump, cap }, pose({ explode = 0, capLift = 0, press = 0, ripple = 0 }), anchor(name) → [x, y, z], liquidTop() }`.
    - Anchors: `'cap' | 'collar' | 'liquid' | 'nozzle'`. The nozzle is on −x and drops 2 mm at `press: 1`.
    - `parts.glass` has the neck as a child; `parts.liquid` has the surface mesh as its only child.
    - The glass geometry has `position`, `normal` and `uv` (`u = x / w + 0.5`, `v = y / body`, back faces shifted off the map).
    - `renderOrder`: glass and neck 2, liquid and surface 1.
  - `GLASS = { chamfer, round, bevel, wall, base, shoulder, inner, fill, meniscus, neck }` in metres.
  - `SHAPE = { outer, cavity, liquid }`, each `{ planes: [[nx, nz, d] × 8], y: [y0, y1] }` in bottle-local coordinates; the inside is where `nx·x + nz·z ≤ d`.
  - `RIPPLE = { amp, k, c, decay, r0 }` and `rippleHeight(r, age, R = RIPPLE) → metres`.
  - `logoMask() → Promise<CanvasTexture>`, browser only. It throws `logo fonts not loaded: …` if a display face is missing. Near-black means gloss; white means frosted.

- [ ] **Step 1: Write the failing test**

The test builds bottles in Node (no `logo`, no DOM) and checks:
- the sizes against the framing boxes;
- that the big faces are flat;
- that the liquid stays inside the cavity;
- how the ripple rises and fades;
- that `pose` is absolute;
- the anchors.

`03-perfume/test/bottle.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildBottle, rippleHeight, RIPPLE, GLASS, SHAPE } from '../js/bottle.js';
import { SKUS } from '../skus.js';
import { DIMS, BOX } from '../meta.js';
import { PARTS } from '../captions.js';

const make = (sku = 'whitetea') => buildBottle({}, SKUS[sku]);
const near = (a, b, eps = 2e-4) => a.forEach((x, i) => assert.ok(Math.abs(x - b[i]) < eps, `[${a.map(v => v.toFixed(4))}] vs [${b.map(v => v.toFixed(4))}]`));
const bounds = objs => { const b = new THREE.Box3(); for (const o of objs) b.expandByObject(o, true); return [b.min.toArray(), b.max.toArray()]; };
const surface = b => b.parts.liquid.children[0].geometry.attributes.position.array.slice();
const placed = b => Object.values(b.parts).map(o => o.getWorldPosition(new THREE.Vector3()).toArray()).concat([b.anchor('nozzle')]);

test('the glass body is exactly the DIMS block', () => {
  const g = make().parts.glass.geometry;
  g.computeBoundingBox();
  near(g.boundingBox.min.toArray(), [-DIMS.w / 2, 0, -DIMS.d / 2]);
  near(g.boundingBox.max.toArray(), [DIMS.w / 2, DIMS.body, DIMS.d / 2]);
});

test('assembled and exploded, every SKU fills BOX.bottle / BOX.exploded (framing uses these boxes)', () => {
  for (const sku of Object.keys(SKUS)) {
    const b = make(sku), parts = Object.values(b.parts);
    const [lo, hi] = bounds(parts);
    near(lo, BOX.bottle[0]); near(hi, BOX.bottle[1]);
    b.pose({ explode: 1 });
    const [lo2, hi2] = bounds(parts);
    near(lo2, BOX.exploded[0]); near(hi2, BOX.exploded[1]);
  }
});

test('the big glass faces are optically flat: one normal across the whole face', () => {
  const g = make().parts.glass.geometry, p = g.attributes.position, n = g.attributes.normal;
  let front = 0;
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(p.getZ(i) - DIMS.d / 2) > 1e-6) continue;          // 正面平面上的顶点（圆角只在切点处碰到这个平面）
    front++;
    near([n.getX(i), n.getY(i), n.getZ(i)], [0, 0, 1], 1e-6);
  }
  assert.ok(front >= 4, `found ${front} front-face vertices`);
});

test('the liquid stays inside the cavity, resting and at the tallest ripple', () => {
  const b = make(), inside = ([x, y, z], S) => S.planes.every(([nx, nz, d]) => nx * x + nz * z <= d + 1e-7) && y >= S.y[0] - 1e-7 && y <= S.y[1] + 1e-7;
  for (const ripple of [0, 0.05, 0.2, 0.6]) {
    b.pose({ ripple });
    b.parts.liquid.traverse(o => {
      if (!o.isMesh) return;
      const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) assert.ok(inside([p.getX(i), p.getY(i), p.getZ(i)], SHAPE.cavity), `ripple ${ripple}: vertex ${i} outside the cavity`);
    });
  }
  assert.equal(b.liquidTop(), GLASS.fill);
});

test('rippleHeight: still before landing and ahead of the wavefront; the rings fade', () => {
  for (const r of [0, 0.005, 0.02]) { assert.equal(rippleHeight(r, 0), 0); assert.equal(rippleHeight(r, -0.4), 0); }
  assert.equal(rippleHeight(RIPPLE.c * 0.2 + 1e-4, 0.2), 0);
  const peak = age => Math.max(...Array.from({ length: 300 }, (_, i) => Math.abs(rippleHeight(i * 1e-4, age))));
  assert.ok(peak(0.15) > 0.0002 && peak(0.15) <= RIPPLE.amp);
  assert.ok(peak(0.3) > peak(0.8) && peak(0.8) > peak(1.5) && peak(1.5) < peak(0.3) / 3);
});

test('pose is absolute: the same pose gives the same bottle whatever came before', () => {
  const a = make(), b = make();
  a.pose({ explode: 0.7, press: 1, capLift: 0.02, ripple: 0.4 });
  a.pose({ ripple: 0.9 }); b.pose({ ripple: 0.9 });
  assert.deepEqual(surface(a), surface(b));
  assert.deepEqual(placed(a), placed(b));
  const fresh = make();
  a.pose(); assert.deepEqual(surface(a), surface(fresh)); assert.deepEqual(placed(a), placed(fresh));
});

test('anchors: caption parts rise in order when exploded; the nozzle faces -x and moves with press', () => {
  const b = make();
  for (const k of [...PARTS, 'nozzle']) assert.ok(b.anchor(k).every(Number.isFinite), k);
  b.pose({ explode: 1 });
  const y = k => b.anchor(k)[1];
  assert.ok(y('liquid') < y('collar') && y('collar') < y('cap'));
  b.pose({ capLift: 0.1 });
  const up = b.anchor('nozzle');
  b.pose({ capLift: 0.1, press: 1 });
  const down = b.anchor('nozzle');
  assert.ok(up[0] < -0.006 && Math.abs(up[1] - down[1] - 0.002) < 1e-9 && up[1] > DIMS.body + DIMS.collar);
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node --test 03-perfume/test/bottle.test.mjs`
Expected: FAIL with `SyntaxError: The requested module '../js/bottle.js' does not provide an export named 'GLASS'` (the Task 8 proxy only exports `buildBottle`).

- [ ] **Step 3: Write the real bottle**

Replace the whole of `03-perfume/js/bottle.js` with:

```js
// bottle.js — 瓶子：厚底八角玻璃瓶（竖棱圆角、上下棱倒圆、正面磨砂 logo）、液体（贴壁弯月面 + 落滴涟漪）、金色颈圈、喷头（含吸管）、多棱瓶盖
// 组装态与分解态是同一套网格；原点在瓶底中心，尺寸取 meta.js 的 DIMS / EXPLODE
// 玻璃和液体这里先用半透明材质；Task 12 的 glass.js 换成分层折射，按导出的 SHAPE 算光在玻璃和液体里走的路程
import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { DIMS, EXPLODE } from '../meta.js';
import { FONTS } from '../copy.js';
import { fontStr } from '../../factory/engine/text.js';
import { clamp, ss } from '../../factory/engine/ease.js';

// ── 形状参数（米）──
// 外形：八角切角 chamfer（沿轴量）、竖棱圆角 round、上下棱倒圆 bevel；内腔：侧壁 wall、厚底 base、肩厚 shoulder、液体转角圆角 inner；
// 静止液面高 fill，贴壁处弯月面再高 meniscus；瓶颈外半径 neck
export const GLASS = { chamfer: 0.013, round: 0.0018, bevel: 0.0016, wall: 0.0045, base: 0.018, shoulder: 0.011, inner: 0.0012, fill: 0.074, meniscus: 0.0012, neck: 0.0085 };
// 落滴涟漪：振幅、波数、波前速度（米/秒）、时间衰减（1/秒）、距离衰减尺度（米）
export const RIPPLE = { amp: 0.0008, k: (2 * Math.PI) / 0.0075, c: 0.055, decay: 1.6, r0: 0.004 };

// ── 八角形 { a 半宽, b 半深, k 切角 }（x-z 平面）──
const S2 = Math.SQRT1_2;
/** 各边向内平移 w；切角边随之变短 */
const inset = (o, w) => ({ a: o.a - w, b: o.b - w, k: o.k - w * (2 - Math.SQRT2) });
/** 8 个顶点，按外法线角度 -45°, 0°, 45° … 的顺序（逆时针） */
const corners = ({ a, b, k }) => [[a, -b + k], [a, b - k], [a - k, b], [-a + k, b], [-a, b - k], [-a, -b + k], [-a + k, -b], [a - k, -b]];
/** 8 个半平面 [nx, nz, d]：内部满足 nx·x + nz·z ≤ d */
const planes = ({ a, b, k }) => { const c = (a + b - k) * S2; return [[1, 0, a], [-1, 0, a], [0, 1, b], [0, -1, b], [S2, S2, c], [S2, -S2, c], [-S2, S2, c], [-S2, -S2, c]]; };
/** 圆角八角形轮廓：先内收 r 再外扩 r，每个角是半径 r、seg 段的圆弧 */
function outline(o, r, seg = 6) {
  const out = [];
  corners(inset(o, r)).forEach(([x, z], i) => {
    for (let j = 0; j <= seg; j++) { const t = ((i - 1 + j / seg) * Math.PI) / 4; out.push([x + r * Math.cos(t), z + r * Math.sin(t)]); }
  });
  return out;
}
/** 八角形 o 上离 (x, z) 最近的点（点在里面就是它自己） */
function nearestOn(o) {
  const P = planes(o), C = corners(o);
  return (x, z) => {
    if (P.every(([nx, nz, d]) => nx * x + nz * z <= d)) return [x, z];
    let best = null, bd = Infinity;
    C.forEach(([ax, az], i) => {
      const [bx, bz] = C[(i + 1) % 8], ex = bx - ax, ez = bz - az, k = clamp(((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez));
      const px = ax + ex * k, pz = az + ez * k, d = (x - px) ** 2 + (z - pz) ** 2;
      if (d < bd) { bd = d; best = [px, pz]; }
    });
    return best;
  };
}

const OUT = { a: DIMS.w / 2, b: DIMS.d / 2, k: GLASS.chamfer }, CAV = inset(OUT, GLASS.wall), LIQ = inset(CAV, 0.0003);
/** 外形、内腔、液体的凸棱柱（半平面 + 高度范围）：glass.js 在着色器里用它们算光程 */
export const SHAPE = {
  outer: { planes: planes(OUT), y: [0, DIMS.body] },
  cavity: { planes: planes(CAV), y: [GLASS.base, DIMS.body - GLASS.shoulder] },
  liquid: { planes: planes(LIQ), y: [GLASS.base + 0.0003, GLASS.fill] },
};

/** 落滴涟漪：离落点 r 米、落下 age 秒后的液面起伏（米）。波前以 c 外扩，振幅随时间和距离衰减；age ≤ 0 时静止 */
export function rippleHeight(r, age, R = RIPPLE) {
  if (!(age > 0)) return 0;
  const behind = R.c * age - r;
  if (behind <= 0) return 0;
  return R.amp * Math.exp(-R.decay * age) * Math.sqrt(R.r0 / (r + R.r0)) * Math.sin(R.k * behind) * Math.min(1, behind / 0.003);
}

// ── 网格 ──
/** 圆角八角柱（竖棱圆角 r、上下棱倒圆 ρ < r、高 h，底面在 y = 0）：实体 = 八角核 inset(o, r) 外扩 r - ρ、高 [ρ, h - ρ]，再包一层半径 ρ 的球。
 *  逐层按倒圆角 θ 生成精确轮廓，法线是解析的：大面上法线处处相同，圆角与大面相切
 *  （toCreasedNormals 会把圆角的法线平均进大面，折射时整面像一块弱透镜） */
function prism(o, r, h, rho, seg = 6, bs = 5) {
  const K = corners(inset(o, r)), rr = r - rho, M = 8 * (seg + 1), pos = [], nor = [], idx = [];
  const ring = (y, off, ny, nh) => K.forEach(([x, z], i) => {
    for (let j = 0; j <= seg; j++) { const t = ((i - 1 + j / seg) * Math.PI) / 4, c = Math.cos(t), s = Math.sin(t); pos.push(x + off * c, y, z + off * s); nor.push(nh * c, ny, nh * s); }
  });
  for (let l = 0; l < 2 * bs + 2; l++) {                             // 下倒圆 θ = -90°…0°，上倒圆 θ = 0°…90°；两个 0° 层之间是竖直的侧面
    const top = l > bs, th = ((top ? l - bs - 1 : l - bs) / bs) * (Math.PI / 2);
    ring((top ? h - rho : rho) + rho * Math.sin(th), rr + rho * Math.cos(th), Math.sin(th), Math.cos(th));
  }
  const at = (l, m) => l * M + (m % M);
  for (let l = 0; l < 2 * bs + 1; l++) for (let m = 0; m < M; m++) idx.push(at(l, m), at(l + 1, m), at(l, m + 1), at(l, m + 1), at(l + 1, m), at(l + 1, m + 1));
  for (const [y, ny] of [[0, -1], [h, 1]]) {                         // 底面、顶面：从中心扇形铺开
    const c = pos.length / 3;
    pos.push(0, y, 0); nor.push(0, ny, 0); ring(y, rr, ny, 0);
    for (let m = 0; m < M; m++) { const p = c + 1 + m, q = c + 1 + ((m + 1) % M); idx.push(...(ny > 0 ? [c, q, p] : [c, p, q])); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  return g;
}
/** 回转体用：toCreasedNormals 按 0.01 单位合并同位置顶点，先放大到毫米再算 */
function creased(g, angle) {
  g.deleteAttribute('normal'); g.scale(1000, 1000, 1000);
  const r = toCreasedNormals(g, angle); r.scale(0.001, 0.001, 0.001);
  return r;
}
/** 回转体：profile 为 [半径, 高]，沿逆时针走（实体在前进方向左侧，法线朝外） */
const lathe = (profile, crease = 0.7) => creased(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 72), crease);

// ── 液体：侧壁 + 底（静态）与液面网格（弯月面 + 涟漪，逐帧改顶点）──
const RAYS = 128, RINGS = 48;
/** 闭合折线按弧长重采样成 n 个点 */
function resample(P, n) {
  const len = P.map((p, i) => Math.hypot(P[(i + 1) % P.length][0] - p[0], P[(i + 1) % P.length][1] - p[1])), total = len.reduce((s, x) => s + x, 0), out = [];
  for (let j = 0, i = 0, acc = 0; j < n; j++) {
    const at = (j / n) * total;
    while (acc + len[i] < at) acc += len[i++];
    const f = (at - acc) / len[i], p = P[i], q = P[(i + 1) % P.length];
    out.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]);
  }
  return out;
}
function liquidBody(B, y0, y1, near) {
  const n = B.length, pos = [], nor = [], idx = [];
  for (const [x, z] of B) {
    const [qx, qz] = near(x, z), L = Math.hypot(x - qx, z - qz);
    pos.push(x, y0, z, x, y1, z); nor.push((x - qx) / L, 0, (z - qz) / L, (x - qx) / L, 0, (z - qz) / L);
  }
  for (let i = 0; i < n; i++) { const a = 2 * i, b = 2 * ((i + 1) % n); idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const c = pos.length / 3; pos.push(0, y0, 0); nor.push(0, -1, 0);
  for (const [x, z] of B) { pos.push(x, y0, z); nor.push(0, -1, 0); }
  for (let i = 0; i < n; i++) idx.push(c, c + 1 + i, c + 1 + ((i + 1) % n));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  return g;
}
/** 液面：中心点 + RINGS 圈（每圈是轮廓按比例缩小，越靠壁越密：弯月面只有一两毫米宽）；r 离中心的距离，dw 离壁的距离 */
function liquidSurface(B) {
  const n = B.length, pos = [0, 0, 0], r = [0], dw = [Infinity], idx = [];
  for (let j = 1; j <= RINGS; j++) {
    const s = 1 - (1 - j / RINGS) ** 2;
    for (const [x, z] of B) { pos.push(x * s, 0, z * s); r.push(Math.hypot(x, z) * s); dw.push(Math.hypot(x, z) * (1 - s)); }
  }
  const at = (j, i) => 1 + (j - 1) * n + (i % n);
  for (let i = 0; i < n; i++) idx.push(0, at(1, i + 1), at(1, i));
  for (let j = 1; j < RINGS; j++) for (let i = 0; i < n; i++) idx.push(at(j, i), at(j, i + 1), at(j + 1, i), at(j, i + 1), at(j + 1, i + 1), at(j + 1, i));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  return { g, r, dw };
}

// ── 金属件 ──
const CAPS = {
  silver: { color: '#cfd2d6', metalness: 1, roughness: 0.16 },
  gold: { color: '#e2b660', metalness: 1, roughness: 0.2 },
  frost: { color: '#e6ecee', metalness: 0, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 },
  lacquer: { color: '#16131a', metalness: 0, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.04 },
};
const ACT = { y: DIMS.collar + 0.0025, h: 0.009, r: 0.0066, travel: 0.002 };   // 喷头按钮：底面高度（相对瓶口）、高、半径、按下行程
/** 喷头：原点在瓶口（组装时 y = 瓶身高）。按钮在颈圈上方（组装时藏在瓶盖里），喷嘴朝 -x；泵室在瓶口下，吸管伸到内腔底 */
function buildPump() {
  const g = new THREE.Group(), act = new THREE.Group();
  const chrome = new THREE.MeshPhysicalMaterial({ color: '#d6d8db', metalness: 1, roughness: 0.18 });
  const plastic = new THREE.MeshPhysicalMaterial({ color: '#ecebe6', roughness: 0.3, clearcoat: 0.4 });
  const button = new THREE.Mesh(new THREE.CylinderGeometry(ACT.r - 0.0005, ACT.r, ACT.h, 48), chrome);
  button.position.y = ACT.h / 2;
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 0.001, 16), new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.6 }));
  nozzle.rotation.z = Math.PI / 2; nozzle.position.set(-(ACT.r - 0.0003), ACT.h * 0.65, 0);
  const stemL = ACT.y + 0.003, stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, stemL, 16), chrome);
  stem.position.y = -stemL / 2;                                     // 跟着按钮走，按下时滑进泵室
  act.add(button, nozzle, stem); act.position.y = ACT.y;
  const chamber = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0038, 0.015, 32), plastic);
  chamber.position.y = -0.0085;
  const drop = DIMS.body - GLASS.base - 0.0025;                     // 吸管底离内腔底 2.5 毫米
  const path = new THREE.CatmullRomCurve3([[0, -0.016, 0], [0, -drop * 0.55, 0.0006], [0.0035, -drop, 0.0022]].map(p => new THREE.Vector3(...p)));
  const tube = new THREE.Mesh(new THREE.TubeGeometry(path, 64, 0.0011, 10), plastic);
  g.add(act, chamber, tube);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return { g, act };
}

/** 接触阴影：瓶底下一块柔和的暗斑（玻璃和液体不投影，否则是一整块黑影）；用数据纹理，Node 测试里也能建 */
function contactShadow() {
  const N = 64, px = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = ((i + 0.5) / N) * 2 - 1, y = ((j + 0.5) / N) * 2 - 1;
    px[(j * N + i) * 4 + 3] = Math.round(255 * (1 - ss(0.3, 1, Math.hypot(x, y))) ** 1.6);
  }
  const tex = new THREE.DataTexture(px, N, N); tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(DIMS.w * 1.45, DIMS.d * 1.9), new THREE.MeshBasicMaterial({ color: '#000', map: tex, transparent: true, opacity: 0.55, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.0004; m.renderOrder = -1;
  return m;
}

/** 正面磨砂 logo 的粗糙度贴图（只在浏览器里用）：近黑 = 光面，白 = 磨砂。按 u = x / 瓶宽 + 0.5、v = y / 瓶身高 贴在正面 */
export async function logoMask() {
  const zh = FONTS.zh.display, en = FONTS.en.display;
  const faces = await Promise.all([document.fonts.load(fontStr(zh, 100), '闻境'), document.fonts.load(fontStr(en, 100), 'WENJING')]);
  if (faces.some(f => !f.length)) throw new Error(`logo fonts not loaded: ${zh.family} / ${en.family}`);
  const c = document.createElement('canvas'), W = 1024;
  c.width = W; c.height = Math.round((W * DIMS.body) / DIMS.w);
  const g = c.getContext('2d');
  g.fillStyle = '#0d0d0d'; g.fillRect(0, 0, W, c.height);           // 0.6 × 13/255 ≈ 0.03：光面玻璃的粗糙度
  g.fillStyle = '#fff'; g.textAlign = 'center';
  g.font = fontStr(zh, W * 0.15); g.letterSpacing = `${W * 0.05}px`; g.fillText('闻境', W / 2 + W * 0.025, c.height * 0.58);
  g.font = fontStr(en, W * 0.052); g.letterSpacing = `${W * 0.03}px`; g.fillText('WENJING', W / 2 + W * 0.015, c.height * 0.645);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8;
  return t;
}

/** sku = SKUS[...]；logo = logoMask() 的纹理（Node 测试里不传） */
export function buildBottle(ctx, sku, { logo = null } = {}) {
  const { body, collar: CH } = DIMS, root = new THREE.Group();
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: logo ? 0.6 : 0.03, roughnessMap: logo, transparent: true, opacity: 0.3, depthWrite: false });
  const glass = new THREE.Mesh(prism(OUT, GLASS.round, body, GLASS.bevel), glassMat);
  // logo 按正面平面投影；朝后的面把 u 移出贴图（夹到边上的光面像素），否则从正面会透过玻璃看到背面一个反字
  const p = glass.geometry.attributes.position, nz = glass.geometry.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[2 * i] = p.getX(i) / DIMS.w + 0.5 + (nz.getZ(i) < -0.5 ? 3 : 0); uv[2 * i + 1] = p.getY(i) / body; }
  glass.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const neck = new THREE.Mesh(lathe([[GLASS.neck * 1.04, 0], [GLASS.neck, 0.0105], [0.0035, 0.0105], [0.0035, 0.006]]), glassMat);
  neck.position.y = body; glass.add(neck);

  const rl = GLASS.inner, B = outline(LIQ, rl, 12), near = nearestOn(inset(LIQ, rl)), [y0] = SHAPE.liquid.y;
  const liqMat = new THREE.MeshPhysicalMaterial({ color: sku.liquid.color, roughness: 0.08, transparent: true, opacity: 0.85 });
  const ring = resample(B, RAYS), liquid = new THREE.Mesh(liquidBody(ring, y0, GLASS.fill + GLASS.meniscus, near), liqMat);
  const surf = liquidSurface(ring), surface = new THREE.Mesh(surf.g, liqMat);
  liquid.add(surface);
  glass.renderOrder = neck.renderOrder = 2; liquid.renderOrder = surface.renderOrder = 1;

  const gold = new THREE.MeshPhysicalMaterial({ color: '#e0b25c', metalness: 1, roughness: 0.22 });
  const R = 0.0125;                                                 // 颈圈：套在瓶颈上的金属圈，顶上一道唇边压住泵，外壁一道凹槽
  const coll = new THREE.Mesh(lathe([[0.0045, CH], [0.0045, CH - 0.0012], [0.009, CH - 0.0012], [0.009, 0], [R - 0.0004, 0], [R, 0.0005], [R, 0.0042],
    [R - 0.0006, 0.0048], [R - 0.0006, 0.0056], [R, 0.0062], [R, CH - 0.0006], [R - 0.0006, CH], [0.0045, CH]]), gold);
  const { g: pump, act } = buildPump();
  const cap = new THREE.Mesh(prism({ a: 0.018, b: 0.018, k: 0.0075 }, 0.002, DIMS.cap, 0.0014), new THREE.MeshPhysicalMaterial(CAPS[sku.cap]));
  coll.castShadow = cap.castShadow = true;
  root.add(glass, liquid, coll, pump, cap, contactShadow());

  // 液面高度只由 age 决定：静止时是弯月面，有涟漪时叠加波纹，贴壁 3 毫米内波纹收掉；同一个 age 不重算
  const sp = surf.g.attributes.position;
  let shown = NaN;
  function shapeSurface(age) {
    age = age > 0 ? age : 0;
    if (age === shown) return;
    for (let i = 0; i < sp.count; i++) sp.setY(i, GLASS.fill + GLASS.meniscus * Math.exp(-surf.dw[i] / 0.0011) + rippleHeight(surf.r[i], age) * ss(0, 0.003, surf.dw[i]));
    sp.needsUpdate = true; surf.g.computeVertexNormals(); shown = age;
  }

  const parts = { glass, liquid, collar: coll, pump, cap };
  // 引线和特效的端点（部件本地坐标）
  const ANCHOR = { cap: [cap, [0, DIMS.cap / 2, 0]], collar: [coll, [0, CH / 2, 0]], liquid: [liquid, [0, (GLASS.base + GLASS.fill) / 2, 0]], nozzle: [act, [-(ACT.r + 0.0006), ACT.h * 0.65, 0]] };
  const _v = new THREE.Vector3();
  const bottle = {
    root, parts,
    /** explode 0..1 分解程度；capLift 瓶盖额外上抬（米）；press 喷头按下 0..1；ripple 水滴落进液面后的秒数（≤ 0 = 静止）。每次都是完整姿态，没写的量回到默认 */
    pose({ explode = 0, capLift = 0, press = 0, ripple = 0 } = {}) {
      coll.position.y = body + EXPLODE.collar * explode;
      pump.position.y = body + EXPLODE.pump * explode;
      act.position.y = ACT.y - ACT.travel * press;
      cap.position.y = body + CH + EXPLODE.cap * explode + capLift;
      shapeSurface(ripple);
      root.updateMatrixWorld(true);
    },
    /** 端点的世界坐标：'cap' | 'collar' | 'liquid' | 'nozzle' */
    anchor(name) { const [o, q] = ANCHOR[name]; return o.localToWorld(_v.set(...q)).toArray(); },
    /** 静止液面的世界 y */
    liquidTop: () => liquid.localToWorld(_v.set(0, GLASS.fill, 0)).y,
  };
  bottle.pose();
  return bottle;
}
```

Notes:
- `inset(o, w)` pulls all 8 sides in by `w`. The chamfer length `k` along the axis shrinks by `w·(2 − √2)`, not `w`, because the diagonal side is at 45°.
- Every ring in `prism` has the same 8 × (seg + 1) vertices in the same order. Each corner's arc runs from the normal of the side before it to the normal of the side after it, so one index pattern stitches any two consecutive rings.
- The liquid surface rings get denser towards the wall (`s = 1 − (1 − j/RINGS)²`), because the meniscus is only about 1 mm wide. Within 3 mm of the wall the ripple fades to zero, so the edge of the surface always meets the liquid body.

- [ ] **Step 4: Run the test to make sure it passes**

Run: `node --test 03-perfume/test/bottle.test.mjs`
Expected: PASS (7 tests).

- [ ] **Step 5: Wire in the logo and the ripple**

Make these exact replacements in `03-perfume/film.js`:

1. Replace:

```js
import { buildBottle } from './js/bottle.js';
```

   with:

```js
import { buildBottle, logoMask } from './js/bottle.js';
```

2. Replace:

```js
    const bottle = buildBottle(ctx, sku);
```

   with:

```js
    const bottle = buildBottle(ctx, sku, { logo: await logoMask() });
```

Make these exact replacements in `03-perfume/js/shots.js`:

1. Replace:

```js
import { VIEW, BOX, viewDir } from '../meta.js';
```

   with:

```js
import { VIEW, BOX, EV, viewDir } from '../meta.js';
```

2. Replace:

```js
  drop(ctx, s) {
    world(ctx, s);
    return { camera: fit('drop', s), text: text(ctx, s) };
```

   with:

```js
  drop(ctx, s) {
    world(ctx, s);
    ctx.subjects.bottle.pose({ ripple: s.lt - EV.land });           // 水滴在 EV.land 落进液面
    return { camera: fit('drop', s), text: text(ctx, s) };
```

`film.reset` already calls `bottle.pose()` before each shot. That resets the surface to rest, and the drop shot then sets its own ripple age.

- [ ] **Step 6: Look at it**

With the studio world, so only the bottle changes:

```bash
node factory/snap.mjs 03-perfume --t 3.6,4.2,6.4,9.3,11.2 --world studio --ar 9x16 --out /tmp/t11
node factory/snap.mjs 03-perfume --t 6.4,9.3 --world studio --ar 1x1 --out /tmp/t11
node factory/snap.mjs 03-perfume --t 9.3 --world studio --ar 16x9 --out /tmp/t11
```

Expected (about 110 ms per 9x16 frame):
- **t = 6.4 (hero):** an octagonal flacon with soft bevelled edges and a thick clear base under the liquid. On top sit the grooved gold collar and a faceted cap. Behind the pale-green liquid you can see the neck, the pump chamber and the curved dip tube, and the shadow falls to the right. The whitetea cap is metallic silver, so in the dark studio it reflects mostly dark; the worlds light it.
- **t = 9.3 (anatomy):** cap, collar, pump (actuator, stem, chamber) and glass stand apart, with clear gaps and nothing overlapping. The 前调 / 中调 / 后调 leaders end on the cap, the collar and the liquid. Everything fits the frame at all three ratios.
- **t = 3.6 and 4.2 (drop):** the drop lands at t = 3.0 (`EV.land` into the drop shot). At 3.6 the liquid surface near the dip tube shows faint rings, and by 4.2 they have faded. At this camera height they are subtle; Task 12's refraction and Task 14's drop camera bring them out.
- **t = 11.2 (spray):** the assembled bottle. The shot does not lift the cap or press the pump yet; Task 14 adds that.
- **No logo yet.** With the stand-in translucent material, roughness only affects highlights. Task 12 reads the same map as the frost mask.

Check the logo mask on its own:

```bash
node --input-type=module -e "
import fs from 'node:fs';
import { serve, ROOT } from './factory/lib/serve.mjs';
import { launch, openFilm } from './factory/lib/browser.mjs';
const srv = await serve(ROOT), browser = await launch();
const { page } = await openFilm(browser, { base: srv.url, film: '03-perfume', query: 'render&paused', ar: '9x16' });
const url = await page.evaluate(async () => (await (await import('/03-perfume/js/bottle.js')).logoMask()).image.toDataURL());
fs.writeFileSync('/tmp/t11/logo-mask.png', Buffer.from(url.split(',')[1], 'base64'));
await browser.close(); await srv.close();
"
```

Expected: `/tmp/t11/logo-mask.png` is 1024 × 1453 and near-black. Just below the middle, the white 闻境 appears in Noto Serif SC 600, with a small WENJING under it in Cormorant Garamond 600. Both lines are centred.

- [ ] **Step 7: Re-run the pre-flight**

The drop shot now changes the surface on every frame, so check determinism again.

Run: `node factory/check.mjs 03-perfume; echo "exit $?"`
Expected: every line `ok`, including `determinism  14 frames identical forward and backward`, then `speed  ~105 ms/frame at 1080×1920 …`, `all checks passed` and `exit 0`.

- [ ] **Step 8: Run all tests and commit**

Run: `npm test`
Expected: PASS, 75 tests.

```bash
git add 03-perfume/js/bottle.js 03-perfume/test/bottle.test.mjs 03-perfume/film.js 03-perfume/js/shots.js
git commit -m "Add the real 闻境 bottle: exact-normal octagonal glass, meniscus + ripple liquid, pump, collar, cap, logo mask

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 12: Glass and liquid refraction, and the ground caustic — `glass.js`

This task swaps the stand-in translucent glass and liquid for real refraction. It also adds the light the bottle focuses onto the ground.

**Why not three's `transmission`.** three draws every transmissive object against one blurred copy of the opaque scene. Glass seen in front of liquid would then show nothing of the liquid, and the thick base, the absorption and total internal reflection would not follow the bottle's real shape. Instead `film.render` draws the scene target in three passes:
- **Pass 1, layer 0:** the world plus everything on the bottle that is not glass or liquid: collar, pump, tube, cap, caustic and contact shadow.
- **Pass 2, layer 1 (liquid):** samples what pass 1 resolved.
- **Pass 3, layer 2 (glass):** samples passes 1 and 2.

Each `renderer.render` resolves the MSAA buffer into `sceneRT.texture` / `depthTexture` (Task 8), and the next pass reads them as "what is behind". Passes 2 and 3 switch off `autoClear`, the background and shadow-map updates, and `render` restores them in a `finally`.

**The shader.** `refractive()` keeps three's `MeshPhysicalMaterial` and replaces two chunks of its fragment shader:
- `transmission_pars_fragment` becomes our functions;
- `transmission_fragment` becomes our main.

Lighting, reflections, clearcoat and the logo's roughness map still come from three. `transmission` stays 0, so three never starts its own transmission pass. If a later three renames either chunk, `onBeforeCompile` throws, rather than silently drawing opaque glass.

The rays are traced analytically through the convex prisms in `SHAPE` (bottle-local, from Task 11):
- **Side wall into the cavity:** twice the wall thickness, then whatever is behind.
- **Solid glass (thick base, shoulder, chamfers):** up to 4 segments, reflecting inside wherever the exit would be total internal reflection. If the ray is still trapped, it takes the colour directly behind the point.
- **Neck:** a thin tube, so straight through.
- **Per channel:** R, G and B each use their own IOR (dispersion, visible only on the thick base and the edges), plus Beer–Lambert absorption along the path.
- **Liquid:** colourless. Its colour comes only from `sku.liquid.absorb`, so it deepens where it is thicker.
- **Frosted logo:** blurs what is behind (13 taps) and mixes in some lit diffuse.

`behind(q, d)` estimates from the depth buffer how far the exit ray travels before it hits something, and projects that point back onto the screen.

**The caustic.** The glass and liquid cast no shadow themselves. A shadow-only proxy (the glass geometry on layer 0, writing neither colour nor depth) casts the full shadow of the bottle. The caustic then adds back the light that passes through.

It is a 256 × 256 grid perpendicular to the key light, with one grid per colour channel, each at its own IOR. The vertex shader traces each vertex's ray through:
1. the glass;
2. then air and the liquid surface, ripple included, or straight into the liquid;
3. then the liquid;
4. then the glass again.

It places the vertex where the ray lands on the plane the bottle stands on (bottle-local y = 0). Brightness is light-grid area over landing area (`dFdx` / `dFdy`), so focused light is brighter. Each rule below was found by a prototype that got it wrong first:
- **`DoubleSide`.** The source → landing map flips the winding of the ordinary triangles. With back-face culling only the folded ones survive, and the caustic almost disappears.
- **One bounce on the way out.** At n = 1.5 a ray entering one face can never leave through a perpendicular face: it is totally reflected. Without the bounce, 38% of the rays were lost. The bounce reflects the ray once inside the glass, and it leaves through the base.
- **No triangles across paths.** Each vertex records which faces its ray took (`vPath`). A triangle whose corners took different paths would smear light between them, so the fragment shader discards it wherever `fwidth(vPath)` is non-zero.
- **The ground's own shading.** The caustic reproduces three's direct light on the ground: Lambert plus GGX, with three's exact formulas, and with `dotNL` replaced by the area ratio. That way a patch of light through the glass is exactly as bright as unshadowed ground.
  - The ground material is read by a raycast down from the bottle base. Only `color`, `roughness` and `metalness` are used; maps are ignored.
  - `createGlass` updates the world matrices first. Until then, freshly built objects sit at the origin, and in the prototype the studio pebble got hit.
- **Mostly dark is correct.** The thick glass shadow is mostly dark, with light coming through where two faces are parallel. That is physical.

The key light is the first shadow-casting `DirectionalLight` in the scene. A world without one gets no caustic (the meshes are hidden). `render` calls `updateMatrixWorld` on the scene and camera before aiming the caustic, because `renderer.render` only updates matrices inside the call, too late for the uniforms.

**Two edits to `bottle.js`:**
- `bottle.posed` holds the last full pose. `glass.js` reads its `ripple`, so the liquid surface in the caustic matches the mesh.
- The dip tube becomes clear plastic: translucent and casting no shadow. When opaque, it runs behind the frosted logo and cuts the J of WENJING in two.

**Files:**
- Create: `03-perfume/js/glass.js`
- Modify: `03-perfume/js/bottle.js`, `03-perfume/film.js`
- Test: `03-perfume/test/glass.test.mjs`

**Interfaces:**
- Consumes:
  - Task 11:
    - `SHAPE` and `GLASS.fill` / `GLASS.wall`;
    - `RIPPLE`, copied into GLSL with the same formula as `rippleHeight`;
    - `bottle.root`, `bottle.parts.glass` (with the neck as a child) and `bottle.parts.liquid` (with the surface as a child);
    - the glass material's `roughnessMap` (the logo).
  - Task 7: `DIMS`; `SKUS[id].liquid.absorb`.
  - Task 8:
    - the `film.render?(ctx, target)` hook, which `app.js` calls with `post.sceneRT`: MSAA ×4 HalfFloat with a `DepthTexture`;
    - `ctx.renderer` / `ctx.scene` / `ctx.camera`.
  - The world: its first shadow-casting `DirectionalLight` and the ground under the bottle.
- Produces:
  - `createGlass(ctx, bottle, sku) → { render(target) }`.
    - Call it once, after the world is built and the bottle is in the scene.
    - `render` draws the whole scene into `target` (anything with `texture`, `depthTexture`, `width`, `height`). It restores `autoClear`, `shadowMap.autoUpdate`, the background and the camera's layers. `target` stays bound, as in the engine's default path.
  - `OPTICS = { glassIor, liquidIor, glassAbsorb, dispersion, frostBlur, frostDiffuse, causticGrid, causticGain, interfaces }` and `LAYER = { liquid: 1, glass: 2 }`.
  - `bottle.posed = { explode, capLift, press, ripple }` from the last `pose()`.
  - Layers:
    - glass and neck on 2; liquid body and surface on 1; everything else stays on 0;
    - every light is set to all layers on each render;
    - anything a later task adds that should be seen through the glass, such as the falling drop, stays on layer 0. Task 14 adds a fourth layer, `LAYER.over`, for translucent things in front of the bottle, such as the spray.
  - **World rule (Tasks 13, 17–19; Task 13 tests it in `worlds.test.mjs`):**
    - the key light is a shadow-casting `DirectionalLight`;
    - the bottle stands on flat ground at y = 0 whose material has a plain `color` / `roughness` / `metalness`, because the caustic lands there and ignores maps;
    - other dressing can be anything.

- [ ] **Step 1: Write the failing test**

Everything except the GLSL itself runs in Node. The test gives `createGlass` a real bottle, a small studio-like scene and a fake renderer that records what each pass saw. It checks:
- the shader swap, including a loud failure if three's chunks are missing;
- the layers, the proxy and the caustic meshes;
- that the ground material is read after the world's matrices are updated. The scene has a pebble in a group moved off the origin, which is exactly the prototype's bug;
- the pass order and the state restored when a pass throws;
- the caustic's aim and ripple, and no caustic without a shadow-casting light.

Step 6 checks the look.

`03-perfume/test/glass.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildBottle, SHAPE } from '../js/bottle.js';
import { createGlass, OPTICS, LAYER } from '../js/glass.js';
import { SKUS } from '../skus.js';

// 假的渲染器：只记下每一遍画的时候相机开了哪些层、背景、autoClear、阴影是否更新
function fakeRenderer({ failOn = -1 } = {}) {
  const r = { autoClear: true, shadowMap: { autoUpdate: true }, calls: [], setRenderTarget() {}, clear() {} };
  r.render = (scene, camera) => {
    if (r.calls.length === failOn) throw new Error('lost context');
    r.calls.push({ mask: camera.layers.mask, bg: scene.background, autoClear: r.autoClear, shadows: r.shadowMap.autoUpdate });
  };
  return r;
}
// 和影棚一样的小世界：地面、一盏投影主光；pebble 在一个挪开的组里（矩阵还没更新时它在原点）
function world({ ground = { color: '#2b2d31', roughness: 0.82 }, keyLight = true, pebble = true, failOn } = {}) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 9 / 16, 0.01, 100);
  scene.background = new THREE.Color('#0f1012');
  camera.position.set(0, 0.1, 0.5); camera.lookAt(0, 0.08, 0);
  if (ground) { const g = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial(ground)); g.rotation.x = -Math.PI / 2; scene.add(g); }
  if (pebble) {
    const m = new THREE.Group(); m.position.set(0.5, 0, -0.3);
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.02, 3), new THREE.MeshStandardMaterial({ color: '#8a8478' })); p.position.y = 0.012;
    m.add(p); scene.add(m);
  }
  const key = new THREE.DirectionalLight('#fff3e6', 2.4);
  key.position.set(-0.5, 0.9, 0.7); key.castShadow = keyLight;
  scene.add(key, key.target);
  const ctx = { renderer: fakeRenderer({ failOn }), scene, camera }, sku = SKUS.whitetea, bottle = buildBottle(ctx, sku);
  scene.add(bottle.root);
  return { ctx, key, bottle, glass: createGlass(ctx, bottle, sku) };
}
const target = { width: 1080, height: 1920, texture: { name: 'scene' }, depthTexture: { name: 'depth' } };
const causticMeshes = bottle => bottle.root.children.filter(o => o.material?.isShaderMaterial);
const near = (a, b, eps = 1e-6) => a.forEach((x, i) => assert.ok(Math.abs(x - b[i]) < eps, `[${a.map(v => v.toFixed(5))}] vs [${b.map(v => v.toFixed(5))}]`));

test('glass and liquid get the layered-refraction shader; a three without the transmission chunks fails loudly', () => {
  const { bottle } = world(), glass = bottle.parts.glass.material, liquid = bottle.parts.liquid.material;
  for (const m of [glass, liquid]) {
    assert.equal(m.transmission, 0); assert.equal(m.transparent, false); assert.equal(m.side, THREE.FrontSide);
    const sh = { fragmentShader: THREE.ShaderLib.physical.fragmentShader, uniforms: {} };
    m.onBeforeCompile(sh);
    assert.ok(!sh.fragmentShader.includes('#include <transmission_fragment>') && sh.fragmentShader.includes('uniform mat4 projectionMatrix;'));
    for (const [k, S] of [['uOut', SHAPE.outer], ['uCav', SHAPE.cavity], ['uLiq', SHAPE.liquid]]) near(sh.uniforms[k].value.flatMap(v => v.toArray()), S.planes.flat());
    assert.throws(() => m.onBeforeCompile({ fragmentShader: 'void main() {}', uniforms: {} }), /three shader chunk not found/);
  }
  assert.equal(glass.ior, OPTICS.glassIor); assert.ok('GLASS_PASS' in glass.defines); assert.ok(!('GLASS_PASS' in (liquid.defines ?? {})));
  assert.notEqual(glass.customProgramCacheKey(), liquid.customProgramCacheKey());
});

test('layers: world 0, liquid 1, glass 2; a shadow-only proxy and one DoubleSide caustic mesh per colour join the bottle', () => {
  const { bottle } = world();
  bottle.parts.liquid.traverse(o => { if (o.isMesh) assert.equal(o.layers.mask, 1 << LAYER.liquid); });
  bottle.parts.glass.traverse(o => { if (o.isMesh) assert.equal(o.layers.mask, 1 << LAYER.glass); });
  const proxy = bottle.root.children.find(o => o.geometry === bottle.parts.glass.geometry && o !== bottle.parts.glass);
  assert.ok(proxy.castShadow && proxy.layers.mask === 1 && !proxy.material.colorWrite && !proxy.material.depthWrite);
  const cz = causticMeshes(bottle);
  assert.equal(cz.length, 3);
  assert.deepEqual(cz.map(m => m.material.uniforms.uEg.value), [-1, 0, 1].map(c => OPTICS.glassIor + c * OPTICS.dispersion));
  for (const m of cz) assert.ok(m.material.side === THREE.DoubleSide && m.layers.mask === 1 && m.material.blending === THREE.CustomBlending);
});

test('the caustic lands on the ground under the bottle, not on whatever sat at the origin before the matrices updated', () => {
  const S = w => causticMeshes(w.bottle)[0].material.uniforms;
  const dull = S(world());
  near(dull.uAlb.value.toArray(), new THREE.Color('#2b2d31').toArray());
  near(dull.uF0.value.toArray(), [0.04, 0.04, 0.04]); assert.equal(dull.uRough.value, 0.82);
  const metal = S(world({ ground: { color: '#c8a060', roughness: 0.01, metalness: 1 } }));
  near(metal.uAlb.value.toArray(), [0, 0, 0]); near(metal.uF0.value.toArray(), new THREE.Color('#c8a060').toArray());
  assert.equal(metal.uRough.value, 0.0525);                            // 和 three 一样把粗糙度夹到 0.0525 以上
});

test('render: world, liquid, glass into one target, then the renderer is put back — even when a pass throws', () => {
  const w = world(), { renderer, scene, camera } = w.ctx, bg = scene.background;
  camera.layers.enable(5);
  const mask = camera.layers.mask;
  w.glass.render(target);
  assert.deepEqual(renderer.calls.map(c => c.mask), [1 << 0, 1 << LAYER.liquid, 1 << LAYER.glass]);
  assert.equal(renderer.calls[0].bg, bg);
  for (const c of renderer.calls.slice(1)) assert.ok(c.bg === null && !c.autoClear && !c.shadows);   // 后两遍叠在第一遍上，不清屏、不重画阴影
  assert.ok(scene.background === bg && renderer.autoClear && renderer.shadowMap.autoUpdate && camera.layers.mask === mask);
  assert.ok(w.key.layers.isEnabled(LAYER.liquid) && w.key.layers.isEnabled(LAYER.glass));
  const U = w.bottle.parts.glass.material, sh = { fragmentShader: THREE.ShaderLib.physical.fragmentShader, uniforms: {} };
  U.onBeforeCompile(sh);
  assert.ok(sh.uniforms.tScene.value === target.texture && sh.uniforms.tDepth.value === target.depthTexture);
  assert.equal(sh.uniforms.uBlur.value, OPTICS.frostBlur * target.height);

  for (const failOn of [0, 1]) {
    const f = world({ failOn });
    f.ctx.camera.layers.enable(5);
    const m = f.ctx.camera.layers.mask;
    assert.throws(() => f.glass.render(target), /lost context/);
    assert.ok(f.ctx.scene.background !== null && f.ctx.renderer.autoClear && f.ctx.renderer.shadowMap.autoUpdate && f.ctx.camera.layers.mask === m, `failing pass ${failOn}`);
  }
});

test('the caustic aims from the key light and follows the ripple; a world with no shadow-casting light has none', () => {
  const w = world();
  w.bottle.pose({ ripple: 0.4 });
  w.glass.render(target);
  const cz = causticMeshes(w.bottle), U = cz[0].material.uniforms;
  near(U.uL.value.toArray(), w.key.position.clone().normalize().toArray());
  assert.equal(U.uAge.value, 0.4);
  const k = w.key.color.toArray().map(c => c * w.key.intensity * OPTICS.causticGain * OPTICS.interfaces);
  near(cz.map((m, c) => m.material.uniforms.uK.value.getComponent(c)), k);
  assert.ok(cz.every(m => m.visible));
  w.bottle.pose(); w.glass.render(target);
  assert.equal(U.uAge.value, 0);

  const dark = world({ keyLight: false });
  dark.glass.render(target);
  assert.ok(causticMeshes(dark.bottle).every(m => !m.visible));
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node --test 03-perfume/test/glass.test.mjs`
Expected: FAIL with `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/03-perfume/js/glass.js'`.

- [ ] **Step 3: Write the glass**

`03-perfume/js/glass.js`:

```js
// glass.js — 玻璃与液体的分层折射 + 地面焦散
// 折射：场景目标里先画世界（第 0 层），再画液体（第 1 层，采样世界），最后画玻璃（第 2 层，采样世界 + 液体）。
//   每一遍 three 都把多重采样缓冲解析到 target.texture / depthTexture（见 post.js），下一遍的着色器就采样它当作“背后的画面”。
//   光在玻璃和液体里走的路程按 bottle.js 导出的 SHAPE（凸八角棱柱）解析求出：比尔–朗伯吸收、一次全反射、玻璃三色色散、磨砂 logo 模糊。
// 焦散：从主光方向打一张光线网格穿过瓶子（玻璃 → 空气 / 液面 → 液体 → 玻璃），落到瓶子站的平面上；
//   每个网格三角形的亮度 = 出发面积 / 落地面积（光被汇聚处更亮），按 RGB 三种折射率各画一遍。瓶子的影子由一个只投影的替身给出
import * as THREE from 'three';
import { SHAPE, GLASS as G, RIPPLE } from './bottle.js';
import { DIMS } from '../meta.js';

// 玻璃折射率、液体折射率、玻璃吸收（1/米，略偏绿的高白料）、三色折射率差、磨砂模糊半径（画面高度的比例）、磨砂处混入的漫反射、
// 焦散网格分辨率、焦散亮度倍数、四个界面的总透过率
export const OPTICS = { glassIor: 1.5, liquidIor: 1.36, glassAbsorb: [1.6, 0.5, 1.2], dispersion: 0.012, frostBlur: 0.012, frostDiffuse: 0.4, causticGrid: 256, causticGain: 1, interfaces: 0.85 };
export const LAYER = { liquid: 1, glass: 2 };
const CAP_R = 0.019;                                                  // 颈圈 + 喷头 + 瓶盖挡光的圆柱半径（瓶盖半宽 18 毫米）

const f = x => x.toFixed(6);
// 两种着色器共用：凸棱柱求交
const PRISM = /* glsl */`
uniform vec3 uOut[8], uCav[8], uLiq[8]; uniform vec2 uOutY, uCavY, uLiqY;
// 从凸棱柱内部 p 沿 d 走到出口：返回距离，n 为出口外法线
float exitP(vec3 p, vec3 d, vec3 P[8], vec2 Y, out vec3 n) {
  float t = 1.0; n = vec3(0.0, 1.0, 0.0);
  for (int i = 0; i < 8; i++) {
    float dn = P[i].x * d.x + P[i].y * d.z;
    if (dn > 1e-5) { float s = (P[i].z - P[i].x * p.x - P[i].y * p.z) / dn; if (s < t) { t = s; n = vec3(P[i].x, 0.0, P[i].y); } }
  }
  if (abs(d.y) > 1e-5) { float s = ((d.y > 0.0 ? Y.y : Y.x) - p.y) / d.y; if (s < t) { t = s; n = vec3(0.0, sign(d.y), 0.0); } }
  return max(t, 0.0);
}
// 从外面 p 沿 d 射向凸棱柱：返回（入口, 出口）距离，打不中时 x ≥ y；n 为入口外法线
vec2 enterP(vec3 p, vec3 d, vec3 P[8], vec2 Y, out vec3 n) {
  float t0 = -1.0, t1 = 1.0; n = vec3(0.0, 1.0, 0.0);
  for (int i = 0; i < 8; i++) {
    float dn = P[i].x * d.x + P[i].y * d.z, h = P[i].z - P[i].x * p.x - P[i].y * p.z;
    if (abs(dn) < 1e-6) { if (h < 0.0) return vec2(1.0, 0.0); continue; }
    float s = h / dn;
    if (dn < 0.0) { if (s > t0) { t0 = s; n = vec3(P[i].x, 0.0, P[i].y); } } else t1 = min(t1, s);
  }
  if (abs(d.y) < 1e-6) { if (p.y < Y.x || p.y > Y.y) return vec2(1.0, 0.0); }
  else {
    float a = (Y.x - p.y) / d.y, b = (Y.y - p.y) / d.y;
    if (min(a, b) > t0) { t0 = min(a, b); n = vec3(0.0, -sign(d.y), 0.0); }
    t1 = min(t1, max(a, b));
  }
  return vec2(t0, t1);
}
`;

const PARS = /* glsl */`
uniform mat4 projectionMatrix;                                          // 片元着色器默认没有声明
uniform sampler2D tScene, tDepth; uniform vec2 res; uniform float uNear, uFar, uBlur;
uniform mat4 uV2B, uB2V; uniform vec3 uAbsorb; uniform float uDisp;
${PRISM}
float gBlur = 0.0;                                                      // 本片元的磨砂模糊半径（像素）
vec2 toScreen(vec3 q) { vec4 c = projectionMatrix * (uB2V * vec4(q, 1.0)); return c.xy / c.w * 0.5 + 0.5; }
vec3 fetch(vec2 uv) {
  vec3 c = texture2D(tScene, uv).rgb;
  if (gBlur < 0.5) return c;
  for (int i = 0; i < 12; i++) {                                        // 磨砂：中心 + 两圈各 6 个点
    float a = float(i) * 1.0472 + (i < 6 ? 0.0 : 0.5236), r = i < 6 ? 0.5 : 1.0;
    c += texture2D(tScene, uv + vec2(cos(a), sin(a)) * r * gBlur / res).rgb;
  }
  return c / 13.0;
}
// 光线从 q 沿 d 离开瓶子后落到的画面：用深度图估计背后的东西有多远，再把那一点投回屏幕
vec3 behind(vec3 q, vec3 d) {
  vec2 uv = toScreen(q);
  float zb = perspectiveDepthToViewZ(texture2D(tDepth, uv).x, uNear, uFar), zq = (uB2V * vec4(q, 1.0)).z;
  float s = min(max(zq - zb, 0.0) / max(-(mat3(uB2V) * d).z, 0.25), 0.3);
  return fetch(toScreen(q + d * s));
}
// 在棱柱里从 p 沿 d 走到出口再折射出去（出口全反射就在里面反射再走，最多四段：45° 切角里要来回几次），返回背后的颜色；L 累计路程
vec3 through(vec3 p, vec3 d, vec3 P[8], vec2 Y, float eta, inout float L) {
  for (int k = 0; k < 4; k++) {
    vec3 n; float t = exitP(p, d, P, Y, n);
    p += d * t; L += t;
    vec3 o = refract(d, -n, eta);
    if (dot(o, o) > 0.0) return behind(p, o);
    d = reflect(d, n);
  }
  return fetch(toScreen(p));                                              // 还困在里面：取这一点正后方的画面
}
`;

const MAIN = /* glsl */`
  vec3 bp = (uV2B * vec4(-vViewPosition, 1.0)).xyz, I = normalize(bp - uV2B[3].xyz), N = normalize(mat3(uV2B) * normal);
  if (dot(N, I) > 0.0) N = -N;
  vec3 seen;
  #ifdef GLASS_PASS
    float frost = smoothstep(0.1, 0.45, roughnessFactor);
    gBlur = uBlur * frost;
    for (int c = 0; c < 3; c++) {                                        // 三色各走一遍：色散只在厚底和棱边上看得出
      float eta = ior + float(c - 1) * uDisp, L = 0.0;
      vec3 d = refract(I, N, 1.0 / eta), nc, col;
      vec2 h = enterP(bp, d, uCav, uCavY, nc);
      vec3 d2 = refract(d, nc, eta);
      if (bp.y > uOutY.y + 1e-4) { L = ${f(2 * G.wall)}; col = behind(bp, I); }            // 瓶颈：薄壁管，光基本直穿
      else if (h.x > 0.0 && h.x < h.y && dot(d2, d2) > 0.0) { L = 2.0 * h.x; col = behind(bp + d * h.x, d2) * 0.92; }   // 穿过侧壁进内腔：后壁按同样厚度算
      else col = through(bp, d, uOut, uOutY, eta, L);                    // 实心玻璃（厚底、肩、棱）：可能全反射
      seen[c] = col[c] * exp(-uAbsorb[c] * L);
    }
    seen = mix(seen, totalDiffuse, frost * ${f(OPTICS.frostDiffuse)});    // 磨砂面散射：带一点被灯照亮的白
  #else
    float L = 0.0;
    seen = through(bp, refract(I, N, 1.0 / ior), uLiq, uLiqY, ior, L) * exp(-uAbsorb * L);
  #endif
  totalDiffuse = (1.0 - EnvironmentBRDF(normal, geometryViewDir, material.specularColor, material.specularF90, material.roughness)) * seen;
`;

// ── 焦散：顶点着色器里追一条光线，落地点就是顶点位置 ──
const CAUSTIC_VERT = /* glsl */`
uniform vec3 uL, uC, uE1, uE2; uniform vec2 uExt; uniform float uEg, uEl, uGa, uLa, uAge;
${PRISM}
varying vec2 vSrc, vDst; varying vec3 vIn; varying vec4 vPath; varying float vOk, vT;
float fid(vec3 n) { return n.y > 0.5 ? 8.0 : n.y < -0.5 ? 9.0 : floor(mod(atan(n.z, n.x) / 0.785398 + 8.5, 8.0)); }
// 与 bottle.js 的 rippleHeight 同一公式
float rip(float r) {
  float b = ${f(RIPPLE.c)} * uAge - r;
  if (uAge <= 0.0 || b <= 0.0) return 0.0;
  return ${f(RIPPLE.amp)} * exp(${f(-RIPPLE.decay)} * uAge) * sqrt(${f(RIPPLE.r0)} / (r + ${f(RIPPLE.r0)})) * sin(${f(RIPPLE.k)} * b) * min(1.0, b / 0.003);
}
vec3 surfaceNormal(vec2 xz) {
  float r = length(xz), g = (rip(r + 1e-4) - rip(max(r - 1e-4, 0.0))) / 2e-4;
  vec2 u = r > 1e-6 ? xz / r : vec2(0.0);
  return normalize(vec3(-g * u.x, 1.0, -g * u.y));
}
void main() {
  vec3 d = -uL, p = uC + uE1 * (position.x * uExt.x) + uE2 * (position.y * uExt.y) + uL * 0.5, n;
  float ok = 1.0, Lg = 0.0, Ll = 0.0, region = 0.0, fl = 0.0;
  vec2 h = enterP(p, d, uOut, uOutY, n);
  if (!(h.x > 0.0 && h.x < h.y)) ok = 0.0;                              // 没碰到瓶子：普通光照，不归焦散管
  p += d * h.x;
  float fin = fid(n);
  // 被颈圈 / 喷头 / 瓶盖挡住：入射点往光源方向的线段在瓶身以上那段离轴不到 CAP_R
  float t0 = max((${f(DIMS.body)} - p.y) / uL.y, 0.0), t1 = (${f(DIMS.body + DIMS.collar + DIMS.cap)} - p.y) / uL.y;
  vec2 a = p.xz + uL.xz * t0, b = p.xz + uL.xz * t1, ab = b - a;
  if (length(a + ab * clamp(-dot(a, ab) / max(dot(ab, ab), 1e-12), 0.0, 1.0)) < ${f(CAP_R)}) ok = 0.0;
  d = refract(d, n, 1.0 / uEg);
  vec3 nc; vec2 hc = enterP(p, d, uCav, uCavY, nc);
  if (hc.x > 0.0 && hc.x < hc.y) {                                      // 进内腔
    Lg += hc.x; p += d * hc.x;
    bool liquid = p.y < ${f(G.fill)};
    if (!liquid) {                                                      // 液面以上是空气：落到液面，或者撞上对面的壁
      d = refract(d, nc, uEg); region = 1.0;
      vec3 nx; float t = exitP(p, d, uCav, uCavY, nx), tf = d.y < 0.0 ? (${f(G.fill)} - p.y) / d.y : 1e3;
      if (tf < t) { p += d * tf; d = refract(d, surfaceNormal(p.xz), 1.0 / uEl); liquid = true; region = 2.0; }
      else { p += d * t; d = refract(d, -nx, 1.0 / uEg); }
    } else { d = refract(d, nc, uEg / uEl); region = 3.0; }
    if (liquid) {
      vec3 nl; float t = exitP(p, d, uLiq, uLiqY, nl);
      Ll += t; p += d * t; fl = fid(nl); d = refract(d, -nl, uEl / uEg);
    }
  }
  if (dot(d, d) < 0.5) ok = 0.0;                                        // 里面某个界面全反射
  // 出瓶：全反射就在玻璃里反射一次再出（从竖直面进来的光到不了底面以外的直角面，靠这一下才从底面出去）
  vec3 no; float bounce = 0.0; bool left = false;
  for (int k = 0; k < 2; k++) {
    float t = exitP(p, d, uOut, uOutY, no);
    Lg += t; p += d * t;
    vec3 o = refract(d, -no, uEg);
    if (dot(o, o) > 0.5) { d = o; left = true; break; }
    bounce = fid(no) + 1.0; d = reflect(d, no);
  }
  if (!left || d.y > -1e-3) ok = 0.0;
  vec3 land = p + d * (-p.y / min(d.y, -1e-3));
  vOk = ok; vSrc = position.xy * uExt; vDst = land.xz; vIn = -d;
  vPath = vec4(fin, region, fl, fid(no) + 10.0 * bounce);                              // 走的面不同就是不同的路：跨路的三角形丢掉
  vT = exp(-(uGa * Lg + uLa * Ll));                                     // 本通道的比尔–朗伯吸收
  gl_Position = projectionMatrix * modelViewMatrix * vec4(land.x, 3e-4, land.z, 1.0);
}
`;
// 落点的亮度照搬 three 对地面的直接光：irradiance × (BRDF_Lambert + BRDF_GGX)，只是 irradiance 里的 dotNL 换成“出发面积 / 落地面积”
const CAUSTIC_FRAG = /* glsl */`
uniform vec3 uK, uAlb, uF0, uCam; uniform float uRough;
varying vec2 vSrc, vDst; varying vec3 vIn; varying vec4 vPath; varying float vOk, vT;
void main() {
  vec4 w = fwidth(vPath);
  if (vOk < 0.999 || max(max(w.x, w.y), max(w.z, w.w)) > 1e-3) discard;
  float aS = abs(determinant(mat2(dFdx(vSrc), dFdy(vSrc)))), aD = abs(determinant(mat2(dFdx(vDst), dFdy(vDst))));
  vec3 L = normalize(vIn), V = normalize(uCam - vec3(vDst.x, 0.0, vDst.y)), H = normalize(L + V);
  float a2 = pow(uRough, 4.0), nl = max(L.y, 0.0), nv = max(V.y, 0.0), nh = max(H.y, 0.0), vh = max(dot(V, H), 0.0);
  vec3 F = uF0 + (1.0 - uF0) * exp2((-5.55473 * vh - 6.98316) * vh);
  float G = 0.5 / max(nl * sqrt(a2 + (1.0 - a2) * nv * nv) + nv * sqrt(a2 + (1.0 - a2) * nl * nl), 1e-6);
  float D = a2 / (3.14159265 * pow(nh * nh * (a2 - 1.0) + 1.0, 2.0));
  gl_FragColor = vec4(uK * (uAlb / 3.14159265 + F * G * D) * vT * min(aS / max(aD, 1e-14), 12.0), 1.0);
}
`;

/** 把一个 MeshPhysicalMaterial 改成分层折射材质。transmission 保持 0：不让 three 另开自己的透射渲染 */
function refractive(mat, U, pass, absorb) {
  const u = { ...U, uAbsorb: { value: new THREE.Vector3(...absorb) } };
  Object.assign(mat, { transparent: false, opacity: 1, depthWrite: true, transmission: 0, side: THREE.FrontSide });
  if (pass === 'glass') mat.defines = { ...mat.defines, GLASS_PASS: '' };
  mat.onBeforeCompile = sh => {
    for (const inc of ['#include <transmission_pars_fragment>', '#include <transmission_fragment>'])
      if (!sh.fragmentShader.includes(inc)) throw new Error(`glass: three shader chunk not found (${inc})`);
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader.replace('#include <transmission_pars_fragment>', PARS).replace('#include <transmission_fragment>', MAIN);
  };
  mat.customProgramCacheKey = () => `wenjing-${pass}`;
  mat.needsUpdate = true;
  return mat;
}

/** 三张焦散网格（R、G、B 各一种折射率），共用一份网格几何 */
function caustics(U, sku) {
  const N = OPTICS.causticGrid, geo = new THREE.PlaneGeometry(1, 1, N, N), meshes = [];
  const shared = { uL: { value: new THREE.Vector3() }, uC: { value: new THREE.Vector3() }, uE1: { value: new THREE.Vector3() }, uE2: { value: new THREE.Vector3() },
    uExt: { value: new THREE.Vector2() }, uAge: { value: 0 }, uCam: { value: new THREE.Vector3() },
    uAlb: { value: new THREE.Color() }, uF0: { value: new THREE.Color() }, uRough: { value: 1 } };
  for (let c = 0; c < 3; c++) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: CAUSTIC_VERT, fragmentShader: CAUSTIC_FRAG,
      uniforms: { ...U, ...shared, uEg: { value: OPTICS.glassIor + (c - 1) * OPTICS.dispersion }, uEl: { value: OPTICS.liquidIor + (c - 1) * OPTICS.dispersion * 0.7 },
        uGa: { value: OPTICS.glassAbsorb[c] }, uLa: { value: sku.liquid.absorb[c] }, uK: { value: new THREE.Vector3() } },
      // 双面：从光源网格到落点的映射会翻转三角形的绕向（落地网格被焦散折叠时正反面都有）；叠加混合，多处汇聚就更亮
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false; m.renderOrder = 5;
    meshes.push(m);
  }
  return { meshes, shared };
}

/** 换上折射材质、加焦散和影子替身，返回 { render(target) }：film.render 每帧调用 */
export function createGlass(ctx, bottle, sku) {
  const { renderer, scene, camera } = ctx, { glass, liquid } = bottle.parts, V2 = (a, b) => new THREE.Vector2(a, b);
  const planes = S => S.planes.map(([nx, nz, d]) => new THREE.Vector3(nx, nz, d));
  const U = {
    tScene: { value: null }, tDepth: { value: null }, res: { value: V2(1, 1) }, uNear: { value: 0.01 }, uFar: { value: 100 }, uBlur: { value: 0 },
    uV2B: { value: new THREE.Matrix4() }, uB2V: { value: new THREE.Matrix4() }, uDisp: { value: OPTICS.dispersion },
    uOut: { value: planes(SHAPE.outer) }, uCav: { value: planes(SHAPE.cavity) }, uLiq: { value: planes(SHAPE.liquid) },
    uOutY: { value: V2(...SHAPE.outer.y) }, uCavY: { value: V2(...SHAPE.cavity.y) }, uLiqY: { value: V2(...SHAPE.liquid.y) },
  };
  glass.material.ior = OPTICS.glassIor;
  refractive(glass.material, U, 'glass', OPTICS.glassAbsorb);
  // 液体本身无色：颜色全来自吸收，越厚越深（瓶底、侧看的棱边）
  const lm = refractive(new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.04, ior: OPTICS.liquidIor }), U, 'liquid', sku.liquid.absorb);
  liquid.traverse(o => { if (o.isMesh) { o.material = lm; o.layers.set(LAYER.liquid); } });
  glass.traverse(o => { if (o.isMesh) o.layers.set(LAYER.glass); });

  // 影子替身：第 0 层、不写颜色不写深度，只进阴影贴图——瓶身整块挡住主光，透过去的光由焦散补回来
  const proxy = new THREE.Mesh(glass.geometry, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  proxy.castShadow = true;
  const cz = caustics(U, sku);
  bottle.root.add(proxy, ...cz.meshes);

  // 主光：第一盏投影的平行光。落点平面的材质从瓶底往下打一条射线取（只看 color / roughness / metalness，不看贴图）
  let key = null;
  scene.traverse(o => { if (!key && o.isDirectionalLight && o.castShadow) key = o; });
  scene.updateMatrixWorld(true);                                     // 世界里的东西刚建好，矩阵还没更新（否则射线会打到原点上的别的东西）
  const ray = new THREE.Raycaster(bottle.root.localToWorld(new THREE.Vector3(0, 0.05, 0)), new THREE.Vector3(0, -1, 0));
  const gm = ray.intersectObjects(scene.children.filter(o => o !== bottle.root), true).find(h => h.object.material?.color)?.object.material;
  const S = cz.shared, metal = gm?.isMeshStandardMaterial ? gm.metalness : 0;
  S.uAlb.value.copy(gm ? gm.color : new THREE.Color(0.2, 0.2, 0.2)).multiplyScalar(1 - metal);
  if (gm?.isMeshStandardMaterial) S.uF0.value.setScalar(0.04).lerp(gm.color, metal); else S.uF0.value.setScalar(0);   // 和 three 一样：非金属 F0 = 0.04
  S.uRough.value = gm?.isMeshStandardMaterial ? Math.max(gm.roughness, 0.0525) : 1;

  const _m = new THREE.Matrix4(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const box = [0, 1].flatMap(i => [0, 1].flatMap(j => [0, 1].map(k => new THREE.Vector3((i - 0.5) * DIMS.w, j * DIMS.body, (k - 0.5) * DIMS.d))));
  function aimCaustics() {
    for (const m of cz.meshes) m.visible = !!key;
    if (!key) return;
    _m.copy(bottle.root.matrixWorld).invert();
    const L = S.uL.value.subVectors(key.getWorldPosition(_a), key.target.getWorldPosition(_b)).transformDirection(_m);
    const e1 = S.uE1.value.crossVectors(L, Math.abs(L.y) > 0.99 ? _c.set(1, 0, 0) : up).normalize(), e2 = S.uE2.value.crossVectors(e1, L);
    const B = _c.set(0, DIMS.body / 2, 0), lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
    for (const v of box) { _a.subVectors(v, B); const s = [_a.dot(e1), _a.dot(e2)]; for (const i of [0, 1]) { lo[i] = Math.min(lo[i], s[i]); hi[i] = Math.max(hi[i], s[i]); } }
    S.uC.value.copy(B).addScaledVector(e1, (lo[0] + hi[0]) / 2).addScaledVector(e2, (lo[1] + hi[1]) / 2);
    S.uExt.value.set((hi[0] - lo[0]) * 1.02, (hi[1] - lo[1]) * 1.02);
    S.uAge.value = Math.max(bottle.posed?.ripple ?? 0, 0);
    S.uCam.value.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(_m);
    cz.meshes.forEach((m, c) => m.material.uniforms.uK.value.setComponent(c, key.color.toArray()[c] * key.intensity * OPTICS.causticGain * OPTICS.interfaces));
  }

  return {
    render(target) {
      scene.traverse(o => { if (o.isLight) o.layers.enableAll(); });     // 灯要在三遍里都被收集
      scene.updateMatrixWorld(); camera.updateMatrixWorld();              // 焦散要在 render 之前用到本帧的瓶子和相机矩阵
      aimCaustics();
      const mask = camera.layers.mask, bg = scene.background, ac = renderer.autoClear, su = renderer.shadowMap.autoUpdate;
      try {
        camera.layers.set(0);
        renderer.setRenderTarget(target); renderer.clear(); renderer.render(scene, camera);   // 第 0 层：世界、金属件、吸管、焦散
        U.uB2V.value.multiplyMatrices(camera.matrixWorldInverse, bottle.root.matrixWorld);
        U.uV2B.value.copy(U.uB2V.value).invert();
        U.res.value.set(target.width, target.height); U.uBlur.value = OPTICS.frostBlur * target.height;
        U.uNear.value = camera.near; U.uFar.value = camera.far;
        U.tScene.value = target.texture; U.tDepth.value = target.depthTexture;
        scene.background = null; renderer.autoClear = false; renderer.shadowMap.autoUpdate = false;   // 后两遍叠在第一遍上：不清屏、不重画阴影
        for (const layer of [LAYER.liquid, LAYER.glass]) { camera.layers.set(layer); renderer.render(scene, camera); }
      } finally { scene.background = bg; renderer.autoClear = ac; renderer.shadowMap.autoUpdate = su; camera.layers.mask = mask; }
    },
  };
}
```

Notes:
- The fragment shader needs its own `uniform mat4 projectionMatrix;`. three declares it only in the vertex shader.
- `CAP_R` stops caustic rays that would pass through the collar, pump or cap. Those parts are opaque and already in the shadow map, so the caustic must not light up their shadow.
- `interfaces: 0.85` is the Fresnel loss over the four glass and liquid surfaces a ray crosses. `causticGain` stays 1: the brightness is physical, and a world that wants more light raises its key.
- `vPath.w` packs the exit face and the bounce face into one number (`fid(no) + 10 · bounce`). Two rays that leave through the same face after different bounces therefore count as different paths.

- [ ] **Step 4: Run the test to make sure it passes**

Run: `node --test 03-perfume/test/glass.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Wire it in**

Make these exact replacements in `03-perfume/js/bottle.js`:

1. Replace:

```js
  const tube = new THREE.Mesh(new THREE.TubeGeometry(path, 64, 0.0011, 10), plastic);
  g.add(act, chamber, tube);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
```

   with:

```js
  // 吸管是透明塑料：半透明、不投影（不透明的白管从正面磨砂 logo 后面穿过，会把字母“切断”）
  const clear = new THREE.MeshPhysicalMaterial({ color: '#f4f3ee', roughness: 0.2, transparent: true, opacity: 0.35, depthWrite: false });
  const tube = new THREE.Mesh(new THREE.TubeGeometry(path, 64, 0.0011, 10), clear);
  g.add(act, chamber, tube);
  g.traverse(m => { if (m.isMesh) m.castShadow = m !== tube; });
```

2. Replace:

```js
    root, parts,
```

   with:

```js
    root, parts, posed: null,                                        // posed：最近一次 pose 的完整参数（glass.js 读涟漪）
```

3. Replace:

```js
      shapeSurface(ripple);
```

   with:

```js
      shapeSurface(ripple);
      bottle.posed = { explode, capLift, press, ripple };
```

Make these exact replacements in `03-perfume/film.js`:

1. Replace:

```js
import { buildBottle, logoMask } from './js/bottle.js';
```

   with:

```js
import { buildBottle, logoMask } from './js/bottle.js';
import { createGlass } from './js/glass.js';
```

2. Replace:

```js
    ctx.subjects = { bottle };
```

   with:

```js
    ctx.subjects = { bottle, glass: createGlass(ctx, bottle, sku) };
```

3. Replace:

```js
  shots: SHOTS,
```

   with:

```js
  /** 场景目标里分三遍画：世界 → 液体 → 玻璃（js/glass.js） */
  render(ctx, target) { ctx.subjects.glass.render(target); },
  shots: SHOTS,
```

`npm test` still passes the Task 11 bottle tests: the tube keeps its geometry, so the framing boxes don't move, and `posed` is only written, never read, inside `bottle.js`.

- [ ] **Step 6: Look at it**

```bash
node factory/snap.mjs 03-perfume --t 1.0,3.6,6.4,9.3,12.5 --world studio --ar 9x16 --out /tmp/t12
node factory/snap.mjs 03-perfume --t 6.4,9.3 --world studio --ar 1x1 --out /tmp/t12
node factory/snap.mjs 03-perfume --t 6.4,9.3 --world studio --ar 16x9 --out /tmp/t12
```

Expected: about 120 ms per 9x16 frame, 70–100 ms at 1x1 and 125–160 ms at 16x9. The first bottle frame of a run also compiles the shaders and can take about 270 ms.
- **t = 6.4 (hero):**
  - the glass is clear, with a thick colourless base under a pale-green liquid;
  - 闻境 · WENJING reads as frosted glass on the front, and the clear dip tube shows faintly through it without cutting any letter;
  - the neck, the pump chamber and the tube appear behind the liquid, displaced at the chamfers.
- **The shadow:** it falls to the right and is mostly dark. Next to the base there are small lit patches, as bright as the open floor, where light passes through the base's parallel faces. They have faint colour fringes at their edges.
- **t = 3.6 (drop):** rings are clearly visible on the liquid surface through the glass. Task 11 only hinted at them.
- **t = 9.3 (anatomy):** the pump rises only 35 mm, so its clear dip tube still hangs into the bottle and shows through the glass and the liquid. The leaders are unchanged.
- **t = 1.0 (macro):** the pebble and its drop are unchanged. The studio drop still uses three's own `transmission`: it is a stand-in, and the worlds replace it.
- **t = 12.5 (end):** the same bottle as the hero, with 闻境 WENJING and the tagline below it.
- **1x1 and 16x9:** the same bottle in each framing. No frame shows a bright spot or a black hole on the base's chamfers; those would mean a ray was left inside the glass.

- [ ] **Step 7: Re-run the pre-flight**

The caustic now depends on the ripple and on the camera, so check determinism again.

Run: `node factory/check.mjs 03-perfume; echo "exit $?"`
Expected: every line `ok`, including `determinism  14 frames identical forward and backward`, then `speed  ~110 ms/frame at 1080×1920 …`, `all checks passed` and `exit 0`.

- [ ] **Step 8: Run all tests and commit**

Run: `npm test`
Expected: PASS, 80 tests.

```bash
git add 03-perfume/js/glass.js 03-perfume/test/glass.test.mjs 03-perfume/js/bottle.js 03-perfume/film.js
git commit -m "Add layered glass and liquid refraction and ground caustics; clear dip tube

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 13: The 白茶 world — misty tea garden and the dew macro — `whitetea.js`

This task builds the first real world. The bottle stands on the wet slate capstone of a tea-terrace wall. Behind it, five ridges of tea rows fade into valley mist, with a low sun behind and to the left and slow rays through the mist. The macro is 一芽二叶: a downy bud and two serrated young leaves, with a dew drop growing on the lower leaf's tip. Only 白茶 gets its world here; 桂花, 海盐 and 玫瑰 keep the studio until Tasks 17–19.

**Three engine changes every world needs:**
- **Worlds describe their reflections; `film.setup` makes them.** Until now `studio.build` called `envMap(renderer, …)` itself. A world now returns `env = { base, strip?, k?, fill(add, B, es) }`, and `film.setup` sets `ctx.scene.environment = envMap(ctx.renderer, ctx.world.env)`.
  - So a world builds in Node with `renderer: null`, and `worlds.test.mjs` checks every world without a browser.
  - `fill` also gets `es`, the environment scene itself. The tea garden puts a small copy of its sky there, with `base: null` (no room sphere), so the glass reflects the same sky the camera sees.
- **`focus: 'target'`.** This is the new default in `POST_DEFAULTS`. `app.js` keeps the solved pose, and `focusOn` replaces `'target'` with the camera-to-target distance. A fit shot sits at a different distance in each ratio, so a fixed focus in metres would be sharp in one ratio and soft in another. A number still works as before.
- **The macro camera can be a `'fit'` intent.** The engine needs nothing new: `solvePose` already takes `anchor` / `size` / `maxW` from the layout row. The three macro rows in `layouts.js` now carry them, placing the subject clear of the hook.
  - The 16:9 hook zone narrows from 0.54 to 0.42 wide. The zh and en hooks end at x ≈ 0.37 and 0.41, and the dew sits at about 0.5. `text-fit` still passes.

**The world rules, now tested.** `worlds.test.mjs` runs five tests for every distinct world in `WORLDS`:
- it builds without a renderer and returns `env`, `post` and a `macro` whose root is in the scene;
- it has a shadow-casting key `DirectionalLight`, and flat ground at y = 0 under the whole bottle footprint, all one `MeshStandardMaterial` without `map` / `roughnessMap` / `metalnessMap`, because Task 12's caustic reads that material;
- every vertex is within 190 m of the origin (the far plane is 200 m);
- the macro set stays out of every bottle shot and out of the key light's shadow frustum, and the bottle stays out of every macro frame;
  - "every shot" means both cuts, nine samples per shot plus half a second for the dissolve, at all three ratios;
  - when the macro camera is a fit intent, the projected fit box stays clear of the macro row's text zones;
- `reset` + `update` give the same scene whatever order the timeline is visited in.

The studio broke two of these rules. Its pebble sat at (0.5, 0, −0.3), inside the shadow box and inside the spray camera's frustum at every ratio. It moves to (−3, 0, 0) and its camera moves with it. Outside the shadow box it no longer casts a shadow on the floor, which is fine for a debug world.

**How the tea garden is made:**
- **Sky and mist.** `haze` (common.js) is one colour function: a horizon-to-zenith gradient, valley mist below the horizon, a sun glow and slow rays. The sky sphere, the ridge fog and the mist billboards all call it, so distant things melt into the sky without a seam.
- **Ridges.** Five arcs around the origin, 60–176 m out, spanning ±135°. That span keeps hills behind the macro camera, which looks down −x, and at the left edge of 16:9 frames.
  - The tea rows follow the contours (row index = height / row spacing) and bend with the spurs and gullies.
  - Where a row is smaller than a pixel, it fades to its average colour.
  - Each ridge sinks into mist below its crest, which separates the layers.
- **Slab.** Its top at y = 0 is where the caustic lands.
  - Its shader varies colour and roughness by up to ±15% around `#6d7571` / 0.26, as wet patches and grain along the stone.
  - The mean is the material's own `color` / `roughness`, which is what the caustic reads. The light through the glass therefore matches the slate around it.
  - Dressing: 300 flat droplets (none under the base), a strip of moss along the back edge (12 000 instances with sheen), three fallen leaves and the wall stones below.
- **Macro.** It is built in the sprig's own frame and turned 90°, so the camera looks down −x into the sun: backlit.
  - The bud has 2 500 line-segment hairs, which the backlight rims white.
  - The leaves have a vein bump and a translucency term added after three's lights.
  - Behind them is an out-of-focus bush of 480 instanced old leaves. They are matte: with clearcoat, their glints bloomed into white smears.
- **The dew is analytic, not `transmission`.** `dewMaterial` (common.js) refracts the view ray into a sphere and out again, then looks up the haze. The result is the sky inverted, the ground colour below the horizon and the backlit leaf above.
  - The sun's image is a narrow, very bright spot (`pow(·, 250) × 60`), which bloom turns into a sparkle.
  - The drop's glow is narrowed to `pow(·, 12)`; the full sky glow washed the lower half of the drop white.
  - `drop(R)` keeps the top of the drop on the leaf tip as it grows from 1.6 to 3 mm over the macro; `reset` puts it back at 3 mm.
- **The macro camera** fits the bud, both leaves and the dew. The box is flattened to the dew's depth, so `focus: 'target'` lands on the dew. The camera orbits from −8° to +4° and pushes in 12%. Its post opens the aperture to 1.2 and raises the blur cap to 0.03.
- **Drift.** 28 mist billboards in the valley and 12 leaves falling behind the slab, both closed-form (`driftField`), so any frame is a function of t.

`common.js` is replaced whole. Besides `envMap`'s new signature it gains `NOISE`, `haze`, `sky`, `dewMaterial`, `driftField`, `puffAtlas` and `billboards`. Tasks 14 and 17–19 reuse them.

**Files:**
- Create: `03-perfume/js/worlds/whitetea.js`
- Replace: `03-perfume/js/worlds/common.js`
- Modify: `03-perfume/js/worlds/studio.js`, `03-perfume/film.js`, `03-perfume/layouts.js`, `factory/engine/post.js`, `factory/engine/app.js`
- Test: `03-perfume/test/worlds.test.mjs`, `factory/test/post.test.mjs`

**Interfaces:**
- Consumes:
  - Task 1: `rand(seed, i)`; `lerp`, `ss`, `clamp`, `easeInOut`; `drift(seed, i, t, box, { vel, sway, swayHz }) → [x, y, z, phase, fade]`.
  - Task 2: `ASPECTS`, `parseVariant`. Task 3: `buildCut`. Task 4: `solvePose`, `applyPose`, `project`, and fit intents `{ type: 'fit', box, dir, fov, scale? }`.
  - Task 7: `LAYOUTS[ar][shot].zones`, `CUTS`, `BOX.exploded`, `DIMS`, `SKUS`.
  - Task 8: `mergePost`, `POST_DEFAULTS`, the `evalShot` path in `app.js` (reset → shot → `solvePose` → `applyPose` → `mergePost`), `film.setup` / `film.reset` and `ctx.postDefaults = ctx.world.post ?? {}`.
  - Task 11: `buildBottle`. Task 12: the caustic's world rule (shadow-casting key light, plain ground at y = 0).
- Produces:
  - `post.js`: `POST_DEFAULTS.focus = 'target'`; `focusOn(P, pose) → P'`, a new object with `focus` = |pose.position − pose.target| when `P.focus === 'target'`, otherwise `P` itself. `app.js` returns `post: focusOn(mergePost(ctx.postDefaults, o.post), pose)`.
  - `film.js`: `export const WORLDS = { studio, whitetea, osmanthus, seasalt, rose }`, each `() => import(…)`. osmanthus / seasalt / rose point at the studio until Tasks 17–19.
  - World module contract (replaces Task 8's): `build(ctx) → { env: { base?, strip?, k?, fill?(add, B, es) }, post?, macro: { root, camera(s) → intent, post? }, update?(ctx, s), reset?(), dispose?() }`.
    - `build` must not touch `ctx.renderer`. It sets `scene.background` and adds its own lights and meshes.
    - It must pass `worlds.test.mjs`, which is the world rule for Tasks 17–19.
  - `common.js`:
    - `envMap(renderer, { base = '#1c1d20', strip = '#ffffff', k = 5, fill } = {}) → PMREM texture`. `base: null` means no room sphere. `fill(add, B, es)`: `add(w, h, [x, y, z], mat)` places a panel facing the centre, `B(colour, gain)` is an emissive material, and `es` is the environment scene.
    - `NOISE`: the GLSL `hash2` / `vnoise` / `fbm`.
    - `haze({ zenith, horizon, mist, sun: { dir, color, glow, rays } }) → { uniforms, glsl }`. Merge `uniforms` into your own `ShaderMaterial` (the same objects) and put `glsl` at the top of the shader, which then has `haze(d)`. Per frame, only `uniforms.hTime` changes.
    - `sky(hz, { R = 180 }) → Mesh`. Inside `env.fill` use a small radius such as 15: PMREM's far plane is 100.
    - `dewMaterial(hz, { below, above, ior = 1.33 }) → ShaderMaterial`, for a unit sphere, which may be scaled into an ellipsoid.
    - `driftField({ geometry, material, count, seed, box, vel, sway, swayHz, size, spin, fade: 'scale' | 'alpha' }) → { mesh, update(t) }`.
    - `puffAtlas(seed, N = 128) → DataTexture`, a 2 × 2 atlas.
    - `billboards(hz, { map, tint, opacity, forward, aspect }) → ShaderMaterial`, used with `driftField({ fade: 'alpha' })` and `PlaneGeometry(1, 1)`.
  - `whitetea.js`: `build`, and `teaLeafGeometry(len, { segs, fold, curl, serr, teeth })` (+x from stalk to tip, face up +y). Task 14's drop continues from the macro dew, which hangs at leaf 2's tip.
  - `layouts.js`: the macro rows gain `anchor` / `size` / `maxW` (9x16 `[0.52, 0.33]` / 0.5 / 0.9; 1x1 `[0.5, 0.4]` / 0.66 / 0.9; 16x9 `[0.68, 0.42]` / 0.72 / 0.6). The 16x9 hook zone becomes `[0.06, 0.74, 0.42, 0.12]`.

- [ ] **Step 1: Write the failing tests**

The post test pins `mergePost`'s layering, which until now was only exercised through the browser, and the new `focusOn`.

`factory/test/post.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { POST_DEFAULTS, mergePost, focusOn } from '../engine/post.js';

test('mergePost layers defaults → world → shot, merging bloom field by field', () => {
  const world = { exposure: 1.1, aperture: 0.25, bloom: { strength: 0.3 } }, shot = { aperture: 0.6, bloom: { threshold: 0.9 } };
  const P = mergePost(world, undefined, shot);
  assert.equal(P.exposure, 1.1); assert.equal(P.aperture, 0.6); assert.equal(P.vignette, POST_DEFAULTS.vignette);
  assert.deepEqual(P.bloom, { ...POST_DEFAULTS.bloom, strength: 0.3, threshold: 0.9 });
  assert.equal(POST_DEFAULTS.bloom.strength, 0.22);                    // 默认值没被改写
  assert.equal(mergePost().focus, 'target');
});

test("focus 'target' becomes the camera-to-target distance of the solved pose; a number stays", () => {
  const pose = { position: [0.3, 0.2, 0.9], target: [0, 0.08, 0.1] };
  assert.equal(focusOn(mergePost(), pose).focus, Math.hypot(0.3, 0.12, 0.8));
  assert.equal(focusOn(mergePost({ focus: 0.5 }), pose).focus, 0.5);
  const P = mergePost(); focusOn(P, pose);
  assert.equal(P.focus, 'target');                                      // 返回新对象，不改输入
});
```

The worlds test sets a world up the way `film.setup` does, then walks the real shots through the same steps as `evalShot` in `app.js`. The frustum checks use the solved cameras, so a world that passes here also passes on screen.

`03-perfume/test/worlds.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import film, { WORLDS } from '../film.js';
import { LAYOUTS } from '../layouts.js';
import { SKUS } from '../skus.js';
import { CUTS, BOX, DIMS } from '../meta.js';
import { buildBottle } from '../js/bottle.js';
import { ASPECTS, parseVariant } from '../../factory/engine/variant.js';
import { solvePose, applyPose, project } from '../../factory/engine/framing.js';
import { buildCut } from '../../factory/engine/timeline.js';
import { clamp } from '../../factory/engine/ease.js';

// 世界的约定（每个香型的世界都要守）。每个世界只建一次：几个香型共用影棚时影棚测一遍。
// Node 里没有渲染器：世界的 build 碰到 ctx.renderer 就会抛错（反射环境由 film.setup 按 world.env 生成）
const FAR = 200;                                                         // app.js 的相机远裁面（米）
const ids = Object.keys(WORLDS).filter((id, i, all) => all.findIndex(j => WORLDS[j] === WORLDS[id]) === i);
const box3 = ([a, b]) => new THREE.Box3(new THREE.Vector3(...a), new THREE.Vector3(...b));
const frustum = cam => new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
const hit = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

/** 和 film.setup 一样搭起来（瓶子不带 logo、不换玻璃：镜头只用到它的 pose 和 anchor） */
const cache = {};
function load(id) {
  return (cache[id] ??= (async () => {
    const scene = new THREE.Scene(), variant = parseVariant(film, { sku: 'whitetea' });
    const ctx = { scene, renderer: null, variant, params: new URLSearchParams(), W: 1080, H: 1920 };
    ctx.world = await (await WORLDS[id]()).build(ctx);
    const bottle = buildBottle(ctx, SKUS[variant.sku]);
    scene.add(bottle.root);
    ctx.subjects = { bottle };
    scene.updateMatrixWorld(true);
    return ctx;
  })());
}
/** 按 app.js 的 evalShot 求一个镜头：复位 → 镜头函数（里面调 world.update）→ 相机 */
function evalShot(ctx, e, lt, ar) {
  const [W, H] = ASPECTS[ar], row = LAYOUTS[ar][e.shot] ?? {}, cam = new THREE.PerspectiveCamera(30, 1, 0.01, FAR);
  const s = { name: e.shot, lt, dur: e.dur, u: clamp(lt / e.dur), from: e.from, t: e.start + lt - e.from, row };
  film.reset(ctx);
  const o = film.shots[e.shot](ctx, s);
  applyPose(cam, solvePose(o.camera, row, W / H), W, H);
  return { s, o, cam, row };
}
/** 两种剪辑里每个镜头从头到尾（多走 0.5 秒：叠化时上一镜头还在播）各取 9 个时刻 */
const samples = () => Object.values(CUTS).flatMap(c => buildCut(c).entries.flatMap(e => [...Array(9).keys()].map(k => [e, e.from + (k / 8) * (e.dur + 0.5)])));
function keyLight(scene) {
  let key = null;
  scene.traverse(o => { if (!key && o.isDirectionalLight && o.castShadow) key = o; });
  return key;
}
/** 场景里逐帧可能变的一切：矩阵、可见性、实例矩阵与颜色、材质 uniform 的数值 */
function snapshot(scene) {
  scene.updateMatrixWorld(true);
  const out = [], add = a => { for (const x of a) out.push(x); };            // 实例数组有几十万个数：不能展开成参数
  scene.traverse(o => {
    add([o.visible, ...o.matrixWorld.elements]);
    if (o.isInstancedMesh) { add(o.instanceMatrix.array); add(o.instanceColor?.array ?? []); }
    for (const u of Object.values(o.material?.uniforms ?? {})) {
      if (typeof u.value === 'number') out.push(u.value); else if (u.value?.toArray) add(u.value.toArray());
    }
  });
  return out;
}

for (const id of ids) {
  test(`${id}: builds without a renderer and returns env, post and a macro set in the scene`, async () => {
    const { scene, world } = await load(id);
    assert.ok(world.env && typeof world.env === 'object', 'world.env is missing');
    if (world.env.fill) assert.equal(typeof world.env.fill, 'function');
    assert.ok(world.env.base === null || world.env.base === undefined || typeof world.env.base === 'string');
    assert.equal(typeof (world.post ?? {}), 'object');
    let o = world.macro.root;
    while (o.parent) o = o.parent;
    assert.equal(o, scene, 'macro.root is not in the scene');
    assert.equal(typeof world.macro.camera, 'function');
  });

  test(`${id}: a shadow-casting key light, and flat plain ground at y = 0 under the bottle`, async () => {
    const { scene, subjects } = await load(id);
    assert.ok(keyLight(scene), 'no shadow-casting DirectionalLight');
    const ray = new THREE.Raycaster(), mats = new Set(), others = scene.children.filter(o => o !== subjects.bottle.root);
    for (const [x, z] of [[0, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => [(a * DIMS.w) / 2, (b * DIMS.d) / 2])) {
      ray.set(new THREE.Vector3(x, 0.05, z), new THREE.Vector3(0, -1, 0));
      const h = ray.intersectObjects(others, true).find(h => h.object.material?.color);
      assert.ok(h && Math.abs(h.point.y) < 1e-6, `ground under (${x}, ${z}) is at ${h?.point.y}`);
      mats.add(h.object.material);
    }
    assert.equal(mats.size, 1, 'the bottle stands across two materials');
    const [m] = mats;                                                    // 焦散只读 color / roughness / metalness（glass.js）
    assert.ok(m.isMeshStandardMaterial && !m.map && !m.roughnessMap && !m.metalnessMap, `ground is a ${m.type} with maps`);
  });

  test(`${id}: everything stays inside the camera's far plane`, async () => {
    const { scene } = await load(id), v = new THREE.Vector3(), S = new THREE.Sphere(), M = new THREE.Matrix4();
    let far = 0, what = '';
    scene.traverse(o => {
      const p = o.geometry?.attributes.position;
      if (!p) return;
      let d = 0;
      if (o.isInstancedMesh) {                                           // 每个实例：几何的包围球搬到实例上
        o.geometry.computeBoundingSphere();
        for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M); S.copy(o.geometry.boundingSphere).applyMatrix4(M.premultiply(o.matrixWorld)); d = Math.max(d, S.center.length() + S.radius); }
      } else for (let i = 0; i < p.count; i++) d = Math.max(d, v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).length());
      if (d > far) { far = d; what = `${o.type} ${o.name}`; }
    });
    assert.ok(far < FAR - 10, `${what} reaches ${far.toFixed(1)} m from the origin (cameras are a few metres out, the far plane is ${FAR} m)`);
  });

  test(`${id}: the macro set is out of every bottle shot and the shadow box; the bottle is out of the macro`, async () => {
    const ctx = await load(id), key = keyLight(ctx.scene), bottle = box3(BOX.exploded);
    film.reset(ctx);
    const macro = new THREE.Box3().setFromObject(ctx.world.macro.root, true);
    key.shadow.updateMatrices(key);                                      // 主光阴影相机的视锥：只有这里面的东西投影、受影
    assert.ok(!key.shadow.getFrustum().intersectsBox(macro), 'the macro set is inside the key light shadow box');
    for (const ar of Object.keys(ASPECTS)) for (const [e, lt] of samples()) {
      const { cam, o, row } = evalShot(ctx, e, lt, ar), F = frustum(cam), at = `${ar} ${e.shot} lt=${lt.toFixed(2)}`;
      if (e.shot !== 'macro') { assert.ok(!F.intersectsBox(macro), `${at}: the macro set is in frame`); continue; }
      assert.ok(!F.intersectsBox(bottle), `${at}: the bottle is in the macro`);
      if (!o.camera.box) continue;
      const p = project(cam, o.camera.box), r = [p.minX, p.minY, p.maxX - p.minX, p.maxY - p.minY];
      for (const [z, zr] of Object.entries(row.zones ?? {})) assert.ok(!hit(r, zr), `${at}: the macro subject overlaps ${z}`);
    }
  });

  test(`${id}: reset + update give the same scene however the timeline is visited`, async () => {
    const ctx = await load(id), E = buildCut(CUTS[15]).entries, at = t => E.find(e => t < e.end) ?? E.at(-1);
    const visit = t => { const e = at(t); evalShot(ctx, e, e.from + t - e.start, '9x16'); return snapshot(ctx.scene); };
    const a = visit(5), b = (visit(1), visit(9.3), visit(13.5), visit(5));
    const i = a.findIndex((x, k) => !Object.is(x, b[k]));
    assert.equal(a.length, b.length);
    assert.equal(i, -1, `state #${i} differs after visiting other shots: ${a[i]} vs ${b[i]}`);
  });
}
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `node --test factory/test/post.test.mjs 03-perfume/test/worlds.test.mjs`
Expected: FAIL (2 files) with `SyntaxError: The requested module '../engine/post.js' does not provide an export named 'focusOn'` and `SyntaxError: The requested module '../film.js' does not provide an export named 'WORLDS'`.

- [ ] **Step 3: Focus on the target**

Make these exact replacements in `factory/engine/post.js`:

1. Replace:

```js
  focus: 0.5, aperture: 0, maxBlur: 0.012,          // 对焦距离（米）；景深强度（0 = 关）；最大弥散圆半径（画面短边比例）
```

   with:

```js
  focus: 'target', aperture: 0, maxBlur: 0.012,     // 对焦距离（米，'target' = 相机注视点）；景深强度（0 = 关）；最大弥散圆半径（画面短边比例）
```

2. Replace:

```js
export const mergePost = (...xs) => xs.reduce((a, x) => (x ? { ...a, ...x, bloom: { ...a.bloom, ...x.bloom } } : a), POST_DEFAULTS);
```

   with:

```js
export const mergePost = (...xs) => xs.reduce((a, x) => (x ? { ...a, ...x, bloom: { ...a.bloom, ...x.bloom } } : a), POST_DEFAULTS);
/** focus: 'target' 换成取景解出的相机到注视点的距离：同一个镜头在三种比例下相机远近不同，焦点都落在主体上 */
export const focusOn = (P, pose) => (P.focus === 'target' ? { ...P, focus: Math.hypot(...pose.position.map((x, i) => x - pose.target[i])) } : P);
```

Make these exact replacements in `factory/engine/app.js`:

1. Replace:

```js
import { createPost, mergePost } from './post.js';
```

   with:

```js
import { createPost, mergePost, focusOn } from './post.js';
```

2. Replace:

```js
    applyPose(camera, solvePose(o.camera, row, ctx.W / ctx.H), ctx.W, ctx.H);
```

   with:

```js
    const pose = solvePose(o.camera, row, ctx.W / ctx.H);
    applyPose(camera, pose, ctx.W, ctx.H);
```

3. Replace:

```js
    return { s, text, post: mergePost(ctx.postDefaults, o.post) };
```

   with:

```js
    return { s, text, post: focusOn(mergePost(ctx.postDefaults, o.post), pose) };
```

Run: `node --test factory/test/post.test.mjs`
Expected: PASS (2 tests). The studio's bottle shots have `aperture: 0`, so they don't change. Its macro (aperture 0.6) now focuses on the drop, about 0.1 m away, instead of at 0.5 m, so the drop becomes sharp.

- [ ] **Step 4: Worlds describe their reflections**

`03-perfume/js/worlds/common.js`:

```js
// common.js — 各世界共用的场景件：反射环境（PMREM，总带几条隐藏的长条灯）、天色与雾（haze）、天空球、水珠、闭式漂浮粒子、朝向相机的雾团 / 光斑
import * as THREE from 'three';
import { drift } from '../../../factory/engine/particles.js';
import { rand } from '../../../factory/engine/rng.js';

/**
 * 用一个程序场景生成反射环境。世界的 build 只返回 env = { base, strip, k, fill }，由 film.setup 调这里（Node 测试里没有渲染器，世界照样能建）。
 * fill(add, B, es) 往里放发光面：add(w, h, [x, y, z], mat) 放一块朝向中心的面片，B(颜色, 倍数) 是发光材质，es 是环境场景本身（放天空球之类）。
 * base 是半径 20 的房间球的颜色（null = 不要房间，比如整个换成天空）。另外总放左右后方两条竖长条灯和顶上一条横长条灯：玻璃棱边靠它们勾出清楚的亮线
 */
export function envMap(renderer, { base = '#1c1d20', strip = '#ffffff', k = 5, fill = () => {} } = {}) {
  const es = new THREE.Scene();
  const B = (c, s = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(s), side: THREE.DoubleSide });
  const add = (w, h, pos, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(...pos); m.lookAt(0, 0, 0); es.add(m); return m; };
  if (base !== null) { const room = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), B(base)); room.material.side = THREE.BackSide; es.add(room); }
  const S = B(strip, k);
  add(0.9, 16, [-9, 3, -5], S); add(0.9, 16, [9, 3, -5], S); add(16, 0.9, [0, 12, 1], S);
  fill(add, B, es);
  const pm = new THREE.PMREMGenerator(renderer), tex = pm.fromScene(es, 0.02).texture;
  pm.dispose();
  es.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });   // 只释放环境场景自己的材质；共享的 uniform 对象不受影响
  return tex;
}

/** 值噪声（GLSL）：hash2 / vnoise / fbm。地形、雾带、叶脉都用它 */
export const NOISE = /* glsl */`
float hash2(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
`;

// ── 天色与雾 ──
/**
 * 视线方向 d 上的天色 haze(d)：地平线以上从 horizon 渐变到 zenith，以下是谷里的雾色 mist；太阳方向有日晕（glow），
 * 太阳一侧的低空和雾里有光束（rays：绕太阳按角度起伏的明暗条纹，随 hTime 缓缓变化；离太阳 90° 以内都看得到）。天空球、远山的雾、雾团都调同一个 haze，远处的东西就无缝融进天色里。
 * 返回 { uniforms, glsl }：把 uniforms 并进自己的 ShaderMaterial（共用同一份对象），glsl 放在着色器开头；逐帧只改 uniforms.hTime
 */
export function haze({ zenith, horizon, mist, sun: { dir, color, glow = 1, rays = 0 } }) {
  const uniforms = {
    hZenith: { value: new THREE.Color(zenith) }, hHorizon: { value: new THREE.Color(horizon) }, hMist: { value: new THREE.Color(mist) },
    hSunDir: { value: new THREE.Vector3(...dir).normalize() }, hSun: { value: new THREE.Color(color) },
    hGlow: { value: glow }, hRays: { value: rays }, hTime: { value: 0 },
  };
  const glsl = /* glsl */`
uniform vec3 hZenith, hHorizon, hMist, hSunDir, hSun; uniform float hGlow, hRays, hTime;
float hazeRays(vec3 d) {
  vec3 a1 = normalize(cross(hSunDir, vec3(0.0, 1.0, 0.0))), a2 = cross(a1, hSunDir);
  float a = atan(dot(d, a2), dot(d, a1));                               // 绕太阳的角度；频率都是整数，±π 处接得上
  return pow(0.5 + 0.5 * sin(a * 23.0 + 2.0 * sin(a * 9.0 + hTime * 0.12)), 3.0) * (0.55 + 0.45 * sin(a * 5.0 - hTime * 0.07));
}
vec3 haze(vec3 d) {
  vec3 c = d.y > 0.0 ? mix(hHorizon, hZenith, pow(min(d.y * 1.6, 1.0), 0.7)) : mix(hHorizon, hMist, min(-d.y * 7.0, 1.0));
  float cs = max(dot(d, hSunDir), 0.0);
  c += hSun * hGlow * (0.12 * cs * cs + 0.3 * pow(cs, 5.0) + 0.7 * pow(cs, 60.0));
  return c + hSun * hRays * hazeRays(d) * pow(cs, 1.5) * smoothstep(0.35, -0.04, d.y);
}
`;
  return { uniforms, glsl };
}

/** 天空球：每个方向画 haze(视线方向)。半径要小于相机远裁面（app.js 为 200 米）；进环境场景时用小半径（PMREM 的远裁面是 100）。不写深度、最先画 */
export function sky(hz, { R = 180 } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: hz.uniforms, side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `${hz.glsl}\nvarying vec3 vW;\nvoid main() { gl_FragColor = vec4(haze(normalize(vW - cameraPosition)), 1.0); }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 24), m);
  mesh.renderOrder = -10; mesh.frustumCulled = false;
  return mesh;
}

/**
 * 水珠（球透镜）：不走 three 的 transmission（那要把不透明的场景再画一遍），而是把视线解析地穿过一个球——进去折一次、出来折一次——
 * 出射方向上取 haze：水珠里是倒过来的天和地。地平线以下换成地面色 below，正上方换成挂着它的东西 above（比如逆光的叶子）；
 * 出射方向对准太阳的那一小片就是聚焦的日光，一个很亮的点（在水珠背着太阳的一侧），交给辉光去晕开。表面按菲涅耳反射天色和太阳的高光。
 * 几何用单位球（可以不等比缩放成椭球：法线按椭球算，光路按同体积的球近似）
 */
export function dewMaterial(hz, { below, above, ior = 1.33 }) {
  return new THREE.ShaderMaterial({
    uniforms: { ...hz.uniforms, uBelow: { value: new THREE.Color(below) }, uAbove: { value: new THREE.Color(above) }, uIor: { value: ior } },
    vertexShader: /* glsl */`
varying vec3 vW, vN, vC;
void main() {
  vW = (modelMatrix * vec4(position, 1.0)).xyz; vC = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vN = normalize((vec4(normalMatrix * normal, 0.0) * viewMatrix).xyz);   // 视空间法线转回世界（缩放不等比时也对）
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`,
    fragmentShader: /* glsl */`
${hz.glsl}
uniform vec3 uBelow, uAbove; uniform float uIor;
varying vec3 vW, vN, vC;
float sunAt(vec3 d, float k) { return pow(max(dot(d, hSunDir), 0.0), k); }
// 水珠里的天：haze 的渐变，日晕收窄（水珠把太阳附近压成一个亮点，整片日晕会把下半颗冲成白的）
vec3 look(vec3 d) {
  vec3 c = d.y > 0.0 ? mix(hHorizon, hZenith, pow(min(d.y * 1.6, 1.0), 0.7)) : mix(hHorizon, hMist, min(-d.y * 7.0, 1.0));
  c += hSun * hGlow * 0.3 * sunAt(d, 12.0);
  return mix(mix(c, uBelow, smoothstep(-0.02, -0.25, d.y)), uAbove, smoothstep(0.55, 0.85, d.y));
}
void main() {
  vec3 V = normalize(vW - cameraPosition), N = normalize(vN);
  float F = 0.02 + 0.98 * pow(1.0 - max(dot(-V, N), 0.0), 5.0);
  vec3 T = refract(V, N, 1.0 / uIor), P = vW - T * 2.0 * dot(vW - vC, T), N2 = normalize(P - vC), T2 = refract(T, -N2, uIor);
  if (dot(T2, T2) < 0.5) T2 = reflect(T, -N2);                          // 出口全反射：在里面反射一次，按反射方向取
  vec3 R = reflect(V, N);
  vec3 c = (1.0 - F) * 0.85 * (look(T2) + hSun * 60.0 * sunAt(T2, 250.0)) + F * (look(R) + hSun * 60.0 * sunAt(R, 1500.0));   // 0.85：两个水面的反射损失和一点散射
  gl_FragColor = vec4(c, 1.0);
}`,
  });
}

// ── 闭式漂浮粒子 ──
/**
 * 实例化网格：第 i 个在 t 时刻的位置、自转只由 (seed, i, t) 决定（particles.js 的 drift）。box = [x0, y0, z0, x1, y1, z1]；
 * size = [最小, 最大] 缩放；spin = 自转圈数倍率（绕每个实例自己的随机轴，0 = 不转）。绕回边界时按 fade 淡出：
 * 'scale' 缩小（实心的叶子、花瓣），'alpha' 写进 instanceColor（雾团、光斑这类自己读透明度的材质，见 billboards）
 */
export function driftField({ geometry, material, count, seed, box, vel, sway = 0, swayHz = 0.3, size = [1, 1], spin = 1, fade = 'scale' }) {
  const mesh = new THREE.InstancedMesh(geometry, material, count), o = new THREE.Object3D(), c = new THREE.Color();
  mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const r = (i, j) => rand(seed ^ 0x5bd1e995, i * 4 + j);             // drift 用 (seed, i*8+0..7)；大小和自转轴换个种子取
  const axes = Array.from({ length: count }, (_, i) => new THREE.Vector3(r(i, 0) - 0.5, r(i, 1) - 0.5, r(i, 2) - 0.5).normalize());
  function update(t) {
    for (let i = 0; i < count; i++) {
      const [x, y, z, ph, f] = drift(seed, i, t, box, { vel, sway, swayHz }), s = size[0] + (size[1] - size[0]) * r(i, 3);
      o.position.set(x, y, z); o.quaternion.setFromAxisAngle(axes[i], ph * 2 * Math.PI * spin);
      o.scale.setScalar(fade === 'scale' ? s * f : s); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
      if (fade === 'alpha') mesh.setColorAt(i, c.setScalar(f));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  update(0);
  return { mesh, update };
}

/**
 * 雾团 / 光斑的纹理：2 × 2 图集，每格一团不同的软噪声，alpha 从中心向边缘淡到 0。只由 seed 决定（Node 里也能建）
 */
export function puffAtlas(seed, N = 128) {
  const px = new Uint8Array(4 * N * N * 4), S = 2 * N, lat = 8;
  const g = (q, i, j) => rand(seed + q * 7919, (j % lat) * lat + (i % lat));
  const vn = (q, x, y) => {                                              // 周期 lat 的值噪声
    const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
    return (g(q, i, j) * (1 - a) + g(q, i + 1, j) * a) * (1 - b) + (g(q, i, j + 1) * (1 - a) + g(q, i + 1, j + 1) * a) * b;
  };
  for (let q = 0; q < 4; q++) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = (i + 0.5) / N * 2 - 1, y = (j + 0.5) / N * 2 - 1, r = Math.hypot(x, y);
    let n = 0, a = 0.5, f = 2;
    for (let o = 0; o < 4; o++) { n += a * vn(q, (x + 1) * f + o * 1.7, (y + 1) * f + o * 3.1); a *= 0.5; f *= 2; }
    const edge = Math.max(0, 1 - r) ** 1.5, k = Math.min(1, Math.max(0, (n - 0.28) * 2.2)) * edge;
    const X = (q % 2) * N + i, Y = Math.floor(q / 2) * N + j, p = 4 * (Y * S + X);
    px[p] = px[p + 1] = px[p + 2] = 255; px[p + 3] = Math.round(255 * k);
  }
  const tex = new THREE.DataTexture(px, S, S);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}

/**
 * 朝向相机的面片材质（配 driftField 的 fade: 'alpha'，几何用 PlaneGeometry(1, 1)）：每个实例取 puffAtlas 的一格（按实例号），
 * 透明度 = 纹理 alpha × instanceColor.r × opacity。颜色 = haze(视线方向) × tint，再加一点朝太阳的前向散射——雾团在天空前几乎看不见，挡在山前就把山冲淡。
 * aspect = 宽 / 高：谷里的雾是一层一层横着的，圆的雾团下半截被前景挡掉后，在横向的地形前面会读成一根根竖条
 */
export function billboards(hz, { map, tint = [1, 1, 1], opacity = 1, forward = 0, aspect = 1 }) {
  return new THREE.ShaderMaterial({
    uniforms: { ...hz.uniforms, map: { value: map }, tint: { value: new THREE.Vector3(...tint) }, opacity: { value: opacity }, forward: { value: forward }, aspect: { value: aspect } },
    transparent: true, depthWrite: false,
    vertexShader: /* glsl */`
uniform float aspect; varying vec2 vUv; varying vec3 vW; varying float vA;
void main() {
  vec3 c = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float s = length((modelMatrix * instanceMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vW = c + (right * position.x + up * position.y / aspect) * s;
  vUv = (uv + vec2(float(gl_InstanceID % 2), float((gl_InstanceID / 2) % 2))) * 0.5;
  #ifdef USE_INSTANCING_COLOR
    vA = instanceColor.r;
  #else
    vA = 1.0;
  #endif
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`,
    fragmentShader: /* glsl */`
${hz.glsl}
uniform sampler2D map; uniform vec3 tint; uniform float opacity, forward;
varying vec2 vUv; varying vec3 vW; varying float vA;
void main() {
  vec3 d = normalize(vW - cameraPosition);
  vec3 c = haze(d) * tint + hSun * forward * pow(max(dot(d, hSunDir), 0.0), 4.0);
  gl_FragColor = vec4(c, texture2D(map, vUv).a * vA * opacity);
}`,
  });
}
```

Make these exact replacements in `03-perfume/js/worlds/studio.js`:

1. Replace:

```js
import * as THREE from 'three';
import { envMap } from './common.js';
```

   with:

```js
import * as THREE from 'three';
```

2. Replace:

```js
  const { scene, renderer } = ctx;
  scene.environment = envMap(renderer, { base: '#17181b' }, (add, B) => {
    add(8, 5, [0, 5, 12], B('#fff6ec', 1.4));                 // 正面大柔光
    add(3, 8, [-10, 3, 6], B('#dfe8ff', 2.2));                // 左前冷光
    add(3, 8, [10, 3, 6], B('#ffe8d2', 1.8));                 // 右前暖光
  });
  scene.environmentIntensity = 1;
```

   with:

```js
  const { scene } = ctx;
```

3. Replace:

```js
  // 特写的替身：一块卵石顶着一颗水珠
  const macro = new THREE.Group(); macro.position.set(0.5, 0, -0.3);
```

   with:

```js
  // 特写的替身：一块卵石顶着一颗水珠。放在瓶子左边 3 米：不进任何瓶子镜头，也在主光的阴影盒外面
  const M = [-3, 0, 0], macro = new THREE.Group(); macro.position.set(...M);
```

4. Replace:

```js
  return {
    post: { exposure: 1.0, aperture: 0, vignette: 0.25, grain: 0.025 },
```

   with:

```js
  return {
    env: {
      base: '#17181b',
      fill(add, B) {
        add(8, 5, [0, 5, 12], B('#fff6ec', 1.4));             // 正面大柔光
        add(3, 8, [-10, 3, 6], B('#dfe8ff', 2.2));            // 左前冷光
        add(3, 8, [10, 3, 6], B('#ffe8d2', 1.8));             // 右前暖光
      },
    },
    post: { exposure: 1.0, aperture: 0, vignette: 0.25, grain: 0.025 },
```

5. Replace:

```js
      camera: s => ({ type: 'free', position: [0.5 + 0.05 * Math.sin(0.3 + 0.2 * s.lt), 0.045, -0.3 + 0.09], target: [0.5, 0.02, -0.3], fov: 24, fovAxis: 'short' }),
```

   with:

```js
      camera: s => ({ type: 'free', position: [M[0] + 0.05 * Math.sin(0.3 + 0.2 * s.lt), 0.045, M[2] + 0.09], target: [M[0], 0.02, M[2]], fov: 24, fovAxis: 'short' }),
```

Make these exact replacements in `03-perfume/film.js`:

1. Replace:

```js
import { createGlass } from './js/glass.js';
```

   with:

```js
import { createGlass } from './js/glass.js';
import { envMap } from './js/worlds/common.js';
```

2. Replace:

```js
const WORLDS = { studio, whitetea: studio, osmanthus: studio, seasalt: studio, rose: studio };
```

   with:

```js
export const WORLDS = { studio, whitetea: () => import('./js/worlds/whitetea.js'), osmanthus: studio, seasalt: studio, rose: studio };
```

3. Replace:

```js
    ctx.world = await (await WORLDS[id]()).build(ctx);
```

   with:

```js
    ctx.world = await (await WORLDS[id]()).build(ctx);
    ctx.scene.environment = envMap(ctx.renderer, ctx.world.env);     // 世界只描述反射环境，这里才生成（世界的测试在 Node 里建，没有渲染器）
```

Run: `node --test 03-perfume/test/worlds.test.mjs`
Expected: the five `studio:` tests pass; the five `whitetea:` tests fail with `ERR_MODULE_NOT_FOUND` for `js/worlds/whitetea.js`.

- [ ] **Step 5: The white-tea world**

`03-perfume/js/worlds/whitetea.js`:

```js
// whitetea.js — 白茶 · 晨雾茶山：瓶子立在茶园石埂的湿石板上；身后层层茶山（茶垄顺着等高线）隐进谷里的晨雾，
// 低太阳在左后方，光束斜穿雾气。特写是「一芽二叶」：带白毫的芽头、两片锯齿嫩叶，叶尖挂着一颗渐渐长大的露珠
import * as THREE from 'three';
import { haze, sky, dewMaterial, driftField, puffAtlas, billboards, NOISE } from './common.js';
import { rand } from '../../../factory/engine/rng.js';
import { lerp, ss, clamp, easeInOut } from '../../../factory/engine/ease.js';

const SUN = new THREE.Vector3(-0.82, 0.42, -0.38).normalize();          // 指向太阳：左后方（偏离镜头方向约 65°），仰角约 25°
const SKY = { zenith: '#9fbcc6', horizon: '#f3ecdb', mist: '#e6ebe3', sun: { dir: SUN.toArray(), color: '#ffe0b0', glow: 1.2, rays: 0.45 } };

// ── 一维值噪声（地形轮廓用；只由 seed 决定）──
const n1 = (seed, x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(rand(seed, i), rand(seed, i + 1), u); };
const fbm1 = (seed, x, oct = 4) => { let s = 0, a = 0.5; for (let o = 0; o < oct; o++) { s += a * n1(seed + o * 101, x); x *= 2.03; a *= 0.5; } return s / (1 - 0.5 ** oct); };

// ── 远景：五层山，每层是绕原点的一段弧（半径 R 米，方位 ±135°：特写朝 −x 看、16:9 的画面左缘也还在山前）。最近一层在眼睛下方，看得清茶垄顺着山嘴冲沟弯；往后一层比一层高、一层比一层淡 ──
// crest 山脊高度（相对石板，米）、amp 起伏、slope 迎面坡度、rows 茶垄（等高线的高差，米；0 = 只有林子）、tree 山顶林带宽度、
// fade 山脊以下多深开始隐进雾里、多深完全看不见（米）
const RIDGES = [
  { R: 60, crest: -1.5, amp: 2.2, slope: 0.5, rows: 0.75, tree: 2.5, fade: [12, 20], seed: 11 },
  { R: 95, crest: 2, amp: 3.5, slope: 0.5, rows: 0.85, tree: 3.5, fade: [2.5, 8], seed: 23 },
  { R: 132, crest: 8, amp: 5, slope: 0.5, rows: 0.95, tree: 8, fade: [2, 7], seed: 37 },
  { R: 158, crest: 16, amp: 8, slope: 0.5, rows: 0, tree: 40, fade: [2, 7], seed: 41 },
  { R: 176, crest: 28, amp: 12, slope: 0.55, rows: 0, tree: 60, fade: [3, 10], seed: 53 },
];
const SPAN = (135 * Math.PI) / 180;

/** 一层山的高度场：沿弧 x（米）、离山脊 s（米，> 0 在山脊前面）→ 高度。前坡上叠山嘴和冲沟（侧光下一明一暗，等高线跟着弯），山脊上叠树冠起伏 */
function ridgeHeight(L, x, s) {
  const crest = L.crest + L.amp * (2 * fbm1(L.seed, x / (L.R * 0.5)) - 1) + 0.2 * L.amp * (2 * fbm1(L.seed + 7, x / (L.R * 0.1)) - 1);
  const gully = (2 * fbm1(L.seed + 3, x / (L.R * 0.12)) - 1) * 0.15 * Math.max(s, 0) ** 2 / (Math.max(s, 0) + 6);   // 坡度变化不超过 0.15：不会翻折
  const front = s > 0 ? -L.slope * s - gully : 1.1 * s;
  const canopy = Math.max(0, 1 - Math.max(s, 0) / L.tree) * (0.6 + 0.4 * n1(L.seed + 5, x / 1.7)) * (0.9 + 0.08 * L.R ** 0.5);
  return { h: crest + front + canopy, crest };
}
function ridgeGeometry(L) {
  const NX = 520, NS = 48, sBack = -Math.min(8, L.R * 0.08), sFront = Math.min((L.fade[1] + 4) / L.slope, L.R * 0.7);
  const pos = [], aS = [], idx = [];
  for (let j = 0; j <= NS; j++) {
    const k = j / NS, s = k < 0.2 ? lerp(sBack, 0, k / 0.2) : sFront * ((k - 0.2) / 0.8) ** 1.5;   // 山脊附近密一些：剪影在这里
    for (let i = 0; i <= NX; i++) {
      const th = lerp(-SPAN, SPAN, i / NX), x = th * L.R, r = L.R - s, { h } = ridgeHeight(L, x, s);
      pos.push(Math.sin(th) * r, h, -Math.cos(th) * r); aS.push(s);
    }
  }
  for (let j = 0; j < NS; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + NX + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }     // 逆时针朝上：法线朝天、朝镜头
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const RIDGE_VERT = /* glsl */`
attribute float aS; varying vec3 vW, vN; varying float vS;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vS = aS; gl_Position = projectionMatrix * viewMatrix * w; }`;
function ridgeMaterial(hz, L, i) {
  return new THREE.ShaderMaterial({
    uniforms: { ...hz.uniforms, uRow: { value: L.rows }, uTree: { value: L.tree }, uSlope: { value: L.slope }, uFade: { value: new THREE.Vector2(...L.fade) }, uSeed: { value: i * 17.3 } },
    vertexShader: RIDGE_VERT,
    fragmentShader: /* glsl */`
${hz.glsl}
${NOISE}
uniform float uRow, uTree, uSlope, uSeed; uniform vec2 uFade;
varying vec3 vW, vN; varying float vS;
void main() {
  vec3 N = normalize(vN), D = normalize(vW - cameraPosition);
  float along = atan(vW.x, -vW.z) * length(vW.xz), wob = fbm(vec2(along * 0.04, vW.y * 0.05) + uSeed);
  // 茶垄：一垄一垄圆顶的茶蓬（垄前沿背光偏暗、垄顶受光，顶上嫩芽偏黄绿），垄间一道窄的暗沟；沿垄断成一丛一丛，叶子有细碎的明暗。
  // 远到一个像素放不下一垄时淡成平均色
  vec3 bush = vec3(0.075, 0.17, 0.03), tip = vec3(0.17, 0.30, 0.05), gap = vec3(0.02, 0.028, 0.015), tree = vec3(0.028, 0.055, 0.038);
  vec3 alb = mix(bush, tip, 0.25) * 0.8; float top = 0.5;
  if (uRow > 0.0) {
    float q = vW.y / uRow + 0.45 * wob, f = fract(q), row = floor(q), aa = clamp(fwidth(q) * 1.5 - 0.15, 0.0, 1.0);
    float c = vnoise(vec2(along * 0.8, row * 3.1 + uSeed));                                      // 沿垄一丛一丛：蓬顶高低不齐，偶尔断开
    float b = smoothstep(0.0, 0.1 + 0.12 * c, f) * smoothstep(1.0, 0.94, f) * mix(0.5, 1.0, smoothstep(0.08, 0.3, c));
    float leaf = mix(0.75 + 0.5 * vnoise(vec2(along * 7.0, vW.y * 9.0)), 1.0, clamp(fwidth(along) * 3.0, 0.0, 1.0));
    vec3 cb = mix(bush, tip, smoothstep(0.55, 0.95, f) * vnoise(vec2(along * 1.3, row * 2.1))) * leaf * mix(0.6, 1.0, smoothstep(0.1, 0.75, f));
    alb = mix(mix(gap, cb, b), alb, aa); top = mix(smoothstep(0.3, 0.95, f) * b, 0.5, aa);
  }
  float treeK = smoothstep(uTree + 1.5, uTree - 1.5, vS + 3.0 * (vnoise(vW.xz * 0.12 + uSeed) - 0.5) * min(uTree, 6.0));
  alb = mix(alb, tree * (0.7 + 0.6 * vnoise(vW.xz * 0.5)), treeK); top = mix(top, 0.6, treeK);
  // 光：太阳在左后方侧照（包裹一点，植被没有死黑的背光面），天光从上面来；垄顶逆着太阳的叶子透一点光
  float nl = max((dot(N, hSunDir) + 0.3) / 1.3, 0.0) * (0.6 + 0.6 * top);
  vec3 amb = mix(hMist, hZenith, 0.5 + 0.5 * N.y) * (0.75 + 0.35 * top);
  vec3 col = alb * (hSun * 2.2 * nl + amb) + tip * hSun * pow(max(dot(D, hSunDir), 0.0), 4.0) * top * top * 0.8;
  // 雾：30 米以外随距离变浓；每层山从山脊往下越深越隐进雾里（雾顶慢慢起伏、飘动），一层和后一层就隔开了
  float below = max(vS, 0.0) * uSlope + (fbm(vec2(along * 0.025 + hTime * 0.04, uSeed)) - 0.5) * (uFade.y - uFade.x) * 0.8;
  float f = 1.0 - exp(-max(length(vW - cameraPosition) - 30.0, 0.0) * 0.008) * (1.0 - smoothstep(uFade.x, uFade.y, below));
  gl_FragColor = vec4(mix(col, haze(D), f), 1.0);
}`,
  });
}

// ── 茶叶 ──
/**
 * 一片茶叶：沿 +x 从叶柄（x = 0）到叶尖（x = len），宽约 len / 2.6；椭圆形，最宽处在 45%，叶基楔形、叶尖渐尖。
 * serr：边缘锯齿深（占叶宽的比例，齿尖朝叶尖）；fold：沿主脉 V 形对折（两半抬起的斜率）；curl：叶尖下垂 = curl × len（负数 = 翘起）。
 * uv.x 沿叶长、uv.y 横跨叶宽（主脉在 0.5）。正面朝 +y
 */
export function teaLeafGeometry(len, { segs = [96, 8], fold = 0.25, curl = 0.15, serr = 0.05, teeth = 22 } = {}) {
  const [NU, NV] = segs, W = len / 2.6, pos = [], uv = [], idx = [];
  for (let i = 0; i <= NU; i++) {
    const u = i / NU, t = (u * teeth) % 1, tooth = (t < 0.8 ? t / 0.8 : (1 - t) / 0.2) * ss(0.08, 0.25, u) * ss(1, 0.9, u);
    const half = (W / 2) * Math.sin(Math.PI * u ** 0.868) ** 0.8;
    for (let j = 0; j <= NV; j++) {
      const v = (j / NV) * 2 - 1, z = v * (half + serr * W * tooth * Math.abs(v) ** 8);
      pos.push(u * len, fold * Math.abs(z) - curl * len * u * u, z); uv.push(u, (v + 1) / 2);
    }
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * 叶脉贴图（uv 同 teaLeafGeometry）：主脉 + 每边 9 条侧脉（从主脉斜着伸向叶尖，近叶缘时弯上去；两边错开半格），叶面有一点斑驳。
 * 叶面 ≈ 0.8、叶脉 1：当 map 用叶脉浅一点，当 bumpMap（负的 bumpScale）叶脉凹下去、叶面一格一格鼓起来
 */
function veinTexture(W = 512, H = 128) {
  const px = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = (i + 0.5) / W, v = (j + 0.5) / H, d = Math.abs(v - 0.5) * 2;                  // d：0 主脉 → 1 叶缘
    const mid = Math.exp(-(((v - 0.5) / (0.014 * (1.3 - u))) ** 2));
    const q = (u - 0.3 * d ** 0.8) * 9 + (v > 0.5 ? 0.5 : 0), f = q - Math.round(q);
    const lat = Math.exp(-((f / (0.08 * (1.2 - 0.6 * d))) ** 2)) * ss(0.04, 0.12, u) * ss(1, 0.85, d) * ss(0.97, 0.88, u);
    const val = 0.8 + 0.035 * (n2(9, u * 40, v * 12) - 0.5) + 0.2 * Math.max(mid, 0.6 * lat), p = 4 * (j * W + i);
    px[p] = px[p + 1] = px[p + 2] = Math.round(255 * clamp(val)); px[p + 3] = 255;
  }
  const tex = new THREE.DataTexture(px, W, H);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}

// ── 石板：茶园石埂的压顶石，顶面平（y = 0，焦散落在这里），边缘崩口；后沿长着一线青苔，石面上散着水珠和几片落叶 ──
const SLAB = { x0: -1.6, x1: 1.6, zb: -0.36, zf: 1.3 };
const slabEdge = (k, sd) => 0.012 * (2 * fbm1(sd, k * 14) - 1) + 0.006 * (2 * n1(sd + 1, k * 60) - 1);
const backEdge = x => SLAB.zb + slabEdge((x - SLAB.x0) / (SLAB.x1 - SLAB.x0), 71);      // 后沿在 x 处的 z
/** 二维值噪声（摆放水珠、青苔用）*/
const n2 = (seed, x, y) => {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v), g = (p, q) => rand(seed, (p + 4096) * 8192 + q + 4096);
  return lerp(lerp(g(i, j), g(i + 1, j), a), lerp(g(i, j + 1), g(i + 1, j + 1), a), b);
};

/**
 * 石板的材质：颜色和粗糙度按世界坐标在 color / roughness 上下缓慢变化（±15% 以内）——一块块更湿更暗更亮的水渍，加上顺着石纹的细条。
 * 平均值就是 color / roughness 本身：焦散读的正是这两个值（glass.js），落在石板上的透光和周围没有色差
 */
function slateMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: '#6d7571', roughness: 0.26, metalness: 0 });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSlate;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvSlate = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vSlate;\n${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  vec2 sp = vSlate.xz;
  float wet = smoothstep(0.38, 0.62, fbm(sp * 2.6 + 7.3));                                   // 水渍：更暗、更光
  float grain = vnoise(vec2(sp.x * 3.0, sp.y * 55.0)) - 0.5;                                // 顺着 x 的石纹
  float fine = mix(vnoise(sp * 420.0) - 0.5, 0.0, clamp(fwidth(sp.x) * 300.0, 0.0, 1.0));   // 细砂粒，远了淡掉
  diffuseColor.rgb *= 1.0 + 0.12 * (0.45 - wet) + 0.08 * grain + 0.1 * fine + 0.06 * (fbm(sp * 0.9) - 0.47);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor *= 1.0 + 0.3 * (0.45 - wet) + 0.08 * grain;`);
  };
  m.customProgramCacheKey = () => 'whitetea-slate';
  return m;
}
function slab() {
  const sh = new THREE.Shape(), P = [], { x0, x1, zb, zf } = SLAB, n = 90;
  for (let i = 0; i <= n; i++) { const k = i / n; P.push([lerp(x0, x1, k), zb + slabEdge(k, 71)]); }      // 后沿：离瓶子 36 厘米
  for (let i = 1; i <= 8; i++) P.push([x1 + slabEdge(i / 8, 73), lerp(zb, zf, i / 8)]);
  for (let i = 1; i <= 8; i++) P.push([lerp(x1, x0, i / 8), zf]);
  for (let i = 1; i < 8; i++) P.push([x0 + slabEdge(i / 8, 79), lerp(zf, zb, i / 8)]);
  P.forEach(([x, z], i) => (i ? sh.lineTo(x, -z) : sh.moveTo(x, -z)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.09, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2); g.translate(0, -0.09, 0);                    // 形状平面 → 水平面，挤出方向朝上，顶面在 y = 0
  const m = new THREE.Mesh(g, slateMaterial());
  m.receiveShadow = true;
  return m;
}
/** 石面上的水珠：扁的半球，底色和石头差不多（水是透明的），很光——边上掠射的天光勾出一圈亮边，顶上一个太阳的高光。成团分布，避开瓶底（半径 7 厘米） */
function droplets() {
  const N = 300, geo = new THREE.SphereGeometry(1, 14, 6, 0, 2 * Math.PI, 0, Math.PI / 2), o = new THREE.Object3D();
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#66706c', roughness: 0.02, metalness: 0, envMapIntensity: 2.2 }), N);
  for (let i = 0, k = 0; i < N; k++) {
    const r = j => rand(131, k * 4 + j), x = lerp(-1.0, 1.0, r(0)), z = lerp(SLAB.zb + 0.03, 0.7, r(1));
    if (Math.hypot(x, z) < 0.07 || r(2) > ss(0.4, 0.7, n2(137, x * 5, z * 5))) continue;
    const R = lerp(0.0005, 0.0026, r(3) ** 2);
    o.position.set(x, 0, z); o.scale.set(R, 0.6 * R, R); o.updateMatrix(); mesh.setMatrixAt(i++, o.matrix);
  }
  mesh.receiveShadow = true;
  return mesh;
}
/** 后沿的青苔：一万多个压扁的小团挤成一道矮垫子，贴着崩口长，时断时续；暗橄榄绿，天鹅绒一样的掠射高光（sheen） */
function moss() {
  const N = 12000, geo = new THREE.IcosahedronGeometry(1, 0), o = new THREE.Object3D(), c = new THREE.Color();
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 1, sheen: 1, sheenColor: '#9aab5c', sheenRoughness: 0.5 }), N);
  const tones = ['#3d4f2a', '#4d5f30', '#2e3d22', '#5a6a36'].map(h => new THREE.Color(h));
  for (let i = 0, k = 0; i < N; k++) {
    const r = j => rand(151, k * 6 + j), x = lerp(SLAB.x0 + 0.02, SLAB.x1 - 0.02, r(0)), d = r(3) ** 1.6;
    if (r(1) > ss(0.2, 0.5, n2(157, x * 5, 0)) * (1 - 0.7 * d)) continue;
    const S = lerp(0.0008, 0.0028, r(2) ** 2) * (1.2 - 0.5 * d), z = backEdge(x) + lerp(-0.003, 0.035, d);
    o.position.set(x, -0.1 * S, z); o.rotation.set(r(4), r(4) * 6.283, 0); o.scale.set(1.2 * S, 0.8 * S, S); o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix); mesh.setColorAt(i, c.copy(tones[Math.floor(r(5) * 4)])); i++;
  }
  mesh.receiveShadow = true;
  return mesh;
}
/** 石面上的几片落叶：老叶，平躺，叶尖微微翘起。两片在瓶子后面（每种比例都看得见，那里没有字），一片在右前方 */
function fallenLeaves() {
  const veins = veinTexture(), g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#4a6128').multiplyScalar(1.25), map: veins, bumpMap: veins, bumpScale: -1.5, roughness: 0.5, side: THREE.DoubleSide });
  for (const [x, z, yaw, len] of [[-0.13, -0.2, 0.5, 0.048], [0.17, -0.28, -2.4, 0.042], [0.42, 0.18, -0.9, 0.05]]) {
    const m = new THREE.Mesh(teaLeafGeometry(len, { segs: [88, 6], fold: 0.12, curl: -0.04, serr: 0.05 }), mat);
    m.position.set(x, 0.0006, z); m.rotation.y = yaw; m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  }
  return g;
}
/** 石板下面的石埂：几块粗糙的石头往下垒，出了画面就隐进雾里 */
function wall() {
  const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: '#4a524d', roughness: 0.7, flatShading: true });
  for (let i = 0; i < 14; i++) {
    const r = j => rand(97, i * 5 + j), geo = new THREE.IcosahedronGeometry(0.22 + 0.12 * r(0), 1), p = geo.attributes.position;
    for (let v = 0; v < p.count; v++) p.setXYZ(v, p.getX(v) * (1.2 + 0.4 * r(1)), p.getY(v) * 0.7, p.getZ(v) * 0.9);
    geo.computeVertexNormals();
    const s = new THREE.Mesh(geo, mat); s.position.set(-1.7 + i * 0.26 + 0.05 * r(2), -0.3 - 0.12 * r(3) - (i % 2) * 0.15, -0.52 - 0.1 * r(4));
    g.add(s);
  }
  return g;
}

// ── 特写：一芽二叶 ──
// 放在石板左端外 1.4 米（离开所有瓶子镜头的视野和主光的阴影盒）。在嫩枝自己的坐标里设计：x 向右、y 向上、+z 朝相机；
// 整枝绕 y 转 90°，相机就朝 −x 看，太阳在右后上方——逆光，嫩叶透光，芽头的白毫亮成一圈
const MACRO_AT = [-3, 0.12, 0];
const KEY = { color: '#ffe2b8', intensity: 3.2 };

/**
 * 嫩叶材质：蜡质叶面（清漆）+ 叶脉贴图。逆光时叶片透光：lights 之后给 directDiffuse 加上从叶子背面穿过来的太阳光（黄绿，叶脉处更亮）。
 * normal 在双面材质里总朝着观者，-normal 和太阳同向就是逆光
 */
function leafMaterial(veins, { color, trans = 0.5, transColor = '#b8dc4c', roughness = 0.42, clearcoat = 0.5 }) {
  const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color).multiplyScalar(1.25), map: veins, bumpMap: veins, bumpScale: -1.5, roughness, clearcoat, clearcoatRoughness: 0.3, side: THREE.DoubleSide });
  const U = { uTrans: { value: new THREE.Color(transColor).multiplyScalar(trans) }, uSun: { value: new THREE.Color(KEY.color).multiplyScalar(KEY.intensity) }, uSunDir: { value: SUN } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uTrans, uSun, uSunDir;')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
  float vein = clamp((texture2D(map, vMapUv).r - 0.8) * 5.0, 0.0, 1.0);
  vec3 through = uTrans * uSun * smoothstep(-0.1, 1.0, dot(-normal, normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz))) * (0.75 + 0.5 * vein);
  #ifdef USE_INSTANCING_COLOR
    through *= vColor;                                                   // 茶蓬里的叶子：越深越暗，透过来的光也少
  #endif
  reflectedLight.directDiffuse += through;`);
  };
  m.customProgramCacheKey = () => 'whitetea-leaf';
  return m;
}
/** 叶片挂到节上：叶柄在 at，先绕主脉扭 roll，再抬起 pitch，再转到方位 yaw（0 = 向右，π = 向左，−π/2 = 朝相机）*/
function attach(geo, mat, at, yaw, pitch, roll) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...at); m.rotation.set(roll, yaw, pitch, 'YZX');
  return m;
}
/** 芽头：纺锤形（最宽在下 40%，尖头），淡黄绿，丝绒光（sheen）；外面一层贴伏、朝芽尖的白毫（一像素宽的线），在逆光里亮成一圈 */
function bud(len, R) {
  const P = [], prof = v => R * Math.sin(Math.PI * v ** 0.75) ** 0.8;
  for (let i = 0; i <= 32; i++) { const v = i / 32; P.push(new THREE.Vector2(prof(v) + 1e-5, v * len)); }
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.LatheGeometry(P, 32), new THREE.MeshPhysicalMaterial({ color: '#d4e0b0', roughness: 0.6, sheen: 1, sheenColor: '#ffffff', sheenRoughness: 0.3 })));
  const pos = [];
  for (let i = 0; i < 2500; i++) {
    const r = j => rand(171, i * 4 + j), v = lerp(0.03, 0.98, r(0)), a = r(1) * 2 * Math.PI, rr = prof(v), L = lerp(0.0003, 0.0009, r(2));
    const d = new THREE.Vector3(Math.cos(a) * lerp(0.15, 0.45, r(3)), 1, Math.sin(a) * lerp(0.15, 0.45, r(3))).normalize();
    const p = new THREE.Vector3(Math.cos(a) * rr, v * len, Math.sin(a) * rr);
    pos.push(...p.toArray(), ...p.addScaledVector(d, L).toArray());
  }
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.add(new THREE.LineSegments(hg, new THREE.LineBasicMaterial({ color: new THREE.Color('#f6f8ec').multiplyScalar(1.4), transparent: true, opacity: 0.35 })));
  return g;
}
/**
 * 一芽二叶 + 叶尖一颗露珠 + 后面虚掉的茶蓬。返回 root（整枝）、frame（取景盒，世界坐标；深度以露珠为中心，对焦 'target' 就落在露珠上）、
 * dir(yaw, pitch)（相机方向，按嫩枝坐标的方位 / 仰角，度）、drop(R)（按半径摆露珠：顶端始终挂在叶尖上）
 */
function macroSprig(hz) {
  const root = new THREE.Group();
  const veins = veinTexture(), young = leafMaterial(veins, { color: '#7fa83a' }), old = leafMaterial(veins, { color: '#34521f', trans: 0.3, roughness: 0.8, clearcoat: 0 });
  const N2 = [0.009, -0.02, 0], N1 = [0.006, 0.008, 0], B = [0.004, 0.026, 0];
  const stem = new THREE.CatmullRomCurve3([[0.016, -0.17, -0.03], [0.012, -0.08, -0.01], N2, N1, B].map(p => new THREE.Vector3(...p)));
  const tube = new THREE.TubeGeometry(stem, 96, 1, 10), tp = tube.attributes.position, c = new THREE.Vector3();
  for (let i = 0; i < tp.count; i++) {                                    // 下粗上细：1.3 → 0.7 毫米
    const k = Math.floor(i / 11) / 96; stem.getPointAt(k, c);
    tp.setXYZ(i, ...new THREE.Vector3().fromBufferAttribute(tp, i).sub(c).multiplyScalar(lerp(0.0013, 0.0007, k)).add(c).toArray());
  }
  tube.computeVertexNormals();
  root.add(new THREE.Mesh(tube, new THREE.MeshPhysicalMaterial({ color: '#8aa651', roughness: 0.5, sheen: 0.6, sheenColor: '#e8f0d0' })));
  const b = bud(0.024, 0.0034); b.position.set(...B); b.rotation.z = 0.12;
  const leaf1 = attach(teaLeafGeometry(0.036, { segs: [200, 12], fold: 0.55, curl: 0.08, serr: 0.04 }), young, N1, 0.6, 0.75, -0.4);
  const leaf2 = attach(teaLeafGeometry(0.052, { segs: [220, 12], fold: 0.18, curl: 0.6, serr: 0.05 }), young, N2, Math.PI + 0.35, 0.25, 0.5);
  root.add(b, leaf1, leaf2);
  // 后面的茶蓬：几百片老叶铺成一个缓缓的圆顶（在露珠后面 6–70 厘米、下面），全在焦外。越往蓬里越暗（没有阴影：嫩枝在主光的阴影盒外面）
  const N = 480, bush = new THREE.InstancedMesh(teaLeafGeometry(0.05, { segs: [32, 4], fold: 0.25, curl: 0.2, serr: 0 }), old, N), o = new THREE.Object3D(), tone = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const r = j => rand(181, i * 8 + j), x = lerp(-0.6, 0.6, r(1)), z = lerp(-0.7, -0.06, r(3)), deep = r(2) ** 2;
    o.position.set(x, -0.07 - 0.12 * (x / 0.6) ** 2 - 0.03 * z - 0.1 * deep, z);
    o.rotation.set(lerp(-0.8, 0.8, r(6)), r(4) * 2 * Math.PI, lerp(-0.2, 0.5, r(5)), 'YZX');
    o.scale.setScalar(lerp(0.8, 1.2, r(0))); o.updateMatrix();
    bush.setMatrixAt(i, o.matrix); bush.setColorAt(i, tone.setScalar(lerp(1, 0.25, deep)));
  }
  root.add(bush);
  const dew = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), dewMaterial(hz, { below: '#4a6a2c', above: '#b9d65c' }));
  root.add(dew);
  root.updateMatrixWorld(true);                                          // 先在嫩枝坐标里量叶尖和取景盒，再整枝搬过去
  const tip = new THREE.Vector3(0.052, -0.6 * 0.052, 0).applyMatrix4(leaf2.matrix);                     // 叶尖（嫩枝坐标）
  const drop = R => { dew.scale.set(R, 1.2 * R, R); dew.position.set(tip.x, tip.y - R, tip.z); dew.updateMatrix(); };   // 顶端在叶尖上方 0.2R：叶尖扎进水珠一点
  drop(0.003);
  const frame = new THREE.Box3();
  for (const o of [b, leaf1, leaf2, dew]) frame.expandByObject(o, true);
  frame.min.z = frame.max.z = tip.z;                                    // 压成露珠所在的一个平面：按这个面取景，盒心就在露珠的深度上
  root.position.set(...MACRO_AT); root.rotation.y = Math.PI / 2; root.updateMatrixWorld(true);
  frame.applyMatrix4(root.matrixWorld);
  const dir = (yaw, pitch) => { const Y = yaw * Math.PI / 180, P = pitch * Math.PI / 180; return new THREE.Vector3(Math.sin(Y) * Math.cos(P), Math.sin(P), Math.cos(Y) * Math.cos(P)).applyQuaternion(root.quaternion).toArray(); };
  return { root, frame, dir, drop };
}

export async function build(ctx) {
  const { scene } = ctx, hz = haze(SKY);
  scene.background = new THREE.Color(SKY.horizon);
  scene.add(sky(hz));
  for (const [i, L] of RIDGES.entries()) { const m = new THREE.Mesh(ridgeGeometry(L), ridgeMaterial(hz, L, i)); m.frustumCulled = false; scene.add(m); }
  scene.add(slab(), wall(), droplets(), moss(), fallenLeaves());

  const key = new THREE.DirectionalLight(KEY.color, KEY.intensity);
  key.position.copy(SUN).multiplyScalar(1.5); key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -0.5, right: 0.5, top: 0.5, bottom: -0.5, near: 0.1, far: 3 });
  key.shadow.camera.updateProjectionMatrix(); key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 5;
  scene.add(key, key.target);

  // 谷里的雾（向右慢慢飘）：扁长的雾团贴在石板后沿下面的谷里，在最近一层山的坡脚铺一道亮带，往上散成几缕
  const mist = driftField({ geometry: new THREE.PlaneGeometry(1, 1), material: billboards(hz, { map: puffAtlas(5), tint: [1.04, 1.04, 1.02], opacity: 0.45, forward: 0.3, aspect: 3 }),
    count: 28, seed: 101, box: [-26, -6, -34, 26, -3, -14], vel: [0.35, 0, 0], sway: 0.3, swayHz: 0.05, size: [8, 18], spin: 0, fade: 'alpha' });
  const leafGeo = teaLeafGeometry(0.03, { segs: [12, 4], fold: 0.3, curl: 0.1, serr: 0 }); leafGeo.translate(-0.015, 0, 0);   // 绕叶子中间翻转
  const leaves = driftField({ geometry: leafGeo, material: new THREE.MeshStandardMaterial({ color: '#7d9a4f', roughness: 0.5, side: THREE.DoubleSide }),
    count: 12, seed: 202, box: [-1.5, -0.3, -3, 1.5, 0.8, -0.6], vel: [0.12, -0.05, 0], sway: 0.08, swayHz: 0.25, size: [0.8, 1.25], spin: 0.6 });
  scene.add(mist.mesh, leaves.mesh);

  const sprig = macroSprig(hz); scene.add(sprig.root);

  return {
    env: { base: null, fill: (add, B, es) => es.add(sky(hz, { R: 15 })) },
    post: { exposure: 1.1, aperture: 0.25, bloom: { strength: 0.3, threshold: 0.9 }, saturation: 1, lift: [0.01, 0.012, 0.01], vignette: 0.18, grain: 0.025 },
    macro: {
      root: sprig.root,
      // 慢慢绕到露珠左边、同时推近：露珠里的高光跟着走
      camera: s => ({ type: 'fit', box: sprig.frame, dir: sprig.dir(lerp(-8, 4, easeInOut(s.u)), -6), fov: 28, scale: lerp(1, 1.12, easeInOut(s.u)) }),
      post: { aperture: 1.2, maxBlur: 0.03, exposure: 1, gamma: [0.88, 0.88, 0.88], saturation: 1.2 },
    },
    update(ctx, s) {
      hz.uniforms.hTime.value = s.t;
      mist.update(s.t); leaves.update(s.t);
      if (s.name === 'macro') sprig.drop(lerp(0.0016, 0.003, ss(0, 1, s.u)));   // 露珠慢慢长大
    },
    reset() { sprig.drop(0.003); },
  };
}
```

Notes:
- Nothing calls `Math.random`. Placement uses `rand(seed, i)`, the slate's variation is noise of world position, and the drift is closed-form.
- The ridge meshes and the sky have `frustumCulled = false`. They are large, always partly in view, and the far-plane test bounds them.
- `leafMaterial` adds the translucency after `lights_fragment_end`, and scales it by `vColor` on the bush, so deep leaves pass less light.

Make these exact replacements in `03-perfume/layouts.js`:

1. Replace:

```js
    macro: { align: 'center', zones: { hook: [0.08, 0.64, 0.74, 0.1] } },
```

   with:

```js
    macro: { anchor: [0.52, 0.33], size: 0.5, maxW: 0.9, align: 'center', zones: { hook: [0.08, 0.64, 0.74, 0.1] } },
```

2. Replace:

```js
    macro: { align: 'center', zones: { hook: [0.08, 0.8, 0.84, 0.1] } },
```

   with:

```js
    macro: { anchor: [0.5, 0.4], size: 0.66, maxW: 0.9, align: 'center', zones: { hook: [0.08, 0.8, 0.84, 0.1] } },
```

3. Replace:

```js
    macro: { align: 'left', zones: { hook: [0.06, 0.74, 0.54, 0.12] } },
```

   with:

```js
    macro: { anchor: [0.68, 0.42], size: 0.72, maxW: 0.6, align: 'left', zones: { hook: [0.06, 0.74, 0.42, 0.12] } },
```

- [ ] **Step 6: Run the tests to make sure they pass**

Run: `node --test factory/test/post.test.mjs 03-perfume/test/worlds.test.mjs`
Expected: PASS (12 tests).

- [ ] **Step 7: Look at it**

```bash
node factory/snap.mjs 03-perfume --t 1.0,3.6,6.4,9.3,11.2,13.5 --ar 9x16 --out /tmp/t13
node factory/snap.mjs 03-perfume --t 1.0,3.6,6.4,9.3,11.2,13.5 --ar 1x1 --out /tmp/t13
node factory/snap.mjs 03-perfume --t 1.0,3.6,6.4,9.3,11.2,13.5 --ar 16x9 --out /tmp/t13
node factory/snap.mjs 03-perfume --t 1.0,11.2 --world studio --ar 9x16 --out /tmp/t13/studio
```

Expected timings: 124–131 ms per 9x16 frame, 73–79 ms at 1x1 and 120–133 ms at 16x9. The first frame of a run also compiles the shaders; the macro takes about 185 ms at 9x16.
- **t = 1.0 (macro):**
  - a pale-green bud with a rim of white hairs, and two backlit young leaves showing their veins, against a misty sky;
  - the dew hangs from the tip of the lower-left leaf. It holds the sky upside down, with a small bright sparkle on the side away from the sun;
  - the bush below is soft green bokeh, and 一滴晨露，一片茶山 reads over it;
  - at 16:9 the sprig is on the right, the hook on the left, and hazy ridges show behind.
- **t = 3.6 (drop):**
  - the bottle stands on grey-green slate, with fine droplets and a line of moss along the back edge;
  - behind it are terraced tea rows following the hillside, then paler ridges fading into mist;
  - the shadow falls to the right. The drop itself is still Task 8's skeleton; Task 14 adds it.
- **t = 6.4 (hero):** 白茶 and 闻境 · WENJING below the bottle. Through the glass and the pale-green liquid, the tea rows and the mist show refracted.
- **t = 9.3 (anatomy):**
  - the leaders and 50 ml · 浓香水 are unchanged;
  - a thin caustic streak with faint colour fringes lies at the base. That is physical, like the studio's;
  - at 16:9, sun rays slant through the mist on the left.
- **t = 11.2 (spray):** the same garden from the spray camera. The cap still sits on; Task 14 lifts it and adds the mist.
- **t = 13.5 (end):** 闻境 WENJING, 闻香 · 入境 and the 点击购买 button, with the bottle above.
- **No frame** shows the sprig outside the macro, or the edge of a ridge or of the sky.
- **Studio (`/tmp/t13/studio`):** the spray frame is as in Task 12. The close-up is the same pebble and drop, now sharp on the drop, with no shadow under the pebble.

- [ ] **Step 8: Re-run the pre-flight**

The manifest's 白茶 variants now render the tea garden, so check determinism and speed again.

Run: `node factory/check.mjs 03-perfume; echo "exit $?"`
Expected: every line `ok`, including `determinism  14 frames identical forward and backward`, then `speed  ~111 ms/frame at 1080×1920 …`, `all checks passed` and `exit 0`.

- [ ] **Step 9: Run all tests and commit**

Run: `npm test`
Expected: PASS, 92 tests.

```bash
git add 03-perfume/js/worlds/whitetea.js 03-perfume/js/worlds/common.js 03-perfume/js/worlds/studio.js 03-perfume/film.js 03-perfume/layouts.js factory/engine/post.js factory/engine/app.js 03-perfume/test/worlds.test.mjs factory/test/post.test.mjs
git commit -m "Add the white-tea world: misty tea garden and the dew macro; worlds describe env, focus on target, world rules tested

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 14: The drop, the ripple and the spray — `drop.js`, `spray.js`

This task fills in the two effect shots.
- **Drop.** In the macro's last 0.25 s the dew lets go of the leaf tip. The film hard-cuts into the bottle, where a drop of the same kind is already falling along the same curve. It lands at `EV.land` on the liquid, off-centre at `RIPPLE.at`, and the rings spread from there.
  - The camera starts on a 12 × 16 × 12 mm box that follows the drop down. It holds on the ripple, then pulls back to the whole bottle by 2.0 s.
  - The grade (exposure, aperture, blur cap, gamma, saturation) blends from the macro's to the world's as the box opens, so both sides of the cut match.
- **Spray.** The cap floats 3 cm up off the pump, and at `EV.spray` the pump goes down.
  - 220 mist puffs and 80 glints leave the nozzle along −x. Air drag stops them within 2–8 cm; then they drift off, sink, swell and fade, all gone by 1.9 s.
  - The cap seats again by `EV.seat`.

Both effects are closed-form: every frame is a function of the shot's local time, like everything else.

**What the glass pass needs for them** (`glass.js`):
- **A fourth pass, `LAYER.over` (3).** The mist is translucent and in front of the bottle. On layer 0 the glass would sample it as part of what lies *behind* the bottle and refract it. So it is drawn after the glass, straight over it.
- **Depth through clear glass (`gl_FragDepth`).** Depth of field reads the depth buffer. With the glass writing its own depth, focusing on the drop inside the bottle would blur the drop, because the front wall is 1.7 cm nearer.
  - Where you look through clear glass into the cavity, the glass now writes the depth of what the green-channel ray sees, never nearer than the glass itself.
  - The frosted logo keeps its own depth.
- **Rays that leave the frame (`behind`, `tLow`).** In the close-up the camera looks steeply down at the liquid. Rays refracted by the surface leave the back wall low down and project far below the frame. Before, they read the clamped screen edge, which drew streaks of edge pixels under the drop.
  - Now the world pass is also shrunk to a quarter-size copy with mips.
  - A ray that lands off-screen walks from its pixel towards that point, stops at the frame border, and takes the coarse mip (`OPTICS.lowLod` = 3.5) there. That colour varies smoothly from pixel to pixel.
  - On-screen samples blend into the same mip over the last 6% of the height, so nothing jumps when a ray crosses the border.
- **Things in front of the entry point (`around`).** Seen from just above the liquid, the drop itself is in the depth buffer *in front of* the point where the view ray enters. Reading it would paint a ghost drop into the refraction.
  - When the fetched point is nearer than the entry (`gZin`), the shader averages the samples on two rings around it that are behind the entry instead.
- **Fresnel at the exits (`fresnelOut`, `through`).** An exit used to be either fully refracted or totally reflected, which drew a sharp curved seam on the back wall at the critical angle.
  - Each exit now splits by the unpolarised Fresnel reflectance. Near the critical angle the two shares trade off smoothly.
  - At ordinary angles the reflected share is a few percent and is dropped once less than 10% of the light is left inside.
- **The caustic measures the ripple from `RIPPLE.at`,** as `liquidSurface` now does.

**The bottle** (`bottle.js`):
- `RIPPLE.at = [−0.012, 0.006]`, left of and in front of the dip tube and pump chamber on the axis.
- The pump chamber is shortened to 9.5 mm and hides entirely in the thick shoulder, 0.25 mm above the cavity top. The close-up then shows only the clear dip tube.

**Worlds return `haze`.** The drop is the world's dew material, and the spray is the world's billboards, both coloured by `world.haze`.
- The studio gets a dim grey haze whose sun is its key light.
- The tea garden returns the haze it already had.
- `worlds.test.mjs` checks every world returns a `haze()`.

**The macro hands the drop over.** `sprig.drop(R, tau)` stretches the hanging dew from 1.2 to 1.4 over the 0.3 s before release. Once released (`tau` > 0 s since release), it falls by `fallen(tau)` and wobbles by `stretch(tau)`, the same functions the bottle's drop uses.
- The release is at `lt = dur − DROP.pre`, so at the cut both drops are 0.25 s into the same fall.
- The slow-motion gravity `FALL_G` ≈ 0.029 m/s² is chosen so that `DROP.pre + EV.land` seconds after release, the drop's bottom touches the resting liquid.

**Timeline events.** `EV` gains `lift: 0.05`, `spray: 0.4` and `seat: 1.45`, all in the spray shot's local seconds. Task 15's score puts the cap clink, the spray hiss and the seat click on them.

**Files:**
- Create: `03-perfume/js/drop.js`, `03-perfume/js/spray.js`
- Modify: `03-perfume/js/glass.js`, `03-perfume/js/bottle.js`, `03-perfume/js/shots.js`, `03-perfume/meta.js`, `03-perfume/film.js`, `03-perfume/js/worlds/studio.js`, `03-perfume/js/worlds/whitetea.js`
- Test: `03-perfume/test/effects.test.mjs`, `03-perfume/test/glass.test.mjs`, `03-perfume/test/worlds.test.mjs`

**Interfaces:**
- Consumes:
  - Task 1: `rand(seed, i)`; `lerp`, `ss`, `clamp`, `easeInOut`. Task 2: `parseVariant`. Task 3: `buildCut`. Task 7: `EV`, `DIMS`, `BOX`, `CUTS`.
  - Task 8: `mergePost`, `film.reset` (called before every shot evaluation), the `evalShot` path in `app.js`, `ctx.postDefaults`.
  - Task 11: `buildBottle`, `GLASS`, `SHAPE`, `RIPPLE`, `bottle.pose({ capLift, press, ripple })`, `bottle.anchor('nozzle')`.
  - Task 12: `createGlass`, `LAYER`, `OPTICS`, `bottle.posed`.
  - Task 13: `haze`, `dewMaterial`, `billboards`, `puffAtlas` (common.js); `world.macro.post`; whitetea's `sprig.drop`.
- Produces:
  - `meta.js`: `EV = { land: 0.75, streak: 1.5, lift: 0.05, spray: 0.4, seat: 1.45 }`.
  - `bottle.js`: `RIPPLE.at = [x, z]`, the landing point; the ripple's `r` is measured from it.
  - `drop.js`:
    - `DROP = { R, pre, merge }`, `FALL_G`, `fallen(tau)`, `stretch(tau)`;
    - `dropAt(lt) → { p: [x, y, z], r, sy }` in bottle coordinates, with `r = 0` once merged;
    - `createDrop(ctx, sku) → { mesh, pose(lt?) }`. `pose()` with no argument hides it.
  - `spray.js`:
    - `SPRAY = { puff, glint }`;
    - `particle(kind, i, lt, at) → { p, size, alpha }`;
    - `createSpray(ctx, bottle) → { root, at, update(lt?) }`, where `at` is the pressed nozzle. `update()` with no argument hides it.
  - `glass.js`: `LAYER.over = 3`; `OPTICS.lowLod`. `render(target)` draws layer 0, then a quarter-size mipmapped copy, then layers 1, 2 and 3.
  - `film.js`: `ctx.subjects = { bottle, drop, spray, glass }`; `reset` also hides the drop and the spray.
  - World module contract, additions:
    - `build` returns `haze`, a `haze()` from common.js;
    - the macro's dew grows at the ingredient's tip and releases in the macro's last `DROP.pre` seconds, falling by `fallen(tau)` and stretched by `stretch(tau)`, where `tau = lt − (dur − DROP.pre)`. Tasks 17–19 do the same with their own dew.

- [ ] **Step 1: Write the failing tests**

The effects test builds the film's subjects the way `film.setup` does, in the studio, and evaluates the real shots through `film.reset` and `film.shots`, the same path `app.js` takes. It pins:
- the drop's fall, landing, clearances and visibility;
- the ripple's centre;
- the spray's timing, direction and clearance from the glass and the floating cap;
- the two shots' boxes, poses and grade;
- `reset`.

`03-perfume/test/effects.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import film, { WORLDS } from '../film.js';
import { SKUS } from '../skus.js';
import { CUTS, BOX, DIMS, EV } from '../meta.js';
import { buildBottle, GLASS, RIPPLE, SHAPE } from '../js/bottle.js';
import { LAYER } from '../js/glass.js';
import { DROP, dropAt, createDrop } from '../js/drop.js';
import { SPRAY, particle, createSpray } from '../js/spray.js';
import { parseVariant } from '../../factory/engine/variant.js';
import { buildCut } from '../../factory/engine/timeline.js';
import { mergePost } from '../../factory/engine/post.js';
import { clamp } from '../../factory/engine/ease.js';

// 水滴、涟漪、喷雾，和用到它们的 drop / spray 镜头。世界用影棚：这些效果不看世界，只按它的 haze 着色
const lts = (a, b, n = 60) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const REST = { explode: 0, capLift: 0, press: 0, ripple: 0 };

/** 和 film.setup 一样搭起来（不带 logo、不建玻璃） */
async function setup() {
  const scene = new THREE.Scene(), variant = parseVariant(film, { sku: 'whitetea' });
  const ctx = { scene, renderer: null, variant, params: new URLSearchParams(), W: 1080, H: 1920 };
  ctx.world = await (await WORLDS.studio()).build(ctx);
  ctx.postDefaults = ctx.world.post ?? {};
  const bottle = buildBottle(ctx, SKUS.whitetea), drop = createDrop(ctx, SKUS.whitetea), spray = createSpray(ctx, bottle);
  bottle.root.add(drop.mesh);
  scene.add(bottle.root, spray.root);
  ctx.subjects = { bottle, drop, spray };
  return ctx;
}
/** 按 app.js 的 evalShot 求 15 秒剪辑里的一个镜头：复位 → 镜头函数 */
const E = buildCut(CUTS[15]).entries;
function shot(ctx, name, lt) {
  const e = E.find(x => x.shot === name), s = { name, lt, dur: e.dur, u: clamp(lt / e.dur), from: e.from, t: e.start + lt - e.from, row: {} };
  film.reset(ctx);
  const o = film.shots[name](ctx, s);
  ctx.scene.updateMatrixWorld(true);
  return o;
}

test('the drop falls straight down at RIPPLE.at, never rising, touches the resting liquid at EV.land and is gone once merged', () => {
  const d = dropAt(EV.land);
  near(d.p[1] - d.r, GLASS.fill);
  let y = Infinity;
  for (const lt of lts(-DROP.pre, 2.5)) {
    const { p, r } = dropAt(lt);
    assert.deepEqual([p[0], p[2]], RIPPLE.at);
    assert.ok(p[1] <= y, `rises at lt=${lt}`);
    y = p[1];
    if (lt <= EV.land) assert.equal(r, DROP.R);
    if (lt >= EV.land + DROP.merge) assert.equal(r, 0);
  }
});

test('the falling drop stays inside the cavity and clear of the pump chamber and the dip tube', () => {
  const b = buildBottle({}, SKUS.whitetea), pump = [];
  b.root.updateMatrixWorld(true);
  b.parts.pump.traverse(o => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) pump.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld));
  });
  for (const lt of lts(0, EV.land)) {                                    // 松开的那一下（lt < 0）在特写里，瓶里从切过来开始才有
    const { p: [x, y, z], r, sy } = dropAt(lt), w = r / Math.sqrt(sy), h = r * sy, C = SHAPE.cavity;
    for (const [nx, nz, d] of C.planes) assert.ok(nx * x + nz * z + w <= d, `lt=${lt}: the drop pokes through a wall`);
    assert.ok(y + h <= C.y[1] && y - h >= C.y[0], `lt=${lt}: the drop pokes through the shoulder or the base`);
    const hit = pump.find(v => ((v.x - x) / w) ** 2 + ((v.y - y) / h) ** 2 + ((v.z - z) / w) ** 2 <= 1);
    assert.ok(!hit, `lt=${lt}: the drop touches the pump at [${hit?.toArray().map(v => v.toFixed(4))}]`);
  }
});

test('the drop mesh follows dropAt on layer 0 from the cut to the landing, and hides after merging and in other shots', async () => {
  const ctx = await setup(), { drop } = ctx.subjects;
  assert.equal(drop.mesh.layers.mask, 1);                               // 第 0 层：透过玻璃和液体都看得到
  for (const lt of lts(0, 2.5, 50)) {
    shot(ctx, 'drop', lt);
    const d = dropAt(lt);
    if (lt <= EV.land) {
      assert.ok(drop.mesh.visible, `hidden at lt=${lt}`);
      assert.deepEqual(drop.mesh.position.toArray(), d.p);
      near(drop.mesh.scale.y, d.r * d.sy);
    }
    if (lt >= EV.land + DROP.merge + 1e-9) assert.ok(!drop.mesh.visible, `shown at lt=${lt}`);
  }
  for (const name of ['macro', 'hero', 'anatomy', 'spray', 'end']) { shot(ctx, name, 0.5); assert.ok(!drop.mesh.visible, `shown in ${name}`); }
});

test('the ripple spreads from RIPPLE.at, where the drop lands; the liquid ahead of the wavefront is still', () => {
  const b = buildBottle({}, SKUS.whitetea), P = b.parts.liquid.children[0].geometry.attributes.position, rest = P.array.slice(), age = 0.1;
  b.pose({ ripple: age });
  let moved = 0;
  for (let i = 0; i < P.count; i++) {
    const r = Math.hypot(P.getX(i) - RIPPLE.at[0], P.getZ(i) - RIPPLE.at[1]), dy = P.getY(i) - rest[3 * i + 1];
    if (r > RIPPLE.c * age + 1e-4) assert.equal(dy, 0, `vertex ${i}, ${(r * 1000).toFixed(1)} mm out, moved before the wave reached it`);
    else if (dy !== 0) moved++;
  }
  assert.ok(moved > 20, `only ${moved} vertices inside the wavefront moved`);
});

test('spray particles: closed form, nothing before EV.spray, all gone by 1.9 s, and the mist drifts off along −x', () => {
  const at = [-0.0072, 0.125, 0];
  for (const kind of Object.keys(SPRAY)) for (let i = 0; i < SPRAY[kind].n; i++) {
    for (const lt of lts(0, EV.spray, 8)) assert.equal(particle(kind, i, lt, at).alpha, 0, `${kind} ${i} out at lt=${lt}`);
    assert.equal(particle(kind, i, 1.9, at).alpha, 0, `${kind} ${i} still showing at lt=1.9`);
    assert.deepEqual(particle(kind, i, 0.9, at), particle(kind, i, 0.9, at));
  }
  const meanX = lt => {
    const xs = [...Array(SPRAY.puff.n).keys()].map(i => particle('puff', i, lt, at)).filter(q => q.alpha > 0).map(q => q.p[0] - at[0]);
    return xs.reduce((a, x) => a + x, 0) / xs.length;
  };
  const m = [0.6, 0.9, 1.2, 1.5].map(meanX);
  assert.ok(m[0] < 0 && m.every((x, i) => i === 0 || x < m[i - 1]), `mean x offsets ${m.map(x => x.toFixed(3))}`);
});

test('the spray meshes sit on LAYER.over, match particle() from the pressed nozzle, and give the same frame however the shot is visited', async () => {
  const ctx = await setup(), { spray } = ctx.subjects, M = new THREE.Matrix4(), v = new THREE.Vector3();
  const meshes = spray.root.children, frame = () => meshes.flatMap(m => [...m.instanceMatrix.array, ...m.instanceColor.array]);
  assert.deepEqual(meshes.map(m => [m.name, m.layers.mask, m.count]), Object.keys(SPRAY).map(k => [`spray-${k}`, 1 << LAYER.over, SPRAY[k].n]));
  shot(ctx, 'spray', 0.9);
  const a = frame();
  for (const [k, m] of Object.keys(SPRAY).map((k, j) => [k, meshes[j]])) for (const i of [0, 7, SPRAY[k].n - 1]) {
    const q = particle(k, i, 0.9, spray.at);
    m.getMatrixAt(i, M);
    v.setFromMatrixPosition(M).toArray().forEach((x, j) => near(x, q.p[j], 1e-7));
    near(m.instanceColor.getX(i), q.alpha, 1e-7);
  }
  shot(ctx, 'spray', 1.4); shot(ctx, 'spray', 0.2);
  shot(ctx, 'spray', 0.9);
  assert.deepEqual(frame(), a);
});

test('spray shot: the cap floats up 3 cm before the press, the pump is down while the mist leaves, both are back by EV.seat', async () => {
  const ctx = await setup(), { bottle } = ctx.subjects;
  shot(ctx, 'spray', 0);
  assert.deepEqual(bottle.posed, REST);
  shot(ctx, 'spray', EV.spray);
  assert.equal(bottle.posed.capLift, 0.03);                             // 喷之前瓶盖已经让开
  shot(ctx, 'spray', 0.6);
  assert.deepEqual(bottle.posed, { ...REST, capLift: 0.03, press: 1 });
  for (const lt of [EV.seat, 1.7, 2.0]) { shot(ctx, 'spray', lt); assert.deepEqual(bottle.posed, REST, `lt=${lt}`); }
});

test('spray shot: every visible particle is outside the glass body and the floating cap', async () => {
  const ctx = await setup(), { bottle, spray } = ctx.subjects, M = new THREE.Matrix4(), v = new THREE.Vector3(), cap = new THREE.Box3();
  const glass = new THREE.Box3(new THREE.Vector3(-DIMS.w / 2, 0, -DIMS.d / 2), new THREE.Vector3(DIMS.w / 2, DIMS.body, DIMS.d / 2));
  for (const lt of lts(EV.spray, 2.0, 32)) {
    shot(ctx, 'spray', lt);
    cap.setFromObject(bottle.parts.cap, true);
    for (const m of spray.root.children) for (let i = 0; i < m.count; i++) {
      if (!(m.instanceColor.getX(i) > 0)) continue;
      m.getMatrixAt(i, M);
      v.setFromMatrixPosition(M);
      assert.ok(!glass.containsPoint(v) && !cap.containsPoint(v), `lt=${lt.toFixed(3)}: ${m.name} ${i} at [${v.toArray().map(x => x.toFixed(4))}] is inside the ${glass.containsPoint(v) ? 'glass' : 'cap'}`);
    }
  }
});

test('drop shot: a close box that holds the drop, opening to the whole bottle by 2 s; the grade goes from the macro to the world', async () => {
  const ctx = await setup(), all = new THREE.Box3(...BOX.bottle.map(p => new THREE.Vector3(...p))), size = new THREE.Vector3();
  const A = mergePost(ctx.postDefaults, ctx.world.macro.post), B = mergePost(ctx.postDefaults);
  let h = 0;
  for (const lt of lts(0, 2.5, 50)) {
    const o = shot(ctx, 'drop', lt), box = o.camera.box;
    box.getSize(size);
    assert.ok(all.clone().expandByScalar(1e-9).containsBox(box), `lt=${lt}: the box leaves the bottle`);
    assert.ok(size.y >= h - 1e-12, `lt=${lt}: the box shrinks`);
    h = size.y;
    if (lt <= 0.85) assert.ok(size.y < 0.02, `lt=${lt}: the close box is ${size.y} m tall`);
    if (lt <= EV.land) {
      const { p: [x, y, z], r, sy } = dropAt(lt), w = r / Math.sqrt(sy);
      assert.ok(box.containsBox(new THREE.Box3(new THREE.Vector3(x - w, y - r * sy, z - w), new THREE.Vector3(x + w, y + r * sy, z + w))), `lt=${lt}: the drop leaves the box`);
    }
    if (lt >= 2.0) { box.min.toArray().forEach((x, i) => near(x, BOX.bottle[0][i])); box.max.toArray().forEach((x, i) => near(x, BOX.bottle[1][i])); }
    const want = lt === 0 ? A : lt >= 2.0 ? B : null;
    if (want) for (const [k, x] of Object.entries(o.post)) [x].flat().forEach((c, i) => near(c, [want[k]].flat()[i]));
  }
});

test('reset hides the drop and the mist and rests the bottle, whatever shot ran before', async () => {
  const ctx = await setup(), { bottle, drop, spray } = ctx.subjects;
  for (const [name, lt] of [['drop', 0.5], ['spray', 0.9], ['anatomy', 1.0]]) {
    shot(ctx, name, lt);
    film.reset(ctx);
    assert.ok(!drop.mesh.visible && !spray.root.visible, `after ${name}`);
    assert.deepEqual(bottle.posed, REST);
  }
});
```

Make these exact replacements in `03-perfume/test/glass.test.mjs`:

1. Replace:

```js
// 假的渲染器：只记下每一遍画的时候相机开了哪些层、背景、autoClear、阴影是否更新
function fakeRenderer({ failOn = -1 } = {}) {
  const r = { autoClear: true, shadowMap: { autoUpdate: true }, calls: [], setRenderTarget() {}, clear() {} };
  r.render = (scene, camera) => {
    if (r.calls.length === failOn) throw new Error('lost context');
    r.calls.push({ mask: camera.layers.mask, bg: scene.background, autoClear: r.autoClear, shadows: r.shadowMap.autoUpdate });
```

   with:

```js
// 假的渲染器：只记下每一遍画到哪个目标、用哪台相机、相机开了哪些层、背景、autoClear、阴影是否更新
function fakeRenderer({ failOn = -1 } = {}) {
  const r = { autoClear: true, shadowMap: { autoUpdate: true }, calls: [], target: null, setRenderTarget(t) { r.target = t; }, clear() {} };
  r.render = (scene, camera) => {
    if (r.calls.length === failOn) throw new Error('lost context');
    r.calls.push({ target: r.target, camera, mask: camera.layers.mask, bg: scene.background, autoClear: r.autoClear, shadows: r.shadowMap.autoUpdate });
```

2. Replace:

```js
    assert.ok(!sh.fragmentShader.includes('#include <transmission_fragment>') && sh.fragmentShader.includes('uniform mat4 projectionMatrix;'));
```

   with:

```js
    assert.ok(!sh.fragmentShader.includes('#include <transmission_fragment>') && sh.fragmentShader.includes('uniform mat4 projectionMatrix;'));
    assert.match(sh.fragmentShader, /#ifdef GLASS_PASS[^#]*gl_FragDepth = [^#]*#else/);   // 只有玻璃改写深度：透过它看到的东西按自己的远近虚化
```

3. Replace:

```js
test('render: world, liquid, glass into one target, then the renderer is put back — even when a pass throws', () => {
```

   with:

```js
test('render: world, a mipmapped quarter-size copy of it, liquid, glass, then what floats in front; the renderer is put back — even when a pass throws', () => {
```

4. Replace:

```js
  assert.deepEqual(renderer.calls.map(c => c.mask), [1 << 0, 1 << LAYER.liquid, 1 << LAYER.glass]);
  assert.equal(renderer.calls[0].bg, bg);
  for (const c of renderer.calls.slice(1)) assert.ok(c.bg === null && !c.autoClear && !c.shadows);   // 后两遍叠在第一遍上，不清屏、不重画阴影
  assert.ok(scene.background === bg && renderer.autoClear && renderer.shadowMap.autoUpdate && camera.layers.mask === mask);
  assert.ok(w.key.layers.isEnabled(LAYER.liquid) && w.key.layers.isEnabled(LAYER.glass));
```

   with:

```js
  const passes = renderer.calls.filter(c => c.camera === camera), [copy] = renderer.calls.filter(c => c.camera !== camera);
  assert.deepEqual(passes.map(c => c.mask), [1 << 0, 1 << LAYER.liquid, 1 << LAYER.glass, 1 << LAYER.over]);
  assert.ok(passes.every(c => c.target === target) && renderer.calls.length === 5 && renderer.calls[1] === copy);
  assert.equal(passes[0].bg, bg);
  for (const c of passes.slice(1)) assert.ok(c.bg === null && !c.autoClear && !c.shadows);   // 后三遍叠在第一遍上，不清屏、不重画阴影
  assert.ok(scene.background === bg && renderer.autoClear && renderer.shadowMap.autoUpdate && camera.layers.mask === mask);
  assert.ok([LAYER.liquid, LAYER.glass, LAYER.over].every(l => w.key.layers.isEnabled(l)));
```

5. Replace:

```js
  assert.equal(sh.uniforms.uBlur.value, OPTICS.frostBlur * target.height);

  for (const failOn of [0, 1]) {
```

   with:

```js
  assert.equal(sh.uniforms.uBlur.value, OPTICS.frostBlur * target.height);
  // 光路出了画面时取的糊开的世界：第 0 层画完后缩成四分之一的那份，带 mip
  const low = copy.target, T = sh.uniforms.tLow.value;
  assert.ok(T === low.texture && T.generateMipmaps && T.minFilter === THREE.LinearMipmapLinearFilter);
  assert.deepEqual([low.width, low.height], [270, 480]);

  for (const failOn of [0, 1, 3]) {
```

Make these exact replacements in `03-perfume/test/worlds.test.mjs`:

1. Replace:

```js
import { buildBottle } from '../js/bottle.js';
```

   with:

```js
import { buildBottle } from '../js/bottle.js';
import { createDrop } from '../js/drop.js';
import { createSpray } from '../js/spray.js';
```

2. Replace:

```js
/** 和 film.setup 一样搭起来（瓶子不带 logo、不换玻璃：镜头只用到它的 pose 和 anchor） */
```

   with:

```js
/** 和 film.setup 一样搭起来（瓶子不带 logo、不换玻璃：镜头只用到它的 pose 和 anchor；水滴和喷雾按世界的 haze 着色） */
```

3. Replace:

```js
    const bottle = buildBottle(ctx, SKUS[variant.sku]);
    scene.add(bottle.root);
    ctx.subjects = { bottle };
```

   with:

```js
    const sku = SKUS[variant.sku], bottle = buildBottle(ctx, sku), drop = createDrop(ctx, sku), spray = createSpray(ctx, bottle);
    bottle.root.add(drop.mesh);
    scene.add(bottle.root, spray.root);
    ctx.subjects = { bottle, drop, spray };
```

4. Replace:

```js
  test(`${id}: builds without a renderer and returns env, post and a macro set in the scene`, async () => {
```

   with:

```js
  test(`${id}: builds without a renderer and returns haze, env, post and a macro set in the scene`, async () => {
```

5. Replace:

```js
    assert.equal(typeof (world.post ?? {}), 'object');
```

   with:

```js
    assert.equal(typeof (world.post ?? {}), 'object');
    assert.ok(world.haze?.uniforms?.hSunDir?.value?.isVector3 && world.haze.glsl?.includes('vec3 haze('), 'world.haze is not a haze()');   // 水滴、喷雾按它着色
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `node --test 03-perfume/test/effects.test.mjs 03-perfume/test/glass.test.mjs 03-perfume/test/worlds.test.mjs`
Expected: FAIL.
- `effects.test.mjs` and `worlds.test.mjs` fail with `ERR_MODULE_NOT_FOUND` for `js/drop.js`.
- In `glass.test.mjs`, 2 of 5 fail:
  - the shader test: `The input did not match the regular expression /#ifdef GLASS_PASS[^#]*gl_FragDepth = [^#]*#else/`;
  - the render test: `Expected values to be strictly deep-equal`, actual `[1, 2, 4]` against expected `[1, 2, 4, 1]`. There is no fourth pass yet, and `LAYER.over` is undefined, so `1 << LAYER.over` is 1.

- [ ] **Step 3: The landing point, the hidden chamber and the spray events**

Make these exact replacements in `03-perfume/meta.js`:

1. Replace:

```js
// 镜头内部的事件（镜头本地秒）：水滴落进液面、光带扫过峰值
export const EV = { land: 0.75, streak: 1.5 };
```

   with:

```js
// 镜头内部的事件（镜头本地秒）：水滴落进液面（drop）、光带扫过峰值（hero）、瓶盖浮起、按下喷头、瓶盖落回（spray）
export const EV = { land: 0.75, streak: 1.5, lift: 0.05, spray: 0.4, seat: 1.45 };
```

Make these exact replacements in `03-perfume/js/bottle.js`:

1. Replace:

```js
// 落滴涟漪：振幅、波数、波前速度（米/秒）、时间衰减（1/秒）、距离衰减尺度（米）
export const RIPPLE = { amp: 0.0008, k: (2 * Math.PI) / 0.0075, c: 0.055, decay: 1.6, r0: 0.004 };
```

   with:

```js
// 落滴涟漪：振幅、波数、波前速度（米/秒）、时间衰减（1/秒）、距离衰减尺度（米）、落点 [x, z]（偏在左前：躲开正中的吸管和泵室）
export const RIPPLE = { amp: 0.0008, k: (2 * Math.PI) / 0.0075, c: 0.055, decay: 1.6, r0: 0.004, at: [-0.012, 0.006] };
```

2. Replace:

```js
/** 液面：中心点 + RINGS 圈（每圈是轮廓按比例缩小，越靠壁越密：弯月面只有一两毫米宽）；r 离中心的距离，dw 离壁的距离 */
function liquidSurface(B) {
  const n = B.length, pos = [0, 0, 0], r = [0], dw = [Infinity], idx = [];
  for (let j = 1; j <= RINGS; j++) {
    const s = 1 - (1 - j / RINGS) ** 2;
    for (const [x, z] of B) { pos.push(x * s, 0, z * s); r.push(Math.hypot(x, z) * s); dw.push(Math.hypot(x, z) * (1 - s)); }
```

   with:

```js
/** 液面：中心点 + RINGS 圈（每圈是轮廓按比例缩小，越靠壁越密：弯月面只有一两毫米宽）；r 离落点 RIPPLE.at 的距离，dw 离壁的距离 */
function liquidSurface(B) {
  const n = B.length, [ax, az] = RIPPLE.at, pos = [0, 0, 0], r = [Math.hypot(ax, az)], dw = [Infinity], idx = [];
  for (let j = 1; j <= RINGS; j++) {
    const s = 1 - (1 - j / RINGS) ** 2;
    for (const [x, z] of B) { pos.push(x * s, 0, z * s); r.push(Math.hypot(x * s - ax, z * s - az)); dw.push(Math.hypot(x, z) * (1 - s)); }
```

3. Replace:

```js
  const chamber = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0038, 0.015, 32), plastic);
  chamber.position.y = -0.0085;
  const drop = DIMS.body - GLASS.base - 0.0025;                     // 吸管底离内腔底 2.5 毫米
  const path = new THREE.CatmullRomCurve3([[0, -0.016, 0], [0, -drop * 0.55, 0.0006], [0.0035, -drop, 0.0022]].map(p => new THREE.Vector3(...p)));
```

   with:

```js
  // 泵室整个藏在厚肩里（底面在内腔顶上 0.25 毫米）：瓶里的特写只看得到透明吸管
  const chamber = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0038, 0.0095, 32), plastic);
  chamber.position.y = -0.006;
  const drop = DIMS.body - GLASS.base - 0.0025;                     // 吸管底离内腔底 2.5 毫米
  const path = new THREE.CatmullRomCurve3([[0, -0.0105, 0], [0, -drop * 0.55, 0.0006], [0.0035, -drop, 0.0022]].map(p => new THREE.Vector3(...p)));
```

Run: `node --test 03-perfume/test/bottle.test.mjs`
Expected: PASS (7 tests). The liquid still stays inside the cavity with the ripple off-centre.

- [ ] **Step 4: The glass pass**

Make these exact replacements in `03-perfume/js/glass.js`:

1. Replace:

```js
// 折射：场景目标里先画世界（第 0 层），再画液体（第 1 层，采样世界），最后画玻璃（第 2 层，采样世界 + 液体）。
//   每一遍 three 都把多重采样缓冲解析到 target.texture / depthTexture（见 post.js），下一遍的着色器就采样它当作“背后的画面”。
//   光在玻璃和液体里走的路程按 bottle.js 导出的 SHAPE（凸八角棱柱）解析求出：比尔–朗伯吸收、一次全反射、玻璃三色色散、磨砂 logo 模糊。
```

   with:

```js
// 折射：场景目标里先画世界（第 0 层），再画液体（第 1 层，采样世界），再画玻璃（第 2 层，采样世界 + 液体），最后画挡在瓶子前面的半透明东西（第 3 层，比如喷雾）。
//   每一遍 three 都把多重采样缓冲解析到 target.texture / depthTexture（见 post.js），下一遍的着色器就采样它当作“背后的画面”。
//   第 0 层画完还缩成四分之一存一份带 mip 的：光路出了画面（没有颜色可取）时取它糊开的颜色。
//   光在玻璃和液体里走的路程按 bottle.js 导出的 SHAPE（凸八角棱柱）解析求出：比尔–朗伯吸收、出口按菲涅耳分成透出去和反射回来的两份
//   （临界角上画面不断开）、玻璃三色色散、磨砂 logo 模糊。
//   透过光面玻璃看进内腔的地方，玻璃写的是背后那样东西的深度：景深按看到的东西虚化（对焦在瓶里的水滴上时，前壁不会把它糊掉）。
```

2. Replace:

```js
import * as THREE from 'three';
```

   with:

```js
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
```

3. Replace:

```js
// 焦散网格分辨率、焦散亮度倍数、四个界面的总透过率
export const OPTICS = { glassIor: 1.5, liquidIor: 1.36, glassAbsorb: [1.6, 0.5, 1.2], dispersion: 0.012, frostBlur: 0.012, frostDiffuse: 0.4, causticGrid: 256, causticGain: 1, interfaces: 0.85 };
export const LAYER = { liquid: 1, glass: 2 };
```

   with:

```js
// 焦散网格分辨率、焦散亮度倍数、四个界面的总透过率、光路出了画面时取的糊开的世界（四分之一分辨率的第几级 mip）
export const OPTICS = { glassIor: 1.5, liquidIor: 1.36, glassAbsorb: [1.6, 0.5, 1.2], dispersion: 0.012, frostBlur: 0.012, frostDiffuse: 0.4, causticGrid: 256, causticGain: 1, interfaces: 0.85, lowLod: 3.5 };
export const LAYER = { liquid: 1, glass: 2, over: 3 };
```

4. Replace:

```js
uniform sampler2D tScene, tDepth; uniform vec2 res; uniform float uNear, uFar, uBlur;
```

   with:

```js
uniform sampler2D tScene, tDepth, tLow; uniform vec2 res; uniform float uNear, uFar, uBlur;
```

5. Replace:

```js
vec2 toScreen(vec3 q) { vec4 c = projectionMatrix * (uB2V * vec4(q, 1.0)); return c.xy / c.w * 0.5 + 0.5; }
vec3 fetch(vec2 uv) {
  vec3 c = texture2D(tScene, uv).rgb;
  if (gBlur < 0.5) return c;
  for (int i = 0; i < 12; i++) {                                        // 磨砂：中心 + 两圈各 6 个点
    float a = float(i) * 1.0472 + (i < 6 ? 0.0 : 0.5236), r = i < 6 ? 0.5 : 1.0;
    c += texture2D(tScene, uv + vec2(cos(a), sin(a)) * r * gBlur / res).rgb;
```

   with:

```js
vec2 gUv = vec2(0.0);                                                   // behind 最后取色的屏幕位置
float gZin = 0.0;                                                       // 视线进瓶（进液体）那一点的视空间 z
vec2 toScreen(vec3 q) { vec4 c = projectionMatrix * (uB2V * vec4(q, 1.0)); return c.xy / c.w * 0.5 + 0.5; }
vec3 fetchR(vec2 uv, float R) {
  vec3 c = texture2D(tScene, uv).rgb;
  if (R < 0.5) return c;
  for (int i = 0; i < 12; i++) {                                        // 磨砂：中心 + 两圈各 6 个点
    float a = float(i) * 1.0472 + (i < 6 ? 0.0 : 0.5236), r = i < 6 ? 0.5 : 1.0;
    c += texture2D(tScene, uv + vec2(cos(a), sin(a)) * r * R / res).rgb;
```

6. Replace:

```js
// 光线从 q 沿 d 离开瓶子后落到的画面：用深度图估计背后的东西有多远，再把那一点投回屏幕
vec3 behind(vec3 q, vec3 d) {
  vec2 uv = toScreen(q);
  float zb = perspectiveDepthToViewZ(texture2D(tDepth, uv).x, uNear, uFar), zq = (uB2V * vec4(q, 1.0)).z;
  float s = min(max(zq - zb, 0.0) / max(-(mat3(uB2V) * d).z, 0.25), 0.3);
  return fetch(toScreen(q + d * s));
}
// 在棱柱里从 p 沿 d 走到出口再折射出去（出口全反射就在里面反射再走，最多四段：45° 切角里要来回几次），返回背后的颜色；L 累计路程
vec3 through(vec3 p, vec3 d, vec3 P[8], vec2 Y, float eta, inout float L) {
```

   with:

```js
vec3 fetch(vec2 uv) { return fetchR(uv, gBlur); }
float viewZ(vec2 uv) { return perspectiveDepthToViewZ(texture2D(tDepth, uv).x, uNear, uFar); }
// uv 处是挡在进瓶点前面的东西（比如从液面后方看回去的水滴）：它不在这条光路上，取它周围两圈里在后面的画面
vec3 around(vec2 uv) {
  vec3 c = vec3(0.0); float n = 0.0;
  for (int i = 0; i < 16; i++) {
    float a = float(i) * 0.785398 + (i < 8 ? 0.0 : 0.392699), r = i < 8 ? 0.1 : 0.18;
    vec2 u = clamp(uv + vec2(cos(a) * res.y / res.x, sin(a)) * r, 0.0, 1.0);
    if (viewZ(u) < gZin + 5e-4) { c += texture2D(tScene, u).rgb; n += 1.0; }
  }
  return n > 0.0 ? c / n : texture2D(tScene, uv).rgb;
}
bool onScreen(vec2 uv) { return all(greaterThanEqual(uv, vec2(0.0))) && all(lessThanEqual(uv, vec2(1.0))); }
// 光线从 q 沿 d 离开瓶子后落到的画面：用深度图估计背后的东西有多远，再把那一点投回屏幕。
// 投到画面外时（从液面斜看下去，光从后壁很低的地方出去）：画面外没有深度也没有颜色，就从本像素朝那一点走到画面边上，
// 取那里的世界大范围糊开的颜色（tLow 的粗 mip）。它随像素连续变化：不拉出一道道边上的像素
vec3 behind(vec3 q, vec3 d) {
  vec2 uq = toScreen(q);
  float zq = (uB2V * vec4(q, 1.0)).z, s = onScreen(uq) ? min(max(zq - viewZ(uq), 0.0) / max(-(mat3(uB2V) * d).z, 0.25), 0.3) : 0.05;
  gUv = toScreen(q + d * s);
  if (onScreen(gUv)) {                                                  // 靠近画面边时渐渐换成 tLow：光路出画面的那一刻颜色不跳
    vec2 e = min(gUv, 1.0 - gUv) * vec2(res.x / res.y, 1.0);
    vec3 c = viewZ(gUv) > gZin + 5e-4 ? around(gUv) : fetch(gUv);
    return mix(textureLod(tLow, gUv, ${f(OPTICS.lowLod)}).rgb, c, smoothstep(0.0, 0.06, min(e.x, e.y)));
  }
  vec2 f = gl_FragCoord.xy / res, v = gUv - f, m = 1.5 / res, b = mix(m, 1.0 - m, step(0.0, v));
  vec2 t = mix(vec2(1e6), (b - f) / v, step(1e-6, abs(v)));             // 每个方向走到边上要走多远
  gUv = f + v * min(t.x, t.y);
  return textureLod(tLow, gUv, ${f(OPTICS.lowLod)}).rgb;
}
// 从折射率 eta 的介质沿 d 出到空气时的反射率（非偏振的菲涅耳，n 是外法线；全反射为 1）
float fresnelOut(vec3 d, vec3 n, float eta) {
  float ci = dot(d, n), st2 = eta * eta * (1.0 - ci * ci);
  if (st2 >= 1.0) return 1.0;
  float ct = sqrt(1.0 - st2), rs = (eta * ci - ct) / (eta * ci + ct), rp = (ci - eta * ct) / (ci + eta * ct);
  return 0.5 * (rs * rs + rp * rp);
}
// 在棱柱里从 p 沿 d 走到出口，出去的那份按菲涅耳透过率取背后的颜色，反射回来的那份接着在里面走（最多四段：45° 切角里要来回几次）。
// 接近全反射的角度上两份此消彼长，画面不会在临界角上断开；平常出口的反射只有几个百分点，直接出去。L 是按份额平均的路程
vec3 through(vec3 p, vec3 d, vec3 P[8], vec2 Y, float eta, inout float L) {
  vec3 c = vec3(0.0); float w = 1.0, Lw = 0.0;
```

7. Replace:

```js
    vec3 o = refract(d, -n, eta);
    if (dot(o, o) > 0.0) return behind(p, o);
    d = reflect(d, n);
  }
  return fetch(toScreen(p));                                              // 还困在里面：取这一点正后方的画面
```

   with:

```js
    float a = w * (1.0 - fresnelOut(d, n, eta));
    if (a > 0.0) { c += a * behind(p, refract(d, -n, eta)); Lw += a * L; w -= a; }
    if (w < 0.1) { L = Lw / (1.0 - w); return c / (1.0 - w); }
    d = reflect(d, n);
  }
  L = Lw + w * L;
  return c + w * fetch(toScreen(p));                                      // 还困在里面的那份：取这一点正后方的画面
```

8. Replace:

```js
  vec3 bp = (uV2B * vec4(-vViewPosition, 1.0)).xyz, I = normalize(bp - uV2B[3].xyz), N = normalize(mat3(uV2B) * normal);
```

   with:

```js
  vec3 bp = (uV2B * vec4(-vViewPosition, 1.0)).xyz, I = normalize(bp - uV2B[3].xyz), N = normalize(mat3(uV2B) * normal);
  gZin = -vViewPosition.z;
```

9. Replace:

```js
    float frost = smoothstep(0.1, 0.45, roughnessFactor);
```

   with:

```js
    float frost = smoothstep(0.1, 0.45, roughnessFactor), zSeen = gl_FragCoord.z;
```

10. Replace:

```js
      else if (h.x > 0.0 && h.x < h.y && dot(d2, d2) > 0.0) { L = 2.0 * h.x; col = behind(bp + d * h.x, d2) * 0.92; }   // 穿过侧壁进内腔：后壁按同样厚度算
```

   with:

```js
      else if (h.x > 0.0 && h.x < h.y && dot(d2, d2) > 0.0) {            // 穿过侧壁进内腔：后壁按同样厚度算
        L = 2.0 * h.x; col = behind(bp + d * h.x, d2) * 0.92;
        if (c == 1) zSeen = texture2D(tDepth, gUv).x;                    // 看到的那样东西的深度（绿色通道的光路）
      }
```

11. Replace:

```js
    seen = mix(seen, totalDiffuse, frost * ${f(OPTICS.frostDiffuse)});    // 磨砂面散射：带一点被灯照亮的白
```

   with:

```js
    seen = mix(seen, totalDiffuse, frost * ${f(OPTICS.frostDiffuse)});    // 磨砂面散射：带一点被灯照亮的白
    gl_FragDepth = frost < 0.5 ? max(gl_FragCoord.z, zSeen) : gl_FragCoord.z;   // 不比玻璃自己近：玻璃前面的东西照样挡住它
```

12. Replace:

```js
// 与 bottle.js 的 rippleHeight 同一公式
```

   with:

```js
// 与 bottle.js 的 rippleHeight 同一公式；r 从落点 RIPPLE.at 量起
const vec2 AT = vec2(${f(RIPPLE.at[0])}, ${f(RIPPLE.at[1])});
```

13. Replace:

```js
  float r = length(xz), g = (rip(r + 1e-4) - rip(max(r - 1e-4, 0.0))) / 2e-4;
  vec2 u = r > 1e-6 ? xz / r : vec2(0.0);
```

   with:

```js
  vec2 q = xz - AT;
  float r = length(q), g = (rip(r + 1e-4) - rip(max(r - 1e-4, 0.0))) / 2e-4;
  vec2 u = r > 1e-6 ? q / r : vec2(0.0);
```

14. Replace:

```js
    tScene: { value: null }, tDepth: { value: null }, res: { value: V2(1, 1) }, uNear: { value: 0.01 }, uFar: { value: 100 }, uBlur: { value: 0 },
```

   with:

```js
    tScene: { value: null }, tDepth: { value: null }, tLow: { value: null }, res: { value: V2(1, 1) }, uNear: { value: 0.01 }, uFar: { value: 100 }, uBlur: { value: 0 },
```

15. Replace:

```js
  S.uRough.value = gm?.isMeshStandardMaterial ? Math.max(gm.roughness, 0.0525) : 1;
```

   with:

```js
  S.uRough.value = gm?.isMeshStandardMaterial ? Math.max(gm.roughness, 0.0525) : 1;

  // 第 0 层画完缩成四分之一存一份带 mip 的：光路出了画面时（behind）取它的粗 mip
  const low = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const shrink = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { t: { value: null } }, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main() { gl_FragColor = texture2D(t, vUv); }',
  }));
  U.tLow.value = low.texture;
```

16. Replace:

```js
        scene.background = null; renderer.autoClear = false; renderer.shadowMap.autoUpdate = false;   // 后两遍叠在第一遍上：不清屏、不重画阴影
        for (const layer of [LAYER.liquid, LAYER.glass]) { camera.layers.set(layer); renderer.render(scene, camera); }
```

   with:

```js
        low.setSize(Math.ceil(target.width / 4), Math.ceil(target.height / 4));
        shrink.material.uniforms.t.value = target.texture; renderer.setRenderTarget(low); shrink.render(renderer); renderer.setRenderTarget(target);
        scene.background = null; renderer.autoClear = false; renderer.shadowMap.autoUpdate = false;   // 后三遍叠在第一遍上：不清屏、不重画阴影
        for (const layer of [LAYER.liquid, LAYER.glass, LAYER.over]) { camera.layers.set(layer); renderer.render(scene, camera); }
```

Notes:
- `fetch` becomes `fetchR(uv, R)` with an explicit blur radius. `fetch(uv)` keeps the frosted-glass blur for the current fragment.
- `around` and the `tLow` fallback are both only reached in the close-up's grazing views. In the other shots `behind` lands on screen, well inside the border, and returns `fetch` as before.
- The shrink pass draws with its own orthographic quad camera, so the glass test tells the passes apart by camera.

Run: `node --test 03-perfume/test/glass.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: The drop, the spray, and the worlds' haze and dew**

`03-perfume/js/drop.js`:

```js
// drop.js — 落进瓶里的那一滴（闭式：只由 drop 镜头的本地时间决定）。瓶盖盖着，水滴从瓶肩内侧松开，慢镜头落过液面上的空气，
// 在 EV.land 碰到液面、并进去，涟漪从落点 RIPPLE.at 散开。特写最后 DROP.pre 秒，叶尖的露珠按同一条下落曲线松开：硬切接上动作
import * as THREE from 'three';
import { GLASS, RIPPLE } from './bottle.js';
import { DIMS, EV } from '../meta.js';
import { dewMaterial } from './worlds/common.js';
import { clamp, ss } from '../../factory/engine/ease.js';

// 半径（米）、松开到切镜的秒数（在特写里）、并进液面用的秒数
export const DROP = { R: 0.0025, pre: 0.25, merge: 0.1 };
const Y0 = DIMS.body - GLASS.shoulder - 1.2 * DROP.R;                  // 松开时的球心：和叶尖的露珠一样，挂着时顶端在球心上 1.2R
/** 慢镜头的“重力”（米/秒²）：松开 DROP.pre + EV.land 秒后，水滴底部正好碰到静止液面 */
export const FALL_G = (2 * (Y0 - DROP.R - GLASS.fill)) / (DROP.pre + EV.land) ** 2;
/** 松开 tau 秒后落下的距离（米；tau ≤ 0 时为 0）。特写里的露珠和瓶里的水滴共用 */
export const fallen = tau => (tau > 0 ? 0.5 * FALL_G * tau * tau : 0);
/** 松开 tau 秒后的竖向拉伸：挂着时被拉长到 1.4，松开后回弹、很快晃成圆的 */
export const stretch = tau => 1 + 0.4 * Math.exp(-8 * tau) * Math.cos(10 * Math.PI * tau);

/**
 * drop 镜头本地时间 lt 的水滴：球心 p（瓶子坐标）、半径 r、竖向拉伸 sy（横向按 1/√sy，体积不变）。
 * 碰到液面后球心接着往下走、半径在 DROP.merge 秒里缩到 0（没进液面的部分被液体盖住）；r = 0 就不画
 */
export function dropAt(lt) {
  const tau = lt + DROP.pre, m = clamp((lt - EV.land) / DROP.merge);
  return { p: [RIPPLE.at[0], Y0 - fallen(tau), RIPPLE.at[1]], r: DROP.R * (1 - ss(0, 1, m)), sy: stretch(tau) };
}

/** 水滴网格（第 0 层：透过玻璃和液体都看得到它），材质是世界的露珠——里面倒映着世界的天，下半截是液体的颜色 */
export function createDrop(ctx, sku) {
  const hz = ctx.world.haze;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), dewMaterial(hz, { below: sku.liquid.color, above: hz.uniforms.hZenith.value }));
  mesh.name = 'drop';
  return {
    mesh,
    /** lt = drop 镜头的本地时间；不传就藏起来（别的镜头） */
    pose(lt) {
      const d = lt === undefined ? null : dropAt(lt);
      mesh.visible = !!d && d.r > 0;
      if (mesh.visible) { const w = d.r / Math.sqrt(d.sy); mesh.position.set(...d.p); mesh.scale.set(w, d.r * d.sy, w); }
    },
  };
}
```

`03-perfume/js/spray.js`:

```js
// spray.js — 按一下喷头喷出的香雾（闭式：每一颗在 spray 镜头本地时间 lt 的位置、大小、透明度只由 (种类, i, lt) 决定）。
// 雾团从按下时的喷嘴出发，沿 −x 的小锥喷出，空气阻力让它十几厘米内就停下，然后随气流往前飘、慢慢沉、胀大、变淡；
// 另有一层细小的液滴，出来的那一下闪一闪。画在第 3 层（glass.js 的 LAYER.over）：玻璃之后画，挡在瓶子前面的雾才不会被玻璃盖掉
import * as THREE from 'three';
import { EV } from '../meta.js';
import { LAYER } from './glass.js';
import { billboards, puffAtlas } from './worlds/common.js';
import { rand } from '../../factory/engine/rng.js';
import { lerp, ss } from '../../factory/engine/ease.js';

// 数量、从 EV.spray 起喷出的时长（秒）、锥半角（度）、初速（米/秒）、阻力时间常数（秒）、终了半径（米）、淡出的年龄（秒）
export const SPRAY = {
  puff: { n: 220, emit: 0.3, cone: 13, speed: [0.3, 1.4], drag: 0.06, size: [0.005, 0.018], fade: [0.45, 1.2], seed: 0x5a1 },
  glint: { n: 80, emit: 0.25, cone: 8, speed: [0.9, 1.6], drag: 0.05, size: [0.0008, 0.0016], fade: [0.1, 0.35], seed: 0x5a2 },
};

/** kind 'puff' | 'glint' 的第 i 颗在 lt 时：{ p（世界坐标）, size（半径，米）, alpha 0..1 }。at = 按下时喷嘴的位置；还没喷出时 alpha = 0 */
export function particle(kind, i, lt, at) {
  const K = SPRAY[kind], r = j => rand(K.seed, i * 10 + j), age = lt - (EV.spray + K.emit * r(0));
  if (!(age > 0)) return { p: at, size: 0, alpha: 0 };
  const th = (K.cone * Math.PI / 180) * Math.sqrt(r(1)), ph = 2 * Math.PI * r(2);
  const dir = [-Math.cos(th), Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph)];
  const reach = lerp(...K.speed, r(3)) * K.drag * (1 - Math.exp(-age / K.drag));
  const wind = [-0.035 * age, -0.004 * age - 0.008 * age * age, 0.012 * age];          // 停下以后：随空气往前飘，慢慢沉
  const p = at.map((a, k) => a + dir[k] * reach + wind[k] + 0.004 * age * Math.sin((2.3 + 0.9 * k) * age + 6.283 * r(4 + k)));   // 加一点打旋
  const size = kind === 'puff' ? lerp(0.0015, lerp(...K.size, r(7)), 1 - Math.exp(-age / 0.3)) : lerp(...K.size, r(7));
  const alpha = ss(0, 0.03, age) * (1 - ss(K.fade[0], K.fade[1], age)) * lerp(0.5, 1, r(8));
  return { p, size, alpha };
}

/** 闪光用的纹理：2 × 2 格都是同一个柔和的圆点（billboards 按实例号取格子） */
function dots(N = 32) {
  const px = new Uint8Array(4 * N * N * 4), S = 2 * N;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const x = ((i % N) + 0.5) / N * 2 - 1, y = ((j % N) + 0.5) / N * 2 - 1, p = 4 * (j * S + i);
    px[p] = px[p + 1] = px[p + 2] = 255; px[p + 3] = Math.round(255 * Math.exp(-6 * (x * x + y * y)) * (1 - ss(0.8, 1, Math.hypot(x, y))));
  }
  const tex = new THREE.DataTexture(px, S, S);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}

/** 两张实例化面片（雾团、闪光），按世界的 haze 着色。返回 { root, at, update(lt) }；update() 不传 lt 就藏起来（别的镜头） */
export function createSpray(ctx, bottle) {
  bottle.pose({ press: 1 });
  const at = bottle.anchor('nozzle');                                    // 按到底时的喷嘴：喷出的雾都从这里出发
  bottle.pose();
  const hz = ctx.world.haze, root = new THREE.Group();
  const glintMat = billboards(hz, { map: dots(), tint: [1.6, 1.55, 1.45], forward: 2 });
  glintMat.blending = THREE.AdditiveBlending;
  const kinds = { puff: billboards(hz, { map: puffAtlas(31), tint: [1.3, 1.3, 1.27], opacity: 0.32, forward: 0.8 }), glint: glintMat };
  const meshes = Object.entries(kinds).map(([kind, mat]) => {
    const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2), mat, SPRAY[kind].n);   // 2 × 2 的面片：缩放就是半径
    m.name = `spray-${kind}`; m.frustumCulled = false; m.layers.set(LAYER.over); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.setColorAt(0, new THREE.Color()); root.add(m);
    return [kind, m];
  });
  const o = new THREE.Object3D(), c = new THREE.Color();
  function update(lt) {
    root.visible = lt !== undefined;
    if (!root.visible) return;
    for (const [kind, m] of meshes) {
      for (let i = 0; i < m.count; i++) {
        const q = particle(kind, i, lt, at);
        o.position.set(...q.p); o.scale.setScalar(q.size); o.updateMatrix();
        m.setMatrixAt(i, o.matrix); m.setColorAt(i, c.setScalar(q.alpha));
      }
      m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
    }
  }
  update();
  return { root, at, update };
}
```

Notes:
- `billboards` picks an atlas cell per instance, so the glint texture (`dots`) is a 2 × 2 atlas with the same soft round dot in every cell.
- The glints blend additively; the puffs blend normally, at 0.32 opacity.

Make these exact replacements in `03-perfume/js/worlds/studio.js`:

1. Replace:

```js
import * as THREE from 'three';
```

   with:

```js
import * as THREE from 'three';
import { haze } from './common.js';
```

2. Replace:

```js
  return {
```

   with:

```js
  // 影棚的“天色”：暗灰的房间，太阳就是主光（落进瓶里的水滴、喷雾按它着色）
  const hz = haze({ zenith: '#3b3e45', horizon: '#56585e', mist: '#26272b', sun: { dir: key.position.toArray(), color: '#fff3e6', glow: 0.8 } });

  return {
    haze: hz,
```

Make these exact replacements in `03-perfume/js/worlds/whitetea.js`:

1. Replace:

```js
import { haze, sky, dewMaterial, driftField, puffAtlas, billboards, NOISE } from './common.js';
```

   with:

```js
import { haze, sky, dewMaterial, driftField, puffAtlas, billboards, NOISE } from './common.js';
import { DROP, fallen, stretch } from '../drop.js';
```

2. Replace:

```js
 * dir(yaw, pitch)（相机方向，按嫩枝坐标的方位 / 仰角，度）、drop(R)（按半径摆露珠：顶端始终挂在叶尖上）
```

   with:

```js
 * dir(yaw, pitch)（相机方向，按嫩枝坐标的方位 / 仰角，度）、drop(R, tau)（按半径摆露珠：挂着时顶端扎在叶尖上，松开前 0.3 秒被坠长；
 * tau > 0 是松开后的秒数，和瓶里的水滴走同一条下落曲线）
```

3. Replace:

```js
  const drop = R => { dew.scale.set(R, 1.2 * R, R); dew.position.set(tip.x, tip.y - R, tip.z); dew.updateMatrix(); };   // 顶端在叶尖上方 0.2R：叶尖扎进水珠一点
```

   with:

```js
  const drop = (R, tau = -1) => {
    if (tau > 0) { const sy = stretch(tau), w = R * Math.sqrt(1.4 / sy); dew.scale.set(w, sy * R, w); dew.position.set(tip.x, tip.y - 1.2 * R - fallen(tau), tip.z); }
    else { const sy = 1.2 + 0.2 * ss(-0.3, 0, tau); dew.scale.set(R, sy * R, R); dew.position.set(tip.x, tip.y + 0.2 * R - sy * R, tip.z); }   // 顶端在叶尖上方 0.2R：叶尖扎进水珠一点
    dew.updateMatrix();
  };
```

4. Replace:

```js
  return {
    env: { base: null, fill: (add, B, es) => es.add(sky(hz, { R: 15 })) },
```

   with:

```js
  return {
    haze: hz,
    env: { base: null, fill: (add, B, es) => es.add(sky(hz, { R: 15 })) },
```

5. Replace:

```js
      if (s.name === 'macro') sprig.drop(lerp(0.0016, 0.003, ss(0, 1, s.u)));   // 露珠慢慢长大
```

   with:

```js
      const rel = s.dur - DROP.pre;                                       // 特写最后 DROP.pre 秒露珠松开：硬切到 drop，瓶里的水滴接着落
      if (s.name === 'macro') sprig.drop(lerp(0.0016, 0.003, ss(0, rel - 0.3, s.lt)), s.lt - rel);   // 先慢慢长大
```

Run: `node --test 03-perfume/test/worlds.test.mjs 03-perfume/test/effects.test.mjs`
Expected: FAIL.
- The 10 world tests pass.
- 4 of the 10 effects tests pass: the drop's fall, its clearances, the ripple, and the particles.
- The 6 that go through the shots fail, since the shots don't use the drop or the spray yet, e.g. `lt=0: the close box is 0.16199999999999998 m tall`.

- [ ] **Step 6: The shots and the film**

Make these exact replacements in `03-perfume/js/shots.js`:

1. Replace:

```js
import { layersFor } from '../captions.js';
```

   with:

```js
import { layersFor } from '../captions.js';
import { GLASS, RIPPLE } from './bottle.js';
import { DROP, dropAt } from './drop.js';
import { mergePost } from '../../factory/engine/post.js';
```

2. Replace:

```js
const BOXES = { bottle: box3(BOX.bottle), exploded: box3(BOX.exploded) };
```

   with:

```js
const BOXES = { bottle: box3(BOX.bottle), exploded: box3(BOX.exploded) };
const CLOSE = [0.012, 0.016, 0.012];                                  // drop 开头的特写框（米）：跟着水滴的小盒
const LIFT = 0.03;                                                     // 喷之前瓶盖浮起的高度（米）
const DROP_POST = ['exposure', 'aperture', 'maxBlur', 'gamma', 'saturation'];   // drop 从 macro 的后期过渡到世界的：这几项

/**
 * drop 镜头的取景盒：先跟着水滴往下（盒心只跟 80%，水滴在画面里也往下走一点），碰到液面后停住看涟漪，
 * 0.85–2.0 秒从小盒拉到整瓶：盒子高度按对数插值（推拉的速度看起来均匀），盒心和各边按同一比例移动，最后正好是 fit('drop')
 */
function dropBox(lt) {
  const f = GLASS.fill, y = Math.max(dropAt(lt).p[1], f + DROP.R), c0 = [RIPPLE.at[0], f + 0.8 * (y - f), RIPPLE.at[1]];
  const [A, B] = BOX.bottle, c1 = A.map((a, i) => (a + B[i]) / 2), s1 = A.map((a, i) => B[i] - a);
  const h = CLOSE[1] * (s1[1] / CLOSE[1]) ** easeInOut(ss(0.85, 2.0, lt)), q = (h - CLOSE[1]) / (s1[1] - CLOSE[1]);
  const c = c0.map((x, i) => lerp(x, c1[i], q)), size = CLOSE.map((x, i) => lerp(x, s1[i], q));
  return { box: box3([c.map((x, i) => x - size[i] / 2), c.map((x, i) => x + size[i] / 2)]), q };
}
```

3. Replace:

```js
    return { camera: fit('drop', s), text: text(ctx, s) };
```

   with:

```js
    ctx.subjects.drop.pose(s.lt);
    // 特写的后期和 macro 一样（硬切两边调色、景深一致；对焦在水滴上，透过前壁也清楚：glass.js 写的是背后的深度），拉开时回到世界的
    const { box, q } = dropBox(s.lt), A = mergePost(ctx.postDefaults, ctx.world.macro.post), B = mergePost(ctx.postDefaults);
    const post = Object.fromEntries(DROP_POST.map(k => [k, Array.isArray(B[k]) ? B[k].map((b, i) => lerp(A[k][i], b, q)) : lerp(A[k], B[k], q)]));
    return { camera: fit('drop', s, { box }), text: text(ctx, s), post };
```

4. Replace:

```js
    ctx.subjects.bottle.pose({ press: ss(0.25, 0.4, s.lt) * (1 - ss(0.8, 1.0, s.lt)) });
```

   with:

```js
    const lt = s.lt, lift = easeInOut(ss(EV.lift, EV.lift + 0.3, lt)) * (1 - easeInOut(ss(EV.seat - 0.35, EV.seat, lt)));   // 瓶盖浮起、喷完落回
    ctx.subjects.bottle.pose({ capLift: LIFT * lift, press: ss(EV.spray, EV.spray + 0.1, lt) * (1 - ss(0.75, 0.9, lt)) });
    ctx.subjects.spray.update(lt);
```

Make these exact replacements in `03-perfume/film.js`:

1. Replace:

```js
import { createGlass } from './js/glass.js';
```

   with:

```js
import { createGlass } from './js/glass.js';
import { createDrop } from './js/drop.js';
import { createSpray } from './js/spray.js';
```

2. Replace:

```js
    const bottle = buildBottle(ctx, sku, { logo: await logoMask() });
    ctx.scene.add(bottle.root);
    ctx.subjects = { bottle, glass: createGlass(ctx, bottle, sku) };
```

   with:

```js
    const bottle = buildBottle(ctx, sku, { logo: await logoMask() }), drop = createDrop(ctx, sku), spray = createSpray(ctx, bottle);
    bottle.root.add(drop.mesh);
    ctx.scene.add(bottle.root, spray.root);
    ctx.subjects = { bottle, drop, spray, glass: createGlass(ctx, bottle, sku) };
```

3. Replace:

```js
    ctx.subjects.bottle.pose();
    ctx.world.reset?.();
  },
  /** 场景目标里分三遍画：世界 → 液体 → 玻璃（js/glass.js） */
```

   with:

```js
    const { bottle, drop, spray } = ctx.subjects;
    bottle.pose(); drop.pose(); spray.update();
    ctx.world.reset?.();
  },
  /** 场景目标里分四遍画：世界 → 液体 → 玻璃 → 挡在瓶子前面的喷雾（js/glass.js） */
```

Run: `node --test 03-perfume/test/effects.test.mjs 03-perfume/test/glass.test.mjs 03-perfume/test/worlds.test.mjs`
Expected: PASS (25 tests).

- [ ] **Step 7: Look at it**

```bash
node factory/snap.mjs 03-perfume --t 1.9,2.2,2.3,2.7,3.2,3.9,10.7,11.0,11.4,11.9 --ar 9x16 --out /tmp/t14
node factory/snap.mjs 03-perfume --t 1.9,2.2,2.3,2.7,3.2,3.9,10.7,11.0,11.4,11.9 --ar 1x1 --out /tmp/t14
node factory/snap.mjs 03-perfume --t 1.9,2.2,2.3,2.7,3.2,3.9,10.7,11.0,11.4,11.9 --ar 16x9 --out /tmp/t14
node factory/snap.mjs 03-perfume --t 2.7,3.2,11.2 --world studio --ar 9x16 --out /tmp/t14/studio
```

Expected timings: 130–155 ms per 9x16 frame, 80–110 ms at 1x1 and 120–160 ms at 16x9. The first frame of a run also compiles the shaders; it takes about 490 ms at 9x16.
- **t = 1.9 (macro):** the dew hangs full-size from the lower leaf's tip, a little elongated, as it is about to let go.
- **t = 2.2 (macro):** the dew has left the tip and is 0.6 mm below it. It is slow motion: the fall itself is barely visible yet.
- **t = 2.3 (drop):** hard cut to the inside of the bottle.
  - The drop hangs in the upper part of a close frame, with a pale band of liquid surface below it. The tea garden shows blurred through the back wall.
  - The clear dip tube is a soft pale column on the right; the pump chamber is out of sight in the shoulder.
  - At 1:1 and 16:9 the chamfered corners refract the garden into angled bright facets on the left. That is physical.
- **t = 2.7 (drop):** the camera has followed the drop down; it is just above the surface, and still sharp.
- **t = 3.2 (drop):** the drop is gone and rings spread from where it landed. They are left of and in front of the tube, so they reflect the sky clearly.
- **t = 3.9 (drop):** the frame has opened to nearly the whole bottle, with cap and collar, and the grade is the world's again.
- **No drop frame** shows streaks or smeared edge pixels under the drop, a ghost of the drop in the refraction, or a hard curved seam on the back wall.
- **t = 10.7 (spray):** the cap is rising off the pump.
- **t = 11.0 (spray):** the cap is 3 cm up and the pump pressed. A spray of bright glints leaves the nozzle to the left.
- **t = 11.4 (spray):** a soft white cloud hangs a few centimetres left of the nozzle; the glints have gone.
- **t = 11.9 (spray):** the cap is nearly seated. The cloud has drifted further left and thinned.
- **Studio (`/tmp/t14/studio`):**
  - at 2.7 the drop is sharp against the grey room;
  - at 3.2 the rings show;
  - at 11.2 the mist is visible against the grey floor.

- [ ] **Step 8: Re-run the pre-flight**

The drop and spray shots changed, so check determinism and speed again.

Run: `node factory/check.mjs 03-perfume; echo "exit $?"`
Expected: every line `ok`, including `determinism  14 frames identical forward and backward`, then `speed  ~109 ms/frame at 1080×1920 …`, `all checks passed` and `exit 0`.

- [ ] **Step 9: Run all tests and commit**

Run: `npm test`
Expected: PASS, 102 tests.

```bash
git add 03-perfume/js/drop.js 03-perfume/js/spray.js 03-perfume/js/glass.js 03-perfume/js/bottle.js 03-perfume/js/shots.js 03-perfume/meta.js 03-perfume/film.js 03-perfume/js/worlds/studio.js 03-perfume/js/worlds/whitetea.js 03-perfume/test/effects.test.mjs 03-perfume/test/glass.test.mjs 03-perfume/test/worlds.test.mjs
git commit -m "Add the falling drop, the ripple from its landing point and the spray; glass: over-layer pass, depth through clear glass, off-screen and Fresnel exits

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 15: Music and sound — `audio.js`, `score.js`, the loudness chain

This task gives the film its sound: a score and sound effects for white tea, sound in the live preview, and an AAC track in every rendered MP4, normalised to −14 LUFS. The voice-over comes in Task 16. The other three scents keep white tea's score until Tasks 17–19 write their own.

**How the sound is made** (`factory/engine/audio.js`):
- Nothing is loaded. Seven voices are built from WebAudio nodes: `pluck`, `pad`, `flute`, `bell`, `plink`, `noise` and `click`.
  - Two parts are computed in plain JS, so Node tests can check them: the Karplus–Strong string behind `pluck`, and the reverb's impulse response.
  - Every random value comes from `rand(seed, i)`.
- `renderMix(film, v, built)` renders a whole cut offline: 48 kHz stereo, exactly as long as the cut.
  - It reads the film's note list, `film.score(v, built) → { notes, reverb }`.
  - Each note goes through its own panner onto a bus, `music` or `sfx`. Both buses feed one convolution reverb, each at its own send level.
  - The master fades out over the last 0.3 s.
- **The preview plays the same buffer.** The player gets a 声音 checkbox and an `M` key.
  - When it is on, the preview renders the current variant's mix and plays it in step with the clock. It restarts when you seek, loop or change the variant.
  - Changing the aspect ratio does not re-render, because the sound does not depend on it.
- **The export uses it too.** `exporter.audio()` hands the same buffer to `render.mjs` as a float WAV.
- **Bit-identical renders.** Chromium adds up the connections into one node input in an unordered way. With three or more inputs, the last bits of the float sum change from render to render.
  - So nothing in `audio.js` connects more than two nodes into one input. `sum()` builds a binary tree of gain nodes instead, and two numbers add the same either way.
  - With that, the same variant renders to the same samples every time. `check.mjs` checks this for every cut.

**The score** (`03-perfume/js/score.js`) is pure data. The browser and the Node tests use the same file.
- **One bar is 3.0 s, four beats (80 bpm), for every scent.**
  - Every hit in the cuts is on a downbeat: 3, 6 and 12 s in the 15 s cut, 0 and 3 s in the 6 s cut. Every music note starts on the sixteenth-note grid (`STEP` = 0.1875 s).
  - The spec asked for a tempo map within ±8% of each scent's nominal tempo. One fixed bar is simpler and already puts every hit on a beat; the spec is amended to match.
- **White tea** is in D major pentatonic: 古琴-like plucks, a breathy flute and a soft pad.
  - The 6 s cut has its own arrangement, not a trimmed 15 s one. A test lines the 6 s cut up against every note of the 15 s cut in turn; at no alignment do half its notes match.
- **The sound effects are shared by all scents and follow the picture.** Their times come from the cut (`shotAt`) and `EV`:
  - the drop's plink and ripples at the landing;
  - a glass clink as the cap lifts;
  - the spray hiss;
  - a click as the cap seats;
  - an air whoosh peaking at the middle of every dissolve or flash;
  - an ambient bed of wandering filtered noise under the whole film.
- **The sonic logo** is the same in every scent: the notes 2, 7 and 12 semitones above the scent's tonic, on beats 0, ½ and 1 of the logo hit, as a pluck plus a bell an octave up.
  - It is on the `sfx` bus. Task 16 ducks only `music` under the voice-over, so an end-card line cannot bury the logo.

**Loudness** (`factory/lib/ffmpeg.mjs`):
- The raw mix is quiet and peaky: about −27 LUFS, with peaks around −10 dBFS on the hits.
- `loudnessFilter(wav, limit = −3)` builds the `-af` chain:
  1. measure the WAV with `loudnorm`;
  2. add the gain that brings it to −14 LUFS;
  3. limit at `limit` dBFS;
  4. measure again;
  5. add the gain that makes up what the limiter took, back to −14 LUFS.
- Both gains are plain `volume` filters, so apart from the limiter nothing is compressed.
  - **`loudnorm` only measures.** Its own linear mode silently switches to dynamic compression in two cases. One is when its gain would push the true peak over its target. The other is when the loudness range measures 0, as it does for a steady test tone. The level then lands wherever the compressor leaves it: −12.9 LUFS on a test mix that asked for −14.
  - With white tea's levels, the limiter takes at most about 5 dB off in the 15 s cut and 6 dB in the 6 s cut, for a few tens of milliseconds on the hits.
  - The limiter's latency compensation keeps the sound sample-aligned with the picture.
- **`encodeAudio(wav, out)` encodes that chain to AAC on its own**, then measures the AAC file.
  - The make-up gain and the AAC encoder both raise the true peak. The encoder's overshoot comes from energy near its 18 kHz cutoff. On Task 16's narrated 6 s mix the AAC file peaked 3 dB above the WAV. A 16 kHz low-pass before the limiter removed almost all of that; 256 kbps did not.
  - The low-pass would cut everything above 16 kHz in every film. The retry only changes the mixes that need it.
  - White tea's mixes at this task pass on the first encode, at about −1.55 dBTP (15 s) and −2.5 dBTP (6 s). Some of Task 16's narrated mixes need a second encode.
  - If the true peak is above `LOUD.TP` = −1.5 dBTP, it lowers the limit by the excess plus 0.3 dB and encodes again, up to 4 times. The loudness stays at −14 LUFS; only the limiter works harder.
  - The MP4 then copies that AAC track unchanged: `encodeArgs` now takes the encoded file and uses `-c:a copy`.
- `render.mjs` then measures the finished MP4. Outside −14 ± 1 LUFS, or with a true peak above −1 dBTP, the job fails.
- The sidecar records `audio: true`, `lufs` and a new field, `tp`.

**Files:**
- Create: `factory/engine/audio.js`, `03-perfume/js/score.js`
- Modify: `03-perfume/film.js`, `factory/engine/exporter.js`, `factory/engine/player.js`, `factory/engine/player.css`, `factory/lib/ffmpeg.mjs`, `factory/render.mjs`, `factory/check.mjs`
- Test: `factory/test/audio.test.mjs`, `03-perfume/test/score.test.mjs`, `factory/test/ffmpeg.test.mjs`

**Interfaces:**
- Consumes:
  - Task 1: `rand(seed, i)`. Task 6: `wavFloat32(chs, sr)`.
  - Task 3: `buildCut`, `shotAt(built, name)`, and `built = { duration, hits, entries: [{ shot, start, end, from, dur, transition: { type, dur } }] }`.
  - Task 7: `BAR`, `CUTS`, `META.axes`, `SKUS[sku].score`. Task 14: `EV = { land, streak, lift, spray, seat }`.
  - Task 8: `app.{ film, ctx: { variant, built }, t, playing }`, and the player's `fail(e)`.
  - Task 10: `encodeArgs({ fps, out, audio, afilter })`, `checkProbe(p, { …, audio })`, `createExporter(app)`, and the job flow of `render.mjs` and `check.mjs`.
- Produces:
  - `engine/audio.js`:
    - `SR` = 48000, `BUSES` = `['music', 'sfx']`, `mtof(midi)`, `peak(buffer)`;
    - `noise(n, seed)`, `pluck(f, len, { t60, bright, seed, sr })`, `impulse(decay, { seed, sr }) → [L, R]`;
    - `VOICES`;
    - `renderMix(film, v, built) → Promise<AudioBuffer>`;
    - `createSound(app, { onError }) → { on, set(yes): Promise }`.
  - **Note events**, the items of `score().notes`: `{ t, voice, f, d, v, bus, pan?, p? }`.
    - `t` is the start in seconds, `f` is in Hz, and `v` is 0–1.
    - `d` is the note's length in seconds; for plucks and bells it is the ringing tail.
    - `bus` is `'music'` or `'sfx'`, `pan` is −1…1, and `p` holds voice parameters (see the doc comment on each voice).
  - `03-perfume/js/score.js`:
    - `BEAT`, `STEP`, `LOGO` = `[2, 7, 12]`;
    - `SCORES[id] = { tonic, reverb: { decay, music, sfx }, bed, m15(), m6() }`;
    - `logo(tonic, t)`, `sfx(built, bed)`, `score(v, built) → { notes, reverb }`.
  - Film contract: `score(v, built) → { notes, reverb }`.
  - `exporter.audio() → Promise<{ url, sr, duration, peak } | null>`. It returns `null` for a film without `score`, which then renders silent.
  - `lib/ffmpeg.mjs`:
    - `LOUD = { I: −14, TP: −1.5, LRA: 20 }`;
    - `measure(file, pre = '') → { I, TP, LRA, thresh, offset }`;
    - `loudnessFilter(wav, limit = −3) → string`;
    - `encodeAudio(wav, out, tp = LOUD.TP) → { I, TP, LRA, thresh, offset, limit }`: the measurement of the AAC file it wrote, and the limit that file needed;
    - `encodeArgs({ fps, out, audio })`, where `audio` is an `encodeAudio` output that goes into the MP4 unchanged. `afilter` is gone;
    - `checkLoudness({ I, TP }) → string[]`, where an empty list means it passes.
  - Sidecar: `audio: true`, `lufs` and `tp`, both rounded to 0.1.
  - `check.mjs` prints an `audio` line.
  - For Tasks 17–19, each scent adds its own `SCORES` entry in the same shape. `score.test.mjs` then holds it to the same rules:
    - voices from `VOICES` only;
    - music onsets on `STEP`, and a music onset on every hit;
    - the logo at `LOGO` above the scent's `tonic`. Choose the tonic and mode so that 2, 7 and 12 semitones above the tonic are in the mode; the test cannot check that.
  - For Task 16: `renderMix` gains the voice-over clips, through one VO gain node into the master, and the duck on `music`.

- [ ] **Step 1: Write the failing tests**

The audio test covers the plain-JS parts.
- The Karplus–Strong pitch is measured by autocorrelation: within 0.5% from D2 to E6, at every brightness.
- `t60` sets the decay; the output is normalised and has no DC.
- The same seed gives the same samples.
- The noise and the impulse response are deterministic and shaped as specified.
- It fixes the voice and bus lists the scores may use.

`factory/test/audio.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { pluck, noise, impulse, mtof, SR, VOICES, BUSES } from '../engine/audio.js';

const rms = (y, t0, t1) => { let a = 0; const i0 = Math.round(t0 * SR), i1 = Math.round(t1 * SR); for (let i = i0; i < i1; i++) a += y[i] * y[i]; return Math.sqrt(a / (i1 - i0)); };
const dB = x => 20 * Math.log10(x);
/** 基频估计：0.1 秒后一段 8192 点的自相关，在 sr/f 的 ±20% 里找峰，抛物线插值到亚采样 */
function pitch(y, f) {
  const P = SR / f, s0 = Math.round(0.1 * SR), N = 8192;
  const r = lag => { let a = 0; for (let i = s0; i < s0 + N; i++) a += y[i] * y[i + lag]; return a; };
  let best = -Infinity, bl = 0;
  for (let l = Math.floor(P * 0.8); l <= Math.ceil(P * 1.2); l++) { const v = r(l); if (v > best) { best = v; bl = l; } }
  const a = r(bl - 1), b = r(bl), c = r(bl + 1);
  return SR / (bl + (0.5 * (a - c)) / (a - 2 * b + c));
}

test('mtof: A4 = 440 Hz, an octave doubles', () => {
  assert.equal(mtof(69), 440);
  assert.ok(Math.abs(mtof(81) - 880) < 1e-9 && Math.abs(mtof(62) - 293.6648) < 1e-3);
});

test('pluck: the pitch is within 0.5% from D2 to E6, at every brightness', () => {
  for (const f of [mtof(38), 110, 220, mtof(69), mtof(81), mtof(88)]) {
    for (const bright of [0, 0.5, 1]) {
      const e = pitch(pluck(f, 0.4, { bright, seed: 3 }), f);
      assert.ok(Math.abs(e / f - 1) < 0.005, `f=${f.toFixed(1)} bright=${bright}: measured ${e.toFixed(2)} Hz`);
    }
  }
});

test('pluck: t60 sets the decay, peak is 1, no DC', () => {
  const y = pluck(220, 1.2, { t60: 1, bright: 0, seed: 3 }), d = dB(rms(y, 0.9, 1.0) / rms(y, 0.05, 0.15));
  assert.ok(d < -45 && d > -65, `drop over 0.85 s at t60 = 1 s: ${d.toFixed(1)} dB`);
  const long = pluck(220, 1.2, { t60: 4, bright: 0, seed: 3 }), dl = dB(rms(long, 0.9, 1.0) / rms(long, 0.05, 0.15));
  assert.ok(dl > -20, `t60 = 4 s drops only ${dl.toFixed(1)} dB`);
  assert.equal(Math.max(...y.map(Math.abs)), 1);
  const mean = y.slice(SR * 0.5, SR).reduce((s, x) => s + x, 0) / (SR * 0.5);
  assert.ok(Math.abs(mean) < 1e-3, `DC ${mean}`);
});

test('pluck: same seed → same samples; another seed → another attack', () => {
  const a = pluck(330, 0.3, { seed: 5 }), b = pluck(330, 0.3, { seed: 5 }), c = pluck(330, 0.3, { seed: 6 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.ok(Math.abs(pitch(a, 330) - pitch(c, 330)) < 0.5);
});

test('noise: deterministic, in −1…1, zero mean', () => {
  const a = noise(48000, 9);
  assert.deepEqual(a, noise(48000, 9));
  assert.notDeepEqual(a, noise(48000, 10));
  assert.ok(a.every(x => x >= -1 && x < 1));
  assert.ok(Math.abs(a.reduce((s, x) => s + x, 0) / a.length) < 0.01);
});

test('impulse: stereo, silent pre-delay, decays about 60 dB over its length, channels differ', () => {
  const [L, R] = impulse(3.2);
  assert.equal(L.length, Math.ceil(3.2 * SR));
  assert.ok(L.slice(0, Math.round(0.012 * SR)).every(x => x === 0));
  const d = dB(rms(L, 2.9, 3.1) / rms(L, 0.02, 0.2));
  assert.ok(d < -50 && d > -75, `tail ${d.toFixed(1)} dB`);
  assert.notDeepEqual(L, R);
  assert.deepEqual(impulse(3.2)[0], L);
});

test('voices and buses the scores may use', () => {
  assert.deepEqual(Object.keys(VOICES).sort(), ['bell', 'click', 'flute', 'noise', 'pad', 'plink', 'pluck']);
  assert.deepEqual(BUSES, ['music', 'sfx']);
});
```

The score test runs every scent × cut through `score()` against the real cut tables. It checks:
- the events are well-formed;
- the hits are downbeats with music on them, and the music is on the grid;
- the logo has its intervals and rhythm on the `sfx` bus;
- the sound effects land where the picture puts them;
- the 6 s cut is its own arrangement;
- the aspect ratio, language and promo leave the sound unchanged.

`03-perfume/test/score.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { CUTS, EV, BAR, META } from '../meta.js';
import { SKUS } from '../skus.js';
import { score, SCORES, LOGO, STEP } from '../js/score.js';
import { VOICES, BUSES, mtof } from '../../factory/engine/audio.js';
import { buildCut, shotAt } from '../../factory/engine/timeline.js';

const V = (o = {}) => ({ sku: 'whitetea', ar: '9x16', lang: 'zh', cut: 15, promo: 'none', vo: 'on', ...o });
const run = o => { const v = V(o), built = buildCut(CUTS[v.cut]); return { built, ...score(v, built) }; };
const onGrid = (t, g) => Math.abs(t / g - Math.round(t / g)) < 1e-9;
const near = (a, b) => Math.abs(a - b) < 1e-9;
const each = fn => { for (const sku of META.axes.sku) for (const cut of META.axes.cut) fn(sku, cut, run({ sku, cut })); };

test('every sku has a score with both cuts and a reverb', () => {
  for (const sku of META.axes.sku) {
    const s = SCORES[SKUS[sku].score];
    assert.ok(s, `no score for ${sku}`);
    assert.equal(typeof s.m15, 'function'); assert.equal(typeof s.m6, 'function');
    assert.ok(s.reverb.decay > 0 && Number.isInteger(s.tonic));
  }
});

test('every event is well-formed and inside the film', () => {
  each((sku, cut, { built, notes }) => {
    assert.ok(notes.length > 20);
    for (const e of notes) {
      const where = `${sku} ${cut}s ${e.voice} at ${e.t}`;
      assert.ok(VOICES[e.voice], `${where}: unknown voice`);
      assert.ok(BUSES.includes(e.bus), `${where}: bus ${e.bus}`);
      for (const k of ['t', 'f', 'd', 'v']) assert.ok(Number.isFinite(e[k]), `${where}: ${k} = ${e[k]}`);
      assert.ok(e.t >= 0 && e.t < built.duration, `${where}: outside 0…${built.duration}`);
      assert.ok(e.d > 0 && e.v > 0 && e.v <= 1 && e.f > 20 && e.f < 16000, `${where}: d ${e.d} v ${e.v} f ${e.f}`);
      assert.ok(e.pan === undefined || Math.abs(e.pan) <= 1);
    }
    for (let i = 1; i < notes.length; i++) assert.ok(notes[i].t >= notes[i - 1].t, 'sorted by time');
  });
});

test('hits are bar downbeats and the music lands on each of them', () => {
  each((sku, cut, { built, notes }) => {
    for (const [name, t] of Object.entries(built.hits)) {
      assert.ok(onGrid(t, BAR), `${sku} ${cut}s hit ${name} at ${t} is not a downbeat`);
      assert.ok(notes.some(e => e.bus === 'music' && near(e.t, t)), `${sku} ${cut}s: no music onset on the ${name} hit at ${t}`);
    }
  });
});

test('music onsets sit on the sixteenth-note grid', () => {
  each((sku, cut, { notes }) => {
    for (const e of notes.filter(e => e.bus === 'music')) assert.ok(onGrid(e.t, STEP), `${sku} ${cut}s: ${e.voice} at ${e.t}`);
  });
});

test('the sonic logo: same intervals from the tonic in every scent, on the sfx bus at the logo hit', () => {
  each((sku, cut, { built, notes }) => {
    const t = built.hits.logo, tonic = SCORES[SKUS[sku].score].tonic;
    const logo = notes.filter(e => e.bus === 'sfx' && e.voice === 'pluck' && e.t >= t - 1e-9 && e.t < t + BAR / 2);
    assert.deepEqual(logo.map(e => e.t - t), [0, 0.375, 0.75], `${sku} ${cut}s logo rhythm`);
    logo.forEach((e, i) => assert.ok(Math.abs(e.f - mtof(tonic + LOGO[i])) < 1e-6, `${sku} ${cut}s logo note ${i}`));
  });
});

test('sound effects follow the picture: drop, spray, transitions, bed', () => {
  const at = (notes, voice, t) => notes.some(e => e.bus === 'sfx' && e.voice === voice && near(e.t, t));
  for (const cut of [15, 6]) {
    const { built, notes } = run({ cut }), drop = shotAt(built, 'drop');
    assert.ok(at(notes, 'plink', drop.start + EV.land - drop.from), `${cut}s: plink at the landing`);
    assert.ok(at(notes, 'noise', 0) && notes.some(e => e.voice === 'noise' && near(e.t, 0) && near(e.d, built.duration)), `${cut}s: bed over the whole film`);
    for (const e of built.entries.filter(e => e.transition.type !== 'cut')) assert.ok(at(notes, 'noise', e.start + e.transition.dur / 2 - 0.4), `${cut}s: whoosh into ${e.shot}`);
  }
  const { notes } = run();
  assert.ok(at(notes, 'bell', 10.5 + EV.lift), 'clink as the cap lifts');
  assert.ok(at(notes, 'noise', 10.5 + EV.spray), 'spray hiss');
  assert.ok(at(notes, 'click', 10.5 + EV.seat), 'cap seats');
  assert.ok(!run({ cut: 6 }).notes.some(e => e.voice === 'click'), 'the 6 s cut has no spray shot, so no click');
});

test('the 6 s cut has its own arrangement, not a slice of the 15 s one', () => {
  for (const sku of META.axes.sku) {
    const key = e => `${e.voice}|${e.f.toFixed(3)}|${e.d.toFixed(4)}`, music = n => n.filter(e => e.bus === 'music');
    const long = music(run({ sku }).notes), short = music(run({ sku, cut: 6 }).notes);
    const has = new Set(long.map(e => `${key(e)}|${e.t.toFixed(4)}`));
    for (const shift of new Set(long.map(e => e.t))) {
      const hit = short.filter(e => has.has(`${key(e)}|${(e.t + shift).toFixed(4)}`)).length;
      assert.ok(hit < short.length * 0.5, `${sku}: ${hit}/${short.length} of the 6 s notes appear in the 15 s cut shifted by ${shift} s`);
    }
  }
});

test('deterministic, and the aspect ratio, language and promo do not change the sound', () => {
  const a = run();
  assert.deepEqual(run(), a);
  for (const o of [{ ar: '16x9' }, { ar: '1x1' }, { lang: 'en' }, { promo: '1111' }]) assert.deepEqual(run(o).notes, a.notes, JSON.stringify(o));
});
```

The loudness tests run a synthetic mix through the whole chain: 3 s of a −26 dBFS tone with full-scale clicks.
- `encodeAudio` must bring it to −14 ± 0.3 LUFS with a true peak ≤ −1.5 dBTP.
- The MP4 muxed from that track and 90 PNG frames must measure the same.
- A second test asks for −4 dBTP, which forces a re-encode, and checks that the loudness stays on target.
- A third test checks that silence is an error rather than an infinite gain.

Make these exact replacements in `factory/test/ffmpeg.test.mjs`:

1. Replace:

```js
import { encodeArgs, startEncode, probe, checkProbe, hasFfmpeg, X264, AAC } from '../lib/ffmpeg.mjs';
```

   with:

```js
import { encodeArgs, startEncode, probe, checkProbe, hasFfmpeg, X264, LOUD, measure, loudnessFilter, encodeAudio, checkLoudness } from '../lib/ffmpeg.mjs';
import { wavFloat32 } from '../engine/mix.js';
```

2. Replace:

```js
}

test('encodeArgs: PNG frames on stdin, the fixed x264 settings, mp4 container even for a .part name', () => {
```

   with:

```js
}

/** 立体声 48 kHz 的 WAV：fn(t) 给出这一刻的采样 */
function wav(file, seconds, fn) {
  const n = Math.round(seconds * 48000), x = Float32Array.from({ length: n }, (_, i) => fn(i / 48000));
  fs.writeFileSync(file, Buffer.from(wavFloat32([x, x], 48000)));
}

test('encodeArgs: PNG frames on stdin, the fixed x264 settings, mp4 container even for a .part name', () => {
```

3. Replace:

```js
  const b = encodeArgs({ fps: 60, out: 'y.mp4', audio: 'mix.wav', afilter: 'alimiter' }).join(' ');
  assert.match(b, /-i mix\.wav/);
  assert.match(b, /-map 1:a:0 -af alimiter/);
  assert.ok(b.includes(AAC.join(' ')));
  assert.ok(!b.includes('-an'));
```

   with:

```js
  const b = encodeArgs({ fps: 60, out: 'y.mp4', audio: 'mix.m4a' }).join(' ');
  assert.match(b, /-i mix\.m4a/);
  assert.match(b, /-map 1:a:0 -c:a copy -f mp4 y\.mp4$/);                    // encodeAudio 编好、量过的音轨原样拷进去
  assert.ok(!b.includes('-an') && !b.includes('-af'));
```

4. Replace:

```js
  assert.ok(stderr.length > 0);
  fs.rmSync(dir, { recursive: true });
});
```

   with:

```js
  assert.ok(stderr.length > 0);
  fs.rmSync(dir, { recursive: true });
});

test('checkLoudness: −14 LUFS ± 1 LU and a true peak at most −1 dBTP', () => {
  assert.deepEqual(LOUD, { I: -14, TP: -1.5, LRA: 20 });
  assert.deepEqual(checkLoudness({ I: -14.4, TP: -1.6 }), []);
  assert.deepEqual(checkLoudness({ I: -13, TP: -1 }), []);
  const bad = checkLoudness({ I: -12.8, TP: -0.5 });
  assert.equal(bad.length, 2);
  assert.match(bad.join('|'), /loudness -12\.8 LUFS.*true peak -0\.5/);
  assert.equal(checkLoudness({ I: NaN, TP: NaN }).length, 2, 'a failed measurement never passes');
});

test('encodeAudio + mux: a quiet mix with full-scale transients comes out at −14 LUFS, true peak ≤ LOUD.TP, unchanged in the MP4', { skip: !hasFfmpeg() && 'ffmpeg not found' }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-')), src = path.join(dir, 'mix.wav'), aac = path.join(dir, 'mix.m4a'), out = path.join(dir, 'c.mp4');
  // −26 dBFS 的 440 Hz，每 0.5 秒一下满幅的 2 kHz 敲击（10 ms 衰减完）：响度低、峰值高，和配乐一样要先增益再限幅
  wav(src, 3, t => 0.05 * Math.sin(2 * Math.PI * 440 * t) + Math.exp(-(t % 0.5) / 0.002) * Math.sin(2 * Math.PI * 2000 * t));
  const raw = measure(src);
  assert.ok(raw.I < -20 && raw.TP > -1, `the source is quiet and peaky: ${raw.I} LUFS, ${raw.TP} dBTP`);
  const af = loudnessFilter(src);
  assert.match(af, /^volume=[\d.]+dB,alimiter=limit=0\.708:level=false:latency=true,volume=-?[\d.]+dB$/);
  assert.match(loudnessFilter(src, -6), /alimiter=limit=0\.501:/);
  const a = encodeAudio(src, aac);
  assert.ok(a.TP <= LOUD.TP && Math.abs(a.I - LOUD.I) <= 0.3, JSON.stringify(a));
  const enc = startEncode(encodeArgs({ fps: 30, out, audio: aac }));
  for (let i = 0; i < 90; i++) await enc.write(png(16, 16, [i * 2, 60, 90]));
  const { code, stderr } = await enc.end();
  assert.equal(code, 0, stderr);
  assert.deepEqual(checkProbe(probe(out), { duration: 3, width: 16, height: 16, fps: 30, audio: true }), []);
  const m = measure(out);
  assert.deepEqual(checkLoudness(m), [], JSON.stringify(m));
  assert.ok(Math.abs(m.I - a.I) < 0.05 && Math.abs(m.TP - a.TP) < 0.05, `the MP4 carries the measured track: ${JSON.stringify({ a, m })}`);
  fs.rmSync(dir, { recursive: true });
});

test('encodeAudio: a true peak over the target is re-encoded with a lower limit until it fits', { skip: !hasFfmpeg() && 'ffmpeg not found' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-')), src = path.join(dir, 'mix.wav'), aac = path.join(dir, 'mix.m4a');
  wav(src, 3, t => 0.05 * Math.sin(2 * Math.PI * 440 * t) + Math.exp(-(t % 0.5) / 0.002) * Math.sin(2 * Math.PI * 2000 * t));
  const first = encodeAudio(src, aac, 3), strict = encodeAudio(src, aac, -4);     // 目标 +3 dBTP 一遍就过；−4 dBTP 要压低限幅重编
  assert.equal(first.limit, -3);
  assert.ok(strict.TP <= -4 && strict.limit < -3, JSON.stringify(strict));
  assert.ok(Math.abs(strict.I - LOUD.I) <= 0.3, `the loudness stays on target: ${strict.I}`);
  fs.rmSync(dir, { recursive: true });
});

test('loudnessFilter: silence is an error, not a filter with an infinite gain', { skip: !hasFfmpeg() && 'ffmpeg not found' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-')), src = path.join(dir, 'quiet.wav');
  wav(src, 1, () => 0);
  assert.throws(() => loudnessFilter(src), /silent/);
  assert.throws(() => measure(path.join(dir, 'missing.wav')), /loudnorm/);
  fs.rmSync(dir, { recursive: true });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `node --test factory/test/audio.test.mjs 03-perfume/test/score.test.mjs factory/test/ffmpeg.test.mjs`
Expected: FAIL, all 3 files.
- `audio.test.mjs` and `score.test.mjs` fail with `ERR_MODULE_NOT_FOUND` for `factory/engine/audio.js` and `03-perfume/js/score.js`.
- `ffmpeg.test.mjs` fails with `SyntaxError: The requested module '../lib/ffmpeg.mjs' does not provide an export named 'LOUD'`.

- [ ] **Step 3: The synth and the offline mix**

`factory/engine/audio.js`:

```js
// audio.js — 声音：合成音色、整段离线混音（OfflineAudioContext，48 kHz 立体声）、预览时跟着画面播放
// 音符表来自 film.score(v, built)；整段先离线渲染成一块缓冲，预览播放的和导出写进 WAV 的是同一块，所以预览里听到的就是成片的声音
// 音色里的"随机"（拨弦的激励、噪声、混响的尾巴）都取自 rng.js；多路信号汇到一处时两两相加（sum）：同一变体渲染两遍逐采样相同
import { rand } from './rng.js';

export const SR = 48000;
export const BUSES = ['music', 'sfx'];                         // music：配乐（Task 16 起在配音下压低）；sfx：音效和品牌动机，不压
export const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const FADE = 0.3;                                              // 结尾淡出（秒）：成片最后一帧不会切在余音中间

// ── 纯函数：Node 里可测 ──
export function noise(n, seed) {
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = rand(seed, i) * 2 - 1;
  return x;
}

/** 拨弦（Karplus–Strong）：f 赫兹，len 秒；t60 余音衰减 60 dB 的秒数，bright 0–1 起音的亮度；峰值归一到 1 */
export function pluck(f, len, { t60 = 2, bright = 0.5, seed = 1, sr = SR } = {}) {
  const n = Math.ceil(len * sr), y = new Float32Array(n), D = sr / f - 0.5, P = Math.min(n, Math.ceil(D) + 1);
  const rho = Math.pow(10, -3 / (t60 * f)), a = 0.1 + 0.9 * bright;
  let lp = 0, mean = 0;
  for (let i = 0; i < P; i++) { lp += a * (rand(seed, i) * 2 - 1 - lp); y[i] = lp; mean += lp / P; }
  for (let i = 0; i < P; i++) y[i] -= mean;                   // 激励去掉直流：直流在环路里只按 rho 衰减，会拖出一段偏移
  const tap = x => { const i0 = Math.floor(x); return y[i0] + (y[i0 + 1] - y[i0]) * (x - i0); };
  for (let i = P; i < n; i++) y[i] = rho * 0.5 * (tap(i - D) + tap(i - D - 1));   // 环路延迟 D + 0.5 = sr / f
  let pk = 0;
  for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(y[i]));
  if (pk > 0) for (let i = 0; i < n; i++) y[i] /= pk;
  return y;
}

/** 混响的冲激响应：左右声道各一段指数衰减的噪声（decay 秒衰减 60 dB），12 ms 预延迟，越往后越暗 */
export function impulse(decay, { seed = 7, sr = SR } = {}) {
  const n = Math.ceil(decay * sr), pre = Math.round(0.012 * sr);
  return [0, 1].map(c => {
    const y = new Float32Array(n);
    let lp = 0;
    for (let i = pre; i < n; i++) {
      const k = (i - pre) / (n - pre);
      lp += (0.9 - 0.75 * k) * (rand(seed + c, i) * 2 - 1 - lp);
      y[i] = lp * Math.pow(10, (-3 * (i - pre)) / (decay * sr));
    }
    return y;
  });
}

export function peak(buffer) {
  let pk = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) for (const s of buffer.getChannelData(c)) pk = Math.max(pk, Math.abs(s));
  return pk;
}

// ── 音色：把一个事件 { t, f, d, v, p, seed } 接到 out 上。d 是音的长度（秒）；击弦、敲击类的 d 是余音长度 ──
const gainNode = (ac, v, out) => { const g = ac.createGain(); g.gain.value = v; if (out) g.connect(out); return g; };
const filt = (ac, type, f, q, out) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; if (out) b.connect(out); return b; };
const osc = (ac, type, f, out) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; if (out) o.connect(out); return o; };
/** 把多路接到 dest，两两相加成一棵树。Chromium 把接在同一个输入上的多路按不固定的次序相加，三路以上时浮点和的末位每次渲染都可能不同；
 *  每个节点最多接两路，两数相加与次序无关，整段混音就逐采样可复现 */
function sum(ac, nodes, dest) {
  let level = nodes;
  while (level.length > 2) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 === level.length) { next.push(level[i]); break; }
      const g = gainNode(ac, 1);
      level[i].connect(g); level[i + 1].connect(g); next.push(g);
    }
    level = next;
  }
  for (const n of level) n.connect(dest);
}
/** 包络：a 秒升到 v，保持到 t0 + hold，r 秒指数落下；返回这个音结束的时刻 */
function env(g, t0, hold, v, a, r) {
  const t1 = t0 + Math.max(a, hold);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + a);
  g.gain.setValueAtTime(v, t1); g.gain.exponentialRampToValueAtTime(1e-4, t1 + r);
  return t1 + r;
}
/** 慢慢飘动的曲线（0.1–0.6 Hz 三个正弦叠加，相位由 seed 决定），值在 −1…1，每秒 30 个点 */
function drift(seed, d) {
  const n = Math.max(2, Math.ceil(d * 30)), ph = [0, 1, 2].map(i => rand(seed, i) * 2 * Math.PI), c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = (i / (n - 1)) * d; c[i] = (Math.sin(0.13 * 6.283 * t + ph[0]) + Math.sin(0.31 * 6.283 * t + ph[1]) + Math.sin(0.57 * 6.283 * t + ph[2])) / 3; }
  return c;
}

export const VOICES = {
  /** 拨弦（古琴、竖琴、卡林巴）：p.t60 余音，p.bright 亮度 */
  pluck(ac, e, out) {
    const { t60 = 2, bright = 0.5 } = e.p, b = ac.createBuffer(1, Math.ceil(e.d * ac.sampleRate), ac.sampleRate);
    b.copyToChannel(pluck(e.f, e.d, { t60, bright, seed: e.seed, sr: ac.sampleRate }), 0);
    const s = ac.createBufferSource(), g = gainNode(ac, 0.3 * e.v, out);
    s.buffer = b; s.connect(g); s.start(e.t);
    g.gain.setValueAtTime(0.3 * e.v, e.t + e.d - 0.02); g.gain.linearRampToValueAtTime(0, e.t + e.d);   // 截断处 20 ms 淡出，免得咔哒一声
  },
  /** 铺底：两支失谐的锯齿 + 低八度三角波，柔和低通；p.a 起音、p.r 释放、p.cut 截止频率（f 的倍数）、p.air 气声 */
  pad(ac, e, out, kit) {
    const { a = 0.8, r = 1.2, cut = 3, air = 0 } = e.p, g = gainNode(ac, 0, out), lp = filt(ac, 'lowpass', Math.min(e.f * cut, 8000), 0.5, g);
    const end = env(g, e.t, e.d, 0.05 * e.v, a, r);
    sum(ac, [['sawtooth', 1, -7, 0.5], ['sawtooth', 1, 7, 0.5], ['triangle', 0.5, 0, 0.8]].map(([type, k, det, lv]) => {
      const g = gainNode(ac, lv), o = osc(ac, type, e.f * k, g); o.detune.value = det; o.start(e.t); o.stop(end);
      return g;
    }), lp);
    if (air) kit.noise(e.t, end, e.seed).connect(filt(ac, 'bandpass', Math.min(e.f * 4, 9000), 1.5, gainNode(ac, air * 0.6, g)));
  },
  /** 气声长笛：正弦 + 少量二次谐波，0.3 秒后渐入颤音；p.breath 气流噪声的多少，起音时更多（吹口的"噗"） */
  flute(ac, e, out, kit) {
    const { a = 0.08, r = 0.25, breath = 0.3 } = e.p, g = gainNode(ac, 0, out), end = env(g, e.t, e.d, 0.12 * e.v, a, r);
    const o1 = osc(ac, 'sine', e.f, g), o2 = osc(ac, 'triangle', e.f * 2, gainNode(ac, 0.1, g));
    if (e.d > 0.45) {
      const lfo = osc(ac, 'sine', 5.2), dep = gainNode(ac, 0);
      lfo.connect(dep); dep.connect(o1.detune); dep.connect(o2.detune);
      dep.gain.setValueAtTime(0, e.t + 0.3); dep.gain.linearRampToValueAtTime(12, e.t + 0.7);
      lfo.start(e.t); lfo.stop(end);
    }
    for (const o of [o1, o2]) { o.start(e.t); o.stop(end); }
    const ng = gainNode(ac, 0, out), v = 0.12 * e.v * breath;
    kit.noise(e.t, end, e.seed).connect(filt(ac, 'bandpass', e.f * 2, 1.2, ng));
    ng.gain.setValueAtTime(0, e.t); ng.gain.linearRampToValueAtTime(v * 2.5, e.t + a * 0.6);
    ng.gain.linearRampToValueAtTime(v, e.t + a * 2); ng.gain.setValueAtTime(v, e.t + Math.max(a * 2, e.d)); ng.gain.exponentialRampToValueAtTime(1e-4, end);
  },
  /** 钟、钢片琴、玻璃：几个正弦分音，越高的衰减越快；p.ratios 分音比，p.bright 高分音的多少；d = 基音的余音 */
  bell(ac, e, out) {
    const { ratios = [1, 2, 3.01, 4.2, 5.43], bright = 1 } = e.p;
    sum(ac, ratios.filter(k => e.f * k <= 16000).map((k, i) => {
      const dec = e.d / (1 + i * 0.8), og = gainNode(ac, 0), o = osc(ac, 'sine', e.f * k, og);
      og.gain.setValueAtTime(0, e.t); og.gain.linearRampToValueAtTime(Math.pow(0.55, i) * (i ? bright : 1), e.t + 0.002);
      og.gain.exponentialRampToValueAtTime(1e-4, e.t + dec);
      o.start(e.t); o.stop(e.t + dec);
      return og;
    }), gainNode(ac, 0.1 * e.v, out));
  },
  /** 水滴：正弦向上滑（气泡的共振），40 ms 内从 f 滑到 f × p.up，d 秒衰减完 */
  plink(ac, e, out) {
    const { up = 1.5 } = e.p, g = gainNode(ac, 0, out), o = osc(ac, 'sine', e.f, g);
    o.frequency.setValueAtTime(e.f, e.t); o.frequency.exponentialRampToValueAtTime(e.f * up, e.t + 0.04);
    g.gain.setValueAtTime(0, e.t); g.gain.linearRampToValueAtTime(0.3 * e.v, e.t + 0.002); g.gain.exponentialRampToValueAtTime(1e-4, e.t + e.d);
    o.start(e.t); o.stop(e.t + e.d);
  },
  /** 滤波噪声（风、雾、喷雾、转场的呼声、上升音）：滤波器从 f 滑到 f × p.sweep；p.type、p.q；p.a 起音、p.r 释放（都算在 d 里）；
   *  p.wander 0–1 让频率和音量慢慢飘（风声） */
  noise(ac, e, out, kit) {
    const { type = 'bandpass', q = 0.7, sweep = 1, a = 0.05, r = 0.2, wander = 0 } = e.p;
    const g = gainNode(ac, 0, out), bf = filt(ac, type, e.f, q, g), end = env(g, e.t, e.d - r, 0.25 * e.v, a, r);
    let src = kit.noise(e.t, end, e.seed);
    if (wander) {
      const c = drift(e.seed, end - e.t), fc = c.map((x, i) => e.f * Math.pow(sweep, i / (c.length - 1)) * Math.pow(2, 1.2 * wander * x));
      const mg = gainNode(ac, 1, bf), gc = drift(e.seed + 1, end - e.t).map(x => 1 - 0.45 * wander * (1 + x));
      bf.frequency.setValueCurveAtTime(fc, e.t, end - e.t); mg.gain.setValueCurveAtTime(gc, e.t, end - e.t);
      src.connect(mg); src = null;
    } else if (sweep !== 1) {
      bf.frequency.setValueAtTime(e.f, e.t); bf.frequency.exponentialRampToValueAtTime(e.f * sweep, e.t + e.d);
    }
    src?.connect(bf);
  },
  /** 咔哒（瓶盖落座）：几毫秒的高通噪声 + 一声很短的高音（f） */
  click(ac, e, out, kit) {
    const g = gainNode(ac, 0, out);
    kit.noise(e.t, e.t + 0.03, e.seed).connect(filt(ac, 'highpass', 2500, 0.7, g));
    g.gain.setValueAtTime(0, e.t); g.gain.linearRampToValueAtTime(0.6 * e.v, e.t + 0.001); g.gain.exponentialRampToValueAtTime(1e-4, e.t + 0.025);
    const tg = gainNode(ac, 0, out), o = osc(ac, 'sine', e.f, tg);
    tg.gain.setValueAtTime(0, e.t); tg.gain.linearRampToValueAtTime(0.15 * e.v, e.t + 0.001); tg.gain.exponentialRampToValueAtTime(1e-4, e.t + e.d);
    o.start(e.t); o.stop(e.t + e.d);
  },
};

// ── 混音 ──
/** 整段混音 → AudioBuffer（立体声 48 kHz，长度 = 成片时长）：每个事件经声像接到它的母线，两条母线共用一个混响，结尾 0.3 秒淡出。
 *  同一变体渲染两遍逐采样相同（见 sum） */
export async function renderMix(film, v, built) {
  if (!film.score) throw new Error('film has no score(v, built)');
  const { notes, reverb = {} } = film.score(v, built), dur = built.duration;
  const ac = new OfflineAudioContext(2, Math.ceil(dur * SR), SR), master = gainNode(ac, 1, ac.destination);
  master.gain.setValueAtTime(1, dur - FADE); master.gain.linearRampToValueAtTime(0, dur);
  const verb = ac.createConvolver(), ir = impulse(reverb.decay ?? 2), irb = ac.createBuffer(2, ir[0].length, SR);
  ir.forEach((x, c) => irb.copyToChannel(x, c));
  verb.buffer = irb;
  const bus = {}, feeds = {};
  for (const name of BUSES) { bus[name] = gainNode(ac, 1); bus[name].connect(gainNode(ac, reverb[name] ?? 0, verb)); feeds[name] = []; }
  const nb = ac.createBuffer(1, 2 * SR, SR);
  nb.copyToChannel(noise(2 * SR, 99), 0);
  const kit = { noise(t0, t1, seed) { const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; s.start(t0, rand(seed, 0) * 2); s.stop(t1); return s; } };
  notes.forEach((e, i) => {
    const voice = VOICES[e.voice], feed = feeds[e.bus ?? 'music'];
    if (!voice) throw new Error(`score: unknown voice ${e.voice}`);
    if (!feed) throw new Error(`score: unknown bus ${e.bus}`);
    const p = ac.createStereoPanner(); p.pan.value = e.pan ?? 0; feed.push(p);
    voice(ac, { ...e, p: e.p ?? {}, seed: i + 1 }, p, kit);
  });
  for (const name of BUSES) sum(ac, feeds[name], bus[name]);
  sum(ac, [...BUSES.map(name => bus[name]), verb], master);
  return ac.startRendering();
}

// ── 预览 ──
/** 预览里的声音：打开后按当前变体离线渲染一遍，跟着 app 的时钟播放；暂停就停，拖动、跳转、循环时从新位置接上 */
export function createSound(app, { onError = e => console.error(e) } = {}) {
  let ac = null, out = null, src = null, t0 = 0, on = false, key = null, buf = null;
  const keyOf = () => JSON.stringify({ ...app.ctx.variant, ar: null });          // 画幅不影响声音
  const stop = () => { if (src) { src.stop(); src.disconnect(); src = null; } };
  async function prepare(k) {
    key = k; buf = null;
    const b = await renderMix(app.film, app.ctx.variant, app.ctx.built);
    if (key !== k) return;                                     // 渲染期间又换了变体
    const pk = peak(b);
    out.gain.value = pk > 0.9 ? 0.9 / pk : 1;                  // 导出时由 encodeAudio 定响度；预览只防削波
    buf = b;
  }
  function tick() {
    requestAnimationFrame(tick);
    if (!on || !app.ctx.built) return;
    const k = keyOf();
    if (k !== key) { stop(); prepare(k).catch(onError); return; }
    if (!buf || !app.playing) { stop(); return; }
    if (src && Math.abs(ac.currentTime - t0 - app.t) < 0.1) return;
    stop();
    src = ac.createBufferSource(); src.buffer = buf; src.connect(out);
    t0 = ac.currentTime - app.t; src.start(0, app.t);
  }
  return {
    get on() { return on; },
    /** 开关；第一次打开要在用户操作（点击、按键）里调用，浏览器才允许出声 */
    async set(yes) {
      on = yes;
      if (!on) { stop(); return ac?.suspend(); }
      if (!ac) { ac = new AudioContext({ sampleRate: SR }); out = gainNode(ac, 1, ac.destination); requestAnimationFrame(tick); }
      return ac.resume();
    },
  };
}
```

Notes:
- **Every node that would take three or more inputs goes through `sum()`:** the pad's oscillators, the bell's partials, each bus's panners, and the master. A new voice must follow the same rule. Otherwise `check.mjs` reports `audio … DIFFERS between renders`.
- **A note's seed is its index in the time-sorted list, plus 1.** Adding a note changes the texture (pluck excitation, noise offset) of the notes after it, but never makes a render differ from itself.
- **All noise voices share one 2 s looped noise buffer.** Each note starts it at an offset taken from its seed.
- **In the preview, `createSound` only guards against clipping.** Its gain is `0.9 / peak` above a peak of 0.9. The export is normalised by `loudnessFilter`, so the preview is quieter than the MP4.

Run: `node --test factory/test/audio.test.mjs`
Expected: PASS (7 tests).

- [ ] **Step 4: The score**

`03-perfume/js/score.js`:

```js
// score.js — 配乐与音效（纯数据，浏览器与 Node 测试共用）：score(v, built) → { notes, reverb }，由 factory/engine/audio.js 合成
// 每个香型一份编曲，15 秒和 6 秒各写一版（6 秒不是截短的 15 秒）；音效和品牌动机四个香型共用，时刻从剪辑表和 EV 算出来
// 一小节固定 3 秒、四拍（80 bpm）：命中点（水滴落下、光带峰值、品牌动机）都在小节的第一拍上；配乐的起音都在十六分音符的格子上
import { BAR, EV } from '../meta.js';
import { SKUS } from '../skus.js';
import { shotAt } from '../../factory/engine/timeline.js';
import { mtof } from '../../factory/engine/audio.js';

export const BEAT = BAR / 4, STEP = BEAT / 4;             // 一拍 0.75 秒，十六分音符 0.1875 秒
export const LOGO = [2, 7, 12];                           // 品牌动机：主音之上的大二度、纯五度、八度，各香型的调式里都有；落在第 0、½、1 拍，最后一个音延长

/** 一组音：rows = [[拍, MIDI 音高, 时值（拍）, 力度], …]，拍从 t0 算起 */
const seq = (voice, t0, rows, p = {}, bus = 'music') => rows.map(([b, m, d, v]) => ({ t: t0 + b * BEAT, voice, f: mtof(m), d: d * BEAT, v, bus, p }));

// ── 各香型的编曲 ──
// 白茶：D 宫调五声（D E F# A B），古琴般的拨弦、带气声的长笛、空灵的铺底
const WT = { pluck: { t60: 2.2, bright: 0.35 }, soft: { t60: 1.6, bright: 0.2 }, low: { t60: 3.5, bright: 0.25 }, pad: { a: 1.2, r: 1, cut: 2.5, air: 0.3 } };
const whitetea = {
  tonic: 62,                                               // D4
  reverb: { decay: 3.2, music: 0.4, sfx: 0.25 },
  bed: { type: 'bandpass', f: 900, q: 0.6, a: 0.4, r: 1.2, wander: 0.8, v: 0.35 },  // 山间的雾和风
  m15: () => [
    // 0–2.25 微距：D3 + A3 的铺底慢慢升起，拨弦稀疏，像露水将落未落
    ...seq('pad', 0, [[0, 50, 3.6, 0.8], [0, 57, 3.6, 0.55]], { ...WT.pad, a: 1 }),
    ...seq('pluck', 0, [[0, 74, 3, 0.3], [1, 69, 3, 0.4], [1.5, 71, 2, 0.3], [2, 69, 3, 0.35], [2.5, 66, 3, 0.3]], WT.pluck),
    // 2.25–3 落下：气流上升，十六分音符下行 B4 A4 F#4 E4，落进 3.0 的命中
    { t: 2.25, voice: 'noise', f: 500, d: 0.75, v: 0.5, bus: 'music', p: { type: 'bandpass', q: 1.5, sweep: 7, a: 0.7, r: 0.05 } },
    ...seq('pluck', 2.25, [[0, 71, 1, 0.35], [0.25, 69, 1, 0.4], [0.5, 66, 1, 0.45], [0.75, 64, 1, 0.5]], WT.soft),
    // 3.0 命中：低音 D3、钟声 D5、铺底涨起来；之后稀疏的回声
    ...seq('pluck', 3, [[0, 50, 4, 0.6], [0, 62, 3, 0.35]], WT.low),
    ...seq('bell', 3, [[0, 74, 3.2, 0.6], [1.5, 81, 1.6, 0.2]], { bright: 0.6 }),
    ...seq('pad', 3, [[0, 50, 1.6, 1], [0, 57, 1.6, 0.7], [0, 64, 1.6, 0.4]], { ...WT.pad, a: 0.15 }),
    ...seq('pluck', 3, [[1, 69, 2, 0.25], [1.5, 74, 2, 0.2]], WT.soft),
    // 4.5 正面：长笛主题 D5 → E5 → F#5，6.0 落到 A5
    ...seq('flute', 4.5, [[0, 74, 0.9, 0.8], [1, 76, 0.45, 0.7], [1.5, 78, 0.45, 0.75]]),
    ...seq('pad', 4.5, [[0, 50, 1.6, 0.8], [0, 57, 1.6, 0.6], [0, 66, 1.6, 0.35]], WT.pad),
    ...seq('pluck', 4.5, [[0, 62, 2, 0.4], [1, 66, 2, 0.3]], WT.pluck),
    // 6.0 命中：D4 + A4 双音、钟声闪一下，铺底换到 Bm7 的颜色；主题落到 A5 再回 F#5、E5
    ...seq('pluck', 6, [[0, 62, 3, 0.55], [0, 69, 3, 0.45], [0, 47, 3, 0.45]], WT.low),
    ...seq('bell', 6, [[0, 86, 1.6, 0.35], [0.25, 81, 1.2, 0.2]], { bright: 0.8 }),
    ...seq('flute', 6, [[0, 81, 0.9, 0.85], [1, 78, 0.45, 0.6], [1.5, 76, 0.9, 0.55]]),
    ...seq('pad', 6, [[0, 47, 1.7, 0.8], [0, 54, 1.7, 0.55], [0, 57, 1.7, 0.4], [0, 62, 1.7, 0.35]], { ...WT.pad, a: 0.3 }),
    // 7.5–10.5 分解：八分音符的轻脉动，配音在这里讲香调
    ...seq('pluck', 7.5, [[0, 62, 1, 0.3], [0.5, 69, 1, 0.2], [1, 66, 1, 0.25], [1.5, 69, 1, 0.2], [2, 64, 1, 0.28], [2.5, 69, 1, 0.2], [3, 66, 1, 0.25], [3.5, 71, 1, 0.2],
      [4, 62, 1, 0.3], [4.5, 69, 1, 0.2], [5, 66, 1, 0.25], [5.5, 69, 1, 0.2], [6, 64, 1, 0.28], [6.5, 71, 1, 0.2], [7, 69, 1, 0.22], [7.5, 74, 1, 0.2]], WT.soft),
    ...seq('pad', 7.5, [[0, 50, 3.4, 0.7], [0, 57, 3.4, 0.5], [0, 64, 3.4, 0.3]], WT.pad),
    ...seq('pluck', 7.5, [[0, 50, 3, 0.45], [2, 45, 3, 0.4]], WT.low),
    // 10.5–12 喷雾：一口气，笛子轻轻吹一个长音，铺底停在 E + B 上
    ...seq('flute', 10.5, [[0, 69, 1.6, 0.45]], { a: 0.25, r: 0.4, breath: 0.6 }),
    ...seq('pad', 10.5, [[0, 52, 1.6, 0.6], [0, 59, 1.6, 0.45]], { ...WT.pad, a: 0.5 }),
    // 12.0 片尾：品牌动机（共用），D add9 的铺底和低音 D 收住
    ...seq('pad', 12, [[0, 50, 3, 0.8], [0, 57, 3, 0.6], [0, 64, 3, 0.35], [0, 66, 3, 0.25]], { ...WT.pad, a: 0.4, r: 0.8 }),
    ...seq('pluck', 12, [[0, 38, 4, 0.6], [0, 50, 4, 0.35]], WT.low),
  ],
  m6: () => [
    // 0 命中：水滴落下就开始，低音 D、钟声、铺底
    ...seq('pluck', 0, [[0, 50, 3, 0.5], [0, 62, 2, 0.3]], WT.low),
    ...seq('bell', 0, [[0, 74, 2.4, 0.55]], { bright: 0.6 }),
    ...seq('pad', 0, [[0, 50, 1.8, 0.9], [0, 57, 1.8, 0.65]], { ...WT.pad, a: 0.2 }),
    // 0.375–1.5 八分音符上行 F#4 A4 B4 D5
    ...seq('pluck', 0, [[0.5, 66, 1, 0.35], [1, 69, 1, 0.38], [1.5, 71, 1, 0.4], [1.75, 74, 1, 0.3]], WT.pluck),
    // 1.5 正面：长笛 A4 B4，2.25 光带峰值落在 D5 上，再到 E5
    ...seq('flute', 1.5, [[0, 69, 0.45, 0.7], [0.5, 71, 0.45, 0.7], [1, 74, 0.45, 0.85], [1.5, 76, 0.5, 0.65]]),
    ...seq('bell', 2.25, [[0, 86, 1.4, 0.3]], { bright: 0.8 }),
    ...seq('pad', 1.5, [[0, 47, 1.8, 0.7], [0, 54, 1.8, 0.5], [0, 62, 1.8, 0.3]], { ...WT.pad, a: 0.3 }),
    ...seq('pluck', 1.5, [[0, 47, 2, 0.5]], WT.low),
    // 3.0 片尾：品牌动机（共用），D add9 收住
    ...seq('pad', 3, [[0, 50, 3, 0.8], [0, 57, 3, 0.6], [0, 64, 3, 0.35], [0, 66, 3, 0.25]], { ...WT.pad, a: 0.4, r: 0.8 }),
    ...seq('pluck', 3, [[0, 38, 4, 0.6], [0, 50, 4, 0.35]], WT.low),
  ],
};

// 桂花、海盐、玫瑰在 Tasks 17–19 写自己的编曲；在那之前先用白茶的
export const SCORES = { whitetea, osmanthus: whitetea, seasalt: whitetea, rose: whitetea };

// ── 共用 ──
/** 品牌动机：拨弦 + 高八度的钟声，走 sfx 母线（配音压低的是 music 母线，片尾的配音盖不住它） */
export function logo(tonic, t) {
  const rows = LOGO.map((k, i) => [i * 0.5, tonic + k, i === LOGO.length - 1 ? 4 : 1.5, i === LOGO.length - 1 ? 0.8 : 0.65]);
  return [
    ...seq('pluck', t, rows, { t60: 2.5, bright: 0.45 }, 'sfx'),
    ...seq('bell', t, rows.map(([b, m, d, v]) => [b, m + 12, d, v * 0.5]), { bright: 0.5 }, 'sfx'),
  ];
}

/** 画面上的声音：水滴、转场、瓶盖和喷雾、整段的环境声；时刻都从剪辑表算 */
export function sfx(built, bed) {
  const out = [], at = (e, lt) => e.start + lt - e.from, add = (t, voice, f, d, v, p = {}, pan = 0) => out.push({ t, voice, f, d, v, pan, bus: 'sfx', p });
  const { f, v, ...p } = bed;
  add(0, 'noise', f, built.duration, v, p);
  const drop = shotAt(built, 'drop');
  if (drop) {
    const t = at(drop, EV.land);                                               // 水滴落进液面：一声向上滑的水滴声，三圈涟漪跟着变小，再加一层很轻的高频
    add(t, 'plink', mtof(81), 0.35, 0.6, { up: mtof(86) / mtof(81) });
    [[0.14, 1.3, 0.45, 0.3], [0.33, 0.92, 0.3, -0.2], [0.6, 1.18, 0.18, 0.35]].forEach(([dt, k, v, pan]) => add(t + dt, 'plink', mtof(81) * k, 0.25, v, { up: 1.4 }, pan));
    add(t, 'noise', 7000, 0.8, 0.12, { type: 'highpass', q: 0.5, a: 0.01, r: 0.7 });
  }
  const spray = shotAt(built, 'spray');
  if (spray) {
    add(at(spray, EV.lift), 'bell', 2400, 0.35, 0.5, { ratios: [1, 2.32, 4.25, 6.63], bright: 0.8 }, 0.2);   // 瓶盖离开颈圈：玻璃轻碰一声
    add(at(spray, EV.spray), 'noise', 6000, 0.7, 0.8, { type: 'bandpass', q: 0.9, sweep: 4000 / 6000, a: 0.02, r: 0.45 }, -0.3);   // 喷雾：滤波噪声，向左喷
    add(at(spray, EV.seat), 'click', 3200, 0.04, 0.3, {}, 0.2);                // 瓶盖落座
  }
  built.entries.forEach((e, i) => {                                            // 每个叠化、闪白一声气流，峰值在转场中点
    if (e.transition.type === 'cut') return;
    const mid = e.start + e.transition.dur / 2;
    add(mid - 0.4, 'noise', 450, 0.65, 0.45, { type: 'bandpass', q: 0.8, sweep: 5, a: 0.4, r: 0.25 }, i % 2 ? 0.25 : -0.25);
  });
  return out;
}

export function score(v, built) {
  const s = SCORES[SKUS[v.sku].score], arrange = { 15: s.m15, 6: s.m6 }[v.cut];
  if (!arrange) throw new Error(`score: no arrangement for the ${v.cut} s cut`);
  const notes = [...arrange(), ...logo(s.tonic, built.hits.logo), ...sfx(built, s.bed)].sort((a, b) => a.t - b.t);
  return { notes, reverb: s.reverb };
}
```

Notes:
- **The levels are set for the loudness chain.** When several attacks start together on a hit, they add up. White tea keeps each hit's stacked plucks, bell and plink low enough that the limiter trims at most about 5 dB there.
- **Level guidance for Tasks 17–19.** A new score with much hotter hits still passes, but it sounds squashed. Keep the loudest simultaneous low notes at velocity 0.6 or below.

Make these exact replacements in `03-perfume/film.js`:

1. Replace:

```js
import { SHOTS } from './js/shots.js';
```

   with:

```js
import { SHOTS } from './js/shots.js';
import { score } from './js/score.js';
```

2. Replace:

```js
  shots: SHOTS,
```

   with:

```js
  shots: SHOTS,
  /** 配乐与音效的音符表（js/score.js），由 factory/engine/audio.js 合成 */
  score,
```

Run: `node --test 03-perfume/test/score.test.mjs`
Expected: PASS (8 tests).

- [ ] **Step 5: Sound in the preview**

Make these exact replacements in `factory/engine/exporter.js`:

1. Replace:

```js
// 帧数 = 时长 × fps；每帧返回合成后的 PNG（3D + 字幕），由 render.mjs 经管道送进 ffmpeg
export function createExporter(app) {
```

   with:

```js
// 帧数 = 时长 × fps；每帧返回合成后的 PNG（3D + 字幕），由 render.mjs 经管道送进 ffmpeg
// 声音整段离线混音成一个 WAV（和预览播放的是同一块缓冲），render.mjs 把它和画面一起交给 ffmpeg
import { renderMix, peak } from './audio.js';
import { wavFloat32 } from './mix.js';

export function createExporter(app) {
```

2. Replace:

```js
    },
  };
```

   with:

```js
    },
    /** 整段混音 → 32 位浮点 WAV 的 data URL → { url, sr, duration, peak }；成片没有 score 就返回 null（无声出片） */
    async audio() {
      if (!app.film.score) return null;
      const b = await renderMix(app.film, app.ctx.variant, app.ctx.built);
      const wav = new Blob([wavFloat32([0, 1].map(c => b.getChannelData(c)), b.sampleRate)], { type: 'audio/wav' });
      const url = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(r.error); r.readAsDataURL(wav); });
      return { url, sr: b.sampleRate, duration: b.length / b.sampleRate, peak: peak(b) };
    },
  };
```

Make these exact replacements in `factory/engine/player.js`:

1. Replace:

```js
// player.js — 预览播放器：各轴的变体选择、播放 / 暂停、按镜头分段的时间轴、高画质与安全区开关、快捷键；变体写回地址栏，刷新后保持
import { allAxes } from './variant.js';
import { safeOverlay } from './sheet.js';
```

   with:

```js
// player.js — 预览播放器：各轴的变体选择、播放 / 暂停、按镜头分段的时间轴、声音、高画质与安全区开关、快捷键；变体写回地址栏，刷新后保持
import { allAxes } from './variant.js';
import { safeOverlay } from './sheet.js';
import { createSound } from './audio.js';
```

2. Replace:

```js
      <label class="hq" title="高画质（Q）"><input type="checkbox" checked /> HQ</label>
    </div>
    <p class="keys">空格 播放 · ← → 0.5 秒 · Shift + ← → 一帧 · 1–9 跳到第 n 个镜头 · S 安全区 · Q 高画质</p>
    <p class="err" hidden></p>`;
  document.body.append(bar);
  const $ = s => bar.querySelector(s), scrub = $('.scrub'), time = $('.time'), play = $('.play'), hq = $('.hq input'), err = $('.err');
```

   with:

```js
      <label class="snd" title="声音（M）"${film.score ? '' : ' hidden'}><input type="checkbox" /> 声音</label>
      <label class="hq" title="高画质（Q）"><input type="checkbox" checked /> HQ</label>
    </div>
    <p class="keys">空格 播放 · ← → 0.5 秒 · Shift + ← → 一帧 · 1–9 跳到第 n 个镜头 · S 安全区 · M 声音 · Q 高画质</p>
    <p class="err" hidden></p>`;
  document.body.append(bar);
  const $ = s => bar.querySelector(s), scrub = $('.scrub'), time = $('.time'), play = $('.play'), hq = $('.hq input'), snd = $('.snd input'), err = $('.err');
```

3. Replace:

```js
  addEventListener('keydown', e => {
    if (e.target.closest?.('select, input') && e.key !== ' ') return;
```

   with:

```js
  const sound = createSound(app, { onError: fail });            // 默认静音：浏览器只允许在点击、按键之后出声
  snd.onchange = () => sound.set(snd.checked).catch(fail);
  addEventListener('keydown', e => {
    if (e.target.closest?.('select, input:not([type=checkbox])') && e.key !== ' ') return;   // 勾过的复选框还拿着焦点，快捷键照样用
```

4. Replace:

```js
    else if (e.key === 's' || e.key === 'S') toggleSafe();
```

   with:

```js
    else if (e.key === 's' || e.key === 'S') toggleSafe();
    else if ((e.key === 'm' || e.key === 'M') && film.score) { snd.checked = !snd.checked; sound.set(snd.checked).catch(fail); }
```

Make these exact replacements in `factory/engine/player.css`:

1. Replace:

```css
.player label { display: inline-flex; align-items: center; gap: 6px; color: var(--dim); }
```

   with:

```css
.player label { display: inline-flex; align-items: center; gap: 6px; color: var(--dim); }
.player label[hidden] { display: none; }
```

Notes:
- The 声音 checkbox starts unticked. A browser only lets a page make sound after a click or a key press, and ticking it (or pressing `M`) is that gesture.
- The key handler's guard now lets shortcuts through while a checkbox has focus. Before, after clicking 声音 or HQ, `M`, `Q` and `S` did nothing until you clicked elsewhere.
- `label[hidden]` needs its own rule: `.player label`'s `display: inline-flex` would otherwise override the `hidden` attribute for a film without a score.

With `npm run serve` running, open `http://127.0.0.1:8765/03-perfume/?paused` in Chrome. Tick 声音, then press Space.

Expected:
- Sound starts about 0.9 s after ticking, while the 15 s mix renders.
- **0–2.25 s:** a low D pad swells in under sparse, 古琴-like plucks, with a soft wind of filtered noise under everything.
- **2.25 s:** a rising breath of air and four falling sixteenth notes.
- **3.0 s:** the drop lands with a bright upward plink, three smaller ripples, a deep D pluck and a bell.
- **4.5 s:** after a whoosh, the flute plays D–E–F♯.
- **6.0 s:** at the light streak, the flute reaches A with a bell flash, and the pad turns darker (B minor 7).
- **7.5–10.5 s:** a quiet eighth-note pulse. This is the room the voice-over gets in Task 16.
- **10.5–12 s:** a glass clink as the cap lifts, the spray hiss, and a small click as it seats.
- **12.0 s:** the logo: three rising notes, E, A, then a long D, each pluck with a bell above. A low D pluck and the pad hold under them, then fade out over the last 0.3 s.
- **Following the clock:**
  - ← → and 1–9 move the sound with the picture;
  - Space pauses it;
  - at the loop point it restarts from 0.
- **Changing the variant:**
  - switching to the 6 s cut re-renders (about 0.3 s). The 6 s cut opens on the landing hit and has the logo at 3 s;
  - switching the aspect ratio keeps playing without a gap.

- [ ] **Step 6: The loudness chain**

Make these exact replacements in `factory/lib/ffmpeg.mjs`:

1. Replace:

```js
// ffmpeg.mjs — 编码与校验：PNG 帧经 stdin 管道进 ffmpeg（不落临时帧文件）→ H.264 MP4；ffprobe 核对时长、尺寸、帧率、帧数、音轨
```

   with:

```js
// ffmpeg.mjs — 编码与校验：PNG 帧经 stdin 管道进 ffmpeg（不落临时帧文件）→ H.264 MP4；ffprobe 核对时长、尺寸、帧率、帧数、音轨
// 声音：WAV 先量一遍响度，增益、限幅，再量一遍补一个线性增益落到 −14 LUFS，单独编成 AAC 再量；真峰值超了就压低限幅重编，
// 成片直接拷这条音轨，最后再量一遍核对
```

2. Replace:

```js
export const hasFfmpeg = () => spawnSync('ffmpeg', ['-version']).status === 0 && spawnSync('ffprobe', ['-version']).status === 0;

/** ffmpeg 参数：stdin 上的 PNG 帧 (+ 可选的 WAV 音轨) → out（容器写死 mp4，所以 out 可以是 .mp4.part） */
export function encodeArgs({ fps, out, audio = null, afilter = null }) {
```

   with:

```js
export const LOUD = { I: -14, TP: -1.5, LRA: 20 };           // 电商平台的常见目标；TP 比验收线（−1）低 0.5 dB 留余量；LRA 只是 loudnorm 测量时要填的参数
const LIMIT = -3;                                              // 预增益之后的限幅（dBFS）：瞬态削掉后，补回响度的那点增益才不会把真峰值推过 TP

export const hasFfmpeg = () => spawnSync('ffmpeg', ['-version']).status === 0 && spawnSync('ffprobe', ['-version']).status === 0;

/** ffmpeg 参数：stdin 上的 PNG 帧 (+ 可选的、encodeAudio 编好的 AAC 音轨，原样拷进去) → out（容器写死 mp4，所以 out 可以是 .mp4.part） */
export function encodeArgs({ fps, out, audio = null }) {
```

3. Replace:

```js
  if (audio) a.push('-map', '1:a:0', ...(afilter ? ['-af', afilter] : []), ...AAC); else a.push('-an');
```

   with:

```js
  if (audio) a.push('-map', '1:a:0', '-c:a', 'copy'); else a.push('-an');
```

4. Replace:

```js
  return bad;
}
```

   with:

```js
  return bad;
}

/** ffmpeg 的 loudnorm 量一遍 file（先经 pre 滤镜链）→ { I, TP, LRA, thresh, offset } */
export function measure(file, pre = '') {
  const af = `${pre ? `${pre},` : ''}loudnorm=I=${LOUD.I}:TP=${LOUD.TP}:LRA=${LOUD.LRA}:print_format=json`;
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-map', '0:a:0', '-af', af, '-f', 'null', '-'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`loudnorm ${file}: ${r.stderr.trim().split('\n').slice(-2).join(' | ')}`);
  const j = JSON.parse(r.stderr.slice(r.stderr.lastIndexOf('{'), r.stderr.lastIndexOf('}') + 1));
  return { I: +j.input_i, TP: +j.input_tp, LRA: +j.input_lra, thresh: +j.input_thresh, offset: +j.target_offset };
}

/** 编码用的 -af：把 wav 的响度增益到目标、限幅在 limit（dBFS），再量一遍，补上限幅削掉的响度。
 *  全是线性增益，不做动态压缩，音乐的起伏不变（loudnorm 的 linear 模式条件不满足时会悄悄改做动态压缩，所以不用它） */
export function loudnessFilter(wav, limit = LIMIT) {
  const raw = measure(wav);
  if (!Number.isFinite(raw.I)) throw new Error(`${wav} is silent: no loudness to normalise`);
  const pre = `volume=${(LOUD.I - raw.I).toFixed(2)}dB,alimiter=limit=${Math.pow(10, limit / 20).toFixed(3)}:level=false:latency=true`, m = measure(wav, pre);
  return `${pre},volume=${(LOUD.I - m.I).toFixed(2)}dB`;
}

/** wav → out（AAC，mp4 容器）：经 loudnessFilter 编码后再量。AAC 编码会把真峰值推高（高频多的段落，实测最多 3 dB），
 *  高过 tp 就把限幅再压低超出的量加 0.3 dB，重编，最多 4 遍 → 最后一遍量到的 { I, TP, LRA, thresh, offset, limit } */
export function encodeAudio(wav, out, tp = LOUD.TP) {
  let limit = LIMIT, m;
  for (let i = 0; i < 4; i++) {
    const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-af', loudnessFilter(wav, limit), ...AAC, '-f', 'mp4', out], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`aac ${wav}: ${r.stderr.trim().split('\n').slice(-2).join(' | ')}`);
    m = { ...measure(out), limit };
    if (m.TP <= tp) break;
    limit = Math.round((limit - (m.TP - tp + 0.3)) * 100) / 100;
  }
  return m;
}

/** 成片的响度与目标比对，返回问题列表（空 = 通过）：综合响度 ±1 LU，真峰值 ≤ −1 dBTP */
export function checkLoudness({ I, TP }) {
  const bad = [];
  if (!(Math.abs(I - LOUD.I) <= 1)) bad.push(`loudness ${I} LUFS ≠ ${LOUD.I} ± 1`);
  if (!(TP <= -1)) bad.push(`true peak ${TP} dBTP > −1`);
  return bad;
}
```

Notes:
- `loudnorm` prints its measurement as JSON at the end of stderr, and `measure` parses the last `{…}`.
- On silence, `loudnorm` reports `-inf`, which parses to `NaN`, so `loudnessFilter` throws instead of building a filter with an infinite gain.
- `checkLoudness` is written with negated comparisons, so a `NaN` measurement fails.
- **Each pass measures again instead of predicting.** The AAC overshoot doesn't follow the limit smoothly. On Task 16's narrated 6 s mix, limits of −3, −4, −4.5 and −5 dBFS gave overshoots of 3.0, 1.25, 1.33 and 0.07 dB.
- `encodeAudio` runs ffmpeg synchronously, as `measure` does. One pass takes about 2 s for the 15 s mix.

Run: `node --test factory/test/ffmpeg.test.mjs`
Expected: PASS (8 tests). The two `encodeAudio` tests take about 3 s each.

- [ ] **Step 7: Audio in the batch render and the pre-flight**

Make these exact replacements in `factory/render.mjs`:

1. Replace:

```js
// render.mjs — 批量出片：清单（或 --all、或命令行给的网格）→ 每个变体开一页无头 Chromium，逐帧 PNG 经管道进 ffmpeg → MP4 + 封面 + 说明文件 → out/index.json
```

   with:

```js
// render.mjs — 批量出片：清单（或 --all、或命令行给的网格）→ 每个变体开一页无头 Chromium，逐帧 PNG 经管道进 ffmpeg → MP4 + 封面 + 说明文件 → out/index.json
// 声音：页面把整段混音交成一个 WAV（临时文件），encodeAudio 把它编成 −14 LUFS 的 AAC，出片时原样拷进去；成片量一遍响度，不达标算失败
```

2. Replace:

```js
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
```

   with:

```js
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
```

3. Replace:

```js
import { encodeArgs, startEncode, probe, checkProbe, hasFfmpeg } from './lib/ffmpeg.mjs';
```

   with:

```js
import { encodeArgs, startEncode, probe, checkProbe, hasFfmpeg, measure, encodeAudio, checkLoudness } from './lib/ffmpeg.mjs';
```

4. Replace:

```js
  let page = null, enc = null;
```

   with:

```js
  let page = null, enc = null, wav = null, aac = null;
```

5. Replace:

```js
    enc = startEncode(encodeArgs({ fps, out: p.part }));
```

   with:

```js
    const a = await page.evaluate(() => window.__app.exporter.audio());      // 片子没有 score 就是 null：出无声的片
    if (a) {
      wav = path.join(os.tmpdir(), `${name}.${process.pid}.wav`); aac = `${wav}.m4a`;
      fs.writeFileSync(wav, b64(a.url)); encodeAudio(wav, aac);
    }
    enc = startEncode(encodeArgs({ fps, out: p.part, audio: aac }));
```

6. Replace:

```js
    const pr = probe(p.part), bad = checkProbe(pr, { duration: job.duration, width: W, height: H, fps, audio: false });
    if (bad.length) throw new Error(`ffprobe: ${bad.join('; ')}`);
```

   with:

```js
    const pr = probe(p.part), bad = checkProbe(pr, { duration: job.duration, width: W, height: H, fps, audio: !!wav });
    if (bad.length) throw new Error(`ffprobe: ${bad.join('; ')}`);
    const loud = wav && measure(p.part), off = loud ? checkLoudness(loud) : [];
    if (off.length) throw new Error(`loudness: ${off.join('; ')}`);
```

7. Replace:

```js
      duration: job.duration, width: W, height: H, fps, frames: pr.frames, bytes: pr.bytes, audio: false, lufs: null, renderMs: ms,
```

   with:

```js
      duration: job.duration, width: W, height: H, fps, frames: pr.frames, bytes: pr.bytes,
      audio: !!wav, lufs: loud ? Math.round(loud.I * 10) / 10 : null, tp: loud ? Math.round(loud.TP * 10) / 10 : null, renderMs: ms,
```

8. Replace:

```js
    await page?.context().close();
```

   with:

```js
    await page?.context().close();
    for (const f of [wav, aac]) if (f) fs.rmSync(f, { force: true });
```

Make these exact replacements in `factory/check.mjs`:

1. Replace:

```js
// check.mjs — 批量出片前的自检：GPU、字体、确定性、清单里每个变体的字幕溢出、速度
//   node factory/check.mjs 03-perfume [--all] [--<axis> v1,v2]
// 确定性：每个剪辑的关键帧和转场中点先顺着画、再倒着画，两遍逐字节相同；溢出：每个变体每个镜头画一帧（同一镜头的字幕排版与时刻无关）
```

   with:

```js
// check.mjs — 批量出片前的自检：GPU、字体、确定性、声音、清单里每个变体的字幕溢出、速度
//   node factory/check.mjs 03-perfume [--all] [--<axis> v1,v2]
// 确定性：每个剪辑的关键帧和转场中点先顺着画、再倒着画，两遍逐字节相同；声音：每个剪辑的混音渲染两遍逐字节相同、不是静音
// 溢出：每个变体每个镜头画一帧（同一镜头的字幕排版与时刻无关）
```

2. Replace:

```js
  report('determinism', !det.bad.length, det.bad.length ? `frames differ between passes: ${det.bad.join(', ')}` : `${det.n} frames identical forward and backward`);

  const t1 = Date.now(), over = [];
```

   with:

```js
  report('determinism', !det.bad.length, det.bad.length ? `frames differ between passes: ${det.bad.join(', ')}` : `${det.n} frames identical forward and backward`);

  const snd = await page.evaluate(async cuts => {
    const app = window.__app, out = [];
    if (!app.film.score) return null;
    for (const cut of cuts) {
      await app.setVariant({ cut });
      const t0 = performance.now(), a = await app.exporter.audio(), ms = performance.now() - t0, b = await app.exporter.audio();
      out.push({ cut, ms, peak: a.peak, same: a.url === b.url });
    }
    return out;
  }, Object.keys(META.cuts));
  if (!snd) report('audio', true, 'the film has no score: silent videos');
  else report('audio', snd.every(r => r.same && r.peak > 0), snd.map(r => `${r.cut} s ${r.same ? 'identical twice' : 'DIFFERS between renders'}, peak ${(20 * Math.log10(r.peak)).toFixed(1)} dBFS, ${r.ms.toFixed(0)} ms`).join(' · '));

  const t1 = Date.now(), over = [];
```

Run: `node factory/check.mjs 03-perfume; echo "exit $?"`
Expected: every line `ok`, with a new line after `determinism`:
```
ok    audio        6 s identical twice, peak -10.2 dBFS, 273 ms · 15 s identical twice, peak -10.9 dBFS, 870 ms
```
then `all checks passed` and `exit 0`.

Run: `node factory/render.mjs 03-perfume --sku whitetea --cut 15,6 --ar 9x16 --out /tmp/t15 --force; echo "exit $?"`
Expected:
- One line per video, e.g. `[2/2] wenjing_whitetea_6s_9x16_zh  180 frames  37.8 s (4.8 fps)  6.1 MB` and `[1/2] wenjing_whitetea_15s_9x16_zh  450 frames  70.9 s (6.3 fps)  13.3 MB`. Encoding and measuring the audio adds 2–6 s per video.
- Then `done 2, skipped 0, failed 0  ·  1.2 min  ·  …` and `exit 0`.
- `/tmp/t15/wenjing_whitetea_15s_9x16_zh.json` has `"audio": true, "lufs": -14, "tp": -1.5`. The 6 s sidecar has `"lufs": -14.1, "tp": -2.5`.
- `ffprobe -v error -show_entries stream=codec_type,start_time,duration,sample_rate -of compact /tmp/t15/wenjing_whitetea_15s_9x16_zh.mp4` prints:
  ```
  stream|codec_type=video|start_time=0.000000|duration=15.000000
  stream|codec_type=audio|sample_rate=48000|start_time=0.000000|duration=15.000000
  ```
- No `*.wav` or `*.wav.m4a` is left in `$TMPDIR`.
- Played in QuickTime, the MP4 sounds like the preview, only louder. The hits (3 s, 6 s, 12 s) still have their attack.

- [ ] **Step 8: Run all tests and commit**

Run: `npm test`
Expected: PASS, 121 tests.

```bash
git add factory/engine/audio.js 03-perfume/js/score.js 03-perfume/film.js factory/engine/exporter.js factory/engine/player.js factory/engine/player.css factory/lib/ffmpeg.mjs factory/render.mjs factory/check.mjs factory/test/audio.test.mjs 03-perfume/test/score.test.mjs factory/test/ffmpeg.test.mjs
git commit -m "Add the synthesized score and sound effects (white tea), sound in the preview, and loudness-normalised audio in the batch render

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 16: Voice-over — `vo.mjs`, the clips in the mix, the duck

This task adds the narration. `factory/vo.mjs` has Kokoro read every planned line and stores the clips in `03-perfume/assets/vo/`, where they are committed. The engine then places each variant's clips in the mix, and the music ducks under every line. The same mix plays in the preview and goes into every MP4. A missing clip, an out-of-date clip or a clip longer than its slot fails loudly: in the preview, in the render and in `check.mjs`.

**The lines** come from Task 7's `voLines(v)` in `copy.js`:
- The 15 s cut has three lines: `hero` at 4.6 s, `notes` at 7.7 s and `end` at 12.3 s. The 6 s cut has one, `one` at 1.1 s. `vo: 'off'` has none.
- A line's id names the scent, language, cut and slot, and the promo for `end` and `one`, e.g. `whitetea_en_15_end_1111`. The same id has the same words in every variant.
- The manifest's variants have 64 distinct lines: 4 scents × 2 languages × (hero, notes, 3 end lines + 3 lines for the 6 s cut).
- **Two changes to Task 7's copy**, both found by measuring the real clips:
  - The `end` slot is now 2.4 s long instead of 2.6 s. The cut's last 0.3 s is the master fade (Task 15), and a line must be finished before it. The data test now checks every slot against `duration − 0.3`.
  - The English 11.11 end line is now `Eleven-eleven: sixty-nine dollars.` The first wording, `Eleven-eleven price: …`, ran 2.6–2.7 s with a slower voice, even at 1.15× speed.

**Making the clips** (`factory/vo.mjs`):
- Each line goes through the Kokoro Lambda with `tts.sh <voice> <out.wav> <text>`, at `SPEED[lang]`.
- The WAV is processed with ffmpeg:
  1. trim the silence at both ends, keeping 50 ms before and 80 ms after;
  2. bring it to `VO_LUFS` = −20 LUFS;
  3. limit its peaks at `VO_PEAK` = −6 dBFS;
  4. measure again and make up what the limiter took;
  5. encode mono 48 kbps MP3 to `assets/vo/<id>.mp3`.
- **Why the limiter:** speech peaks are 16–20 dB above its loudness, on the plosives. Unlimited, those peaks would reach the film's −3 dBFS master limiter (Task 15) after the loudness gain. The limiter would then pull the whole mix down on every syllable, and the music would pump with the words. Limited here, they stay below it.
- **`index.json`** records `{ text, voice, speed, rate, dur, lufs }` for every clip.
  - A clip is made again only when its line's text, voice or speed has changed (`fresh()`), or with `--force`.
  - Clips of lines no longer in the plan are deleted, file and entry.
- **Too long:** if a clip is longer than its slot's `max`, it is read again faster, up to `MAX_RATE` = 1.15×. If it still doesn't fit, `vo.mjs` lists the line and exits 1. Reword that line in `copy.js`.
- **Kokoro overwrites its own output.** Its Lambda names each result `tts-out/<voice>-<whole seconds>.<fmt>` (`app.py`). Two requests for the same voice in the same second get the same S3 key, and one line gets the other's recording.
  - The first full run of this task produced 13 such pairs.
  - So `vo.mjs` sends one request per voice at a time. Different voices still run in parallel.
  - `vo.test.mjs` fails if two lines with different words have byte-identical clips.
- **The clips are committed**, about 0.8 MB, so rendering needs no AWS access. Only `vo.mjs` calls Kokoro.
- **`--audition`** reads the white-tea 15 s lines with every voice in `film.audition` and writes `out/audition/<lang>_<voice>.mp3`. That is how `VOICE` was chosen: `zm_yunxi` for Chinese and `bf_emma` for English.

**The clips in the mix** (`factory/engine/audio.js`):
- **`voPlan(film, v, index)`** resolves the variant's lines against the index. It throws on:
  - a line with no clip;
  - a clip made from other words, another voice or another speed;
  - a clip longer than its slot.
  `check.mjs` runs the same function over the whole manifest.
- **Loading.** `renderMix` fetches `assets/vo/index.json` and the clips, relative to the film page. `decodeAudioData` decodes each clip once and resamples it to 48 kHz; the decoded clips are cached.
- **The voice.** Each clip starts exactly at its line's `at`. The clips go through one gain of `VO.gain` = 0.6 into the master, centred and dry (no reverb).
- **The duck.** The `music` bus drops by `VO.duck` = −9 dB under every line. It starts `VO.attack` = 0.12 s before the line and comes back over `VO.release` = 0.3 s after it.
  - `duck()` merges two lines that are too close for the music to come back between them.
  - The `sfx` bus is not ducked, so the logo and the effects keep their level.
- **Levels.** Measured on white tea, the voice sits 10–14 dB above the ducked music and effects in the 15 s cut, and about 8 dB above them in the 6 s cut, where the line is over the busiest music.
- **With `vo: 'off'`** the mix is sample-identical to Task 15's.

**Files:**
- Create:
  - `factory/vo.mjs`, `03-perfume/test/vo.test.mjs`;
  - `03-perfume/assets/vo/*.mp3` and `03-perfume/assets/vo/index.json`, generated in Step 7.
- Modify: `factory/engine/audio.js`, `03-perfume/copy.js`, `03-perfume/film.js`, `factory/check.mjs`
- Test: `factory/test/audio.test.mjs`, `03-perfume/test/data.test.mjs`, `03-perfume/test/vo.test.mjs`

**Interfaces:**
- Consumes:
  - Task 2: `expandJobs(film, manifest)`. The manifest only needs `{ jobs }`, and an axis written `['*']` means all its values.
  - Task 7: `voLines(v) → [{ id, text, voice, speed, at, max }]`, `VOICE`, `AUDITION`, `SPEED`, `SLOTS`.
  - Task 8: `ROOT`, `parseArgs(argv) → { pos, o }`. Task 10: `pool(items, n, fn) → results[]`, with `{ error }` for failures.
  - Task 15: `measure(file, pre)`, and `renderMix`, `sum()` and `gainNode()` inside `audio.js`.
  - Kokoro: `tts.sh <voice> <out> <text>`, with `SPEED`, `REGION` and `FUNC` read from the environment.
- Produces:
  - `engine/audio.js`:
    - `VO = { gain: 0.6, duck: -9, attack: 0.12, release: 0.3 }`;
    - `fresh(entry, line) → boolean`;
    - `voPlan(film, v, index) → [{ id, at, dur, file }]`, which throws;
    - `duck(spans, { depth, attack, release }) → [[t, gain], …]`.
  - `factory/vo.mjs`:
    - CLI: `node factory/vo.mjs <film> [--audition] [--force] [--dry] [--out dir]`. It exits 1 on a failed or too-long line, and `KOKORO_TTS` overrides the path to `tts.sh`.
    - Exports: `VO_LUFS` = −20, `VO_PEAK` = −6, `MAX_RATE` = 1.15, `plannedLines(film)`.
  - Film contract:
    - `voLines(v)`, and `audition: { [lang]: [voice, …] }`;
    - `film.js` must import in Node, because `vo.mjs` loads it;
    - the clips live in `<film>/assets/vo/`.
  - Clip index: `assets/vo/index.json` = `{ [id]: { text, voice, speed, rate, dur, lufs } }`.
  - `check.mjs` prints a `voice-over` line before `audio`.
  - Tasks 17–19 change no lines: `skus.js` already has every scent's words, so all 64 clips exist after this task.

- [ ] **Step 1: Write the failing tests**

The audio test pins the two pure functions:
- `duck` gives the exact envelope for one line, two separate lines, two merged lines and a line at the very start.
- `voPlan` passes a current clip and refuses a missing, stale or too-long one. A variant with `vo: 'off'` and a film without `voLines` give no clips.

Make these exact replacements in `factory/test/audio.test.mjs`:

1. Replace:

```js
import { pluck, noise, impulse, mtof, SR, VOICES, BUSES } from '../engine/audio.js';
```

   with:

```js
import { pluck, noise, impulse, mtof, SR, VOICES, BUSES, VO, duck, voPlan } from '../engine/audio.js';
```

2. Replace:

```js
  assert.deepEqual(BUSES, ['music', 'sfx']);
});
```

   with:

```js
  assert.deepEqual(BUSES, ['music', 'sfx']);
});

test('duck: each line dips the music from attack before it to release after it', () => {
  const o = { depth: -9, attack: 0.12, release: 0.3 }, g = Math.pow(10, -9 / 20);
  const same = (a, b) => { assert.equal(a.length, b.length, JSON.stringify(a)); a.forEach(([t, v], i) => assert.ok(Math.abs(t - b[i][0]) < 1e-9 && Math.abs(v - b[i][1]) < 1e-9, `point ${i}: ${[t, v]} ≠ ${b[i]}`)); };
  same(duck([], o), [[0, 1]]);
  same(duck([{ at: 4.6, dur: 2 }], o), [[0, 1], [4.48, 1], [4.6, g], [6.6, g], [6.9, 1]]);
  same(duck([{ at: 5, dur: 1 }, { at: 1, dur: 1 }], o), [[0, 1], [0.88, 1], [1, g], [2, g], [2.3, 1], [4.88, 1], [5, g], [6, g], [6.3, 1]]);
  // 两句之间来不及回来（7.58 < 7.4 + 0.3）：一直压着
  same(duck([{ at: 4.6, dur: 2.8 }, { at: 7.7, dur: 2.6 }], o), [[0, 1], [4.48, 1], [4.6, g], [10.3, g], [10.6, 1]]);
  // 一开头就有配音
  same(duck([{ at: 0, dur: 1 }], o), [[0, g], [1, g], [1.3, 1]]);
  same(duck([{ at: 0.06, dur: 1 }], o), [[0, 1 + (g - 1) / 2], [0.06, g], [1.06, g], [1.36, 1]]);
  assert.equal(duck([{ at: 2, dur: 1 }])[2][1], Math.pow(10, VO.duck / 20));
});

test('voPlan: every line needs a clip made from its current text, voice and speed, no longer than its slot', () => {
  const film = { id: 'demo', voLines: v => (v.vo === 'off' ? [] : [{ id: 'a', text: 'Hello.', voice: 'af_heart', speed: 1, at: 1, max: 2 }]) };
  const ok = { a: { text: 'Hello.', voice: 'af_heart', speed: 1, rate: 1, dur: 1.5, lufs: -20 } }, on = { vo: 'on' };
  assert.deepEqual(voPlan(film, on, ok), [{ id: 'a', at: 1, dur: 1.5, file: 'a.mp3' }]);
  assert.deepEqual(voPlan(film, { vo: 'off' }, {}), []);
  assert.deepEqual(voPlan({ id: 'mute' }, on, {}), []);
  assert.throws(() => voPlan(film, on, {}), /voice-over clip missing: a \(run: node factory\/vo\.mjs demo\)/);
  for (const k of [{ text: 'Hi.' }, { voice: 'bf_emma' }, { speed: 1.1 }]) assert.throws(() => voPlan(film, on, { a: { ...ok.a, ...k } }), /voice-over clip out of date: a/);
  assert.throws(() => voPlan(film, on, { a: { ...ok.a, dur: 2.2 } }), /a is 2\.2 s, longer than its 2 s slot/);
  assert.throws(() => voPlan(film, on, { a: { ...ok.a, dur: undefined } }), /longer than its 2 s slot/);
});
```

The data test now keeps every slot out of the fade-out.

Make these exact replacements in `03-perfume/test/data.test.mjs`:

1. Replace:

```js
      assert.ok(l.at >= 0 && l.at + l.max <= dur, `${l.id} slot leaves the cut`);
```

   with:

```js
      assert.ok(l.at >= 0 && l.at + l.max <= dur - 0.3 + 1e-9, `${l.id} slot runs into the last 0.3 s of the cut (the fade-out)`);
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `node --test factory/test/audio.test.mjs 03-perfume/test/data.test.mjs`
Expected: FAIL.
- `audio.test.mjs` fails with `SyntaxError: The requested module '../engine/audio.js' does not provide an export named 'VO'`.
- In `data.test.mjs`, `voice-over lines: no digits, inside the cut, no overlaps, stable ids` fails with `whitetea_zh_15_end_none slot runs into the last 0.3 s of the cut (the fade-out)`.

- [ ] **Step 3: The clips in the mix**

Make these exact replacements in `factory/engine/audio.js`:

1. Replace:

```js
// 音色里的"随机"（拨弦的激励、噪声、混响的尾巴）都取自 rng.js；多路信号汇到一处时两两相加（sum）：同一变体渲染两遍逐采样相同
```

   with:

```js
// 音色里的"随机"（拨弦的激励、噪声、混响的尾巴）都取自 rng.js；多路信号汇到一处时两两相加（sum）：同一变体渲染两遍逐采样相同
// 配音片段（factory/vo.mjs 生成，在成片页面旁边的 assets/vo/）按 film.voLines(v) 排进混音，配乐在每句下面让开
```

2. Replace:

```js
export const BUSES = ['music', 'sfx'];                         // music：配乐（Task 16 起在配音下压低）；sfx：音效和品牌动机，不压
```

   with:

```js
export const BUSES = ['music', 'sfx'];                         // 音符走的母线。music：配乐，在配音下压低；sfx：音效和品牌动机，不压
```

3. Replace:

```js
// ── 混音 ──
/** 整段混音 → AudioBuffer（立体声 48 kHz，长度 = 成片时长）：每个事件经声像接到它的母线，两条母线共用一个混响，结尾 0.3 秒淡出。
 *  同一变体渲染两遍逐采样相同（见 sum） */
```

   with:

```js
// ── 配音 ──
/** 配音进混音的增益：片段已统一到 −20 LUFS 单声道，放到两个声道上是 −17 LUFS，× 0.6 后约 −21.4 LUFS，比压低后的配乐和音效高 8–13 dB；
 *  配乐在每句下面压低 duck dB，提前 attack 秒开始压，句末 release 秒回来 */
export const VO = { gain: 0.6, duck: -9, attack: 0.12, release: 0.3 };

/** 片段还能用：它是按这句现在的文字、音色、语速生成的（factory/vo.mjs 用同一个判断决定要不要重新生成） */
export const fresh = (e, l) => !!e && e.text === l.text && e.voice === l.voice && e.speed === l.speed;

/** 变体的台词 × 片段索引（assets/vo/index.json）→ [{ id, at, dur, file }]。缺片段、片段过期、比时段长都直接报错：成片不会悄悄少一句 */
export function voPlan(film, v, index) {
  const fix = `run: node factory/vo.mjs ${film.id}`;
  return (film.voLines?.(v) ?? []).map(l => {
    const e = index[l.id];
    if (!e) throw new Error(`voice-over clip missing: ${l.id} (${fix})`);
    if (!fresh(e, l)) throw new Error(`voice-over clip out of date: ${l.id} was made from "${e.text}" (${e.voice}, speed ${e.speed}) (${fix})`);
    if (!(e.dur <= l.max)) throw new Error(`voice-over clip ${l.id} is ${e.dur} s, longer than its ${l.max} s slot`);
    return { id: l.id, at: l.at, dur: e.dur, file: `${l.id}.mp3` };
  });
}

/** 配乐让位：spans = [{ at, dur }] → music 母线的增益折线 [[t, g], …]（线性增益，从 t = 0 开始，点之间线性过渡）。
 *  每句前 attack 秒开始压到 depth dB，句末 release 秒回到 1；两句挨得太近、中间来不及回来的，合成一段一直压着 */
export function duck(spans, { depth = VO.duck, attack = VO.attack, release = VO.release } = {}) {
  const g = Math.pow(10, depth / 20), runs = [];
  for (const { at, dur } of [...spans].sort((a, b) => a.at - b.at)) {
    const last = runs.at(-1);
    if (last && at - attack <= last[1] + release) last[1] = Math.max(last[1], at + dur);
    else runs.push([at, at + dur]);
  }
  const pts = [[0, 1]];
  for (const [a, b] of runs) {
    if (a > attack) pts.push([a - attack, 1]); else pts[0][1] = 1 + (g - 1) * (1 - a / attack);   // 一开头就有配音：从压到一半（或压满）开始
    if (a > 0) pts.push([a, g]);
    pts.push([b, g], [b + release, 1]);
  }
  return pts;
}

const decoded = new Map();                                     // 解码过的片段（48 kHz 的 AudioBuffer 不属于某个上下文，可以反复用）：url + 索引条目 → Promise
/** 当前变体的配音片段 → [{ id, at, dur, buffer }]；ac 用来解码（decodeAudioData 顺便重采样到 48 kHz） */
async function voClips(film, v, ac) {
  if (!film.voLines?.(v).length) return [];
  const base = new URL('assets/vo/', document.baseURI), res = await fetch(new URL('index.json', base));
  if (!res.ok) throw new Error(`voice-over index missing: ${res.url} (run: node factory/vo.mjs ${film.id})`);
  const index = await res.json();
  return Promise.all(voPlan(film, v, index).map(async c => {
    const url = new URL(c.file, base).href, key = `${url} ${JSON.stringify(index[c.id])}`;
    if (!decoded.has(key)) {
      decoded.set(key, fetch(url).then(r => { if (!r.ok) throw new Error(`voice-over clip missing: ${url}`); return r.arrayBuffer(); })
        .then(b => ac.decodeAudioData(b)).catch(e => { decoded.delete(key); throw e; }));
    }
    return { ...c, buffer: await decoded.get(key) };
  }));
}

// ── 混音 ──
/** 整段混音 → AudioBuffer（立体声 48 kHz，长度 = 成片时长）：每个事件经声像接到它的母线，两条母线共用一个混响；
 *  配音片段不进混响，放在正中，每句下面 music 母线按 duck 压低；结尾 0.3 秒淡出。同一变体渲染两遍逐采样相同（见 sum） */
```

4. Replace:

```js
  const ac = new OfflineAudioContext(2, Math.ceil(dur * SR), SR), master = gainNode(ac, 1, ac.destination);
```

   with:

```js
  const ac = new OfflineAudioContext(2, Math.ceil(dur * SR), SR), master = gainNode(ac, 1, ac.destination), clips = await voClips(film, v, ac);
```

5. Replace:

```js
  sum(ac, [...BUSES.map(name => bus[name]), verb], master);
```

   with:

```js
  const [p0, ...pts] = duck(clips), mg = bus.music.gain;
  mg.setValueAtTime(p0[1], 0);
  for (const [t, g] of pts) mg.linearRampToValueAtTime(g, t);
  const vo = gainNode(ac, VO.gain);
  sum(ac, clips.map(c => { const s = ac.createBufferSource(); s.buffer = c.buffer; s.start(c.at); return s; }), vo);   // 单声道接进立体声：两个声道各一份
  sum(ac, [...BUSES.map(name => bus[name]), verb, ...(clips.length ? [vo] : [])], master);
```

Notes:
- **The music bus's gain carries the duck** as a chain of linear ramps from t = 0. The envelope is part of the offline render, so two renders are still sample-identical.
- **The clips are mono.** A mono source into the stereo VO gain plays the same signal on both channels, which centres it.
- **The VO gain joins the master's `sum()` only when there are clips.** A variant without narration then builds exactly Task 15's graph, and its mix is sample-identical to Task 15's.
- **A decoded clip is cached under its URL and its index entry.** Regenerating a clip changes its entry, so the next render decodes the new file. A failed load is dropped from the cache, so it is retried after `vo.mjs` runs.

Run: `node --test factory/test/audio.test.mjs`
Expected: PASS (9 tests).

- [ ] **Step 4: The copy and the film contract**

Make these exact replacements in `03-perfume/copy.js`:

1. Replace:

```js
export const VOICE = { zh: 'zm_yunjian', en: 'am_michael' };           // Task 16 试听后定稿
export const AUDITION = { zh: ['zf_xiaoxiao', 'zf_xiaoyi', 'zm_yunjian', 'zm_yunxi'], en: ['af_heart', 'bf_emma', 'am_michael', 'bm_george'] };
export const SPEED = { zh: 1, en: 1 };
// 时段（成片秒）：[开始, 最长]
export const SLOTS = { 15: { hero: [4.6, 2.8], notes: [7.7, 2.6], end: [12.3, 2.6] }, 6: { one: [1.1, 3.7] } };
```

   with:

```js
export const VOICE = { zh: 'zm_yunxi', en: 'bf_emma' };               // 试听（node factory/vo.mjs 03-perfume --audition）后选定
export const AUDITION = { zh: ['zf_xiaoxiao', 'zf_xiaoyi', 'zm_yunjian', 'zm_yunxi'], en: ['af_heart', 'bf_emma', 'am_michael', 'bm_george'] };
export const SPEED = { zh: 1, en: 1 };
// 时段（成片秒）：[开始, 最长]；每句在成片最后 0.3 秒的淡出之前念完
export const SLOTS = { 15: { hero: [4.6, 2.8], notes: [7.7, 2.6], end: [12.3, 2.4] }, 6: { one: [1.1, 3.7] } };
```

2. Replace:

```js
  en: { none: k => `Wenjing ${k.name.en}. Breathe in.`, 1111: (k, d) => `Eleven-eleven price: ${d} dollars.`, launch: k => `New from Wenjing: ${k.name.en}.` },
```

   with:

```js
  en: { none: k => `Wenjing ${k.name.en}. Breathe in.`, 1111: (k, d) => `Eleven-eleven: ${d} dollars.`, launch: k => `New from Wenjing: ${k.name.en}.` },
```

Make these exact replacements in `03-perfume/film.js`:

1. Replace:

```js
import { score } from './js/score.js';
```

   with:

```js
import { score } from './js/score.js';
import { voLines, AUDITION } from './copy.js';
```

2. Replace:

```js
  score,
```

   with:

```js
  score,
  /** 配音台词（copy.js）：factory/vo.mjs 按它生成 assets/vo/，引擎按它把片段排进混音 */
  voLines,
  audition: AUDITION,
```

Run: `node --test 03-perfume/test/data.test.mjs`
Expected: PASS (8 tests).

- [ ] **Step 5: The clip test**

The clip test works on the committed clips, so it runs without AWS. It checks that:
- every planned line has a current clip, and no clip is left over;
- every clip fits its slot at no more than `MAX_RATE`, at `VO_LUFS`;
- lines with different words are different recordings, which catches Kokoro's key collision;
- the folder stays small;
- every variant in the full grid resolves to its clips, and the engine refuses a missing one.

`03-perfume/test/vo.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import film from '../film.js';
import { plannedLines, VO_LUFS, MAX_RATE } from '../../factory/vo.mjs';
import { voPlan, fresh } from '../../factory/engine/audio.js';
import { expandJobs } from '../../factory/engine/variant.js';

const dir = new URL('../assets/vo/', import.meta.url), index = JSON.parse(fs.readFileSync(new URL('index.json', dir), 'utf8'));
const lines = plannedLines(film), fix = 'run: node factory/vo.mjs 03-perfume';

test('every planned line has a clip made from its current text, voice and speed', () => {
  assert.equal(lines.length, 64);                                      // 4 香型 × 2 语言 ×（15 秒 hero、notes、3 种片尾 + 6 秒 3 种）
  for (const l of lines) {
    assert.ok(index[l.id], `${l.id}: no clip (${fix})`);
    assert.ok(fresh(index[l.id], l), `${l.id}: the clip says "${index[l.id].text}" in ${index[l.id].voice}; the line is now "${l.text}" in ${l.voice} (${fix})`);
    assert.ok(fs.existsSync(new URL(`${l.id}.mp3`, dir)), `${l.id}.mp3 is missing (${fix} --force)`);
  }
});

test('every clip fits its slot, at most MAX_RATE faster than planned, at VO_LUFS', () => {
  for (const l of lines) {
    const e = index[l.id];
    assert.ok(e.dur > 0.5 && e.dur <= l.max, `${l.id}: ${e.dur} s in a ${l.max} s slot`);
    assert.ok(e.rate >= l.speed && e.rate <= MAX_RATE, `${l.id}: rate ${e.rate}`);
    assert.equal(e.lufs, VO_LUFS);
  }
});

test('no clip is left over from a line that is no longer planned', () => {
  const ids = new Set(lines.map(l => l.id)), files = fs.readdirSync(dir).filter(f => f !== 'index.json');
  assert.deepEqual(Object.keys(index).filter(id => !ids.has(id)), []);
  assert.deepEqual(files.filter(f => !f.endsWith('.mp3') || !ids.has(f.slice(0, -4))), []);
});

test('lines with different words are different recordings', () => {
  const seen = new Map();                                              // Kokoro 的输出文件互相覆盖时，一句会拿到另一句的录音
  for (const l of lines) {
    const h = fs.readFileSync(new URL(`${l.id}.mp3`, dir)).toString('base64'), o = seen.get(h);
    assert.ok(!o || o.text === l.text, `${l.id}.mp3 ("${l.text}") is byte-identical to ${o?.id}.mp3 ("${o?.text}")`);
    seen.set(h, l);
  }
});

test('the clips stay small enough to commit', () => {
  const bytes = fs.readdirSync(dir).reduce((s, f) => s + fs.statSync(new URL(f, dir)).size, 0);
  assert.ok(bytes < 1.5e6, `${(bytes / 1e6).toFixed(2)} MB`);
});

test('every variant resolves to its clips, and the engine refuses a missing one', () => {
  const vs = expandJobs(film, { jobs: [Object.fromEntries(Object.keys(film.axes).map(k => [k, ['*']]))] });
  for (const v of vs) assert.equal(voPlan(film, v, index).length, v.vo === 'off' ? 0 : v.cut === 6 ? 1 : 3, JSON.stringify(v));
  const v = vs.find(x => x.vo === 'on' && x.cut === 15), { [`${v.sku}_${v.lang}_15_hero`]: gone, ...rest } = index;
  assert.ok(gone);
  assert.throws(() => voPlan(film, v, rest), new RegExp(`voice-over clip missing: ${v.sku}_${v.lang}_15_hero`));
});
```

Run: `node --test 03-perfume/test/vo.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `factory/vo.mjs`.

- [ ] **Step 6: The generator, and the audition**

`factory/vo.mjs`:

```js
// vo.mjs — 配音：按成片的台词表（film.voLines）调 Kokoro 生成每一句，存进 <film>/assets/vo/（mp3 + index.json，入库）：
//   node factory/vo.mjs 03-perfume [--audition] [--force] [--dry]
// 每句按（文字、音色、语速）缓存，没变的不重新生成；生成后裁掉首尾静音、响度统一到 VO_LUFS、峰值限在 VO_PEAK，编成单声道 mp3
// 比时段长就提速重试一次（最多 MAX_RATE 倍），还放不下就报出这一句、以状态码 1 结束；台词表里已经没有的句子连文件一起删掉
// --audition：同一段话用 film.audition 里的候选音色各念一遍，写到 <film>/out/audition/，挑默认音色用
// Kokoro 的 Lambda 按"音色-秒"给输出文件起名（tts-out/<voice>-<秒>.mp3）：同一音色同时念两句会互相覆盖，所以同一音色的句子排队，不同音色并行
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { ROOT } from './lib/serve.mjs';
import { parseArgs } from './lib/args.mjs';
import { pool } from './lib/jobs.mjs';
import { measure } from './lib/ffmpeg.mjs';
import { expandJobs } from './engine/variant.js';
import { fresh } from './engine/audio.js';

export const VO_LUFS = -20, VO_PEAK = -6, MAX_RATE = 1.15;
const TTS = process.env.KOKORO_TTS ?? path.resolve(ROOT, '../../../../ai-ml/aigc/audio_models/Kokoro/tts.sh');
const TRIM = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse';   // 前留 50 ms、后留 80 ms
// 语音的峰值比响度高 16–20 dB（爆破音）；这里先限到比 VO_LUFS 高 14 dB，成片的总限幅器就几乎不用再压语音，配乐也不会跟着一个个字起伏
const LIMIT = `alimiter=limit=${Math.pow(10, VO_PEAK / 20).toFixed(4)}:level=false:latency=true`;

/** 成片所有变体（配音开）里的台词，按 id 去重 */
export function plannedLines(film) {
  const grid = Object.fromEntries(Object.keys(film.axes).map(k => [k, ['*']]));
  const lines = new Map();
  for (const v of expandJobs(film, { jobs: [{ ...grid, ar: ['9x16'], vo: ['on'] }] })) for (const l of film.voLines(v)) lines.set(l.id, l);
  return [...lines.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
}

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { env: { ...process.env, ...env } });
    let err = '';
    p.stderr.on('data', d => { err += d; }); p.stdout.resume();
    p.on('error', reject);
    p.on('close', code => (code === 0 ? resolve() : reject(new Error(`${path.basename(cmd)} exited ${code}: ${err.trim().split('\n').slice(-2).join(' | ')}`))));
  });
}
function needTts() {
  if (!fs.existsSync(TTS)) throw new Error(`Kokoro script not found: ${TTS} (set KOKORO_TTS to ai-ml/aigc/audio_models/Kokoro/tts.sh)`);
}
/** 按音色分队：每个音色一次只念一句，各音色同时进行；结果和 items 一一对应（出错的是 { error }） */
async function byVoice(items, fn) {
  const out = new Array(items.length), queues = Object.values(Object.groupBy(items.map((it, i) => ({ it, i })), x => x.it.voice));
  await Promise.all(queues.map(async q => (await pool(q, 1, x => fn(x.it))).forEach((r, j) => { out[q[j].i] = r; })));
  return out;
}
const duration = f => +spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout;

/** 念一句 → out（mp3）：Kokoro 出 wav，裁静音、调到 VO_LUFS、限幅，限幅后再量一遍补回响度，编码；返回 { dur, lufs } */
async function say(text, voice, rate, out) {
  const wav = path.join(os.tmpdir(), `vo.${process.pid}.${path.basename(out)}.wav`);
  try {
    await run('bash', [TTS, voice, wav, text], { SPEED: String(rate) });
    const m = measure(wav, TRIM);
    if (!Number.isFinite(m.I)) throw new Error(`${voice} returned silence for "${text}"`);
    const pre = `${TRIM},volume=${(VO_LUFS - m.I).toFixed(2)}dB,${LIMIT}`, m2 = measure(wav, pre);
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-af', `${pre},volume=${(VO_LUFS - m2.I).toFixed(2)}dB`, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k', out]);
    return { dur: Math.round(duration(out) * 1000) / 1000, lufs: VO_LUFS };
  } finally { fs.rmSync(wav, { force: true }); }
}

async function audition(film, o) {
  const dir = path.resolve(o.out ?? path.join(ROOT, film.id, 'out', 'audition')), v0 = expandJobs(film, { jobs: [{ vo: ['on'] }] })[0];
  needTts(); fs.mkdirSync(dir, { recursive: true });
  const items = Object.entries(film.audition).flatMap(([lang, voices]) => voices.map(voice => ({ lang, voice, text: film.voLines({ ...v0, lang }).map(l => l.text).join(' ') })));
  const res = await byVoice(items, async ({ lang, voice, text }) => {
    const out = path.join(dir, `${lang}_${voice}.mp3`), { dur } = await say(text, voice, 1, out);
    console.log(`${lang}  ${voice.padEnd(12)}  ${dur.toFixed(2)} s  ${path.relative(process.cwd(), out)}`);
  });
  const bad = res.map((r, i) => r?.error && `${items[i].lang} ${items[i].voice}: ${r.error.message}`).filter(Boolean);
  if (bad.length) { console.error(`failed:\n  ${bad.join('\n  ')}`); return 1; }
  console.log(`\n${items.length} voices · same text per language:\n${Object.keys(film.audition).map(lang => `  ${lang}: ${items.find(i => i.lang === lang).text}`).join('\n')}\nplay them with: afplay <file> — then set VOICE in the film's copy`);
  return 0;
}

async function generate(film, o) {
  const dir = path.join(ROOT, film.id, 'assets', 'vo'), indexFile = path.join(dir, 'index.json');
  fs.mkdirSync(dir, { recursive: true });
  const index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : {}, lines = plannedLines(film);
  const todo = lines.filter(l => o.force || !fresh(index[l.id], l) || !fs.existsSync(path.join(dir, `${l.id}.mp3`)));
  console.log(`${film.id}: ${lines.length} voice-over lines, ${todo.length} to generate`);
  if (o.dry) { for (const l of todo) console.log(`  ${l.id}  ${l.voice}  "${l.text}"`); return 0; }
  if (todo.length) needTts();
  const long = [];
  const res = await byVoice(todo, async l => {
    const out = path.join(dir, `${l.id}.mp3`);
    let rate = l.speed, r = await say(l.text, l.voice, rate, out);
    if (r.dur > l.max) { rate = Math.min(MAX_RATE, Math.round(l.speed * (r.dur / l.max) * 1.03 * 100) / 100); r = await say(l.text, l.voice, rate, out); }
    if (r.dur > l.max) { fs.rmSync(out, { force: true }); delete index[l.id]; long.push(`${l.id} "${l.text}": ${r.dur.toFixed(2)} s at ${rate}× > ${l.max} s slot`); return; }
    index[l.id] = { text: l.text, voice: l.voice, speed: l.speed, rate, dur: r.dur, lufs: r.lufs };
    console.log(`  ${l.id.padEnd(28)}  ${r.dur.toFixed(2)} / ${l.max} s  ${rate === l.speed ? '' : `at ${rate}×  `}${l.voice}`);
  });
  const bad = res.map((r, i) => r?.error && `${todo[i].id}: ${r.error.message}`).filter(Boolean);
  const keep = new Set(lines.map(l => l.id));
  for (const id of Object.keys(index)) if (!keep.has(id)) { delete index[id]; fs.rmSync(path.join(dir, `${id}.mp3`), { force: true }); }
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.mp3') && !keep.has(f.slice(0, -4))) fs.rmSync(path.join(dir, f));
  const sorted = Object.fromEntries(Object.keys(index).sort().map(k => [k, index[k]]));
  fs.writeFileSync(indexFile, `${JSON.stringify(sorted, null, 2)}\n`);
  const bytes = fs.readdirSync(dir).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0);
  console.log(`done: ${Object.keys(sorted).length} clips · ${(bytes / 1e6).toFixed(2)} MB · ${path.relative(process.cwd(), indexFile)}`);
  if (bad.length) console.error(`failed:\n  ${bad.join('\n  ')}`);
  if (long.length) console.error(`too long even at ${MAX_RATE}× — shorten these lines:\n  ${long.join('\n  ')}`);
  return bad.length || long.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const { pos: [name], o } = parseArgs(process.argv.slice(2));
  if (!name || !fs.existsSync(path.join(ROOT, name, 'film.js'))) { console.error('usage: node factory/vo.mjs <film-dir> [--audition] [--force] [--dry] [--out dir]'); process.exit(2); }
  const film = (await import(path.join(ROOT, name, 'film.js'))).default;
  if (!film.voLines) { console.log(`${name} has no voLines: nothing to do`); process.exit(0); }
  try { process.exit(await (o.audition ? audition : generate)(film, o)); } catch (e) { console.error(e.message); process.exit(1); }
}
```

Notes:
- **`tts.sh` is found relative to the repo:** `ai-ml/aigc/audio_models/Kokoro/tts.sh`, four levels above `SHOW`. Set `KOKORO_TTS` if the showcase lives somewhere else. `tts.sh` needs AWS credentials that can invoke `kokoro-tts:live` in us-east-1.
- **Why each voice runs one request at a time** is explained at the top of this task. Don't raise that queue's width while Kokoro's `app.py` still names its output by voice and second.
- **Only the retry changes the rate.** The retry reads the line at the rate that should fit, plus 3%. The index records `rate` next to the planned `speed`, so a line that needed speeding up is easy to spot.

Run: `node factory/vo.mjs 03-perfume --audition; echo "exit $?"`
Expected: after a few seconds, one line per voice (the order varies):
```
zh  zm_yunxi      5.06 s  03-perfume/out/audition/zh_zm_yunxi.mp3
en  bf_emma       5.07 s  03-perfume/out/audition/en_bf_emma.mp3
…
```
then:
```
8 voices · same text per language:
  zh: 一滴晨露，一片茶山。 佛手柑、白茶、白麝香。 闻境白茶，闻香入境。
  en: Morning dew on the tea hills. Bergamot, White Tea, White Musk. Wenjing White Tea. Breathe in.
play them with: afplay <file> — then set VOICE in the film's copy
```
and `exit 0`.
- The eight files run 5.1–6.2 s each.
- Listen with `afplay 03-perfume/out/audition/zh_zm_yunxi.mp3` and the other seven. Each is one voice reading the white-tea lines, trimmed and at the same loudness.
- `VOICE` in `copy.js` (Step 4) is already set to the voices chosen from this audition. Changing it later only means re-running Step 7.

- [ ] **Step 7: Generate the clips**

Run: `node factory/vo.mjs 03-perfume; echo "exit $?"`
Expected: `03-perfume: 64 voice-over lines, 64 to generate`, then 4–5 minutes of generation (32 requests per voice, one at a time). Then one line per clip, e.g.:
```
  whitetea_zh_15_hero           1.56 / 2.8 s  zm_yunxi
  rose_en_15_end_1111           2.10 / 2.4 s  bf_emma
```
then `done: 64 clips · 0.80 MB · 03-perfume/assets/vo/index.json` and `exit 0`.
- Every clip fits at speed 1, so no line shows `at 1.xx×`.
- The durations vary by a few hundredths of a second from run to run, because Kokoro is not deterministic.

Run it again: `node factory/vo.mjs 03-perfume; echo "exit $?"`
Expected: `03-perfume: 64 voice-over lines, 0 to generate`, then `done: 64 clips · …` and `exit 0`, in under a second, with no Kokoro calls.

Run: `node --test 03-perfume/test/vo.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 8: The pre-flight, and the voice-over in the preview**

Make these exact replacements in `factory/check.mjs`:

1. Replace:

```js
// check.mjs — 批量出片前的自检：GPU、字体、确定性、声音、清单里每个变体的字幕溢出、速度
//   node factory/check.mjs 03-perfume [--all] [--<axis> v1,v2]
// 确定性：每个剪辑的关键帧和转场中点先顺着画、再倒着画，两遍逐字节相同；声音：每个剪辑的混音渲染两遍逐字节相同、不是静音
```

   with:

```js
// check.mjs — 批量出片前的自检：GPU、字体、确定性、配音片段、声音、清单里每个变体的字幕溢出、速度
//   node factory/check.mjs 03-perfume [--all] [--<axis> v1,v2]
// 确定性：每个剪辑的关键帧和转场中点先顺着画、再倒着画，两遍逐字节相同；声音：每个剪辑的混音渲染两遍逐字节相同、不是静音
// 配音：清单里每个变体的每一句都有片段、片段没过期、不超出时段（和出片时 audio.js 的判断相同）
```

2. Replace:

```js
  report('determinism', !det.bad.length, det.bad.length ? `frames differ between passes: ${det.bad.join(', ')}` : `${det.n} frames identical forward and backward`);

  const snd = await page.evaluate(async cuts => {
```

   with:

```js
  report('determinism', !det.bad.length, det.bad.length ? `frames differ between passes: ${det.bad.join(', ')}` : `${det.n} frames identical forward and backward`);

  const vo = await page.evaluate(async jobs => {
    const app = window.__app, { voPlan } = await import('/factory/engine/audio.js'), bad = new Set();
    if (!app.film.voLines) return null;
    const res = await fetch(new URL('assets/vo/index.json', document.baseURI));
    if (!res.ok) return { n: 0, bad: [`no clip index at ${res.url} (run: node factory/vo.mjs ${app.film.id})`] };
    const index = await res.json();
    let n = 0;
    for (const v of jobs) { try { n += voPlan(app.film, v, index).length; } catch (e) { bad.add(e.message); } }
    return { n, bad: [...bad] };
  }, jobs);
  if (!vo) report('voice-over', true, 'the film has no voLines: no narration');
  else report('voice-over', !vo.bad.length, vo.bad.length ? `\n      ${vo.bad.join('\n      ')}` : `${vo.n} lines in ${jobs.length} variants: every clip present, current, inside its slot`);

  const snd = await page.evaluate(async cuts => {
```

3. Replace:

```js
      const t0 = performance.now(), a = await app.exporter.audio(), ms = performance.now() - t0, b = await app.exporter.audio();
      out.push({ cut, ms, peak: a.peak, same: a.url === b.url });
```

   with:

```js
      try {
        const t0 = performance.now(), a = await app.exporter.audio(), ms = performance.now() - t0, b = await app.exporter.audio();
        out.push({ cut, ms, peak: a.peak, same: a.url === b.url });
      } catch (e) { out.push({ cut, error: e.message }); }            // 比如缺配音片段：记成这一项不过，不中断自检
```

4. Replace:

```js
  else report('audio', snd.every(r => r.same && r.peak > 0), snd.map(r => `${r.cut} s ${r.same ? 'identical twice' : 'DIFFERS between renders'}, peak ${(20 * Math.log10(r.peak)).toFixed(1)} dBFS, ${r.ms.toFixed(0)} ms`).join(' · '));
```

   with:

```js
  else report('audio', snd.every(r => r.same && r.peak > 0), snd.map(r => r.error ? `${r.cut} s: ${r.error}` : `${r.cut} s ${r.same ? 'identical twice' : 'DIFFERS between renders'}, peak ${(20 * Math.log10(r.peak)).toFixed(1)} dBFS, ${r.ms.toFixed(0)} ms`).join(' · '));
```

Run: `node factory/check.mjs 03-perfume; echo "exit $?"`
Expected: every line `ok`, with a new line before `audio`:
```
ok    voice-over   56 lines in 24 variants: every clip present, current, inside its slot
ok    audio        6 s identical twice, peak -9.5 dBFS, 281 ms · 15 s identical twice, peak -8.8 dBFS, 819 ms
```
then `all checks passed` and `exit 0`. The default manifest's 24 variants are 16 at 15 s with three lines each and 8 at 6 s with one. That makes 56 lines, 28 of them different.

Now check that a missing clip index fails loudly:

Run: `mv 03-perfume/assets/vo/index.json /tmp/index.json && node factory/check.mjs 03-perfume; echo "exit $?"; mv /tmp/index.json 03-perfume/assets/vo/index.json`
Expected:
```
FAIL  voice-over
      no clip index at http://127.0.0.1:…/03-perfume/assets/vo/index.json (run: node factory/vo.mjs 03-perfume)
FAIL  audio        6 s: voice-over index missing: http://127.0.0.1:…/03-perfume/assets/vo/index.json (run: node factory/vo.mjs 03-perfume) · 15 s: …
```
The other lines are still `ok`, then `2 check(s) failed` and `exit 1`. The index is back in place afterwards.

With `npm run serve` running, open `http://127.0.0.1:8765/03-perfume/?paused` in Chrome. Tick 声音, then press Space.

Expected, on top of Task 15's score:
- **4.6 s:** 「一滴晨露，一片茶山。」, in a young male voice, centred and dry. The music dips just before the first word and stays down under the line.
  - The line ends at about 6.2 s, so the 6.0 s hit lands under its last syllable while the music is still ducked. Its pluck and bell are softer than in Task 15; the light-streak whoosh (`sfx`) is not.
- **7.7 s:** 「佛手柑、白茶、白麝香。」 over the quiet eighth-note pulse, which drops further under it.
- **12.3 s:** 「闻境白茶，闻香入境。」 over the logo. The logo's three notes keep their level, and the pad under them dips. The line ends by 14 s, before the fade-out.
- **Other variants:**
  - `?lang=en`: the same three places in a British female voice, e.g. "Morning dew on the tea hills."
  - `?promo=1111`: the end line is 「双十一，到手四百九十九元。」.
  - `?vo=off`: exactly Task 15's sound.
  - The 6 s cut has one line at 1.1 s over the landing's music.
- **Switching** language or promo re-renders the mix, about 1 s for the 15 s cut. Clips already decoded are not fetched again.

Now check the error path. Stop playback and run `mv 03-perfume/assets/vo/whitetea_zh_15_hero.mp3 /tmp/` in a terminal, then reload the page and tick 声音.
Expected: the error box shows `voice-over clip missing: http://127.0.0.1:8765/03-perfume/assets/vo/whitetea_zh_15_hero.mp3`. Move the file back with `mv /tmp/whitetea_zh_15_hero.mp3 03-perfume/assets/vo/`, reload, and the sound works again.

- [ ] **Step 9: Render with narration**

Run: `node factory/render.mjs 03-perfume --sku whitetea --cut 15,6 --ar 9x16 --lang zh,en --promo none,1111 --out /tmp/t16 --force; echo "exit $?"`
Expected:
- 8 videos, e.g. `[1/8] wenjing_whitetea_15s_9x16_zh  450 frames  …`;
- then `done 8, skipped 0, failed 0  ·  4.3 min  ·  …` and `exit 0`.
- Every sidecar has `"audio": true`, `"lufs"` between −14.4 and −13.6, and `"tp"` at −1.5 or lower. In the reference run they measured −14.1 to −14.0 LUFS and −2.8 to −1.5 dBTP.

Play `/tmp/t16/wenjing_whitetea_15s_9x16_zh.mp4` in QuickTime.
- It sounds like the preview, louder: the voice clear above the music, each line in its place, and nothing clipped at the ends.
- The first word of the hero line lands 4.6 s in, as the bottle turns to face the camera.

Play `/tmp/t16/wenjing_whitetea_15s_9x16_en_1111.mp4`.
- The end line is "Eleven-eleven: sixty-nine dollars.", and it is finished before the picture fades.

- [ ] **Step 10: Run all tests and commit**

Run: `npm test`
Expected: PASS, 129 tests.

```bash
git add factory/vo.mjs factory/engine/audio.js 03-perfume/copy.js 03-perfume/film.js factory/check.mjs factory/test/audio.test.mjs 03-perfume/test/data.test.mjs 03-perfume/test/vo.test.mjs 03-perfume/assets/vo
git commit -m "Add the Kokoro voice-over: clip generation and audition, the clips in the mix with the music ducked under them, and a clip check in the pre-flight

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 17: The 桂花 world — golden-hour garden and the floret macro — `osmanthus.js`

This task builds the second real world, 桂花 · 金秋. The bottle stands on an old elm tea table in an autumn garden at golden hour. The low sun is behind the bottle, about 18° to the right and 10° up, so everything is backlit. An osmanthus branch crosses the frame in silhouette, and sun through its leaves blurs into warm gold bokeh. The macro is a 金桂 cluster in a leaf axil, where the dew grows on the lowest petal tip.

**How the garden is made:**
- **Table.** Old elm (`TABLE`), 2.6 m wide. Its flat top at y = 0 is where the caustic lands, and the backlight picks out its rounded back edge as a thin bright line.
  - The shader varies colour and roughness around `#3d2819` / 0.66: cathedral-shaped growth rings about 5–6 cm apart, fine pores along the grain, and darker and lighter patches.
  - As in the tea garden, the mean is the material's own `color` / `roughness`, which is what the caustic reads.
  - 44 fallen florets lie in five small piles, none within 8 cm of the base.
- **Behind the bottle.**
  - At the back left stands the osmanthus tree: three overlapping crown lobes, with 13 000 dark glossy leaves on the shell around a dark core, so you can't see through it.
  - At the right a low hedge runs 5.2 m out. Beyond it, two tree lines at 22 m and 60 m fade into dusk haze, their tops rimmed gold on the sun side (`LINES`).
  - The hedge hides behind the crown on the left.
- **The branch.** It reaches from the crown across the frame to about 1 m behind the bottle, tapering from 9 to 2 mm. Its opposite leaves come in crossed pairs, with floret clusters in the axils. Against the sun the leaves are dark, and the florets glow one by one.
- **Bokeh.** Sun through the gaps becomes camera-facing discs with a slightly brighter rim (spherical aberration). They blend additively and twinkle slowly, as if the leaves moved in the wind.
  - 34 discs sit along the hedge top on both sides of the sun, and 26 large faint ones in the far tree line.
  - 20 dim ones sit on the crown's sun-side edge, where the text goes.
- **Falling florets.** 40 four-petal florets drift down and to the right behind the bottle, under the branch, tumbling as they fall (`driftField`, closed form).
- **Backlit colour (`translucent`).** After three's lights, the shader adds the sun coming through a petal or leaf from behind: sun colour (`#ffc27e` × 2.8) × translucency colour × vertex or instance colour.
  - That is a product in linear space. Three orange factors multiply out to a deep red-orange, and green collapses entirely.
  - So the petals' translucency is a near-white `#fff0c8` × 0.45, and their vertex colours are very yellow: `#f6c21a` at the base, `#ffe04c` at the tip, `#d88e08` in the throat. The florets come out gold, not salmon.
- **Macro (`macroCluster`).** Sixteen florets, three of them still buds, sit on 4.5–7 mm pedicels and crowd into a hemisphere facing the camera. Two opposite leaves reach out of frame.
  - Behind the florets are 150 out-of-focus leaves, with a gap at the upper right where the sun's glow comes in. There are also 30 orange discs (flowers nearer by), 40 gold-cream discs further back, and 7 falling florets.
  - The set is built in the cluster's own frame and placed 1.9 m beyond the right end of the table, at (3.2, 0.12, 0.3). That keeps it out of every bottle shot and out of the shadow box.
- **The dew** hangs from the lowest petal tip of floret 0, which faces the camera and tilts down.
  - It is `dewMaterial` with `below: '#2e2a12'`, `above: '#f0b040'`.
  - `drop(R, tau)` follows Task 14's contract. The drop grows from 1.4 mm to `DROP.R` and stretches from 1.2 to 1.4 in the 0.3 s before release at `lt = dur − DROP.pre`. Then it falls by `fallen(tau)` and wobbles by `stretch(tau)`.
- **The macro camera** is a fit intent.
  - The fit box covers the florets and the dew. It is 0.74 times as wide as it is tall, and centred halfway between the cluster and the dew, so at 16:9 the cluster sits on the right, clear of the hook. It is flattened to the dew's plane, so `focus: 'target'` lands on the dew.
  - The camera orbits from −10° to +6° and pushes in 10%.
  - Its post: aperture 1.2, blur cap 0.03, exposure 0.72, saturation 1.35 and a warmer gamma.
- **Reflections.** `env.base` is `null`. The glass reflects:
  - a small copy of the sky;
  - a dark band of hedge and trees around the horizon, and a dark crown at the back left, so the chamfers and the table reflect foliage low down instead of bright sky;
  - a warm reflector panel in front.
- **All randomness comes from `rand(seed, i)`.** Every frame is a function of the shot's local time, and nothing depends on the order the timeline is visited in.

**The score.** Each scent gets its own arrangement.
- **Key and voices.** F major (F G A B♭ C D E), tonic F4 (65). Only the existing voices are used, and `audio.js` does not change:
  - a felt piano is `pluck` with a low `bright` (0.1–0.16) and long `t60` (2.4–4.5 s);
  - a celesta is `bell` with partials `[1, 2, 3, 4.08]` and `bright` 0.4;
  - a warm string pad is `pad` with `cut` 2.4, a slow `a` of 1.4 s and `air` 0.45.
- **The bed.** The garden's wind and leaves are a bandpass at 600 Hz, q 0.5, v 0.32. That is lower and softer than white tea's mist (900 Hz, 0.35).
- **Reverb.** 3.8 s, music send 0.6.
- **The 6 s cut** has its own arrangement, as Task 15 requires.

**Nothing else changes.**
- `skus.js` already sets `world: 'osmanthus'` and `score: 'osmanthus'`.
- `worlds.test.mjs` checks every distinct world in `WORLDS`, and `score.test.mjs` checks every sku's score, so this task adds no test code.
- In `film.js` only the `WORLDS` entry changes. In `score.js` only the new block and the `SCORES` entry change.

**Files:**
- Create: `03-perfume/js/worlds/osmanthus.js`
- Modify: `03-perfume/film.js`, `03-perfume/js/score.js`
- Test: `03-perfume/test/worlds.test.mjs`, `03-perfume/test/score.test.mjs` (unchanged)

**Interfaces:**
- Consumes:
  - Task 1: `rand(seed, i)`; `lerp`, `ss`, `clamp`, `easeInOut`. Task 7: `SKUS.osmanthus` (`world`, `score`), `CUTS`, `EV`, `BAR`.
  - Task 12: the caustic's world rule (shadow-casting key light, plain ground at y = 0).
  - Task 13: the world module contract and `worlds.test.mjs`; `haze`, `sky`, `dewMaterial`, `driftField`, `NOISE` (common.js).
  - Task 14: `DROP`, `fallen(tau)`, `stretch(tau)` (drop.js); `build` returns `haze`; the macro dew releases in the macro's last `DROP.pre` seconds.
  - Task 15: `seq`, `BEAT`, `STEP`, `logo`, `sfx`, the `SCORES` table and `score.test.mjs`; `VOICES` `pluck`, `pad`, `bell`, `noise`; the loudness chain (`loudnessFilter`, `encodeAudio`) and its level guidance.
  - Task 16: the voice-over. `skus.js` already has 桂花's lines and their clips exist, so the 桂花 variants are narrated, with the music ducked under each line, as soon as the world renders.
- Produces:
  - `osmanthus.js`: `build(ctx) → { haze, env, post, macro: { root, camera(s), post }, update(ctx, s), reset() }`, which passes `worlds.test.mjs`. The macro dew hangs at floret 0's lowest petal tip and releases at `lt = dur − DROP.pre`.
  - `film.js`: `WORLDS.osmanthus = () => import('./js/worlds/osmanthus.js')`. seasalt and rose still point at the studio until Tasks 18–19.
  - `score.js`: `SCORES.osmanthus` is its own score `{ tonic: 65, reverb, bed, m15, m6 }`. seasalt and rose still use white tea's until Tasks 18–19.

- [ ] **Step 1: Point the film at the world**

Make these exact replacements in `03-perfume/film.js`:

1. Replace:

```js
export const WORLDS = { studio, whitetea: () => import('./js/worlds/whitetea.js'), osmanthus: studio, seasalt: studio, rose: studio };
```

   with:

```js
export const WORLDS = { studio, whitetea: () => import('./js/worlds/whitetea.js'), osmanthus: () => import('./js/worlds/osmanthus.js'), seasalt: studio, rose: studio };
```

- [ ] **Step 2: Run the world tests to make sure they fail**

Run: `node --test 03-perfume/test/worlds.test.mjs`
Expected: FAIL. There are 15 tests.
- The 10 `studio:` and `whitetea:` tests pass.
- The 5 `osmanthus:` tests fail with `ERR_MODULE_NOT_FOUND`: `Cannot find module '…/03-perfume/js/worlds/osmanthus.js' imported from …/03-perfume/film.js`.

- [ ] **Step 3: The osmanthus world**

`03-perfume/js/worlds/osmanthus.js`:

```js
// osmanthus.js — 桂花 · 金秋：傍晚的低太阳在瓶子正后方偏右，逆光。瓶子立在老榆木茶台上，台面散着几朵落花；身后左边一棵桂花树的深绿树冠，
// 右边一道矮树篱，再远是暮霭里的树影；一枝桂花从左上方斜伸进来成剪影，叶缝里漏下的阳光在焦外化成一个个暖金色的光斑，花一朵朵往下飘。
// 特写是叶腋里的一簇桂花：十朵四瓣的小花挂在细花梗上，逆光里花瓣透亮，最下面一朵的瓣尖挂着一颗渐渐长大的露珠
import * as THREE from 'three';
import { haze, sky, dewMaterial, driftField, NOISE } from './common.js';
import { DROP, fallen, stretch } from '../drop.js';
import { rand } from '../../../factory/engine/rng.js';
import { lerp, ss, clamp, easeInOut } from '../../../factory/engine/ease.js';

const SUN = new THREE.Vector3(0.3, 0.18, -0.94).normalize();           // 指向太阳：正后方偏右约 18°，仰角约 10°（傍晚）
const SKY = { zenith: '#9c9088', horizon: '#f0b060', mist: '#3a2818', sun: { dir: SUN.toArray(), color: '#ffb35e', glow: 1.5, rays: 0.3 } };
const KEY = { color: '#ffc27e', intensity: 2.8 };
const V3 = (...a) => new THREE.Vector3(...a);

// ── 值噪声（只由 seed 决定）──
const n1 = (seed, x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(rand(seed, i), rand(seed, i + 1), u); };
const fbm1 = (seed, x, oct = 4) => { let s = 0, a = 0.5; for (let o = 0; o < oct; o++) { s += a * n1(seed + o * 101, x); x *= 2.03; a *= 0.5; } return s / (1 - 0.5 ** oct); };
const n2 = (seed, x, y) => {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v), g = (p, q) => rand(seed, (p + 4096) * 8192 + q + 4096);
  return lerp(lerp(g(i, j), g(i + 1, j), a), lerp(g(i, j + 1), g(i + 1, j + 1), a), b);
};
const sfbm = (seed, x) => 2 * fbm1(seed, x) - 1;

// ── 远景：暮霭里的两道树影、一道矮树篱。都是绕原点的竖直弧面（方位从 −z 往 +x 量，度），顶沿树梢起伏；树篱在左边藏到树冠后面 ──
// R 半径、a 方位范围、y0 底、top(x) 顶（x 沿弧的米数）、leaf 叶丛的疏密、fringe 树梢参差的深度、rim 逆光金边的宽度（米）、fog 雾的浓度
const LINES = [
  { R: 60, a: [-110, 125], y0: -2, top: x => 4 + 2 * sfbm(61, x / 25) + 0.8 * sfbm(62, x / 5), tone: '#2c2a1c', leaf: 0.5, fringe: 0.5, rim: 0.6, fog: 0.02, seed: 1 },
  { R: 22, a: [-90, 115], y0: -1.5, top: x => 1.6 + 0.8 * sfbm(71, x / 9) + 0.35 * sfbm(72, x / 2.2) + 0.1 * sfbm(73, x / 0.5), tone: '#222617', leaf: 1.5, fringe: 0.25, rim: 0.25, fog: 0.018, seed: 2 },
  { R: 5.2, a: [-25, 110], y0: -0.75, top: x => 0.34 + 0.1 * sfbm(81, x / 1.6) + 0.06 * sfbm(82, x / 0.35), tone: '#17220f', leaf: 6, fringe: 0.07, rim: 0.05, fog: 0.02, seed: 3 },
];
function lineGeometry(L) {
  const NX = 520, NY = 10, a0 = (L.a[0] * Math.PI) / 180, a1 = (L.a[1] * Math.PI) / 180, pos = [], aT = [], aX = [], idx = [];
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
    const th = lerp(a0, a1, i / NX), x = th * L.R, top = L.top(x), y = lerp(L.y0, top, (j / NY) ** 0.6);   // 顶上密一些：剪影在这里
    pos.push(Math.sin(th) * L.R, y, -Math.cos(th) * L.R); aT.push(top - y); aX.push(x);
  }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + NX + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1)); g.setAttribute('aX', new THREE.Float32BufferAttribute(aX, 1)); g.setIndex(idx);
  return g;
}
function lineMaterial(hz, L) {
  return new THREE.ShaderMaterial({
    uniforms: { ...hz.uniforms, uTone: { value: new THREE.Color(L.tone) }, uLeaf: { value: L.leaf }, uFringe: { value: L.fringe }, uRim: { value: L.rim }, uFog: { value: L.fog }, uSeed: { value: L.seed * 13.7 } },
    side: THREE.DoubleSide,
    vertexShader: /* glsl */`
attribute float aT, aX; varying vec3 vW; varying float vT, vX;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vT = aT; vX = aX; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
${hz.glsl}
${NOISE}
uniform vec3 uTone; uniform float uLeaf, uFringe, uRim, uFog, uSeed;
varying vec3 vW; varying float vT, vX;
void main() {
  vec2 p = vec2(vX, vW.y) * uLeaf + uSeed;
  float clump = fbm(p), fine = vnoise(p * 5.0);
  if (vT < uFringe * (0.3 + fbm(p * 2.3 + 5.1))) discard;                 // 树梢参差：一丛丛叶子的轮廓
  vec3 D = normalize(vW - cameraPosition);
  vec3 col = uTone * (0.45 + 1.1 * smoothstep(0.35, 0.8, clump) * (0.7 + 0.3 * fine));
  // 逆光：树梢镶一道金边，朝太阳那一侧最亮；叶丛里零星透一点光
  float toward = pow(max(dot(D, hSunDir), 0.0), 6.0);
  col += hSun * (0.15 + 2.2 * toward) * exp(-vT / uRim) * (0.4 + 0.6 * fine);
  col += hSun * 0.25 * toward * smoothstep(0.72, 0.9, clump * fine + 0.35);
  // 暮霭：随距离融进天色，底部沉进更浓的霭里
  float f = 1.0 - exp(-length(vW - cameraPosition) * uFog);
  f = max(f, 0.5 * smoothstep(0.0, -2.0, vW.y) * step(10.0, length(vW.xz)));
  gl_FragColor = vec4(mix(col, haze(D), clamp(f, 0.0, 1.0)), 1.0);
}`,
  });
}

// ── 叶与花 ──
/**
 * 一片桂花叶：沿 +x 从叶柄（x = 0）到叶尖（x = len），椭圆形，最宽在中间（约 len / 3），叶尖渐尖、叶基楔形；
 * fold：沿主脉 V 形对折；curl：叶尖下垂 = curl × len。uv.x 沿叶长、uv.y 横跨叶宽（主脉在 0.5）。正面朝 +y
 */
function leafGeometry(len, { segs = [24, 4], fold = 0.2, curl = 0.1 } = {}) {
  const [NU, NV] = segs, W = len / 3, pos = [], uv = [], idx = [];
  for (let i = 0; i <= NU; i++) {
    const u = i / NU, half = (W / 2) * Math.sin(Math.PI * u ** 0.95) ** 0.7 * (1 - 0.45 * ss(0.55, 1, u));
    for (let j = 0; j <= NV; j++) {
      const v = (j / NV) * 2 - 1, z = v * half;
      pos.push(u * len, fold * Math.abs(z) - curl * len * u * u, z); uv.push(u, (v + 1) / 2);
    }
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/** 叶脉贴图（uv 同 leafGeometry）：主脉 + 每边 8 条细侧脉（斜伸向叶尖、近叶缘弯上去）。叶面 ≈ 0.8、叶脉 1 */
function veinTexture(W = 256, H = 64) {
  const px = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = (i + 0.5) / W, v = (j + 0.5) / H, d = Math.abs(v - 0.5) * 2;
    const mid = Math.exp(-(((v - 0.5) / (0.02 * (1.3 - u))) ** 2));
    const q = (u - 0.35 * d ** 0.7) * 8 + (v > 0.5 ? 0.5 : 0), f = q - Math.round(q);
    const lat = Math.exp(-((f / 0.06) ** 2)) * ss(0.05, 0.15, u) * ss(1, 0.8, d) * ss(0.95, 0.8, u);
    const val = 0.8 + 0.03 * (n2(9, u * 30, v * 10) - 0.5) + 0.2 * Math.max(mid, 0.45 * lat), p = 4 * (j * W + i);
    px[p] = px[p + 1] = px[p + 2] = Math.round(255 * clamp(val)); px[p + 3] = 255;
  }
  const tex = new THREE.DataTexture(px, W, H);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}

/**
 * 一朵桂花（开足的）：花冠深四裂，四片肉质的圆头花瓣从很短的花冠筒向外张开，边缘兜起、瓣尖微微外翻；花心两枚小雄蕊。
 * 直径约 d，花心朝 +y，第 k 片花瓣朝 45° + 90°k。顶点色：瓣基深橙 → 瓣尖金黄
 */
const PETAL = { half: 0.42, rise: [0.5, -0.38] };                        // 半宽（占瓣长）、瓣的高度曲线 h(u) = L (a u + b u²)
const petalTip = (L, k) => { const a = Math.PI / 4 + (k * Math.PI) / 2; return V3(L * Math.cos(a), L * (PETAL.rise[0] + PETAL.rise[1]), L * Math.sin(a)); };
function floretGeometry(d, { segs = [10, 4], stamens = true } = {}) {
  const [NU, NV] = segs, L = d / 2, pos = [], col = [], idx = [], c = new THREE.Color();
  const base = new THREE.Color('#f6c21a'), tip = new THREE.Color('#ffe04c'), throat = new THREE.Color('#d88e08'), anther = new THREE.Color('#f2d468');
  const w = u => PETAL.half * L * (u < 0.65 ? 0.3 + 0.7 * Math.sin((Math.PI / 2) * (u / 0.65)) : Math.sqrt(Math.max(0, 1 - ((u - 0.65) / 0.35) ** 2)));
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2, ca = Math.cos(a), sa = Math.sin(a), o = pos.length / 3;
    for (let i = 0; i <= NU; i++) {
      const u = i / NU, r = L * (0.14 + 0.86 * u), h = L * (PETAL.rise[0] * u + PETAL.rise[1] * u * u), hw = w(u);
      c.copy(base).lerp(tip, ss(0.05, 0.8, u));
      for (let j = 0; j <= NV; j++) {
        const v = (j / NV) * 2 - 1, s = v * hw;
        pos.push(r * ca - s * sa, h + 0.3 * hw * v * v * ss(0, 0.5, u), r * sa + s * ca); col.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const p = o + i * (NV + 1) + j, q = p + NV + 1; idx.push(p, p + 1, q, p + 1, q + 1, q); }
  }
  const o = pos.length / 3;                                              // 花心：花冠筒口一圈，往里略凹
  pos.push(0, 0.02 * L, 0); col.push(throat.r, throat.g, throat.b);
  for (let i = 0; i <= 12; i++) { const a = (i / 12) * 2 * Math.PI; pos.push(0.2 * L * Math.cos(a), 0.06 * L, 0.2 * L * Math.sin(a)); col.push(base.r, base.g, base.b); }
  for (let i = 0; i < 12; i++) idx.push(o, o + 2 + i, o + 1 + i);
  if (stamens) for (const sx of [-1, 1]) {                                 // 两枚雄蕊：短短的淡黄小球，贴在筒口
    const s = new THREE.SphereGeometry(0.075 * L, 8, 6), sp = s.attributes.position, so = pos.length / 3;
    for (let i = 0; i < sp.count; i++) { pos.push(sp.getX(i) + sx * 0.08 * L, sp.getY(i) * 1.3 + 0.13 * L, sp.getZ(i)); col.push(anther.r, anther.g, anther.b); }
    for (const i of s.index.array) idx.push(so + i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * 逆光透光：lights 之后给 directDiffuse 加上从背面穿过来的阳光（花瓣、叶片）。normal 在双面材质里总朝着观者，-normal 和太阳同向就是逆光。
 * 有顶点色 / 实例色时乘上它：花瓣透出来的是自己的橙黄，树冠深处的叶子透过来的光也少
 */
function translucent(m, key, color, k, veins = false) {
  const U = { uTrans: { value: new THREE.Color(color).multiplyScalar(k) }, uSun: { value: new THREE.Color(KEY.color).multiplyScalar(KEY.intensity) }, uSunDir: { value: SUN } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uTrans, uSun, uSunDir;')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
  vec3 through = uTrans * uSun * smoothstep(-0.2, 1.0, dot(-normal, normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz)));
  ${veins ? 'through *= 0.8 + 0.6 * clamp((texture2D(map, vMapUv).r - 0.8) * 5.0, 0.0, 1.0);' : ''}
  #ifdef USE_COLOR
    through *= vColor;
  #endif
  reflectedLight.directDiffuse += through;`);
  };
  m.customProgramCacheKey = () => key;
  return m;
}
/** 花瓣：肉质、略带蜡光，丝绒一样的掠射高光；逆光时整片透亮 */
const petalMaterial = () => translucent(new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.6, sheen: 0.2, sheenColor: '#ffd060', sheenRoughness: 0.5, side: THREE.DoubleSide }), 'osmanthus-petal', '#fff0c8', 0.45);
/** 桂花叶：革质、很亮（清漆），深绿；叶脉贴图做颜色和凹凸，逆光时叶脉透得更亮 */
const leafMaterial = (veins, color) => translucent(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color).multiplyScalar(1.25), map: veins, bumpMap: veins, bumpScale: -1.2, roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.25, side: THREE.DoubleSide }), 'osmanthus-leaf', '#8a9a30', 0.18, true);

/** 把网格的 +x 对准 dir、再绕它转 roll（叶子：叶柄在 at） */
function aim(o, at, dir, roll = 0, axis = V3(1, 0, 0)) {
  o.position.copy(at);
  o.quaternion.setFromUnitVectors(axis, dir.clone().normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(axis, roll));
  return o;
}

// ── 茶台：老榆木，顶面平（y = 0，焦散落在这里），后沿圆角，逆光里勾出一道亮线 ──
const TABLE = { x0: -1.3, x1: 1.3, zb: -0.42, zf: 1.2, h: 0.06, round: 0.015 };
/**
 * 榆木的材质：颜色和粗糙度按世界坐标在 color / roughness 上下变化——顺着 x 的山纹年轮（晚材深、导管粗），顺纹的细导管，一片片深浅。
 * 平均值就是 color / roughness 本身（焦散读的就是这两个值，glass.js）
 */
function elmMaterial() {
  const m = new THREE.MeshPhysicalMaterial({ color: '#3d2819', roughness: 0.66, metalness: 0, specularIntensity: 0.5 });   // 擦了木蜡油：哑光，逆光里一层柔的光泽
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vElm;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvElm = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vElm;\n${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  vec2 wp = vElm.xz;                                                    // 木纹顺着 x
  float q = wp.y * 17.0 + 6.0 * fbm(vec2(wp.x * 0.5, wp.y * 1.4)) + 2.5 * sin(wp.x * 1.9 + 3.0 * fbm(wp * 0.7 + 7.0));   // 年轮：五六厘米一道，宽窄不一，弯成一个个山纹
  float f = fract(q), late = smoothstep(0.0, 0.06, f) * smoothstep(0.34, 0.12, f);
  late = mix(late, 0.3, clamp(fwidth(q) * 1.5 - 0.3, 0.0, 1.0));       // 远了淡成平均
  float fib = mix(vnoise(vec2(wp.x * 4.0, wp.y * 320.0)), 0.5, clamp(fwidth(wp.y) * 160.0 - 0.2, 0.0, 1.0));   // 顺纹的细导管
  float mot = fbm(vec2(wp.x * 0.9, wp.y * 3.0) + 3.1);                 // 一片片深浅
  diffuseColor.rgb *= 1.0 - 0.22 * (late - 0.3) + 0.16 * (fib - 0.5) + 0.3 * (mot - 0.47);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor *= 1.0 + 0.08 * (late - 0.3) - 0.06 * (fib - 0.5);`);
  };
  m.customProgramCacheKey = () => 'osmanthus-elm';
  return m;
}
function table() {
  const { x0, x1, zb, zf, h, round } = TABLE, mat = elmMaterial(), g = new THREE.Group();
  const top = new THREE.BoxGeometry(x1 - x0, h, zf - zb - round); top.translate((x0 + x1) / 2, -h / 2, (zf + zb + round) / 2);
  const edge = new THREE.CylinderGeometry(round, round, x1 - x0, 24, 1); edge.rotateZ(Math.PI / 2); edge.translate((x0 + x1) / 2, -round, zb + round);
  const lip = new THREE.BoxGeometry(x1 - x0, h - round, round); lip.translate((x0 + x1) / 2, -round - (h - round) / 2, zb + round / 2);
  for (const geo of [top, edge, lip]) { const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; g.add(m); }
  return g;
}
/** 台面上的落花：四十来朵，成几小堆，有的翻着、有的侧着，放久的颜色暗一点。避开瓶底（半径 8 厘米） */
function fallenFlorets(petal) {
  const N = 44, mesh = new THREE.InstancedMesh(floretGeometry(0.0075, { segs: [6, 3] }), petal, N), o = new THREE.Object3D(), c = new THREE.Color();
  const piles = [[-0.2, -0.22], [0.24, -0.3], [0.33, 0.12], [-0.3, 0.05], [0.05, -0.36]];
  for (let i = 0, k = 0; i < N; k++) {
    const r = j => rand(501, k * 8 + j), [px, pz] = piles[k % piles.length], R = 0.07 * Math.sqrt(r(0)), a = r(1) * 2 * Math.PI;
    const x = px + R * Math.cos(a), z = pz + R * Math.sin(a) * 0.7;
    if (Math.hypot(x, z) < 0.08 || z < TABLE.zb + 0.03) continue;
    o.position.set(x, 0.0012, z); o.rotation.set(lerp(-0.5, 0.5, r(2)) + (r(3) < 0.3 ? Math.PI : 0), r(4) * 6.283, lerp(-0.4, 0.4, r(5)), 'YXZ');
    o.scale.setScalar(lerp(0.8, 1.15, r(6))); o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix); mesh.setColorAt(i, c.setRGB(1, lerp(0.75, 1, r(7)), lerp(0.6, 1, r(7)))); i++;
  }
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

// ── 身后左边的桂花树：三团树冠叠成不规则的圆顶，一万多片深绿的亮叶贴着外壳长；里面一团暗芯，叶缝里就看不穿 ──
const CROWN = [
  { at: [-2.6, 0.5, -3.6], r: [1.7, 1.1, 1.3], n: 7000 },
  { at: [-1.9, 1.3, -3.3], r: [1.1, 0.8, 0.9], n: 3500 },
  { at: [-1.25, 0.05, -3.0], r: [0.9, 0.7, 0.8], n: 2500 },
];
const lobeBump = (seed, d) => { const az = Math.atan2(d.x, -d.z); return 1 + 0.2 * (2 * n2(seed, az * 2.2, d.y * 2.5) - 1) + 0.08 * (2 * n2(seed + 1, az * 7, d.y * 7) - 1); };
function crown() {
  const g = new THREE.Group(), N = CROWN.reduce((s, c) => s + c.n, 0), o = new THREE.Object3D(), tone = new THREE.Color(), d = V3();
  const mat = translucent(new THREE.MeshStandardMaterial({ color: '#1f3818', roughness: 0.38, side: THREE.DoubleSide }), 'osmanthus-crown', '#8a9a30', 0.16);
  const mesh = new THREE.InstancedMesh(leafGeometry(0.075, { segs: [6, 2], fold: 0.2, curl: 0.1 }), mat, N), core = new THREE.MeshStandardMaterial({ color: '#101a0c', roughness: 1 });
  let i = 0;
  CROWN.forEach((L, li) => {
    for (let k = 0; k < L.n; k++) {
      const r = j => rand(601 + li, k * 8 + j), u = lerp(-0.75, 1, r(0)), ph = 2 * Math.PI * r(1), s = Math.sqrt(1 - u * u);
      d.set(s * Math.cos(ph), u, s * Math.sin(ph));
      const shell = 0.8 + 0.22 * Math.sqrt(r(2)), rho = shell * lobeBump(611 + li * 5, d);
      o.position.set(L.at[0] + d.x * L.r[0] * rho, L.at[1] + d.y * L.r[1] * rho, L.at[2] + d.z * L.r[2] * rho);
      o.rotation.set(lerp(-1.2, 1.2, r(3)), r(4) * 6.283, lerp(-1, 1, r(5)), 'YZX');
      o.scale.setScalar(lerp(0.75, 1.25, r(6))); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i++, tone.setScalar(lerp(0.2, 0.8, ss(0.8, 1.02, shell)) * (0.5 + 0.5 * (u + 1) / 2) * lerp(0.7, 1.2, r(7))));   // 越往里、越往下越暗
    }
    const c = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), core); c.position.set(...L.at); c.scale.set(...L.r.map(x => x * 0.8));
    g.add(c);
  });
  g.add(mesh);
  return g;
}

// ── 剪影的那一枝：从树冠斜伸到瓶子后上方（瓶后 1 米左右），对生的叶子两两交错，叶腋里一簇簇花。逆光：叶子暗，边上透一点光，花一粒粒亮着 ──
function branch(petal, leafM) {
  const g = new THREE.Group(), o = new THREE.Object3D();
  const curve = new THREE.CatmullRomCurve3([V3(-1.6, 1.1, -1.7), V3(-1.0, 0.72, -1.35), V3(-0.55, 0.5, -1.15), V3(-0.18, 0.4, -1.05), V3(0.16, 0.35, -1.0)]);
  const tube = new THREE.TubeGeometry(curve, 120, 1, 8), tp = tube.attributes.position, c = V3();
  for (let i = 0; i < tp.count; i++) {                                   // 由粗到细：9 → 2 毫米
    const k = Math.floor(i / 9) / 120; curve.getPointAt(k, c);
    tp.setXYZ(i, ...V3().fromBufferAttribute(tp, i).sub(c).multiplyScalar(lerp(0.009, 0.002, k)).add(c).toArray());
  }
  tube.computeVertexNormals();
  g.add(new THREE.Mesh(tube, new THREE.MeshStandardMaterial({ color: '#3a3029', roughness: 0.8 })));
  const nodes = [0.3, 0.42, 0.53, 0.63, 0.72, 0.8, 0.87, 0.93, 0.98], leaves = new THREE.InstancedMesh(leafGeometry(0.085, { segs: [24, 4], fold: 0.3, curl: 0.2 }), leafM, nodes.length * 2);
  const flo = new THREE.InstancedMesh(floretGeometry(0.0075, { segs: [6, 3] }), petal, nodes.length * 11), up = V3(0, 1, 0), P = V3(), T = V3();
  let nl = 0, nf = 0;
  nodes.forEach((k, n) => {
    curve.getPointAt(k, P); curve.getTangentAt(k, T);
    const side = V3().crossVectors(T, up).normalize(), U = V3().crossVectors(side, T);
    for (const sgn of [-1, 1]) {                                          // 一对叶：左右（或上下）交错，往下垂，叶尖朝枝梢
      const r = j => rand(701, n * 8 + (sgn > 0 ? 4 : 0) + j), a = (n % 2 ? Math.PI / 2 : 0) + (sgn > 0 ? Math.PI : 0) + lerp(-0.3, 0.3, r(0));
      const dir = V3().addScaledVector(side, Math.cos(a)).addScaledVector(U, 0.6 * Math.sin(a)).addScaledVector(T, 0.9).add(V3(0, -0.7 - 0.3 * r(1), 0)).normalize();
      aim(o, P, dir, lerp(-0.6, 0.6, r(2))); o.scale.setScalar(lerp(0.8, 1.15, r(3))); o.updateMatrix(); leaves.setMatrixAt(nl++, o.matrix);
    }
    if (k < 0.5) return;
    for (let f = 0; f < 11; f++) {                                        // 叶腋里一簇花：挂在节下面一个小球里，各朝各的方向
      const r = j => rand(711, (n * 11 + f) * 8 + j), u = lerp(-1, 0.6, r(0)), ph = 2 * Math.PI * r(1), s = Math.sqrt(1 - u * u), dir = V3(s * Math.cos(ph), u, s * Math.sin(ph));
      aim(o, V3().copy(P).addScaledVector(dir, 0.012 * (0.6 + 0.4 * r(2))).add(V3(0, -0.006, 0)), dir, r(3) * 6.283, up); o.updateMatrix(); flo.setMatrixAt(nf++, o.matrix);
    }
  });
  leaves.count = nl; flo.count = nf;
  g.add(leaves, flo);
  return g;
}

// ── 焦外光斑：朝向相机的圆片，边缘略亮（镜头的球差），相加混合；颜色 × 亮度来自 instanceColor，慢慢明灭（叶子在风里动）按 uTime 和实例号 ──
function bokehMaterial(time, { soft = 0.2, twinkle = 0.35 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: time, uSoft: { value: soft }, uTw: { value: twinkle } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
uniform float uTime, uTw; varying vec2 vUv; varying vec3 vC;
void main() {
  vec3 c = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float s = length((modelMatrix * instanceMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz), id = float(gl_InstanceID);
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vUv = position.xy * 2.0;
  vC = instanceColor * (1.0 - uTw + uTw * (0.5 + 0.5 * sin(uTime * (0.5 + 0.8 * fract(id * 0.618)) + id * 2.4)));
  gl_Position = projectionMatrix * viewMatrix * vec4(c + (right * position.x + up * position.y) * s, 1.0);
}`,
    fragmentShader: /* glsl */`
uniform float uSoft; varying vec2 vUv; varying vec3 vC;
void main() {
  float r = length(vUv);
  gl_FragColor = vec4(vC * smoothstep(1.0, 1.0 - uSoft, r) * (0.7 + 0.3 * smoothstep(0.4, 0.95, r)), 1.0);
}`,
  });
}
/** 光斑的实例：spots = [[x, y, z, 直径, 亮度], …]；颜色在 colors 两色之间（默认金橙到奶白） */
function bokeh(time, spots, seed, { colors = ['#ffa84a', '#ffe6b8'], ...opts } = {}) {
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), bokehMaterial(time, opts), spots.length), o = new THREE.Object3D(), c = new THREE.Color();
  const [warm, cream] = colors.map(x => new THREE.Color(x));
  spots.forEach(([x, y, z, D, k], i) => {
    o.position.set(x, y, z); o.scale.setScalar(D); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
    mesh.setColorAt(i, c.copy(warm).lerp(cream, rand(seed, i)).multiplyScalar(k));
  });
  mesh.frustumCulled = false; mesh.renderOrder = 5;
  return mesh;
}
const sunward = (x, y, z) => { const d = V3(x, y, z).normalize(); return Math.max(d.dot(SUN), 0) ** 8; };
function sceneBokeh(time) {
  const spots = [], hedge = LINES[2];
  for (let i = 0; i < 34; i++) {                                         // 树篱梢上漏下来的：太阳两边
    const r = j => rand(801, i * 4 + j), th = ((lerp(-8, 62, r(0)) * Math.PI) / 180), R = hedge.R - 0.25, y = hedge.top(th * hedge.R) - lerp(0.0, 0.14, r(1));
    const x = Math.sin(th) * R, z = -Math.cos(th) * R;
    spots.push([x, y, z, lerp(0.05, 0.12, r(2)), lerp(0.35, 0.8, r(3)) + 2.2 * sunward(x, y, z)]);
  }
  for (let i = 0; i < 26; i++) {                                         // 远处树影的缝里：大而淡
    const r = j => rand(803, i * 4 + j), th = ((lerp(0, 48, r(0)) * Math.PI) / 180), R = 20, y = lerp(0.6, 2.2, r(1));
    const x = Math.sin(th) * R, z = -Math.cos(th) * R;
    spots.push([x, y, z, lerp(0.25, 0.55, r(2)), lerp(0.2, 0.45, r(3)) + 1.2 * sunward(x, y, z)]);
  }
  const d = V3();
  for (let i = 0, k = 0; i < 20; k++) {                                  // 树冠朝太阳一侧的边上：稀、暗，那边是字
    const r = j => rand(805, k * 4 + j), L = CROWN[k % 2], u = lerp(-0.2, 0.9, r(0)), ph = 2 * Math.PI * r(1), s = Math.sqrt(1 - u * u);
    d.set(s * Math.cos(ph), u, s * Math.sin(ph));
    if (d.x < 0.35 && d.y < 0.55) continue;
    spots.push([L.at[0] + d.x * L.r[0] * 1.02, L.at[1] + d.y * L.r[1] * 1.02, L.at[2] + d.z * L.r[2] * 1.02, lerp(0.04, 0.08, r(2)), lerp(0.25, 0.5, r(3))]);
    i++;
  }
  return bokeh(time, spots, 807);
}

// ── 特写：叶腋里的一簇桂花 ──
// 放在茶台右端外 1.9 米（离开所有瓶子镜头的视野和主光的阴影盒）。在花簇自己的坐标里设计：x 向右、y 向上、+z 朝相机；
// 整簇绕 y 转一点，相机就朝着太阳左边一点看：逆光，花瓣透亮，太阳的光晕在画面右上
const MACRO_AT = [3.2, 0.12, 0.3], MACRO_YAW = -0.08;

/**
 * 一簇桂花 + 最下面一朵瓣尖上的露珠 + 后面虚掉的枝叶、花和光斑。返回 root、frame（取景盒，世界坐标；压到露珠的深度，对焦 'target' 就落在露珠上）、
 * dir(yaw, pitch)（相机方向，按花簇坐标的方位 / 仰角，度）、drop(R, tau)（同 whitetea：挂着时顶端扎在瓣尖上，松开前 0.3 秒被坠长，tau > 0 后按瓶里水滴的曲线落下）、
 * update(t)（后面飘落的几朵）
 */
function macroCluster(hz, time) {
  const root = new THREE.Group(), petal = petalMaterial(), veins = veinTexture(), leafM = leafMaterial(veins, '#1f3a18');
  const bark = new THREE.MeshStandardMaterial({ color: '#4a3c30', roughness: 0.8 }), stalk = new THREE.MeshPhysicalMaterial({ color: '#9a9446', roughness: 0.5, sheen: 0.5, sheenColor: '#f0e6c0' });
  const N = V3(0, 0.004, -0.01), up = V3(0, 1, 0), o = new THREE.Object3D(), c = new THREE.Color();
  const twig = new THREE.CatmullRomCurve3([V3(-0.08, -0.05, -0.03), V3(-0.035, -0.014, -0.016), N, V3(0.035, 0.03, -0.016), V3(0.08, 0.06, -0.03)]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(twig, 80, 0.001, 10), bark));
  const leaf = geo => new THREE.Mesh(geo, leafM);
  root.add(aim(leaf(leafGeometry(0.08, { segs: [80, 10], fold: 0.25, curl: 0.1 })), N, V3(-0.7, 0.5, -0.8), 0.5));   // 对生的两片叶：左上后方、右下后方，都伸出画面
  root.add(aim(leaf(leafGeometry(0.075, { segs: [80, 10], fold: 0.2, curl: 0.15 })), N, V3(0.75, -0.25, -0.85), -0.6));
  const fl = floretGeometry(0.0075, { segs: [16, 8] }), subject = [], BUDS = [5, 9, 13];
  let tip = null;
  for (let k = 0; k < 16; k++) {                                         // 十六朵（三个花苞）：花梗 4.5–7 毫米，从节上挤成一个朝相机的半球；第 0 朵朝相机略向下，挂露珠
    const r = j => rand(401, k * 6 + j), ph = k * 2.4 + 0.4 * r(0), th = lerp(0.2, 1.5, Math.sqrt((k + r(1)) / 16));
    const dir = k === 0 ? V3(0.1, -0.6, 0.8).normalize() : V3(Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph) - 0.1, Math.cos(th)).normalize();
    const len = k === 0 ? 0.0075 : lerp(0.0045, 0.007, r(2)), A = N.clone().addScaledVector(dir, 0.0006), C = N.clone().addScaledVector(dir, 0.55 * len).add(V3(0, -0.0008, 0)), B = N.clone().addScaledVector(dir, len);
    const ped = new THREE.QuadraticBezierCurve3(A, C, B), T = B.clone().sub(C).normalize();
    root.add(new THREE.Mesh(new THREE.TubeGeometry(ped, 16, 0.0002, 6), stalk));
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.00025, 0.0009, 8), stalk); aim(cup, B.clone().addScaledVector(T, -0.0004), T, 0, up); root.add(cup);
    const bud = BUDS.includes(k), f = new THREE.Mesh(bud ? new THREE.SphereGeometry(0.0014, 16, 12) : fl, petal);
    if (bud) { f.geometry.scale(1, 1.35, 1); f.geometry.translate(0, 0.0016, 0); f.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Array(f.geometry.attributes.position.count).fill([0.85, 0.42, 0.04]).flat(), 3)); }
    aim(f, B, T, r(3) * 6.283, up); root.add(f); subject.push(f);
    if (k === 0) {                                                       // 露珠挂在这朵最低的一片瓣尖上
      f.updateMatrix();
      tip = [0, 1, 2, 3].map(i => petalTip(0.00375, i).applyMatrix4(f.matrix)).reduce((a, b) => (b.y < a.y ? b : a));
    }
  }
  // 后面虚掉的：一百多片深浅不一的叶子（右上留一个口，太阳的光晕从那里进来），几十个橙色的小光斑（远处的花）、更远一圈暖金色的大光斑（太阳一侧多）
  const bgLeaves = new THREE.InstancedMesh(leafGeometry(0.08, { segs: [16, 4], fold: 0.25, curl: 0.15 }), leafM, 150);
  let nb = 0;
  for (let i = 0; nb < 150; i++) {
    const r = j => rand(421, i * 8 + j), z = -lerp(0.05, 0.7, r(0) ** 1.3), s = 1 - z * 0.8, x = lerp(-0.4, 0.4, r(1)), y = lerp(-0.3, 0.3, r(3));
    if (x > 0.05 && y > 0.04 && x + y > 0.16) continue;
    o.position.set(x * s, y * s, z);
    o.rotation.set(lerp(-1, 1, r(4)), r(5) * 6.283, lerp(-0.8, 0.4, r(6)), 'YZX'); o.scale.setScalar(lerp(0.8, 1.2, r(7))); o.updateMatrix();
    bgLeaves.setMatrixAt(nb, o.matrix); bgLeaves.setColorAt(nb++, c.setScalar(lerp(0.3, 0.85, r(2))));
  }
  const spots = [], flo = [];
  for (let i = 0; i < 40; i++) {
    const r = j => rand(441, i * 5 + j), z = -lerp(0.5, 1.1, r(0)), s = -z;
    spots.push([lerp(-0.3, 0.45, r(1) ** 0.8) * s, lerp(-0.05, 0.3, r(2)) * s, z, lerp(0.012, 0.03, r(3)) * s, lerp(0.35, 0.9, r(4))]);
  }
  for (let i = 0; i < 30; i++) {
    const r = j => rand(445, i * 5 + j), z = -lerp(0.2, 0.5, r(0)), s = -z;
    flo.push([lerp(-0.35, 0.35, r(1)) * s, lerp(-0.3, 0.05, r(2)) * s, z, lerp(0.02, 0.04, r(3)) * s, lerp(0.25, 0.6, r(4))]);
  }
  const falling = driftField({ geometry: floretGeometry(0.0075, { segs: [6, 3] }), material: petal, count: 7, seed: 451, box: [-0.2, -0.15, -0.45, 0.2, 0.2, -0.06], vel: [0.004, -0.012, 0], sway: 0.01, swayHz: 0.3, spin: 0.4 });
  root.add(bgLeaves, bokeh(time, spots, 443, { soft: 0.3, twinkle: 0.25 }), bokeh(time, flo, 447, { soft: 0.5, twinkle: 0.1, colors: ['#e07a10', '#f0a020'] }), falling.mesh);
  const dew = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), dewMaterial(hz, { below: '#2e2a12', above: '#f0b040' }));
  root.add(dew);
  const drop = (R, tau = -1) => {
    if (tau > 0) { const sy = stretch(tau), w = R * Math.sqrt(1.4 / sy); dew.scale.set(w, sy * R, w); dew.position.set(tip.x, tip.y - 1.2 * R - fallen(tau), tip.z); }
    else { const sy = 1.2 + 0.2 * ss(-0.3, 0, tau); dew.scale.set(R, sy * R, R); dew.position.set(tip.x, tip.y + 0.2 * R - sy * R, tip.z); }   // 顶端在瓣尖上方 0.2R：瓣尖扎进水珠一点
    dew.updateMatrix();
  };
  drop(DROP.R);
  root.updateMatrixWorld(true);
  const frame = new THREE.Box3();
  for (const o of [...subject, dew]) frame.expandByObject(o, true);
  const cx = lerp((frame.min.x + frame.max.x) / 2, tip.x, 0.5), hw = 0.37 * (frame.max.y - frame.min.y);   // 竖长一点（宽 = 0.74 高）：16:9 里整簇在右边、左下的字让开；两边伸出去的花出画
  frame.min.x = cx - hw; frame.max.x = cx + hw;
  frame.min.z = frame.max.z = tip.z;                                    // 压成露珠所在的一个平面
  root.position.set(...MACRO_AT); root.rotation.y = MACRO_YAW; root.updateMatrixWorld(true);
  frame.applyMatrix4(root.matrixWorld);
  const dir = (yaw, pitch) => { const Y = (yaw * Math.PI) / 180, P = (pitch * Math.PI) / 180; return V3(Math.sin(Y) * Math.cos(P), Math.sin(P), Math.cos(Y) * Math.cos(P)).applyQuaternion(root.quaternion).toArray(); };
  return { root, frame, dir, drop, update: falling.update };
}

export async function build(ctx) {
  const { scene } = ctx, hz = haze(SKY), time = { value: 0 };
  scene.background = new THREE.Color(SKY.horizon);
  scene.add(sky(hz));
  for (const L of LINES) { const m = new THREE.Mesh(lineGeometry(L), lineMaterial(hz, L)); m.frustumCulled = false; scene.add(m); }
  const ground = new THREE.Mesh(new THREE.CircleGeometry(14, 48), new THREE.MeshStandardMaterial({ color: '#1a170f', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.75;
  const petal = petalMaterial(), leafM = leafMaterial(veinTexture(), '#2b4722');
  scene.add(ground, table(), fallenFlorets(petal), crown(), branch(petal, leafM), sceneBokeh(time));

  const key = new THREE.DirectionalLight(KEY.color, KEY.intensity);
  key.position.copy(SUN).multiplyScalar(1.5); key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -0.5, right: 0.5, top: 0.5, bottom: -0.5, near: 0.1, far: 3 });
  key.shadow.camera.updateProjectionMatrix(); key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 4;
  scene.add(key, key.target);

  // 飘落的花：瓶子身后、枝下面，慢慢往下、往右飘，边落边翻
  const florets = driftField({ geometry: floretGeometry(0.008, { segs: [6, 3] }), material: petal, count: 40, seed: 303, box: [-0.9, 0.0, -1.6, 0.9, 0.8, -0.14], vel: [0.03, -0.05, 0.012], sway: 0.05, swayHz: 0.35, size: [0.8, 1.25], spin: 0.9 });
  scene.add(florets.mesh);

  const cluster = macroCluster(hz, time); scene.add(cluster.root);

  return {
    haze: hz,
    env: {
      base: null, strip: '#ffe4c0', k: 4,
      // 天空；地平线上一圈暗的树篱和树影、左后方一团树冠（玻璃的棱和台面在低处映出来的是它们，不是一整片亮天）；身前一块暖色的反光板
      fill: (add, B, es) => {
        es.add(sky(hz, { R: 15 }));
        const band = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 6.6, 64, 1, true), B('#1d1c10')); band.position.y = -2.8; es.add(band);
        const tree = new THREE.Mesh(new THREE.SphereGeometry(4.5, 32, 16), B('#141a0e')); tree.position.set(-7, 2.1, -9.7); es.add(tree);
        add(10, 4, [0, 1.5, 12], B('#7a5638', 0.8));
      },
    },
    post: { exposure: 1.0, aperture: 0.7, maxBlur: 0.018, bloom: { strength: 0.35, threshold: 0.8 }, saturation: 1.05, lift: [0.012, 0.007, 0.002], gamma: [1, 0.97, 0.93], gain: [1.03, 1, 0.95], vignette: 0.3, grain: 0.03 },
    macro: {
      root: cluster.root,
      // 慢慢绕到花簇左边、同时推近：露珠里的高光和身后的光斑跟着走
      camera: s => ({ type: 'fit', box: cluster.frame, dir: cluster.dir(lerp(-10, 6, easeInOut(s.u)), 0), fov: 28, scale: lerp(1, 1.1, easeInOut(s.u)) }),
      post: { aperture: 1.2, maxBlur: 0.03, exposure: 0.72, gamma: [1, 0.98, 0.9], saturation: 1.35 },
    },
    update(ctx, s) {
      hz.uniforms.hTime.value = s.t; time.value = s.t;
      florets.update(s.t); cluster.update(s.t);
      const rel = s.dur - DROP.pre;                                       // 特写最后 DROP.pre 秒露珠松开：硬切到 drop，瓶里的水滴接着落
      if (s.name === 'macro') cluster.drop(lerp(0.0014, DROP.R, ss(0, rel - 0.3, s.lt)), s.lt - rel);   // 先慢慢长大
    },
    reset() { cluster.drop(DROP.R); },
  };
}
```

Notes:
- **The translucency colours are chosen for the linear-space product** described above. With a warm translucency colour and orange vertex colours, the backlit petals came out orange to salmon. Keep the translucency near white and put the hue in the vertex or instance colour.
- **Crown bokeh.** The crown's sun-side bokeh is sparse and dim on purpose: at 16:9 the hero's 桂花 and the end card's 闻境 sit over that edge.
- **The table** is a `MeshPhysicalMaterial`. That is still a `MeshStandardMaterial` for the world test and the caustic, and it has no maps; the grain is all in the shader.

Run: `node --test 03-perfume/test/worlds.test.mjs`
Expected: PASS (15 tests).

- [ ] **Step 4: Look at it**

```bash
node factory/snap.mjs 03-perfume --sku osmanthus --t 1.0,1.9,2.2,2.3,2.7,3.2,3.9,5.8,6.4,9.3,10.7,11.0,11.4,13.5 --ar 9x16 --out /tmp/t17
node factory/snap.mjs 03-perfume --sku osmanthus --t 1.0,2.2,2.7,3.9,5.8,9.3,11.0,13.5 --ar 1x1 --out /tmp/t17
node factory/snap.mjs 03-perfume --sku osmanthus --t 1.0,2.2,2.7,3.9,5.8,9.3,11.0,13.5 --ar 16x9 --out /tmp/t17
node factory/snap.mjs 03-perfume --sku osmanthus --cut 6 --t 0.2,0.8,1.8,2.4,3.5,5.5 --ar 9x16 --out /tmp/t17/6s
```

Expected timings:
- about 130–155 ms per 9x16 frame, 73–105 ms at 1x1 and 134–183 ms at 16x9;
- 127–171 ms per frame for the 6 s cut;
- the first frame of a run also compiles the shaders, about 180–190 ms at 9x16.

These timings were measured while other renders shared the machine.

- **t = 1.0 (macro):**
  - a cluster of golden four-petal florets on a dark twig, backlit, against a cream sun glow at the upper right;
  - two dark olive leaves reach out of frame, and the three buds are orange;
  - the dew hangs from the lowest petal tip, holding the scene upside down with a small bright highlight;
  - below, warm orange and gold bokeh, with 一树金桂，满城秋香 legible over it;
  - at 16:9 the cluster sits right of centre, and the hook is on the left.
- **t = 1.9 (macro):** the dew is full-size and a little elongated.
- **t = 2.2 (macro):** the dew has left the petal tip.
- **t = 2.3 (drop):** hard cut to the inside of the bottle.
  - The frame is amber. The drop hangs over a pale band of liquid surface.
  - The garden shows blurred through the glass.
- **t = 2.7 (drop):**
  - the drop is just above the surface, still sharp;
  - at 16:9 the chamfered corners refract the garden into angled facets on the left.
- **t = 3.2 (drop):** rings spread across the surface.
- **t = 3.9 (drop):**
  - the whole bottle stands on dark elm with visible grain;
  - a long shadow falls towards the camera, with the caustic streak inside it and small rainbow fringes;
  - fallen florets are scattered on the table.
- **t = 5.8 and 6.4 (hero):**
  - a bright bokeh treeline behind the bottle, and the amber liquid;
  - 桂花 and 闻境 · WENJING are legible;
  - by 6.4 the dark crown fills the left edge.
- **t = 9.3 (anatomy):** the dark leafy crown fills the background. 前调 杏子, 中调 桂花, 后调 檀香 and 50 ml · 浓香水 are legible against it.
- **t = 10.7–11.4 (spray):**
  - the cap floats above the pump, against the hazy garden and bokeh;
  - a glint cloud leaves the nozzle to the left, subtle against the bright haze.
- **t = 13.5 (end):**
  - 闻境, WENJING, 闻香 · 入境 and the gold 点击购买 button are legible, with the bottle above;
  - fallen florets lie on the table, and a few rainbow blocks from the caustic show in the lower frame;
  - at 16:9 the text is on the left, over the crown.
- **6 s cut (`/tmp/t17/6s`):**
  - 0.2: rings on the liquid;
  - 0.8: a close view of the bottle;
  - 1.8 and 2.4: the hero with 桂花;
  - 3.5: the end card without the button;
  - 5.5: the end card with the button.
- **No frame** shows the macro set outside the macro, the edge of the sky or of a tree line, or salmon-pink petals.

- [ ] **Step 5: The osmanthus score**

Make these exact replacements in `03-perfume/js/score.js`:

1. Replace:

```js
// 桂花、海盐、玫瑰在 Tasks 17–19 写自己的编曲；在那之前先用白茶的
export const SCORES = { whitetea, osmanthus: whitetea, seasalt: whitetea, rose: whitetea };
```

   with:

```js
// 桂花：F 大调（F G A B♭ C D E），毛毡钢琴、钢片琴、温暖的弦乐铺底；秋天傍晚的园子
const OS = { felt: { t60: 3, bright: 0.14 }, soft: { t60: 2.4, bright: 0.1 }, low: { t60: 4.5, bright: 0.16 }, cel: { ratios: [1, 2, 3, 4.08], bright: 0.4 }, pad: { a: 1.4, r: 1.4, cut: 2.4, air: 0.45 } };
const osmanthus = {
  tonic: 65,                                               // F4
  reverb: { decay: 3.8, music: 0.6, sfx: 0.25 },
  bed: { type: 'bandpass', f: 600, q: 0.5, a: 0.6, r: 1.4, wander: 0.6, v: 0.32 },  // 园子里低低的风和树叶声
  m15: () => [
    // 0–2.25 微距：F3 + C4 的弦乐慢慢升起，毛毡钢琴稀疏地落几个音，钢片琴闪两下，像花上的露水
    ...seq('pad', 0, [[0, 53, 3.6, 1], [0, 60, 3.6, 0.88], [0, 65, 3.6, 0.62], [0, 69, 3.6, 0.5]], OS.pad),
    ...seq('pluck', 0, [[0, 72, 3, 0.3], [1, 69, 3, 0.35], [1.5, 67, 2, 0.26], [2, 69, 3, 0.3], [2.5, 64, 3, 0.24]], OS.felt),
    ...seq('bell', 0, [[0.5, 84, 2.4, 0.3], [2, 81, 2, 0.2]], OS.cel),
    // 2.25–3 落下：一阵低低的气流，钢片琴十六分音符下行 A5 G5 F5 D5，落进 3.0 的命中
    { t: 2.25, voice: 'noise', f: 380, d: 0.75, v: 0.4, bus: 'music', p: { type: 'bandpass', q: 1.2, sweep: 5, a: 0.7, r: 0.05 } },
    ...seq('bell', 2.25, [[0, 81, 1.2, 0.3], [0.25, 79, 1.2, 0.34], [0.5, 77, 1.2, 0.38], [0.75, 74, 1.4, 0.42]], OS.cel),
    // 3.0 命中：低音 F2 + F3、钢片琴 F5，弦乐涨到 F 大三和弦；之后稀疏的回声
    ...seq('pluck', 3, [[0, 41, 4, 0.4], [0, 53, 3, 0.26]], OS.low),
    ...seq('bell', 3, [[0, 77, 3, 0.5], [1.5, 84, 1.6, 0.2]], OS.cel),
    ...seq('pad', 3, [[0, 53, 1.6, 1], [0, 60, 1.6, 0.88], [0, 69, 1.6, 0.5]], { ...OS.pad, a: 0.2 }),
    ...seq('pluck', 3, [[1, 72, 2, 0.22], [1.5, 77, 2, 0.18]], OS.soft),
    // 4.5 正面：毛毡钢琴的主题 A4 → C5 → D5，6.0 落到 F5；底下是 B♭ 大七
    ...seq('pluck', 4.5, [[0, 69, 1.5, 0.45], [1, 72, 1, 0.4], [1.5, 74, 1.5, 0.42]], OS.felt),
    ...seq('pad', 4.5, [[0, 46, 1.6, 1], [0, 53, 1.6, 0.88], [0, 57, 1.6, 0.69], [0, 62, 1.6, 0.62], [0, 65, 1.6, 0.5]], { ...OS.pad, a: 1 }),
    ...seq('pluck', 4.5, [[0, 58, 2, 0.32], [1, 62, 2, 0.25]], OS.soft),
    // 6.0 命中：主题落到 F5，钢片琴高八度闪一下，和声转到 Dm7（秋天的一点怀旧）；主题再回 E5、D5
    ...seq('pluck', 6, [[0, 77, 3, 0.48], [1, 76, 2, 0.32], [1.5, 74, 2.5, 0.34]], OS.felt),
    ...seq('pluck', 6, [[0, 50, 3, 0.5], [0, 57, 3, 0.36]], OS.low),
    ...seq('bell', 6, [[0, 89, 1.6, 0.3], [0.25, 84, 1.2, 0.18]], OS.cel),
    ...seq('pad', 6, [[0, 50, 1.7, 1], [0, 57, 1.7, 0.88], [0, 60, 1.7, 0.69], [0, 65, 1.7, 0.62], [0, 69, 1.7, 0.44]], { ...OS.pad, a: 0.4 }),
    // 7.5–10.5 分解：很轻的八分音符，B♭ 两拍、C7 两拍；配音在这里讲香调，钢琴只垫着
    ...seq('pluck', 7.5, [[0, 65, 1, 0.22], [0.5, 70, 1, 0.16], [1, 69, 1, 0.2], [1.5, 65, 1, 0.16], [2, 67, 1, 0.22], [2.5, 72, 1, 0.16], [3, 70, 1, 0.2], [3.5, 67, 1, 0.16]], OS.soft),
    ...seq('pad', 7.5, [[0, 46, 2.1, 0.85], [0, 53, 2.1, 0.6], [0, 62, 2.1, 0.45], [2, 48, 2.1, 0.8], [2, 55, 2.1, 0.58], [2, 64, 2.1, 0.42]], { ...OS.pad, a: 0.8 }),
    ...seq('pluck', 7.5, [[0, 46, 2, 0.34], [2, 48, 2, 0.3]], OS.low),
    // 10.5–12 喷雾：弦乐停在 Csus4 上等着回家；喷完之后钢片琴下行 C6 A5 F5，像雾慢慢落下
    ...seq('pad', 10.5, [[0, 48, 1.6, 0.8], [0, 55, 1.6, 0.6], [0, 65, 1.6, 0.45], [0, 72, 1.6, 0.35]], { ...OS.pad, a: 0.5, r: 0.8 }),
    ...seq('bell', 10.5, [[0.75, 84, 1.6, 0.24], [1, 81, 1.4, 0.2], [1.25, 77, 1.4, 0.18]], OS.cel),
    // 12.0 片尾：品牌动机（共用），F add9 的弦乐和低音 F 收住
    ...seq('pad', 12, [[0, 53, 3, 1], [0, 60, 3, 0.88], [0, 67, 3, 0.56], [0, 69, 3, 0.5]], { ...OS.pad, a: 0.5, r: 0.8 }),
    ...seq('pluck', 12, [[0, 41, 4, 0.36], [0, 53, 4, 0.22]], OS.low),
  ],
  m6: () => [
    // 0 命中：水滴落下就开始，低音 F3、钢片琴 A5、弦乐
    ...seq('pluck', 0, [[0, 53, 3, 0.36], [0, 60, 2, 0.22]], OS.low),
    ...seq('bell', 0, [[0, 81, 2.4, 0.36]], OS.cel),
    ...seq('pad', 0, [[0, 53, 1.8, 1], [0, 60, 1.8, 0.75], [0, 64, 1.8, 0.38]], { ...OS.pad, a: 0.25 }),
    // 0.375–1.5 毛毡钢琴八分音符上行 F4 A4 C5
    ...seq('pluck', 0, [[0.5, 65, 1, 0.3], [1, 69, 1, 0.33], [1.5, 72, 1, 0.36]], OS.felt),
    // 1.5 正面：主题 D5 C5，2.25 光带峰值落在 F5 上，钢片琴高八度；底下是 B♭
    ...seq('pluck', 1.5, [[0, 74, 1.5, 0.4], [0.5, 72, 1, 0.3], [1, 77, 2, 0.45], [1.5, 76, 1.5, 0.3]], OS.felt),
    ...seq('bell', 2.25, [[0, 89, 1.4, 0.28]], OS.cel),
    ...seq('pad', 1.5, [[0, 46, 1.8, 0.88], [0, 53, 1.8, 0.62], [0, 62, 1.8, 0.38]], { ...OS.pad, a: 0.3 }),
    ...seq('pluck', 1.5, [[0, 46, 2, 0.45]], OS.low),
    // 3.0 片尾：品牌动机（共用），F 大七收住
    ...seq('pad', 3, [[0, 53, 2.6, 1], [0, 60, 2.6, 0.69], [0, 64, 2.6, 0.38], [0, 69, 2.6, 0.35]], { ...OS.pad, a: 0.4, r: 0.8 }),
    ...seq('pluck', 3, [[0, 41, 3.5, 0.36], [0, 53, 3.5, 0.22]], OS.low),
  ],
};

// 海盐、玫瑰在 Tasks 18–19 写自己的编曲；在那之前先用白茶的
export const SCORES = { whitetea, osmanthus, seasalt: whitetea, rose: whitetea };
```

Notes:
- **The levels are set for the loudness chain.** The felt piano and celesta are quiet voices, so the score is quiet. That raises the loudness gain in `loudnessFilter`, and with it every shared transient: the plink at the landing, and the cap-seat click at 11.95 s.
  - In the first draft the score alone needed 15.2 dB of gain. The limiter trimmed 7.2 dB at 3.0 s, and after encoding the cap click set the true peak.
  - Softer low plucks alone brought the trim at 3.0 s down only to 6.5 dB.
  - More sustained level fixed it: fuller pads with upper voices, and pads under the anatomy and the spray.
  - The score alone (`vo: 'off'`) now needs about 13.5 dB. The limiter trims at most 3.1 dB in the 15 s cut (at 3.0 s) and 4.1 dB in the 6 s cut (at 0 and 3.0 s). Both encode in one pass, at −1.7 and −2.2 dBTP.
  - With the voice-over the mix is louder, so the gain is about 10 dB, and one pass gives −1.9 (15 s) and −2.0 dBTP (6 s).
- **Level guidance for Tasks 18–19.** A soft palette needs sustained level under the whole film, not only quieter hits. Otherwise one transient sets the true peak, and `encodeAudio` has to limit the whole cut harder to bring it under `LOUD.TP`.

Run: `node --test 03-perfume/test/score.test.mjs`
Expected: PASS (8 tests).

With `npm run serve` running, open `http://127.0.0.1:8765/03-perfume/?sku=osmanthus&vo=off&paused` in Chrome. Tick 声音, then press Space. `vo=off` plays the score on its own.

Expected:
- Sound starts about 1.2 s after ticking, while the 15 s mix renders.
- **0–2.25 s:** a warm F string pad (F3, C4, F4, A4) swells in slowly, with a low, soft garden wind under everything. Over it, sparse felt-piano notes (C5, A4, G4, A4, E4) and two celesta glints, at 0.375 and 1.5 s.
- **2.25 s:** a low breath of air and four falling celesta sixteenths, A5 G5 F5 D5.
- **3.0 s:** the drop lands with the plink and its ripples, over a deep F bass (F2 + F3), a celesta F5 and the pad opening into F major. Soft echoes follow at 3.75 and 4.125 s.
- **4.5 s:** after a whoosh, the felt piano plays the theme A4 – C5 – D5 over B♭ major 7.
- **6.0 s:** at the light streak, the theme lands on F5 with a high celesta flash. The bass drops to D and the pad turns to D minor 7, then the theme steps back down to E5 and D5.
- **7.5–10.5 s:** a very quiet eighth-note figure on the felt piano, over B♭ for two beats and C7 for two. This is the room for the voice-over.
- **10.5–12 s:** the glass clink as the cap lifts, the spray hiss and the seat click, over a Csus4 pad. After the spray, the celesta falls C6 A5 F5 (11.06–11.44 s), like the mist settling.
- **12.0 s:** the logo: G4, C5, then a long F5, each pluck with a bell above. A low F pluck and an F add9 pad hold under them, then fade out over the last 0.3 s.
- **The 6 s cut** re-renders in about 0.3 s.
  - It opens on the landing: the plink, a low F, a celesta A5 and the pad. The felt piano rises F4 A4 C5.
  - At 1.5 s the theme plays D5 and C5 over B♭, and lands on F5 with a celesta flash at 2.25 s, the light-streak peak.
  - At 3.0 s the logo plays over F major 7.
- **With the voice-over:** reload without `&vo=off`. Task 16's voice reads 「一树金桂，满城秋香。」 at 4.6 s, 「杏子、桂花、檀香。」 at 7.7 s over the quiet figure, and 「闻境桂花，闻香入境。」 at 12.3 s over the logo. The music dips under each line. The 6 s cut has 「闻境桂花，一树金桂，满城秋香。」 at 1.1 s.

- [ ] **Step 6: Re-run the pre-flight and render**

The manifest's 桂花 variants now render the garden and their own score, so check determinism, the audio and speed again.

Run: `node factory/check.mjs 03-perfume --sku osmanthus; echo "exit $?"`
Expected: every line `ok`, including:
- `determinism  14 frames identical forward and backward`;
- ```
  ok    voice-over   3 lines in 1 variants: every clip present, current, inside its slot
  ok    audio        6 s identical twice, peak -9.5 dBFS, 295 ms · 15 s identical twice, peak -8.5 dBFS, 1059 ms
  ```
- `speed  ~122 ms/frame at 1080×1920 …`;
- then `all checks passed` and `exit 0`.

The audio check renders the mixes with the voice-over, so the peaks are the voice's. The score alone peaks at −12.5 dBFS (6 s) and −13.4 dBFS (15 s).

Run: `node factory/render.mjs 03-perfume --sku osmanthus --cut 15,6 --ar 9x16 --out /tmp/t17/render --force; echo "exit $?"`
Expected:
- One line per video, e.g. `[1/2] wenjing_osmanthus_15s_9x16_zh  450 frames  76.2 s (5.9 fps)  23.2 MB` and `[2/2] wenjing_osmanthus_6s_9x16_zh  180 frames  40.9 s (4.4 fps)  10.5 MB`.
- Then `done 2, skipped 0, failed 0  ·  …` and `exit 0`.
- `/tmp/t17/render/wenjing_osmanthus_15s_9x16_zh.json` has `"audio": true, "lufs": -14, "tp": -1.9`. The 6 s sidecar has `"lufs": -14, "tp": -2`.
- `ffprobe -v error -show_entries stream=codec_type,start_time,duration,sample_rate -of compact /tmp/t17/render/wenjing_osmanthus_15s_9x16_zh.mp4` prints:
  ```
  stream|codec_type=video|start_time=0.000000|duration=15.000000
  stream|codec_type=audio|sample_rate=48000|start_time=0.000000|duration=15.000000
  ```

- [ ] **Step 7: Run all tests and commit**

Run: `npm test`
Expected: PASS, 134 tests.

```bash
git add 03-perfume/js/worlds/osmanthus.js 03-perfume/film.js 03-perfume/js/score.js
git commit -m "Add the osmanthus world: golden-hour garden, backlit branch and bokeh, the floret-cluster dew macro; its own F major score

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 18: The 海盐 world — white rock at the waterline, the salt-crystal macro and the sea-salt score — `seasalt.js`, `score.js`

This task builds the third scent world and gives 海盐 its own music. The bottle stands on a water-worn white rock at the edge of a clear, shallow sea. Behind it, the rock slides under the water, and caustics ripple over the white stone below the surface. A thin lace of foam lies along the waterline. Further out, a few white boulders stand in the sea, and the horizon is lost in a pale haze. The sun is behind the bottle to the left, so the ripples glitter. Spray droplets and a few salt crystals drift through the air. The macro is a cluster of salt crystals on a wet ledge of the rock, with the dew growing at the lowest corner of the largest crystal.

Nothing in the engine changes. The world uses the Task 13–14 contract and helpers as they stand: `common.js`, `glass.js`, `worlds.test.mjs` and `audio.js` are untouched. `film.js` only points `seasalt` at the new module, and `score.js` gains the `seasalt` arrangement.

**How the shore is made:**
- **The sun.** It is behind the bottle on the left, about 35° off the camera's axis and 22° up. The key is the world's one shadow-casting `DirectionalLight`: intensity 3, `#fff4e4`, a 2048² shadow map and radius 5. The haze runs from zenith `#5a9ecb` to horizon `#c8e0ea`, with mist `#b8d5dc`. Its sun is the key light.
- **The rock.** It is one grid, 3.6 m wide, laid out by `x` and by the distance `e` from the rock's back edge. The rows are 3 mm apart where the edge rounds off and where the waterline runs.
  - The flat top at y = 0 is where the bottle stands and the caustic lands.
  - The back edge follows a slow wave about 35 cm behind the bottle (`zb(x)`). The rock rounds down over 24 cm, then steepens under the water. Both ends, and the part behind the camera, sink too.
  - The mean water level is 1 cm below the top. Two slow swells (5.5 s and 2.3 s, 1.5 mm and 0.8 mm) move the waterline a centimetre or two up and down the slope.
- **The rock material.** A `MeshStandardMaterial`, `#e2dccf`, roughness 0.62, with no maps. The shader varies colour and roughness by world position: broad light and dark patches, fine sand grain, a few small pits, warm and cool areas, and whiter, rougher salt crust.
  - The mean is the material's own `color` / `roughness`, which is what the caustic reads.
  - Within about 1.3 cm of the water, the stone is wet: 40% darker, with roughness 0.08. The band follows the tide. Patches of spray-wet stone lie within 7 cm of the back edge.
  - A small height field bumps the normal. All the detail fades to its mean in the distance.
- **On the rock.** 160 flattened, glossy beads of sea water lie in clumps, more of them towards the back edge. 1400 small salt grains, 0.3–1.1 mm cubes, lie in patches. None of either is within 7 cm of the bottle.
- **Boulders.** Seven white boulders stand in the sea, from 2.3 m to 7.5 m out, each larger than the one in front. Each is a subdivided icosahedron, rippled by seven sine waves in random directions and pitted by five octaves of 3-D value noise, then flattened. At the waterline each has a dark wet band and an olive tide mark. Two of them stand behind the macro.
- **The sea.** One 170 m disc, computed analytically per pixel:
  - **Waves.** Twelve closed-form sine waves. The long swell runs towards the shore, and shorter waves spread over more directions. The RMS slope is about 0.075.
  - **Glitter.** Waves shorter than two or three pixels fade out. The slope variance they lose widens the sun's glitter, so the far sea is not aliased.
  - **Reflection.** Fresnel reflection of the sky.
  - **Refraction to the sea floor.** Near the shore the floor is the rock itself, continuing under water. Further out it is slowly deepening sand, with a shoal round each boulder and round the macro rock.
  - **Caustics.** The brightness is one over the Jacobian of the refracted sunlight, using the waves' analytic second derivatives.
  - **Colour.** The water absorbs (2.0, 0.42, 0.3) per metre. That is several times real sea water, so it turns turquoise within a few tens of centimetres. A few dark weed patches lie in deeper water.
  - **Foam and fog.** A lace of foam runs where the floor comes within a centimetre or two of the surface. Beyond 25 m the sea fades into the haze.
- **In the air.** 70 spray droplets drift right and a little upwards behind the bottle. They are additive `billboards` from `common.js`, and they flash when they face the sun. 45 salt flakes tumble through the air and glint (`driftField`, closed form).
- **The highlight cap.** A small glossy object facing the sun can have a highlight hundreds of times brighter than white. The depth of field gathers 32 fixed taps (`post.js`), so a highlight like that turns into a little constellation of dots when it blurs.
  - `capped(m, key)` limits the light to `HOT` = 4 before tone mapping. It is used on the rock, the boulders, the ledge, the beads and the flakes, and the sea clamps its glitter the same way.
  - In focus, the highlight is still white. Out of focus, it is only a soft patch of light.
- **The macro (`macroSalt`).** The set is built in its own frame and placed 3 m beyond the rock's left end, at x = −3. That keeps it out of every bottle shot and out of the shadow box.
  - **The ledge.** A small tongue of wet rock juts into the water, 4.5 cm above it. It is a `MeshPhysicalMaterial`, `#b8b3a7`, with a clearcoat water film, and dry, whiter patches of salt crust where the film is gone.
  - **Orientation.** The set is turned so that the camera looks along the ledge into the sun. The crystals are backlit, and behind the dew lie open water and the sun's glitter, blurred into soft light.
  - **The key crystal.** `hopperGeometry(s, …)` is a hopper cube: each face steps inwards in terraces to a small flat floor. The key crystal is 4.4 mm across, frosted and half-translucent (transmission 0.45, ior 1.544). It stands half out over the ledge's edge.
  - **Around it.** Five smaller hoppers stand behind and to the left, among 70 small white cubes, 500 fine grains and 50 beads of water. A 5 mm lane along the line from the camera to the dew is kept clear.
  - **The dew.** It hangs from the key crystal's lowest outer corner. It is `dewMaterial` with `below: '#4f9fa8'` and `above: '#f2f7f5'`, and follows Task 14's contract. It grows from 1.6 to 2.8 mm, lets go at `lt = dur − DROP.pre`, then falls by `fallen(tau)` and wobbles by `stretch(tau)`.
  - **The camera.** A fit intent. The fit box covers the key crystal, its two nearest neighbours and the dew, flattened to the dew's depth, so `focus: 'target'` lands on the dew.
    - The box is extended downwards by half its height. Without that it was so flat that at 16:9 the camera pulled back, and the cluster reached into the hook at the lower left.
    - The camera orbits from −7° to +7° at 24° down and pushes in 12%, with fov 28.
    - Its post: aperture 1.2, blur cap 0.03, exposure 0.9, a cool gamma and saturation 1.15.
- **Grade.**
  - The bottle shots: exposure 1.05, a light bloom (0.35 above 0.9), saturation 1.05, a slight teal lift, and a 0.12 vignette.
  - Reflections: `env.base` is `null`, and the glass reflects a small copy of the sky.
- **All randomness comes from `rand(seed, i)`.** Every frame is a function of the shot's local time, and nothing depends on the order the timeline is visited in.

**The sea-salt score** is A lydian (A B C♯ D♯ E F♯ G♯) with tonic A4 (69). The shared logo is therefore B, E, then a long A. The raised fourth, D♯, gives it a bright, open sound, like sea air. It uses only the existing voices, shaped through `p`:
- a marimba is `bell` with wooden-bar partials `[1, 3.93, 9.2]` and a low `bright` (0.35);
- a kalimba is a short, bright `pluck` (`t60` 0.9 s, `bright` 0.6);
- a glass bell is `bell` with partials `[1, 2.76, 5.4, 8.93]` and `bright` 0.9;
- the low notes are a dark, long `pluck` (`t60` 3 s);
- the pad is `pad` with `cut` 3, `a` 1.5 s and `air` 0.5;
- swells of surf (`swell`) are low `noise`: a band-pass at 300 Hz that rises slowly, sweeps up and falls away.

The bed is a wide band of noise at 1200 Hz, q 0.4, v 0.3: the wind on a sea cliff, wider and airier than the tea garden's mist. The reverb is 3.8 s, with a 0.45 music send. The 6 s cut has its own arrangement, as Task 15 requires.

**Files:**
- Create: `03-perfume/js/worlds/seasalt.js`
- Modify: `03-perfume/film.js`, `03-perfume/js/score.js`
- Test: none added. `worlds.test.mjs` runs its five tests for every distinct world in `WORLDS`, and `score.test.mjs` its eight for every sku's score, so both pick up 海盐.

**Interfaces:**
- Consumes:
  - Task 1: `rand(seed, i)`; `lerp`, `ss`, `easeInOut`.
  - Task 7: `SKUS.seasalt` (`world`, `score`).
  - Task 12: the caustic's world rule (a shadow-casting key light, plain ground at y = 0).
  - Task 13: the world module contract and `worlds.test.mjs`; `haze`, `sky`, `dewMaterial`, `driftField`, `billboards`, `NOISE` (common.js); fit intents for the macro camera.
  - Task 14: `DROP`, `fallen(tau)`, `stretch(tau)` (drop.js); `build` returns `haze`; the macro dew lets go at `lt = dur − DROP.pre`.
  - Task 15: `seq`, `BEAT`, `STEP`, `SCORES`, `logo`, `sfx`; the score rules in `score.test.mjs`; `VOICES` `pluck`, `pad`, `bell`, `noise`; the loudness chain in `ffmpeg.mjs` (`loudnessFilter`, `encodeAudio`) and its level guidance.
  - Task 16: the voice-over. 海盐's clips already exist, so its variants are narrated, with the music ducked under each line.
- Produces:
  - `seasalt.js`: `build(ctx) → { haze, env, post, macro: { root, camera(s), post }, update(ctx, s), reset() }`, which passes `worlds.test.mjs`. Also `hopperGeometry(s, { steps, w, d })`: a hopper cube of edge 2s whose faces step inwards `steps` times, each step `w·s` in and `d·s` down.
  - `film.js`: `WORLDS.seasalt = () => import('./js/worlds/seasalt.js')`. osmanthus has had its own world since Task 17; rose still points at the studio until Task 19.
  - `score.js`: `SCORES.seasalt` is its own score, `{ tonic: 69, reverb, bed, m15, m6 }`.

- [ ] **Step 1: Point 海盐 at its world**

Make these exact replacements in `03-perfume/film.js`:

1. Replace:

```js
export const WORLDS = { studio, whitetea: () => import('./js/worlds/whitetea.js'), osmanthus: () => import('./js/worlds/osmanthus.js'), seasalt: studio, rose: studio };
```

   with:

```js
export const WORLDS = { studio, whitetea: () => import('./js/worlds/whitetea.js'), osmanthus: () => import('./js/worlds/osmanthus.js'), seasalt: () => import('./js/worlds/seasalt.js'), rose: studio };
```

- [ ] **Step 2: Run the world tests to make sure they fail**

Run: `node --test 03-perfume/test/worlds.test.mjs`
Expected: FAIL. There are 20 tests.
- The 15 `studio:`, `whitetea:` and `osmanthus:` tests pass.
- The 5 `seasalt:` tests fail with `ERR_MODULE_NOT_FOUND`: `Cannot find module '…/03-perfume/js/worlds/seasalt.js' imported from …/03-perfume/film.js`.

- [ ] **Step 3: The sea-salt world**

`03-perfume/js/worlds/seasalt.js`:

```js
// seasalt.js — 海盐 · 海边的光：瓶子立在海边一块被水磨圆的白石上。石头后沿缓缓没进清浅的海水，水底的白石上焦散晃动，
// 水线上一道细碎的白沫；再往后几块白礁石，远处是雾蒙蒙的海平线。太阳在左后方，细浪上闪着碎光，空中飘着浪花的水星和几粒盐晶。
// 特写是湿石沿上的一簇盐晶：一颗漏斗状（hopper）的立方晶体探出石沿，最低的一角挂着一颗渐渐长大的水珠
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { haze, sky, dewMaterial, driftField, billboards, NOISE } from './common.js';
import { DROP, fallen, stretch } from '../drop.js';
import { rand } from '../../../factory/engine/rng.js';
import { lerp, ss, easeInOut } from '../../../factory/engine/ease.js';

const SUN = new THREE.Vector3(-0.53, 0.375, -0.76).normalize();          // 指向太阳：左后方（偏离镜头方向约 35°），仰角约 22°
const SKY = { zenith: '#5a9ecb', horizon: '#c8e0ea', mist: '#b8d5dc', sun: { dir: SUN.toArray(), color: '#fff3e0', glow: 0.8, rays: 0 } };
const KEY = { color: '#fff4e4', intensity: 3 };
const f7 = x => x.toPrecision(7);                                        // JS 的数 → GLSL 的浮点字面量
const lin = hex => new THREE.Color(hex);                                 // 颜色进着色器前已是线性值（three 的色彩管理）

/** 二维值噪声（摆放盐粒、水珠，特写石面的起伏用；只由 seed 决定）*/
const n2 = (seed, x, y) => {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v), g = (p, q) => rand(seed, (p + 4096) * 8192 + q + 4096);
  return lerp(lerp(g(i, j), g(i + 1, j), a), lerp(g(i, j + 1), g(i + 1, j + 1), a), b);
};
/** 三维值噪声（礁石的起伏）*/
const n3 = (seed, x, y, z) => {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), f = t => t * t * (3 - 2 * t), a = f(x - i), b = f(y - j), c = f(z - k);
  const g = (p, q, r) => rand(seed, ((p + 512) * 1024 + q + 512) * 1024 + r + 512);
  const L = (q, r) => lerp(g(i, q, r), g(i + 1, q, r), a);
  return lerp(lerp(L(j, k), L(j + 1, k), b), lerp(L(j, k + 1), L(j + 1, k + 1), b), c);
};

// ── 白石与海 ──
// 石头顶面平（y = 0，焦散落在这里）；后沿在 z = zb(x) 之前 ROCK.w 米开始缓缓圆下去，没进水里（水线处坡度约 0.13，比镜头看过去的视线缓，
// 所以看得见水线）。同一个 rockY 在 JS（石头的网格）和 GLSL（海底：水里看到的石头、水深、水线的白沫）里各写一遍，水里水外接得上
const SEA = { y: -0.01, lap: [0.0015, 0.0008] };                         // 平均水面（比石顶低 1 厘米）、两道缓慢涨落的幅度（米）
const ROCK = { w: 0.24, a: 0.02, c: 0.6, color: '#e2dccf' };            // 圆下去的宽度、到后沿时低下去多少、水下变陡的快慢
const zb = x => -0.35 + 0.035 * Math.sin(4.1 * x + 0.6) + 0.018 * Math.sin(9.7 * x + 2.1) + 0.008 * Math.sin(23 * x + 0.3);
function rockY(x, z) {
  const e = z - zb(x), t = 1 - e / ROCK.w;
  const y = e >= ROCK.w ? 0 : e >= 0 ? -ROCK.a * t * t : -ROCK.a + ((2 * ROCK.a) / ROCK.w) * e - ROCK.c * e * e;
  return y - 0.3 * ss(1.2, 1.7, Math.abs(x)) - 0.3 * ss(1.2, 1.6, z);   // 左右两端、身后（镜头背后）也没进水里
}
const ROCK_GLSL = /* glsl */`
float zb(float x) { return -0.35 + 0.035 * sin(4.1 * x + 0.6) + 0.018 * sin(9.7 * x + 2.1) + 0.008 * sin(23.0 * x + 0.3); }
float rockY(vec2 p) {
  float e = p.y - zb(p.x), t = 1.0 - e / ${f7(ROCK.w)};
  float y = e >= ${f7(ROCK.w)} ? 0.0 : e >= 0.0 ? -${f7(ROCK.a)} * t * t : -${f7(ROCK.a)} + ${f7((2 * ROCK.a) / ROCK.w)} * e - ${f7(ROCK.c)} * e * e;
  return y - 0.3 * smoothstep(1.2, 1.7, abs(p.x)) - 0.3 * smoothstep(1.2, 1.6, p.y);
}`;
/** t 秒的水面高度：两道慢慢的涨落（5.5 秒、2.3 秒一个来回），水线在缓坡上跟着前后移一两厘米 */
const level = t => SEA.y + SEA.lap[0] * Math.sin((2 * Math.PI * t) / 5.5) + SEA.lap[1] * Math.sin((2 * Math.PI * t) / 2.3 + 1);

/** 石头：按 (x, 离后沿的距离 e) 排的网格，圆下去和水线那一段 3 毫米一行；最外一圈都在水下，被海面盖住 */
function rockGeometry() {
  const X = [], E = [], pos = [], idx = [];
  for (let i = 0; i <= 600; i++) X.push(lerp(-1.8, 1.8, i / 600));
  for (const [a, b, n] of [[-0.45, -0.1, 14], [-0.1, 0.3, 134], [0.3, 2, 40]]) for (let j = E.length ? 1 : 0; j <= n; j++) E.push(lerp(a, b, j / n));
  for (const e of E) for (const x of X) { const z = zb(x) + e; pos.push(x, rockY(x, z), z); }
  const nx = X.length;
  for (let j = 0; j < E.length - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + nx; idx.push(a, b, a + 1, a + 1, b, b + 1); }   // 逆时针朝上
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/** 高光封顶：很光的小东西迎着太阳，高光能亮到几百；景深按固定的 32 个点采样（post.js），这种亮点虚掉以后散成一簇一簇的小点。
 *  进 tone map 之前把光照封在 HOT 以内：清楚的地方照样是白的高光，虚掉的只剩一片淡淡的光斑 */
const HOT = 4;
function capped(m, key) {
  const pre = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    pre.call(m, sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `outgoingLight = min(outgoingLight, vec3(${f7(HOT)}));\n#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => `seasalt-${key}`;
  return m;
}
/**
 * 石头的材质：颜色和粗糙度按世界坐标上下缓慢变化——大块的深浅、细砂粒、零星的小蚀孔、发白的盐霜，平均值就是 color / roughness 本身
 * （焦散读的正是这两个值，glass.js）；法线按一个细小的高度场扰动。离水面一厘米多以内是湿的：更暗、很光，跟着水面涨落
 */
function rockMaterial(U) {
  const m = new THREE.MeshStandardMaterial({ color: ROCK.color, roughness: 0.62, metalness: 0 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uLevel = U.uLevel;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRock;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvRock = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vRock; uniform float uLevel;
${NOISE}
${ROCK_GLSL}
float pore(vec2 p) { return smoothstep(0.86, 0.93, vnoise(p * 600.0 + 7.0)); }
float bumpH(vec2 p) { return 0.0009 * fbm(p * 22.0) + 0.0011 * vnoise(p * 40.0) + 0.00012 * vnoise(p * 210.0) - 0.00015 * pore(p); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  vec2 rp = vRock.xz; float far = clamp(fwidth(rp.x) * 250.0, 0.0, 1.0), pf = clamp(fwidth(rp.x) * 1500.0 - 0.5, 0.0, 1.0);   // 远了细节淡成平均
  float mottle = fbm(rp * 2.3 + 3.1) - 0.47, grain = mix(vnoise(rp * 260.0) - 0.5, 0.0, far), holes = pore(rp) * (1.0 - pf);   // 细小的蚀孔
  float warm = fbm(rp * 1.1 - 5.0) - 0.47;                                                       // 大片的偏暖、偏冷
  float crust = smoothstep(0.5, 0.7, fbm(rp * 7.0 + 11.0));                                     // 盐霜：更白、更糙
  float fine = fbm(rp * 14.0 - 2.0) - 0.47, e = rp.y - zb(rp.x);                                // 浪花溅湿的：只在后沿几厘米以内
  float wet = max(smoothstep(uLevel + 0.013, uLevel + 0.002, vRock.y), 0.7 * smoothstep(0.58, 0.72, fbm(rp * 6.0 - 3.0)) * smoothstep(0.07, 0.01, e));
  diffuseColor.rgb *= (1.0 + 0.16 * mottle + 0.08 * fine + 0.1 * grain + 0.08 * (crust - 0.2)) * (1.0 - 0.4 * wet) * (1.0 - 0.4 * holes);
  diffuseColor.rgb *= vec3(1.0 + 0.08 * warm, 1.0 + 0.02 * warm, 1.0 - 0.06 * warm);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor = mix(roughnessFactor * (1.0 + 0.15 * mottle + 0.15 * (crust - 0.2)), 0.08, wet);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  { float h0 = bumpH(rp), e = 0.0003;
    vec2 gr = vec2(bumpH(rp + vec2(e, 0.0)) - h0, bumpH(rp + vec2(0.0, e)) - h0) / e * (1.0 - far) * (1.0 - wet);
    normal = normalize(normal - (viewMatrix * vec4(gr.x, 0.0, gr.y, 0.0)).xyz); }`);
  };
  return capped(m, 'rock');
}
/** 石面上的海水珠：扁的半球，很光（边上勾一圈天光，顶上一个太阳的高光），成团分布；避开瓶底（半径 7 厘米） */
function beads() {
  const N = 160, o = new THREE.Object3D();
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 6, 0, 2 * Math.PI, 0, Math.PI / 2), capped(new THREE.MeshStandardMaterial({ color: '#b5b0a4', roughness: 0.02, metalness: 0, envMapIntensity: 2 }), 'bead'), N);
  for (let i = 0, k = 0; i < N; k++) {
    const r = j => rand(611, k * 4 + j), x = lerp(-0.9, 0.9, r(0)), z = lerp(-0.3, 0.6, r(1));
    if (Math.hypot(x, z) < 0.07 || r(2) > ss(0.4, 0.7, n2(613, x * 6, z * 6)) + 0.4 * ss(0.14, 0.02, z - zb(x))) continue;   // 靠后沿的更多
    const R = lerp(0.0005, 0.0024, r(3) ** 2), y = rockY(x, z);
    if (y < SEA.y + 0.004) continue;
    o.position.set(x, y, z); o.scale.set(R, 0.55 * R, R); o.updateMatrix(); mesh.setMatrixAt(i++, o.matrix);
  }
  mesh.receiveShadow = true;
  return mesh;
}
/** 盐霜里析出的细盐粒：一千多粒小方块，一片一片的，靠后沿（浪花溅到、晒干的地方）更密 */
function saltGrains() {
  const N = 1400, o = new THREE.Object3D();
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#f7f7f3', roughness: 0.3, metalness: 0 }), N);
  for (let i = 0, k = 0; i < N; k++) {
    const r = j => rand(631, k * 8 + j), x = lerp(-0.8, 0.8, r(0)), z = lerp(-0.3, 0.4, r(1));
    if (Math.hypot(x, z) < 0.07 || r(2) > ss(0.5, 0.75, n2(633, x * 9, z * 9)) * (0.4 + 0.6 * ss(0.3, 0.1, z - zb(x)))) continue;
    const S = lerp(0.0003, 0.0011, r(3) ** 2), y = rockY(x, z);
    if (y < SEA.y + 0.006) continue;
    o.position.set(x, y + 0.3 * S, z); o.rotation.set(r(4) * 0.6, r(5) * 6.283, r(6) * 0.6); o.scale.setScalar(S); o.updateMatrix(); mesh.setMatrixAt(i++, o.matrix);
  }
  mesh.receiveShadow = true;
  return mesh;
}

// ── 礁石：后面几块白石头，从近到远一块比一块大；水线上下是湿的暗带和一道偏橄榄色的潮痕 ──
// [x, z, 水平半径]；竖向半径是水平的 0.45，球心在水面下 0.2 个竖向半径（水线半径约 0.95 个半径，海底的浅滩按它算）。最后两块在特写背后
const BOULDERS = [[-1.25, -2.3, 0.3], [1.6, -3.3, 0.5], [-0.3, -5.6, 0.45], [3.8, -7.5, 1], [-3.4, -7.2, 0.9], [-3.7, -1.05, 0.2], [-4.6, -2.8, 0.5]];
function boulderMaterial(U) {
  const m = new THREE.MeshStandardMaterial({ color: '#c4bdae', roughness: 0.75, metalness: 0 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uLevel = U.uLevel;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vB;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvB = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vB; uniform float uLevel;\n${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  vec2 bq = vB.xz + vB.y * vec2(0.7, -0.5);
  float h = vB.y - uLevel, wet = smoothstep(0.06, 0.006, h), tide = smoothstep(0.14, 0.05, h) * (1.0 - wet);
  diffuseColor.rgb *= (1.0 + 0.22 * (fbm(bq * 5.0) - 0.47) + 0.12 * (fbm(bq * 31.0 + 3.0) - 0.47)) * (1.0 - 0.55 * wet);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.7, 0.72, 0.58), tide);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 0.12, wet);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  { vec2 gq = vec2(fbm((bq + vec2(0.004, 0.0)) * 40.0) - fbm(bq * 40.0), fbm((bq + vec2(0.0, 0.004)) * 40.0) - fbm(bq * 40.0)) * 3.0 * (1.0 - wet);
    normal = normalize(normal - (viewMatrix * vec4(gq.x, 0.0, gq.y, 0.0)).xyz); }`);
  };
  return capped(m, 'boulder');
}
/** 一块礁石：细分的二十面体按几道随机方向的正弦起伏、再加五层三维值噪声的坑洼（闭式，只由序号决定），压扁 */
function boulder(i, [x, z, r], mat) {
  const geo = mergeVertices(new THREE.IcosahedronGeometry(1, 24).deleteAttribute('normal').deleteAttribute('uv')), p = geo.attributes.position, v = new THREE.Vector3();
  const W = [0, 1, 2, 3, 4, 5, 6].map(j => { const q = k => rand(701, i * 40 + j * 5 + k); return { u: new THREE.Vector3(q(0) - 0.5, q(1) - 0.5, q(2) - 0.5).normalize(), f: 1.7 + 2.3 * j, a: 0.14 / (1 + 0.9 * j), ph: q(3) * 6.283 }; });
  for (let k = 0; k < p.count; k++) {
    v.fromBufferAttribute(p, k);
    let s = 1; for (const w of W) s += w.a * Math.sin(w.f * v.dot(w.u) + w.ph);
    for (let o = 0, f = 2.2, a = 0.09; o < 5; o++, f *= 2.1, a *= 0.48) s += a * (n3(707 + i * 8 + o, v.x * f, v.y * f, v.z * f) - 0.5);
    p.setXYZ(k, v.x * s * r, v.y * s * r * 0.45, v.z * s * r * 0.9);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, SEA.y - 0.2 * r * 0.45, z); m.rotation.y = rand(703, i) * 6.283;
  return m;
}

// ── 海 ──
// 十二道闭式的正弦浪（长的涌浪朝岸边推，越短的方向越散），坡度的均方根约 0.075；角频率按深水色散的一半（画面里的水慢一点、稳一点）
const WAVES = Array.from({ length: 12 }, (_, i) => {
  const lam = 2.4 * 0.62 ** i, k = (2 * Math.PI) / lam, slope = i < 2 ? 0.03 : 0.045 * 0.93 ** i, th = (rand(401, i) - 0.5) * (i < 3 ? 0.8 : 2.6);
  return { d: [Math.sin(th), Math.cos(th)], k, A: slope / k, w: 0.5 * Math.sqrt(9.81 * k), ph: rand(402, i) * 2 * Math.PI };
});
/**
 * 海面：一整块平面，每个像素解析地算——细浪的法线（比两三个像素还短的浪淡掉，丢掉的坡度方差让太阳的碎光变宽）、
 * 按菲涅耳反射天色、太阳的碎光；透过水面折射到海底（岸边是石头自己接着往水下走，外面是缓缓变深的沙底，礁石周围一圈浅滩），
 * 海底受的太阳光按水面的弯曲聚拢成焦散（亮度 = 1 / 雅可比行列式，浪的二阶导解析地算），海水按深度吸收成青绿。
 * 水线（海底离水面不到一两厘米）上一道细碎的白沫。远了融进 haze
 */
function seaMaterial(hz, U, shoals) {
  const vec = (n, a) => `vec${n}[${a.length}](${a.map(x => `vec${n}(${x.map(f7).join(', ')})`).join(', ')})`;
  return new THREE.ShaderMaterial({
    uniforms: { ...hz.uniforms, ...U, uRockAlb: { value: lin(ROCK.color).multiplyScalar(0.72) }, uSandAlb: { value: lin('#d9ccad') }, uWater: { value: lin('#1b8f9c') } },
    vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
${hz.glsl}
${NOISE}
${ROCK_GLSL}
uniform float uT, uLevel; uniform vec3 uRockAlb, uSandAlb, uWater;
varying vec3 vW;
const vec4 WV[${WAVES.length}] = ${vec(4, WAVES.map(w => [...w.d, w.k, w.A]))};   // 方向 x、方向 z、波数、振幅
const vec2 WM[${WAVES.length}] = ${vec(2, WAVES.map(w => [w.w, w.ph]))};         // 角频率、相位
const vec4 SH[${shoals.length}] = ${vec(4, shoals)};                            // 浅滩：x、z、水线半径、水线处的水深
const vec3 SIG = vec3(2.0, 0.42, 0.3);                                        // 海水的吸收（每米；比真的海水重几倍：几十厘米深就泛出青绿）
void waves(vec2 p, float fp, out vec2 gr, out vec3 H, out float lost) {
  gr = vec2(0.0); H = vec3(0.0); lost = 0.0;
  for (int i = 0; i < ${WAVES.length}; i++) {
    vec4 w = WV[i]; float ph = w.z * dot(w.xy, p) - WM[i].x * uT + WM[i].y;
    float f = 1.0 - smoothstep(0.15, 0.4, fp * w.z / 6.2832), ak = w.z * w.w, s = sin(ph), c = cos(ph);
    gr += f * ak * c * w.xy;
    H -= f * ak * w.z * s * vec3(w.x * w.x, w.y * w.y, w.x * w.y);
    lost += (1.0 - f * f) * 0.5 * ak * ak;
  }
}
float bedY(vec2 p, out float rk) {
  float e = p.y - zb(p.x), sand = max(-0.25 - 0.22 * max(-e, 0.0), -2.5) + 0.06 * (fbm(p * 0.6) - 0.5), b = max(rockY(p), sand);
  for (int i = 0; i < ${shoals.length}; i++) b = max(b, ${f7(SEA.y)} - SH[i].w - 0.5 * max(length(p - SH[i].xy) - SH[i].z, 0.0));
  rk = step(sand + 0.002, b);                                                  // 1 = 白石头，0 = 沙
  return b;
}
void main() {
  vec3 V = normalize(vW - cameraPosition);
  vec2 p = vW.xz; float fp = max(length(fwidth(p)), 1e-5);
  vec2 gr; vec3 H; float lost;
  waves(p, fp, gr, H, lost);
  vec3 N = normalize(vec3(-gr.x, 1.0, -gr.y));
  // 远处看不清的细浪：朝着相机的那半边浪面反射更高处（更蓝）的天，菲涅耳也按平均的倾斜算
  float tilt = sqrt(lost + 0.0004), cv = max(dot(N, -V), 0.02), F = 0.02 + 0.98 * pow(1.0 - max(cv, 1.5 * tilt), 5.0);
  vec3 R = reflect(V, N); R.y = abs(R.y) + 1.2 * tilt; R = normalize(R);
  vec3 refl = haze(R);
  // 太阳的碎光：看得清的浪给出法线，看不清的只剩坡度方差，按高斯的坡度分布摊开
  vec3 Hv = normalize(hSunDir - V);
  float s2 = 0.0005 + lost, ch = max(dot(N, Hv), 0.05), t2 = (1.0 - ch * ch) / (ch * ch);
  float D = exp(-t2 / (2.0 * s2)) / (6.2832 * s2 * ch * ch * ch * ch), Fs = 0.02 + 0.98 * pow(1.0 - max(dot(Hv, -V), 0.0), 5.0);
  vec3 glint = min(hSun * ${f7(KEY.intensity)} * Fs * D / (4.0 * max(cv, 0.1)), vec3(${f7(HOT)}));   // 封顶：见 capped
  // 折射到海底：海底不平，按折射线走两步找落点
  vec3 T = refract(V, N, 0.75);
  float rk, d0 = uLevel - bedY(p, rk), d = max(d0, 0.0);
  vec2 q = p + T.xz * d / max(-T.y, 0.05);
  d = max(uLevel - bedY(q, rk), 0.0); q = p + T.xz * d / max(-T.y, 0.05);
  d = max(uLevel - bedY(q, rk), 0.0);
  float Lv = d / max(-T.y, 0.05);
  // 焦散：太阳光从水面 ps 折进来、落到 q；水面的弯曲把光聚拢或摊开
  vec3 Ts = refract(-hSunDir, vec3(0.0, 1.0, 0.0), 0.75);
  float Ls = d / max(-Ts.y, 0.05);
  vec2 ps = q - Ts.xz * Ls, g2; vec3 H2; float l2;
  waves(ps, fp, g2, H2, l2);
  float sc = d * 0.25 * 3.0, det = (1.0 + sc * H2.x) * (1.0 + sc * H2.y) - sc * sc * H2.z * H2.z;
  float caus = mix(1.0, clamp(1.0 / sqrt(det * det + 0.03), 0.0, 5.0), exp(-d * 0.8));
  float m = fbm(q * 5.0 + 1.3);
  vec3 alb = mix(uSandAlb * (0.85 + 0.3 * (fbm(q * 2.1) - 0.47)), uRockAlb * (1.0 + 0.35 * (m - 0.47)), rk);
  alb = mix(alb, vec3(0.05, 0.08, 0.04), smoothstep(0.6, 0.72, fbm(q * 1.4 + 7.0)) * smoothstep(0.08, 0.3, d) * 0.8);   // 深一点的地方几片海草
  vec3 Es = hSun * ${f7(KEY.intensity / Math.PI)} * max(-Ts.y, 0.0) * 0.92 * exp(-SIG * Ls) * caus;
  vec3 Ea = mix(hHorizon, hZenith, 0.6) * exp(-SIG * d * 1.3);
  vec3 under = alb * (Es + Ea) * exp(-SIG * Lv) + uWater * mix(hHorizon, hZenith, 0.5) * (1.0 - exp(-0.9 * Lv));
  vec3 col = mix(under, refl, F) + glint;
  // 水线的白沫：离石头的水线越近越密，碎成一丝一丝，跟着水慢慢晃；远了淡掉
  float lace = smoothstep(0.35, 0.7, fbm(p * 70.0 + vec2(uT * 0.05, -uT * 0.08)) + 0.2 * sin(uT * 1.3 + p.x * 9.0));
  float foam = (smoothstep(0.006, 0.0, d0) + 0.6 * smoothstep(0.02, 0.004, d0) * lace) * mix(1.0, lace, 0.6);
  col = mix(col, hSun * 0.45 + mix(hHorizon, hZenith, 0.5) * 0.9, clamp(foam, 0.0, 0.85) * (1.0 - clamp(fp * 150.0, 0.0, 1.0)));
  float fog = (1.0 - exp(-max(length(vW - cameraPosition) - 25.0, 0.0) * 0.012)) * 0.85;
  gl_FragColor = vec4(mix(col, haze(V), fog), 1.0);
}`,
  });
}

// ── 空中的浪花水星（逆光闪一下的光点）──
/** 光点的纹理：2 × 2 图集，每格同一个柔和的圆点（billboards 按实例取格） */
function dots(N = 32) {
  const px = new Uint8Array(4 * N * N * 4), S = 2 * N;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const x = (((i % N) + 0.5) / N) * 2 - 1, y = (((j % N) + 0.5) / N) * 2 - 1, p = 4 * (j * S + i);
    px[p] = px[p + 1] = px[p + 2] = 255; px[p + 3] = Math.round(255 * Math.exp(-6 * (x * x + y * y)) * (1 - ss(0.8, 1, Math.hypot(x, y))));
  }
  const tex = new THREE.DataTexture(px, S, S);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}

// ── 特写：湿石沿上的盐晶 ──
// 放在石头左端外（x = −3），离开所有瓶子镜头的视野和主光的阴影盒。在自己的坐标里设计：石沿顺着 z 走，石头在左（−x），右边是水，+z 朝相机；
// 这块石头是伸进水里的一个小尖角，盐晶长在尖角上：相机顺着石沿往尖角看，微微俯视，整组绕 y 转到相机正对太阳：逆光，盐晶透亮，
// 水珠背后是开阔的水面和太阳在水上的碎光（俯角 22°），虚成一片光斑。石沿高出水面 4.5 厘米
const MACRO_AT = [-3, SEA.y + 0.045, 0];
const MACRO_VIEW = 0;                                                    // 相机的方位（特写坐标，度）
const MACRO_YAW = Math.atan2(-SUN.x, -SUN.z) - (MACRO_VIEW * Math.PI) / 180;
const LEDGE = { k: 6, w: 0.0015, back: -0.005 };                         // 石沿圆角之外的坡度、圆角的宽（米）；尖角的后沿在 z = back
const xe = z => 0.005 * Math.sin(18 * z) + 0.003 * (1 - Math.cos(41 * z));   // 石沿的位置（x）顺着 z 弯；z = 0 处在 x = 0
/** 特写石头的顶面高度（特写坐标）：平顶上有细小的起伏，右边（石沿）和后边（尖角的后沿）都圆下去、陡陡地落进水里；前边、左边缓缓没进水里 */
function ledgeY(x, z) {
  const u = x - xe(z), rim = v => LEDGE.k * LEDGE.w * Math.log1p(Math.exp(v / LEDGE.w));
  const bump = 0.0006 * (n2(521, x * 90, z * 90) - 0.5) + 0.0025 * (n2(523, x * 12, z * 12) - 0.5) * ss(-0.02, -0.06, u);
  return bump - rim(u) - rim(LEDGE.back - z) - 0.09 * ss(0.12, 0.2, z) - 0.09 * ss(-0.12, -0.22, u);
}
function ledgeGeometry() {
  const U = [], Z = [], pos = [], idx = [];
  for (const [a, b, n] of [[-0.26, -0.03, 60], [-0.03, 0.012, 140], [0.012, 0.03, 12]]) for (let j = U.length ? 1 : 0; j <= n; j++) U.push(lerp(a, b, j / n));
  for (const [a, b, n] of [[-0.03, -0.012, 12], [-0.012, 0.03, 140], [0.03, 0.22, 60]]) for (let j = Z.length ? 1 : 0; j <= n; j++) Z.push(lerp(a, b, j / n));
  for (const z of Z) for (const u of U) { const x = xe(z) + u; pos.push(x, ledgeY(x, z), z); }
  const nu = U.length;
  for (let j = 0; j < Z.length - 1; j++) for (let i = 0; i < nu - 1; i++) { const a = j * nu + i, b = a + nu; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/** 湿石头：清漆一样的水膜；颜色斑驳，盐霜的地方发白、干（没有水膜） */
function ledgeMaterial() {
  const m = new THREE.MeshPhysicalMaterial({ color: '#b8b3a7', roughness: 0.45, clearcoat: 1, clearcoatRoughness: 0.05 });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vL;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvL = transformed;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vL;\n${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  float crust = smoothstep(0.52, 0.68, fbm(vL.xz * 180.0 + 4.0)) * smoothstep(-0.004, -0.001, vL.y);
  diffuseColor.rgb *= (1.0 + 0.22 * (fbm(vL.xz * 60.0) - 0.47) + 0.1 * (vnoise(vL.xz * 900.0) - 0.5));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.93, 0.9), 0.85 * crust);`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
  material.clearcoat *= 1.0 - crust; material.roughness = mix(material.roughness, 0.8, crust);`);
  };
  return capped(m, 'ledge');
}
/**
 * 漏斗状的盐晶（hopper）：边长 2s 的立方体，每个面向里凹成 steps 级台阶（每级收进 w·s、下沉 d·s，d < w：相邻面的坑不相交），中间一个小平底。
 * 先在 +y 面上造一面，再转到六个面；三角形按设计的法线定绕向（朝外）
 */
export function hopperGeometry(s, { steps = 3, w = 0.17, d = 0.11 } = {}) {
  const face = [], C = [[1, 1], [-1, 1], [-1, -1], [1, -1]], up = new THREE.Vector3(0, 1, 0), ab = new THREE.Vector3(), ac = new THREE.Vector3();
  const R = j => s * (1 - j * w), Y = j => s * (1 - j * d), sq = (r, k, y) => new THREE.Vector3(r * C[k % 4][0], y, r * C[k % 4][1]);
  const tri = (a, b, c, n) => face.push(...(ab.subVectors(b, a).cross(ac.subVectors(c, a)).dot(n) >= 0 ? [a, b, c] : [a, c, b]));
  const quad = (a, b, c, e, n) => { tri(a, b, c, n); tri(a, c, e, n); };
  for (let j = 0; j < steps; j++) for (let k = 0; k < 4; k++) {
    quad(sq(R(j), k, Y(j)), sq(R(j), k + 1, Y(j)), sq(R(j + 1), k + 1, Y(j)), sq(R(j + 1), k, Y(j)), up);                // 第 j 级台面
    const inward = sq(1, k, 0).add(sq(1, k + 1, 0)).negate().normalize();                                                // 台阶的立面朝坑里
    quad(sq(R(j + 1), k, Y(j)), sq(R(j + 1), k + 1, Y(j)), sq(R(j + 1), k + 1, Y(j + 1)), sq(R(j + 1), k, Y(j + 1)), inward);
  }
  quad(sq(R(steps), 0, Y(steps)), sq(R(steps), 1, Y(steps)), sq(R(steps), 2, Y(steps)), sq(R(steps), 3, Y(steps)), up);   // 坑底
  const pos = [];
  for (const e of [[0, 0, 0], [Math.PI, 0, 0], [0, 0, -Math.PI / 2], [0, 0, Math.PI / 2], [Math.PI / 2, 0, 0], [-Math.PI / 2, 0, 0]]) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...e));
    for (const v of face) pos.push(...v.clone().applyQuaternion(q).toArray());
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}
/** 立方体的八个角（按 rotation 转过） */
const corners = (s, rot) => [...Array(8).keys()].map(i => new THREE.Vector3(i & 1 ? s : -s, i & 2 ? s : -s, i & 4 ? s : -s).applyEuler(rot));
/** 把一颗边长 2s 的晶体放到石面 (x, z) 上：最深的一个角扎进石头 sink 米 */
function rest(obj, s, x, z, sink = 0.0002) {
  obj.position.set(x, Math.max(...corners(s, obj.rotation).map(c => ledgeY(x + c.x, z + c.z) - c.y)) - sink, z);
  obj.updateMatrix();
}
/**
 * 盐晶一簇 + 最大那颗最低的一角挂着一颗水珠。返回 root、frame（取景盒，世界坐标；深度压在水珠所在的平面，对焦 'target' 就落在水珠上）、
 * dir(yaw, pitch)（相机方向，按特写坐标的方位 / 仰角，度）、drop(R, tau)（同 whitetea：挂着时顶端扎在晶角上，松开前 0.3 秒被坠长；
 * tau > 0 是松开后的秒数，和瓶里的水滴走同一条下落曲线）、shoal（特写石头在海底的浅滩：[x, z, 半径, 水深]，世界坐标）
 */
function macroSalt(hz) {
  const root = new THREE.Group();
  const ledge = new THREE.Mesh(ledgeGeometry(), ledgeMaterial());
  const clear = new THREE.MeshPhysicalMaterial({ color: '#f4f6f4', roughness: 0.35, transmission: 0.45, thickness: 0.003, ior: 1.544, attenuationColor: '#eef6f3', attenuationDistance: 0.02 });   // 磨砂、半透：逆光时透亮
  const white = new THREE.MeshStandardMaterial({ color: '#eef2f0', roughness: 0.22, metalness: 0 });
  root.add(ledge);
  // 最大的一颗（边长 4.4 毫米）：一半探出石沿（背后的角嵌在盐霜里），外角微微朝下
  const KS = 0.0022, key = new THREE.Mesh(hopperGeometry(KS, { steps: 2, w: 0.2, d: 0.08 }), clear);
  key.rotation.set(0.05, 0.55, -0.1); rest(key, KS, 0.0006, 0);
  const tipC = corners(KS, key.rotation).reduce((a, c) => (c.x - 0.6 * c.y > a.x - 0.6 * a.y ? c : a));
  const tip = tipC.clone().add(key.position);                            // 挂水珠的晶角（特写坐标）
  root.add(key);
  // 相机到水珠的视线（特写坐标的水平面上）两边 5 毫米以内不放东西，免得挡住水珠
  const V = (MACRO_VIEW * Math.PI) / 180, vx = Math.sin(V), vz = Math.cos(V);
  const inView = (x, z) => { const dx = x - tip.x, dz = z - tip.z, t = dx * vx + dz * vz; return t > -0.003 && Math.abs(dx * vz - dz * vx) < 0.005; };
  // 身后、左边几颗小一些的，还有一堆长在一起的小方块和细盐粒、石面上的水珠
  const cluster = [key];
  for (const [x, z, s, yaw, tx, tz] of [[-0.009, -0.001, 0.0024, 0.9, 0.08, -0.05], [-0.015, 0.012, 0.0015, 2.1, -0.1, 0.06], [-0.02, 0.001, 0.0018, 0.3, 0.12, 0.1], [-0.007, 0.022, 0.0013, 1.4, -0.04, 0.12], [-0.028, 0.016, 0.002, 0.6, 0.1, -0.08]]) {
    const c = new THREE.Mesh(hopperGeometry(s, { steps: 2, w: 0.2, d: 0.08 }), clear);
    c.rotation.set(tx, yaw, tz); rest(c, s, x, z); root.add(c); cluster.push(c);
  }
  const o = new THREE.Object3D(), add = (mesh, n, seed, place) => {
    for (let i = 0, k = 0; i < n && k < n * 20; k++) { const r = j => rand(seed, k * 8 + j); if (place(r)) { o.updateMatrix(); mesh.setMatrixAt(i++, o.matrix); } }
    root.add(mesh);
  };
  add(new THREE.InstancedMesh(new THREE.BoxGeometry(2, 2, 2), white, 70), 70, 541, r => {
    const a = r(0) * 6.283, d = 0.004 + 0.022 * r(1) ** 1.5, x = -0.013 + Math.cos(a) * d * 1.3, z = 0.008 + Math.sin(a) * d, s = lerp(0.0003, 0.0013, r(2) ** 2);
    if (x - xe(z) > -0.002 || z < LEDGE.back + 0.002 || Math.hypot(x - key.position.x, z) < KS * 1.5 || inView(x, z)) return false;
    o.rotation.set(r(3) * 0.5, r(4) * 6.283, r(5) * 0.5); o.scale.setScalar(s); o.position.set(x, ledgeY(x, z) + s * (0.5 + 0.8 * r(6)), z);
    return true;
  });
  add(new THREE.InstancedMesh(new THREE.BoxGeometry(2, 2, 2), white, 500), 500, 551, r => {
    const x = -0.004 - 0.05 * r(0) ** 1.4, z = lerp(-0.004, 0.04, r(1)), s = lerp(0.00007, 0.00022, r(2));
    if (x - xe(z) > -0.001 || z < LEDGE.back + 0.001 || r(3) > ss(0.35, 0.6, n2(553, x * 150, z * 150))) return false;
    o.rotation.set(r(4), r(5) * 6.283, r(6)); o.scale.setScalar(s); o.position.set(x, ledgeY(x, z) + 0.5 * s, z);
    return true;
  });
  add(new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 6, 0, 2 * Math.PI, 0, Math.PI / 2), capped(new THREE.MeshStandardMaterial({ color: '#c4bfb3', roughness: 0.02, metalness: 0, envMapIntensity: 2 }), 'bead'), 50), 50, 561, r => {
    const x = -0.006 - 0.09 * r(0), z = lerp(-0.002, 0.06, r(1)), R = lerp(0.0003, 0.0018, r(2) ** 2);
    if (x - xe(z) > -0.003 || z < LEDGE.back + 0.003 || Math.hypot(x - key.position.x, z) < 0.006 || inView(x, z)) return false;
    o.rotation.set(0, 0, 0); o.scale.set(R, 0.5 * R, R); o.position.set(x, ledgeY(x, z), z);
    return true;
  });
  const dew = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), dewMaterial(hz, { below: '#4f9fa8', above: '#f2f7f5' }));
  root.add(dew);
  const drop = (R, tau = -1) => {
    if (tau > 0) { const sy = stretch(tau), w = R * Math.sqrt(1.4 / sy); dew.scale.set(w, sy * R, w); dew.position.set(tip.x, tip.y - 1.2 * R - fallen(tau), tip.z); }
    else { const sy = 1.2 + 0.2 * ss(-0.3, 0, tau); dew.scale.set(R, sy * R, R); dew.position.set(tip.x, tip.y + 0.2 * R - sy * R, tip.z); }   // 顶端在晶角上方 0.2R：晶角扎进水珠一点
    dew.updateMatrix();
  };
  drop(0.0028);
  root.updateMatrixWorld(true);
  const frame = new THREE.Box3();                                        // 取景：这一簇盐晶和水珠
  for (const m of [...cluster.slice(0, 3), dew]) frame.expandByObject(m, true);
  frame.min.z = frame.max.z = tip.z;
  frame.min.y -= 0.5 * (frame.max.y - frame.min.y);                      // 水珠下面多框一截石面：取景框不那么扁，16:9 里盐晶簇就不会伸到左下角的字上
  root.position.set(...MACRO_AT); root.rotation.y = MACRO_YAW; root.updateMatrixWorld(true);
  frame.applyMatrix4(root.matrixWorld);
  const dir = (yaw, pitch) => { const Y = (yaw * Math.PI) / 180, P = (pitch * Math.PI) / 180; return new THREE.Vector3(Math.sin(Y) * Math.cos(P), Math.sin(P), Math.cos(Y) * Math.cos(P)).applyQuaternion(root.quaternion).toArray(); };
  const c = root.localToWorld(new THREE.Vector3(-0.1, 0, 0.03));
  return { root, frame, dir, drop, tip, shoal: [c.x, c.z, 0.09, 0.05] };
}

export async function build(ctx) {
  const { scene } = ctx, hz = haze(SKY), U = { uT: { value: 0 }, uLevel: { value: level(0) } };
  scene.background = new THREE.Color(SKY.horizon);
  scene.add(sky(hz));
  const rock = new THREE.Mesh(rockGeometry(), rockMaterial(U));
  rock.receiveShadow = true;
  const bm = boulderMaterial(U);
  scene.add(rock, beads(), saltGrains(), ...BOULDERS.map((b, i) => boulder(i, b, bm)));

  const key = new THREE.DirectionalLight(KEY.color, KEY.intensity);
  key.position.copy(SUN).multiplyScalar(1.5); key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -0.5, right: 0.5, top: 0.5, bottom: -0.5, near: 0.1, far: 3 });
  key.shadow.camera.updateProjectionMatrix(); key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 5;
  scene.add(key, key.target);

  const salt = macroSalt(hz); scene.add(salt.root);
  const sea = new THREE.Mesh(new THREE.CircleGeometry(170, 160).rotateX(-Math.PI / 2), seaMaterial(hz, U, [...BOULDERS.map(([x, z, r]) => [x, z, 0.95 * r, 0.012]), salt.shoal]));
  sea.frustumCulled = false;
  scene.add(sea);

  // 空中：浪花的水星（加色的光点，朝太阳时亮）向右慢慢飘、微微上升；几粒盐晶翻着跟头飘过，某个面对上太阳就闪一下
  const sparkMat = billboards(hz, { map: dots(), tint: [0.35, 0.37, 0.38], opacity: 0.8, forward: 2.5 });
  sparkMat.blending = THREE.AdditiveBlending;
  const spark = driftField({ geometry: new THREE.PlaneGeometry(1, 1), material: sparkMat, count: 70, seed: 303, box: [-1.1, 0.01, -1.9, 1.1, 0.32, -0.3], vel: [0.06, 0.012, 0], sway: 0.02, swayHz: 0.4, size: [0.002, 0.005], spin: 0, fade: 'alpha' });
  const flakes = driftField({ geometry: new THREE.BoxGeometry(1, 1, 1), material: capped(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1, metalness: 0, envMapIntensity: 1.4 }), 'flake'),
    count: 45, seed: 404, box: [-0.7, 0.012, -1, 0.7, 0.26, -0.1], vel: [0.03, -0.004, 0], sway: 0.012, swayHz: 0.35, size: [0.0007, 0.0016], spin: 1.2 });
  scene.add(spark.mesh, flakes.mesh);

  const tide = t => { U.uT.value = t; U.uLevel.value = level(t); sea.position.y = level(t); };
  return {
    haze: hz,
    env: { base: null, fill: (add, B, es) => es.add(sky(hz, { R: 15 })) },
    post: { exposure: 1.05, aperture: 0.25, bloom: { strength: 0.35, threshold: 0.9 }, saturation: 1.05, lift: [0, 0.008, 0.012], vignette: 0.12, grain: 0.02 },
    macro: {
      root: salt.root,
      // 从石头这边慢慢绕到水这边、同时推近：水珠和晶面上的高光跟着走，背后的光斑慢慢横移
      camera: s => ({ type: 'fit', box: salt.frame, dir: salt.dir(MACRO_VIEW + lerp(-7, 7, easeInOut(s.u)), 24), fov: 28, scale: lerp(1, 1.12, easeInOut(s.u)) }),
      post: { aperture: 1.2, maxBlur: 0.03, exposure: 0.9, gamma: [0.86, 0.88, 0.9], saturation: 1.15 },
    },
    update(ctx, s) {
      hz.uniforms.hTime.value = s.t;
      tide(s.t); spark.update(s.t); flakes.update(s.t);
      const rel = s.dur - DROP.pre;                                       // 特写最后 DROP.pre 秒水珠松开：硬切到 drop，瓶里的水滴接着落
      if (s.name === 'macro') salt.drop(lerp(0.0016, 0.0028, ss(0, rel - 0.3, s.lt)), s.lt - rel);   // 先慢慢长大
    },
    reset() { salt.drop(0.0028); },
  };
}
```

Notes:
- **Nothing calls `Math.random`.**
  - The beads, the grains, the boulders' shapes and the macro's crystals all come from `rand(seed, i)` and value noise of a seed.
  - The rock's detail is noise of world position.
  - The waves, the tide and the drift are closed-form in `s.t`.
- **The rock is a `MeshStandardMaterial` with no `map`, `roughnessMap` or `metalnessMap`.** That satisfies the caustic's ground rule. The ledge is a `MeshPhysicalMaterial`, which is still a `MeshStandardMaterial`.
- **The sea is a plain `ShaderMaterial` on one disc.** Its floor, including the rock under the water, is computed in the shader from the same `zb` / `rockY` as the rock mesh (`ROCK_GLSL`), so the stone and its continuation under the water meet at the waterline. The disc follows the tide: `sea.position.y` is the water level at `s.t`.
- **The highlight cap is part of every glossy material.** Without it, the macro's out-of-focus beads and the sea's glitter behind the dew turned into clusters of dots. If you add a glossy material, wrap it in `capped()`.
- **The macro's fit box is taller than the cluster.** It is extended below the dew by half its height. Without that, at 16:9 the cluster's left edge reached x = 0.45 of the frame at the first frame of the macro, over the hook, whose zone ends at 0.48. With it, the cluster starts at 0.48–0.50.
- **The program cache keys** are `seasalt-rock`, `seasalt-boulder`, `seasalt-ledge`, `seasalt-bead` and `seasalt-flake`.

Run: `node --test 03-perfume/test/worlds.test.mjs`
Expected: PASS (20 tests).

- [ ] **Step 4: Look at it**

```bash
node factory/snap.mjs 03-perfume --sku seasalt --t 1.0,1.9,2.2,2.3,2.7,3.2,3.9,6.4,9.3,10.7,11.0,11.4,13.5 --ar 9x16 --out /tmp/t18
node factory/snap.mjs 03-perfume --sku seasalt --t 1.0,1.9,2.2,2.3,2.7,3.2,3.9,6.4,9.3,10.7,11.0,11.4,13.5 --ar 1x1 --out /tmp/t18
node factory/snap.mjs 03-perfume --sku seasalt --t 1.0,1.9,2.2,2.3,2.7,3.2,3.9,6.4,9.3,10.7,11.0,11.4,13.5 --ar 16x9 --out /tmp/t18
node factory/snap.mjs 03-perfume --sku seasalt --lang en --t 1.0,9.3,13.5 --ar 16x9 --out /tmp/t18/en
node factory/snap.mjs 03-perfume --sku seasalt --cut 6 --t 0.2,0.8,1.8,2.4,3.5,5.5 --ar 9x16 --out /tmp/t18/6s
```

Expected timings:
- 123–151 ms per 9x16 frame, 72–96 ms at 1x1 and 123–156 ms at 16x9;
- 129–135 ms per frame for the 6 s cut;
- the first frame of a run also compiles the shaders: about 200 ms at 9x16 and 16x9, 118 ms at 1x1, 171 ms for the 6 s cut.

- **t = 1.0 (macro):**
  - a cluster of frosted, stepped salt cubes stands on a pale wet ledge, lit from behind. The largest crystal, with its terraced faces, is at the upper right, half out over the ledge's edge;
  - the dew hangs from its lowest corner, over turquoise water, with the sun's glitter blurred into a bright patch above it;
  - smaller cubes and grains are scattered to the left, softly out of focus;
  - 一缕海风，一片澄蓝 reads clearly on the pale stone below;
  - at 16:9 the cluster runs across the upper part of the frame and the dew is right of centre. The hook is at the lower left, clear of the crystals.
- **t = 1.9 (macro):** the dew is full-size and a little elongated.
- **t = 2.2 (macro):** the dew has let go and hangs just below the crystal's corner.
- **t = 2.3 and 2.7 (drop):**
  - inside the bottle, the frame is pale teal. The drop is a clear bead in the upper part of the frame, over the pale liquid surface;
  - the dip tube and the bottle's edges are soft pale columns near the top;
  - at 16:9 the chamfered corners refract the scene into angled facets on the left.
- **t = 3.2 (drop):** rings spread on the surface where the drop landed.
- **t = 3.9 (drop):**
  - the whole bottle stands on the white rock, with its shadow falling towards the camera and to the right;
  - behind it, the waterline, turquoise shallows and a boulder or two in the sea.
- **t = 6.4 (hero):**
  - white boulders stand in the sea behind the bottle, and the horizon fades into haze;
  - 海盐 and 闻境 · WENJING sit below the bottle (on the left at 16:9), dark teal on pale stone.
- **t = 9.3 (anatomy):**
  - the camera looks towards the sun, so the water behind is a bright path of glitter;
  - the leaders 前调 海盐 / 中调 鼠尾草 / 后调 琥珀木 and 50 ml · 浓香水 are legible over it.
- **t = 10.7 (spray):** the cap is rising off the pump.
- **t = 11.0 (spray):** glints leave the nozzle to the left.
- **t = 11.4 (spray):** a soft white cloud hangs a few centimetres left of the nozzle.
- **t = 10.7–11.4 (spray):** a thin reddish line runs down from the bottle's base towards the camera. It is the red channel of the caustic: the sun is behind the bottle, and `glass.js` splits the caustic into three colours. It is faint at 16:9.
- **t = 13.5 (end):** 闻境 WENJING, 闻香 · 入境 and the dark 点击购买 button are legible, with the bottle above.
- **English (`/tmp/t18/en`):**
  - "Sea breeze, clear blue light" sits below the crystals;
  - the notes read Sea Salt / Sage / Amberwood;
  - the end shows Breathe in. Step in. and Shop now.
- **6 s cut (`/tmp/t18/6s`):**
  - 0.2: rings on the liquid;
  - 0.8: a close view of the bottle on the rock;
  - 1.8 and 2.4: the hero, with 海盐 at 2.4;
  - 3.5: the end card, 闻香 · 入境 fading in;
  - 5.5: the end card with the button.
- **No frame** shows the macro set outside the macro, the edge of the rock or of the sea disc, or a cluster of dots where a highlight is out of focus.

- [ ] **Step 5: The sea-salt score**

Make these exact replacements in `03-perfume/js/score.js`:

1. Replace:

```js
// 海盐、玫瑰在 Tasks 18–19 写自己的编曲；在那之前先用白茶的
export const SCORES = { whitetea, osmanthus, seasalt: whitetea, rose: whitetea };
```

   with:

```js
// 海盐：A 利底亚（A B C# D# E F# G#，升四级的 D# 给出海风一样的明亮），马林巴和卡林巴短促的敲击、拨弦，玻璃般的钟声，一阵阵浪涌
const SS = {
  mar: { ratios: [1, 3.93, 9.2], bright: 0.35 },           // 马林巴：木琴键的分音，余音短
  kal: { t60: 0.9, bright: 0.6 },                           // 卡林巴：亮而短的拨弦
  glass: { ratios: [1, 2.76, 5.4, 8.93], bright: 0.9 },     // 玻璃钟：高分音多
  low: { t60: 3, bright: 0.3 },
  pad: { a: 1.5, r: 1.4, cut: 3, air: 0.5 },
  wave: { type: 'bandpass', q: 0.45, sweep: 2, a: 1.1, r: 1.3, wander: 0.3 },   // 浪涌：低处的滤波噪声，慢起慢落，涌上来时频率往上走
};
const swell = (t, d, v, p = {}) => ({ t, voice: 'noise', f: 300, d, v, bus: 'music', p: { ...SS.wave, ...p } });
const seasalt = {
  tonic: 69,                                               // A4：品牌动机 B4 E5 A5 落在铺底之上
  reverb: { decay: 3.8, music: 0.45, sfx: 0.3 },
  bed: { type: 'bandpass', f: 1200, q: 0.4, a: 0.6, r: 1.4, wander: 1, v: 0.3 },  // 海崖上的风：比白茶的更宽、更飘
  m15: () => [
    // 0–2.25 微距：A3 + E4 + B4 的铺底慢慢升起，一阵浪涌；玻璃钟稀疏地闪，像水面上的碎光
    ...seq('pad', 0, [[0, 57, 3.6, 0.85], [0, 64, 3.6, 0.6], [0, 71, 3.6, 0.4]], { ...SS.pad, a: 1.2 }),
    swell(0, 2.4, 0.45),
    ...seq('bell', 0, [[0, 88, 3, 0.35], [1, 83, 2.5, 0.3], [1.5, 87, 2, 0.25], [2, 81, 3, 0.3], [2.5, 80, 2.5, 0.25]], SS.glass),
    // 2.25–3 落下：气流上升，马林巴十六分音符下行 B5 A5 F#5 D#5，落进 3.0 的命中
    { t: 2.25, voice: 'noise', f: 600, d: 0.75, v: 0.45, bus: 'music', p: { type: 'bandpass', q: 1.2, sweep: 6, a: 0.7, r: 0.05 } },
    ...seq('bell', 2.25, [[0, 83, 1.2, 0.55], [0.25, 81, 1.2, 0.55], [0.5, 78, 1.2, 0.6], [0.75, 75, 1.2, 0.6]], SS.mar),
    // 3.0 命中：低音 A2、玻璃钟 E6（避开 plink 的 A5：同一个音叠在一起，限幅要多压 2 dB）、铺底涨起来，涟漪散开时一阵浪涌；之后卡林巴稀疏的回声
    ...seq('pluck', 3, [[0, 45, 4, 0.5], [0, 57, 3, 0.3]], SS.low),
    ...seq('bell', 3, [[0, 88, 3.2, 0.35], [1.5, 85, 1.6, 0.2]], SS.glass),
    ...seq('pad', 3, [[0, 57, 1.6, 0.75], [0, 64, 1.6, 0.55], [0, 71, 1.6, 0.35]], { ...SS.pad, a: 0.3 }),
    swell(3, 1.8, 0.35, { a: 0.4 }),
    ...seq('pluck', 3, [[1, 76, 2, 0.25], [1.5, 81, 2, 0.2]], SS.kal),
    // 4.5 正面：卡林巴主题 C#5 → D#5 → E5（升四级在中间），马林巴轻轻打着 A4 E5 B4 E5
    ...seq('pluck', 4.5, [[0, 73, 1.5, 0.5], [1, 75, 1, 0.45], [1.5, 76, 1.5, 0.5]], SS.kal),
    ...seq('bell', 4.5, [[0, 69, 1, 0.35], [0.5, 76, 1, 0.3], [1, 71, 1, 0.3], [1.5, 76, 1, 0.3]], SS.mar),
    ...seq('pad', 4.5, [[0, 57, 1.6, 0.8], [0, 64, 1.6, 0.6], [0, 73, 1.6, 0.3]], SS.pad),
    ...seq('pluck', 4.5, [[0, 45, 2, 0.4]], SS.low),
    // 6.0 命中：换到 B 大三和弦（利底亚的二级），低音 B2 F#3 D#4、玻璃钟闪一下；主题落到 B5 再回 A5、G#5
    ...seq('pluck', 6, [[0, 47, 3, 0.45], [0, 54, 3, 0.35], [0, 63, 3, 0.3]], SS.low),
    ...seq('bell', 6, [[0, 90, 1.6, 0.35], [0.25, 83, 1.2, 0.2]], SS.glass),
    ...seq('pluck', 6, [[0, 83, 1.5, 0.5], [1, 81, 1, 0.4], [1.5, 80, 1.5, 0.4]], SS.kal),
    ...seq('pad', 6, [[0, 47, 1.7, 0.8], [0, 54, 1.7, 0.55], [0, 63, 1.7, 0.4], [0, 66, 1.7, 0.3]], { ...SS.pad, a: 0.3 }),
    // 7.5–10.5 分解：马林巴稀疏地敲几下，Amaj7 的铺底，很轻的一阵浪；配音在这里讲香调
    ...seq('bell', 7.5, [[0, 69, 1.5, 0.3], [0.5, 76, 1, 0.2], [1, 73, 1.5, 0.25], [2, 71, 1.5, 0.28], [2.5, 76, 1, 0.2], [3, 75, 1.5, 0.25]], SS.mar),
    ...seq('pad', 7.5, [[0, 57, 3.4, 0.7], [0, 64, 3.4, 0.5], [0, 68, 3.4, 0.3], [0, 71, 3.4, 0.2]], SS.pad),
    ...seq('pluck', 7.5, [[0, 45, 3, 0.4], [2, 52, 3, 0.35]], SS.low),
    swell(7.5, 3, 0.25),
    // 10.5–12 喷雾：铺底停在 B F# D# 上；喷出去的那一下，玻璃钟往上撒四个音 F#5 B5 D#6 F#6（玻璃钟不高过 F#6：再高，最上面的分音逼近 AAC 的上限，编码后过冲）
    ...seq('pad', 10.5, [[0, 47, 1.6, 0.7], [0, 54, 1.6, 0.55], [0, 63, 1.6, 0.4]], { ...SS.pad, a: 0.5 }),
    ...seq('bell', 10.5, [[0.5, 78, 2, 0.25], [0.75, 83, 2, 0.2], [1, 87, 2, 0.18], [1.25, 90, 2, 0.15]], SS.glass),
    // 12.0 片尾：品牌动机（共用），A add9 的铺底、低音 A 收住，最后一阵浪退下去
    ...seq('pad', 12, [[0, 57, 3, 0.8], [0, 64, 3, 0.6], [0, 71, 3, 0.35], [0, 73, 3, 0.2]], { ...SS.pad, a: 0.4, r: 0.8 }),
    ...seq('pluck', 12, [[0, 33, 4, 0.5], [0, 45, 4, 0.3]], SS.low),
    swell(12, 3, 0.35, { a: 0.8, r: 1.6 }),
  ],
  m6: () => [
    // 0 命中：水滴落下就开始，低音 A、马林巴 A4 + E5、玻璃钟 C#6、铺底，一阵浪
    ...seq('pluck', 0, [[0, 45, 3, 0.4], [0, 57, 2, 0.25]], SS.low),
    ...seq('bell', 0, [[0, 69, 1.2, 0.35], [0, 76, 1.2, 0.25]], SS.mar),
    ...seq('bell', 0, [[0, 85, 2.4, 0.3]], SS.glass),
    ...seq('pad', 0, [[0, 57, 1.8, 0.8], [0, 64, 1.8, 0.6], [0, 71, 1.8, 0.35]], { ...SS.pad, a: 0.3 }),
    swell(0, 1.5, 0.35, { a: 0.3, r: 1 }),
    // 0.375–1.5 马林巴上行 C#5 D#5 E5 G#5
    ...seq('bell', 0, [[0.5, 73, 1, 0.4], [1, 75, 1, 0.42], [1.5, 76, 1, 0.45], [1.75, 80, 1, 0.35]], SS.mar),
    // 1.5 正面：卡林巴 E5 F#5，2.25 光带峰值落在 B5 上，再回 A5；铺底换到 B 大三和弦
    ...seq('pluck', 1.5, [[0, 76, 0.75, 0.45], [0.5, 78, 0.75, 0.45], [1, 83, 1.5, 0.55], [1.5, 81, 1, 0.4]], SS.kal),
    ...seq('bell', 2.25, [[0, 90, 1.4, 0.3]], SS.glass),
    ...seq('pad', 1.5, [[0, 47, 1.8, 0.7], [0, 54, 1.8, 0.5], [0, 63, 1.8, 0.3]], { ...SS.pad, a: 0.3 }),
    ...seq('pluck', 1.5, [[0, 47, 2, 0.5]], SS.low),
    // 3.0 片尾：品牌动机（共用），A add9 收住，浪退下去
    ...seq('pad', 3, [[0, 57, 3, 0.8], [0, 64, 3, 0.6], [0, 71, 3, 0.35], [0, 73, 3, 0.2]], { ...SS.pad, a: 0.4, r: 0.8 }),
    ...seq('pluck', 3, [[0, 33, 4, 0.5], [0, 45, 4, 0.3]], SS.low),
    swell(3, 3, 0.3, { a: 0.8, r: 1.6 }),
  ],
};

// 玫瑰在 Task 19 写自己的编曲；在那之前先用白茶的
export const SCORES = { whitetea, osmanthus, seasalt, rose: whitetea };
```

Notes:
- **Levels.** No low pluck is above 0.5, and bells stay between 0.15 and 0.6. The score alone (`vo: 'off'`) peaks at 0.22 (15 s) and 0.23 (6 s). Its loudness gain is 14.5 dB (15 s) and 14.3 dB (6 s). After it, the limiter works:
  - at most 4.4 dB in the 15 s cut, for about 30 ms on the 6.0 s hit;
  - at most 4.7 dB in the 6 s cut, for about 60 ms on the landing at 0.
- **Keep the hit's glass bell off the plink's pitch.** The shared plink at 3.0 s (and at 0 in the 6 s cut) is an A5. In the first draft a glass A5 sat on it, over the low A2 pluck at 0.5–0.6, and the limiter trimmed 6.4 dB at 3.0 s and 5.8 dB at 0. Softer notes and fuller pads brought the 3.0 s hit down only to 5.2 dB. With the bell moved to E6 it is 4.1 dB.
- **Keep the glass bell at or below F♯6.** Its top partial is 8.93 times the note, and energy that high is what makes the AAC encoder overshoot (Task 15). While the spray arpeggio reached B6, with that partial at 17.6 kHz, the encoded 15 s mix peaked 0.5 dB higher at the logo than with the arpeggio F♯5 B5 D♯6 F♯6. The overshoot moves with small changes: an E6 bell at 0 in the 6 s cut peaked 1.2 dB higher there than the C♯6 it has now.
- **The 15 s score alone needs a second encode.** With the limit at −3 dBFS, the AAC file peaks at −0.5 dBTP on the logo's first note at 12.0 s, 1.7 dB above the WAV. `encodeAudio` limits again at −4.3 dBFS and lands at −2.5 dBTP. The 6 s score alone passes first time, at −2.1.
  - With the voice-over the mix is louder, so its gain is 10.4 dB (15 s) and 11.0 dB (6 s). The 15 s cut then passes first time, at −1.7 dBTP.
  - The 6 s cut measures −1.47 on its first pass, just over `LOUD.TP`. It passes on the second, at −1.7.
- **After any change to the arrangement,** re-run the render below and check both sidecars.

Run: `node --test 03-perfume/test/score.test.mjs`
Expected: PASS (8 tests).

With `npm run serve` running, open `http://127.0.0.1:8765/03-perfume/?paused&sku=seasalt&vo=off` in Chrome. Tick 声音, then press Space. `vo=off` plays the score on its own.

Expected:
- Sound starts about 1.1 s after ticking, while the 15 s mix renders.
- **0–2.25 s:** a soft A pad (A3, E4, B4) swells in with a slow surge of low surf. Glass bells glint sparsely above it, E6, B5, D♯6, A5, G♯5, like light on the water. Under everything is a wide, airy sea wind.
- **2.25 s:** a breath of air rises, and the marimba falls four sixteenth notes, B5 A5 F♯5 D♯5, into the hit.
- **3.0 s:**
  - the drop lands with the plink and its three ripples;
  - a deep A pluck (A2 + A3) and a high glass E6 sound, and the pad swells;
  - a small surge washes in as the ripples spread. Kalimba echoes follow, E5 at 3.75 s and A5 at 4.125 s, with a quiet glass C♯6.
- **4.5 s:** after the whoosh, the kalimba plays the theme C♯5 – D♯5 – E5, with the raised fourth in the middle. The marimba taps A4 E5 B4 E5 on the eighth notes over the pad.
- **6.0 s:** at the light streak:
  - the harmony moves up to B major, the lydian's bright second, over low B2, F♯3 and D♯4;
  - a glass F♯6 flashes, with a B5 just after;
  - the kalimba reaches B5, then falls to A5 and G♯5.
- **7.5–10.5 s:** no melody. A sparse marimba figure (A4 E5 C♯5, then B4 E5 D♯5 from 9.0 s) sits over an A major 7 pad, a low A and then E, and a slow, soft surge. This is the room for Task 16's voice-over.
- **10.5–12 s:**
  - the pad holds B, F♯ and D♯;
  - the glass clink, the spray hiss and the seat click come as in Task 15;
  - a glass arpeggio rises F♯5 B5 D♯6 F♯6 (10.875–11.44 s), like spray catching the light.
- **12.0 s:** the logo: B4, E5, then a long A5, each pluck with a bell above. It sits over an A add9 pad (A3, E4, B4, C♯5), a low A1 + A2 pluck and a last surge that falls away. Everything fades over the last 0.3 s.
- **The 6 s cut** has its own arrangement:
  - it opens on the landing: the plink, a low A, marimba A4 + E5, a glass C♯6, the pad and a surge;
  - the marimba climbs C♯5 D♯5 E5 G♯5;
  - at 1.5 s the harmony moves to B, and the kalimba plays E5 – F♯5, reaching B5 on the 2.25 s streak with a glass F♯6, then A5;
  - at 3.0 s the logo plays over the A add9 pad, and the last surge falls away.
- **With the voice-over:** reload without `&vo=off`. Task 16's voice reads 「一缕海风，一片澄蓝。」 at 4.6 s, 「海盐、鼠尾草、琥珀木。」 at 7.7 s over the marimba figure, and 「闻境海盐，闻香入境。」 at 12.3 s over the logo. The music dips under each line. The 6 s cut has 「闻境海盐，一缕海风，一片澄蓝。」 at 1.1 s.

- [ ] **Step 6: Re-run the pre-flight and render**

The manifest's 海盐 variants now render the shore and their own score, so check determinism, the audio and speed again.

Run: `node factory/check.mjs 03-perfume --sku seasalt; echo "exit $?"`
Expected: every line `ok`, including:
- `determinism  14 frames identical forward and backward`;
- ```
  ok    voice-over   3 lines in 1 variants: every clip present, current, inside its slot
  ok    audio        6 s identical twice, peak -9.6 dBFS, 292 ms · 15 s identical twice, peak -8.5 dBFS, 1058 ms
  ```
- `speed  ~126 ms/frame at 1080×1920 …`;
- then `all checks passed` and `exit 0`.

The audio check renders the mixes with the voice-over, so the peaks are the voice's. The score alone peaks at −12.6 dBFS (6 s) and −13.1 dBFS (15 s).

Run: `node factory/render.mjs 03-perfume --sku seasalt --cut 15,6 --ar 9x16 --out /tmp/t18/render --force; echo "exit $?"`
Expected:
- One line per video, e.g. `[1/2] wenjing_seasalt_15s_9x16_zh  450 frames  69.8 s (6.4 fps)  16.6 MB` and `[2/2] wenjing_seasalt_6s_9x16_zh  180 frames  36.2 s (5.0 fps)  7.6 MB`.
- Then `done 2, skipped 0, failed 0  ·  …` and `exit 0`.
- `/tmp/t18/render/wenjing_seasalt_15s_9x16_zh.json` has `"audio": true, "lufs": -14.1, "tp": -1.7`. The 6 s sidecar has `"lufs": -14, "tp": -1.7`.
- `ffprobe -v error -show_entries stream=codec_type,start_time,duration,sample_rate -of compact /tmp/t18/render/wenjing_seasalt_15s_9x16_zh.mp4` prints:
  ```
  stream|codec_type=video|start_time=0.000000|duration=15.000000
  stream|codec_type=audio|sample_rate=48000|start_time=0.000000|duration=15.000000
  ```

- [ ] **Step 7: Run all tests and commit**

Run: `npm test`
Expected: PASS, 139 tests.

```bash
git add 03-perfume/js/worlds/seasalt.js 03-perfume/film.js 03-perfume/js/score.js
git commit -m "Add the sea-salt world: white rock at the waterline, caustic shallows, the salt-crystal dew macro; its own A lydian score

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 19: The 玫瑰 world — dark-red velvet under one hard light, the petal-dew macro and the rose score — `rose.js`, `score.js`

This task builds the last scent world and gives 玫瑰 its own music. The bottle stands on a sheet of dark wine-red velvet that lies flat under it, then curves up behind into a curtain of hanging folds. One hard light from the front left, above, lights only a pool around the bottle. Outside the pool the velvet sinks into dark red. A few petals lie on the floor and more drift down through the light. The macro is one outer petal of a backlit rose, with a dew drop growing at its rolled-back tip.

Nothing in the engine changes. The world uses the Task 13–14 contract and helpers as they stand: `common.js`, `worlds.test.mjs` and `audio.js` are untouched. `film.js` only points `rose` at the new module, and `score.js` gains the `rose` arrangement.

**How the velvet room is made:**
- **One sheet of cloth.** It is one 480 × 420 grid laid out along the sheet's arc length:
  - flat floor from z = 1.4 back to −0.42;
  - then a quarter circle of radius 0.35;
  - then straight up to 2.2 m.

  It is displaced along its normal by:
  - 64 vertical folds, Gaussian ridges on average 10 cm apart, each with its own width, height and offset from `rand`. They gather towards the top, lean slowly from side to side, and spread out and flatten where they spill onto the floor;
  - a few broad swells from 2-D value noise.

  All of it is multiplied by a clearing mask. The cloth is exactly flat (y = 0) within 17 cm of the bottle, which is where the caustic lands, and the folds are full beyond 45 cm.
- **Velvet.** A `MeshPhysicalMaterial`: `#3d0812`, roughness 0.95, sheen 1 (`#6a0c1a`, sheen roughness 0.42).
  - The shader varies the colour by ±30% in crushed patches (fbm of world position). It adds a fine pile noise that fades out once it gets smaller than a pixel.
  - The sheen colour follows the same patches.
  - The mean of the colour is the material's own `color`, which is what the caustic reads.
- **The pool of light.** The key is still the world's one shadow-casting `DirectionalLight`: intensity 4.2, `#fff0e2`, about 41° up, 2048² shadow map, radius 1.5, so the shadow edge is sharp.
  - `spotted()` patches the velvet's and the floor petals' shaders after `lights_fragment_end`. It multiplies the direct light (diffuse, specular and sheen) by a cone whose apex is 2.2 m up the key direction from the bottle.
  - Inside 3° the light is full: a pool about 12 cm in radius on the floor. By 7.5° it has fallen to a 12% spill, and the spill itself fades out by 40°, so the curtain is only faintly lit.
  - Image-based light is not masked. `envMapIntensity` (0.08 on the velvet) sets how dark the room is outside the pool.
- **Petals.** `petalGeometry(len, …)` is a fan from the base along +x with a rounded outline: the sides pull in to a quarter of the length. Each ray bends in its own vertical plane. It lifts at the base, flattens outwards, and the last stretch rolls back down (`roll`). The sides cup up and the edge ruffles. `userData.tip` is the midline tip.
  - `petalMaterial` uses sheen and a 256² procedural vein texture as both map and bump: fine radial veins, a paler base and a darker rim. `specularIntensity` is 0, because a specular term put grey highlights on the dark red.
  - After the lights, a translucency term adds the key light shining through from behind: deep red, brighter along the veins.
  - Four petals lie on the floor, at least 8 cm from the bottle, so neither the caustic nor the rays reach them. Fourteen more drift down behind the bottle, turning (`driftField`).
- **The macro rose.** It is built in the flower's own frame and turned 90°, so the camera looks down −x into the key light. That makes it backlit, like the tea sprig.
  - Thirteen petals sit on a 137.5° spiral: small, upright and cupped at the centre, larger and more open further out. The outer slot facing the camera is left free.
  - That slot holds the main petal, 44 mm long, turned a little to the right. Its edge rolls back and the dew hangs at its tip.
  - 30 cm behind, far out of focus, is `glowCard`: an unlit dark-red disc, bright in the middle and fading smoothly outwards. It stands in for the light spilling round the flower from the key side. A velvet backdrop in that spot was lit only from behind and read as black.
  - The dew is `dewMaterial`, dark red below and crimson above. It grows from 1.6 to 3 mm and lets go in the last `DROP.pre` seconds through `rose.drop(R, tau)`, exactly as the tea sprig's dew does.
  - The camera fits a 24 × 30 mm box round the tip, flattened to the dew's depth. It orbits from −10° to +6° in yaw and 0° to 7° in pitch, pushes in 12%, and uses fov 28. The macro post opens the aperture to 2.5 with a 0.035 blur cap.
- **Grade and haze.** AgX tone mapping pushes bright, saturated reds towards salmon. So the materials keep the reds dark, and the grade raises saturation instead:
  - 1.2 in the bottle shots, 1.3 in the macro;
  - a slight red lift and a 0.32 vignette.

  The haze runs from zenith `#1a080c` to horizon `#8a2c3a` with mist `#4a1a22`, and its sun is the key light. The dew and the spray's billboards are coloured from it, and so is the bottle's drop in Task 14.
- **Reflections.** On a `#0b0406` base, three panels:
  - the key light's reflection on the glass and the cap;
  - a dark-red curtain behind;
  - the velvet below.

**The rose score** is C dorian (C D E♭ F G A B♭) with tonic C4. The shared logo is therefore D, G, then a long C. It uses only the existing voices, shaped through `p`:
- a cello-like `pad`: slow attack, dark cutoff (2 × f), a little air;
- a pulse of short, dark low `pluck`s on the eighth notes;
- a bright, long-ringing `pluck` for the harp, always climbing;
- a low `flute` with little breath, whose vibrato after 0.3 s carries a cello-ish line;
- `bell`s only on the hits.

The bed is a 420 Hz band of noise, darker and lower than the tea garden's 900 Hz mist: a night-garden wind. The reverb is a little longer, at 3.6 s.

**Files:**
- Create: `03-perfume/js/worlds/rose.js`
- Modify: `03-perfume/film.js`, `03-perfume/js/score.js`
- Test: none added. `worlds.test.mjs` runs its five tests for every distinct world in `WORLDS`, and `score.test.mjs` its eight for every sku's score, so both pick up 玫瑰.

**Interfaces:**
- Consumes:
  - Task 1: `rand(seed, i)`; `lerp`, `ss`, `clamp`, `easeInOut`.
  - Task 13: `haze`, `dewMaterial`, `driftField`, `NOISE` (common.js); the world contract and the world rules in `worlds.test.mjs`; fit intents for the macro camera.
  - Task 14: `DROP`, `fallen`, `stretch` (drop.js); `build` returns `haze`; the macro dew lets go at `lt = dur − DROP.pre`.
  - Task 15: `seq`, `BEAT`, `STEP`, `SCORES`, `logo`, `sfx`; the score rules in `score.test.mjs`; the loudness chain in `ffmpeg.mjs` (`loudnessFilter`, `encodeAudio`).
  - Task 16: the voice-over. 玫瑰's clips already exist, so its variants are narrated, with the music ducked under each line.
- Produces:
  - `rose.js`: `build`, and `petalGeometry(len, { spread, cup, lift, roll, t0, ruffle, seed, segs })`, running +x from base to edge with the inner face +y, and `userData.tip`.
  - `film.js`: `WORLDS.rose = () => import('./js/worlds/rose.js')`.
  - `score.js`: `SCORES.rose` = `{ tonic: 60, reverb, bed, m15, m6 }`.

- [ ] **Step 1: Point 玫瑰 at its world**

Make these exact replacements in `03-perfume/film.js`:

1. Replace:

```js
// 各香型的世界；还没做的先用中性影棚。?world=studio 可强制影棚，单独调瓶子和玻璃
export const WORLDS = { studio, whitetea: () => import('./js/worlds/whitetea.js'), osmanthus: () => import('./js/worlds/osmanthus.js'), seasalt: () => import('./js/worlds/seasalt.js'), rose: studio };
```

   with:

```js
// 各香型的世界。?world=studio 可强制换成中性影棚，单独调瓶子和玻璃
export const WORLDS = { studio, whitetea: () => import('./js/worlds/whitetea.js'), osmanthus: () => import('./js/worlds/osmanthus.js'), seasalt: () => import('./js/worlds/seasalt.js'), rose: () => import('./js/worlds/rose.js') };
```

- [ ] **Step 2: Run the world tests to make sure they fail**

Run: `node --test 03-perfume/test/worlds.test.mjs`
Expected: FAIL. There are 25 tests.
- The 20 `studio:`, `whitetea:`, `osmanthus:` and `seasalt:` tests pass.
- The five `rose:` tests fail with `ERR_MODULE_NOT_FOUND`: `Cannot find module '…/03-perfume/js/worlds/rose.js' imported from …/03-perfume/film.js`.

- [ ] **Step 3: The rose world**

`03-perfume/js/worlds/rose.js`:

```js
// rose.js — 玫瑰 · 暗红丝绒：瓶子立在一块铺开的丝绒上，丝绒往后堆起、顺着弧面升成一道垂着褶的幕；一盏硬光从左前上方打下来，
// 只照亮瓶子周围一圈（光圈外沉进暗红里），几片花瓣慢慢飘落穿过光里。特写是一朵玫瑰外层的一片花瓣：瓣缘外翻卷下，瓣尖挂着一颗渐渐长大的露珠
import * as THREE from 'three';
import { haze, dewMaterial, driftField, NOISE } from './common.js';
import { DROP, fallen, stretch } from '../drop.js';
import { rand } from '../../../factory/engine/rng.js';
import { lerp, ss, clamp, easeInOut } from '../../../factory/engine/ease.js';

const KEY = { dir: new THREE.Vector3(-0.6, 0.66, 0.45).normalize(), color: '#fff0e2', intensity: 4.2 };   // 指向主光：左前上方，仰角约 41°
// 主光的光圈：顶点在瓶子上方沿主光方向 D 米处的一个锥，内角以内全亮（地上半径约 12 厘米）、外角以外只剩一点溢光（spill，慢慢暗到 40°，照着身后的幕）
const SPOT = { at: [0, 0.07, 0], D: 2.2, inner: 3, outer: 7.5, spill: 0.12 };
const SKY = { zenith: '#1a080c', horizon: '#8a2c3a', mist: '#4a1a22', sun: { dir: KEY.dir.toArray(), color: '#ffe6d0', glow: 0.5, rays: 0 } };

// ── 一维、二维值噪声（只由 seed 决定）──
const n1 = (seed, x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(rand(seed, i), rand(seed, i + 1), u); };
const n2 = (seed, x, y) => {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v), g = (p, q) => rand(seed, (p + 4096) * 8192 + q + 4096);
  return lerp(lerp(g(i, j), g(i + 1, j), a), lerp(g(i, j + 1), g(i + 1, j + 1), a), b);
};

// ── 光圈：给 MeshStandard / MeshPhysical 材质打补丁，直射光（场景里只有主光一盏）乘上光圈的遮罩 ──
const SPOT_U = {
  uSpotAt: { value: new THREE.Vector3(...SPOT.at) }, uSpotDir: { value: KEY.dir },
  uSpot: { value: new THREE.Vector4(SPOT.D, Math.cos((SPOT.outer * Math.PI) / 180), Math.cos((SPOT.inner * Math.PI) / 180), SPOT.spill) },
};
const SPOT_GLSL = /* glsl */`
uniform vec3 uSpotAt, uSpotDir; uniform vec4 uSpot; varying vec3 vRoseW;
float spotPool(vec3 w) {
  float c = dot(normalize(w - uSpotAt - uSpotDir * uSpot.x), -uSpotDir);
  return mix(uSpot.w * smoothstep(0.766, 0.99, c), 1.0, smoothstep(uSpot.y, uSpot.z, c));
}`;
function spotted(m, key, extra = sh => sh) {
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, SPOT_U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRoseW;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
  vec4 roseW = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    roseW = instanceMatrix * roseW;
  #endif
  vRoseW = (modelMatrix * roseW).xyz;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n${SPOT_GLSL}\n${NOISE}`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
  float pool = spotPool(vRoseW);
  reflectedLight.directDiffuse *= pool; reflectedLight.directSpecular *= pool;
  #ifdef USE_SHEEN
    sheenSpecularDirect *= pool;
  #endif`);
    extra(sh);
  };
  m.customProgramCacheKey = () => `rose-${key}`;
  return m;
}

// ── 丝绒：一整张布，前面平铺在地上，往后顺着弧面立成一道幕 ──
// 沿布的弧长 s：地面从 z = front 到 back，再绕半径 R 的弧，再竖直升到 top。瓶子周围 clear[0] 米以内严格平（y = 0，焦散落在这里），clear[1] 米外褶子全出来
const DRAPE = { half: 2.4, front: 1.4, back: -0.42, R: 0.35, top: 2.2, clear: [0.17, 0.45], NX: 480, NS: 420 };
const FLOOR = DRAPE.front - DRAPE.back, ARC = (Math.PI / 2) * DRAPE.R, LEN = FLOOR + ARC + DRAPE.top;
// 幕上的褶：一条条竖着的圆脊（高斯截面），平均间距 10 厘米，宽、高、位置各不相同
const FOLD = { gap: 0.1, n: 64 };
const FOLDS = Array.from({ length: FOLD.n }, (_, k) => {
  const r = j => rand(301, k * 4 + j);
  return { x: (k - FOLD.n / 2 + 0.8 * (r(0) - 0.5)) * FOLD.gap, w: lerp(0.022, 0.05, r(1)), a: lerp(0.35, 1, r(2)) };
});
const MEAN = FOLDS.reduce((s, f) => s + f.a * f.w, 0) * Math.sqrt(Math.PI) / (FOLD.n * FOLD.gap);
function folds(x) {
  const k0 = Math.round(x / FOLD.gap + FOLD.n / 2);
  let s = 0;
  for (let k = Math.max(0, k0 - 4); k <= Math.min(FOLD.n - 1, k0 + 4); k++) { const f = FOLDS[k], d = (x - f.x) / f.w; s += f.a * Math.exp(-d * d); }
  return s - MEAN;
}
/** 布上 (x, s) 这一点：未起褶的位置、法线（朝向凹的一面：地上朝上，幕上朝 +z），离墙根（弧的起点）往前 q 米、往上 h 米 */
function sweepAt(x, s) {
  const { back, R } = DRAPE;
  if (s <= FLOOR) return { p: [x, 0, DRAPE.front - s], n: [0, 1, 0], q: FLOOR - s, h: 0 };
  if (s <= FLOOR + ARC) { const a = (s - FLOOR) / R; return { p: [x, R * (1 - Math.cos(a)), back - R * Math.sin(a)], n: [0, Math.cos(a), Math.sin(a)], q: 0, h: s - FLOOR }; }
  return { p: [x, R + s - FLOOR - ARC, back - R], n: [0, 0, 1], q: 0, h: s - FLOOR };
}
/**
 * 起褶的量（沿法线，米）。幕上：竖褶越往上越收拢、左右慢慢摆；落到地上的一段褶往前摊开、渐渐变浅，
 * 再叠几道大的斜褶和缓缓的起伏（布铺开时堆出来的），都乘上瓶子周围的"清空"遮罩
 */
function drapeOffset(x, s) {
  const { q, h, p } = sweepAt(x, s), [c0, c1] = DRAPE.clear;
  const clear = ss(c0, c1, Math.hypot(p[0], p[2] * 1.15));
  const lean = 0.03 * Math.sin(h * 2.1 + x * 0.7) + 0.05 * (2 * n1(311, x * 1.5 + h * 0.4) - 1);
  const xw = (x + lean) * (1 + 0.14 * h) / (1 + 1.3 * q);
  const hang = folds(xw) * lerp(0.035, 0.06, ss(0, 0.6, h)) * Math.exp(-q / 0.28);
  const swell = 0.014 * (2 * n2(313, x * 2.2, (DRAPE.front - p[2]) * 2.2) - 1) + 0.008 * (2 * n2(317, x * 5, p[2] * 5) - 1);
  return (hang + swell * (q > 0 ? 1 : 0.4)) * clear;
}
function drapeGeometry() {
  const { NX, NS, half } = DRAPE, pos = new Float32Array((NX + 1) * (NS + 1) * 3), idx = [];
  for (let j = 0; j <= NS; j++) {
    const s = LEN * (j / NS);
    for (let i = 0; i <= NX; i++) {
      const x = lerp(-half, half, i / NX), { p, n } = sweepAt(x, s), d = drapeOffset(x, s), o = 3 * (j * (NX + 1) + i);
      pos[o] = p[0]; pos[o + 1] = p[1] + n[1] * d; pos[o + 2] = p[2] + n[2] * d;
    }
  }
  for (let j = 0; j < NS; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + NX + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/**
 * 丝绒的材质：很暗的酒红底色 + 红色的丝绒光（sheen，掠射时亮）。颜色、丝绒光按世界坐标一块块深浅不一（压花丝绒），
 * 颜色的平均值就是 color 本身（焦散读 color / roughness，见 glass.js）
 */
function velvetMaterial() {
  const m = new THREE.MeshPhysicalMaterial({ color: '#3d0812', roughness: 0.95, metalness: 0, sheen: 1, sheenColor: '#6a0c1a', sheenRoughness: 0.42, envMapIntensity: 0.08 });
  return spotted(m, 'velvet', sh => {
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
  vec2 vp = vec2(vRoseW.x, vRoseW.z + vRoseW.y);                             // 地上按 xz、幕上按 xy
  float crush = fbm(vp * 6.0 + 3.1) - 0.47, pile = mix(vnoise(vp * 90.0) - 0.5, 0.0, clamp(fwidth(vp.x) * 60.0, 0.0, 1.0));
  diffuseColor.rgb *= 1.0 + 0.3 * crush + 0.12 * pile;`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
  material.sheenColor *= 1.0 + 0.9 * crush;`);
  });
}

// ── 花瓣 ──
/**
 * 一片玫瑰花瓣：从瓣基（原点）沿 +x 展开成一把扇子（半角 spread 弧度），瓣缘是圆的（两侧收到瓣长的 1/4），内面朝 +y。每条射线在自己的竖直面里弯：
 * 瓣基往上抬 lift（弧度），往外渐平，最后 1 − t0 这一段瓣缘外翻卷下，瓣尖的角度是 −roll；cup 两侧抬起（内卷），ruffle 瓣缘起伏（占瓣长）。
 * uv.x 从瓣基到瓣缘（0–1），uv.y 横跨瓣宽（中线 0.5）。tip 是中线上的瓣尖（露珠挂在这里）
 */
export function petalGeometry(len, { spread = 0.62, cup = 0.4, lift = 0.7, roll = 1.2, t0 = 0.72, ruffle = 0.04, seed = 1, segs = [48, 40] } = {}) {
  const [NT, NA] = segs, pos = [], uv = [], idx = [];
  for (let j = 0; j <= NA; j++) {
    const v = (j / NA) * 2 - 1, th = v * spread, R = len * (0.25 + 0.75 * Math.sqrt(1 - v * v)) * (1 + ruffle * (2 * n1(seed, v * 3 + 7) - 1));
    let rho = 0, y = 0;
    for (let i = 0; i <= NT; i++) {
      const t = i / NT;
      if (i) { const tm = (i - 0.5) / NT, phi = lift * (1 - tm) ** 1.6 - roll * ss(t0, 1, tm) ** 1.2; rho += (Math.cos(phi) * R) / NT; y += (Math.sin(phi) * R) / NT; }
      const b = rho * Math.sin(th), wave = ruffle * len * ss(0.7, 1, t) * (2 * n1(seed + 1, v * 4.5) - 1);
      pos.push(rho * Math.cos(th), y + (cup * b * b / len) * (1 - 0.8 * ss(t0, 1, t)) + wave, b); uv.push(t, (v + 1) / 2);
    }
  }
  for (let j = 0; j < NA; j++) for (let i = 0; i < NT; i++) { const a = j * (NT + 1) + i, c = a + NT + 1; idx.push(a, c, a + 1, a + 1, c, c + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  const o = 3 * ((NA / 2) * (NT + 1) + NT);
  g.userData.tip = new THREE.Vector3(pos[o], pos[o + 1], pos[o + 2]);
  return g;
}
/** 花瓣的纹理（uv 同 petalGeometry）：从瓣基放射出去的细脉，瓣基淡、瓣缘深一点，瓣面有一点斑驳。平均亮度约 0.85 */
function petalTexture(W = 256, H = 256) {
  const px = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const t = (i + 0.5) / W, v = (j + 0.5) / H, q = v * 46 + 0.8 * n2(401, t * 6, v * 8), f = q - Math.round(q);
    const vein = Math.exp(-((f / 0.12) ** 2)) * ss(0.05, 0.3, t) * ss(1, 0.85, t);
    const val = 0.86 - 0.08 * vein + 0.06 * (n2(403, t * 30, v * 30) - 0.5) - 0.12 * ss(0.8, 1, t) + 0.14 * ss(0.15, 0, t), p = 4 * (j * W + i);
    px[p] = px[p + 1] = px[p + 2] = Math.round(255 * clamp(val)); px[p + 3] = 255;
  }
  const tex = new THREE.DataTexture(px, W, H);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}
/**
 * 花瓣的材质：绒面（sheen）+ 细脉贴图。逆光时花瓣透光：lights 之后给 directDiffuse 加上从背面穿过来的主光（深红，脉处更亮）。
 * spot = true：地上和飘着的花瓣也乘主光的光圈（光圈外只剩溢光）
 */
function petalMaterial(tex, { color = '#8c1024', sheen = '#8a1a2a', trans = 0.6, spot = false, key = 'petal' } = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color, map: tex, bumpMap: tex, bumpScale: 0.6, roughness: 0.6, specularIntensity: 0, sheen: 0.4, sheenColor: sheen, sheenRoughness: 0.5, envMapIntensity: 0.1, side: THREE.DoubleSide });
  const U = { uTrans: { value: new THREE.Color('#8a0a1e').multiplyScalar(trans) }, uSun: { value: new THREE.Color(KEY.color).multiplyScalar(KEY.intensity) }, uSunDir: { value: KEY.dir } };
  const through = sh => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uTrans, uSun, uSunDir;')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
  float vein = 1.0 - texture2D(map, vMapUv).r;
  reflectedLight.directDiffuse += uTrans * uSun * smoothstep(-0.1, 1.0, dot(-normal, normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz))) * (0.7 + 1.2 * vein);`);
  };
  if (spot) return spotted(m, key, through);
  m.onBeforeCompile = through; m.customProgramCacheKey = () => `rose-${key}`;
  return m;
}
/** 地上散落的几片花瓣：平躺，瓣缘微微翘起。都在瓶子周围 8 厘米外（瓶底的焦散、射线都碰不到），不挡字 */
function strewn(tex) {
  const g = new THREE.Group(), mat = petalMaterial(tex, { color: '#7a0c1e', trans: 0.25, spot: true, key: 'strewn' });
  for (const [x, z, yaw, len, s] of [[0.12, -0.07, 2.2, 0.036, 3], [-0.15, -0.12, 0.4, 0.04, 5], [0.24, 0.05, -1.1, 0.032, 7], [-0.05, -0.2, 1.3, 0.034, 9]]) {
    const m = new THREE.Mesh(petalGeometry(len, { lift: 0.08, roll: -0.35, t0: 0.6, cup: 0.25, seed: s, segs: [24, 20] }), mat);
    m.position.set(x, 0.0008, z); m.rotation.y = yaw; m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

// ── 特写：一朵玫瑰外层的一片花瓣 ──
// 放在丝绒左边外 3 米（离开所有瓶子镜头的视野和主光的阴影盒）。在花自己的坐标里设计：x 向右、y 向上、+z 朝相机；
// 整朵绕 y 转 90°，相机就朝 −x 看，主光在左后上方——逆光，花瓣透出深红，瓣缘亮成一线，露珠里一个亮点
const MACRO_AT = [-3, 0.12, 0];
const FRAME = [0.024, 0.018, 0.012];

/**
 * 玫瑰：十几片花瓣按 137.5° 螺旋绕着花心，里层小而竖、抱成一团，外层大而开；最外朝相机的一片（主瓣）瓣缘外翻卷下，瓣尖挂露珠。
 * 后面一小块丝绒（远在焦外，只是暗红的底）。返回 root、frame（取景盒，压成露珠所在深度的一个平面）、dir(yaw, pitch)、drop(R, tau)（同 whitetea）
 */
function macroRose(hz) {
  const root = new THREE.Group(), tex = petalTexture();
  const front = petalMaterial(tex, { color: '#6e0818', trans: 0.5, key: 'macro' }), inner = petalMaterial(tex, { color: '#4a0610', trans: 0.45, key: 'macro' });
  const head = new THREE.Group(); head.position.set(-0.004, -0.004, -0.03); head.rotation.x = 0.55; root.add(head);   // 花心朝上偏向相机
  const N = 15;
  for (let k = 0; k < N; k++) {
    const r = j => rand(421, k * 4 + j), f = k / (N - 1), az = k * 2.39996 + 0.9;
    if (f > 0.75 && Math.cos(az - Math.PI / 2) > 0.6) continue;            // 外层正对相机的位置留给主瓣
    const geo = petalGeometry(lerp(0.016, 0.04, f), { spread: lerp(0.9, 0.62, f), cup: lerp(1.6, 0.4, f), lift: lerp(1.45, 0.9, f), roll: lerp(0.2, 1.0, f), seed: 11 + k, segs: [28, 24] });
    const m = new THREE.Mesh(geo, inner);
    m.position.set(Math.cos(az) * 0.002 * f, lerp(0.004, 0, f), -Math.sin(az) * 0.002 * f);
    m.rotation.set(0, az, lerp(-0.1, 0.1, r(0)), 'YZX'); head.add(m);
  }
  const petalGeo = petalGeometry(0.044, { spread: 0.66, cup: 0.35, lift: 0.95, roll: 1.55, t0: 0.66, ruffle: 0.05, seed: 7, segs: [96, 80] });
  const petal = new THREE.Mesh(petalGeo, front);
  petal.rotation.set(0, -Math.PI / 2 + 0.3, 0, 'YZX'); head.add(petal);    // 朝相机、偏右一点
  // 后面：露珠后 30 厘米一片暗红的光，从主光那一侧（左上）漫过来，远在焦外
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), glowCard()); glow.position.set(-0.07, 0.02, -0.3); root.add(glow);
  const dew = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), dewMaterial(hz, { below: '#3a0610', above: '#c42038' }));
  root.add(dew);
  root.updateMatrixWorld(true);
  const tip = petalGeo.userData.tip.clone().applyMatrix4(petal.matrixWorld);   // 瓣尖（花的坐标；root 还在原点）
  const drop = (R, tau = -1) => {
    if (tau > 0) { const sy = stretch(tau), w = R * Math.sqrt(1.4 / sy); dew.scale.set(w, sy * R, w); dew.position.set(tip.x, tip.y - 1.2 * R - fallen(tau), tip.z); }
    else { const sy = 1.2 + 0.2 * ss(-0.3, 0, tau); dew.scale.set(R, sy * R, R); dew.position.set(tip.x, tip.y + 0.2 * R - sy * R, tip.z); }   // 顶端在瓣尖上方 0.2R：瓣尖扎进水珠一点
    dew.updateMatrix();
  };
  drop(0.003);
  // 取景盒：瓣尖周围竖着的一块（宽 FRAME[0]、瓣尖以上 FRAME[1]、以下 FRAME[2]），压成露珠所在的一个平面
  const frame = new THREE.Box3(new THREE.Vector3(tip.x - FRAME[0] / 2, tip.y - FRAME[2], tip.z), new THREE.Vector3(tip.x + FRAME[0] / 2, tip.y + FRAME[1], tip.z));
  root.position.set(...MACRO_AT); root.rotation.y = Math.PI / 2; root.updateMatrixWorld(true);
  frame.applyMatrix4(root.matrixWorld);
  const dir = (yaw, pitch) => { const Y = yaw * Math.PI / 180, P = pitch * Math.PI / 180; return new THREE.Vector3(Math.sin(Y) * Math.cos(P), Math.sin(P), Math.cos(Y) * Math.cos(P)).applyQuaternion(root.quaternion).toArray(); };
  return { root, frame, dir, drop };
}
/** 特写后面那片光：中心亮、往外平滑地暗下去的圆（不受光照，只是一块发光的底） */
function glowCard(W = 64) {
  const px = new Uint8Array(W * W * 4);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    const r = 2 * Math.hypot((i + 0.5) / W - 0.5, (j + 0.5) / W - 0.5), p = 4 * (j * W + i);
    px[p] = px[p + 1] = px[p + 2] = Math.round(255 * (1 - ss(0, 1, r)) ** 2); px[p + 3] = 255;
  }
  const map = new THREE.DataTexture(px, W, W); map.magFilter = THREE.LinearFilter; map.needsUpdate = true;
  return new THREE.MeshBasicMaterial({ color: '#6a0c18', map, depthWrite: true });
}

export async function build(ctx) {
  const { scene } = ctx, hz = haze(SKY);
  scene.background = new THREE.Color('#060203');
  const drape = new THREE.Mesh(drapeGeometry(), velvetMaterial());
  drape.receiveShadow = true; drape.frustumCulled = false;
  const tex = petalTexture();
  scene.add(drape, strewn(tex));

  const key = new THREE.DirectionalLight(KEY.color, KEY.intensity);
  key.position.copy(KEY.dir).multiplyScalar(1.5); key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -0.5, right: 0.5, top: 0.5, bottom: -0.5, near: 0.1, far: 3 });
  key.shadow.camera.updateProjectionMatrix(); key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 1.5;   // 硬光：阴影边缘利
  scene.add(key, key.target);

  // 飘落的花瓣：瓶子后面、幕前面，慢慢往右下飘，翻转着穿过光圈
  const fall = petalGeometry(0.032, { lift: 0.4, roll: 0.5, cup: 0.5, seed: 21, segs: [16, 12] }); fall.translate(-0.016, 0, 0);
  const petals = driftField({ geometry: fall, material: petalMaterial(tex, { color: '#8c1024', trans: 0.5, spot: true, key: 'falling' }),
    count: 14, seed: 404, box: [-0.9, -0.02, -0.75, 0.9, 0.7, -0.2], vel: [0.03, -0.05, 0.01], sway: 0.05, swayHz: 0.2, size: [0.8, 1.2], spin: 0.35 });
  scene.add(petals.mesh);

  const rose = macroRose(hz); scene.add(rose.root);

  return {
    haze: hz,
    env: {
      base: '#0b0406',
      fill(add, B) {
        add(3, 3, KEY.dir.clone().multiplyScalar(12).toArray(), B(KEY.color, 3));   // 主光在玻璃、瓶盖上的倒影
        add(18, 5, [0, 1, -12], B('#3a0c14', 0.8));                                   // 身后的暗红幕
        add(24, 24, [0, -8, 0], B('#2a080e', 0.6));                                   // 地上的丝绒
      },
    },
    post: { exposure: 1.05, aperture: 0.3, bloom: { strength: 0.35, threshold: 0.8 }, saturation: 1.2, lift: [0.008, 0.002, 0.004], vignette: 0.32, grain: 0.03 },
    macro: {
      root: rose.root,
      camera: s => ({ type: 'fit', box: rose.frame, dir: rose.dir(lerp(-10, 6, easeInOut(s.u)), lerp(0, 7, easeInOut(s.u))), fov: 28, scale: lerp(1, 1.12, easeInOut(s.u)) }),
      post: { aperture: 2.5, maxBlur: 0.035, exposure: 1.1, gamma: [0.92, 0.96, 0.96], saturation: 1.3 },
    },
    update(ctx, s) {
      petals.update(s.t);
      const rel = s.dur - DROP.pre;                                       // 特写最后 DROP.pre 秒露珠松开：硬切到 drop，瓶里的水滴接着落
      if (s.name === 'macro') rose.drop(lerp(0.0016, 0.003, ss(0, rel - 0.3, s.lt)), s.lt - rel);
    },
    reset() { rose.drop(0.003); },
  };
}
```

Notes:
- Nothing calls `Math.random`.
  - Folds, petals and the spiral all come from `rand(seed, i)`.
  - The velvet's patches are noise of world position.
  - The drift is closed-form.
- The velvet is a `MeshPhysicalMaterial`, which is a `MeshStandardMaterial`, with no `map`, `roughnessMap` or `metalnessMap`. That satisfies the caustic's ground rule.
- The pool shader writes the world position into its own varying, `vRoseW`, and applies `instanceMatrix` itself, so the drifting petals (instanced) get the pool too. The program cache keys are `rose-velvet`, `rose-strewn`, `rose-falling` and `rose-macro`.

Run: `node --test 03-perfume/test/worlds.test.mjs`
Expected: PASS (25 tests).

- [ ] **Step 4: The rose score**

Make these exact replacements in `03-perfume/js/score.js`:

1. Replace:

```js
// 玫瑰在 Task 19 写自己的编曲；在那之前先用白茶的
export const SCORES = { whitetea, osmanthus, seasalt, rose: whitetea };
```

   with:

```js
// 玫瑰：C 多利亚（C D E♭ F G A B♭），大提琴般的低音铺底、八分音符的低音脉动（心跳）、往上走的竖琴分解，暗的丝绒夜
const RS = { harp: { t60: 3, bright: 0.5 }, bass: { t60: 0.6, bright: 0.15 }, low: { t60: 3.5, bright: 0.2 },
  cello: { a: 1.6, r: 1.2, cut: 2, air: 0.1 }, bow: { a: 0.2, r: 0.4, breath: 0.12 } };   // bow：压低、气声少的笛子拉长音，带颤音，像大提琴
const rose = {
  tonic: 60,                                               // C4
  reverb: { decay: 3.6, music: 0.45, sfx: 0.25 },
  bed: { type: 'bandpass', f: 420, q: 0.5, a: 0.6, r: 1.4, wander: 0.5, v: 0.35 },  // 夜里花园低低的风声，比白茶的雾暗、低
  m15: () => [
    // 0–2.25 微距：Cm 的铺底（C3 G3 E♭4）从暗里慢慢升起，竖琴一个音一个音往上走 C4 E♭4 G4 B♭4 D5，像露珠一点点长大
    ...seq('pad', 0, [[0, 48, 3.6, 0.85], [0, 55, 3.6, 0.6], [0, 63, 3.6, 0.3]], { ...RS.cello, a: 1.8 }),
    ...seq('pluck', 0, [[0.5, 60, 3, 0.28], [1, 63, 3, 0.28], [1.5, 67, 3, 0.3], [2, 70, 2.5, 0.28], [2.5, 74, 2, 0.26]], RS.harp),
    // 2.25–3 落下：一口暗的气流升起来，竖琴十六分音符往上扫 G3 C4 E♭4 G4，扫进 3.0 的命中
    { t: 2.25, voice: 'noise', f: 320, d: 0.75, v: 0.45, bus: 'music', p: { type: 'bandpass', q: 1.2, sweep: 5, a: 0.7, r: 0.05 } },
    ...seq('pluck', 2.25, [[0, 55, 1.5, 0.3], [0.25, 60, 1.5, 0.32], [0.5, 63, 1.5, 0.35], [0.75, 67, 1.5, 0.38]], RS.harp),
    // 3.0 命中：低音 C2、钟声 C5，铺底涨满；低音从这里起八分音符的脉动
    ...seq('pluck', 3, [[0, 36, 4, 0.55], [0, 48, 3, 0.3]], RS.low),
    ...seq('bell', 3, [[0, 72, 3.2, 0.5], [1.5, 79, 1.6, 0.18]], { bright: 0.4 }),
    ...seq('pad', 3, [[0, 48, 1.6, 0.95], [0, 55, 1.6, 0.7], [0, 63, 1.6, 0.4]], { ...RS.cello, a: 0.2 }),
    ...seq('pluck', 3, [[0.5, 36, 0.5, 0.4], [1, 36, 0.5, 0.35], [1.5, 43, 0.5, 0.38]], RS.bass),
    // 4.5 正面："大提琴"拉 C4 → D4 → E♭4，竖琴轻轻往上分解，脉动继续
    ...seq('flute', 4.5, [[0, 60, 0.9, 0.8], [1, 62, 0.45, 0.7], [1.5, 63, 0.45, 0.75]], RS.bow),
    ...seq('pad', 4.5, [[0, 48, 1.6, 0.8], [0, 55, 1.6, 0.55], [0, 63, 1.6, 0.3]], RS.cello),
    ...seq('pluck', 4.5, [[0.5, 67, 2, 0.22], [1, 70, 2, 0.2], [1.5, 74, 2, 0.2]], RS.harp),
    ...seq('pluck', 4.5, [[0, 36, 0.5, 0.4], [0.5, 36, 0.5, 0.35], [1, 43, 0.5, 0.38], [1.5, 39, 0.5, 0.36]], RS.bass),
    // 6.0 命中：和声走到 F（多利亚的大四级，暗里透出一点亮），钟声 G5 闪一下；"大提琴"升到 G4、A4 再落回 F4；
    // 竖琴十六分音符往上扫 F3 A3 C4 F4 A4 C5
    ...seq('pluck', 6, [[0, 41, 3, 0.5], [0, 53, 3, 0.28]], RS.low),
    ...seq('bell', 6, [[0, 79, 1.6, 0.35], [0.25, 84, 1.2, 0.18]], { bright: 0.45 }),
    ...seq('flute', 6, [[0, 67, 0.9, 0.85], [1, 69, 0.45, 0.65], [1.5, 65, 0.9, 0.6]], RS.bow),
    ...seq('pad', 6, [[0, 41, 1.7, 0.7], [0, 53, 1.7, 0.55], [0, 57, 1.7, 0.4], [0, 60, 1.7, 0.3]], { ...RS.cello, a: 0.3 }),
    ...seq('pluck', 6, [[0.25, 53, 2, 0.24], [0.5, 57, 2, 0.24], [0.75, 60, 2, 0.25], [1, 65, 2, 0.25], [1.25, 69, 2, 0.23], [1.5, 72, 2, 0.22]], RS.harp),
    ...seq('pluck', 6, [[0.5, 41, 0.5, 0.35], [1, 41, 0.5, 0.32], [1.5, 48, 0.5, 0.34]], RS.bass),
    // 7.5–10.5 分解：配音在这里讲香调——没有旋律，只留暗的铺底（Cm，9.0 换到 B♭）和低音轻轻的八分音符脉动
    ...seq('pad', 7.5, [[0, 48, 2, 0.6], [0, 55, 2, 0.42], [0, 63, 2, 0.24]], RS.cello),
    ...seq('pad', 9, [[0, 46, 2, 0.55], [0, 53, 2, 0.4], [0, 62, 2, 0.22]], { ...RS.cello, a: 0.8 }),
    ...seq('pluck', 7.5, [[0, 36, 0.5, 0.3], [0.5, 36, 0.5, 0.2], [1, 43, 0.5, 0.24], [1.5, 36, 0.5, 0.2],
      [2, 34, 0.5, 0.28], [2.5, 34, 0.5, 0.2], [3, 41, 0.5, 0.24], [3.5, 34, 0.5, 0.2]], RS.bass),
    // 10.5–12 喷雾：脉动停下，铺底停在 G 挂四（G D C F，品牌动机的三个音都在里面），竖琴轻轻往上分解一次
    ...seq('pad', 10.5, [[0, 43, 1.6, 0.5], [0, 50, 1.6, 0.4], [0, 60, 1.6, 0.28], [0, 65, 1.6, 0.22]], { ...RS.cello, a: 0.5 }),
    ...seq('pluck', 10.5, [[0.5, 55, 2, 0.2], [0.75, 60, 2, 0.2], [1, 62, 2, 0.22], [1.25, 65, 2, 0.2], [1.5, 67, 2, 0.18]], RS.harp),
    // 12.0 片尾：品牌动机（共用）落在 Cm7 的铺底上，低音 C2 收住
    ...seq('pad', 12, [[0, 48, 3, 0.8], [0, 55, 3, 0.6], [0, 63, 3, 0.35], [0, 70, 3, 0.25]], { ...RS.cello, a: 0.4, r: 0.8 }),
    ...seq('pluck', 12, [[0, 36, 4, 0.5], [0, 48, 4, 0.28]], RS.low),
  ],
  m6: () => [
    // 0 命中：水滴落下就开始：低音 C2、钟声 G5、Cm 的铺底；脉动立刻起来，比 15 秒版急（高低八度交替）
    ...seq('pluck', 0, [[0, 36, 3, 0.42], [0, 48, 2, 0.25]], RS.low),
    ...seq('bell', 0, [[0, 79, 2.4, 0.45]], { bright: 0.4 }),
    ...seq('pad', 0, [[0, 48, 1.8, 0.95], [0, 55, 1.8, 0.75], [0, 63, 1.8, 0.45]], { ...RS.cello, a: 0.25 }),
    ...seq('pluck', 0, [[0.5, 48, 0.4, 0.3], [1, 36, 0.4, 0.35], [1.5, 48, 0.4, 0.3], [2, 41, 0.4, 0.35], [2.5, 53, 0.4, 0.3], [3, 41, 0.4, 0.35], [3.5, 53, 0.4, 0.3]], RS.bass),
    // 0.375–1.125 竖琴往上分解 C4 E♭4 G4 B♭4 D5
    ...seq('pluck', 0, [[0.5, 60, 2, 0.3], [0.75, 63, 2, 0.3], [1, 67, 2, 0.32], [1.25, 70, 2, 0.3], [1.5, 74, 2, 0.28]], RS.harp),
    // 1.5 正面：和声到 F，"大提琴" E♭4 F4，2.25 光带峰值升到 G4，再到 A4
    ...seq('flute', 1.5, [[0, 63, 0.45, 0.75], [0.5, 65, 0.45, 0.75], [1, 67, 0.45, 0.9], [1.5, 69, 0.5, 0.7]], RS.bow),
    ...seq('bell', 2.25, [[0, 84, 1.4, 0.28]], { bright: 0.45 }),
    ...seq('pad', 1.5, [[0, 41, 1.8, 0.7], [0, 53, 1.8, 0.6], [0, 57, 1.8, 0.45], [0, 60, 1.8, 0.35]], { ...RS.cello, a: 0.3 }),
    ...seq('pluck', 1.5, [[0, 41, 2, 0.45]], RS.low),
    // 3.0 片尾：品牌动机（共用）落在 Cm 三和弦上（动机的 D 给它添上九音），低音 C2 收住
    ...seq('pad', 3, [[0, 48, 3, 0.8], [0, 55, 3, 0.6], [0, 63, 3, 0.35]], { ...RS.cello, a: 0.4, r: 0.8 }),
    ...seq('pluck', 3, [[0, 36, 4, 0.42], [0, 48, 4, 0.25]], RS.low),
  ],
};

// 每个香型一套编曲，skus.js 的 score 字段按名字取
export const SCORES = { whitetea, osmanthus, seasalt, rose };
```

Notes:
- **Levels.** Simultaneous low plucks stay at or below 0.55, and bells between 0.18 and 0.5. The score alone (`vo: 'off'`) peaks at 0.25 (15 s) and 0.28 (6 s). After the loudness gain, the limiter works:
  - at most 4.5 dB in the 15 s cut;
  - 5.1 dB for 60 ms under the 6 s cut's first logo note, which is the shared logo itself.
- **The 6 s cut ends on a plain C minor triad, not the 15 s cut's Cm7.** In earlier drafts (Cm7, brighter bells, more reverb on the sfx bus), ffmpeg's AAC encoder overshot by 2–3.5 dB at the logo's last pluck (3.75 s). The burst sat at 6–7 kHz, mostly in the left channel. The encoded film measured between −0.1 and +0.8 dBTP, from a WAV at −2.15 dBTP. `encodeAudio` would catch that with more passes, but only by limiting the whole cut 2–3.5 dB harder.
  - The triad, darker bells, sfx reverb at 0.25 and a lighter opening together bring it to −1.8 on the first pass.
  - A 1 dB quieter input, or a 100 ms shift, also makes the overshoot disappear. It comes from the encoder, not the mix.
- **The 15 s score alone needs a second encode.** With the limit at −3 dBFS, the AAC file peaks at −0.9 dBTP at 10.9 s, where the spray hiss starts, 1.8 dB above the WAV. `encodeAudio` limits again at −3.9 dBFS and lands at −2.0.
  - The hiss is Task 15's shared band-pass noise. In 海盐's score alone it is the second-highest peak after encoding.
  - With the voice-over the mix is louder and its gain is lower, so both cuts pass first time: −1.7 dBTP (15 s) and −2.0 (6 s).
- **Seeds are list positions.** Adding or removing a note re-seeds every note after it. After any change to the arrangement, re-run the render below and check both sidecars.

Run: `node --test 03-perfume/test/score.test.mjs`
Expected: PASS (8 tests).

With `npm run serve` running, open `http://127.0.0.1:8765/03-perfume/?paused&sku=rose&vo=off` in Chrome. Tick 声音, then press Space. `vo=off` plays the score on its own.

Expected:
- Sound starts about 1 s after ticking, while the 15 s mix renders.
- **0–2.25 s:** a dark C minor pad (C, G, E♭) swells slowly out of silence. A harp climbs one note at a time, C–E♭–G–B♭–D. Under everything is a low, soft wind.
- **2.25 s:** a dark breath of air rises, and the harp sweeps up four sixteenth notes, G–C–E♭–G, into the hit.
- **3.0 s:**
  - the drop lands with the plink and its three ripples;
  - a deep C pluck and a C bell sound, and the pad swells;
  - a pulse of short, dark bass notes starts on the eighth notes, like a heartbeat.
- **4.5 s:** after the whoosh, the cello-like line plays C–D–E♭ over the pulse, with a few high harp notes above it.
- **6.0 s:** at the light streak:
  - the harmony opens to F major, the dorian's bright fourth, and a G bell flashes;
  - the line climbs to G and A, then falls to F;
  - the harp sweeps up F–A–C–F–A–C.
- **7.5–10.5 s:** no melody. A quiet pad (C minor, then B♭ from 9.0) and the soft bass pulse leave room for Task 16's voice-over. It is about 8 dB quieter than the hero.
- **10.5–12 s:**
  - the pulse stops and the pad holds a G suspended chord (G, D, C, F);
  - one soft harp arpeggio rises;
  - the glass clink, the spray hiss and the seat click come as in Task 15.
- **12.0 s:** the logo: D, G, then a long C, each pluck with a bell above. It sits over a C minor 7 pad and a low C pluck, and fades over the last 0.3 s.
- **The 6 s cut** has its own arrangement:
  - it opens on the landing with the low C and a G bell. The bass pulse runs at once, jumping between octaves;
  - the harp climbs C–E♭–G–B♭–D;
  - at 1.5 s the harmony moves to F and the line plays E♭–F, reaching G on the 2.25 s streak with a high bell, then A;
  - the logo comes at 3 s over the C minor triad.
- **With the voice-over:** reload without `&vo=off`. Task 16's voice reads 「一瓣玫瑰，一夜丝绒。」 at 4.6 s, 「黑加仑、玫瑰、广藿香。」 at 7.7 s over the quiet pad and pulse, and 「闻境玫瑰，闻香入境。」 at 12.3 s over the logo. The music dips under each line. The 6 s cut has 「闻境玫瑰，一瓣玫瑰，一夜丝绒。」 at 1.1 s.

Run: `node factory/render.mjs 03-perfume --sku rose --cut 15,6 --ar 9x16 --out /tmp/t19/render --force`
Expected: `done 2, skipped 0, failed 0`. The renders are narrated. `wenjing_rose_15s_9x16_zh.json` has `"lufs": -14, "tp": -1.7` and `wenjing_rose_6s_9x16_zh.json` has `"lufs": -14.1, "tp": -2`.

- [ ] **Step 5: Look at it**

```bash
node factory/snap.mjs 03-perfume --sku rose --t 1.0,1.9,2.2,2.3,2.7,3.2,3.9,6.4,9.3,10.7,11.0,11.4,13.5 --ar 9x16 --out /tmp/t19
node factory/snap.mjs 03-perfume --sku rose --t 1.0,1.9,2.2,2.3,2.7,3.2,3.9,6.4,9.3,10.7,11.0,11.4,13.5 --ar 1x1 --out /tmp/t19
node factory/snap.mjs 03-perfume --sku rose --t 1.0,1.9,2.2,2.3,2.7,3.2,3.9,6.4,9.3,10.7,11.0,11.4,13.5 --ar 16x9 --out /tmp/t19
node factory/snap.mjs 03-perfume --sku rose --lang en --t 1.0,9.3,13.5 --ar 16x9 --out /tmp/t19/en
```

Expected timings: 127–153 ms per 9x16 frame, 74–88 ms at 1x1 and 123–157 ms at 16x9. The first frame of a run also compiles the shaders; the macro takes about 170 ms at 9x16.
- **t = 1.0 (macro):**
  - a deep-crimson rose fills the top of the frame, lit from behind. The main petal's rolled-back edge faces the camera, with its veins showing through;
  - the dew hangs from its tip with a small bright sparkle;
  - behind is a dark-red glow that falls away to near black at the bottom;
  - 一瓣玫瑰，一夜丝绒 reads clearly below the drop;
  - at 16:9 the rose is on the right and the hook on the left.
- **t = 1.9 (macro):** the dew is full-size and a little elongated.
- **t = 2.2 (macro):** the dew has let go and hangs just below the tip.
- **t = 2.3 and 2.7 (drop):**
  - inside the bottle, the drop is a glossy ruby bead in the upper part of the frame, with the deep-red liquid surface below it;
  - the dip tube is a soft pale column on the right;
  - at 16:9 the chamfered corner refracts a thin spectral streak. That is physical.
- **t = 3.2 (drop):** rings spread on the red surface where the drop landed.
- **t = 3.9 (drop):** the frame has opened to the whole bottle standing in its pool of light on the velvet. Its sharp shadow falls to the right, with petals on the floor either side.
- **t = 6.4 (hero):**
  - behind the bottle the velvet rises into a curtain of dark folds, and petals drift down through the light;
  - 玫瑰 and 闻境 · WENJING sit below the bottle (on the left at 16:9), cream on dark red.
- **t = 9.3 (anatomy):** the leaders 前调 黑加仑 / 中调 玫瑰 / 后调 广藿香 and 50 ml · 浓香水 are legible over the dark red.
- **t = 10.7 (spray):** the cap is rising off the pump.
- **t = 11.0 (spray):** glints leave the nozzle to the left.
- **t = 11.4 (spray):** a soft pink cloud hangs a few centimetres left of the nozzle.
- **t = 13.5 (end):** 闻境 WENJING, 闻香 · 入境 and the gold 点击购买 button, with the bottle above.
- **English (`/tmp/t19/en`):** "One petal, deep as velvet" sits left of the rose. The notes read Blackcurrant / Rose / Patchouli, and the end shows Shop now.
- **No frame** shows the rose outside the macro, the edge of the velvet sheet, or the floor bright right to the frame edges: outside the pool it stays dark.

- [ ] **Step 6: Re-run the pre-flight**

Run: `node factory/check.mjs 03-perfume --sku rose; echo "exit $?"`
Expected: every line `ok`, including:
- `determinism  14 frames identical forward and backward`;
- `voice-over  3 lines in 1 variants: every clip present, current, inside its slot`;
- `audio  6 s identical twice, peak -9.3 dBFS … · 15 s identical twice, peak -8.1 dBFS …`. The mixes have the voice-over, so the peaks are the voice's. The score alone peaks at −11.0 dBFS (6 s) and −12.1 dBFS (15 s);
- `speed  ~114 ms/frame at 1080×1920 …`.

Then `all checks passed` and `exit 0`.

- [ ] **Step 7: Run all tests and commit**

Run: `npm test`
Expected: PASS, 144 tests.

```bash
git add 03-perfume/js/worlds/rose.js 03-perfume/film.js 03-perfume/js/score.js
git commit -m "Add the rose world: dark-red velvet under one hard light, the petal-dew macro, and the rose score in C dorian

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 20: The review — English, the promos and the 6 s cut in all four worlds, and boxed captions that respect their zone

This task reviews what the earlier tasks have not looked at closely:
- the English copy;
- the 11.11 and launch end cards;
- the 6 s cut;

in every world and every aspect ratio. It is two passes over the whole grid:
- **the pre-flight on all 144 variants**, which checks every caption's fit with the real fonts and every voice-over clip;
- **28 contact sheets.** For each scent there is the whole 15 s film, three end cards (none, 11.11, launch) and three 6 s cuts, each in the three ratios × two languages.

The review found one defect, which this task fixes in `factory/engine/text.js`.

**The defect: a boxed caption ignores its padding.** The ribbon and the buttons (`box` in `promos.js`, Task 7) are text on a filled rounded box that extends `box.pad × size` beyond the text on each side.
- `layout()` fits only the text to the zone's width. The padding is added when the box is drawn, so a box can be wider than its zone.
  - The English 11.11 ribbon at 9:16 is the only one where that happens. "11.11 Global Shopping Festival" fills its zone, and the box runs from x = 99 to 872 px in a zone from 108 to 864 px.
  - `check.mjs` and `text-fit.test.mjs` cannot see this, because the text itself fits.
- Left- or right-aligned, the text sits on the zone's edge and the box sticks out by the padding.
  - That happens on every 16:9 end card, whose text column is on the left. The ribbon's and the button's boxes start 20 px left of 闻境, WENJING, the price and the gift line.

**The fix.** For a boxed layer, `layout()` fits the text plus a padding on each side into the zone's width.
- `layout()` also returns that padding as `pad`, in pixels, and 0 without a box.
- `drawLayer()` insets left- and right-aligned text by `pad`, so the box's outer edge sits on the zone's edge. Centred layers don't change.
- Only the English 11.11 ribbon gets smaller:
  - at 9:16 the conservative width model now fits it at 38.5 px instead of 40.1 px, above the 37.8 px minimum;
  - at 1:1 and 16:9 it goes from 45.4 to 43.5 px.
  - Every other ribbon and button already had room and keeps its size.
- Vertically nothing changes. The box reaches `0.4 × pad` above and below the lines, into the gap between zones, as before.

**Files:**
- Modify: `factory/engine/text.js`
- Test: `factory/test/text.test.mjs`

**Interfaces:**
- Consumes:
  - Task 5: `layout`, `drawLayer`, `approxMeasure`; a layer's `box = { fill, color, pad = 0.35, radius }`, with `pad` and `radius` in units of the font size.
  - Task 7: the pills in `promos.js` (`pad` 0.55; the 11.11 ribbon 0.45) and the end zones in `layouts.js`.
  - Task 9: `sheet.mjs` and `--safe`. Task 10: `check.mjs --all`.
- Produces:
  - `layout(measure, o)` returns `{ size, font, tracking, pad, lines, width, height, overflow }`.
    - `pad` = `(o.box.pad ?? 0.35) × size` for a boxed layer, and 0 otherwise.
    - A boxed layer fits when `width + 2 × pad` ≤ the zone's width.
  - `drawLayer`: with `align` `left` or `right`, a boxed layer's box edge is the zone's edge and its text is `pad` inside it. Centred layers are unchanged.

- [ ] **Step 1: The pre-flight on the whole grid**

Run: `node factory/check.mjs 03-perfume --all; echo "exit $?"`
Expected, after about 1 minute:
```
ok    gpu          ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)
ok    fonts        600 Noto Serif SC, 500 Noto Serif SC, 600 Cormorant Garamond, 700 Noto Sans SC  (1943 ms to first frame)
ok    determinism  14 frames identical forward and backward
ok    voice-over   288 lines in 144 variants: every clip present, current, inside its slot
ok    audio        6 s identical twice, peak -9.5 dBFS, 297 ms · 15 s identical twice, peak -8.5 dBFS, 1043 ms
ok    overflow     144 variants, no caption overflows  (25.7 s)
ok    speed        117 ms/frame at 1080×1920 (draw + PNG, before encoding) → manifest 45360 frames ≈ 88.6 min on one worker
all checks passed
exit 0
```
- The times in brackets and the speed vary by a few percent from run to run.
- The grid is 4 scents × 3 ratios × 2 languages × 2 cuts × 3 promos = 144 variants with the voice-over on.
  - The 72 at 15 s have three lines each and the 72 at 6 s have one: 288 lines.
  - `vo: 'off'` changes only the sound, so `--all` leaves it out.
- **The overflow line** lays out every caption of every shot with the real fonts. The English copy fits everywhere, including "11.11 Global Shopping Festival" and "Blackcurrant" in the narrow 9:16 zones.

- [ ] **Step 2: The contact sheets**

```bash
for s in whitetea osmanthus seasalt rose; do
  node factory/sheet.mjs 03-perfume --sku $s --out 03-perfume/out/sheet/15
  for p in none 1111 launch; do
    node factory/sheet.mjs 03-perfume --sku $s --promo $p --t 12.8,13.5,14.5 --safe --out 03-perfume/out/sheet/end
    node factory/sheet.mjs 03-perfume --sku $s --cut 6 --promo $p --t 0.6,2.2,3.8,4.5,5.5 --safe --out 03-perfume/out/sheet/6
  done
done
```
Expected: 28 sheets, about 3 s each, every run with exit code 0 and no `OVERFLOW:` line.
- Each sheet has six rows, one per ratio × language:
  - `15/sheet_<sku>_15_none_on_9x16-1x1-16x9_zh-en.png`: 3046 × 2286, the six shots at their 60% points;
  - `end/sheet_<sku>_15_<promo>_on_….png`: 1576 × 2286;
  - `6/sheet_<sku>_6_<promo>_on_….png`: 2556 × 2286.
- `--safe` draws the zones (yellow) and the platform areas (red, 9:16 only).
- **The end card times:**
  - at 12.8 s the price or gift line is still fading in, which is why it looks grey;
  - at 13.5 s everything is in;
  - at 14.5 s is the last frame before the fade-out.
- **The 6 s times:** 0.6 s is inside the bottle as the drop lands, 2.2 s is the hero, and 3.8 / 4.5 / 5.5 s are the end card.

Look at the sheets with the zones on, and check these:

**The English copy (the `15/` sheets):**
- The hook, the name, the three notes, 50 ml · Eau de Parfum, and Breathe in. Step in. with Shop now are all in their zones, in all four worlds.
- The notes are one tier and one ingredient per zone, e.g. 桂花's TOP / Apricot. Nothing wraps into a third line.

**The end cards (`end/`):**
- **11.11:**
  - a red ribbon 双11 狂欢价 / "11.11 Global Shopping Festival";
  - the price, which pops in: 到手价 ¥499 / "Now $69" (white tea);
  - the old price, struck through: 日常价 ¥699 / "Was $95".
- **launch:**
  - a pill in the scent's accent colour: 新品首发 / "New Arrival";
  - the gift line: 首发赠 2 ml 随行装 / "Free 2 ml travel spray";
  - the CTA button.
- **none:** 闻香 · 入境 / "Breathe in. Step in." and the button.
- Every price matches `skus.js`:
  - white tea ¥499 / ¥699, $69 / $95;
  - 桂花 ¥499 / ¥699, $69 / $95;
  - 海盐 ¥469 / ¥659, $65 / $89;
  - 玫瑰 ¥589 / ¥799, $79 / $109.
- At 9:16 the whole block is left of the red icon column and above the bottom band.
- **Legibility:**
  - The red ribbon reads on all four worlds, including 玫瑰's dark red, where it is the brightest red in the frame.
  - The smallest text, the struck-through old price, is set at 0.038 of the short side, 41 px: legible on a phone.
- The 1:1 card is the most crowded: the ribbon's box almost touches WENJING above it and the price below it. That is the zones' design and is left as it is.

**The 6 s cut (`6/`):**
- **0.6 s:** the drop in the liquid.
- **2.2 s:** the hero. The name is still fading in (fully in at 2.4 s) and the subline has only just started (fully in at 2.7 s).
- **3.8–5.5 s:** the same end cards as the 15 s cut.

**What the review finds:**
1. **The defect this task fixes.** In every 16:9 end card, the red ribbon and the button stick out about 20 px left of the text column (闻境, the price, the gift line), while every other line starts exactly on it.
   - With `--safe`, you can see that the column is the zone's left edge and the boxes start before it.
   - At 9:16 the English 11.11 ribbon's box is a few pixels wider than its yellow zone on both sides.
2. **Known from Task 17.** On 桂花's 9:16 and 1:1 end cards, the caustic's rainbow streak crosses the lower left of the text block. The price stays legible over it.
3. **海盐 at 16:9.** At 12.8 s the lower text sits over the bright wet sand. The dark navy text stays readable.

- [ ] **Step 3: Write the failing test**

The test lays out a boxed layer in a zone its text alone would fill. It then draws that layer left-, right- and centre-aligned on a recording canvas, and reads back where the box and the text were drawn.

Make these exact replacements in `factory/test/text.test.mjs`:

1. Replace:

```js
import { NO_START, NO_END, fontStr, tokenize, wrap, layout, approxMeasure as M, prepareLayer } from '../engine/text.js';
```

   with:

```js
import { NO_START, NO_END, fontStr, tokenize, wrap, layout, approxMeasure as M, prepareLayer, drawLayer } from '../engine/text.js';
```

2. Replace:

```js
const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≠ ${b}`);
```

   with:

```js
const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≠ ${b}`);
// 记录绘制调用的假画布：方法调用记进 calls，属性照常存取
const rec = () => { const calls = []; return { calls, ctx: new Proxy({}, { get: (o, k) => (k in o ? o[k] : (...a) => calls.push([k, ...a])), set: (o, k, v) => ((o[k] = v), true) }) }; };
```

3. Replace:

```js
  near(r.size, 37.8);
});
```

   with:

```js
  near(r.size, 37.8);
});

test('a boxed layer fits its text and padding in the zone width; left or right, the box edge sits on the zone edge', () => {
  const L = { text: 'Global Shopping Festival', lang: 'en', font: F, zone: [100, 0, 400, 80], size: 40, min: 10, maxLines: 1, box: { fill: '#e1251b', pad: 0.5 } };
  const r = layout(M, L);
  near(r.pad, 0.5 * r.size);
  assert.ok(r.width + 2 * r.pad <= 400.5 && !r.overflow, `${r.width} + 2 × ${r.pad}`);
  assert.ok(layout(M, { ...L, box: undefined }).size > r.size);               // 不带底色块时字可以更大：衬边也要占地方
  assert.equal(layout(M, { ...L, box: undefined }).pad, 0);
  for (const [align, x] of [['left', 100], ['right', 500 - r.width - 2 * r.pad], ['center', 300 - r.width / 2 - r.pad]]) {
    const { ctx, calls } = rec();
    drawLayer(ctx, { ...L, align, valign: 'middle' }, M);
    const arcs = calls.filter(c => c[0] === 'arcTo'), [, text, tx] = calls.find(c => c[0] === 'fillText');
    near(arcs[2][1], x); near(arcs[0][1], x + r.width + 2 * r.pad);           // 底色块的左、右边
    assert.equal(text, L.text); near(tx, x + r.pad, 1e-6);                        // 字在块里，两边各留 pad
  }
});
```

- [ ] **Step 4: Run it to make sure it fails**

Run: `node --test factory/test/text.test.mjs`
Expected: FAIL, 8 of 9 pass. `a boxed layer fits its text and padding in the zone width; left or right, the box edge sits on the zone edge` fails with `'undefined ≠ 14.427791579676667'`, because `layout()` returns no `pad`.

- [ ] **Step 5: Fit and place the box with its padding**

Make these exact replacements in `factory/engine/text.js`:

1. Replace:

```js
  const zw = zone[2], zh = zone[3], min = o.min ?? o.size / 2;
  for (let size = Math.max(o.size, min); ; size = Math.max(min, size * 0.96)) {
    const f = fontStr(font, size), tr = tracking * size, fits = s => measure(s, f, tr) <= zw;
    const lines = wrap(tokenize(text, lang), fits, lang);
    const width = Math.max(0, ...lines.map(l => measure(l, f, tr))), height = size * lineHeight * lines.length;
    const ok = width <= zw + 0.5 && height <= zh + 0.5 && lines.length <= maxLines;
    if (ok || size <= min + 1e-9) return { size, font: f, tracking: tr, lines, width, height, overflow: !ok };
```

   with:

```js
  const zw = zone[2], zh = zone[3], min = o.min ?? o.size / 2, padK = o.box ? (o.box.pad ?? 0.35) : 0;
  for (let size = Math.max(o.size, min); ; size = Math.max(min, size * 0.96)) {
    const f = fontStr(font, size), tr = tracking * size, pad = padK * size, room = zw - 2 * pad, fits = s => measure(s, f, tr) <= room;
    const lines = wrap(tokenize(text, lang), fits, lang);                 // 带底色块的图层：字宽 + 两边的衬边都要放进区里
    const width = Math.max(0, ...lines.map(l => measure(l, f, tr))), height = size * lineHeight * lines.length;
    const ok = width <= room + 0.5 && height <= zh + 0.5 && lines.length <= maxLines;
    if (ok || size <= min + 1e-9) return { size, font: f, tracking: tr, pad, lines, width, height, overflow: !ok };
```

2. Replace:

```js
  const xOf = w => (L.align === 'center' ? zx + (zw - w) / 2 : L.align === 'right' ? zx + zw - w : zx);
```

   with:

```js
  const pad = r.pad, xOf = w => (L.align === 'center' ? zx + (zw - w) / 2 : L.align === 'right' ? zx + zw - w - pad : zx + pad);   // 左 / 右对齐时底色块的边贴着区的边
```

3. Replace:

```js
    const pad = (L.box.pad ?? 0.35) * r.size, x = xOf(r.width) - pad;
```

   with:

```js
    const x = xOf(r.width) - pad;
```

Run: `node --test factory/test/text.test.mjs 03-perfume/test/text-fit.test.mjs`
Expected: PASS (10 tests). The text-fit test still passes, so every caption in the grid still fits at or above its minimum size with the padding counted.

- [ ] **Step 6: Look at the end cards again**

```bash
node factory/sheet.mjs 03-perfume --sku whitetea --promo 1111 --t 13.5,14.5 --scale 0.5 --out 03-perfume/out/sheet/fixed
node factory/sheet.mjs 03-perfume --sku whitetea --promo launch --t 13.5,14.5 --scale 0.5 --out 03-perfume/out/sheet/fixed
```
Expected: two 2046 × 4326 sheets.
- **16:9:** the ribbon's and the button's left edges are now on the text column, flush with 闻境, WENJING, the price and the gift line.
- **9:16 English 11.11:** the ribbon is a little smaller and its box stays inside the zone. In a snap of that frame, the red box runs from x = 115 to 856 px.
- Everything else is exactly as it was: the centred cards at 9:16 and 1:1, and every ribbon and button in Chinese.

Run: `node factory/check.mjs 03-perfume --all; echo "exit $?"`
Expected: the same lines as in Step 1, with `overflow  144 variants, no caption overflows`. Then `all checks passed` and `exit 0`.

- [ ] **Step 7: Run all tests and commit**

Run: `npm test`
Expected: PASS, 145 tests.

```bash
git add factory/engine/text.js factory/test/text.test.mjs
git commit -m "Fit a boxed caption with its padding, and put a left- or right-aligned box on its zone's edge

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 21: Documentation — the factory and film READMEs, the `new-film` skill, the showcase index; the default batch

This task writes the documentation and then renders the default batch. There are four pieces:
- `factory/README.md` documents the engine for whoever builds the next film;
- `03-perfume/README.md` documents this film;
- `.claude/skills/new-film/SKILL.md` lets Claude Code turn a storyline into a new film against the same engine;
- a new row in the showcase index.

After that, the full default manifest is rendered and reviewed in the gallery.

**The factory README is the film contract.** It covers:
- **Getting started:** setup, the directory layout, the preview page (URL parameters, keys, the three modes), and every command with its exact usage line and real output.
- **Batch data:** the manifest format, the output layout and its resume rules, and the sound chain (mix, loudness, voice-over clips and their index).
- **The contract itself:** `META`, the default export, `ctx`, edit lists and `s`, layouts and camera intents, text layers, post, score voices, voice-over lines and tests.
- **Help:** a minimal complete film, a table of common errors, and the limits.

**The contract was proven by following it.** Before this task, the README was written and then followed step by step, the way a newcomer would, on a scratch copy of the tree. That copy got a throwaway two-shot film, `99-demo`, built only from the README. The film passed `check.mjs`, `snap.mjs`, `sheet.mjs`, `vo.mjs`, `render.mjs` (including the resume rule) and the gallery.

That exercise found rules the spec's first draft of §7.2 didn't state (the amended §7.2 names the entry files and points to the README for the rest). The README now states each of them:
- **Two entry files.** `meta.js` must export `META = { id, axes, sceneAxes, cuts, fileName }`: `render.mjs` and `check.mjs` read it without Three.js. `snap.mjs`, `sheet.mjs` and `vo.mjs` load `film.js` instead. `vo.mjs` imports it in Node, so it must not touch `window` or `document` at module top level.
- **`id` must equal the directory name.** `vo.mjs` writes to `<id>/assets/vo/`, while the page fetches `assets/vo/` relative to itself.
- **A `cut` axis is mandatory**, and its values are the keys of `cuts`. Without it, the page fails with `cut: empty edit list`.
- **`layouts`, `fonts(v)`, `reset(ctx)` and `sceneAxes` are all required**, even when empty (`{}`, `[]`, `[]`).
- **Fonts must be declared.** Every font family *and weight* that `fonts(v)` returns needs an `@font-face` in `index.html`. A missing one fails with `fonts not loaded: 700 Inter`; there is no fallback.
- **`fileName(v)` must encode every axis that changes the output**, because jobs are de-duplicated by file name.
- **Voice-over needs a `score`.** Without one, the video is silent and the voice-over is dropped. A mix that is completely silent (e.g. `vo: 'off'` with `notes: []`) fails the loudness step with `… is silent: no loudness to normalise`.
- **`voLines(v)` has two rules.** It must return `[]` for `vo: 'off'`, and must not depend on `ar`, because `vo.mjs` plans lines at 9x16 only.
- **`film.render(ctx, target)` must bind and clear the target itself.**
- **`package.json` is at SHOW, not in `factory/`** as the spec's first draft of §7.1 had it (amended, §14).

**The film README** follows `02-devastator/README.md`. It has:
- the fictional-brand note;
- 看点, with the batch, the bottle, the glass and liquid, the four worlds, the shots, the aspect ratios, the music and the voice-over;
- the 15 s shot table and the 6 s cut;
- 运行: the variant axes and SKU table, the `world` debug parameter, the batch commands with the default manifest's 24 videos, and the voice-over;
- 实现: a file tree and 渲染要点;
- 局限.

**The skill** follows spec §7.3:
1. storyline → a storyboard table the user approves;
2. scaffold `NN-name/` from the contract;
3. build shots one at a time, reviewing `sheet.mjs` / `snap.mjs` output in every aspect ratio and language;
4. write the manifest and run `vo.mjs`;
5. run `render.mjs`;
6. review the gallery.

The skill links to `factory/README.md` for the contract instead of repeating it. It asks before running anything that calls Kokoro, and it always runs `render.mjs --dry` first. That second rule is there because a misspelt `--<axis>` is ignored, and the script silently falls back to the manifest.

**Files:**
- Create:
  - `factory/README.md`, `03-perfume/README.md`;
  - `.claude/skills/new-film/SKILL.md`.
- Modify: `README.md` (the showcase index)
- Test: no new tests. Step 5 builds a throwaway `99-demo/` and deletes it.

**Interfaces:**
- Consumes:
  - Every CLI as it stands after Task 20:
    - `snap.mjs` (Task 8), `sheet.mjs` (Task 9);
    - `check.mjs`, `render.mjs` and `gallery.html` (Task 10), with the loudness chain from Task 15;
    - `vo.mjs` (Task 16).
  - The film contract as `factory/engine/app.js` reads it (Tasks 8–16).
  - Tasks 17–19: the osmanthus, seasalt and rose worlds and scores, for the film README's descriptions.
  - Task 20: a boxed layer's padding counts in the fit, and a left- or right-aligned box sits on the zone's edge. The README's 字幕图层 table documents this.
- Produces:
  - The documented contract: nothing in `factory/` changes.
  - The `new-film` skill, discovered when Claude Code runs from SHOW.
  - `03-perfume/out/` with the 24 default videos (gitignored).

- [ ] **Step 1: The factory README**

`factory/README.md`:

````markdown
# factory · 商品视频工厂引擎

03 起各案例共用的引擎。一部成片（film）只提供数据和镜头函数：轴、剪辑表、构图、字体、场景、镜头、配乐和配音台词。其余的事都由引擎来做：时钟与剪辑表、按画面比例取景、字幕排版、后期、混音、预览页、审片工具、批量出片和成片画廊。

每一帧只由（变体, t）决定，所以拖动预览、联系表和批量出片画出的是同一帧。页面是纯静态的：原生 ES Module，[Three.js 0.170](https://threejs.org/) 经 importmap 从 jsDelivr 加载，没有构建步骤。出片时，Node 脚本用 Playwright 驱动无头 Chromium（走 Metal GPU）逐帧取 PNG，经管道交给 ffmpeg。

第一部用这套引擎的成片是 [03 · 闻境](../03-perfume/)。要从一段故事梗概起一部新片，可以让 Claude Code 按 [`new-film`](../.claude/skills/new-film/SKILL.md) 技能来做，技能里的约定都以本文为准。

## 准备

所有命令都在 `opus55-showcase/` 下执行。下文的 `<film>` 指成片目录名，如 `03-perfume`。

```bash
cd ai-ml/chatgpt/claude/opus55-showcase
npm install                       # playwright 1.57.0；three 0.170.0 只给 Node 测试用
npx playwright install chromium   # 本机已缓存 Chromium build 1200 时可跳过
brew install ffmpeg               # render.mjs、vo.mjs 要用 ffmpeg 和 ffprobe
```

出片必须用 GPU：`openFilm` 拿到的 WebGL 渲染器如果是 SwiftShader 之类的软件实现，会直接报错，不会用软件渲染慢慢出片。

## 目录

```
factory/
├── engine/                 浏览器端（Node 测试也直接 import 其中的纯函数）
│   ├── app.js              主循环：变体 → 剪辑表 → 镜头 → 取景 → 渲染 → 后期 → 字幕；boot()、createApp()
│   ├── variant.js          轴、URL / 清单解析、网格展开、画面尺寸、安全区、最小字号
│   ├── timeline.js         剪辑表 → 任意 t 在哪个镜头、镜头本地时间、转场状态
│   ├── framing.js          取景意图 + 画面比例 → 相机位置与 view offset
│   ├── text.js             分词、折行（中文按字 + 避头尾，英文按词）、自动缩字、图层绘制
│   ├── post.js             MSAA → 景深 → 泛光 → AgX + 调色 + 暗角 + 颗粒 + 闪白 / 叠化
│   ├── audio.js            合成音色、离线混音、配音排布与压低配乐、预览发声
│   ├── mix.js · rng.js · ease.js · particles.js   纯函数工具：压低曲线、WAV、种子随机数、缓动、闭式漂移粒子
│   ├── player.js · player.css   预览页的播放器
│   ├── sheet.js            ?safe 安全区叠加、?sheet 联系表
│   └── exporter.js         导出：start / frame / cover / audio
├── lib/                    Node 端：serve.mjs 静态服务 · args.mjs 参数 · browser.mjs 启动 Chromium · ffmpeg.mjs 编码与响度 · jobs.mjs 选任务与记账
├── check.mjs · snap.mjs · sheet.mjs · vo.mjs · render.mjs   命令行工具，见下
├── gallery.html            成片画廊
└── test/                   引擎单元测试（node:test）
```

## 预览页

```bash
npm run serve
# 打开 http://127.0.0.1:8765/<film>/        例：http://127.0.0.1:8765/03-perfume/
```

`npm run serve` 起的是 `factory/lib/serve.mjs`：根目录是 `opus55-showcase/`，只监听 127.0.0.1，支持 Range 请求（画廊里的视频可以拖动进度）。

页面下方是播放器：每条轴一个下拉框，还有播放 / 暂停、带镜头名的时间轴、「声音」开关（成片有 `score` 时才显示）和「HQ」开关。选择会写回网址，刷新或把网址发给别人都能打开同一个变体。

| 操作 | 作用 |
|---|---|
| `空格` | 播放 / 暂停 |
| `←` / `→` | 后退 / 前进 0.5 秒 |
| `Shift` + `←` / `→` | 后退 / 前进一帧（1/30 秒） |
| `1`–`9` | 跳到剪辑表里第 *n* 条的开头 |
| `S` | 开 / 关安全区叠加 |
| `M` | 开 / 关声音 |
| `Q` | 开 / 关高画质（关掉后像素比 × 0.6，景深采样 32 → 12） |

### 网址参数

| 参数 | 说明 | 例 |
|---|---|---|
| 轴名 | 选变体。没写的轴取第一个值；值写错时页面报错，并列出可选值 | `?sku=rose&ar=16x9&lang=en` |
| `t` | 打开时停在第几秒 | `?t=6.4` |
| `paused` | 打开时不自动播放 | `?t=6.4&paused` |
| `safe` | 安全区叠加。红色是 9:16 平台界面会盖住的区域，蓝色虚线是 4% 边距，黄色是这一镜头的字幕区 | `?safe` |
| `sheet` | 联系表：一个变体的关键帧按「比例 × 语言」拼成一张图。可以写逗号分隔的时刻，不写就取每条剪辑的 60% 处。`ar`、`lang` 可以写逗号列表，不写就取全部 | `?sheet=1,4.6&ar=9x16,1x1&lang=zh` |
| `scale` | 与 `sheet` 合用：每格缩放，取 (0, 1]，默认 0.25 | `?sheet&scale=0.2` |
| `render` | 出片模式，render.mjs 用。画布就是成片尺寸，不挂播放器；字幕溢出只报错，不画红框 | |

页面有三种模式，成片从 `ctx.mode` 读取：`live`（预览）、`sheet`（联系表）、`render`（出片）。上表之外的参数引擎不读，成片可以从 `ctx.params` 自己取，例如 03 的 `?world=studio`。

## 命令

| 命令 | 作用 |
|---|---|
| `npm run serve` | 静态服务 `http://127.0.0.1:8765/` |
| `npm test` | 引擎与各成片的单元测试（`node --test '*/test/*.test.mjs'`） |
| `node factory/check.mjs <film>` | 出片前自检 |
| `node factory/snap.mjs <film>` | 按成片尺寸截几帧 PNG |
| `node factory/sheet.mjs <film>` | 联系表 PNG |
| `node factory/vo.mjs <film>` | 用 Kokoro 生成配音片段 |
| `node factory/render.mjs <film>` | 批量出片 |
| `http://127.0.0.1:8765/factory/gallery.html?film=<film>` | 成片画廊（先 `npm run serve`） |

这些脚本在参数写错时打印用法、以状态码 2 退出；检查不通过（溢出、失败的任务等）以状态码 1 退出。每个脚本都自己起一个临时的静态服务（随机端口），不需要先 `npm run serve`。

### check.mjs：出片前自检

```
node factory/check.mjs <film-dir> [--all] [--<axis> v1,v2]
```

任务的选法和 render.mjs 相同（见[清单](#清单)）。检查以下七项，每项一行：

| 项 | 内容 |
|---|---|
| `gpu` | WebGL 渲染器（软件渲染在打开页面时就已被拒绝） |
| `fonts` | 加载上的字体，以及打开页面到第一帧的毫秒数 |
| `determinism` | 每个剪辑的关键帧（每条的 60% 处）和转场中点，先顺着画、再倒着画，两遍 PNG 逐字节相同 |
| `voice-over` | 每个变体的每一句都有片段、没过期、不超出时段；成片没有 `voLines` 时直接通过 |
| `audio` | 每个剪辑的混音渲染两遍逐字节相同、不是静音；成片没有 `score` 时直接通过 |
| `overflow` | 每个变体在每条剪辑的 60% 处画一帧，没有字幕溢出 |
| `speed` | 连画 60 帧（30 fps，含取 PNG，不含编码）的每帧毫秒数，以及按这个速度单个 worker 出完这批要几分钟 |

一个两个镜头、3 秒的演示片的输出：

```
ok    gpu          ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)
ok    fonts        700 Noto Sans SC  (1746 ms to first frame)
ok    determinism  3 frames identical forward and backward
ok    voice-over   the film has no voLines: no narration
ok    audio        3 s identical twice, peak -20.5 dBFS, 67 ms
ok    overflow     2 variants, no caption overflows  (0.0 s)
ok    speed        57 ms/frame at 1080×1080 (draw + PNG, before encoding) → manifest 180 frames ≈ 0.2 min on one worker
all checks passed
```

### snap.mjs：截几帧

```
node factory/snap.mjs <film-dir> [--t 1,6.4] [--ar 9x16] [--<axis> value] [--out dir]
```

- `--t`：逗号分隔的成片秒数，默认 `0`。
- 其余 `--键 值` 原样写进页面网址：`--sku rose --lang en` 选变体，`--safe` 叠安全区，成片自己的调试参数（如 03 的 `--world studio`）也照样生效。没写的轴取第一个值。
- 输出到 `<film>/out/snap/<文件名>_t<秒>.png`。有字幕溢出时，列出溢出的图层并以状态码 1 退出。

```
demo_coral_3s_9x16_en  1080×1920  3s  gpu: ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)
  fonts: 700 Noto Sans SC
  t=0.8 turn  104 ms  → 99-demo/out/snap/demo_coral_3s_9x16_en_t0.8.png
  t=2.4 card  103 ms  → 99-demo/out/snap/demo_coral_3s_9x16_en_t2.4.png
```

### sheet.mjs：联系表

```
node factory/sheet.mjs <film-dir> [--ar 9x16,1x1] [--lang zh,en] [--t 1,4.6] [--scale 0.25] [--safe] [--<axis> value] [--out dir]
```

同一个变体按「比例 × 语言」分行，每行是几个关键帧；成片没有 `lang` 轴时只按比例分行。`--ar`、`--lang` 不写就取全部，`--t` 不写就取每条剪辑的 60% 处，其余轴用 `--<axis> value` 固定。输出 `<film>/out/sheet/sheet_<其余轴的值>_<比例>_<语言>.png`，例如 `sheet_teal_3_on_9x16-1x1-16x9_zh-en.png`。有溢出时列出 `OVERFLOW: 9x16 en t=2.4 card.title` 这样的行，并以状态码 1 退出。

### vo.mjs：配音

```
node factory/vo.mjs <film-dir> [--audition] [--force] [--dry] [--out dir]
```

- 按 `film.voLines` 收集所有要念的句子：配音开的全部变体，比例固定取 9x16，按 `id` 去重。然后逐句调 Kokoro，生成的片段写进 `<film.id>/assets/vo/`（mp3 + `index.json`，入库）。
- 每句按（文字、音色、语速）缓存，没变的不重新生成。台词表里已经没有的句子，连同文件一起删掉。
- 生成后裁掉首尾静音（前留 50 ms、后留 80 ms），响度统一到 −20 LUFS，峰值限在 −6 dBFS，编成 48 kbps 单声道 mp3。
- 比时段（`max`）长的句子提速重念一次，最多 1.15 倍。还放不下就报出这一句，以状态码 1 结束，这时要改短文案。
- `--dry`：只列出要生成的句子，不调 Kokoro。`--force`：全部重新生成。
- `--audition`：用 `film.audition = { 语言: [音色…] }` 里的每个候选音色，把同一段话（该语言默认变体的全部台词）各念一遍，写到 `<film>/out/audition/<语言>_<音色>.mp3`（`--out` 只对试听有效），挑好后写进成片的默认音色。
- Kokoro 走 `ai-ml/aigc/audio_models/Kokoro/tts.sh`（Lambda `kokoro-tts:live`，us-east-1），可以用环境变量 `KOKORO_TTS`、`REGION`、`FUNC` 改。Lambda 按「音色-秒」给输出文件起名，同一音色同时念两句会互相覆盖，所以同一音色的句子排队念，不同音色的并行。
- 成片没有 `voLines` 时，打印 `<film> has no voLines: nothing to do` 并以状态码 0 退出。

### render.mjs：批量出片

```
node factory/render.mjs <film-dir> [--all] [--<axis> v1,v2|'*'] [--fps 30] [--workers 2] [--force] [--dry] [--out dir]
```

| 选项 | 说明 |
|---|---|
| （都不写） | 按 `<film>/manifest.json` 出片 |
| `--<axis> v1,v2` | 只出命令行给的网格，没写的轴取第一个值。`'*'` 表示这条轴的全部值（要加引号，免得 shell 展开） |
| `--all` | 全部组合，配音只出 `on`。和轴选项合用时，没写的轴取全部值 |
| `--fps` | 帧率，默认 30 |
| `--workers` | 同时开几个页面，默认 2。机器上还有别的渲染在跑时可以设成 1 |
| `--force` | 已做完的也重做 |
| `--dry` | 只列出要出的片和帧数，不渲染 |
| `--out` | 输出目录，默认 `<film>/out/`。放到别处时画廊看不到 |

每条任务的流程如下：
1. 打开 `?render&paused&<变体>`，视口就是成片尺寸。
2. 页面离线混出整段 WAV，编成 AAC（见[声音](#声音)）。
3. 逐帧取 PNG，经管道交给 ffmpeg，写成 `<名>.mp4.part`。任何一帧有字幕溢出，这条就算失败。
4. 画封面。
5. 用 ffprobe 核对时长、尺寸、帧率、帧数和音轨，再量一遍成片响度。
6. 都通过后，把 `.part` 改名成 `.mp4`，写说明文件。

视频编码为 `libx264 -profile:v high -pix_fmt yuv420p -crf 18 -preset slow -movflags +faststart`。

```
99-demo: 2 videos, 180 frames at 30 fps, 2 workers → 99-demo/out
[1/2] demo_teal_3s_1x1_zh  90 frames  12.0 s (7.5 fps)  2.9 MB
[2/2] demo_coral_3s_1x1_zh  90 frames  12.2 s (7.4 fps)  3.0 MB
done 2, skipped 0, failed 0  ·  0.2 min  ·  99-demo/out/index.json
```

失败的任务打印 `FAILED` 和原因，其余任务照常继续，最后以状态码 1 结束。

### 画廊

`gallery.html?film=<film>` 读 `<film>/out/index.json`。成片按第一条场景轴分组（03 是香型），每格按真实比例显示封面，下面写着其余轴的值、文件大小、时长和响度。其余每条轴一排筛选按钮，只列出成片里出现过的值，选中状态写进网址。鼠标悬停时静音播放，点开后带声音播放。标题行显示筛选后的条数、总大小和总时长；上次出片有失败的，另起一行用红字列出。不写 `?film=` 时默认打开 `03-perfume`。

## 清单

`<film>/manifest.json` 列出默认要出的片。每条 job 是一个网格，展开成各轴取值的全部组合：

```json
{ "jobs": [
  { "sku": ["*"], "ar": ["*"],           "lang": ["zh"], "cut": [15], "promo": ["none"]   },
  { "sku": ["*"], "ar": ["9x16", "1x1"], "lang": ["zh"], "cut": [6],  "promo": ["1111"]   }
] }
```

- 可以写成片的轴，也可以写引擎轴 `ar`、`vo`。没写的轴取第一个值，`"*"` 取全部值。
- 值按字符串比较，`15` 和 `"15"` 都可以。
- 写了不存在的轴或值会报错（`manifest: unknown axis …`、`unknown sku: … (expected …)`），脚本以状态码 2 退出。
- 各 job 展开后按 `fileName(v)` 去重，所以几条网格可以重叠。

注意：命令行上写错的轴名（如 `--skus rose`）不会报错，只会被忽略。如果命令行上一条有效的轴都没有，脚本就回去读清单。出片前先用 `--dry` 看一眼要出哪些片。

## 输出

```
<film>/out/
├── <名>.mp4            成片；<名> = film.fileName(v)，如 wenjing_whitetea_15s_9x16_zh
├── <名>_cover.jpg      封面：剪辑的 cover 时刻，JPEG 质量 92
├── <名>.json           说明文件
├── <名>.mp4.part       正在编码的（做完就改名）
├── index.json          画廊读的索引
├── snap/ · sheet/      snap.mjs、sheet.mjs 的截图
└── audition/           vo.mjs --audition 的试听
```

说明文件（例）：

```json
{ "name": "demo_teal_3s_1x1_zh", "file": "demo_teal_3s_1x1_zh.mp4", "cover": "demo_teal_3s_1x1_zh_cover.jpg",
  "variant": { "color": "teal", "lang": "zh", "cut": 3, "ar": "1x1", "vo": "on" },
  "duration": 3, "width": 1080, "height": 1080, "fps": 30, "frames": 90, "bytes": 2871074,
  "audio": true, "lufs": -14, "tp": -2.7, "renderMs": 11996 }
```

没有音轨的片子，`audio` 为 `false`，`lufs`、`tp` 为 `null`。`index.json` 为 `{ film, group, axes, failed, videos }`：
- `group` 是分组用的轴（`sceneAxes[0]`）；
- `axes` 是全部轴及其取值；
- `failed` 是上一次运行失败的 `[{ name, error }]`；
- `videos` 是目录里所有 `.mp4` 还在的说明文件。

**断点续做**：
- `.mp4` 和 `.json` 都在，才算做完。重跑时跳过已做完的，打印 `skip (done)`。
- 一条任务开始前，先删掉它上次留下的 `.part`、`.mp4`、`.json` 和封面。编码写到 `.part`，全部校验通过才改名，最后写 `.json`（先写临时文件再改名）。所以中断、重跑都不会把半截文件当成品。
- `index.json` 每次运行结束都重写。它收录目录里的全部成片，所以分几次出的片会累积在一起；`failed` 只记最近一次运行。
- 要从头来，删掉 `out/` 或加 `--force`。

## 声音

**混音**：
- `film.score(v, built)` 给出音符事件，由 `audio.js` 用 OfflineAudioContext 合成 48 kHz 立体声。
- 事件走两条母线：`music`（配乐，在配音下压低）和 `sfx`（音效、品牌动机，不压）。两条母线共用一个混响。
- 配音片段在正中，不进混响，混音增益 0.6。每句前 0.12 秒开始把 `music` 压低 9 dB，句末 0.3 秒回来。
- 结尾 0.3 秒淡出。同一变体混两遍，逐采样相同。
- 预览里的「声音」和出片用的是同一块混音。
- 没有 `score` 的成片出无声片（MP4 里没有音轨），这时 `voLines` 也不会混进去。

**响度**（`lib/ffmpeg.mjs`）：
1. 整段 WAV 先用 `volume` 增益到 −14 LUFS，经 `alimiter` 限幅在 −3 dBFS，再用 `volume` 补回限幅削掉的响度。只有增益和限幅，没有压缩，音乐的起伏不变。
2. 单独编成 AAC（192 kbps，48 kHz）。AAC 会抬高真峰值：超过 −1.5 dBTP 就把限幅再压低、重编，最多 4 遍。出片时这条音轨原样拷进 MP4。
3. 验收量的是成片：综合响度在 −14 ± 1 LUFS 以内，真峰值 ≤ −1 dBTP，不达标这条任务就失败。

**配音片段索引** `<film>/assets/vo/index.json`：

```json
{
  "whitetea_zh_15_hero": { "text": "一滴晨露，一片茶山。", "voice": "zm_yunxi", "speed": 1, "rate": 1, "dur": 1.557, "lufs": -20 }
}
```

- `text`、`voice`、`speed` 用来判断片段是否过期。
- `rate` 是实际语速：放不下时 vo.mjs 会提速重念，这时它会比 `speed` 大。
- `dur` 是片段秒数。

出片和预览时，页面按 `voLines(v)` 取片段，文件是 `assets/vo/<id>.mp3`，路径相对成片页面。以下几种情况都直接报错，不会悄悄少一句：
- 缺片段；
- 片段过期（文字、音色、语速和台词表对不上）；
- 片段比时段长。

报错信息里带着要运行的命令（`run: node factory/vo.mjs <film.id>`）。

## 成片约定

### 目录

```
NN-name/
├── index.html      字体 CSS、importmap、<main id="stage">、boot(film)
├── meta.js         export const META：Node 脚本（render.mjs、check.mjs）不加载 Three.js，直接读它
├── film.js         export default { ...META, … }：成片本体
├── manifest.json   默认清单（只用 --all 或命令行轴出片时可以没有）
├── assets/vo/      vo.mjs 生成的配音（入库）
├── test/           *.test.mjs，npm test 会一起跑
├── out/            出片结果（不入库）
└── README.md
```

vo.mjs 会在 Node 里 `import` film.js，所以 film.js 的顶层不能碰 `window`、`document`。它可以 `import 'three'`（Node 里解析到 `node_modules/three`），也可以只用 `ctx.THREE`。

`index.html` 照 03 写即可：

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5/700.css" />
<link rel="stylesheet" href="../factory/engine/player.css" />
<script type="importmap">
  { "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
                 "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/" } }
</script>
…
<main id="stage"></main>
<script type="module">
  import { boot } from '../factory/engine/app.js';
  import film from './film.js';
  boot(film);
</script>
```

**字体**：`fonts(v)` 里用到的每种字体、每个字重，都要在 `index.html` 里用 `@font-face` 声明（fontsource 的 CSS 就是）。引擎用 `document.fonts.load` 按确切的字符加载，并核对返回的字重：系统字体、没声明的字重都会报 `fonts not loaded: 400 Noto Sans SC`，页面不会用回退字体出片。

### `META`（meta.js）

| 字段 | 说明 |
|---|---|
| `id` | 必须等于目录名。vo.mjs 按它写 `assets/vo/`，报错提示里的命令也用它 |
| `axes` | 成片自己的轴 `{ 名: [值…] }`，第一个值是默认值。**必须有 `cut` 轴**，它的值就是 `cuts` 的键。`ar`（`9x16` · `1x1` · `16x9`）和 `vo`（`on` · `off`）是引擎轴，自动排在后面 |
| `sceneAxes` | 值一变就要重建场景（重新调 `setup`）的轴，如 03 的 `['sku']`；其余轴即时切换。第一条也是画廊的分组轴。可以是 `[]` |
| `cuts` | `{ [cut]: { shots, hits, cover } }`，见[剪辑表](#剪辑表) |
| `fileName(v)` | 输出文件名（不含扩展名）。批量按文件名去重，所以凡是会改变画面或声音的轴都要写进去；没有配音的成片不写 `vo`，`on`、`off` 就合成一条 |

### film.js 的默认导出

| 字段 | 必需 | 说明 |
|---|---|---|
| `...META` | ✓ | 上表各项 |
| `layouts` | ✓ | `layouts[ar][shot] = { anchor, size, maxW, zones }`，见[构图](#构图)。可以是 `{}` |
| `fonts(v)` | ✓ | `[{ family, weight, text }]`：这一变体要画的每种字体及其全部字符。没有字幕就返回 `[]` |
| `setup(ctx)` | ✓ | async。按 `ctx.variant` 搭场景：往 `ctx.scene` 里加灯光、网格，设背景和 `environment`；后面要用的对象放进 `ctx.subjects`；整片的后期设置放进 `ctx.postDefaults` |
| `reset(ctx)` | ✓ | 每求一个镜头之前调用：把镜头函数会改的东西（位置、旋转、可见性、材质参数…）复位 |
| `shots` | ✓ | `{ [shot]: (ctx, s) => ({ camera, text?, post? }) }`，剪辑表里用到的每个镜头名都要有 |
| `render(ctx, target)` | | 自己把场景画进 HDR 目标（要自己 `setRenderTarget(target)` 并清屏），如 03 的玻璃折射多遍渲染；不写就是 `renderer.render(scene, camera)` |
| `score(v, built)` | | `{ notes, reverb }`，见[配乐](#配乐)；不写就出无声片 |
| `voLines(v)` | | `[{ id, text, voice, speed, at, max }]`，见[配音台词](#配音台词) |
| `audition` | | `{ 语言: [音色…] }`，给 `vo.mjs --audition` 用 |

换场景时，引擎先调 `ctx.world?.dispose?.()`，再释放场景树里所有几何体、材质、贴图和 `scene.environment`，然后清空 `ctx.subjects`、`ctx.world`，最后调 `setup`。`setup` 之后、进入 `ready` 之前，引擎预编译着色器，并在每条剪辑的中点各画一帧。

### `ctx`

| 字段 | 说明 |
|---|---|
| `THREE` | three 模块 |
| `renderer` · `scene` · `camera` | 渲染器（打开阴影、PCFSoft），场景，唯一的相机（`PerspectiveCamera`，near 0.01、far 200，位置和视角每帧由取景决定） |
| `variant` | 当前变体 `{ 各轴: 值 }` |
| `ar` · `W` · `H` | 画面比例和画布像素。预览时画布是缩小的，所以镜头里一律用比例，不要用像素 |
| `post` | 后期链（`sceneRT` 是 HDR 场景目标，`render(ctx, target)` 就画进它） |
| `subjects` · `world` | 成片自己放东西的地方；换场景时清空（`world.dispose()` 会先被调用） |
| `postDefaults` | 整片 / 场景一级的后期设置，叠在引擎默认值之上、镜头的 `post` 之下 |
| `built` | 当前剪辑：`{ entries, duration, hits, cover }` |
| `mode` · `params` | `'live'` · `'sheet'` · `'render'`；页面网址的 `URLSearchParams` |
| `clips` | 保留字段，目前恒为 `null` |

### 剪辑表

```js
cuts: {
  15: {
    shots: [
      { shot: 'macro', dur: 2.25 },
      { shot: 'hero', dur: 3.0, from: 0.75, transition: { type: 'dissolve', dur: 0.3 } },
    ],
    hits: { land: 3.0 },  // 命名的时刻（成片秒），配乐和音效对齐用；引擎只是原样传给 score
    cover: 2.6,           // 封面取这一秒
  },
}
```

- 成片时长就是各条 `dur` 之和，转场不重叠、不改变总长。
- `from` 让镜头从自己时间线的中段切入：镜头拿到的本地时间从 `from` 开始。
- `transition` 属于切入的这一条，类型只有三种：
  - `cut`：默认，硬切；
  - `flash`：闪白，从 1 线性衰减到 0；
  - `dissolve`：叠化，上一镜头继续往后播，所以它的 `lt` 会超过自己的时长。
- 转场长度不能超过这一条的 `dur`。

镜头函数拿到的 `s`：

| 字段 | 说明 |
|---|---|
| `name` | 镜头名 |
| `lt` | 镜头本地秒：`from + (t − 这一条的开始)`。叠化时，上一镜头的 `lt` 会超过 `dur` |
| `dur` | 镜头全长 = `from` + 这一条的 `dur` |
| `u` | `lt / dur`，钳在 0–1 |
| `from` | 这一条的 `from`。字幕的入场时刻写成 `s.from + …`，从中段切入时字幕也照样完整入场 |
| `t` | 成片秒 |
| `row` | `layouts[ar][name]`，原样给出，成片可以在里面放自己的字段（03 放了 `align`） |

镜头函数只能依赖 `ctx.variant` 和 `s`：同样的输入，每次画出同样的一帧。每帧都会用到的代码里不许调用 `Math.random`、`Date.now`、`performance.now`；随机数用 `rng.js`（`rand(seed, i)`、`mulberry32`），粒子用 `particles.js` 的闭式漂移 `drift(seed, i, t, box, opts)`。镜头函数改过的状态由 `reset` 复位：
- 转场时，同一帧里要求两个镜头；
- 拖动时间轴时，求值的顺序是任意的。

check.mjs 的 `determinism` 项查的就是这一点。

### 构图

`layouts[ar][shot]` 的各字段，坐标都是画面比例，原点在左上角，y 向下：

| 字段 | 说明 |
|---|---|
| `anchor` | `[x, y]`，主体投影框的中心落在这里 |
| `size` | 主体投影框的高度占画面高度的比例 |
| `maxW` | 主体投影框宽度的上限（占画面宽度），默认 0.9 |
| `zones` | `{ 区名: [x, y, w, h] }`：字幕区。字幕图层按区名放进去 |

9:16 画面的上 7%、下 18% 和右侧中段会被抖音、淘宝的界面盖住（`variant.js` 的 `UNSAFE`）。主体和字幕都要躲开这些区域，再留出 4% 边距，用 `?safe` 检查。1:1 和 16:9 只有边距要求。

镜头返回的 `camera` 是取景意图，不是相机数字：

| 意图 | 字段 | 说明 |
|---|---|---|
| fit（默认） | `{ box, dir, up?, fov, anchor?, size?, scale?, maxW? }` | `box` 是主体的 `THREE.Box3`，`dir` 是从主体中心指向相机的方向。引擎二分求相机距离，使投影框的高度等于 `size × scale`、宽度不超过 `maxW`，再用 `setViewOffset` 把主体平移到 `anchor`，不转动相机，所以各比例下透视相同。`anchor`、`size`、`maxW` 不写时取构图行里的值 |
| free | `{ type: 'free', position, target, fov, up?, fovAxis?, offset? }` | 直接给机位。`fovAxis: 'short'` 让竖屏下 `fov` 指的是水平视角；`offset` 是 `[x, y]` 的 view offset（画面比例） |
| blend | `{ type: 'blend', a, b, k }` | 两个意图各自求解后按 `k` 插值，比如从 fit 推到 free |

### 字幕图层

镜头返回的 `text` 是图层数组：

| 字段 | 说明 |
|---|---|
| `id` | 图层名。溢出时报成 `<镜头>.<id>` |
| `zone` | 构图行 `zones` 里的区名；没有这个区会报错 |
| `text` · `lang` | 文字，可以用 `\n` 换行。`lang: 'en'` 按词折行，其他值都按字折行，并遵守避头尾 |
| `font` | `{ family, weight, style?, fallback? }` |
| `size` · `min` | 字号（画面短边的比例），放不下时逐步缩小，最小到 `min`。`min` 不会低于引擎的最小字号（9:16、1:1 为 3.5%，16:9 为 3.0%） |
| `lineHeight` · `maxLines` · `tracking` | 行高（默认 1.25）、最多几行、字距（em） |
| `align` · `valign` | `left` / `center` / `right`；`top` / `middle` / `bottom` |
| `color` · `alpha` · `shadow` | 颜色、不透明度，阴影 `{ color, blur }`（`blur` 是字号的倍数） |
| `in` · `out` | 镜头本地秒 `[起, 止]`：逐行上浮入场、淡出 |
| `box` | 底色块 `{ fill, color, pad, radius }`：`color` 是块上文字的颜色，`pad`（默认 0.35）、`radius` 是字号的倍数。排版时字宽加上两边的 `pad` 一起放进区宽；左 / 右对齐时，块的边贴着区的边 |
| `leader` | 引线 `{ world: [x, y, z], color }`：从这个世界坐标点（按这一镜头的相机投影）画向文字 |
| `pop` · `strike` | 入场时弹一下；删除线（如原价） |

缩到最小字号还放不下的，就算溢出。预览和联系表里溢出的区画红框；出片时溢出，这条任务直接失败。

### 后期

镜头返回的 `post` 叠在 `ctx.postDefaults` 之上，`ctx.postDefaults` 又叠在引擎默认值之上。`bloom` 按字段合并，其余字段整项覆盖：

| 字段 | 默认 | 说明 |
|---|---|---|
| `exposure` | 1 | 曝光 |
| `focus` · `aperture` · `maxBlur` | `'target'` · 0 · 0.012 | 对焦距离（米；`'target'` 是取景解出的注视点距离）、景深强度（0 关）、最大弥散圆（短边比例） |
| `bloom` | `{ strength: 0.22, radius: 0.45, threshold: 0.85 }` | 泛光 |
| `lift` · `gamma` · `gain` · `saturation` | `[0,0,0]` · `[1,1,1]` · `[1,1,1]` · 1 | 调色 |
| `vignette` · `grain` | 0.22 · 0.03 | 暗角、颗粒 |
| `flashColor` | `[1, 0.98, 0.94]` | 闪白转场的颜色 |

色调映射是 AgX。字幕在后期之后才叠上去，不受景深、颗粒影响。

### 配乐

`score(v, built)` 返回 `{ notes, reverb: { decay, music, sfx } }`：
- `reverb` 里，`decay` 是混响秒数（默认 2），`music`、`sfx` 是两条母线送进混响的量。
- 每个音符是 `{ t, voice, f, d, v, bus?, pan?, p? }`：
  - `t`、`d` 分别是开始秒和时值；
  - `f` 是频率，可以用 `mtof(midi)` 算；
  - `v` 是力度，`pan` 是声像；
  - `bus` 取 `'music'`（默认）或 `'sfx'`；
  - `p` 是音色参数。

音色（`audio.js` 的 `VOICES`）：

| 音色 | 用途 · 参数 |
|---|---|
| `pluck` | 拨弦（古琴、竖琴、卡林巴）· `t60` 余音、`bright` 亮度 |
| `pad` | 铺底 · `a` 起音、`r` 释放、`cut` 截止频率（f 的倍数）、`air` 气声 |
| `flute` | 气声长笛 · `a`、`r`、`breath` |
| `bell` | 钟、钢片琴、玻璃 · `ratios` 分音比、`bright` |
| `plink` | 水滴 · `up` 上滑的倍数 |
| `noise` | 风、雾、喷雾、转场呼声 · `type`、`q`、`sweep`、`a`、`r`、`wander` |
| `click` | 咔哒声 |

`built.hits` 是剪辑表里的命名时刻，配乐按它对齐；`timeline.js` 的 `shotAt(built, name)` 可以取某个镜头在这一剪辑里的起止。

### 配音台词

`voLines(v)` 返回这一变体要念的句子：`[{ id, text, voice, speed, at, max }]`：
- `at` 是句子在成片里开始的秒数，`max` 是时段的最长秒数；
- `voice` 是 Kokoro 音色，如 `zm_yunxi`、`bf_emma`；`speed` 是语速。

写台词表时注意以下几点：
- `v.vo === 'off'` 时返回 `[]`。引擎只提供这条轴，关掉配音要靠成片自己。
- 同一个 `id` 在所有变体里文字相同。
- 台词不能随 `ar` 变：vo.mjs 只按 9x16 收集台词。
- 数字写成汉字或英文单词，Kokoro 直接读阿拉伯数字不稳定。
- 每句要在成片最后 0.3 秒的淡出之前念完。

### 测试

成片目录下的 `test/*.test.mjs` 会被 `npm test` 一起跑，只用 `node:test` 和 `node:assert/strict`。纯数据（meta.js、文案、构图）可以直接在 Node 里测。`text.js` 的 `approxMeasure` 是一个只会偏宽的量字模型，用它测「每段文字 × 每个区 × 每种比例 × 每种语言都放得下」：在 Node 里通过，浏览器里用真实字体也放得下。

## 新片起步

下面是一部最小的成片 `99-demo`：一个旋转的环结、一行标题，两个镜头，共 3 秒；两条成片轴 `color`、`lang`，外加必需的 `cut`。上面各节的命令输出都来自它。

`99-demo/meta.js`：

```js
export const META = {
  id: '99-demo',
  axes: { color: ['teal', 'coral'], lang: ['zh', 'en'], cut: [3] },
  sceneAxes: ['color'],
  cuts: {
    3: {
      shots: [{ shot: 'turn', dur: 1.5 }, { shot: 'card', dur: 1.5, transition: { type: 'dissolve', dur: 0.3 } }],
      hits: { card: 1.5 }, cover: 2.4,
    },
  },
  fileName: v => `demo_${v.color}_${v.cut}s_${v.ar}_${v.lang}`,
};
```

`99-demo/film.js`：

```js
import { META } from './meta.js';

const COLOR = { teal: '#2f9fb2', coral: '#e8735a' };
const TITLE = { zh: '一个模板，批量出片', en: 'One template, every format' };
const FONT = { family: 'Noto Sans SC', weight: 700 };

const zones = (title, sub) => ({ zones: { title, sub } });
const LAYOUTS = {
  '9x16': { turn: { anchor: [0.45, 0.36], size: 0.34, ...zones([0.08, 0.62, 0.74, 0.08], [0.08, 0.7, 0.74, 0.05]) }, card: { anchor: [0.45, 0.3], size: 0.24, ...zones([0.08, 0.5, 0.74, 0.08], [0.08, 0.58, 0.74, 0.05]) } },
  '1x1': { turn: { anchor: [0.5, 0.4], size: 0.5, ...zones([0.08, 0.76, 0.84, 0.1], [0.08, 0.86, 0.84, 0.07]) }, card: { anchor: [0.5, 0.34], size: 0.36, ...zones([0.08, 0.62, 0.84, 0.1], [0.08, 0.72, 0.84, 0.07]) } },
  '16x9': { turn: { anchor: [0.68, 0.5], size: 0.6, maxW: 0.5, ...zones([0.07, 0.4, 0.43, 0.14], [0.07, 0.54, 0.43, 0.08]) }, card: { anchor: [0.7, 0.5], size: 0.45, maxW: 0.5, ...zones([0.07, 0.4, 0.43, 0.14], [0.07, 0.54, 0.43, 0.08]) } },
};
const layers = (v, s) => [
  { id: 'title', zone: 'title', text: TITLE[v.lang], lang: v.lang, font: FONT, size: 0.06, align: 'center', valign: 'middle', color: '#f4f1e8', in: [s.from + 0.2, s.from + 0.7] },
  ...(s.name === 'card' ? [{ id: 'sub', zone: 'sub', text: `99-demo · ${v.color}`, lang: 'en', font: FONT, size: 0.036, align: 'center', color: '#b8c4c8', in: [0.3, 0.8] }] : []),
];

export default {
  ...META,
  layouts: LAYOUTS,
  fonts: v => [{ ...FONT, text: `${TITLE[v.lang]}99-demo · ${v.color}` }],
  async setup(ctx) {
    const { THREE, scene } = ctx;
    scene.background = new THREE.Color('#14181c');
    const key = new THREE.DirectionalLight('#ffffff', 2.5);
    key.position.set(2, 3, 2);
    scene.add(key, new THREE.HemisphereLight('#b0c8ff', '#202020', 0.8));
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.3, 0.1, 160, 24), new THREE.MeshStandardMaterial({ color: COLOR[ctx.variant.color], roughness: 0.35, metalness: 0.2 }));
    knot.position.y = 0.45;
    scene.add(knot);
    ctx.subjects.knot = knot;
    ctx.subjects.box = new THREE.Box3().setFromObject(knot);
    ctx.postDefaults = { vignette: 0.3 };
  },
  reset(ctx) { ctx.subjects.knot.rotation.set(0, 0, 0); },
  shots: {
    turn(ctx, s) {
      ctx.subjects.knot.rotation.y = s.lt * 1.2;
      return { camera: { box: ctx.subjects.box, dir: [0, 0.25, 1], fov: 30 }, text: layers(ctx.variant, s) };
    },
    card(ctx, s) {
      ctx.subjects.knot.rotation.y = 1.8 + s.lt * 0.6;
      return { camera: { box: ctx.subjects.box, dir: [0.4, 0.3, 1], fov: 30 }, text: layers(ctx.variant, s), post: { exposure: 1.1 } };
    },
  },
  score: (v, built) => ({
    notes: [
      { t: 0, voice: 'pad', f: 220, d: 3, v: 0.8 },
      { t: 0, voice: 'bell', f: 880, d: 1.2, v: 0.6, bus: 'sfx' },
      { t: built.hits.card, voice: 'bell', f: 1320, d: 1.2, v: 0.6, bus: 'sfx' },
    ],
    reverb: { decay: 1.5, music: 0.3, sfx: 0.2 },
  }),
};
```

`99-demo/manifest.json`：

```json
{ "jobs": [
  { "color": ["*"], "ar": ["1x1"], "lang": ["zh"], "cut": [3] }
] }
```

`99-demo/index.html` 照[目录](#目录-1)一节的模板写，字体只要 `noto-sans-sc@5/700.css`。

然后依次执行：

```bash
npm run serve                                   # 打开 http://127.0.0.1:8765/99-demo/ 预览，试各个下拉框
node factory/check.mjs 99-demo                  # 七项全过
node factory/sheet.mjs 99-demo --safe           # 三种比例 × 两种语言，看构图和安全区
node factory/snap.mjs 99-demo --t 0.8,2.4 --ar 9x16 --lang en --color coral
node factory/vo.mjs 99-demo                     # 没有 voLines：nothing to do
node factory/render.mjs 99-demo                 # 按清单出 2 条
# 打开 http://127.0.0.1:8765/factory/gallery.html?film=99-demo
```

真正的成片按这个顺序来：
1. 先写分镜表（镜头、时长、命中点、文案），确认后再动手。
2. 先搭好目录和数据，再一个镜头一个镜头地做。每做完一个镜头，就用 `?sheet` 或 `sheet.mjs` 在每种比例、每种语言下检查一遍。
3. 写清单、生成配音、出片，最后在画廊里审片。

`new-film` 技能就是按这个流程写的。

### 常见报错

| 报错 | 原因 |
|---|---|
| `page never created window.__app` 下面跟着 `page: …` | 页面启动时抛错。真正的原因在 `page:` 那一行：这个标题对 `__app.ready` 失败也会出现 |
| `fonts not loaded: 700 Inter` | `fonts(v)` 里的字体或字重没在 index.html 里声明 |
| `cut: empty edit list` | `axes` 里没有 `cut` 轴，或者它的值在 `cuts` 里找不到 |
| `manifest: unknown axis cut` | 清单里写了成片没有的轴 |
| `unknown color: pink (expected teal \| coral)` | 网址、清单或命令行里的值不在轴里 |
| `text layer title: no zone title` | 图层的 `zone` 在这一比例、这一镜头的构图行里没有 |
| `voice-over clip missing: …` · `voice-over clip out of date: …` | 新加或改过台词、音色、语速，还没重新生成片段：按提示运行 `node factory/vo.mjs <film>` |
| `loudness … LUFS ≠ -14 ± 1` · `true peak … dBTP > −1` | 成片响度不达标。重编 4 遍后真峰值还超，多半是高频很重的瞬态被 AAC 推高了：把这类音色做柔一些，或在 `score` 里调低它 |
| `software WebGL (…); refusing to render` | Chromium 没拿到 GPU：不要在没有显示环境的远程机器上跑，或者检查启动参数 |

## 局限

- 画面比例固定为 `9x16`、`1x1`、`16x9` 三种，尺寸固定，安全区只为 9:16 定义了平台界面遮挡区。成片不能去掉某个比例，只能在清单里不出它。
- 英文按词折行只认 `lang: 'en'`，其他语言（包括别的拉丁字母语言）都按字折行。
- `vo` 轴总是在：没有配音的成片，预览页和画廊里也会有 `vo` 选项。
- 转场只有硬切、闪白、叠化三种；一部片只有一台相机。
- 声音由成片的 `score` 驱动：只有配音、没有配乐的片子，目前也要写一个 `score`（`notes` 可以是空数组）。但整段完全静音的混音（如 `vo: off` 又没有音符）会在响度一步报 `… is silent` 失败，这类片子清单里只出 `vo: on`，或者垫一层很轻的底噪。
- 画廊只读 `<film>/out/`，`render.mjs --out` 放到别处的片子画廊里看不到。
````

Run: `for s in check snap sheet vo render; do node factory/$s.mjs 2>&1 | head -1; done`
Expected: five `usage:` lines. Each is character-for-character the usage line quoted under that script's heading in the README's 命令 section:
```
usage: node factory/check.mjs <film-dir> [--all] [--<axis> v1,v2]
usage: node factory/snap.mjs <film-dir> [--t 1,6.4] [--ar 9x16] [--<axis> value] [--out dir]
usage: node factory/sheet.mjs <film-dir> [--ar 9x16,1x1] [--lang zh,en] [--t 1,4.6] [--scale 0.25] [--safe] [--<axis> value] [--out dir]
usage: node factory/vo.mjs <film-dir> [--audition] [--force] [--dry] [--out dir]
usage: node factory/render.mjs <film-dir> [--all] [--<axis> v1,v2|'*'] [--fps 30] [--workers 2] [--force] [--dry] [--out dir]
```

- [ ] **Step 2: The film README**

`03-perfume/README.md`:

````markdown
# 03 · 闻境 —— 香水产品视频工厂

这是一支 15 秒的香水广告片。开场是微距：一片茶叶的叶尖挂着露珠，露珠落下，接着硬切成水滴落进瓶中液面、荡开涟漪，镜头随后拉开露出整瓶。接下来依次是四个镜头：
- 光带扫过玻璃棱面，打出香型名；
- 瓶子拆开成分解图，引线标出前、中、后调；
- 瓶盖浮起，喷出一下香雾；
- 片尾卡：品牌、标语，以及购买按钮或活动价签。

四款香型各有自己的场景（「世界」）、液体颜色、瓶盖、配色和配乐。

同一个模板可以批量出片，覆盖以下组合，每个组合都有带配音和不带配音两版：
- 三种画面比例（抖音 / 淘宝竖屏、主图方屏、Amazon 横屏）；
- 四款香型；
- 中英两种语言；
- 15 秒和 6 秒两种长度；
- 三种片尾活动。

每条成片都是能直接上架的 MP4，另带一张封面，出完可以在画廊里集中审片。电商团队要的是成千上万条商品视频，这个案例演示的就是这件事。

纯静态网页：原生 ES Module + [Three.js 0.170](https://threejs.org/)（importmap 经 jsDelivr 加载），无构建步骤。瓶子、玻璃、液体、场景、字幕和配乐都由代码程序生成，只有配音是预先生成、随仓库提交的 mp3。时钟、取景、字幕排版、后期、混音、预览页、批量出片和画廊都来自共用的 [factory 引擎](../factory/README.md)，本目录只有这部片子自己的数据、场景和镜头。

> 「闻境 WENJING」是为本案例虚构的品牌。香型、价格和活动都是示例数据，与任何真实品牌或商品无关。

## 看点

| | |
|---|---|
| **一个模板，批量出片** | 3 种比例 × 4 款香型 × 2 种语言 × 2 种长度 × 3 种活动，共 144 个变体，每个都能出带配音和不带配音两版。默认清单出其中 24 条，一条命令出完，还能断点续做 |
| **瓶子** | 厚底八角玻璃瓶，竖棱圆角，上下棱倒圆，正面是磨砂 logo。另有贴壁弯月面的液体、金色颈圈、带吸管的喷头和多棱瓶盖。组装态和分解态是同一套网格 |
| **玻璃与液体** | 不用 three 自带的透射，因为它透过玻璃看不见里面的液体。改为分层折射：世界 → 液体 → 玻璃 → 瓶前的喷雾。光在玻璃和液体里走的路程按八角棱柱解析求出：<br>- 液体按比尔–朗伯定律吸收，越厚颜色越深；<br>- 出口按菲涅耳分成透射和反射两份；<br>- 玻璃有三色色散。<br>焦散是一张光线网格穿过瓶子落到地面，按 RGB 三种折射率各画一遍 |
| **四个世界** | 白茶 · 晨雾茶山：瓶子立在茶园石埂的湿石板上，身后层层茶垄顺着等高线隐进谷里的晨雾，低太阳在左后方，光束斜穿雾气。微距是「一芽二叶」：带白毫的芽头、两片锯齿嫩叶，叶尖挂着一颗渐渐长大的露珠<br>桂花 · 金秋逆光：傍晚的低太阳在瓶子正后方偏右。瓶子立在老榆木茶台上，台面散着几朵落花；身后是桂花树的深绿树冠、矮树篱和暮霭里的树影，一枝桂花从左上方斜伸进来成剪影，叶缝里漏下的阳光在焦外化成暖金色的光斑，花一朵朵往下飘。微距是叶腋里的一簇桂花：十朵四瓣小花挂在细花梗上，逆光里花瓣透亮，最下面一朵的瓣尖挂着露珠<br>海盐 · 海边的光：瓶子立在一块被水磨圆的白石上，石头后沿没进清浅的海水，水底的白石上焦散晃动，水线上一道细碎的白沫；再往后是几块白礁石和雾蒙蒙的海平线。太阳在左后方，细浪上闪着碎光，空中飘着浪花的水星和几粒盐晶。微距是湿石沿上的一颗漏斗状立方盐晶，最低的一角挂着水珠<br>玫瑰 · 暗红丝绒：瓶子立在铺开的丝绒上，丝绒往后堆起，顺着弧面升成一道垂着褶的幕。一盏硬光从左前上方打下来，只照亮瓶子周围一圈，光圈外沉进暗红里，几片花瓣慢慢飘落穿过光里。微距是玫瑰外层的一片花瓣，瓣缘外翻卷下，瓣尖挂着露珠 |
| **六个镜头** | 见下面的镜头表。每个镜头只由镜头本地时间决定：拖动时间轴、跳着看和顺序播放得到同一帧 |
| **适配三种比例** | 每种比例、每个镜头各有一行构图：瓶子的锚点、占画面的高度、字幕区。取景按瓶子的包围盒自动求相机距离，再平移到锚点，所以三种比例透视一致，但瓶子和文字各在该在的位置。9:16 避开抖音、淘宝的右侧图标列和底部标题带。字幕放不下时自动缩小，缩到最小字号还放不下，这条就出片失败 |
| **配乐** | 每款香型一份编曲，15 秒和 6 秒各写一版，6 秒版不是截短的 15 秒版。一小节 3 秒（80 bpm），水滴落下、光带峰值、品牌动机都落在小节第一拍上。白茶是 D 宫调五声，用古琴般的拨弦、带气声的长笛和空灵的铺底；桂花是 F 大调，毛毡钢琴、钢片琴和温暖的弦乐铺底；海盐是 A 利底亚，马林巴、卡林巴短促的敲击，玻璃般的钟声和一阵阵浪涌；玫瑰是 C 多利亚，大提琴般的低音铺底、心跳般的八分音符低音脉动和往上走的竖琴分解。<br>片尾的三音品牌动机（主音之上大二度、纯五度、八度）四款共用，用各自的音色演奏。另有水滴、瓶盖、喷雾、转场的音效和每个世界的环境底噪。以上全部用 WebAudio 合成 |
| **配音** | [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) 经已部署的 `kokoro-tts:live` Lambda 生成。中文 `zm_yunxi`，英文 `bf_emma`，都是从四个候选音色里试听选定的。配音时配乐自动压低 9 dB。数字都写成汉字或英文单词，如「双十一，到手四百九十九元」 |

### 镜头表（15 秒版）

| 时间 | 镜头 | 画面 | 字幕 |
|---|---|---|---|
| 0–2.25 s | `macro` | 香型主料的微距特写，叶尖露珠渐渐长大，最后 0.25 秒松开 | 意象句，如「一滴晨露，一片茶山」 |
| 2.25–4.5 s | `drop` | 硬切成同一滴水落进瓶中，3.0 s 碰到液面，涟漪荡开；然后从水滴特写拉到整瓶 | |
| 4.5–7.5 s | `hero` | 缓慢环绕，6.0 s 光带扫过棱面（0.3 s 叠化切入） | 香型名、品牌 |
| 7.5–10.5 s | `anatomy` | 瓶盖、颈圈、喷头依次上抬成分解图，再合回去 | 前调 / 中调 / 后调（引线指向瓶盖、颈圈、液体），「50 ml · 浓香水」 |
| 10.5–12 s | `spray` | 瓶盖浮起，按下喷头，香雾飘进世界，瓶盖落回（0.25 s 叠化切入） | |
| 12–15 s | `end` | 瓶子静立在世界里，12.0 s 奏品牌动机（0.4 s 叠化切入） | 「闻境 WENJING」、片尾活动 |

6 秒版只用三个镜头：
- `drop` 从中段切入，0 s 即落进液面；
- `hero` 从中段切入，闪白转场；
- `end` 从 3 s 开始，叠化切入。

两版的剪辑表、命中点和封面时刻都写在 `meta.js` 的 `CUTS` 里。

## 运行

ES Module 需要经 HTTP 打开（`file://` 不行）：

```bash
cd ai-ml/chatgpt/claude/opus55-showcase
npm install          # 只有批量出片和测试要用
npm run serve
# 浏览器打开 http://127.0.0.1:8765/03-perfume/
```

浏览器需要支持 WebGL 2。首次打开要预编译着色器、加载字体，要等一两秒才出第一帧。Three.js 和字体（思源宋体、思源黑体、Cormorant Garamond）都经 jsDelivr 加载，需要联网。字体没加载上时页面会直接报错，不会退回系统字体。

页面下方的播放器每条轴一个下拉框，可以切换香型、比例、语言、长度、活动和配音，选择会写进网址。键盘操作和通用网址参数（`t`、`paused`、`safe`、`sheet`…）见 [factory/README.md](../factory/README.md#预览页)。

### 变体

| 轴 | 值 | 说明 |
|---|---|---|
| `sku` | `whitetea` 白茶 · `osmanthus` 桂花 · `seasalt` 海盐 · `rose` 玫瑰 | 世界、液体颜色、瓶盖、配色、配乐和文案跟着变 |
| `ar` | `9x16` 1080×1920 · `1x1` 1080×1080 · `16x9` 1920×1080 | 抖音 / 淘宝竖屏 · 主图视频 · Amazon 商品视频 |
| `lang` | `zh` · `en` | 字幕、价格币种（¥ / $）、配音 |
| `cut` | `15` · `6` | 15 秒完整版 · 6 秒信息流版 |
| `promo` | `none` · `1111` · `launch` | 片尾卡：标语 + 购买按钮 · 双11 价签（到手价 + 划掉的日常价）· 新品首发 + 赠品 + 购买按钮 |
| `vo` | `on` · `off` | 配音开 / 关，关掉时文件名加 `_novo` |

| 香型 | 意象 | 前调 · 中调 · 后调 | 日常价 | 到手价（双11） | 瓶盖 |
|---|---|---|---|---|---|
| 白茶 White Tea | 一滴晨露，一片茶山 | 佛手柑 · 白茶 · 白麝香 | ¥699 / $95 | ¥499 / $69 | 银 |
| 桂花 Osmanthus | 一树金桂，满城秋香 | 杏子 · 桂花 · 檀香 | ¥699 / $95 | ¥499 / $69 | 金 |
| 海盐 Sea Salt | 一缕海风，一片澄蓝 | 海盐 · 鼠尾草 · 琥珀木 | ¥659 / $89 | ¥469 / $65 | 磨砂 |
| 玫瑰 Rose | 一瓣玫瑰，一夜丝绒 | 黑加仑 · 玫瑰 · 广藿香 | ¥799 / $109 | ¥589 / $79 | 漆面 |

### 调试参数

除了引擎的通用参数，本片还有一个：

| 参数 | 说明 | 例 |
|---|---|---|
| `world` | 强制换一个世界。`studio` 是中性影棚（无缝背景弯、两侧长条柔光、一盏主光），单独调瓶子和玻璃时用 | `?sku=rose&world=studio` |

### 批量出片

需要 Node 22、Playwright 的 Chromium 和 ffmpeg（见 [factory/README.md](../factory/README.md#准备)），出片必须用 GPU。

```bash
node factory/check.mjs 03-perfume              # 出片前自检：GPU、字体、确定性、配音、混音、字幕溢出、速度
node factory/sheet.mjs 03-perfume --sku rose --safe      # 玫瑰：三种比例 × 两种语言的关键帧联系表，叠安全区
node factory/snap.mjs 03-perfume --t 1,6.4 --ar 16x9 --lang en --world studio
node factory/render.mjs 03-perfume --dry       # 列出默认清单：24 条
node factory/render.mjs 03-perfume             # 出片到 03-perfume/out/
node factory/render.mjs 03-perfume --sku rose --ar 9x16 --cut 6 --promo '*'   # 只出玫瑰 6 秒竖屏的三种活动版
node factory/render.mjs 03-perfume --all       # 全部 144 个变体（配音开）；加 --vo '*' 连无配音版共 288 条
# 画廊：http://127.0.0.1:8765/factory/gallery.html?film=03-perfume（先 npm run serve）
```

默认清单 `manifest.json`：

| 内容 | 条数 |
|---|---|
| 四款 × 三种比例，中文，15 秒，无活动 | 12 |
| 四款 × 9:16 / 1:1，中文，6 秒，双11 | 8 |
| 四款 × 16:9，英文，15 秒，新品首发 | 4 |

共 24 条、288 秒、8640 帧。在 M1 Pro 上用 2 个 worker 约 11.6 分钟（每条 4.7–9.7 fps，9:16 最慢、1:1 最快），全部成片共 322.8 MB。`--all` 的 144 条帧数是它的 5.25 倍，约一小时。成片文件名是 `wenjing_<香型>_<长度>s_<比例>_<语言>[_<活动>][_novo].mp4`，如 `wenjing_rose_6s_9x16_zh_1111.mp4`，封面和说明文件与成片同名。输出目录结构、断点续做规则和响度标准见 [factory/README.md](../factory/README.md#输出)。

### 配音

配音片段已随仓库提交在 `assets/vo/`：64 句，共 912 KB。克隆下来就能听到，不需要部署 Kokoro。
- 15 秒版三句：
  - 4.6 s 念意象句；
  - 7.7 s 念三种香调；
  - 12.3 s 念品牌句或活动句。
- 6 秒版一句，从 1.1 s 开始。
- 每句有自己的时段上限。

改了 `copy.js` 里的台词、音色或语速后，要重新生成片段：

```bash
node factory/vo.mjs 03-perfume --dry        # 列出要重新生成的句子
node factory/vo.mjs 03-perfume              # 生成：需要 AWS 凭证和已部署的 kokoro-tts Lambda
node factory/vo.mjs 03-perfume --audition   # 试听：每种语言四个候选音色，写到 out/audition/
```

没变的句子不会重新生成。放不下时段的句子会先提速重念一次，还放不下就报出这一句，这时要改短文案。片段过期或缺失时，出片会直接报错，不会悄悄少一句。

## 实现

```
03-perfume/
├── index.html        页面：字体、importmap、boot(film)
├── meta.js           轴、剪辑表（15 / 6 秒）、命中点、封面时刻、瓶子尺寸与各镜头机位、文件命名
├── film.js           成片模板：搭场景（世界 + 瓶子 + 水滴 + 喷雾 + 玻璃）、复位、分层渲染、镜头、配乐、配音
├── skus.js           四款香型：名称、意象、香调、价格、液体颜色与吸收、瓶盖、世界、配色
├── copy.js           字体、界面用语、数字读法、配音台词与时段、默认音色与试听候选
├── captions.js       各镜头的字幕图层；fontsFor() 收集每个变体要加载的字符
├── promos.js         片尾卡的三种活动
├── layouts.js        每种比例 × 每个镜头的构图与字幕区
├── manifest.json     默认清单（24 条）
├── assets/vo/        Kokoro 配音片段 + index.json（入库）
├── js/
│   ├── shots.js      六个镜头：相机意图、瓶子姿态、字幕、后期
│   ├── bottle.js     瓶子：玻璃、液体与涟漪、颈圈、喷头、瓶盖；分解与部件锚点
│   ├── glass.js      玻璃与液体的分层折射、焦散
│   ├── drop.js       落进瓶里的那一滴
│   ├── spray.js      喷雾粒子
│   ├── score.js      配乐与音效
│   └── worlds/
│       ├── common.js     反射环境、天色与雾、天空球、水珠、漂浮粒子、雾团与光斑
│       ├── studio.js     中性影棚（?world=studio）
│       ├── whitetea.js   白茶 · 晨雾茶山
│       ├── osmanthus.js  桂花 · 金秋逆光
│       ├── seasalt.js    海盐 · 海边的光
│       └── rose.js       玫瑰 · 暗红丝绒
└── test/             npm test：瓶子、数据与清单、水滴与喷雾、玻璃、构图、字幕尺寸、配乐、配音、世界
```

**渲染要点**
- 场景按香型重建。每个世界是 `js/worlds/` 下的一个模块，`build(ctx)` 把地面、远景、灯光和漂浮粒子加进场景，然后返回：
  - 反射环境（`env`）和雾（`haze`）；
  - 调色（`post`）；
  - 微距主料与它的机位（`macro`）；
  - 每帧更新、复位用的 `update`、`reset`。反射环境里总有几条隐藏的长条灯，让玻璃棱边在任何世界里都亮得出来。
- 玻璃和液体分四遍画进同一个 HDR 目标：第 0 层世界、第 1 层液体（采样世界）、第 2 层玻璃（采样世界 + 液体）、第 3 层挡在瓶前的喷雾。每一遍都把上一遍解析出来的画面当作「背后的画面」采样。透过玻璃看进内腔的地方，写的是背后东西的深度，所以对焦在瓶里的水滴上时，前壁不会把它糊掉。
- 水滴、涟漪、喷雾、漂浮粒子都是闭式的：位置、大小、透明度只由（种子, 序号, 镜头本地时间）算出，不做逐帧模拟，所以拖动时间轴和顺序播放画面一致。
- 各镜头框取什么、从什么角度看，写在 `meta.js` 的 `VIEW` 表里。构图测试用同一张表检查：瓶子在每种比例下都留在安全区里，而且不压字幕区。
- 字幕的入场时刻相对 `s.from`，所以 6 秒版从中段切入的镜头，字幕照样完整入场。字体按每个变体实际要画的字符加载。Node 测试用一个只会偏宽的量字模型检查每段文字在每个区、每种比例、每种语言下都放得下。

## 局限

- 瓶子和场景都是程序建模，追求的是香水广告的光感和质感，不是照片级真实。焦散是按光线网格近似的，不是光线追踪：桂花 9:16、1:1 的片尾卡上，一道彩色焦散会从文字块左下方穿过（价格仍然看得清）。
- Kokoro 的中文偶尔会读错字或断错句。每句都很短，也有缓存，发现问题就改写这一句重新生成。
- 语言只有中英两种，长度只有 15 秒和 6 秒。加语言要加一套文案和字体；加长度要加一个剪辑表、一版编曲和一组配音时段。
- 画面比例固定三种，由引擎决定（见 [factory/README.md](../factory/README.md#局限)）。
````

The world descriptions and the music come from the headers of `js/worlds/*.js` and `js/score.js`. Check the other numbers against your tree:
- the voice-over's clip count and size: `ls 03-perfume/assets/vo/*.mp3 | wc -l; du -sh 03-perfume/assets/vo` gives `64` and `912K`;
- the batch time, fps range and total MB under 批量出片 come from the reference run in Steps 6 and 7. If your run differs, put your numbers in.

Run: `node factory/render.mjs 03-perfume --dry | head -1; node factory/render.mjs 03-perfume --sku rose --ar 9x16 --cut 6 --promo '*' --dry | head -1; node factory/render.mjs 03-perfume --all --dry | head -1; node factory/render.mjs 03-perfume --all --vo '*' --dry | head -1`
Expected: the counts the README gives:
```
03-perfume: 24 videos, 8640 frames at 30 fps, 2 workers → 03-perfume/out
03-perfume: 3 videos, 540 frames at 30 fps, 2 workers → 03-perfume/out
03-perfume: 144 videos, 45360 frames at 30 fps, 2 workers → 03-perfume/out
03-perfume: 288 videos, 90720 frames at 30 fps, 2 workers → 03-perfume/out
```

- [ ] **Step 3: The `new-film` skill**

`.claude/skills/new-film/SKILL.md`:

````markdown
---
name: new-film
description: Turn a storyline prompt into a new product film on the shared factory engine in opus55-showcase/factory — storyboard for approval, scaffold NN-name/, build and review shots one at a time in every aspect ratio and language, then voice-over, batch render and gallery review. Use when the user asks for a new film, product video, ad or video template in this showcase.
---

# new-film

This skill turns a storyline into a film directory `NN-name/` that plugs into the factory engine. The engine already does the clock, edit lists, framing per aspect ratio, captions, post, mixing, preview page, review tools, batch render and gallery. A film only supplies data and shot functions.

**The contract is [`factory/README.md`](../../../factory/README.md). Read it in full before writing any code.** It lists every field the engine reads, the exact command flags, and a minimal working film (`99-demo`, under 新片起步) to copy. The finished example is `03-perfume/`.

Run every command from `opus55-showcase/`. Node 22 is required. Rendering needs Playwright's Chromium on a real GPU and ffmpeg on PATH.

## Ground rules

- **Don't change `factory/` for one film.** If the film needs something the engine lacks, stop and tell the user what is missing. An engine change is its own piece of work, with engine tests.
- **Frames are pure functions of (variant, t).** Nothing a shot does per frame may call `Math.random`, `Date.now` or `performance.now`. Use `factory/engine/rng.js` for randomness and `particles.js` (`drift`) for particles. Put everything a shot mutates back in `reset(ctx)`, because a dissolve evaluates two shots in one frame and scrubbing visits shots in any order.
- **Work in frame fractions, never pixels.** `ctx.W` and `ctx.H` are scaled down in the live preview.
- **Brands:** use a fictional brand unless the user owns the real one, and say so in the film's README.
- **Long commands** (`render.mjs`, `check.mjs` on a big film) run in the background. Poll their output; don't block on them.

## 1. Storyboard: get approval before any code

From the user's storyline, write the following and **wait for the user to approve or edit them**:

1. **A shot table** with these columns:

   | # | Time (s) | Shot id | Picture | Caption zh | Caption en | Hit point | Sound |
   |---|---|---|---|---|---|---|---|

   Shot ids are short lowercase names such as `macro` or `hero`. Durations should add up to each cut's length. Place hit points (a landing, a logo) on a musical grid, e.g. a 3 s bar.
2. **The variant axes**, first value = default. A `cut` axis is **mandatory**, with one edit list per value. `ar` and `vo` come from the engine; don't declare them. Also list which axes rebuild the scene (`sceneAxes`).
3. **The edit list for every cut**: entries `{ shot, dur, from?, transition? }`, `hits`, and a `cover` time. A short cut should reuse shots with `from` rather than new shots.
4. **Voice-over lines** (if any). For each line, give its id, text per language, start time and maximum length, and a voice per language. Spell numbers out in words.
5. **The default manifest**: which combinations to render, and how many videos that is.

## 2. Scaffold `NN-name/`

Take the next free number. Copy the `99-demo` skeleton from `factory/README.md` (新片起步) and adapt it:

- `meta.js` holds `export const META = { id, axes, sceneAxes, cuts, fileName }`. Node scripts read it without Three.js. Two rules:
  - **`id` must equal the directory name.**
  - **`fileName(v)` must encode every axis that changes the output.** Jobs are de-duplicated by file name. Encode `vo` too, but only if the film has voice-over.
- `film.js` exports `{ ...META, layouts, fonts, setup, reset, shots, score?, voLines?, audition? }`. `vo.mjs` imports it in Node, so it must not touch `window` or `document` at module top level.
- `index.html` needs one `@font-face` stylesheet per font family *and weight* that `fonts(v)` returns. System fonts are rejected. Copy the importmap and the `boot(film)` script from `03-perfume/index.html`.
- Tables as separate modules, as in 03 (`skus.js`, `copy.js`, `captions.js`, `layouts.js`), once the film has more than a few values.
- `layouts[ar][shot] = { anchor, size, maxW?, zones }` for every aspect ratio and every shot in any cut.
- `manifest.json` with the approved jobs.
- `test/*.test.mjs` (`node:test`), picked up by `npm test`. Include a text-fit test using `approxMeasure` from `factory/engine/text.js`.

Start with a placeholder for every shot: a `fit` camera on the subject's box, plus the approved captions. Then confirm the scaffold runs:

```bash
npm test
node factory/check.mjs NN-name
npm run serve          # open http://127.0.0.1:8765/NN-name/ and try every picker
```

If the page fails to start, the scripts print `page never created window.__app`. The real cause is on the `page:` line under it. Common ones are listed in `factory/README.md` (常见报错).

## 3. Build shots one at a time

For each shot, in story order:

1. Implement it: camera intent, subject motion from `s.lt` or `s.u`, captions (entry times relative to `s.from`) and post.
2. Review it in **every aspect ratio and every language**:
   ```bash
   node factory/sheet.mjs NN-name --safe --t <two or three times inside this shot>
   node factory/snap.mjs NN-name --t <time> --ar 16x9 --lang en      # full-size detail
   ```
   Open the PNGs from `NN-name/out/sheet/` and `NN-name/out/snap/` and look at them. Check four things:
   - the subject is inside the frame and out of the red (platform UI) areas;
   - captions sit in their yellow zones;
   - English wraps by word;
   - nothing is boxed red for overflow.

   Both scripts exit 1 on overflow. For other axis values, use `--<axis> value` (e.g. `--sku rose`).
3. Show the user the sheet. Go on to the next shot only when they are happy with this one.

When all shots are in, run `node factory/check.mjs NN-name`. Pay particular attention to `determinism`: it fails when `reset` misses some state a shot changed.

## 4. Sound and voice-over

- `score(v, built)` returns `{ notes, reverb }` using the voices in `factory/engine/audio.js`. Align notes to `built.hits`. A film with no `score` renders silent videos, and its voice-over is dropped too. So a narrated film needs a `score`, even if it is only a quiet bed. `{ notes: [] }` works while a variant has narration, but a mix that comes out completely silent (for example `vo: off` with no notes) fails the loudness step with `… is silent`.
- `voLines(v)` returns `[]` when `v.vo === 'off'`. Its lines must not depend on `ar`, and an id must have the same text in every variant.
- Voice choice:
  ```bash
  node factory/vo.mjs NN-name --audition   # every voice in film.audition reads the default lines → NN-name/out/audition/
  ```
  The user picks the voices. Then:
  ```bash
  node factory/vo.mjs NN-name --dry        # the lines that will be generated
  node factory/vo.mjs NN-name              # generate NN-name/assets/vo/ (committed)
  ```
  `--audition` and generation call the deployed Kokoro Lambda through `ai-ml/aigc/audio_models/Kokoro/tts.sh`, so they need AWS credentials. **Ask the user before running them.** `--dry` makes no calls.
  - A line that doesn't fit its slot even at 1.15× speed must be shortened in the copy.
  - A Kokoro misreading is fixed by rewording that line and regenerating.

## 5. Render and review

```bash
node factory/render.mjs NN-name --dry    # always first: check the list and the count
node factory/render.mjs NN-name          # the manifest; resumable, skips finished videos
npm run serve                            # then open http://127.0.0.1:8765/factory/gallery.html?film=NN-name
```

- A misspelt `--<axis>` name on the command line is ignored silently. If no valid axis is left, the script falls back to the manifest. The `--dry` count catches this.
- Each video is checked after encoding: duration, size, frame count, audio, −14 ± 1 LUFS and true peak ≤ −1 dBTP. Failures are listed at the end and in the gallery.
- Review the gallery with the user: every group, every filter, and a few videos played with sound.

## 6. Finish

- Write `NN-name/README.md` in Chinese, in the style of `02-devastator/README.md` and `03-perfume/README.md`:
  - intro;
  - 看点 table;
  - 运行, with the variant axes, debug params and batch commands;
  - 实现, with a file tree and 渲染要点;
  - 局限.
- Add a row to the case table in the showcase `README.md`, and the film's URL under 运行.
- Run `npm test`. Commit the film directory, including `assets/vo/`. Leave `out/` out; it is gitignored.
````

Run: `head -4 .claude/skills/new-film/SKILL.md; ls factory/README.md`
Expected: the frontmatter `---`, `name: new-film`, `description: …`, `---`, then `factory/README.md`. That is the file the skill's link (`../../../factory/README.md`) resolves to.

- [ ] **Step 4: The showcase index**

Make these exact replacements in `README.md`:

1. Replace:

```markdown
| 02 | [大力神 · 挖地虎合体](02-devastator/) | 实时 3D 动画（Three.js） | 铲土机、搅拌机、拖斗、吊钩、清扫机、推土机依次变形、对接，合成手持紫色步枪的 G1 大力神。模型、PBR 金属材质、纹理、音效和原创进行曲配乐全部由代码程序生成，带分镜运镜、GTAO 与泛光 |
```

   with:

```markdown
| 02 | [大力神 · 挖地虎合体](02-devastator/) | 实时 3D 动画（Three.js） | 铲土机、搅拌机、拖斗、吊钩、清扫机、推土机依次变形、对接，合成手持紫色步枪的 G1 大力神。模型、PBR 金属材质、纹理、音效和原创进行曲配乐全部由代码程序生成，带分镜运镜、GTAO 与泛光 |
| 03 | [闻境 · 香水产品视频工厂](03-perfume/) | 商品视频工厂（Three.js + Node 批量出片） | 虚构品牌「闻境」的 15 秒香水广告：程序建模的八角玻璃瓶，玻璃与液体分层折射、带焦散，四款香型各有自己的场景和合成配乐，配 Kokoro 配音。同一个模板按比例、香型、语言、长度、活动和配音批量出 MP4、封面和画廊。共用的 [factory 引擎](factory/) 和 `new-film` 技能供后续案例接入 |
```

2. Replace:

```bash
python3 -m http.server 8765
# 打开 http://localhost:8765/01-lantingxu/
#     http://localhost:8765/02-devastator/
```

   with:

```bash
npm run serve            # 或 python3 -m http.server 8765
# 打开 http://127.0.0.1:8765/01-lantingxu/
#     http://127.0.0.1:8765/02-devastator/
#     http://127.0.0.1:8765/03-perfume/
```

3. Replace:

```markdown
## 参考
```

   with:

```markdown
从 03 起，批量出片、测试和审片工具都在 [factory/](factory/README.md) 里，要先 `npm install`（另需 Node 22 和 ffmpeg）。出片用 `node factory/render.mjs 03-perfume`，出完打开 `http://127.0.0.1:8765/factory/gallery.html?film=03-perfume` 看画廊。要从一段故事梗概起一部新片，在本目录运行 Claude Code，让它按 `new-film` 技能（`.claude/skills/new-film/`）来做。

## 参考
```

`npm run serve` (`node factory/lib/serve.mjs 8765`) needs no `npm install`: it uses only Node built-ins.

Run: `npm run serve`, then `for u in 01-lantingxu/ 02-devastator/ 03-perfume/ factory/gallery.html; do curl -s -o /dev/null -w "$u %{http_code}\n" http://127.0.0.1:8765/$u; done`
Expected: `200` for all four. Stop the server.

- [ ] **Step 5 (optional): Prove the contract with a throwaway film**

This step follows the factory README's 新片起步 section literally. It checks that a film built only from the README runs through every tool. The four files hold the same code as the README; `meta.js` and `film.js` add a header comment.

`99-demo/meta.js`:

```js
// meta.js — 99 · 演示片骨架（纯数据）：轴、剪辑表、文件命名。render.mjs / check.mjs 在 Node 里直接读它
export const META = {
  id: '99-demo',
  axes: { color: ['teal', 'coral'], lang: ['zh', 'en'], cut: [3] },
  sceneAxes: ['color'],
  cuts: {
    3: {
      shots: [{ shot: 'turn', dur: 1.5 }, { shot: 'card', dur: 1.5, transition: { type: 'dissolve', dur: 0.3 } }],
      hits: { card: 1.5 }, cover: 2.4,
    },
  },
  fileName: v => `demo_${v.color}_${v.cut}s_${v.ar}_${v.lang}`,
};
```

`99-demo/film.js`:

```js
// film.js — 99 · 演示片：一个旋转的环结 + 一行标题，两个镜头、3 秒；只用来验证 factory/README.md 的成片约定
import { META } from './meta.js';

const COLOR = { teal: '#2f9fb2', coral: '#e8735a' };
const TITLE = { zh: '一个模板，批量出片', en: 'One template, every format' };
const FONT = { family: 'Noto Sans SC', weight: 700 };

const zones = (title, sub) => ({ zones: { title, sub } });
const LAYOUTS = {
  '9x16': { turn: { anchor: [0.45, 0.36], size: 0.34, ...zones([0.08, 0.62, 0.74, 0.08], [0.08, 0.7, 0.74, 0.05]) }, card: { anchor: [0.45, 0.3], size: 0.24, ...zones([0.08, 0.5, 0.74, 0.08], [0.08, 0.58, 0.74, 0.05]) } },
  '1x1': { turn: { anchor: [0.5, 0.4], size: 0.5, ...zones([0.08, 0.76, 0.84, 0.1], [0.08, 0.86, 0.84, 0.07]) }, card: { anchor: [0.5, 0.34], size: 0.36, ...zones([0.08, 0.62, 0.84, 0.1], [0.08, 0.72, 0.84, 0.07]) } },
  '16x9': { turn: { anchor: [0.68, 0.5], size: 0.6, maxW: 0.5, ...zones([0.07, 0.4, 0.43, 0.14], [0.07, 0.54, 0.43, 0.08]) }, card: { anchor: [0.7, 0.5], size: 0.45, maxW: 0.5, ...zones([0.07, 0.4, 0.43, 0.14], [0.07, 0.54, 0.43, 0.08]) } },
};
const layers = (v, s) => [
  { id: 'title', zone: 'title', text: TITLE[v.lang], lang: v.lang, font: FONT, size: 0.06, align: 'center', valign: 'middle', color: '#f4f1e8', in: [s.from + 0.2, s.from + 0.7] },
  ...(s.name === 'card' ? [{ id: 'sub', zone: 'sub', text: `99-demo · ${v.color}`, lang: 'en', font: FONT, size: 0.036, align: 'center', color: '#b8c4c8', in: [0.3, 0.8] }] : []),
];

export default {
  ...META,
  layouts: LAYOUTS,
  fonts: v => [{ ...FONT, text: `${TITLE[v.lang]}99-demo · ${v.color}` }],
  async setup(ctx) {
    const { THREE, scene } = ctx;
    scene.background = new THREE.Color('#14181c');
    const key = new THREE.DirectionalLight('#ffffff', 2.5);
    key.position.set(2, 3, 2);
    scene.add(key, new THREE.HemisphereLight('#b0c8ff', '#202020', 0.8));
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.3, 0.1, 160, 24), new THREE.MeshStandardMaterial({ color: COLOR[ctx.variant.color], roughness: 0.35, metalness: 0.2 }));
    knot.position.y = 0.45;
    scene.add(knot);
    ctx.subjects.knot = knot;
    ctx.subjects.box = new THREE.Box3().setFromObject(knot);
    ctx.postDefaults = { vignette: 0.3 };
  },
  reset(ctx) { ctx.subjects.knot.rotation.set(0, 0, 0); },
  shots: {
    turn(ctx, s) {
      ctx.subjects.knot.rotation.y = s.lt * 1.2;
      return { camera: { box: ctx.subjects.box, dir: [0, 0.25, 1], fov: 30 }, text: layers(ctx.variant, s) };
    },
    card(ctx, s) {
      ctx.subjects.knot.rotation.y = 1.8 + s.lt * 0.6;
      return { camera: { box: ctx.subjects.box, dir: [0.4, 0.3, 1], fov: 30 }, text: layers(ctx.variant, s), post: { exposure: 1.1 } };
    },
  },
  score: (v, built) => ({
    notes: [
      { t: 0, voice: 'pad', f: 220, d: 3, v: 0.8 },
      { t: 0, voice: 'bell', f: 880, d: 1.2, v: 0.6, bus: 'sfx' },
      { t: built.hits.card, voice: 'bell', f: 1320, d: 1.2, v: 0.6, bus: 'sfx' },
    ],
    reverb: { decay: 1.5, music: 0.3, sfx: 0.2 },
  }),
};
```

`99-demo/manifest.json`:

```json
{ "jobs": [
  { "color": ["*"], "ar": ["1x1"], "lang": ["zh"], "cut": [3] }
] }
```

`99-demo/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>99 · demo</title>
  <link rel="icon" href="data:," />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5/700.css" />
  <link rel="stylesheet" href="../factory/engine/player.css" />
  <script type="importmap">
    {
      "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
      }
    }
  </script>
</head>
<body>
  <main id="stage"></main>
  <script type="module">
    import { boot } from '../factory/engine/app.js';
    import film from './film.js';
    boot(film);
  </script>
</body>
</html>
```

Run: `node factory/check.mjs 99-demo; echo "exit $?"`
Expected (the times vary):
```
ok    gpu          ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)
ok    fonts        700 Noto Sans SC  (1746 ms to first frame)
ok    determinism  3 frames identical forward and backward
ok    voice-over   the film has no voLines: no narration
ok    audio        3 s identical twice, peak -20.5 dBFS, 67 ms
ok    overflow     2 variants, no caption overflows  (0.0 s)
ok    speed        57 ms/frame at 1080×1080 (draw + PNG, before encoding) → manifest 180 frames ≈ 0.2 min on one worker
all checks passed
exit 0
```

Run: `node factory/sheet.mjs 99-demo --safe; node factory/snap.mjs 99-demo --t 0.8,2.4 --ar 9x16 --lang en --color coral; echo "exit $?"`
Expected:
- `sheet_teal_3_on_9x16-1x1-16x9_zh-en  1086×2286  … s  gpu: …`, then `  → 99-demo/out/sheet/sheet_teal_3_on_9x16-1x1-16x9_zh-en.png`;
- then `demo_coral_3s_9x16_en  1080×1920  3s  gpu: …`, `  fonts: 700 Noto Sans SC`, and two lines `  t=0.8 turn  … → 99-demo/out/snap/demo_coral_3s_9x16_en_t0.8.png` and `  t=2.4 card  …`;
- `exit 0`.

Open the sheet. It has six rows (three aspect ratios × zh, en), each with the turning knot and its title in the yellow zone, and the second frame with the `99-demo · teal` line under the title. The English title wraps by word.

Run: `node factory/vo.mjs 99-demo --dry; echo "exit $?"`
Expected: `99-demo has no voLines: nothing to do`, `exit 0`, and no `99-demo/assets/` directory.

Run: `node factory/render.mjs 99-demo; node factory/render.mjs 99-demo; echo "exit $?"`
Expected:
- The first run:
  ```
  99-demo: 2 videos, 180 frames at 30 fps, 2 workers → 99-demo/out
  [1/2] demo_teal_3s_1x1_zh  90 frames  12.0 s (7.5 fps)  2.9 MB
  [2/2] demo_coral_3s_1x1_zh  90 frames  12.2 s (7.4 fps)  3.0 MB
  done 2, skipped 0, failed 0  ·  0.2 min  ·  99-demo/out/index.json
  ```
  Both sidecars have `"audio": true`, `"lufs": -14` and `"tp": -2.7` in the reference run (the acceptance line is −1 dBTP).
- The second run prints `skip (done)` for both, then `done 0, skipped 2, failed 0` and `exit 0`.

With `npm run serve` running, open `http://127.0.0.1:8765/factory/gallery.html?film=99-demo`.
Expected: `99-demo · 成片画廊`, `2 / 2 条 · 5.8 MB · 6 s`, and filter rows for `ar` (1x1), `lang` (zh), `cut` (3) and `vo` (on). There are two groups, `teal` and `coral`, one video each, captioned `… MB · 3 s · -14.0 LUFS`.

Then delete the film, which is not committed:

Run: `rm -rf 99-demo && git status --short 99-demo`
Expected: no output.

- [ ] **Step 6: The default batch**

Run: `node factory/check.mjs 03-perfume; echo "exit $?"`
Expected (the times vary):
```
ok    gpu          ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)
ok    fonts        600 Noto Serif SC, 500 Noto Serif SC, 600 Cormorant Garamond, 700 Noto Sans SC  (2387 ms to first frame)
ok    determinism  14 frames identical forward and backward
ok    voice-over   56 lines in 24 variants: every clip present, current, inside its slot
ok    audio        6 s identical twice, peak -9.5 dBFS, 310 ms · 15 s identical twice, peak -8.5 dBFS, 1089 ms
ok    overflow     24 variants, no caption overflows  (6.1 s)
ok    speed        123 ms/frame at 1080×1920 (draw + PNG, before encoding) → manifest 8640 frames ≈ 17.6 min on one worker
all checks passed
exit 0
```
Some of these lines are fixed by structure:
- **determinism, 14 frames:** the 6 s cut has 3 entries and 2 transitions, and the 15 s cut has 6 entries and 3 dissolves.
- **voice-over, 56 lines:** 16 variants at 15 s with three lines each, plus 8 at 6 s with one.
- **The speed line** is measured on the first variant in scene order, osmanthus 15 s 9:16.

Run: `node factory/render.mjs 03-perfume --dry | head -1`
Expected: `03-perfume: 24 videos, 8640 frames at 30 fps, 2 workers → 03-perfume/out`.

The full batch takes several minutes. Run it in a terminal of its own, or in the background, and watch the log:

Run: `node factory/render.mjs 03-perfume > /tmp/t21-render.log 2>&1; echo "exit $?" >> /tmp/t21-render.log`, and follow it with `tail -f /tmp/t21-render.log`.
Expected:
- The header line as in the dry run.
- 24 lines like `[1/24] wenjing_whitetea_15s_9x16_zh  450 frames  … s (… fps)  … MB`: 16 at 450 frames and 8 at 180 frames. The reference run went at 4.7–9.7 fps per video: 9:16 is the slowest and 1:1 the fastest.
- The last lines are `done 24, skipped 0, failed 0  ·  … min  ·  03-perfume/out/index.json` and `exit 0`. The reference run took 11.6 min.
- `03-perfume/out/` holds 24 `.mp4` files, each with a `_cover.jpg` and a `.json`, plus `index.json`. No `.mp4.part` is left.

Run: `node -e 'const j=require("./03-perfume/out/index.json");const v=j.videos;console.log(v.length,j.failed.length,Math.min(...v.map(m=>m.lufs)),Math.max(...v.map(m=>m.lufs)),Math.max(...v.map(m=>m.tp)),(v.reduce((s,m)=>s+m.bytes,0)/1e6).toFixed(1)+" MB",v.reduce((s,m)=>s+m.duration,0)+" s")'`
Expected: `24 0`, then:
- LUFS within −14 ± 1 (−14.1 to −14.0 in the reference run);
- a highest true peak of −1 dBTP or lower (−1.7 in the reference run). The encoder aims for −1.5 and re-encodes up to four times;
- the total size (322.8 MB in the reference run);
- `288 s`.

The film README's 批量出片 section quotes these minutes, fps range and MB. If your run differs by much, put your numbers in.

Run the batch again: `node factory/render.mjs 03-perfume; echo "exit $?"`
Expected: `skip (done)` 24 times, then `done 0, skipped 24, failed 0` and `exit 0`, within a few seconds.

- [ ] **Step 7: Review in the gallery**

With `npm run serve` running, open `http://127.0.0.1:8765/factory/gallery.html?film=03-perfume` in Chrome.

Expected:
- The title reads `03-perfume · 成片画廊`, with `24 / 24 条 · 322.8 MB · 288 s` (your MB may differ slightly) and no red failure line.
- The filter rows are:
  - `ar`: 9x16, 1x1, 16x9;
  - `lang`: zh, en;
  - `cut`: 15, 6;
  - `promo`: none, 1111, launch;
  - `vo`: on.
- There are four groups in scent order: `whitetea`, `osmanthus`, `seasalt`, `rose`. Each has 6 videos (`sku · 6 条`), and each cover is shown at its own aspect ratio.
- Filters: `promo 1111` leaves 8 videos, all 6 s at 9:16 or 1:1. `lang en` leaves the 4 16:9 launch videos. The choice is kept in the URL.
- Hovering plays a video muted. Clicking one opens it with sound.

Watch at least one video per scent. Check for each:
- its own world, liquid colour, cap and music;
- the voice-over in its slots over the ducked music;
- nothing clipped at either end.

Then check the promo cards:
- a `1111` video shows the red 双11 ribbon, the deal price with a pop, and the struck-through regular price;
- a `launch` video (English, 16:9) ends on New Arrival, the travel-spray gift and Shop now.

- [ ] **Step 8: Run all tests**

Run: `npm test`
Expected: PASS, 145 tests. This task adds no tests.

- [ ] **Step 9: Commit**

```bash
git add factory/README.md 03-perfume/README.md .claude/skills/new-film/SKILL.md README.md
git commit -m "Document the factory engine and the 闻境 film, add the new-film skill and the showcase index row

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
