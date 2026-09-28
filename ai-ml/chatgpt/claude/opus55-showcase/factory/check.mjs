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
