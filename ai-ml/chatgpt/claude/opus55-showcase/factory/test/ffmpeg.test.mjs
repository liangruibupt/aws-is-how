import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import zlib from 'node:zlib';
import { encodeArgs, startEncode, probe, checkProbe, hasFfmpeg, X264, AAC } from '../lib/ffmpeg.mjs';

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

test('encodeArgs: PNG frames on stdin, the fixed x264 settings, mp4 container even for a .part name', () => {
  const a = encodeArgs({ fps: 30, out: 'x.mp4.part' });
  const s = a.join(' ');
  assert.match(s, /-f image2pipe -framerate 30 -c:v png -i - /);
  assert.ok(s.includes(X264.join(' ')));
  assert.ok(a.includes('-an'));
  assert.deepEqual(a.slice(-3), ['-f', 'mp4', 'x.mp4.part']);
  const b = encodeArgs({ fps: 60, out: 'y.mp4', audio: 'mix.wav', afilter: 'alimiter' }).join(' ');
  assert.match(b, /-i mix\.wav/);
  assert.match(b, /-map 1:a:0 -af alimiter/);
  assert.ok(b.includes(AAC.join(' ')));
  assert.ok(!b.includes('-an'));
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
