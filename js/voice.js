/* 草原小屋 · 语音：录一段话（最长 60 秒）→ 在手机上压成 MP3（16 kHz、单声道、32 kbps，一分钟约 240 KB）→ 存成 data URL。
   用 MP3 是因为 iPhone 和安卓都能播。编码用 LAME 的 JavaScript 版（js/lame.min.js，LGPL，第一次录音时才加载）。
   播放语音时把背景声音调小，播完再恢复 */
(function () {
  'use strict';
  const V = { MAX: 60, RATE: 16000 };
  V.supported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (window.AudioContext || window.webkitAudioContext));

  let lameP = null;
  function loadLame() {
    if (window.lamejs) return Promise.resolve();
    if (!lameP) {
      lameP = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'js/lame.min.js';
        s.onload = () => (window.lamejs ? res() : rej(new Error('lame')));
        s.onerror = () => {
          lameP = null;
          rej(new Error('lame'));
        };
        document.head.appendChild(s);
      });
    }
    return lameP;
  }

  /* ---------- 录音 ---------- */
  let rec = null;
  V.recording = () => !!rec;
  // onTick(秒) 每秒回调一次；到 60 秒自动停，停的时候 onAuto() 被调用
  V.start = async function (onTick, onAuto) {
    if (rec) return;
    if (!V.supported()) throw new Error('unsupported');
    G.Audio.init();
    const ctx = G.Audio.ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state !== 'running') await ctx.resume().catch(() => {});
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    loadLame().catch(() => {}); // 边录边在后台加载编码器
    const src = ctx.createMediaStreamSource(stream);
    const sp = ctx.createScriptProcessor(4096, 1, 1);
    const mute = ctx.createGain();
    mute.gain.value = 0; // 不把麦克风的声音放出来
    const chunks = [];
    sp.onaudioprocess = (e) => {
      if (rec) chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    src.connect(sp);
    sp.connect(mute);
    mute.connect(ctx.destination);
    const t0 = performance.now();
    rec = { ctx, stream, src, sp, mute, chunks, t0, sr: ctx.sampleRate };
    rec.iv = setInterval(() => {
      const s = (performance.now() - t0) / 1000;
      if (onTick) onTick(s);
      if (s >= V.MAX && onAuto) onAuto();
    }, 250);
  };
  function release(r) {
    clearInterval(r.iv);
    try { r.src.disconnect(); r.sp.disconnect(); r.mute.disconnect(); } catch (e) { /* 忽略 */ }
    r.sp.onaudioprocess = null;
    r.stream.getTracks().forEach((t) => t.stop());
  }
  V.cancel = function () {
    if (!rec) return;
    const r = rec;
    rec = null;
    release(r);
  };
  // 停止并编码，返回 { url, secs }；录得太短返回 null
  V.stop = async function () {
    if (!rec) return null;
    const r = rec;
    rec = null;
    release(r);
    let n = 0;
    for (const c of r.chunks) n += c.length;
    const secs = Math.min(V.MAX, n / r.sr);
    if (secs < 0.6) return null;
    // 降到 16 kHz（按窗口取平均，顺便滤掉高频）
    const ratio = r.sr / V.RATE, out = new Float32Array(Math.floor(Math.min(n, V.MAX * r.sr) / ratio));
    const all = new Float32Array(n);
    let o = 0;
    for (const c of r.chunks) {
      all.set(c, o);
      o += c.length;
    }
    let peak = 0;
    for (let i = 0; i < out.length; i++) {
      const a = Math.floor(i * ratio), b = Math.max(a + 1, Math.floor((i + 1) * ratio));
      let s = 0;
      for (let k = a; k < b; k++) s += all[k];
      out[i] = s / (b - a);
      peak = Math.max(peak, Math.abs(out[i]));
    }
    // 太小声的录音抬一点（最多放大 4 倍），头尾 20 毫秒淡入淡出避免“咔”一声
    const g = Math.min(4, 0.89 / (peak || 1)), fade = Math.floor(V.RATE * 0.02);
    const pcm = new Int16Array(out.length);
    for (let i = 0; i < out.length; i++) {
      const f = Math.min(1, i / fade, (out.length - 1 - i) / fade);
      pcm[i] = Math.max(-32767, Math.min(32767, Math.round(out[i] * g * f * 32767)));
    }
    await loadLame();
    const enc = new window.lamejs.Mp3Encoder(1, V.RATE, 32), parts = [];
    for (let i = 0; i < pcm.length; i += 1152) {
      const b = enc.encodeBuffer(pcm.subarray(i, i + 1152));
      if (b.length) parts.push(new Uint8Array(b));
    }
    const end = enc.flush();
    if (end.length) parts.push(new Uint8Array(end));
    const url = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).replace(/^data:[^;,]*/, 'data:audio/mpeg'));
      fr.onerror = rej;
      fr.readAsDataURL(new Blob(parts, { type: 'audio/mpeg' }));
    });
    return { url, secs };
  };

  /* ---------- 播放 ---------- */
  let cur = null;
  V.playing = () => (cur ? cur.key : null);
  V.stopPlay = function () {
    if (!cur) return;
    const c = cur;
    cur = null;
    c.el.pause();
    c.el.removeAttribute('src');
    G.Audio.duck(false);
    if (c.onEnd) c.onEnd();
  };
  // 播一段语音；同一个 key 再点一下就停
  V.play = function (url, key, onEnd) {
    const same = cur && cur.key === key;
    V.stopPlay();
    if (same) return false;
    const el = new Audio();
    el.setAttribute('playsinline', '');
    el.src = url;
    const c = (cur = { el, key, onEnd });
    const done = () => { if (cur === c) V.stopPlay(); };
    el.addEventListener('ended', done);
    el.addEventListener('error', done);
    G.Audio.duck(true);
    const p = el.play();
    if (p && p.catch) p.catch(done);
    return true;
  };
  V.fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  /* ---------- 界面小部件：一个“录音”按钮 + 录好后的小条（▶ 试听、× 删掉） ---------- */
  // btn: 录音按钮；chip: 放录音条的容器；say(text): 显示提示；onChange(有没有录音)
  V.widget = function (btn, chip, say, onChange) {
    const W = { data: null };
    const label = btn.textContent;
    function show() {
      chip.innerHTML = '';
      chip.hidden = !W.data;
      if (onChange) onChange(!!W.data);
      if (!W.data) return;
      const play = document.createElement('button');
      play.type = 'button';
      play.className = 'vc-play';
      const key = 'draft-' + Math.random();
      const txt = () => '▶ 试听 ' + V.fmt(W.data.secs);
      play.textContent = txt();
      play.addEventListener('click', () => {
        const on = V.play(W.data.url, key, () => { play.textContent = txt(); });
        play.textContent = on ? '■ 停止' : txt();
      });
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'vc-x';
      x.textContent = '×';
      x.setAttribute('aria-label', '不要这段录音了');
      x.addEventListener('click', () => W.set(null));
      chip.append(play, x);
    }
    W.set = function (d) {
      if (cur && String(cur.key).startsWith('draft-')) V.stopPlay();
      W.data = d;
      show();
    };
    async function finish() {
      btn.classList.remove('rec');
      btn.textContent = label;
      say('正在处理录音…');
      try {
        const d = await V.stop();
        if (d) {
          W.set(d);
          say('');
        } else say('录得太短了，再录一次吧');
      } catch (e) {
        say('录音没处理好，再试一次吧');
      }
    }
    btn.addEventListener('click', async () => {
      if (V.recording()) {
        if (btn.classList.contains('rec')) finish();
        return;
      }
      V.stopPlay();
      try {
        btn.textContent = '准备录音…';
        await V.start((s) => { btn.textContent = '● ' + V.fmt(s) + ' 点这里停'; }, () => finish());
        btn.classList.add('rec');
        btn.textContent = '● 0:00 点这里停';
        say('正在录音，最长 60 秒');
      } catch (e) {
        btn.textContent = label;
        say(e && e.name === 'NotAllowedError' ? '没有拿到麦克风权限：在浏览器设置里允许使用麦克风后再试' : '这个浏览器暂时不能录音');
      }
    });
    W.cancel = function () {
      if (btn.classList.contains('rec')) {
        V.cancel();
        btn.classList.remove('rec');
        btn.textContent = label;
      }
    };
    W.show = (on) => { btn.hidden = !(on && V.supported()); };
    show();
    return W;
  };

  G.Voice = V;
})();
