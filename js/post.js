// ===== WebGL 后处理层（第 32 圈，对标街霸 6 的画面后处理：泛光 / 冲击波扭曲 / 色差 / 调色 / 暗角）=====
// 做法：游戏照常画在 2D 画布 #c 上；这里另开一块 WebGL 画布盖在上面（不接收鼠标），每帧把 2D 画布当贴图传上去，
// 走「取亮部 → 1/4 分辨率两遍高斯模糊 → 合成（冲击波扭曲 + 色差 + 泛光 + 调色 + 暗角 + 闪光）」。
// 只在可玩版开；浏览器不支持 WebGL、着色器编不过、或者运行中出错，都自动退回纯 2D（把 WebGL 画布藏起来）。G 键开关。
const POST = (() => {
  const P = { on: false, ok: false, t: 0, shocks: [], ms: 0 };
  let gl, glc, progs = {}, tex, fbo = [], vbuf, W0 = 1920, H0 = 1080, BW = 480, BH = 270;
  const VS = 'attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }';
  const FS_BRIGHT = 'precision mediump float; varying vec2 uv; uniform sampler2D t; uniform float th;\n' +
    'void main(){ vec3 c = texture2D(t, uv).rgb; float l = dot(c, vec3(0.299, 0.587, 0.114)); float sa = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(th, 1.0, l) * (0.55 + 0.45 * smoothstep(0.1, 0.5, sa)), 1.0); }';
  const FS_BLUR = 'precision mediump float; varying vec2 uv; uniform sampler2D t; uniform vec2 d;\n' +
    'void main(){ vec3 s = texture2D(t, uv).rgb * 0.227; s += (texture2D(t, uv + d * 1.385).rgb + texture2D(t, uv - d * 1.385).rgb) * 0.316; s += (texture2D(t, uv + d * 3.231).rgb + texture2D(t, uv - d * 3.231).rgb) * 0.070; gl_FragColor = vec4(s, 1.0); }';
  const FS_FINAL = 'precision mediump float; varying vec2 uv; uniform sampler2D t; uniform sampler2D bl;\n' +
    'uniform vec4 sh[4]; uniform float ca; uniform vec2 caDir; uniform float bloom; uniform vec3 lift; uniform vec3 gain; uniform float sat; uniform float con; uniform float vig; uniform float flash; uniform float desat; uniform vec2 asp; uniform vec2 mb; uniform vec3 rb; uniform vec3 cz; uniform vec4 pe[2]; uniform float pk[2];\n' +
    'vec3 samp(vec2 u, vec2 o){ return vec3(texture2D(t, u + o).r, texture2D(t, u).g, texture2D(t, u - o).b); }\n' +
    'void main(){ vec2 u = uv; for (int i = 0; i < 4; i++) { vec4 s = sh[i]; if (s.w <= 0.0) continue; vec2 dd = (u - s.xy) * asp; float r = length(dd); float ring = s.z; float w = 0.06; float k = exp(-pow((r - ring) / w, 2.0)) * s.w; u -= normalize(dd + 1e-5) / asp * k * 0.035; }\n' +
    '  vec2 o = caDir * ca; vec3 c = samp(u, o);\n' +
    '  float hm = smoothstep(0.1, 0.16, uv.y) * (1.0 - smoothstep(0.82, 0.87, uv.y)); if (cz.z > 0.0) hm *= smoothstep(cz.z, cz.z * 2.4, length((uv - cz.xy) * asp)); for (int i = 0; i < 2; i++) { if (pk[i] <= 0.0) continue; float e = length((uv - pe[i].xy) / pe[i].zw); hm *= 1.0 - pk[i] * (1.0 - smoothstep(0.7, 1.15, e)); }\n' +
    '  if ((length(mb) + rb.z) * hm > 0.0008) { vec3 acc = c; float ws = 1.0; for (int i = 1; i < 12; i++) { float f = float(i) / 11.0; vec2 d = (mb * (f - 0.5) * 2.0 + (rb.xy - u) * rb.z * f) * hm; float w = 1.0 - f * 0.45; acc += samp(u + d, o) * w; ws += w; } c = acc / ws; }\n' +
    '  c += texture2D(bl, u).rgb * bloom;\n' +
    '  float l = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l), c, sat * (1.0 - desat)); c = (c - 0.5) * con + 0.5; c = c * gain + lift * (1.0 - c);\n' +
    '  vec2 q = uv - 0.5; c *= 1.0 - vig * dot(q * asp, q * asp) * 1.6; c = mix(c, vec3(1.0), flash); gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }';
  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  function prog(fs) { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); p.u = {}; return p; }
  const U = (p, n) => p.u[n] ?? (p.u[n] = gl.getUniformLocation(p, n));
  function mkTex(w, h) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); if (w) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); return t; }
  function mkFbo(w, h) { const t = mkTex(w, h), f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, f }; }
  function place() { const r = cv.getBoundingClientRect(); Object.assign(glc.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }); }
  function draw(p, target, w, h) { gl.useProgram(p); gl.bindFramebuffer(gl.FRAMEBUFFER, target); gl.viewport(0, 0, w, h); const a = gl.getAttribLocation(p, 'p'); gl.bindBuffer(gl.ARRAY_BUFFER, vbuf); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
  P.init = () => {
    try {
      glc = document.createElement('canvas'); glc.width = W0; glc.height = H0; glc.id = 'post'; Object.assign(glc.style, { position: 'fixed', pointerEvents: 'none', zIndex: 2 });
      gl = glc.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true }); if (!gl) return false;
      progs.b = prog(FS_BRIGHT); progs.blur = prog(FS_BLUR); progs.f = prog(FS_FINAL);
      vbuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      tex = mkTex(0, 0); fbo = [mkFbo(BW, BH), mkFbo(BW, BH)]; gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      document.body.appendChild(glc); place(); addEventListener('resize', place); P.ok = P.on = true; glc.addEventListener('webglcontextlost', () => P.fail('context lost'));
      return true;
    } catch (e) { console.warn('POST off:', e); P.fail(e); return false; }
  };
  P.fail = e => { P.ok = P.on = false; if (glc) glc.style.display = 'none'; console.warn('后处理关闭，退回 2D：', e); };
  P.toggle = () => { if (!P.ok) return; P.on = !P.on; glc.style.display = P.on ? '' : 'none'; };
  // 每个场地一套调色（lift 暗部加色、gain 亮部倍率、饱和度、对比度）
  const GRADE = { office: { lift: [0.0, 0.01, 0.04], gain: [1.0, 1.02, 1.06], sat: 1.12, con: 1.06 }, meeting: { lift: [0.04, 0.02, 0.0], gain: [1.06, 1.02, 0.96], sat: 1.1, con: 1.05 }, nextdoor: { lift: [0.05, 0.02, 0.0], gain: [1.07, 1.01, 0.94], sat: 1.1, con: 1.06 } };
  const GD = { lift: [0.01, 0.01, 0.02], gain: [1.02, 1.02, 1.03], sat: 1.1, con: 1.05 };
  // 从对局状态里读出这一帧该加什么：重击 / 必杀命中 = 冲击波；COUNTER / PUNISH COUNTER = 色差；超必杀定格 = 背景去色 + 泛光加强
  P.frame = (s) => {
    if (!P.on || !P.ok) return; const t0 = performance.now();
    try {
      let shocks = [], ca = 0, caDir = [1, 0], bloom = 0.22, desat = 0, flash = 0, gr = GD;
      if (s && s.F) {
        gr = GRADE[s.stage] || GD;
        for (const q of s.fx) { if (q.k !== 'spark' || q.t > 16 || (q.lvl || 1) < 2) continue; const [x, y] = w2s(s, q.x, q.y), k = q.t / 16; shocks.push([x / 1920, 1 - y / 1080, 0.02 + k * (q.lvl === 3 ? 0.3 : 0.2), (1 - k) * (q.tier === 2 ? 1.6 : q.lvl === 3 ? 1.2 : 0.8)]); if (q.tier && q.t < 10) { ca = Math.max(ca, (q.tier === 2 ? 0.006 : 0.0035) * (1 - q.t / 10)); caDir = [q.dir || 1, 0.2]; } }
        for (const q of s.fx) if ((q.k === 'wallhit' || q.k === 'gbounce') && q.t < 14) { const [x, y] = w2s(s, q.x, q.y), k = q.t / 14; shocks.push([x / 1920, 1 - y / 1080, 0.03 + k * 0.28, (1 - k) * 1.3]); }
        if (s.freeze > 0 && s.fz) { desat = 0.35; bloom = 0.45; } if (s.cine) bloom = 0.35; if (s.hitstop > 0 && s.hsLvl >= 3) bloom = Math.max(bloom, 0.3);
        if (s.flash > 0) flash = Math.min(0.5, s.flash * 0.4); if (s.phase === 'ko') desat = Math.max(desat, 0.25);
        if (s.exe) { shocks = []; ca = 0; bloom = Math.min(bloom, 0.1); flash *= 0.6; }      // D2（20:48 用户反馈处决发糊）：处决演出里不扭曲、不色散、bloom 压低
      }
      shocks.sort((a, b) => b[3] - a[3]); shocks = shocks.slice(0, 4); while (shocks.length < 4) shocks.push([0, 0, 0, 0]);
      gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.useProgram(progs.b); gl.uniform1i(U(progs.b, 't'), 0); gl.uniform1f(U(progs.b, 'th'), 0.86); draw(progs.b, fbo[0].f, BW, BH);
      for (let i = 0; i < 2; i++) { gl.bindTexture(gl.TEXTURE_2D, fbo[0].t); gl.useProgram(progs.blur); gl.uniform1i(U(progs.blur, 't'), 0); gl.uniform2f(U(progs.blur, 'd'), 1.6 / BW, 0); draw(progs.blur, fbo[1].f, BW, BH);
        gl.bindTexture(gl.TEXTURE_2D, fbo[1].t); gl.uniform2f(U(progs.blur, 'd'), 0, 1.6 / BH); draw(progs.blur, fbo[0].f, BW, BH); }
      const F = progs.f; gl.useProgram(F); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(U(F, 't'), 0); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, fbo[0].t); gl.uniform1i(U(F, 'bl'), 1); gl.activeTexture(gl.TEXTURE0);
      gl.uniform4fv(U(F, 'sh'), new Float32Array(shocks.flat())); gl.uniform1f(U(F, 'ca'), ca); gl.uniform2f(U(F, 'caDir'), caDir[0], caDir[1]); gl.uniform1f(U(F, 'bloom'), bloom);
      gl.uniform3fv(U(F, 'lift'), gr.lift); gl.uniform3fv(U(F, 'gain'), gr.gain); gl.uniform1f(U(F, 'sat'), gr.sat); gl.uniform1f(U(F, 'con'), gr.con); gl.uniform1f(U(F, 'vig'), 0.22); gl.uniform1f(U(F, 'flash'), flash); gl.uniform1f(U(F, 'desat'), desat); gl.uniform2f(U(F, 'asp'), 1.7778, 1); const MB = (typeof MBLUR !== 'undefined' && s && s.F) ? MBLUR : { dx: 0, dy: 0, rx: 0.5, ry: 0.5, rk: 0 }; gl.uniform2f(U(F, 'mb'), MB.dx, MB.dy); gl.uniform3f(U(F, 'rb'), MB.rx, MB.ry, MB.rk); gl.uniform3f(U(F, 'cz'), MB.cx ?? 0.5, MB.cy ?? 0.5, MB.cr || 0); const PE = MB.pe || [[0.5, 0.5, 0.1, 0.1, 0], [0.5, 0.5, 0.1, 0.1, 0]]; gl.uniform4fv(U(F, 'pe'), new Float32Array([...PE[0].slice(0, 4), ...PE[1].slice(0, 4)])); gl.uniform1fv(U(F, 'pk'), new Float32Array([PE[0][4], PE[1][4]]));      // 第 56 圈：两个人物身上的模糊保护椭圆（出招方全保护、挨打方飞起时留一点拖影）
      draw(F, null, W0, H0); const er = gl.getError(); if (er) throw new Error('gl error ' + er);
    } catch (e) { P.fail(e); }
    P.ms = performance.now() - t0;
  };
  return P;
})();
