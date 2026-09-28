import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// 命令行脚本从哪条路径运行都要认出自己是入口：路径里有空格、中文，或者经过符号链接（macOS 的临时目录本身就在链接后面）
const SHOW = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'main-'));
const run = script => spawnSync(process.execPath, [script], { encoding: 'utf8', timeout: 20_000 });

test('vo.mjs with no arguments prints usage and exits 2 when run through a symlink', () => {
  const link = path.join(tmp(), 'show');
  fs.symlinkSync(SHOW, link);
  const r = run(path.join(link, 'factory/vo.mjs'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /^usage: node factory\/vo\.mjs/);
});

test('vo.mjs with no arguments prints usage and exits 2 from a folder with a space and CJK in its name', () => {
  const dir = path.join(tmp(), '工厂 副本');
  fs.cpSync(path.join(SHOW, 'factory'), path.join(dir, 'factory'), { recursive: true, filter: f => path.basename(f) !== 'test' });
  const r = run(path.join(fs.realpathSync(dir), 'factory/vo.mjs'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /^usage: node factory\/vo\.mjs/);
});

test('serve.mjs starts when run through a symlink', async t => {
  const link = path.join(tmp(), 'show');
  fs.symlinkSync(SHOW, link);
  const p = spawn(process.execPath, [path.join(link, 'factory/lib/serve.mjs'), '0']);
  t.after(() => p.kill());
  const out = await new Promise(ok => {
    let s = '';
    p.stdout.on('data', d => { s += d; if (/serving/.test(s)) ok(s); });
    p.on('exit', () => ok(s));
    setTimeout(() => ok(s), 10_000);
  });
  assert.match(out, /^serving /);
});
