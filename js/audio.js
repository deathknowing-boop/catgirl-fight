// ===== 声音（可玩版用）：音效 = WebAudio 解码 sfx_data.js 里的 base64；配乐 = <audio> 循环 =====
const AU = { ctx: null, buf: {}, on: true, bgm: null, last: {} };
function auInit() {          // 浏览器要求先有一次按键 / 点击才能出声，所以第一次输入时才初始化
  if (AU.ctx || typeof SFX_DATA === 'undefined') return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  try { AU.ctx = new AC(); } catch (e) { AU.ctx = null; return; } AU.gain = AU.ctx.createGain(); AU.gain.gain.value = 0.8; AU.gain.connect(AU.ctx.destination);
  for (const k in SFX_DATA) { const bin = atob(SFX_DATA[k]), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); AU.ctx.decodeAudioData(u8.buffer, b => { AU.buf[k] = b; }, () => 0); }
  if (typeof VOX_DATA !== 'undefined') for (const k in VOX_DATA) { const bin = atob(VOX_DATA[k]), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); AU.ctx.decodeAudioData(u8.buffer, b => { AU.buf['v:' + k] = b; }, () => 0); }      // 角色语音（第 30 圈）
  auLoad('core');      // 第 69 圈：音效 / 语音改成按需加载的 m4a（见文件末尾）
  bgmSet(typeof OPT !== 'undefined' ? OPT.bgm : 'office', false);      // 第 68 圈：配乐可切换（opts.js 的 BGMS，按需加载，响度都对齐到 −16 LUFS）
}
function sfx(name, vol = 1) {
  if (AU.ctx && AU.on && !AU.buf[name] && AU.req && AU.req[name]) { (AU.pend = AU.pend || {})[name] = [performance.now(), vol]; return; }      // 第 69 圈：还在下载的（第一下按键的界面音）下载完 0.4 秒内补放
  if (!AU.ctx || !AU.on || !AU.buf[name]) return; const now = AU.ctx.currentTime; if (AU.last[name] != null && now - AU.last[name] < 0.035) return; AU.last[name] = now;
  const s = AU.ctx.createBufferSource(), gn = AU.ctx.createGain(); s.buffer = AU.buf[name]; gn.gain.value = vol; s.connect(gn); gn.connect(AU.gain); s.start(0, (AU.off && AU.off[name]) || 0);
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
  if (!AU.ctx || !AU.on || !AU.buf['v:' + k]) return; AU.vsrc = AU.vsrc || {}; AU.vk = AU.vk || {}; const tn = AU.ctx.currentTime; if (AU.vk[who] && AU.vk[who][0] === k && tn - AU.vk[who][1] < 0.6) return; AU.vk[who] = [k, tn]; const old = AU.vsrc[who]; if (old) { try { old.stop(); } catch (e) {} }      // 第 69 圈：同一句 0.6 秒内不重说（多段超必杀每段都喊「好痛」会结巴）；第 70 圈：修好被注释吞掉的「新的一句打断旧的」
  const s = AU.ctx.createBufferSource(), gn = AU.ctx.createGain(); s.buffer = AU.buf['v:' + k]; gn.gain.value = vol; s.connect(gn); gn.connect(AU.gain); s.start(0, (AU.off && AU.off['v:' + k]) || 0); AU.vsrc[who] = s;
}
// ===== 第 69 圈（音效 / 语音补全）=====
// ① 按需加载：音效 / 语音打成 assets/au/au_<组>.pack.webp（sfx_data.js 的 AU_FILES.packs；core 先加载、more 1.5 秒后后台加载、v_<角色> 角色出场才加载）；包下载失败退回单个 m4a（assets/au/sfx、assets/au/vox）
// ② 解码后记下开头静音长度（AU.off），播放时跳过——AAC 编码器的前置延迟不会让打击音晚半拍
// ③ auEv(s, e)：对局事件的额外音层（超必杀命中、处决拳、算力冲击命中、精防、架招、相杀、饭粒枪、升龙火焰、招牌必杀专属音 + 喊招式名）
// ④ auWatch(s)：每帧看状态变化补事件表里没有的声音（绿冲、算力冲击起手、投技、翻滚、摔地、吃白饭、处决「够不着」、锅砸屏幕、三级演出台词、开场语音）——只读状态，不改模拟
AU.off = AU.off || {}; AU.req = AU.req || {};
function auDec(key, ab) {
  AU.ctx.decodeAudioData(ab, b => {
    const d = b.getChannelData(0); let i = 0; while (i < d.length && Math.abs(d[i]) < 0.004) i++; AU.off[key] = Math.max(0, i - (b.sampleRate * 0.002 | 0)) / b.sampleRate; AU.buf[key] = b;
    const pd = AU.pend && AU.pend[key]; if (pd) { delete AU.pend[key]; if (performance.now() - pd[0] < 400) sfx(key, pd[1]); }
  }, () => 0);
}
function auFetch(key, url) {      // 单个文件（没有打包时的退路）
  if (!AU.ctx || AU.req[key] || AU.buf[key]) return; AU.req[key] = 1;
  fetch(url).then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status)).then(ab => auDec(key, ab)).catch(() => { setTimeout(() => { AU.req[key] = 0; }, 5000); });
}
function auPack(g, fallback) {      // 一个包 = 若干 m4a 首尾相接（AU_FILES.packs[g].idx = [键, 偏移, 长度]），一次下载再切开解码
  const P = typeof AU_FILES !== 'undefined' && AU_FILES.packs && AU_FILES.packs[g]; if (!P || !AU.ctx) return false; if (AU.req['pk:' + g]) return true;
  AU.req['pk:' + g] = 1; P.idx.forEach(([k]) => { AU.req[k] = 1; });
  fetch(P.url).then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status)).then(ab => P.idx.forEach(([k, o, n]) => auDec(k, ab.slice(o, o + n))))
    .catch(() => { P.idx.forEach(([k]) => { AU.req[k] = 0; }); fallback && fallback(); setTimeout(() => { AU.req['pk:' + g] = 0; }, 5000); });
  return true;
}
function auLoad(grp) {
  if (typeof AU_FILES === 'undefined' || !AU.ctx) return; const F = AU_FILES, base = F.base || 'assets/au/', loose = () => (grp === 'core' ? F.core : F.more).forEach(n => auFetch(n, base + 'sfx/' + n + '.m4a'));
  if (!auPack(grp, loose)) loose();
  if (grp === 'core') {
    auNeed('ann'); setTimeout(() => auLoad('more'), 1500);
    try { const c = AU.ctx.createDynamicsCompressor(); c.threshold.value = -10; c.knee.value = 6; c.ratio.value = 8; c.attack.value = 0.002; c.release.value = 0.12; AU.gain.disconnect(); AU.gain.connect(c); c.connect(AU.ctx.destination); AU.comp = c; } catch (e) {}      // 总线限幅：多层打击音 + 语音叠在一起不爆音
  }
}
function auNeed(who) {      // 某个角色的全部语音（第一次出场时调用；重复调用不会重复下载）
  if (typeof AU_VOX === 'undefined' || !AU.ctx || !who || !AU_VOX[who]) return; const base = (typeof AU_FILES !== 'undefined' && AU_FILES.base) || 'assets/au/';
  const loose = () => AU_VOX[who].forEach(k => auFetch('v:' + who + '_' + k, base + 'vox/' + who + '_' + k + '.m4a'));
  if (!auPack('v_' + who, loose)) loose();
}
function voxSoon(k, vol, who, n = 15) {      // 语音还没下载完就等一会儿再放（开场语音用：角色刚出场才开始下载）
  if (!AU.ctx || !AU.on) return; if (AU.buf['v:' + k]) return vox(k, vol, who); if (n > 0 && AU_VOX_HAS(k)) setTimeout(() => voxSoon(k, vol, who, n - 1), 100);
}
function AU_VOX_HAS(k) { const i = k.indexOf('_'), w = k.slice(0, i); return typeof AU_VOX !== 'undefined' && AU_VOX[w] && AU_VOX[w].includes(k.slice(i + 1)); }
const AU_SIG = { popup: 'sig_ds', pounce: 'sig_gem', three: 'sig_gpt', scroll: 'sig_kimi', script: 'sig_glm', alts: 'sig_qwen', counter: 'sig_claude', tea: 'sig_dou', wcannon: 'sig_surf', shuri: 'sig_nin' };      // 招牌必杀（CH[id].sp.id）的专属音；Grok 的一斧有 axe 事件音，不重复
const AU_FIRE = { dp: 1, dpk: 1 }, AU_GRAB = { athrow: 1, grab360: 1, rungrab: 1, phonegrab: 1, snatch: 1, steal: 1 };
function auEv(s, e) {
  if (!AU.ctx || !AU.on || !s || !s.F) return; const F = s.F, P = i => 'p' + i;
  if (e.type === 'hit') {
    if (e.blk) { if (F.some(f => f.st === 'parry')) sfx('parry', 0.9); return; }
    const a = e.who != null ? F[e.who] : null;
    if (e.k === 'exe') sfx('hitexe', 0.9); else if (e.sup) { const tn = AU.ctx.currentTime; sfx('hitsu', tn - (AU.hsT || -9) < 0.6 ? 0.3 : 0.7); AU.hsT = tn; }      // 多段超必杀：第一下最响，连着的几下轻一点
    if (a && a.st === 'impact') sfx('imp_hit', 0.85);
    return;
  }
  if (e.type === 'parry') { sfx('pparry', 0.95); return; }      // 精防（按下架招后 4 步内挨打）
  if (e.type === 'clash') { sfx('pclash', 0.9); return; }      // 飞行道具相杀
  if (e.type === 'exe') { sfx('ctr', 0.8); sfx('thud', 0.7); return; }      // 处决开始
  if (e.type === 'proj') { if (e.k === 'ricegun') { sfx('gun', 0.9); setTimeout(() => sfx('clang', 0.45), 120); } return; }      // 钢盆狙击：开枪 + 盆被后坐力震下来「咣」
  if (e.type === 'sp' && e.who != null) {
    const f = F[e.who]; if (!f) return;
    if (AU_FIRE[e.id]) sfx('fire', 0.75); if (AU_GRAB[e.id]) sfx('grab', 0.9);
    if (f.ch && f.ch.sp && f.ch.sp.id === e.id) {      // 招牌必杀：专属音 + 喊招式名（比 play.js 随机的短喊晚一点点，盖过它）
      if (AU_SIG[e.id]) sfx(AU_SIG[e.id], 0.8);
      const k = f.id + '_sp'; AU.spT = AU.spT || {}; const now = AU.ctx.currentTime; if (!(AU.spT[e.who] > now - 2.5)) { AU.spT[e.who] = now; setTimeout(() => vox(k, 1, P(e.who)), 30); }
    }
  }
}
function auWatch(s) {
  if (!AU.ctx || !s || !s.F) return; let W = AU.w;
  if (!W || W.s !== s) { W = AU.w = { s, st: s.F.map(f => f.st), mv: s.F.map(f => f.mv), intro: 0, exe: -1, pan: null, panS: 0, cine: -1 }; s.F.forEach(f => auNeed(f.id)); }
  if (!AU.on) return;
  if (!W.intro && s.phase === 'intro') { W.intro = 1; if ((s.round || 1) === 1) { const a = s.F[0].id, b = s.F[1].id; voxSoon(a + '_in', 1, 'p0'); setTimeout(() => voxSoon(b + '_in', 1, 'p1'), 1500); } }      // 开场语音：每场第一局，左边先说
  s.F.forEach((f, i) => {
    const p = W.st[i];
    if (f.st !== p) {
      if (f.st === 'drush') sfx('drush', 0.9);      // 绿冲
      else if (f.st === 'impact') sfx('imp_wind', 0.9);      // 算力冲击起手
      else if (f.st === 'throw') sfx('grab', 0.9);      // 投技抓住
      else if (f.st === 'roll') sfx('roll', 0.7);
      if (p === 'held' && f.st !== 'held') sfx('slam', 0.9);      // 被投出去落地
    }
    if (f.st === 'sp' && f.mv && f.mv !== W.mv[i] && f.mv.id === 'rice') { sfx('eat', 0.9); vox(f.id + '_eat', 1, 'p' + i); }      // 大肥鱼 吃白饭
    W.st[i] = f.st; W.mv[i] = f.mv;
  });
  if (s.exe) { const t = s.exe.t; if (W.exe < 18 && t >= 18) vox(s.F[s.exe.l].id + '_reach', 1, 'p' + s.exe.l); W.exe = t; } else W.exe = -1;      // 处决：被按住头「够不着！」（meme_ds.js 定格 14 步后 4 步出气泡）
  if (s._pan && s._pan !== W.pan) { W.pan = s._pan; W.panS = 0; }      // 锅砸屏幕（meme_ds.js 的 PAN：飞 14 步砸上屏幕）
  if (W.pan) { const u = s.f - W.pan.f0, who = W.pan.who;
    if (W.panS === 0 && u >= 0) { sfx('whoosh2', 0.9); W.panS = 1; }
    if (W.panS === 1 && u >= 14) { sfx('glass', 1); W.panS = 2; }
    if (W.panS === 2 && u >= 24) { vox(s.F[who].id + '_tok', 1, 'p' + who); W.panS = 3; }
    if (!s._pan && W.panS >= 3) W.pan = null; }
  if (s.cine) { const c = s.cine, t = c.t, E = c.live && typeof LIVE3 !== 'undefined' ? LIVE3.E : typeof CB !== 'undefined' ? CB.E : 242, id = s.F[c.who].id;      // 三级演出：落版时说台词，终结版说终结词
    if (c.fin && W.cine < E + 2 && t >= E + 2) vox(id + '_ck', 1, 'p' + c.who);
    if (!c.fin && W.cine < E + 10 && t >= E + 10) vox(id + '_cl', 1, 'p' + c.who);
    W.cine = t; } else W.cine = -1;
}
