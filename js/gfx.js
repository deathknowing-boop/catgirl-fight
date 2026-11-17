// ===== 画布工具：缓动、素材、文字、常用图形 =====
const W = 1920, H = 1080;
const cv = document.getElementById('c'); const g = cv.getContext('2d');
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x, lerp = (a, b, k) => a + (b - a) * k, prog = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  out2: k => 1 - (1 - k) * (1 - k), in2: k => k * k, io2: k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, out3: k => 1 - Math.pow(1 - k, 3), in3: k => k * k * k, out5: k => 1 - Math.pow(1 - k, 5),
  io3: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
  back: k => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }, back2: k => { const c = 3.2, c3 = c + 1; return 1 + c3 * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
  elastic: k => k <= 0 ? 0 : k >= 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
};
const tw = (t, a, d, e = E.out3) => e(prog(t, a, a + d));
const pop = (t, t0, d = 0.28) => t < t0 ? 0 : E.back(prog(t, t0, t0 + d)), pop2 = (t, t0, d = 0.32) => t < t0 ? 0 : E.back2(prog(t, t0, t0 + d));
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function rngOf(seed) { let s = seed >>> 0; return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const F = { cn: "'NSC','PingFang SC','Noto Sans CJK SC','Microsoft YaHei',sans-serif", en: "'Outfit','Poppins','Arial Black',sans-serif" };
const font = (size, w = 800, fam = F.cn) => `${w} ${size}px ${fam}`;
const INK = '#0C1650';
// —— 素材 ——
const IM = {}, WHITE = {};
function loadImg(key, src) { return Promise.resolve(window.ASSET_READY).then(() => new Promise(res => { const im = new Image(); im.onload = () => { IM[key] = im; res(); }; im.onerror = () => { console.error('IMG FAIL ' + src); res(); }; im.src = (window.ASSET_DATA && ASSET_DATA[src]) || src; })); }
// 第 67 圈瘦身：街机才用的图（结局插画、头目场地）不在开场加载，进街机时 loadLazy('arc') 在后台取；网页版图片在 js/assets_lz_<名>.js（LAZY_PACKS）
const LAZY_SKIP = new Set(['g:rooftop']), LZ = {};
const LAZY = { arc: () => [['g:rooftop', 'assets/stage/rooftop.jpg'], ...(typeof ENDIMG !== 'undefined' ? ENDIMG.map(n => ['e:' + n, `assets/end/${n}.webp`]) : [])] };
function loadLazy(id) {
  if (LZ[id]) return LZ[id]; const list = (LAZY[id] || (() => []))();
  const pack = () => new Promise(res => { if (!window.LAZY_PACKS || !LAZY_PACKS[id]) return res(); const sc = document.createElement('script'); sc.src = LAZY_PACKS[id]; sc.onload = sc.onerror = () => res(); document.head.appendChild(sc); });
  return LZ[id] = pack().then(() => window.ASSET_READY).then(() => Promise.all(list.map(([k, src]) => IM[k] ? 0 : loadImg(k, src)))); }
function loadAll(onProgress) {
  const list = []; for (const n in META.spr) if (!(window.QLAZY && QLAZY.skip(n))) list.push(['s:' + n, `assets/spr/${n}.webp`]); for (const n in META.bust) list.push(['b:' + n, `assets/bust/${n}.webp`]);
  for (const n in META.stk) list.push(['k:' + n, `assets/stk/${n}.webp`]); for (const n in META.stage) if (!LAZY_SKIP.has('g:' + n)) list.push(['g:' + n, `assets/stage/${n}.jpg`]); if (window.SELART) for (const n in SELART) list.push(['l:' + n, `assets/sel/${n}.webp`]); if (typeof CINE_IMG !== 'undefined') for (const n of CINE_IMG) list.push(['c:' + n, `assets/cine/${n}.webp`]); if (typeof FXT !== 'undefined') for (const n of FXT) list.push(['x:' + n, `assets/fx/${n}.webp`]);       // 第 65 圈：街机通关结局插画      // 特效贴图（第 33 圈）      // 三级超必杀插画
  let done = 0; return Promise.all(list.map(([k, src]) => loadImg(k, src).then(() => { done++; onProgress && onProgress(done / list.length); })));
}
function whiteOf(name) {           // 受击闪白用的纯白剪影
  if (WHITE[name]) return WHITE[name]; const im = IM['s:' + name]; const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d');
  x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); return WHITE[name] = c;
}
// 立绘：(x,y) 脚底中点，h = 内容高度；o: flip / rot / sx / sy / a / white(0..1) / tint
function spr(name, x, y, h, o = {}) {
  const im = IM['s:' + name], m = META.spr[name]; if (!im) return; const s = h / m.h, pad = m.pad * s, w = m.w * s, ax = o.ax ?? m.ax ?? 0.5, ay = o.ay ?? 1;
  g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); if (o.skew) g.transform(1, 0, o.skew, 1, 0, 0); g.scale((o.flip ? -1 : 1) * (o.sx ?? 1), o.sy ?? 1); if (o.a != null) g.globalAlpha *= o.a;
  if (o.env && o.env.pix) { const c = envOf(name, im, o.env), t = pixOf(name + '|pix', c); g.imageSmoothingEnabled = false; g.drawImage(t, -w * ax - pad, -h * ay - pad, w + 2 * pad, h + 2 * pad); g.imageSmoothingEnabled = true; }      // 马赛克（豆包宕机）
  else if (o.env) g.drawImage(envOf(name, im, o.env), -w * ax - pad, -h * ay - pad, w + 2 * pad, h + 2 * pad);
  else g.drawImage(im, -w * ax - pad, -h * ay - pad, w + 2 * pad, h + 2 * pad);
  if (o.white > 0) { g.globalAlpha *= o.white; g.drawImage(whiteOf(name), -w * ax - pad, -h * ay - pad, w + 2 * pad, h + 2 * pad); }
  g.restore();
}
// 半身像：把原图 1254 坐标系里的 (ex,ey) 放到 (x,y)，sc 是相对 1254 原图的缩放
function bust(name, ex, ey, x, y, sc, o = {}) { const im = IM['b:' + name]; if (!im) return; const k = sc * 1254 / im.width; g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); g.scale((o.flip ? -1 : 1) * k, k); if (o.a != null) g.globalAlpha *= o.a; g.drawImage(im, -ex * im.width / 1254, -ey * im.width / 1254); g.restore(); }
const EYE = { ds: [652, 692], gpt: [594, 515], gem: [640, 540], grok: [607, 535], qwen: [630, 509], kimi: [607, 542], claude: [594, 478], glm: [581, 530], dou: [643, 504] };
function stk(name, x, y, size, o = {}) { const im = IM['k:' + name]; if (!im) return; g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); g.scale(o.sc ?? 1, o.sc ?? 1); if (o.a != null) g.globalAlpha *= o.a; g.shadowColor = 'rgba(0,0,30,0.45)'; g.shadowBlur = 18; g.shadowOffsetY = 8; g.drawImage(im, -size / 2, -size / 2, size, size); g.restore(); }
// —— 文字和图形 ——
function txt(s, x, y, o = {}) {
  g.save(); g.font = font(o.size ?? 40, o.w ?? 800, o.fam ?? F.cn); g.textAlign = o.align ?? 'left'; g.textBaseline = o.base ?? 'alphabetic'; if (o.ls) g.letterSpacing = o.ls + 'px'; if (o.a != null) g.globalAlpha *= o.a;
  if (o.rot || o.sc != null || o.skew) { g.translate(x, y); if (o.rot) g.rotate(o.rot); if (o.skew) g.transform(1, 0, o.skew, 1, 0, 0); if (o.sc != null) g.scale(o.sc, o.sc); x = 0; y = 0; }
  if (o.sh) { g.shadowColor = o.sh[0]; g.shadowBlur = o.sh[1]; g.shadowOffsetX = o.sh[2] ?? 0; g.shadowOffsetY = o.sh[3] ?? 0; }
  g.lineJoin = 'round'; g.miterLimit = 2;
  if (o.stroke2) { g.lineWidth = o.sw2 ?? 16; g.strokeStyle = o.stroke2; g.strokeText(s, x, y); g.shadowColor = 'transparent'; }
  if (o.stroke) { g.lineWidth = o.sw ?? 8; g.strokeStyle = o.stroke; g.strokeText(s, x, y); g.shadowColor = 'transparent'; }
  g.fillStyle = o.fill ?? '#fff'; g.fillText(s, x, y); const wd = g.measureText(s).width; g.restore(); return wd;
}
function mw(s, size, w = 800, fam = F.cn, ls = 0) { g.save(); g.font = font(size, w, fam); if (ls) g.letterSpacing = ls + 'px'; const v = g.measureText(s).width; g.restore(); return v; }
function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function lg(x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => Array.isArray(c) ? gr.addColorStop(c[0], c[1]) : gr.addColorStop(i / (stops.length - 1), c)); return gr; }
function rg(x, y, r0, r1, stops) { const gr = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach((c, i) => Array.isArray(c) ? gr.addColorStop(c[0], c[1]) : gr.addColorStop(i / (stops.length - 1), c)); return gr; }
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function mixc(a, b, k) { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const ch = sh => Math.round(lerp(A >> sh & 255, B >> sh & 255, k)); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; }
function pattern(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); return g.createPattern(c, 'repeat'); }
const PAT = {};
function initPatterns() {
  PAT.stripe = pattern(64, 64, c => { c.strokeStyle = '#fff'; c.lineWidth = 16; c.lineCap = 'square'; [[-32, 32, 32, -32], [0, 64, 64, 0], [32, 96, 96, 32]].forEach(l => { c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(l[2], l[3]); c.stroke(); }); });
  PAT.dots = pattern(36, 36, c => { c.fillStyle = '#fff'; c.beginPath(); c.arc(9, 9, 5.5, 0, 7); c.fill(); c.beginPath(); c.arc(27, 27, 5.5, 0, 7); c.fill(); });
  PAT.grid = pattern(60, 60, c => { c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 0.75); c.lineTo(60, 0.75); c.moveTo(0.75, 0); c.lineTo(0.75, 60); c.stroke(); });
  PAT.scan = pattern(4, 4, c => { c.fillStyle = '#000'; c.fillRect(0, 2, 4, 2); });
}
function patFill(p, a, dx = 0, dy = 0, x = 0, y = 0, w = W, h = H) { g.save(); p.setTransform(new DOMMatrix().translate(dx, dy)); g.globalAlpha *= a; g.fillStyle = p; g.fillRect(x, y, w, h); g.restore(); }
function flashAt(t, t0, d = 0.16, col = '#fff', peak = 0.85) { if (t < t0 || t > t0 + d) return; const k = 1 - prog(t, t0, t0 + d); g.save(); g.globalAlpha = peak * k * k; g.fillStyle = col; g.fillRect(0, 0, W, H); g.restore(); }
function vignette(a = 0.5, r0 = 0.5, col = '4,8,30') { g.save(); g.fillStyle = rg(W / 2, H / 2, H * r0, H * 1.1, [`rgba(${col},0)`, `rgba(${col},${a})`]); g.fillRect(0, 0, W, H); g.restore(); }
function glow(x, y, r, col, a = 0.5) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg(x, y, 0, r, [rgba(col, a), rgba(col, 0)]); g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore(); }
function star4(x, y, r, rot = 0, col = '#fff', a = 1) { g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha *= a; g.fillStyle = col; g.beginPath(); for (let i = 0; i < 8; i++) { const q = i % 2 ? r * 0.26 : r, an = i * Math.PI / 4; g.lineTo(Math.cos(an) * q, Math.sin(an) * q); } g.closePath(); g.fill(); g.restore(); }
function burst(x, y, r, n, rot, col, a = 1, inner = 0.45) { g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha *= a; g.fillStyle = col; g.beginPath(); for (let i = 0; i < n * 2; i++) { const q = i % 2 ? r * inner : r, an = i * Math.PI / n; g.lineTo(Math.cos(an) * q, Math.sin(an) * q); } g.closePath(); g.fill(); g.restore(); }
function speedLines(seedT, cx, cy, o = {}) {
  const n = o.n ?? 80, R = rngOf((o.seed ?? 1) * 977 + Math.floor(seedT * (o.fps ?? 15))); g.save(); g.fillStyle = o.col ?? '#fff'; g.globalAlpha *= o.a ?? 0.7; g.beginPath();
  for (let i = 0; i < n; i++) { const an = R() * Math.PI * 2, r0 = (o.r0 ?? 420) * (0.75 + R() * 0.7), wd = (o.w ?? 0.012) * (0.35 + R()), r1 = 2400; g.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); g.lineTo(cx + Math.cos(an - wd) * r1, cy + Math.sin(an - wd) * r1); g.lineTo(cx + Math.cos(an + wd) * r1, cy + Math.sin(an + wd) * r1); g.closePath(); }
  g.fill(); g.restore();
}
function slam(s, x, y, size, t, t0, o = {}) {       // 大字砸下来
  if (t < t0) return; const p = tw(t, t0, o.d ?? 0.18, E.out5), sc = lerp(o.from ?? 2.6, 1, p);
  g.save(); g.translate(x, y); g.rotate(o.rot ?? 0); if (o.skew) g.transform(1, 0, o.skew, 1, 0, 0); g.scale(sc, sc); g.globalAlpha *= Math.min(1, p * 2.5) * (o.a ?? 1);
  if (o.cal && IM['x:' + o.cal]) calImg(o.cal, 0, -size * 0.36, size * (o.calH ?? 1.1), o.calCol ?? '#D0122C', 1, o.calOut ?? '#0A0606');      // 第 60 圈：GPT 出的毛笔字图（白字 alpha，染色）
  else txt(s, 0, 0, { size, w: 900, align: 'center', fill: o.fill ?? '#fff', stroke: o.stroke ?? INK, sw: o.sw ?? size * 0.09, stroke2: o.stroke2, sw2: o.sw2 ?? size * 0.2, fam: o.fam, ls: o.ls }); g.restore();
}
// 第 60 圈：毛笔字图（assets/fx/cal_*.webp，白色 + 墨的深浅做 alpha）。h = 字的高度；out = 外描一圈的墨色（8 个方向错位叠，null 不描）
function calImg(n, x, y, h, col, a = 1, out = null, maxW = 0) { const im = IM['x:' + n]; if (!im || a <= 0.01) return 0; let hh = h, ww = im.width * h / im.height; if (maxW && ww > maxW) { ww = maxW; hh = im.height * maxW / im.width; }
  g.save(); g.globalAlpha *= a; if (out) { const o = fxTint(n, out), d = Math.max(3, hh * 0.022); for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283; g.drawImage(o, x - ww / 2 + Math.cos(an) * d, y - hh / 2 + Math.sin(an) * d, ww, hh); } g.drawImage(o, x - ww / 2 + d * 1.6, y - hh / 2 + d * 2.2, ww, hh); }
  g.drawImage(col ? fxTint(n, col) : im, x - ww / 2, y - hh / 2, ww, hh); g.restore(); return ww; }
function bowl(x, y, s = 1, o = {}) {      // 饭碗：empty 时只剩碗
  g.save(); g.translate(x, y); g.scale(s, s); if (o.rot) g.rotate(o.rot); g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = INK;
  if (!o.empty) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-52, -4); g.bezierCurveTo(-50, -44, -22, -58, 0, -56); g.bezierCurveTo(26, -60, 52, -40, 52, -4); g.closePath(); g.fill(); g.stroke(); g.strokeStyle = '#C9D4EE'; g.lineWidth = 4; [[-22, -30], [4, -40], [24, -24], [-4, -20]].forEach(p => { g.beginPath(); g.arc(p[0], p[1], 7, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }); g.strokeStyle = INK; g.lineWidth = 6; }
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-62, -6); g.lineTo(62, -6); g.bezierCurveTo(60, 34, 34, 50, 0, 50); g.bezierCurveTo(-34, 50, -60, 34, -62, -6); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = '#4D6BFE'; g.lineWidth = 7; g.beginPath(); g.moveTo(-52, 12); g.quadraticCurveTo(0, 26, 52, 12); g.stroke(); g.restore();
}
function coin(x, y, r, rot = 0, a = 1) {     // token 硬币
  g.save(); g.translate(x, y); g.scale(Math.cos(rot) || 0.05, 1); g.globalAlpha *= a; g.fillStyle = '#FFC93C'; g.strokeStyle = '#B86A12'; g.lineWidth = Math.max(2, r * 0.14); g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#FFF3A8'; g.beginPath(); g.arc(0, 0, r * 0.7, 0, 7); g.fill(); txt('T', 0, r * 0.36, { size: r * 1.05, w: 900, fam: F.en, fill: '#B86A12', align: 'center' }); g.restore();
}
function sysPopup(x, y, w, a = 1, o = {}) {      // 「服务器繁忙」小窗口，(x,y) 中心
  const h = w * 0.62; g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); g.globalAlpha *= a; g.translate(-w / 2, -h / 2); g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 16; g.shadowOffsetY = 6; rr(0, 0, w, h, w * 0.05); g.fillStyle = '#F4F6FA'; g.fill(); g.shadowColor = 'transparent';
  g.save(); rr(0, 0, w, h, w * 0.05); g.clip(); g.fillStyle = '#D5DAE6'; g.fillRect(0, 0, w, h * 0.24); g.restore(); ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(w * (0.07 + i * 0.07), h * 0.12, w * 0.022, 0, 7); g.fill(); });
  g.fillStyle = '#FFB020'; g.beginPath(); g.moveTo(w * 0.14, h * 0.4); g.lineTo(w * 0.22, h * 0.7); g.lineTo(w * 0.06, h * 0.7); g.closePath(); g.fill(); txt('!', w * 0.14, h * 0.67, { size: w * 0.1, w: 900, fam: F.en, fill: '#fff', align: 'center' });
  txt('服务器繁忙', w * 0.28, h * 0.52, { size: w * 0.115, w: 800, fill: '#1B2440' }); txt('请稍后再试', w * 0.28, h * 0.78, { size: w * 0.095, w: 600, fill: '#5B6478' }); g.restore();
}
function panelSkew(x, y, w, h, sk, fill, stroke, lw = 4) { g.save(); g.beginPath(); g.moveTo(x + sk, y); g.lineTo(x + w + sk, y); g.lineTo(x + w - sk, y + h); g.lineTo(x - sk, y + h); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.lineJoin = 'round'; g.stroke(); } g.restore(); }

// 环境光：把立绘染上一点场地的颜色，脚下再压暗一点，让人物融进场景（按 立绘 + 场地 缓存）
const _envC = {};
function envOf(name, im, env) {
  const key = name + '|' + env.col + env.a + env.bot; if (_envC[key]) return _envC[key];
  const c = document.createElement('canvas'); c.width = im.naturalWidth || im.width; c.height = im.naturalHeight || im.height; const x = c.getContext('2d');
  x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-atop';
  x.fillStyle = env.col; x.globalAlpha = env.a; x.fillRect(0, 0, c.width, c.height); x.globalAlpha = 1;
  const gr = x.createLinearGradient(0, c.height * 0.55, 0, c.height); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, env.botCol || 'rgba(6,8,30,' + env.bot + ')'); x.fillStyle = gr; x.fillRect(0, c.height * 0.5, c.width, c.height * 0.5);
  if (env.top) { const g2 = x.createLinearGradient(0, 0, 0, c.height * 0.4); g2.addColorStop(0, env.top); g2.addColorStop(1, 'rgba(255,255,255,0)'); x.globalCompositeOperation = 'source-atop'; x.fillStyle = g2; x.fillRect(0, 0, c.width, c.height * 0.4); }
  return (_envC[key] = c);
}
const _pixC = {};
function pixOf(key, src) { if (_pixC[key]) return _pixC[key]; const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(src.width / 14)); c.height = Math.max(1, Math.round(src.height / 14)); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return (_pixC[key] = c); }

// 成年版按需加载（第 29 圈）：META_A 里该角色的条目并进 META.spr / SPRK，再加载图片；网页版图片在 js/assets_a_<角色>.js 里（ASSET_DATA）
const ADL = {};      // ADL[id] = { n, done, p: Promise }
function loadAdult(id) {
  if (ADL[id]) return ADL[id].p; if (!window.META_A) { ADL[id] = { n: 0, done: 0, p: Promise.resolve(false) }; return ADL[id].p; }
  const names = Object.keys(META_A.spr).filter(n => n.startsWith('fa_' + id + '_')); const st = ADL[id] = { n: names.length, done: 0 };
  const pack = () => new Promise(res => { if (!window.ADULT_PACKS || !ADULT_PACKS[id] || (window.ADULT_LOADED && ADULT_LOADED[id])) return res(); const sc = document.createElement('script'); sc.src = ADULT_PACKS[id]; sc.onload = sc.onerror = () => { (window.ADULT_LOADED = window.ADULT_LOADED || {})[id] = 1; res(); }; document.head.appendChild(sc); });
  st.p = !names.length ? Promise.resolve(false) : pack().then(() => window.ASSET_READY).then(() => Promise.all(names.map(n => { const src = 'assets/spr/' + n + '.webp'; return loadImg('s:' + n, (window.ASSET_DATA && ASSET_DATA[src]) || src).then(() => { st.done++; }); }))).then(() => { for (const n of names) { META.spr[n] = META_A.spr[n]; SPRK[n] = META_A.sprk[n]; } return true; });
  return st.p; }
const hasAdult = id => !!(window.META_A && META_A.spr['fa_' + id + '_stance']);
// 特效贴图：fxTex(名字, x, y, 宽, 旋转, 着色, 透明度, 加色混合, 纵向压缩)；着色 = 把白色贴图染成这个颜色（按名字 + 颜色缓存）
const FXC = {};
function fxTint(n, col) { const k = n + col; if (FXC[k]) return FXC[k]; const im = IM['x:' + n]; if (!im) return null; const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); x.globalCompositeOperation = 'destination-in'; x.drawImage(im, 0, 0); return FXC[k] = c; }
function fxTex(n, x, y, w, rot = 0, col = null, a = 1, add = false, sy = 1, flip = false) {
  const im = col ? fxTint(n, col) : IM['x:' + n]; if (!im || a <= 0.01) return; const h = w * im.height / im.width; g.save(); g.translate(x, y); g.rotate(rot); g.scale(flip ? -1 : 1, sy); g.globalAlpha *= Math.min(1, a); if (add) g.globalCompositeOperation = 'lighter'; g.drawImage(im, -w / 2, -h / 2, w, h); g.restore(); }
