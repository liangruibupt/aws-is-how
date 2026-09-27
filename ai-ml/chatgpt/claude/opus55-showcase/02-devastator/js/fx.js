// fx.js — 粒子：对接火花与闪光（加色混合）、扬尘（普通混合）。
// 每个粒子的位置、大小、透明度都是「事件发生后经过的时间」的解析函数，拖动时间轴、倒放都完全一致。
import * as THREE from 'three';
import { clamp, smooth, rng } from './kit.js';

const VS = /* glsl */`
attribute float aA; attribute float aS; attribute vec3 aC;
uniform float uScale;
varying float vA; varying vec3 vC;
void main() {
  vA = aA; vC = aC;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aA > 0.0 ? aS * uScale / max(0.1, -mv.z) : 0.0;
  gl_Position = projectionMatrix * mv;
}`;
const FS = /* glsl */`
uniform sampler2D uTex;
varying float vA; varying vec3 vC;
void main() {
  float a = texture2D(uTex, gl_PointCoord).r * vA;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vC, a);
}`;

function cloud(scene, tex, N, blending) {
  const g = new THREE.BufferGeometry();
  const P = new Float32Array(N * 3), A = new Float32Array(N), S = new Float32Array(N), C = new Float32Array(N * 3);
  const at = (k, arr, n) => g.setAttribute(k, new THREE.BufferAttribute(arr, n).setUsage(THREE.DynamicDrawUsage));
  at('position', P, 3); at('aA', A, 1); at('aS', S, 1); at('aC', C, 3);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: tex }, uScale: { value: 1 } }, vertexShader: VS, fragmentShader: FS,
    transparent: true, depthWrite: false, blending,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 6; scene.add(pts);
  return { P, A, S, C, g, mat, N, flush() { for (const k of ['position', 'aA', 'aS', 'aC']) g.attributes[k].needsUpdate = true; } };
}

const G = 9.8;
/** 抛物线 + 一次落地反弹：返回 τ 时刻的位置（写入 out） */
function ballistic(p0, v, τ, out) {
  const [x0, y0, z0] = p0, [vx, vy, vz] = v;
  const th = (vy + Math.sqrt(vy * vy + 2 * G * Math.max(0, y0))) / G;       // 触地时间
  if (τ < th) { out[0] = x0 + vx * τ; out[1] = y0 + vy * τ - 0.5 * G * τ * τ; out[2] = z0 + vz * τ; return; }
  const bx = x0 + vx * th, bz = z0 + vz * th, bvy = 0.32 * (G * th - vy), d = τ - th;
  out[0] = bx + vx * 0.55 * d; out[1] = Math.max(0.01, bvy * d - 0.5 * G * d * d); out[2] = bz + vz * 0.55 * d;
}

/**
 * sparks: [{ t, pts: [[x,y,z]...], n, pw }] 对接点火花
 * dust:   [{ t, c: [x,y,z], R, n }]          起飞 / 落地扬尘
 */
export function makeFX(scene, T, { sparks, dust }) {
  const r = rng(77);
  // ── 火花 + 对接闪光 ──
  const SP = [];
  for (const e of sparks) {
    for (const c of e.pts) SP.push({ e, glow: true, p0: c });
    for (let j = 0; j < e.n; j++) {
      const c = e.pts[j % e.pts.length], th = r() * Math.PI * 2, ph = Math.acos(1 - 2 * r());
      const sp = (2.2 + r() * 5.2) * e.pw;
      const d = [Math.sin(ph) * Math.cos(th), Math.abs(Math.cos(ph)) * 0.85 + 0.25, Math.sin(ph) * Math.sin(th) * 0.8 + 0.35];
      SP.push({ e, p0: c, v: d.map(x => x * sp), life: 0.45 + r() * 0.95, size: 0.05 + r() * 0.07, delay: r() * 0.07 });
    }
  }
  const sc = cloud(scene, T.sprite, SP.length, THREE.AdditiveBlending);

  // ── 扬尘 ──
  const DU = [];
  for (const e of dust) for (let j = 0; j < e.n; j++) {
    DU.push({ e, th: r() * Math.PI * 2, r0: e.R * 0.25 * r(), rr: e.R * (0.55 + 0.6 * r()), h: 0.25 + 1.3 * r(), s0: 0.7 + 0.7 * r(), life: 2.2 + 1.4 * r(), delay: r() * 0.12 });
  }
  const dc = cloud(scene, T.sprite, DU.length, THREE.NormalBlending);

  const o = [0, 0, 0];
  return {
    setScale(v) { sc.mat.uniforms.uScale.value = dc.mat.uniforms.uScale.value = v; },
    update(t) {
      SP.forEach((q, i) => {
        const τ = t - q.e.t - (q.delay || 0);
        if (q.glow) {
          const a = τ >= 0 && τ < 0.45 ? Math.exp(-τ * 12) : 0;
          sc.A[i] = a; sc.S[i] = 2.4 * q.e.pw * (0.6 + 0.4 * a);
          sc.P.set(q.p0, i * 3); sc.C.set([3.2, 2.2, 1.3], i * 3);
          return;
        }
        if (τ < 0 || τ > q.life) { sc.A[i] = 0; return; }
        const h = τ / q.life;
        ballistic(q.p0, q.v, τ, o); sc.P.set(o, i * 3);
        sc.A[i] = Math.pow(1 - h, 1.4); sc.S[i] = q.size * (1 - 0.4 * h);
        // 白热 → 橙 → 暗红
        sc.C[i * 3] = 4.2 - 2.4 * h; sc.C[i * 3 + 1] = Math.max(0.1, 3.0 - 3.6 * h); sc.C[i * 3 + 2] = Math.max(0.02, 1.6 - 2.6 * h);
      });
      sc.flush();
      DU.forEach((q, i) => {
        const τ = t - q.e.t - q.delay;
        if (τ < 0 || τ > q.life) { dc.A[i] = 0; return; }
        const k = 1 - Math.exp(-τ * 2.4), rad = q.r0 + q.rr * k, c = q.e.c;
        dc.P[i * 3] = c[0] + Math.cos(q.th) * rad; dc.P[i * 3 + 1] = c[1] + 0.2 + q.h * (1 - Math.exp(-τ * 1.3)); dc.P[i * 3 + 2] = c[2] + Math.sin(q.th) * rad;
        dc.S[i] = q.s0 * (1 + 2.4 * (1 - Math.exp(-τ * 1.5)));
        dc.A[i] = 0.16 * smooth(0, 0.18, τ) * Math.pow(clamp(1 - τ / q.life), 1.6);
        dc.C.set([0.2, 0.188, 0.168], i * 3);
      });
      dc.flush();
    },
  };
}
