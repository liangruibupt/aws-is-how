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

## Deliverables: the same three videos for every film

The user fixed this on 2026-09-29. For each value of the film's first axis (a product, SKU or colour), the film delivers exactly these three videos, all with voice-over:

| Video | `ar` | `cut` | `lang` | `promo` | End card |
|---|---|---|---|---|---|
| 16:9 full cut, Chinese | `16x9` | `15` | `zh` | `none` | tagline + buy button |
| 16:9 full cut, English | `16x9` | `15` | `en` | `launch` | new launch + gift + buy button |
| 1:1 short cut, 双11 | `1x1` | `6` | `zh` | `1111` | 双11 price: the deal price, with the regular price struck through |

So every film needs `cut: [15, 6]`, `lang: ['zh', 'en']` and `promo: ['none', '1111', 'launch']`, with the values spelt exactly like that. The manifest is then `03-perfume/manifest.json` with the first axis renamed, and the default batch is 3 × (number of products). Don't propose 9:16, a 15 s 1:1, a 6 s 16:9 or an English 6 s cut unless the user asks for them.

9:16 is still an engine aspect ratio, and the preview page opens in it by default. Give every shot a rough `9x16` layout row (start from the `1x1` row) so the page isn't broken, but don't review 9:16. Because `check.mjs` only checks the manifest's jobs, 9:16 is never overflow-checked either. Share the preview as `http://127.0.0.1:8765/NN-name/?ar=16x9`.

## 1. Storyboard: get approval before any code

From the user's storyline, write the following and **wait for the user to approve or edit them**:

1. **A shot table** with these columns:

   | # | Time (s) | Shot id | Picture | Caption zh | Caption en | Hit point | Sound |
   |---|---|---|---|---|---|---|---|

   Shot ids are short lowercase names such as `macro` or `hero`. Durations should add up to each cut's length. Place hit points (a landing, a logo) on a musical grid, e.g. a 3 s bar.
2. **The variant axes**, first value = default. The first axis is the product line. After it come the fixed `lang`, `cut` and `promo` axes from **Deliverables** above. `ar` and `vo` come from the engine; don't declare them. Also list which axes rebuild the scene (`sceneAxes`).
3. **The edit list for each cut, `15` and `6`**: entries `{ shot, dur, from?, transition? }`, `hits`, and a `cover` time. The 6 s cut should reuse shots with `from` rather than new shots. It is delivered only as 1:1 with the 双11 card, so the price card has to be readable at 1080×1080.
4. **Voice-over lines** (if any). For each line, give its id, text per language, start time and maximum length, and a voice per language. Spell numbers out in words.
5. **The default manifest**: the three deliverables per product, as a count (e.g. 4 products → 12 videos).

## 2. Scaffold `NN-name/`

Take the next free number. Copy the `99-demo` skeleton from `factory/README.md` (新片起步) and adapt it:

- `meta.js` holds `export const META = { id, axes, sceneAxes, cuts, fileName }`. Node scripts read it without Three.js. Two rules:
  - **`id` must equal the directory name.**
  - **`fileName(v)` must encode every axis that changes the output.** Jobs are de-duplicated by file name. Encode `vo` too, but only if the film has voice-over.
- `film.js` exports `{ ...META, layouts, fonts, setup, reset, shots, score?, voLines?, audition? }`. `vo.mjs` imports it in Node, so it must not touch `window` or `document` at module top level.
- `index.html` needs one `@font-face` stylesheet per font family *and weight* that `fonts(v)` returns. System fonts are rejected. Copy the importmap and the `boot(film)` script from `03-perfume/index.html`.
- Tables as separate modules, as in 03 (`skus.js`, `copy.js`, `captions.js`, `layouts.js`), once the film has more than a few values.
- `layouts[ar][shot] = { anchor, size, maxW?, zones }` for `16x9` and `1x1` and every shot in any cut, plus the rough `9x16` rows described under Deliverables.
- `manifest.json`: copy `03-perfume/manifest.json` and rename `sku` to the film's first axis.
- `test/*.test.mjs` (`node:test`), picked up by `npm test`. Include a text-fit test using `approxMeasure` from `factory/engine/text.js`.

Start with a placeholder for every shot: a `fit` camera on the subject's box, plus the approved captions. Then confirm the scaffold runs:

```bash
npm test
node factory/check.mjs NN-name
npm run serve          # open http://127.0.0.1:8765/NN-name/?ar=16x9 and try every picker
```

If the page fails to start, the scripts print `page never created window.__app`. The real cause is on the `page:` line under it. Common ones are listed in `factory/README.md` (常见报错).

## 3. Build shots one at a time

For each shot, in story order:

1. Implement it: camera intent, subject motion from `s.lt` or `s.u`, captions (entry times relative to `s.from`) and post.
2. Review it in **the delivered formats**: 16:9 in both languages, and 1:1 for the shots used in the 6 s cut.
   ```bash
   node factory/sheet.mjs NN-name --ar 16x9,1x1 --safe --t <two or three times inside this shot>
   node factory/sheet.mjs NN-name --ar 1x1 --lang zh --cut 6 --promo 1111 --safe --t <times in the 6 s cut>
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
node factory/render.mjs NN-name --dry    # always first: 3 videos per product, nothing else
node factory/render.mjs NN-name          # the manifest; resumable, skips finished videos whose inputs are unchanged
npm run serve                            # then open http://127.0.0.1:8765/factory/gallery.html?film=NN-name
```

- A misspelt `--<axis>` name on the command line is ignored silently. If no valid axis is left, the script falls back to the manifest. The `--dry` count catches this.
- A video counts as finished only if its sidecar's `inputs` fingerprint matches: editing the film folder, the engine, `factory/lib/`, `render.mjs` or `--fps` re-renders it. Upgrading three, the fonts, Chromium or ffmpeg does not, so use `--force` then.
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
