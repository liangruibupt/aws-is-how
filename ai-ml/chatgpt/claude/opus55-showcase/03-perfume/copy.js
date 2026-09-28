// copy.js — 文案：字体、界面用语、价格、配音台词与时段（纯数据）
// 配音里的数字一律写成汉字 / 英文单词：Kokoro 直接读阿拉伯数字不稳定
import { SKUS } from './skus.js';

export const FONTS = {
  zh: { display: { family: 'Noto Serif SC', weight: 600 }, body: { family: 'Noto Serif SC', weight: 500 } },
  en: { display: { family: 'Cormorant Garamond', weight: 600 }, body: { family: 'Cormorant Garamond', weight: 500 } },
  num: { family: 'Noto Sans SC', weight: 700, fallback: 'sans-serif' },
};
export const T = {
  zh: { sub: '闻境 · WENJING', tagline: '闻香 · 入境', edp: '50 ml · 浓香水', tiers: ['前调', '中调', '后调'], cta: '点击购买', currency: 'CNY' },
  en: { sub: 'WENJING', tagline: 'Breathe in. Step in.', edp: '50 ml · Eau de Parfum', tiers: ['TOP', 'HEART', 'BASE'], cta: 'Shop now', currency: 'USD' },
};
export const money = (n, lang) => (lang === 'zh' ? `¥${n}` : `$${n}`);

const ZH = '零一二三四五六七八九', UNIT = ['', '十', '百', '千'];
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function zhNum(n) {
  if (n === 0) return '零';
  const ds = [...String(n)].map(Number);
  let s = '', zero = false;
  ds.forEach((d, i) => {
    const u = UNIT[ds.length - 1 - i];
    if (d === 0) { zero = true; return; }
    if (zero) { s += '零'; zero = false; }
    s += (d === 1 && u === '十' && i === 0 ? '' : ZH[d]) + u;
  });
  return s;
}
function enNum(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${enNum(n % 100)}` : ''}`;
  return `${enNum(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${enNum(n % 1000)}` : ''}`;
}
/** 0–9999 → 读法 */
export const sayNum = (n, lang) => (lang === 'zh' ? zhNum(n) : enNum(n));

// ── 配音 ──
export const VOICE = { zh: 'zm_yunjian', en: 'am_michael' };           // Task 16 试听后定稿
export const AUDITION = { zh: ['zf_xiaoxiao', 'zf_xiaoyi', 'zm_yunjian', 'zm_yunxi'], en: ['af_heart', 'bf_emma', 'am_michael', 'bm_george'] };
export const SPEED = { zh: 1, en: 1 };
// 时段（成片秒）：[开始, 最长]
export const SLOTS = { 15: { hero: [4.6, 2.8], notes: [7.7, 2.6], end: [12.3, 2.6] }, 6: { one: [1.1, 3.7] } };

const END = {
  zh: { none: (k, d) => `闻境${k.name.zh}，闻香入境。`, 1111: (k, d) => `双十一，到手${d}元。`, launch: k => `闻境新品，${k.name.zh}首发。` },
  en: { none: k => `Wenjing ${k.name.en}. Breathe in.`, 1111: (k, d) => `Eleven-eleven price: ${d} dollars.`, launch: k => `New from Wenjing: ${k.name.en}.` },
};
const ONE = {
  zh: { none: k => `闻境${k.name.zh}，${k.image.zh}。`, 1111: (k, d) => `闻境${k.name.zh}，双十一到手${d}元。`, launch: k => `闻境新品，${k.name.zh}首发。` },
  en: { none: k => `Wenjing ${k.name.en}. ${k.image.en}.`, 1111: (k, d) => `Wenjing ${k.name.en}, now ${d} dollars.`, launch: k => `New from Wenjing: ${k.name.en}.` },
};

/** 变体 → 配音台词 [{ id, text, voice, speed, at, max }]；同一 id 在所有变体里文字相同 */
export function voLines(v) {
  if (v.vo === 'off') return [];
  const k = SKUS[v.sku], L = v.lang, d = sayNum(k.deal[T[L].currency], L), voice = k.voice?.[L] ?? VOICE[L];
  const line = (slot, key, text) => { const [at, max] = SLOTS[v.cut][slot]; return { id: `${v.sku}_${L}_${v.cut}_${key}`, text, voice, speed: SPEED[L], at, max }; };
  if (v.cut === 6) return [line('one', `one_${v.promo}`, ONE[L][v.promo](k, d))];
  const [n0, n1, n2] = k.notes[L];
  return [
    line('hero', 'hero', L === 'zh' ? `${k.image.zh}。` : `${k.image.en}.`),
    line('notes', 'notes', L === 'zh' ? `${n0}、${n1}、${n2}。` : `${n0}, ${n1}, ${n2}.`),
    line('end', `end_${v.promo}`, END[L][v.promo](k, d)),
  ];
}
