import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, hashU32, rand, seedOf } from '../engine/rng.js';
import { clamp, lerp, inv, smooth, ss, easeInOut, easeOut, easeIn, expOut, win } from '../engine/ease.js';
import { drift } from '../engine/particles.js';

test('rand is stateless and in [0, 1)', () => {
  const a = [0, 1, 2, 999].map(i => rand(7, i));
  rand(7, 12345); mulberry32(3)(); Math.random();
  assert.deepEqual([0, 1, 2, 999].map(i => rand(7, i)), a);
  for (let i = 0; i < 5000; i++) { const x = rand(42, i); assert.ok(x >= 0 && x < 1); }
  assert.notEqual(rand(7, 1), rand(8, 1));
  assert.notEqual(rand(7, 1), rand(7, 2));
});

test('rand is roughly uniform', () => {
  let s = 0; const n = 20000;
  for (let i = 0; i < n; i++) s += rand(1, i);
  assert.ok(Math.abs(s / n - 0.5) < 0.01);
});

test('mulberry32 repeats for the same seed', () => {
  const a = mulberry32(99), b = mulberry32(99);
  for (let i = 0; i < 10; i++) assert.equal(a(), b());
});

test('hashU32 and seedOf are stable uint32', () => {
  assert.equal(hashU32(0), hashU32(0));
  assert.ok(Number.isInteger(hashU32(123)) && hashU32(123) >= 0 && hashU32(123) < 2 ** 32);
  assert.equal(seedOf('whitetea'), seedOf('whitetea'));
  assert.notEqual(seedOf('whitetea'), seedOf('rose'));
  assert.equal(seedOf(''), 0x811c9dc5);
});

test('easing endpoints and shape', () => {
  assert.equal(clamp(2), 1); assert.equal(clamp(-1), 0); assert.equal(clamp(5, 0, 10), 5);
  assert.equal(lerp(2, 4, 0.5), 3);
  assert.equal(inv(2, 4, 3), 0.5); assert.equal(inv(2, 4, 9), 1);
  for (const f of [smooth, easeInOut, easeOut, easeIn, expOut]) {
    assert.equal(f(0), 0); assert.ok(Math.abs(f(1) - 1) < 1e-12); assert.ok(f(0.5) > 0 && f(0.5) < 1);
    assert.equal(f(-1), 0); assert.ok(Math.abs(f(2) - 1) < 1e-12);
  }
  assert.equal(smooth(0.5), 0.5); assert.equal(ss(0, 2, 1), 0.5);
  assert.equal(win(0, 1, 2, 3, 4), 0); assert.equal(win(2.5, 1, 2, 3, 4), 1); assert.equal(win(5, 1, 2, 3, 4), 0);
});

test('drift is a pure function of (seed, i, t)', () => {
  const box = [-1, 0, -1, 1, 2, 1], o = { vel: [0, -0.3, 0], sway: 0.1 };
  const a = drift(5, 3, 4.2, box, o);
  drift(5, 3, 0.1, box, o); drift(5, 4, 9, box, o);
  assert.deepEqual(drift(5, 3, 4.2, box, o), a);
});

test('drift stays in the box (plus sway), fades near the wrap, moves smoothly', () => {
  const box = [-1, 0, -1, 1, 2, 1], o = { vel: [0, -0.3, 0], sway: 0.1 };
  for (let i = 0; i < 200; i++) for (let t = 0; t < 20; t += 0.37) {
    const [x, y, z, ph, f] = drift(1, i, t, box, o);
    assert.ok(x >= -1.11 && x <= 1.11 && z >= -1.07 && z <= 1.07, `x/z out of box: ${x} ${z}`);
    assert.ok(y >= 0 && y <= 2, `y out of box: ${y}`);
    assert.ok(ph >= 0 && ph < 1 && f >= 0 && f <= 1);
    const [, y2, , , f2] = drift(1, i, t + 1 / 60, box, o);
    if (Math.abs(y2 - y) > 0.1) assert.ok(f < 0.05 && f2 < 0.05, 'a wrap jump must be invisible');
  }
});
