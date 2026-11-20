/* 草原小屋 · 月中世界：夜里朝月亮走，顺着光点进入月亮。
   月面、地球、月宫小亭、桂花树和留言板、捣药的玉兔、挂在新月上的秋千、回草原的月洞门 */
(function () {
  'use strict';
  const SH = G.SH;
  const M = { on: false, busy: false, C: new THREE.Vector3(3000, 0, 0), R: 56 };
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const C = M.C;
  const L = (x, y, z) => v3(C.x + x, y, C.z + z); // 月面局部坐标 → 世界坐标

  /* ---------- 月面高度 ---------- */
  const CRATERS = [[-18, 14, 5.5, 1.2], [20, 12, 7, 1.5], [-24, -20, 8, 1.6], [26, -22, 4.5, 1.0], [6, 34, 6, 1.3], [-36, 2, 5, 1.1], [34, 30, 4, 0.9]];
  function crater(d, r, depth) {
    if (d > r * 1.6) return 0;
    const inner = d < r ? -depth * (1 - (d / r) * (d / r)) : 0;
    return inner + depth * 0.4 * Math.exp(-Math.pow((d - r) / (0.28 * r), 2));
  }
  function rawH(lx, lz) {
    let h = 0.5 * Math.sin(lx * 0.07 + 1) * Math.sin(lz * 0.06) + 0.25 * Math.sin(lx * 0.13 + lz * 0.11);
    for (const c of CRATERS) h += crater(Math.hypot(lx - c[0], lz - c[1]), c[2], c[3]);
    const d = Math.hypot(lx, lz);
    h *= G.smooth(9, 20, d); // 月宫周围是平地
    h += G.smooth(M.R - 6, M.R + 14, d) * 14; // 远处的环形山
    return h;
  }
  const PLAT = 3.3, PLAT_H = 0.42;
  M.groundAt = function (x, z) {
    const lx = x - C.x, lz = z - C.z;
    if (Math.hypot(lx, lz) < PLAT) return PLAT_H;
    return rawH(lx, lz);
  };

  /* ---------- 天空：深蓝夜空、星星、一颗地球 ---------- */
  const SKY_FS = SH.COMMON + /* glsl */ `
uniform vec3 uEarth;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(vec3(0.07, 0.09, 0.2), vec3(0.01, 0.015, 0.05), pow(clamp(h, 0.0, 1.0), 0.6));
  col = mix(col, vec3(0.1, 0.11, 0.22), smoothstep(0.0, -0.1, h));
  // 星星：按球面经纬度分格，避免被画成一道道竖线
  vec2 sph = vec2(atan(d.z, d.x) * 60.0, asin(clamp(d.y, -1.0, 1.0)) * 60.0);
  vec2 sp = sph;
  float hs = hash12(floor(sp));
  float dd = length(fract(sp) - 0.5);
  col += mix(vec3(0.8, 0.85, 1.0), vec3(1.0, 0.9, 0.78), fract(hs * 9.0)) * step(0.93, hs) * smoothstep(0.16, 0.0, dd) * (0.4 + 0.6 * fract(hs * 17.0)) * (0.55 + 0.45 * sin(uTime * (1.0 + hs * 3.0) + hs * 50.0)) * smoothstep(-0.05, 0.15, h);
  // 地球
  vec3 E = normalize(uEarth);
  float ce = dot(d, E);
  vec3 rt = normalize(cross(E, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, E);
  vec2 q = vec2(dot(d, rt), dot(d, up)) / 0.1;
  float r = length(q);
  if (ce > 0.0) {
    float disc = 1.0 - smoothstep(0.97, 1.0, r);
    vec3 n = normalize(vec3(q, sqrt(max(0.0, 1.0 - r * r))));
    float land = smoothstep(0.52, 0.6, vnoise(q * 2.2 + 3.0) * 0.7 + vnoise(q * 5.0) * 0.3);
    float cloud = smoothstep(0.55, 0.75, vnoise(q * 3.5 + vec2(uTime * 0.01, 0.0)) * 0.6 + vnoise(q * 8.0) * 0.4);
    vec3 surf = mix(vec3(0.12, 0.32, 0.62), mix(vec3(0.3, 0.55, 0.28), vec3(0.62, 0.55, 0.38), vnoise(q * 4.0)), land);
    surf = mix(surf, vec3(0.95), cloud * 0.85);
    float lit = clamp(dot(n, normalize(vec3(0.75, 0.35, 0.55))) * 1.1 + 0.08, 0.0, 1.0);
    vec3 ec = surf * lit + vec3(0.35, 0.55, 1.0) * pow(1.0 - n.z, 3.0) * 0.6 * lit;
    float o = max(r - 1.0, 0.0);
    col += vec3(0.35, 0.55, 1.0) * exp(-o * 9.0) * 0.35 * (1.0 - disc);
    col = mix(col, ec, disc);
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

  /* ---------- 小工具 ---------- */
  const room = (c, e) => {
    const col = new THREE.Color(c);
    return G.lambert({ color: col, emissive: col.clone().multiplyScalar(e === undefined ? 0.18 : e) });
  };
  function mesh(geo, mat, x, y, z, parent) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    (parent || M.group).add(m);
    return m;
  }

  M.build = function (scene, lights, camera) {
    M.scene = scene;
    M.lights = lights;
    M.camera = camera;
    const g = (M.group = new THREE.Group());
    g.visible = false;
    scene.add(g);
    M.cols = { rects: [], circles: [] };
    const rnd = G.rng(9191);

    /* 天空 */
    const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), SH.mat(SH.SKY_VS, SKY_FS, { uEarth: { value: v3(0.2, 0.33, -0.92) } }, { side: THREE.BackSide, depthWrite: false }));
    sky.frustumCulled = false;
    sky.renderOrder = -100;
    g.add(sky);

    /* 月面 */
    const geo = new THREE.PlaneGeometry(200, 200, 150, 150);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = rawH(x, z);
      pos.setY(i, h);
      const n = G.vnoise(x * 0.15, z * 0.15) * 0.6 + G.vnoise(x * 0.6, z * 0.6) * 0.4;
      const c = 0.82 + 0.22 * n - Math.max(0, -h) * 0.08;
      col.set([c * 0.92, c * 0.95, c * 1.05], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, G.lambert({ color: 0x7f88a8, vertexColors: true, emissive: 0x161a32 }));
    ground.position.copy(C);
    g.add(ground);
    // 地上散落的小光点（月尘）
    const dust = new THREE.BufferGeometry(), dp = [];
    for (let i = 0; i < 500; i++) {
      const a = rnd() * 6.283, r = 3 + Math.sqrt(rnd()) * 50;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      dp.push(C.x + x, rawH(x, z) + 0.05, C.z + z);
    }
    dust.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
    const dustP = new THREE.Points(dust, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 0.09, transparent: true, opacity: 0.8, depthWrite: false, fog: false }));
    g.add(dustP);

    /* 月宫小亭 */
    const stone = room(0xe4e2ea, 0.2), red = room(0xb83a34, 0.25), gold = room(0xe8c25a, 0.35), roof = room(0x5a8a98, 0.35);
    const pav = new THREE.Group();
    pav.position.copy(L(0, 0, 0));
    g.add(pav);
    mesh(new THREE.CylinderGeometry(PLAT, PLAT + 0.15, PLAT_H, 40), stone, 0, PLAT_H / 2, 0, pav);
    mesh(new THREE.CylinderGeometry(PLAT + 0.6, PLAT + 0.7, 0.16, 40), stone, 0, 0.08, 0, pav);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = Math.cos(a) * 2.7, z = Math.sin(a) * 2.7;
      mesh(new THREE.CylinderGeometry(0.13, 0.15, 2.6, 12), red, x, PLAT_H + 1.3, z, pav);
      M.cols.circles.push({ x: C.x + x, z: C.z + z, r: 0.2 });
    }
    mesh(new THREE.TorusGeometry(2.75, 0.09, 8, 48).rotateX(Math.PI / 2), red, 0, PLAT_H + 2.55, 0, pav);
    const rf = mesh(new THREE.ConeGeometry(4.3, 1.5, 8, 1, true), roof, 0, PLAT_H + 3.3, 0, pav);
    rf.material.side = THREE.DoubleSide;
    const eave = mesh(new THREE.ConeGeometry(4.55, 0.35, 8, 1, true), roof, 0, PLAT_H + 2.6, 0, pav);
    eave.scale.y = -1;
    mesh(new THREE.TorusGeometry(4.4, 0.06, 6, 8).rotateX(Math.PI / 2), gold, 0, PLAT_H + 2.58, 0, pav).rotation.y = Math.PI / 8;
    // 八个翘起的檐角
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const tip = mesh(new THREE.ConeGeometry(0.1, 0.55, 6), gold, Math.cos(a) * 4.45, PLAT_H + 2.75, Math.sin(a) * 4.45, pav);
      tip.rotation.set(0, -a, -0.9);
      tip.rotation.order = 'YZX';
    }
    mesh(new THREE.SphereGeometry(0.22, 14, 10), gold, 0, PLAT_H + 4.15, 0, pav);
    mesh(new THREE.ConeGeometry(0.12, 0.6, 10), gold, 0, PLAT_H + 4.5, 0, pav);
    // 石桌石凳
    mesh(new THREE.CylinderGeometry(0.6, 0.45, 0.75, 20), stone, 0, PLAT_H + 0.38, 0, pav);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.42, 14), stone, Math.cos(a) * 1.15, PLAT_H + 0.21, Math.sin(a) * 1.15, pav);
    }
    M.cols.circles.push({ x: C.x, z: C.z, r: 0.75 });
    // 灯笼
    M.glows = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const lx = Math.cos(a) * 3.7, lz = Math.sin(a) * 3.7;
      const lan = mesh(new THREE.SphereGeometry(0.2, 14, 10), room(0xe8402e, 0.75), lx, PLAT_H + 2.05, lz, pav);
      lan.scale.y = 1.25;
      mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.45, 4), gold, lx, PLAT_H + 2.45, lz, pav);
      mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 10), gold, lx, PLAT_H + 2.31, lz, pav);
      const gl = G.glow(0xff8a50, 1.6, 0.55);
      gl.position.set(lx, PLAT_H + 2.05, lz);
      pav.add(gl);
      M.glows.push(gl);
    }

    /* 桂花树 */
    const tx = -7.5, tz = -2.5, ty = rawH(tx, tz) * 0;
    const bark = room(0x6a4a3a, 0.12);
    const trunk = mesh(new THREE.CylinderGeometry(0.22, 0.38, 3.0, 10), bark, C.x + tx, ty + 1.5, C.z + tz);
    trunk.rotation.z = 0.05;
    for (let i = 0; i < 4; i++) {
      const b = mesh(new THREE.CylinderGeometry(0.06, 0.13, 1.6, 6), bark, C.x + tx, ty + 2.6, C.z + tz);
      b.rotation.set(0.8, (i / 4) * 6.28 + 0.4, 0, 'YXZ');
      b.translateY(0.7);
    }
    const leaf = room(0x2f5a3a, 0.22);
    const blobs = [[0, 3.9, 0, 1.9], [1.4, 3.4, 0.4, 1.3], [-1.3, 3.5, -0.3, 1.35], [0.3, 3.3, 1.3, 1.25], [-0.4, 3.4, -1.3, 1.25], [0.2, 4.9, 0.1, 1.2]];
    const flowers = [];
    for (const b of blobs) {
      const s = mesh(new THREE.IcosahedronGeometry(b[3], 2), leaf, C.x + tx + b[0], ty + b[2] * 0 + b[1], C.z + tz + b[2]);
      s.scale.y = 0.85;
      for (let k = 0; k < 40; k++) {
        const u = rnd() * 2 - 1, a = rnd() * 6.283, r = Math.sqrt(1 - u * u);
        flowers.push(v3(C.x + tx + b[0] + Math.cos(a) * r * b[3] * 1.02, ty + b[1] + u * b[3] * 0.87, C.z + tz + b[2] + Math.sin(a) * r * b[3] * 1.02));
      }
    }
    const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), room(0xffc84a, 0.7), flowers.length);
    const m4 = new THREE.Matrix4();
    flowers.forEach((p, i) => {
      m4.makeTranslation(p.x, p.y, p.z);
      fl.setMatrixAt(i, m4);
    });
    g.add(fl);
    const tg = G.glow(0xffd27a, 9, 0.12);
    tg.position.set(C.x + tx, ty + 3.9, C.z + tz);
    g.add(tg);
    M.cols.circles.push({ x: C.x + tx, z: C.z + tz, r: 0.5 });
    // 飘落的桂花
    const pn = 70, pg = new THREE.BufferGeometry();
    M.petals = { n: pn, p: new Float32Array(pn * 3), v: [], ox: C.x + tx, oz: C.z + tz };
    for (let i = 0; i < pn; i++) {
      M.petals.v.push({ y: rnd() * 5, a: rnd() * 6.283, r: rnd() * 3, s: 0.25 + rnd() * 0.3, ph: rnd() * 6 });
    }
    pg.setAttribute('position', new THREE.BufferAttribute(M.petals.p, 3));
    M.petals.pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffd060, size: 0.08, transparent: true, opacity: 0.95, depthWrite: false, fog: false }));
    M.petals.pts.frustumCulled = false;
    g.add(M.petals.pts);

    /* 树下的留言板 */
    const bx = -5.2, bz = 0.6, by = 0;
    const board = new THREE.Group();
    board.position.set(C.x + bx, by, C.z + bz);
    board.rotation.y = 0.9;
    const wood = room(0x8a5a3a, 0.2);
    mesh(new THREE.BoxGeometry(0.08, 1.7, 0.08), wood, -0.62, 0.85, 0, board);
    mesh(new THREE.BoxGeometry(0.08, 1.7, 0.08), wood, 0.62, 0.85, 0, board);
    mesh(new THREE.BoxGeometry(1.4, 0.9, 0.06), wood, 0, 1.15, 0, board);
    mesh(new THREE.BoxGeometry(1.55, 0.08, 0.14), room(0x5a3a28, 0.15), 0, 1.66, 0, board);
    const noteCols = [0xfff2cc, 0xffd6e0, 0xd8f0ff, 0xe6ffd8, 0xfff8ec];
    for (let i = 0; i < 9; i++) {
      const n = mesh(new THREE.PlaneGeometry(0.26, 0.2), room(noteCols[i % 5], 0.45), -0.48 + (i % 4) * 0.32 + (rnd() - 0.5) * 0.05, 0.92 + Math.floor(i / 4) * 0.25 + (rnd() - 0.5) * 0.04, 0.035, board);
      n.rotation.z = (rnd() - 0.5) * 0.2;
    }
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({
      map: G.tex(G.canvas(256, 80, (x) => {
        x.fillStyle = 'rgba(255,248,236,0.95)';
        x.fillRect(8, 8, 240, 64);
        x.strokeStyle = '#c8a050';
        x.lineWidth = 4;
        x.strokeRect(8, 8, 240, 64);
        x.fillStyle = '#6a3a22';
        x.font = '700 38px "PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText('留言板', 128, 42);
      })), transparent: true, depthWrite: false, fog: false
    }));
    sign.scale.set(0.7, 0.22, 1);
    sign.position.set(0, 1.95, 0);
    board.add(sign);
    g.add(board);
    M.cols.circles.push({ x: C.x + bx, z: C.z + bz, r: 0.6 });
    G.Tap.add(G.Tap.proxy(board, 0.75, 0, 1.15, 0), 5, () => G.UI.board(), { hint: L(bx, 2.35, bz), hintDist: 7, enabled: () => M.on });

    /* 玉兔和药臼 */
    const rb = new THREE.Group();
    const white = room(0xf6f4f2, 0.3), pinkM = room(0xffb0c0, 0.3), eye = room(0xd02a3a, 0.6);
    const body = mesh(new THREE.SphereGeometry(0.26, 18, 14), white, 0, 0.27, 0, rb);
    body.scale.set(0.9, 1, 1.1);
    const head = new THREE.Group();
    head.position.set(0, 0.6, 0.12);
    rb.add(head);
    mesh(new THREE.SphereGeometry(0.17, 18, 14), white, 0, 0, 0, head);
    for (const sx of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(sx * 0.07, 0.12, -0.02);
      ear.rotation.z = -sx * 0.18;
      const eo = mesh(new THREE.SphereGeometry(0.06, 12, 10), white, 0, 0.17, 0, ear);
      eo.scale.set(0.75, 3.0, 0.55);
      const ei = mesh(new THREE.SphereGeometry(0.035, 10, 8), pinkM, 0, 0.17, 0.02, ear);
      ei.scale.set(0.7, 3.4, 0.4);
      head.add(ear);
      mesh(new THREE.SphereGeometry(0.025, 10, 8), eye, sx * 0.075, 0.03, 0.14, head);
      mesh(new THREE.SphereGeometry(0.035, 8, 6), pinkM, sx * 0.09, -0.03, 0.13, head).scale.set(1, 0.6, 0.5);
    }
    mesh(new THREE.SphereGeometry(0.02, 8, 6), pinkM, 0, -0.01, 0.17, head);
    mesh(new THREE.SphereGeometry(0.09, 12, 10), white, 0, 0.18, -0.29, rb);
    const pestle = new THREE.Group();
    pestle.position.set(0, 0.45, 0.25);
    const stick = mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.5, 8), room(0xb88a5a, 0.2), 0, -0.1, 0.12, pestle);
    stick.rotation.x = 0.35;
    rb.add(pestle);
    const mortar = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.28, 18), room(0xd8d4dc, 0.2), 0, 0.14, 0, mortar);
    mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 18), room(0xeee2c8, 0.45), 0, 0.275, 0, mortar);
    M.rabbit = { g: rb, head, pestle, home: L(4.8, 0, 2.2), x: C.x + 4.8, z: C.z + 2.2, t: 0, hop: 0, target: null, next: 6, heading: Math.PI + 0.3 };
    mortar.position.set(C.x + 4.8, 0, C.z + 2.55);
    rb.position.set(M.rabbit.x, 0, M.rabbit.z);
    g.add(rb, mortar);
    M.cols.circles.push({ x: C.x + 4.8, z: C.z + 2.55, r: 0.28 });
    G.Tap.add(G.Tap.proxy(rb, 0.4, 0, 0.45, 0), 4.5, () => {
      const R = M.rabbit;
      R.hop = 1;
      R.happy = 2.5;
      G.Things.emit('heart', v3(R.x, 1.0, R.z), 4, { spread: 0.2, velRand: 0.35, vel: v3(0, 0.35, 0), stagger: 0.25 });
      G.Audio.sfx('squeak');
    }, { hint: (v) => v.set(M.rabbit.x, 1.35, M.rabbit.z), hintDist: 6, enabled: () => M.on });

    /* 新月秋千 */
    const cr = new THREE.Group();
    const moonMat = room(0xfff0c8, 0.85);
    const tor = mesh(new THREE.TorusGeometry(2.6, 0.5, 16, 48, 2.6), moonMat, 0, 0, 0, cr);
    tor.scale.z = 0.5;
    cr.position.copy(L(10, 6.2, -5));
    cr.rotation.set(0, -0.4, Math.PI * 0.5 + 0.35);
    g.add(cr);
    const cg = G.glow(0xfff0c0, 11, 0.3);
    cg.position.copy(cr.position);
    g.add(cg);
    // 吊点：新月下端的尖角
    cr.updateMatrixWorld(true);
    const tip = v3(2.6 * Math.cos(2.6), 2.6 * Math.sin(2.6), 0).applyMatrix4(tor.matrixWorld);
    const sw = (M.swing = { pivot: tip, L: tip.y - 0.65, th: 0, om: 0.4, seated: false });
    const sg = new THREE.Group();
    sg.position.copy(tip);
    const ropeM = room(0xfff6dc, 0.6);
    for (const sx of [-0.28, 0.28]) mesh(new THREE.CylinderGeometry(0.012, 0.012, sw.L, 6), ropeM, sx, -sw.L / 2, 0, sg);
    mesh(new THREE.BoxGeometry(0.66, 0.05, 0.24), room(0xb98a5e, 0.25), 0, -sw.L, 0, sg);
    sg.rotation.order = 'YXZ';
    sg.rotation.y = 0.5;
    g.add(sg);
    sw.g = sg;
    const SWF = v3(Math.sin(0.5), 0, Math.cos(0.5));
    sw.fwd = SWF;
    const seatPos = (v, up) => {
      const r = sw.L - up;
      return v.set(tip.x + SWF.x * Math.sin(sw.th) * r, tip.y - Math.cos(sw.th) * r, tip.z + SWF.z * Math.sin(sw.th) * r);
    };
    G.Tap.add(G.Tap.proxy(sg, 0.5, 0, -sw.L + 0.2, 0), 5, () => {
      if (sw.seated) return;
      sw.seated = true;
      sw.om += 0.6;
      G.Player.sit({
        pos: (v) => seatPos(v, 0.62),
        exit: { x: tip.x - SWF.x * 1.3, z: tip.z - SWF.z * 1.3 },
        onLeave: () => { sw.seated = false; },
        label: '在新月上荡秋千 · 拨动摇杆下来'
      });
      G.Audio.sfx('whoosh');
    }, { hint: (v) => seatPos(v, 0).setY(1.4), hintDist: 8, enabled: () => M.on });

    /* 月洞门：回草原的出口 */
    const gate = new THREE.Group();
    gate.position.copy(L(0, 0, -13));
    const shape = new THREE.Shape();
    shape.moveTo(-3, 0);
    shape.lineTo(3, 0);
    shape.lineTo(3, 3.6);
    shape.lineTo(-3, 3.6);
    shape.lineTo(-3, 0);
    const hole = new THREE.Path();
    hole.absarc(0, 1.75, 1.45, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const wall = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false, curveSegments: 40 }), room(0xf0ece6, 0.25));
    wall.position.z = -0.2;
    gate.add(wall);
    mesh(new THREE.BoxGeometry(6.4, 0.22, 0.6), room(0x3d5a66, 0.15), 0, 3.7, 0, gate);
    const portal = new THREE.Mesh(new THREE.CircleGeometry(1.45, 48), new THREE.ShaderMaterial({
      uniforms: { uTime: G.U.uTime },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uTime; varying vec2 vUv; void main(){ vec2 q = vUv - 0.5; float r = length(q) * 2.0; float a = atan(q.y, q.x); float sw = 0.5 + 0.5 * sin(a * 3.0 - uTime * 1.2 + r * 6.0); vec3 c = mix(vec3(0.55, 0.75, 1.0), vec3(1.0, 0.92, 0.7), sw * (1.0 - r)); float al = (0.35 + 0.45 * (1.0 - r)) * smoothstep(1.0, 0.92, r); gl_FragColor = vec4(c, al); }'
    }));
    portal.position.y = 1.75;
    gate.add(portal);
    const pgl = G.glow(0xcfe0ff, 6, 0.4);
    pgl.position.set(0, 1.75, 0.2);
    gate.add(pgl);
    g.add(gate);
    M.gate = L(0, 0, -13);
    M.cols.rects.push({ x0: C.x - 3, x1: C.x - 1.45, z0: C.z - 13.25, z1: C.z - 12.75 }, { x0: C.x + 1.45, x1: C.x + 3, z0: C.z - 13.25, z1: C.z - 12.75 });

    /* 草原上的引路光点：夜里从小屋后面一直延伸到月亮方向 */
    const sd = G.U.uSunDir.value, dir = new THREE.Vector2(sd.x, sd.z).normalize();
    M.door = new THREE.Vector2(dir.x * 56, dir.y * 56);
    const n = 34, gp = new Float32Array(n * 3), gs = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / n, d = 6 + t * 50, w = Math.sin(t * 9) * 1.6;
      const x = dir.x * d - dir.y * w, z = dir.y * d + dir.x * w;
      gp.set([x, G.Field.height(x, z) + 0.6, z], i * 3);
      gs[i] = t;
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.BufferAttribute(gp, 3));
    gg.setAttribute('aT', new THREE.BufferAttribute(gs, 1));
    M.guide = new THREE.Points(gg, new THREE.ShaderMaterial({
      uniforms: Object.assign({}, G.U, { uAmt: { value: 0 } }),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: SH.COMMON + 'attribute float aT; uniform float uAmt; uniform float uPx; varying float vA; void main(){ vec3 p = position; p.y += sin(uTime * 1.5 + aT * 20.0) * 0.15; vec4 mv = viewMatrix * vec4(p, 1.0); float wave = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(aT * 12.0 - uTime * 2.2), 3.0); vA = uAmt * wave; gl_PointSize = min(0.9 * uPx / max(-mv.z, 0.5), 90.0) * step(0.01, vA); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); vec3 c = mix(vec3(1.0, 0.9, 0.7), vec3(0.75, 0.85, 1.0), d * 2.0); gl_FragColor = vec4(c * (smoothstep(0.5, 0.0, d) * 0.7 + smoothstep(0.12, 0.0, d)) * vA, 1.0); }'
    }));
    M.guide.frustumCulled = false;
    scene.add(M.guide);
    // 光点尽头：一道光柱
    const dy = G.Field.height(M.door.x, M.door.y);
    M.beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 40, 24, 1, true), new THREE.ShaderMaterial({
      uniforms: { uTime: G.U.uTime, uAmt: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uTime; uniform float uAmt; varying vec2 vUv; void main(){ float a = (1.0 - vUv.y) * (1.0 - vUv.y) * (0.75 + 0.25 * sin(vUv.x * 40.0 + uTime * 2.0)); gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a * 0.55 * uAmt, 1.0); }'
    }));
    M.beam.position.set(M.door.x, dy + 20, M.door.y);
    scene.add(M.beam);

    M.earthCols = G.Colliders;
  };

  /* ---------- 进出月亮 ---------- */
  function fade(on) {
    const f = document.getElementById('moonfade');
    f.classList.toggle('on', on);
  }
  // 月亮世界用图层 1：在月亮上时镜头只看图层 1，草原上的东西不会被画出来
  const MOON_LAYER = 1;
  M.layer = (o) => o.traverse((c) => c.layers.enable(MOON_LAYER));
  function swapWorld(toMoon) {
    M.group.visible = toMoon;
    if (toMoon) {
      M.layer(M.group);
      if (G.Cat) M.layer(G.Cat.root);
      for (const o of M.scene.children) if (o.isLight || o.userData.keep) o.layers.enable(MOON_LAYER);
      M.camera.layers.set(MOON_LAYER);
      G.Colliders = M.cols;
    } else {
      M.camera.layers.set(0);
      G.Colliders = M.earthCols;
    }
    M.on = toMoon;
    document.body.classList.toggle('moon', toMoon);
  }
  function placeCat(x, z, heading) {
    const Ct = G.Cat;
    if (!Ct) return;
    Ct.x = x;
    Ct.z = z;
    Ct.y = G.Player.groundAt(x, z);
    Ct.heading = heading;
    Ct.state = 'sit';
    Ct.timer = 6;
    Ct.path = [];
  }
  M.enter = function () {
    if (M.busy || M.on) return;
    M.busy = true;
    fade(true);
    G.Audio.sfx('portal');
    setTimeout(() => {
      swapWorld(true);
      const P = G.Player;
      if (P.seat) P.stand();
      P.x = C.x + 0.4;
      P.z = C.z + 21;
      P.y = M.groundAt(P.x, P.z) + P.eye;
      P.vy = 0;
      P.yaw = 0;
      P.pitch = 0.08;
      placeCat(C.x + 1.6, C.z + 19.5, Math.PI);
      if (G.Cat) G.Cat.spots = [[C.x + 3.8, C.z + 2.8], [C.x + 5.4, C.z + 1.4], [C.x - 4.4, C.z + 0.5], [C.x + 1.5, C.z + 4.2]];
      setTimeout(() => {
        fade(false);
        M.busy = false;
      }, 400);
    }, 1300);
  };
  M.exit = function () {
    if (M.busy || !M.on) return;
    M.busy = true;
    fade(true);
    G.Audio.sfx('portal');
    setTimeout(() => {
      swapWorld(false);
      const P = G.Player, d = M.door;
      if (P.seat) P.stand();
      const back = new THREE.Vector2(-d.x, -d.y).normalize();
      P.x = d.x + back.x * 5;
      P.z = d.y + back.y * 5;
      P.y = G.Field.height(P.x, P.z) + P.eye;
      P.vy = 0;
      P.yaw = Math.atan2(-back.x, -back.y);
      P.pitch = 0;
      placeCat(P.x + back.x * 1.4 + 0.6, P.z + back.y * 1.4, P.yaw + Math.PI);
      if (G.Cat) G.Cat.spots = null;
      M.cool = 4;
      setTimeout(() => {
        fade(false);
        M.busy = false;
      }, 400);
    }, 1300);
  };

  /* ---------- 每帧 ---------- */
  const tmp = v3(), m4u = new THREE.Matrix4();
  M.update = function (dt, t, P) {
    const nk = G.U.uNight.value;
    M.cool = Math.max(0, (M.cool || 0) - dt);
    if (!M.on) {
      // 夜里点亮引路光点；走进光柱就进入月亮
      const amt = G.smooth(0.55, 1, nk);
      M.guide.material.uniforms.uAmt.value = amt;
      M.beam.material.uniforms.uAmt.value = amt;
      M.guide.visible = M.beam.visible = amt > 0.01;
      if (amt > 0.9 && !M.cool && Math.hypot(P.x - M.door.x, P.z - M.door.y) < 2.6) M.enter();
      if (amt > 0.9 && !M.told) {
        M.told = true;
        setTimeout(() => { if (!M.on && !M.busy && G.U.uNight.value > 0.5) G.UI.toast('月亮好像在召唤你……顺着光点朝它走走看'); }, 2500);
      }
      return;
    }
    // 月面上：灯光换成清冷的月色
    const Lg = M.lights;
    Lg.hemi.color.setRGB(0.6, 0.66, 0.9);
    Lg.hemi.groundColor.setRGB(0.32, 0.32, 0.42);
    Lg.sun.color.setRGB(0.85, 0.88, 1.0);
    Lg.fill.color.setRGB(0.4, 0.42, 0.6);
    M.scene.fog.color.setRGB(0.08, 0.09, 0.2);
    for (const gl of M.glows) gl.material.opacity = 0.45 + 0.1 * Math.sin(t * 3 + gl.position.x);
    // 桂花飘落
    const Pt = M.petals;
    Pt.v.forEach((p, i) => {
      p.y -= p.s * dt;
      if (p.y < 0) {
        p.y = 4.5 + Math.random();
        p.a = Math.random() * 6.283;
        p.r = Math.random() * 3.2;
      }
      Pt.p[i * 3] = Pt.ox + Math.cos(p.a) * p.r + Math.sin(t * 0.8 + p.ph) * 0.3;
      Pt.p[i * 3 + 1] = p.y;
      Pt.p[i * 3 + 2] = Pt.oz + Math.sin(p.a) * p.r + Math.cos(t * 0.7 + p.ph) * 0.3;
    });
    Pt.pts.geometry.attributes.position.needsUpdate = true;
    // 玉兔：捣药，偶尔蹦一圈
    const R = M.rabbit;
    R.next -= dt;
    R.happy = Math.max(0, (R.happy || 0) - dt);
    if (!R.target && R.next <= 0) {
      const a = Math.random() * 6.283;
      R.target = [R.home.x + Math.cos(a) * 1.6, R.home.z + Math.sin(a) * 1.6];
      R.back = true;
    }
    let pound = 0;
    if (R.target) {
      const dx = R.target[0] - R.x, dz = R.target[1] - R.z, d = Math.hypot(dx, dz);
      R.heading = Math.atan2(dx, dz);
      if (d < 0.08) {
        if (R.back) {
          R.target = [R.home.x, R.home.z];
          R.back = false;
        } else {
          R.target = null;
          R.next = 8 + Math.random() * 8;
          R.heading = Math.PI + 0.3;
        }
      } else {
        const s = Math.min(d, dt * 1.4);
        R.x += (dx / d) * s;
        R.z += (dz / d) * s;
        R.t += dt * 7;
      }
    } else pound = 1;
    R.hop = Math.max(0, R.hop - dt * 1.4);
    const jump = R.target ? Math.abs(Math.sin(R.t)) * 0.28 : Math.sin(R.hop * Math.PI) * 0.45;
    R.g.position.set(R.x, M.groundAt(R.x, R.z) + jump, R.z);
    R.g.rotation.y = R.heading;
    R.pestle.rotation.x = pound ? -0.6 + Math.abs(Math.sin(t * 4)) * 0.9 : -0.2;
    R.head.rotation.x = pound ? 0.15 + Math.abs(Math.sin(t * 4)) * 0.08 : -0.1;
    R.head.rotation.z = R.happy > 0 ? Math.sin(t * 10) * 0.15 : 0;
    // 新月秋千
    const sw = M.swing;
    let acc = -(9.8 / 6 / sw.L) * Math.sin(sw.th) * 6 - (sw.seated ? 0.03 : 0.12) * sw.om;
    if (sw.seated) {
      const amp = Math.sqrt(sw.th * sw.th + (sw.om * sw.om) / (9.8 / sw.L));
      if (amp < 0.45) acc += Math.sign(sw.om || 1) * 0.4;
    }
    sw.om += acc * dt;
    sw.th += sw.om * dt;
    sw.g.rotation.x = sw.th;
    // 走进月洞门就回草原
    if (!M.busy && Math.abs(P.z - M.gate.z) < 0.6 && Math.abs(P.x - M.gate.x) < 1.2) M.exit();
    // 月亮上的边界
    const dx = P.x - C.x, dz = P.z - C.z, d = Math.hypot(dx, dz);
    if (d > M.R) {
      P.x = C.x + (dx / d) * M.R;
      P.z = C.z + (dz / d) * M.R;
    }
    // 偶尔一声很轻的风铃，月亮上很安静
    M.chimeT = (M.chimeT || 6) - dt;
    if (M.chimeT <= 0) {
      M.chimeT = 10 + Math.random() * 12;
      G.Audio.chime(2, 0.05);
    }
  };

  G.Moon = M;
})();
