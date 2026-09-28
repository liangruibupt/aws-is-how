import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import film, { WORLDS } from '../film.js';
import { LAYOUTS } from '../layouts.js';
import { SKUS } from '../skus.js';
import { CUTS, BOX, DIMS } from '../meta.js';
import { buildBottle } from '../js/bottle.js';
import { ASPECTS, parseVariant } from '../../factory/engine/variant.js';
import { solvePose, applyPose, project } from '../../factory/engine/framing.js';
import { buildCut } from '../../factory/engine/timeline.js';
import { clamp } from '../../factory/engine/ease.js';

// 世界的约定（每个香型的世界都要守）。每个世界只建一次：几个香型共用影棚时影棚测一遍。
// Node 里没有渲染器：世界的 build 碰到 ctx.renderer 就会抛错（反射环境由 film.setup 按 world.env 生成）
const FAR = 200;                                                         // app.js 的相机远裁面（米）
const ids = Object.keys(WORLDS).filter((id, i, all) => all.findIndex(j => WORLDS[j] === WORLDS[id]) === i);
const box3 = ([a, b]) => new THREE.Box3(new THREE.Vector3(...a), new THREE.Vector3(...b));
const frustum = cam => new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
const hit = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

/** 和 film.setup 一样搭起来（瓶子不带 logo、不换玻璃：镜头只用到它的 pose 和 anchor） */
const cache = {};
function load(id) {
  return (cache[id] ??= (async () => {
    const scene = new THREE.Scene(), variant = parseVariant(film, { sku: 'whitetea' });
    const ctx = { scene, renderer: null, variant, params: new URLSearchParams(), W: 1080, H: 1920 };
    ctx.world = await (await WORLDS[id]()).build(ctx);
    const bottle = buildBottle(ctx, SKUS[variant.sku]);
    scene.add(bottle.root);
    ctx.subjects = { bottle };
    scene.updateMatrixWorld(true);
    return ctx;
  })());
}
/** 按 app.js 的 evalShot 求一个镜头：复位 → 镜头函数（里面调 world.update）→ 相机 */
function evalShot(ctx, e, lt, ar) {
  const [W, H] = ASPECTS[ar], row = LAYOUTS[ar][e.shot] ?? {}, cam = new THREE.PerspectiveCamera(30, 1, 0.01, FAR);
  const s = { name: e.shot, lt, dur: e.dur, u: clamp(lt / e.dur), from: e.from, t: e.start + lt - e.from, row };
  film.reset(ctx);
  const o = film.shots[e.shot](ctx, s);
  applyPose(cam, solvePose(o.camera, row, W / H), W, H);
  return { s, o, cam, row };
}
/** 两种剪辑里每个镜头从头到尾（多走 0.5 秒：叠化时上一镜头还在播）各取 9 个时刻 */
const samples = () => Object.values(CUTS).flatMap(c => buildCut(c).entries.flatMap(e => [...Array(9).keys()].map(k => [e, e.from + (k / 8) * (e.dur + 0.5)])));
function keyLight(scene) {
  let key = null;
  scene.traverse(o => { if (!key && o.isDirectionalLight && o.castShadow) key = o; });
  return key;
}
/** 场景里逐帧可能变的一切：矩阵、可见性、实例矩阵与颜色、材质 uniform 的数值 */
function snapshot(scene) {
  scene.updateMatrixWorld(true);
  const out = [], add = a => { for (const x of a) out.push(x); };            // 实例数组有几十万个数：不能展开成参数
  scene.traverse(o => {
    add([o.visible, ...o.matrixWorld.elements]);
    if (o.isInstancedMesh) { add(o.instanceMatrix.array); add(o.instanceColor?.array ?? []); }
    for (const u of Object.values(o.material?.uniforms ?? {})) {
      if (typeof u.value === 'number') out.push(u.value); else if (u.value?.toArray) add(u.value.toArray());
    }
  });
  return out;
}

for (const id of ids) {
  test(`${id}: builds without a renderer and returns env, post and a macro set in the scene`, async () => {
    const { scene, world } = await load(id);
    assert.ok(world.env && typeof world.env === 'object', 'world.env is missing');
    if (world.env.fill) assert.equal(typeof world.env.fill, 'function');
    assert.ok(world.env.base === null || world.env.base === undefined || typeof world.env.base === 'string');
    assert.equal(typeof (world.post ?? {}), 'object');
    let o = world.macro.root;
    while (o.parent) o = o.parent;
    assert.equal(o, scene, 'macro.root is not in the scene');
    assert.equal(typeof world.macro.camera, 'function');
  });

  test(`${id}: a shadow-casting key light, and flat plain ground at y = 0 under the bottle`, async () => {
    const { scene, subjects } = await load(id);
    assert.ok(keyLight(scene), 'no shadow-casting DirectionalLight');
    const ray = new THREE.Raycaster(), mats = new Set(), others = scene.children.filter(o => o !== subjects.bottle.root);
    for (const [x, z] of [[0, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => [(a * DIMS.w) / 2, (b * DIMS.d) / 2])) {
      ray.set(new THREE.Vector3(x, 0.05, z), new THREE.Vector3(0, -1, 0));
      const h = ray.intersectObjects(others, true).find(h => h.object.material?.color);
      assert.ok(h && Math.abs(h.point.y) < 1e-6, `ground under (${x}, ${z}) is at ${h?.point.y}`);
      mats.add(h.object.material);
    }
    assert.equal(mats.size, 1, 'the bottle stands across two materials');
    const [m] = mats;                                                    // 焦散只读 color / roughness / metalness（glass.js）
    assert.ok(m.isMeshStandardMaterial && !m.map && !m.roughnessMap && !m.metalnessMap, `ground is a ${m.type} with maps`);
  });

  test(`${id}: everything stays inside the camera's far plane`, async () => {
    const { scene } = await load(id), v = new THREE.Vector3(), S = new THREE.Sphere(), M = new THREE.Matrix4();
    let far = 0, what = '';
    scene.traverse(o => {
      const p = o.geometry?.attributes.position;
      if (!p) return;
      let d = 0;
      if (o.isInstancedMesh) {                                           // 每个实例：几何的包围球搬到实例上
        o.geometry.computeBoundingSphere();
        for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M); S.copy(o.geometry.boundingSphere).applyMatrix4(M.premultiply(o.matrixWorld)); d = Math.max(d, S.center.length() + S.radius); }
      } else for (let i = 0; i < p.count; i++) d = Math.max(d, v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).length());
      if (d > far) { far = d; what = `${o.type} ${o.name}`; }
    });
    assert.ok(far < FAR - 10, `${what} reaches ${far.toFixed(1)} m from the origin (cameras are a few metres out, the far plane is ${FAR} m)`);
  });

  test(`${id}: the macro set is out of every bottle shot and the shadow box; the bottle is out of the macro`, async () => {
    const ctx = await load(id), key = keyLight(ctx.scene), bottle = box3(BOX.exploded);
    film.reset(ctx);
    const macro = new THREE.Box3().setFromObject(ctx.world.macro.root, true);
    key.shadow.updateMatrices(key);                                      // 主光阴影相机的视锥：只有这里面的东西投影、受影
    assert.ok(!key.shadow.getFrustum().intersectsBox(macro), 'the macro set is inside the key light shadow box');
    for (const ar of Object.keys(ASPECTS)) for (const [e, lt] of samples()) {
      const { cam, o, row } = evalShot(ctx, e, lt, ar), F = frustum(cam), at = `${ar} ${e.shot} lt=${lt.toFixed(2)}`;
      if (e.shot !== 'macro') { assert.ok(!F.intersectsBox(macro), `${at}: the macro set is in frame`); continue; }
      assert.ok(!F.intersectsBox(bottle), `${at}: the bottle is in the macro`);
      if (!o.camera.box) continue;
      const p = project(cam, o.camera.box), r = [p.minX, p.minY, p.maxX - p.minX, p.maxY - p.minY];
      for (const [z, zr] of Object.entries(row.zones ?? {})) assert.ok(!hit(r, zr), `${at}: the macro subject overlaps ${z}`);
    }
  });

  test(`${id}: reset + update give the same scene however the timeline is visited`, async () => {
    const ctx = await load(id), E = buildCut(CUTS[15]).entries, at = t => E.find(e => t < e.end) ?? E.at(-1);
    const visit = t => { const e = at(t); evalShot(ctx, e, e.from + t - e.start, '9x16'); return snapshot(ctx.scene); };
    const a = visit(5), b = (visit(1), visit(9.3), visit(13.5), visit(5));
    const i = a.findIndex((x, k) => !Object.is(x, b[k]));
    assert.equal(a.length, b.length);
    assert.equal(i, -1, `state #${i} differs after visiting other shots: ${a[i]} vs ${b[i]}`);
  });
}
