// sound.js — 筆毫擦紙之聲：粉紅噪聲經帶通濾波，音量隨行筆速度與按壓變化
export class BrushSound {
  constructor() { this.ctx = null; this.on = false; }

  enable() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      const ctx = (this.ctx = new AC());
      const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.16;
      }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      this.bp = ctx.createBiquadFilter(); this.bp.type = 'bandpass'; this.bp.frequency.value = 2200; this.bp.Q.value = 0.7;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 420;
      this.gain = ctx.createGain(); this.gain.gain.value = 0;
      src.connect(this.bp).connect(hp).connect(this.gain).connect(ctx.destination);
      src.start();
    }
    this.ctx.resume();
    this.on = true;
    return true;
  }

  disable() {
    this.on = false;
    if (this.ctx) this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }

  /** speed: 世界像素／實際秒；pres: 0..1 */
  update(contact, speed, pres) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime;
    const v = contact ? Math.min(0.2, 0.015 + speed / 6000) * (0.45 + 0.55 * pres) : 0;
    this.gain.gain.setTargetAtTime(v, t, 0.025);
    this.bp.frequency.setTargetAtTime(1500 + Math.min(speed, 3000) * 0.7, t, 0.05);
  }

  /** 鈐印的一聲悶響 */
  thud() {
    if (!this.on || !this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.18);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.32);
  }
}
