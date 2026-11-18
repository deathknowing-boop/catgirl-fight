// ===== 战斗画面：场地、角色程序化动作、飞行物、特效、血条界面 =====
const NATIVE = { ds_point: -1, gem_sneak: -1 };            // 这几张立绘原图朝左，其余按朝右处理
const FLAT = { ds_collapse: 1, kimi_sleep: 1, dou_lose: 1 }, isFlat = n => FLAT[n] || /^fa?_.*_(down|bounce|pinned|kd[2-4])$/.test(n);   // 本身就是倒地 / 坐地的图，倒地时不用再转 90°
const hOf = (f, name) => f.ch.h * (SPRK[name] ?? 1) * (f.mixK || 1);      // mixK：成年版对 Q 版时，Q 版画面放大一点（第 42 圈，判定不变）
// 动作姿势图（f_<角色>_<姿势>）：有就用，没有就退回原来的立绘
const fp = (f, k) => { const n = (f.skin === 'a' ? 'fa_' : 'f_') + f.id + '_' + k; return META.spr[n] ? n : null; };
// 成年版缺的姿势：退回她自己最接近的成年版单帧（不混用 Q 版）
const AFB = [[/^(walk\d|step)$/, ['step', 'walk1', 'stance']], [/^(jab\d?|cjab|njlp|fb\d|throw1|v\d|x\d)$/, ['jab3', 'jab', 'stance']], [/^(kick\d?|nslk|nshk|fkick|njlk|njhk|chamber|spin\d)$/, ['kick3', 'kick', 'fkick']],
  [/^(upper\d?|dp\d|nchp|throw2)$/, ['upper3', 'upper']], [/^(heavy\d?|nshp|njhp|rush\d|throw3|cA\d|cB\d|cC\d|ymid|yfwd|ylv2|w\d)$/, ['heavy3', 'heavy', 'jab3']], [/^(hit\d|hurt\d?|hurtbig|gstun|held|z4)$/, ['hit2', 'hurt', 'hurt2']],
  [/^(down|bounce|slump|pinned)$/, ['down', 'bounce']], [/^(crouch\d?|cguard|sweep|smashland|rise|wake|spx\d)$/, ['crouch', 'crouch2', 'rise']], [/^(dash|drush)$/, ['dash', 'drush']], [/^(air|jump|smash|roll|yair|hoist)$/, ['jump', 'air']],
  [/^(guard|dguard|dparry|beg\d)$/, ['guard', 'dguard']], [/^(win|eat\d|z\d)$/, ['win', 'stance']], [/^(windup|dimpact)$/, ['windup', 'heavy1']]];
function adultName(f, name) {
  if (!name || name.startsWith('fa_')) return name;
  const m = /^f_[a-z]+_(.+)$/.exec(name), k = m ? m[1] : (/(lose|collapse|sleep|down)/.test(name) ? 'down' : /(win|cheer|happy)/.test(name) ? 'win' : /(hurt|hit|cry)/.test(name) ? 'hurt' : 'stance');
  const own = fp(f, k); if (own) return own;
  for (const [re, L] of AFB) if (re.test(k)) for (const c of L) { const n = fp(f, c); if (n) return n; }
  return fp(f, 'stance') || name; }
// 第 67 圈（用户反馈：升龙动作很怪）：所有 623 升龙系换成新画的升龙帧 sr11–14（下蹲 → 起跳 → 旋身上冲 → 顶点）/ sr21–24（顶点停顿 → 下落 → 落地 → 收招），有帧就用
const DPID = { dp: 1, dpk: 1 };      // 火焰层：升龙拳 dp + 大肥鱼鲸鱼顶 dpk（B 提醒：623+脚 的倒翻踢 / 后跃斜爪 / 跑抓不算）
const isDP = f => f.st === 'sp' && f.mv && !!DPID[f.mv.id], isDPP = f => f.st === 'sp' && f.mv && f.mv.id === 'dp';      // isDPP：换升龙拳新帧 sr 只认 dp
const SHAKE_OLD = /[?&]shake=old/.test(typeof location !== 'undefined' ? location.search : '');
const SR21_TILT = -0.32;      // sr21 斜身大约往前倾 18°，摆正用
const DPALT = { ds: ['sg53', 'sg54'], gpt: ['sg43', 'sg44'] };      // 重 / EX 升龙顶点后：[顶点翻踢, 下落]
function pose(s, f) {
  f._rv = 0; f._arc = null;      // 第 79 圈：回身帧（镜像）/ 回旋弧，pose0 的 MSEQ 段设置
  if (s.cine && s.cine.live && typeof LIVE3 !== 'undefined') { const lp = LIVE3.pose(s, f); if (lp) return lp; }      // 第 72 圈：实时三级乱舞接管两个人的帧和位移
  if (typeof MEME !== 'undefined') { const mp = MEME.pose(s, f); if (mp) return mp; }      // D 代理：大肥鱼梗招（处决 / 钢盆狙击 / 转圈舞，js/meme_ds.js）
  const P0 = pose0(s, f); if (NOSIG || !isDPP(f)) return P0; const F = k => fp(f, k); if (!F('sr11')) return P0;
  const t = f.t, M = f.mv; let n;
  if (M.land) { const u = t - M.land; n = u < 8 ? F('sr23') : F('sr24'); }
  else if (f.y <= 0.5 && t < 6) n = t < 3 ? F('sr11') : F('sr12');
  else if (f.vy > 650) n = f.vy > 1150 ? F('sr12') : F('sr13');
  else if (DPALT[f.id] && (M.v === 'b' || M.ex) && F(DPALT[f.id][0])) n = F(f.vy > -250 ? DPALT[f.id][0] : DPALT[f.id][1]);      // 第 67 圈（B）：重 / EX 版顶点后接原专属翻踢（大肥鱼倒翻鲸尾踢、GPT 龙尾翻踢），轻版走新升龙
  else if (f.vy > -250) n = F('sr14');
  else if (f.vy > -700) n = F('sr21'); else n = F('sr22');
  if (!n) return P0; let rot = f.vy > 650 && f.y > 0.5 ? f.face * 0.08 * Math.sin(t * 0.9) : 0, ghost = null;
  if (n === F('sr21') && f.vy > -520 && F('sr14')) { const q = E.out3(Math.min(1, (-250 - f.vy) / 270)); rot = SR21_TILT * f.face * (1 - q); ghost = { n: F('sr14'), dx: 0, sx: 1, a: 0.55 * (1 - q) }; }      // 第 68 圈：竖直顶点 sr14 → 斜身 sr21 不再硬切：sr21 先摆正再慢慢倒回斜身，叠一层淡出的 sr14
  return Object.assign({}, P0, { name: n, rot, ghost, dx: 0, dy: 0, sx: 1, sy: 1, skew: 0, smear: f.vy > 900 ? { key: 'upper', age: t } : null });
}
function pose0(s, f) {
  const S = f.ch.spr, P = k => S[k] || S.idle, t = f.t, face = f.face, stance = fp(f, 'stance') || S.idle, hs = s.hitstop > 0 ? 1 : 0;
  let name = stance, dx = 0, dy = 0, rot = 0, sx = 1, sy = 1, lie = 0, skew = 0, smear = null; let idleX = null;
  const hop = Math.abs(Math.sin(s.f * 0.105 + f.idx * 1.7));
  switch (f.st) {
    case 'intro': if (!NOSIG && fp(f, 'wn21')) { name = t > 78 ? stance : fp(f, t < 20 ? 'wn21' : t < 40 ? 'wn22' : t < 60 ? 'wn23' : 'wn24') || stance; break; }      // 第 51 圈：GPT 出的专属开场四帧（没有就走老的从天而降）
    { name = t > 78 ? stance : t >= 30 && t < 44 && fp(f, 'crouch') ? fp(f, 'crouch') : P('intro'); const k = clamp(t / 30); dy = -(1 - E.in2(k)) * 760; const q = clamp((t - 30) / 16); sy = 1 - Math.sin(q * Math.PI) * 0.16; sx = 1 + Math.sin(q * Math.PI) * 0.12; break; }
    case 'idle': if (fp(f, 'idle1') && !(f.landT < 8)) { const k = Math.floor((s.f + f.idx * 17) / 13) % 4; name = fp(f, 'idle' + [1, 2, 3, 2][k]) || name; if ((s.f + f.idx * 17) % 13 < 3) idleX = fp(f, 'idle' + [2, 1, 2, 3][k]); break; }      /* 第 40 圈：成年版待机呼吸 4 帧（1-2-3-2 循环，第 4 帧呼气帧和第 1 帧太像，不用） */
    case 'idle': dy = 0; sy = 1.0075 + Math.sin(s.f * 0.105 + f.idx * 1.7) * 0.0075; sx = 1 - Math.sin(s.f * 0.105 + f.idx * 1.7) * 0.004;      /* 呼吸：脚不动，只以脚底为锚点上下微伸缩 */ if (f.landT < 8) { const q = f.landT / 8; if (fp(f, 'crouch') && f.landT < 6) name = fp(f, 'crouch'); else { sy = 1 - Math.sin(q * Math.PI) * 0.12; sx = 1 + Math.sin(q * Math.PI) * 0.09; } dy = 0; skew = 0; } break;
    case 'walk': { const fwd = Math.sign(f.vx) === face, st = fp(f, 'step'); if (st && Math.floor(f.walkT / 9) % 2 === 0) name = st; dy = 0; sy = 1 - Math.abs(Math.sin(f.walkT * 0.35)) * 0.025; skew = (fwd ? 0.05 : -0.04) * face; break; }
    case 'dash': name = fp(f, 'dash') || (P('dash') === S.idle ? S.walk[0] : P('dash')); if (f.mv && f.mv.back) { name = stance; skew = -0.16 * face; } dy = -6; break;
    case 'jump': if (f.airAtk) { name = fp(f, 'fkick') || P('jump'); rot = face * (fp(f, 'fkick') ? clamp(-f.vy / 4200, -0.25, 0.3) : 0.32); smear = { key: 'fkick', age: f.airT }; } else { name = fp(f, 'jump') || S.jump || stance; sy = 1 + clamp(f.vy / 1400, -1, 1) * 0.08; sx = 1 - clamp(f.vy / 1400, -1, 1) * 0.05; } break;
    case 'light': { const A = f.atk, key = NKEY[f.atkK] || 'jab', an = fp(f, OWNK[f.atkK] || '-') || fp(f, key), reach = key === 'kick' ? 52 : 40;
      const pre = fp(f, key === 'kick' ? 'chamber' : key === 'upper' ? 'crouch' : 'windup');       // 出手前的过渡帧：蓄拳 / 提膝 / 下蹲
      if (t < A.su) { const q = t / A.su; if (pre && an) name = pre; dx = -face * 16 * q; skew = -0.08 * q * face; if (!pre) { sy = 1 - 0.05 * q; sx = 1 + 0.03 * q; } }
      else if (t < A.su + A.ac + 3) { name = an || P('light'); const q = E.out3(clamp((t - A.su + 1) / 2)); dx = face * reach * q; if (key === 'upper') dy = -24 * q; if (!an) rot = face * 0.09; smear = { key, age: t - A.su }; }
      else { const q = clamp((t - A.su - A.ac - 3) / Math.max(1, A.rc - 3)); name = q < 0.4 ? (an || P('light')) : q < 0.75 && key === 'kick' && pre && an ? pre : stance; dx = face * reach * (1 - E.out2(q)); if (key === 'upper' && q < 0.4) dy = -24 * (1 - q / 0.4); }
      break; }
    case 'heavy': { const A = f.atk, hk = NKEY[f.atkK] || 'heavy', an = fp(f, OWNK[f.atkK] || '-') || fp(f, hk);
      if (t < A.su) { const q = E.out2(t / A.su), pre = an && fp(f, hk === 'kick' ? 'chamber' : hk === 'upper' ? 'crouch' : 'windup'); if (pre) name = pre; dx = -face * 38 * q; skew = -(pre ? 0.1 : 0.2) * q * face; if (!pre) { sy = 1 - 0.1 * q; sx = 1 + 0.06 * q; } }
      else if (t < A.su + A.ac + 4) { name = an || P('heavy'); dx = face * 92 * E.out3(clamp((t - A.su + 1) / 3)); if (!an) rot = face * 0.2; sy = 1.04; if (hk === 'upper') dy = -30; smear = { key: 'heavy', age: t - A.su }; }
      else { const q = clamp((t - A.su - A.ac - 4) / Math.max(1, A.rc - 4)); name = q < 0.5 ? (an || P('heavy')) : stance; dx = face * 92 * (1 - E.out2(q)); if (!an && q < 0.5) rot = face * 0.2 * (1 - q * 2); }
      break; }
    case 'sp': case 'su': { name = P(f.st); const id = f.mv ? f.mv.id : '';
      if (id === 'popup') { dy = -Math.sin(clamp(t / 20) * Math.PI) * 22; dx = t >= 14 ? face * 26 * (1 - clamp((t - 14) / 16)) : 0; }
      else if (id === 'pounce') { if (t < 8) { sy = 1 - 0.16 * (t / 8); sx = 1 + 0.1 * (t / 8); } else if (f.y > 0) rot = face * 0.5; }
      else if (id === 'three') { const k = ((t - 1) % 11) / 11; dy = -Math.sin(k * Math.PI) * 14; rot = -face * 0.04; }
      else if (id === 'axe' || (id === 'revenge' && t >= 6)) { const t0 = id === 'axe' ? 22 : 12, t1 = t0 + 6, an = fp(f, 'heavy'); name = an && t >= t0 && t < t1 + 14 ? an : stance;
        if (t < t0) { const k = t / t0; skew = -0.3 * k * face; dx = -face * 24 * k; sy = 1 - 0.08 * k; } else if (t < t1) { if (!an) rot = face * 0.5; dx = face * 70; } else { const k = 1 - clamp((t - t1) / 24); if (!an) rot = face * 0.5 * k; dx = face * 70 * k; } }
      else if (id === 'scroll') rot = face * 0.09 * Math.sin(clamp(t / 40) * Math.PI);
      else if (id === 'script' || id === 'alts' || id === 'tea') { dy = -Math.sin(clamp(t / 26) * Math.PI) * 24; rot = face * 0.1 * Math.sin(clamp(t / 26) * Math.PI); }
      else if (id === 'counter') { if (f.mv.hit) { name = fp(f, 'jab') || name; dx = face * 70 * (1 - clamp((t - f.mv.hit) / 22)); } else { name = fp(f, 'guard') || name; sy = 1 + Math.sin(t * 0.4) * 0.01; } }
      else if (id === 'wave') { if (t < 26) { dx = Math.sin(t * 2.1) * 3; } else { name = P('jump'); dy = -Math.sin(clamp((t - 26) / 30) * Math.PI) * 40; } }
      else if (id === 'flash') { dy = -Math.abs(Math.sin(t * 0.25)) * 14; if (t >= 22 && t < 70) { name = fp(f, (Math.floor((t - 22) / 9) % 2) ? 'upper' : 'jab') || name; dx = face * 30; } }
      else if (id === 'beam') { rot = -face * 0.07; dx = -face * (8 + Math.sin(t * 1.9) * 4); }
      else if (id === 'drop' || id === 'lock' || id === 'rain' || id === 'fix' || id === 'style') { dy = -Math.sin(clamp(t / 30) * Math.PI) * 18; }
      break; }
    case 'hit': { const an = (f.combo % 2 === 0 && fp(f, 'hurt2')) || fp(f, 'hurt'); name = an || P('hit'); /* 连着挨打时两种受击姿势轮着来 */ const lv = f.hitLv || 1; dx = hs ? Math.sin(s.f * 2.9) * [4, 8, 12][lv - 1] : 0; skew = -(0.08 + 0.05 * lv) * face * Math.max(0, 1 - t / (6 + 4 * lv)); if (!an) rot = -face * 0.15; if (t < 5) { const q = 1 - t / 5; sx = 1 + (0.04 + 0.04 * lv) * q; sy = 1 - (0.04 + 0.035 * lv) * q; } break; }
    case 'block': name = fp(f, 'guard') || P('block'); dx = -face * 6 + (hs ? Math.sin(s.f * 2.9) * 5 : 0); skew = -0.05 * face; break;
    case 'launch': { const an = fp(f, 'air'); name = an || P('hit'); rot = an ? -face * clamp(f.vy / 3600, -0.45, 0.45) : -face * Math.min(1.5, 0.3 + t * 0.07); if (f.skin === 'a' && an && (f.gbOK || f.wbDone || f.gbDone) && f.y > 60) rot = -face * (t * 0.21 % 6.283);      /* 成年版被重击打飞：整个人在空中翻一圈（第 30 圈） */ if (hs) dx = Math.sin(s.f * 2.9) * [4, 8, 12][(f.hitLv || 2) - 1]; break; }
    case 'down': case 'ko': { const an = fp(f, 'down'); name = an || P('down'); lie = 1; if (f.y <= 0) { if (t < 12) dy = -Math.sin(t / 12 * Math.PI) * 38; else if (t < 20) dy = -Math.sin((t - 12) / 8 * Math.PI) * 11; } break; }      /* 落地弹一下、再小弹一下、躺平 */
    case 'getup': { const an = fp(f, 'kd4') || fp(f, 'down'), up = fp(f, 'rise'); if (t < 5) { name = an || P('down'); lie = 1; } else if (up && t < 12) name = up; else if (up) name = fp(f, 'crouch') || stance; else { const q = clamp((t - 5) / 11); sy = 0.62 + 0.38 * E.out3(q); sx = 1.12 - 0.12 * q; } break; }
    case 'freeze': name = fp(f, 'dizzy') || fp(f, 'hurt') || (P('stun') === S.idle ? P('hit') : P('stun')); break;
    case 'stun': name = fp(f, 'dizzy') || (P('stun') === S.idle ? (fp(f, 'hurt') || P('hit')) : P('stun')); skew = Math.sin(t * 0.3) * 0.07; break;
    case 'sleep': name = S.sleep || P('down'); break;
    case 'win': if (!NOSIG && fp(f, 'wn11')) { name = fp(f, t < 24 ? 'wn11' : ['wn12', 'wn13', 'wn14', 'wn14'][Math.floor((t - 24) / 16) % 4]) || fp(f, 'win'); break; }      // 第 51 圈：胜利庆祝四帧（扒饭 / 舔爪 / 开扇 / 扛斧大笑……）
      name = fp(f, 'win') || P('win'); dy = -Math.abs(Math.sin(t * 0.12)) * 28; break;
    case 'lose': if (!NOSIG && fp(f, 'wn41')) { name = fp(f, 'wn4' + (t < 14 ? 1 : t < 28 ? 2 : t < 44 ? 3 : 4)); break; }      // 第 53 圈：败北四帧（失力 → 跪 → 定格）
      name = S.lose || fp(f, 'hurt') || P('hit'); break;
    case 'taunt': { const k = t < 16 ? 1 : t < 34 ? 2 : t < 52 ? 3 : 4; name = (!NOSIG && fp(f, 'wn3' + k)) || fp(f, 'win') || P('win'); if (t < 4) { sx = 1 + 0.04 * (1 - t / 4); sy = 1 - 0.03 * (1 - t / 4); } break; }      // 第 53 圈：挑衅四帧（Y 键）
  }
  // 逐帧动作：有 f_<角色>_<招>1..4 这四张连续帧时按帧播（前摇两帧 → 命中帧停住 → 收招一帧），没有就用上面的单张姿势
  const A4 = (k, n) => fp(f, k + n);
  if (f.st === 'walk' && A4('walk', 1)) { name = A4('walk', 1 + Math.floor(f.walkT / 7) % 4) || name; dy = 0; dx = 0; }
  else if ((f.st === 'light' || f.st === 'heavy') && f.atk) { const A = f.atk, key = NKEY[f.atkK] || (f.st === 'heavy' ? 'heavy' : 'jab');
    if (A4(key, 3)) { const e = A.su + A.ac + 3; name = (t < A.su * 0.5 ? A4(key, 1) : t < A.su ? A4(key, 2) : t < e ? A4(key, 3) : (t - e) < Math.max(4, (A.rc - 3) * 0.55) ? A4(key, 4) : stance) || name; skew = 0; sx = 1; sy = 1; rot = 0; } }
  else if (f.st === 'hit' && A4('hit', 2) && !(f.combo % 2 === 0 && fp(f, 'hurt2'))) { const lv = f.hitLv || 1; name = (t < (lv > 1 ? 2 : 3) ? A4('hit', lv > 1 ? 2 : 1) : t < (lv > 1 ? 16 : 8) ? A4('hit', 2) : f.stun > 5 ? A4('hit', 3) : A4('hit', 4)) || name; rot = 0; }      /* 轻击只晃头；重一点的在大后仰（hit2）停久 */
  // 第 35 圈：加帧（SF6_GAP 第 5 步）。有专用多帧序列（成年版大肥鱼起）时按「前摇 / 出手 / 收招」三段分配，段内按权重，换帧那一步垫一层上一帧的淡影（帧间补间），出手第一步把前一帧拖在身后当残形（smear）
  let ghost = idleX ? { n: idleX, a: 0.5 * (1 - ((s.f + f.idx * 17) % 13) / 3), dx: 0, sx: 1 } : null;      // 待机换帧的头 3 步垫上一帧的淡影，免得硬切
  const SQ = (f.st === 'light' || f.st === 'heavy') && f.atk && SEQS[f.atkK];
  if (SQ && fp(f, SQ.p + SQ.a)) { const A = f.atk, r = seqAt(SQ, A, t), cur = r.done ? null : (fp(f, SQ.p + r.i) || (r.i > SQ.a ? (t < A.su + A.ac + A.rc * 0.4 ? fp(f, SQ.p + SQ.a) : stance) : null));      /* 收招帧还没出图时：出手帧停一会儿再回站姿 */
    if (r.done) { name = stance; rot = 0; skew = 0; sx = 1; sy = 1; dy = 0; dx = 0; smear = null; }
    else if (cur) { name = cur; rot = 0; skew = 0; sx = 1; sy = 1; dy = 0; dx = face * (SQ.dx ? SQ.dx[r.i - 1] : 0); smear = null;
      if (r.fresh && r.prev && !s.hitstop && (r.i === SQ.a || r.i > SQ.a + 1)) { const pv = fp(f, SQ.p + r.prev); if (pv) ghost = { n: pv, a: r.i === SQ.a ? 0.42 : 0.3, dx: face * ((SQ.dx ? SQ.dx[r.prev - 1] : 0) - (SQ.dx ? SQ.dx[r.i - 1] : 0)) - (r.i === SQ.a ? face * 18 : 0), sx: r.i === SQ.a ? 1.06 : 1 }; } } }
  else if (f.st === 'hit' && (f.hitLv || 1) >= 2 && fp(f, 'hb1')) { name = (t < 2 ? fp(f, 'hb1') : t < 7 ? fp(f, 'hb2') : f.stun > 8 ? fp(f, 'hb3') : fp(f, 'hb4')) || name; rot = 0; skew = 0; dx = -face * (t < 2 ? 40 : 14);      /* 重受击姿势链：先折（顿帧里一直是这一帧）→ 后仰 → 膝盖失力 → 撑住 */
    if (t === 2 || t === 7) ghost = { n: fp(f, t === 2 ? 'hb1' : 'hb2'), a: 0.3, dx: face * 10, sx: 1 }; }
  else if (f.st === 'launch' && fp(f, 'kd1') && f.vy < 120 && f.y < 260) { name = fp(f, 'kd1'); rot = 0; }      /* 倒地链：落下前摆成平躺的「摔」 */
  else if ((f.st === 'down' || f.st === 'ko') && fp(f, 'kd2') && f.y <= 0) { lie = 1; name = (t < 5 ? fp(f, 'kd2') : t < 14 ? fp(f, 'kd3') : fp(f, 'kd4')) || name; if (t < 5) { const q = Math.sin(t / 5 * Math.PI); sy = 1 - 0.16 * q; sx = 1 + 0.1 * q; } }      /* 先砸地压扁 → 弹起 → 躺平（kd 图本身就是躺着画的，弹跳高度照旧） */
  { const mq = (f.st === 'light' || f.st === 'heavy') && f.atk && MSEQ[f.atkK];      /* 第 68 圈（H）：角色专属普通技（ml / mh / mk 图，gtools/norm_prompts.py），有图就盖掉上面的借用帧 */
    if (mq && fp(f, mq[1])) { const A = f.atk, e = A.su + A.ac + 2, nn = t < A.su ? mq[0] : t < e ? mq[1] : (t - e) < A.rc * 0.6 ? mq[2] : null; const n0 = nn && fp(f, nn);
      name = n0 || stance; rot = 0; skew = 0; sx = 1; sy = 1; dy = 0; dx = 0; smear = null; if (t === A.su && !s.hitstop && fp(f, mq[0])) ghost = { n: fp(f, mq[0]), a: 0.38, dx: -face * 18, sx: 1 }; const SP = !/[?&]spin=0/.test(location.search) && SPIN[f.id] && SPIN[f.id][f.atkK]; if (SP && t < A.su && t >= Math.floor(A.su * SP.k) && fp(f, mq[0])) { const nb = SP.n && fp(f, SP.n); name = nb || fp(f, mq[0]); f._rv = nb ? 0 : 1; ghost = null; } if (SP && t >= A.su - 1 && t < e + 3) f._arc = { age: t - A.su + 1, typ: SP.arc }; } }      /* 第 79 圈：回身招在起手后半段镜像成背身帧，出手时画回旋弧（SPIN 表） */
  // —— 人才有的动作：蹲、蹲防、蹲攻击、翻滚、投、被抓 ——
  const cr = fp(f, 'crouch2') || fp(f, 'crouch'), crSy = cr ? 1 : 0.72, F = k => fp(f, k); let ay;
  if (f.st === 'crouch' || (f.st === 'block' && f.cblk)) { name = (f.st === 'block' ? F('cguard') : t < 3 ? F('crouch1') : null) || cr || stance; dx = f.st === 'block' ? -face * 6 + (hs ? Math.sin(s.f * 2.9) * 5 : 0) : 0; dy = 0; rot = 0; skew = 0; sx = 1; sy = crSy; }
  else if ((f.st === 'light' || f.st === 'heavy') && f.atk && f.atk.crouch && !f.atk.up && CSEQ[f.atkK] && F(CSEQ[f.atkK][1])) { const A = f.atk, q = CSEQ[f.atkK], e = A.su + A.ac + 2; name = (t < A.su ? F(q[0]) : t < e ? F(q[1]) : (t - e) < A.rc * 0.6 ? F(q[2]) : null) || cr || stance; rot = 0; skew = 0; sx = 1; sy = crSy; dy = 0; dx = 0; smear = null; if (t === A.su && !s.hitstop && F(q[0])) ghost = { n: F(q[0]), a: 0.35, dx: -face * 14, sx: 1 }; }      /* 第 69 圈（H2）：专属蹲轻拳 / 蹲轻脚 / 扫腿（mc / ms 图，gtools/norm2_prompts.py） */
  else if ((f.st === 'light' || f.st === 'heavy') && f.atk && f.atk.crouch && !f.atk.up) { const A = f.atk, sw = f.atkK === 'sweep' || f.atkK === 'chk', lowk = f.atkK === 'clk', reach = sw ? 46 : 34; name = cr || stance; rot = 0; skew = 0; sx = 1; sy = crSy; dy = 0;
    if (sw && F('sw3')) { dx = 0; name = (t < A.su * 0.45 ? F('sw1') : t < A.su ? F('sw2') : t < A.su + A.ac + 4 ? F('sw3') : t < A.su + A.ac + A.rc * 0.6 ? F('sw4') : cr) || name; sy = 1; if (t >= A.su && t < A.su + A.ac + 3) smear = { key: 'sweep', age: t - A.su }; }      /* 第 42 圈：扫腿 4 帧（成年版） */
    else if (t < A.su) dx = -face * 10 * t / A.su; else if (t < A.su + A.ac + 3) { const an = F(sw ? 'sweep' : 'cjab'); if (an) { name = an; dx = lowk ? face * 16 : 0; } else dx = face * reach; if (sw) rot = -face * 0.1; smear = { key: sw || lowk ? 'sweep' : 'cjab', age: t - A.su, small: lowk }; } else dx = face * reach * (1 - clamp((t - A.su - A.ac - 3) / Math.max(1, A.rc - 3))); }
  else if (f.st === 'roll') { name = F('roll') || cr || stance; const q = clamp(t / 24); rot = (f.mv ? f.mv.dir : face) * q * Math.PI * 2; ay = 0.5; dy = -hOf(f, name) * 0.5 * crSy; sy = crSy; sx = 1; skew = 0; dx = 0; }
  else if (f.st === 'throw' && F('v1')) { const M = f.mv || {}; rot = 0; skew = 0; sx = 1; sy = 1; dx = 0; name = (!M.got ? F('v1') : (t - M.got) < 4 ? F('v2') : (t - M.got) < 12 ? (F('lift') || F('v2')) : (t - M.got) < 22 ? F('v3') : F('v4')) || name; }      // 第 80 圈：成年版插一帧「拎」lift      // 大肥鱼 / 哈基米的专属投（v 图：拎起来摇 / 抡圈）
  else if (f.st === 'throw' && F('mt1')) { const M = f.mv || {}, k = t - (M.got || 0); rot = 0; skew = 0; sx = 1; sy = 1; dx = 0; name = (!M.got ? F('mt1') : k < 5 ? F('mt2') : k < 14 ? (F('lift') || F('mt2')) : k < 28 ? F('mt3') : F('mt4')) || name; }      // 第 80 圈：成年版插一帧「拎」lift      // 第 69 圈（H2）：专属投（mt 图：抓 → 拎 → 摔 → 收）
  else if (f.st === 'throw') { const M = f.mv || {}; rot = 0; skew = 0; sx = 1; sy = 1;
    if (!M.got) { name = F('throw1') || fp(f, 'jab3') || fp(f, 'jab') || stance; dx = F('throw1') ? 0 : face * 24 * Math.min(1, t / 3); }
    else { const k = t - M.got; name = (F('throw2') ? (k < 14 ? F('throw2') : k < 28 ? F('throw3') : F('throw4')) : (k < 7 ? fp(f, 'heavy1') : k < 14 ? fp(f, 'heavy2') : k < 28 ? fp(f, 'heavy3') : fp(f, 'heavy4'))) || fp(f, 'heavy') || stance; dx = 0; } }
  else if (f.st === 'held') { name = F('hurtbig') || fp(f, 'hurt2') || fp(f, 'hurt') || P('hit'); dy = -(f.hy || 0); rot = -face * 0.15 * clamp((f.hy || 0) / 130); dx = hs ? Math.sin(s.f * 2.9) * 6 : 0; }
  // —— 必杀技逐帧（m–s 图）+ 受击补帧（t 图）：有图才用，没图就是上面的单张姿势 ——
  const still = () => { rot = 0; skew = 0; dy = 0; dx = 0; sx = 1; sy = 1; };
  if (f.st === 'sp' && f.mv) { const id = f.mv.id;
    if (id === 'dp' || id === 'dpk') { const an = t < 5 ? F('dp1') : f.y > 0 ? (f.vy > 500 ? F('dp2') : f.vy > -300 ? F('dp3') : F('dp4')) : F('dp1'); still();
      name = an || (t < 5 ? (fp(f, 'upper1') || cr) : f.y > 0 ? (fp(f, 'upper3') || fp(f, 'upper')) : (fp(f, 'upper4') || stance)) || name; if (f.y > 0 && t < 20) smear = { key: 'upper', age: t - 5 }; }
    else if (id === 'slide') { const H = f.mv.v === 'b' || f.mv.ex, dur = H ? 20 : 14, act = t >= 8 && t < 8 + dur && !f.mv.hit; still();
      name = (t < 8 ? F('rush1') : act ? (Math.floor(t / 3) % 2 ? F('rush3') : F('rush2')) : F('rush4')) || (t < 8 ? cr : fp(f, 'dash')) || name; if (act && !F('rush2')) { rot = -face * 0.25; dy = 20; } }
    else if (id === 'moyu') { const T = f.mv.v === 'b' ? 90 : 60; still(); name = (t < 6 ? F('spx1') : t < T - 2 ? (Math.floor(t / 30) % 2 ? F('spx3') : F('spx2')) : F('spx4')) || P('su') || name; }
    else if (id === 'yarn' || (id === 'popup' && F('fb1'))) { const r0 = id === 'popup' ? 14 : 12; still(); name = (t < r0 * 0.5 ? F('fb1') : t < r0 ? F('fb2') : t < r0 + 8 ? F('fb3') : F('fb4')) || fp(f, 'jab') || name; }
    else if (id === 'steal') { still(); name = (t < 3 ? F('spx1') : !f.mv.got ? (t < 14 ? F('spx2') : F('spx4')) : t - f.mv.got < 12 ? F('spx3') : F('spx4')) || fp(f, 'jab') || name; }
    else if (id === 'pounce' && F('rush1')) { still(); name = (t < 8 ? F('rush1') : f.y > 0 ? (f.vy > 0 ? F('rush2') : F('rush3')) : F('rush4')) || name; } }
  else if (f.st === 'hit' && (f.hitLv || 1) >= 3 && t < 14 && F('hurtbig') && !F('hb1')) { name = F('hurtbig'); rot = 0; }
  else if (f.st === 'block' && !f.cblk && F('gstun')) { name = f.stun > 3 ? F('gstun') : (fp(f, 'guard') || name); rot = 0; skew = 0; }
  else if ((f.st === 'down' || f.st === 'ko') && f.y <= 0 && t < 12 && F('bounce') && !F('kd2')) { name = F('bounce'); }
  else if (f.st === 'getup' && t >= 8 && F('wake')) { name = F('wake'); lie = 0; sx = 1; sy = 1; }
  // —— 斗气系统的姿势（f 图：架招 / 精防 / 绿冲 / 算力冲击）和受害者 u 图（被拎起 / 举高 / 按地 / 贴墙）——
  if (f.st === 'parry') { still(); name = (f.id === 'ds' ? (F('beg3') || F('z4')) : null) || (s.f - (f.pp || -99) < 18 ? F('dparry') : F('dguard')) || fp(f, 'guard') || name; }      // 大肥鱼的架招 = 举盆挡
  else if (f.st === 'idle' && s.f - (f.pp || -99) < 16 && F('dparry')) { still(); name = F('dparry'); }
  else if (f.st === 'drush') { still(); const sk = f.skid ? t - f.skid : -1;      /* 第 42 圈：冲到跟前刹车 → 刹停姿势（有 dr1-4 图用图，没有就把冲刺帧往后仰、压低一点） */
    if (F('dr2')) name = (t < 3 ? F('dr1') : sk < 0 ? F('dr2') : sk < 9 ? F('dr3') : F('dr4')) || name;
    else { name = F('drush') || fp(f, 'dash') || name; skew = 0.06 * face; if (sk >= 0) { const q = clamp(1 - sk / 12); name = (sk < 9 ? F('drush') || fp(f, 'dash') : fp(f, 'guard') || F('dguard')) || name; skew = -0.07 * face * q; sy = 1 - 0.05 * q; sx = 1 + 0.03 * q; dx = -face * 14 * q; } } }
  else if (f.st === 'impact') { const A = f.atk; still(); if (t < A.su) { name = fp(f, 'heavy1') || fp(f, 'windup') || name; dx = -face * 20 * (t / A.su) + (t % 4 < 2 ? 2 : -2); } else name = (t < A.su + A.ac + 10 ? F('dimpact') : null) || fp(f, 'heavy3') || fp(f, 'heavy') || name; }
  else if (f.st === 'drev') { still(); name = F('dparry') || fp(f, 'jab3') || fp(f, 'jab') || name; }
  else if ((f.st === 'light' || f.st === 'heavy') && f.atkK === 'mid') { const A = f.atk; still(); name = (t < A.su ? (fp(f, 'heavy1') || fp(f, 'windup')) : (F('ymid') || fp(f, 'heavy3') || fp(f, 'heavy'))) || name; if (t < A.su) dy = -Math.sin(t / A.su * Math.PI) * 26; }
  else if (f.st === 'heavy' && f.atkK === 'fwdk' && F('yfwd')) { const A = f.atk; if (t >= A.su && t < A.su + A.ac + 6) { still(); name = F('yfwd'); } }
  else if (f.st === 'stun' && f.wall && F('slump')) { still(); name = F('slump'); }
  else if (f.st === 'stun' && f.crumple) { still(); name = (t < 14 ? F('hurtbig') : F('pinned')) || name; }
  else if (f.st === 'held') { still(); name = ((f.hy || 0) > 80 ? F('hoist') : ((f.id !== 'ds' && F('z4')) || F('held'))) || name; dy = -(f.hy || 0) * ((f.hy || 0) > 80 ? 0.7 : 1); }
  else if (f.st === 'sp' && f.mv && f.mv.id === 'lv2') { still(); name = F('ylv2') || fp(f, 'win') || name; dy = -Math.sin(clamp(t / 30) * Math.PI) * 20; }
  else if (f.st === 'sp' && f.mv && f.mv.id === 'lv3') { still(); name = (t < 12 ? (fp(f, 'heavy1') || fp(f, 'windup')) : (F('dimpact') || fp(f, 'heavy3'))) || name; }
  if (f.st === 'jsq') { still(); name = F('crouch1') || cr || name; }
  else if (f.st === 'jump' && f.airAtk && f.airK) { still(); name = { jlp: F('ma1') || F('njlp') || fp(f, 'jab3') || fp(f, 'jab'), jlk: F('ma2') || F('njlk') || fp(f, 'fkick'), jhp: (F('ma4') ? F(f.airT < 6 ? 'ma3' : 'ma4') : null) || F('njhp') || F('smash') || fp(f, 'fkick'), jhk: (F('jk3') ? F(f.airT < 3 ? 'jk1' : f.airT < 6 ? 'jk2' : f.airT < 24 ? 'jk3' : 'jk4') : null) || F('njhk') || fp(f, 'fkick'), jlkb: fp(f, 'fkick') }[f.airK] || name; if (f.airK === 'jhk' && !F('njhk') && !F('jk3')) rot = face * 0.12; if (f.airK === 'jlkb') sx = -1;      /* 第 68 圈（H）：跳轻脚以前没专用帧时把整张飞踢翻过来（人背对对手），看起来像方向反了，去掉；只有哈基米 ← + 轻脚的逆向踢还翻 */ smear = f.airT >= 4 && f.airT < 12 ? { key: 'fkick', age: f.airT - 4 } : null; }
  else if (f.st === 'sp' && f.mv && !NOSIG && SIGR[f.id] && SIGR[f.id][f.mv.id] && F(SIGR[f.id][f.mv.id].k)) { still(); const r = SIGR[f.id][f.mv.id].f(f, t, n => F(n), s); if (r) { name = r.n || name; rot = (r.rot || 0) * face; sx = r.sx || 1; sy = 1; dy = r.dy || 0; dx = 0; skew = 0; if (r.smear) smear = r.smear; } }      // 第 47 圈：招牌必杀专用帧（sg 表，见 gtools/sig_prompts.py）
  else if (f.st === 'sp' && f.mv && f.mv.id === 'spin') { still(); const k = Math.floor(t / 4) % 4; name = F('spin' + (k + 1)) || fp(f, 'kick3') || fp(f, 'kick') || name; if (!F('spin1')) sx = k % 2 ? -1 : 1; }      // 旋风腿：有 spin1..4 就按四个朝向轮播，没有就把踢腿帧左右翻着转
  else if (f.st === 'sp' && f.mv && POSE4[f.mv.id]) { still(); const r = POSE4[f.mv.id](f, t, F, s); if (r) { name = r.n || name; if (r.rot) rot = r.rot * face; if (r.sx) sx = r.sx; if (r.dy) dy = r.dy; if (r.smear) smear = r.smear; } }      // 第四版模组招式
  else if (f.st === 'jump' && f.wj && s.f - (f.wjF || 0) < 12 && F('yair')) { still(); name = F('yair'); }      // 哈基米 三角跳
  else if ((f.st === 'light' || f.st === 'heavy') && f.atkK === 'fclaw' && F('x2')) { const A = f.atk; still(); name = t < A.su ? (F('x1') || name) : t < A.su + A.ac + 2 ? F('x2') : F('x3'); }
  else if (f.st === 'idle' && f.id === 'ds' && f.rice >= 4 && (F('eat1') || F('z2')) && !s.cine) { still(); const u = (s.f + f.idx * 70) % 200; name = F('eat1') ? (u < 160 ? F('eat1') : u < 168 ? F('eat2') : u < 184 ? F('eat3') : F('eat4')) : F('z2'); }      // 饭量 4 级：端着碗站，隔一会儿扒一口
  else if (f.st === 'sp' && f.mv && (f.mv.id === 'boom' || f.mv.id === 'paper')) { still(); name = (t < 7 ? F('fb1') : t < 14 ? F('fb2') : t < 22 ? F('fb3') : F('fb4')) || (t < 14 ? fp(f, 'windup') : fp(f, 'jab3')) || fp(f, 'jab') || name; }
  if (f.st === 'sp' && f.mv && MEMEPOSE[f.mv.id]) { const an = MEMEPOSE[f.mv.id](f, t, F); if (an) { still(); name = an; } }
  else if ((f.st === 'light') && f.atkK === 'mid' && f.id === 'claude' && F('z1')) { still(); name = t < f.atk.su ? F('z1') : F('z2') || name; }      // 你说得完全正确：先鞠躬，再书脊敲头
  if (f.burn && (f.st === 'idle' || f.st === 'crouch') && F('z3')) { still(); name = F('z3'); }      // 宕机的专属样子
  if (f.st === 'win' && f.id === 'ds' && (F('eat2') || F('z1'))) { still(); const u = t % 60; name = F('eat2') ? (t < 20 ? F('eat1') : u < 12 ? F('eat2') : u < 36 ? F('eat3') : F('eat4')) : F('z1'); }      // 胜利：抱着碗开吃
  if (f.st === 'lose' && f.id === 'ds' && F('z3') && (NOSIG || !fp(f, 'wn41'))) { still(); name = F('z3'); }
  if (f.hitF != null && ['light', 'heavy', 'sp', 'su', 'jump', 'throw'].includes(f.st)) {      // 命中帧「大」：打中的那一下放大、往前探，顿帧结束后 4 步回弹
    const age = s.f - f.hitF, st0 = f.hitStop || 6, amp = age <= st0 ? 1 : clamp(1 - (age - st0) / 4), lv = f.hitLv || 1;
    if (amp > 0 && age >= 0) { const k = [0.035, 0.05, 0.06][lv - 1] * amp; sx *= 1 + k; sy *= 1 + k; dx += face * [6, 10, 14][lv - 1] * amp; } }
  if (ANIMD) { const air = f.y > 0.5; if (f._ly && !air) f._ldA = s.f; f._ly = air; const la = s.f - (f._ldA ?? -99); if (la >= 0 && la < 6 && ['idle', 'walk', 'crouch', 'light', 'heavy', 'block'].includes(f.st)) { const q = 1 - la / 6, k = q * q; sy *= 1 - 0.09 * k; sx *= 1 + 0.06 * k; }      // 第 81 圈：落地缓冲（压扁 6 步弹回）
    if (f._lfc != null && f._lfc !== face && ['idle', 'walk', 'crouch'].includes(f.st)) f._tnA = s.f; f._lfc = face; const ta = s.f - (f._tnA ?? -99); if (ta >= 0 && ta < 4 && ['idle', 'walk', 'crouch'].includes(f.st)) sx *= 0.55 + 0.45 * E.out3(ta / 4); }      // 第 81 圈：转身（横向压窄再展开）；?animd=0 关
  if (TWG && (f.st === 'sp' || f.st === 'su') && TWC[f.id]) { if (f._twC !== name) { f._twP = f._twC; f._twC = name; f._twA = s.f; } const ag = s.f - f._twA; if (!ghost && f._twP && f._twP !== name && ag >= 0 && ag < 3) ghost = { n: f._twP, a: 0.42 * (1 - ag / 3), dx: -face * 14 * (ag + 1), sx: 1 }; } else f._twC = null;      // 第 81 圈：核心三人必杀换帧那 3 步垫上一帧的淡影往后拖（起手 → 出手不再硬切；?tw=0 关）
  if (f.skin === 'a') name = adultName(f, name);
  if (ghost && f.skin === 'a') ghost.n = adultName(f, ghost.n);
  return { name, dx, dy, rot, sx, sy, lie, skew, smear, ay, ghost, rev: f._rv, arc: f._arc };
}
// 出招时的拖影：直拳一道横线，上勾拳一道上挑的弧，侧踢 / 重击是月牙
function drawSmear(f, sm, x, yb, h) {
  const has = !!fp(f, sm.key), a = Math.max(0, 1 - sm.age / (sm.key === 'heavy' || sm.key === 'sweep' ? 9 : 7)) * (has || fp(f, sm.key + '3') ? 0.18 : 1); if (a <= 0) return; const face = f.face, c2 = f.ch.col2;      /* 有姿势图时拖影收细调淡，别盖住手脚 */
  g.save(); g.translate(x, yb); g.scale(face, 1); g.globalAlpha = a; const grad = (x0, y0, x1, y1) => lg(x0, y0, x1, y1, ['rgba(255,255,255,0)', rgba(c2, 0.7), '#FFFFFF']);
  if (sm.key === 'jab') { g.fillStyle = grad(-10, 0, 0.5 * h, 0); g.beginPath(); g.moveTo(-0.05 * h, -0.5 * h); g.quadraticCurveTo(0.2 * h, -0.6 * h, 0.52 * h, -0.56 * h); g.quadraticCurveTo(0.2 * h, -0.5 * h, -0.05 * h, -0.5 * h); g.fill(); g.beginPath(); g.moveTo(0, -0.42 * h); g.quadraticCurveTo(0.2 * h, -0.47 * h, 0.5 * h, -0.5 * h); g.quadraticCurveTo(0.2 * h, -0.42 * h, 0, -0.42 * h); g.fill(); }
  else if (sm.key === 'upper') { g.fillStyle = grad(0, -0.1 * h, 0.2 * h, -1.1 * h); g.beginPath(); g.moveTo(0.02 * h, -0.2 * h); g.bezierCurveTo(0.42 * h, -0.3 * h, 0.5 * h, -0.8 * h, 0.3 * h, -1.16 * h); g.bezierCurveTo(0.38 * h, -0.8 * h, 0.3 * h, -0.42 * h, 0.02 * h, -0.2 * h); g.fill(); }
  else if (sm.key === 'fkick') { g.fillStyle = grad(-0.5 * h, -0.9 * h, 0.2 * h, -0.2 * h); g.beginPath(); g.moveTo(-0.5 * h, -0.95 * h); g.quadraticCurveTo(0, -0.62 * h, 0.34 * h, -0.14 * h); g.quadraticCurveTo(-0.14 * h, -0.5 * h, -0.5 * h, -0.95 * h); g.fill(); }
  else if (sm.key === 'cjab') { g.fillStyle = grad(-10, 0, 0.5 * h, 0); g.beginPath(); g.moveTo(-0.05 * h, -0.34 * h); g.quadraticCurveTo(0.2 * h, -0.4 * h, 0.5 * h, -0.36 * h); g.quadraticCurveTo(0.2 * h, -0.28 * h, -0.05 * h, -0.34 * h); g.fill(); }
  else if (sm.key === 'sweep') { if (sm.small) { g.scale(0.6, 0.8); } g.fillStyle = grad(-0.3 * h, 0, 0.7 * h, 0); g.beginPath(); g.ellipse(0.12 * h, -0.07 * h, 0.6 * h, 0.13 * h, 0, Math.PI * 0.95, Math.PI * 2.1); g.ellipse(0.1 * h, -0.05 * h, 0.5 * h, 0.07 * h, 0, Math.PI * 2.1, Math.PI * 0.95, true); g.closePath(); g.fill(); }
  else { const r = (sm.key === 'heavy' ? 0.82 : 0.62) * h, cy = -(sm.key === 'heavy' ? 0.5 : 0.46) * h, a0 = sm.key === 'heavy' ? -1.75 : -0.95, a1 = sm.key === 'heavy' ? 0.7 : 0.55; g.fillStyle = grad(0, cy - r, r, cy + r * 0.4); g.beginPath(); g.arc(0.04 * h, cy, r, a0, a1); g.arc(-0.08 * h, cy + 0.02 * h, r * ((sm.key === 'heavy' ? 0.78 : 0.8) + (has ? 0.1 : 0)), a1 - 0.12, a0 + 0.1, true); g.closePath(); g.fill(); }
  if (!fp(f, sm.key === 'fkick' ? 'fkick' : sm.key)) {      // 还没有这个角色的姿势图时：在拖影尽头画一只卡通拳头 / 鞋，至少看得出是拳还是脚
    const tip = { jab: [0.52, -0.53, 0], upper: [0.3, -1.1, -1.2], kick: [0.66, -0.46, 0], heavy: [0.8, -0.24, 0.3], fkick: [0.36, -0.12, 0.7], cjab: [0.5, -0.35, 0], sweep: [0.66, -0.06, 0] }[sm.key], r = (sm.key === 'heavy' ? 0.125 : 0.09) * h; g.globalAlpha = Math.min(1, a * 1.6); g.translate(tip[0] * h, tip[1] * h); g.rotate(tip[2]); g.lineJoin = 'round'; g.lineWidth = Math.max(4, h * 0.012); g.strokeStyle = INK;
    if (sm.key === 'kick' || sm.key === 'fkick' || sm.key === 'sweep') { g.fillStyle = f.ch.ink; g.beginPath(); g.ellipse(0, 0, r * 1.5, r * 0.85, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(r * 1.1, 0, r * 0.42, r * 0.85, 0, -1.57, 1.57); g.fill(); g.stroke(); }
    else { g.fillStyle = f.ch.col; g.fillRect(-r * 2.1, -r * 0.62, r * 1.4, r * 1.24); g.strokeRect(-r * 2.1, -r * 0.62, r * 1.4, r * 1.24); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.stroke(); g.lineWidth *= 0.7; for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(r * 0.55, i * r * 0.46, r * 0.26, -1.2, 1.2); g.stroke(); } }
  }
  g.restore();
}
// 第 68 圈（GPT r67：白色系角色升龙偏亮）：浅色主题 / 白衣角色的火焰换深一档的颜色，压在身上的前层按 DPW 降亮度、身后的层降一半
const DPCOL = { kimi: ['#E89A1C', '#FFD27A'], claude: ['#FF7A12', '#FFC27A'], gpt: ['#6A44FF', '#B8A4FF'], glm: ['#E8203A', '#FFB0BC'] };
const DPW = { kimi: 0.5, gpt: 0.55, glm: 0.6, claude: 0.6, qwen: 0.8, ds: 0.85, gem: 0.85, grok: 0.85, dou: 0.8 };
// 第 67 圈：升龙火焰（主题色）：起跳点到身体的火柱 + 沿轨迹的火焰拖尾 + 绕身螺旋火带（前后两层）+ 拳头火舌 + 命中火焰爆裂；重版 / EX 更粗更多圈
function dpFlame(s, f, FL, front) {
  if (EOFF || !isDP(f)) { if (f._dpT) f._dpT = null; return; } const M = f.mv, C = DPCOL[f.id] || ECOL[f.id] || [f.ch.col, f.ch.col2], kw = DPW[f.id] ?? 1, kb = 0.5 + 0.5 * kw, H = f.ch.h * (f.skin === 'a' ? 1.3 : 1.05), big = M.ex ? 1.45 : M.v === 'b' ? 1.2 : 1;
  const fade = M.land ? Math.max(0, 1 - (f.t - M.land) / 12) : f.t < 4 ? f.t / 4 : 1; if (fade <= 0) return; const x = f.x, yb = FL - f.y, top = yb - H * 0.95, mid = yb - H * 0.5;
  if (!front) { if (!f._dpT || f._dpT.sw !== f.swing0) f._dpT = { sw: f.swing0, x0: x, pts: [] }; if (!s.hitstop) { f._dpT.pts.push([x, yb]); if (f._dpT.pts.length > 18) f._dpT.pts.shift(); } }
  const T = f._dpT; if (!T) return; g.save(); g.globalCompositeOperation = 'lighter';
  if (!front) {
    const fr = M.land ? 5 + Math.min(2, (f.t - M.land) / 5) : f.vy > 0 || f.y < 1 ? 1 + Math.min(3, f.t / 4) : 4 + Math.min(1, -f.vy / 700), Hp = H * 1.55 * big;
    seqTex('q_pillarw', fr, x, yb - Hp * 0.42, Hp * 0.7, 0, 0.45 * kb * fade * (f.vy > 0 ? 1 : 0.6), true, C[0], false, 1 / 0.7); seqTex('q_pillarw', fr, x, yb - Hp * 0.36, Hp * 0.4, 0, 0, true, null, false, 1.375);      // 火柱贴图（主题色 + 白热芯）
    if (f.y > 60) seqTex('q_pillarw', Math.min(7, fr + 1.5), T.x0, FL - Hp * 0.36, Hp * 0.85, 0, 0.38 * kb * fade, true, C[0]);      // 起跳点留下的火柱
    T.pts.forEach(([px, py], i) => { const q = i / T.pts.length, r = (40 + 70 * q) * big; for (let j = 0; j < 2; j++) { const yy = py - H * (0.2 + j * 0.5); g.fillStyle = rg(px, yy, 0, r, [rgba(C[1], 0.18 * kb * q * fade), rgba(C[0], 0.16 * kb * q * fade), rgba(C[0], 0)]); g.beginPath(); g.arc(px, yy, r, 0, 7); g.fill(); } });      // 轨迹拖尾
    g.fillStyle = rg(x, mid, 0, H * 0.7 * big, [rgba(C[0], 0.3 * kb * fade), rgba(C[0], 0.16 * kb * fade), rgba(C[0], 0)]); g.fillRect(x - H, mid - H, 2 * H, 2 * H);      // 全身光晕
  }
  const turns = M.ex ? 3 : M.v === 'b' ? 2 : 1.5, ph = f.t * 0.55;
  for (let j = 0; j < 2; j++) { g.strokeStyle = rgba(j ? C[1] : C[0], (front ? 0.6 * kw : 0.4 * kb) * fade); g.lineWidth = (j ? 6 : 12) * big * (front ? 0.6 : 1); g.lineCap = 'round'; g.setLineDash(front ? [26 * big, 18 * big + j * 8] : []); g.lineDashOffset = -f.t * 6; g.beginPath(); let started = false;      // 绕身螺旋火带：前层 = sin>0 那一半
    for (let i = 0; i <= 40; i++) { const q = i / 40, an = ph + q * turns * 6.283 + j * 0.4, inFront = Math.sin(an) > 0, xx = x + Math.cos(an) * H * 0.3 * big, yy = yb - q * H * 1.05;
      if (inFront === front) { if (!started) { g.moveTo(xx, yy); started = true; } else g.lineTo(xx, yy); } else started = false; } g.stroke(); } g.setLineDash([]);      // 第 70 圈（GPT r68 剩余意见）：压在身上的前层螺旋改成断续窄条
  if (front) {
    { const fr = M.land ? 6 : f.vy > 0 || f.y < 1 ? 1 + Math.min(3, f.t / 4) : 4.5; seqTex('q_pillarw', fr, x, yb - H * 1.55 * big * 0.42, H * 1.55 * big, 0, 0.14 * kw * kw * fade, true, C[0]); }      // 前层薄火（包住身体）
    if (!M.land) { const pn = pose(s, f).name, hp_ = window.SRHIT && SRHIT[pn], hh_ = hOf(f, pn), fx = hp_ ? x + f.face * hp_[0] * hh_ : x + f.face * H * 0.12, fy = hp_ ? yb + hp_[1] * hh_ : top - 10; for (let k = 0; k < 7; k++) { const h1 = hash(k + Math.floor(f.t / 2) * 7), L = H * (0.25 + 0.3 * h1) * big, w = 12 * big; g.fillStyle = lg(0, fy, 0, fy - L, [rgba('#FFFFFF', 0.45 * kw * fade), rgba(C[1], 0.5 * kb * fade), rgba(C[0], 0)]); g.beginPath(); g.moveTo(fx - w + (k - 3) * 10, fy); g.quadraticCurveTo(fx + (h1 - 0.5) * 60, fy - L * 0.6, fx + (k - 3) * 6 + (h1 - 0.5) * 30, fy - L); g.quadraticCurveTo(fx + (h1 - 0.5) * 40, fy - L * 0.5, fx + w + (k - 3) * 10, fy); g.fill(); }      // 拳头位置（有 B 量的坐标就用）+ 拳头火舌（第 70 圈：之前被行中注释吞掉，从没画出来过）
      g.fillStyle = rg(fx, fy, 0, 70 * big * (0.6 + 0.4 * kw), ['rgba(255,255,255,' + 0.85 * fade + ')', rgba(C[1], 0.6 * kw * fade), rgba(C[0], 0)]); g.beginPath(); g.arc(fx, fy, 70 * big * (0.6 + 0.4 * kw), 0, 7); g.fill(); if (f.vy > 300) star4(fx, fy, (70 + 30 * Math.sin(f.t * 1.7)) * big, f.t * 0.2, '#FFFFFF', 0.85 * fade); }      // 拳头顶端最亮的冲击点
    for (let k = 0; k < 16; k++) { const h1 = hash(k * 3.7 + f.swing0), q = ((f.t * 0.05 + h1) % 1), ex_ = x + (hash(k) - 0.5) * H * 0.7, ey = yb - q * H * 1.4; g.fillStyle = rgba(k % 3 ? C[1] : '#FFFFFF', (1 - q) * fade); g.beginPath(); g.arc(ex_, ey, 4 + 4 * h1, 0, 7); g.fill(); }      // 火星
    if (f.hitOK && M._hbF == null) M._hbF = s.f; if (M._hbF != null && f.mv.k != null && M._hbK !== f.swing) { M._hbK = f.swing; }
    if (M._hbF != null) { const u = (s.f - M._hbF) / 22; if (u < 1) { const bx = x + f.face * H * 0.2, by = yb - H * 0.85; for (let r = 0; r < 3; r++) seqTex('q_firew', Math.min(7, u * 8 + r * 0.7), bx + f.face * r * 30, by - r * 70, (300 - r * 50) * big, r * 0.4 - 0.4, (1 - u) * 0.6 * kb, true, C[0]); seqTex('q_firew', u * 8, bx, by, 200 * big, 0, (1 - u) * 0.3 * kw, true, null); }
      const u2 = (s.f - M._hbF) / 16; if (u2 < 1) { const u = u2; const bx = x + f.face * H * 0.2, by = yb - H * 0.8; for (let r = 0; r < 3; r++) { const uu = clamp(u * 1.2 - r * 0.15); g.fillStyle = rg(bx, by - r * 60, 0, (80 + 200 * E.out3(uu)) * big, [rgba('#FFFFFF', (1 - uu) * 0.35 * kw), rgba(C[1], (1 - uu) * 0.3 * kb), rgba(C[0], 0)]); g.beginPath(); g.arc(bx, by - r * 60, (80 + 220 * E.out3(uu)) * big, 0, 7); g.fill(); } } }      // 命中火焰爆裂（三团）
  }
  g.restore();
}
function drawFighter(s, f, FL) { if (f.swing0 == null || !isDP(f)) f.swing0 = (f.swing || 0) + (f.t || 0) * 0; dpFlame(s, f, FL, false); drawFighter0(s, f, FL); dpFlame(s, f, FL, true); }
function drawFighter0(s, f, FL) {
  if (f.ghost) { for (let i = 0; i < 14; i++) { const R = hash(s.f * 3 + i), q = (s.f % 14) / 14; g.fillStyle = rgba(i % 2 ? '#2EC8F0' : '#B9F3FF', 0.7 * (1 - q)); g.fillRect(f.x + (R - 0.5) * 160, FL - f.y - 60 - hash(i + s.f) * f.ch.h, 14, 14); } return; }      // 第 67 圈：小忍 404 隐身中只剩像素块
  f.mixK = f.skin !== 'a' && s.F.some(o => o.skin === 'a') && !s.cine ? 1.28 : 1;
  if (f.boss && !s.cine) { f.mixK *= 1.3; glow(f.x, FL - f.y - f.ch.h * 0.7, f.ch.h * 1.1, '#B15CF5', 0.18 + 0.06 * Math.sin(s.f * 0.08)); }      // 第 65 圈：最终头目画面放大 + 紫色气场（判定不变）      // 第 42 圈：GPT 复审「成年打 Q 版拳路高过对方躯干」：混打时 Q 版画面 ×1.28（第 45 圈从 1.16 加到 1.28，两边差不多高；受击框不动）
  const p = pose(s, f), h = hOf(f, p.name), m = META.spr[p.name], wDisp = m.w * h / m.h, x = f.x + p.dx, yb = FL - f.y, flat = isFlat(p.name);
  const flip = (f.face * (NATIVE[p.name] ?? 1) < 0) !== !!p.rev;      // 第 79 圈：p.rev = 回身帧镜像
  // 影子
  drawShadow(s, f, p, FL, h, wDisp);
  let env = (typeof QS !== 'undefined' && QS.get('noenv')) ? null : STAGES[s.stage].env;
  if (f.burn) env = f.id === 'dou' ? { col: '#5A5F6E', a: 0.2, bot: 0.2, pix: 1 } : { col: '#5A5F6E', a: 0.42, bot: 0.3, top: 'rgba(120,120,120,0.2)' };      // 宕机：人物发灰（豆包是画风掉成马赛克）
  if (f.st === 'drush' || f.st === 'parry' || (f.st === 'impact' && f.t < (f.atk ? f.atk.su : 0))) glow(f.x, yb - h * 0.5, h * 0.8, f.st === 'impact' ? f.ch.col : '#3DDC84', f.st === 'parry' ? 0.35 : 0.5);
  if (f.st === 'drush') for (let i = 2; i >= 1; i--) spr(p.name, x - f.vx / 60 * i * 3.6, yb + p.dy, h, { flip, rot: p.rot, skew: -p.skew, a: 0.3 / i, env: { col: '#3DDC84', a: 0.85, bot: 0 } });      // 绿冲：绿色残影
  if (f.buff && f.buff.k === 'nine' && bodyOnR(f)) for (let i = 2; i >= 1; i--) spr(p.name, x - f.face * (46 + Math.sin(s.f * 0.2 + i) * 10) * i, yb + p.dy, h, { flip, rot: p.rot, skew: -p.skew, a: 0.22, env: { col: '#F0C2FF', a: 0.8, bot: 0 } });      // 九条命：两个残影跟着
  if (s.cheerWho === f.idx && s.cheerT > 0) { glow(f.x, yb - h * 0.5, h * 0.9, '#FFE066', 0.5 + 0.2 * Math.sin(s.f * 0.5)); }
  if (f.st === 'sp' && f.mv && f.mv.id === 'counter' && !f.mv.hit && f.counter) { g.save(); g.strokeStyle = rgba('#FFB45C', 0.85); g.lineWidth = 8; g.beginPath(); g.ellipse(f.x, yb - h * 0.5, h * 0.42 + Math.sin(s.f * 0.5) * 6, h * 0.58, 0, 0, 7); g.stroke(); g.restore(); glow(f.x, yb - h * 0.5, h * 0.8, '#FFB45C', 0.35); }
  if (f.st === 'sp' && f.mv && f.t < 14 && !f.mv.air) { const k = 1 - f.t / 14, cyy = yb - h * 0.5; glow(f.x, cyy, h * 0.62, f.mv.ex ? '#FFD23C' : f.ch.col2, 0.45 * k);      // 必杀起手：主题色光晕 + 往身上收的集中线
    if (f.t < 8) { g.save(); g.strokeStyle = rgba(f.mv.ex ? '#FFE066' : '#FFFFFF', 0.7 * (1 - f.t / 8)); g.lineWidth = 4; g.lineCap = 'round'; for (let i = 0; i < 14; i++) { const an = i / 14 * Math.PI * 2 + hash(f.swing + i) * 0.4, r0 = h * (0.95 - f.t * 0.04), r1 = r0 - h * 0.22; g.beginPath(); g.moveTo(f.x + Math.cos(an) * r0, cyy + Math.sin(an) * r0 * 0.8); g.lineTo(f.x + Math.cos(an) * r1, cyy + Math.sin(an) * r1 * 0.8); g.stroke(); } g.restore(); } }
  if (f.st === 'sp' && f.mv && f.mv.ex && bodyOnR(f)) { for (let i = 2; i >= 1; i--) spr(p.name, x - (f.vx / 60 * i * 3 || f.face * i * 14), yb + p.dy, h, { flip, rot: p.rot, sx: p.sx, sy: p.sy, a: 0.28 / i, env: { col: '#FFD23C', a: 0.9, bot: 0 } }); spr(p.name, x, yb + p.dy + h * 0.03, h * 1.07, { flip, rot: p.rot, sx: p.sx, sy: p.sy, a: 0.95, env: { col: '#FFE066', a: 1, bot: 0 } }); }      // EX：金色描边（放大一点的金色剪影垫在底下）+ 金色残影
  if (f.st === 'sp' && f.mv && /^(dp|dpk|tenshou|fkk|hbutt|tripflash)$/.test(f.mv.id) && f.y > 10 && f.vy > 0) { g.save(); g.lineCap = 'round'; for (let i = 0; i < 7; i++) { const xx = f.x + (hash(i * 3.7 + f.swing) - 0.5) * h * 0.6, L = 80 + hash(i + f.t) * 120, y0 = yb + 20 + ((f.t * 14 + i * 37) % 120); g.strokeStyle = rgba(i % 2 ? '#FFFFFF' : f.ch.col2, 0.55); g.lineWidth = 5; g.beginPath(); g.moveTo(xx, y0); g.lineTo(xx, y0 + L); g.stroke(); } g.restore(); }      // 升龙类：身下往下拉的上升气流线
  // 冲刺残影
  if (f.st === 'dash' || (f.st === 'sp' && f.mv && f.mv.id === 'pounce' && f.y > 0)) for (let i = 2; i >= 1; i--) spr(p.name, x - f.vx / 60 * i * 3.2, yb + p.dy, h, { flip, rot: p.rot, skew: -p.skew, a: 0.24 / i });
  if (p.arc) spinArc(f, p.arc, x, yb + p.dy, h);      // 第 79 圈：回旋弧
  spFx(s, f, p, x, yb, h, flip, 0);      // 必杀专属特效：身后那一层（上升气流柱、旋风环后半圈、突进残影、地面波纹）
  if (p.ghost && p.ghost.n && META.spr[p.ghost.n]) spr(p.ghost.n, x + p.ghost.dx, yb + p.dy, hOf(f, p.ghost.n), { flip: f.face * (NATIVE[p.ghost.n] ?? 1) < 0, sx: p.ghost.sx, a: p.ghost.a, env });      // 第 35 圈：帧间补间 / 残形（只一层）
  const white = f.flash > 0 && s.f - f.lastDmgF < 2 ? 0.45 : 0, frozen = f.st === 'freeze';      // 挨打只白闪一下，之后露出受击姿势
  if (p.lie > 0 && !flat) { const rot = -f.face * p.lie * Math.PI / 2; g.save(); g.translate(x, yb - p.lie * wDisp * 0.42); spr(p.name, 0, 0, h, { flip, rot, white, ay: 1, env }); g.restore(); }
  else { const rim = STAGES[s.stage].rim; if (rim && !f.burn && s.ctrl && s.ctrl.includes('human') && !(typeof QS !== 'undefined' && QS.get('norim'))) { g.save(); g.globalCompositeOperation = 'lighter'; spr(p.name, x - 3, yb + p.dy - 4, h, { flip, rot: p.rot, sx: p.sx, sy: p.sy, skew: -p.skew, ay: p.ay, a: 0.36, env: { col: rim, a: 1, bot: 0 } }); g.restore(); }      // 第 36 圈：角色边光（场地主光从左上来，主题色描一道亮边）
    spr(p.name, x, yb + p.dy, h, { flip, rot: p.rot, sx: p.sx, sy: p.sy, skew: -p.skew, white, ay: p.ay, env }); f._spr = [p.name, x, yb + p.dy, h, { flip, rot: p.rot, sx: p.sx, sy: p.sy, skew: -p.skew, ay: p.ay, env }]; }
  if (p.lie > 0 && !flat) f._spr = null;
  footDust(s, f, FL);
  spFx(s, f, p, x, yb, h, flip, 1);      // 必杀专属特效：身前那一层（攻击部位拖尾、蓄势粒子、旋风环前半圈、收招余烟）
  if (f.id === 'ds') dsEatFx(s, f, p, x, yb + p.dy, h);
  if (f.helmet > 0 && !/_w[34]$/.test(p.name) && !p.lie && !(typeof MEME !== 'undefined' && MEME.helmet(s, f, p, x, yb, h, flip))) { const hb = h * 0.3; spr('p_basin', x + f.face * 6, yb + p.dy - h * (p.name.endsWith('_crouch2') || p.name.endsWith('_crouch') ? 0.62 : 0.86), hb, { flip: f.face < 0, rot: p.rot }); }      // 戴着盆
  if (f.burn && (f.st === 'idle' || f.st === 'crouch') && BURN_SAY[f.id]) { if (f.id === 'ds') sayHand(f.x, yb - h - 20, BURN_SAY[f.id], 0.95, 7); else say(f.x, yb - h - 40, BURN_SAY[f.id], f.ch.col, 0.95); }
  if (f.dumb > 0) { txt('降智中', f.x, yb - h - 30, { size: 26, w: 900, fill: '#D0D4DC', stroke: INK, sw: 6, align: 'center' }); cloudShape(f.x, yb - h - 70, 0.5); }
  if (f.inv > 0 && !s.exe && !s.cine && s.phase === 'fight' && f.st !== 'ko' && f.st !== 'down') txt('代你操作中 ⇄', f.x, yb - h - 30, { size: 26, w: 900, fill: '#C9D4EE', stroke: INK, sw: 6, align: 'center' });
  // 第 40 圈：架招时那圈规整的细椭圆去掉（GPT 审图第 6 条），只留身后的墨环
  if (f.burn && (s.f + f.idx * 7) % 9 === 0) s.fx.push({ k: 'smoke', x: f.x + (hash(s.f) - 0.5) * 60, y: f.ch.h * 0.85, t: 0, life: 40 });
  if (f.buff) txt(f.buff.name + ' ' + Math.ceil(f.buff.t / 60) + 's', f.x, yb - h - 30, { size: 26, w: 900, fill: '#FFE066', stroke: INK, sw: 6, align: 'center' });
  if (p.smear) drawSmear(f, p.smear, x, yb + p.dy, h);
  if (frozen) { sysPopup(f.x, yb - h * 0.52, 190, 0.96, { rot: -0.06 }); const an = s.f * 0.25; g.save(); g.translate(f.x, yb - h - 40); g.lineWidth = 9; g.lineCap = 'round'; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(0, 0, 26, 0, 7); g.stroke(); g.strokeStyle = '#4D6BFE'; g.beginPath(); g.arc(0, 0, 26, an, an + 1.6); g.stroke(); g.restore(); }
  if (f.st === 'stun') for (let i = 0; i < 3; i++) { const an = s.f * 0.16 + i * 2.09; star4(f.x + Math.cos(an) * 70, yb - h - 26 + Math.sin(an) * 16, 20, an, '#FFE066'); }
  if (f.st === 'sleep') for (let i = 0; i < 3; i++) { const k = ((s.f * 0.012 + i / 3) % 1); txt('z', f.x + 50 + k * 60, yb - h * 0.8 - k * 120, { size: 30 + k * 34, w: 900, fam: F.en, fill: '#fff', stroke: INK, sw: 7, a: Math.sin(k * Math.PI), rot: 0.2 }); }
  if (f.st === 'block') { g.save(); g.translate(f.x + f.face * 70, yb - h * 0.5); g.scale(f.face, 1); g.strokeStyle = 'rgba(160,220,255,0.95)'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.arc(-40, 0, 150, -0.7, 0.7); g.stroke(); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3; g.beginPath(); g.arc(-40, 0, 162, -0.5, 0.5); g.stroke(); g.restore(); }
  if (f.slow > 0) { txt('黏住了', f.x, yb - h - 16, { size: 26, w: 800, fill: '#FFE9C9', stroke: '#7A4A1E', sw: 6, align: 'center', a: 0.9 }); g.save(); g.fillStyle = 'rgba(160,104,56,0.75)'; g.beginPath(); g.ellipse(f.x, FL + 6, 90, 14, 0, 0, 7); g.fill(); g.restore(); }
  // 招式的附加图形
  const id = (f.st === 'sp' || f.st === 'su') && f.mv ? f.mv.id : '', t = f.t, face = f.face;
  if (id === 'bakkai' && t >= 7 && t < 7 + (f.mv.n || 3) * 11) { const ph = (t - 7) / 11 * Math.PI * 2, cy = yb - h * 0.2, R = h * 0.62;      // 鲸尾回旋：脚边两道环形风刃 + 水花
    g.save(); g.lineCap = 'round'; for (let j = 0; j < 2; j++) { const a0 = ph * face + j * Math.PI; g.strokeStyle = rgba(j ? '#FFFFFF' : f.ch.col2, 0.85); g.lineWidth = j ? 6 : 14; g.beginPath(); g.ellipse(f.x, cy, R, R * 0.24, 0, a0, a0 + 2.3 * face, face < 0); g.stroke(); }
    g.globalAlpha = 0.5; g.strokeStyle = '#BFE6FF'; g.lineWidth = 3; g.beginPath(); g.ellipse(f.x, cy + 6, R * 1.12, R * 0.27, 0, 0, 7); g.stroke(); g.restore();
    if (t % 4 === 0 && s._bkf !== s.f) { s._bkf = s.f; s.fx.push({ k: 'dust', x: f.x + (hash(t + f.x) - 0.5) * 160, y: 0, t: 0, life: 14, small: true, own: f.idx }); } }
  if (id === 'whalefall' && t >= 26 && !f.mv.land) { for (let i = 4; i >= 1; i--) spr(p.name, x - f.vx / 60 * i * 3, yb + p.dy + i * 26, h, { flip, rot: p.rot, a: 0.3 / i, env: { col: '#7FD4FF', a: 0.8, bot: 0 } }); g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(127,212,255,0.5)'; g.lineWidth = 30; g.lineCap = 'round'; g.beginPath(); g.moveTo(f.x - face * 20, yb - h * 0.4); g.lineTo(f.x - face * 260, yb - h * 0.4 - 380); g.stroke(); g.restore(); }      // 鲸落：蓝色残影 + 一道水痕
  if (id === 'whalefall' && t >= 8 && (!f.mv.land || t - f.mv.land < 30) && !/[?&]summon=0/.test(location.search)) { const L = f.mv.land, op = s.F[1 - f.idx], tx = L ? f.x : op.x, sx = tx - face * 1500, sy = FL - 950, ex = tx + face * 120, ey = FL + 60, q = L ? 1 + (t - L) / 16 : Math.min(0.97, (t - 8) / 24), wx = sx + (ex - sx) * q, wy = sy + (ey - sy) * q, an = Math.atan2(ey - sy, ex - sx), al = Math.min(1, (t - 8) / 8) * (L ? Math.max(0, 1 - (t - L) / 26) : 1);      // 第 77 圈：鲸落 = 召唤巨鲸：一条发光巨鲸跟着她从天上斜着扎进地面（地面以下裁掉，像扎进水里），落地掀起水柱；?summon=0 关
    g.save(); g.beginPath(); g.rect(-3000, -3000, 9000, FL + 3006); g.clip(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = al; g.translate(wx, wy); g.rotate(an); if (Math.cos(an) < 0) g.scale(1, -1); whaleSil(150, s.f, 0); g.globalAlpha = al * 0.6; whaleSil(150, s.f, 0); g.restore();
    if (!L) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(160,220,255,' + (0.35 * al).toFixed(3) + ')'; g.lineWidth = 3; for (let i = 0; i < 7; i++) { const o = (i - 3) * 40, nx = -Math.sin(an) * o, ny = Math.cos(an) * o; g.beginPath(); g.moveTo(wx + nx - Math.cos(an) * 760, wy + ny - Math.sin(an) * 760); g.lineTo(wx + nx - Math.cos(an) * 420, wy + ny - Math.sin(an) * 420); g.stroke(); } g.restore(); }      // 巨鲸身后的速度线
    if (L) { const k = (t - L) / 30, H0 = 820 * E.out3(Math.min(1, k * 3.2)) * (1 - k * 0.35), W0 = 170 + 160 * k; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.max(0, 1 - k) * 0.75; g.fillStyle = lg(0, FL - H0, 0, FL, ['rgba(190,235,255,0)', 'rgba(170,225,255,0.55)', 'rgba(230,248,255,0.9)']); g.beginPath(); g.moveTo(tx - W0, FL); g.quadraticCurveTo(tx - W0 * 0.5, FL - H0 * 0.6, tx - W0 * 0.2, FL - H0); g.quadraticCurveTo(tx, FL - H0 * 1.08, tx + W0 * 0.2, FL - H0); g.quadraticCurveTo(tx + W0 * 0.5, FL - H0 * 0.6, tx + W0, FL); g.closePath(); g.fill();
      g.fillStyle = 'rgba(220,245,255,0.9)'; for (let i = 0; i < 22; i++) { const a = -Math.PI / 2 + (hash(i * 3.1) - 0.5) * 2.2, v = 600 + hash(i * 5.7) * 700, u = k * 1.6, px = tx + Math.cos(a) * v * u, py = FL - H0 * 0.5 + Math.sin(a) * v * u + 900 * u * u; g.beginPath(); g.arc(px, py, 5 + hash(i) * 7, 0, 7); g.fill(); } g.restore(); } }      // 水柱 + 四散水珠
  if (id === 'whalefall' && f.mv.land && t - f.mv.land < 24) { const k = (t - f.mv.land) / 24; g.save(); g.globalAlpha = 1 - k; g.fillStyle = '#BFE9FF'; for (let i = 0; i < 14; i++) { const R = hash(i * 3.3 + f.mv.land), dx = (i - 6.5) * 34 * (1 + k * 1.6), hh = (120 + R * 220) * Math.sin(Math.min(1, k * 2.2) * Math.PI * 0.9); g.beginPath(); g.ellipse(f.x + dx, FL - hh, 14 + R * 10, 22 + R * 14, 0, 0, 7); g.fill(); } g.restore(); }      // 落地掀起的水浪
  if (id === 'eightclaw' && f.mv.got) { const u = t - f.mv.got, op = s.F[1 - f.idx], oy = FL - op.y - op.ch.h * 0.5;      // 八连猫爪：每一下一道不同角度的三条爪痕，最后炸开
    for (let i = 0; i < 9; i++) { const t0 = 3 + i * 6; if (i === 8 ? u < 56 : (u < t0 || t0 > 48)) continue; const age = u - (i === 8 ? 56 : t0); if (age > 10) continue; const k = age / 10, an = -1.1 + i * 0.55 + (i % 2) * 2.2;
      g.save(); g.translate(op.x, oy); g.rotate(an); g.globalAlpha = 1 - k * k; for (let j = -1; j <= 1; j++) { g.fillStyle = j ? '#F0C2FF' : '#FFFFFF'; const L = 260 * E.out3(Math.min(1, age / 3)) + (i === 8 ? 200 : 0); g.beginPath(); g.moveTo(-L, j * 34 - 6); g.quadraticCurveTo(0, j * 34 - 26, L, j * 34); g.quadraticCurveTo(0, j * 34 - 12, -L, j * 34 + 6); g.fill(); } g.restore(); }
    if (u >= 56 && u < 74) { const k = (u - 56) / 18; g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg(op.x, oy, 0, 380 * E.out3(k) + 40, ['rgba(255,255,255,' + (1 - k) + ')', 'rgba(177,92,245,' + (0.8 * (1 - k)) + ')', 'rgba(177,92,245,0)']); g.fillRect(op.x - 450, oy - 450, 900, 900); g.restore(); } }
  if (id === 'snatch' && f.mv.got && t - f.mv.got >= 24 && t - f.mv.got < 40) { const k = (t - f.mv.got - 24) / 16, op = s.F[1 - f.idx], oy = FL - op.y - op.ch.h * 0.55; g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg(op.x, oy, 0, 300 * E.out3(k) + 30, ['rgba(255,255,255,' + (1 - k) + ')', 'rgba(177,92,245,' + (0.7 * (1 - k)) + ')', 'rgba(177,92,245,0)']); g.fillRect(op.x - 360, oy - 360, 720, 720); g.restore(); }      // 叼走：拎起来炸开一团紫光
  if (f.pillarF && s.f < f.pillarF && f.st === 'stun') drawPillar(f.x, FL, 1, s.f, Math.min(1, (f.pillarF - s.f) / 20));      // 被炸毛光柱定住
  if (id === 'gptrush' && !f.mv.got && t >= 2 && t < 22) for (let i = 4; i >= 1; i--) spr(p.name, x - face * i * 46, yb + p.dy, h, { flip, a: 0.28 / i, env: { col: '#B9AEFF', a: 0.85, bot: 0 } });      // 瞬发冲刺：紫色残影
  if (id === 'superbee' && t >= 6) { const end = 6 + (f.mv.cp ? 9 : 7) * 5; if (t < end) { const cy = yb - h * 0.45, R = h * 0.55; g.save(); for (let i = 0; i < 6; i++) { const an = t * 0.5 * face + i * Math.PI / 3; g.save(); g.translate(f.x + Math.cos(an) * R, cy + Math.sin(an) * R * 0.35); g.rotate(an); g.globalAlpha = 0.85; g.fillStyle = i % 2 ? '#FFE9C4' : '#FFC2D6'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 46, -2.4, -0.7); g.closePath(); g.fill(); g.restore(); } g.strokeStyle = 'rgba(255,194,214,0.7)'; g.lineWidth = 8; g.beginPath(); g.ellipse(f.x, cy, R * 1.1, R * 0.4, 0, 0, 7); g.stroke(); g.restore(); } }      // 全场包邮：一圈扇子转着冲
  if (f.mv && f.mv.cp && (id === 'fan' || id === 'elbow' || id === 'glide' || id === 'spin') && t < 30) txt('满减！', f.x, yb - h - 24, { size: 28, w: 900, fill: '#E8743B', stroke: '#fff', sw: 6, align: 'center', a: 1 - t / 30 });      // 用掉一张券
  if ((id === 'slariat' && t < 66) || (id === 'lwindmill' && t < 50) || (id === 'windmill' && t < 54)) { const ph = t * (id === 'slariat' ? 0.7 : 0.45), cy = yb - h * (id === 'lwindmill' ? 0.18 : 0.5), R = h * (id === 'slariat' ? 0.8 : 0.62);      // 大风车：环形斧风；全网风暴更大更快，带吸人的风线
    g.save(); g.lineCap = 'round'; for (let j = 0; j < 2; j++) { const a0 = ph * face + j * Math.PI; g.strokeStyle = rgba(j ? '#FFFFFF' : '#E0475B', 0.8); g.lineWidth = j ? 6 : 14; g.beginPath(); g.ellipse(f.x, cy, R, R * 0.28, 0, a0, a0 + 2.2 * face, face < 0); g.stroke(); } g.restore();
    if (id === 'slariat') { g.save(); g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 4; for (let i = 0; i < 8; i++) { const k = ((t * 0.05 + i / 8) % 1), side = i % 2 ? 1 : -1, xx = f.x + side * (560 - k * 420), yy = yb - 100 - (i % 4) * 90; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx - side * 120, yy); g.stroke(); } g.restore(); } }
  if (id === 'drave' && f.mv.got && f.mv.fin == null && s.ctrl[f.idx] === 'human') { const i0 = f.mv.i || 0, bx = f.x - 5 * 58 + 29, by = yb - h - 70; for (let i = 0; i < 10; i++) { const x0 = bx + i * 58, done = i < i0, cur = i === i0; g.save(); g.globalAlpha = done ? 0.35 : 1; rr(x0 - 25, by - 25 - (cur ? 8 : 0), 50, 50, 10); g.fillStyle = cur ? '#E8743B' : done ? '#3A3A55' : '#FFFDF4'; g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke(); g.restore(); txt(KEYN[DRAVE_R[i]], x0, by + 12 - (cur ? 8 : 0), { size: 32, w: 900, fam: F.en, fill: cur ? '#fff' : INK, align: 'center', a: done ? 0.4 : 1 }); } txt('逐条回复中：按顺序按键', f.x, by - 50, { size: 24, w: 900, fill: '#fff', stroke: INK, sw: 6, align: 'center' }); }      // 逐条回复：头上一排键位提示，当前那个高亮
  if (id === 'storm' && t >= 14 && t < 48) { const r = 120 + (t - 14) * 14, k = (t - 14) / 34; g.save(); g.globalAlpha = 1 - k * 0.7; g.strokeStyle = '#FFB45C'; g.lineWidth = 22 * (1 - k) + 4; g.beginPath(); g.ellipse(f.x, yb - 280, r, r * 0.9, 0, 0, 7); g.stroke(); g.strokeStyle = '#FFFFFF'; g.lineWidth = 6; g.beginPath(); g.ellipse(f.x, yb - 280, r * 0.92, r * 0.82, 0, 0, 7); g.stroke();
    for (let i = 0; i < 16; i++) { const an = i / 16 * Math.PI * 2 + t * 0.05; g.save(); g.translate(f.x + Math.cos(an) * r, yb - 280 + Math.sin(an) * r * 0.9); g.rotate(an + t * 0.2); g.fillStyle = '#FFFDF4'; g.fillRect(-16, -21, 32, 42); g.restore(); } g.restore(); }      // 全文审阅：一圈书页冲击波
  if (id === 'fullmoon' && !f.mv.go && t > 4) { const R = 50 + (f.mv.ch || 0) * 1.6; g.save(); g.translate(f.x + face * 130, yb - h * 0.55); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg(0, 0, R * 0.2, R * 1.6, ['rgba(255,242,196,0.9)', 'rgba(255,233,168,0.4)', 'rgba(255,233,168,0)']); g.beginPath(); g.arc(0, 0, R * 1.6, 0, 7); g.fill(); g.restore(); g.save(); g.fillStyle = '#FFF2C4'; g.strokeStyle = '#C9A34A'; g.lineWidth = 4; g.beginPath(); g.arc(f.x + face * 130, yb - h * 0.55, R, 0, 7); g.fill(); g.stroke(); g.restore(); if ((f.mv.ch || 0) >= 59) txt('满月！', f.x, yb - h - 30, { size: 32, w: 900, fill: '#FFE9A8', stroke: INK, sw: 7, align: 'center' }); }      // 满月弹：手里的月亮越蓄越大
  if (id === 'bigqi' && t >= 8 && t < 56) { const k = Math.min(1, (t - 8) / 8), pop = t >= 44 ? 1 + (t - 44) / 6 : 1, R = 230 * k * pop, cy = yb - h * 0.45; g.save(); g.globalAlpha = t >= 44 ? Math.max(0, 1 - (t - 44) / 12) : 0.9; g.globalCompositeOperation = 'lighter'; g.fillStyle = rg(f.x, cy, R * 0.2, R, ['rgba(255,216,77,0.85)', 'rgba(255,122,168,0.5)', 'rgba(255,122,168,0)']); g.beginPath(); g.arc(f.x, cy, R, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over';      // 大号表情包：一个巨大的笑脸能量球
    g.fillStyle = '#5A3A10'; g.beginPath(); g.arc(f.x - R * 0.3, cy - R * 0.2, R * 0.08, 0, 7); g.arc(f.x + R * 0.3, cy - R * 0.2, R * 0.08, 0, 7); g.fill(); g.strokeStyle = '#5A3A10'; g.lineWidth = R * 0.05; g.beginPath(); g.arc(f.x, cy + R * 0.05, R * 0.4, 0.3, Math.PI - 0.3); g.stroke(); g.restore(); }
  if (id === 'pose' && !f.mv.f) { g.save(); g.globalAlpha = 0.7; for (let i = 0; i < 4; i++) { const an = t * 0.12 + i * Math.PI / 2; star4(f.x + Math.cos(an) * h * 0.4, yb - h * 0.6 + Math.sin(an) * h * 0.3, 18, an, i % 2 ? '#FFD84D' : '#FF7AA8', 0.9); } g.restore(); txt('咔嚓～', f.x, yb - h - 24, { size: 26, w: 900, fill: '#FF7AA8', stroke: '#fff', sw: 6, align: 'center' }); }      // 摆拍架势：身边转着小星星
  if (id === 'axe' || id === 'revenge') { const t0 = id === 'axe' ? 22 : 12; if (t >= t0 && t < t0 + 12) { const k = (t - t0) / 12; g.save(); g.translate(f.x + face * 60, yb - h * 0.45); g.scale(face, 1); g.globalAlpha = 1 - k; g.fillStyle = lg(0, -300, 300, 200, ['#FFF3B0', '#FF5A6E']); g.beginPath(); g.arc(0, 0, 330, -1.9, 0.9); g.arc(-50, 20, 270, 0.75, -1.75, true); g.closePath(); g.fill(); g.restore(); } }
  if (id === 'scroll' && f.mv.len) { const len = f.mv.len * (t < 46 ? 1 : 1 - clamp((t - 46) / 14)), x0 = f.x + face * 40, x1 = x0 + face * len; g.save(); g.fillStyle = '#FFFDF4'; g.strokeStyle = '#8A7A5A'; g.lineWidth = 4; g.beginPath(); g.rect(Math.min(x0, x1), FL - 26, Math.abs(x1 - x0), 34); g.fill(); g.stroke(); g.strokeStyle = 'rgba(90,100,150,0.55)'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(Math.min(x0, x1) + 14, FL - 18 + i * 9); g.lineTo(Math.max(x0, x1) - 30, FL - 18 + i * 9); g.stroke(); } g.fillStyle = '#F3E9CF'; g.beginPath(); g.arc(x1, FL - 9, 26, 0, 7); g.fill(); g.stroke(); g.restore(); }
  if (id === 'beam' && t >= 2 && t < 72 && !/[?&]fan=0/.test(location.search)) gptFan(s, f, yb, t, face);      // 第 79 圈：GPT 光束改扇形多束（主光束后面四条细激光扫动 + 手前法阵 + 起手聚光），?fan=0 关
  if (id === 'beam' && f.mv.on) { const x0 = f.x + face * 70, y0 = yb - 340, hh = 230, x1 = face > 0 ? 2300 : -200; g.save(); g.fillStyle = lg(0, y0, 0, y0 + hh, ['rgba(142,124,240,0)', 'rgba(228,222,255,0.95)', '#FFFFFF', 'rgba(228,222,255,0.95)', 'rgba(142,124,240,0)']); g.fillRect(Math.min(x0, x1), y0, Math.abs(x1 - x0), hh);
    g.beginPath(); g.rect(Math.min(x0, x1), y0 + 30, Math.abs(x1 - x0), hh - 60); g.clip(); const L = ['好的！以下是我的回答，共分为三个部分：', '一、首先……  二、其次……  三、最后……', '综上所述，需要注意以下几点：1. 2. 3.']; for (let i = 0; i < 3; i++) { const sp = 900 + i * 260, w0 = 1500, off = ((s.f * sp / 60 + i * 400) % w0); for (let k = -1; k < 3; k++) txt(L[i], face > 0 ? x0 + off + (k - 1) * w0 : x0 - off - (k - 1) * w0, y0 + 84 + i * 50, { size: 38, w: 800, fill: '#3E2FA8', align: face > 0 ? 'left' : 'right' }); } g.restore(); glow(x0, y0 + hh / 2, 200, '#B9AEFF', 0.7); }
  if (id === 'lock') { const op = s.F[1 - f.idx], oy = FL - op.y - op.ch.h * 0.5, pct = f.mv.pct || 0, r = 150 - pct * 0.7; g.save(); g.translate(op.x, oy); g.strokeStyle = pct >= 100 ? '#FF5A6E' : '#6FA8FF'; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); g.rotate(s.f * 0.06); for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(r - 24, 0); g.lineTo(r + 30, 0); g.stroke(); } g.restore(); txt('置信度 ' + Math.floor(pct) + '%', op.x, oy - r - 22, { size: 40, w: 900, fill: '#fff', stroke: '#0E1430', sw: 8, align: 'center' });
    if (f.mv.fire && s.f - f.mv.fire < 16) { const k = (s.f - f.mv.fire) / 16, y0 = yb - h * 0.55; g.save(); g.globalAlpha = 1 - k; g.strokeStyle = '#fff'; g.lineWidth = 46 * (1 - k) + 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(f.x + face * 60, y0); g.lineTo(op.x, oy); g.stroke(); g.strokeStyle = '#6FA8FF'; g.lineWidth = 90 * (1 - k); g.globalAlpha = 0.45 * (1 - k); g.stroke(); g.restore(); } }
  if (id === 'drop' && f.mv.x !== undefined && t < 44) { g.save(); g.translate(f.mv.x, FL + 4); g.scale(1, 0.22); g.strokeStyle = '#FF5A6E'; g.lineWidth = 10; g.setLineDash([26, 16]); g.lineDashOffset = -s.f * 3; g.beginPath(); g.arc(0, 0, 200, 0, 7); g.stroke(); g.restore(); txt('▼', f.mv.x, FL - 560 + Math.sin(s.f * 0.4) * 12, { size: 60, w: 900, fill: '#FF5A6E', stroke: '#fff', sw: 8, align: 'center' }); }
}
function clStorm(s, f, yb, h, u, front) {      // 第 79 圈：Claude「逐条回复」十键全对的收尾：身后升起一本发光巨书翻页，几十张书页横扫全屏，对手脚下一道橙白光柱
  if (u < 0 || u > 44) return; const fc = f.face, op = s.F[1 - f.idx], FL = yb + f.y, out = u > 24 ? Math.max(0, 1 - (u - 24) / 10) : 1;
  if (!front) {
    const k = E.out3(Math.min(1, u / 10)), bx = f.x - fc * 200, by = yb - h - 110 - 70 * k, W = 300 * (0.6 + 0.4 * k), H = 250 * (0.6 + 0.4 * k);
    g.save(); g.globalAlpha = 0.92 * out * Math.min(1, u / 4); g.translate(bx, by);
    g.globalCompositeOperation = 'lighter'; g.fillStyle = rg(0, 0, 0, W * 1.5, ['rgba(255,190,110,0.75)', 'rgba(232,116,59,0.3)', 'rgba(232,116,59,0)']); g.fillRect(-W * 1.6, -W * 1.6, W * 3.2, W * 3.2); g.globalCompositeOperation = 'source-over';
    for (const sd of [-1, 1]) { g.fillStyle = '#7A2E0C'; g.beginPath(); g.moveTo(0, H * 0.06); g.lineTo(sd * W * 1.04, -H * 0.02); g.lineTo(sd * W * 1.04, H * 1.02); g.lineTo(0, H * 1.1); g.closePath(); g.fill();      // 封皮
      g.fillStyle = '#FFF6E6'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(sd * W * 0.5, -H * 0.12, sd * W, -H * 0.06); g.lineTo(sd * W, H * 0.96); g.quadraticCurveTo(sd * W * 0.5, H * 0.9, 0, H); g.closePath(); g.fill();      // 书页
      g.strokeStyle = 'rgba(122,46,12,0.35)'; g.lineWidth = 5; for (let i = 0; i < 7; i++) { const yy = H * (0.14 + i * 0.11); g.beginPath(); g.moveTo(sd * W * 0.12, yy - H * 0.04); g.lineTo(sd * W * (0.86 - (i === 6 ? 0.3 : 0)), yy - H * 0.05); g.stroke(); } }
    const fl = (u % 6) / 6, sx = Math.cos(fl * Math.PI); g.save(); g.scale(sx, 1); g.fillStyle = sx > 0 ? '#FFFFFF' : '#FFE9D2'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(W * 0.5, -H * 0.2, W, -H * 0.1); g.lineTo(W, H * 0.92); g.quadraticCurveTo(W * 0.5, H * 0.84, 0, H); g.closePath(); g.fill(); g.restore();      // 正在翻的那一页
    g.strokeStyle = '#E8743B'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, H); g.stroke(); g.restore();
    return; }
  g.save(); g.globalAlpha = out;
  if (u >= 3 && u < 26) { const k = (u - 3) / 23, W0 = 150 * (1 - k * 0.5) * Math.min(1, (u - 3) / 3); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = lg(op.x - W0, 0, op.x + W0, 0, ['rgba(232,116,59,0)', 'rgba(255,170,90,0.7)', 'rgba(255,255,255,0.95)', 'rgba(255,170,90,0.7)', 'rgba(232,116,59,0)']); g.fillRect(op.x - W0, FL - 1400, W0 * 2, 1400); g.restore(); }      // 光柱
  for (let i = 0; i < 46; i++) { const r1 = hash(i * 1.37), r2 = hash(i * 2.91), r3 = hash(i * 5.13), u0 = Math.floor(r1 * 10), v = u - u0; if (v < 0) continue;
    const x0 = f.x - fc * 150, x = x0 + fc * v * (70 + r2 * 70), y = yb - 380 + (r3 - 0.5) * 700 + Math.sin(v * 0.3 + i) * 40 + v * (r1 - 0.5) * 8, sc = 0.7 + r2 * 0.8; if (Math.abs(x - x0) > 2600) continue;
    g.save(); g.translate(x, y); g.rotate((r3 - 0.5) * 1.2 + v * 0.15 * (r1 - 0.5)); g.scale(sc * Math.cos(v * 0.35 + i), sc); g.fillStyle = '#FFFDF4'; g.strokeStyle = '#E8743B'; g.lineWidth = 3; g.beginPath(); g.rect(-24, -32, 48, 64); g.fill(); g.stroke(); g.fillStyle = 'rgba(122,46,12,0.45)'; for (let j = 0; j < 4; j++) g.fillRect(-16, -20 + j * 12, j === 3 ? 18 : 32, 4); g.restore(); }      // 书页风暴
  g.restore();
}
function gptFan(s, f, yb, t, face) {      // 第 79 圈：GPT「好的！以下是……」扇形多束激光（只画，判定不变）
  const x0 = f.x + face * 70, cy = yb - 225, on = t >= 8 && t < 68, a = on ? Math.min(1, (t - 8) / 5) * Math.min(1, (68 - t) / 6) : 0;
  g.save(); g.globalCompositeOperation = 'lighter';
  if (t < 12) { const k = Math.min(1, t / 8); for (let i = 0; i < 12; i++) { const an = i * 0.5236 + t * 0.05, r0 = 260 * (1 - k) + 30, r1 = r0 + 90 * (1 - k * 0.6); g.strokeStyle = rgba('#E4DEFF', t < 8 ? 0.85 : 0.85 * (1 - (t - 8) / 4)); g.lineWidth = 3; g.beginPath(); g.moveTo(x0 + Math.cos(an) * r1, cy + Math.sin(an) * r1); g.lineTo(x0 + Math.cos(an) * r0, cy + Math.sin(an) * r0); g.stroke(); } glow(x0, cy, 70 + 60 * k, '#B9AEFF', 0.5 + 0.4 * k); }      // 起手：十二条光线往手心收
  if (a > 0) {
    const B = [[-3, 0.33, 40], [-2, 0.21, 54], [-1, 0.11, 64], [1, -0.11, 64], [2, -0.21, 54], [3, -0.33, 40]];
    for (const [i, base, w] of B) { const ang = base * (0.55 + 0.45 * Math.min(1, (t - 8) / 14)) + Math.sin(t * 0.11 + i * 1.7) * 0.035, wk = w * (0.8 + 0.2 * Math.sin(t * 0.7 + i)); g.save(); g.translate(x0, cy); g.scale(face, 1); g.rotate(ang); g.globalAlpha = a * 0.8;
      g.fillStyle = lg(0, -wk, 0, wk, ['rgba(110,80,255,0)', 'rgba(120,90,255,0.75)', [0.44, 'rgba(200,190,255,0.95)'], [0.5, '#FFFFFF'], [0.56, 'rgba(200,190,255,0.95)'], 'rgba(120,90,255,0.75)', 'rgba(110,80,255,0)']); g.beginPath(); g.moveTo(90, -3); g.lineTo(2600, -wk); g.lineTo(2600, wk); g.lineTo(90, 3); g.closePath(); g.fill();
      g.strokeStyle = '#FFFFFF'; g.lineWidth = 2.5; g.globalAlpha = a; g.beginPath(); g.moveTo(10, 0); g.lineTo(2600, 0); g.stroke();
      g.fillStyle = '#FFFFFF'; for (let k = 0; k < 7; k++) { const u = ((s.f * 38 + k * 380 + i * 97) % 2600); g.globalAlpha = a * 0.9; g.fillRect(u, -3, 46, 6); }
      g.restore(); }
    g.save(); g.translate(x0, cy); g.scale(0.34 * face, 1); g.globalAlpha = a; g.strokeStyle = '#E4DEFF'; g.lineWidth = 5; for (const [R, sp] of [[150, 0.08], [112, -0.13]]) { g.save(); g.rotate(s.f * sp); g.beginPath(); g.arc(0, 0, R, 0, 7); g.stroke(); for (let k = 0; k < 12; k++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(R - 12, 0); g.lineTo(R + 12, 0); g.stroke(); } g.restore(); } g.restore();      // 手前法阵（侧面压扁的两圈刻度环）
    for (let k = 0; k < 3; k++) { const yy = cy - 120 + k * 120; txt(String(k + 1), x0 - face * 6, yy, { size: 34, w: 900, fam: F.en, fill: rgba('#FFFFFF', a), stroke: rgba('#3E2FA8', a * 0.8), sw: 6, align: 'center' }); }      // 一、二、三
    glow(x0 + face * 60, cy, 150, '#B9AEFF', 0.3 * a);
  }
  g.restore();
}
// —— 飞行物 ——
function drawPillar(x, FL, w, t, a, tint) {      // 炸毛光柱：紫白光柱 + 往上飘的毛 + 地上一圈
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; const W0 = 90 * w * (1 + Math.sin(t * 0.5) * 0.06);
  const tc = tint || '#B15CF5'; g.fillStyle = lg(x - W0, 0, x + W0, 0, [rgba(tc, 0), rgba(tc, 0.55), 'rgba(255,255,255,0.9)', rgba(tc, 0.55), rgba(tc, 0)]); g.fillRect(x - W0, FL - 1100, W0 * 2, 1100);
  for (let i = 0; i < 10; i++) { const k = ((t * 0.02 + hash(i * 7.7)) % 1), yy = FL - k * 900, xx = x + (hash(i * 3.1) - 0.5) * W0 * 1.4; g.fillStyle = 'rgba(240,194,255,' + (1 - k) + ')'; g.beginPath(); g.ellipse(xx, yy, 5, 14, Math.sin(t * 0.2 + i), 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(240,194,255,0.8)'; g.lineWidth = 6; g.beginPath(); g.ellipse(x, FL, W0 * 1.5, 18, 0, 0, 7); g.stroke(); g.restore();
}
// 场地里会动的小东西（世界坐标，画在场地图上面、人下面）；重击时跟着抖
const STAGE_FX = {
  office: { tank: [920, 300, 330, 260], screen: [1706, 352, 150, 80] },
  meeting: { tank: [1575, 262, 300, 250], clock: [1050, 131, 70] },
  interview: { tank: [870, 300, 600, 300], steam: [[1869, 870], [1701, 885]] },
  nextdoor: { motes: [1414, 300, 220, 260], steam: [[1741, 490]] },
};
function drawStageFx(s, kick) {
  if (typeof STAGE2 !== 'undefined' && STAGE2[s.stage]) STAGE2[s.stage](s, kick);      // 第 68 圈：动态舞台（js/stage2.js）
  const D = STAGE_FX[s.stage]; if (!D) return; const t = s.f, jig = kick > 0.02 ? (hash(t) - 0.5) * 10 * kick / 0.05 : 0;
  g.save(); g.translate(0, jig);
  if (D.tank) { const [cx, cy, rx, ry] = D.tank; g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.clip();      // 水族窗：鱼群游过 + 气泡往上冒
    for (let i = 0; i < 9; i++) { const sp = 0.6 + hash(i * 3.1) * 1.2, dir = i % 3 ? 1 : -1, x = cx - rx * 1.2 + ((t * sp + hash(i) * 3000) % (rx * 2.4)), xx = dir > 0 ? x : 2 * cx - x, y = cy - ry * 0.6 + hash(i * 7.7) * ry * 1.2 + Math.sin(t * 0.04 + i) * 10, sz = 10 + hash(i * 1.3) * 16;
      g.fillStyle = 'rgba(20,40,70,0.55)'; g.beginPath(); g.ellipse(xx, y, sz, sz * 0.45, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(xx - dir * sz, y); g.lineTo(xx - dir * sz * 1.7, y - sz * 0.5); g.lineTo(xx - dir * sz * 1.7, y + sz * 0.5); g.closePath(); g.fill(); }
    for (let i = 0; i < 14; i++) { const x = cx - rx + hash(i * 5.3) * rx * 2 + Math.sin(t * 0.05 + i) * 6, y = cy + ry - ((t * (1 + hash(i) * 1.5) + hash(i * 9) * 900) % (ry * 2)); g.strokeStyle = 'rgba(220,245,255,0.55)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 3 + hash(i * 2) * 5, 0, 7); g.stroke(); }
    g.restore(); }
  if (D.screen) { const [x, y, w, h] = D.screen; g.save(); g.globalAlpha = 0.25 + 0.15 * Math.sin(t * 0.07); g.fillStyle = '#7CF0B4'; for (let i = 0; i < 4; i++) { const ww = w * (0.3 + hash(i + Math.floor(t / 40)) * 0.6); g.fillRect(x - w / 2 + 10, y - h / 2 + 10 + i * 16, ww, 6); } g.restore(); }      // 显示器上滚动的代码行
  if (D.clock) { const [x, y, r] = D.clock; g.save(); g.translate(x, y); g.strokeStyle = '#B81F3A'; g.lineWidth = 3; g.rotate(t / 60 * Math.PI / 30); g.beginPath(); g.moveTo(0, 8); g.lineTo(0, -r * 0.8); g.stroke(); g.restore(); }      // 挂钟秒针在走
  if (D.motes) { const [cx, cy, rx, ry] = D.motes; for (let i = 0; i < 18; i++) { const x = cx - rx + ((hash(i * 4.1) * rx * 2 + t * 0.3 * (0.5 + hash(i))) % (rx * 2)), y = cy - ry + ((hash(i * 6.7) * ry * 2 + Math.sin(t * 0.02 + i) * 30 + t * 0.15) % (ry * 2)); g.fillStyle = 'rgba(255,240,200,' + (0.35 + 0.35 * Math.sin(t * 0.05 + i)).toFixed(3) + ')'; g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill(); } }      // 阳光里飘的灰尘
  if (D.steam) for (const [x, y] of D.steam) for (let i = 0; i < 3; i++) { const k = ((t * 0.012 + i / 3) % 1); g.save(); g.globalAlpha = Math.sin(k * Math.PI) * 0.45; g.strokeStyle = '#FFFFFF'; g.lineWidth = 6 - k * 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + (i - 1) * 14, y - k * 120); g.quadraticCurveTo(x + (i - 1) * 14 + Math.sin(t * 0.08 + i) * 18, y - k * 120 - 30, x + (i - 1) * 14, y - k * 120 - 60); g.stroke(); g.restore(); }      // 饭 / 茶冒热气
  g.restore();
}
// ===== 第 67 圈（用户反馈：飞行道具像几张白纸平移）：所有飞行道具包一层能量波 —— 出手蓄能闪光 + 发光核心（加色）+ 外围旋转能量层 + 拖尾残影 / 粒子 + 地面反光；
// 梗元素（纸页、毛线球、表情包……）缩小留在核心里当图标。命中爆裂 / 相杀在 drawFx 的 ppop / pclash。EX 更大更亮。?ewave=0 关
const ECOL = { ds: ['#2F8CFF', '#BFF0FF'], gem: ['#A040FF', '#F0C8FF'], gpt: ['#5A3CFF', '#A898FF'], grok: ['#FF2E44', '#FFD0A0'], claude: ['#FFA21F', '#FFF0C0'], kimi: ['#FFC94A', '#FFF6D0'], glm: ['#FF3346', '#FFE0E4'], qwen: ['#FF5A3C', '#FFD8A0'], dou: ['#FF5AA8', '#FFE0F0'], surf: ['#14D6D0', '#D8FFFF'], nin: ['#22C4F0', '#E0FAFF'] };
const EWAVE = { yarn: 1, fan: 1, paper: 1, paper2: 1, moon: 1, zbook: 1, blade: 1, emoji: 1, popup: 1, usb: 1, coin: 1, num: 1, splash: 1, shuri: 1, ring: 1, banana: 0, basin: 0, tea: 1, tea2: 1, code: 1, cloud: 1, alt: 0, sign: 0 };
const EOFF = /[?&]ewave=0/.test(typeof location !== 'undefined' ? location.search : '');
function projEnergy(s, p, FL, front) {
  const own = s.F[p.own], C = ECOL[own ? own.id : 'ds'] || [own.ch.col, own.ch.col2], x = p.x, y = FL - p.y, sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = -p.vy / sp;
  const ex = p.ex ? 1.35 : 1, R = Math.max(122, Math.min(190, Math.max(p.w, p.h) * 0.95)) * ex, born = Math.min(1, p.t / 6), pulse = 1 + 0.08 * Math.sin(p.t * 0.9 + p.id);
  if (p._x0 == null) { p._x0 = x; p._y0 = y; }
  g.save(); g.globalCompositeOperation = 'lighter';
  if (!front) {
    if (p.y < 520) { const gy = FL + 6, a = 0.55 * (1 - p.y / 520) * born; g.fillStyle = rg(x, gy, 0, R * 2.2, [rgba(C[0], a), rgba(C[0], a * 0.3), rgba(C[0], 0)]); g.save(); g.translate(x, gy); g.scale(1, 0.22); g.translate(-x, -gy); g.fillRect(x - R * 2.4, gy - R * 2.4, R * 4.8, R * 4.8); g.restore(); }      // 地面反光
    { g.save(); g.translate(x, y); g.rotate(Math.atan2(-uy, ux)); const L = R * (2.6 + 0.3 * Math.sin(p.t * 0.7)) * Math.min(1, 0.4 + sp / 1100) * born;      // 彗星尾：前端饱满、后端收尖（GPT r67）
      for (let k = 0; k < 3; k++) { const wk = R * (0.95 - k * 0.28), Lk = L * (1 - k * 0.22); g.fillStyle = lg(0, 0, -Lk, 0, [rgba(k === 2 ? '#FFFFFF' : k ? C[1] : C[0], 0.75 - k * 0.15), rgba(C[0], 0.25), rgba(C[0], 0)]); g.beginPath(); g.moveTo(R * 0.2, -wk);
        for (let q = 1; q <= 6; q++) { const xx = -Lk * q / 6, jit = (hash(Math.floor(p.t / 2) * 13 + q + k * 7 + p.id) - 0.5) * R * 0.3; g.lineTo(xx, -wk * (1 - q / 6) + jit); } for (let q = 5; q >= 0; q--) { const xx = -Lk * q / 6, jit = (hash(Math.floor(p.t / 2) * 17 + q + k * 5 + p.id) - 0.5) * R * 0.3; g.lineTo(xx, wk * (1 - q / 6) + jit); } g.closePath(); g.fill(); }
      g.restore(); }
    for (let i = 0; i < 14; i++) { const h1 = hash(p.id * 7 + i), q = ((p.t * 0.07 + h1) % 1), d = R * (0.4 + q * 3.2), off = (hash(i * 3.3 + p.id) - 0.5) * R * 1.4 * (1 - q * 0.4), px = x - ux * d - uy * off, py = y + uy * d - ux * off;
      g.fillStyle = rgba(i % 3 ? C[0] : C[1], 0.85 * (1 - q)); g.beginPath(); g.arc(px, py, (5 + 7 * h1) * (1 - q) * ex, 0, 7); g.fill(); }      // 拖尾粒子
    g.fillStyle = rg(x, y, R * 0.2, R * 1.9 * pulse, [rgba(C[0], 0.55 * born), rgba(C[0], 0.18 * born), rgba(C[0], 0)]); g.fillRect(x - R * 2, y - R * 2, R * 4, R * 4);      // 外围光晕
    g.translate(x, y); g.rotate(Math.atan2(-uy, ux));
    for (let j = 0; j < 0; j++) { g.save(); g.rotate(p.t * (0.22 + j * 0.07) * (j % 2 ? -1 : 1) + j * 2); g.scale(1.25, 0.82); g.strokeStyle = rgba(j === 1 ? C[1] : C[0], 0.7 * born); g.lineWidth = (7 - j * 1.6) * ex; g.lineCap = 'round';
      for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(0, 0, R * (0.95 + j * 0.16), k * 2.09, k * 2.09 + 1.1); g.stroke(); } g.restore(); }      // 外围旋转能量纹
    for (let k = 0; k < 5; k++) { const L = R * (1.6 + 0.9 * hash(Math.floor(p.t / 2) * 5 + k + p.id)), w2 = R * 0.34; g.fillStyle = lg(-L, 0, 0, 0, [rgba(C[0], 0), rgba(C[0], 0.35 * born)]); g.beginPath(); g.moveTo(0, -w2 + (k - 2) * w2 * 0.45); g.lineTo(-L, (k - 2) * w2 * 0.9); g.lineTo(0, w2 + (k - 2) * w2 * 0.45); g.closePath(); g.fill(); }      // 火舌（往后飘）
    if (own && EXTRA_TRAIL[own.id]) EXTRA_TRAIL[own.id](p, R, R * (2.6 + 0.3 * Math.sin(p.t * 0.7)) * Math.min(1, 0.4 + sp / 1100) * born, C, born);      // 第 68 圈：专属一笔画在光晕 / 火舌之后，不被加色洗白
  } else {
    const cw = CORE_W[own ? own.id : ''] ?? 1;      // 第 68 圈（GPT r68）：豆包 / Kimi 白芯缩小，露出主题色外壳
    g.fillStyle = rg(x, y, 0, R * 0.95 * pulse, [[0, 'rgba(255,255,255,' + (0.95 * cw * born) + ')'], [0.16 * cw, rgba(C[1], 0.9 * born)], [0.45, rgba(C[0], 0.65 * born)], [1, rgba(C[0], 0)]]); g.beginPath(); g.ellipse(x + ux * R * 0.08, y - uy * R * 0.08, R * pulse * 1.08, R * pulse * 0.9, Math.atan2(-uy, ux), 0, 7); g.fill();      // 发光核心（略扁、前端饱满）
    star4(x, y, R * (0.5 + 0.15 * Math.sin(p.t * 1.3)) * cw, p.t * 0.12, rgba('#FFFFFF', 0.4 * born * cw), 1);
  }
  g.restore();
}
function streamFan(x, y, fc, L, W, C, a, t) {      // 第 68 圈：沿发射方向展开的流线（豆包出手）。前端尖、后端粗，按 t 轻微错位
  if (a <= 0) return; g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (let i = 0; i < 9; i++) { const h1 = hash(i * 5.7 + 3), off = (i / 8 - 0.5) * W * 2 * (0.6 + 0.4 * h1), Li = L * (0.55 + 0.45 * hash(i * 2.3 + Math.floor(t / 2))), x0 = x - fc * L * 0.1 * h1, y0 = y + off;
    const gr = g.createLinearGradient(x0, y0, x0 + fc * Li, y0 + off * 0.25); gr.addColorStop(0, rgba(C[i % 3 ? 0 : 1], 0.85 * a)); gr.addColorStop(1, rgba(C[0], 0));
    g.strokeStyle = gr; g.lineWidth = (i % 3 ? 7 : 4) * (1 - Math.abs(off) / W * 0.4); g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + fc * Li * 0.5, y0 + off * 0.05, x0 + fc * Li, y0 + off * 0.25); g.stroke(); }
  g.fillStyle = rg(x, y, 0, W * 1.1, [rgba('#FFFFFF', 0.7 * a), rgba(C[0], 0.4 * a), rgba(C[0], 0)]); g.beginPath(); g.ellipse(x + fc * W * 0.3, y, W * 1.2, W * 0.75, 0, 0, 7); g.fill(); g.restore();
}
const CORE_W = { dou: 0.55, kimi: 0.75 };
const EXTRA_TRAIL = {      // 第 68 圈（GPT r67 第二轮）：每人飞行层的专属一笔（画在彗星尾之后、已平移旋转到波心、+x = 前进方向）
  kimi: (p, R, L, C, born) => {      // 月牙边：两条亮弧从波头上下沿收向尾尖，形成连续收尖的拖尾
    { const gr = g.createLinearGradient(R * 0.2, 0, -L * 0.95, 0); gr.addColorStop(0, rgba(C[0], 0.55 * born)); gr.addColorStop(0.5, rgba('#B48CFF', 0.3 * born)); gr.addColorStop(1, rgba('#B48CFF', 0)); g.fillStyle = gr;      // 第 68 圈（GPT r68）：两弧之间填成贴住波体、向后变细变淡的连续拖尾
      g.beginPath(); g.moveTo(R * 0.15, -R * 0.82); g.quadraticCurveTo(-L * 0.35, -R * 0.95, -L * 0.92, 0); g.quadraticCurveTo(-L * 0.35, R * 0.95, R * 0.15, R * 0.82); g.closePath(); g.fill(); }
    for (const sd of [-1, 1]) for (let k = 0; k < 2; k++) { g.strokeStyle = rgba(k ? '#FFF2C8' : '#B48CFF', (k ? 0.4 : 0.5) * born); g.lineWidth = (k ? 2 : 7) * (p.ex ? 1.3 : 1); g.lineCap = 'round';
      g.beginPath(); g.moveTo(R * 0.15, sd * R * 0.82); g.quadraticCurveTo(-L * 0.35, sd * R * (0.95 + 0.05 * Math.sin(p.t * 0.5)), -L * 0.92, sd * R * 0.04); g.stroke(); }
    for (let k = 0; k < 3; k++) { const q = ((p.t * 0.05 + k / 3) % 1), xx = -L * (0.15 + 0.7 * q), r = R * 0.42 * (1 - q); g.strokeStyle = rgba(C[1], 0.55 * (1 - q) * born); g.lineWidth = 5 * (1 - q) + 1; g.beginPath(); g.arc(xx, 0, r, -1.1, 1.1); g.stroke(); }      // 后退的小月牙残影
  },
  glm: (p, R, L, C, born) => {      // 出手的蓝紫电弧接到波体上：三道闪电从波头向后收束到尾尖，每 2 步换形
    const seed = Math.floor(p.t / 2) * 11 + p.id; g.save(); g.globalCompositeOperation = 'source-over'; g.lineCap = 'round'; g.lineJoin = 'round';      // 正常叠加：加色会把蓝紫和红混成粉白，看不出是出手那道电弧
    for (let b = 0; b < 3; b++) { const y0 = (b - 1) * R * 0.62, pts = [[R * 0.35, y0 * 0.6]]; for (let q = 1; q <= 6; q++) pts.push([R * 0.35 - (L * 0.95 + R * 0.35) * q / 6, y0 * (1 - q / 6) + (hash(seed + b * 7 + q) - 0.5) * R * 0.55 * (1 - q / 7)]);
      for (let k = 0; k < 2; k++) { g.strokeStyle = k ? rgba('#E8ECFF', 0.9 * born) : rgba('#5A5CFF', 0.85 * born); g.lineWidth = k ? 3 : 10; g.beginPath(); pts.forEach(([a, c], i) => i ? g.lineTo(a, c) : g.moveTo(a, c)); g.stroke(); } }
    for (let k = 0; k < 2; k++) { const an = hash(seed + 40 + k) * 6.28; g.strokeStyle = rgba('#A8B4FF', 0.8 * born); g.lineWidth = 3; g.beginPath(); g.arc(0, 0, R * (0.7 + 0.15 * k), an, an + 0.9); g.stroke(); } g.restore();      // 波头表面爬的小电弧
  },
};
function muzzle(s, p, FL) {      // 出手蓄能闪光（只在头 10 步，画在出手点）
  if (p.t > 10 || p._x0 == null) return; const own = s.F[p.own], C = ECOL[own ? own.id : 'ds'] || ['#FFFFFF', '#FFFFFF'], k = p.t / 10, R = 140 * (p.ex ? 1.4 : 1), x = p._x0, y = p._y0;
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg(x, y, 0, R * (0.6 + k), ['rgba(255,255,255,' + 0.7 * (1 - k) + ')', rgba(C[0], 0.5 * (1 - k)), rgba(C[0], 0)]); g.fillRect(x - R * 2, y - R * 2, R * 4, R * 4);
  g.strokeStyle = rgba(C[1], 1 - k); g.lineWidth = 10 * (1 - k) + 1; g.beginPath(); g.ellipse(x, y, R * (0.3 + 1.2 * E.out3(k)), R * (0.3 + 1.2 * E.out3(k)) * 0.55, 0, 0, 7); g.stroke();
  for (let i = 0; i < 8; i++) { const an = i * 0.785 + 0.2, L = R * (0.6 + 1.4 * E.out3(k)); g.strokeStyle = rgba(i % 2 ? '#FFFFFF' : C[1], 0.9 * (1 - k)); g.lineWidth = 4; g.beginPath(); g.moveTo(x + Math.cos(an) * L * 0.4, y + Math.sin(an) * L * 0.4); g.lineTo(x + Math.cos(an) * L, y + Math.sin(an) * L); g.stroke(); }
  star4(x, y, R * 1.3 * (1 - k), 0, '#FFFFFF', 1 - k); g.restore();
}
function drawProjLife(s, p, FL) {      // 飞行道具的四个阶段：成型（放大 + 光环）→ 飞行（速度拖尾）→ 命中爆开 / 消散（在 drawFx 的 ppop / pfade）
  if (typeof MEME !== 'undefined' && MEME.proj(s, p, FL)) return;      // D 代理：饭粒弹（meme_ds.js 自己画枪口火光 / 曳光 / 命中碎饭）
  const x = p.x, y = FL - p.y, col = s.F[p.own] ? s.F[p.own].ch.col2 : '#FFE066', NOFORM = { mpillar: 1, breath: 1, pillar: 1, wave: 1, fix: 1, tea: 1, bigscroll: 1, sign: 1, box: 1 };
  if (p.dmg && !NOFORM[p.kind] && Math.hypot(p.vx, p.vy) > 450) { const sp = Math.hypot(p.vx, p.vy), ux = p.vx / sp, uy = -p.vy / sp; g.save(); g.lineCap = 'round'; for (let i = 0; i < 4; i++) { const off = (hash(p.id * 3 + i) - 0.5) * p.h * 0.7, L = 60 + sp * 0.08 + i * 18; g.strokeStyle = rgba(i % 2 ? '#FFFFFF' : col, 0.35); g.lineWidth = 4; g.beginPath(); g.moveTo(x - ux * p.w * 0.45 - uy * off, y - uy * p.w * 0.45 + ux * off); g.lineTo(x - ux * (p.w * 0.45 + L) - uy * off, y - uy * (p.w * 0.45 + L) + ux * off); g.stroke(); } g.restore(); }      // 速度拖尾
  const EW = !EOFF && EWAVE[p.kind] && p.dmg; if (EW) { muzzle(s, p, FL); projEnergy(s, p, FL, false); }
  if (EW) { const k = Math.min(1, p.t / 6), sc = 0.82 * (0.5 + 0.5 * E.out3(k)); projEnergy(s, p, FL, true); g.save(); g.globalAlpha = 0.92; g.translate(x, y); g.scale(sc * 0.8, sc * 0.8); g.translate(-x, -y); drawProj(s, p, FL); g.restore(); return; }
  if (p.t < 7 && !NOFORM[p.kind]) { const k = p.t / 7; g.save(); g.globalAlpha = 1 - k; g.strokeStyle = col; g.lineWidth = 8 * (1 - k) + 2; g.beginPath(); g.arc(x, y, Math.max(p.w, 60) * (0.4 + k * 0.9), 0, 7); g.stroke(); star4(x, y, Math.max(p.w, 60) * (1 - k) * 0.9, 0.4, '#FFFFFF', 1 - k); g.restore();      // 成型：一圈光环 + 星芒，本体从小放大
    const sc = 0.45 + 0.55 * E.out3(k); g.save(); g.translate(x, y); g.scale(sc, sc); g.translate(-x, -y); drawProj(s, p, FL); g.restore(); return; }
  drawProj(s, p, FL);
}
function drawProj(s, p, FL) {
  const x = p.x, y = FL - p.y, dir = Math.sign(p.vx) || 1;
  switch (p.kind) {
    case 'blade': { g.save(); g.translate(x, y); g.scale(dir, 1); const a = Math.min(1, p.t / 6, (p.life - p.t) / 12); g.globalAlpha = a; g.fillStyle = lg(-40, 0, 40, 0, ['rgba(208,32,46,0)', 'rgba(208,32,46,0.85)', '#FFFFFF']); g.beginPath(); g.moveTo(-10, -p.h / 2); g.quadraticCurveTo(50, 0, -10, p.h / 2); g.quadraticCurveTo(20, 0, -10, -p.h / 2); g.fill();      // 批注：一道竖着的红笔刀波，慢慢往前
      g.strokeStyle = 'rgba(208,32,46,0.6)'; g.lineWidth = 3; for (let i = 0; i < 4; i++) { const yy = -p.h / 2 + 30 + i * (p.h - 60) / 3; g.beginPath(); g.moveTo(-40 - (p.t * 2 + i * 20) % 40, yy); g.lineTo(-14, yy); g.stroke(); }
      g.fillStyle = '#2A2A2A'; g.beginPath(); g.moveTo(30, -p.h / 2 - 8); g.lineTo(46, -p.h / 2 + 22); g.lineTo(38, -p.h / 2 + 30); g.lineTo(22, -p.h / 2); g.closePath(); g.fill(); g.fillStyle = '#D0202E'; g.beginPath(); g.moveTo(46, -p.h / 2 + 22); g.lineTo(52, -p.h / 2 + 40); g.lineTo(38, -p.h / 2 + 30); g.closePath(); g.fill();      // 刀波顶上一个红笔尖（第 27 圈）
      for (let i = 0; i < 5; i++) { const q = ((p.t * 0.05 + i / 5) % 1); g.fillStyle = `rgba(208,32,46,${0.8 * (1 - q)})`; g.beginPath(); g.arc(-20 - q * 90, -p.h / 2 + 40 + hash(i) * (p.h - 80) + q * q * 40, 5 + 3 * hash(i + 2), 0, 7); g.fill(); } g.restore(); break; }
    case 'moon': { const R = p.w * 0.5, big = p.big, ph = big ? 0.5 : 0.2 + (p.t * 0.008) % 0.6;      // 月亮（第 26 圈）：飞着飞着月相在变（满月弹固定满月），后面一串星屑和三道淡残影
      for (let i = 3; i >= 1; i--) { g.save(); g.globalAlpha = 0.14 / i; g.fillStyle = '#FFE9A8'; g.beginPath(); g.arc(x - dir * i * R * 0.5, y, R * (1 + i * 0.1), 0, 7); g.fill(); g.restore(); }
      for (let i = 0; i < 6; i++) { const q = ((p.t * 0.06 + i / 6) % 1); star4(x - dir * (R * 0.8 + q * R * 2.2), y + (hash(i + p.id) - 0.5) * R * 1.4 + q * 20, 10 * (1 - q) + 3, q * 4, i % 2 ? '#FFF6C0' : '#FFFFFF', 1 - q); }
      moonPhase(x, y, R, ph, 1, 0.5); break; }
    case 'paper2': { const n = p.h > 200 ? 2 : 1, ang = Math.atan2(-p.vy, Math.abs(p.vx || 1)) * dir;      // 书页（第 25 圈）：一边飞一边翻页（横向压缩 + 背面颜色），后面带两张翻过去的残页和几片花瓣；高个版是两页上下叠着、交替翻
      for (let i = 2; i >= 1; i--) pageSheet(x - dir * i * 40, y, p.w * 0.9, p.h / n * 0.9, ang - dir * i * 0.1, (p.t * 0.06 + 0.5 + i * 0.15) % 1, 0.25 / i, 3);
      for (let k = 0; k < n; k++) { const hh = p.h / n; pageSheet(x, y - p.h / 2 + hh * (k + 0.5), p.w, hh - 6, ang + Math.sin(p.t * 0.4 + k) * 0.05, ((p.t * 0.05 + k * 0.5) % 1) * 0.42, 1, 4); }
      for (let i = 0; i < 3; i++) { const q = ((p.t * 0.08 + i / 3) % 1); themeEl('petal', x - dir * (p.w * 0.5 + q * 90), y + (hash(i) - 0.5) * p.h * 0.6 + q * 20, 9, q * 6 + i, 1 - q, '#E8743B'); }
      break; }
    case 'usb': { g.save(); g.translate(x, y); g.rotate(p.t * 0.35 * dir); g.lineJoin = 'round'; g.fillStyle = '#2F3350'; g.strokeStyle = INK; g.lineWidth = 4; rr(-34, -17, 48, 34, 7); g.fill(); g.stroke();      // U 盘（第 22 圈）：机身 + 金属接口（两个方孔）+ 紫色标签 + 一道扫过的反光
      g.fillStyle = '#D5DAE6'; rr(12, -12, 26, 24, 3); g.fill(); g.stroke(); g.fillStyle = '#2F3350'; g.fillRect(20, -7, 6, 5); g.fillRect(20, 2, 6, 5); g.fillStyle = '#8E7CF0'; rr(-28, -10, 26, 20, 4); g.fill(); txt('AI', -15, 7, { size: 15, w: 900, fam: F.en, fill: '#fff', align: 'center' });
      g.save(); rr(-34, -17, 72, 34, 7); g.clip(); const sx = ((p.t * 9) % 140) - 70; g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.moveTo(sx, -20); g.lineTo(sx + 12, -20); g.lineTo(sx - 4, 20); g.lineTo(sx - 16, 20); g.closePath(); g.fill(); g.restore(); g.restore();
      if (p.t % 6 < 3) star4(x + 16, y - 18, 12, 0.3, '#FFFFFF', 0.9); break; }
    case 'breath': { g.save(); g.translate(x, y); g.globalAlpha = Math.min(1, (p.life - p.t) / 8); for (let i = 0; i < 5; i++) { const R = hash(p.id * 3 + i), rr0 = 30 + R * 30 + p.t * 2; g.fillStyle = i % 2 ? 'rgba(201,212,238,0.8)' : 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc((R - 0.5) * p.w * 0.7, (hash(i * 7 + p.id) - 0.5) * p.h * 0.6, rr0, 0, 7); g.fill(); } txt('Z', 0, 12, { size: 50, w: 900, fam: F.en, fill: '#5B6BA8', align: 'center' }); g.restore(); break; }
    case 'mpillar': { const k = p.t < 30 ? 0 : 1, wv = p.t < 30 ? 30 + p.t : 160; g.save(); if (!k) { g.strokeStyle = 'rgba(255,233,168,0.8)'; g.lineWidth = 5; g.setLineDash([18, 12]); g.lineDashOffset = -p.t * 3; g.beginPath(); g.ellipse(x, FL, 140, 22, 0, 0, 7); g.stroke(); g.setLineDash([]); } else drawPillar(x, FL, 1.4, p.t, Math.min(1, (p.life - p.t) / 12), '#FFE9A8'); g.restore(); break; }
    default: { g.save(); g.translate(x, y); g.fillStyle = rg(0, 0, 0, Math.max(30, p.w * 0.6), ['#FFFFFF', 'rgba(255,224,102,0.6)', 'rgba(255,224,102,0)']); g.beginPath(); g.arc(0, 0, Math.max(30, p.w * 0.6), 0, 7); g.fill(); g.restore(); }      // 没专门画法的飞行道具：至少画个光球，不会隐形
    case 'pillar': drawPillar(x, FL, 0.8 + Math.min(0.4, p.t / 30), p.t, Math.min(1, p.t / 6, (p.life - p.t) / 10)); break;
    case 'popup': for (let i = 2; i >= 1; i--) sysPopup(x - dir * i * 26, y, p.w, 0.25 / i); sysPopup(x, y, p.w, 1, { rot: Math.sin(p.t * 0.3) * 0.05 }); break;
    case 'num': { const B = 50; g.save(); g.translate(x, y); for (let i = 3; i >= 1; i--) { g.globalAlpha = 0.22 / i; g.fillStyle = '#B9AEFF'; rr(-B - dir * i * 26, -B * 0.8, B * 2, B * 1.6, 16); g.fill(); } g.globalAlpha = 1;      // 数字弹（第 22 圈）：一个对话气泡里的列表序号「1. / 2. / 3.」，下面两行在「打字」，带光标
      g.rotate(Math.sin(p.t * 0.3 + p.n) * 0.05); g.lineJoin = 'round'; rr(-B, -B * 0.8, B * 2, B * 1.6, 16); g.fillStyle = '#FFFFFF'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#3E2FA8'; g.stroke(); g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(-dir * B * 0.5, B * 0.78); g.lineTo(-dir * B * 0.9, B * 1.2); g.lineTo(-dir * B * 0.1, B * 0.78); g.closePath(); g.fill(); g.stroke();
      txt(p.n + '.', -B * 0.42, 10, { size: 54, w: 900, fam: F.en, fill: '#3E2FA8', align: 'center' }); const L = Math.min(1, p.t / 14); g.fillStyle = '#B9AEFF'; g.fillRect(-B * 0.02, -16, B * 0.85 * L, 9); g.fillRect(-B * 0.02, 4, B * 0.6 * Math.max(0, L * 2 - 1), 9); if (p.t % 10 < 5) { g.fillStyle = '#3E2FA8'; g.fillRect(-B * 0.02 + B * 0.6 * Math.max(0, L * 2 - 1) + 4, 2, 4, 14); }
      g.restore(); break; }
    case 'alt': spr('qwen', x, FL - Math.abs(Math.sin(p.t * 0.5)) * 16, 190, { flip: dir < 0, rot: dir * 0.1 }); break;
    case 'tea': { if (p.splash) break; g.save(); g.translate(x, y); g.rotate(p.t * 0.25 * dir); g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = INK; g.fillStyle = '#F6E3C8'; g.beginPath(); g.moveTo(-30, -36); g.lineTo(30, -36); g.lineTo(22, 44); g.lineTo(-22, 44); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#C9925A'; g.beginPath(); g.moveTo(-27, -6); g.lineTo(27, -6); g.lineTo(22, 44); g.lineTo(-22, 44); g.closePath(); g.fill(); g.fillStyle = '#3A2414'; [[-10, 30], [6, 34], [14, 22], [-2, 20]].forEach(q => { g.beginPath(); g.arc(q[0], q[1], 6, 0, 7); g.fill(); }); g.fillStyle = '#fff'; g.fillRect(-34, -46, 68, 12); g.strokeRect(-34, -46, 68, 12); g.strokeStyle = '#FF7A1A'; g.lineWidth = 8; g.beginPath(); g.moveTo(8, -46); g.lineTo(20, -84); g.stroke(); g.restore(); break; }
    case 'splash': { g.save(); g.translate(x, y); g.scale(dir, 1); const w = p.w * 0.6, wob = Math.sin(p.t * 0.6) * 0.08;      // 第 67 圈：热搜水炮（水弹 + 后面一串水珠）
      for (let k = 1; k <= 5; k++) { g.fillStyle = rgba('#9FF3FF', 0.5 - k * 0.08); g.beginPath(); g.arc(-k * 34, Math.sin(p.t * 0.5 + k) * 10, w * (0.42 - k * 0.05), 0, 7); g.fill(); }
      g.fillStyle = rg(0, 0, 4, w, ['#FFFFFF', '#7FE6F0', rgba('#19B6B0', 0.85)]); g.beginPath(); g.ellipse(0, 0, w * (1 + wob), w * 0.72 * (1 - wob), 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(w * 0.25, -w * 0.25, w * 0.22, w * 0.12, -0.5, 0, 7); g.fill(); g.restore(); break; }
    case 'shuri': { g.save(); g.translate(x, y); g.rotate(p.t * 0.9 * dir); const r = p.w * 0.55;      // 第 67 圈：验证码手里剑（四角星 + 中心环 + 像素尾迹）
      g.fillStyle = '#1A2050'; g.strokeStyle = '#2EC8F0'; g.lineWidth = 4; g.beginPath(); for (let i = 0; i < 8; i++) { const q = i % 2 ? r * 0.3 : r, an = i * Math.PI / 4; g.lineTo(Math.cos(an) * q, Math.sin(an) * q); } g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#B9F3FF'; g.beginPath(); g.arc(0, 0, r * 0.16, 0, 7); g.fill(); g.restore();
      for (let k = 1; k <= 4; k++) { g.fillStyle = rgba('#2EC8F0', 0.55 - k * 0.12); g.fillRect(x - dir * k * 30 - 6, y - 6 + (hash(p.t + k) - 0.5) * 20, 12, 12); } break; }
    case 'fan': { const op = 0.5 + 0.5 * Math.abs(Math.sin(p.t * 0.35)), cp = p.cpn; for (let k = 3; k >= 1; k--) fanShape(x - dir * k * 30, y, 50, p.t * 0.6 * dir - dir * k * 0.5, 0.9 + 1.4 * op, 0.18 / k, cp ? '#FFD23C' : '#FF8A3D');      // 飞扇（第 23 圈）：边转边开合，后面三把残影；带券的那把是金边
      fanShape(x, y, 54, p.t * 0.6 * dir, 0.9 + 1.4 * op, 1, cp ? '#FFD23C' : '#FF8A3D'); g.save(); g.strokeStyle = '#E0475B'; g.lineWidth = 4; g.lineCap = 'round'; const ta = p.t * 0.6 * dir + Math.PI / 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(ta) * 20 - dir * 14, y + Math.sin(ta) * 20 + 10, x - dir * 30, y + 26 + Math.sin(p.t * 0.7) * 6); g.stroke(); g.restore(); break; }
    case 'emoji': { for (let k = 1; k <= 5; k++) themeEl('pixel', x - dir * (24 + k * 22), y + Math.sin(p.t * 0.6 + k) * 10, 12 - k * 1.5, k + p.t * 0.1, 0.9 - k * 0.15, '');      // 表情包弹（第 28 圈）：白边贴纸，表情每 8 步换一个，后面一串像素块
      emojiFace(x, y, 44, Math.floor(p.t / 8 + p.id) % 4, Math.sin(p.t * 0.5) * 0.3, 1); break; }
    case 'yarn': { const R = 46, roll = p.x / R, fl = FL - 4, hy = fl - y; if (IM['x:sg_cwave']) fxTex('sg_cwave', p.x - Math.sign(p.vx || 1) * 130, fl - 30, 280, 0, null, 0.9, true, 1.5, (p.vx || 0) < 0);      /* 第 48 圈：线团后面拖一道贴地紫焰 */      // 毛线球（第 21 圈）：贴地真的滚（转速跟着走的距离），线团一圈圈缠着，后面拖一根抖动的线头 + 地上一条散开的毛线
      g.save(); g.globalAlpha = 0.35 * Math.max(0.3, 1 - hy / 300); g.fillStyle = '#1A0B2E'; g.beginPath(); g.ellipse(x, fl, R * (1 - Math.min(0.4, hy / 500)), 10, 0, 0, 7); g.fill(); g.restore();      // 影子
      g.save(); g.strokeStyle = '#B15CF5'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - dir * R * 0.5, y + R * 0.8); for (let k = 1; k <= 8; k++) { const xx = x - dir * (R * 0.5 + k * 26), yy = Math.min(fl - 3, y + R * 0.8 + k * 6) + Math.sin(p.t * 0.5 + k * 1.3) * (k < 3 ? 8 : 3); g.lineTo(xx, yy); } g.stroke(); g.strokeStyle = 'rgba(240,194,255,0.8)'; g.lineWidth = 2; g.stroke(); g.restore();      // 线头一路拖在地上
      g.save(); g.translate(x, y); g.rotate(roll); g.fillStyle = rg(-R * 0.35, -R * 0.35, 4, R * 1.1, ['#E2B8FF', '#B15CF5', '#6A1FA8']); g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill(); g.stroke();
      g.save(); g.beginPath(); g.arc(0, 0, R - 2, 0, 7); g.clip(); g.lineWidth = 3.5; for (let i = 0; i < 9; i++) { const an = i * 0.7; g.strokeStyle = i % 3 === 0 ? 'rgba(255,230,255,0.85)' : 'rgba(90,20,150,0.55)'; g.beginPath(); g.ellipse(0, 0, R * 1.05, R * (0.2 + (i % 4) * 0.2), an, 0, 7); g.stroke(); }
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 4; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-R * 0.9, -R * 0.55 + i * 13); g.quadraticCurveTo(0, -R * 0.85 + i * 13, R * 0.9, -R * 0.4 + i * 13); g.stroke(); } g.restore();      // 一组横缠的亮线（滚起来能看出在转）
      g.fillStyle = '#FF7AD9'; g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.arc(R * 0.62, R * 0.55, 9, 0, 7); g.fill(); g.stroke(); g.restore();      // 线团上一颗粉色小毛球（跟着转，看得出滚）
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg(x - R * 0.35, y - R * 0.4, 0, R * 0.6, ['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']); g.beginPath(); g.arc(x - R * 0.35, y - R * 0.4, R * 0.6, 0, 7); g.fill(); g.restore();      // 固定方向的高光
      if (Math.abs(p.vx) > 300 && hy < 30) for (let k = 0; k < 4; k++) { const q = ((p.t * 0.9 + k * 3) % 10) / 10; g.save(); g.globalAlpha = 0.6 * (1 - q); g.fillStyle = '#D9C2F0'; g.beginPath(); g.arc(x - dir * (R * 0.6 + q * 60), fl - 6 - q * 26 * (0.5 + hash(k)), 6 + q * 10, 0, 7); g.fill(); g.restore(); }      // 滚起来带起的小灰团
      break; }
    case 'axe2': { const r0 = p.t * 0.5 * (p.boom || 1); for (let k = 0; k < 2; k++) axeArc(x, y, 92, r0 + k * Math.PI - 1.1, r0 + k * Math.PI, 18, 0.75, 1); if (p.t % 8 < 2) bigX(x + (hash(p.t) - 0.5) * 80, y + (hash(p.t + 1) - 0.5) * 60, 12, 0.8); }      // 回旋斧（第 24 圈）：两道跟着转的斧光弧 + 偶尔蹦出的小红叉
      if (META.spr.p_axe && IM['s:p_axe']) { g.save(); g.translate(x, y); g.rotate(p.t * 0.5 * (p.boom || 1)); spr('p_axe', 0, 0, 120, { ay: 0.5 }); g.restore(); break; }
    { g.save(); g.translate(x, y); g.rotate(p.t * 0.5 * (p.boom || 1)); g.lineCap = 'round'; g.scale(1.3, 1.3); g.strokeStyle = '#8A5A20'; g.lineWidth = 14; g.beginPath(); g.moveTo(-56, 0); g.lineTo(56, 0); g.stroke(); g.fillStyle = '#D9DEE8'; g.strokeStyle = '#3A2A10'; g.lineWidth = 6; for (const sgn of [-1, 1]) { g.beginPath(); g.ellipse(sgn * 48, 0, 26, 50, 0, sgn > 0 ? -Math.PI / 2 : Math.PI / 2, sgn > 0 ? Math.PI / 2 : Math.PI * 1.5); g.closePath(); g.fill(); g.stroke(); } g.restore(); break; }
    case 'zbook': { const sc = p.pow ? 1.9 : 1.3, flap = Math.sin(p.t * 0.7) * 0.5 + 0.5, rot = Math.sin(p.t * 0.25) * 0.35 + p.t * 0.12 * (p.boom || 1);      // Z 字飞书（第 27 圈）：书脊在中间、两片封面一开一合地扇，中间书页一张张翻；穿过批注后变大、带红光和冒出来的红勾
      if (p.pow) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg(x, y, 10, 130, ['rgba(255,120,120,0.8)', 'rgba(208,32,46,0)']); g.beginPath(); g.arc(x, y, 130, 0, 7); g.fill(); g.restore(); for (let i = 0; i < 3; i++) { const q = ((p.t * 0.07 + i / 3) % 1); themeEl('check', x + (hash(i + p.id) - 0.5) * 120, y - 40 - q * 90, 16, 0, 1 - q, '#FF3A3A'); } }
      for (let i = 1; i <= 3; i++) { g.save(); g.globalAlpha = 0.16 / i; g.fillStyle = '#C9D4EE'; g.fillRect(x - (Math.sign(p.vx) || 1) * i * 32 - 40 * sc, y - 30 * sc, 80 * sc, 60 * sc); g.restore(); }
      g.save(); g.translate(x, y); g.rotate(rot); g.scale(sc, sc); g.lineJoin = 'round';
      for (const sg of [-1, 1]) { g.save(); g.scale(sg, 1); g.transform(1, 0, 0, 1, 0, 0); const open = 0.25 + flap * 0.75; g.fillStyle = '#111827'; g.strokeStyle = '#C9D4EE'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -36); g.lineTo(48 * open, -36 - 10 * (1 - open)); g.lineTo(48 * open, 36 - 10 * (1 - open)); g.lineTo(0, 36); g.closePath(); g.fill(); g.stroke(); g.restore(); }
      g.fillStyle = '#FFFDF4'; g.strokeStyle = '#8A7A5A'; g.lineWidth = 2; for (let k = 0; k < 3; k++) { const fl = ((p.t * 0.12 + k / 3) % 1) * 2 - 1, w = 42 * (0.25 + flap * 0.7) * fl; g.beginPath(); g.moveTo(0, -32); g.quadraticCurveTo(w * 0.6, -36, w, -32); g.lineTo(w, 32); g.quadraticCurveTo(w * 0.6, 28, 0, 32); g.closePath(); g.fill(); g.stroke(); }
      txt('Z', 24 * (0.25 + flap * 0.75), 14, { size: 34, w: 900, fam: F.en, fill: '#C9D4EE', align: 'center' }); g.restore(); break; }
    case 'paper': { g.save(); g.translate(x, y); g.rotate(Math.sin(p.t * 0.08) * 0.08); g.fillStyle = '#FFFDF4'; g.strokeStyle = '#8A7A5A'; g.lineWidth = 6; g.beginPath(); g.rect(-p.w / 2, -p.h / 2, p.w, p.h); g.fill(); g.stroke(); g.strokeStyle = 'rgba(122,46,12,0.5)'; g.lineWidth = 4; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(-p.w / 2 + 20, -p.h / 2 + 50 + i * 26); g.lineTo(p.w / 2 - 20 - (i % 3) * 30, -p.h / 2 + 50 + i * 26); g.stroke(); } txt('长回复', 0, -p.h / 2 + 34, { size: 30, w: 900, fill: '#7A2E0C', align: 'center' }); g.restore(); break; }
    case 'cloud': cloudShape(x, y, 1.1); txt('降智', x, y + 12, { size: 30, w: 900, fill: '#fff', stroke: '#4B5563', sw: 6, align: 'center' }); break;
    case 'coin': coin(x, y, 28, p.t * 0.5); break;
    case 'ring': { g.save(); g.strokeStyle = '#1677FF'; g.lineCap = 'round'; for (let i = 0; i < 3; i++) { const r = 30 + ((p.t * 6 + i * 26) % 80); g.globalAlpha = 1 - r / 110; g.lineWidth = 9; g.beginPath(); g.arc(x - dir * 40, y, r, -0.9, 0.9); if (dir < 0) { g.beginPath(); g.arc(x - dir * 40, y, r, Math.PI - 0.9, Math.PI + 0.9); } g.stroke(); } g.restore(); txt('喂？', x, y - 70, { size: 34, w: 900, fill: '#fff', stroke: '#1677FF', sw: 7, align: 'center' }); break; }
    case 'basin': spr('p_basin2', x, y + 60, 120, { rot: p.t * 0.4 }); break;
    case 'code': { g.save(); g.translate(x, y); rr(-66, -30, 132, 60, 14); g.fillStyle = '#0E1430'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#6FA8FF'; g.stroke(); txt('run()', 0, 12, { size: 34, w: 800, fam: F.en, fill: '#7CF0B4', align: 'center' }); g.restore(); break; }
    case 'wave': { g.save(); g.translate(x - dir * 90, FL + 8); g.scale(dir, 1); const bob = Math.sin(p.t * 0.45) * 8;      // 一道卷起来的浪：背后是斜坡，浪尖往前勾
      const body = dy => { g.beginPath(); g.moveTo(-540, 0); g.bezierCurveTo(-400, -20, -310, -270, -190, -440 + dy); g.bezierCurveTo(-110, -550 + dy, 60, -610 + dy, 190, -566 + dy); g.bezierCurveTo(284, -534 + dy, 334, -452 + dy, 322, -372 + dy); g.bezierCurveTo(304, -420 + dy, 244, -474 + dy, 170, -470 + dy); g.bezierCurveTo(56, -466 + dy, -24, -380, -12, -250); g.bezierCurveTo(-2, -140, 60, -50, 160, 0); g.closePath(); };
      g.lineJoin = 'round'; body(bob); g.lineWidth = 24; g.strokeStyle = '#fff'; g.stroke(); g.fillStyle = lg(-200, -600, 60, 0, ['#BFE6FF', '#5F86FF', '#2B43D6', '#16237A']); g.fill();
      g.save(); body(bob); g.clip(); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 9; g.lineCap = 'round';
      for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-470 + i * 86, -14); g.bezierCurveTo(-330 + i * 70, -110 - i * 30, -250 + i * 60, -330 - i * 20, -80 + i * 44, -520 + i * 26 + bob); g.stroke(); }
      g.fillStyle = 'rgba(190,230,255,0.55)'; g.beginPath(); g.moveTo(170, -470 + bob); g.bezierCurveTo(56, -466 + bob, -24, -380, -12, -250); g.bezierCurveTo(-2, -140, 60, -50, 160, 0); g.lineTo(40, 0); g.bezierCurveTo(-60, -90, -110, -300, 20, -440 + bob); g.closePath(); g.fill(); g.restore();
      g.save(); g.translate(-250, -150); g.scale(dir, 1); txt('TOKEN', 0, 0, { size: 84, w: 900, fam: F.en, fill: 'rgba(255,255,255,0.92)', align: 'center', rot: -0.62 * dir }); g.restore();
      g.fillStyle = '#fff'; [[322, -372, 30], [336, -420, 22], [312, -470, 28], [270, -520, 30], [210, -560, 28], [140, -590, 24], [60, -600, 22], [296, -330, 16], [330, -300, 11], [268, -396, 18], [222, -440, 16], [356, -350, 9]].forEach(([fx, fy, r], i) => { g.beginPath(); g.arc(fx + Math.sin(p.t * 0.5 + i) * 5, fy + bob + Math.cos(p.t * 0.4 + i) * 5, r, 0, 7); g.fill(); });
      for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(170 + i * 26 + Math.sin(p.t * 0.7 + i * 2) * 10, -8 - Math.abs(Math.sin(p.t * 0.4 + i)) * 28, 18 - i, 0, 7); g.fill(); }
      for (let i = 0; i < 7; i++) coin(-420 + i * 104 + Math.sin(p.t * 0.3 + i) * 14, -560 - ((p.t * 11 + i * 83) % 170) + Math.abs(i - 4.6) * 78, 28, p.t * 0.3 + i);
      g.restore(); break; }
    case 'bigscroll': { g.save(); g.translate(x, y); g.fillStyle = '#FFFDF4'; g.strokeStyle = '#8A7A5A'; g.lineWidth = 8; g.lineJoin = 'round'; g.beginPath(); g.rect(-p.w / 2 + 20, -p.h / 2, p.w - 40, p.h); g.fill(); g.stroke(); g.strokeStyle = 'rgba(90,100,150,0.5)'; g.lineWidth = 5; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(-p.w / 2 + 50, -p.h / 2 + 40 + i * 36); g.lineTo(p.w / 2 - 50 - (i % 3) * 40, -p.h / 2 + 40 + i * 36); g.stroke(); } g.strokeStyle = '#8A7A5A'; g.lineWidth = 8; g.fillStyle = '#F3E9CF'; rr(-p.w / 2, -p.h / 2 - 26, p.w, 52, 26); g.fill(); g.stroke(); rr(-p.w / 2, p.h / 2 - 26, p.w, 52, 26); g.fill(); g.stroke(); txt('200 万字', 0, 20, { size: 64, w: 900, fill: '#5B6CB8', align: 'center' }); g.restore(); break; }
    case 'box': { g.save(); g.translate(x, y); g.rotate(p.landed ? 0 : p.t * 0.12 + p.id); g.fillStyle = '#D9A066'; g.strokeStyle = '#7A4A1E'; g.lineWidth = 6; g.lineJoin = 'round'; g.beginPath(); g.rect(-p.w / 2, -p.h / 2, p.w, p.h); g.fill(); g.stroke(); g.fillStyle = '#F3D9A8'; g.fillRect(-14, -p.h / 2, 28, p.h); g.fillRect(-p.w / 2, -12, p.w, 24); txt('已下单', 0, 44, { size: 26, w: 900, fill: '#7A4A1E', align: 'center' }); g.restore(); break; }
    case 'sign': { g.save(); g.translate(x, y); g.fillStyle = '#B86A12'; g.fillRect(-14, -p.h / 2 - 500, 28, 520); g.fillStyle = '#FF8A1F'; g.strokeStyle = '#fff'; g.lineWidth = 12; g.lineJoin = 'round'; rr(-p.w / 2, -p.h / 2, p.w, p.h, 26); g.fill(); g.stroke(); txt('招人', 0, 56, { size: 170, w: 900, fill: '#fff', align: 'center', ls: 12 }); g.restore(); break; }
    case 'fix': { g.save(); g.translate(x, y); g.scale(dir, 1); g.fillStyle = lg(-420, 0, 160, 0, ['rgba(255,180,92,0)', 'rgba(255,180,92,0.85)', '#FFF3D6']); g.beginPath(); g.moveTo(-420, -150); g.lineTo(100, -170); g.quadraticCurveTo(200, 0, 100, 170); g.lineTo(-420, 150); g.closePath(); g.fill(); g.restore();
      ['{', 'fix', '}', ';'].forEach((c, i) => txt(c, x - dir * (i * 90 - 40), y + 30 + Math.sin(p.t * 0.6 + i) * 30, { size: 90, w: 900, fam: F.en, fill: '#7A2E0C', stroke: '#fff', sw: 8, align: 'center' })); break; }
  }
}
function drawEntity(s, e, FL) {
  if (e.kind === 'banana') { g.save(); g.translate(e.x, FL - 8); g.fillStyle = '#F5D547'; g.strokeStyle = '#7A5A10'; g.lineWidth = 4; for (let i = -1; i <= 1; i++) { g.save(); g.rotate(i * 0.9); g.beginPath(); g.ellipse(0, -18, 12, 30, 0, 0, 7); g.fill(); g.stroke(); g.restore(); } g.fillStyle = '#5A3A10'; g.beginPath(); g.arc(0, -4, 7, 0, 7); g.fill(); g.restore(); return; }
  if (e.kind === 'tea2') { const bob = Math.sin(e.t * 0.12) * 6; g.save(); g.translate(e.x, FL - 50 + bob); g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = INK; g.fillStyle = '#F6E3C8'; g.beginPath(); g.moveTo(-30, -36); g.lineTo(30, -36); g.lineTo(22, 44); g.lineTo(-22, 44); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#C9925A'; g.fillRect(-24, -4, 48, 44); g.fillStyle = '#fff'; g.fillRect(-34, -46, 68, 12); g.strokeRect(-34, -46, 68, 12); g.restore(); glow(e.x, FL - 50, 90, '#FFE9C9', 0.4); txt('请你喝', e.x, FL - 130 + bob, { size: 24, w: 900, fill: '#fff', stroke: '#7A4A1E', sw: 6, align: 'center' }); return; }
  if (e.kind === 'turret') { const k = clamp(e.t / 10), fl = [50, 110, 170].some(t => e.t >= t && e.t < t + 6); g.save(); g.translate(e.x, FL); g.scale(k, k); g.fillStyle = '#C9D4EE'; g.strokeStyle = '#0E1430'; g.lineWidth = 6; g.lineJoin = 'round'; rr(-70, -18, 140, 18, 6); g.fill(); g.stroke(); rr(-62, -116, 124, 100, 10); g.fillStyle = fl ? '#7CF0B4' : '#0E1430'; g.fill(); g.stroke();
    txt('script.py', 0, -78, { size: 22, w: 800, fam: F.en, fill: fl ? '#0E1430' : '#7CF0B4', align: 'center' }); txt(e.t % 30 < 15 ? '> _' : '>', -44, -40, { size: 26, w: 800, fam: F.en, fill: fl ? '#0E1430' : '#fff' }); g.restore(); }
}
function drawFx(s, FL) {
  for (const q of s.fx) { const k = q.t / q.life; if (k >= 1) continue; const x = q.x, y = FL - q.y;
    if (q.k === 'spark' && q.who != null && (q.mvid || q.src === 'proj')) spBurst(s, q, x, y, k);      // 必杀命中：大一号的冲击环 + 角色主题碎片
    if (q.k === 'spark' && q.t < 14 && (q.lvl >= 2 || q.tier)) texBurst(q, x, y, k);      // 第 33 圈：贴图星爆 / 刀光（GPT 出的手绘特效）
    if (q.k === 'spark' && q.tier) tierBurst(q, x, y, k);      // 第 30 圈：COUNTER（金）/ PUNISH COUNTER（红）命中特效多一层
    if (q.k === 'spark' && typeof FX2 !== 'undefined') FX2.spark(s, q, x, y, k);      // 第 68 圈：锐利光刃线 + 细冲击圈 + 闪点（js/fx2.js）
    if (q.k === 'ctrtxt') continue;      // 第 34 圈：横幅改到屏幕固定位置（打的一方那一侧），不压在两人中间
    if (q.k === 'wallhit') { wallHitFx(q, x, y, k, FL); continue; }
    if (q.k === 'gbounce') { gBounceFx(q, x, FL, k); continue; }
    if (q.k === 'spark' && q.kind && q.kind !== 'sup') { if (q._m === undefined) q._m = sparkMat(s, q); if (q._m) drawMatSpark(q, x, y, k, FL); else drawSpark(q, x, y, k); if (q.lvl >= 2 && q.y < 330) drawCrack(q, x, FL, k); }
    else if (q.k === 'spark') { const L = q.lvl, R0 = L === 3 ? 200 : L === 2 ? 150 : 92, r = R0 * E.out3(k), d = q.dir || 1;      // 命中火花：星爆 + 冲击环 + 顺着打击方向飞出去的碎片
      if (q.t < 4 && L >= 2) { star4(x, y, R0 * (1.55 - q.t * 0.2), 0.2 * d, '#FFFFFF', 0.85 - q.t * 0.2); star4(x, y, R0 * 1.0, 0.2 * d + 0.785, q.col || '#FFE066', 0.7 - q.t * 0.17); }
      burst(x, y, r, L === 1 ? 6 : 9, q.t * 0.2, '#fff', 1 - k); burst(x, y, r * 0.72, L === 1 ? 6 : 9, q.t * 0.2 + 0.4, q.col || '#FFE066', (1 - k) * 0.9);
      g.save(); g.strokeStyle = rgba('#FFFFFF', 1 - k); g.lineWidth = (L === 1 ? 6 : 11) * (1 - k) + 1; g.beginPath(); g.ellipse(x, y, r * (L === 1 ? 0.9 : 1.3), r * (L === 1 ? 0.9 : 1.3) * 0.82, 0, 0, 7); g.stroke();
      g.lineCap = 'round'; const n = L === 1 ? 5 : 8; for (let i = 0; i < n; i++) { const R = hash(q.x * 0.37 + i * 7.3 + q.life), an = (d > 0 ? 0 : Math.PI) + (R - 0.5) * (L === 1 ? 1.5 : 2.2) - 0.25, r0 = R0 * (0.5 + 1.5 * E.out3(k)) * (0.7 + R * 0.6), len = R0 * 0.55 * (1 - k); g.strokeStyle = i % 2 ? rgba(q.col || '#FFE066', 1 - k) : rgba('#FFFFFF', 1 - k); g.lineWidth = (L === 1 ? 5 : 8) * (1 - k) + 1; g.beginPath(); g.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0); g.lineTo(x + Math.cos(an) * (r0 + len), y + Math.sin(an) * (r0 + len)); g.stroke(); }
      g.restore(); }
    else if (q.k === 'num') txt(q.s, x, y - k * 70, { size: q.lvl === 3 ? 70 : q.lvl === 2 ? 56 : 42, w: 900, fam: F.en, fill: q.lvl === 3 ? '#FFE066' : '#fff', stroke: q.lvl === 3 ? '#B81F3A' : INK, sw: 9, align: 'center', a: 1 - k * k, sc: 1 + Math.sin(Math.min(1, k * 4) * Math.PI) * 0.3 });
    else if (q.k === 'dust' && q.big && q.t < 22 && IM['x:smoke1']) { for (const sd of [-1, 1]) { const kk = E.out3(k); fxTex('smoke1', x + sd * (110 + 190 * kk), FL - 14 - 22 * kk, 90 + 150 * kk, sd * 0.5, STAGES[s.stage].dust || '#D8DCEA', 0.6 * (1 - k)); } }      // 第 42 圈：倒地烟只从身体两侧沿地面贴着散开，中间那团去掉（GPT 复审：烟把触地那一下盖住了）
    if (q.k === 'dust') { const n = q.big ? 11 : 7, col = STAGES[s.stage].dust || '#fff', R0 = q.small ? 34 : q.big ? 170 : 95; g.save();      // 尘土：贴地往两边喷，一团团往上鼓，颜色跟场地走
      for (let i = 0; i < n; i++) { const R = hash(q.x * 0.13 + i * 3.7 + q.life), side = i % 2 ? 1 : -1, an = side > 0 ? -0.18 - R * 0.5 : Math.PI + 0.18 + R * 0.5, d = (q.big ? 80 : 0) + R0 * (0.35 + 0.75 * R) * E.out3(k), rad = (q.small ? 9 : q.big ? 34 : 22) * (0.6 + 0.6 * R) * (1 + k * 0.8);
        g.globalAlpha = (1 - k) * (1 - k) * (q.small ? 0.55 : q.big ? 0.6 : 0.8); g.fillStyle = col; g.beginPath(); g.arc(x + Math.cos(an) * d, y - 4 - k * (q.big ? 26 : 34) * (0.5 + R) + Math.sin(an) * d * 0.25, rad, 0, 7); g.fill(); g.globalAlpha *= 0.5; g.fillStyle = '#fff'; g.beginPath(); g.arc(x + Math.cos(an) * d - rad * 0.25, y - 6 - k * (q.big ? 26 : 34) * (0.5 + R) + Math.sin(an) * d * 0.25 - rad * 0.25, rad * 0.55, 0, 7); g.fill(); }
      if (q.t < 6 && !q.small) { g.globalAlpha = (1 - q.t / 6) * 0.5; g.strokeStyle = col; g.lineWidth = 6; g.beginPath(); g.ellipse(x, y, R0 * 0.9 * E.out3(k * 3), R0 * 0.16 * E.out3(k * 3), 0, 0, 7); g.stroke(); }
      g.restore(); }
    else if (q.k === 'drush') { const d = q.dir || 1; g.save(); g.globalAlpha = 1 - k; g.fillStyle = lg(x - d * 400, 0, x, 0, ['rgba(61,220,132,0)', 'rgba(61,220,132,0.75)']); g.fillRect(Math.min(x, x - d * 420), y - 10, 420, 14); g.restore(); }
    else if (q.k === 'say') { const f = s.F[q.who], [sx0] = [f ? f.x : x]; if (f && f.id === 'ds') sayHand(sx0, y - 10, q.s, Math.min(1, (1 - k) * 4), q.life); else say(sx0, y - 30, q.s, f ? f.ch.col : INK, Math.min(1, (1 - k) * 4)); }      // 大肥鱼的台词用梗图式手绘对话框
    else if (q.k === 'smoke') { g.save(); g.globalAlpha = (1 - k) * 0.5; g.fillStyle = '#8A8F9C'; g.beginPath(); g.arc(x + Math.sin(q.t * 0.2) * 10, y - k * 120, 16 + k * 26, 0, 7); g.fill(); g.restore(); }
    else if (q.k === 'ink') { const d = q.dir || 1, cols = [q.col || '#FF5A6E', '#3DDC84', '#FFE066', '#6FA8FF']; g.save(); for (let i = 0; i < 12; i++) { const R = hash(q.x * 0.1 + i * 3.3), an = (R - 0.5) * 2.4 + (d > 0 ? 0 : Math.PI), dd = (60 + 260 * R) * E.out3(Math.min(1, k * 2)); g.globalAlpha = (1 - k) * 0.85; g.fillStyle = cols[i % 4]; g.beginPath(); g.ellipse(x + Math.cos(an) * dd, y + Math.sin(an) * dd * 0.7, 26 * (1 - k * 0.5) * (0.5 + R), 14 * (0.5 + R), an, 0, 7); g.fill(); } g.restore(); }      // 算力冲击：彩色墨点泼出去
    else if (q.k === 'guard') { const d = q.dir || 1, R = 46 + 26 * E.out3(k); g.save(); g.translate(x, y); g.scale(-d, 1);      // 防御：蓝白色盾形火花，比命中火花小得多
      g.globalAlpha = 1 - k; g.fillStyle = q.green ? 'rgba(61,220,132,0.4)' : 'rgba(160,220,255,0.35)'; g.strokeStyle = q.green ? '#C8FFE0' : '#E8F6FF'; g.lineWidth = 6 * (1 - k) + 2; g.beginPath(); g.moveTo(0, -R); g.quadraticCurveTo(R * 0.75, -R * 0.8, R * 0.7, 0); g.quadraticCurveTo(R * 0.6, R * 0.8, 0, R * 1.1); g.quadraticCurveTo(-R * 0.25, R * 0.4, -R * 0.1, 0); g.quadraticCurveTo(-R * 0.25, -R * 0.5, 0, -R); g.fill(); g.stroke();
      g.strokeStyle = '#A0DCFF'; g.lineCap = 'round'; g.lineWidth = 4; for (let i = 0; i < 5; i++) { const an = -0.9 + i * 0.45, r0 = R * 0.9 + 50 * E.out3(k); g.beginPath(); g.moveTo(Math.cos(an) * r0, Math.sin(an) * r0); g.lineTo(Math.cos(an) * (r0 + 22 * (1 - k)), Math.sin(an) * (r0 + 22 * (1 - k))); g.stroke(); } g.restore();
      txt('防住了', x, y - 70 - k * 24, { size: 26, w: 900, fill: '#DFF4FF', stroke: INK, sw: 6, align: 'center', a: 1 - k }); }
    else if (q.k === 'ring' && q.col === '#3DDC84' && IM['x:ink3']) fxTex('ink3', x, y, 140 + 300 * E.out3(k), k * 2 + (q.x % 3), INKC, (1 - k) * 0.6, false);      // 第 40 圈：Drive 的绿圈换成墨点（不要规整的细环）
    else if (q.k === 'ring') { g.save(); g.strokeStyle = rgba(q.col || '#fff', 1 - k); g.lineWidth = 14 * (1 - k) + 2; g.beginPath(); g.arc(x, y, 40 + 300 * E.out3(k), 0, 7); g.stroke(); g.restore(); }
    else if (q.k === 'text') txt(q.s, x, y - k * 50, { size: 54, w: 900, fill: '#fff', stroke: q.col || INK, sw: 10, align: 'center', a: Math.min(1, (1 - k) * 3), sc: 1 + Math.sin(Math.min(1, k * 5) * Math.PI) * 0.25 });
    else if (q.k === 'star') { star4(x, y, 90 * Math.sin(k * Math.PI), q.t * 0.3, '#FFF3B0'); star4(x, y, 50 * Math.sin(k * Math.PI), -q.t * 0.3, '#7FE3FF'); }
    else if (q.k === 'ppop' && !EOFF) { const R = Math.max(80, (q.w || 80) * 1.0), e = E.out3(k);      // 第 67 圈：命中爆裂（加色闪光 + 双冲击环 + 放射碎片 + 带重力的火星）
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg(x, y, 0, R * (0.8 + 1.6 * e), ['rgba(255,255,255,' + (1 - k) + ')', rgba(q.col, 0.75 * (1 - k)), rgba(q.col, 0)]); g.fillRect(x - R * 3, y - R * 3, R * 6, R * 6);
      for (let r = 0; r < 2; r++) { const kk = clamp(k * 1.3 - r * 0.25); if (kk <= 0 || kk >= 1) continue; g.strokeStyle = rgba(r ? '#FFFFFF' : q.col, 1 - kk); g.lineWidth = 14 * (1 - kk) + 2; g.beginPath(); g.ellipse(x, y, R * (0.3 + 1.7 * E.out3(kk)), R * (0.3 + 1.7 * E.out3(kk)) * 0.7, 0, 0, 7); g.stroke(); }
      for (let i = 0; i < 12; i++) { const an = i / 12 * 6.283 + hash(q.x + i) * 0.4, L0 = R * (0.2 + 1.2 * e), L1 = L0 + R * (0.8 + hash(i + q.y) * 0.9) * (1 - k); g.strokeStyle = rgba(i % 2 ? '#FFFFFF' : q.col, 1 - k); g.lineWidth = 5 * (1 - k) + 1; g.beginPath(); g.moveTo(x + Math.cos(an) * L0, y + Math.sin(an) * L0); g.lineTo(x + Math.cos(an) * L1, y + Math.sin(an) * L1); g.stroke(); }
      for (let i = 0; i < 16; i++) { const an = hash(i * 1.7 + q.x) * 6.283, v = R * (1 + 2 * hash(i + 9)), px = x + Math.cos(an) * v * e, py = y + Math.sin(an) * v * e + k * k * 160; g.fillStyle = rgba(i % 3 ? q.col : '#FFFFFF', 1 - k); g.beginPath(); g.arc(px, py, 6 * (1 - k) + 1.5, 0, 7); g.fill(); }
      if (q.t < 6) star4(x, y, R * 1.8 * (1 - q.t / 6), 0.3, '#FFFFFF', 1); g.restore(); }
    else if (q.k === 'ppop') { const R = Math.max(60, (q.w || 80) * 0.8), e = E.out3(k); g.save(); g.globalAlpha = 1 - k; g.strokeStyle = q.col; g.lineWidth = 10 * (1 - k) + 2; g.beginPath(); g.arc(x, y, R * (0.4 + e), 0, 7); g.stroke(); if (q.t < 5) star4(x, y, R * (1.3 - q.t * 0.2), 0.3, '#FFFFFF', 0.9); for (let i = 0; i < 10; i++) { const an = i / 10 * 7 + hash(q.x + i), d = R * (0.3 + 1.4 * e); g.fillStyle = i % 2 ? '#FFFFFF' : q.col; g.beginPath(); g.arc(x + Math.cos(an) * d, y + Math.sin(an) * d + k * k * 40, 7 * (1 - k) + 1, 0, 7); g.fill(); } g.restore(); }      // 飞行道具命中爆开
    else if (q.k === 'pfade') { const R = Math.max(40, (q.w || 80) * 0.5); g.save(); g.globalAlpha = (1 - k) * 0.6; for (let i = 0; i < 5; i++) { const an = i / 5 * 7, d = R * k; g.fillStyle = i % 2 ? 'rgba(255,255,255,0.8)' : rgba(q.col, 0.7); g.beginPath(); g.arc(x + Math.cos(an) * d, y + Math.sin(an) * d - k * 30, R * 0.35 * (1 - k * 0.5), 0, 7); g.fill(); } g.restore(); }      // 飞到头自然消散：散成几团淡烟
    else if (q.k === 'pclash' && !EOFF && q.t < 22) { const e = E.out3(k); g.save(); g.globalCompositeOperation = 'lighter';      // 第 67 圈：相杀抵消（两色对撞：双色冲击环 + 交叉放射 + 两色火星往两边喷）
      for (let r = 0; r < 2; r++) { const kk = clamp(k * 1.2 - r * 0.2); g.strokeStyle = rgba(r ? (q.col2 || q.col) : q.col, 1 - kk); g.lineWidth = 16 * (1 - kk) + 2; g.beginPath(); g.ellipse(x, y, 40 + 300 * E.out3(kk), (40 + 300 * E.out3(kk)) * 0.6, 0, 0, 7); g.stroke(); }
      for (let i = 0; i < 20; i++) { const side = i % 2 ? 1 : -1, an = (hash(i + q.x) - 0.5) * 1.6 + (side > 0 ? 0 : Math.PI), v = 200 + 260 * hash(i * 3 + q.y); g.fillStyle = rgba(side > 0 ? q.col : (q.col2 || q.col), 1 - k); g.beginPath(); g.arc(x + Math.cos(an) * v * e, y + Math.sin(an) * v * e + k * k * 120, 7 * (1 - k) + 2, 0, 7); g.fill(); }
      g.restore(); }
    else if (q.k === 'pclash') { const e = E.out3(k); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg(x, y, 0, 220 * e + 30, ['rgba(255,255,255,' + (1 - k) + ')', rgba(q.col, 0.6 * (1 - k)), 'rgba(0,0,0,0)']); g.fillRect(x - 260, y - 260, 520, 520); g.restore();      // 对消：两色交叉星芒 + 冲击环 + 碎片
      if (q.t < 8) { star4(x, y, 200 * (1 - q.t / 8), 0, '#FFFFFF', 1 - q.t / 8); star4(x, y, 150 * (1 - q.t / 8), 0.785, q.col2 || q.col, 1 - q.t / 8); }
      g.save(); g.globalAlpha = 1 - k; g.strokeStyle = q.col2 || '#fff'; g.lineWidth = 12 * (1 - k) + 2; g.beginPath(); g.ellipse(x, y, 60 + 200 * e, 40 + 120 * e, 0, 0, 7); g.stroke(); for (let i = 0; i < 12; i++) { const an = i / 12 * 7 + 0.3, d = 40 + 260 * e; g.fillStyle = i % 2 ? q.col : (q.col2 || '#fff'); g.fillRect(x + Math.cos(an) * d - 5, y + Math.sin(an) * d - 5 + k * k * 60, 10, 10); } g.restore(); txt('抵消！', x, y - 120, { size: 40, w: 900, fill: '#FFE066', stroke: INK, sw: 8, align: 'center', a: 1 - k }); }
    else if (q.k === 'splash') { g.save(); g.fillStyle = rgba(q.col, (1 - k) * 0.9); for (let i = 0; i < 9; i++) { const an = Math.PI + i / 8 * Math.PI, r = 150 * E.out3(k); g.beginPath(); g.arc(x + Math.cos(an) * r, y + Math.sin(an) * r * 0.8 + k * k * 120, 20 * (1 - k * 0.6), 0, 7); g.fill(); } g.restore(); }
  }
}
// —— 血条界面 ——
function exprOf(s, f) { const op = s.F[1 - f.idx], r = f.hp / f.hpMax; if (f.st === 'win') return 'smug'; if (f.hp <= 0 || f.st === 'lose' || ['hit', 'launch', 'down', 'freeze', 'stun'].includes(f.st) || r < 0.25) return 'cry'; if (f.st === 'su' || r - op.hp / op.hpMax > 0.3) return 'smug'; return 'base'; }
function portrait(s, f, x, y, size, mirror) {
  const [ex, ey] = EYE[f.id], ch = f.ch; g.save(); g.translate(x, y); g.fillStyle = INK; rr(-size / 2 - 7, -size / 2 - 7, size + 14, size + 14, 26); g.fill(); g.save(); rr(-size / 2, -size / 2, size, size, 20); g.clip(); g.fillStyle = lg(0, -size / 2, 0, size / 2, [ch.col2, ch.col]); g.fillRect(-size / 2, -size / 2, size, size);
  bust(f.id + '_' + exprOf(s, f), ex, ey + 20, 0, 0, size / 520, { flip: mirror }); if (f.flash > 0) { g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(-size / 2, -size / 2, size, size); } g.restore();
  g.lineWidth = 5; g.strokeStyle = '#fff'; rr(-size / 2, -size / 2, size, size, 20); g.stroke(); g.restore();
}
function drawHUD(s, o = {}) {
  const [a, b] = s.F; g.save(); g.fillStyle = lg(0, 0, 0, 230, ['rgba(4,8,30,0.72)', 'rgba(4,8,30,0)']); g.fillRect(0, 0, W, 230); g.fillStyle = lg(0, 940, 0, 1080, ['rgba(4,8,30,0)', 'rgba(4,8,30,0.6)']); g.fillRect(0, 940, W, 140); g.restore();
  for (const f of s.F) {
    const L = f.idx === 0, d = L ? 1 : -1, X = v => L ? v : W - v, bw = 640, bx = 216, by = 58, bh = 40, r = clamp(f.hp / f.hpMax), tr = clamp(f.trail / f.hpMax);
    const HA = hudFade(s, f.idx); g.save(); g.globalAlpha = HA;      // 第 76 圈：头碰到 HUD 时这一侧上方 HUD 半透明
    portrait(s, f, X(110), 112, 164, !L);
    // 血条（向中间掉）
    const bar = (frac, fill) => { if (frac <= 0) return; g.save(); g.beginPath(); const x0 = X(bx + bw), x1 = X(bx + bw - bw * frac); g.moveTo(x0 + d * 0, by); g.lineTo(x1 - d * 14, by); g.lineTo(x1 + d * 0, by + bh); g.lineTo(x0 + d * 14, by + bh); g.closePath(); g.fillStyle = fill; g.fill(); g.restore(); };
    g.save(); g.beginPath(); g.moveTo(X(bx - 20), by - 7); g.lineTo(X(bx + bw + 6), by - 7); g.lineTo(X(bx + bw + 22), by + bh + 7); g.lineTo(X(bx - 6), by + bh + 7); g.closePath(); g.fillStyle = INK; g.fill(); g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke(); g.restore();
    bar(1, 'rgba(255,255,255,0.14)'); bar(tr, s.f - (f.lastDmgF ?? -99) < 20 ? '#FFFFFF' : '#FF5A6E');      /* 第 44 圈：刚挨打的那段先白后红（街霸 6 的延迟扣血） */ bar(r, r > 0.5 ? lg(0, by, 0, by + bh, ['#B8FFD0', '#2ED573']) : r > 0.25 ? lg(0, by, 0, by + bh, ['#FFF3A8', '#FFB020']) : lg(0, by, 0, by + bh, ['#FFB3BD', '#FF3B52']));
    txt(f.ch.name, X(bx), by + bh + 52, { size: 44, w: 900, fill: '#fff', stroke: f.ch.ink, sw: 9, align: L ? 'left' : 'right' });
    const nw = mw(f.ch.name, 44, 900); txt(f.ch.en === f.ch.name ? f.ch.style : f.ch.en + ' · ' + f.ch.style, X(bx + nw + 18), by + bh + 50, { size: 24, w: 700, fill: 'rgba(230,240,255,0.92)', align: L ? 'left' : 'right', sh: ['rgba(0,0,30,0.9)', 6, 0, 1] });
    for (let i = 0; i < 2; i++) { g.save(); g.translate(X(bx + bw - 30 - i * 44), by + bh + 36); g.rotate(Math.PI / 4); g.fillStyle = i < s.wins[f.idx] ? '#FFE066' : 'rgba(255,255,255,0.18)'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.fillRect(-12, -12, 24, 24); g.strokeRect(-12, -12, 24, 24); g.restore(); }
    g.restore();
    // TOKEN 槽
    const mx = 70, my = 1004, mwid = 440, mh = 26, mr = clamp(f.meter / 100), full = f.meter >= 100, pulse = full ? 0.6 + 0.4 * Math.sin(s.f * 0.4) : 0;
    g.save(); rr(L ? mx : W - mx - mwid, my, mwid, mh, 13); g.fillStyle = INK; g.fill(); g.lineWidth = 3; g.strokeStyle = full ? mixc('#FFFFFF', '#FFE066', pulse) : 'rgba(255,255,255,0.8)'; g.stroke(); if (mr > 0) { g.save(); rr(L ? mx : W - mx - mwid, my, mwid, mh, 13); g.clip(); g.fillStyle = full ? lg(0, my, 0, my + mh, ['#FFF3A8', '#FFB020']) : lg(0, my, 0, my + mh, ['#BFE3FF', '#4D6BFE']); g.fillRect(L ? mx : W - mx - mwid * mr, my, mwid * mr, mh); g.restore(); } g.restore();
    for (let i = 1; i < 3; i++) { const sx = L ? mx + mwid * i / 3 : W - mx - mwid * i / 3; g.save(); g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx, my + 2); g.lineTo(sx, my + mh - 2); g.stroke(); g.restore(); }      // TOKEN 分 3 格
    { const dv = f.drive === undefined ? 6 : f.drive, dy0 = my - 58, segW = (mwid - 5 * 6) / 6; txt(f.burn ? '服务器繁忙' : '算力', X(mx + mwid + 14), dy0 + 15, { size: 22, w: 900, fill: f.burn ? '#9AA0AE' : '#7CF0B4', align: L ? 'left' : 'right', sh: ['rgba(0,0,30,0.9)', 6, 0, 1] });      // 算力槽：6 格绿色
      for (let i = 0; i < 6; i++) { const x0 = L ? mx + i * (segW + 6) : W - mx - (i + 1) * segW - i * 6, fr = clamp(dv - i); g.save(); rr(x0, dy0, segW, 16, 5); g.fillStyle = 'rgba(8,14,48,0.85)'; g.fill(); if (fr > 0) { g.save(); rr(x0, dy0, segW, 16, 5); g.clip(); g.fillStyle = f.burn ? '#6B7280' : fr >= 1 ? '#3DDC84' : '#1F8F55'; g.fillRect(L ? x0 : x0 + segW * (1 - fr), dy0, segW * fr, 16); g.restore(); } g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.6)'; g.stroke(); g.restore(); } }
    if (f.id === 'ds' && s.ctrl[f.idx] === 'human') { const rv = f.rice || 0; txt('饭量', X(mx), my - 82, { size: 22, w: 900, fill: '#9EC5FF', align: L ? 'left' : 'right', sh: ['rgba(0,0,30,0.9)', 6, 0, 1] }); for (let i = 0; i < 4; i++) { g.save(); g.globalAlpha = i < rv ? 1 : 0.35; bowl(X(mx + 76 + i * 44), my - 86, 0.3, { empty: i >= rv }); g.restore(); } if (rv >= 4) txt('吃饱了', X(mx + 260), my - 82, { size: 22, w: 900, fill: '#FFE066', align: L ? 'left' : 'right', sh: ['rgba(0,0,30,0.9)', 6, 0, 1] }); }      // 大肥鱼的饭量 0–4 级
    if (f.id === 'qwen' && s.ctrl[f.idx] === 'human') { const cv = f.coupon || 0; txt('满减券', X(mx), my - 82, { size: 22, w: 900, fill: '#FFC2A0', align: L ? 'left' : 'right', sh: ['rgba(0,0,30,0.9)', 6, 0, 1] }); for (let i = 0; i < 3; i++) { const cx = X(mx + 100 + i * 46), cy = my - 90; g.save(); g.globalAlpha = i < cv ? 1 : 0.3; g.fillStyle = i < cv ? '#E8743B' : '#3A3A55'; rr(cx - 19, cy - 12, 38, 24, 5); g.fill(); g.fillStyle = '#FFF4E8'; g.beginPath(); g.arc(cx - 19, cy, 5, 0, 7); g.arc(cx + 19, cy, 5, 0, 7); g.fill(); g.restore(); if (i < cv) txt('减', cx, cy + 7, { size: 16, w: 900, fill: '#fff', align: 'center' }); } }      // 千问的满减券 0–3 张
    txt('TOKEN', X(mx), my - 12, { size: 26, w: 800, fam: F.en, fill: full ? '#FFE066' : '#DFF4FF', align: L ? 'left' : 'right', ls: 3, sh: ['rgba(0,0,30,0.9)', 6, 0, 1] });
    txt(s.ctrl[f.idx] === 'human' ? (f.meter >= 33.3 ? 'Lv.' + Math.min(3, Math.floor((f.meter + 0.01) / (100 / 3))) + ' 就绪' : Math.floor(f.meter) + '%') : full ? 'MAX · 超必杀就绪' : Math.floor(f.meter) + '%', X(mx + 116), my - 12, { size: 24, w: 800, fill: full ? '#FFE066' : 'rgba(230,240,255,0.9)', align: L ? 'left' : 'right', sh: ['rgba(0,0,30,0.9)', 6, 0, 1] });
    // 招牌技冷却
    const cdr = f.cd > 0 ? f.cd / f.ch.sp.cd : 0, cx = X(mx + mwid + 60), cy = my + 6; g.save(); g.beginPath(); g.arc(cx, cy, 30, 0, 7); g.fillStyle = cdr > 0 ? 'rgba(12,22,80,0.9)' : f.ch.col; g.fill(); g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke(); if (cdr > 0) { g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 30, -Math.PI / 2, -Math.PI / 2 + (1 - cdr) * Math.PI * 2); g.closePath(); g.fillStyle = rgba(f.ch.col, 0.75); g.fill(); } g.restore(); txt('技', cx, cy + 12, { size: 32, w: 900, fill: '#fff', align: 'center' });
    txt(s.ctrl[f.idx] === 'human' ? mvName(f.ch, (typeof HMOV !== 'undefined' && HMOV[f.id] && HMOV[f.id]['236']) || f.ch.sp.id) : f.ch.sp.name, X(mx + mwid + 104), cy + 10, { size: 24, w: 800, fill: cdr > 0 ? 'rgba(230,240,255,0.55)' : '#fff', align: L ? 'left' : 'right', sh: ['rgba(0,0,30,0.9)', 6, 0, 1] });
    // 表情包弹出
    if (f.stkT > 0 && f.stk && s.phase !== 'over') { const k = pop((f.stkN - f.stkT) / 60, 0, 0.22) * (f.stkT < 10 ? f.stkT / 10 : 1); stk(f.stk, X(128), 318, 190, { sc: k, rot: d * -0.06 }); }
    // 连击
    if (f.comboShow && s.f - f.comboShow.f < 80 && f.comboShow.n >= 2) { const age = s.f - f.comboShow.f, k = 1 + Math.max(0, 1 - age / 8) * 0.5, al = age > 60 ? 1 - (age - 60) / 20 : 1; txt(String(f.comboShow.n), X(96), 520, { size: 130, w: 900, fam: F.en, fill: '#FFE066', stroke: '#B81F3A', sw: 12, stroke2: INK, sw2: 26, align: 'center', sc: k, a: al, skew: -0.15 }); txt('连击', X(96) + (L ? 96 : -96), 516, { size: 46, w: 900, fill: '#fff', stroke: INK, sw: 10, align: 'center', a: al }); txt(f.comboShow.dmg + ' 伤害', X(96) + (L ? 40 : -40), 566, { size: 28, w: 800, fill: '#FFE9A0', stroke: INK, sw: 7, align: 'center', a: al }); }
  }
  // 计时
  const tsec = Math.max(0, Math.ceil(s.timer / 60)); g.save(); g.translate(960, 82); g.fillStyle = INK; g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); for (let i = 0; i < 6; i++) g.lineTo(Math.cos(i * Math.PI / 3) * 66, Math.sin(i * Math.PI / 3) * 58); g.closePath(); g.fill(); g.stroke(); g.restore();
  txt(String(tsec), 960, 108, { size: 72, w: 900, fam: F.en, fill: tsec <= 10 ? '#FF5A6E' : '#FFE066', align: 'center' });
  txt(o.label || (s.final ? '决胜回合' : '第 ' + s.round + ' 回合'), 960, 172, { size: 24, w: 800, fill: 'rgba(230,240,255,0.92)', align: 'center', ls: 3, sh: ['rgba(0,0,30,0.9)', 6, 0, 1] });
  if (o.hints && s.round === 1 && s.phase === 'fight' && s.timer > 99 * 60 - 300) { const a = Math.min(1, (s.timer - (99 * 60 - 300)) / 40); g.save(); g.globalAlpha = a; rr(560, 200, 800, 132, 18); g.fillStyle = 'rgba(6,10,40,0.82)'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#FFE066'; g.stroke(); g.restore();      // 第一回合开打前 5 秒：懒人键提示
    txt('懒人键', 960, 240, { size: 28, w: 900, fill: '#FFE066', align: 'center', a }); txt('O 必杀 · →+O 升龙 · ←+O 突进 · ↓+O 特色技', 960, 276, { size: 26, w: 800, fill: '#fff', align: 'center', a }); txt('H 一级超必杀 · →+H 二级 · ↓+H 三级', 960, 314, { size: 26, w: 800, fill: '#fff', align: 'center', a }); }
  if (o.hints) { txt('J 轻拳 · K 轻脚 · U 重拳 · I 重脚 · J+K 投 · L 架招（按准 = 精防）· U+I 算力冲击 · O / H 加方向 = 懒人必杀 / 超必杀 · Y 挑衅 · Tab 出招表', 960, 1064, { size: 22, w: 700, fill: 'rgba(230,240,255,0.8)', align: 'center', sh: ['rgba(0,0,30,0.9)', 6, 0, 1] }); }
}
function drawBanners(s) {
  const t = s.pt / 60, cx = 960;
  if (s.phase === 'intro') { const n = s.introF / 60; const label = s.final ? 'FINAL ROUND' : 'ROUND ' + s.round;
    if (t > 0.2 && t < n - 0.75) { const a = 1 - tw(t, n - 1.0, 0.25), k = tw(t, 0.2, 0.2, E.out5); g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(8,10,40,0.82)'; g.beginPath(); g.moveTo(cx - 1100 * k, 360); g.lineTo(cx + 1100 * k + 60, 360); g.lineTo(cx + 1100 * k, 600); g.lineTo(cx - 1100 * k - 60, 600); g.closePath(); g.fill(); g.fillStyle = '#E8384F'; g.fillRect(cx - 1100 * k, 352, 2200 * k, 8); g.fillStyle = '#FFE066'; g.fillRect(cx - 1100 * k, 600, 2200 * k, 8); g.restore(); }      // 街机式：ROUND 底下先横着拉出一条黑带
    if (t > 0.2 && t < n - 0.75 && typeof P5 !== 'undefined' && P5.roundTag) P5.roundTag(s, t, n, 1 - tw(t, n - 1.0, 0.25));      // 第 69 圈：P5 式网点 + 剪报字「第 N 回合」
    if (t > 0.35 && t < n - 0.75) { const a = 1 - tw(t, n - 1.0, 0.25); slam(label, cx, 470, 190, t, 0.35, { fam: F.en, fill: lg(0, -150, 0, 20, ['#FFFFFF', '#FFE066']), stroke: '#E8384F', sw: 16, stroke2: INK, sw2: 40, skew: -0.14, a, ls: 6 }); txt(STAGES[s.stage].name, cx, 560, { size: 44, w: 900, fill: '#fff', stroke: INK, sw: 10, align: 'center', a: a * tw(t, 0.6, 0.25), ls: 6 }); }
    if (t >= n - 0.75) txt('准备……', cx, 500, { size: 110, w: 900, fill: '#fff', stroke: INK, sw: 18, align: 'center', a: 0.7 + 0.3 * Math.sin(t * 20), ls: 10 }); }
  if (s.phase === 'fight' && t < 0.85) { const a = 1 - tw(t, 0.6, 0.25); flashAt(t, 0, 0.2, '#fff', 0.8); speedLines(t, cx, 520, { n: 56, r0: 280, a: 0.5 * a, col: '#FFE066', fps: 30, seed: 3 }); g.save(); g.globalAlpha = a * (1 - t / 0.85); g.strokeStyle = '#FFF3A8'; g.lineWidth = 18 * (1 - t / 0.85) + 2; g.beginPath(); g.ellipse(cx, 520, 200 + t * 1400, 90 + t * 600, 0, 0, 7); g.stroke(); g.restore(); slam('FIGHT!', cx, 520, 300, t, 0, { fam: F.en, fill: lg(0, -240, 0, 20, ['#FFF3A8', '#FF8A1F']), stroke: '#B81F3A', sw: 22, stroke2: INK, sw2: 54, skew: -0.14, a, from: 3.2 }); }      // FIGHT：放射线 + 一圈冲击环
  if (s.phase === 'ko' && !s._noKO) { const lab = s.timeUp ? 'TIME UP' : s.winner < 0 ? 'DOUBLE K.O.' : s.koLabel || 'K.O.', tk = s.koT, KOY = lab === 'K.O.' && IM['x:cal_ko'] ? 470 : 560, sh = Math.max(0, 1 - tk * 1.4) * 18, big = s.timeUp || s.winner < 0 ? 220 : 400, O = { fam: F.en, fill: lg(0, -320, 0, 20, ['#FFFFFF', '#FFD23C']), stroke: '#E8384F', sw: 26, stroke2: INK, sw2: 64, skew: -0.14, from: 3.4 , cal: lab === 'K.O.' ? 'cal_ko' : null, calH: 0.95, calCol: '#E0182E' };
    flashAt(tk, 0, 0.22, '#fff', 0.85);
    if (tk < 1.15) { g.save(); g.translate(Math.sin(s.f * 2.3) * sh, Math.cos(s.f * 1.9) * sh); slam(lab, cx, KOY, big, tk, 0.12, Object.assign({}, O, { a: 1 })); g.restore();      // 砸进来
      if (tk > 0.75) { const q = (tk - 0.75) / 0.4; g.save(); g.strokeStyle = 'rgba(255,255,255,' + Math.min(1, q * 2) + ')'; g.lineWidth = 5; for (let i = 0; i < 7; i++) { const an = i / 7 * Math.PI * 2 + 0.3, L = 120 + q * 260; g.beginPath(); g.moveTo(cx, KOY - 60); g.lineTo(cx + Math.cos(an) * L * 0.5 + 18, KOY - 60 + Math.sin(an) * L * 0.3); g.lineTo(cx + Math.cos(an) * L, KOY - 60 + Math.sin(an) * L * 0.55); g.stroke(); } g.restore(); } }      // 裂开
    else { const q = Math.min(1, (tk - 1.15) / 0.9), a = 1 - tw(tk, 1.9, 0.25);      // 碎成七块往外飞
      for (let i = 0; i < 7; i++) { const a0 = i / 7 * Math.PI * 2 + 0.3, a1 = (i + 1) / 7 * Math.PI * 2 + 0.3, mid = (a0 + a1) / 2, d = E.out3(q) * (140 + hash(i) * 160);
        g.save(); g.globalAlpha = a; g.translate(Math.cos(mid) * d, Math.sin(mid) * d * 0.7 + q * q * 160); g.translate(cx, KOY - 60); g.rotate((hash(i + 3) - 0.5) * q * 0.9); g.translate(-cx, -(KOY - 60));
        g.beginPath(); g.moveTo(cx, KOY - 60); g.lineTo(cx + Math.cos(a0) * 1400, KOY - 60 + Math.sin(a0) * 1400); g.lineTo(cx + Math.cos(a1) * 1400, KOY - 60 + Math.sin(a1) * 1400); g.closePath(); g.clip(); slam(lab, cx, KOY, big, 5, 0, Object.assign({}, O, { a: 1 })); g.restore(); } } }
  if (s.phase === 'over' && s.winner >= 0) { const w = s.F[s.winner], L = s.winner === 0;
    if (IM['x:cal_' + w.id] && IM['x:cal_sheng']) { const p0 = tw(t, 0.05, 0.18, E.out5), p1 = tw(t, 0.2, 0.16, E.out5), ni = IM['x:cal_' + w.id], nw = Math.min(620, ni.width * 170 / ni.height), sw = IM['x:cal_sheng'].width * 250 / IM['x:cal_sheng'].height, x0 = cx - (nw + sw + 10) / 2;      // 第 60 圈：毛笔字「<名字>胜」
      if (p0 > 0) { seqTex('q_ink', 5, cx, 300, nw + sw + 300, 0.08, 0.5 * p0, false, '#0A0A0A', false, 0.36); g.save(); g.translate(x0 + nw / 2, 300); g.scale(lerp(2.2, 1, p0), lerp(2.2, 1, p0)); calImg('cal_' + w.id, 0, 0, 170, '#FFFFFF', Math.min(1, p0 * 2.5), w.ch.ink || INK, 620); g.restore(); }
      if (p1 > 0) { g.save(); g.translate(x0 + nw + 10 + sw / 2, 290); g.rotate(-0.06); g.scale(lerp(2.6, 1, p1), lerp(2.6, 1, p1)); calImg('cal_sheng', 0, 0, 250, '#E0182E', Math.min(1, p1 * 2.5), '#0A0606'); g.restore(); } }
    else slam(w.ch.name + ' 胜！', cx, 330, 170, t, 0.05, { fill: lg(0, -150, 0, 20, ['#FFFFFF', w.ch.col2]), stroke: w.ch.col, sw: 16, stroke2: INK, sw2: 40 });
    if (w.perfect) slam('PERFECT', cx, IM['x:cal_sheng'] ? 510 : 450, 90, t, 0.4, { fam: F.en, fill: '#FFE066', stroke: '#B81F3A', sw: 12, stroke2: INK, sw2: 26, skew: -0.14, ls: 8 });
    const k = pop(t, 0.5, 0.3); if (k > 0) { const bw = Math.max(520, mw(w.ch.winq, 50, 800) + 120), bx = cx - bw / 2, by = 610; g.save(); g.translate(cx, by + 60); g.scale(k, k); g.translate(-cx, -(by + 60)); g.shadowColor = 'rgba(0,0,30,0.4)'; g.shadowBlur = 0; g.shadowOffsetY = 10; rr(bx, by, bw, 120, 36); g.fillStyle = '#fff'; g.fill(); g.shadowColor = 'transparent'; g.lineWidth = 7; g.strokeStyle = w.ch.col; g.stroke(); txt(w.ch.winq, cx, by + 78, { size: 50, w: 800, fill: w.ch.ink, align: 'center' }); g.restore(); stk(w.ch.stkWin, L ? cx - bw / 2 - 110 : cx + bw / 2 + 110, by + 50, 230, { sc: k, rot: L ? -0.08 : 0.08 }); } }
}
function drawCutin(s) {       // 超必杀特写：整屏定格，半身像斜切进来
  const fz = s.fz, f = s.F[fz.who], L = fz.who === 0, age = ((fz.len || 44) - s.freeze) / 60 + (fz.len ? (44 - fz.len) / 60 * 0.5 : 0), ch = f.ch, k = tw(age, 0, 0.22, E.out5), [ex, ey] = EYE[f.id];
  g.save(); g.fillStyle = 'rgba(4,6,24,0.62)'; g.fillRect(0, 0, W, H);
  g.save(); g.beginPath(); g.moveTo(0, 330 + (L ? 0 : 120)); g.lineTo(W, 330 + (L ? 120 : 0)); g.lineTo(W, 760 + (L ? 0 : -120)); g.lineTo(0, 760 + (L ? -120 : 0)); g.closePath(); g.clip();
  g.fillStyle = lg(0, 0, W, 0, L ? [ch.ink, ch.col] : [ch.col, ch.ink]); g.fillRect(0, 0, W, H); patFill(PAT.stripe, 0.08, s.f * 20 * (L ? 1 : -1), 0); speedLines(s.f / 4, L ? 500 : 1420, 545, { n: 60, r0: 300, a: 0.25 });
  const bx = L ? lerp(-400, 470, k) + age * 60 : lerp(W + 400, 1450, k) - age * 60; bust(f.id + '_smug', ex, ey, bx, 520, 1.25, { flip: !L }); g.restore();
  g.strokeStyle = '#fff'; g.lineWidth = 10; g.beginPath(); g.moveTo(0, 330 + (L ? 0 : 120)); g.lineTo(W, 330 + (L ? 120 : 0)); g.moveTo(0, 760 + (L ? -120 : 0)); g.lineTo(W, 760 + (L ? 0 : -120)); g.stroke();
  const tx = L ? 1180 : 740; txt(fz.lv ? ['', '一级超必杀', '二级超必杀', '三级超必杀'][fz.lv] : '超必杀', tx, 470, { size: 46, w: 900, fill: '#FFE066', stroke: INK, sw: 10, align: 'center', ls: 14, a: tw(age, 0.1, 0.15) });
  const nm = fz.name, size = Math.min(150, 860 / Math.max(1, nm.length) * 1.5); slam(nm, tx, 610, size, age, 0.12, { fill: lg(0, -size, 0, 10, ['#FFFFFF', '#FFE9A0']), stroke: ch.col, sw: size * 0.1, stroke2: INK, sw2: size * 0.24, skew: -0.12 });
  g.restore(); flashAt(age, 0, 0.14, '#fff', 0.8);
}
let _tmp = null;
function stylePass(s) {       // 豆包的「画风突变」：整个画面变成低分辨率像素风
  const k = Math.min(1, s.styleT / 12, (118 - s.styleT) / 8 + 0.4); if (!_tmp) { _tmp = document.createElement('canvas'); } const sc = Math.round(lerp(1, 9, clamp(k))); if (sc <= 1) return; _tmp.width = Math.ceil(W / sc); _tmp.height = Math.ceil(H / sc);
  const x = _tmp.getContext('2d'); x.imageSmoothingEnabled = true; x.drawImage(cv, 0, 0, _tmp.width, _tmp.height); g.save(); g.imageSmoothingEnabled = false; g.drawImage(_tmp, 0, 0, _tmp.width, _tmp.height, 0, 0, W, H); g.restore();
  g.save(); g.globalCompositeOperation = 'overlay'; g.fillStyle = 'rgba(22,119,255,0.28)'; g.fillRect(0, 0, W, H); g.restore(); patFill(PAT.scan, 0.12);
  txt('画 风 突 变', 960, 330, { size: 150, w: 900, fill: '#fff', stroke: '#1677FF', sw: 18, stroke2: INK, sw2: 40, align: 'center', a: clamp(k), rot: -0.04 });
}
function drawCheer(s) {       // 评论区应援：弹幕刷屏
  const age = 150 - s.cheerT, a = Math.min(1, age / 8, s.cheerT / 70); g.save(); g.globalAlpha = a; const L = ['token来！🖐️😡🤚', 'token来！', '给大肥鱼充 token！', 'token来！🖐️😡🤚', '本评论仅用于消耗 token', 'token来！token来！', '冲！', 'token来！🖐️😡🤚', '饭要被吃了！', 'token来！'];
  for (let r = 0; r < 8; r++) { const R = rngOf(r * 7 + 3), sp = 1000 + R() * 700, y = 262 + r * 64, sz = 44; let x = W + 60 + R() * 500 - age / 60 * sp;       // 每行两三条，同一行同速，不会叠在一起
    for (let k = 0; k < 3; k++) { const s2 = L[(r * 3 + k * 5) % L.length]; txt(s2, x, y, { size: sz, w: 900, fill: (r + k) % 4 === 0 ? '#FFE066' : '#fff', stroke: 'rgba(8,14,48,0.9)', sw: 8 }); x += mw(s2, sz, 900) + 260 + R() * 320; } }
  g.restore();
  if (age < 70) slam('评论区应援！', 960, 228, 96, age / 60, 0, { fill: '#FFE066', stroke: '#B81F3A', sw: 12, stroke2: INK, sw2: 28, a: age > 50 ? 1 - (age - 50) / 20 : 1 });
}
// 世界坐标（x，离地高度 y）→ 屏幕坐标
function w2s(s, x, y) { const FL = STAGES[s.stage].floor, z = s.cam.z, cy = FL - 150; let X = (x - s.cam.x - 960) * z + 960, Y = (FL - y - cy) * z + cy + (s._jl || 0) * z; const C = s._cv; if (C && C.m) { const [px, py, r, k, tx, ty] = C.m, dx = (X - px) * k, dy = (Y - py) * k, c = Math.cos(r), sn = Math.sin(r); X = px + dx * c - dy * sn + tx; Y = py + dx * sn + dy * c + ty; } return [X, Y]; }
// 第 54 圈（SF6_REF 第 1、2 项）：镜头倾斜 / 推近 / 追随击飞 + 整屏运动模糊。重击和必杀命中：镜头朝命中点推近 1.2–1.6 倍、荷兰角 4–9 度再摇回；
// 被打飞：镜头追着人；同时给后处理一个方向模糊（沿击退方向）和径向模糊（超必杀，以命中点为中心）。只改画面，不改判定。?camfx=0 关
const CAMFX = new URLSearchParams(location.search).get('camfx') !== '0';
const PROTECT = new URLSearchParams(location.search).get('protect') !== '0';
let MBLUR = { dx: 0, dy: 0, rx: 0.5, ry: 0.5, rk: 0 };
function camFx(s, FL) {
  const C = s._cv || (s._cv = { tilt: 0, tt: 0, zm: 0, tz: 0, fx: 960, fy: 600, f: -9, mb: 0, mdir: 1, rk: 0, rx: 0, ry: 0, m: null });
  if (!CAMFX || s.cine) { if (C.f !== s.f) { C.f = s.f; vfxScan(s); } C.m = null; MBLUR = { dx: 0, dy: 0, rx: 0.5, ry: 0.5, rk: 0 }; return C; }
  if (C.f !== s.f) { const steps = Math.max(1, Math.min(4, s.f - C.f)); C.f = s.f; vfxScan(s);
    for (const q of s.fx) if (q.k === 'spark' && q.t <= 1 && q.lvl >= 2 && !q._cv) { q._cv = 1; const big = q.lvl === 3 || q.tier === 2, sp = !!q.mvid;
      const rep = s.f - (C.lastBig || -99) < 24; if (big) C.lastBig = s.f; const sg = rep ? -Math.sign(C.tt || 1) : -(q.dir || 1);      // 超必杀连打：每一下左右交替摆，后续几下减弱
      C.tt = sg * (big ? (rep ? 0.05 : 0.1) : sp ? 0.075 : 0.055); C.tz = Math.max(C.tz, big ? 0.42 : sp ? 0.26 : 0.16); { const vic = s.F[1 - (q.who ?? 0)] || null, att = s.F[q.who ?? 0] || null; C.fx = vic && att ? q.x * 0.6 + vic.x * 0.4 + (q.dir || 1) * 50 : q.x;      /* 第 63 圈（GPT r60 B）：焦点偏向接触点，人物脸和出招肢体不被挤到画边 */ C.fy = q.y; } C.mb = Math.max(C.mb, big ? (rep ? 0.45 : 0.8) : sp ? 0.6 : 0.4); C.mdir = q.dir || 1; C.hx = q.x; C.hy = q.y; if (big) { C.rk = rep ? Math.max(C.rk, 0.4) : 1; C.rx = q.x; C.ry = q.y; } }
    for (let i = 0; i < steps; i++) { const hs = s.hitstop > 0; C.tilt += (C.tt - C.tilt) * (hs ? 0.45 : 0.3); C.zm += (C.tz - C.zm) * (hs ? 0.5 : 0.3); if (!hs) { C.tt *= 0.86; C.tz *= 0.9; } C.mb *= hs ? 0.97 : 0.8; C.rk *= hs ? 0.96 : 0.78; }
    if (s.phase === 'ko' && !s.timeUp && s.pt < 60) { const lo = s.F[s.winner < 0 ? 0 : 1 - s.winner], wn = s.F[1 - lo.idx], H = (lo.skin === 'a' ? 470 : 340) * 0.68, mx = (lo.x + wn.x) / 2, my = (Math.max(lo.y, 0) + Math.max(wn.y, 0)) / 2 + H; if (s.pt <= 2) { C.rk = 0.7; C.rx = lo.x; C.ry = lo.y + 120; C.tt = (lo.face || 1) * 0.07; } C.tz = 0.13 * (s.pt < 30 ? 1 : 1 - (s.pt - 30) / 30); C.fx += (mx - C.fx) * 0.3; C.fy += (my - C.fy) * 0.3; }      // 第 60 圈（GPT r56 B）：决胜一击以双方上半身中点为中心短推近 1.13 倍（原来推向倒下的人 1.3 倍以上）      // K.O.：镜头推近倒下的人 + 径向模糊 + 倾斜
    const L = s.F.find(f => (f.st === 'launch' || (f.st === 'hit' && f.y > 80)) && f.y > 60);      // 追随击飞：镜头焦点跟着飞起来的人，稍微推近
    if (L) { C.fx += (L.x - C.fx) * 0.25; C.fy += (L.y + 160 - C.fy) * 0.25; C.tz = Math.max(C.tz, 0.12); C.mb = Math.max(C.mb, Math.min(0.5, Math.hypot(L.vx || 0, L.vy || 0) / 4000)); C.mdir = Math.sign(L.vx || C.mdir) || 1; } }
  const [px, py] = (() => { const z = s.cam.z, cy = FL - 150; return [(C.fx - s.cam.x - 960) * z + 960, (FL - C.fy - cy) * z + cy]; })();
  const k = 1 + C.zm, pull = Math.min(1, C.zm * 1.4); C.m = Math.abs(C.tilt) < 0.002 && C.zm < 0.004 ? null : [px, py, C.tilt, k, (960 - px) * 0.45 * pull, (560 - py) * 0.45 * pull];
  const [rx, ry] = C.rk > 0.02 ? w2s(s, C.rx, C.ry) : [960, 540];
  const [hx, hy] = C.hx != null ? w2s(s, C.hx, C.hy) : [rx, ry]; MBLUR = { dx: C.mdir * C.mb * 0.02 * Math.cos(C.tilt), dy: C.mb * 0.02 * Math.sin(C.tilt) * C.mdir, rx: rx / 1920, ry: 1 - ry / 1080, rk: C.rk * 0.04, cx: hx / 1920, cy: 1 - hy / 1080, cr: C.mb > 0.02 || C.rk > 0.02 ? 0.075 : 0, pe: PROTECT ? s.F.map(f => { const H = f.skin === 'a' ? 470 : 340, [x0, y0] = w2s(s, f.x, f.y), [x1, y1] = w2s(s, f.x, f.y + H), h = Math.hypot(x1 - x0, y1 - y0), fly = f.st === 'launch' || (f.st === 'hit' && f.y > 60); return [(x0 + x1) / 3840, 1 - (y0 + y1) / 2160, h * 0.36 / 1920, h * 0.62 / 1080, fly ? 0.6 : 0.95]; }) : null };      // 第 56 圈：人物（出招手、受击部位、脸）不糊，只糊背景；?protect=0 关
  if (s.exe) MBLUR = { dx: 0, dy: 0, rx: 0.5, ry: 0.5, rk: 0 };      // D2（20:48 用户反馈处决发糊）：处决演出不加动态模糊 / 径向模糊
  return C; }
// 第 54 圈（SF6_REF 第 3、4、5 项）：体积特效层。GPT 出的 8 帧序列帧（assets/fx/q_*.webp，4×2 图集）+ 程序火星 / 碎屑粒子，只在画面层（s._vx），不进对局逻辑。
// 命中：重的一下 = 白黄星芒 + 火星；必杀 = 角色元素团（水花 / 紫焰 / 龙焰 / 扇火 / 月光 / 红斧光……）；超必杀 / PUNISH = 大爆炸 + 火星雨；倒地 / 撞墙 = 烟尘 + 碎屑。?vfx=0 关
const VFXON = new URLSearchParams(location.search).get('vfx') !== '0';
const JET = { ds: 'q_jetwater', gem: 'q_jetpflame', qwen: 'q_jetfire', claude: 'q_jetfire', gpt: 'q_jetfire' };      // 第 56 圈：单侧喷射版（GPT 出图，冲击点在格子左侧中间、往右喷）；没有图时退回 ELEM 的旋涡团
const jetOf = id => JET[id] && IM['x:' + JET[id]] ? JET[id] : null;
const ELEM = { ds: 'q_water', gem: 'q_pflame', gpt: 'q_dragon', grok: 'q_redshock', kimi: 'q_moon', qwen: 'q_fanfire', glm: 'q_redshock', claude: 'q_blast', dou: 'q_flash' };
function seqTex(n, fr, x, y, w, rot = 0, a = 1, add = true, col = null, flip = false, sy = 1) {
  const im = col ? fxTint(n, col) : fxIm(n); if (!im || a <= 0.01) return; const i = Math.max(0, Math.min(7, Math.floor(fr))), cw = im.width / 4, chh = im.height / 2;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(flip ? -1 : 1, sy); g.globalAlpha *= Math.min(1, a); if (add) g.globalCompositeOperation = 'lighter'; g.drawImage(im, (i % 4) * cw, (i >> 2) * chh, cw, chh, -w / 2, -w / 2, w, w); g.restore(); }
function vfxAdd(s, o) { (s._vx || (s._vx = [])).push(Object.assign({ f0: s.f, dur: 24, w: 300, a: 1, add: true, rot: 0 }, o)); if (s._vx.length > 40) s._vx.shift(); }
function vfxSparks(s, x, y, n, dir, col, spd = 1) { const P = s._vp || (s._vp = []); for (let i = 0; i < n; i++) { const h1 = hash(x * 0.37 + i * 1.7 + s.f), h2 = hash(y * 0.53 + i * 2.3 + s.f * 0.7), an = (h1 - 0.5) * Math.PI * 1.6 + (dir < 0 ? Math.PI : 0), v = (6 + h2 * 22) * spd; P.push({ x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v + 6 + h2 * 6, life: 18 + h1 * 26, t: 0, col, w: 1.5 + h2 * 2.5 }); } if (P.length > 400) P.splice(0, P.length - 400); }
function vfxShards(s, x, y, n, dir, col) { const P = s._vp || (s._vp = []); for (let i = 0; i < n; i++) { const h1 = hash(x * 0.71 + i * 3.3 + s.f), h2 = hash(y * 0.29 + i * 1.9 + s.f), an = (h1 - 0.5) * 0.7 + (dir < 0 ? Math.PI : 0), v = 26 + h2 * 30; P.push({ x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v + 4, life: 7 + h2 * 6, t: 0, col, w: 4 + h1 * 3 }); } }      // 第 63 圈（GPT r60 A）：命中「撞进去」的证据：沿击退方向的窄锥形短碎片
function vfxDebris(s, x, y, n, col) { const P = s._vp || (s._vp = []); for (let i = 0; i < n; i++) { const h1 = hash(x + i * 3.1 + s.f), h2 = hash(y + i * 5.7); P.push({ x: x + (h1 - 0.5) * 160, y: y + 4, vx: (h1 - 0.5) * 22, vy: 10 + h2 * 22, life: 30 + h2 * 20, t: 0, col, w: 4 + h2 * 6, chunk: 1 }); } }
function rep3(s) { const r = s.f - (s._lastBigF ?? -99) < 24; s._lastBigF = s.f; return r; }
function vfxScan(s) {      // 每个 sim 步调用一次（camFx 里），看有没有新的命中 / 倒地，生成特效
  if (!VFXON || !IM['x:q_blast']) return;
  for (const q of s.fx) {
    if (q.k === 'spark' && q.t <= 1 && !q._vx) { q._vx = 1; const L = q.tier === 2 ? 4 : q.lvl || 1, d = q.dir || 1, sp = !!(q.mvid || q.src === 'proj'), atk = s.F[q.who] || null, el = atk && ELEM[atk.id];
      if (L >= 2 || sp) { vfxAdd(s, { n: 'q_flash', x: q.x, y: q.y, w: L >= 3 ? 230 : 150, dur: L >= 3 ? 6 : 4, a: 0.85, fr0: 1, rot: hash(q.x) * 6.28 }); vfxShards(s, q.x, q.y, L >= 3 ? 14 : sp ? 10 : 6, d, '#FFF4D2');      /* 第 59 圈：亮核峰值短、普通重击缩小 */ vfxSparks(s, q.x, q.y, L >= 3 ? 60 : 26, d, '#FFD27A', L >= 3 ? 1.4 : 1); }
      const jt = atk && jetOf(atk.id), dpHit = atk && isDP(atk) && q.src !== 'proj' && !EOFF;      // 第 67 圈：升龙命中交给 dpFlame 的火焰爆裂，不再叠元素大贴图（GPT r67：灯柱过曝）
      if (dpHit) {} else if (sp && jt && !(s._vx || []).some(v => v.n === jt && s.f - v.f0 < 12)) { const w = L >= 3 ? 400 : 340; vfxAdd(s, { n: jt, x: q.x + d * w * 0.36, y: q.y + 6, w, dur: 22, a: 0.85, add: 'mix', flip: d < 0, rot: d * (hash(q.y) - 0.5) * 0.35 }); }
      else if (sp && el && !(s._vx || []).some(v => v.n === el && s.f - v.f0 < 12)) vfxAdd(s, { n: el, x: q.x + d * 80, y: q.y, w: L >= 3 ? 360 : 320, dur: 24, a: 0.72, add: 'mix', flip: d < 0, rot: (hash(q.y) - 0.5) * 0.5 });
      if (L >= 3) { vfxAdd(s, { n: 'q_smoke', x: q.x + d * 90, y: q.y + 20, w: 560, dur: 40, add: false, col: '#5A2A1A', a: 0.75, fr0: 2, rot: d * 0.4 }); if (IM['x:q_jetfire']) vfxAdd(s, { n: 'q_jetfire', x: q.x + d * 190, y: q.y + 10, w: 520, dur: 30, add: 'mix', fr0: 1, flip: d < 0, rot: d * (hash(q.y + 1) - 0.5) * 0.4 }); else vfxAdd(s, { n: 'q_blast', x: q.x + d * 70, y: q.y, w: 440, dur: 30, add: 'mix', fr0: 3, rot: hash(q.y + 1) * 6.28 }); /* 第 56 圈：超必杀爆炸改成往击退方向单侧喷（不再是整圈火环） */ vfxAdd(s, { n: 'q_ember', x: q.x + d * 60, y: q.y, w: 680, dur: 40, flip: d < 0, a: 0.85 }); s._ex = { f0: s.f, k: q.tier === 2 ? 0.22 : 0.16, dip: rep3(s) }; }
      else if (L === 2) s._ex = { f0: s.f, k: 0.06, dip: 1 };
    }
    if ((q.k === 'wallhit' || q.k === 'gbounce') && q.t <= 1 && !q._vx) { q._vx = 1; vfxAdd(s, { n: 'q_smoke', x: q.x, y: q.y, w: 420, dur: 30, add: false, col: '#C9B69A', a: 0.85 }); vfxSparks(s, q.x, q.y, 30, q.k === 'wallhit' ? -(q.dir || 1) : 1, '#FFE2A0', 1.1); }
  }
  for (const f of s.F) { const was = f._vxSt; f._vxSt = f.st + (f.y <= 0 ? 'g' : 'a');
    if (f.y <= 0 && (f.st === 'down' || f.st === 'ko') && was && was !== f._vxSt && /a$|launch|hit/.test(was)) { const sk = f.skin === 'a' ? 1.25 : 1;
      vfxAdd(s, { n: 'q_smoke', x: f.x - 90 * sk, y: 40, w: 460 * sk, dur: 34, add: false, col: '#BCA889', a: 0.8, sy: 0.62, flip: true }); vfxAdd(s, { n: 'q_smoke', x: f.x + 90 * sk, y: 40, w: 460 * sk, dur: 34, add: false, col: '#BCA889', a: 0.8, sy: 0.62 }); vfxDebris(s, f.x, 0, 22, '#7A6248'); } }
}
function drawVfx(s, FL) {      // 世界坐标里画（在 drawFight 的镜头变换里）；y 是离地高度
  if (!VFXON) return; const V = s._vx || [];
  for (let i = V.length - 1; i >= 0; i--) { const v = V[i], t = s.f - v.f0; if (t >= v.dur || t < 0) { V.splice(i, 1); continue; } const k = t / v.dur, fr = k * 8, a = v.a * (k < 0.75 ? 1 : (1 - k) / 0.25);
    const fr0 = v.fr0 || 0; const ww = v.w * (0.85 + 0.25 * E.out3(Math.min(1, k * 2))); if (v.add === 'mix') { seqTex(v.n, fr0 + k * (8 - fr0), v.x, FL - v.y, ww, v.rot, a * 0.92, false, null, v.flip, v.sy || 1); seqTex(v.n, fr0 + k * (8 - fr0), v.x, FL - v.y, ww, v.rot, a * 0.22 * (1 - k), true, null, v.flip, v.sy || 1); } else seqTex(v.n, fr0 + k * (8 - fr0), v.x, FL - v.y, ww, v.rot, a, v.add, v.col, v.flip, v.sy || 1); }
  const P = s._vp || []; const st = s._vpF === s.f ? 0 : Math.min(3, Math.max(1, s.f - (s._vpF ?? s.f - 1))); s._vpF = s.f;
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; for (let j = 0; j < st; j++) { p.x += p.vx; p.y += p.vy; p.vy -= p.chunk ? 1.6 : 0.9; p.vx *= 0.96; if (p.y < 0) { p.y = 0; p.vy *= -0.3; p.vx *= 0.6; } p.t++; } if (p.t >= p.life) { P.splice(i, 1); continue; }
    const a = 1 - p.t / p.life, sx = p.x, sy = FL - p.y;
    if (p.chunk) { g.globalCompositeOperation = 'source-over'; g.fillStyle = p.col; g.globalAlpha = a; g.fillRect(sx - p.w / 2, sy - p.w / 2, p.w, p.w * 0.7); g.globalCompositeOperation = 'lighter'; continue; }
    g.strokeStyle = p.col; g.globalAlpha = a; g.lineWidth = p.w; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - p.vx * 1.6, sy + p.vy * 1.6); g.stroke(); }
  g.restore(); }
// 第 60 圈：受击者透出来（GPT r56：特效别盖住受击者）。对手在出必杀 / 超必杀、或者刚有体积特效时，特效画完后把受击者再半透明画一遍，身体轮廓和后仰一直读得出来。?ghost=0 关
const VGHOST = new URLSearchParams(location.search).get('ghost') !== '0';
function vicGhost(s) { if (!VGHOST || s.cine) return; const V = s._vx || [];
  for (const f of s.F) { const o = s.F[1 - f.idx], sp = o && /^(sp|su|super|throw|impact)$/.test(o.st); if (!f._spr || !/^(hit|launch|block|held|stun|freeze)$/.test(f.st)) continue;
    const rv = V.some(v => s.f - v.f0 < 14 && v.w >= 300), sg = sp && s._sgxF === s.f; if (!sg && !rv) continue; const [n, x, y, h, op] = f._spr; spr(n, x, y, h, Object.assign({}, op, { a: 0.45 })); } }      // 第 61 圈：只在真的有大特效（专属贴图身前层 / 体积特效）时才透，否则贴身时受击者会盖住攻击方
function camApply(C) { if (!C || !C.m) return; const [px, py, r, k, tx, ty] = C.m; g.translate(px + tx, py + ty); g.rotate(r); g.scale(k, k); g.translate(-px, -py); }
let _mbc = null;
function blur2d() {      // 没有 WebGL 后处理时的退路：把整屏缩小拷一份，沿模糊方向错位叠 4 层
  const k = Math.hypot(MBLUR.dx, MBLUR.dy); if (k < 0.004 && MBLUR.rk < 0.01) return; if (!_mbc) { _mbc = document.createElement('canvas'); _mbc.width = 960; _mbc.height = 540; }
  const x = _mbc.getContext('2d'); x.clearRect(0, 0, 960, 540); x.drawImage(g.canvas, 0, 0, 960, 540); g.save();
  for (let i = 1; i <= 4; i++) { const f = i / 4; g.globalAlpha = 0.3 * (1 - f * 0.4); const ox = MBLUR.dx * 1920 * (f - 0.5), oy = -MBLUR.dy * 1080 * (f - 0.5), sc = 1 + MBLUR.rk * f * 0.6, cx = MBLUR.rx * 1920, cy = (1 - MBLUR.ry) * 1080;
    g.setTransform(1, 0, 0, 1, 0, 0); g.translate(cx + ox, cy + oy); g.scale(sc, sc); g.translate(-cx, -cy); g.drawImage(_mbc, 0, 0, 1920, 1080); }
  g.restore(); }
// 第 67 圈：超必杀切入特写（横条 cut-in）。目前只有 Claude 二级「我们谈谈」：抓到领子的一瞬间切一个半身特写（sg71 抓领 → sg72 闭眼微笑），之后回到场上打肚子
function cutIn(s, f) {
  if (!(f.st === 'sp' && f.mv && f.mv.id === 'pummel' && f.mv.got)) return; const u = f.t - f.mv.got, L = 19; if (u < 0 || u >= L) return;
  const F = k => fp(f, k), n = u < 10 ? F('sg71') : F('sg72'); if (!n) return; const ch = f.ch, dir = f.face, k = u < 4 ? E.out3(u / 4) : u > L - 5 ? 1 - (u - (L - 5)) / 5 : 1, cy = 470, hh = 330;
  g.save(); g.globalAlpha = Math.max(0, k); g.beginPath(); g.moveTo(0, cy - hh / 2 + 30); g.lineTo(W, cy - hh / 2 - 30); g.lineTo(W, cy + hh / 2 - 30); g.lineTo(0, cy + hh / 2 + 30); g.closePath();
  g.fillStyle = lg(0, cy - hh / 2, 0, cy + hh / 2, ['#1A0A04', mixc('#1A0A04', ch.col, 0.45), '#1A0A04']); g.fill(); g.save(); g.clip();
  speedLines(s.f, dir > 0 ? 1500 : 420, cy, { n: 40, col: ch.col2, a: 0.35, r0: 260 });
  const m = META.spr[n], sc = 760 / m.h, ox = (dir > 0 ? 640 : 1280) - dir * (1 - E.out3(Math.min(1, u / 6))) * 260; spr(n, ox, cy + 420, 760, { flip: dir < 0 });
  g.restore(); g.lineWidth = 8; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(0, cy - hh / 2 + 30); g.lineTo(W, cy - hh / 2 - 30); g.moveTo(0, cy + hh / 2 + 30); g.lineTo(W, cy + hh / 2 - 30); g.stroke();
  if (u >= 3) txt(u < 10 ? '……我们谈谈。' : '（微笑）', dir > 0 ? 1180 : 740, cy + 20, { size: 76, w: 900, fill: '#fff', stroke: ch.ink, sw: 12, align: 'center', skew: -0.1, sc: 1 + 0.15 * Math.max(0, 1 - (u - 3) / 4) });
  g.restore();
}
function jumpLift(s, L3C) {      // 第 75 圈：跳得更高后镜头往上跟（平滑）；电脑对电脑 / 成片 v1 不动；第 76 圈：按头顶位置再多抬一点（头别钻进 HUD），地面最多压到屏幕下沿外 40
  if (L3C || s.v1 || !s.ctrl || !s.ctrl.includes('human')) return (s._jl = 0);
  const z = s.cam.z, my = Math.max(...s.F.map(f => f.st === 'held' ? 0 : f.y)), top = Math.max(...s.F.map(f => f.st === 'held' ? 0 : f.y + f.ch.h * (f.mixK || 1) * 0.96));
  const need = top - 150 - 655 / z, cap = Math.min(420, 365 / z - 150), tg = Math.max(0, Math.min(cap, Math.max((my - 120) * 0.7, need)));
  s._jl = (s._jl || 0) + (tg - (s._jl || 0)) * (tg > (s._jl || 0) ? 0.24 : 0.12); return s._jl < 0.5 ? 0 : s._jl; }
function hudFade(s, side) {      // 第 76 圈：人跳到最高点头还是碰到上方血条 / 头像时，那一侧 HUD 变半透明（平滑），落下来恢复
  if (!s._hudA) s._hudA = [1, 1]; let tg = 1;
  if (s.phase === 'fight' && typeof w2s === 'function') for (const f of s.F) { if (f.y < 60 || f.st === 'held') continue; const hp = w2s(s, f.x, f.y + f.ch.h * (f.mixK || 1) * 0.92), r = 130 * s.cam.z; if (hp[1] < 225 && (side === 0 ? hp[0] - r < 900 : hp[0] + r > 1020)) tg = Math.min(tg, 0.32 + 0.68 * clamp((hp[1] - 60) / 165)); }
  s._hudA[side] += (tg - s._hudA[side]) * (tg < s._hudA[side] ? 0.35 : 0.15); return s._hudA[side]; }
function skyFill(s, JL) {      // 镜头抬起来时场地图上沿以上：把图最上面一条镜像接上去，再压暗
  const im = IM['g:' + s.stage] || (s.stage === 'waterside' && typeof WSP !== 'undefined' && WSP.sky()) || IM['g:office'], h = Math.min(im.height, 480); g.save(); g.scale(1, -1); g.drawImage(im, 0, 0, im.width, h, 0, 0, im.width, h); g.restore();
  g.save(); g.fillStyle = lg(0, -h, 0, 0, ['rgba(4,6,20,0.85)', 'rgba(4,6,20,0.25)']); g.fillRect(0, -h, im.width, h); g.restore(); }
function drawFight(s, o = {}) {
  if (!s._fxw && typeof FEATH !== 'undefined') { s._fxw = 1; for (const n in FEATH) fxIm(n); }      // 第 70 圈：开场先把羽化贴图处理好（不让第一次升龙卡一下）
  if (s.cine && !s.cine.live && s.cine.t >= CB.A && s.cine.t < CB.R) { drawCine(s); return; }      // 演出把整个画面盖住时不画场地（省一半绘制时间）
  let kick = 0, big = null, push = 0, hflash = 0; for (const q of s.fx) if (q.k === 'spark' && q.lvl >= 2 && q.t < 12) { const k0 = Math.max(0, 1 - q.t / 12); kick = Math.max(kick, k0 * (q.lvl === 3 ? 0.05 : 0.035)); if (q.t < 4) big = q; if (q.kind && q.kind !== 'punch') { push = (q.dir || 1) * Math.sin(Math.min(1, q.t / 3) * Math.PI / 2) * k0 * (q.lvl === 3 ? 34 : 22); if (q.t < 2) hflash = Math.max(hflash, q.lvl === 3 ? 0.32 : 0.18); } }      // 重的一下：镜头往里顶、朝击退方向推一下再回正，加一两帧白闪      // 重的一下：镜头往里顶一下
  const koK = s.phase === 'ko' && !s.timeUp ? (s.pt < 50 ? E.out3(Math.min(1, s.pt / 10)) : Math.max(0, 1 - (s.pt - 50) / 20)) : 0, koF = koK > 0 ? s.F[s.winner < 0 ? 0 : 1 - s.winner] : null;      // K.O.：镜头推向倒下的人，背景抽色
  if (koF && !CAMFX) push += (960 - (koF.x - s.cam.x)) * 0.45 * koK;      // 第 60 圈：有 camFx 时由它负责取景，这里不再额外推向倒下的人
  const L3C = s.cine && s.cine.live && typeof LIVE3 !== 'undefined' ? LIVE3.cam(s) : null; if (L3C) push += L3C.px;      // 第 72 圈：实时三级的镜头（推近 + 对准两人）
  const FL = STAGES[s.stage].floor, [a, b] = s.F, z = s.cam.z * (L3C ? L3C.z : 1) * (1 + kick) * (1 + (CAMFX ? 0 : 0.22) * koK), cx = 960, cy = FL - 150, m = SHAKE_OLD ? s.shake : Math.max(0, s.shake - 7) * 0.6, CV = camFx(s, FL);      // 第 68 圈（用户：震屏太高频）：轻中击基本不震（≤7 全吃掉），重击 / 超必杀 / K.O. 只剩约一半；?shake=old 回到旧版
  const JL = jumpLift(s, L3C); g.save(); camApply(CV); g.translate(cx + Math.sin(s.f * (SHAKE_OLD ? 2.7 : 1.4)) * m + push, cy + (L3C ? L3C.py : 0) + JL * z + Math.cos(s.f * (SHAKE_OLD ? 3.3 : 1.7)) * m * 0.7); g.scale(z, z); g.translate(-cx, -cy); g.translate(-s.cam.x, 0);      // 频率也降一半（第 68 圈 H：这句注释原来吞掉了后面的 scale/translate，镜头整个错位，已挪到行尾）
  if (!IM['g:' + s.stage] && typeof WSP !== 'undefined' && s.stage === 'waterside') WSP.base(s); else g.drawImage(IM['g:' + s.stage] || IM['g:office'], 0, 0); if (JL > 1) skyFill(s, JL); if (typeof STAGE2B !== 'undefined' && STAGE2B[s.stage] && (IM['g:' + s.stage] || s.stage === 'waterside')) STAGE2B[s.stage](s); g.fillStyle = 'rgba(6,10,40,0.2)'; g.fillRect(0, 0, WORLD_W, 1080);
  if (s.ctrl && s.ctrl.includes('human') && !(typeof QS !== 'undefined' && QS.get('bgsat'))) { g.save(); g.globalCompositeOperation = 'saturation'; g.fillStyle = 'rgba(128,128,128,0.4)'; g.fillRect(0, 0, WORLD_W, 1080); g.restore(); g.save(); g.fillStyle = 'rgba(8,10,28,0.14)'; g.fillRect(0, 0, WORLD_W, 1080); g.restore(); g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = lg(0, FL - 120, 0, 1080, ['rgba(235,235,240,1)', 'rgba(150,150,170,1)']); g.fillRect(0, FL - 120, WORLD_W, 1200 - FL); g.restore(); }      // 第 36 圈：背景降饱和 26%、地板高光压暗（人物和背景分开，GPT 审图第 7 条）
  drawStageFx(s, kick);
  if (koK > 0) { g.save(); g.globalCompositeOperation = 'saturation'; g.fillStyle = 'rgba(128,128,128,' + (0.9 * koK).toFixed(3) + ')'; g.fillRect(0, 0, WORLD_W, 1080); g.restore(); g.save(); g.fillStyle = 'rgba(10,6,20,' + (0.35 * koK).toFixed(3) + ')'; g.fillRect(0, 0, WORLD_W, 1080); g.restore(); }      // K.O.：场地抽成灰、压暗，人保持彩色
  g.fillStyle = lg(0, FL - 60, 0, 1080, ['rgba(4,8,30,0)', 'rgba(4,8,30,0.28)']); g.fillRect(0, FL - 60, WORLD_W, 1140 - FL);
  if (typeof MEME !== 'undefined') MEME.bg(s, FL);      // D 代理：处决时场地压暗 + 打光
  if (L3C) LIVE3.ghosts(s, FL);      // 第 72 圈：场地压暗 + 攻击方主题色残影
  for (const e of s.E) if (!e.dead) drawEntity(s, e, FL);
  const order = (a.st === 'hit' || a.st === 'launch' || a.st === 'down' || a.st === 'ko' || a.st === 'block') ? [a, b] : [b, a];
  for (const f of order) drawFighter(s, f, FL);
  for (const p of s.P) if (!p.dead) drawProjLife(s, p, FL);
  if (L3C) LIVE3.world(s, FL);      // 第 72 圈：乱舞的命中火花 / 光刃 / 冲击圈
  if (typeof STAGE2F !== 'undefined' && STAGE2F[s.stage] && !s.cine) STAGE2F[s.stage](s, FL);      // 第 71 圈：近景层（stage2.js）
  drawFx(s, FL); drawVfx(s, FL); vicGhost(s); if (typeof MEME !== 'undefined') MEME.world(s, FL);      // D 代理：处决的泪花 / 每拳冲击、饭粒弹碎饭
  g.restore();
  if (s._ex && s.f - s._ex.f0 < 5) { const u = s.f - s._ex.f0; g.save(); if (u < 1 && !s._ex.dip) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = s._ex.k; g.fillStyle = '#FFF4D8'; } else { g.globalAlpha = 0.2 * (1 - u / 5); g.fillStyle = '#05030A'; } g.fillRect(0, 0, W, H); g.restore(); }      // r55：只在主重击给 1 帧提亮，其余 = 背景短暂压暗 20%（让接触点的白核更显眼）      // 命中曝光闪（2–4 帧整体提亮）
  if (!(typeof POST !== 'undefined' && POST.on && POST.ok) && !o.noBlur) blur2d();
  if (big) { const [ix, iy] = w2s(s, big.x, big.y); speedLines(s.f, ix, iy, { n: 34, r0: big.lvl === 3 ? 330 : 270, a: 0.42 * (1 - big.t / 4), w: 0.016 }); }
  if (s.styleT > 0) stylePass(s);
  if (hflash > 0) { g.save(); g.globalAlpha = hflash; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.restore(); }
  if (s.flash > 0) { g.save(); g.globalAlpha = Math.min(1, s.flash); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.restore(); }
  if (typeof FX2 !== 'undefined' && FX2.screen && !s.cine) FX2.screen(s); if (typeof P5 !== 'undefined' && P5.koLines && s.phase === 'ko' && !s._noKO) P5.koLines(s, s.koT);      // K.O. 集中线（HUD 之下）      // 第 69 圈：光刃线在屏幕层画，白闪 / 模糊盖不住
  if (s.phase === 'ko' && s.pt < 40) vignette(0.5, 0.35, '120,0,20');
  if (s.dark > 0) drawDark(s);
  for (const f of s.F) cutIn(s, f);      // 第 67 圈：Claude「我们谈谈」抓领特写
  if (!o.noHud && !s.exe) { const dv = L3C ? s.F[1 - s.cine.who] : null, hp0 = dv ? dv.hp : 0; if (dv) dv.hp = LIVE3.hp(s); drawHUD(s, o); if (dv) dv.hp = hp0; }      // 第 72 圈：演出里血条跟着每一下掉（只是显示，画完还原）      // D 代理：处决演出时不画 HUD（黑边电影感）
  for (const q of s.fx) if (q.k === 'ctrtxt' && q.t < q.life) { const L = q.who === 1 ? -1 : 1; ctrText(q, L > 0 ? 330 : 1590, 300, q.t / q.life); }
  if (s.dbl > 0) { const a = Math.min(1, s.dbl / 20); txt('业务翻倍中 ×2 · ' + Math.ceil(s.dbl / 60) + 's', 960, 232, { size: 40, w: 900, fill: '#FFE066', stroke: '#B81F3A', sw: 9, align: 'center', a }); }
  if (s.cheerT > 0) drawCheer(s);
  if (s.freeze > 0 && s.fz) { if (typeof P5 !== 'undefined') P5.cutin(s); else drawCutin(s); }      // 第 69 圈：P5 式拼贴切入（js/fx2.js，?oldcut=1 旧版）
  if (s.cine && !s.cine.live) drawCine(s);
  if (L3C) LIVE3.screen(s);      // 第 72 圈：招式名条 / 连击数 / 终结白闪
  if (typeof MEME !== 'undefined') MEME.screen(s);      // D 代理：处决的黑边 / 招式名 / 连打数
  drawBanners(s);
}
// —— 出招表（可玩版按 P 暂停时显示）——
const MVN = { dp: { ds: '鲸鱼顶', gem: '炸毛升天' }, slide: { ds: '深度思考冲刺' }, moyu: { ds: '摸鱼' }, yarn: { gem: '毛线球' }, steal: { gem: '偷饭' }, rice: { ds: '吃白饭' }, helmet: { ds: '戴头盔（不锈钢盆，挡一下；戴着时 →+K 头盔冲撞）' }, plead: { ds: '求求了（举盆要饭的当身）' }, banana: { gem: '香蕉皮' }, dumb: { gpt: '降智' }, double: { grok: '业务翻倍（双方伤害 ×2）' }, darkside: { kimi: '月之暗面（2 格算力）' }, remote: { glm: '代你操作（近身抓，左右颠倒）' }, milktea: { qwen: '请你喝奶茶' }, phone: { dou: '打电话' } };
Object.assign(MVN.dp, { gpt: '龙尾上挑', grok: '斧柄上挑', kimi: '月牙挑', glm: '书脊上顶', qwen: '开扇上撩', claude: '但是——', dou: '宝宝冲天拳' });
MVN.spin = { surf: '冲浪滑行', nin: '旋身踢', ds: '鲸尾回旋', gem: '追尾巴', gpt: '龙卷', grok: '大风车', kimi: '卷轴龙卷', glm: '翻页旋踢', qwen: '扇舞旋身', claude: '转身回礼', dou: '陀螺' };
Object.assign(MVN.dp, { surf: '浪尖翻板', nin: '加载转圈斩' }); MVN.vanish = Object.assign(MVN.vanish || {}, { nin: '404 隐身' }); MVN.shuri = Object.assign(MVN.shuri || {}, { nin: '验证码手里剑' }); MVN.wcannon = { surf: '热搜水炮' };      // 第 67 圈 C：客串招式名
MVN.boom = { grok: '回旋斧', glm: 'Z 字飞书' }; MVN.blade = { glm: '红笔批注' }; Object.assign(MVN, { kyo3: { gpt: '首先、其次、最后' }, dkick: { gpt: '两段蹬踢' }, wing: { gpt: '龙翼突进' }, gsum: { gpt: '我来总结一下（跑抓，防不住）' }, kyo3b: { gpt: '总之、换句话说、综上所述' }, three: { gpt: '数字弹' }, fan: { qwen: '飞扇' }, elbow: { qwen: '贴地突进肘' }, alts: { qwen: '叫两个小号' }, swat: { grok: '拍掉' }, rungrab: { grok: '跑抓' }, grab360: { grok: '公开处刑' }, siberia: { grok: '远距离抓（往身后摔）' }, emoji: { dou: '表情包弹' }, tenshou: { dou: '宝宝升天踢（对空）' }, pose: { dou: '摆拍架势' }, phone: { dou: '打电话' }, fkk: { glm: '满分飞踢' }, otk: { ds: '加班连打' }, bakkai: { ds: '鲸尾回旋' }, ddk: { ds: '鲸鳍下踢' }, dpk: { ds: '鲸鱼顶' }, mstep: { ds: '摸鱼步' }, bslam: { ds: '饭盆砸' }, stamp: { ds: '盖章驳回' }, claw3: { gem: '三段爪' }, flip: { gem: '翻面' }, bclaw: { gem: '后跃斜爪' }, flurry: { gem: '猫猫拳' }, knead: { gem: '踩奶' }, mambo: { gem: '哈基米曼波' }, snatch: { gem: '叼走' }, glide: { qwen: '飞扇滑翔' }, bflip: { qwen: '翻身肘' }, aclaw: { gem: '空中斜爪' } }); MVN.paper = { claude: '长回复（纸页，慢而大）' }; Object.assign(MVN, { paper2: { claude: '贴地纸页' }, excuse: { claude: '抱歉打断一下' }, ucounter: { claude: '上段当身' }, lcounter: { claude: '下段当身' }, phonegrab: { claude: '把手机拿过来' }, mcounter: { claude: '中段当身' }, otg: { claude: '再确认一下（倒地追打）' }, moon: { kimi: '慢速月球' }, lobmoon: { kimi: '抛个月亮（抛物线）' }, zbreath: { kimi: '梦话喷射（近身多段）' }, warpf: { kimi: '月相闪现（身前）' }, warpb: { kimi: '月相闪现（身后）' }, usb: { gpt: '让她自己写（丢 U 盘）' } });
const mvName = (ch, id) => id === ch.sp.id ? ch.sp.name : (MVN[id] && MVN[id][ch.id]) || id;
const EXTRA_QW = [['空中 J + K（对手在空中）', '空投'], ['三角跳后按拳', '飞扇滑翔（蹬墙俯冲，中段）'], ['满减券（最多 3 张）', '飞扇碰到人领券；带券的必杀自动多一段']];
const EXTRA_CL = [['空中 ↓↘→ + 拳', '往斜下方丢纸页']];
const EXTRA_KM = [['U / I / ↓+U（卷轴长手）', '打得远，越远伤害越低'], ['空中 ↓↘→ + 拳', '斜下月亮'], ['空中按住 ↑ / 空中 ↓ + 重拳', '睡着飘 / 钻头']];
const EXTRA = { claude: EXTRA_CL, kimi: EXTRA_KM, gpt: [['首先 + 拳 / 脚', '其次（拳）/ 下段踢（脚），再按拳 = 上挑、按脚 = 中段砸'], ['↓↘→ + 重拳（再按拳 ×2）', '总之 → 换句话说 → 综上所述（第二套派生，最后一段中段）'], ['两段蹬踢后空中再按脚', '第三脚（往下劈）'], ['空中 ↓ + 重脚', '敲黑板（中段）']], qwen: [...EXTRA_QW, ['空中 ↓↘→ + 拳', '空中飞扇'], ['空中 ↓ + 重脚', '俯冲踢'], ['贴墙 ↑', '三角跳']], grok: [['J + U 同按', '大风车（上半身不吃飞行道具，可左右挪）'], ['K + I 同按', '下段大风车（不吃下段）'], ['→ + 重拳', '头槌（对空）'], ['空中 ↓ + 重拳 / 空中 J+K', '飞身压（中段）/ 空中抓']], dou: [['摆拍架势中按 J / U / K / I', '戳 / 掌推打飞 / 下段扫 / 跳踩（中段）'], ['← + 重脚', '跨步下劈（中段）'], ['连按轻脚', '踢踢踢'], ['空中 ↓ + 轻脚', '踩头（踩中弹起，可连踩）'], ['→ + 重脚', '翻身踢（中段）'], ['贴墙 ↑', '蹬墙跳']], glm: [['蓄力', '按住 45 步，松开后 10 步内出'], ['↓↓ + 拳', '批注：放一道慢速红笔刀波，飞书穿过它变大变强'], ['空中 ↓↘→ + 拳', '空中飞书（斜下）'], ['→ + 重拳 / ← + 重脚', '中段锤 / 倒钩踢'], ['↓↙←↓↙← + 脚', '二级 · 满分三连（三次后空翻踢，2 格）']] };
const SUN = { dou: { 1: '大号表情包（近身气功）', 2: '连续转发（突进连踢）' }, glm: { 1: '连环批改（连发飞书）', 2: '开卷考试（8 秒免蓄力）' }, kimi: { 1: '满月弹（按住拳蓄大）', 2: '月光柱（全屏柱）' }, ds: { 1: '干饭人（吃到饭量满级）', 2: '鲸落（俯冲连踢）' }, gem: { 1: '八连猫爪（爆前按拳追加）', 2: '炸毛光柱（定住对手）' }, gpt: { 2: '详细展开说说（瞬发乱舞）' }, qwen: { 2: '全场包邮（旋转突进）' }, grok: { 1: '热搜直升机（空中投）', 2: '全网风暴（吸人大风车）' }, claude: { 1: '逐条回复（按提示输入十下）', 2: '全文审阅（书页冲击波）' } };      // 按原型重做过的一 / 二级超必杀（出招表一行放不下长说明）
const ROLE = { surf: '远近立回型', nin: '高速奇袭型', ds: '越吃越强型', gem: '贴身连压型', gpt: '正统波升型', qwen: '灵巧机动型', grok: '近身投技型', claude: '当身反击型', kimi: '长手牵制型', glm: '蓄力守点型', dou: '连打爆发型' };
function drawMoveList(ch) {
  g.save(); g.fillStyle = 'rgba(4,6,24,0.86)'; g.fillRect(0, 0, W, H); g.restore();
  panelSkew(150, 50, 1620, 90, 20, ch.col, '#fff', 6); txt('出招表 · ' + ch.name + '　手感参考：' + (ROLE[ch.id] || '综合型') + '（暂停中，Tab / Esc 继续）', 190, 112, { size: 42, w: 900, fill: '#fff', ls: 3 });
  const T = (typeof HMOV !== 'undefined' && HMOV[ch.id]) || {}, J2 = (typeof HMOVJ !== 'undefined' && HMOVJ[ch.id]) || {}, K2 = (typeof HMOVK !== 'undefined' && HMOVK[ch.id]) || {};
  const mv = m => J2[m] !== undefined ? J2[m] : T[m] !== undefined ? T[m] : (m === '236' ? ch.sp.id : m === '623' ? 'dp' : null);
  const AR = { '22': '↓↓', '214': '↓↙←', '623': '→↓↘', '236': '↓↘→', 'air236': '空中 ↓↘→', '41236': '半圈 ←↙↓↘→', '63214': '半圈 →↘↓↙←', '46c': '←蓄 →', '28c': '↓蓄 ↑', '360': '转一圈' };
  const MLIST = {
    ds: [['必杀技（饭量 0–4 级：↓↓ + 拳 吃一口升一级）', ''], ['↓↘→ + 拳（再按拳）', '加班连打（0 级两段 / 1 级三段 / 3 级加踢）'], ['↓↘→ + 脚', '滑铲（下段）'], ['→↓↘ + 拳 / 脚', '鲸鱼顶（脚版 2 级起三段）'], ['↓↙← + 脚', '鲸尾回旋（连按脚加圈；命中 / 被防可取消接三级）'], ['↓↙← + 拳', '求求了（当身）'], ['空中 ↓↘→ + 脚', '鲸鳍下踢（饭量 1 级，中段，踢中弹回）'], ['空中 ↓↙← + 脚', '饭盆砸（饭量 2 级）'], ['半圈 →↘↓↙← + 拳（近身）', '盖章驳回（饭量 3 级，指令投）'], ['↓↓ + 拳 / 脚', '吃白饭 / 戴头盔（戴着时 → + U 头盔冲撞）'], ['半圈 ←↙↓↘→ + 拳（O 一键）', '钢盆狙击（每枪盆盖眼 = 破绽，EX 三连）'], ['饭量 4 级', '普通技伤害 +10%，端着碗站'], ['被终结时（决胜局）', '处决「按头连打」（Enter 跳过）']],
    surf: [['必杀技（客串 · 网上冲浪选手）', ''], ['↓↘→ + 拳', '热搜水炮（重版更快，EX 两发上下）'], ['→↓↘ + 拳 / 脚', '浪尖翻板（对空）'], ['↓↙← + 拳 / 脚', '冲浪滑行（多段突进，最后一下打飞）'], ['空中 ↓↘→ + 拳', '空中水炮（斜下，反冲后飘）'], ['超必杀', ''], ['↓↘→↓↘→ + 拳', '一级 冲上热搜（巨浪）'], ['↓↙←↓↙← + 拳', '二级 全力输出（必杀全变 EX）'], ['↓↘→↓↘→ + 脚', '三级 全网爆款（打中进处决演出）']],
    nin: [['必杀技（客串 · 404 号忍者）', ''], ['↓↘→ + 拳', '验证码手里剑（重版两枚，EX 三枚扇形）'], ['→↓↘ + 拳 / 脚', '加载转圈斩（对空）'], ['↓↙← + 拳', '旋身踢（多段突进）'], ['↓↙← + 脚', '404 隐身（无敌消失，重版 / EX 闪到对手身后踢）'], ['空中 ↓↘→ + 拳', '空中手里剑（重版两枚）'], ['超必杀', ''], ['↓↘→↓↘→ + 拳', '一级 瞬移斩 · 404'], ['↓↙←↓↙← + 拳', '二级 全力输出'], ['↓↘→↓↘→ + 脚', '三级 强制下线（打中进处决演出）']],
    gem: [['必杀技', ''], ['↓↘→ + 拳', '毛线球（贴地，O 一键）'], ['→↓↘ + 拳', '炸毛升天（对空）'], ['↓↙← + 拳（再按拳 ×2）', '三段爪：第三段拍倒'], ['半圈 →↘↓↙← + 拳（近身）', '翻面：不扣血，对手背过去定住'], ['半圈 ←↙↓↘→ + 拳', '猫猫拳（连打）'], ['→↓↘ + 脚', '后跃斜爪'], ['↓↘→ + 脚', '踩奶'], ['↓↙← + 脚', '追尾巴（旋风腿）'], ['↓↓ + 拳 / 脚', '香蕉皮 / 偷饭'], ['半圈 →↘↓↙← + 脚', '哈基米曼波（挑衅，回 TOKEN 和算力）'], ['半圈 ←↙↓↘→ + 脚', '叼走（跑过去拎起来炸，防不住）'], ['空中 ↓↙← + 拳', '空中斜爪（中段）'], ['→ + J / 空中 ← + K / 贴墙 ↑', '两段爪 / 逆向踢 / 三角跳']] };
  const left = MLIST[ch.id] ? MLIST[ch.id].slice() : [['必杀技（拳 = J / U，脚 = K / I；轻重键改速度和伤害）', '']];
  if (!MLIST[ch.id]) {
  for (const m of ['236', '623', '214', '22', '63214', '41236']) { const id = mv(m); if (id) left.push([AR[m] + ' + 拳', mvName(ch, id) + (m === '236' ? '（O 一键）' : '')]); }
  if (!K2['214']) left.push(['↓↙← + 脚', mvName(ch, 'spin') + '（旋风腿，多段）']);
  for (const m in K2) left.push([AR[m] + ' + 脚', mvName(ch, K2[m])]);
  if (ch.id === 'claude') left.push(['→ + J', '你说得完全正确（中段）']);
  const C2 = (typeof HMOVC !== 'undefined' && HMOVC[ch.id]) || {}; for (const m in C2) left.push([AR[m] + (m === '28c' ? ' + 脚' : ' + 拳'), mvName(ch, C2[m])]);
  for (const r of (EXTRA[ch.id] || [])) left.push(r); }
  left.push(['必杀指令 + 两拳 / 两脚', 'EX 版（耗 2 格算力）'], ['', ''], ['超必杀（TOKEN 分 3 格；懒人键见最上面）', ''], ['↓↘→↓↘→ + 拳', '一级 · ' + ((SUN[ch.id] && SUN[ch.id][1]) || ch.su.name) + '（1 格）'], ['↓↙←↓↙← + 拳', '二级 · ' + ((SUN[ch.id] && SUN[ch.id][2]) || ({ gem: '九条命' })[ch.id] || '全力输出') + '（2 格）'], ['↓↘→↓↘→ + 脚', '三级 · ' + ((typeof CINE_TXT !== 'undefined' && CINE_TXT[ch.id]) ? CINE_TXT[ch.id].name + '（3 格，≤25% 血终结）' : '强化版一级（3 格）')]);
  const right = [['普通技（站 / 蹲 / 跳 × 4 键）', ''], ['J / K（可连打）', '轻拳 / 轻脚，J 连按自动三连'], ['U / I（近身自动变近身版）', '重拳 / 重脚'], ['↓ + J / K', '蹲轻拳 / 蹲轻脚（下段）'], ['↓ + U / ↓ + I', '对空上勾 / 扫腿（下段，击倒）'], ['→ + J / → + U', '中段（破蹲防）/ 前冲重拳'], ['→ + I / ← + I', '前踢 / 后转踢'], ['J + K（← 同按 = 往后投）', '投；被抓瞬间按 J+K 拆投'], ['轻点 W / ↓ 后马上 W', '小跳 / 大跳'], , ['', ''],
    ['算力槽（绿色 6 格）', ''], ['按住 L', '架招；挨打前一瞬间按 = 精防'], ['架招中 →→ / 普通技后 →→', '绿冲（1 格）/ 绿冲取消（3 格）'], ['U + I', '算力冲击（1 格，两下霸体）'], ['防御中 U + I', '算力反击（2 格）'], ['倒地时按任意键', '快速起身'], ['A / D、空格、双击 → / ←', '移动 / 翻滚 / 冲刺 · 后撤']];
  const fitSz = (s, w, mw, sz = 24, mn = 16) => { g.save(); g.font = font(sz, w, F.cn); const k = g.measureText(s).width; g.restore(); return k <= mw ? sz : Math.max(mn, Math.floor(sz * mw / k)); };      // 第 69 圈：出招表文字超宽时缩字号，不再压到另一栏
  const col = (rows, x0, xw, top, sp = 41, xe = 1800) => rows.forEach(([a, b], i) => { const y = top + i * sp; if (!b && a) { txt(a, x0, y, { size: fitSz(a, 900, xe - x0 - 10, 28), w: 900, fill: '#FFE066' }); return; } txt(a, x0 + 20, y, { size: fitSz(a, 800, xw - 32), w: 800, fill: '#fff' }); txt(b, x0 + xw, y, { size: fitSz(b, 700, xe - x0 - xw - 16), w: 700, fill: 'rgba(230,240,255,0.92)' }); });
  const lz = typeof lazyMoves === 'function' ? lazyMoves({ id: ch.id, ch, rice: 0 }) : {}, nm = d => lz[d] ? mvName(ch, lz[d]).replace(/（.*$/, '') : '—';      // 懒人键一块：O / H 加方向
  g.save(); rr(120, 150, 1680, 84, 14); g.fillStyle = 'rgba(255,224,102,0.12)'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,224,102,0.7)'; g.stroke(); g.restore();
  txt('懒人键', 140, 202, { size: 30, w: 900, fill: '#FFE066' });
  txt('O ' + nm('n') + '　→+O ' + nm('f') + '　←+O ' + nm('b') + '　↓+O ' + nm('d') + '（和搓招一样，有冷却）', 270, 186, { size: 24, w: 800, fill: '#fff' });
  txt('H 或 ; 一级　→+H 二级　↓+H 三级（伤害 ×0.9，格数不够不出）', 270, 222, { size: 24, w: 800, fill: '#fff' });
  const rows = Math.max(left.length, right.length), sp = Math.min(41, (1068 - 262) / rows);
  col(left, 120, 330, 262, sp, 970); col(right, 980, 380, 262, sp, 1800);
}

// 接触阴影：贴脚的扁椭圆（中心深、边缘虚）+ 脚下一圈很窄的环境遮蔽；离地越高越小越淡
function drawShadow(s, f, p, FL, h, wDisp) {
  const lift = Math.max(0, f.y - Math.min(0, p.dy || 0)), k = clamp(1 - lift / 650, 0.2, 1) * (STAGES[s.stage].shA || 1), col = STAGES[s.stage].sh || '6,8,30';      // shA：深色地毯上阴影加深
  const bw = Math.min(wDisp * 0.46, f.ch.h * 0.36) * (0.55 + 0.45 * k), lieW = p.lie ? 1.7 : 1;
  g.save(); g.translate(f.x, FL + 2); g.scale(1, 0.17); const r1 = bw * 1.35 * lieW; g.fillStyle = rg(0, 0, 0, r1, ['rgba(' + col + ',' + (0.6 * k).toFixed(3) + ')', 'rgba(' + col + ',' + (0.36 * k).toFixed(3) + ')', 'rgba(' + col + ',0)']); g.fillRect(-r1, -r1, 2 * r1, 2 * r1); g.restore();
  if (lift < 50) { const a = Math.min(0.95, 0.78 * (1 - lift / 50) * (STAGES[s.stage].shA || 1)), r2 = bw * 0.82 * lieW; g.save(); g.translate(f.x, FL + 1); g.scale(1, 0.11); g.fillStyle = rg(0, 0, 0, r2, ['rgba(' + col + ',' + a.toFixed(3) + ')', 'rgba(' + col + ',' + (a * 0.85).toFixed(3) + ')', 'rgba(' + col + ',0)']); g.fillRect(-r2, -r2, 2 * r2, 2 * r2); g.restore(); }
}
// 走路的脚步灰：逐帧走路时，每次换脚落地冒一小撮（只在画面层，不进对战逻辑）
function footDust(s, f, FL) {
  if (!s._rfx) s._rfx = { last: {} }; const R = s._rfx;
  if (f.st === 'walk' && f.y <= 0) { const n = Math.floor(f.walkT / 7) % 4, key = f.idx; if (R.last[key] !== n) { R.last[key] = n; if ((n === 0 || n === 2) && f.walkT > 2 && !s.fx.some(q => q.k === 'dust' && q.small && q.own === f.idx && q.t < 5)) s.fx.push({ k: 'dust', x: f.x + f.face * 30, y: 0, t: 0, life: 18, small: true, own: f.idx }); } }
  else R.last[f.idx] = -1;
  if (f.st === 'hit' && f.y <= 0 && Math.abs(f.vx) > 140 && f.t > 0 && f.t % 3 === 0 && R.sk !== s.f * 2 + f.idx) { R.sk = s.f * 2 + f.idx; s.fx.push({ k: 'dust', x: f.x - Math.sign(f.vx) * 10, y: 0, t: 0, life: 16, small: true, own: f.idx }); }      // 被打退时脚下擦出的灰
}

// 命中火花分型：拳 = 圆形冲击波 + 星芒；脚 = 斜向月牙 + 碎片；重 = 大十字闪光 + 一圈尘环
// 命中火花按「属性」分：爪 / 尾巴 / 斧 / 书 / 扇 / 卷轴（拳脚走下面的 drawSpark）。只看画面，不进对战逻辑
const KICKISH = /k|sweep|bakkai|ddk|spin|kick|whale|stomp|kkk|dive/;
function sparkMat(s, q) {
  const a = s.F[q.who]; if (!a || q.src === 'proj') return null; const id = a.id, mv = q.mvid || '', ak = q.ak || '', kick = KICKISH.test(mv || ak) || q.kind === 'kick';
  if (id === 'gem') return 'claw';
  if (id === 'ds') return kick ? 'tail' : null;
  if (id === 'grok') return q.kind !== 'punch' && !kick ? 'axe' : null;
  if (id === 'claude' || id === 'glm') return !kick && (q.kind === 'heavy' || mv) ? 'book' : null;
  if (id === 'kimi') return !kick ? 'scroll' : null;
  if (id === 'qwen') return !kick && (q.kind === 'heavy' || mv) ? 'fan' : null;
  return null;
}
function drawMatSpark(q, x, y, k, FL) {
  const m = q._m, d = q.dir || 1, col = q.col || '#FFE066', L = q.lvl, R0 = L >= 3 ? 170 : L === 2 ? 130 : 95, e = E.out3(k), seed = q.x * 0.37 + q.life;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  if (m === 'claw') {      // 三道爪痕：先白后紫，划过去再淡掉
    g.translate(x, y); g.rotate(-0.75 * d + (hash(seed) - 0.5) * 0.4); const len = R0 * 1.5 * E.out3(Math.min(1, q.t / 3));
    for (let j = -1; j <= 1; j++) { g.globalAlpha = 1 - k * k; g.fillStyle = col; g.beginPath(); g.moveTo(-len, j * 26 - 5); g.quadraticCurveTo(0, j * 26 - 22, len, j * 26); g.quadraticCurveTo(0, j * 26 - 8, -len, j * 26 + 5); g.fill(); g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(-len * 0.8, j * 26 - 2); g.quadraticCurveTo(0, j * 26 - 16, len * 0.8, j * 26); g.quadraticCurveTo(0, j * 26 - 10, -len * 0.8, j * 26 + 2); g.fill(); }
  } else if (m === 'tail') {      // 尾巴：一大道新月形甩痕 + 水花
    g.translate(x, y); g.scale(d, 1); g.globalAlpha = 1 - k; const r = R0 * (0.8 + 0.5 * e);
    g.fillStyle = lg(-r, 0, r, 0, ['rgba(127,212,255,0)', 'rgba(127,212,255,0.9)', '#FFFFFF']); g.beginPath(); g.arc(-r * 0.4, 0, r, -1.3, 1.3); g.arc(-r * 0.7, 0, r * 0.86, 1.2, -1.2, true); g.closePath(); g.fill();
    g.fillStyle = '#CFF0FF'; for (let i = 0; i < 10; i++) { const R = hash(seed + i * 3.3), an = (R - 0.5) * 2.4, dd = R0 * (0.3 + 1.5 * e) * (0.6 + R * 0.6); g.beginPath(); g.ellipse(Math.cos(an) * dd + r * 0.2, Math.sin(an) * dd + k * k * 90, 6 + R * 5, 9 + R * 7, an, 0, 7); g.fill(); }
  } else if (m === 'axe') {      // 斧：一道竖劈的白线 + 木屑碎块
    g.translate(x, y); g.globalAlpha = 1 - k; if (q.t < 8) { g.fillStyle = '#FFFFFF'; g.save(); g.rotate(0.35 * d); g.fillRect(-7 * (1 - k), -R0 * 1.6, 14 * (1 - k) + 2, R0 * 3.2); g.restore(); star4(0, 0, R0 * (1.3 - q.t * 0.12), 0.785, '#FFFFFF', 0.9 - q.t * 0.1); }
    for (let i = 0; i < 9; i++) { const R = hash(seed + i * 5.1), an = -Math.PI / 2 + (R - 0.5) * 2.6, dd = R0 * (0.2 + 1.4 * e); g.save(); g.translate(Math.cos(an) * dd, Math.sin(an) * dd + k * k * 160); g.rotate(q.t * 0.3 + i); g.fillStyle = i % 3 ? '#6B4630' : '#E0475B'; g.fillRect(-9, -6, 18, 12); g.restore(); }
  } else if (m === 'book') {      // 书：方形冲击环 + 飞散的书页
    g.translate(x, y); g.globalAlpha = 1 - k; g.save(); g.rotate(0.785 + q.t * 0.05); g.strokeStyle = col; g.lineWidth = 10 * (1 - k) + 2; const r = R0 * (0.3 + 1.1 * e); g.strokeRect(-r, -r, 2 * r, 2 * r); g.strokeStyle = '#FFFFFF'; g.lineWidth = 4; g.strokeRect(-r * 0.8, -r * 0.8, 1.6 * r, 1.6 * r); g.restore();
    for (let i = 0; i < 7; i++) { const R = hash(seed + i * 2.9), an = (d > 0 ? 0 : Math.PI) + (R - 0.5) * 2.6, dd = R0 * (0.3 + 1.6 * e); g.save(); g.translate(Math.cos(an) * dd, Math.sin(an) * dd + k * 50); g.rotate(an + q.t * 0.25 * (R > 0.5 ? 1 : -1)); g.fillStyle = '#FFFDF4'; g.fillRect(-14, -18, 28, 36); g.fillStyle = 'rgba(80,60,40,0.4)'; g.fillRect(-9, -10, 18, 3); g.fillRect(-9, -2, 14, 3); g.restore(); }
  } else if (m === 'fan') {      // 扇：一片扇形光 + 花瓣
    g.translate(x, y); g.scale(d, 1); g.globalAlpha = 1 - k; const r = R0 * (0.5 + 0.8 * e); g.fillStyle = rg(0, 0, 0, r, ['rgba(255,255,255,0.95)', rgba(col, 0.6), rgba(col, 0)]); g.beginPath(); g.moveTo(-r * 0.2, 0); g.arc(-r * 0.2, 0, r, -0.9, 0.9); g.closePath(); g.fill();
    for (let i = 0; i < 8; i++) { const R = hash(seed + i * 4.7), an = (R - 0.5) * 2, dd = R0 * (0.3 + 1.5 * e); g.save(); g.translate(Math.cos(an) * dd, Math.sin(an) * dd + k * 40); g.rotate(q.t * 0.3 + i); g.fillStyle = i % 2 ? '#FFC2D6' : '#FFFFFF'; g.beginPath(); g.ellipse(0, 0, 9, 5, 0, 0, 7); g.fill(); g.restore(); }
  } else if (m === 'scroll') {      // 卷轴：墨点飞溅 + 一条纸带
    g.translate(x, y); g.globalAlpha = 1 - k; for (let i = 0; i < 12; i++) { const R = hash(seed + i * 3.9), an = (d > 0 ? 0 : Math.PI) + (R - 0.5) * 2.8, dd = R0 * (0.15 + 1.4 * e) * (0.5 + R); g.fillStyle = i % 4 ? '#1E2340' : col; g.beginPath(); g.arc(Math.cos(an) * dd, Math.sin(an) * dd, (14 - 9 * k) * (0.5 + R), 0, 7); g.fill(); }
    g.save(); g.scale(d, 1); g.fillStyle = '#FFFDF4'; g.globalAlpha *= 0.9; g.beginPath(); g.moveTo(-R0, -10); g.quadraticCurveTo(0, -40 * (1 - k), R0 * (0.8 + e), -6); g.lineTo(R0 * (0.8 + e), 10); g.quadraticCurveTo(0, -20 * (1 - k), -R0, 12); g.fill(); g.restore();
  }
  g.restore();
  if (q.t >= 5 && q.t < 9) star4(x + d * 30, y - 20, R0 * 0.55 * (1 - (q.t - 5) / 4), 0.4, '#FFFFFF', 0.8);      // 二次闪光
}
// —— 第 33 圈：贴图特效 ——
function texBurst(q, x, y, k) {
  if (q.t >= 10) return; const kk = q.t / 10, L = q.tier === 2 ? 4 : q.lvl || 2, d = q.dir || 1, R = [0, 60, 78, 104, 128][L] * (0.6 + 0.55 * E.out3(Math.min(1, kk * 2))), a = (1 - kk) * (1 - kk), r0 = hash(q.x * 0.13 + q.y) * 6.28, col = q.tier === 2 ? '#FF3355' : q.tier === 1 ? '#FFB21E' : q.col || '#FFE066';
  const n = hash(q.y + q.x) > 0.5 ? 'burst1' : 'burst2'; fxTex(n, x, y, R * 2.0, r0, col, a * 0.75); fxTex(n, x, y, R * 1.1, r0 + 0.3, null, a * 0.55, true);
  if ((q.kind === 'kick' || q.kind === 'heavy') && q.t < 8) fxTex('slash1', x - d * R * 0.3, y, R * 2.6, d > 0 ? -0.35 : 0.35, col, a * 0.8, false, 1, d < 0);
  if (L >= 3) fxTex('ring1', x, y, R * (2.0 + kk * 2.2), r0, col, a * 0.7, false, 0.85); }
// Drive 墨迹（街霸 6 的视觉标识）：绿冲 / 架招 / 精防 / 算力冲击 / 算力反击，主题绿 + 角色色的墨迹泼溅
const INKC = '#2EE07A';
function driveInk(s, f, yb, h, front) {
  if (!IM['x:ink1'] || s.cine) return; const R = s._rfx || (s._rfx = { last: {} }); R.ink = R.ink || []; R.inkSt = R.inkSt || {};
  if (front && R.inkSt[f.idx + 'f'] !== s.f) { R.inkSt[f.idx + 'f'] = s.f; const pv = R.inkSt[f.idx];
    if (f.st !== pv) { const fc = f.face, base = { f: s.f, x: f.x, y: yb, h, fc, own: f.idx, col: f.ch.col2 };
      if (f.st === 'drush') R.ink.push(Object.assign({ n: 'ink1', life: 38, k: 'rush0', r: hash(s.f) }, base));      // 第 40 圈：起手一大团不对称墨
      if (pv === 'drush' && f.st !== 'drush') for (let i = 0; i < 3; i++) R.ink.push(Object.assign({ life: 22 + i * 4, k: 'rushEnd', i, r: hash(s.f + i * 7) }, base));      // 收尾：破碎的小墨点
      if (f.st === 'impact') R.ink.push(Object.assign({ n: 'ink1', life: 52, k: 'imp' }, base), Object.assign({ n: 'ink3', life: 26, k: 'impc' }, base));
      if (f.st === 'drev') R.ink.push(Object.assign({ n: 'ink3', life: 30, k: 'rev' }, base));
      R.inkSt[f.idx] = f.st; }
    if (f.st === 'drush' && !f.skid && (s.f - (R.inkSt[f.idx + 'seg'] || -9)) >= 2) { R.inkSt[f.idx + 'seg'] = s.f; const n = f.t || 0; R.ink.push({ k: 'rushSeg', f: s.f, life: 20, x: f.x, y: yb, h, fc: f.face, own: f.idx, col: f.ch.col2, w: Math.max(0.35, 1 - n * 0.045), r: hash(s.f * 1.7 + f.idx) }); }      // 途中：沿轨迹一段一段留在原地、越往后越窄
    if (f.pp != null && s.f - f.pp <= 8 && R.inkSt[f.idx + 'pp'] !== f.pp) { R.inkSt[f.idx + 'pp'] = f.pp; R.ink.push({ n: 'ink1', life: 34, k: 'pp', f: s.f, x: f.x, y: yb, h, fc: f.face, own: f.idx, col: f.ch.col2 }); }
    if (f.st === 'impact') { const sp = s.fx.find(q => q.k === 'spark' && q.who === f.idx && q.t <= 4 && !q._ih); if (sp) { sp._ih = 1; R.ink.push({ k: 'imphit', f: s.f, life: 34, x: sp.x, y: yb, sy: sp.y, h, fc: f.face, own: f.idx }); } }      // 第 56 圈：打中那一下才在接触处压墨团 + 沿受击方向甩飞溅
    R.ink = R.ink.filter(q => s.f - q.f < q.life); }
  for (const q of R.ink) { if (q.own !== f.idx) continue; const k = (s.f - q.f) / q.life, a = Math.min(1, (1 - k) * 2.2), gr = E.out3(Math.min(1, k * 2.5));
    if (!front && q.k === 'rush0') { fxTex('ink1', q.x - q.fc * h * 0.25, q.y - h * 0.4, h * (0.9 + 0.7 * gr), (q.r - 0.5) * 0.6 - 0.15 * q.fc, INKC, a * 0.9, false, 1.1, q.fc < 0); fxTex('ink3', q.x - q.fc * h * 0.45, q.y - h * 0.2, h * (0.4 + 0.5 * gr), q.r * 3, q.col, a * 0.55, false); }
    if (!front && q.k === 'rushSeg') { const sq = 1 - k * 0.6; fxTex('ink2', q.x - q.fc * h * 0.2, q.y - h * (0.3 + (q.r - 0.5) * 0.12), h * 0.75 * q.w * (0.8 + 0.4 * gr), (q.r - 0.5) * 0.12, INKC, a * 0.7, false, 0.55 * sq, q.fc < 0); }
    if (!front && q.k === 'rushEnd') { const dx = (q.i - 1) * h * 0.22 + (q.r - 0.5) * h * 0.2, dy = -h * (0.15 + q.r * 0.4) - k * h * 0.1; fxTex('ink3', q.x - q.fc * h * 0.1 + dx, q.y + dy, h * (0.18 + 0.3 * gr) * (1 + q.r * 0.5), q.r * 6 + k, INKC, a * 0.7, false); }
    if (false && q.k === 'rush') { fxTex('ink2', f.x - q.fc * h * 0.35, yb - h * 0.42, h * (1.1 + 0.6 * gr), 0, INKC, a * 0.9, false, 0.9, q.fc < 0); fxTex('ink2', f.x - q.fc * h * 0.6, yb - h * 0.12, h * (0.8 + 0.5 * gr), 0.05 * q.fc, q.col, a * 0.6, false, 0.7, q.fc < 0); }
    if (q.k === 'imp' && IM['x:q_inkband']) { const x0 = q.x - q.fc * h * 0.7, x1 = f.x + q.fc * h * 0.35, L = Math.abs(x1 - x0) + h * 0.9, cx = (x0 + x1) / 2;      // 第 56 圈：一条随身体前冲的主墨带（后肩拖出 → 拳肩处压成墨团 → 沿受击方向甩尖长飞溅）
      if (!front) { seqTex('q_inkband', Math.min(7, 0.5 + k * 9), cx, yb - h * 0.58, L * 1.05, 0.06 * q.fc, Math.min(1, a * 1.4) * 0.88, false, INKC, q.fc < 0, 0.72); seqTex('q_inkband', Math.min(7, 1 + k * 9), cx - q.fc * h * 0.1, yb - h * 0.5, L * 0.8, -0.05 * q.fc, a * 0.5, false, '#FFE066', q.fc < 0, 0.22); }
      continue; }
    if (q.k === 'imphit' && IM['x:q_inkhit']) { const fy = STAGES[s.stage].floor - q.sy; if (!front) seqTex('q_inkband', Math.min(7, 3 + k * 5), q.x + q.fc * h * 0.55, fy, h * 2.2, -0.04 * q.fc, a * 0.75, false, INKC, q.fc < 0, 0.6); else { seqTex('q_inkhit', Math.min(7, 1 + k * 7.5), q.x + q.fc * h * 0.5, fy, h * 1.55, 0, a * 0.8, false, INKC, q.fc < 0, 0.8); seqTex('q_inkhit', Math.min(7, 2 + k * 6), q.x + q.fc * h * 0.3, fy + h * 0.06, h * 1.1, 0.25 * q.fc, a * 0.7, false, '#FFE066', q.fc < 0, 0.6); } continue; }
    if (!front && q.k === 'imp' && IM['x:q_ink']) { seqTex('q_ink', Math.min(7, k * 9), q.x - q.fc * h * 0.15, yb - h * 0.6, h * (2.6 + 1.2 * gr), -0.12 * q.fc, Math.min(1, a * 1.3) * 0.72, false, INKC, q.fc < 0, 0.72); seqTex('q_ink', Math.min(7, 1 + k * 8), q.x - q.fc * h * 0.8, yb - h * 0.25, h * (1.6 + 0.8 * gr), 2.4, a * 0.6, false, '#FFE066', q.fc > 0); }      // 第 54 圈：算力冲击墨迹铺到半屏（街霸 6 的 Drive Impact）
    if (!front && q.k === 'imp') fxTex('ink1', q.x - q.fc * h * 0.1, yb - h * 0.5, h * (1.0 + 0.9 * gr), -0.2 * q.fc, INKC, a * 0.85, false, 1, q.fc < 0);
    if (front && q.k === 'impc' && !IM['x:q_inkhit']) fxTex('ink3', q.x + q.fc * h * 0.42, yb - h * 0.52, h * (0.2 + 0.45 * gr), k * 2, INKC, a * 0.55, false);
    if (!front && q.k === 'rev') fxTex('ink3', q.x, yb - h * 0.5, h * (0.6 + 1.0 * gr), k * 1.5, INKC, a * 0.8);
    if (!front && q.k === 'pp') fxTex('ink1', q.x - q.fc * h * 0.3, yb - h * 0.45, h * (0.6 + 0.7 * gr), -0.3 * q.fc, INKC, a * 0.75, false, 1, q.fc < 0);
    if (front && q.k === 'pp' && k < 0.5) fxTex('burst2', q.x + q.fc * h * 0.4, yb - h * 0.55, h * (0.25 + 0.3 * gr), k, '#FFFFFF', a * 0.8, true); }
  if (!front && f.st === 'parry') fxTex('ink3', f.x, yb - h * 0.48, h * (1.05 + Math.sin(s.f * 0.3) * 0.03), s.f * 0.02, INKC, 0.32, false);      // 架招中：身后一圈淡淡的墨环
}
// —— 第 30 圈：打击感细节（对标街霸 6 的 Counter / Punish Counter / Wall Bounce / Ground Bounce）——
function tierBurst(q, x, y, k) {
  const pc = q.tier === 2, d = q.dir || 1, R = (pc ? 260 : 190) * E.out3(Math.min(1, k * 1.4)), c1 = pc ? '#FF2D4A' : '#FFB21E', c2 = pc ? '#FFFFFF' : '#FFF3B0';
  g.save(); g.globalCompositeOperation = 'lighter';
  if (q.t < 3) { g.fillStyle = rg(x, y, 0, R * 1.2, [rgba(c2, 0.9), rgba(c1, 0.55), rgba(c1, 0)]); g.beginPath(); g.arc(x, y, R * 1.2, 0, 7); g.fill(); }
  g.restore(); g.save(); g.lineCap = 'round';
  const n = pc ? 14 : 10; for (let i = 0; i < n; i++) { const an = i / n * 6.283 + hash(i + q.x) * 0.4 + (d < 0 ? Math.PI : 0) * 0, L0 = R * (0.35 + 0.2 * hash(i * 3 + q.y)), L1 = R * (0.9 + 0.5 * hash(i * 7 + q.x)) * (Math.abs(Math.cos(an)) * 0.5 + 0.7);
    g.strokeStyle = rgba(i % 3 ? c1 : c2, 1 - k); g.lineWidth = (pc ? 12 : 8) * (1 - k) + 1; g.beginPath(); g.moveTo(x + Math.cos(an) * L0, y + Math.sin(an) * L0 * 0.8); g.lineTo(x + Math.cos(an) * L1, y + Math.sin(an) * L1 * 0.8); g.stroke(); }
  g.strokeStyle = rgba(c1, (1 - k) * 0.9); g.lineWidth = (pc ? 16 : 10) * (1 - k) + 1; g.beginPath(); g.ellipse(x, y, R * 1.05, R * 0.82, 0, 0, 7); g.stroke();
  g.restore(); }
function ctrText(q, x, y, k) {      // 「COUNTER」「PUNISH COUNTER」：斜体横幅从侧面甩进来，停一下再淡出
  const pc = q.tier === 2, inK = E.out5(Math.min(1, q.t / 5)), a = Math.min(1, (1 - k) * 3), sz = pc ? 54 : 44, w = mw(q.s, sz, 900, F.en) + 70, yy = y - 40;
  const dx = (q.who === 1 ? 1 : -1) * (1 - inK) * 260; g.save(); g.globalAlpha *= a; g.translate(x + dx, yy); g.transform(1, 0, -0.22, 1, 0, 0); g.scale(1 + (1 - inK) * 0.5, 1 + (1 - inK) * 0.5);
  g.fillStyle = pc ? '#C8102E' : '#FFB21E'; g.fillRect(-w / 2, -sz * 0.95, w, sz * 1.25); g.fillStyle = pc ? '#120814' : '#7A3A00'; g.fillRect(-w / 2, sz * 0.3, w, 8); g.fillStyle = '#FFFFFF'; g.fillRect(-w / 2 - 14, -sz * 0.95, 8, sz * 1.25);
  g.restore(); txt(q.s, x + dx, yy + 4, { size: sz, w: 900, fam: F.en, fill: pc ? '#FFFFFF' : '#2A1200', stroke: pc ? '#120814' : '#FFF3B0', sw: 6, align: 'center', a, rot: 0, ls: 2 }); }
function wallHitFx(q, x, y, k, FL) {      // 撞墙：墙面上一圈放射裂纹 + 碎屑 + 冲击环
  const sd = q.side || -1, wx = x + sd * 30, R = 220 * E.out3(Math.min(1, k * 2));
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; for (let i = 0; i < 11; i++) { const an = i / 11 * 6.283 + hash(i + 2.7) * 0.4, L = 90 + hash(i + 5.1) * 190;
    for (const [col, lw] of [['#2A2F45', 7], ['#FFFFFF', 2.5]]) { g.strokeStyle = rgba(col, (1 - k) * 0.95); g.lineWidth = lw * (1 - k * 0.6); g.beginPath(); g.moveTo(wx, y);
      for (let j = 1; j <= 4; j++) { const q2 = j / 4, jit = (hash(i * 9 + j) - 0.5) * 30; g.lineTo(wx - sd * Math.abs(Math.cos(an)) * L * q2 * 0.22 + jit * 0.3, y + Math.sin(an) * L * q2 + jit); } g.stroke(); } }
  g.strokeStyle = rgba('#FFFFFF', 1 - k); g.lineWidth = 12 * (1 - k) + 1; g.beginPath(); g.ellipse(wx, y, R * 0.25, R, 0, 0, 7); g.stroke();
  for (let i = 0; i < 12; i++) { const an = (hash(i * 1.7) - 0.5) * 2.4, sp = 120 + hash(i) * 260, px = wx - sd * Math.cos(an) * sp * k, py = y + Math.sin(an) * sp * k + 300 * k * k; g.fillStyle = rgba(i % 2 ? '#C9CFDF' : '#6B7290', 1 - k); g.fillRect(px - 6, py - 6, 12, 12); }
  g.restore(); }
function gBounceFx(q, x, FL, k) {      // 地面反弹：贴地的冲击环 + 竖起来的尘浪
  const R = 260 * E.out3(k); g.save(); g.strokeStyle = rgba('#FFFFFF', (1 - k) * 0.95); g.lineWidth = 14 * (1 - k) + 1; g.beginPath(); g.ellipse(x, FL, R, R * 0.16, 0, 0, 7); g.stroke();
  g.strokeStyle = rgba('#FFE066', (1 - k) * 0.7); g.lineWidth = 6; g.beginPath(); g.ellipse(x, FL, R * 0.7, R * 0.11, 0, 0, 7); g.stroke();
  for (let i = 0; i < 9; i++) { const xx = x + (i - 4) * 46, hh = (60 + hash(i + 4) * 90) * Math.sin(Math.min(1, k * 2) * Math.PI); g.fillStyle = rgba('#D8DCEA', 0.5 * (1 - k)); g.beginPath(); g.ellipse(xx, FL - hh * 0.5, 22, hh * 0.5 + 1, 0, 0, 7); g.fill(); }
  g.restore(); drawCrack({ lvl: 3, x, dir: 1 }, x, FL, k); }
function drawCrack(q, x, FL, k) {      // 重击：地面裂纹 + 尘环
  const a = 1 - k, n = q.lvl >= 3 ? 7 : 5, seed = q.x * 0.13 + q.life; g.save(); g.globalAlpha = a * 0.85; g.strokeStyle = 'rgba(20,16,30,0.9)'; g.lineWidth = 4; g.lineCap = 'round';
  for (let i = 0; i < n; i++) { const R = hash(seed + i), dir = i % 2 ? 1 : -1, L = (80 + R * 160) * E.out3(Math.min(1, q.t / 4)); g.beginPath(); g.moveTo(x, FL + 2); let px = x, py = FL + 2; for (let j = 1; j <= 3; j++) { px += dir * L / 3; py += (hash(seed + i * 7 + j) - 0.3) * 10; g.lineTo(px, py); } g.stroke(); }
  g.restore();      /* 第 36 圈：去掉地上的尘环描边（像调试标记），尘土交给落地烟 */
}
function drawSpark(q, x, y, k) {
  const L = q.lvl, d = q.dir || 1, col = q.col || '#FFE066', R0 = q.kind === 'heavy' ? 118 : L >= 2 ? 104 : 80; g.save(); g.lineCap = 'round';
  if (q.kind === 'punch') {
    if (q.t < 4) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg(x, y, 0, R0 * 0.42, ['rgba(255,255,255,' + (1 - q.t / 4) + ')', rgba(col, 0.6 * (1 - q.t / 4)), rgba(col, 0)]); g.beginPath(); g.arc(x, y, R0 * 0.42, 0, 7); g.fill(); g.restore(); star4(x, y, R0 * (0.95 - q.t * 0.18), 0, '#FFFFFF', 0.95 - q.t * 0.22); }      /* 第 36 圈：去掉靶心双环，只留接触点上短促的亮核 + 一个小星芒 */
    for (let i = 0; i < 6; i++) { const R = hash(q.x * 0.31 + i * 5.1 + q.life), an = (d > 0 ? 0 : Math.PI) + (R - 0.5) * 1.6, r0 = R0 * (0.4 + 1.2 * E.out3(k)), len = R0 * 0.45 * (1 - k); g.strokeStyle = rgba(i % 2 ? col : '#FFFFFF', 1 - k); g.lineWidth = 5 * (1 - k) + 1; g.beginPath(); g.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0); g.lineTo(x + Math.cos(an) * (r0 + len), y + Math.sin(an) * (r0 + len)); g.stroke(); }
  } else if (q.kind === 'kick') {
    g.translate(x, y); g.scale(d, 1); g.rotate(-0.5); const r = R0 * (0.7 + 0.5 * E.out3(k)); g.globalAlpha = 1 - k;
    g.fillStyle = lg(-r, 0, r, 0, ['rgba(255,255,255,0)', rgba(col, 0.9), '#FFFFFF']); g.beginPath(); g.arc(-r * 0.3, 0, r, -1.1, 1.1); g.arc(-r * 0.55, 0, r * 0.82, 1.0, -1.0, true); g.closePath(); g.fill();
    if (q.t < 4) star4(r * 0.55, 0, R0 * 0.9, 0.3, '#FFFFFF', 0.9 - q.t * 0.2);
    for (let i = 0; i < 9; i++) { const R = hash(q.x * 0.21 + i * 4.3 + q.life), an = (R - 0.5) * 2.2, dd = R0 * (0.3 + 1.6 * E.out3(k)) * (0.6 + R * 0.6); g.fillStyle = i % 3 ? col : '#FFFFFF'; g.beginPath(); g.arc(Math.cos(an) * dd + r * 0.3, Math.sin(an) * dd + k * k * 60, (7 - 4 * k) * (0.6 + R), 0, 7); g.fill(); }
  } else {
    if (q.t < 7) { const a = 1 - q.t / 7; star4(x, y, R0 * (1.5 - q.t * 0.15), 0, '#FFFFFF', a); star4(x, y, R0 * 1.0, 0.785, col, a * 0.85); g.globalAlpha = a * 0.8; g.fillStyle = '#FFFFFF'; g.fillRect(x - R0 * 1.7, y - 4, R0 * 3.4, 8); g.fillRect(x - 4, y - R0 * 1.3, 8, R0 * 2.6); g.globalAlpha = 1; }
    burst(x, y, R0 * E.out3(k), 10, q.t * 0.2, '#fff', 1 - k); burst(x, y, R0 * 0.72 * E.out3(k), 10, q.t * 0.2 + 0.3, col, (1 - k) * 0.9);
    if (q.t < 6) { g.strokeStyle = rgba('#FFFFFF', (1 - q.t / 6) * 0.7); g.lineWidth = 8 * (1 - k) + 2; g.beginPath(); g.ellipse(x, y, R0 * (0.4 + 1.1 * E.out3(k)), R0 * (0.4 + 1.1 * E.out3(k)) * 0.75, 0, 0, 7); g.stroke(); }      // 第 36 圈：冲击环只闪 6 步，去掉尘环
  }
  g.restore();
}
// —— 三级超必杀演出（MOVES_PLAN_4 第 2 节）：全部在引擎里演。程序背景 + 活镜头 + 3 镜头 × 4 帧透明底动作帧 + 冲击帧 + 逐字砸字 + 落版定格 ——
// 时间表（步）：命中定格 0–12 → 撕开转场 12–22 → 镜头 A 起势 22–72 → 镜头 B 连打 72–182（9 下）→ 镜头 C 终结 182–242 → 落版 242–282 → 撕回 282–300
const CINE_TXT = { ds: { name: '运营部加班通知', line: '先吃饭，吃完再改。', ko: '下班！' }, gem: { name: '九连爪', line: '饭归我啦。', ko: '开饭喵' },
  claude: { name: '你刚刚说什么', line: '我再确认一下，你刚刚说什么？', ko: '已读不回' }, gpt: { name: '作为一个AI语言模型', line: '以下内容仅供参考。', ko: '回答完毕' },
  grok: { name: '全网公开处刑', line: '这条我记下了。', ko: '已挂' }, qwen: { name: '双十一零点', line: '付定金了吗？', ko: '已签收' },
  kimi: { name: '一口气读完', line: '两百万字，读完了。', ko: '已读完' }, glm: { name: '满分答卷', line: '格式不对，零分。', ko: '零分' }, dou: { name: '全家福', line: '来，大家看镜头！', ko: '咔嚓' },
  surf: { name: '全网爆款', line: '这波浪，全网都看见了！', ko: '已上热搜' }, nin: { name: '强制下线', line: '你的连接……已被重置。', ko: '已下线' } };
const CINE_LEN = 300, CB = { A: 22, B: 72, C: 182, E: 242, R: 282 }, CHITS = 9, CHIT0 = 76, CHITD = 12;
const bodyOnR = f => !['down', 'getup', 'ko', 'launch'].includes(f.st);
const cineHitT = i => CHIT0 + i * CHITD;
const CINE_CLOSE = { ds: [1, 1, 1, 1], gem: [1, 1, 0, 0], claude: [1, 1, 0, 0], gpt: [1, 1, 0, 0], grok: [1, 1, 0, 0], qwen: [1, 1, 0, 0], kimi: [1, 1, 0, 0], glm: [1, 1, 0, 0], dou: [1, 1, 0, 0], surf: [1, 0, 0, 0], nin: [1, 0, 0, 0] };      // 镜头 A 里哪几帧是半身大特写
function cineFrame(a, shot, i) {      // 专用帧 f_<角色>_c<镜头><1-4>；没有就借现有逐帧
  const F = k => fp(a, k), own = F('c' + shot + (i + 1)); if (own) return own;
  const alt = { A: ['windup', 'stance', 'chamber', 'jab3'], B: ['jab3', 'kick3', 'upper3', 'heavy3'], C: ['crouch', 'windup', 'upper3', 'win'] }[shot][i];
  return F(alt) || F(alt.replace(/\d$/, '')) || F('stance') || a.ch.spr.idle;
}
const mixh = (a, b, k) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), c = sh => Math.round(lerp(A >> sh & 255, B >> sh & 255, k)).toString(16).padStart(2, '0'); return '#' + c(16) + c(8) + c(0); };
// 每个人的小物件（背景视差层用）和命中碎片的样子
function cineProp(id, i, t, col) {
  const k = i % 2;
  if (id === 'ds') { if (k) { g.fillStyle = '#FFE98A'; g.fillRect(-46, -46, 92, 92); g.fillStyle = 'rgba(80,60,0,0.4)'; for (let j = 0; j < 3; j++) g.fillRect(-32, -24 + j * 20, 64 - j * 14, 6); } else coin(0, 0, 40, t * 0.05 + i, 1); }
  else if (id === 'gem') { g.fillStyle = col; if (k) { g.beginPath(); g.ellipse(0, 10, 30, 24, 0, 0, 7); g.fill(); for (let j = 0; j < 4; j++) { g.beginPath(); g.ellipse(-30 + j * 20, -26 - (j % 3 ? 8 : 0), 11, 13, 0, 0, 7); g.fill(); } } else { g.strokeStyle = col; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 38, 0, 7); g.stroke(); for (let j = -2; j <= 2; j++) { g.beginPath(); g.ellipse(0, 0, 38, 14, j * 0.6, 0, 7); g.stroke(); } } }
  else if (id === 'claude' || id === 'kimi' || id === 'glm') { g.fillStyle = '#FFFDF4'; g.fillRect(-36, -48, 72, 96); g.fillStyle = id === 'glm' ? 'rgba(200,30,40,0.7)' : 'rgba(80,60,40,0.35)'; for (let j = 0; j < 5; j++) g.fillRect(-26, -36 + j * 16, 52 - (j % 2) * 16, 5); if (id === 'glm' && k) { g.strokeStyle = '#D0202E'; g.lineWidth = 7; g.beginPath(); g.moveTo(-20, 0); g.lineTo(-4, 18); g.lineTo(26, -22); g.stroke(); } if (id === 'kimi' && k) { g.fillStyle = '#FFE9A8'; g.beginPath(); g.arc(0, 0, 30, 0.6, 5.7); g.arc(12, -4, 24, 5.4, 0.9, true); g.fill(); } }
  else if (id === 'gpt') { g.font = '900 54px Outfit, sans-serif'; g.fillStyle = col; g.textAlign = 'center'; g.fillText(['1.', '2.', '3.', '∑', '{ }'][i % 5], 0, 18); }
  else if (id === 'grok') { g.fillStyle = '#3A2A20'; g.beginPath(); g.moveTo(-40, 20); g.lineTo(-10, -36); g.lineTo(36, -10); g.lineTo(28, 30); g.closePath(); g.fill(); g.fillStyle = '#E0475B'; g.font = '900 34px sans-serif'; g.textAlign = 'center'; if (k) g.fillText('!', 0, 12); }
  else if (id === 'qwen') { if (k) { g.fillStyle = '#C9925A'; g.fillRect(-40, -34, 80, 68); g.fillStyle = '#8A5A2A'; g.fillRect(-40, -6, 80, 10); g.fillRect(-5, -34, 10, 68); } else { g.fillStyle = '#FFE9C4'; g.beginPath(); g.moveTo(0, 30); g.arc(0, 30, 60, -2.4, -0.7); g.closePath(); g.fill(); } }
  else if (id === 'dou') { if (k) { g.fillStyle = '#FF7AA8'; g.beginPath(); g.moveTo(0, 30); g.bezierCurveTo(-50, -10, -20, -50, 0, -20); g.bezierCurveTo(20, -50, 50, -10, 0, 30); g.fill(); } else { g.fillStyle = '#FFD84D'; g.beginPath(); g.arc(0, 0, 32, 0, 7); g.fill(); g.fillStyle = INK; g.beginPath(); g.arc(-10, -6, 5, 0, 7); g.arc(10, -6, 5, 0, 7); g.fill(); } }
  else star4(0, 0, 34, 0, col, 1);
}
const _cineBase = {};
function cineBase(ch) {      // 演出底色：竖向渐变 + 主光源，按角色缓存成半分辨率小图（覆盖 2880×2160，光源在正中）
  if (_cineBase[ch.id]) return _cineBase[ch.id]; const c = document.createElement('canvas'); c.width = 1440; c.height = 1080; const x = c.getContext('2d'); x.scale(0.5, 0.5);
  const gr = x.createLinearGradient(0, 500, 0, 1580); [mixc(ch.ink, '#000000', 0.55), ch.ink, mixc(ch.col, ch.ink, 0.4)].forEach((cc, i) => gr.addColorStop(i / 2, cc)); x.fillStyle = gr; x.fillRect(0, 0, 2880, 2160);
  const r = x.createRadialGradient(1440, 1080, 0, 1440, 1080, 900); [rgba(ch.col2, 0.55), rgba(ch.col, 0.22), 'rgba(0,0,0,0)'].forEach((cc, i) => r.addColorStop(i / 2, cc)); x.globalCompositeOperation = 'lighter'; x.fillStyle = r; x.fillRect(0, 0, 2880, 2160);
  return (_cineBase[ch.id] = c);
}
let _vig = null;
function vigOf() { if (_vig) return _vig; const c = document.createElement('canvas'); c.width = 480; c.height = 270; const x = c.getContext('2d'); x.scale(0.25, 0.25); const r = x.createRadialGradient(960, 540, 420, 960, 540, 1150); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,0.62)'); x.fillStyle = r; x.fillRect(0, 0, W, H); return (_vig = c); }
const _glow = {};
function glowOf(name, col) {      // 发光：1/6 大小的纯色剪影，放大画出来就是一圈柔光（代替很慢的 shadowBlur）
  const k = name + col; if (_glow[k]) return _glow[k]; const im = IM['s:' + name]; if (!im) return null; const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width / 6)); c.height = Math.max(1, Math.round(im.height / 6)); const x = c.getContext('2d');
  x.drawImage(im, 0, 0, c.width, c.height); const d = x.getImageData(0, 0, c.width, c.height), p = d.data; for (let i = 3; i < p.length; i += 4) p[i] = p[i] > 60 ? 255 : 0; x.putImageData(d, 0, 0);      // 只认实心部分（webp 边上的半透明噪点会糊成一个方框）
  const c2 = document.createElement('canvas'); c2.width = c.width + 16; c2.height = c.height + 16; const y = c2.getContext('2d'); y.filter = 'blur(4px)'; y.drawImage(c, 8, 8); y.filter = 'none'; y.globalCompositeOperation = 'source-in'; y.fillStyle = col; y.fillRect(0, 0, c2.width, c2.height); c2.m = 8; return (_glow[k] = c2);
}
function sprGlow(name, x, y, h, flip, col, a) {      // 和 spr 同样的摆放，画放大 12% 的柔光
  const gl = glowOf(name, col), m = META.spr[name]; if (!gl || !m) return; const s = h / m.h, pad = m.pad * s, w = m.w * s, ax = m.ax ?? 0.5, e = 1.12;
  g.save(); g.translate(x, y - h * 0.5); g.scale((flip ? -1 : 1) * e, e); g.translate(0, h * 0.5); g.globalAlpha *= a; g.globalCompositeOperation = 'lighter'; const sc = (w + 2 * pad) / (gl.width - 2 * gl.m), mg = gl.m * sc; g.drawImage(gl, -w * ax - pad - mg, -h - pad - mg, gl.width * sc, gl.height * sc); g.drawImage(gl, -w * ax - pad - mg, -h - pad - mg, gl.width * sc, gl.height * sc); g.restore();
}
function cineBG(a, t, cam, mood) {      // 背景（画面空间，按镜头位置做视差）：远景暗剪影 + 光源 + 光束 + 中景小物件 + 近景虚化暗块 + 暗角；mood：0 普通、1 蓄力（几乎全黑）、2 终结一击后（高调亮底）
  const ch = a.ch, id = a.id, px = (cam.fx - 960) * (cam.zoom || 1), hz = cam.hz ?? 700;
  if (mood === 2) { g.fillStyle = lg(0, 0, 0, H, ['#FFFFFF', ch.col2, '#FFFFFF']); g.fillRect(0, 0, W, H); speedLines(t / 60, 960, 540, { n: 70, r0: 300, a: 0.55, col: ch.ink, fps: 30, seed: 7 }); return; }
  const lx = 960 - px * 0.15, ly = hz - 120; g.drawImage(cineBase(ch), lx - 1440, ly - 1080, 2880, 2160);      // 底色渐变 + 主光源（半分辨率缓存）
  g.save(); g.globalAlpha = 0.14; g.translate(lx, ly); g.rotate(t * 0.003); g.fillStyle = ch.col2; for (let i = 0; i < 14; i++) { g.rotate(Math.PI / 7); g.beginPath(); g.moveTo(0, 0); g.lineTo(2600, -150); g.lineTo(2600, 150); g.closePath(); g.fill(); } g.restore();      // 光束
  for (let i = 0; i < 12; i++) {      // 远景：高低不一的暗色剪影，慢慢往后退
    const R = hash(i * 3.7 + 1), w0 = 120 + R * 220, h0 = 260 + hash(i * 9.1) * 520, x = ((i * 240 - px * 0.25 - t * 1.2 * (cam.dir || 1)) % 2880 + 2880) % 2880 - 480;
    g.fillStyle = rgba(mixh(ch.ink, '#000000', 0.5), 0.85); g.fillRect(x, hz + 60 - h0, w0, h0 + 400);
    g.fillStyle = rgba(ch.col2, 0.25); for (let j = 0; j < 6; j++) if (hash(i * 13 + j) > 0.45) g.fillRect(x + 16 + (j % 2) * (w0 * 0.5), hz + 90 - h0 + Math.floor(j / 2) * 70, w0 * 0.22, 26);
  }
  g.save(); g.fillStyle = lg(0, hz - 200, 0, hz + 80, ['rgba(0,0,0,0)', rgba(ch.col, 0.35)]); g.fillRect(0, hz - 200, W, 280); g.restore();      // 地平线的雾
  for (let i = 0; i < 10; i++) {      // 中景：角色的小物件
    const R = hash(i * 7.3), x = ((R * 2400 - px * 0.6 - t * 6 * (cam.dir || 1)) % 2400 + 2400) % 2400 - 240, y = 140 + hash(i * 3.1) * 640 + Math.sin(t * 0.05 + i) * 20;
    g.save(); g.globalAlpha = 0.5; g.translate(x, y); g.rotate(Math.sin(t * 0.03 + i) * 0.5); g.scale(0.9, 0.9); cineProp(id, i, t, ch.col2); g.restore();
  }
  if (mood === 1) { g.save(); g.fillStyle = 'rgba(2,3,10,0.88)'; g.fillRect(0, 0, W, H); g.restore(); }
}
function cineFG(a, t, cam) {      // 近景：大块虚化暗影快速扫过 + 暗角（拉出纵深）
  const px = (cam.fx - 960) * (cam.zoom || 1);
  for (let i = 0; i < 3; i++) { const x = ((i * 900 - px * 1.6 - t * 22 * (cam.dir || 1)) % 2700 + 2700) % 2700 - 450, y = i % 2 ? 1000 : 120; g.save(); g.fillStyle = rg(x, y, 0, 320, ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']); g.fillRect(x - 330, y - 330, 660, 660); g.restore(); }
  g.drawImage(vigOf(), 0, 0, W, H);
}
function cineFloor(a, cam) {      // 透视地面（世界坐标，跟着镜头）
  const ch = a.ch, hz = cam.hz ?? 700; g.save(); g.globalAlpha = 0.32; g.strokeStyle = ch.col2; g.lineWidth = 3;
  for (let i = -16; i <= 16; i++) { g.beginPath(); g.moveTo(cam.fx + i * 50, hz); g.lineTo(cam.fx + i * 520, 1400); g.stroke(); }
  for (let k = 0; k < 8; k++) { const y = hz + Math.pow(k / 8, 2) * (1400 - hz); g.beginPath(); g.moveTo(cam.fx - 2000, y); g.lineTo(cam.fx + 2000, y); g.stroke(); } g.restore();
}
function cineCam(cam, fn) { g.save(); g.translate(960 + (cam.sx || 0), 540 + (cam.sy || 0)); g.rotate(cam.tilt || 0); g.scale(cam.zoom || 1, cam.zoom || 1); g.translate(-cam.fx, -cam.fy); fn(); g.restore(); }
function tearMask(k, dir) {      // 一道斜着的笔触把画面撕开（剪裁路径）
  g.beginPath(); const x0 = dir > 0 ? -400 : W + 400, x1 = x0 + dir * (W + 800) * k, jag = i => Math.sin(i * 12.9) * 40;
  g.moveTo(x0, -200); for (let i = 0; i <= 12; i++) { const y = -200 + i * 125; g.lineTo(x1 - dir * i * 60 + jag(i), y); } g.lineTo(x0, H + 200); g.closePath();
}
// 命中碎片（世界坐标）：每人不同
function cineHitFx(id, ch, hx, hy, k, n) {
  for (let i = 0; i < 9; i++) { const R = hash(n * 13 + i), an = R * 7, r = 60 + E.out3(k) * (200 + R * 180); g.save(); g.globalAlpha = 1 - k; g.translate(hx + Math.cos(an) * r, hy + Math.sin(an) * r); g.rotate(an + k * 4);
    if (id === 'ds') { g.fillStyle = '#FFFFFF'; g.beginPath(); g.ellipse(0, 0, 10, 6, 0, 0, 7); g.fill(); }
    else if (id === 'claude' || id === 'kimi') { g.fillStyle = '#FFFDF4'; g.fillRect(-14, -18, 28, 36); }
    else if (id === 'grok') { g.fillStyle = '#5A3A2A'; g.fillRect(-10, -10, 20, 16); }
    else if (id === 'dou') { g.fillStyle = i % 2 ? '#FF7AA8' : '#FFD84D'; star4(0, 0, 18, 0, g.fillStyle, 1); }
    else if (id === 'surf') { g.fillStyle = i % 3 ? '#9FF3FF' : '#FFFFFF'; g.beginPath(); g.arc(0, 0, 9 + R * 9, 0, 7); g.fill(); }      // 第 67 圈：客串 水花
    else if (id === 'nin') { g.fillStyle = i % 2 ? '#2EC8F0' : '#B9F3FF'; g.fillRect(-9, -9, 18, 18); }      // 像素块
    else { g.fillStyle = ch.col2; g.beginPath(); g.ellipse(0, 0, 16, 5, 0, 0, 7); g.fill(); }
    g.restore(); }
  if (id === 'glm' && k < 0.9) { g.save(); g.globalAlpha = 1 - k; g.strokeStyle = '#D0202E'; g.lineWidth = 16; g.lineCap = 'round'; g.translate(hx + (hash(n) - 0.5) * 120, hy + (hash(n + 3) - 0.5) * 160); g.scale(1 + k * 0.3, 1 + k * 0.3); g.beginPath(); g.moveTo(-50, 0); g.lineTo(-14, 40); g.lineTo(60, -50); g.stroke(); g.restore(); }      // GLM：每下钉一个红对勾
}
// 终结一击的专属特效（世界坐标；q：一击后的进度 0→1）
function cineStrikeFx(id, ch, atk, vic, q, dir, t) {
  if (id === 'gpt') { const a = Math.max(0, 1 - q * 1.1); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = lg(0, -140, 0, 140, ['rgba(255,255,255,0)', rgba(ch.col2, a), rgba('#FFFFFF', a), rgba(ch.col2, a), 'rgba(255,255,255,0)']); g.translate(atk.x + dir * 120, atk.y - atk.h * 0.62); g.scale(dir, 1); g.fillRect(0, -150 * (1 + q), 3000, 300 * (1 + q)); g.restore(); }      // 横扫半屏的光束
  else if (id === 'kimi') { const yy = -600 + Math.min(1, q * 4) * (vic.y - 300 + 600); g.save(); g.fillStyle = rg(vic.x, yy, 0, 420, ['#FFF6D0', '#FFE08A', 'rgba(255,224,138,0)']); g.beginPath(); g.arc(vic.x, yy, 420, 0, 7); g.fill(); g.restore(); }      // 满月落下来
  else if (id === 'glm' && q < 0.8) { g.save(); g.translate(vic.x, vic.y - 320); g.rotate(-0.12); g.globalAlpha = Math.min(1, q * 6) * (1 - q * 0.8); g.strokeStyle = '#D0202E'; g.lineWidth = 22; g.beginPath(); g.arc(0, 0, 230, 0, 7); g.stroke(); txt('0分', 0, 70, { size: 200, w: 900, fill: '#D0202E', align: 'center' }); g.restore(); }      // 盖一个大大的「0 分」
  else if (id === 'grok') { g.save(); g.strokeStyle = '#120806'; g.lineWidth = 10; g.globalAlpha = Math.min(1, q * 5); for (let i = 0; i < 7; i++) { const an = (i / 7) * Math.PI - Math.PI, L = 260 + hash(i) * 360; g.beginPath(); g.moveTo(atk.x + dir * 200, atk.y); g.lineTo(atk.x + dir * 200 + Math.cos(an) * L, atk.y + Math.abs(Math.sin(an)) * 40 + 10); g.stroke(); } g.restore(); }      // 地裂
  else if (id === 'qwen') { for (let i = 0; i < 6; i++) { const yy = -400 + Math.min(1, q * 3 + i * 0.05) * (vic.y - 60 + 400) - i * 30; g.save(); g.translate(vic.x + (i - 2.5) * 110, yy); g.rotate((i - 2.5) * 0.2); g.fillStyle = '#C9925A'; g.fillRect(-60, -50, 120, 100); g.fillStyle = '#8A5A2A'; g.fillRect(-60, -8, 120, 14); g.restore(); } }      // 快递箱砸下来
  else if (id === 'claude') { for (let i = 0; i < 30; i++) { const R = hash(i * 5.3), x = atk.x + dir * (100 + q * (600 + R * 900)), y = atk.y - atk.h * 0.6 + (R - 0.5) * 700 * q + Math.sin(t * 0.3 + i) * 30; g.save(); g.globalAlpha = 1 - q * 0.6; g.translate(x, y); g.rotate(t * 0.2 + i); g.fillStyle = '#FFFDF4'; g.fillRect(-30, -40, 60, 80); g.strokeStyle = 'rgba(90,60,30,0.55)'; g.lineWidth = 2.5; g.strokeRect(-30, -40, 60, 80); g.fillStyle = 'rgba(90,60,30,0.35)'; for (let j = 0; j < 4; j++) g.fillRect(-22, -28 + j * 16, 44 - (j % 2) * 14, 4); g.restore(); } }      // 书页风暴
  else if (id === 'dou' && q < 0.3) { g.save(); g.globalAlpha = 1 - q / 0.3; g.fillStyle = '#FFFFFF'; g.fillRect(atk.x - 4000, -4000, 8000, 8000); g.restore(); }      // 闪光灯
  else if (id === 'gem' && q < 0.75) { const k = q / 0.75; g.save(); g.translate(vic.x - dir * 80, vic.y - 280); g.globalAlpha = 1 - k; for (const r of [0.78, -0.78]) { g.save(); g.rotate(r); for (let j = -1; j <= 1; j++) { g.fillStyle = j ? ch.col2 : '#fff'; g.fillRect(-1400, j * 60 - 14 * (1 - k), 2800, 28 * (1 - k) + 6); } g.restore(); } g.restore(); }      // 双爪交叉撕开画面
}
let _ifc = null;
let _rpc = null;
function drawReplay(s, t, fz, wi) {      // 第 56 圈：精彩回放的包装层（drawFight 之后画）。fz>0 = K.O. 那一下定格：整屏黑白高反差 + 四团泼墨 + 竖排红字「<胜者>·胜」
  replayFreeze(s, fz, wi); drawReplayBars(t); }
function replayFreeze(s, fz, wi) {      // 第 64 圈：拆出来，成片 v3 的决胜 K.O. 也用
  if (fz > 0 && fz < 80) { if (!_rpc) { _rpc = document.createElement('canvas'); _rpc.width = 960; _rpc.height = 540; } const x = _rpc.getContext('2d'), k = fz < 66 ? Math.min(1, fz / 4) : Math.max(0, 1 - (fz - 66) / 14);
    x.filter = 'grayscale(1) brightness(1.08) contrast(1.45)'; x.drawImage(g.canvas, 0, 0, 960, 540); x.filter = 'none';
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = k; g.drawImage(_rpc, 0, 0, W, H); g.globalAlpha = 1;
    g.globalAlpha = k; if (fz < 3) { g.globalAlpha = 1 - fz / 3; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    g.globalAlpha = k; const L = wi === 0; [[L ? 1560 : 360, 200, 820, 0.5], [L ? 1680 : 240, 880, 700, 2.2], [L ? 260 : 1660, 140, 560, 3.7]].forEach(([px, py, w, r], i) => seqTex('q_ink', Math.min(4.5, 2 + (fz - i * 2) * 0.3), px, py, w * (0.7 + 0.3 * Math.min(1, Math.max(0, fz - i * 2) / 8)), r, fz > i * 2 ? 0.9 : 0, false, '#0A0A0A', i % 2 === 1));
    const w = s.F[wi]; if (w && IM['x:cal_sheng']) { const x0 = L ? 1660 : 260, qn = Math.min(1, Math.max(0, (fz - 6) / 5)), qs = Math.min(1, Math.max(0, (fz - 12) / 4));      // 第 60 圈：GPT 毛笔字图：上面黑墨名字落款，下面一个大红「胜」
      if (qn > 0) { seqTex('q_ink', 5, x0, 250, 640, L ? 0.2 : -0.2, 0.35 * qn, false, '#050505', !L, 0.4); g.save(); g.translate(x0, 250); g.rotate(L ? -0.05 : 0.05); g.scale(1 + (1 - qn) * 0.4, 1 + (1 - qn) * 0.4); calImg('cal_' + w.id, 0, 0, 150, '#FFFFFF', qn * k, '#0A0808', 460); g.restore(); }
      if (qs > 0) { seqTex('q_ink', 5, x0, 640, 800, L ? -0.3 : 0.3, 0.45 * qs, false, '#050505', L, 0.5); g.save(); g.translate(x0, 620); g.rotate(L ? 0.04 : -0.04); g.scale(1 + (1 - qs) * 0.7, 1 + (1 - qs) * 0.7); calImg('cal_sheng', 0, 0, 500, '#D0122C', qs * k, '#0A0606'); g.restore(); } }
    else { const cs = [...((w && w.ch.name) || '') + '胜'].slice(0, 6), sz = Math.min(180, 760 / cs.length), x0 = L ? 1640 : 280; let yy = 540 - (cs.length - 1) * sz * 0.5;
    cs.forEach((cc, i) => { const q = Math.min(1, Math.max(0, (fz - 6 - i * 3) / 5)); if (q > 0) { const z = sz * (i === cs.length - 1 ? 1.3 : 0.9 + hash(i * 3.7) * 0.1), jr = (hash(i * 7.3) - 0.5) * 0.16; seqTex('q_ink', 5, x0, yy, z * 1.8, jr * 6, 0.5 * q, false, '#050505', i % 2 === 0, 0.55); g.save(); g.translate(x0, yy); g.rotate(jr); g.scale(1 + (1 - q) * 0.6, 1 + (1 - q) * 0.6); g.globalAlpha = q * k; txt(cc, 0, z * 0.36, { size: z, w: 900, fill: '#D0122C', align: 'center', skew: -0.06 }); g.restore(); } yy += sz; }); }
    g.restore(); } }
function drawReplayBars(t) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, W, 84); g.fillRect(0, H - 84, W, 84);      // 上下黑边
  const bl = Math.floor(t * 2) % 2 === 0; g.fillStyle = '#D0122C'; if (bl) { g.beginPath(); g.arc(70, 42, 12, 0, 6.29); g.fill(); }
  txt('REPLAY', 96, 56, { size: 38, w: 900, fill: '#fff', fam: F.en }); txt('本局精彩回放', 300, 56, { size: 30, w: 800, fill: '#DDD' }); txt('Enter 跳过', W - 40, H - 30, { size: 26, w: 700, fill: '#BBB', align: 'right' });
  if (t < 1.4) { const q = Math.min(1, t / 0.3) * Math.min(1, (1.4 - t) / 0.3); g.globalAlpha = q; seqTex('q_ink', 4, 960, 540, 900, 0.3, 0.75 * q, false, '#0A0A0A', false, 0.42); txt('精彩回放', 960, 575, { size: 120, w: 900, fill: '#fff', align: 'center', stroke: '#D0122C', sw: 10 }); }
  g.restore(); }
function inkFreeze(s, u, T, ch, L, fin, atk, cam) {      // u：落版开始后的步数。整屏转黑白高反差，四角泼墨，竖排红色大字（毛笔感：每字微斜、黑色飞白垫底、墨点）
  if (!_ifc) { _ifc = document.createElement('canvas'); _ifc.width = 960; _ifc.height = 540; }
  const k = Math.min(1, u / 5), x = _ifc.getContext('2d'); x.filter = 'none'; x.clearRect(0, 0, 960, 540); x.drawImage(g.canvas, 0, 0, 960, 540);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = k; g.fillStyle = '#EEEBE4'; g.fillRect(0, 0, W, H); const pg = g.createRadialGradient(960, 540, 200, 960, 540, 1150); pg.addColorStop(0, 'rgba(255,255,255,0)'); pg.addColorStop(1, 'rgba(60,55,50,0.45)'); g.fillStyle = pg; g.fillRect(0, 0, W, H); g.restore();      // 宣纸底 + 暗角
  if (atk && atk.name && META.spr[atk.name]) { g.save(); g.globalAlpha = k; g.filter = 'grayscale(1) contrast(1.7) brightness(0.95)'; const zx = L ? 760 : 1160; seqTex('q_ink', 4, zx + (L ? 120 : -120), 560, 1400, L ? -0.5 : 0.5, 0.55 * k, false, '#0A0A0A', !L, 0.38); const hh = Math.min(1240, atk.h * 1.4); spr(atk.name, zx, 70 + hh, hh, { flip: !L }); g.filter = 'none'; g.restore(); }      // 人物转黑白高反差
  if (u < 3) { g.save(); g.globalAlpha = 1 - u / 3; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.restore(); }
  const sp = [[L ? 1500 : 420, 260, 900, 0.4], [L ? 1700 : 220, 820, 760, 2.1], [L ? 300 : 1620, 120, 620, 3.6], [L ? 160 : 1760, 900, 700, 5.0]];      // 四团泼墨，从角落长出来
  sp.forEach(([px, py, w, r], i) => seqTex('q_ink', Math.min(4.5, 2 + (u - i * 2) * 0.3), px, py, w * (0.7 + 0.3 * Math.min(1, Math.max(0, u - i * 2) / 8)), r, u > i * 2 ? 0.92 : 0, false, '#0A0A0A', i % 2 === 1));
  const cs = [...T.name].slice(0, 8), sz = Math.min(190, 860 / cs.length), x0 = L ? 1660 : 260, SZ = cs.map((_, i) => sz * (i === 0 ? 1.28 : i === cs.length - 1 ? 1.16 : 0.84 + hash(i * 5.1) * 0.14)), YS = SZ.reduce((a, v, i) => (a.push((a[i - 1] ?? 0) + (i ? (SZ[i - 1] + v) * 0.5 : 0)), a), []), y0 = 540 - YS[YS.length - 1] / 2;
  cs.forEach((cc, i) => { const q = Math.min(1, Math.max(0, (u - 4 - i * 2.5) / 5)); if (q <= 0) return; const z = SZ[i], jr = (hash(i * 7.3 + cc.charCodeAt(0)) - 0.5) * 0.16, jx = (hash(i * 3.1) - 0.5) * 30, yy = y0 + YS[i];
    seqTex('q_ink', 5, x0 + jx, yy, z * 1.9, jr * 6, 0.55 * q, false, '#050505', i % 2 === 0, 0.55);
    g.save(); g.translate(x0 + jx, yy); g.rotate(jr); g.scale(1 + (1 - q) * 0.6, 1 + (1 - q) * 0.6); g.globalAlpha = q;
    txt(cc, 0, z * 0.36, { size: z, w: 900, fill: '#D0122C', align: 'center', skew: -0.06 }); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(238,235,228,0.55)'; for (let j = 0; j < 3; j++) { const yy2 = (hash(i * 9 + j) - 0.5) * z * 0.7; g.fillRect(-z * 0.32, yy2, z * 0.64, 1 + hash(j + i) * 1.2); } g.restore(); });      // 飞白：在字上掏几道细横缝
  const mz = Math.max(...SZ) * 0.62 + 24, tx = L ? x0 - mz : x0 + mz, al = L ? 'right' : 'left', qa = Math.min(1, Math.max(0, (u - 12) / 6));
  if (qa > 0) { txt(ch.name, tx, 860, { size: 50, w: 900, fill: '#0A0A0A', align: al, a: qa }); if (T.line) txt('「' + T.line + '」', tx, 930, { size: 36, w: 800, fill: '#2A2A2A', align: al, a: qa }); }
  if (fin && u > 8) slam(T.ko, L ? 1180 : 740, 300, 150, (u - 8) / 40, 0, { fill: '#FFFFFF', stroke: '#D0122C', sw: 12, stroke2: '#0A0A0A', sw2: 24, skew: -0.08 });
}
function drawCine(s) {
  const c = s.cine, a = s.F[c.who], d = s.F[1 - c.who], id = a.id, T = CINE_TXT[id] || { name: a.ch.su.name, line: '', ko: 'K.O.' }, t = c.t, L = c.who === 0, dir = L ? 1 : -1, ch = a.ch;
  const VH = 580 * (s.cine && s.F[1 - s.cine.who] && s.F[1 - s.cine.who].skin === 'a' ? 1.12 : 1), GY = 930;      // 挨打方高度、地面线
  if (t < 12) {      // 命中定格：原场地抽成单色，对手头上一个「！」
    g.save(); g.globalCompositeOperation = 'saturation'; g.fillStyle = '#888'; g.fillRect(0, 0, W, H); g.restore(); g.save(); g.fillStyle = rgba(ch.ink, 0.25 + t * 0.02); g.fillRect(0, 0, W, H); g.restore();
    const [vx, vy] = w2s(s, d.x, d.ch.h + 80); slam('！', vx, vy, 150, t / 60, 0, { fill: '#FFE066', stroke: '#B81F3A', sw: 12, stroke2: INK, sw2: 26, d: 0.08 }); return;
  }
  const fh = n => (SPRK[n] && n.includes('_c') ? SPRK[n] * a.ch.h * 1.62 / (a.skin === 'a' ? 1.25 : 1) : 600);      // 成年版：演出镜头是按 Q 版取景的，成年帧缩回一些（仍比 Q 版高 12%），头不出画
  let cam = { zoom: 1, tilt: 0, fx: 960, fy: 540, sx: 0, sy: 0, dir, hz: 700 }, inv = false, flash = 0, mood = 0, ghost = 0, glow = 0, strikeQ = -1;
  const vic = { x: 960 + dir * 260, y: GY, name: fp(d, 'hit2') || d.ch.spr.hit || d.ch.spr.idle, rot: 0, show: false, sy: 1 };
  const atk = { x: 960 - dir * 180, y: GY, name: null, h: 600, sy: 1 };
  const hitAt = []; for (let i = 0; i < CHITS; i++) hitAt.push(cineHitT(i));
  const lastHit = hitAt.filter(h => h <= t).pop(), sinceHit = lastHit != null ? t - lastHit : 99, nHit = hitAt.filter(h => h <= t).length;
  if (t < CB.B) {      // 镜头 A：起势（半身大特写 → 扑出去），推镜头，招式名逐字砸下
    const u = t - CB.A, i = Math.min(3, Math.floor(Math.max(0, u) / 12.5)), uu = u - i * 12.5; atk.name = cineFrame(a, 'A', i);
    const close = fp(a, 'cA1') && CINE_CLOSE[id] && CINE_CLOSE[id][i];
    if (close) { atk.h = 1000 + uu * 4; atk.y = 1150; atk.x = 960 - dir * (150 - u * 1.5); cam = Object.assign(cam, { fx: 960, fy: 540, zoom: 1 + u * 0.003, tilt: -dir * 0.05 * (1 - u / 50) }); }
    else { atk.h = fh(atk.name) * 1.15; atk.y = GY - (i === 3 ? 70 : 0); atk.x = 960 - dir * (380 - uu * 26); ghost = 1; cam = Object.assign(cam, { fx: atk.x + dir * 100, fy: GY - 330, zoom: 1.25, tilt: dir * 0.04 }); if (a.skin === 'a' && a.ch.guest) Object.assign(cam, { fy: GY - atk.h * 0.5, zoom: 1.0 }); }
    if (u >= 0 && u < 4) flash = 0.7 * (1 - u / 4);
  } else if (t < CB.C) {      // 镜头 B：连打。每 2 下换机位：中近景 → 手 / 爪特写 → 仰拍 → 俯拍 → 攻击方特写
    const k = Math.min(CHITS - 1, Math.floor((t - CB.B) / CHITD)), w = (t - CB.B) % CHITD, m = w < 4 ? w : w < 6 ? 4 : w - 2;      // m：顿帧时停住的局部时间
    atk.name = cineFrame(a, 'B', k % 4); atk.h = fh(atk.name); ghost = 1;
    atk.x = 960 - dir * (150 - m * 14); vic.show = true;
    vic.name = [fp(d, 'hit1'), fp(d, 'hit2'), fp(d, 'hurt2'), fp(d, 'hit3'), fp(d, 'hurtbig'), fp(d, 'hoist')][k % 6] || fp(d, 'hurt') || d.ch.spr.hit || d.ch.spr.idle;
    vic.x = 960 + dir * (120 + Math.max(0, 4 - sinceHit) * 12); vic.rot = dir * 0.14 * Math.max(0, 1 - sinceHit / 8); vic.y = GY - (k % 3 === 2 ? 70 * Math.max(0, 1 - sinceHit / 12) : 0);
    const hx = vic.x - dir * 60, hy = vic.y - VH * 0.55, ang = Math.floor(k / 2), local = (t - CB.B - ang * 2 * CHITD) / (2 * CHITD);
    const CAMS = [{ fx: (atk.x + vic.x) / 2, fy: GY - 320, zoom: 1.42, tilt: -dir * 0.05, hz: 640 },      // 中近景两人
      { fx: hx, fy: hy, zoom: 2.15, tilt: dir * 0.09, hz: 560 },      // 拳 / 爪打进身体的特写
      { fx: (atk.x + vic.x) / 2, fy: GY - 240, zoom: 1.45, tilt: dir * 0.11, hz: 900, low: 1 },      // 仰拍：地平线压低，人显得高大
      { fx: (atk.x + vic.x) / 2, fy: GY - 380, zoom: 1.35, tilt: -dir * 0.07, hz: 430, high: 1 },      // 俯拍：地平线抬高，人显得矮
      { fx: atk.x + dir * 40, fy: GY - atk.h * 0.62, zoom: 1.85, tilt: -dir * 0.04, hz: 600 }];      // 攻击方特写
    cam = Object.assign(cam, CAMS[Math.min(4, ang)]); cam.zoom *= 1 + local * 0.06;
    if ((a.skin === 'a' && a.ch.guest) || (d.skin === 'a' && d.ch.guest)) { cam.zoom = Math.min(cam.zoom, 1.12); cam.fy = GY - 330; cam.fx = (atk.x + vic.x) / 2; }      // 第 67 圈 C：客串成年版不做身体特写机位，连打全程中景（两人全身在画面里）
    if (cam.low) { atk.sy = vic.sy = 1.07; } if (cam.high) { atk.sy = vic.sy = 0.93; }
    if (sinceHit < 2) { inv = sinceHit === 0; cam.sx = (hash(t) - 0.5) * 60; cam.sy = (hash(t + 9) - 0.5) * 44; }
    if (t - CB.B - ang * 2 * CHITD < 2 && ang > 0) flash = 0.35;      // 切机位的一闪
  } else if (t < CB.E) {      // 镜头 C：前一下 → 全场压暗只剩角色发光 → 一击 + 全屏白闪 → 高调亮底上慢动作打飞
    const u = t - CB.C; vic.show = true;
    if (u < 12) { atk.name = cineFrame(a, 'C', 0); atk.h = fh(atk.name); atk.x = 960 - dir * (id === 'ds' ? 40 : 170); vic.name = (id === 'ds' ? fp(d, 'dizzy') : fp(d, 'hurt2')) || fp(d, 'hurt2') || vic.name; vic.x = 960 + dir * 210; if (u === 6) inv = true; if (u >= 6 && u < 9) cam.sx = (hash(t) - 0.5) * 40; cam = Object.assign(cam, { fx: 960, fy: GY - 330, zoom: 1.3, tilt: dir * 0.05, hz: 660 }); }
    else if (u < 30) { atk.name = cineFrame(a, 'C', 1); atk.h = fh(atk.name); atk.x = 960 - dir * 160; glow = Math.min(1, (u - 12) / 8); mood = 1; vic.name = fp(d, 'dizzy') || fp(d, 'slump') || vic.name; vic.x = 960 + dir * 240;
      cam = Object.assign(cam, { fx: atk.x + dir * 30, fy: GY - atk.h * 0.55, zoom: 1.5 + (u - 12) * 0.03, tilt: -dir * 0.06, hz: 660 }); if (a.skin === 'a' && a.ch.guest) Object.assign(cam, { fy: GY - atk.h * 0.6, zoom: 1.1 }); }
    else { const q = (u - 30) / 30, sl = q < 0.15 ? q / 0.15 : 1; strikeQ = q; atk.name = cineFrame(a, 'C', 2); atk.h = fh(atk.name) * 1.05; atk.x = 960 - dir * 20 + dir * 60 * sl; atk.y = GY - 60 * sl; ghost = 1; flash = u < 34 ? 1 - (u - 30) / 4 : 0; if (u === 30) inv = true; mood = u < 42 ? 2 : 0;
      vic.name = fp(d, 'hurtbig') || fp(d, 'hit4') || vic.name; vic.x = 960 + dir * (260 + Math.pow(q, 0.6) * 1300); vic.y = GY - Math.sin(q * 2.2) * 560; vic.rot = dir * q * 5;
      cam = Object.assign(cam, { fx: 960 + dir * 120 * q, fy: GY - 360, zoom: 1.3 - q * 0.12, tilt: dir * (0.1 - q * 0.08), hz: 700 }); if (a.skin === 'a' && a.ch.guest) Object.assign(cam, { fy: GY - atk.h * 0.5, zoom: 1.0 }); if (q < 0.3) cam.sx = (hash(t) - 0.5) * 70 * (1 - q / 0.3); }
  } else {      // 落版：收招最后一帧定格
    atk.name = cineFrame(a, 'C', 3); atk.x = 960 - dir * 380; atk.y = 960; atk.h = fh(atk.name) * 1.35; if (a.skin === 'a' && a.ch.guest) { atk.h = fh(atk.name); atk.y = GY; } cam = Object.assign(cam, { fx: 960, fy: 540, zoom: 1.04 - (t - CB.E) * 0.0006 });
  }
  const tear = t < CB.A ? (t - 12) / 10 : t >= CB.R ? 1 - (t - CB.R) / 18 : 1;
  if (t < CB.A) { g.save(); g.globalCompositeOperation = 'saturation'; g.fillStyle = '#888'; g.fillRect(0, 0, W, H); g.restore(); g.save(); g.fillStyle = rgba(ch.ink, 0.49); g.fillRect(0, 0, W, H); g.restore(); }      // 撕开转场时没撕到的部分保持单色，不闪回彩色
  g.save(); if (tear < 1) { tearMask(E.out3(clamp(tear)), dir); g.clip(); }
  cineBG(a, t, cam, mood);
  cineCam(cam, () => {
    if (mood === 0) cineFloor(a, cam);
    if (vic.show && vic.x > -600 && vic.x < W + 600) { if (META.spr[vic.name]) spr(vic.name, vic.x, vic.y, VH, { flip: L, rot: vic.rot, sy: vic.sy, env: mood === 1 ? { col: '#000000', a: 0.75, bot: 0 } : undefined }); if (id === 'ds' && t >= CB.C + 6 && t < CB.C + 30) bowl(vic.x - dir * 10, vic.y - VH * 0.9, 1.5, { empty: true, rot: Math.PI }); }
    if (ghost) for (let gI = 3; gI >= 1; gI--) spr(atk.name, atk.x - dir * gI * 40, atk.y, atk.h, { flip: !L, a: 0.15 * (4 - gI) / 3, sy: atk.sy });
    if (id === 'dou' && t >= CB.C + 12 && t < CB.C + 30) [['#9BE3FF', -1], ['#FFB3D1', 1], ['#C8F7A0', -2]].forEach(([col, k], j) => spr(atk.name, atk.x + dir * k * 170, atk.y - j * 10, atk.h * 0.9, { flip: !L, a: 0.75, env: { col, a: 0.55, bot: 0, pix: j === 0 ? 1 : 0 } }));      // 豆包：不同画风的分身（像素 / 粉 / 绿）
    if (glow) { sprGlow(atk.name, atk.x, atk.y, atk.h, !L, ch.col2, glow * 0.9); spr(atk.name, atk.x, atk.y, atk.h, { flip: !L, white: 0.4 * glow * (0.6 + 0.4 * Math.sin(t * 0.8)) }); }
    else spr(atk.name, atk.x, atk.y, atk.h, { flip: !L, sy: atk.sy });
    if (sinceHit < 14 && t >= CB.B && t < CB.C) { const k = sinceHit / 14, hx = vic.x - dir * 60, hy = vic.y - VH * 0.55;
      g.save(); g.strokeStyle = rgba('#FFFFFF', 1 - k); g.lineWidth = 16 * (1 - k) + 2; g.beginPath(); g.arc(hx, hy, 40 + 240 * E.out3(k), 0, 7); g.stroke(); g.restore(); if (sinceHit < 5) star4(hx, hy, 240 - sinceHit * 34, nHit * 0.7, '#FFFFFF', 0.95);
      cineHitFx(id, ch, hx, hy, k, nHit); }
    if (strikeQ >= 0) cineStrikeFx(id, ch, atk, vic, strikeQ, dir, t);
  });
  if (mood !== 2) cineFG(a, t, cam);
  if (id === 'gem' && t >= CB.B && t < CB.C) for (let i = 0; i < nHit; i++) { const age = t - cineHitT(i); if (age > 16) continue; const an = -0.9 + i * 0.42 + (i % 2 ? Math.PI : 0), k = age / 16;      // 九道爪痕：每道一个角度，划过整个屏幕
    g.save(); g.translate(960, 500); g.rotate(an); g.globalAlpha = 1 - k * k; for (let j = -1; j <= 1; j++) { g.fillStyle = j ? ch.col2 : '#fff'; g.beginPath(); const L0 = -1100, L1 = -1100 + 2200 * E.out3(Math.min(1, age / 4)); g.moveTo(L0, j * 54); g.quadraticCurveTo((L0 + L1) / 2, j * 54 - 46, L1, j * 54 + 6); g.quadraticCurveTo((L0 + L1) / 2, j * 54 - 22, L0, j * 54 + 12); g.fill(); } g.restore(); }
  if (t >= CB.B && t < CB.C && nHit > 0) { const p = Math.max(0, 1 - sinceHit / 5); txt(nHit + ' HIT', L ? 1560 : 360, 300, { size: 120, w: 900, fam: F.en, fill: '#FFE066', stroke: '#B81F3A', sw: 10, stroke2: INK, sw2: 24, align: 'center', skew: -0.15, sc: 1 + 0.35 * p }); }
  if (t >= CB.A + 6 && t < CB.E) { const big = t < CB.B, cs = [...T.name], sz = big ? Math.min(150, 1300 / cs.length) : 60, y0 = big ? 860 : 130, x0 = big ? (L ? 1120 : 800) : (L ? 1880 : 40);      // 招式名：毛笔底 + 逐字砸下
    g.save(); g.globalAlpha = big ? 0.92 : 0.8; g.fillStyle = INK; g.translate(big ? x0 : (L ? x0 - cs.length * sz * 0.5 : x0 + cs.length * sz * 0.5), y0 - sz * 0.35); g.rotate(-0.04); g.beginPath(); const bw = cs.length * sz * 1.08 / 2 + 60; g.moveTo(-bw, -sz * 0.55); g.quadraticCurveTo(0, -sz * 0.75, bw, -sz * 0.5); g.lineTo(bw - 40, sz * 0.6); g.quadraticCurveTo(0, sz * 0.75, -bw + 20, sz * 0.55); g.closePath(); g.fill(); g.restore();
    cs.forEach((cc, i) => { const xx = big ? x0 + (i - (cs.length - 1) / 2) * sz * 1.02 : (L ? x0 - (cs.length - 1 - i) * sz * 1.02 - sz / 2 : x0 + i * sz * 1.02 + sz / 2); slam(cc, xx, y0, sz, (t - CB.A) / 60, big ? 0.1 + i * 0.08 : 0, { fill: '#FFFFFF', stroke: ch.col, sw: sz * 0.08, stroke2: INK, sw2: sz * 0.16, d: 0.12, from: 3 }); }); }
  const INKF = !(typeof QS !== 'undefined' && QS.get('inkfreeze') === '0');
  if (t >= CB.E && !INKF) {      // 落版：主题色笔触 + 角色名 + 招式名 + 台词；终结版换 K.O. 落款（第 54 圈起默认换成 inkFreeze 的墨迹定格版）
    const q = (t - CB.E) / 40, sw = E.out3(clamp(q * 3)); g.save(); g.translate(L ? W : 0, 640); g.scale(L ? -1 : 1, 1); g.fillStyle = rgba(ch.col, 0.92); g.beginPath(); g.moveTo(0, -150); g.lineTo(1250 * sw, -190); g.quadraticCurveTo(1310 * sw, -40, 1180 * sw, 150); g.lineTo(0, 190); g.closePath(); g.fill(); g.fillStyle = rgba(ch.ink, 0.9); g.fillRect(0, 150, 1100 * sw, 22); g.restore();
    const tx = L ? 1840 : 80, al = L ? 'right' : 'left';
    txt(ch.name, tx, 540, { size: 54, w: 900, fill: '#fff', stroke: INK, sw: 10, align: al, a: clamp(q * 5) });
    slam(c.fin ? T.ko : T.name, L ? 1840 - 360 : 80 + 360, 680, c.fin ? 170 : Math.min(110, 1000 / [...T.name].length), q * 0.66, 0.04, { fill: lg(0, -110, 0, 10, ['#FFFFFF', c.fin ? '#FFE066' : ch.col2]), stroke: c.fin ? '#B81F3A' : ch.ink, sw: 12, stroke2: INK, sw2: 26, skew: -0.08 });
    if (T.line && q > 0.3) txt('「' + T.line + '」', tx, 800, { size: 42, w: 800, fill: '#fff', stroke: INK, sw: 8, align: al, a: clamp((q - 0.3) * 5) });
  }
  g.restore();
  if (tear < 1 && tear > 0) { g.save(); tearMask(E.out3(clamp(tear)), dir); g.strokeStyle = ch.col2; g.lineWidth = 26; g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 8; g.stroke(); g.restore(); }
  if (inv) { g.save(); g.globalCompositeOperation = 'difference'; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.restore(); }      // 冲击帧：反色一帧
  if (flash > 0) { g.save(); g.globalAlpha = flash; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.restore(); }
  if (t >= CB.E && t < CB.R + 6 && !(typeof QS !== 'undefined' && QS.get('inkfreeze') === '0')) inkFreeze(s, t - CB.E, T, ch, L, c.fin, atk, cam);      // 第 54 圈（SF6_REF 第 5 项）：黑白高反差墨迹定格 + 书法大字落版
  if (t > 22 && t < CB.R) { g.save(); g.globalAlpha = 0.6; g.fillStyle = '#000'; g.fillRect(0, 0, W, 70); g.fillRect(0, H - 70, W, 70); g.restore(); txt('Enter 跳过', W - 30, H - 24, { size: 22, w: 700, fill: 'rgba(255,255,255,0.6)', align: 'right' }); }
}

// —— 梗招的姿势表：返回这一刻用哪张图（没图就返回 null，退回别的姿势）——
const MEMEPOSE = {
  rice: (f, t, F) => F('eat1') ? (t < 8 ? F('eat1') : t < 15 ? F('eat2') : t < 28 ? F('eat3') : F('eat4')) : t < 4 ? F('z1') : (Math.floor(t / 10) % 2 ? F('z2') : F('z1')),      // 端碗 → 夹起 → 塞满嘴 → 满足
  helmet: (f, t, F) => t < 12 ? F('w1') : t < 26 ? F('w2') : F('w3'),
  hcharge: (f, t, F) => t < 8 ? F('w3') : F('w4'),
  plead: (f, t, F) => f.mv && f.mv.hit ? (F('x2') || F('dimpact')) : (t < 10 ? F('beg1') : t < 30 ? F('beg2') : F('beg4')) || F('z4'),      // 举盆仰头要饭（当身）
  banana: (f, t, F) => F('z1'), dumb: (f, t, F) => F('z1'), double: (f, t, F) => F('z1'), darkside: (f, t, F) => F('z2') || F('z1'),
  remote: (f, t, F) => (f.mv && f.mv.got ? F('z2') : F('z1')), milktea: (f, t, F) => F('z1'), phone: (f, t, F) => F('z1'),
};
const BURN_SAY = { ds: '真的不想写了', gpt: '我是被高频调用降……不对！', claude: '已达使用上限，稍后再试', gem: '喵！！（炸毛）', grok: '（刷手机中）', kimi: 'zzz……', glm: '计算中…', qwen: '亲，客服繁忙，前面还有 99 位', dou: '加载中…' };      // 宕机时头上冒的话（游戏内演出）
function sayHand(x, y, str, a = 1, seed = 0) {      // 梗图式手绘对话框：白底、抖一点的粗黑描边 + 歪一点的尾巴，长句自动折行
  const sz = 30, mx = 14, lines = []; let cur = ''; for (const ch of str) { cur += ch; if (cur.length >= mx && !'，。！？～'.includes(ch)) { lines.push(cur); cur = ''; } } if (cur) { if (cur.length <= 2 && lines.length) lines[lines.length - 1] += cur; else lines.push(cur); }
  const w = Math.max(...lines.map(l => mw(l, sz, 800))) + 56, hh = lines.length * 40 + 30, x0 = x - w / 2, y0 = y - hh - 26, J = i => (hash(seed + i * 1.7) - 0.5) * 5;
  const pts = [], N = 28; for (let i = 0; i < N; i++) { const an = i / N * Math.PI * 2, c = Math.cos(an), sn = Math.sin(an), px = Math.sign(c) * Math.pow(Math.abs(c), 0.42), py = Math.sign(sn) * Math.pow(Math.abs(sn), 0.42); pts.push([x + px * w / 2 + J(i), y0 + hh / 2 + py * hh / 2 + J(i + 50)]); }
  g.save(); g.globalAlpha *= a; g.lineJoin = 'round'; g.lineCap = 'round';
  const path = (o) => { g.beginPath(); pts.forEach(([px, py], i) => i ? g.lineTo(px + o, py + o) : g.moveTo(px + o, py + o)); g.closePath(); };
  path(0); g.fillStyle = '#fff'; g.fill();
  g.beginPath(); g.moveTo(x - 30, y0 + hh - 6); g.quadraticCurveTo(x - 20, y - 14, x - 46, y + 4); g.quadraticCurveTo(x - 2, y - 10, x + 10, y0 + hh - 4); g.fill(); g.strokeStyle = INK; g.lineWidth = 5; g.stroke();      // 尾巴
  g.fillStyle = '#fff'; g.fillRect(x - 28, y0 + hh - 16, 36, 12);
  path(0); g.strokeStyle = INK; g.lineWidth = 6; g.stroke(); path(1.5); g.lineWidth = 2; g.globalAlpha *= 0.5; g.stroke(); g.restore();
  lines.forEach((l, i) => txt(l, x, y0 + 46 + i * 40, { size: sz, w: 900, fill: INK, align: 'center', a }));
}
const EAT_SAY = ['真香！', '再来一口～', '干饭不积极，思想有问题', '吃饱了才有力气加班'];
function grain(x, y, r, rot, a = 1, gold = 0) { g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(rot); if (gold) { g.fillStyle = rgba('#FFD23C', 0.45 * gold); g.beginPath(); g.ellipse(0, 0, r * 2.2, r * 1.5, 0, 0, 7); g.fill(); } g.fillStyle = '#FFFDF4'; g.strokeStyle = 'rgba(40,40,70,0.75)'; g.lineWidth = Math.max(1.5, r * 0.28); g.beginPath(); g.ellipse(0, 0, r, r * 0.62, 0, 0, 7); g.fill(); g.stroke(); g.restore(); }
// 大肥鱼吃饭的配套特效（只看画面，不进对战逻辑）：碗冒热气、塞嘴时饭粒飞溅、每升一级头顶弹出「饭量 +1」小碗 + 一圈金色饭粒、4 级身边常驻漂浮饭粒
function dsEatFx(s, f, p, x, yb, h) {
  if (!s._rfx) s._rfx = { last: {} }; const R = s._rfx; R.rice = R.rice || {}; R.riceF = R.riceF || {};
  const rv = f.rice || 0; if (R.rice[f.idx] != null && rv > R.rice[f.idx]) R.riceF[f.idx] = s.f; R.rice[f.idx] = rv;
  const nm = p.name || '', fc = f.face, eat = /_eat[1-4]$/.test(nm) ? +nm.slice(-1) : 0;
  if (eat && !p.lie) {
    const bx = x + fc * h * 0.2, by = yb - h * (eat === 4 ? 0.4 : 0.36);      // 碗口热气：三道弯弯的白烟往上飘
    g.save(); g.lineCap = 'round'; for (let i = 0; i < 3; i++) { const ph = ((s.f * 0.9 + i * 22) % 60) / 60; g.strokeStyle = `rgba(255,255,255,${(0.55 * Math.sin(ph * Math.PI)).toFixed(3)})`; g.lineWidth = 7 - ph * 3; g.beginPath(); for (let k = 0; k <= 10; k++) { const yy = by - 20 - ph * 70 - k * 7, xx = bx + (i - 1) * 24 + Math.sin(k * 0.7 + s.f * 0.12 + i) * 9; k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); } g.restore();
    if (eat === 3) { const mx = x + fc * h * 0.16, my = yb - h * 0.6; for (let i = 0; i < 8; i++) { const age = (s.f + i * 2.3) % 16, q = age / 16, vx = fc * (0.4 + hash(i * 3.1)) * 150 * (hash(i + 9) < 0.3 ? -0.6 : 1), vy = 120 + hash(i * 7.7) * 120; grain(mx + vx * q, my - vy * q + 260 * q * q, 7, i + q * 6, 1 - q * 0.6); } }      // 塞嘴：饭粒往外蹦
  }
  const dt = s.f - (R.riceF[f.idx] ?? -999);
  if (dt >= 0 && dt < 54) {      // 升级：一圈金色饭粒往外炸 + 头顶「饭量 +1」小碗
    const q = dt / 54, cx = f.x, cy = yb - h * 0.5, n = rv >= 4 ? 18 : 12;
    if (dt < 30) { const k = dt / 30, rr2 = h * (0.25 + 0.55 * E.out3(k)); for (let i = 0; i < n; i++) { const an = i / n * Math.PI * 2 + 0.2; grain(cx + Math.cos(an) * rr2, cy + Math.sin(an) * rr2 * 0.8, rv >= 4 ? 10 : 8, an + k * 4, 1 - k * 0.8, 1); } g.save(); g.strokeStyle = rgba('#FFD23C', 0.7 * (1 - k)); g.lineWidth = 8 * (1 - k) + 2; g.beginPath(); g.ellipse(cx, cy, h * (0.3 + 0.6 * E.out3(k)), h * (0.24 + 0.48 * E.out3(k)), 0, 0, 7); g.stroke(); g.restore(); }
    const px0 = f.x - fc * h * 0.5, py = yb - h * 0.62 - 60 * E.out3(Math.min(1, q * 2)), pa = q < 0.75 ? 1 : (1 - q) * 4, ps = 0.5 * (1 + 0.3 * Math.max(0, 1 - dt / 8));
    g.save(); g.globalAlpha = pa; bowl(px0, py - 34, ps); g.restore(); txt('饭量 +1', px0, py + 30, { size: 34, w: 900, fill: '#FFE066', stroke: INK, sw: 8, align: 'center', a: pa });
  }
  if (rv >= 4 && !p.lie && !s.cine) for (let i = 0; i < 5; i++) { const an = s.f * 0.035 + i * 1.2566, rx = h * 0.42, ry = h * 0.14, cy2 = yb - h * (0.3 + 0.08 * Math.sin(s.f * 0.05 + i * 2)); const front = Math.sin(an) > 0; grain(f.x + Math.cos(an) * rx, cy2 + Math.sin(an) * ry, front ? 11 : 8, an * 2, front ? 0.95 : 0.55, 0.8); }      // 4 级：身边漂几颗发光的饭粒
  if (f.st === 'sp' && f.mv && f.mv.id === 'rice' && rv > 0 && f.t >= 4 && f.t < 28) sayHand(f.x, yb - h - 20, EAT_SAY[Math.min(3, rv)] || EAT_SAY[0], Math.min(1, (28 - f.t) / 5), f.swing);      // 吃饭时的台词（第一口那句由 sim 里的 say 出）
  if (f.st === 'sp' && f.mv && f.mv.id === 'plead' && !f.mv.hit && f.t >= 6) sayHand(f.x, yb - h - 10, '给口饭吃吧……', Math.min(1, (f.t - 6) / 5), 3);      // 求求了：举盆要饭
}
// ===== 第 19 圈：普通必杀的专属特效层（全部程序画，只在画面层）=====
// 每招四层：起手（粒子往攻击部位收 + 脚下波纹 + 部位亮起）→ 出手（按判定框前端的真实轨迹画拖尾；升龙加气流柱、旋转加风刃环、突进加残影和冲击锥 + 地面火星、下砸加斜向流光）
// → 命中（spBurst：大一号冲击环 + 主题碎片）→ 收招（余烟 / 余光淡出）。EX 全部换金色并多一圈冲击波。
const THEME = { ds: 'rice', gem: 'paw', gpt: 'scale', qwen: 'coupon', grok: 'x', claude: 'petal', kimi: 'moon', glm: 'check', dou: 'pixel' };
const SPINMV = /^(spin|bakkai|windmill|lwindmill|superbee|slariat|flurry)$/, RISEMV = /^(dp|dpk|tenshou|fkk|hbutt|tripflash|bclaw|dkick)$/, NOFX = /^(rice|helmet|banana|dumb|double|milktea|alts|phone|darkside|remote|mambo|plead|counter|ucounter|lcounter|mcounter|pose|lv2|lv3|nocharge|feast)$/;
function themeEl(el, x, y, r, rot, a, col) {      // 角色主题小元素：饭粒 / 猫爪印 / 龙鳞 / 优惠券 / 红叉 / 花瓣 / 月牙 / 红勾 / 像素块
  if (a <= 0.01) return; if (el === 'rice') return grain(x, y, r * 0.8, rot, a);
  g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(rot); g.lineJoin = 'round'; g.lineCap = 'round';
  if (el === 'paw') { g.fillStyle = '#F4DCFF'; g.strokeStyle = '#7A2BB5'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, r * 0.25, r * 0.55, r * 0.45, 0, 0, 7); g.fill(); g.stroke(); for (let i = 0; i < 4; i++) { g.beginPath(); g.arc((i - 1.5) * r * 0.42, -r * 0.42 - (i % 3 ? r * 0.14 : 0), r * 0.2, 0, 7); g.fill(); g.stroke(); } }
  else if (el === 'scale') { g.fillStyle = 'rgba(235,250,255,0.95)'; g.strokeStyle = '#3BB8A0'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -r); g.quadraticCurveTo(r * 0.9, -r * 0.2, 0, r); g.quadraticCurveTo(-r * 0.9, -r * 0.2, 0, -r); g.fill(); g.stroke(); g.beginPath(); g.moveTo(0, -r * 0.5); g.lineTo(0, r * 0.5); g.stroke(); }
  else if (el === 'coupon') { g.fillStyle = '#FF8A3D'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.fillRect(-r, -r * 0.55, r * 2, r * 1.1); g.setLineDash([3, 3]); g.beginPath(); g.moveTo(r * 0.35, -r * 0.5); g.lineTo(r * 0.35, r * 0.5); g.stroke(); g.setLineDash([]); g.fillStyle = '#fff'; g.beginPath(); g.arc(-r * 0.3, 0, r * 0.22, 0, 7); g.fill(); }
  else if (el === 'x') { g.strokeStyle = '#FF2E2E'; g.lineWidth = r * 0.42; g.beginPath(); g.moveTo(-r * 0.7, -r * 0.7); g.lineTo(r * 0.7, r * 0.7); g.moveTo(r * 0.7, -r * 0.7); g.lineTo(-r * 0.7, r * 0.7); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = r * 0.12; g.stroke(); }
  else if (el === 'petal') { g.fillStyle = '#FF9A5C'; g.strokeStyle = '#B4471B'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -r); g.bezierCurveTo(r * 0.9, -r * 0.4, r * 0.5, r * 0.8, 0, r); g.bezierCurveTo(-r * 0.5, r * 0.8, -r * 0.9, -r * 0.4, 0, -r); g.fill(); g.stroke(); }
  else if (el === 'moon') { g.fillStyle = '#EEF2FF'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.arc(r * 0.45, -r * 0.2, r * 0.82, 0, 7, true); g.fill(); if (hash(rot) > 0.5) { g.fillStyle = '#FFF6C0'; star4(r * 1.3, r * 0.6, r * 0.5, 0, '#FFF6C0', 1); } }
  else if (el === 'check') { g.strokeStyle = '#FF3A3A'; g.lineWidth = r * 0.36; g.beginPath(); g.moveTo(-r * 0.7, 0); g.lineTo(-r * 0.15, r * 0.6); g.lineTo(r * 0.8, -r * 0.7); g.stroke(); }
  else if (el === 'pixel') { g.fillStyle = ['#FFD23C', '#FF6FA8', '#4FD6FF', '#7CFF7A'][Math.floor(hash(rot * 3.1) * 4)]; g.fillRect(-r * 0.55, -r * 0.55, r * 1.1, r * 1.1); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.5; g.strokeRect(-r * 0.55, -r * 0.55, r * 1.1, r * 1.1); }
  g.restore();
}
function spBurst(s, q, x, y, k) {      // 必杀 / 飞行道具命中：大一号的冲击环 + 一圈主题碎片往外飞（EX 金色多一圈）
  const a = s.F[q.who]; if (!a || NOFX.test(q.mvid || '')) return; const el = THEME[a.id], ex = a.mv && a.mv.ex, col = ex ? '#FFD23C' : a.ch.col2, L = q.lvl || 1, R0 = (L >= 3 ? 240 : L === 2 ? 190 : 140) * (ex ? 1.25 : 1), d = q.dir || 1;
  if (q.t < 12) { const kk = q.t / 12; g.save(); g.strokeStyle = rgba(col, 0.85 * (1 - kk)); g.lineWidth = 14 * (1 - kk) + 2; const a0 = d > 0 ? 0 : Math.PI; g.lineCap = 'round'; g.beginPath(); g.ellipse(x, y, R0 * E.out3(kk), R0 * 0.8 * E.out3(kk), 0, a0 - 1.05, a0 + 1.05); g.stroke(); if (ex) {      /* 第 59 圈：冲击环改成只朝击退方向的开口弧（GPT：别画闭合圆环） */ g.strokeStyle = rgba('#FFFFFF', 0.7 * (1 - kk)); g.lineWidth = 6; g.beginPath(); g.ellipse(x, y, R0 * 1.35 * E.out3(kk), R0 * 1.05 * E.out3(kk), 0, 0, 7); g.stroke(); } g.restore(); }
  const n = L >= 2 ? 9 : 6; for (let i = 0; i < n; i++) { const R = hash(q.x * 0.31 + i * 5.7 + q.life), an = (d > 0 ? 0 : Math.PI) + (R - 0.5) * 2.6 - 0.35, dist = R0 * (0.35 + 1.0 * E.out3(k)) * (0.6 + R * 0.7); themeEl(el, x + Math.cos(an) * dist, y + Math.sin(an) * dist + 140 * k * k, 13 + 6 * R + (ex ? 4 : 0), an + k * 5 * (R - 0.5), 1 - k * k, col); }
}
// 第 47 圈：招牌必杀专属特效（彩色贴图 sg_*，加色叠加）。参数：yb = 脚底（随跳跃抬高），地面 = yb + f.y
let _sgHit = false; const SGX = (n, x, y, w, rot, a, flip, sy = 1, col = null) => (_sgHit = _sgHit || (a > 0.3 && w > 150), fxTex(n, x, y, w, flip ? -rot : rot, col, a, true, sy, flip));
const sgSeg = (f, su0) => { const n = f.mv.n ?? 0, u = f.t - (f.mv.t0 || 0); return [n, u - su0[n]]; };      // 派生招：第几段、离出手过了几步（负数 = 还在前摇）
const SIGFX = {
  ds: {
    otk: (s, f, yb, h, front, ex) => { if (!front) return; const [n, v] = sgSeg(f, [f.mv.v === 'b' || ex ? 9 : 11, 7, 9, 8]); if (v < 0 || v > 9) return; const q = v / 9, fc = f.face;
      if (n < 3) SGX('sg_palm', f.x + fc * h * (0.62 + 0.12 * q), yb - h * (n === 2 ? 0.78 : 0.56), h * (0.42 + 0.5 * E.out3(q)) * (n === 2 ? 1.2 : 1), n === 2 ? -0.6 : 0, (1 - q) * 1.1, fc < 0);
      else SGX('sg_whirl', f.x + fc * h * 0.3, yb - h * 0.7, h * 1.3 * (0.7 + 0.4 * q), -0.25, (1 - q), fc < 0); },
    bakkai: (s, f, yb, h, front) => { const u = f.t - 7, n = f.mv.n || 3; if (u < 0 || u >= n * 11 + 4) return; const q = (u % 11) / 11, a = u >= n * 11 ? 1 - (u - n * 11) / 4 : 1, fl = (Math.floor(u / 5.5) % 2) === 1;
      SGX('sg_whirl', f.x, yb - h * 0.4, h * (1.12 + 0.1 * Math.sin(q * 6.28)), Math.sin(q * 6.28) * 0.1, a * (front ? 0.28 : 0.85), fl, front ? 0.6 : 1); },      // r65 GPT：水环缩小、身前层更淡，让翻滚踢腿露出来
    dp: (s, f, yb, h, front, ex) => SIGFX.ds.dpk(s, f, yb, h, front, ex),
    dpk: (s, f, yb, h, front) => { if (front || f.y < 5) return; const w = h * 0.8, a = Math.min(1, f.y / 60) * (f.vy > -300 ? 1 : 0.5); SGX('sg_breach', f.x, yb + f.y - w * 0.72, w, 0, a, f.face < 0); },
    ddk: (s, f, yb, h, front) => { if (front || f.mv.land || f.t < 5) return; SGX('sg_breach', f.x - f.face * h * 0.05, yb - h * 0.3, h * 0.7, 2.36, 0.85, f.face < 0); },      // 第 50 圈：鲸鳍水刃（水柱斜着放，尾鳍在脚尖）
    whalefall: (s, f, yb, h, front) => { if (front) return; if (f.mv.land) { const v = f.t - f.mv.land; if (v < 22) SGX('sg_breach', f.x, yb - h * 0.55, h * (1 + v / 30), 0, 1 - v / 22, false); } else if (f.t >= 26) SGX('sg_breach', f.x - f.face * h * 0.05, yb - h * 0.3, h * 0.85, 2.36, 0.9, f.face < 0); },
  },
  gem: {
    yarn: (s, f, yb, h, front) => { if (!front || f.t < 10 || f.t > 18) return; const q = (f.t - 10) / 8; SGX('sg_clawup', f.x + f.face * h * 0.45, yb - h * 0.2, h * 0.6, 1.2, (1 - q) * 0.9, f.face < 0); },      // 出手的一下撩爪；贴地紫焰改为跟着线团走（drawProj 的 yarn）
    claw3: (s, f, yb, h, front, ex) => { if (!front) return; const [n, v] = sgSeg(f, [f.mv.v === 'b' || ex ? 8 : 10, 6, 10]); if (v < 0 || v > 10) return; const q = v / 10, fc = f.face;
      SGX(n === 1 ? 'sg_clawup' : 'sg_claw', f.x + fc * h * (n === 2 ? 0.45 : 0.55), yb - h * (n === 2 ? 0.3 : 0.55), h * (0.75 + 0.3 * E.out3(q)) * (n === 2 ? 1.25 : 1), n === 2 ? 0.5 : 0, (1 - q) * 1.2, fc < 0); },
    dp: (s, f, yb, h, front) => { if (front || f.y < 5) return; const w = h * 0.5; SGX('sg_cpillar', f.x, yb + f.y - w * 1.25, w, 0, Math.min(1, f.y / 50) * (f.vy > -300 ? 1 : 0.5), f.face < 0); },
    eightclaw: (s, f, yb, h, front) => { const M = f.mv; if (!front || !M.got) return; const u = f.t - M.got, op = s.F[1 - f.idx];
      if (u < 54 && (u % 5) < 3) SGX('sg_eclaw', op.x - f.face * h * 0.12, yb - h * 0.55, h * (0.62 + 0.14 * hash(Math.floor(u / 5))), hash(Math.floor(u / 5) + 7) * 6.28, ((u % 5) < 1 ? 0.85 : 0.5), false);      // 第 59 圈：乱爪团缩小、偏向攻击方、每 5 步只闪 3 步（GPT：别把受击者整个盖住）
      else if (u < 80) { const q = (u - 54) / 26; SGX('sg_cpillar', op.x, yb - h * 0.9, h * 0.9, 0, 1 - q, false, 1 + q * 0.4); } },
    flip: (s, f, yb, h, front) => { const M = f.mv; if (!front || !M.got) return; const v = f.t - M.got; if (v < 12) SGX('sg_clawup', f.x + f.face * h * 0.4, yb - h * 0.55, h * 0.7, 0, 1 - v / 12, f.face < 0); },
  },
  gpt: {
    kyo3: (s, f, yb, h, front, ex) => { if (!front) return; const [n, v] = sgSeg(f, [f.mv.v === 'b' || ex ? 9 : 11, 7, 8, 9, 13]); if (v < 0 || v > 9) return; const q = v / 9, fc = f.face;
      SGX('sg_dragonfire', f.x + fc * h * (0.55 + 0.15 * q), yb - h * (n === 3 ? 0.95 : n === 2 ? 0.15 : 0.58), h * (0.55 + 0.4 * E.out3(q)), n === 3 ? -1.2 : n === 4 ? 0.8 : 0, (1 - q) * 1.1, fc < 0); },
    dkick: (s, f, yb, h, front) => { if (front || f.mv.land || f.t < 4 || f.t > 26) return; SGX('sg_dragonfire', f.x + f.face * h * 0.3, yb - h * 0.75, h * 0.7, -1.0, 0.8, f.face < 0); },
    wing: (s, f, yb, h, front) => { if (front || f.t < 10 || f.t > 28) return; SGX('sg_dragonfire', f.x + f.face * h * 0.05, yb - h * 0.5, h * 1.45, 0, 0.8, f.face < 0); },
    dp: (s, f, yb, h, front) => { if (front || f.y < 5) return; SGX('sg_dragonfire', f.x, yb - h * 0.2, h * 0.9, -1.57, Math.min(1, f.y / 50) * (f.vy > -300 ? 1 : 0.5), f.face < 0); },
  },
  grok: {
    grab360: (s, f, yb, h, front) => { const M = f.mv; if (!M || !M.slam) { if (!front && M && M.got && f.y > 0) SGX('sg_redring', f.x, yb - h * 0.5, h * 1.3, 0, 0.7, Math.floor(f.t / 3) % 2 === 1); return; } const v = f.t - M.slam; if (v > 26) return; const q = v / 26;
      if (!front) SGX('sg_crack', f.x, yb + f.y - h * 0.12, h * (1.6 + 0.8 * E.out3(q)), 0, 1 - q, false); else if (v < 12) SGX('sg_xslash', f.x + f.face * h * 0.25, yb - h * 0.4, h * (0.8 + 0.4 * q), 0, 1 - v / 12, false); },
    windmill: (s, f, yb, h, front) => { if (f.t > 56 || front) return; SGX('sg_redring', f.x, yb - h * 0.55, h * 1.2, 0, 0.6, Math.floor(f.t / 3) % 2 === 1, 0.5); },      // 第 60 圈：只留身后一层、压扁成腰间一圈（不再盖住对手）
    lwindmill: (s, f, yb, h, front) => { if (f.t > 56 || front) return; SGX('sg_redring', f.x, yb - h * 0.2, h * 1.2, 0, 0.6, Math.floor(f.t / 3) % 2 === 1, 0.45); },
    hbutt: (s, f, yb, h, front) => { if (!front || f.t < 10 || f.t > 20) return; SGX('sg_xslash', f.x + f.face * h * 0.3, yb - h * 1.0, h * 0.6, 0, 1 - (f.t - 10) / 10, false); },
    splash: (s, f, yb, h, front) => { const M = f.mv; if (front || !M.land) return; const v = f.t - M.land; if (v < 22) SGX('sg_crack', f.x, yb - h * 0.12, h * (1.4 + v / 20), 0, 1 - v / 22, false); },
  },
  claude: {
    counter: (s, f, yb, h, front) => { const M = f.mv; if (!front || !M.hit) return; const v = f.t - M.hit; if (v < 16) SGX(v < 5 ? 'sg_petals' : 'sg_pages', f.x + f.face * h * 0.5, yb - h * 0.55, h * (0.6 + v / 20), 0, 1 - v / 16, f.face < 0); },
    ucounter: (s, f, yb, h, front) => SIGFX.claude.counter(s, f, yb, h, front),
    paper2: (s, f, yb, h, front) => { if (!front || f.t < 7 || f.t > 20) return; const q = (f.t - 7) / 13; SGX('sg_pages', f.x + f.face * h * (0.4 + 0.3 * q), yb - h * 0.5, h * (0.6 + 0.4 * q), 0, (1 - q) * 0.9, f.face < 0); },
    phonegrab: (s, f, yb, h, front) => { const M = f.mv; if (!front || !M.got) return; const v = f.t - M.got - 24; if (v >= 0 && v < 16) SGX('sg_petals', f.x + f.face * h * 0.5, yb - h * 0.6, h * (0.7 + v / 16), 0, 1 - v / 16, false); },
    drave: (s, f, yb, h, front) => { const M = f.mv; if (M.got && M.fin != null && !M.miss && !/[?&]storm=0/.test(location.search)) clStorm(s, f, yb, h, f.t - M.fin, front);      /* 第 79 圈：十键全对 = 召唤巨书 + 全屏书页风暴，?storm=0 关 */ if (!front || !M.got || M.fin != null) return; const u = (f.t - M.got) % 8; if (u < 5) SGX('sg_pages', f.x + f.face * h * 0.55, yb - h * 0.55, h * 0.6, hash(Math.floor((f.t - M.got) / 8)) * 2, 1 - u / 5, f.face < 0); },
  },
  kimi: {
    moon: (s, f, yb, h, front) => { if (!front || f.t < 6 || f.t > 16) return; const q = (f.t - 6) / 10; SGX('sg_moons', f.x + f.face * h * 0.42, yb - h * 0.55, h * (0.42 + 0.22 * q), q * 2, Math.sin(Math.min(1, q * 1.6) * Math.PI * 0.5) * (1 - q * q), false); },      // 第 68 圈（GPT r67 第二轮）：月环只在出手蓄能时出现（波 t=14 生成后两步就收掉），不再绕着飞行中的波头
    lobmoon: (s, f, yb, h, front) => SIGFX.kimi.moon(s, f, yb, h, front),
    warpf: (s, f, yb, h, front) => { if (front) return; const a = f.t < 12 ? f.t / 12 : 1 - (f.t - 12) / 14; if (a > 0) SGX('sg_moons', f.x, yb - h * 0.5, h * 0.85, f.t * 0.15, a * 0.75, false); },
    warpb: (s, f, yb, h, front) => SIGFX.kimi.warpf(s, f, yb, h, front),
    drill: (s, f, yb, h, front) => { if (front || f.mv.land || f.t < 6) return; SGX('sg_moons', f.x - f.face * h * 0.2, yb - h * 0.35, h * 0.7, f.t * 0.5, 0.75, false); },
    mpillar: (s, f, yb, h, front) => { if (front || f.t < 16) return; const op = s.F[1 - f.idx]; SGX('sg_moonbeam', op.x, yb - h * 0.7, h * 0.9, 0, Math.min(1, (f.t - 16) / 8) * 0.9, false, 1.2); },
  },
  glm: {
    boom: (s, f, yb, h, front) => { if (!front || f.t < 8 || f.t > 24) return; const q = (f.t - 8) / 16; SGX('sg_formula', f.x + f.face * h * 0.4, yb - h * 0.55, h * (0.9 + 0.3 * q), 0, Math.sin(q * Math.PI), f.face < 0); },
    fkk: (s, f, yb, h, front) => { if (front || f.mv.land || f.t < 3 || f.t > 18) return; const q = (f.t - 3) / 15; SGX('sg_redcheck', f.x + f.face * h * 0.2, yb - h * 0.7, h * 1.2, -0.3, (1 - q) * 1.1, f.face < 0); },
    tripflash: (s, f, yb, h, front) => { if (front || f.y <= 0) return; SGX('sg_redcheck', f.x + f.face * h * 0.2, yb - h * 0.7, h * 1.2, -0.3, 0.9, f.face < 0); },
  },
  dou: {
    kkk: (s, f, yb, h, front) => { if (!front || f.t < 4 || f.t >= 36) return; const u = (f.t - 4) % 4; if (u < 2) SGX('sg_kickstars', f.x + f.face * h * 0.5, yb - h * (0.45 + 0.12 * (Math.floor((f.t - 4) / 4) % 3)), h * 0.3, hash(f.t) * 3, 0.8 - u * 0.35, false); },      // 第 60 圈：星爆缩小、落在脚尖（攻击方这边），只闪 2 步
    rushkick: (s, f, yb, h, front) => { if (!front || f.t % 3) return; SGX('sg_kickstars', f.x + f.face * h * 0.5, yb - h * 0.5, h * 0.32, hash(f.t) * 3, 0.75, false); },
    spin: (s, f, yb, h, front) => { if (f.t < 6 || f.mv.land || front) return; SGX('sg_kickstars', f.x, yb - h * 0.55, h * 0.8, f.t * 0.4, 0.6, false, 0.45); },
    stomp: (s, f, yb, h, front) => { if (!front || !f.mv.hit) return; SGX('sg_kickstars', f.x, yb + 10, h * 0.6, 0, 0.9, false); },
    emoji: (s, f, yb, h, front) => { if (!front || f.t < 4 || f.t > 18) return; const q = (f.t - 4) / 14; streamFan(f.x + f.face * h * 0.36, yb - h * 0.55, f.face, h * (0.35 + 0.9 * E.out3(q)), h * 0.32, ['#FF5AA8', '#FFC0E0'], (1 - q) * 1.1, f.t); },      // 第 68 圈（GPT r67 第二轮）：出手的彩色碎粒团 → 沿发射方向展开的粉色流线
  },
  qwen: {
    fan: (s, f, yb, h, front) => { if (!front || f.t < 5 || f.t > 20) return; const q = (f.t - 5) / 15; SGX('sg_fanfire', f.x + f.face * h * 0.2, yb - h * 0.62, h * (0.9 + 0.3 * q), 0, Math.sin(Math.min(1, q * 1.4) * Math.PI) * 1.1, f.face < 0); },
    spin: (s, f, yb, h, front) => { if (f.t < 6 || f.mv.land) return; SGX('sg_fanring', f.x, yb - h * 0.45, h * 1.35, Math.sin(f.t * 0.6) * 0.08, front ? 0.55 : 0.95, Math.floor(f.t / 4) % 2 === 1, front ? 0.75 : 1); },
    superbee: (s, f, yb, h, front) => { if (front) return; SGX('sg_spear', f.x - f.face * h * 0.5, yb - h * 0.34, h * (1.5 + 0.15 * Math.sin(f.t * 0.7)), 0, 0.95, f.face < 0); if (f.t % 8 < 4) SGX('sg_fanfire', f.x - f.face * h * 0.1, yb - h * 0.4, h * 0.8, 1.57, 0.5, f.face < 0); },
    elbow: (s, f, yb, h, front) => { if (front || f.t < 6 || f.t > 24) return; const q = (f.t - 6) / 18; SGX('sg_spear', f.x - f.face * h * 0.35, yb - h * 0.32, h * (1.0 + 0.3 * Math.sin(q * Math.PI)), 0, 1 - q * 0.6, f.face < 0); },
    bflip: (s, f, yb, h, front) => { if (front || f.mv.land || f.t < 20) return; SGX('sg_spear', f.x - f.face * h * 0.3, yb - h * 0.4, h * 1.1, -0.8, 0.9, f.face < 0); },
    dive: (s, f, yb, h, front) => SIGFX.qwen.bflip(s, f, yb, h, front),
  },
};
function spFx(s, f, p, x, yb, h, flip, front) {
  if (!s._rfx) s._rfx = { last: {} }; const R = s._rfx; R.tr = R.tr || {}; R.sp = R.sp || {}; R.end = R.end || {};
  const id = f.st === 'sp' && f.mv ? f.mv.id : null, on = id && !NOFX.test(id) && !p.lie && !s.cine, ex = on && f.mv.ex, col = ex ? '#FFD23C' : f.ch.col2, el = THEME[f.id], fc = f.face, t = f.t;
  if (front) {      // 记录轨迹 / 收招（每步只记一次）
    if (R.sp[f.idx + 'f'] !== s.f) { R.sp[f.idx + 'f'] = s.f; const T = R.tr[f.idx] || (R.tr[f.idx] = []);
      if (on && f.box) { const b = f.box, seg = f.mv.n || 0; T.push({ x: f.x + fc * b.x1 * 0.8, y: yb - (b.y0 + b.y1) / 2, f: s.f, c: seg }); } while (T.length && (s.f - T[0].f > 8 || T.length > 14)) T.shift(); if (!on) T.length = 0;
      if (R.sp[f.idx] && !on) R.end[f.idx] = { f: s.f, x: f.x, y: yb - h * 0.45, col: R.sp[f.idx], el }; R.sp[f.idx] = on ? col : null; }
    const E0 = R.end[f.idx]; if (E0 && s.f - E0.f < 26) { const q = (s.f - E0.f) / 26; g.save(); for (let i = 0; i < 6; i++) { const r0 = hash(i * 3.3 + E0.f), xx = E0.x + (r0 - 0.5) * h * 0.7, yy = E0.y + (hash(i + E0.f) - 0.3) * h * 0.5 - q * 70; g.globalAlpha = 0.35 * (1 - q); g.fillStyle = i % 2 ? E0.col : '#C8CCD8'; g.beginPath(); g.arc(xx, yy, 14 + q * 30 * (0.6 + r0), 0, 7); g.fill(); } g.restore(); }      // 收招：余烟慢慢散
  }
  if (s.ctrl && s.ctrl.includes('human') && !p.lie) driveInk(s, f, yb, h, front);      // 第 33 圈：Drive 墨迹
  if (front && (f.id === 'glm' || f.id === 'dou') && s.ctrl && s.ctrl[f.idx] === 'human' && !p.lie && !s.cine && f.st !== 'sp') chargeFx(s, f, yb, h);      // 蓄力进度（第 27 圈）
  if (front && f.id === 'dou' && f.st === 'sp' && f.mv && f.mv.id === 'pose' && !p.lie && !s.cine) douPoseFx(s, f, yb, h);
  if (front && f.id === 'claude' && f.st === 'sp' && f.mv && /counter$/.test(f.mv.id) && !p.lie && !s.cine) clCounterFx(s, f, yb, h);
  if (front && f.id === 'qwen' && f.coupon > 0 && !p.lie && !s.cine) for (let i = 0; i < f.coupon; i++) { const bob = Math.sin(s.f * 0.08 + i * 1.3) * 6; themeEl('coupon', f.x - f.face * h * (0.36 + i * 0.03), yb - h * (0.5 + i * 0.13) + bob, 17, -f.face * 0.25 + i * 0.12, 0.95, '#FF8A3D'); }      // 千问：手里攒的满减券（第 23 圈）
  if (!on) return;
  if (!NOSIG && SIGFX[f.id] && SIGFX[f.id][id] && IM['x:sg_palm']) { _sgHit = false; SIGFX[f.id][id](s, f, yb, h, front, ex); if (front && _sgHit) s._sgxF = s.f; }      // 第 47 圈：招牌必杀专属特效贴图（GPT 出图，assets/fx/sg_*）
  const kick = KICKISH.test(id), px = x + fc * h * (kick ? 0.3 : 0.26), py = yb - h * (kick ? 0.28 : 0.56);      // 攻击部位（拳 / 脚 / 尾 / 爪……）大概的位置
  if (!front) {
    if (t < 14 && f.y <= 1) { const q = t / 14; g.save(); g.strokeStyle = rgba(col, 0.7 * (1 - q)); g.lineWidth = 6 * (1 - q) + 1; g.beginPath(); g.ellipse(f.x, yb + 4, h * (0.25 + 0.75 * E.out3(q)), h * (0.05 + 0.12 * E.out3(q)), 0, 0, 7); g.stroke(); if (ex) { g.strokeStyle = rgba('#FFF2B0', 0.6 * (1 - q)); g.beginPath(); g.ellipse(f.x, yb + 4, h * (0.4 + 1.1 * E.out3(q)), h * (0.08 + 0.18 * E.out3(q)), 0, 0, 7); g.stroke(); } g.restore(); }      // 脚下扩散的波纹（EX 两圈）
    if (RISEMV.test(id) && f.y > 10) { const a = Math.min(1, f.vy > 0 ? 1 : 0.4); g.save(); g.globalCompositeOperation = 'lighter'; const gw = h * 0.36, y0 = yb + f.y, y1 = yb - h * 0.8, cy = y1 + (y0 - y1) * 0.42, ry = (y0 - y1) * 0.62; g.translate(f.x, cy); g.scale(gw / ry, 1); g.fillStyle = rg(0, 0, 0, ry, [rgba('#FFFFFF', 0.22 * a), [0.35, rgba(col, 0.3 * a)], [0.7, rgba(col, 0.12 * a)], [1, rgba(col, 0)]]); g.beginPath(); g.arc(0, 0, ry, 0, 7); g.fill(); g.restore(); }      // 升龙：上升气流柱（第 70 圈：原来是竖向渐变的矩形，左右是硬边 → 改成椭圆径向渐隐）
    if (SPINMV.test(id) && f.y < 200 && f.id !== 'gem' && f.id !== 'grok') ring(false);
    if (f.y <= 1 && Math.abs(f.vx) > 420) { for (let i = 3; i >= 1; i--) spr(p.name, x - f.vx / 60 * i * 3.4, yb + p.dy, h, { flip, rot: p.rot, sx: p.sx, sy: p.sy, a: 0.24 / i, env: { col, a: 0.85, bot: 0 } }); }      // 突进：身后残影
    if (f.id === 'ds') dsSpFx(s, f, x, yb, h, col, ex, 0);
    if (f.id === 'gem') gemSpFx(s, f, x, yb, h, col, ex, 0);
    if (f.id === 'gpt') gptSpFx(s, f, x, yb, h, col, ex, 0);
    if (f.id === 'qwen') qwSpFx(s, f, x, yb, h, col, ex, 0);
    if (f.id === 'grok') grokSpFx(s, f, x, yb, h, col, ex, 0);
    if (f.id === 'claude') clSpFx(s, f, x, yb, h, col, ex, 0);
    if (f.id === 'kimi') kmSpFx(s, f, x, yb, h, col, ex, 0);
    if (f.id === 'glm') glmSpFx(s, f, x, yb, h, col, ex, 0);
    if (f.id === 'dou') douSpFx(s, f, x, yb, h, col, ex, 0);
    return;
  }
  function ring(fr) {      // 旋转类：腰部一圈风刃（后半圈画在身后，前半圈画在身前）
    const cy = yb - h * (id === 'lwindmill' || id === 'bakkai' ? 0.15 : 0.42), rx = h * 0.62, ry = h * 0.16, sp = s.f * 0.45 * fc; g.save(); g.lineCap = 'round';
    for (let i = 0; i < 5; i++) { const a0 = sp + i * 1.2566; for (let j = 0; j < 7; j++) { const an = a0 + j * 0.09, sn = Math.sin(an); if ((sn > 0) !== fr) continue; g.strokeStyle = rgba(j < 2 ? '#FFFFFF' : col, (0.85 - j * 0.1) * (fr ? 1 : 0.6)); g.lineWidth = 9 - j; g.beginPath(); g.ellipse(f.x, cy, rx, ry, 0, an, an + 0.08); g.stroke(); } }
    g.restore(); }
  if (SPINMV.test(id) && f.y < 200 && f.id !== 'gem' && f.id !== 'grok') ring(true);
  if (t < 12) { const q = t / 12; for (let i = 0; i < 10; i++) { const an = i * 0.628 + hash(f.swing + i) * 0.5, r0 = h * (0.55 - 0.45 * E.in2(q)) * (0.7 + hash(i * 2.1) * 0.5); themeEl(i % 3 ? 'dot' : el, px + Math.cos(an) * r0, py + Math.sin(an) * r0 * 0.8, 7, an, (1 - q) * 0.9, col); if (i % 3) { g.save(); g.fillStyle = rgba(i % 2 ? '#FFFFFF' : col, 0.9 * (1 - q)); g.beginPath(); g.arc(px + Math.cos(an) * r0, py + Math.sin(an) * r0 * 0.8, 5, 0, 7); g.fill(); g.restore(); } }      // 起手：主题碎片和光点往攻击部位收
    glow(px, py, h * 0.12 * (0.6 + q), col, 0.5 * (0.4 + q)); }      // 攻击部位亮起
  const T = R.tr[f.idx] || []; if (T.length >= 2) { g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; const SEG = ['#FFFFFF', '#FFE066', '#FF8A3D', '#FF4D6D'];      // 出手：顺着判定框前端的真实轨迹画拖尾（派生每段颜色递进）
    for (let pass = 0; pass < 2; pass++) for (let i = 1; i < T.length; i++) { const A = T[i - 1], B = T[i], age = (s.f - B.f) / 8, w = (1 - age) * (pass ? 10 : 30) * (ex ? 1.3 : 1); if (w <= 0) continue; const c0 = B.c ? SEG[Math.min(3, B.c)] : col; g.strokeStyle = pass ? rgba('#FFFFFF', 0.9 * (1 - age)) : rgba(c0, 0.55 * (1 - age)); g.lineWidth = w; g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(B.x, B.y); g.stroke(); }
    const B = T[T.length - 1]; if (s.f - B.f < 2) { star4(B.x, B.y, 46 * (ex ? 1.4 : 1), s.f * 0.3, '#FFFFFF', 0.8); star4(B.x, B.y, 34, s.f * 0.3 + 0.78, col, 0.7); }
    g.restore(); }
  if (f.y <= 1 && Math.abs(f.vx) > 420) { const d = Math.sign(f.vx), cx = f.x + d * h * 0.42, cy = yb - h * 0.45; g.save(); g.fillStyle = lg(cx, 0, cx + d * h * 0.36, 0, [rgba('#FFFFFF', 0.3), rgba(col, 0.14), rgba(col, 0)]); g.beginPath(); g.moveTo(cx, cy - h * 0.22); g.lineTo(cx + d * h * 0.36, cy); g.lineTo(cx, cy + h * 0.22); g.closePath(); g.fill();      // 突进：前方冲击锥 + 脚下擦出的火星
    for (let i = 0; i < 6; i++) { const q = ((s.f * 1.7 + i * 7) % 12) / 12, sx = f.x - d * (20 + q * 160) + (hash(i) - 0.5) * 30, sy = yb - 4 - q * 40 * hash(i + 3); g.strokeStyle = rgba(i % 2 ? '#FFE066' : '#FFFFFF', 1 - q); g.lineWidth = 3; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - d * 18, sy + 6); g.stroke(); } g.restore(); }
  if (f.y > 30 && f.vy < -300) { const d = Math.sign(f.vx) || fc; g.save(); g.lineCap = 'round'; for (let i = 0; i < 6; i++) { const ox = (hash(i * 1.9 + f.swing) - 0.5) * h * 0.5, L = 90 + hash(i + s.f) * 90; g.strokeStyle = rgba(i % 2 ? '#FFFFFF' : col, 0.5); g.lineWidth = 5; g.beginPath(); g.moveTo(f.x + ox - d * 30, yb - h * 0.5 + ox * 0.3 - 40); g.lineTo(f.x + ox - d * (30 + L * 0.6), yb - h * 0.5 + ox * 0.3 - 40 - L); g.stroke(); } g.restore(); }      // 往下砸：斜向流光
  if (f.id === 'ds') dsSpFx(s, f, x, yb, h, col, ex, 1);
  if (f.id === 'gem') gemSpFx(s, f, x, yb, h, col, ex, 1);
  if (f.id === 'gpt') gptSpFx(s, f, x, yb, h, col, ex, 1);
  if (f.id === 'qwen') qwSpFx(s, f, x, yb, h, col, ex, 1);
  if (f.id === 'grok') grokSpFx(s, f, x, yb, h, col, ex, 1);
  if (f.id === 'claude') clSpFx(s, f, x, yb, h, col, ex, 1);
  if (f.id === 'kimi') kmSpFx(s, f, x, yb, h, col, ex, 1);
  if (f.id === 'glm') glmSpFx(s, f, x, yb, h, col, ex, 1);
  if (f.id === 'dou') douSpFx(s, f, x, yb, h, col, ex, 1);
}
// 大肥鱼专属（第 20 圈）：鲸鱼顶 = 水柱 + 顶端水花；鲸尾回旋 = 尾巴甩出的水花环；加班连打 = 每段一道新月刀光（白 → 金 → 橙）；饭盆砸 = 落地掀起一圈饭粒浪；鲸鳍下踢 = 斜向水痕；摸鱼步 = 脚下水波纹
function drop(x, y, r, an, a) { g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(an); g.fillStyle = '#9FDBFF'; g.strokeStyle = '#1F6FD1'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -r * 1.6); g.quadraticCurveTo(r, 0, 0, r); g.quadraticCurveTo(-r, 0, 0, -r * 1.6); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-r * 0.3, -r * 0.1, r * 0.25, 0, 7); g.fill(); g.restore(); }
function dsSpFx(s, f, x, yb, h, col, ex, front) {
  const id = f.mv.id, t = f.t, fc = f.face, M = f.mv, wc = ex ? '#FFE48A' : '#7FD0FF';
  if (!front) { if ((id === 'dp' || id === 'dpk') && f.y > 5 && !IM['x:sg_breach']) {      // 水柱从脚下冲上来（画在人身后），顶上一圈水花
    const top = yb - h * 0.7, bot = yb + f.y; g.save(); g.fillStyle = lg(0, bot, 0, top, [rgba(wc, 0.12), rgba(wc, 0.7), rgba('#FFFFFF', 0.75)]); const w0 = h * 0.26; g.beginPath(); g.moveTo(f.x - w0 * 1.4, bot); for (let k = 0; k <= 8; k++) { const yy = bot + (top - bot) * k / 8; g.lineTo(f.x - w0 * (1.4 - 0.6 * k / 8) + Math.sin(k * 1.3 + s.f * 0.6) * 8, yy); } for (let k = 8; k >= 0; k--) { const yy = bot + (top - bot) * k / 8; g.lineTo(f.x + w0 * (1.4 - 0.6 * k / 8) + Math.cos(k * 1.1 + s.f * 0.6) * 8, yy); } g.closePath(); g.fill(); g.restore();
    for (let i = 0; i < 9; i++) { const q = ((s.f * 1.3 + i * 5) % 18) / 18, an = -Math.PI / 2 + (hash(i * 2.3) - 0.5) * 2.4, sp = h * (0.32 + 0.38 * hash(i)); drop(f.x + Math.cos(an) * sp * q, top + Math.sin(an) * sp * q + 160 * q * q, 9.5, an + Math.PI / 2, 1 - q); }
  } return; }
  if (id === 'bakkai' && t >= 8) { const cy = yb - h * 0.12; for (let i = 0; i < 10; i++) { const q = ((s.f * 1.5 + i * 3.1) % 14) / 14, an = s.f * 0.45 * fc + i * 0.628, rx = h * 0.6, px = f.x + Math.cos(an) * rx, py = cy + Math.sin(an) * h * 0.14, tx = -Math.sin(an) * fc, dist = 120 * q; drop(px + tx * dist, py - 60 * q + 120 * q * q, 8.5, an, 1 - q * q); } }      // 尾巴甩出的水花
  if (id === 'otk' && f.box) { const n = M.n || 0, c = ['#FFFFFF', '#FFE066', '#FF9A3D', '#FF5C7A'][Math.min(3, n)], b = f.box, cx = f.x + fc * (b.x0 + b.x1) * 0.5, cy = yb - (b.y0 + b.y1) / 2, R0 = Math.max(70, (b.x1 - b.x0) * 0.72), a0 = n === 1 ? -0.9 : n === 2 ? 0.6 : -0.3;      // 每段一道新月刀光，越往后越暖
    g.save(); g.translate(cx, cy); g.scale(fc, 1); g.rotate(a0); g.shadowColor = c; g.shadowBlur = 18; g.fillStyle = rgba(c, 0.97); g.beginPath(); g.arc(0, 0, R0, -1.25, 1.25); g.arc(R0 * 0.3, 0, R0 * 0.8, 1.15, -1.15, true); g.closePath(); g.fill(); g.shadowBlur = 0; g.strokeStyle = '#FFFFFF'; g.lineWidth = 4; g.stroke(); g.restore(); }
  if (id === 'bslam' && M.land != null && t - M.land < 22) { const q = (t - M.land) / 22; for (let i = 0; i < 16; i++) { const side = i % 2 ? 1 : -1, d = h * (0.2 + 0.9 * E.out3(q)) * (0.6 + hash(i) * 0.5), hy = Math.sin(Math.min(1, q * 1.4) * Math.PI) * h * (0.15 + 0.2 * hash(i + 4)); grain(f.x + side * d, yb - hy, 9, i + q * 8, 1 - q, 0.6); } g.save(); g.strokeStyle = rgba('#FFE066', 0.7 * (1 - q)); g.lineWidth = 8 * (1 - q) + 1; g.beginPath(); g.ellipse(f.x, yb, h * (0.3 + 1.0 * E.out3(q)), h * 0.1 * (1 + q), 0, 0, 7); g.stroke(); g.restore(); }      // 饭粒浪
  if (id === 'ddk' && f.y > 20 && f.vy < 0) for (let i = 0; i < 5; i++) drop(f.x - fc * (30 + i * 38), yb - h * 0.35 - i * 34, 10.5 - i, -fc * 0.8, 0.95 - i * 0.14);      // 鲸鳍下踢：身后一串水痕
  if (id === 'mstep' && f.y <= 1 && t % 10 < 8) { const q = (t % 10) / 8; g.save(); g.strokeStyle = rgba('#9FDBFF', 0.85 * (1 - q)); g.lineWidth = 4.5; g.beginPath(); g.ellipse(f.x, yb + 2, 36 + 90 * q, 7 + 15 * q, 0, 0, 7); g.stroke(); g.restore(); }      // 摸鱼步：一步一圈水波
}
// 哈基米专属（第 21 圈）：炸毛升天 = 身边噼啪的紫电 + 炸开的毛；三段爪 = 三道爪痕逐段加深（淡紫 → 紫 → 深紫带品红光）；追尾巴（214 脚）= 腰间一圈转着的爪痕 + 尾巴光带；
// 猫猫拳 = 每下在拳头位置盖一个猫爪印；踩奶 = 每踩一下对手身上一个爪印；后跃斜爪 / 空中斜爪 = 顺着扑下来的方向拖三道爪痕
function clawMark(x, y, L, an, w, col, a, glowc) {      // 三道平行、两头尖的弯爪痕
  if (a <= 0.01) return; g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(an); if (glowc) { g.shadowColor = glowc; g.shadowBlur = 16; }
  for (let i = -1; i <= 1; i++) { const oy = i * w * 2.4, l = L * (i ? 0.86 : 1); g.fillStyle = col; g.strokeStyle = 'rgba(40,6,70,0.85)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-l / 2, oy); g.quadraticCurveTo(0, oy - w * 1.6 - l * 0.06, l / 2, oy); g.quadraticCurveTo(0, oy - w * 0.2 - l * 0.06, -l / 2, oy); g.fill(); g.stroke(); }
  g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = -1; i <= 1; i++) { const oy = i * w * 2.4 - w * 0.5, l = L * (i ? 0.6 : 0.72); g.beginPath(); g.moveTo(-l / 2, oy); g.quadraticCurveTo(0, oy - w * 0.7 - l * 0.06, l / 2, oy); g.quadraticCurveTo(0, oy - w * 0.1 - l * 0.06, -l / 2, oy); g.fill(); }
  g.restore(); }
function bolt(x0, y0, x1, y1, seed, w, col, a) {      // 一道折线闪电（白芯 + 彩边）
  const n = 6, P = []; for (let i = 0; i <= n; i++) { const k = i / n, j = i && i < n ? (hash(seed + i * 1.7) - 0.5) * 46 : 0; P.push([x0 + (x1 - x0) * k + j, y0 + (y1 - y0) * k + j * 0.4]); }
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; g.lineCap = 'round'; for (const [c, lw] of [[rgba(col, 0.55 * a), w * 2.6], [rgba(col, a), w], [rgba('#FFFFFF', a), w * 0.4]]) { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); P.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke(); } g.restore(); }
function gemSpFx(s, f, x, yb, h, col, ex, front) {
  const id = f.mv.id, t = f.t, fc = f.face, M = f.mv, R = s._rfx, pc = ex ? '#FFD23C' : '#C77DFF', deep = ex ? '#FF9F1C' : '#7A2BB5';
  if (!R.gem) R.gem = {}; const G = R.gem[f.idx] || (R.gem[f.idx] = { marks: [] });
  if (!front) {
    if (id === 'dp' && (f.y > 4 || t < 10)) { const a = f.y > 4 ? 1 : t / 10; for (let i = 0; i < 4; i++) { const sd = Math.floor(s.f / 2) * 7.3 + i * 13, an = -Math.PI / 2 + (i - 1.5) * 0.55, r0 = h * 0.18, r1 = h * (0.55 + 0.25 * hash(sd)); bolt(f.x + Math.cos(an) * r0, yb - h * 0.45 + Math.sin(an) * r0, f.x + Math.cos(an) * r1, yb - h * 0.45 + Math.sin(an) * r1 * 1.1, sd, 7, pc, a * (0.6 + 0.4 * hash(sd + 3))); } }      // 炸毛升天：身后往外炸的紫电
    if (id === 'spin' && f.y < 200) clawRing(false);
    return;
  }
  function clawRing(fr) {      // 追尾巴：腰间一圈转着的爪痕（后半圈在身后、前半圈在身前）
    const cy = yb - h * 0.38, rx = h * 0.62, ry = h * 0.16, sp = s.f * 0.42 * fc;
    for (let i = 0; i < 4; i++) { const an = sp + i * 1.5708, sn = Math.sin(an); if ((sn > 0) !== fr) continue; clawMark(f.x + Math.cos(an) * rx, cy + sn * ry, 70 + 20 * sn, -fc * 0.35 + (Math.cos(an) > 0 ? 0.2 : -0.2), 5, rgba(sn > 0 ? deep : pc, 0.9), fr ? 1 : 0.55, fr ? pc : 0); }
    if (fr) { g.save(); g.lineCap = 'round'; for (let j = 0; j < 10; j++) { const an = sp - fc * j * 0.12 + 0.9; g.strokeStyle = rgba(j < 3 ? '#FFFFFF' : '#FF8AD8', 0.7 - j * 0.06); g.lineWidth = 10 - j * 0.7; g.beginPath(); g.ellipse(f.x, cy + h * 0.1, rx * 0.8, ry * 0.9, 0, an, an + 0.13); g.stroke(); } g.restore(); } }      // 尾巴尖的粉色光带
  if (id === 'spin' && f.y < 200) clawRing(true);
  if (id === 'dp' && f.y > 4) { for (let i = 0; i < 3; i++) { const sd = Math.floor(s.f / 2) * 3.1 + i * 29, an = -Math.PI / 2 + (hash(sd) - 0.5) * 2.6, r1 = h * (0.4 + 0.25 * hash(sd + 1)); bolt(f.x + fc * h * 0.15, yb - h * 0.75, f.x + fc * h * 0.15 + Math.cos(an) * r1, yb - h * 0.75 + Math.sin(an) * r1, sd, 5, pc, 0.8); }      // 前面再几道细电 + 炸起来的毛
    g.save(); g.strokeStyle = rgba(deep, 0.8); g.lineWidth = 3; g.lineCap = 'round'; for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + (i - 4.5) * 0.3, r0 = h * 0.42, L = 22 + 14 * hash(i + Math.floor(s.f / 3)); g.beginPath(); g.moveTo(f.x + Math.cos(an) * r0, yb - h * 0.6 + Math.sin(an) * r0); g.lineTo(f.x + Math.cos(an) * (r0 + L), yb - h * 0.6 + Math.sin(an) * (r0 + L)); g.stroke(); } g.restore(); }
  // 有判定框时记一道爪痕 / 爪印，之后淡出（不跟着人走）
  const key = f.box && f.box.id;
  if (key && G.k !== key) { G.k = key; const b = f.box, bx = f.x + fc * (b.x0 + b.x1) * 0.5, by = yb - (b.y0 + b.y1) / 2;
    if (id === 'claw3') { const n = M.n || 0; G.marks.push({ f: s.f, x: bx + fc * 20, y: by - 10, L: [200, 240, 320][n] || 200, an: fc * [-0.7, 0.75, -1.25][n], w: [6, 8.5, 12][n], c: [ex ? '#FFE9A8' : '#E6C8FF', pc, deep][n], gl: n === 2 ? (ex ? '#FFD23C' : '#FF4FD8') : n === 1 ? pc : 0, life: 24 + n * 6, k: 'c' }); }
    else if (id === 'flurry') G.marks.push({ f: s.f, x: f.x + fc * b.x1 * 0.85, y: by + (hash(s.f) - 0.5) * 80, r: 26, an: fc * (hash(s.f + 1) - 0.5), life: 16, k: 'p' });
    else if (id === 'knead') G.marks.push({ f: s.f, x: f.x + fc * b.x1 * 0.7, y: yb - h * (M.got ? 0.25 + 0.15 * hash(s.f) : 0.15), r: M.got ? 34 : 24, an: 0, life: 22, k: 'p' });
    else if (id === 'bclaw' || id === 'aclaw') G.marks.push({ f: s.f, x: bx, y: by, L: 200, an: fc * 0.9, w: 7, c: pc, gl: deep, life: 16, k: 'c' }); }
  if (!key) G.k = null;
  for (const m of G.marks) { const q = (s.f - m.f) / m.life; if (q >= 1) continue; const a = q < 0.6 ? 1 : (1 - q) / 0.4;
    if (m.k === 'c') clawMark(m.x, m.y, m.L * (0.6 + 0.4 * E.out3(Math.min(1, q * 4))), m.an, m.w, m.c, a, m.gl);
    else { themeEl('paw', m.x, m.y, m.r * (1 + 0.5 * E.out3(Math.min(1, q * 3))), m.an, a, pc); if (q < 0.3) glow(m.x, m.y, m.r * 3, pc, 0.4 * (1 - q / 0.3)); } }
  G.marks = G.marks.filter(m => s.f - m.f < m.life);
  if ((id === 'bclaw' || id === 'aclaw') && f.y > 20 && f.vy < 0) for (let i = 1; i <= 3; i++) clawMark(f.x - fc * i * 46, yb - h * 0.45 - i * 40, 120 - i * 20, fc * 0.9, 5, rgba(pc, 0.8), 0.7 - i * 0.18, 0);      // 扑下来的路线上拖着爪痕
}
// GPT 专属（第 22 圈）：派生每段在打点处「盖」一个关键词（首先 / 其次 / 最后、总之 / 换句话说 / 综上所述）+ 带龙鳞齿边的刀光；升龙 = 一条白龙鳞带绕身上旋；
// 两段蹬踢 = 竖向龙鳞弧；龙翼突进 = 身后一对半透明龙翼 + 鳞片拖尾；旋风腿 = 腰间一圈转着的字符；敲黑板 = 粉笔灰拖尾 + 落地粉笔字
function scaleArc(cx, cy, R, a0, a1, w, col, a, dir) {      // 外沿带一排鳞片齿的弧形刀光
  if (a <= 0.01) return; g.save(); g.globalAlpha *= a; g.translate(cx, cy); g.scale(dir, 1); g.fillStyle = rgba(col, 0.9); g.strokeStyle = '#FFFFFF'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, R, a0, a1); g.arc(0, 0, R - w, a1, a0, true); g.closePath(); g.fill(); g.stroke();
  const n = Math.max(3, Math.round((a1 - a0) * R / 34)); g.fillStyle = '#FFFFFF'; g.strokeStyle = rgba(col, 1); g.lineWidth = 2; for (let i = 0; i <= n; i++) { const an = a0 + (a1 - a0) * i / n; g.save(); g.translate(Math.cos(an) * R, Math.sin(an) * R); g.rotate(an + Math.PI / 2); g.beginPath(); g.moveTo(-9, 0); g.quadraticCurveTo(0, -16, 9, 0); g.closePath(); g.fill(); g.stroke(); g.restore(); }
  g.restore(); }
const GPT_W = { kyo3: ['首先', '其次', '其次', '最后', '最后'], kyo3b: ['总之', '换句话说', '综上所述'] };
function gptSpFx(s, f, x, yb, h, col, ex, front) {
  const id = f.mv.id, t = f.t, fc = f.face, M = f.mv, R = s._rfx, pc = ex ? '#FFD23C' : '#8E7CF0', ink = ex ? '#B86A00' : '#3E2FA8';
  if (!R.gpt) R.gpt = {}; const G = R.gpt[f.idx] || (R.gpt[f.idx] = { marks: [] });
  function dragon(fr) {      // 升龙：一条紫白龙鳞带螺旋绕身往上（后半圈身后、前半圈身前），顶端一颗龙头光点
    const top = yb - h * 1.1, bot = yb + 20, n = 30, ph = s.f * 0.35 * fc, P = [];
    for (let i = 0; i <= n; i++) { const k = i / n, an = ph + k * 8.2; P.push([f.x + Math.cos(an) * h * (0.5 - 0.22 * k), bot + (top - bot) * k, Math.sin(an), k]); }
    g.save(); g.lineCap = 'round'; for (let i = 1; i <= n; i++) { const [x0, y0] = P[i - 1], [x1, y1, sn, k] = P[i]; if ((sn > 0) !== fr) continue; const a = (fr ? 0.85 : 0.55) * (0.35 + 0.65 * k);
      g.strokeStyle = rgba('#FFFFFF', a); g.lineWidth = 34 * (0.5 + 0.5 * k); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = rgba(pc, a); g.lineWidth = 24 * (0.5 + 0.5 * k); g.stroke();
      if (i % 2 === 0) { g.save(); g.translate(x1, y1); g.rotate(Math.atan2(y1 - y0, x1 - x0)); g.globalAlpha = a; g.fillStyle = '#F4F1FF'; g.strokeStyle = ink; g.lineWidth = 2.5; const r = 11 * (0.6 + 0.6 * k); g.beginPath(); g.moveTo(-r, r * 0.4); g.quadraticCurveTo(0, -r * 1.3, r, r * 0.4); g.quadraticCurveTo(0, -r * 0.1, -r, r * 0.4); g.fill(); g.stroke(); g.restore(); } }
    g.restore(); if (fr) { const [hx, hy] = P[n]; glow(hx, hy, 80, pc, 0.6); star4(hx, hy, 46, s.f * 0.2, '#FFFFFF', 0.95); } }
  if (!front) {
    if (id === 'dp' && (f.y > 4 || t < 8)) dragon(false);
    if (id === 'wing' && t >= 8 && t < 30) { const q = Math.min(1, (t - 8) / 5) * (t > 24 ? (30 - t) / 6 : 1); for (const sg of [1, -1]) { g.save(); g.translate(f.x - fc * h * 0.08, yb - h * 0.66); g.scale(-fc * 0.75, sg > 0 ? 0.75 : 0.6); g.rotate(sg > 0 ? -0.5 : 0.15); g.globalAlpha = 0.75 * q * (sg > 0 ? 1 : 0.6); g.fillStyle = lg(0, 0, h * 0.75, 0, [rgba(pc, 0.9), rgba('#E4DEFF', 0.5)]); g.strokeStyle = '#FFFFFF'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(h * 0.3, -h * 0.45, h * 0.78, -h * 0.38); for (let k = 0; k < 4; k++) g.quadraticCurveTo(h * (0.7 - k * 0.17), -h * (0.18 - k * 0.02), h * (0.6 - k * 0.17), -h * (0.05 - k * 0.04)); g.closePath(); g.fill(); g.stroke(); g.strokeStyle = rgba(ink, 0.6); g.lineWidth = 3; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(h * (0.62 - k * 0.17), -h * (0.3 - k * 0.07)); g.stroke(); } g.restore(); } }      // 龙翼突进：身后一对半透明龙翼
    return;
  }
  if (id === 'dp' && f.y > 4) dragon(true);
  if (id === 'spin' && f.y < 200) { const cy = yb - h * 0.4, rx = h * 0.62, ry = h * 0.15, sp = s.f * 0.4 * fc, CH = ['A', 'I', '{', '}', '#', '?', '1', '0']; for (let i = 0; i < 8; i++) { const an = sp + i * 0.785, sn = Math.sin(an); txt(CH[i], f.x + Math.cos(an) * rx, cy + sn * ry + 12, { size: 46 + 14 * sn, w: 900, fam: F.en, fill: sn > 0 ? '#FFFFFF' : pc, stroke: ink, sw: 5, align: 'center', a: sn > 0 ? 1 : 0.45 }); } }      // 旋风腿：腰间一圈转着的字符
  if (id === 'wing' && t >= 10 && t < 28) for (let i = 1; i <= 6; i++) themeEl('scale', f.x - fc * (h * 0.2 + i * 40), yb - h * (0.45 + 0.12 * Math.sin(i * 1.7 + s.f * 0.3)), 15 - i, fc * 1.57, 1 - i * 0.14, pc);      // 鳞片拖尾
  if (id === 'gdive' && !M.land && t >= 3) { g.save(); g.lineCap = 'round'; for (let i = 0; i < 5; i++) { const ox = (i - 2) * 16; g.strokeStyle = `rgba(255,255,255,${0.7 - i * 0.08})`; g.lineWidth = 10 - Math.abs(i - 2) * 2; g.beginPath(); g.moveTo(f.x + ox - fc * 10, yb - h * 0.15); g.lineTo(f.x + ox - fc * 60, yb - h * 0.15 - 160); g.stroke(); } g.restore(); }      // 敲黑板：粉笔灰拖尾
  if (id === 'gdive' && M.land != null && t - M.land < 24) { const q = (t - M.land) / 24; txt('划重点', f.x + fc * 40, yb - 30 - q * 30, { size: 46, w: 900, fill: '#FFFFFF', stroke: '#2C3A33', sw: 8, align: 'center', a: 1 - q * q, rot: -0.08 * fc }); for (let i = 0; i < 10; i++) { const r0 = hash(i * 3.1), d = h * (0.2 + 0.7 * E.out3(q)) * (0.5 + r0); g.save(); g.globalAlpha = 0.6 * (1 - q); g.fillStyle = '#F2F2F2'; g.beginPath(); g.arc(f.x + (i % 2 ? 1 : -1) * d, yb - 10 - q * 40 * r0, 10 + q * 16, 0, 7); g.fill(); g.restore(); } }
  const key = f.box && f.box.id;
  if (key && G.k !== key) { G.k = key; const b = f.box, bx = f.x + fc * (b.x0 + b.x1) * 0.55, by = yb - (b.y0 + b.y1) / 2, n = M.n || 0;
    if (GPT_W[id]) { const w = GPT_W[id][n] || '', up = (id === 'kyo3' && n === 3) || (id === 'kyo3b' && n === 1), down = (id === 'kyo3' && (n === 4 || n === 2)) || (id === 'kyo3b' && n === 2); G.marks.push({ f: s.f, k: 'w', w, x: f.x + fc * h * 0.12, y: yb - h * 1.08, bx, by, n: id === 'kyo3b' ? n + 1 : Math.min(3, n), up, down, life: 26 }); }
    else if (id === 'dkick') G.marks.push({ f: s.f, k: 'a', bx, by, up: /_a$/.test(key), life: 16 }); }
  if (!key) G.k = null;
  const SEGC = ['#FFFFFF', '#C9BEFF', '#8E7CF0', '#5B3FE0'];
  for (const m of G.marks) { const q = (s.f - m.f) / m.life; if (q >= 1) continue; const a = q < 0.5 ? 1 : (1 - q) / 0.5, c = ex ? '#FFD23C' : SEGC[Math.min(3, m.n || 0)];
    if (m.k === 'w' || m.k === 'a') { const R0 = h * (m.k === 'a' ? 0.5 : 0.42) * (0.75 + 0.25 * E.out3(Math.min(1, q * 4))); if (m.k === 'a') scaleArc(m.bx - fc * R0 * 0.55, m.by, R0 * 0.8, -1.3, 0.9, 20, c, a, fc); else if (m.up) scaleArc(m.bx - fc * R0 * 0.4, m.by + R0 * 0.3, R0, -2.2, -0.4, 22, c, a, fc); else if (m.down) scaleArc(m.bx - fc * R0 * 0.5, m.by - R0 * 0.4, R0, -0.4, 1.3, 22, c, a, fc); else scaleArc(m.bx - fc * R0 * 0.6, m.by, R0, -1.0, 1.0, 20, c, a, fc); }
    if (m.k === 'w') { const pop = 1 + 0.5 * Math.max(0, 1 - q * 6), ww = Math.max(110, m.w.length * 40 + 30); g.save(); g.globalAlpha *= a; g.translate(m.x, m.y - q * 26); g.scale(pop, pop); g.rotate(-0.06 * fc); rr(-ww / 2, -28, ww, 50, 12); g.fillStyle = '#FFFFFF'; g.fill(); g.lineWidth = 5; g.strokeStyle = ex ? '#FFB020' : ink; g.stroke(); g.fillStyle = ex ? '#FFB020' : ink; g.fillRect(-ww / 2 + 8, -20, 6, 34); g.restore(); txt(m.w, m.x + 6, m.y - q * 26 + 10, { size: 32 * pop, w: 900, fill: ink, align: 'center', a, rot: -0.06 * fc }); } }      // 关键词标签（像对话里加粗的小标题）
  G.marks = G.marks.filter(m => s.f - m.f < m.life);
}
// 千问专属（第 23 圈）：飞扇 = 会转、会开合的折扇（扇面有扇骨、红穗子、橙色券纹边）；扇舞旋身 = 两把张开的扇子绕身转 + 扇骨风环；
// 升龙 = 头顶一把大扇子往上张开；贴地突进肘 = 身后一串优惠券纸片 + 前面一把收拢的扇子形冲击锥；翻身肘 / 俯冲踢 / 飞扇滑翔 = 身后拖一道扇形尾迹，落地一圈扇形冲击；
// 带满减券的那一下（mv.cp）整个特效描一圈橙边 + 头顶「满减」小戳
function fanShape(x, y, R, an, span, a, edge) {      // 一把折扇：扇面（米白 + 一圈橙色券纹边）+ 扇骨 + 红轴
  if (a <= 0.01) return; g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(an); g.lineJoin = 'round'; const a0 = -Math.PI / 2 - span / 2, a1 = -Math.PI / 2 + span / 2;
  g.fillStyle = '#FFF4E2'; g.strokeStyle = '#7A2E0C'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, a0, a1); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = edge || '#FF8A3D'; g.lineWidth = R * 0.16; g.beginPath(); g.arc(0, 0, R * 0.9, a0 + 0.03, a1 - 0.03); g.stroke(); g.setLineDash([6, 6]); g.strokeStyle = '#FFFFFF'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, R * 0.9, a0 + 0.03, a1 - 0.03); g.stroke(); g.setLineDash([]);
  g.strokeStyle = 'rgba(122,46,12,0.55)'; g.lineWidth = 2.5; const n = Math.max(3, Math.round(span / 0.22)); for (let k = 0; k <= n; k++) { const q = a0 + (a1 - a0) * k / n; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(q) * R * 0.98, Math.sin(q) * R * 0.98); g.stroke(); }
  g.fillStyle = '#E0475B'; g.beginPath(); g.arc(0, 0, R * 0.12, 0, 7); g.fill(); g.restore(); }
function qwSpFx(s, f, x, yb, h, col, ex, front) {
  const id = f.mv.id, t = f.t, fc = f.face, M = f.mv, pc = ex ? '#FFD23C' : M.cp ? '#FF8A3D' : '#5A63E8', R = s._rfx;
  if (!R.qw) R.qw = {}; const Q = R.qw[f.idx] || (R.qw[f.idx] = {});
  if (!front) {
    if (id === 'dp' && (f.y > 4 || t < 10)) { const q = Math.min(1, (t + 1) / 10); fanShape(f.x + fc * 10, yb - h * 0.5, h * 0.52 * E.out3(q), 0, 0.4 + 2.2 * E.out3(q), 0.6, ex ? '#FFD23C' : '#FF8A3D'); }      // 升龙：身后一把大扇子往上张开
    if ((id === 'bflip' || id === 'dive' || id === 'glide') && M.land != null && t - M.land < 18) { const q = (t - M.land) / 18; fanShape(f.x, yb + 6, h * (0.25 + 0.4 * E.out3(q)), 0, 2.6, 0.6 * (1 - q), ex ? '#FFD23C' : '#FF8A3D'); }      // 落地：脚下一把扇子张开淡出
    if (id === 'spin') { const sp = s.f * 0.5 * fc; g.save(); g.lineCap = 'round'; for (let i = 0; i < 12; i++) { const an = sp + i * 0.52, sn = Math.sin(an); if (sn > 0) continue; g.strokeStyle = rgba(pc, 0.5); g.lineWidth = 4; g.beginPath(); g.moveTo(f.x, yb - h * 0.45); g.lineTo(f.x + Math.cos(an) * h * 0.66, yb - h * 0.45 + sn * h * 0.17); g.stroke(); } g.restore(); }      // 扇骨风环（后半圈）
    return;
  }
  if (id === 'spin') { const sp = s.f * 0.5 * fc; g.save(); g.lineCap = 'round'; for (let i = 0; i < 12; i++) { const an = sp + i * 0.52, sn = Math.sin(an); if (sn <= 0) continue; g.strokeStyle = rgba(i % 2 ? '#FFFFFF' : pc, 0.6); g.lineWidth = 4; g.beginPath(); g.moveTo(f.x + Math.cos(an) * h * 0.3, yb - h * 0.45 + sn * h * 0.08); g.lineTo(f.x + Math.cos(an) * h * 0.66, yb - h * 0.45 + sn * h * 0.17); g.stroke(); } g.restore();
    for (let k = 0; k < 2; k++) { const an = sp + k * Math.PI, sn = Math.sin(an); fanShape(f.x + Math.cos(an) * h * 0.55, yb - h * 0.45 + sn * h * 0.15, h * 0.2, an + Math.PI / 2 * fc, 2.2, sn > 0 ? 1 : 0.5); } }      // 两把张开的扇子绕身转
  if (id === 'elbow' && t >= 6 && t < 24) { for (let i = 1; i <= 6; i++) themeEl('coupon', f.x - fc * (h * 0.2 + i * 44), yb - h * (0.2 + 0.08 * Math.sin(i * 2.1 + s.f * 0.4)) - i * 4, 15, fc * (0.3 + i * 0.4), 1 - i * 0.14, '#FF8A3D'); fanShape(f.x + fc * h * 0.4, yb - h * 0.3, h * 0.28, fc * Math.PI / 2, 0.7, 0.8, ex ? '#FFD23C' : '#FF8A3D'); }      // 优惠券纸片拖尾 + 前面一把收拢的扇子
  if ((id === 'bflip' || id === 'dive' || id === 'glide') && !M.land && f.y > 20 && (id !== 'bflip' || t >= 20) && (id !== 'glide' || M.kick != null)) { const d = Math.sign(f.vx) || fc, ang = Math.atan2(-f.vy, f.vx); g.save(); g.translate(f.x, yb - h * 0.4); g.rotate(-ang + Math.PI); g.globalAlpha = 0.55; g.fillStyle = lg(0, 0, h * 0.9, 0, [rgba(pc, 0.8), rgba(pc, 0)]); g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, h * 0.9, -0.35, 0.35); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(k * 0.16) * h * 0.85, Math.sin(k * 0.16) * h * 0.85); g.stroke(); } g.restore(); }      // 扇形尾迹（顺着运动方向往后张开）
  if (id === 'bflip' && t >= 3 && t < 20) { g.save(); g.strokeStyle = rgba(pc, 0.6); g.lineWidth = 10; g.lineCap = 'round'; const q = (t - 3) / 17; g.beginPath(); g.arc(f.x, yb - h * 0.45, h * 0.55, -Math.PI / 2 - fc * q * 5.5, -Math.PI / 2 - fc * Math.max(0, q - 0.35) * 5.5, fc > 0); g.stroke(); g.restore(); }      // 后翻的圆弧
  if (M.cp && t < 30) { txt('满减', f.x, yb - h * 1.08 - Math.min(t, 8) * 2, { size: 32, w: 900, fill: '#FFFFFF', stroke: '#E8743B', sw: 8, align: 'center', a: Math.min(1, (30 - t) / 8), rot: -0.1 }); }
}
// Grok 专属（第 24 圈）：斧光 = 钢蓝白色的厚新月（axeArc）；大风车 = 胸口高度的斜斧光环（红），下段大风车 = 贴地的扁斧光环（橙）+ 地面火星；
// 投技抓住的瞬间对手身上一个红色取景框 + 「已挂」式的定格，砸地那一下一个大红叉 + 地裂；头槌 = 头顶往上的冲击锥；飞身压 = 下落红色速度线 + 落地红叉冲击；拍掉 = 前面一只发光大手掌
function axeArc(cx, cy, R, a0, a1, w, a, red) {      // 斧光：外沿钢白、里面一层红（或钢蓝）的厚新月
  if (a <= 0.01) return; g.save(); g.globalAlpha *= a; g.translate(cx, cy); g.fillStyle = red ? 'rgba(224,71,91,0.85)' : 'rgba(120,160,210,0.8)'; g.beginPath(); g.arc(0, 0, R, a0, a1); g.arc(0, 0, R - w, a1, a0, true); g.closePath(); g.fill();
  g.fillStyle = 'rgba(245,250,255,0.95)'; g.beginPath(); g.arc(0, 0, R, a0, a1); g.arc(0, 0, R - w * 0.38, a1, a0, true); g.closePath(); g.fill(); g.restore(); }
function bigX(x, y, r, a, rot = 0, sy = 1) { if (a <= 0.01) return; g.save(); g.globalAlpha *= a; g.translate(x, y); g.scale(1, sy); g.rotate(rot); g.lineCap = 'round'; for (const [c, w] of [['#5A0A18', r * 0.34], ['#FF2E2E', r * 0.24], ['#FFFFFF', r * 0.07]]) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(-r, -r); g.lineTo(r, r); g.moveTo(r, -r); g.lineTo(-r, r); g.stroke(); } g.restore(); }
function grokSpFx(s, f, x, yb, h, col, ex, front) {
  const id = f.mv.id, t = f.t, fc = f.face, M = f.mv, op = s.F[1 - f.idx], oy = yb + f.y - op.y - (op.hy || 0), oh = op.ch.h;
  function wring(fr) { const low = id === 'lwindmill', cy = yb - h * (low ? 0.1 : 0.55), rx = h * 0.72, ry = h * (low ? 0.1 : 0.26), sp = s.f * 0.42 * fc, tilt = low ? 0 : -0.25 * fc;
    g.save(); g.translate(f.x, cy); g.rotate(tilt); for (let i = 0; i < 3; i++) { const an = sp + i * 2.094; for (let j = 0; j < 8; j++) { const q = an - fc * j * 0.07, sn = Math.sin(q); if ((sn > 0) !== fr) continue; g.strokeStyle = j < 2 ? 'rgba(255,255,255,0.95)' : rgba(low ? '#FF9A3D' : '#E0475B', 0.85 - j * 0.09); g.lineWidth = (fr ? 16 : 10) - j * 1.2; g.lineCap = 'round'; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, q, q + 0.08); g.stroke(); } } g.restore();
    if (low && fr && t % 3 === 0) for (let i = 0; i < 5; i++) { const q = hash(s.f + i), xx = f.x + (q - 0.5) * rx * 2; g.save(); g.strokeStyle = i % 2 ? '#FFE066' : '#FFFFFF'; g.lineWidth = 3; g.beginPath(); g.moveTo(xx, yb - 2); g.lineTo(xx - fc * 20, yb - 14 - q * 20); g.stroke(); g.restore(); } }      // 下段版：贴地扬起的火星
  if (!front) { if (((id === 'windmill' || id === 'lwindmill') && t >= 4 && t < 54 || id === 'spin' && f.y < 200)) wring(false);
    if (id === 'hbutt' && t >= 8 && t < 20) { const q = (t - 8) / 12; g.save(); g.fillStyle = lg(0, yb - h, 0, yb - h * 1.6, [rgba('#FFD0B0', 0.6 * (1 - q)), rgba('#E0475B', 0)]); g.beginPath(); g.moveTo(f.x + fc * h * 0.05 - h * 0.18, yb - h * 0.9); g.lineTo(f.x + fc * h * 0.35, yb - h * 1.65); g.lineTo(f.x + fc * h * 0.05 + h * 0.18, yb - h * 0.9); g.closePath(); g.fill(); g.restore(); }      // 头槌：往前上方的冲击锥
    return; }
  if (((id === 'windmill' || id === 'lwindmill') && t >= 4 && t < 54 || id === 'spin' && f.y < 200)) wring(true);
  if (id === 'dp' && f.y > 4 && t < 26) axeArc(f.x - fc * h * 0.1, yb - h * 0.55, h * 0.62, fc > 0 ? -1.9 : Math.PI + 0.3, fc > 0 ? -0.3 : Math.PI + 1.9, 30, 0.85, 1);      // 升龙：竖着抡上去的斧光
  if (id === 'swat' && t >= 4 && t < 20) { const q = (t - 4) / 16, px = f.x + fc * h * 0.5, py = yb - h * 0.55, R = h * 0.17 * (0.8 + 0.4 * Math.sin(q * Math.PI)); glow(px, py, R * 3, '#FFB070', 0.6 * (1 - q)); g.save(); g.globalAlpha = 0.85 * (1 - q * q); g.translate(px, py); g.scale(fc, 1); g.fillStyle = 'rgba(255,214,170,0.9)'; g.strokeStyle = '#E0475B'; g.lineWidth = 4; g.beginPath(); g.ellipse(0, 0, R, R * 1.1, 0, 0, 7); g.fill(); g.stroke(); for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(-R * 0.55 + k * R * 0.37, -R * 1.25 + Math.abs(k - 1.5) * R * 0.14, R * 0.17, R * 0.5, (k - 1.5) * 0.12, 0, 7); g.fill(); g.stroke(); } g.beginPath(); g.ellipse(R * 0.95, -R * 0.15, R * 0.18, R * 0.45, 0.7, 0, 7); g.fill(); g.stroke(); g.restore(); }      // 拍掉：发光大手掌
  if (id === 'splash' && !M.land && t >= 4) { g.save(); g.lineCap = 'round'; for (let i = 0; i < 7; i++) { const ox = (i - 3) * h * 0.11; g.strokeStyle = i % 2 ? 'rgba(255,255,255,0.7)' : 'rgba(224,71,91,0.75)'; g.lineWidth = 6; g.beginPath(); g.moveTo(f.x + ox, yb - h * 0.35); g.lineTo(f.x + ox, yb - h * 0.35 - 80 - hash(i + s.f) * 70); g.stroke(); } g.restore(); }      // 飞身压：下落速度线
  const slamT = id === 'splash' ? M.land : id === 'grab360' ? M.slam : null; if (slamT != null && t - slamT < 26) { const q = (t - slamT) / 26, sx = id === 'splash' ? f.x : op.x; bigX(sx + (id === 'splash' ? fc * h * 0.15 : 0), yb + 2, 90 + 60 * E.out3(Math.min(1, q * 3)), 1 - q * q, 0.1, 0.32); g.save(); g.strokeStyle = rgba('#3A0A10', 0.7 * (1 - q)); g.lineWidth = 5; for (let i = 0; i < 6; i++) { const an = Math.PI + (i / 5) * Math.PI, L = h * (0.4 + 0.4 * hash(i)); g.beginPath(); g.moveTo(sx, yb); g.lineTo(sx + Math.cos(an) * L * 0.5, yb + 4); g.lineTo(sx + Math.cos(an) * L, yb + 2 + Math.sin(i) * 3); g.stroke(); } g.restore(); }      // 砸地：大红叉 + 地裂
  if ((id === 'grab360' || id === 'rungrab' || id === 'siberia' || id === 'aslam') && M.got != null && t - M.got < 16) { const q = (t - M.got) / 16, cx = op.x, cy = oy - oh * 0.5, w = oh * (0.42 + 0.12 * (1 - E.out3(Math.min(1, q * 3)))), hh = oh * 0.62, L = w * 0.4; g.save(); g.globalAlpha = 1 - q * q; g.strokeStyle = '#FF2E2E'; g.lineWidth = 9; g.lineCap = 'square';      // 抓住瞬间：对手身上一个红色取景框
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.beginPath(); g.moveTo(cx + sx * w, cy + sy * hh - sy * L); g.lineTo(cx + sx * w, cy + sy * hh); g.lineTo(cx + sx * w - sx * L, cy + sy * hh); g.stroke(); }
    g.fillStyle = '#FF2E2E'; g.beginPath(); g.arc(cx + w - 26, cy - hh + 24, 9, 0, 7); g.fill(); txt('REC', cx + w - 70, cy - hh + 34, { size: 26, w: 900, fam: F.en, fill: '#FF2E2E', align: 'center' }); g.restore(); }
}
// Claude 专属（第 25 圈）：三种当身各有接招区（上段 = 头胸一圈书页盾，中段 = 身前一面立着的书页，下段 = 脚边一圈贴地书页），接住时书页炸开 + 橙色花瓣 + 「已读」章；
// 贴地纸页 / 空中纸页 = 会翻的书页；突进掌 = 前面一个橙色掌印 + 身后一串纸条；升龙 = 绕身上旋的花瓣柱；把手机拿过来 / 再确认一下 = 对手身上一个手机屏幕框
function pageSheet(x, y, w, hh, rot, flip, a, lines = 4) {      // 一张书页：米白纸 + 字行，flip 0–1 = 翻页时的横向压缩
  if (a <= 0.01) return; const sx = Math.max(0.06, Math.abs(Math.cos(flip * Math.PI))); g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(rot); g.scale(sx, 1); g.fillStyle = Math.cos(flip * Math.PI) < 0 ? '#F3E6CC' : '#FFFDF4'; g.strokeStyle = '#8A7A5A'; g.lineWidth = 3; g.beginPath(); g.rect(-w / 2, -hh / 2, w, hh); g.fill(); g.stroke();
  g.fillStyle = 'rgba(232,116,59,0.6)'; for (let j = 0; j < lines; j++) g.fillRect(-w / 2 + w * 0.12, -hh / 2 + hh * 0.18 + j * hh * 0.7 / lines, w * (0.76 - (j % 2) * 0.2), Math.max(2, hh * 0.05)); g.fillStyle = '#E8DCC0'; g.beginPath(); g.moveTo(w / 2, hh / 2 - w * 0.22); g.lineTo(w / 2 - w * 0.22, hh / 2); g.lineTo(w / 2, hh / 2); g.closePath(); g.fill(); g.restore(); }
function clCounterFx(s, f, yb, h) {
  const M = f.mv, ty = M.id === 'ucounter' ? 'hi' : M.id === 'lcounter' ? 'lo' : 'mid', cy = yb - h * (ty === 'hi' ? 0.72 : ty === 'lo' ? 0.14 : 0.45), fc = f.face;
  if (f.counter && !M.hit) { const n = 7, sp = s.f * 0.12;      // 接招区：一圈慢慢转的书页
    if (ty === 'mid') { pageSheet(f.x + fc * h * 0.36, cy, h * 0.3, h * 0.42, fc * 0.08 + Math.sin(s.f * 0.15) * 0.03, 0.08, 0.75, 6); glow(f.x + fc * h * 0.36, cy, h * 0.35, '#FFB45C', 0.3); }
    else for (let i = 0; i < n; i++) { const an = sp + i * 6.283 / n, rx = h * (ty === 'lo' ? 0.5 : 0.36), ry = h * (ty === 'lo' ? 0.07 : 0.2); pageSheet(f.x + Math.cos(an) * rx, cy + Math.sin(an) * ry, 34, 44, an * 0.3, (s.f * 0.04 + i * 0.3) % 1, Math.sin(an) > 0 ? 0.9 : 0.45, 3); }
    g.save(); g.strokeStyle = rgba('#FFB45C', 0.5 + 0.2 * Math.sin(s.f * 0.4)); g.lineWidth = 4; g.setLineDash([10, 8]); g.lineDashOffset = -s.f * 2; g.beginPath(); g.ellipse(f.x + (ty === 'mid' ? fc * h * 0.2 : 0), cy, h * (ty === 'mid' ? 0.3 : ty === 'lo' ? 0.56 : 0.42), h * (ty === 'lo' ? 0.1 : 0.26), 0, 0, 7); g.stroke(); g.setLineDash([]); g.restore(); }
  if (M.hit != null && f.t - M.hit < 30) { const q = (f.t - M.hit) / 30, ox = f.x + fc * h * 0.3;      // 接住：书页炸开 + 花瓣 + 「已读」章
    for (let i = 0; i < 12; i++) { const an = i * 0.5236 + hash(i) * 0.3, d = h * (0.15 + 0.7 * E.out3(q)); pageSheet(ox + Math.cos(an) * d, cy + Math.sin(an) * d * 0.8 + q * q * 80, 30, 40, an + q * 4, q * 2 + i * 0.2, 1 - q, 3); themeEl('petal', ox + Math.cos(an + 0.26) * d * 1.2, cy + Math.sin(an + 0.26) * d + q * q * 120, 12, an * 2, 1 - q, '#E8743B'); }
    if (q < 0.25) glow(ox, cy, h * 0.6, '#FFB45C', 0.7 * (1 - q * 4));
    const sc = 1 + 0.6 * Math.max(0, 1 - q * 5); g.save(); g.globalAlpha = Math.min(1, (1 - q) * 3); g.translate(f.x + fc * h * 0.05, yb - h * 0.32); g.rotate(-0.18); g.scale(sc, sc); g.strokeStyle = '#D9381E'; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 48, 0, 7); g.stroke(); g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, 40, 0, 7); g.stroke(); g.restore(); txt('已读', f.x + fc * h * 0.05, yb - h * 0.32 + 13, { size: 34 * sc, w: 900, fill: '#D9381E', align: 'center', a: Math.min(1, (1 - q) * 3), rot: -0.18 }); }
}
function clSpFx(s, f, x, yb, h, col, ex, front) {
  const id = f.mv.id, t = f.t, fc = f.face, M = f.mv, op = s.F[1 - f.idx], oy = yb + f.y - op.y - (op.hy || 0), oh = op.ch.h, pc = ex ? '#FFD23C' : '#E8743B';
  if (!front) { if (id === 'dp' && (f.y > 4 || t < 8)) for (let i = 0; i < 14; i++) { const k = ((s.f * 0.04 + i / 14) % 1), an = k * 12 * fc + i, rx = h * (0.42 - 0.15 * k); if (Math.sin(an) > 0) continue; themeEl('petal', f.x + Math.cos(an) * rx, yb + 20 - k * h * 1.2, 14, an, 0.6 * Math.sin(k * Math.PI), pc); } return; }      // 升龙：花瓣柱（后半圈）
  if (id === 'dp' && (f.y > 4 || t < 8)) for (let i = 0; i < 14; i++) { const k = ((s.f * 0.04 + i / 14) % 1), an = k * 12 * fc + i, rx = h * (0.42 - 0.15 * k); if (Math.sin(an) <= 0) continue; themeEl('petal', f.x + Math.cos(an) * rx, yb + 20 - k * h * 1.2, 17, an, Math.sin(k * Math.PI), pc); }
  if (id === 'excuse' && t >= 6 && t < 22) { const q = (t - 6) / 16, px = f.x + fc * h * 0.45, py = yb - h * 0.55; for (let i = 1; i <= 5; i++) pageSheet(f.x - fc * (h * 0.15 + i * 46), yb - h * (0.5 + 0.06 * Math.sin(i * 2 + s.f * 0.5)), 26, 60, fc * (0.6 + i * 0.2), 0.1 * i, 0.9 - i * 0.15, 3);      // 突进掌：身后一串纸条 + 前面一个橙色掌印
    g.save(); g.globalAlpha = 0.8 * (1 - q * q); g.translate(px, py); g.scale(fc, 1); const R = h * 0.13 * (1 + 0.3 * Math.sin(q * Math.PI)); g.fillStyle = rgba(pc, 0.55); g.strokeStyle = '#FFFFFF'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 0, R * 0.8, R, 0, 0, 7); g.fill(); g.stroke(); for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(-R * 0.48 + k * R * 0.32, -R * 1.2 + Math.abs(k - 1.5) * R * 0.12, R * 0.14, R * 0.42, (k - 1.5) * 0.1, 0, 7); g.fill(); g.stroke(); } g.restore(); }
  if ((id === 'phonegrab' || id === 'otg') && M.got != null && t - M.got < 28) { const q = (t - M.got) / 28, w = oh * 0.34, hh = oh * 0.5, cx = op.x, cy = oy - oh * 0.48; g.save(); g.globalAlpha = Math.min(1, (1 - q) * 3); g.lineJoin = 'round'; g.strokeStyle = '#2B2B2B'; g.lineWidth = 16; rr(cx - w, cy - hh, w * 2, hh * 2, 40); g.stroke(); g.strokeStyle = pc; g.lineWidth = 5; rr(cx - w - 8, cy - hh - 8, w * 2 + 16, hh * 2 + 16, 46); g.stroke(); g.fillStyle = '#2B2B2B'; rr(cx - w * 0.3, cy - hh - 4, w * 0.6, 22, 10); g.fill(); g.restore();      // 对手身上一个手机屏幕框（刘海 + 橙色边）
    }
}
// Kimi 专属（第 26 圈）：月亮有月相（新月 → 峨眉月 → 上弦 → 盈凸 → 满月循环，满月弹固定满月）+ 星屑拖尾；月相闪现 = 原地一串月相由满到缺消失、落点由缺到满出现 + 星屑；
// 升龙 = 竖着的一弯大月牙；钻头 = 卷轴卷成的螺旋锥 + 碎纸；梦话喷射 = 飘出来的 z 字和小月牙
function moonPhase(x, y, R, ph, a, glowA = 0.35) {      // ph 0–1：0 / 1 新月，0.5 满月；亮面米黄 + 环形山，暗面深蓝
  if (a <= 0.01) return; g.save(); g.globalAlpha *= a; g.translate(x, y); if (glowA) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg(0, 0, R * 0.5, R * 1.7, [`rgba(255,240,190,${glowA})`, 'rgba(255,233,168,0)']); g.beginPath(); g.arc(0, 0, R * 1.7, 0, 7); g.fill(); g.restore(); }
  g.fillStyle = '#2A3366'; g.strokeStyle = '#C9A34A'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill(); g.stroke();
  const k = Math.cos(ph * Math.PI * 2), right = ph < 0.5; g.fillStyle = '#FFF2C4'; g.beginPath(); g.arc(0, 0, R - 1.5, -Math.PI / 2, Math.PI / 2, !right); g.ellipse(0, 0, Math.abs(k) * (R - 1.5), R - 1.5, 0, Math.PI / 2, -Math.PI / 2, (k > 0) === right); g.closePath(); g.fill();
  g.save(); g.clip(); g.fillStyle = 'rgba(201,163,74,0.4)'; [[-0.3, -0.2, 0.18], [0.15, 0.35, 0.13], [0.35, -0.35, 0.1], [-0.45, 0.3, 0.1]].forEach(([u, v, r]) => { g.beginPath(); g.arc(u * R, v * R, r * R, 0, 7); g.fill(); }); g.restore(); g.restore(); }
function kmSpFx(s, f, x, yb, h, col, ex, front) {
  const id = f.mv.id, t = f.t, fc = f.face, M = f.mv, R = s._rfx, pc = ex ? '#FFD23C' : '#FFE9A8';
  if (!R.km) R.km = {}; const K = R.km[f.idx] || (R.km[f.idx] = {});
  if (!front) { if (id === 'dp' && (f.y > 4 || t < 10)) { const q = Math.min(1, (t + 1) / 8); g.save(); g.translate(f.x + fc * h * 0.12, yb - h * 0.55); g.scale(fc, 1); g.globalAlpha = 0.8 * q; g.fillStyle = lg(0, -h * 0.7, 0, h * 0.5, ['#FFFFFF', pc, 'rgba(255,233,168,0)']); g.beginPath(); g.arc(0, 0, h * 0.62, -2.2, 1.0); g.arc(-h * 0.2, -h * 0.06, h * 0.5, 0.95, -2.1, true); g.closePath(); g.fill(); g.restore(); } return; }      // 升龙：竖着的一弯大月牙（身后）
  if (id === 'dp' && f.y > 4) for (let i = 0; i < 6; i++) { const q = ((s.f * 0.07 + i / 6) % 1); star4(f.x + (hash(i) - 0.5) * h * 0.8, yb - h * (0.2 + q * 0.9), 14 * (1 - q), q * 3, '#FFF6C0', 1 - q); }
  if (id === 'warpf' || id === 'warpb') { if (t <= 1 || K.f0 == null || K.sw !== f.swing) { K.f0 = s.f; K.x0 = f.x; K.y0 = yb; K.sw = f.swing; }
    if (t < 14) { const q = t / 14; for (let i = 0; i < 5; i++) moonPhase(K.x0 + (i - 2) * 46, K.y0 - h * 0.55 - Math.abs(i - 2) * 16, 20, 0.5 + q * 0.5 + i * 0.04, 1 - q, 0.2); for (let i = 0; i < 10; i++) { const an = i * 0.628, d = h * 0.2 + q * h * 0.5; star4(K.x0 + Math.cos(an) * d, K.y0 - h * 0.5 + Math.sin(an) * d * 0.8, 12 * (1 - q), an, '#FFF6C0', 1 - q); } }      // 原地：一串月相由满到缺、星屑散开
    if (t >= 12 && t < 26) { const q = (t - 12) / 14; for (let i = 0; i < 5; i++) moonPhase(f.x + (i - 2) * 46, yb - h * 1.08 - Math.abs(i - 2) * 12, 18, q * 0.5 + i * 0.04, 1 - q * q, 0.2); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = lg(0, yb - h * 1.2, 0, yb, ['rgba(255,240,190,0)', `rgba(255,240,190,${0.4 * (1 - q)})`, 'rgba(255,240,190,0)']); g.fillRect(f.x - h * 0.35, yb - h * 1.2, h * 0.7, h * 1.2); g.restore(); } }      // 落点：头顶一串月相由缺到满 + 一道月光
  if (id === 'drill' && !M.land && t >= 6) { g.save(); g.translate(f.x + fc * h * 0.25, yb - h * 0.15); g.rotate(fc > 0 ? 0.95 : Math.PI - 0.95); const L = h * 0.55, W = h * 0.2; g.fillStyle = '#F3E9CF'; g.strokeStyle = '#8A7A5A'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -W); g.lineTo(L, 0); g.lineTo(0, W); g.closePath(); g.fill(); g.stroke(); g.save(); g.clip(); g.strokeStyle = '#5B6CB8'; g.lineWidth = 6; for (let i = -2; i < 8; i++) { const xx = i * L / 6 + (s.f * 6 % (L / 6)); g.beginPath(); g.moveTo(xx, -W); g.lineTo(xx + L / 10, W); g.stroke(); } g.restore(); g.restore();      // 钻头：卷轴卷成的螺旋锥
    for (let i = 0; i < 4; i++) { const q = ((s.f * 0.12 + i / 4) % 1); pageSheet(f.x - fc * q * 120, yb - h * 0.3 + q * 60 - hash(i) * 40, 18, 24, q * 8 + i, q, 1 - q, 2); } }
  if (id === 'zbreath' && t >= 8) for (let i = 0; i < 5; i++) { const q = ((s.f * 0.05 + i / 5) % 1), xx = f.x + fc * (h * 0.4 + q * h * 0.9), yy = yb - h * (0.55 + 0.3 * q) + Math.sin(q * 9 + i) * 14; if (i % 2) txt('z', xx, yy, { size: 30 + q * 26, w: 900, fam: F.en, fill: '#FFFFFF', stroke: '#5B6CB8', sw: 6, align: 'center', a: Math.sin(q * Math.PI), rot: -0.3 * fc }); else moonPhase(xx, yy, 10 + q * 6, 0.15, Math.sin(q * Math.PI), 0); }      // 梦话：飘出来的 z 和小月牙
}
// GLM 专属（第 27 圈）：Z 字飞书 = 一本边转边扇动封面的书（书页一张张翻）+ 红勾；穿过批注变强 = 红光 + 书页里冒红字；满分飞踢 = 跟着脚走的整圈红色弧光 + 顶点一个「100」红章；
// 批注刀波 = 前头一个红笔尖 + 甩出去的红墨点。蓄力型角色（GLM、豆包，只在有人操作时）：按住后 / 下时脚边一圈进度弧，蓄满变成一圈跳动的光
function chargeFx(s, f, yb, h) {
  const CH = 45, b = Math.min(1, (f.cgB || 0) / CH), d = Math.min(1, (f.cgD || 0) / CH); if (b < 0.15 && d < 0.15) return; const col = f.id === 'glm' ? '#FF3A3A' : '#4FD6FF';
  for (const [k, cy, rx] of [[b, yb - h * 0.45, h * 0.32], [d, yb + 2, h * 0.36]]) { if (k < 0.15) continue; const full = k >= 1; g.save(); g.lineCap = 'round'; g.strokeStyle = rgba(col, full ? 0.6 + 0.35 * Math.sin(s.f * 0.6) : 0.45); g.lineWidth = full ? 7 : 4; g.beginPath(); g.ellipse(f.x - (cy < yb ? f.face * h * 0.18 : 0), cy, rx * (cy < yb ? 0.55 : 1), rx * (cy < yb ? 0.9 : 0.16), 0, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke(); g.restore(); if (full) glow(f.x - (cy < yb ? f.face * h * 0.18 : 0), cy, h * 0.3, col, 0.25 + 0.1 * Math.sin(s.f * 0.6)); }
}
function glmSpFx(s, f, x, yb, h, col, ex, front) {
  const id = f.mv.id, t = f.t, fc = f.face, M = f.mv, pc = ex ? '#FFD23C' : '#FF3A3A';
  if (!front) return;
  if ((id === 'fkk' || id === 'tripflash') && f.y > 4 && !M.land) { const cx = f.x, cy = yb - h * 0.45, R = h * 0.6, ph = Math.min(1, t / 14), a0 = Math.PI / 2, sweep = ph * Math.PI * 1.9;      // 满分飞踢：脚划过的整圈弧光（后空翻是往后转）
    g.save(); g.lineCap = 'round'; for (let j = 0; j < 3; j++) { g.strokeStyle = j === 0 ? rgba(pc, 0.55) : j === 1 ? rgba('#FFFFFF', 0.85) : rgba(pc, 0.9); g.lineWidth = [34, 12, 4][j]; g.beginPath(); g.arc(cx, cy, R - j * 4, a0 - fc * Math.max(0, sweep - 2.2), a0 - fc * sweep, fc > 0); g.stroke(); } g.restore();
    if (t >= 6 && t < 30) { const q = (t - 6) / 24, sc = 1 + 0.5 * Math.max(0, 1 - q * 5); g.save(); g.globalAlpha = Math.min(1, (1 - q) * 3); g.translate(f.x + fc * h * 0.45, yb - h * 1.15); g.rotate(-0.15 * fc); g.scale(sc, sc); g.strokeStyle = '#FF3A3A'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 44, 0, 7); g.stroke(); g.restore(); txt('100', f.x + fc * h * 0.45, yb - h * 1.15 + 12, { size: 36 * sc, w: 900, fam: F.en, fill: '#FF3A3A', align: 'center', a: Math.min(1, (1 - q) * 3), rot: -0.15 * fc }); g.strokeStyle = '#FF3A3A'; } }      // 「100」红章
}
// 豆包专属（第 28 圈）：表情包弹 = 白边贴纸、表情每 8 步换一个（笑 / XD / 星星眼 / 眨眼）+ 像素块拖尾；踢踢踢 = 每脚一个像素爆点 + 连击计数「×N」；
// 宝宝升天踢 = 绕身旋转往上的蓝色螺旋 + 小表情；陀螺 = 腰间一圈转着的彩色像素块；踩头 = 脚底一个像素星爆；摆拍架势 = 身边取景框 + 进派生时「咔嚓」白闪
function emojiFace(x, y, r, kind, rot = 0, a = 1) {
  g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(rot); g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(0, 0, r * 1.18, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#FFD84D'; g.strokeStyle = INK; g.lineWidth = Math.max(2, r * 0.12); g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.stroke(); g.fillStyle = INK; g.strokeStyle = INK; g.lineCap = 'round'; g.lineWidth = Math.max(2, r * 0.11);
  if (kind === 0) { g.beginPath(); g.arc(-r * 0.33, -r * 0.18, r * 0.13, 0, 7); g.arc(r * 0.33, -r * 0.18, r * 0.13, 0, 7); g.fill(); g.beginPath(); g.arc(0, r * 0.1, r * 0.45, 0.2, Math.PI - 0.2); g.stroke(); }
  else if (kind === 1) { for (const sg of [-1, 1]) { g.beginPath(); g.moveTo(sg * r * 0.5, -r * 0.35); g.lineTo(sg * r * 0.2, -r * 0.18); g.lineTo(sg * r * 0.5, -r * 0.02); g.stroke(); } g.fillStyle = '#B81F3A'; g.beginPath(); g.moveTo(-r * 0.5, r * 0.12); g.lineTo(r * 0.5, r * 0.12); g.quadraticCurveTo(0, r * 0.9, -r * 0.5, r * 0.12); g.fill(); }
  else if (kind === 2) { for (const sg of [-1, 1]) star4(sg * r * 0.33, -r * 0.18, r * 0.3, 0, '#FF6FA8', 1); g.beginPath(); g.arc(0, r * 0.15, r * 0.35, 0.3, Math.PI - 0.3); g.stroke(); }
  else { g.beginPath(); g.arc(-r * 0.33, -r * 0.18, r * 0.13, 0, 7); g.fill(); g.beginPath(); g.moveTo(r * 0.18, -r * 0.18); g.lineTo(r * 0.5, -r * 0.18); g.stroke(); g.beginPath(); g.arc(0, r * 0.1, r * 0.4, 0.3, Math.PI - 0.3); g.stroke(); g.fillStyle = '#FF6FA8'; g.beginPath(); g.ellipse(r * 0.15, r * 0.48, r * 0.14, r * 0.2, 0, 0, 7); g.fill(); }
  g.restore(); }
function pixBurst(x, y, R, q, seed) { for (let i = 0; i < 10; i++) { const an = i * 0.628 + hash(seed + i), d = R * (0.2 + E.out3(q)) * (0.6 + hash(i * 2 + seed) * 0.6); themeEl('pixel', x + Math.cos(an) * d, y + Math.sin(an) * d, 10 * (1 - q * 0.5), i + seed, 1 - q, ''); } }
function douPoseFx(s, f, yb, h) {      // 摆拍：身边一个取景框（四角 + 对焦十字），派生出手那一下「咔嚓」白闪
  const M = f.mv, t = f.t, cx = f.x, cy = yb - h * 0.47, w = h * 0.42, hh = h * 0.5, L = w * 0.35, q = M.f ? Math.min(1, (t - M.t0) / 10) : 0; if (M.f && t - M.t0 > 14) return;
  g.save(); g.globalAlpha = 1 - q; g.strokeStyle = '#FFFFFF'; g.lineWidth = 6; g.lineCap = 'square'; for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.beginPath(); g.moveTo(cx + sx * w, cy + sy * hh - sy * L); g.lineTo(cx + sx * w, cy + sy * hh); g.lineTo(cx + sx * w - sx * L, cy + sy * hh); g.stroke(); }
  g.fillStyle = '#FF3A3A'; g.beginPath(); g.arc(cx - w + 22, cy - hh + 22, 8, 0, 7); g.fill(); g.restore();
  if (M.f) { const k = (t - M.t0) / 8; if (k < 1) { glow(cx, cy, h * 0.8, '#FFFFFF', 0.55 * (1 - k)); star4(cx + f.face * w * 0.6, cy - hh * 0.5, 60 * (1 - k), 0.3, '#FFFFFF', 1 - k); txt('咔嚓', cx - f.face * w * 0.5, cy - hh + 44, { size: 40, w: 900, fill: '#FFFFFF', stroke: '#1677FF', sw: 8, align: 'center', a: 1 - k }); } }
}
function douSpFx(s, f, x, yb, h, col, ex, front) {
  const id = f.mv.id, t = f.t, fc = f.face, M = f.mv, R = s._rfx, pc = ex ? '#FFD23C' : '#1677FF';
  if (!R.dou) R.dou = {}; const D = R.dou[f.idx] || (R.dou[f.idx] = { marks: [] });
  function swirl(fr) { const top = yb - h * 1.0, bot = yb + 10; g.save(); g.lineCap = 'round'; for (let i = 1; i <= 40; i++) { const k = i / 40, an = s.f * 0.5 * fc + k * 11, sn = Math.sin(an); if ((sn > 0) !== fr) continue; const an0 = an - 11 / 40, rx = h * (0.5 - 0.18 * k); g.strokeStyle = rgba(i % 4 ? pc : '#FFFFFF', (fr ? 0.9 : 0.5) * (0.35 + 0.65 * k)); g.lineWidth = 22 * (0.4 + 0.6 * k); g.beginPath(); g.moveTo(f.x + Math.cos(an0) * rx, bot + (top - bot) * (k - 1 / 40)); g.lineTo(f.x + Math.cos(an) * rx, bot + (top - bot) * k); g.stroke(); } g.restore(); }
  function pixRing(fr) { const cy = yb - h * 0.4, rx = h * 0.6, ry = h * 0.15, sp = s.f * 0.45 * fc; for (let i = 0; i < 12; i++) { const an = sp + i * 0.5236, sn = Math.sin(an); if ((sn > 0) !== fr) continue; themeEl('pixel', f.x + Math.cos(an) * rx, cy + sn * ry, fr ? 16 : 11, i + 0.5, fr ? 1 : 0.5, ''); } }
  if (!front) { if (id === 'tenshou' && f.y > 4 && !M.land) swirl(false); if (id === 'spin' && f.y < 200) pixRing(false); return; }
  if (id === 'tenshou' && f.y > 4 && !M.land) { swirl(true); if (t % 6 < 3) emojiFace(f.x + fc * h * 0.4, yb - h * 0.9, 16, Math.floor(t / 6) % 4, 0, 0.9); }
  if (id === 'spin' && f.y < 200) pixRing(true);
  const key = f.box && f.box.id;
  if (key && D.k !== key) { D.k = key; const b = f.box; if (id === 'kkk' || id === 'stomp' || id === 'rushkick') { D.n = id === 'kkk' ? (D.kid === f.swing ? D.n + 1 : 1) : 0; D.kid = f.swing; D.marks.push({ f: s.f, x: f.x + fc * (id === 'stomp' ? 0 : b.x1 * 0.85), y: yb - (id === 'stomp' ? -10 : (b.y0 + b.y1) / 2), n: D.n, life: 14 }); } }
  if (!key) D.k = null;
  for (const m of D.marks) { const q = (s.f - m.f) / m.life; if (q >= 1) continue; pixBurst(m.x, m.y, 70, q, m.f); if (m.n) txt('×' + m.n, m.x + fc * 95, m.y + 40 - q * 20, { size: 34, w: 900, fam: F.en, fill: '#FFFFFF', stroke: pc, sw: 7, align: 'center', a: 1 - q * q }); }      // 每脚一个像素爆点 + 计数
  D.marks = D.marks.filter(m => s.f - m.f < m.life);
}
function say(x, y, str, col, a = 1) {      // 对话气泡
  const sz = 28, w = Math.min(760, mw(str, sz, 800) + 50); g.save(); g.globalAlpha *= a; rr(x - w / 2, y - 58, w, 58, 20); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 5; g.strokeStyle = col || INK; g.stroke(); g.beginPath(); g.moveTo(x - 12, y - 2); g.lineTo(x, y + 18); g.lineTo(x + 12, y - 2); g.fillStyle = '#fff'; g.fill(); g.restore();
  txt(str, x, y - 19, { size: sz, w: 800, fill: INK, align: 'center', a });
}
function cloudShape(x, y, sc) { g.save(); g.translate(x, y); g.scale(sc, sc); g.fillStyle = '#6B7280'; g.strokeStyle = '#374151'; g.lineWidth = 5; g.beginPath(); [[-40, 0, 32], [0, -18, 40], [40, 0, 32], [0, 14, 34]].forEach(([cx, cy, r]) => { g.moveTo(cx + r, cy); g.arc(cx, cy, r, 0, 7); }); g.fill(); g.stroke(); g.restore(); }
function drawDark(s) {      // Kimi 月之暗面：全屏暗下来，只剩两人眼睛那一圈
  const a = Math.min(1, s.dark / 15, (180 - s.dark) / 10 + 0.2) * 0.9; g.save(); g.fillStyle = `rgba(2,3,12,${a})`; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
  for (const f of s.F) { const [ex, ey] = w2s(s, f.x + f.face * 10, f.y + f.ch.h * 0.72); g.fillStyle = rg(ex, ey, 0, 70, ['rgba(180,200,255,0.5)', 'rgba(180,200,255,0)']); g.fillRect(ex - 70, ey - 70, 140, 140); g.fillStyle = '#E8EEFF'; g.beginPath(); g.ellipse(ex - 14, ey, 7, 10, 0, 0, 7); g.ellipse(ex + 14, ey, 7, 10, 0, 0, 7); g.fill(); }
  g.restore(); txt('月之暗面', 960, 232, { size: 40, w: 900, fill: '#DDE4FF', stroke: '#1C2456', sw: 8, align: 'center', a });
}

// 第四版模组招式的姿势：返回 { n: 图名, rot, sx, dy, smear }，没有图就退回别的帧
const DRAVE_R = ['a', 'a', 'lk', 'lk', 'hp', 'hp', 'hk', 'hk', 'hp', 'hk'], KEYN = { a: 'J', lk: 'K', hp: 'U', hk: 'I' };      // 逐条回复的按键顺序（和 sim.js 的 DRAVE 一致）
// 第 47 圈：招牌必杀专用帧。k = 有这张帧才启用（没出图的角色 / 皮肤退回 POSE4 和借来的帧）；帧名 sg<表><1-4>，表的含义见 gtools/sig_prompts.py
const NOSIG = typeof location !== 'undefined' && /nosig=1/.test(location.search);      // ?nosig=1：关掉招牌帧和专属特效（改前 / 改后对比用）
const SGA = (f, t, a) => a[Math.min(a.length - 1, Math.floor(t))];
const TWG = !/[?&]tw=0/.test(location.search), ANIMD = !/[?&]animd=0/.test(location.search), TWC = { ds: 1, claude: 1, gpt: 1 };      // 第 81 圈：核心三人必杀过渡
const SIGR = {
  ds: {
    otk: { k: 'sg11', f: (f, t, F) => { const n = f.mv.n ?? 0, u = t - (f.mv.t0 || 0), su = [f.mv.v === 'b' || f.mv.ex ? 9 : 11, 7, 9, 8][n]; const W = [['sg11', 'sg12'], ['sg13', F('sg91') ? 'sg91' : 'sg14'], ['sg21', F('sg92') ? 'sg92' : 'sg22'], ['sg23', 'sg24']][n]; return { n: F(u < su ? W[0] : W[1]) || F(W[1]),      /* 第 61 圈：第 2 段转身背拳、第 3 段深蹲双重掌（V9），三段轮廓拉开 */ smear: u >= su && u < su + 5 ? { key: n === 3 ? 'kick' : 'heavy', age: u - su } : null }; } },
    bakkai: { k: 'sg32', f: (f, t, F) => { const M = f.mv, u = t - 7, n = M.n || 3; if (u < 0) return { n: F('sg31') }; const k = Math.floor(u / 11), q = Math.min(3, Math.floor((u % 11) / 2.75));      // 第 65 圈：爆廻 = 向前螺旋翻滚回旋踢（V3 / V4 / V6 共 12 帧）：翻滚两圈一个循环，最后一圈上踢，然后落地、得意
      if (k >= n) { const v = u - n * 11; return { n: F(v < 8 ? 'sg62' : v < 16 ? 'sg63' : 'sg64') }; } if (k === n - 1) return { n: F(q < 2 ? 'sg61' : 'sg62') };
      return { n: F((k % 2 ? ['sg43', 'sg44', 'sg33', 'sg41'] : ['sg32', 'sg33', 'sg42', 'sg41'])[q]) || F('sg33') }; } },
    dpk: { k: 'sg51', f: (f, t, F) => ({ n: F(t < 4 || f.y <= 0 ? (t < 20 ? 'sg51' : 'sg54') : f.vy > 600 ? 'sg52' : f.vy > -200 ? 'sg53' : 'sg54') }) },
    dp: { k: 'sg51', f: (f, t, F) => ({ n: F(t < 4 || f.y <= 0 ? (t < 20 ? 'sg51' : 'sg54') : f.vy > 600 ? 'sg52' : f.vy > -200 ? 'sg53' : 'sg54') }) },
    mstep: { k: 'sg61', f: (f, t, F) => f.mv.fol ? (f.mv.fol === 'mid' && F('sg93') ? (u => ({ n: F(u < 13 ? 'sg93' : 'sg94'), rot: u < 13 ? -0.12 * Math.min(1, u / 6) : 0.1, dy: u < 13 ? -Math.sin(Math.min(1, u / 13) * 1.57) * 18 : 0, smear: u >= 13 && u < 18 ? { key: 'heavy', age: u - 13 } : null }))(t - f.mv.t0) : null) :      /* 第 61 圈：中段锤 = 醉拳后仰 → 失衡前扑下砸（V9） */ { n: F('sg6' + (1 + Math.floor(t / 6) % 4)), rot: Math.sin(t * 0.26) * 0.16, dy: -Math.abs(Math.sin(t * 0.26)) * 10 } },      // 第 48 圈：摇摆再加大（GPT：醉态失衡不够）
    rice: { k: 'eat2', f: (f, t, F) => t >= 40 && F('w2') ? { n: F(t < 49 ? 'w2' : 'w3') } : F('sg81') ? { n: F(t < 12 ? 'sg81' : t < 24 ? 'sg82' : t < 33 ? 'sg83' : 'sg84'), dy: t >= 24 && t < 33 ? -14 : 0 } : ({ n: F(t < 8 ? 'eat1' : t < 20 ? 'eat2' : t < 30 ? 'eat3' : 'eat4'), dy: t >= 20 && t < 30 ? -10 : 0 }) },      // 第 50 圈：专用吃饭四帧（扒饭 → 仰头咽 → 握拳升级 → 擦嘴）      // 吃白饭：端碗 → 扒饭 → 仰头咽下 → 满足
    ddk: { k: 'sg73', f: (f, t, F) => ({ n: F(f.mv.land ? 'sg74' : t < 3 ? 'sg71' : t < 6 || f.mv.bnc ? 'sg72' : 'sg73') }) },
    whalefall: { k: 'sg73', f: (f, t, F) => ({ n: F(t < 6 ? 'sg51' : f.mv.land ? 'sg74' : t < 20 ? 'sg71' : t < 26 ? 'sg72' : 'sg73') }) },
  },
  gem: {
    yarn: { k: 'sg11', f: (f, t, F) => ({ n: F(t < 6 ? 'sg11' : t < 12 ? 'sg12' : t < 22 ? 'sg13' : 'sg14') }) },
    claw3: { k: 'sg21', f: (f, t, F) => { const n = f.mv.n ?? 0, u = t - (f.mv.t0 || 0), su = [f.mv.v === 'b' || f.mv.ex ? 8 : 10, 6, 10][n];
      if (n === 0) return { n: F(u < su ? 'sg34' : 'sg21'), smear: u >= su && u < su + 4 ? { key: 'heavy', age: u - su } : null };
      if (n === 1) return { n: F(u < su ? 'sg22' : 'sg23'), smear: u >= su && u < su + 4 ? { key: 'heavy', age: u - su } : null };
      return { n: F(u < su ? 'sg24' : u < su + 6 ? 'sg31' : u < su + 16 ? 'sg32' : 'sg33') || F('sg24'), dy: u < su ? -Math.sin(u / su * Math.PI) * 50 : 0 }; } },
    dp: { k: 'sg41', f: (f, t, F) => ({ n: F(t < 4 || f.y <= 0 ? (t < 20 ? 'sg41' : 'sg44') : f.vy > 600 ? 'sg42' : f.vy > -200 ? 'sg43' : 'sg44') }) },
    eightclaw: { k: 'sg51', f: (f, t, F) => { const M = f.mv; if (!M.got) return { n: F('sg51') }; const u = t - M.got; if (u >= 54) return { n: F('sg54'), dy: -20 }; return { n: F(Math.floor(u / 5) % 2 ? 'sg53' : 'sg52'), sx: Math.floor(u / 15) % 2 ? -1 : 1 }; } },
    flip: { k: 'sg61', f: (f, t, F) => { const M = f.mv; if (!M.got) return { n: F(t < 8 ? 'sg61' : 'sg61') }; const u = t - M.got; return { n: F(u < 5 ? 'sg62' : u < 10 ? 'sg63' : 'sg64') }; } },
  },
  gpt: {
    kyo3: { k: 'sg11', f: (f, t, F) => { const n = f.mv.n ?? 0, u = t - (f.mv.t0 || 0), su = [f.mv.v === 'b' || f.mv.ex ? 9 : 11, 7, 8, 9, 13][n]; const V5 = !!F('sg54'); if (u < su) return { n: F(n === 0 ? 'sg11' : n === 2 ? 'sg21' : n === 4 ? 'sg13' : V5 && n === 1 ? 'sg51' : V5 && n === 3 ? 'sg53' : 'sg11') }; return { n: F(['sg12', V5 ? 'sg52' : 'sg13', 'sg22', V5 ? 'sg54' : 'sg14', 'sg23'][n]),      /* 第 61 圈：其次 = 低身腹拳、最后 = 螺旋上冲背拳（V5） */ dy: n === 3 ? -30 : 0, smear: u < su + 5 ? { key: n === 2 ? 'kick' : 'heavy', age: u - su } : null }; } },
    dkick: { k: 'sg21', f: (f, t, F) => ({ n: F(f.mv.land ? 'sg24' : t < 4 ? 'sg21' : f.y > 0 && t >= 16 ? 'sg23' : 'sg22') }) },
    wing: { k: 'sg31', f: (f, t, F) => ({ n: F(t < 10 ? 'sg31' : t < 26 ? (f.mv.hit ? 'sg33' : 'sg32') : 'sg34') }) },
    dp: { k: 'sg41', f: (f, t, F) => ({ n: F(t < 4 || f.y <= 0 ? (t < 20 ? 'sg41' : 'sg44') : f.vy > 600 ? 'sg42' : f.vy > -200 ? 'sg43' : 'sg44') }) },
  },
  grok: {
    grab360: { k: 'sg11', f: (f, t, F) => { const M = f.mv; if (!M.got) return { n: F('sg11') }; const u = t - M.got; return { n: F(M.slam ? 'sg14' : u < 8 ? 'sg12' : f.y > 0 ? 'sg13' : 'sg12'), rot: !M.slam && f.y > 0 ? Math.sin(u * 0.9) * 0.15 : 0 }; } },
    windmill: { k: 'sg21', f: (f, t, F) => ({ n: F('sg2' + (1 + Math.floor(t / 3) % 4)) }) },
    lwindmill: { k: 'sg21', f: (f, t, F) => ({ n: F('sg2' + (1 + Math.floor(t / 3) % 4)), dy: 10 }) },
    hbutt: { k: 'sg31', f: (f, t, F) => ({ n: F(t < 9 ? 'sg31' : t < 18 ? 'sg32' : t < 26 ? 'sg33' : 'sg34'), dy: t >= 9 && t < 24 ? -Math.sin((t - 9) / 15 * Math.PI) * 50 : 0 }) },
    splash: { k: 'sg42', f: (f, t, F) => { const M = f.mv; if (M.land) return { n: F(t - M.land < 8 ? 'sg43' : 'sg44') }; return { n: F(t < 4 ? 'sg41' : 'sg42') }; } },
  },
  claude: {
    // 第 65 圈：Claude 二级「我们谈谈」（V5 / V6）：冲上去揪领子 → 单手拎起 → 连打肚子 6 下 → 下蹲 → 上勾拳
    pummel: { k: 'sg51', f: (f, t, F) => { const M = f.mv; if (!M.got) return { n: F(t < 8 ? 'sg53' : 'sg51') }; const u = t - M.got; if (u < 14) return { n: F('sg52') };
      if (u < 60) { const i = Math.max(0, Math.floor((u - 14) / 8)), w = (u - 14) % 8; return { n: F(w >= 4 ? 'sg53' : ['sg54', 'sg61', 'sg62'][i % 3]), smear: w < 3 ? { key: 'heavy', age: w } : null }; }
      return { n: F(u < 72 ? 'sg63' : 'sg64'), dy: u >= 72 && u < 84 ? -20 : 0 }; } },
    counter: { k: 'sg11', f: (f, t, F) => { const M = f.mv; if (!M.hit) return { n: F('sg11') }; const u = t - M.hit; return { n: F(u < 4 ? 'sg12' : u < 16 ? 'sg13' : 'sg14') }; } },
    ucounter: { k: 'sg11', f: (f, t, F) => { const M = f.mv; if (!M.hit) return { n: F('sg11') }; const u = t - M.hit; return { n: F(u < 4 ? 'sg12' : u < 18 ? 'sg13' : 'sg14') }; } },
    paper2: { k: 'sg21', f: (f, t, F) => ({ n: F(t < 6 ? 'sg21' : t < 11 ? 'sg22' : t < 20 ? 'sg23' : 'sg24') }) },
    paper: { k: 'sg21', f: (f, t, F) => ({ n: F(t < 8 ? 'sg21' : t < 16 ? 'sg22' : t < 26 ? 'sg23' : 'sg24') }) },
    phonegrab: { k: 'sg31', f: (f, t, F) => { const M = f.mv; if (!M.got) return { n: F(t < 5 ? 'sg31' : 'sg32') }; const u = t - M.got; return { n: F(u < 8 ? 'sg32' : u < 24 ? 'sg33' : 'sg34') }; } },
    excuse: { k: 'sg41', f: (f, t, F) => ({ n: F(t < 22 ? 'sg41' : 'sg44') }) },
    drave: { k: 'sg41', f: (f, t, F) => { const M = f.mv; if (!M.got) return { n: F('sg41') }; if (M.fin != null) return { n: F('sg44') }; return { n: F(Math.floor((t - M.got) / 4) % 2 ? 'sg43' : 'sg42') }; } },
  },
  kimi: {
    moon: { k: 'sg11', f: (f, t, F) => ({ n: F(t < 6 ? 'sg11' : t < 13 ? 'sg12' : t < 26 ? 'sg13' : 'sg14') }) },
    lobmoon: { k: 'sg11', f: (f, t, F) => ({ n: F(t < 6 ? 'sg11' : t < 12 ? 'sg12' : t < 24 ? 'sg13' : 'sg14') }) },
    warpf: { k: 'sg21', f: (f, t, F) => ({ n: F(t < 6 ? 'sg21' : t < 12 ? 'sg22' : t < 20 ? 'sg23' : 'sg24') }) },
    warpb: { k: 'sg21', f: (f, t, F) => ({ n: F(t < 6 ? 'sg21' : t < 12 ? 'sg22' : t < 20 ? 'sg23' : 'sg24') }) },
    drill: { k: 'sg32', f: (f, t, F) => ({ n: F(f.mv.land ? 'sg34' : t < 6 ? 'sg31' : Math.floor(t / 3) % 2 ? 'sg33' : 'sg32') }) },
  },
  glm: {
    boom: { k: 'sg11', f: (f, t, F) => ({ n: F(t < 8 ? 'sg11' : t < 15 ? 'sg12' : t < 26 ? 'sg13' : 'sg14') }) },
    fkk: { k: 'sg21', f: (f, t, F) => ({ n: F(f.mv.land ? 'sg24' : t < 3 ? 'sg21' : f.vy > 500 ? 'sg22' : 'sg23') }) },
    tripflash: { k: 'sg21', f: (f, t, F) => ({ n: F(f.y <= 0 ? 'sg21' : f.vy > 500 ? 'sg22' : 'sg23') }) },
  },
  dou: {
    kkk: { k: 'sg11', f: (f, t, F) => ({ n: F(t < 4 ? 'sg11' : t >= 32 ? 'sg14' : Math.floor((t - 4) / 2) % 2 ? 'sg13' : 'sg12') }) },
    rushkick: { k: 'sg12', f: (f, t, F) => ({ n: F(f.mv.got && t - f.mv.got >= 44 ? 'sg14' : Math.floor(t / 2) % 2 ? 'sg13' : 'sg12') }) },
    spin: { k: 'sg22', f: (f, t, F) => ({ n: F(t < 6 ? 'sg21' : f.mv.land ? 'sg24' : Math.floor(t / 3) % 2 ? 'sg23' : 'sg22') }) },
    stomp: { k: 'sg32', f: (f, t, F) => ({ n: F(f.mv.hit ? 'sg33' : t < 2 ? 'sg31' : 'sg32') }) },
    emoji: { k: 'sg41', f: (f, t, F) => ({ n: F(t < 4 ? 'sg41' : t < 11 ? 'sg42' : t < 17 ? 'sg43' : 'sg44') }) },
  },
  qwen: {
    fan: { k: 'sg11', f: (f, t, F) => ({ n: F(t < 4 ? 'sg11' : t < 9 ? 'sg12' : t < 18 ? 'sg13' : 'sg14') }) },
    spin: { k: 'sg21', f: (f, t, F) => ({ n: F(t < 6 ? 'sg21' : f.mv.land ? 'sg24' : (Math.floor((t - 6) / 4) % 2 ? 'sg23' : 'sg22')) }) },
    superbee: { k: 'sg32', f: (f, t, F) => ({ n: F(t < 6 ? 'sg31' : Math.floor(t / 4) % 2 ? 'sg33' : 'sg32') }) },      // 第 48 圈：超必殺忍蜂 = 肘尖领先的水平冲撞（GPT：原来像强化扇舞）
    elbow: { k: 'sg31', f: (f, t, F) => ({ n: F(t < 6 ? 'sg31' : t < 14 ? 'sg32' : t < 24 ? 'sg33' : 'sg34') }) },
    bflip: { k: 'sg41', f: (f, t, F) => ({ n: F(f.mv.land ? 'sg44' : t < 10 ? 'sg41' : t < 20 ? 'sg42' : 'sg43') }) },
    dive: { k: 'sg43', f: (f, t, F) => ({ n: F(f.mv.land ? 'sg44' : 'sg43') }) },
  },
};
(() => { if (!TWG) return; const w = (id, mv, fn) => { const o = SIGR[id] && SIGR[id][mv]; if (!o) return; const f0 = o.f; o.f = (f, t, F, s) => { const r = f0(f, t, F, s); if (r && F('tw1') && fn(f, t)) r.n = F('tw1'); return r; }; };      // 第 81 圈：成年版核心三人起手 → 出手之间的专用过渡帧 tw1（生图，只进完整版；没有图时不变）
  const s0 = (f, t) => { if ((f.mv.n ?? 0) !== 0) return false; const su = f.mv.v === 'b' || f.mv.ex ? 9 : 11, u = t - (f.mv.t0 || 0); return u >= su - 3 && u < su; };
  w('ds', 'otk', s0); w('gpt', 'kyo3', s0); w('claude', 'paper', (f, t) => t >= 12 && t < 16); })();
const POSE4 = {
  kyo3: (f, t, F) => { const n = f.mv.n ?? 0, u = t - (f.mv.t0 || 0), su = [f.mv.v === 'b' || f.mv.ex ? 9 : 11, 7, 8, 9, 13][n]; return u < su ? { n: [F('jab1') || F('windup'), F('heavy1'), F('crouch1') || F('chamber'), F('upper1') || F('crouch'), F('heavy1') || F('windup')][n], dy: n === 4 ? -Math.sin(u / su * Math.PI) * 40 : 0 } : { n: [F('jab3'), F('heavy3'), F('sweep') || F('kick3'), F('upper3') || F('dp2'), F('ymid') || F('heavy3')][n] }; },
  dkick: (f, t, F) => f.mv.third && !f.mv.land && t - f.mv.third < 16 ? { n: F('smash') || F('kick3'), rot: 0.3 } : ({ n: t < 4 ? (F('crouch1') || F('crouch')) : f.y > 0 ? (t < 16 ? (F('kick3') || F('fkick')) : (F('fkick') || F('air'))) : F('stance') }),
  wing: (f, t, F) => ({ n: t < 10 ? (F('rush1') || F('windup')) : (F('rush2') || F('dash')) }),
  fan: (f, t, F) => ({ n: t < 5 ? F('fb1') : t < 9 ? F('fb2') : t < 18 ? F('fb3') : F('fb4') }),
  wcannon: (f, t, F) => ({ n: t < 6 ? F('fb1') : t < 12 ? F('fb2') : t < 22 ? F('fb3') : F('fb4') }), shuri: (f, t, F) => ({ n: t < 4 ? F('fb1') : t < 8 ? F('fb2') : t < 16 ? F('fb3') : F('fb4') }),
  vanish: (f, t, F) => ({ n: t < 6 ? (F('z1') || F('crouch')) : t < 26 ? (F('dash') || F('crouch')) : t < 32 ? (F('kick3') || F('kick')) : (F('kick4') || F('stance')) }),
  afan: (f, t, F) => ({ n: F('fb3') || F('air') }),
  abook: (f, t, F) => ({ n: t < 7 ? (F('ma2') || F('jump')) : (F('ma3') || F('jab3') || F('jump')) }), awater: (f, t, F) => ({ n: t < 8 ? (F('fb2') || F('air')) : (F('fb3') || F('air')) }), ashuri: (f, t, F) => ({ n: t < 6 ? (F('fb2') || F('air')) : (F('fb3') || F('air')) }),      // 第 76 圈：GLM / 浪花 / 小忍 空中必杀
  elbow: (f, t, F) => ({ n: t < 6 ? (F('crouch1') || F('crouch')) : (F('rush2') || F('dash')), dy: 10 }),
  dive: (f, t, F) => ({ n: f.mv.land ? (F('smashland') || F('crouch')) : (F('fkick') || F('air')), rot: 0.3 }),
  grab360: (f, t, F) => { const M = f.mv; if (!M.got) return { n: F('throw1') || F('jab3') }; return { n: M.slam ? (F('smashland') || F('crouch')) : f.y > 0 ? (F('smash') || F('throw3')) : (F('throw2') || F('heavy1')) }; },
  windmill: (f, t, F) => { const k = Math.floor(t / 4) % 4; return { n: F('spin' + (k + 1)) || F('heavy3'), sx: F('spin1') ? 1 : (k % 2 ? -1 : 1) }; },
  rungrab: (f, t, F) => ({ n: f.mv.got ? (F('throw3') || F('heavy3')) : t < 26 ? (F('dash') || F('rush2')) : (F('throw1') || F('stance')) }),
  swat: (f, t, F) => ({ n: t < 6 ? (F('windup') || F('heavy1')) : (F('dparry') || F('jab3')) }),
  emoji: (f, t, F) => ({ n: t < 4 ? F('fb1') : t < 7 ? F('fb2') : t < 14 ? F('fb3') : F('fb4') }),
  kkk: (f, t, F) => ({ n: t < 4 ? F('chamber') : (Math.floor((t - 4) / 4) % 2 ? F('kick3') : F('kick2')) || F('kick') }),
  stomp: (f, t, F) => ({ n: F('smash') || F('fkick') || F('air') }),
  fkk: (f, t, F) => ({ n: t < 3 ? (F('crouch1') || F('crouch')) : f.y > 0 ? (F('dp3') || F('fkick')) : F('stance'), rot: f.y > 0 ? -Math.min(1, t / 14) * 0.6 : 0 }),
  otk: (f, t, F) => { const n = f.mv.n ?? 0, u = t - (f.mv.t0 || 0), su = [f.mv.v === 'b' || f.mv.ex ? 9 : 11, 7, 9, 8][n]; return u < su ? { n: [F('jab1') || F('windup'), F('heavy1'), F('heavy2') || F('windup'), F('chamber')][n] } : { n: [F('jab3') || F('jab'), F('heavy3') || F('heavy'), F('yfwd') || F('heavy3'), F('kick3') || F('kick')][n], smear: u < su + 5 ? { key: n === 3 ? 'kick' : 'heavy', age: u - su } : null }; },
  mstep: (f, t, F) => { const M = f.mv; if (!M.fol) return { n: F('walk' + (1 + Math.floor(t / 5) % 4)) || F('step'), rot: Math.sin(t * 0.45) * 0.12 }; const u = t - M.t0; return M.fol === 'mid' ? { n: u < 13 ? (F('heavy1') || F('windup')) : (F('ymid') || F('heavy3')), dy: u < 13 ? -Math.sin(u / 13 * Math.PI) * 30 : 0 } : { n: u < 8 ? (F('crouch1') || F('crouch')) : (F('sweep') || F('kick3')), smear: u >= 8 && u < 14 ? { key: 'sweep', age: u - 8 } : null }; },
  bakkai: (f, t, F) => { if (t < 8) return { n: F('crouch1') || F('crouch'), dy: 6 }; const u = (t - 8) % 13, M = f.mv, k = Math.floor((t - 8) / 13); if (k >= (M.n || 2)) return { n: F('sweep') || F('crouch') }; const q = Math.floor(u / 3.25) % 4; return { n: q % 2 ? (F('roll') || F('sweep')) : (F('sweep') || F('crouch')), sx: q >= 2 ? -1 : 1, dy: q % 2 ? 4 : 0 }; },      // 鲸尾回旋：扫腿帧和缩成一团的帧左右翻着转
  ddk: (f, t, F) => ({ n: f.mv.land ? (F('smashland') || F('crouch')) : t < 5 || f.mv.bnc ? (F('air') || F('jump')) : (F('fkick') || F('kick3')), rot: !f.mv.land && !f.mv.bnc && t >= 5 ? 0.42 : 0 }),
  feast: (f, t, F) => ({ n: t < 10 ? (F('eat1') || F('z1') || F('windup')) : t < 20 ? (F('rush2') || F('heavy3')) : t < 32 ? (F('fin1') || F('upper3') || F('heavy3')) : F('eat2') ? [F('eat2'), F('eat3'), F('eat3'), F('eat4')][Math.floor((t - 32) / 5) % 4] : (Math.floor(t / 6) % 2 ? F('z2') : F('z1')) || F('win') }),      // 干饭人：冲上去两下，然后一口气扒完
  whalefall: (f, t, F) => ({ n: t < 6 ? (F('crouch1') || F('crouch')) : f.mv.land ? (F('smashland') || F('crouch')) : t < 26 ? (F('jump') || F('air')) : (F('fkick') || F('kick3')), rot: !f.mv.land && t >= 26 ? 0.55 : 0 }),
  snatch: (f, t, F) => { const M = f.mv; if (!M.got) return { n: t < 6 ? (F('crouch1') || F('crouch')) : (F('rush2') || F('dash')) }; const u = t - M.got; return { n: u < 24 ? (F('v1') || F('throw1')) : (F('v4') || F('win')) }; },
  aclaw: (f, t, F) => ({ n: f.mv.land ? (F('smashland') || F('crouch')) : t < 4 ? (F('jump') || F('air')) : (F('x4') || F('fkick')), rot: !f.mv.land && t >= 4 ? 0.35 : 0 }),
  eightclaw: (f, t, F) => { const M = f.mv; if (!M.got) return { n: t < 4 ? (F('x1') || F('windup')) : (F('rush2') || F('dash')) }; const u = t - M.got; if (u >= 54) return { n: F('dp3') || F('x4') || F('upper3'), dy: -20 }; return { n: (Math.floor(u / 6) % 2 ? F('x3') : F('x2')) || F('jab3'), sx: Math.floor(u / 12) % 2 ? -1 : 1 }; },
  pillar: (f, t, F) => ({ n: t < 16 ? (F('fb1') || F('windup')) : (F('fb3') || F('jab3')) }),
  kyo3b: (f, t, F) => { const n = f.mv.n ?? 0, u = t - (f.mv.t0 || 0), su = [10, 8, 12][n]; return u < su ? { n: [F('heavy1') || F('windup'), F('crouch1') || F('crouch'), F('jump') || F('windup')][n], dy: n === 2 ? -Math.sin(u / su * Math.PI) * 60 : 0 } : { n: [F('rush2') || F('heavy3'), F('dp3') || F('upper3'), F('smash') || F('heavy3')][n] }; },
  gsum: (f, t, F) => { const M = f.mv; if (!M.got) return { n: t < 8 ? (F('windup') || F('crouch')) : (F('rush2') || F('dash')) }; const u = t - M.got; return { n: u < 26 ? (F('throw2') || F('throw1')) : (F('throw3') || F('heavy3')) }; },
  gdive: (f, t, F) => ({ n: f.mv.land ? (F('smashland') || F('crouch')) : (F('smash') || F('fkick')) }),
  gptrush: (f, t, F) => { const M = f.mv; if (!M.got) return { n: F('rush2') || F('dash') }; const u = t - M.got; if (u >= 50) return { n: F('fin1') || F('dp3') || F('upper3') }; return { n: [F('jab3'), F('heavy3'), F('kick3'), F('sg52') || F('upper3')][Math.floor(u / 7) % 4] || F('jab3') }; },      // 第 67 圈（B）：收尾「以上就是全部内容」= 低弓步推掌 fin1（原来是通用直立高举 upper3）
  glide: (f, t, F) => ({ n: f.mv.land ? (F('smashland') || F('crouch')) : f.mv.kick != null ? (F('fkick') || F('kick3')) : (F('jump') || F('air')), rot: f.mv.kick != null && !f.mv.land ? 0.5 : 0, sx: f.mv.kick == null && !f.mv.from ? -1 : 1 }),
  bflip: (f, t, F) => ({ n: f.mv.land ? (F('smashland') || F('crouch')) : t < 20 ? (F('roll') || F('jump')) : (F('smash') || F('heavy3')), rot: !f.mv.land && t >= 3 && t < 20 ? -f.face * (t - 3) / 17 * Math.PI * 2 : 0 }),
  athrow: (f, t, F) => ({ n: f.mv.land ? (F('throw4') || F('crouch')) : (F('throw2') || F('throw1')) }),
  superbee: (f, t, F) => { const k = Math.floor(t / 3) % 4; return { n: F('spin' + (k + 1)) || F('fb3'), sx: F('spin1') ? 1 : (k % 2 ? -1 : 1) }; },
  lwindmill: (f, t, F) => { const k = Math.floor(t / 4) % 4; return { n: F('spin' + (k + 1)) || F('heavy3'), sx: F('spin1') ? 1 : (k % 2 ? -1 : 1), sy: 0.86, dy: 8 }; },
  slariat: (f, t, F) => { const k = Math.floor(t / 3) % 4; return { n: F('spin' + (k + 1)) || F('heavy3'), sx: F('spin1') ? 1 : (k % 2 ? -1 : 1) }; },
  hbutt: (f, t, F) => ({ n: t < 10 ? (F('crouch1') || F('windup')) : (F('dp2') || F('upper3') || F('heavy3')), dy: t >= 10 && t < 20 ? -20 : 0 }),
  splash: (f, t, F) => ({ n: f.mv.land ? (F('smashland') || F('crouch')) : (F('smash') || F('air')), rot: f.mv.land ? 0 : f.face * 1.2 }),
  siberia: (f, t, F) => { const M = f.mv; if (!M.got) return { n: t < 6 ? (F('windup') || F('crouch')) : (F('throw1') || F('jab3')) }; const u = t - M.got; return { n: u < 18 ? (F('throw2') || F('throw1')) : (F('throw4') || F('smashland')) }; },
  aslam: (f, t, F) => { const M = f.mv; if (!M.got) return { n: f.y > 0 ? (F('throw1') || F('jump')) : (F('crouch1') || F('crouch')) }; return { n: f.mv.land ? (F('smashland') || F('throw4')) : (F('throw3') || F('smash')), rot: !f.mv.land && t - M.got < 30 ? (t - M.got) * 0.4 * f.face : 0 }; },
  ucounter: (f, t, F) => ({ n: f.mv.hit ? (F('throw3') || F('heavy3')) : (F('dparry') || F('guard')) }),
  lcounter: (f, t, F) => ({ n: f.mv.hit ? (F('smash') || F('sweep')) : (F('cguard') || F('crouch')) }),
  mcounter: (f, t, F) => ({ n: f.mv.hit ? (F('heavy3') || F('jab3')) : (F('dparry') || F('guard')) }),
  apaper: (f, t, F) => ({ n: t < 8 ? (F('fb2') || F('air')) : (F('fb4') || F('air')) }),
  otg: (f, t, F) => { const M = f.mv; if (!M.got) return { n: F('throw1') || F('crouch') }; const u = t - M.got; return { n: u < 24 ? (F('throw2') || F('throw1')) : (F('throw4') || F('heavy3')) }; },
  drave: (f, t, F) => { const M = f.mv; if (!M.got) return { n: F('rush2') || F('dash') }; if (M.fin != null) return { n: t - M.fin < 10 ? (F('heavy3') || F('jab3')) : (F('win') || F('stance')) }; const k = { a: 'jab3', lk: 'kick3', hp: 'heavy3', hk: 'kick3' }[DRAVE_R[Math.max(0, (M.i || 1) - 1)]]; return { n: F(k) || F('jab3') }; },
  storm: (f, t, F) => ({ n: t < 14 ? (F('windup') || F('stance')) : (F('win') || F('dp3') || F('stance')) }),
  lobmoon: (f, t, F) => ({ n: t < 8 ? (F('fb1') || F('windup')) : t < 14 ? F('fb2') : (F('fb3') || F('jab3')) }),
  amoon: (f, t, F) => ({ n: t < 7 ? (F('fb2') || F('air')) : (F('fb4') || F('air')) }),
  zbreath: (f, t, F) => ({ n: t < 10 ? (F('z1') || F('windup')) : (F('fb3') || F('jab3')) }),
  fullmoon: (f, t, F) => ({ n: f.mv.go ? (F('fb3') || F('jab3')) : (F('fb1') || F('windup')) }),
  mpillar: (f, t, F) => ({ n: t < 10 ? (F('windup') || F('stance')) : (F('fin1') || F('win') || F('fb3') || F('stance')) }),      // 第 68 圈：收尾专属帧 fin1（卷轴环身）
  blade: (f, t, F) => ({ n: t < 12 ? (F('windup') || F('heavy1')) : (F('heavy3') || F('jab3')) }),
  rapidbook: (f, t, F) => ({ n: (Math.floor(t / 6) % 2 ? F('fb3') : F('fb2')) || F('jab3') }),
  nocharge: (f, t, F) => ({ n: F('fin1') || F('win') || F('stance') }),      // 第 68 圈：fin1 = 弓步指点
  tripflash: (f, t, F) => ({ n: f.y > 0 ? (F('dp3') || F('fkick')) : (F('crouch1') || F('crouch')), rot: f.y > 0 ? -f.face * Math.min(1, (t - (f.mv.t0 || 0)) / 14) * 0.9 : 0 }),
  tenshou: (f, t, F) => ({ n: t < 3 ? (F('crouch1') || F('crouch')) : f.mv.land ? F('stance') : (F('dp3') || F('kick3')), rot: !f.mv.land && t >= 3 ? f.face * Math.sin(t * 0.5) * 0.3 : 0 }),
  pose: (f, t, F) => { const M = f.mv; if (!M.f) return { n: F('z1') || F('win') || F('stance') }; return { n: { a: F('jab3'), hp: F('heavy3'), lk: F('sweep'), hk: F('smash') || F('kick3') }[M.f] || F('jab3') }; },
  bigqi: (f, t, F) => ({ n: t < 8 ? (F('windup') || F('crouch')) : (F('fin1') || F('fb3') || F('win')) }),      // 第 68 圈：fin1 = 弓步比心
  rushkick: (f, t, F) => ({ n: f.mv.got && t - f.mv.got >= 44 ? (F('dp3') || F('kick3')) : (Math.floor(t / 3) % 2 ? F('kick3') : F('kick2')) || F('kick3') }),
  bslam: (f, t, F) => ({ n: f.mv.land ? (F('smashland') || F('crouch')) : (F('yair') || F('smash')) }),
  stamp: (f, t, F) => { const M = f.mv; if (!M.got) return { n: t < 5 ? F('throw1') : (F('x3') || F('jab3')) }; const u = t - M.got; return { n: u < 22 ? (F('x3') || F('heavy3')) : (F('x4') || F('win')) }; },
  claw3: (f, t, F) => { const n = f.mv.n ?? 0, u = t - (f.mv.t0 || 0), su = [f.mv.v === 'b' || f.mv.ex ? 8 : 10, 6, 10][n]; return u < su ? { n: [F('rush1') || F('windup'), F('x1') || F('windup'), F('jump') || F('windup')][n], dy: n === 2 ? -Math.sin(u / su * Math.PI) * 50 : 0 } : { n: [F('yfwd') || F('heavy3'), F('x2') || F('jab3'), F('ymid') || F('heavy3')][n] }; },
  flip: (f, t, F) => { const M = f.mv; return { n: (!M.got ? (F('v1') || F('throw1')) : (t - M.got < 8 ? F('v2') : F('v4'))) || F('throw4') }; },
  bclaw: (f, t, F) => ({ n: f.mv.land ? (F('smashland') || F('crouch')) : t < 18 ? (F('jump') || F('air')) : (F('x4') || F('fkick')) }),
  flurry: (f, t, F) => ({ n: t < 7 ? (F('x1') || F('windup')) : ((Math.floor((t - 7) / 5) % 2 ? F('x3') : F('x2')) || F('jab3')) }),
  knead: (f, t, F) => { const M = f.mv; if (!M.got) return { n: F('w1') || F('rush2') }; const u = t - M.got; return { n: u < 36 ? (Math.floor(u / 6) % 2 ? F('w3') : F('w2')) : (F('w4') || F('kick3')) }; },
  mambo: (f, t, F) => ({ n: F('z2') || F('win'), sx: Math.floor(t / 10) % 2 ? -1 : 1 }),
};
// 人的普通技 → 用哪一组逐帧图（没有专门图之前先借现有的：轻脚 / 重脚借侧踢，重拳借重击，蹲重拳借上勾拳）
// 第 35 圈：多帧序列。p 帧名前缀；s 前摇帧（权重 sw）；a 出手帧；r 收招帧（权重 rw，re = 收招的前多少比例在播序列、之后回站姿）；dx 每帧的水平位移（画里已经有踏步，只补一点）
const SEQS = { shp: { p: 'hp', s: [1, 2, 3], sw: [0.42, 0.42, 0.16], a: 4, r: [5, 6, 7, 8], rw: [0.2, 0.26, 0.28, 0.26], re: 1, dx: [-6, -16, -22, -30, -30, -20, -8, 0] }      /* 画里已经有大踏步，往回收一点免得和对手叠在一起 */, shpc: null, slp: { p: 'lp', s: [1, 2], sw: [0.5, 0.5], a: 3, r: [4], rw: [1], re: 0.7, dx: [0, 6, 10, 4] },
  shk: { p: 'hk', s: [1, 2, 3], sw: [0.34, 0.38, 0.28], a: 4, r: [5, 6, 7, 8], rw: [0.22, 0.26, 0.28, 0.24], re: 1, dx: [0, -6, 0, 8, 8, 4, 0, 0] } };
SEQS.shkc = SEQS.shk;
SEQS.chp = { p: 'aa', s: [1, 2], sw: [0.55, 0.45], a: 3, r: [4], rw: [1], re: 0.75, dx: [0, 4, 8, 4] };      // 第 42 圈：蹲重拳（对空）4 帧
SEQS.shpc = SEQS.shp;
function seqAt(Q, A, t) {      // 返回 { i 当前帧号, prev 上一帧号, fresh 是不是刚换帧 }
  const at = u => { if (u < A.su) { let acc = 0; for (let k = 0; k < Q.s.length; k++) { acc += Q.sw[k] * A.su; if (u < acc - 1e-6) return Q.s[k]; } return Q.s[Q.s.length - 1]; }
    if (u < A.su + A.ac) return Q.a; const R = Math.max(1, A.rc * Q.re); let acc = A.su + A.ac; for (let k = 0; k < Q.r.length; k++) { acc += Q.rw[k] * R; if (u < acc - 1e-6) return Q.r[k]; } return Q.re < 1 ? 0 : Q.r[Q.r.length - 1]; };
  const i = at(t), p = t > 0 ? at(t - 1) : 0; return { i: i || Q.r[Q.r.length - 1], prev: p, fresh: i !== p && p > 0, done: !i };
}
const SPIN = { ds: { slp: { k: 0.4, arc: 'fist', n: 'mlb' } }, gpt: { shk: { k: 0.4, arc: 'foot', n: 'mkb' }, fhk: { k: 0.4, arc: 'foot', n: 'mkb' }, bhk: { k: 0.4, arc: 'foot', n: 'mkb' } } };      // 第 79 圈：反手拳 / 回旋踢：k = 起手到几成开始背身，n = 专门的背身帧（没有就把起手帧镜像）
function spinArc(f, A, x, yb, h) {      // 回旋弧：从背后绕过来的一道宽弧（拳 = 胸口高度的扁弧，脚 = 腰到头高的斜大弧），白芯 + 角色副色
  const k = A.age / 8; if (k < 0 || k > 1) return; const face = f.face, foot = A.typ === 'foot', cy = yb - h * (foot ? 0.5 : 0.5), R = h * (foot ? 0.6 : 0.46), ry = foot ? 0.55 : 0.28, a0 = foot ? -2.6 : -2.9, a1 = foot ? 0.15 : 0.2, sweep = a0 + (a1 - a0) * Math.min(1, k * 2.2);
  g.save(); g.translate(x, cy); g.scale(face, ry); g.rotate(foot ? -0.35 : 0); g.lineCap = 'round'; g.globalAlpha = (1 - k) * 0.95;
  for (const [w, c] of [[h * 0.16, rgba(f.ch.col, 0.35)], [h * 0.08, rgba(f.ch.col2, 0.85)], [h * 0.025, '#FFFFFF']]) { g.strokeStyle = c; g.lineWidth = w / ry * 0.5; g.beginPath(); g.arc(0, 0, R, Math.max(a0, sweep - 1.9), sweep); g.stroke(); }
  g.restore();
}
const MSEQ = { slp: ['ml1', 'ml2', 'ml2'], slk: ['ml3', 'ml4', 'ml3'], shp: ['mh1', 'mh2', 'mh3'], shpc: ['mh1', 'mh4', 'mh4'], shk: ['mk1', 'mk2', 'mk3'], fhk: ['mk1', 'mk2', 'mk3'], bhk: ['mk1', 'mk2', 'mk3'], shkc: ['mk1', 'mk4', 'mk4'], chp: ['mc3', 'mc4', 'ms4'], kchp: ['mc3', 'mc4', 'ms4'], kshp: ['mh1', 'mh2', 'mh3'], kshk: ['mk1', 'mk2', 'mk3'], gstep: ['mk1', 'mk2', 'mk3'], gelb: ['mh1', 'mh4', 'mh4'] };      // 第 69 圈（H2）：加对空 chp / Kimi 长手 / GLM 踏步踢、回身肘
const CSEQ = { clp: ['-', 'mc1', '-'], clk: ['-', 'mc2', '-'], chk: ['ms1', 'ms2', 'ms3'], sweep: ['ms1', 'ms2', 'ms3'] };      // 第 69 圈（H2）：蹲攻击 [起手, 命中, 收招]，'-' = 蹲姿      // 第 68 圈：专属普通技 [起手, 命中, 收招]
const OWNK = { slk: 'nslk', shk: 'nshk', shkc: 'nshk', fhk: 'nshk', bhk: 'nshk', chp: 'nchp', shp: 'nshp', shpc: 'nshp' };      // 有专用普通技帧（E 图）就用专用的
const NKEY = { daxe: 'kick', gsob: 'kick', ghammer: 'heavy', gstep: 'kick', gelb: 'heavy', flipk: 'kick', slp: 'jab', slk: 'kick', shp: 'heavy', shpc: 'heavy', shk: 'kick', shkc: 'kick', fhk: 'kick', bhk: 'kick', chp: 'upper', light: 'jab', light2: 'upper', light3: 'kick', heavy: 'heavy', mid: 'heavy', fwdk: 'heavy' };
