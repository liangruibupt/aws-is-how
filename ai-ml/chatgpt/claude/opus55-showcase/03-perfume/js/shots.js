// shots.js — 六个镜头：每个镜头只由镜头本地时间 s.lt 决定相机意图、瓶子姿态、字幕与后期
// 框取对象、仰角、方位角都写在 meta.js 的 VIEW 表里（layouts 测试也用它），这里只管随时间怎么动
import * as THREE from 'three';
import { VIEW, BOX, viewDir } from '../meta.js';
import { layersFor } from '../captions.js';
import { lerp, easeInOut, ss } from '../../factory/engine/ease.js';

const box3 = ([a, b]) => new THREE.Box3(new THREE.Vector3(...a), new THREE.Vector3(...b));
const BOXES = { bottle: box3(BOX.bottle), exploded: box3(BOX.exploded) };

/** 按 VIEW 表框取；方位角随镜头进度 u 从起值缓动到止值 */
function fit(name, s, extra = {}) {
  const V = VIEW[name];
  return { type: 'fit', box: BOXES[V.box], dir: viewDir(V.pitch, lerp(V.yaw[0], V.yaw[1], easeInOut(s.u))), fov: V.fov, ...extra };
}
/** 本镜头的字幕图层；带引线的图层补上部件的世界坐标（引擎按这一镜头的相机投影到画面） */
const text = (ctx, s) => layersFor(ctx.variant, s).map(L => (L.leader ? { ...L, leader: { ...L.leader, world: ctx.subjects.bottle.anchor(L.leader.part) } } : L));
const world = (ctx, s) => ctx.world.update?.(ctx, s);

export const SHOTS = {
  macro(ctx, s) {
    world(ctx, s);
    const m = ctx.world.macro;
    return { camera: m.camera(s), text: text(ctx, s), post: m.post };
  },
  drop(ctx, s) {
    world(ctx, s);
    return { camera: fit('drop', s), text: text(ctx, s) };
  },
  hero(ctx, s) {
    world(ctx, s);
    return { camera: fit('hero', s), text: text(ctx, s) };
  },
  anatomy(ctx, s) {
    world(ctx, s);
    ctx.subjects.bottle.pose({ explode: easeInOut(ss(0.15, 1.1, s.lt)) * (1 - easeInOut(ss(2.2, 2.9, s.lt))) });
    return { camera: fit('anatomy', s), text: text(ctx, s) };
  },
  spray(ctx, s) {
    world(ctx, s);
    ctx.subjects.bottle.pose({ press: ss(0.25, 0.4, s.lt) * (1 - ss(0.8, 1.0, s.lt)) });
    return { camera: fit('spray', s), text: text(ctx, s) };
  },
  end(ctx, s) {
    world(ctx, s);
    return { camera: fit('end', s), text: text(ctx, s) };
  },
};
