"""Step 1 — 從神龍本掃描圖中提取墨跡，分行、分字。

Outputs work/segments.npz (label image + per-char component lists) and
contact sheets under work/ for visual verification.
"""
import json, os
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import gaussian_filter1d
from text import COLUMNS, BLOT

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'source', 'LantingXu.jpg')
WORK = os.path.join(HERE, 'work'); os.makedirs(WORK, exist_ok=True)
TEXT_RIGHT = 4170          # 右側為前隔水（只有鑑藏印），不屬正文
MIN_AREA = 40              # 小於此面積視為紙面雜點
OVERRIDES = json.load(open(os.path.join(HERE, 'overrides.json'))) if os.path.exists(os.path.join(HERE, 'overrides.json')) else {}


def ink_mask(rgb):
    gray = rgb.mean(-1)
    R, G = rgb[..., 0], rgb[..., 1]
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41))
    bg = cv2.GaussianBlur(cv2.morphologyEx(gray, cv2.MORPH_CLOSE, k), (0, 0), 15)
    ratio = gray / np.maximum(bg, 1)
    m = (ratio < 0.55) & (gray < 105) & ((R - G) <= 38)   # 深、且非朱印
    m[:, TEXT_RIGHT:] = False
    return m, ratio


def column_bounds(mask):
    prof = gaussian_filter1d(mask.sum(0).astype(float), 18)
    mins = [x for x in range(40, TEXT_RIGHT - 10)
            if prof[x] == prof[max(0, x - 60):x + 60].min()]
    assert len(mins) == 27, mins
    edges = [0] + mins + [TEXT_RIGHT]
    # 右起第一行 → index 0
    return [(edges[i], edges[i + 1]) for i in range(27, -1, -1)]


def cut_column(comps, n, y0, y1):
    """DP: choose n-1 horizontal cuts, preferring wide whitespace gaps over slicing ink."""
    ys = np.arange(y0, y1 + 1)
    cover = np.zeros(len(ys))
    mass = np.zeros(len(ys) + 1)                # ink area by centroid row
    for (t, b, a) in comps:                     # top, bottom, area
        s, e = max(t, y0) - y0, min(b, y1) - y0
        if e > s: cover[s:e + 1] += 40 + np.sqrt(a)
        mass[min(len(ys) - 1, max(0, (t + b) // 2 - y0)) + 1] += a
    cmass = np.cumsum(mass)
    min_mass = 0.12 * cmass[-1] / n
    # reward: distance to nearest covered row (capped) → cut in the middle of big gaps
    free = cover == 0
    dist = np.zeros(len(ys))
    run = 0
    for i in range(len(ys)):
        run = run + 1 if free[i] else 0; dist[i] = run
    run = 0
    for i in range(len(ys) - 1, -1, -1):
        run = run + 1 if free[i] else 0; dist[i] = min(dist[i], run)
    cost = cover - np.minimum(dist, 25) * 1.6
    hbar = (y1 - y0) / n
    step = 2
    idx = np.arange(0, len(ys), step); idx[-1] = len(ys) - 1
    L = len(idx)
    INF = 1e18
    prev = np.full(L, INF); prev[0] = 0.0
    back = []
    for k in range(1, n + 1):
        cur = np.full(L, INF); bk = np.zeros(L, int)
        for j in range(L):
            if k == n and j != L - 1: continue
            h = idx[j] - idx[:j]
            seg_mass = cmass[idx[j]] - cmass[idx[:j]]
            ok = (h >= 0.3 * hbar) & (h <= 2.4 * hbar) & (prev[:j] < INF) & (seg_mass >= min_mass)
            if not ok.any(): continue
            c = np.where(ok, prev[:j] + 0.08 * (h - hbar) ** 2 / hbar, INF)
            i = int(np.argmin(c))
            cur[j] = c[i] + (cost[idx[j]] if k < n else 0); bk[j] = i
        back.append(bk); prev = cur
    cuts = [L - 1]
    for k in range(n - 1, -1, -1):
        cuts.append(back[k][cuts[-1]])
    cuts = cuts[::-1]
    return [int(ys[idx[c]]) for c in cuts]


def main():
    rgb = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
    H, W, _ = rgb.shape
    mask, ratio = ink_mask(rgb)
    n, lab, st, cen = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    keep = st[:, 4] >= MIN_AREA; keep[0] = False
    lab = np.where(keep[lab], lab, 0)
    cols = column_bounds(lab > 0)
    ov_cols = OVERRIDES.get('columns', {})

    # 1) split blobs that physically join two characters (e.g. 「向之」 overwritten)
    nxt = lab.max() + 1
    for key, ov in ov_cols.items():
        a, b = cols[int(key) - 1]
        for y in ov.get('split', []):
            band = lab[:, a:b]
            for c in np.unique(band[y]):
                if c == 0: continue
                ys, xs = np.nonzero(lab == c)
                below = ys >= y
                if min(below.mean(), 1 - below.mean()) < 0.15: continue
                lab[ys[below], xs[below]] = nxt; nxt += 1
    ids = [c for c in np.unique(lab) if c]
    stats = {}
    for c in ids:
        ys, xs = np.nonzero(lab == c)
        stats[c] = (xs.mean(), ys.mean(), ys.min(), ys.max() + 1, len(ys))

    # 2) components → columns (centroid x)
    comp_col = {}
    for c, (cx, cy, t, b, a) in stats.items():
        for ci, (x0, x1) in enumerate(cols):
            if x0 <= cx < x1: comp_col[c] = ci; break

    # 3) columns → characters (DP cuts or manual cuts), by centroid y
    chars, owner = [], {}
    for ci, text in enumerate(COLUMNS):
        ov = ov_cols.get(str(ci + 1), {})
        skip = set(ov.get('skip', []))
        seq = [k for k in range(len(text)) if k + 1 not in skip]
        cs = [c for c, k in comp_col.items() if k == ci]
        y0 = min(stats[c][2] for c in cs) - 2; y1 = max(stats[c][3] for c in cs) + 2
        cuts = ov.get('cuts') or cut_column([(stats[c][2], stats[c][3], stats[c][4]) for c in cs], len(seq), y0, y1)
        assert len(cuts) == len(seq) + 1, (ci + 1, len(cuts), len(seq))
        base = len(chars)
        for k, ch in enumerate(text):
            chars.append(dict(col=ci, idx=k, ch=ch, blot=ch == BLOT))
        for j, k in enumerate(seq):
            for c in cs:
                if cuts[j] <= stats[c][1] < cuts[j + 1]: owner[c] = base + k
    key2i = {f"{c['col']+1}.{c['idx']+1}": i for i, c in enumerate(chars)}
    charmap = np.full(lab.shape, -1, np.int16)
    for c, i in owner.items(): charmap[lab == c] = i

    # 4) pixel-level claims
    for cl in OVERRIDES.get('claims', []):
        i = key2i[cl['char']]
        for (px, py) in cl.get('pts', []):           # component with nearest centroid
            c = min(stats, key=lambda k: (stats[k][0] - px) ** 2 + (stats[k][1] - py) ** 2)
            charmap[lab == c] = i
        if 'rect' in cl:
            x0, y0, x1, y1 = cl['rect']
            sub = charmap[y0:y1, x0:x1]; sub[lab[y0:y1, x0:x1] > 0] = i

    for i, c in enumerate(chars):
        ys, xs = np.nonzero(charmap == i)
        if len(ys) == 0: print('EMPTY', c['col'] + 1, c['idx'] + 1, c['ch']); continue
        c['bbox'] = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
        c['area'] = int(len(ys))
    orphan = (lab > 0) & (charmap < 0)
    print('orphan ink px', int(orphan.sum()))
    np.save(os.path.join(WORK, 'charmap.npy'), charmap)
    np.save(os.path.join(WORK, 'ratio.npy'), ratio.astype(np.float32))
    json.dump(dict(cols=cols, chars=chars, size=[W, H]), open(os.path.join(WORK, 'segments.json'), 'w'), ensure_ascii=False)
    contact_sheets(charmap, chars)


def contact_sheets(charmap, chars):
    font = ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc', 22)
    cell, per, cols_n = 120, 60, 12
    for s in range(0, len(chars), per):
        group = chars[s:s + per]
        rows = (len(group) + cols_n - 1) // cols_n
        sheet = Image.new('RGB', (cols_n * cell, rows * (cell + 26)), 'white')
        d = ImageDraw.Draw(sheet)
        for i, c in enumerate(group):
            x, y = (i % cols_n) * cell, (i // cols_n) * (cell + 26)
            if 'bbox' in c:
                x0, y0, x1, y1 = c['bbox']
                sub = charmap[y0:y1, x0:x1] == s + i
                img = Image.fromarray(np.where(sub, 0, 255).astype(np.uint8))
                img.thumbnail((cell - 8, cell - 8))
                sheet.paste(img, (x + 4, y + 26))
            d.text((x + 4, y), f"{c['col']+1}.{c['idx']+1} {c['ch']}", fill=(200, 0, 0), font=font)
        sheet.save(os.path.join(WORK, f'sheet_{s // per:02d}.png'))


if __name__ == '__main__':
    main()
