import test from 'node:test';
import assert from 'node:assert/strict';
import { CUTS, EV, BAR, META } from '../meta.js';
import { SKUS } from '../skus.js';
import { score, SCORES, LOGO, STEP } from '../js/score.js';
import { VOICES, BUSES, mtof } from '../../factory/engine/audio.js';
import { buildCut, shotAt } from '../../factory/engine/timeline.js';

const V = (o = {}) => ({ sku: 'whitetea', ar: '9x16', lang: 'zh', cut: 15, promo: 'none', vo: 'on', ...o });
const run = o => { const v = V(o), built = buildCut(CUTS[v.cut]); return { built, ...score(v, built) }; };
const onGrid = (t, g) => Math.abs(t / g - Math.round(t / g)) < 1e-9;
const near = (a, b) => Math.abs(a - b) < 1e-9;
const each = fn => { for (const sku of META.axes.sku) for (const cut of META.axes.cut) fn(sku, cut, run({ sku, cut })); };

test('every sku has a score with both cuts and a reverb', () => {
  for (const sku of META.axes.sku) {
    const s = SCORES[SKUS[sku].score];
    assert.ok(s, `no score for ${sku}`);
    assert.equal(typeof s.m15, 'function'); assert.equal(typeof s.m6, 'function');
    assert.ok(s.reverb.decay > 0 && Number.isInteger(s.tonic));
  }
});

test('every event is well-formed and inside the film', () => {
  each((sku, cut, { built, notes }) => {
    assert.ok(notes.length > 20);
    for (const e of notes) {
      const where = `${sku} ${cut}s ${e.voice} at ${e.t}`;
      assert.ok(VOICES[e.voice], `${where}: unknown voice`);
      assert.ok(BUSES.includes(e.bus), `${where}: bus ${e.bus}`);
      for (const k of ['t', 'f', 'd', 'v']) assert.ok(Number.isFinite(e[k]), `${where}: ${k} = ${e[k]}`);
      assert.ok(e.t >= 0 && e.t < built.duration, `${where}: outside 0…${built.duration}`);
      assert.ok(e.d > 0 && e.v > 0 && e.v <= 1 && e.f > 20 && e.f < 16000, `${where}: d ${e.d} v ${e.v} f ${e.f}`);
      assert.ok(e.pan === undefined || Math.abs(e.pan) <= 1);
    }
    for (let i = 1; i < notes.length; i++) assert.ok(notes[i].t >= notes[i - 1].t, 'sorted by time');
  });
});

test('hits are bar downbeats and the music lands on each of them', () => {
  each((sku, cut, { built, notes }) => {
    for (const [name, t] of Object.entries(built.hits)) {
      assert.ok(onGrid(t, BAR), `${sku} ${cut}s hit ${name} at ${t} is not a downbeat`);
      assert.ok(notes.some(e => e.bus === 'music' && near(e.t, t)), `${sku} ${cut}s: no music onset on the ${name} hit at ${t}`);
    }
  });
});

test('music onsets sit on the sixteenth-note grid', () => {
  each((sku, cut, { notes }) => {
    for (const e of notes.filter(e => e.bus === 'music')) assert.ok(onGrid(e.t, STEP), `${sku} ${cut}s: ${e.voice} at ${e.t}`);
  });
});

test('the sonic logo: same intervals from the tonic in every scent, on the sfx bus at the logo hit', () => {
  each((sku, cut, { built, notes }) => {
    const t = built.hits.logo, tonic = SCORES[SKUS[sku].score].tonic;
    const logo = notes.filter(e => e.bus === 'sfx' && e.voice === 'pluck' && e.t >= t - 1e-9 && e.t < t + BAR / 2);
    assert.deepEqual(logo.map(e => e.t - t), [0, 0.375, 0.75], `${sku} ${cut}s logo rhythm`);
    logo.forEach((e, i) => assert.ok(Math.abs(e.f - mtof(tonic + LOGO[i])) < 1e-6, `${sku} ${cut}s logo note ${i}`));
  });
});

test('sound effects follow the picture: drop, spray, transitions, bed', () => {
  const at = (notes, voice, t) => notes.some(e => e.bus === 'sfx' && e.voice === voice && near(e.t, t));
  for (const cut of [15, 6]) {
    const { built, notes } = run({ cut }), drop = shotAt(built, 'drop');
    assert.ok(at(notes, 'plink', drop.start + EV.land - drop.from), `${cut}s: plink at the landing`);
    assert.ok(at(notes, 'noise', 0) && notes.some(e => e.voice === 'noise' && near(e.t, 0) && near(e.d, built.duration)), `${cut}s: bed over the whole film`);
    for (const e of built.entries.filter(e => e.transition.type !== 'cut')) assert.ok(at(notes, 'noise', e.start + e.transition.dur / 2 - 0.4), `${cut}s: whoosh into ${e.shot}`);
  }
  const { notes } = run();
  assert.ok(at(notes, 'bell', 10.5 + EV.lift), 'clink as the cap lifts');
  assert.ok(at(notes, 'noise', 10.5 + EV.spray), 'spray hiss');
  assert.ok(at(notes, 'click', 10.5 + EV.seat), 'cap seats');
  assert.ok(!run({ cut: 6 }).notes.some(e => e.voice === 'click'), 'the 6 s cut has no spray shot, so no click');
});

test('the 6 s cut has its own arrangement, not a slice of the 15 s one', () => {
  for (const sku of META.axes.sku) {
    const key = e => `${e.voice}|${e.f.toFixed(3)}|${e.d.toFixed(4)}`, music = n => n.filter(e => e.bus === 'music');
    const long = music(run({ sku }).notes), short = music(run({ sku, cut: 6 }).notes);
    const has = new Set(long.map(e => `${key(e)}|${e.t.toFixed(4)}`));
    for (const shift of new Set(long.map(e => e.t))) {
      const hit = short.filter(e => has.has(`${key(e)}|${(e.t + shift).toFixed(4)}`)).length;
      assert.ok(hit < short.length * 0.5, `${sku}: ${hit}/${short.length} of the 6 s notes appear in the 15 s cut shifted by ${shift} s`);
    }
  }
});

test('deterministic, and the aspect ratio, language and promo do not change the sound', () => {
  const a = run();
  assert.deepEqual(run(), a);
  for (const o of [{ ar: '16x9' }, { ar: '1x1' }, { lang: 'en' }, { promo: '1111' }]) assert.deepEqual(run(o).notes, a.notes, JSON.stringify(o));
});
