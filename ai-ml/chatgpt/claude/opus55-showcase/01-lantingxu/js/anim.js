// anim.js — 筆路時間軸：落筆、行筆、收筆、提按；以筆路為遮罩逐步顯出原帖墨色
export const PACE = {
  press: 0.04,           // 落筆頓按
  lift: 0.026,           // 收筆提起
  base: 0.035,           // 每筆最短行筆時間
  effort: 1 / 1150,      // 每單位「筆力」（弧長 × 粗細權重）所需秒數，1× 速
  dot: 0.12,             // 點
  air: 0.045,            // 筆畫之間空中移動：基本時間
  airRate: 1 / 2000,     //                  每像素
  fill: 0.12,            // 收字：補足筆路未覆蓋之墨
};

const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const easeIO = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
// 起收慢、中段快；端點速度約為平均的 0.22
const strokeEase = u => u - 0.78 * Math.sin(TAU * u) / TAU;

const mk = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w); c.height = Math.max(1, h);
  return c;
};

/** 把 lanting.json 的單字資料整理成筆畫與分段時間表（單字局部時間，秒）。 */
export function prepare(c) {
  const strokes = [], rs = [];
  for (const a of c.s) {
    const n = a.length / 3, cum = new Float32Array(n);
    let E = 0;
    for (let j = 1; j < n; j++) {
      const dx = a[3 * j] - a[3 * j - 3], dy = a[3 * j + 1] - a[3 * j - 2];
      const r = (a[3 * j + 2] + a[3 * j - 1]) / 2;
      E += Math.hypot(dx, dy) * (1 + 0.07 * r);          // 粗筆行得慢
      cum[j] = E;
    }
    for (let j = 0; j < n; j++) rs.push(a[3 * j + 2]);
    strokes.push({ p: a, n, cum, E });
  }
  rs.sort((x, y) => x - y);
  const rref = rs[Math.floor(rs.length * 0.92)] || 3;

  const ph = [], inkPh = [];
  let t = 0, prev = null;
  const push = (o, d) => { o.t0 = t; t += d; o.t1 = t; ph.push(o); return o; };
  strokes.forEach((s, k) => {
    const sx = s.p[0], sy = s.p[1];
    if (prev) {
      const d = Math.hypot(sx - prev[0], sy - prev[1]);
      push({ k: 'air', ax: prev[0], ay: prev[1], bx: sx, by: sy, hop: Math.min(1, d / 90) }, PACE.air + d * PACE.airRate);
    }
    push({ k: 'down', s: k }, PACE.press);
    inkPh.push(push({ k: 'ink', s: k }, s.n === 1 ? PACE.dot : PACE.base + s.E * PACE.effort));
    push({ k: 'up', s: k }, PACE.lift);
    prev = [s.p[3 * (s.n - 1)], s.p[3 * (s.n - 1) + 1]];
  });
  push({ k: 'fill' }, PACE.fill);
  return { strokes, ph, inkPh, dur: t, rref, start: [strokes[0].p[0], strokes[0].p[1]], end: prev };
}

/** 單字臨寫：遮罩隨筆路累積，再以 source-in 套上原帖墨色。 */
export class CharAnim {
  constructor(c, geo, sprite) {
    this.c = c; this.g = geo; this.sprite = sprite;
    this.w = c.box[2]; this.h = c.box[3];
    this.mask = mk(this.w, this.h); this.m = this.mask.getContext('2d');
    this.live = mk(this.w, this.h); this.l = this.live.getContext('2d');
    this.reset();
  }

  reset() {
    this.m.clearRect(0, 0, this.w, this.h);
    this.m.fillStyle = '#fff';
    this.si = 0; this.pj = 0; this.pi = 0; this.lastT = -1; this.fillA = 0;
  }

  dab(x, y, r, f = 1) {
    this.m.beginPath();
    this.m.arc(x, y, (r * 1.22 + 1.4) * f, 0, TAU);
    this.m.fill();
  }

  /** 推進到單字局部時間 t，回傳筆尖狀態（局部座標）。 */
  update(t) {
    if (t < this.lastT) this.reset();
    this.lastT = t;
    const { strokes, inkPh } = this.g;
    while (this.si < strokes.length) {
      const s = strokes[this.si], P = inkPh[this.si], p = s.p;
      if (t < P.t0) break;
      const done = t >= P.t1;
      if (s.n === 1) {                                   // 點：由小漸大
        this.dab(p[0], p[1], p[2], 0.35 + 0.65 * clamp((t - P.t0) / (P.t1 - P.t0), 0, 1));
        if (done) { this.si++; this.pj = 0; continue; }
        break;
      }
      const e = done ? s.E : s.E * strokeEase((t - P.t0) / (P.t1 - P.t0));
      let j = this.pj;
      while (j < s.n && s.cum[j] <= e) { this.dab(p[3 * j], p[3 * j + 1], p[3 * j + 2]); j++; }
      this.pj = j;
      if (done) { this.si++; this.pj = 0; continue; }
      if (j > 0 && j < s.n) {                            // 筆鋒所在的半步
        const f = (e - s.cum[j - 1]) / (s.cum[j] - s.cum[j - 1] || 1), a = 3 * (j - 1), b = 3 * j;
        this.dab(p[a] + (p[b] - p[a]) * f, p[a + 1] + (p[b + 1] - p[a + 1]) * f, p[a + 2] + (p[b + 2] - p[a + 2]) * f);
      }
      break;
    }
    this.fillA = 0;
    return this.pen(t);
  }

  pressure(r) { return clamp(r / this.g.rref, 0.12, 1); }

  pen(t) {
    const ph = this.g.ph, S = this.g.strokes;
    let i = this.pi;
    if (i >= ph.length || ph[i].t0 > t) i = 0;
    while (i < ph.length - 1 && ph[i].t1 <= t) i++;
    this.pi = i;
    const P = ph[i], u = clamp((t - P.t0) / (P.t1 - P.t0), 0, 1);
    const pt = (k, j) => { const p = S[k].p; return [p[3 * j], p[3 * j + 1], p[3 * j + 2]]; };
    switch (P.k) {
      case 'air': {
        const e = easeIO(u);
        return { x: P.ax + (P.bx - P.ax) * e, y: P.ay + (P.by - P.ay) * e, lift: 1, hop: Math.sin(Math.PI * u) * P.hop, pres: 0, w: 0, contact: false };
      }
      case 'down': {
        const [x, y, r] = pt(P.s, 0), e = easeIO(u);
        return { x, y, lift: 1 - e, hop: 0, pres: this.pressure(r) * e, w: 2 * r * e, contact: u > 0.5 };
      }
      case 'ink': {
        const s = S[P.s];
        if (s.n === 1) { const [x, y, r] = pt(P.s, 0); return { x, y, lift: 0, hop: 0, pres: this.pressure(r), w: 2 * r, contact: true }; }
        const e = s.E * strokeEase(u);
        let lo = 0, hi = s.n - 1;                         // cum[lo] <= e < cum[lo+1]
        while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s.cum[m] <= e) lo = m; else hi = m; }
        const f = clamp((e - s.cum[lo]) / (s.cum[hi] - s.cum[lo] || 1), 0, 1);
        const [x0, y0, r0] = pt(P.s, lo), [x1, y1, r1] = pt(P.s, hi), r = r0 + (r1 - r0) * f;
        return { x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f, lift: 0, hop: 0, pres: this.pressure(r), w: 2 * r, contact: true };
      }
      case 'up': {
        const [x, y, r] = pt(P.s, S[P.s].n - 1), e = easeIO(u);
        return { x, y, lift: e, hop: 0, pres: this.pressure(r) * (1 - e), w: 2 * r * (1 - e), contact: u < 0.5 };
      }
      default: {                                         // fill
        this.fillA = u;
        const [x, y] = this.g.end;
        return { x, y, lift: 1, hop: 0, pres: 0, w: 0, contact: false };
      }
    }
  }

  /** 合成：遮罩 ∩ 原帖墨色；收字時淡入整字，補上骨架未及之處（飛白、細鋒）。 */
  composite() {
    const l = this.l, { w, h } = this, [ax, ay] = this.c.at;
    l.globalCompositeOperation = 'source-over'; l.globalAlpha = 1;
    l.clearRect(0, 0, w, h);
    l.drawImage(this.mask, 0, 0);
    l.globalCompositeOperation = 'source-in';
    l.drawImage(this.sprite, ax, ay, w, h, 0, 0, w, h);
    l.globalCompositeOperation = 'source-over';
    if (this.fillA > 0) {
      l.globalAlpha = this.fillA;
      l.drawImage(this.sprite, ax, ay, w, h, 0, 0, w, h);
      l.globalAlpha = 1;
    }
    return this.live;
  }
}
