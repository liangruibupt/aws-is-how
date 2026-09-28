// osmanthus.js — 桂花 · 金秋：傍晚的低太阳在瓶子正后方偏右，逆光。瓶子立在老榆木茶台上，台面散着几朵落花；身后左边一棵桂花树的深绿树冠，
// 右边一道矮树篱，再远是暮霭里的树影；一枝桂花从左上方斜伸进来成剪影，叶缝里漏下的阳光在焦外化成一个个暖金色的光斑，花一朵朵往下飘。
// 特写是叶腋里的一簇桂花：十朵四瓣的小花挂在细花梗上，逆光里花瓣透亮，最下面一朵的瓣尖挂着一颗渐渐长大的露珠
import * as THREE from 'three';
import { haze, sky, dewMaterial, driftField, NOISE } from './common.js';
import { DROP, fallen, stretch } from '../drop.js';
import { rand } from '../../../factory/engine/rng.js';
import { lerp, ss, clamp, easeInOut } from '../../../factory/engine/ease.js';

const SUN = new THREE.Vector3(0.3, 0.18, -0.94).normalize();           // 指向太阳：正后方偏右约 18°，仰角约 10°（傍晚）
const SKY = { zenith: '#9c9088', horizon: '#f0b060', mist: '#3a2818', sun: { dir: SUN.toArray(), color: '#ffb35e', glow: 1.5, rays: 0.3 } };
const KEY = { color: '#ffc27e', intensity: 2.8 };
const V3 = (...a) => new THREE.Vector3(...a);

// ── 值噪声（只由 seed 决定）──
const n1 = (seed, x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(rand(seed, i), rand(seed, i + 1), u); };
const fbm1 = (seed, x, oct = 4) => { let s = 0, a = 0.5; for (let o = 0; o < oct; o++) { s += a * n1(seed + o * 101, x); x *= 2.03; a *= 0.5; } return s / (1 - 0.5 ** oct); };
const n2 = (seed, x, y) => {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v), g = (p, q) => rand(seed, (p + 4096) * 8192 + q + 4096);
  return lerp(lerp(g(i, j), g(i + 1, j), a), lerp(g(i, j + 1), g(i + 1, j + 1), a), b);
};
const sfbm = (seed, x) => 2 * fbm1(seed, x) - 1;

// ── 远景：暮霭里的两道树影、一道矮树篱。都是绕原点的竖直弧面（方位从 −z 往 +x 量，度），顶沿树梢起伏；树篱在左边藏到树冠后面 ──
// R 半径、a 方位范围、y0 底、top(x) 顶（x 沿弧的米数）、leaf 叶丛的疏密、fringe 树梢参差的深度、rim 逆光金边的宽度（米）、fog 雾的浓度
const LINES = [
  { R: 60, a: [-110, 125], y0: -2, top: x => 4 + 2 * sfbm(61, x / 25) + 0.8 * sfbm(62, x / 5), tone: '#2c2a1c', leaf: 0.5, fringe: 0.5, rim: 0.6, fog: 0.02, seed: 1 },
  { R: 22, a: [-90, 115], y0: -1.5, top: x => 1.6 + 0.8 * sfbm(71, x / 9) + 0.35 * sfbm(72, x / 2.2) + 0.1 * sfbm(73, x / 0.5), tone: '#222617', leaf: 1.5, fringe: 0.25, rim: 0.25, fog: 0.018, seed: 2 },
  { R: 5.2, a: [-25, 110], y0: -0.75, top: x => 0.34 + 0.1 * sfbm(81, x / 1.6) + 0.06 * sfbm(82, x / 0.35), tone: '#17220f', leaf: 6, fringe: 0.07, rim: 0.05, fog: 0.02, seed: 3 },
];
function lineGeometry(L) {
  const NX = 520, NY = 10, a0 = (L.a[0] * Math.PI) / 180, a1 = (L.a[1] * Math.PI) / 180, pos = [], aT = [], aX = [], idx = [];
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
    const th = lerp(a0, a1, i / NX), x = th * L.R, top = L.top(x), y = lerp(L.y0, top, (j / NY) ** 0.6);   // 顶上密一些：剪影在这里
    pos.push(Math.sin(th) * L.R, y, -Math.cos(th) * L.R); aT.push(top - y); aX.push(x);
  }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + NX + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1)); g.setAttribute('aX', new THREE.Float32BufferAttribute(aX, 1)); g.setIndex(idx);
  return g;
}
function lineMaterial(hz, L) {
  return new THREE.ShaderMaterial({
    uniforms: { ...hz.uniforms, uTone: { value: new THREE.Color(L.tone) }, uLeaf: { value: L.leaf }, uFringe: { value: L.fringe }, uRim: { value: L.rim }, uFog: { value: L.fog }, uSeed: { value: L.seed * 13.7 } },
    side: THREE.DoubleSide,
    vertexShader: /* glsl */`
attribute float aT, aX; varying vec3 vW; varying float vT, vX;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vT = aT; vX = aX; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
${hz.glsl}
${NOISE}
uniform vec3 uTone; uniform float uLeaf, uFringe, uRim, uFog, uSeed;
varying vec3 vW; varying float vT, vX;
void main() {
  vec2 p = vec2(vX, vW.y) * uLeaf + uSeed;
  float clump = fbm(p), fine = vnoise(p * 5.0);
  if (vT < uFringe * (0.3 + fbm(p * 2.3 + 5.1))) discard;                 // 树梢参差：一丛丛叶子的轮廓
  vec3 D = normalize(vW - cameraPosition);
  vec3 col = uTone * (0.45 + 1.1 * smoothstep(0.35, 0.8, clump) * (0.7 + 0.3 * fine));
  // 逆光：树梢镶一道金边，朝太阳那一侧最亮；叶丛里零星透一点光
  float toward = pow(max(dot(D, hSunDir), 0.0), 6.0);
  col += hSun * (0.15 + 2.2 * toward) * exp(-vT / uRim) * (0.4 + 0.6 * fine);
  col += hSun * 0.25 * toward * smoothstep(0.72, 0.9, clump * fine + 0.35);
  // 暮霭：随距离融进天色，底部沉进更浓的霭里
  float f = 1.0 - exp(-length(vW - cameraPosition) * uFog);
  f = max(f, 0.5 * smoothstep(0.0, -2.0, vW.y) * step(10.0, length(vW.xz)));
  gl_FragColor = vec4(mix(col, haze(D), clamp(f, 0.0, 1.0)), 1.0);
}`,
  });
}

// ── 叶与花 ──
/**
 * 一片桂花叶：沿 +x 从叶柄（x = 0）到叶尖（x = len），椭圆形，最宽在中间（约 len / 3），叶尖渐尖、叶基楔形；
 * fold：沿主脉 V 形对折；curl：叶尖下垂 = curl × len。uv.x 沿叶长、uv.y 横跨叶宽（主脉在 0.5）。正面朝 +y
 */
function leafGeometry(len, { segs = [24, 4], fold = 0.2, curl = 0.1 } = {}) {
  const [NU, NV] = segs, W = len / 3, pos = [], uv = [], idx = [];
  for (let i = 0; i <= NU; i++) {
    const u = i / NU, half = (W / 2) * Math.sin(Math.PI * u ** 0.95) ** 0.7 * (1 - 0.45 * ss(0.55, 1, u));
    for (let j = 0; j <= NV; j++) {
      const v = (j / NV) * 2 - 1, z = v * half;
      pos.push(u * len, fold * Math.abs(z) - curl * len * u * u, z); uv.push(u, (v + 1) / 2);
    }
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/** 叶脉贴图（uv 同 leafGeometry）：主脉 + 每边 8 条细侧脉（斜伸向叶尖、近叶缘弯上去）。叶面 ≈ 0.8、叶脉 1 */
function veinTexture(W = 256, H = 64) {
  const px = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = (i + 0.5) / W, v = (j + 0.5) / H, d = Math.abs(v - 0.5) * 2;
    const mid = Math.exp(-(((v - 0.5) / (0.02 * (1.3 - u))) ** 2));
    const q = (u - 0.35 * d ** 0.7) * 8 + (v > 0.5 ? 0.5 : 0), f = q - Math.round(q);
    const lat = Math.exp(-((f / 0.06) ** 2)) * ss(0.05, 0.15, u) * ss(1, 0.8, d) * ss(0.95, 0.8, u);
    const val = 0.8 + 0.03 * (n2(9, u * 30, v * 10) - 0.5) + 0.2 * Math.max(mid, 0.45 * lat), p = 4 * (j * W + i);
    px[p] = px[p + 1] = px[p + 2] = Math.round(255 * clamp(val)); px[p + 3] = 255;
  }
  const tex = new THREE.DataTexture(px, W, H);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}

/**
 * 一朵桂花（开足的）：花冠深四裂，四片肉质的圆头花瓣从很短的花冠筒向外张开，边缘兜起、瓣尖微微外翻；花心两枚小雄蕊。
 * 直径约 d，花心朝 +y，第 k 片花瓣朝 45° + 90°k。顶点色：瓣基深橙 → 瓣尖金黄
 */
const PETAL = { half: 0.42, rise: [0.5, -0.38] };                        // 半宽（占瓣长）、瓣的高度曲线 h(u) = L (a u + b u²)
const petalTip = (L, k) => { const a = Math.PI / 4 + (k * Math.PI) / 2; return V3(L * Math.cos(a), L * (PETAL.rise[0] + PETAL.rise[1]), L * Math.sin(a)); };
function floretGeometry(d, { segs = [10, 4], stamens = true } = {}) {
  const [NU, NV] = segs, L = d / 2, pos = [], col = [], idx = [], c = new THREE.Color();
  const base = new THREE.Color('#f6c21a'), tip = new THREE.Color('#ffe04c'), throat = new THREE.Color('#d88e08'), anther = new THREE.Color('#f2d468');
  const w = u => PETAL.half * L * (u < 0.65 ? 0.3 + 0.7 * Math.sin((Math.PI / 2) * (u / 0.65)) : Math.sqrt(Math.max(0, 1 - ((u - 0.65) / 0.35) ** 2)));
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2, ca = Math.cos(a), sa = Math.sin(a), o = pos.length / 3;
    for (let i = 0; i <= NU; i++) {
      const u = i / NU, r = L * (0.14 + 0.86 * u), h = L * (PETAL.rise[0] * u + PETAL.rise[1] * u * u), hw = w(u);
      c.copy(base).lerp(tip, ss(0.05, 0.8, u));
      for (let j = 0; j <= NV; j++) {
        const v = (j / NV) * 2 - 1, s = v * hw;
        pos.push(r * ca - s * sa, h + 0.3 * hw * v * v * ss(0, 0.5, u), r * sa + s * ca); col.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const p = o + i * (NV + 1) + j, q = p + NV + 1; idx.push(p, p + 1, q, p + 1, q + 1, q); }
  }
  const o = pos.length / 3;                                              // 花心：花冠筒口一圈，往里略凹
  pos.push(0, 0.02 * L, 0); col.push(throat.r, throat.g, throat.b);
  for (let i = 0; i <= 12; i++) { const a = (i / 12) * 2 * Math.PI; pos.push(0.2 * L * Math.cos(a), 0.06 * L, 0.2 * L * Math.sin(a)); col.push(base.r, base.g, base.b); }
  for (let i = 0; i < 12; i++) idx.push(o, o + 2 + i, o + 1 + i);
  if (stamens) for (const sx of [-1, 1]) {                                 // 两枚雄蕊：短短的淡黄小球，贴在筒口
    const s = new THREE.SphereGeometry(0.075 * L, 8, 6), sp = s.attributes.position, so = pos.length / 3;
    for (let i = 0; i < sp.count; i++) { pos.push(sp.getX(i) + sx * 0.08 * L, sp.getY(i) * 1.3 + 0.13 * L, sp.getZ(i)); col.push(anther.r, anther.g, anther.b); }
    for (const i of s.index.array) idx.push(so + i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * 逆光透光：lights 之后给 directDiffuse 加上从背面穿过来的阳光（花瓣、叶片）。normal 在双面材质里总朝着观者，-normal 和太阳同向就是逆光。
 * 有顶点色 / 实例色时乘上它：花瓣透出来的是自己的橙黄，树冠深处的叶子透过来的光也少
 */
function translucent(m, key, color, k, veins = false) {
  const U = { uTrans: { value: new THREE.Color(color).multiplyScalar(k) }, uSun: { value: new THREE.Color(KEY.color).multiplyScalar(KEY.intensity) }, uSunDir: { value: SUN } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uTrans, uSun, uSunDir;')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
  vec3 through = uTrans * uSun * smoothstep(-0.2, 1.0, dot(-normal, normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz)));
  ${veins ? 'through *= 0.8 + 0.6 * clamp((texture2D(map, vMapUv).r - 0.8) * 5.0, 0.0, 1.0);' : ''}
  #ifdef USE_COLOR
    through *= vColor;
  #endif
  reflectedLight.directDiffuse += through;`);
  };
  m.customProgramCacheKey = () => key;
  return m;
}
/** 花瓣：肉质、略带蜡光，丝绒一样的掠射高光；逆光时整片透亮 */
const petalMaterial = () => translucent(new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.6, sheen: 0.2, sheenColor: '#ffd060', sheenRoughness: 0.5, side: THREE.DoubleSide }), 'osmanthus-petal', '#fff0c8', 0.45);
/** 桂花叶：革质、很亮（清漆），深绿；叶脉贴图做颜色和凹凸，逆光时叶脉透得更亮 */
const leafMaterial = (veins, color) => translucent(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color).multiplyScalar(1.25), map: veins, bumpMap: veins, bumpScale: -1.2, roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.25, side: THREE.DoubleSide }), 'osmanthus-leaf', '#8a9a30', 0.18, true);

/** 把网格的 +x 对准 dir、再绕它转 roll（叶子：叶柄在 at） */
function aim(o, at, dir, roll = 0, axis = V3(1, 0, 0)) {
  o.position.copy(at);
  o.quaternion.setFromUnitVectors(axis, dir.clone().normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(axis, roll));
  return o;
}

// ── 茶台：老榆木，顶面平（y = 0，焦散落在这里），后沿圆角，逆光里勾出一道亮线 ──
const TABLE = { x0: -1.3, x1: 1.3, zb: -0.42, zf: 1.2, h: 0.06, round: 0.015 };
/**
 * 榆木的材质：颜色和粗糙度按世界坐标在 color / roughness 上下变化——顺着 x 的山纹年轮（晚材深、导管粗），顺纹的细导管，一片片深浅。
 * 平均值就是 color / roughness 本身（焦散读的就是这两个值，glass.js）
 */
function elmMaterial() {
  const m = new THREE.MeshPhysicalMaterial({ color: '#3d2819', roughness: 0.66, metalness: 0, specularIntensity: 0.5 });   // 擦了木蜡油：哑光，逆光里一层柔的光泽
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vElm;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvElm = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vElm;\n${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  vec2 wp = vElm.xz;                                                    // 木纹顺着 x
  float q = wp.y * 17.0 + 6.0 * fbm(vec2(wp.x * 0.5, wp.y * 1.4)) + 2.5 * sin(wp.x * 1.9 + 3.0 * fbm(wp * 0.7 + 7.0));   // 年轮：五六厘米一道，宽窄不一，弯成一个个山纹
  float f = fract(q), late = smoothstep(0.0, 0.06, f) * smoothstep(0.34, 0.12, f);
  late = mix(late, 0.3, clamp(fwidth(q) * 1.5 - 0.3, 0.0, 1.0));       // 远了淡成平均
  float fib = mix(vnoise(vec2(wp.x * 4.0, wp.y * 320.0)), 0.5, clamp(fwidth(wp.y) * 160.0 - 0.2, 0.0, 1.0));   // 顺纹的细导管
  float mot = fbm(vec2(wp.x * 0.9, wp.y * 3.0) + 3.1);                 // 一片片深浅
  diffuseColor.rgb *= 1.0 - 0.22 * (late - 0.3) + 0.16 * (fib - 0.5) + 0.3 * (mot - 0.47);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor *= 1.0 + 0.08 * (late - 0.3) - 0.06 * (fib - 0.5);`);
  };
  m.customProgramCacheKey = () => 'osmanthus-elm';
  return m;
}
function table() {
  const { x0, x1, zb, zf, h, round } = TABLE, mat = elmMaterial(), g = new THREE.Group();
  const top = new THREE.BoxGeometry(x1 - x0, h, zf - zb - round); top.translate((x0 + x1) / 2, -h / 2, (zf + zb + round) / 2);
  const edge = new THREE.CylinderGeometry(round, round, x1 - x0, 24, 1); edge.rotateZ(Math.PI / 2); edge.translate((x0 + x1) / 2, -round, zb + round);
  const lip = new THREE.BoxGeometry(x1 - x0, h - round, round); lip.translate((x0 + x1) / 2, -round - (h - round) / 2, zb + round / 2);
  for (const geo of [top, edge, lip]) { const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; g.add(m); }
  return g;
}
/** 台面上的落花：四十来朵，成几小堆，有的翻着、有的侧着，放久的颜色暗一点。避开瓶底（半径 8 厘米） */
function fallenFlorets(petal) {
  const N = 44, mesh = new THREE.InstancedMesh(floretGeometry(0.0075, { segs: [6, 3] }), petal, N), o = new THREE.Object3D(), c = new THREE.Color();
  const piles = [[-0.2, -0.22], [0.24, -0.3], [0.33, 0.12], [-0.3, 0.05], [0.05, -0.36]];
  for (let i = 0, k = 0; i < N; k++) {
    const r = j => rand(501, k * 8 + j), [px, pz] = piles[k % piles.length], R = 0.07 * Math.sqrt(r(0)), a = r(1) * 2 * Math.PI;
    const x = px + R * Math.cos(a), z = pz + R * Math.sin(a) * 0.7;
    if (Math.hypot(x, z) < 0.08 || z < TABLE.zb + 0.03) continue;
    o.position.set(x, 0.0012, z); o.rotation.set(lerp(-0.5, 0.5, r(2)) + (r(3) < 0.3 ? Math.PI : 0), r(4) * 6.283, lerp(-0.4, 0.4, r(5)), 'YXZ');
    o.scale.setScalar(lerp(0.8, 1.15, r(6))); o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix); mesh.setColorAt(i, c.setRGB(1, lerp(0.75, 1, r(7)), lerp(0.6, 1, r(7)))); i++;
  }
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

// ── 身后左边的桂花树：三团树冠叠成不规则的圆顶，一万多片深绿的亮叶贴着外壳长；里面一团暗芯，叶缝里就看不穿 ──
const CROWN = [
  { at: [-2.6, 0.5, -3.6], r: [1.7, 1.1, 1.3], n: 7000 },
  { at: [-1.9, 1.3, -3.3], r: [1.1, 0.8, 0.9], n: 3500 },
  { at: [-1.25, 0.05, -3.0], r: [0.9, 0.7, 0.8], n: 2500 },
];
const lobeBump = (seed, d) => { const az = Math.atan2(d.x, -d.z); return 1 + 0.2 * (2 * n2(seed, az * 2.2, d.y * 2.5) - 1) + 0.08 * (2 * n2(seed + 1, az * 7, d.y * 7) - 1); };
function crown() {
  const g = new THREE.Group(), N = CROWN.reduce((s, c) => s + c.n, 0), o = new THREE.Object3D(), tone = new THREE.Color(), d = V3();
  const mat = translucent(new THREE.MeshStandardMaterial({ color: '#1f3818', roughness: 0.38, side: THREE.DoubleSide }), 'osmanthus-crown', '#8a9a30', 0.16);
  const mesh = new THREE.InstancedMesh(leafGeometry(0.075, { segs: [6, 2], fold: 0.2, curl: 0.1 }), mat, N), core = new THREE.MeshStandardMaterial({ color: '#101a0c', roughness: 1 });
  let i = 0;
  CROWN.forEach((L, li) => {
    for (let k = 0; k < L.n; k++) {
      const r = j => rand(601 + li, k * 8 + j), u = lerp(-0.75, 1, r(0)), ph = 2 * Math.PI * r(1), s = Math.sqrt(1 - u * u);
      d.set(s * Math.cos(ph), u, s * Math.sin(ph));
      const shell = 0.8 + 0.22 * Math.sqrt(r(2)), rho = shell * lobeBump(611 + li * 5, d);
      o.position.set(L.at[0] + d.x * L.r[0] * rho, L.at[1] + d.y * L.r[1] * rho, L.at[2] + d.z * L.r[2] * rho);
      o.rotation.set(lerp(-1.2, 1.2, r(3)), r(4) * 6.283, lerp(-1, 1, r(5)), 'YZX');
      o.scale.setScalar(lerp(0.75, 1.25, r(6))); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i++, tone.setScalar(lerp(0.2, 0.8, ss(0.8, 1.02, shell)) * (0.5 + 0.5 * (u + 1) / 2) * lerp(0.7, 1.2, r(7))));   // 越往里、越往下越暗
    }
    const c = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), core); c.position.set(...L.at); c.scale.set(...L.r.map(x => x * 0.8));
    g.add(c);
  });
  g.add(mesh);
  return g;
}

// ── 剪影的那一枝：从树冠斜伸到瓶子后上方（瓶后 1 米左右），对生的叶子两两交错，叶腋里一簇簇花。逆光：叶子暗，边上透一点光，花一粒粒亮着 ──
function branch(petal, leafM) {
  const g = new THREE.Group(), o = new THREE.Object3D();
  const curve = new THREE.CatmullRomCurve3([V3(-1.6, 1.1, -1.7), V3(-1.0, 0.72, -1.35), V3(-0.55, 0.5, -1.15), V3(-0.18, 0.4, -1.05), V3(0.16, 0.35, -1.0)]);
  const tube = new THREE.TubeGeometry(curve, 120, 1, 8), tp = tube.attributes.position, c = V3();
  for (let i = 0; i < tp.count; i++) {                                   // 由粗到细：9 → 2 毫米
    const k = Math.floor(i / 9) / 120; curve.getPointAt(k, c);
    tp.setXYZ(i, ...V3().fromBufferAttribute(tp, i).sub(c).multiplyScalar(lerp(0.009, 0.002, k)).add(c).toArray());
  }
  tube.computeVertexNormals();
  g.add(new THREE.Mesh(tube, new THREE.MeshStandardMaterial({ color: '#3a3029', roughness: 0.8 })));
  const nodes = [0.3, 0.42, 0.53, 0.63, 0.72, 0.8, 0.87, 0.93, 0.98], leaves = new THREE.InstancedMesh(leafGeometry(0.085, { segs: [24, 4], fold: 0.3, curl: 0.2 }), leafM, nodes.length * 2);
  const flo = new THREE.InstancedMesh(floretGeometry(0.0075, { segs: [6, 3] }), petal, nodes.length * 11), up = V3(0, 1, 0), P = V3(), T = V3();
  let nl = 0, nf = 0;
  nodes.forEach((k, n) => {
    curve.getPointAt(k, P); curve.getTangentAt(k, T);
    const side = V3().crossVectors(T, up).normalize(), U = V3().crossVectors(side, T);
    for (const sgn of [-1, 1]) {                                          // 一对叶：左右（或上下）交错，往下垂，叶尖朝枝梢
      const r = j => rand(701, n * 8 + (sgn > 0 ? 4 : 0) + j), a = (n % 2 ? Math.PI / 2 : 0) + (sgn > 0 ? Math.PI : 0) + lerp(-0.3, 0.3, r(0));
      const dir = V3().addScaledVector(side, Math.cos(a)).addScaledVector(U, 0.6 * Math.sin(a)).addScaledVector(T, 0.9).add(V3(0, -0.7 - 0.3 * r(1), 0)).normalize();
      aim(o, P, dir, lerp(-0.6, 0.6, r(2))); o.scale.setScalar(lerp(0.8, 1.15, r(3))); o.updateMatrix(); leaves.setMatrixAt(nl++, o.matrix);
    }
    if (k < 0.5) return;
    for (let f = 0; f < 11; f++) {                                        // 叶腋里一簇花：挂在节下面一个小球里，各朝各的方向
      const r = j => rand(711, (n * 11 + f) * 8 + j), u = lerp(-1, 0.6, r(0)), ph = 2 * Math.PI * r(1), s = Math.sqrt(1 - u * u), dir = V3(s * Math.cos(ph), u, s * Math.sin(ph));
      aim(o, V3().copy(P).addScaledVector(dir, 0.012 * (0.6 + 0.4 * r(2))).add(V3(0, -0.006, 0)), dir, r(3) * 6.283, up); o.updateMatrix(); flo.setMatrixAt(nf++, o.matrix);
    }
  });
  leaves.count = nl; flo.count = nf;
  g.add(leaves, flo);
  return g;
}

// ── 焦外光斑：朝向相机的圆片，边缘略亮（镜头的球差），相加混合；颜色 × 亮度来自 instanceColor，慢慢明灭（叶子在风里动）按 uTime 和实例号 ──
function bokehMaterial(time, { soft = 0.2, twinkle = 0.35 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: time, uSoft: { value: soft }, uTw: { value: twinkle } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
uniform float uTime, uTw; varying vec2 vUv; varying vec3 vC;
void main() {
  vec3 c = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float s = length((modelMatrix * instanceMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz), id = float(gl_InstanceID);
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vUv = position.xy * 2.0;
  vC = instanceColor * (1.0 - uTw + uTw * (0.5 + 0.5 * sin(uTime * (0.5 + 0.8 * fract(id * 0.618)) + id * 2.4)));
  gl_Position = projectionMatrix * viewMatrix * vec4(c + (right * position.x + up * position.y) * s, 1.0);
}`,
    fragmentShader: /* glsl */`
uniform float uSoft; varying vec2 vUv; varying vec3 vC;
void main() {
  float r = length(vUv);
  gl_FragColor = vec4(vC * smoothstep(1.0, 1.0 - uSoft, r) * (0.7 + 0.3 * smoothstep(0.4, 0.95, r)), 1.0);
}`,
  });
}
/** 光斑的实例：spots = [[x, y, z, 直径, 亮度], …]；颜色在 colors 两色之间（默认金橙到奶白） */
function bokeh(time, spots, seed, { colors = ['#ffa84a', '#ffe6b8'], ...opts } = {}) {
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), bokehMaterial(time, opts), spots.length), o = new THREE.Object3D(), c = new THREE.Color();
  const [warm, cream] = colors.map(x => new THREE.Color(x));
  spots.forEach(([x, y, z, D, k], i) => {
    o.position.set(x, y, z); o.scale.setScalar(D); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
    mesh.setColorAt(i, c.copy(warm).lerp(cream, rand(seed, i)).multiplyScalar(k));
  });
  mesh.frustumCulled = false; mesh.renderOrder = 5;
  return mesh;
}
const sunward = (x, y, z) => { const d = V3(x, y, z).normalize(); return Math.max(d.dot(SUN), 0) ** 8; };
function sceneBokeh(time) {
  const spots = [], hedge = LINES[2];
  for (let i = 0; i < 34; i++) {                                         // 树篱梢上漏下来的：太阳两边
    const r = j => rand(801, i * 4 + j), th = ((lerp(-8, 62, r(0)) * Math.PI) / 180), R = hedge.R - 0.25, y = hedge.top(th * hedge.R) - lerp(0.0, 0.14, r(1));
    const x = Math.sin(th) * R, z = -Math.cos(th) * R;
    spots.push([x, y, z, lerp(0.05, 0.12, r(2)), lerp(0.35, 0.8, r(3)) + 2.2 * sunward(x, y, z)]);
  }
  for (let i = 0; i < 26; i++) {                                         // 远处树影的缝里：大而淡
    const r = j => rand(803, i * 4 + j), th = ((lerp(0, 48, r(0)) * Math.PI) / 180), R = 20, y = lerp(0.6, 2.2, r(1));
    const x = Math.sin(th) * R, z = -Math.cos(th) * R;
    spots.push([x, y, z, lerp(0.25, 0.55, r(2)), lerp(0.2, 0.45, r(3)) + 1.2 * sunward(x, y, z)]);
  }
  const d = V3();
  for (let i = 0, k = 0; i < 20; k++) {                                  // 树冠朝太阳一侧的边上：稀、暗，那边是字
    const r = j => rand(805, k * 4 + j), L = CROWN[k % 2], u = lerp(-0.2, 0.9, r(0)), ph = 2 * Math.PI * r(1), s = Math.sqrt(1 - u * u);
    d.set(s * Math.cos(ph), u, s * Math.sin(ph));
    if (d.x < 0.35 && d.y < 0.55) continue;
    spots.push([L.at[0] + d.x * L.r[0] * 1.02, L.at[1] + d.y * L.r[1] * 1.02, L.at[2] + d.z * L.r[2] * 1.02, lerp(0.04, 0.08, r(2)), lerp(0.25, 0.5, r(3))]);
    i++;
  }
  return bokeh(time, spots, 807);
}

// ── 特写：叶腋里的一簇桂花 ──
// 放在茶台右端外 1.9 米（离开所有瓶子镜头的视野和主光的阴影盒）。在花簇自己的坐标里设计：x 向右、y 向上、+z 朝相机；
// 整簇绕 y 转一点，相机就朝着太阳左边一点看：逆光，花瓣透亮，太阳的光晕在画面右上
const MACRO_AT = [3.2, 0.12, 0.3], MACRO_YAW = -0.08;

/**
 * 一簇桂花 + 最下面一朵瓣尖上的露珠 + 后面虚掉的枝叶、花和光斑。返回 root、frame（取景盒，世界坐标；压到露珠的深度，对焦 'target' 就落在露珠上）、
 * dir(yaw, pitch)（相机方向，按花簇坐标的方位 / 仰角，度）、drop(R, tau)（同 whitetea：挂着时顶端扎在瓣尖上，松开前 0.3 秒被坠长，tau > 0 后按瓶里水滴的曲线落下）、
 * update(t)（后面飘落的几朵）
 */
function macroCluster(hz, time) {
  const root = new THREE.Group(), petal = petalMaterial(), veins = veinTexture(), leafM = leafMaterial(veins, '#1f3a18');
  const bark = new THREE.MeshStandardMaterial({ color: '#4a3c30', roughness: 0.8 }), stalk = new THREE.MeshPhysicalMaterial({ color: '#9a9446', roughness: 0.5, sheen: 0.5, sheenColor: '#f0e6c0' });
  const N = V3(0, 0.004, -0.01), up = V3(0, 1, 0), o = new THREE.Object3D(), c = new THREE.Color();
  const twig = new THREE.CatmullRomCurve3([V3(-0.08, -0.05, -0.03), V3(-0.035, -0.014, -0.016), N, V3(0.035, 0.03, -0.016), V3(0.08, 0.06, -0.03)]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(twig, 80, 0.001, 10), bark));
  const leaf = geo => new THREE.Mesh(geo, leafM);
  root.add(aim(leaf(leafGeometry(0.08, { segs: [80, 10], fold: 0.25, curl: 0.1 })), N, V3(-0.7, 0.5, -0.8), 0.5));   // 对生的两片叶：左上后方、右下后方，都伸出画面
  root.add(aim(leaf(leafGeometry(0.075, { segs: [80, 10], fold: 0.2, curl: 0.15 })), N, V3(0.75, -0.25, -0.85), -0.6));
  const fl = floretGeometry(0.0075, { segs: [16, 8] }), subject = [], BUDS = [5, 9, 13];
  let tip = null;
  for (let k = 0; k < 16; k++) {                                         // 十六朵（三个花苞）：花梗 4.5–7 毫米，从节上挤成一个朝相机的半球；第 0 朵朝相机略向下，挂露珠
    const r = j => rand(401, k * 6 + j), ph = k * 2.4 + 0.4 * r(0), th = lerp(0.2, 1.5, Math.sqrt((k + r(1)) / 16));
    const dir = k === 0 ? V3(0.1, -0.6, 0.8).normalize() : V3(Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph) - 0.1, Math.cos(th)).normalize();
    const len = k === 0 ? 0.0075 : lerp(0.0045, 0.007, r(2)), A = N.clone().addScaledVector(dir, 0.0006), C = N.clone().addScaledVector(dir, 0.55 * len).add(V3(0, -0.0008, 0)), B = N.clone().addScaledVector(dir, len);
    const ped = new THREE.QuadraticBezierCurve3(A, C, B), T = B.clone().sub(C).normalize();
    root.add(new THREE.Mesh(new THREE.TubeGeometry(ped, 16, 0.0002, 6), stalk));
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.00025, 0.0009, 8), stalk); aim(cup, B.clone().addScaledVector(T, -0.0004), T, 0, up); root.add(cup);
    const bud = BUDS.includes(k), f = new THREE.Mesh(bud ? new THREE.SphereGeometry(0.0014, 16, 12) : fl, petal);
    if (bud) { f.geometry.scale(1, 1.35, 1); f.geometry.translate(0, 0.0016, 0); f.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Array(f.geometry.attributes.position.count).fill([0.85, 0.42, 0.04]).flat(), 3)); }
    aim(f, B, T, r(3) * 6.283, up); root.add(f); subject.push(f);
    if (k === 0) {                                                       // 露珠挂在这朵最低的一片瓣尖上
      f.updateMatrix();
      tip = [0, 1, 2, 3].map(i => petalTip(0.00375, i).applyMatrix4(f.matrix)).reduce((a, b) => (b.y < a.y ? b : a));
    }
  }
  // 后面虚掉的：一百多片深浅不一的叶子（右上留一个口，太阳的光晕从那里进来），几十个橙色的小光斑（远处的花）、更远一圈暖金色的大光斑（太阳一侧多）
  const bgLeaves = new THREE.InstancedMesh(leafGeometry(0.08, { segs: [16, 4], fold: 0.25, curl: 0.15 }), leafM, 150);
  let nb = 0;
  for (let i = 0; nb < 150; i++) {
    const r = j => rand(421, i * 8 + j), z = -lerp(0.05, 0.7, r(0) ** 1.3), s = 1 - z * 0.8, x = lerp(-0.4, 0.4, r(1)), y = lerp(-0.3, 0.3, r(3));
    if (x > 0.05 && y > 0.04 && x + y > 0.16) continue;
    o.position.set(x * s, y * s, z);
    o.rotation.set(lerp(-1, 1, r(4)), r(5) * 6.283, lerp(-0.8, 0.4, r(6)), 'YZX'); o.scale.setScalar(lerp(0.8, 1.2, r(7))); o.updateMatrix();
    bgLeaves.setMatrixAt(nb, o.matrix); bgLeaves.setColorAt(nb++, c.setScalar(lerp(0.3, 0.85, r(2))));
  }
  const spots = [], flo = [];
  for (let i = 0; i < 40; i++) {
    const r = j => rand(441, i * 5 + j), z = -lerp(0.5, 1.1, r(0)), s = -z;
    spots.push([lerp(-0.3, 0.45, r(1) ** 0.8) * s, lerp(-0.05, 0.3, r(2)) * s, z, lerp(0.012, 0.03, r(3)) * s, lerp(0.35, 0.9, r(4))]);
  }
  for (let i = 0; i < 30; i++) {
    const r = j => rand(445, i * 5 + j), z = -lerp(0.2, 0.5, r(0)), s = -z;
    flo.push([lerp(-0.35, 0.35, r(1)) * s, lerp(-0.3, 0.05, r(2)) * s, z, lerp(0.02, 0.04, r(3)) * s, lerp(0.25, 0.6, r(4))]);
  }
  const falling = driftField({ geometry: floretGeometry(0.0075, { segs: [6, 3] }), material: petal, count: 7, seed: 451, box: [-0.2, -0.15, -0.45, 0.2, 0.2, -0.06], vel: [0.004, -0.012, 0], sway: 0.01, swayHz: 0.3, spin: 0.4 });
  root.add(bgLeaves, bokeh(time, spots, 443, { soft: 0.3, twinkle: 0.25 }), bokeh(time, flo, 447, { soft: 0.5, twinkle: 0.1, colors: ['#e07a10', '#f0a020'] }), falling.mesh);
  const dew = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), dewMaterial(hz, { below: '#2e2a12', above: '#f0b040' }));
  root.add(dew);
  const drop = (R, tau = -1) => {
    if (tau > 0) { const sy = stretch(tau), w = R * Math.sqrt(1.4 / sy); dew.scale.set(w, sy * R, w); dew.position.set(tip.x, tip.y - 1.2 * R - fallen(tau), tip.z); }
    else { const sy = 1.2 + 0.2 * ss(-0.3, 0, tau); dew.scale.set(R, sy * R, R); dew.position.set(tip.x, tip.y + 0.2 * R - sy * R, tip.z); }   // 顶端在瓣尖上方 0.2R：瓣尖扎进水珠一点
    dew.updateMatrix();
  };
  drop(DROP.R);
  root.updateMatrixWorld(true);
  const frame = new THREE.Box3();
  for (const o of [...subject, dew]) frame.expandByObject(o, true);
  const cx = lerp((frame.min.x + frame.max.x) / 2, tip.x, 0.5), hw = 0.37 * (frame.max.y - frame.min.y);   // 竖长一点（宽 = 0.74 高）：16:9 里整簇在右边、左下的字让开；两边伸出去的花出画
  frame.min.x = cx - hw; frame.max.x = cx + hw;
  frame.min.z = frame.max.z = tip.z;                                    // 压成露珠所在的一个平面
  root.position.set(...MACRO_AT); root.rotation.y = MACRO_YAW; root.updateMatrixWorld(true);
  frame.applyMatrix4(root.matrixWorld);
  const dir = (yaw, pitch) => { const Y = (yaw * Math.PI) / 180, P = (pitch * Math.PI) / 180; return V3(Math.sin(Y) * Math.cos(P), Math.sin(P), Math.cos(Y) * Math.cos(P)).applyQuaternion(root.quaternion).toArray(); };
  return { root, frame, dir, drop, update: falling.update };
}

export async function build(ctx) {
  const { scene } = ctx, hz = haze(SKY), time = { value: 0 };
  scene.background = new THREE.Color(SKY.horizon);
  scene.add(sky(hz));
  for (const L of LINES) { const m = new THREE.Mesh(lineGeometry(L), lineMaterial(hz, L)); m.frustumCulled = false; scene.add(m); }
  const ground = new THREE.Mesh(new THREE.CircleGeometry(14, 48), new THREE.MeshStandardMaterial({ color: '#1a170f', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.75;
  const petal = petalMaterial(), leafM = leafMaterial(veinTexture(), '#2b4722');
  scene.add(ground, table(), fallenFlorets(petal), crown(), branch(petal, leafM), sceneBokeh(time));

  const key = new THREE.DirectionalLight(KEY.color, KEY.intensity);
  key.position.copy(SUN).multiplyScalar(1.5); key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -0.5, right: 0.5, top: 0.5, bottom: -0.5, near: 0.1, far: 3 });
  key.shadow.camera.updateProjectionMatrix(); key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 4;
  scene.add(key, key.target);

  // 飘落的花：瓶子身后、枝下面，慢慢往下、往右飘，边落边翻
  const florets = driftField({ geometry: floretGeometry(0.008, { segs: [6, 3] }), material: petal, count: 40, seed: 303, box: [-0.9, 0.0, -1.6, 0.9, 0.8, -0.14], vel: [0.03, -0.05, 0.012], sway: 0.05, swayHz: 0.35, size: [0.8, 1.25], spin: 0.9 });
  scene.add(florets.mesh);

  const cluster = macroCluster(hz, time); scene.add(cluster.root);

  return {
    haze: hz,
    env: {
      base: null, strip: '#ffe4c0', k: 4,
      // 天空；地平线上一圈暗的树篱和树影、左后方一团树冠（玻璃的棱和台面在低处映出来的是它们，不是一整片亮天）；身前一块暖色的反光板
      fill: (add, B, es) => {
        es.add(sky(hz, { R: 15 }));
        const band = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 6.6, 64, 1, true), B('#1d1c10')); band.position.y = -2.8; es.add(band);
        const tree = new THREE.Mesh(new THREE.SphereGeometry(4.5, 32, 16), B('#141a0e')); tree.position.set(-7, 2.1, -9.7); es.add(tree);
        add(10, 4, [0, 1.5, 12], B('#7a5638', 0.8));
      },
    },
    post: { exposure: 1.0, aperture: 0.7, maxBlur: 0.018, bloom: { strength: 0.35, threshold: 0.8 }, saturation: 1.05, lift: [0.012, 0.007, 0.002], gamma: [1, 0.97, 0.93], gain: [1.03, 1, 0.95], vignette: 0.3, grain: 0.03 },
    macro: {
      root: cluster.root,
      // 慢慢绕到花簇左边、同时推近：露珠里的高光和身后的光斑跟着走
      camera: s => ({ type: 'fit', box: cluster.frame, dir: cluster.dir(lerp(-10, 6, easeInOut(s.u)), 0), fov: 28, scale: lerp(1, 1.1, easeInOut(s.u)) }),
      post: { aperture: 1.2, maxBlur: 0.03, exposure: 0.72, gamma: [1, 0.98, 0.9], saturation: 1.35 },
    },
    update(ctx, s) {
      hz.uniforms.hTime.value = s.t; time.value = s.t;
      florets.update(s.t); cluster.update(s.t);
      const rel = s.dur - DROP.pre;                                       // 特写最后 DROP.pre 秒露珠松开：硬切到 drop，瓶里的水滴接着落
      if (s.name === 'macro') cluster.drop(lerp(0.0014, DROP.R, ss(0, rel - 0.3, s.lt)), s.lt - rel);   // 先慢慢长大
    },
    reset() { cluster.drop(DROP.R); },
  };
}
