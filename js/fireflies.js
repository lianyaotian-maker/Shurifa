/* 草原小屋 · 萤火虫瓶：留言板旁的高木墩上放着一只玻璃瓶，里面住着一群萤火虫。
   第一次点瓶子：萤火虫一只只飞出来，飞上夜空，拼成一行大大的「ZJL HAPPY」，停一会儿再落下来；
   之后它们就散在你身边，一路跟着你（去月亮上也跟着），把附近的草地照亮；
   再点一下瓶子，它们就飞回瓶里。夜空里的字每次打开网页只出现一次 */
(function () {
  'use strict';
  const F = { n: 80, state: 'jar', shown: false, hintT: -1 };
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const tmp = v3(0, 0, 0), cen = v3(0, 0, 0);

  /* ---------- 字形：每个字母是几条折线，画在宽 0.62、高 1 的格子里 ---------- */
  const GLYPH = {
    Z: [[[0, 1], [0.62, 1], [0, 0], [0.62, 0]]],
    J: [[[0.14, 1], [0.62, 1]], [[0.45, 1], [0.45, 0.25], [0.38, 0.06], [0.22, 0], [0.07, 0.07], [0.02, 0.22]]],
    L: [[[0, 1], [0, 0], [0.56, 0]]],
    H: [[[0, 0], [0, 1]], [[0.62, 0], [0.62, 1]], [[0.04, 0.5], [0.58, 0.5]]],
    A: [[[0, 0], [0.31, 1], [0.62, 0]], [[0.13, 0.38], [0.49, 0.38]]],
    P: [[[0, 0], [0, 1], [0.38, 1], [0.55, 0.93], [0.61, 0.76], [0.55, 0.6], [0.38, 0.52], [0.02, 0.52]]],
    Y: [[[0, 1], [0.31, 0.5], [0.62, 1]], [[0.31, 0.46], [0.31, 0]]]
  };
  // 把一行字的笔画按长度平均撒上 n 个点（每条笔画至少有两头两个点），坐标单位是“字高”
  function textPoints(text, n) {
    const paths = [];
    let x = 0;
    for (const ch of text) {
      if (ch === ' ') {
        x += 0.55;
        continue;
      }
      for (const p of GLYPH[ch]) paths.push(p.map((q) => [q[0] + x, q[1]]));
      x += 0.62 + 0.3;
    }
    const width = x - 0.3;
    const lens = paths.map((p) => p.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0));
    const total = lens.reduce((a, b) => a + b, 0);
    const cnt = lens.map((l) => Math.max(2, Math.round((l / total) * n)));
    // 凑够正好 n 个：多了从最长的笔画上减，少了往最长的上加
    let diff = n - cnt.reduce((a, b) => a + b, 0);
    while (diff !== 0) {
      let best = 0;
      for (let i = 1; i < cnt.length; i++) if (lens[i] / cnt[i] > lens[best] / cnt[best] === diff > 0) best = i;
      if (diff < 0 && cnt[best] <= 2) break;
      cnt[best] += diff > 0 ? 1 : -1;
      diff += diff > 0 ? -1 : 1;
    }
    const out = [], segs = [];
    paths.forEach((p, k) => {
      for (let j = 0; j < cnt[k]; j++) {
        if (j) segs.push([out.length - 1, out.length]);
        let s = (j / (cnt[k] - 1)) * lens[k];
        for (let i = 1; i < p.length; i++) {
          const a = p[i - 1], b = p[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (s <= l + 1e-6 || i === p.length - 1) {
            const u = l ? Math.min(1, s / l) : 0;
            out.push([a[0] + (b[0] - a[0]) * u - width / 2, a[1] + (b[1] - a[1]) * u - 0.5]);
            break;
          }
          s -= l;
        }
      }
    });
    return { pts: out.slice(0, n), segs: segs.filter((q) => q[1] < n) };
  }

  F.build = function (scene, B) {
    F.B = B;
    const base = (F.base = B.jar.clone());
    const g = new THREE.Group();
    g.position.copy(base);
    scene.add(g);
    // 玻璃瓶、软木塞、瓶颈上系的红绳
    const prof = [[0, 0], [0.095, 0], [0.11, 0.02], [0.115, 0.19], [0.105, 0.23], [0.072, 0.26], [0.07, 0.29]].map((p) => new THREE.Vector2(p[0], p[1]));
    const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 22), G.lambert({ color: 0xe4f4ff, emissive: 0x1e2a30, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
    glass.renderOrder = 5;
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.06, 0.05, 14), G.lambert({ color: 0xb48c5c, emissive: 0x2a1e12 }));
    cork.position.y = 0.305;
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.074, 0.007, 5, 18).rotateX(Math.PI / 2), G.lambert({ color: 0xc8322c, emissive: 0x3a0c0a }));
    tie.position.y = 0.265;
    g.add(glass, cork, tie);
    F.jarGlow = G.glow(0xd8ff8a, 0.8, 0);
    F.jarGlow.position.y = 0.13;
    g.add(F.jarGlow);
    G.Tap.add(G.Tap.proxy(g, 0.2, 0, 0.15, 0), 4.5, F.tap, { hint: v3(base.x, base.y + 0.62, base.z), hintDist: 9, enabled: () => !(G.Moon && G.Moon.on) });
    // 每只萤火虫：位置、速度、闪的节奏、大小、颜色、在你身边的位置、在瓶子里的位置
    F.f = [];
    for (let i = 0; i < F.n; i++) {
      const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 0.075;
      F.f.push({
        p: base.clone().add(v3(Math.cos(a) * r, 0.03 + Math.random() * 0.19, Math.sin(a) * r)),
        v: v3(0, 0, 0),
        inJar: v3(Math.cos(a) * r, 0.03 + Math.random() * 0.19, Math.sin(a) * r),
        ph: Math.random() * 6.283,
        rate: 0.5 + Math.random() * 0.7, // 每秒闪几下
        size: 0.75 + Math.random() * 0.55,
        orb: { r: 0.8 + Math.pow(Math.random(), 0.7) * 2.8, h: Math.random(), w: (Math.random() < 0.5 ? -1 : 1) * (0.12 + Math.random() * 0.3), a: Math.random() * 6.283 },
        home: true
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
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
    const D = 20, Hs = 3.6; // 离你 20 米，字高 3.6 米，一整行横跨大半个夜空（避开屏幕顶上的日期栏）
    const cx = P.x + fx * D, cy = P.y + 3.6, cz = P.z + fz * D;
    const T = textPoints('ZJL HAPPY', F.n), pts = T.pts;
    // 按从左到右的顺序派给萤火虫，出瓶的先后也按这个顺序，字像是一笔一笔写出来的
    const order = pts.map((q, i) => i).sort((a, b) => pts[a][0] - pts[b][0]);
    order.forEach((pi, k) => {
      const f = F.f[k], q = pts[pi];
      f.from = f.p.clone();
      f.to = v3(cx + rx * q[0] * Hs, cy + q[1] * Hs, cz + rz * q[0] * Hs);
      f.mid = f.from.clone().lerp(f.to, 0.45).add(v3((Math.random() - 0.5) * 4, 3 + Math.random() * 3, (Math.random() - 0.5) * 4));
      f.delay = (k / F.n) * 2.2 + Math.random() * 0.3;
      f.dur = 3.2 + Math.random() * 0.8;
      f.home = false;
      f.slot = pi;
    });
    // 星座一样的连线：同一笔画上相邻的两只萤火虫之间一条柔和的光带
    const owner = [];
    order.forEach((pi, k) => { owner[pi] = k; });
    const pos = [], uv = [], w = 0.1 * Hs;
    for (const [a, b] of T.segs) {
      const A = F.f[owner[a]].to, Bp = F.f[owner[b]].to;
      const dx = Bp.x - A.x, dy = Bp.y - A.y, dz = Bp.z - A.z, l = Math.hypot(dx, dy, dz) || 1;
      // 在字所在的竖直平面里，垂直于这一段的方向
      const sx = -dy / l * rx, sy = (dx * rx + dz * rz) / l, sz = -dy / l * rz;
      const quad = [[A, -1], [Bp, -1], [Bp, 1], [A, -1], [Bp, 1], [A, 1]];
      for (const [P0, side] of quad) {
        pos.push(P0.x + sx * w * side, P0.y + sy * w * side, P0.z + sz * w * side);
        uv.push(side);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aSide', new THREE.Float32BufferAttribute(uv, 1));
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
  }
  function release() {
    F.state = 'free';
    for (const f of F.f) f.home = false;
  }

  // 点瓶子：放出来 / 叫回去
  F.tap = function () {
    const P = G.Player;
    if (F.state === 'jar' || F.state === 'home') {
      G.Audio.chime(3, 0.12);
      if (!F.shown) {
        startText(P);
        // 发光的字在亮天上看不清：天色跟着慢慢暗下来
        const dark = G.Night.target > 0.5;
        if (!dark) G.UI.night();
        G.UI.toast(dark ? '萤火虫飞向夜空了……抬头看看' : '天慢慢黑了，萤火虫飞向夜空……抬头看看');
      } else {
        release();
        G.UI.toast('萤火虫又出来陪你了 · 想让它们回家，就再点一下瓶子');
      }
    } else {
      F.state = 'home';
      for (const f of F.f) f.home = false;
      G.Audio.chime(2, 0.07);
      G.UI.toast('萤火虫回瓶子里休息了');
    }
  };

  F.update = function (dt, t, P) {
    if (!F.f) return;
    const night = G.U.uNight.value, onMoon = G.Moon && G.Moon.on;
    if (F.B.lamp) F.B.lamp.material.opacity = 0.12 + 0.5 * night;
    if (F.state === 'text') {
      F.textT += dt;
      // 字拼好以后停 8 秒，然后落下来，散在你身边
      const done = F.f.every((f) => F.textT > f.delay + f.dur);
      if (done && F.formed === undefined) {
        F.formed = F.textT;
        G.Audio.sfx('magic', 0.7);
      }
      if ((F.formed !== undefined && F.textT > F.formed + 8) || onMoon) {
        release();
        F.hintT = 1.2;
      }
    }
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
    if (F.hintT > 0 && (F.hintT -= dt) <= 0) G.UI.toast('萤火虫会留在你身边，替你照亮四周 · 想让它们回家，就再点一下瓶子');
    let inside = 0, near = 0;
    cen.set(0, 0, 0);
    const fs = F.state === 'text' ? 1 : 0;
    for (let i = 0; i < F.n; i++) {
      const f = F.f[i];
      // 闪光：大部分时候是微弱的光，隔一会儿“亮”一下
      const ph = t * f.rate * Math.PI * 2 + f.ph, flash = Math.pow(Math.max(0, Math.sin(ph)), 5), glow = 0.28 + 0.12 * Math.sin(ph * 0.37 + f.ph);
      let bright = glow + 0.8 * flash, size = 0.2 * f.size;
      if (fs && !f.home) {
        const u = G.clamp((F.textT - f.delay) / f.dur, 0, 1);
        if (u > 0) {
          // 沿一条弯弯的弧线飞过去，到了以后轻轻晃
          const e = u * u * (3 - 2 * u), a = (1 - e) * (1 - e), b = 2 * (1 - e) * e, c = e * e;
          f.p.set(f.from.x * a + f.mid.x * b + f.to.x * c, f.from.y * a + f.mid.y * b + f.to.y * c, f.from.z * a + f.mid.z * b + f.to.z * c);
          f.p.y += Math.sin(t * 1.7 + f.ph) * 0.06 * e;
          f.v.set(0, 0, 0);
          bright = 0.6 + 0.45 * e + 0.15 * Math.sin(t * 3 + f.ph);
          size = 0.2 * f.size + e * (1.5 + 0.3 * f.size);
        } else {
          tmp.copy(F.base).add(f.inJar);
          f.p.lerp(tmp, Math.min(1, dt * 8));
        }
      } else {
        let k = 2.2, damp = 2.2, jit = 0.7;
        if (f.home || F.state === 'jar') {
          tmp.copy(F.base).add(f.inJar);
          tmp.y += Math.sin(t * 1.3 + f.ph) * 0.02;
          k = 14;
          damp = 5;
          jit = 0.12;
        } else if (F.state === 'home') {
          tmp.copy(F.base).add(f.inJar);
          tmp.y += 0.05;
          k = 3.5;
          damp = 2.8;
          jit = 0.3;
          if (f.p.distanceTo(tmp) < 0.12) f.home = true;
        } else {
          // 散在你身边：远近、高低都不一样，慢慢绕着你转，一部分贴着草飞，把地面照亮
          const o = f.orb, a = o.a + t * o.w;
          const gy = P.y - P.eye;
          tmp.set(P.x + Math.cos(a) * o.r, gy + 0.25 + o.h * (P.eye + 0.6) + Math.sin(t * 0.9 + f.ph) * 0.25, P.z + Math.sin(a) * o.r);
          if (!onMoon && G.Field) tmp.y = Math.max(tmp.y, G.Field.height(tmp.x, tmp.z) + 0.2);
        }
        // 一下子离得太远（比如刚去了月亮），直接飞到附近
        if (f.p.distanceToSquared(tmp) > 900) f.p.copy(tmp).add(v3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5));
        f.v.x += ((tmp.x - f.p.x) * k - f.v.x * damp + Math.sin(t * 1.9 + f.ph * 3) * jit) * dt;
        f.v.y += ((tmp.y - f.p.y) * k - f.v.y * damp + Math.cos(t * 1.6 + f.ph * 5) * jit * 0.6) * dt;
        f.v.z += ((tmp.z - f.p.z) * k - f.v.z * damp + Math.sin(t * 1.4 + f.ph * 7) * jit) * dt;
        f.p.addScaledVector(f.v, dt);
      }
      F.pos[i * 3] = f.p.x;
      F.pos[i * 3 + 1] = f.p.y;
      F.pos[i * 3 + 2] = f.p.z;
      F.alpha[i] = bright * (0.6 + 0.4 * night);
      F.size[i] = size;
      if (f.home) inside++;
      else if (F.state === 'free' && Math.hypot(f.p.x - P.x, f.p.z - P.z) < 6) {
        near++;
        cen.add(f.p);
      }
    }
    if (F.state === 'home' && inside === F.n) F.state = 'jar';
    // 拼字的时候字挂在天上，不让树和房子挡住
    F.pts.material.depthTest = F.state !== 'text';
    F.jarGlow.material.opacity = (inside / F.n) * (0.3 + 0.25 * night) * (0.75 + 0.25 * Math.sin(t * 2.2));
    // 萤火虫的光照在草地上：跟着时照你身边，在瓶子里时照瓶子周围
    const L = G.U.uLantern.value;
    if (near > 4) {
      cen.multiplyScalar(1 / near);
      L.set(cen.x, cen.y - 0.3, cen.z, (0.3 + 0.75 * night) * Math.min(1, (near / F.n) * 1.3));
    } else if (F.state === 'jar' && !onMoon) {
      L.set(F.base.x, F.base.y + 0.1, F.base.z, (0.05 + 0.2 * night) * (0.85 + 0.15 * Math.sin(t * 2.2)));
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
