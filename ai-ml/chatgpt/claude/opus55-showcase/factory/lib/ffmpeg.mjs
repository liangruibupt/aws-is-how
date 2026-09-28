// ffmpeg.mjs — 编码与校验：PNG 帧经 stdin 管道进 ffmpeg（不落临时帧文件）→ H.264 MP4；ffprobe 核对时长、尺寸、帧率、帧数、音轨
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';

export const X264 = ['-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart'];
export const AAC = ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000'];

export const hasFfmpeg = () => spawnSync('ffmpeg', ['-version']).status === 0 && spawnSync('ffprobe', ['-version']).status === 0;

/** ffmpeg 参数：stdin 上的 PNG 帧 (+ 可选的 WAV 音轨) → out（容器写死 mp4，所以 out 可以是 .mp4.part） */
export function encodeArgs({ fps, out, audio = null, afilter = null }) {
  const a = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-'];
  if (audio) a.push('-i', audio);
  a.push('-map', '0:v:0', ...X264, '-r', String(fps));
  if (audio) a.push('-map', '1:a:0', ...(afilter ? ['-af', afilter] : []), ...AAC); else a.push('-an');
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
