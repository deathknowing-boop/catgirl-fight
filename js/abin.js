// 网页版图片包加载（第 47 圈）：每个 assets_*.js 只是索引，图片本体在同名 .pack.webp；fetch 回来切成 blob URL 填进 ASSET_DATA，loadImg 等 ASSET_READY
// 第 52 圈：取不到时重试 3 次（第 2 次起加 ?r= 绕开缓存）；还失败就退回 XHR；全部失败记进 ASSET_FAIL，标题画面会提示「图片包没加载上，请刷新」
window.ASSET_DATA = {}; window.ASSET_READY = Promise.resolve(); window.ASSET_FAIL = [];
(() => {
  const viaXhr = url => new Promise((res, rej) => { const x = new XMLHttpRequest(); x.open('GET', url); x.responseType = 'arraybuffer'; x.onload = () => (x.status === 200 || (x.status === 0 && x.response && x.response.byteLength)) ? res(x.response) : rej(new Error(url + ' xhr ' + x.status)); x.onerror = () => rej(new Error(url + ' xhr error')); x.send(); });
  const get = (file, n) => fetch(n ? file + '?r=' + n : file).then(r => { if (!r.ok) throw new Error(file + ' ' + r.status); return window.CF_READ ? CF_READ(r, file) : r.arrayBuffer(); })
    .catch(e => n < 2 ? new Promise(ok => setTimeout(ok, 400 * (n + 1))).then(() => get(file, n + 1)) : viaXhr(file));
  window.ABIN = (file, idx) => {
    const p = get(file, 0).then(buf => {
      let need = 0; for (const k in idx) need = Math.max(need, idx[k][0] + idx[k][1]);
      if (buf.byteLength < need) throw new Error(file + ' 长度不够 ' + buf.byteLength + ' < ' + need);
      for (const k in idx) { const v = idx[k]; ASSET_DATA[k] = URL.createObjectURL(new Blob([new Uint8Array(buf, v[0], v[1])], { type: v[2] })); }
    }).catch(e => { window.ASSET_FAIL.push(file); console.error('PACK FAIL', e); });
    window.ASSET_READY = Promise.all([window.ASSET_READY, p]);
  };
})();
