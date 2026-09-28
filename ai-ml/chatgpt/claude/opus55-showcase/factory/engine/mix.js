// mix.js — 混音里的纯函数：配音压低音乐的增益折线、32 位浮点 WAV、配音片段的缓存键、节拍网格检查
// 实时预览与离线导出共用这些函数，所以两边的混音一致
import { seedOf } from './rng.js';

/** slots = [[开始, 结束], ...]（秒）→ [[t, 增益], ...]；两段间隔不足 attack + release 时合并，中间不回升 */
export function duckPoints(slots, { depth = -9, attack = 0.12, release = 0.3 } = {}) {
  const g = Math.pow(10, depth / 20), spans = [];
  for (const [s, e] of [...slots].sort((a, b) => a[0] - b[0])) {
    const last = spans.at(-1);
    if (last && s - attack <= last[1] + release) last[1] = Math.max(last[1], e); else spans.push([s, e]);
  }
  const pts = spans.length && spans[0][0] <= 0 ? [] : [[0, 1]];
  for (const [s, e] of spans) {
    if (s > 0) pts.push([Math.max(0, s - attack), 1]);
    pts.push([Math.max(0, s), g], [e, g], [e + release, 1]);
  }
  return pts;
}

export function duckAt(pts, t) {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [t1, g1] = pts[i];
    if (t <= t1) { const [t0, g0] = pts[i - 1]; return t1 > t0 ? g0 + (g1 - g0) * (t - t0) / (t1 - t0) : g1; }
  }
  return pts.at(-1)[1];
}

export function wavFloat32(chs, sr) {
  const n = chs[0].length, nc = chs.length, bytes = n * nc * 4, buf = new ArrayBuffer(44 + bytes), v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + bytes, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 3, true); v.setUint16(22, nc, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * nc * 4, true); v.setUint16(32, nc * 4, true); v.setUint16(34, 32, true);
  str(36, 'data'); v.setUint32(40, bytes, true);
  const out = new Float32Array(buf, 44);
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) out[i * nc + c] = chs[c][i];
  return buf;
}

const hex = x => x.toString(16).padStart(8, '0');
export const clipKey = (text, voice, speed) => { const s = `${voice}|${speed}|${text}`; return hex(seedOf(s)) + hex(seedOf(`${s}#`)); };

export const offGrid = (times, grid = 1.5, eps = 1e-6) => times.filter(t => Math.abs(t / grid - Math.round(t / grid)) * grid > eps);
