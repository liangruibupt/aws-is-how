// bottle.js — 瓶子：厚底八角玻璃瓶（竖棱圆角、上下棱倒圆、正面磨砂 logo）、液体（贴壁弯月面 + 落滴涟漪）、金色颈圈、喷头（含吸管）、多棱瓶盖
// 组装态与分解态是同一套网格；原点在瓶底中心，尺寸取 meta.js 的 DIMS / EXPLODE
// 玻璃和液体这里先用半透明材质；Task 12 的 glass.js 换成分层折射，按导出的 SHAPE 算光在玻璃和液体里走的路程
import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { DIMS, EXPLODE } from '../meta.js';
import { FONTS } from '../copy.js';
import { fontStr } from '../../factory/engine/text.js';
import { clamp, ss } from '../../factory/engine/ease.js';

// ── 形状参数（米）──
// 外形：八角切角 chamfer（沿轴量）、竖棱圆角 round、上下棱倒圆 bevel；内腔：侧壁 wall、厚底 base、肩厚 shoulder、液体转角圆角 inner；
// 静止液面高 fill，贴壁处弯月面再高 meniscus；瓶颈外半径 neck
export const GLASS = { chamfer: 0.013, round: 0.0018, bevel: 0.0016, wall: 0.0045, base: 0.018, shoulder: 0.011, inner: 0.0012, fill: 0.074, meniscus: 0.0012, neck: 0.0085 };
// 落滴涟漪：振幅、波数、波前速度（米/秒）、时间衰减（1/秒）、距离衰减尺度（米）
export const RIPPLE = { amp: 0.0008, k: (2 * Math.PI) / 0.0075, c: 0.055, decay: 1.6, r0: 0.004 };

// ── 八角形 { a 半宽, b 半深, k 切角 }（x-z 平面）──
const S2 = Math.SQRT1_2;
/** 各边向内平移 w；切角边随之变短 */
const inset = (o, w) => ({ a: o.a - w, b: o.b - w, k: o.k - w * (2 - Math.SQRT2) });
/** 8 个顶点，按外法线角度 -45°, 0°, 45° … 的顺序（逆时针） */
const corners = ({ a, b, k }) => [[a, -b + k], [a, b - k], [a - k, b], [-a + k, b], [-a, b - k], [-a, -b + k], [-a + k, -b], [a - k, -b]];
/** 8 个半平面 [nx, nz, d]：内部满足 nx·x + nz·z ≤ d */
const planes = ({ a, b, k }) => { const c = (a + b - k) * S2; return [[1, 0, a], [-1, 0, a], [0, 1, b], [0, -1, b], [S2, S2, c], [S2, -S2, c], [-S2, S2, c], [-S2, -S2, c]]; };
/** 圆角八角形轮廓：先内收 r 再外扩 r，每个角是半径 r、seg 段的圆弧 */
function outline(o, r, seg = 6) {
  const out = [];
  corners(inset(o, r)).forEach(([x, z], i) => {
    for (let j = 0; j <= seg; j++) { const t = ((i - 1 + j / seg) * Math.PI) / 4; out.push([x + r * Math.cos(t), z + r * Math.sin(t)]); }
  });
  return out;
}
/** 八角形 o 上离 (x, z) 最近的点（点在里面就是它自己） */
function nearestOn(o) {
  const P = planes(o), C = corners(o);
  return (x, z) => {
    if (P.every(([nx, nz, d]) => nx * x + nz * z <= d)) return [x, z];
    let best = null, bd = Infinity;
    C.forEach(([ax, az], i) => {
      const [bx, bz] = C[(i + 1) % 8], ex = bx - ax, ez = bz - az, k = clamp(((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez));
      const px = ax + ex * k, pz = az + ez * k, d = (x - px) ** 2 + (z - pz) ** 2;
      if (d < bd) { bd = d; best = [px, pz]; }
    });
    return best;
  };
}

const OUT = { a: DIMS.w / 2, b: DIMS.d / 2, k: GLASS.chamfer }, CAV = inset(OUT, GLASS.wall), LIQ = inset(CAV, 0.0003);
/** 外形、内腔、液体的凸棱柱（半平面 + 高度范围）：glass.js 在着色器里用它们算光程 */
export const SHAPE = {
  outer: { planes: planes(OUT), y: [0, DIMS.body] },
  cavity: { planes: planes(CAV), y: [GLASS.base, DIMS.body - GLASS.shoulder] },
  liquid: { planes: planes(LIQ), y: [GLASS.base + 0.0003, GLASS.fill] },
};

/** 落滴涟漪：离落点 r 米、落下 age 秒后的液面起伏（米）。波前以 c 外扩，振幅随时间和距离衰减；age ≤ 0 时静止 */
export function rippleHeight(r, age, R = RIPPLE) {
  if (!(age > 0)) return 0;
  const behind = R.c * age - r;
  if (behind <= 0) return 0;
  return R.amp * Math.exp(-R.decay * age) * Math.sqrt(R.r0 / (r + R.r0)) * Math.sin(R.k * behind) * Math.min(1, behind / 0.003);
}

// ── 网格 ──
/** 圆角八角柱（竖棱圆角 r、上下棱倒圆 ρ < r、高 h，底面在 y = 0）：实体 = 八角核 inset(o, r) 外扩 r - ρ、高 [ρ, h - ρ]，再包一层半径 ρ 的球。
 *  逐层按倒圆角 θ 生成精确轮廓，法线是解析的：大面上法线处处相同，圆角与大面相切
 *  （toCreasedNormals 会把圆角的法线平均进大面，折射时整面像一块弱透镜） */
function prism(o, r, h, rho, seg = 6, bs = 5) {
  const K = corners(inset(o, r)), rr = r - rho, M = 8 * (seg + 1), pos = [], nor = [], idx = [];
  const ring = (y, off, ny, nh) => K.forEach(([x, z], i) => {
    for (let j = 0; j <= seg; j++) { const t = ((i - 1 + j / seg) * Math.PI) / 4, c = Math.cos(t), s = Math.sin(t); pos.push(x + off * c, y, z + off * s); nor.push(nh * c, ny, nh * s); }
  });
  for (let l = 0; l < 2 * bs + 2; l++) {                             // 下倒圆 θ = -90°…0°，上倒圆 θ = 0°…90°；两个 0° 层之间是竖直的侧面
    const top = l > bs, th = ((top ? l - bs - 1 : l - bs) / bs) * (Math.PI / 2);
    ring((top ? h - rho : rho) + rho * Math.sin(th), rr + rho * Math.cos(th), Math.sin(th), Math.cos(th));
  }
  const at = (l, m) => l * M + (m % M);
  for (let l = 0; l < 2 * bs + 1; l++) for (let m = 0; m < M; m++) idx.push(at(l, m), at(l + 1, m), at(l, m + 1), at(l, m + 1), at(l + 1, m), at(l + 1, m + 1));
  for (const [y, ny] of [[0, -1], [h, 1]]) {                         // 底面、顶面：从中心扇形铺开
    const c = pos.length / 3;
    pos.push(0, y, 0); nor.push(0, ny, 0); ring(y, rr, ny, 0);
    for (let m = 0; m < M; m++) { const p = c + 1 + m, q = c + 1 + ((m + 1) % M); idx.push(...(ny > 0 ? [c, q, p] : [c, p, q])); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  return g;
}
/** 回转体用：toCreasedNormals 按 0.01 单位合并同位置顶点，先放大到毫米再算 */
function creased(g, angle) {
  g.deleteAttribute('normal'); g.scale(1000, 1000, 1000);
  const r = toCreasedNormals(g, angle); r.scale(0.001, 0.001, 0.001);
  return r;
}
/** 回转体：profile 为 [半径, 高]，沿逆时针走（实体在前进方向左侧，法线朝外） */
const lathe = (profile, crease = 0.7) => creased(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 72), crease);

// ── 液体：侧壁 + 底（静态）与液面网格（弯月面 + 涟漪，逐帧改顶点）──
const RAYS = 128, RINGS = 48;
/** 闭合折线按弧长重采样成 n 个点 */
function resample(P, n) {
  const len = P.map((p, i) => Math.hypot(P[(i + 1) % P.length][0] - p[0], P[(i + 1) % P.length][1] - p[1])), total = len.reduce((s, x) => s + x, 0), out = [];
  for (let j = 0, i = 0, acc = 0; j < n; j++) {
    const at = (j / n) * total;
    while (acc + len[i] < at) acc += len[i++];
    const f = (at - acc) / len[i], p = P[i], q = P[(i + 1) % P.length];
    out.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]);
  }
  return out;
}
function liquidBody(B, y0, y1, near) {
  const n = B.length, pos = [], nor = [], idx = [];
  for (const [x, z] of B) {
    const [qx, qz] = near(x, z), L = Math.hypot(x - qx, z - qz);
    pos.push(x, y0, z, x, y1, z); nor.push((x - qx) / L, 0, (z - qz) / L, (x - qx) / L, 0, (z - qz) / L);
  }
  for (let i = 0; i < n; i++) { const a = 2 * i, b = 2 * ((i + 1) % n); idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const c = pos.length / 3; pos.push(0, y0, 0); nor.push(0, -1, 0);
  for (const [x, z] of B) { pos.push(x, y0, z); nor.push(0, -1, 0); }
  for (let i = 0; i < n; i++) idx.push(c, c + 1 + i, c + 1 + ((i + 1) % n));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  return g;
}
/** 液面：中心点 + RINGS 圈（每圈是轮廓按比例缩小，越靠壁越密：弯月面只有一两毫米宽）；r 离中心的距离，dw 离壁的距离 */
function liquidSurface(B) {
  const n = B.length, pos = [0, 0, 0], r = [0], dw = [Infinity], idx = [];
  for (let j = 1; j <= RINGS; j++) {
    const s = 1 - (1 - j / RINGS) ** 2;
    for (const [x, z] of B) { pos.push(x * s, 0, z * s); r.push(Math.hypot(x, z) * s); dw.push(Math.hypot(x, z) * (1 - s)); }
  }
  const at = (j, i) => 1 + (j - 1) * n + (i % n);
  for (let i = 0; i < n; i++) idx.push(0, at(1, i + 1), at(1, i));
  for (let j = 1; j < RINGS; j++) for (let i = 0; i < n; i++) idx.push(at(j, i), at(j, i + 1), at(j + 1, i), at(j, i + 1), at(j + 1, i + 1), at(j + 1, i));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  return { g, r, dw };
}

// ── 金属件 ──
const CAPS = {
  silver: { color: '#cfd2d6', metalness: 1, roughness: 0.16 },
  gold: { color: '#e2b660', metalness: 1, roughness: 0.2 },
  frost: { color: '#e6ecee', metalness: 0, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 },
  lacquer: { color: '#16131a', metalness: 0, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.04 },
};
const ACT = { y: DIMS.collar + 0.0025, h: 0.009, r: 0.0066, travel: 0.002 };   // 喷头按钮：底面高度（相对瓶口）、高、半径、按下行程
/** 喷头：原点在瓶口（组装时 y = 瓶身高）。按钮在颈圈上方（组装时藏在瓶盖里），喷嘴朝 -x；泵室在瓶口下，吸管伸到内腔底 */
function buildPump() {
  const g = new THREE.Group(), act = new THREE.Group();
  const chrome = new THREE.MeshPhysicalMaterial({ color: '#d6d8db', metalness: 1, roughness: 0.18 });
  const plastic = new THREE.MeshPhysicalMaterial({ color: '#ecebe6', roughness: 0.3, clearcoat: 0.4 });
  const button = new THREE.Mesh(new THREE.CylinderGeometry(ACT.r - 0.0005, ACT.r, ACT.h, 48), chrome);
  button.position.y = ACT.h / 2;
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 0.001, 16), new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.6 }));
  nozzle.rotation.z = Math.PI / 2; nozzle.position.set(-(ACT.r - 0.0003), ACT.h * 0.65, 0);
  const stemL = ACT.y + 0.003, stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, stemL, 16), chrome);
  stem.position.y = -stemL / 2;                                     // 跟着按钮走，按下时滑进泵室
  act.add(button, nozzle, stem); act.position.y = ACT.y;
  const chamber = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0038, 0.015, 32), plastic);
  chamber.position.y = -0.0085;
  const drop = DIMS.body - GLASS.base - 0.0025;                     // 吸管底离内腔底 2.5 毫米
  const path = new THREE.CatmullRomCurve3([[0, -0.016, 0], [0, -drop * 0.55, 0.0006], [0.0035, -drop, 0.0022]].map(p => new THREE.Vector3(...p)));
  const tube = new THREE.Mesh(new THREE.TubeGeometry(path, 64, 0.0011, 10), plastic);
  g.add(act, chamber, tube);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return { g, act };
}

/** 接触阴影：瓶底下一块柔和的暗斑（玻璃和液体不投影，否则是一整块黑影）；用数据纹理，Node 测试里也能建 */
function contactShadow() {
  const N = 64, px = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = ((i + 0.5) / N) * 2 - 1, y = ((j + 0.5) / N) * 2 - 1;
    px[(j * N + i) * 4 + 3] = Math.round(255 * (1 - ss(0.3, 1, Math.hypot(x, y))) ** 1.6);
  }
  const tex = new THREE.DataTexture(px, N, N); tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(DIMS.w * 1.45, DIMS.d * 1.9), new THREE.MeshBasicMaterial({ color: '#000', map: tex, transparent: true, opacity: 0.55, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.0004; m.renderOrder = -1;
  return m;
}

/** 正面磨砂 logo 的粗糙度贴图（只在浏览器里用）：近黑 = 光面，白 = 磨砂。按 u = x / 瓶宽 + 0.5、v = y / 瓶身高 贴在正面 */
export async function logoMask() {
  const zh = FONTS.zh.display, en = FONTS.en.display;
  const faces = await Promise.all([document.fonts.load(fontStr(zh, 100), '闻境'), document.fonts.load(fontStr(en, 100), 'WENJING')]);
  if (faces.some(f => !f.length)) throw new Error(`logo fonts not loaded: ${zh.family} / ${en.family}`);
  const c = document.createElement('canvas'), W = 1024;
  c.width = W; c.height = Math.round((W * DIMS.body) / DIMS.w);
  const g = c.getContext('2d');
  g.fillStyle = '#0d0d0d'; g.fillRect(0, 0, W, c.height);           // 0.6 × 13/255 ≈ 0.03：光面玻璃的粗糙度
  g.fillStyle = '#fff'; g.textAlign = 'center';
  g.font = fontStr(zh, W * 0.15); g.letterSpacing = `${W * 0.05}px`; g.fillText('闻境', W / 2 + W * 0.025, c.height * 0.58);
  g.font = fontStr(en, W * 0.052); g.letterSpacing = `${W * 0.03}px`; g.fillText('WENJING', W / 2 + W * 0.015, c.height * 0.645);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8;
  return t;
}

/** sku = SKUS[...]；logo = logoMask() 的纹理（Node 测试里不传） */
export function buildBottle(ctx, sku, { logo = null } = {}) {
  const { body, collar: CH } = DIMS, root = new THREE.Group();
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: logo ? 0.6 : 0.03, roughnessMap: logo, transparent: true, opacity: 0.3, depthWrite: false });
  const glass = new THREE.Mesh(prism(OUT, GLASS.round, body, GLASS.bevel), glassMat);
  // logo 按正面平面投影；朝后的面把 u 移出贴图（夹到边上的光面像素），否则从正面会透过玻璃看到背面一个反字
  const p = glass.geometry.attributes.position, nz = glass.geometry.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[2 * i] = p.getX(i) / DIMS.w + 0.5 + (nz.getZ(i) < -0.5 ? 3 : 0); uv[2 * i + 1] = p.getY(i) / body; }
  glass.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const neck = new THREE.Mesh(lathe([[GLASS.neck * 1.04, 0], [GLASS.neck, 0.0105], [0.0035, 0.0105], [0.0035, 0.006]]), glassMat);
  neck.position.y = body; glass.add(neck);

  const rl = GLASS.inner, B = outline(LIQ, rl, 12), near = nearestOn(inset(LIQ, rl)), [y0] = SHAPE.liquid.y;
  const liqMat = new THREE.MeshPhysicalMaterial({ color: sku.liquid.color, roughness: 0.08, transparent: true, opacity: 0.85 });
  const ring = resample(B, RAYS), liquid = new THREE.Mesh(liquidBody(ring, y0, GLASS.fill + GLASS.meniscus, near), liqMat);
  const surf = liquidSurface(ring), surface = new THREE.Mesh(surf.g, liqMat);
  liquid.add(surface);
  glass.renderOrder = neck.renderOrder = 2; liquid.renderOrder = surface.renderOrder = 1;

  const gold = new THREE.MeshPhysicalMaterial({ color: '#e0b25c', metalness: 1, roughness: 0.22 });
  const R = 0.0125;                                                 // 颈圈：套在瓶颈上的金属圈，顶上一道唇边压住泵，外壁一道凹槽
  const coll = new THREE.Mesh(lathe([[0.0045, CH], [0.0045, CH - 0.0012], [0.009, CH - 0.0012], [0.009, 0], [R - 0.0004, 0], [R, 0.0005], [R, 0.0042],
    [R - 0.0006, 0.0048], [R - 0.0006, 0.0056], [R, 0.0062], [R, CH - 0.0006], [R - 0.0006, CH], [0.0045, CH]]), gold);
  const { g: pump, act } = buildPump();
  const cap = new THREE.Mesh(prism({ a: 0.018, b: 0.018, k: 0.0075 }, 0.002, DIMS.cap, 0.0014), new THREE.MeshPhysicalMaterial(CAPS[sku.cap]));
  coll.castShadow = cap.castShadow = true;
  root.add(glass, liquid, coll, pump, cap, contactShadow());

  // 液面高度只由 age 决定：静止时是弯月面，有涟漪时叠加波纹，贴壁 3 毫米内波纹收掉；同一个 age 不重算
  const sp = surf.g.attributes.position;
  let shown = NaN;
  function shapeSurface(age) {
    age = age > 0 ? age : 0;
    if (age === shown) return;
    for (let i = 0; i < sp.count; i++) sp.setY(i, GLASS.fill + GLASS.meniscus * Math.exp(-surf.dw[i] / 0.0011) + rippleHeight(surf.r[i], age) * ss(0, 0.003, surf.dw[i]));
    sp.needsUpdate = true; surf.g.computeVertexNormals(); shown = age;
  }

  const parts = { glass, liquid, collar: coll, pump, cap };
  // 引线和特效的端点（部件本地坐标）
  const ANCHOR = { cap: [cap, [0, DIMS.cap / 2, 0]], collar: [coll, [0, CH / 2, 0]], liquid: [liquid, [0, (GLASS.base + GLASS.fill) / 2, 0]], nozzle: [act, [-(ACT.r + 0.0006), ACT.h * 0.65, 0]] };
  const _v = new THREE.Vector3();
  const bottle = {
    root, parts,
    /** explode 0..1 分解程度；capLift 瓶盖额外上抬（米）；press 喷头按下 0..1；ripple 水滴落进液面后的秒数（≤ 0 = 静止）。每次都是完整姿态，没写的量回到默认 */
    pose({ explode = 0, capLift = 0, press = 0, ripple = 0 } = {}) {
      coll.position.y = body + EXPLODE.collar * explode;
      pump.position.y = body + EXPLODE.pump * explode;
      act.position.y = ACT.y - ACT.travel * press;
      cap.position.y = body + CH + EXPLODE.cap * explode + capLift;
      shapeSurface(ripple);
      root.updateMatrixWorld(true);
    },
    /** 端点的世界坐标：'cap' | 'collar' | 'liquid' | 'nozzle' */
    anchor(name) { const [o, q] = ANCHOR[name]; return o.localToWorld(_v.set(...q)).toArray(); },
    /** 静止液面的世界 y */
    liquidTop: () => liquid.localToWorld(_v.set(0, GLASS.fill, 0)).y,
  };
  bottle.pose();
  return bottle;
}
