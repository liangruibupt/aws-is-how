// kit.js — 共用工具：程序纹理、金属材质、几何缓存，以及可变形骨架 Rig
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const DEG = Math.PI / 180;
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const EASE = {
  lin: t => t,
  io: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  back: t => { const c = 1.3; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },   // 到位略冲过再回弹
};

export function rng(seed = 1) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────────────────────── 程序纹理 ─────────────────────────
const cv = (w, h = w) => Object.assign(document.createElement('canvas'), { width: w, height: h });

function tx(c, { srgb = false, repeat = [1, 1], aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return t;
}

/** 灰度高度图 → 切线空间法线图（OpenGL 约定） */
function heightToNormal(h, k = 2) {
  const w = h.width, hh = h.height, src = h.getContext('2d').getImageData(0, 0, w, hh).data;
  const c = cv(w, hh), g = c.getContext('2d'), img = g.createImageData(w, hh), d = img.data;
  const H = (x, y) => src[((((y % hh) + hh) % hh) * w + (((x % w) + w) % w)) * 4] / 255;
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * k, dy = (H(x, y + 1) - H(x, y - 1)) * k;
    const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/**
 * 霸天虎徽记（按 G1 线稿描摹）：右半中心线，单位 = 徽记高（角尖 y=0 → 下巴 y=1），x 朝外。
 * 外轮廓、冠线、两道颊线为等宽描边；双眼、鼻为实心；两侧各两道细须。
 */
const EM = {
  tip: [0.418, 0], bend: [0.312, 0.138], join: [0.135, 0.202], prong: [0.144, 0], notch: [0, 0.171],
  corner: [0.333, 0.83], chin: [0, 1], cheek: [0.373, 0.44],
  crest: [[0.109, 0.318], [0.088, 0.418], [0, 0.52]],
  eye: [[0.238, 0.482], [0.035, 0.541], [0.039, 0.588], [0.081, 0.645]],
  nose: [[0.024, 0.28], [0, 0.355], [-0.024, 0.28]],
  whisker: [[[0.272, 0.29], [0.14, 0.335]], [[0.26, 0.37], [0.13, 0.414]]],
};
const mir = ([x, y]) => [-x, y];
const EM_OUT = [EM.chin, EM.corner, EM.tip, EM.bend, EM.join, EM.prong, EM.notch, ...[EM.prong, EM.join, EM.bend, EM.tip, EM.corner].map(mir)];
const EM_CREST = [EM.join, ...EM.crest, ...EM.crest.slice(0, 2).reverse().map(mir), mir(EM.join)];
/** 描边围出的四块空白：冠、脸（含双眼与须）、左右下颌 */
const EM_REG = [
  [EM.notch, EM.prong, ...EM_CREST, mir(EM.prong)],
  [EM.tip, EM.bend, ...EM_CREST, mir(EM.bend), mir(EM.tip), mir(EM.cheek), EM.chin, EM.cheek],
  [EM.cheek, EM.corner, EM.chin],
  [mir(EM.cheek), EM.chin, mir(EM.corner)],
];

/** 多边形等距偏移（d>0 向外）；斜接超过 lim 倍时削成平头，免得角尖拉出长刺 */
function offsetPoly(pts, d, lim = 3) {
  const n = pts.length;
  let A = 0;
  for (let i = 0; i < n; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n]; A += x0 * y1 - x1 * y0; }
  const sg = Math.sign(A), out = [];
  const dir = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
  pts.forEach((p, i) => {
    const t1 = dir(pts[(i + n - 1) % n], p), t2 = dir(p, pts[(i + 1) % n]);
    const n1 = [t1[1] * sg, -t1[0] * sg], n2 = [t2[1] * sg, -t2[0] * sg];
    let mx = n1[0] + n2[0], my = n1[1] + n2[1]; const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;
    const c = mx * n1[0] + my * n1[1], k = 1 / Math.max(1e-4, c);
    if (k <= lim) { out.push([p[0] + mx * d * k, p[1] + my * d * k]); return; }
    for (const [nn, t] of [[n1, t1], [n2, t2]]) {                    // 平头：两条偏移边与削切线的交点
      const s = d * (lim - c) / (t[0] * mx + t[1] * my);
      out.push([p[0] + nn[0] * d + t[0] * s, p[1] + nn[1] * d + t[1] * s]);
    }
  });
  return out;
}
const bar = ([a, b], w) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = -dy / l * w / 2, ny = dx / l * w / 2; return [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]]; };

/** 线宽 w 下的各块多边形：描边外缘 outer、空白 holes、实心 fills（双眼、鼻）、细须 thin */
function emblemParts(w) {
  return {
    outer: offsetPoly(EM_OUT, w / 2),
    holes: EM_REG.map(r => offsetPoly(r, -w / 2, 8)),
    fills: [EM.eye, EM.eye.map(mir).reverse(), EM.nose],
    thin: EM.whisker.flatMap(s => [s, s.map(mir)]).map(s => bar(s, w * 0.45)),
  };
}

/**
 * 挤出用 Shape 数组，整体高 ≈ size，以原点为中心。
 * 默认为凸起的线稿（贴在紫色面板上）；badge>0 为徽章：紫色盾形底板镂出线稿，露出下面的车漆，badge 为底板外沿宽。
 */
export function emblemShape(size = 1, { w = 0.045, badge = 0 } = {}) {
  const P = emblemParts(w), rim = badge ? offsetPoly(EM_OUT, w / 2 + badge, 2) : P.outer;
  const ys = rim.map(p => p[1]), y0 = Math.min(...ys), k = size / (Math.max(...ys) - y0), yc = y0 + 0.5 / k * size;
  const V = ([x, y]) => new THREE.Vector2(x * k, (yc - y) * k);
  const S = (pts, holes = []) => { const s = new THREE.Shape(pts.map(V)); for (const h of holes) s.holes.push(new THREE.Path(h.map(V))); return s; };
  if (!badge) return [S(P.outer, P.holes), ...P.fills.map(f => S(f)), ...P.thin.map(f => S(f))];
  const [crest, face, jawR, jawL] = P.holes;
  return [S(rim, [P.outer]), S(crest, [P.fills[2]]), S(face, [P.fills[0], P.fills[1], ...P.thin]), S(jawR), S(jawL)];
}
/** 车门徽章：线条略粗，远处也看得清 */
export const emblemBadge = size => emblemShape(size, { w: 0.065, badge: 0.05 });

/** SVG path：line 用 evenodd 填充；whisker 为细须，可单独调淡。徽记中心在原点，高 ≈ size */
export function emblemPath(size = 100, w = 0.05) {
  const P = emblemParts(w), k = size / 1.1;
  const d = pts => 'M' + pts.map(([x, y]) => `${(x * k).toFixed(2)} ${((y - 0.48) * k).toFixed(2)}`).join('L') + 'Z';
  return { line: [P.outer, ...P.holes, ...P.fills].map(d).join(''), whisker: P.thin.map(d).join('') };
}

function drawEmblem(g, cx, cy, h, fill, fillW, w = 0.045) {
  const P = emblemParts(w);
  const path = list => { g.beginPath(); for (const pts of list) { pts.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](cx + x * h, cy + y * h)); g.closePath(); } };
  path([P.outer, ...P.holes, ...P.fills]); g.fillStyle = fill; g.fill('evenodd');
  path(P.thin); g.fillStyle = fillW; g.fill();
}

export function makeTextures(renderer) {
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const T = {};

  // 金属漆的细闪：逐像素微扰法线（清漆层保持光滑）
  {
    const c = cv(256), g = c.getContext('2d'), img = g.createImageData(256, 256), d = img.data, r = rng(7);
    for (let i = 0; i < d.length; i += 4) {
      const a = r() * Math.PI * 2, s = Math.pow(r(), 2) * 0.5, x = Math.cos(a) * s, y = Math.sin(a) * s, z = Math.sqrt(1 - x * x - y * y);
      d[i] = (x * 0.5 + 0.5) * 255; d[i + 1] = (y * 0.5 + 0.5) * 255; d[i + 2] = (z * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    T.flake = tx(c, { repeat: [3, 3], aniso });
  }

  // 磨损：斑驳 + 划痕（作粗糙度图，G 通道）
  {
    const c = cv(512), g = c.getContext('2d'), r = rng(11);
    g.fillStyle = '#8c8c8c'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 240; i++) {
      const x = r() * 512, y = r() * 512, rad = 10 + r() * 60, v = r() < 0.5 ? 190 : 110;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(${v},${v},${v},${0.1 + r() * 0.14})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    g.lineCap = 'round';
    for (let i = 0; i < 520; i++) {
      const x = r() * 512, y = r() * 512, a = r() * Math.PI, l = 5 + r() * 38;
      g.strokeStyle = `rgba(235,235,235,${0.12 + r() * 0.4})`; g.lineWidth = 0.5 + r() * 1.1;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    T.wear = tx(c, { aniso });
  }

  // 轮胎胎面：人字花纹
  {
    const c = cv(256, 64), g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#fff';
    for (let i = 0; i < 8; i++) {
      const x = i * 32;
      g.beginPath(); g.moveTo(x, 2); g.lineTo(x + 13, 2); g.lineTo(x + 25, 32); g.lineTo(x + 13, 62); g.lineTo(x, 62); g.lineTo(x + 12, 32); g.closePath(); g.fill();
    }
    g.filter = 'blur(1px)'; g.drawImage(c, 0, 0);
    T.tread = tx(heightToNormal(c, 4), { repeat: [3, 1], aniso });
  }

  // 黄黑警示斜纹
  {
    const c = cv(256, 64), g = c.getContext('2d');
    g.fillStyle = '#f0b70c'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#15151a';
    for (let x = -128; x < 256 + 64; x += 64) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 32, 64); g.lineTo(x + 96, 0); g.lineTo(x + 64, 0); g.closePath(); g.fill(); }
    T.hazard = tx(c, { srgb: true, aniso });
  }

  // 混凝土地面：颜色 + 粗糙度（油渍处更光滑）
  {
    const S = 1024, c = cv(S), g = c.getContext('2d'), rc = cv(S), gr = rc.getContext('2d'), r = rng(3);
    g.fillStyle = '#5c5e60'; g.fillRect(0, 0, S, S);
    gr.fillStyle = '#d8d8d8'; gr.fillRect(0, 0, S, S);
    for (let i = 0; i < 900; i++) {
      const x = r() * S, y = r() * S, rad = 6 + r() * 90, dark = r() < 0.55;
      const a = 0.03 + r() * 0.07, grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, dark ? `rgba(20,20,22,${a})` : `rgba(160,158,150,${a})`); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 26; i++) {                                           // 油渍
      const x = r() * S, y = r() * S, rad = 30 + r() * 110;
      for (const [ctx, col] of [[g, 'rgba(12,12,14,.22)'], [gr, 'rgba(40,40,40,.55)']]) {
        const grd = ctx.createRadialGradient(x, y, 0, x, y, rad); grd.addColorStop(0, col); grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    }
    const img = g.getImageData(0, 0, S, S), d = img.data;                      // 细颗粒
    for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(img, 0, 0);
    g.strokeStyle = 'rgba(15,15,16,.8)'; g.lineWidth = 3;                     // 伸缩缝
    for (const p of [1, S / 2]) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, S); g.moveTo(0, p); g.lineTo(S, p); g.stroke(); }
    g.strokeStyle = 'rgba(20,20,22,.5)'; g.lineWidth = 1.2;                   // 裂纹
    for (let i = 0; i < 14; i++) {
      let x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 9; k++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); }
      g.stroke();
    }
    T.concrete = tx(c, { srgb: true, repeat: [7, 7], aniso });
    T.concreteR = tx(rc, { repeat: [7, 7], aniso });
  }

  // 墙板：接缝、铆钉、底部污迹
  {
    const c = cv(512), g = c.getContext('2d'), r = rng(5);
    g.fillStyle = '#6c737b'; g.fillRect(0, 0, 512, 512);
    const grd = g.createLinearGradient(0, 0, 0, 512); grd.addColorStop(0, 'rgba(255,255,255,.05)'); grd.addColorStop(1, 'rgba(10,8,6,.45)');
    g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 2 + r() * 70, 1 + r() * 30); }
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 6; g.strokeRect(3, 3, 506, 506);
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; g.strokeRect(9, 9, 494, 494);
    g.fillStyle = 'rgba(20,20,20,.55)';
    for (let k = 24; k < 512; k += 44) for (const [x, y] of [[18, k], [494, k], [k, 18], [k, 494]]) { g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill(); }
    T.wall = tx(c, { srgb: true, aniso });
  }

  // 地面徽记（半透明漆）
  {
    const c = cv(512), g = c.getContext('2d');
    drawEmblem(g, 256, 44, 420, 'rgba(92,66,170,.85)', 'rgba(92,66,170,.45)');
    T.floorEmblem = tx(c, { srgb: true, aniso });
  }

  // 粒子贴图：柔光团、光锥渐变
  {
    const c = cv(64), g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    [[0, 1], [0.18, 0.62], [0.42, 0.2], [0.7, 0.04], [1, 0]].forEach(([k, a]) => grd.addColorStop(k, `rgba(255,255,255,${a})`));   // 近高斯衰减：加色叠加时不出硬边圆盘
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    T.sprite = tx(c, { srgb: false });
    const k = cv(16, 256), gk = k.getContext('2d'), gl = gk.createLinearGradient(0, 0, 0, 256);
    gl.addColorStop(0, '#fff'); gl.addColorStop(0.25, '#9a9a9a'); gl.addColorStop(1, '#000');
    gk.fillStyle = gl; gk.fillRect(0, 0, 16, 256);
    T.cone = tx(k);
    T.cone.wrapS = T.cone.wrapT = THREE.ClampToEdgeWrapping;
  }
  return T;
}

// ───────────────────────── 材质 ─────────────────────────
/**
 * 高光钳制：平整的轮毂 / 漆面正对点光源时 GGX 峰值可达数百，整片反成白盘；
 * 顶面在掠射角下又会把门洞、灯带整面镜像出来。直射、环境两项分别封顶，只削峰、不改形状。
 */
function tameSpec(sh) {
  sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
	reflectedLight.directSpecular = min( reflectedLight.directSpecular, vec3( 0.6 ) );
	reflectedLight.indirectSpecular = min( reflectedLight.indirectSpecular, vec3( 1.2 ) );
#ifdef USE_CLEARCOAT
	clearcoatSpecularDirect = min( clearcoatSpecularDirect, vec3( 0.6 ) );
	clearcoatSpecularIndirect = min( clearcoatSpecularIndirect, vec3( 0.9 ) );
#endif`);
}

/** 每名成员一套材质：便于「识别」模式下单独着色、高亮 */
export function makeMaterials(T, paint = '#7cc41c') {
  const flakeN = new THREE.Vector2(0.18, 0.18);
  const P = o => Object.assign(new THREE.MeshPhysicalMaterial(o), { onBeforeCompile: tameSpec });
  const S = o => Object.assign(new THREE.MeshStandardMaterial(o), { onBeforeCompile: tameSpec });
  const coat = { roughnessMap: T.wear, normalMap: T.flake, normalScale: flakeN, clearcoat: 1, clearcoatRoughness: 0.14 };
  return {
    paint: P({ color: paint, metalness: 0.6, roughness: 0.42, ...coat }),
    paintDark: P({ color: '#4d7c13', metalness: 0.55, roughness: 0.66, ...coat, clearcoat: 0.8, clearcoatRoughness: 0.18 }),
    purple: P({ color: '#8b70ea', metalness: 0.5, roughness: 0.6, ...coat }),
    steel: S({ color: '#a7b0b9', metalness: 1, roughness: 0.62, roughnessMap: T.wear }),
    chrome: S({ color: '#f1f3f5', metalness: 1, roughness: 0.17 }),
    dark: S({ color: '#3a3f46', metalness: 0.85, roughness: 0.6, roughnessMap: T.wear }),
    black: S({ color: '#1b1d21', metalness: 0.7, roughness: 0.48 }),
    rubber: S({ color: '#17181a', metalness: 0, roughness: 0.9, normalMap: T.tread, normalScale: new THREE.Vector2(1.3, 1.3) }),
    rubberSide: S({ color: '#1a1b1e', metalness: 0, roughness: 0.82 }),
    glass: P({ color: '#0b151d', metalness: 0.2, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.08 }),
    lensW: S({ color: '#ffffff', emissive: '#fff1d2', emissiveIntensity: 2.4 }),
    lensA: S({ color: '#ffb347', emissive: '#ff9416', emissiveIntensity: 1.6 }),
    lensR: S({ color: '#ff5040', emissive: '#ff2414', emissiveIntensity: 1.2 }),
    hazard: S({ map: T.hazard, metalness: 0.35, roughness: 0.5 }),
    rock: S({ color: '#6d5a45', metalness: 0, roughness: 0.95 }),
    cone: new THREE.MeshBasicMaterial({ color: '#fff0cc', alphaMap: T.cone, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }),
  };
}

// ───────────────────────── 几何缓存 ─────────────────────────
const GC = new Map();
const key = (...a) => a.map(v => (typeof v === 'number' ? v.toFixed(3) : v)).join('|');
const cached = (k, make) => GC.get(k) || GC.set(k, make()).get(k);

export const boxGeo = (w, h, d, r = 0.03) => cached(key('b', w, h, d, r), () => {
  const rr = Math.min(r, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002);
  return rr > 0.005 ? new RoundedBoxGeometry(w, h, d, 2, rr) : new THREE.BoxGeometry(w, h, d);
});
/** 圆柱：axis = 'y' | 'x' | 'z' */
export const cylGeo = (rt, rb, h, axis = 'y', seg = 24, open = false) => cached(key('c', rt, rb, h, axis, seg, open), () => {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
  if (axis === 'x') g.rotateZ(-Math.PI / 2); else if (axis === 'z') g.rotateX(Math.PI / 2);
  return g;
});

/** 沿 X 轴的空心环带（轮胎侧壁、轮辋边） */
const ringX = (r0, r1, seg = 32) => cached(key('rx', r0, r1, seg), () => new THREE.RingGeometry(r0, r1, seg).rotateY(Math.PI / 2));

// ───────────────────────── 骨架 Rig ─────────────────────────
const _q = new THREE.Quaternion(), _q0 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v0 = new THREE.Vector3();
const _w = new THREE.Vector3(), _d = new THREE.Vector3(), _m = new THREE.Matrix4(), _s = new THREE.Vector3(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0), XA = new THREE.Vector3(1, 0, 0);
export const quatEuler = (x, y, z, o = 'XYZ') => new THREE.Quaternion().setFromEuler(new THREE.Euler(x * DEG, y * DEG, z * DEG, o));
/** 车辆坐标轴 X/Y/Z 在世界中的指向 → 四元数 */
export const basis = (x, y, z) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...x), new THREE.Vector3(...y), new THREE.Vector3(...z)));

/**
 * 一名成员 = 若干「部件」组成的树。每个部件绕自己的枢轴转动、平移；
 * moves 描述变形进度 u∈[0,1] 内的动作：{ t:[a,b], r:[x,y,z]° | q, p:[dx,dy,dz], s, e:缓动 }
 * 坐标约定：默认以「车辆坐标」（车头 +Z、车顶 +Y）给出绝对位置；frame:true 的部件其子内容改用局部坐标。
 */
export class Rig {
  constructor(id, M) {
    Object.assign(this, { id, m: M, parts: new Map(), list: [], wheels: [], tracks: [], pistons: [], cones: [], anchors: {}, after: [] });
    this.root = new THREE.Group(); this.root.name = id;
    this.body = new THREE.Group(); this.root.add(this.body);                // 行驶时的颠簸
    this.u = 0;
  }

  part(name, parent, pivot, moves = [], o = {}) {
    const par = typeof parent === 'string' ? this.parts.get(parent) : parent;
    const g = new THREE.Group(); g.name = `${this.id}:${name}`;
    const pv = new THREE.Vector3(...pivot);
    const base = par && par.local ? pv.clone() : par ? pv.clone().sub(par.pivot) : pv.clone();
    const q0 = o.q0 ? o.q0.clone() : o.rot0 ? quatEuler(...o.rot0) : new THREE.Quaternion();
    g.position.copy(base); g.quaternion.copy(q0);
    (par ? par.g : this.body).add(g);
    const P = { name, g, pivot: pv, base, q0, local: !!(o.frame || (par && par.local)), rot: [], pos: [], scl: [] };
    for (const m of moves) {
      const [a, b] = m.t, e = EASE[m.e || 'io'];
      if (m.r || m.q) P.rot.push({ a, b, e, q: q0.clone().multiply(m.q || quatEuler(m.r[0], m.r[1], m.r[2], m.o)) });
      if (m.p) P.pos.push({ a, b, e, v: new THREE.Vector3(...m.p) });
      if (m.s != null) P.scl.push({ a, b, e, v: m.s });
    }
    for (const k of ['rot', 'pos', 'scl']) P[k].sort((x, y) => x.a - y.a);
    this.parts.set(name, P); this.list.push(P);
    return P;
  }

  /** 修改某个部件第 i 个平移动作的目标（用于装配时求解长度） */
  setPos(name, i, p) { this.parts.get(name).pos[i].v.set(...p); }

  pose(u) {
    this.u = u;
    const k = m => (u >= m.b ? 1 : m.e((u - m.a) / (m.b - m.a)));
    for (const P of this.list) {
      if (P.rot.length) {
        _q.copy(P.q0);
        for (const m of P.rot) { if (u <= m.a) break; _q0.copy(_q); _q.slerpQuaternions(_q0, m.q, k(m)); }
        P.g.quaternion.copy(_q);
      }
      if (P.pos.length) {
        _v.set(0, 0, 0);
        for (const m of P.pos) { if (u <= m.a) break; _v0.copy(_v); _v.lerpVectors(_v0, m.v, k(m)); }
        P.g.position.copy(P.base).add(_v);
      }
      if (P.scl.length) {
        let s = 1;
        for (const m of P.scl) { if (u <= m.a) break; s = lerp(s, m.v, k(m)); }
        P.g.scale.setScalar(Math.max(s, 1e-4));
        P.g.visible = s > 0.002;
      }
    }
  }

  // ── 建模 ──
  mat(k) { return typeof k === 'string' ? this.m[k] : k; }
  put(P, obj, pos = [0, 0, 0], rot) {
    if (P.local) obj.position.set(pos[0], pos[1], pos[2]);
    else obj.position.set(pos[0] - P.pivot.x, pos[1] - P.pivot.y, pos[2] - P.pivot.z);
    if (rot) obj.rotation.set(rot[0] * DEG, rot[1] * DEG, rot[2] * DEG, rot[3] || 'XYZ');
    obj.traverse(o => { if (o.isMesh && !o.userData.noShadow) o.castShadow = o.receiveShadow = true; });
    P.g.add(obj);
    return obj;
  }
  mesh(P, geo, mat, pos, rot) { return this.put(P, new THREE.Mesh(geo, this.mat(mat)), pos, rot); }
  box(P, s, pos, mat = 'paint', o = {}) { return this.mesh(P, boxGeo(s[0], s[1], s[2], o.r ?? 0.03), mat, pos, o.rot); }
  cyl(P, r, h, pos, mat = 'dark', o = {}) { return this.mesh(P, cylGeo(r, o.rb ?? r, h, o.axis || 'y', o.seg || 24, o.open), mat, pos, o.rot); }
  /** 两点之间的方梁（长轴沿 a→b） */
  beam(P, a, b, [w, h], mat = 'paint', o = {}) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
    const m = new THREE.Mesh(boxGeo(w, h, len, o.r ?? 0.02), this.mat(mat));
    const dir = _d.subVectors(B, A).normalize(), up = Math.abs(dir.dot(o.up || UP)) > 0.98 ? XA : (o.up || UP);
    _m.lookAt(A, B, up); m.quaternion.setFromRotationMatrix(_m);
    const c = A.add(B).multiplyScalar(0.5);
    return this.put(P, m, [c.x, c.y, c.z]);
  }
  /** 挤出形状：shape 在 (a,b) 平面，沿 axis 挤出 depth，居中于 pos */
  extrude(P, shape, depth, axis, pos, mat = 'paint', o = {}) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: o.bevel !== 0, bevelThickness: o.bevel ?? 0.02, bevelSize: o.bevel ?? 0.02, bevelSegments: 2, curveSegments: o.curve ?? 12 });
    g.translate(0, 0, -depth / 2);
    if (axis === 'x') g.rotateY(Math.PI / 2);              // 形状 (z, y) 平面 → 沿 X 挤出（形状 x 对应 -Z）
    else if (axis === 'y') g.rotateX(-Math.PI / 2);        // 形状 (x, -z) 平面 → 沿 Y 挤出
    return this.mesh(P, g, mat, pos, o.rot);
  }

  /** 车轮：轴沿 X；spin 组随行驶转动 */
  wheel(P, pos, r, w, o = {}) {
    const side = o.side ?? (pos[0] >= 0 ? 1 : -1), M = this.m;
    const mount = new THREE.Group(), spin = new THREE.Group(); mount.add(spin);
    const add = (geo, mat, x = 0, yz) => { const m = new THREE.Mesh(geo, mat); m.position.x = x; if (yz) m.position.set(x, yz[0], yz[1]); spin.add(m); return m; };
    add(cylGeo(r, r, w * 0.86, 'x', 36, true), M.rubber);
    for (const s of [-1, 1]) {
      const sh = new THREE.Mesh(cached(key('tor', r, w), () => new THREE.TorusGeometry(r - w * 0.07, w * 0.07, 8, 36).rotateY(Math.PI / 2)), M.rubberSide);
      sh.position.x = s * w * 0.43; spin.add(sh);
      add(ringX(r * 0.6, r - w * 0.07), M.rubberSide, s * w * 0.5).rotation.y = s > 0 ? 0 : Math.PI;
    }
    add(cylGeo(r * 0.6, r * 0.6, w * 0.8, 'x', 28), this.mat(o.rim || 'steel'));
    add(cylGeo(r * 0.26, r * 0.3, w * 0.94, 'x', 14), M.dark);
    add(cylGeo(r * 0.09, r * 0.09, w * 1.02, 'x', 10), M.chrome);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; add(cylGeo(r * 0.045, r * 0.045, w * 0.9, 'x', 6), M.chrome, side * 0.02, [Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42]); }
    this.put(P, mount, pos);
    const W = { spin, r }; this.wheels.push(W);
    return W;
  }

  /** 履带：环形于局部 YZ 平面，驱动轮/引导轮中心距 L，半径 R；链节用 InstancedMesh 沿环移动 */
  track(P, pos, { L, R, w, pitch = 0.16 }) {
    const M = this.m, g = new THREE.Group();
    const per = 2 * L + 2 * Math.PI * R, N = Math.round(per / pitch), step = per / N;
    const flat = g => (g.index ? g.toNonIndexed() : g.clone());
    const shoe = mergeGeometries([flat(boxGeo(w, 0.06, step * 0.84, 0.01)), flat(boxGeo(w * 0.96, 0.05, 0.05, 0.01)).translate(0, -0.05, 0)].map(strip));
    const inst = new THREE.InstancedMesh(shoe, M.black, N); inst.castShadow = inst.receiveShadow = true;
    g.add(inst);
    const add = (geo, mat, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(0, y, z); g.add(m); };
    add(boxGeo(w * 0.5, R * 1.3, L, 0.04), M.dark, 0, 0);
    for (const s of [-1, 1]) {
      add(cylGeo(R * 0.84, R * 0.84, w * 0.62, 'x', 20), M.dark, 0, s * L / 2);
      add(cylGeo(R * 0.4, R * 0.4, w * 0.7, 'x', 12), M.steel, 0, s * L / 2);
    }
    const n = Math.max(3, Math.round(L / 0.42));
    for (let i = 0; i < n; i++) add(cylGeo(R * 0.34, R * 0.34, w * 0.66, 'x', 14), M.steel, -R * 0.62, lerp(-L / 2 + R * 0.7, L / 2 - R * 0.7, i / (n - 1)));
    this.put(P, g, pos);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3();
    const Tr = {
      set(dist) {
        for (let i = 0; i < N; i++) {
          const s = (((i * step + dist) % per) + per) % per;
          let y, z, ny, nz;
          if (s < L) { y = -R; z = L / 2 - s; ny = -1; nz = 0; }
          else if (s < L + Math.PI * R) { const a = (s - L) / R; ny = -Math.cos(a); nz = -Math.sin(a); y = R * ny; z = -L / 2 + R * nz; }
          else if (s < 2 * L + Math.PI * R) { y = R; z = -L / 2 + (s - L - Math.PI * R); ny = 1; nz = 0; }
          else { const a = (s - 2 * L - Math.PI * R) / R; ny = Math.cos(a); nz = Math.sin(a); y = R * ny; z = L / 2 + R * nz; }
          q.setFromAxisAngle(XA, Math.atan2(-nz, -ny));
          p.set(0, y + ny * 0.03, z + nz * 0.03);
          inst.setMatrixAt(i, m4.compose(p, q, _s));
        }
        inst.instanceMatrix.needsUpdate = true;
      },
    };
    Tr.set(0); this.tracks.push(Tr);
    return Tr;
  }

  /** 液压缸：缸筒固定在 PA 的 a 点，活塞杆指向 PB 的 b 点，逐帧伸缩 */
  piston(PA, a, PB, b, o = {}) {
    const hold = new THREE.Group(), tgt = new THREE.Object3D();
    this.put(PA, hold, a); this.put(PB, tgt, b);
    const rest = new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b)), r = o.r ?? 0.065;
    if (o.n > 1) {                                   // 多级伸缩缸（自卸举升）：各级等长、依次套叠
      const ls = rest * (o.k ?? 0.92), st = [];
      for (let j = 0; j < o.n; j++) {
        const rj = r * (1 - 0.12 * j), m = new THREE.Mesh(cylGeo(rj, rj, ls, 'y', 18), this.mat(j ? 'chrome' : (o.mat || 'dark')));
        m.position.y = ls / 2; m.castShadow = m.receiveShadow = true; m.userData.dyn = true; hold.add(m); st.push(m);
      }
      this.pistons.push({ hold, tgt, st, ls });
      return;
    }
    const lb = rest * (o.k ?? 0.6), lr = rest * (o.k ?? 0.6);
    const barrel = new THREE.Mesh(cylGeo(r, r, lb, 'y', 16), this.mat(o.mat || 'dark')); barrel.position.y = lb / 2;
    const rod = new THREE.Mesh(cylGeo(r * 0.55, r * 0.55, lr, 'y', 12), this.m.chrome);
    for (const m of [barrel, rod]) { m.castShadow = m.receiveShadow = true; m.userData.dyn = true; hold.add(m); }
    this.pistons.push({ hold, tgt, rod, lr });
  }

  /** 车灯（局部 +Z 为照射方向），可带体积光锥 */
  lamp(P, pos, o = {}) {
    const g = new THREE.Group(), r = o.r ?? 0.1, M = this.m;
    const housing = new THREE.Mesh(cylGeo(r * 1.3, r * 1.3, 0.08, 'z', 20), M.dark); housing.position.z = -0.02;
    const lens = new THREE.Mesh(cylGeo(r, r, 0.06, 'z', 20), M[o.lens || 'lensW']); lens.position.z = 0.02;
    g.add(housing, lens);
    if (o.cone) {
      const L = o.len ?? 7, cone = new THREE.Mesh(cached(key('cone', L), () => new THREE.ConeGeometry(L * 0.28, L, 28, 1, true).rotateX(-Math.PI / 2).translate(0, 0, L / 2)), M.cone);
      cone.userData.dyn = cone.userData.noShadow = true; cone.renderOrder = 5; g.add(cone); this.cones.push(cone);
    }
    return this.put(P, g, pos, o.rot);
  }

  anchor(name, P, pos) { const o = new THREE.Object3D(); this.put(P, o, pos); this.anchors[name] = o; return o; }

  /** 同一组内、同材质的静态网格合并，大幅减少绘制调用 */
  bake() {
    const groups = [];
    this.root.traverse(o => { if (o.isGroup) groups.push(o); });
    for (const g of groups) {
      const byMat = new Map();
      for (const c of g.children) if (c.isMesh && !c.isInstancedMesh && !c.userData.dyn) (byMat.get(c.material) || byMat.set(c.material, []).get(c.material)).push(c);
      for (const [mat, ms] of byMat) {
        if (ms.length < 2) continue;
        const geos = ms.map(m => { m.updateMatrix(); return strip((m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix)); });
        const merged = mergeGeometries(geos, false);
        if (!merged) continue;
        const mesh = new THREE.Mesh(merged, mat); mesh.castShadow = mesh.receiveShadow = true;
        for (const m of ms) g.remove(m);
        g.add(mesh);
      }
    }
  }

  /** 行驶里程 → 车轮转角、履带位置 */
  drive(dist) {
    for (const w of this.wheels) w.spin.rotation.x = dist / w.r;
    for (const t of this.tracks) t.set(dist);
  }

  lights(v) {
    this.m.lensW.emissiveIntensity = 2.4 * v;
    this.m.cone.opacity = 0.05 * v;
    for (const c of this.cones) c.visible = v > 0.01;
  }

  /** 姿态更新后调用：液压缸指向、其他附着物 */
  update(dt) {
    for (const p of this.pistons) {
      p.tgt.getWorldPosition(_w); p.hold.parent.worldToLocal(_w);
      _d.subVectors(_w, p.hold.position); const len = _d.length();
      if (len > 1e-4) p.hold.quaternion.setFromUnitVectors(UP, _d.multiplyScalar(1 / len));
      if (p.st) p.st.forEach((m, j) => { m.position.y = p.ls / 2 + j / (p.st.length - 1) * Math.max(0, len - p.ls); });
      else p.rod.position.y = len - p.lr / 2;
    }
    for (const f of this.after) f(dt);
  }
}

/** 合并前统一属性：只保留 position / normal / uv */
function strip(g) {
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}
