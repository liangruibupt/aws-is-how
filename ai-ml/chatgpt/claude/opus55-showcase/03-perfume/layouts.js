// layouts.js — 每种比例 × 每个镜头的构图：瓶子锚点（画面比例坐标，y 向下）、占画面高度、最大宽度、文字区 [x, y, w, h]、对齐
// 9:16 避开抖音 / 淘宝的右侧图标列和底部标题带（variant.js 的 UNSAFE），安全区中心在 x ≈ 0.45

export const LAYOUTS = {
  '9x16': {
    macro: { anchor: [0.52, 0.33], size: 0.5, maxW: 0.9, align: 'center', zones: { hook: [0.08, 0.64, 0.74, 0.1] } },
    drop: { anchor: [0.45, 0.42], size: 0.5 },
    hero: { anchor: [0.45, 0.35], size: 0.44, align: 'center', zones: { title: [0.08, 0.58, 0.74, 0.1], sub: [0.08, 0.68, 0.74, 0.06] } },
    anatomy: { anchor: [0.3, 0.4], size: 0.54, maxW: 0.36, align: 'left', zones: { n0: [0.5, 0.14, 0.34, 0.1], n1: [0.5, 0.33, 0.34, 0.1], n2: [0.5, 0.55, 0.34, 0.1], edp: [0.08, 0.72, 0.74, 0.06] } },
    spray: { anchor: [0.45, 0.45], size: 0.46 },
    end: { anchor: [0.45, 0.28], size: 0.34, align: 'center', zones: { logo: [0.1, 0.49, 0.7, 0.08], brand: [0.1, 0.57, 0.7, 0.04], line1: [0.1, 0.625, 0.7, 0.05], line2: [0.1, 0.675, 0.7, 0.07], line3: [0.1, 0.745, 0.7, 0.05] } },
  },
  '1x1': {
    macro: { anchor: [0.5, 0.4], size: 0.66, maxW: 0.9, align: 'center', zones: { hook: [0.08, 0.8, 0.84, 0.1] } },
    drop: { anchor: [0.5, 0.45], size: 0.62 },
    hero: { anchor: [0.5, 0.4], size: 0.56, align: 'center', zones: { title: [0.08, 0.72, 0.84, 0.13], sub: [0.08, 0.85, 0.84, 0.07] } },
    anatomy: { anchor: [0.34, 0.47], size: 0.78, maxW: 0.4, align: 'left', zones: { n0: [0.56, 0.12, 0.37, 0.14], n1: [0.56, 0.38, 0.37, 0.14], n2: [0.56, 0.64, 0.37, 0.14], edp: [0.08, 0.87, 0.84, 0.07] } },
    spray: { anchor: [0.5, 0.48], size: 0.6 },
    end: { anchor: [0.5, 0.3], size: 0.42, align: 'center', zones: { logo: [0.1, 0.55, 0.8, 0.11], brand: [0.1, 0.66, 0.8, 0.05], line1: [0.1, 0.73, 0.8, 0.06], line2: [0.1, 0.79, 0.8, 0.09], line3: [0.1, 0.88, 0.8, 0.06] } },
  },
  '16x9': {
    macro: { anchor: [0.68, 0.42], size: 0.72, maxW: 0.6, align: 'left', zones: { hook: [0.06, 0.74, 0.42, 0.12] } },
    drop: { anchor: [0.66, 0.5], size: 0.74 },
    hero: { anchor: [0.68, 0.5], size: 0.72, align: 'left', zones: { title: [0.07, 0.34, 0.43, 0.18], sub: [0.07, 0.53, 0.43, 0.09] } },
    anatomy: { anchor: [0.66, 0.5], size: 0.82, maxW: 0.3, align: 'left', zones: { n0: [0.07, 0.16, 0.37, 0.14], n1: [0.07, 0.4, 0.37, 0.14], n2: [0.07, 0.64, 0.37, 0.14], edp: [0.07, 0.83, 0.43, 0.08] } },
    spray: { anchor: [0.66, 0.52], size: 0.7 },
    end: { anchor: [0.72, 0.5], size: 0.66, align: 'left', zones: { logo: [0.07, 0.22, 0.45, 0.16], brand: [0.07, 0.38, 0.45, 0.07], line1: [0.07, 0.52, 0.45, 0.08], line2: [0.07, 0.6, 0.45, 0.13], line3: [0.07, 0.73, 0.45, 0.08] } },
  },
};
