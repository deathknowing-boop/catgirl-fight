// ===== 声音（可玩版用）：音效 = WebAudio 解码 sfx_data.js 里的 base64；配乐 = <audio> 循环 =====
const AU = { ctx: null, buf: {}, on: true, bgm: null, last: {} };
function auInit() {          // 浏览器要求先有一次按键 / 点击才能出声，所以第一次输入时才初始化
  if (AU.ctx || typeof SFX_DATA === 'undefined') return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  try { AU.ctx = new AC(); } catch (e) { AU.ctx = null; return; } AU.gain = AU.ctx.createGain(); AU.gain.gain.value = 0.8; AU.gain.connect(AU.ctx.destination);
  for (const k in SFX_DATA) { const bin = atob(SFX_DATA[k]), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); AU.ctx.decodeAudioData(u8.buffer, b => { AU.buf[k] = b; }, () => 0); }
  if (typeof VOX_DATA !== 'undefined') for (const k in VOX_DATA) { const bin = atob(VOX_DATA[k]), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); AU.ctx.decodeAudioData(u8.buffer, b => { AU.buf['v:' + k] = b; }, () => 0); }      // 角色语音（第 30 圈）
  bgmSet(typeof OPT !== 'undefined' ? OPT.bgm : 'office', false);      // 第 68 圈：配乐可切换（opts.js 的 BGMS，按需加载，响度都对齐到 −16 LUFS）
}
function sfx(name, vol = 1) {
  if (!AU.ctx || !AU.on || !AU.buf[name]) return; const now = AU.ctx.currentTime; if (AU.last[name] != null && now - AU.last[name] < 0.035) return; AU.last[name] = now;
  const s = AU.ctx.createBufferSource(), gn = AU.ctx.createGain(); s.buffer = AU.buf[name]; gn.gain.value = vol; s.connect(gn); gn.connect(AU.gain); s.start();
}
function bgmSet(id, play = true) {      // 切歌：停掉旧的，新的一首从头放（第一次用到才建 <audio>，所以不进首屏包）
  AU.bgms = AU.bgms || {}; if (AU.bgm) AU.bgm.pause(); AU.bgm = null; const L = typeof BGMS !== 'undefined' ? BGMS : [{ id: 'office', src: 'assets/bgm.m4a' }], b = L.find(x => x.id === id);
  if (!b || !b.src || (window.NO_BGM && id === 'office')) return;
  if (!AU.bgms[id]) { const a = new Audio(); a.loop = true; a.volume = 0.42; a.preload = 'auto'; AU.bgms[id] = a;
    if (window.NO_BGM && b.pack) fetch(b.pack).then(r => r.arrayBuffer()).then(ab => { a.src = URL.createObjectURL(new Blob([ab], { type: 'audio/mp4' })); if (AU.bgm === a && AU.started && AU.on) a.play().catch(() => 0); }).catch(() => 0);      // 网页版：取回数据包再放
    else a.src = b.src; }
  AU.bgm = AU.bgms[id];
  if (play && AU.started && AU.on && AU.bgm.src) { AU.bgm.currentTime = 0; AU.bgm.play().catch(() => 0); }
}
function bgmPlay() { if (AU.bgm && AU.on) { AU.started = true; if (AU.bgm.src && AU.bgm.paused) AU.bgm.play().catch(() => 0); } }
function auToggle() { AU.on = !AU.on; if (AU.bgm) { if (AU.on) AU.bgm.play().catch(() => 0); else AU.bgm.pause(); } }
// 角色语音：同一个人同时只说一句（新的一句打断旧的）；k = 'ds_h1' / 'ann_fight' …
function vox(k, vol = 1, who = k.split('_')[0]) {
  if (!AU.ctx || !AU.on || !AU.buf['v:' + k]) return; AU.vsrc = AU.vsrc || {}; const old = AU.vsrc[who]; if (old) { try { old.stop(); } catch (e) {} }
  const s = AU.ctx.createBufferSource(), gn = AU.ctx.createGain(); s.buffer = AU.buf['v:' + k]; gn.gain.value = vol; s.connect(gn); gn.connect(AU.gain); s.start(); AU.vsrc[who] = s;
}
