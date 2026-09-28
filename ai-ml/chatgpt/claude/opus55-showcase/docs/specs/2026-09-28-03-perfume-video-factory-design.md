# 03 · 闻境 Perfume Product-Video Factory — Design

Date: 2026-09-28 · Status: approved; amended after planning (§14) · Branch: `opus55-03-perfume-factory`

## 1. Goal

Third case of the Opus 5.5 HTML animation / video showcase, and the first of four e-commerce cases
(03 product-video factory → 04 personalized year-in-review → 05 bubble-tea commercial → 06 parcel journey).

It demonstrates two things:

1. **Commercial product film quality** — a procedurally built perfume bottle with glass, liquid, caustics and
   four distinct "scent worlds", in the visual language of a fragrance ad.
2. **Template → batch production** — one film template renders every combination of aspect ratio, colour
   option, language, cut length, promo overlay and voice-over as a batch of platform-ready MP4s, with covers
   and a gallery. This is the business pitch: e-commerce teams need thousands of product videos
   (主图视频, Douyin/Taobao shorts, Amazon listing videos).

The generic parts become a shared **factory engine** that cases 04–06 plug into, plus a Claude Code skill
(`new-film`) so a new storyline prompt can be turned into a new film against the same engine.

These films are for e-commerce, not physical display. Priorities are phone-feed legibility, product clarity at
thumbnail size, and a first-second hook. Commercial look wins over optical accuracy.

## 2. Decisions from brainstorming

| Topic | Decision |
|---|---|
| Product | Perfume bottle, fictional brand **闻境 WENJING** (placeholder name) |
| Variant axes | Aspect ratio · colour option (SKU) · language · cut length + promo overlay; plus a voice-over on/off flag |
| Art direction | A world per scent (白茶 / 桂花 / 海盐 / 玫瑰) |
| Stack | Three.js 0.170 page, no build step (same as 02) + Node/Playwright/ffmpeg rendering script |
| Prompt-driven creation | Level 2 now: shared engine + film contract + `new-film` Claude Code skill. Level 3 (prompt → storyboard via Claude on Bedrock) is deferred to case 04 |
| Voice-over | Kokoro-82M through the already-deployed `kokoro-tts:live` Lambda (`ai-ml/aigc/audio_models/Kokoro/tts.sh`), not Amazon Polly. Voices `zm_yunxi` (zh) and `bf_emma` (en), chosen by audition |
| Rendered videos | Written to a gitignored `out/`, not committed |

## 3. Scope

**In scope**
- Shared factory engine, rendering script, gallery, voice-over script, film contract docs, `new-film` skill.
- Film `03-perfume`: bottle, glass/liquid rendering, four worlds, six shots, 15 s and 6 s cuts, three aspect
  ratios, zh/en copy, three promo presets, four synthesized scores + sound effects, Kokoro voice-over.
- Chinese READMEs for `factory/` and `03-perfume/`; a new row in the showcase index.

**Out of scope for 03** (each is a later data or engine addition)
- 30 s cut, languages beyond zh/en.
- Prompt → storyboard generation (case 04), AWS batch-rendering pipeline (case 04).
- Real fluid or cloth simulation (case 05).
- Real brands or trademarks.

## 4. The film

### 4.1 Shots

Each shot is a pure function of its local time. Times below are for the 15 s cut.

| Time | Shot | Content |
|---|---|---|
| 0–2.25 s | `macro` | The scent's key ingredient in extreme close-up with light moving across it (a tea bud with two leaves, osmanthus florets, a salt crystal on wet rock, a rose petal). A dew drop gathers at its tip and lets go in the last 0.25 s. Something striking in the first second |
| 2.25–4.5 s | `drop` | Hard cut into the bottle, where the same drop is already falling along the same curve. The camera follows it down. It lands in the liquid off-centre at 3.0 s; the surface ripples in expanding, fading rings; the camera pulls back to reveal the bottle |
| 4.5–7.5 s | `hero` | Dissolve in. Slow orbit, a streak of light runs across the glass facets and peaks at 6.0 s. Scent name and brand fade in |
| 7.5–10.5 s | `anatomy` | Cap, collar, spray pump (with dip tube) and bottle pull apart into an exploded view. Three labels with leader lines: top / heart / base notes (前调 / 中调 / 后调), plus "50 ml · Eau de Parfum". The parts reassemble |
| 10.5–12.0 s | `spray` | Dissolve in. The cap floats up off the pump, one spray. The mist catches the backlight and drifts into the world's particles; the cap seats again |
| 12.0–15.0 s | `end` | Dissolve in. The bottle at rest in its world. Logo, tagline, call to action. With a promo preset, the call to action is replaced by the promo card |

Every shot boundary and hit point lies on a 1.5 s grid, so the music can put every hit on a downbeat (§8.1).

### 4.2 Cuts as data

A cut is `{ shots, hits, cover }`. `shots` is an ordered edit list; each entry is
`{ shot, dur, from = 0, transition = { type: 'cut' } }`.
- `from` starts the shot part-way into its own local time.
- `transition` belongs to the entry it leads into: `{ type: 'cut' | 'flash' | 'dissolve', dur }`. Transitions
  don't overlap entries or change the total length; during a dissolve the outgoing shot keeps playing past its `dur`.

Shots receive `s = { name, lt, dur, u, from, t, row }`, with `lt = from + (t − entry start)`, `dur = from + entry dur`
and `u = lt / dur` clamped to 0–1, so retiming a shot never requires new animation. `row` is the shot's layout row (§5.1).

```js
cuts: {
  15: { shots: [ {shot:'macro',dur:2.25}, {shot:'drop',dur:2.25},
                 {shot:'hero',dur:3.0,transition:{type:'dissolve',dur:0.3}}, {shot:'anatomy',dur:3.0},
                 {shot:'spray',dur:1.5,transition:{type:'dissolve',dur:0.25}},
                 {shot:'end',dur:3.0,transition:{type:'dissolve',dur:0.4}} ],
        hits: { land: 3.0, streak: 6.0, logo: 12.0 }, cover: 6.4 },
  6:  { shots: [ {shot:'drop',dur:1.5,from:0.75},
                 {shot:'hero',dur:1.5,from:0.75,transition:{type:'flash',dur:0.2}},
                 {shot:'end',dur:3.0,transition:{type:'dissolve',dur:0.3}} ],
        hits: { land: 0, logo: 3.0 }, cover: 2.6 },
}
```

`hits` are named moments in cut time, used by the score and the sound effects: drop landing, peak of the light
streak, logo hit. `cover` is the hero-reveal frame used for the cover image. The 6 s cut enters the drop shot at its
landing, so it opens on the splash.

### 4.3 Frame rate

30 fps by default (the platform standard; it halves render time). 60 fps is an option.

## 5. Variant system

A variant is `{ film, sku, ar, lang, cut, promo, vo }`. The live page reads it from URL parameters and the
rendering script reads it from a manifest. Each field picks a row from a data table; the renderer contains no
per-variant branches.

### 5.1 Aspect ratio (engine-level)

| `ar` | Size | Main use | Typical layout |
|---|---|---|---|
| `9x16` | 1080×1920 | Douyin, Taobao | Bottle upper-middle, text below |
| `1x1` | 1080×1080 | Main product image video | Bottle centred, text band along the bottom |
| `16x9` | 1920×1080 | Amazon, Tmall detail pages | Bottle on the right third, text on the left |

- Shots describe **intent**, not camera numbers: the subject (an Object3D; its bounding box is used), its anchor
  point in the safe frame, the fraction of safe-frame height it fills, plus the shot's own camera direction,
  orbit and focal length.
- The film supplies `layouts[ar][shot] = { anchor, size, maxW, align, zones: { name: [x, y, w, h] } }`.
- The framing solver computes camera distance from the size target, then uses `camera.setViewOffset` to move
  the subject to its anchor without turning the camera, so perspective is identical across ratios.
- **Safe areas:** 9:16 keeps text and product out of the zones Douyin/Taobao cover with their own on-screen
  icons and captions (right edge and bottom band). `?safe` overlays these zones in the live preview.

### 5.2 Colour options — `skus.js`

One entry per scent: id, names and fragrance notes per language, prices (CNY and USD), liquid colour and
absorption, cap finish, world id, particle type, colour palette, score preset, optional voice override.

| id | Scent | Liquid / cap | World |
|---|---|---|---|
| `whitetea` | 白茶 White Tea | Pale jade / brushed silver | Dawn tea terraces |
| `osmanthus` | 桂花 Osmanthus | Amber / polished gold | Golden autumn |
| `seasalt` | 海盐 Sea Salt | Pale aqua / frosted white | Ocean light |
| `rose` | 玫瑰 Rose | Deep ruby / black lacquer with gold rim | Dark velvet |

### 5.3 Language — `copy.js`

- `zh` and `en`. Each language picks its font, currency and voice (see §8.3).
- Fonts via jsDelivr fontsource (as in 02): 思源宋体 (Noto Serif SC) for Chinese display text, Cormorant
  Garamond for English display text, Noto Sans SC for price digits and promo badges. Canvas text needs its
  fonts loaded first, so the page loads the exact strings of the current variant (`fonts(v)`, §7.2) before the
  first frame, and fails if any face is missing or came back in a different weight.
- Text layout auto-fits each zone. Chinese wraps per character (with basic 避头尾 punctuation rules), English
  wraps per word, and the font shrinks down to a floor if a line still doesn't fit.
- A boxed layer (the promo ribbon, the buttons) fits its text plus the box's padding into the zone. Left- or
  right-aligned, the box's edge sits on the zone's edge.
- **Minimum text size:** body text is at least 3.5% of the frame's short side on 9:16 and 1:1 and at least
  3.0% on 16:9. A string that can't fit at the minimum size is never silently clipped: the preview draws a red
  overflow box and render mode fails the job.

### 5.4 Cut and promo

- `cut`: `15` or `6` (§4.2).
- `promo`: `none` | `1111` (双11 到手价, coupon ribbon) | `launch` (新品首发). Each preset is an end-card template
  that pulls price and copy from the scent and language tables. For `en`, `1111` reads "11.11 Global Shopping
  Festival" and prices show in USD.
- `vo`: `on` (default) | `off`.

### 5.5 Manifest and naming

`03-perfume/manifest.json` can list jobs one by one or give a grid to expand; `"*"` means every value of that axis.

```json
{ "jobs": [
  { "sku": ["*"], "ar": ["*"],          "lang": ["zh"], "cut": [15], "promo": ["none"]   },
  { "sku": ["*"], "ar": ["9x16","1x1"], "lang": ["zh"], "cut": [6],  "promo": ["1111"]   },
  { "sku": ["*"], "ar": ["16x9"],       "lang": ["en"], "cut": [15], "promo": ["launch"] }
] }
```

The default manifest above renders 12 + 8 + 4 = **24 videos** (voice-over on) and uses every sku, ar, lang, cut and promo value at least once. With `--all`,
the renderer expands the full grid of 4 × 3 × 2 × 2 × 3 = **144 videos** (voice-over on).

Output names: `out/wenjing_<sku>_<cut>s_<ar>_<lang>[_<promo>][_novo].mp4`, plus `…_cover.jpg` and a `….json` sidecar.

## 6. Bottle, materials, worlds

### 6.1 Bottle

- One mesh set that can be pulled apart for the exploded view. The same meshes are used assembled and exploded.
- **Glass:** a heavy octagonal flacon with rounded vertical edges, rounded top and bottom edges and a thick base.
  Its normals are computed from the exact outline, so every large face is flat right up to where its rounds start.
  Averaged normals would make each face act as a weak lens under refraction. The 闻境 · WENJING logo is frosted
  into the front face using a roughness map.
- **Parts:** gold collar with a lip and a groove, spray pump with a clear curved dip tube visible through the glass
  (its chamber hides in the thick shoulder), heavy faceted cap. The cap finish comes from the SKU. In the exploded
  view the parts lift far enough that the pump clears the lifted collar.
- **Liquid:** a body plus a surface mesh, with a meniscus that climbs the glass, kept 0.3 mm inside the cavity. After
  the drop lands off-centre, the surface is displaced by closed-form damped ring waves spreading from that point,
  computed purely from `t`.
- A soft contact shadow under the base.

### 6.2 Glass and liquid rendering

Three.js's built-in transmission draws every transmissive object against one blurred copy of the opaque scene, so
the liquid would vanish behind the glass. The film draws its own passes, by layer, into the one multisampled HDR scene
target. Each pass is resolved before the next one samples it:

1. Layer 0: the world, plus the collar, pump, tube, cap, caustic and contact shadow. A quarter-size copy with mips is
   kept for rays that leave the frame.
2. Layer 1, the liquid, refracting pass 1.
3. Layer 2, the glass, refracting passes 1 and 2.
4. Layer 3: translucent things in front of the bottle (the spray mist), drawn straight over the glass.

The liquid and glass keep `MeshPhysicalMaterial`'s lighting, Fresnel reflections from the world's reflection
environment, specular highlights and the logo's roughness map; only its transmission is replaced. Rays are traced
analytically through the glass, the cavity and the liquid, each a convex octagonal prism:
- per-channel IOR for colour fringing;
- Beer–Lambert absorption, so thicker liquid looks deeper in colour;
- total internal reflection in the solid glass, and a Fresnel split at every exit;
- a blurred view through the frosted logo.

Through clear glass, the glass writes the depth of what it shows, so depth of field can focus on the drop inside the
bottle.

Every world's reflection environment (a PMREM built from a procedural scene, as in 02) includes hidden long strip lights, so the glass edges read clearly.

**Caustics** are traced, not faked. From the key light, a 256 × 256 grid of rays for each colour channel, at that
channel's IOR, runs through the glass, the liquid surface (ripple included) and the liquid onto the ground under the
bottle. Each grid triangle's brightness is its source area over its landing area, so light is brighter where it is
focused. The glass and liquid cast no shadow themselves: a shadow-only proxy casts the bottle's shadow, and the caustic
adds back the light that passes through.

### 6.3 Worlds

A world is a module with a fixed interface:
`build(ctx) → { env, haze, post?, macro: { root, camera(s) → intent, post? }, update?(ctx, s), reset?(), dispose?() }`.
- `build` sets the background and adds the set pieces, lights, particle systems, the ingredient model for `macro`
  and the surface the bottle sits on. It never touches the renderer: `env` only describes the reflection environment,
  and the film turns it into `scene.environment`. So every world builds in Node tests.
- `post` is the world's colour grade. `haze` also colours the drop and the spray. `update` animates the world for the
  current shot, and `reset` restores what it changed.
- Every world has a shadow-casting key light and flat ground under the bottle, where the caustic lands.

| World | Setting | Macro ingredient | Particles |
|---|---|---|---|
| 白茶 dawn terraces | Tea rows along contour lines receding into mist, low-sun light rays, bottle on wet slate | A tea bud with two serrated leaves (一芽二叶) and a refractive dew drop | Mist wisps, a few drifting leaves |
| 桂花 golden autumn | Golden-hour backlight, a branch in silhouette, warm bokeh | Osmanthus floret cluster | Falling four-petal florets |
| 海盐 ocean light | White rock at the waterline, rippling water with caustics | Salt crystal cluster on wet rock | Spray droplets, salt crystals |
| 玫瑰 dark velvet | Draped velvet (displaced surface with a sheen material), one hard spotlight | Rose petal with a dew drop | Drifting petals |

### 6.4 Post-processing

Multisample anti-aliasing → depth of field with bokeh → gentle bloom (with a clamped input, as in 02) → AgX
tone mapping → per-world colour grade (lift/gamma/gain, saturation), film grain, vignette, and the flash and
dissolve transitions. Focus defaults to the distance the framing solver looks at (`focus: 'target'`), so every
shot is sharp on its subject without a hand-set distance. Text is composited after post, so it stays sharp.

### 6.5 Determinism

There is no step-by-step simulation. Every particle, petal and droplet follows a closed-form path from a seeded PRNG
(mulberry32), so any `t` renders the same frame regardless of what was rendered before. Scrubbing, the live
preview and batch rendering all rely on this. `film.reset(ctx)` restores every per-frame mutable before a shot is
evaluated, because a transition evaluates two shots in one frame and scrubbing visits times in any order.

## 7. Architecture

### 7.1 Layout

```
opus55-showcase/
├── package.json                devDependencies: playwright@1.57.0 (rendering), three@0.170.0 (tests only); npm test, npm run serve
├── .gitignore                  node_modules/, */out/
├── factory/                    shared by 03 onward
│   ├── engine/
│   │   ├── rng.js · ease.js · particles.js   seeded PRNG, easing, closed-form drifting particles
│   │   ├── variant.js          axes, URL / manifest parsing, grid expansion, file naming, safe areas
│   │   ├── timeline.js         edit list → current shot + local time, transitions, hit points
│   │   ├── framing.js          aspect ratio + shot intent → camera distance + view offset
│   │   ├── text.js             2D-canvas text layout, auto-fit, zh/en wrapping, min-size rule, boxes, leader lines
│   │   ├── mix.js              ducking curve, float WAV writer, clip keys (pure, tested in Node)
│   │   ├── post.js             MSAA scene target · DoF · bloom · AgX · grade · grain · vignette · flash / dissolve
│   │   ├── app.js              the frame loop: edit list → shot → framing → render → post → text
│   │   ├── player.js · player.css   live preview UI: variant pickers, scrubber, sound and quality switches
│   │   ├── sheet.js            `?sheet` contact sheet, `?safe` overlay
│   │   ├── audio.js            synth voices, note scheduler, VO placement + ducking, offline mix, preview playback
│   │   └── exporter.js         start(fps) / frame() / png() / cover() / audio()
│   ├── lib/                    serve.mjs (static server) · args.mjs · browser.mjs (Chromium + GPU check) · ffmpeg.mjs · jobs.mjs
│   ├── test/                   node --test unit tests for the engine
│   ├── check.mjs               node factory/check.mjs 03-perfume [--all]: pre-flight (§11)
│   ├── snap.mjs · sheet.mjs    one variant's frames → PNG; a contact sheet → PNG
│   ├── render.mjs              node factory/render.mjs 03-perfume [--all] [--<axis> v1,v2|'*'] [--force] [--workers N] [--fps 60] [--dry]
│   ├── vo.mjs                  node factory/vo.mjs 03-perfume [--audition] [--force] [--dry]
│   ├── gallery.html            gallery.html?film=03-perfume
│   └── README.md               film contract, commands (Chinese)
├── 03-perfume/
│   ├── index.html              importmap (three@0.170.0), @font-face, loads engine + film
│   ├── meta.js                 META: id, axes, sceneAxes, cuts, fileName (Node reads it without Three.js)
│   ├── film.js                 film definition (implements the contract)
│   ├── skus.js · copy.js · promos.js · captions.js · layouts.js
│   ├── manifest.json           default 24-job batch
│   ├── js/
│   │   ├── bottle.js           bottle meshes + explode rig
│   │   ├── glass.js            layered liquid/glass refraction, traced caustics
│   │   ├── drop.js · spray.js  the drop falling into the bottle, the spray mist
│   │   ├── shots.js            the six shots
│   │   ├── score.js            four arrangements + sonic logo + SFX cues (pure data)
│   │   └── worlds/             whitetea.js · osmanthus.js · seasalt.js · rose.js · common.js · studio.js (debug, ?world=studio)
│   ├── test/                   node --test tests: data, layouts, text fit, bottle, glass, worlds, effects, score, voice-over
│   ├── assets/vo/              generated voice-over clips (mp3 + index.json, committed)
│   ├── out/                    rendered MP4 + covers + sidecars + index.json (gitignored)
│   └── README.md               (Chinese)
└── .claude/skills/new-film/SKILL.md
```

### 7.2 Film contract

A film is two ES modules. `meta.js` exports `META = { id, axes, sceneAxes, cuts, fileName }`, which `render.mjs`,
`check.mjs` and the tests read without Three.js. `film.js` default-exports META's fields plus the rest:

```js
export default {
  id: '03-perfume',                        // = the directory name
  axes: { sku, lang, cut, promo },         // film axes; ar and vo are engine axes. A cut axis is required
  sceneAxes: ['sku'],                      // changing these rebuilds the scene; the others switch live
  cuts: { 15: { shots, hits, cover }, 6: {...} },   // §4.2
  fileName(v),                             // output base name; must encode every axis that changes the output
  layouts,                                 // layouts[ar][shot] = { anchor, size, maxW, align, zones }
  fonts(v),                                // → [{ family, weight, text }]: exact strings to preload for this variant
  async setup(ctx),                        // build the scene for ctx.variant.sku
  reset(ctx),                              // restore every per-frame mutable before a shot is evaluated
  shots: { macro(ctx, s), drop, hero, anatomy, spray, end },   // pure: set scene state, return { camera: intent, text: layers, post }
  render(ctx, target),                     // optional: draw the scene into the HDR target (03: the glass passes); default renderer.render
  score(v, built),                         // → { notes, reverb }: note events on the music and sfx buses (§8.2)
  voLines(v),                              // → [{ id, text, voice, speed, at, max }]: the narration (§8.3)
  audition: { [lang]: [voice, …] },        // candidate voices for vo.mjs --audition
}
```

`ctx = { THREE, renderer, scene, camera, variant, W, H, ar, post, clips, world, subjects, postDefaults, built, mode, params }`,
where `mode` is `'live'`, `'sheet'` or `'render'` and `params` is the page's `URLSearchParams`. `s` is as in §4.2.
`factory/README.md` also records the rules found by building a throwaway film from it alone: for example, every font
weight `fonts(v)` returns needs an `@font-face`, and `voLines(v)` must not depend on `ar`.

The engine owns everything else: the clock, edit-list resolution, framing, text rendering, post-processing, audio
scheduling and export, the preview UI, rendering and the gallery. The engine starts with only what the perfume film
needs; later cases extend it when they need something new.

### 7.3 `new-film` skill

`opus55-showcase/.claude/skills/new-film/SKILL.md` guides Claude Code through:
1. Turning a storyline prompt into a storyboard table (shots, durations, hit points, copy) for the user to approve.
2. Scaffolding `NN-name/` from the contract (`film.js`, tables, layouts, `index.html`, manifest, README).
3. Building shots one at a time, checking `sheet.mjs` / `snap.mjs` screenshots in every aspect ratio and language.
4. Writing the manifest, running `vo.mjs`, then `render.mjs` (always `--dry` first), then reviewing the gallery.

It asks before running anything that calls Kokoro.

It links to `factory/README.md` for the contract. It is discovered when Claude Code runs from the showcase directory.

## 8. Audio

### 8.1 Principles

- **Works on mute.** Feeds autoplay silently, so picture and on-screen text carry the whole message. Music, sound
  effects and voice-over are a bonus layer.
- **Hit points on downbeats.** Every score is written on one fixed grid: a 3.0 s bar of four beats (80 bpm), with
  onsets on the sixteenth-note grid (0.1875 s). The cuts put every hit point on a multiple of 1.5 s (§4.1), and in
  both 03 cuts the drop landing, the light-streak peak and the logo hit each fall on a downbeat. Scents differ in mode,
  instruments and rhythm, not tempo. This replaces per-score tempo maps within ±8% of a nominal tempo: one fixed bar
  is simpler and already puts every hit on a beat.
- **6 s cut has its own arrangement**, not a trimmed 15 s track.
- **Sonic logo:** a three-note 闻境 motif at every end card, the same melody in every scent, voiced with that scent's instruments.

### 8.2 Scores and sound effects (all synthesized in WebAudio, as in 02)

| Scent | Mode (all at 80 bpm) | Instruments |
|---|---|---|
| 白茶 | D pentatonic (宫调) | Guqin-like plucked string (Karplus-Strong), airy pad, breathy flute tone |
| 桂花 | F major | Felt piano, celesta sparkles, warm string pad |
| 海盐 | A lydian | Marimba/kalimba, glassy bell, wave-noise swells |
| 玫瑰 | C dorian | Low cello-like pad, slow pulsing bass, harp arpeggios |

Shared structure: a sparse motif (`macro`), a riser into the drop hit (`drop`), the full theme (`hero`), a soft
pulse under the labels (`anatomy`), a breath (`spray`), then the resolve and sonic logo (`end`).

Sound effects: the drop's pitched plink and ripple, a glass clink as the cap lifts, a filtered-noise spray,
transition whooshes, and a light background bed for each world (mist and wind, rustling leaves, waves, near-silence).

Notes go to two buses sharing one reverb: `music`, which ducks under the voice-over, and `sfx` (sound effects and the
sonic logo), which doesn't. The mix fades out over the last 0.3 s. Randomness in the voices comes from the seeded PRNG,
and no WebAudio node input takes more than two connections, so a variant's mix renders to the same samples every time.

### 8.3 Voice-over (Kokoro)

- **Script:** `copy.js` gives the film's `voLines(v) → [{ id, text, voice, speed, at, max }]`, where `at` and `max`
  are the slot's start and longest length in cut time. The 15 s cut has three lines:
  - `hero`, the scent's one-line image (e.g. "一滴晨露，一片茶山。"), at 4.6 s, up to 2.8 s;
  - `notes`, the three notes, at 7.7 s, up to 2.6 s;
  - `end`, the brand line or the promo line, at 12.3 s, up to 2.4 s, so it finishes before the final 0.3 s fade.

  The 6 s cut has one line per promo, at 1.1 s, up to 3.7 s. Prices are spelt out ("双十一，到手四百九十九元。",
  "Eleven-eleven: sixty-nine dollars."), because Kokoro reads digits unreliably. A line's `id` has the same words in
  every variant, and no line depends on `ar`. `vo: 'off'` returns no lines.
- **Generation:** `node factory/vo.mjs 03-perfume` calls `ai-ml/aigc/audio_models/Kokoro/tts.sh` for every line
  (Lambda `kokoro-tts:live`, us-east-1; `REGION` / `FUNC` overridable). The Lambda names its output by voice and
  second, so the lines for one voice are queued, while different voices run in parallel. `assets/vo/index.json` maps
  each line id to `{ text, voice, speed, rate, dur, lufs }`. A line is regenerated only when its text, voice or
  speed changed (or with `--force`), and clips no longer in the script are deleted.
- **Processing:** each clip is trimmed of leading and trailing silence, brought to −20 LUFS, peak-limited at −6 dBFS
  and stored as mono 48 kbps MP3.
- **Fitting slots:** each clip is measured. If a clip is longer than its slot, the script retries once at up to speed 1.15.
  If it still doesn't fit, the script stops, names the line so it can be shortened, and exits 1.
- **Loud failures:** the page's voice-over plan throws on a missing clip, a stale one (its text, voice or speed no
  longer match) or one longer than its slot, naming the command to run. The preview, `render.mjs` and `check.mjs` all
  stop on it, so a batch never ships a silent gap or old words.
- **Storage:** clips are committed in `03-perfume/assets/vo/` as mp3 (64 clips, 912 KB), following 01's
  precedent of committing pipeline outputs. Anyone who clones the repo hears the voice-over without deploying Kokoro.
- **Mixing:** the engine decodes the clips and schedules each at its slot, centred, outside the reverb, at gain 0.6.
  The music bus ducks by 9 dB under speech (from 0.12 s before a line to 0.3 s after it, computed from the slot times
  so it's deterministic). The live preview and the offline WAV export use the same mix.
- **Voice choice:** `zm_yunxi` (zh) and `bf_emma` (en), set per language in `copy.js` and overridable per scent. They
  were chosen with `vo.mjs --audition`, which reads the same line in four candidate voices per language (zh:
  `zf_xiaoxiao`, `zf_xiaoyi`, `zm_yunjian`, `zm_yunxi`; en: `af_heart`, `bf_emma`, `am_michael`, `bm_george`).
- **Known risk:** Kokoro's Chinese occasionally mispronounces a character or gets the phrasing wrong. Lines are short and
  cached, so a bad line is reworded and regenerated. Replacing Kokoro later (e.g. CosyVoice 3) only changes `tts.sh`.

## 9. Rendering pipeline — `factory/render.mjs`

1. Check that `ffmpeg` and `ffprobe` are on the PATH (exit 2 otherwise). Start a built-in static HTTP server rooted
   at `opus55-showcase/` (so `../factory/` imports resolve).
2. Launch Chromium via Playwright with `--use-angle=metal --enable-gpu --ignore-gpu-blocklist`, one page per worker
   (`--workers`, default 2). A job aborts if WebGL runs on SwiftShader (§12).
3. For each job, open `/03-perfume/?render&<variant>`. In render mode the canvas is exactly the output size,
   `deviceScaleFactor` is 1, the UI is hidden, and the page resolves `__app.ready` after fonts, voice-over clips and shader
   compilation.
4. Call `exporter.start(fps)`, then `frame()` for every frame. Each frame is the final composited canvas
   (3D + text), read back with `canvas.toDataURL('image/png')` and piped into ffmpeg's stdin
   (`-f image2pipe -c:v png`), with no temp frame files. The video is written to `<name>.mp4.part`.
5. `exporter.audio()` renders the full mix with OfflineAudioContext (48 kHz stereo float WAV). Then the loudness chain:
   - `loudnorm` only measures, because its linear mode silently falls back to dynamic compression;
   - a `volume` gain brings the mix to −14 LUFS, `alimiter` limits it at −3 dBFS, and a second `volume` gain makes up
     what the limiter took, back to −14 LUFS. Gain and limiting only, so the music's dynamics are unchanged;
   - the result is encoded to AAC 192 kbps 48 kHz on its own and measured. AAC raises the true peak: above −1.5 dBTP,
     the limit is lowered by the excess + 0.3 dB and the audio encoded again, up to 4 times;
   - the MP4 copies that track (`-c:a copy`). A film without a `score` gets a video with no audio track.
6. Encode: `libx264 -profile:v high -pix_fmt yuv420p -crf 18 -preset slow -movflags +faststart`.
7. `exporter.cover()` renders the cut's cover time, saved as `…_cover.jpg` (quality 92).
8. Verify each output with `ffprobe`: duration, resolution, fps, frame count = duration × fps, audio stream
   present. Then measure the finished MP4: integrated loudness within ±1 LU of −14 LUFS and true peak ≤ −1 dBTP.
   Any failure fails the job, and the job and its error go into the index's `failed` list.
9. A job is done when both its `.mp4` and its `.json` sidecar exist. Done jobs are skipped unless `--force`.
   - A job first deletes whatever its last attempt left.
   - The `.part` is renamed only after every check passes, and the sidecar is written last. So an interrupted or
     re-run batch never counts a half-written video as done.
   - `out/index.json` is `{ film, group, axes, failed, videos }`. `videos` is every sidecar in the folder (file,
     cover, variant, duration, width, height, fps, frames, bytes, audio, lufs, tp, renderMs), and `failed` lists the
     last run's failures.
10. `--dry` prints the job count without rendering. Axes on the command line (`--<axis> v1,v2|'*'`) replace the
    manifest with that grid.

Time, measured on this M1 Pro: drawing a 1080×1920 frame and reading it back as PNG takes about 120 ms. The default
batch (288 s of video, 8,640 frames at 30 fps, 2 workers) took 11.6 minutes, at 4.7–9.7 fps per video (9:16 is
the slowest, 1:1 the fastest). `--all` has 5.25 times the frames, about an hour.

## 10. Live preview and gallery

**Live page** (`/03-perfume/`)
- Variant pickers (one per axis: scent, aspect ratio, language, cut, promo, voice-over), play/pause, scrubber with
  shot names, sound switch (shown when the film has a score), quality switch. Choices are written back to the URL.
- The stage is letterboxed to the chosen aspect ratio inside the browser window.
- Keys: `Space` play/pause, `←`/`→` ±0.5 s, `Shift` + `←`/`→` one frame, `1`–`9` jump to that edit-list entry,
  `S` safe-area overlay, `M` sound, `Q` quality (pixel ratio × 0.6, DoF samples 32 → 12).
- URL parameters: the axes, `t`, `paused`, `safe`, `sheet`, `scale`, `render`. The page has three modes, which the
  film reads from `ctx.mode`: `live`, `sheet` and `render`.
- `?sheet`: tiles key frames of one variant across all three aspect ratios and both languages into one image, for
  review (like 02's `sheet`). `factory/sheet.mjs` saves one from the command line, and `factory/snap.mjs` saves single
  frames.
- Target about 30 fps at 1080p on this Mac with high quality on; the quality switch drops DoF samples and pixel ratio.

**Gallery** (`factory/gallery.html?film=03-perfume`)
- Reads `<film>/out/index.json`. Grid grouped by scent, each tile at its real aspect ratio showing its cover. The
  title line gives the count, total size and total duration; the last run's failures are listed in red.
- Filter buttons for aspect ratio, language, cut, promo, voice-over. The choice is kept in the URL.
- Muted playback on hover; click opens the video with sound. Each tile shows file size, duration and LUFS.

## 11. Testing and acceptance

**Unit tests** (`npm test` = `node --test '*/test/*.test.mjs'`, engine and film, `node:test` and `node:assert/strict`
only; 145 tests)
- Manifest expansion (`*`, grids, dedupe) and file naming.
- Edit-list resolution: `t` → shot, local time and `u`, including exact boundaries, `from` trims and transitions.
- Framing solver: for each aspect ratio, the subject's projected bounding box lands inside its target rectangle within 1% of frame size.
- Text fitting: no overflow, minimum size respected, zh punctuation rules, en word wrap, a box's padding counted.
  Every string × zone × ratio × language of the film fits, with a width model that only errs wide.
- Determinism: timeline evaluation and the closed-form particle/path helpers are pure — same inputs, same outputs
  regardless of call order (pixel-level determinism is acceptance criterion 6, checked in the browser).
- Music grid: every hit point is on the 1.5 s grid, every hit in the 03 cuts is a downbeat, every onset is on the
  sixteenth-note grid; a mix renders to the same samples twice.
- Film: the bottle fills its framing boxes assembled and exploded; every world obeys the world contract and builds in
  Node; every planned voice-over line has a current clip that fits its slot.
- Batch: output paths, done markers, the index, and the loudness chain's arithmetic.

**Pre-flight** (`node factory/check.mjs 03-perfume [--all]`): the GPU is Metal, not SwiftShader; every font face is
loaded in its weight; determinism (every cut's key frames and transition midpoints drawn forward, then backward,
compared byte for byte); every voice-over clip present, current and inside its slot; each cut's mix rendered twice,
identical; no caption overflows with the real fonts; and the speed per frame.

**Visual review during the build:** `sheet.mjs` contact sheets of every shot × aspect ratio × language, checked for
subject inside the safe area, no text overflow, and legibility at phone size.

**Acceptance criteria**
1. Serving `opus55-showcase/` and opening `/03-perfume/` previews any of the 144 variants (× voice-over on/off) via URL or pickers.
2. `node factory/render.mjs 03-perfume` renders the default 24 MP4s and covers; all pass the ffprobe checks;
   loudness is within ±1 LU of −14 LUFS and true peak ≤ −1 dBTP.
3. The gallery shows the batch with working filters and playback.
4. `npm test` passes, and `node factory/check.mjs 03-perfume --all` passes on all 144 variants.
5. Voice-over clips exist for every line in both languages and all fit their slots.
6. A frame rendered twice at the same `t` (with other times rendered in between) is pixel-identical (`check.mjs`'s determinism line).
7. `factory/README.md` documents the contract and commands; the `new-film` skill exists.
8. Chinese READMEs for `factory/` and `03-perfume/`; the showcase index has a new row; the fictional-brand note is present.

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Headless Chromium on macOS falls back to software WebGL (~10× slower) | Settled by the spike (2026-09-28, M1 Pro): default headless is SwiftShader at ~1100 ms per frame; with `--use-angle=metal --enable-gpu --ignore-gpu-blocklist` it runs on Metal, and `toDataURL('image/png')` at 1080×1920 takes ≈ 56 ms per frame. A job aborts on SwiftShader |
| Glass-in-liquid refraction looks flat or is slow | Build the bottle and glass pass in a neutral studio first, before any world; tune against reference frames with `?sheet` |
| Four worlds is the largest chunk of work | Build one world (白茶) end to end first — shots, all ratios, render, audio, voice-over — then add the other three |
| CJK font subsets load late, so canvas text renders in a fallback font | `document.fonts.load()` the exact strings for the variant before `ready`; render mode refuses to start if a font is missing |
| Kokoro zh mispronunciations | Short cached lines, audition step, reword and regenerate |
| The Kokoro Lambda overwrites a clip when one voice gets two requests in the same second | One request per voice at a time (§8.3) |
| AAC encoding pushes the true peak over −1 dBTP | Encode the audio on its own, measure, lower the limit and re-encode (§9) |
| Text or product clipped in some ratio × language | Unit tests for fitting and framing plus the `?sheet` review of every combination |

## 13. Build order (input to the implementation plan)

1. Spike: headless GPU and frame-transfer throughput.
2. Engine core with tests: `variant`, `timeline`, `framing`, `text`.
3. Bottle and glass/liquid pass in a neutral studio; `post.js`.
4. 白茶 world and the six shots, all three aspect ratios, zh copy; `?sheet` review.
5. `render.mjs` and gallery end to end for 白茶 (silent).
6. `audio.js`, 白茶 score and SFX; `vo.mjs` with audition; voice-over mixing; audio in the rendering script.
7. Other three worlds and scores.
8. en copy, promo presets, 6 s cut.
9. `new-film` skill, READMEs, showcase index row, default batch render and review.

The implementation plan (`docs/plans/2026-09-28-03-perfume-video-factory.md`) follows this order in 21 tasks.

## 14. Amendments after planning

The plan was written and every task was run on a scratch tree before this amendment. What changed from the approved
draft, and why:
- **§4:** shots retimed so every boundary and hit lies on the 1.5 s grid, which lets every hit land on a downbeat
  without tempo maps. The 6 s cut enters the drop at its landing and the hero with a flash. Cut data gained explicit
  `hits` and `cover` fields.
- **§5.3:** a boxed caption counts its padding in the fit, and a left- or right-aligned box sits on the zone's edge.
  The review of the English promo cards found the 11.11 ribbon wider than its zone.
- **§6.1–6.2:** glass normals from the exact outline, because averaged normals turn each face into a lens under
  refraction. Four layered passes into one scene target, with rays traced through the bottle's prisms. Traced caustics
  in place of a faked pattern. A clear dip tube, a pump chamber hidden in the shoulder, and exploded offsets that keep
  the pump clear of the collar.
- **§6.3–6.5:** the world contract written out; focus defaults to the solved look-at distance; `reset` named.
- **§7:** `package.json` at the showcase root; `meta.js` split out so Node reads the film's metadata without
  Three.js; the contract's full field list, and the rules the throwaway-film exercise found.
- **§8:** one fixed 3 s bar at 80 bpm in place of per-scent tempo maps. For the voice-over: the clip index fields, the
  per-voice queue, clip processing, the slots, spelt-out prices and the chosen voices.
- **§9:** the loudness chain (measure-only `loudnorm`, gain + limiter + make-up gain, AAC re-encoded until the true
  peak is under −1.5 dBTP), `toDataURL` frame transfer, `.part` files and done markers, the index's `failed` list,
  and the measured time.
- **§10–12:** keys and parameters as built; `npm test` and `check.mjs` as the test entry points; the spike's result.
