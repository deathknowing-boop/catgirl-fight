// 第 72 圈（用户 02:00：三级处决演出像幻灯片）：三级超必杀改成拳皇式「实时乱舞」—— 就在战斗画面里打，不切单独的过场画面、不放静态插图。
// 节奏（步，60/秒，共 LIVE3.LEN = 192 ≈ 3.2 秒）：命中定格 0–9 → 12 段乱舞 10–106（每段 8 步：蓄 3 → 命中定格 3 → 收 2；第 4 / 7 / 11 段冲过对手从背后打）
// → 挑空 110–124 → 空中追打两下 132 / 140 → 最后一击前停顿 146–165 → 终结一击 166（大爆发、白闪、K.O. 集中线）→ 落地 166–192，对局逻辑接着把对手打飞。
// 只改画面：sim 里 startCine 的 len（非成片、非 ?oldcine=1 时 192）和 endCine 的伤害、打飞完全不变。人物用现有动作帧（普通技 / 专属普通技 / 升龙 / 跳攻击 / 冲刺帧）组合，
// pose() 开头的钩子给出这一步的帧 + 位移（dx / dy / sx 翻面），残影、命中火花、光刃、冲击圈在 world()，计数 / 招式条 / 白闪在 screen()，镜头推近在 cam()。
const LIVE3 = (() => {
  const LEN = 192, HIT0 = 12, HITD = 8, NR = 12, LAUNCH = 116, AIR = [132, 140], PAUSE = 146, FIN = 166;
  const BEHIND = { 3: 1, 6: 1, 10: 1 };
  const MOVES = ['jab', 'ml', 'kick', 'mk', 'jab', 'mh', 'kick', 'heavy', 'ml', 'mh', 'kick', 'heavy'];
  const ALT = { ml: 'jab', mh: 'heavy', mk: 'kick', ma: 'jk', heavy: 'jab', kick: 'jab', upper: 'heavy', jk: 'kick', aa: 'jab' };
  const HITS = []; for (let i = 0; i < NR; i++) HITS.push(HIT0 + i * HITD); HITS.push(LAUNCH, AIR[0], AIR[1], FIN);
  const FP = fp;
  function fr(f, mv, i) { let m = mv; for (let k = 0; k < 4 && m; k++) { const n = FP(f, m + i) || (i === 3 ? FP(f, m) : null); if (n) return n; m = ALT[m]; } return FP(f, 'stance') || f.ch.spr.idle; }
  const col = f => (typeof ECOL !== 'undefined' && ECOL[f.id]) || [f.ch.col, f.ch.col2];
  const gap = (a, d) => { const ha = hOf(a, FP(a, 'stance') || a.ch.spr.idle), hd = hOf(d, FP(d, 'stance') || d.ch.spr.idle); return Math.max(150, Math.min(320, 0.21 * (ha + hd) + 50)); };      // 两人之间留出一臂（按画面高度算，成年版更宽）
  // 这一步两个人的样子：返回 { a: {n, x, y, sx, rot}, d: {n, x, y, rot}, hit: 最近一次命中 {k, t0, big, behind} }（x / y 是世界坐标的脚底；y 向上为正）
  function state(s, t) {
    const c = s.cine, a = s.F[c.who], d = s.F[1 - c.who], fc = a.face, CD = gap(a, d), vx0 = d.x, A = { n: null, x: a.x, y: a.y, sx: 1, rot: 0 }, D = { n: FP(d, 'hit2') || d.ch.spr.hit, x: vx0, y: d.y, rot: 0 };
    const front = vx0 - fc * CD, back = vx0 + fc * CD;
    let last = -1; for (let i = 0; i < HITS.length; i++) if (HITS[i] <= t) last = i;
    const since = last >= 0 ? t - HITS[last] : 99, frz = since < 3;      // 命中后 3 步定格（顿帧）
    const vhit = k => [FP(d, 'hit1'), FP(d, 'hit2'), FP(d, 'hurt2'), FP(d, 'hit3'), FP(d, 'hit4')][k % 5] || FP(d, 'hit2') || d.ch.spr.hit;
    if (t < 10) {      // 起手突进刚撞上：保持冲刺姿势定格，对手吃第一下
      A.n = FP(a, 'dash') || fr(a, 'heavy', 3); A.x = a.x + (front - a.x) * Math.min(1, t / 4); D.n = vhit(0); D.x = vx0 + fc * (t < 3 ? 0 : 10);
    } else if (t < LAUNCH - 6) {      // 乱舞
      const k = Math.max(0, Math.min(NR - 1, Math.floor((t - HIT0 + 3) / HITD))), h = HITS[k], w = t - (h - 3), mv = MOVES[k], bh = !!BEHIND[k], base = bh ? back : front, dirk = bh ? -1 : 1;
      const seg = w < 3 ? 2 : w < 6 ? 3 : 4, cb = k % 3 === 2 && FP(a, 'cB' + ((k / 3 | 0) % 4 + 1)); A.n = cb && seg === 3 ? cb : fr(a, mv, seg); A.sx = bh ? -1 : 1;      // 有三级专用连打帧（cB1–4）的角色每三段插一张
      const lunge = w < 3 ? (1 - w / 3) * 70 : w >= 6 ? (w - 5) * 14 : 0; A.x = base - fc * dirk * lunge;
      if (bh && w < 3) { const prev = BEHIND[k - 1] ? back : front; A.x = prev + (base - prev) * E.out3(w / 3); A.n = FP(a, 'dash') || A.n; }      // 冲过对手到背后（带残影）
      if (!bh && BEHIND[k - 1] && w < 3) { A.x = back + (front - back) * E.out3(w / 3); A.n = FP(a, 'dash') || A.n; A.sx = 1; }
      if (k % 4 === 1 && w >= 3) A.y = 40;      // 偶尔跳起来打一下
      const push = since < 99 && last < NR ? (frz ? 26 : 26 * Math.max(0, 1 - (since - 3) / 5)) : 0; D.n = vhit(last < 0 ? 0 : last); D.x = vx0 + fc * dirk * push * 0.6 + (frz ? (hash(t * 7) - 0.5) * 14 : 0); D.rot = fc * dirk * 0.06 * Math.max(0, 1 - since / 6);
      D.y = d.y + Math.min(60, k * 4);
    } else if (t < AIR[0] - 3) {      // 挑空：升龙帧往上冲，对手被挑起来
      const u = t - (LAUNCH - 6); A.sx = 1;
      if (u < 6) { A.n = FP(a, 'sr11') || fr(a, 'upper', 2); A.x = front; A.y = 0; D.n = vhit(2); D.y = d.y + 48; }
      else { const q = (u - 6) / 13; A.n = q < 0.35 ? (FP(a, 'sr12') || fr(a, 'upper', 3)) : (FP(a, 'sr13') || fr(a, 'upper', 4)); A.x = front + fc * 30 * q; A.y = 260 * E.out3(q); D.n = FP(d, 'hurtbig') || vhit(3); D.x = vx0 + fc * 110 * q; D.y = 60 + 340 * E.out3(Math.min(1, q * 1.15)); D.rot = -fc * 0.5 * q; }
    } else if (t < PAUSE) {      // 空中追打两下
      const k = t < AIR[1] - 3 ? 0 : 1, h = AIR[k], w = t - (h - 3), mv = k ? 'ma' : 'jk', seg = w < 3 ? 2 : w < 6 ? 3 : 4; A.n = fr(a, mv, seg);
      A.x = front + fc * (40 + k * 30); A.y = 280 + k * 20; D.n = FP(d, 'hurtbig') || vhit(4 + k); D.x = vx0 + fc * (130 + k * 40 + (since < 6 ? 16 : 0)); D.y = 400 + k * 15 + (frz ? (hash(t * 5) - 0.5) * 12 : 0); D.rot = -fc * (0.7 + k * 0.4);
    } else if (t < FIN - 3) {      // 停顿：两人在空中慢慢漂，攻击方蓄力发光
      const q = (t - PAUSE) / (FIN - 3 - PAUSE); A.n = FP(a, 'cC2') || FP(a, 'windup') || FP(a, 'chamber') || fr(a, 'heavy', 1); A.x = front + fc * 70 - fc * 30 * q; A.y = 330 + 30 * q; D.n = FP(d, 'hurtbig') || vhit(1); D.x = vx0 + fc * 210; D.y = 430 + 10 * Math.sin(q * 3); D.rot = -fc * (1.1 + 0.15 * q);      // 有三级专用蓄力帧（cC2）就用
    } else {      // 终结一击 + 落地
      const u = t - (FIN - 3), fin = s.cine.fin; A.n = u < 3 ? fr(a, 'heavy', 2) : u < 14 ? (FP(a, 'cC3') || FP(a, 'dimpact') || fr(a, 'heavy', 3)) : u < 22 ? fr(a, 'heavy', 4) : (fin ? FP(a, 'cC4') || FP(a, 'win') || FP(a, 'stance') : FP(a, 'stance'));
      const land = Math.min(1, Math.max(0, (u - 6) / 14)); A.x = front + fc * 70 * (1 - land) + fc * 10; A.y = 360 * (1 - E.in2(land)); if (u >= 20) { A.x = a.x + (A.x - a.x) * Math.max(0, 1 - (u - 20) / 6); }
      const v = Math.min(1, Math.max(0, (u - 6) / 8)); D.n = u < 14 ? (FP(d, 'hurtbig') || vhit(2)) : (FP(d, 'bounce') || FP(d, 'down') || vhit(3)); D.x = vx0 + fc * 210 * (1 - v); D.y = u < 6 ? 440 : 440 * (1 - E.in2(v)) + (u >= 14 ? Math.max(0, Math.sin((u - 14) / 12 * Math.PI)) * 40 : 0); D.rot = u < 14 ? -fc * (1.3 + 0.6 * v) : 0;
      if (u < 6) D.x += (hash(t * 3) - 0.5) * 22;
    }
    return { A, D, last, since, behind: last >= 0 && last < NR && !!BEHIND[last] };
  }
  const E = { out3: q => 1 - Math.pow(1 - q, 3), in2: q => q * q };
  const _st = {}; function st(s) { const t = s.cine.t, key = s.f + ':' + t; if (_st.k !== key || _st.s !== s) { _st.k = key; _st.s = s; _st.v = state(s, t); } return _st.v; }
  function pose(s, f) {      // render.js 的 pose() 开头调；只在实时三级里接管两个人
    const c = s.cine; if (!c || !c.live) return null; const v = st(s), P = f.idx === c.who ? v.A : v.D; if (!P.n || !META.spr[P.n]) return null;
    return { name: P.n, dx: P.x - f.x, dy: -(P.y - f.y), rot: P.rot || 0, sx: P.sx || 1, sy: 1, skew: 0, lie: 0, ghost: null, smear: null };
  }
  function cam(s) {      // 镜头：推近、对准两人中点，挑空时往上看，终结一击推最近
    const c = s.cine, t = c.t, v = st(s), FL = STAGES[s.stage].floor, fx = (v.A.x + v.D.x) / 2, fy = (t < FIN ? Math.max(v.A.y, v.D.y) : Math.max(v.A.y, v.D.y) * 0.4 + Math.min(v.A.y, v.D.y) * 0.6) * 0.55 + 180;
    let zk = t < 10 ? 1 + 0.1 * t / 10 : t < LAUNCH - 6 ? 1.12 + 0.04 * Math.sin(t * 0.05) : t < PAUSE ? 1.12 : t < FIN - 3 ? 1.12 + 0.12 * (t - PAUSE) / (FIN - 3 - PAUSE) : t < FIN + 8 ? 1.3 - 0.2 * (t - FIN + 3) / 11 : 1.1 - 0.1 * Math.min(1, (t - FIN - 8) / 18);
    const out = t > LEN - 14 ? (t - (LEN - 14)) / 14 : 0; zk = zk + (1 - zk) * out; const z = s.cam.z * zk, w = (t < 6 ? t / 6 : 1) * (1 - out);
    const air = 0.55 + 0.3 * Math.min(1, Math.max(0, (t - LAUNCH) / 10)) * Math.min(1, Math.max(0, 1 - (t - FIN) / 16)); let px = -(fx - s.cam.x - 960) * z * 0.75 * w, py = ((FL - 150) - (FL - fy)) * z * air * w;      // 只跟一半：人飞起来时画面上要看得出离地
    if (v.since < 4) { px += (hash(t * 13) - 0.5) * (v.last >= NR ? 26 : 10); py += (hash(t * 17) - 0.5) * (v.last >= NR ? 20 : 6); }      // 命中小抖（不加强震屏）
    return { z: zk, px, py };
  }
  function ghosts(s, FL) {      // 攻击方残影（主题色，画在人后面）+ 场地压暗
    const c = s.cine; if (!c || !c.live) return; const t = c.t, a = s.F[c.who], C = col(a), dim = Math.min(1, t / 6) * (t > LEN - 12 ? (LEN - t) / 12 : 1) * (t >= PAUSE && t < FIN ? 1.35 : 1);
    g.save(); g.fillStyle = 'rgba(6,4,18,' + (0.42 * dim).toFixed(3) + ')'; g.fillRect(-200, -200, 2500, 1500); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg(a.x, FL - 300, 0, 900, [rgba(C[0], 0.18 * dim), rgba(C[0], 0)]); g.fillRect(a.x - 900, FL - 1200, 1800, 1300); g.restore();
    for (let i = 4; i >= 1; i--) { if (t - i * 2 < 0) continue; const v = state(s, t - i * 2), P = v.A; if (!P.n || !META.spr[P.n]) continue; const h = hOf(a, P.n), flip = a.face * (NATIVE[P.n] ?? 1) * (P.sx || 1) < 0;
      spr(P.n, P.x, FL - P.y, h, { flip, rot: P.rot, a: 0.34 * (1 - i / 5), env: { col: C[0], a: 0.85, bot: 0 } }); }
  }
  function world(s, FL) {      // 命中火花 / 光刃 / 冲击圈（画在人前面）
    const c = s.cine; if (!c || !c.live) return; const t = c.t, a = s.F[c.who], d = s.F[1 - c.who], C = col(a), fc = a.face;
    for (let i = 0; i < HITS.length; i++) { const age = t - HITS[i]; if (age < 0 || age > 14) continue; const v = state(s, HITS[i]), big = i >= NR, fin = i === HITS.length - 1, bh = !!BEHIND[i] && i < NR, dir = bh ? -fc : fc;
      const hx = v.D.x - dir * 30, hy = FL - v.D.y - d.ch.h * (big ? 0.5 : 0.55), k = age / 14, R = fin ? 520 : big ? 300 : 190;
      g.save(); g.globalCompositeOperation = 'lighter';
      g.strokeStyle = rgba(C[1], 0.9 * (1 - k)); g.lineWidth = (fin ? 26 : 12) * (1 - k) + 2; g.beginPath(); g.ellipse(hx, hy, 30 + R * E.out3(k), (30 + R * E.out3(k)) * 0.62, -dir * 0.3, 0, 7); g.stroke();      // 冲击圈
      g.strokeStyle = rgba('#FFFFFF', 0.8 * (1 - k)); g.lineWidth = 4; g.beginPath(); g.ellipse(hx, hy, 20 + R * 0.7 * E.out3(k), (20 + R * 0.7 * E.out3(k)) * 0.62, -dir * 0.3, 0, 7); g.stroke();
      const an = (bh ? Math.PI : 0) + (fc < 0 ? Math.PI : 0) + [-0.35, 0.25, -0.1, 0.4, -0.5][i % 5], L = (fin ? 1500 : big ? 900 : 520) * E.out3(Math.min(1, age / 3)), sl = age * (fin ? 40 : 22);      // 光刃：沿打击方向的细长刀光，命中后往前滑出、变细
      for (let j = -1; j <= 1; j++) { const w0 = (j ? (fin ? 6 : 3) : (fin ? 18 : 9)) * (1 - k), ox = Math.cos(an) * sl, oy = Math.sin(an) * sl, px = -Math.sin(an) * j * (fin ? 34 : 16), py = Math.cos(an) * j * (fin ? 34 : 16);
        g.strokeStyle = j ? rgba(C[0], 0.85 * (1 - k)) : rgba('#FFFFFF', 0.95 * (1 - k)); g.lineWidth = w0; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx - Math.cos(an) * L * 0.45 + ox + px, hy - Math.sin(an) * L * 0.45 + oy + py); g.lineTo(hx + Math.cos(an) * L * 0.55 + ox + px, hy + Math.sin(an) * L * 0.55 + oy + py); g.stroke(); }
      for (let j = 0; j < (fin ? 18 : 9); j++) { const a2 = hash(i * 31 + j) * 6.283, r0 = 30 + R * 0.25 * E.out3(k), r1 = r0 + (fin ? 220 : 90) * (1 - k); g.strokeStyle = rgba(j % 2 ? C[1] : '#FFFFFF', 0.9 * (1 - k)); g.lineWidth = (fin ? 6 : 3.5) * (1 - k) + 1; g.beginPath(); g.moveTo(hx + Math.cos(a2) * r0, hy + Math.sin(a2) * r0 * 0.8); g.lineTo(hx + Math.cos(a2) * r1, hy + Math.sin(a2) * r1 * 0.8); g.stroke(); }      // 放射火花
      g.restore(); if (age < 4) star4(hx, hy, (fin ? 260 : big ? 150 : 95) * (1 - age / 4), i * 0.7, '#FFFFFF', 0.95);
      if (typeof cineHitFx === 'function') cineHitFx(a.id, a.ch, hx, hy, Math.min(1, age / 14), i + 1);      // 第 73 圈：每人自己的命中碎片（大肥鱼饭粒、Claude 书页、GLM 红对勾…）
      if (typeof cineProp === 'function' && age > 0) { const pa = -Math.PI / 2 + (hash(i * 5 + 1) - 0.5) * 2.2, pr = (fin ? 420 : 170) * E.out3(k), ps = (fin ? 1.15 : 0.85) * (0.8 + 0.4 * hash(i)); g.save(); g.globalAlpha = Math.min(1, 1.4 * (1 - k)); g.translate(hx + Math.cos(pa) * pr, hy + Math.sin(pa) * pr + 160 * k * k); g.rotate(dir * k * 4 + i); g.scale(ps, ps); cineProp(a.id, i, t, C[1]); g.restore(); }      // 每下崩出一个角色小物件（便签 / token 币、毛线球、书页、数字…）
      if (fin && age < 10) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg(hx, hy, 0, 700, [rgba('#FFFFFF', 0.7 * (1 - age / 10)), rgba(C[0], 0.4 * (1 - age / 10)), rgba(C[0], 0)]); g.fillRect(hx - 700, hy - 700, 1400, 1400); g.restore(); } }
    if (t >= FIN && t < LEN) { const v = st(s); fin3(s, a, d, v, FL, t - FIN, fc); }      // 第 73 圈：终结一击的角色专属特效
    if (a.id === 'ds' && t >= PAUSE - 2) { const v = st(s); dsBowl(s, a, d, v, FL, t, fc); }      // 大肥鱼：蓄力时举起饭碗，终结一击把碗扣到对手头上
    if (t >= PAUSE - 2 && t < FIN) { const q = (t - PAUSE + 2) / (FIN - PAUSE + 2), v = st(s), P = v.A, h = a.ch.h, x = P.x, y = FL - P.y - h * 0.5; glow(x, y, h * (0.9 + 0.3 * q), C[0], 0.12 + 0.16 * q);      // 停顿蓄力：主题色光往身上收
      g.save(); g.strokeStyle = rgba('#FFFFFF', 0.6 * q); g.lineWidth = 3; g.lineCap = 'round'; for (let i = 0; i < 16; i++) { const an = i / 16 * 6.283 + hash(i) * 0.3, r0 = h * (1.3 - q * 0.5) * (0.8 + 0.4 * hash(i * 3 + Math.floor(t / 3))), r1 = r0 - h * 0.25; g.beginPath(); g.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0); g.lineTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1); g.stroke(); } g.restore(); }
  }
  function fin3(s, a, d, v, FL, u, fc) {      // 终结一击的专属特效：复用旧演出的 cineStrikeFx（GPT 光束、Kimi 满月、GLM 0 分章、Grok 地裂、千问快递箱、Claude 书页风暴、哈基米交叉爪），q 0→1 约半秒
    if (typeof cineStrikeFx !== 'function') return; const q = Math.min(1, u / 30); if (a.id === 'dou' && q < 0.3) return;      // 豆包的全屏闪光灯和终结白闪重复，跳过
    cineStrikeFx(a.id, a.ch, { x: v.A.x, y: FL - v.A.y, h: hOf(a, v.A.n) }, { x: v.D.x, y: FL - v.D.y, h: hOf(d, v.D.n) }, q, fc, s.cine.t);
    if (a.id === 'dou' && u < 20) { const k = u / 20; [['#9BE3FF', -1], ['#FFB3D1', 1], ['#C8F7A0', 2]].forEach(([cc, j], n) => { const P = v.A; if (!P.n || !META.spr[P.n]) return; spr(P.n, P.x + fc * j * 150 * E.out3(Math.min(1, k * 2)), FL - P.y + n * 12, hOf(a, P.n) * 0.92, { flip: a.face * (NATIVE[P.n] ?? 1) < 0, a: 0.7 * (1 - k), env: { col: cc, a: 0.6, bot: 0, pix: n === 0 ? 1 : 0 } }); }); }      // 豆包：不同画风的分身一起打
  }
  function dsBowl(s, a, d, v, FL, t, fc) {      // 大肥鱼：停顿时举起饭碗发光 → 终结一击碗砸到对手身上 → 弹起来翻几圈 → 倒扣在倒地对手的脸上（哐）
    const hA = hOf(a, v.A.n || 'x'), ax = v.A.x + fc * hA * 0.12, ay = FL - v.A.y - hA * 0.98, hD = d.ch.h;
    if (t < FIN) { const q = Math.min(1, (t - PAUSE + 2) / 8); glow(ax, ay - 20, 170, '#FFE98A', 0.4 * q); bowl(ax, ay + (1 - q) * 80, 1.25 * q + 0.01); return; }
    const u = t - FIN, H0 = state(s, FIN).D, hx = H0.x, hy = FL - H0.y - hD * 0.5, gx = v.D.x + fc * hD * 0.22, gy = FL - 46;
    if (u < 4) { const k = E.out3(u / 4); bowl(ax + (hx - ax) * k, ay + (hy - ay) * k, 1.25 + 0.4 * Math.sin(k * Math.PI), { rot: k * 2 * fc }); return; }
    if (u < 16) { const k = (u - 4) / 12; bowl(hx + (gx - hx) * k, hy + (gy - hy) * k * k - Math.sin(k * Math.PI) * 300, 1.35, { rot: fc * (2 + k * (Math.PI * 4 - 2)), empty: true }); return; }      // 弹起来翻两圈
    const w = u - 16, wob = Math.max(0, 1 - w / 14); bowl(gx, gy - Math.abs(Math.sin(w * 0.9)) * 26 * wob, 1.3, { empty: true, rot: Math.PI + Math.sin(w * 1.4) * 0.3 * wob });      // 倒扣落地，晃几下
    if (w < 8) { g.save(); g.strokeStyle = rgba('#FFFFFF', 1 - w / 8); g.lineWidth = 8; g.lineCap = 'round'; for (let n = 0; n < 7; n++) { const an = -Math.PI / 2 + (n - 3) * 0.38, r0 = 90, r1 = 100 + w * 20; g.beginPath(); g.moveTo(gx + Math.cos(an) * r0, gy - 30 + Math.sin(an) * r0); g.lineTo(gx + Math.cos(an) * r1, gy - 30 + Math.sin(an) * r1); g.stroke(); } g.restore(); txt('哐', gx + fc * 130, gy - 170 - w * 3, { size: 92, w: 900, fill: '#FFFFFF', stroke: INK, sw: 10, align: 'center', skew: -0.1, a: 1 - w / 8 }); }      // 「哐」
  }
  function screen(s) {      // 屏幕层：招式名条、连击数、终结白闪 + 集中线、跳过提示
    const c = s.cine; if (!c || !c.live) return; const t = c.t, a = s.F[c.who], C = col(a), L = c.who === 0, v = st(s), T = (typeof CINE_TXT !== 'undefined' && CINE_TXT[a.id]) || { name: a.ch.su.name, ko: 'K.O.' };
    const nHit = v.last + 1 + 1, pop = Math.max(0, 1 - v.since / 5);
    if (t >= 4 && t < LEN - 6) { const q = E.out3(Math.min(1, (t - 4) / 8)), out = t > LEN - 20 ? (t - (LEN - 20)) / 14 : 0, x0 = L ? -40 + 760 * q * (1 - out) - 760 * out : W + 40 - 760 * q * (1 - out) + 760 * out;      // 招式名斜条（P5 风：黑底 + 主题色边）
      g.save(); g.translate(x0, 214); g.rotate(-0.05); g.fillStyle = '#0B0B12'; g.beginPath(); g.moveTo(L ? -760 : 0, -44); g.lineTo(L ? 0 : 760, -50); g.lineTo(L ? -20 : 740, 40); g.lineTo(L ? -760 : -20, 44); g.closePath(); g.fill(); g.strokeStyle = C[0]; g.lineWidth = 6; g.stroke(); g.restore();
      txt(T.name, L ? x0 - 380 : x0 + 380, 230, { size: Math.min(56, 680 / [...T.name].length), w: 900, fill: '#FFFFFF', stroke: C[0], sw: 6, align: 'center', skew: -0.12 }); }
    if (t >= HIT0 && t < LEN - 4) txt(Math.min(nHit, HITS.length + 1) + ' HIT', L ? 1560 : 360, 330, { size: 110, w: 900, fam: F.en, fill: '#FFE066', stroke: '#B81F3A', sw: 10, stroke2: INK, sw2: 22, align: 'center', skew: -0.15, sc: 1 + 0.3 * pop, a: t > LEN - 16 ? (LEN - 4 - t) / 12 : 1 });
    if (a.id === 'gem') for (let i = 0; i < NR; i++) { const age = t - HITS[i]; if (age < 0 || age > 12 || i % 2) continue; const an = -0.9 + i * 0.42 + (i % 4 ? Math.PI : 0), k = age / 12;      // 第 73 圈：哈基米每隔一下一道全屏爪痕（三条）
      g.save(); g.translate(960, 500); g.rotate(an); g.globalAlpha = 0.8 * (1 - k * k); for (let j = -1; j <= 1; j++) { g.fillStyle = j ? C[1] : '#fff'; g.beginPath(); const L0 = -1100, L1 = -1100 + 2200 * E.out3(Math.min(1, age / 4)); g.moveTo(L0, j * 54); g.quadraticCurveTo((L0 + L1) / 2, j * 54 - 46, L1, j * 54 + 6); g.quadraticCurveTo((L0 + L1) / 2, j * 54 - 22, L0, j * 54 + 12); g.fill(); } g.restore(); }
    if (t >= FIN && t < FIN + 3) { g.save(); g.globalAlpha = 0.85 * (1 - (t - FIN) / 3); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H); g.restore(); }      // 终结一击：两步白闪
    if (t >= FIN && t < FIN + 22) { const [ix, iy] = w2s(s, v.D.x, v.D.y + s.F[1 - c.who].ch.h * 0.5); speedLines(t, ix, iy, { n: 40, r0: 300, a: 0.5 * (1 - (t - FIN) / 22), w: 0.02 }); }
    if (c.fin && t >= FIN + 4 && t < LEN) slam(T.ko, 960, 560, 190, (t - FIN - 4) / 60, 0.02, { fill: lg(0, -110, 0, 10, ['#FFFFFF', '#FFE066']), stroke: '#B81F3A', sw: 12, stroke2: INK, sw2: 26, skew: -0.08 });
    if (t > 10 && t < LEN - 30) txt('Enter 跳过', W - 30, H - 24, { size: 22, w: 700, fill: 'rgba(255,255,255,0.55)', align: 'right' });
  }
  function hp(s) {      // HUD 用：演出里血条跟着每一下往下掉（只是显示；真正扣血在 endCine，总伤害不变）
    const c = s.cine, a = s.F[c.who], d = s.F[1 - c.who], dmg = c.fin ? d.hp : Math.min(d.hp, Math.round(400 * a.ch.dmg * (a.lazyS ? 0.9 : 1))), v = st(s), n = v.last + 1;
    return Math.round(d.hp - dmg * Math.min(1, n / HITS.length) * (n >= HITS.length ? 1 : 0.92));
  }
  function sfx(q) {      // play.js：演出里第 q 步要放的音效
    if (q === 1) return [['hit3', 1]]; const i = HITS.indexOf(q); if (i >= 0) return i === HITS.length - 1 ? [['hit3', 1], ['thud', 0.8], ['smash', 0.7]] : i >= NR ? [['hit3', 0.9], ['thud', 0.4]] : [[i % 3 === 2 ? 'hit2' : 'hit1', 0.9], ['thud', 0.25]];
    for (let k = 1; k < NR; k++) if (BEHIND[k] && q === HITS[k] - 3) return [['whoosh1', 0.7]];
    if (q === LAUNCH - 4) return [['whoosh2', 0.9]]; if (q === PAUSE) return [['charge', 0.8]]; return null;
  }
  return { LEN, FIN, E: FIN, pose, cam, ghosts, world, screen, hp, sfx, state };
})();
