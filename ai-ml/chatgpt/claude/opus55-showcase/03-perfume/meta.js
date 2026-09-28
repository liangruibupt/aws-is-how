// meta.js — 成片骨架（纯数据，浏览器与 Node 测试共用）：轴、剪辑表、命中点、封面时刻、瓶子尺寸与机位、文件命名

export const BAR = 3.0, GRID = 1.5;                    // 一小节 3 秒；命中点都落在 1.5 秒网格上
export const SHOTS = ['macro', 'drop', 'hero', 'anatomy', 'spray', 'end'];
// 镜头内部的事件（镜头本地秒）：水滴落进液面、光带扫过峰值
export const EV = { land: 0.75, streak: 1.5 };

export const CUTS = {
  15: {
    shots: [
      { shot: 'macro', dur: 2.25 }, { shot: 'drop', dur: 2.25 },
      { shot: 'hero', dur: 3.0, transition: { type: 'dissolve', dur: 0.3 } },
      { shot: 'anatomy', dur: 3.0 },
      { shot: 'spray', dur: 1.5, transition: { type: 'dissolve', dur: 0.25 } },
      { shot: 'end', dur: 3.0, transition: { type: 'dissolve', dur: 0.4 } },
    ],
    hits: { land: 3.0, streak: 6.0, logo: 12.0 }, cover: 6.4,
  },
  6: {
    shots: [
      { shot: 'drop', dur: 1.5, from: 0.75 },
      { shot: 'hero', dur: 1.5, from: 0.75, transition: { type: 'flash', dur: 0.2 } },
      { shot: 'end', dur: 3.0, transition: { type: 'dissolve', dur: 0.3 } },
    ],
    hits: { land: 0, logo: 3.0 }, cover: 2.6,
  },
};

// 瓶子尺寸（米）：瓶身 7.4 × 4.6 × 10.5 cm，金属颈圈 1.2 cm，瓶盖 4.5 cm；分解图里各部件上抬的距离
export const DIMS = { w: 0.074, d: 0.046, body: 0.105, collar: 0.012, cap: 0.045 };
export const EXPLODE = { pump: 0.035, collar: 0.065, cap: 0.09 };
const TOP = DIMS.body + DIMS.collar + DIMS.cap;
export const BOX = {
  bottle: [[-DIMS.w / 2, 0, -DIMS.d / 2], [DIMS.w / 2, TOP, DIMS.d / 2]],
  exploded: [[-DIMS.w / 2, 0, -DIMS.d / 2], [DIMS.w / 2, TOP + EXPLODE.cap, DIMS.d / 2]],
};
// 各镜头框取的对象与机位：pitch 仰角、yaw 绕竖轴（度，[起, 止] 随镜头进度变化），shots.js 与 layouts 测试共用
export const VIEW = {
  drop: { box: 'bottle', pitch: 12, yaw: [-8, -8], fov: 30 },
  hero: { box: 'bottle', pitch: 6, yaw: [-25, 15], fov: 28 },
  anatomy: { box: 'exploded', pitch: 8, yaw: [30, 30], fov: 26 },
  spray: { box: 'bottle', pitch: 5, yaw: [-35, -35], fov: 30 },
  end: { box: 'bottle', pitch: 7, yaw: [10, 4], fov: 28 },
};
const R = Math.PI / 180;
export const viewDir = (pitch, yaw) => [Math.sin(yaw * R) * Math.cos(pitch * R), Math.sin(pitch * R), Math.cos(yaw * R) * Math.cos(pitch * R)];

export const META = {
  id: '03-perfume',
  axes: { sku: ['whitetea', 'osmanthus', 'seasalt', 'rose'], lang: ['zh', 'en'], cut: [15, 6], promo: ['none', '1111', 'launch'] },
  sceneAxes: ['sku'],
  cuts: CUTS,
  fileName: v => `wenjing_${v.sku}_${v.cut}s_${v.ar}_${v.lang}${v.promo === 'none' ? '' : `_${v.promo}`}${v.vo === 'off' ? '_novo' : ''}`,
};
