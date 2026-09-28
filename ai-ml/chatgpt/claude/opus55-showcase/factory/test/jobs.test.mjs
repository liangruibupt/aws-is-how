import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { pickJobs, outPaths, isDone, resetJob, finishJob, writeIndex, pool, inputsHash } from '../lib/jobs.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'jobs-'));
const put = (d, f, s) => { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), s); };

test('pickJobs: axis flags make a grid, --all fills in the rest, no flags read the manifest', () => {
  const film = { axes: { sku: ['a', 'b'], cut: [15, 6] }, fileName: v => `${v.sku}_${v.cut}_${v.ar}_${v.vo}` };
  const mf = path.join(tmp(), 'manifest.json'), names = o => pickJobs(film, o, mf).map(film.fileName);
  fs.writeFileSync(mf, JSON.stringify({ jobs: [{ sku: ['b'], cut: [6] }] }));
  assert.deepEqual(names({ fps: '60', force: true }), ['b_6_9x16_on']);                // 不是轴的选项不影响选片
  assert.deepEqual(names({ sku: 'a,b', ar: '1x1' }), ['a_15_1x1_on', 'b_15_1x1_on']);
  assert.equal(names({ all: true }).length, 2 * 2 * 3);                                // 旁白只出 on
  assert.deepEqual(names({ all: true, sku: 'a', cut: '6' }), ['a_6_9x16_on', 'a_6_1x1_on', 'a_6_16x9_on']);
  assert.throws(() => names({ sku: 'x' }), /unknown sku: x/);
});

test('outPaths: mp4, part, sidecar and cover next to each other', () => {
  assert.deepEqual(outPaths('/o', 'a_15s'), { mp4: '/o/a_15s.mp4', part: '/o/a_15s.mp4.part', json: '/o/a_15s.json', cover: '/o/a_15s_cover.jpg' });
});

test('isDone: a half-written, unverified or stale video never counts as done', () => {
  const d = tmp(), p = outPaths(d, 'v');
  assert.equal(isDone(p), false);
  fs.writeFileSync(p.part, 'half');                            // 编码到一半被打断
  assert.equal(isDone(p), false);
  fs.writeFileSync(p.mp4, 'x');                                // 改了名但说明文件还没写
  assert.equal(isDone(p), false);
  fs.writeFileSync(p.json, '{}');                              // 早先没记输入指纹的说明文件
  assert.equal(isDone(p, 'h1'), false);
  fs.writeFileSync(p.json, '{"inputs":"h0"}');                 // 做完之后成片、引擎或配音改过
  assert.equal(isDone(p, 'h1'), false);
  fs.writeFileSync(p.json, '{"inputs":');                      // 说明文件坏了
  assert.equal(isDone(p, 'h1'), false);
  fs.writeFileSync(p.json, '{"inputs":"h1"}');
  assert.equal(isDone(p, 'h1'), true);
  resetJob(p);
  for (const f of Object.values(p)) assert.equal(fs.existsSync(f), false);
});

test('inputsHash: any input file, file name or the extra string changes it; out/, test/, docs and the manifest do not', () => {
  const d = tmp(), h = (extra = 'fps 30') => inputsHash(d, ['film', 'eng', 'render.mjs'], extra);
  put(d, 'film/copy.js', 'a'); put(d, 'film/assets/vo/x.wav', 'w'); put(d, 'eng/app.js', 'e'); put(d, 'render.mjs', 'r');
  const h0 = h();
  assert.match(h0, /^[0-9a-f]{64}$/);
  put(d, 'film/out/v.mp4', 'x'); put(d, 'film/test/t.test.mjs', 't'); put(d, 'film/README.md', '#'); put(d, 'film/manifest.json', '{}');
  put(d, 'film/.DS_Store', 'f'); put(d, 'other/z.js', 'z');
  assert.equal(h(), h0);
  assert.notEqual(h('fps 60'), h0);
  for (const [f, s] of [['film/assets/vo/x.wav', 'w2'], ['eng/app.js', 'e2'], ['render.mjs', 'r2'], ['film/js/new.js', 'n']]) {
    const before = h(); put(d, f, s); assert.notEqual(h(), before, f);
  }
  const before = h();
  fs.renameSync(path.join(d, 'film/copy.js'), path.join(d, 'film/copy2.js'));
  assert.notEqual(h(), before);
});

test('finishJob renames the part and writes the sidecar; writeIndex collects finished videos only', () => {
  const d = tmp();
  for (const n of ['b', 'a']) {
    const p = outPaths(d, n);
    fs.writeFileSync(p.part, 'video');
    finishJob(p, { file: `${n}.mp4`, name: n });
    assert.ok(isDone(p)); assert.equal(fs.existsSync(p.part), false);
  }
  fs.writeFileSync(path.join(d, 'c.json'), JSON.stringify({ file: 'c.mp4', name: 'c' }));   // 说明文件在、视频不在
  fs.writeFileSync(path.join(d, 'c.mp4.part'), 'half');
  const idx = writeIndex(d, { film: 't' });
  assert.equal(idx.film, 't');
  assert.deepEqual(idx.videos.map(v => v.name), ['a', 'b']);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(d, 'index.json'), 'utf8')), idx);
  assert.deepEqual(writeIndex(d).videos.map(v => v.name), ['a', 'b']);   // 重跑时不把 index.json 自己算进去
});

test('pool: bounded concurrency, results in order, a failure does not stop the others', async () => {
  let live = 0, peak = 0;
  const r = await pool([30, 10, 20, 5, 15], 2, async (ms, i) => {
    live++; peak = Math.max(peak, live);
    await new Promise(ok => setTimeout(ok, ms));
    live--;
    if (i === 1) throw new Error('boom');
    return ms * 2;
  });
  assert.equal(peak, 2);
  assert.deepEqual([r[0], r[2], r[3], r[4]], [60, 40, 10, 30]);
  assert.match(r[1].error.message, /boom/);
  assert.deepEqual(await pool([], 3, async () => 1), []);
});
