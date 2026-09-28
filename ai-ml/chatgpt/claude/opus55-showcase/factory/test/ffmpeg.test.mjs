import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import zlib from 'node:zlib';
import { encodeArgs, startEncode, probe, checkProbe, hasFfmpeg, X264, LOUD, measure, loudnessFilter, encodeAudio, checkLoudness } from '../lib/ffmpeg.mjs';
import { wavFloat32 } from '../engine/mix.js';

/** 最小的 RGB PNG 编码器：测试里造帧，不引入依赖 */
function png(w, h, rgb) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4), crc = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type), data]);
    len.writeUInt32BE(data.length); crc.writeUInt32BE(zlib.crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set(rgb, y * (w * 3 + 1) + 1 + x * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** 立体声 48 kHz 的 WAV：fn(t) 给出这一刻的采样 */
function wav(file, seconds, fn) {
  const n = Math.round(seconds * 48000), x = Float32Array.from({ length: n }, (_, i) => fn(i / 48000));
  fs.writeFileSync(file, Buffer.from(wavFloat32([x, x], 48000)));
}

test('encodeArgs: PNG frames on stdin, the fixed x264 settings, mp4 container even for a .part name', () => {
  const a = encodeArgs({ fps: 30, out: 'x.mp4.part' });
  const s = a.join(' ');
  assert.match(s, /-f image2pipe -framerate 30 -c:v png -i - /);
  assert.ok(s.includes(X264.join(' ')));
  assert.ok(a.includes('-an'));
  assert.deepEqual(a.slice(-3), ['-f', 'mp4', 'x.mp4.part']);
  const b = encodeArgs({ fps: 60, out: 'y.mp4', audio: 'mix.m4a' }).join(' ');
  assert.match(b, /-i mix\.m4a/);
  assert.match(b, /-map 1:a:0 -c:a copy -f mp4 y\.mp4$/);                    // encodeAudio 编好、量过的音轨原样拷进去
  assert.ok(!b.includes('-an') && !b.includes('-af'));
});

test('checkProbe: passes a matching file, names every mismatch', () => {
  const want = { duration: 15, width: 1080, height: 1920, fps: 30, audio: true };
  assert.deepEqual(checkProbe({ duration: 15.02, width: 1080, height: 1920, fps: 30, frames: 450, audio: true }, want), []);
  const bad = checkProbe({ duration: 14.5, width: 1920, height: 1080, fps: 25, frames: 449, audio: false }, want);
  assert.equal(bad.length, 5);
  assert.match(bad.join('|'), /size.*frames.*duration.*no audio/s);
});

test('startEncode + probe: 15 piped frames become a 0.5 s mp4 that passes checkProbe', { skip: !hasFfmpeg() && 'ffmpeg not found' }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-')), out = path.join(dir, 'a.mp4.part');
  const enc = startEncode(encodeArgs({ fps: 30, out }));
  for (let i = 0; i < 15; i++) await enc.write(png(64, 32, [i * 16, 80, 200]));
  const { code, stderr } = await enc.end();
  assert.equal(code, 0, stderr);
  const p = probe(out);
  assert.deepEqual(checkProbe(p, { duration: 0.5, width: 64, height: 32, fps: 30, audio: false }), []);
  assert.ok(p.bytes > 0);
  fs.rmSync(dir, { recursive: true });
});

test('startEncode: a broken frame fails with ffmpeg\'s message, not a hang', { skip: !hasFfmpeg() && 'ffmpeg not found' }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-'));
  const enc = startEncode(encodeArgs({ fps: 30, out: path.join(dir, 'b.mp4') }));
  await enc.write(Buffer.from('not a png at all'));
  const { code, stderr } = await enc.end();
  assert.notEqual(code, 0);
  assert.ok(stderr.length > 0);
  fs.rmSync(dir, { recursive: true });
});

test('checkLoudness: −14 LUFS ± 1 LU and a true peak at most −1 dBTP', () => {
  assert.deepEqual(LOUD, { I: -14, TP: -1.5, LRA: 20 });
  assert.deepEqual(checkLoudness({ I: -14.4, TP: -1.6 }), []);
  assert.deepEqual(checkLoudness({ I: -13, TP: -1 }), []);
  const bad = checkLoudness({ I: -12.8, TP: -0.5 });
  assert.equal(bad.length, 2);
  assert.match(bad.join('|'), /loudness -12\.8 LUFS.*true peak -0\.5/);
  assert.equal(checkLoudness({ I: NaN, TP: NaN }).length, 2, 'a failed measurement never passes');
});

test('encodeAudio + mux: a quiet mix with full-scale transients comes out at −14 LUFS, true peak ≤ LOUD.TP, unchanged in the MP4', { skip: !hasFfmpeg() && 'ffmpeg not found' }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-')), src = path.join(dir, 'mix.wav'), aac = path.join(dir, 'mix.m4a'), out = path.join(dir, 'c.mp4');
  // −26 dBFS 的 440 Hz，每 0.5 秒一下满幅的 2 kHz 敲击（10 ms 衰减完）：响度低、峰值高，和配乐一样要先增益再限幅
  wav(src, 3, t => 0.05 * Math.sin(2 * Math.PI * 440 * t) + Math.exp(-(t % 0.5) / 0.002) * Math.sin(2 * Math.PI * 2000 * t));
  const raw = measure(src);
  assert.ok(raw.I < -20 && raw.TP > -1, `the source is quiet and peaky: ${raw.I} LUFS, ${raw.TP} dBTP`);
  const af = loudnessFilter(src);
  assert.match(af, /^volume=[\d.]+dB,alimiter=limit=0\.708:level=false:latency=true,volume=-?[\d.]+dB$/);
  assert.match(loudnessFilter(src, -6), /alimiter=limit=0\.501:/);
  const a = encodeAudio(src, aac);
  assert.ok(a.TP <= LOUD.TP && Math.abs(a.I - LOUD.I) <= 0.3, JSON.stringify(a));
  const enc = startEncode(encodeArgs({ fps: 30, out, audio: aac }));
  for (let i = 0; i < 90; i++) await enc.write(png(16, 16, [i * 2, 60, 90]));
  const { code, stderr } = await enc.end();
  assert.equal(code, 0, stderr);
  assert.deepEqual(checkProbe(probe(out), { duration: 3, width: 16, height: 16, fps: 30, audio: true }), []);
  const m = measure(out);
  assert.deepEqual(checkLoudness(m), [], JSON.stringify(m));
  assert.ok(Math.abs(m.I - a.I) < 0.05 && Math.abs(m.TP - a.TP) < 0.05, `the MP4 carries the measured track: ${JSON.stringify({ a, m })}`);
  fs.rmSync(dir, { recursive: true });
});

test('encodeAudio: a true peak over the target is re-encoded with a lower limit until it fits', { skip: !hasFfmpeg() && 'ffmpeg not found' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-')), src = path.join(dir, 'mix.wav'), aac = path.join(dir, 'mix.m4a');
  wav(src, 3, t => 0.05 * Math.sin(2 * Math.PI * 440 * t) + Math.exp(-(t % 0.5) / 0.002) * Math.sin(2 * Math.PI * 2000 * t));
  const first = encodeAudio(src, aac, 3), strict = encodeAudio(src, aac, -4);     // 目标 +3 dBTP 一遍就过；−4 dBTP 要压低限幅重编
  assert.equal(first.limit, -3);
  assert.ok(strict.TP <= -4 && strict.limit < -3, JSON.stringify(strict));
  assert.ok(Math.abs(strict.I - LOUD.I) <= 0.3, `the loudness stays on target: ${strict.I}`);
  fs.rmSync(dir, { recursive: true });
});

test('loudnessFilter: silence is an error, not a filter with an infinite gain', { skip: !hasFfmpeg() && 'ffmpeg not found' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-')), src = path.join(dir, 'quiet.wav');
  wav(src, 1, () => 0);
  assert.throws(() => loudnessFilter(src), /silent/);
  assert.throws(() => measure(path.join(dir, 'missing.wav')), /loudnorm/);
  fs.rmSync(dir, { recursive: true });
});
