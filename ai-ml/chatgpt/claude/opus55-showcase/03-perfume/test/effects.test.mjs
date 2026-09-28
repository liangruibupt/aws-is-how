import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import film, { WORLDS } from '../film.js';
import { SKUS } from '../skus.js';
import { CUTS, BOX, DIMS, EV } from '../meta.js';
import { buildBottle, GLASS, RIPPLE, SHAPE } from '../js/bottle.js';
import { LAYER } from '../js/glass.js';
import { DROP, dropAt, createDrop } from '../js/drop.js';
import { SPRAY, particle, createSpray } from '../js/spray.js';
import { parseVariant } from '../../factory/engine/variant.js';
import { buildCut } from '../../factory/engine/timeline.js';
import { mergePost } from '../../factory/engine/post.js';
import { clamp } from '../../factory/engine/ease.js';

// 水滴、涟漪、喷雾，和用到它们的 drop / spray 镜头。世界用影棚：这些效果不看世界，只按它的 haze 着色
const lts = (a, b, n = 60) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);
const REST = { explode: 0, capLift: 0, press: 0, ripple: 0 };

/** 和 film.setup 一样搭起来（不带 logo、不建玻璃） */
async function setup() {
  const scene = new THREE.Scene(), variant = parseVariant(film, { sku: 'whitetea' });
  const ctx = { scene, renderer: null, variant, params: new URLSearchParams(), W: 1080, H: 1920 };
  ctx.world = await (await WORLDS.studio()).build(ctx);
  ctx.postDefaults = ctx.world.post ?? {};
  const bottle = buildBottle(ctx, SKUS.whitetea), drop = createDrop(ctx, SKUS.whitetea), spray = createSpray(ctx, bottle);
  bottle.root.add(drop.mesh);
  scene.add(bottle.root, spray.root);
  ctx.subjects = { bottle, drop, spray };
  return ctx;
}
/** 按 app.js 的 evalShot 求 15 秒剪辑里的一个镜头：复位 → 镜头函数 */
const E = buildCut(CUTS[15]).entries;
function shot(ctx, name, lt) {
  const e = E.find(x => x.shot === name), s = { name, lt, dur: e.dur, u: clamp(lt / e.dur), from: e.from, t: e.start + lt - e.from, row: {} };
  film.reset(ctx);
  const o = film.shots[name](ctx, s);
  ctx.scene.updateMatrixWorld(true);
  return o;
}

test('the drop falls straight down at RIPPLE.at, never rising, touches the resting liquid at EV.land and is gone once merged', () => {
  const d = dropAt(EV.land);
  near(d.p[1] - d.r, GLASS.fill);
  let y = Infinity;
  for (const lt of lts(-DROP.pre, 2.5)) {
    const { p, r } = dropAt(lt);
    assert.deepEqual([p[0], p[2]], RIPPLE.at);
    assert.ok(p[1] <= y, `rises at lt=${lt}`);
    y = p[1];
    if (lt <= EV.land) assert.equal(r, DROP.R);
    if (lt >= EV.land + DROP.merge) assert.equal(r, 0);
  }
});

test('the falling drop stays inside the cavity and clear of the pump chamber and the dip tube', () => {
  const b = buildBottle({}, SKUS.whitetea), pump = [];
  b.root.updateMatrixWorld(true);
  b.parts.pump.traverse(o => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) pump.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld));
  });
  for (const lt of lts(0, EV.land)) {                                    // 松开的那一下（lt < 0）在特写里，瓶里从切过来开始才有
    const { p: [x, y, z], r, sy } = dropAt(lt), w = r / Math.sqrt(sy), h = r * sy, C = SHAPE.cavity;
    for (const [nx, nz, d] of C.planes) assert.ok(nx * x + nz * z + w <= d, `lt=${lt}: the drop pokes through a wall`);
    assert.ok(y + h <= C.y[1] && y - h >= C.y[0], `lt=${lt}: the drop pokes through the shoulder or the base`);
    const hit = pump.find(v => ((v.x - x) / w) ** 2 + ((v.y - y) / h) ** 2 + ((v.z - z) / w) ** 2 <= 1);
    assert.ok(!hit, `lt=${lt}: the drop touches the pump at [${hit?.toArray().map(v => v.toFixed(4))}]`);
  }
});

test('the drop mesh follows dropAt on layer 0 from the cut to the landing, and hides after merging and in other shots', async () => {
  const ctx = await setup(), { drop } = ctx.subjects;
  assert.equal(drop.mesh.layers.mask, 1);                               // 第 0 层：透过玻璃和液体都看得到
  for (const lt of lts(0, 2.5, 50)) {
    shot(ctx, 'drop', lt);
    const d = dropAt(lt);
    if (lt <= EV.land) {
      assert.ok(drop.mesh.visible, `hidden at lt=${lt}`);
      assert.deepEqual(drop.mesh.position.toArray(), d.p);
      near(drop.mesh.scale.y, d.r * d.sy);
    }
    if (lt >= EV.land + DROP.merge + 1e-9) assert.ok(!drop.mesh.visible, `shown at lt=${lt}`);
  }
  for (const name of ['macro', 'hero', 'anatomy', 'spray', 'end']) { shot(ctx, name, 0.5); assert.ok(!drop.mesh.visible, `shown in ${name}`); }
});

test('the ripple spreads from RIPPLE.at, where the drop lands; the liquid ahead of the wavefront is still', () => {
  const b = buildBottle({}, SKUS.whitetea), P = b.parts.liquid.children[0].geometry.attributes.position, rest = P.array.slice(), age = 0.1;
  b.pose({ ripple: age });
  let moved = 0;
  for (let i = 0; i < P.count; i++) {
    const r = Math.hypot(P.getX(i) - RIPPLE.at[0], P.getZ(i) - RIPPLE.at[1]), dy = P.getY(i) - rest[3 * i + 1];
    if (r > RIPPLE.c * age + 1e-4) assert.equal(dy, 0, `vertex ${i}, ${(r * 1000).toFixed(1)} mm out, moved before the wave reached it`);
    else if (dy !== 0) moved++;
  }
  assert.ok(moved > 20, `only ${moved} vertices inside the wavefront moved`);
});

test('spray particles: closed form, nothing before EV.spray, all gone by 1.9 s, and the mist drifts off along −x', () => {
  const at = [-0.0072, 0.125, 0];
  for (const kind of Object.keys(SPRAY)) for (let i = 0; i < SPRAY[kind].n; i++) {
    for (const lt of lts(0, EV.spray, 8)) assert.equal(particle(kind, i, lt, at).alpha, 0, `${kind} ${i} out at lt=${lt}`);
    assert.equal(particle(kind, i, 1.9, at).alpha, 0, `${kind} ${i} still showing at lt=1.9`);
    assert.deepEqual(particle(kind, i, 0.9, at), particle(kind, i, 0.9, at));
  }
  const meanX = lt => {
    const xs = [...Array(SPRAY.puff.n).keys()].map(i => particle('puff', i, lt, at)).filter(q => q.alpha > 0).map(q => q.p[0] - at[0]);
    return xs.reduce((a, x) => a + x, 0) / xs.length;
  };
  const m = [0.6, 0.9, 1.2, 1.5].map(meanX);
  assert.ok(m[0] < 0 && m.every((x, i) => i === 0 || x < m[i - 1]), `mean x offsets ${m.map(x => x.toFixed(3))}`);
});

test('the spray meshes sit on LAYER.over, match particle() from the pressed nozzle, and give the same frame however the shot is visited', async () => {
  const ctx = await setup(), { spray } = ctx.subjects, M = new THREE.Matrix4(), v = new THREE.Vector3();
  const meshes = spray.root.children, frame = () => meshes.flatMap(m => [...m.instanceMatrix.array, ...m.instanceColor.array]);
  assert.deepEqual(meshes.map(m => [m.name, m.layers.mask, m.count]), Object.keys(SPRAY).map(k => [`spray-${k}`, 1 << LAYER.over, SPRAY[k].n]));
  shot(ctx, 'spray', 0.9);
  const a = frame();
  for (const [k, m] of Object.keys(SPRAY).map((k, j) => [k, meshes[j]])) for (const i of [0, 7, SPRAY[k].n - 1]) {
    const q = particle(k, i, 0.9, spray.at);
    m.getMatrixAt(i, M);
    v.setFromMatrixPosition(M).toArray().forEach((x, j) => near(x, q.p[j], 1e-7));
    near(m.instanceColor.getX(i), q.alpha, 1e-7);
  }
  shot(ctx, 'spray', 1.4); shot(ctx, 'spray', 0.2);
  shot(ctx, 'spray', 0.9);
  assert.deepEqual(frame(), a);
});

test('spray shot: the cap floats up 3 cm before the press, the pump is down while the mist leaves, both are back by EV.seat', async () => {
  const ctx = await setup(), { bottle } = ctx.subjects;
  shot(ctx, 'spray', 0);
  assert.deepEqual(bottle.posed, REST);
  shot(ctx, 'spray', EV.spray);
  assert.equal(bottle.posed.capLift, 0.03);                             // 喷之前瓶盖已经让开
  shot(ctx, 'spray', 0.6);
  assert.deepEqual(bottle.posed, { ...REST, capLift: 0.03, press: 1 });
  for (const lt of [EV.seat, 1.7, 2.0]) { shot(ctx, 'spray', lt); assert.deepEqual(bottle.posed, REST, `lt=${lt}`); }
});

test('spray shot: every visible particle is outside the glass body and the floating cap', async () => {
  const ctx = await setup(), { bottle, spray } = ctx.subjects, M = new THREE.Matrix4(), v = new THREE.Vector3(), cap = new THREE.Box3();
  const glass = new THREE.Box3(new THREE.Vector3(-DIMS.w / 2, 0, -DIMS.d / 2), new THREE.Vector3(DIMS.w / 2, DIMS.body, DIMS.d / 2));
  for (const lt of lts(EV.spray, 2.0, 32)) {
    shot(ctx, 'spray', lt);
    cap.setFromObject(bottle.parts.cap, true);
    for (const m of spray.root.children) for (let i = 0; i < m.count; i++) {
      if (!(m.instanceColor.getX(i) > 0)) continue;
      m.getMatrixAt(i, M);
      v.setFromMatrixPosition(M);
      assert.ok(!glass.containsPoint(v) && !cap.containsPoint(v), `lt=${lt.toFixed(3)}: ${m.name} ${i} at [${v.toArray().map(x => x.toFixed(4))}] is inside the ${glass.containsPoint(v) ? 'glass' : 'cap'}`);
    }
  }
});

test('drop shot: a close box that holds the drop, opening to the whole bottle by 2 s; the grade goes from the macro to the world', async () => {
  const ctx = await setup(), all = new THREE.Box3(...BOX.bottle.map(p => new THREE.Vector3(...p))), size = new THREE.Vector3();
  const A = mergePost(ctx.postDefaults, ctx.world.macro.post), B = mergePost(ctx.postDefaults);
  let h = 0;
  for (const lt of lts(0, 2.5, 50)) {
    const o = shot(ctx, 'drop', lt), box = o.camera.box;
    box.getSize(size);
    assert.ok(all.clone().expandByScalar(1e-9).containsBox(box), `lt=${lt}: the box leaves the bottle`);
    assert.ok(size.y >= h - 1e-12, `lt=${lt}: the box shrinks`);
    h = size.y;
    if (lt <= 0.85) assert.ok(size.y < 0.02, `lt=${lt}: the close box is ${size.y} m tall`);
    if (lt <= EV.land) {
      const { p: [x, y, z], r, sy } = dropAt(lt), w = r / Math.sqrt(sy);
      assert.ok(box.containsBox(new THREE.Box3(new THREE.Vector3(x - w, y - r * sy, z - w), new THREE.Vector3(x + w, y + r * sy, z + w))), `lt=${lt}: the drop leaves the box`);
    }
    if (lt >= 2.0) { box.min.toArray().forEach((x, i) => near(x, BOX.bottle[0][i])); box.max.toArray().forEach((x, i) => near(x, BOX.bottle[1][i])); }
    const want = lt === 0 ? A : lt >= 2.0 ? B : null;
    if (want) for (const [k, x] of Object.entries(o.post)) [x].flat().forEach((c, i) => near(c, [want[k]].flat()[i]));
  }
});

test('reset hides the drop and the mist and rests the bottle, whatever shot ran before', async () => {
  const ctx = await setup(), { bottle, drop, spray } = ctx.subjects;
  for (const [name, lt] of [['drop', 0.5], ['spray', 0.9], ['anatomy', 1.0]]) {
    shot(ctx, name, lt);
    film.reset(ctx);
    assert.ok(!drop.mesh.visible && !spray.root.visible, `after ${name}`);
    assert.deepEqual(bottle.posed, REST);
  }
});
