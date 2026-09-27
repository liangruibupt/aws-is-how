// textures.js — 程序生成：宣紙、綾、錦、氈；包首題簽；「永和」白文印
export function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}

function grain(g, w, h, amp, r, tint = [1, 1, 1]) {
  const id = g.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amp;
    d[i] += n * tint[0]; d[i + 1] += n * tint[1]; d[i + 2] += n * tint[2];
  }
  g.putImageData(id, 0, 0);
}

// 在 3×3 位移上重複繪製，使圖塊無縫
const tiled = (size, fn) => { for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) fn(ox, oy); };

/** 宣紙：暖白底、細纖維、偶見草屑。 */
export function paperTile(size = 512) {
  const r = rng(7), c = canvas(size, size), g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#f0e7d2'; g.fillRect(0, 0, size, size);
  grain(g, size, size, 9, r, [1, 0.97, 0.9]);
  g.lineCap = 'round';
  for (let k = 0; k < 360; k++) {
    const x = r() * size, y = r() * size, len = 8 + r() * 64, a = r() * Math.PI * 2, bend = (r() - 0.5) * 0.9;
    const x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len;
    const cx = (x + x1) / 2 - Math.sin(a) * len * bend, cy = (y + y1) / 2 + Math.cos(a) * len * bend;
    g.strokeStyle = r() < 0.55 ? `rgba(150,118,78,${0.04 + r() * 0.08})` : `rgba(255,252,240,${0.10 + r() * 0.14})`;
    g.lineWidth = 0.35 + r() * 0.9;
    tiled(size, (ox, oy) => { g.beginPath(); g.moveTo(x + ox, y + oy); g.quadraticCurveTo(cx + ox, cy + oy, x1 + ox, y1 + oy); g.stroke(); });
  }
  for (let k = 0; k < 22; k++) {
    const x = r() * size, y = r() * size, rx = 0.5 + r() * 1.5, ry = 0.3 + r() * 0.8, a = r() * Math.PI;
    g.fillStyle = `rgba(96,72,44,${0.12 + r() * 0.2})`;
    g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); g.fill();
  }
  return c;
}

/** 紙面低頻斑駁（以 multiply 疊於整卷）。 */
export function mottle(w = 240, h = 80) {
  const r = rng(11), c = canvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  for (const [cw, a] of [[12, 0.55], [30, 0.35], [80, 0.25]]) {
    const ch = Math.max(2, Math.round(cw * h / w)), s = canvas(cw, ch), sg = s.getContext('2d');
    const id = sg.createImageData(cw, ch);
    for (let i = 0; i < id.data.length; i += 4) {
      const n = r();
      id.data[i] = 255 - n * 34; id.data[i + 1] = 255 - n * 46; id.data[i + 2] = 255 - n * 72; id.data[i + 3] = 255 * a;
    }
    sg.putImageData(id, 0, 0);
    g.imageSmoothingQuality = 'high';
    g.globalCompositeOperation = 'multiply';
    g.drawImage(s, 0, 0, w, h);
  }
  // 上下緣微黃（舊紙）
  const e = g.createLinearGradient(0, 0, 0, h);
  e.addColorStop(0, 'rgba(214,190,146,.55)'); e.addColorStop(0.07, 'rgba(255,255,255,0)');
  e.addColorStop(0.93, 'rgba(255,255,255,0)'); e.addColorStop(1, 'rgba(214,190,146,.55)');
  g.fillStyle = e; g.fillRect(0, 0, w, h);
  return c;
}

/** 綾（天地頭、隔水）：灰青底、斜紋。 */
export function silkTile(size = 128) {
  const r = rng(3), c = canvas(size, size), g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#b4b8a4'; g.fillRect(0, 0, size, size);
  grain(g, size, size, 7, r);
  g.lineWidth = 1;
  for (let i = -size; i < size * 2; i += 3) {
    g.strokeStyle = (i / 3) % 2 ? 'rgba(255,255,245,.07)' : 'rgba(60,64,50,.06)';
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + size, size); g.stroke();
  }
  // 暗花：小團雲
  g.strokeStyle = 'rgba(255,255,240,.10)'; g.lineWidth = 1.2;
  for (const [x, y] of [[32, 32], [96, 96]]) {
    tiled(size, (ox, oy) => {
      g.beginPath(); g.arc(x + ox - 5, y + oy, 5, Math.PI * 0.2, Math.PI * 1.8); g.stroke();
      g.beginPath(); g.arc(x + ox + 5, y + oy - 2, 4, Math.PI * 1.1, Math.PI * 2.7); g.stroke();
      g.beginPath(); g.moveTo(x + ox - 12, y + oy + 5); g.quadraticCurveTo(x + ox, y + oy + 9, x + ox + 12, y + oy + 4); g.stroke();
    });
  }
  return c;
}

/** 錦（包首）：藍地金花。 */
export function brocadeTile(size = 64) {
  const r = rng(5), c = canvas(size, size), g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#1f2a43'; g.fillRect(0, 0, size, size);
  grain(g, size, size, 10, r);
  const h = size / 2;
  tiled(size, (ox, oy) => {
    for (const [x, y, big] of [[0, 0, 1], [h, h, 1], [h, 0, 0], [0, h, 0]]) {
      const X = x + ox, Y = y + oy;
      if (big) {
        g.fillStyle = 'rgba(190,156,96,.62)';
        for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(X + Math.cos(k * Math.PI / 2) * 5, Y + Math.sin(k * Math.PI / 2) * 5, 4.2, 2.2, k * Math.PI / 2, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = 'rgba(226,196,136,.85)'; g.beginPath(); g.arc(X, Y, 1.8, 0, Math.PI * 2); g.fill();
      } else {
        g.fillStyle = 'rgba(190,156,96,.3)';
        g.beginPath(); g.moveTo(X, Y - 3); g.lineTo(X + 3, Y); g.lineTo(X, Y + 3); g.lineTo(X - 3, Y); g.fill();
      }
    }
  });
  return c;
}

/** 案上毛氈。 */
export function feltTile(size = 256) {
  const r = rng(9), c = canvas(size, size), g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#1b1814'; g.fillRect(0, 0, size, size);
  grain(g, size, size, 12, r, [1, 0.95, 0.85]);
  g.lineCap = 'round';
  for (let k = 0; k < 900; k++) {
    const x = r() * size, y = r() * size, a = r() * Math.PI * 2, l = 2 + r() * 7;
    g.strokeStyle = `rgba(${r() < 0.5 ? '120,105,85' : '0,0,0'},${0.05 + r() * 0.08})`;
    g.lineWidth = 0.6;
    tiled(size, (ox, oy) => { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); g.stroke(); });
  }
  return c;
}

/** 包首：錦面、金邊、題簽「蘭亭集序　臨本」。 */
export function makeBaoshou(w, h, brocade, paper, font) {
  const c = canvas(w, h), g = c.getContext('2d');
  g.fillStyle = g.createPattern(brocade, 'repeat'); g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(200,166,104,.55)'; g.lineWidth = 2;
  g.strokeRect(10, 10, w - 20, h - 20);
  // 題簽
  const sx = w - 96, sy = 150, sw = 58, sh = 720;
  g.save();
  g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
  g.fillStyle = g.createPattern(paper, 'repeat'); g.fillRect(sx, sy, sw, sh);
  g.restore();
  g.fillStyle = 'rgba(190,160,110,.18)'; g.fillRect(sx, sy, sw, sh);
  g.strokeStyle = 'rgba(80,60,36,.35)'; g.lineWidth = 1; g.strokeRect(sx + 4.5, sy + 4.5, sw - 9, sh - 9);
  g.fillStyle = '#2a211b'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `38px ${font}`;
  [...'蘭亭集序'].forEach((ch, i) => g.fillText(ch, sx + sw / 2, sy + 62 + i * 50));
  g.font = `22px ${font}`; g.fillStyle = '#4a3c30';
  [...'神龍本　臨'].forEach((ch, i) => g.fillText(ch, sx + sw / 2, sy + 300 + i * 29));
  g.fillStyle = '#b3301f'; g.fillRect(sx + sw / 2 - 11, sy + 470, 22, 22);
  g.fillStyle = '#f2e6d0'; g.font = `15px ${font}`; g.fillText('臨', sx + sw / 2, sy + 482);
  return c;
}

/**
 * 「永和」白文印：以右軍原帖「永」「和」二字入印（加粗、鏤空），邊緣殘破、印泥不勻。
 * 回傳 3× 解析度畫布；世界尺寸由呼叫端決定。
 */
export function makeSeal(sprite, glyphs, W, H, S = 3) {
  const r = rng(1353), c = canvas(W * S, H * S), g = c.getContext('2d');
  const w = c.width, h = c.height;
  // 不規則外框
  g.fillStyle = '#b32a1c';
  g.beginPath();
  const pts = [], inset = 3 * S, n = 60;
  for (let i = 0; i < n; i++) {
    const t = i / n, side = Math.floor(t * 4), f = (t * 4) % 1;
    let x, y;
    if (side === 0) { x = inset + f * (w - 2 * inset); y = inset; }
    else if (side === 1) { x = w - inset; y = inset + f * (h - 2 * inset); }
    else if (side === 2) { x = w - inset - f * (w - 2 * inset); y = h - inset; }
    else { x = inset; y = h - inset - f * (h - 2 * inset); }
    pts.push([x + (r() - 0.5) * 2.4 * S, y + (r() - 0.5) * 2.4 * S]);
  }
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath(); g.fill();
  // 字口鏤空
  g.globalCompositeOperation = 'destination-out';
  const pad = 7 * S, slotH = (h - 2 * pad) / glyphs.length;
  glyphs.forEach((c0, k) => {
    const [ax, ay] = c0.at, [, , gw, gh] = c0.box;
    const sc = Math.min((w - 2 * pad) / gw, (slotH - 2 * S) / gh) * 1.06;
    const dx = (w - gw * sc) / 2, dy = pad + k * slotH + (slotH - gh * sc) / 2;
    const rad = 2.2 * S;                                   // 加粗：多方位疊印
    for (let a = 0; a < 12; a++) {
      g.drawImage(sprite, ax, ay, gw, gh, dx + Math.cos(a / 12 * Math.PI * 2) * rad, dy + Math.sin(a / 12 * Math.PI * 2) * rad, gw * sc, gh * sc);
    }
    g.drawImage(sprite, ax, ay, gw, gh, dx, dy, gw * sc, gh * sc);
  });
  // 印泥不勻、邊角殘損
  for (let k = 0; k < 1400; k++) {
    g.fillStyle = `rgba(0,0,0,${0.12 + r() * 0.5})`;
    g.beginPath(); g.arc(r() * w, r() * h, (0.3 + r() * 1.1) * S, 0, Math.PI * 2); g.fill();
  }
  for (let k = 0; k < 5; k++) {
    const x = r() < 0.5 ? r() * 10 * S : w - r() * 10 * S, y = r() * h;
    const rg = g.createRadialGradient(x, y, 0, x, y, (4 + r() * 6) * S);
    rg.addColorStop(0, 'rgba(0,0,0,.85)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(x - 12 * S, y - 12 * S, 24 * S, 24 * S);
  }
  g.globalCompositeOperation = 'source-over';
  return c;
}
