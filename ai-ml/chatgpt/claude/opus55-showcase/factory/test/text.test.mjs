import test from 'node:test';
import assert from 'node:assert/strict';
import { NO_START, NO_END, fontStr, tokenize, wrap, layout, approxMeasure as M, prepareLayer, drawLayer } from '../engine/text.js';

const F = { family: 'Test', weight: 600 };
const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≠ ${b}`);
// 记录绘制调用的假画布：方法调用记进 calls，属性照常存取
const rec = () => { const calls = []; return { calls, ctx: new Proxy({}, { get: (o, k) => (k in o ? o[k] : (...a) => calls.push([k, ...a])), set: (o, k, v) => ((o[k] = v), true) }) }; };

test('fontStr and approxMeasure', () => {
  assert.equal(fontStr(F, 40), 'normal 600 40.00px "Test", serif');
  assert.equal(M('闻境', fontStr(F, 40)), 80);
  assert.equal(M('闻境', fontStr(F, 40), 4), 88);
  assert.ok(M('WENJING', fontStr(F, 40)) > M('wenjing', fontStr(F, 40)));
});

test('tokenize keeps Latin runs whole inside Chinese', () => {
  assert.deepEqual(tokenize('50 ml · 浓香水', 'zh').filter(s => s.trim()), ['50', 'ml', '·', '浓', '香', '水']);
  assert.ok(tokenize('WENJING 闻境', 'zh').includes('WENJING'));
  assert.ok(tokenize('双11 到手价', 'zh').includes('11'));
  assert.deepEqual(tokenize('TOP\nBergamot  Tea', 'en'), ['TOP', '\n', 'Bergamot', 'Tea']);
});

test('en wraps per word and never splits a word', () => {
  const r = layout(M, { text: 'Global Shopping Festival', lang: 'en', font: F, zone: [0, 0, 330, 400], size: 40, min: 30 });
  assert.ok(r.lines.length >= 2);
  assert.equal(r.lines.join(' '), 'Global Shopping Festival');
  assert.equal(r.overflow, false);
});

test('zh never starts a line with closing punctuation, never ends with an opening one', () => {
  const texts = ['一滴晨露，一片茶山。清晨的第一缕光，落在叶尖上。', '限时（双11）好价，到手更低！《闻境》新品「白茶」'];
  for (const text of texts) for (let w = 120; w < 640; w += 7) {
    const r = layout(M, { text, lang: 'zh', font: F, zone: [0, 0, w, 4000], size: 40, min: 40 });
    for (const l of r.lines) {
      assert.ok(!NO_START.includes(l[0]), `"${l}" starts with punctuation at width ${w}`);
      assert.ok(!NO_END.includes(l.at(-1)), `"${l}" ends with an opening bracket at width ${w}`);
    }
    assert.equal(r.lines.join(''), text);
  }
});

test('\\n forces a break', () => {
  const r = layout(M, { text: 'TOP\nBergamot · Green Tea', lang: 'en', font: F, zone: [0, 0, 2000, 400], size: 40, min: 30 });
  assert.deepEqual(r.lines, ['TOP', 'Bergamot · Green Tea']);
});

test('shrinks to fit, respects maxLines, never goes below min', () => {
  const r = layout(M, { text: 'Eau de Parfum', lang: 'en', font: F, zone: [0, 0, 260, 200], size: 60, min: 20, maxLines: 1 });
  assert.equal(r.lines.length, 1); assert.ok(r.size < 60 && r.size >= 20); assert.ok(r.width <= 260.5); assert.equal(r.overflow, false);
  const o = layout(M, { text: 'Supercalifragilistic', lang: 'en', font: F, zone: [0, 0, 100, 400], size: 40, min: 30 });
  assert.equal(o.overflow, true); near(o.size, 30);
  const h = layout(M, { text: '一二三四五六七八九十', lang: 'zh', font: F, zone: [0, 0, 100, 60], size: 40, min: 12 });
  assert.ok(h.height <= 60.5 && !h.overflow);
});

test('prepareLayer: pixels, min size rule, reveal and fade windows', () => {
  const env = { lt: 0.75, zones: { z: [0.1, 0.5, 0.8, 0.1] }, W: 1080, H: 1920, minFrac: 0.035, preview: true };
  const L = prepareLayer({ id: 'x', text: 'a', lang: 'en', font: F, zone: 'z', size: 0.01, in: [0.5, 1.0] }, env);
  assert.deepEqual(L.zone.map(Math.round), [108, 960, 864, 192]);
  near(L.size, 10.8); near(L.min, 37.8); near(L.reveal, 0.5); assert.equal(L.alpha, 1); assert.equal(L.showOverflow, true);
  const O = prepareLayer({ id: 'y', text: 'a', lang: 'en', font: F, zone: 'z', size: 0.05, out: [0.5, 1.0] }, env);
  near(O.alpha, 0.5); assert.equal(O.reveal, 1);
  assert.throws(() => prepareLayer({ id: 'q', zone: 'nope', size: 0.05 }, env), /text layer q: no zone nope/);
});

test('layout starts at the minimum when the requested size is smaller', () => {
  const r = layout(M, { text: 'a', lang: 'en', font: F, zone: [0, 0, 500, 500], size: 10, min: 37.8 });
  near(r.size, 37.8);
});

test('a boxed layer fits its text and padding in the zone width; left or right, the box edge sits on the zone edge', () => {
  const L = { text: 'Global Shopping Festival', lang: 'en', font: F, zone: [100, 0, 400, 80], size: 40, min: 10, maxLines: 1, box: { fill: '#e1251b', pad: 0.5 } };
  const r = layout(M, L);
  near(r.pad, 0.5 * r.size);
  assert.ok(r.width + 2 * r.pad <= 400.5 && !r.overflow, `${r.width} + 2 × ${r.pad}`);
  assert.ok(layout(M, { ...L, box: undefined }).size > r.size);               // 不带底色块时字可以更大：衬边也要占地方
  assert.equal(layout(M, { ...L, box: undefined }).pad, 0);
  for (const [align, x] of [['left', 100], ['right', 500 - r.width - 2 * r.pad], ['center', 300 - r.width / 2 - r.pad]]) {
    const { ctx, calls } = rec();
    drawLayer(ctx, { ...L, align, valign: 'middle' }, M);
    const arcs = calls.filter(c => c[0] === 'arcTo'), [, text, tx] = calls.find(c => c[0] === 'fillText');
    near(arcs[2][1], x); near(arcs[0][1], x + r.width + 2 * r.pad);           // 底色块的左、右边
    assert.equal(text, L.text); near(tx, x + r.pad, 1e-6);                        // 字在块里，两边各留 pad
  }
});
