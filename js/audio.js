/* 草原小屋 · 声音：猫叫、呼噜、脚步、环境声用录音（sounds/），风铃、八音盒小曲和小音效实时合成 */
(function () {
  'use strict';
  const A = { ctx: null, on: true, bus: null };
  const rnd = (a, b) => a + Math.random() * (b - a);

  // 把若干 [时间(0~1), 数值] 关键点变成平滑曲线
  function curve(pts, n) {
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      let k = 0;
      while (k < pts.length - 2 && t > pts[k + 1][0]) k++;
      const a = pts[k], b = pts[k + 1];
      let u = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      out[i] = a[1] + (b[1] - a[1]) * (u * u * (3 - 2 * u));
    }
    return out;
  }
  const scaled = (pts, k) => pts.map((p) => [p[0], p[1] * k]);

  /* ---------- 总线：干声 + 一点点混响 ---------- */
  A.makeBus = function (ctx) {
    const sr = ctx.sampleRate;
    const out = ctx.createGain();
    out.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 18;
    comp.ratio.value = 3;
    comp.attack.value = 0.005;
    comp.release.value = 0.2;
    out.connect(comp);
    comp.connect(ctx.destination);
    // 混响脉冲：衰减的柔和噪声
    const len = Math.floor(sr * 1.4), ir = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        lp += (Math.random() * 2 - 1 - lp) * 0.35;
        d[i] = lp * Math.pow(1 - i / len, 2.2) * Math.exp(-i / (sr * 0.38));
      }
    }
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    wet.connect(conv);
    conv.connect(out);
    // 噪声
    const nb = ctx.createBuffer(1, sr * 2, sr), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // 像声带一样的音源：泛音逐级变弱，比锯齿波柔和
    const N = 24, re = new Float32Array(N + 1), im = new Float32Array(N + 1);
    for (let n = 1; n <= N; n++) im[n] = Math.pow(n, -1.45) * (n % 2 ? 1 : 0.85);
    const voice = ctx.createPeriodicWave(re, im);
    return { ctx, out, wet, noise: nb, voice };
  };

  /* ---------- 猫叫：声带音源 → 随口型滑动的共鸣峰 ---------- */
  const MEOWS = {
    // 标准的“喵～”
    meow: {
      dur: 0.78, f: 760, g2: 0.6, vol: 0.5, vibRate: 6,
      pitch: [[0, 0.84], [0.2, 1.1], [0.45, 1.06], [1, 0.78]],
      f1: [[0, 450], [0.1, 700], [0.32, 1250], [0.55, 1500], [0.82, 950], [1, 520]],
      f2: [[0, 1400], [0.1, 3200], [0.32, 2700], [0.55, 2350], [0.82, 1700], [1, 1150]],
      env: [[0, 0], [0.06, 0.4], [0.2, 0.72], [0.45, 1], [0.75, 0.6], [1, 0]],
      vib: [[0, 0], [0.4, 0.004], [1, 0.014]],
      breath: [[0, 0.03], [0.12, 0.012], [0.8, 0.01], [1, 0.03]]
    },
    // 短短的“咪！”
    mew: {
      dur: 0.4, f: 980, g2: 0.7, vol: 0.42, vibRate: 7,
      pitch: [[0, 0.9], [0.3, 1.08], [1, 0.86]],
      f1: [[0, 500], [0.2, 900], [0.6, 1300], [1, 700]],
      f2: [[0, 2000], [0.2, 3400], [0.6, 2800], [1, 1600]],
      env: [[0, 0], [0.1, 0.7], [0.4, 1], [0.7, 0.6], [1, 0]],
      vib: [[0, 0], [1, 0.006]],
      breath: [[0, 0.03], [0.2, 0.01], [1, 0.02]]
    },
    // 打招呼的“喵呜？”，尾音上扬，开头带一点颤音
    ask: {
      dur: 0.62, f: 690, g2: 0.55, vol: 0.46, vibRate: 6, trill: [[0, 0.55], [0.3, 0.4], [0.45, 0], [1, 0]],
      pitch: [[0, 0.85], [0.35, 0.95], [0.75, 1.2], [1, 1.3]],
      f1: [[0, 480], [0.15, 800], [0.5, 1400], [1, 1100]],
      f2: [[0, 1500], [0.15, 2900], [0.5, 2500], [1, 2100]],
      env: [[0, 0], [0.08, 0.6], [0.5, 1], [0.85, 0.75], [1, 0]],
      vib: [[0, 0], [1, 0.004]],
      breath: [[0, 0.025], [0.2, 0.01], [1, 0.02]]
    },
    // 被摸得很舒服时拉长的“喵～～”
    long: {
      dur: 1.05, f: 720, g2: 0.58, vol: 0.5, vibRate: 5.6,
      pitch: [[0, 0.86], [0.15, 1.08], [0.6, 1.02], [1, 0.74]],
      f1: [[0, 450], [0.08, 700], [0.25, 1300], [0.6, 1500], [0.85, 900], [1, 500]],
      f2: [[0, 1400], [0.08, 3100], [0.25, 2700], [0.6, 2300], [0.85, 1600], [1, 1100]],
      env: [[0, 0], [0.05, 0.4], [0.15, 0.75], [0.5, 1], [0.8, 0.55], [1, 0]],
      vib: [[0, 0], [0.3, 0.006], [1, 0.02]],
      breath: [[0, 0.03], [0.1, 0.012], [0.85, 0.012], [1, 0.03]]
    },
    // 小小的“咕噜？”（猫迎接人时的颤音）
    chirp: {
      dur: 0.34, f: 630, g2: 0.5, vol: 0.4, vibRate: 6, trill: [[0, 0.65], [0.7, 0.5], [1, 0.2]],
      pitch: [[0, 0.82], [0.6, 1.05], [1, 1.28]],
      f1: [[0, 500], [0.5, 900], [1, 1200]],
      f2: [[0, 1600], [0.5, 2400], [1, 2600]],
      env: [[0, 0], [0.15, 0.8], [0.6, 1], [1, 0]],
      vib: [[0, 0], [1, 0]],
      breath: [[0, 0.02], [1, 0.015]]
    }
  };
  A.MEOWS = MEOWS;
  A.meowInto = function (bus, t0, kind, opt) {
    const ctx = bus.ctx, o = MEOWS[kind] || MEOWS.meow;
    opt = opt || {};
    const dur = o.dur * (opt.stretch || 1), f = o.f * (opt.pitch || 1), vol = o.vol * (opt.vol === undefined ? 1 : opt.vol);
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(bus.voice);
    osc.frequency.setValueCurveAtTime(curve(scaled(o.pitch, f), 64), t0, dur);
    const vib = ctx.createOscillator();
    vib.frequency.value = o.vibRate;
    const vg = ctx.createGain();
    vg.gain.setValueCurveAtTime(curve(scaled(o.vib, f), 32), t0, dur);
    vib.connect(vg);
    vg.connect(osc.frequency);
    // 一点点不规则的音高微颤，听起来更像真的嗓音
    const jit = ctx.createOscillator();
    jit.frequency.value = rnd(11, 17);
    const jg = ctx.createGain();
    jg.gain.value = f * 0.006;
    jit.connect(jg);
    jg.connect(osc.frequency);
    const mix = ctx.createGain();
    const formant = (pts, q, gain) => {
      const b = ctx.createBiquadFilter();
      b.type = 'bandpass';
      b.Q.value = q;
      b.frequency.setValueCurveAtTime(curve(pts, 64), t0, dur);
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(b);
      b.connect(g);
      g.connect(mix);
    };
    formant(o.f1, 3.2, 1.0);
    formant(o.f2, 4.5, o.g2);
    formant([[0, 4400], [1, 4400]], 5, 0.1);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1100;
    const gd = ctx.createGain();
    gd.gain.value = 0.22;
    osc.connect(lp);
    lp.connect(gd);
    gd.connect(mix);
    // 一点气声，让叫声不那么“电子”
    const n = ctx.createBufferSource();
    n.buffer = bus.noise;
    n.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 2800;
    nf.Q.value = 0.8;
    const ng = ctx.createGain();
    ng.gain.setValueCurveAtTime(curve(o.breath, 32), t0, dur);
    n.connect(nf);
    nf.connect(ng);
    ng.connect(mix);
    const env = ctx.createGain();
    env.gain.setValueCurveAtTime(curve(scaled(o.env, vol), 96), t0, dur);
    let tail = mix;
    const extra = [];
    if (o.trill) {
      const tg = ctx.createGain();
      tg.gain.value = 1;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 27;
      const lg = ctx.createGain();
      lg.gain.setValueCurveAtTime(curve(o.trill, 32), t0, dur);
      lfo.connect(lg);
      lg.connect(tg.gain);
      mix.connect(tg);
      tail = tg;
      extra.push(lfo);
    }
    tail.connect(env);
    const soft = ctx.createBiquadFilter();
    soft.type = 'lowpass';
    soft.frequency.value = 5200;
    soft.Q.value = 0.5;
    env.connect(soft);
    soft.connect(bus.out);
    const ws = ctx.createGain();
    ws.gain.value = 0.3;
    soft.connect(ws);
    ws.connect(bus.wet);
    const end = t0 + dur + 0.06;
    for (const s of [osc, vib, jit, n].concat(extra)) {
      s.start(t0);
      s.stop(end);
    }
    return dur;
  };

  /* ---------- 呼噜：一串很低的小脉冲，吸气和呼气略有不同 ---------- */
  function makePurr(ctx) {
    const sr = ctx.sampleRate, total = 1.5, len = Math.floor(sr * total);
    const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    let t = 0.01;
    while (t < total) {
      const inh = t < 0.72, ph = inh ? t / 0.72 : (t - 0.72) / 0.78;
      const amp = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, ph))), 0.6) * (inh ? 1 : 0.8);
      const fg = inh ? 150 : 118, n0 = Math.floor(t * sr), gl = Math.floor(sr * 0.032);
      let lp = 0;
      for (let i = 0; i < gl && n0 + i < len; i++) {
        const e = Math.exp(-i / (sr * 0.007)), x = i / sr;
        lp += (Math.random() * 2 - 1 - lp) * 0.3;
        const w = 2 * Math.PI * fg * x;
        // 手机扬声器放不出很低的声音，所以多给一些高次泛音和“沙沙”的气声
        d[n0 + i] += amp * e * (0.5 * Math.sin(w) + 0.45 * Math.sin(w * 2.02) + 0.4 * Math.sin(w * 3.01) + 0.32 * Math.sin(w * 4.03) + 0.24 * Math.sin(w * 5.02) + 0.16 * Math.sin(w * 6.04) + lp * 1.9);
      }
      t += (1 / (inh ? 27 : 23.5)) * rnd(0.96, 1.04);
    }
    let pk = 0;
    for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(d[i]));
    for (let i = 0; i < len; i++) d[i] *= 0.9 / pk;
    return buf;
  }
  A.makePurr = makePurr;
  let purr = null;
  A.purr = function (on, vol) {
    if (!A.ctx) return;
    const ctx = A.ctx, t = ctx.currentTime;
    if (on) {
      if (!purr) {
        const src = ctx.createBufferSource();
        const real = A.samples && A.samples.purr;
        if (real) {
          // 真实的呼噜录音
          src.buffer = real.buf;
          src.loopStart = real.loop[0];
          src.loopEnd = real.loop[1];
        } else src.buffer = A.purrBuf || (A.purrBuf = makePurr(ctx));
        src.loop = true;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = real ? 6000 : 1700;
        const g = ctx.createGain();
        g.gain.value = 0;
        src.connect(lp);
        lp.connect(g);
        g.connect(A.bus.out);
        src.start();
        purr = { src, g };
      }
      purr.g.gain.cancelScheduledValues(t);
      purr.g.gain.setTargetAtTime(vol === undefined ? 0.5 : vol, t, 0.25);
    } else if (purr) {
      const p = purr;
      purr = null;
      p.g.gain.cancelScheduledValues(t);
      p.g.gain.setTargetAtTime(0, t, 0.35);
      p.src.stop(t + 1.6);
    }
  };

  /* ---------- 铃声类：若干个衰减的正弦泛音 ---------- */
  function partials(bus, t0, f, vol, list, wetAmt) {
    const ctx = bus.ctx;
    for (const p of list) {
      if (f * p[0] > 15000) continue; // 太高的泛音听不见，也超出了可播放范围
      const o = ctx.createOscillator();
      o.frequency.value = f * p[0];
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol * p[1], t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + p[2]);
      o.connect(g);
      g.connect(bus.out);
      if (wetAmt) {
        const w = ctx.createGain();
        w.gain.value = wetAmt;
        g.connect(w);
        w.connect(bus.wet);
      }
      o.start(t0);
      o.stop(t0 + p[2] + 0.05);
    }
  }
  const CHIME = [783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98];
  A.bellInto = (bus, t0, f, vol, dec) => partials(bus, t0, f, vol, [[1, 1, dec], [2.76, 0.42, dec * 0.5], [5.4, 0.2, dec * 0.25], [8.93, 0.08, dec * 0.12]], 0.5);
  A.boxInto = (bus, t0, f, vol) => partials(bus, t0, f, vol, [[1, 1, 1.5], [2, 0.16, 0.9], [4.07, 0.2, 0.32], [6.3, 0.07, 0.14]], 0.35);
  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // 噪声小片段：type 滤波类型，f0→f1 频率滑动
  function burst(bus, t0, dur, vol, type, f0, f1, q, wetAmt, attack) {
    const ctx = bus.ctx, n = ctx.createBufferSource();
    n.buffer = bus.noise;
    n.loop = true;
    n.playbackRate.value = rnd(0.9, 1.1);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q || 0.8;
    f.frequency.setValueAtTime(f0, t0);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + (attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    n.connect(f);
    f.connect(g);
    g.connect(bus.out);
    if (wetAmt) {
      const w = ctx.createGain();
      w.gain.value = wetAmt;
      g.connect(w);
      w.connect(bus.wet);
    }
    n.start(t0, Math.random());
    n.stop(t0 + dur + 0.05);
  }
  function tone(bus, t0, f0, f1, dur, vol, type) {
    const ctx = bus.ctx, o = ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t0);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(bus.out);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  /* ---------- 八音盒旋律 ---------- */
  const TUNES = {
    // 原创的小摇篮曲（三拍子）
    lull: {
      beat: 0.4,
      notes: [[76, 1], [79, 1], [84, 1], [83, 1], [79, 1], [76, 1], [77, 1], [81, 1], [84, 1], [83, 2], [79, 1],
        [76, 1], [79, 1], [84, 1], [86, 1], [84, 1], [81, 1], [79, 1], [77, 1], [74, 1], [72, 3]],
      bass: [[48, 3], [55, 3], [53, 3], [55, 3], [48, 3], [53, 3], [55, 3], [48, 3]]
    },
    // 《生日快乐》（公有领域的旋律）
    bday: {
      beat: 0.46,
      notes: [[79, 0.75], [79, 0.25], [81, 1], [79, 1], [84, 1], [83, 2], [79, 0.75], [79, 0.25], [81, 1], [79, 1], [86, 1], [84, 2],
        [79, 0.75], [79, 0.25], [91, 1], [88, 1], [84, 1], [83, 1], [81, 2], [89, 0.75], [89, 0.25], [88, 1], [84, 1], [86, 1], [84, 3]],
      bass: [[0, 1], [48, 3], [55, 3], [55, 3], [48, 3], [48, 3], [53, 3], [55, 3], [48, 3]]
    }
  };
  A.tuneLength = (name) => TUNES[name].notes.reduce((s, n) => s + n[1], 0) * TUNES[name].beat + 1.5;
  let tuneStop = 0;

  /* ---------- 对外接口 ---------- */
  A.init = function () {
    if (A.ctx) return A.resume();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      // 让声音在 iPhone 静音键打开时也能响（只在互动时才有声音）
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch (e) { /* 忽略 */ }
    try {
      A.ctx = new AC();
      A.bus = A.makeBus(A.ctx);
      A.bus.out.gain.value = A.on ? 0.9 : 0;
      A.resume();
      A.loadSamples();
    } catch (e) {
      A.ctx = null;
    }
  };
  A.resume = function () {
    if (A.ctx && A.ctx.state !== 'running') A.ctx.resume().catch(() => {});
  };
  A.setOn = function (on) {
    A.on = on;
    if (A.bus) A.bus.out.gain.setTargetAtTime(on ? 0.9 : 0, A.ctx.currentTime, 0.05);
  };
  const ready = () => A.ctx && A.on && A.ctx.state === 'running';
  const now = () => A.ctx.currentTime + 0.02;

  /* ---------- 真实录音：猫叫、呼噜、脚步（加载失败时退回合成音） ---------- */
  A.samples = null;
  function decode(ab) {
    return new Promise((res, rej) => A.ctx.decodeAudioData(ab, res, rej));
  }
  let VER = '';
  async function loadBuf(f) {
    // 带上版本号，避免手机用到旧的缓存文件（文件内容和播放位置对不上会播错声音）
    const r = await fetch('sounds/' + f + (VER ? '?v=' + VER : ''));
    if (!r.ok) throw new Error(f);
    return decode(await r.arrayBuffer());
  }
  // 先加载猫叫和呼噜，让鸡柳马上能出声；其他声音随后陆续加载，某个文件出错不影响其他的
  A.loadSamples = async function () {
    if (A.samples || A.loading || !A.ctx) return;
    A.loading = true;
    let man;
    try {
      man = await (await fetch('sounds/sounds.json?t=' + Date.now(), { cache: 'no-store' })).json();
    } catch (e) {
      A.loading = false;
      return;
    }
    VER = man.v || '';
    A.songs = man.songs || [];
    const S = (A.samples = { steps: {}, amb: {} });
    const get = async (f) => {
      for (let k = 0; k < 2; k++) {
        try { return await loadBuf(f); } catch (e) { /* 再试一次 */ }
      }
      return null;
    };
    if (man.meow) {
      const b = await get(man.meow.file);
      if (b) S.meow = { buf: b, segs: man.meow.segs };
    }
    if (man.purr) {
      const b = await get(man.purr.file);
      if (b) S.purr = { buf: b, loop: man.purr.loop };
    }
    for (const k in man.steps || {}) {
      const b = await get(man.steps[k].file);
      if (b) S.steps[k] = { buf: b, hits: man.steps[k].hits };
    }
    for (const k in man.amb || {}) {
      const b = await get(man.amb[k].file);
      if (b) S.amb[k] = { buf: b, loop: man.amb[k].loop };
    }
    if (man.bowl) {
      const b = await get(man.bowl.file);
      if (b) S.bowl = { buf: b, seg: man.bowl.seg };
    }
    A.loading = false;
  };
  A.songURL = (f) => 'sounds/' + f + (VER ? '?v=' + VER : '');
  function playSeg(buf, seg, vol, rate, wetAmt, filt) {
    const ctx = A.ctx, t = now(), s = ctx.createBufferSource();
    s.buffer = buf;
    s.playbackRate.value = rate;
    const g = ctx.createGain();
    const len = seg[1];
    // 很短的淡入淡出，避免切口处“咔”的一声
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.setValueAtTime(vol, t + Math.max(0.01, len / rate - 0.03));
    g.gain.linearRampToValueAtTime(0, t + len / rate);
    let node = s;
    if (filt) {
      const f = ctx.createBiquadFilter();
      f.type = filt[0];
      f.frequency.value = filt[1];
      s.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(A.bus.out);
    if (wetAmt) {
      const w = ctx.createGain();
      w.gain.value = wetAmt;
      g.connect(w);
      w.connect(A.bus.wet);
    }
    s.start(t, seg[0], len + 0.02);
    return len / rate;
  }
  const lastSeg = {};
  function pick(list, key) {
    if (!list || !list.length) return null;
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === lastSeg[key]) i = (i + 1) % list.length;
    lastSeg[key] = i;
    return list[i];
  }
  const MEOW_GROUP = { mew: ['short', 'mid'], chirp: ['short', 'mid'], meow: ['mid', 'long'], ask: ['mid', 'short'], long: ['long', 'mid'] };
  A.meow = function (kind, vol) {
    if (!ready()) return 0;
    const M = A.samples && A.samples.meow;
    if (M) {
      const groups = MEOW_GROUP[kind] || ['mid'];
      for (const gname of groups) {
        const seg = pick(M.segs[gname], gname);
        if (seg) return playSeg(M.buf, seg, 0.95 * (vol === undefined ? 1 : vol), rnd(0.98, 1.03), 0.18);
      }
    }
    // 录音还没加载好时不出声，免得出现另一种声音
    return 0;
  };
  /* ---------- 环境声：风、草原、鸟叫、虫鸣、月亮上的风铃（有录音用录音，没有就合成风声和虫鸣） ---------- */
  const amb = { layers: {} };
  function makeCrickets(ctx) {
    const sr = ctx.sampleRate, len = sr * 4, buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    for (const v of [[4600, 0.0], [4300, 0.31], [5100, 0.17]]) {
      let t = v[1];
      while (t < 3.9) {
        for (let p = 0; p < 3; p++) {
          const n0 = Math.floor((t + p * 0.035) * sr);
          for (let i = 0; i < sr * 0.022 && n0 + i < len; i++) {
            const x = i / sr, e = Math.sin(Math.PI * x / 0.022);
            d[n0 + i] += 0.25 * e * e * Math.sin(2 * Math.PI * v[0] * x);
          }
        }
        t += 0.42 + Math.random() * 0.2;
      }
    }
    return buf;
  }
  function startLayer(name, real) {
    const ctx = A.ctx, src = ctx.createBufferSource();
    let filt = null;
    if (real) {
      src.buffer = real.buf;
      src.loopStart = real.loop[0];
      src.loopEnd = real.loop[1];
      if (name === 'wind') {
        // 强风录音偏刺耳，滤掉高频，变成柔和的风声
        filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 2400;
        filt.Q.value = 0.5;
      }
    } else if (name === 'wind') {
      src.buffer = A.bus.noise;
      filt = ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = 420;
      filt.Q.value = 0.7;
    } else if (name === 'crickets') src.buffer = A.cricketBuf || (A.cricketBuf = makeCrickets(ctx));
    else return null;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0;
    (filt ? (src.connect(filt), filt) : src).connect(g);
    g.connect(amb.out);
    src.start(ctx.currentTime, real ? Math.random() * (real.loop[1] - real.loop[0]) : Math.random());
    return { src, g, filt, real: !!real };
  }
  A.ambient = function (o) {
    if (!ready()) return;
    const ctx = A.ctx, t = ctx.currentTime, R = (A.samples && A.samples.amb) || {};
    if (!amb.out) {
      amb.out = ctx.createGain();
      amb.lp = ctx.createBiquadFilter();
      amb.lp.type = 'lowpass';
      amb.lp.frequency.value = 18000;
      amb.out.connect(amb.lp);
      amb.lp.connect(A.bus.out);
    }
    // 在屋里：外面的声音变闷、变小
    amb.lp.frequency.setTargetAtTime(o.inside ? 850 : 18000, t, 0.5);
    amb.out.gain.setTargetAtTime(o.inside ? 0.5 : 1, t, 0.5);
    const gust = 0.55 + 0.3 * Math.sin(t * 0.37) + 0.15 * Math.sin(t * 0.13 + 1.3);
    const want = { wind: o.wind * 0.42 * gust, meadow: o.meadow * 0.32, birds: o.birds * 0.3, crickets: o.crickets * 0.26, moon: (o.moon || 0) * 0.55 };
    for (const name in want) {
      let L = amb.layers[name];
      // 录音加载好以后，把合成的那层换成录音
      if (L && !L.real && R[name]) {
        L.g.gain.setTargetAtTime(0, t, 0.6);
        L.src.stop(t + 3);
        L = amb.layers[name] = null;
      }
      if (!L && want[name] > 0.005) L = amb.layers[name] = startLayer(name, R[name]);
      if (!L) continue;
      L.g.gain.setTargetAtTime(want[name] * (L.real ? 1 : name === 'wind' ? 1.6 : 0.7), t, 0.8);
      if (L.filt && !L.real) L.filt.frequency.setTargetAtTime(300 + 380 * gust, t, 0.8);
    }
  };

  // 脚步声：每踩一步放一下；雪地用碎石声压低音调再滤掉高频，听起来像踩雪
  /* 合成脚步声（还没有录音时用）：每种地面预先做 6 个略有不同的脚步，拼成一条 */
  function biquad(x, type, f, q, sr) {
    const w = 2 * Math.PI * f / sr, al = Math.sin(w) / (2 * q), c = Math.cos(w);
    let b0, b1, b2;
    if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; }
    else if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
    const y = new Float32Array(x.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
    }
    return y;
  }
  function synthStep(type, sr) {
    const len = Math.floor(sr * 0.34), out = new Float32Array(len);
    const add = (arr, off, g) => { for (let i = 0; i < arr.length && off + i < len; i++) out[off + i] += arr[i] * g; };
    const noise = (n) => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = Math.random() * 2 - 1; return a; };
    const envd = (a, att, dec) => { for (let i = 0; i < a.length; i++) { const t = i / sr; a[i] *= Math.min(1, t / att) * Math.exp(-t / dec); } return a; };
    const thump = (f, dec, g, off) => {
      const n = Math.floor(sr * dec * 5), a = new Float32Array(n);
      for (let i = 0; i < n; i++) { const t = i / sr; a[i] = Math.sin(2 * Math.PI * f * t * (1 - 0.3 * Math.min(1, t / dec))) * Math.min(1, t / 0.003) * Math.exp(-t / dec); }
      add(a, off || 0, g);
    };
    // 很多随机的小“咔嚓”：碎石、雪、落叶都靠它
    const grains = (count, span, fLo, fHi, q, dec, g, start) => {
      for (let k = 0; k < count; k++) {
        const off = Math.floor(sr * ((start || 0) + Math.pow(Math.random(), 1.6) * span));
        const n = Math.floor(sr * dec * 6);
        const a = envd(biquad(noise(n), 'bp', fLo + Math.random() * (fHi - fLo), q, sr), 0.0005, dec);
        add(a, off, g * (0.4 + Math.random() * 0.6));
      }
    };
    const swish = (dur, f, q, g, att, off) => add(envd(biquad(noise(Math.floor(sr * dur)), 'bp', f, q, sr), att, dur / 3.5), Math.floor(sr * (off || 0)), g);
    switch (type) {
      case 'grass':
        swish(0.2, rnd(1700, 2400), 0.7, 0.6, 0.014);
        grains(10, 0.11, 1800, 4500, 2, 0.002, 0.18);
        thump(rnd(150, 190), 0.025, 0.3);
        break;
      case 'tall':
        swish(0.3, rnd(2200, 3000), 0.5, 0.6, 0.02);
        swish(0.25, rnd(4200, 5200), 0.7, 0.35, 0.03, 0.04);
        grains(22, 0.2, 2500, 7000, 2, 0.002, 0.25);
        thump(rnd(75, 95), 0.03, 0.3);
        break;
      case 'wood': {
        // 鞋跟和脚尖两下：低沉的“咚”加上木板的中频共鸣（手机扬声器主要靠这部分）
        const t2 = Math.floor(sr * rnd(0.05, 0.075));
        thump(rnd(105, 135), 0.045, 0.6);
        thump(rnd(420, 520), 0.03, 0.75);
        thump(rnd(900, 1150), 0.012, 0.35);
        swish(0.025, 2600, 1, 0.3, 0.001);
        thump(rnd(440, 540), 0.025, 0.45, t2);
        thump(rnd(1000, 1250), 0.01, 0.2, t2);
        break;
      }
      case 'gravel':
        grains(70, 0.13, 900, 4200, 3, 0.0018, 0.45);
        swish(0.12, 1600, 0.6, 0.25, 0.005);
        thump(rnd(70, 90), 0.03, 0.3);
        break;
      case 'leaves':
        grains(45, 0.18, 2500, 7500, 4, 0.0012, 0.55);
        swish(0.2, 3800, 0.6, 0.3, 0.01);
        thump(rnd(75, 90), 0.025, 0.25);
        break;
      case 'snow':
        grains(90, 0.17, 450, 1600, 4, 0.0025, 0.42);
        grains(30, 0.15, 1600, 2800, 4, 0.0015, 0.25);
        swish(0.16, 900, 0.7, 0.25, 0.01);
        thump(rnd(65, 80), 0.035, 0.3);
        break;
    }
    let pk = 0;
    for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(out[i]));
    const g = 0.8 / (pk || 1);
    for (let i = 0; i < len; i++) out[i] *= g * Math.min(1, (len - i) / (sr * 0.03));
    return out;
  }
  function synthSteps() {
    const sr = A.ctx.sampleRate, S = {};
    for (const type of ['grass', 'tall', 'wood', 'gravel', 'leaves', 'snow']) {
      const n = 6, len = Math.floor(sr * 0.34), gap = Math.floor(sr * 0.05);
      const buf = A.ctx.createBuffer(1, n * (len + gap), sr), d = buf.getChannelData(0), hits = [];
      for (let k = 0; k < n; k++) {
        d.set(synthStep(type, sr), k * (len + gap));
        hits.push([(k * (len + gap)) / sr, len / sr]);
      }
      S[type] = { buf, hits, synth: true };
    }
    return S;
  }
  A.step = function (surface, vol) {
    if (!ready()) return;
    const real = (A.samples && A.samples.steps) || {};
    const fake = A.synthSteps || (A.synthSteps = synthSteps());
    let k = surface, rate = rnd(0.92, 1.08), filt = null, st = real[surface];
    if (!st && surface === 'snow' && real.gravel) {
      // 有碎石录音时，压低音调再滤掉高频，听起来像踩雪
      st = real.gravel;
      k = 'gravel';
      rate = rnd(0.72, 0.82);
      filt = ['lowpass', 2600];
    }
    if (!st && surface === 'tall' && real.grass) st = real.grass;
    if (!st && surface === 'stone' && real.wood) {
      // 月宫的石台阶：木头脚步声升调、滤掉低频，变成清脆的鞋跟声
      st = real.wood;
      k = 'wood';
      rate = rnd(1.28, 1.42);
      filt = ['highpass', 520];
    }
    if (!st && surface === 'dust' && real.gravel) {
      // 月壤：碎石声降一点调、滤掉高频，软软的沙沙声
      st = real.gravel;
      k = 'gravel';
      rate = rnd(0.8, 0.9);
      filt = ['lowpass', 1500];
    }
    if (!st) {
      st = fake[surface] || fake[{ stone: 'wood', dust: 'snow' }[surface]] || fake.grass;
      k = 'f' + surface;
    }
    const seg = pick(st.hits, k);
    if (seg) playSeg(st.buf, seg, (vol === undefined ? 1 : vol) * rnd(0.75, 1) * (st.synth ? 0.55 : 1), rate, 0.06, filt);
  };
  // 满月颂钵：有录音用录音，没有就用几个略微错开的泛音合成（会慢慢“嗡嗡”地起伏）
  A.bowl = function (vol) {
    if (!ready()) return;
    vol = vol === undefined ? 0.4 : vol;
    const B = A.samples && A.samples.bowl;
    if (B) return playSeg(B.buf, B.seg, vol, rnd(0.99, 1.01), 0.35);
    partials(A.bus, now(), 346.3, vol * 0.22, [[1, 1, 7], [1.004, 0.6, 6.5], [2.71, 0.45, 4], [2.716, 0.3, 3.6], [5.05, 0.16, 2.2], [8.1, 0.05, 1.2]], 0.45);
  };
  A.chime = function (count, vol) {
    if (!ready()) return;
    let t = now();
    vol = vol === undefined ? 0.2 : vol;
    for (let i = 0; i < (count || 4); i++) {
      A.bellInto(A.bus, t, CHIME[Math.floor(Math.random() * CHIME.length)] * rnd(0.997, 1.003), vol * rnd(0.6, 1), rnd(1.6, 2.6));
      t += rnd(0.06, 0.22);
    }
  };
  /* ---------- 八音盒 ----------
     你的歌：从文件边下边放，单曲循环，全地图一样大声，只有回到八音盒点“停止”才会停。
     生日歌：八音盒音色，循环，离得越远越小声，出了屋会变闷。 */
  A.songs = [];
  let cur = null;
  A.loadSongList = async function () {
    try {
      const man = await (await fetch('sounds/sounds.json?t=' + Date.now(), { cache: 'no-store' })).json();
      VER = man.v || VER;
      A.songs = man.songs || [];
    } catch (e) {
      A.songs = [];
    }
    return A.songs;
  };
  A.nowPlaying = () => (cur ? { type: cur.type, idx: cur.idx, loading: !!cur.loading } : null);
  A.stopMusic = function () {
    if (!cur) return;
    const c = cur, t = A.ctx ? A.ctx.currentTime : 0;
    cur = null;
    tuneStop = 0;
    c.g.gain.setTargetAtTime(0, t, 0.08);
    setTimeout(() => {
      if (c.el) {
        c.el.pause();
        c.el.removeAttribute('src');
        c.el.load();
      }
      try { (c.node || c.g).disconnect(); } catch (e) { /* 忽略 */ }
    }, 500);
    if (A.onMusic) A.onMusic();
  };
  A.playSong = function (idx) {
    if (!A.ctx) return;
    A.resume();
    A.stopMusic();
    const song = A.songs[idx];
    if (!song) return;
    const el = new Audio();
    el.src = A.songURL(song.file);
    el.loop = true;
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
    const node = A.ctx.createMediaElementSource(el), g = A.ctx.createGain();
    g.gain.value = 0.9;
    node.connect(g);
    g.connect(A.bus.out);
    const c = (cur = { type: 'song', idx, el, node, g, loading: true });
    const fail = () => { if (cur === c) { cur = null; if (A.onMusic) A.onMusic('error'); } };
    el.addEventListener('playing', () => { if (cur === c) { c.loading = false; if (A.onMusic) A.onMusic(); } });
    el.addEventListener('error', fail);
    const p = el.play();
    if (p && p.catch) p.catch(fail);
    if (A.onMusic) A.onMusic();
  };
  function scheduleTune(c, t0) {
    const T = TUNES.bday, bus = { ctx: A.ctx, out: c.g, wet: c.g };
    let t = t0;
    for (const n of T.notes) {
      A.boxInto(bus, t, midi(n[0]), 0.22);
      t += n[1] * T.beat;
    }
    let tb = t0;
    for (const n of T.bass) {
      if (n[0]) A.boxInto(bus, tb, midi(n[0] + 12), 0.1);
      tb += n[1] * T.beat;
    }
    c.next = t + 2.2; // 唱完停一小会儿再从头开始
  }
  A.playBirthday = function () {
    if (!ready()) return;
    A.stopMusic();
    const g = A.ctx.createGain(), lp = A.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 18000;
    g.connect(lp);
    lp.connect(A.bus.out);
    const w = A.ctx.createGain();
    w.gain.value = 0.35;
    lp.connect(w);
    w.connect(A.bus.wet);
    const c = (cur = { type: 'bday', idx: -1, g, lp });
    scheduleTune(c, now() + 0.05);
    if (A.onMusic) A.onMusic();
  };
  // 每帧由屋里调用：生日歌接着循环、按距离调音量
  A.tickMusic = function (dist, outside) {
    if (!cur || cur.type !== 'bday' || !A.ctx) return;
    const t = A.ctx.currentTime;
    if (t > cur.next - 0.4) scheduleTune(cur, Math.max(cur.next, now()));
    cur.g.gain.setTargetAtTime(Math.max(0.05, Math.min(1, 1.8 / Math.max(dist, 0.9))), t, 0.25);
    cur.lp.frequency.setTargetAtTime(outside ? 900 : 18000, t, 0.3);
  };

  A.sfx = function (name, vol) {
    if (!ready()) return;
    const b = A.bus, t = now();
    vol = vol === undefined ? 1 : vol;
    switch (name) {
      case 'tick': // 开关“嗒”一声
        burst(b, t, 0.03, 0.25 * vol, 'highpass', 2500, 0, 0.7);
        tone(b, t, 1900, 1200, 0.05, 0.12 * vol);
        break;
      case 'crinkle': // 塑料包装袋窸窸窣窣
        for (let i = 0; i < 3; i++) burst(b, t + i * rnd(0.02, 0.05), rnd(0.02, 0.05), 0.12 * vol, 'bandpass', rnd(3000, 6000), 0, 1.5);
        break;
      case 'rain': // 很多包面哗啦啦掉下来
        for (let i = 0; i < 70; i++) {
          const tt = t + 0.5 + Math.pow(Math.random(), 0.8) * 2.6;
          burst(b, tt, rnd(0.02, 0.06), rnd(0.04, 0.11) * vol, 'bandpass', rnd(2200, 6000), 0, 1.4, 0.15);
          if (i % 4 === 0) tone(b, tt, rnd(140, 220), 80, 0.09, 0.07 * vol);
        }
        break;
      case 'crunch': // 鸡柳吃猫粮
        for (let i = 0; i < 4; i++) burst(b, t + i * rnd(0.1, 0.14), 0.05, 0.13 * vol, 'bandpass', rnd(1800, 3200), 0, 2);
        break;
      case 'poof': // 拍在雪上
        burst(b, t, 0.28, 0.3 * vol, 'lowpass', 1100, 300, 0.7, 0.2);
        tone(b, t, 220, 110, 0.2, 0.16 * vol);
        break;
      case 'air': // 吹蒲公英
        burst(b, t, 0.7, 0.07 * vol, 'bandpass', 2600, 5200, 0.6, 0.3, 0.18);
        break;
      case 'fire': // 被辣到喷火
        burst(b, t, 0.6, 0.18 * vol, 'bandpass', 500, 1900, 0.9, 0.2, 0.08);
        burst(b, t + 0.05, 0.5, 0.06 * vol, 'highpass', 4000, 0, 0.7, 0, 0.1);
        break;
      case 'clank': // 信箱的小铁门
        tone(b, t, 520, 500, 0.22, 0.1 * vol, 'triangle');
        tone(b, t, 1130, 1100, 0.16, 0.07 * vol);
        tone(b, t, 1790, 1760, 0.1, 0.05 * vol);
        burst(b, t, 0.03, 0.15 * vol, 'highpass', 3000, 0, 0.7);
        break;
      case 'whoosh': // 秋千荡过去
        burst(b, t, 0.5, 0.05 * vol, 'bandpass', 300, 900, 0.7, 0, 0.2);
        break;
      case 'lantern': // 孔明灯升起
        burst(b, t, 0.9, 0.05 * vol, 'bandpass', 500, 1400, 0.6, 0.4, 0.3);
        A.bellInto(b, t + 0.1, 1318.51, 0.12 * vol, 2.4);
        A.bellInto(b, t + 0.32, 1975.53, 0.08 * vol, 2.2);
        break;
      case 'magic': { // 那一刻：一串上行的小铃铛
        const seq = [1046.5, 1318.51, 1567.98, 1760, 2093, 2637.02];
        seq.forEach((f, i) => A.bellInto(b, t + i * 0.11, f, 0.13 * vol, 2.2));
        break;
      }
      case 'boom': // 远处的烟花：柔和的“砰”，再加一点细碎的噼啪声（不用超低频，手机扬声器放不出来会变成电流声）
        burst(b, t, 0.42, 0.11 * vol, 'bandpass', 520, 260, 0.9, 0.55, 0.008);
        burst(b, t, 0.22, 0.05 * vol, 'lowpass', 1400, 500, 0.7, 0.4, 0.004);
        for (let i = 0; i < 6; i++) burst(b, t + 0.35 + Math.random() * 0.8, 0.05, 0.012 * vol, 'bandpass', rnd(2400, 4200), 0, 2, 0.4, 0.004);
        break;
      case 'heart': // 冒爱心时很轻的一声
        A.boxInto(b, t, 1567.98, 0.06 * vol);
        break;
      case 'paper': // 拆信
        for (let i = 0; i < 5; i++) burst(b, t + i * rnd(0.05, 0.11), rnd(0.06, 0.14), 0.07 * vol, 'bandpass', rnd(1500, 3400), 0, 0.9, 0.1, 0.01);
        break;
      case 'squeak': // 玉兔被摸：两声很轻的“叽”（纯正弦，不会有杂音）
        tone(b, t, 1700, 2300, 0.07, 0.05 * vol);
        tone(b, t + 0.11, 1900, 2600, 0.06, 0.04 * vol);
        A.boxInto(b, t + 0.02, 2093, 0.05 * vol);
        break;
      case 'pound': // 玉兔捣药：木杵落进石臼“笃”的一声（都是中高频，没有低音）
        tone(b, t, 560, 430, 0.06, 0.09 * vol, 'triangle');
        tone(b, t, 1250, 1100, 0.03, 0.035 * vol);
        burst(b, t, 0.035, 0.07 * vol, 'bandpass', 1800, 900, 1.4, 0.15, 0.001);
        break;
      case 'meteor': // 流星划过：很轻的一阵“咻”，尾巴上两声细细的铃
        burst(b, t, 0.9, 0.035 * vol, 'bandpass', 5200, 2200, 1.2, 0.5, 0.25);
        A.bellInto(b, t + 0.45, 2637.02, 0.035 * vol, 1.6);
        A.bellInto(b, t + 0.62, 3520, 0.025 * vol, 1.4);
        break;
      case 'portal': { // 穿过月光：颂钵“嗡”的一声，一串缓缓上行的铃声，再加一阵轻柔的风
        A.bowl(0.5 * vol);
        const seq = [784, 988, 1175, 1568, 1976, 2349, 3136];
        seq.forEach((f, i) => A.bellInto(b, t + i * 0.16, f, 0.1 * vol, 2.6));
        burst(b, t, 1.6, 0.05 * vol, 'bandpass', 800, 3200, 0.6, 0.6, 0.6);
        break;
      }
      case 'jingle': // 鸡柳项圈上的小铃铛
        A.bellInto(b, t, rnd(2900, 3300), 0.03 * vol, 0.35);
        A.bellInto(b, t + 0.05, rnd(3300, 3700), 0.02 * vol, 0.3);
        break;
      case 'pop':
        tone(b, t, 700, 300, 0.08, 0.14 * vol);
        break;
    }
  };

  document.addEventListener('pointerdown', A.resume, true);
  document.addEventListener('visibilitychange', () => {
    if (!A.ctx) return;
    if (document.hidden) A.ctx.suspend().catch(() => {});
    else A.resume();
  });
  G.Audio = A;
})();
