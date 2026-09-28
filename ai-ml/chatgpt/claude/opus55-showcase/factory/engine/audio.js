// audio.js — 声音：合成音色、整段离线混音（OfflineAudioContext，48 kHz 立体声）、预览时跟着画面播放
// 音符表来自 film.score(v, built)；整段先离线渲染成一块缓冲，预览播放的和导出写进 WAV 的是同一块，所以预览里听到的就是成片的声音
// 音色里的"随机"（拨弦的激励、噪声、混响的尾巴）都取自 rng.js；多路信号汇到一处时两两相加（sum）：同一变体渲染两遍逐采样相同
// 配音片段（factory/vo.mjs 生成，在成片页面旁边的 assets/vo/）按 film.voLines(v) 排进混音，配乐在每句下面让开
import { rand } from './rng.js';

export const SR = 48000;
export const BUSES = ['music', 'sfx'];                         // 音符走的母线。music：配乐，在配音下压低；sfx：音效和品牌动机，不压
export const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const FADE = 0.3;                                              // 结尾淡出（秒）：成片最后一帧不会切在余音中间

// ── 纯函数：Node 里可测 ──
export function noise(n, seed) {
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = rand(seed, i) * 2 - 1;
  return x;
}

/** 拨弦（Karplus–Strong）：f 赫兹，len 秒；t60 余音衰减 60 dB 的秒数，bright 0–1 起音的亮度；峰值归一到 1 */
export function pluck(f, len, { t60 = 2, bright = 0.5, seed = 1, sr = SR } = {}) {
  const n = Math.ceil(len * sr), y = new Float32Array(n), D = sr / f - 0.5, P = Math.min(n, Math.ceil(D) + 1);
  const rho = Math.pow(10, -3 / (t60 * f)), a = 0.1 + 0.9 * bright;
  let lp = 0, mean = 0;
  for (let i = 0; i < P; i++) { lp += a * (rand(seed, i) * 2 - 1 - lp); y[i] = lp; mean += lp / P; }
  for (let i = 0; i < P; i++) y[i] -= mean;                   // 激励去掉直流：直流在环路里只按 rho 衰减，会拖出一段偏移
  const tap = x => { const i0 = Math.floor(x); return y[i0] + (y[i0 + 1] - y[i0]) * (x - i0); };
  for (let i = P; i < n; i++) y[i] = rho * 0.5 * (tap(i - D) + tap(i - D - 1));   // 环路延迟 D + 0.5 = sr / f
  let pk = 0;
  for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(y[i]));
  if (pk > 0) for (let i = 0; i < n; i++) y[i] /= pk;
  return y;
}

/** 混响的冲激响应：左右声道各一段指数衰减的噪声（decay 秒衰减 60 dB），12 ms 预延迟，越往后越暗 */
export function impulse(decay, { seed = 7, sr = SR } = {}) {
  const n = Math.ceil(decay * sr), pre = Math.round(0.012 * sr);
  return [0, 1].map(c => {
    const y = new Float32Array(n);
    let lp = 0;
    for (let i = pre; i < n; i++) {
      const k = (i - pre) / (n - pre);
      lp += (0.9 - 0.75 * k) * (rand(seed + c, i) * 2 - 1 - lp);
      y[i] = lp * Math.pow(10, (-3 * (i - pre)) / (decay * sr));
    }
    return y;
  });
}

export function peak(buffer) {
  let pk = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) for (const s of buffer.getChannelData(c)) pk = Math.max(pk, Math.abs(s));
  return pk;
}

// ── 音色：把一个事件 { t, f, d, v, p, seed } 接到 out 上。d 是音的长度（秒）；击弦、敲击类的 d 是余音长度 ──
const gainNode = (ac, v, out) => { const g = ac.createGain(); g.gain.value = v; if (out) g.connect(out); return g; };
const filt = (ac, type, f, q, out) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; if (out) b.connect(out); return b; };
const osc = (ac, type, f, out) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; if (out) o.connect(out); return o; };
/** 把多路接到 dest，两两相加成一棵树。Chromium 把接在同一个输入上的多路按不固定的次序相加，三路以上时浮点和的末位每次渲染都可能不同；
 *  每个节点最多接两路，两数相加与次序无关，整段混音就逐采样可复现 */
function sum(ac, nodes, dest) {
  let level = nodes;
  while (level.length > 2) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 === level.length) { next.push(level[i]); break; }
      const g = gainNode(ac, 1);
      level[i].connect(g); level[i + 1].connect(g); next.push(g);
    }
    level = next;
  }
  for (const n of level) n.connect(dest);
}
/** 包络：a 秒升到 v，保持到 t0 + hold，r 秒指数落下；返回这个音结束的时刻 */
function env(g, t0, hold, v, a, r) {
  const t1 = t0 + Math.max(a, hold);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + a);
  g.gain.setValueAtTime(v, t1); g.gain.exponentialRampToValueAtTime(1e-4, t1 + r);
  return t1 + r;
}
/** 慢慢飘动的曲线（0.1–0.6 Hz 三个正弦叠加，相位由 seed 决定），值在 −1…1，每秒 30 个点 */
function drift(seed, d) {
  const n = Math.max(2, Math.ceil(d * 30)), ph = [0, 1, 2].map(i => rand(seed, i) * 2 * Math.PI), c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = (i / (n - 1)) * d; c[i] = (Math.sin(0.13 * 6.283 * t + ph[0]) + Math.sin(0.31 * 6.283 * t + ph[1]) + Math.sin(0.57 * 6.283 * t + ph[2])) / 3; }
  return c;
}

export const VOICES = {
  /** 拨弦（古琴、竖琴、卡林巴）：p.t60 余音，p.bright 亮度 */
  pluck(ac, e, out) {
    const { t60 = 2, bright = 0.5 } = e.p, b = ac.createBuffer(1, Math.ceil(e.d * ac.sampleRate), ac.sampleRate);
    b.copyToChannel(pluck(e.f, e.d, { t60, bright, seed: e.seed, sr: ac.sampleRate }), 0);
    const s = ac.createBufferSource(), g = gainNode(ac, 0.3 * e.v, out);
    s.buffer = b; s.connect(g); s.start(e.t);
    g.gain.setValueAtTime(0.3 * e.v, e.t + e.d - 0.02); g.gain.linearRampToValueAtTime(0, e.t + e.d);   // 截断处 20 ms 淡出，免得咔哒一声
  },
  /** 铺底：两支失谐的锯齿 + 低八度三角波，柔和低通；p.a 起音、p.r 释放、p.cut 截止频率（f 的倍数）、p.air 气声 */
  pad(ac, e, out, kit) {
    const { a = 0.8, r = 1.2, cut = 3, air = 0 } = e.p, g = gainNode(ac, 0, out), lp = filt(ac, 'lowpass', Math.min(e.f * cut, 8000), 0.5, g);
    const end = env(g, e.t, e.d, 0.05 * e.v, a, r);
    sum(ac, [['sawtooth', 1, -7, 0.5], ['sawtooth', 1, 7, 0.5], ['triangle', 0.5, 0, 0.8]].map(([type, k, det, lv]) => {
      const g = gainNode(ac, lv), o = osc(ac, type, e.f * k, g); o.detune.value = det; o.start(e.t); o.stop(end);
      return g;
    }), lp);
    if (air) kit.noise(e.t, end, e.seed).connect(filt(ac, 'bandpass', Math.min(e.f * 4, 9000), 1.5, gainNode(ac, air * 0.6, g)));
  },
  /** 气声长笛：正弦 + 少量二次谐波，0.3 秒后渐入颤音；p.breath 气流噪声的多少，起音时更多（吹口的"噗"） */
  flute(ac, e, out, kit) {
    const { a = 0.08, r = 0.25, breath = 0.3 } = e.p, g = gainNode(ac, 0, out), end = env(g, e.t, e.d, 0.12 * e.v, a, r);
    const o1 = osc(ac, 'sine', e.f, g), o2 = osc(ac, 'triangle', e.f * 2, gainNode(ac, 0.1, g));
    if (e.d > 0.45) {
      const lfo = osc(ac, 'sine', 5.2), dep = gainNode(ac, 0);
      lfo.connect(dep); dep.connect(o1.detune); dep.connect(o2.detune);
      dep.gain.setValueAtTime(0, e.t + 0.3); dep.gain.linearRampToValueAtTime(12, e.t + 0.7);
      lfo.start(e.t); lfo.stop(end);
    }
    for (const o of [o1, o2]) { o.start(e.t); o.stop(end); }
    const ng = gainNode(ac, 0, out), v = 0.12 * e.v * breath;
    kit.noise(e.t, end, e.seed).connect(filt(ac, 'bandpass', e.f * 2, 1.2, ng));
    ng.gain.setValueAtTime(0, e.t); ng.gain.linearRampToValueAtTime(v * 2.5, e.t + a * 0.6);
    ng.gain.linearRampToValueAtTime(v, e.t + a * 2); ng.gain.setValueAtTime(v, e.t + Math.max(a * 2, e.d)); ng.gain.exponentialRampToValueAtTime(1e-4, end);
  },
  /** 钟、钢片琴、玻璃：几个正弦分音，越高的衰减越快；p.ratios 分音比，p.bright 高分音的多少；d = 基音的余音 */
  bell(ac, e, out) {
    const { ratios = [1, 2, 3.01, 4.2, 5.43], bright = 1 } = e.p;
    sum(ac, ratios.filter(k => e.f * k <= 16000).map((k, i) => {
      const dec = e.d / (1 + i * 0.8), og = gainNode(ac, 0), o = osc(ac, 'sine', e.f * k, og);
      og.gain.setValueAtTime(0, e.t); og.gain.linearRampToValueAtTime(Math.pow(0.55, i) * (i ? bright : 1), e.t + 0.002);
      og.gain.exponentialRampToValueAtTime(1e-4, e.t + dec);
      o.start(e.t); o.stop(e.t + dec);
      return og;
    }), gainNode(ac, 0.1 * e.v, out));
  },
  /** 水滴：正弦向上滑（气泡的共振），40 ms 内从 f 滑到 f × p.up，d 秒衰减完 */
  plink(ac, e, out) {
    const { up = 1.5 } = e.p, g = gainNode(ac, 0, out), o = osc(ac, 'sine', e.f, g);
    o.frequency.setValueAtTime(e.f, e.t); o.frequency.exponentialRampToValueAtTime(e.f * up, e.t + 0.04);
    g.gain.setValueAtTime(0, e.t); g.gain.linearRampToValueAtTime(0.3 * e.v, e.t + 0.002); g.gain.exponentialRampToValueAtTime(1e-4, e.t + e.d);
    o.start(e.t); o.stop(e.t + e.d);
  },
  /** 滤波噪声（风、雾、喷雾、转场的呼声、上升音）：滤波器从 f 滑到 f × p.sweep；p.type、p.q；p.a 起音、p.r 释放（都算在 d 里）；
   *  p.wander 0–1 让频率和音量慢慢飘（风声） */
  noise(ac, e, out, kit) {
    const { type = 'bandpass', q = 0.7, sweep = 1, a = 0.05, r = 0.2, wander = 0 } = e.p;
    const g = gainNode(ac, 0, out), bf = filt(ac, type, e.f, q, g), end = env(g, e.t, e.d - r, 0.25 * e.v, a, r);
    let src = kit.noise(e.t, end, e.seed);
    if (wander) {
      const c = drift(e.seed, end - e.t), fc = c.map((x, i) => e.f * Math.pow(sweep, i / (c.length - 1)) * Math.pow(2, 1.2 * wander * x));
      const mg = gainNode(ac, 1, bf), gc = drift(e.seed + 1, end - e.t).map(x => 1 - 0.45 * wander * (1 + x));
      bf.frequency.setValueCurveAtTime(fc, e.t, end - e.t); mg.gain.setValueCurveAtTime(gc, e.t, end - e.t);
      src.connect(mg); src = null;
    } else if (sweep !== 1) {
      bf.frequency.setValueAtTime(e.f, e.t); bf.frequency.exponentialRampToValueAtTime(e.f * sweep, e.t + e.d);
    }
    src?.connect(bf);
  },
  /** 咔哒（瓶盖落座）：几毫秒的高通噪声 + 一声很短的高音（f） */
  click(ac, e, out, kit) {
    const g = gainNode(ac, 0, out);
    kit.noise(e.t, e.t + 0.03, e.seed).connect(filt(ac, 'highpass', 2500, 0.7, g));
    g.gain.setValueAtTime(0, e.t); g.gain.linearRampToValueAtTime(0.6 * e.v, e.t + 0.001); g.gain.exponentialRampToValueAtTime(1e-4, e.t + 0.025);
    const tg = gainNode(ac, 0, out), o = osc(ac, 'sine', e.f, tg);
    tg.gain.setValueAtTime(0, e.t); tg.gain.linearRampToValueAtTime(0.15 * e.v, e.t + 0.001); tg.gain.exponentialRampToValueAtTime(1e-4, e.t + e.d);
    o.start(e.t); o.stop(e.t + e.d);
  },
};

// ── 配音 ──
/** 配音进混音的增益：片段已统一到 −20 LUFS 单声道，放到两个声道上是 −17 LUFS，× 0.6 后约 −21.4 LUFS，比压低后的配乐和音效高 8–13 dB；
 *  配乐在每句下面压低 duck dB，提前 attack 秒开始压，句末 release 秒回来 */
export const VO = { gain: 0.6, duck: -9, attack: 0.12, release: 0.3 };

/** 片段还能用：它是按这句现在的文字、音色、语速生成的（factory/vo.mjs 用同一个判断决定要不要重新生成） */
export const fresh = (e, l) => !!e && e.text === l.text && e.voice === l.voice && e.speed === l.speed;

/** 变体的台词 × 片段索引（assets/vo/index.json）→ [{ id, at, dur, file }]。缺片段、片段过期、比时段长都直接报错：成片不会悄悄少一句 */
export function voPlan(film, v, index) {
  const fix = `run: node factory/vo.mjs ${film.id}`;
  return (film.voLines?.(v) ?? []).map(l => {
    const e = index[l.id];
    if (!e) throw new Error(`voice-over clip missing: ${l.id} (${fix})`);
    if (!fresh(e, l)) throw new Error(`voice-over clip out of date: ${l.id} was made from "${e.text}" (${e.voice}, speed ${e.speed}) (${fix})`);
    if (!(e.dur <= l.max)) throw new Error(`voice-over clip ${l.id} is ${e.dur} s, longer than its ${l.max} s slot`);
    return { id: l.id, at: l.at, dur: e.dur, file: `${l.id}.mp3` };
  });
}

/** 配乐让位：spans = [{ at, dur }] → music 母线的增益折线 [[t, g], …]（线性增益，从 t = 0 开始，点之间线性过渡）。
 *  每句前 attack 秒开始压到 depth dB，句末 release 秒回到 1；两句挨得太近、中间来不及回来的，合成一段一直压着 */
export function duck(spans, { depth = VO.duck, attack = VO.attack, release = VO.release } = {}) {
  const g = Math.pow(10, depth / 20), runs = [];
  for (const { at, dur } of [...spans].sort((a, b) => a.at - b.at)) {
    const last = runs.at(-1);
    if (last && at - attack <= last[1] + release) last[1] = Math.max(last[1], at + dur);
    else runs.push([at, at + dur]);
  }
  const pts = [[0, 1]];
  for (const [a, b] of runs) {
    if (a > attack) pts.push([a - attack, 1]); else pts[0][1] = 1 + (g - 1) * (1 - a / attack);   // 一开头就有配音：从压到一半（或压满）开始
    if (a > 0) pts.push([a, g]);
    pts.push([b, g], [b + release, 1]);
  }
  return pts;
}

const decoded = new Map();                                     // 解码过的片段（48 kHz 的 AudioBuffer 不属于某个上下文，可以反复用）：url + 索引条目 → Promise
/** 当前变体的配音片段 → [{ id, at, dur, buffer }]；ac 用来解码（decodeAudioData 顺便重采样到 48 kHz） */
async function voClips(film, v, ac) {
  if (!film.voLines?.(v).length) return [];
  const base = new URL('assets/vo/', document.baseURI), res = await fetch(new URL('index.json', base));
  if (!res.ok) throw new Error(`voice-over index missing: ${res.url} (run: node factory/vo.mjs ${film.id})`);
  const index = await res.json();
  return Promise.all(voPlan(film, v, index).map(async c => {
    const url = new URL(c.file, base).href, key = `${url} ${JSON.stringify(index[c.id])}`;
    if (!decoded.has(key)) {
      decoded.set(key, fetch(url).then(r => { if (!r.ok) throw new Error(`voice-over clip missing: ${url}`); return r.arrayBuffer(); })
        .then(b => ac.decodeAudioData(b)).catch(e => { decoded.delete(key); throw e; }));
    }
    return { ...c, buffer: await decoded.get(key) };
  }));
}

// ── 混音 ──
/** 整段混音 → AudioBuffer（立体声 48 kHz，长度 = 成片时长）：每个事件经声像接到它的母线，两条母线共用一个混响；
 *  配音片段不进混响，放在正中，每句下面 music 母线按 duck 压低；结尾 0.3 秒淡出。同一变体渲染两遍逐采样相同（见 sum） */
export async function renderMix(film, v, built) {
  if (!film.score) throw new Error('film has no score(v, built)');
  const { notes, reverb = {} } = film.score(v, built), dur = built.duration;
  const ac = new OfflineAudioContext(2, Math.ceil(dur * SR), SR), master = gainNode(ac, 1, ac.destination), clips = await voClips(film, v, ac);
  master.gain.setValueAtTime(1, dur - FADE); master.gain.linearRampToValueAtTime(0, dur);
  const verb = ac.createConvolver(), ir = impulse(reverb.decay ?? 2), irb = ac.createBuffer(2, ir[0].length, SR);
  ir.forEach((x, c) => irb.copyToChannel(x, c));
  verb.buffer = irb;
  const bus = {}, feeds = {};
  for (const name of BUSES) { bus[name] = gainNode(ac, 1); bus[name].connect(gainNode(ac, reverb[name] ?? 0, verb)); feeds[name] = []; }
  const nb = ac.createBuffer(1, 2 * SR, SR);
  nb.copyToChannel(noise(2 * SR, 99), 0);
  const kit = { noise(t0, t1, seed) { const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; s.start(t0, rand(seed, 0) * 2); s.stop(t1); return s; } };
  notes.forEach((e, i) => {
    const voice = VOICES[e.voice], feed = feeds[e.bus ?? 'music'];
    if (!voice) throw new Error(`score: unknown voice ${e.voice}`);
    if (!feed) throw new Error(`score: unknown bus ${e.bus}`);
    const p = ac.createStereoPanner(); p.pan.value = e.pan ?? 0; feed.push(p);
    voice(ac, { ...e, p: e.p ?? {}, seed: i + 1 }, p, kit);
  });
  for (const name of BUSES) sum(ac, feeds[name], bus[name]);
  const [p0, ...pts] = duck(clips), mg = bus.music.gain;
  mg.setValueAtTime(p0[1], 0);
  for (const [t, g] of pts) mg.linearRampToValueAtTime(g, t);
  const vo = gainNode(ac, VO.gain);
  sum(ac, clips.map(c => { const s = ac.createBufferSource(); s.buffer = c.buffer; s.start(c.at); return s; }), vo);   // 单声道接进立体声：两个声道各一份
  sum(ac, [...BUSES.map(name => bus[name]), verb, ...(clips.length ? [vo] : [])], master);
  return ac.startRendering();
}

// ── 预览 ──
/** 预览里的声音：打开后按当前变体离线渲染一遍，跟着 app 的时钟播放；暂停就停，拖动、跳转、循环时从新位置接上 */
export function createSound(app, { onError = e => console.error(e) } = {}) {
  let ac = null, out = null, src = null, t0 = 0, on = false, key = null, buf = null;
  const keyOf = () => JSON.stringify({ ...app.ctx.variant, ar: null });          // 画幅不影响声音
  const stop = () => { if (src) { src.stop(); src.disconnect(); src = null; } };
  async function prepare(k) {
    key = k; buf = null;
    const b = await renderMix(app.film, app.ctx.variant, app.ctx.built);
    if (key !== k) return;                                     // 渲染期间又换了变体
    const pk = peak(b);
    out.gain.value = pk > 0.9 ? 0.9 / pk : 1;                  // 导出时由 encodeAudio 定响度；预览只防削波
    buf = b;
  }
  function tick() {
    requestAnimationFrame(tick);
    if (!on || !app.ctx.built) return;
    const k = keyOf();
    if (k !== key) { stop(); prepare(k).catch(onError); return; }
    if (!buf || !app.playing) { stop(); return; }
    if (src && Math.abs(ac.currentTime - t0 - app.t) < 0.1) return;
    stop();
    src = ac.createBufferSource(); src.buffer = buf; src.connect(out);
    t0 = ac.currentTime - app.t; src.start(0, app.t);
  }
  return {
    get on() { return on; },
    /** 开关；第一次打开要在用户操作（点击、按键）里调用，浏览器才允许出声 */
    async set(yes) {
      on = yes;
      if (!on) { stop(); return ac?.suspend(); }
      if (!ac) { ac = new AudioContext({ sampleRate: SR }); out = gainNode(ac, 1, ac.destination); requestAnimationFrame(tick); }
      return ac.resume();
    },
  };
}
