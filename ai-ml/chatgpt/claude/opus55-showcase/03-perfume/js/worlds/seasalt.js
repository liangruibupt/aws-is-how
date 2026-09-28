// seasalt.js — 海盐 · 海边的光：瓶子立在海边一块被水磨圆的白石上。石头后沿缓缓没进清浅的海水，水底的白石上焦散晃动，
// 水线上一道细碎的白沫；再往后几块白礁石，远处是雾蒙蒙的海平线。太阳在左后方，细浪上闪着碎光，空中飘着浪花的水星和几粒盐晶。
// 特写是湿石沿上的一簇盐晶：一颗漏斗状（hopper）的立方晶体探出石沿，最低的一角挂着一颗渐渐长大的水珠
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { haze, sky, dewMaterial, driftField, billboards, NOISE } from './common.js';
import { DROP, fallen, stretch } from '../drop.js';
import { rand } from '../../../factory/engine/rng.js';
import { lerp, ss, easeInOut } from '../../../factory/engine/ease.js';

const SUN = new THREE.Vector3(-0.53, 0.375, -0.76).normalize();          // 指向太阳：左后方（偏离镜头方向约 35°），仰角约 22°
const SKY = { zenith: '#5a9ecb', horizon: '#c8e0ea', mist: '#b8d5dc', sun: { dir: SUN.toArray(), color: '#fff3e0', glow: 0.8, rays: 0 } };
const KEY = { color: '#fff4e4', intensity: 3 };
const f7 = x => x.toPrecision(7);                                        // JS 的数 → GLSL 的浮点字面量
const lin = hex => new THREE.Color(hex);                                 // 颜色进着色器前已是线性值（three 的色彩管理）

/** 二维值噪声（摆放盐粒、水珠，特写石面的起伏用；只由 seed 决定）*/
const n2 = (seed, x, y) => {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v), g = (p, q) => rand(seed, (p + 4096) * 8192 + q + 4096);
  return lerp(lerp(g(i, j), g(i + 1, j), a), lerp(g(i, j + 1), g(i + 1, j + 1), a), b);
};
/** 三维值噪声（礁石的起伏）*/
const n3 = (seed, x, y, z) => {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), f = t => t * t * (3 - 2 * t), a = f(x - i), b = f(y - j), c = f(z - k);
  const g = (p, q, r) => rand(seed, ((p + 512) * 1024 + q + 512) * 1024 + r + 512);
  const L = (q, r) => lerp(g(i, q, r), g(i + 1, q, r), a);
  return lerp(lerp(L(j, k), L(j + 1, k), b), lerp(L(j, k + 1), L(j + 1, k + 1), b), c);
};

// ── 白石与海 ──
// 石头顶面平（y = 0，焦散落在这里）；后沿在 z = zb(x) 之前 ROCK.w 米开始缓缓圆下去，没进水里（水线处坡度约 0.13，比镜头看过去的视线缓，
// 所以看得见水线）。同一个 rockY 在 JS（石头的网格）和 GLSL（海底：水里看到的石头、水深、水线的白沫）里各写一遍，水里水外接得上
const SEA = { y: -0.01, lap: [0.0015, 0.0008] };                         // 平均水面（比石顶低 1 厘米）、两道缓慢涨落的幅度（米）
const ROCK = { w: 0.24, a: 0.02, c: 0.6, color: '#e2dccf' };            // 圆下去的宽度、到后沿时低下去多少、水下变陡的快慢
const zb = x => -0.35 + 0.035 * Math.sin(4.1 * x + 0.6) + 0.018 * Math.sin(9.7 * x + 2.1) + 0.008 * Math.sin(23 * x + 0.3);
function rockY(x, z) {
  const e = z - zb(x), t = 1 - e / ROCK.w;
  const y = e >= ROCK.w ? 0 : e >= 0 ? -ROCK.a * t * t : -ROCK.a + ((2 * ROCK.a) / ROCK.w) * e - ROCK.c * e * e;
  return y - 0.3 * ss(1.2, 1.7, Math.abs(x)) - 0.3 * ss(1.2, 1.6, z);   // 左右两端、身后（镜头背后）也没进水里
}
const ROCK_GLSL = /* glsl */`
float zb(float x) { return -0.35 + 0.035 * sin(4.1 * x + 0.6) + 0.018 * sin(9.7 * x + 2.1) + 0.008 * sin(23.0 * x + 0.3); }
float rockY(vec2 p) {
  float e = p.y - zb(p.x), t = 1.0 - e / ${f7(ROCK.w)};
  float y = e >= ${f7(ROCK.w)} ? 0.0 : e >= 0.0 ? -${f7(ROCK.a)} * t * t : -${f7(ROCK.a)} + ${f7((2 * ROCK.a) / ROCK.w)} * e - ${f7(ROCK.c)} * e * e;
  return y - 0.3 * smoothstep(1.2, 1.7, abs(p.x)) - 0.3 * smoothstep(1.2, 1.6, p.y);
}`;
/** t 秒的水面高度：两道慢慢的涨落（5.5 秒、2.3 秒一个来回），水线在缓坡上跟着前后移一两厘米 */
const level = t => SEA.y + SEA.lap[0] * Math.sin((2 * Math.PI * t) / 5.5) + SEA.lap[1] * Math.sin((2 * Math.PI * t) / 2.3 + 1);

/** 石头：按 (x, 离后沿的距离 e) 排的网格，圆下去和水线那一段 3 毫米一行；最外一圈都在水下，被海面盖住 */
function rockGeometry() {
  const X = [], E = [], pos = [], idx = [];
  for (let i = 0; i <= 600; i++) X.push(lerp(-1.8, 1.8, i / 600));
  for (const [a, b, n] of [[-0.45, -0.1, 14], [-0.1, 0.3, 134], [0.3, 2, 40]]) for (let j = E.length ? 1 : 0; j <= n; j++) E.push(lerp(a, b, j / n));
  for (const e of E) for (const x of X) { const z = zb(x) + e; pos.push(x, rockY(x, z), z); }
  const nx = X.length;
  for (let j = 0; j < E.length - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + nx; idx.push(a, b, a + 1, a + 1, b, b + 1); }   // 逆时针朝上
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/** 高光封顶：很光的小东西迎着太阳，高光能亮到几百；景深按固定的 32 个点采样（post.js），这种亮点虚掉以后散成一簇一簇的小点。
 *  进 tone map 之前把光照封在 HOT 以内：清楚的地方照样是白的高光，虚掉的只剩一片淡淡的光斑 */
const HOT = 4;
function capped(m, key) {
  const pre = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    pre.call(m, sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `outgoingLight = min(outgoingLight, vec3(${f7(HOT)}));\n#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => `seasalt-${key}`;
  return m;
}
/**
 * 石头的材质：颜色和粗糙度按世界坐标上下缓慢变化——大块的深浅、细砂粒、零星的小蚀孔、发白的盐霜，平均值就是 color / roughness 本身
 * （焦散读的正是这两个值，glass.js）；法线按一个细小的高度场扰动。离水面一厘米多以内是湿的：更暗、很光，跟着水面涨落
 */
function rockMaterial(U) {
  const m = new THREE.MeshStandardMaterial({ color: ROCK.color, roughness: 0.62, metalness: 0 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uLevel = U.uLevel;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRock;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvRock = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vRock; uniform float uLevel;
${NOISE}
${ROCK_GLSL}
float pore(vec2 p) { return smoothstep(0.86, 0.93, vnoise(p * 600.0 + 7.0)); }
float bumpH(vec2 p) { return 0.0009 * fbm(p * 22.0) + 0.0011 * vnoise(p * 40.0) + 0.00012 * vnoise(p * 210.0) - 0.00015 * pore(p); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  vec2 rp = vRock.xz; float far = clamp(fwidth(rp.x) * 250.0, 0.0, 1.0), pf = clamp(fwidth(rp.x) * 1500.0 - 0.5, 0.0, 1.0);   // 远了细节淡成平均
  float mottle = fbm(rp * 2.3 + 3.1) - 0.47, grain = mix(vnoise(rp * 260.0) - 0.5, 0.0, far), holes = pore(rp) * (1.0 - pf);   // 细小的蚀孔
  float warm = fbm(rp * 1.1 - 5.0) - 0.47;                                                       // 大片的偏暖、偏冷
  float crust = smoothstep(0.5, 0.7, fbm(rp * 7.0 + 11.0));                                     // 盐霜：更白、更糙
  float fine = fbm(rp * 14.0 - 2.0) - 0.47, e = rp.y - zb(rp.x);                                // 浪花溅湿的：只在后沿几厘米以内
  float wet = max(smoothstep(uLevel + 0.013, uLevel + 0.002, vRock.y), 0.7 * smoothstep(0.58, 0.72, fbm(rp * 6.0 - 3.0)) * smoothstep(0.07, 0.01, e));
  diffuseColor.rgb *= (1.0 + 0.16 * mottle + 0.08 * fine + 0.1 * grain + 0.08 * (crust - 0.2)) * (1.0 - 0.4 * wet) * (1.0 - 0.4 * holes);
  diffuseColor.rgb *= vec3(1.0 + 0.08 * warm, 1.0 + 0.02 * warm, 1.0 - 0.06 * warm);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor = mix(roughnessFactor * (1.0 + 0.15 * mottle + 0.15 * (crust - 0.2)), 0.08, wet);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  { float h0 = bumpH(rp), e = 0.0003;
    vec2 gr = vec2(bumpH(rp + vec2(e, 0.0)) - h0, bumpH(rp + vec2(0.0, e)) - h0) / e * (1.0 - far) * (1.0 - wet);
    normal = normalize(normal - (viewMatrix * vec4(gr.x, 0.0, gr.y, 0.0)).xyz); }`);
  };
  return capped(m, 'rock');
}
/** 石面上的海水珠：扁的半球，很光（边上勾一圈天光，顶上一个太阳的高光），成团分布；避开瓶底（半径 7 厘米） */
function beads() {
  const N = 160, o = new THREE.Object3D();
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 6, 0, 2 * Math.PI, 0, Math.PI / 2), capped(new THREE.MeshStandardMaterial({ color: '#b5b0a4', roughness: 0.02, metalness: 0, envMapIntensity: 2 }), 'bead'), N);
  for (let i = 0, k = 0; i < N; k++) {
    const r = j => rand(611, k * 4 + j), x = lerp(-0.9, 0.9, r(0)), z = lerp(-0.3, 0.6, r(1));
    if (Math.hypot(x, z) < 0.07 || r(2) > ss(0.4, 0.7, n2(613, x * 6, z * 6)) + 0.4 * ss(0.14, 0.02, z - zb(x))) continue;   // 靠后沿的更多
    const R = lerp(0.0005, 0.0024, r(3) ** 2), y = rockY(x, z);
    if (y < SEA.y + 0.004) continue;
    o.position.set(x, y, z); o.scale.set(R, 0.55 * R, R); o.updateMatrix(); mesh.setMatrixAt(i++, o.matrix);
  }
  mesh.receiveShadow = true;
  return mesh;
}
/** 盐霜里析出的细盐粒：一千多粒小方块，一片一片的，靠后沿（浪花溅到、晒干的地方）更密 */
function saltGrains() {
  const N = 1400, o = new THREE.Object3D();
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#f7f7f3', roughness: 0.3, metalness: 0 }), N);
  for (let i = 0, k = 0; i < N; k++) {
    const r = j => rand(631, k * 8 + j), x = lerp(-0.8, 0.8, r(0)), z = lerp(-0.3, 0.4, r(1));
    if (Math.hypot(x, z) < 0.07 || r(2) > ss(0.5, 0.75, n2(633, x * 9, z * 9)) * (0.4 + 0.6 * ss(0.3, 0.1, z - zb(x)))) continue;
    const S = lerp(0.0003, 0.0011, r(3) ** 2), y = rockY(x, z);
    if (y < SEA.y + 0.006) continue;
    o.position.set(x, y + 0.3 * S, z); o.rotation.set(r(4) * 0.6, r(5) * 6.283, r(6) * 0.6); o.scale.setScalar(S); o.updateMatrix(); mesh.setMatrixAt(i++, o.matrix);
  }
  mesh.receiveShadow = true;
  return mesh;
}

// ── 礁石：后面几块白石头，从近到远一块比一块大；水线上下是湿的暗带和一道偏橄榄色的潮痕 ──
// [x, z, 水平半径]；竖向半径是水平的 0.45，球心在水面下 0.2 个竖向半径（水线半径约 0.95 个半径，海底的浅滩按它算）。最后两块在特写背后
const BOULDERS = [[-1.25, -2.3, 0.3], [1.6, -3.3, 0.5], [-0.3, -5.6, 0.45], [3.8, -7.5, 1], [-3.4, -7.2, 0.9], [-3.7, -1.05, 0.2], [-4.6, -2.8, 0.5]];
function boulderMaterial(U) {
  const m = new THREE.MeshStandardMaterial({ color: '#c4bdae', roughness: 0.75, metalness: 0 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uLevel = U.uLevel;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vB;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvB = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vB; uniform float uLevel;\n${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  vec2 bq = vB.xz + vB.y * vec2(0.7, -0.5);
  float h = vB.y - uLevel, wet = smoothstep(0.06, 0.006, h), tide = smoothstep(0.14, 0.05, h) * (1.0 - wet);
  diffuseColor.rgb *= (1.0 + 0.22 * (fbm(bq * 5.0) - 0.47) + 0.12 * (fbm(bq * 31.0 + 3.0) - 0.47)) * (1.0 - 0.55 * wet);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.7, 0.72, 0.58), tide);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 0.12, wet);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  { vec2 gq = vec2(fbm((bq + vec2(0.004, 0.0)) * 40.0) - fbm(bq * 40.0), fbm((bq + vec2(0.0, 0.004)) * 40.0) - fbm(bq * 40.0)) * 3.0 * (1.0 - wet);
    normal = normalize(normal - (viewMatrix * vec4(gq.x, 0.0, gq.y, 0.0)).xyz); }`);
  };
  return capped(m, 'boulder');
}
/** 一块礁石：细分的二十面体按几道随机方向的正弦起伏、再加五层三维值噪声的坑洼（闭式，只由序号决定），压扁 */
function boulder(i, [x, z, r], mat) {
  const geo = mergeVertices(new THREE.IcosahedronGeometry(1, 24).deleteAttribute('normal').deleteAttribute('uv')), p = geo.attributes.position, v = new THREE.Vector3();
  const W = [0, 1, 2, 3, 4, 5, 6].map(j => { const q = k => rand(701, i * 40 + j * 5 + k); return { u: new THREE.Vector3(q(0) - 0.5, q(1) - 0.5, q(2) - 0.5).normalize(), f: 1.7 + 2.3 * j, a: 0.14 / (1 + 0.9 * j), ph: q(3) * 6.283 }; });
  for (let k = 0; k < p.count; k++) {
    v.fromBufferAttribute(p, k);
    let s = 1; for (const w of W) s += w.a * Math.sin(w.f * v.dot(w.u) + w.ph);
    for (let o = 0, f = 2.2, a = 0.09; o < 5; o++, f *= 2.1, a *= 0.48) s += a * (n3(707 + i * 8 + o, v.x * f, v.y * f, v.z * f) - 0.5);
    p.setXYZ(k, v.x * s * r, v.y * s * r * 0.45, v.z * s * r * 0.9);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, SEA.y - 0.2 * r * 0.45, z); m.rotation.y = rand(703, i) * 6.283;
  return m;
}

// ── 海 ──
// 十二道闭式的正弦浪（长的涌浪朝岸边推，越短的方向越散），坡度的均方根约 0.075；角频率按深水色散的一半（画面里的水慢一点、稳一点）
const WAVES = Array.from({ length: 12 }, (_, i) => {
  const lam = 2.4 * 0.62 ** i, k = (2 * Math.PI) / lam, slope = i < 2 ? 0.03 : 0.045 * 0.93 ** i, th = (rand(401, i) - 0.5) * (i < 3 ? 0.8 : 2.6);
  return { d: [Math.sin(th), Math.cos(th)], k, A: slope / k, w: 0.5 * Math.sqrt(9.81 * k), ph: rand(402, i) * 2 * Math.PI };
});
/**
 * 海面：一整块平面，每个像素解析地算——细浪的法线（比两三个像素还短的浪淡掉，丢掉的坡度方差让太阳的碎光变宽）、
 * 按菲涅耳反射天色、太阳的碎光；透过水面折射到海底（岸边是石头自己接着往水下走，外面是缓缓变深的沙底，礁石周围一圈浅滩），
 * 海底受的太阳光按水面的弯曲聚拢成焦散（亮度 = 1 / 雅可比行列式，浪的二阶导解析地算），海水按深度吸收成青绿。
 * 水线（海底离水面不到一两厘米）上一道细碎的白沫。远了融进 haze
 */
function seaMaterial(hz, U, shoals) {
  const vec = (n, a) => `vec${n}[${a.length}](${a.map(x => `vec${n}(${x.map(f7).join(', ')})`).join(', ')})`;
  return new THREE.ShaderMaterial({
    uniforms: { ...hz.uniforms, ...U, uRockAlb: { value: lin(ROCK.color).multiplyScalar(0.72) }, uSandAlb: { value: lin('#d9ccad') }, uWater: { value: lin('#1b8f9c') } },
    vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
${hz.glsl}
${NOISE}
${ROCK_GLSL}
uniform float uT, uLevel; uniform vec3 uRockAlb, uSandAlb, uWater;
varying vec3 vW;
const vec4 WV[${WAVES.length}] = ${vec(4, WAVES.map(w => [...w.d, w.k, w.A]))};   // 方向 x、方向 z、波数、振幅
const vec2 WM[${WAVES.length}] = ${vec(2, WAVES.map(w => [w.w, w.ph]))};         // 角频率、相位
const vec4 SH[${shoals.length}] = ${vec(4, shoals)};                            // 浅滩：x、z、水线半径、水线处的水深
const vec3 SIG = vec3(2.0, 0.42, 0.3);                                        // 海水的吸收（每米；比真的海水重几倍：几十厘米深就泛出青绿）
void waves(vec2 p, float fp, out vec2 gr, out vec3 H, out float lost) {
  gr = vec2(0.0); H = vec3(0.0); lost = 0.0;
  for (int i = 0; i < ${WAVES.length}; i++) {
    vec4 w = WV[i]; float ph = w.z * dot(w.xy, p) - WM[i].x * uT + WM[i].y;
    float f = 1.0 - smoothstep(0.15, 0.4, fp * w.z / 6.2832), ak = w.z * w.w, s = sin(ph), c = cos(ph);
    gr += f * ak * c * w.xy;
    H -= f * ak * w.z * s * vec3(w.x * w.x, w.y * w.y, w.x * w.y);
    lost += (1.0 - f * f) * 0.5 * ak * ak;
  }
}
float bedY(vec2 p, out float rk) {
  float e = p.y - zb(p.x), sand = max(-0.25 - 0.22 * max(-e, 0.0), -2.5) + 0.06 * (fbm(p * 0.6) - 0.5), b = max(rockY(p), sand);
  for (int i = 0; i < ${shoals.length}; i++) b = max(b, ${f7(SEA.y)} - SH[i].w - 0.5 * max(length(p - SH[i].xy) - SH[i].z, 0.0));
  rk = step(sand + 0.002, b);                                                  // 1 = 白石头，0 = 沙
  return b;
}
void main() {
  vec3 V = normalize(vW - cameraPosition);
  vec2 p = vW.xz; float fp = max(length(fwidth(p)), 1e-5);
  vec2 gr; vec3 H; float lost;
  waves(p, fp, gr, H, lost);
  vec3 N = normalize(vec3(-gr.x, 1.0, -gr.y));
  // 远处看不清的细浪：朝着相机的那半边浪面反射更高处（更蓝）的天，菲涅耳也按平均的倾斜算
  float tilt = sqrt(lost + 0.0004), cv = max(dot(N, -V), 0.02), F = 0.02 + 0.98 * pow(1.0 - max(cv, 1.5 * tilt), 5.0);
  vec3 R = reflect(V, N); R.y = abs(R.y) + 1.2 * tilt; R = normalize(R);
  vec3 refl = haze(R);
  // 太阳的碎光：看得清的浪给出法线，看不清的只剩坡度方差，按高斯的坡度分布摊开
  vec3 Hv = normalize(hSunDir - V);
  float s2 = 0.0005 + lost, ch = max(dot(N, Hv), 0.05), t2 = (1.0 - ch * ch) / (ch * ch);
  float D = exp(-t2 / (2.0 * s2)) / (6.2832 * s2 * ch * ch * ch * ch), Fs = 0.02 + 0.98 * pow(1.0 - max(dot(Hv, -V), 0.0), 5.0);
  vec3 glint = min(hSun * ${f7(KEY.intensity)} * Fs * D / (4.0 * max(cv, 0.1)), vec3(${f7(HOT)}));   // 封顶：见 capped
  // 折射到海底：海底不平，按折射线走两步找落点
  vec3 T = refract(V, N, 0.75);
  float rk, d0 = uLevel - bedY(p, rk), d = max(d0, 0.0);
  vec2 q = p + T.xz * d / max(-T.y, 0.05);
  d = max(uLevel - bedY(q, rk), 0.0); q = p + T.xz * d / max(-T.y, 0.05);
  d = max(uLevel - bedY(q, rk), 0.0);
  float Lv = d / max(-T.y, 0.05);
  // 焦散：太阳光从水面 ps 折进来、落到 q；水面的弯曲把光聚拢或摊开
  vec3 Ts = refract(-hSunDir, vec3(0.0, 1.0, 0.0), 0.75);
  float Ls = d / max(-Ts.y, 0.05);
  vec2 ps = q - Ts.xz * Ls, g2; vec3 H2; float l2;
  waves(ps, fp, g2, H2, l2);
  float sc = d * 0.25 * 3.0, det = (1.0 + sc * H2.x) * (1.0 + sc * H2.y) - sc * sc * H2.z * H2.z;
  float caus = mix(1.0, clamp(1.0 / sqrt(det * det + 0.03), 0.0, 5.0), exp(-d * 0.8));
  float m = fbm(q * 5.0 + 1.3);
  vec3 alb = mix(uSandAlb * (0.85 + 0.3 * (fbm(q * 2.1) - 0.47)), uRockAlb * (1.0 + 0.35 * (m - 0.47)), rk);
  alb = mix(alb, vec3(0.05, 0.08, 0.04), smoothstep(0.6, 0.72, fbm(q * 1.4 + 7.0)) * smoothstep(0.08, 0.3, d) * 0.8);   // 深一点的地方几片海草
  vec3 Es = hSun * ${f7(KEY.intensity / Math.PI)} * max(-Ts.y, 0.0) * 0.92 * exp(-SIG * Ls) * caus;
  vec3 Ea = mix(hHorizon, hZenith, 0.6) * exp(-SIG * d * 1.3);
  vec3 under = alb * (Es + Ea) * exp(-SIG * Lv) + uWater * mix(hHorizon, hZenith, 0.5) * (1.0 - exp(-0.9 * Lv));
  vec3 col = mix(under, refl, F) + glint;
  // 水线的白沫：离石头的水线越近越密，碎成一丝一丝，跟着水慢慢晃；远了淡掉
  float lace = smoothstep(0.35, 0.7, fbm(p * 70.0 + vec2(uT * 0.05, -uT * 0.08)) + 0.2 * sin(uT * 1.3 + p.x * 9.0));
  float foam = (smoothstep(0.006, 0.0, d0) + 0.6 * smoothstep(0.02, 0.004, d0) * lace) * mix(1.0, lace, 0.6);
  col = mix(col, hSun * 0.45 + mix(hHorizon, hZenith, 0.5) * 0.9, clamp(foam, 0.0, 0.85) * (1.0 - clamp(fp * 150.0, 0.0, 1.0)));
  float fog = (1.0 - exp(-max(length(vW - cameraPosition) - 25.0, 0.0) * 0.012)) * 0.85;
  gl_FragColor = vec4(mix(col, haze(V), fog), 1.0);
}`,
  });
}

// ── 空中的浪花水星（逆光闪一下的光点）──
/** 光点的纹理：2 × 2 图集，每格同一个柔和的圆点（billboards 按实例取格） */
function dots(N = 32) {
  const px = new Uint8Array(4 * N * N * 4), S = 2 * N;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const x = (((i % N) + 0.5) / N) * 2 - 1, y = (((j % N) + 0.5) / N) * 2 - 1, p = 4 * (j * S + i);
    px[p] = px[p + 1] = px[p + 2] = 255; px[p + 3] = Math.round(255 * Math.exp(-6 * (x * x + y * y)) * (1 - ss(0.8, 1, Math.hypot(x, y))));
  }
  const tex = new THREE.DataTexture(px, S, S);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}

// ── 特写：湿石沿上的盐晶 ──
// 放在石头左端外（x = −3），离开所有瓶子镜头的视野和主光的阴影盒。在自己的坐标里设计：石沿顺着 z 走，石头在左（−x），右边是水，+z 朝相机；
// 这块石头是伸进水里的一个小尖角，盐晶长在尖角上：相机顺着石沿往尖角看，微微俯视，整组绕 y 转到相机正对太阳：逆光，盐晶透亮，
// 水珠背后是开阔的水面和太阳在水上的碎光（俯角 22°），虚成一片光斑。石沿高出水面 4.5 厘米
const MACRO_AT = [-3, SEA.y + 0.045, 0];
const MACRO_VIEW = 0;                                                    // 相机的方位（特写坐标，度）
const MACRO_YAW = Math.atan2(-SUN.x, -SUN.z) - (MACRO_VIEW * Math.PI) / 180;
const LEDGE = { k: 6, w: 0.0015, back: -0.005 };                         // 石沿圆角之外的坡度、圆角的宽（米）；尖角的后沿在 z = back
const xe = z => 0.005 * Math.sin(18 * z) + 0.003 * (1 - Math.cos(41 * z));   // 石沿的位置（x）顺着 z 弯；z = 0 处在 x = 0
/** 特写石头的顶面高度（特写坐标）：平顶上有细小的起伏，右边（石沿）和后边（尖角的后沿）都圆下去、陡陡地落进水里；前边、左边缓缓没进水里 */
function ledgeY(x, z) {
  const u = x - xe(z), rim = v => LEDGE.k * LEDGE.w * Math.log1p(Math.exp(v / LEDGE.w));
  const bump = 0.0006 * (n2(521, x * 90, z * 90) - 0.5) + 0.0025 * (n2(523, x * 12, z * 12) - 0.5) * ss(-0.02, -0.06, u);
  return bump - rim(u) - rim(LEDGE.back - z) - 0.09 * ss(0.12, 0.2, z) - 0.09 * ss(-0.12, -0.22, u);
}
function ledgeGeometry() {
  const U = [], Z = [], pos = [], idx = [];
  for (const [a, b, n] of [[-0.26, -0.03, 60], [-0.03, 0.012, 140], [0.012, 0.03, 12]]) for (let j = U.length ? 1 : 0; j <= n; j++) U.push(lerp(a, b, j / n));
  for (const [a, b, n] of [[-0.03, -0.012, 12], [-0.012, 0.03, 140], [0.03, 0.22, 60]]) for (let j = Z.length ? 1 : 0; j <= n; j++) Z.push(lerp(a, b, j / n));
  for (const z of Z) for (const u of U) { const x = xe(z) + u; pos.push(x, ledgeY(x, z), z); }
  const nu = U.length;
  for (let j = 0; j < Z.length - 1; j++) for (let i = 0; i < nu - 1; i++) { const a = j * nu + i, b = a + nu; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/** 湿石头：清漆一样的水膜；颜色斑驳，盐霜的地方发白、干（没有水膜） */
function ledgeMaterial() {
  const m = new THREE.MeshPhysicalMaterial({ color: '#b8b3a7', roughness: 0.45, clearcoat: 1, clearcoatRoughness: 0.05 });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vL;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvL = transformed;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vL;\n${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  float crust = smoothstep(0.52, 0.68, fbm(vL.xz * 180.0 + 4.0)) * smoothstep(-0.004, -0.001, vL.y);
  diffuseColor.rgb *= (1.0 + 0.22 * (fbm(vL.xz * 60.0) - 0.47) + 0.1 * (vnoise(vL.xz * 900.0) - 0.5));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.93, 0.9), 0.85 * crust);`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
  material.clearcoat *= 1.0 - crust; material.roughness = mix(material.roughness, 0.8, crust);`);
  };
  return capped(m, 'ledge');
}
/**
 * 漏斗状的盐晶（hopper）：边长 2s 的立方体，每个面向里凹成 steps 级台阶（每级收进 w·s、下沉 d·s，d < w：相邻面的坑不相交），中间一个小平底。
 * 先在 +y 面上造一面，再转到六个面；三角形按设计的法线定绕向（朝外）
 */
export function hopperGeometry(s, { steps = 3, w = 0.17, d = 0.11 } = {}) {
  const face = [], C = [[1, 1], [-1, 1], [-1, -1], [1, -1]], up = new THREE.Vector3(0, 1, 0), ab = new THREE.Vector3(), ac = new THREE.Vector3();
  const R = j => s * (1 - j * w), Y = j => s * (1 - j * d), sq = (r, k, y) => new THREE.Vector3(r * C[k % 4][0], y, r * C[k % 4][1]);
  const tri = (a, b, c, n) => face.push(...(ab.subVectors(b, a).cross(ac.subVectors(c, a)).dot(n) >= 0 ? [a, b, c] : [a, c, b]));
  const quad = (a, b, c, e, n) => { tri(a, b, c, n); tri(a, c, e, n); };
  for (let j = 0; j < steps; j++) for (let k = 0; k < 4; k++) {
    quad(sq(R(j), k, Y(j)), sq(R(j), k + 1, Y(j)), sq(R(j + 1), k + 1, Y(j)), sq(R(j + 1), k, Y(j)), up);                // 第 j 级台面
    const inward = sq(1, k, 0).add(sq(1, k + 1, 0)).negate().normalize();                                                // 台阶的立面朝坑里
    quad(sq(R(j + 1), k, Y(j)), sq(R(j + 1), k + 1, Y(j)), sq(R(j + 1), k + 1, Y(j + 1)), sq(R(j + 1), k, Y(j + 1)), inward);
  }
  quad(sq(R(steps), 0, Y(steps)), sq(R(steps), 1, Y(steps)), sq(R(steps), 2, Y(steps)), sq(R(steps), 3, Y(steps)), up);   // 坑底
  const pos = [];
  for (const e of [[0, 0, 0], [Math.PI, 0, 0], [0, 0, -Math.PI / 2], [0, 0, Math.PI / 2], [Math.PI / 2, 0, 0], [-Math.PI / 2, 0, 0]]) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...e));
    for (const v of face) pos.push(...v.clone().applyQuaternion(q).toArray());
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}
/** 立方体的八个角（按 rotation 转过） */
const corners = (s, rot) => [...Array(8).keys()].map(i => new THREE.Vector3(i & 1 ? s : -s, i & 2 ? s : -s, i & 4 ? s : -s).applyEuler(rot));
/** 把一颗边长 2s 的晶体放到石面 (x, z) 上：最深的一个角扎进石头 sink 米 */
function rest(obj, s, x, z, sink = 0.0002) {
  obj.position.set(x, Math.max(...corners(s, obj.rotation).map(c => ledgeY(x + c.x, z + c.z) - c.y)) - sink, z);
  obj.updateMatrix();
}
/**
 * 盐晶一簇 + 最大那颗最低的一角挂着一颗水珠。返回 root、frame（取景盒，世界坐标；深度压在水珠所在的平面，对焦 'target' 就落在水珠上）、
 * dir(yaw, pitch)（相机方向，按特写坐标的方位 / 仰角，度）、drop(R, tau)（同 whitetea：挂着时顶端扎在晶角上，松开前 0.3 秒被坠长；
 * tau > 0 是松开后的秒数，和瓶里的水滴走同一条下落曲线）、shoal（特写石头在海底的浅滩：[x, z, 半径, 水深]，世界坐标）
 */
function macroSalt(hz) {
  const root = new THREE.Group();
  const ledge = new THREE.Mesh(ledgeGeometry(), ledgeMaterial());
  const clear = new THREE.MeshPhysicalMaterial({ color: '#f4f6f4', roughness: 0.35, transmission: 0.45, thickness: 0.003, ior: 1.544, attenuationColor: '#eef6f3', attenuationDistance: 0.02 });   // 磨砂、半透：逆光时透亮
  const white = new THREE.MeshStandardMaterial({ color: '#eef2f0', roughness: 0.22, metalness: 0 });
  root.add(ledge);
  // 最大的一颗（边长 4.4 毫米）：一半探出石沿（背后的角嵌在盐霜里），外角微微朝下
  const KS = 0.0022, key = new THREE.Mesh(hopperGeometry(KS, { steps: 2, w: 0.2, d: 0.08 }), clear);
  key.rotation.set(0.05, 0.55, -0.1); rest(key, KS, 0.0006, 0);
  const tipC = corners(KS, key.rotation).reduce((a, c) => (c.x - 0.6 * c.y > a.x - 0.6 * a.y ? c : a));
  const tip = tipC.clone().add(key.position);                            // 挂水珠的晶角（特写坐标）
  root.add(key);
  // 相机到水珠的视线（特写坐标的水平面上）两边 5 毫米以内不放东西，免得挡住水珠
  const V = (MACRO_VIEW * Math.PI) / 180, vx = Math.sin(V), vz = Math.cos(V);
  const inView = (x, z) => { const dx = x - tip.x, dz = z - tip.z, t = dx * vx + dz * vz; return t > -0.003 && Math.abs(dx * vz - dz * vx) < 0.005; };
  // 身后、左边几颗小一些的，还有一堆长在一起的小方块和细盐粒、石面上的水珠
  const cluster = [key];
  for (const [x, z, s, yaw, tx, tz] of [[-0.009, -0.001, 0.0024, 0.9, 0.08, -0.05], [-0.015, 0.012, 0.0015, 2.1, -0.1, 0.06], [-0.02, 0.001, 0.0018, 0.3, 0.12, 0.1], [-0.007, 0.022, 0.0013, 1.4, -0.04, 0.12], [-0.028, 0.016, 0.002, 0.6, 0.1, -0.08]]) {
    const c = new THREE.Mesh(hopperGeometry(s, { steps: 2, w: 0.2, d: 0.08 }), clear);
    c.rotation.set(tx, yaw, tz); rest(c, s, x, z); root.add(c); cluster.push(c);
  }
  const o = new THREE.Object3D(), add = (mesh, n, seed, place) => {
    for (let i = 0, k = 0; i < n && k < n * 20; k++) { const r = j => rand(seed, k * 8 + j); if (place(r)) { o.updateMatrix(); mesh.setMatrixAt(i++, o.matrix); } }
    root.add(mesh);
  };
  add(new THREE.InstancedMesh(new THREE.BoxGeometry(2, 2, 2), white, 70), 70, 541, r => {
    const a = r(0) * 6.283, d = 0.004 + 0.022 * r(1) ** 1.5, x = -0.013 + Math.cos(a) * d * 1.3, z = 0.008 + Math.sin(a) * d, s = lerp(0.0003, 0.0013, r(2) ** 2);
    if (x - xe(z) > -0.002 || z < LEDGE.back + 0.002 || Math.hypot(x - key.position.x, z) < KS * 1.5 || inView(x, z)) return false;
    o.rotation.set(r(3) * 0.5, r(4) * 6.283, r(5) * 0.5); o.scale.setScalar(s); o.position.set(x, ledgeY(x, z) + s * (0.5 + 0.8 * r(6)), z);
    return true;
  });
  add(new THREE.InstancedMesh(new THREE.BoxGeometry(2, 2, 2), white, 500), 500, 551, r => {
    const x = -0.004 - 0.05 * r(0) ** 1.4, z = lerp(-0.004, 0.04, r(1)), s = lerp(0.00007, 0.00022, r(2));
    if (x - xe(z) > -0.001 || z < LEDGE.back + 0.001 || r(3) > ss(0.35, 0.6, n2(553, x * 150, z * 150))) return false;
    o.rotation.set(r(4), r(5) * 6.283, r(6)); o.scale.setScalar(s); o.position.set(x, ledgeY(x, z) + 0.5 * s, z);
    return true;
  });
  add(new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 6, 0, 2 * Math.PI, 0, Math.PI / 2), capped(new THREE.MeshStandardMaterial({ color: '#c4bfb3', roughness: 0.02, metalness: 0, envMapIntensity: 2 }), 'bead'), 50), 50, 561, r => {
    const x = -0.006 - 0.09 * r(0), z = lerp(-0.002, 0.06, r(1)), R = lerp(0.0003, 0.0018, r(2) ** 2);
    if (x - xe(z) > -0.003 || z < LEDGE.back + 0.003 || Math.hypot(x - key.position.x, z) < 0.006 || inView(x, z)) return false;
    o.rotation.set(0, 0, 0); o.scale.set(R, 0.5 * R, R); o.position.set(x, ledgeY(x, z), z);
    return true;
  });
  const dew = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), dewMaterial(hz, { below: '#4f9fa8', above: '#f2f7f5' }));
  root.add(dew);
  const drop = (R, tau = -1) => {
    if (tau > 0) { const sy = stretch(tau), w = R * Math.sqrt(1.4 / sy); dew.scale.set(w, sy * R, w); dew.position.set(tip.x, tip.y - 1.2 * R - fallen(tau), tip.z); }
    else { const sy = 1.2 + 0.2 * ss(-0.3, 0, tau); dew.scale.set(R, sy * R, R); dew.position.set(tip.x, tip.y + 0.2 * R - sy * R, tip.z); }   // 顶端在晶角上方 0.2R：晶角扎进水珠一点
    dew.updateMatrix();
  };
  drop(0.0028);
  root.updateMatrixWorld(true);
  const frame = new THREE.Box3();                                        // 取景：这一簇盐晶和水珠
  for (const m of [...cluster.slice(0, 3), dew]) frame.expandByObject(m, true);
  frame.min.z = frame.max.z = tip.z;
  frame.min.y -= 0.5 * (frame.max.y - frame.min.y);                      // 水珠下面多框一截石面：取景框不那么扁，16:9 里盐晶簇就不会伸到左下角的字上
  root.position.set(...MACRO_AT); root.rotation.y = MACRO_YAW; root.updateMatrixWorld(true);
  frame.applyMatrix4(root.matrixWorld);
  const dir = (yaw, pitch) => { const Y = (yaw * Math.PI) / 180, P = (pitch * Math.PI) / 180; return new THREE.Vector3(Math.sin(Y) * Math.cos(P), Math.sin(P), Math.cos(Y) * Math.cos(P)).applyQuaternion(root.quaternion).toArray(); };
  const c = root.localToWorld(new THREE.Vector3(-0.1, 0, 0.03));
  return { root, frame, dir, drop, tip, shoal: [c.x, c.z, 0.09, 0.05] };
}

export async function build(ctx) {
  const { scene } = ctx, hz = haze(SKY), U = { uT: { value: 0 }, uLevel: { value: level(0) } };
  scene.background = new THREE.Color(SKY.horizon);
  scene.add(sky(hz));
  const rock = new THREE.Mesh(rockGeometry(), rockMaterial(U));
  rock.receiveShadow = true;
  const bm = boulderMaterial(U);
  scene.add(rock, beads(), saltGrains(), ...BOULDERS.map((b, i) => boulder(i, b, bm)));

  const key = new THREE.DirectionalLight(KEY.color, KEY.intensity);
  key.position.copy(SUN).multiplyScalar(1.5); key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -0.5, right: 0.5, top: 0.5, bottom: -0.5, near: 0.1, far: 3 });
  key.shadow.camera.updateProjectionMatrix(); key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 5;
  scene.add(key, key.target);

  const salt = macroSalt(hz); scene.add(salt.root);
  const sea = new THREE.Mesh(new THREE.CircleGeometry(170, 160).rotateX(-Math.PI / 2), seaMaterial(hz, U, [...BOULDERS.map(([x, z, r]) => [x, z, 0.95 * r, 0.012]), salt.shoal]));
  sea.frustumCulled = false;
  scene.add(sea);

  // 空中：浪花的水星（加色的光点，朝太阳时亮）向右慢慢飘、微微上升；几粒盐晶翻着跟头飘过，某个面对上太阳就闪一下
  const sparkMat = billboards(hz, { map: dots(), tint: [0.35, 0.37, 0.38], opacity: 0.8, forward: 2.5 });
  sparkMat.blending = THREE.AdditiveBlending;
  const spark = driftField({ geometry: new THREE.PlaneGeometry(1, 1), material: sparkMat, count: 70, seed: 303, box: [-1.1, 0.01, -1.9, 1.1, 0.32, -0.3], vel: [0.06, 0.012, 0], sway: 0.02, swayHz: 0.4, size: [0.002, 0.005], spin: 0, fade: 'alpha' });
  const flakes = driftField({ geometry: new THREE.BoxGeometry(1, 1, 1), material: capped(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1, metalness: 0, envMapIntensity: 1.4 }), 'flake'),
    count: 45, seed: 404, box: [-0.7, 0.012, -1, 0.7, 0.26, -0.1], vel: [0.03, -0.004, 0], sway: 0.012, swayHz: 0.35, size: [0.0007, 0.0016], spin: 1.2 });
  scene.add(spark.mesh, flakes.mesh);

  const tide = t => { U.uT.value = t; U.uLevel.value = level(t); sea.position.y = level(t); };
  return {
    haze: hz,
    env: { base: null, fill: (add, B, es) => es.add(sky(hz, { R: 15 })) },
    post: { exposure: 1.05, aperture: 0.25, bloom: { strength: 0.35, threshold: 0.9 }, saturation: 1.05, lift: [0, 0.008, 0.012], vignette: 0.12, grain: 0.02 },
    macro: {
      root: salt.root,
      // 从石头这边慢慢绕到水这边、同时推近：水珠和晶面上的高光跟着走，背后的光斑慢慢横移
      camera: s => ({ type: 'fit', box: salt.frame, dir: salt.dir(MACRO_VIEW + lerp(-7, 7, easeInOut(s.u)), 24), fov: 28, scale: lerp(1, 1.12, easeInOut(s.u)) }),
      post: { aperture: 1.2, maxBlur: 0.03, exposure: 0.9, gamma: [0.86, 0.88, 0.9], saturation: 1.15 },
    },
    update(ctx, s) {
      hz.uniforms.hTime.value = s.t;
      tide(s.t); spark.update(s.t); flakes.update(s.t);
      const rel = s.dur - DROP.pre;                                       // 特写最后 DROP.pre 秒水珠松开：硬切到 drop，瓶里的水滴接着落
      if (s.name === 'macro') salt.drop(lerp(0.0016, 0.0028, ss(0, rel - 0.3, s.lt)), s.lt - rel);   // 先慢慢长大
    },
    reset() { salt.drop(0.0028); },
  };
}
