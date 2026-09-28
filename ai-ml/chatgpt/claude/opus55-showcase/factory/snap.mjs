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
