import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import film from '../film.js';
import { plannedLines, VO_LUFS, MAX_RATE } from '../../factory/vo.mjs';
import { voPlan, fresh } from '../../factory/engine/audio.js';
import { expandJobs } from '../../factory/engine/variant.js';

const dir = new URL('../assets/vo/', import.meta.url), index = JSON.parse(fs.readFileSync(new URL('index.json', dir), 'utf8'));
const lines = plannedLines(film), fix = 'run: node factory/vo.mjs 03-perfume';

test('every planned line has a clip made from its current text, voice and speed', () => {
  assert.equal(lines.length, 64);                                      // 4 香型 × 2 语言 ×（15 秒 hero、notes、3 种片尾 + 6 秒 3 种）
  for (const l of lines) {
    assert.ok(index[l.id], `${l.id}: no clip (${fix})`);
    assert.ok(fresh(index[l.id], l), `${l.id}: the clip says "${index[l.id].text}" in ${index[l.id].voice}; the line is now "${l.text}" in ${l.voice} (${fix})`);
    assert.ok(fs.existsSync(new URL(`${l.id}.mp3`, dir)), `${l.id}.mp3 is missing (${fix} --force)`);
  }
});

test('every clip fits its slot, at most MAX_RATE faster than planned, at VO_LUFS', () => {
  for (const l of lines) {
    const e = index[l.id];
    assert.ok(e.dur > 0.5 && e.dur <= l.max, `${l.id}: ${e.dur} s in a ${l.max} s slot`);
    assert.ok(e.rate >= l.speed && e.rate <= MAX_RATE, `${l.id}: rate ${e.rate}`);
    assert.equal(e.lufs, VO_LUFS);
  }
});

test('no clip is left over from a line that is no longer planned', () => {
  const ids = new Set(lines.map(l => l.id)), files = fs.readdirSync(dir).filter(f => f !== 'index.json');
  assert.deepEqual(Object.keys(index).filter(id => !ids.has(id)), []);
  assert.deepEqual(files.filter(f => !f.endsWith('.mp3') || !ids.has(f.slice(0, -4))), []);
});

test('lines with different words are different recordings', () => {
  const seen = new Map();                                              // Kokoro 的输出文件互相覆盖时，一句会拿到另一句的录音
  for (const l of lines) {
    const h = fs.readFileSync(new URL(`${l.id}.mp3`, dir)).toString('base64'), o = seen.get(h);
    assert.ok(!o || o.text === l.text, `${l.id}.mp3 ("${l.text}") is byte-identical to ${o?.id}.mp3 ("${o?.text}")`);
    seen.set(h, l);
  }
});

test('the clips stay small enough to commit', () => {
  const bytes = fs.readdirSync(dir).reduce((s, f) => s + fs.statSync(new URL(f, dir)).size, 0);
  assert.ok(bytes < 1.5e6, `${(bytes / 1e6).toFixed(2)} MB`);
});

test('every variant resolves to its clips, and the engine refuses a missing one', () => {
  const vs = expandJobs(film, { jobs: [Object.fromEntries(Object.keys(film.axes).map(k => [k, ['*']]))] });
  for (const v of vs) assert.equal(voPlan(film, v, index).length, v.vo === 'off' ? 0 : v.cut === 6 ? 1 : 3, JSON.stringify(v));
  const v = vs.find(x => x.vo === 'on' && x.cut === 15), { [`${v.sku}_${v.lang}_15_hero`]: gone, ...rest } = index;
  assert.ok(gone);
  assert.throws(() => voPlan(film, v, rest), new RegExp(`voice-over clip missing: ${v.sku}_${v.lang}_15_hero`));
});
