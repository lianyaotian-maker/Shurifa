/* 草原小屋 · 萤火虫：一进草原，身边就有一群萤火虫，一路跟着你（去月亮上也跟着），夜里把身边的草地照亮。
   进屋的时候它们在门外等你。
   每次打开网页，第一次天黑时，它们会飞上夜空，在你面前拼出一行大大的「zjl happy」，停一会儿再落回你身边 */
(function () {
  'use strict';
  const F = { n: 80, state: 'free', shown: false, wait: 0, hintT: -1 };
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const tmp = v3(0, 0, 0), cen = v3(0, 0, 0);

  /* ---------- 小写字母：基线 y=0，x 高 0.55，上伸到 1，下伸到 -0.42 ---------- */
  function arc(cx, cy, rx, ry, a0, a1, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    return out;
  }
  const PI = Math.PI;
  const bowl = (cx) => ({ pts: arc(cx, 0.275, 0.21, 0.275, 0, PI * 2, 24), closed: true });
  // 每个字母：宽度、几条笔画（closed 是闭合的圈，dot 是一个点）
  const GLYPH = {
    z: { w: 0.44, s: [{ pts: [[0, 0.55], [0.44, 0.55], [0, 0], [0.44, 0]] }] },
    j: { w: 0.3, s: [{ pts: [[0.28, 0.55], [0.28, -0.24], [0.24, -0.36], [0.14, -0.42], [0.02, -0.38]] }, { pts: [[0.28, 0.8]], dot: true }] },
    l: { w: 0.26, s: [{ pts: [[0.08, 1], [0.08, 0.1], [0.13, 0.02], [0.24, 0]] }] },
    h: { w: 0.44, s: [{ pts: [[0, 1], [0, 0]] }, { pts: [[0, 0.36]].concat(arc(0.22, 0.33, 0.22, 0.22, PI * 0.92, 0, 8)).concat([[0.44, 0]]) }] },
    a: { w: 0.44, s: [bowl(0.21), { pts: [[0.44, 0.55], [0.44, 0]] }] },
    p: { w: 0.44, s: [{ pts: [[0.02, 0.55], [0.02, -0.42]] }, bowl(0.23)] },
    y: { w: 0.44, s: [{ pts: [[0, 0.55], [0.22, 0.04]] }, { pts: [[0.44, 0.55], [0.18, -0.3], [0.1, -0.4], [0, -0.42]] }] }
  };
  const plen = (p) => p.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
  // 把一行字的笔画按长度平均撒上 n 个点，坐标单位是“字高”；同时给出同一笔画上相邻两点的连线
  function textPoints(text, n) {
    const strokes = [];
    let x = 0;
    for (const ch of text) {
      if (ch === ' ') {
        x += 0.36;
        continue;
      }
      const g = GLYPH[ch];
      for (const s of g.s) strokes.push({ pts: s.pts.map((q) => [q[0] + x, q[1]]), closed: !!s.closed, dot: !!s.dot });
      x += g.w + 0.2;
    }
    const width = x - 0.2;
    const lines = strokes.filter((s) => !s.dot), lens = lines.map((s) => plen(s.pts));
    const dots = strokes.length - lines.length, total = lens.reduce((a, b) => a + b, 0);
    const minOf = (i) => (lines[i].closed ? 4 : 2);
    const cnt = lens.map((l, i) => Math.max(minOf(i), Math.round((l / total) * (n - dots))));
    let diff = n - dots - cnt.reduce((a, b) => a + b, 0);
    while (diff !== 0) {
      // 多了从间距最小的笔画减，少了往间距最大的笔画加
      let best = -1;
      for (let i = 0; i < cnt.length; i++) {
        if (diff < 0 && cnt[i] <= minOf(i)) continue;
        const gap = lens[i] / cnt[i];
        if (best < 0 || (diff > 0 ? gap > lens[best] / cnt[best] : gap < lens[best] / cnt[best])) best = i;
      }
      if (best < 0) break;
      cnt[best] += diff > 0 ? 1 : -1;
      diff += diff > 0 ? -1 : 1;
    }
    const out = [], segs = [];
    let k = 0;
    for (const s of strokes) {
      if (s.dot) {
        out.push(s.pts[0].slice());
        continue;
      }
      const c = cnt[k], L = lens[k++], first = out.length;
      for (let j = 0; j < c; j++) {
        let d = (j / (s.closed ? c : c - 1)) * L;
        for (let i = 1; i < s.pts.length; i++) {
          const a = s.pts[i - 1], b = s.pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (d <= l + 1e-6 || i === s.pts.length - 1) {
            const u = l ? Math.min(1, d / l) : 0;
            out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
            break;
          }
          d -= l;
        }
        if (j) segs.push([out.length - 2, out.length - 1]);
      }
      if (s.closed) segs.push([out.length - 1, first]);
    }
    // 整行字居中
    let y0 = 1e9, y1 = -1e9;
    for (const q of out) {
      y0 = Math.min(y0, q[1]);
      y1 = Math.max(y1, q[1]);
    }
    for (const q of out) {
      q[0] -= width / 2;
      q[1] -= (y0 + y1) / 2;
    }
    return { pts: out.slice(0, n), segs: segs.filter((q) => q[0] < n && q[1] < n) };
  }
  F.textPoints = textPoints;

  F.build = function (scene, B) {
    F.B = B;
    const sp = G.Field.SPAWN;
    F.f = [];
    for (let i = 0; i < F.n; i++) {
      const a = Math.random() * 6.283, r = 0.8 + Math.random() * 3;
      F.f.push({
        p: v3(sp.x + Math.cos(a) * r, G.Field.height(sp.x, sp.z) + 0.4 + Math.random() * 1.6, sp.z + Math.sin(a) * r),
        v: v3(0, 0, 0),
        ph: Math.random() * 6.283,
        rate: 0.5 + Math.random() * 0.7, // 每秒闪几下
        size: 0.75 + Math.random() * 0.55,
        // 在你身边的位置：远近、高低、绕圈的快慢和方向都不一样
        orb: { r: 0.8 + Math.pow(Math.random(), 0.7) * 2.8, h: Math.random(), w: (Math.random() < 0.5 ? -1 : 1) * (0.12 + Math.random() * 0.3), a: Math.random() * 6.283 }
      });
    }
    const geo = new THREE.BufferGeometry();
    F.pos = new Float32Array(F.n * 3);
    F.alpha = new Float32Array(F.n);
    F.size = new Float32Array(F.n);
    const tint = new Float32Array(F.n);
    for (let i = 0; i < F.n; i++) tint[i] = Math.random();
    geo.setAttribute('position', new THREE.BufferAttribute(F.pos, 3));
    geo.setAttribute('aA', new THREE.BufferAttribute(F.alpha, 1));
    geo.setAttribute('aS', new THREE.BufferAttribute(F.size, 1));
    geo.setAttribute('aT', new THREE.BufferAttribute(tint, 1));
    F.pts = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: { uPx: G.U.uPx },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: [
        'attribute float aA; attribute float aS; attribute float aT; uniform float uPx; varying float vA; varying float vT;',
        'void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vA = aA; vT = aT;',
        '  gl_PointSize = clamp(aS * uPx / max(-mv.z, 0.2), 3.0, 72.0); gl_Position = projectionMatrix * mv; }'
      ].join('\n'),
      // 中间一个很亮的小核，外面一圈柔和的黄绿色光晕
      fragmentShader: [
        'varying float vA; varying float vT;',
        'void main(){ vec2 q = gl_PointCoord - 0.5; float d2 = dot(q, q) * 4.0;',
        '  float core = exp(-d2 * 60.0), halo = exp(-d2 * 7.0) * 0.55;',
        '  vec3 hc = mix(vec3(0.62, 1.0, 0.32), vec3(0.95, 0.95, 0.45), vT);',
        '  vec3 c = hc * halo + vec3(1.0, 1.0, 0.82) * core;',
        '  gl_FragColor = vec4(c * vA * smoothstep(1.0, 0.7, d2), 1.0); }'
      ].join('\n')
    }));
    F.pts.frustumCulled = false;
    F.pts.renderOrder = 10;
    // 跟着你去月亮上也看得见
    F.pts.userData.keep = true;
    F.pts.layers.enable(1);
    scene.add(F.pts);
  };

  /* ---------- 飞上夜空拼字 ---------- */
  function startText(P) {
    F.state = 'text';
    F.shown = true;
    F.textT = 0;
    F.formed = undefined;
    // 月亮离视线太近时，整行字往旁边挪一点，免得被月亮的光晕冲淡（最多挪 20°，字不会出屏幕）
    const sd = G.U.uSunDir.value;
    let rel = Math.atan2(-sd.x, -sd.z) - P.yaw;
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    const yaw = P.yaw + (Math.abs(rel) < 0.62 ? G.clamp(rel - Math.sign(rel) * 0.62, -0.35, 0.35) : 0);
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const D = 20, Hs = 4.2; // 离你 20 米，一个字母从上到下约 6 米，横跨大半个夜空（避开屏幕顶上的日期栏）
    const cx = P.x + fx * D, cy = P.y + 3.4, cz = P.z + fz * D;
    const T = textPoints('zjl happy', F.n), pts = T.pts;
    // 按从左到右的顺序派给萤火虫，起飞的先后也按这个顺序，字像是一笔一笔写出来的
    const order = pts.map((q, i) => i).sort((a, b) => pts[a][0] - pts[b][0]);
    const owner = [];
    order.forEach((pi, k) => {
      const f = F.f[k], q = pts[pi];
      owner[pi] = k;
      f.from = f.p.clone();
      f.to = v3(cx + rx * q[0] * Hs, cy + q[1] * Hs, cz + rz * q[0] * Hs);
      f.mid = f.from.clone().lerp(f.to, 0.45).add(v3((Math.random() - 0.5) * 4, 3 + Math.random() * 3, (Math.random() - 0.5) * 4));
      f.delay = (k / F.n) * 2.2 + Math.random() * 0.3;
      f.dur = 3.2 + Math.random() * 0.8;
    });
    // 星座一样的连线：同一笔画上相邻的两只萤火虫之间一条柔和的光带
    const pos = [], side = [], w = 0.085 * Hs;
    for (const [a, b] of T.segs) {
      const A = F.f[owner[a]].to, Bp = F.f[owner[b]].to;
      const dx = Bp.x - A.x, dy = Bp.y - A.y, dz = Bp.z - A.z, l = Math.hypot(dx, dy, dz) || 1;
      // 在字所在的竖直平面里，垂直于这一段的方向
      const sx = (-dy / l) * rx, sy = (dx * rx + dz * rz) / l, sz = (-dy / l) * rz;
      for (const [P0, sd] of [[A, -1], [Bp, -1], [Bp, 1], [A, -1], [Bp, 1], [A, 1]]) {
        pos.push(P0.x + sx * w * sd, P0.y + sy * w * sd, P0.z + sz * w * sd);
        side.push(sd);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
    F.lines = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: { uA: { value: 0 } },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: 'attribute float aSide; varying float vS; void main(){ vS = aSide; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uA; varying float vS; void main(){ float k = exp(-vS * vS * 5.0); gl_FragColor = vec4(vec3(0.75, 1.0, 0.45) * k * uA, 1.0); }'
    }));
    F.lines.frustumCulled = false;
    F.lines.renderOrder = 9;
    F.lines.userData.keep = true;
    F.lines.layers.enable(1);
    F.pts.parent.add(F.lines);
    G.Audio.chime(3, 0.1);
    G.UI.toast('萤火虫飞向夜空了……抬头看看');
  }

  // 什么时候拼字：每次打开网页，第一次天黑透、你站在草原上（不在屋里、不在月亮上、没在看信或留言板）
  function readyForText(P, night) {
    if (F.shown || night < 0.9 || G.Night.target < 0.5) return false;
    if ((G.Moon && (G.Moon.on || G.Moon.busy)) || P.inHouse(P.x, P.z) || !P.enabled) return false;
    return true;
  }

  F.update = function (dt, t, P) {
    if (!F.f) return;
    const night = G.U.uNight.value, onMoon = G.Moon && G.Moon.on;
    if (F.B && F.B.lamp) F.B.lamp.material.opacity = 0.12 + 0.5 * night; // 留言板屋檐下的小灯
    if (F.state === 'free') {
      // 天黑透以后再等两秒，让夜色先出来
      F.wait = readyForText(P, night) ? F.wait + dt : 0;
      if (F.wait > 2) startText(P);
    } else {
      F.textT += dt;
      // 字拼好以后停 8 秒，然后落下来，回到你身边
      if (F.formed === undefined && F.f.every((f) => F.textT > f.delay + f.dur)) {
        F.formed = F.textT;
        G.Audio.sfx('magic', 0.7);
      }
      if ((F.formed !== undefined && F.textT > F.formed + 8) || onMoon) {
        F.state = 'free';
        F.hintT = 1.5;
      }
    }
    if (F.hintT > 0 && (F.hintT -= dt) <= 0) G.UI.toast('萤火虫会一直陪在你身边，替你照亮四周的路');
    // 连线：字拼好时慢慢亮起来，萤火虫散开时慢慢暗下去，暗透了就拆掉
    if (F.lines) {
      const want = F.state === 'text' && F.formed !== undefined ? 0.42 + 0.06 * Math.sin(t * 2) : 0;
      const u = F.lines.material.uniforms.uA;
      u.value += (want - u.value) * Math.min(1, dt * (want ? 1.2 : 2.5));
      if (F.state !== 'text' && u.value < 0.01) {
        F.lines.parent.remove(F.lines);
        F.lines.geometry.dispose();
        F.lines.material.dispose();
        F.lines = null;
      }
    }
    // 你在屋里时，它们在门外的台阶前等你
    const indoor = !onMoon && P.inHouse(P.x, P.z);
    const ax = indoor ? 0 : P.x, az = indoor ? 6.2 : P.z, ay = indoor ? G.Field.height(0, 6.2) : P.y - P.eye;
    let near = 0;
    cen.set(0, 0, 0);
    const text = F.state === 'text';
    for (let i = 0; i < F.n; i++) {
      const f = F.f[i];
      // 闪光：大部分时候是微弱的光，隔一会儿“亮”一下
      const ph = t * f.rate * Math.PI * 2 + f.ph, flash = Math.pow(Math.max(0, Math.sin(ph)), 5), glow = 0.28 + 0.12 * Math.sin(ph * 0.37 + f.ph);
      let bright = glow + 0.8 * flash, size = 0.2 * f.size;
      if (text) {
        const u = G.clamp((F.textT - f.delay) / f.dur, 0, 1);
        // 沿一条弯弯的弧线飞过去，到了以后轻轻晃
        const e = u * u * (3 - 2 * u), a = (1 - e) * (1 - e), b = 2 * (1 - e) * e, c = e * e;
        f.p.set(f.from.x * a + f.mid.x * b + f.to.x * c, f.from.y * a + f.mid.y * b + f.to.y * c, f.from.z * a + f.mid.z * b + f.to.z * c);
        f.p.y += Math.sin(t * 1.7 + f.ph) * 0.06 * e;
        f.v.set(0, 0, 0);
        if (u > 0) {
          bright = 0.6 + 0.45 * e + 0.15 * Math.sin(t * 3 + f.ph);
          size = 0.2 * f.size + e * (1.5 + 0.3 * f.size);
        }
      } else {
        // 散在你身边：慢慢绕着你转，一部分贴着草飞，把地面照亮
        const o = f.orb, a = o.a + t * o.w;
        tmp.set(ax + Math.cos(a) * o.r, ay + 0.25 + o.h * (P.eye + 0.6) + Math.sin(t * 0.9 + f.ph) * 0.25, az + Math.sin(a) * o.r);
        if (!onMoon) tmp.y = Math.max(tmp.y, G.Field.height(tmp.x, tmp.z) + 0.2);
        // 一下子离得太远（比如刚去了月亮），直接飞到附近
        if (f.p.distanceToSquared(tmp) > 900) f.p.copy(tmp).add(v3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5));
        const k = 2.2, damp = 2.2, jit = 0.7;
        f.v.x += ((tmp.x - f.p.x) * k - f.v.x * damp + Math.sin(t * 1.9 + f.ph * 3) * jit) * dt;
        f.v.y += ((tmp.y - f.p.y) * k - f.v.y * damp + Math.cos(t * 1.6 + f.ph * 5) * jit * 0.6) * dt;
        f.v.z += ((tmp.z - f.p.z) * k - f.v.z * damp + Math.sin(t * 1.4 + f.ph * 7) * jit) * dt;
        f.p.addScaledVector(f.v, dt);
        if (Math.hypot(f.p.x - ax, f.p.z - az) < 6) {
          near++;
          cen.add(f.p);
        }
      }
      F.pos[i * 3] = f.p.x;
      F.pos[i * 3 + 1] = f.p.y;
      F.pos[i * 3 + 2] = f.p.z;
      // 白天淡一些，夜里亮
      F.alpha[i] = bright * (text ? 0.6 + 0.4 * night : 0.4 + 0.6 * night);
      F.size[i] = size;
    }
    // 拼字的时候字挂在天上，不让树和房子挡住
    F.pts.material.depthTest = !text;
    // 萤火虫的光照在草地上（夜里才明显）
    const L = G.U.uLantern.value;
    if (near > 4) {
      cen.multiplyScalar(1 / near);
      L.set(cen.x, cen.y - 0.3, cen.z, (0.05 + 1.0 * night) * Math.min(1, (near / F.n) * 1.3));
    } else L.w = 0;
    if (G.Moon && G.Moon.poolU) {
      const C = G.Moon.C, pu = G.Moon.poolU[13];
      if (onMoon && near > 4) pu.set(cen.x - C.x, cen.z - C.z, 3.2, 0.55 * (near / F.n));
      else pu.w = 0;
    }
    const at = F.pts.geometry.attributes;
    at.position.needsUpdate = true;
    at.aA.needsUpdate = true;
    at.aS.needsUpdate = true;
  };

  G.Fireflies = F;
})();
