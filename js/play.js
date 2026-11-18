// ===== 可玩版：标题 → 选人 → 三关（每关三局两胜，第三关是守饭的头目）→ 结局 =====
function startPlay() {
  const now = () => performance.now() / 1000, keys = {}, latch = {};
  const MAP = { KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', KeyW: 'u', ArrowUp: 'u', KeyJ: 'a', KeyK: 'lk', KeyU: 'hp', KeyI: 'hk', KeyL: 'dv', KeyY: 'tn', KeyO: 's', Semicolon: 'x', KeyH: 'x', KeyS: 'dn', ArrowDown: 'dn', Space: 'rl', ShiftLeft: 'rl', ShiftRight: 'rl' };
  const OLDAI = new URLSearchParams(location.search).get('oldai') === '1';      // 第 43 圈：人机对战默认用「手柄电脑」（会用全部新招 / Drive / 超必杀，难度 1–8）；?oldai=1 退回老电脑
  const G = { diff: typeof optDiff === 'function' ? optDiff().base : 3,      /* 第 68 圈：难度改成四档（opts.js 的 DIFFS），默认「普通」= 旧 3 级，比原来的 4 低一档 */ p1: 'ds', opp: ['gpt', 'grok', 'gem'], stageNo: 1, wins: [0, 0], round: 1, sim: null, evN: 0, pause: false, skin1: 'q', skin2: 'q' };      // skin：'q' Q 版 / 'a' 成年版（选人时 Tab 切自己、R 切电脑）
  if (typeof POST !== 'undefined' && !window.CF_LOWFX && new URLSearchParams(location.search).get('post') !== '0') POST.init();
  window.CF_G = G; let sc = 'title', t0 = now(), S = {}, press = [], last = now(), wipeT = -9;
  const go = (name, st = {}) => { sc = name; t0 = now(); S = st; wipeT = now(); };
  const ok = () => press.some(c => c === 'Enter' || c === 'NumpadEnter' || c === 'KeyJ');
  const once = (key, cond, fn) => { if (!S[key] && cond) { S[key] = 1; fn(); } };
  addEventListener('keydown', e => { const m = MAP[e.code]; if (m || e.code === 'Enter' || e.code === 'ArrowDown' || e.code === 'Tab') e.preventDefault(); if (e.repeat) return; auInit(); bgmPlay(); if ((sc === 'title' || sc === 'select' || (sc === 'fight' && G.pause)) && typeof optKey === 'function' && optKey(e.code)) { G.diff = optDiff().base; return; }      /* 第 68 圈：B 切歌 / N 难度 / C 冷却 */ if (m) { keys[m] = true; latch[m] = true; } press.push(e.code); if (e.code === 'KeyM') auToggle(); if (e.code === 'KeyG' && typeof POST !== 'undefined') POST.toggle(); });
  addEventListener('keyup', e => { const m = MAP[e.code]; if (m) keys[m] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  cv.addEventListener('pointerdown', e => { auInit(); bgmPlay(); cv.focus(); const R = cv.getBoundingClientRect(), x = (e.clientX - R.left) * 1920 / R.width, y = (e.clientY - R.top) * 1080 / R.height; if ((sc === 'title' || sc === 'select' || (sc === 'fight' && G.pause)) && typeof optClick === 'function' && optClick(x, y)) { G.diff = optDiff().base; return; } press.push('Enter'); });      // 第 68 圈：点设置条切换
  // 第 65 圈（用户反馈：打完 3 场就结束了）：完整街机模式 = 8 场常规（第 5 场是宿敌战，赛前有对话）+ 第 9 场最终头目（吃饱了的本体，选大肥鱼时换成哈基米本体）→ 通关结局 / STAFF / 成绩
  const NST = () => G.opp.length, isBoss = () => G.stageNo === NST() && NST() > 3, isRival = () => G.rivalNo === G.stageNo;
  const stageOf = () => isBoss() ? 'rooftop' : (typeof OPT !== 'undefined' && OPT.stage && OPT.stage !== 'auto' && STAGES[OPT.stage]) ? OPT.stage : G.stageNo === NST() ? 'office' : HOME[G.opp[G.stageNo - 1]];      // 第 68 圈：V 键选舞台
  const padLv = () => Math.max(1, Math.min(8, G.diff - 1 + Math.floor((G.stageNo - 1) / 3) + (isBoss() ? 1 : 0)));
  // 第 30 圈：命中音效分层（轻 / 中 / 重 / COUNTER / PUNISH COUNTER / 撞墙 / 地面反弹）
  function hitLayers(s, e) {
    if (e.type === 'hit' && !e.blk) { const L = e.sup ? 3 : e.lvl || 1; sfx('thud', [0.16, 0.32, 0.55][L - 1]); if (e.k === 'heavy' || e.sup || L >= 2) sfx('skid', 0.5 + 0.1 * L); if (e.ctr) sfx('ctr', 0.85); if (e.pc) { sfx('ctr', 1); sfx('smash', 0.55); sfx('thud', 0.85); } }
    if (e.type === 'wallbounce') { sfx('smash', 0.75); sfx('thud', 0.8); } if (e.type === 'gbounce') { sfx('thud', 0.75); sfx('land', 0.8); }
  }
  // 角色语音：受击短音、出必杀喊一声、超必杀喊招式名、K.O.、胜利、回合开场和开打的解说
  function voiceFor(s, e) {
    const id = i => s.F[i] && s.F[i].id, pick = a => a[(s.f + a.length) % a.length]; G.vT = G.vT || [-99, -99];
    if (e.type === 'hit' && !e.blk && e.who != null) { const d = 1 - e.who, L = e.sup ? 3 : e.lvl || 1; if (s.F[d].hp > 0 && (L >= 2 || s.f - G.vT[d] > 26)) { vox(id(d) + '_h' + Math.min(3, L + (e.pc ? 1 : 0)), 0.9, 'p' + d); G.vT[d] = s.f; } }
    if (e.type === 'sp' && e.who != null && (s.f + e.who) % 5 < 3) vox(id(e.who) + '_' + pick(['k1', 'k2', 'k3']), 0.85, 'p' + e.who);
    if (e.type === 'su' && e.who != null) vox(id(e.who) + '_su' + Math.min(3, (s.fz && s.fz.lv) || 1), 1, 'p' + e.who);
    if (e.type === 'ko') { const l = e.winner === 0 ? 1 : 0; vox(id(l) + '_ko', 1, 'p' + l); setTimeout(() => vox('ann_ko', 1, 'ann'), 380); }
    if (e.type === 'win' && e.winner >= 0) { setTimeout(() => vox(id(e.winner) + '_win', 1, 'p' + e.winner), 300); if (e.perfect) setTimeout(() => vox('ann_perfect', 1, 'ann'), 1200); }
    if (e.type === 'fight') vox('ann_fight', 1, 'ann');
    if (e.type === 'taunt' && e.who != null) vox(id(e.who) + '_tn', 1, 'p' + e.who);      // 第 58 圈：挑衅语音（拟声为主）
  }
  function mkRec(o) { G.rec = { o: JSON.parse(JSON.stringify(o)), ins: [], sk: {}, koI: -1 }; return new Sim(o); }      // 第 56 圈：精彩回放——记下开局参数和每一步的按键（对局是确定性的，回放 = 同参数重算一遍）
  function newRound() { if (window.QLAZY && G.opp[G.stageNo]) QLAZY.load(G.opp[G.stageNo]); const fin = G.wins[0] === 1 && G.wins[1] === 1; G.sim = mkRec({ p1: G.p1, p2: G.opp[G.stageNo - 1], skins: [sk1(), sk2()], seed: (Math.random() * 1e9) | 0, stage: stageOf(), round: G.round, wins: G.wins, ctrl: OLDAI ? ['human', 'ai'] : ['human', 'human'], pad: OLDAI ? null : [0, padLv()], level: [1, Math.min(0.95, 0.35 + 0.075 * G.stageNo)], cdm: typeof OPT !== 'undefined' ? OPT.cd : null, final: fin, cheer: [fin, false], boss: isBoss() ? [false, true] : null }); G.evN = 0; vox(G.wins[0] === 1 && G.wins[1] === 1 ? 'ann_r3' : G.round === 2 ? 'ann_r2' : 'ann_r1', 1, 'ann'); }
  const sk1 = () => G.skin1 === 'a' && hasAdult(G.p1) ? 'a' : 'q', sk2 = () => (G.skin2 === 'a' || (G.intrude && G.intrude === G.stageNo)) && hasAdult(G.opp[G.stageNo - 1]) ? 'a' : 'q';      // 第 67 圈 C：乱入的客串固定用成年版（成年形态要好找）
  const adReady = () => [[G.p1, sk1()], [G.opp[G.stageNo - 1], sk2()]].every(([id, k]) => (!window.QLAZY || QLAZY.ready(id)) && (typeof guestReady === 'undefined' || guestReady(id)) && (k !== 'a' || (ADL[id] && ADL[id].n && ADL[id].done >= ADL[id].n && META.spr['fa_' + id + '_stance'])));      // 客串的 Q 版帧在后台加载（guest_meta.js）
  function newTrain() { G.TR = trainNew(); G.wins = [0, 0]; G.round = 1; G.evN = 0; G.acc = 0; G.sim = new Sim({ p1: G.p1, p2: G.opp[0], skins: [sk1(), sk2()], seed: 7, stage: HOME[G.opp[0]], round: 1, wins: [0, 0], ctrl: ['human', 'human'], intro: 1, cdm: typeof OPT !== 'undefined' ? OPT.cd : null }); for (let i = 0; i < 4; i++) G.sim.tick([{}, {}]); trKeys(G.TR, 'Digit0', G.sim); }
  function startMatch() { if (sk1() === 'a') loadAdult(G.p1); if (sk2() === 'a') loadAdult(G.opp[G.stageNo - 1]); G.wins = [0, 0]; G.round = 1; go('vs'); }
  function step(t, dt) {
    if (sc === 'title') {
      drawTitle(t, { coinT: S.coinT, play: true }); if (typeof drawOptBar === 'function') drawOptBar(960, 88); if (S.coinT == null && ok()) { S.coinT = t + 0.45; G.mode = 'arcade'; } if (S.coinT == null && press.includes('KeyT')) { S.coinT = t + 0.45; G.mode = 'train'; }      // 第 38 圈：T 进训练模式
      txt('T  训练模式（帧数据 / 判定框 / 录制回放）', 960, 1066, { size: 24, w: 800, fill: '#DFF4FF', stroke: '#0B1020', sw: 6, align: 'center', a: 0.85 });
      once('snd', S.coinT != null && t >= S.coinT, () => sfx('coin')); if (S.coinT != null && t > S.coinT + 1.1) return go('select', { cur: ORDER.indexOf(G.p1), t1: 0, hop: 0 });
    } else if (sc === 'select') {
      if (S.lock1 == null) {
        let c = S.cur; for (const k of press) c = selNav(c, k);      // 第 67 圈：网格人数可变（selui.js）
        if (c !== S.cur) { S.cur = c; S.t1 = t; sfx('cursor'); }
        for (const k of press) { const m = /^(?:Digit|Numpad)([1-4])$/.exec(k); if (m && typeof DIFFS !== 'undefined') { OPT.diff = DIFFS[+m[1] - 1].id; optSave(); G.diff = optDiff().base; sfx('cursor'); } }      // 第 68 圈：数字键 1–4 = 简单 / 普通 / 困难 / 地狱      // 第 43 圈：数字键 1–8 选难度
        if (press.includes('Tab') && hasAdult(ORDER[S.cur])) { G.skin1 = G.skin1 === 'a' ? 'q' : 'a'; sfx('cursor'); } if (press.includes('KeyR')) { G.skin2 = G.skin2 === 'a' ? 'q' : 'a'; sfx('cursor'); }      // 成年版切换
        if (window.QLAZY) QLAZY.load(ORDER[S.cur]); if (G.skin1 === 'a' && hasAdult(ORDER[S.cur])) loadAdult(ORDER[S.cur]);
        if (ok() && t > 0.2) { S.lock1 = t; G.p1 = ORDER[S.cur]; sfx('confirm'); loadLazy('arc'); const boss = G.p1 === 'ds' ? 'gem' : 'ds', rv = RIVAL[G.p1], GS = typeof GUEST_IDS !== 'undefined' ? GUEST_IDS : [], rest = ORDER.filter(x => x !== G.p1 && x !== rv && !GS.includes(x)).sort(() => Math.random() - 0.5); G.opp = [...rest.slice(0, 4), rv, ...rest.slice(4, 7), boss]; G.intrude = 0; { const gs = ORDER.filter(x => GS.includes(x) && x !== G.p1 && x !== rv); if (gs.length && G.opp.length > 7) { G.opp.splice(G.opp.length - 2, 1, gs[Math.floor(Math.random() * gs.length)]); G.intrude = G.opp.length - 1; } } /* 第 67 圈：客串不占普通关，第 8 关换成客串乱入（G.intrude = 关号）；选客串的人宿敌就是另一位客串 */ if (window.QLAZY) QLAZY.load(G.opp[0]); G.rivalNo = 5; G.stageNo = 1; G.score = 0; G.tStart = now(); G.cont = 0; }
      } else if (S.lock2 == null && G.mode === 'train') {      // 训练模式：自己挑木桩
        if (S.cur2 == null) { S.cur2 = (S.cur + 1) % ORDER.length; S.t2 = t; } let c = S.cur2; for (const k of press) c = selNav(c, k);      // 第 67 圈：网格人数可变（selui.js）
        if (c !== S.cur2) { S.cur2 = c; S.t2 = t; sfx('cursor'); } S.p2 = ORDER[S.cur2]; if (window.QLAZY) QLAZY.load(S.p2); if (press.includes('KeyR')) { G.skin2 = G.skin2 === 'a' ? 'q' : 'a'; sfx('cursor'); } if (G.skin2 === 'a' && hasAdult(S.p2)) loadAdult(S.p2);
        if (ok() && t > S.lock1 + 0.3) { S.lock2 = t + 0.1; G.opp = [S.p2, S.p2, S.p2]; G.stageNo = 1; }
      } else if (S.lock2 == null) {         // 电脑的光标转一圈，停在第一关的对手上
        const n = Math.min(12, Math.floor((t - S.lock1 - 0.45) / 0.09)); if (n > S.hop) { S.hop = n; const pool = ORDER.filter(x => x !== G.p1); S.p2 = n === 12 ? G.opp[0] : pool[(n * 5) % pool.length]; S.t2 = t; sfx('cursor'); if (n === 12) S.lock2 = t + 0.3; }
      } else { once('snd2', t >= S.lock2, () => sfx('confirm')); if (sk2() === 'a') loadAdult(G.opp[0]); if (t > S.lock2 + 1.1 && adReady()) { if (!/[?&]stagesel=0/.test(location.search) && typeof drawStageSel === 'function' && typeof stageList === 'function') return go('stage'); if (G.mode === 'train') { newTrain(); return go('fight'); } return startMatch(); } }      // 第 79 圈：选完人先进舞台选择（?stagesel=0 跳过）
      drawSelect(t, { skin1: hasAdult(ORDER[S.cur]) ? G.skin1 : 'q', skin2: S.p2 && hasAdult(S.p2) ? G.skin2 : 'q', p1: ORDER[S.cur], t1: S.t1, lock1: S.lock1, p2: S.p2, t2: S.t2, lock2: S.lock2, play: true, stageNo: S.lock1 != null ? 1 : 0 });
      if (typeof drawOptBar === 'function') drawOptBar(1060, 36, { size: 21 });      // 第 68 圈：配乐 / 难度 / 冷却设置条（原来右下角的「电脑难度 n」文字压在出招表上）
    } else if (sc === 'stage') {      // 第 79 圈：舞台选择（P5 拼贴卡片）：←→ / ↑↓ 选，J 决定，6 秒自动决定；选的舞台写进 OPT.stage（和 V 键同一个设置）
      const L = stageList(); if (S.i == null) { S.i = Math.max(0, L.findIndex(x => x.id === OPT.stage)); S.ti = t; }
      if (S.lock == null) { for (const k of press) { const d = (k === 'ArrowLeft' || k === 'KeyA') ? -1 : (k === 'ArrowRight' || k === 'KeyD') ? 1 : (k === 'ArrowUp' || k === 'KeyW') ? -2 : (k === 'ArrowDown' || k === 'KeyS') ? 2 : 0; if (d) { S.i = (S.i + d + L.length * 2) % L.length; S.ti = t; sfx('cursor'); } } if ((ok() && t > 0.3) || t > 6) { S.lock = t; OPT.stage = L[S.i].id; optSave(); sfx('confirm'); } }
      else if (t > S.lock + 0.75 && adReady()) { if (G.mode === 'train') { newTrain(); return go('fight'); } return startMatch(); }
      drawStageSel(t, { L, i: S.i, ti: S.ti, lock: S.lock, p1: G.p1, p2: G.opp[0] });
    } else if (sc === 'vs') {
      drawVS(t, { p1: G.p1, p2: G.opp[G.stageNo - 1], stage: stageOf(), stageNo: G.stageNo, final: G.stageNo === NST(), busy0: 1.5, busy1: 2.7 }); vsExtra(t, { p1: G.p1, p2: G.opp[G.stageNo - 1], stageNo: G.stageNo, total: NST(), rival: isRival() && G.mode !== 'vs1', boss: isBoss(), intrude: G.intrude === G.stageNo && G.mode !== 'vs1' });
      const vsLen = isRival() || isBoss() || G.intrude === G.stageNo ? 6.2 : 3.3; if (G.intrude === G.stageNo) once('s4', t >= 1.6, () => { sfx('smash', 0.7); sfx('ctr', 0.8); }); once('s1', t >= 0.38, () => sfx('vs')); once('s2', t >= 1.5, () => sfx('popup')); if (isBoss()) once('s3', t >= 2.2, () => { sfx('smash', 0.8); vox('ann_ko', 0.6, 'ann'); }); if ((t >= vsLen || (t > 0.6 && ok())) && adReady()) { newRound(); return go('fight'); }
    } else if (sc === 'fight') {
      const s = G.sim, inp = Object.assign({}, keys);
      if (press.includes('Tab') || press.includes('Escape') || press.includes('KeyP')) G.pause = !G.pause;      // Tab / Esc 暂停 + 出招表
      if (G.hold) { drawFight(s, { hints: true }); return; }
      if (s.exe && press.some(c => c === 'Enter' || c === 'NumpadEnter')) s.exe.skip = 1;      // D 代理：处决演出 Enter 跳过
      if (s.cine && press.some(c => c === 'Enter' || c === 'NumpadEnter')) {s.cine.t = Math.max(s.cine.t, s.cine.len - 40); if (G.rec) G.rec.sk[G.rec.ins.length] = 1; }      // 演出中 Enter 跳过      // 测试用：外部脚本自己一步步推进
      if (G.pause) { for (const k in latch) delete latch[k]; drawFight(s, { hints: true }); drawMoveList(s.F[0].ch); if (typeof drawOptBar === 'function') drawOptBar(960, 1044, { size: 20 }); return; }
      for (const k in latch) { inp[k] = true; delete latch[k]; }
      if (G.mode === 'train') { for (const c of press) trKeys(G.TR, c, s); if (press.includes('Backspace')) { G.mode = 'arcade'; return go('title'); } s.acc += Math.min(4, dt * 60) * s.ts; while (s.acc >= 1 - 1e-9) { const ii = trInputs(G.TR, s, inp); trPre(G.TR, s); s.tick(ii); trPost(G.TR, s, inp); s.acc -= 1; } } else
      { const R = G.rec; s.acc += Math.min(4, dt * 60) * s.ts; while (s.acc >= 1 - 1e-9) { if (R && R.ins.length < 30000) R.ins.push(Object.assign({}, inp)); s.tick([inp, null]); if (R && R.koI < 0 && (s.phase === 'ko' || s.exe)) R.koI = R.ins.length; s.acc -= 1; } }      // 和 s.advance 完全一样，只是顺手记录
      for (; G.evN < s.ev.length; G.evN++) { const e = s.ev[G.evN], n = evSfx(e); if (typeof auEv === 'function') auEv(s, e); if (e.type === 'hit' && e.blk) { sfx('guard'); continue; } if (n) sfx(n); hitLayers(s, e); voiceFor(s, e); }      // 第 30 圈：每一击三层（挥空风声已在出手时放 + 命中声 + 低频冲击），加角色语音      // 防御 = 清脆的「叮」；重击叠一层低频「咚」+ 擦地；COUNTER 有提示音
      if (typeof auWatch === 'function') auWatch(s);      // 第 69 圈：事件表里没有的声音（绿冲 / 算力冲击 / 投技 / 梗招 / 三级演出台词 / 开场语音）按状态变化补，只读不改
      if (s.cine) { const ct = s.cine.t; if (G.cineT !== ct) { for (let q = (G.cineT ?? -1) + 1; q <= ct; q++) { const n = s.cine.live && typeof LIVE3 !== 'undefined' ? LIVE3.sfx(q) : cineSfx(q); if (n) n.forEach(([k, v]) => sfx(k, v)); } G.cineT = ct; } } else G.cineT = null;      // 三级演出的音效按演出时间表打点
      drawFight(s, { hints: G.mode !== 'train' }); if (G.mode === 'train') { drawTrain(G.TR, s); return; }
      if (!G.keyHint && s.phase === 'fight') G.keyHint = now(); const kh = G.keyHint ? now() - G.keyHint : 99; if (kh < 5) keyCard(Math.min(1, (5 - kh) / 0.5));      // 第一场开打时，按键提示停 5 秒
      if (s.done) { G.wins = s.wins.slice(); if (G.wins[0] >= 2 || G.wins[1] >= 2) return G.rec && G.rec.koI > 30 && QS.get('replay') !== '0' ? go('replay', { win: G.wins[0] >= 2, rec: G.rec }) : go('over', { win: G.wins[0] >= 2 }); G.round++; newRound(); }
    } else if (sc === 'replay') {      // 第 56 圈（SF6_REF 第 7 项）：本局精彩回放——最后一套连段慢放，K.O. 那一下黑白高反差定格 + 墨迹 + 竖排书法字；任意确认键跳过
      const R = S.rec, rt = () => { if (R.sk[S.i] && S.R.cine) S.R.cine.t = Math.max(S.R.cine.t, S.R.cine.len - 40); S.R.tick([R.ins[S.i] || {}, null]); S.i++; };
      if (!S.R) { S.R = G.rsim = new Sim(JSON.parse(JSON.stringify(R.o))); S.i = 0; const st = Math.max(0, R.koI - 170); while (S.i < st) rt(); S.end = Math.min(R.ins.length, R.koI + 80); S.acc = 0; S.fz = 0; S.evN = S.R.ev.length; S.R._noKO = 1; }
      if (t > 0.4 && press.some(c => c === 'Enter' || c === 'NumpadEnter' || c === 'Escape')) return go('over', { win: S.win });
      if (S.i >= R.koI + 6 && S.fz < 66) S.fz++; else { if (S.fz >= 66) S.fz++; const sp = S.i >= R.koI - 24 && S.i < R.koI ? 0.22 : 0.5; S.acc += Math.min(4, dt * 60) * sp; while (S.acc >= 1 && S.i < S.end) { rt(); S.acc -= 1; } }
      for (; S.evN < S.R.ev.length; S.evN++) { const n = evSfx(S.R.ev[S.evN]); if (n) sfx(n, 0.55); }
      once('rpk', S.fz === 1, () => sfx('smash', 0.8));
      if (S.fz > 0) S.R.flash = 0; drawFight(S.R, { noHud: true }); drawReplay(S.R, t, S.fz, S.win ? 0 : 1);
      if (S.i >= S.end && S.fz >= 66) return go('over', { win: S.win });
    } else if (sc === 'over') {
      drawFight(G.sim, { noHud: true }); drawMatchOver(t, { win: S.win, stageNo: G.stageNo, total: NST(), last: G.stageNo === NST(), n: 9 - Math.floor(t), winner: S.win ? G.p1 : G.opp[G.stageNo - 1], wskin: S.win ? sk1() : sk2() });
      if (S.win) { once('sc', true, () => { const f = G.sim.F[0]; S.add = 10000 + Math.round(f.hp / f.hpMax * 20000) + (f.perfect ? 30000 : 0) + Math.ceil(G.sim.timer / 60) * 100; if (isBoss()) S.add *= 2; G.score += S.add; }); if (t > 0.5 && ok()) { if (G.stageNo === NST()) { sfx('win'); G.clearT = now() - G.tStart; return go('ending'); } G.stageNo++; return startMatch(); } }
      else { if (t > 0.5 && ok()) { sfx('coin'); G.cont++; G.score = Math.floor(G.score / 2); return startMatch(); } if (t >= 10) return go('title'); }
    } else if (sc === 'ending') {
      if (G.opp.length <= 3 || !CLEAR[G.p1]) { drawEnding(t, { win: G.p1, thief: G.p1 === 'gem' ? 'ds' : 'gem', rev: 4.2, play: true }); once('pop', t >= 4.2, () => { sfx('pop'); sfx('smash', 0.5); }); if (t > 5.6 && ok()) return go('title'); }
      else { drawClear(t, { p1: G.p1, skin: sk1(), score: G.score, time: G.clearT, cont: G.cont, diff: G.diff }); once('w1', t >= 0.2, () => vox(G.p1 + '_win', 1, 'p0')); if (t > 1 && ok()) { if (t < CLEAR_LEN - 1) t0 -= Math.max(0, Math.ceil((t + 0.01) / 7) * 7 - t); else return go('title'); } }
    }
  }
  const PW = { ema: 1 / 60, low: 0, lv: 0, msgT: 0, msg: '' }, PW_OFF = /[?&]auto=0/.test(location.search);      // 第 76 圈：低端机自动降画质（对战中连续约 4 秒低于 44 帧：先关 WebGL 后处理，再关背景视差 / 近景层）；?auto=0 关
  function perfWatch(dt) {
    if (PW_OFF || sc !== 'fight' || dt <= 0 || dt >= 0.1) { if (sc !== 'fight') PW.low = 0; } else { PW.ema += (dt - PW.ema) * 0.05; PW.low = PW.ema > 1 / 44 ? PW.low + dt : Math.max(0, PW.low - dt * 0.5);
      if (PW.low > 4 && PW.lv < 2) { PW.low = 0; PW.ema = 1 / 60; PW.lv++; if (PW.lv === 1 && typeof POST !== 'undefined' && POST.on) { POST.toggle(); PW.msg = '帧率偏低：已自动关闭后处理'; } else { PW.lv = 2; if (typeof PAR_OFF !== 'undefined') PAR_OFF = true; PW.msg = '帧率偏低：已自动简化背景'; } PW.msgT = 3; } }
    if (PW.msgT > 0) { PW.msgT -= dt; txt(PW.msg, 1890, 1040, { size: 22, w: 700, fill: '#FFE066', align: 'right', a: Math.min(1, PW.msgT), sh: ['rgba(0,0,30,0.9)', 6, 0, 1] }); }
  }
  function frame() { const tn = now(), dt = Math.min(0.1, tn - last); last = tn; step(tn - t0, dt); wipe(1 + (tn - wipeT) / 0.3); if (!AU.on) txt('已静音（M）', 1890, 1068, { size: 20, w: 700, fill: 'rgba(255,255,255,0.7)', align: 'right' }); perfWatch(dt); if (typeof POST !== 'undefined') POST.frame(sc === 'fight' || sc === 'over' ? G.sim : sc === 'replay' && !(S.fz > 0 && S.fz < 66) ? G.rsim : null); press = []; requestAnimationFrame(frame); }      // 第 32 圈：WebGL 后处理（没有 WebGL 就是纯 2D）
  function cineSfx(q) {
    if (q === 1) return [['hit3', 1]]; if (q === 12) return [['whoosh2', 1]]; if (q === CB.A + 6) return [['su', 0.8]];
    for (let i = 0; i < CHITS; i++) if (q === cineHitT(i)) return [[i % 3 === 2 ? 'hit3' : 'hit2', 1], ['thud', 0.4]];
    if (q === CB.C + 6) return [['smash', 0.8]]; if (q === CB.C + 12) return [['charge', 0.8]]; if (q === CB.C + 30) return [['hit3', 1], ['thud', 0.7], ['smash', 0.6]]; if (q === CB.E + 2) return [['confirm', 0.7]]; if (q === CB.R) return [['whoosh2', 0.8]];
    return null;
  }
  function keyCard(a) {
    g.save(); g.globalAlpha = a * 0.82; g.fillStyle = '#0B1020'; g.fillRect(360, 790, 1200, 200); g.restore();
    const L = [['J 轻拳', 'K 轻脚', 'U 重拳', 'I 重脚'], ['J+K 投', 'U+I 算力冲击', '两拳 / 两脚 = EX', 'L 架招'], ['O 一键必杀', '; 或 H 一键超必杀', '空格 翻滚 · Y 挑衅', 'Tab / Esc 出招表']];
    L.forEach((row, r) => row.forEach((c, i) => txt(c, 510 + i * 300, 850 + r * 56, { size: 30, w: 900, fill: r ? '#DFF4FF' : '#FFE066', stroke: '#0B1020', sw: 6, align: 'center', a })));
  }
  window.GAME = { G, scene: () => sc, go, newRound, st: () => S }; requestAnimationFrame(frame);
}
