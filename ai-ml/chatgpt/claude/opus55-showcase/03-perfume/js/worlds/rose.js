// rose.js — 玫瑰 · 暗红丝绒：瓶子立在一块铺开的丝绒上，丝绒往后堆起、顺着弧面升成一道垂着褶的幕；一盏硬光从左前上方打下来，
// 只照亮瓶子周围一圈（光圈外沉进暗红里），几片花瓣慢慢飘落穿过光里。特写是一朵玫瑰外层的一片花瓣：瓣缘外翻卷下，瓣尖挂着一颗渐渐长大的露珠
import * as THREE from 'three';
import { haze, dewMaterial, driftField, NOISE } from './common.js';
import { DROP, fallen, stretch } from '../drop.js';
import { rand } from '../../../factory/engine/rng.js';
import { lerp, ss, clamp, easeInOut } from '../../../factory/engine/ease.js';

const KEY = { dir: new THREE.Vector3(-0.6, 0.66, 0.45).normalize(), color: '#fff0e2', intensity: 4.2 };   // 指向主光：左前上方，仰角约 41°
// 主光的光圈：顶点在瓶子上方沿主光方向 D 米处的一个锥，内角以内全亮（地上半径约 12 厘米）、外角以外只剩一点溢光（spill，慢慢暗到 40°，照着身后的幕）
const SPOT = { at: [0, 0.07, 0], D: 2.2, inner: 3, outer: 7.5, spill: 0.12 };
const SKY = { zenith: '#1a080c', horizon: '#8a2c3a', mist: '#4a1a22', sun: { dir: KEY.dir.toArray(), color: '#ffe6d0', glow: 0.5, rays: 0 } };

// ── 一维、二维值噪声（只由 seed 决定）──
const n1 = (seed, x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(rand(seed, i), rand(seed, i + 1), u); };
const n2 = (seed, x, y) => {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v), g = (p, q) => rand(seed, (p + 4096) * 8192 + q + 4096);
  return lerp(lerp(g(i, j), g(i + 1, j), a), lerp(g(i, j + 1), g(i + 1, j + 1), a), b);
};

// ── 光圈：给 MeshStandard / MeshPhysical 材质打补丁，直射光（场景里只有主光一盏）乘上光圈的遮罩 ──
const SPOT_U = {
  uSpotAt: { value: new THREE.Vector3(...SPOT.at) }, uSpotDir: { value: KEY.dir },
  uSpot: { value: new THREE.Vector4(SPOT.D, Math.cos((SPOT.outer * Math.PI) / 180), Math.cos((SPOT.inner * Math.PI) / 180), SPOT.spill) },
};
const SPOT_GLSL = /* glsl */`
uniform vec3 uSpotAt, uSpotDir; uniform vec4 uSpot; varying vec3 vRoseW;
float spotPool(vec3 w) {
  float c = dot(normalize(w - uSpotAt - uSpotDir * uSpot.x), -uSpotDir);
  return mix(uSpot.w * smoothstep(0.766, 0.99, c), 1.0, smoothstep(uSpot.y, uSpot.z, c));
}`;
function spotted(m, key, extra = sh => sh) {
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, SPOT_U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRoseW;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
  vec4 roseW = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    roseW = instanceMatrix * roseW;
  #endif
  vRoseW = (modelMatrix * roseW).xyz;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n${SPOT_GLSL}\n${NOISE}`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
  float pool = spotPool(vRoseW);
  reflectedLight.directDiffuse *= pool; reflectedLight.directSpecular *= pool;
  #ifdef USE_SHEEN
    sheenSpecularDirect *= pool;
  #endif`);
    extra(sh);
  };
  m.customProgramCacheKey = () => `rose-${key}`;
  return m;
}

// ── 丝绒：一整张布，前面平铺在地上，往后顺着弧面立成一道幕 ──
// 沿布的弧长 s：地面从 z = front 到 back，再绕半径 R 的弧，再竖直升到 top。瓶子周围 clear[0] 米以内严格平（y = 0，焦散落在这里），clear[1] 米外褶子全出来
const DRAPE = { half: 2.4, front: 1.4, back: -0.42, R: 0.35, top: 2.2, clear: [0.17, 0.45], NX: 480, NS: 420 };
const FLOOR = DRAPE.front - DRAPE.back, ARC = (Math.PI / 2) * DRAPE.R, LEN = FLOOR + ARC + DRAPE.top;
// 幕上的褶：一条条竖着的圆脊（高斯截面），平均间距 10 厘米，宽、高、位置各不相同
const FOLD = { gap: 0.1, n: 64 };
const FOLDS = Array.from({ length: FOLD.n }, (_, k) => {
  const r = j => rand(301, k * 4 + j);
  return { x: (k - FOLD.n / 2 + 0.8 * (r(0) - 0.5)) * FOLD.gap, w: lerp(0.022, 0.05, r(1)), a: lerp(0.35, 1, r(2)) };
});
const MEAN = FOLDS.reduce((s, f) => s + f.a * f.w, 0) * Math.sqrt(Math.PI) / (FOLD.n * FOLD.gap);
function folds(x) {
  const k0 = Math.round(x / FOLD.gap + FOLD.n / 2);
  let s = 0;
  for (let k = Math.max(0, k0 - 4); k <= Math.min(FOLD.n - 1, k0 + 4); k++) { const f = FOLDS[k], d = (x - f.x) / f.w; s += f.a * Math.exp(-d * d); }
  return s - MEAN;
}
/** 布上 (x, s) 这一点：未起褶的位置、法线（朝向凹的一面：地上朝上，幕上朝 +z），离墙根（弧的起点）往前 q 米、往上 h 米 */
function sweepAt(x, s) {
  const { back, R } = DRAPE;
  if (s <= FLOOR) return { p: [x, 0, DRAPE.front - s], n: [0, 1, 0], q: FLOOR - s, h: 0 };
  if (s <= FLOOR + ARC) { const a = (s - FLOOR) / R; return { p: [x, R * (1 - Math.cos(a)), back - R * Math.sin(a)], n: [0, Math.cos(a), Math.sin(a)], q: 0, h: s - FLOOR }; }
  return { p: [x, R + s - FLOOR - ARC, back - R], n: [0, 0, 1], q: 0, h: s - FLOOR };
}
/**
 * 起褶的量（沿法线，米）。幕上：竖褶越往上越收拢、左右慢慢摆；落到地上的一段褶往前摊开、渐渐变浅，
 * 再叠几道大的斜褶和缓缓的起伏（布铺开时堆出来的），都乘上瓶子周围的"清空"遮罩
 */
function drapeOffset(x, s) {
  const { q, h, p } = sweepAt(x, s), [c0, c1] = DRAPE.clear;
  const clear = ss(c0, c1, Math.hypot(p[0], p[2] * 1.15));
  const lean = 0.03 * Math.sin(h * 2.1 + x * 0.7) + 0.05 * (2 * n1(311, x * 1.5 + h * 0.4) - 1);
  const xw = (x + lean) * (1 + 0.14 * h) / (1 + 1.3 * q);
  const hang = folds(xw) * lerp(0.035, 0.06, ss(0, 0.6, h)) * Math.exp(-q / 0.28);
  const swell = 0.014 * (2 * n2(313, x * 2.2, (DRAPE.front - p[2]) * 2.2) - 1) + 0.008 * (2 * n2(317, x * 5, p[2] * 5) - 1);
  return (hang + swell * (q > 0 ? 1 : 0.4)) * clear;
}
function drapeGeometry() {
  const { NX, NS, half } = DRAPE, pos = new Float32Array((NX + 1) * (NS + 1) * 3), idx = [];
  for (let j = 0; j <= NS; j++) {
    const s = LEN * (j / NS);
    for (let i = 0; i <= NX; i++) {
      const x = lerp(-half, half, i / NX), { p, n } = sweepAt(x, s), d = drapeOffset(x, s), o = 3 * (j * (NX + 1) + i);
      pos[o] = p[0]; pos[o + 1] = p[1] + n[1] * d; pos[o + 2] = p[2] + n[2] * d;
    }
  }
  for (let j = 0; j < NS; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + NX + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/**
 * 丝绒的材质：很暗的酒红底色 + 红色的丝绒光（sheen，掠射时亮）。颜色、丝绒光按世界坐标一块块深浅不一（压花丝绒），
 * 颜色的平均值就是 color 本身（焦散读 color / roughness，见 glass.js）
 */
function velvetMaterial() {
  const m = new THREE.MeshPhysicalMaterial({ color: '#3d0812', roughness: 0.95, metalness: 0, sheen: 1, sheenColor: '#6a0c1a', sheenRoughness: 0.42, envMapIntensity: 0.08 });
  return spotted(m, 'velvet', sh => {
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
  vec2 vp = vec2(vRoseW.x, vRoseW.z + vRoseW.y);                             // 地上按 xz、幕上按 xy
  float crush = fbm(vp * 6.0 + 3.1) - 0.47, pile = mix(vnoise(vp * 90.0) - 0.5, 0.0, clamp(fwidth(vp.x) * 60.0, 0.0, 1.0));
  diffuseColor.rgb *= 1.0 + 0.3 * crush + 0.12 * pile;`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
  material.sheenColor *= 1.0 + 0.9 * crush;`);
  });
}

// ── 花瓣 ──
/**
 * 一片玫瑰花瓣：从瓣基（原点）沿 +x 展开成一把扇子（半角 spread 弧度），瓣缘是圆的（两侧收到瓣长的 1/4），内面朝 +y。每条射线在自己的竖直面里弯：
 * 瓣基往上抬 lift（弧度），往外渐平，最后 1 − t0 这一段瓣缘外翻卷下，瓣尖的角度是 −roll；cup 两侧抬起（内卷），ruffle 瓣缘起伏（占瓣长）。
 * uv.x 从瓣基到瓣缘（0–1），uv.y 横跨瓣宽（中线 0.5）。tip 是中线上的瓣尖（露珠挂在这里）
 */
export function petalGeometry(len, { spread = 0.62, cup = 0.4, lift = 0.7, roll = 1.2, t0 = 0.72, ruffle = 0.04, seed = 1, segs = [48, 40] } = {}) {
  const [NT, NA] = segs, pos = [], uv = [], idx = [];
  for (let j = 0; j <= NA; j++) {
    const v = (j / NA) * 2 - 1, th = v * spread, R = len * (0.25 + 0.75 * Math.sqrt(1 - v * v)) * (1 + ruffle * (2 * n1(seed, v * 3 + 7) - 1));
    let rho = 0, y = 0;
    for (let i = 0; i <= NT; i++) {
      const t = i / NT;
      if (i) { const tm = (i - 0.5) / NT, phi = lift * (1 - tm) ** 1.6 - roll * ss(t0, 1, tm) ** 1.2; rho += (Math.cos(phi) * R) / NT; y += (Math.sin(phi) * R) / NT; }
      const b = rho * Math.sin(th), wave = ruffle * len * ss(0.7, 1, t) * (2 * n1(seed + 1, v * 4.5) - 1);
      pos.push(rho * Math.cos(th), y + (cup * b * b / len) * (1 - 0.8 * ss(t0, 1, t)) + wave, b); uv.push(t, (v + 1) / 2);
    }
  }
  for (let j = 0; j < NA; j++) for (let i = 0; i < NT; i++) { const a = j * (NT + 1) + i, c = a + NT + 1; idx.push(a, c, a + 1, a + 1, c, c + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  const o = 3 * ((NA / 2) * (NT + 1) + NT);
  g.userData.tip = new THREE.Vector3(pos[o], pos[o + 1], pos[o + 2]);
  return g;
}
/** 花瓣的纹理（uv 同 petalGeometry）：从瓣基放射出去的细脉，瓣基淡、瓣缘深一点，瓣面有一点斑驳。平均亮度约 0.85 */
function petalTexture(W = 256, H = 256) {
  const px = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const t = (i + 0.5) / W, v = (j + 0.5) / H, q = v * 46 + 0.8 * n2(401, t * 6, v * 8), f = q - Math.round(q);
    const vein = Math.exp(-((f / 0.12) ** 2)) * ss(0.05, 0.3, t) * ss(1, 0.85, t);
    const val = 0.86 - 0.08 * vein + 0.06 * (n2(403, t * 30, v * 30) - 0.5) - 0.12 * ss(0.8, 1, t) + 0.14 * ss(0.15, 0, t), p = 4 * (j * W + i);
    px[p] = px[p + 1] = px[p + 2] = Math.round(255 * clamp(val)); px[p + 3] = 255;
  }
  const tex = new THREE.DataTexture(px, W, H);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}
/**
 * 花瓣的材质：绒面（sheen）+ 细脉贴图。逆光时花瓣透光：lights 之后给 directDiffuse 加上从背面穿过来的主光（深红，脉处更亮）。
 * spot = true：地上和飘着的花瓣也乘主光的光圈（光圈外只剩溢光）
 */
function petalMaterial(tex, { color = '#8c1024', sheen = '#8a1a2a', trans = 0.6, spot = false, key = 'petal' } = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color, map: tex, bumpMap: tex, bumpScale: 0.6, roughness: 0.6, specularIntensity: 0, sheen: 0.4, sheenColor: sheen, sheenRoughness: 0.5, envMapIntensity: 0.1, side: THREE.DoubleSide });
  const U = { uTrans: { value: new THREE.Color('#8a0a1e').multiplyScalar(trans) }, uSun: { value: new THREE.Color(KEY.color).multiplyScalar(KEY.intensity) }, uSunDir: { value: KEY.dir } };
  const through = sh => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uTrans, uSun, uSunDir;')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
  float vein = 1.0 - texture2D(map, vMapUv).r;
  reflectedLight.directDiffuse += uTrans * uSun * smoothstep(-0.1, 1.0, dot(-normal, normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz))) * (0.7 + 1.2 * vein);`);
  };
  if (spot) return spotted(m, key, through);
  m.onBeforeCompile = through; m.customProgramCacheKey = () => `rose-${key}`;
  return m;
}
/** 地上散落的几片花瓣：平躺，瓣缘微微翘起。都在瓶子周围 8 厘米外（瓶底的焦散、射线都碰不到），不挡字 */
function strewn(tex) {
  const g = new THREE.Group(), mat = petalMaterial(tex, { color: '#7a0c1e', trans: 0.25, spot: true, key: 'strewn' });
  for (const [x, z, yaw, len, s] of [[0.12, -0.07, 2.2, 0.036, 3], [-0.15, -0.12, 0.4, 0.04, 5], [0.24, 0.05, -1.1, 0.032, 7], [-0.05, -0.2, 1.3, 0.034, 9]]) {
    const m = new THREE.Mesh(petalGeometry(len, { lift: 0.08, roll: -0.35, t0: 0.6, cup: 0.25, seed: s, segs: [24, 20] }), mat);
    m.position.set(x, 0.0008, z); m.rotation.y = yaw; m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

// ── 特写：一朵玫瑰外层的一片花瓣 ──
// 放在丝绒左边外 3 米（离开所有瓶子镜头的视野和主光的阴影盒）。在花自己的坐标里设计：x 向右、y 向上、+z 朝相机；
// 整朵绕 y 转 90°，相机就朝 −x 看，主光在左后上方——逆光，花瓣透出深红，瓣缘亮成一线，露珠里一个亮点
const MACRO_AT = [-3, 0.12, 0];
const FRAME = [0.024, 0.018, 0.012];

/**
 * 玫瑰：十几片花瓣按 137.5° 螺旋绕着花心，里层小而竖、抱成一团，外层大而开；最外朝相机的一片（主瓣）瓣缘外翻卷下，瓣尖挂露珠。
 * 后面一小块丝绒（远在焦外，只是暗红的底）。返回 root、frame（取景盒，压成露珠所在深度的一个平面）、dir(yaw, pitch)、drop(R, tau)（同 whitetea）
 */
function macroRose(hz) {
  const root = new THREE.Group(), tex = petalTexture();
  const front = petalMaterial(tex, { color: '#6e0818', trans: 0.5, key: 'macro' }), inner = petalMaterial(tex, { color: '#4a0610', trans: 0.45, key: 'macro' });
  const head = new THREE.Group(); head.position.set(-0.004, -0.004, -0.03); head.rotation.x = 0.55; root.add(head);   // 花心朝上偏向相机
  const N = 15;
  for (let k = 0; k < N; k++) {
    const r = j => rand(421, k * 4 + j), f = k / (N - 1), az = k * 2.39996 + 0.9;
    if (f > 0.75 && Math.cos(az - Math.PI / 2) > 0.6) continue;            // 外层正对相机的位置留给主瓣
    const geo = petalGeometry(lerp(0.016, 0.04, f), { spread: lerp(0.9, 0.62, f), cup: lerp(1.6, 0.4, f), lift: lerp(1.45, 0.9, f), roll: lerp(0.2, 1.0, f), seed: 11 + k, segs: [28, 24] });
    const m = new THREE.Mesh(geo, inner);
    m.position.set(Math.cos(az) * 0.002 * f, lerp(0.004, 0, f), -Math.sin(az) * 0.002 * f);
    m.rotation.set(0, az, lerp(-0.1, 0.1, r(0)), 'YZX'); head.add(m);
  }
  const petalGeo = petalGeometry(0.044, { spread: 0.66, cup: 0.35, lift: 0.95, roll: 1.55, t0: 0.66, ruffle: 0.05, seed: 7, segs: [96, 80] });
  const petal = new THREE.Mesh(petalGeo, front);
  petal.rotation.set(0, -Math.PI / 2 + 0.3, 0, 'YZX'); head.add(petal);    // 朝相机、偏右一点
  // 后面：露珠后 30 厘米一片暗红的光，从主光那一侧（左上）漫过来，远在焦外
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), glowCard()); glow.position.set(-0.07, 0.02, -0.3); root.add(glow);
  const dew = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), dewMaterial(hz, { below: '#3a0610', above: '#c42038' }));
  root.add(dew);
  root.updateMatrixWorld(true);
  const tip = petalGeo.userData.tip.clone().applyMatrix4(petal.matrixWorld);   // 瓣尖（花的坐标；root 还在原点）
  const drop = (R, tau = -1) => {
    if (tau > 0) { const sy = stretch(tau), w = R * Math.sqrt(1.4 / sy); dew.scale.set(w, sy * R, w); dew.position.set(tip.x, tip.y - 1.2 * R - fallen(tau), tip.z); }
    else { const sy = 1.2 + 0.2 * ss(-0.3, 0, tau); dew.scale.set(R, sy * R, R); dew.position.set(tip.x, tip.y + 0.2 * R - sy * R, tip.z); }   // 顶端在瓣尖上方 0.2R：瓣尖扎进水珠一点
    dew.updateMatrix();
  };
  drop(0.003);
  // 取景盒：瓣尖周围竖着的一块（宽 FRAME[0]、瓣尖以上 FRAME[1]、以下 FRAME[2]），压成露珠所在的一个平面
  const frame = new THREE.Box3(new THREE.Vector3(tip.x - FRAME[0] / 2, tip.y - FRAME[2], tip.z), new THREE.Vector3(tip.x + FRAME[0] / 2, tip.y + FRAME[1], tip.z));
  root.position.set(...MACRO_AT); root.rotation.y = Math.PI / 2; root.updateMatrixWorld(true);
  frame.applyMatrix4(root.matrixWorld);
  const dir = (yaw, pitch) => { const Y = yaw * Math.PI / 180, P = pitch * Math.PI / 180; return new THREE.Vector3(Math.sin(Y) * Math.cos(P), Math.sin(P), Math.cos(Y) * Math.cos(P)).applyQuaternion(root.quaternion).toArray(); };
  return { root, frame, dir, drop };
}
/** 特写后面那片光：中心亮、往外平滑地暗下去的圆（不受光照，只是一块发光的底） */
function glowCard(W = 64) {
  const px = new Uint8Array(W * W * 4);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
    const r = 2 * Math.hypot((i + 0.5) / W - 0.5, (j + 0.5) / W - 0.5), p = 4 * (j * W + i);
    px[p] = px[p + 1] = px[p + 2] = Math.round(255 * (1 - ss(0, 1, r)) ** 2); px[p + 3] = 255;
  }
  const map = new THREE.DataTexture(px, W, W); map.magFilter = THREE.LinearFilter; map.needsUpdate = true;
  return new THREE.MeshBasicMaterial({ color: '#6a0c18', map, depthWrite: true });
}

export async function build(ctx) {
  const { scene } = ctx, hz = haze(SKY);
  scene.background = new THREE.Color('#060203');
  const drape = new THREE.Mesh(drapeGeometry(), velvetMaterial());
  drape.receiveShadow = true; drape.frustumCulled = false;
  const tex = petalTexture();
  scene.add(drape, strewn(tex));

  const key = new THREE.DirectionalLight(KEY.color, KEY.intensity);
  key.position.copy(KEY.dir).multiplyScalar(1.5); key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -0.5, right: 0.5, top: 0.5, bottom: -0.5, near: 0.1, far: 3 });
  key.shadow.camera.updateProjectionMatrix(); key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 1.5;   // 硬光：阴影边缘利
  scene.add(key, key.target);

  // 飘落的花瓣：瓶子后面、幕前面，慢慢往右下飘，翻转着穿过光圈
  const fall = petalGeometry(0.032, { lift: 0.4, roll: 0.5, cup: 0.5, seed: 21, segs: [16, 12] }); fall.translate(-0.016, 0, 0);
  const petals = driftField({ geometry: fall, material: petalMaterial(tex, { color: '#8c1024', trans: 0.5, spot: true, key: 'falling' }),
    count: 14, seed: 404, box: [-0.9, -0.02, -0.75, 0.9, 0.7, -0.2], vel: [0.03, -0.05, 0.01], sway: 0.05, swayHz: 0.2, size: [0.8, 1.2], spin: 0.35 });
  scene.add(petals.mesh);

  const rose = macroRose(hz); scene.add(rose.root);

  return {
    haze: hz,
    env: {
      base: '#0b0406',
      fill(add, B) {
        add(3, 3, KEY.dir.clone().multiplyScalar(12).toArray(), B(KEY.color, 3));   // 主光在玻璃、瓶盖上的倒影
        add(18, 5, [0, 1, -12], B('#3a0c14', 0.8));                                   // 身后的暗红幕
        add(24, 24, [0, -8, 0], B('#2a080e', 0.6));                                   // 地上的丝绒
      },
    },
    post: { exposure: 1.05, aperture: 0.3, bloom: { strength: 0.35, threshold: 0.8 }, saturation: 1.2, lift: [0.008, 0.002, 0.004], vignette: 0.32, grain: 0.03 },
    macro: {
      root: rose.root,
      camera: s => ({ type: 'fit', box: rose.frame, dir: rose.dir(lerp(-10, 6, easeInOut(s.u)), lerp(0, 7, easeInOut(s.u))), fov: 28, scale: lerp(1, 1.12, easeInOut(s.u)) }),
      post: { aperture: 2.5, maxBlur: 0.035, exposure: 1.1, gamma: [0.92, 0.96, 0.96], saturation: 1.3 },
    },
    update(ctx, s) {
      petals.update(s.t);
      const rel = s.dur - DROP.pre;                                       // 特写最后 DROP.pre 秒露珠松开：硬切到 drop，瓶里的水滴接着落
      if (s.name === 'macro') rose.drop(lerp(0.0016, 0.003, ss(0, rel - 0.3, s.lt)), s.lt - rel);
    },
    reset() { rose.drop(0.003); },
  };
}
