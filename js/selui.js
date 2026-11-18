// ===== 第 67 圈：选人页 / 标题页动态化（用户第二批反馈：右侧和下方大片空白、太静态）=====
// 选人：左 1P 大立绘（呼吸 / 飘动、切换滑入 + 闪光、主题色流光粒子背景）；中间网格（人数多于 9 自动改 4 列）+ 招牌必杀 / 超必杀循环预览小窗（游戏内实际招式帧）；
// 右边信息面板：六维雷达图（切换时展开）+ 台词 + 招式名；1P 选定后右边换成对手立绘。标题：角色轮播 + 镜头推拉 + 标题扫光。
// 旧版在 scenes.js 的 drawTitle0 / drawSelect0（?oldsel=1 用旧版）。全部按时间 t 画，没有随机数（成片渲染要逐帧可复现）。
for (const id of ['surf', 'nin']) if (window.GUEST_META && GUEST_META.spr['f_' + id + '_stance'] && !ORDER.includes(id)) ORDER.push(id);      // 客串角色：有切好的图才进选人（Q 版帧在后台加载，见 guest_meta.js）
const RADAR_K = ['攻击', '速度', '射程', '防御', '操作难度', '梗度'];
const RADAR = { ds: [7, 6, 5, 6, 6, 10], gem: [7, 9, 4, 4, 7, 9], gpt: [6, 6, 8, 6, 5, 8], grok: [10, 3, 6, 8, 4, 8], kimi: [5, 6, 9, 5, 6, 7], glm: [6, 5, 8, 7, 8, 6], qwen: [6, 7, 7, 5, 8, 7], claude: [6, 6, 5, 8, 7, 8], dou: [5, 7, 5, 6, 4, 9], surf: [6, 8, 8, 5, 5, 9], nin: [7, 10, 6, 3, 8, 8] };
const SG = (a, b) => [a + 1, a + 2, a + 3, a + 4].map(x => 'sg' + x).concat(b ? [b + 1, b + 2, b + 3, b + 4].map(x => 'sg' + x) : []);
const CINEF = ['cA1', 'cA2', 'cA3', 'cA4', 'cB1', 'cB2', 'cB3', 'cB4', 'cB1', 'cB2', 'cC1', 'cC2', 'cC3', 'cC4'];
// 预览：[招式名, 指令, 帧序列, 每帧步数]；超必杀没有专属演出帧的人用最像的招牌表
const SELMV = {
  ds: { sp: ['鲸尾回旋（爆廻）', '↓↙← + 脚', SG(30, 40), 4], su: ['运营部加班通知', '↓↘→↓↘→ + 脚', CINEF, 5] },
  gem: { sp: ['三段爪', '↓↙← + 拳 ×3', SG(20, 30), 5], su: ['九连爪', '↓↘→↓↘→ + 脚', CINEF, 5] },
  gpt: { sp: ['首先、其次、最后', '↓↘→ + 拳 ×3', SG(10, 50), 5], su: ['作为一个AI语言模型', '↓↘→↓↘→ + 脚', SG(30, 40), 5] },
  grok: { sp: ['转圈投', '转一圈 + 拳', SG(10), 7], su: ['全网公开处刑', '↓↘→↓↘→ + 脚', SG(20, 40), 5] },
  claude: { sp: ['你说得完全正确（当身）', '→↘↓↙← + 拳', SG(10), 7], su: ['我们谈谈', '↓↙←↓↙← + 拳', SG(50, 60), 5] },
  kimi: { sp: ['月相闪现', '↓↙← + 拳', SG(20), 6], su: ['一口气读完', '↓↘→↓↘→ + 脚', SG(30, 10), 5] },
  glm: { sp: ['蓄力飞书', '← 蓄 → + 拳', SG(10), 7], su: ['满分答卷', '↓↘→↓↘→ + 脚', SG(20, 10), 5] },
  qwen: { sp: ['飞扇', '↓↘→ + 拳', SG(10), 6], su: ['全场包邮', '↓↙←↓↙← + 拳', SG(30, 40), 5] },
  dou: { sp: ['踢踢踢', '连按轻脚', SG(10), 4], su: ['全家福', '↓↘→↓↘→ + 脚', SG(20, 40), 5] },
  surf: { sp: ['热搜水炮', '↓↘→ + 拳', ['fb1', 'fb2', 'fb3', 'fb3', 'fb4'], 6], su: ['全网爆款', '↓↘→↓↘→ + 脚', CINEF, 5] },
  nin: { sp: ['验证码手里剑', '↓↘→ + 拳', ['fb1', 'fb2', 'fb3', 'fb3', 'fb4'], 5], su: ['强制下线', '↓↘→↓↘→ + 脚', CINEF, 5] },
};
const selCols = () => ORDER.length > 9 ? 4 : 3;
const SELG = () => { const n = selCols(), C = n === 4 ? 140 : 168, gap = 12, w = n * C + (n - 1) * gap; return { C, gap, x0: 960 - w / 2, y0: 172, n }; };
const selXY2 = id => { const L = SELG(), i = ORDER.indexOf(id), r = Math.floor(i / L.n), rowN = Math.min(L.n, ORDER.length - r * L.n), off = (L.n - rowN) * (L.C + L.gap) / 2, c = i % L.n; return [L.x0 + off + c * (L.C + L.gap), L.y0 + r * (L.C + L.gap)]; };
function selNav(c, k) {      // 方向键在网格里移动（最后一行不满时左右循环在本行内）
  const n = selCols(), N = ORDER.length, rows = Math.ceil(N / n), r = Math.floor(c / n), rowN = Math.min(n, N - r * n), i = c % n;
  if (k === 'KeyA' || k === 'ArrowLeft') return r * n + (i + rowN - 1) % rowN;
  if (k === 'KeyD' || k === 'ArrowRight') return r * n + (i + 1) % rowN;
  if (k === 'KeyW' || k === 'ArrowUp' || k === 'KeyS' || k === 'ArrowDown') { const r2 = (r + (k === 'KeyW' || k === 'ArrowUp' ? rows - 1 : 1)) % rows, x = selXY2(ORDER[c])[0]; let best = r2 * n, bd = 1e9;
    for (let j = r2 * n; j < Math.min(N, r2 * n + n); j++) { const dd = Math.abs(selXY2(ORDER[j])[0] - x); if (dd < bd) { bd = dd; best = j; } } return best; }
  return c;
}
const selFr = (id, skin, n) => { const a = 'fa_' + id + '_' + n, q = 'f_' + id + '_' + n; return skin === 'a' && META.spr[a] ? a : META.spr[q] ? q : null; };
// 背景：主题色渐变 + 斜向流光 + 上升光点 + 网点
function selBG(t, id, tMove) {
  const ch = CH[id] || CH.ds, k = tw(t - (tMove ?? -9), 0, 0.35, E.out3);
  g.fillStyle = lg(0, 0, W, H, [mixc('#0B1460', ch.ink, 0.55 * k + 0.2), '#060930', mixc('#060930', ch.ink, 0.5)]); g.fillRect(0, 0, W, H);
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) { const x = ((i * 397 + t * (90 + i * 23)) % 2900) - 500, wd = 40 + (i % 3) * 50; g.save(); g.translate(x, 0); g.transform(1, 0, -0.45, 1, 0, 0); g.fillStyle = lg(0, 0, 0, H, [rgba(ch.col, 0), rgba(i % 2 ? ch.col : ch.col2, 0.13), rgba(ch.col, 0)]); g.fillRect(0, 0, wd, H); g.restore(); }
  for (let i = 0; i < 46; i++) { const sx = hash(i * 3.1) * W, sp = 40 + hash(i * 7.7) * 110, y = H + 40 - ((t * sp + hash(i) * H * 1.3) % (H * 1.3)), x = sx + Math.sin(t * 1.3 + i) * 26, r = 2 + hash(i * 1.9) * 5, a = 0.25 + 0.5 * hash(i * 5.3);
    g.fillStyle = rgba(i % 3 ? ch.col2 : '#FFFFFF', a * (0.6 + 0.4 * Math.sin(t * 4 + i))); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  g.restore(); patFill(PAT.dots, 0.05, -t * 20, t * 12); vignette(0.55, 0.45);
  if (tMove != null && t - tMove >= 0 && t - tMove < 0.3) { const q = (t - tMove) / 0.3; g.save(); g.globalAlpha = 0.35 * (1 - q); speedLines(t, 330, 600, { n: 60, col: ch.col2, a: 0.8, r0: 300 }); g.restore(); }
}
// 大立绘：呼吸 + 飘动 + 切换滑入 + 闪光；L = 左边（1P）
function selArt(t, id, skin, L, tMove, tLock) {
  const ch = CH[id], d = L ? 1 : -1, cx = L ? 330 : 1590, age = t - (tMove ?? -9), lk = tLock != null && t >= tLock ? t - tLock : -1, k = tw(age, 0, 0.28, E.out5);
  const br = Math.sin(t * 2.3), hop = lk >= 0 ? -Math.abs(Math.sin(lk * 9)) * 26 * Math.max(0, 1 - lk / 1.2) : 0;
  g.save(); g.beginPath(); g.moveTo(L ? 0 : 1290, 150); g.lineTo(L ? 630 : W, 150); g.lineTo(L ? 590 : W, 1080); g.lineTo(L ? 0 : 1330, 1080); g.closePath(); g.clip();
  g.fillStyle = lg(0, 150, 0, 1080, [rgba(ch.col, 0.62), rgba(ch.ink, 0.92)]); g.fillRect(0, 0, W, H); patFill(PAT.stripe, 0.07, t * 30 * d, 0);
  g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const yy = 150 + ((t * 260 + i * 330) % 1100); g.fillStyle = lg(0, yy - 80, 0, yy + 80, [rgba(ch.col2, 0), rgba(ch.col2, 0.12), rgba(ch.col2, 0)]); g.fillRect(0, yy - 80, W, 160); } g.restore();
  txt(ch.en.toUpperCase(), cx + d * (1 - k) * 300, 420, { size: 150, w: 900, fam: F.en, fill: 'rgba(255,255,255,0.12)', align: 'center', rot: -0.12 * d });
  const an = skin === 'a' && META.spr['fa_' + id + '_stance'] ? (lk >= 0 && META.spr['fa_' + id + '_win'] ? 'fa_' + id + '_win' : 'fa_' + id + '_stance') : null;
  const ka = IM['l:' + id + '_' + (skin === 'a' ? 'a' : 'q')], x0 = cx - d * (1 - k) * 260;
  const drawIt = (alpha, white) => {
    if (ka && !(skin === 'a' && !an)) { const hh = (skin === 'a' ? 860 : 760) * (1 + 0.04 * (1 - k)), ww = hh * ka.width / ka.height, by = 1000 + hop * 0.6;
      g.save(); g.globalAlpha = alpha; g.translate(x0, by); if (!L) g.scale(-1, 1); g.transform(1, 0, Math.sin(t * 1.4) * 0.012, 1, 0, 0); g.scale(1 - br * 0.004, 1 + br * 0.011);
      if (white) { g.globalCompositeOperation = 'lighter'; g.filter = 'brightness(3) saturate(0)'; } g.drawImage(ka, -ww / 2, -hh, ww, hh); g.restore(); }
    else { const nm = an || ch.spr.intro || ch.spr.idle, hh = an ? 700 * (META_A.sprk[an] || 1) : sprH(id, nm, 640); spr(nm, x0, 870 + hop, hh * (1 + br * 0.01), { flip: !L, a: alpha, sy: 1 + br * 0.008, white: white ? 1 : 0 }); } };
  if (k < 1 && age >= 0) for (let i = 3; i >= 1; i--) { g.save(); g.translate(-d * i * 60 * (1 - k), 0); drawIt(0.18 * (1 - k) * (4 - i) / 3, false); g.restore(); }      // 滑入残影
  drawIt(Math.min(1, k * 2), false);
  if (age >= 0 && age < 0.22) drawIt(0.65 * (1 - age / 0.22), true);      // 入场闪白
  if (lk >= 0 && lk < 0.14) drawIt(0.75 * (1 - lk / 0.14), true);
  g.restore();
  if (skin === 'a' && !an && typeof ADL !== 'undefined' && ADL[id]) txt('成年版加载中 ' + ADL[id].done + ' / ' + ADL[id].n, cx, 600, { size: 34, w: 900, fill: '#fff', stroke: INK, sw: 8, align: 'center' });
  return { cx, d, lk, age };
}
function selPlate(t, id, L, tag, skin, lk, age) {
  const ch = CH[id], d = L ? 1 : -1, cx = L ? 330 : 1590, py = 884, k = tw(age, 0.05, 0.25, E.out5);
  g.save(); g.translate(-d * (1 - k) * 200, 0); g.globalAlpha = Math.min(1, k * 1.5);
  panelSkew(L ? 30 : 1330, py, 560, 86, 18 * d, ch.ink, '#fff', 5); txt(ch.name, cx - 240, py + 64, { size: 62, w: 900, fill: '#fff' }); txt(tag, cx + 240, py + 60, { size: 44, w: 900, fam: F.en, fill: L ? '#7FE3FF' : '#FF8A98', align: 'right' });
  txt(ch.model, cx - 240, py + 122, { size: 28, w: 800, fill: '#fff', sh: ['rgba(0,0,30,0.9)', 6, 0, 1] }); txt('· ' + ch.style, cx - 232 + mw(ch.model, 28, 800), py + 122, { size: 26, w: 700, fill: 'rgba(230,240,255,0.9)', sh: ['rgba(0,0,30,0.9)', 6, 0, 1] });
  g.restore();
  if (L && typeof hasAdult !== 'undefined' && hasAdult(id)) { const on = skin === 'a', pu = 0.5 + 0.5 * Math.sin(t * 6);      // 第 67 圈 C：Q / 成年两段开关 + Tab 键帽（用户反馈「成年形态没看到」）
    g.save(); rr(30, 164, 400, 64, 32); g.fillStyle = 'rgba(8,14,48,0.85)'; g.fill(); g.lineWidth = 4; g.strokeStyle = on ? '#FFB347' : rgba('#FFB347', 0.45 + 0.55 * pu); g.stroke();
    rr(on ? 152 : 36, 170, on ? 180 : 112, 52, 26); g.fillStyle = on ? '#FFB347' : '#7FE3FF'; g.fill(); g.restore();
    txt('Q 版', 92, 207, { size: 28, w: 900, fill: on ? 'rgba(255,255,255,0.55)' : INK, align: 'center' }); txt('成年版', 242, 207, { size: 30, w: 900, fill: on ? INK : 'rgba(255,255,255,0.8)', align: 'center' });
    g.save(); rr(352, 176, 66, 40, 9); g.fillStyle = '#fff'; g.fill(); g.restore(); txt('Tab', 385, 205, { size: 24, w: 900, fam: F.en, fill: INK, align: 'center' });
    if (!on) txt('按 Tab 看成年版', 240, 262, { size: 26, w: 900, fill: '#FFE066', stroke: INK, sw: 7, align: 'center', a: 0.55 + 0.45 * pu }); }
  if (lk >= 0) { g.save(); g.translate(cx + d * 170, 250); g.rotate(-0.14 * d); g.scale(pop(lk, 0, 0.2), pop(lk, 0, 0.2)); panelSkew(-110, -40, 220, 80, 10, '#FFE066', INK, 6); txt('已选定', 0, 20, { size: 50, w: 900, fill: INK, align: 'center' }); g.restore(); }
}
// 六维雷达图：切换时从中心展开，数值 1–10
function radar(t, id, cx, cy, R, tMove) {
  const ch = CH[id], v = RADAR[id] || ch.radar || [5, 5, 5, 5, 5, 5], k = tw(t - (tMove ?? -9), 0.05, 0.45, E.back), pt = (i, r) => [cx + Math.sin(i * Math.PI / 3) * r, cy - Math.cos(i * Math.PI / 3) * r];
  g.save(); for (let ring = 1; ring <= 5; ring++) { g.beginPath(); for (let i = 0; i < 6; i++) g.lineTo(...pt(i, R * ring / 5)); g.closePath(); g.fillStyle = ring % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)'; g.fill(); g.strokeStyle = 'rgba(200,215,255,0.25)'; g.lineWidth = ring === 5 ? 3 : 1.5; g.stroke(); }
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(...pt(i, R)); g.stroke(); }
  g.beginPath(); for (let i = 0; i < 6; i++) { const kk = clamp(k * 1.25 - i * 0.05, 0, 1.2); g.lineTo(...pt(i, R * v[i] / 10 * kk)); } g.closePath();
  g.fillStyle = rgba(ch.col, 0.55); g.fill(); g.lineWidth = 5; g.strokeStyle = ch.col2; g.stroke(); g.save(); g.globalCompositeOperation = 'lighter'; g.lineWidth = 12; g.strokeStyle = rgba(ch.col2, 0.15 + 0.1 * Math.sin(t * 5)); g.stroke(); g.restore();
  for (let i = 0; i < 6; i++) { const kk = clamp(k * 1.25 - i * 0.05, 0, 1.2), [x, y] = pt(i, R * v[i] / 10 * kk); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill();
    const [lx, ly] = pt(i, R + 46); txt(RADAR_K[i], lx, ly + 4, { size: 26, w: 800, fill: '#DCE6FF', align: 'center' }); txt(String(Math.round(v[i] * Math.min(1, k))), lx, ly + 36, { size: 28, w: 900, fam: F.en, fill: '#FFE066', align: 'center', a: Math.min(1, k) }); }
  g.restore();
}
// 招式预览小窗：循环播放招牌必杀 → 超必杀（游戏内实际招式帧）。第 67 圈 C 第二版：人物放大、右边站一个暗色「陪练」（宿敌的剪影）挨打后仰，
// 飞行道具招有发光弹（核心 + 拖尾 + 命中爆裂），超必杀时镜头推近、背景压暗；全部按时间 t 画，可逐帧复现。
function selPreview(t, id, skin, x, y, w, h, tMove) {
  const ch = CH[id], M = SELMV[id] || ch.selmv || { sp: [ch.sp.name, '↓↘→ + 拳', ['fb1', 'fb2', 'fb3', 'fb4'], 6], su: [ch.su.name, '↓↘→↓↘→ + 脚', ['heavy1', 'heavy2', 'heavy3', 'heavy4', 'upper1', 'upper2', 'upper3', 'upper4'], 5] };
  const u = Math.max(0, t - (tMove ?? 0)), seg = (fr) => fr[2].length * fr[3] / 60 + 0.9, Ls = seg(M.sp), Lu = seg(M.su), cyc = u % (Ls + Lu), isSu = cyc >= Ls, mv = isSu ? M.su : M.sp, lt = isSu ? cyc - Ls : cyc;
  const frs = mv[2].map(n => selFr(id, skin, n)).filter(Boolean), fpos = lt * 60 / mv[3], fi = Math.min(frs.length - 1, Math.floor(fpos)), done = fpos >= frs.length;
  const proj = !isSu && mv[2].includes('fb3'), pf = mv[2].indexOf('fb3'), hitEvery = !proj && fi >= Math.min(2, frs.length - 1) && !done;
  g.save(); rr(x, y, w, h, 18); g.fillStyle = INK; g.fill(); rr(x + 5, y + 5, w - 10, h - 10, 14); g.clip();
  g.fillStyle = lg(0, y, 0, y + h, isSu ? ['#120818', mixc('#120818', ch.col, 0.5)] : [mixc('#0A1240', ch.col, 0.35), '#0A0F30']); g.fillRect(x, y, w, h);
  if (isSu) { g.save(); g.globalAlpha = 0.55; speedLines(t, x + w * 0.45, y + h * 0.55, { n: 46, col: ch.col2, a: 0.5, r0: 120 }); g.restore(); }
  patFill(PAT.dots, 0.08, t * 30, 0, x, y, w, h);
  const rv = (typeof RIVAL !== 'undefined' && RIVAL[id]) || 'ds', fl = fpos % 1, struck = (hitEvery && fl < 0.5) || (proj && fpos >= pf + 1.2 && fpos < pf + 2.6) || (isSu && !done && fi >= 2), kb = struck ? (isSu ? 26 : 16) * (1 - (fl % 1)) : 0;
  const fy = y + h - 24, zk = isSu ? 1 + 0.12 * tw(lt, 0, 0.35, E.out3) : 1, cx = x + w * 0.42;
  const shk = struck && fl < 0.3 ? (isSu ? 7 : 4) * Math.sin(fl * 60) : 0; g.save(); g.translate(cx + shk, fy); g.scale(zk, zk); g.translate(-cx, -fy);
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x - 100, fy, w + 200, 3);
  for (let i = 0; i < 9; i++) { const gx = x + ((i * 90 - t * 160) % (w + 90) + w + 90) % (w + 90); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(gx, fy + 6, 40, 4); }
  const H0 = (skin === 'a' ? 0.98 : 0.9) * h, sx = x + w * 0.3 + Math.min(1, lt / 1.2) * w * 0.06, dxT = x + w * 0.8;
  // 陪练：宿敌的暗色剪影，挨打时后仰、换受击帧
  { const dn = struck && META.spr['f_' + rv + '_hurt'] ? 'f_' + rv + '_hurt' : 'f_' + rv + '_stance'; if (META.spr[dn]) { g.save(); g.filter = 'brightness(0.62) saturate(0.45)'; spr(dn, dxT + kb, fy, H0 * 0.9 * (SPRK[dn] ?? 1) * (CH[rv].h / 440), { flip: true, a: 0.92 }); g.restore();
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35; g.strokeStyle = ch.col2; g.lineWidth = 2; g.beginPath(); g.ellipse(dxT + kb, fy + 2, 60, 10, 0, 0, 7); g.stroke(); g.restore(); } }
  if (frs.length) { const nm = frs[fi], hh = H0 * (SPRK[nm] ?? (window.META_A && META_A.sprk[nm]) ?? 1) * (CH[id].h / 440);
    if (fi > 0) spr(frs[fi - 1], sx - 30, fy, hh, { a: 0.22 }); if (fi > 1) spr(frs[fi - 2], sx - 56, fy, hh, { a: 0.1 });
    if (isSu && fi >= 1) { g.save(); g.globalCompositeOperation = 'lighter'; glow(sx, fy - hh * 0.5, hh * 0.7, ch.col2, 0.25 + 0.1 * Math.sin(t * 20)); g.restore(); }
    spr(nm, sx, fy, hh, {});
    const hx = dxT - 30 + kb, hy = fy - H0 * 0.52;
    if (proj) {      // 飞行道具：发光核心 + 拖尾 + 命中爆裂
      const q = (fpos - pf) / 1.3; if (q >= 0 && q < 1) { const px = lerp(sx + hh * 0.35, hx, q), py = lerp(fy - hh * 0.55, hy, q); g.save(); g.globalCompositeOperation = 'lighter';
        for (let k = 6; k >= 1; k--) { g.fillStyle = rgba(ch.col, 0.12 * (7 - k) / 6); g.beginPath(); g.arc(px - k * 22, py, 26 - k * 2.5, 0, 7); g.fill(); }
        glow(px, py, 70, ch.col, 0.55); g.fillStyle = ch.col2; g.beginPath(); g.arc(px, py, 22, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py, 11, 0, 7); g.fill(); g.restore(); }
      const b = (fpos - pf - 1.3) / 1.0; if (b >= 0 && b < 1) { g.save(); g.globalCompositeOperation = 'lighter'; star4(hx, hy, 90 * (1 - b) + 20, b * 3, '#FFF6C8', 0.95 * (1 - b)); g.strokeStyle = rgba(ch.col2, 1 - b); g.lineWidth = 8 * (1 - b) + 1; g.beginPath(); g.arc(hx, hy, 20 + 120 * E.out3(b), 0, 7); g.stroke();
        for (let k = 0; k < 8; k++) { const an = k * 0.785 + 0.3, d = 30 + 110 * E.out3(b); g.fillStyle = rgba(k % 2 ? ch.col : '#fff', 1 - b); g.fillRect(hx + Math.cos(an) * d - 4, hy + Math.sin(an) * d - 4, 8, 8); } g.restore(); } }
    else if (struck && fl < 0.4) { const q = fl / 0.4; star4(hx, hy - (isSu ? (fi % 3) * 30 : 0), 80 * (1 - q) + 24, fi, '#FFF6C8', 0.95 * (1 - q)); g.save(); g.strokeStyle = rgba(ch.col2, 1 - q); g.lineWidth = 7; g.beginPath(); g.arc(hx, hy, 24 + 100 * q, 0, 7); g.stroke(); g.restore(); }
  }
  g.restore();
  if (isSu && lt < 0.25) { g.fillStyle = rgba('#FFFFFF', 0.6 * (1 - lt / 0.25)); g.fillRect(x, y, w, h); }
  if (isSu && !done && fi >= 2) { const n = fi - 1; txt(n + ' HIT', x + w - 24, y + h - 46, { size: 40, w: 900, fam: F.en, fill: '#FFE066', stroke: INK, sw: 8, align: 'right', a: 0.9 }); }
  g.restore();
  panelSkew(x + 14, y - 22, 190, 44, 8, isSu ? '#E8384F' : '#2E7BFF', '#fff', 3); txt(isSu ? '超必杀' : '招牌必杀', x + 109, y + 10, { size: 26, w: 900, fill: '#fff', align: 'center' });
  const nk = tw(lt, 0.1, 0.25, E.back); g.save(); g.translate(x + w - 20, y + 54); g.scale(nk, nk); txt(mv[0], 0, 0, { size: 38, w: 900, fill: '#FFE066', stroke: INK, sw: 9, align: 'right' }); g.restore();
  txt(mv[1], x + w - 20, y + 94, { size: 26, w: 800, fill: '#fff', stroke: INK, sw: 6, align: 'right', a: Math.min(1, lt * 4) });
  for (let i = 0; i < 2; i++) { const on = (i === 1) === isSu; g.fillStyle = on ? '#FFE066' : 'rgba(255,255,255,0.3)'; g.beginPath(); g.arc(x + w / 2 - 12 + i * 24, y + h - 14, on ? 6 : 4, 0, 7); g.fill(); }      // 两段循环的进度点
}
function selInfo(t, id, skin, tMove) {
  const ch = CH[id], x0 = 1310, k = tw(t - (tMove ?? -9), 0, 0.3, E.out5), V = RADAR[id] || [5, 5, 5, 5, 5, 5];
  g.save(); g.translate((1 - k) * 120, 0); g.globalAlpha = Math.min(1, k * 1.4);
  panelSkew(x0, 160, 590, 70, -14, rgba(ch.ink, 0.85), ch.col2, 4); txt(ch.name, x0 + 30, 214, { size: 52, w: 900, fill: '#fff' }); txt(ch.en, x0 + 40 + mw(ch.name, 52, 900), 212, { size: 30, w: 800, fam: F.en, fill: ch.col2 });
  txt(ch.style, x0 + 560, 210, { size: 28, w: 800, fill: '#FFE066', align: 'right' });
  const role = typeof ROLE !== 'undefined' && ROLE[id]; let rx = x0 + 10;
  if (role) { const ww = mw(role, 26, 900) + 36; rr(rx, 246, ww, 42, 21); g.fillStyle = rgba(ch.col, 0.85); g.fill(); txt(role, rx + ww / 2, 276, { size: 26, w: 900, fill: '#fff', align: 'center' }); rx += ww + 14; }
  if (ch.guest) { rr(rx, 246, 92, 42, 21); g.fillStyle = '#FF4FA0'; g.fill(); txt('客串', rx + 46, 276, { size: 26, w: 900, fill: '#fff', align: 'center' }); rx += 106; }
  const hs = typeof HOME !== 'undefined' && STAGES[HOME[id]]; if (hs) txt('主场 · ' + hs.name.split(' · ')[0], x0 + 588, 276, { size: 24, w: 800, fill: '#BFD4FF', align: 'right' });
  g.restore();
  radar(t, id, 1605, 508, 140, tMove);
  const qk = tw(t - (tMove ?? -9), 0.25, 0.3, E.out3); g.save(); g.globalAlpha = qk; rr(x0, 752, 590, 84, 22); g.fillStyle = 'rgba(8,14,48,0.82)'; g.fill(); g.strokeStyle = rgba(ch.col2, 0.8); g.lineWidth = 3; g.stroke();
  const q = '「' + ch.quote + '」', n = Math.floor(clamp((t - (tMove ?? -9) - 0.3) * 30, 0, q.length)); txt(q.slice(0, n), x0 + 26, 806, { size: q.length > 18 ? 27 : 31, w: 800, fill: '#fff' }); g.restore();
  // 招式卡：招牌必杀 / 一级 / 三级（指令 + 名字），逐行滑入
  const MV = SELMV[id], sun = (typeof SUN !== 'undefined' && SUN[id]) || {}, rows = [['必杀', '#2E7BFF', MV ? MV.sp[0] : ch.sp.name, MV ? MV.sp[1] : '↓↘→ + 拳'], ['一级', '#E8384F', sun[1] || ch.su.name, '↓↘→↓↘→ + 拳'], ['三级', '#B01E8A', MV ? MV.su[0] : ch.su.name, MV ? MV.su[1] : '↓↘→↓↘→ + 脚']];
  rows.forEach(([tag, col, nm, cmd], i) => { const rk = tw(t - (tMove ?? -9), 0.35 + i * 0.08, 0.25, E.out5), yy = 858 + i * 60; if (rk <= 0) return; g.save(); g.globalAlpha = rk; g.translate((1 - rk) * 80, 0);
    rr(x0, yy, 590, 50, 12); g.fillStyle = 'rgba(8,14,48,0.72)'; g.fill(); panelSkew(x0 + 8, yy + 7, 80, 36, 6, col, '#fff', 2); txt(tag, x0 + 48, yy + 34, { size: 22, w: 900, fill: '#fff', align: 'center' });
    const nm2 = nm.replace(/（.*?）/g, ''); txt(nm2, x0 + 104, yy + 35, { size: nm2.length > 9 ? 24 : 27, w: 900, fill: '#fff' }); txt(cmd, x0 + 578, yy + 34, { size: 22, w: 800, fill: '#FFE066', align: 'right' }); g.restore(); });
}
const SKS = {};
function drawSelect(t, o) {
  if (typeof QS !== 'undefined' && QS.get && QS.get('oldsel')) return drawSelect0(t, o);
  const L = SELG(), C = L.C;
  if (SKS.s1 !== o.skin1) { if (SKS.s1 !== undefined && t > 0.05) SKS.k1 = t; SKS.s1 = o.skin1; } if (SKS.s2 !== o.skin2) { if (SKS.s2 !== undefined && t > 0.05) SKS.k2 = t; SKS.s2 = o.skin2; }      // 成年版切换（Tab / R）：面板、立绘、预览一起重播入场
  if (SKS.k1 > t + 0.01) SKS.k1 = undefined; if (SKS.k2 > t + 0.01) SKS.k2 = undefined; if (o.t1 != null && SKS.k1 != null && o.t1 > SKS.k1) SKS.k1 = undefined;
  o = Object.assign({}, o, { t1: Math.max(o.t1 ?? -9, SKS.k1 ?? -9), t2: o.p2 ? Math.max(o.t2 ?? -9, SKS.k2 ?? -9) : o.t2 });
  selBG(t, o.p1, o.t1);
  const a1 = selArt(t, o.p1, o.skin1, true, o.t1, o.lock1); selPlate(t, o.p1, true, '1P', o.skin1, a1.lk, a1.age);
  if (o.p2) { const a2 = selArt(t, o.p2, o.skin2, false, o.t2, o.lock2); selPlate(t, o.p2, false, o.tag2 || 'CPU', o.skin2, a2.lk, a2.age); if (a2.lk < 0 && a2.age < 1.6) bubble(CH[o.p2].quote, 1590, 214, { size: 30, k: pop(a2.age, 0.05, 0.2), tail: 1, col: CH[o.p2].col }); }
  else selInfo(t, o.p1, o.skin1, o.t1);
  if (o.lock1 != null && t >= o.lock1 && t - o.lock1 < 0.5) { const q = (t - o.lock1) / 0.5; g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(CH[o.p1].col2, 1 - q); g.lineWidth = 30 * (1 - q); g.beginPath(); g.arc(330, 560, 60 + 520 * E.out3(q), 0, 7); g.stroke(); g.restore(); }      // 确认冲击环（第 67 圈 C：画在格子和面板后面，只在左半边）
  panelSkew(-30, 44, 760, 92, 20, '#E8384F', '#fff', 6); txt('选择你的猫娘', 60, 112, { size: 64, w: 900, fill: '#fff', ls: 6 });
  txt(o.stageNo ? '第 ' + o.stageNo + ' 关 · 对手登场' : 'CHARACTER SELECT', 1870, 108, { size: 40, w: 800, fam: o.stageNo ? F.cn : F.en, fill: '#BFD4FF', align: 'right', ls: 6 });
  for (const id of ORDER) { const [x, y] = selXY2(id), ch = CH[id], on1 = id === o.p1, on2 = id === o.p2;
    const b1 = on1 ? Math.max(0, 1 - (t - (o.t1 ?? -9)) / 0.16) : 0, b2 = on2 ? Math.max(0, 1 - (t - (o.t2 ?? -9)) / 0.16) : 0, sc = 1 + 0.12 * Math.max(b1, b2) + (on1 || on2 ? 0.04 + 0.015 * Math.sin(t * 6) : 0);
    g.save(); g.translate(x + C / 2, y + C / 2); g.scale(sc, sc); g.translate(-C / 2, -C / 2); g.fillStyle = INK; rr(-6, -6, C + 12, C + 12, 22); g.fill();
    g.save(); rr(0, 0, C, C, 18); g.clip(); g.fillStyle = lg(0, 0, 0, C, [ch.col2, ch.col]); g.fillRect(0, 0, C, C);
    if (EYE[id] && IM['b:' + id + '_base']) { const [ex, ey] = EYE[id]; bust(id + (on1 && o.lock1 != null && t >= o.lock1 || on2 && o.lock2 != null && t >= o.lock2 ? '_smug' : '_base'), ex, ey + 30, C / 2, C / 2 - 8, C / 500); }
    else { const sa = IM['l:' + id + '_q']; if (sa) { const hh = C * 2.3, ww = hh * sa.width / sa.height; g.drawImage(sa, C / 2 - ww / 2, -C * 0.12, ww, hh); } else { const nm = selFr(id, 'q', 'stance'); if (nm) spr(nm, C / 2, C * 2.1, C * 2.2); } }
    if (on1 || on2) { g.save(); g.globalCompositeOperation = 'lighter'; const sx = ((t * 1.6) % 2) * C * 1.8 - C * 0.4; g.translate(sx, 0); g.transform(1, 0, -0.5, 1, 0, 0); g.fillStyle = lg(0, 0, 40, 0, ['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']); g.fillRect(0, 0, 40, C); g.restore(); }      // 光标扫光
    g.fillStyle = lg(0, C - 54, 0, C, ['rgba(8,14,48,0)', 'rgba(8,14,48,0.92)']); g.fillRect(0, C - 54, C, 54); if (!on1 && !on2 && (o.lock1 != null || o.dim)) { g.fillStyle = 'rgba(8,14,48,0.32)'; g.fillRect(0, 0, C, C); } g.restore();
    txt(ch.name, C / 2, C - 12, { size: ch.name.length > 3 ? 24 : 28, w: 900, fill: '#fff', align: 'center' }); if (ch.guest) { panelSkew(C - 64, 6, 58, 26, 4, '#FF4FA0', '#fff', 2); txt('客串', C - 35, 26, { size: 18, w: 900, fill: '#fff', align: 'center' }); }
    g.lineWidth = on1 || on2 ? 8 : 3; g.strokeStyle = on1 && on2 ? '#FFE066' : on1 ? '#7FE3FF' : on2 ? '#FF5A6E' : 'rgba(255,255,255,0.85)'; rr(0, 0, C, C, 18); g.stroke();
    if (on1) { panelSkew(-12, -20, 76, 40, 6, '#7FE3FF', INK, 4); txt('1P', 26, 11, { size: 30, w: 900, fam: F.en, fill: INK, align: 'center' }); }
    if (on2) { panelSkew(C - 90, -20, 100, 40, 6, '#FF5A6E', INK, 4); txt(o.tag2 || 'CPU', C - 40, 11, { size: 28, w: 900, fam: F.en, fill: '#fff', align: 'center' }); }
    g.restore(); }
  const rows = Math.ceil(ORDER.length / L.n), py = L.y0 + rows * (C + L.gap) + 26; selPreview(t, o.p1, o.skin1, L.x0 - 8, py, 2 * (960 - L.x0 + 8), Math.min(1036 - py, 380), o.t1);
  if (o.play && o.lock1 == null) { g.save(); rr(400, 1036, 1120, 40, 14); g.fillStyle = 'rgba(6,10,40,0.78)'; g.fill(); g.restore(); } if (o.play && o.lock1 == null) txt('方向键选择 · J / Enter 确定 · Tab 成年版 · R 电脑也用成年版 · 战斗中 P 看出招表', 960, 1062, { size: 24, w: 800, fill: '#fff', stroke: 'rgba(8,14,48,0.85)', sw: 7, align: 'center' });
  if (o.lock1 != null && typeof P5 !== 'undefined' && !P5.OFF && t >= o.lock1 && t - o.lock1 < 0.95) { const u = t - o.lock1, kin = E.out5(Math.min(1, u / 0.14)), ko = Math.max(0, (u - 0.72) / 0.23), sl = kin * (1 - ko * ko), dx = (1 - kin) * -2200 + ko * ko * 2200;      // 第 75 圈：确认选人时 P5 式黑红斜带 + 剪报字「<名字>·参战！」
    g.save(); g.translate(dx, 0); g.beginPath(); g.moveTo(-200, 420); g.lineTo(W + 200, 330); g.lineTo(W + 200, 560); g.lineTo(-200, 650); g.closePath(); g.fillStyle = 'rgba(8,6,14,0.92)'; g.fill(); g.clip(); P5.halftone(400, 500, '#E8102E', 0.35, 22, 300, 680); g.restore();
    g.save(); g.translate(dx, 0); g.lineWidth = 10; g.strokeStyle = '#E8102E'; g.beginPath(); g.moveTo(-200, 408); g.lineTo(W + 200, 318); g.moveTo(-200, 662); g.lineTo(W + 200, 572); g.stroke(); g.lineWidth = 5; g.strokeStyle = '#FFFFFF'; g.beginPath(); g.moveTo(-200, 424); g.lineTo(W + 200, 334); g.moveTo(-200, 646); g.lineTo(W + 200, 556); g.stroke(); g.restore();
    const nm = CH[o.p1].name + '·参战！'; g.save(); g.translate(dx * 0.6, 0); g.rotate(-0.06); P5.tagWord(nm, 260, 530, [...nm].length > 7 ? 84 : 100, u - 0.08, rngOf(41), sl); g.restore(); }
  lyricLine(o.lyric, o.lyricA ?? 1);
}
// —— 标题：角色轮播（左右交替滑入、镜头推拉）+ 标题扫光 ——
function drawTitle(t, o = {}) {
  if (typeof QS !== 'undefined' && QS.get && QS.get('oldsel')) return drawTitle0(t, o);
  const N = ORDER.length, P = 2.8, i = Math.floor(t / P) % N, u = (t % P) / P, id = ORDER[i], nx = ORDER[(i + 1) % N], ch = CH[id];
  bgArcade(t, mixc('#1B2FB0', ch.ink, 0.35), '#070B36', { rays: 0.06, ry: 430, rayCol: ch.col2 });
  const zoom = 1.02 + 0.03 * Math.sin(t * 0.7);
  g.save(); g.translate(960, 540); g.scale(zoom, zoom); g.translate(-960, -540);
  const showArt = (cid, side, k, a) => { const im = IM['l:' + cid + '_q']; if (!im) return; const hh = 900 * (1 + 0.05 * k), ww = hh * im.width / im.height, x = side < 0 ? 330 : 1590, sx = x + side * (1 - E.out5(clamp(k * 4))) * 500 - side * k * 40;
    g.save(); g.globalAlpha = a; g.translate(sx, 1080); if (side > 0) g.scale(-1, 1); g.scale(1, 1 + Math.sin(t * 2.3) * 0.008); g.drawImage(im, -ww / 2, -hh, ww, hh); g.restore(); };
  const side = i % 2 ? 1 : -1, fade = u > 0.86 ? 1 - (u - 0.86) / 0.14 : 1;
  glow(side < 0 ? 330 : 1590, 640, 520, ch.col2, 0.22);
  showArt(id, side, u, fade); const j = (i + N - 1) % N; if (u < 0.2) showArt(ORDER[j], -side, 1 + u, 1 - u / 0.2);
  const k2 = clamp((u - 0.35) / 0.5); if (k2 > 0) { g.save(); g.globalAlpha = 0.5 * Math.sin(k2 * Math.PI); showArt(nx, -side, k2 * 0.3, 1); g.restore(); }
  g.restore();
  g.save(); g.globalAlpha = Math.min(1, u * 6) * fade; txt(ch.name, side < 0 ? 330 : 1590, 760, { size: 56, w: 900, fill: '#fff', stroke: ch.ink, sw: 10, align: 'center' }); txt(ch.style, side < 0 ? 330 : 1590, 806, { size: 28, w: 800, fill: '#FFE066', stroke: INK, sw: 6, align: 'center' }); g.restore();
  const ct = o.coinT ?? 1e9, c = t - ct; glow(960, 400, 560, '#FFE066', 0.16 + 0.05 * Math.sin(t * 3));
  slam('猫娘格斗', 960, 400, 250, t, 0.05, { fill: lg(0, -220, 0, 20, ['#FFFFFF', '#FFE066', '#FFB020']), stroke: '#E8384F', sw: 22, stroke2: INK, sw2: 54, skew: -0.12, ls: 12 });
  { const sx = ((t * 0.55) % 1.6) * 1800 - 300; g.save(); g.beginPath(); g.moveTo(500, 230); g.lineTo(1460, 230); g.lineTo(1400, 440); g.lineTo(440, 440); g.closePath(); g.clip(); g.globalCompositeOperation = 'lighter'; g.translate(sx, 0); g.transform(1, 0, -0.4, 1, 0, 0); g.fillStyle = lg(0, 0, 90, 0, ['rgba(255,255,255,0)', 'rgba(255,255,230,0.45)', 'rgba(255,255,255,0)']); g.fillRect(0, 200, 90, 260); g.restore();
    for (let s = 0; s < 4; s++) { const ph = (t * 0.8 + s * 0.25) % 1; star4(560 + s * 260 + Math.sin(t + s) * 40, 250 + (s % 2) * 170, 30 * Math.sin(ph * Math.PI), t * 2 + s, '#FFF6C8', 0.9); } }
  const k2b = pop(t, 0.28, 0.3); if (k2b > 0) { g.save(); g.translate(960, 545); g.scale(k2b, k2b); panelSkew(-420, -52, 840, 104, 22, '#E8384F', '#fff', 7); txt('最后一碗白米饭', 30, 30, { size: 78, w: 900, fill: '#fff', align: 'center', ls: 10 }); bowl(-378, 4, 0.92, { rot: -0.08 + Math.sin(t * 3) * 0.04 }); g.restore(); }
  txt('AI CATGIRL FIGHTERS', 960, 150, { size: 40, w: 800, fam: F.en, fill: '#BFD4FF', align: 'center', ls: 16, a: tw(t, 0.3, 0.3) });
  const sy = 866;      // 第 68 圈（用户反馈：中间那个空框像占位符）：去掉投币口方框，硬币直接落到 INSERT TOKEN 上
  { g.save(); const gr = g.createLinearGradient(0, 930, 0, 1080); gr.addColorStop(0, 'rgba(5,8,32,0)'); gr.addColorStop(0.35, 'rgba(5,8,32,0.72)'); gr.addColorStop(1, 'rgba(5,8,32,0.9)'); g.fillStyle = gr; g.fillRect(0, 930, 1920, 150); g.restore(); }      // 第 68 圈：底部几行字垫一条深色渐变，不再和立绘的脚、手叠在一起看不清
  if (c >= -0.45 && c < 0) { const k = (c + 0.45) / 0.45; for (let q = 3; q >= 1; q--) coin(960, lerp(-80, sy, E.in2(clamp(k - q * 0.035))), 54, t * 16, 0.18); coin(960, lerp(-80, sy, E.in2(k)), 54, t * 16); }
  if (c >= 0) { flashAt(c, 0, 0.22, '#FFF6C8', 0.75); const r = E.out3(clamp(c / 0.5)); g.save(); g.strokeStyle = rgba('#FFE066', 1 - r); g.lineWidth = 12 * (1 - r) + 1; g.beginPath(); g.arc(960, sy, 60 + 520 * r, 0, 7); g.stroke(); g.restore();
    for (let q = 0; q < 10; q++) { const an = q * 0.628 + 0.3, d = 80 + 420 * E.out3(clamp(c / 0.6)); star4(960 + Math.cos(an) * d, sy + Math.sin(an) * d * 0.6, 26 * (1 - clamp(c / 0.6)), c * 6 + q, '#FFE066'); }
    slam('TOKEN 来了！', 960, 886, 80, c, 0, { fill: '#FFE066', stroke: '#B81F3A', sw: 12, stroke2: INK, sw2: 28 }); txt('CREDIT 01', 960, 946, { size: 32, w: 800, fam: F.en, fill: '#fff', align: 'center', ls: 8, a: tw(c, 0.15, 0.2) });
  } else { const on = Math.sin(t * 9) > -0.3; if (window.ASSET_FAIL && ASSET_FAIL.length) txt('有 ' + ASSET_FAIL.length + ' 个图片包没加载上，请刷新页面重试', 960, 880, { size: 30, w: 800, fill: '#ffd34d', stroke: INK, sw: 8, align: 'center' }); txt('INSERT TOKEN', 960, 892, { size: 72, w: 900, fam: F.en, fill: on ? '#fff' : 'rgba(255,255,255,0.25)', stroke: INK, sw: 14, align: 'center', ls: 10 }); txt(o.play ? '按 Enter 投币开始' : '投币开始', 960, 946, { size: 32, w: 800, fill: '#BFD4FF', stroke: INK, sw: 6, align: 'center', ls: 6 }); }
  if (o.play) txt('J 轻拳 · K 轻脚 · U 重拳 · I 重脚 · J+K 投 · U+I 算力冲击 · L 架招 / 精防 · Y 挑衅 · Tab 出招表', 960, 990, { size: 24, w: 700, fill: 'rgba(235,242,255,0.95)', stroke: INK, sw: 5, align: 'center' });
  if (o.play) txt('懒人模式：O、H 加方向就能放必杀和超必杀 · 选人时按 Tab 换成年版', 960, 1028, { size: 26, w: 800, fill: '#FFE066', stroke: INK, sw: 5, align: 'center' });
  if (window.LITE) { txt('精简版 · 完整版（带全部音效 / 动态场地）：', 1900, 1036, { size: 18, w: 700, fill: 'rgba(230,240,255,0.75)', align: 'right' }); txt('deathknowing-boop.github.io/catgirl-fight', 1900, 1062, { size: 20, w: 800, fam: F.en, fill: '#9FF3FF', align: 'right' }); }      // 第 68 圈：claude.ai 网页版是精简版，提示完整版地址
  txt(NOTE, 960, 40, { size: 20, w: 600, fill: 'rgba(230,240,255,0.6)', align: 'center' });
}
