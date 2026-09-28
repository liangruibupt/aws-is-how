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
