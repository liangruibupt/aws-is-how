// text.js — 画布文字：分词、折行（中文按字 + 避头尾，英文按词）、自动缩字到最小字号、图层绘制
// 量字函数由调用方注入：浏览器里用 canvas 实测，Node 测试里用偏宽的估算模型
import { clamp, smooth, inv, ss } from './ease.js';

export const NO_START = '，。、；：！？）》」』’”…·%,.;:!?)]}';
export const NO_END = '（《「『‘“([{¥$';

export const fontStr = (f, px) => `${f.style ?? 'normal'} ${f.weight ?? 400} ${px.toFixed(2)}px "${f.family}", ${f.fallback ?? 'serif'}`;

export function tokenize(text, lang) {
  if (lang === 'en') return text.split(/(\n)/).flatMap(p => (p === '\n' ? ['\n'] : p.split(/ +/).filter(Boolean)));
  return text.match(/\n|[A-Za-z0-9][A-Za-z0-9.,:%'’\-\/]*|[^\S\n]+|./gu) ?? [];
}

export function wrap(tokens, fits, lang) {
  const J = lang === 'en' ? ' ' : '', lines = [];
  let cur = [];
  const push = () => { lines.push(cur.join(J).trim()); cur = []; };
  for (const tk of tokens) {
    if (tk === '\n') { push(); continue; }
    if (!cur.length && !tk.trim()) continue;                              // 行首空白丢掉
    if (!cur.length || fits([...cur, tk].join(J).trim())) { cur.push(tk); continue; }
    const carry = [tk];
    if (lang !== 'en') {
      while (cur.length > 1 && NO_START.includes(carry[0][0])) carry.unshift(cur.pop());       // 标点不落行首：带上一个字下来
      while (cur.length > 1 && NO_END.includes(cur.at(-1).at(-1))) carry.unshift(cur.pop());   // 开括号不留行尾
    }
    push();
    cur = carry.filter((x, i) => i || x.trim());
  }
  if (cur.length) push();
  return lines;
}

const EM = ch => (ch.codePointAt(0) >= 0x2e80 ? 1 : /[A-Z]/.test(ch) ? 0.72 : /[a-z]/.test(ch) ? 0.56 : /[\d$¥€£]/.test(ch) ? 0.62 : ch === ' ' ? 0.3 : 0.4);
/** 偏宽的字宽估算（Node 测试用）：只会高估，测试通过则真实字体也放得下 */
export function approxMeasure(s, font, tracking = 0) {
  const px = parseFloat(/([\d.]+)px/.exec(font)[1]);
  let w = 0;
  for (const ch of s) w += EM(ch) * px + tracking;
  return w;
}
export const canvasMeasure = ctx => (s, font, tracking = 0) => { ctx.font = font; ctx.letterSpacing = `${tracking}px`; return ctx.measureText(s).width; };

export function layout(measure, o) {
  const { text, lang, font, zone, lineHeight = 1.25, maxLines = Infinity, tracking = 0 } = o;
  const zw = zone[2], zh = zone[3], min = o.min ?? o.size / 2;
  for (let size = Math.max(o.size, min); ; size = Math.max(min, size * 0.96)) {
    const f = fontStr(font, size), tr = tracking * size, fits = s => measure(s, f, tr) <= zw;
    const lines = wrap(tokenize(text, lang), fits, lang);
    const width = Math.max(0, ...lines.map(l => measure(l, f, tr))), height = size * lineHeight * lines.length;
    const ok = width <= zw + 0.5 && height <= zh + 0.5 && lines.length <= maxLines;
    if (ok || size <= min + 1e-9) return { size, font: f, tracking: tr, lines, width, height, overflow: !ok };
  }
}

export function prepareLayer(L, { lt, zones, W, H, minFrac, preview = false }) {
  const z = zones?.[L.zone], short = Math.min(W, H);
  if (!z) throw new Error(`text layer ${L.id}: no zone ${L.zone}`);
  return {
    ...L,
    zone: [z[0] * W, z[1] * H, z[2] * W, z[3] * H],
    size: L.size * short,
    min: Math.max(L.min ?? 0, minFrac) * short,
    reveal: L.in ? inv(L.in[0], L.in[1], lt) : 1,
    alpha: (L.out ? 1 - ss(L.out[0], L.out[1], lt) : 1) * (L.alpha ?? 1),
    showOverflow: preview,
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export function drawLayer(ctx, L, measure) {
  const r = layout(measure, L), [zx, zy, zw, zh] = L.zone, lh = r.size * (L.lineHeight ?? 1.25), n = r.lines.length, bh = lh * n;
  const y0 = L.valign === 'bottom' ? zy + zh - bh : L.valign === 'middle' ? zy + (zh - bh) / 2 : zy;
  const xOf = w => (L.align === 'center' ? zx + (zw - w) / 2 : L.align === 'right' ? zx + zw - w : zx);
  const rev = L.reveal ?? 1, a = L.alpha ?? 1;
  ctx.save();
  if (L.box && rev > 0) {                                                  // 角标底色块
    const pad = (L.box.pad ?? 0.35) * r.size, x = xOf(r.width) - pad;
    ctx.globalAlpha = a * smooth(rev * 2); ctx.fillStyle = L.box.fill;
    roundRect(ctx, x, y0 - pad * 0.4, r.width + 2 * pad, bh + pad * 0.8, (L.box.radius ?? 0.25) * r.size); ctx.fill();
  }
  if (L.leader?.at && rev > 0) {                                           // 引线：从部件点向文字延伸
    const [px, py] = L.leader.at, left = px < zx, ex = left ? xOf(r.width) - 0.4 * r.size : xOf(r.width) + r.width + 0.4 * r.size, ey = y0 + lh * 0.5;
    const k = smooth(rev * 1.6), c = L.leader.color ?? L.color;
    ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = Math.max(1.5, 0.045 * r.size);
    ctx.beginPath(); ctx.arc(px, py, 0.09 * r.size, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + (ex - px) * k, py + (ey - py) * k); ctx.stroke();
  }
  ctx.font = r.font; ctx.letterSpacing = `${r.tracking}px`; ctx.textBaseline = 'middle';
  if (L.shadow) { ctx.shadowColor = L.shadow.color; ctx.shadowBlur = (L.shadow.blur ?? 0.3) * r.size; }
  r.lines.forEach((line, i) => {
    const k = smooth(clamp(rev * (1 + 0.35 * (n - 1)) - 0.35 * i)), w = measure(line, r.font, r.tracking);
    if (k <= 0) return;
    const x = xOf(w), y = y0 + lh * (i + 0.5) + (1 - k) * 0.25 * r.size;
    ctx.globalAlpha = a * k; ctx.fillStyle = L.box?.color ?? L.color;
    ctx.save();
    if (L.pop) { const s = 0.82 + 0.18 * k + 0.1 * Math.sin(Math.PI * k); ctx.translate(x + w / 2, y); ctx.scale(s, s); ctx.translate(-(x + w / 2), -y); }
    ctx.fillText(line, x, y);
    if (L.strike) { ctx.shadowBlur = 0; ctx.fillRect(x - 0.05 * r.size, y - 0.04 * r.size, (w + 0.1 * r.size) * k, Math.max(1.5, 0.07 * r.size)); }
    ctx.restore();
  });
  if (r.overflow && L.showOverflow) { ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.strokeStyle = '#ff2a2a'; ctx.lineWidth = 4; ctx.strokeRect(zx, zy, zw, zh); }
  ctx.restore();
  return r;
}
