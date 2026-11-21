/* 草原小屋 · 萤火虫瓶：留言板旁的小木墩上放着一只玻璃瓶，里面住着一群萤火虫。
   点瓶子放它们出来，它们会围着你一路跟着走（去月亮上也跟着）；
   站着别动一会儿，它们会在你面前排成一颗心；再点瓶子，它们就飞回瓶里睡觉 */
(function () {
  'use strict';
  const F = { n: 40, state: 'jar', still: 0, told: false };
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const tmp = v3(0, 0, 0);

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
    F.jarGlow = G.glow(0xd8ff8a, 0.75, 0);
    F.jarGlow.position.y = 0.13;
    g.add(F.jarGlow);
    G.Tap.add(G.Tap.proxy(g, 0.2, 0, 0.15, 0), 4.5, F.tap, { hint: v3(base.x, base.y + 0.62, base.z), hintDist: 9, enabled: () => !(G.Moon && G.Moon.on) });
    // 每只萤火虫：位置、速度、闪烁的节奏、绕着你飞的轨道、在瓶子里的位置
    F.f = [];
    for (let i = 0; i < F.n; i++) {
      const a = Math.random() * 6.283, r = Math.random() * 0.07;
      const inJar = v3(Math.cos(a) * r, 0.04 + Math.random() * 0.17, Math.sin(a) * r);
      F.f.push({
        p: base.clone().add(inJar), v: v3(0, 0, 0), inJar, ph: Math.random() * 6.283, blink: 1.6 + Math.random() * 1.6,
        orb: { r: 0.7 + Math.random() * 1.3, h: -0.6 + Math.random() * 1.1, w: (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.45), a: Math.random() * 6.283 },
        home: true
      });
    }
    const geo = new THREE.BufferGeometry();
    F.pos = new Float32Array(F.n * 3);
    F.alpha = new Float32Array(F.n);
    geo.setAttribute('position', new THREE.BufferAttribute(F.pos, 3));
    geo.setAttribute('aA', new THREE.BufferAttribute(F.alpha, 1));
    F.pts = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: { uPx: G.U.uPx },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: 'attribute float aA; uniform float uPx; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vA = aA; gl_PointSize = clamp(0.2 * uPx / max(-mv.z, 0.2), 2.5, 56.0); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = (smoothstep(0.5, 0.0, d) * 0.5 + smoothstep(0.13, 0.0, d)) * vA; gl_FragColor = vec4(vec3(0.82, 1.0, 0.42) * a, 1.0); }'
    }));
    F.pts.frustumCulled = false;
    F.pts.renderOrder = 10;
    // 跟着你去月亮上也看得见
    F.pts.userData.keep = true;
    F.pts.layers.enable(1);
    scene.add(F.pts);
  };

  // 点瓶子：放出来 / 叫回去
  F.tap = function () {
    if (F.state === 'jar' || F.state === 'home') {
      F.state = 'free';
      F.heart = null;
      F.still = 0;
      for (const f of F.f) f.home = false;
      G.Audio.chime(3, 0.12);
      if (!F.told) {
        F.told = true;
        G.UI.toast('萤火虫飞出来了，会一路跟着你。站着别动一会儿，看看它们想说什么');
      }
    } else {
      F.state = 'home';
      F.heart = null;
      G.Audio.chime(2, 0.07);
      G.UI.toast('萤火虫回瓶子里休息了');
    }
  };

  // 在你面前排成一颗心（位置定下来以后就不动了，坐在秋千上也不会晃）
  function makeHeart(P) {
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
    const cx = P.x + fx * 2.5, cy = P.y - 0.02, cz = P.z + fz * 2.5, s = 0.04;
    const pts = [];
    for (let i = 0; i < F.n; i++) {
      const t = (i / F.n) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      pts.push(v3(cx + rx * x * s, cy + y * s, cz + rz * x * s));
    }
    return pts;
  }

  let lx = 0, lz = 0;
  F.update = function (dt, t, P) {
    if (!F.f) return;
    const night = G.U.uNight.value;
    if (F.B.lamp) F.B.lamp.material.opacity = 0.12 + 0.5 * night;
    // 站着不动多久了
    const moved = Math.hypot(P.x - lx, P.z - lz);
    lx = P.x;
    lz = P.z;
    F.still = moved > dt * 0.25 && !P.seat ? 0 : F.still + dt;
    if (F.state === 'free') {
      if (!F.heart && F.still > 2.2) {
        F.heart = makeHeart(P);
        G.Audio.sfx('heart', 0.9);
      } else if (F.heart && F.still < 0.05) F.heart = null;
    }
    let inside = 0;
    for (let i = 0; i < F.n; i++) {
      const f = F.f[i];
      let k = 3.2, damp = 2.6, jit = 0.9;
      if (f.home || F.state === 'jar') {
        tmp.copy(F.base).add(f.inJar);
        tmp.y += Math.sin(t * 1.3 + f.ph) * 0.02;
        k = 14;
        damp = 5;
        jit = 0.15;
      } else if (F.state === 'home') {
        tmp.copy(F.base).add(f.inJar);
        tmp.y += 0.05;
        k = 4;
        damp = 3;
        jit = 0.3;
        if (f.p.distanceTo(tmp) < 0.12) f.home = true;
      } else if (F.heart) {
        tmp.copy(F.heart[i]);
        tmp.y += Math.sin(t * 2 + f.ph) * 0.025;
        k = 6;
        damp = 4;
        jit = 0.15;
      } else {
        const o = f.orb, a = o.a + t * o.w;
        tmp.set(P.x + Math.cos(a) * o.r, P.y + o.h + Math.sin(t * 1.3 + f.ph) * 0.18, P.z + Math.sin(a) * o.r);
      }
      // 一下子离得太远（比如刚去了月亮），直接飞到附近
      if (f.p.distanceToSquared(tmp) > 900) f.p.copy(tmp).add(v3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5));
      f.v.x += ((tmp.x - f.p.x) * k - f.v.x * damp + Math.sin(t * 2.7 + f.ph * 3) * jit) * dt;
      f.v.y += ((tmp.y - f.p.y) * k - f.v.y * damp + Math.cos(t * 2.3 + f.ph * 5) * jit * 0.6) * dt;
      f.v.z += ((tmp.z - f.p.z) * k - f.v.z * damp + Math.sin(t * 2.1 + f.ph * 7) * jit) * dt;
      f.p.addScaledVector(f.v, dt);
      F.pos[i * 3] = f.p.x;
      F.pos[i * 3 + 1] = f.p.y;
      F.pos[i * 3 + 2] = f.p.z;
      // 一闪一闪：大部分时间暗着，隔一会儿亮一下；排成心的时候一直亮着
      const b = Math.max(0, Math.sin(t * f.blink + f.ph));
      F.alpha[i] = (F.heart && !f.home ? 0.75 + 0.25 * b : 0.18 + 0.82 * b * b) * (0.55 + 0.45 * night);
      if (f.home) inside++;
    }
    if (F.state === 'home' && inside === F.n) F.state = 'jar';
    F.jarGlow.material.opacity = (inside / F.n) * (0.25 + 0.2 * night) * (0.75 + 0.25 * Math.sin(t * 2.2));
    F.pts.geometry.attributes.position.needsUpdate = true;
    F.pts.geometry.attributes.aA.needsUpdate = true;
  };

  G.Fireflies = F;
})();
