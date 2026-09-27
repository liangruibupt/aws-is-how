// 搅拌机 Mixmaster —— 混凝土搅拌车 → 左腿（车顶朝前立起，驾驶室前移后翻成脚，搅拌筒成小腿，水箱板翻下成护膝）
import * as THREE from 'three';
import { Rig, emblemBadge, basis, smooth, lerp } from '../kit.js';

export function buildMixmaster(M) {
  const R = new Rig('mixmaster', M);
  const S = [-1, 1];

  // ── 底盘（根）：大梁、后桥双轴、油箱、托架、料斗 ──
  const C = R.part('chassis', null, [0, 0, 0]);
  for (const s of S) R.box(C, [0.18, 0.3, 4.4], [s * 0.46, 0.68, -0.6], 'dark', { r: 0.02 });
  R.box(C, [1.5, 0.1, 3.6], [0, 0.88, -1.0], 'steel', { r: 0.02 });
  for (const z of [-1.35, -2.3]) {
    R.cyl(C, 0.1, 1.7, [0, 0.56, z], 'dark', { axis: 'x' });
    R.box(C, [0.5, 0.22, 0.34], [0, 0.56, z], 'dark', { r: 0.04 });
  }
  for (const s of S) {
    R.box(C, [0.5, 0.06, 2.1], [s * 1.0, 1.2, -1.82], 'paintDark', { r: 0.02 });
    R.box(C, [0.06, 0.18, 2.1], [s * 1.23, 1.12, -1.82], 'paintDark', { r: 0.01 });
    R.box(C, [0.46, 0.5, 0.03], [s * 1.0, 0.72, -2.92], 'black', { r: 0 });
    R.lamp(C, [s * 0.72, 0.62, -3.05], { r: 0.07, lens: 'lensR', rot: [0, 180, 0] });
    R.cyl(C, 0.22, 1.2, [s * 0.86, 0.66, -0.1], 'purple', { axis: 'z', seg: 20 });   // 油箱（腿态成踝饰）
    for (const z of [-0.5, 0.3]) R.box(C, [0.48, 0.05, 0.06], [s * 0.86, 0.9, z], 'steel', { r: 0.01 });
    for (const z of [-1.35, -2.3]) R.wheel(C, [s * 1.0, 0.56, z], 0.56, 0.4);
  }
  R.box(C, [1.9, 0.2, 0.16], [0, 0.62, -2.96], 'hazard', { r: 0.02 });
  // 前托架 + 驱动箱
  R.box(C, [1.2, 0.9, 0.2], [0, 1.3, 0.92], 'dark', { r: 0.04 });
  R.cyl(C, 0.26, 0.3, [0, 1.6, 0.98], 'dark', { axis: 'z' });
  // 后托架、料斗、出料槽、爬梯
  for (const s of S) R.beam(C, [s * 0.62, 0.92, -2.3], [s * 0.38, 2.05, -2.2], [0.1, 0.12], 'steel');
  R.beam(C, [-0.5, 1.55, -2.26], [0.5, 1.55, -2.26], [0.08, 0.08], 'steel');
  R.mesh(C, new THREE.CylinderGeometry(0.52, 0.2, 0.5, 4, 1, true).rotateY(Math.PI / 4), 'steel', [0, 2.45, -2.4]);
  R.beam(C, [0, 2.0, -2.55], [0, 1.38, -3.28], [0.4, 0.06], 'dark');
  for (const x of [0.62, 0.86]) R.beam(C, [x, 0.95, -2.8], [x, 2.5, -2.62], [0.04, 0.04], 'steel');
  for (let i = 0; i < 6; i++) R.box(C, [0.26, 0.03, 0.03], [0.74, 1.1 + i * 0.24, -2.78 + i * 0.03], 'steel', { r: 0 });

  // ── 搅拌筒：车辆行驶时自转，螺旋紫纹便于看清转动 ──
  const D = R.part('drum', C, [0, 1.78, -0.62], [], { rot0: [7, 0, 0], frame: true });
  const spin = new THREE.Group(); D.g.add(spin);
  const SP = { g: spin, local: true };
  const prof = [[0.3, -1.52], [0.34, -1.5], [0.52, -1.28], [0.78, -0.7], [0.86, -0.15], [0.84, 0.2], [0.62, 0.9], [0.4, 1.32], [0.22, 1.45], [0.02, 1.47]];
  R.mesh(SP, new THREE.LatheGeometry(prof.map(([r, h]) => new THREE.Vector2(r, h)), 44).rotateX(Math.PI / 2), 'steel');
  R.cyl(SP, 0.3, 0.02, [0, 0, -1.52], 'black', { axis: 'z' });
  const rAt = h => { for (let i = 1; i < prof.length; i++) if (h <= prof[i][1]) { const [r0, h0] = prof[i - 1], [r1, h1] = prof[i]; return lerp(r0, r1, (h - h0) / (h1 - h0)); } return 0; };
  for (const off of [0, Math.PI]) {
    const pts = [];
    for (let k = 0; k <= 90; k++) { const h = lerp(-1.3, 1.25, k / 90), a = off + k / 90 * Math.PI * 4.4, r = rAt(h) + 0.01; pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, h)); }
    R.mesh(SP, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 180, 0.045, 6, false), 'purple');
  }
  for (const h of [-0.95, 0.55]) R.mesh(SP, new THREE.TorusGeometry(rAt(h) + 0.01, 0.035, 8, 44), 'dark', [0, 0, h]);
  R.after.push(dt => { spin.rotation.z += dt * 2.4 * (1 - smooth(0, 0.12, R.u)); });

  // ── 水箱板（紫）→ 护膝：先翻平，再上移贴到搅拌筒前 ──
  const K = R.part('knee', C, [0, 2.62, 1.22], [{ t: [0.46, 0.66], r: [90, 0, 0] }, { t: [0.6, 0.8], p: [0, 0.1, -0.7], e: 'back' }]);
  R.box(K, [1.36, 1.3, 0.16], [0, 1.96, 1.22], 'purple', { r: 0.06 });
  for (const z of [1.12, 1.32]) R.box(K, [1.0, 0.86, 0.06], [0, 1.9, z], 'purple', { r: 0.03 });
  R.box(K, [0.16, 1.1, 0.08], [0, 1.9, 1.07], 'dark', { r: 0.02 });
  for (const s of S) R.cyl(K, 0.07, 0.26, [s * 0.52, 2.62, 1.22], 'chrome', { axis: 'x' });

  // ── 髋关节 ──
  const hip = R.part('hip', C, [0, 1.1, -2.45], [{ t: [0.6, 0.78], p: [0, 0, -0.55] }]);
  R.box(hip, [0.9, 0.6, 0.6], [0, 1.1, -2.45], 'steel', { r: 0.08 });
  R.cyl(hip, 0.32, 1.26, [0, 1.1, -2.8], 'chrome', { axis: 'x' });

  // ── 前桥：腿态退到脚跟 ──
  const ax = R.part('axle', C, [0, 0.56, 2.05], [{ t: [0.26, 0.5], p: [0, -0.3, -0.6] }]);
  R.cyl(ax, 0.1, 1.7, [0, 0.56, 2.05], 'dark', { axis: 'x' });
  for (const s of S) R.wheel(ax, [s * 1.0, 0.56, 2.05], 0.56, 0.4);

  // ── 平头驾驶室 → 脚：前移让开，再绕后下沿翻转 90° ──
  const cab = R.part('cab', C, [0, 0.75, 1.4], [{ t: [0.14, 0.36], p: [0, 0.15, 1.6] }, { t: [0.32, 0.6], r: [-90, 0, 0], e: 'back' }]);
  R.box(cab, [1.62, 0.52, 1.5], [0, 1.01, 2.15], 'paintDark', { r: 0.05 });
  R.box(cab, [1.96, 1.22, 1.5], [0, 1.86, 2.15], 'paint', { r: 0.1 });
  R.box(cab, [1.7, 0.62, 0.04], [0, 2.04, 2.91], 'glass', { r: 0 });
  R.box(cab, [1.3, 0.34, 0.04], [0, 1.3, 2.91], 'black', { r: 0 });
  for (let i = 0; i < 4; i++) R.box(cab, [1.26, 0.03, 0.03], [0, 1.18 + i * 0.08, 2.93], 'chrome', { r: 0 });
  R.box(cab, [2.0, 0.24, 0.28], [0, 0.86, 2.98], 'steel', { r: 0.04 });
  R.box(cab, [1.84, 0.1, 0.34], [0, 2.52, 2.7], 'dark', { r: 0.03 });
  for (const x of [-0.5, 0, 0.5]) R.cyl(cab, 0.06, 0.08, [x, 2.61, 2.78], 'lensA');
  for (const s of S) {
    R.box(cab, [0.04, 0.5, 0.72], [s * 0.99, 2.08, 2.42], 'glass', { r: 0 });
    R.lamp(cab, [s * 0.72, 0.9, 3.12], { r: 0.1, cone: true, len: 8 });
    R.box(cab, [0.46, 0.06, 1.16], [s * 1.0, 1.2, 2.05], 'paintDark', { r: 0.02 });
    R.beam(cab, [s * 0.98, 2.2, 2.75], [s * 1.2, 2.1, 2.9], [0.04, 0.04], 'dark');
    R.box(cab, [0.05, 0.36, 0.2], [s * 1.22, 1.92, 2.9], 'black', { r: 0.02 });
    R.extrude(cab, emblemBadge(0.4), 0.02, 'x', [s * 0.99, 1.6, 2.0], 'purple', { bevel: 0.002 });
    R.box(cab, [0.2, 0.04, 0.3], [s * 0.86, 0.82, 1.7], 'steel', { r: 0.01 });
  }

  R.bake();
  return {
    rig: R,
    // 车顶朝前、车头朝下：车辆 X→X，Y→Z，Z→-Y
    dock: { p: [1.65, 3.03, -1.3], q: basis([1, 0, 0], [0, 0, 1], [0, -1, 0]) },
    pre: [3.2, 6.6, 3.0],
  };
}
