// vo.mjs — 配音：按成片的台词表（film.voLines）调 Kokoro 生成每一句，存进 <film>/assets/vo/（mp3 + index.json，入库）：
//   node factory/vo.mjs 03-perfume [--audition] [--force] [--dry]
// 每句按（文字、音色、语速）缓存，没变的不重新生成；生成后裁掉首尾静音、响度统一到 VO_LUFS、峰值限在 VO_PEAK，编成单声道 mp3
// 比时段长就提速重试一次（最多 MAX_RATE 倍），还放不下就报出这一句、以状态码 1 结束；台词表里已经没有的句子连文件一起删掉
// --audition：同一段话用 film.audition 里的候选音色各念一遍，写到 <film>/out/audition/，挑默认音色用
// Kokoro 的 Lambda 按"音色-秒"给输出文件起名（tts-out/<voice>-<秒>.mp3）：同一音色同时念两句会互相覆盖，所以同一音色的句子排队，不同音色并行
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { ROOT } from './lib/serve.mjs';
import { parseArgs } from './lib/args.mjs';
import { pool } from './lib/jobs.mjs';
import { measure } from './lib/ffmpeg.mjs';
import { expandJobs } from './engine/variant.js';
import { fresh } from './engine/audio.js';

export const VO_LUFS = -20, VO_PEAK = -6, MAX_RATE = 1.15;
const TTS = process.env.KOKORO_TTS ?? path.resolve(ROOT, '../../../../ai-ml/aigc/audio_models/Kokoro/tts.sh');
const TRIM = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse';   // 前留 50 ms、后留 80 ms
// 语音的峰值比响度高 16–20 dB（爆破音）；这里先限到比 VO_LUFS 高 14 dB，成片的总限幅器就几乎不用再压语音，配乐也不会跟着一个个字起伏
const LIMIT = `alimiter=limit=${Math.pow(10, VO_PEAK / 20).toFixed(4)}:level=false:latency=true`;

/** 成片所有变体（配音开）里的台词，按 id 去重 */
export function plannedLines(film) {
  const grid = Object.fromEntries(Object.keys(film.axes).map(k => [k, ['*']]));
  const lines = new Map();
  for (const v of expandJobs(film, { jobs: [{ ...grid, ar: ['9x16'], vo: ['on'] }] })) for (const l of film.voLines(v)) lines.set(l.id, l);
  return [...lines.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
}

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { env: { ...process.env, ...env } });
    let err = '';
    p.stderr.on('data', d => { err += d; }); p.stdout.resume();
    p.on('error', reject);
    p.on('close', code => (code === 0 ? resolve() : reject(new Error(`${path.basename(cmd)} exited ${code}: ${err.trim().split('\n').slice(-2).join(' | ')}`))));
  });
}
function needTts() {
  if (!fs.existsSync(TTS)) throw new Error(`Kokoro script not found: ${TTS} (set KOKORO_TTS to ai-ml/aigc/audio_models/Kokoro/tts.sh)`);
}
/** 按音色分队：每个音色一次只念一句，各音色同时进行；结果和 items 一一对应（出错的是 { error }） */
async function byVoice(items, fn) {
  const out = new Array(items.length), queues = Object.values(Object.groupBy(items.map((it, i) => ({ it, i })), x => x.it.voice));
  await Promise.all(queues.map(async q => (await pool(q, 1, x => fn(x.it))).forEach((r, j) => { out[q[j].i] = r; })));
  return out;
}
const duration = f => +spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).stdout;

/** 念一句 → out（mp3）：Kokoro 出 wav，裁静音、调到 VO_LUFS、限幅，限幅后再量一遍补回响度，编码；返回 { dur, lufs } */
async function say(text, voice, rate, out) {
  const wav = path.join(os.tmpdir(), `vo.${process.pid}.${path.basename(out)}.wav`);
  try {
    await run('bash', [TTS, voice, wav, text], { SPEED: String(rate) });
    const m = measure(wav, TRIM);
    if (!Number.isFinite(m.I)) throw new Error(`${voice} returned silence for "${text}"`);
    const pre = `${TRIM},volume=${(VO_LUFS - m.I).toFixed(2)}dB,${LIMIT}`, m2 = measure(wav, pre);
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-af', `${pre},volume=${(VO_LUFS - m2.I).toFixed(2)}dB`, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k', out]);
    return { dur: Math.round(duration(out) * 1000) / 1000, lufs: VO_LUFS };
  } finally { fs.rmSync(wav, { force: true }); }
}

async function audition(film, o) {
  const dir = path.resolve(o.out ?? path.join(ROOT, film.id, 'out', 'audition')), v0 = expandJobs(film, { jobs: [{ vo: ['on'] }] })[0];
  needTts(); fs.mkdirSync(dir, { recursive: true });
  const items = Object.entries(film.audition).flatMap(([lang, voices]) => voices.map(voice => ({ lang, voice, text: film.voLines({ ...v0, lang }).map(l => l.text).join(' ') })));
  const res = await byVoice(items, async ({ lang, voice, text }) => {
    const out = path.join(dir, `${lang}_${voice}.mp3`), { dur } = await say(text, voice, 1, out);
    console.log(`${lang}  ${voice.padEnd(12)}  ${dur.toFixed(2)} s  ${path.relative(process.cwd(), out)}`);
  });
  const bad = res.map((r, i) => r?.error && `${items[i].lang} ${items[i].voice}: ${r.error.message}`).filter(Boolean);
  if (bad.length) { console.error(`failed:\n  ${bad.join('\n  ')}`); return 1; }
  console.log(`\n${items.length} voices · same text per language:\n${Object.keys(film.audition).map(lang => `  ${lang}: ${items.find(i => i.lang === lang).text}`).join('\n')}\nplay them with: afplay <file> — then set VOICE in the film's copy`);
  return 0;
}

async function generate(film, o) {
  const dir = path.join(ROOT, film.id, 'assets', 'vo'), indexFile = path.join(dir, 'index.json');
  fs.mkdirSync(dir, { recursive: true });
  const index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : {}, lines = plannedLines(film);
  const todo = lines.filter(l => o.force || !fresh(index[l.id], l) || !fs.existsSync(path.join(dir, `${l.id}.mp3`)));
  console.log(`${film.id}: ${lines.length} voice-over lines, ${todo.length} to generate`);
  if (o.dry) { for (const l of todo) console.log(`  ${l.id}  ${l.voice}  "${l.text}"`); return 0; }
  if (todo.length) needTts();
  const long = [];
  const res = await byVoice(todo, async l => {
    const out = path.join(dir, `${l.id}.mp3`);
    let rate = l.speed, r = await say(l.text, l.voice, rate, out);
    if (r.dur > l.max) { rate = Math.min(MAX_RATE, Math.round(l.speed * (r.dur / l.max) * 1.03 * 100) / 100); r = await say(l.text, l.voice, rate, out); }
    if (r.dur > l.max) { fs.rmSync(out, { force: true }); delete index[l.id]; long.push(`${l.id} "${l.text}": ${r.dur.toFixed(2)} s at ${rate}× > ${l.max} s slot`); return; }
    index[l.id] = { text: l.text, voice: l.voice, speed: l.speed, rate, dur: r.dur, lufs: r.lufs };
    console.log(`  ${l.id.padEnd(28)}  ${r.dur.toFixed(2)} / ${l.max} s  ${rate === l.speed ? '' : `at ${rate}×  `}${l.voice}`);
  });
  const bad = res.map((r, i) => r?.error && `${todo[i].id}: ${r.error.message}`).filter(Boolean);
  const keep = new Set(lines.map(l => l.id));
  for (const id of Object.keys(index)) if (!keep.has(id)) { delete index[id]; fs.rmSync(path.join(dir, `${id}.mp3`), { force: true }); }
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.mp3') && !keep.has(f.slice(0, -4))) fs.rmSync(path.join(dir, f));
  const sorted = Object.fromEntries(Object.keys(index).sort().map(k => [k, index[k]]));
  fs.writeFileSync(indexFile, `${JSON.stringify(sorted, null, 2)}\n`);
  const bytes = fs.readdirSync(dir).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0);
  console.log(`done: ${Object.keys(sorted).length} clips · ${(bytes / 1e6).toFixed(2)} MB · ${path.relative(process.cwd(), indexFile)}`);
  if (bad.length) console.error(`failed:\n  ${bad.join('\n  ')}`);
  if (long.length) console.error(`too long even at ${MAX_RATE}× — shorten these lines:\n  ${long.join('\n  ')}`);
  return bad.length || long.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const { pos: [name], o } = parseArgs(process.argv.slice(2));
  if (!name || !fs.existsSync(path.join(ROOT, name, 'film.js'))) { console.error('usage: node factory/vo.mjs <film-dir> [--audition] [--force] [--dry] [--out dir]'); process.exit(2); }
  const film = (await import(path.join(ROOT, name, 'film.js'))).default;
  if (!film.voLines) { console.log(`${name} has no voLines: nothing to do`); process.exit(0); }
  try { process.exit(await (o.audition ? audition : generate)(film, o)); } catch (e) { console.error(e.message); process.exit(1); }
}
