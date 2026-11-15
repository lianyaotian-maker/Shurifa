/* 草原小屋 · 那一天：小屋的装扮（灯串、彩旗、花拱门、气球、花环）和天上的烟花 */
(function () {
  'use strict';
  const SH = G.SH;
  const P = { built: false };

  const LIGHTS_VS = SH.COMMON + /* glsl */ `
attribute vec4 aSeed;
attribute vec3 aCol;
uniform float uOn;
uniform float uAmt;
uniform float uPx;
varying vec3 vColor;
varying float vAlpha;
void main(){
  float lit = smoothstep(aSeed.x - 0.03, aSeed.x + 0.01, uOn) * uAmt;
  float tw = 0.7 + 0.3 * sin(uTime * (1.6 + aSeed.z * 2.6) + aSeed.z * 40.0);
  vColor = aCol * tw;
  vAlpha = lit;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = min(0.8 * uPx / max(-mv.z, 0.3), 80.0) * step(0.01, lit);
  gl_Position = projectionMatrix * mv;
}
`;
  const LIGHTS_FS = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float core = smoothstep(0.13, 0.0, d);
  float halo = exp(-d * d * 20.0) * 0.6;
  gl_FragColor = vec4(vColor * (core * 1.7 + halo) * vAlpha, 1.0);
}
`;
  const FW_VS = SH.COMMON + /* glsl */ `
attribute vec4 aSeed;
uniform float uFwT;
uniform float uAmount;
uniform vec3 uFwOrigin;
uniform vec2 uFwDir;
uniform float uPx;
varying vec3 vColor;
varying float vAlpha;
varying float vFog;
vec3 palette(float h){
  if (h < 0.17) return vec3(1.0, 0.45, 0.66);
  if (h < 0.34) return vec3(1.0, 0.8, 0.32);
  if (h < 0.5) return vec3(0.42, 0.95, 0.72);
  if (h < 0.67) return vec3(0.74, 0.56, 1.0);
  if (h < 0.84) return vec3(0.45, 0.76, 1.0);
  return vec3(1.0, 0.52, 0.38);
}
void main(){
  float k = aSeed.x;
  float T = 4.6;
  float t0 = k * 0.68 + 0.5;
  float tt = uFwT - t0;
  float c = floor(tt / T);
  float age = tt - c * T;
  float startT = t0 + c * T;
  float h0 = hash12(vec2(c + 3.7, k * 5.1));
  float on = step(0.0, tt) * uAmount * (startT < 26.0 ? 1.0 : (mod(c + k, 3.0) < 0.5 ? 1.0 : 0.0));
  float h1 = hash12(vec2(c * 1.7 + 0.3, k * 2.9 + 1.0));
  float h2 = hash12(vec2(k * 4.1 + 2.0, c * 0.9 + 7.0));
  float h3 = hash12(vec2(c * 2.3 + k, 5.5));
  float ang = atan(uFwDir.y, uFwDir.x) + (h1 - 0.5) * 1.5;
  float dist = 75.0 + h2 * 40.0;
  vec3 C = uFwOrigin + vec3(cos(ang) * dist, 34.0 + h3 * 20.0, sin(ang) * dist);
  float z = aSeed.y * 2.0 - 1.0;
  float phi = aSeed.z * 6.2832;
  float rr = sqrt(max(0.0, 1.0 - z * z));
  vec3 dir = vec3(rr * cos(phi), z, rr * sin(phi));
  vec3 col = palette(aSeed.w > 0.62 ? fract(h0 + 0.37) : h0);
  vec3 p;
  float a;
  float size;
  float launch = 1.0;
  if (age < launch) {
    float f = age / launch;
    float e = 1.0 - (1.0 - f) * (1.0 - f);
    p = mix(C - vec3(0.0, 32.0, 0.0), C, e) - vec3(0.0, aSeed.w * 3.0, 0.0);
    a = step(aSeed.w, 0.07) * (0.5 + 0.5 * f);
    size = 0.8;
    vColor = vec3(1.0, 0.9, 0.66);
  } else {
    float b = age - launch;
    float spd = 14.0 + 5.0 * aSeed.w;
    p = C + dir * spd * (1.0 - exp(-b * 2.0)) + vec3(0.0, -0.9 * b * b, 0.0);
    float fade = 1.0 - smoothstep(1.3, 3.2, b);
    float flick = 0.65 + 0.35 * sin(uTime * 31.0 + aSeed.w * 50.0);
    a = fade * mix(1.0, flick, smoothstep(0.9, 1.8, b));
    size = mix(1.8, 0.9, smoothstep(0.0, 2.6, b));
    vColor = mix(vec3(1.0, 0.97, 0.9), col, smoothstep(0.0, 0.3, b));
  }
  vAlpha = a * on;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  vFog = fogF(-mv.z) * 0.45;
  gl_PointSize = min(size * uPx / max(-mv.z, 1.0), 64.0) * step(0.01, vAlpha);
  gl_Position = projectionMatrix * mv;
}
`;
  const FW_FS = SH.COMMON + /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vFog;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d);
  vec3 c = vColor * (1.0 + 0.6 * smoothstep(0.22, 0.0, d));
  gl_FragColor = vec4(mix(c, uFogColor, vFog), a * vAlpha);
}
`;

  /* ---------- 小工具 ---------- */
  function sag(a, b, s, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = new THREE.Vector3().lerpVectors(a, b, t);
      p.y -= s * 4 * t * (1 - t);
      out.push(p);
    }
    return out;
  }
  // 沿折线按固定间距取点，返回 {p, f(0~1 的位置), tan}
  function along(pts, spacing, margin) {
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const total = L[L.length - 1], out = [];
    margin = margin || 0;
    for (let d = margin; d <= total - margin + 1e-6; d += spacing) {
      let i = 1;
      while (i < L.length - 1 && L[i] < d) i++;
      const t = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
      const p = new THREE.Vector3().lerpVectors(pts[i - 1], pts[i], t);
      const tan = new THREE.Vector3().subVectors(pts[i], pts[i - 1]).normalize();
      out.push({ p, f: d / total, tan });
    }
    return out;
  }
  function wire(pts, color) {
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.75, fog: false }));
  }
  const ease = (x) => 1 - Math.pow(1 - G.clamp(x, 0, 1), 3);
  const popEase = (x) => {
    x = G.clamp(x, 0, 1);
    return x === 0 ? 0 : 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
  };

  // 花拱门的形状：左柱 → 半圆 → 右柱
  const ARCH = { z: 4.82, r: 1.05, h: 1.55 };
  function archPoint(u) {
    // u: 0 左柱底 → 0.5 顶 → 1 右柱底
    const post = ARCH.h, arc = Math.PI * ARCH.r, half = post + arc / 2, d = u * (2 * half);
    if (d <= post) return { p: new THREE.Vector3(-ARCH.r, d, ARCH.z), n: new THREE.Vector3(-1, 0, 0), o: d / half };
    if (d >= 2 * half - post) {
      const dd = 2 * half - d;
      return { p: new THREE.Vector3(ARCH.r, dd, ARCH.z), n: new THREE.Vector3(1, 0, 0), o: dd / half };
    }
    const a = Math.PI - ((d - post) / arc) * Math.PI;
    const n = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
    return { p: new THREE.Vector3(Math.cos(a) * ARCH.r, ARCH.h + Math.sin(a) * ARCH.r, ARCH.z), n, o: Math.min(d, 2 * half - d) / half };
  }

  P.build = function (scene) {
    const rng = G.rng(521);
    P.group = new THREE.Group();
    P.group.visible = false;
    scene.add(P.group);

    /* 灯串 */
    const bulbs = [];
    const LCOL = [[1.0, 0.86, 0.6], [1.0, 0.78, 0.46], [1.0, 0.62, 0.78], [0.62, 1.0, 0.8], [0.64, 0.82, 1.0], [1.0, 0.9, 0.7]];
    P.wires = [];
    function strand(pts, spacing, o0, o1, sym) {
      for (const s of along(pts, spacing, 0.05)) {
        if (s.p.x > 3.5 && Math.abs(s.p.z) < 0.5) continue; // 别藏进烟囱里
        const order = sym ? o0 + (o1 - o0) * Math.abs(s.p.x) / 4.1 : o0 + (o1 - o0) * s.f;
        bulbs.push({ p: s.p, o: order });
      }
      const w = wire(pts, 0x3a2e2a);
      P.group.add(w);
      P.wires.push(w);
    }
    // 屋檐（前后）：从门口向两边依次亮起
    for (const sz of [1, -1]) {
      const pts = [];
      for (let x = -4.0; x < 4.0 - 1e-6; x += 1.6) pts.push(...sag(new THREE.Vector3(x, 2.6, sz * 3.28), new THREE.Vector3(x + 1.6, 2.6, sz * 3.28), 0.14, 10).slice(pts.length ? 1 : 0));
      strand(pts, 0.2, sz > 0 ? 0.12 : 0.8, sz > 0 ? 0.5 : 1.0, sz > 0);
    }
    // 屋顶两侧的斜边：从屋檐往屋脊亮
    for (const sx of [-1, 1])
      for (const sz of [1, -1]) strand([new THREE.Vector3(sx * 4.08, 2.74, sz * 3.22), new THREE.Vector3(sx * 4.08, 4.9, 0)], 0.22, 0.5, 0.8, false);
    // 拱门上也绕一圈
    const archPts = [];
    for (let i = 0; i <= 60; i++) {
      const a = archPoint(i / 60);
      archPts.push(a.p.clone().addScaledVector(a.n, 0.17).add(new THREE.Vector3(0, 0, 0.1)));
    }
    strand(archPts, 0.24, 0.0, 0.12, false);
    const bp = new Float32Array(bulbs.length * 3), bs = new Float32Array(bulbs.length * 4), bc = new Float32Array(bulbs.length * 3);
    bulbs.forEach((b, i) => {
      bp.set([b.p.x, b.p.y, b.p.z], i * 3);
      bs.set([b.o, 0, rng(), rng()], i * 4);
      const c = LCOL[i % LCOL.length];
      bc.set(c, i * 3);
    });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    lg.setAttribute('aSeed', new THREE.BufferAttribute(bs, 4));
    lg.setAttribute('aCol', new THREE.BufferAttribute(bc, 3));
    P.lights = new THREE.Points(lg, new THREE.ShaderMaterial({
      vertexShader: LIGHTS_VS,
      fragmentShader: LIGHTS_FS,
      uniforms: Object.assign({}, G.U, { uOn: { value: 0 }, uAmt: { value: 0 } }),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    P.lights.frustumCulled = false;
    P.lights.renderOrder = 11;
    P.group.add(P.lights);

    /* 门前的彩旗 */
    const FLAGC = [0xff9eb8, 0xffd86b, 0x8ee0b8, 0xb9a2f2, 0xff8a6b, 0x8ec5ff, 0xfff4ea];
    P.flags = [];
    const swags = [
      sag(new THREE.Vector3(-3.7, 2.56, 3.32), new THREE.Vector3(0, 2.56, 3.32), 0.3, 24),
      sag(new THREE.Vector3(0, 2.56, 3.32), new THREE.Vector3(3.7, 2.56, 3.32), 0.3, 24)
    ];
    swags.forEach((pts) => {
      const w = wire(pts, 0xf3ece2);
      P.group.add(w);
      P.wires.push(w);
      for (const s of along(pts, 0.32, 0.16)) P.flags.push({ p: s.p, ang: Math.atan2(s.tan.y, s.tan.x), o: (s.p.x + 3.7) / 7.4, ph: rng() * 6 });
    });
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute([-0.13, 0, 0, 0.13, 0, 0, 0, -0.32, 0], 3));
    fg.computeVertexNormals();
    P.flagMesh = new THREE.InstancedMesh(fg, G.lambert({ side: THREE.DoubleSide, emissive: 0x2a1a1a }), P.flags.length);
    P.flags.forEach((f, i) => P.flagMesh.setColorAt(i, new THREE.Color(FLAGC[i % FLAGC.length])));
    P.flagMesh.frustumCulled = false;
    P.group.add(P.flagMesh);

    /* 花拱门 */
    P.arch = [];
    const leafN = 46, flowerN = 190;
    for (let i = 0; i < leafN; i++) {
      const a = archPoint((i + rng() * 0.6) / leafN);
      const p = a.p.clone().addScaledVector(a.n, (rng() - 0.3) * 0.08).add(new THREE.Vector3(0, 0, (rng() - 0.5) * 0.18));
      P.arch.push({ p, o: a.o, s: 0.085 + rng() * 0.045, leaf: true, r: new THREE.Euler(rng() * 6, rng() * 6, rng() * 6) });
    }
    for (let i = 0; i < flowerN; i++) {
      const a = archPoint(rng());
      const p = a.p.clone().addScaledVector(a.n, 0.05 + rng() * 0.08).add(new THREE.Vector3(0, 0, (rng() - 0.5) * 0.26));
      P.arch.push({ p, o: a.o, s: 0.06 + rng() * 0.04, leaf: false, r: new THREE.Euler(rng() * 6, rng() * 6, rng() * 6) });
    }
    const leaves = P.arch.filter((x) => x.leaf), flowers = P.arch.filter((x) => !x.leaf);
    P.leafMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), G.lambert({ emissive: 0x0c1a08 }), leaves.length);
    P.flowerMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), G.lambert({ emissive: 0x2a1418 }), flowers.length);
    const AF = [0xff9fbd, 0xfff3ea, 0xffc49a, 0xffe07a, 0xd8b6ff, 0xff7f9a];
    leaves.forEach((x, i) => { x.mesh = P.leafMesh; x.i = i; P.leafMesh.setColorAt(i, new THREE.Color().setHSL(0.27 + rng() * 0.06, 0.45, 0.4 + rng() * 0.12)); });
    flowers.forEach((x, i) => { x.mesh = P.flowerMesh; x.i = i; P.flowerMesh.setColorAt(i, new THREE.Color(AF[i % AF.length])); });
    for (const m of [P.leafMesh, P.flowerMesh]) {
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      P.group.add(m);
    }
    P.archPosts = [{ x: -ARCH.r, z: ARCH.z, r: 0.16, off: true }, { x: ARCH.r, z: ARCH.z, r: 0.16, off: true }];
    G.Colliders.circles.push(...P.archPosts);

    /* 两束气球 */
    const BCOL = [0xff9eb8, 0xff8a6b, 0xffd86b, 0x8ee0b8, 0xb9a2f2, 0x8ec5ff, 0xfff4ea];
    P.balloons = [];
    const bGeo = new THREE.SphereGeometry(0.17, 22, 16);
    bGeo.scale(1, 1.18, 1);
    const kGeo = new THREE.ConeGeometry(0.03, 0.05, 8);
    function bunch(ax, n, side) {
      const anchor = new THREE.Vector3(ax, 0.36, 4.0);
      for (let i = 0; i < n; i++) {
        const c = new THREE.Color(BCOL[(i + (side > 0 ? 0 : 3)) % BCOL.length]);
        const mat = G.patch(new THREE.MeshPhongMaterial({ color: c, shininess: 90, specular: 0x6a6a6a, emissive: c.clone().multiplyScalar(0.14) }));
        const g = new THREE.Group();
        const body = new THREE.Mesh(bGeo, mat);
        const knot = new THREE.Mesh(kGeo, mat);
        knot.position.y = -0.21;
        g.add(body, knot);
        const a = (i / n) * Math.PI * 2 + rng();
        const target = new THREE.Vector3(ax + side * 0.25 + Math.cos(a) * 0.32 * rng(), 2.0 + rng() * 0.9, 4.18 + Math.sin(a) * 0.3 * rng());
        const line = wire([anchor, target], 0xf6f2ec);
        P.group.add(g, line);
        P.balloons.push({ g, line, anchor, target, ph: rng() * 6, d: i * 0.13 + (side > 0 ? 0 : 0.35) });
      }
    }
    bunch(1.34, 7, 1);
    bunch(-1.34, 5, -1);

    /* 门上的花环（跟着门一起转） */
    P.wreath = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 8, 28), G.lambert({ color: 0x4f8a45 }));
    P.wreath.add(ring);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.038, 1), G.lambert({ color: AF[i % AF.length], emissive: 0x1a0c0c }));
      f.position.set(Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0.04);
      P.wreath.add(f);
    }
    P.wreath.position.set(0.5, 1.36, 0.06);
    P.wreath.scale.setScalar(0.001);
    P.wreath.visible = false;
    G.House.door.add(P.wreath);

    /* 烟花 */
    const NB = 7, PER = 160;
    const fgeo = new THREE.BufferGeometry();
    fgeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NB * PER * 3), 3));
    const fs = new Float32Array(NB * PER * 4);
    for (let k = 0; k < NB; k++)
      for (let i = 0; i < PER; i++) fs.set([k, rng(), rng(), rng()], (k * PER + i) * 4);
    fgeo.setAttribute('aSeed', new THREE.BufferAttribute(fs, 4));
    P.fw = new THREE.Points(fgeo, new THREE.ShaderMaterial({
      vertexShader: FW_VS,
      fragmentShader: FW_FS,
      uniforms: Object.assign({}, G.U, {
        uFwT: { value: 0 },
        uAmount: { value: 0 },
        uFwOrigin: { value: new THREE.Vector3() },
        uFwDir: { value: new THREE.Vector2(0, -1) }
      }),
      transparent: true,
      depthWrite: false
    }));
    P.fw.frustumCulled = false;
    P.fw.renderOrder = 8;
    scene.add(P.fw);
    P.built = true;
  };

  // 那一刻：烟花放在对方正前方的天空
  P.trigger = function (origin, forward) {
    const u = P.fw.material.uniforms;
    u.uFwOrigin.value.set(origin.x, G.Field.height(origin.x, origin.z), origin.z);
    const d = new THREE.Vector2(forward.x, forward.z);
    if (d.lengthSq() < 1e-4) d.set(0, -1);
    u.uFwDir.value.copy(d.normalize());
  };

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qa = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const AX = new THREE.Vector3(1, 0, 0), AZ = new THREE.Vector3(0, 0, 1);
  P.update = function (dt, t, o) {
    const amt = o.amt, pT = o.pT;
    P.fw.material.uniforms.uAmount.value = amt;
    P.fw.material.uniforms.uFwT.value = o.fwT;
    // 烟花炸开时配一声远远的“嘭”（时间表和着色器里的一致）
    if (amt > 0.5) {
      P.fwLast = P.fwLast || [];
      for (let k = 0; k < 7; k++) {
        const tt = o.fwT - (k * 0.68 + 0.5);
        if (tt < 0) continue;
        const c = Math.floor(tt / 4.6), age = tt - c * 4.6, id = c * 10 + k;
        if (age >= 1.0 && age < 1.4 && P.fwLast[k] !== id) {
          P.fwLast[k] = id;
          const startT = k * 0.68 + 0.5 + c * 4.6;
          if (startT < 26 || (c + k) % 3 === 0) {
            const inside = G.Player.inHouse(G.Player.x, G.Player.z);
            setTimeout(() => G.Audio.sfx('boom', inside ? 0.35 : 0.8), 260);
          }
        }
      }
    }
    const on = amt > 0.002;
    P.group.visible = on;
    P.wreath.visible = on;
    for (const c of P.archPosts) c.off = amt < 0.3;
    // 窗户的光更暖更亮
    for (const g of G.House.glows) g.material.opacity = g.userData.baseOpacity * (1 + 0.7 * amt);
    if (!on) return;
    const lu = P.lights.material.uniforms;
    lu.uOn.value = G.clamp(pT / 1.9, 0, 1.2);
    lu.uAmt.value = amt;
    for (const w of P.wires) w.material.opacity = 0.75 * amt;
    // 彩旗：从左到右依次挂上，随风轻轻摆
    const wind = Math.sin(t * 1.3) * 0.1;
    P.flags.forEach((f, i) => {
      const k = popEase((pT - 0.5 - f.o * 0.9) / 0.4) * amt;
      qa.setFromAxisAngle(AX, 0.15 + wind + Math.sin(t * 2.3 + f.ph) * 0.12);
      q.setFromAxisAngle(AZ, f.ang).multiply(qa);
      m4.compose(f.p, q, sc.set(k, k, k));
      P.flagMesh.setMatrixAt(i, m4);
    });
    P.flagMesh.instanceMatrix.needsUpdate = true;
    // 花拱门：从两根柱子脚下往上长
    const grow = G.clamp((pT - 0.2) / 1.6, 0, 1.2);
    let dirtyL = false, dirtyF = false;
    for (const x of P.arch) {
      const k = popEase((grow - x.o * 0.9) / 0.22) * amt * x.s;
      q.setFromEuler(x.r);
      m4.compose(x.p, q, sc.set(k, k, k));
      x.mesh.setMatrixAt(x.i, m4);
      if (x.leaf) dirtyL = true;
      else dirtyF = true;
    }
    if (dirtyL) P.leafMesh.instanceMatrix.needsUpdate = true;
    if (dirtyF) P.flowerMesh.instanceMatrix.needsUpdate = true;
    // 气球：从门廊慢慢飘上去，然后轻轻晃
    for (const b of P.balloons) {
      const k = ease((pT - 0.9 - b.d) / 1.4);
      v.lerpVectors(b.anchor, b.target, k);
      v.x += Math.sin(t * 0.9 + b.ph) * 0.06 * k + wind * 0.3 * k;
      v.y += Math.sin(t * 1.3 + b.ph * 2) * 0.05 * k;
      v.z += Math.cos(t * 0.8 + b.ph) * 0.05 * k;
      b.g.position.copy(v);
      b.g.rotation.z = Math.sin(t * 0.9 + b.ph) * 0.12;
      const s = Math.max(0.001, (0.35 + 0.65 * k) * amt * (k > 0 ? 1 : 0));
      b.g.scale.setScalar(s);
      const pa = b.line.geometry.attributes.position;
      pa.setXYZ(1, v.x, v.y - 0.24 * s, v.z);
      pa.needsUpdate = true;
      b.line.visible = k > 0.02;
    }
    // 花环
    const wk = popEase((pT - 0.7) / 0.6) * amt;
    P.wreath.scale.setScalar(Math.max(0.001, wk));
  };

  G.Party = P;
})();
