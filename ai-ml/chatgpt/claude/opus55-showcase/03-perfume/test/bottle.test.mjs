import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildBottle, rippleHeight, RIPPLE, GLASS, SHAPE } from '../js/bottle.js';
import { SKUS } from '../skus.js';
import { DIMS, BOX } from '../meta.js';
import { PARTS } from '../captions.js';

const make = (sku = 'whitetea') => buildBottle({}, SKUS[sku]);
const near = (a, b, eps = 2e-4) => a.forEach((x, i) => assert.ok(Math.abs(x - b[i]) < eps, `[${a.map(v => v.toFixed(4))}] vs [${b.map(v => v.toFixed(4))}]`));
const bounds = objs => { const b = new THREE.Box3(); for (const o of objs) b.expandByObject(o, true); return [b.min.toArray(), b.max.toArray()]; };
const surface = b => b.parts.liquid.children[0].geometry.attributes.position.array.slice();
const placed = b => Object.values(b.parts).map(o => o.getWorldPosition(new THREE.Vector3()).toArray()).concat([b.anchor('nozzle')]);

test('the glass body is exactly the DIMS block', () => {
  const g = make().parts.glass.geometry;
  g.computeBoundingBox();
  near(g.boundingBox.min.toArray(), [-DIMS.w / 2, 0, -DIMS.d / 2]);
  near(g.boundingBox.max.toArray(), [DIMS.w / 2, DIMS.body, DIMS.d / 2]);
});

test('assembled and exploded, every SKU fills BOX.bottle / BOX.exploded (framing uses these boxes)', () => {
  for (const sku of Object.keys(SKUS)) {
    const b = make(sku), parts = Object.values(b.parts);
    const [lo, hi] = bounds(parts);
    near(lo, BOX.bottle[0]); near(hi, BOX.bottle[1]);
    b.pose({ explode: 1 });
    const [lo2, hi2] = bounds(parts);
    near(lo2, BOX.exploded[0]); near(hi2, BOX.exploded[1]);
  }
});

test('the big glass faces are optically flat: one normal across the whole face', () => {
  const g = make().parts.glass.geometry, p = g.attributes.position, n = g.attributes.normal;
  let front = 0;
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(p.getZ(i) - DIMS.d / 2) > 1e-6) continue;          // 正面平面上的顶点（圆角只在切点处碰到这个平面）
    front++;
    near([n.getX(i), n.getY(i), n.getZ(i)], [0, 0, 1], 1e-6);
  }
  assert.ok(front >= 4, `found ${front} front-face vertices`);
});

test('the liquid stays inside the cavity, resting and at the tallest ripple', () => {
  const b = make(), inside = ([x, y, z], S) => S.planes.every(([nx, nz, d]) => nx * x + nz * z <= d + 1e-7) && y >= S.y[0] - 1e-7 && y <= S.y[1] + 1e-7;
  for (const ripple of [0, 0.05, 0.2, 0.6]) {
    b.pose({ ripple });
    b.parts.liquid.traverse(o => {
      if (!o.isMesh) return;
      const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) assert.ok(inside([p.getX(i), p.getY(i), p.getZ(i)], SHAPE.cavity), `ripple ${ripple}: vertex ${i} outside the cavity`);
    });
  }
  assert.equal(b.liquidTop(), GLASS.fill);
});

test('rippleHeight: still before landing and ahead of the wavefront; the rings fade', () => {
  for (const r of [0, 0.005, 0.02]) { assert.equal(rippleHeight(r, 0), 0); assert.equal(rippleHeight(r, -0.4), 0); }
  assert.equal(rippleHeight(RIPPLE.c * 0.2 + 1e-4, 0.2), 0);
  const peak = age => Math.max(...Array.from({ length: 300 }, (_, i) => Math.abs(rippleHeight(i * 1e-4, age))));
  assert.ok(peak(0.15) > 0.0002 && peak(0.15) <= RIPPLE.amp);
  assert.ok(peak(0.3) > peak(0.8) && peak(0.8) > peak(1.5) && peak(1.5) < peak(0.3) / 3);
});

test('pose is absolute: the same pose gives the same bottle whatever came before', () => {
  const a = make(), b = make();
  a.pose({ explode: 0.7, press: 1, capLift: 0.02, ripple: 0.4 });
  a.pose({ ripple: 0.9 }); b.pose({ ripple: 0.9 });
  assert.deepEqual(surface(a), surface(b));
  assert.deepEqual(placed(a), placed(b));
  const fresh = make();
  a.pose(); assert.deepEqual(surface(a), surface(fresh)); assert.deepEqual(placed(a), placed(fresh));
});

test('anchors: caption parts rise in order when exploded; the nozzle faces -x and moves with press', () => {
  const b = make();
  for (const k of [...PARTS, 'nozzle']) assert.ok(b.anchor(k).every(Number.isFinite), k);
  b.pose({ explode: 1 });
  const y = k => b.anchor(k)[1];
  assert.ok(y('liquid') < y('collar') && y('collar') < y('cap'));
  b.pose({ capLift: 0.1 });
  const up = b.anchor('nozzle');
  b.pose({ capLift: 0.1, press: 1 });
  const down = b.anchor('nozzle');
  assert.ok(up[0] < -0.006 && Math.abs(up[1] - down[1] - 0.002) < 1e-9 && up[1] > DIMS.body + DIMS.collar);
});
