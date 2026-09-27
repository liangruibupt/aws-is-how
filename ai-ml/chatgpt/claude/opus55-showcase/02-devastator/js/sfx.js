// sfx.js — WebAudio 合成音效：柴油机、履带、液压、警报、机库混响；对接撞击、棘轮、气流、终场咆哮。不加载任何音频文件（配乐见 music.js）。
import { makeMusic } from './music.js';

/** opts：{ score, bgm, bgmAt } 转交给配乐；ac 可传入 OfflineAudioContext，用于导出视频时离线渲染音轨 */
export function makeSfx(opts = {}) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = opts.ac || new AC(), now = () => ac.currentTime;

  // ── 母线：干声 + 卷积混响（机库）→ 压缩 → 输出 ──
  const out = ac.createGain(); out.gain.value = 0;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.22;
  out.connect(comp).connect(ac.destination);
  const bus = ac.createGain(), verb = ac.createConvolver(), wet = ac.createGain();
  verb.buffer = impulse(3.4, 2.4); wet.gain.value = 0.34;
  bus.connect(out); bus.connect(verb); verb.connect(wet).connect(out);

  function impulse(dur, decay) {
    const n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(2, n, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay) * (i < 400 ? i / 400 : 1); }
    return b;
  }
  const NB = (() => { const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })();
  const noise = (loop = true) => { const s = ac.createBufferSource(); s.buffer = NB; s.loop = loop; s.loopStart = Math.random(); return s; };
  const gain = (v = 0, dest = bus) => { const g = ac.createGain(); g.gain.value = v; if (dest) g.connect(dest); return g; };
  const filt = (type, f, Q = 0.7, dest) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = Q; if (dest) b.connect(dest); return b; };
  const osc = (type, f, dest) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; if (dest) o.connect(dest); return o; };
  const drive = k => { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(x * k); } const w = ac.createWaveShaper(); w.curve = c; w.oversample = '2x'; return w; };
  /** 包络：a 秒起音到 peak，d 秒指数衰减 */
  const env = (g, t0, a, peak, d) => { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d); };

  // ── 持续层 ──
  const L = {};
  { // 柴油机：锯齿 + 方波 → 低通，11 Hz 调幅模拟缸体节奏
    L.eng = gain(0); const lp = filt('lowpass', 210, 2.2, L.eng), am = gain(0.6, lp);
    L.e1 = osc('sawtooth', 36, am); L.e2 = osc('square', 54); L.e2.connect(gain(0.3, am));
    L.lfo = osc('sine', 11); L.lfo.connect(gain(0.4, am.gain));
    [L.e1, L.e2, L.lfo].forEach(o => o.start());
  }
  { // 履带：带通噪声 × 方波门
    L.trk = gain(0); const bp = filt('bandpass', 1500, 1.1), am = gain(0.5, L.trk); bp.connect(am);
    const n = noise(); n.connect(bp); n.start();
    L.tlfo = osc('square', 8); L.tlfo.connect(gain(0.5, am.gain)); L.tlfo.start();
  }
  { // 液压：带通噪声 + 伺服啸叫
    L.hyd = gain(0); L.hbp = filt('bandpass', 900, 0.9, L.hyd); const n = noise(); n.connect(L.hbp); n.start();
    L.srv = gain(0); const lp = filt('lowpass', 1400, 0.8, L.srv); L.so = osc('triangle', 320, lp); L.so.start();
  }
  { // 警报：上扫的「呜——」
    L.al = gain(0); const bp = filt('bandpass', 1100, 1.6, L.al); L.ao = osc('sawtooth', 600, bp); L.ao.start();
  }
  { // 低频铺底
    L.dr = gain(0); const lp = filt('lowpass', 260, 0.7, L.dr);
    for (const f of [41.2, 61.7, 82.4]) { const o = osc('sawtooth', f, lp); o.detune.value = (Math.random() - 0.5) * 12; o.start(); }
  }
  const set = (p, v, tc = 0.07) => p.setTargetAtTime(v, now(), tc);

  // ── 单次音效 ──
  function thump(t0, f0, f1, peak, d, dest = bus) {
    const o = osc('sine', f0), g = gain(0, dest); o.connect(g);
    o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + d);
    env(g, t0, 0.004, peak, d); o.start(t0); o.stop(t0 + d + 0.1);
  }
  function burst(t0, type, f, Q, peak, a, d, dest = bus) {
    const n = noise(false), b = filt(type, f, Q), g = gain(0, dest); n.connect(b).connect(g);
    env(g, t0, a, peak, d); n.start(t0, Math.random()); n.stop(t0 + a + d + 0.05);
    return b;
  }
  function click(t0, p = 1, v = 1) {
    burst(t0, 'bandpass', 3000 * p, 3, 0.32 * v, 0.001, 0.035);
    const o = osc('square', 1500 * p), g = gain(0); o.connect(g); env(g, t0, 0.001, 0.035 * v, 0.03); o.start(t0); o.stop(t0 + 0.06);
  }
  function clank(pw = 1) {
    const t0 = now() + 0.01;
    for (const [f, a, d] of [[138, 1, 1.3], [347, 0.75, 1.0], [689, 0.5, 0.75], [1046, 0.4, 0.55], [1583, 0.26, 0.4], [2371, 0.16, 0.28], [3190, 0.09, 0.2]]) {
      const o = osc('sine', f * (0.95 + Math.random() * 0.1)), g = gain(0); o.connect(g);
      env(g, t0, 0.002, a * 0.2 * pw, d); o.start(t0); o.stop(t0 + d + 0.1);
    }
    burst(t0, 'bandpass', 2400, 0.7, 0.55 * pw, 0.002, 0.1);
    thump(t0, 120, 36, 0.95 * pw, 0.5);
    click(t0 + 0.08, 1.2, 0.8); click(t0 + 0.15, 1.0, 0.6);
  }
  function thud(pw = 1) {
    const t0 = now() + 0.01;
    thump(t0, 80, 26, 1.1 * pw, 0.9);
    burst(t0, 'lowpass', 380, 0.6, 0.7 * pw, 0.004, 0.8);
  }
  function whoosh(dur = 1.5) {
    const t0 = now(), b = burst(t0, 'bandpass', 260, 1.3, 0.22, dur * 0.45, dur * 0.6);
    b.frequency.setValueAtTime(240, t0); b.frequency.exponentialRampToValueAtTime(1900, t0 + dur);
    const o = osc('sine', 70), g = gain(0); o.connect(g); o.frequency.exponentialRampToValueAtTime(130, t0 + dur);
    env(g, t0, dur * 0.4, 0.12, dur * 0.7); o.start(t0); o.stop(t0 + dur * 1.2);
  }
  function hiss(dur = 0.6, v = 1) { burst(now(), 'highpass', 2600, 0.6, 0.16 * v, 0.02, dur); }
  function relay() {
    const t0 = now(); thump(t0, 170, 60, 0.4, 0.2); click(t0, 0.7, 0.8);
    const o = osc('sawtooth', 100), bp = filt('bandpass', 640, 2), g = gain(0); o.connect(bp).connect(g);
    env(g, t0 + 0.02, 0.01, 0.05, 0.3); o.start(t0); o.stop(t0 + 0.45);
  }
  function engineStart() {
    const t0 = now(), lp = filt('lowpass', 700, 1), g = gain(0); lp.connect(g);
    const o = osc('sawtooth', 60, lp); o.frequency.setValueAtTime(60, t0); o.frequency.exponentialRampToValueAtTime(130, t0 + 0.35);
    o.frequency.exponentialRampToValueAtTime(48, t0 + 1.1);
    env(g, t0, 0.08, 0.22, 1.0); o.start(t0); o.stop(t0 + 1.3);
    burst(t0 + 0.3, 'lowpass', 500, 0.8, 0.25, 0.02, 0.5);
  }
  function roar() {
    const t0 = now(), dur = 3.0, ws = drive(4), lp = filt('lowpass', 180, 4), g = gain(0);
    ws.connect(lp).connect(g);
    lp.frequency.setValueAtTime(160, t0); lp.frequency.exponentialRampToValueAtTime(1200, t0 + 0.7); lp.frequency.exponentialRampToValueAtTime(240, t0 + dur);
    env(g, t0, 0.3, 0.42, dur);
    for (const f of [46, 69.5, 93]) {
      const o = osc('sawtooth', f * 0.8, ws), v = osc('sine', 6.5), vg = gain(f * 0.05, null);
      v.connect(vg).connect(o.frequency);
      o.frequency.setValueAtTime(f * 0.8, t0); o.frequency.exponentialRampToValueAtTime(f, t0 + 0.6); o.frequency.exponentialRampToValueAtTime(f * 0.82, t0 + dur);
      o.start(t0); v.start(t0); o.stop(t0 + dur + 0.2); v.stop(t0 + dur + 0.2);
    }
    burst(t0, 'bandpass', 520, 1.2, 0.2, 0.3, dur, ws);
  }
  function boom() {
    const t0 = now();
    thump(t0, 64, 24, 1.2, 2.4);
    burst(t0, 'lowpass', 320, 0.7, 0.5, 0.005, 1.6);
    const lp = filt('lowpass', 520, 0.8), g = gain(0); lp.connect(g); env(g, t0, 0.03, 0.14, 4.2);
    for (const f of [55, 82.4, 110, 164.8, 220]) { const o = osc('sawtooth', f, lp); o.detune.value = (Math.random() - 0.5) * 14; o.start(t0); o.stop(t0 + 4.6); }
  }

  const music = makeMusic(ac, bus, NB, opts);

  return {
    ac,
    music: music.tick,
    resume() { if (ac.state !== 'running') ac.resume(); },
    /** 每帧：持续层参数（S 由时间轴计算） */
    update(S) {
      set(out.gain, S.on ? 0.9 : 0, 0.05);
      set(L.eng.gain, 0.34 * S.eng); set(L.e1.frequency, 34 * S.rpm); set(L.e2.frequency, 51 * S.rpm); set(L.lfo.frequency, 9 * S.rpm);
      set(L.trk.gain, 0.12 * S.trk); set(L.tlfo.frequency, 5 + 11 * S.trkRate);
      set(L.hyd.gain, 0.2 * S.hyd); set(L.hbp.frequency, 700 + 900 * S.hydF);
      set(L.srv.gain, 0.045 * S.hyd); set(L.so.frequency, 240 + 260 * S.hydF);
      set(L.al.gain, 0.07 * S.alarm, 0.03); set(L.ao.frequency, S.alarmF, 0.01);
      set(L.dr.gain, 0.09 * S.drone, 0.3);
    },
    click: (p, v) => click(now() + 0.005, p, v), clank, thud, whoosh, hiss, relay, engineStart, roar, boom,
  };
}
