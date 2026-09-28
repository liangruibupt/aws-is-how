// 预览页（live 模式）边播放边换变体：主循环不能停，失败的切换不能卡住后面的切换
// 要用 Chromium（Metal）和网络（three 与字体走 CDN），和 render.mjs / check.mjs 一样
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { serve, ROOT } from '../../factory/lib/serve.mjs';
import { launch, openFilm } from '../../factory/lib/browser.mjs';

let srv, browser;
before(async () => { srv = await serve(ROOT, 0); browser = await launch(); });
after(async () => { await browser?.close(); srv?.close(); });

async function open(t, query) {
  const { page } = await openFilm(browser, { base: `http://127.0.0.1:${srv.port}`, film: '03-perfume', query });
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  return { page, errors };
}
// 0.4 秒里播放头走了多少（跨过片尾时按片长取模）
const advance = page => page.evaluate(() => new Promise(r => {
  const t0 = __app.t, D = __app.ctx.built.duration;
  setTimeout(() => r((__app.t - t0 + D) % D), 400);
}));
const settle = (page, patch) => page.evaluate(p => __app.setVariant(p).then(() => 'ok', e => e.message), patch);

test('preview: switching sku while playing keeps the loop running', async t => {
  const { page, errors } = await open(t, 'sku=rose');
  await page.route('**/js/worlds/seasalt.js', async r => { await sleep(500); await r.continue(); });   // 让重建场景跨过好几帧
  assert.equal(await settle(page, { sku: 'seasalt' }), 'ok');
  assert.deepEqual(errors, []);
  assert.ok(await advance(page) > 0.2);
});

test('preview: a rejected variant switch does not block the next one', async t => {
  const { page } = await open(t, 'sku=rose');
  assert.match(await settle(page, { sku: 'nope' }), /unknown sku/);
  assert.equal(await settle(page, { sku: 'whitetea' }), 'ok');
  assert.equal(await page.evaluate(() => __app.ctx.variant.sku), 'whitetea');
});

test('preview: after a world fails to load, switching back rebuilds the scene', async t => {
  const { page, errors } = await open(t, 'sku=whitetea');
  await page.route('**/js/worlds/osmanthus.js', r => r.abort());
  assert.notEqual(await settle(page, { sku: 'osmanthus' }), 'ok');
  await page.unroute('**/js/worlds/osmanthus.js');
  assert.equal(await settle(page, { sku: 'whitetea' }), 'ok');
  assert.ok(await page.evaluate(() => !!__app.ctx.subjects.bottle));
  assert.deepEqual(errors, []);
  assert.ok(await advance(page) > 0.2);
});

test('preview: a frame that throws once does not stop playback', async t => {
  const { page, errors } = await open(t, 'sku=rose');
  await page.evaluate(() => { let n = 0; __app.overlays.push(() => { if (!n++) throw new Error('overlay boom'); }); });
  await sleep(200);
  assert.ok(await advance(page) > 0.2);
  assert.deepEqual(errors, ['overlay boom']);
});
