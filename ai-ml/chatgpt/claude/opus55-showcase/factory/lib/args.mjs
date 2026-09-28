// args.mjs — 命令行参数：位置参数 + --键 值（没有值的 --键 记为 true）；isMain 判断模块是不是被直接运行的入口
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/** isMain(import.meta.url)：node 直接运行的就是这个文件。比真实路径，所以路径里有空格、中文或经过符号链接都认得出 */
export function isMain(url) {
  try { return !!process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(url)); } catch { return false; }
}

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
