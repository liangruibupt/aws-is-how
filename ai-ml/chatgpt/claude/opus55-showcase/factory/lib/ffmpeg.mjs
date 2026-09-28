// ffmpeg.mjs — 编码与校验：PNG 帧经 stdin 管道进 ffmpeg（不落临时帧文件）→ H.264 MP4；ffprobe 核对时长、尺寸、帧率、帧数、音轨
// 声音：WAV 先量一遍响度，增益、限幅，再量一遍补一个线性增益落到 −14 LUFS，单独编成 AAC 再量；真峰值超了就压低限幅重编，
// 成片直接拷这条音轨，最后再量一遍核对
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';

export const X264 = ['-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart'];
export const AAC = ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000'];

export const LOUD = { I: -14, TP: -1.5, LRA: 20 };           // 电商平台的常见目标；TP 比验收线（−1）低 0.5 dB 留余量；LRA 只是 loudnorm 测量时要填的参数
const LIMIT = -3;                                              // 预增益之后的限幅（dBFS）：瞬态削掉后，补回响度的那点增益才不会把真峰值推过 TP

export const hasFfmpeg = () => spawnSync('ffmpeg', ['-version']).status === 0 && spawnSync('ffprobe', ['-version']).status === 0;

/** ffmpeg 参数：stdin 上的 PNG 帧 (+ 可选的、encodeAudio 编好的 AAC 音轨，原样拷进去) → out（容器写死 mp4，所以 out 可以是 .mp4.part） */
export function encodeArgs({ fps, out, audio = null }) {
  const a = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-'];
  if (audio) a.push('-i', audio);
  a.push('-map', '0:v:0', ...X264, '-r', String(fps));
  if (audio) a.push('-map', '1:a:0', '-c:a', 'copy'); else a.push('-an');
  a.push('-f', 'mp4', out);
  return a;
}

/** 起一个编码进程：write(buf) 带背压，end() → { code, stderr } */
export function startEncode(args) {
  const p = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = '', dead = null;
  p.stderr.on('data', d => { stderr += d; });
  p.stdin.on('error', e => { dead = e; });                     // ffmpeg 提前退出时写管道会 EPIPE，留到 end() 一并报告
  const exited = once(p, 'close');
  return {
    async write(buf) {
      if (dead) throw new Error(`ffmpeg stopped: ${stderr.trim() || dead.message}`);
      if (!p.stdin.write(buf)) await Promise.race([once(p.stdin, 'drain'), exited]);
    },
    async end() {
      p.stdin.end();
      const [code] = await exited;
      return { code, stderr: stderr.trim() };
    },
    kill: () => p.kill('SIGKILL'),
  };
}

/** ffprobe → { duration, width, height, fps, frames, audio, bytes } */
export function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-count_packets', '-show_entries',
    'stream=codec_type,width,height,r_frame_rate,nb_read_packets:format=duration,size', '-of', 'json', file], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffprobe ${file}: ${r.stderr.trim()}`);
  const j = JSON.parse(r.stdout), v = j.streams.find(s => s.codec_type === 'video'), [a, b] = (v?.r_frame_rate ?? '0/1').split('/').map(Number);
  return {
    duration: +j.format.duration, bytes: +j.format.size, width: v?.width, height: v?.height,
    fps: b ? a / b : 0, frames: +(v?.nb_read_packets ?? 0), audio: j.streams.some(s => s.codec_type === 'audio'),
  };
}

/** 探测结果与预期比对，返回问题列表（空 = 通过）。时长允许差一帧再加 50 ms（AAC 编码的首尾补白） */
export function checkProbe(p, { duration, width, height, fps, audio }) {
  const bad = [], frames = Math.round(duration * fps);
  if (p.width !== width || p.height !== height) bad.push(`size ${p.width}×${p.height} ≠ ${width}×${height}`);
  if (Math.abs(p.fps - fps) > 1e-3) bad.push(`fps ${p.fps} ≠ ${fps}`);
  if (p.frames !== frames) bad.push(`frames ${p.frames} ≠ ${frames}`);
  if (Math.abs(p.duration - duration) > 1 / fps + 0.05) bad.push(`duration ${p.duration.toFixed(3)} s ≠ ${duration} s`);
  if (p.audio !== audio) bad.push(audio ? 'no audio stream' : 'unexpected audio stream');
  return bad;
}

/** ffmpeg 的 loudnorm 量一遍 file（先经 pre 滤镜链）→ { I, TP, LRA, thresh, offset } */
export function measure(file, pre = '') {
  const af = `${pre ? `${pre},` : ''}loudnorm=I=${LOUD.I}:TP=${LOUD.TP}:LRA=${LOUD.LRA}:print_format=json`;
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-map', '0:a:0', '-af', af, '-f', 'null', '-'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`loudnorm ${file}: ${r.stderr.trim().split('\n').slice(-2).join(' | ')}`);
  const j = JSON.parse(r.stderr.slice(r.stderr.lastIndexOf('{'), r.stderr.lastIndexOf('}') + 1));
  return { I: +j.input_i, TP: +j.input_tp, LRA: +j.input_lra, thresh: +j.input_thresh, offset: +j.target_offset };
}

/** 编码用的 -af：把 wav 的响度增益到目标、限幅在 limit（dBFS），再量一遍，补上限幅削掉的响度。
 *  全是线性增益，不做动态压缩，音乐的起伏不变（loudnorm 的 linear 模式条件不满足时会悄悄改做动态压缩，所以不用它） */
export function loudnessFilter(wav, limit = LIMIT) {
  const raw = measure(wav);
  if (!Number.isFinite(raw.I)) throw new Error(`${wav} is silent: no loudness to normalise`);
  const pre = `volume=${(LOUD.I - raw.I).toFixed(2)}dB,alimiter=limit=${Math.pow(10, limit / 20).toFixed(3)}:level=false:latency=true`, m = measure(wav, pre);
  return `${pre},volume=${(LOUD.I - m.I).toFixed(2)}dB`;
}

/** wav → out（AAC，mp4 容器）：经 loudnessFilter 编码后再量。AAC 编码会把真峰值推高（高频多的段落，实测最多 3 dB），
 *  高过 tp 就把限幅再压低超出的量加 0.3 dB，重编，最多 4 遍 → 最后一遍量到的 { I, TP, LRA, thresh, offset, limit } */
export function encodeAudio(wav, out, tp = LOUD.TP) {
  let limit = LIMIT, m;
  for (let i = 0; i < 4; i++) {
    const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-af', loudnessFilter(wav, limit), ...AAC, '-f', 'mp4', out], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`aac ${wav}: ${r.stderr.trim().split('\n').slice(-2).join(' | ')}`);
    m = { ...measure(out), limit };
    if (m.TP <= tp) break;
    limit = Math.round((limit - (m.TP - tp + 0.3)) * 100) / 100;
  }
  return m;
}

/** 成片的响度与目标比对，返回问题列表（空 = 通过）：综合响度 ±1 LU，真峰值 ≤ −1 dBTP */
export function checkLoudness({ I, TP }) {
  const bad = [];
  if (!(Math.abs(I - LOUD.I) <= 1)) bad.push(`loudness ${I} LUFS ≠ ${LOUD.I} ± 1`);
  if (!(TP <= -1)) bad.push(`true peak ${TP} dBTP > −1`);
  return bad;
}
