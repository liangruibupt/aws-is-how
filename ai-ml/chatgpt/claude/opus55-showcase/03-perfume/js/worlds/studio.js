// studio.js — 中性影棚：无缝背景弯、两侧长条柔光、一盏主光。单独调瓶子和玻璃时用（?world=studio），也是还没做世界的香型的替身
import * as THREE from 'three';

/** 背景弯：地面 → 圆弧 → 背墙，一张弯曲的平面 */
function sweep({ width = 14, floor = 3, R = 0.8, wall = 3, z0 = 1.2 }) {
  const g = new THREE.PlaneGeometry(width, 1, 1, 96), p = g.attributes.position, arc = (Math.PI / 2) * R, L = floor + arc + wall;
  for (let i = 0; i < p.count; i++) {
    const s = (0.5 - p.getY(i)) * L;
    let y, z;
    if (s < floor) { y = 0; z = z0 - s; }
    else if (s < floor + arc) { const a = (s - floor) / R; y = R * (1 - Math.cos(a)); z = z0 - floor - R * Math.sin(a); }
    else { y = R + (s - floor - arc); z = z0 - floor - R; }
    p.setXYZ(i, p.getX(i), y, z);
  }
  g.computeVertexNormals();
  return g;
}

export async function build(ctx) {
  const { scene } = ctx;
  scene.background = new THREE.Color('#0f1012');
  const bg = new THREE.Mesh(sweep({}), new THREE.MeshStandardMaterial({ color: '#2b2d31', roughness: 0.82, side: THREE.DoubleSide }));
  bg.receiveShadow = true; scene.add(bg);
  const key = new THREE.DirectionalLight('#fff3e6', 2.4);
  key.position.set(-0.5, 0.9, 0.7); key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -0.5, right: 0.5, top: 0.5, bottom: -0.5, near: 0.1, far: 3 });
  key.shadow.camera.updateProjectionMatrix(); key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 4;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight('#dfe9ff', 1.2); rim.position.set(0.6, 0.5, -0.8); scene.add(rim);

  // 特写的替身：一块卵石顶着一颗水珠。放在瓶子左边 3 米：不进任何瓶子镜头，也在主光的阴影盒外面
  const M = [-3, 0, 0], macro = new THREE.Group(); macro.position.set(...M);
  const pebble = new THREE.Mesh(new THREE.IcosahedronGeometry(0.02, 3), new THREE.MeshStandardMaterial({ color: '#8a8478', roughness: 0.6 }));
  pebble.scale.set(1.4, 0.6, 1); pebble.position.y = 0.012; pebble.castShadow = true;
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.004, 32, 16), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.02, transmission: 1, thickness: 0.004, ior: 1.33 }));
  drop.position.set(0, 0.0245, 0);
  macro.add(pebble, drop); scene.add(macro);

  return {
    env: {
      base: '#17181b',
      fill(add, B) {
        add(8, 5, [0, 5, 12], B('#fff6ec', 1.4));             // 正面大柔光
        add(3, 8, [-10, 3, 6], B('#dfe8ff', 2.2));            // 左前冷光
        add(3, 8, [10, 3, 6], B('#ffe8d2', 1.8));             // 右前暖光
      },
    },
    post: { exposure: 1.0, aperture: 0, vignette: 0.25, grain: 0.025 },
    macro: {
      root: macro,
      camera: s => ({ type: 'free', position: [M[0] + 0.05 * Math.sin(0.3 + 0.2 * s.lt), 0.045, M[2] + 0.09], target: [M[0], 0.02, M[2]], fov: 24, fovAxis: 'short' }),
      post: { aperture: 0.6, maxBlur: 0.01 },
    },
    update() {},
    dispose() {},
  };
}
