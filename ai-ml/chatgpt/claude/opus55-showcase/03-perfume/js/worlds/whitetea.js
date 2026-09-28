// whitetea.js — 白茶 · 晨雾茶山：瓶子立在茶园石埂的湿石板上；身后层层茶山（茶垄顺着等高线）隐进谷里的晨雾，
// 低太阳在左后方，光束斜穿雾气。特写是「一芽二叶」：带白毫的芽头、两片锯齿嫩叶，叶尖挂着一颗渐渐长大的露珠
import * as THREE from 'three';
import { haze, sky, dewMaterial, driftField, puffAtlas, billboards, NOISE } from './common.js';
import { rand } from '../../../factory/engine/rng.js';
import { lerp, ss, clamp, easeInOut } from '../../../factory/engine/ease.js';

const SUN = new THREE.Vector3(-0.82, 0.42, -0.38).normalize();          // 指向太阳：左后方（偏离镜头方向约 65°），仰角约 25°
const SKY = { zenith: '#9fbcc6', horizon: '#f3ecdb', mist: '#e6ebe3', sun: { dir: SUN.toArray(), color: '#ffe0b0', glow: 1.2, rays: 0.45 } };

// ── 一维值噪声（地形轮廓用；只由 seed 决定）──
const n1 = (seed, x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(rand(seed, i), rand(seed, i + 1), u); };
const fbm1 = (seed, x, oct = 4) => { let s = 0, a = 0.5; for (let o = 0; o < oct; o++) { s += a * n1(seed + o * 101, x); x *= 2.03; a *= 0.5; } return s / (1 - 0.5 ** oct); };

// ── 远景：五层山，每层是绕原点的一段弧（半径 R 米，方位 ±135°：特写朝 −x 看、16:9 的画面左缘也还在山前）。最近一层在眼睛下方，看得清茶垄顺着山嘴冲沟弯；往后一层比一层高、一层比一层淡 ──
// crest 山脊高度（相对石板，米）、amp 起伏、slope 迎面坡度、rows 茶垄（等高线的高差，米；0 = 只有林子）、tree 山顶林带宽度、
// fade 山脊以下多深开始隐进雾里、多深完全看不见（米）
const RIDGES = [
  { R: 60, crest: -1.5, amp: 2.2, slope: 0.5, rows: 0.75, tree: 2.5, fade: [12, 20], seed: 11 },
  { R: 95, crest: 2, amp: 3.5, slope: 0.5, rows: 0.85, tree: 3.5, fade: [2.5, 8], seed: 23 },
  { R: 132, crest: 8, amp: 5, slope: 0.5, rows: 0.95, tree: 8, fade: [2, 7], seed: 37 },
  { R: 158, crest: 16, amp: 8, slope: 0.5, rows: 0, tree: 40, fade: [2, 7], seed: 41 },
  { R: 176, crest: 28, amp: 12, slope: 0.55, rows: 0, tree: 60, fade: [3, 10], seed: 53 },
];
const SPAN = (135 * Math.PI) / 180;

/** 一层山的高度场：沿弧 x（米）、离山脊 s（米，> 0 在山脊前面）→ 高度。前坡上叠山嘴和冲沟（侧光下一明一暗，等高线跟着弯），山脊上叠树冠起伏 */
function ridgeHeight(L, x, s) {
  const crest = L.crest + L.amp * (2 * fbm1(L.seed, x / (L.R * 0.5)) - 1) + 0.2 * L.amp * (2 * fbm1(L.seed + 7, x / (L.R * 0.1)) - 1);
  const gully = (2 * fbm1(L.seed + 3, x / (L.R * 0.12)) - 1) * 0.15 * Math.max(s, 0) ** 2 / (Math.max(s, 0) + 6);   // 坡度变化不超过 0.15：不会翻折
  const front = s > 0 ? -L.slope * s - gully : 1.1 * s;
  const canopy = Math.max(0, 1 - Math.max(s, 0) / L.tree) * (0.6 + 0.4 * n1(L.seed + 5, x / 1.7)) * (0.9 + 0.08 * L.R ** 0.5);
  return { h: crest + front + canopy, crest };
}
function ridgeGeometry(L) {
  const NX = 520, NS = 48, sBack = -Math.min(8, L.R * 0.08), sFront = Math.min((L.fade[1] + 4) / L.slope, L.R * 0.7);
  const pos = [], aS = [], idx = [];
  for (let j = 0; j <= NS; j++) {
    const k = j / NS, s = k < 0.2 ? lerp(sBack, 0, k / 0.2) : sFront * ((k - 0.2) / 0.8) ** 1.5;   // 山脊附近密一些：剪影在这里
    for (let i = 0; i <= NX; i++) {
      const th = lerp(-SPAN, SPAN, i / NX), x = th * L.R, r = L.R - s, { h } = ridgeHeight(L, x, s);
      pos.push(Math.sin(th) * r, h, -Math.cos(th) * r); aS.push(s);
    }
  }
  for (let j = 0; j < NS; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + NX + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }     // 逆时针朝上：法线朝天、朝镜头
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const RIDGE_VERT = /* glsl */`
attribute float aS; varying vec3 vW, vN; varying float vS;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vS = aS; gl_Position = projectionMatrix * viewMatrix * w; }`;
function ridgeMaterial(hz, L, i) {
  return new THREE.ShaderMaterial({
    uniforms: { ...hz.uniforms, uRow: { value: L.rows }, uTree: { value: L.tree }, uSlope: { value: L.slope }, uFade: { value: new THREE.Vector2(...L.fade) }, uSeed: { value: i * 17.3 } },
    vertexShader: RIDGE_VERT,
    fragmentShader: /* glsl */`
${hz.glsl}
${NOISE}
uniform float uRow, uTree, uSlope, uSeed; uniform vec2 uFade;
varying vec3 vW, vN; varying float vS;
void main() {
  vec3 N = normalize(vN), D = normalize(vW - cameraPosition);
  float along = atan(vW.x, -vW.z) * length(vW.xz), wob = fbm(vec2(along * 0.04, vW.y * 0.05) + uSeed);
  // 茶垄：一垄一垄圆顶的茶蓬（垄前沿背光偏暗、垄顶受光，顶上嫩芽偏黄绿），垄间一道窄的暗沟；沿垄断成一丛一丛，叶子有细碎的明暗。
  // 远到一个像素放不下一垄时淡成平均色
  vec3 bush = vec3(0.075, 0.17, 0.03), tip = vec3(0.17, 0.30, 0.05), gap = vec3(0.02, 0.028, 0.015), tree = vec3(0.028, 0.055, 0.038);
  vec3 alb = mix(bush, tip, 0.25) * 0.8; float top = 0.5;
  if (uRow > 0.0) {
    float q = vW.y / uRow + 0.45 * wob, f = fract(q), row = floor(q), aa = clamp(fwidth(q) * 1.5 - 0.15, 0.0, 1.0);
    float c = vnoise(vec2(along * 0.8, row * 3.1 + uSeed));                                      // 沿垄一丛一丛：蓬顶高低不齐，偶尔断开
    float b = smoothstep(0.0, 0.1 + 0.12 * c, f) * smoothstep(1.0, 0.94, f) * mix(0.5, 1.0, smoothstep(0.08, 0.3, c));
    float leaf = mix(0.75 + 0.5 * vnoise(vec2(along * 7.0, vW.y * 9.0)), 1.0, clamp(fwidth(along) * 3.0, 0.0, 1.0));
    vec3 cb = mix(bush, tip, smoothstep(0.55, 0.95, f) * vnoise(vec2(along * 1.3, row * 2.1))) * leaf * mix(0.6, 1.0, smoothstep(0.1, 0.75, f));
    alb = mix(mix(gap, cb, b), alb, aa); top = mix(smoothstep(0.3, 0.95, f) * b, 0.5, aa);
  }
  float treeK = smoothstep(uTree + 1.5, uTree - 1.5, vS + 3.0 * (vnoise(vW.xz * 0.12 + uSeed) - 0.5) * min(uTree, 6.0));
  alb = mix(alb, tree * (0.7 + 0.6 * vnoise(vW.xz * 0.5)), treeK); top = mix(top, 0.6, treeK);
  // 光：太阳在左后方侧照（包裹一点，植被没有死黑的背光面），天光从上面来；垄顶逆着太阳的叶子透一点光
  float nl = max((dot(N, hSunDir) + 0.3) / 1.3, 0.0) * (0.6 + 0.6 * top);
  vec3 amb = mix(hMist, hZenith, 0.5 + 0.5 * N.y) * (0.75 + 0.35 * top);
  vec3 col = alb * (hSun * 2.2 * nl + amb) + tip * hSun * pow(max(dot(D, hSunDir), 0.0), 4.0) * top * top * 0.8;
  // 雾：30 米以外随距离变浓；每层山从山脊往下越深越隐进雾里（雾顶慢慢起伏、飘动），一层和后一层就隔开了
  float below = max(vS, 0.0) * uSlope + (fbm(vec2(along * 0.025 + hTime * 0.04, uSeed)) - 0.5) * (uFade.y - uFade.x) * 0.8;
  float f = 1.0 - exp(-max(length(vW - cameraPosition) - 30.0, 0.0) * 0.008) * (1.0 - smoothstep(uFade.x, uFade.y, below));
  gl_FragColor = vec4(mix(col, haze(D), f), 1.0);
}`,
  });
}

// ── 茶叶 ──
/**
 * 一片茶叶：沿 +x 从叶柄（x = 0）到叶尖（x = len），宽约 len / 2.6；椭圆形，最宽处在 45%，叶基楔形、叶尖渐尖。
 * serr：边缘锯齿深（占叶宽的比例，齿尖朝叶尖）；fold：沿主脉 V 形对折（两半抬起的斜率）；curl：叶尖下垂 = curl × len（负数 = 翘起）。
 * uv.x 沿叶长、uv.y 横跨叶宽（主脉在 0.5）。正面朝 +y
 */
export function teaLeafGeometry(len, { segs = [96, 8], fold = 0.25, curl = 0.15, serr = 0.05, teeth = 22 } = {}) {
  const [NU, NV] = segs, W = len / 2.6, pos = [], uv = [], idx = [];
  for (let i = 0; i <= NU; i++) {
    const u = i / NU, t = (u * teeth) % 1, tooth = (t < 0.8 ? t / 0.8 : (1 - t) / 0.2) * ss(0.08, 0.25, u) * ss(1, 0.9, u);
    const half = (W / 2) * Math.sin(Math.PI * u ** 0.868) ** 0.8;
    for (let j = 0; j <= NV; j++) {
      const v = (j / NV) * 2 - 1, z = v * (half + serr * W * tooth * Math.abs(v) ** 8);
      pos.push(u * len, fold * Math.abs(z) - curl * len * u * u, z); uv.push(u, (v + 1) / 2);
    }
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * 叶脉贴图（uv 同 teaLeafGeometry）：主脉 + 每边 9 条侧脉（从主脉斜着伸向叶尖，近叶缘时弯上去；两边错开半格），叶面有一点斑驳。
 * 叶面 ≈ 0.8、叶脉 1：当 map 用叶脉浅一点，当 bumpMap（负的 bumpScale）叶脉凹下去、叶面一格一格鼓起来
 */
function veinTexture(W = 512, H = 128) {
  const px = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = (i + 0.5) / W, v = (j + 0.5) / H, d = Math.abs(v - 0.5) * 2;                  // d：0 主脉 → 1 叶缘
    const mid = Math.exp(-(((v - 0.5) / (0.014 * (1.3 - u))) ** 2));
    const q = (u - 0.3 * d ** 0.8) * 9 + (v > 0.5 ? 0.5 : 0), f = q - Math.round(q);
    const lat = Math.exp(-((f / (0.08 * (1.2 - 0.6 * d))) ** 2)) * ss(0.04, 0.12, u) * ss(1, 0.85, d) * ss(0.97, 0.88, u);
    const val = 0.8 + 0.035 * (n2(9, u * 40, v * 12) - 0.5) + 0.2 * Math.max(mid, 0.6 * lat), p = 4 * (j * W + i);
    px[p] = px[p + 1] = px[p + 2] = Math.round(255 * clamp(val)); px[p + 3] = 255;
  }
  const tex = new THREE.DataTexture(px, W, H);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}

// ── 石板：茶园石埂的压顶石，顶面平（y = 0，焦散落在这里），边缘崩口；后沿长着一线青苔，石面上散着水珠和几片落叶 ──
const SLAB = { x0: -1.6, x1: 1.6, zb: -0.36, zf: 1.3 };
const slabEdge = (k, sd) => 0.012 * (2 * fbm1(sd, k * 14) - 1) + 0.006 * (2 * n1(sd + 1, k * 60) - 1);
const backEdge = x => SLAB.zb + slabEdge((x - SLAB.x0) / (SLAB.x1 - SLAB.x0), 71);      // 后沿在 x 处的 z
/** 二维值噪声（摆放水珠、青苔用）*/
const n2 = (seed, x, y) => {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v), g = (p, q) => rand(seed, (p + 4096) * 8192 + q + 4096);
  return lerp(lerp(g(i, j), g(i + 1, j), a), lerp(g(i, j + 1), g(i + 1, j + 1), a), b);
};

/**
 * 石板的材质：颜色和粗糙度按世界坐标在 color / roughness 上下缓慢变化（±15% 以内）——一块块更湿更暗更亮的水渍，加上顺着石纹的细条。
 * 平均值就是 color / roughness 本身：焦散读的正是这两个值（glass.js），落在石板上的透光和周围没有色差
 */
function slateMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: '#6d7571', roughness: 0.26, metalness: 0 });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSlate;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvSlate = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vSlate;\n${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  vec2 sp = vSlate.xz;
  float wet = smoothstep(0.38, 0.62, fbm(sp * 2.6 + 7.3));                                   // 水渍：更暗、更光
  float grain = vnoise(vec2(sp.x * 3.0, sp.y * 55.0)) - 0.5;                                // 顺着 x 的石纹
  float fine = mix(vnoise(sp * 420.0) - 0.5, 0.0, clamp(fwidth(sp.x) * 300.0, 0.0, 1.0));   // 细砂粒，远了淡掉
  diffuseColor.rgb *= 1.0 + 0.12 * (0.45 - wet) + 0.08 * grain + 0.1 * fine + 0.06 * (fbm(sp * 0.9) - 0.47);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor *= 1.0 + 0.3 * (0.45 - wet) + 0.08 * grain;`);
  };
  m.customProgramCacheKey = () => 'whitetea-slate';
  return m;
}
function slab() {
  const sh = new THREE.Shape(), P = [], { x0, x1, zb, zf } = SLAB, n = 90;
  for (let i = 0; i <= n; i++) { const k = i / n; P.push([lerp(x0, x1, k), zb + slabEdge(k, 71)]); }      // 后沿：离瓶子 36 厘米
  for (let i = 1; i <= 8; i++) P.push([x1 + slabEdge(i / 8, 73), lerp(zb, zf, i / 8)]);
  for (let i = 1; i <= 8; i++) P.push([lerp(x1, x0, i / 8), zf]);
  for (let i = 1; i < 8; i++) P.push([x0 + slabEdge(i / 8, 79), lerp(zf, zb, i / 8)]);
  P.forEach(([x, z], i) => (i ? sh.lineTo(x, -z) : sh.moveTo(x, -z)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.09, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2); g.translate(0, -0.09, 0);                    // 形状平面 → 水平面，挤出方向朝上，顶面在 y = 0
  const m = new THREE.Mesh(g, slateMaterial());
  m.receiveShadow = true;
  return m;
}
/** 石面上的水珠：扁的半球，底色和石头差不多（水是透明的），很光——边上掠射的天光勾出一圈亮边，顶上一个太阳的高光。成团分布，避开瓶底（半径 7 厘米） */
function droplets() {
  const N = 300, geo = new THREE.SphereGeometry(1, 14, 6, 0, 2 * Math.PI, 0, Math.PI / 2), o = new THREE.Object3D();
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#66706c', roughness: 0.02, metalness: 0, envMapIntensity: 2.2 }), N);
  for (let i = 0, k = 0; i < N; k++) {
    const r = j => rand(131, k * 4 + j), x = lerp(-1.0, 1.0, r(0)), z = lerp(SLAB.zb + 0.03, 0.7, r(1));
    if (Math.hypot(x, z) < 0.07 || r(2) > ss(0.4, 0.7, n2(137, x * 5, z * 5))) continue;
    const R = lerp(0.0005, 0.0026, r(3) ** 2);
    o.position.set(x, 0, z); o.scale.set(R, 0.6 * R, R); o.updateMatrix(); mesh.setMatrixAt(i++, o.matrix);
  }
  mesh.receiveShadow = true;
  return mesh;
}
/** 后沿的青苔：一万多个压扁的小团挤成一道矮垫子，贴着崩口长，时断时续；暗橄榄绿，天鹅绒一样的掠射高光（sheen） */
function moss() {
  const N = 12000, geo = new THREE.IcosahedronGeometry(1, 0), o = new THREE.Object3D(), c = new THREE.Color();
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 1, sheen: 1, sheenColor: '#9aab5c', sheenRoughness: 0.5 }), N);
  const tones = ['#3d4f2a', '#4d5f30', '#2e3d22', '#5a6a36'].map(h => new THREE.Color(h));
  for (let i = 0, k = 0; i < N; k++) {
    const r = j => rand(151, k * 6 + j), x = lerp(SLAB.x0 + 0.02, SLAB.x1 - 0.02, r(0)), d = r(3) ** 1.6;
    if (r(1) > ss(0.2, 0.5, n2(157, x * 5, 0)) * (1 - 0.7 * d)) continue;
    const S = lerp(0.0008, 0.0028, r(2) ** 2) * (1.2 - 0.5 * d), z = backEdge(x) + lerp(-0.003, 0.035, d);
    o.position.set(x, -0.1 * S, z); o.rotation.set(r(4), r(4) * 6.283, 0); o.scale.set(1.2 * S, 0.8 * S, S); o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix); mesh.setColorAt(i, c.copy(tones[Math.floor(r(5) * 4)])); i++;
  }
  mesh.receiveShadow = true;
  return mesh;
}
/** 石面上的几片落叶：老叶，平躺，叶尖微微翘起。两片在瓶子后面（每种比例都看得见，那里没有字），一片在右前方 */
function fallenLeaves() {
  const veins = veinTexture(), g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#4a6128').multiplyScalar(1.25), map: veins, bumpMap: veins, bumpScale: -1.5, roughness: 0.5, side: THREE.DoubleSide });
  for (const [x, z, yaw, len] of [[-0.13, -0.2, 0.5, 0.048], [0.17, -0.28, -2.4, 0.042], [0.42, 0.18, -0.9, 0.05]]) {
    const m = new THREE.Mesh(teaLeafGeometry(len, { segs: [88, 6], fold: 0.12, curl: -0.04, serr: 0.05 }), mat);
    m.position.set(x, 0.0006, z); m.rotation.y = yaw; m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  }
  return g;
}
/** 石板下面的石埂：几块粗糙的石头往下垒，出了画面就隐进雾里 */
function wall() {
  const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: '#4a524d', roughness: 0.7, flatShading: true });
  for (let i = 0; i < 14; i++) {
    const r = j => rand(97, i * 5 + j), geo = new THREE.IcosahedronGeometry(0.22 + 0.12 * r(0), 1), p = geo.attributes.position;
    for (let v = 0; v < p.count; v++) p.setXYZ(v, p.getX(v) * (1.2 + 0.4 * r(1)), p.getY(v) * 0.7, p.getZ(v) * 0.9);
    geo.computeVertexNormals();
    const s = new THREE.Mesh(geo, mat); s.position.set(-1.7 + i * 0.26 + 0.05 * r(2), -0.3 - 0.12 * r(3) - (i % 2) * 0.15, -0.52 - 0.1 * r(4));
    g.add(s);
  }
  return g;
}

// ── 特写：一芽二叶 ──
// 放在石板左端外 1.4 米（离开所有瓶子镜头的视野和主光的阴影盒）。在嫩枝自己的坐标里设计：x 向右、y 向上、+z 朝相机；
// 整枝绕 y 转 90°，相机就朝 −x 看，太阳在右后上方——逆光，嫩叶透光，芽头的白毫亮成一圈
const MACRO_AT = [-3, 0.12, 0];
const KEY = { color: '#ffe2b8', intensity: 3.2 };

/**
 * 嫩叶材质：蜡质叶面（清漆）+ 叶脉贴图。逆光时叶片透光：lights 之后给 directDiffuse 加上从叶子背面穿过来的太阳光（黄绿，叶脉处更亮）。
 * normal 在双面材质里总朝着观者，-normal 和太阳同向就是逆光
 */
function leafMaterial(veins, { color, trans = 0.5, transColor = '#b8dc4c', roughness = 0.42, clearcoat = 0.5 }) {
  const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color).multiplyScalar(1.25), map: veins, bumpMap: veins, bumpScale: -1.5, roughness, clearcoat, clearcoatRoughness: 0.3, side: THREE.DoubleSide });
  const U = { uTrans: { value: new THREE.Color(transColor).multiplyScalar(trans) }, uSun: { value: new THREE.Color(KEY.color).multiplyScalar(KEY.intensity) }, uSunDir: { value: SUN } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uTrans, uSun, uSunDir;')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
  float vein = clamp((texture2D(map, vMapUv).r - 0.8) * 5.0, 0.0, 1.0);
  vec3 through = uTrans * uSun * smoothstep(-0.1, 1.0, dot(-normal, normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz))) * (0.75 + 0.5 * vein);
  #ifdef USE_INSTANCING_COLOR
    through *= vColor;                                                   // 茶蓬里的叶子：越深越暗，透过来的光也少
  #endif
  reflectedLight.directDiffuse += through;`);
  };
  m.customProgramCacheKey = () => 'whitetea-leaf';
  return m;
}
/** 叶片挂到节上：叶柄在 at，先绕主脉扭 roll，再抬起 pitch，再转到方位 yaw（0 = 向右，π = 向左，−π/2 = 朝相机）*/
function attach(geo, mat, at, yaw, pitch, roll) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...at); m.rotation.set(roll, yaw, pitch, 'YZX');
  return m;
}
/** 芽头：纺锤形（最宽在下 40%，尖头），淡黄绿，丝绒光（sheen）；外面一层贴伏、朝芽尖的白毫（一像素宽的线），在逆光里亮成一圈 */
function bud(len, R) {
  const P = [], prof = v => R * Math.sin(Math.PI * v ** 0.75) ** 0.8;
  for (let i = 0; i <= 32; i++) { const v = i / 32; P.push(new THREE.Vector2(prof(v) + 1e-5, v * len)); }
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.LatheGeometry(P, 32), new THREE.MeshPhysicalMaterial({ color: '#d4e0b0', roughness: 0.6, sheen: 1, sheenColor: '#ffffff', sheenRoughness: 0.3 })));
  const pos = [];
  for (let i = 0; i < 2500; i++) {
    const r = j => rand(171, i * 4 + j), v = lerp(0.03, 0.98, r(0)), a = r(1) * 2 * Math.PI, rr = prof(v), L = lerp(0.0003, 0.0009, r(2));
    const d = new THREE.Vector3(Math.cos(a) * lerp(0.15, 0.45, r(3)), 1, Math.sin(a) * lerp(0.15, 0.45, r(3))).normalize();
    const p = new THREE.Vector3(Math.cos(a) * rr, v * len, Math.sin(a) * rr);
    pos.push(...p.toArray(), ...p.addScaledVector(d, L).toArray());
  }
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.add(new THREE.LineSegments(hg, new THREE.LineBasicMaterial({ color: new THREE.Color('#f6f8ec').multiplyScalar(1.4), transparent: true, opacity: 0.35 })));
  return g;
}
/**
 * 一芽二叶 + 叶尖一颗露珠 + 后面虚掉的茶蓬。返回 root（整枝）、frame（取景盒，世界坐标；深度以露珠为中心，对焦 'target' 就落在露珠上）、
 * dir(yaw, pitch)（相机方向，按嫩枝坐标的方位 / 仰角，度）、drop(R)（按半径摆露珠：顶端始终挂在叶尖上）
 */
function macroSprig(hz) {
  const root = new THREE.Group();
  const veins = veinTexture(), young = leafMaterial(veins, { color: '#7fa83a' }), old = leafMaterial(veins, { color: '#34521f', trans: 0.3, roughness: 0.8, clearcoat: 0 });
  const N2 = [0.009, -0.02, 0], N1 = [0.006, 0.008, 0], B = [0.004, 0.026, 0];
  const stem = new THREE.CatmullRomCurve3([[0.016, -0.17, -0.03], [0.012, -0.08, -0.01], N2, N1, B].map(p => new THREE.Vector3(...p)));
  const tube = new THREE.TubeGeometry(stem, 96, 1, 10), tp = tube.attributes.position, c = new THREE.Vector3();
  for (let i = 0; i < tp.count; i++) {                                    // 下粗上细：1.3 → 0.7 毫米
    const k = Math.floor(i / 11) / 96; stem.getPointAt(k, c);
    tp.setXYZ(i, ...new THREE.Vector3().fromBufferAttribute(tp, i).sub(c).multiplyScalar(lerp(0.0013, 0.0007, k)).add(c).toArray());
  }
  tube.computeVertexNormals();
  root.add(new THREE.Mesh(tube, new THREE.MeshPhysicalMaterial({ color: '#8aa651', roughness: 0.5, sheen: 0.6, sheenColor: '#e8f0d0' })));
  const b = bud(0.024, 0.0034); b.position.set(...B); b.rotation.z = 0.12;
  const leaf1 = attach(teaLeafGeometry(0.036, { segs: [200, 12], fold: 0.55, curl: 0.08, serr: 0.04 }), young, N1, 0.6, 0.75, -0.4);
  const leaf2 = attach(teaLeafGeometry(0.052, { segs: [220, 12], fold: 0.18, curl: 0.6, serr: 0.05 }), young, N2, Math.PI + 0.35, 0.25, 0.5);
  root.add(b, leaf1, leaf2);
  // 后面的茶蓬：几百片老叶铺成一个缓缓的圆顶（在露珠后面 6–70 厘米、下面），全在焦外。越往蓬里越暗（没有阴影：嫩枝在主光的阴影盒外面）
  const N = 480, bush = new THREE.InstancedMesh(teaLeafGeometry(0.05, { segs: [32, 4], fold: 0.25, curl: 0.2, serr: 0 }), old, N), o = new THREE.Object3D(), tone = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const r = j => rand(181, i * 8 + j), x = lerp(-0.6, 0.6, r(1)), z = lerp(-0.7, -0.06, r(3)), deep = r(2) ** 2;
    o.position.set(x, -0.07 - 0.12 * (x / 0.6) ** 2 - 0.03 * z - 0.1 * deep, z);
    o.rotation.set(lerp(-0.8, 0.8, r(6)), r(4) * 2 * Math.PI, lerp(-0.2, 0.5, r(5)), 'YZX');
    o.scale.setScalar(lerp(0.8, 1.2, r(0))); o.updateMatrix();
    bush.setMatrixAt(i, o.matrix); bush.setColorAt(i, tone.setScalar(lerp(1, 0.25, deep)));
  }
  root.add(bush);
  const dew = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), dewMaterial(hz, { below: '#4a6a2c', above: '#b9d65c' }));
  root.add(dew);
  root.updateMatrixWorld(true);                                          // 先在嫩枝坐标里量叶尖和取景盒，再整枝搬过去
  const tip = new THREE.Vector3(0.052, -0.6 * 0.052, 0).applyMatrix4(leaf2.matrix);                     // 叶尖（嫩枝坐标）
  const drop = R => { dew.scale.set(R, 1.2 * R, R); dew.position.set(tip.x, tip.y - R, tip.z); dew.updateMatrix(); };   // 顶端在叶尖上方 0.2R：叶尖扎进水珠一点
  drop(0.003);
  const frame = new THREE.Box3();
  for (const o of [b, leaf1, leaf2, dew]) frame.expandByObject(o, true);
  frame.min.z = frame.max.z = tip.z;                                    // 压成露珠所在的一个平面：按这个面取景，盒心就在露珠的深度上
  root.position.set(...MACRO_AT); root.rotation.y = Math.PI / 2; root.updateMatrixWorld(true);
  frame.applyMatrix4(root.matrixWorld);
  const dir = (yaw, pitch) => { const Y = yaw * Math.PI / 180, P = pitch * Math.PI / 180; return new THREE.Vector3(Math.sin(Y) * Math.cos(P), Math.sin(P), Math.cos(Y) * Math.cos(P)).applyQuaternion(root.quaternion).toArray(); };
  return { root, frame, dir, drop };
}

export async function build(ctx) {
  const { scene } = ctx, hz = haze(SKY);
  scene.background = new THREE.Color(SKY.horizon);
  scene.add(sky(hz));
  for (const [i, L] of RIDGES.entries()) { const m = new THREE.Mesh(ridgeGeometry(L), ridgeMaterial(hz, L, i)); m.frustumCulled = false; scene.add(m); }
  scene.add(slab(), wall(), droplets(), moss(), fallenLeaves());

  const key = new THREE.DirectionalLight(KEY.color, KEY.intensity);
  key.position.copy(SUN).multiplyScalar(1.5); key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -0.5, right: 0.5, top: 0.5, bottom: -0.5, near: 0.1, far: 3 });
  key.shadow.camera.updateProjectionMatrix(); key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 5;
  scene.add(key, key.target);

  // 谷里的雾（向右慢慢飘）：扁长的雾团贴在石板后沿下面的谷里，在最近一层山的坡脚铺一道亮带，往上散成几缕
  const mist = driftField({ geometry: new THREE.PlaneGeometry(1, 1), material: billboards(hz, { map: puffAtlas(5), tint: [1.04, 1.04, 1.02], opacity: 0.45, forward: 0.3, aspect: 3 }),
    count: 28, seed: 101, box: [-26, -6, -34, 26, -3, -14], vel: [0.35, 0, 0], sway: 0.3, swayHz: 0.05, size: [8, 18], spin: 0, fade: 'alpha' });
  const leafGeo = teaLeafGeometry(0.03, { segs: [12, 4], fold: 0.3, curl: 0.1, serr: 0 }); leafGeo.translate(-0.015, 0, 0);   // 绕叶子中间翻转
  const leaves = driftField({ geometry: leafGeo, material: new THREE.MeshStandardMaterial({ color: '#7d9a4f', roughness: 0.5, side: THREE.DoubleSide }),
    count: 12, seed: 202, box: [-1.5, -0.3, -3, 1.5, 0.8, -0.6], vel: [0.12, -0.05, 0], sway: 0.08, swayHz: 0.25, size: [0.8, 1.25], spin: 0.6 });
  scene.add(mist.mesh, leaves.mesh);

  const sprig = macroSprig(hz); scene.add(sprig.root);

  return {
    env: { base: null, fill: (add, B, es) => es.add(sky(hz, { R: 15 })) },
    post: { exposure: 1.1, aperture: 0.25, bloom: { strength: 0.3, threshold: 0.9 }, saturation: 1, lift: [0.01, 0.012, 0.01], vignette: 0.18, grain: 0.025 },
    macro: {
      root: sprig.root,
      // 慢慢绕到露珠左边、同时推近：露珠里的高光跟着走
      camera: s => ({ type: 'fit', box: sprig.frame, dir: sprig.dir(lerp(-8, 4, easeInOut(s.u)), -6), fov: 28, scale: lerp(1, 1.12, easeInOut(s.u)) }),
      post: { aperture: 1.2, maxBlur: 0.03, exposure: 1, gamma: [0.88, 0.88, 0.88], saturation: 1.2 },
    },
    update(ctx, s) {
      hz.uniforms.hTime.value = s.t;
      mist.update(s.t); leaves.update(s.t);
      if (s.name === 'macro') sprig.drop(lerp(0.0016, 0.003, ss(0, 1, s.u)));   // 露珠慢慢长大
    },
    reset() { sprig.drop(0.003); },
  };
}
