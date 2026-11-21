/* 草原小屋 · 夜晚：温柔的蓝紫夜色、月亮、手里的小灯笼 */
(function () {
  'use strict';
  const N = { target: 0, k: 0, t: 0 };
  // 夜晚的颜色（显示空间 0~1）
  const NIGHT = {
    zen: [0.06, 0.07, 0.19], hor: [0.19, 0.19, 0.37], glow: [0.24, 0.27, 0.46], sun: [0.40, 0.47, 0.72],
    ambT: [0.21, 0.24, 0.42], ambB: [0.09, 0.10, 0.18], cLit: [0.30, 0.32, 0.52], cShade: [0.11, 0.12, 0.24],
    mtn: [0.09, 0.10, 0.22]
  };
  const KEYS = Object.keys(NIGHT);
  const ease = (x) => x * x * (3 - 2 * x);

  // 把当天的黄昏颜色按夜晚程度混成夜色（冬天的雪地稍微亮一点）
  N.blend = function (S) {
    const k = N.k;
    if (k <= 0) return S;
    const snowLift = 1 + 0.35 * S.snow;
    for (const key of KEYS) {
      const a = S[key], b = NIGHT[key], m = key === 'sun' || key === 'ambT' ? snowLift : 1;
      for (let i = 0; i < 3; i++) a[i] = a[i] + (b[i] * m - a[i]) * k;
    }
    // 草稍微褪色、偏冷
    for (const key of ['gBase', 'gTip', 'gAlt']) {
      const a = S[key], l = (a[0] + a[1] + a[2]) / 3;
      a[0] += (l * 0.85 - a[0]) * 0.35 * k;
      a[1] += (l * 0.95 - a[1]) * 0.3 * k;
      a[2] += (l * 1.15 - a[2]) * 0.35 * k;
    }
    return S;
  };

  N.build = function () {
    // 月亮直接画在天空着色器里（见 shaders.js），这里不需要额外的物体
  };

  N.toggle = function () {
    N.target = N.target > 0.5 ? 0 : 1;
    return N.target;
  };

  N.update = function (dt, t, camera, P) {
    // 大约 4 秒从黄昏过渡到夜晚
    const dir = N.target > N.t ? 1 : -1;
    N.t = G.clamp(N.t + dir * dt / 4, 0, 1);
    if (Math.abs(N.target - N.t) < 1e-3) N.t = N.target;
    N.k = ease(N.t);
    const k = N.k;
    G.U.uNight.value = k;
    G.U.uFogDensity.value = 0.0095 + 0.003 * k;
    G.U.uRim.value.setRGB(1.0 - 0.45 * k, 0.78 - 0.1 * k, 0.45 + 0.45 * k);
  };

  G.Night = N;
})();
