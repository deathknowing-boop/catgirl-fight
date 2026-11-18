// 第 68 圈：玩家设置（配乐 / 难度 / 冷却），存 localStorage 'cf_opt'（读写都 try/catch：沙箱 iframe 里可能不让用）
// 标题页 / 选人页 / 暂停菜单：B 切歌、N 难度、C 冷却。页面顶部的设置条 drawOptBar 显示当前值，点一下设置条上的格子也能切
// pack：网页版（托管只认图片等扩展名）把 m4a 原样存成 .pack.webp，取回来转成 audio/mp4 的 blob URL
const BGMS = [{ id: 'erhu', name: '二胡摇滚', src: 'assets/bgm_erhu.m4a', pack: 'js/bgm_erhu.pack.webp' }, { id: 'office', name: '原版主题曲', src: 'assets/bgm.m4a' }, { id: 'off', name: '关闭' }];
const DIFFS = [{ id: 'easy', name: '简单', base: 1, col: '#5BE08A' }, { id: 'normal', name: '普通', base: 3, col: '#7FC8FF' }, { id: 'hard', name: '困难', base: 5, col: '#FFB347' }, { id: 'hell', name: '地狱', base: 7, col: '#FF5A6E' }];      // base = 第一关手柄电脑级数 + 1（play.js 的 padLv：base − 1 + 每三关 +1 + 头目 +1）。旧默认 4 → 现在默认「普通」= 3，低一档
const CDS = [{ id: 'fast', name: '爽快 0CD', col: '#FFE066' }, { id: 'std', name: '标准（CD 减半）', col: '#BFD4FF' }];
const OPT = (() => { const d = { bgm: 'erhu', diff: 'normal', cd: 'fast', stage: 'auto' }; try { const o = JSON.parse(localStorage.getItem('cf_opt') || '{}'); for (const k in d) if (o[k] != null) d[k] = o[k]; } catch (e) {} return d; })();
function optSave() { try { localStorage.setItem('cf_opt', JSON.stringify(OPT)); } catch (e) {} }
function bgmList() { return BGMS.filter(b => !(window.NO_BGM && b.id === 'office')); }      // 网页版不带原版主题曲（体积上限），只有二胡摇滚 / 关闭
if (!bgmList().some(b => b.id === OPT.bgm)) OPT.bgm = 'erhu';
const OPTUI = { toast: null, toastT: 0, hit: [] };
function stageList() { return [{ id: 'auto', name: '主场' }].concat(Object.keys(typeof STAGES !== 'undefined' ? STAGES : {}).filter(k => k !== 'rooftop').map(k => ({ id: k, name: STAGES[k].name.split(' · ')[0] }))); }      // 第 68 圈：舞台选择（自动 = 对手主场；最终头目固定天台）
function optDiff() { return DIFFS.find(d => d.id === OPT.diff) || DIFFS[1]; }
function optNext(k) {      // k = 'bgm' | 'diff' | 'cd'
  const L = k === 'bgm' ? bgmList() : k === 'diff' ? DIFFS : k === 'stage' ? stageList() : CDS, i = L.findIndex(x => x.id === OPT[k]), n = L[(i + 1) % L.length]; OPT[k] = n.id; optSave();
  if (k === 'bgm' && typeof bgmSet === 'function') bgmSet(n.id);
  OPTUI.toast = (k === 'bgm' ? '♪ ' : k === 'diff' ? '电脑难度：' : k === 'stage' ? '舞台：' : '必杀冷却：') + n.name; OPTUI.toastT = performance.now() / 1000; if (typeof sfx === 'function') sfx('cursor');
}
function optKey(code) { const k = { KeyB: 'bgm', KeyN: 'diff', KeyC: 'cd', KeyV: 'stage' }[code]; if (!k) return false; optNext(k); return true; }
function optClick(x, y) { for (const h of OPTUI.hit) if (x >= h[0] && x <= h[0] + h[2] && y >= h[1] && y <= h[1] + h[3]) { optNext(h[4]); return true; } return false; }
function drawOptBar(cx, cy, o = {}) {      // 三个小格：♪ 曲名 [B] · 难度 [N] · 冷却 [C]；o.small 用在暂停菜单
  const b = BGMS.find(x => x.id === OPT.bgm) || BGMS[0], d = optDiff(), c = CDS.find(x => x.id === OPT.cd) || CDS[0], sz = o.size || 22;
  const items = [['B', '♪ ' + b.name, b.id === 'off' ? '#8A93B0' : '#9FF3FF', 'bgm'], ['N', '难度 ' + d.name, d.col, 'diff'], ['C', c.id === 'fast' ? '冷却 爽快 0CD' : '冷却 标准', c.col, 'cd']]; if (!o.noStage) { const sl = stageList(), st = sl.find(x => x.id === OPT.stage) || sl[0]; items.push(['V', '舞台 ' + st.name, '#C8A8FF', 'stage']); }
  g.save(); g.font = font(sz, 800, F.cn); const ws = items.map(it => g.measureText(it[1]).width + sz * 2.4), gap = 12, W = ws.reduce((a, v) => a + v, 0) + gap * (items.length - 1); let x = cx - W / 2; const h = sz * 1.7, y = cy - h / 2; OPTUI.hit = [];
  items.forEach((it, i) => { rr(x, y, ws[i], h, h / 2); g.fillStyle = 'rgba(6,10,40,0.82)'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = it[2]; g.stroke();
    rr(x + 6, y + 5, sz * 1.25, h - 10, (h - 10) / 2); g.fillStyle = it[2]; g.fill(); txt(it[0], x + 6 + sz * 0.62, cy + sz * 0.36, { size: sz * 0.9, w: 900, fam: F.en, fill: '#0B1020', align: 'center' });
    txt(it[1], x + sz * 1.6 + 4, cy + sz * 0.36, { size: sz, w: 800, fill: '#fff' }); OPTUI.hit.push([x, y, ws[i], h, it[3]]); x += ws[i] + gap; });
  g.restore();
  const tt = performance.now() / 1000 - OPTUI.toastT; if (OPTUI.toast && tt < 1.6) { const a = tt < 1.2 ? 1 : 1 - (tt - 1.2) / 0.4; txt(OPTUI.toast, cx, cy + h + sz * 1.3, { size: sz * 1.25, w: 900, fill: '#FFE066', stroke: '#0B1020', sw: 7, align: 'center', a }); }
}
