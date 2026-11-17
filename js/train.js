// ===== 训练模式（第 38 圈，对标街霸 6 的 Training Mode）=====
// 木桩（站 / 蹲 / 跳 / 全防 / 录制回放）、帧数据（发生 / 持续 / 总帧数 / 命中和被防的帧优势）、输入显示、判定框显示、血和槽自动回满。
// 只在可玩版的训练模式里用；对战逻辑本身一行没改（两边都按「人」来跑，木桩的输入由这里生成）。
const TRAIN_MODES = [['stand', '站立'], ['crouch', '蹲下'], ['jump', '连跳'], ['block', '全防'], ['play', '回放录制']];
function trainNew() { return { mode: 0, box: true, data: true, hist: [], last: null, rec: [], recOn: false, recT: 0, playI: 0, fd: null, fdShow: null, combo: { dmg: 0, n: 0, prevHp: 0, idle: 0 }, refill: 0, fm: [[], []], fmIdle: 99, seen: [0, 0] }; }
const TR_ACT = st => st === 'idle' || st === 'walk' || st === 'crouch';      // 能自由行动的状态（算帧优势用）
function trKeys(TR, code, s) {      // 训练模式专用键：1 木桩动作  2 开始 / 停止录制  3 回放  4 判定框  5 帧数据  0 回到中间
  if (code === 'Digit1') { TR.mode = (TR.mode + 1) % TRAIN_MODES.length; if (TRAIN_MODES[TR.mode][0] === 'play' && !TR.rec.length) TR.mode = 0; TR.playI = 0; return 1; }
  if (code === 'Digit2') { TR.recOn = !TR.recOn; if (TR.recOn) { TR.rec = []; TR.recT = 0; } else if (TR.rec.length) { TR.mode = TRAIN_MODES.findIndex(m => m[0] === 'play'); TR.playI = 0; } return 1; }
  if (code === 'Digit3') { if (TR.rec.length) { TR.mode = TRAIN_MODES.findIndex(m => m[0] === 'play'); TR.playI = 0; } return 1; }
  if (code === 'Digit4') { TR.box = !TR.box; return 1; }
  if (code === 'Digit5') { TR.data = !TR.data; return 1; }
  if (code === 'Digit0' && s) { const [a, b] = s.F; a.x = 880; b.x = 1180; a.vx = b.vx = 0; a.face = 1; b.face = -1; for (const f of s.F) { f.hp = f.hpMax; f.drive = 6; f.meter = 100; } TR.fd = null; return 1; }
  return 0;
}
// 一步：返回 [人, 木桩] 的输入。录制时人控制木桩（自己站着不动），按「前 / 后」存，回放时按木桩当时的朝向换回左右
function trInputs(TR, s, inp) {
  const me = s.F[0], d = s.F[1], fwd = d.face > 0 ? 'r' : 'l', back = d.face > 0 ? 'l' : 'r';
  if (TR.recOn) { const r = {}; for (const k in inp) if (inp[k]) r[k === fwd ? 'F' : k === back ? 'B' : k] = 1; TR.rec.push(r); TR.recT++; if (TR.recT >= 600) TR.recOn = false; return [{}, inp]; }
  const m = TRAIN_MODES[TR.mode][0]; let di = {};
  if (m === 'crouch') di = { dn: 1 };
  else if (m === 'jump') di = d.st === 'idle' || d.st === 'walk' ? { u: 1 } : {};
  else if (m === 'block') { di = { [back]: 1 }; const A = me.atk, low = (A && A.low) || (me.mv && me.mv.low) || (me.box && me.box.low); if (low) di.dn = 1; }
  else if (m === 'play' && TR.rec.length) { const r = TR.rec[TR.playI % TR.rec.length]; TR.playI++; for (const k in r) di[k === 'F' ? fwd : k === 'B' ? back : k] = 1; }
  return [inp, di];
}
// 每一步前后：帧数据、输入历史、连段伤害、自动回满
function trPre(TR, s) { TR.hs = s.hitstop > 0 || s.freeze > 0 || !!s.cine; TR.wasAct = TR_ACT(s.F[0].st); TR.dWasAct = TR_ACT(s.F[1].st) || s.F[1].st === 'block' && false; TR.ev0 = s.ev.length; }
function trPost(TR, s, inp) {
  const me = s.F[0], d = s.F[1]; s.timer = 99 * 60;
  // 输入历史：方向（数字键盘记法）+ 按键，按住几帧
  const dir = (inp.u ? 7 : inp.dn ? 1 : 4) + ((inp.r && me.face > 0) || (inp.l && me.face < 0) ? 2 : (inp.l && me.face > 0) || (inp.r && me.face < 0) ? 0 : 1) + (inp.u || inp.dn ? 0 : 0), btn = ['a', 'lk', 'hp', 'hk', 'dv', 's', 'x', 'rl'].filter(k => inp[k]).join(',');
  const key = dir + '|' + btn; if (TR.last && TR.last.key === key) TR.last.n++; else { TR.last = { key, dir, btn, n: 1 }; TR.hist.unshift(TR.last); if (TR.hist.length > 18) TR.hist.pop(); }
  // 帧数据：从「能动」变成出招开始数，判定出现 = 发生，判定持续，回到能动 = 总帧数；两边都回到能动时算帧优势（顿帧不算）
  if (!TR.hs) {
    if (TR.wasAct && !TR_ACT(me.st) && !['jump', 'dash', 'block', 'hit', 'launch', 'down'].includes(me.st)) TR.fd = { name: me.mv ? me.mv.id : me.atkK || me.st, n: 0, first: 0, act: 0, end: 0, hit: null, dEnd: 0, meEndN: 0 };
    const F = TR.fd;
    if (F && !F.done) { F.n++; if (me.box) { if (!F.first) F.first = F.n; F.act++; } if (!F.end && TR_ACT(me.st)) F.end = F.n; if (F.hit && !F.dEnd && TR_ACT(d.st)) F.dEnd = F.n;
      if (F.end && (!F.hit || F.dEnd)) { F.done = 1; F.adv = F.hit ? F.dEnd - F.end : null; TR.fdShow = Object.assign({}, F); } if (F.n > 400) F.done = 1; }
  }
  // 帧计量条（街霸 6 的 Frame Meter）：两人各一行，每一步一格。绿 = 前摇，红 = 判定，蓝 = 收招，黄 = 受击 / 被防硬直，灰 = 能动，青 = 跳 / 冲刺
  if (!TR.hs) { const cls = f => { if (TR_ACT(f.st)) { TR.seen[f.idx] = 0; return 'n'; } if (f.box) { TR.seen[f.idx] = 1; return 'a'; } if (['hit', 'launch', 'stun', 'block', 'down', 'getup', 'freeze', 'held', 'sleep'].includes(f.st)) return 'h'; if (f.st === 'jump' || f.st === 'dash') return 'm'; return TR.seen[f.idx] ? 'r' : 's'; };
    const c = s.F.map(cls), busy = c.some(x => x !== 'n'); if (busy && TR.fmIdle > 12) TR.fm = [[], []]; TR.fmIdle = busy ? 0 : TR.fmIdle + 1;
    if (busy || TR.fmIdle <= 4) for (let i = 0; i < 2; i++) { TR.fm[i].push(c[i]); if (TR.fm[i].length > 90) TR.fm[i].shift(); } }
  for (let i = TR.ev0; i < s.ev.length; i++) { const e = s.ev[i]; if (e.type === 'hit' && TR.fd && !TR.fd.done && TR.fd.hit == null && e.who !== 1) TR.fd.hit = e.blk ? 'block' : 'hit'; }
  // 连段伤害 + 自动回满（木桩回到能动 40 步后回满；血低于 25% 时先垫一点，不让局结束）
  const C = TR.combo; if (d.hp < C.prevHp) { if (C.idle > 30) { C.dmg = 0; C.n = 0; } C.dmg += C.prevHp - d.hp; C.n = Math.max(C.n, d.combo || 0); }
  C.idle = TR_ACT(d.st) || d.st === 'block' ? C.idle + 1 : 0;
  if (C.idle === 40) { d.hp = d.hpMax; me.hp = me.hpMax; }
  if (d.hp < d.hpMax * 0.5) d.hp = d.hpMax * 0.5; if (me.hp < me.hpMax * 0.25) me.hp = me.hpMax * 0.25;
  C.prevHp = d.hp;
  if (s.f % 30 === 0 && TR_ACT(me.st)) { me.meter = Math.max(me.meter, 100); me.drive = Math.max(me.drive, 6); if (me.burn) me.burn = 0; }
}
function drawTrain(TR, s) {
  const me = s.F[0], d = s.F[1];
  if (TR.box) {      // 判定框：绿 = 受击框，红 = 攻击判定，黄 = 推挤宽度（游戏里的真实数值，镜头抖动时会差几像素）
    g.save(); g.lineWidth = 3;
    for (const f of s.F) {
      const hb = hurtBox(f), [x0, y0] = w2s(s, hb[0], hb[3]), [x1, y1] = w2s(s, hb[1], hb[2]); g.strokeStyle = canBeHitF(f) ? 'rgba(80,255,140,0.9)' : 'rgba(80,255,140,0.35)'; g.fillStyle = 'rgba(80,255,140,0.10)'; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.strokeRect(x0, y0, x1 - x0, y1 - y0);
      if (f.box) { const kx = f.skin === 'a' ? AKX : 1, ky = f.skin === 'a' ? AKY : 1, bx = f.box, ax0 = f.x + f.face * bx.x0 * kx, ax1 = f.x + f.face * bx.x1 * kx, [p0, q0] = w2s(s, Math.min(ax0, ax1), f.y + bx.y1 * ky), [p1, q1] = w2s(s, Math.max(ax0, ax1), f.y + bx.y0 * ky); g.fillStyle = 'rgba(255,60,80,0.25)'; g.strokeStyle = 'rgba(255,60,80,0.95)'; g.fillRect(p0, q0, p1 - p0, q1 - q0); g.strokeRect(p0, q0, p1 - p0, q1 - q0); }
      const [cx, cy] = w2s(s, f.x, f.y); g.strokeStyle = 'rgba(255,220,80,0.9)'; g.beginPath(); g.moveTo(cx, cy - 10); g.lineTo(cx, cy + 10); g.moveTo(cx - 10, cy); g.lineTo(cx + 10, cy); g.stroke();
    }
    for (const p of s.P) { if (p.dead || !p.dmg) continue; const [x0, y0] = w2s(s, p.x - p.w / 2, p.y + p.h / 2), [x1, y1] = w2s(s, p.x + p.w / 2, p.y - p.h / 2); g.strokeStyle = 'rgba(255,60,80,0.95)'; g.strokeRect(x0, y0, x1 - x0, y1 - y0); }
    g.restore();
  }
  // 左边：输入历史
  g.save(); g.globalAlpha = 0.78; g.fillStyle = '#0B1020'; rr(14, 196, 210, 18 * 34 + 20, 14); g.fill(); g.restore();
  const ARW = { 1: '↙', 2: '↓', 3: '↘', 4: '←', 5: '·', 6: '→', 7: '↖', 8: '↑', 9: '↗' }, BN = { a: '轻拳', lk: '轻脚', hp: '重拳', hk: '重脚', dv: '架', s: '懒', x: '超', rl: '滚' };
  TR.hist.forEach((h, i) => { const y = 228 + i * 34, a = 1 - i * 0.04; txt(String(Math.min(99, h.n)), 34, y, { size: 22, w: 700, fam: F.en, fill: '#8FA0C8', a }); txt(ARW[h.dir] || '·', 86, y, { size: 28, w: 900, fill: '#FFFFFF', align: 'center', a }); if (h.btn) txt(h.btn.split(',').map(k => BN[k]).join('+'), 112, y, { size: 22, w: 900, fill: '#FFE066', a }); });
  // 上方：帧数据面板
  if (TR.data) { const F = TR.fdShow, x = 960, y = 262; g.save(); g.globalAlpha = 0.82; g.fillStyle = '#0B1020'; rr(x - 400, y - 30, 800, 92, 14); g.fill(); g.restore();
    if (F) { const adv = F.adv == null ? '—' : (F.adv > 0 ? '+' : '') + F.adv, col = F.adv == null ? '#C9D4EE' : F.adv > 0 ? '#5CF29A' : F.adv < 0 ? '#FF6B7A' : '#FFFFFF';
      txt(`发生 ${F.first || '—'}F  持续 ${F.act || '—'}F  收招 ${F.first ? Math.max(0, (F.end || F.n) - F.first - F.act) : '—'}F  总 ${(F.end || F.n) - 1}F`, x - 380, y + 8, { size: 28, w: 900, fill: '#FFFFFF' });
      txt((F.hit === 'block' ? '被防 ' : F.hit === 'hit' ? '命中 ' : '没打中 ') + (F.hit ? adv : ''), x + 380, y + 8, { size: 30, w: 900, fill: col, align: 'right' });
      txt(`招式 ${F.name}   连段 ${TR.combo.n || 0} 下 / ${Math.round(TR.combo.dmg)} 伤害`, x - 380, y + 46, { size: 22, w: 700, fill: '#8FA0C8' }); }
    else txt('出一招看帧数据（顿帧不算在内）', x, y + 20, { size: 26, w: 800, fill: '#8FA0C8', align: 'center' }); }
  // 帧计量条
  if (TR.data && TR.fm[0].length) { const FC = { n: '#3A4258', a: '#FF4D5E', s: '#3DDC84', r: '#4D8BFF', h: '#FFD23C', m: '#4FD8E0' }, cw = 13, x0 = 960 - 45 * cw, y0 = 332;
    g.save(); g.globalAlpha = 0.85; g.fillStyle = '#0B1020'; rr(x0 - 12, y0 - 10, 90 * cw + 24, 88, 10); g.fill(); g.restore();
    for (let i = 0; i < 2; i++) TR.fm[i].forEach((c, k) => { g.fillStyle = FC[c]; g.fillRect(x0 + k * cw, y0 + i * 24, cw - 2, 20); });
    [['前摇', 's'], ['判定', 'a'], ['收招', 'r'], ['硬直', 'h'], ['能动', 'n'], ['跳 / 冲', 'm']].forEach(([l, c], i) => { const lx = x0 + i * 130; g.fillStyle = FC[c]; g.fillRect(lx, y0 + 56, 14, 14); txt(l, lx + 20, y0 + 69, { size: 18, w: 800, fill: '#C9D4EE' }); });      // 图例（GPT 审图 r41 第 5 条）
    txt('P1', x0 - 20, y0 + 16, { size: 18, w: 900, fam: F.en, fill: '#fff', align: 'right' }); txt('木桩', x0 - 20, y0 + 40, { size: 18, w: 900, fill: '#fff', align: 'right' }); }
  // 下方：木桩状态 + 键位
  const m = TR.recOn ? `● 录制中 ${(TR.recT / 60).toFixed(1)} / 10 秒（你在控制木桩，按 2 停）` : '木桩：' + TRAIN_MODES[TR.mode][1] + (TR.rec.length ? `（已录 ${(TR.rec.length / 60).toFixed(1)} 秒）` : '');
  txt(m, 1890, 278, { size: 28, w: 900, fill: TR.recOn ? '#FF6B7A' : '#FFFFFF', stroke: '#0B1020', sw: 7, align: 'right' });
  ['1 木桩动作', '2 录制 / 停止', '3 回放', '4 判定框 ' + (TR.box ? '开' : '关'), '5 帧数据 ' + (TR.data ? '开' : '关'), '0 回到中间', 'Esc 出招表  ⌫ 退出'].forEach((l, i) => txt(l, 1890, 322 + i * 32, { size: 22, w: 800, fill: '#C9D4EE', stroke: '#0B1020', sw: 5, align: 'right' }));
  txt('训练模式', 1890, 228, { size: 34, w: 900, fill: '#FFE066', stroke: '#0B1020', sw: 7, align: 'right' });
}
