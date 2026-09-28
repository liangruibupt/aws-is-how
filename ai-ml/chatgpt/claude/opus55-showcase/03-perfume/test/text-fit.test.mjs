import test from 'node:test';
import assert from 'node:assert/strict';
import { META, CUTS } from '../meta.js';
import { LAYOUTS } from '../layouts.js';
import { layersFor } from '../captions.js';
import { ASPECTS, MIN_TEXT, expandJobs } from '../../factory/engine/variant.js';
import { prepareLayer, layout, approxMeasure } from '../../factory/engine/text.js';

// 每个变体 × 每个镜头 × 每个图层，用偏宽的字宽模型排版：必须放得下，且不低于最小字号
test('every caption fits its zone at or above the minimum size', () => {
  let n = 0;
  const bad = [];
  for (const v of expandJobs(META, { jobs: [] }, { all: true })) {
    const [W, H] = ASPECTS[v.ar];
    for (const e of CUTS[v.cut].shots) {
      const row = LAYOUTS[v.ar][e.shot];
      for (const spec of layersFor(v, { name: e.shot, from: e.from ?? 0, dur: e.dur, row })) {
        const L = prepareLayer(spec, { lt: 99, zones: row.zones, W, H, minFrac: MIN_TEXT[v.ar] }), r = layout(approxMeasure, L);
        n++;
        if (r.overflow) bad.push(`${v.ar} ${v.sku} ${v.lang} ${v.promo} ${e.shot}.${spec.id}: "${spec.text}"`);
        assert.ok(r.size >= L.min - 1e-9);
      }
    }
  }
  assert.deepEqual(bad, []);
  assert.ok(n > 1000, `only ${n} layouts checked`);
});
