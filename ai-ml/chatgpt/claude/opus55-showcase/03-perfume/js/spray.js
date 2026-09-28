// spray.js — 按一下喷头喷出的香雾（闭式：每一颗在 spray 镜头本地时间 lt 的位置、大小、透明度只由 (种类, i, lt) 决定）。
// 雾团从按下时的喷嘴出发，沿 −x 的小锥喷出，空气阻力让它十几厘米内就停下，然后随气流往前飘、慢慢沉、胀大、变淡；
// 另有一层细小的液滴，出来的那一下闪一闪。画在第 3 层（glass.js 的 LAYER.over）：玻璃之后画，挡在瓶子前面的雾才不会被玻璃盖掉
import * as THREE from 'three';
import { EV } from '../meta.js';
import { LAYER } from './glass.js';
import { billboards, puffAtlas } from './worlds/common.js';
import { rand } from '../../factory/engine/rng.js';
import { lerp, ss } from '../../factory/engine/ease.js';

// 数量、从 EV.spray 起喷出的时长（秒）、锥半角（度）、初速（米/秒）、阻力时间常数（秒）、终了半径（米）、淡出的年龄（秒）
export const SPRAY = {
  puff: { n: 220, emit: 0.3, cone: 13, speed: [0.3, 1.4], drag: 0.06, size: [0.005, 0.018], fade: [0.45, 1.2], seed: 0x5a1 },
  glint: { n: 80, emit: 0.25, cone: 8, speed: [0.9, 1.6], drag: 0.05, size: [0.0008, 0.0016], fade: [0.1, 0.35], seed: 0x5a2 },
};

/** kind 'puff' | 'glint' 的第 i 颗在 lt 时：{ p（世界坐标）, size（半径，米）, alpha 0..1 }。at = 按下时喷嘴的位置；还没喷出时 alpha = 0 */
export function particle(kind, i, lt, at) {
  const K = SPRAY[kind], r = j => rand(K.seed, i * 10 + j), age = lt - (EV.spray + K.emit * r(0));
  if (!(age > 0)) return { p: at, size: 0, alpha: 0 };
  const th = (K.cone * Math.PI / 180) * Math.sqrt(r(1)), ph = 2 * Math.PI * r(2);
  const dir = [-Math.cos(th), Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph)];
  const reach = lerp(...K.speed, r(3)) * K.drag * (1 - Math.exp(-age / K.drag));
  const wind = [-0.035 * age, -0.004 * age - 0.008 * age * age, 0.012 * age];          // 停下以后：随空气往前飘，慢慢沉
  const p = at.map((a, k) => a + dir[k] * reach + wind[k] + 0.004 * age * Math.sin((2.3 + 0.9 * k) * age + 6.283 * r(4 + k)));   // 加一点打旋
  const size = kind === 'puff' ? lerp(0.0015, lerp(...K.size, r(7)), 1 - Math.exp(-age / 0.3)) : lerp(...K.size, r(7));
  const alpha = ss(0, 0.03, age) * (1 - ss(K.fade[0], K.fade[1], age)) * lerp(0.5, 1, r(8));
  return { p, size, alpha };
}

/** 闪光用的纹理：2 × 2 格都是同一个柔和的圆点（billboards 按实例号取格子） */
function dots(N = 32) {
  const px = new Uint8Array(4 * N * N * 4), S = 2 * N;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const x = ((i % N) + 0.5) / N * 2 - 1, y = ((j % N) + 0.5) / N * 2 - 1, p = 4 * (j * S + i);
    px[p] = px[p + 1] = px[p + 2] = 255; px[p + 3] = Math.round(255 * Math.exp(-6 * (x * x + y * y)) * (1 - ss(0.8, 1, Math.hypot(x, y))));
  }
  const tex = new THREE.DataTexture(px, S, S);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}

/** 两张实例化面片（雾团、闪光），按世界的 haze 着色。返回 { root, at, update(lt) }；update() 不传 lt 就藏起来（别的镜头） */
export function createSpray(ctx, bottle) {
  bottle.pose({ press: 1 });
  const at = bottle.anchor('nozzle');                                    // 按到底时的喷嘴：喷出的雾都从这里出发
  bottle.pose();
  const hz = ctx.world.haze, root = new THREE.Group();
  const glintMat = billboards(hz, { map: dots(), tint: [1.6, 1.55, 1.45], forward: 2 });
  glintMat.blending = THREE.AdditiveBlending;
  const kinds = { puff: billboards(hz, { map: puffAtlas(31), tint: [1.3, 1.3, 1.27], opacity: 0.32, forward: 0.8 }), glint: glintMat };
  const meshes = Object.entries(kinds).map(([kind, mat]) => {
    const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2), mat, SPRAY[kind].n);   // 2 × 2 的面片：缩放就是半径
    m.name = `spray-${kind}`; m.frustumCulled = false; m.layers.set(LAYER.over); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.setColorAt(0, new THREE.Color()); root.add(m);
    return [kind, m];
  });
  const o = new THREE.Object3D(), c = new THREE.Color();
  function update(lt) {
    root.visible = lt !== undefined;
    if (!root.visible) return;
    for (const [kind, m] of meshes) {
      for (let i = 0; i < m.count; i++) {
        const q = particle(kind, i, lt, at);
        o.position.set(...q.p); o.scale.setScalar(q.size); o.updateMatrix();
        m.setMatrixAt(i, o.matrix); m.setColorAt(i, c.setScalar(q.alpha));
      }
      m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
    }
  }
  update();
  return { root, at, update };
}
