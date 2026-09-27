// music.js — 配乐：原创的 D 小调帝国风进行曲（铜管、定音鼓、军鼓），WebAudio 实时合成。
// 乐谱按时间轴 t 排好：一拍 = GAP / 12，三小节正好是一名成员的合体段，六次锁定都落在小节强拍上。
// 播放时每帧只把前方 0.2 s 内的音符排进音频时钟；拖动、暂停、变速时清掉已排的音符并从新位置接上，因此与画面始终对齐。
// 也可以用 ?bgm=<音频地址> 换成自备的录音（例如自己有授权的曲目），与时间轴同步播放、暂停和跳转。

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

// 和弦：[低音, 三个中声部]（MIDI）
const CH = {
  Dm: [38, 50, 53, 57], Gm: [43, 50, 55, 58], C: [36, 52, 55, 60], F: [41, 53, 57, 60],
  Bb: [34, 50, 53, 58], A: [33, 49, 52, 57], A7: [33, 49, 55, 57],
};
// 主题 A / B：每小节 [拍位, 时值(拍), 音高]；和声每小节两个（前后半小节）
const THEME_A = [
  [[0, 1, 62], [1, 1.5, 69], [2.5, 0.5, 67], [3, 1, 65]],
  [[0, 0.75, 64], [0.75, 0.25, 65], [1, 1, 67], [2, 2, 69]],
  [[0, 1, 70], [1, 0.75, 69], [1.75, 0.25, 67], [2, 1, 65], [3, 1, 64]],
  [[0, 1, 62], [1, 0.5, 64], [1.5, 0.5, 65], [2, 2, 64]],
  [[0, 1, 62], [1, 1.5, 69], [2.5, 0.5, 67], [3, 1, 65]],
  [[0, 0.75, 64], [0.75, 0.25, 65], [1, 1, 67], [2, 2, 70]],
  [[0, 1, 69], [1, 0.75, 67], [1.75, 0.25, 65], [2, 1, 64], [3, 1, 61]],
  [[0, 3, 62], [3, 1, 57]],
];
const HARM_A = [['Dm', 'Dm'], ['C', 'F'], ['Bb', 'Gm'], ['Dm', 'A'], ['Dm', 'Dm'], ['C', 'Gm'], ['F', 'A'], ['Dm', 'Dm']];
const THEME_B = [
  [[0, 1.5, 65], [1.5, 0.5, 67], [2, 1, 69], [3, 1, 65]],
  [[0, 2, 72], [2, 1, 70], [3, 1, 69]],
  [[0, 1.5, 67], [1.5, 0.5, 69], [2, 1, 70], [3, 1, 67]],
  [[0, 3, 69], [3, 1, 64]],
  [[0, 1.5, 74], [1.5, 0.5, 72], [2, 1, 70], [3, 1, 69]],
  [[0, 1, 67], [1, 1, 70], [2, 1, 69], [3, 1, 67]],
  [[0, 1, 65], [1, 0.75, 64], [1.75, 0.25, 65], [2, 1, 67], [3, 1, 64]],
  [[0, 2, 62], [2, 1, 57], [3, 1, 62]],
];
const HARM_B = [['Bb', 'F'], ['F', 'F'], ['Gm', 'Gm'], ['A', 'A'], ['Bb', 'F'], ['Gm', 'C'], ['Dm', 'A'], ['Dm', 'Dm']];
// 军鼓：十六分音符格上的力度（0 = 不打）
const SNARE = [1, 0, 0.3, 0.55, 0.7, 0, 0.3, 0, 0.9, 0, 0.3, 0.55, 0.7, 0.35, 0.5, 0.35];
const OSTINATO = [38, 38, 41, 38, 40, 38, 37, 38];          // 开场低音八分音符：D D F D E D C# D

/** 生成整段乐谱：{ t, d, voice, m, v }，t / d 为时间轴秒；v 可为 [起, 止] 表示渐强 */
function buildScore({ locks, gap, eyes, hero, end }) {
  const E = [], B = gap / 12, G = locks[0] - 40 * B;        // 主网格：第 10 小节强拍 = 第一次锁定
  const add = (t, voice, m, d, v) => E.push({ t, voice, m, d, v });
  const at = (bar, beat = 0, g = G) => g + (bar * 4 + beat) * B;

  const theme = (bar0, mel, harm, g, o) => mel.forEach((notes, i) => {
    for (const [b, d, m] of notes) {
      add(at(bar0 + i, b, g), 'brass', m + o.up, d * B * 0.96, o.v);
      if (o.dbl) add(at(bar0 + i, b, g), 'brass', m + o.up - 12, d * B * 0.96, o.dbl);
    }
    harm[i].forEach((c, h) => { for (const m of CH[c].slice(1)) add(at(bar0 + i, h * 2, g), 'horn', m, 2 * B * 0.95, o.hv); });
  });
  const groove = (bar0, n, harm, g, v = 1) => {
    for (let i = 0; i < n; i++) {
      const [c1, c2] = harm[i % harm.length], r1 = CH[c1][0], r2 = CH[c2][0];
      [r1, r1 + 12, r2, r2 + 7].forEach((m, b) => add(at(bar0 + i, b, g), 'low', m, B * 0.8, (b % 2 ? 0.6 : 1) * v));
      add(at(bar0 + i, 0, g), 'timp', r1 % 12 === 9 ? 45 : 38, 0, 0.8 * v);
      add(at(bar0 + i, 2, g), 'timp', 45, 0, 0.55 * v);
      add(at(bar0 + i, 0, g), 'kick', 0, 0, 0.7 * v); add(at(bar0 + i, 2, g), 'kick', 0, 0, 0.5 * v);
      SNARE.forEach((s, k) => s && add(at(bar0 + i, k / 4, g), 'snare', 0, 0, s * 0.8 * v));
    }
  };
  const roll = (voice, m, t0, t1, v0, v1, rate) => { for (let t = t0; t < t1 - 1e-6; t += 1 / rate) add(t, voice, m, voice === 'timp' ? 0.45 : 0, v0 + (v1 - v0) * (t - t0) / (t1 - t0)); };
  const hit = (t, chord, v = 1) => {
    const [r, ...mid] = CH[chord];
    for (const m of mid) add(t, 'horn', m, 0.7, v);
    add(t, 'brass', mid[0] + 12, 0.6, 0.9 * v); add(t, 'low', r, 0.9, v);
    add(t, 'timp', r % 12 === 9 ? 45 : 38, 0, v); add(t, 'kick', 0, 0, v); add(t, 'crash', 0, 0, v);
  };

  // 集结（第 0–4 小节）：低音八分音符固定型，定音鼓与军鼓陆续加入，逐渐增强
  for (let bar = 0; bar < 5; bar++) {
    const k = 0.35 + 0.1 * bar;
    OSTINATO.forEach((m, i) => add(at(bar, i / 2), 'low', m, B * 0.42, (i % 4 ? 0.65 : 1) * k));
    add(at(bar, 0), 'timp', 38, 0, 0.5 * k);
    if (bar >= 2) add(at(bar, 2), 'timp', 45, 0, 0.4 * k);
    if (bar >= 3) SNARE.forEach((s, i) => s && add(at(bar, i / 4), 'snare', 0, 0, s * 0.35 * k));
  }
  // 合体指令（第 5–6 小节）：降 B → A 的铜管长音渐强，军鼓与定音鼓滚奏
  for (const [bar, c] of [[5, 'Bb'], [6, 'A']]) {
    const [r, ...mid] = CH[c];
    for (const m of mid) add(at(bar), 'horn', m, 4 * B, [0.25 + 0.3 * (bar - 5), 0.55 + 0.35 * (bar - 5)]);
    add(at(bar), 'low', r, 4 * B, 0.8);
  }
  roll('snare', 0, at(5), at(7), 0.12, 0.8, 8 / B);
  roll('timp', 45, at(6), at(7), 0.2, 0.7, 4 / B);
  // 第 7 小节：A 大三和弦齐奏，铜管下行引入主题
  hit(at(7), 'A', 0.9);
  [69, 67, 65, 64].forEach((m, i) => add(at(7, 2 + i * 0.5), 'brass', m, B * 0.45, 0.8));
  [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75].forEach((b, i) => add(at(7, 2 + b), 'snare', 0, 0, 0.4 + i * 0.07));

  // 合体（第 8–23 小节）：主题 A（圆号音色）→ 主题 B（小号，低八度叠奏）
  theme(8, THEME_A, HARM_A, G, { up: 0, v: 0.75, hv: 0.4 });
  groove(8, 8, HARM_A, G, 0.85);
  theme(16, THEME_B, HARM_B, G, { up: 0, v: 0.9, dbl: 0.45, hv: 0.5 });
  groove(16, 8, HARM_B, G, 1);
  // 锁定：强拍上加镲与大鼓
  for (const t of locks.slice(0, -1)) { add(t, 'crash', 0, 0, 0.8); add(t, 'kick', 0, 0, 1); }
  // 第 24 小节：属七和弦渐强、双鼓滚奏；第 25 小节强拍（最后一次锁定）D 小调齐奏
  for (const m of CH.A7.slice(1)) add(at(24), 'horn', m, 4 * B, [0.3, 0.9]);
  add(at(24), 'low', 33, 4 * B, 0.9);
  roll('snare', 0, at(24), at(25), 0.2, 1, 8 / B);
  roll('timp', 45, at(24, 2), at(25), 0.4, 0.9, 4 / B);
  hit(locks[locks.length - 1], 'Dm', 1);

  // 头部特写：低音 D 持续，和声缓慢爬升，双眼点亮前定音鼓滚奏推到英雄段
  const t25 = locks[locks.length - 1] + 0.7;
  add(t25, 'horn', 38, hero - t25, [0.6, 0.8]); add(t25, 'horn', 45, hero - t25, [0.45, 0.65]); add(t25, 'low', 26, hero - t25, [0.35, 0.5]);
  for (const m of CH.Bb.slice(1)) add(t25 + 0.6, 'horn', m, 2.2, [0.3, 0.5]);
  for (const m of [52, 55, 60]) add(t25 + 2.8, 'horn', m, eyes - t25 - 2.85, [0.4, 0.6]);
  for (const m of CH.A.slice(1)) add(eyes, 'horn', m, hero - eyes, [0.35, 0.8]);
  roll('timp', 45, eyes - 1.0, hero, 0.15, 1, 12);
  roll('snare', 0, hero - 1.1, hero, 0.1, 0.9, 16);

  // 英雄段：以 T_HERO 为新网格，主题 A 高八度齐奏三小节 → 终止式 → D 小调长和弦
  const H = hero;
  theme(0, THEME_A.slice(0, 3), HARM_A, H, { up: 12, v: 1, dbl: 0.7, hv: 0.6 });
  groove(0, 3, HARM_A, H, 1.1);
  add(H, 'crash', 0, 0, 1);
  [[0, 77, 65], [2, 76, 64]].forEach(([b, hi, lo]) => { add(at(3, b, H), 'brass', hi, 2 * B, 1); add(at(3, b, H), 'brass', lo, 2 * B, 0.7); });
  for (const [h, c] of [[0, 'Bb'], [2, 'A']]) { const [r, ...mid] = CH[c]; for (const m of mid) add(at(3, h, H), 'horn', m, 2 * B, 0.65); add(at(3, h, H), 'low', r, 2 * B, 1); }
  roll('timp', 45, at(3, 2, H), at(4, 0, H), 0.4, 1, 4 / B);
  roll('snare', 0, at(3, 2, H), at(4, 0, H), 0.3, 1, 8 / B);
  const tf = at(4, 0, H), df = Math.max(1.5, end - 0.4 - tf);
  for (const m of [62, 69, 74]) add(tf, 'brass', m, df, [1, 0.5]);
  for (const m of CH.Dm) add(tf, 'horn', m, df, [0.8, 0.3]);
  add(tf, 'low', 38, df, 1); add(tf, 'low', 26, df, 0.6);
  add(tf, 'crash', 0, 0, 1); add(tf, 'kick', 0, 0, 1.1); add(tf, 'timp', 38, 0, 1.1);
  roll('timp', 38, tf + 0.3, tf + df - 0.6, 0.5, 0.05, 11);

  return E.sort((a, b) => a.t - b.t);
}

export function makeMusic(ac, dest, NB, opts = {}) {
  const now = () => ac.currentTime;
  const master = ac.createGain(); master.gain.value = 0.85; master.connect(dest);

  // ── 自备音频：与时间轴同步 ──
  let el = null, elAt = +opts.bgmAt || 0;
  if (opts.bgm) {
    try {
      const u = new URL(opts.bgm, location.href);
      if (['http:', 'https:', 'blob:'].includes(u.protocol)) { el = new Audio(u.href); el.preload = 'auto'; }
    } catch { /* 地址无效时退回合成配乐 */ }
  }

  // ── 合成音色 ──
  let voice = null;                                            // 当前一批音符的出口；清场时整批淡出
  const newVoice = () => { voice = ac.createGain(); voice.connect(master); };
  newVoice();
  const G = (v, d) => { const g = ac.createGain(); g.gain.value = v; if (d) g.connect(d); return g; };
  const F = (type, f, Q, d) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = Q; if (d) b.connect(d); return b; };
  const O = (type, f, d) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; if (d) o.connect(d); return o; };
  const N = () => { const s = ac.createBufferSource(); s.buffer = NB; s.loop = true; return s; };
  const hitEnv = (g, t0, pk, dec) => { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(pk, 0.0002), t0 + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dec); };
  /** 持续音包络：起音 a，(可选) 渐强 v0→v1，d 后释放 */
  const susEnv = (g, t0, d, v, a, rel) => {
    const [v0, v1] = Array.isArray(v) ? v : [v, v];
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v0, t0 + a);
    if (v1 !== v0) g.gain.linearRampToValueAtTime(v1, t0 + Math.max(a + 0.01, d)); else g.gain.setValueAtTime(v0, t0 + Math.max(a, d));
    g.gain.setTargetAtTime(0, t0 + Math.max(a, d), rel);
  };
  const scale = (v, k) => (Array.isArray(v) ? v.map(x => x * k) : v * k);
  const peakOf = v => (Array.isArray(v) ? Math.max(...v) : v);

  const V = {
    brass(t0, m, d, v, out) {                                  // 小号 / 长号：两支失谐锯齿波，滤波器随起音张开（"嘟"的一下），长音带颤音
      const f = mtof(m), g = G(0, out), lp = F('lowpass', f, 1.1, g), stop = t0 + d + 0.4, p = peakOf(v);
      const vib = d > 0.6 && G(0);
      if (vib) { const l = O('sine', 5.3, vib); vib.gain.setValueAtTime(0, t0 + 0.25); vib.gain.linearRampToValueAtTime(9, t0 + 0.6); l.start(t0); l.stop(stop); }
      for (const det of [-6, 6]) { const o = O('sawtooth', f, G(0.6, lp)); o.detune.value = det; if (vib) vib.connect(o.detune); o.start(t0); o.stop(stop); }
      lp.frequency.setValueAtTime(f * 1.3, t0);                   // 包络有终点：之后滤波器系数不再逐采样重算
      lp.frequency.linearRampToValueAtTime(Math.min(f * (3 + 4 * p), 7500), t0 + 0.05);
      lp.frequency.linearRampToValueAtTime(Math.min(f * (1.8 + 2.2 * p), 5000), t0 + 0.3);
      susEnv(g, t0, d, scale(v, 0.085), 0.03, 0.07);
    },
    horn(t0, m, d, v, out) {                                   // 圆号 / 铺底：锯齿 + 三角，柔和低通
      const f = mtof(m), g = G(0, out), lp = F('lowpass', Math.min(f * 3, 2400), 0.6, g), stop = t0 + d + 0.9;
      for (const [type, k, lv] of [['sawtooth', 1, 0.45], ['triangle', 1.003, 0.8]]) { const o = O(type, f * k, G(lv, lp)); o.start(t0); o.stop(stop); }
      susEnv(g, t0, d, scale(v, 0.05), Math.min(0.09, d * 0.3), 0.18);
    },
    low(t0, m, d, v, out) {                                    // 大号 / 低音弦：锯齿 + 正弦基音，短促有力
      const f = mtof(m), g = G(0, out), lp = F('lowpass', Math.min(f * 5, 900), 1.2, g);
      const a = O('sawtooth', f, G(0.5, lp)), b = O('sine', f, G(0.9, g));
      a.start(t0); b.start(t0); a.stop(t0 + d + 0.5); b.stop(t0 + d + 0.5);
      const p = peakOf(v) * 0.13;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(p, t0 + 0.012);
      g.gain.setTargetAtTime(p * 0.55, t0 + 0.012, 0.12); g.gain.setTargetAtTime(0, t0 + d, 0.06);
    },
    timp(t0, m, d, v, out) {                                   // 定音鼓：正弦基音略微下滑 + 泛音 + 鼓皮噪声；d 为余音长度（滚奏时较短）
      const f = mtof(m), g = G(0, out), dec = d || 1.4;
      const a = O('sine', f * 1.015, g), b = O('sine', f * 1.51, G(0.25, g));
      a.frequency.exponentialRampToValueAtTime(f, t0 + 0.09);
      a.start(t0); b.start(t0); a.stop(t0 + dec + 0.1); b.stop(t0 + dec + 0.1);
      hitEnv(g, t0, 0.3 * v, dec);
      const n = N(), ng = G(0, out); n.connect(F('lowpass', 420, 0.7, ng)); hitEnv(ng, t0, 0.2 * v, 0.09); n.start(t0, Math.random()); n.stop(t0 + 0.12);
    },
    snare(t0, m, d, v, out) {                                  // 军鼓：带通噪声 + 高频沙沙 + 鼓皮音
      const n = N(), g1 = G(0, out), g2 = G(0, out);
      n.connect(F('bandpass', 1900, 0.9, g1)); n.connect(F('highpass', 6000, 0.7, g2));
      hitEnv(g1, t0, 0.13 * v, 0.12); hitEnv(g2, t0, 0.06 * v, 0.17);
      n.start(t0, Math.random()); n.stop(t0 + 0.2);
      const o = O('triangle', 190), og = G(0, out); o.connect(og); o.frequency.exponentialRampToValueAtTime(150, t0 + 0.05);
      hitEnv(og, t0, 0.1 * v, 0.06); o.start(t0); o.stop(t0 + 0.08);
    },
    kick(t0, m, d, v, out) {
      const o = O('sine', 95), g = G(0, out); o.connect(g); o.frequency.exponentialRampToValueAtTime(40, t0 + 0.25);
      hitEnv(g, t0, 0.42 * v, 0.34); o.start(t0); o.stop(t0 + 0.4);
    },
    crash(t0, m, d, v, out) {
      const n = N(), g = G(0, out); n.connect(F('highpass', 4200, 0.6, g));
      const g2 = G(0, out); n.connect(F('bandpass', 8500, 1.5, g2));
      hitEnv(g, t0, 0.09 * v, 2.3); hitEnv(g2, t0, 0.05 * v, 1.2);
      n.start(t0, Math.random()); n.stop(t0 + 2.4);
    },
  };
  const score = opts.score ? buildScore(opts.score) : [];
  // 双眼点亮时的咆哮期间让出音量
  const ss = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const duck = opts.score ? t => 1 - 0.32 * ss(opts.score.eyes - 0.2, opts.score.eyes + 0.2, t) * (1 - ss(opts.score.eyes + 0.9, opts.score.hero, t)) : () => 1;
  let head = -1, lastT = -1, rate = 0, a0 = 0, t0 = 0;

  function clear() {                                           // 已排的音符整批淡出，换一个新出口
    const v = voice; v.gain.setTargetAtTime(0, now(), 0.02); setTimeout(() => v.disconnect(), 400);
    newVoice(); head = -1;
  }
  function play(n, when, cut = 0) {
    const d = (n.d - cut) / rate;
    let v = n.v;
    if (cut && Array.isArray(v)) { const k = cut / n.d; v = [v[0] + (v[1] - v[0]) * k, v[1]]; }
    V[n.voice](when, n.m, d, v, voice);
  }

  return {
    /** 每帧调用：t = 时间轴秒，r = 播放速度（暂停时为 0），on = 声音开关 */
    tick(t, r, on) {
      if (el) {                                                 // 自备音频
        const pos = t - elAt, ok = r > 0 && on && pos >= 0 && !(el.duration && pos >= el.duration);
        if (!ok) { if (!el.paused) el.pause(); return; }
        if (Math.abs(el.currentTime - pos) > 0.25) el.currentTime = pos;
        if (el.playbackRate !== r) el.playbackRate = r;
        el.volume = 0.8 * duck(t);
        if (el.paused) el.play().catch(() => {});
        return;
      }
      if (!score.length) return;
      if (r <= 0 || !on) { if (head >= 0) clear(); lastT = t; rate = 0; return; }
      const seek = head < 0 || r !== rate || t < lastT - 1e-3 || t > lastT + 0.3;
      lastT = t;
      if (seek) {
        if (head >= 0) clear();
        rate = r; head = t; a0 = now() + 0.02; t0 = t;
        for (const n of score) {                                // 跳进一个长音的中段：从当前位置接着响
          if (n.t >= t) break;
          if (n.d >= 0.9 && n.t + n.d > t + 0.25) play(n, a0, t - n.t);
        }
      } else if (Math.abs(a0 + (t - t0) / rate - now() - 0.02) > 0.05) { a0 = now() + 0.02; t0 = t; }   // 画面时钟与音频时钟漂移过大时重新对齐
      master.gain.setTargetAtTime(0.85 * duck(t), now(), 0.1);
      const until = t + 0.2 * rate;
      for (const n of score) {
        if (n.t < head) continue;
        if (n.t >= until) break;
        play(n, a0 + (n.t - t0) / rate);
      }
      head = until;
    },
  };
}
