// film.js — 闻境成片模板：把数据（轴、剪辑表、构图、字体）、场景（世界 + 瓶子）和六个镜头交给引擎（见 factory/README.md 的成片约定）
import { META } from './meta.js';
import { SKUS } from './skus.js';
import { LAYOUTS } from './layouts.js';
import { fontsFor } from './captions.js';
import { buildBottle, logoMask } from './js/bottle.js';
import { createGlass } from './js/glass.js';
import { createDrop } from './js/drop.js';
import { createSpray } from './js/spray.js';
import { envMap } from './js/worlds/common.js';
import { SHOTS } from './js/shots.js';
import { score } from './js/score.js';

const studio = () => import('./js/worlds/studio.js');
// 各香型的世界；还没做的先用中性影棚。?world=studio 可强制影棚，单独调瓶子和玻璃
export const WORLDS = { studio, whitetea: () => import('./js/worlds/whitetea.js'), osmanthus: studio, seasalt: studio, rose: studio };

export default {
  ...META,
  layouts: LAYOUTS,
  fonts: fontsFor,
  async setup(ctx) {
    const sku = SKUS[ctx.variant.sku], id = ctx.params.get('world') ?? sku.world;
    if (!WORLDS[id]) throw new Error(`unknown world: ${id} (expected ${Object.keys(WORLDS).join(' | ')})`);
    ctx.world = await (await WORLDS[id]()).build(ctx);
    ctx.scene.environment = envMap(ctx.renderer, ctx.world.env);     // 世界只描述反射环境，这里才生成（世界的测试在 Node 里建，没有渲染器）
    ctx.postDefaults = ctx.world.post ?? {};
    const bottle = buildBottle(ctx, sku, { logo: await logoMask() }), drop = createDrop(ctx, sku), spray = createSpray(ctx, bottle);
    bottle.root.add(drop.mesh);
    ctx.scene.add(bottle.root, spray.root);
    ctx.subjects = { bottle, drop, spray, glass: createGlass(ctx, bottle, sku) };
  },
  /** 每次求值镜头前复位所有逐帧可变的状态：跳着看和顺序播放得到同一帧 */
  reset(ctx) {
    const { bottle, drop, spray } = ctx.subjects;
    bottle.pose(); drop.pose(); spray.update();
    ctx.world.reset?.();
  },
  /** 场景目标里分四遍画：世界 → 液体 → 玻璃 → 挡在瓶子前面的喷雾（js/glass.js） */
  render(ctx, target) { ctx.subjects.glass.render(target); },
  shots: SHOTS,
  /** 配乐与音效的音符表（js/score.js），由 factory/engine/audio.js 合成 */
  score,
};
