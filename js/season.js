/* 草原小屋 · 日期与季节 */
(function () {
  'use strict';
  const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const MONTH_START = [];
  let acc = 0;
  for (const d of MONTH_DAYS) {
    MONTH_START.push(acc);
    acc += d;
  }
  const SUB = ['隆冬', '冬末', '初春', '仲春', '暮春', '初夏', '盛夏', '夏末', '初秋', '金秋', '深秋', '初冬'];
  const SPECIAL = MONTH_START[4] + 21 - 1; // 一年中的第 140 天

  const wrap = (i) => ((i % 365) + 365) % 365;
  function dayFromDate(date) {
    const m = date.getMonth();
    let d = date.getDate();
    if (m === 1 && d === 29) d = 28;
    return MONTH_START[m] + d - 1;
  }
  function dateOfDay(i) {
    i = wrap(Math.round(i));
    let m = 0;
    while (m < 11 && i >= MONTH_START[m + 1]) m++;
    return { m: m + 1, d: i - MONTH_START[m] + 1 };
  }
  function label(i) {
    const o = dateOfDay(i);
    return o.m + '月' + o.d + '日 · ' + SUB[o.m - 1];
  }

  /* 黄昏的四季关键帧（颜色为显示空间 0~1） */
  const K = [
    { day: 20, // 隆冬
      zen: [0.30, 0.36, 0.58], hor: [0.86, 0.78, 0.84], glow: [0.95, 0.58, 0.48], sun: [1.0, 0.84, 0.74],
      ambT: [0.62, 0.66, 0.82], ambB: [0.55, 0.55, 0.60], cLit: [1.0, 0.86, 0.80], cShade: [0.62, 0.60, 0.74], mtn: [0.50, 0.52, 0.68],
      gBase: [0.42, 0.40, 0.36], gTip: [0.86, 0.84, 0.80], gAlt: [0.78, 0.76, 0.72], gH: 0.55,
      flw: 0, fol: 0, oak: [0.50, 0.42, 0.30], blos: [0.50, 0.42, 0.30], pine: [0.20, 0.32, 0.30],
      snow: 1, petals: 0, ffly: 0, leaves: 0, snowfall: 1, smoke: 1 },
    { day: 59, // 冬末
      zen: [0.34, 0.42, 0.64], hor: [0.92, 0.80, 0.78], glow: [1.0, 0.60, 0.45], sun: [1.0, 0.84, 0.70],
      ambT: [0.60, 0.64, 0.78], ambB: [0.45, 0.45, 0.40], cLit: [1.0, 0.85, 0.75], cShade: [0.62, 0.60, 0.72], mtn: [0.50, 0.54, 0.68],
      gBase: [0.30, 0.33, 0.20], gTip: [0.66, 0.68, 0.44], gAlt: [0.58, 0.62, 0.40], gH: 0.7,
      flw: 0.08, fol: 0.1, oak: [0.55, 0.62, 0.35], blos: [0.95, 0.80, 0.84], pine: [0.18, 0.32, 0.25],
      snow: 0.3, petals: 0, ffly: 0, leaves: 0, snowfall: 0.15, smoke: 0.6 },
    { day: 88, // 初春 · 花开
      zen: [0.40, 0.50, 0.74], hor: [0.99, 0.80, 0.74], glow: [1.0, 0.62, 0.42], sun: [1.0, 0.82, 0.62],
      ambT: [0.58, 0.60, 0.74], ambB: [0.40, 0.44, 0.30], cLit: [1.0, 0.84, 0.74], cShade: [0.70, 0.62, 0.76], mtn: [0.52, 0.54, 0.72],
      gBase: [0.22, 0.38, 0.17], gTip: [0.62, 0.82, 0.38], gAlt: [0.52, 0.74, 0.32], gH: 0.85,
      flw: 0.45, fol: 0.6, oak: [0.56, 0.74, 0.34], blos: [1.0, 0.74, 0.84], pine: [0.17, 0.33, 0.22],
      snow: 0, petals: 1, ffly: 0, leaves: 0, snowfall: 0, smoke: 0.2 },
    { day: 140, // 暮春
      zen: [0.40, 0.52, 0.78], hor: [1.0, 0.82, 0.70], glow: [1.0, 0.64, 0.40], sun: [1.0, 0.82, 0.60],
      ambT: [0.56, 0.60, 0.74], ambB: [0.38, 0.44, 0.28], cLit: [1.0, 0.86, 0.72], cShade: [0.70, 0.62, 0.78], mtn: [0.50, 0.55, 0.72],
      gBase: [0.19, 0.37, 0.15], gTip: [0.58, 0.82, 0.34], gAlt: [0.70, 0.80, 0.36], gH: 1.05,
      flw: 0.6, fol: 1, oak: [0.44, 0.66, 0.28], blos: [0.66, 0.74, 0.44], pine: [0.16, 0.33, 0.21],
      snow: 0, petals: 0.35, ffly: 0.15, leaves: 0, snowfall: 0, smoke: 0.05 },
    { day: 191, // 盛夏
      zen: [0.32, 0.48, 0.80], hor: [1.0, 0.84, 0.62], glow: [1.0, 0.66, 0.32], sun: [1.0, 0.84, 0.56],
      ambT: [0.54, 0.60, 0.76], ambB: [0.36, 0.42, 0.24], cLit: [1.0, 0.88, 0.68], cShade: [0.66, 0.62, 0.76], mtn: [0.46, 0.54, 0.70],
      gBase: [0.13, 0.31, 0.10], gTip: [0.48, 0.70, 0.22], gAlt: [0.58, 0.72, 0.26], gH: 1.3,
      flw: 0.35, fol: 1, oak: [0.30, 0.52, 0.18], blos: [0.34, 0.56, 0.22], pine: [0.14, 0.30, 0.18],
      snow: 0, petals: 0, ffly: 1, leaves: 0, snowfall: 0, smoke: 0 },
    { day: 236, // 夏末
      zen: [0.34, 0.46, 0.76], hor: [1.0, 0.80, 0.58], glow: [1.0, 0.62, 0.30], sun: [1.0, 0.82, 0.54],
      ambT: [0.56, 0.58, 0.72], ambB: [0.40, 0.40, 0.24], cLit: [1.0, 0.86, 0.66], cShade: [0.68, 0.60, 0.72], mtn: [0.48, 0.52, 0.68],
      gBase: [0.24, 0.33, 0.12], gTip: [0.70, 0.74, 0.30], gAlt: [0.80, 0.70, 0.32], gH: 1.25,
      flw: 0.22, fol: 1, oak: [0.40, 0.56, 0.20], blos: [0.42, 0.56, 0.22], pine: [0.15, 0.31, 0.19],
      snow: 0, petals: 0, ffly: 0.6, leaves: 0.1, snowfall: 0, smoke: 0 },
    { day: 283, // 金秋
      zen: [0.36, 0.40, 0.66], hor: [1.0, 0.74, 0.52], glow: [1.0, 0.55, 0.24], sun: [1.0, 0.76, 0.46],
      ambT: [0.60, 0.56, 0.68], ambB: [0.48, 0.38, 0.22], cLit: [1.0, 0.80, 0.58], cShade: [0.70, 0.56, 0.66], mtn: [0.52, 0.48, 0.64],
      gBase: [0.44, 0.32, 0.12], gTip: [1.0, 0.78, 0.36], gAlt: [0.92, 0.56, 0.24], gH: 1.15,
      flw: 0.06, fol: 0.95, oak: [0.96, 0.58, 0.18], blos: [0.88, 0.30, 0.20], pine: [0.16, 0.30, 0.20],
      snow: 0, petals: 0, ffly: 0, leaves: 1, snowfall: 0, smoke: 0.1 },
    { day: 318, // 深秋
      zen: [0.34, 0.38, 0.58], hor: [0.94, 0.74, 0.64], glow: [1.0, 0.56, 0.36], sun: [1.0, 0.78, 0.56],
      ambT: [0.60, 0.58, 0.70], ambB: [0.44, 0.36, 0.26], cLit: [1.0, 0.80, 0.66], cShade: [0.64, 0.56, 0.68], mtn: [0.50, 0.48, 0.62],
      gBase: [0.36, 0.28, 0.16], gTip: [0.76, 0.60, 0.38], gAlt: [0.70, 0.48, 0.28], gH: 0.95,
      flw: 0, fol: 0.35, oak: [0.74, 0.40, 0.18], blos: [0.70, 0.30, 0.20], pine: [0.17, 0.30, 0.22],
      snow: 0, petals: 0, ffly: 0, leaves: 0.6, snowfall: 0, smoke: 0.5 },
    { day: 350, // 初冬
      zen: [0.32, 0.38, 0.60], hor: [0.88, 0.78, 0.82], glow: [0.98, 0.58, 0.46], sun: [1.0, 0.82, 0.70],
      ambT: [0.62, 0.64, 0.80], ambB: [0.52, 0.52, 0.56], cLit: [1.0, 0.84, 0.78], cShade: [0.62, 0.60, 0.74], mtn: [0.50, 0.52, 0.68],
      gBase: [0.40, 0.38, 0.32], gTip: [0.84, 0.82, 0.78], gAlt: [0.76, 0.74, 0.70], gH: 0.65,
      flw: 0, fol: 0, oak: [0.60, 0.38, 0.20], blos: [0.60, 0.36, 0.24], pine: [0.19, 0.31, 0.28],
      snow: 0.75, petals: 0, ffly: 0, leaves: 0, snowfall: 0.8, smoke: 1 }
  ];

  const out = {};
  function mixInto(a, b, t) {
    for (const k in a) {
      if (k === 'day') continue;
      const va = a[k], vb = b[k];
      if (Array.isArray(va)) {
        const o = out[k] || (out[k] = [0, 0, 0]);
        o[0] = va[0] + (vb[0] - va[0]) * t;
        o[1] = va[1] + (vb[1] - va[1]) * t;
        o[2] = va[2] + (vb[2] - va[2]) * t;
      } else out[k] = va + (vb - va) * t;
    }
    return out;
  }
  // day 可以是小数，季节在关键帧之间平滑过渡
  function sample(day) {
    day = ((day % 365) + 365) % 365;
    let i = K.length - 1;
    for (let k = 0; k < K.length; k++) if (K[k].day <= day) i = k;
    const a = K[i], b = K[(i + 1) % K.length];
    let span = b.day - a.day;
    if (span <= 0) span += 365;
    let off = day - a.day;
    if (off < 0) off += 365;
    let t = G.clamp(off / span, 0, 1);
    t = t * t * (3 - 2 * t);
    return mixInto(a, b, t);
  }
  // 两个日期之间沿圆周的最短差
  function diff(a, b) {
    let d = (b - a) % 365;
    if (d > 182.5) d -= 365;
    if (d < -182.5) d += 365;
    return d;
  }

  G.Season = { dayFromDate, dateOfDay, label, sample, diff, SPECIAL, MONTH_START };
})();
