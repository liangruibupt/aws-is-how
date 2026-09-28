import test from 'node:test';
import assert from 'node:assert/strict';
import { ASPECTS, ENGINE_AXES, UNSAFE, MIN_TEXT, allAxes, parseVariant, expandJobs, variantQuery, variantName } from '../engine/variant.js';

const film = {
  axes: { sku: ['a', 'b'], lang: ['zh', 'en'], cut: [15, 6], promo: ['none', 'x'] },
  fileName: v => `t_${v.sku}_${v.cut}s_${v.ar}_${v.lang}${v.promo === 'none' ? '' : '_' + v.promo}${v.vo === 'off' ? '_novo' : ''}`,
};

test('aspects, engine axes, safe areas', () => {
  assert.deepEqual(Object.keys(ASPECTS), ['9x16', '1x1', '16x9']);
  assert.deepEqual(ENGINE_AXES.vo, ['on', 'off']);
  for (const ar of ENGINE_AXES.ar) { assert.ok(Array.isArray(UNSAFE[ar])); assert.ok(MIN_TEXT[ar] >= 0.03); }
  assert.deepEqual(Object.keys(allAxes(film)), ['sku', 'lang', 'cut', 'promo', 'ar', 'vo']);
});

test('parseVariant: defaults, URL params, numbers, errors', () => {
  assert.deepEqual(parseVariant(film, {}), { sku: 'a', lang: 'zh', cut: 15, promo: 'none', ar: '9x16', vo: 'on' });
  const v = parseVariant(film, new URLSearchParams('cut=6&ar=16x9&render'));
  assert.equal(v.cut, 6); assert.equal(v.ar, '16x9');
  assert.throws(() => parseVariant(film, { sku: 'zzz' }), /unknown sku: zzz/);
  assert.throws(() => parseVariant(film, { ar: '4x3' }), /unknown ar/);
});

test('variantQuery round-trips', () => {
  const v = { sku: 'b', lang: 'en', cut: 6, promo: 'x', ar: '1x1', vo: 'off' };
  assert.equal(variantQuery(film, v), 'sku=b&lang=en&cut=6&promo=x&ar=1x1&vo=off');
  assert.deepEqual(parseVariant(film, new URLSearchParams(variantQuery(film, v))), v);
  assert.equal(variantName(film, v), 't_b_6s_1x1_en_x_novo');
});

test('expandJobs: "*", explicit lists, defaults, dedupe, order', () => {
  const jobs = expandJobs(film, { jobs: [
    { sku: ['*'], ar: ['*'], lang: ['zh'], cut: [15], promo: ['none'] },
    { sku: ['a'], ar: ['9x16'], lang: ['zh'], cut: [15], promo: ['none'] },   // duplicate of the first grid
    { sku: ['b'], ar: ['1x1'], lang: ['en'], cut: [6], promo: ['x'], vo: ['off'] },
  ] });
  assert.equal(jobs.length, 2 * 3 + 1);
  assert.deepEqual(jobs[0], { sku: 'a', lang: 'zh', cut: 15, promo: 'none', ar: '9x16', vo: 'on' });
  assert.equal(jobs.at(-1).vo, 'off');
  assert.equal(new Set(jobs.map(film.fileName)).size, jobs.length);
});

test('expandJobs: all = full grid with voice-over on', () => {
  const jobs = expandJobs(film, { jobs: [] }, { all: true });
  assert.equal(jobs.length, 2 * 2 * 2 * 2 * 3);
  assert.ok(jobs.every(j => j.vo === 'on'));
});

test('expandJobs rejects unknown axes and values', () => {
  assert.throws(() => expandJobs(film, { jobs: [{ colour: ['red'] }] }), /unknown axis colour/);
  assert.throws(() => expandJobs(film, { jobs: [{ cut: [30] }] }), /unknown cut: 30/);
});
