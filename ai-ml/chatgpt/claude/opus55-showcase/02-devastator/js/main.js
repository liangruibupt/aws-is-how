// main.js — 渲染器、后期、主循环；?dev=<成员>&u=<0..1> 进入单体调试视图
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeTextures, emblemPath } from './kit.js';
import { buildEnv } from './env.js';
import { buildMembers } from './members.js';

const Q = new URLSearchParams(location.search);
{ const s = emblemPath(84); document.getElementById('sig').innerHTML = `<path d="${s.line}" fill-rule="evenodd"/><path d="${s.whisker}" opacity=".55"/>`; }

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: Q.has('shot') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.1, 220);
camera.position.set(0, 7, 30);

const T = makeTextures(renderer);
const env = buildEnv(scene, renderer, T);
const members = buildMembers(T);
for (const m of members) scene.add(m.rig.root);

// ── 后期：MSAA → GTAO → Bloom → 输出（色调映射）──
const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
gtao.output = GTAOPass.OUTPUT.Default;
gtao.blendIntensity = 0.85;
gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12 });
gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
// 光锥、光柱、粒子等半透明叠加物不写入 AO 的法线/深度，否则会在地面留下暗弧
gtao.overrideVisibility = function () {
  const cache = this._visibilityCache;
  this.scene.traverse(o => {
    cache.set(o, o.visible);
    if (o.isPoints || o.isLine || o.isSprite || (o.material && o.material.transparent && !o.material.depthWrite)) o.visible = false;
  });
};
composer.addPass(gtao);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.38, 0.42, 1.35);
// 泛光输入钳制：清漆 / 镀铬在聚光灯下会出现上百倍 HDR 的针尖高光，不钳制会被放大成整屏光晕
const hp = bloom.materialHighPassFilter, TEX = 'vec4 texel = texture2D( tDiffuse, vUv );';
if (hp.fragmentShader.includes(TEX)) {
  hp.fragmentShader = hp.fragmentShader.replace(TEX, `${TEX}\n\ttexel.rgb *= min( 1.0, 6.0 / max( 1e-4, max( texel.r, max( texel.g, texel.b ) ) ) );`);
  hp.needsUpdate = true;
}
composer.addPass(bloom);
composer.addPass(new OutputPass());

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.495; controls.minDistance = 4; controls.maxDistance = 60;
controls.target.set(0, 5, 0);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

export const ctx = { THREE, renderer, scene, camera, composer, gtao, bloom, controls, env, members, T, Q };
window.__ctx = ctx;

// ── 单体调试视图 ──
if (Q.has('dev')) {
  const id = Q.get('dev'), u = +(Q.get('u') ?? 0);
  document.getElementById('intro').classList.add('gone');
  document.body.classList.add('free', 'dev');
  const S = { lights: 1, alarm: 0, rim: 1 };
  for (const m of members) m.rig.root.visible = id === 'all' || m.id === id;
  const place = (m, u, dock = Q.has('dock')) => {
    m.rig.pose(u); m.rig.update(0); m.rig.lights(1);
    if (dock) { m.rig.root.position.copy(m.dockP); m.rig.root.quaternion.copy(m.dockQ); }
    else { m.rig.root.position.set(0, 0, 0); m.rig.root.quaternion.identity(); }
  };
  for (const m of members) place(m, u);
  const vec = (k, d) => (Q.get(k) || d).split(',').map(Number);
  const cp = vec('cam', '9,5,11'), ct = vec('tgt', '0,1.5,0');
  camera.position.set(...cp); controls.target.set(...ct);
  window.__dev = { set(u) { for (const m of members) place(m, u); }, cam(p, t) { camera.position.set(...p); controls.target.set(...t); controls.update(); } };
  // 联系表：?sheet=0,0.4,0.7,1d —— 四个姿态拼成一张（d = 对接位，用 cam2/tgt2 机位）
  if (Q.has('sheet')) {
    const out = Object.assign(document.createElement('canvas'), { width: innerWidth, height: innerHeight });
    Object.assign(out.style, { position: 'fixed', inset: '0', zIndex: 50 }); document.body.appendChild(out);
    const g = out.getContext('2d'), W = innerWidth / 2, H = innerHeight / 2;
    g.font = '600 15px monospace'; g.fillStyle = '#ff0';
    Q.get('sheet').split(',').forEach((s, i) => {
      const d = s.endsWith('d');
      for (const m of members) place(m, parseFloat(s), d);
      camera.position.set(...(d ? vec('cam2', Q.get('cam') || '9,5,11') : cp)); controls.target.set(...(d ? vec('tgt2', Q.get('tgt') || '0,1.5,0') : ct)); controls.update();
      env.update(3, 0, S); composer.render(); composer.render();
      g.drawImage(canvas, (i % 2) * W, (i >> 1) * H, W, H); g.fillText(`u=${s}`, (i % 2) * W + 10, (i >> 1) * H + 22);
    });
  }
  let last = performance.now();
  renderer.setAnimationLoop(now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    controls.update(); env.update(now / 1000, dt, S); composer.render();
  });
} else {
  import('./app.js').then(({ start }) => start(ctx));
}
