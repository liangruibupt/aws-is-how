// shots.js — 六个镜头：每个镜头只由镜头本地时间 s.lt 决定相机意图、瓶子姿态、字幕与后期
// 框取对象、仰角、方位角都写在 meta.js 的 VIEW 表里（layouts 测试也用它），这里只管随时间怎么动
import * as THREE from 'three';
import { VIEW, BOX, EV, viewDir } from '../meta.js';
import { layersFor } from '../captions.js';
import { GLASS, RIPPLE } from './bottle.js';
import { DROP, dropAt } from './drop.js';
import { mergePost } from '../../factory/engine/post.js';
import { lerp, easeInOut, ss } from '../../factory/engine/ease.js';

const box3 = ([a, b]) => new THREE.Box3(new THREE.Vector3(...a), new THREE.Vector3(...b));
const BOXES = { bottle: box3(BOX.bottle), exploded: box3(BOX.exploded) };
const CLOSE = [0.012, 0.016, 0.012];                                  // drop 开头的特写框（米）：跟着水滴的小盒
const LIFT = 0.03;                                                     // 喷之前瓶盖浮起的高度（米）
const DROP_POST = ['exposure', 'aperture', 'maxBlur', 'gamma', 'saturation'];   // drop 从 macro 的后期过渡到世界的：这几项

/**
 * drop 镜头的取景盒：先跟着水滴往下（盒心只跟 80%，水滴在画面里也往下走一点），碰到液面后停住看涟漪，
 * 0.85–2.0 秒从小盒拉到整瓶：盒子高度按对数插值（推拉的速度看起来均匀），盒心和各边按同一比例移动，最后正好是 fit('drop')
 */
function dropBox(lt) {
  const f = GLASS.fill, y = Math.max(dropAt(lt).p[1], f + DROP.R), c0 = [RIPPLE.at[0], f + 0.8 * (y - f), RIPPLE.at[1]];
  const [A, B] = BOX.bottle, c1 = A.map((a, i) => (a + B[i]) / 2), s1 = A.map((a, i) => B[i] - a);
  const h = CLOSE[1] * (s1[1] / CLOSE[1]) ** easeInOut(ss(0.85, 2.0, lt)), q = (h - CLOSE[1]) / (s1[1] - CLOSE[1]);
  const c = c0.map((x, i) => lerp(x, c1[i], q)), size = CLOSE.map((x, i) => lerp(x, s1[i], q));
  return { box: box3([c.map((x, i) => x - size[i] / 2), c.map((x, i) => x + size[i] / 2)]), q };
}

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
    ctx.subjects.bottle.pose({ ripple: s.lt - EV.land });           // 水滴在 EV.land 落进液面
    ctx.subjects.drop.pose(s.lt);
    // 特写的后期和 macro 一样（硬切两边调色、景深一致；对焦在水滴上，透过前壁也清楚：glass.js 写的是背后的深度），拉开时回到世界的
    const { box, q } = dropBox(s.lt), A = mergePost(ctx.postDefaults, ctx.world.macro.post), B = mergePost(ctx.postDefaults);
    const post = Object.fromEntries(DROP_POST.map(k => [k, Array.isArray(B[k]) ? B[k].map((b, i) => lerp(A[k][i], b, q)) : lerp(A[k], B[k], q)]));
    return { camera: fit('drop', s, { box }), text: text(ctx, s), post };
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
    const lt = s.lt, lift = easeInOut(ss(EV.lift, EV.lift + 0.3, lt)) * (1 - easeInOut(ss(EV.seat - 0.35, EV.seat, lt)));   // 瓶盖浮起、喷完落回
    ctx.subjects.bottle.pose({ capLift: LIFT * lift, press: ss(EV.spray, EV.spray + 0.1, lt) * (1 - ss(0.75, 0.9, lt)) });
    ctx.subjects.spray.update(lt);
    return { camera: fit('spray', s), text: text(ctx, s) };
  },
  end(ctx, s) {
    world(ctx, s);
    return { camera: fit('end', s), text: text(ctx, s) };
  },
};
