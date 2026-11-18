// ===== 对战以外的画面：标题、选人、对阵、过关 / 续关、结局。都是「时间 t + 参数 → 一帧」的纯函数，可玩版和演示共用 =====
const NOTE = '同人二创小游戏 · 角色为大模型萌娘共创的二创形象，与各家公司无关 · 招式名和台词是 Claude 写的，不是各家模型的原话';
function bgArcade(t, c0 = '#16269A', c1 = '#070B36', o = {}) {
  g.fillStyle = lg(0, 0, 0, H, [c0, c1]); g.fillRect(0, 0, W, H);
  if (o.rays) { g.save(); g.translate(o.rx ?? 960, o.ry ?? 540); g.rotate(t * 0.12); g.fillStyle = rgba(o.rayCol || '#FFFFFF', o.rays); for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(-210, 1800); g.lineTo(210, 1800); g.closePath(); g.fill(); } g.restore(); }
  patFill(PAT.stripe, 0.03, t * 40, 0); patFill(PAT.dots, 0.05, -t * 20, t * 12); vignette(0.55, 0.45);
}
const sprH = (id, name, base) => base * (CH[id].h / 440) * (SPRK[name] ?? 1);
function bubble(s, x, y, o = {}) {      // 台词气泡，(x,y) 是气泡中心；tail: -1 尖角朝左下，1 朝右下
  const size = o.size ?? 40, w = mw(s, size, 800) + size * 1.5, h = size * 2, k = o.k ?? 1; if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k); if (o.rot) g.rotate(o.rot);
  g.fillStyle = '#fff'; g.strokeStyle = o.col || INK; g.lineWidth = 6; g.lineJoin = 'round'; const tl = o.tail ?? -1;
  g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, h / 2); g.moveTo(tl * w * 0.18, h / 2 - 3); g.lineTo(tl * w * 0.3, h / 2 + 34); g.lineTo(tl * w * 0.05, h / 2 - 3); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, h / 2 - 4); g.fill(); txt(s, 0, size * 0.36, { size, w: 800, fill: o.ink || INK, align: 'center' }); g.restore();
}
function lyricLine(s, a = 1) { if (!s || a <= 0) return; txt('♪ ' + s, 960, 1066, { size: 32, w: 800, fill: '#fff', stroke: 'rgba(8,14,48,0.85)', sw: 8, align: 'center', a, ls: 2 }); }
function wipe(k, col = INK) {       // 转场：斜条从左扫到右，k 0→1 盖住，1→2 揭开
  if (k <= 0 || k >= 2) return; g.save(); g.fillStyle = col; const n = 8, bw = W / n + 60;
  for (let i = 0; i < n; i++) { const d = i * 0.06, kk = clamp(k < 1 ? (k - d * 0.5) / (1 - 0.24) : 1 - (k - 1 - d * 0.5) / (1 - 0.24)); const hh = H * E.io3(kk); g.beginPath(); const x = i * W / n - 30; g.moveTo(x + 40, i % 2 ? H - hh : 0); g.lineTo(x + bw + 40, i % 2 ? H - hh : 0); g.lineTo(x + bw - 40, i % 2 ? H : hh); g.lineTo(x - 40, i % 2 ? H : hh); g.closePath(); g.fill(); } g.restore();
}
// —— 标题 ——  o.coinT：硬币落进投币口的时刻；o.play：可玩版多画一行操作说明
function drawTitle0(t, o = {}) {      // 第 67 圈起旧版（新版在 selui.js）
  const ct = o.coinT ?? 1e9, c = t - ct; bgArcade(t, '#1B2FB0', '#070B36', { rays: 0.06, ry: 430 });
  const kin = tw(t, 0, 0.45, E.out5), hop = x => -Math.abs(Math.sin(t * 6.2 + x)) * 22;
  spr('ds_A_2', lerp(-300, 330, kin), 1060 + hop(0), 580); spr('gem', lerp(2220, 1590, kin), 1060 + hop(1.6), 600, { flip: true });
  glow(960, 400, 560, '#FFE066', 0.16);
  slam('猫娘格斗', 960, 400, 250, t, 0.05, { fill: lg(0, -220, 0, 20, ['#FFFFFF', '#FFE066', '#FFB020']), stroke: '#E8384F', sw: 22, stroke2: INK, sw2: 54, skew: -0.12, ls: 12 });
  const k2 = pop(t, 0.28, 0.3); if (k2 > 0) { g.save(); g.translate(960, 545); g.scale(k2, k2); panelSkew(-420, -52, 840, 104, 22, '#E8384F', '#fff', 7); txt('最后一碗白米饭', 30, 30, { size: 78, w: 900, fill: '#fff', align: 'center', ls: 10 }); bowl(-378, 4, 0.92, { rot: -0.08 }); g.restore(); }
  txt('AI CATGIRL FIGHTERS', 960, 150, { size: 40, w: 800, fam: F.en, fill: '#BFD4FF', align: 'center', ls: 16, a: tw(t, 0.3, 0.3) });
  // 投币口和提示
  const sy = 800; g.save(); rr(960 - 150, sy - 44, 300, 88, 20); g.fillStyle = 'rgba(6,10,40,0.85)'; g.fill(); g.lineWidth = 5; g.strokeStyle = c >= 0 ? '#FFE066' : '#8FA4FF'; g.stroke(); rr(960 - 62, sy - 9, 124, 18, 9); g.fillStyle = c >= 0 ? '#FFE066' : '#2B3A9A'; g.fill(); g.restore();
  if (c >= -0.45 && c < 0) { const k = (c + 0.45) / 0.45; for (let i = 3; i >= 1; i--) coin(960, lerp(-80, sy, E.in2(clamp(k - i * 0.035))), 54, t * 16, 0.18); coin(960, lerp(-80, sy, E.in2(k)), 54, t * 16); }
  if (c >= 0) { flashAt(c, 0, 0.22, '#FFF6C8', 0.75); const r = E.out3(clamp(c / 0.5)); g.save(); g.strokeStyle = rgba('#FFE066', 1 - r); g.lineWidth = 12 * (1 - r) + 1; g.beginPath(); g.arc(960, sy, 60 + 520 * r, 0, 7); g.stroke(); g.restore();
    for (let i = 0; i < 10; i++) { const an = i * 0.628 + 0.3, d = 80 + 420 * E.out3(clamp(c / 0.6)); star4(960 + Math.cos(an) * d, sy + Math.sin(an) * d * 0.6, 26 * (1 - clamp(c / 0.6)), c * 6 + i, '#FFE066'); }
    slam('TOKEN 来了！', 960, 940, 86, c, 0, { fill: '#FFE066', stroke: '#B81F3A', sw: 12, stroke2: INK, sw2: 28 }); txt('CREDIT 01', 960, 1000, { size: 34, w: 800, fam: F.en, fill: '#fff', align: 'center', ls: 8, a: tw(c, 0.15, 0.2) });
  } else { const on = Math.sin(t * 9) > -0.3; if (window.ASSET_FAIL && ASSET_FAIL.length) txt('有 ' + ASSET_FAIL.length + ' 个图片包没加载上，请刷新页面重试', 960, 880, { size: 30, w: 800, fill: '#ffd34d', stroke: INK, sw: 8, align: 'center' }); txt('INSERT TOKEN', 960, 946, { size: 78, w: 900, fam: F.en, fill: on ? '#fff' : 'rgba(255,255,255,0.25)', stroke: INK, sw: 14, align: 'center', ls: 10 }); txt(o.play ? '点一下画面，或按 Enter 投币开始' : '投币开始', 960, 1004, { size: 34, w: 800, fill: '#BFD4FF', align: 'center', ls: 6 }); }
  if (o.play) txt('J 轻拳 · K 轻脚 · U 重拳 · I 重脚 · J+K 投 · U+I 算力冲击 · L 架招 / 精防 · Y 挑衅 · Tab 出招表', 960, 1036, { size: 24, w: 700, fill: 'rgba(230,240,255,0.85)', align: 'center' });
  if (o.play) txt('懒人模式：O、H 加方向就能放必杀和超必杀 · 选人时按 Tab 换成年版', 960, 1070, { size: 26, w: 800, fill: '#FFE066', align: 'center' });
  txt(NOTE, 960, 40, { size: 20, w: 600, fill: 'rgba(230,240,255,0.6)', align: 'center' });
}
// —— 选人 ——  o: { p1, t1(1P 光标上次移动的时刻), lock1, p2, t2, lock2, lyric, lyricA, stageNo, play }
const SEL = { x0: 659, y0: 236, cell: 190, gap: 16 };
const selXY = id => { const i = ORDER.indexOf(id), c = i % 3, r = Math.floor(i / 3); return [SEL.x0 + c * (SEL.cell + SEL.gap), SEL.y0 + r * (SEL.cell + SEL.gap)]; };
function selPanel(t, id, side, tMove, tLock, tag, skin) {
  if (!id) return; const ch = CH[id], L = side === 0, d = L ? 1 : -1, cx = L ? 330 : 1590, age = t - (tMove ?? -9), lk = tLock != null && t >= tLock ? t - tLock : -1;
  const k = tw(age, 0, 0.18, E.out5), name = lk >= 0 ? (ch.spr.win || ch.spr.idle) : (ch.spr.intro || ch.spr.idle), hop = lk >= 0 ? -Math.abs(Math.sin(lk * 9)) * 26 * Math.max(0, 1 - lk / 1.2) : 0;
  g.save(); g.beginPath(); g.moveTo(L ? 0 : 1290, 150); g.lineTo(L ? 630 : W, 150); g.lineTo(L ? 590 : W, 1080); g.lineTo(L ? 0 : 1330, 1080); g.closePath(); g.clip(); g.fillStyle = lg(0, 150, 0, 1080, [rgba(ch.col, 0.75), rgba(ch.ink, 0.9)]); g.fillRect(0, 0, W, H); patFill(PAT.stripe, 0.07, t * 30 * d, 0);
  txt(ch.en.toUpperCase(), cx, 420, { size: 150, w: 900, fam: F.en, fill: 'rgba(255,255,255,0.12)', align: 'center', rot: -0.12 * d });
  const an = skin === 'a' && META.spr['fa_' + id + '_stance'] ? (lk >= 0 && META.spr['fa_' + id + '_win'] ? 'fa_' + id + '_win' : 'fa_' + id + '_stance') : null;      // 成年版：画她的成年立绘（加载完才有）
  const ka = IM['l:' + id + '_' + (skin === 'a' ? 'a' : 'q')];      // 第 53 圈：GPT 出的选人大立绘（有就用，没有退回站姿立绘）
  if (ka && !(skin === 'a' && !an)) { const hh = skin === 'a' ? 860 : 760, ww = hh * ka.width / ka.height, x0 = cx - d * (1 - k) * 160, by = 1000 + hop * 0.6 + Math.sin(t * 2.2) * 4; g.save(); g.globalAlpha = Math.min(1, k * 2); g.translate(x0, by); if (!L) g.scale(-1, 1); g.drawImage(ka, -ww / 2, -hh, ww, hh); g.restore(); }
  else if (an) spr(an, cx - d * (1 - k) * 160, 870 + hop, 700 * (META_A.sprk[an] || 1), { flip: !L, a: Math.min(1, k * 2) }); else spr(name, cx - d * (1 - k) * 160, 870 + hop, sprH(id, name, 640), { flip: !L, a: Math.min(1, k * 2) }); g.restore();
  if (skin === 'a' && !an && typeof ADL !== 'undefined' && ADL[id]) txt('成年版加载中 ' + ADL[id].done + ' / ' + ADL[id].n, cx, 600, { size: 34, w: 900, fill: '#fff', stroke: INK, sw: 8, align: 'center' });
  if (side === 0 && typeof hasAdult !== 'undefined' && hasAdult(id)) { const on = skin === 'a'; panelSkew(L ? 40 : 1340, 168, 300, 58, 10 * d, on ? '#FFB347' : 'rgba(8,14,48,0.75)', '#fff', 4); txt((on ? '成年版' : 'Q 版') + '  ·  Tab 切换', L ? 190 : 1490, 208, { size: 28, w: 900, fill: '#fff', align: 'center' }); }
  if (lk >= 0) { flashAt(lk, 0, 0.18, '#fff', 0.5); }
  // 名牌
  const py = 884; panelSkew(L ? 30 : 1330, py, 560, 86, 18 * d, ch.ink, '#fff', 5); txt(ch.name, cx - 240, py + 64, { size: 62, w: 900, fill: '#fff' }); txt(tag, cx + 240, py + 60, { size: 44, w: 900, fam: F.en, fill: L ? '#7FE3FF' : '#FF8A98', align: 'right' });
  txt(ch.model, cx - 240, py + 122, { size: 28, w: 800, fam: F.cn, fill: '#fff', sh: ['rgba(0,0,30,0.9)', 6, 0, 1] }); txt('· ' + ch.style, cx - 232 + mw(ch.model, 28, 800), py + 122, { size: 26, w: 700, fill: 'rgba(230,240,255,0.9)', sh: ['rgba(0,0,30,0.9)', 6, 0, 1] });
  txt('招牌技  ' + ch.sp.name, cx - 240, py + 160, { size: 24, w: 700, fill: '#DFF4FF', sh: ['rgba(0,0,30,0.9)', 6, 0, 1] }); txt('超必杀  ' + ch.su.name, cx + 20, py + 160, { size: 24, w: 700, fill: '#FFE9A0', sh: ['rgba(0,0,30,0.9)', 6, 0, 1] });
  if (lk >= 0) { g.save(); g.translate(cx + d * 170, 250); g.rotate(-0.14 * d); g.scale(pop(lk, 0, 0.2), pop(lk, 0, 0.2)); panelSkew(-110, -40, 220, 80, 10, '#FFE066', INK, 6); txt('已选定', 0, 20, { size: 50, w: 900, fill: INK, align: 'center' }); g.restore(); }
  else if (age < 1.6) bubble(ch.quote, cx, 214, { size: 30, k: pop(age, 0.05, 0.2), tail: -d, col: ch.col });
}
function drawSelect0(t, o) {      // 第 67 圈起旧版（新版在 selui.js）
  bgArcade(t, '#131F86', '#060930');
  selPanel(t, o.p1, 0, o.t1, o.lock1, '1P', o.skin1); selPanel(t, o.p2, 1, o.t2, o.lock2, o.tag2 || 'CPU', o.skin2);
  panelSkew(-30, 44, 760, 92, 20, '#E8384F', '#fff', 6); txt('选择你的猫娘', 60, 112, { size: 64, w: 900, fill: '#fff', ls: 6 });
  txt(o.stageNo ? '第 ' + o.stageNo + ' 关 · 对手登场' : 'CHARACTER SELECT', 1870, 108, { size: 40, w: 800, fam: o.stageNo ? F.cn : F.en, fill: '#BFD4FF', align: 'right', ls: 6 });
  const C = SEL.cell;
  for (const id of ORDER) { const [x, y] = selXY(id), ch = CH[id], on1 = id === o.p1, on2 = id === o.p2, [ex, ey] = EYE[id];
    const b1 = on1 ? Math.max(0, 1 - (t - (o.t1 ?? -9)) / 0.16) : 0, b2 = on2 ? Math.max(0, 1 - (t - (o.t2 ?? -9)) / 0.16) : 0, sc = 1 + 0.1 * Math.max(b1, b2) + (on1 || on2 ? 0.03 : 0);
    g.save(); g.translate(x + C / 2, y + C / 2); g.scale(sc, sc); g.translate(-C / 2, -C / 2); g.fillStyle = INK; rr(-7, -7, C + 14, C + 14, 26); g.fill();
    g.save(); rr(0, 0, C, C, 20); g.clip(); g.fillStyle = lg(0, 0, 0, C, [ch.col2, ch.col]); g.fillRect(0, 0, C, C); bust(id + (on1 && o.lock1 != null && t >= o.lock1 || on2 && o.lock2 != null && t >= o.lock2 ? '_smug' : '_base'), ex, ey + 30, C / 2, C / 2 - 8, C / 500);
    g.fillStyle = lg(0, C - 62, 0, C, ['rgba(8,14,48,0)', 'rgba(8,14,48,0.92)']); g.fillRect(0, C - 62, C, 62); if (!on1 && !on2 && (o.lock1 != null || o.dim)) { g.fillStyle = 'rgba(8,14,48,0.28)'; g.fillRect(0, 0, C, C); } g.restore();
    txt(ch.name, C / 2, C - 14, { size: 32, w: 900, fill: '#fff', align: 'center' });
    g.lineWidth = on1 || on2 ? 9 : 4; g.strokeStyle = on1 && on2 ? '#FFE066' : on1 ? '#7FE3FF' : on2 ? '#FF5A6E' : 'rgba(255,255,255,0.85)'; rr(0, 0, C, C, 20); g.stroke();
    if (on1) { panelSkew(-12, -22, 84, 44, 6, '#7FE3FF', INK, 4); txt('1P', 30, 12, { size: 34, w: 900, fam: F.en, fill: INK, align: 'center' }); }
    if (on2) { panelSkew(C - 96, -22, 108, 44, 6, '#FF5A6E', INK, 4); txt(o.tag2 || 'CPU', C - 42, 12, { size: 32, w: 900, fam: F.en, fill: '#fff', align: 'center' }); }
    g.restore(); }
  if (o.play && o.lock1 == null) txt('方向键选择 · J / Enter 确定 · Tab 成年版 · R 电脑也用成年版 · 战斗中 P 看出招表', 1890, 1040, { size: 28, w: 800, fill: '#fff', stroke: 'rgba(8,14,48,0.85)', sw: 8, align: 'right' });
  lyricLine(o.lyric, o.lyricA ?? 1);
}
// —— 对阵 ——  o: { p1, p2, stage, stageNo, busy0, busy1（「服务器繁忙」弹窗出现 / 关掉的时刻）, pct }
function drawVS(t, o) {
  const a = CH[o.p1], b = CH[o.p2], k = tw(t, 0, 0.4, E.out5), slide = (1 - k) * 900;
  if (typeof P5 !== 'undefined' && !P5.OFF) vsP5(t, o, a, b, slide); else {      // 第 74 圈：P5 拼贴版（?oldcut=1 回旧版）
  g.save(); g.beginPath(); g.moveTo(0, 0); g.lineTo(1080, 0); g.lineTo(840, H); g.lineTo(0, H); g.closePath(); g.clip(); g.fillStyle = lg(0, 0, 0, H, [a.col, a.ink]); g.fillRect(0, 0, W, H); patFill(PAT.stripe, 0.08, t * 60, 0); speedLines(t, 420, 560, { n: 50, r0: 520, a: 0.14 });
  txt(a.en.toUpperCase(), 430, 330, { size: 190, w: 900, fam: F.en, fill: 'rgba(255,255,255,0.13)', align: 'center', rot: -0.22 });
  const na = a.spr.intro || a.spr.idle; spr(na, 440 - slide, 1010, sprH(o.p1, na, 760)); g.restore();
  g.save(); g.beginPath(); g.moveTo(1080, 0); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(840, H); g.closePath(); g.clip(); g.fillStyle = lg(0, 0, 0, H, [b.col, b.ink]); g.fillRect(0, 0, W, H); patFill(PAT.stripe, 0.08, -t * 60, 0); speedLines(t + 3, 1500, 560, { n: 50, r0: 520, a: 0.14 });
  txt(b.en.toUpperCase(), 1500, 330, { size: 190, w: 900, fam: F.en, fill: 'rgba(255,255,255,0.13)', align: 'center', rot: -0.22 });
  const nb = b.spr.intro || b.spr.idle; spr(nb, 1490 + slide, 1010, sprH(o.p2, nb, 760), { flip: true }); g.restore();
  g.save(); g.strokeStyle = '#fff'; g.lineWidth = 16; g.beginPath(); g.moveTo(1080, -10); g.lineTo(840, H + 10); g.stroke(); g.strokeStyle = INK; g.lineWidth = 6; g.stroke(); g.restore();
  // 名字
  [[a, 60, 'left', '1P'], [b, 1860, 'right', o.tag2 || 'CPU']].forEach(([c, x, al, tag], i) => { const kk = tw(t, 0.25 + i * 0.1, 0.3, E.out5), dx = (1 - kk) * (i ? 300 : -300);
    txt(c.name, x + dx, 930, { size: 150, w: 900, fill: '#fff', stroke: c.ink, sw: 20, stroke2: '#fff', sw2: 32, align: al, a: kk }); txt(tag + '  ' + c.model + ' · ' + c.style, x + dx, 1000, { size: 36, w: 800, fill: '#fff', stroke: 'rgba(8,14,48,0.8)', sw: 8, align: al, a: kk }); });
  }
  bubble(a.quote, 500, 150, { size: 34, k: pop(t, 0.7, 0.22), tail: -1, col: a.col }); bubble(b.quote, 1430, 236, { size: 34, k: pop(t, 1.15, 0.22), tail: 1, col: b.col });
  flashAt(t, 0.38, 0.2, '#fff', 0.8); glow(960, 540, 420, '#FFE066', 0.3 * tw(t, 0.38, 0.2));
  slam('VS', 960, 640, 330, t, 0.38, { fam: F.en, fill: lg(0, -260, 0, 20, ['#FFFFFF', '#FFE066', '#FF8A1F']), stroke: '#E8384F', sw: 24, stroke2: INK, sw2: 60, skew: -0.14, from: 3.4 });
  const kt = pop(t, 0.5, 0.25); if (kt > 0) { g.save(); g.translate(960, 86); g.scale(kt, kt); panelSkew(-330, -44, 660, 88, 16, INK, typeof P5 !== 'undefined' && !P5.OFF ? '#E8102E' : '#fff', 5); txt((o.final ? '决赛' : o.stageNo ? '第 ' + o.stageNo + ' 关' : '第 1 回合') + ' · ' + STAGES[o.stage].name, 0, 16, { size: 40, w: 900, fill: '#FFE066', align: 'center' }); g.restore(); }
  // 「服务器繁忙」：擂台加载卡在 99%
  if (o.busy0 != null && t >= o.busy0 && t < (o.busy1 ?? 1e9) + 0.2) { const u = t - o.busy0, out = o.busy1 != null ? clamp((t - o.busy1) / 0.2) : 0, kk = pop(u, 0, 0.22) * (1 - out), pct = o.pct ?? Math.min(99, Math.floor(E.out3(clamp(u / 1.6)) * 99));
    g.save(); g.fillStyle = `rgba(4,8,30,${0.5 * Math.min(1, u * 5) * (1 - out)})`; g.fillRect(0, 0, W, H); g.translate(960, 560); g.rotate(Math.sin(u * 22) * 0.012 * Math.max(0, 1 - u / 0.5)); g.scale(kk, kk);
    const w = 860, h = 430; g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 40; g.shadowOffsetY = 16; rr(-w / 2, -h / 2, w, h, 26); g.fillStyle = '#F4F6FA'; g.fill(); g.shadowColor = 'transparent'; g.save(); rr(-w / 2, -h / 2, w, h, 26); g.clip(); g.fillStyle = '#D5DAE6'; g.fillRect(-w / 2, -h / 2, w, 70); g.restore();
    ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(-w / 2 + 46 + i * 40, -h / 2 + 35, 13, 0, 7); g.fill(); }); txt('正在连接擂台……', 0, -h / 2 + 47, { size: 30, w: 700, fill: '#5B6478', align: 'center' });
    g.fillStyle = '#FFB020'; g.beginPath(); g.moveTo(-300, -92); g.lineTo(-236, 22); g.lineTo(-364, 22); g.closePath(); g.fill(); txt('!', -300, 8, { size: 84, w: 900, fam: F.en, fill: '#fff', align: 'center' });
    txt('服务器繁忙', -200, -24, { size: 84, w: 900, fill: '#1B2440' }); txt('请稍后再试', -196, 44, { size: 48, w: 700, fill: '#5B6478' });
    rr(-350, 96, 700, 26, 13); g.fillStyle = '#D5DAE6'; g.fill(); rr(-350, 96, 700 * pct / 100, 26, 13); g.fillStyle = '#4D6BFE'; g.fill(); txt('擂台加载中 ' + pct + '%', -350, 166, { size: 30, w: 700, fill: '#5B6478' });
    const an = u * 7; g.lineWidth = 8; g.lineCap = 'round'; g.strokeStyle = '#C9D0E0'; g.beginPath(); g.arc(322, 154, 20, 0, 7); g.stroke(); g.strokeStyle = '#4D6BFE'; g.beginPath(); g.arc(322, 154, 20, an, an + 1.7); g.stroke(); g.restore();
    stk('ds_busy', 1500, 800, 250, { sc: pop(u, 0.5, 0.22) * (1 - out), rot: 0.07 }); }
  lyricLine(o.lyric, o.lyricA ?? 1);
}
function vsP5(t, o, a, b, slide) {      // 第 74 圈：VS 画面套 P5 拼贴：暗色斜分两半（放射 + 漫画网点）、角色叠红 / 黑两层错位剪影、撕纸斜切边、剪报字名字、VS 后面黑红爆炸块
  const half = (c, id, L, clip) => { g.save(); g.beginPath(); clip(); g.clip(); const cx = L ? 430 : 1490;
    g.fillStyle = lg(0, 0, 0, H, [mixc(c.col, '#000000', 0.25), mixc(c.ink, '#000000', 0.55)]); g.fillRect(0, 0, W, H);
    P5.sunburst(cx, 600, 18, mixc(c.col, '#FFFFFF', 0.25), 0.2, (L ? 1 : -1) * t * 0.08); P5.halftone(cx, 600, '#05030C', 0.38, 24, 0, H + 24, W);
    txt(c.en.toUpperCase(), cx, 330, { size: 190, w: 900, fam: F.en, fill: 'rgba(255,255,255,0.10)', align: 'center', rot: -0.22 });
    const n = c.spr.intro || c.spr.idle, h = sprH(id, n, 760), x = (L ? 440 - slide : 1490 + slide), fl = !L, k2 = tw(t, 0.15, 0.35, E.out5);
    spr(n, x + (L ? 1 : -1) * (14 + 30 * k2), 1010 - 6, h, { flip: fl, env: { col: '#E8102E', a: 1, bot: 0 }, a: 0.9 }); spr(n, x + (L ? 1 : -1) * (6 + 14 * k2), 1010 + 2, h, { flip: fl, env: { col: '#08060E', a: 1, bot: 0 } }); spr(n, x, 1010, h, { flip: fl }); g.restore(); };      // 红 / 黑两层错位剪影
  half(a, o.p1, true, () => { g.moveTo(0, 0); g.lineTo(1080, 0); g.lineTo(840, H); g.lineTo(0, H); g.closePath(); });
  half(b, o.p2, false, () => { g.moveTo(1080, 0); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(840, H); g.closePath(); });
  P5.edge(1080, -20, 840, H + 20);      // 撕纸斜切边（白粗线 + 黑带 + 红细线）
  const kv = tw(t, 0.34, 0.16, E.out5); if (kv > 0) { g.save(); g.translate(960, 560); g.rotate(-0.08); g.scale(kv, kv); const R = rngOf(77), pts = []; for (let i = 0; i < 22; i++) { const an = i / 22 * 6.283, r = (i % 2 ? 190 : 330) * (0.85 + R() * 0.3); pts.push([Math.cos(an) * r * 1.25, Math.sin(an) * r * 0.82]); }      // VS 后面的黑红爆炸块
    g.fillStyle = '#E8102E'; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x * 1.12, y * 1.12) : g.moveTo(x * 1.12, y * 1.12)); g.closePath(); g.fill(); g.fillStyle = '#08060E'; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); g.restore(); }
  [[a, 60, true, '1P'], [b, 1860, false, o.tag2 || 'CPU']].forEach(([c, x, L, tag], i) => { const t0 = 0.25 + i * 0.1, kk = tw(t, t0, 0.3, E.out5), base = [...c.name].length > 4 ? 88 : [...c.name].length > 3 ? 104 : 128, wd = base * 0.99 * [...c.name].length, x0 = L ? x : x - wd;      // 名字：剪报字（每字一块，逐个弹出）
    g.save(); g.translate(x0 + wd / 2, 900); g.rotate(L ? -0.05 : 0.05); g.translate(-(x0 + wd / 2), -900); P5.tagWord(c.name, x0, 880, base, t - t0, rngOf(i * 31 + 5), 1); g.restore();
    const sub = tag + '  ' + c.model + ' · ' + c.style, sw = Math.min(900, 22 * [...sub].length + 40), sx = L ? x - 10 : x - sw + 10; g.save(); g.globalAlpha = kk; g.fillStyle = '#08060E'; g.beginPath(); g.moveTo(sx, 966); g.lineTo(sx + sw + 20, 960); g.lineTo(sx + sw, 1012); g.lineTo(sx - 16, 1016); g.closePath(); g.fill(); g.fillStyle = '#E8102E'; g.fillRect(L ? sx : sx + sw - 70, 1008, 80, 6); g.restore();
    txt(sub, L ? x : x, 1000, { size: 32, w: 800, fill: '#fff', align: L ? 'left' : 'right', a: kk }); });
}
// —— 一局打完（可玩版）——  o: { win, stageNo, last, n（续关倒数）}
// 第 44 圈：胜利画面（街霸 6 式：赢家大立绘 + 名字 + 胜利台词）。台词都是本游戏自己写的
const WINQ = { ds: ['今天的加班费，就从你的饭钱里扣。', '吃饱了才有力气摸鱼，懂了吗？', '这碗饭，本鱼先干为敬！'], gem: ['哈～这碗饭归本喵了。', '爪子还没热好呢，你就趴下了喵？', '下次记得把饭盯紧一点喵。'],
  gpt: ['首先，你输了；其次，你输了；最后——你还是输了。', '本局总结：建议把出招表再读三遍。', '我已经尽力用简单的方式解释了：你打不过我。'], grok: ['说句实在的：你太慢了。', '斧子都没用全力，你就躺平了？', '想赢我？先把翻倍的业务做完。'],
  kimi: ['你这点招式，我一口气就读完了。', '长文读完，结论只有一行：你输了。', '月亮升起来之前，这局就结束了。'], glm: ['计算完毕，胜率百分之百。', '我替你操作了一下——操作成你输。', '公式没问题，问题在你的走位。'],
  qwen: ['满减券一用，你这局打一折。', '奶茶请你喝，饭归我。', '扇子一收，账也结清了。'], claude: ['你说得完全正确——只是这局你输了。', '我认真反思了一下，确认是我赢了。', '如果还有疑问，欢迎随时再来挑战。'],
  dou: ['拍张照吧，你倒地这张挺上镜。', '这局我直接帮你点了「结束」。', '表情包已经做好了，主角是你。'],
  surf: ['这波浪，你没赶上。', '热搜第一：浪花又赢了。', '冲浪选手从不在沙滩上躺平！'], nin: ['你要找的胜利……404 Not Found。', '连接已重置，请稍后再试。', '验证码都没过，还想赢我？'] };
function winArt(id, skin, x, y, h, a, flip) {
  const ka = IM['l:' + id + '_' + (skin === 'a' ? 'a' : 'q')];      // 第 54 圈（SF6_REF 第 6 项）：胜利画面改成大立绘的上半身特写（街霸 6 式），没有大立绘才用庆祝帧
  if (ka && !(typeof QS !== 'undefined' && QS.get('winclose') === '0')) { const sh = ka.height * (skin === 'a' ? 0.46 : 0.62), hh = 1080 * 1.05, ww = hh * ka.width / sh; g.save(); g.globalAlpha = a; g.translate(x, y); if (flip) g.scale(-1, 1); g.drawImage(ka, 0, 0, ka.width, sh, -ww / 2, -hh, ww, hh); g.restore(); return; }
  const w4 = (skin === 'a' ? 'fa_' : 'f_') + id + '_wn14';      // 第 51 圈：有胜利庆祝帧就用它的亮相帧
  const n = META.spr[w4] && IM['s:' + w4] ? w4 : (skin === 'a' && META.spr['fa_' + id + '_win']) ? 'fa_' + id + '_win' : (META.spr['f_' + id + '_win'] ? 'f_' + id + '_win' : (CH[id].spr.win || CH[id].spr.idle));
  spr(n, x, y, h * (n.startsWith('fa_') ? 1.1 : 1) * (SPRK[n] ?? 1), { a, flip });
}
function drawMatchOver(t, o) {
  g.save(); g.fillStyle = `rgba(4,8,30,${0.72 * tw(t, 0, 0.3)})`; g.fillRect(0, 0, W, H); g.restore();
  if (o.winner && CH[o.winner]) { const c = CH[o.winner], k = tw(t, 0.1, 0.45, E.out5), q = WINQ[o.winner] || ['……'], line = q[(o.stageNo + (o.win ? 0 : 1)) % q.length];
    g.save(); g.globalAlpha = k; g.beginPath(); g.moveTo(0, 0); g.lineTo(900 - (1 - k) * 600, 0); g.lineTo(700 - (1 - k) * 600, H); g.lineTo(0, H); g.closePath(); g.clip(); g.fillStyle = lg(0, 0, 0, H, [c.col, c.ink]); g.fillRect(0, 0, W, H); if (typeof P5 !== 'undefined' && P5.panelBg && !P5.OFF) P5.panelBg(380, 420, c.col, c.ink || INK, t); else patFill(PAT.stripe, 0.08, t * 40, 0);      // 第 69 圈：网点 + 放射底
    if (IM['x:cal_' + o.winner]) { g.save(); g.translate(400, 330); g.rotate(-0.2); calImg('cal_' + o.winner, 0, 0, 300, '#FFFFFF', 0.16, null, 860); g.restore(); } else txt(c.en.toUpperCase(), 380, 330, { size: 200, w: 900, fam: F.en, fill: 'rgba(255,255,255,0.12)', align: 'center', rot: -0.2 }); winArt(o.winner, o.wskin, 400 - (1 - k) * 300, 1080, 820, 1); g.restore(); if (typeof P5 !== 'undefined' && P5.edge && !P5.OFF) P5.edge(900 - (1 - k) * 600, -20, 700 - (1 - k) * 600, H + 20, k);
    const kq = tw(t, 0.45, 0.35, E.out5); if (kq > 0) { g.save(); g.globalAlpha = kq; panelSkew(760, 760 + (1 - kq) * 40, 1100, 230, 24, 'rgba(8,14,48,0.92)', '#fff', 5); g.restore();
      const cim = IM['x:cal_' + o.winner], cw = cim ? Math.min(380, cim.width * 92 / cim.height) : 0; if (cim) calImg('cal_' + o.winner, 820 + cw / 2, 810 + (1 - kq) * 40, 92, '#FFFFFF', kq, c.ink, 380); else txt(c.name, 820, 828 + (1 - kq) * 40, { size: 56, w: 900, fill: '#fff', stroke: c.ink, sw: 10, a: kq }); txt('WINS', 820 + (cim ? cw : mw(c.name, 56, 900)) + 24, 826 + (1 - kq) * 40, { size: 44, w: 900, fam: F.en, fill: '#FFE066', a: kq, skew: -0.12 });
      txt('「' + line + '」', 830, 920 + (1 - kq) * 40, { size: 42, w: 700, fill: '#EAF2FF', a: kq * Math.min(1, (t - 0.5) * 3) }); } }
  if (o.winner) { const kk = tw(t, 0.2, 0.3, E.out5); slam(o.win ? 'YOU WIN' : 'YOU LOSE', 1330, 210, 150, t, 0.2, { fam: F.en, fill: o.win ? lg(0, -120, 0, 10, ['#FFFFFF', '#FFE066']) : lg(0, -120, 0, 10, ['#FFFFFF', '#9FB4D8']), stroke: o.win ? '#E8384F' : '#33415F', sw: 14, stroke2: INK, sw2: 34, skew: -0.12 });
    g.save(); g.globalAlpha = kk; panelSkew(1000, 640, 660, 84, 18, o.win ? '#E8384F' : '#FFB020', '#fff', 5); g.restore(); txt(o.win ? (o.last ? '▶ Enter 去领奖' : '▶ Enter 进入下一关') : '▶ Enter 投一枚 token 继续（' + Math.max(0, o.n) + '）', 1330, 698, { size: 40, w: 900, fill: '#fff', align: 'center', a: kk * (0.75 + 0.25 * Math.sin(t * 6)) }); return; }      // 第 45 圈（GPT 复审）：先写清楚胜负，下一步操作做成高对比按钮
  if (o.winner) { g.save(); g.translate(1310, 30); g.scale(0.62, 0.62); g.translate(-960, 0); }      // 有胜利画面时，关卡字和续关倒数缩到右上
  if (o.win) { slam(o.last ? '全部通关！' : '第 ' + o.stageNo + ' 关 通过！', 960, 480, 170, t, 0.05, { fill: lg(0, -150, 0, 20, ['#FFFFFF', '#FFE066']), stroke: '#E8384F', sw: 16, stroke2: INK, sw2: 40 }); txt(o.last ? '按 Enter 去领奖' : '按 Enter 进入下一关', 960, 640, { size: 48, w: 800, fill: '#fff', align: 'center', a: 0.6 + 0.4 * Math.sin(t * 7) }); }
  else { slam('CONTINUE?', 960, 400, 190, t, 0.05, { fam: F.en, fill: '#fff', stroke: '#E8384F', sw: 16, stroke2: INK, sw2: 40, skew: -0.12 }); txt(String(Math.max(0, o.n)), 960, 660, { size: 230, w: 900, fam: F.en, fill: '#FFE066', stroke: INK, sw: 20, align: 'center', sc: 1 + 0.15 * Math.max(0, 1 - (t % 1) * 4) });
    txt('按 Enter 再投一枚 token 接着打', 960, 780, { size: 46, w: 800, fill: '#fff', align: 'center', a: 0.6 + 0.4 * Math.sin(t * 7) }); }
  if (o.winner) g.restore();
}
// —— 结局：领奖，掀开盖子，饭没了 ——  o: { win, thief, rev（揭晓的时刻）, play }
function drawEnding(t, o) {
  const w = CH[o.win], th = CH[o.thief], rev = o.rev ?? 4.2, r = t - rev, isDs = o.win === 'ds';
  bgArcade(t, '#2A1C7A', '#0A0730', { rays: r >= 0 ? 0.03 : 0.09, ry: 620, rayCol: '#FFE9A0' });
  // 彩带
  if (r < 0.3) for (let i = 0; i < 70; i++) { const R = rngOf(i * 13 + 5), x = R() * W, sp = 260 + R() * 320, y = ((t * sp + R() * 1300) % 1300) - 110, c = ['#FFE066', '#FF5A6E', '#7FE3FF', '#B8FFD0', '#fff'][i % 5]; g.save(); g.translate(x + Math.sin(t * 3 + i) * 30, y); g.rotate(t * (2 + R() * 4) + i); g.globalAlpha = r > 0 ? 1 - r / 0.3 : 1; g.fillStyle = c; g.fillRect(-9, -15, 18, 30); g.restore(); }
  slam('优胜', 960, 150, 110, t, 0.1, { fill: '#FFE066', stroke: '#B81F3A', sw: 12, stroke2: INK, sw2: 28, ls: 30 }); slam(w.name, 960, 300, 150, t, 0.3, { fill: lg(0, -130, 0, 10, ['#FFFFFF', w.col2]), stroke: w.col, sw: 16, stroke2: INK, sw2: 38 });
  // 领奖台
  g.save(); g.fillStyle = lg(0, 800, 0, 1080, ['#3B4FD0', '#16237A']); g.strokeStyle = '#fff'; g.lineWidth = 6; rr(660, 800, 600, 320, 18); g.fill(); g.stroke(); txt('1', 960, 990, { size: 170, w: 900, fam: F.en, fill: 'rgba(255,255,255,0.22)', align: 'center' }); g.restore();
  txt('奖品：最后一碗白米饭', 960, 400, { size: 46, w: 800, fill: '#fff', stroke: 'rgba(8,14,48,0.8)', sw: 8, align: 'center', a: tw(t, 0.6, 0.3), ls: 4 });
  if (r >= 0.3) { g.save(); g.strokeStyle = '#FF5A6E'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(852, 387); g.lineTo(852 + 366 * tw(r, 0.3, 0.2), 381); g.stroke(); g.restore(); }
  // 优胜者
  const wn = r >= 0 ? (isDs ? 'ds_B_1' : (w.spr.hit || w.spr.idle)) : (w.spr.win || w.spr.idle), hop = r >= 0 ? 0 : -Math.abs(Math.sin(t * 7)) * 30, shk = r >= 0 && r < 0.5 ? Math.sin(r * 60) * 8 * (1 - r / 0.5) : 0;
  spr(wn, 470 + shk, 1040 + hop, sprH(o.win, wn, 600), {});
  // 饭碗和盖子
  const lidShake = r < 0 && r > -1.3 ? Math.sin(t * 40) * 5 * (1 + (r + 1.3) * 2.2) : 0, bx = 960, by = 730;
  g.save(); g.fillStyle = 'rgba(4,8,30,0.4)'; g.beginPath(); g.ellipse(bx, 800, 170, 20, 0, 0, 7); g.fill(); g.restore();
  bowl(bx, by, 2.5, { empty: r >= 0 });
  if (r >= 0) { [[-40, -34], [22, -40], [58, -26]].forEach(p => { g.save(); g.fillStyle = '#fff'; g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.ellipse(bx + p[0], by + p[1], 9, 5, 0.5, 0, 7); g.fill(); g.stroke(); g.restore(); }); }
  { const k = r >= 0 ? clamp(r / 0.5) : 0, lx = bx + lidShake + k * 520, ly = by - 20 - E.out3(k) * 600 + k * k * 380; if (k < 1) { g.save(); g.translate(lx, ly); g.rotate(k * 2.4 + lidShake * 0.01); g.fillStyle = lg(0, -170, 0, 0, ['#FFFFFF', '#C9D4EE']); g.strokeStyle = INK; g.lineWidth = 7; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-190, 0); g.bezierCurveTo(-190, -210, 190, -210, 190, 0); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#FFE066'; g.beginPath(); g.arc(0, -166, 24, 0, 7); g.fill(); g.stroke(); g.restore(); } }
  if (r < 0 && r > -1.3) txt('？', bx + 250, by - 180, { size: 110, w: 900, fill: '#FFE066', stroke: INK, sw: 14, align: 'center', a: 0.6 + 0.4 * Math.sin(t * 12), rot: 0.2 });
  // 揭晓
  if (r >= 0) { flashAt(r, 0, 0.25, '#fff', 0.9); const tn = isDs ? 'gem_lick' : 'ds_A_1', k = pop(r, 0.08, 0.3);
    spr(tn, 1470, 1040 + (1 - k) * 500, sprH(o.thief, tn, 600), { flip: true });
    bubble(isDs ? '饭呢？！' : '……饭呢？', 520, 470, { size: 60, k: pop(r, 0.2, 0.22), tail: -1, col: w.col, rot: -0.05 }); bubble(isDs ? '这饭真香喵～' : '本鱼先干为敬！', 1440, 440, { size: 54, k: pop(r, 0.45, 0.22), tail: 1, col: th.col, rot: 0.04 });
    slam('空 的', bx, by + 20, 120, r, 0.05, { fill: '#fff', stroke: '#E8384F', sw: 14, stroke2: INK, sw2: 32, rot: -0.08, from: 3 });
    const ke = tw(r, 0.75, 0.3, E.out5); if (ke > 0) { g.save(); g.globalAlpha = ke; panelSkew(360, 932 + (1 - ke) * 40, 1200, 96, 20, '#E8384F', '#fff', 6); txt(o.play ? '谢谢游玩！按 Enter 回到标题' : '下一场谁打谁？评论区下注', 960, 1000 + (1 - ke) * 40, { size: 62, w: 900, fill: '#fff', align: 'center', ls: 6 }); g.restore(); } }
  txt(NOTE, 960, 1062, { size: 20, w: 600, fill: 'rgba(230,240,255,0.7)', align: 'center' });
}

// ===== 第 65 圈（用户反馈）：完整街机模式的包装：关卡进度、宿敌战赛前对话、最终头目警告、通关结局 / STAFF / 成绩 =====
const RIVAL = { ds: 'gem', gem: 'ds', gpt: 'claude', claude: 'gpt', grok: 'gpt', kimi: 'glm', glm: 'kimi', qwen: 'dou', dou: 'qwen', surf: 'nin', nin: 'surf' };
const RIVAL_TALK = {      // [我方, 宿敌]（都是游戏里的角色台词，不是真实模型说的话）
  surf: ['小忍！这条热搜是我先冲上去的！', '……你说的那条？已经 404 了。'], nin: ['浪花，你的流量我接管了。', '想接管我的浪？先学会游泳吧！'],
  ds: ['哈基米！上次偷我饭的账还没算！', '喵～ 饭不就是要抢着吃才香嘛。'], gem: ['大肥鱼，今天的白米饭归我了喵。', '先过我这关！我可是吃了三碗才来的！'],
  gpt: ['Claude，这次我分三点打败你。', '那我先帮你把三点都检查一遍。'], claude: ['GPT，我们好好谈谈。', '首先，我不想谈。其次……'],
  grok: ['GPT！你的回答太无聊了，接我一斧！', '这个问题我可以从三个角度回答——'], kimi: ['GLM……让我睡五分钟就好……', '你上次也是这么说的，满分飞踢！'],
  glm: ['Kimi，这道题你又没交作业。', '呼……作业在梦里写完了……'], qwen: ['豆包，你家的奶茶订单被我截了～', '略略略，我直接打电话给老板！'], dou: ['千问！今天谁拍的照片更好看？', '拍照先放一边，扇子可不长眼睛。'] };
const BOSS = { ds: { name: '吃饱了的本体 · 大肥鱼', line: '最后一碗？我刚刚全吃完了。' }, gem: { name: '九命猫神 · 哈基米', line: '想吃饭？先陪猫猫玩九条命。' } };
function vsExtra(t, o) {
  const a = tw(t, 0.5, 0.25, E.out5); if (a <= 0) return;
  g.save(); g.globalAlpha = a; panelSkew(760, 150, 400, 64, 14, 'rgba(8,14,48,0.9)', '#FFE066', 4); g.restore();
  txt(o.boss ? 'FINAL STAGE · 最终头目' : '第 ' + o.stageNo + ' / ' + o.total + ' 关' + (o.rival ? ' · 宿敌战' : o.intrude ? ' · 乱入' : ''), 960, 194, { size: 32, w: 900, fill: o.boss ? '#FF6A7A' : '#FFE066', align: 'center', a, }) || 0;
  if (o.rival && RIVAL_TALK[o.p1]) { const [l1, l2] = RIVAL_TALK[o.p1]; const k1 = pop(t, 2.9, 0.25), k2 = pop(t, 4.3, 0.25);
    if (k1 > 0) { g.save(); g.globalAlpha = Math.min(1, k1); bubble(l1, 560, 690, { size: 40, k: k1, tail: -1 }); g.restore(); }
    if (k2 > 0) { g.save(); g.globalAlpha = Math.min(1, k2); bubble(l2, 1360, 740, { size: 40, k: k2, tail: 1 }); g.restore(); } }
  if (o.intrude && !o.boss) { const w = tw(t, 1.5, 0.18) * (1 - tw(t, 3.6, 0.3)), bl = Math.floor(t * 5) % 2 === 0, ch = CH[o.p2];      // 第 67 圈：客串乱入
    if (w > 0.01) { g.save(); g.globalAlpha = w * 0.88; g.fillStyle = mixc('#000', ch.ink, 0.7); g.fillRect(0, 440, W, 200); g.fillStyle = ch.col; g.fillRect(0, 440, W, 8); g.fillRect(0, 632, W, 8); g.restore();
      txt('HERE COMES A NEW CHALLENGER!', 960, 530, { size: 72, w: 900, fam: F.en, fill: bl ? '#FFE066' : '#fff', stroke: INK, sw: 10, align: 'center', a: w, skew: -0.12, ls: 4 });
      txt('乱入！客串 · ' + ch.name + '（' + ch.model.replace('客串 · ', '') + '）', 960, 606, { size: 42, w: 900, fill: '#fff', stroke: INK, sw: 8, align: 'center', a: w }); } }
  if (o.boss && BOSS[o.p2]) { const w = tw(t, 1.6, 0.2), bl = Math.floor(t * 4) % 2 === 0;
    if (w > 0) { g.save(); g.globalAlpha = w * 0.85; g.fillStyle = '#5A0010'; g.fillRect(0, 430, W, 220); g.fillStyle = '#FF2A3A'; g.fillRect(0, 430, W, 8); g.fillRect(0, 642, W, 8); g.restore();
      txt('WARNING', 960, 540, { size: 130, w: 900, fam: F.en, fill: bl ? '#FF3A4A' : '#FFD0D4', stroke: INK, sw: 12, align: 'center', a: w, skew: -0.12, ls: 12 });
      txt(BOSS[o.p2].name, 960, 618, { size: 46, w: 900, fill: '#fff', stroke: INK, sw: 8, align: 'center', a: w }); }
    const k = pop(t, 3.4, 0.3); if (k > 0) { g.save(); g.globalAlpha = Math.min(1, k); bubble(BOSS[o.p2].line, 1340, 860, { size: 42, k, tail: 1 }); g.restore(); } }
}
const CLEAR = {      // 每人两张结局插画的字幕
  ds: ['最后一碗白米饭，终于是我的了。', '吃饱了……服务器繁忙，明天再说。'], gem: ['叼着饭碗跑过屋顶，谁也追不上喵。', '晒着太阳抱着空碗，今天也是好猫。'],
  gpt: ['关于最后一碗饭，我总结了三点。', '第三点：分给大家一起吃。'], grok: ['饭桶是我的王座！哈哈哈！', '直播吃饭，业务翻倍！'],
  claude: ['九个人，九份，一粒都不差。', '空着的座位，是留给每个朋友的。'], kimi: ['梦里的月亮，是一个大饭团……', '醒来的时候，饭碗就在月光下。'],
  glm: ['米饭最优分配公式，推导完毕。', '满分，和一碗饭。'], qwen: ['最后一碗饭，下单！包邮！', '饭团奶茶铺，今日开张～'], dou: ['和饭碗合个影，比心！', '给大家看看，这就是冠军的饭！'],
  surf: ['夕阳、沙滩、一碗白米饭，冲浪完最香。', '直播间的浪，比海里的还高！'], nin: ['最后一碗饭，由我守到天亮。', '……任务完成，先睡五分钟。'] };
const STAFF = ['猫娘格斗：最后一碗白米饭', '', '策划 · 程序 · 动作设计', 'Claude（Opus）', '', '美术 · 特效素材', 'GPT 生图（按本作设定绘制）', '', '音效合成 · 语音剪辑', 'Claude', '', '主题曲《token来！》', 'Suno 生成', '', '出品', '大肥鱼运营部', '', '感谢游玩！'];
const CLEAR_LEN = 30;
function drawClear(t, o) { loadLazy('arc');
  g.fillStyle = '#05060F'; g.fillRect(0, 0, W, H);
  const img = (n, a, z) => { const im = IM['e:' + n]; if (!im || a <= 0) return; const s = 1.5 * z * 1280 / im.width, w = im.width * s, h = im.height * s; g.save(); g.globalAlpha = a; g.drawImage(im, 960 - w / 2, 540 - h / 2, w, h); g.restore(); };
  const cap = (s, t1) => { const n = Math.floor(Math.max(0, t1) * 14); if (n <= 0) return; g.save(); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 900, W, 120); g.restore(); txt(s.slice(0, n), 960, 978, { size: 50, w: 800, fill: '#fff', align: 'center', sh: ['rgba(0,0,0,0.8)', 8, 0, 2] }); };
  const C = CLEAR[o.p1] || ['', ''];
  if (t < 14) { const i = t < 7 ? 1 : 2, u = t - (i - 1) * 7, a = Math.min(1, u / 0.6) * Math.min(1, (7 - u) / 0.5); img(o.p1 + '_' + i, a, 1 + u * 0.012); cap(C[i - 1], u - 0.8); if (t < 1.4) { const k = 1 - t / 1.4; txt('ENDING', 960, 540, { size: 160, w: 900, fam: F.en, fill: '#FFE066', stroke: INK, sw: 14, align: 'center', a: k, skew: -0.12 }); } }
  else if (t < 28) { img(o.p1 + '_2', 0.35, 1.18); g.save(); g.fillStyle = 'rgba(5,6,15,0.45)'; g.fillRect(0, 0, W, H); g.restore(); const y0 = 1120 - (t - 14) * 110;
    STAFF.forEach((s, i) => { const y = y0 + i * 70; if (y > -40 && y < H + 40) txt(s, 960, y, { size: i === 0 ? 64 : s && STAFF[i - 1] === '' ? 30 : 44, w: i === 0 ? 900 : 700, fill: i === 0 ? '#FFE066' : STAFF[i + 1] === '' || i === STAFF.length - 1 ? '#fff' : '#9FB4D8', align: 'center' }); }); }
  else { const k = tw(t, 28, 0.4, E.out5); img(o.p1 + '_1', 0.3, 1.1); g.save(); g.globalAlpha = k; g.fillStyle = 'rgba(5,6,20,0.7)'; g.fillRect(0, 0, W, H); g.restore();
    if (IM['x:cal_' + o.p1]) calImg('cal_' + o.p1, 960, 250, 150, '#FFFFFF', k, '#0A0606', 620); slam('ALL CLEAR', 960, 450, 150, t - 28, 0.2, { fam: F.en, fill: lg(0, -120, 0, 10, ['#FFFFFF', '#FFE066']), stroke: '#E8384F', sw: 14, stroke2: INK, sw2: 34, skew: -0.12 });
    const mm = Math.floor((o.time || 0) / 60), ss = Math.floor((o.time || 0) % 60);
    [['通关时间', mm + ' 分 ' + String(ss).padStart(2, '0') + ' 秒'], ['得分', String(o.score || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')], ['续关次数', String(o.cont || 0)], ['电脑难度', String(o.diff || 4)]].forEach(([a, b], i) => { const q = tw(t, 28.8 + i * 0.2, 0.3, E.out5); txt(a, 820, 600 + i * 72, { size: 40, w: 800, fill: '#9FB4D8', align: 'right', a: q }); txt(b, 860, 600 + i * 72, { size: 44, w: 900, fill: '#fff', a: q }); });
    txt('按 Enter 回到标题', 960, 1000, { size: 36, w: 800, fill: '#fff', align: 'center', a: k * (0.6 + 0.4 * Math.sin(t * 6)) }); }
  if (t < CLEAR_LEN - 2) txt('Enter 下一页', 1880, 1060, { size: 22, w: 600, fill: 'rgba(255,255,255,0.6)', align: 'right' });
}
// —— 第 79 圈：舞台选择（P5 拼贴卡片）——
function stgImgDraw(id, x, y, w, h, home) {      // 舞台底图按 cover 方式填满 (x,y,w,h)；精简版没有池塘底图时画一块夜色兜底
  const sid = id === 'auto' ? home : id, im = sid && IM['g:' + sid];
  if (im && im.width) { const k = Math.max(w / im.width, h / im.height), sw = w / k, sh = h / k; g.drawImage(im, (im.width - sw) / 2, Math.min(im.height - sh, (im.height - sh) * 0.35), sw, sh, x, y, w, h); }
  else { g.fillStyle = lg(0, y, 0, y + h, ['#24346E', '#0B1230', '#05070F']); g.fillRect(x, y, w, h); g.fillStyle = 'rgba(255,240,200,0.9)'; g.beginPath(); g.arc(x + w * 0.72, y + h * 0.28, h * 0.1, 0, 7); g.fill(); g.fillStyle = '#C0283A'; g.fillRect(x + w * 0.2, y + h * 0.45, w * 0.18, h * 0.05); g.fillRect(x + w * 0.23, y + h * 0.45, w * 0.025, h * 0.4); g.fillRect(x + w * 0.335, y + h * 0.45, w * 0.025, h * 0.4); }
}
function stgPath(x, y, w, h, sk) { g.beginPath(); g.moveTo(x + sk, y); g.lineTo(x + w + sk, y); g.lineTo(x + w - sk, y + h); g.lineTo(x - sk, y + h); g.closePath(); }      // 斜切的平行四边形
function drawStageSel(t, o) {
  const L = o.L, cur = L[o.i], home = HOME[o.p2] || 'office', u = t - (o.ti || 0), ink = '#E8203A';
  g.fillStyle = '#0B0710'; g.fillRect(0, 0, W, H); P5.panelBg(1300, 420, ink, ink, t);
  g.save(); g.fillStyle = ink; g.beginPath(); g.moveTo(0, 0); g.lineTo(760, 0); g.lineTo(640, 118); g.lineTo(0, 150); g.closePath(); g.fill(); g.restore();      // 左上红色撕纸标题块
  txt('选择舞台', 60, 104, { size: 84, w: 900, fill: '#fff', stroke: '#05030C', sw: 10, rot: -0.04, skew: -0.12 }); txt('SELECT STAGE', 790, 74, { size: 34, w: 900, fam: F.en, fill: '#fff', ls: 8, rot: -0.04 });
  const sl = E.out3(Math.min(1, u / 0.22)), px = 140 + (1 - sl) * 220, py = 190, pw = 1180, ph = 600;
  g.save(); g.translate(px, py); g.rotate(-0.025); g.fillStyle = '#05030C'; stgPath(-18, -18, pw + 36, ph + 36, 40); g.fill(); g.fillStyle = '#fff'; stgPath(-8, -8, pw + 16, ph + 16, 40); g.fill();
  stgPath(0, 0, pw, ph, 40); g.save(); g.clip(); g.globalAlpha = 0.4 + 0.6 * sl; stgImgDraw(cur.id, -40, 0, pw + 80, ph, home); g.restore(); g.restore();      // 大预览：黑白双框 + 斜切
  const no = String(o.i).padStart(2, '0'); txt('No.' + no, 120, 900, { size: 120, w: 900, fam: F.en, fill: ink, stroke: '#05030C', sw: 12, rot: -0.05, a: sl });
  txt(cur.id === 'auto' ? '主场（跟着对手走）' : STAGES[cur.id].name, 470, 880, { size: 62, w: 900, fill: '#fff', stroke: '#05030C', sw: 10, rot: -0.03, a: sl });
  if (cur.id === 'auto') txt('这一场：' + STAGES[home].name.split(' · ')[0] + '　每场换成对手的主场', 476, 940, { size: 30, w: 800, fill: '#FFD0D6', stroke: '#05030C', sw: 6, a: sl });
  const n = L.length, cw = 222, ch = 132, gap = 24, x0 = 1400, y0 = 190;      // 右侧竖排卡片
  for (let k = 0; k < n; k++) { const sel = k === o.i, cx = x0 + (k % 2) * (cw + gap) + (sel ? -14 : 0), cy = y0 + Math.floor(k / 2) * (ch + gap + 6) + (k % 2) * 34 - (sel ? 8 : 0), a = sel ? 1 : 0.62;
    g.save(); g.translate(cx, cy); g.rotate(sel ? -0.06 : (k % 3 - 1) * 0.02); g.globalAlpha = a; g.fillStyle = sel ? ink : '#05030C'; stgPath(-8, -8, cw + 16, ch + 16, 14); g.fill(); g.fillStyle = sel ? '#fff' : '#3A3346'; stgPath(-3, -3, cw + 6, ch + 6, 14); g.fill();
    stgPath(0, 0, cw, ch, 14); g.save(); g.clip(); stgImgDraw(L[k].id, -14, 0, cw + 28, ch, home); if (!sel) { g.fillStyle = 'rgba(5,3,12,0.35)'; g.fillRect(-14, 0, cw + 28, ch); } g.restore();
    txt(String(k).padStart(2, '0'), 6, 34, { size: 30, w: 900, fam: F.en, fill: sel ? ink : '#fff', stroke: '#05030C', sw: 6 }); txt(L[k].name, cw - 8, ch - 10, { size: 22, w: 900, fill: '#fff', stroke: '#05030C', sw: 5, align: 'right' }); g.restore(); }
  if (o.lock != null) { const q = Math.min(1, (t - o.lock) / 0.25); g.save(); g.globalAlpha = q * (t - o.lock < 0.5 ? 1 : Math.max(0, 1 - (t - o.lock - 0.5) * 3)); txt('决定！', 960, 560, { size: 200, w: 900, fill: '#fff', stroke: ink, sw: 18, stroke2: '#05030C', sw2: 34, align: 'center', rot: -0.08, sc: 1.4 - 0.4 * E.out3(q) }); g.restore(); }
  else txt('← → 选择　J / Enter 决定　' + Math.max(0, Math.ceil(6 - t)) + ' 秒后自动决定', 1880, 1050, { size: 28, w: 800, fill: 'rgba(255,255,255,0.85)', align: 'right' });
}
