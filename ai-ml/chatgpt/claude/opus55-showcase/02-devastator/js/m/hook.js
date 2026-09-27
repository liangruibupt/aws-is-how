// 吊钩 Hook —— 汽车起重机 → 胸部与头部（转台旋转 90°：紫色配重成胸甲，桁架吊臂转到身后仰起；车轮收起，机舱顶盖分开，头部升起）
import * as THREE from 'three';
import { Rig, emblemShape, emblemBadge, basis, boxGeo, smooth, lerp } from '../kit.js';

export function buildHook(M) {
  M.eye = new THREE.MeshStandardMaterial({ color: '#ff3a2a', emissive: '#ff1e0e', emissiveIntensity: 0.15, roughness: 0.3, metalness: 0.2 });
  const R = new Rig('hook', M);
  const S = [-1, 1];

  // ── 底盘（根）：车台、支腿箱、尾部 ──
  const C = R.part('chassis', null, [0, 0, 0]);
  R.box(C, [1.5, 0.75, 5.9], [0, 0.925, -0.55], 'paintDark', { r: 0.06 });
  R.box(C, [1.42, 0.04, 5.8], [0, 1.31, -0.55], 'steel', { r: 0.01 });
  for (const s of S) {
    R.box(C, [0.45, 0.6, 2.2], [s * 0.975, 0.95, 0.15], 'paint', { r: 0.06 });
    for (const z of [-0.8, 1.1]) {
      R.box(C, [0.12, 0.3, 0.3], [s * 1.24, 0.9, z], 'steel', { r: 0.03 });
      R.cyl(C, 0.07, 0.26, [s * 1.3, 0.74, z], 'chrome');
      R.cyl(C, 0.14, 0.05, [s * 1.3, 0.6, z], 'dark');
    }
    for (let i = 0; i < 3; i++) R.box(C, [0.04, 0.05, 1.6], [s * 1.205, 0.78 + i * 0.16, 0.15], 'paintDark', { r: 0.01 });
    R.lamp(C, [s * 0.55, 0.9, -3.53], { r: 0.07, lens: 'lensR', rot: [0, 180, 0] });
  }
  R.box(C, [1.9, 0.2, 0.14], [0, 0.62, -3.55], 'hazard', { r: 0.02 });

  // ── 车轮：前一后二，合体时收进车台 ──
  const axle = (name, zs, zc, len) => {
    const A = R.part(name, C, [0, 0.5, zc], [{ t: [0.44, 0.6], p: [0, 0.56, 0] }]);
    for (const z of zs) {
      R.cyl(A, 0.09, 1.5, [0, 0.5, z], 'dark', { axis: 'x' });
      for (const s of S) R.wheel(A, [s * 0.9, 0.5, z], 0.5, 0.36);
    }
    for (const s of S) R.box(A, [0.44, 0.06, len], [s * 0.9, 1.06, zc], 'paintDark', { r: 0.02 });
  };
  axle('axF', [1.9], 1.9, 1.1);
  axle('axR', [-1.6, -2.7], -2.15, 2.3);

  // ── 驾驶室 ──
  R.box(C, [1.4, 0.55, 1.05], [0, 0.98, 2.98], 'paintDark', { r: 0.05 });
  R.box(C, [1.9, 1.15, 1.05], [0, 1.82, 2.98], 'paint', { r: 0.1 });
  R.box(C, [1.66, 0.55, 0.04], [0, 1.98, 3.51], 'glass', { r: 0 });
  R.box(C, [1.0, 0.3, 0.04], [0, 1.02, 3.51], 'black', { r: 0 });
  for (const y of [0.94, 1.02, 1.1]) R.box(C, [0.96, 0.03, 0.03], [0, y, 3.53], 'chrome', { r: 0 });
  R.box(C, [1.96, 0.24, 0.3], [0, 0.72, 3.6], 'steel', { r: 0.04 });
  R.box(C, [0.6, 0.08, 0.2], [0, 2.44, 3.1], 'dark', { r: 0.02 });                   // 吊臂托架
  for (const s of S) {
    R.lamp(C, [s * 0.72, 0.75, 3.76], { r: 0.09, cone: true, len: 8 });
    R.box(C, [0.04, 0.45, 0.6], [s * 0.955, 2.0, 3.05], 'glass', { r: 0 });
    R.extrude(C, emblemBadge(0.34), 0.02, 'x', [s * 0.955, 1.56, 2.9], 'purple', { bevel: 0.002 });
    R.beam(C, [s * 0.95, 2.1, 3.35], [s * 1.18, 2.0, 3.45], [0.04, 0.04], 'dark');
    R.box(C, [0.05, 0.32, 0.18], [s * 1.2, 1.86, 3.45], 'black', { r: 0.02 });
    R.cyl(C, 0.07, 0.1, [s * 0.75, 2.45, 3.35], 'lensA');
  }

  // ── 转台：+90° 后配重朝前成胸甲 ──
  const T = R.part('turret', C, [0, 1.3, 0], [{ t: [0.12, 0.42], r: [0, 90, 0] }]);
  R.cyl(T, 0.9, 0.16, [0, 1.38, 0], 'dark', { seg: 32 });
  R.box(T, [2.0, 0.14, 2.8], [0, 1.53, -0.15], 'paint', { r: 0.03 });
  for (const s of S) {
    R.box(T, [0.08, 1.02, 1.6], [s * 0.96, 2.11, -0.55], 'paint', { r: 0.02 });
    for (let i = 0; i < 4; i++) R.box(T, [0.03, 0.05, 0.9], [s * 1.0, 1.9 + i * 0.12, -0.75], 'black', { r: 0 });
  }
  R.box(T, [1.84, 1.02, 0.08], [0, 2.11, 0.21], 'paintDark', { r: 0.02 });
  R.box(T, [3.0, 1.3, 0.5], [0, 2.05, -1.55], 'purple', { r: 0.1 });
  R.box(T, [2.6, 0.12, 0.08], [0, 2.52, -1.83], 'dark', { r: 0.02 });
  R.box(T, [2.6, 0.12, 0.08], [0, 1.58, -1.83], 'dark', { r: 0.02 });
  R.extrude(T, emblemShape(0.76), 0.04, 'z', [0, 2.05, -1.83], 'paint', { bevel: 0.005 });     // 紫色胸甲上的石灰绿线稿徽记
  // 操作室
  R.box(T, [0.55, 0.8, 0.85], [-0.72, 2.0, 0.78], 'paint', { r: 0.06 });
  R.box(T, [0.47, 0.5, 0.04], [-0.72, 2.08, 1.21], 'glass', { r: 0 });
  R.box(T, [0.04, 0.45, 0.6], [-1.0, 2.08, 0.8], 'glass', { r: 0 });
  R.lamp(T, [-0.72, 2.34, 1.24], { r: 0.06, cone: true, len: 6 });
  // 吊臂根部支架
  for (const s of S) R.box(T, [0.1, 1.2, 0.5], [s * 0.32, 2.2, 1.0], 'dark', { r: 0.02 });

  // 机舱顶盖：左右分开
  for (const s of S) {
    const H = R.part(s < 0 ? 'hatchL' : 'hatchR', T, [s * 0.46, 2.66, -0.55], [{ t: [0.66, 0.78], p: [s * 0.8, 0, 0] }]);
    R.box(H, [0.92, 0.08, 1.64], [s * 0.46, 2.66, -0.55], 'paint', { r: 0.02 });
    R.box(H, [0.06, 0.12, 1.64], [s * 0.9, 2.62, -0.55], 'paintDark', { r: 0.01 });
  }

  // ── 头部：藏在机舱里，伸缩颈升起 ──
  const N = R.part('neck', T, [0, 1.6, -0.7], [{ t: [0.76, 0.9], p: [0, 0.9, 0] }]);
  R.cyl(N, 0.24, 1.1, [0, 1.9, -0.7], 'dark');
  for (const y of [1.7, 2.05, 2.36]) R.cyl(N, 0.27, 0.06, [0, y, -0.7], 'steel');
  const Hd = R.part('head', N, [0, 1.8, -0.7], [{ t: [0.84, 0.96], p: [0, 0.5, 0], e: 'back' }]);
  R.box(Hd, [1.1, 0.8, 0.9], [0, 2.1, -0.62], 'dark', { r: 0.1 });
  R.box(Hd, [0.9, 0.14, 0.8], [0, 2.52, -0.62], 'dark', { r: 0.05 });
  R.box(Hd, [0.12, 0.24, 0.76], [0, 2.49, -0.64], 'purple', { r: 0.03 });
  for (const s of S) {
    R.box(Hd, [0.12, 0.44, 0.44], [s * 0.58, 2.1, -0.62], 'purple', { r: 0.04 });
    R.box(Hd, [0.12, 0.46, 0.3], [s * 0.45, 1.93, -0.98], 'dark', { r: 0.03 });
    R.box(Hd, [0.2, 0.07, 0.04], [s * 0.15, 2.17, -1.17], 'eye', { r: 0.01 });
  }
  R.box(Hd, [0.62, 0.52, 0.1], [0, 1.96, -1.08], 'steel', { r: 0.04 });
  R.box(Hd, [0.5, 0.1, 0.3], [0, 1.66, -0.95], 'dark', { r: 0.02 });
  R.box(Hd, [0.8, 0.14, 0.12], [0, 2.17, -1.1], 'black', { r: 0.02 });
  R.box(Hd, [1.0, 0.12, 0.22], [0, 2.3, -1.02], 'dark', { r: 0.03 });
  for (const y of [1.8, 1.86, 1.92]) R.box(Hd, [0.3, 0.025, 0.025], [0, y, -1.14], 'dark', { r: 0 });

  // ── 桁架吊臂：先离托架，转台转过后仰起 72° 立在身后 ──
  const B = R.part('boom', T, [0, 2.7, 1.0], [{ t: [0.04, 0.14], r: [-12, 0, 0] }, { t: [0.5, 0.76], r: [-72, 0, 0] }]);
  const z0 = 1.2, z1 = 4.4, bw = 0.22, bh = 0.2, by = 2.7, n = 7, st = (z1 - z0) / n;
  for (const sx of S) for (const sy of S) R.beam(B, [sx * bw, by + sy * bh, z0], [sx * bw, by + sy * bh, z1], [0.07, 0.07], 'paint');
  for (let i = 0; i < n; i++) {
    const a = z0 + i * st, b = a + st, k = i % 2 ? 1 : -1;
    for (const sx of S) R.beam(B, [sx * bw, by - k * bh, a], [sx * bw, by + k * bh, b], [0.035, 0.035], 'dark');
    for (const sy of S) R.beam(B, [-k * bw, by + sy * bh, a], [k * bw, by + sy * bh, b], [0.035, 0.035], 'dark', { up: new THREE.Vector3(0, 0, 1) });
  }
  R.box(B, [0.56, 0.5, 0.3], [0, 2.7, 1.12], 'paint', { r: 0.04 });
  R.cyl(B, 0.1, 0.76, [0, 2.7, 1.0], 'chrome', { axis: 'x' });
  R.box(B, [0.4, 0.46, 0.34], [0, 2.7, 4.55], 'purple', { r: 0.04 });
  R.cyl(B, 0.16, 0.12, [0, 2.62, 4.72], 'steel', { axis: 'x' });
  for (const s of S) R.piston(T, [s * 0.18, 1.72, 1.2], B, [s * 0.18, 2.47, 2.3], { r: 0.075, k: 0.84 });

  // 吊钩：始终竖直下垂，合体时收短钢索
  const hg = new THREE.Group(), blk = new THREE.Group();
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 6).translate(0, -0.5, 0), M.dark);
  cable.userData.dyn = true; hg.add(cable, blk);
  const blockM = new THREE.Mesh(boxGeo(0.3, 0.36, 0.22, 0.04), M.hazard); blockM.position.y = -0.18;
  const hookM = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.035, 8, 20, Math.PI * 1.5).rotateZ(Math.PI * 0.75), M.chrome); hookM.position.y = -0.5;
  const shank = new THREE.Mesh(boxGeo(0.06, 0.12, 0.06, 0.01), M.chrome); shank.position.y = -0.39;
  blk.add(blockM, hookM, shank);
  R.put(B, hg, [0, 2.55, 4.72]);
  const _q = new THREE.Quaternion();
  R.after.push(() => {
    hg.parent.getWorldQuaternion(_q); hg.quaternion.copy(_q).invert();
    const L = lerp(1.25, 0.35, smooth(0.5, 0.8, R.u));
    cable.scale.y = L; blk.position.y = -L;
  });

  R.bake();
  return {
    rig: R,
    // 车头朝大力神左侧（世界 +X）：车辆 X→-Z，Y→Y，Z→X
    dock: { p: [0, 8.1, -0.2], q: basis([0, 0, -1], [0, 1, 0], [1, 0, 0]) },
    pre: [0, 14.2, 2.2],
  };
}
