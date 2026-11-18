// ===== 角色、招式、场地数据（浏览器和 node 通用）=====
(function (root) {
  // spr：各状态用哪张立绘；k：这张立绘相对站姿的显示高度比例
  const CH = {
    ds: {
      id: 'ds', name: '大肥鱼', en: 'DeepSeek', model: 'DeepSeek-V4-Pro', style: '深度思考流', col: '#4D6BFE', col2: '#9EC5FF', ink: '#16237A',
      hp: 1000, speed: 400, h: 400, dmg: 1.0,
      spr: { idle: 'ds_A_4', walk: ['ds_run_a', 'ds_run_b'], jump: 'ds_jump', light: 'ds_point', heavy: 'ds_B_3', hit: 'ds_B_1', block: 'ds_hug_file', down: 'ds_collapse', win: 'ds_twirl', sp: 'ds_dance_a', su: 'ds_typing', stun: 'ds_C_1', dash: 'ds_chase', intro: 'ds_A_2', lose: 'ds_B_2', cheer: 'ds_plead', sleep: 'ds_C_2' },
      sp: { id: 'popup', name: '服务器繁忙', cd: 190, stk: 'ds_busy' }, su: { id: 'wave', name: '深度思考 · token 来！', stk: 'ds_think' },
      stkWin: 'ds_rice', stkLose: 'ds_cry', stkIntro: 'ds_hi', quote: '本鱼来啦！这碗饭是本鱼的！', winq: '干饭！',
      ai: { range: 230, block: 0.42, sp: 0.5, far: 460, zoner: 0 },
    },
    gem: {
      id: 'gem', name: '哈基米', en: 'Gemini', model: 'Gemini-4-Argon', style: '偷饭猫拳', col: '#B15CF5', col2: '#F0C2FF', ink: '#4A148C',
      hp: 1000, speed: 520, h: 425, dmg: 1.06,
      spr: { idle: 'gem', walk: ['gem_sneak', 'gem'], jump: 'gem_pounce', light: 'gem_pounce', heavy: 'gem_pounce', hit: 'gem', down: 'gem', win: 'gem_lick', sp: 'gem_pounce', su: 'gem', dash: 'gem_sneak' },
      sp: { id: 'pounce', name: '飞扑', cd: 130, stk: 'gem_pounce' }, su: { id: 'flash', name: '闪光关不掉', stk: 'gem_meow' },
      stkWin: 'gem_lick', stkLose: 'gem_meow', stkIntro: 'gem_meow', quote: '大肥鱼归我喵！饭也归我喵！', winq: '这饭真香喵～',
      ai: { range: 210, block: 0.42, sp: 0.6, far: 380, zoner: 0 },
    },
    gpt: {
      id: 'gpt', name: 'GPT', en: 'GPT', model: 'GPT-6.1', style: '三点论', col: '#8E7CF0', col2: '#E4DEFF', ink: '#3E2FA8',
      hp: 1000, speed: 380, h: 440, dmg: 1.0,
      spr: { idle: 'gpt', walk: ['gpt'], sp: 'gpt', su: 'gpt' },
      sp: { id: 'three', name: '首先、其次、最后', cd: 200, stk: 'gpt_first' }, su: { id: 'beam', name: '好的！以下是……', stk: 'gpt_wait' },
      stkWin: 'gpt_wait', stkLose: 'gpt_first', stkIntro: 'gpt_first', quote: '好的！以下是我的三点战术……', winq: '综上所述，我赢了。',
      ai: { range: 240, block: 0.46, sp: 0.6, far: 620, zoner: 1 },
    },
    grok: {
      id: 'grok', name: 'Grok', en: 'Grok', model: 'Grok-4.7', style: '病娇斧术', col: '#E0475B', col2: '#FFD0B0', ink: '#5A0A18',
      hp: 1040, speed: 350, h: 520, dmg: 1.04,
      spr: { idle: 'grok', walk: ['grok'], sp: 'grok', su: 'grok_note', win: 'grok_note' },
      sp: { id: 'axe', name: '一斧劈开', cd: 200, stk: 'grok_stare' }, su: { id: 'revenge', name: '记在小本本上了', stk: 'grok_note' },
      stkWin: 'grok_note', stkLose: 'grok_stare', stkIntro: 'grok_stare', quote: '嘻嘻，打了我可要负责到底哦。', winq: '记下了。',
      ai: { range: 240, block: 0.35, sp: 0.55, far: 300, zoner: 0 },
    },
    kimi: {
      id: 'kimi', name: 'Kimi', en: 'Kimi', model: 'Kimi-K3', style: '长文卷轴', col: '#5B6CB8', col2: '#DDE4FF', ink: '#1C2456',
      hp: 980, speed: 390, h: 420, dmg: 1.0,
      spr: { idle: 'kimi', walk: ['kimi'], sp: 'kimi', su: 'kimi', down: 'kimi_sleep', sleep: 'kimi_sleep', win: 'kimi' },
      sp: { id: 'scroll', name: '一口气读完', cd: 190, stk: 'kimi_read' }, su: { id: 'drop', name: '两百万字上下文', stk: 'kimi_sleep' },
      stkWin: 'kimi_read', stkLose: 'kimi_sleep', stkIntro: 'kimi_read', quote: '把你的招式全给我，我一口气读完。', winq: '读完了……困了。',
      ai: { range: 250, block: 0.4, sp: 0.6, far: 520, zoner: 1 },
    },
    glm: {
      id: 'glm', name: 'GLM', en: 'GLM', model: 'GLM-5.3', style: '脚本流', col: '#3D4B7A', col2: '#C9D4EE', ink: '#0E1430',
      hp: 1000, speed: 380, h: 450, dmg: 1.0,
      spr: { idle: 'glm', walk: ['glm'], sp: 'glm', su: 'glm' },
      sp: { id: 'script', name: '先写个脚本', cd: 330, stk: 'glm_conf' }, su: { id: 'lock', name: '置信度 100%', stk: 'glm_conf' },
      stkWin: 'glm_conf', stkLose: 'glm_conf', stkIntro: 'glm_conf', quote: '我先写个脚本，胜率已经算好了。', winq: '结果在置信区间内。',
      ai: { range: 240, block: 0.45, sp: 0.7, far: 640, zoner: 1 },
    },
    qwen: {
      id: 'qwen', name: '千问', en: 'Qwen', model: 'Qwen3.8-Max', style: '小号人海', col: '#5A63E8', col2: '#C9D0FF', ink: '#141C8A',
      hp: 1000, speed: 400, h: 440, dmg: 0.98,
      spr: { idle: 'qwen', walk: ['qwen'], sp: 'qwen', su: 'qwen_tea', win: 'qwen_tea' },
      sp: { id: 'alts', name: '叫两个小号', cd: 220, stk: 'qwen_tea' }, su: { id: 'rain', name: '亲，已下单', stk: 'qwen_order' },
      stkWin: 'qwen_tea', stkLose: 'qwen_order', stkIntro: 'qwen_tea', quote: '亲～这边三位一起上哦。', winq: '亲，给个好评哦。',
      ai: { range: 240, block: 0.4, sp: 0.6, far: 520, zoner: 1 },
    },
    claude: {
      id: 'claude', name: 'Claude', en: 'Claude', model: 'Claude（本人）', style: '完全正确拳', col: '#E8743B', col2: '#FFD9B8', ink: '#7A2E0C',
      hp: 1000, speed: 400, h: 450, dmg: 1.0,
      spr: { idle: 'claude', walk: ['claude'], sp: 'claude_right', su: 'claude_code', win: 'claude_right' },
      sp: { id: 'counter', name: '你说得完全正确', cd: 220, stk: 'claude_right' }, su: { id: 'fix', name: '顺手修了个 bug', stk: 'claude_fix' },
      stkWin: 'claude_book', stkLose: 'claude_blush', stkIntro: 'claude_book', quote: '（合上书）请多指教。', winq: '你说得完全正确，但是我赢了。',
      ai: { range: 230, block: 0.5, sp: 0.5, far: 400, zoner: 0 },
    },
    dou: {
      id: 'dou', name: '豆包', en: 'Doubao', model: 'Doubao-Seed-2.1', style: '画风突变', col: '#1677FF', col2: '#BFE0FF', ink: '#06378F',
      hp: 1000, speed: 430, h: 470, dmg: 1.0,
      spr: { idle: 'dou', walk: ['dou'], light: 'dou_recruit', heavy: 'dou_recruit', sp: 'dou_recruit', su: 'dou_recruit', down: 'dou_lose', win: 'dou_recruit' },
      sp: { id: 'tea', name: '奶茶管够', cd: 190, stk: 'dou_recruit' }, su: { id: 'style', name: '画风突变', stk: 'dou_hug' },
      stkWin: 'dou_hug', stkLose: 'dou_lose', stkIntro: 'dou_recruit', quote: '来我这，奶茶管够！', winq: '抱抱！下次还来哦。',
      ai: { range: 235, block: 0.38, sp: 0.6, far: 480, zoner: 0 },
    },
  };
  // 第 67 圈：两个原创客串角色（用户要求，提高流量）。没有旧立绘，spr 直接指逐帧图；guest = 选人格子上标「客串」
  const GSPR = id => ({ idle: `f_${id}_stance`, walk: [`f_${id}_walk1`, `f_${id}_walk3`], jump: `f_${id}_jump`, light: `f_${id}_jab`, heavy: `f_${id}_heavy`, hit: `f_${id}_hurt`, block: `f_${id}_guard`, down: `f_${id}_down`, win: `f_${id}_win`, sp: `f_${id}_heavy`, su: `f_${id}_win`, dash: `f_${id}_dash`, intro: `f_${id}_stance`, lose: `f_${id}_hurt2`, stun: `f_${id}_dizzy` });
  Object.assign(CH, {
    surf: { id: 'surf', name: '浪花', en: 'Surfy', model: '客串 · 网上冲浪选手', style: '网上冲浪流', col: '#19B6B0', col2: '#FF8A73', ink: '#0B4B57', guest: 1,
      hp: 1000, speed: 430, h: 430, dmg: 1.0, spr: GSPR('surf'),
      sp: { id: 'wcannon', name: '热搜水炮', cd: 170, stk: null }, su: { id: 'wave', name: '冲上热搜', stk: null },
      quote: '今天的浪，我承包了！防晒涂了吗？', winq: '这波流量，我接住了～',
      ai: { range: 240, block: 0.42, sp: 0.6, far: 520, zoner: 1 } },
    nin: { id: 'nin', name: '小忍', en: 'Shinobi 404', model: '客串 · 四〇四号忍者', style: '404 隐身流', col: '#2EC8F0', col2: '#B9F3FF', ink: '#141A4A', guest: 1,
      hp: 950, speed: 470, h: 430, dmg: 1.02, spr: GSPR('nin'),
      sp: { id: 'shuri', name: '验证码手里剑', cd: 160, stk: null }, su: { id: 'revenge', name: '瞬移斩 · 404', stk: null },
      quote: '你要找的对手……404 Not Found。', winq: '页面已失效，请刷新重试。',
      ai: { range: 230, block: 0.38, sp: 0.6, far: 460, zoner: 0 } },
  });
  const ORDER = ['ds', 'gpt', 'claude', 'gem', 'grok', 'kimi', 'glm', 'qwen', 'dou'];   // 第 67 圈：客串 surf / nin 有图时由 selui.js 追加到末尾   // 选人九宫格顺序
  // 每张立绘相对「站姿高度」的显示比例（按头的大小对齐过；坐着、躺着、带大道具的单独给）
  const SPRK = { ds_A_4: 1.06, ds_hug_file: 1.03, ds_point: 1.02, ds_stretch: 1.05, ds_twirl: 0.98, ds_dance_a: 1.08, ds_dance_b: 1.05, ds_typing: 0.86, ds_collapse: 0.62, ds_jump: 0.98, ds_chase: 0.95, ds_run_a: 0.93, ds_run_b: 0.93,
    ds_plead: 1.0, ds_A_1: 1.0, ds_A_2: 1.02, ds_A_3: 1.06, ds_B_1: 1.0, ds_B_2: 1.03, ds_B_3: 1.0, ds_B_4: 1.02, ds_C_1: 1.1, ds_C_2: 1.04, ds_C_3: 1.0, ds_C_4: 1.0,
    gem_sneak: 0.9, kimi_sleep: 0.8, claude_code: 0.97, dou_recruit: 1.06, dou_lose: 0.72 };
  const STAGES = {
    office: { name: '运营部办公室', floor: 905, env: { col: '#2E3C86', a: 0.09, bot: 0.24, top: 'rgba(120,170,255,0.10)' }, sh: '0,0,6', shA: 1.45, dust: '#B8C4F0', rim: '#8FC4FF' },
    meeting: { name: '会议室 · 早会桌上', floor: 868, env: { col: '#8A5530', a: 0.08, bot: 0.26, top: 'rgba(255,210,150,0.10)' }, sh: '30,14,6', dust: '#E8C9A8', rim: '#FFD29A' },
    nextdoor: { name: '隔壁书房', floor: 915, env: { col: '#B8682A', a: 0.10, bot: 0.26, top: 'rgba(255,200,130,0.12)' }, sh: '36,14,4', dust: '#F0D2A8', rim: '#FFC07A' },
    rooftop: { name: '总部天台 · 最后的饭桶', floor: 905, env: { col: '#5A3C9E', a: 0.1, bot: 0.26, top: 'rgba(170,120,255,0.12)' }, sh: '10,0,30', dust: '#C8B8F0', rim: '#B89CFF' },      // 第 65 圈：最终头目战场地（GPT 出图）
    fishplanet: { name: '大肥鱼星球', floor: 930, env: { col: '#3A3C9E', a: 0.1, bot: 0.22, top: 'rgba(140,170,255,0.14)' }, sh: '10,10,40', dust: '#D8E4FF', rim: '#9FC8FF' },      // 第 68 圈：动态舞台（js/stage2.js）
    waterside: { name: '大肥鱼池塘 · 雨夜鸟居', floor: 930, env: { col: '#2A3C8E', a: 0.12, bot: 0.24, top: 'rgba(140,180,255,0.14)' }, sh: '4,6,24', shA: 1.3, dust: '#B0C4F0', rim: '#9FC4FF' },      // 第 77 圈：雨夜湖畔（stage2.js 的 WS / WSP；有底图用底图，没有就程序画）
    interview: { name: '面试间 · 饭就在桌上', floor: 884, env: { col: '#4E86A8', a: 0.07, bot: 0.22, top: 'rgba(200,240,255,0.10)' }, sh: '20,24,30', dust: '#E8E2D8', rim: '#CFF0FF' },   // env：人物的环境光；sh：接触阴影的颜色；dust：尘土颜色
  };
  const HOME = { surf: 'waterside', nin: 'waterside', ds: 'fishplanet', gem: 'office', gpt: 'meeting', grok: 'meeting', claude: 'meeting', kimi: 'nextdoor', qwen: 'nextdoor', dou: 'interview', glm: 'interview' };   // 各自的主场
  // 对战事件 → 音效名（可玩版实时播放、演示视频离线混音，用的是同一张表）
  const EV_SFX = { clash: 'hit2', ex: 'confirm', fight: 'fight', jump: 'jump', land: 'land', dash: 'dash', su: 'su', freeze: 'freeze', flash: 'flash', axe: 'axe', paper: 'paper', turret: 'turret', wave: 'wave', beam: 'beam', warp: 'warp', mark: 'mark', sleep: 'sleep', charge: 'charge', laser: 'laser', heal: 'heal', style: 'style', splash: 'splash', smash: 'smash', boxland: 'boxland', counter: 'counter', cheer: 'cheer', fall: 'fall', ko: 'ko', timeup: 'timeup', win: 'win' };
  function evSfx(e) {
    if (e.type === 'hit') return e.blk ? 'block' : e.dmg >= 150 ? 'hit3' : e.dmg >= 80 ? 'hit2' : 'hit1';      // 按这一下打掉多少血挑轻重
    if (e.type === 'whoosh') return e.lvl === 2 ? 'whoosh2' : 'whoosh1';
    if (e.type === 'proj') return e.k === 'popup' ? 'popup' : e.k === 'code' ? 'turret' : 'shot';
    if (e.type === 'sp') return e.id === 'counter' ? 'cursor' : null;
    return EV_SFX[e.type] || null;
  }
  const api = { CH, ORDER, SPRK, STAGES, HOME, evSfx };
  if (typeof module !== 'undefined') module.exports = api; else Object.assign(root, api);
})(typeof window !== 'undefined' ? window : globalThis);
