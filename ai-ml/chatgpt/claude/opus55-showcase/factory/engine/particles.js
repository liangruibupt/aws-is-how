// particles.js — 闭式粒子：第 i 颗在时刻 t 的位置只由 (seed, i, t) 决定，没有逐帧模拟，任意跳转都一致
import { rand } from './rng.js';
import { win } from './ease.js';

const wrap = (x, a, b) => a + ((((x - a) % (b - a)) + (b - a)) % (b - a));

/**
 * box = [x0, y0, z0, x1, y1, z1]；vel = 每秒位移（每颗 ±30% 随机）；sway / swayHz = 横向摆幅与频率
 * 返回 [x, y, z, phase, fade]：phase ∈ [0, 1) 供自转用；fade 在主运动轴绕回边界附近淡出，绕回时不闪现
 */
export function drift(seed, i, t, box, { vel = [0, -0.1, 0], sway = 0, swayHz = 0.3 } = {}) {
  const r = j => rand(seed, i * 8 + j), k = 0.7 + 0.6 * r(3);
  let main = 0; for (let a = 1; a < 3; a++) if (Math.abs(vel[a]) > Math.abs(vel[main])) main = a;
  const p = [0, 0, 0]; let fade = 1;
  for (let a = 0; a < 3; a++) {
    const lo = box[a], hi = box[a + 3];
    p[a] = wrap(lo + (hi - lo) * r(a) + vel[a] * k * t, lo, hi);
    if (a === main && vel[a]) fade = win((p[a] - lo) / (hi - lo), 0, 0.08, 0.92, 1);
  }
  const ph = r(4) * Math.PI * 2, w = 2 * Math.PI * swayHz * (0.8 + 0.4 * r(5));
  p[0] += sway * Math.sin(w * t + ph); p[2] += 0.6 * sway * Math.cos(0.7 * w * t + ph);
  return [p[0], p[1], p[2], (((r(6) + t * (0.1 + 0.2 * r(7))) % 1) + 1) % 1, fade];
}
