// sheet.js — 审片工具。?safe：在画面上标出平台界面会盖住的区域、边距和这一镜头的字幕区；
// ?sheet：把一个变体的关键帧按「比例 × 语言」拼成一张联系表（页面里显示，sheet.mjs 存成 PNG）
import { allAxes, UNSAFE, MARGIN } from './variant.js';

/** 叠加层（挂在 app.overlays 上）：红 = 平台图标 / 标题带，蓝虚线 = 4% 边距，黄 = 这一镜头的字幕区 */
export function safeOverlay(g, ctx, { row }) {
  const { W, H } = ctx, lw = Math.max(1, Math.round(Math.min(W, H) / 540));
  g.save();
  g.lineWidth = lw;
  for (const [x, y, w, h] of UNSAFE[ctx.ar] ?? []) {
    g.fillStyle = 'rgba(255, 40, 40, 0.22)'; g.fillRect(x * W, y * H, w * W, h * H);
    g.strokeStyle = 'rgba(255, 70, 70, 0.9)'; g.strokeRect(x * W, y * H, w * W, h * H);
  }
  g.setLineDash([6 * lw, 4 * lw]); g.strokeStyle = 'rgba(90, 200, 255, 0.9)';
  g.strokeRect(MARGIN * W, MARGIN * H, (1 - 2 * MARGIN) * W, (1 - 2 * MARGIN) * H);
  g.strokeStyle = 'rgba(255, 210, 60, 0.9)'; g.fillStyle = 'rgba(255, 210, 60, 0.9)';
  g.font = `${Math.round(Math.min(W, H) * 0.02)}px system-ui, sans-serif`; g.textBaseline = 'top'; g.textAlign = 'left'; g.letterSpacing = '0px';   // 字幕量宽时改过字距
  for (const [name, [x, y, w, h]] of Object.entries(row?.zones ?? {})) {
    g.strokeRect(x * W, y * H, w * W, h * H);
    g.fillText(name, x * W + 3 * lw, y * H + 3 * lw);
  }
  g.restore();
}

/**
 * ?sheet[=t1,t2…]&ar=…&lang=… → 要拼的行与时刻。ar、lang 可写逗号列表，不写就取全部（片子没有 lang 轴时只按比例分行）；
 * 不写时刻就取每条剪辑的 60% 处（字幕都已入场）。返回 { params: 首行变体的参数, plan: { rows, times, scale } }
 */
export function sheetPlan(film, params) {
  const axes = allAxes(film), p = new URLSearchParams(params);
  const list = k => (p.get(k) ? p.get(k).split(',') : axes[k].map(String));
  const ars = list('ar'), langs = axes.lang ? list('lang') : [null];
  p.set('ar', ars[0]);
  if (axes.lang) p.set('lang', langs[0]);
  const times = (params.get('sheet') ?? '').split(',').filter(Boolean).map(Number);
  if (times.some(t => !Number.isFinite(t))) throw new Error(`sheet: bad times "${params.get('sheet')}"`);
  const scale = +(params.get('scale') || 0.25);
  if (!(scale > 0 && scale <= 1)) throw new Error(`sheet: scale must be in (0, 1], got ${params.get('scale')}`);
  const rows = ars.flatMap(ar => langs.map(lang => (lang ? { ar, lang } : { ar })));
  return { params: p, plan: { rows, times, scale } };
}

export const keyTimes = built => built.entries.map(e => Math.round((e.start + 0.6 * (e.end - e.start)) * 100) / 100);

const LABEL = 88, CAP = 22, GAP = 10, PAD = 14, HEAD = 40;

/** 逐行换变体、画关键帧、缩小拼接；页面里显示成图片。返回 { name, url, W, H, overflow: ['9x16 zh t=6 hero.title'] } */
export async function showSheet(app, { rows, times, scale }) {
  const { film } = app, lines = [], overflow = [];
  for (const row of rows) {
    await app.setVariant(row);
    const { ctx } = app, w = Math.round(ctx.W * scale), h = Math.round(ctx.H * scale);
    const label = Object.values(row).join(' '), cells = [];
    for (const t of times.length ? times : keyTimes(ctx.built)) {
      const d = app.draw(t), c = new OffscreenCanvas(w, h), cg = c.getContext('2d');
      cg.imageSmoothingQuality = 'high'; cg.drawImage(app.canvas, 0, 0, w, h);
      cells.push({ c, t: d.t, shot: d.shot, overflow: d.overflow });
      overflow.push(...d.overflow.map(id => `${label} t=${d.t} ${id}`));
    }
    lines.push({ label, cells, w, h });
  }
  const v = app.ctx.variant, fixed = Object.keys(allAxes(film)).filter(k => !(k in rows[0]));
  const name = `sheet_${fixed.map(k => v[k]).join('_')}_${[...new Set(rows.map(r => r.ar))].join('-')}${rows[0].lang ? `_${[...new Set(rows.map(r => r.lang))].join('-')}` : ''}`;
  const W = PAD * 2 + LABEL + Math.max(...lines.map(l => l.cells.length * (l.w + GAP) - GAP));
  const H = HEAD + lines.reduce((s, l) => s + l.h + CAP + GAP, 0) + PAD;
  const cv = Object.assign(document.createElement('canvas'), { width: W, height: H }), g = cv.getContext('2d');
  g.fillStyle = '#161615'; g.fillRect(0, 0, W, H);
  g.textBaseline = 'middle';
  g.font = '600 16px system-ui, sans-serif'; g.fillStyle = '#e6e2d8';
  g.fillText(`${film.id} · ${fixed.map(k => `${k}=${v[k]}`).join(' · ')}`, PAD, HEAD / 2);
  if (overflow.length) { g.fillStyle = '#ff5a4e'; g.fillText(`OVERFLOW ×${overflow.length}`, W - PAD - 160, HEAD / 2); }
  let y = HEAD;
  for (const l of lines) {
    g.font = '600 15px system-ui, sans-serif'; g.fillStyle = '#e6e2d8';
    l.label.split(' ').forEach((s, i) => g.fillText(s, PAD, y + 14 + i * 20));
    l.cells.forEach((c, i) => {
      const x = PAD + LABEL + i * (l.w + GAP);
      g.drawImage(c.c, x, y);
      if (c.overflow.length) { g.strokeStyle = '#ff3b30'; g.lineWidth = 3; g.strokeRect(x + 1.5, y + 1.5, l.w - 3, l.h - 3); }
      g.font = '12px system-ui, sans-serif'; g.fillStyle = c.overflow.length ? '#ff5a4e' : '#9a968c';
      g.fillText(`t=${c.t} ${c.shot}${c.overflow.length ? `  OVERFLOW ${c.overflow.join(', ')}` : ''}`, x, y + l.h + CAP / 2);
    });
    y += l.h + CAP + GAP;
  }
  const url = cv.toDataURL('image/png');
  document.body.append(Object.assign(new Image(), { className: 'sheet', src: url, alt: name }));
  return { name, url, W, H, overflow };
}
