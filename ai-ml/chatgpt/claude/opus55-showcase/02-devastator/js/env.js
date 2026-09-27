// env.js — 机库：混凝土地坪、墙板、钢柱与屋架、高棚灯、大门逆光、警示灯，以及用于金属反射的 PMREM 环境
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { boxGeo, cylGeo, rng, DEG, clamp } from './kit.js';

export const HANGAR = { W: 56, D0: -26, D1: 34, H: 22, doorW: 18, doorH: 13 };

/** 静态几何按材质合批 */
function batcher() {
  const bins = new Map(), o = new THREE.Object3D();
  const add = (geo, mat, pos, rot = [0, 0, 0], scl) => {
    o.position.set(...pos); o.rotation.set(rot[0] * DEG, rot[1] * DEG, rot[2] * DEG); o.scale.set(...(scl || [1, 1, 1])); o.updateMatrix();
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(o.matrix);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    (bins.get(mat) || bins.set(mat, []).get(mat)).push(g);
  };
  const flush = (parent, { cast = true, receive = true } = {}) => {
    for (const [mat, gs] of bins) {
      const m = new THREE.Mesh(mergeGeometries(gs, false), mat);
      m.castShadow = cast; m.receiveShadow = receive; parent.add(m);
    }
    bins.clear();
  };
  return { add, flush };
}

function envMap(renderer) {
  const es = new THREE.Scene(), B = (c, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide });
  const room = new THREE.Mesh(new THREE.BoxGeometry(70, 26, 70), B('#15181d')); room.position.y = 12; room.material.side = THREE.BackSide; es.add(room);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), B('#26282b')); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; es.add(floor);
  const quad = (w, h, pos, rot, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(...pos); m.rotation.set(...rot.map(r => r * DEG)); es.add(m); };
  for (let i = -2; i <= 2; i++) quad(34, 1.1, [i * 7, 24.5, 0], [90, 0, 0], B('#fff6e8', 9));          // 顶部灯带
  for (const s of [-1, 1]) {
    quad(22, 7, [s * 34.5, 11, -4], [0, 90, 0], B(s < 0 ? '#c9d8ff' : '#ffe2c2', 1.6));                // 两侧柔光墙
    quad(3, 16, [s * 12, 9, -34.5], [0, 0, 0], B('#ffffff', 3.5));                                    // 背景竖灯
  }
  quad(18, 12, [0, 7, -34.5], [0, 0, 0], B('#dfe9ff', 5.5));                                          // 大门
  quad(40, 4, [0, 4, 34.5], [0, 180, 0], B('#8b70ea', 0.9));                                          // 身后一抹紫
  quad(34, 10, [0, 11, 34.4], [0, 180, 0], B('#ffe6c8', 2.2));                                        // 正面柔光箱：替代机位旁的补光灯照亮正面，反射宽而柔，不会在平面上打出白斑
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(es, 0.035).texture;
  pm.dispose();
  return tex;
}

/** 门外夜空：地平线一道亮带做逆光，往上迅速压暗（v=0.27 ≈ 地面高度） */
function skyTex() {
  const c = Object.assign(document.createElement('canvas'), { width: 4, height: 256 }), g = c.getContext('2d'), gr = g.createLinearGradient(0, 256, 0, 0);
  [[0, '#8f9bb3'], [0.27, '#ffffff'], [0.36, '#e4ebf8'], [0.46, '#8b9ab8'], [0.62, '#3a465e'], [0.8, '#1c2331'], [1, '#10141b']].forEach(([k, v]) => gr.addColorStop(k, v));
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildEnv(scene, renderer, T) {
  const E = { group: new THREE.Group(), beacons: [], lamps: [], alarm: 0, lightsOn: 1 };
  scene.add(E.group);
  scene.environment = envMap(renderer);
  scene.environmentIntensity = 0.85;
  scene.background = new THREE.Color('#0c0e11');
  scene.fog = new THREE.FogExp2('#12151a', 0.0105);

  const { W, D0, D1, H, doorW, doorH } = HANGAR, r = rng(21);
  const mats = {
    floor: new THREE.MeshStandardMaterial({ map: T.concrete, roughnessMap: T.concreteR, roughness: 0.92, metalness: 0.0, envMapIntensity: 0.9 }),
    wall: new THREE.MeshStandardMaterial({ map: T.wall, color: '#9aa1a8', roughness: 0.78, metalness: 0.35 }),
    steel: new THREE.MeshStandardMaterial({ color: '#4a5058', roughness: 0.55, metalness: 0.9, roughnessMap: T.wear }),
    yellow: new THREE.MeshStandardMaterial({ color: '#d59a0b', roughness: 0.5, metalness: 0.4, roughnessMap: T.wear }),
    hazard: new THREE.MeshStandardMaterial({ map: T.hazard, roughness: 0.6, metalness: 0.2 }),
    dark: new THREE.MeshStandardMaterial({ color: '#23272d', roughness: 0.7, metalness: 0.6 }),
    drum: new THREE.MeshStandardMaterial({ color: '#2b5f8c', roughness: 0.45, metalness: 0.6, roughnessMap: T.wear }),
    drumR: new THREE.MeshStandardMaterial({ color: '#8c2b20', roughness: 0.45, metalness: 0.6, roughnessMap: T.wear }),
    crate: new THREE.MeshStandardMaterial({ color: '#5b5042', roughness: 0.85, metalness: 0.1 }),
    lamp: new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4e0', emissiveIntensity: 5 }),
    beacon: new THREE.MeshStandardMaterial({ color: '#ffb020', emissive: '#ff8a00', emissiveIntensity: 0.2, roughness: 0.3 }),
    outside: new THREE.MeshBasicMaterial({ color: new THREE.Color('#dbe6ff').multiplyScalar(2.4), map: skyTex(), fog: false }),
  };
  E.mats = mats;
  // 地坪油渍粗糙度低：门洞逆光掠射、顶部灯带镜像都会在俯视镜头里亮成一块块「雪斑」，两项高光都压到很低
  mats.floor.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
	reflectedLight.directSpecular = min( reflectedLight.directSpecular, vec3( 0.08 ) );
	reflectedLight.indirectSpecular = min( reflectedLight.indirectSpecular, vec3( 0.1 ) );`);
  };
  const outsideC = mats.outside.color.clone();

  // ── 地坪 ──
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.6, (D1 - D0) * 1.4), mats.floor);
  floor.rotation.x = -Math.PI / 2; floor.position.z = (D0 + D1) / 2; floor.receiveShadow = true;
  T.concrete.repeat.set(9, 9); T.concreteR.repeat.set(9, 9);
  E.group.add(floor);

  const decal = (tex, w, h, pos, rotZ = 0, opacity = 1) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({
      map: tex, transparent: true, opacity, roughness: 0.6, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false,
    }));
    m.rotation.set(-Math.PI / 2, 0, rotZ); m.position.set(pos[0], 0.012, pos[1]); m.receiveShadow = true; E.group.add(m); return m;
  };
  E.floorEmblem = decal(T.floorEmblem, 10.5, 10.5, [0, 0.4], 0, 0.6);

  // 装配区警示框 + 行车道线
  const B = batcher();
  const hz = T.hazard.clone(); hz.needsUpdate = true; hz.repeat.set(8, 1);
  const hzMat = new THREE.MeshStandardMaterial({ map: hz, roughness: 0.55, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -1 });
  for (const [x, z, rz] of [[0, -7.6, 0], [0, 8.4, 0], [-8, 0.4, 90], [8, 0.4, 90]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(16.5, 0.5), hzMat);
    m.rotation.set(-Math.PI / 2, 0, rz * DEG); m.position.set(x, 0.011, z); m.receiveShadow = true; E.group.add(m);
  }
  const lineMat = new THREE.MeshStandardMaterial({ color: '#c9a227', roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -1 });
  for (const x of [-9.4, 9.4]) for (let z = D0 + 2; z < D1 - 4; z += 3.2) B.add(new THREE.PlaneGeometry(0.22, 1.8), lineMat, [x, 0.011, z], [-90, 0, 0]);
  B.flush(E.group, { cast: false });

  // ── 墙体（后墙开大门）──
  const wallTex = (w, h) => { const t = T.wall.clone(); t.needsUpdate = true; t.repeat.set(w / 4, h / 4); return t; };
  const wall = (w, h, pos, rotY) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mats.wall.clone()); m.material.map = wallTex(w, h);
    m.position.set(...pos); m.rotation.y = rotY * DEG; m.receiveShadow = true; E.group.add(m); return m;
  };
  const sideW = (W - doorW) / 2;
  wall(sideW, H, [-(doorW + sideW) / 2, H / 2, D0], 0);
  wall(sideW, H, [(doorW + sideW) / 2, H / 2, D0], 0);
  wall(doorW, H - doorH, [0, doorH + (H - doorH) / 2, D0], 0);
  wall(D1 - D0, H, [-W / 2, H / 2, (D0 + D1) / 2], 90);
  wall(D1 - D0, H, [W / 2, H / 2, (D0 + D1) / 2], -90);
  wall(W, H, [0, H / 2, D1], 180);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D1 - D0), mats.dark); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, (D0 + D1) / 2); E.group.add(ceil);

  // 门外：强逆光 + 门框 + 警示条
  const out = new THREE.Mesh(new THREE.PlaneGeometry(doorW + 30, doorH + 16), mats.outside); out.position.set(0, doorH / 2, D0 - 16); E.group.add(out);
  const outFloor = new THREE.Mesh(new THREE.PlaneGeometry(doorW + 30, 16), mats.floor); outFloor.rotation.x = -Math.PI / 2; outFloor.position.set(0, 0, D0 - 8); outFloor.receiveShadow = true; E.group.add(outFloor);
  B.add(boxGeo(0.9, doorH, 0.9, 0.02), mats.yellow, [-doorW / 2 - 0.45, doorH / 2, D0 + 0.2]);
  B.add(boxGeo(0.9, doorH, 0.9, 0.02), mats.yellow, [doorW / 2 + 0.45, doorH / 2, D0 + 0.2]);
  B.add(boxGeo(doorW + 1.8, 1.1, 1.1, 0.02), mats.steel, [0, doorH + 0.55, D0 + 0.3]);
  for (let i = 0; i < 9; i++) B.add(boxGeo(doorW + 0.2, 0.5, 0.3, 0.02), mats.dark, [0, doorH - 0.3 - i * 0.52, D0 - 0.5]);   // 卷帘（大部分已收起）

  // ── 钢柱与屋架 ──
  const ibeam = (pos, h, rotY = 0) => {
    const [x, y, z] = pos, a = rotY * DEG, c = Math.cos(a), s = Math.sin(a);
    const off = (dx, dz) => [x + dx * c + dz * s, y, z - dx * s + dz * c];
    B.add(boxGeo(0.9, h, 0.1, 0.01), mats.steel, off(0, -0.35), [0, rotY, 0]);
    B.add(boxGeo(0.9, h, 0.1, 0.01), mats.steel, off(0, 0.35), [0, rotY, 0]);
    B.add(boxGeo(0.12, h, 0.7, 0.01), mats.steel, off(0, 0), [0, rotY, 0]);
  };
  for (let z = D0 + 6; z < D1; z += 8) for (const sx of [-1, 1]) ibeam([sx * (W / 2 - 0.4), H / 2, z], H, 90);
  for (const x of [-20, -12, 12, 20]) ibeam([x, H / 2, D0 + 0.4], H, 0);
  for (let z = D0 + 6; z < D1; z += 8) {
    B.add(boxGeo(W, 0.7, 0.4, 0.01), mats.steel, [0, H - 0.6, z]);
    B.add(boxGeo(W, 0.3, 0.3, 0.01), mats.steel, [0, H - 3.4, z]);
    for (let x = -W / 2 + 2; x < W / 2 - 1; x += 4) {
      const k = ((x + W / 2) / 4) % 2 ? 1 : -1;
      B.add(boxGeo(0.16, 3.6, 0.16, 0.01), mats.steel, [x + 1, H - 2, z], [0, 0, k * 34]);
      B.add(boxGeo(0.14, 2.8, 0.14, 0.01), mats.steel, [x, H - 2, z]);
    }
  }
  // 行车轨道
  for (const x of [-W / 2 + 2.2, W / 2 - 2.2]) B.add(boxGeo(0.8, 0.9, D1 - D0 - 2, 0.02), mats.yellow, [x, 15.5, (D0 + D1) / 2]);
  B.add(boxGeo(W - 4.4, 1.3, 1.1, 0.03), mats.yellow, [0, 15.4, -14]);
  B.add(boxGeo(2.2, 1.2, 1.6, 0.05), mats.dark, [-6, 14.6, -14]);

  // 侧墙走道
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 - 1.3);
    B.add(boxGeo(2.4, 0.16, D1 - D0 - 4, 0.01), mats.steel, [x, 7, (D0 + D1) / 2 - 1]);
    B.add(boxGeo(0.08, 0.08, D1 - D0 - 4, 0.01), mats.yellow, [x - sx * 1.15, 8.1, (D0 + D1) / 2 - 1]);
    B.add(boxGeo(0.08, 0.08, D1 - D0 - 4, 0.01), mats.yellow, [x - sx * 1.15, 7.6, (D0 + D1) / 2 - 1]);
    for (let z = D0 + 3; z < D1 - 3; z += 2) B.add(boxGeo(0.08, 1.1, 0.08, 0.01), mats.yellow, [x - sx * 1.15, 7.6, z]);
  }

  // 油桶、货箱、工具柜
  for (let i = 0; i < 26; i++) {
    const sx = r() < 0.5 ? -1 : 1, x = sx * (W / 2 - 1.6 - r() * 3.2), z = D0 + 3 + r() * (D1 - D0 - 14);
    if (Math.abs(z) < 3 && r() < 0.6) continue;
    if (r() < 0.55) B.add(cylGeo(0.42, 0.42, 1.25, 'y', 18), r() < 0.5 ? mats.drum : mats.drumR, [x, 0.625, z]);
    else { const s = 0.9 + r() * 0.8; B.add(boxGeo(s, s, s, 0.03), mats.crate, [x, s / 2, z], [0, r() * 40, 0]); }
  }
  for (const x of [-14, 14]) B.add(boxGeo(6, 2.4, 1.2, 0.03), mats.dark, [x, 1.2, D0 + 0.8]);
  B.flush(E.group);

  // ── 高棚灯（依次点亮）──
  for (const z of [-16, -4, 8]) for (const x of [-13, 0, 13]) {
    const g = new THREE.Group(); g.position.set(x, H - 3.8, z);
    const hood = new THREE.Mesh(cylGeo(0.45, 1.05, 0.9, 'y', 24, true), mats.dark); hood.material.side = THREE.DoubleSide;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.95, 24), mats.lamp.clone()); disc.rotation.x = Math.PI / 2; disc.position.y = -0.42;
    const cap = new THREE.Mesh(cylGeo(0.3, 0.3, 0.5, 'y', 12), mats.dark); cap.position.y = 0.6;
    g.add(hood, disc, cap); E.group.add(g); E.lamps.push(disc);
  }

  // ── 灯光 ──
  E.hemi = new THREE.HemisphereLight('#a9b8cc', '#2a2622', 0.45); scene.add(E.hemi);
  const key = new THREE.DirectionalLight('#fff2df', 1.8); key.position.set(10, 30, 16); key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 5, far: 70 });
  key.shadow.mapSize.set(4096, 4096); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = 3;
  scene.add(key, key.target); E.key = key;
  const spot = (c, i, pos, tgt, ang = 30, pen = 0.6) => { const s = new THREE.SpotLight(c, i, 70, ang * DEG, pen, 1.2); s.position.set(...pos); s.target.position.set(...tgt); scene.add(s, s.target); return s; };
  E.rimL = spot('#9f86ff', 260, [-16, 14, -12], [0, 5, 0], 28);
  E.rimR = spot('#8fd0ff', 220, [16, 12, -14], [0, 5, 0], 28);
  E.door = spot('#dfe8ff', 900, [0, 11, D0 - 8], [0, 0, 2], 36, 0.8);
  E.fill = spot('#ffe8cc', 160, [0, 6, 22], [0, 5, 0], 34, 0.9);

  // 门口光柱（叠加面片）
  const shaftMat = new THREE.MeshBasicMaterial({ color: '#cfdcff', alphaMap: T.cone, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4 + r() * 3, 26), shaftMat);
    m.position.set(-7 + i * 3.5, 6, D0 + 9); m.rotation.set(-62 * DEG, (r() - 0.5) * 20 * DEG, 0); m.renderOrder = 4; E.group.add(m);
  }

  // ── 警示旋转灯 ──
  for (const [x, z, ry] of [[-W / 2 + 0.3, -8, 90], [W / 2 - 0.3, -8, -90], [-10, D0 + 0.3, 0], [10, D0 + 0.3, 0], [-W / 2 + 0.3, 10, 90], [W / 2 - 0.3, 10, -90]]) {
    const g = new THREE.Group(); g.position.set(x, 9.5, z); g.rotation.y = ry * DEG;
    const base = new THREE.Mesh(boxGeo(0.5, 0.25, 0.4, 0.03), mats.dark); base.position.set(0, -0.3, 0.2);
    const dome = new THREE.Mesh(cylGeo(0.22, 0.26, 0.4, 'y', 16), mats.beacon); dome.position.set(0, 0, 0.3);
    const rot = new THREE.Group(); rot.position.set(0, 0, 0.3);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, 9, 20, 1, true).rotateX(-Math.PI / 2).translate(0, 0, 4.5),
      new THREE.MeshBasicMaterial({ color: '#ff9a1a', alphaMap: T.cone, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    rot.add(beam); g.add(base, dome, rot); E.group.add(g);
    const L = new THREE.SpotLight('#ff9a1a', 0, 30, 22 * DEG, 0.5, 1.4); L.position.set(0, 0, 0.3); L.target.position.set(0, 0, 5);
    rot.add(L, L.target);
    E.beacons.push({ rot, beam, L, ph: r() * 6 });
  }

  // ── 逐帧 ──
  E.update = (t, dt, S) => {
    const on = S.lights ?? 1;
    E.lamps.forEach((d, i) => { const k = clamp((on * 11 - i) * 1.3); d.material.emissiveIntensity = 5 * k * (k < 1 ? 0.6 + 0.4 * Math.sin(t * 90 + i) : 1); });
    key.intensity = 1.8 * on; E.hemi.intensity = 0.12 + 0.33 * on; E.fill.intensity = 160 * on * (S.fill ?? 1);
    const a = S.alarm ?? 0;
    mats.beacon.emissiveIntensity = 0.2 + 3.2 * a;
    for (const b of E.beacons) { b.rot.rotation.y = t * 5.2 + b.ph; b.beam.material.opacity = 0.09 * a; b.L.intensity = 120 * a; }
    E.rimL.intensity = 260 * (S.rim ?? 1); E.rimR.intensity = 220 * (S.rim ?? 1);
    const d = S.door ?? 1;                                          // 大门逆光：合体与终场时压暗，避免躯干背后过曝
    E.door.intensity = 900 * d; shaftMat.opacity = 0.06 * d; mats.outside.color.copy(outsideC).multiplyScalar(1.5 * d * d);
  };
  return E;
}
