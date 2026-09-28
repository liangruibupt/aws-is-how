// glass.js — 玻璃与液体的分层折射 + 地面焦散
// 折射：场景目标里先画世界（第 0 层），再画液体（第 1 层，采样世界），再画玻璃（第 2 层，采样世界 + 液体），最后画挡在瓶子前面的半透明东西（第 3 层，比如喷雾）。
//   每一遍 three 都把多重采样缓冲解析到 target.texture / depthTexture（见 post.js），下一遍的着色器就采样它当作“背后的画面”。
//   第 0 层画完还缩成四分之一存一份带 mip 的：光路出了画面（没有颜色可取）时取它糊开的颜色。
//   光在玻璃和液体里走的路程按 bottle.js 导出的 SHAPE（凸八角棱柱）解析求出：比尔–朗伯吸收、出口按菲涅耳分成透出去和反射回来的两份
//   （临界角上画面不断开）、玻璃三色色散、磨砂 logo 模糊。
//   透过光面玻璃看进内腔的地方，玻璃写的是背后那样东西的深度：景深按看到的东西虚化（对焦在瓶里的水滴上时，前壁不会把它糊掉）。
// 焦散：从主光方向打一张光线网格穿过瓶子（玻璃 → 空气 / 液面 → 液体 → 玻璃），落到瓶子站的平面上；
//   每个网格三角形的亮度 = 出发面积 / 落地面积（光被汇聚处更亮），按 RGB 三种折射率各画一遍。瓶子的影子由一个只投影的替身给出
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { SHAPE, GLASS as G, RIPPLE } from './bottle.js';
import { DIMS } from '../meta.js';

// 玻璃折射率、液体折射率、玻璃吸收（1/米，略偏绿的高白料）、三色折射率差、磨砂模糊半径（画面高度的比例）、磨砂处混入的漫反射、
// 焦散网格分辨率、焦散亮度倍数、四个界面的总透过率、光路出了画面时取的糊开的世界（四分之一分辨率的第几级 mip）
export const OPTICS = { glassIor: 1.5, liquidIor: 1.36, glassAbsorb: [1.6, 0.5, 1.2], dispersion: 0.012, frostBlur: 0.012, frostDiffuse: 0.4, causticGrid: 256, causticGain: 1, interfaces: 0.85, lowLod: 3.5 };
export const LAYER = { liquid: 1, glass: 2, over: 3 };
const CAP_R = 0.019;                                                  // 颈圈 + 喷头 + 瓶盖挡光的圆柱半径（瓶盖半宽 18 毫米）

const f = x => x.toFixed(6);
// 两种着色器共用：凸棱柱求交
const PRISM = /* glsl */`
uniform vec3 uOut[8], uCav[8], uLiq[8]; uniform vec2 uOutY, uCavY, uLiqY;
// 从凸棱柱内部 p 沿 d 走到出口：返回距离，n 为出口外法线
float exitP(vec3 p, vec3 d, vec3 P[8], vec2 Y, out vec3 n) {
  float t = 1.0; n = vec3(0.0, 1.0, 0.0);
  for (int i = 0; i < 8; i++) {
    float dn = P[i].x * d.x + P[i].y * d.z;
    if (dn > 1e-5) { float s = (P[i].z - P[i].x * p.x - P[i].y * p.z) / dn; if (s < t) { t = s; n = vec3(P[i].x, 0.0, P[i].y); } }
  }
  if (abs(d.y) > 1e-5) { float s = ((d.y > 0.0 ? Y.y : Y.x) - p.y) / d.y; if (s < t) { t = s; n = vec3(0.0, sign(d.y), 0.0); } }
  return max(t, 0.0);
}
// 从外面 p 沿 d 射向凸棱柱：返回（入口, 出口）距离，打不中时 x ≥ y；n 为入口外法线
vec2 enterP(vec3 p, vec3 d, vec3 P[8], vec2 Y, out vec3 n) {
  float t0 = -1.0, t1 = 1.0; n = vec3(0.0, 1.0, 0.0);
  for (int i = 0; i < 8; i++) {
    float dn = P[i].x * d.x + P[i].y * d.z, h = P[i].z - P[i].x * p.x - P[i].y * p.z;
    if (abs(dn) < 1e-6) { if (h < 0.0) return vec2(1.0, 0.0); continue; }
    float s = h / dn;
    if (dn < 0.0) { if (s > t0) { t0 = s; n = vec3(P[i].x, 0.0, P[i].y); } } else t1 = min(t1, s);
  }
  if (abs(d.y) < 1e-6) { if (p.y < Y.x || p.y > Y.y) return vec2(1.0, 0.0); }
  else {
    float a = (Y.x - p.y) / d.y, b = (Y.y - p.y) / d.y;
    if (min(a, b) > t0) { t0 = min(a, b); n = vec3(0.0, -sign(d.y), 0.0); }
    t1 = min(t1, max(a, b));
  }
  return vec2(t0, t1);
}
`;

const PARS = /* glsl */`
uniform mat4 projectionMatrix;                                          // 片元着色器默认没有声明
uniform sampler2D tScene, tDepth, tLow; uniform vec2 res; uniform float uNear, uFar, uBlur;
uniform mat4 uV2B, uB2V; uniform vec3 uAbsorb; uniform float uDisp;
${PRISM}
float gBlur = 0.0;                                                      // 本片元的磨砂模糊半径（像素）
vec2 gUv = vec2(0.0);                                                   // behind 最后取色的屏幕位置
float gZin = 0.0;                                                       // 视线进瓶（进液体）那一点的视空间 z
vec2 toScreen(vec3 q) { vec4 c = projectionMatrix * (uB2V * vec4(q, 1.0)); return c.xy / c.w * 0.5 + 0.5; }
vec3 fetchR(vec2 uv, float R) {
  vec3 c = texture2D(tScene, uv).rgb;
  if (R < 0.5) return c;
  for (int i = 0; i < 12; i++) {                                        // 磨砂：中心 + 两圈各 6 个点
    float a = float(i) * 1.0472 + (i < 6 ? 0.0 : 0.5236), r = i < 6 ? 0.5 : 1.0;
    c += texture2D(tScene, uv + vec2(cos(a), sin(a)) * r * R / res).rgb;
  }
  return c / 13.0;
}
vec3 fetch(vec2 uv) { return fetchR(uv, gBlur); }
float viewZ(vec2 uv) { return perspectiveDepthToViewZ(texture2D(tDepth, uv).x, uNear, uFar); }
// uv 处是挡在进瓶点前面的东西（比如从液面后方看回去的水滴）：它不在这条光路上，取它周围两圈里在后面的画面
vec3 around(vec2 uv) {
  vec3 c = vec3(0.0); float n = 0.0;
  for (int i = 0; i < 16; i++) {
    float a = float(i) * 0.785398 + (i < 8 ? 0.0 : 0.392699), r = i < 8 ? 0.1 : 0.18;
    vec2 u = clamp(uv + vec2(cos(a) * res.y / res.x, sin(a)) * r, 0.0, 1.0);
    if (viewZ(u) < gZin + 5e-4) { c += texture2D(tScene, u).rgb; n += 1.0; }
  }
  return n > 0.0 ? c / n : texture2D(tScene, uv).rgb;
}
bool onScreen(vec2 uv) { return all(greaterThanEqual(uv, vec2(0.0))) && all(lessThanEqual(uv, vec2(1.0))); }
// 光线从 q 沿 d 离开瓶子后落到的画面：用深度图估计背后的东西有多远，再把那一点投回屏幕。
// 投到画面外时（从液面斜看下去，光从后壁很低的地方出去）：画面外没有深度也没有颜色，就从本像素朝那一点走到画面边上，
// 取那里的世界大范围糊开的颜色（tLow 的粗 mip）。它随像素连续变化：不拉出一道道边上的像素
vec3 behind(vec3 q, vec3 d) {
  vec2 uq = toScreen(q);
  float zq = (uB2V * vec4(q, 1.0)).z, s = onScreen(uq) ? min(max(zq - viewZ(uq), 0.0) / max(-(mat3(uB2V) * d).z, 0.25), 0.3) : 0.05;
  gUv = toScreen(q + d * s);
  if (onScreen(gUv)) {                                                  // 靠近画面边时渐渐换成 tLow：光路出画面的那一刻颜色不跳
    vec2 e = min(gUv, 1.0 - gUv) * vec2(res.x / res.y, 1.0);
    vec3 c = viewZ(gUv) > gZin + 5e-4 ? around(gUv) : fetch(gUv);
    return mix(textureLod(tLow, gUv, ${f(OPTICS.lowLod)}).rgb, c, smoothstep(0.0, 0.06, min(e.x, e.y)));
  }
  vec2 f = gl_FragCoord.xy / res, v = gUv - f, m = 1.5 / res, b = mix(m, 1.0 - m, step(0.0, v));
  vec2 t = mix(vec2(1e6), (b - f) / v, step(1e-6, abs(v)));             // 每个方向走到边上要走多远
  gUv = f + v * min(t.x, t.y);
  return textureLod(tLow, gUv, ${f(OPTICS.lowLod)}).rgb;
}
// 从折射率 eta 的介质沿 d 出到空气时的反射率（非偏振的菲涅耳，n 是外法线；全反射为 1）
float fresnelOut(vec3 d, vec3 n, float eta) {
  float ci = dot(d, n), st2 = eta * eta * (1.0 - ci * ci);
  if (st2 >= 1.0) return 1.0;
  float ct = sqrt(1.0 - st2), rs = (eta * ci - ct) / (eta * ci + ct), rp = (ci - eta * ct) / (ci + eta * ct);
  return 0.5 * (rs * rs + rp * rp);
}
// 在棱柱里从 p 沿 d 走到出口，出去的那份按菲涅耳透过率取背后的颜色，反射回来的那份接着在里面走（最多四段：45° 切角里要来回几次）。
// 接近全反射的角度上两份此消彼长，画面不会在临界角上断开；平常出口的反射只有几个百分点，直接出去。L 是按份额平均的路程
vec3 through(vec3 p, vec3 d, vec3 P[8], vec2 Y, float eta, inout float L) {
  vec3 c = vec3(0.0); float w = 1.0, Lw = 0.0;
  for (int k = 0; k < 4; k++) {
    vec3 n; float t = exitP(p, d, P, Y, n);
    p += d * t; L += t;
    float a = w * (1.0 - fresnelOut(d, n, eta));
    if (a > 0.0) { c += a * behind(p, refract(d, -n, eta)); Lw += a * L; w -= a; }
    if (w < 0.1) { L = Lw / (1.0 - w); return c / (1.0 - w); }
    d = reflect(d, n);
  }
  L = Lw + w * L;
  return c + w * fetch(toScreen(p));                                      // 还困在里面的那份：取这一点正后方的画面
}
`;

const MAIN = /* glsl */`
  vec3 bp = (uV2B * vec4(-vViewPosition, 1.0)).xyz, I = normalize(bp - uV2B[3].xyz), N = normalize(mat3(uV2B) * normal);
  gZin = -vViewPosition.z;
  if (dot(N, I) > 0.0) N = -N;
  vec3 seen;
  #ifdef GLASS_PASS
    float frost = smoothstep(0.1, 0.45, roughnessFactor), zSeen = gl_FragCoord.z;
    gBlur = uBlur * frost;
    for (int c = 0; c < 3; c++) {                                        // 三色各走一遍：色散只在厚底和棱边上看得出
      float eta = ior + float(c - 1) * uDisp, L = 0.0;
      vec3 d = refract(I, N, 1.0 / eta), nc, col;
      vec2 h = enterP(bp, d, uCav, uCavY, nc);
      vec3 d2 = refract(d, nc, eta);
      if (bp.y > uOutY.y + 1e-4) { L = ${f(2 * G.wall)}; col = behind(bp, I); }            // 瓶颈：薄壁管，光基本直穿
      else if (h.x > 0.0 && h.x < h.y && dot(d2, d2) > 0.0) {            // 穿过侧壁进内腔：后壁按同样厚度算
        L = 2.0 * h.x; col = behind(bp + d * h.x, d2) * 0.92;
        if (c == 1) zSeen = texture2D(tDepth, gUv).x;                    // 看到的那样东西的深度（绿色通道的光路）
      }
      else col = through(bp, d, uOut, uOutY, eta, L);                    // 实心玻璃（厚底、肩、棱）：可能全反射
      seen[c] = col[c] * exp(-uAbsorb[c] * L);
    }
    seen = mix(seen, totalDiffuse, frost * ${f(OPTICS.frostDiffuse)});    // 磨砂面散射：带一点被灯照亮的白
    gl_FragDepth = frost < 0.5 ? max(gl_FragCoord.z, zSeen) : gl_FragCoord.z;   // 不比玻璃自己近：玻璃前面的东西照样挡住它
  #else
    float L = 0.0;
    seen = through(bp, refract(I, N, 1.0 / ior), uLiq, uLiqY, ior, L) * exp(-uAbsorb * L);
  #endif
  totalDiffuse = (1.0 - EnvironmentBRDF(normal, geometryViewDir, material.specularColor, material.specularF90, material.roughness)) * seen;
`;

// ── 焦散：顶点着色器里追一条光线，落地点就是顶点位置 ──
const CAUSTIC_VERT = /* glsl */`
uniform vec3 uL, uC, uE1, uE2; uniform vec2 uExt; uniform float uEg, uEl, uGa, uLa, uAge;
${PRISM}
varying vec2 vSrc, vDst; varying vec3 vIn; varying vec4 vPath; varying float vOk, vT;
float fid(vec3 n) { return n.y > 0.5 ? 8.0 : n.y < -0.5 ? 9.0 : floor(mod(atan(n.z, n.x) / 0.785398 + 8.5, 8.0)); }
// 与 bottle.js 的 rippleHeight 同一公式；r 从落点 RIPPLE.at 量起
const vec2 AT = vec2(${f(RIPPLE.at[0])}, ${f(RIPPLE.at[1])});
float rip(float r) {
  float b = ${f(RIPPLE.c)} * uAge - r;
  if (uAge <= 0.0 || b <= 0.0) return 0.0;
  return ${f(RIPPLE.amp)} * exp(${f(-RIPPLE.decay)} * uAge) * sqrt(${f(RIPPLE.r0)} / (r + ${f(RIPPLE.r0)})) * sin(${f(RIPPLE.k)} * b) * min(1.0, b / 0.003);
}
vec3 surfaceNormal(vec2 xz) {
  vec2 q = xz - AT;
  float r = length(q), g = (rip(r + 1e-4) - rip(max(r - 1e-4, 0.0))) / 2e-4;
  vec2 u = r > 1e-6 ? q / r : vec2(0.0);
  return normalize(vec3(-g * u.x, 1.0, -g * u.y));
}
void main() {
  vec3 d = -uL, p = uC + uE1 * (position.x * uExt.x) + uE2 * (position.y * uExt.y) + uL * 0.5, n;
  float ok = 1.0, Lg = 0.0, Ll = 0.0, region = 0.0, fl = 0.0;
  vec2 h = enterP(p, d, uOut, uOutY, n);
  if (!(h.x > 0.0 && h.x < h.y)) ok = 0.0;                              // 没碰到瓶子：普通光照，不归焦散管
  p += d * h.x;
  float fin = fid(n);
  // 被颈圈 / 喷头 / 瓶盖挡住：入射点往光源方向的线段在瓶身以上那段离轴不到 CAP_R
  float t0 = max((${f(DIMS.body)} - p.y) / uL.y, 0.0), t1 = (${f(DIMS.body + DIMS.collar + DIMS.cap)} - p.y) / uL.y;
  vec2 a = p.xz + uL.xz * t0, b = p.xz + uL.xz * t1, ab = b - a;
  if (length(a + ab * clamp(-dot(a, ab) / max(dot(ab, ab), 1e-12), 0.0, 1.0)) < ${f(CAP_R)}) ok = 0.0;
  d = refract(d, n, 1.0 / uEg);
  vec3 nc; vec2 hc = enterP(p, d, uCav, uCavY, nc);
  if (hc.x > 0.0 && hc.x < hc.y) {                                      // 进内腔
    Lg += hc.x; p += d * hc.x;
    bool liquid = p.y < ${f(G.fill)};
    if (!liquid) {                                                      // 液面以上是空气：落到液面，或者撞上对面的壁
      d = refract(d, nc, uEg); region = 1.0;
      vec3 nx; float t = exitP(p, d, uCav, uCavY, nx), tf = d.y < 0.0 ? (${f(G.fill)} - p.y) / d.y : 1e3;
      if (tf < t) { p += d * tf; d = refract(d, surfaceNormal(p.xz), 1.0 / uEl); liquid = true; region = 2.0; }
      else { p += d * t; d = refract(d, -nx, 1.0 / uEg); }
    } else { d = refract(d, nc, uEg / uEl); region = 3.0; }
    if (liquid) {
      vec3 nl; float t = exitP(p, d, uLiq, uLiqY, nl);
      Ll += t; p += d * t; fl = fid(nl); d = refract(d, -nl, uEl / uEg);
    }
  }
  if (dot(d, d) < 0.5) ok = 0.0;                                        // 里面某个界面全反射
  // 出瓶：全反射就在玻璃里反射一次再出（从竖直面进来的光到不了底面以外的直角面，靠这一下才从底面出去）
  vec3 no; float bounce = 0.0; bool left = false;
  for (int k = 0; k < 2; k++) {
    float t = exitP(p, d, uOut, uOutY, no);
    Lg += t; p += d * t;
    vec3 o = refract(d, -no, uEg);
    if (dot(o, o) > 0.5) { d = o; left = true; break; }
    bounce = fid(no) + 1.0; d = reflect(d, no);
  }
  if (!left || d.y > -1e-3) ok = 0.0;
  vec3 land = p + d * (-p.y / min(d.y, -1e-3));
  vOk = ok; vSrc = position.xy * uExt; vDst = land.xz; vIn = -d;
  vPath = vec4(fin, region, fl, fid(no) + 10.0 * bounce);                              // 走的面不同就是不同的路：跨路的三角形丢掉
  vT = exp(-(uGa * Lg + uLa * Ll));                                     // 本通道的比尔–朗伯吸收
  gl_Position = projectionMatrix * modelViewMatrix * vec4(land.x, 3e-4, land.z, 1.0);
}
`;
// 落点的亮度照搬 three 对地面的直接光：irradiance × (BRDF_Lambert + BRDF_GGX)，只是 irradiance 里的 dotNL 换成“出发面积 / 落地面积”
const CAUSTIC_FRAG = /* glsl */`
uniform vec3 uK, uAlb, uF0, uCam; uniform float uRough;
varying vec2 vSrc, vDst; varying vec3 vIn; varying vec4 vPath; varying float vOk, vT;
void main() {
  vec4 w = fwidth(vPath);
  if (vOk < 0.999 || max(max(w.x, w.y), max(w.z, w.w)) > 1e-3) discard;
  float aS = abs(determinant(mat2(dFdx(vSrc), dFdy(vSrc)))), aD = abs(determinant(mat2(dFdx(vDst), dFdy(vDst))));
  vec3 L = normalize(vIn), V = normalize(uCam - vec3(vDst.x, 0.0, vDst.y)), H = normalize(L + V);
  float a2 = pow(uRough, 4.0), nl = max(L.y, 0.0), nv = max(V.y, 0.0), nh = max(H.y, 0.0), vh = max(dot(V, H), 0.0);
  vec3 F = uF0 + (1.0 - uF0) * exp2((-5.55473 * vh - 6.98316) * vh);
  float G = 0.5 / max(nl * sqrt(a2 + (1.0 - a2) * nv * nv) + nv * sqrt(a2 + (1.0 - a2) * nl * nl), 1e-6);
  float D = a2 / (3.14159265 * pow(nh * nh * (a2 - 1.0) + 1.0, 2.0));
  gl_FragColor = vec4(uK * (uAlb / 3.14159265 + F * G * D) * vT * min(aS / max(aD, 1e-14), 12.0), 1.0);
}
`;

/** 把一个 MeshPhysicalMaterial 改成分层折射材质。transmission 保持 0：不让 three 另开自己的透射渲染 */
function refractive(mat, U, pass, absorb) {
  const u = { ...U, uAbsorb: { value: new THREE.Vector3(...absorb) } };
  Object.assign(mat, { transparent: false, opacity: 1, depthWrite: true, transmission: 0, side: THREE.FrontSide });
  if (pass === 'glass') mat.defines = { ...mat.defines, GLASS_PASS: '' };
  mat.onBeforeCompile = sh => {
    for (const inc of ['#include <transmission_pars_fragment>', '#include <transmission_fragment>'])
      if (!sh.fragmentShader.includes(inc)) throw new Error(`glass: three shader chunk not found (${inc})`);
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader.replace('#include <transmission_pars_fragment>', PARS).replace('#include <transmission_fragment>', MAIN);
  };
  mat.customProgramCacheKey = () => `wenjing-${pass}`;
  mat.needsUpdate = true;
  return mat;
}

/** 三张焦散网格（R、G、B 各一种折射率），共用一份网格几何 */
function caustics(U, sku) {
  const N = OPTICS.causticGrid, geo = new THREE.PlaneGeometry(1, 1, N, N), meshes = [];
  const shared = { uL: { value: new THREE.Vector3() }, uC: { value: new THREE.Vector3() }, uE1: { value: new THREE.Vector3() }, uE2: { value: new THREE.Vector3() },
    uExt: { value: new THREE.Vector2() }, uAge: { value: 0 }, uCam: { value: new THREE.Vector3() },
    uAlb: { value: new THREE.Color() }, uF0: { value: new THREE.Color() }, uRough: { value: 1 } };
  for (let c = 0; c < 3; c++) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: CAUSTIC_VERT, fragmentShader: CAUSTIC_FRAG,
      uniforms: { ...U, ...shared, uEg: { value: OPTICS.glassIor + (c - 1) * OPTICS.dispersion }, uEl: { value: OPTICS.liquidIor + (c - 1) * OPTICS.dispersion * 0.7 },
        uGa: { value: OPTICS.glassAbsorb[c] }, uLa: { value: sku.liquid.absorb[c] }, uK: { value: new THREE.Vector3() } },
      // 双面：从光源网格到落点的映射会翻转三角形的绕向（落地网格被焦散折叠时正反面都有）；叠加混合，多处汇聚就更亮
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false; m.renderOrder = 5;
    meshes.push(m);
  }
  return { meshes, shared };
}

/** 换上折射材质、加焦散和影子替身，返回 { render(target) }：film.render 每帧调用 */
export function createGlass(ctx, bottle, sku) {
  const { renderer, scene, camera } = ctx, { glass, liquid } = bottle.parts, V2 = (a, b) => new THREE.Vector2(a, b);
  const planes = S => S.planes.map(([nx, nz, d]) => new THREE.Vector3(nx, nz, d));
  const U = {
    tScene: { value: null }, tDepth: { value: null }, tLow: { value: null }, res: { value: V2(1, 1) }, uNear: { value: 0.01 }, uFar: { value: 100 }, uBlur: { value: 0 },
    uV2B: { value: new THREE.Matrix4() }, uB2V: { value: new THREE.Matrix4() }, uDisp: { value: OPTICS.dispersion },
    uOut: { value: planes(SHAPE.outer) }, uCav: { value: planes(SHAPE.cavity) }, uLiq: { value: planes(SHAPE.liquid) },
    uOutY: { value: V2(...SHAPE.outer.y) }, uCavY: { value: V2(...SHAPE.cavity.y) }, uLiqY: { value: V2(...SHAPE.liquid.y) },
  };
  glass.material.ior = OPTICS.glassIor;
  refractive(glass.material, U, 'glass', OPTICS.glassAbsorb);
  // 液体本身无色：颜色全来自吸收，越厚越深（瓶底、侧看的棱边）
  const lm = refractive(new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.04, ior: OPTICS.liquidIor }), U, 'liquid', sku.liquid.absorb);
  liquid.traverse(o => { if (o.isMesh) { o.material = lm; o.layers.set(LAYER.liquid); } });
  glass.traverse(o => { if (o.isMesh) o.layers.set(LAYER.glass); });

  // 影子替身：第 0 层、不写颜色不写深度，只进阴影贴图——瓶身整块挡住主光，透过去的光由焦散补回来
  const proxy = new THREE.Mesh(glass.geometry, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  proxy.castShadow = true;
  const cz = caustics(U, sku);
  bottle.root.add(proxy, ...cz.meshes);

  // 主光：第一盏投影的平行光。落点平面的材质从瓶底往下打一条射线取（只看 color / roughness / metalness，不看贴图）
  let key = null;
  scene.traverse(o => { if (!key && o.isDirectionalLight && o.castShadow) key = o; });
  scene.updateMatrixWorld(true);                                     // 世界里的东西刚建好，矩阵还没更新（否则射线会打到原点上的别的东西）
  const ray = new THREE.Raycaster(bottle.root.localToWorld(new THREE.Vector3(0, 0.05, 0)), new THREE.Vector3(0, -1, 0));
  const gm = ray.intersectObjects(scene.children.filter(o => o !== bottle.root), true).find(h => h.object.material?.color)?.object.material;
  const S = cz.shared, metal = gm?.isMeshStandardMaterial ? gm.metalness : 0;
  S.uAlb.value.copy(gm ? gm.color : new THREE.Color(0.2, 0.2, 0.2)).multiplyScalar(1 - metal);
  if (gm?.isMeshStandardMaterial) S.uF0.value.setScalar(0.04).lerp(gm.color, metal); else S.uF0.value.setScalar(0);   // 和 three 一样：非金属 F0 = 0.04
  S.uRough.value = gm?.isMeshStandardMaterial ? Math.max(gm.roughness, 0.0525) : 1;

  // 第 0 层画完缩成四分之一存一份带 mip 的：光路出了画面时（behind）取它的粗 mip
  const low = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const shrink = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { t: { value: null } }, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main() { gl_FragColor = texture2D(t, vUv); }',
  }));
  U.tLow.value = low.texture;

  const _m = new THREE.Matrix4(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const box = [0, 1].flatMap(i => [0, 1].flatMap(j => [0, 1].map(k => new THREE.Vector3((i - 0.5) * DIMS.w, j * DIMS.body, (k - 0.5) * DIMS.d))));
  function aimCaustics() {
    for (const m of cz.meshes) m.visible = !!key;
    if (!key) return;
    _m.copy(bottle.root.matrixWorld).invert();
    const L = S.uL.value.subVectors(key.getWorldPosition(_a), key.target.getWorldPosition(_b)).transformDirection(_m);
    const e1 = S.uE1.value.crossVectors(L, Math.abs(L.y) > 0.99 ? _c.set(1, 0, 0) : up).normalize(), e2 = S.uE2.value.crossVectors(e1, L);
    const B = _c.set(0, DIMS.body / 2, 0), lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
    for (const v of box) { _a.subVectors(v, B); const s = [_a.dot(e1), _a.dot(e2)]; for (const i of [0, 1]) { lo[i] = Math.min(lo[i], s[i]); hi[i] = Math.max(hi[i], s[i]); } }
    S.uC.value.copy(B).addScaledVector(e1, (lo[0] + hi[0]) / 2).addScaledVector(e2, (lo[1] + hi[1]) / 2);
    S.uExt.value.set((hi[0] - lo[0]) * 1.02, (hi[1] - lo[1]) * 1.02);
    S.uAge.value = Math.max(bottle.posed?.ripple ?? 0, 0);
    S.uCam.value.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(_m);
    cz.meshes.forEach((m, c) => m.material.uniforms.uK.value.setComponent(c, key.color.toArray()[c] * key.intensity * OPTICS.causticGain * OPTICS.interfaces));
  }

  return {
    render(target) {
      scene.traverse(o => { if (o.isLight) o.layers.enableAll(); });     // 灯要在三遍里都被收集
      scene.updateMatrixWorld(); camera.updateMatrixWorld();              // 焦散要在 render 之前用到本帧的瓶子和相机矩阵
      aimCaustics();
      const mask = camera.layers.mask, bg = scene.background, ac = renderer.autoClear, su = renderer.shadowMap.autoUpdate;
      try {
        camera.layers.set(0);
        renderer.setRenderTarget(target); renderer.clear(); renderer.render(scene, camera);   // 第 0 层：世界、金属件、吸管、焦散
        U.uB2V.value.multiplyMatrices(camera.matrixWorldInverse, bottle.root.matrixWorld);
        U.uV2B.value.copy(U.uB2V.value).invert();
        U.res.value.set(target.width, target.height); U.uBlur.value = OPTICS.frostBlur * target.height;
        U.uNear.value = camera.near; U.uFar.value = camera.far;
        U.tScene.value = target.texture; U.tDepth.value = target.depthTexture;
        low.setSize(Math.ceil(target.width / 4), Math.ceil(target.height / 4));
        shrink.material.uniforms.t.value = target.texture; renderer.setRenderTarget(low); shrink.render(renderer); renderer.setRenderTarget(target);
        scene.background = null; renderer.autoClear = false; renderer.shadowMap.autoUpdate = false;   // 后三遍叠在第一遍上：不清屏、不重画阴影
        for (const layer of [LAYER.liquid, LAYER.glass, LAYER.over]) { camera.layers.set(layer); renderer.render(scene, camera); }
      } finally { scene.background = bg; renderer.autoClear = ac; renderer.shadowMap.autoUpdate = su; camera.layers.mask = mask; }
    },
  };
}
