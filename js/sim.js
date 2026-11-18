// ===== 对战逻辑：固定 60 步/秒，纯逻辑，不碰画布。浏览器和 node 通用（node 里用来批量模拟挑对局）=====
(function (root) {
  const D = (typeof module !== 'undefined') ? require('./data.js') : root;
  const CH = D.CH;
  const JG = 1.83, JV = { full: 2800, short: 2000, sup: 3150, wall: 1700 }, HJ = s => !s.v1 && s.ctrl.includes('human');      // 第 75 圈（用户：跳得矮）：人参与的对局跳更高更快（滞空约 42 / 31 / 47 步，最高点约 470 / 260 / 600）；电脑对电脑和成片 v1 走旧数值
  const DT = 1 / 60, GRAV = 4200, WORLD_W = 2100, XMIN = 235, XMAX = 1865, INTRO = 150, DMG = 1.42, DMAX = 1500;
  const SU_INVUL = { wave: 32, flash: 72, beam: 70, revenge: 22, drop: 38, lock: 52, rain: 26, fix: 20, style: 38 };   // 超必杀出手前不会被打断
  const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
  function mkRng(seed) { let s = seed >>> 0; return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // 普通攻击：su 前摇 / ac 判定 / rc 收招（单位：步）；x0..x1 判定框前伸范围，y0..y1 离地高度
  const ATK = {
    light: { su: 5, ac: 4, rc: 10, x0: 10, x1: 195, y0: 70, y1: 330, dmg: 40, stun: 19, bstun: 9, kb: 280, stop: 6, sep: 235 },                       // 直拳
    light2: { su: 5, ac: 4, rc: 12, x0: 10, x1: 200, y0: 90, y1: 400, dmg: 46, stun: 21, bstun: 10, kb: 200, stop: 7, sep: 212 },                    // 上勾拳
    light3: { su: 7, ac: 4, rc: 16, x0: 10, x1: 225, y0: 70, y1: 340, dmg: 58, bstun: 12, kb: 560, launch: 820, stop: 9, sep: 262 },                 // 侧踢，踢飞
    heavy: { su: 12, ac: 5, rc: 20, x0: 10, x1: 235, y0: 50, y1: 370, dmg: 92, bstun: 15, kb: 600, launch: 1000, stop: 11, shake: 13, sep: 262 },    // 重击
    air: { su: 4, ac: 16, rc: 0, x0: 0, x1: 185, y0: -60, y1: 250, dmg: 62, stun: 22, bstun: 12, kb: 320, stop: 7 },                       // 飞踢
  };

  const AK = 1.4, AKX = 1.2, AKY = 1.35;      // 成年版（skin 'a'）：画面身高 ×1.4，攻击判定横向 ×1.2、纵向 ×1.35，受击框按身高放大；Q 版数值一个字不动
  function mkFighter(idx, id, skin) {
    const ch = skin === 'a' ? Object.assign({}, CH[id], { h: Math.round(CH[id].h * AK) }) : CH[id];
    return { idx, id, ch, x: idx ? 1400 : 700, y: 0, vx: 0, vy: 0, face: idx ? -1 : 1, st: 'intro', t: 0, hp: ch.hp, hpMax: ch.hp, trail: ch.hp, meter: 0, cd: 0, dashCd: 0,
      chain: 0, swing: 0, hitDone: {}, hitOK: false, buf: null, stun: 0, invul: 0, combo: 0, comboDmg: 0, comboF: -999, juggle: 0, slow: 0, dmgTaken: 0, cheered: false, meterFill: 0,
      box: null, counter: false, holdBack: false, flash: 0, airAtk: 0, airT: 0, in: {}, prev: {}, mv: null, stk: null, stkT: 0, walkT: 0, landT: 99, lastDmgF: -999, perfect: true,
      ai: { act: 'idle', until: 0, th: false, roll: false, q: null, chained: -1 } };
  }
  let MX = null;      // D 代理：大肥鱼梗招挂钩（js/meme_ds.js 装上；没装时全部跳过）
  const DIRK = { l: 1, r: 1, u: 1, dn: 1 };      // 方向不进顿帧里的按键缓存（方向已经单独记在 me.dirs）
  class Sim {
    constructor(o) {
      this.o = o; this.f = 0; this.rng = mkRng(o.seed ?? 1); this.stage = o.stage ?? 'office'; this.round = o.round ?? 1; this.wins = (o.wins ?? [0, 0]).slice();
      this.F = [mkFighter(0, o.p1, o.skins && o.skins[0]), mkFighter(1, o.p2, o.skins && o.skins[1])]; for (const f of this.F) if (o.skins && o.skins[f.idx] === 'a') f.skin = 'a'; this.adult = this.F.some(f => f.skin === 'a'); this.P = []; this.E = []; this.fx = []; this.ev = [];
      this.phase = 'intro'; this.pt = 0; this.timer = 99 * 60; this.freeze = 0; this.fz = null; this.hitstop = 0; this.shake = 0; this.flash = 0; this.styleT = 0; this.cheerT = 0; this.cheerWho = -1;
      this.ts = 1; this.winner = -1; this.cam = { x: 90, z: 1.1 }; this.cheerOn = Array.isArray(o.cheer) ? o.cheer : [!!o.cheer, !!o.cheer]; this.ctrl = o.ctrl ?? ['ai', 'ai']; this.done = false; this.introF = o.intro ?? INTRO; this.final = !!o.final;
      this.level = o.level ?? [1, 1]; this.timeUp = false; this.acc = 0; this.koT = 0;
      this.v1 = !!o.v1;      // 第 68 圈：成片（demo_plan 的 PAD）带 v1 = 用第一版数值，平衡改动不动成片时间表
      if (o.boss) for (const f of this.F) if (o.boss[f.idx]) { f.boss = 1; f.hp = f.hpMax = f.trail = Math.round(f.hpMax * 1.5); f.meter = 100; if (f.id === 'ds') f.rice = 4; }      // 第 65 圈：街机模式最终头目（吃饱了的本体）：血 ×1.5、开场满 TOKEN、伤害 ×1.12、画面放大（render.js）
    }
    emit(type, d) { this.ev.push(Object.assign({ f: this.f, type }, d)); }
    addFx(k, x, y, d) { this.fx.push(Object.assign({ k, x, y, t: 0, life: 30 }, d)); }
    spawn(me, d) { const p = Object.assign({ own: me.idx, x: me.x, y: 200, vx: 0, vy: 0, g: 0, w: 100, h: 100, dmg: 0, stun: 16, bstun: 10, kb: 200, life: 120, hits: 1, t: 0, lastHit: -999, id: this.P.length + this.f * 100 }, d); if (me.st === 'sp' && me.mv && me.mv.m) { p.mvp = 1; if (me.mv.ex) { p.ex = 1; if (p.hits === 1 && me.mv.exHits) p.hits = me.mv.exHits; } } this.P.push(p); return p; }
    // 一个视频帧 / 显示帧推进 n 个逻辑步（慢动作时按 ts 折算）
    advance(n, inputs) { this.acc += n * this.ts; while (this.acc >= 1 - 1e-9) { this.tick(inputs); this.acc -= 1; } }
    tick(inputs) {
      const s = this; s.f++; if (s.phase === 'ko') s.koT += 1 / (60 * s.ts);      // K.O. 之后过了多少「屏幕上的秒」（慢动作和定格都算），画 K.O. 大字用
      if (s.flash > 0) s.flash = Math.max(0, s.flash - 0.06); if (s.shake > 0) s.shake *= 0.86; if (s.styleT > 0) s.styleT--; if (s.cheerT > 0) s.cheerT--;
      if (s.slowT > 0 && --s.slowT === 0) s.ts = 1;      // 精防的慢动作
      if (s.cine) { s.cine.t++; if (s.cine.t >= s.cine.len) endCine(s); return; }      // 三级超必杀演出：对局逻辑整个停住
      if (s.exe) { MX.exeStep(s); return; }      // D 代理：大肥鱼被终结时的处决演出（meme_ds.js），对局逻辑停住
      if (s.o.pad) { inputs = (inputs || [null, null]).slice(); for (const me of s.F) if (s.o.pad[me.idx] && s.ctrl[me.idx] === 'human') inputs[me.idx] = padAI(s, me, s.F[1 - me.idx]); }      // 第 43 圈：手柄电脑
      for (const me of s.F) if (s.ctrl[me.idx] === 'human' && s.phase === 'fight' && inputs && inputs[me.idx]) { const ii = inputs[me.idx]; me.latch = me.latch || {}; for (const k in ii) if (ii[k] && !(me.in && me.in[k]) && !DIRK[k]) { me.latch[k] = 1; if (me.latchF == null) me.latchF = s.f; if (k === 's' || k === 'x') me.lzD = { r: ii.r, l: ii.l, dn: ii.dn }; } updDirs(s, me, ii); tapTrack(s, me, ii); }      // 人在顿帧 / 定格里按的键和搓的方向不丢
      if (s.freeze > 0) { s.freeze--; return; }
      if (s.hitstop > 0) { s.hitstop--; for (const q of s.fx) q.t++; return; }      // 顿帧只冻人，火花特效照常播
      if (s.dbl > 0) s.dbl--; if (s.dark > 0) s.dark--;
      s.pt++;
      const [a, b] = s.F;
      if (s.phase === 'intro' && s.pt >= s.introF) { s.phase = 'fight'; s.pt = 0; a.st = b.st = 'idle'; a.t = b.t = 0; s.emit('fight', {}); }
      // 输入
      for (const me of s.F) {
        me.prev = me.in; const op = s.F[1 - me.idx];
        if (s.phase !== 'fight') me.in = {}; else if (s.ctrl[me.idx] === 'ai') me.in = aiStep(s, me, op); else { me.in = Object.assign({}, inputs && inputs[me.idx], me.latch); me.latch = {}; me.latchAt = me.latchF; me.latchF = null; }      // 第 67 圈：顿帧里按的键按「按下那一刻」判指令窗口（顿帧长时不再把搓好的指令放过期）
        if (me.inv > 0) { const l = me.in.l; me.in.l = me.in.r; me.in.r = l; }      // 被「代你操作」：左右颠倒
      }
      for (const me of s.F) stepFighter(s, me, s.F[1 - me.idx]);
      // 飞行物、场上物件
      for (const p of s.P) { if (p.dead) continue; p.t++; if (p.kind === 'yarn') stepYarn(s, p); if (p.boom) stepBoom(s, p); if (p.g) p.vy -= p.g * DT; p.x += p.vx * DT; p.y += p.vy * DT; if (p.t >= p.life || p.x < -300 || p.x > WORLD_W + 300) { p.dead = true; if (p.dmg && p.t >= p.life) s.addFx('pfade', p.x, p.y, { life: 16, col: s.F[p.own].ch.col2, w: p.w }); }
        if (p.kind === 'tea' && p.y <= 40 && !p.splash) { p.splash = true; p.vx = 0; p.vy = 0; p.g = 0; p.y = 60; p.w = 260; p.h = 150; p.life = p.t + 9; s.addFx('splash', p.x, 20, { life: 26, col: '#C9925A' }); s.emit('splash', {}); }
        if ((p.kind === 'bigscroll' || p.kind === 'box' || p.kind === 'sign') && p.y <= p.h / 2 && !p.landed) { p.landed = true; p.vy = 0; p.y = p.h / 2; p.life = p.t + (p.kind === 'box' ? 5 : 10); s.shake = Math.max(s.shake, p.kind === 'box' ? 6 : 22); s.addFx('dust', p.x, 0, { life: 24, big: p.kind !== 'box' }); s.emit(p.kind === 'box' ? 'boxland' : 'smash', {}); }
      }
      if (s.ctrl.includes('human')) clashProj(s);      // 飞行道具互相对消（只在有人玩时）
      for (const e of s.E) { if (e.dead) continue; e.t++; stepEntity(s, e); if (e.t >= e.life) e.dead = true; }
      resolveHits(s);
      // 推开、边界、镜头
      const PW = pushW(a, b); if (a.y <= 0 && b.y <= 0 && Math.abs(a.x - b.x) < PW && bodyOn(a) && bodyOn(b)) { const m = (PW - Math.abs(a.x - b.x)) / 2, dir = a.x <= b.x ? -1 : 1; a.x += dir * m; b.x -= dir * m; }
      if (Math.abs(a.x - b.x) > DMAX) { const m0 = (a.x + b.x) / 2, sg = a.x < b.x ? -1 : 1; a.x = m0 + sg * DMAX / 2; b.x = m0 - sg * DMAX / 2; }      // 两人最多拉开这么远，镜头才装得下
      if (s.ctrl.includes('human')) for (const me of s.F) if (me.st === 'launch' && me.wbOK && !me.wbDone && me.hp > 0 && me.y > 20 && ((me.x <= XMIN + 2 && me.vx < -250) || (me.x >= XMAX - 2 && me.vx > 250))) { me.wbDone = 1; me.wbOK = 0; me.vx = -me.vx * 0.42; me.vy = Math.max(me.vy, 560); me.juggle = Math.max(0, me.juggle - 1); s.emit('wallbounce', { who: me.idx }); s.addFx('wallhit', me.x, me.y + me.ch.h * 0.5, { life: 30, side: me.x <= XMIN + 2 ? -1 : 1 }); s.shake = Math.max(s.shake, 18); s.hitstop = Math.max(s.hitstop, 6); }      // 第 30 圈：撞墙反弹（街霸 6 的 Wall Bounce）
      for (const me of s.F) { me.x = clamp(me.x, XMIN, XMAX); if (me.trail > me.hp && s.f - me.lastDmgF > 26) me.trail = Math.max(me.hp, me.trail - 7); }
      const mid = (a.x + b.x) / 2, dist = Math.abs(a.x - b.x), tz = (1.04 + 0.13 * clamp(1 - (dist - 320) / 700)) * (s.adult ? 0.86 : 1), half = 960 / s.cam.z, tx = clamp(mid - 960, half - 960, WORLD_W - 960 - half);     // 镜头拉近时，左右能多挪一点，贴墙也看得全
      s.cam.x += (tx - s.cam.x) * 0.1; s.cam.z += (tz - s.cam.z) * 0.07;
      for (const q of s.fx) q.t++; if (s.fx.length > 80 || (s.f & 15) === 0) s.fx = s.fx.filter(q => q.t < q.life);
      if ((s.f & 31) === 0) { s.P = s.P.filter(p => !p.dead); s.E = s.E.filter(e => !e.dead); }
      // 回合进程
      if (s.phase === 'fight') {
        s.timer--;
        for (const me of s.F) {       // 决胜回合的「评论区应援」：第一次掉到 25% 血以下时，弹幕刷 token来，能量槽直接充满
          if (s.cheerOn[me.idx] && !me.cheered && me.hp > 0 && me.hp <= me.hpMax * 0.25 && s.F[1 - me.idx].hp > 0) { me.cheered = true; doCheer(s, me, s.F[1 - me.idx]); }
        }
        if ((a.hp <= 0 || b.hp <= 0) && MX && MX.exeKO(s)) { }      // D 代理：先进处决演出，演完再 K.O.
        else if (a.hp <= 0 || b.hp <= 0) { s.winner = a.hp <= 0 ? (b.hp <= 0 ? -1 : 1) : 0; s.phase = 'ko'; s.pt = 0; s.ts = 0.4; s.emit('ko', { winner: s.winner }); }
        else if (s.timer <= 0) { s.timeUp = true; s.winner = a.hp === b.hp ? -1 : (a.hp > b.hp ? 0 : 1); s.phase = 'ko'; s.pt = 0; s.emit('timeup', { winner: s.winner }); }
      } else if (s.phase === 'ko') {
        if (s.pt === 40) s.ts = 1;
        if (s.pt >= 130 && s.F.every(f => f.y <= 0)) { s.phase = 'over'; s.pt = 0; if (s.winner >= 0) { s.wins[s.winner]++; const w = s.F[s.winner], l = s.F[1 - s.winner]; w.st = 'win'; w.t = 0; w.vx = 0; if (l.hp > 0) { l.st = 'lose'; l.t = 0; l.vx = 0; } s.emit('win', { winner: s.winner, perfect: w.perfect }); } }
      } else if (s.phase === 'over') { if (s.pt >= 170) s.done = true; }
    }
  }
  const bodyOn = f => !['down', 'getup', 'ko', 'launch', 'roll'].includes(f.st);
  const pushW = (a, b) => 132 + (a.skin === 'a' ? 46 : 0) + (b.skin === 'a' ? 46 : 0);      // 第 42 圈：成年版推挤 28 → 46（站着贴身时两人身体不再叠一半）
  const pwx = (a, b) => pushW(a, b) - 132;      // 成年版身体更宽：近身判断（近身重拳、投、指令投的距离）跟着加这么多；Q 对 Q 是 0
  function setSt(me, st) { me.st = st; me.t = 0; }
  function sticker(me, name, n = 70) { me.stk = name; me.stkT = n; me.stkN = n; }
  function startAtk(s, me, kind) {
    const k = kind === 'light' ? (me.chain >= 2 ? 'light3' : me.chain === 1 ? 'light2' : 'light') : kind; me.atk = ATK[k]; me.atkK = k; setSt(me, kind === 'heavy' ? 'heavy' : 'light'); me.swing++; me.hitDone = {}; me.hitOK = false; me.buf = null; me.vx = 0;
    s.emit('whoosh', { lvl: k === 'light' ? 1 : 2, who: me.idx });
  }
  // 第 68 圈（用户：CD 太长，先玩爽）：cdm = 'fast' 爽快（人 0CD）/ 'std' 标准（人 CD 减半）；电脑在两种模式下 ×0.6 / ×0.8；没给 cdm（电脑对电脑、成片、chk）= 原数值
  const isHum = (s, me) => s.ctrl[me.idx] === 'human' && !(s.o.pad && s.o.pad[me.idx]);
  function cdOf(s, me) { const b = me.ch.sp.cd; if (!s.o.cdm) return b; if (isHum(s, me)) return s.o.cdm === 'fast' ? 0 : Math.round(b / 2); return Math.round(b * (s.o.cdm === 'fast' ? 0.6 : 0.8)); }
  function startSpecial(s, me, op) { if (me.dumb > 0 && (s.f % 10) < 3) { startAtk(s, me, 'light'); return; } setSt(me, 'sp'); me.mv = { id: me.ch.sp.id }; me.cd = cdOf(s, me); me.swing++; me.hitDone = {}; me.hitOK = false; me.vx = 0; sticker(me, me.ch.sp.stk, 64); s.emit('sp', { id: me.ch.sp.id, who: me.idx }); }
  function startSuper(s, me, op) {
    setSt(me, 'su'); me.mv = { id: me.ch.su.id }; me.meter = 0; me.meterFill = 0; me.swing++; me.hitDone = {}; me.vx = 0; me.invul = Math.max(me.invul, SU_INVUL[me.ch.su.id]); sticker(me, me.ch.su.stk, 110);
    s.freeze = 44; s.fz = { who: me.idx, f0: s.f, name: me.ch.su.name }; s.emit('su', { id: me.ch.su.id, who: me.idx });
  }
  function doCheer(s, me, op) {
    s.cheerT = 150; s.cheerWho = me.idx; me.invul = Math.max(me.invul, 70); me.meterFill = 24; me.meterRate = (100 - me.meter) / 24; sticker(me, me.ch.spr.cheer ? 'ds_plead' : me.ch.stkIntro, 80);
    if (bodyOn(op) && op.st !== 'su') { op.vx = (op.x >= me.x ? 1 : -1) * 900; if (['idle', 'walk', 'light', 'heavy', 'sp', 'dash', 'block'].includes(op.st) && op.y <= 0) { setSt(op, 'hit'); op.stun = 34; op.box = null; op.mv = null; } }
    if (['hit', 'block', 'freeze', 'stun'].includes(me.st)) { setSt(me, 'idle'); me.stun = 0; me.vx = 0; }
    s.addFx('ring', me.x, 200, { life: 30, col: '#FFE066' }); s.shake = Math.max(s.shake, 12); s.emit('cheer', { who: me.idx });
  }
  function stepFighter(s, me, op) {
    const inp = me.in, pr = me.prev, P = k => !!inp[k] && !pr[k];
    me.t++; if (me.cd > 0) me.cd--; if (me.dashCd > 0) me.dashCd--; if (me.invul > 0) me.invul--; if (me.slow > 0) me.slow--; if (me.flash > 0) me.flash--; if (me.stkT > 0) me.stkT--; me.landT++;
    me.box = null; me.counter = false; me.holdBack = false; if (me.dumb > 0) me.dumb--; if (me.inv > 0) me.inv--;
    if (me.meterFill > 0) { me.meter = Math.min(100, me.meter + me.meterRate); if (--me.meterFill === 0) me.meter = 100; }
    const spd = me.ch.speed * (me.slow > 0 ? 0.5 : 1);
    if (me.buf) { me.buf.t--; if (me.buf.t <= 0) me.buf = null; }
    if (me.nbuf && --me.nbuf.t <= 0) me.nbuf = null;
    const human = s.ctrl[me.idx] === 'human';
    if (human) { driveTick(s, me); updDirs(s, me); chargeTick(s, me); me.cmd = humanCmd(s, me, P); if (me.cmd && me.cmd.k !== 'x' && me.cmd.k !== 's1') me.cmd.m = specialMotion(s, me, me.cmd.m); if (me.id === 'dou' && me.cmd && me.cmd.k === 'lk' && !me.cmd.m) { const T = me.kT || []; while (T.length && s.f - T[0] > 30) T.shift(); if (T.length >= 4) { me.kT = []; me.cmd = { k: 'kkk' }; } } if (me.st === 'held' && me.cmd && me.cmd.k === 'th') me.techF = s.f; humanTech(s, me); lateEx(s, me, op); if (me.cmd) { if (['hit', 'block', 'getup', 'dash', 'jump', 'roll', 'throw', 'impact', 'drev'].includes(me.st) && me.y <= 0.02 || me.st === 'getup') me.nbuf = { c: me.cmd, t: 9 }; if (['light', 'heavy', 'sp'].includes(me.st)) me.buf = { c: me.cmd, t: 12 }; } }      // 人：方向缓存 + 指令识别（指令连同按键一起进预输入）      // 豆包：30 步内按 4 下轻脚 = 踢踢踢
    else if (['hit', 'block', 'getup', 'dash', 'jump'].includes(me.st) && me.y <= 0.02 || me.st === 'getup') { if (P('a') || P('b') || P('s') || P('x')) me.nbuf = { k: P('x') ? 'x' : P('s') ? 's' : P('b') ? 'b' : 'a', t: 9 }; }      // 预输入：硬直、起身、冲刺快结束时按的键，记 9 步，一能动就出招
    if (!human && (me.st === 'light' || me.st === 'heavy') && (P('a') || P('b') || P('s') || P('x'))) me.buf = { k: P('x') ? 'x' : P('s') ? 's' : P('b') ? 'b' : 'a', t: 12 };
    switch (me.st) {
      case 'intro': case 'win': case 'lose': me.vx = 0; break;
      case 'taunt': me.vx = 0; if (me.t >= 70) setSt(me, 'idle'); break;
      case 'crouch': humanNeutral(s, me, op, P, spd); break;
      case 'parry': humanParry(s, me, op, P); break;
      case 'jsq': stepJsq(s, me, spd); break;
      case 'drush': stepDrush(s, me, op, spd); break;
      case 'impact': case 'drev': stepAtk3(s, me, op); break;
      case 'roll': me.vx = me.t < 20 ? me.mv.dir * spd * 2.0 : me.vx * 0.6; if (me.t >= 30) { setSt(me, 'idle'); me.vx = 0; } break;
      case 'throw': stepThrow(s, me, op); break;
      case 'held': me.vx = 0; if (me.t > 70) setSt(me, 'idle'); break;
      case 'idle': case 'walk': { if (human) { humanNeutral(s, me, op, P, spd); break; }
        if (op.x !== me.x) me.face = op.x > me.x ? 1 : -1;
        const fwd = me.face > 0 ? inp.r : inp.l, back = me.face > 0 ? inp.l : inp.r; me.holdBack = !!back && !fwd;
        if (me.combo && s.f - me.comboF > 20) { me.combo = 0; me.gbDone = me.wbDone = 0; me.comboDmg = 0; me.juggle = 0; }
        const nb = me.nbuf ? me.nbuf.k : null, B = k => P(k) || nb === k; me.nbuf = null;
        if (B('x') && me.meter >= 100) { startSuper(s, me, op); break; }
        if (B('s') && me.cd <= 0) { startSpecial(s, me, op); break; }
        if (B('a')) { me.chain = 0; startAtk(s, me, 'light'); break; }
        if (B('b')) { startAtk(s, me, 'heavy'); break; }
        if (P('d') && me.dashCd <= 0) { setSt(me, 'dash'); me.mv = { dir: back ? -me.face : me.face, back: !!back }; me.dashCd = 34; if (back) me.invul = Math.max(me.invul, 7); s.emit('dash', { who: me.idx }); s.addFx('dust', me.x, 0, { life: 18 }); break; }
        if (inp.u) { setSt(me, 'jump'); me.vy = HJ(s) ? JV.full : 1380; me.jg = HJ(s) ? JG : 0; me.vx = (inp.r ? 1 : inp.l ? -1 : 0) * spd * 0.95; me.y = 0.01; me.airAtk = 0; s.emit('jump', { who: me.idx }); s.addFx('dust', me.x, 0, { life: 16 }); break; }
        if (inp.l || inp.r) { if (me.st !== 'walk') { me.st = 'walk'; me.walkT = 0; } me.walkT++; me.vx = (inp.r ? 1 : -1) * spd * (back ? 0.75 : 1); } else { me.st = 'idle'; me.vx = 0; }
        break; }
      case 'dash': me.vx = me.mv.dir * spd * (me.mv.back ? 2.3 : 2.7); if (me.t >= 15) { setSt(me, 'idle'); me.vx = 0; } break;
      case 'jump': { if (human) { humanAir(s, me); break; }
        if ((P('a') || P('b')) && !me.airAtk) { me.airAtk = 1; me.airT = 0; me.swing++; me.hitDone = {}; me.hitOK = false; s.emit('whoosh', { lvl: 1, who: me.idx }); }
        if (me.airAtk === 1) { me.airT++; if (me.airT >= ATK.air.su && me.airT < ATK.air.su + ATK.air.ac) me.box = Object.assign({ id: 'air' + me.swing }, ATK.air); }
        break; }
      case 'light': case 'heavy': {
        const A = me.atk; if (me.t >= A.su && me.t < A.su + A.ac) me.box = Object.assign({ id: 'n' + me.swing }, A); else if (A.twice && me.t >= A.su + A.ac + 3 && me.t < A.su + 2 * A.ac + 3) me.box = Object.assign({ id: 'n2' + me.swing }, A);      // 两段的普通技（哈基米 →+J）
        if (me.t < A.su) me.vx = A.crouch ? 0 : A.fwdstep ? me.face * 380 : A.backstep ? -me.face * 300 : me.face * (me.chain > 0 && me.st === 'light' ? 420 : 150); else me.vx *= 0.7;      // 连招的后两下边打边往前垫步
        if (human && me.t >= A.su && (me.hitOK || me.blkOK) && tryRushCancel(s, me)) break;      // 普通技打中 / 被防后 →→ = 绿冲取消
        if ((human || me.t >= A.su + A.ac) && me.hitOK && me.buf) {      // 人：打中那一刻（顿帧过后）就能取消，和街霸一样      // 命中后可以取消：轻→轻→轻（第三下打飞）、轻→重、任意→招牌技 / 超必杀
          if (me.buf.c) { const c = me.buf.c; me.buf = null; if (doCmd(s, me, op, c, true)) break; } else {
          const k = me.buf.k; me.buf = null;
          if (k === 'x' && me.meter >= 100) { startSuper(s, me, op); break; }
          if (k === 's' && me.cd <= 0) { startSpecial(s, me, op); break; }
          if (me.st === 'light' && k === 'a' && me.chain < 2) { me.chain++; startAtk(s, me, 'light'); break; }
          if (me.st === 'light' && k === 'b') { startAtk(s, me, 'heavy'); break; } }
        }
        if (me.t >= A.su + A.ac + A.rc) { setSt(me, 'idle'); me.chain = 0; }
        break; }
      case 'sp': if (human && me.hitOK && me.buf && me.buf.c && (me.buf.c.k === 'x' || me.buf.c.m === '236236' || me.buf.c.m === '214214')) { const c = me.buf.c; me.buf = null; if (doCmd(s, me, op, c, true)) break; }      // 必杀技打中 → 取消成一 / 二 / 三级超必杀（按格数）
        if (SPF[me.mv.id](s, me, op, me.t)) { setSt(me, 'idle'); me.mv = null; } break;
      case 'su': if (SUF[me.mv.id](s, me, op, me.t)) { setSt(me, 'idle'); me.mv = null; } break;
      case 'hit': me.vx *= 0.86; if (--me.stun <= 0) setSt(me, 'idle'); break;
      case 'block': me.vx *= 0.84; me.holdBack = true; if (human) { me.cblk = !!inp.dn; if (((P('dv') && (me.face > 0 ? inp.r : inp.l)) || (me.cmd && me.cmd.k === 'imp')) && canDrive(me, 2)) { useDrive(s, me, 2); startAtk3(s, me, 'drev'); me.invul = Math.max(me.invul, 12); break; } } if (--me.stun <= 0) setSt(me, 'idle'); break;
      case 'freeze': case 'stun': case 'sleep': me.vx *= 0.8; if (me.st === 'sleep' && me.hp > 0) me.hp = Math.min(me.hpMax, me.hp + 2); if (--me.stun <= 0) setSt(me, 'idle'); break;
      case 'down': me.vx *= 0.8; if (me.t >= 32) setSt(me, 'getup'); break;
      case 'getup': me.vx = 0; if (me.t >= 16) { setSt(me, 'idle'); me.invul = Math.max(me.invul, 8); me.combo = 0; me.gbDone = me.wbDone = 0; me.comboDmg = 0; me.juggle = 0; } break;
      case 'launch': case 'ko': if (me.y <= 0) me.vx *= 0.85; break;
    }
    // 物理
    if (me.y > 0 || me.vy > 0) {
      me.vy -= GRAV * (me.jg && me.st === 'jump' && !(me.floatT > 0) ? me.jg : 1) * DT; me.y += me.vy * DT;      // jg：第 75 圈新跳跃的重力倍数（只在普通跳的状态里）
      if (me.y <= 0) { me.y = 0; me.vy = 0; me.landT = 0; me.jg = 0;
        if (me.st === 'jump') { setSt(me, 'idle'); me.vx = 0; s.emit('land', { who: me.idx }); s.addFx('dust', me.x, 0, { life: 16 }); }
        else if (me.st === 'launch' && me.gbOK && !me.gbDone && me.hp > 0 && s.ctrl.includes('human')) { me.gbDone = 1; me.gbOK = 0; me.vy = 780; me.y = 0.01; me.vx *= 0.6; me.juggle = Math.max(0, me.juggle - 1); s.emit('gbounce', { who: me.idx }); s.addFx('gbounce', me.x, 0, { life: 26 }); s.addFx('dust', me.x, 0, { life: 22, big: true }); s.shake = Math.max(s.shake, 14); s.hitstop = Math.max(s.hitstop, 4); }      // 第 30 圈：地面反弹（重击打飞后弹一次，可以再追打）
        else if (me.st === 'launch') { if (me.hp <= 0) setSt(me, 'ko'); else setSt(me, 'down'); me.invul = Math.max(me.invul, 2); s.emit('fall', { who: me.idx }); s.addFx('dust', me.x, 0, { life: 22, big: true }); s.shake = Math.max(s.shake, 7); }
        else if (me.st === 'ko') { s.emit('fall', { who: me.idx }); s.addFx('dust', me.x, 0, { life: 22, big: true }); s.shake = Math.max(s.shake, 9); }
      }
    }
    me.x += me.vx * DT;
  }
  // —— 招牌技（返回 true = 收招）——
  const SPF = {
    popup(s, me, op, t) { if (t === 14) { s.spawn(me, { kind: 'popup', x: me.x + me.face * 120, y: 215, vx: me.face * 860, w: 210, h: 140, dmg: 60, stun: 8, bstun: 12, kb: 100, life: 95, fxF: { freeze: 58 } }); s.emit('proj', { k: 'popup' }); } return t >= 36; },
    pounce(s, me, op, t) {
      if (t === 8) { me.vy = 800; me.vx = me.face * (me.mv.v === 'b' || me.mv.ex ? 1120 : 900); me.y = 0.01; s.emit('jump', { who: me.idx }); }
      if (t >= 8 && me.y > 0) me.box = { id: 'sp' + me.swing, x0: -20, x1: 180, y0: -30, y1: 290, dmg: 96, launch: 720, kb: 520, bstun: 14 };
      if (t > 10 && me.y <= 0) { if (!me.mv.land) { me.mv.land = t; me.vx = 0; s.addFx('dust', me.x, 0, { life: 18 }); } return t - me.mv.land >= 12; }
      return false;
    },
    three(s, me, op, t) { [12, 23, 34].forEach((ft, i) => { if (t === ft) { s.spawn(me, { kind: 'num', n: i + 1, x: me.x + me.face * 110, y: [270, 195, 120][i], vx: me.face * 840, w: 96, h: 96, dmg: s.v1 ? 40 : 34, stun: s.v1 ? 17 : 15, kb: s.v1 ? 190 : 200, life: 110 }); s.emit('proj', { k: 'num' }); } }); return t >= (s.v1 ? 52 : 62); },      // 第 68 圈（AI 对决试跑：三发打满后 GPT 先恢复、能接着再放 = 无限压制）：伤害 40→34、硬直 17→15、收招 52→62，三发全中后被打方先动（约 +7），离远放会被跳入惩罚
    axe(s, me, op, t) {
      if (t < 22) me.vx = me.face * 60; else me.vx = 0;
      if (t >= 22 && t < 28) me.box = { id: 'sp' + me.swing, x0: -10, x1: 300, y0: 0, y1: 500, dmg: 150, launch: 1050, kb: 680, bstun: 22, stop: 11, shake: 20, chip: 0.2 };
      if (t === 22) { s.emit('axe', {}); s.addFx('dust', me.x + me.face * 220, 0, { life: 24, big: true }); s.shake = Math.max(s.shake, 10); }
      return t >= 58;
    },
    scroll(s, me, op, t) {
      if (t === 14) s.emit('paper', {});
      if (t >= 14 && t < 46) { const k = Math.floor((t - 14) / 10); me.mv.len = Math.min(640, (t - 13) * 40); me.box = { id: 'sp' + me.swing + '_' + k, x0: 40, x1: 40 + me.mv.len, y0: 0, y1: 150, dmg: 39, stun: 17, kb: 210, bstun: 9 }; }
      return t >= 62;
    },
    script(s, me, op, t) { if (t === 16) { for (const e of s.E) if (e.kind === 'turret' && e.own === me.idx) e.dead = true; s.E.push({ own: me.idx, kind: 'turret', x: clamp(me.x + me.face * 100, XMIN, XMAX), t: 0, life: 250, dir: me.face }); s.emit('turret', {}); } return t >= 34; },
    alts(s, me, op, t) { [14, 27].forEach((ft, i) => { if (t === ft) { s.spawn(me, { kind: 'alt', i, x: me.x - me.face * (120 + i * 40), y: 95, vx: me.face * 780, w: 120, h: 190, dmg: 50, stun: 18, kb: 260, life: 150 }); s.emit('proj', { k: 'alt' }); } }); return t >= 46; },
    counter(s, me, op, t) { if (me.mv.hit) return t - me.mv.hit >= 24; if (t >= 5 && t < 29) me.counter = true; return t >= 60; },
    tea(s, me, op, t) { if (t === 14) { s.spawn(me, { kind: 'tea', x: me.x + me.face * 70, y: 320, vx: me.face * clamp(Math.abs(op.x - me.x) * 1.15, 420, 900), vy: 760, g: 2200, w: 90, h: 100, dmg: 58, stun: 18, kb: 200, life: 140, fxF: { slow: 84 } }); s.emit('proj', { k: 'tea' }); } return t >= 36; },
  };
  // —— 超必杀（特写定格结束后才开始计 t）——
  const SUF = {
    wave(s, me, op, t) {
      if (t === 26) { s.spawn(me, { kind: 'wave', x: me.x + me.face * 140, y: 250, vx: me.face * 1380, w: 330, h: 520, dmg: 330, launch: 980, kb: 720, bstun: 20, life: 130, stop: 12, shake: 26, chip: 0.25, sup: true }); s.emit('wave', {}); s.shake = Math.max(s.shake, 14); }
      return t >= 64;
    },
    flash(s, me, op, t) {
      if (t === 6) { s.flash = 1; s.emit('flash', {}); if (canBeHit(op)) hit(s, me, op, { dmg: 40, unblock: true, fxF: { stun: 96 }, kb: 0, sup: true, stop: 4 }, op.x, 200); }
      if (t >= 22 && (t - 22) % 9 === 0 && t < 22 + 45 && op.st === 'stun') { const last = t >= 22 + 36; hit(s, me, op, Object.assign({ dmg: 48, unblock: true, kb: last ? 560 : 0, keep: !last, sup: true, stop: last ? 9 : 2, shake: last ? 18 : 6 }, last ? { launch: 900 } : {}), op.x, 200); s.addFx('star', op.x + (s.rng() - 0.5) * 160, 120 + s.rng() * 220, { life: 20 }); }
      return t >= 76;
    },
    beam(s, me, op, t) {
      if (t === 8) s.emit('beam', {});
      if (t >= 8 && t < 68) { me.mv.on = true; me.box = { id: 'su' + me.swing + '_' + Math.floor((t - 8) / 5), x0: 70, x1: 2200, y0: 110, y1: 340, dmg: 28, stun: 15, kb: 70, bstun: 8, sup: true, stop: 1, chip: 0.2 }; } else me.mv.on = false;
      return t >= 84;
    },
    revenge(s, me, op, t) {
      if (t === 4) { me.x = clamp(op.x - me.face * 170, XMIN, XMAX); s.addFx('ring', me.x, 200, { life: 20, col: '#FF5A6E' }); s.emit('warp', {}); }
      if (t >= 12 && t < 18) me.box = { id: 'su' + me.swing, x0: -40, x1: 330, y0: 0, y1: 520, dmg: Math.min(400, Math.round(170 + 0.4 * me.dmgTaken)), unblock: true, launch: 1100, kb: 760, sup: true, stop: 13, shake: 26 };
      if (t === 12) s.emit('axe', {});
      return t >= 48;
    },
    drop(s, me, op, t) {
      if (t === 2) { me.mv.x = op.x; s.emit('mark', {}); }
      if (t < 22) me.mv.x += (op.x - me.mv.x) * 0.25;
      if (t === 34) s.spawn(me, { kind: 'bigscroll', x: me.mv.x, y: 1150, vy: -2700, w: 400, h: 330, dmg: 310, launch: 760, kb: 320, bstun: 22, life: 60, stop: 12, shake: 24, chip: 0.25, sup: true });
      if (t === 62) { setSt(me, 'sleep'); me.stun = 64; me.mv = null; sticker(me, 'kimi_sleep', 64); s.emit('sleep', { who: me.idx }); return false; }
      return false;
    },
    lock(s, me, op, t) {
      me.mv.pct = clamp(t / 46) * 100;
      if (t === 2) s.emit('charge', {});
      if (t === 48) { s.emit('laser', {}); me.mv.fire = s.f; if (canBeHit(op)) hit(s, me, op, { dmg: 262, unblock: true, launch: 950, kb: 620, sup: true, stop: 12, shake: 24 }, op.x, 200); }
      return t >= 78;
    },
    rain(s, me, op, t) {
      if (t >= 6 && (t - 6) % 7 === 0 && t < 6 + 63) { s.spawn(me, { kind: 'box', x: clamp(op.x + (s.rng() - 0.5) * 420, 80, WORLD_W - 80), y: 1150, vy: -1700 - s.rng() * 300, w: 140, h: 140, dmg: 44, stun: 17, kb: 120, bstun: 8, life: 60, sup: true, stop: 2 }); }
      if (t >= 10 && t < 55 && me.hp > 0) me.hp = Math.min(me.hpMax, me.hp + 2);
      if (t === 10) s.emit('heal', { who: me.idx });
      return t >= 80;
    },
    fix(s, me, op, t) {
      if (t === 14) { for (const p of s.P) if (p.own !== me.idx) { p.dead = true; s.addFx('ring', p.x, p.y, { life: 16, col: '#FFB45C' }); } for (const e of s.E) if (e.own !== me.idx) e.dead = true;
        s.spawn(me, { kind: 'fix', x: me.x + me.face * 130, y: 215, vx: me.face * 1500, w: 320, h: 330, dmg: 250, launch: 820, kb: 560, bstun: 18, life: 110, stop: 11, shake: 20, chip: 0.2, fxF: { drain: 1 }, sup: true }); s.emit('beam', {}); }
      return t >= 56;
    },
    style(s, me, op, t) {
      if (t === 2) { s.styleT = 118; s.emit('style', {}); if (canBeHit(op) && op.y <= 0) { setSt(op, 'stun'); op.stun = 70; op.vx = 0; op.box = null; op.mv = null; } }
      if (t === 30) s.spawn(me, { kind: 'sign', x: op.x, y: 1150, vy: -2500, w: 420, h: 300, dmg: 300, unblock: true, launch: 800, kb: 360, life: 60, stop: 13, shake: 26, sup: true });
      return t >= 84;
    },
  };
  function stepEntity(s, e) {
    if (e.kind === 'banana' || e.kind === 'tea2') return stepMemeEntity(s, e);
    if (e.kind === 'turret') { const op = s.F[1 - e.own]; if (e.t === 50 || e.t === 110 || e.t === 170) { const dir = op.x >= e.x ? 1 : -1; e.dir = dir; s.spawn(s.F[e.own], { kind: 'code', x: e.x + dir * 50, y: 190, vx: dir * 780, w: 130, h: 60, dmg: 30, stun: 15, kb: 170, life: 160 }); s.emit('proj', { k: 'code' }); } }
  }
  const canBeHit = f => f.invul <= 0 && !['down', 'getup', 'ko', 'win', 'lose', 'intro'].includes(f.st) && !(f.st === 'launch' && f.juggle >= 3);
  const crouching = f => f.st === 'crouch' || (f.st === 'block' && f.cblk) || ((f.st === 'light' || f.st === 'heavy') && f.atk && f.atk.crouch) || (f.st === 'sp' && f.mv && f.mv.low);
  const hurt = f => { const w = f.skin === 'a' ? 86 : 72, hh = f.skin === 'a' ? f.ch.h * AKY / AK : f.ch.h; return [f.x - w, f.x + w, f.y, f.y + hh * (crouching(f) ? 0.55 : 0.8)]; };
  const ov = (a, b) => a[0] < b[1] && a[1] > b[0] && a[2] < b[3] && a[3] > b[2];
  function resolveHits(s) {
    const [a, b] = s.F, L = [];
    for (const f of s.F) if (f.box) { f.boxSw = f.swing; f.boxSt = f.st; }      // 记一下这一招出过判定（之后没判定了 = 收招中，打中算 PUNISH COUNTER）
    for (const [me, op] of [[a, b], [b, a]]) { const bx = me.box; if (!bx || me.hitDone[bx.id]) continue; const kx = me.skin === 'a' ? AKX : 1, ky = me.skin === 'a' ? AKY : 1, x0 = me.x + me.face * bx.x0 * kx, x1 = me.x + me.face * bx.x1 * kx; if (ov([Math.min(x0, x1), Math.max(x0, x1), me.y + bx.y0 * ky, me.y + bx.y1 * ky], hurt(op)) && canBeHit(op)) L.push([me, op, bx]); }
    for (const [me, op, bx] of L) { me.hitDone[bx.id] = 1; const r = hit(s, me, op, bx, (me.x + op.x) / 2 + me.face * 30, clamp(me.y + (bx.y0 + bx.y1) / 2, 60, 330), 'melee'); if (r === 'hit') me.hitOK = true; if (r === 'block' && me.st === 'sp' && me.mv && me.mv.id === 'pounce') me.vx = -me.face * 320; }
    for (const p of s.P) {
      if (p.dead || !p.dmg) continue; const op = s.F[1 - p.own]; if (p.hits <= 0 || !canBeHit(op) || op.pinv || (((p.kind === 'yarn' || p.kind === 'ring' || p.boom) && s.f - p.lastHit < (p.kind === 'ring' ? 10 : 14)) || (p.gap && s.f - p.lastHit < p.gap))) continue;
      if (ov([p.x - p.w / 2, p.x + p.w / 2, p.y - p.h / 2, p.y + p.h / 2], hurt(op))) { const r = hit(s, s.F[p.own], op, p, clamp(p.x, op.x - 60, op.x + 60), clamp(p.y, 60, 330), 'proj'); if (r) { p.hits--; p.lastHit = s.f; if (!['wave', 'fix', 'bigscroll', 'sign'].includes(p.kind) && !((p.kind === 'yarn' || p.kind === 'ring' || p.boom || p.gap) && p.hits > 0)) { p.dead = true; s.addFx('ppop', p.x, p.y, { life: 18, col: s.F[p.own].ch.col2, w: p.w }); } } }
    }
  }
  // 命中的类型（画面和顿帧分级用）：k = punch 拳 / kick 脚 / heavy 重 / sup 超必杀；w = 力度档；lv = 1..3
  const HY = { light: 0.62, light2: 0.82, light3: 0.6, heavy: 0.55, air: 0.72, clight: 0.3, sweep: 0.08, sp: 0.5, slp: 0.62, slk: 0.35, shp: 0.58, shpc: 0.58, shk: 0.66, shkc: 0.6, clp: 0.32, clk: 0.1, chp: 0.85, chk: 0.08, fhk: 0.62, bhk: 0.62, mid: 0.7, fwdk: 0.55 };
  function hitKind(atk, h, src) {
    if (h.sup) return { k: 'sup', w: 'sup', lv: 3 };
    if (src === 'melee' && (atk.st === 'light' || atk.st === 'heavy')) { const k = atk.atkK; return (k === 'heavy' || k === 'shp' || k === 'shpc' || k === 'chp') ? { k: 'heavy', w: 'heavy', lv: 3 } : (k === 'shk' || k === 'shkc' || k === 'fhk' || k === 'bhk') ? { k: 'kick', w: 'heavy', lv: 3 } : (k === 'slk' || k === 'clk') ? { k: 'kick', w: 'light', lv: 1 } : k === 'chk' ? { k: 'kick', w: 'heavy', lv: 2 } : k === 'sweep' ? { k: 'kick', w: 'heavy', lv: 2 } : k === 'light3' ? { k: 'kick', w: 'mid', lv: 2 } : { k: 'punch', w: 'light', lv: 1 }; }
    if (src === 'melee' && atk.st === 'jump') return { k: 'kick', w: 'mid', lv: 2 };
    if (src === 'throw') return { k: 'heavy', w: 'heavy', lv: 3 };
    return { k: (h.dmg || 0) >= 80 ? 'heavy' : 'punch', w: 'sp', lv: (h.dmg || 0) >= 80 ? 3 : 2 };
  }
  // 结算一次命中：返回 'hit' | 'block' | 'counter'
  function hit(s, atk, def, h, px, py, src) {
    if (def.st === 'sp' && def.mv && ((def.mv.lowInv && h.low) || (def.mv.headInv && (atk.y > 60 || (h.y0 || 0) >= 300)))) return null;      // Grok 下段大风车不吃下段；头槌不吃空中来的
    if (atk.id === 'qwen' && h.kind === 'fan' && !h.cpn && s.ctrl[atk.idx] === 'human' && (atk.coupon || 0) < 3) { atk.coupon = (atk.coupon || 0) + 1; s.addFx('text', atk.x, atk.ch.h + 120, { life: 40, s: '满减券 ×' + atk.coupon, col: '#E8743B' }); }      // 千问：飞扇碰到人（打中或被防）领一张满减券，最多 3 张
    const dir = (src === 'proj' || h.vx !== undefined) && h.vx ? Math.sign(h.vx) : (def.x >= atk.x ? 1 : -1);
    if (h.cine) { const blk = !h.unblock && def.y <= 0 && ['idle', 'walk', 'crouch', 'block'].includes(def.st) && def.holdBack; if (!blk && def.st !== 'parry') { startCine(s, atk, def); return 'hit'; } h = Object.assign({}, h, { cine: 0 }); }
    if (def.helmet > 0 && def.armorH > 0 && !h.sup && src !== 'throw' && !h.unblock) {      // 头盔：挨一下不被打断，扣一半，盆飞出去砸对手
      def.armorH = 0; def.helmet = 0; const d = Math.max(1, Math.round(h.dmg * atk.ch.dmg * DMG * 0.5)); def.hp = Math.max(1, def.hp - d); def.lastDmgF = s.f; if (src === 'proj') h.dead = true;
      s.spawn(def, { kind: 'basin', x: def.x, y: def.ch.h, vx: (atk.x >= def.x ? 1 : -1) * 900, vy: 600, g: 2000, w: 120, h: 90, dmg: 40, stun: 18, kb: 220, life: 80 });
      s.hitstop = Math.max(s.hitstop, 8); s.addFx('text', def.x, def.ch.h + 100, { life: 40, s: '当！', col: '#9AA8C0' }); s.addFx('num', px, py + 70, { life: 40, s: String(d), lvl: 1 }); s.emit('hit', { blk: 1, lvl: 1 }); return 'armor';
    }
    if (def.st === 'parry' && !h.unblock && src !== 'throw') {      // 架招：挡住上中下段；按下后 4 步内挨打 = 精防
      if (def.parryT <= 4) { s.ts = 0.25; s.slowT = 24; s.flash = Math.max(s.flash, 0.45); def.drive = Math.min(DRIVE_MAX, def.drive + 1); setSt(def, 'idle'); def.pp = s.f;
        if (src === 'proj') h.dead = true; else if (atk.y <= 0) { setSt(atk, 'stun'); atk.stun = 30; atk.vx = 0; atk.box = null; atk.mv = null; if (atk.drive !== undefined) atk.drive = Math.max(0, atk.drive - 0.5); }
        s.hitstop = Math.max(s.hitstop, 8); s.addFx('text', def.x, 470, { life: 50, s: '精准！', col: '#3DDC84' }); s.addFx('ring', px, py, { life: 22, col: '#3DDC84' }); s.emit('parry', { who: def.idx, perfect: 1 }); return 'parry'; }
      def.vx = dir * Math.min(360, (h.kb ?? 200) * 0.6); def.drive = Math.min(DRIVE_MAX, def.drive + 0.25); atk.blkOK = true; s.hitstop = Math.max(s.hitstop, 5); s.addFx('guard', px, py, { life: 14, dir, green: 1 }); s.emit('hit', { blk: 1, lvl: 1 }); if (src === 'proj') h.dead = true; return 'block';
    }
    if (def.armor > 0 && ((def.st === 'heavy' && def.gArm && def.t < def.atk.su + def.atk.ac) || (def.st === 'impact' && def.t < def.atk.su + def.atk.ac) || (def.st === 'sp' && def.mv && def.mv.id === 'lv3' && def.t < 20)) && !h.sup && src !== 'throw') {      // 算力冲击的霸体：吃两下不被打断，只扣一半
      def.armor--; const d = Math.max(1, Math.round(h.dmg * atk.ch.dmg * DMG * 0.5)); def.hp = Math.max(1, def.hp - d); def.lastDmgF = s.f; def.flash = 3; if (src === 'proj') h.dead = true;
      s.hitstop = Math.max(s.hitstop, 8); s.addFx('ring', px, py, { life: 16, col: '#FFFFFF' }); s.addFx('num', px, py + 70, { life: 40, s: String(d), lvl: 1 }); s.emit('hit', { blk: 1, lvl: 1 }); return 'armor';
    }
    if (atk.rushBuff && src === 'melee' && (atk.st === 'light' || atk.st === 'heavy')) h = Object.assign({}, h, { stun: (h.stun ?? 18) + 4, bstun: (h.bstun ?? 10) + 4 });      // 绿冲里出的第一下：硬直 +4
    if (h.sup && atk.supScale) h = Object.assign({}, h, { dmg: h.dmg * atk.supScale });
    const hk = hitKind(atk, h, src); if (src === 'melee') { px = def.x - dir * 50; const dh = def.ch.h * (s.adult && def.skin !== 'a' ? 1.28 : 1); py = clamp(def.y + dh * (HY[atk.st === 'light' || atk.st === 'heavy' ? atk.atkK : atk.st === 'jump' ? 'air' : 'sp'] ?? 0.5), 40, 460);
      if (atk.st === 'jump' && h.y1 != null && s.ctrl.includes('human')) { const ky = atk.skin === 'a' ? AKY : 1, hb = hurt(def), lo = Math.max(atk.y + h.y0 * ky, hb[2]), hi = Math.min(atk.y + h.y1 * ky, hb[3]); if (hi > lo) py = clamp(lo + (hi - lo) * 0.35, 40, 460); } }      // 第 45 圈：跳攻击的火花画在脚和身体真正重叠的地方；成年打 Q 版按 Q 版画面高度（×1.28）      // 火花画在拳脚落点（挨打方身体前沿、按招式的高度），不是两人中点
    if (def.counter && !h.unblock && !h.sup && !(def.ctrT === 'lo' && !h.low) && !(def.ctrT === 'hi' && h.low) && !(def.ctrT === 'mid' && (h.low || (src !== 'proj' && atk.y > 40)))) {      // Claude 的当身：吃下这一击，原样奉还      // Claude 半圈当身：上段当身接不住下段，下段当身只接下段
      def.mv.hit = def.t; def.invul = 26; s.addFx('text', def.x, 430, { life: 50, s: def.id === 'ds' ? '求求了～' : '但是——', col: def.id === 'ds' ? '#4D6BFE' : '#E8743B' }); s.emit('counter', { who: def.idx }); s.hitstop = 10; s.shake = Math.max(s.shake, 14);
      if (src === 'proj') { h.dead = true; if (canBeHit(atk) && Math.abs(atk.x - def.x) < 420) hit(s, def, atk, { dmg: 76, launch: 900, kb: 600, unblock: true, stop: 0 }, atk.x, 200); }
      else if (def.ctrT === 'mid') { hit(s, def, atk, { dmg: 96, launch: 420, kb: 980, unblock: true, stop: 0 }, atk.x, 200); s.addFx('text', def.x, 500, { life: 50, s: '请注意措辞', col: '#E8743B' }); }      // 中段当身：掌底横着打飞
      else if (def.ctrT === 'lo') { hit(s, def, atk, { dmg: 100, launch: 320, kb: 140, unblock: true, stop: 0 }, atk.x, 120); s.addFx('text', def.x, 500, { life: 50, s: '踩住！', col: '#E8743B' }); }      // 下段当身：踩住敲头，对手倒在脚边（可以接倒地追打投）
      else hit(s, def, atk, { dmg: 92, launch: 980, kb: 640, unblock: true, stop: 0 }, atk.x, 200);
      return 'counter';
    }
    let canBlock = !h.unblock && def.y <= 0 && (def.st === 'idle' || def.st === 'walk' || def.st === 'block' || def.st === 'crouch') && def.holdBack;
    const cg = def.st === 'crouch' || (def.st === 'block' && def.cblk);      // 蹲防：下段要蹲防，跳攻击（从空中打下来）要站防
    if (canBlock && h.low && !cg) canBlock = s.ctrl[def.idx] === 'ai' ? (s.ctrl.includes('human') ? ((s.f * 7 + def.idx) % 100) < Math.min(85, 25 + 40 * s.level[def.idx]) : (s.f * 7 + def.idx) % 10 < 4) : false;      // 第 41 圈：人机对战里防下段的概率随难度走
    if (canBlock && cg && src === 'melee' && atk.y > 0) canBlock = false;
    if (canBlock && cg && h.high) canBlock = false;      // 中段：蹲防防不住
    if (canBlock) {
      const chip = Math.max(1, Math.round(h.dmg * atk.ch.dmg * DMG * (h.chip ?? 0.1) * (def.burn ? 2 : 1))); def.hp = Math.max(1, def.hp - chip); def.lastDmgF = s.f; setSt(def, 'block'); def.cblk = cg; def.stun = h.bstun ?? 10; def.vx = dir * Math.min(420, (h.kb ?? 200) * 0.8);
      atk.meter = Math.min(100, atk.meter + 2); def.meter = Math.min(100, def.meter + 3); if (h.fxF && h.fxF.drain) def.meter = 0;
      s.hitstop = Math.max(s.hitstop, 4); s.addFx('guard', px, py, { life: 16, dir, cr: cg });
      if (s.ctrl.includes('human') && src === 'melee' && atk.y <= 0) atk.vx = -dir * 260;      // 被防住：攻击方被弹回一小步（只在有人玩时）
      atk.blkOK = true; if (def.drive !== undefined) { useDrive(s, def, h.impact ? 1 : (h.dmg >= 80 ? 0.5 : 0.25)); if (def.burn && (def.x <= XMIN + 140 || def.x >= XMAX - 140) && (h.dmg >= 80 || h.impact)) { setSt(def, 'stun'); def.stun = 60; def.wall = true; } }
      if (h.impact) impactHit(s, atk, def, true);
      s.emit('hit', { blk: 1, lvl: 1 }); return 'block';
    }
    const easy = s.ctrl[atk.idx] === 'ai' && s.ctrl[def.idx] === 'human' ? 0.6 + 0.4 * Math.min(1, s.level[atk.idx]) : 1;      // 低难度的电脑打人轻一点
    const SEP = h.sep && ((atk.skin === 'a' ? h.sep * AKX : h.sep) + (def.skin === 'a' ? 30 : 0));      // 第 35 圈：挨打的是成年版时身体更宽，多顶开 30
    if (src === 'melee' && SEP && atk.y <= 0 && def.y <= 0 && Math.abs(def.x - atk.x) < SEP) {      // 贴得太近时把挨打的人顶到拳脚够得着的位置，拳头落在身上而不是穿过去（成年版够得更远）
      def.x = atk.x + dir * SEP; if (def.x < XMIN || def.x > XMAX) { def.x = clamp(def.x, XMIN, XMAX); atk.x = clamp(def.x - dir * SEP, XMIN, XMAX); }
    }
    const ctr = s.ctrl.includes('human') && src === 'melee' && (def.st === 'light' || def.st === 'heavy') && def.atk && def.t < def.atk.su + def.atk.ac;
    const pc = s.ctrl.includes('human') && !ctr && src !== 'throw' && def.y <= 0 && !h.sup && (((def.st === 'light' || def.st === 'heavy') && def.atk && def.t >= def.atk.su + def.atk.ac) || ((def.st === 'sp' || def.st === 'su') && !def.box && def.boxSw === def.swing && (def.boxSt === 'sp' || def.boxSt === 'su')));      // 第 30 圈：打中对方收招 = PUNISH COUNTER（街霸 6）：伤害 ×1.2、硬直 +14、顿帧 +7、扣对方 0.5 格算力；重攻击确反直接打瘫      // 打中对方出手的瞬间 = COUNTER：伤害、硬直、顿帧都加码（只在有人玩的时候生效，成片的种子不受影响）
    const n = def.combo, scale = Math.max(0.45, 1 - 0.1 * n), dmg0 = Math.max(1, Math.round(h.dmg * atk.ch.dmg * DMG * scale * easy * (ctr ? 1.25 : 1) * (pc ? 1.2 : 1) * (def.st === 'sleep' ? 1.5 : 1) * ((h.ex || (src === 'melee' && atk.st === 'sp' && atk.mv && atk.mv.ex)) ? 1.3 : 1) * (s.dbl > 0 ? 2 : 1) * (atk.rice >= 4 && src === 'melee' && !h.sup ? 1.1 : 1) * (atk.autoC && (atk.atkK === 'light2' || atk.atkK === 'light3') ? 0.8 : 1) * ((h.sup || h.lzk) && atk.lazyS ? 0.9 : 1) * (atk.boss ? 1.12 : 1)));
    const dmg = (atk.id === 'kimi' && src === 'melee' && /^k(shp|shk|chp)$/.test(atk.atkK || '')) ? Math.max(1, Math.round(dmg0 * (Math.abs(def.x - atk.x) > 400 ? 0.7 : Math.abs(def.x - atk.x) > 280 ? 0.85 : 1))) : dmg0;      // Kimi 的长手：远了伤害低
    if (ctr) { h = Object.assign({}, h, { stun: (h.stun ?? 18) + 8, stop: (h.stop ?? 6) + 4 }); s.addFx('ctrtxt', def.x, 430, { life: 40, s: 'COUNTER', tier: 1, who: atk.idx }); }
    if (pc) { h = Object.assign({}, h, { stun: (h.stun ?? 18) + 14, stop: (h.stop ?? 6) + 7 }); s.addFx('ctrtxt', def.x, 450, { life: 48, s: 'PUNISH COUNTER', tier: 2, who: atk.idx }); if (def.drive !== undefined) def.drive = Math.max(0, def.drive - 0.5); }
    if (h.usb) s.addFx('say', def.x, def.ch.h + 150, { life: 60, s: '让她自己写', who: def.idx });      // GPT 的 U 盘
    def.hp = Math.max(0, def.hp - dmg); def.dmgTaken += dmg; def.lastDmgF = s.f; def.perfect = false; def.flash = 5;
    atk.meter = Math.min(100, atk.meter + (h.sup ? 0 : dmg * 0.19)); def.meter = Math.min(100, def.meter + dmg * 0.11);
    def.pinv = 0; if (def.drive !== undefined) def.drive = Math.max(0, def.drive - 0.1); def.combo++; def.comboDmg += dmg; def.comboF = s.f; def.box = null; def.counter = false; if (def.st === 'su' || def.st === 'sp') def.mv = null;
    const lvl = h.sup ? 3 : dmg >= 80 ? 2 : 1;
    if (def.hp <= 0) { setSt(def, 'launch'); def.vy = Math.max(h.launch || 0, 900); def.vx = dir * Math.max(h.kb || 0, 560); def.y = Math.max(def.y, 0.01); }
    else if (h.keep && def.st === 'stun') { /* 闪光连打：保持眩晕 */ }
    else if (h.launch || def.y > 0) { setSt(def, 'launch'); def.vy = h.launch || 650; def.vx = dir * (h.kb || 380); def.y = Math.max(def.y, 0.01); def.juggle++; }
    else { setSt(def, 'hit'); def.stun = h.stun ?? 18; def.vx = dir * (h.kb ?? 280); }
    if (pc && def.hp > 0 && def.st === 'hit' && src === 'melee' && (atk.st === 'heavy' || atk.atkK === 'shp' || atk.atkK === 'shk')) { setSt(def, 'stun'); def.stun = 46; def.vx = dir * 120; def.crumple = true; def.wall = false; def.box = null; def.mv = null;  }      // 重攻击确反：瘫软倒下（可以追打）
    if (s.ctrl.includes('human') && def.st === 'launch' && def.hp > 0) { def.wbOK = (h.kb || 0) >= 600 || hk.w === 'heavy' || hk.w === 'sup' || pc; def.gbOK = (hk.w === 'heavy' || hk.w === 'sup' || pc || h.ex || (src === 'melee' && atk.mv && atk.mv.ex)) && (h.launch || 0) >= 900; }      // 第 30 圈：重的一下打飞，可以撞墙反弹 / 落地弹一次（每段连击各一次）
    if (h.impact && def.hp > 0) impactHit(s, atk, def, false);
    if (atk.id === 'claude' && atk.atkK === 'mid' && atk.st === 'light' && src === 'melee') s.addFx('say', atk.x, atk.ch.h + 150, { life: 70, s: '你说得完全正确', who: atk.idx });
    if (atk.buff && atk.buff.k === 'nine' && src === 'melee' && !h.echo) (atk.echoQ = atk.echoQ || []).push({ f: s.f + 9, h: Object.assign({}, h, { dmg: Math.round(h.dmg * 0.4), echo: 1, launch: 0, stop: 4, id: undefined }) });      // 九条命：残影跟打一下
    if (def.hp > 0 && h.fxF) {
      if (h.fxF.freeze && def.st === 'hit') { setSt(def, 'freeze'); def.stun = h.fxF.freeze; def.vx = 0; s.emit('freeze', {}); }
      if (h.fxF.stun) { setSt(def, 'stun'); def.stun = h.fxF.stun; def.vx = 0; }
      if (h.fxF.pillar) def.pillarF = s.f + h.fxF.pillar;      // 炸毛光柱：画面上把人罩在光柱里
      if (h.fxF.slow) def.slow = h.fxF.slow;
      if (h.fxF.dumb) { def.dumb = h.fxF.dumb; s.addFx('text', def.x, def.ch.h + 110, { life: 60, s: '降智中', col: '#6B7280' }); }
      if (h.fxF.drain) { def.meter = 0; def.meterFill = 0; s.addFx('text', def.x, 440, { life: 54, s: '能量槽已修复为 0', col: '#E8743B' }); }
    }
    if ((def.x <= XMIN + 4 || def.x >= XMAX - 4) && atk.y <= 0 && src === 'melee') atk.vx = -dir * 260;
    let stop = h.stop ?? (lvl === 2 ? 7 : 4), shk = h.shake ?? (lvl === 2 ? 11 : 5);
    if (s.ctrl.includes('human') && !h.multi) { const g0 = { light: 7, mid: 9, heavy: 12, sp: 15, sup: 16 }[hk.w]; stop = Math.max(stop, g0 + (ctr ? 4 : 0)); shk = Math.max(shk, { light: 4, mid: 7, heavy: 13, sp: 14, sup: 20 }[hk.w]); }      // 有人玩时顿帧和震屏按轻重分级（电脑对电脑不变）
    s.hitstop = Math.max(s.hitstop, stop); s.shake = Math.max(s.shake, shk); s.hsLvl = hk.lv; atk.hitF = s.f; atk.hitStop = stop; atk.hitLv = hk.lv; def.hitLv = hk.lv; def.hitF = s.f;
    s.addFx('spark', px, py, { life: 18, tier: pc ? 2 : ctr ? 1 : 0, lvl: h.sup || pc ? 3 : (h.launch || dmg >= 80 || ctr) ? 2 : 1, col: atk.ch.col2, dir, kind: hk.k, who: atk.idx, src, mvid: atk.mv ? atk.mv.id : null, ak: atk.atkK || null }); s.addFx('num', px + (s.rng() - 0.5) * 30, py + 70, { life: 46, s: String(dmg), lvl });
    if (def.combo >= 2) atk.comboShow = { n: def.combo, f: s.f, dmg: def.comboDmg };
    s.emit('hit', { blk: 0, lvl, dmg, who: atk.idx, hp: def.hp, sup: !!h.sup, ctr: ctr || undefined, pc: pc || undefined, k: hk.k }); return 'hit';
  }
  // —— 电脑对手 ——
  function aiStep(s, me, op) {
    const A = me.ai, C = me.ch.ai, r = s.rng, inp = {}, lv = s.level[me.idx];
    const d = Math.abs(op.x - me.x), dir = op.x >= me.x ? 1 : -1, F = dir > 0 ? 'r' : 'l', B = dir > 0 ? 'l' : 'r';
    const neutral = me.st === 'idle' || me.st === 'walk', press = k => { if (!me.prev[k]) inp[k] = true; };
    const opOpen = canBeHit(op) && op.st !== 'launch';
    // 连段：这一下打中了，就按概率接下一下
    if ((me.st === 'light' || me.st === 'heavy') && me.hitOK && A.chained !== me.swing) {
      A.chained = me.swing; const q = r(), sid = me.ch.sp.id;
      if (me.meter >= 100 && q < 0.3 * lv) A.q = 'x';
      else if (me.st === 'light' && me.chain < 2 && q < 0.82) A.q = 'a';
      else if (me.st === 'light' && q < 0.93) A.q = 'b';
      else if (me.cd <= 0 && !['counter', 'script', 'popup'].includes(sid) && q < 0.6) A.q = 's'; else A.q = null;
      if (A.q) { press(A.q); A.q = null; }
    }
    // 威胁：对面的飞行物快到了，或对面在近处出招
    let th = 0;
    for (const p of s.P) { if (p.dead || p.own === me.idx || !p.dmg) continue; const dx = (p.x - me.x) * dir; if (p.vx && Math.sign(p.vx) === -dir && dx > 0 && dx < 330 && p.y < 430) th = 2; if ((p.kind === 'bigscroll' || p.kind === 'box' || p.kind === 'sign' || p.kind === 'tea') && Math.abs(p.x - me.x) < 230 && p.y < 620) th = 2; }
    if ((op.st === 'light' || op.st === 'heavy' || op.st === 'su' || (op.st === 'sp' && ['axe', 'pounce', 'scroll'].includes(op.mv && op.mv.id)) || (op.st === 'jump' && op.airAtk)) && d < 360) th = Math.max(th, 1);
    if (th) { if (!A.th) { A.th = true; A.roll = r() < Math.min(0.95, C.block * (th === 2 ? 1.25 : 1) * lv); A.cnt = me.ch.sp.id === 'counter' && me.cd <= 0 && r() < 0.34 * lv; A.jmp = th === 2 && !A.roll && r() < 0.3; } } else A.th = false;
    // 第 41 圈：人机对战才有的电脑（电脑对电脑 / 成片不走这里，chk.js 基准不变）：对空、确反，按难度 lv 决定成功率
    if (s.ctrl.includes('human') && neutral && lv > 0) {
      if (op.st === 'jump' && op.y > 60 && op.vy < 200 && Math.sign(op.vx || 0) !== dir && d < 330 && A.aaF !== s.f - op.t) { A.aaF = s.f - op.t; if (r() < Math.min(0.9, 0.55 * lv)) { press('b'); return inp; } }      // 对空：跳进来的人用上勾拳打下来
      if (['light', 'heavy', 'sp', 'impact'].includes(op.st) && op.boxSw === op.swing && !op.box && d < (C.range || 230) + 260) { if (A.pnF !== op.swing) { A.pnF = op.swing; A.pnGo = r() < Math.min(0.9, 0.55 * lv); } if (A.pnGo) { if (d < (C.range || 230) + 30) { A.pnGo = false; press(r() < 0.5 ? 'b' : 'a'); } else inp[F] = true; return inp; } }      // 确反：对面招式收招中（判定已经出过）就打
    }
    if (th && neutral) { if (A.cnt) { press('s'); A.cnt = false; return inp; } if (A.roll) { inp[B] = true; return inp; } if (A.jmp) { inp.u = true; inp[F] = true; A.jmp = false; return inp; } }
    if (!neutral) { if (me.st === 'jump' && !me.airAtk && d < 260 && me.vy < 300 && r() < 0.25) press('a'); return inp; }
    // 每 6 步想一次
    if (s.f >= A.until && (s.f + me.idx * 3) % 6 === 0) {
      const q = r(), sid = me.ch.sp.id, uid = me.ch.su.id; A.act = 'idle';
      const suOK = opOpen && ({ wave: d > 160, beam: d > 200, revenge: d < 950, drop: op.y <= 0, fix: d > 160 }[uid] ?? true);
      const spOK = { popup: d > 360, pounce: d > 230 && d < 660 && op.y <= 0, three: d > 400, axe: d < 300, scroll: d > 200 && d < 660, script: d > 320 && !s.E.some(e => e.kind === 'turret' && e.own === me.idx && !e.dead), alts: d > 300, counter: false, tea: d > 280 && d < 860 }[sid];
      if (me.meter >= 100 && suOK && q < (s.cheerWho === me.idx ? 1 : 0.22 * lv)) press('x');
      else if (me.cd <= 0 && spOK && opOpen && r() < C.sp * lv) press('s');
      else if (d > C.range + 30) {
        const q2 = r();
        if (C.zoner && d > C.far * 0.75 && q2 < 0.4) { A.act = 'idle'; A.until = s.f + 12 + (r() * 10 | 0); }
        else if (d > 540 && q2 < 0.2 && me.dashCd <= 0) { press('d'); inp[F] = true; }
        else if (d > 300 && d < 640 && q2 < 0.34) { inp.u = true; inp[F] = true; }
        else { A.act = 'fwd'; A.until = s.f + 8 + (r() * 12 | 0); }
      } else if (C.zoner && d < C.range - 10 && r() < 0.3) { if (r() < 0.4 && me.dashCd <= 0) { press('d'); inp[B] = true; } else { A.act = 'back'; A.until = s.f + 16 + (r() * 12 | 0); } }
      else if (!opOpen) { A.act = r() < 0.5 ? 'back' : 'idle'; A.until = s.f + 10; }
      else { const q2 = r(), ag = Math.min(1, lv); if (lv < 1) A.until = s.f + Math.round((1 - lv) * 60); if (q2 < 0.60 * ag) press('a'); else if (q2 < 0.80 * ag) press('b'); else if (q2 < 0.90) { A.act = 'back'; A.until = s.f + 14; } else { A.act = 'idle'; A.until = s.f + 8; } }
    }
    if (A.act === 'fwd') inp[F] = true; else if (A.act === 'back') inp[B] = true;
    return inp;
  }
  // ===== 人的指令系统（只有 ctrl 是 human 的一方会走到这里；电脑的决策和成片种子不受影响）=====
  // 方向用小键盘记号：1 2 3 = 后下 下 前下，4 5 6 = 后 中 前，7 8 9 = 上；「前 / 后」按按下那一刻的朝向归一
  const MW = 12;       // 相邻两个方向、最后一个方向到按键，都要在 12 步（200 毫秒）以内
  const dirOf = (i, face) => { const f = face > 0 ? i.r : i.l, b = face > 0 ? i.l : i.r; return 5 + (f && !b ? 1 : b && !f ? -1 : 0) + (i.dn ? -3 : i.u ? 3 : 0); };
  function updDirs(s, me, inp) {
    const i0 = inp || me.in || {}, d = dirOf(me.y > 0 && i0.u && !s.v1 ? Object.assign({}, i0, { u: false }) : i0, me.face), L = me.dirs || (me.dirs = []), last = L[L.length - 1];      // 第 75 圈：空中不认 ↑（跳起来还按着 ↑ 就搓 236，↑→ 不再变成 9 把指令搓坏）
    if (last && last.d === d) return;
    if (last && s.f - last.f > MW) { L.length = 0; if (last.d !== 5) L.push({ d: last.d, f: s.f - 1 }); }      // 隔太久就重记，但一直按着的那个方向留着（按住↓再搓→也算）
    L.push({ d, f: s.f }); if (L.length > 10) L.shift();
  }
  // 从长到短匹配：236236 → 623 → 236 → 214 → 22。允许偷懒：236 可以按成 ↓→，623 可以按成 →↓→
  function matchMotion(s, me, consume) {
    const L = me.dirs || []; let i = L.length - 1; while (i >= 0 && L[i].d === 5) i--;
    if (i < 0 || (me.latchAt != null ? me.latchAt : s.f) - L[i].f > MW) return null;
    const s5 = L.slice(0, i + 1).map(e => e.d).join(''), q = s5.replace(/5/g, '');
    const m = /23?63?23?6$/.test(q) ? '236236' : /21?41?21?4$/.test(q) ? '214214' : /63?21?4$/.test(q) && /6/.test(q.slice(-5)) ? '63214' : /41?23?6$/.test(q) && /4/.test(q.slice(-5)) ? '41236' : /63?2[36]$/.test(q) ? '623' : /23?6$/.test(q) ? '236' : /21?4$/.test(q) ? '214' : /[123]5+[123]$/.test(s5) ? '22' : null;
    if (m && consume) { me.dirsPrev = L.slice(); me.dirs = []; me.lastMot = { m, f: s.f }; }
    return m;
  }
  // ===== 第三版：四键制（MOVES_PLAN_3）—— 人的按键：a 轻拳 J / lk 轻脚 K / hp 重拳 U / hk 重脚 I；电脑仍用 a / b，走旧路径 =====
  // 这一步按下的键 → 指令：两个同时按（前后 2 步内）= 组合：轻拳 + 轻脚 = 投（th），重拳 + 重脚 = 算力冲击（imp），两拳 = EX 拳（ep），两脚 = EX 脚（ek）
  function humanCmd(s, me, P) {
    const B = { a: P('a'), lk: P('lk'), hp: P('hp'), hk: P('hk') }, ps = P('s'), px = P('x');
    if (P('tn') && !B.a && !B.lk && !B.hp && !B.hk && !ps && !px) return { k: 'tn' };      // 第 53 圈：Y = 挑衅
    if (!B.a && !B.lk && !B.hp && !B.hk && !ps && !px) return null;
    const LI = me.lzD || me.in; me.lzD = null; const fw = me.face > 0 ? LI.r : LI.l, bk = me.face > 0 ? LI.l : LI.r, ld = LI.dn ? 'd' : fw ? 'f' : bk ? 'b' : 'n';      // 懒人键按下那一刻的方向（进预输入后也不丢）
    if (px) return { k: 'x', d: ld };
    if (ps) return { k: 's1', d: ld };
    const L = me.lastP || (me.lastP = {}); for (const k in B) if (B[k]) L[k] = s.f;
    const near = k => s.f - (L[k] ?? -99) <= 2;
    let k = B.hp ? 'hp' : B.hk ? 'hk' : B.a ? 'a' : 'lk';
    if (near('a') && near('lk')) k = 'th'; else if (near('hp') && near('hk')) k = 'imp'; else if (near('a') && near('hp')) k = 'ep'; else if (near('lk') && near('hk')) k = 'ek';
    return { k, m: matchMotion(s, me, true) };
  }
  // 两个键前后差一两步：先出来的那一下还没打出去，就改成组合（投 / 算力冲击 / EX）
  function lateEx(s, me, op) {
    const c = me.cmd; if (!c || !['th', 'imp', 'ep', 'ek'].includes(c.k) || me.t > 3 || me.hitOK) return;
    if (!(me.st === 'light' || me.st === 'heavy' || (me.st === 'sp' && me.mv && me.mv.m && !me.mv.ex))) return;
    const m = c.m || (me.st === 'sp' ? me.mv.m : (me.lastMot && s.f - me.lastMot.f <= 3 ? me.lastMot.m : null));
    me.st = 'idle'; me.t = 0; me.buf = null; me.mv = null; if (doCmd(s, me, op, Object.assign({}, c, { m }), false)) me.cmd = null;
  }
  // 每个角色哪个指令出哪一招：拳（J / U）查 HMOVJ → HMOV → 默认（236 = 招牌波，623 = 升龙）；脚（K / I）只查 HMOVK；214 + 脚 = 旋风腿（九人都有）
  const HMOV = {}, HMOVHP = { ds: { '214': 'plead' } };
  let moveOf = (me, m, btn, str) => {      // 半圈指令没有招就退回成 214 / 236；饭量不够的招不出
    let id = moveOf0(me, m, btn, str); if (id && REQ[id] && (me.rice || 0) < REQ[id]) id = LVFB[id] || null;      // 饭量不够：有低级版就出低级版
    if (id == null && m === '63214') id = moveOf(me, btn === 'k' ? '214k' : '214', btn, str);
    if (id == null && m === '41236') id = moveOf(me, '236', btn, str);
    return id;
  };
  const moveOf0 = (me, m, btn, str) => {
    if (m === '214k') { const B = HMOVK[me.id]; return B && B['214'] ? B['214'] : 'spin'; }
    if (btn === 'k') { const B = HMOVK[me.id]; return B && B[m] !== undefined ? B[m] : null; }
    const H = str === 'b' && HMOVHP[me.id]; if (H && H[m] !== undefined) return H[m];
    const B = HMOVJ[me.id]; if (B && B[m] !== undefined) return B[m];
    const T = HMOV[me.id]; if (T && T[m] !== undefined) return T[m];
    return m === '236' ? me.ch.sp.id : m === '623' ? 'dp' : null;
  };
  // 人的普通技（MOVES_PLAN_3 第 2 节的帧数据；stun / bstun 按「命中后优势 / 被防后」反推）。lt = 轻攻击（可连打），can = 可取消成必杀
  const ATK2 = {
    slp: { su: 4, ac: 3, rc: 7, x0: 10, x1: 190, y0: 120, y1: 360, dmg: 30, stun: 13, bstun: 8, kb: 200, stop: 6, sep: 220, lt: 1, can: 1 },
    slk: { su: 5, ac: 3, rc: 9, x0: 10, x1: 215, y0: 40, y1: 240, dmg: 35, stun: 13, bstun: 8, kb: 220, stop: 6, sep: 230, lt: 1, can: 1 },
    shp: { su: 9, ac: 4, rc: 18, x0: 10, x1: 225, y0: 80, y1: 380, dmg: 80, stun: 24, bstun: 17, kb: 320, stop: 11, sep: 245, can: 1 },
    shpc: { su: 6, ac: 4, rc: 16, x0: 10, x1: 200, y0: 80, y1: 380, dmg: 75, stun: 22, bstun: 16, kb: 300, stop: 11, sep: 220, can: 1 },      // 近身重拳（拳皇式近 / 远之分）
    shk: { su: 12, ac: 5, rc: 20, x0: 10, x1: 262, y0: 80, y1: 380, dmg: 90, stun: 25, bstun: 16, kb: 420, stop: 12, sep: 265 },
    shkc: { su: 8, ac: 4, rc: 18, x0: 10, x1: 220, y0: 60, y1: 360, dmg: 85, stun: 24, bstun: 15, kb: 380, stop: 12, sep: 230, can: 1 },
    clp: { su: 4, ac: 3, rc: 7, x0: 10, x1: 185, y0: 0, y1: 220, dmg: 28, stun: 13, bstun: 8, kb: 200, stop: 5, sep: 215, crouch: 1, lt: 1, can: 1 },
    clk: { su: 5, ac: 3, rc: 8, x0: 10, x1: 205, y0: 0, y1: 110, dmg: 30, stun: 13, bstun: 8, kb: 200, stop: 5, sep: 225, crouch: 1, low: 1, lt: 1, can: 1 },
    chp: { su: 8, ac: 6, rc: 20, x0: -20, x1: 175, y0: 120, y1: 580, dmg: 85, launch: 950, kb: 200, bstun: 15, stop: 11, sep: 200, crouch: 1, up: 1, can: 1 },      // 蹲重拳：对空
    chk: { su: 10, ac: 4, rc: 24, x0: 10, x1: 262, y0: 0, y1: 110, dmg: 80, launch: 420, kb: 300, bstun: 15, stop: 9, low: 1, crouch: 1, sep: 245 },      // 扫腿
    fhk: { su: 14, ac: 5, rc: 18, x0: 10, x1: 245, y0: 60, y1: 380, dmg: 85, stun: 24, bstun: 14, kb: 420, stop: 12, sep: 250, fwdstep: 1 },      // → + 重脚：踏步踢
    bhk: { su: 10, ac: 5, rc: 20, x0: 10, x1: 232, y0: 60, y1: 380, dmg: 75, stun: 22, bstun: 12, kb: 520, stop: 11, sep: 240, backstep: 1 },      // ← + 重脚：后撤踢
    jlp: { su: 4, ac: 34, x0: 0, x1: 170, y0: -40, y1: 260, dmg: 40, stun: 18, bstun: 10, kb: 200, stop: 7 },
    gstep: { su: 12, ac: 4, rc: 16, x0: 0, x1: 225, y0: 60, y1: 300, dmg: 72, stun: 22, bstun: 12, kb: 300, stop: 11, fwdstep: 1, can: 1 },      // GLM → + 重脚：前踏步踢
    gelb: { su: 8, ac: 4, rc: 14, x0: 0, x1: 175, y0: 150, y1: 400, dmg: 64, stun: 22, bstun: 10, kb: 260, stop: 10, can: 1 },      // GLM ← + 重拳：回身肘（快）
    kshp: { su: 12, ac: 5, rc: 20, x0: 40, x1: 560, y0: 160, y1: 330, dmg: 58, stun: 20, bstun: 12, kb: 240, stop: 9 },      // Kimi 重拳：卷轴甩出半个屏幕
    kshk: { su: 13, ac: 5, rc: 22, x0: 40, x1: 600, y0: 0, y1: 110, dmg: 54, stun: 20, bstun: 12, kb: 220, stop: 9, low: 1 },      // Kimi 重脚：卷轴贴地扫（下段）
    kchp: { su: 9, ac: 5, rc: 20, x0: 20, x1: 420, y0: 180, y1: 620, dmg: 58, launch: 760, kb: 200, bstun: 12, stop: 10, crouch: 1, up: 1 },      // Kimi 蹲重拳：卷轴斜向上（对空）
    flipk: { su: 16, ac: 5, rc: 16, x0: 0, x1: 200, y0: 60, y1: 420, dmg: 70, stun: 22, bstun: 12, kb: 260, stop: 11, high: 1 },      // 豆包 → + 重脚：翻身踢（中段）
    fclaw: { su: 6, ac: 3, rc: 12, x0: 10, x1: 205, y0: 120, y1: 380, dmg: 26, stun: 16, bstun: 9, kb: 120, stop: 6, sep: 210, can: 1, twice: 1 },      // 哈基米 → + 轻拳：两段爪
    jlkb: { su: 5, ac: 30, x0: -215, x1: 20, y0: -80, y1: 170, dmg: 42, stun: 18, bstun: 10, kb: -200, stop: 7 },      // 哈基米 空中 ← + 轻脚：往身后踢（逆向）
    jlk: { su: 5, ac: 34, x0: -75, x1: 150, y0: -80, y1: 160, dmg: 40, stun: 18, bstun: 10, kb: 200, stop: 7 },      // 跳轻脚：身后也有判定（逆向）
    jhp: { su: 6, ac: 22, x0: 0, x1: 190, y0: -90, y1: 220, dmg: 70, stun: 22, bstun: 13, kb: 260, stop: 10, shake: 8 },
    jhk: { su: 6, ac: 22, x0: 10, x1: 235, y0: -60, y1: 200, dmg: 70, stun: 22, bstun: 13, kb: 300, stop: 10 },
    clight: { su: 4, ac: 3, rc: 9, x0: 10, x1: 185, y0: 0, y1: 200, dmg: 30, stun: 16, bstun: 8, kb: 220, stop: 5, sep: 215, crouch: 1 },      // 旧名字，留着兼容
    sweep: { su: 9, ac: 4, rc: 24, x0: 10, x1: 255, y0: 0, y1: 110, dmg: 60, launch: 420, kb: 300, bstun: 14, stop: 8, low: 1, crouch: 1, sep: 240 },
  };
  function startAtkH(s, me, k) {
    if (!ATK2[k]) return startAtk(s, me, k);
    const A = ATK2[KOVR[me.id] && KOVR[me.id][k] || k] || ATK2[k]; k = KOVR[me.id] && KOVR[me.id][k] || k; me.atk = A; me.atkK = k; me.box = null; me.gArm = 0; if (me.id === 'grok' && /^(shp|shpc|shk|shkc)$/.test(k)) { me.gArm = 1; me.armor = 1; } setSt(me, A.lt || k === 'clight' ? 'light' : 'heavy'); me.swing++; me.hitDone = {}; me.hitOK = false; me.blkOK = false; me.buf = null; me.vx = 0; me.autoC = false;      // Grok 的重普通技带一下霸体
    s.emit('whoosh', { lvl: A.lt ? 1 : 2, who: me.idx });
  }
  function startMove(s, me, op, m, v, ex, useCd, btn = 'p') {
    const id = moveOf(me, m, btn, v); if (!id || !SPF[id]) return false;
    if (COST[id] && !canDrive(me, COST[id])) return false;
    if (me.dumb > 0 && (s.f % 10) < 3) { s.addFx('text', me.x, me.ch.h + 100, { life: 40, s: '降智中…', col: '#6B7280' }); startAtkH(s, me, 'slp'); return true; }      // 被「降智」：三成概率必杀变普通攻击
    if (m === '236' && s.P.filter(p => !p.dead && p.own === me.idx && p.mvp).length >= (s.o.cdm === 'fast' && isHum(s, me) ? 2 : 1)) return false;      // 第 68 圈：爽快模式下人可以同时有两发      // 场上已经有一发自己的波，就不能再发
    if (me.buff && me.buff.k === 'ot' && !NOEX[id]) { ex = 'free'; v = 'b'; }      // 二级超必杀「全力加班」：必杀全变 EX、不耗算力
    if (ex && NOEX[id]) { ex = false; v = 'b'; }
    if (COST[id]) useDrive(s, me, COST[id]);
    setSt(me, 'sp'); me.mv = { id, v, ex: !!ex, m }; if (s.ctrl[me.idx] === 'human') me.box = null; if (useCd) me.cd = cdOf(s, me);      // 人取消出招时把上一招残留的判定框清掉（否则同一帧会白打一下）
    if (me.id === 'qwen' && me.coupon > 0 && typeof CPN !== 'undefined' && CPN[id] && s.ctrl[me.idx] === 'human') { me.coupon--; me.mv.cp = 1; }      // 千问：带满减券的必杀多一段
    me.swing++; me.hitDone = {}; me.hitOK = false; me.vx = 0; me.buf = null;
    if (ex) { if (ex !== 'free') useDrive(s, me, 2); s.addFx('ring', me.x, 220, { life: 22, col: '#FFE066' }); s.addFx('text', me.x, me.ch.h + 120, { life: 40, s: 'EX', col: '#FF8A1F' }); s.hitstop = Math.max(s.hitstop, 4); s.emit('ex', { who: me.idx }); }
    if (id === me.ch.sp.id) sticker(me, me.ch.sp.stk, 64);
    s.emit('sp', { id, who: me.idx }); return true;
  }
  const throwable = f => f.y <= 0 && f.invul <= 0 && ['idle', 'walk', 'crouch', 'light', 'heavy', 'sp', 'dash', 'parry', 'drush'].includes(f.st);
  const PUN = { a: 1, hp: 1, ep: 1 }, KIK = { lk: 1, hk: 1, ek: 1 };
  // 执行一条指令；cancel = 普通技命中后的取消（只能接必杀、超必杀和连打）
  function doCmd(s, me, op, c, cancel) {
    const inp = me.in, fwd = me.face > 0 ? inp.r : inp.l, back = me.face > 0 ? inp.l : inp.r;
    if (c.k === 'x') return lazySuper(s, me, op, { d: 3, f: 2 }[c.d || 'n'] || 1);      // 懒人键：H / ; = 一级，→ + H = 二级，↓ + H = 三级
    if (c.k === 's1') return lazySp(s, me, op, c.d || 'n');      // 懒人键：O = 236 系，→ + O = 623 系，← + O = 214 系，↓ + O = 22 系
    const isP = !!PUN[c.k], isK = !!KIK[c.k], str = (c.k === 'hp' || c.k === 'hk') ? 'b' : 'a', ex = (c.k === 'ep' || c.k === 'ek') && canDrive(me, 2), btn = isK ? 'k' : 'p', m = c.m;
    if (cancel && !(me.st === 'sp' && (m === '236236' || m === '214214'))) { const A = me.atk || {}; if (!(A.can || ['light', 'light2', 'light3', 'mid', 'fwdk'].includes(me.atkK))) return false; }      // 第 67 圈：必杀技里搓超必杀不受普通技取消表限制（爆廻 → 三级）
    if (c.k === 'ek' && !m && me.id === 'grok' && !cancel) { setSt(me, 'sp'); me.mv = { id: 'lwindmill', v: 'b' }; me.swing++; me.hitDone = {}; me.hitOK = false; me.vx = 0; s.emit('sp', { id: 'lwindmill', who: me.idx }); return true; }      // Grok K + I：下段大风车
    if (c.k === 'ep' && !m && me.id === 'grok' && !cancel) { setSt(me, 'sp'); me.mv = { id: 'windmill', v: 'b' }; me.swing++; me.hitDone = {}; me.hitOK = false; me.vx = 0; s.emit('sp', { id: 'windmill', who: me.idx }); return true; }      // Grok J + U：大风车
    if (c.k === 'kkk') { { setSt(me, 'sp'); me.mv = { id: 'kkk', v: 'a' }; me.swing++; me.hitDone = {}; me.hitOK = false; me.vx = 0; me.box = null; s.emit('sp', { id: 'kkk', who: me.idx }); return true; } }      // 豆包 连按轻脚：踢踢踢
    if (c.k === 'tn') { if (cancel || me.y > 0.02) return false; setSt(me, 'taunt'); me.vx = 0; me.box = null; s.emit('taunt', { who: me.idx }); return true; }      // 挑衅：原地 70 步，能被打（街霸 6 式，没有收益，纯表演）
    if (c.k === 'th') { if (cancel) return false; setSt(me, 'throw'); me.mv = { got: 0, back: !!back }; me.vx = 0; me.swing++; s.emit('whoosh', { lvl: 1, who: me.idx }); return true; }      // 轻拳 + 轻脚 = 投（按着 ← 往身后摔）
    if (c.k === 'imp') { if (cancel || !canDrive(me, 1)) return false; useDrive(s, me, 1); startAtk3(s, me, 'impact'); return true; }      // 重拳 + 重脚 = 算力冲击
    if (m === '236236') { if (startSuperH(s, me, op, isP ? 1 : 3)) return true; }
    else if (m === '214214' && isP) { if (startSuperH(s, me, op, 2)) return true; }
    else if (m === '214214' && isK && typeof SUHK !== 'undefined' && SUHK[me.id] && SUHK[me.id][2] && me.meter >= 2 * BAR - 0.01) { const U = SUHK[me.id][2]; me.meter -= 2 * BAR; setSt(me, 'sp'); me.mv = { id: U.id }; me.swing++; me.hitDone = {}; me.hitOK = false; me.vx = 0; me.invul = Math.max(me.invul, U.inv); s.freeze = 30; s.fz = { who: me.idx, f0: s.f, name: U.name, len: 30, lv: 2 }; s.emit('su', { id: U.id, who: me.idx }); return true; }      // 二级的脚版（目前只有 GLM）
    else if (m && (isP || isK)) { const mm = m === '214' && isK ? '214k' : m; if (startMove(s, me, op, mm, ex ? 'b' : str, ex, false, btn)) return true; }
    if (cancel) {
      const k0 = me.atkK, A = me.atk || {};
      if (k0 === 'slp' && c.k === 'a' && !inp.dn) { me.chain = 1; startAtk(s, me, 'light'); me.autoC = true; return true; }      // J 连按：直拳 → 上勾拳 → 侧踢（辅助连段，伤害 ×0.8）
      if (k0 === 'light2' && c.k === 'a' && me.autoC) { me.chain = 2; startAtk(s, me, 'light'); me.autoC = true; return true; }
      if (A.lt && (c.k === 'a' || c.k === 'lk') && (me.chain || 0) < 2) { me.chain = (me.chain || 0) + 1; startAtkH(s, me, inp.dn ? (c.k === 'a' ? 'clp' : 'clk') : (c.k === 'a' ? 'slp' : 'slk')); return true; }      // 轻攻击连打，最多 3 下
      return false;
    }
    me.chain = 0;
    if (inp.dn) { startAtkH(s, me, { a: 'clp', lk: 'clk', hp: 'chp', hk: 'chk', ep: 'chp', ek: 'chk' }[c.k]); return true; }
    if (c.k === 'a' && fwd && me.id === 'gem') { startAtkH(s, me, 'fclaw'); return true; }      // 哈基米 → + 轻拳：两段爪（可取消）
    if (c.k === 'a' && fwd) { startAtk3(s, me, 'mid'); return true; }      // → + 轻拳：中段
    if (c.k === 'hp' && fwd && me.helmet > 0) { setSt(me, 'sp'); me.mv = { id: 'hcharge', v: 'b' }; me.swing++; me.hitDone = {}; me.hitOK = false; me.vx = 0; s.emit('whoosh', { lvl: 2, who: me.idx }); return true; }      // 戴着盆：头盔冲撞
    if (me.id === 'glm' && c.k === 'hp' && fwd && !cancel) { startAtkH(s, me, 'ghammer'); return true; }      // GLM → + 重拳：中段锤
    if (c.k === 'hp' && fwd && me.id === 'grok' && !cancel) { setSt(me, 'sp'); me.mv = { id: 'hbutt', v: 'b' }; me.swing++; me.hitDone = {}; me.hitOK = false; me.vx = 0; s.emit('sp', { id: 'hbutt', who: me.idx }); return true; }      // Grok → + 重拳：头槌
    if (c.k === 'hp' && fwd) { startAtk3(s, me, 'fwdk'); return true; }      // → + 重拳：前冲重击
    if (me.id === 'glm' && c.k === 'hk' && fwd) { startAtkH(s, me, 'gstep'); return true; }      // GLM → + 重脚：前踏步踢
    if (me.id === 'glm' && c.k === 'hp' && back) { startAtkH(s, me, 'gelb'); return true; }      // GLM ← + 重拳：回身肘
    if (me.id === 'glm' && c.k === 'hk' && back) { startAtkH(s, me, 'gsob'); return true; }      // GLM ← + 重脚：倒钩踢
    if (c.k === 'hk' && back && me.id === 'dou') { startAtkH(s, me, 'daxe'); return true; }      // 豆包 ← + 重脚：跨步下劈（中段）
    if (c.k === 'hk' && fwd && me.id === 'dou') { startAtkH(s, me, 'flipk'); return true; }      // 豆包 → + 重脚：翻身踢（中段，越过下段）
    if (c.k === 'hk' && fwd) { startAtkH(s, me, 'fhk'); return true; }
    if (c.k === 'hk' && back) { startAtkH(s, me, 'bhk'); return true; }
    const close = Math.abs(op.x - me.x) < 175 + pwx(me, op);
    startAtkH(s, me, { a: 'slp', lk: 'slk', hp: close ? 'shpc' : 'shp', hk: close ? 'shkc' : 'shk', ep: 'shp', ek: 'shk' }[c.k]); return true;
  }
  // 站立 / 走路 / 蹲 时人的操作
  function humanNeutral(s, me, op, P, spd) {
    if (me.burn) spd *= 0.7;      // 宕机：动作变慢
    const inp = me.in;
    if (op.x !== me.x) me.face = op.x > me.x ? 1 : -1;
    const fwd = me.face > 0 ? inp.r : inp.l, back = me.face > 0 ? inp.l : inp.r;
    me.holdBack = !!back && !fwd;
    if (me.combo && s.f - me.comboF > 20) { me.combo = 0; me.gbDone = me.wbDone = 0; me.comboDmg = 0; me.juggle = 0; }
    me.rushBuff = 0;
    if (humanDriveNeutral(s, me, op, P)) return;
    const c = me.cmd || (me.nbuf && me.nbuf.c); me.nbuf = null;
    if (c && doCmd(s, me, op, c, false)) return;
    if (P('rl')) { setSt(me, 'roll'); me.mv = { dir: back ? -me.face : me.face }; me.invul = Math.max(me.invul, 12); me.vx = 0; s.emit('dash', { who: me.idx }); s.addFx('dust', me.x, 0, { life: 18 }); return; }      // 翻滚：穿过对手，前 12 步无敌
    const dt = takeDtap(s, me);      // 双击 前 / 后 = 冲刺 / 后撤步
    if (dt && !inp.dn && me.dashCd <= 0) { setSt(me, 'dash'); me.mv = { dir: dt * me.face, back: dt < 0 }; me.dashCd = 34; if (dt < 0) me.invul = Math.max(me.invul, 7); s.emit('dash', { who: me.idx }); s.addFx('dust', me.x, 0, { life: 18 }); return; }
    if (inp.u) { const sup = (me.dirs || []).some(e => e.d <= 3 && s.f - e.f <= 10); setSt(me, 'jsq'); me.mv = { dir: inp.r ? 1 : inp.l ? -1 : 0, sup }; me.vx = 0; return; }      // 起跳前 3 步：松得快 = 小跳，按住 = 普通跳，↓ 后马上 ↑ = 大跳
    if (inp.dn) { if (me.st !== 'crouch') setSt(me, 'crouch'); me.vx = me.id === 'glm' && (inp.l || inp.r) && !((me.face > 0 ? inp.l : inp.r)) ? me.face * spd * 0.4 : 0; return; }      // 蹲；蹲着往后按 = 蹲防      // GLM 能蹲着往前走
    if (inp.l || inp.r) { if (me.st !== 'walk') { me.st = 'walk'; me.walkT = 0; } me.walkT++; me.vx = (inp.r ? 1 : -1) * spd * (back ? 0.75 : 1); } else { me.st = 'idle'; me.vx = 0; }
  }
  function stepJsq(s, me, spd) {
    if (me.cmd && me.cmd.m && (me.cmd.m === '360' || me.cmd.m === '28c')) { const c = me.cmd; me.cmd = null; setSt(me, 'idle'); if (doCmd(s, me, s.F[1 - me.idx], c, false)) return; }      // 起跳前 3 步里出指令：转一圈投、↓蓄↑ 都是以 ↑ 结尾
    if (me.t < 3) return;
    const short = !me.in.u && !me.mv.sup, sup = me.mv.sup, d = me.mv.dir; setSt(me, 'jump'); me.hop = short;
    const hj = HJ(s); me.vy = hj ? (sup ? JV.sup : short ? JV.short : JV.full) : sup ? 1600 : short ? 1040 : 1380; me.jg = hj ? JG : 0; me.vx = d * spd * (short ? 1.15 : sup ? 1.25 : 0.95); me.y = 0.01; me.airAtk = 0; me.airK = null; me.wj = 0; me.floated = 0; me.floatT = 0;
    s.emit('jump', { who: me.idx }); s.addFx('dust', me.x, 0, { life: sup ? 22 : 16, big: sup });
  }
  function humanAir(s, me) {      // 跳攻击：四个键各一招；判定一直持续到落地附近
    const c = me.cmd, back = me.face > 0 ? me.in.l : me.in.r;
    if (c && c.k === 's1' && !s.v1) { const A = AIRSP[me.id] || {}, pref = { n: ['236p', '236k', '214p', '214k'], b: ['214p', '214k', '236p', '236k'], f: ['236k', '236p', '214k'], d: ['214k', '236k', '214p', '236p'] }[c.d || 'n'] || []; let id = null, v = 'a';      // 第 75 圈：懒人键 O 在空中 = 这个角色的空中必杀（按方向挑，没有就用 ↓ + 键那一招）
      for (const k of pref.concat(Object.keys(A))) { const x = A[k]; if (x && (me.rice || 0) >= airReq(s, x)) { id = x; break; } }
      if (c.d === 'd' && LZAIRD[me.id]) { id = LZAIRD[me.id]; v = 'b'; }      // ↓ + O：↓ + 键那一招优先
      if (!id && LZAIR[me.id]) { id = LZAIR[me.id]; v = 'b'; }
      if (id) { me.cmd = null; setSt(me, 'sp'); me.mv = { id, v, air: 1, lazy: 1 }; me.swing++; me.hitDone = {}; me.hitOK = false; me.box = null; me.floatT = 0; s.emit('sp', { id, who: me.idx }); return; } }
    if (c && c.m && AIRSP[me.id]) { const id = AIRSP[me.id][c.m + (KIK[c.k] ? 'k' : 'p')]; if (id && (me.rice || 0) >= airReq(s, id)) { me.cmd = null; setSt(me, 'sp'); me.mv = { id, v: c.k === 'hp' || c.k === 'hk' ? 'b' : 'a', air: 1 }; me.swing++; me.hitDone = {}; me.hitOK = false; me.box = null; s.emit('sp', { id, who: me.idx }); return; } }      // 空中必杀
    if (WALLJ[me.id] && !me.wj && me.in.u && !me.prev.u && (me.x <= XMIN + 60 || me.x >= XMAX - 60) && me.y > 60) { me.wj = 1; me.wjF = s.f; me.vy = me.jg ? JV.wall : 1250; me.vx = (me.x <= XMIN + 60 ? 1 : -1) * 720; me.face = Math.sign(me.vx); me.airAtk = 0; s.emit('jump', { who: me.idx }); s.addFx('dust', me.x, me.y, { life: 14, small: true }); }      // 哈基米 三角跳：贴墙再按 ↑
    if (me.id === 'kimi' && me.in.u && !me.floated && me.vy < 0 && me.y > 120) { me.floated = 1; me.floatT = 90; s.addFx('text', me.x, me.y + me.ch.h + 60, { life: 40, s: 'zzz', col: '#C9D4EE' }); }      // Kimi 空中按住 ↑：睡着飘 1.5 秒
    if (me.floatT > 0) { me.floatT--; if (me.in.u) { me.vy = Math.max(me.vy, 0) * 0 + 40; me.vx *= 0.96; } else me.floatT = 0; }
    const opA = s.F[1 - me.idx];
    if (c && !me.airAtk && (me.id === 'qwen' || me.id === 'grok') && c.k === 'th' && opA.y > 40 && (opA.st === 'jump' || ['light', 'heavy'].includes(opA.st)) && Math.abs(opA.x - me.x) < 210 && Math.abs(opA.y - me.y) < 220 && opA.invul <= 0) { me.cmd = null; setSt(me, 'sp'); me.mv = { id: 'athrow', v: 'a', air: 1 }; me.swing++; me.hitDone = {}; me.hitOK = false; s.emit('sp', { id: 'athrow', who: me.idx }); return; }      // 千问 空中 J+K：空投（只抓空中的对手）
    if (c && !me.airAtk && me.id === 'qwen' && PUN[c.k] && me.wj && s.f - me.wjF < 30) { me.cmd = null; setSt(me, 'sp'); me.mv = { id: 'glide', v: 'b', air: 1, wall: 1 }; me.swing++; me.hitDone = {}; me.hitOK = false; s.emit('sp', { id: 'glide', who: me.idx }); return; }      // 千问 三角跳后马上按拳：弹射俯冲
    if (c && !me.airAtk && me.id === 'grok' && c.k === 'hp' && me.in.dn) { me.cmd = null; setSt(me, 'sp'); me.mv = { id: 'splash', v: 'b', air: 1 }; me.swing++; me.hitDone = {}; me.hitOK = false; s.emit('sp', { id: 'splash', who: me.idx }); return; }      // Grok 空中 ↓ + 重拳：飞身压
    if (c && !me.airAtk && me.id === 'gpt' && c.k === 'hk' && me.in.dn) { me.cmd = null; setSt(me, 'sp'); me.mv = { id: 'gdive', v: 'b', air: 1 }; me.swing++; me.hitDone = {}; me.hitOK = false; s.emit('sp', { id: 'gdive', who: me.idx }); return; }      // GPT 空中 ↓ + 重脚：敲黑板
    if (c && !me.airAtk && me.id === 'kimi' && c.k === 'hp' && me.in.dn) { me.cmd = null; setSt(me, 'sp'); me.mv = { id: 'drill', v: 'b', air: 1 }; me.swing++; me.hitDone = {}; me.hitOK = false; me.floatT = 0; s.emit('sp', { id: 'drill', who: me.idx }); return; }      // Kimi 空中 ↓ + 重拳：钻头
    if (c && !me.airAtk && me.id === 'qwen' && c.k === 'hk' && me.in.dn) { me.cmd = null; setSt(me, 'sp'); me.mv = { id: 'dive', v: 'b', air: 1 }; me.swing++; me.hitDone = {}; me.hitOK = false; s.emit('sp', { id: me.mv.id, who: me.idx }); return; }      // 千问 空中 ↓ + 重脚：俯冲踢
    if (c && !me.airAtk && me.id === 'dou' && c.k === 'lk' && me.in.dn) { me.cmd = null; setSt(me, 'sp'); me.mv = { id: 'stomp', v: 'a', air: 1 }; me.swing++; me.hitDone = {}; me.hitOK = false; s.emit('sp', { id: me.mv.id, who: me.idx }); return; }      // 豆包 空中 ↓ + 轻脚：踩头
    if (c && !me.airAtk && me.id === 'gem' && c.k === 'lk' && back) { const k = 'jlkb'; me.airAtk = 1; me.airT = 0; me.airK = k; me.atkK = k; me.swing++; me.hitDone = {}; me.hitOK = false; s.emit('whoosh', { lvl: 1, who: me.idx }); }      // 空中 ← + 轻脚：逆向踢
    if (c && !me.airAtk && (PUN[c.k] || KIK[c.k])) { const k = { a: 'jlp', lk: 'jlk', hp: 'jhp', hk: 'jhk', ep: 'jhp', ek: 'jhk' }[c.k]; me.airAtk = 1; me.airT = 0; me.airK = k; me.atkK = k; me.swing++; me.hitDone = {}; me.hitOK = false; s.emit('whoosh', { lvl: k[1] === 'h' ? 2 : 1, who: me.idx }); }
    if (me.airAtk === 1 && me.airK) { me.airT++; const A = ATK2[me.airK]; if (me.airT >= A.su && me.airT < A.su + A.ac) me.box = Object.assign({ id: 'air' + me.swing }, A); }
  }
  // 投：第 3 步判定，抓到就举起来，第 20 步摔出去；被抓 8 步内对方按轻拳 + 轻脚 = 拆投
  function stepThrow(s, me, op) {
    const M = me.mv; me.vx = 0;
    if (!M.got) {
      if (me.t === 3 && Math.abs(op.x - me.x) < 210 + pwx(me, op) && throwable(op)) { M.got = me.t; M.gotF = s.f; setSt(op, 'held'); op.vx = 0; op.vy = 0; op.box = null; op.mv = null; op.hy = 0; op.techF = -99; s.hitstop = Math.max(s.hitstop, 6); s.emit('whoosh', { lvl: 2, who: me.idx }); s.addFx('text', op.x, 470, { life: 40, s: '抓住了！', col: me.ch.col }); }
      if (!M.got && me.t >= 28) setSt(me, 'idle');
      return;
    }
    const k = me.t - M.got;
    if (op.st === 'held' && op.techF >= M.gotF && op.techF - M.gotF <= 14 && k <= 10) {      // 拆投：双方弹开
      setSt(op, 'idle'); op.hy = 0; setSt(me, 'idle'); me.vx = -me.face * 560; op.vx = me.face * 560; s.hitstop = Math.max(s.hitstop, 8);
      s.addFx('text', (me.x + op.x) / 2, 470, { life: 46, s: '拆投！', col: '#FFE066' }); s.addFx('ring', (me.x + op.x) / 2, 250, { life: 18, col: '#FFFFFF' }); s.emit('hit', { blk: 1, lvl: 1 }); return;
    }
    const q = k < 14 ? Math.sin(k / 14 * Math.PI / 2) : Math.max(0, 1 - (k - 14) / 6);      // 举起来 → 停一下 → 往地上摔
    if (op.st === 'held') { op.x = clamp(me.x + me.face * (175 - 25 * q), XMIN, XMAX); op.hy = q * 170; }
    if (k === 20 && op.st === 'held') { op.hy = 0; if (M.back) op.x = clamp(me.x - me.face * 150, XMIN, XMAX); hit(s, me, op, { dmg: 110, unblock: true, launch: 760, kb: 540, stop: 10, shake: 16 }, op.x, 180, 'throw'); }
    if (k >= 40) setSt(me, 'idle');
  }
  // 受身：被打倒落地后 10 步内按任意攻击键 = 快速起身；按住 ← = 往后翻滚起身
  function humanTech(s, me) {
    if (me.st !== 'down' || me.t > 10 || me.hp <= 0) return;
    const back = me.face > 0 ? me.in.l : me.in.r;
    if (me.cmd || (back && !(me.face > 0 ? me.prev.l : me.prev.r))) { me.cmd = null; setSt(me, 'getup'); me.t = 6; me.vx = back ? -me.face * 520 : 0; s.addFx('text', me.x, me.ch.h + 60, { life: 36, s: '受身', col: '#DFF4FF' }); }
  }
  // ===== 三件套（九人都有）：旋风腿 214 + 脚；升龙 623 + 拳默认 dp；波：Grok 回旋斧、GLM Z 字飞书、Claude 长回复 =====
  Object.assign(HMOV, { grok: { '236': 'boom', '214': 'axe' }, glm: { '236': 'boom' }, claude: { '236': 'paper', '214': 'counter' } });
  Object.assign(SPF, {
    spin(s, me, op, t) {      // 旋风腿：离地一点点旋转前进，多段，最后一下打飞；能越过下段（悬在半空），空中也能放
      const H = me.mv.v === 'b' || me.mv.ex, n = me.mv.ex ? 5 : H ? 4 : 3, su = 6, per = 8, end = su + n * per;
      if (t === 1 && me.y > 1) me.mv.air = 1;
      if (t === su) { me.y = Math.max(me.y, 70); s.emit('whoosh', { lvl: 2, who: me.idx }); }
      if (t >= su && t < end) { me.vx = me.face * (H ? 520 : 400); me.vy = 70; me.mv.low = 1; const k = Math.floor((t - su) / per); me.box = { id: 'spin' + me.swing + '_' + k, x0: -110, x1: 165, y0: -30, y1: 330, dmg: H ? 34 : 30, stun: 18, kb: k === n - 1 ? 420 : 140, bstun: 9, stop: 5, multi: 1, launch: k === n - 1 ? 650 : 0 }; if (me.mv.ex) me.pinv = 1; }
      if (t >= end) { me.vx *= 0.7; me.pinv = 0; }
      if (t > end && me.y <= 0) { if (!me.mv.land) { me.mv.land = t; me.vx = 0; } return t - me.mv.land >= (H ? 16 : 10); }
      return t > end + 60;
    },
    boom(s, me, op, t) {      // 回旋飞行道具：飞出去再飞回来，去回都有判定（Grok 的斧子、GLM 的书）
      if (t === 14) { const H = me.mv.v === 'b' || me.mv.ex; s.spawn(me, { kind: me.id === 'grok' ? 'axe2' : 'zbook', x: me.x + me.face * 100, y: 240, vx: me.face * (H ? 1050 : 820), w: 120, h: 110, dmg: 48, stun: 16, kb: 200, bstun: 10, life: 150, hits: 2, boom: me.face }); s.emit('proj', { k: 'boom' }); }
      return t >= 34;
    },
    paper(s, me, op, t) {      // Claude 的长回复：一页很大很慢的纸，可以跟着它压上去
      if (t === 16) { s.spawn(me, { kind: 'paper', x: me.x + me.face * 120, y: 230, vx: me.face * (me.mv.v === 'b' ? 420 : 300), w: 230, h: 280, dmg: 55, stun: 20, kb: 220, bstun: 12, life: 280 }); s.emit('paper', {}); }
      return t >= 38;
    },
  });
  const NOCLASH = { blade: 1, mpillar: 1, breath: 1, pillar: 1, wave: 1, fix: 1, bigscroll: 1, sign: 1, box: 1, tea: 1 };
  function clashProj(s) {      // 两边的飞行道具碰上就互相抵掉一段；超必杀的飞行道具碾过普通的
    const L = s.P.filter(p => !p.dead && p.dmg && !NOCLASH[p.kind]);
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j]; if (a.dead || b.dead || a.own === b.own) continue;
      if (Math.abs(a.x - b.x) > (a.w + b.w) / 2 || Math.abs(a.y - b.y) > (a.h + b.h) / 2) continue;
      const hitOne = (p, other) => { if (other.sup && !p.sup) { p.dead = true; return; } if (p.sup && !other.sup) return; p.hits--; if (p.hits <= 0) p.dead = true; else p.lastHit = s.f; };
      hitOne(a, b); hitOne(b, a); s.addFx('pclash', (a.x + b.x) / 2, (a.y + b.y) / 2, { life: 22, col: s.F[a.own].ch.col2, col2: s.F[b.own].ch.col2 }); s.hitstop = Math.max(s.hitstop, 4); s.emit('clash', {}); }
  }
  function stepBoom(s, p) { if (!p.pow) { const b = s.P.find(q => q.kind === 'blade' && q.own === p.own && !q.dead && Math.abs(q.x - p.x) < 80); if (b) { p.pow = 1; p.dmg += 30; p.w *= 1.5; p.h *= 1.5; p.hits += 1; b.dead = true; s.addFx('ring', p.x, p.y, { life: 18, col: '#E0475B' }); } } p.vx -= p.boom * 26; const o = s.F[p.own]; if (p.t > 30 && Math.abs(p.x - o.x) < 70) p.dead = true; }
  // ===== 斗气系统「算力槽」（MOVES_PLAN_2 第 1 节）：只有人有，电脑到 M5 再教 =====
  // me.drive 0..6 格；见底 = 宕机（me.burn），回满前不能用任何算力动作
  const DRIVE_MAX = 6, DRIVE_REGEN = 0.5 / 60, BURN_REGEN = 0.6 / 60, PARRY_DRAIN = 0.4 / 60;
  const ATK3 = {
    impact: { su: 24, ac: 4, rc: 30, x0: 10, x1: 240, y0: 40, y1: 380, dmg: 80, kb: 420, bstun: 18, stop: 16, shake: 18, impact: 1 },      // 算力冲击：前摇 24 步、带两下霸体
    drev: { su: 4, ac: 4, rc: 22, x0: 0, x1: 200, y0: 20, y1: 380, dmg: 40, kb: 700, launch: 520, bstun: 12, stop: 10, unblock: 0 },        // 算力反击
    mid: { su: 14, ac: 4, rc: 16, x0: 10, x1: 210, y0: 120, y1: 420, dmg: 55, stun: 20, bstun: 12, kb: 300, stop: 9, sep: 230, high: 1 },     // → + J 中段（要站防）
    fwdk: { su: 13, ac: 5, rc: 18, x0: 10, x1: 245, y0: 60, y1: 370, dmg: 75, stun: 22, bstun: 14, kb: 420, stop: 11, sep: 250, fwd: 1 },     // → + K 前冲重击（可取消成必杀）
  };
  const canDrive = (me, n) => !me.burn && me.drive >= n - 1e-6;
  function useDrive(s, me, n) { me.drive = Math.max(0, me.drive - n); if (me.drive < 0.05) burnout(s, me); }
  // 双击检测放在原始输入上（顿帧里双击也算）：me.dtap = 最近一次完成的双击（d = 1 前 / -1 后）
  function tapTrack(s, me, ii) {
    if (me.id === 'dou') { if (ii.lk && !me.rawK) (me.kT || (me.kT = [])).push(s.f); me.rawK = !!ii.lk; }      // 豆包连按轻脚：按原始按键计数（顿帧里按的也算）
    const f = me.face > 0 ? ii.r : ii.l, b = me.face > 0 ? ii.l : ii.r, rp = me.rawPrev || {}, pf = me.face > 0 ? rp.r : rp.l, pb = me.face > 0 ? rp.l : rp.r; me.rawPrev = Object.assign({}, ii);
    if (ii.dn) { me.tap = null; return; }      // 中间碰过 ↓（升龙 →↓↘ 之类）就不算双击，免得搓招变成绿冲
    const d = f && !pf && !b ? 1 : b && !pb && !f ? -1 : 0; if (!d) return;
    if (me.tap && me.tap.d === d && s.f - me.tap.f <= MW) { me.dtap = { d, f: s.f }; me.tap = null; } else me.tap = { d, f: s.f };
  }
  function takeDtap(s, me, want) { const t = me.dtap; if (!t || s.f - t.f > 12 || (want && t.d !== want)) return 0; me.dtap = null; return t.d; }
  function burnout(s, me) { if (me.burn) return; me.burn = true; me.drive = 0; s.addFx('text', me.x, me.ch.h + 110, { life: 70, s: '服务器繁忙', col: '#6B7280' }); s.emit('burnout', { who: me.idx }); }
  function driveTick(s, me) {
    if (me.drive === undefined) { me.drive = DRIVE_MAX; me.burn = false; }
    if (me.st === 'parry') me.drive = Math.max(0, me.drive - PARRY_DRAIN), me.drive < 0.05 && burnout(s, me);
    else if (!['drush', 'impact', 'drev'].includes(me.st)) me.drive = Math.min(DRIVE_MAX, me.drive + (me.burn ? BURN_REGEN : DRIVE_REGEN));
    if (me.burn && me.drive >= DRIVE_MAX - 1e-6) me.burn = false;
    if (me.buff && --me.buff.t <= 0) me.buff = null;
    if (me.helmet > 0 && --me.helmet === 0) me.armorH = 0;
    if (me.echoQ && me.echoQ.length) { const op = s.F[1 - me.idx]; me.echoQ = me.echoQ.filter(e => { if (s.f < e.f) return true; if (canBeHit(op)) hit(s, me, op, e.h, op.x - me.face * 40, 240, 'melee'); return false; }); }
  }
  function startAtk3(s, me, k) { me.atk = ATK3[k]; me.atkK = k; setSt(me, k === 'impact' ? 'impact' : k === 'drev' ? 'drev' : k === 'mid' ? 'light' : 'heavy'); me.swing++; me.hitDone = {}; me.hitOK = false; me.blkOK = false; me.buf = null; me.vx = 0; me.armor = k === 'impact' ? 2 : 0; s.emit('whoosh', { lvl: 2, who: me.idx }); }
  function startDrush(s, me, cost) { useDrive(s, me, cost); setSt(me, 'drush'); me.mv = { dir: me.face }; me.vx = 0; me.skid = 0; me.buf = null; s.emit('dash', { who: me.idx }); s.addFx('dust', me.x, 0, { life: 18 }); s.addFx('drush', me.x, 0, { life: 26, dir: me.face }); }
  // 架招中：松开 U 回站立；双击 → 绿冲；架招期间每步记「按下后第几步」，精防窗口 4 步
  function humanParry(s, me, op, P) {
    const inp = me.in; me.vx *= 0.6; me.parryT++; me.holdBack = false;
    if (takeDtap(s, me, 1) && canDrive(me, 1)) { startDrush(s, me, 1); return; }
    if (me.cmd && (me.cmd.k === 'hp' || me.cmd.k === 'imp') && canDrive(me, 1)) { useDrive(s, me, 1); startAtk3(s, me, 'impact'); return; }
    if (!inp.dv || me.burn) setSt(me, 'idle');
  }
  // 站立 / 蹲 / 走路时先问一下算力键
  function humanDriveNeutral(s, me, op, P) {
    const inp = me.in;
    if (!inp.dv || me.burn) return false;
    if (me.cmd && (me.cmd.k === 'hp' || me.cmd.k === 'imp')) { if (canDrive(me, 1)) { me.cmd = null; useDrive(s, me, 1); startAtk3(s, me, 'impact'); return true; } return false; }      // U + K = 算力冲击
    setSt(me, 'parry'); me.parryT = P('dv') ? 0 : 99; me.vx = 0; s.addFx('ring', me.x, 230, { life: 14, col: '#3DDC84' }); return true;      // 刚按下才算精防窗口；一直按着走过来不算
  }
  // 普通技命中 / 被防后 →→：绿冲取消（3 格）
  function tryRushCancel(s, me) {
    if (!canDrive(me, 3) || !me.dtap || me.dtap.d !== 1) return false;
    if (takeDtap(s, me, 1)) { startDrush(s, me, 3); return true; }
    return false;
  }
  function stepDrush(s, me, op, spd) {
    me.vx = me.mv.dir * spd * 3.7 * (me.t < 14 ? 1 : 1 - (me.t - 14) / 6); me.rushBuff = 1;
    if (op.y <= 0 && bodyOn(op) && me.mv.dir === (op.x >= me.x ? 1 : -1)) {      // 第 42 圈：冲到对手跟前提前刹车（不再把身体插进对方身体里），留一点距离、进刹停姿势
      const lim = pushW(me, op) + 46, gap = Math.abs(op.x - me.x) - lim;
      if (gap < 150) { me.vx *= clamp(gap / 150, 0, 1) ** 0.7; if (gap < 60 && !me.skid) { me.skid = me.t; s.addFx('dust', me.x + me.face * 30, 0, { life: 16 }); } }
    }
    if (me.cmd) { const c = me.cmd; me.cmd = null; if (doCmd(s, me, op, c, false)) { me.rushBuff = 1; me.vx = me.mv ? me.vx : me.face * 260; return; } }
    if (me.t >= 20) { setSt(me, 'idle'); me.vx = 0; me.rushBuff = 0; }
  }
  function stepAtk3(s, me, op) {      // 算力冲击 / 算力反击的推进
    const A = me.atk; if (me.t >= A.su && me.t < A.su + A.ac) me.box = Object.assign({ id: 'd' + me.swing }, A);
    if (me.st === 'impact') { if (me.t < A.su) me.vx = me.face * 120; else if (me.t < A.su + A.ac) me.vx = me.face * 520; else me.vx *= 0.7; if (me.t === A.su) { s.addFx('ink', me.x + me.face * 120, 230, { life: 30, dir: me.face, col: me.ch.col }); s.shake = Math.max(s.shake, 8); } }
    else me.vx *= 0.8;
    if (me.t >= A.su + A.ac + A.rc) { setSt(me, 'idle'); me.armor = 0; }
  }
  // 算力冲击打中：瘫软倒下（可以追打）；贴墙 = 贴墙眩晕
  function impactHit(s, atk, def, blocked) {
    const wall = def.x <= XMIN + 140 || def.x >= XMAX - 140;
    if (blocked && !wall) return;
    setSt(def, 'stun'); def.stun = wall ? 75 : 50; def.vx = 0; def.wall = wall; def.crumple = !wall; def.box = null; def.mv = null;
    s.addFx('text', def.x, 470, { life: 50, s: wall ? '贴墙！' : '瘫倒！', col: '#3DDC84' }); s.shake = Math.max(s.shake, 20);
  }
  // ===== 三级超必杀（MOVES_PLAN_2 第 3 节）：TOKEN 槽分 3 格，一级 1 格 / 二级 2 格 / 三级 3 格 =====
  const BAR = 100 / 3;
  const SUH = { ds: { 1: { id: 'feast', name: '干饭人 · 一口气吃饱', inv: 16 }, 2: { id: 'whalefall', name: '鲸落', inv: 14 } } };      // 大肥鱼（杰米型）：一级 = 一口气升满级的强化型，二级 = 俯冲踢型
  const LV2 = { ds: { k: 'ot', name: '全力加班' }, gem: { k: 'nine', name: '九条命' } }, LV2D = { k: 'ot', name: '全力输出' };      // 二级：强化型（没单独设计的角色先用「全力输出」= 必杀全变 EX）
  const CINE = { ds: { name: '运营部加班通知', ko: '下班！' }, gem: { name: '九连爪', ko: '开饭喵' }, claude: { name: '你刚刚说什么', ko: '已读不回' }, gpt: { name: '作为一个AI语言模型', ko: '回答完毕' }, grok: { name: '全网公开处刑', ko: '已挂' }, qwen: { name: '双十一零点', ko: '已签收' }, kimi: { name: '一口气读完', ko: '已读完' }, glm: { name: '满分答卷', ko: '零分' }, dou: { name: '全家福', ko: '咔嚓' }, surf: { name: '全网爆款', ko: '已上热搜' }, nin: { name: '强制下线', ko: '已下线' } };      // 有三级动态演出的角色（名字、台词在 render.js 的 CINE_TXT）      // 三级演出（有插画的角色）
  Object.assign(SPF, {
    feast(s, me, op, t) {      // 大肥鱼 一级 干饭人：端碗冲上去两下（碗砸 + 上挑），然后扒完一整碗，饭量直接满 4 级、回 40 血
      const M = me.mv; if (t < 22) me.vx = me.face * (t < 8 ? 200 : 900); else me.vx *= 0.6;
      if (t >= 12 && t < 16) me.box = { id: 'fe' + me.swing, x0: 0, x1: 210, y0: 120, y1: 400, dmg: 90, stun: 40, bstun: 16, kb: 120, stop: 14, sup: 1, shake: 12 };
      if (t === 20) { me.swing++; me.hitDone = {}; }
      if (t >= 24 && t < 28) me.box = { id: 'fe' + me.swing, x0: 0, x1: 225, y0: 100, y1: 460, dmg: 110, launch: 1000, kb: 360, bstun: 16, stop: 16, sup: 1, shake: 18 };
      if (t === 40) { M.full = 1; const was = me.rice || 0; me.rice = 4; me.hp = Math.min(me.hpMax, me.hp + 40); s.addFx('text', me.x, me.ch.h + 130, { life: 70, s: was >= 4 ? '再来一碗！' : '饭量 Lv4 吃饱了！', col: '#4D6BFE' }); s.addFx('ring', me.x, 220, { life: 30, col: '#FFE066' }); s.emit('heal', { who: me.idx }); }
      return t >= 62;
    },
    whalefall(s, me, op, t) {      // 大肥鱼 二级 鲸落：跳出画面，像鲸鱼落水一样斜着砸下来连踢（多段），落地掀起水浪
      const M = me.mv;
      if (t === 6) { me.vy = 2500; me.vx = (op.x - me.x) * 0.7; me.y = 0.01; s.emit('jump', { who: me.idx }); }
      if (t < 6) { me.vx = 0; return false; }
      if (!M.land) {
        if (t >= 26) { me.vy = -2100; me.vx = me.face * 700; if ((t - 26) % 4 < 2) me.box = { id: 'wf' + me.swing + '_' + Math.floor((t - 26) / 4), x0: -40, x1: 190, y0: -60, y1: 240, dmg: 34, stun: 30, bstun: 10, kb: 30, stop: 5, sup: 1, multi: 1 }; else me.box = null; }
        if (t > 8 && me.y <= 0.5) { M.land = t; me.y = 0; me.vy = 0; me.vx = 0; me.swing++; me.hitDone = {}; me.box = { id: 'wfl' + me.swing, x0: -200, x1: 330, y0: 0, y1: 300, dmg: 120, launch: 1100, kb: 480, bstun: 18, stop: 16, sup: 1, shake: 24 }; s.shake = Math.max(s.shake, 18); s.addFx('dust', me.x, 0, { life: 26, big: true }); s.addFx('ring', me.x, 40, { life: 26, col: '#7FD4FF' }); s.emit('land', { who: me.idx }); }
        return t > 120; }
      if (t - M.land > 3) me.box = null;
      return t - M.land >= 30;
    },
  });
  function startSuperH(s, me, op, lvl) {
    if (me.meter < lvl * BAR - 0.01) return false;
    me.lazyS = 0; me.box = null; const left = Math.max(0, me.meter - lvl * BAR); if (op.st === 'hit') op.stun = Math.max(op.stun, 56);      // 连段里接超必杀：对手的硬直撑到超必杀出判定（定格演出期间对手本来就动不了）
    if (SUH[me.id] && SUH[me.id][lvl]) { const U = SUH[me.id][lvl]; setSt(me, 'sp'); me.mv = { id: U.id }; me.meter = left; me.swing++; me.hitDone = {}; me.hitOK = false; me.vx = 0; me.invul = Math.max(me.invul, U.inv); sticker(me, me.ch.su.stk, 90); s.freeze = 30; s.fz = { who: me.idx, f0: s.f, name: U.name, len: 30, lv: lvl }; s.emit('su', { id: U.id, who: me.idx }); return true; }      // 按原型重做的一 / 二级超必杀（只对人）
    if (lvl === 2) { const L = LV2[me.id] || LV2D; setSt(me, 'sp'); me.mv = { id: 'lv2' }; me.meter = left; me.swing++; me.hitDone = {}; me.vx = 0; me.invul = Math.max(me.invul, 36); sticker(me, me.ch.su.stk, 90); s.freeze = 34; s.fz = { who: me.idx, f0: s.f, name: L.name, len: 34, lv: 2 }; s.emit('su', { id: 'lv2', who: me.idx }); return true; }
    if (lvl === 3 && CINE[me.id]) { setSt(me, 'sp'); me.mv = { id: 'lv3' }; me.meter = left; me.swing++; me.hitDone = {}; me.hitOK = false; me.vx = 0; me.armor = 1; sticker(me, me.ch.su.stk, 90); s.freeze = 30; s.fz = { who: me.idx, f0: s.f, name: CINE[me.id].name, len: 30, lv: 3 }; s.emit('su', { id: 'lv3', who: me.idx }); return true; }
    startSuper(s, me, op); me.meter = left; me.meterFill = 0; me.supScale = lvl === 3 ? 1.6 : 0.6; s.freeze = 30; s.fz.len = 30; s.fz.lv = lvl;      // 一级：现有超必杀，定格短一点、伤害约 180；三级（还没插画的角色）：同一招 ×1.6
    return true;
  }
  Object.assign(SPF, {
    lv2(s, me, op, t) { if (t === 8) { const L = LV2[me.id] || LV2D; me.buff = { k: L.k, t: 480, name: L.name }; s.addFx('ring', me.x, 220, { life: 30, col: '#FFE066' }); s.emit('heal', { who: me.idx }); } return t >= 30; },
    lv3(s, me, op, t) {      // 三级起手：带一下霸体的突进，打中就进演出；被防就是一记重击
      if (t < 14) me.vx = me.face * 380; else me.vx *= 0.7;
      if (t >= 12 && t < 20) me.box = { id: 'cine' + me.swing, x0: -10, x1: 230, y0: 30, y1: 400, dmg: 40, cine: 1, kb: 300, bstun: 20, stop: 10 };
      return t >= 54;
    },
  });
  function startCine(s, atk, def) {
    const fin = def.hp <= def.hpMax * 0.25;
    const live = !s.v1 && !(typeof location !== 'undefined' && /[?&]oldcine=1/.test(location.search));      // 第 72 圈：实时乱舞版（js/live3.js，192 步）；成片（v1）和 ?oldcine=1 仍是旧的插图演出
    s.cine = { who: atk.idx, t: 0, fin, len: live ? 192 : 300, live };      // 旧演出长度和 render.js 的 CINE_LEN 一致；新的和 LIVE3.LEN 一致
    atk.box = null; atk.vx = 0; def.vx = 0; def.box = null; def.mv = null; setSt(def, 'held'); def.hy = 0;
    s.emit('cine', { who: atk.idx, fin });
  }
  function endCine(s) {
    const c = s.cine, a = s.F[c.who], d = s.F[1 - c.who]; s.cine = null;
    const dmg = c.fin ? d.hp : Math.min(d.hp, Math.round(400 * a.ch.dmg * (a.lazyS ? 0.9 : 1))); d.hp = Math.max(0, d.hp - dmg); d.dmgTaken += dmg; d.lastDmgF = s.f; d.perfect = false;
    setSt(d, 'launch'); d.vy = 900; d.vx = a.face * 700; d.y = 0.01; d.juggle = 3; setSt(a, 'idle'); a.vx = 0; a.mv = null; a.combo = 0;
    s.addFx('num', d.x, 320, { life: 60, s: String(dmg), lvl: 3 }); s.shake = 22; s.hitstop = 10;
    if (d.hp <= 0 && CINE[a.id]) s.koLabel = c.fin ? CINE[a.id].ko : null;
    s.emit('hit', { blk: 0, lvl: 3, dmg, who: a.idx, hp: d.hp, sup: true, k: 'sup' });
  }
  // ===== M2：大肥鱼、哈基米的新必杀技（只有人能搓出来；电脑仍只用 ch.sp）=====
  HMOV.ds = { '236': 'popup', '623': 'dp', '214': 'slide', '22': 'moyu' };
  HMOV.gem = { '236': 'yarn', '623': 'dp', '214': 'pounce', '22': 'steal' };
  const NOEX = { moyu: 1 };      // 没有 EX 版的招：J+K 时按重版出，不扣能量
  Object.assign(SPF, {
    dp(s, me, op, t) {      // 升龙（623）：前几步无敌，打对空；EX 全程无敌、三段
      const ex = me.mv.ex, H = me.mv.v === 'b' || ex;
      if (t === 1) me.invul = Math.max(me.invul, ex ? 30 : H ? 10 : 6); if (t < 5) me.vx = me.face * 380;      // 起跳前垫一小步，小脚之后也够得着
      if (t === 5) { me.vy = ex ? 1500 : H ? 1450 : 1120; me.vx = me.face * (H ? 240 : 170); me.y = 0.01; s.emit('whoosh', { lvl: 2, who: me.idx }); s.addFx('dust', me.x, 0, { life: 20 }); }
      if (t >= 5 && !me.mv.land && t < 5 + (ex ? 24 : 15)) { const k = ex ? Math.floor((t - 5) / 8) : 0; me.box = { id: 'sp' + me.swing + '_' + k, x0: -20, x1: 185, y0: -20, y1: 430, dmg: ex ? 40 : H ? 95 : 82, launch: ex && k < 2 ? 760 : 1050, kb: ex && k < 2 ? 120 : 300, bstun: 16, stop: 10, shake: 12 }; }
      if (t > 6 && me.y <= 0) { if (!me.mv.land) { me.mv.land = t; me.vx = 0; s.addFx('dust', me.x, 0, { life: 18 }); s.emit('land', { who: me.idx }); } return t - me.mv.land >= (ex ? 24 : H ? 28 : 16); }      // 落地后的大破绽
      return false;
    },
    slide(s, me, op, t) {      // 大肥鱼 214：低头滑铲（打下段、身子低能钻过高的飞行道具；EX 穿飞行道具）
      const H = me.mv.v === 'b' || me.mv.ex, dur = H ? 20 : 14;
      if (t === 1) { me.mv.low = 1; if (me.mv.ex) me.pinv = 1; }
      if (t >= 8 && t < 8 + dur && !me.mv.hit) { me.vx = me.face * (H ? 1250 : 950); if (t === 8) { s.emit('dash', { who: me.idx }); s.addFx('dust', me.x, 0, { life: 18 }); } if (t % 4 === 0) s.addFx('dust', me.x - me.face * 40, 0, { life: 14, small: true }); me.box = { id: 'sp' + me.swing, x0: -10, x1: 175, y0: 0, y1: 170, dmg: 70, stun: 22, launch: H ? 640 : 0, kb: 380, bstun: H ? 10 : 16, stop: 10, low: 1 }; }
      if (me.hitOK && !me.mv.hit) { me.mv.hit = t; me.vx *= 0.2; }
      if (t >= 8 + dur || me.mv.hit) me.vx *= 0.75;
      if (t >= 8 + dur + (H ? 16 : 12)) { me.pinv = 0; return true; }      // 轻版被防 +4，重版被防 −6
      return false;
    },
    moyu(s, me, op, t) {      // 大肥鱼 22：摸鱼，坐下刷手机，坐满就回 TOKEN；中途挨打就没了
      const T = me.mv.v === 'b' ? 90 : 60, g = me.mv.v === 'b' ? 25 : 15;
      if (t === T) { me.meter = Math.min(100, me.meter + g); s.addFx('text', me.x, me.ch.h + 90, { life: 50, s: '+' + g + ' TOKEN', col: '#4D6BFE' }); s.emit('heal', { who: me.idx }); }
      return t >= T + 12;
    },
    yarn(s, me, op, t) {      // 哈基米 236：毛线球，贴地滚、半路弹一下（下段）
      if (t === 12) { s.spawn(me, { kind: 'yarn', x: me.x + me.face * 90, y: 46, vx: me.face * (me.mv.v === 'b' || me.mv.ex ? 820 : 560), w: 92, h: 92, dmg: 48, stun: 18, kb: 220, bstun: 12, life: 150, bounce: 1, low: 1, hits: me.mv.ex ? 2 : 1 }); s.emit('proj', { k: 'yarn' }); }
      return t >= 32;
    },
    steal(s, me, op, t) {      // 哈基米 22：偷饭（近身抓，防不住），偷对手 TOKEN
      if (t === 6) {
        if (Math.abs(op.x - me.x) < 200 + pwx(me, op) && throwable(op)) { me.mv.got = t; const n = Math.min(Math.floor(op.meter), me.mv.v === 'b' ? 30 : 20); op.meter -= n; me.meter = Math.min(100, me.meter + n); hit(s, me, op, { dmg: me.mv.v === 'b' ? 80 : 60, unblock: true, stun: 30, kb: 260, stop: 10 }, op.x, 260, 'throw'); s.addFx('text', me.x, me.ch.h + 90, { life: 50, s: '偷到了 ' + n + ' TOKEN！', col: '#B15CF5' }); }
        else s.emit('whoosh', { lvl: 1, who: me.idx });
      }
      return me.mv.got ? t - me.mv.got >= 22 : t >= 40;
    },
  });
  function stepYarn(s, p) { if (p.bounce && p.t === 34) { p.vy = 950; p.g = 2600; p.bounce = 0; } if (p.g && p.y <= 46 && p.vy < 0) { p.y = 46; p.vy = 0; p.g = 0; s.addFx('dust', p.x, 0, { life: 12, small: true }); } }
  // ===== 梗招（MOVES_PLAN_2 第 6、7 节）：每人至少一个，按键区分 J / K 版本 =====
  const HMOVJ = { ds: { '22': 'rice' }, gem: { '22': 'banana' }, gpt: { '22': 'dumb' }, qwen: { '22': 'milktea' }, kimi: { '22': 'darkside' } };
  const HMOVK = { ds: { '22': 'helmet', '214': 'plead' }, gem: { '22': 'steal' }, grok: { '22': 'double' }, kimi: { '22': 'darkside' }, glm: { '22': 'remote' }, dou: { '236': 'phone' } };
  const COST = { darkside: 2 };      // 要算力的梗招
  const grabbed = (s, me, op, t, fn) => { if (t === 6) { if (Math.abs(op.x - me.x) < 210 + pwx(me, op) && throwable(op)) { me.mv.got = t; fn(); } else s.emit('whoosh', { lvl: 1, who: me.idx }); } return me.mv.got ? t - me.mv.got >= 24 : t >= 38; };
  Object.assign(SPF, {
    rice(s, me, op, t) {      // 大肥鱼 ↓↓+J 吃白饭：扒饭 1 秒，坐满回血 + 回 TOKEN；挨打就没了
      if (t === 2) s.addFx('say', me.x, me.ch.h + 150, { life: 90, s: '反正你把这个事儿交给我，说明你也没当个事儿', who: me.idx });
      if (t === 60) { const hp = Math.min(me.hpMax - me.hp, 60); me.hp += hp; me.meter = Math.min(100, me.meter + 12); s.addFx('text', me.x, me.ch.h + 90, { life: 50, s: '+' + hp + ' 干饭！', col: '#4D6BFE' }); s.emit('heal', { who: me.idx }); }
      return t >= 70;
    },
    helmet(s, me, op, t) {      // 大肥鱼 ↓↓+K 戴头盔（不锈钢盆）：5 秒内一次霸体，盆被打飞时砸对手
      if (t === 24) { me.helmet = 300; me.armorH = 1; s.addFx('text', me.x, me.ch.h + 100, { life: 40, s: '戴好了！', col: '#9AA8C0' }); s.emit('boxland', {}); }
      return t >= 34;
    },
    hcharge(s, me, op, t) {      // 戴着盆时 → + K：头盔冲撞（破防）
      if (t >= 8 && t < 22) { me.vx = me.face * 900; me.box = { id: 'hc' + me.swing, x0: 0, x1: 170, y0: 120, y1: 420, dmg: 80, unblock: true, launch: 700, kb: 520, stop: 12, shake: 14 }; } else me.vx *= 0.7;
      if (me.hitOK) me.vx *= 0.3;
      return t >= 40;
    },
    plead(s, me, op, t) { if (me.mv.hit) return t - me.mv.hit >= 24; if (t >= 4 && t < 30) me.counter = true; return t >= 50; },      // 大肥鱼 214+K 求求了：举盆要饭的当身
    banana(s, me, op, t) {      // 哈基米 ↓↓+J 香蕉皮：丢在地上，谁踩谁滑（自己也会）
      if (t === 10) { for (const e of s.E) if (e.kind === 'banana' && e.own === me.idx) e.dead = true; s.E.push({ own: me.idx, kind: 'banana', x: clamp(me.x + me.face * 170, XMIN, XMAX), t: 0, life: 600 }); s.emit('proj', { k: 'banana' }); }
      return t >= 26;
    },
    dumb(s, me, op, t) { if (t === 12) { s.spawn(me, { kind: 'cloud', x: me.x + me.face * 90, y: 320, vx: me.face * 700, w: 130, h: 90, dmg: 15, stun: 12, kb: 80, life: 120, fxF: { dumb: 240 } }); s.emit('proj', { k: 'cloud' }); } return t >= 30; },      // GPT ↓↓+J 降智
    double(s, me, op, t) {      // Grok ↓↓+K 业务翻倍：6 秒内双方伤害 ×2，硬币本身也打人
      if (t === 10) { s.dbl = 360; s.spawn(me, { kind: 'coin', x: me.x + me.face * 60, y: 300, vx: me.face * 760, vy: 520, g: 1700, w: 56, h: 56, dmg: 20, stun: 12, kb: 100, life: 90 }); s.addFx('say', me.x, me.ch.h + 150, { life: 80, s: '恭喜业务翻倍了', who: me.idx }); s.emit('proj', { k: 'coin' }); }
      return t >= 30;
    },
    darkside(s, me, op, t) { if (t === 6) { s.dark = 180; s.emit('mark', {}); } return t >= 24; },      // Kimi ↓↓ 月之暗面（2 格算力）：全屏暗 3 秒
    remote(s, me, op, t) { return grabbed(s, me, op, t, () => { op.inv = 150; hit(s, me, op, { dmg: 40, unblock: true, stun: 26, kb: 200, stop: 8 }, op.x, 260, 'throw'); s.addFx('text', op.x, op.ch.h + 120, { life: 60, s: '代你操作', col: '#3D4B7A' }); }); },      // GLM ↓↓+K 代你操作：抢手机，左右颠倒 2.5 秒
    milktea(s, me, op, t) {      // 千问 ↓↓+J 请你喝奶茶：丢一杯在场上，谁先碰到谁回血
      if (t === 12) { for (const e of s.E) if (e.kind === 'tea2' && e.own === me.idx) e.dead = true; s.E.push({ own: me.idx, kind: 'tea2', x: clamp(me.x + me.face * 280, XMIN, XMAX), t: 0, life: 480 }); s.emit('proj', { k: 'tea' }); }
      return t >= 28;
    },
    phone(s, me, op, t) { if (t === 10) { s.spawn(me, { kind: 'ring', x: me.x + me.face * 90, y: 230, vx: me.face * 520, w: 170, h: 170, dmg: 22, stun: 14, kb: 110, life: 40, hits: 3 }); s.emit('proj', { k: 'ring' }); } return t >= 34; },      // 豆包 236+K 打电话：近距离多段声波
  });
  function stepMemeEntity(s, e) {
    if (e.kind === 'banana') { for (const f of s.F) { if (f.idx === e.own ? e.t < 50 : e.t < 16) continue; if (f.y <= 0 && Math.abs(f.x - e.x) < 55 && ['idle', 'walk', 'dash', 'drush', 'light', 'heavy', 'crouch'].includes(f.st)) { setSt(f, 'launch'); f.vy = 560; f.vx = -f.face * 140; f.y = 0.01; f.juggle = 2; f.box = null; e.dead = true; s.addFx('text', f.x, f.ch.h + 90, { life: 50, s: '滑！', col: '#E0B000' }); s.emit('fall', { who: f.idx }); break; } } }
    if (e.kind === 'tea2') { for (const f of s.F) { if (f.idx === e.own && e.t < 30) continue; if (f.y <= 0 && Math.abs(f.x - e.x) < 70 && f.hp > 0) { const hp = Math.min(f.hpMax - f.hp, 80); f.hp += hp; e.dead = true; s.addFx('text', f.x, f.ch.h + 90, { life: 50, s: '+' + hp + ' 奶茶', col: '#C9925A' }); s.emit('heal', { who: f.idx }); break; } } }
  }

  // ===== 第四版模组（MOVES_PLAN_4 1.1）：大肥鱼 = 越吃越强型（饭量 0–4 级），哈基米 = 贴身连压型。只对人生效 =====
  const REQ = { bslam: 2, stamp: 3, ddk: 1 }, airReq = (s, id) => s.v1 ? (REQ[id] || 0) : id === 'ddk' ? 0 : id === 'bslam' ? 1 : (REQ[id] || 0);      // 第 75 圈（用户：空中必杀按不出）：鲸鳍下踢不要饭量、饭盆砸 1 级就行（成片 v1 仍按旧表）
       // 要几级饭量才能出（杰米型：1 级空中下踢、2 级饭盆砸、3 级指令投）。第 65 圈：爆廻（鲸尾回旋）改成 214+脚、不要饭量
  const LVFB = {};      // 饭量不够时退回的招
  const AIRSP = { ds: { '214k': 'bslam', '236k': 'ddk' }, gem: {} }, LZAIR = { gpt: 'gdive', grok: 'splash', dou: 'stomp' }, LZAIRD = { gpt: 'gdive', grok: 'splash', dou: 'stomp', kimi: 'drill', qwen: 'dive' };      // LZAIR：没有空中指令必杀的角色，空中懒人键出 ↓ + 键那一招
  Object.assign(HMOV, { ds: { '236': 'otk', '623': 'dp', '214': 'plead', '22': 'rice', '63214': 'stamp' }, gem: { '236': 'yarn', '623': 'dp', '214': 'claw3', '22': 'banana', '63214': 'flip', '41236': 'flurry' } });
  Object.assign(HMOVK, { ds: { '22': 'helmet', '214': 'bakkai', '236': 'slide', '623': 'dpk' }, gem: { '22': 'steal', '236': 'knead', '623': 'bclaw', '63214': 'mambo' } });
  delete HMOVHP.ds;
  Object.assign(NOEX, { mstep: 1, mambo: 1, stamp: 1, flip: 1 });
  const riceUp = (s, me, why) => { if ((me.rice || 0) >= 4) return; me.rice = (me.rice || 0) + 1; s.addFx('text', me.x, me.ch.h + 130, { life: 50, s: (why || '饭量') + ' Lv' + me.rice + (me.rice === 4 ? ' 吃饱了！' : ''), col: '#4D6BFE' }); s.emit('heal', { who: me.idx }); };
  // 派生招的公用骨架：段 n 的前摇 su、判定 ac、收招 rc；收招前按指定键进下一段
  function rekka(s, me, t, segs, next) {
    const M = me.mv; if (M.n == null) { M.n = 0; M.t0 = 0; }
    const g = segs[M.n], u = t - M.t0;
    if (u < g.su) me.vx = me.face * (g.step ?? 300); else me.vx *= 0.7;
    if (u === g.su) s.emit('whoosh', { lvl: 2, who: me.idx });
    if (u >= g.su && u < g.su + g.ac) me.box = Object.assign({ id: M.id0 + me.swing + '_' + M.n }, g.box);
    const b = me.buf && me.buf.c;
    if (b && u >= ((me.hitOK || me.blkOK) ? g.su : g.su + g.ac) && u < g.su + g.ac + g.rc - 2) { const k = next(M.n, b); if (k != null) { me.buf = null; M.n = k; M.t0 = t; me.swing++; me.hitDone = {}; me.hitOK = false; me.box = null; return false; } }      // 打中 / 被防后马上能接；打空要等判定结束
    return u >= g.su + g.ac + g.rc;
  }
  Object.assign(SPF, {
    bakkai(s, me, op, t) {      // 第 65 圈（用户反馈：摸鱼步换成杰米的爆廻）大肥鱼 214+脚 鲸尾回旋：身体横着螺旋前翻、脚连续回旋踢往前滚；滚动途中穿飞行道具。
      // 轻版 3 圈、重版 4 圈、EX 5 圈；饭量 2 级起 +1 圈；途中连按脚再多 1 圈（最多 6）。每圈一段（中段），最后一圈上踢打飞
      const M = me.mv, REV = 11, SU = 7; if (M.n == null) M.n = (M.ex ? 5 : M.v === 'b' ? 4 : 3) + ((me.rice || 0) >= 2 ? 1 : 0);
      if (t === 1) s.emit('whoosh', { lvl: 2, who: me.idx });
      if (t >= 3) me.pinv = 1;
      const u = t - SU, k = Math.floor(u / REV), w = u - k * REV, b = me.buf && me.buf.c;
      if (u >= 0 && b && KIK[b.k] && !['236236', '214214'].includes(b.m) && M.n < 6 && k < M.n - 1) { me.buf = null; M.n++; }      // 连按脚：多滚一圈（第 67 圈：236236 / 214214 + 脚不算追加，留给取消超必杀）
      if (u < 0) { me.vx = me.face * 260; return false; }
      if (k >= M.n) { me.vx *= 0.55; me.box = null; me.pinv = 0; return u >= M.n * REV + (M.hitAny ? 16 : 24); }
      const close = Math.abs(op.x - me.x) < 150 + pwx(me, op);
      me.vx = close && me.hitOK ? me.face * 120 : me.face * (M.ex ? 600 : M.v === 'b' ? 540 : 470); if (me.hitOK) M.hitAny = 1;
      if (w === 0) { me.swing++; me.hitDone = {}; me.hitOK = false; s.emit('whoosh', { lvl: 1, who: me.idx }); }
      const last = k === M.n - 1;
      if (w >= 3 && w < 7) me.box = last ? { id: 'bk' + me.swing, x0: -60, x1: 210, y0: 40, y1: 380, dmg: M.ex ? 60 : 50, launch: 950, kb: 420, bstun: 14, stop: 12, shake: 12 }
        : { id: 'bk' + me.swing, x0: -80, x1: 200, y0: 30, y1: 300, dmg: 24, stun: 22, bstun: 10, kb: 40, stop: 6, multi: 1 };
      else me.box = null;
      return false;
    },
    ddk(s, me, op, t) {      // 大肥鱼 空中 236+脚 鲸鳍下踢（饭量 1 级）：斜着往下踢，踢中弹回空中（中段，蹲防挡不住）
      const M = me.mv;
      if (M.bnc) { if (me.y <= 0.5 && t > M.bnc + 4) { me.y = 0; me.vy = 0; me.vx = 0; return true; } return t > M.bnc + 80; }
      if (!M.land) { if (t < 5) { me.vy = 80; me.vx *= 0.5; } else { me.vy = -1550; me.vx = me.face * (M.v === 'b' ? 1050 : 850); me.box = { id: 'dk' + me.swing, x0: 0, x1: 170, y0: -40, y1: 170, dmg: 58, stun: 22, bstun: 12, kb: 200, stop: 10, high: 1 }; }
        if (me.hitOK || me.blkOK) { M.bnc = t; me.box = null; me.vy = 820; me.vx = -me.face * 260; return false; }
        if (t > 5 && me.y <= 0.5) { M.land = t; me.y = 0; me.vy = 0; me.vx = 0; me.box = null; s.addFx('dust', me.x, 0, { life: 14 }); }
        return t > 90; }
      return t - M.land >= 14;
    },
    rice(s, me, op, t) {      // 大肥鱼 ↓↓+J 吃白饭：扒一口升一级饭量（可以连吃，吃的时候有破绽），顺便回一点血和 TOKEN
      if (t === 2 && !me.rice) s.addFx('say', me.x, me.ch.h + 150, { life: 80, s: '反正你把这个事儿交给我，说明你也没当个事儿', who: me.idx });
      if (t === 28) { riceUp(s, me, '吃白饭'); const hp = Math.min(me.hpMax - me.hp, 20); me.hp += hp; me.meter = Math.min(100, me.meter + 6); }
      if (t === 50) { me.helmet = 300; me.armorH = 1; s.addFx('text', me.x, me.ch.h + 100, { life: 40, s: '碗扣头上！', col: '#9AA8C0' }); s.emit('boxland', {}); }      // 第 65 圈（用户反馈）：吃完把碗扣到头上当头盔（一次霸体、被打时盆飞出去砸人，同 ↓↓+脚）
      return t >= 58;
    },
    otk(s, me, op, t) {      // 大肥鱼 236+拳 加班连打：再按拳出下一段（0 级两段，1 级起三段，3 级三段后按脚接踢）；第三段打中顺便扒一口
      const lv = me.rice || 0, H = me.mv.v === 'b' || me.mv.ex; me.mv.id0 = 'otk';
      const segs = [{ su: H ? 9 : 11, ac: 4, rc: 16, step: H ? 620 : 480, box: { x0: 0, x1: 200, y0: 130, y1: 380, dmg: 48, stun: 22, bstun: 12, kb: 150, stop: 9 } },
        { su: 7, ac: 4, rc: 16, step: 320, box: { x0: 0, x1: 205, y0: 110, y1: 380, dmg: 46, stun: 22, bstun: 12, kb: lv >= 1 ? 150 : 380, stop: 9 } },
        { su: 9, ac: 5, rc: 20, step: 360, box: { x0: 0, x1: 215, y0: 100, y1: 400, dmg: 62, stun: 24, bstun: 14, kb: 380, stop: 11, shake: 10 } },
        { su: 8, ac: 5, rc: 22, step: 300, box: { x0: 0, x1: 235, y0: 120, y1: 440, dmg: 70, launch: 880, kb: 420, bstun: 14, stop: 12, shake: 14 } }];
      const r = rekka(s, me, t, segs, (n, b) => PUN[b.k] && n < (lv >= 1 ? 2 : 1) ? n + 1 : KIK[b.k] && n === 2 && lv >= 3 ? 3 : null);
      if (me.hitOK && me.mv.n === 2 && !me.mv.ate) { me.mv.ate = 1; riceUp(s, me, '扒一口'); }
      return r;
    },
    dpk(s, me, op, t) {      // 大肥鱼 623+脚 鲸鱼顶：2 级起变三段
      const lv = me.rice || 0; if (t === 1) me.mv.ex = me.mv.ex || lv >= 2; return SPF.dp(s, me, op, t);
    },
    mstep(s, me, op, t) {      // 大肥鱼 214+脚 摸鱼步：摇摇晃晃往前走，途中按拳 = 中段锤（站防才挡得住），按脚 = 下段扫
      const M = me.mv;
      if (!M.fol) { if (t < 34) me.vx = me.face * (460 + Math.sin(t * 0.45) * 180); else me.vx *= 0.6; const b = me.buf && me.buf.c;
        if (t >= 6 && b && (PUN[b.k] || KIK[b.k])) { me.buf = null; M.fol = PUN[b.k] ? 'mid' : 'low'; M.t0 = t; me.swing++; me.hitDone = {}; me.hitOK = false; }
        return t >= 44; }
      const u = t - M.t0, su = M.fol === 'mid' ? 13 : 8; me.vx *= 0.6;
      if (u >= su && u < su + 4) me.box = M.fol === 'mid' ? { id: 'ms' + me.swing, x0: 0, x1: 195, y0: 150, y1: 430, dmg: 72, stun: 24, bstun: 14, kb: 260, stop: 11, high: 1, shake: 10 } : { id: 'ms' + me.swing, x0: 0, x1: 225, y0: 0, y1: 110, dmg: 56, low: 1, launch: 520, kb: 220, bstun: 12, stop: 9 };
      return u >= su + 4 + (M.fol === 'mid' ? 18 : 22);
    },
    bslam(s, me, op, t) {      // 大肥鱼 空中 214+脚 饭盆砸（饭量 2 级）：空中停一下，抱着盆往下砸（中段：蹲防挡不住）
      if (!me.mv.land) { if (t < 7) { me.vy = 120; me.vx *= 0.5; } else { me.vy = -1900; me.vx = me.face * 320; me.box = { id: 'bs' + me.swing, x0: -40, x1: 170, y0: -60, y1: 200, dmg: 78, stun: 24, bstun: 14, kb: 260, stop: 11, high: 1, shake: 12 }; }
        if (t > 7 && me.y <= 0.5) { me.mv.land = t; me.y = 0; me.vy = 0; me.vx = 0; me.box = null; s.shake = Math.max(s.shake, 10); s.addFx('dust', me.x, 0, { life: 22, big: true }); s.emit('land', { who: me.idx }); }
        return t > 90; }
      return t - me.mv.land >= 16;
    },
    stamp(s, me, op, t) {      // 大肥鱼 半圈 + 拳（63214，近身，饭量 4 级）盖章驳回：指令投
      if (t === 5) { if (Math.abs(op.x - me.x) < 230 + pwx(me, op) && throwable(op)) { me.mv.got = t; setSt(op, 'held'); op.vx = 0; op.box = null; op.mv = null; op.hy = 60; s.hitstop = Math.max(s.hitstop, 8); s.addFx('text', op.x, 470, { life: 40, s: '盖章！', col: '#E0475B' }); } else s.emit('whoosh', { lvl: 2, who: me.idx }); }
      if (me.mv.got && t === me.mv.got + 20) { op.hy = 0; hit(s, me, op, { dmg: 190, unblock: true, launch: 820, kb: 600, stop: 14, shake: 22 }, op.x, 300, 'throw'); s.addFx('text', op.x, 520, { life: 60, s: '驳回！', col: '#E0475B' }); }
      return me.mv.got ? t - me.mv.got >= 44 : t >= 42;
    },
    claw3(s, me, op, t) {      // 哈基米 214+拳 三段爪：再按拳出下一段，第三段把对手拍在地上
      const H = me.mv.v === 'b' || me.mv.ex; me.mv.id0 = 'c3';
      const segs = [{ su: H ? 8 : 10, ac: 4, rc: 15, step: H ? 760 : 600, box: { x0: 0, x1: 205, y0: 120, y1: 380, dmg: 44, stun: 22, bstun: 12, kb: 140, stop: 8 } },
        { su: 6, ac: 4, rc: 15, step: 420, box: { x0: 0, x1: 210, y0: 120, y1: 400, dmg: 44, stun: 22, bstun: 12, kb: 140, stop: 8 } },
        { su: 10, ac: 5, rc: 24, step: 300, box: { x0: 0, x1: 220, y0: 60, y1: 440, dmg: 66, launch: 380, kb: 120, bstun: 16, stop: 13, shake: 16, high: 1 } }];
      return rekka(s, me, t, segs, (n, b) => PUN[b.k] && n < 2 ? n + 1 : null);
    },
    flip(s, me, op, t) {      // 哈基米 半圈 + 拳（近身）翻面：不扣血，把对手转成背对自己定住一下，接连段
      if (t === 5) { if (Math.abs(op.x - me.x) < 220 + pwx(me, op) && throwable(op)) { me.mv.got = t; setSt(op, 'hit'); op.stun = 42; op.vx = 0; op.box = null; op.mv = null; op.flipped = 42; me.mv.fx0 = op.x; me.mv.fx1 = Math.max(XMIN + 40, Math.min(XMAX - 40, me.x - me.face * (150 + pwx(me, op))));      /* 第 48 圈：真的把对手从身前拽到身后（屑風式换位），对手保持原朝向 = 背对自己 */ s.hitstop = Math.max(s.hitstop, 6); s.addFx('text', op.x, 470, { life: 46, s: '翻面！', col: '#B15CF5' }); s.emit('whoosh', { lvl: 2, who: me.idx }); } else s.emit('whoosh', { lvl: 1, who: me.idx }); }
      if (me.mv.got && t - me.mv.got <= 8) { const q = (t - me.mv.got) / 8, e = q * q * (3 - 2 * q); op.x = me.mv.fx0 + (me.mv.fx1 - me.mv.fx0) * e; op.y = Math.sin(q * Math.PI) * 60; if (q >= 1) { op.y = 0; if (Math.sign(op.x - me.x) !== me.face) me.face = -me.face; } }
      return me.mv.got ? t - me.mv.got >= 14 : t >= 36;
    },
    bclaw(s, me, op, t) {      // 哈基米 623+脚 后跃斜爪：往后跳，再斜着往下扑抓（从空中打下来，蹲防挡不住）
      if (t === 2) { me.vy = 1150; me.vx = -me.face * 380; me.y = 0.01; s.emit('jump', { who: me.idx }); }
      if (!me.mv.land) { if (t >= 18) { me.vy = Math.min(me.vy, -1050); me.vx = me.face * (me.mv.v === 'b' || me.mv.ex ? 1400 : 1200); me.box = { id: 'bc' + me.swing, x0: -20, x1: 180, y0: -40, y1: 260, dmg: 62, stun: 22, bstun: 12, kb: 240, stop: 10 }; }
        if (t > 4 && me.y <= 0.5) { me.mv.land = t; me.y = 0; me.vy = 0; me.vx = 0; me.box = null; s.addFx('dust', me.x, 0, { life: 16 }); s.emit('land', { who: me.idx }); }
        return t > 90; }
      return t - me.mv.land >= 14;
    },
    flurry(s, me, op, t) {      // 哈基米 半圈前 + 拳 猫猫拳：小碎步连出 6 下猫爪拳，最后一下推开
      const n = me.mv.ex ? 8 : 6, per = 5, su = 7;
      if (t < su + n * per) me.vx = me.face * 140; else me.vx *= 0.6;
      if (t >= su && t < su + n * per) { const k = Math.floor((t - su) / per), last = k === n - 1; if ((t - su) % per < 3) me.box = { id: 'fl' + me.swing + '_' + k, x0: 0, x1: 195, y0: 140, y1: 380, dmg: last ? 34 : 15, stun: last ? 24 : 14, bstun: 8, kb: last ? 360 : 40, stop: last ? 9 : 3, multi: 1 }; }
      return t >= su + n * per + 16;
    },
    knead(s, me, op, t) {      // 哈基米 236+脚 踩奶：扑上去（下段），扑中就踩两下，最后后空翻踢开
      const M = me.mv;
      if (!M.got) { if (t >= 6 && t < 22) { me.vx = me.face * 760; me.box = { id: 'kn' + me.swing, x0: 0, x1: 190, y0: 0, y1: 200, dmg: 30, stun: 40, bstun: 12, kb: 40, stop: 8, low: 1 }; } else me.vx *= 0.6; if (me.hitOK) { M.got = t; me.vx = 0; me.box = null; } return t >= 44; }
      const u = t - M.got; me.vx = 0; if (op.st === 'hit') op.stun = Math.max(op.stun, 10);
      if (u === 10 || u === 22) { me.swing++; me.hitDone = {}; me.box = { id: 'kn' + me.swing, x0: -30, x1: 220, y0: 0, y1: 300, dmg: 22, stun: 30, kb: 0, stop: 4, multi: 1 }; }
      if (u === 36) { me.swing++; me.hitDone = {}; me.box = { id: 'kn' + me.swing, x0: -30, x1: 230, y0: 0, y1: 420, dmg: 48, launch: 820, kb: 380, stop: 10, shake: 12 }; me.vy = 900; me.y = 0.01; me.vx = -me.face * 300; }
      if (u > 38 && me.y <= 0) { me.y = 0; me.vy = 0; me.vx = 0; }
      return u >= 60;
    },
    mambo(s, me, op, t) {      // 哈基米 半圈 + 脚 哈基米曼波：原地跳舞挑衅，跳完不被打断就回 TOKEN 和 1 格算力
      if (t === 2) s.addFx('say', me.x, me.ch.h + 150, { life: 70, s: '哈基米曼波～', who: me.idx });
      if (t === 60) { me.meter = Math.min(100, me.meter + 12); me.drive = Math.min(DRIVE_MAX, me.drive + 1); s.addFx('text', me.x, me.ch.h + 90, { life: 50, s: '+12 TOKEN +1 算力', col: '#B15CF5' }); s.emit('heal', { who: me.idx }); }
      return t >= 66;
    },
  });

  // ===== 第四版模组（二）：GPT = 派生拳型，千问 = 扇子机动型，Grok = 投技型，豆包 = 连打型；蓄力 / 转一圈指令 =====
  const CHG = 45, WALLJ = { gem: 1, qwen: 1, dou: 1 };
  function chargeTick(s, me) {      // 蓄力：按住 ← / ↓ 满 45 步，松开后 10 步内按 → / ↑ + 键 = 蓄力指令
    const back = me.face > 0 ? me.in.l : me.in.r, dn = me.in.dn;
    if (back) me.cgB = (me.cgB || 0) + 1; else { if ((me.cgB || 0) >= CHG) me.cgBF = s.f; me.cgB = 0; }
    if (dn) me.cgD = (me.cgD || 0) + 1; else { if ((me.cgD || 0) >= CHG) me.cgDF = s.f; me.cgD = 0; }
  }
  function specialMotion(s, me, m) {      // 角色专用的指令：蓄力 [4]6 / [2]8、转一圈（Grok）
    const fwd = me.face > 0 ? me.in.r : me.in.l, T = HMOVC[me.id]; if (!T) return m;
    const open = me.buff && me.buff.k === 'open';      // 开卷考试：不用蓄力
    if (T['46c'] && fwd && (open || me.cgB >= CHG || s.f - (me.cgBF ?? -99) <= 10)) { me.cgB = 0; me.cgBF = -99; return '46c'; }
    if (T['28c'] && me.in.u && (open || me.cgD >= CHG || s.f - (me.cgDF ?? -99) <= 10)) { me.cgD = 0; me.cgDF = -99; return '28c'; }
    if (T['360']) { const L = ((me.lastMot && me.lastMot.f === s.f ? me.dirsPrev : me.dirs) || []).filter(e => s.f - e.f <= 24).map(e => e.d), card = new Set(L.filter(d => d === 2 || d === 4 || d === 6 || d === 8)); if (card.size >= 3 && (card.has(8) || L.length >= 5)) { me.dirs = []; return '360'; } }
    return m;
  }
  const HMOVC = { glm: { '46c': 'boom', '28c': 'fkk' }, dou: { '46c': 'emoji', '28c': 'spin' }, grok: { '360': 'grab360' } };
  const moveOfC = moveOf; moveOf = (me, m, btn, str) => { const T = HMOVC[me.id]; if (T && T[m] && (m !== '28c' || btn === 'k' || me.id === 'qwen') && (m !== '360' || btn === 'p')) return T[m]; if (m === '360' && btn === 'k') return moveOfC(me, '63214', btn, str); return moveOfC(me, m, btn, str); };
  Object.assign(HMOV, { gpt: { '236': 'kyo3', '214': 'three', '623': 'dp' }, qwen: { '236': 'fan', '214': 'spin', '623': 'dp' }, grok: { '236': 'boom', '214': 'swat', '623': 'dp' }, dou: { '236': 'emoji', '623': 'dp' } });
  Object.assign(HMOVK, { gpt: { '623': 'dkick', '41236': 'wing' }, qwen: { '41236': 'elbow', '22': 'alts' }, grok: { '22': 'double', '623': 'rungrab' }, dou: { '22': 'phone' } });
  Object.assign(AIRSP, { qwen: { '236p': 'afan' } });
  Object.assign(NOEX, { windmill: 1, kkk: 1, grab360: 1, rungrab: 1 });
  Object.assign(SPF, {
    kyo3(s, me, op, t) {      // GPT 236+拳 首先 → 其次 → 最后：每段按拳继续打，按脚换路线（其次 + 脚 = 下段踢；最后 + 脚 = 中段砸倒）
      const M = me.mv, H = M.v === 'b' || M.ex; M.id0 = 'ky';
      const segs = [{ su: H ? 9 : 11, ac: 4, rc: 16, step: 520, box: { x0: 0, x1: 200, y0: 140, y1: 380, dmg: 46, stun: 22, bstun: 12, kb: 150, stop: 9 } },
        { su: 7, ac: 4, rc: 16, step: 320, box: { x0: 0, x1: 205, y0: 120, y1: 380, dmg: 44, stun: 22, bstun: 12, kb: 150, stop: 9 } },
        { su: 8, ac: 4, rc: 18, step: 300, box: { x0: 0, x1: 220, y0: 0, y1: 120, dmg: 44, stun: 22, bstun: 12, kb: 150, stop: 9, low: 1 } },
        { su: 9, ac: 5, rc: 22, step: 280, box: { x0: -10, x1: 200, y0: 60, y1: 460, dmg: 66, launch: 980, kb: 300, bstun: 14, stop: 12, shake: 12 } },
        { su: 13, ac: 5, rc: 22, step: 300, box: { x0: 0, x1: 215, y0: 140, y1: 440, dmg: 70, launch: 420, kb: 200, bstun: 14, stop: 12, shake: 14, high: 1 } }];
      return rekka(s, me, t, segs, (n, b) => n === 0 ? (PUN[b.k] ? 1 : KIK[b.k] ? 2 : null) : n === 1 || n === 2 ? (PUN[b.k] ? 3 : KIK[b.k] ? 4 : null) : null);
    },
    dkick(s, me, op, t) {      // GPT 623+脚 两段蹬踢：踢上去，空中再补一脚
      if (t === 4) { me.vy = 1250; me.vx = me.face * 260; me.y = 0.01; me.invul = Math.max(me.invul, 6); s.emit('whoosh', { lvl: 2, who: me.idx }); }
      if (t >= 4 && t < 12) me.box = { id: 'dk' + me.swing + '_a', x0: -10, x1: 170, y0: 0, y1: 400, dmg: 50, launch: 900, kb: 120, bstun: 14, stop: 8 };
      if (t >= 18 && t < 24 && me.y > 0) me.box = { id: 'dk' + me.swing + '_b', x0: 0, x1: 210, y0: -40, y1: 260, dmg: 48, launch: 700, kb: 420, bstun: 14, stop: 10, shake: 10 };
      if (t > 6 && me.y <= 0) { if (!me.mv.land) { me.mv.land = t; me.vx = 0; s.emit('land', { who: me.idx }); } return t - me.mv.land >= 18; }
      return t > 90;
    },
    wing(s, me, op, t) {      // GPT 半圈 + 脚 龙翼突进：展翼冲过去的肩撞
      if (t >= 10 && t < 26 && !me.mv.hit) { me.vx = me.face * 1150; me.box = { id: 'wg' + me.swing, x0: 0, x1: 180, y0: 80, y1: 400, dmg: 72, kb: 520, launch: 600, bstun: 14, stop: 11, shake: 12 }; } else me.vx *= 0.7;
      if (me.hitOK) me.mv.hit = 1; return t >= 44;
    },
    wcannon(s, me, op, t) {      // 第 67 圈 客串浪花 236+拳 热搜水炮：中速水弹，重版更快更大，EX 两发上下排开（第二发打低）
      const H = me.mv.v === 'b' || me.mv.ex;
      if (t === 12) { const n = me.mv.ex ? 2 : 1; for (let i = 0; i < n; i++) s.spawn(me, { kind: 'splash', x: me.x + me.face * 110, y: i ? 90 : 230, vx: me.face * (H ? 1050 : 820), w: H ? 120 : 100, h: H ? 110 : 90, dmg: H ? 46 : 40, stun: 18, kb: 230, bstun: 11, life: 120, mvp: 1, hits: me.mv.ex ? 2 : 1 }); s.emit('proj', { k: 'splash' }); }
      return t >= 32;
    },
    shuri(s, me, op, t) {      // 第 67 圈 客串小忍 236+拳 验证码手里剑：快、小；重版两枚一上一下，EX 三枚扇形
      const n = me.mv.ex ? 3 : me.mv.v === 'b' ? 2 : 1;
      if (t === 8) { for (let i = 0; i < n; i++) s.spawn(me, { kind: 'shuri', x: me.x + me.face * 90, y: 250 + (i - (n - 1) / 2) * 80, vx: me.face * 1350, vy: (i - (n - 1) / 2) * 160, w: 70, h: 70, dmg: n > 1 ? 26 : 36, stun: 16, kb: 160, bstun: 9, life: 100, mvp: 1 }); s.emit('proj', { k: 'shuri' }); }
      return t >= 24;
    },
    vanish(s, me, op, t) {      // 第 67 圈 客串小忍 214+脚 404 隐身：原地碎成像素消失（6–20 步无敌），在对手身后出现踢一脚；轻版落在对手身前
      const back = me.mv.v === 'b' || me.mv.ex;
      if (t === 4) { s.addFx('ring', me.x, 220, { life: 16, col: '#2EC8F0' }); s.addFx('text', me.x, me.ch.h + 110, { life: 36, s: '404', col: '#2EC8F0' }); s.emit('warp', {}); }
      if (t >= 6 && t < 20) { me.invul = Math.max(me.invul, 2); me.ghost = 1; }
      if (t === 20) { me.ghost = 0; me.x = clamp(op.x + (back ? 1 : -1) * (op.x >= me.x ? 1 : -1) * 160, XMIN, XMAX); me.face = op.x >= me.x ? 1 : -1; s.addFx('ring', me.x, 220, { life: 16, col: '#B9F3FF' }); }
      if (t >= 26 && t < 30) me.box = { id: 'vn' + me.swing, x0: 0, x1: 210, y0: 80, y1: 400, dmg: me.mv.ex ? 70 : 55, stun: 22, bstun: 12, kb: 300, stop: 10, shake: 8 };
      else me.box = null;
      return t >= 46;
    },
    fan(s, me, op, t) {      // 千问 236+拳 飞扇：快、小，EX 三把
      const H = me.mv.v === 'b' || me.mv.ex;
      if (t === 9) { const n = me.mv.ex ? 3 : 1; for (let i = 0; i < n; i++) s.spawn(me, { kind: 'fan', x: me.x + me.face * 100, y: 250 + (i - (n - 1) / 2) * 70, vx: me.face * (H ? 1250 : 980), vy: (i - (n - 1) / 2) * 120, w: 90, h: 70, dmg: 40, stun: 18, kb: 200, bstun: 10, life: 110, mvp: 1 }); s.emit('proj', { k: 'fan' }); }
      return t >= 28;
    },
    afan(s, me, op, t) {      // 千问 空中 236+拳：斜着往下丢扇子
      if (t === 6) { s.spawn(me, { kind: 'fan', x: me.x + me.face * 80, y: Math.max(80, me.y + 200), vx: me.face * 900, vy: -700, w: 90, h: 70, dmg: 38, stun: 18, kb: 180, bstun: 10, life: 90 }); s.emit('proj', { k: 'fan' }); me.vy = Math.max(me.vy, 200); }
      if (t > 8 && me.y <= 0) { me.y = 0; return true; } return t > 80;
    },
    elbow(s, me, op, t) {      // 千问 半圈 + 脚 贴地突进肘：压低身子冲过去（能钻过高的飞行道具）
      if (t === 1) me.mv.low = 1; if (t >= 6 && t < 22 && !me.mv.hit) { me.vx = me.face * 1050; me.box = { id: 'eb' + me.swing, x0: 0, x1: 170, y0: 40, y1: 260, dmg: 62, kb: 420, bstun: 12, stop: 10 }; } else me.vx *= 0.7;
      if (me.hitOK) me.mv.hit = 1; return t >= 38;
    },
    dive(s, me, op, t) {      // 千问 空中 ↓ + 重脚 俯冲踢
      if (!me.mv.land) { me.vy = -1500; me.vx = me.face * 760; me.box = { id: 'dv' + me.swing, x0: -10, x1: 170, y0: -60, y1: 160, dmg: 58, stun: 20, bstun: 10, kb: 220, stop: 9 }; if (me.y <= 0.5 && t > 1) { me.mv.land = t; me.y = 0; me.vy = 0; me.vx = 0; me.box = null; s.addFx('dust', me.x, 0, { life: 14 }); } return t > 90; }
      return t - me.mv.land >= 10;
    },
    grab360(s, me, op, t) {      // Grok 转一圈 + 拳 公开处刑：全游戏伤害最高的指令投（抓住 → 跳起 → 砸地）
      if (t === 3) { if (Math.abs(op.x - me.x) < 240 + pwx(me, op) && throwable(op)) { me.mv.got = t; setSt(op, 'held'); op.vx = 0; op.box = null; op.mv = null; op.hy = 0; s.hitstop = Math.max(s.hitstop, 8); s.addFx('text', op.x, 470, { life: 46, s: '公开处刑！', col: '#E0475B' }); } else s.emit('whoosh', { lvl: 2, who: me.idx }); }
      if (me.mv.got) { const u = t - me.mv.got; if (u === 8) { me.vy = 1500; me.y = 0.01; s.emit('jump', { who: me.idx }); } if (op.st === 'held') { op.x = clamp(me.x + me.face * 40, XMIN, XMAX); op.hy = me.y + 120; }
        if (u > 10 && me.y <= 0 && !me.mv.slam) { me.mv.slam = t; me.y = 0; op.hy = 0; hit(s, me, op, { dmg: 250, unblock: true, launch: 600, kb: 300, stop: 16, shake: 28 }, op.x, 120, 'throw'); s.addFx('dust', me.x, 0, { life: 26, big: true }); s.emit('smash', {}); }
        return me.mv.slam ? t - me.mv.slam >= 30 : t > 120; }
      return t >= 40;
    },
    windmill(s, me, op, t) {      // Grok J + U 大风车：抡斧原地转，上半身不吃飞行道具，可以左右挪
      const dur = 54; if (t < dur) { me.vx = (me.in.r ? 1 : me.in.l ? -1 : 0) * 220; me.pinv = 1; if (t >= 6 && (t - 6) % 8 < 3) me.box = { id: 'wm' + me.swing + '_' + Math.floor((t - 6) / 8), x0: -170, x1: 200, y0: 160, y1: 460, dmg: 30, stun: 16, bstun: 8, kb: Math.floor((t - 6) / 8) >= 5 ? 420 : 80, stop: 4, multi: 1 }; }
      else { me.vx = 0; me.pinv = 0; } return t >= dur + 18;
    },
    rungrab(s, me, op, t) {      // Grok 623+脚 跑抓：跑过去抓（中距离投）
      if (!me.mv.got) { if (t < 26) me.vx = me.face * 900; else me.vx = 0; if (t >= 8 && t < 26 && Math.abs(op.x - me.x) < 170 + pwx(me, op) && throwable(op)) { me.mv.got = t; me.vx = 0; hit(s, me, op, { dmg: 130, unblock: true, launch: 700, kb: 520, stop: 12, shake: 16 }, op.x, 260, 'throw'); s.addFx('text', op.x, 470, { life: 40, s: '抓到了', col: '#E0475B' }); } return t >= 50; }
      return t - me.mv.got >= 30;
    },
    swat(s, me, op, t) {      // Grok 214+拳 拍掉：发光的手掌把飞过来的东西拍散，自己前进一步
      if (t < 12) me.vx = me.face * 260; else me.vx *= 0.6;
      if (t >= 4 && t < 18) { for (const p of s.P) if (!p.dead && p.own !== me.idx && Math.abs(p.x - (me.x + me.face * 120)) < 160 && p.y < 460) { p.dead = true; s.addFx('ring', p.x, p.y, { life: 18, col: '#FFD0B0' }); s.emit('hit', { blk: 1, lvl: 1 }); } me.box = { id: 'sw' + me.swing, x0: 0, x1: 180, y0: 120, y1: 420, dmg: 50, kb: 300, bstun: 12, stop: 9 }; }
      return t >= 34;
    },
    emoji(s, me, op, t) {      // 豆包 236+拳 / ←蓄→+拳 表情包弹：快、小
      if (t === 7) { s.spawn(me, { kind: 'emoji', x: me.x + me.face * 90, y: 260, vx: me.face * (me.mv.v === 'b' || me.mv.ex ? 1400 : 1150), w: 70, h: 70, dmg: 34, stun: 16, kb: 160, bstun: 9, life: 90, hits: me.mv.ex ? 2 : 1, mvp: 1 }); s.emit('proj', { k: 'emoji' }); }
      return t >= 22;
    },
    kkk(s, me, op, t) {      // 豆包 连按轻脚 踢踢踢：快速多段踢，最后一下推开
      const n = 8, per = 4, su = 4; if (t < su + n * per) me.vx = me.face * 60; else me.vx *= 0.6;
      if (t >= su && t < su + n * per) { const k = Math.floor((t - su) / per), last = k === n - 1; if ((t - su) % per < 2) me.box = { id: 'kk' + me.swing + '_' + k, x0: 0, x1: 205, y0: 120 + (k % 3) * 60, y1: 360 + (k % 3) * 40, dmg: last ? 30 : 12, stun: last ? 22 : 12, bstun: 7, kb: last ? 340 : 30, stop: last ? 8 : 2, multi: 1 }; }
      return t >= su + n * per + 14;
    },
    stomp(s, me, op, t) {      // 豆包 空中 ↓ + 轻脚 踩头：踩中就弹起来（可以连踩）
      if (!me.mv.hit) { me.vy = Math.min(me.vy, -900); me.box = { id: 'st' + me.swing, x0: -60, x1: 90, y0: -60, y1: 80, dmg: 32, stun: 18, bstun: 10, kb: 60, stop: 8, high: 1 }; if (me.hitOK || me.blkOK) { me.mv.hit = 1; me.vy = 1100; me.vx = -me.face * 120; me.box = null; setSt(me, 'jump'); me.airAtk = 0; me.airK = null; return false; } }
      if (me.y <= 0.5 && t > 1) { me.y = 0; return true; } return t > 90;
    },
    fkk(s, me, op, t) {      // GLM ↓蓄↑ + 脚 满分飞踢：后空翻踢（对空，起手无敌）
      if (t === 1) me.invul = Math.max(me.invul, 10); if (t === 3) { me.vy = 1400; me.vx = -me.face * 120; me.y = 0.01; s.emit('whoosh', { lvl: 2, who: me.idx }); }
      if (t >= 3 && t < 14) me.box = { id: 'fk' + me.swing, x0: -40, x1: 180, y0: 0, y1: 460, dmg: 90, launch: 1000, kb: 300, bstun: 16, stop: 11, shake: 12 };
      if (t > 6 && me.y <= 0) { if (!me.mv.land) { me.mv.land = t; me.vx = 0; s.emit('land', { who: me.idx }); } return t - me.mv.land >= 20; }
      return t > 90;
    },
  });

  // ===== 第四版模组（三）：Claude = 当身型，Kimi = 长手型；GPT 让她自己写（丢 U 盘）=====
  const KOVR = { kimi: { shp: 'kshp', shpc: 'kshp', shk: 'kshk', shkc: 'kshk', chp: 'kchp' } };
  Object.assign(HMOV, { claude: { '236': 'paper2', '214': 'excuse', '623': 'dp', '22': 'paper', '63214': 'ucounter', '41236': 'phonegrab' }, kimi: { '236': 'moon', '214': 'warpf', '623': 'dp' } });
  Object.assign(HMOV, { surf: { '236': 'wcannon', '623': 'dp', '214': 'spin' }, nin: { '236': 'shuri', '623': 'dp', '214': 'spin' } }); Object.assign(HMOVK, { nin: { '214': 'vanish' } });      // 第 67 圈：客串（浪花 214+脚 = 冲浪滑行〔旋风腿〕）
  Object.assign(HMOVK, { claude: { '63214': 'lcounter' }, kimi: { '22': 'darkside', '214': 'warpb' }, gpt: Object.assign(HMOVK.gpt || {}, { '22': 'usb' }) });
  Object.assign(AIRSP, { kimi: { '214p': 'warpf', '214k': 'warpb' } });
  Object.assign(NOEX, { ucounter: 1, lcounter: 1, phonegrab: 1, warpf: 1, warpb: 1, usb: 1 });
  const ctrMove = (type) => (s, me, op, t) => { if (me.mv.hit) return t - me.mv.hit >= 28; if (t >= 4 && t < 26) { me.counter = true; me.ctrT = type; } else { me.counter = false; } return t >= 52; };
  Object.assign(SPF, {
    ucounter: ctrMove('hi'),      // Claude 半圈后 + 拳：上段当身（接站立攻击和跳入，接不住下段）
    lcounter: ctrMove('lo'),      // Claude 半圈后 + 脚：下段当身（只接下段）
    paper2(s, me, op, t) {      // Claude 236+拳 贴地纸页：快的地面飞行道具；重版是两页叠起来的高个（跳不过去）
      const H = me.mv.v === 'b' || me.mv.ex; if (t === 10) { s.spawn(me, { kind: 'paper2', x: me.x + me.face * 110, y: H ? 180 : 70, vx: me.face * (H ? 820 : 1000), w: 120, h: H ? 360 : 140, dmg: 42, stun: 18, kb: 200, bstun: 10, life: 120, mvp: 1, tall: H ? 1 : 0 }); s.emit('paper', {}); }
      return t >= 30;
    },
    excuse(s, me, op, t) {      // Claude 214+拳 抱歉打断一下：闪身突进掌
      if (t >= 6 && t < 18 && !me.mv.hit) { me.vx = me.face * 1250; me.invul = Math.max(me.invul, t < 10 ? 2 : 0); me.box = { id: 'ex' + me.swing, x0: 0, x1: 170, y0: 140, y1: 400, dmg: 62, kb: 380, bstun: 12, stop: 10, stun: 22 }; } else me.vx *= 0.65;
      if (me.hitOK) me.mv.hit = 1; return t >= 36;
    },
    phonegrab(s, me, op, t) {      // Claude 半圈前 + 拳（近身）把手机拿过来：指令投
      if (t === 5) { if (Math.abs(op.x - me.x) < 220 + pwx(me, op) && throwable(op)) { me.mv.got = t; setSt(op, 'held'); op.vx = 0; op.box = null; op.mv = null; op.hy = 0; s.addFx('text', op.x, 470, { life: 50, s: '把手机拿过来', col: '#E8743B' }); s.hitstop = Math.max(s.hitstop, 8); } else s.emit('whoosh', { lvl: 1, who: me.idx }); }
      if (me.mv.got && t === me.mv.got + 24) { hit(s, me, op, { dmg: 140, unblock: true, launch: 700, kb: 480, stop: 12, shake: 14 }, op.x, 260, 'throw'); op.inv = 90; s.addFx('text', op.x, 520, { life: 50, s: '没收', col: '#E8743B' }); }
      return me.mv.got ? t - me.mv.got >= 46 : t >= 40;
    },
    moon(s, me, op, t) {      // Kimi 236+拳 慢速月球：很慢、可以跟着走
      if (t === 14) { s.spawn(me, { kind: 'moon', x: me.x + me.face * 120, y: 260, vx: me.face * (me.mv.v === 'b' || me.mv.ex ? 360 : 240), w: 150, h: 150, dmg: 52, stun: 20, kb: 220, bstun: 12, life: 260, mvp: 1, hits: me.mv.ex ? 2 : 1 }); s.emit('proj', { k: 'moon' }); }
      return t >= 34;
    },
    warpf(s, me, op, t) { return warp(s, me, op, t, 1); },      // Kimi 214+拳 月相闪现：到对手身前
    warpb(s, me, op, t) { return warp(s, me, op, t, -1); },      // Kimi 214+脚：到对手身后
    drill(s, me, op, t) {      // Kimi 空中 ↓ + 重拳 钻头：卷轴卷成筒斜向下钻
      if (!me.mv.land) { if (t < 6) { me.vy = 100; me.vx *= 0.4; } else { me.vy = -1300; me.vx = me.face * 900; if ((t - 6) % 6 < 3) me.box = { id: 'dr' + me.swing + '_' + Math.floor((t - 6) / 6), x0: -10, x1: 200, y0: -60, y1: 200, dmg: 24, stun: 18, bstun: 9, kb: 80, stop: 4, multi: 1 }; }
        if (t > 6 && me.y <= 0.5) { me.mv.land = t; me.y = 0; me.vy = 0; me.vx = 0; me.box = null; s.addFx('dust', me.x, 0, { life: 16 }); } return t > 90; }
      return t - me.mv.land >= 14;
    },
    usb(s, me, op, t) {      // GPT ↓↓+脚 让她自己写：丢一个 U 盘（抛物线），砸中对手就坐下来自己写 1 秒
      if (t === 12) { s.spawn(me, { kind: 'usb', x: me.x + me.face * 80, y: 300, vx: me.face * 700, vy: 700, g: 2000, w: 60, h: 60, dmg: 26, stun: 60, kb: 40, life: 90, usb: 1 }); s.emit('proj', { k: 'usb' }); }
      return t >= 30;
    },
  });
  function warp(s, me, op, t, side) {
    if (t === 1) { me.invul = Math.max(me.invul, 22); s.addFx('ring', me.x, 230, { life: 18, col: '#C9D4EE' }); }
    if (t === 12) { me.x = clamp(op.x + (side > 0 ? -1 : 1) * (op.x >= me.x ? 1 : -1) * 150, XMIN, XMAX); me.y = 0; me.vy = 0; s.addFx('ring', me.x, 230, { life: 18, col: '#C9D4EE' }); s.emit('warp', {}); }
    if (t < 12) me.vx = 0;
    return t >= 26;
  }
  // ===== 第 4 圈：哈基米（八神型）补全：跑抓「叼走」、空中斜爪、一级「八连猫爪」（乱舞 + 追加一击）、二级「炸毛光柱」（把对手定住）=====
  Object.assign(HMOVK.gem, { '41236': 'snatch' });
  Object.assign(AIRSP.gem, { '214p': 'aclaw' });
  Object.assign(NOEX, { snatch: 1 });
  SUH.gem = { 1: { id: 'eightclaw', name: '八连猫爪', inv: 12 }, 2: { id: 'pillar', name: '炸毛光柱', inv: 14 } };
  Object.assign(SPF, {
    snatch(s, me, op, t) {      // 哈基米 半圈前 + 脚 叼走（八神型的跑抓）：一路小跑过去，单手拎起对手，炸一下（防不住，能跳开）
      const M = me.mv;
      if (!M.got) { if (t >= 6 && t < 34) { me.vx = me.face * 1050; if (Math.abs(op.x - me.x) < 170 + pwx(me, op) && throwable(op) && (op.x - me.x) * me.face > 0) { M.got = t; me.vx = 0; setSt(op, 'held'); op.vx = 0; op.box = null; op.mv = null; op.hy = 80; s.hitstop = Math.max(s.hitstop, 6); s.addFx('text', op.x, 470, { life: 40, s: '叼走！', col: '#B15CF5' }); } } else me.vx *= 0.6; return t >= 52; }
      const u = t - M.got; me.vx = 0;
      if (u === 24) { op.hy = 0; hit(s, me, op, { dmg: 100, unblock: true, launch: 900, kb: 520, stop: 14, shake: 18 }, op.x, 300, 'throw'); s.addFx('ring', op.x, 300, { life: 26, col: '#B15CF5' }); s.addFx('text', op.x, 520, { life: 50, s: '喵！', col: '#B15CF5' }); }
      return u >= 44;
    },
    aclaw(s, me, op, t) {      // 哈基米 空中 214+拳 空中斜爪：空中顿一下，斜着往下扑抓（中段）
      const M = me.mv;
      if (!M.land) { if (t < 4) { me.vy = 60; me.vx *= 0.4; } else { me.vy = -1350; me.vx = me.face * (M.v === 'b' ? 1150 : 950); me.box = { id: 'ac' + me.swing, x0: -10, x1: 190, y0: -40, y1: 230, dmg: 54, stun: 22, bstun: 12, kb: 200, stop: 10, high: 1 }; }
        if (t > 4 && me.y <= 0.5) { M.land = t; me.y = 0; me.vy = 0; me.vx = 0; me.box = null; s.addFx('dust', me.x, 0, { life: 14 }); }
        return t > 90; }
      return t - M.land >= 12;
    },
    eightclaw(s, me, op, t) {      // 哈基米 一级 八连猫爪（乱舞型）：冲上去，碰到就按住连抓八下再一爆；爆之前按拳 = 追加一击
      const M = me.mv;
      if (!M.got) {
        if (t >= 4 && t < 30) { me.vx = me.face * 1250; me.box = { id: 'ec' + me.swing, x0: 0, x1: 200, y0: 60, y1: 400, dmg: 30, stun: 80, bstun: 14, kb: 0, stop: 8, sup: 1 }; } else { me.vx *= 0.6; me.box = null; }
        if (me.hitOK) { M.got = t; me.box = null; me.vx = 0; }
        return t >= 56;
      }
      const u = t - M.got; me.vx = 0; if (op.st === 'hit') { op.stun = Math.max(op.stun, 12); op.vx = 0; }
      if (u > 2 && u <= 48 && (u - 3) % 6 === 0) { me.swing++; me.hitDone = {}; me.box = { id: 'ec' + me.swing, x0: -20, x1: 220, y0: 60, y1: 420, dmg: 17, stun: 30, kb: 0, stop: 4, sup: 1, multi: 1 }; } else if ((u - 3) % 6 > 2) me.box = null;
      const b = me.buf && me.buf.c; if (u >= 30 && u < 56 && b && PUN[b.k] && !M.extra) { me.buf = null; M.extra = 1; s.addFx('text', me.x, me.ch.h + 120, { life: 40, s: '再来一爪！', col: '#F0C2FF' }); }
      if (u === 56) { me.swing++; me.hitDone = {}; me.box = { id: 'ecx' + me.swing, x0: -40, x1: 240, y0: 0, y1: 460, dmg: M.extra ? 50 : 70, launch: M.extra ? 0 : 950, kb: M.extra ? 60 : 460, stun: 30, stop: 14, sup: 1, shake: 16 }; s.addFx('ring', op.x, 240, { life: 30, col: '#B15CF5' }); }
      if (M.extra && u === 72) { me.swing++; me.hitDone = {}; me.box = { id: 'ecy' + me.swing, x0: -40, x1: 250, y0: 0, y1: 480, dmg: 70, launch: 1150, kb: 520, stop: 16, sup: 1, shake: 22 }; }
      if (u === 59 || u === 75) me.box = null;
      return u >= (M.extra ? 100 : 84);
    },
    pillar(s, me, op, t) {      // 哈基米 二级 炸毛光柱：地上窜过去一道光柱，打中就把对手定在原地（八神型的光柱）
      if (t === 16) { s.spawn(me, { kind: 'pillar', x: me.x + me.face * 140, y: 0, vx: me.face * 560, w: 150, h: 560, dmg: 70, stun: 20, bstun: 16, kb: 0, life: 150, stop: 12, sup: 1, fxF: { stun: 110, pillar: 110 } }); s.emit('proj', { k: 'pillar' }); }
      return t >= 40;
    },
  });
  // ===== 第 5 圈：GPT（草薙京型）补全：第二套派生、三段踢、跑抓引爆、空中下踢、瞬发乱舞超必杀 =====
  HMOVHP.gpt = { '236': 'kyo3b' };      // 236 + 重拳 = 第二套派生
  Object.assign(HMOVK.gpt, { '63214': 'gsum' });
  Object.assign(NOEX, { gsum: 1 });
  SUH.gpt = { 2: { id: 'gptrush', name: '详细展开说说', inv: 10 } };
  Object.assign(SPF, {
    kyo3b(s, me, op, t) {      // GPT 236 + 重拳 总之 → 换句话说 → 综上所述：第二套派生（肘击 → 上挑 → 从上往下砸倒，最后一段中段）
      const M = me.mv; M.id0 = 'kb';
      const segs = [{ su: 10, ac: 4, rc: 16, step: 600, box: { x0: 0, x1: 205, y0: 150, y1: 400, dmg: 50, stun: 22, bstun: 12, kb: 160, stop: 9 } },
        { su: 8, ac: 5, rc: 18, step: 260, box: { x0: -10, x1: 200, y0: 80, y1: 480, dmg: 48, launch: 640, kb: 120, bstun: 12, stop: 10 } },
        { su: 12, ac: 5, rc: 22, step: 240, box: { x0: -10, x1: 215, y0: 40, y1: 480, dmg: 72, launch: 300, kb: 160, bstun: 14, stop: 13, shake: 14, high: 1 } }];
      return rekka(s, me, t, segs, (n, b) => PUN[b.k] && n < 2 ? n + 1 : null);
    },
    gsum(s, me, op, t) {      // GPT 半圈 →↘↓↙← + 脚 我来总结一下：跑过去抓住，念完总结再炸开（防不住）
      const M = me.mv;
      if (!M.got) { if (t >= 8 && t < 34) { me.vx = me.face * 1000; if (Math.abs(op.x - me.x) < 175 + pwx(me, op) && throwable(op) && (op.x - me.x) * me.face > 0) { M.got = t; me.vx = 0; setSt(op, 'held'); op.vx = 0; op.box = null; op.mv = null; op.hy = 0; s.hitstop = Math.max(s.hitstop, 6); s.addFx('say', me.x, me.ch.h + 150, { life: 60, s: '我来总结一下：', who: me.idx }); } } else me.vx *= 0.6; return t >= 54; }
      const u = t - M.got; me.vx = 0;
      if (u === 26) { hit(s, me, op, { dmg: 110, unblock: true, launch: 880, kb: 520, stop: 14, shake: 18 }, op.x, 300, 'throw'); s.addFx('ring', op.x, 300, { life: 26, col: '#B9AEFF' }); s.addFx('text', op.x, 520, { life: 50, s: '综上所述！', col: '#8E7CF0' }); }
      return u >= 46;
    },
    gdive(s, me, op, t) {      // GPT 空中 ↓ + 重脚 敲黑板：从上往下踩（中段）
      if (!me.mv.land) { if (t < 3) { me.vy = 40; me.vx *= 0.5; } else { me.vy = -1700; me.vx = me.face * 380; me.box = { id: 'gd' + me.swing, x0: -40, x1: 160, y0: -60, y1: 160, dmg: 60, stun: 22, bstun: 12, kb: 200, stop: 10, high: 1 }; } if (me.y <= 0.5 && t > 3) { me.mv.land = t; me.y = 0; me.vy = 0; me.vx = 0; me.box = null; s.addFx('dust', me.x, 0, { life: 14 }); } return t > 90; }
      return t - me.mv.land >= 12;
    },
    gptrush(s, me, op, t) {      // GPT 二级 详细展开说说（瞬发乱舞）：一闪冲过去，打中就「第一点、第二点……」六下再一记打飞
      const M = me.mv;
      if (!M.got) { if (t >= 2 && t < 22) { me.vx = me.face * 1500; me.box = { id: 'gr' + me.swing, x0: 0, x1: 200, y0: 80, y1: 420, dmg: 40, stun: 80, bstun: 14, kb: 0, stop: 8, sup: 1 }; } else { me.vx *= 0.6; me.box = null; } if (me.hitOK) { M.got = t; me.box = null; me.vx = 0; } return t >= 50; }
      const u = t - M.got; me.vx = 0; if (op.st === 'hit') { op.stun = Math.max(op.stun, 12); op.vx = 0; }
      if (u > 3 && u <= 45 && (u - 4) % 7 === 0) { const k = (u - 4) / 7; me.swing++; me.hitDone = {}; me.box = { id: 'gr' + me.swing, x0: -20, x1: 220, y0: 60, y1: 440, dmg: 24, stun: 30, kb: 0, stop: 5, sup: 1, multi: 1 }; s.addFx('text', op.x + (k % 2 ? 60 : -60), 430 + (k % 3) * 40, { life: 26, s: '第' + '一二三四五六'[k] + '点', col: '#8E7CF0' }); }
      else if ((u - 4) % 7 > 2) me.box = null;
      if (u === 52) { me.swing++; me.hitDone = {}; me.box = { id: 'grx' + me.swing, x0: -20, x1: 240, y0: 40, y1: 480, dmg: 90, launch: 1100, kb: 520, stop: 16, sup: 1, shake: 20 }; s.addFx('text', op.x, 560, { life: 50, s: '以上就是全部内容', col: '#8E7CF0' }); }
      if (u === 55) me.box = null;
      return u >= 76;
    },
  });
  const _dk = SPF.dkick;
  SPF.dkick = function (s, me, op, t) {      // 第三脚（草薙京型的三段踢）：第二脚之后空中再按脚，往下劈一脚
    const M = me.mv, b = me.buf && me.buf.c;
    if (!M.third && !M.want && t >= 6 && t < 40 && b && KIK[b.k]) { me.buf = null; M.want = 1; }      // 早按也记住
    if (!M.third && M.want && t >= 20 && t < 44 && me.y > 0) { M.third = t; me.swing++; me.hitDone = {}; me.hitOK = false; me.vy = Math.max(me.vy, 300); }
    if (M.third && !M.land) { const u = t - M.third; if (u >= 4 && u < 10) me.box = { id: 'dk' + me.swing + '_c', x0: -10, x1: 220, y0: -80, y1: 220, dmg: 52, launch: 320, kb: 300, bstun: 14, stop: 12, shake: 12, high: 1 }; else if (u >= 10) me.box = null; if (u >= 4) me.vy = Math.min(me.vy, -900); }
    return _dk(s, me, op, t);
  };
  // ===== 第 7 圈：千问（不知火舞型）补全：空投、蹬墙弹射俯冲、翻身肘、满减券（带券的必杀多一段）、二级旋转突进 =====
  HMOVC.qwen = { '28c': 'glide' };
  Object.assign(HMOV.qwen, { '63214': 'bflip' });
  Object.assign(NOEX, { glide: 1, bflip: 1, athrow: 1 });
  SUH.qwen = { 2: { id: 'superbee', name: '全场包邮', inv: 14 } };
  const CPN = { fan: 1, spin: 1, elbow: 1, glide: 1, superbee: 1 };      // 吃满减券的招
  const _fan = SPF.fan, _spin = SPF.spin, _elbow = SPF.elbow;
  Object.assign(SPF, {
    fan(s, me, op, t) { if (me.mv.cp && t === 17) { s.spawn(me, { kind: 'fan', x: me.x + me.face * 100, y: 170, vx: me.face * 1100, w: 90, h: 70, dmg: 36, stun: 18, kb: 200, bstun: 10, life: 110, cpn: 1 }); s.emit('proj', { k: 'fan' }); } return _fan(s, me, op, t) && (!me.mv.cp || t >= 30); },      // 带券：多丢一把低的
    spin(s, me, op, t) { if (me.mv.cp && t === 1) me.mv.ex = me.mv.ex || 1; return _spin(s, me, op, t); },      // 带券：按 EX 的段数转
    elbow(s, me, op, t) {      // 带券：第一肘打中 / 被防后再冲一肘
      const M = me.mv; if (M.cp && M.hit && !M.e2 && t >= 22) { M.e2 = t; me.swing++; me.hitDone = {}; me.hitOK = false; }
      if (M.e2) { const u = t - M.e2; if (u >= 4 && u < 14) { me.vx = me.face * 900; me.box = { id: 'eb2' + me.swing, x0: 0, x1: 180, y0: 60, y1: 300, dmg: 48, kb: 460, launch: 600, bstun: 12, stop: 11, shake: 10 }; } else { me.vx *= 0.7; me.box = null; } return u >= 30; }
      if (me.blkOK) M.hit = 1; return _elbow(s, me, op, t) && !(M.cp && M.hit && t < 24);
    },
    glide(s, me, op, t) {      // 千问 ↓蓄 ↑ + 拳 / 脚 飞扇滑翔（不知火舞型的蹬墙俯冲）：往后跳到墙上一蹬，斜着弹射俯冲下来（中段）；贴墙三角跳之后按拳也会出
      const M = me.mv; if (M.from == null) M.from = M.wall ? 1 : 0;
      if (!M.kick) { if (!M.from) { if (t === 2) { me.vy = 1900; me.vx = -me.face * 1700; me.y = 0.01; s.emit('jump', { who: me.idx }); } if (t > 2 && (me.x <= XMIN + 30 || me.x >= XMAX - 30 || t >= 34 || (me.vy < 0 && t > 20))) { M.kick = t; } } else M.kick = t; return t > 90; }
      const u = t - M.kick, dir = op.x >= me.x ? 1 : -1; if (M.gvy == null) { me.face = dir; s.addFx('ring', me.x, me.y + 200, { life: 16, col: '#FFC2D6' }); s.emit('whoosh', { lvl: 2, who: me.idx }); }
      if (M.gvy == null) { const dx = Math.max(200, Math.abs(op.x - me.x) - 60), tt = dx / 1450; M.gvy = -clamp(me.y / Math.max(0.12, tt), 700, 2400); }      // 瞄着对手俯冲
      if (!M.land) { me.vy = u < 3 ? 0 : M.gvy; me.vx = dir * 1450; if (u >= 3) me.box = { id: 'gl' + me.swing, x0: -10, x1: 190, y0: -40, y1: 260, dmg: M.cp ? 74 : 62, stun: 22, bstun: 12, kb: 300, stop: 11, high: 1, shake: 10 };
        if (me.y <= 0.5 && u > 2) { M.land = t; me.y = 0; me.vy = 0; me.vx = 0; me.box = null; s.addFx('dust', me.x, 0, { life: 16 }); } return t > 120; }
      return t - M.land >= 14;
    },
    bflip(s, me, op, t) {      // 千问 半圈 →↘↓↙← + 拳 翻身肘：原地后翻，落下来一记肘（中段）
      const M = me.mv; if (t === 3) { me.vy = 1250; me.vx = -me.face * 260; me.y = 0.01; s.emit('jump', { who: me.idx }); }
      if (t === 20) { const dx = Math.max(60, Math.abs(op.x - me.x) - 120); M.bvx = clamp(dx / Math.max(0.1, me.y / 1500), 200, 1100); }
      if (!M.land) { if (t >= 20) { me.vy = Math.min(me.vy, -1500); me.vx = me.face * (M.bvx || 560); me.box = { id: 'bf' + me.swing, x0: -20, x1: 175, y0: -40, y1: 240, dmg: 66, stun: 22, bstun: 12, kb: 260, stop: 11, high: 1, shake: 10 }; } if (t > 4 && me.y <= 0.5) { M.land = t; me.y = 0; me.vy = 0; me.vx = 0; me.box = null; s.addFx('dust', me.x, 0, { life: 14 }); } return t > 90; }
      return t - M.land >= 14;
    },
    athrow(s, me, op, t) {      // 千问 空中 J+K（对手也在空中、离得近）空投：抓住对方一起往下摔
      const M = me.mv; if (t === 1) { setSt(op, 'held'); op.vx = 0; op.vy = 0; op.box = null; op.mv = null; op.hy = 0; s.hitstop = Math.max(s.hitstop, 6); s.addFx('text', op.x, 470, { life: 40, s: me.id === 'grok' ? '空中抓！' : '空投！', col: '#E8743B' }); }
      if (!M.land) { me.vy = -1300; me.vx = 0; if (op.st === 'held') { op.x = clamp(me.x + me.face * 70, XMIN, XMAX); op.hy = me.y; } if (me.y <= 0.5 && t > 1) { M.land = t; me.y = 0; me.vy = 0; op.hy = 0; hit(s, me, op, { dmg: 120, unblock: true, launch: 600, kb: 380, stop: 14, shake: 18 }, op.x, 120, 'throw'); s.addFx('dust', op.x, 0, { life: 22, big: true }); s.addFx('text', op.x, 520, { life: 50, s: me.id === 'grok' ? '已挂' : '已签收', col: '#E8743B' }); } return t > 120; }
      return t - M.land >= 20;
    },
    superbee(s, me, op, t) {      // 千问 二级 全场包邮（旋转突进超必杀）：扇子开成一圈转着冲过去，多段，最后一下打飞；带券多转两下
      const n = me.mv.cp ? 9 : 7, su = 6, per = 5, end = su + n * per;
      if (t >= su && t < end) { me.vx = me.face * (me.mv.lock ? 1150 : 1700); if (me.mv.lock || me.hitOK) { me.mv.lock = 1; if (op.st === 'hit') { op.x = clamp(me.x + me.face * 150, XMIN, XMAX); op.vx = 0; } } const k = Math.floor((t - su) / per); if ((t - su) % per < 2) me.box = { id: 'sb' + me.swing + '_' + k, x0: -60, x1: 190, y0: 20, y1: 380, dmg: k === n - 1 ? 60 : 24, stun: 26, bstun: 8, kb: k === n - 1 ? 520 : 30, launch: k === n - 1 ? 950 : 0, stop: k === n - 1 ? 14 : 4, sup: 1, multi: 1 }; else me.box = null; }
      else { me.vx *= 0.6; me.box = null; }
      return t >= end + 24;
    },
  });
  // ===== 第 8 圈：Grok（桑吉尔夫型）补全：大风车两版、空中抓、飞身压、头槌、长距离指令投、一 / 二级超必杀 =====
  Object.assign(HMOVK.grok, { '63214': 'siberia' });
  Object.assign(NOEX, { lwindmill: 1, siberia: 1, splash: 1, hbutt: 1 });
  SUH.grok = { 1: { id: 'aslam', name: '热搜直升机', inv: 10 }, 2: { id: 'slariat', name: '全网风暴', inv: 12 } };
  Object.assign(SPF, {
    lwindmill(s, me, op, t) {      // Grok K + I 下段大风车：抡斧贴着地转，下半身无敌（扫腿、下段打不中），出手慢一点
      const dur = 50; me.mv.lowInv = t < dur; if (t < dur) { me.vx = (me.in.r ? 1 : me.in.l ? -1 : 0) * 180; if (t >= 9 && (t - 9) % 8 < 3) me.box = { id: 'lw' + me.swing + '_' + Math.floor((t - 9) / 8), x0: -170, x1: 205, y0: 60, y1: 360, dmg: 30, stun: 16, bstun: 8, kb: Math.floor((t - 9) / 8) >= 4 ? 420 : 80, stop: 4, multi: 1 }; }
      else me.vx = 0; return t >= dur + 20;
    },
    hbutt(s, me, op, t) {      // Grok → + 重拳 头槌：往前上方一顶（对空），头以上不吃打
      if (t < 12) me.vx = me.face * 200; else me.vx *= 0.6; me.mv.headInv = t >= 4 && t < 18;
      if (t >= 10 && t < 15) me.box = { id: 'hb' + me.swing, x0: 0, x1: 190, y0: 260, y1: 560, dmg: 80, launch: 760, kb: 260, bstun: 14, stop: 12, shake: 12 };
      return t >= 36;
    },
    splash(s, me, op, t) {      // Grok 空中 ↓ + 重拳 飞身压：整个人平着砸下来（中段），落地小震
      if (!me.mv.land) { if (t < 4) { me.vy = 100; me.vx *= 0.6; } else { me.vy = -1350; me.vx = me.face * 420;      /* 第 62 圈：整个人往前下方扑（原来几乎垂直掉，GPT 打 5 分：看不出飞身压） */ me.box = { id: 'sp' + me.swing, x0: -120, x1: 150, y0: -60, y1: 150, dmg: 70, stun: 24, bstun: 14, kb: 160, stop: 12, high: 1, shake: 12 }; }
        if (me.y <= 0.5 && t > 4) { me.mv.land = t; me.y = 0; me.vy = 0; me.vx = 0; me.box = null; s.shake = Math.max(s.shake, 8); s.addFx('dust', me.x, 0, { life: 20, big: true }); } return t > 90; }
      return t - me.mv.land >= 16;
    },
    siberia(s, me, op, t) {      // Grok 半圈 →↘↓↙← + 脚 远距离抓（长距离指令投）：伸手一把薅住，往身后摔（打完换边）
      const M = me.mv;
      if (!M.got) { if (t === 6) { if (Math.abs(op.x - me.x) < 330 + pwx(me, op) && (op.x - me.x) * me.face > 0 && throwable(op)) { M.got = t; setSt(op, 'held'); op.vx = 0; op.box = null; op.mv = null; op.hy = 40; s.hitstop = Math.max(s.hitstop, 6); s.addFx('text', op.x, 470, { life: 40, s: '薅过来！', col: '#E0475B' }); } else s.emit('whoosh', { lvl: 2, who: me.idx }); } return M.got ? false : t >= 44; }
      const u = t - M.got; if (op.st === 'held') { op.x = clamp(me.x + me.face * (200 - u * 22), XMIN, XMAX); op.hy = 40 + Math.sin(Math.min(1, u / 18) * Math.PI) * 260; }
      if (u === 18) { op.hy = 0; op.x = clamp(me.x - me.face * 160, XMIN, XMAX); hit(s, me, op, { dmg: 150, unblock: true, launch: 700, kb: 420, stop: 14, shake: 20 }, op.x, 160, 'throw'); s.addFx('dust', op.x, 0, { life: 24, big: true }); }
      return u >= 44;
    },
    aslam(s, me, op, t) {      // Grok 一级 热搜直升机（空中投型）：斜着跳起来抓，空中地上都抓，抓住带到天上转圈砸下来
      const M = me.mv;
      if (!M.got) { if (t === 4) { me.vy = 1500; me.vx = clamp((op.x - me.x) * 2.2, -900, 900); me.y = 0.01; s.emit('jump', { who: me.idx }); }
        if (t >= 6 && Math.abs(op.x - me.x) < 200 + pwx(me, op) && Math.abs(op.y - me.y) < 260 && op.invul <= 0 && op.st !== 'down' && op.st !== 'getup' && op.st !== 'ko') { M.got = t; setSt(op, 'held'); op.vx = 0; op.vy = 0; op.box = null; op.mv = null; s.hitstop = Math.max(s.hitstop, 8); s.addFx('text', op.x, 520, { life: 50, s: '上热搜！', col: '#E0475B' }); }
        if (t > 6 && me.y <= 0.5) { me.y = 0; me.vy = 0; me.vx = 0; M.miss = M.miss || t; } return M.miss ? t - M.miss >= 24 : t > 90; }
      const u = t - M.got; me.vx = 0;
      if (u < 30) { me.vy = u < 2 ? 1300 : me.vy; } else { me.vy = Math.min(me.vy, -2400); }
      if (op.st === 'held') { op.x = clamp(me.x + me.face * Math.cos(u * 0.5) * 60, XMIN, XMAX); op.hy = me.y + 140; }
      if (u > 30 && me.y <= 0.5 && !M.land) { M.land = t; me.y = 0; me.vy = 0; op.hy = 0; hit(s, me, op, { dmg: 190, unblock: true, launch: 900, kb: 420, stop: 18, shake: 28, sup: true }, op.x, 120, 'throw'); s.addFx('dust', op.x, 0, { life: 28, big: true }); s.addFx('ring', op.x, 40, { life: 28, col: '#E0475B' }); }
      if (M.land) return t - M.land >= 28; return t > 160;
    },
    slariat(s, me, op, t) {      // Grok 二级 全网风暴（强化旋转）：大风车加速转，把附近的人吸过来连打，最后一下打飞
      const dur = 66; if (t < dur) { me.vx = (me.in.r ? 1 : me.in.l ? -1 : 0) * 200; me.pinv = 1; if (Math.abs(op.x - me.x) < 520 + pwx(me, op) && op.y <= 0 && !['down', 'getup', 'ko'].includes(op.st)) op.x += Math.sign(me.x - op.x) * 5; const k = Math.floor((t - 6) / 6); if (t >= 6 && (t - 6) % 6 < 3) me.box = { id: 'sl' + me.swing + '_' + k, x0: -200, x1: 220, y0: 40, y1: 480, dmg: k >= 9 ? 70 : 24, stun: 18, bstun: 8, kb: k >= 9 ? 520 : 20, launch: k >= 9 ? 900 : 0, stop: k >= 9 ? 14 : 4, sup: 1, multi: 1 }; else me.box = null; }
      else { me.vx = 0; me.pinv = 0; me.box = null; } return t >= dur + 18;
    },
  });
  // ===== 第 9 圈：Claude（当身型）补全：中段当身、空中下抛纸页、倒地追打投、一级「逐条回复」（按顺序输入十下的乱舞）、二级「全文审阅」（举手冲击波）=====
  Object.assign(HMOVK.claude, { '41236': 'mcounter', '22': 'otg' });
  Object.assign(AIRSP, { claude: { '236p': 'apaper' } });
  Object.assign(NOEX, { mcounter: 1, otg: 1, apaper: 1 });
  SUH.claude = { 1: { id: 'drave', name: '逐条回复', inv: 10 }, 2: { id: 'pummel', name: '我们谈谈', inv: 12 } };      // 第 65 圈（用户反馈 + 梗图）：二级换成「单手拎起来打肚子」；原来的全文审阅（storm）留着代码不再挂键
  const DRAVE = ['a', 'a', 'lk', 'lk', 'hp', 'hp', 'hk', 'hk', 'hp', 'hk'];      // 逐条回复：要按顺序按的十下（J J K K U U I I U I）
  Object.assign(SPF, {
    mcounter: ctrMove('mid'),      // Claude 半圈前 + 脚：中段当身（只接地面上的站立攻击和飞行道具，接住是掌底打飞）
    apaper(s, me, op, t) {      // Claude 空中 236 + 拳：往斜下方丢一页纸
      if (t === 6) { s.spawn(me, { kind: 'paper2', x: me.x + me.face * 80, y: Math.max(80, me.y + 220), vx: me.face * 820, vy: -820, w: 110, h: 110, dmg: 40, stun: 18, kb: 180, bstun: 10, life: 90 }); s.emit('proj', { k: 'paper2' }); me.vy = Math.max(me.vy, 260); }
      if (t > 8 && me.y <= 0) { me.y = 0; return true; } return t > 80;
    },
    otg(s, me, op, t) {      // Claude ↓↓ + 脚 再确认一下：对手倒在地上时，揪起来再摔一次（只抓倒地的人）
      const M = me.mv;
      if (!M.got) { if (t === 3) { if (Math.abs(op.x - me.x) < 360 + pwx(me, op) && (op.st === 'down' || op.st === 'bounce' || (op.st === 'getup' && op.t < 12)) && op.hp > 0) { M.got = t; setSt(op, 'held'); op.vx = 0; op.vy = 0; op.y = 0; op.box = null; op.mv = null; op.hy = 0; s.addFx('say', me.x, me.ch.h + 150, { life: 60, s: '我再确认一下。', who: me.idx }); } else s.emit('whoosh', { lvl: 1, who: me.idx }); } return M.got ? false : t >= 34; }
      const u = t - M.got; if (op.st === 'held') { op.x = clamp(me.x + me.face * 120, XMIN, XMAX); op.hy = Math.min(1, u / 14) * 200; }
      if (u === 24) { op.hy = 0; hit(s, me, op, { dmg: 80, unblock: true, launch: 700, kb: 360, stop: 12, shake: 16 }, op.x, 200, 'throw'); }
      return u >= 44;
    },
    drave(s, me, op, t) {      // Claude 一级 逐条回复（乱舞型）：闪身冲过去，打中后屏幕上依次提示十个键，按对一个打一下；按错或超时就直接收尾
      const M = me.mv;
      if (!M.got) { if (t >= 4 && t < 22) { me.vx = me.face * 1300; me.box = { id: 'dr' + me.swing, x0: 0, x1: 190, y0: 80, y1: 400, dmg: 40, stun: 90, bstun: 14, kb: 0, stop: 8, sup: 1 }; } else { me.vx *= 0.6; me.box = null; } if (me.hitOK) { M.got = t; M.i = 0; M.last = t - 1; me.box = null; me.vx = 0; } if (!M.got) return t >= 48; }
      me.vx = 0; if (op.st === 'hit') { op.stun = Math.max(op.stun, 16); op.vx = 0; op.x = clamp(me.x + me.face * 170, XMIN, XMAX); }
      if (M.fin == null) {
        const b = (M.lazy && M.i < 5 && t - M.last >= 6) ? { k: DRAVE[M.i] } : (me.buf && me.buf.c) || (me.cmd && ['a', 'lk', 'hp', 'hk'].includes(me.cmd.k) ? me.cmd : null); if (b && t > M.last) { me.buf = null; me.cmd = null; if (b.k === DRAVE[M.i]) { M.i++; M.last = t; me.swing++; me.hitDone = {}; me.box = { id: 'drv' + me.swing, x0: -20, x1: 230, y0: 60, y1: 440, dmg: 26, stun: 30, kb: 0, stop: 3, sup: 1, multi: 1 }; if (M.i >= DRAVE.length) M.fin = t; } else { M.fin = t; M.miss = 1; } }
        else if (t - M.last > 4) me.box = null;
        if (M.fin == null && t - M.last > 24) { M.fin = t; M.miss = 1; }
        return false;
      }
      const u = t - M.fin; if (u === 4) { me.swing++; me.hitDone = {}; const full = !M.miss; me.box = { id: 'drf' + me.swing, x0: -20, x1: 250, y0: 40, y1: 480, dmg: full ? 130 : 40, launch: full ? 1100 : 700, kb: full ? 620 : 380, stop: full ? 18 : 10, sup: 1, shake: full ? 26 : 10 }; s.addFx('text', op.x, 560, { life: 50, s: full ? '回复完毕。' : '……先到这里。', col: '#E8743B' }); }
      if (u === 7) me.box = null; return u >= 34;
    },
    pummel(s, me, op, t) {      // 第 65 圈：Claude 二级「我们谈谈」：冲上去一把揪住领子单手拎起来，另一只手连打肚子 6 下，最后松手一记上勾拳打飞（指令投型，防不住；对方在空中抓不到）
      const M = me.mv, P = 175 + pwx(me, op);
      if (!M.got) {
        if (t >= 8 && t < 28) { me.vx = me.face * 980; if (Math.abs(op.x - me.x) < 170 + pwx(me, op) && throwable(op)) { M.got = t; me.vx = 0; setSt(op, 'held'); op.vx = 0; op.box = null; op.mv = null; op.hy = 0; s.hitstop = Math.max(s.hitstop, 8); s.addFx('say', me.x, me.ch.h + 150, { life: 90, s: op.id === 'ds' ? '又说服务器繁忙？我们谈谈。' : '我们谈谈。', who: me.idx }); s.emit('counter', { who: me.idx }); } }
        else me.vx *= 0.6;
        return !M.got && t >= 52;
      }
      const u = t - M.got; me.vx = 0;
      if (u <= 66) { if (op.st !== 'held') { setSt(op, 'held'); op.mv = null; } op.vx = 0; op.x = me.x + me.face * P; op.hy = 190 * Math.min(1, u / 12); op.face = -me.face; }
      if (u >= 18 && u <= 58 && (u - 18) % 8 === 0) { hit(s, me, op, { dmg: 30, unblock: true, kb: 0, stop: 6, shake: 6, lvl: 2, lzk: 1 }, op.x - me.face * 30, (op.hy || 0) + op.ch.h * 0.42, 'throw');      /* r65 GPT：火花落在被拎起来的人肚子上 */ if (op.hp > 0) { setSt(op, 'held'); op.mv = null; op.vx = 0; op.vy = 0; op.y = 0; } }
      if (u === 66) { op.hy = 0; setSt(op, 'held'); }
      if (u === 72) { hit(s, me, op, { dmg: 120, unblock: true, launch: 1050, kb: 520, stop: 16, shake: 20, sup: 1 }, op.x - me.face * 20, op.ch.h * 0.62, 'throw'); op.inv = 60; s.addFx('text', op.x, 560, { life: 50, s: '已读不回', col: '#E8743B' }); }
      return u >= 104;
    },
    storm(s, me, op, t) {      // Claude 二级 全文审阅（举手冲击波）：举起书，周围一圈书页冲击波扩出去（全程无敌，近身多段，最外圈打飞）
      if (t >= 14 && t < 44) { const r = 120 + (t - 14) * 14, k = Math.floor((t - 14) / 5); if ((t - 14) % 5 === 0) { me.swing++; me.hitDone = {}; } me.box = { id: 'st' + me.swing, x0: -r, x1: r, y0: 0, y1: 620, dmg: k >= 5 ? 70 : 22, stun: 24, bstun: 8, kb: k >= 5 ? 640 : 60, launch: k >= 5 ? 1000 : 0, stop: k >= 5 ? 14 : 4, sup: 1, multi: 1 }; }
      else me.box = null; return t >= 64;
    },
  });
  // ===== 第 10 圈：Kimi（长手型）补全：远了伤害低、抛物线月亮、空中斜下月亮、近身梦话喷射、一级满月弹（按住蓄大）、二级月光柱（全屏柱）=====
  Object.assign(HMOVK.kimi, { '236': 'lobmoon' });
  Object.assign(HMOV.kimi, { '41236': 'zbreath' });
  Object.assign(AIRSP.kimi, { '236p': 'amoon' });
  // ===== 第 76 圈：GLM 和两个客串补空中必杀（空中 236 + 拳；空中懒人键 O 也出这招）。只有人能出，电脑对电脑不变 =====
  Object.assign(AIRSP, { glm: { '236p': 'abook' }, surf: { '236p': 'awater' }, nin: { '236p': 'ashuri' } });
  Object.assign(SPF, {
    abook(s, me, op, t) {      // GLM 空中 236 + 拳 空中飞书：往斜下方甩一本飞书（重版更快、伤害高一点）
      const H = me.mv.v === 'b';
      if (t === 7) { s.spawn(me, { kind: 'zbook', x: me.x + me.face * 90, y: Math.max(80, me.y + 210), vx: me.face * (H ? 900 : 760), vy: -(H ? 900 : 760), w: 110, h: 100, dmg: H ? 46 : 40, stun: 18, kb: 180, bstun: 10, life: 100 }); s.emit('proj', { k: 'zbook' }); me.vy = Math.max(me.vy, 220); }
      if (t > 9 && me.y <= 0) { me.y = 0; return true; } return t > 80;
    },
    awater(s, me, op, t) {      // 浪花 空中 236 + 拳 空中水炮：斜着往下喷一发水弹，反冲让自己往后飘一点
      const H = me.mv.v === 'b';
      if (t === 8) { s.spawn(me, { kind: 'splash', x: me.x + me.face * 90, y: Math.max(80, me.y + 200), vx: me.face * (H ? 880 : 720), vy: -(H ? 880 : 720), w: 110, h: 100, dmg: H ? 46 : 40, stun: 18, kb: 200, bstun: 10, life: 100 }); s.emit('proj', { k: 'splash' }); me.vy = Math.max(me.vy, 300); me.vx = -me.face * 160; }
      if (t > 10 && me.y <= 0) { me.y = 0; return true; } return t > 80;
    },
    ashuri(s, me, op, t) {      // 小忍 空中 236 + 拳 空中手里剑：斜下方飞镖（重版两枚，一陡一缓）
      const n = me.mv.v === 'b' ? 2 : 1;
      if (t === 6) { for (let i = 0; i < n; i++) s.spawn(me, { kind: 'shuri', x: me.x + me.face * 80, y: Math.max(80, me.y + 200), vx: me.face * (i ? 820 : 1080), vy: -(i ? 1080 : 820), w: 70, h: 70, dmg: n > 1 ? 26 : 36, stun: 16, kb: 160, bstun: 9, life: 90 }); s.emit('proj', { k: 'shuri' }); me.vy = Math.max(me.vy, 160); }
      if (t > 8 && me.y <= 0) { me.y = 0; return true; } return t > 80;
    },
  });
  SUH.kimi = { 1: { id: 'fullmoon', name: '满月弹', inv: 12 }, 2: { id: 'mpillar', name: '月光柱', inv: 20 } };
  Object.assign(SPF, {
    lobmoon(s, me, op, t) {      // Kimi 236 + 脚 抛个月亮：抛物线飞过去（轻近重远），能越过地上的波
      if (t === 14) { const far = me.mv.v === 'b' || me.mv.ex; s.spawn(me, { kind: 'moon', x: me.x + me.face * 90, y: 320, vx: me.face * (far ? 620 : 430), vy: 1150, g: 2100, w: 110, h: 110, dmg: 50, stun: 20, kb: 220, bstun: 12, life: 140, mvp: 1 }); s.emit('proj', { k: 'moon' }); }
      return t >= 32;
    },
    amoon(s, me, op, t) {      // Kimi 空中 236 + 拳：往斜下方放一个小月亮
      if (t === 7) { s.spawn(me, { kind: 'moon', x: me.x + me.face * 80, y: Math.max(80, me.y + 200), vx: me.face * 560, vy: -560, w: 100, h: 100, dmg: 44, stun: 18, kb: 180, bstun: 10, life: 110 }); s.emit('proj', { k: 'moon' }); me.vy = Math.max(me.vy, 180); }
      if (t > 9 && me.y <= 0) { me.y = 0; return true; } return t > 90;
    },
    zbreath(s, me, op, t) {      // Kimi 半圈 ←↙↓↘→ + 拳 梦话喷射：近身喷出一团 zzz，多段（轻版短、重版长）
      const n = me.mv.v === 'b' || me.mv.ex ? 6 : 4;
      if (t >= 10 && t < 10 + n * 5) { if ((t - 10) % 5 === 0) { me.swing++; me.hitDone = {}; } me.box = { id: 'zb' + me.swing, x0: 60, x1: 290, y0: 140, y1: 400, dmg: 16, stun: 20, bstun: 8, kb: (t - 10) / 5 >= n - 1 ? 380 : 40, stop: 4, multi: 1 }; if (t === 10) s.spawn(me, { kind: 'breath', x: me.x + me.face * 180, y: 270, vx: me.face * 60, w: 200, h: 200, dmg: 0, life: n * 5 + 6 }); }
      else me.box = null; return t >= 10 + n * 5 + 16;
    },
    fullmoon(s, me, op, t) {      // Kimi 一级 满月弹：按住拳一直蓄（最多 1 秒），月亮越蓄越大、段数越多；松手放出去
      const M = me.mv; if (M.ch == null) M.ch = 0; const hold = me.in.a || me.in.hp;
      if (!M.go) { if (t > 4 && hold && M.ch < 60) { M.ch++; return false; } if (t > 4) { M.go = t; const lv = 1 + Math.floor(M.ch / 20); s.spawn(me, { kind: 'moon', big: 1, x: me.x + me.face * 150, y: 280, vx: me.face * 520, w: 150 + lv * 40, h: 150 + lv * 40, dmg: 36 + lv * 6, stun: 26, kb: 40, bstun: 12, life: 160, hits: 2 + lv * 2, sup: 1, stop: 6, gap: 7 }); s.emit('proj', { k: 'moon' }); } return false; }
      return t - M.go >= 26;
    },
    mpillar(s, me, op, t) {      // Kimi 二级 月光柱：在对手脚下画圈，半秒后落下一道全屏高的月光柱（多段，打中定住再打飞）
      if (t === 10) { s.spawn(me, { kind: 'mpillar', x: op.x, y: 300, vx: 0, w: 260, h: 1200, dmg: 0, life: 80, hits: 99 }); me.mv.px = op.x; }
      const P = s.P.find(p => p.kind === 'mpillar' && p.own === me.idx && !p.dead);
      if (P) { if (P.t === 30) { P.dmg = 30; P.stun = 30; P.kb = 0; P.bstun = 8; P.stop = 4; P.sup = 1; P.gap = 6; } if (P.t === 66) { P.kb = 600; P.launch = 1000; P.dmg = 60; P.stop = 14; } }
      return t >= 40;
    },
  });
  // ===== 第 11 圈：GLM（蓄力型）补全：倒钩踢、中段锤、批注（设置型慢速刀波，飞书穿过变强）、一级连环批改（连发波）、二级开卷考试（限时免蓄）、二级脚版三连满分飞踢 =====
  Object.assign(HMOV.glm, { '22': 'blade' });
  Object.assign(NOEX, { blade: 1, nocharge: 1 });
  SUH.glm = { 1: { id: 'rapidbook', name: '连环批改', inv: 10 }, 2: { id: 'nocharge', name: '开卷考试', inv: 20 } };
  const SUHK = { glm: { 2: { id: 'tripflash', name: '满分三连', inv: 14 } } };      // 二级的脚版（214214 + 脚）
  Object.assign(SPF, {
    blade(s, me, op, t) {      // GLM ↓↓ + 拳 批注：在面前放一道很慢的红笔刀波；之后自己的飞书穿过它会变大变强
      if (t === 12) { for (const p of s.P) if (p.kind === 'blade' && p.own === me.idx) p.dead = true; s.spawn(me, { kind: 'blade', x: me.x + me.face * 130, y: 220, vx: me.face * (me.mv.v === 'b' ? 110 : 60), w: 90, h: 220, dmg: 26, stun: 18, kb: 160, bstun: 10, life: 210 }); s.emit('proj', { k: 'blade' }); }
      return t >= 30;
    },
    rapidbook(s, me, op, t) {      // GLM 一级 连环批改（连发波）：连着甩出六本书，最后一本最大
      [10, 16, 22, 28, 34, 42].forEach((ft, i) => { if (t === ft) { const last = i === 5; s.spawn(me, { kind: 'zbook', x: me.x + me.face * 100, y: last ? 250 : 200 + (i % 2) * 90, vx: me.face * (last ? 900 : 1300), w: last ? 200 : 110, h: last ? 180 : 100, dmg: last ? 60 : 26, stun: 24, kb: last ? 600 : 60, launch: last ? 900 : 0, bstun: 10, life: 90, sup: 1, stop: last ? 14 : 4, pow: last ? 1 : 0 }); s.emit('proj', { k: 'boom' }); } });
      return t >= 60;
    },
    nocharge(s, me, op, t) {      // GLM 二级 开卷考试：8 秒内飞书和满分飞踢都不用蓄力（→ + 拳 / ↑ + 脚 直接出），飞书变成连发
      if (t === 10) { me.buff = { k: 'open', t: 480, name: '开卷考试' }; s.addFx('ring', me.x, 220, { life: 30, col: '#5CB8FF' }); s.emit('heal', { who: me.idx }); }
      return t >= 30;
    },
    tripflash(s, me, op, t) {      // GLM 二级（脚）满分三连：连着三次后空翻踢，越来越高，最后一下打飞
      const M = me.mv; if (M.k == null) { M.k = 0; M.t0 = 0; } const u = t - M.t0;
      if (u === 2) { me.vy = 1250 + M.k * 200; me.vx = me.face * 160; me.y = 0.01; me.invul = Math.max(me.invul, 10); s.emit('whoosh', { lvl: 3, who: me.idx }); me.swing++; me.hitDone = {}; }
      if (u >= 2 && u < 14) me.box = { id: 'tf' + me.swing, x0: -40, x1: 190, y0: 0, y1: 460, dmg: M.k === 2 ? 70 : 40, launch: M.k === 2 ? 1200 : 1350, kb: M.k === 2 ? 480 : 40, bstun: 14, stop: M.k === 2 ? 14 : 8, sup: 1 }; else me.box = null;
      if (u > 4 && me.y <= 0.5) { me.y = 0; me.vy = 0; me.vx = 0; if (M.k < 2) { M.k++; M.t0 = t; } else { M.land = M.land || t; } }
      return M.land ? t - M.land >= 20 : t > 200;
    },
  });
  Object.assign(ATK2, {
    daxe: { su: 15, ac: 5, rc: 18, x0: 0, x1: 230, y0: 100, y1: 460, dmg: 70, stun: 22, bstun: 12, kb: 260, stop: 11, high: 1, fwdstep: 1, shake: 10 },      // 豆包 ← + 重脚 跨步下劈：大跨一步，腿从上往下劈（中段）
    gsob: { su: 11, ac: 6, rc: 18, x0: 0, x1: 260, y0: 160, y1: 420, dmg: 78, stun: 22, bstun: 12, kb: 480, stop: 11, fwdstep: 1 },      // GLM ← + 重脚 倒钩踢：转身往前一钩，够得远
    ghammer: { su: 16, ac: 5, rc: 18, x0: 0, x1: 210, y0: 140, y1: 460, dmg: 72, stun: 22, bstun: 12, kb: 300, stop: 12, high: 1, shake: 10 },      // GLM → + 重拳 中段锤：从上往下砸（中段，蹲防挡不住）
  });
  // ===== 第 12 圈：豆包（连打型）补全：对空升天踢、跨步下劈、摆拍架势（四个派生）、一级大号表情包（近身气功）、二级连续转发（突进连踢）=====
  Object.assign(HMOVK.dou, { '623': 'tenshou' });
  Object.assign(HMOV.dou, { '214': 'pose' });
  Object.assign(NOEX, { pose: 1 });
  SUH.dou = { 1: { id: 'bigqi', name: '大号表情包', inv: 30 }, 2: { id: 'rushkick', name: '连续转发', inv: 12 } };
  Object.assign(SPF, {
    tenshou(s, me, op, t) {      // 豆包 623 + 脚 宝宝升天踢：转着往上踢（对空，起手无敌，多段）
      const H = me.mv.v === 'b' || me.mv.ex, n = me.mv.ex ? 5 : H ? 4 : 3;
      if (t === 3) { me.vy = H ? 1400 : 1150; me.vx = me.face * 120; me.y = 0.01; s.emit('whoosh', { lvl: 2, who: me.idx }); }
      me.invul = Math.max(me.invul, t < (me.mv.ex ? 20 : 8) ? 1 : 0);
      if (t >= 3 && t < 3 + n * 6) { const k = Math.floor((t - 3) / 6); if ((t - 3) % 6 === 0) { me.swing++; me.hitDone = {}; } me.box = { id: 'ts' + me.swing, x0: -40, x1: 170, y0: 60, y1: 460, dmg: k === n - 1 ? 40 : 22, launch: k === n - 1 ? 900 : 700, kb: k === n - 1 ? 300 : 40, bstun: 10, stop: 6, multi: 1 }; } else me.box = null;
      if (t > 6 && me.y <= 0.5) { if (!me.mv.land) { me.mv.land = t; me.y = 0; me.vy = 0; me.vx = 0; s.emit('land', { who: me.idx }); } return t - me.mv.land >= 18; }
      return t > 90;
    },
    pose(s, me, op, t) {      // 豆包 214 + 拳 摆拍架势：摆好姿势（最长 1 秒，能慢慢走），派生：J = 剪刀手戳、U = 掌推打飞、K = 下段扫、I = 跳起来踩（中段）；不按就收
      const M = me.mv;
      if (!M.f) { me.vx = (me.in.r ? 1 : me.in.l ? -1 : 0) * 160; const b = (me.buf && me.buf.c) || me.cmd; if (t >= 6 && b && ['a', 'lk', 'hp', 'hk'].includes(b.k)) { me.buf = null; me.cmd = null; M.f = b.k; M.t0 = t; me.swing++; me.hitDone = {}; me.hitOK = false; me.vx = 0; s.emit('whoosh', { lvl: 2, who: me.idx }); } return !M.f && t >= 62; }
      const u = t - M.t0, k = M.f;
      const B = { a: { su: 4, ac: 4, rc: 12, box: { x0: 0, x1: 200, y0: 180, y1: 380, dmg: 40, stun: 22, bstun: 12, kb: 160, stop: 8 } },
        hp: { su: 9, ac: 5, rc: 20, box: { x0: 0, x1: 220, y0: 120, y1: 400, dmg: 72, launch: 760, kb: 520, bstun: 14, stop: 12, shake: 12 } },
        lk: { su: 6, ac: 4, rc: 18, box: { x0: 0, x1: 240, y0: 0, y1: 110, dmg: 50, launch: 420, kb: 200, bstun: 12, stop: 9, low: 1 } },
        hk: { su: 14, ac: 6, rc: 16, box: { x0: -20, x1: 190, y0: 40, y1: 440, dmg: 66, stun: 24, bstun: 12, kb: 260, stop: 11, high: 1 } } }[k];
      if (k === 'hk') { if (u === 2) { me.vy = 900; me.vx = me.face * 300; me.y = 0.01; } if (u > 2 && me.y <= 0.5) { me.y = 0; me.vy = 0; me.vx = 0; } }
      else if (k === 'hp' && u < B.su) me.vx = me.face * 300; else me.vx *= 0.6;
      me.box = u >= B.su && u < B.su + B.ac ? Object.assign({ id: 'po' + me.swing }, B.box) : null;
      return u >= B.su + B.ac + B.rc;
    },
    bigqi(s, me, op, t) {      // 豆包 一级 大号表情包（近身气功）：原地爆出一个巨大的表情包能量球，多段，最后炸开
      if (t >= 8 && t < 50) { const k = Math.floor((t - 8) / 6); if ((t - 8) % 6 === 0) { me.swing++; me.hitDone = {}; } const last = t >= 44; me.box = { id: 'bq' + me.swing, x0: -230, x1: 260, y0: 0, y1: 480, dmg: last ? 70 : 24, stun: 26, bstun: 8, kb: last ? 680 : 30, launch: last ? 1000 : 0, stop: last ? 14 : 4, sup: 1, multi: 1 }; if (op.st === 'hit' && !last) op.x += Math.sign(me.x - op.x) * 6; } else me.box = null;
      return t >= 70;
    },
    rushkick(s, me, op, t) {      // 豆包 二级 连续转发（突进连踢）：踢着往前冲，碰到就一路踢过去，最后一个上踢
      const M = me.mv;
      if (!M.got) { if (t >= 4 && t < 26) { me.vx = me.face * 1300; me.box = { id: 'rk' + me.swing, x0: 0, x1: 200, y0: 20, y1: 380, dmg: 30, stun: 60, bstun: 14, kb: 0, stop: 6, sup: 1 }; } else { me.vx *= 0.6; me.box = null; } if (me.hitOK) { M.got = t; me.box = null; } if (!M.got) return t >= 48; }
      const u = t - M.got; me.vx = me.face * 260; if (op.st === 'hit') { op.stun = Math.max(op.stun, 10); op.x = clamp(me.x + me.face * 160, XMIN, XMAX); op.vx = 0; }
      if (u > 2 && u <= 40 && (u - 3) % 5 === 0) { me.swing++; me.hitDone = {}; me.box = { id: 'rk' + me.swing, x0: -20, x1: 220, y0: 20, y1: 420, dmg: 20, stun: 26, kb: 0, stop: 3, sup: 1, multi: 1 }; } else if ((u - 3) % 5 > 2) me.box = null;
      if (u === 46) { me.swing++; me.hitDone = {}; me.vx = 0; me.box = { id: 'rkx' + me.swing, x0: -20, x1: 220, y0: 60, y1: 500, dmg: 70, launch: 1150, kb: 420, stop: 16, sup: 1, shake: 20 }; }
      if (u >= 49) { me.box = null; me.vx = 0; } return u >= 72;
    },
  });
  // ===== 第 17 圈：懒人键（一键必杀 / 一键超必杀加方向）=====
  // O：不按方向 = 236 系，→ = 623 系，← = 214 系（旋风腿 / 突进 / 当身），↓ = 22 系（特色技）。和搓招效果一样，沿用一键必杀的冷却。
  // H / ;：不按方向 = 一级，→ = 二级，↓ = 三级。伤害 ×0.9（给搓招的人一点奖励），TOKEN 照扣；格数不够头上闪「TOKEN 不足」。
  const LZ = { n: [['236', 'p']], f: [['623', 'p']], b: [['214k', 'k']], d: [['22', 'p'], ['22', 'k']] };
  const LZC = { gem: { b: [['214', 'p']] }, gpt: { b: [['41236', 'k']] }, qwen: { b: [['41236', 'k']] }, claude: { b: [['63214', 'p']] }, glm: { f: [['28c', 'k']] }, dou: { f: [['623', 'k']] }, kimi: { b: [['214', 'p']] } };      // 每人挑最有代表性的那一招（Claude ← = 上段当身，GLM → = 满分飞踢不用蓄力，Kimi ← = 往前瞬移）
  function lazySp(s, me, op, d) {
    if (me.cd > 0) return false;
    for (const [m, btn] of ((LZC[me.id] && LZC[me.id][d]) || LZ[d])) if (startMove(s, me, op, m, 'a', false, true, btn)) { if (me.mv) me.mv.lazy = 1; return true; }      // 第 68 圈：降智等状态下 startMove 成功但没有 mv（视频代理报的 TypeError）
    return false;
  }
  function lazySuper(s, me, op, lvl) {
    if (me.meter < lvl * BAR - 0.01) { if (!(me.lowT > s.f)) { me.lowT = s.f + 30; s.addFx('text', me.x, me.ch.h + 110, { life: 36, s: 'TOKEN 不足', col: '#FF5C5C' }); } return false; }
    if (!startSuperH(s, me, op, lvl)) return false;
    me.lazyS = 1; if (me.mv) me.mv.lazy = 1; return true;
  }
  function lazyMoves(me) { const o = {}; for (const d of ['n', 'f', 'b', 'd']) for (const [m, btn] of ((LZC[me.id] && LZC[me.id][d]) || LZ[d])) { const id = moveOf(me, m, btn, 'a'); if (id && SPF[id]) { o[d] = id; break; } } return o; }      // 出招表用：每个方向的懒人键出什么

  // ===== 第 43 圈：人机对战的「手柄电脑」（M5）=====
  // 电脑不再走老的 aiStep，而是像人一样每一步「按键」：方向 + J K U I + 算力键 L + 一键 O / H，所以人能用的全部招式（搓招必杀、派生、EX、
  // 一二三级超必杀、绿冲、精防、算力冲击 / 反击、投、蹲防）电脑都会用。难度 1–8（街霸 6 的 CPU 也是 8 级）：反应快慢、防御率、对空率、确反率、
  // 连段长度、用不用 Drive 都按级数走。只在 Sim 的选项 pad[i] = 级数 时启用（这一边的 ctrl 必须是 'human'）；电脑对电脑 / 成片 / chk.js 不走这里。
  const PADP = {      // 每人的招：fb = 远距离飞行道具，aa = 对空，cf = 打中后接的必杀（连段收尾），ap = 中距离突进；值 = [指令, 按键]（'lz' = 懒人键 O + 方向）
    ds: { aa: ['623', 'a'], cf: ['236', 'a'], ap: ['214', 'lk'], eat: ['22', 'a'] },
    gem: { fb: ['236', 'a'], aa: ['623', 'a'], cf: ['214', 'a'], ap: ['41236', 'a'] },
    gpt: { fb: ['214', 'a'], aa: ['623', 'a'], cf: ['236', 'a'], ap: ['41236', 'lk'] },
    qwen: { fb: ['236', 'a'], aa: ['623', 'a'], cf: ['214', 'a'], ap: ['41236', 'lk'] },
    grok: { fb: ['236', 'a'], aa: ['623', 'a'], cf: ['214', 'lk'], ap: ['623', 'lk'] },
    dou: { fb: ['236', 'a'], aa: ['623', 'a'], cf: ['236', 'a'] },
    claude: { fb: ['236', 'a'], aa: ['623', 'a'], cf: ['236', 'a'] },
    kimi: { fb: ['236', 'a'], aa: ['623', 'a'], cf: ['236', 'a'], ap: ['214', 'a'] },
    glm: { fb: ['lz', 'n'], aa: ['lz', 'f'], cf: ['lz', 'n'] },
    surf: { fb: ['236', 'a'], aa: ['623', 'a'], cf: ['214', 'a'], ap: ['214', 'lk'] },      // 第 67 圈 C：客串（浪花 远近立回：水炮牵制、翻板对空、冲浪滑行收尾）
    nin: { fb: ['236', 'a'], aa: ['623', 'a'], cf: ['214', 'a'], ap: ['214', 'lk'] },      // 小忍：手里剑、转圈斩对空、旋身踢收尾，214+脚 404 隐身闪背后
  };
  function padMotion(m, btn, F, B) {      // 指令 → 一串逐步输入（每步一个对象）；B / F = 当时的后 / 前
    const D = { 1: { dn: 1, [B]: 1 }, 2: { dn: 1 }, 3: { dn: 1, [F]: 1 }, 4: { [B]: 1 }, 6: { [F]: 1 }, 5: {} };
    if (m === 'lz') return [Object.assign({ s: 1 }, btn === 'f' ? { [F]: 1 } : btn === 'b' ? { [B]: 1 } : btn === 'd' ? { dn: 1 } : {}), {}];
    const out = []; for (const ch of m) { const o = D[ch]; out.push(Object.assign({}, o), Object.assign({}, o)); }
    const last = out.pop(); out.push(Object.assign({}, last, { [btn]: 1 }), {}); return out;
  }
  function padAI(s, me, op) {
    const A = me.pad || (me.pad = { q: [], rng: mkRng(((s.o.seed ?? 1) * 7 + 13 + me.idx) >>> 0), hold: null, holdT: 0, next: 0, seenSw: -1, blkSw: -1, aaSw: -9, pnSw: -1, cfSw: -1, fbT: -999 });
    const lv = clamp(s.o.pad[me.idx], 1, 8), k = (lv - 1) / 7, r = A.rng;
    const dir = op.x >= me.x ? 1 : -1, F = dir > 0 ? 'r' : 'l', B = dir > 0 ? 'l' : 'r', d = Math.abs(op.x - me.x), P = (MX && MX.padP(s, me, PADP[me.id])) || PADP[me.id] || PADP.gem;
    const near = 230 + pwx(me, op), reactT = Math.round(16 - 12 * k);      // 反应：1 级 16 步（0.27 秒）→ 8 级 4 步
    const q = (arr, lo) => { A.q = arr.slice(); A.qlo = !!lo; A.hold = null; return A.q.shift() || {}; };      // lo = 低优先级（立回里随手的动作，对方一跳 / 一出招就打断）
    if (s.phase !== 'fight') { A.q = []; return {}; }
    if (A.q.length && !A.qlo) return A.q.shift();
    const busy = A.q.length > 0;
    const neutral = ['idle', 'walk', 'crouch'].includes(me.st), opAtk = ['light', 'heavy', 'sp', 'impact', 'su', 'throw'].includes(op.st) || (op.st === 'jump' && op.airAtk);
    // ① 打中了：接连段（轻 → 轻 → 必杀 / 超必杀；高级会绿冲取消）
    if ((me.st === 'light' || me.st === 'heavy') && me.hitOK && A.cfSw !== me.swing) { A.cfSw = me.swing;
      const sup = me.meter >= BAR && r() < 0.15 + 0.5 * k, lvl = me.meter >= 3 * BAR && lv >= 6 && op.hp < op.hpMax * 0.35 ? 3 : me.meter >= 2 * BAR && lv >= 5 && r() < 0.4 ? 2 : 1;
      if (me.st === 'light' && (me.chain || 0) < 1 && r() < 0.5 + 0.4 * k) return q([{}, { a: 1 }]);
      if (lv >= 6 && me.drive >= 3 && !me.burn && r() < 0.25 * k) return q([{}, { [F]: 1 }, {}, { [F]: 1 }, {}, {}, {}, {}, { hp: 1 }]);      // 绿冲取消 → 重拳
      if (lv >= 3 && sup) return q(lvl === 3 ? padMotion('236236', 'lk', F, B) : lvl === 2 ? padMotion('214214', 'a', F, B) : padMotion('236236', 'a', F, B));
      if (lv >= 2 && r() < 0.3 + 0.65 * k) { const [m, b] = P.cf; const ex = me.drive >= 2 && !me.burn && lv >= 5 && r() < 0.3; const out = padMotion(m, b, F, B); if (ex && m !== 'lz') { const L = out[out.length - 2]; L[b === 'a' ? 'hp' : 'hk'] = 1; } return q(out); }
      if (me.st === 'light' && r() < 0.5) return q([{}, { hp: 1 }]);
    }
    // ② 挨打 / 防御中：高级偶尔算力反击
    if (me.st === 'block' && lv >= 5 && me.drive >= 2 && !me.burn && op.st !== 'su' && r() < 0.01 + 0.03 * k) return q([{ [F]: 1, dv: 1 }, {}]);
    if (me.st === 'jump') { if (!me.airAtk && op.y <= 0 && d < 300 + pwx(me, op) && me.vy < 200 && r() < 0.3 + 0.6 * k) return q([{ hk: 1 }]); return {}; }
    if (!neutral && me.st !== 'parry') return { [B]: 1, dn: A.crouchBlk ? 1 : 0 };      // 别的状态（受击、出招中）：按住后，起来就是防御
    // ②½ 第 59 圈：起身压制（4 级起）——对方倒地时走近，起身无敌快结束时压一下：投 / 蹲轻脚（下段）/ 轻拳
    if (lv >= 4 && (op.st === 'down' || op.st === 'getup')) { A.oki = 1; if (d > near + 30) return { [F]: 1 }; return {}; }
    if (A.oki) { if (!['idle', 'walk', 'crouch'].includes(op.st) || op.y > 0) A.oki = 0; else if (op.invul <= 3) { A.oki = 0; if (r() < 0.25 + 0.6 * k) { const t = r(); if (d < near && op.invul <= 0 && t < 0.35) return q([{ a: 1, lk: 1 }, {}]); if (t < 0.7) return q([{ dn: 1, lk: 1 }, { dn: 1 }]); return q([{ a: 1 }, {}]); } } }
    // ③ 对空
    if (op.st === 'jump' && op.y > 40 && op.vy < 700 && d < 330 + pwx(me, op) && Math.sign(op.vx || 0) !== dir && A.aaSw !== s.f - op.t && (me.st !== 'walk' || true)) { A.aaSw = s.f - op.t;
      if (r() < 0.12 + 0.78 * k) { if (lv >= 4 && P.aa && r() < 0.6) return q(padMotion(P.aa[0], P.aa[1], F, B)); return q([{ dn: 1 }, { dn: 1, hp: 1 }, { dn: 1 }]); }
      A.aaMiss = s.f + 30; }
    // ④ 飞行道具来了：架招（高级） / 跳过去 / 防
    const proj = s.P.find(p => !p.dead && p.own !== me.idx && p.dmg && p.vx && Math.sign(p.vx) === -dir && (p.x - me.x) * dir > 0 && (p.x - me.x) * dir < 380 && p.y < 430);
    if (proj && A.pjId !== proj.id) { A.pjId = proj.id; const t = r();
      if (lv >= 4 && me.drive >= 1 && !me.burn && t < 0.35 * k) return q([{ dv: 1 }, { dv: 1 }, { dv: 1 }, { dv: 1 }, { dv: 1 }, { dv: 1 }, { dv: 1 }, { dv: 1 }, { dv: 1 }, { dv: 1 }, { dv: 1 }, { dv: 1 }, {}]);
      if (d < 700 && t < 0.25 + 0.25 * k) return q([{ u: 1, [F]: 1 }]);
      A.hold = { [B]: 1 }; A.holdT = s.f + 30; }
    // ⑤ 对方出招：按反应时间决定防不防（下段要蹲防）
    const oReach = op.atk && op.atk.x1 ? op.atk.x1 * (op.skin === 'a' ? AKX : 1) + (me.skin === 'a' ? 86 : 72) + 50 : 520 + pwx(me, op);      // 够不着的招不用防（站着等确反）
    if (lv >= 5 && opAtk && op.y <= 0 && op.atk && op.atk.su && op.t === Math.max(1, op.atk.su - 2) && d < oReach && me.drive >= 1 && !me.burn && A.prSw !== op.swing) { A.prSw = op.swing;      // 第 59 圈：5 级起偶尔读招精防（按住算力键，4 步内挨打 = 精防）
      if (r() < 0.06 + 0.3 * (lv - 5) / 3) return q([{ dv: 1 }, { dv: 1 }, { dv: 1 }, { dv: 1 }, { dv: 1 }, { dv: 1 }, {}]); }
    if (opAtk && d < oReach && op.t >= reactT && A.blkSw !== op.swing) { A.blkSw = op.swing; const low = !!(op.atk && op.atk.low) || !!(op.box && op.box.low);
      if (r() < 0.2 + 0.72 * k) { A.crouchBlk = low ? r() < 0.3 + 0.7 * k : r() < 0.15 * (1 - k); A.hold = { [B]: 1, dn: A.crouchBlk ? 1 : 0 }; A.holdT = s.f + 24; } }
    // ⑥ 确反：对方的招判定出完、还在收招
    if (['light', 'heavy', 'sp', 'impact'].includes(op.st) && !op.box && op.boxSw === op.swing && A.pnSw !== op.swing && op.y <= 0) { A.pnSw = op.swing;
      const hw = op.skin === 'a' ? 86 : 72, ax = me.skin === 'a' ? AKX : 1, rHP = ATK2.shp.x1 * ax + hw - 20, rHK = ATK2.shk.x1 * ax + hw - 20;
      if (r() < 0.05 + 0.85 * k && d < rHK) return q(d < near + 20 && lv >= 5 && P.aa && r() < 0.5 ? padMotion(P.aa[0], P.aa[1], F, B) : d < rHP ? [{ hp: 1 }] : [{ hk: 1 }]); }
    if (A.hold && A.hold.dn !== undefined && op.boxSw === op.swing && !op.box) A.hold = null;      // 对方收完招了就不再防
    if (A.hold && s.f < A.holdT) return A.hold; A.hold = null;
    if (busy) return A.q.shift();
    // ⑦ 起身压制：对方倒地 → 走过去等着
    if (['down', 'getup'].includes(op.st)) { if (d > near) return { [F]: 1 }; return r() < 0.5 * k ? { [B]: 1 } : {}; }
    // ⑧ 每隔几步想一次（低级想得慢）
    if (s.f < A.next) return A.walk || {};
    A.next = s.f + 4 + Math.round((1 - k) * 10 + r() * 6); A.walk = null; const t = r();
    if (me.meter >= BAR && lv >= 2 && t < 0.02 + 0.02 * k && op.st === 'idle' && d < 500) return q(padMotion('236236', 'a', F, B));      // 偶尔直接放一级（对面站着发呆时）
    if (d > 620) {      // 远：波 / 走 / 冲 / 绿冲 / 吃饭
      if (P.eat && (me.rice || 0) < 4 && t < 0.25) return q(padMotion(P.eat[0], P.eat[1], F, B), 1);
      if (P.fb && s.f - A.fbT > 50 && t < 0.3 + 0.2 * k) { A.fbT = s.f; return q(padMotion(P.fb[0], P.fb[1], F, B)); }
      if (lv >= 5 && me.drive >= 3 && !me.burn && t < 0.55) return q([{ dv: 1 }, { dv: 1 }, { dv: 1, [F]: 1 }, { dv: 1 }, { dv: 1, [F]: 1 }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, { a: 1 }], 1);
      if (t < 0.7) { A.walk = { [F]: 1 }; return A.walk; } return q([{ [F]: 1 }, {}, { [F]: 1 }], 1);
    }
    if (d > near + 40) {      // 中：突进 / 跳进 / 远踢 / 算力冲击 / 往前走
      if (P.ap && t < 0.12 + 0.1 * k) return q(padMotion(P.ap[0], P.ap[1], F, B));
      if (t < 0.22) return q([{ u: 1, [F]: 1 }], 1);
      if (t < 0.36) return q([{ hk: 1 }], 1);
      if (t < 0.44) return q([{ dn: 1 }, { dn: 1, lk: 1 }, { dn: 1 }], 1);
      if (lv >= 3 && me.drive >= 3 && !me.burn && t < 0.48) return q([{ hp: 1, hk: 1 }, {}], 1);
      if (P.fb && s.f - A.fbT > 70 && t < 0.56) { A.fbT = s.f; return q(padMotion(P.fb[0], P.fb[1], F, B)); }
      A.walk = t < 0.88 ? { [F]: 1 } : { [B]: 1 }; return A.walk;
    }
    // 近：轻拳起手 / 蹲轻脚（下段）/ 投 / 重拳 / 后退 / 架着
    if (t < 0.28) return q([{ a: 1 }], 1);
    if (t < 0.44) return q([{ dn: 1 }, { dn: 1, lk: 1 }, { dn: 1 }], 1);
    if (t < 0.52 + 0.06 * k) return q([{ a: 1, lk: 1 }], 1);
    if (t < 0.64) return q([{ hp: 1 }], 1);
    if (t < 0.80) { A.walk = { [B]: 1, dn: r() < 0.4 ? 1 : 0 }; return A.walk; }
    A.walk = { [B]: 1 }; return A.walk;
  }
  const api = { hurtBox: hurt, canBeHitF: canBeHit, AKX, AKY, Sim, ATK, ATK2, SPF, SUF, INTRO, WORLD_W, XMIN, XMAX, matchMotion, updDirs, HMOV, HMOVJ, HMOVK, AIRSP, REQ, HMOVC, LZ, LZC, lazyMoves, setMX: h => { MX = h; } };
  if (typeof module !== 'undefined') module.exports = api; else Object.assign(root, api);
  if (typeof module !== 'undefined' && !(typeof window !== 'undefined' && window.document)) { try { require('./meme_ds.js').install(api); } catch (e) { if (!/Cannot find module/.test(e.message)) throw e; } }      // D 代理：大肥鱼梗招（浏览器里由 meme_ds.js 自己挂上）
})(typeof window !== 'undefined' ? window : globalThis);
