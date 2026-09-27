// main.js — 臨《蘭亭集序》：鋪卷、研墨、行筆、運鏡、鈐印
import { canvas, paperTile, mottle, silkTile, brocadeTile, feltTile, makeBaoshou, makeSeal } from './textures.js';
import { prepare, CharAnim, easeIO, clamp } from './anim.js';
import { drawBrush } from './brush.js';
import { BrushSound } from './sound.js';

const $ = s => document.querySelector(s);
const Q = new URLSearchParams(location.search);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const FONT = '"LXGW WenKai TC", "Kaiti TC", STKaiti, KaiTi, serif';

// ── 卷面佈局（世界座標 = 神龍本掃描影像像素）──
const PAPER = { x0: -660, x1: 4250, y0: -40, y1: 1520 };
const SILK = 96, TOP = PAPER.y0 - SILK, BOT = PAPER.y1 + SILK;
const GESHUI = { x0: 4250, x1: 4298 }, BAOSHOU = { x0: 4298, x1: 4556 }, STICK = { x0: 4556, x1: 4574 };
const ROLL_R = 38, MODEL_W = 4170, MODEL_H = 1480;
const COLO = { x: -150, y: 600, s: 0.56 };          // 款：「臨蘭亭」，集右軍本帖之字
const SEAL = { w: 60, h: 112 };                      // 「永和」白文印（世界尺寸）
const GAP = { char: 0.1, col: 0.42 };               // 字與字、行與行之間的停頓（1× 秒）

const HAN = '〇一二三四五六七八九';
function han(n) {
  if (n < 10) return HAN[n];
  if (n < 20) return '十' + (n % 10 ? HAN[n % 10] : '');
  if (n < 100) return HAN[Math.floor(n / 10)] + '十' + (n % 10 ? HAN[n % 10] : '');
  const h = Math.floor(n / 100), r = n % 100;
  return HAN[h] + '百' + (r === 0 ? '' : r < 10 ? '零' + HAN[r] : r < 20 ? '一' + han(r) : han(r));
}

const cv = $('#scene'), ctx = cv.getContext('2d');
const sound = new BrushSound();
const S = {
  T: 0, playing: false, speed: +Q.get('speed') || 2, trace: +Q.get('trace') || 0.07, view: Q.get('view') || 'auto',
  item: 0, cam: { x: 3900, y: 200, z: 1 }, ux: 3600, orig: 0, origHold: false,
  vw: 1, vh: 1, dpr: 1, stageH: 1, vel: { x: 0, y: 0 }, lastPen: null,
  focus: -1, done: 0, zhi: 0, shown: '', gallery: false, resume: false, side: new Set(),
};
let chars, cols, geo, sprite, halo, model, ghost, ink, ictx, pats, paperC, mottleC, baoshou, sealC, vignette;
let items = [], Tend = 0, textEnd = 0, seq = [], charT0 = [], colStarts = [], wet = [], spans = [], sealRect, noteTimer = 0, gal = null;

// ───────────────────────── 載入 ─────────────────────────
const img = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(src)); i.src = src; });
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
const status = t => { $('#startLabel').textContent = t; };

/** 灰度墨跡圖集 → 帶 alpha 的墨色：淡處偏暖褐，濃處近黑。 */
function makeSprite(atlas) {
  const c = canvas(atlas.width, atlas.height), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(atlas, 0, 0);
  const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i] / 255;
    d[i] = 60 - 46 * a; d[i + 1] = 50 - 38 * a; d[i + 2] = 42 - 32 * a; d[i + 3] = d[i + 3] && Math.round(a * 255);
  }
  g.putImageData(id, 0, 0);
  return c;
}

/** 透影：只取墨跡（不含原紙底色與鑒藏印），半解析度略帶模糊，如隔紙所見。 */
function makeGhost() {
  const s = 0.5, c = canvas(Math.ceil((PAPER.x1 - PAPER.x0) * s), Math.ceil((PAPER.y1 - PAPER.y0) * s)), g = c.getContext('2d');
  if (typeof g.filter === 'string') g.filter = 'blur(0.8px)';
  for (const ch of chars) {
    const [ax, ay] = ch.at, [x, y, w, h] = ch.box;
    g.drawImage(sprite, ax, ay, w, h, (x - PAPER.x0) * s, (y - PAPER.y0) * s, w * s, h * s);
  }
  return c;
}

/** 洇：模糊一份墨跡，落紙時以低透明度墊在字下。 */
function makeHalo(src) {
  const c = canvas(src.width, src.height), g = c.getContext('2d');
  if (typeof g.filter !== 'string') return null;
  g.filter = 'blur(2.4px)'; g.drawImage(src, 0, 0);
  return c;
}

async function boot() {
  status('研墨');
  const [data, atlas, mdl] = await Promise.all([
    fetch('assets/lanting.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
    img('assets/ink-atlas.png'), img('assets/model.jpg'),
  ]);
  chars = data.chars; cols = data.cols; model = mdl;
  status('鋪紙'); await nextFrame();
  sprite = makeSprite(atlas); halo = makeHalo(sprite); ghost = makeGhost();
  geo = chars.map(prepare);
  paperC = paperTile();
  pats = { paper: ctx.createPattern(paperC, 'repeat'), silk: ctx.createPattern(silkTile(), 'repeat'), felt: ctx.createPattern(feltTile(), 'repeat') };
  mottleC = mottle();
  ink = canvas(PAPER.x1 - PAPER.x0, PAPER.y1 - PAPER.y0); ictx = ink.getContext('2d');
  status('備筆'); await nextFrame();
  await Promise.race([document.fonts.load(`38px ${FONT}`, '蘭亭集序神龍本臨'), new Promise(r => setTimeout(r, 2500))]).catch(() => {});
  baoshou = makeBaoshou(BAOSHOU.x1 - BAOSHOU.x0, BOT - TOP, brocadeTile(), paperC, FONT);
  sealC = makeSeal(sprite, [chars.find(c => c.ch === '永'), chars.find(c => c.ch === '和')], SEAL.w, SEAL.h);
  document.documentElement.style.setProperty('--paper-img', `url(${paperC.toDataURL()})`);

  buildTimeline(); buildShiwen(); bindUI(); resize();
  const c0 = Q.has('c') ? charT0[clamp(+Q.get('c'), 0, chars.length - 1)] : +Q.get('t') || 0;
  seek(c0);
  markSeg('#speed', S.speed); markSeg('#view', S.view);
  requestAnimationFrame(tick);

  const start = $('#start');
  status('展卷'); start.disabled = false;
  start.addEventListener('click', begin, { once: true });
  if (Q.has('autoplay')) begin();
}

function begin() {
  if (S.started) return;
  S.started = true;
  $('#intro').classList.add('gone');
  if (!Q.has('paused')) setPlaying(true);
}

// ───────────────────────── 時間軸 ─────────────────────────
function buildTimeline() {
  // 書寫次序：「崇山」二字為一行寫成之後旁添，移至第四行末
  const all = chars.map((_, i) => i);
  const side = all.filter(i => chars[i].col === 3 && (chars[i].idx === 1 || chars[i].idx === 2));
  S.side = new Set(side);
  seq = all.filter(i => !S.side.has(i));
  seq.splice(seq.findLastIndex(i => chars[i].col === 3) + 1, 0, ...side);

  items = []; let t = 0;
  const add = (o, d) => { o.t0 = t; t += d; o.t1 = t; items.push(o); return o; };
  const c0 = chars[seq[0]], g0 = geo[seq[0]];
  let pen = [c0.box[0] + g0.start[0], c0.box[1] + g0.start[1]], prev = seq[0];
  add({ k: 'move', from: [pen[0] + 260, pen[1] - 170], to: pen, hop: 1, fadeIn: true }, 1.3);
  charT0[seq[0]] = 0;
  seq.forEach((i, n) => {
    const c = chars[i], g = geo[i], place = { x: c.box[0], y: c.box[1], s: 1 };
    const st = [place.x + g.start[0], place.y + g.start[1]];
    if (n > 0) {
      const d = Math.hypot(st[0] - pen[0], st[1] - pen[1]);
      const jump = c.col !== chars[prev].col || S.side.has(i) !== S.side.has(prev);
      charT0[i] = t;
      add({ k: 'move', from: pen, to: st, hop: Math.min(1, d / 160) }, (jump ? GAP.col : GAP.char) + d / (jump ? 2800 : 1600));
    }
    add({ k: 'char', i, c, g, place, n }, g.dur);
    pen = [place.x + g.end[0], place.y + g.end[1]]; prev = i;
  });
  textEnd = t;

  // 款「臨蘭亭」
  let y = COLO.y;
  ['臨', '蘭', '亭'].forEach((ch, k) => {
    const i = chars.findIndex(c => c.ch === ch), c = chars[i], g = geo[i], s = COLO.s;
    const place = { x: COLO.x - c.box[2] * s / 2, y, s };
    const st = [place.x + g.start[0] * s, place.y + g.start[1] * s];
    const d = Math.hypot(st[0] - pen[0], st[1] - pen[1]);
    add({ k: 'move', from: pen, to: st, hop: Math.min(1, d / 160) }, (k ? 0.16 : 1.6) + d / 2400);
    add({ k: 'char', i, c, g, place, n: seq.length + k, colo: true }, g.dur);
    pen = [place.x + g.end[0] * s, place.y + g.end[1] * s];
    y += c.box[3] * s * 0.88;
  });
  sealRect = { x: COLO.x - SEAL.w / 2, y: y + 34, w: SEAL.w, h: SEAL.h };
  add({ k: 'move', from: pen, to: [pen[0] + 240, pen[1] + 380], hop: 1, fadeOut: true }, 1.0);
  add({ k: 'seal' }, 1.9);
  add({ k: 'end' }, 0.9);
  Tend = t;
  colStarts = seq.filter(i => chars[i].idx === 0).map(i => charT0[i]);
}

/** 下一個（或當前）書寫中的字；筆行於字間時即指向將寫之字。 */
function focusIt() {
  for (let k = S.item; k < items.length; k++) if (items[k].k === 'char') return items[k];
  for (let k = items.length - 1; k >= 0; k--) if (items[k].k === 'char') return items[k];
  return null;
}

function bake(it) {
  const { c, place: p } = it, [ax, ay] = c.at, [, , w, h] = c.box;
  const dx = p.x - PAPER.x0, dy = p.y - PAPER.y0, dw = w * p.s, dh = h * p.s;
  if (halo) { ictx.globalAlpha = 0.2; ictx.drawImage(halo, ax, ay, w, h, dx, dy, dw, dh); ictx.globalAlpha = 1; }
  ictx.drawImage(sprite, ax, ay, w, h, dx, dy, dw, dh);
}

function finish(it, live) {
  if (it.k === 'char') {
    bake(it);
    if (live) wet.push({ it, t: performance.now() });
    it.anim = null;
    if (!it.colo) {
      spans[it.i].classList.add('done');
      if (!it.c.blot) S.done++;
      if (it.c.ch === '之') S.zhi++;
    }
  } else if (it.k === 'seal') {
    ictx.globalAlpha = 0.93;
    ictx.drawImage(sealC, sealRect.x - PAPER.x0, sealRect.y - PAPER.y0, sealRect.w, sealRect.h);
    ictx.globalAlpha = 1;
  } else if (it.k === 'end' && live) {
    $('#finale').hidden = false;
  }
}

function advance(live) {
  while (S.item < items.length && items[S.item].t1 <= S.T) finish(items[S.item++], live);
}

function seek(T) {
  S.T = clamp(T, 0, Tend);
  ictx.clearRect(0, 0, ink.width, ink.height);
  wet = []; S.done = 0; S.zhi = 0; S.item = 0; S.lastPen = null; S.vel = { x: 0, y: 0 };
  for (const s of spans) s.classList.remove('done', 'cur');
  for (const it of items) { it.anim = null; it.thud = false; }
  advance(false);
  $('#finale').hidden = S.item < items.length;
  S.focus = -1; S.shown = '';
  S.ux = uxTarget(false);
  if (S.view !== 'free') Object.assign(S.cam, camTarget());
  S.ux = Math.min(S.ux, uxTarget(true));
}

// ───────────────────────── 筆 ─────────────────────────
function penNow(dt) {
  const it = items[Math.min(S.item, items.length - 1)];
  const u = clamp((S.T - it.t0) / (it.t1 - it.t0), 0, 1);
  let p;
  if (it.k === 'move') {
    const e = easeIO(u);
    p = {
      x: lerp(it.from[0], it.to[0], e), y: lerp(it.from[1], it.to[1], e), lift: 1, hop: Math.sin(Math.PI * u) * it.hop,
      pres: 0, w: 0, contact: false, alpha: it.fadeIn ? smooth(0, 0.6, u) : it.fadeOut ? 1 - smooth(0.25, 1, u) : 1,
    };
  } else if (it.k === 'char') {
    it.anim ||= new CharAnim(it.c, it.g, sprite);
    const q = it.anim.update(S.T - it.t0), s = it.place.s;
    p = { x: it.place.x + q.x * s, y: it.place.y + q.y * s, lift: q.lift, hop: q.hop, pres: q.pres, w: q.w * s, contact: q.contact, alpha: 1 };
  } else {
    p = { x: S.lastPen?.x || 0, y: S.lastPen?.y || 0, lift: 1, hop: 0, pres: 0, w: 0, contact: false, alpha: 0 };
  }
  if (S.lastPen && dt > 0) {
    S.vel.x = lerp(S.vel.x, (p.x - S.lastPen.x) / dt, damp(14, dt));
    S.vel.y = lerp(S.vel.y, (p.y - S.lastPen.y) / dt, damp(14, dt));
  }
  const sp = Math.hypot(S.vel.x, S.vel.y), m = Math.min(1, sp / 900) / (sp || 1);
  p.vx = S.vel.x * m; p.vy = S.vel.y * m; p.speed = sp;
  p.k = it.k === 'char' && it.colo ? 0.8 : 1;
  S.lastPen = p;
  return p;
}

// ───────────────────────── 鏡頭與展卷 ─────────────────────────
function colX(it) { return it.colo ? COLO.x : (cols[it.c.col][0] + cols[it.c.col][1]) / 2; }

function camTarget() {
  const vw = S.vw, vh = S.stageH, it = focusIt();
  const near = () => {
    const s = it.place.s, z = vh * (it.colo ? 0.2 : 0.3) / (112 * s);
    return { x: it.place.x + it.c.box[2] * s / 2 + 0.05 * vw / z, y: it.place.y + it.c.box[3] * s / 2, z };
  };
  const col = () => {
    const z = vh * 0.92 / (BOT - TOP);
    return { x: Math.min(colX(it) + 0.1 * vw / z, STICK.x1 + 200 - 0.5 * vw / z), y: (TOP + BOT) / 2, z };
  };
  const all = () => {                                  // 左側讓出題簽
    const x0 = S.ux - 2 * ROLL_R - 70, x1 = STICK.x1 + 230, L = S.leftUI, R = 24;
    const z = Math.min((vw - L - R) / (x1 - x0), vh * 0.9 / (BOT - TOP + 160));
    return { x: (x0 + x1) / 2 - (L - R) / 2 / z, y: (TOP + BOT) / 2, z };
  };
  const seal = () => {
    const z = vh * 0.52 / (SEAL.h + 260);
    return { x: sealRect.x + SEAL.w / 2 + 0.05 * vw / z, y: sealRect.y + SEAL.h / 2 - 90, z };
  };
  switch (S.view) {
    case 'near': return near();
    case 'col': return col();
    case 'all': return all();
    case 'free': return { ...S.cam };
  }
  // 運鏡：開篇近觀筆鋒 → 首行漸退至通行 → 款與印近觀 → 全卷
  const endAt = items[items.length - 1].t0;
  if (S.T >= endAt - 0.2) return all();
  if (S.T >= textEnd) return S.item >= items.length - 3 ? seal() : near();
  const n = it.n + clamp((S.T - it.t0) / (it.t1 - it.t0), 0, 1), f = smooth(2.6, 14, n);
  if (f <= 0) return near();
  if (f >= 1) return col();
  const a = near(), b = col();
  return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), f)) };
}

function updateCamera(dt) {
  if (S.view === 'free') return;
  const t = camTarget();
  S.cam.x = lerp(S.cam.x, t.x, damp(2.6, dt));
  S.cam.y = lerp(S.cam.y, t.y, damp(2.6, dt));
  S.cam.z = Math.exp(lerp(Math.log(S.cam.z), Math.log(t.z), damp(2.2, dt)));
}

/** 卷向左展開：至少留出將寫之字左側一段白紙；近觀／通行時捲軸不入畫面。 */
function uxTarget(withView) {
  if (S.T >= textEnd) return PAPER.x0;
  const it = focusIt();
  let x = it.place.x - 330;
  const allView = S.view === 'all' || (S.view === 'auto' && S.T >= items[items.length - 1].t0 - 0.2);
  if (withView && !allView) x = Math.min(x, S.cam.x - S.vw / 2 / S.cam.z + 2 * ROLL_R + 24);
  return clamp(x, PAPER.x0, 4000);
}

function updateUnroll(dt) {
  const t = uxTarget(true);
  if (t < S.ux) S.ux = lerp(S.ux, t, damp(3.2, dt));
}

// ───────────────────────── 繪製 ─────────────────────────
function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function drawRoll(g) {
  const x1 = S.ux, x0 = x1 - 2 * ROLL_R, w = x1 - x0;
  for (const [y0, y1] of [[TOP - 30, TOP + 2], [BOT - 2, BOT + 30]]) {         // 軸頭
    const kx = x0 + w * 0.2, kw = w * 0.6, jg = g.createLinearGradient(kx, 0, kx + kw, 0);
    jg.addColorStop(0, '#6c775f'); jg.addColorStop(0.35, '#d7dec8'); jg.addColorStop(0.62, '#a9b495'); jg.addColorStop(1, '#4b543d');
    g.fillStyle = jg; rrect(g, kx, y0, kw, y1 - y0, 5); g.fill();
  }
  g.fillStyle = pats.silk; g.fillRect(x0, TOP, w, SILK); g.fillRect(x0, PAPER.y1, w, SILK);
  g.fillStyle = pats.paper; g.fillRect(x0, PAPER.y0, w, PAPER.y1 - PAPER.y0);
  const sh = g.createLinearGradient(x0, 0, x1, 0);
  sh.addColorStop(0, 'rgba(0,0,0,.66)'); sh.addColorStop(0.16, 'rgba(0,0,0,.22)'); sh.addColorStop(0.36, 'rgba(255,250,235,.24)');
  sh.addColorStop(0.52, 'rgba(255,250,235,.06)'); sh.addColorStop(0.82, 'rgba(0,0,0,.2)'); sh.addColorStop(1, 'rgba(0,0,0,.46)');
  g.fillStyle = sh; g.fillRect(x0, TOP, w, BOT - TOP);
  g.strokeStyle = 'rgba(60,45,28,.28)'; g.lineWidth = 1;
  for (const f of [0.9, 0.94, 0.975]) { g.beginPath(); g.moveTo(x0 + w * f, TOP); g.lineTo(x0 + w * f, BOT); g.stroke(); }
  const cs = g.createLinearGradient(x1, 0, x1 + 54, 0);
  cs.addColorStop(0, 'rgba(30,20,10,.3)'); cs.addColorStop(1, 'rgba(30,20,10,0)');
  g.fillStyle = cs; g.fillRect(x1, TOP, 54, BOT - TOP);
}

function drawRightEnd(g) {
  g.fillStyle = pats.silk; g.fillRect(GESHUI.x0, TOP, GESHUI.x1 - GESHUI.x0, BOT - TOP);
  g.drawImage(baoshou, BAOSHOU.x0, TOP);
  const sg = g.createLinearGradient(STICK.x0, 0, STICK.x1, 0);
  sg.addColorStop(0, '#2a1b10'); sg.addColorStop(0.45, '#6b4a2e'); sg.addColorStop(1, '#1f140b');
  g.fillStyle = sg; g.fillRect(STICK.x0, TOP - 4, STICK.x1 - STICK.x0, BOT - TOP + 8);
  // 帶子、別子
  const y = (TOP + BOT) / 2;
  g.lineCap = 'round';
  g.strokeStyle = '#31425b'; g.lineWidth = 14;
  g.beginPath(); g.moveTo(STICK.x1 - 4, y - 10); g.bezierCurveTo(STICK.x1 + 60, y + 30, STICK.x1 + 110, y + 90, STICK.x1 + 150, y + 70); g.stroke();
  g.strokeStyle = 'rgba(200,170,110,.35)'; g.lineWidth = 1.2; g.setLineDash([5, 4]); g.stroke(); g.setLineDash([]);
  g.save(); g.translate(STICK.x1 + 164, y + 64); g.rotate(-0.5);
  const jg = g.createLinearGradient(0, -8, 0, 8);
  jg.addColorStop(0, '#dfe6d0'); jg.addColorStop(0.5, '#a9b996'); jg.addColorStop(1, '#6e7d5d');
  g.fillStyle = jg; rrect(g, -20, -7, 40, 14, 6); g.fill();
  g.restore();
}

const poly = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };

/** 鈐印：壽山石印與筆管同一斜視（軸向右上），落下、按實、提起；印文於按下後顯出。 */
function drawSealAnim(g, it, u) {
  const r = sealRect, P0 = 0.36, P1 = 0.56;
  if (u >= P0) {
    if (!it.thud) { it.thud = true; sound.thud(); }
    g.globalAlpha = 0.93 * smooth(P0, P0 + 0.05, u); g.drawImage(sealC, r.x, r.y, r.w, r.h); g.globalAlpha = 1;
  }
  const lift = u < P0 ? 1 - easeIO(u / P0) : u < P1 ? 0 : easeIO((u - P1) / (1 - P1));
  const a = u < 0.1 ? u / 0.1 : u > 0.84 ? (1 - u) / 0.16 : 1;
  if (a <= 0) return;
  const AX = 0.3, AY = -0.95, TALL = 150, up = lift * 120;
  const m = 3, x0 = r.x - m, y0 = r.y - m, x1 = r.x + r.w + m, y1 = r.y + r.h + m;
  const bx = AX * up, by = AY * up, tx = AX * (up + TALL), ty = AY * (up + TALL);
  const B = [[x0 + bx, y0 + by], [x1 + bx, y0 + by], [x1 + bx, y1 + by], [x0 + bx, y1 + by]];
  const T = B.map(([x, y]) => [x + tx - bx, y + ty - by]);
  g.save();
  g.globalAlpha = a;
  // 影：印身沿光向（左上來光）投在紙上，離紙愈高愈淡愈散
  const sx = 0.55 * (up + TALL * 0.8), sy = 0.26 * (up + TALL * 0.8), k0 = 0.55 * up, k1 = 0.26 * up;
  const F = [[x0 + k0, y0 + k1], [x1 + k0, y0 + k1], [x1 + k0, y1 + k1], [x0 + k0, y1 + k1]];
  const K = S.dpr * S.cam.z, OFF = 20000;                                          // 只留模糊的影：形體畫在畫外，影偏移回來
  g.save();
  g.shadowColor = `rgba(40,24,10,${0.36 * (1 - lift * 0.55)})`; g.shadowBlur = (8 + up * 0.22) * K; g.shadowOffsetX = -OFF * K;
  poly(g, [F[0], F[1], [F[1][0] + sx, F[1][1] + sy], [F[2][0] + sx, F[2][1] + sy], [F[3][0] + sx, F[3][1] + sy], F[3]].map(([x, y]) => [x + OFF, y]));
  g.fillStyle = '#000'; g.fill();
  g.restore();
  // 左側面、前側面
  const side = (pts, c0, c1, gx0, gy0, gx1, gy1) => {
    const gr = g.createLinearGradient(gx0, gy0, gx1, gy1); gr.addColorStop(0, c0); gr.addColorStop(1, c1);
    poly(g, pts); g.fillStyle = gr; g.fill();
  };
  side([B[0], T[0], T[3], B[3]], '#5e3a1a', '#8a5a2c', B[0][0], 0, T[0][0], 0);
  side([B[3], B[2], T[2], T[3]], '#8a5526', '#c38a4c', 0, B[3][1], 0, T[3][1]);
  g.save(); poly(g, [B[3], B[2], T[2], T[3]]); g.clip();                            // 石紋
  g.strokeStyle = 'rgba(70,36,12,.32)'; g.lineWidth = 1.1;
  for (const f of [0.2, 0.47, 0.71, 0.88]) {
    const p0 = [lerp(B[3][0], B[2][0], f), B[3][1]], p1 = [lerp(T[3][0], T[2][0], f + 0.05), T[3][1]];
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.quadraticCurveTo(lerp(p0[0], p1[0], 0.5) + 9 * (f - 0.5), lerp(p0[1], p1[1], 0.5), p1[0], p1[1]); g.stroke();
  }
  g.fillStyle = 'rgba(255,230,190,.12)'; g.fillRect(lerp(B[3][0], B[2][0], 0.3), T[3][1], 14, B[3][1] - T[3][1]);
  g.restore();
  g.fillStyle = 'rgba(170,38,24,.8)';                                              // 印面邊沿的印泥
  poly(g, [B[3], B[2], [B[2][0] + AX * 4, B[2][1] + AY * 4], [B[3][0] + AX * 4, B[3][1] + AY * 4]]); g.fill();
  poly(g, [B[0], [B[0][0] + AX * 4, B[0][1] + AY * 4], [B[3][0] + AX * 4, B[3][1] + AY * 4], B[3]]); g.fill();
  // 印頂與印鈕
  const tg = g.createLinearGradient(T[0][0], T[0][1], T[2][0], T[2][1]);
  tg.addColorStop(0, '#f0cf98'); tg.addColorStop(0.55, '#d59e5c'); tg.addColorStop(1, '#b37a3f');
  poly(g, T); g.fillStyle = tg; g.fill();
  const cx = (T[0][0] + T[2][0]) / 2, cy = (T[0][1] + T[2][1]) / 2, rw = (x1 - x0) * 0.3, rh = (y1 - y0) * 0.3;
  const kg = g.createRadialGradient(cx - rw * 0.3, cy - rh * 0.4, 1, cx, cy, Math.max(rw, rh) * 1.1);
  kg.addColorStop(0, 'rgba(255,240,210,.55)'); kg.addColorStop(0.6, 'rgba(190,130,70,.25)'); kg.addColorStop(1, 'rgba(110,62,26,.45)');
  g.beginPath(); g.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2); g.fillStyle = kg; g.fill();
  g.strokeStyle = 'rgba(96,54,22,.45)'; g.lineWidth = 1; g.stroke();
  g.strokeStyle = 'rgba(60,32,12,.55)'; g.lineWidth = 1.2;                         // 稜線
  poly(g, [B[0], T[0], T[1], T[2], B[2], B[3]]); g.stroke();
  g.beginPath(); g.moveTo(T[3][0], T[3][1]); g.lineTo(T[0][0], T[0][1]); g.moveTo(T[3][0], T[3][1]); g.lineTo(T[2][0], T[2][1]); g.moveTo(T[3][0], T[3][1]); g.lineTo(B[3][0], B[3][1]); g.stroke();
  g.restore();
}

function render(pen, now) {
  const g = ctx, { x: cx, y: cy, z } = S.cam, k = S.dpr * z;
  const tx = S.dpr * S.vw / 2 - cx * k, ty = S.dpr * S.stageH / 2 - cy * k;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.setTransform(k, 0, 0, k, tx, ty);
  const vx0 = -tx / k, vy0 = -ty / k, vx1 = vx0 + cv.width / k, vy1 = vy0 + cv.height / k;

  g.fillStyle = pats.felt; g.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);            // 案上毛氈

  const sx0 = S.ux - 2 * ROLL_R;                                                   // 卷的落影
  g.save();
  g.shadowColor = 'rgba(0,0,0,.62)'; g.shadowBlur = clamp(44 * k, 8, 70); g.shadowOffsetY = clamp(14 * k, 3, 24);
  g.fillStyle = '#2b251f'; g.fillRect(sx0, TOP, STICK.x1 - sx0, BOT - TOP);
  g.restore();

  const pw = GESHUI.x0 - S.ux;
  g.fillStyle = pats.silk; g.fillRect(S.ux, TOP, pw, SILK); g.fillRect(S.ux, PAPER.y1, pw, SILK);
  g.fillStyle = pats.paper; g.fillRect(S.ux, PAPER.y0, pw, PAPER.y1 - PAPER.y0);

  g.save();
  g.beginPath(); g.rect(S.ux, PAPER.y0, pw, PAPER.y1 - PAPER.y0); g.clip();
  g.globalCompositeOperation = 'multiply';
  g.globalAlpha = 0.85; g.drawImage(mottleC, PAPER.x0, PAPER.y0, PAPER.x1 - PAPER.x0, PAPER.y1 - PAPER.y0);
  const tr = S.trace * (1 - S.orig);
  if (tr > 0.004) { g.globalAlpha = tr; g.drawImage(ghost, PAPER.x0, PAPER.y0, PAPER.x1 - PAPER.x0, PAPER.y1 - PAPER.y0); }   // 透影
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;

  const ix0 = Math.max(vx0, PAPER.x0), iy0 = Math.max(vy0, PAPER.y0), ix1 = Math.min(vx1, PAPER.x1), iy1 = Math.min(vy1, PAPER.y1);
  if (ix1 > ix0 && iy1 > iy0) g.drawImage(ink, ix0 - PAPER.x0, iy0 - PAPER.y0, ix1 - ix0, iy1 - iy0, ix0, iy0, ix1 - ix0, iy1 - iy0);

  wet = wet.filter(w => {                                                          // 墨濕 → 漸乾
    const age = (now - w.t) / 1700;
    if (age >= 1) return false;
    const { c, place: p } = w.it, [, , bw, bh] = c.box;
    g.globalAlpha = 0.42 * Math.pow(1 - age, 1.4);
    g.drawImage(sprite, c.at[0], c.at[1], bw, bh, p.x, p.y, bw * p.s, bh * p.s);
    return true;
  });
  g.globalAlpha = 1;

  const it = items[S.item];
  if (it && it.k === 'char' && it.anim) {
    const live = it.anim.composite(), p = it.place, bw = it.c.box[2] * p.s, bh = it.c.box[3] * p.s;
    g.drawImage(live, p.x, p.y, bw, bh);
    g.globalAlpha = 0.42; g.drawImage(live, p.x, p.y, bw, bh); g.globalAlpha = 1;
  }
  if (it && it.k === 'seal') drawSealAnim(g, it, clamp((S.T - it.t0) / (it.t1 - it.t0), 0, 1));

  if (S.orig > 0.004) { g.globalAlpha = S.orig; g.drawImage(model, 0, 0, MODEL_W, MODEL_H, 0, 0, MODEL_W, MODEL_H); g.globalAlpha = 1; }
  g.restore();

  g.strokeStyle = 'rgba(70,56,36,.4)'; g.lineWidth = 1.5;                         // 紙綾接縫
  g.beginPath();
  g.moveTo(S.ux, PAPER.y0); g.lineTo(GESHUI.x0, PAPER.y0); g.moveTo(S.ux, PAPER.y1); g.lineTo(GESHUI.x0, PAPER.y1);
  g.moveTo(GESHUI.x0, TOP); g.lineTo(GESHUI.x0, BOT);
  g.stroke();
  g.strokeStyle = 'rgba(25,20,14,.7)'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(S.ux, TOP); g.lineTo(GESHUI.x1, TOP); g.moveTo(S.ux, BOT); g.lineTo(GESHUI.x1, BOT); g.stroke();

  drawRightEnd(g);
  drawRoll(g);
  drawBrush(g, pen, pen.k);

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(vignette, 0, 0);
}

// ───────────────────────── 界面 ─────────────────────────
function buildShiwen() {
  const box = $('#shiwen'), byCol = [];
  box.textContent = '';
  chars.forEach((c, i) => (byCol[c.col] ||= []).push(i));
  for (const list of byCol) {
    const col = document.createElement('div');
    col.className = 'sw-col';
    for (const i of list) {
      const c = chars[i], s = document.createElement('span');
      if (c.blot) { s.className = 'blot'; s.title = '塗抹'; } else s.textContent = c.ch;
      if (S.side.has(i)) { s.classList.add('side'); s.title = '旁添'; }
      s.dataset.i = i; spans[i] = s; col.append(s);
    }
    box.append(col);
  }
  box.addEventListener('click', e => {
    const s = e.target.closest('span[data-i]');
    if (s) { seek(charT0[+s.dataset.i]); begin(); }
  });
}

function showNote(c) {
  const el = $('#note');
  $('.note-where', el).textContent = `第${han(c.col + 1)}行　${c.blot ? '塗抹' : '「' + c.ch + '」'}`;
  $('.note-text', el).textContent = c.note;
  el.classList.add('show');
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => el.classList.remove('show'), 6500);
}

function updateUI() {
  const it = focusIt(), i = it && !it.colo ? it.i : -1;
  if (i !== S.focus) {
    if (S.focus >= 0) spans[S.focus].classList.remove('cur');
    S.focus = i;
    if (i >= 0) {
      spans[i].classList.add('cur');
      if (chars[i].note && S.playing) showNote(chars[i]);
    }
  }
  const col = i >= 0 ? chars[i].col + 1 : 28, key = `${col}|${S.done}|${S.zhi}`;
  if (key !== S.shown) {
    S.shown = key;
    $('#stCol').textContent = han(col); $('#stChar').textContent = han(S.done); $('#stZhi').textContent = han(S.zhi);
  }
  $('#prog').style.width = `${(S.T / Tend) * 100}%`;
}

function setPlaying(v) {
  if (v && S.T >= Tend) seek(0);
  S.playing = v;
  const b = $('#play');
  b.classList.toggle('on', v); b.setAttribute('aria-label', v ? '停筆' : '行筆');
  if (v) sound.on && sound.enable();
}

function markSeg(sel, v) {
  for (const b of document.querySelectorAll(`${sel} button`)) {
    const on = String(b.dataset.v) === String(v);
    b.classList.toggle('on', on); b.setAttribute('aria-checked', on);
  }
}
function setView(v) { S.view = v; markSeg('#view', v); }

function jumpCol(dir) {
  const t = dir > 0 ? colStarts.find(s => s > S.T + 0.01) : [...colStarts].reverse().find(s => s < S.T - 0.6);
  seek(t ?? (dir > 0 ? S.T : 0));
}

function bindUI() {
  $('#play').addEventListener('click', () => { begin(); setPlaying(!S.playing); });
  $('#speed').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { S.speed = +b.dataset.v; markSeg('#speed', S.speed); } });
  $('#view').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setView(b.dataset.v); });
  const tr = $('#trace'); tr.value = S.trace; tr.addEventListener('input', () => { S.trace = +tr.value; });
  const orig = $('#btnOrig'), hold = v => { S.origHold = v; orig.classList.toggle('held', v); };
  orig.addEventListener('pointerdown', () => hold(true));
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) orig.addEventListener(ev, () => hold(false));
  $('#btnZhi').addEventListener('click', openGallery);
  $('#btnSound').addEventListener('click', e => {
    const on = !sound.on && sound.enable();
    if (!on) sound.disable();
    e.currentTarget.setAttribute('aria-pressed', on);
  });
  $('#btnRestart').addEventListener('click', () => { seek(0); begin(); setPlaying(true); });
  $('#finale').addEventListener('click', e => {
    const a = e.target.closest('button')?.dataset.act;
    if (a === 'zhi') openGallery();
    if (a === 'again') { seek(0); setPlaying(true); }
  });
  $('#gallery .close').addEventListener('click', closeGallery);
  $('#gallery').addEventListener('click', e => { if (e.target.id === 'gallery') closeGallery(); });

  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' && e.key !== ' ') return;
    if (e.key === ' ') { e.preventDefault(); if (!S.started) begin(); else setPlaying(!S.playing); }
    else if (e.key === 'ArrowLeft') jumpCol(1);                  // 行序右起：向左即往後
    else if (e.key === 'ArrowRight') jumpCol(-1);
    else if (e.key === 'm' || e.key === 'M') hold(true);
    else if (e.key === 'f' || e.key === 'F') setView(S.view === 'all' ? 'auto' : 'all');
    else if (e.key === 'Escape' && S.gallery) closeGallery();
  });
  addEventListener('keyup', e => { if (e.key === 'm' || e.key === 'M') hold(false); });

  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, cx: S.cam.x, cy: S.cam.y, moved: false }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true; setView('free'); cv.classList.add('dragging');
    S.cam.x = drag.cx - dx / S.cam.z; S.cam.y = drag.cy - dy / S.cam.z;
  });
  const end = () => { drag = null; cv.classList.remove('dragging'); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', e => {
    e.preventDefault(); setView('free');
    const z = clamp(S.cam.z * Math.exp(-e.deltaY * 0.0015), 0.08, 6);
    const wx = S.cam.x + (e.clientX - S.vw / 2) / S.cam.z, wy = S.cam.y + (e.clientY - S.stageH / 2) / S.cam.z;
    S.cam.z = z; S.cam.x = wx - (e.clientX - S.vw / 2) / z; S.cam.y = wy - (e.clientY - S.stageH / 2) / z;
  }, { passive: false });
  cv.addEventListener('dblclick', () => setView('auto'));
  addEventListener('resize', resize);
  new ResizeObserver(() => { if (Math.abs(stageNow() - S.stageH) > 1) resize(); }).observe($('.shiwen-wrap'));
}

/** 舞台＝控制列、釋文之上的區域（按實際版面量度，字型載入後亦會重算）。 */
function stageNow() {
  const tops = ['.bar', '.shiwen-wrap'].map(q => $(q).getBoundingClientRect()).filter(r => r.height).map(r => r.top);
  return Math.max(200, Math.min(innerHeight, ...tops) - 12);
}

function resize() {
  S.dpr = Math.min(2, devicePixelRatio || 1);
  S.vw = innerWidth; S.vh = innerHeight;
  S.stageH = stageNow();
  S.leftUI = $('.masthead').getBoundingClientRect().right + 12;
  const ui = S.vh - S.stageH;
  cv.width = Math.round(S.vw * S.dpr); cv.height = Math.round(S.vh * S.dpr);
  ctx.imageSmoothingQuality = 'high';
  vignette = canvas(cv.width, cv.height);
  const g = vignette.getContext('2d'), W = cv.width, H = cv.height, cy = S.stageH / 2 * S.dpr;
  const rg = g.createRadialGradient(W / 2, cy, Math.min(W, H) * 0.25, W / 2, cy, Math.hypot(W, H) * 0.62);
  rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,.55)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  const bg = g.createLinearGradient(0, H - ui * S.dpr - 40 * S.dpr, 0, H);
  bg.addColorStop(0, 'rgba(10,8,6,0)'); bg.addColorStop(1, 'rgba(10,8,6,.5)');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
}

// ───────────────────────── 廿之 ─────────────────────────
function buildGallery() {
  const grid = $('#zhiGrid'), zs = seq.filter(i => chars[i].ch === '之');
  const maxDim = Math.max(...zs.map(i => Math.max(chars[i].box[2], chars[i].box[3])));
  gal = { maxDim, t0: 0, cards: [], period: Math.max(...zs.map(i => geo[i].dur)) + 1.6 };
  zs.forEach((i, k) => {
    const c = chars[i], line = chars.filter(x => x.col === c.col && !x.blot), pos = line.indexOf(c);
    const before = line.slice(Math.max(0, pos - 2), pos).map(x => x.ch).join(''), after = line.slice(pos + 1, pos + 2).map(x => x.ch).join('');
    const el = document.createElement('div');
    el.className = 'zhi-card'; el.style.animationDelay = `${k * 45}ms`; el.title = '移筆至此處';
    const n = document.createElement('span'); n.className = 'n'; n.textContent = han(k + 1);
    const cvs = document.createElement('canvas');
    const ctxt = document.createElement('span'); ctxt.className = 'ctx';
    ctxt.append(before, Object.assign(document.createElement('em'), { textContent: '之' }), after);
    const where = document.createElement('span'); where.className = 'where'; where.textContent = `第${han(c.col + 1)}行`;
    el.append(n, cvs, ctxt, where);
    if (c.note) { el.append(Object.assign(document.createElement('i'), { className: 'mark', textContent: '改' })); el.title = `${c.note}　·　移筆至此處`; }
    el.addEventListener('click', () => { closeGallery(); seek(charT0[i]); begin(); setPlaying(true); });
    grid.append(el);
    gal.cards.push({ c, cvs, g: cvs.getContext('2d'), anim: new CharAnim(c, geo[i], sprite) });
  });
}

function openGallery() {
  if (!gal) buildGallery();
  S.resume = S.playing; setPlaying(false);
  S.gallery = true; $('#gallery').hidden = false; gal.t0 = performance.now();
  for (const cd of gal.cards) cd.anim.reset();
}

function closeGallery() {
  S.gallery = false; $('#gallery').hidden = true;
  if (S.resume) setPlaying(true);
}

function drawGallery(now) {
  const t = ((now - gal.t0) / 1000) % gal.period;
  for (const { c, cvs, g, anim } of gal.cards) {
    const size = Math.round(cvs.clientWidth * S.dpr);
    if (!size) continue;
    if (cvs.width !== size) { cvs.width = cvs.height = size; }
    const p = anim.update(Math.min(t, anim.g.dur));
    const [, , w, h] = c.box, sc = size * 0.86 / gal.maxDim, ox = (size - w * sc) / 2, oy = (size - h * sc) / 2;
    g.clearRect(0, 0, size, size);
    g.globalAlpha = 0.08; g.drawImage(sprite, c.at[0], c.at[1], w, h, ox, oy, w * sc, h * sc);
    g.globalAlpha = 1; g.drawImage(anim.composite(), ox, oy, w * sc, h * sc);
    if (t < anim.g.dur) {                                                          // 朱點標出筆鋒所在
      g.fillStyle = `rgba(198,61,36,${0.35 + 0.55 * (1 - p.lift)})`;
      g.beginPath(); g.arc(ox + p.x * sc, oy + p.y * sc, 2.6 * S.dpr, 0, Math.PI * 2); g.fill();
    }
  }
}

// ───────────────────────── 主迴圈 ─────────────────────────
let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  if (S.gallery) { drawGallery(now); requestAnimationFrame(tick); return; }
  if (S.playing) {
    S.T = Math.min(Tend, S.T + dt * S.speed);
    if (S.T >= Tend) setPlaying(false);
  }
  advance(true);
  const pen = penNow(dt);
  updateCamera(dt);
  updateUnroll(dt);
  S.orig = lerp(S.orig, S.origHold ? 1 : 0, damp(9, dt));
  updateUI();
  render(pen, now);
  sound.update(pen.contact && S.playing, pen.speed, pen.pres);
  requestAnimationFrame(tick);
}

window.__lanting = { S, seek, get items() { return items; }, get Tend() { return Tend; }, charT0 };
boot().catch(err => { console.error(err); status('載入失敗：請以 http 伺服器開啟'); });
