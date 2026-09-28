// drop.js — 落进瓶里的那一滴（闭式：只由 drop 镜头的本地时间决定）。瓶盖盖着，水滴从瓶肩内侧松开，慢镜头落过液面上的空气，
// 在 EV.land 碰到液面、并进去，涟漪从落点 RIPPLE.at 散开。特写最后 DROP.pre 秒，叶尖的露珠按同一条下落曲线松开：硬切接上动作
import * as THREE from 'three';
import { GLASS, RIPPLE } from './bottle.js';
import { DIMS, EV } from '../meta.js';
import { dewMaterial } from './worlds/common.js';
import { clamp, ss } from '../../factory/engine/ease.js';

// 半径（米）、松开到切镜的秒数（在特写里）、并进液面用的秒数
export const DROP = { R: 0.0025, pre: 0.25, merge: 0.1 };
const Y0 = DIMS.body - GLASS.shoulder - 1.2 * DROP.R;                  // 松开时的球心：和叶尖的露珠一样，挂着时顶端在球心上 1.2R
/** 慢镜头的“重力”（米/秒²）：松开 DROP.pre + EV.land 秒后，水滴底部正好碰到静止液面 */
export const FALL_G = (2 * (Y0 - DROP.R - GLASS.fill)) / (DROP.pre + EV.land) ** 2;
/** 松开 tau 秒后落下的距离（米；tau ≤ 0 时为 0）。特写里的露珠和瓶里的水滴共用 */
export const fallen = tau => (tau > 0 ? 0.5 * FALL_G * tau * tau : 0);
/** 松开 tau 秒后的竖向拉伸：挂着时被拉长到 1.4，松开后回弹、很快晃成圆的 */
export const stretch = tau => 1 + 0.4 * Math.exp(-8 * tau) * Math.cos(10 * Math.PI * tau);

/**
 * drop 镜头本地时间 lt 的水滴：球心 p（瓶子坐标）、半径 r、竖向拉伸 sy（横向按 1/√sy，体积不变）。
 * 碰到液面后球心接着往下走、半径在 DROP.merge 秒里缩到 0（没进液面的部分被液体盖住）；r = 0 就不画
 */
export function dropAt(lt) {
  const tau = lt + DROP.pre, m = clamp((lt - EV.land) / DROP.merge);
  return { p: [RIPPLE.at[0], Y0 - fallen(tau), RIPPLE.at[1]], r: DROP.R * (1 - ss(0, 1, m)), sy: stretch(tau) };
}

/** 水滴网格（第 0 层：透过玻璃和液体都看得到它），材质是世界的露珠——里面倒映着世界的天，下半截是液体的颜色 */
export function createDrop(ctx, sku) {
  const hz = ctx.world.haze;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), dewMaterial(hz, { below: sku.liquid.color, above: hz.uniforms.hZenith.value }));
  mesh.name = 'drop';
  return {
    mesh,
    /** lt = drop 镜头的本地时间；不传就藏起来（别的镜头） */
    pose(lt) {
      const d = lt === undefined ? null : dropAt(lt);
      mesh.visible = !!d && d.r > 0;
      if (mesh.visible) { const w = d.r / Math.sqrt(d.sy); mesh.position.set(...d.p); mesh.scale.set(w, d.r * d.sy, w); }
    },
  };
}
