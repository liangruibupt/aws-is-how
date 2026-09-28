import test from 'node:test';
import assert from 'node:assert/strict';
import { duckPoints, duckAt, wavFloat32, clipKey, offGrid } from '../engine/mix.js';

const G = Math.pow(10, -9 / 20);
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} ≠ ${b}`);

test('duck: one slot ramps down before speech and back up after', () => {
  const p = duckPoints([[4.7, 6.9]]);
  near(duckAt(p, 0), 1); near(duckAt(p, 4.58), 1); near(duckAt(p, 4.7), G); near(duckAt(p, 6.9), G); near(duckAt(p, 7.2), 1);
  near(duckAt(p, 4.64), (1 + G) / 2); assert.ok(duckAt(p, 7.05) > G && duckAt(p, 7.05) < 1);
  near(duckAt(p, 99), 1);
});

test('duck: close slots merge, far slots do not', () => {
  const m = duckPoints([[1, 2], [2.3, 3]]);
  near(duckAt(m, 2.15), G);
  const f = duckPoints([[1, 2], [5, 6]]);
  near(duckAt(f, 3.5), 1);
  assert.deepEqual(duckPoints([[5, 6], [1, 2]]), f);
});

test('duck: a slot at t = 0 starts ducked', () => {
  const p = duckPoints([[0, 1]]);
  near(duckAt(p, 0), G);
});

test('wavFloat32 writes a valid float WAV', () => {
  const L = new Float32Array([0, 0.5, -0.5]), R = new Float32Array([1, -1, 0.25]), buf = wavFloat32([L, R], 48000), v = new DataView(buf);
  const s = (o, n) => String.fromCharCode(...new Uint8Array(buf, o, n));
  assert.equal(s(0, 4), 'RIFF'); assert.equal(s(8, 4), 'WAVE'); assert.equal(s(12, 4), 'fmt '); assert.equal(s(36, 4), 'data');
  assert.equal(v.getUint16(20, true), 3); assert.equal(v.getUint16(22, true), 2); assert.equal(v.getUint32(24, true), 48000);
  assert.equal(v.getUint32(28, true), 48000 * 8); assert.equal(v.getUint16(32, true), 8); assert.equal(v.getUint16(34, true), 32);
  assert.equal(v.getUint32(40, true), 3 * 2 * 4); assert.equal(buf.byteLength, 44 + 24); assert.equal(v.getUint32(4, true), 36 + 24);
  assert.deepEqual([...new Float32Array(buf, 44)], [0, 1, 0.5, -1, -0.5, 0.25]);
});

test('clipKey is stable and sensitive to every input', () => {
  const k = clipKey('闻境白茶。', 'zm_yunjian', 1);
  assert.match(k, /^[0-9a-f]{16}$/);
  assert.equal(clipKey('闻境白茶。', 'zm_yunjian', 1), k);
  assert.notEqual(clipKey('闻境白茶！', 'zm_yunjian', 1), k);
  assert.notEqual(clipKey('闻境白茶。', 'zm_yunxi', 1), k);
  assert.notEqual(clipKey('闻境白茶。', 'zm_yunjian', 1.1), k);
});

test('offGrid finds times off the 1.5 s grid', () => {
  assert.deepEqual(offGrid([0, 1.5, 3, 4.5, 6, 12, 15]), []);
  assert.deepEqual(offGrid([3.1, 6, 2.25]), [3.1, 2.25]);
  assert.deepEqual(offGrid([0.75, 2.25], 0.75), []);
});
