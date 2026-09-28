import test from 'node:test';
import assert from 'node:assert/strict';
import { pluck, noise, impulse, mtof, SR, VOICES, BUSES, VO, duck, voPlan } from '../engine/audio.js';

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

test('duck: each line dips the music from attack before it to release after it', () => {
  const o = { depth: -9, attack: 0.12, release: 0.3 }, g = Math.pow(10, -9 / 20);
  const same = (a, b) => { assert.equal(a.length, b.length, JSON.stringify(a)); a.forEach(([t, v], i) => assert.ok(Math.abs(t - b[i][0]) < 1e-9 && Math.abs(v - b[i][1]) < 1e-9, `point ${i}: ${[t, v]} ≠ ${b[i]}`)); };
  same(duck([], o), [[0, 1]]);
  same(duck([{ at: 4.6, dur: 2 }], o), [[0, 1], [4.48, 1], [4.6, g], [6.6, g], [6.9, 1]]);
  same(duck([{ at: 5, dur: 1 }, { at: 1, dur: 1 }], o), [[0, 1], [0.88, 1], [1, g], [2, g], [2.3, 1], [4.88, 1], [5, g], [6, g], [6.3, 1]]);
  // 两句之间来不及回来（7.58 < 7.4 + 0.3）：一直压着
  same(duck([{ at: 4.6, dur: 2.8 }, { at: 7.7, dur: 2.6 }], o), [[0, 1], [4.48, 1], [4.6, g], [10.3, g], [10.6, 1]]);
  // 一开头就有配音
  same(duck([{ at: 0, dur: 1 }], o), [[0, g], [1, g], [1.3, 1]]);
  same(duck([{ at: 0.06, dur: 1 }], o), [[0, 1 + (g - 1) / 2], [0.06, g], [1.06, g], [1.36, 1]]);
  assert.equal(duck([{ at: 2, dur: 1 }])[2][1], Math.pow(10, VO.duck / 20));
});

test('voPlan: every line needs a clip made from its current text, voice and speed, no longer than its slot', () => {
  const film = { id: 'demo', voLines: v => (v.vo === 'off' ? [] : [{ id: 'a', text: 'Hello.', voice: 'af_heart', speed: 1, at: 1, max: 2 }]) };
  const ok = { a: { text: 'Hello.', voice: 'af_heart', speed: 1, rate: 1, dur: 1.5, lufs: -20 } }, on = { vo: 'on' };
  assert.deepEqual(voPlan(film, on, ok), [{ id: 'a', at: 1, dur: 1.5, file: 'a.mp3' }]);
  assert.deepEqual(voPlan(film, { vo: 'off' }, {}), []);
  assert.deepEqual(voPlan({ id: 'mute' }, on, {}), []);
  assert.throws(() => voPlan(film, on, {}), /voice-over clip missing: a \(run: node factory\/vo\.mjs demo\)/);
  for (const k of [{ text: 'Hi.' }, { voice: 'bf_emma' }, { speed: 1.1 }]) assert.throws(() => voPlan(film, on, { a: { ...ok.a, ...k } }), /voice-over clip out of date: a/);
  assert.throws(() => voPlan(film, on, { a: { ...ok.a, dur: 2.2 } }), /a is 2\.2 s, longer than its 2 s slot/);
  assert.throws(() => voPlan(film, on, { a: { ...ok.a, dur: undefined } }), /longer than its 2 s slot/);
});
