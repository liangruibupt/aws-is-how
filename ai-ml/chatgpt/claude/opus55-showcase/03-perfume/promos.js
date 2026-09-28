// promos.js — 片尾卡的三种预设：none（标语 + 购买按钮）、1111（双11 价签）、launch（新品首发）
// 价格与文案从香型表、语言表里取；图层放在 end 镜头的 line1–line3 三个区
import { SKUS } from './skus.js';
import { T, FONTS, money } from './copy.js';

export const PROMO_T = {
  zh: { ribbon: '双11 狂欢价', deal: '到手价', was: '日常价', launch: '新品首发', gift: '首发赠 2 ml 随行装' },
  en: { ribbon: '11.11 Global Shopping Festival', deal: 'Now', was: 'Was', launch: 'New Arrival', gift: 'Free 2 ml travel spray' },
};
export const RED = '#e1251b';

/** a = 入场起点（镜头本地秒），pal = 香型配色 */
export function promoLayers(v, { a = 0, align = 'center', pal }) {
  const k = SKUS[v.sku], L = v.lang, P = PROMO_T[L], F = FONTS[L], cur = T[L].currency;
  const base = { lang: L, align, valign: 'middle', color: pal.ink, shadow: { color: pal.shadow, blur: 0.35 } };
  const pill = (id, zone, text, t0, fill, ink) => ({ ...base, id, zone, text, font: FONTS.num, size: 0.04, tracking: 0.06, in: [t0, t0 + 0.5], box: { fill, color: ink, pad: 0.55, radius: 0.5 }, shadow: null });
  if (v.promo === '1111') return [
    { ...pill('ribbon', 'line1', P.ribbon, a, RED, '#ffffff'), size: 0.042, box: { fill: RED, color: '#ffffff', pad: 0.45, radius: 0.15 } },
    { ...base, id: 'price', zone: 'line2', text: `${P.deal} ${money(k.deal[cur], L)}`, font: FONTS.num, size: 0.075, lineHeight: 1.1, in: [a + 0.3, a + 0.7], pop: true },
    { ...base, id: 'was', zone: 'line3', text: `${P.was} ${money(k.price[cur], L)}`, font: FONTS.num, size: 0.038, in: [a + 0.6, a + 1.0], strike: true, color: pal.soft },
  ];
  if (v.promo === 'launch') return [
    pill('ribbon', 'line1', P.launch, a, pal.accent, pal.ctaInk),
    { ...base, id: 'gift', zone: 'line2', text: P.gift, font: F.body, size: 0.046, tracking: 0.03, in: [a + 0.3, a + 0.8] },
    pill('cta', 'line3', T[L].cta, a + 0.6, pal.cta, pal.ctaInk),
  ];
  return [
    { ...base, id: 'tagline', zone: 'line1', text: T[L].tagline, font: F.display, size: 0.05, tracking: L === 'zh' ? 0.2 : 0.04, in: [a, a + 0.6] },
    pill('cta', 'line2', T[L].cta, a + 0.5, pal.cta, pal.ctaInk),
  ];
}
