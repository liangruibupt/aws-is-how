// app.js — 导演：时间轴（开场 → 入场 → 指令 → 逐一合体 → 终场）、机位、界面、粒子与音效调度。
// 画面上的一切都是时间 t 的确定函数：拖动、跳转、变速、倒回都得到同一帧。
import * as THREE from 'three';
import { clamp, lerp, smooth, EASE, rng, DEG } from './kit.js';
import { makeFX } from './fx.js';
import { makeSfx } from './sfx.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const A3 = a => new THREE.Vector3(...a);
const UP = V(0, 1, 0);
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');

// ───────────────────────── 时间轴（秒）─────────────────────────
const DRIVE_AT = { scrapper: 5.2, mixmaster: 5.2, scavenger: 7.4, bonecrusher: 7.4, longhaul: 10.0, hook: 10.0 };
const T_CALL = 19.6, T_COMB = 24.0, GAP = 6.6, SEG = 7.2;
const T_FIN = T_COMB + 5 * GAP + SEG;                          // 最后一名锁定后进入终场
const T_HEAD = T_FIN + 0.2, T_HEADUP = T_FIN + 2.9, T_EYES = T_FIN + 3.4, T_HERO = T_FIN + 4.8, T_BACK = T_FIN + 11.8, T_END = T_FIN + 17.8;
// 单名成员的合体段（相对段起点）：起飞 → 变形 → 对接 → 锁定
const LIFT = [0.3, 1.9], MORPH = [1.3, 5.0], DOCK = [5.0, 6.0];

/** 各成员的补充设定：视觉中心、车速、对接火花 / 落地扬尘位置、机位 */
const X = {
  scrapper: {
    cen: [0, 1.2, 0], vmax: 8.5, acc: 4, legs: true, pw: 0.8, dust: [-1.65, 0, 0.4],
    sparks: [[-1.65, 0.15, 0.9], [-2.3, 0.1, 0.1], [-1.0, 0.1, 0.1]],
    desc: '车身竖立 · 铲斗翻转成右脚 · 髋部接头伸出', cam: { az: [-26, -50], el: [9, 5], r: [11, 13.5] },
  },
  mixmaster: {
    cen: [0, 1.4, 0], vmax: 8.5, acc: 4, legs: true, pw: 0.8, dust: [1.65, 0, 0.3],
    sparks: [[1.65, 0.15, 0.8], [2.3, 0.1, 0.0], [1.0, 0.1, 0.0]],
    desc: '驾驶室前移后翻成左脚 · 搅拌筒成小腿', cam: { az: [26, 50], el: [9, 5], r: [11, 13.5] },
  },
  longhaul: {
    cen: [0, 1.4, 0], vmax: 8.5, acc: 4, pw: 1,
    sparks: [[-1.65, 6.15, 0.7], [1.65, 6.15, 0.7], [-1.65, 6.1, -0.9], [1.65, 6.1, -0.9]],
    desc: '整车横置 · 举斗亮相后落下 · 紫色护裆滑出', cam: { az: [32, -12], el: [12, 6], r: [14, 16] },
  },
  hook: {
    cen: [0, 1.6, 0], vmax: 8.5, acc: 4, pw: 1, uSeg: 0.62,
    sparks: [[-1.3, 8.65, 1.0], [1.3, 8.65, 1.0], [-2.6, 8.65, 0.8], [2.6, 8.65, 0.8]],
    desc: '转台旋转 · 紫色配重成胸甲 · 吊臂转向身后', cam: { az: [-34, -6], el: [10, 12], r: [16.5, 18] },
  },
  scavenger: {
    cen: [0, 1.4, 0.4], vmax: 6, acc: 3, tracked: true, pw: 1.1,
    sparks: [[-3.4, 10.4, 0.7], [-3.4, 9.2, 0.7], [-3.4, 9.8, -0.9]],
    desc: '整车竖立 · 斗杆翻起高举 · 右拳伸出 · 紫色步枪展开', cam: { az: [-60, -28], el: [8, 10], r: [12, 16], aim: { p: [0, 1.2, -4.0], t: [3.3, 4.1], k: 0.75 } },
  },
  bonecrusher: {
    cen: [0, 1.3, 0.2], vmax: 6, acc: 3, tracked: true, pw: 1.1,
    sparks: [[3.4, 10.4, 0.7], [3.4, 9.2, 0.7], [3.4, 9.8, -0.9]],
    desc: '整车竖立 · 推铲翻起成护盾 · 左拳伸出', cam: { az: [60, 28], el: [8, 10], r: [12, 16] },
  },
};

// ───────────────────────── 入场路线：梯形速度曲线 ─────────────────────────
function mkDrive(m, t0) {
  const pts = [...m.path, m.park].map(([x, z]) => V(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  curve.arcLengthDivisions = 600;
  const L = curve.getLength(), vm = m.x.vmax, a = m.x.acc, ta = vm / a, da = 0.5 * a * ta * ta, tc = (L - 2 * da) / vm, T = 2 * ta + tc;
  const at = τ => (τ <= 0 ? { s: 0, v: 0 } : τ < ta ? { s: 0.5 * a * τ * τ, v: a * τ } : τ < ta + tc ? { s: da + vm * (τ - ta), v: vm }
    : τ < T ? { s: L - 0.5 * a * (T - τ) ** 2, v: a * (T - τ) } : { s: L, v: 0 });
  const tg = curve.getTangentAt(1);
  return { t0, curve, L, T, at, end: pts.at(-1).clone(), qEnd: new THREE.Quaternion().setFromAxisAngle(UP, Math.atan2(tg.x, tg.z)) };
}

const bez = (a, b, c, d, k, out) => { const u = 1 - k; return out.set(0, 0, 0).addScaledVector(a, u * u * u).addScaledVector(b, 3 * u * u * k).addScaledVector(c, 3 * u * k * k).addScaledVector(d, k * k * k); };
const _e = new THREE.Euler(), _qw = new THREE.Quaternion();

/** 成员在时刻 t 的完整状态（纯函数，不改动场景） */
function pose(m, t) {
  const D = m.drv, o = { p: V(), q: new THREE.Quaternion(), u: 0, dist: 0, v: 0, acc: 0, lights: 0, rev: 0, float: 0, phase: 'wait', vis: t >= D.t0 };
  const τs = t - m.seg;
  if (τs < LIFT[0]) {
    const τ = t - D.t0, d = D.at(τ), k = d.s / D.L;
    o.p.copy(D.curve.getPointAt(k));
    const tg = D.curve.getTangentAt(k); o.q.setFromAxisAngle(UP, Math.atan2(tg.x, tg.z));
    o.dist = d.s; o.v = d.v; o.acc = (D.at(τ + 0.25).v - D.at(τ - 0.25).v) / 0.5;
    o.phase = τ < 0 ? 'wait' : τ < D.T ? 'drive' : 'park';
    o.lights = τ < 0 ? 0 : τ < 0.5 ? (Math.sin(τ * 70) > -0.2 ? 1 : 0.15) : 1 - 0.5 * smooth(D.T + 0.5, D.T + 2, τ);   // 点火闪两下，停稳后调暗
    o.rev = smooth(-0.9, -0.2, τs) * (1 - smooth(0.1, LIFT[0], τs));                         // 起飞前轰油门
    return o;
  }
  const τ = τs; o.dist = D.L; o.vis = true;
  const lk = EASE.io(clamp((τ - LIFT[0]) / (LIFT[1] - LIFT[0])));
  if (τ < DOCK[0]) {
    bez(D.end, m.c1, m.c2, m.preP, lk, o.p);
    o.q.slerpQuaternions(D.qEnd, m.dockQ, smooth(0.1, 0.85, lk));
  } else {
    const k = clamp((τ - DOCK[0]) / (DOCK[1] - DOCK[0]));
    o.p.lerpVectors(m.preP, m.dockP, k * k * (2 - k));                                        // 末端带速度撞入
    o.q.copy(m.dockQ);
    const d = τ - DOCK[1];
    if (d > 0 && d < 0.22) o.p.addScaledVector(m.push, -0.07 * Math.sin(d / 0.22 * Math.PI));  // 撞击回弹
  }
  o.u = m.uSeg * clamp((τ - MORPH[0]) / (MORPH[1] - MORPH[0]));
  if (m.id === 'hook' && t > T_HEAD) o.u = lerp(m.uSeg, 1, clamp((t - T_HEAD) / (T_HEADUP - T_HEAD)));
  o.lights = 1 - smooth(0.2, 1.1, τ);
  o.phase = τ < DOCK[1] ? 'comb' : 'lock';
  o.float = smooth(LIFT[0], LIFT[1], τ) * (1 - smooth(DOCK[0] - 0.4, DOCK[0] + 0.1, τ));
  if (o.float > 0) {                                                                        // 悬停时轻微漂移
    const ph = m.idx * 1.7, f = o.float;
    o.p.y += Math.sin(t * 1.6 + ph) * 0.07 * f;
    o.q.premultiply(_qw.setFromEuler(_e.set(Math.sin(t * 1.1 + ph) * 0.014 * f, Math.sin(t * 0.8 + ph) * 0.01 * f, Math.sin(t * 1.3 + ph) * 0.014 * f)));
  }
  return o;
}

// ───────────────────────── 入口 ─────────────────────────
export function start(ctx) {
  const { renderer, scene, camera, composer, gtao, bloom, controls, env, members, T } = ctx;
  const body = document.body;

  // 成员时间与路径
  members.forEach((m, i) => {
    m.x = X[m.id]; m.cen = A3(m.x.cen); m.uSeg = m.x.uSeg ?? 1;
    m.seg = T_COMB + i * GAP; m.lockT = m.seg + DOCK[1];
    m.drv = mkDrive(m, DRIVE_AT[m.id]);
    const park = m.drv.end;
    m.c1 = V(park.x, m.preP.y, park.z);
    m.c2 = m.preP.clone().add(V((park.x - m.preP.x) * 0.4, 0, (park.z - m.preP.z) * 0.4));
    m.push = m.dockP.clone().sub(m.preP).normalize();
    m.paint0 = m.M.paint.color.clone(); m.paintD0 = m.M.paintDark.color.clone();
    m.M.paint.emissive.set(m.hue); m.M.paint.emissiveIntensity = 0;
  });
  const hook = members.find(m => m.id === 'hook');

  // ── 粒子 / 灯光 ──
  const fx = makeFX(scene, T, {
    sparks: [
      ...members.map(m => ({ t: m.lockT, pts: m.x.sparks, n: m.x.legs ? 60 : 90, pw: m.x.pw })),
      { t: T_HEADUP, pts: [[-0.45, 10.7, 1.0], [0.45, 10.7, 1.0]], n: 26, pw: 0.45 },
    ],
    dust: [
      ...members.map(m => ({ t: m.seg + LIFT[0] + 0.05, c: [m.drv.end.x, 0, m.drv.end.z], R: 3.6, n: 44 })),
      ...members.filter(m => m.x.dust).map(m => ({ t: m.lockT, c: m.x.dust, R: 3.4, n: 40 })),
    ],
  });
  const lockL = new THREE.PointLight('#ffcf9a', 0, 18, 2); scene.add(lockL);
  const fe = env.floorEmblem.material;
  fe.emissive = new THREE.Color('#7b5cff'); fe.emissiveMap = fe.map; fe.emissiveIntensity = 0; fe.needsUpdate = true;
  const flash = document.createElement('div'); flash.className = 'flash'; body.appendChild(flash);

  /** 机库灯光、警报、逆光 */
  const envState = t => ({
    lights: smooth(0.5, 4.2, t) * (1 - 0.16 * smooth(T_CALL, T_CALL + 1.2, t) + 0.16 * smooth(T_FIN, T_FIN + 3, t)),
    alarm: smooth(T_CALL - 0.2, T_CALL + 0.4, t) * (1 - 0.6 * smooth(T_COMB + 1, T_COMB + 6, t)) * (1 - smooth(T_FIN - 1.5, T_FIN + 0.5, t)),
    rim: 1 + 0.4 * smooth(T_CALL, T_COMB, t) + 0.5 * smooth(T_FIN, T_FIN + 3, t),
    door: 0.5 - 0.2 * smooth(T_CALL, T_COMB, t) - 0.1 * smooth(T_FIN, T_FIN + 2, t),
    fill: 1 - 0.88 * smooth(T_CALL, T_COMB, t),                     // 补光灯贴近机位轴线，平面会整片镜面泛白；合体段交给环境柔光箱
  });

  // ───────────────────────── 机位 ─────────────────────────
  const sph = (F, r, az, el) => V(F.x + r * Math.cos(el * DEG) * Math.sin(az * DEG), F.y + r * Math.sin(el * DEG), F.z + r * Math.cos(el * DEG) * Math.cos(az * DEG));
  const L3 = (a, b, k) => A3(a).lerp(A3(b), k);
  /** 带 0.24 s 滞后的成员视觉中心（五点平均），镜头跟随更柔 */
  const focus = (m, t) => {
    const F = V();
    for (let j = 0; j < 5; j++) { const o = pose(m, t - j * 0.12); F.add(m.cen.clone().applyQuaternion(o.q).add(o.p)); }
    return F.multiplyScalar(0.2);
  };
  const byId = id => members.find(m => m.id === id);
  const SH = [];
  const shot = (t0, t1, f, bl = 0) => SH.push({ t0, t1, f, bl });
  const kk = (t, a, b) => EASE.io(clamp((t - a) / (b - a)));

  // 开场：黑暗机库，顶灯由远及近亮起
  shot(0, 5.2, t => { const k = kk(t, 0, 5.2); return { p: L3([0, 2.4, 22], [0, 3.2, 16.5], k), tgt: L3([0, 4.8, -20], [0, 4.0, -20], k), fov: 36 }; });
  // 入场一：地面低机位，逆光中驶入、左右分开
  shot(5.2, 9.8, t => { const k = kk(t, 5.2, 9.8); return { p: L3([0.6, 1.0, -4.2], [-0.4, 1.25, -5.6], k), tgt: L3([0, 2.2, -26], [0, 1.6, -17], k), fov: 30 }; });
  // 入场二：跟拍清扫机的履带
  shot(9.8, 13.4, t => {
    const m = byId('scavenger'), o = pose(m, t), D = m.drv, s = D.at(t - D.t0).s, h = V();
    for (const ds of [-2.5, -1.2, 0, 1.2, 2.5]) h.add(D.curve.getTangentAt(clamp((s + ds) / D.L)));
    h.y = 0; h.normalize();
    const right = V(-h.z, 0, h.x);
    return { p: o.p.clone().addScaledVector(right, 8.2).addScaledVector(h, 6.4).add(V(0, 2.3, 0)), tgt: o.p.clone().add(V(0, 1.4, 0)).addScaledVector(h, -0.6), fov: 34 };
  });
  // 入场三：拖斗、吊钩驶向后排
  shot(13.4, 16.8, t => { const k = kk(t, 13.4, 16.8); return { p: L3([-2, 5.5, 15], [2, 4.6, 13], k), tgt: L3([0, 1.5, -14], [0, 1.2, -8.5], k), fov: 34 }; });
  // 六车就位：高位全景
  shot(16.8, T_CALL, t => { const k = kk(t, 16.8, T_CALL); return { p: L3([-7, 15, 25], [6, 13.5, 23.5], k), tgt: V(0, 0.6, -1), fov: 36 }; });
  // 指令：贴地仰拍，警示灯扫过
  shot(T_CALL, T_COMB, t => { const k = kk(t, T_CALL, T_COMB); return { p: L3([0, 0.9, 15], [0, 3.6, 12.5], k), tgt: L3([0, 2.4, -8], [0, 4.2, -8], k), fov: 40 }; });
  // 合体：每名成员一段环绕跟拍，锁定前拉开露出整体
  members.forEach((m, i) => shot(m.seg, i < members.length - 1 ? members[i + 1].seg : T_FIN, t => {
    const c = m.x.cam, τ = t - m.seg, k = EASE.io(clamp(τ / (GAP + 0.6)));
    const F = focus(m, t), w = smooth(4.6, 6.4, τ) * 0.4;
    if (c.aim) { const o = pose(m, t); F.lerp(A3(c.aim.p).applyQuaternion(o.q).add(o.p), c.aim.k * smooth(...c.aim.t, τ) * (1 - smooth(5.0, 6.0, τ))); }   // 镜头下移，看清拳中步枪展开
    F.lerp(V(0, clamp(F.y, 3.5, 9.5), -0.2), w);
    return { p: sph(F, lerp(c.r[0], c.r[1], k), lerp(c.az[0], c.az[1], k), lerp(c.el[0], c.el[1], k)), tgt: F, fov: 34 };
  }));
  // 终场：头部特写 → 低角度英雄环绕 → 拉远（特写机位始终低于肩顶 y≈10.8：顶面掠射会把门洞整面镜像成白板）
  shot(T_FIN, T_HERO, t => { const k = kk(t, T_FIN, T_HERO), F = V(0, lerp(10.9, 11.5, k), 0.4); return { p: sph(F, lerp(8.5, 6.2, k), lerp(22, 6, k), lerp(-14, -8, k)), tgt: F, fov: 30 }; });
  shot(T_HERO, T_BACK, t => {
    const k = kk(t, T_HERO, T_BACK), az = lerp(-38, 26, k) * DEG, R = lerp(23, 20.5, k);
    return { p: V(R * Math.sin(az), lerp(1.5, 2.2, k), R * Math.cos(az)), tgt: V(0, lerp(7.0, 7.6, k), -0.2), fov: 40 };
  });
  shot(T_BACK, T_END + 1, t => { const k = kk(t, T_BACK, T_END); return { p: L3([6, 4.5, 22], [0, 7, 34], k), tgt: V(0, 7, 0), fov: 34 }; }, 1.6);

  const SHAKE = [...members.map(m => ({ t: m.lockT, a: m.x.legs ? 0.16 : 0.1 })), { t: T_HEADUP, a: 0.05 }, { t: T_EYES, a: 0.12 }, { t: T_HERO, a: 0.1 }];
  function director(t) {
    let i = SH.length - 1;
    for (let j = 0; j < SH.length; j++) if (t < SH[j].t1) { i = j; break; }
    const S = SH[i], c = S.f(t);
    if (S.bl && i > 0 && t < S.t0 + S.bl) {
      const c0 = SH[i - 1].f(t), w = smooth(S.t0, S.t0 + S.bl, t);
      c.p.lerpVectors(c0.p, c.p, w); c.tgt.lerpVectors(c0.tgt, c.tgt, w); c.fov = lerp(c0.fov, c.fov, w);
    }
    // 手持微晃 + 撞击震动
    c.p.add(V(Math.sin(t * 0.83) * 0.6 + Math.sin(t * 1.91 + 1.3) * 0.4, Math.sin(t * 1.13 + 2.1) * 0.5 + Math.sin(t * 2.37) * 0.3, Math.sin(t * 0.71 + 0.4) * 0.5).multiplyScalar(0.05));
    c.tgt.add(V(Math.sin(t * 0.67 + 3) * 0.5, Math.sin(t * 0.93 + 1) * 0.4, 0).multiplyScalar(0.04));
    for (const e of SHAKE) {
      const τ = t - e.t; if (τ < 0 || τ > 1.2) continue;
      const a = e.a * Math.exp(-τ * 5);
      c.p.x += a * Math.sin(τ * 57); c.p.y += a * Math.sin(τ * 71 + 1); c.tgt.y += a * 0.6 * Math.sin(τ * 49 + 2);
    }
    return c;
  }

  // ───────────────────────── 逐帧求值 ─────────────────────────
  let poses = [], ES = envState(0);
  function apply(m, o, t, dt) {
    const R = m.rig, b = R.body;
    R.root.visible = o.vis;
    R.root.position.copy(o.p); R.root.quaternion.copy(o.q);
    b.position.set(0, 0, 0); b.rotation.set(0, 0, 0);
    if (o.phase === 'drive') {
      const sp = o.v / m.x.vmax, d = o.dist, ph = m.idx * 2.3;
      b.position.y = (m.x.tracked ? 0.01 : 0.022) * sp * (0.6 * Math.sin(d * 2.7 + ph) + 0.4 * Math.sin(d * 6.3 + ph)) + (m.x.tracked ? 0.006 * sp * Math.sin(t * 71) : 0);
      b.rotation.x = clamp(-o.acc * 0.006, -0.03, 0.03) + 0.004 * sp * Math.sin(d * 1.9 + ph);
      b.rotation.z = 0.006 * sp * Math.sin(d * 1.3 + ph);
    } else if (o.phase === 'park') {
      b.position.y = (0.003 + 0.014 * o.rev) * Math.sin(t * 57 + m.idx);
      b.rotation.z = 0.004 * o.rev * Math.sin(t * 43);
    }
    R.pose(o.u); R.drive(o.dist); R.lights(o.lights);
    m.M.lensR.emissiveIntensity = 1.2 * Math.max(0.2, o.lights);
    const dl = t - m.lockT;                                             // 锁定瞬间漆面泛起成员识别色
    m.M.paint.emissiveIntensity = dl > 0 && dl < 1 ? 0.28 * Math.exp(-dl * 5) : 0;
    R.root.updateMatrixWorld(true);
    R.update(dt);
  }

  const cur = { p: V(), tgt: V(), fov: 34 };
  function evaluate(t, dt) {
    ES = envState(t);
    env.update(t, dt, ES);
    fe.emissiveIntensity = ES.alarm * (0.35 + 0.35 * Math.sin(t * 6.5)) + 0.5 * smooth(T_EYES, T_EYES + 2, t);
    poses = members.map(m => pose(m, t));
    members.forEach((m, i) => apply(m, poses[i], t, dt));

    // 对接闪光
    lockL.intensity = 0;
    for (const m of members) {
      const τ = t - m.lockT;
      if (τ >= 0 && τ < 0.5) { lockL.intensity = 180 * m.x.pw * Math.exp(-τ * 14); lockL.position.copy(m.x.sparks.reduce((s, p) => s.add(A3(p)), V()).multiplyScalar(1 / m.x.sparks.length)).add(V(0, 0.4, 3.2)); }
    }
    // 眼睛点亮
    const τe = t - T_EYES;
    const eyeK = τe < 0 ? 0 : τe < 0.45 ? [1, 0, 0.6, 0, 1][Math.floor(τe / 0.09)] ?? 1 : 1;
    hook.M.eye.emissiveIntensity = 0.15 + 4.4 * eyeK * (1 + 0.08 * Math.sin(t * 7));
    bloom.strength = 0.36 + (τe > 0 ? 0.55 * Math.exp(-τe * 1.3) : 0);
    const fl = τe > 0 && τe < 2.5 ? (0.85 * Math.exp(-τe * 2.2)).toFixed(3) : '0';
    if (flash.style.opacity !== fl) flash.style.opacity = fl;

    fx.update(t);
    const H = renderer.getDrawingBufferSize(_sz).y;
    fx.setScale(H / (2 * Math.tan(camera.fov * DEG / 2)));

    if (!free) {
      const c = director(t);
      cur.p.copy(c.p); cur.tgt.copy(c.tgt);
      camera.position.copy(c.p); camera.lookAt(c.tgt); controls.target.copy(c.tgt);
      if (Math.abs(camera.fov - c.fov) > 1e-3) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
    }
    ui(t);
  }
  const _sz = new THREE.Vector2();

  // ───────────────────────── 界面 ─────────────────────────
  const CALLS = [
    [0.9, 4.8, 'CONSTRUCTICONS', '挖地虎 <i>·</i> 集结', '六台工程车 · 一名霸天虎巨人'],
    [6.0, 9.6, '01 · 02', '铲土机 <i>/</i> 搅拌机', 'SCRAPPER · MIXMASTER'],
    [10.2, 13.2, '05 · 06', '清扫机 <i>/</i> 推土机', 'SCAVENGER · BONECRUSHER'],
    [13.8, 16.6, '03 · 04', '拖斗 <i>/</i> 吊钩', 'LONG HAUL · HOOK'],
    [17.2, 19.4, 'STANDBY', '六车就位', 'ALL UNITS IN POSITION'],
    [20.0, 23.6, 'COMMAND', '挖地虎，<em>合体！</em>', 'CONSTRUCTICONS · MERGE TO FORM DEVASTATOR'],
    ...members.map((m, i) => [m.seg + 0.5, m.seg + GAP - 0.3, `${pad(i + 1)} · ${m.en}`, `${m.cn} <i>→</i> <em>${m.role}</em>`, m.x.desc]),
    [T_HERO + 0.4, T_BACK - 0.4, 'COMBINED · 6 / 6', '大力神', 'DEVASTATOR · 六车合一'],
    [T_BACK + 1.0, T_END + 1, '', '<em>DEVASTATOR</em>', '铲土机 · 搅拌机 · 拖斗 · 吊钩 · 清扫机 · 推土机'],
  ];
  const CHAPS = [
    { t: 0, no: '00', name: '机库', tick: '开场' },
    { t: 5.2, no: '01', name: '集结 · 驶入机库', tick: '集结' },
    { t: T_CALL, no: '02', name: '合体指令', tick: '指令' },
    ...members.map((m, i) => ({ t: m.seg, no: pad(i + 3), name: `${m.cn} · ${m.role}`, tick: m.cn })),
    { t: T_FIN, no: '09', name: '大力神 · DEVASTATOR', tick: '大力神' },
  ];
  const STATUS = { wait: '待命', drive: '行进', park: '就位', comb: '变形', lock: '锁定' };
  const ZONE_OF = { scrapper: 'rleg', mixmaster: 'lleg', longhaul: 'waist', hook: 'torso', scavenger: 'rarm', bonecrusher: 'larm' };

  // 名册
  $('rosterList').innerHTML = members.map((m, i) =>
    `<li style="--c:${m.hue}" data-i="${i}" title="跳到 ${m.cn}（${i + 1}）"><span class="n">${pad(i + 1)}</span><span class="cn"><span class="sw"></span>${m.cn}</span><span class="role">${m.role}<b>待命</b></span><span class="en">${m.en}</span></li>`).join('');
  const rows = [...$('rosterList').children].map(li => ({ li, b: li.querySelector('.role b'), st: '' }));
  rows.forEach((r, i) => r.li.addEventListener('click', () => { jump(i); }));

  // 示意图（正面：观众左手边是大力神右侧）
  const ZONES = [
    ['torso', 'M78 37 L79.5 5 L82.5 5 L84 37 Z'],
    ['rarm', 'M17 40 H42 V118 H45 V146 H14 V118 H17 Z M19 38 L21 22 L37 18 L40 38 Z'],
    ['larm', 'M118 40 H143 V118 H146 V146 H115 V118 H118 Z M145 48 H151 V116 H145 Z'],
    ['torso', 'M45 38 H115 L109 90 H51 Z'],
    ['head', 'M69 12 H91 V34 H69 Z'],
    ['waist', 'M52 92 H108 V112 H52 Z'],
    ['rleg', 'M53 114 H78 V188 H80 V208 H44 V188 H53 Z'],
    ['lleg', 'M82 114 H107 V188 H116 V208 H80 V188 H82 Z'],
  ];
  const LBL = [['吊钩', 80, 66], ['拖斗', 80, 104.5], ['清扫机', 29.5, 84], ['推土机', 130.5, 84], ['铲土机', 65.5, 152], ['搅拌机', 94.5, 152]];
  $('schemaSvg').innerHTML = ZONES.map(([z, d]) => `<path class="zone" data-z="${z}" d="${d}"/>`).join('')
    + '<rect class="eye" x="72" y="21" width="6.5" height="2.6" rx=".6"/><rect class="eye" x="81.5" y="21" width="6.5" height="2.6" rx=".6"/>'
    + LBL.map(([s, x, y]) => `<text class="lbl" x="${x}" y="${y}">${s}</text>`).join('');
  const zoneEls = {}; for (const el of $('schemaSvg').querySelectorAll('.zone')) (zoneEls[el.dataset.z] ||= []).push(el);
  const zoneSt = {};
  const setZone = (z, s) => { if (zoneSt[z] === s) return; zoneSt[z] = s; for (const el of zoneEls[z]) { el.classList.toggle('act', s === 'act'); el.classList.toggle('lock', s === 'lock'); } };
  const eyes = [...$('schemaSvg').querySelectorAll('.eye')];

  // 时间轴刻度
  $('ticks').innerHTML = CHAPS.map(c => `<span style="left:${(c.t / T_END * 100).toFixed(2)}%"><b>${c.tick}</b></span>`).join('');
  const ticks = [...$('ticks').children];
  $('tEnd').textContent = T_END.toFixed(1);

  const co = $('callout'), coTag = $('coTag'), coMain = $('coMain'), coSub = $('coSub');
  let coIdx = -1, coTimer = 0, chapIdx = -1, lastClock = '', lastPct = '', eyesOn = null;
  function setCallout(i) {
    if (i === coIdx) return;
    const had = co.classList.contains('show');
    coIdx = i; clearTimeout(coTimer); co.classList.remove('show');
    if (i < 0) return;
    coTimer = setTimeout(() => { const c = CALLS[i]; coTag.textContent = c[2]; coMain.innerHTML = c[3]; coSub.textContent = c[4]; co.classList.add('show'); }, had ? 420 : 20);
  }

  function ui(t) {
    const clk = t.toFixed(1);
    if (clk !== lastClock) { lastClock = clk; $('tNow').textContent = clk.padStart(4, '0'); }
    $('scrubFill').style.width = `${(t / T_END * 100).toFixed(2)}%`;
    if (!dragging) $('seek').value = Math.round(t / T_END * 1000);

    let ci = 0; CHAPS.forEach((c, i) => { if (t >= c.t) ci = i; });
    if (ci !== chapIdx) {
      chapIdx = ci; $('chapNo').textContent = CHAPS[ci].no; $('chapName').textContent = CHAPS[ci].name;
      ticks.forEach((el, i) => el.classList.toggle('on', i === ci));
    }
    members.forEach((m, i) => {
      const ph = poses[i].phase, r = rows[i];
      if (ph !== r.st) {
        r.st = ph; r.b.textContent = STATUS[ph];
        r.li.classList.toggle('act', ph === 'drive' || ph === 'comb'); r.li.classList.toggle('lock', ph === 'lock');
      }
      setZone(ZONE_OF[m.id], ph === 'comb' ? 'act' : ph === 'lock' ? 'lock' : '');
    });
    setZone('head', t >= T_HEADUP ? 'lock' : t >= T_HEAD ? 'act' : '');
    const on = t >= T_EYES;
    if (on !== eyesOn) { eyesOn = on; eyes.forEach(e => e.classList.toggle('on', on)); }
    const pct = `${Math.round(members.reduce((s, m) => s + clamp((t - m.seg) / DOCK[1]), 0) / members.length * 100)}%`;
    if (pct !== lastPct) { lastPct = pct; $('linkPct').textContent = pct; }
    setCallout(CALLS.findIndex(c => t >= c[0] && t < c[1]));
  }

  // ───────────────────────── 音效调度 ─────────────────────────
  let sfx = null, soundOn = true;
  const SCORE = { locks: members.map(m => m.lockT), gap: GAP, eyes: T_EYES, hero: T_HERO, end: T_END };
  const EV = [], ev = (t, f) => EV.push({ t, f });
  {
    const r = rng(5);
    const lightsAt = t => smooth(0.5, 4.2, t);
    for (let i = 0; i < 9; i++) {                                                       // 顶灯逐盏点亮的继电器声
      let a = 0.5, b = 4.2; const want = (i + 0.4) / 11;
      for (let n = 0; n < 30; n++) { const c = (a + b) / 2; if (lightsAt(c) < want) a = c; else b = c; }
      ev(a, () => sfx.relay());
    }
    for (const m of members) ev(m.drv.t0, () => sfx.engineStart());
    for (const m of members) {
      ev(m.seg + LIFT[0], () => { sfx.whoosh(1.6); sfx.hiss(0.5, 0.6); });
      for (let τ = MORPH[0]; τ < MORPH[1]; τ += 0.13 + r() * 0.17) { const p = 0.75 + r() * 0.6, v = 0.45 + r() * 0.55; ev(m.seg + τ, () => sfx.click(p, v)); }
      ev(m.seg + DOCK[0], () => sfx.hiss(0.5));
      ev(m.lockT, m.x.legs ? () => { sfx.clank(1.1); sfx.thud(1); } : () => sfx.clank(1));
    }
    { const m = members.find(m => m.id === 'scavenger'), at = u => m.seg + MORPH[0] + u * (MORPH[1] - MORPH[0]);   // 步枪弹出、前管伸出
      ev(at(0.76), () => { sfx.relay(); sfx.click(0.7, 1); });
      ev(at(0.86), () => { sfx.hiss(0.3, 0.5); sfx.click(1.2, 0.8); });
      ev(at(0.97), () => sfx.clank(0.35)); }
    ev(T_HEAD, () => sfx.hiss(0.9, 0.8));
    for (let t = T_HEAD + 0.1; t < T_HEADUP; t += 0.12 + r() * 0.14) { const p = 0.8 + r() * 0.5; ev(t, () => sfx.click(p, 0.6)); }
    ev(T_HEADUP, () => sfx.clank(0.6));
    ev(T_EYES, () => sfx.roar());
    ev(T_HERO, () => sfx.boom());
    EV.sort((a, b) => a.t - b.t);
  }
  function audioState(t) {
    let eng = 0, rpm = 0, nD = 0, trk = 0, trkRate = 0, hyd = 0;
    members.forEach((m, i) => {
      const o = poses[i];
      if (o.phase === 'drive') { const s = o.v / m.x.vmax; eng += 0.35 + 0.65 * s; rpm += s; nD++; if (m.x.tracked) { trk += s; trkRate = Math.max(trkRate, s); } }
      else if (o.phase === 'park') eng += 0.14 + 0.7 * o.rev;
      const τ = t - m.seg;
      hyd = Math.max(hyd, smooth(MORPH[0], MORPH[0] + 0.3, τ) * (1 - smooth(MORPH[1] - 0.3, MORPH[1], τ)));
    });
    hyd = Math.max(hyd, smooth(T_HEAD, T_HEAD + 0.3, t) * (1 - smooth(T_HEADUP - 0.3, T_HEADUP, t)));
    return {
      on: soundOn && playing, eng: clamp(eng / 2.2), rpm: 1 + 0.7 * (nD ? rpm / nD : 0), trk: clamp(trk / 1.5), trkRate, hyd, hydF: 0.5 + 0.5 * Math.sin(t * 2.3),
      alarm: ES.alarm, alarmF: 480 + 520 * ((t * 0.85) % 1), drone: 0.5 * smooth(T_CALL, T_COMB, t) + 0.5 * smooth(T_FIN, T_HERO, t),
    };
  }

  // ───────────────────────── 播放控制 ─────────────────────────
  let t = 0, evT = 0, playing = false, speed = 1, free = false, xray = false, hq = true, dragging = false, started = false;
  const playBtn = $('play');
  function setPlaying(v) {
    if (v && t >= T_END - 0.05) setT(0);
    playing = v; playBtn.classList.toggle('on', v);
    if (v && sfx) sfx.resume();
  }
  function setT(v) { t = clamp(v, 0, T_END); evT = t; }
  function jump(i) { setT(members[i].seg - 0.3); if (!playing) setPlaying(true); }
  function setFree(v) {
    free = v; controls.enabled = v; body.classList.toggle('free', v); $('camBtn').setAttribute('aria-pressed', v);
    if (v) { controls.target.copy(cur.tgt); controls.update(); }
  }
  function setXray(v) {
    xray = v; body.classList.toggle('xray', v); $('xrayBtn').setAttribute('aria-pressed', v);
    for (const m of members) {
      if (v) { m.M.paint.color.set(m.hue); m.M.paintDark.color.set(m.hue).multiplyScalar(0.45); }
      else { m.M.paint.color.copy(m.paint0); m.M.paintDark.color.copy(m.paintD0); }
    }
  }
  function setSound(v) { soundOn = v; $('soundBtn').setAttribute('aria-pressed', v); }
  function setHQ(v) {
    hq = v; gtao.enabled = v; $('hqBtn').setAttribute('aria-pressed', v);
    const pr = v ? Math.min(devicePixelRatio, 1.6) : 1;
    renderer.setPixelRatio(pr); composer.setPixelRatio(pr);
  }
  controls.enabled = false;

  playBtn.addEventListener('click', () => setPlaying(!playing));
  const seek = $('seek');
  seek.addEventListener('pointerdown', () => { dragging = true; });
  addEventListener('pointerup', () => { dragging = false; });
  seek.addEventListener('input', () => setT(seek.value / 1000 * T_END));
  for (const b of $('speed').querySelectorAll('button')) b.addEventListener('click', () => {
    speed = +b.dataset.v; for (const o of $('speed').children) o.classList.toggle('on', o === b);
  });
  $('camBtn').addEventListener('click', () => setFree(!free));
  $('xrayBtn').addEventListener('click', () => setXray(!xray));
  $('soundBtn').addEventListener('click', () => setSound(!soundOn));
  $('hqBtn').addEventListener('click', () => setHQ(!hq));
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!started) { if ((e.code === 'Space' || e.code === 'Enter') && !startBtn.disabled) { e.preventDefault(); begin(); } return; }
    const tag = e.target.tagName;
    if (tag === 'BUTTON' && (e.code === 'Space' || e.code === 'Enter')) return;          // 交给按钮本身
    if (tag === 'INPUT' && e.code.startsWith('Arrow')) return;
    switch (e.code) {
      case 'Space': e.preventDefault(); setPlaying(!playing); break;
      case 'ArrowLeft': setT(t - 5); break;
      case 'ArrowRight': setT(t + 5); break;
      case 'KeyC': setFree(!free); break;
      case 'KeyX': setXray(!xray); break;
      case 'KeyM': setSound(!soundOn); break;
      case 'KeyQ': setHQ(!hq); break;
      default: if (/^Digit[1-6]$/.test(e.code)) jump(+e.code.slice(5) - 1);
    }
  });

  // ── 开场按钮：预编译着色器后可用 ──
  const startBtn = $('start'), startTxt = $('startTxt');
  function begin() {
    if (started) return;
    started = true; $('intro').classList.add('gone');
    const q = new URLSearchParams(location.search);
    try { sfx = makeSfx({ score: SCORE, bgm: q.get('bgm'), bgmAt: q.get('bgmAt') }); sfx.resume(); } catch (err) { console.warn('音频不可用', err); }
    setT(0); setPlaying(true); last = performance.now();
  }
  startBtn.addEventListener('click', begin);
  startTxt.textContent = '编译着色器';
  requestAnimationFrame(() => {
    for (const w of [T_FIN + 8, 10, 0]) { evaluate(w, 0); composer.render(); }
    startBtn.disabled = false; startTxt.textContent = '开始合体';
  });

  // ── 主循环 ──
  let last = performance.now();
  renderer.setAnimationLoop(now => {
    const rdt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!started) return;
    if (playing) { t += rdt * speed; if (t >= T_END) { t = T_END; setPlaying(false); } }
    evaluate(t, playing ? rdt * speed : 0);
    if (sfx) {
      if (playing && t > evT) { for (const e of EV) if (e.t > evT && e.t <= t) e.f(); }
      evT = t;
      sfx.update(audioState(t));
      sfx.music(t, playing ? speed : 0, soundOn);
    }
    if (free) controls.update();
    composer.render();
  });

  // ── 导出视频：停掉实时主循环，按固定步长逐帧推进；音轨按同一节奏用 OfflineAudioContext 离线渲染 ──
  //    帧 k 对应播放第 k / fps 秒、时间轴 t = k · speed / fps，与实时播放时主循环的推进方式一致
  const exporter = {
    fps: 60,
    start(fps = 60) {
      this.fps = fps; renderer.setAnimationLoop(null);
      if (sfx) { sfx.ac.close(); sfx = null; }
      evaluate(t, 0); composer.render();
    },
    frame() {
      const dt = speed / this.fps;
      t = Math.min(T_END, t + dt); evaluate(t, dt); composer.render();
      return t;
    },
    /** 渲染整条音轨，返回 32 位浮点 WAV 的 blob 地址；tail 为结束后多留的秒数 */
    async audio(tail = 1, sr = 48000) {
      const fps = this.fps, dur = T_END / speed + tail, n = Math.floor(dur * fps);
      const ac = new OfflineAudioContext(2, Math.ceil(dur * sr), sr), S = makeSfx({ score: SCORE, ac });
      const keep = sfx; sfx = S;                                   // 音效事件里引用的是 sfx
      let eT = 0;
      const step = k => {
        const tt = Math.min(T_END, k / fps * speed), on = k / fps * speed < T_END;
        ES = envState(tt); poses = members.map(m => pose(m, tt));
        if (on && tt > eT) { for (const e of EV) if (e.t > eT && e.t <= tt) e.f(); }
        eT = tt;
        S.update({ ...audioState(tt), on }); S.music(tt, on ? speed : 0, true);
      };
      for (let k = 1; k < n; k++) ac.suspend(k / fps).then(() => { step(k); ac.resume(); });
      step(0);
      const buf = await ac.startRendering();
      sfx = keep;
      const L = buf.getChannelData(0), R = buf.getChannelData(1), N = L.length, v = new DataView(new ArrayBuffer(44 + N * 8));
      const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
      w(0, 'RIFF'); v.setUint32(4, 36 + N * 8, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 3, true); v.setUint16(22, 2, true);
      v.setUint32(24, sr, true); v.setUint32(28, sr * 8, true); v.setUint16(32, 8, true); v.setUint16(34, 32, true); w(36, 'data'); v.setUint32(40, N * 8, true);
      for (let i = 0; i < N; i++) { v.setFloat32(44 + i * 8, L[i], true); v.setFloat32(48 + i * 8, R[i], true); }
      return URL.createObjectURL(new Blob([v], { type: 'audio/wav' }));
    },
  };

  // 调试 / 截图 / 导出
  window.__app = { get t() { return t; }, setT(v) { setT(v); evaluate(t, 0); composer.render(); }, play: setPlaying, begin, T_END, members, exporter };
}
