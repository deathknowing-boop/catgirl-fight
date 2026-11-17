// ===== 启动：加载素材和字体，然后按网址参数进入「可玩」「演示（逐帧出片）」或「测试」=====
const QS = new URLSearchParams(location.search);
(async function boot() {
  const bar = p => { g.fillStyle = INK; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(660, 560, 600, 14); g.fillStyle = '#FFE066'; g.fillRect(660, 560, 600 * p, 14); g.fillStyle = '#fff'; g.font = '800 34px sans-serif'; g.textAlign = 'center'; g.fillText('LOADING…', 960, 520); };
  bar(0);
  await Promise.all([loadAll(bar), ...['900 40px NSC', '800 40px NSC', '700 40px NSC', '600 40px NSC', '900 40px Outfit', '800 40px Outfit'].map(f => document.fonts.load(f, '猫娘格斗A1').catch(() => 0))]);
  initPatterns();
  const tm = QS.get('test');
  if (tm === 'title') window.renderFrame = T => drawTitle(T, { coinT: 2.5 });
  else if (tm === 'select') window.renderFrame = T => drawSelect(T, { p1: 'ds', t1: 0, lock1: 0.5, p2: QS.get('p2') || 'kimi', t2: 1.0, lock2: 3, lyric: 'Kimi睡醒喊一声' });
  else if (tm === 'vs') window.renderFrame = T => drawVS(T, { p1: QS.get('p1') || 'ds', p2: QS.get('p2') || 'gem', stage: 'office', busy0: 1.8, busy1: 4.5, lyric: '服务器繁忙 请稍后再试' });
  else if (tm === 'ending') window.renderFrame = T => drawEnding(T, { win: QS.get('p1') || 'ds', thief: QS.get('p2') || 'gem', rev: 4.2 });
  else if (tm === 'over') window.renderFrame = T => { drawTitle(1, {}); drawMatchOver(T, { win: !QS.get('lose'), stageNo: 2, n: 7 }); };
  else if (tm) {          // 测试：直接看一场电脑对电脑，renderFrame(T) 给逐帧截图用
    let sim = null, cur = -1; const mk = () => new Sim({ p1: QS.get('p1') || 'ds', p2: QS.get('p2') || 'gem', seed: +(QS.get('seed') || 1), stage: QS.get('stage') || 'office', final: !!QS.get('final'), cheer: QS.get('final') ? [true, false] : false, wins: QS.get('final') ? [1, 1] : [0, 0], round: QS.get('final') ? 3 : 1 });
    window.renderFrame = T => { const n = Math.round(T * 30); if (!sim || n < cur) { sim = mk(); cur = 0; } while (cur < n) { sim.advance(2); cur++; } drawFight(sim); };
    window.SIM = () => sim;
  } else if (QS.get('demo')) { startDemo(); if (window.DEMO_READY) await window.DEMO_READY; }
  else startPlay();
  window.READY = true;
})();
