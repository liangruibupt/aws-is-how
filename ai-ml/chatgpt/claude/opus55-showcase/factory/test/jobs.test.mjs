import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { pickJobs, outPaths, isDone, resetJob, finishJob, writeIndex, pool } from '../lib/jobs.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'jobs-'));

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

test('isDone: a half-written or unverified video never counts as done', () => {
  const d = tmp(), p = outPaths(d, 'v');
  assert.equal(isDone(p), false);
  fs.writeFileSync(p.part, 'half');                            // 编码到一半被打断
  assert.equal(isDone(p), false);
  fs.writeFileSync(p.mp4, 'x');                                // 改了名但说明文件还没写
  assert.equal(isDone(p), false);
  fs.writeFileSync(p.json, '{}');
  assert.equal(isDone(p), true);
  resetJob(p);
  for (const f of Object.values(p)) assert.equal(fs.existsSync(f), false);
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
