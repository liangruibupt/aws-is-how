// common.js — 各世界共用的场景件：反射环境（PMREM，总带几条隐藏的长条灯）、天色与雾（haze）、天空球、水珠、闭式漂浮粒子、朝向相机的雾团 / 光斑
import * as THREE from 'three';
import { drift } from '../../../factory/engine/particles.js';
import { rand } from '../../../factory/engine/rng.js';

/**
 * 用一个程序场景生成反射环境。世界的 build 只返回 env = { base, strip, k, fill }，由 film.setup 调这里（Node 测试里没有渲染器，世界照样能建）。
 * fill(add, B, es) 往里放发光面：add(w, h, [x, y, z], mat) 放一块朝向中心的面片，B(颜色, 倍数) 是发光材质，es 是环境场景本身（放天空球之类）。
 * base 是半径 20 的房间球的颜色（null = 不要房间，比如整个换成天空）。另外总放左右后方两条竖长条灯和顶上一条横长条灯：玻璃棱边靠它们勾出清楚的亮线
 */
export function envMap(renderer, { base = '#1c1d20', strip = '#ffffff', k = 5, fill = () => {} } = {}) {
  const es = new THREE.Scene();
  const B = (c, s = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(s), side: THREE.DoubleSide });
  const add = (w, h, pos, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(...pos); m.lookAt(0, 0, 0); es.add(m); return m; };
  if (base !== null) { const room = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), B(base)); room.material.side = THREE.BackSide; es.add(room); }
  const S = B(strip, k);
  add(0.9, 16, [-9, 3, -5], S); add(0.9, 16, [9, 3, -5], S); add(16, 0.9, [0, 12, 1], S);
  fill(add, B, es);
  const pm = new THREE.PMREMGenerator(renderer), tex = pm.fromScene(es, 0.02).texture;
  pm.dispose();
  es.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });   // 只释放环境场景自己的材质；共享的 uniform 对象不受影响
  return tex;
}

/** 值噪声（GLSL）：hash2 / vnoise / fbm。地形、雾带、叶脉都用它 */
export const NOISE = /* glsl */`
float hash2(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
`;

// ── 天色与雾 ──
/**
 * 视线方向 d 上的天色 haze(d)：地平线以上从 horizon 渐变到 zenith，以下是谷里的雾色 mist；太阳方向有日晕（glow），
 * 太阳一侧的低空和雾里有光束（rays：绕太阳按角度起伏的明暗条纹，随 hTime 缓缓变化；离太阳 90° 以内都看得到）。天空球、远山的雾、雾团都调同一个 haze，远处的东西就无缝融进天色里。
 * 返回 { uniforms, glsl }：把 uniforms 并进自己的 ShaderMaterial（共用同一份对象），glsl 放在着色器开头；逐帧只改 uniforms.hTime
 */
export function haze({ zenith, horizon, mist, sun: { dir, color, glow = 1, rays = 0 } }) {
  const uniforms = {
    hZenith: { value: new THREE.Color(zenith) }, hHorizon: { value: new THREE.Color(horizon) }, hMist: { value: new THREE.Color(mist) },
    hSunDir: { value: new THREE.Vector3(...dir).normalize() }, hSun: { value: new THREE.Color(color) },
    hGlow: { value: glow }, hRays: { value: rays }, hTime: { value: 0 },
  };
  const glsl = /* glsl */`
uniform vec3 hZenith, hHorizon, hMist, hSunDir, hSun; uniform float hGlow, hRays, hTime;
float hazeRays(vec3 d) {
  vec3 a1 = normalize(cross(hSunDir, vec3(0.0, 1.0, 0.0))), a2 = cross(a1, hSunDir);
  float a = atan(dot(d, a2), dot(d, a1));                               // 绕太阳的角度；频率都是整数，±π 处接得上
  return pow(0.5 + 0.5 * sin(a * 23.0 + 2.0 * sin(a * 9.0 + hTime * 0.12)), 3.0) * (0.55 + 0.45 * sin(a * 5.0 - hTime * 0.07));
}
vec3 haze(vec3 d) {
  vec3 c = d.y > 0.0 ? mix(hHorizon, hZenith, pow(min(d.y * 1.6, 1.0), 0.7)) : mix(hHorizon, hMist, min(-d.y * 7.0, 1.0));
  float cs = max(dot(d, hSunDir), 0.0);
  c += hSun * hGlow * (0.12 * cs * cs + 0.3 * pow(cs, 5.0) + 0.7 * pow(cs, 60.0));
  return c + hSun * hRays * hazeRays(d) * pow(cs, 1.5) * smoothstep(0.35, -0.04, d.y);
}
`;
  return { uniforms, glsl };
}

/** 天空球：每个方向画 haze(视线方向)。半径要小于相机远裁面（app.js 为 200 米）；进环境场景时用小半径（PMREM 的远裁面是 100）。不写深度、最先画 */
export function sky(hz, { R = 180 } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: hz.uniforms, side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `${hz.glsl}\nvarying vec3 vW;\nvoid main() { gl_FragColor = vec4(haze(normalize(vW - cameraPosition)), 1.0); }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 24), m);
  mesh.renderOrder = -10; mesh.frustumCulled = false;
  return mesh;
}

/**
 * 水珠（球透镜）：不走 three 的 transmission（那要把不透明的场景再画一遍），而是把视线解析地穿过一个球——进去折一次、出来折一次——
 * 出射方向上取 haze：水珠里是倒过来的天和地。地平线以下换成地面色 below，正上方换成挂着它的东西 above（比如逆光的叶子）；
 * 出射方向对准太阳的那一小片就是聚焦的日光，一个很亮的点（在水珠背着太阳的一侧），交给辉光去晕开。表面按菲涅耳反射天色和太阳的高光。
 * 几何用单位球（可以不等比缩放成椭球：法线按椭球算，光路按同体积的球近似）
 */
export function dewMaterial(hz, { below, above, ior = 1.33 }) {
  return new THREE.ShaderMaterial({
    uniforms: { ...hz.uniforms, uBelow: { value: new THREE.Color(below) }, uAbove: { value: new THREE.Color(above) }, uIor: { value: ior } },
    vertexShader: /* glsl */`
varying vec3 vW, vN, vC;
void main() {
  vW = (modelMatrix * vec4(position, 1.0)).xyz; vC = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vN = normalize((vec4(normalMatrix * normal, 0.0) * viewMatrix).xyz);   // 视空间法线转回世界（缩放不等比时也对）
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`,
    fragmentShader: /* glsl */`
${hz.glsl}
uniform vec3 uBelow, uAbove; uniform float uIor;
varying vec3 vW, vN, vC;
float sunAt(vec3 d, float k) { return pow(max(dot(d, hSunDir), 0.0), k); }
// 水珠里的天：haze 的渐变，日晕收窄（水珠把太阳附近压成一个亮点，整片日晕会把下半颗冲成白的）
vec3 look(vec3 d) {
  vec3 c = d.y > 0.0 ? mix(hHorizon, hZenith, pow(min(d.y * 1.6, 1.0), 0.7)) : mix(hHorizon, hMist, min(-d.y * 7.0, 1.0));
  c += hSun * hGlow * 0.3 * sunAt(d, 12.0);
  return mix(mix(c, uBelow, smoothstep(-0.02, -0.25, d.y)), uAbove, smoothstep(0.55, 0.85, d.y));
}
void main() {
  vec3 V = normalize(vW - cameraPosition), N = normalize(vN);
  float F = 0.02 + 0.98 * pow(1.0 - max(dot(-V, N), 0.0), 5.0);
  vec3 T = refract(V, N, 1.0 / uIor), P = vW - T * 2.0 * dot(vW - vC, T), N2 = normalize(P - vC), T2 = refract(T, -N2, uIor);
  if (dot(T2, T2) < 0.5) T2 = reflect(T, -N2);                          // 出口全反射：在里面反射一次，按反射方向取
  vec3 R = reflect(V, N);
  vec3 c = (1.0 - F) * 0.85 * (look(T2) + hSun * 60.0 * sunAt(T2, 250.0)) + F * (look(R) + hSun * 60.0 * sunAt(R, 1500.0));   // 0.85：两个水面的反射损失和一点散射
  gl_FragColor = vec4(c, 1.0);
}`,
  });
}

// ── 闭式漂浮粒子 ──
/**
 * 实例化网格：第 i 个在 t 时刻的位置、自转只由 (seed, i, t) 决定（particles.js 的 drift）。box = [x0, y0, z0, x1, y1, z1]；
 * size = [最小, 最大] 缩放；spin = 自转圈数倍率（绕每个实例自己的随机轴，0 = 不转）。绕回边界时按 fade 淡出：
 * 'scale' 缩小（实心的叶子、花瓣），'alpha' 写进 instanceColor（雾团、光斑这类自己读透明度的材质，见 billboards）
 */
export function driftField({ geometry, material, count, seed, box, vel, sway = 0, swayHz = 0.3, size = [1, 1], spin = 1, fade = 'scale' }) {
  const mesh = new THREE.InstancedMesh(geometry, material, count), o = new THREE.Object3D(), c = new THREE.Color();
  mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const r = (i, j) => rand(seed ^ 0x5bd1e995, i * 4 + j);             // drift 用 (seed, i*8+0..7)；大小和自转轴换个种子取
  const axes = Array.from({ length: count }, (_, i) => new THREE.Vector3(r(i, 0) - 0.5, r(i, 1) - 0.5, r(i, 2) - 0.5).normalize());
  function update(t) {
    for (let i = 0; i < count; i++) {
      const [x, y, z, ph, f] = drift(seed, i, t, box, { vel, sway, swayHz }), s = size[0] + (size[1] - size[0]) * r(i, 3);
      o.position.set(x, y, z); o.quaternion.setFromAxisAngle(axes[i], ph * 2 * Math.PI * spin);
      o.scale.setScalar(fade === 'scale' ? s * f : s); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
      if (fade === 'alpha') mesh.setColorAt(i, c.setScalar(f));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  update(0);
  return { mesh, update };
}

/**
 * 雾团 / 光斑的纹理：2 × 2 图集，每格一团不同的软噪声，alpha 从中心向边缘淡到 0。只由 seed 决定（Node 里也能建）
 */
export function puffAtlas(seed, N = 128) {
  const px = new Uint8Array(4 * N * N * 4), S = 2 * N, lat = 8;
  const g = (q, i, j) => rand(seed + q * 7919, (j % lat) * lat + (i % lat));
  const vn = (q, x, y) => {                                              // 周期 lat 的值噪声
    const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
    return (g(q, i, j) * (1 - a) + g(q, i + 1, j) * a) * (1 - b) + (g(q, i, j + 1) * (1 - a) + g(q, i + 1, j + 1) * a) * b;
  };
  for (let q = 0; q < 4; q++) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = (i + 0.5) / N * 2 - 1, y = (j + 0.5) / N * 2 - 1, r = Math.hypot(x, y);
    let n = 0, a = 0.5, f = 2;
    for (let o = 0; o < 4; o++) { n += a * vn(q, (x + 1) * f + o * 1.7, (y + 1) * f + o * 3.1); a *= 0.5; f *= 2; }
    const edge = Math.max(0, 1 - r) ** 1.5, k = Math.min(1, Math.max(0, (n - 0.28) * 2.2)) * edge;
    const X = (q % 2) * N + i, Y = Math.floor(q / 2) * N + j, p = 4 * (Y * S + X);
    px[p] = px[p + 1] = px[p + 2] = 255; px[p + 3] = Math.round(255 * k);
  }
  const tex = new THREE.DataTexture(px, S, S);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}

/**
 * 朝向相机的面片材质（配 driftField 的 fade: 'alpha'，几何用 PlaneGeometry(1, 1)）：每个实例取 puffAtlas 的一格（按实例号），
 * 透明度 = 纹理 alpha × instanceColor.r × opacity。颜色 = haze(视线方向) × tint，再加一点朝太阳的前向散射——雾团在天空前几乎看不见，挡在山前就把山冲淡。
 * aspect = 宽 / 高：谷里的雾是一层一层横着的，圆的雾团下半截被前景挡掉后，在横向的地形前面会读成一根根竖条
 */
export function billboards(hz, { map, tint = [1, 1, 1], opacity = 1, forward = 0, aspect = 1 }) {
  return new THREE.ShaderMaterial({
    uniforms: { ...hz.uniforms, map: { value: map }, tint: { value: new THREE.Vector3(...tint) }, opacity: { value: opacity }, forward: { value: forward }, aspect: { value: aspect } },
    transparent: true, depthWrite: false,
    vertexShader: /* glsl */`
uniform float aspect; varying vec2 vUv; varying vec3 vW; varying float vA;
void main() {
  vec3 c = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float s = length((modelMatrix * instanceMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vW = c + (right * position.x + up * position.y / aspect) * s;
  vUv = (uv + vec2(float(gl_InstanceID % 2), float((gl_InstanceID / 2) % 2))) * 0.5;
  #ifdef USE_INSTANCING_COLOR
    vA = instanceColor.r;
  #else
    vA = 1.0;
  #endif
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`,
    fragmentShader: /* glsl */`
${hz.glsl}
uniform sampler2D map; uniform vec3 tint; uniform float opacity, forward;
varying vec2 vUv; varying vec3 vW; varying float vA;
void main() {
  vec3 d = normalize(vW - cameraPosition);
  vec3 c = haze(d) * tint + hSun * forward * pow(max(dot(d, hSunDir), 0.0), 4.0);
  gl_FragColor = vec4(c, texture2D(map, vUv).a * vA * opacity);
}`,
  });
}
