import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCut, resolve, shotAt } from '../engine/timeline.js';

// 与 03-perfume/meta.js 相同的两条剪辑表（本测试自带一份，不依赖成片数据）
const C15 = { shots: [
  { shot: 'macro', dur: 2.25 }, { shot: 'drop', dur: 2.25 },
  { shot: 'hero', dur: 3.0, transition: { type: 'dissolve', dur: 0.3 } },
  { shot: 'anatomy', dur: 3.0 },
  { shot: 'spray', dur: 1.5, transition: { type: 'dissolve', dur: 0.25 } },
  { shot: 'end', dur: 3.0, transition: { type: 'dissolve', dur: 0.4 } },
], hits: { land: 3.0, streak: 6.0, logo: 12.0 }, cover: 6.4 };
const C6 = { shots: [
  { shot: 'drop', dur: 1.5, from: 0.75 },
  { shot: 'hero', dur: 1.5, from: 0.75, transition: { type: 'flash', dur: 0.2 } },
  { shot: 'end', dur: 3.0, transition: { type: 'dissolve', dur: 0.3 } },
], hits: { land: 0, logo: 3.0 }, cover: 2.6 };
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} ≠ ${b}`);

test('buildCut: starts, ends, durations', () => {
  const b = buildCut(C15);
  near(b.duration, 15);
  assert.deepEqual(b.entries.map(e => e.start), [0, 2.25, 4.5, 7.5, 10.5, 12]);
  assert.equal(b.entries[2].dur, 3.0);
  const b6 = buildCut(C6);
  near(b6.duration, 6); assert.equal(b6.entries[0].dur, 2.25); assert.equal(b6.entries[0].from, 0.75);
  assert.deepEqual(b6.hits, { land: 0, logo: 3.0 }); assert.equal(b6.cover, 2.6);
  assert.equal(shotAt(b, 'anatomy').start, 7.5);
});

test('buildCut validates', () => {
  assert.throws(() => buildCut({ shots: [] }), /empty/);
  assert.throws(() => buildCut({ shots: [{ shot: 'a', dur: 0 }] }), /dur/);
  assert.throws(() => buildCut({ shots: [{ shot: 'a', dur: 1 }, { shot: 'b', dur: 1, transition: { type: 'wipe', dur: 0.2 } }] }), /transition/);
  assert.throws(() => buildCut({ shots: [{ shot: 'a', dur: 1 }, { shot: 'b', dur: 0.2, transition: { type: 'dissolve', dur: 0.5 } }] }), /longer/);
});

test('resolve: exact boundaries go to the next shot', () => {
  const b = buildCut(C15);
  assert.equal(resolve(b, 0).shot, 'macro'); near(resolve(b, 0).lt, 0);
  assert.equal(resolve(b, 2.2499).shot, 'macro');
  const r = resolve(b, 2.25); assert.equal(r.shot, 'drop'); near(r.lt, 0);
  assert.equal(resolve(b, 7.5).shot, 'anatomy');
});

test('resolve: local time, u, from-trim, clamping', () => {
  const b = buildCut(C15), r = resolve(b, 3.0);
  assert.equal(r.shot, 'drop'); near(r.lt, 0.75); near(r.u, 0.75 / 2.25);
  const b6 = buildCut(C6), s = resolve(b6, 0);
  assert.equal(s.shot, 'drop'); near(s.lt, 0.75); near(s.u, 0.75 / 2.25);
  const h = resolve(b6, 1.5); assert.equal(h.shot, 'hero'); near(h.lt, 0.75);
  const e = resolve(b6, 6); assert.equal(e.shot, 'end'); near(e.u, 1);
  assert.equal(resolve(b6, 99).shot, 'end'); assert.equal(resolve(b6, -1).shot, 'drop');
});

test('resolve: flash decays linearly over its length', () => {
  const b6 = buildCut(C6);
  near(resolve(b6, 1.5).flash, 1); near(resolve(b6, 1.6).flash, 0.5); near(resolve(b6, 1.7).flash, 0);
  assert.equal(resolve(b6, 1.0).flash, 0); assert.equal(resolve(b6, 1.6).prev, null);
});

test('resolve: dissolve keeps the outgoing shot running', () => {
  const b = buildCut(C15), r = resolve(b, 4.65);
  assert.equal(r.shot, 'hero'); near(r.lt, 0.15);
  assert.equal(r.prev.shot, 'drop'); near(r.prev.lt, 2.4); near(r.prev.u, 1);
  near(r.prev.k, 0.5);
  assert.equal(resolve(b, 4.85).prev, null);
  assert.equal(resolve(b, 4.5).prev.k, 0);
});

test('resolve is pure: any call order gives the same answers', () => {
  const b = buildCut(C15), ts = [0, 14.99, 3.3, 7.6, 1, 12.2, 4.6, 15];
  const a = ts.map(t => resolve(b, t));
  const c = [...ts].reverse().map(t => resolve(b, t)).reverse();
  assert.deepEqual(a, c);
});
