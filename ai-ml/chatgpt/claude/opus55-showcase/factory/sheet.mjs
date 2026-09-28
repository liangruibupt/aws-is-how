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
