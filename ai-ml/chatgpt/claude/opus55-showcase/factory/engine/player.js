// player.js — 预览播放器：各轴的变体选择、播放 / 暂停、按镜头分段的时间轴、声音、高画质与安全区开关、快捷键；变体写回地址栏，刷新后保持
import { allAxes } from './variant.js';
import { safeOverlay } from './sheet.js';
import { createSound } from './audio.js';

const FRAME = 1 / 30;

export function createPlayer(app) {
  const { film } = app, axes = allAxes(film);
  const bar = document.createElement('nav');
  bar.className = 'player';
  bar.innerHTML = `
    <div class="axes"></div>
    <div class="transport">
      <button class="play" type="button" title="播放 / 暂停（空格）">❚❚</button>
      <div class="track"><div class="shots"></div><input class="scrub" type="range" min="0" max="1" step="0.001" value="0" aria-label="时间" /></div>
      <output class="time">0.00 s</output>
      <label class="snd" title="声音（M）"${film.score ? '' : ' hidden'}><input type="checkbox" /> 声音</label>
      <label class="hq" title="高画质（Q）"><input type="checkbox" checked /> HQ</label>
    </div>
    <p class="keys">空格 播放 · ← → 0.5 秒 · Shift + ← → 一帧 · 1–9 跳到第 n 个镜头 · S 安全区 · M 声音 · Q 高画质</p>
    <p class="err" hidden></p>`;
  document.body.append(bar);
  const $ = s => bar.querySelector(s), scrub = $('.scrub'), time = $('.time'), play = $('.play'), hq = $('.hq input'), snd = $('.snd input'), err = $('.err');
  const fail = e => { console.error(e); err.hidden = false; err.textContent = String(e?.message ?? e); };

  const selects = {};
  for (const [k, list] of Object.entries(axes)) {
    const sel = document.createElement('select');
    sel.setAttribute('aria-label', k);
    sel.innerHTML = list.map(x => `<option value="${x}">${x}</option>`).join('');
    sel.onchange = () => { err.hidden = true; app.setVariant({ [k]: sel.value }).catch(fail); };
    const lab = document.createElement('label'); lab.append(k, sel); $('.axes').append(lab);
    selects[k] = sel;
  }

  function onVariant(v) {
    for (const [k, sel] of Object.entries(selects)) sel.value = String(v[k]);
    const b = app.ctx.built;
    scrub.max = b.duration;
    $('.shots').innerHTML = b.entries.map(e => `<span style="left:${(e.start / b.duration) * 100}%;width:${((e.end - e.start) / b.duration) * 100}%">${e.shot}</span>`).join('');
    const q = new URLSearchParams(location.search);
    for (const k of Object.keys(axes)) q.set(k, v[k]);
    q.delete('t');
    history.replaceState(null, '', `?${q}`);
  }
  function onTime(t) {
    scrub.value = t; time.textContent = `${t.toFixed(2)} s`;
    play.textContent = app.playing ? '❚❚' : '▶';
  }
  app.on('variant', onVariant);
  app.on('time', onTime);
  app.ready.then(() => { onVariant(app.ctx.variant); onTime(app.t); }, fail);

  function toggleSafe() {                                       // 安全区叠加层开关，同步到地址栏的 ?safe
    const i = app.overlays.indexOf(safeOverlay), q = new URLSearchParams(location.search);
    if (i < 0) { app.overlays.push(safeOverlay); q.set('safe', ''); } else { app.overlays.splice(i, 1); q.delete('safe'); }
    history.replaceState(null, '', `?${q}`); app.redraw();
  }

  play.onclick = () => { app.toggle(); onTime(app.t); };
  scrub.oninput = () => { app.pause(); app.seek(+scrub.value); };
  hq.onchange = () => app.setHQ(hq.checked);
  const sound = createSound(app, { onError: fail });            // 默认静音：浏览器只允许在点击、按键之后出声
  snd.onchange = () => sound.set(snd.checked).catch(fail);
  addEventListener('keydown', e => {
    if (e.target.closest?.('select, input:not([type=checkbox])') && e.key !== ' ') return;   // 勾过的复选框还拿着焦点，快捷键照样用
    const b = app.ctx.built;
    if (e.key === ' ') { e.preventDefault(); app.toggle(); onTime(app.t); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { app.pause(); app.seek(app.t + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? FRAME : 0.5)); }
    else if (/^[1-9]$/.test(e.key) && b.entries[+e.key - 1]) { app.pause(); app.seek(b.entries[+e.key - 1].start); }
    else if (e.key === 'q' || e.key === 'Q') { hq.checked = !hq.checked; app.setHQ(hq.checked); }
    else if (e.key === 's' || e.key === 'S') toggleSafe();
    else if ((e.key === 'm' || e.key === 'M') && film.score) { snd.checked = !snd.checked; sound.set(snd.checked).catch(fail); }
  });
  return { bar, fail };
}
