import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { fitPose, freePose, blendPose, solvePose, applyPose, project, projectPoint } from '../engine/framing.js';
import { ASPECTS } from '../engine/variant.js';

const bottle = new THREE.Box3(new THREE.Vector3(-0.36, 0, -0.23), new THREE.Vector3(0.36, 1.34, 0.23));
const cam = () => new THREE.PerspectiveCamera(30, 1, 0.01, 200);
const fitIn = (ar, row, dir = [0.35, 0.15, 1]) => {
  const [W, H] = ASPECTS[ar], c = cam();
  applyPose(c, solvePose({ type: 'fit', box: bottle, dir, fov: 28 }, row, W / H), W, H);
  return project(c, bottle);
};

test('fit: box height = size and centre = anchor (±1% of frame) in every ratio', () => {
  for (const ar of Object.keys(ASPECTS)) {
    const row = { anchor: [0.46, 0.4], size: 0.46, maxW: 0.9 }, p = fitIn(ar, row);
    assert.ok(Math.abs(p.maxY - p.minY - 0.46) < 0.01, `${ar} height ${p.maxY - p.minY}`);
    assert.ok(Math.abs((p.minX + p.maxX) / 2 - 0.46) < 0.01, `${ar} cx`);
    assert.ok(Math.abs((p.minY + p.maxY) / 2 - 0.4) < 0.01, `${ar} cy`);
  }
});

test('fit: width limit binds on narrow frames', () => {
  const p = fitIn('9x16', { anchor: [0.5, 0.5], size: 0.8, maxW: 0.3 });
  assert.ok(p.maxX - p.minX <= 0.3 + 0.01);
  assert.ok(p.maxY - p.minY < 0.8);
});

test('fit: perspective is identical across ratios when height binds', () => {
  const row = { anchor: [0.5, 0.45], size: 0.5, maxW: 0.9 };
  const a = fitPose({ box: bottle, dir: [0.35, 0.15, 1], fov: 28, aspect: 1, ...row });
  const b = fitPose({ box: bottle, dir: [0.35, 0.15, 1], fov: 28, aspect: 16 / 9, ...row });
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(a.position[i] - b.position[i]) < 1e-6);
});

test('fit: scale and anchor override the layout row', () => {
  const row = { anchor: [0.5, 0.5], size: 0.4, maxW: 0.9 }, [W, H] = ASPECTS['1x1'], c = cam();
  applyPose(c, solvePose({ type: 'fit', box: bottle, dir: [0, 0, 1], fov: 28, scale: 1.5, anchor: [0.3, 0.6] }, row, W / H), W, H);
  const p = project(c, bottle);
  assert.ok(Math.abs(p.maxY - p.minY - 0.6) < 0.01);
  assert.ok(Math.abs((p.minX + p.maxX) / 2 - 0.3) < 0.01 && Math.abs((p.minY + p.maxY) / 2 - 0.6) < 0.01);
});

test('free: short-axis fov widens the vertical fov on portrait frames only', () => {
  const i = { type: 'free', position: [0, 0, 3], target: [0, 0, 0], fov: 30, fovAxis: 'short' };
  assert.ok(freePose(i, 9 / 16).fov > 30);
  assert.equal(freePose(i, 16 / 9).fov, 30);
  assert.equal(freePose({ ...i, fovAxis: 'v' }, 9 / 16).fov, 30);
  const [W, H] = ASPECTS['9x16'], c = cam(); applyPose(c, freePose(i, W / H), W, H);
  const [fx, fy] = projectPoint(c, [0, 0, 0]);
  assert.ok(Math.abs(fx - 0.5) < 1e-6 && Math.abs(fy - 0.5) < 1e-6);
});

test('blend interpolates poses', () => {
  const a = freePose({ position: [0, 0, 2], target: [0, 0, 0], fov: 20 }, 1);
  const b = freePose({ position: [2, 0, 2], target: [0, 1, 0], fov: 40, offset: [0.1, 0] }, 1);
  const m = blendPose(a, b, 0.5);
  assert.deepEqual(m.position, [1, 0, 2]); assert.deepEqual(m.target, [0, 0.5, 0]);
  assert.equal(m.fov, 30); assert.deepEqual(m.offset, [0.05, 0]);
  assert.deepEqual(solvePose({ type: 'blend', a: { type: 'free', ...a }, b: { type: 'free', ...b }, k: 0 }, {}, 1).position, a.position);
});
