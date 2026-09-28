// app.js — 引擎主循环：变体 → 剪辑表 → 镜头 → 取景 → 渲染 → 后期 → 字幕合成。一帧只由 (变体, t) 决定
// 页面里有两张画布：WebGL 画 3D 与后期，2D 画布把它拷过来再叠字幕；导出和截图都取 2D 画布
import * as THREE from 'three';
import { parseVariant, ASPECTS, MIN_TEXT } from './variant.js';
import { buildCut, resolve } from './timeline.js';
import { solvePose, applyPose, projectPoint } from './framing.js';
import { prepareLayer, drawLayer, canvasMeasure, fontStr } from './text.js';
import { createPost, mergePost } from './post.js';
import { clamp } from './ease.js';
import { safeOverlay, sheetPlan, showSheet } from './sheet.js';

/** 页面入口：film.js 的默认导出 → window.__app；预览模式再挂上播放器，?sheet 拼联系表（window.__sheet），?safe 叠安全区 */
export function boot(film) {
  let params = new URLSearchParams(location.search), plan = null;
  if (params.has('sheet') && !params.has('render')) ({ params, plan } = sheetPlan(film, params));
  const app = createApp(film, { params });
  window.__app = app;
  if (params.has('safe')) app.overlays.push(safeOverlay);
  if (plan) window.__sheet = app.ready.then(() => showSheet(app, plan));
  else if (app.mode === 'live') import('./player.js').then(m => m.createPlayer(app));
  return app;
}

function disposeTree(root) {
  root.traverse(o => {
    o.geometry?.dispose();
    for (const m of [].concat(o.material ?? [])) {
      for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
      m.dispose();
    }
  });
}

export function createApp(film, { params = new URLSearchParams(), root = document.getElementById('stage') } = {}) {
  const mode = params.has('render') ? 'render' : params.has('sheet') ? 'sheet' : 'live';
  document.documentElement.dataset.mode = mode;
  const preview = mode !== 'render';                               // 预览和联系表里溢出画红框；导出时溢出只报错
  const gl = Object.assign(document.createElement('canvas'), { className: 'gl' });
  const out = Object.assign(document.createElement('canvas'), { className: 'out' });
  root.append(gl, out);
  const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const g = out.getContext('2d'), measure = canvasMeasure(g);
  const glx = renderer.getContext(), dbg = glx.getExtension('WEBGL_debug_renderer_info');
  const gpu = dbg ? glx.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : glx.getParameter(glx.RENDERER);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.01, 200);
  const post = createPost(renderer);
  const ctx = { THREE, renderer, scene, camera, variant: null, W: 0, H: 0, ar: null, post, clips: null, world: null, subjects: {}, postDefaults: {}, built: null, mode, params };
  const listeners = { variant: [], time: [] }, emit = (ev, x) => listeners[ev].forEach(f => f(x));
  let sceneKey = null, fonts = [], clock = clamp(+(params.get('t') ?? 0) || 0, 0, 1e9), playing = false, dirty = true, hq = true, last = null;

  // ── 尺寸：导出时正好是成片尺寸；预览时按舞台大小缩小 ──
  function size() {
    const [OW, OH] = ASPECTS[ctx.variant.ar];
    let k = 1;
    if (mode === 'live') {                                         // 舞台按比例塞进窗口（下方留出播放器）
      const s = Math.min((innerWidth * 0.96) / OW, Math.max(200, innerHeight - 150) / OH);
      root.style.width = `${Math.round(OW * s)}px`; root.style.height = `${Math.round(OH * s)}px`;
      k = Math.min(1, s * devicePixelRatio) * (hq ? 1 : 0.6);
    }
    const W = Math.round(OW * k), H = Math.round(OH * k);
    post.taps = hq ? 32 : 12;
    if (W === ctx.W && H === ctx.H) return;
    ctx.W = W; ctx.H = H; renderer.setSize(W, H, false); out.width = W; out.height = H; post.setSize(W, H); dirty = true;
  }

  // ── 字体：按变体的确切字符加载；有字体（或这一字重）没加载上就报错，不用回退字体出片 ──
  // 缺了某个字重时浏览器会拿相近字重顶上并照样返回，所以要逐个核对返回的字重
  const weightOk = (face, w) => { const [a, b = a] = String(face.weight).split(' ').map(x => (x === 'normal' ? 400 : x === 'bold' ? 700 : +x)); return w >= a && w <= b; };
  async function loadFonts(v) {
    const list = film.fonts(v), bad = [];
    await Promise.all(list.map(async f => {
      const faces = await document.fonts.load(fontStr(f, 40), f.text), w = f.weight ?? 400;
      if (!faces.length || faces.some(x => x.status !== 'loaded' || !weightOk(x, w))) bad.push(`${w} ${f.family}`);
    }));
    if (bad.length) throw new Error(`fonts not loaded: ${bad.join(', ')}`);
    return list.map(f => `${f.weight} ${f.family}`);
  }

  async function load(v) {
    ctx.variant = v; ctx.ar = v.ar; ctx.built = buildCut(film.cuts[v.cut]);
    size();
    const fontsP = loadFonts(v), key = film.sceneAxes.map(k => v[k]).join('|');
    if (key !== sceneKey) {
      ctx.world?.dispose?.(); disposeTree(scene); scene.clear();
      scene.environment?.dispose(); scene.environment = null; scene.background = null;
      ctx.subjects = {}; ctx.world = null;
      await film.setup(ctx);
      sceneKey = key;
      await renderer.compileAsync(scene, camera);
    }
    fonts = await fontsP;
    for (const e of ctx.built.entries) draw(e.start + (e.end - e.start) / 2);   // 每个镜头先画一帧：编译只在某些镜头出现的着色器
    clock = clamp(clock, 0, ctx.built.duration); dirty = true;
    emit('variant', v);
  }

  // ── 一个镜头的求值：复位 → 镜头函数 → 取景 → 字幕图层（引线端点按这一镜头的相机投影）──
  function evalShot(index, t) {
    const e = ctx.built.entries[index], lt = e.from + (t - e.start);
    const row = film.layouts[ctx.ar]?.[e.shot] ?? {};
    const s = { name: e.shot, lt, dur: e.dur, u: clamp(lt / e.dur), from: e.from, t, row };
    film.reset(ctx);
    const o = film.shots[e.shot](ctx, s);
    applyPose(camera, solvePose(o.camera, row, ctx.W / ctx.H), ctx.W, ctx.H);
    const text = (o.text ?? []).map(L => {
      const P = prepareLayer(L, { lt, zones: row.zones, W: ctx.W, H: ctx.H, minFrac: MIN_TEXT[ctx.ar], preview });
      if (L.leader?.world) { const [x, y] = projectPoint(camera, L.leader.world); P.leader = { ...L.leader, at: [x * ctx.W, y * ctx.H] }; }
      return P;
    });
    return { s, text, post: mergePost(ctx.postDefaults, o.post) };
  }
  function renderShot(E, target, mix = {}) {
    if (film.render) film.render(ctx, post.sceneRT);
    else { renderer.setRenderTarget(post.sceneRT); renderer.clear(); renderer.render(scene, camera); }
    post.render({ camera, settings: E.post, t: E.s.t, target, ...mix });
  }

  /** 画出 t 时刻的完整一帧（3D + 后期 + 字幕），返回 { t, shot, overflow: [图层 id] } */
  function draw(t) {
    t = clamp(t, 0, ctx.built.duration);
    const r = resolve(ctx.built, t);
    let prev = null;
    if (r.prev) { prev = evalShot(r.index - 1, t); renderShot(prev, post.prevRT); }
    const cur = evalShot(r.index, t);
    renderShot(cur, null, { prev: prev && post.prevRT.texture, k: r.prev?.k ?? 1, flash: r.flash });
    g.save(); g.globalAlpha = 1; g.drawImage(gl, 0, 0); g.restore();
    const overflow = [];
    if (prev) for (const L of prev.text) drawLayer(g, { ...L, alpha: L.alpha * (1 - r.prev.k) }, measure);
    for (const L of cur.text) if (drawLayer(g, L, measure).overflow) overflow.push(`${r.shot}.${L.id}`);
    for (const f of app.overlays) f(g, ctx, { t, shot: r.shot, row: film.layouts[ctx.ar]?.[r.shot] ?? {} });
    return { t, shot: r.shot, overflow };
  }

  function loop(now) {
    if (last != null && playing) { clock += (now - last) / 1000; if (clock >= ctx.built.duration) clock %= ctx.built.duration; dirty = true; }
    last = now;
    if (dirty && ctx.built) { size(); draw(clock); dirty = false; emit('time', clock); }
    requestAnimationFrame(loop);
  }

  let chain = Promise.resolve();
  const app = {
    ctx, film, mode, gpu, overlays: [], canvas: out,
    get t() { return clock; }, get playing() { return playing; }, get hq() { return hq; }, get fonts() { return fonts; },
    draw, size,
    png: () => out.toDataURL('image/png'),
    jpeg: (q = 0.92) => out.toDataURL('image/jpeg', q),
    on(ev, f) { listeners[ev].push(f); },
    seek(t) { clock = clamp(t, 0, ctx.built.duration); dirty = true; },
    play() { playing = true; }, pause() { playing = false; }, toggle() { playing = !playing; },
    setHQ(on) { hq = on; ctx.W = 0; size(); },
    redraw() { dirty = true; },
    /** 换变体：场景轴（如香型）变了才重建场景，其余即时切换；调用按顺序排队 */
    setVariant(patch) { chain = chain.then(() => load(parseVariant(film, { ...ctx.variant, ...patch }))); return chain; },
  };
  app.ready = (async () => {
    await load(parseVariant(film, params));
    if (mode === 'live') { playing = !params.has('paused'); requestAnimationFrame(loop); addEventListener('resize', () => { dirty = true; }); }
    return { gpu, W: ctx.W, H: ctx.H, duration: ctx.built.duration, fonts };
  })();
  return app;
}
