// framing.js — 镜头意图 → 相机位姿。镜头只说"拍谁、从哪个方向、占画面多高、放在哪"，
// 这里按比例反解相机距离，再用 setViewOffset 平移画面（不转相机），所以三种比例的透视完全一致
import * as THREE from 'three';
import { lerp } from './ease.js';

const _v = new THREE.Vector3();

export function project(camera, box) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < 8; i++) {
    _v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
    const x = (_v.x + 1) / 2, y = (1 - _v.y) / 2;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return { minX, maxX, minY, maxY };
}

export function projectPoint(camera, p) {
  _v.fromArray(p).project(camera);
  return [(_v.x + 1) / 2, (1 - _v.y) / 2];
}

export function fitPose({ box, dir, up = [0, 1, 0], fov, aspect, anchor, size, maxW = 0.9 }) {
  const c = box.getCenter(new THREE.Vector3()), r = box.getBoundingSphere(new THREE.Sphere()).radius;
  const d0 = new THREE.Vector3(...dir).normalize(), cam = new THREE.PerspectiveCamera(fov, aspect, 0.001, 1e4);
  const at = d => {
    cam.position.copy(c).addScaledVector(d0, d); cam.up.fromArray(up); cam.lookAt(c);
    cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    return project(cam, box);
  };
  let lo = r * 1.001, hi = r * 400;
  for (let i = 0; i < 60; i++) {                                   // 几何二分：投影尺寸随距离单调变小
    const mid = Math.sqrt(lo * hi), p = at(mid);
    if (p.maxY - p.minY <= size && p.maxX - p.minX <= maxW) hi = mid; else lo = mid;
  }
  const p = at(hi);
  return { position: cam.position.toArray(), target: c.toArray(), up, fov, offset: [(p.minX + p.maxX) / 2 - anchor[0], (p.minY + p.maxY) / 2 - anchor[1]] };
}

export function freePose({ position, target, fov, up = [0, 1, 0], fovAxis = 'v', offset = [0, 0] }, aspect) {
  const v = fovAxis === 'short' && aspect < 1 ? 2 * Math.atan(Math.tan(fov * Math.PI / 360) / aspect) * 180 / Math.PI : fov;
  return { position: [...position], target: [...target], up, fov: v, offset: [...offset] };
}

export function blendPose(a, b, k) {
  const L = (x, y) => x.map((v, i) => lerp(v, y[i], k));
  return { position: L(a.position, b.position), target: L(a.target, b.target), up: a.up, fov: lerp(a.fov, b.fov, k), offset: L(a.offset, b.offset) };
}

export function solvePose(intent, row, aspect) {
  if (intent.type === 'blend') return blendPose(solvePose(intent.a, row, aspect), solvePose(intent.b, row, aspect), intent.k);
  if (intent.type === 'free') return freePose(intent, aspect);
  return fitPose({ ...intent, aspect, anchor: intent.anchor ?? row.anchor, size: (intent.size ?? row.size) * (intent.scale ?? 1), maxW: intent.maxW ?? row.maxW ?? 0.9 });
}

export function applyPose(camera, pose, W, H) {
  camera.fov = pose.fov; camera.aspect = W / H;
  camera.position.fromArray(pose.position); camera.up.fromArray(pose.up ?? [0, 1, 0]); camera.lookAt(...pose.target);
  const [ox, oy] = pose.offset ?? [0, 0];
  if (ox || oy) camera.setViewOffset(W, H, ox * W, oy * H, W, H); else camera.clearViewOffset();
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
}
