/* 草原小屋 · 声音：全部实时合成（猫叫、呼噜、风铃、八音盒和各种小音效），不依赖任何音频文件 */
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
  async function loadBuf(f) {
    const r = await fetch('sounds/' + f);
    if (!r.ok) throw new Error(f);
    return decode(await r.arrayBuffer());
  }
  A.loadSamples = async function () {
    if (A.samples || A.loading || !A.ctx) return;
    A.loading = true;
    try {
      const man = await (await fetch('sounds/sounds.json')).json();
      const S = { steps: {} };
      if (man.meow) S.meow = { buf: await loadBuf(man.meow.file), segs: man.meow.segs };
      if (man.purr) S.purr = { buf: await loadBuf(man.purr.file), loop: man.purr.loop };
      for (const k in man.steps) S.steps[k] = { buf: await loadBuf(man.steps[k].file), hits: man.steps[k].hits };
      S.amb = {};
      for (const k in man.amb || {}) S.amb[k] = { buf: await loadBuf(man.amb[k].file), loop: man.amb[k].loop };
      A.samples = S;
    } catch (e) {
      A.samples = null;
    }
    A.loading = false;
  };
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
        if (seg) return playSeg(M.buf, seg, 0.95 * (vol === undefined ? 1 : vol), rnd(0.96, 1.05), 0.18);
      }
    }
    return A.meowInto(A.bus, now(), kind, { pitch: rnd(0.94, 1.07), stretch: rnd(0.92, 1.1), vol: vol });
  };
  /* ---------- 环境声：风、草原、鸟叫、虫鸣（有录音用录音，没有就合成风声和虫鸣） ---------- */
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
    const want = { wind: o.wind * 0.42 * gust, meadow: o.meadow * 0.32, birds: o.birds * 0.3, crickets: o.crickets * 0.26 };
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
      if (L.filt) L.filt.frequency.setTargetAtTime(300 + 380 * gust, t, 0.8);
    }
  };

  // 脚步声：每踩一步放一下；雪地用碎石声压低音调再滤掉高频，听起来像踩雪
  A.step = function (surface, vol) {
    if (!ready() || !A.samples) return;
    const S = A.samples.steps;
    let k = surface, rate = rnd(0.9, 1.1), filt = null;
    if (surface === 'snow') {
      k = 'gravel';
      rate = rnd(0.72, 0.82);
      filt = ['lowpass', 2600];
    }
    const st = S[k] || S.grass;
    if (!st) return;
    const seg = pick(st.hits, k);
    if (seg) playSeg(st.buf, seg, (vol === undefined ? 1 : vol) * rnd(0.75, 1), rate, 0.06, filt);
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
  A.music = function (name) {
    if (!ready()) return 0;
    const T = TUNES[name] || TUNES.lull, t0 = now() + 0.05;
    let t = t0;
    for (const n of T.notes) {
      A.boxInto(A.bus, t, midi(n[0]), 0.2);
      t += n[1] * T.beat;
    }
    let tb = t0;
    for (const n of T.bass) {
      if (n[0]) A.boxInto(A.bus, tb, midi(n[0] + 12), 0.09);
      tb += n[1] * T.beat;
    }
    tuneStop = t + 1.2;
    return t - t0 + 1.5;
  };
  A.musicPlaying = () => !!A.ctx && A.ctx.currentTime < tuneStop;
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
      case 'boom': // 远处的烟花
        tone(b, t, 95, 42, 0.5, 0.22 * vol);
        tone(b, t, 240, 110, 0.3, 0.1 * vol);
        burst(b, t, 0.55, 0.14 * vol, 'lowpass', 500, 120, 0.7, 0.5);
        burst(b, t, 0.28, 0.1 * vol, 'bandpass', 750, 280, 0.8, 0.5);
        for (let i = 0; i < 10; i++) burst(b, t + 0.25 + Math.random() * 0.7, 0.03, 0.035 * vol, 'highpass', 3500, 0, 0.7, 0.3);
        break;
      case 'heart': // 冒爱心时很轻的一声
        A.boxInto(b, t, 1567.98, 0.06 * vol);
        break;
      case 'paper': // 拆信
        for (let i = 0; i < 5; i++) burst(b, t + i * rnd(0.05, 0.11), rnd(0.06, 0.14), 0.07 * vol, 'bandpass', rnd(1500, 3400), 0, 0.9, 0.1, 0.01);
        break;
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
