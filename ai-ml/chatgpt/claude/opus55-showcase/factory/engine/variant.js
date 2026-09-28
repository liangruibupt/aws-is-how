// variant.js — 变体：每条轴取一个值（香型、比例、语言、时长、促销、配音）；URL / 清单解析、网格展开、文件命名

export const ASPECTS = { '9x16': [1080, 1920], '1x1': [1080, 1080], '16x9': [1920, 1080] };
export const ENGINE_AXES = { ar: Object.keys(ASPECTS), vo: ['on', 'off'] };
// 平台界面（图标列、标题与字幕带、状态栏）会盖住的区域：画面比例坐标 [x, y, w, h]，y 向下
export const UNSAFE = {
  '9x16': [[0, 0, 1, 0.07], [0.86, 0.34, 0.14, 0.52], [0, 0.82, 1, 0.18]],
  '1x1': [],
  '16x9': [],
};
export const MARGIN = 0.04;
// 最小字号：画面短边的比例
export const MIN_TEXT = { '9x16': 0.035, '1x1': 0.035, '16x9': 0.03 };

export const allAxes = film => ({ ...film.axes, ...ENGINE_AXES });

const pick = (name, list, s) => {
  const v = list.find(x => String(x) === String(s));
  if (v === undefined) throw new Error(`unknown ${name}: ${s} (expected ${list.join(' | ')})`);
  return v;
};

export function parseVariant(film, params = {}) {
  const get = k => (params instanceof URLSearchParams ? params.get(k) : params[k]);
  const v = {};
  for (const [k, list] of Object.entries(allAxes(film))) {
    const s = get(k);
    v[k] = s == null || s === '' ? list[0] : pick(k, list, s);
  }
  return v;
}

/** 清单 { jobs: [{ axis: [值 | '*'] }] } → 变体列表；未写的轴取第一个值；按文件名去重 */
export function expandJobs(film, manifest, { all = false } = {}) {
  const axes = allAxes(film);
  const grids = all ? [{ ...Object.fromEntries(Object.keys(axes).map(k => [k, ['*']])), vo: ['on'] }] : manifest.jobs;
  const out = new Map();
  for (const g of grids) {
    for (const k of Object.keys(g)) if (!(k in axes)) throw new Error(`manifest: unknown axis ${k}`);
    let combos = [{}];
    for (const [k, list] of Object.entries(axes)) {
      const want = g[k] ?? [list[0]], vals = want.includes('*') ? list : want.map(s => pick(k, list, s));
      combos = combos.flatMap(c => vals.map(x => ({ ...c, [k]: x })));
    }
    for (const c of combos) { const n = film.fileName(c); if (!out.has(n)) out.set(n, c); }
  }
  return [...out.values()];
}

export const variantQuery = (film, v) => Object.keys(allAxes(film)).map(k => `${k}=${encodeURIComponent(v[k])}`).join('&');
export const variantName = (film, v) => film.fileName(v);
