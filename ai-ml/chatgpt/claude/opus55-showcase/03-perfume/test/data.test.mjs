import test from 'node:test';
import assert from 'node:assert/strict';
import { META, CUTS, EV, SHOTS, GRID, BAR } from '../meta.js';
import { SKUS } from '../skus.js';
import { T, sayNum, voLines, SLOTS } from '../copy.js';
import { promoLayers } from '../promos.js';
import { layersFor, fontsFor } from '../captions.js';
import { expandJobs, allAxes } from '../../factory/engine/variant.js';
import { buildCut, shotAt } from '../../factory/engine/timeline.js';
import { offGrid } from '../../factory/engine/mix.js';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url)));
const every = () => expandJobs(META, { jobs: [] }, { all: true });

test('file names', () => {
  const v = { sku: 'rose', lang: 'en', cut: 6, promo: '1111', ar: '1x1', vo: 'off' };
  assert.equal(META.fileName(v), 'wenjing_rose_6s_1x1_en_1111_novo');
  assert.equal(META.fileName({ ...v, promo: 'none', vo: 'on' }), 'wenjing_rose_6s_1x1_en');
});

test('default manifest = 24 jobs using every axis value; --all = 144', () => {
  const jobs = expandJobs(META, manifest);
  assert.equal(jobs.length, 24);
  for (const [k, list] of Object.entries(allAxes(META))) {
    if (k === 'vo') continue;
    for (const x of list) assert.ok(jobs.some(j => j[k] === x), `default batch never uses ${k}=${x}`);
  }
  assert.equal(every().length, 144);
});

test('cuts: lengths, shot names, hits on the grid and on the shot events', () => {
  assert.equal(BAR, 2 * GRID);
  for (const [c, cut] of Object.entries(CUTS)) {
    const b = buildCut(cut);
    assert.ok(Math.abs(b.duration - Number(c)) < 1e-9, `cut ${c} lasts ${b.duration}`);
    for (const e of cut.shots) assert.ok(SHOTS.includes(e.shot));
    assert.deepEqual(offGrid(Object.values(cut.hits)), [], `cut ${c} has off-grid hits`);
    const at = (name, lt) => { const e = shotAt(b, name); return e.start + lt - e.from; };
    assert.ok(Math.abs(cut.hits.land - at('drop', EV.land)) < 1e-9, 'land hit ≠ drop landing');
    if ('streak' in cut.hits) assert.ok(Math.abs(cut.hits.streak - at('hero', EV.streak)) < 1e-9, 'streak hit ≠ light streak');
    assert.equal(cut.hits.logo, shotAt(b, 'end').start);
    const h = shotAt(b, 'hero'); assert.ok(b.cover > h.start && b.cover < h.end, 'cover frame must be in the hero shot');
  }
});

test('skus: complete for both languages, deal below price', () => {
  assert.deepEqual(Object.keys(SKUS), META.axes.sku);
  for (const [id, k] of Object.entries(SKUS)) {
    for (const L of META.axes.lang) {
      assert.ok(k.name[L] && k.image[L], `${id} ${L}`); assert.equal(k.notes[L].length, 3);
    }
    for (const c of ['CNY', 'USD']) assert.ok(k.deal[c] < k.price[c], `${id} deal ${c}`);
    assert.match(k.liquid.color, /^#[0-9a-f]{6}$/); assert.equal(k.liquid.absorb.length, 3);
    for (const f of ['ink', 'soft', 'accent', 'cta', 'ctaInk', 'shadow']) assert.ok(k.palette[f], `${id} palette.${f}`);
  }
});

test('sayNum reads numbers the way a narrator would', () => {
  const zh = { 0: '零', 9: '九', 10: '十', 15: '十五', 110: '一百一十', 469: '四百六十九', 499: '四百九十九', 509: '五百零九', 1000: '一千', 1050: '一千零五十' };
  for (const [n, s] of Object.entries(zh)) assert.equal(sayNum(+n, 'zh'), s);
  const en = { 0: 'zero', 13: 'thirteen', 20: 'twenty', 69: 'sixty-nine', 95: 'ninety-five', 109: 'one hundred nine', 1200: 'one thousand two hundred' };
  for (const [n, s] of Object.entries(en)) assert.equal(sayNum(+n, 'en'), s);
});

test('voice-over lines: no digits, inside the cut, no overlaps, stable ids', () => {
  const byId = new Map();
  for (const v of every()) {
    const lines = voLines(v), dur = Number(v.cut);
    assert.equal(lines.length, Object.keys(SLOTS[v.cut]).length);
    lines.forEach((l, i) => {
      assert.doesNotMatch(l.text, /\d/, `${l.id}: spell numbers out`);
      assert.ok(l.at >= 0 && l.at + l.max <= dur, `${l.id} slot leaves the cut`);
      if (i) assert.ok(lines[i - 1].at + lines[i - 1].max <= l.at, `${l.id} overlaps the previous line`);
      assert.ok(l.voice && l.speed > 0);
      if (byId.has(l.id)) assert.equal(byId.get(l.id), l.text, `${l.id} means two different lines`); else byId.set(l.id, l.text);
    });
    assert.deepEqual(voLines({ ...v, vo: 'off' }), []);
  }
  assert.ok(byId.get('rose_zh_15_end_1111').includes('五百八十九'));
});

test('promo cards pull prices from the sku table', () => {
  const pal = SKUS.rose.palette;
  const zh = promoLayers({ sku: 'rose', lang: 'zh', promo: '1111' }, { pal });
  assert.equal(zh.find(l => l.id === 'price').text, '到手价 ¥589');
  assert.equal(zh.find(l => l.id === 'was').text, '日常价 ¥799');
  const en = promoLayers({ sku: 'rose', lang: 'en', promo: '1111' }, { pal });
  assert.equal(en.find(l => l.id === 'price').text, 'Now $79');
  assert.ok(promoLayers({ sku: 'rose', lang: 'en', promo: 'none' }, { pal }).some(l => l.text === T.en.cta));
});

test('captions: unique ids per shot, leaders on the notes, fonts cover every character', () => {
  for (const v of every()) {
    for (const e of CUTS[v.cut].shots) {
      const ls = layersFor(v, { name: e.shot, from: e.from ?? 0, dur: e.dur });
      assert.equal(new Set(ls.map(l => l.id)).size, ls.length);
      for (const l of ls) assert.ok(l.text && l.font?.family && l.zone && l.size > 0, `${e.shot}.${l.id}`);
      if (e.shot === 'anatomy') assert.equal(ls.filter(l => l.leader).length, 3);
    }
    const fonts = fontsFor(v);
    for (const e of CUTS[v.cut].shots) for (const l of layersFor(v, { name: e.shot, from: e.from ?? 0 })) {
      const f = fonts.find(x => x.family === l.font.family && x.weight === (l.font.weight ?? 400));
      for (const ch of l.text.replace(/\s/g, '')) assert.ok(f.text.includes(ch), `${l.font.family} misses ${ch}`);
    }
  }
});
