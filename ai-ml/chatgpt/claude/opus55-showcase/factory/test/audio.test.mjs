import test from 'node:test';
import assert from 'node:assert/strict';
import { pluck, noise, impulse, mtof, SR, VOICES, BUSES } from '../engine/audio.js';

const rms = (y, t0, t1) => { let a = 0; const i0 = Math.round(t0 * SR), i1 = Math.round(t1 * SR); for (let i = i0; i < i1; i++) a += y[i] * y[i]; return Math.sqrt(a / (i1 - i0)); };
const dB = x => 20 * Math.log10(x);
/** 基频估计：0.1 秒后一段 8192 点的自相关，在 sr/f 的 ±20% 里找峰，抛物线插值到亚采样 */
function pitch(y, f) {
  const P = SR / f, s0 = Math.round(0.1 * SR), N = 8192;
  const r = lag => { let a = 0; for (let i = s0; i < s0 + N; i++) a += y[i] * y[i + lag]; return a; };
  let best = -Infinity, bl = 0;
  for (let l = Math.floor(P * 0.8); l <= Math.ceil(P * 1.2); l++) { const v = r(l); if (v > best) { best = v; bl = l; } }
  const a = r(bl - 1), b = r(bl), c = r(bl + 1);
  return SR / (bl + (0.5 * (a - c)) / (a - 2 * b + c));
}

test('mtof: A4 = 440 Hz, an octave doubles', () => {
  assert.equal(mtof(69), 440);
  assert.ok(Math.abs(mtof(81) - 880) < 1e-9 && Math.abs(mtof(62) - 293.6648) < 1e-3);
});

test('pluck: the pitch is within 0.5% from D2 to E6, at every brightness', () => {
  for (const f of [mtof(38), 110, 220, mtof(69), mtof(81), mtof(88)]) {
    for (const bright of [0, 0.5, 1]) {
      const e = pitch(pluck(f, 0.4, { bright, seed: 3 }), f);
      assert.ok(Math.abs(e / f - 1) < 0.005, `f=${f.toFixed(1)} bright=${bright}: measured ${e.toFixed(2)} Hz`);
    }
  }
});

test('pluck: t60 sets the decay, peak is 1, no DC', () => {
  const y = pluck(220, 1.2, { t60: 1, bright: 0, seed: 3 }), d = dB(rms(y, 0.9, 1.0) / rms(y, 0.05, 0.15));
  assert.ok(d < -45 && d > -65, `drop over 0.85 s at t60 = 1 s: ${d.toFixed(1)} dB`);
  const long = pluck(220, 1.2, { t60: 4, bright: 0, seed: 3 }), dl = dB(rms(long, 0.9, 1.0) / rms(long, 0.05, 0.15));
  assert.ok(dl > -20, `t60 = 4 s drops only ${dl.toFixed(1)} dB`);
  assert.equal(Math.max(...y.map(Math.abs)), 1);
  const mean = y.slice(SR * 0.5, SR).reduce((s, x) => s + x, 0) / (SR * 0.5);
  assert.ok(Math.abs(mean) < 1e-3, `DC ${mean}`);
});

test('pluck: same seed → same samples; another seed → another attack', () => {
  const a = pluck(330, 0.3, { seed: 5 }), b = pluck(330, 0.3, { seed: 5 }), c = pluck(330, 0.3, { seed: 6 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.ok(Math.abs(pitch(a, 330) - pitch(c, 330)) < 0.5);
});

test('noise: deterministic, in −1…1, zero mean', () => {
  const a = noise(48000, 9);
  assert.deepEqual(a, noise(48000, 9));
  assert.notDeepEqual(a, noise(48000, 10));
  assert.ok(a.every(x => x >= -1 && x < 1));
  assert.ok(Math.abs(a.reduce((s, x) => s + x, 0) / a.length) < 0.01);
});

test('impulse: stereo, silent pre-delay, decays about 60 dB over its length, channels differ', () => {
  const [L, R] = impulse(3.2);
  assert.equal(L.length, Math.ceil(3.2 * SR));
  assert.ok(L.slice(0, Math.round(0.012 * SR)).every(x => x === 0));
  const d = dB(rms(L, 2.9, 3.1) / rms(L, 0.02, 0.2));
  assert.ok(d < -50 && d > -75, `tail ${d.toFixed(1)} dB`);
  assert.notDeepEqual(L, R);
  assert.deepEqual(impulse(3.2)[0], L);
});

test('voices and buses the scores may use', () => {
  assert.deepEqual(Object.keys(VOICES).sort(), ['bell', 'click', 'flute', 'noise', 'pad', 'plink', 'pluck']);
  assert.deepEqual(BUSES, ['music', 'sfx']);
});
