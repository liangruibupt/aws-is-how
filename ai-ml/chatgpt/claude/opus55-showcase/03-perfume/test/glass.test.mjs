import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildBottle, SHAPE } from '../js/bottle.js';
import { createGlass, OPTICS, LAYER } from '../js/glass.js';
import { SKUS } from '../skus.js';

// 假的渲染器：只记下每一遍画到哪个目标、用哪台相机、相机开了哪些层、背景、autoClear、阴影是否更新
function fakeRenderer({ failOn = -1 } = {}) {
  const r = { autoClear: true, shadowMap: { autoUpdate: true }, calls: [], target: null, setRenderTarget(t) { r.target = t; }, clear() {} };
  r.render = (scene, camera) => {
    if (r.calls.length === failOn) throw new Error('lost context');
    r.calls.push({ target: r.target, camera, mask: camera.layers.mask, bg: scene.background, autoClear: r.autoClear, shadows: r.shadowMap.autoUpdate });
  };
  return r;
}
// 和影棚一样的小世界：地面、一盏投影主光；pebble 在一个挪开的组里（矩阵还没更新时它在原点）
function world({ ground = { color: '#2b2d31', roughness: 0.82 }, keyLight = true, pebble = true, failOn } = {}) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 9 / 16, 0.01, 100);
  scene.background = new THREE.Color('#0f1012');
  camera.position.set(0, 0.1, 0.5); camera.lookAt(0, 0.08, 0);
  if (ground) { const g = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial(ground)); g.rotation.x = -Math.PI / 2; scene.add(g); }
  if (pebble) {
    const m = new THREE.Group(); m.position.set(0.5, 0, -0.3);
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.02, 3), new THREE.MeshStandardMaterial({ color: '#8a8478' })); p.position.y = 0.012;
    m.add(p); scene.add(m);
  }
  const key = new THREE.DirectionalLight('#fff3e6', 2.4);
  key.position.set(-0.5, 0.9, 0.7); key.castShadow = keyLight;
  scene.add(key, key.target);
  const ctx = { renderer: fakeRenderer({ failOn }), scene, camera }, sku = SKUS.whitetea, bottle = buildBottle(ctx, sku);
  scene.add(bottle.root);
  return { ctx, key, bottle, glass: createGlass(ctx, bottle, sku) };
}
const target = { width: 1080, height: 1920, texture: { name: 'scene' }, depthTexture: { name: 'depth' } };
const causticMeshes = bottle => bottle.root.children.filter(o => o.material?.isShaderMaterial);
const near = (a, b, eps = 1e-6) => a.forEach((x, i) => assert.ok(Math.abs(x - b[i]) < eps, `[${a.map(v => v.toFixed(5))}] vs [${b.map(v => v.toFixed(5))}]`));

test('glass and liquid get the layered-refraction shader; a three without the transmission chunks fails loudly', () => {
  const { bottle } = world(), glass = bottle.parts.glass.material, liquid = bottle.parts.liquid.material;
  for (const m of [glass, liquid]) {
    assert.equal(m.transmission, 0); assert.equal(m.transparent, false); assert.equal(m.side, THREE.FrontSide);
    const sh = { fragmentShader: THREE.ShaderLib.physical.fragmentShader, uniforms: {} };
    m.onBeforeCompile(sh);
    assert.ok(!sh.fragmentShader.includes('#include <transmission_fragment>') && sh.fragmentShader.includes('uniform mat4 projectionMatrix;'));
    assert.match(sh.fragmentShader, /#ifdef GLASS_PASS[^#]*gl_FragDepth = [^#]*#else/);   // 只有玻璃改写深度：透过它看到的东西按自己的远近虚化
    for (const [k, S] of [['uOut', SHAPE.outer], ['uCav', SHAPE.cavity], ['uLiq', SHAPE.liquid]]) near(sh.uniforms[k].value.flatMap(v => v.toArray()), S.planes.flat());
    assert.throws(() => m.onBeforeCompile({ fragmentShader: 'void main() {}', uniforms: {} }), /three shader chunk not found/);
  }
  assert.equal(glass.ior, OPTICS.glassIor); assert.ok('GLASS_PASS' in glass.defines); assert.ok(!('GLASS_PASS' in (liquid.defines ?? {})));
  assert.notEqual(glass.customProgramCacheKey(), liquid.customProgramCacheKey());
});

test('layers: world 0, liquid 1, glass 2; a shadow-only proxy and one DoubleSide caustic mesh per colour join the bottle', () => {
  const { bottle } = world();
  bottle.parts.liquid.traverse(o => { if (o.isMesh) assert.equal(o.layers.mask, 1 << LAYER.liquid); });
  bottle.parts.glass.traverse(o => { if (o.isMesh) assert.equal(o.layers.mask, 1 << LAYER.glass); });
  const proxy = bottle.root.children.find(o => o.geometry === bottle.parts.glass.geometry && o !== bottle.parts.glass);
  assert.ok(proxy.castShadow && proxy.layers.mask === 1 && !proxy.material.colorWrite && !proxy.material.depthWrite);
  const cz = causticMeshes(bottle);
  assert.equal(cz.length, 3);
  assert.deepEqual(cz.map(m => m.material.uniforms.uEg.value), [-1, 0, 1].map(c => OPTICS.glassIor + c * OPTICS.dispersion));
  for (const m of cz) assert.ok(m.material.side === THREE.DoubleSide && m.layers.mask === 1 && m.material.blending === THREE.CustomBlending);
});

test('the caustic lands on the ground under the bottle, not on whatever sat at the origin before the matrices updated', () => {
  const S = w => causticMeshes(w.bottle)[0].material.uniforms;
  const dull = S(world());
  near(dull.uAlb.value.toArray(), new THREE.Color('#2b2d31').toArray());
  near(dull.uF0.value.toArray(), [0.04, 0.04, 0.04]); assert.equal(dull.uRough.value, 0.82);
  const metal = S(world({ ground: { color: '#c8a060', roughness: 0.01, metalness: 1 } }));
  near(metal.uAlb.value.toArray(), [0, 0, 0]); near(metal.uF0.value.toArray(), new THREE.Color('#c8a060').toArray());
  assert.equal(metal.uRough.value, 0.0525);                            // 和 three 一样把粗糙度夹到 0.0525 以上
});

test('render: world, a mipmapped quarter-size copy of it, liquid, glass, then what floats in front; the renderer is put back — even when a pass throws', () => {
  const w = world(), { renderer, scene, camera } = w.ctx, bg = scene.background;
  camera.layers.enable(5);
  const mask = camera.layers.mask;
  w.glass.render(target);
  const passes = renderer.calls.filter(c => c.camera === camera), [copy] = renderer.calls.filter(c => c.camera !== camera);
  assert.deepEqual(passes.map(c => c.mask), [1 << 0, 1 << LAYER.liquid, 1 << LAYER.glass, 1 << LAYER.over]);
  assert.ok(passes.every(c => c.target === target) && renderer.calls.length === 5 && renderer.calls[1] === copy);
  assert.equal(passes[0].bg, bg);
  for (const c of passes.slice(1)) assert.ok(c.bg === null && !c.autoClear && !c.shadows);   // 后三遍叠在第一遍上，不清屏、不重画阴影
  assert.ok(scene.background === bg && renderer.autoClear && renderer.shadowMap.autoUpdate && camera.layers.mask === mask);
  assert.ok([LAYER.liquid, LAYER.glass, LAYER.over].every(l => w.key.layers.isEnabled(l)));
  const U = w.bottle.parts.glass.material, sh = { fragmentShader: THREE.ShaderLib.physical.fragmentShader, uniforms: {} };
  U.onBeforeCompile(sh);
  assert.ok(sh.uniforms.tScene.value === target.texture && sh.uniforms.tDepth.value === target.depthTexture);
  assert.equal(sh.uniforms.uBlur.value, OPTICS.frostBlur * target.height);
  // 光路出了画面时取的糊开的世界：第 0 层画完后缩成四分之一的那份，带 mip
  const low = copy.target, T = sh.uniforms.tLow.value;
  assert.ok(T === low.texture && T.generateMipmaps && T.minFilter === THREE.LinearMipmapLinearFilter);
  assert.deepEqual([low.width, low.height], [270, 480]);

  for (const failOn of [0, 1, 3]) {
    const f = world({ failOn });
    f.ctx.camera.layers.enable(5);
    const m = f.ctx.camera.layers.mask;
    assert.throws(() => f.glass.render(target), /lost context/);
    assert.ok(f.ctx.scene.background !== null && f.ctx.renderer.autoClear && f.ctx.renderer.shadowMap.autoUpdate && f.ctx.camera.layers.mask === m, `failing pass ${failOn}`);
  }
});

test('the caustic aims from the key light and follows the ripple; a world with no shadow-casting light has none', () => {
  const w = world();
  w.bottle.pose({ ripple: 0.4 });
  w.glass.render(target);
  const cz = causticMeshes(w.bottle), U = cz[0].material.uniforms;
  near(U.uL.value.toArray(), w.key.position.clone().normalize().toArray());
  assert.equal(U.uAge.value, 0.4);
  const k = w.key.color.toArray().map(c => c * w.key.intensity * OPTICS.causticGain * OPTICS.interfaces);
  near(cz.map((m, c) => m.material.uniforms.uK.value.getComponent(c)), k);
  assert.ok(cz.every(m => m.visible));
  w.bottle.pose(); w.glass.render(target);
  assert.equal(U.uAge.value, 0);

  const dark = world({ keyLight: false });
  dark.glass.render(target);
  assert.ok(causticMeshes(dark.bottle).every(m => !m.visible));
});
