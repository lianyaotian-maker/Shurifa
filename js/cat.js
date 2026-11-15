/* 草原小屋 · 鸡柳：一只橘猫。会走动、打盹、舔毛、迎接你；摸它会喵喵叫、打呼噜、冒爱心 */
(function () {
  'use strict';
  const C = { x: 0.95, z: 3.45, y: 0.33, heading: Math.PI, state: 'sit', timer: 6, phase: 0, combo: 0, lastPet: -99, purrUntil: 0, greetCool: 8, followUntil: 0, path: [], hop: 0, hopV: 0, speed: 0 };
  const S = 1.28; // 比真猫稍大一点，更显眼也更萌
  const SPOTS = [[0.95, 3.45], [-0.5, 3.62], [0.5, 6.4], [0.25, 1.25], [0.9, -0.15], [6.3, -2.0], [-0.3, 9.6]];
  const DOOR_OUT = [0, 3.3], DOOR_IN = [0, 2.05];
  const P = () => G.Player;
  const inHouse = (x, z) => x > -3.45 && x < 3.45 && z > -2.65 && z < 2.65;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pose = { pitch: 0, roll: 0, by: 0, headPitch: 0, headYaw: 0, headDrop: 0, legF: 0, legH: 0, tuck: 0, wrap: 1, lift: 0.3, eyes: 1, ears: 0, pawUp: 0 };
  const target = Object.assign({}, pose);
  const part = {};

  function mat(color, em) {
    const c = new THREE.Color(color);
    const m = G.lambert({ color: c, emissive: c.clone().multiplyScalar(em === undefined ? 0.16 : em) });
    m.userData.base = c.clone();
    return m;
  }
  function sphere(m, r, sx, sy, sz, x, y, z, parent) {
    const g = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), m);
    g.scale.set(sx, sy, sz);
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  }

  C.build = function (scene) {
    const fur = mat(0xf4a64e), dark = mat(0xd97c2c), cream = mat(0xfff1de), pink = mat(0xffa3b4), eye = mat(0x2a1c14, 0.05);
    C.mats = [fur, dark, cream, pink];
    const root = new THREE.Group();
    root.scale.setScalar(S);
    const body = new THREE.Group();
    root.add(body);
    // 身体
    sphere(fur, 1, 0.115, 0.105, 0.19, 0, 0.2, 0, body);
    sphere(cream, 1, 0.082, 0.078, 0.095, 0, 0.165, 0.105, body);
    for (const sz of [-0.09, 0, 0.085]) {
      const st = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.013, 6, 14, Math.PI), dark);
      st.scale.set(1.13, 1.03, 1);
      st.position.set(0, 0.2, sz);
      body.add(st);
    }
    // 头
    const head = new THREE.Group();
    head.position.set(0, 0.3, 0.19);
    body.add(head);
    sphere(fur, 0.105, 1.1, 0.93, 0.95, 0, 0, 0, head);
    sphere(cream, 0.04, 1, 0.85, 0.9, -0.03, -0.038, 0.078, head);
    sphere(cream, 0.04, 1, 0.85, 0.9, 0.03, -0.038, 0.078, head);
    sphere(cream, 0.03, 1, 0.8, 0.8, 0, -0.06, 0.07, head);
    sphere(pink, 0.014, 1.2, 0.8, 0.8, 0, -0.014, 0.106, head);
    for (const st of [[0, 0.085, 0.045, 0.012, 0.05], [-0.03, 0.08, 0.05, 0.01, 0.04], [0.03, 0.08, 0.05, 0.01, 0.04]]) sphere(dark, 1, st[3], 0.008, st[4], st[0], st[1], st[2], head);
    part.eyes = [];
    part.shut = [];
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const sx of [-1, 1]) {
      const e = sphere(eye, 0.022, 1, 1.18, 0.55, sx * 0.046, 0.014, 0.087, head);
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 8, 6), white);
      hl.position.set(0.006, 0.01, 0.014);
      e.add(hl);
      const hl2 = new THREE.Mesh(new THREE.SphereGeometry(0.004, 6, 5), white);
      hl2.position.set(-0.007, -0.007, 0.014);
      e.add(hl2);
      part.eyes.push(e);
      // 眯起来的笑眼
      const s = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0052, 6, 12, Math.PI), eye);
      s.position.set(sx * 0.046, 0.008, 0.094);
      s.visible = false;
      head.add(s);
      part.shut.push(s);
      // 耳朵
      const ear = new THREE.Group();
      ear.position.set(sx * 0.062, 0.078, -0.005);
      ear.rotation.z = -sx * 0.32;
      const eo = new THREE.Mesh(new THREE.ConeGeometry(0.044, 0.08, 12), fur);
      eo.position.y = 0.03;
      const ei = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.055, 10), pink);
      ei.position.set(0, 0.024, 0.014);
      ear.add(eo, ei);
      head.add(ear);
      (part.ears = part.ears || []).push(ear);
      // 胡须
      const wm = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, fog: false });
      for (let i = -1; i <= 1; i++) {
        const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(sx * 0.05, -0.03, 0.085), new THREE.Vector3(sx * 0.13, -0.03 + i * 0.022, 0.07)]);
        head.add(new THREE.Line(g, wm));
      }
    }
    // 项圈和小铃铛
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.011, 8, 18), mat(0xe0443a));
    collar.position.set(0, 0.245, 0.135);
    collar.rotation.x = 1.05;
    const bell = sphere(mat(0xf2c64e, 0.35), 0.017, 1, 1, 1, 0, 0.19, 0.2, body);
    body.add(collar);
    part.collar = [collar, bell];
    // 冬天的小围巾
    const scarf = new THREE.Group();
    const sm = mat(0xd8382e);
    const sr = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.024, 8, 18), sm);
    sr.position.set(0, 0.245, 0.13);
    sr.rotation.x = 1.05;
    const stl = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.11, 0.02), sm);
    stl.position.set(0.05, 0.17, 0.2);
    stl.rotation.z = -0.25;
    scarf.add(sr, stl);
    scarf.visible = false;
    body.add(scarf);
    part.scarf = scarf;
    // 那一天的小尖帽
    const hat = new THREE.Group();
    const hc = new THREE.Mesh(new THREE.ConeGeometry(0.046, 0.12, 14), mat(0xff9eb8, 0.3));
    hc.position.y = 0.06;
    const hb = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.007, 6, 14), mat(0xffe07a, 0.3));
    hb.rotation.x = Math.PI / 2;
    hb.position.y = 0.022;
    const pom = sphere(mat(0xfff4ea, 0.4), 0.017, 1, 1, 1, 0, 0.125, 0, hat);
    hat.add(hc, hb, pom);
    hat.position.set(0.012, 0.088, 0.01);
    hat.rotation.z = -0.12;
    hat.visible = false;
    head.add(hat);
    part.hat = hat;
    // 四条腿（白手套）
    part.legs = [];
    for (const l of [[-0.06, 0.12], [0.06, 0.12], [-0.065, -0.12], [0.065, -0.12]]) {
      const g = new THREE.Group();
      g.position.set(l[0], 0.135, l[1]);
      const up = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.024, 0.11, 10), fur);
      up.position.y = -0.055;
      g.add(up);
      sphere(cream, 0.031, 1, 0.7, 1.15, 0, -0.115, 0.008, g);
      body.add(g);
      part.legs.push(g);
    }
    // 尾巴：一串小球
    part.tail = [];
    for (let i = 0; i < 8; i++) {
      const t = sphere(i >= 6 ? cream : i % 2 ? dark : fur, 0.026 - i * 0.0012, 1, 1, 1, 0, 0.25, -0.18, root);
      part.tail.push(t);
    }
    // 脚下的小影子
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ map: G.glowTex, color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false, fog: false }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.012;
    root.add(sh);
    // 名牌
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({
      map: G.tex(G.canvas(256, 104, (x) => {
        x.fillStyle = 'rgba(255,250,242,0.95)';
        x.strokeStyle = '#f4a64e';
        x.lineWidth = 6;
        const r = 40;
        x.beginPath();
        x.moveTo(12 + r, 12);
        x.arcTo(244, 12, 244, 92, r);
        x.arcTo(244, 92, 12, 92, r);
        x.arcTo(12, 92, 12, 12, r);
        x.arcTo(12, 12, 244, 12, r);
        x.fill();
        x.stroke();
        x.fillStyle = '#f08a3a'; // 小爪印
        x.beginPath();
        x.ellipse(60, 60, 13, 11, 0, 0, Math.PI * 2);
        x.fill();
        for (const p of [[44, 42], [56, 34], [70, 36], [80, 46]]) {
          x.beginPath();
          x.arc(p[0], p[1], 5.5, 0, Math.PI * 2);
          x.fill();
        }
        x.fillStyle = '#6a3a22';
        x.font = '800 50px "PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif';
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText('鸡柳', 158, 54);
      })),
      transparent: true, depthWrite: false, fog: false, opacity: 0
    }));
    tag.scale.set(0.42, 0.17, 1);
    tag.position.set(0, 0.6, 0.08);
    tag.renderOrder = 14;
    root.add(tag);
    part.tag = tag;
    part.root = root;
    part.body = body;
    part.head = head;
    scene.add(root);
    C.pick = G.Tap.proxy(root, 0.3, 0, 0.26, 0.06);
    G.Tap.add(C.pick, 4.2, () => C.pet());
    target.wrap = pose.wrap = 1;
  };

  /* ---------- 行为 ---------- */
  function say(kind, vol) {
    const d = Math.hypot(P().x - C.x, P().z - C.z);
    G.Audio.meow(kind, (vol || 1) * G.clamp(1.25 - d / 9, 0.12, 1));
  }
  const headPos = (v) => part.head.getWorldPosition(v);
  const tmp = new THREE.Vector3();
  function goTo(x, z, then, speed) {
    const fi = inHouse(C.x, C.z), ti = inHouse(x, z);
    C.path = fi === ti ? [[x, z]] : fi ? [DOOR_IN, DOOR_OUT, [x, z]] : [DOOR_OUT, DOOR_IN, [x, z]];
    C.state = 'walk';
    C.then = then || 'sit';
    C.walkSpeed = speed || 1.25;
    C.stuck = 0;
  }
  function settle(state, time) {
    C.state = state;
    C.timer = time;
    C.speed = 0;
  }
  C.pet = function () {
    const t = G.Things.time;
    C.combo = t - C.lastPet < 4.5 ? C.combo + 1 : 1;
    C.lastPet = t;
    C.purrUntil = t + 5;
    C.followUntil = t + 32;
    G.Audio.purr(true, 0.5);
    headPos(tmp);
    tmp.y += 0.12;
    G.Things.emit('heart', tmp, C.combo >= 3 ? 5 : 3, { spread: 0.2, velRand: 0.35, vel: new THREE.Vector3(0, 0.35, 0), stagger: 0.25 });
    G.Audio.sfx('heart', 0.8);
    if (C.combo >= 3) {
      // 摸了好几下：舒服得躺下露肚皮
      settle('flop', 5.5);
      say('long');
    } else {
      settle('pet', 2.6);
      say(C.combo === 1 ? (Math.random() < 0.5 ? 'meow' : 'ask') : 'mew');
    }
  };
  C.feed = function (bowl) {
    C.bowl = bowl;
    goTo(bowl.pos.x + 0.3, bowl.pos.z + 0.16, 'eat', 2.6);
    say('ask');
  };
  // 面从天而降时，屋里的鸡柳会吓一跳
  C.startle = function () {
    if (!inHouse(C.x, C.z) || C.state === 'walk') return;
    C.hopV = 2.4;
    settle('sit', 4);
    setTimeout(() => say('mew'), 350);
  };

  function decide() {
    const r = Math.random();
    if (r < 0.45) {
      let s;
      do s = SPOTS[Math.floor(Math.random() * SPOTS.length)]; while (Math.hypot(s[0] - C.x, s[1] - C.z) < 1);
      goTo(s[0], s[1], Math.random() < 0.35 ? 'nap' : 'sit');
    } else if (r < 0.7) settle('nap', rnd(12, 22));
    else if (r < 0.9) settle('groom', rnd(5, 8));
    else {
      settle('sit', rnd(5, 10));
      if (Math.hypot(P().x - C.x, P().z - C.z) < 9) say('mew', 0.7);
    }
  }

  function collide() {
    const r = 0.17;
    for (const b of G.Colliders.rects) {
      const cx = G.clamp(C.x, b.x0, b.x1), cz = G.clamp(C.z, b.z0, b.z1);
      const dx = C.x - cx, dz = C.z - cz, d = Math.hypot(dx, dz);
      if (d < r && d > 1e-5) {
        C.x = cx + (dx / d) * r;
        C.z = cz + (dz / d) * r;
      }
    }
    for (const c of G.Colliders.circles) {
      if (c.off) continue;
      const dx = C.x - c.x, dz = C.z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
      if (d < m && d > 1e-5) {
        C.x = c.x + (dx / d) * m;
        C.z = c.z + (dz / d) * m;
      }
    }
  }
  function turnTo(a, dt, rate) {
    let d = a - C.heading;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    C.heading += G.clamp(d, -rate * dt, rate * dt);
    return Math.abs(d);
  }
  function stepToward(x, z, speed, dt, stopAt) {
    const dx = x - C.x, dz = z - C.z, d = Math.hypot(dx, dz);
    if (d < (stopAt || 0.12)) return true;
    const off = turnTo(Math.atan2(dx, dz), dt, 7);
    const v = speed * (off > 1.2 ? 0.25 : 1);
    const px = C.x, pz = C.z;
    C.x += Math.sin(C.heading) * v * dt;
    C.z += Math.cos(C.heading) * v * dt;
    collide();
    const moved = Math.hypot(C.x - px, C.z - pz);
    C.speed = moved / Math.max(dt, 1e-4);
    C.phase += moved * 11;
    C.stuck = moved < v * dt * 0.3 ? (C.stuck || 0) + dt : 0;
    return false;
  }

  C.update = function (dt, t, ctx) {
    const pl = P(), dx = pl.x - C.x, dz = pl.z - C.z, dist = Math.hypot(dx, dz);
    const sameSide = inHouse(pl.x, pl.z) === inHouse(C.x, C.z);
    C.greetCool -= dt;
    C.speed *= 0.8;
    // 默认姿势：坐着
    Object.assign(target, { pitch: -0.55, roll: 0, by: -0.035, headPitch: 0.42, headDrop: 0, legF: 0.55, legH: 1.25, tuck: 0, wrap: 1, lift: 0.2, eyes: 1, ears: 0, pawUp: 0 });
    let look = dist < 6 && sameSide;

    switch (C.state) {
      case 'walk': {
        Object.assign(target, { pitch: 0, by: 0, headPitch: 0, legF: 0, legH: 0, wrap: 0, lift: 0.75 });
        const wp = C.path[0];
        if (!wp || stepToward(wp[0], wp[1], C.walkSpeed, dt)) {
          C.path.shift();
          if (!C.path.length) {
            if (C.then === 'eat') settle('eat', 5);
            else if (C.then === 'greet') {
              settle('sit', rnd(6, 9));
              say('ask');
            } else if (C.then === 'follow') settle('sit', 1.2);
            else settle(C.then, C.then === 'nap' ? rnd(12, 20) : rnd(6, 13));
          }
        }
        if (C.stuck > 1.5) settle('sit', 3);
        look = look && dist < 3;
        break;
      }
      case 'nap':
        Object.assign(target, { pitch: 0, by: -0.092, headPitch: 0.5, headDrop: 0.07, legF: 1.3, legH: -1.3, tuck: 1, wrap: 1, lift: 0, eyes: 0 });
        look = false;
        if (dist < 12 && Math.random() < dt * 0.7) {
          headPos(tmp);
          G.Things.emit('z', tmp.setY(tmp.y + 0.1), 1, { spread: 0.05, velRand: 0.08, vel: new THREE.Vector3(0.05, 0.12, 0) });
        }
        break;
      case 'groom': {
        const lick = Math.sin(t * 7);
        Object.assign(target, { headPitch: 0.95 + lick * 0.12, pawUp: 1 });
        target.headYawFix = 0.5;
        look = false;
        break;
      }
      case 'pet':
        Object.assign(target, { headPitch: -0.2, eyes: 0, ears: 0.35, roll: Math.sin(t * 9) * 0.07, lift: 1, wrap: 0 });
        break;
      case 'flop':
        // 肚皮朝着你躺下
        Object.assign(target, { pitch: 0, roll: (dx * Math.cos(C.heading) - dz * Math.sin(C.heading) >= 0 ? 1 : -1) * 1.35, by: -0.085, headPitch: 0.1, legF: -0.5 + Math.sin(t * 5) * 0.25, legH: 0.5 + Math.cos(t * 5) * 0.2, eyes: 0, ears: 0.3, wrap: 0, lift: 0.1 });
        look = false;
        if (Math.random() < dt * 1.2) {
          headPos(tmp);
          G.Things.emit('heart', tmp.setY(tmp.y + 0.15), 1, { spread: 0.15, velRand: 0.2, vel: new THREE.Vector3(0, 0.3, 0) });
        }
        break;
      case 'eat': {
        if (C.bowl) turnTo(Math.atan2(C.bowl.pos.x - C.x, C.bowl.pos.z - C.z), dt, 6);
        Object.assign(target, { pitch: 0.12, by: 0, headPitch: 0.75 + Math.sin(t * 11) * 0.1, headDrop: 0.05, legF: 0, legH: 0, wrap: 0, lift: 0.55 });
        look = false;
        C.crunch = (C.crunch || 0) - dt;
        if (C.crunch <= 0) {
          C.crunch = 0.95;
          G.Audio.sfx('crunch', G.clamp(1.2 - dist / 8, 0.1, 1));
        }
        if (C.bowl) C.bowl.food = Math.max(0, C.bowl.food - dt / 4.8);
        break;
      }
    }

    // 状态切换
    if (C.state !== 'walk') {
      C.timer -= dt;
      const following = t < C.followUntil && C.state === 'sit';
      if (following && dist > 2.4 && dist < 30) {
        // 被摸过之后会跟着你走一会儿
        const k = 1.3 / dist;
        goTo(pl.x - dx * k, pl.z - dz * k, 'follow', dist > 6 ? 3.4 : 2.2);
      } else if (C.state === 'eat' && C.timer <= 0) {
        settle('sit', 5);
        say('long');
        headPos(tmp);
        G.Things.emit('heart', tmp.setY(tmp.y + 0.12), 3, { spread: 0.2, vel: new THREE.Vector3(0, 0.35, 0), stagger: 0.3 });
      } else if ((C.state === 'pet' || C.state === 'flop') && C.timer <= 0) settle('sit', 4);
      else if (C.timer <= 0 && !following) decide();
      else if ((C.state === 'sit' || C.state === 'groom') && C.greetCool <= 0 && sameSide && dist < 7 && dist > 2.2 && pl.enabled) {
        // 看到你来了：小跑过来迎接
        C.greetCool = 45;
        const k = 1.25 / dist;
        goTo(pl.x - dx * k, pl.z - dz * k, 'greet', 2.3);
        say('chirp');
      } else if (C.state === 'nap' && dist < 1.6 && C.timer > 2) C.timer = 2; // 走得很近会把它吵醒
    } else if (C.then === 'follow' && C.path.length === 1) {
      // 跟随时目标随你移动
      const k = 1.3 / Math.max(dist, 0.01);
      C.path[0] = [pl.x - dx * k, pl.z - dz * k];
      if (dist < 1.5) {
        C.path.length = 0;
      }
    }
    if (C.state === 'sit' || C.state === 'pet') if (dist < 6 && sameSide) turnTo(Math.atan2(dx, dz), dt, C.state === 'pet' ? 5 : 2.2);
    if (t > C.purrUntil) G.Audio.purr(false);
    else G.Audio.purr(true, 0.5 * G.clamp(1.3 - dist / 6, 0.05, 1));

    // 在高草里跑的时候一蹦一蹦
    const onGrass = !inHouse(C.x, C.z) && G.Field.pathDist(C.x, C.z) > 1.1 && G.Field.rectDist(C.x, C.z, G.Field.HOUSE) > 0.7 && !(Math.abs(C.x) < 1.5 && C.z > 2.8 && C.z < 4.5);
    const tall = onGrass ? G.clamp(ctx.gH * (1 - ctx.snow) - 0.35, 0, 1) : 0;
    const ground = pl.groundAt(C.x, C.z);
    C.hopV -= 9 * dt;
    C.hop = Math.max(0, C.hop + C.hopV * dt);
    if (C.hop === 0) C.hopV = 0;
    const bound = C.state === 'walk' ? Math.abs(Math.sin(C.phase * 0.35)) * 0.34 * tall : 0;
    C.y += (ground - C.y) * Math.min(1, dt * 14);

    // 姿势平滑过渡
    const k = Math.min(1, dt * 9);
    for (const key in pose) pose[key] += (target[key] - pose[key]) * k;
    const root = part.root, body = part.body, head = part.head;
    root.position.set(C.x, C.y + C.hop + bound, C.z);
    root.rotation.y = C.heading;
    const breathe = 1 + Math.sin(t * (C.state === 'nap' ? 1.6 : 2.6)) * (C.state === 'nap' ? 0.035 : 0.015);
    // 侧躺时绕着身体中心滚，而不是绕着脚底，这样身体不会滑到一边
    body.position.set(0.2 * Math.sin(pose.roll), pose.by + 0.2 * (1 - Math.cos(pose.roll)) + (C.state === 'walk' ? Math.abs(Math.sin(C.phase)) * 0.012 : 0), 0);
    body.rotation.set(pose.pitch, 0, pose.roll);
    body.scale.set(breathe, breathe, 1);
    // 头：看向你
    let hy = 0, hp = pose.headPitch;
    if (look) {
      let a = Math.atan2(dx, dz) - C.heading;
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      hy = G.clamp(a, -1.2, 1.2);
      hp -= G.clamp(Math.atan2(pl.y - (C.y + 0.4), Math.max(dist, 0.3)), 0, 0.9) * 0.75;
    }
    if (C.state === 'groom') hy = 0.55;
    pose.headYaw += (hy - pose.headYaw) * Math.min(1, dt * 6);
    head.rotation.set(hp, pose.headYaw, C.state === 'pet' ? Math.sin(t * 9) * 0.1 : 0, 'YXZ');
    head.position.set(0, 0.3 - pose.headDrop, 0.19);
    // 眨眼 / 眯眼
    const blink = (t * 0.31 + 0.2) % 1 < 0.035 ? 0 : 1;
    const open = pose.eyes > 0.5;
    for (let i = 0; i < 2; i++) {
      part.eyes[i].visible = open;
      part.eyes[i].scale.y = 1.18 * Math.max(0.12, blink);
      part.shut[i].visible = !open;
      part.shut[i].rotation.z = C.state === 'nap' ? Math.PI : 0; // 睡着是向下的弧线，开心是向上的
      part.ears[i].rotation.z = (i ? -1 : 1) * (0.32 + pose.ears) + Math.sin(t * 0.9 + i * 2) * 0.02;
      part.ears[i].rotation.x = Math.max(0, Math.sin(t * 0.43 + i * 1.9) - 0.96) * 6;
    }
    // 腿
    const sw = C.state === 'walk' ? Math.sin(C.phase) * 0.7 * Math.min(1, C.speed) : 0;
    const L = part.legs, ts = 1 - pose.tuck * 0.6;
    L[0].rotation.x = pose.legF + sw - pose.pawUp * 1.5;
    L[1].rotation.x = pose.legF - sw;
    L[2].rotation.x = -pose.legH - sw * 0.9;
    L[3].rotation.x = -pose.legH + sw * 0.9;
    for (const l of L) l.scale.setScalar(ts);
    // 尾巴
    for (let i = 0; i < part.tail.length; i++) {
      const u = i / (part.tail.length - 1);
      const sway = Math.sin(t * (C.state === 'pet' ? 9 : 2.2) - u * 2.4) * (C.state === 'pet' ? 0.02 : 0.05) * u;
      const ux = sway, uy = 0.24 + pose.lift * (0.3 * u - 0.07 * u * u) - (1 - pose.lift) * 0.02 * u, uz = -0.17 - 0.16 * u * (1 - pose.lift * 0.75) + pose.lift * 0.05 * u * u;
      const a = u * 2.1;
      const wx = 0.16 * Math.sin(a) + sway * 0.4, wy = 0.035, wz = -0.17 + 0.15 * (1 - Math.cos(a));
      const w = pose.wrap;
      part.tail[i].position.set(ux + (wx - ux) * w, uy + (wy - uy) * w + pose.by * 0.5, uz + (wz - uz) * w);
    }
    // 名牌、围巾、小帽子
    const tagA = sameSide ? 1 - G.smooth(3.2, 5.2, dist) : 0;
    part.tag.material.opacity += (tagA - part.tag.material.opacity) * Math.min(1, dt * 5);
    part.tag.visible = part.tag.material.opacity > 0.02;
    part.tag.position.y = 0.6 + (C.state === 'nap' || C.state === 'flop' ? -0.14 : 0);
    part.scarf.visible = ctx.snow > 0.45;
    for (const c of part.collar) c.visible = !part.scarf.visible;
    part.hat.visible = ctx.bday > 0.5;
    if (part.hat.visible) part.hat.scale.setScalar(Math.min(1, (ctx.bday - 0.5) * 2.4) * 1.55);
    // 屋里灯光是暖的；在屋外的阴影里毛色会暗一点、偏冷一点，和周围的草地一致
    const indoor = inHouse(C.x, C.z);
    const sh = indoor ? 0.35 : G.Field.shadowAt(C.x, C.z);
    C.shade = (C.shade === undefined ? sh : C.shade + (sh - C.shade) * Math.min(1, dt * 5));
    const k2 = C.shade, warm = indoor ? 0.34 : 0.16;
    for (const m of C.mats) {
      const b = m.userData.base;
      m.color.setRGB(b.r * (1 - 0.36 * k2), b.g * (1 - 0.33 * k2), b.b * (1 - (indoor ? 0.4 : 0.16) * k2));
      m.emissive.copy(b).multiplyScalar(warm);
    }
  };

  G.Cat = C;
})();
