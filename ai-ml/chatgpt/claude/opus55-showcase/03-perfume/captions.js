// captions.js — 各镜头的字幕图层（纯数据）：文字、字体、区、字号（画面短边比例）、入场 / 退场（镜头本地秒）
// 入场时段相对 s.from（这一条剪辑里镜头的起始本地时间），所以 6 秒版从中段切入的镜头字幕照样完整入场
import { CUTS } from './meta.js';
import { SKUS } from './skus.js';
import { T, FONTS } from './copy.js';
import { promoLayers } from './promos.js';

export const PARTS = ['cap', 'collar', 'liquid'];          // 前 / 中 / 后调引线指向的部件（shots.js 填世界坐标）

/** s = { name, from, dur, row } → 图层数组 */
export function layersFor(v, s) {
  const k = SKUS[v.sku], L = v.lang, F = FONTS[L], pal = k.palette, a = s.from ?? 0, align = s.row?.align ?? 'center';
  const base = { lang: L, align, valign: 'top', color: pal.ink, shadow: { color: pal.shadow, blur: 0.4 } };
  switch (s.name) {
    case 'macro': return [
      { ...base, id: 'hook', zone: 'hook', text: k.image[L], font: F.display, size: L === 'zh' ? 0.058 : 0.054, tracking: L === 'zh' ? 0.08 : 0.01, lineHeight: 1.35, in: [a + 0.35, a + 0.95] },
    ];
    case 'hero': return [
      { ...base, id: 'title', zone: 'title', text: k.name[L], font: F.display, size: 0.09, tracking: L === 'zh' ? 0.2 : 0.04, maxLines: 1, in: [a + 0.3, a + 0.9] },
      { ...base, id: 'sub', zone: 'sub', text: T[L].sub, font: F.body, size: 0.038, tracking: 0.3, color: pal.soft, in: [a + 0.6, a + 1.2] },
    ];
    case 'anatomy': return [
      ...k.notes[L].map((n, i) => ({
        ...base, id: `n${i}`, zone: `n${i}`, text: `${T[L].tiers[i]}\n${n}`, font: F.body, size: 0.042, tracking: 0.04,
        in: [a + 0.5 + 0.2 * i, a + 0.9 + 0.2 * i], out: [a + 2.15, a + 2.4], leader: { part: PARTS[i], color: pal.accent },
      })),
      { ...base, id: 'edp', zone: 'edp', text: T[L].edp, font: F.body, size: 0.04, tracking: 0.06, color: pal.soft, in: [a + 1.2, a + 1.6] },
    ];
    case 'end': return [
      { ...base, id: 'logo', zone: 'logo', lang: 'zh', text: '闻境', font: FONTS.zh.display, size: 0.11, tracking: 0.3, lineHeight: 1.05, maxLines: 1, in: [a, a + 0.5] },
      { ...base, id: 'brand', zone: 'brand', lang: 'en', text: 'WENJING', font: FONTS.en.display, size: 0.036, tracking: 0.55, color: pal.soft, in: [a + 0.2, a + 0.7] },
      ...promoLayers(v, { a: a + 0.3, align, pal }),
    ];
    default: return [];
  }
}

/** 变体用到的每种字体及其全部字符：页面在第一帧前按这些字符加载字体子集 */
export function fontsFor(v) {
  const m = new Map();
  for (const e of CUTS[v.cut].shots) for (const L of layersFor(v, { name: e.shot, from: e.from ?? 0, dur: e.dur })) {
    const key = `${L.font.family}|${L.font.weight ?? 400}`;
    m.set(key, (m.get(key) ?? '') + L.text);
  }
  return [...m].map(([key, text]) => { const [family, weight] = key.split('|'); return { family, weight: +weight, text: [...new Set(text.replace(/\s/g, ''))].join('') }; });
}
