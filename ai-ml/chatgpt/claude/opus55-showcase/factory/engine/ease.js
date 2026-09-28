// ease.js — 插值与缓动（输入先夹到 0–1）

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const inv = (a, b, x) => clamp((x - a) / (b - a));
export const smooth = k => { k = clamp(k); return k * k * (3 - 2 * k); };
export const ss = (a, b, x) => smooth((x - a) / (b - a));
export const easeInOut = k => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
export const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
export const easeIn = k => Math.pow(clamp(k), 3);
export const expOut = (k, s = 6) => (1 - Math.exp(-s * clamp(k))) / (1 - Math.exp(-s));
/** 窗口：a→b 渐入，c→d 渐出 */
export const win = (x, a, b, c, d) => ss(a, b, x) * (1 - ss(c, d, x));
