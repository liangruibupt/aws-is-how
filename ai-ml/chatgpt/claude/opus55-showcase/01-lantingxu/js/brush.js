// brush.js — 湘妃竹管羊毫筆：俯視略帶透視。筆鋒隨按壓鋪開、隨行筆方向拖曳，提筆則收攏離紙。
import { rng } from './textures.js';

const R = rng(1924);
const SPOTS = Array.from({ length: 28 }, () => ({ t: R(), v: (R() - 0.5) * 1.5, rx: 1.4 + R() * 3.6, ry: 0.8 + R() * 1.6, a: 0.3 + R() * 0.45 }));
const HAIRS = Array.from({ length: 7 }, () => ({ f: (R() - 0.5) * 1.5, l: 0.25 + R() * 0.2 }));
const TUFT = 60, FERRULE = 13, SHAFT = 300;
const SHADOW = [0.55, 0.26];                 // 光自左上來，影落右下

/**
 * st: { x, y, lift(0 按 … 1 提), hop(空中弧高 0..1), pres(0..1), w(著紙寬), vx, vy(運動方向×速度 -1..1), alpha }
 * k:  筆的尺寸比例
 */
export function drawBrush(g, st, k = 1) {
  if (st.alpha <= 0.01) return;
  const down = 1 - st.lift;
  const hover = (3 + 34 * st.hop) * st.lift * k;
  // 筆管軸向（指向筆頂）：右手執筆略向右傾，手領筆行
  let ax = 0.3 + st.vx * 0.16, ay = -1 + st.vy * 0.06;
  const al = Math.hypot(ax, ay); ax /= al; ay /= al;
  const px = st.x, py = st.y - hover;
  const L = TUFT * k * (1 - 0.26 * st.pres * down);
  const bend = 0.36 * st.pres * down;
  const bx = px + ax * L + st.vx * L * bend, by = py + ay * L + st.vy * L * bend;
  const Htot = L + (FERRULE + SHAFT) * k;

  g.save();
  g.globalAlpha = st.alpha;

  // ── 影 ──
  const s0x = st.x + SHADOW[0] * hover * 1.3 + 2 * k, s0y = st.y + SHADOW[1] * hover * 1.3 + 3 * k;
  const s1x = s0x + ax * Htot * 0.3 + SHADOW[0] * Htot, s1y = s0y + SHADOW[1] * Htot;
  g.lineCap = 'round';
  for (const [lw, a] of [[26, 0.035], [15, 0.05], [8, 0.08]]) {
    g.strokeStyle = `rgba(40,26,12,${a * st.alpha})`; g.lineWidth = lw * k;
    g.beginPath(); g.moveTo(s0x, s0y); g.lineTo(s1x, s1y); g.stroke();
  }

  // ── 筆管、筆斗（在軸向座標系內繪製）──
  g.save();
  g.translate(bx, by);
  g.rotate(Math.atan2(ay, ax));
  const f0 = 0, f1 = FERRULE * k, s1 = f1 + SHAFT * k, hw0 = 5.8 * k, hw1 = 5.0 * k;
  // 筆管
  g.beginPath();
  g.moveTo(f1, -hw0); g.lineTo(s1, -hw1); g.lineTo(s1, hw1); g.lineTo(f1, hw0); g.closePath();
  const bam = g.createLinearGradient(0, -hw0, 0, hw0);
  bam.addColorStop(0, '#6d5230'); bam.addColorStop(0.22, '#d9c28c'); bam.addColorStop(0.42, '#efdcaa');
  bam.addColorStop(0.72, '#b99a60'); bam.addColorStop(1, '#584126');
  g.fillStyle = bam; g.fill();
  g.save(); g.clip();
  for (const s of SPOTS) {                                 // 湘妃斑
    const x = f1 + s.t * (s1 - f1), y = s.v * hw0 * 0.8;
    g.fillStyle = `rgba(96,44,22,${s.a})`;
    g.beginPath(); g.ellipse(x, y, s.rx * k, s.ry * k, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = `rgba(70,30,14,${s.a * 0.7})`; g.lineWidth = 0.5 * k; g.stroke();
  }
  for (const t of [0.3, 0.66]) {                            // 竹節
    const x = f1 + t * (s1 - f1);
    g.fillStyle = 'rgba(70,50,26,.55)'; g.fillRect(x - 0.8 * k, -hw0, 1.6 * k, hw0 * 2);
    g.fillStyle = 'rgba(255,240,200,.35)'; g.fillRect(x + 0.9 * k, -hw0, 0.8 * k, hw0 * 2);
  }
  g.restore();
  // 管尾與掛繩
  g.fillStyle = '#3a291b'; g.fillRect(s1, -hw1 - 0.4 * k, 7 * k, (hw1 + 0.4 * k) * 2);
  g.strokeStyle = '#9e2b1f'; g.lineWidth = 1.2 * k;
  g.beginPath(); g.ellipse(s1 + 13 * k, 0, 6 * k, 3.4 * k, 0, 0, Math.PI * 2); g.stroke();
  // 筆斗
  const fer = g.createLinearGradient(0, -8.6 * k, 0, 8.6 * k);
  fer.addColorStop(0, '#1b130e'); fer.addColorStop(0.3, '#5a4230'); fer.addColorStop(0.55, '#2e2118'); fer.addColorStop(1, '#120c08');
  g.fillStyle = fer;
  g.beginPath();
  g.moveTo(f0, -8.2 * k); g.lineTo(f1, -hw0 - 1.4 * k); g.lineTo(f1, hw0 + 1.4 * k); g.lineTo(f0, 8.2 * k);
  g.quadraticCurveTo(f0 - 2 * k, 0, f0, -8.2 * k); g.fill();
  g.restore();

  // ── 筆頭：由筆斗沿曲脊至筆尖，寬度隨按壓鋪開 ──
  const cx = bx - ax * L * 0.5, cy = by - ay * L * 0.5;   // 出鋒先沿筆管方向，再彎向筆尖
  const wb = 7.6 * k, wm = (8.6 + 3.8 * st.pres * down) * k;
  const wt = Math.max(0.5 * k, st.w * 0.5 * down);
  const N = 16, left = [], right = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, it = 1 - t;
    const qx = it * it * bx + 2 * t * it * cx + t * t * px, qy = it * it * by + 2 * t * it * cy + t * t * py;
    let tx = 2 * it * (cx - bx) + 2 * t * (px - cx), ty = 2 * it * (cy - by) + 2 * t * (py - cy);
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const hw = t < 0.3 ? wb + (wm - wb) * Math.sin(t / 0.3 * Math.PI / 2)
                       : wt + (wm - wt) * Math.pow(Math.cos((t - 0.3) / 0.7 * Math.PI / 2), 1.1);
    left.push([qx - ty * hw, qy + tx * hw]); right.push([qx + ty * hw, qy - tx * hw]);
  }
  g.beginPath();
  left.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
  g.closePath();
  const hair = g.createLinearGradient(bx, by, px, py);
  hair.addColorStop(0, '#ebdfc4'); hair.addColorStop(0.3, '#d8c8a6'); hair.addColorStop(0.43, '#4d4034');
  hair.addColorStop(0.55, '#1a1410'); hair.addColorStop(1, '#0b0806');
  g.fillStyle = hair; g.fill();
  // 乾毫紋理
  g.strokeStyle = 'rgba(128,104,72,.4)'; g.lineWidth = 0.5 * k;
  for (const h of HAIRS) {
    const i1 = Math.round(N * h.l);
    g.beginPath();
    for (let i = 0; i <= i1; i++) {
      const [lx, ly] = left[i], [rx, ry] = right[i], m = 0.5 + h.f * 0.5 * 0.9;
      const x = rx + (lx - rx) * m, y = ry + (ly - ry) * m;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  }
  // 含墨的光澤
  g.strokeStyle = 'rgba(255,248,232,.2)'; g.lineWidth = 1.3 * k;
  g.beginPath();
  for (let i = Math.round(N * 0.5); i <= Math.round(N * 0.9); i++) {
    const [lx, ly] = left[i], [rx, ry] = right[i], x = lx + (rx - lx) * 0.28, y = ly + (ry - ly) * 0.28;
    i === Math.round(N * 0.5) ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.stroke();
  g.restore();
}
