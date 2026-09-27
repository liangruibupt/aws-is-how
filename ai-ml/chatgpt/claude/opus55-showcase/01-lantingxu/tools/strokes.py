"""Step 2 — 由每字墨跡還原「筆路」：骨架化 → 圖 → 按書寫習慣排序的筆畫。

Reads work/segments.json + work/charmap.npy (from segment.py), writes:
  ../assets/lanting.json   — per-character stroke paths [x, y, r] in char-local px
  ../assets/ink-atlas.png  — per-character ink density (grayscale = alpha)
  ../assets/model.jpg      — the 神龍本 scan used as 範本
"""
import json, math, os, shutil
from functools import cmp_to_key
import numpy as np, cv2
from PIL import Image
from scipy import ndimage as ndi
from skimage.morphology import skeletonize, remove_small_holes

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, 'work')
OUT = os.path.join(HERE, '..', 'assets')
PAD = 3
STEP = 2.0            # resample spacing (px)

# 神龍本中可見的旁添、塗改處（只標注現象，不臆測原字）
NOTES = {
    '4.2': '「崇山」二字為書畢後旁添小字',
    '4.3': '「崇山」二字為書畢後旁添小字',
    '13.2': '「因」字有塗改重寫之跡',
    '17.9': '「向之」二字塗改重寫，墨色特重',
    '17.10': '「向之」二字塗改重寫，墨色特重',
    '21.2': '「痛」字有改筆',
    '25.7': '此處塗去原字，墨團猶存——草稿本色',
    '25.9': '「夫」字有塗改重寫之跡',
    '28.8': '末字「文」有改筆，重墨收束全篇',
}


# ───────────────────────── skeleton graph ─────────────────────────
NB = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def neighbors(sk, y, x):
    H, W = sk.shape
    for dy, dx in NB:
        yy, xx = y + dy, x + dx
        if 0 <= yy < H and 0 <= xx < W and sk[yy, xx]:
            yield yy, xx


def build_graph(sk):
    """Return nodes {id: (y,x)} and edges [(u, v, [(y,x)...])]."""
    pix = set(zip(*np.nonzero(sk)))
    deg = {p: sum(1 for _ in neighbors(sk, *p)) for p in pix}
    nodepix = {p for p, d in deg.items() if d != 2}
    # merge adjacent junction pixels into one node
    node_of, nodes = {}, {}
    for p in nodepix:
        if p in node_of: continue
        nid = len(nodes); stack = [p]; cluster = []
        node_of[p] = nid
        while stack:
            q = stack.pop(); cluster.append(q)
            for r in neighbors(sk, *q):
                if r in nodepix and r not in node_of:
                    node_of[r] = nid; stack.append(r)
        cy = sum(c[0] for c in cluster) / len(cluster); cx = sum(c[1] for c in cluster) / len(cluster)
        nodes[nid] = (cy, cx, cluster)
    edges, seen = [], set()
    for p in nodepix:
        for q in neighbors(sk, *p):
            if q in nodepix:
                a, b = node_of[p], node_of[q]
                if a != b and (min(a, b), max(a, b), 'd') not in seen:
                    seen.add((min(a, b), max(a, b), 'd')); edges.append((a, b, [p, q]))
                continue
            if (p, q) in seen: continue
            path = [p, q]; prev, cur = p, q
            while cur not in nodepix:
                nxt = [r for r in neighbors(sk, *cur) if r != prev and r not in path[-3:]]
                if not nxt: break
                prev, cur = cur, nxt[0]; path.append(cur)
            seen.add((p, q)); seen.add((path[-1], path[-2]))
            if cur in nodepix:
                edges.append((node_of[p], node_of[cur], path))
    # pure loops (no node pixels) — e.g. an 「口」 drawn as a ring
    covered = {px for e in edges for px in e[2]} | nodepix
    rest = pix - covered
    while rest:
        p = min(rest)                                  # top-most
        nid = len(nodes); nodes[nid] = (p[0], p[1], [p])
        path = [p]; prev, cur = None, p
        while True:
            nxt = [r for r in neighbors(sk, *cur) if r != prev and r in rest and r not in path]
            if not nxt: break
            prev, cur = cur, nxt[0]; path.append(cur)
        path.append(p)
        edges.append((nid, nid, path)); rest -= set(path)
    return nodes, edges


def plen(path):
    return sum(math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]) for i in range(len(path) - 1))


def prune(nodes, edges, dist, rounds=3):
    for _ in range(rounds):
        deg = {}
        for a, b, _p in edges:
            deg[a] = deg.get(a, 0) + 1; deg[b] = deg.get(b, 0) + 1
        keep = []
        for e in edges:
            a, b, path = e
            L = plen(path)
            leaf = (deg[a] == 1) != (deg[b] == 1)          # exactly one end dangling
            if leaf:
                j = b if deg[a] == 1 else a
                jy, jx = int(round(nodes[j][0])), int(round(nodes[j][1]))
                r = dist[min(jy, dist.shape[0] - 1), min(jx, dist.shape[1] - 1)]
                if L < max(4.0, 1.3 * r):
                    continue
            keep.append(e)
        if len(keep) == len(edges): break
        edges = keep
    return merge_deg2(nodes, edges)


def merge_deg2(nodes, edges):
    """After pruning, fuse edges meeting at degree-2 nodes into one path."""
    changed = True
    while changed:
        changed = False
        deg = {}
        for i, (a, b, _p) in enumerate(edges):
            deg.setdefault(a, []).append(i); deg.setdefault(b, []).append(i)
        for n, lst in deg.items():
            if len(lst) == 2 and lst[0] != lst[1]:
                i, j = lst
                a1, b1, p1 = edges[i]; a2, b2, p2 = edges[j]
                if b1 != n: a1, b1, p1 = b1, a1, p1[::-1]
                if a2 != n: a2, b2, p2 = b2, a2, p2[::-1]
                new = (a1, b2, p1 + p2[1:])
                edges = [e for k, e in enumerate(edges) if k not in (i, j)] + [new]
                changed = True
                break
    return edges


# ───────────────────────── stroke ordering ─────────────────────────
def order_components(comps):
    """comps: list of (bbox, payload). 左右結構先左後右，上下結構先上後下。"""
    def cmp(A, B):
        (ax0, ay0, ax1, ay1), (bx0, by0, bx1, by1) = A[0], B[0]
        ov = min(ax1, bx1) - max(ax0, bx0)
        narrow = max(1, min(ax1 - ax0, bx1 - bx0))
        if ov > 0.3 * narrow:                       # stacked → top first
            return -1 if (ay0 + ay1) / 2 < (by0 + by1) / 2 else 1
        return -1 if (ax0 + ax1) / 2 < (bx0 + bx1) / 2 else 1
    return sorted(comps, key=cmp_to_key(cmp))


def walk_component(nodes, edges, eids):
    """Traverse the edges of one skeleton component as a sequence of brush strokes."""
    adj = {}
    for i in eids:
        a, b, _ = edges[i]
        adj.setdefault(a, []).append(i); adj.setdefault(b, []).append(i)
    full_deg = {n: len(v) for n, v in adj.items()}
    left = set(eids)
    strokes = []
    pen = None

    def start_score(n):
        y, x = nodes[n][0], nodes[n][1]
        s = y + 0.55 * x
        if full_deg[n] != 1: s += 25                   # prefer true stroke ends
        if pen is not None: s += 0.25 * math.hypot(y - pen[0], x - pen[1])
        return s

    while left:
        cand = {n for i in left for n in edges[i][:2]}
        cand = [n for n in cand if any(i in left for i in adj[n])]
        n = min(cand, key=start_score)
        path = []; cur = n; direction = None
        while True:
            opts = [i for i in adj[cur] if i in left]
            if not opts: break
            def oriented(i):
                a, b, p = edges[i]
                return p if a == cur else p[::-1], (b if a == cur else a)
            if direction is None:
                # fresh stroke: 橫自左、豎自上
                i = min(opts, key=lambda i: (oriented(i)[0][min(4, len(oriented(i)[0]) - 1)][0] - nodes[cur][0])
                        + 0.5 * (oriented(i)[0][min(4, len(oriented(i)[0]) - 1)][1] - nodes[cur][1]))
            else:
                def turn(i):
                    p = oriented(i)[0]; k = min(5, len(p) - 1)
                    v = (p[k][0] - p[0][0], p[k][1] - p[0][1])
                    nv = math.hypot(*v) or 1
                    return -(v[0] * direction[0] + v[1] * direction[1]) / nv
                i = min(opts, key=turn)
                if turn(i) > -0.35 and len(opts) > 1: break    # sharp turn at a junction → lift
                if turn(i) > 0.2: break                           # would double back → lift
            p, nxt = oriented(i)
            left.discard(i)
            path.extend(p if not path else p[1:])
            k = min(5, len(p) - 1)
            v = (p[-1][0] - p[-1 - k][0], p[-1][1] - p[-1 - k][1]); nv = math.hypot(*v) or 1
            direction = (v[0] / nv, v[1] / nv)
            cur = nxt
        if path:
            strokes.append(path); pen = path[-1]
    return strokes


def orient_single(path):
    """A lone stroke: horizontal-ish runs left→right, others top→bottom (撇 from its top)."""
    (y0, x0), (y1, x1) = path[0], path[-1]
    if abs(x1 - x0) > 1.6 * abs(y1 - y0):
        return path if x0 <= x1 else path[::-1]
    return path if y0 <= y1 else path[::-1]


def resample(path, dist):
    pts = np.array(path, float)
    if len(pts) == 1:
        y, x = pts[0]; return [(x, y, float(dist[int(y), int(x)]))]
    seg = np.hypot(*np.diff(pts, axis=0).T)
    s = np.concatenate([[0], np.cumsum(seg)])
    L = s[-1]
    n = max(2, int(round(L / STEP)) + 1)
    t = np.linspace(0, L, n)
    ys = np.interp(t, s, pts[:, 0]); xs = np.interp(t, s, pts[:, 1])
    # light smoothing of the centreline
    if n > 4:
        k = np.array([1, 2, 3, 2, 1], float); k /= k.sum()
        ys[2:-2] = np.convolve(ys, k, 'same')[2:-2]; xs[2:-2] = np.convolve(xs, k, 'same')[2:-2]
    rs = ndi.map_coordinates(dist, [ys, xs], order=1)
    rs = np.maximum(rs, 0.8)
    return list(zip(xs, ys, rs))


def char_strokes(mask):
    m = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 1.1) > 0.5
    m = remove_small_holes(m, 40)
    dist = cv2.distanceTransform(m.astype(np.uint8), cv2.DIST_L2, 5)
    sk = skeletonize(m)
    nodes, edges = build_graph(sk)
    edges = prune(nodes, edges, dist)
    # connected components over edges
    parent = {}
    def f(a):
        while parent.setdefault(a, a) != a: a = parent[a]
        return a
    for a, b, _ in edges: parent[f(a)] = f(b)
    groups = {}
    for i, (a, b, _) in enumerate(edges): groups.setdefault(f(a), []).append(i)
    comps = []
    for eids in groups.values():
        allp = np.array([p for i in eids for p in edges[i][2]])
        bbox = (allp[:, 1].min(), allp[:, 0].min(), allp[:, 1].max(), allp[:, 0].max())
        comps.append((bbox, eids))
    # isolated blobs whose skeleton collapsed to nothing → a single dab (點)
    lab, nlab = ndi.label(m)
    covered = set()
    for _, eids in comps:
        for i in eids:
            for (y, x) in edges[i][2][::3]: covered.add(lab[y, x])
    for k in range(1, nlab + 1):
        if k in covered: continue
        ys, xs = np.nonzero(lab == k)
        if len(ys) < 12: continue
        j = np.argmax(dist[ys, xs]); comps.append(((xs.min(), ys.min(), xs.max(), ys.max()), ('dot', ys[j], xs[j])))
    out = []
    for bbox, payload in order_components(comps):
        if isinstance(payload, tuple):
            _, y, x = payload
            out.append([(float(x), float(y), float(dist[y, x]))]); continue
        paths = walk_component(nodes, edges, payload)
        if len(paths) == 1: paths = [orient_single(paths[0])]
        for p in paths:
            out.append(resample(p, dist))
    return out


def paper_level(gray):
    """大尺度紙色：1/4 解析度上取鄰域最亮。segment.py 的 41px 閉運算跨不過大片濃墨
    （墨團、重筆），在那裡會把墨當成紙；這裡補上。"""
    small = cv2.resize(gray, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)
    small = ndi.maximum_filter(cv2.medianBlur(small, 3), size=31)
    small = cv2.GaussianBlur(small, (0, 0), 6)
    return cv2.resize(small, (gray.shape[1], gray.shape[0]), interpolation=cv2.INTER_LINEAR)


def main():
    seg = json.load(open(os.path.join(WORK, 'segments.json')))
    charmap = np.load(os.path.join(WORK, 'charmap.npy'))
    ratio = np.load(os.path.join(WORK, 'ratio.npy'))
    H, W = charmap.shape
    rgb = np.asarray(Image.open(os.path.join(HERE, '..', 'source', 'LantingXu.jpg')).convert('RGB'), np.float32)
    gray, seal = rgb.mean(-1), (rgb[..., 0] - rgb[..., 1]) > 38          # 朱印不入墨
    ratio = np.minimum(ratio, gray / np.maximum(paper_level(gray), 1))
    # ink density: 0 at paper, 1 at full ink
    dens = np.clip((0.68 - ratio) / (0.68 - 0.30), 0, 1) ** 0.85

    chars = seg['chars']
    tiles, meta = [], []
    for i, c in enumerate(chars):
        x0, y0, x1, y1 = c['bbox']
        x0, y0 = max(0, x0 - PAD), max(0, y0 - PAD); x1, y1 = min(W, x1 + PAD), min(H, y1 + PAD)
        cm = charmap[y0:y1, x0:x1]
        mask = cm == i
        # 濃墨區內部：硬遮罩在此常有破洞，由鄰近的高墨度補上（不取鄰字之墨），再填實
        near = cv2.dilate(mask.astype(np.uint8), np.ones((15, 15), np.uint8)) > 0
        core = ndi.binary_fill_holes(mask | (near & (dens[y0:y1, x0:x1] > 0.45) & (cm < 0) & ~seal[y0:y1, x0:x1]))
        soft = cv2.dilate(core.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        alpha = np.where(soft, dens[y0:y1, x0:x1], 0)
        alpha = np.maximum(alpha, mask * 0.35)            # never lose the hard mask
        tiles.append((alpha * 255).astype(np.uint8))
        strokes = char_strokes(mask)
        key = f"{c['col'] + 1}.{c['idx'] + 1}"
        m = dict(ch=c['ch'], col=c['col'], idx=c['idx'], box=[int(x0), int(y0), int(x1 - x0), int(y1 - y0)],
                 s=[[v for (x, y, r) in st for v in (round(float(x), 1), round(float(y), 1), round(float(r), 1))] for st in strokes])
        if c.get('blot'): m['blot'] = 1
        if key in NOTES: m['note'] = NOTES[key]
        meta.append(m)
        if i % 40 == 0: print(i, c['ch'], len(strokes), 'strokes')

    # shelf-pack atlas
    AW = 2048; x = y = shelf = 0; pos = []
    for t in tiles:
        h, w = t.shape
        if x + w > AW: x = 0; y += shelf + 2; shelf = 0
        pos.append((x, y)); x += w + 2; shelf = max(shelf, h)
    atlas = np.zeros((y + shelf, AW), np.uint8)
    for (ax, ay), t in zip(pos, tiles):
        atlas[ay:ay + t.shape[0], ax:ax + t.shape[1]] = t
    for m, (ax, ay) in zip(meta, pos): m['at'] = [int(ax), int(ay)]
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(atlas).save(os.path.join(OUT, 'ink-atlas.png'), optimize=True)
    shutil.copy(os.path.join(HERE, '..', 'source', 'LantingXu.jpg'), os.path.join(OUT, 'model.jpg'))
    data = dict(size=[W, H], textRight=4170, cols=seg['cols'], chars=meta)
    with open(os.path.join(OUT, 'lanting.json'), 'w') as fp:
        json.dump(data, fp, ensure_ascii=False, separators=(',', ':'))
    print('atlas', atlas.shape, 'json KB', os.path.getsize(os.path.join(OUT, 'lanting.json')) // 1024)


if __name__ == '__main__':
    main()
