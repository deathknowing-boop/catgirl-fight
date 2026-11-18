// 第 68 圈（LOOP_BRIEF_5 ③：特效锐利化）：命中时加「细长锐利的光刃线 + 细冲击圈 + 精准闪点」，按攻击方主题色（render.js ECOL），只用细线不用大团光。
// 第 69 圈：光刃线挪到屏幕层（drawFight 在白闪 / 运动模糊之后调 FX2.screen），不再被命中白闪和动态模糊盖住；
//   刀光 = 深色描边 + 饱和主题色 + 细白芯（正常叠加，不靠加色，泛光洗不白）；命中后刀光沿打击方向继续滑出、变细，旁边 2–4 道平行细速度线；
//   必杀 / 重击 / 超必杀多一道主题色长直线横穿画面。world 层只留冲击圈。?blade=0 关
const FX2 = (() => {
  const OFF = /[?&]blade=0/.test(typeof location !== 'undefined' ? location.search : '');
  const SAT = {};
  function sat(hex) {      // 主题色提饱和、压到中等亮度（浅色系角色的刀光也要看得出颜色）
    if (SAT[hex]) return SAT[hex]; const n = parseInt(hex.slice(1), 16); let r = (n >> 16 & 255) / 255, gg = (n >> 8 & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b); let h = 0; const d = mx - mn;
    if (d > 0) h = mx === r ? ((gg - b) / d + 6) % 6 : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4;
    const C = 0.92 * (1 - Math.abs(2 * 0.56 - 1)), X = C * (1 - Math.abs(h % 2 - 1)), m = 0.56 - C / 2, k = [[C, X, 0], [X, C, 0], [0, C, X], [0, X, C], [X, 0, C], [C, 0, X]][Math.floor(h) % 6];
    const hx = '#' + k.map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join(''); return (SAT[hex] = hx);
  }
  function blade(x, y, ang, L, w, col, a, outline = true) {      // 两头尖、前段宽的细长菱形刀光：深色描边 → 饱和主题色 → 白芯
    if (a <= 0 || L < 2 || w < 0.3) return; g.save(); g.translate(x, y); g.rotate(ang);
    const shape = ww => { g.beginPath(); g.moveTo(-L / 2, 0); g.lineTo(L * 0.18, -ww / 2); g.lineTo(L / 2, 0); g.lineTo(L * 0.18, ww / 2); g.closePath(); };
    if (outline) { g.fillStyle = 'rgba(8,4,24,' + (0.5 * a).toFixed(3) + ')'; shape(w * 1.9 + 4); g.fill(); }
    g.fillStyle = rgba(col, Math.min(1, 0.95 * a)); shape(w * 1.35); g.fill();
    g.fillStyle = 'rgba(255,255,255,' + Math.min(1, a).toFixed(3) + ')'; shape(w * 0.42); g.fill();
    g.restore();
  }
  function colsOf(s, q) { const atk = s.F[q.who]; if (!atk) return null; const C = (typeof ECOL !== 'undefined' && ECOL[atk.id]) || [atk.ch.col, atk.ch.col2]; return [q.tier === 2 ? '#FF2244' : q.tier === 1 ? '#FFB000' : sat(C[0]), C[1]]; }
  // world 层（镜头变换里）：只画细冲击圈
  function spark(s, q, x, y, k) {
    if (OFF || q.t > 16) return; const C = colsOf(s, q); if (!C) return;
    const L = q.tier === 2 ? 4 : q.lvl || 1, sp = !!(q.mvid || q.src === 'proj'), d = q.dir || 1, u = q.t;
    g.save(); const R = (L >= 3 ? 230 : L === 2 ? 160 : 95) * (sp ? 1.2 : 1);
    for (let r = 0; r < (L >= 2 || sp ? 2 : 1); r++) { const kk = Math.min(1, (u + 1 - r * 2) / 9); if (kk <= 0) continue; g.strokeStyle = rgba(r ? '#FFFFFF' : C[0], (1 - kk) * 0.85); g.lineWidth = (r ? 2 : 3.5) * (1 + (1 - kk)); g.beginPath(); g.ellipse(x, y, R * E.out3(kk), R * E.out3(kk) * 0.82, d * 0.2, 0, 7); g.stroke(); }
    g.restore();
  }
  // 屏幕层：drawFight 在白闪之后、HUD 之前调用
  function screen(s) {
    if (OFF || !s.fx || s.exe) return; const z = (s.cam && s.cam.z) || 1;
    for (const q of s.fx) {
      if (q.k !== 'spark' || q.t > 18 || q.who == null) continue; const C = colsOf(s, q); if (!C) continue;
      const L = q.tier === 2 ? 4 : q.lvl || 1, sp = !!(q.mvid || q.src === 'proj'), d = q.dir || 1, seed = (q.x * 7 + q.y * 13) | 0, u = q.t;
      const [x, y] = w2s(s, q.x, q.y), life = sp ? 18 : L >= 2 ? 15 : 11; if (u >= life) continue;
      const grow = E.out3(Math.min(1, (u + 1) / 2.5)), fade = u < 3 ? 1 : Math.max(0, 1 - (u - 3) / (life - 3)), slide = E.out3(Math.min(1, u / life)) * (L >= 3 ? 260 : 170) * z;
      const base = (L >= 3 ? 1050 : L === 2 ? 720 : 430) * (sp ? 1.2 : 1) * z, w = (L >= 3 ? 15 : L === 2 ? 11 : 7.5) * z * (0.35 + 0.65 * fade);
      const n = sp || L >= 2 ? 2 : 1;
      for (let i = 0; i < n; i++) {      // 主刀光（必杀 / 重击两道交叉）：先「唰」地拉长，之后沿打击方向滑出、变细淡出
        const ang = (d > 0 ? 0 : Math.PI) + (i ? 0.5 : -0.16) * (hash(seed + i) > 0.5 ? 1 : -1) + (hash(seed * 3 + i) - 0.5) * 0.2, LL = base * grow * (1 - 0.18 * i), ca = Math.cos(ang), sa = Math.sin(ang);
        blade(x + ca * (LL * 0.1 + slide), y + sa * (LL * 0.1 + slide), ang, LL, w * (1 - 0.25 * i), i ? sat(C[1]) : C[0], fade);
      }
      const m = L >= 3 || sp ? 4 : L === 2 ? 3 : 2;      // 平行细速度线：主刀光两侧，更细、跑得更快
      for (let j = 0; j < m; j++) {
        const off = ((j % 2 ? 1 : -1) * (14 + 16 * Math.floor(j / 2)) + (hash(seed + 7 * j) - 0.5) * 10) * z, ang = (d > 0 ? 0 : Math.PI) - 0.16 * (hash(seed) > 0.5 ? 1 : -1), ca = Math.cos(ang), sa = Math.sin(ang);
        const LL = base * (0.35 + 0.25 * hash(seed * 5 + j)) * grow, sl = slide * 1.8 + LL * 0.3, a = fade * (u < 1 ? 0.6 : 0.9);
        blade(x + ca * sl - sa * off, y + sa * sl + ca * off, ang, LL, Math.max(1.2, 2.6 * z * fade), C[0], a, false);
      }
      if ((L >= 3 || q.sup || (sp && L >= 2)) && u < 9) {      // 横穿画面的主题色长直线（重击 / 必杀 / 超必杀）
        const k2 = u / 9, ang = (d > 0 ? 0 : Math.PI) + (hash(seed * 11) - 0.5) * 0.12, ca = Math.cos(ang), sa = Math.sin(ang), LL = 2600 * E.out3(Math.min(1, (u + 1) / 3));
        blade(x + ca * LL * 0.05, y + sa * LL * 0.05, ang, LL, (L >= 3 ? 5 : 3.5) * z * (1 - k2), C[0], 1 - k2 * k2);
      }
      if (u < 2) { g.save(); g.fillStyle = '#FFFFFF'; g.translate(x, y); g.rotate(d * 0.2); const r = (L >= 3 ? 34 : 22) * z * (1 - u / 2.2);      // 精准闪点：小而亮的四芒星
        g.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.18 : r * (i % 4 ? 0.6 : 1); g.lineTo(Math.cos(i * 0.785) * rr, Math.sin(i * 0.785) * rr); } g.closePath(); g.fill(); g.restore(); }
    }
  }
  return { spark, blade, screen, sat };
})();

// 第 69 圈（LOOP_BRIEF_5 ④）：P5 式色块拼贴的超必杀切入。整屏压暗 → 斜向主题色色带（漫画网点 + 黑白放射）从一侧砸进来 →
//   半身像带「白 / 黑」两层错位剪影 → 招式名每个字一块「剪报字」（白底黑字 / 黑底白字 / 主题色底，大小角度各不同）逐个弹出 → 等级标签黑色斜条 → 收尾色带往另一侧抽走。
//   只改画面。?oldcut=1 回到旧版（render.js drawCutin）
const P5 = (() => {
  const OFF = /[?&]oldcut=1/.test(typeof location !== 'undefined' ? location.search : '');
  const LV = ['', '一级超必杀', '二级超必杀', '三级超必杀'];
  function band(L, y0, y1, slope, dx) {      // 斜向色带的四边形路径
    g.beginPath(); g.moveTo(-200 + dx, y0 + (L ? 0 : slope)); g.lineTo(W + 200 + dx, y0 + (L ? slope : 0)); g.lineTo(W + 200 + dx, y1 + (L ? slope : 0)); g.lineTo(-200 + dx, y1 + (L ? 0 : slope)); g.closePath();
  }
  function halftone(cx, cy, col, a, step = 24, ya = 200, yb = 900, xb = W) {      // 漫画网点：离中心越远点越大
    g.save(); g.fillStyle = rgba(col, a); g.beginPath();
    for (let y = ya; y < yb; y += step) for (let x = (y / step) % 2 ? 0 : step / 2; x < xb; x += step) { const r = Math.min(step * 0.46, 1.2 + Math.hypot(x - cx, (y - cy) * 1.6) / 95); g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.283); }
    g.fill(); g.restore();
  }
  function sunburst(cx, cy, n, col, a, rot) { g.save(); g.fillStyle = rgba(col, a); g.beginPath(); for (let i = 0; i < n; i++) { const a0 = rot + i / n * 6.283, a1 = a0 + 6.283 / n * 0.42; g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a0) * 2600, cy + Math.sin(a0) * 2600); g.lineTo(cx + Math.cos(a1) * 2600, cy + Math.sin(a1) * 2600); g.closePath(); } g.fill(); g.restore(); }
  function sil(id, ex, ey, x, y, sc, flip, filt, a) { g.save(); g.filter = filt; bust(id, ex, ey, x, y, sc, { flip, a }); g.restore(); }
  function cutin(s) {
    if (OFF) return drawCutin(s);
    const fz = s.fz, f = s.F[fz.who]; if (!f) return; const L = fz.who === 0, ch = f.ch, len = fz.len || 44, age = (len - s.freeze) / 60, T = len / 60, e = (typeof EYE !== 'undefined' && EYE[f.id]) || [620, 520];
    const C0 = (typeof ECOL !== 'undefined' && ECOL[f.id]) ? FX2.sat(ECOL[f.id][0]) : ch.col, ink = ch.ink || '#0A0A1E', sd = L ? 1 : -1;
    const kin = E.out5(Math.min(1, age / 0.13)), kout = age > T - 0.1 ? E.in3(Math.min(1, (age - (T - 0.1)) / 0.1)) : 0, dx = (1 - kin) * -sd * 2200 + kout * sd * 2400;
    g.save(); g.fillStyle = 'rgba(4,2,12,' + (0.72 * (1 - kout)).toFixed(3) + ')'; g.fillRect(0, 0, W, H);
    // ① 后面一条细黑带（白边）错位先进来，② 主色带
    g.save(); band(L, 250, 830, 170, dx * 1.15); g.fillStyle = '#08060E'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#fff'; g.stroke(); g.restore();
    g.save(); band(L, 300, 780, 150, dx); g.clip();
    const pcx = L ? 520 : 1400; g.fillStyle = C0; g.fillRect(0, 0, W, H);
    sunburst(pcx + dx, 560, 22, ink, 0.32, s.f * 0.004 * sd); halftone(pcx + dx, 560, ink, 0.38);
    g.fillStyle = lg(0, 300, 0, 900, ['rgba(255,255,255,0.18)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.35)']); g.fillRect(0, 0, W, H);
    const bx = (L ? 470 : 1450) + dx * 0.6 + sd * age * 50, by = 560, sc = 1.32;      // 半身像：白剪影 → 黑剪影 → 本体，层层错位
    sil(f.id + '_smug', e[0], e[1], bx + sd * 34, by + 22, sc, !L, 'brightness(0) invert(1)', 1);
    sil(f.id + '_smug', e[0], e[1], bx + sd * 18, by + 11, sc, !L, 'brightness(0)', 1);
    bust(f.id + '_smug', e[0], e[1], bx, by, sc, { flip: !L });
    g.restore();
    g.save(); band(L, 300, 780, 150, dx); g.lineWidth = 10; g.strokeStyle = '#fff'; g.stroke(); g.restore();
    // ③ 剪报字招式名（长名字按「·」或对半拆两行）
    const nm = String(fz.name || '超必杀'), all = [...nm].filter(c => c.trim()), R = rngOf(((fz.f0 || 0) % 97) * 13 + nm.length);
    let rows = nm.split(/\s*·\s*/).map(r => [...r].filter(c => c.trim())).filter(r => r.length);
    if (all.length <= 6) rows = [all.filter(c => c !== '·')]; else if (rows.length === 1) { const a = rows[0], h = Math.ceil(a.length / 2); rows = [a.slice(0, h), a.slice(h)]; } else if (rows.length > 2) rows = [rows[0], [].concat(...rows.slice(1))];
    const cols = [['#FFFFFF', '#0A0A12'], ['#0A0A12', '#FFFFFF'], [C0, '#FFFFFF'], ['#FFFFFF', '#0A0A12'], ['#E8102E', '#FFFFFF'], ['#0A0A12', '#FFFFFF']];
    let i = 0;
    rows.forEach((row, ri) => {
      const base = Math.min(rows.length > 1 ? 120 : 150, 800 / (row.length + 0.3)); let x = (L ? 1010 : 110) + ri * base * 0.5, y = rows.length > 1 ? 585 + ri * base * 1.12 : 650;
      for (const c of row) {
        const sz = base * (0.84 + R() * 0.3), rot = (R() - 0.5) * 0.24, [bg, fg] = cols[(i + (R() > 0.7 ? 1 : 0)) % cols.length], t0 = 0.05 + i * 0.016, p = Math.min(1, Math.max(0, (age - t0) / 0.06)); i++;
        const bw = sz * 1.04, bh = sz * 1.1, cx = x + bw / 2 - dx * 0.2, cy = y - sz * 0.36 + (R() - 0.5) * sz * 0.2;
        if (p > 0) { const k = E.out5(p), scl = lerp(1.9, 1, k); g.save(); g.globalAlpha = Math.min(1, p * 2) * (1 - kout); g.translate(cx, cy); g.rotate(rot * (2 - k)); g.scale(scl, scl);
          g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(-bw / 2 + 8, -bh / 2 + 10, bw, bh); g.fillStyle = bg; g.fillRect(-bw / 2, -bh / 2, bw, bh); if (bg === '#FFFFFF') { g.lineWidth = 3; g.strokeStyle = '#0A0A12'; g.strokeRect(-bw / 2 + 5, -bh / 2 + 5, bw - 10, bh - 10); } else if (bg !== '#0A0A12') { g.lineWidth = 6; g.strokeStyle = '#0A0A12'; g.strokeRect(-bw / 2, -bh / 2, bw, bh); g.lineWidth = 2; g.strokeStyle = '#FFFFFF'; g.strokeRect(-bw / 2 + 7, -bh / 2 + 7, bw - 14, bh - 14); }
          g.restore(); txt(c, cx, cy + sz * 0.33, { size: sz * 0.86, w: 900, fill: fg, align: 'center', rot: rot * (2 - k), sc: scl, a: Math.min(1, p * 2) * (1 - kout) }); }
        x += bw * 0.93;
      }
    });
    // ④ 等级标签：黑色斜条 + 主题色描边
    const lv = fz.lv ? LV[fz.lv] : '超必杀', lp = E.out5(Math.min(1, Math.max(0, (age - 0.06) / 0.1))), lx = (L ? 1000 : 120) - (1 - lp) * sd * -600 - dx * 0.3;
    if (lp > 0) { g.save(); g.globalAlpha = 1 - kout; g.translate(lx, rows.length > 1 ? 440 : 500); g.transform(1, 0, -0.3, 1, 0, 0); g.fillStyle = '#0A0A12'; g.fillRect(0, -50, 380, 64); g.fillStyle = C0; g.fillRect(0, 14, 380, 8); g.fillStyle = '#E8102E'; g.fillRect(-18, -50, 12, 64); g.restore();
      txt(lv, lx + 30, rows.length > 1 ? 440 : 500, { size: 44, w: 900, fill: '#fff', ls: 10, a: 1 - kout, skew: -0.2 }); }
    g.restore(); flashAt(age, 0, 0.12, '#fff', 0.75);
  }
  function panelBg(cx, cy, col, ink, t) { sunburst(cx, cy, 20, ink, 0.26, t * 0.05); halftone(cx, cy, '#05030C', 0.42, 26, 0, H, 960); }      // 胜利画面等：放射 + 网点底
  function edge(x0, y0, x1, y1, a = 1) {      // 斜切边：白粗线 + 外侧黑带 + 红细线（P5 的撕纸边）
    g.save(); g.globalAlpha *= a; g.lineCap = 'butt'; const nx = 1, off = (w, c, d) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x0 + d * nx, y0); g.lineTo(x1 + d * nx, y1); g.stroke(); };
    off(26, '#08060E', 16); off(7, '#E8102E', 24); off(10, '#FFFFFF', 0); g.restore(); }
  function koLines(s, tk) {      // K.O. 定格：漫画集中线（黑白细楔形，从画面四周收向倒下的人），前 0.12 秒反白
    if (OFF || tk > 0.9 || s.timeUp) return; const lo = s.F[s.winner < 0 ? 0 : 1 - s.winner]; if (!lo) return;
    const [x, y] = w2s(s, lo.x, (lo.ch.h || 300) * 0.5), a = tk < 0.55 ? 1 : 1 - (tk - 0.55) / 0.35, R = rngOf(((s.f / 3) | 0) * 31 + 7);
    g.save();
    for (const [n, col, aa, r0] of [[70, '#06040C', 0.85, 330], [40, '#FFFFFF', 0.7, 380]]) { g.fillStyle = col; g.globalAlpha = a * aa; g.beginPath();
      for (let i = 0; i < n; i++) { const an = R() * 6.283, w = 0.004 + R() * 0.012, rr = r0 * (0.8 + R() * 0.7); g.moveTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.8); g.lineTo(x + Math.cos(an - w) * 2400, y + Math.sin(an - w) * 2400); g.lineTo(x + Math.cos(an + w) * 2400, y + Math.sin(an + w) * 2400); g.closePath(); }
      g.fill(); }
    g.restore(); }
  const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  function tagWord(word, x, y, base, age, R, a) {      // 剪报字一串（每字一块，逐个弹出）
    const cols = [['#FFFFFF', '#0A0A12'], ['#E8102E', '#FFFFFF'], ['#0A0A12', '#FFFFFF'], ['#FFE066', '#0A0A12']]; let i = 0;
    for (const c of word) { const sz = base * (0.86 + R() * 0.28), rot = (R() - 0.5) * 0.26, [bg, fg] = cols[(i + (R() > 0.75 ? 1 : 0)) % cols.length], p = Math.min(1, Math.max(0, (age - i * 0.04) / 0.08)); i++;
      const bw = sz * 1.04, bh = sz * 1.1, cx = x + bw / 2, cy = y + (R() - 0.5) * sz * 0.18;
      if (p > 0) { const k = E.out5(p), scl = lerp(1.8, 1, k); g.save(); g.globalAlpha = Math.min(1, p * 2) * a; g.translate(cx, cy); g.rotate(rot * (2 - k)); g.scale(scl, scl); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(-bw / 2 + 7, -bh / 2 + 8, bw, bh); g.fillStyle = bg; g.fillRect(-bw / 2, -bh / 2, bw, bh); g.lineWidth = 4; g.strokeStyle = '#0A0A12'; g.strokeRect(-bw / 2, -bh / 2, bw, bh); g.restore();
        txt(c, cx, cy + sz * 0.33, { size: sz * 0.86, w: 900, fill: fg, align: 'center', rot: rot * (2 - k), sc: scl, a: Math.min(1, p * 2) * a }); }
      x += bw * 0.95; } }
  function roundTag(s, t, n, a) {      // 回合横幅：黑带上叠网点，左上角斜贴剪报字「第一回合」/「决胜回合」
    if (OFF || a <= 0) return; const k = E.out5(Math.min(1, (t - 0.2) / 0.2));
    g.save(); g.beginPath(); g.moveTo(960 - 1100 * k, 360); g.lineTo(960 + 1100 * k + 60, 360); g.lineTo(960 + 1100 * k, 600); g.lineTo(960 - 1100 * k - 60, 600); g.closePath(); g.clip(); g.globalAlpha = a; halftone(960, 480, '#E8384F', 0.22, 22, 360, 600); g.restore();
    const word = s.final ? '决胜回合' : '第' + (CN[s.round] || s.round) + '回合';
    g.save(); g.translate(250, 282); g.rotate(-0.06); tagWord(word, 0, 0, 62, t - 0.45, rngOf(s.round * 17 + 3), a); g.restore(); }
  return { cutin, OFF, koLines, roundTag, panelBg, edge, halftone, sunburst, tagWord };
})();
