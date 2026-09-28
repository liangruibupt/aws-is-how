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
