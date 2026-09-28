import test from 'node:test';
import assert from 'node:assert/strict';
import { sheetPlan, keyTimes } from '../engine/sheet.js';
import { parseVariant } from '../engine/variant.js';
import { buildCut } from '../engine/timeline.js';

const film = { axes: { sku: ['a', 'b'], lang: ['zh', 'en'], cut: [15, 6], promo: ['none', 'x'] } };
const plan = q => sheetPlan(film, new URLSearchParams(q));

test('sheetPlan: every ratio × language by default, first row drives the initial variant', () => {
  const { params, plan: p } = plan('sheet&sku=b');
  assert.deepEqual(p.rows.map(r => `${r.ar} ${r.lang}`), ['9x16 zh', '9x16 en', '1x1 zh', '1x1 en', '16x9 zh', '16x9 en']);
  assert.deepEqual(p.times, []);
  assert.equal(p.scale, 0.25);
  assert.deepEqual(parseVariant(film, params), { sku: 'b', lang: 'zh', cut: 15, promo: 'none', ar: '9x16', vo: 'on' });
});

test('sheetPlan: comma lists narrow the rows; times and scale parse', () => {
  const { params, plan: p } = plan('sheet=1,4.6,9&ar=16x9,1x1&lang=en&scale=0.5');
  assert.deepEqual(p.rows, [{ ar: '16x9', lang: 'en' }, { ar: '1x1', lang: 'en' }]);
  assert.deepEqual(p.times, [1, 4.6, 9]);
  assert.equal(p.scale, 0.5);
  assert.equal(params.get('ar'), '16x9');
  assert.equal(params.get('lang'), 'en');
});

test('sheetPlan: a film without a lang axis gets one row per ratio', () => {
  const { plan: p } = sheetPlan({ axes: { sku: ['a'] } }, new URLSearchParams('sheet'));
  assert.deepEqual(p.rows, [{ ar: '9x16' }, { ar: '1x1' }, { ar: '16x9' }]);
});

test('sheetPlan: bad times or scale fail loudly', () => {
  assert.throws(() => plan('sheet=1,x'), /bad times/);
  assert.throws(() => plan('sheet&scale=2'), /scale/);
});

test('keyTimes: 60% into every entry of the edit list', () => {
  const b = buildCut({ shots: [{ shot: 'a', dur: 2 }, { shot: 'b', dur: 3, transition: { type: 'dissolve', dur: 0.5 } }] });
  assert.deepEqual(keyTimes(b), b.entries.map(e => Math.round((e.start + 0.6 * (e.end - e.start)) * 100) / 100));
  assert.equal(keyTimes(b)[0], 1.2);
});
