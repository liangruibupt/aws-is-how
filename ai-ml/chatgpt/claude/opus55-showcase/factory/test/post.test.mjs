import test from 'node:test';
import assert from 'node:assert/strict';
import { POST_DEFAULTS, mergePost, focusOn } from '../engine/post.js';

test('mergePost layers defaults → world → shot, merging bloom field by field', () => {
  const world = { exposure: 1.1, aperture: 0.25, bloom: { strength: 0.3 } }, shot = { aperture: 0.6, bloom: { threshold: 0.9 } };
  const P = mergePost(world, undefined, shot);
  assert.equal(P.exposure, 1.1); assert.equal(P.aperture, 0.6); assert.equal(P.vignette, POST_DEFAULTS.vignette);
  assert.deepEqual(P.bloom, { ...POST_DEFAULTS.bloom, strength: 0.3, threshold: 0.9 });
  assert.equal(POST_DEFAULTS.bloom.strength, 0.22);                    // 默认值没被改写
  assert.equal(mergePost().focus, 'target');
});

test("focus 'target' becomes the camera-to-target distance of the solved pose; a number stays", () => {
  const pose = { position: [0.3, 0.2, 0.9], target: [0, 0.08, 0.1] };
  assert.equal(focusOn(mergePost(), pose).focus, Math.hypot(0.3, 0.12, 0.8));
  assert.equal(focusOn(mergePost({ focus: 0.5 }), pose).focus, 0.5);
  const P = mergePost(); focusOn(P, pose);
  assert.equal(P.focus, 'target');                                      // 返回新对象，不改输入
});
