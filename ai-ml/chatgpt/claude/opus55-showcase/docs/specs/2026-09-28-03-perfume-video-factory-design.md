# 03 · 闻境 Perfume Product-Video Factory — Design

Date: 2026-09-28 · Status: draft for review · Branch: `opus55-03-perfume-factory`

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
| Voice-over | Kokoro-82M through the already-deployed `kokoro-tts:live` Lambda (`ai-ml/aigc/audio_models/Kokoro/tts.sh`), not Amazon Polly |
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
| 0–2.0 s | `macro` | The scent's key ingredient in extreme close-up with light moving across it (a tea leaf with a dew drop, osmanthus florets, a salt crystal on wet rock, a rose petal). A dew drop gathers at its tip. Something striking in the first second |
| 2.0–4.0 s | `drop` | The drop falls and the camera follows it down. It lands in the liquid inside the bottle; the surface ripples in expanding, fading rings; the camera pulls back to reveal the bottle |
| 4.0–7.5 s | `hero` | Slow orbit, a streak of light runs across the glass facets. Scent name and brand fade in |
| 7.5–10.5 s | `anatomy` | Cap, collar, spray pump (with dip tube) and bottle pull apart into an exploded view. Three labels with leader lines: top / heart / base notes (前调 / 中调 / 后调), plus "50 ml · Eau de Parfum". The parts reassemble |
| 10.5–12.5 s | `spray` | The cap lifts off, one spray. The mist catches the backlight and drifts into the world's particles |
| 12.5–15.0 s | `end` | The bottle at rest in its world. Logo, tagline, call to action. With a promo preset, the call to action is replaced by the promo card |

### 4.2 Cuts as data

A cut is an ordered edit list. Each entry: `{ shot, dur, from?, transition? }`. `from` trims the start of a shot's
local time. `transition` is `cut | flash | dissolve` with a length. Shots receive `{ lt, dur, u = lt / dur }`,
so retiming a shot never requires new animation.

```js
cuts: {
  15: [ {shot:'macro',dur:2.0}, {shot:'drop',dur:2.0}, {shot:'hero',dur:3.5},
        {shot:'anatomy',dur:3.0}, {shot:'spray',dur:2.0}, {shot:'end',dur:2.5} ],
  6:  [ {shot:'drop',dur:1.5,from:0.3}, {shot:'hero',dur:2.5}, {shot:'end',dur:2.0} ],
}
```

Each cut also declares **hit points**, used by the score and the voice-over. Hit points are named moments in
cut time: drop landing, peak of the light streak, logo hit. It also declares a **cover time** (the hero-reveal frame used for the cover image).

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
- The film supplies `layouts[ar][shot] = { anchor, size, textZones }`.
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
  fonts loaded first, so the page calls `document.fonts.load()` for the exact strings of the current variant
  before the first frame.
- Text layout auto-fits each zone. Chinese wraps per character (with basic 避头尾 punctuation rules), English
  wraps per word, and the font shrinks down to a floor if a line still doesn't fit.
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

Output names: `out/wenjing_<sku>_<cut>s_<ar>_<lang>[_<promo>][_novo].mp4`, plus `…_cover.jpg`.

## 6. Bottle, materials, worlds

### 6.1 Bottle

- One mesh set that can be pulled apart for the exploded view. The same meshes are used assembled and exploded.
- **Glass:** a heavy octagonal flacon with bevelled edges and a thick base. The 闻境 logo is frosted into the
  front face using a roughness mask.
- **Parts:** gold collar, spray pump with a thin dip tube visible through the glass, heavy faceted cap. The cap
  finish comes from the SKU.
- **Liquid:** a separate inner volume, with a curved rim where it meets the glass. Its surface is displaced by
  analytic damped ring waves after the drop lands, computed purely from `t`.

### 6.2 Glass and liquid rendering

Three.js's built-in transmission doesn't correctly show one transmissive object through another (the liquid would vanish
behind the glass), so the film uses its own refraction pass:

1. Render the opaque scene and background into a render target.
2. Render the liquid, refracting that target and tinting it by thickness (thicker liquid looks deeper in colour).
   The result goes into a second target.
3. Render the glass, refracting the second target, with per-channel IOR offsets for colour fringing, Fresnel
   reflections from the world's reflection environment, and specular highlights.

Every world's reflection environment (a PMREM built from a procedural scene, as in 02) includes hidden long strip lights, so the glass edges read clearly.

**Caustics** are faked: an animated caustic pattern, tinted by the liquid colour, is projected onto the surface
under the bottle, offset away from the key light and masked by the bottle's footprint.

### 6.3 Worlds

A world is a module with a fixed interface: `build(ctx)` returns the set pieces, lights, reflection environment, haze,
particle systems, the ingredient model for `macro`, the surface the bottle sits on, and a colour grade.

| World | Setting | Macro ingredient | Particles |
|---|---|---|---|
| 白茶 dawn terraces | Tea rows along contour lines receding into mist, low-sun light rays, bottle on wet slate | Serrated tea leaf with veins and a refractive dew drop | Mist wisps, a few drifting leaves |
| 桂花 golden autumn | Golden-hour backlight, a branch in silhouette, warm bokeh | Osmanthus floret cluster | Falling four-petal florets |
| 海盐 ocean light | White rock at the waterline, rippling water with caustics | Salt crystal cluster on wet rock | Spray droplets, salt crystals |
| 玫瑰 dark velvet | Draped velvet (displaced surface with a sheen material), one hard spotlight | Rose petal with a dew drop | Drifting petals |

### 6.4 Post-processing

Multisample anti-aliasing → depth of field with bokeh → gentle bloom (with a clamped input, as in 02) → AgX
tone mapping → per-world colour grade (lift/gamma/gain), film grain, vignette. Text is composited after post,
so it stays sharp.

### 6.5 Determinism

There is no step-by-step simulation. Every particle, petal and droplet follows a closed-form path from a seeded PRNG
(mulberry32), so any `t` renders the same frame regardless of what was rendered before. Scrubbing, the live
preview and batch rendering all rely on this.

## 7. Architecture

### 7.1 Layout

```
opus55-showcase/
├── factory/                    shared by 03 onward
│   ├── engine/
│   │   ├── timeline.js         edit list → current shot + local time, transitions, hit points
│   │   ├── variant.js          URL / manifest parsing, grid expansion, file naming
│   │   ├── framing.js          aspect ratio + shot intent → camera distance + view offset
│   │   ├── text.js             2D-canvas text layout, auto-fit, zh/en wrapping, min-size rule, leader lines
│   │   ├── post.js             MSAA · DoF · bloom · AgX · grade · grain · vignette
│   │   ├── audio.js            synth voices, tempo maps, note scheduler, VO playback + ducking, offline WAV
│   │   ├── player.js           live preview UI: variant picker, scrubber, `?safe`, `?sheet`, quality switch
│   │   └── exporter.js         start(fps) / frame() / audio() / cover()
│   ├── test/                   node --test unit tests for the engine
│   ├── render.mjs              node factory/render.mjs 03-perfume [--all] [--force] [--workers N] [--fps 60]
│   ├── vo.mjs                  node factory/vo.mjs 03-perfume [--audition]
│   ├── gallery.html            gallery.html?film=03-perfume
│   ├── package.json            devDependencies: playwright (rendering), three@0.170.0 (tests only)
│   └── README.md               film contract, commands (Chinese)
├── 03-perfume/
│   ├── index.html              importmap (three@0.170.0), fonts, loads engine + film
│   ├── film.js                 film definition (implements the contract)
│   ├── skus.js · copy.js · promos.js · layouts.js
│   ├── manifest.json           default 24-job batch
│   ├── js/
│   │   ├── bottle.js           bottle meshes + explode rig
│   │   ├── glass.js            liquid/glass refraction pass, caustics
│   │   ├── shots.js            the six shots
│   │   ├── score.js            four scores + sonic logo + SFX cues
│   │   └── worlds/             whitetea.js · osmanthus.js · seasalt.js · rose.js · common.js
│   ├── assets/vo/              generated voice-over clips (mp3, committed)
│   ├── out/                    rendered MP4 + covers + index.json (gitignored)
│   └── README.md               (Chinese)
├── .gitignore                  */out/, factory/node_modules/
└── .claude/skills/new-film/SKILL.md
```

### 7.2 Film contract

A film is an ES module whose default export has:

```js
export default {
  id: 'perfume',
  axes: { sku: [...], lang: ['zh','en'], cut: [15, 6], promo: ['none','1111','launch'] }, // ar and vo are engine-level
  cuts: { 15: [...], 6: [...] },            // §4.2, including hitPoints and coverTime
  layouts,                                   // layouts[ar][shot] = { anchor, size, textZones }
  async setup(ctx) { ... },                  // build the scene for ctx.variant; ctx = { THREE, renderer, scene, camera, variant, assets }
  shots: { macro(ctx, s) { ... }, ... },    // s = { lt, dur, u }; pure: set scene state, return { frame: intent, text: [layers] }
  score(variant, cut) { ... },               // returns timed events: notes, SFX cues, VO clips with slots
  vo: { ... },                               // per-language lines with slots (§8.3)
}
```

The engine owns everything else: the clock, edit-list resolution, framing, text rendering, post-processing, audio
scheduling and export, the preview UI, rendering and the gallery. The engine starts with only what the perfume film
needs; later cases extend it when they need something new.

### 7.3 `new-film` skill

`opus55-showcase/.claude/skills/new-film/SKILL.md` guides Claude Code through:
1. Turning a storyline prompt into a storyboard table (shots, durations, hit points, copy) for the user to approve.
2. Scaffolding `NN-name/` from the contract (`film.js`, tables, layouts, `index.html`, manifest, README).
3. Building shots one at a time, checking `?sheet` screenshots in every aspect ratio and language.
4. Writing the manifest, running `vo.mjs`, then `render.mjs`, then reviewing the gallery.

It links to `factory/README.md` for the contract. It is discovered when Claude Code runs from the showcase directory.

## 8. Audio

### 8.1 Principles

- **Works on mute.** Feeds autoplay silently, so picture and on-screen text carry the whole message. Music, sound
  effects and voice-over are a bonus layer.
- **Hit points on downbeats.** Each score is written in bars. A per-score tempo map stretches the bars between hit
  points (within ±8% of the nominal tempo) so the drop landing, the light-streak peak and the logo hit each fall on a downbeat.
  This is the standard film-scoring technique of fitting tempo to hits.
- **6 s cut has its own arrangement**, not a trimmed 15 s track.
- **Sonic logo:** a three-note 闻境 motif at every end card, the same melody in every scent, voiced with that scent's instruments.

### 8.2 Scores and sound effects (all synthesized in WebAudio, as in 02)

| Scent | Mode / nominal tempo | Instruments |
|---|---|---|
| 白茶 | D pentatonic (宫调), 72 bpm | Guqin-like plucked string (Karplus-Strong), airy pad, breathy flute tone |
| 桂花 | F major, 80 bpm | Felt piano, celesta sparkles, warm string pad |
| 海盐 | A lydian, 84 bpm | Marimba/kalimba, glassy bell, wave-noise swells |
| 玫瑰 | C dorian, 66 bpm | Low cello-like pad, slow pulsing bass, harp arpeggios |

Shared structure: a sparse motif (`macro`), a riser into the drop hit (`drop`), the full theme (`hero`), a soft
pulse under the labels (`anatomy`), a breath (`spray`), then the resolve and sonic logo (`end`).

Sound effects: the drop's pitched plink and ripple, a glass clink as the cap lifts, a filtered-noise spray,
transition whooshes, and a light background bed for each world (mist and wind, rustling leaves, waves, near-silence).

### 8.3 Voice-over (Kokoro)

- **Script:** `copy.js` has a `vo` table: per language, per cut, a list of lines, each with text and a slot
  (start, max length) in cut time. Promo presets add their own end-card line (e.g. "双11 到手价 599 元").
  Draft for the 15 s cut: a `hero` line (scent + one-line image, e.g. "闻境 · 白茶。一滴晨露，一片茶山。"),
  an `anatomy` line (the notes), and an `end` line (the brand line, or the promo line). The 6 s cut gets one line.
- **Generation:** `node factory/vo.mjs 03-perfume` calls `ai-ml/aigc/audio_models/Kokoro/tts.sh` for every line
  (Lambda `kokoro-tts:live`, us-east-1; `REGION` / `FUNC` overridable). Each line is cached by a hash of
  `(text, voice, speed)` in `assets/vo/index.json`, so only changed lines are regenerated.
- **Fitting slots:** each clip is measured. If a clip is longer than its slot, the script retries once at up to speed 1.15.
  If it still doesn't fit, the script stops and names the line so it can be shortened.
- **Storage:** clips are committed in `03-perfume/assets/vo/` as mp3 (expected under 1 MB total), following 01's
  precedent of committing pipeline outputs. Anyone who clones the repo hears the voice-over without deploying Kokoro.
- **Mixing:** the engine decodes the clips and schedules each at its slot. The music bus ducks by about 9 dB
  under speech (120 ms attack, 300 ms release, computed from the slot times so it's deterministic). The live
  preview and the offline WAV export use the same mix code.
- **Voice choice:** default voice per language in `copy.js`, overridable per scent. The first voice-over step is
  `vo.mjs --audition`: the same line in about four candidate voices per language (zh: `zf_xiaoxiao`, `zf_xiaoyi`,
  `zm_yunjian`, `zm_yunxi`; en: `af_heart`, `bf_emma`, `am_michael`, `bm_george`) for the user to choose.
- **Known risk:** Kokoro's Chinese occasionally mispronounces a character or gets the phrasing wrong. Lines are short and
  cached, so a bad line is reworded and regenerated. Replacing Kokoro later (e.g. CosyVoice 3) only changes `tts.sh`.

## 9. Rendering pipeline — `factory/render.mjs`

1. Start a built-in static HTTP server rooted at `opus55-showcase/` (so `../factory/` imports resolve).
2. Launch Chromium via Playwright, one page per worker (`--workers`, default 2). The GPU path is settled in the
   first implementation step (§12).
3. For each job, open `/03-perfume/?render&<variant>`. In render mode the canvas is exactly the output size,
   `deviceScaleFactor` is 1, the UI is hidden, and the page resolves `__app.ready` after fonts, voice-over clips and shader
   compilation.
4. Call `exporter.start(fps)`, then `frame()` for every frame. Each frame is the final composited canvas
   (3D + text). It is transferred as a lossless image and piped into ffmpeg's stdin (`-f image2pipe`), with no temp
   frame files. The transfer method (canvas readback vs element screenshot) is picked by measurement in §12.
5. `exporter.audio()` renders the full mix with OfflineAudioContext (48 kHz stereo float WAV).
   ffmpeg applies `alimiter`, then two-pass `loudnorm` to I = −14 LUFS, TP = −1 dBTP.
6. Encode: `libx264 -profile:v high -pix_fmt yuv420p -crf 18 -preset slow -movflags +faststart`, AAC 192 kbps 48 kHz.
7. `exporter.cover()` renders the cut's cover time, saved as `…_cover.jpg` (quality 92).
8. Verify each output with `ffprobe`: duration, resolution, fps, frame count = duration × fps, audio stream
   present. Failures are reported and the job is marked failed in the index.
9. Skip jobs whose MP4 already exists unless `--force`. Write `out/index.json` (file, cover, variant, duration,
   width, height, fps, bytes, measured LUFS).

Time estimate (to be confirmed by §12): the default batch is 288 s of video, about 8.6k frames at 30 fps, roughly 15–25 minutes on this Mac;
`--all` is roughly 1.5–2.5 hours.

## 10. Live preview and gallery

**Live page** (`/03-perfume/`)
- Variant pickers (scent, aspect ratio, language, cut, promo, voice-over), play/pause, scrubber with shot markers, sound switch, quality switch.
- The stage is letterboxed to the chosen aspect ratio inside the browser window.
- Keys: `Space` play/pause, `←`/`→` ±1 s, `1`–`6` jump to shot, `S` safe-area overlay.
- `?sheet`: tiles key frames of one variant across all three aspect ratios and both languages into one image, for
  review (like 02's `sheet`).
- Target about 30 fps at 1080p on this Mac with high quality on; the quality switch drops DoF samples and pixel ratio.

**Gallery** (`factory/gallery.html?film=03-perfume`)
- Reads `<film>/out/index.json`. Grid grouped by scent, each tile at its real aspect ratio showing its cover.
- Filter buttons for aspect ratio, language, cut, promo, voice-over.
- Muted playback on hover; click opens the video with sound. Each tile shows file size, duration and LUFS.

## 11. Testing and acceptance

**Engine unit tests** (`node --test factory/test/`, no extra dependencies)
- Manifest expansion (`*`, grids, dedupe) and file naming.
- Edit-list resolution: `t` → shot, local time and `u`, including exact boundaries, `from` trims and transitions.
- Framing solver: for each aspect ratio, the subject's projected bounding box lands inside its target rectangle within 1% of frame size.
- Text fitting: no overflow, minimum size respected, zh punctuation rules, en word wrap.
- Determinism: timeline evaluation and the closed-form particle/path helpers are pure — same inputs, same outputs
  regardless of call order (pixel-level determinism is acceptance criterion 6, checked in the browser).
- Tempo map: every hit point lands on a downbeat; tempo stays within ±8% of nominal.

**Visual review during the build:** `?sheet` screenshots of every shot × aspect ratio × language, checked for
subject inside the safe area, no text overflow, and legibility at phone size.

**Acceptance criteria**
1. Serving `opus55-showcase/` and opening `/03-perfume/` previews any of the 144 variants (× voice-over on/off) via URL or pickers.
2. `node factory/render.mjs 03-perfume` renders the default 24 MP4s and covers; all pass the ffprobe checks;
   loudness is within ±1 LU of −14 LUFS and true peak ≤ −1 dBTP.
3. The gallery shows the batch with working filters and playback.
4. `node --test factory/test/` passes.
5. Voice-over clips exist for every line in both languages and all fit their slots.
6. A frame rendered twice at the same `t` (with other times rendered in between) is pixel-identical.
7. `factory/README.md` documents the contract and commands; the `new-film` skill exists.
8. Chinese READMEs for `factory/` and `03-perfume/`; the showcase index has a new row; the fictional-brand note is present.

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Headless Chromium on macOS falls back to software WebGL (~10× slower) | First step is a spike: try GPU-backed headless (`--use-angle=metal`), fall back to a headed window moved offscreen; time frame transfer methods; confirm the time estimate |
| Glass-in-liquid refraction looks flat or is slow | Build the bottle and glass pass in a neutral studio first, before any world; tune against reference frames with `?sheet` |
| Four worlds is the largest chunk of work | Build one world (白茶) end to end first — shots, all ratios, render, audio, voice-over — then add the other three |
| CJK font subsets load late, so canvas text renders in a fallback font | `document.fonts.load()` the exact strings for the variant before `ready`; render mode refuses to start if a font is missing |
| Kokoro zh mispronunciations | Short cached lines, audition step, reword and regenerate |
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
