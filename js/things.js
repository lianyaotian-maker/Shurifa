/* 草原小屋 · 可以“点一点”的东西：登记表、小粒子（爱心/音符/火苗…）、提示光点，
   以及风铃、秋千、山顶长椅、信箱 */
(function () {
  'use strict';
  const T = { parts: [], hints: [], time: 0 };

  /* ---------- 登记表：点到哪个物体，就执行它的动作 ---------- */
  const Tap = (G.Tap = { list: [] });
  // obj: 用来接收点击的物体（可以是看不见的“感应球”）；dist: 最远多远能点到
  Tap.add = function (obj, dist, fn, o) {
    o = o || {};
    const e = { obj, dist, fn, enabled: o.enabled || null, block: !!o.block, hint: o.hint || null, hintDist: o.hintDist || 7, quiet: 0, sprite: null };
    obj.userData.tap = e;
    Tap.list.push(obj);
    if (e.hint) T.hints.push(e);
    return e;
  };
  Tap.proxy = function (parent, r, x, y, z) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial());
    m.visible = false;
    m.position.set(x || 0, y || 0, z || 0);
    parent.add(m);
    return m;
  };

  /* ---------- 小粒子贴图 ---------- */
  function tex(draw) {
    return G.tex(G.canvas(64, 64, draw));
  }
  const TEX = {};
  function makeTextures() {
    TEX.heart = tex((x) => {
      const g = x.createLinearGradient(0, 8, 0, 58);
      g.addColorStop(0, '#ff9dbb');
      g.addColorStop(1, '#ff5f8f');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(32, 56);
      x.bezierCurveTo(4, 36, 6, 10, 22, 10);
      x.bezierCurveTo(28, 10, 32, 15, 32, 20);
      x.bezierCurveTo(32, 15, 36, 10, 42, 10);
      x.bezierCurveTo(58, 10, 60, 36, 32, 56);
      x.fill();
      x.fillStyle = 'rgba(255,255,255,0.55)';
      x.beginPath();
      x.ellipse(21, 22, 5, 3.4, -0.6, 0, Math.PI * 2);
      x.fill();
    });
    TEX.flame = tex((x) => {
      const g = x.createRadialGradient(32, 40, 2, 32, 34, 28);
      g.addColorStop(0, 'rgba(255,250,210,1)');
      g.addColorStop(0.3, 'rgba(255,200,80,0.95)');
      g.addColorStop(0.65, 'rgba(255,110,40,0.6)');
      g.addColorStop(1, 'rgba(255,60,20,0)');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(32, 2);
      x.bezierCurveTo(52, 26, 58, 44, 32, 62);
      x.bezierCurveTo(6, 44, 12, 26, 32, 2);
      x.fill();
    });
    const glyph = (ch, color, font) => tex((x) => {
      x.font = font || '700 46px "PingFang SC","Helvetica Neue",Arial,sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.shadowColor = 'rgba(60,30,40,0.45)';
      x.shadowBlur = 6;
      x.fillStyle = color;
      x.fillText(ch, 32, 34);
    });
    TEX.note = glyph('♪', '#fff3d6');
    TEX.note2 = glyph('♫', '#ffe1ec');
    TEX.z = glyph('z', '#eaf2ff', 'italic 700 44px Georgia,serif');
    TEX.seed = tex((x) => {
      x.strokeStyle = 'rgba(255,255,255,0.9)';
      x.lineWidth = 1.6;
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * 0.3;
        x.beginPath();
        x.moveTo(32, 34);
        x.lineTo(32 + Math.cos(a) * 24, 34 + Math.sin(a) * 24);
        x.stroke();
      }
      x.beginPath();
      x.moveTo(32, 34);
      x.lineTo(32, 56);
      x.stroke();
      x.fillStyle = '#c9b08a';
      x.fillRect(31, 54, 2.4, 6);
    });
    TEX.star = tex((x) => {
      for (const r of [0, Math.PI / 2]) {
        x.save();
        x.translate(32, 32);
        x.rotate(r);
        const g = x.createRadialGradient(0, 0, 0, 0, 0, 30);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.3, 'rgba(255,244,214,0.7)');
        g.addColorStop(1, 'rgba(255,230,180,0)');
        x.fillStyle = g;
        x.scale(1, 0.16);
        x.beginPath();
        x.arc(0, 0, 30, 0, Math.PI * 2);
        x.fill();
        x.restore();
      }
    });
    TEX.puff = G.glowTex;
  }
  const KIND = {
    heart: { add: false, size: 0.15, life: 1.6, grav: 0.55, wind: 0.1 },
    flame: { add: true, size: 0.2, life: 0.7, grav: 0.8, wind: 0 },
    note: { add: false, size: 0.13, life: 2.4, grav: 0.28, wind: 0.05 },
    note2: { add: false, size: 0.13, life: 2.4, grav: 0.28, wind: 0.05 },
    z: { add: false, size: 0.1, life: 2.2, grav: 0.22, wind: 0.02 },
    seed: { add: false, size: 0.09, life: 6, grav: 0.16, wind: 1.0 },
    puff: { add: false, size: 0.3, life: 0.9, grav: 0.1, wind: 0.1 },
    star: { add: true, size: 0.12, life: 0.9, grav: 0.2, wind: 0 }
  };
  // 在 pos 处冒出 n 个小粒子
  T.emit = function (kind, pos, n, o) {
    o = o || {};
    const K = KIND[kind];
    for (let i = 0; i < n; i++) {
      const p = T.parts.find((q) => q.age >= q.life) || T.parts[Math.floor(Math.random() * T.parts.length)];
      const sp = o.spread === undefined ? 0.12 : o.spread;
      p.s.position.set(pos.x + (Math.random() - 0.5) * sp, pos.y + (Math.random() - 0.5) * sp, pos.z + (Math.random() - 0.5) * sp);
      const vr = o.velRand === undefined ? 0.25 : o.velRand;
      p.v.set((Math.random() - 0.5) * vr, (Math.random() - 0.3) * vr, (Math.random() - 0.5) * vr);
      if (o.vel) p.v.add(o.vel);
      p.age = -(o.stagger || 0) * Math.random();
      p.life = K.life * (0.8 + 0.4 * Math.random()) * (o.life || 1);
      p.size = K.size * (o.size || 1) * (0.8 + 0.4 * Math.random());
      p.grav = K.grav;
      p.wind = K.wind;
      p.ph = Math.random() * 6;
      p.s.material.map = TEX[kind];
      p.s.material.blending = K.add ? THREE.AdditiveBlending : THREE.NormalBlending;
      p.s.material.rotation = kind === 'seed' ? (Math.random() - 0.5) * 0.8 : 0;
      p.s.visible = false;
    }
  };

  /* ---------- 小木头材质 ---------- */
  const wood = (c) => G.lambert({ color: c, map: G.House.tex.deck });
  const WIND = () => G.U.uWindDir.value;

  T.build = function (scene) {
    makeTextures();
    T.scene = scene;
    for (let i = 0; i < 90; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.heart, transparent: true, depthWrite: false, fog: false, opacity: 0 }));
      s.visible = false;
      s.renderOrder = 13;
      scene.add(s);
      T.parts.push({ s, v: new THREE.Vector3(), age: 1, life: 0, size: 0.1, grav: 0, wind: 0, ph: 0 });
    }
    buildChime(scene);
    buildSwing(scene);
    buildBench(scene);
    buildMailbox(scene);
    if (T.buildMore) T.buildMore(scene);
    // 给每个可互动的东西配一颗提示用的小光点
    for (const e of T.hints) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.star, transparent: true, depthWrite: false, fog: false, opacity: 0, blending: THREE.AdditiveBlending, color: 0xfff0cc }));
      s.renderOrder = 12;
      s.scale.setScalar(0.24);
      scene.add(s);
      e.sprite = s;
    }
  };

  /* ---------- 风铃 ---------- */
  const chime = { ax: 0, az: 0, vx: 0, vz: 0, next: 8, tubes: [] };
  function buildChime(scene) {
    const g = new THREE.Group();
    g.position.set(-1.25, 2.56, 3.22);
    const w = wood(0xb98a5e), metal = G.lambert({ color: 0xdfe5ee, emissive: 0x30343a });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.016, 18), w);
    top.position.y = -0.05;
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.06, 5), w);
    cord.position.y = -0.02;
    g.add(top, cord);
    for (let i = 0; i < 5; i++) {
      const len = 0.15 + i * 0.028, a = (i / 5) * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, len, 8), metal);
      t.position.set(Math.cos(a) * 0.05, -0.07 - len / 2, Math.sin(a) * 0.05);
      g.add(t);
      chime.tubes.push(t);
    }
    const clap = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.012, 14), w);
    clap.position.y = -0.2;
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.13), G.lambert({ color: 0xfff3dc, side: THREE.DoubleSide, emissive: 0x2a2520 }));
    sail.position.y = -0.36;
    const cord2 = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.26, 5), w);
    cord2.position.y = -0.18;
    g.add(clap, sail, cord2);
    chime.g = g;
    chime.sail = sail;
    scene.add(g);
    Tap.add(Tap.proxy(g, 0.3, 0, -0.2, 0), 7, () => {
      chime.vx += (Math.random() - 0.5) * 5;
      chime.vz += 3 + Math.random() * 2;
      G.Audio.chime(5, 0.2);
    }, { hint: new THREE.Vector3(-1.25, 2.1, 3.3) });
  }
  function updateChime(dt, t, P) {
    const c = chime;
    c.next -= dt;
    if (c.next < 0) {
      // 偶尔一阵风
      c.next = 14 + Math.random() * 22;
      c.vz += 1.2 + Math.random();
      const d = Math.hypot(P.x + 1.25, P.z - 3.2);
      if (d < 13) G.Audio.chime(2, 0.07 * (1 - d / 14));
    }
    const k = 22, damp = 1.1;
    c.vx += (-k * c.ax - damp * c.vx) * dt;
    c.vz += (-k * c.az - damp * c.vz) * dt;
    c.ax += c.vx * dt;
    c.az += c.vz * dt;
    c.g.rotation.x = c.ax * 0.3 + Math.sin(t * 1.1) * 0.02;
    c.g.rotation.z = c.az * 0.3 + Math.sin(t * 0.8 + 1) * 0.02;
    c.sail.rotation.y = Math.sin(t * 2.2) * 0.8 + c.az;
    c.tubes.forEach((tb, i) => { tb.rotation.z = Math.sin(t * 6 + i * 1.7) * 0.02 * Math.min(1, Math.abs(c.vz) + Math.abs(c.vx)); });
  }

  /* ---------- 秋千：远处点是推一把，走近点是坐上去 ---------- */
  const swing = { th: 0, om: 0, L: 2.9, pivot: new THREE.Vector3(7.0, 3.45, -2.7), seated: false, pump: 0 };
  const SW_AXIS = new THREE.Vector3(-0.6, 0, 0.8), SW_FWD = new THREE.Vector3(0.8, 0, 0.6);
  function buildSwing(scene) {
    const s = swing;
    const y0 = G.Field.height(8.4, -4.6);
    // 一根伸出来的粗树枝
    const a = new THREE.Vector3(8.4, y0 + 3.15, -4.6), b = new THREE.Vector3(6.5, 3.62, -2.03);
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.13, a.distanceTo(b), 8), G.Trees.barkMat);
    br.position.copy(a).add(b).multiplyScalar(0.5);
    br.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    const bg = br.geometry;
    bg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(bg.attributes.position.count * 3).fill(1), 3));
    scene.add(br);
    const g = new THREE.Group();
    g.position.copy(s.pivot);
    g.rotation.y = Math.atan2(-0.8, -0.6);
    const rope = G.lambert({ color: 0xd8c7a0 });
    for (const sx of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, s.L, 6), rope);
      r.position.set(sx * 0.25, -s.L / 2, 0);
      g.add(r);
    }
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.045, 0.22), wood(0xb07a4a));
    seat.position.y = -s.L;
    g.add(seat);
    s.g = g;
    scene.add(g);
    Tap.add(Tap.proxy(g, 0.55, 0, -s.L + 0.2, 0), 9, (h) => {
      const P = G.Player;
      if (s.seated) return;
      if (h.distance < 2.8) {
        // 坐上去
        s.seated = true;
        s.om += 0.5;
        P.sit({
          pos: (v) => seatPos(v, 0.62),
          exit: { x: s.pivot.x - SW_FWD.x * 1.1, z: s.pivot.z - SW_FWD.z * 1.1 },
          onLeave: () => { s.seated = false; },
          label: '在荡秋千 · 拨动摇杆下来'
        });
        G.Audio.sfx('whoosh');
      } else {
        // 朝远离自己的方向推一把
        const side = (P.x - s.pivot.x) * SW_FWD.x + (P.z - s.pivot.z) * SW_FWD.z;
        s.om += (side > 0 ? -1 : 1) * 1.1;
        G.Audio.sfx('whoosh');
      }
    }, { hint: new THREE.Vector3(7.0, 1.15, -2.7), hintDist: 9 });
  }
  function seatPos(v, up) {
    const s = swing, c = Math.cos(s.th), sn = Math.sin(s.th), r = s.L - up;
    return v.set(s.pivot.x + SW_FWD.x * sn * r, s.pivot.y - c * r, s.pivot.z + SW_FWD.z * sn * r);
  }
  function updateSwing(dt) {
    const s = swing;
    let acc = -(9.8 / s.L) * Math.sin(s.th) - (s.seated ? 0.05 : 0.22) * s.om;
    // 坐着的时候自己会轻轻荡起来
    if (s.seated) {
      const amp = Math.sqrt(s.th * s.th + (s.om * s.om) / (9.8 / s.L));
      if (amp < 0.42) acc += Math.sign(s.om || 1) * 0.55;
    }
    s.om += acc * dt;
    s.th += s.om * dt;
    s.g.rotation.order = 'YXZ';
    s.g.rotation.x = s.th;
  }

  /* ---------- 山顶的长椅：坐下来看夕阳 ---------- */
  function buildBench(scene) {
    const bx = -31.4, bz = 10.3, by = G.Field.height(bx, bz);
    const f = new THREE.Vector3(G.U.uSunDir.value.x, 0, G.U.uSunDir.value.z).normalize();
    const g = new THREE.Group();
    g.position.set(bx, by, bz);
    g.rotation.y = Math.atan2(f.x, f.z);
    const w = wood(0xa97a50);
    const add = (sx, sy, sz, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), w);
      m.position.set(x, y, z);
      g.add(m);
    };
    add(1.4, 0.06, 0.42, 0, 0.46, 0);
    add(1.4, 0.34, 0.05, 0, 0.84, -0.2);
    for (const sx of [-0.6, 0.6]) {
      add(0.07, 0.46, 0.07, sx, 0.23, 0.15);
      add(0.07, 1.0, 0.07, sx, 0.5, -0.2);
    }
    // 长椅上放着一封信（火漆封口）
    const env = new THREE.Group();
    env.position.set(0.38, 0.493, 0.03);
    env.rotation.y = 0.22;
    const paper = G.lambert({ color: 0xfbf3e2, emissive: 0x3a3428 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.006, 0.17), paper);
    const flap = new THREE.Mesh(new THREE.ConeGeometry(0.104, 0.07, 4, 1), G.lambert({ color: 0xf1e6cf, emissive: 0x2e281e }));
    flap.scale.set(1.18, 0.05, 0.84);
    flap.rotation.y = Math.PI / 4;
    flap.position.set(0, 0.004, -0.03);
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.008, 18), G.lambert({ color: 0xb3262e, emissive: 0x3a0a0c }));
    seal.position.set(0, 0.008, 0.012);
    env.add(body, flap, seal);
    g.add(env);
    T.letterSeal = seal;
    scene.add(g);
    G.Colliders.circles.push({ x: bx, z: bz, r: 0.5 });
    const ep = Tap.add(Tap.proxy(env, 0.17, 0, 0.02, 0), 4.5, () => {
      G.Audio.sfx('paper');
      G.UI.letter();
    }, { hint: (v) => env.getWorldPosition(v).setY(by + 0.85), hintDist: 11 });
    ep.prio = true;
    Tap.add(Tap.proxy(g, 0.62, -0.25, 0.6, 0), 4.5, () => {
      G.Player.sit({
        pos: (v) => v.set(bx + f.x * 0.05, by + 0.46 + 0.68, bz + f.z * 0.05),
        exit: { x: bx + f.x * 1.1, z: bz + f.z * 1.1 },
        yaw: Math.atan2(-f.x, -f.z),
        label: '坐着看夕阳 · 拨动摇杆起身'
      });
    }, { hint: new THREE.Vector3(bx - 0.4, by + 1.25, bz), hintDist: 10 });
  }

  /* ---------- 信箱 ---------- */
  const mail = { open: 0, target: 0, timer: 0 };
  const MAIL_LINES = [
    '信箱：一张火鸡面优惠券，买一送一（仅限本屋）',
    '信箱：空的，但是闻起来有点辣',
    '信箱：里面住着一只小蜗牛，别吵它',
    '信箱：有一封信，上面只写了“记得好好吃饭”'
  ];
  function buildMailbox(scene) {
    const mx = 3.55, mz = 27.4, my = G.Field.height(mx, mz);
    const g = new THREE.Group();
    g.position.set(mx, my, mz);
    g.rotation.y = 0.5;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.08), wood(0x8a6444));
    post.position.y = 0.55;
    const teal = G.lambert({ color: 0x2f6a70 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.4), teal);
    body.position.y = 1.18;
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.4, 14, 1, false, 0, Math.PI), teal);
    roof.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    roof.position.y = 1.26;
    const door = new THREE.Group();
    door.position.set(0, 1.1, 0.2);
    const dm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.02), G.lambert({ color: 0x3b7f86 }));
    dm.position.y = 0.13;
    door.add(dm);
    const flag = new THREE.Group();
    flag.position.set(0.13, 1.16, 0.05);
    const fm = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.18, 0.07), G.lambert({ color: 0xe0443a, emissive: 0x2a0806 }));
    fm.position.y = 0.09;
    flag.add(fm);
    flag.rotation.x = Math.PI / 2;
    const letter = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.22), G.lambert({ color: 0xfff4de, emissive: 0x2a2620 }));
    letter.position.set(0, 1.14, 0.05);
    g.add(post, body, roof, door, flag, letter);
    mail.door = door;
    mail.flag = flag;
    mail.letter = letter;
    scene.add(g);
    G.Colliders.circles.push({ x: mx, z: mz, r: 0.22 });
    let idx = 0;
    Tap.add(Tap.proxy(g, 0.42, 0, 1.15, 0), 6, (h, x, y) => {
      mail.target = 1;
      mail.timer = 5;
      G.Audio.sfx('clank');
      G.UI.pop(MAIL_LINES[idx++ % MAIL_LINES.length], x, y);
    }, { hint: new THREE.Vector3(mx, my + 1.65, mz), hintDist: 9 });
  }
  function updateMail(dt) {
    if (mail.timer > 0 && (mail.timer -= dt) <= 0) mail.target = 0;
    mail.open += (mail.target - mail.open) * Math.min(1, dt * 6);
    mail.door.rotation.x = mail.open * 1.5;
    mail.flag.rotation.x = Math.PI / 2 - mail.open * (Math.PI / 2);
    mail.letter.position.z = 0.05 + mail.open * 0.2;
  }

  /* ---------- 每帧 ---------- */
  const wv = new THREE.Vector3();
  T.update = function (dt, t, ctx) {
    T.time = t;
    const P = G.Player;
    updateChime(dt, t, P);
    updateSwing(dt);
    updateMail(dt);
    if (T.updateMore) T.updateMore(dt, t, ctx);
    // 小粒子
    const w = WIND();
    for (const p of T.parts) {
      if (p.age >= p.life) {
        if (p.s.visible) p.s.visible = false;
        continue;
      }
      p.age += dt;
      if (p.age < 0) continue;
      const k = p.age / p.life;
      p.v.y += p.grav * dt;
      p.s.position.x += (p.v.x + w.x * p.wind + Math.sin(t * 2 + p.ph) * 0.12) * dt;
      p.s.position.y += p.v.y * dt;
      p.s.position.z += (p.v.z + w.y * p.wind + Math.cos(t * 1.7 + p.ph) * 0.12) * dt;
      p.v.multiplyScalar(1 - Math.min(1, dt * 1.2));
      p.s.visible = true;
      p.s.material.opacity = Math.min(1, k * 6) * (1 - G.smooth(0.6, 1, k));
      p.s.scale.setScalar(p.size * (0.6 + 0.6 * Math.min(1, k * 4)));
    }
    // 提示光点：走近了才出现，点过之后安静一会儿
    for (const e of T.hints) {
      const hp = typeof e.hint === 'function' ? e.hint(wv) : e.hint;
      const on = (!e.enabled || e.enabled()) && t > e.quiet && hp;
      let a = 0;
      if (on) {
        const d = Math.hypot(hp.x - P.x, hp.z - P.z);
        a = (1 - G.smooth(e.hintDist * 0.7, e.hintDist, d)) * G.smooth(0.6, 1.4, d);
      }
      const s = e.sprite, m = s.material;
      m.opacity += (a * (0.55 + 0.35 * Math.sin(t * 3 + e.dist)) - m.opacity) * Math.min(1, dt * 4);
      s.visible = m.opacity > 0.02;
      if (s.visible && hp) {
        s.position.set(hp.x, hp.y + Math.sin(t * 1.6 + e.dist) * 0.04, hp.z);
        s.scale.setScalar(0.2 + 0.05 * Math.sin(t * 3 + e.dist));
      }
    }
  };

  T.swing = swing;
  T.wood = wood;
  T.TEX = TEX;
  G.Things = T;
})();
