// exporter.js — 导出：按固定帧间隔逐帧出图（t = i / fps），不依赖实时帧率；封面取剪辑表里的 cover 时刻
// 帧数 = 时长 × fps；每帧返回合成后的 PNG（3D + 字幕），由 render.mjs 经管道送进 ffmpeg
export function createExporter(app) {
  let fps = 30, i = 0, n = 0;
  return {
    /** 从头开始；返回 { fps, frames, W, H, duration } */
    start(f = 30) {
      app.pause();
      fps = f; i = 0; n = Math.round(app.ctx.built.duration * fps);
      return { fps, frames: n, W: app.ctx.W, H: app.ctx.H, duration: app.ctx.built.duration };
    },
    /** 下一帧 → { i, t, shot, overflow, url }；画完了返回 null */
    frame() {
      if (i >= n) return null;
      const t = i / fps, d = app.draw(t);
      return { i: i++, t, shot: d.shot, overflow: d.overflow, url: app.png() };
    },
    /** 封面 JPEG → { t, overflow, url } */
    cover(q = 0.92) {
      const t = app.film.cuts[app.ctx.variant.cut].cover, d = app.draw(t);
      return { t, overflow: d.overflow, url: app.jpeg(q) };
    },
  };
}
