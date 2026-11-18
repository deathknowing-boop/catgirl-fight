// 第 68 圈：动态舞台（LOOP_BRIEF_5：场地动态化 + 背景里大量大肥鱼动态元素）。render.js 的 drawStageFx 开头调 STAGE2[s.stage](s, kick)
// 「大肥鱼星球」fishplanet：地平线后面趴着一只巨型 Q 版大肥鱼，表情随战况变（gfish_base / hype / worry / shock / cry / eat，GPT 出图，Mac art_stage/fishplanet/）；
// 星空里游过发光鲸鱼、流星、飘着饭粒；地平线上一排小大肥鱼观众跟着欢呼跳。纯画面，不碰对局逻辑（chk / 回放不受影响）
const GF = { cur: 'base', prev: null, t0: 0, mood: 'base', hold: 0, lastHp: null, jolt: 0, sid: null };
function gfMood(s) {      // 看谁的脸色：场上有大肥鱼就站在她那边，否则站 1P
  const fav = s.F.find(f => f.id === 'ds') || s.F[0], foe = s.F[1 - fav.idx], hpk = fav.hp / fav.hpMax, lead = hpk - foe.hp / foe.hpMax;
  if (s.phase === 'ko' || s.phase === 'win' || s.phase === 'over' || s.done) return fav.hp > 0 && foe.hp <= 0 ? 'hype' : fav.hp <= 0 ? 'cry' : 'base';
  if (s.cine || s.fz) return s.fz && s.fz.who === fav.idx || (s.cine && s.cine.a === fav) ? 'hype' : 'shock';
  if (s.exe) return 'shock';
  if (hpk < 0.3) return 'worry';
  if (lead > 0.3) return 'eat';
  if (foe.hp < foe.hpMax * 0.3) return 'hype';
  return 'base';
}
function gfImg(k) { return IM['x:gfish_' + k] || IM['x:gfish_base']; }
// 第 70 圈：座头鲸剪影（头朝 +x）。尾柄上下摆、胸鳍划水、腹褶线、外发光描边；在 lighter 混合下画成半透明发光体
function whaleSil(sz, t, i) { const w = Math.sin(t * 0.055 + i * 1.7), fl = Math.sin(t * 0.055 + i * 1.7 - 0.9), L = sz;
  const sy = w * L * 0.12, sx = -L * 2.05, ang = fl * 0.32;
  const ca = Math.cos(ang), sa = Math.sin(ang), P = (x, y) => [sx + x * ca - y * sa, sy + x * sa + y * ca], bz = (a, b, c) => { const A = P(...a), B = P(...b), C = P(...c); g.bezierCurveTo(A[0], A[1], B[0], B[1], C[0], C[1]); };
  const body = () => { g.beginPath(); g.moveTo(L * 1.75, L * 0.04); g.bezierCurveTo(L * 1.72, -L * 0.4, L * 0.9, -L * 0.6, L * 0.1, -L * 0.53); g.bezierCurveTo(-L * 0.8, -L * 0.45, -L * 1.5, -L * 0.18 + sy * 0.5, sx, -L * 0.07 + sy);      // 背：头顶 → 背 → 尾柄
    bz([-L * 0.25, -L * 0.12], [-L * 0.6, -L * 0.42], [-L * 0.85, -L * 0.48]); bz([-L * 0.72, -L * 0.3], [-L * 0.62, -L * 0.1], [-L * 0.5, 0]); bz([-L * 0.62, L * 0.1], [-L * 0.72, L * 0.3], [-L * 0.85, L * 0.48]); bz([-L * 0.6, L * 0.42], [-L * 0.25, L * 0.12], [0, L * 0.07]);      // 尾鳍两叶（绕尾柄上下摆）
    g.bezierCurveTo(-L * 1.3, L * 0.3 + sy * 0.4, -L * 0.2, L * 0.55, L * 0.7, L * 0.48); g.bezierCurveTo(L * 1.3, L * 0.42, L * 1.74, L * 0.3, L * 1.75, L * 0.04); g.closePath(); };      // 腹 → 下颌
  g.fillStyle = rg(L * 0.3, 0, 0, L * 2.6, ['rgba(140,215,255,0.30)', 'rgba(90,170,255,0.18)', 'rgba(60,120,255,0.06)']); body(); g.fill();
  g.save(); g.shadowColor = 'rgba(150,225,255,0.9)'; g.shadowBlur = L * 0.25; g.strokeStyle = 'rgba(200,240,255,0.6)'; g.lineWidth = 2; body(); g.stroke(); g.restore();
  g.strokeStyle = 'rgba(190,235,255,0.22)'; g.lineWidth = 1.5; for (let k = 0; k < 4; k++) { const yy = L * (0.18 + k * 0.07); g.beginPath(); g.moveTo(L * 1.45 - k * L * 0.06, yy); g.quadraticCurveTo(L * 0.7, yy + L * 0.08, -L * 0.2, yy + L * 0.02 - k * L * 0.02); g.stroke(); }      // 腹褶
  const fa = 0.5 + 0.35 * Math.sin(t * 0.055 + i * 1.7 + 1.2); g.save(); g.translate(L * 0.55, L * 0.32); g.rotate(fa); g.fillStyle = 'rgba(150,220,255,0.28)'; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-L * 0.2, L * 0.25, -L * 0.75, L * 0.5, -L * 1.0, L * 0.42); g.bezierCurveTo(-L * 0.7, L * 0.3, -L * 0.3, L * 0.08, L * 0.12, -L * 0.04); g.closePath(); g.fill(); g.strokeStyle = 'rgba(200,240,255,0.45)'; g.lineWidth = 1.5; g.stroke(); g.restore();      // 胸鳍（长，座头鲸特征）
  star4(L * 1.3, -L * 0.12, 5, 0, '#E8FBFF', 0.9);      // 眼睛的亮点
  for (let k = 0; k < 5; k++) { const q = ((t * 0.012 + k / 5 + i * 0.3) % 1); g.fillStyle = 'rgba(200,240,255,' + (0.5 * (1 - q)) + ')'; g.beginPath(); g.arc(L * 1.2 - q * L * 0.4, -L * 0.6 - q * L * 1.4, 2 + 3 * (1 - q), 0, 7); g.fill(); } }      // 头顶冒的小气泡
const STAGE2 = {
  fishplanet(s, kick) {
    if (GF.sid !== s) { GF.sid = s; GF.cur = 'base'; GF.prev = null; GF.lastHp = null; GF.jolt = 0; }
    const t = s.f, camx = s.cam ? s.cam.x : 0, px = camx * 0.55, hor = 760;      // 视差：巨人在很远的地方，镜头动一半
    g.save(); g.translate(px, 0);
    // 星空：闪星 + 流星 + 发光鲸鱼（远景层，视差更大）
    for (let i = 0; i < 40; i++) { const x = (hash(i * 3.7) * 2600 - 250), y = hash(i * 9.1) * 600, a = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.02 + hash(i) * 0.05) + i)); star4(x, y, 3 + 5 * hash(i * 1.3), 0, '#FFFFFF', a * 0.8); }
    { const k = (t % 420) / 420; if (k < 0.12) { const q = k / 0.12, x0 = 1700 - q * 900, y0 = 60 + q * 260; g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = lg(x0, y0, x0 + 260, y0 - 90, ['rgba(255,255,255,0.9)', 'rgba(150,200,255,0)']); g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + 260, y0 - 90); g.stroke(); g.restore(); } }
    for (let i = 0; i < 3; i++) { const sp = 0.35 + i * 0.12, dir = i % 2 ? -1 : 1, span = 2900, x = ((t * sp + i * 977) % span) - 400, xx = dir > 0 ? x : 2100 - x, y = 230 + i * 105 + Math.sin(t * 0.02 + i) * 25, sz = 78 - i * 16;
      g.save(); g.globalCompositeOperation = 'lighter'; g.translate(xx, y); g.scale(dir, 1); whaleSil(sz, t, i); g.restore(); }      // 发光鲸鱼游过（第 70 圈：扁椭圆换成程序画的座头鲸剪影）
    // 巨型大肥鱼：表情交叉淡入，呼吸 + 上下浮 + 被重击时一抖
    const m = gfMood(s); if (m !== GF.cur && t >= GF.hold) { GF.prev = GF.cur; GF.cur = m; GF.t0 = t; GF.hold = t + 40; }
    const fav = s.F.find(f => f.id === 'ds') || s.F[0]; if (GF.lastHp != null && fav.hp < GF.lastHp - 60) GF.jolt = 1; GF.lastHp = fav.hp; GF.jolt *= 0.9;
    const k = Math.min(1, (t - GF.t0) / 10), W = 770, bob = Math.sin(t * 0.03) * 10, br = 1 + Math.sin(t * 0.05) * 0.012, jx = GF.jolt * Math.sin(t * 1.3) * 14;
    const draw = (key, a) => { const im = gfImg(key); if (!im || a <= 0) return; const h = W * im.height / im.width; g.save(); g.globalAlpha = a; g.translate(1050 + jx, hor + 10 + bob); g.scale(br, br); g.drawImage(im, -W / 2, -h, W, h); g.restore(); };
    const fl = Math.max(0, 1 - (t - GF.t0) / 24) * 0.14; g.save(); g.filter = `brightness(${0.5 + fl}) saturate(0.6) contrast(0.85) blur(1.2px)`; if (GF.prev && k < 1) draw(GF.prev, 1 - k); draw(GF.cur, GF.prev ? k : 1); g.restore();      // 协调者：背景比角色暗、灰、冷；换表情时短暂提亮
    g.save(); g.fillStyle = lg(0, hor - 700, 0, hor + 20, ['rgba(40,40,110,0.18)', 'rgba(60,56,140,0.38)']); g.fillRect(1050 - 470, hor - 700, 940, 720); g.restore();      // 一层夜色薄雾，巨人退到远处、不抢前景人物
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = lg(0, hor - 120, 0, hor + 40, ['rgba(80,160,255,0)', 'rgba(80,160,255,0.28)']); g.fillRect(-200, hor - 120, 2500, 160); g.restore();      // 地平线辉光盖住巨人的下沿
    g.restore();
    { g.save(); g.fillStyle = lg(0, hor - 60, 0, hor + 110, ['rgba(70,70,150,0)', 'rgba(70,70,150,0.42)', 'rgba(40,46,100,0)']); g.fillRect(-300, hor - 60, 2700, 170); g.restore(); }      // 地面和远景之间一层雾带
    // 地平线上的小大肥鱼观众（用游戏里的 Q 版帧缩小），打中 / 超必杀时跳起来欢呼；视差 0.25
    const cheer = s.hitstop > 0 || !!s.fz || GF.cur === 'hype', crowd = ['win', 'stance', 'jab3', 'win', 'stance'];
    g.save(); g.translate(camx * 0.25, 0);
    for (let i = 0; i < 9; i++) { const nm = 'f_ds_' + crowd[i % crowd.length], n = META.spr[nm] ? nm : 'f_ds_stance'; if (!META.spr[n] || !IM['s:' + n]) continue;
      const x = 120 + i * 230 + (i % 2) * 40, hop = cheer ? Math.abs(Math.sin(t * 0.25 + i)) * 26 : Math.abs(Math.sin(t * 0.04 + i * 1.7)) * 4, h = 78 + (i % 3) * 8;
      spr(n, x, hor + 18 - hop, h, { flip: i % 2 === 1, a: 0.92, env: { col: '#24306E', a: 0.35, bot: 0 } }); }
    g.restore();
    // 飘着的饭粒（近景，正常视差）
    for (let i = 0; i < 16; i++) { const x = (hash(i * 5.5) * 2100 + t * (0.3 + hash(i) * 0.5)) % 2100, y = 120 + ((hash(i * 2.2) * 620 - t * (0.15 + hash(i * 7) * 0.2)) % 640 + 640) % 640, r = 4 + hash(i * 3) * 4;
      g.save(); g.translate(x, y); g.rotate(t * 0.02 + i); g.fillStyle = 'rgba(255,255,245,0.85)'; g.beginPath(); g.ellipse(0, 0, r, r * 0.55, 0, 0, 7); g.fill(); g.restore(); }
  },
};
// ===== 第 71 圈：办公室 / 会议室 / 天台动态化（全部程序绘制 + 现有素材，没有生图）=====
// STAGE2B[stage](s)：画在场地图之后、压暗 / 去饱和之前（跟场地一起被调色）：窗外远景视差（场地图同一块区域放大 + 随镜头少量平移，边缘渐隐）、窗外发光鲸鱼、光束、白板。
// STAGE2[stage](s, kick)：压暗之后、人之前：灯火摇曳、场边 Q 版观众（不上场的角色，打中 / 超必杀 / K.O. 时跳起来）、热气、城市灯。
// STAGE2F[stage](s, FL)：人之后：近景虚化光斑 / 花瓣（视差更大），拉出纵深。?par=0 关掉视差和近景层。纯画面，不碰对局逻辑
let PAR_OFF = /[?&]par=0/.test(typeof location !== 'undefined' ? location.search : '');      // 第 76 圈：改成 let，帧率低时 play.js 的 perfWatch 会把它打开
const PW = {}, ST3 = { sid: null, hp: [0, 0], tally: [0, 0], hype: 0, hypeWho: -1, lastF: 0 };
function st3Track(s) {      // 每局记两边各被打中几下（白板计数）+ 观众兴奋度
  if (ST3.sid !== s) { ST3.sid = s; ST3.hp = s.F.map(f => f.hp); ST3.tally = [0, 0]; ST3.hype = 0; ST3.hypeWho = -1; ST3.lastF = s.f; }
  if (s.f === ST3.lastF && s.f) return; ST3.lastF = s.f;
  s.F.forEach((f, i) => { if (f.hp < ST3.hp[i] - 25) { ST3.tally[1 - i]++; ST3.hype = Math.max(ST3.hype, f.hp < ST3.hp[i] - 120 ? 1 : 0.7); ST3.hypeWho = 1 - i; } ST3.hp[i] = f.hp; });
  if (s.fz || s.cine || s.phase === 'ko') ST3.hype = 1; ST3.hype *= 0.985;
}
function parWin(s, key, box, k, sc, mask) {      // 窗外远景视差：box = 世界坐标 [x, y, w, h]；k = 视差比例（镜头动 1，远景少动 k）；mask(ctx, w, h) 画一次 alpha 遮罩
  if (PAR_OFF || typeof document === 'undefined') return; const im = IM['g:' + s.stage]; if (!im) return; const [bx, by, bw, bh] = box;
  let P = PW[key]; if (!P) { const mk = () => { const c = document.createElement('canvas'); c.width = bw; c.height = bh; return c; }; P = PW[key] = { c: mk(), m: mk() }; mask(P.m.getContext('2d'), bw, bh); }
  const c = P.c.getContext('2d'), camx = s.cam ? s.cam.x : 90, sh = (camx - 90) * k, cx = bw / 2, cy = bh / 2;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, bw, bh);
  c.save(); c.translate(cx + sh, cy + Math.sin(s.f * 0.01) * 3); c.scale(sc, sc); c.drawImage(im, -(bx + cx), -(by + cy)); c.restore();
  c.globalCompositeOperation = 'destination-in'; c.drawImage(P.m, 0, 0); c.globalCompositeOperation = 'source-over';
  g.drawImage(P.c, bx, by);
}
function maskCircle(cx, cy, r, yCut, fe, holes) {      // 圆窗遮罩（盒子坐标）：圆内不透明，靠边 fe 像素渐隐；yCut 以下渐隐；holes：[[x,y,rx,ry]] 挖掉（前景物）
  return (c, w, h) => { c.fillStyle = (() => { const gr = c.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, '#000'); gr.addColorStop(Math.max(0, 1 - fe / r), '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)'); return gr; })(); c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'destination-in'; const gv = c.createLinearGradient(0, yCut - fe, 0, yCut); gv.addColorStop(0, '#000'); gv.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gv; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'destination-out'; for (const [x, y, rx, ry] of holes || []) { const gh = c.createRadialGradient(x, y, 0, x, y, rx); gh.addColorStop(0, '#000'); gh.addColorStop(0.6, '#000'); gh.addColorStop(1, 'rgba(0,0,0,0)'); c.save(); c.translate(x, y); c.scale(1, ry / rx); c.translate(-x, -y); c.fillStyle = gh; c.fillRect(x - rx, y - rx, rx * 2, rx * 2); c.restore(); }
    c.globalCompositeOperation = 'source-over'; };
}
function maskRect(fx, fy) {      // 矩形遮罩：左右 fx、上下 fy 像素渐隐
  return (c, w, h) => { const gx = c.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(fx / w, '#000'); gx.addColorStop(1 - fx / w, '#000'); gx.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gx; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'destination-in'; const gy = c.createLinearGradient(0, 0, 0, h); gy.addColorStop(0, fy[0] ? 'rgba(0,0,0,0)' : '#000'); gy.addColorStop(Math.max(0.001, fy[0] / h), '#000'); gy.addColorStop(1 - fy[1] / h, '#000'); gy.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gy; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'source-over'; };
}
function godRays(t, cx, cy, r, n, a0) {      // 水下光束：几条斜光柱缓慢摆动
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.clip(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { const x0 = cx - r * 0.7 + i * r * 1.4 / (n - 1) + Math.sin(t * 0.008 + i * 1.9) * 40, w0 = 30 + hash(i * 3.3) * 50, a = a0 * (0.5 + 0.5 * Math.sin(t * 0.013 + i * 2.1));
    g.fillStyle = lg(0, cy - r, 0, cy + r * 0.6, ['rgba(190,235,255,' + a.toFixed(3) + ')', 'rgba(150,210,255,0)']); g.beginPath(); g.moveTo(x0 - w0 * 0.3, cy - r); g.lineTo(x0 + w0 * 0.3, cy - r); g.lineTo(x0 + w0 * 1.6 + 90, cy + r * 0.6); g.lineTo(x0 + 90 - w0 * 0.2, cy + r * 0.6); g.closePath(); g.fill(); }
  g.restore();
}
function lampFlick(t, L, col) {      // 灯火摇曳：L = [[x, y, r]]，加色小光晕，亮度两种频率叠加
  g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < L.length; i++) { const [x, y, r] = L[i], fl = 0.55 + 0.25 * Math.sin(t * 0.11 + i * 2.3) + 0.2 * Math.sin(t * 0.37 + i * 5.1) * (hash(Math.floor(t / 9) + i * 13) > 0.8 ? 1 : 0.3);
    g.fillStyle = rg(x, y, 0, r, [rgba(col, 0.32 * fl), rgba(col, 0.1 * fl), rgba(col, 0)]); g.fillRect(x - r, y - r, r * 2, r * 2); } g.restore();
}
function steamAt(t, x, y, n, H, a0) { for (let i = 0; i < n; i++) { const k = ((t * 0.01 + i / n + hash(x) * 0.3) % 1); g.save(); g.globalAlpha = Math.sin(k * Math.PI) * a0; g.strokeStyle = '#FFFFFF'; g.lineWidth = 5 - k * 3; g.lineCap = 'round'; const xx = x + (i - (n - 1) / 2) * 10;
  g.beginPath(); g.moveTo(xx, y - k * H); g.quadraticCurveTo(xx + Math.sin(t * 0.07 + i) * 14, y - k * H - H * 0.25, xx, y - k * H - H * 0.5); g.stroke(); g.restore(); } }
function petal(r, col) { g.fillStyle = col; g.beginPath(); g.moveTo(-r, 0); g.quadraticCurveTo(-r * 0.2, -r * 0.75, r * 0.85, -r * 0.28); g.lineTo(r * 0.55, 0); g.lineTo(r * 0.85, r * 0.28); g.quadraticCurveTo(-r * 0.2, r * 0.75, -r, 0); g.closePath(); g.fill(); }      // 樱花瓣：尖头 + 尾端小缺口
const CROWD_ALL = ['ds', 'gem', 'gpt', 'claude', 'kimi', 'qwen', 'dou', 'glm', 'grok'];
function crowd(s, spots, env, seed, clipY) {      // 场边 Q 版观众：不上场的角色（缺了就从头补），待机轻晃、偶尔换 win 姿势；打中 / 超必杀时跳，K.O. 全体欢呼
  const on = s.F.map(f => f.id), L = CROWD_ALL.filter(i => !on.includes(i)); if (!L.length) return; const t = s.f, H = ST3.hype, mid = (s.F[0].x + s.F[1].x) / 2, ko = s.phase === 'ko' || s.done;
  spots.forEach((p, i) => { const id = L[(i + seed) % L.length], cheerOne = ko || (H > 0.3 && hash(i * 7 + Math.floor(t / 20)) < H), pose = cheerOne || hash(i * 3 + Math.floor(t / 150)) > 0.82 ? 'win' : 'stance', n = 'f_' + id + '_' + pose, nm = META.spr[n] && IM['s:' + n] ? n : 'f_' + id + '_stance'; if (!META.spr[nm] || !IM['s:' + nm]) return;
    const hop = cheerOne ? Math.abs(Math.sin(t * 0.22 + i * 1.3)) * p[2] * 0.22 : Math.abs(Math.sin(t * 0.035 + i * 1.7)) * p[2] * 0.02, sq = 1 + (cheerOne ? 0 : Math.sin(t * 0.06 + i) * 0.012);
    g.save(); if (clipY) { g.beginPath(); g.rect(p[0] - p[2], p[1] - p[2] * 1.6, p[2] * 2, clipY - (p[1] - p[2] * 1.6)); g.clip(); }      // clipY：这条线以下被前景挡住（桌沿）
    g.fillStyle = 'rgba(0,0,10,0.35)'; g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.26 * (1 - hop / p[2]), p[2] * 0.05, 0, 0, 7); g.fill();
    spr(nm, p[0], p[1] - hop, p[2], { flip: p[0] > mid, sy: sq, env }); g.restore();
    if (cheerOne && H > 0.6 && hash(i * 11 + Math.floor(t / 40)) > 0.6) { const em = ['！', '好！', '饭！', '哇'][Math.floor(hash(i + Math.floor(t / 40)) * 4)]; txt(em, p[0], p[1] - hop - p[2] * 1.05, { size: Math.round(p[2] * 0.22), w: 900, fill: '#FFF4C0', stroke: '#2A1A40', sw: 5, align: 'center', a: 0.9 }); } });
}
function bokeh(s, list, k) {      // 近景虚化光斑：视差 k（> 1，比人动得多），list = [[x, y, r, 色, a]]
  if (PAR_OFF) return; const camx = s.cam ? s.cam.x : 90, sh = -(camx - 90) * (k - 1), t = s.f; g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < list.length; i++) { const [x, y, r, col, a] = list[i], xx = x + sh + Math.sin(t * 0.01 + i) * 6, aa = a * (0.8 + 0.2 * Math.sin(t * 0.03 + i * 2)); g.fillStyle = rg(xx, y, r * 0.6, r, [rgba(col, aa), rgba(col, aa * 0.6), rgba(col, 0)]); g.beginPath(); g.arc(xx, y, r, 0, 7); g.fill(); }
  g.restore();
}
const STAGE2B = {
  office(s) { const t = s.f; st3Track(s);
    parWin(s, 'office', [500, 0, 840, 420], 0.32, 1.12, maskCircle(418, 95, 400, 405, 46, [[670, 400, 70, 50]]));      // 圆窗：圆心 (918, 95)、半径约 400，下沿栏杆 408 处收掉；右下角提灯挖掉
    godRays(t, 918, 95, 398, 5, 0.07);      // 窗里本来就画着鲸鱼，不再叠程序鲸鱼
  },
  meeting(s) { const t = s.f; st3Track(s);
    parWin(s, 'meeting', [1215, 0, 730, 560], 0.32, 1.12, maskCircle(363, 236, 352, 530, 44, [[563, 520, 80, 80], [-40, 500, 70, 70]]));      // 圆窗：圆心 (1578, 236)；右下盆栽挖掉
    godRays(t, 1578, 236, 350, 4, 0.07);
    // 白板：早会议题 + 实时「正」字计数（两边各打中几下）
    const n1 = s.F[0].ch.name, n2 = s.F[1].ch.name, ink = 'rgba(40,52,110,0.82)', red = 'rgba(190,40,60,0.85)';
    txt('早会议题：谁吃了最后一碗白米饭', 250, 290, { size: 34, w: 800, fill: ink }); g.save(); g.strokeStyle = red; g.lineWidth = 4; g.beginPath(); g.moveTo(250, 303); g.quadraticCurveTo(500, 311, 760, 301); g.stroke(); g.restore();
    const zh = (x, y, n) => { g.save(); g.strokeStyle = ink; g.lineWidth = 4; g.lineCap = 'round'; for (let k = 0; k < Math.min(n, 50); k++) { const gx = x + Math.floor(k / 5) * 44, gy = y, st = k % 5, S = [[[0, 0], [30, 0]], [[15, 0], [15, 36]], [[15, 18], [28, 18]], [[4, 14], [4, 36]], [[-2, 36], [32, 36]]][st]; g.beginPath(); g.moveTo(gx + S[0][0], gy + S[0][1]); g.lineTo(gx + S[1][0], gy + S[1][1]); g.stroke(); } g.restore(); };
    txt(n1, 260, 362, { size: 30, w: 800, fill: ink }); zh(400, 334, ST3.tally[0]); txt(n2, 260, 432, { size: 30, w: 800, fill: ink }); zh(400, 404, ST3.tally[1]);
    { const k = ((t % 900) / 900); g.save(); g.translate(560, 490); g.strokeStyle = ink; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.ellipse(0, 0, 50, 26, 0, 0, Math.min(1, k * 3) * 6.29); g.stroke(); if (k > 0.33) { g.beginPath(); g.moveTo(48, 0); g.lineTo(78, -20); g.lineTo(78, 20); g.closePath(); g.stroke(); g.beginPath(); g.arc(-26, -6, 4, 0, 7); g.stroke(); } if (k > 0.5) txt('← 摸鱼中', 96, 10, { size: 24, w: 700, fill: red }); g.restore(); }      // 白板角落一条慢慢画出来的鱼
    const lead = ST3.tally[0] === ST3.tally[1] ? -1 : ST3.tally[0] > ST3.tally[1] ? 0 : 1; if (lead >= 0) { g.save(); g.strokeStyle = red; g.lineWidth = 4; g.beginPath(); g.ellipse(310, lead ? 422 : 352, 74, 30, -0.05, 0, 7); g.stroke(); g.restore(); }      // 领先的一方画红圈
  },
  rooftop(s) { const t = s.f; st3Track(s);
    parWin(s, 'roof', [590, 0, 660, 600], 0.4, 1.1, maskRect(70, [0, 120]));      // 天空 + 远处城市（储罐和机房楼之间）整体随镜头少动
    { const camx = s.cam ? s.cam.x : 90, sh = (camx - 90) * 0.4; g.save(); g.beginPath(); g.rect(600, 0, 640, 560); g.clip(); g.translate(sh, 0); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { const ox = 700 + i * 220, an = -1.35 + Math.sin(t * 0.006 + i * 2.2) * 0.45, L = 900; g.save(); g.translate(ox, 600); g.rotate(an); g.fillStyle = lg(0, 0, L, 0, ['rgba(190,170,255,0.10)', 'rgba(190,170,255,0)']); g.beginPath(); g.moveTo(0, -14); g.lineTo(L, -120); g.lineTo(L, 120); g.lineTo(0, 14); g.closePath(); g.fill(); g.restore(); }      // 城里的探照灯扫天
      { const per = 1700, k = ((t + 500) % per) / per; if (k < 0.6) { const q = k / 0.6, x = 560 + q * 760, y = 300 + Math.sin(q * 6) * 14; g.globalAlpha = Math.min(1, Math.sin(q * Math.PI) * 2) * 0.8; g.translate(x, y); whaleSil(64, t, 2); } }      // 发光鲸鱼慢慢游过夜空
      g.restore(); }
  },
};
Object.assign(STAGE2, {
  office(s, kick) { const t = s.f;
    lampFlick(t, [[68, 62, 70], [428, 246, 80], [322, 495, 70], [522, 505, 60], [1170, 450, 80], [1555, 160, 90], [1883, 735, 90], [48, 930, 100]], '#FFB45A');
    crowd(s, [[640, 540, 112], [790, 538, 108], [1080, 540, 112], [255, 700, 128], [1440, 585, 118]], { col: '#1A2458', a: 0.5, bot: 0.2 }, 0);      // 窗前台阶三个、沙发上一个、转椅上一个
  },
  meeting(s, kick) { const t = s.f;
    lampFlick(t, [[120, 330, 80], [970, 260, 80], [1110, 320, 80], [1858, 300, 80], [1110, 615, 60]], '#FFB45A');
    for (const [x, y] of [[678, 812], [1317, 812], [2040, 834], [1755, 790]]) steamAt(t, x, y, 3, 110, 0.38);      // 米饭 / 咖啡冒热气
    crowd(s, [[222, 808, 160], [700, 806, 156], [1278, 808, 160], [1772, 806, 156]], { col: '#3A2416', a: 0.45, bot: 0.2 }, 2, 790);
  },
  rooftop(s, kick) { const t = s.f;
    g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 46; i++) { const x = 620 + hash(i * 3.3) * 620, y = 600 + hash(i * 5.1) * 210, on = Math.sin(t * (0.02 + hash(i) * 0.05) + i * 4) > 0.2; if (!on) continue; g.fillStyle = ['rgba(255,220,160,0.7)', 'rgba(160,200,255,0.7)', 'rgba(255,140,220,0.6)'][i % 3]; g.fillRect(x, y, 3, 3); } g.restore();      // 城市灯火闪
    { const fl = hash(Math.floor(t / 5)) > 0.93 ? 0.25 : 1; g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg(1334, 208, 20, 170, ['rgba(80,170,255,' + (0.22 * fl) + ')', 'rgba(80,170,255,0)']); g.fillRect(1160, 30, 350, 350); g.restore(); }      // 霓虹大脑招牌偶尔闪一下
    { const a = 0.18 + 0.05 * Math.sin(t * 0.02); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg(788, 142, 140, 330, ['rgba(220,225,255,' + a + ')', 'rgba(220,225,255,0)']); g.fillRect(450, 0, 680, 480); g.restore(); }      // 月晕呼吸
    for (let i = 0; i < 4; i++) { const k = ((t * 0.006 + i / 4) % 1); g.save(); g.globalAlpha = Math.sin(k * Math.PI) * 0.35; g.fillStyle = '#E8E4F4'; g.beginPath(); g.arc(350 + Math.sin(t * 0.02 + i) * 20 + k * 60, 60 - k * 160, 26 + k * 50, 0, 7); g.fill(); g.restore(); }      // 饭桶顶上冒蒸汽
    crowd(s, [[300, 636, 92], [430, 636, 88], [545, 636, 92]], { col: '#2A1E60', a: 0.5, bot: 0.2 }, 4);      // 饭桶平台上三个
    for (let i = 0; i < 22; i++) { const sp = 0.6 + hash(i * 2.7) * 0.8, x = ((hash(i * 5.3) * 2300 - t * sp * 0.9) % 2300 + 2300) % 2300 - 100, y = ((hash(i * 8.1) * 1000 + t * sp * 0.55) % 1000), r = 5 + hash(i) * 4;      // 樱花瓣被风吹过
      g.save(); g.translate(x + Math.sin(t * 0.04 + i) * 20, y); g.rotate(t * 0.05 * (i % 2 ? 1 : -1) + i); g.scale(1, 0.55 + 0.45 * Math.sin(t * 0.07 + i * 2)); petal(r, i % 3 ? 'rgba(255,170,215,0.85)' : 'rgba(255,215,235,0.85)'); g.restore(); }
  },
});
const STAGE2F = {
  office(s, FL) { bokeh(s, [[90, 1010, 120, '#FFB45A', 0.10], [1980, 980, 140, '#FFB45A', 0.08], [1700, 1060, 90, '#7FC8FF', 0.08], [420, 1070, 70, '#7FC8FF', 0.07]], 1.35); },
  meeting(s, FL) { bokeh(s, [[120, 1040, 130, '#FFB45A', 0.10], [1050, 1075, 100, '#FFC880', 0.07], [2000, 1030, 140, '#FFB45A', 0.09]], 1.35); },
  rooftop(s, FL) { if (PAR_OFF) return; const t = s.f, camx = s.cam ? s.cam.x : 90, sh = -(camx - 90) * 0.4;
    for (let i = 0; i < 5; i++) { const sp = 1.4 + hash(i * 4.4) * 0.8, x = ((hash(i * 6.1) * 2400 - t * sp * 2) % 2400 + 2400) % 2400 - 150 + sh, y = ((hash(i * 9.7) * 1100 + t * sp * 1.1) % 1100) - 20, r = 11 + hash(i * 2) * 6;      // 近景大花瓣（快，略虚）
      g.save(); g.translate(x, y); g.rotate(t * 0.04 + i); g.scale(1, 0.55 + 0.45 * Math.sin(t * 0.09 + i * 2)); petal(r, 'rgba(255,160,205,0.8)'); g.restore(); }
    bokeh(s, [[1960, 1040, 130, '#B48CFF', 0.10], [140, 1050, 110, '#FF8CC8', 0.08]], 1.35); },
};
// ===== 第 77 圈：新舞台「雨夜湖畔」waterside（参考作品夜色水边场景的思路，自己的设计）=====
// 有生图底图（IM['g:waterside']，完整版）就画底图 + 动态层；没有（精简版 / 底图没进包）就用 WS.base 程序画整张底图。
// 动态层：远处巨型大肥鱼剪影（坐在湖心雾里，按战况换姿势）、云里的发光鲸鱼、石灯笼火苗摇曳、漂浮纸灯、湖面月光倒影闪动、雾带漂移、雨丝、地面雨点涟漪、人物在湿地面上的倒影光。
const WS = { c: {}, FLOOR: 930, HOR: 640 };
function wsCan(k, w, h, fn) { if (WS.c[k]) return WS.c[k]; if (typeof document === 'undefined') return null; const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return WS.c[k] = c; }      // 离屏缓存：fn 的第一个参数也叫 g，遮住全局画布（渐变用全局 lg / rg 建，跨画布可用）
function wsMount(g, w, h, base, amp, seed, col, col2) { g.fillStyle = lg(0, base - amp, 0, h, [col, col2]); g.beginPath(); g.moveTo(0, h); let y = base; for (let x = 0; x <= w; x += 20) { const n = Math.sin(x * 0.004 + seed) * 0.5 + Math.sin(x * 0.011 + seed * 2.3) * 0.3 + Math.sin(x * 0.031 + seed * 5.1) * 0.12; y = base - amp * (0.5 + n); g.lineTo(x, y); } g.lineTo(w, h); g.closePath(); g.fill(); }
function wsLantern(g, x, y, s, lit) {      // 石灯笼：底座 → 柱 → 火袋（发光窗）→ 笠（翘角）→ 宝珠
  g.save(); g.translate(x, y); g.scale(s, s); const st = '#2C3448', st2 = '#3E4862';
  g.fillStyle = st; g.fillRect(-34, -14, 68, 14); g.fillStyle = st2; g.fillRect(-14, -96, 28, 84); g.fillStyle = st; g.fillRect(-30, -112, 60, 18);
  g.fillStyle = st2; g.fillRect(-26, -170, 52, 58); g.fillStyle = lit ? '#FFC46A' : '#3A3020'; g.fillRect(-15, -160, 30, 38); g.fillStyle = 'rgba(40,30,20,0.8)'; g.fillRect(-1.5, -160, 3, 38);
  g.fillStyle = st; g.beginPath(); g.moveTo(-52, -168); g.quadraticCurveTo(-30, -178, -18, -200); g.lineTo(18, -200); g.quadraticCurveTo(30, -178, 52, -168); g.lineTo(46, -164); g.lineTo(-46, -164); g.closePath(); g.fill();
  g.beginPath(); g.arc(0, -208, 10, 0, 7); g.fill(); g.restore(); }
function wsTorii(g, x, y, s, col) { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = col;
  g.fillRect(-120, -300, 22, 300); g.fillRect(98, -300, 22, 300); g.fillRect(-140, -250, 280, 18);
  g.beginPath(); g.moveTo(-190, -300); g.quadraticCurveTo(0, -284, 190, -300); g.lineTo(196, -326); g.quadraticCurveTo(0, -306, -196, -326); g.closePath(); g.fill(); g.fillRect(-12, -300, 24, 52); g.restore(); }
const WSP = {
  sky: () => wsCan('sky', 2100, 1080, (g, w, h) => {      // 天空 + 月亮 + 云（远景，视差 0.15）
    g.fillStyle = lg(0, 0, 0, WS.HOR, ['#070B24', '#0F1A44', '#1C3266', '#2A4A7E']); g.fillRect(0, 0, w, h);
    g.fillStyle = rg(1560, 330, 0, 560, ['rgba(170,200,255,0.35)', 'rgba(120,150,230,0.12)', 'rgba(80,100,200,0)']); g.fillRect(0, 0, w, h);
    g.fillStyle = '#E8F0FF'; g.beginPath(); g.arc(1560, 330, 70, 0, 7); g.fill(); g.fillStyle = 'rgba(180,200,240,0.35)'; for (const [dx, dy, r] of [[-18, -10, 14], [16, 14, 10], [8, -24, 7], [-6, 22, 6]]) { g.beginPath(); g.arc(1560 + dx, 330 + dy, r, 0, 7); g.fill(); }
    for (let i = 0; i < 70; i++) { const x = hash(i * 4.1) * w, y = hash(i * 7.3) * 420; g.fillStyle = 'rgba(255,255,255,' + (0.2 + hash(i) * 0.5) + ')'; g.fillRect(x, y, 2, 2); }
    for (let i = 0; i < 26; i++) { const x = hash(i * 3.9) * w, y = 120 + hash(i * 5.7) * 300, rw = 160 + hash(i * 2.1) * 260; g.fillStyle = 'rgba(40,56,110,' + (0.25 + hash(i * 9) * 0.3) + ')'; g.beginPath(); g.ellipse(x, y, rw, rw * 0.16, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(150,175,235,0.10)'; g.beginPath(); g.ellipse(x, y - rw * 0.05, rw * 0.8, rw * 0.06, 0, 0, 7); g.fill(); } }),
  far: () => wsCan('far', 2100, 1080, (g, w, h) => { wsMount(g, w, WS.HOR + 4, WS.HOR - 60, 170, 1.3, '#22305E', '#2C3E70'); wsMount(g, w, WS.HOR + 4, WS.HOR - 10, 110, 4.1, '#18224A', '#22305A');
    g.fillStyle = 'rgba(255,190,120,0.55)'; for (let i = 0; i < 26; i++) { const x = 200 + hash(i * 6.6) * 1700; g.fillRect(x, WS.HOR - 14 - hash(i * 2.2) * 30, 3, 3); } }),
  lake: () => wsCan('lake', 2100, 1080, (g, w, h) => {      // 湖面（地平线到码头前沿）+ 鸟居 + 倒影
    const y0 = WS.HOR, y1 = 830; g.fillStyle = lg(0, y0, 0, y1, ['#2A4272', '#16244C', '#0C1636']); g.fillRect(0, y0, w, y1 - y0);
    g.save(); g.globalAlpha = 0.35; g.translate(0, 2 * y0); g.scale(1, -1); g.drawImage(WSP.far(), 0, 0); g.restore();
    for (let i = 0; i < 160; i++) { const y = y0 + Math.pow(hash(i * 1.7), 1.6) * (y1 - y0), x = hash(i * 8.3) * w, L = 20 + (y - y0) * 0.5 * hash(i * 2.9); g.fillStyle = 'rgba(170,200,255,' + (0.05 + hash(i * 4) * 0.08) + ')'; g.fillRect(x, y, L, 1.5); }
    wsTorii(g, 760, y0 + 70, 0.75, '#B0283A'); g.save(); g.globalAlpha = 0.3; g.translate(0, 2 * (y0 + 70)); g.scale(1, -1); wsTorii(g, 760, y0 + 70, 0.75, '#5A1820'); g.restore(); }),
  pier: () => wsCan('pier', 2100, 1080, (g, w, h) => {      // 石板码头（人站的地面）：透视石缝 + 湿面反光 + 两排石灯笼
    const y0 = 820, F = WS.FLOOR; g.fillStyle = lg(0, y0, 0, h, ['#1E2640', '#262F4C', '#141A30']); g.fillRect(0, y0, w, h - y0);
    g.fillStyle = '#3A4766'; g.fillRect(0, y0, w, 6); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y0 + 6, w, 10);
    g.strokeStyle = 'rgba(8,10,24,0.55)'; g.lineWidth = 2; for (let r = 0; r < 7; r++) { const y = y0 + 16 + Math.pow(r / 6, 1.5) * (h - y0 - 16); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let i = -14; i <= 14; i++) { g.beginPath(); g.moveTo(1050 + i * 70, y0 + 16); g.lineTo(1050 + i * 260, h); g.stroke(); }
    for (let i = 0; i < 40; i++) { const x = hash(i * 3.3) * w, y = y0 + 30 + hash(i * 5.5) * (h - y0 - 30); g.fillStyle = 'rgba(140,170,230,' + (0.04 + hash(i) * 0.06) + ')'; g.beginPath(); g.ellipse(x, y, 60 + hash(i * 2) * 120, 6 + hash(i * 6) * 8, 0, 0, 7); g.fill(); }      // 积水
    for (const [x, sc] of WS.LANT) wsLantern(g, x, y0 + 4, sc, true); }),
  base(s) { const camx = s.cam ? s.cam.x : 90, k = PAR_OFF ? 0 : 1;
    const sk = WSP.sky(), fa = WSP.far(), la = WSP.lake(), pi = WSP.pier(); if (!sk) return;
    g.drawImage(sk, (camx - 90) * 0.85 * k * 0.3, 0); g.drawImage(fa, (camx - 90) * 0.6 * k * 0.3, 0); g.drawImage(la, (camx - 90) * 0.3 * k * 0.3, 0); g.drawImage(pi, 0, 0); },
};
WS.LANT = [[120, 0.9], [470, 0.62], [1630, 0.62], [1980, 0.9]];
WS.LANTI = [[109, 490, 170], [1988, 490, 170], [383, 570, 110], [1714, 570, 110], [533, 625, 80], [1564, 625, 80], [1712, 375, 60]];      // 生图底图里灯笼窗的位置（2100×1080 裁切后）
const WS_SIL = {};
function wsSil(name, col) { const key = name + col; if (WS_SIL[key]) return WS_SIL[key]; const im = IM['s:' + name]; if (!im || typeof document === 'undefined') return null; const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return WS_SIL[key] = c; }
STAGE2B.waterside = function (s) {      // 底图之后、调色之前：远处巨型大肥鱼剪影 + 云里的鲸鱼 + 湖面月光柱（有生图底图时这些图里已经有了，跳过）
  const t = s.f, camx = s.cam ? s.cam.x : 90, k = PAR_OFF ? 0 : 1; if (IM['g:waterside']) { if (typeof THEATER !== 'undefined') THEATER.back(s); return; }
  { const ds = s.F.find(f => f.id === 'ds') || s.F[0], hurt = ds.st === 'hit' || ds.st === 'launch' || ds.st === 'down', win = s.phase === 'ko' || s.done, nm = win ? 'f_ds_win' : hurt ? 'f_ds_hit1' : 'f_ds_stance', n = META.spr[nm] && IM['s:' + nm] ? nm : 'f_ds_stance', m = META.spr[n];
    const sil = m && wsSil(n, '#26386E'), rim = m && wsSil(n, '#8FC0FF');
    if (sil) { const H = 640, sc = H / m.h, w = m.w * sc, pad = m.pad * sc, bob = Math.sin(t * 0.02) * 8, x = 1240 + (camx - 90) * 0.5 * k * 0.3, y = WS.HOR + 40 + bob;
      g.save(); g.globalAlpha = 0.9; g.translate(x, y); g.scale(-1, 1); g.drawImage(rim, -w / 2 - pad - 3, -H - pad - 3, w + 2 * pad, H + 2 * pad); g.globalAlpha = 0.85; g.drawImage(sil, -w / 2 - pad, -H - pad, w + 2 * pad, H + 2 * pad); g.restore();      // 剪影 + 一圈冷色描边光
      g.save(); g.globalAlpha = 0.22; g.translate(x, 2 * y - 40); g.scale(-1, -0.6); g.drawImage(sil, -w / 2 - pad, -H - pad, w + 2 * pad, H + 2 * pad); g.restore();      // 湖面倒影
      g.save(); g.globalCompositeOperation = 'lighter'; const ey = y - H * 0.62; for (const dx of [-0.07, 0.05]) { g.fillStyle = rg(x + dx * w * 2.2, ey, 0, 18, ['rgba(180,230,255,0.9)', 'rgba(120,190,255,0)']); g.fillRect(x + dx * w * 2.2 - 18, ey - 18, 36, 36); } g.restore(); } }      // 眼睛两点微光
  g.save(); g.globalCompositeOperation = 'lighter'; { const per = 1500, q = ((t + 300) % per) / per; if (q < 0.7) { const u = q / 0.7; g.globalAlpha = Math.min(1, Math.sin(u * Math.PI) * 1.8) * 0.85; g.translate(-150 + u * 2400 + (camx - 90) * 0.25 * k, 250 + Math.sin(u * 5) * 30); whaleSil(90, t, 1); } } g.restore();      // 发光鲸鱼在云里游过
  g.save(); g.globalCompositeOperation = 'lighter'; const mx = 1560 + (camx - 90) * 0.85 * k * 0.3; for (let i = 0; i < 18; i++) { const y = WS.HOR + 8 + i * 10, wv = (34 + i * 7) * (0.7 + 0.3 * Math.sin(t * 0.07 + i * 1.3)); g.fillStyle = 'rgba(210,225,255,' + (0.22 - i * 0.01).toFixed(3) + ')'; g.fillRect(mx - wv / 2 + Math.sin(t * 0.05 + i * 2.1) * 10, y, wv, 3); } g.restore();      // 月光倒影闪动
};
STAGE2.waterside = function (s, kick) {      // 调色之后、人之前：灯火、漂浮纸灯、雾带、地面涟漪
  const t = s.f, IMG = !!IM['g:waterside'], y0 = IMG ? 860 : 824; if (IMG) lampFlick(t, WS.LANTI, '#FFB45A'); else lampFlick(t, WS.LANT.map(([x, sc]) => [x, y0 - 140 * sc, 150 * sc]), '#FFB45A');
  if (typeof THEATER !== 'undefined') THEATER.mid(s);
  if (!IMG) { g.save(); g.globalCompositeOperation = 'lighter'; for (const [x, sc] of WS.LANT) { g.fillStyle = lg(0, y0, 0, y0 + 220 * sc, ['rgba(255,180,90,0.22)', 'rgba(255,180,90,0)']); g.fillRect(x - 16 * sc, y0, 32 * sc, 220 * sc); } g.restore(); }      // 灯笼在湿石板上的竖条倒影（底图里自带）
  for (let i = 0; i < 7; i++) { const sp = 0.12 + hash(i * 3.1) * 0.12, x = ((hash(i * 7.7) * 2300 + t * sp) % 2300) - 100, y = 330 + hash(i * 5.3) * 260 - ((t * 0.05 + i * 80) % 120), r = 9 + hash(i) * 6;      // 漂浮纸灯（慢慢往上飘）
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg(x, y, 0, r * 4, ['rgba(255,170,80,0.35)', 'rgba(255,170,80,0)']); g.fillRect(x - r * 4, y - r * 4, r * 8, r * 8); g.restore(); g.fillStyle = '#FFC878'; g.fillRect(x - r * 0.6, y - r, r * 1.2, r * 1.6); g.fillStyle = 'rgba(120,40,20,0.8)'; g.fillRect(x - r * 0.7, y - r * 1.1, r * 1.4, 2); g.fillRect(x - r * 0.7, y + r * 0.6, r * 1.4, 2); }
  if (!PAR_OFF) for (let i = 0; i < 4; i++) { const x = ((t * (0.25 + i * 0.08) + i * 600) % 2800) - 500, y = WS.HOR + 20 + i * 40; g.fillStyle = rg(x, y, 0, 420, ['rgba(150,170,220,0.16)', 'rgba(150,170,220,0)']); g.save(); g.translate(x, y); g.scale(1, 0.18); g.beginPath(); g.arc(0, 0, 420, 0, 7); g.fill(); g.restore(); }      // 湖面雾带
  g.save(); g.strokeStyle = 'rgba(190,210,255,0.35)'; g.lineWidth = 1.5; for (let i = 0; i < 16; i++) { const per = 40 + Math.floor(hash(i * 2.3) * 30), q = ((t + i * 17) % per) / per, n = Math.floor((t + i * 17) / per), x = hash(i * 9.1 + n * 1.3) * 2100, y = y0 + 20 + hash(i * 4.4 + n * 2.7) * 230; g.globalAlpha = 1 - q; g.beginPath(); g.ellipse(x, y, 4 + q * 34, (4 + q * 34) * 0.22, 0, 0, 7); g.stroke(); } g.restore();      // 雨点涟漪
  for (const f of s.F) { if (f.st === 'held') continue; const a = Math.max(0, 0.2 - f.y / 2000); if (a <= 0) continue; g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = lg(0, WS.FLOOR, 0, WS.FLOOR + 150, ['rgba(140,170,255,' + a + ')', 'rgba(140,170,255,0)']); g.beginPath(); g.ellipse(f.x, WS.FLOOR + 50, 90, 90, 0, 0, 7); g.fill(); g.restore(); }      // 人脚下湿地面的反光
};
STAGE2F.waterside = function (s, FL) {      // 人之后：雨丝（两层，近的快且粗）+ 近景雾
  const t = s.f, camx = s.cam ? s.cam.x : 90; g.save(); g.lineCap = 'round';
  for (const [n, sp, len, wd, a, par] of [[70, 26, 46, 1.4, 0.22, 1.0], [26, 40, 90, 2.4, 0.18, PAR_OFF ? 1 : 1.3]]) { g.strokeStyle = 'rgba(200,220,255,' + a + ')'; g.lineWidth = wd; g.beginPath(); const sh = -(camx - 90) * (par - 1);
    for (let i = 0; i < n; i++) { const x = ((hash(i * 3.7 + sp) * 2400 - t * sp * 0.22) % 2400 + 2400) % 2400 - 150 + sh, y = ((hash(i * 6.1 + sp) * 1200 + t * sp) % 1200) - 100; g.moveTo(x, y); g.lineTo(x - len * 0.22, y + len); } g.stroke(); }
  g.restore();
  if (!PAR_OFF) bokeh(s, [[100, 1030, 140, '#FFB45A', 0.08], [2000, 1010, 150, '#7FA8FF', 0.09]], 1.35);
};
// ===== 第 77 圈：背景梗小剧场 THEATER（用户 16:47 / 16:48：背景里大量会动的大肥鱼梗）=====
// 图：assets/th/<名>_<格>.webp（GPT 出的绿幕整张 → gtools/th_cut.py 抠底切格）。只进完整版：打包版没有 th 懒加载包时整段不画；?theater=0 关。
// 画法：每格先压暗降饱和缓存一次（不抢前景），程序做循环动画（换格、上下浮、挤压、水花 / 烟 / 爱心 / 星星粒子、字幕牌），随战况反应（重击时「！」跳一下，K.O. 全体欢呼）。
const TH = { lz: 0, dk: {} }, TH_N = { th_pond_fish: 4, th_incense: 2, th_slack: 1, th_claude_pet: 2, th_gpt_kid: 2, th_claude_beat: 2, th_ds_gun: 2, th_ds_dance: 3, th_grok_tea: 2, th_gem_play: 3, th_glm_flip: 2, th_kimi_scroll: 2, th_qwen_agents: 3 };      // 有图的才列（缺图会报 IMG FAIL）
const TH_OFF = typeof location !== 'undefined' && /[?&]theater=0/.test(location.search);
function thLoad() { if (TH.lz || TH_OFF || typeof document === 'undefined') return; TH.lz = 1; if (window.LAZY_PACKS && !LAZY_PACKS.th) return;
  const L = []; for (const n in TH_N) for (let i = 0; i < TH_N[n]; i++) L.push(['t:' + n + '_' + i, 'assets/th/' + n + '_' + i + '.webp']); if (typeof LAZY !== 'undefined') { LAZY.th = () => L; loadLazy('th'); } }
function thIm(n, dim) { const im = IM['t:' + n]; if (!im) return null; const k = n + '|' + dim; if (TH.dk[k]) return TH.dk[k]; const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.filter = 'brightness(' + dim + ') saturate(0.8)'; x.drawImage(im, 0, 0); x.filter = 'none'; x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(40,60,140,0.16)'; x.fillRect(0, 0, c.width, c.height); return TH.dk[k] = c; }
function thSpr(n, x, y, h, o = {}) { const c = thIm(n, o.dim || 0.66); if (!c) return false; const w = h * c.width / c.height; g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); g.scale((o.flip ? -1 : 1) * (o.sx || 1), o.sy || 1); g.globalAlpha *= o.a == null ? 1 : o.a; g.drawImage(c, -w / 2, -h, w, h); g.restore(); return true; }
function thReact(s) { const big = s.F.some(f => (f.st === 'hit' || f.st === 'launch') && f.t < 14) && (s.hitstop > 5 || s.shake > 8), ko = s.phase === 'ko' || !!s.done; return { big, ko, hype: typeof ST3 !== 'undefined' ? ST3.hype : 0 }; }
function thBubble(txt0, x, y, sz, a) { txt(txt0, x, y, { size: sz, w: 900, fill: '#FFF4C0', stroke: '#2A1A40', sw: Math.max(3, sz * 0.18), align: 'center', a: a == null ? 0.9 : a }); }
function thHeart(x, y, r, a) { g.save(); g.globalAlpha *= a; g.fillStyle = '#FF7FA8'; g.beginPath(); g.moveTo(x, y + r * 0.9); g.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.6, y - r * 1.2, x, y - r * 0.4); g.bezierCurveTo(x + r * 0.6, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.9); g.fill(); g.restore(); }
function thSmoke(t, x, y, n, H, a0) { for (let i = 0; i < n; i++) { const k = ((t * 0.008 + i / n) % 1); g.save(); g.globalAlpha = Math.sin(k * Math.PI) * a0; g.strokeStyle = '#DCDCF0'; g.lineWidth = 3 + k * 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + Math.sin(t * 0.03 + i) * 6, y - k * H); g.quadraticCurveTo(x + Math.sin(t * 0.05 + i * 2) * 22, y - k * H - H * 0.18, x + Math.sin(t * 0.04 + i) * 10, y - k * H - H * 0.34); g.stroke(); g.restore(); } }
const THV = {      // 一组小剧场 = (s, x, y, h, R) → 自己画；x / y = 脚底（世界坐标），h = 大小
  pond(s, x, y, h, R) {      // 池塘投喂：岸上有人撒白饭，N 条大肥鱼从水里冒头抢（抢到的鼓腮得意，没抢到的哭，激动的扑腾水花）
    const t = s.f, P = 300, u = (t % P) / P, cyc = Math.floor(t / P), tx = x + (hash(cyc * 3.1) - 0.5) * h * 2.4;      // 每轮饭撒到的位置不同
    if (u < 0.35) { g.save(); g.fillStyle = 'rgba(250,250,240,0.85)'; for (let i = 0; i < 26; i++) { const q = (u / 0.35) * 1.4 - hash(i * 2.7) * 0.4; if (q < 0 || q > 1) continue; const sx = x - h * 3.2, px = sx + (tx - sx) * q + (hash(i * 5.1) - 0.5) * h * 0.5 * q, py = y - h * 1.6 + (h * 1.6) * q * q - Math.sin(q * Math.PI) * h * 0.9; g.beginPath(); g.ellipse(px, py, 3.2, 2, q * 3 + i, 0, 7); g.fill(); } g.restore(); }      // 一把白饭抛物线撒出去
    const N = 8; for (let i = 0; i < N; i++) { const hx = x + (i - (N - 1) / 2) * h * 1.05 + Math.sin(t * 0.02 + i * 1.9) * h * 0.08, near = Math.abs(hx - tx) < h * 0.9, rush = u > 0.2 && u < 0.75;
      const gx = rush ? hx + (tx - hx) * Math.min(1, (u - 0.2) * 3) * 0.55 : hx, won = u > 0.5 && near && hash(i + cyc * 7) > 0.35, cell = R.ko ? 1 : !rush && u > 0.75 ? (won || hash(i + cyc * 7) > 0.5 ? 1 : 2) : rush ? (u > 0.45 && won ? 1 : hash(i * 3 + Math.floor(t / 7)) > 0.5 ? 0 : 3) : 3;
      const bob = Math.sin(t * 0.09 + i * 1.3) * h * 0.05 + (rush ? -Math.abs(Math.sin(t * 0.3 + i)) * h * 0.18 : 0) + (R.big ? -h * 0.2 : 0), hh = h * (0.9 + hash(i * 1.7) * 0.25) * (1 + Math.sin(t * 0.12 + i) * 0.03);
      if (!thSpr('th_pond_fish_' + cell, gx, y + bob, hh, { flip: gx > tx, dim: 0.86 })) return;
      if (rush || R.ko) { g.save(); g.strokeStyle = 'rgba(210,235,255,0.55)'; g.lineWidth = 2; const k = ((t * 0.05 + i * 0.37) % 1); g.globalAlpha = 1 - k; g.beginPath(); g.ellipse(gx, y + 4, h * (0.25 + k * 0.5), h * (0.25 + k * 0.5) * 0.22, 0, 0, 7); g.stroke(); g.restore(); g.fillStyle = 'rgba(220,240,255,0.7)'; for (let j = 0; j < 3; j++) { const q = ((t * 0.07 + i * 0.3 + j / 3) % 1); g.beginPath(); g.arc(gx + (j - 1) * h * 0.2 * (1 + q), y - Math.sin(q * Math.PI) * h * 0.35, 3, 0, 7); g.fill(); } }      // 抢饭水花
      if (cell === 2 && hash(i + cyc) > 0.6) thBubble('呜…', gx, y - hh * 1.05, Math.round(h * 0.22), 0.8); else if (cell === 1 && won && u > 0.55 && u < 0.7) thBubble('嗝', gx, y - hh * 1.05, Math.round(h * 0.22), 0.8); }
  },
  incense(s, x, y, h, R) {      // 煮白饭上香：跪拜（两格交替）+ 香烟 + 横幅「梁圣在上 保佑白饭香香的」
    const t = s.f, cell = R.big ? 1 : Math.floor(t / 70) % 2; if (!thSpr('th_incense_' + cell, x, y, h, { dim: 0.7 })) return;
    thSmoke(t, x + h * 0.05, y - h * 0.62, 4, h * 0.7, 0.35);
    const bw = h * 1.5, by = y - h * 1.32; g.save(); g.translate(x, by + Math.sin(t * 0.03) * 2); g.fillStyle = 'rgba(120,20,26,0.85)'; g.fillRect(-bw / 2, -h * 0.13, bw, h * 0.26); g.strokeStyle = 'rgba(230,180,80,0.8)'; g.lineWidth = 2; g.strokeRect(-bw / 2 + 4, -h * 0.13 + 4, bw - 8, h * 0.26 - 8); g.restore();
    txt('梁圣在上 保佑白饭香香的', x, by + h * 0.075 + Math.sin(t * 0.03) * 2, { size: Math.round(h * 0.105), w: 900, fill: '#F2C86A', align: 'center', w2: bw - 16, a: 0.9 });
    if (R.big) thBubble('！', x + h * 0.4, y - h * 1.0, Math.round(h * 0.3));
  },
  slack(s, x, y, h, R) {      // 摸鱼甩锅千问：整张一格，程序让文件一张张飞过去、小千问代理来回跑
    const t = s.f; if (!thSpr('th_slack_0', x, y, h, { dim: 0.68, sy: 1 + Math.sin(t * 0.05) * 0.01 })) return;
    g.save(); g.fillStyle = 'rgba(235,235,225,0.75)'; g.strokeStyle = 'rgba(60,60,80,0.6)'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { const q = ((t * 0.012 + i / 3) % 1), px = x - h * 0.35 + q * h * 0.7, py = y - h * 0.45 - Math.sin(q * Math.PI) * h * 0.3; g.save(); g.translate(px, py); g.rotate(q * 6); g.fillRect(-h * 0.05, -h * 0.065, h * 0.1, h * 0.13); g.strokeRect(-h * 0.05, -h * 0.065, h * 0.1, h * 0.13); g.restore(); } g.restore();
    if (Math.floor(t / 160) % 3 === 1) thBubble('交给你啦～', x - h * 0.3, y - h * 0.95, Math.round(h * 0.11), 0.85); else if (Math.floor(t / 160) % 3 === 2) thBubble('又是我？！', x + h * 0.25, y - h * 0.95, Math.round(h * 0.11), 0.85);
    if (R.big) thBubble('！', x, y - h * 1.1, Math.round(h * 0.2));
  },
  pet(s, x, y, h, R) { const t = s.f, cell = Math.floor(t / 110) % 2; if (!thSpr('th_claude_pet_' + cell, x, y + Math.abs(Math.sin(t * 0.06)) * -3, h, { dim: 0.7 })) return;
    for (let i = 0; i < 3; i++) { const q = ((t * 0.01 + i / 3) % 1); thHeart(x + (i - 1) * h * 0.2 + Math.sin(t * 0.04 + i) * 8, y - h * (0.8 + q * 0.5), h * 0.045, Math.sin(q * Math.PI) * 0.8); }
    if (R.big) thBubble('！', x, y - h * 1.1, Math.round(h * 0.22)); },
  kid(s, x, y, h, R) { const t = s.f, tant = R.big || Math.floor(t / 140) % 3 === 2, cell = tant ? 1 : 0, sh = tant ? Math.sin(t * 0.9) * 3 : 0; if (!thSpr('th_gpt_kid_' + cell, x + sh, y, h, { dim: 0.7, sy: 1 + Math.sin(t * 0.08) * 0.02 })) return;
    if (!tant && Math.floor(t / 140) % 3 === 1) thBubble('1+1=3！', x, y - h * 1.08, Math.round(h * 0.16), 0.85); if (tant) thBubble('哇——', x, y - h * 1.08, Math.round(h * 0.16), 0.85); },
  beat(s, x, y, h, R) { const t = s.f, P = 90, u = (t % P) / P, cell = u > 0.62 ? 1 : 0, sw = cell ? 0 : Math.sin(t * 0.25) * 0.05; if (!thSpr('th_claude_beat_' + cell, x, y, h, { dim: 0.7, rot: sw })) return;
    if (cell && u < 0.75) { g.save(); g.translate(x + h * 0.1, y - h * 0.85); g.rotate(t * 0.2); g.fillStyle = 'rgba(255,230,120,0.85)'; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? h * 0.05 : h * 0.13, a = i / 10 * Math.PI * 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.restore(); thBubble('咚！', x + h * 0.3, y - h * 1.05, Math.round(h * 0.15)); }
    else if (Math.floor(t / P) % 2) thBubble('我们谈谈。', x - h * 0.2, y - h * 1.08, Math.round(h * 0.12), 0.85); },
  gun(s, x, y, h, R) { const t = s.f, P = 120, u = (t % P) / P, fire = u > 0.7 || R.big, cell = fire ? 1 : 0, kb = fire && u < 0.8 ? -h * 0.03 : 0; if (!thSpr('th_ds_gun_' + cell, x + kb, y, h, { dim: 0.7 })) return;
    if (fire && u < 0.85) { g.save(); g.fillStyle = 'rgba(200,230,255,0.75)'; for (let i = 0; i < 6; i++) { const q = ((u - 0.7) / 0.15 + i * 0.12) % 1; g.beginPath(); g.arc(x + h * 0.55 + q * h * 0.8, y - h * 0.3 - Math.sin(q * 2) * h * 0.05 + (i - 3) * 3, 3, 0, 7); g.fill(); } g.restore(); thBubble('哐！', x - h * 0.1, y - h * 0.75, Math.round(h * 0.15)); } },
  dance(s, x, y, h, R) { const t = s.f, sp = R.ko || R.hype > 0.5 ? 2 : 1, cell = Math.floor(t * sp / 16) % 3, hop = Math.abs(Math.sin(t * sp * 0.2)) * h * 0.06; if (!thSpr('th_ds_dance_' + cell, x, y - hop, h, { dim: 0.72, sx: 1 + Math.sin(t * 0.2) * 0.03 })) return;
    g.save(); g.fillStyle = 'rgba(255,240,200,0.8)'; for (let i = 0; i < 3; i++) { const q = ((t * 0.015 + i / 3) % 1); txt('♪', x + (i - 1) * h * 0.4, y - h * (0.9 + q * 0.4), { size: Math.round(h * 0.13), w: 900, fill: '#FFE9A8', align: 'center', a: Math.sin(q * Math.PI) * 0.85 }); } g.restore(); },
};
Object.assign(THV, {      // 第 78 圈：第二版彩蛋（Grok 病娇大小姐 / 哈基米贪玩 / GLM 黑白颠倒 / Kimi 长文本埋人）
  tea(s, x, y, h, R) { const t = s.f, yan = R.big || Math.floor(t / 150) % 3 === 2, cell = yan ? 1 : 0; if (!thSpr('th_grok_tea_' + cell, x, y, h, { dim: 0.7 })) return;
    if (yan) { const k = 0.6 + 0.4 * Math.sin(t * 0.2); thHeart(x + h * 0.38, y - h * 0.95, h * 0.07 * k, 0.75); thBubble('……是谁弄脏了我的裙子？', x, y - h * 1.08, Math.round(h * 0.09), 0.85); } else if (Math.floor(t / 150) % 3 === 1) thBubble('呵呵，一群平民。', x, y - h * 1.08, Math.round(h * 0.09), 0.85); },
  play(s, x, y, h, R) { const t = s.f, P = 240, u = (t % P) / P, cell = u < 0.4 ? 0 : u < 0.6 ? 1 : 2, jx = cell === 1 ? (u - 0.4) / 0.2 * h * 0.8 : cell === 2 ? h * 0.8 : 0, jy = cell === 1 ? -Math.sin((u - 0.4) / 0.2 * Math.PI) * h * 0.45 : 0, wig = cell === 0 ? Math.sin(t * 0.6) * 0.03 : 0;
    if (!thSpr('th_gem_play_' + cell, x + jx, y + jy, h, { dim: 0.72, rot: wig })) return; if (R.big) thBubble('喵？！', x + jx, y + jy - h * 1.05, Math.round(h * 0.16)); },
  flip(s, x, y, h, R) { const t = s.f, night = Math.floor(t / 300) % 2 === 1, cell = night ? 1 : 0; if (!thSpr('th_glm_flip_' + cell, x, y, h, { dim: night ? 0.62 : 0.74 })) return;
    if (!night) { for (let i = 0; i < 3; i++) { const q = ((t * 0.01 + i / 3) % 1); txt('z', x + h * 0.3 + q * h * 0.25, y - h * (0.55 + q * 0.4), { size: Math.round(h * (0.08 + q * 0.06)), w: 900, fill: '#E8ECFF', align: 'center', a: Math.sin(q * Math.PI) * 0.8 }); } } else thBubble(Math.floor(t / 60) % 2 ? '凌晨三点，灵感爆发！' : '再写一个脚本！', x, y - h * 1.06, Math.round(h * 0.09), 0.85); },
  scroll(s, x, y, h, R) { const t = s.f, P = 360, u = (t % P) / P, cell = R.big || u > 0.7 ? 1 : 0; if (!thSpr('th_kimi_scroll_' + cell, x, y, h, { dim: 0.72, sy: cell ? 1 + Math.sin(t * 0.1) * 0.02 : 1 })) return;
    if (cell) thBubble('二百万字……读不完了……', x, y - h * 1.0, Math.round(h * 0.1), 0.85); else if (u > 0.35) thBubble('第 1,048,576 字……', x, y - h * 1.0, Math.round(h * 0.1), 0.8); },
});
Object.assign(THV, {      // 第 79 圈：千问开 N 个小代理（打开电脑打个响指蹦出小代理 → 五个小代理扛着快递排队走 → 全部宕机堆成一堆，本体冒汗）
  agents(s, x, y, h, R) { const t = s.f, P = 480, u = (t % P) / P, cell = R.ko ? 2 : u < 0.3 ? 0 : u < 0.72 ? 1 : 2, n = 'th_qwen_agents_' + cell, im = IM['t:' + n], hh = im ? h * im.height / 360 : h;
    const q = cell === 1 ? (u - 0.3) / 0.42 : 0, mx = cell === 1 ? x - h * 0.6 + q * h * 1.6 : x, my = cell === 1 ? -Math.abs(Math.sin(t * 0.35)) * h * 0.04 : 0;
    if (!thSpr(n, mx, y + my, hh, { dim: 0.74, rot: cell === 2 && R.big ? Math.sin(t * 0.8) * 0.03 : 0 })) return;
    if (cell === 0 && u > 0.08) thBubble(u < 0.19 ? '开 5 个小代理！' : '交给你们啦～', x - h * 0.15, y - h * 1.08, Math.round(h * 0.1), 0.85);
    else if (cell === 1) thBubble(Math.floor(t / 40) % 2 ? '收到！' : '在跑了在跑了', mx, y - hh * 1.25, Math.round(h * 0.09), 0.8);
    else if (cell === 2) thBubble(R.big ? '别打了！代理又宕机了！' : '代理……全宕机了……', x + h * 0.2, y - h * 1.08, Math.round(h * 0.09), 0.85); },
});
const TH_SET = {      // 每个舞台 2–3 组：[类型, x, y(脚底), h]；画在场地之后、人之前（中景）。用户 17:03：池塘 = 抢饭 + 上香；办公室 = 摸鱼甩锅 + 宠溺；天台 / 会议室 = 降智小孩、拎起吊打、伏地打枪、吃饱跳舞
  waterside: [['pond', 1050, 748, 92], ['incense', 1790, 712, 150]],
  office: [['slack', 1660, 790, 250], ['pet', 400, 690, 135]],
  meeting: [['beat', 470, 700, 205], ['kid', 1560, 700, 140]],
  rooftop: [['gun', 1700, 775, 150], ['dance', 420, 720, 140]],
  fishplanet: [['dance', 330, 770, 100], ['agents', 1660, 770, 175]],
  nextdoor: [['scroll', 420, 800, 150], ['flip', 1720, 790, 150]],
  interview: [['tea', 360, 780, 170], ['play', 1560, 790, 110]],
};
const THEATER = {
  back(s) { if (typeof st3Track === 'function') st3Track(s); },
  mid(s) { if (TH_OFF || typeof document === 'undefined') return; thLoad(); const L = TH_SET[s.stage]; if (!L) return; const R = thReact(s);
    for (const [k, x, y, h] of L) { g.save(); try { THV[k](s, x, y, h, R); } finally { g.restore(); } } },
};
for (const k of ['office', 'meeting', 'rooftop', 'fishplanet', 'nextdoor', 'interview']) { const f0 = STAGE2[k]; STAGE2[k] = function (s, kick) { if (f0) f0.call(this, s, kick); THEATER.mid(s); }; }      // 老舞台：在原有动态层之后加小剧场
