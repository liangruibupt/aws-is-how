// film.js — 闻境成片模板：把数据（轴、剪辑表、构图、字体）、场景（世界 + 瓶子）和六个镜头交给引擎（见 factory/README.md 的成片约定）
import { META } from './meta.js';
import { SKUS } from './skus.js';
import { LAYOUTS } from './layouts.js';
import { fontsFor } from './captions.js';
import { buildBottle } from './js/bottle.js';
import { SHOTS } from './js/shots.js';

const studio = () => import('./js/worlds/studio.js');
// 各香型的世界；还没做的先用中性影棚。?world=studio 可强制影棚，单独调瓶子和玻璃
const WORLDS = { studio, whitetea: studio, osmanthus: studio, seasalt: studio, rose: studio };

export default {
  ...META,
  layouts: LAYOUTS,
  fonts: fontsFor,
  async setup(ctx) {
    const sku = SKUS[ctx.variant.sku], id = ctx.params.get('world') ?? sku.world;
    if (!WORLDS[id]) throw new Error(`unknown world: ${id} (expected ${Object.keys(WORLDS).join(' | ')})`);
    ctx.world = await (await WORLDS[id]()).build(ctx);
    ctx.postDefaults = ctx.world.post ?? {};
    const bottle = buildBottle(ctx, sku);
    ctx.scene.add(bottle.root);
    ctx.subjects = { bottle };
  },
  /** 每次求值镜头前复位所有逐帧可变的状态：跳着看和顺序播放得到同一帧 */
  reset(ctx) {
    ctx.subjects.bottle.pose();
    ctx.world.reset?.();
  },
  shots: SHOTS,
};
