// render.mjs — 批量出片：清单（或 --all、或命令行给的网格）→ 每个变体开一页无头 Chromium，逐帧 PNG 经管道进 ffmpeg → MP4 + 封面 + 说明文件 → out/index.json
// 声音：页面把整段混音交成一个 WAV（临时文件），encodeAudio 把它编成 −14 LUFS 的 AAC，出片时原样拷进去；成片量一遍响度，不达标算失败
//   node factory/render.mjs 03-perfume [--all] [--<axis> v1,v2 | '*'] [--fps 30] [--workers 2] [--force] [--dry] [--out 目录]
// 命令行写了轴就只出这些轴的网格（没写的轴取第一个值；和 --all 合用时没写的轴取全部）；
// 已做完（.mp4 与 .json 都在，且输入指纹没变：成片目录、factory/engine、factory/lib、本文件与 --fps）的跳过，除非 --force；有一条失败就以状态码 1 结束
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { serve, ROOT } from './lib/serve.mjs';
import { launch, openFilm } from './lib/browser.mjs';
import { parseArgs } from './lib/args.mjs';
import { encodeArgs, startEncode, probe, checkProbe, hasFfmpeg, measure, encodeAudio, checkLoudness } from './lib/ffmpeg.mjs';
import { pickJobs, outPaths, isDone, resetJob, finishJob, writeIndex, pool, inputsHash } from './lib/jobs.mjs';
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
const inputs = inputsHash(ROOT, [film, 'factory/engine', 'factory/lib', 'factory/render.mjs'], `fps ${fps}`);

const b64 = url => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
const srv = await serve(ROOT), browser = await launch();

async function renderJob(v, k) {
  const name = META.fileName(v), p = outPaths(outDir, name), tag = `[${k + 1}/${jobs.length}] ${name}`;
  if (!o.force && isDone(p, inputs)) { console.log(`${tag}  skip (done)`); return { name, skipped: true }; }
  resetJob(p);
  const t0 = Date.now(), [W, H] = ASPECTS[v.ar];
  let page = null, enc = null, wav = null, aac = null;
  try {
    ({ page } = await openFilm(browser, { base: srv.url, film, query: `render&paused&${variantQuery(META, v)}`, ar: v.ar }));
    const job = await page.evaluate(f => window.__app.exporter.start(f), fps);
    if (job.W !== W || job.H !== H) throw new Error(`canvas ${job.W}×${job.H}, expected ${W}×${H}`);
    const a = await page.evaluate(() => window.__app.exporter.audio());      // 片子没有 score 就是 null：出无声的片
    if (a) {
      wav = path.join(os.tmpdir(), `${name}.${process.pid}.wav`); aac = `${wav}.m4a`;
      fs.writeFileSync(wav, b64(a.url)); encodeAudio(wav, aac);
    }
    enc = startEncode(encodeArgs({ fps, out: p.part, audio: aac }));
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
    const pr = probe(p.part), bad = checkProbe(pr, { duration: job.duration, width: W, height: H, fps, audio: !!wav });
    if (bad.length) throw new Error(`ffprobe: ${bad.join('; ')}`);
    const loud = wav && measure(p.part), off = loud ? checkLoudness(loud) : [];
    if (off.length) throw new Error(`loudness: ${off.join('; ')}`);
    const ms = Date.now() - t0;
    finishJob(p, {
      name, file: path.basename(p.mp4), cover: path.basename(p.cover), variant: v,
      duration: job.duration, width: W, height: H, fps, frames: pr.frames, bytes: pr.bytes,
      audio: !!wav, lufs: loud ? Math.round(loud.I * 10) / 10 : null, tp: loud ? Math.round(loud.TP * 10) / 10 : null, renderMs: ms, inputs,
    });
    console.log(`${tag}  ${pr.frames} frames  ${(ms / 1000).toFixed(1)} s (${(pr.frames / (ms / 1000)).toFixed(1)} fps)  ${(pr.bytes / 1e6).toFixed(1)} MB`);
    return { name };
  } catch (e) {
    enc?.kill(); resetJob(p);
    console.log(`${tag}  FAILED\n    ${e.message.split('\n').join('\n    ')}`);
    throw e;
  } finally {
    await page?.context().close();
    for (const f of [wav, aac]) if (f) fs.rmSync(f, { force: true });
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
