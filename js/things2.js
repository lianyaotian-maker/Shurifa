/* 草原小屋 · 更多可以点的东西：雪人、蒲公英、猫食盆、柴堆和灌木、亲手放飞的孔明灯 */
(function () {
  'use strict';
  const T = G.Things, Tap = G.Tap;
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

  /* ---------- 冬天的雪人 ---------- */
  const snowman = { k: 0, wob: 0 };
  const SNOW_LINES = ['雪人：我也想吃火鸡面，可是我会化掉', '雪人：辣的东西请离我远一点', '雪人：帮我盯着点太阳，谢谢', '雪人：头上这个桶？捡的，还挺暖和'];
  function buildSnowman(scene) {
    const sx = -3.7, sz = 8.4;
    const g = new THREE.Group();
    g.position.set(sx, G.Field.height(sx, sz) - 0.05, sz);
    g.rotation.y = 0.5;
    const snow = G.lambert({ color: 0xf4f6fc, emissive: 0x2a2c36 });
    const ball = (r, y) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), snow);
      m.position.y = y;
      g.add(m);
      return m;
    };
    ball(0.42, 0.36);
    ball(0.3, 0.92);
    ball(0.21, 1.35);
    const coal = G.lambert({ color: 0x2a2a30 });
    for (const ex of [-0.075, 0.075]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), coal);
      e.position.set(ex, 1.4, 0.19);
      g.add(e);
    }
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), coal);
      b.position.set(0, 0.8 + i * 0.13, 0.29 - Math.abs(i - 1) * 0.02);
      g.add(b);
    }
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.2, 10), G.lambert({ color: 0xff8a2e, emissive: 0x331400 }));
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 1.34, 0.3);
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 20), G.lambert({ color: 0xd8382e, emissive: 0x2a0806 }));
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 1.16;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.26, 0.04), scarf.material);
    tail.position.set(0.13, 1.03, 0.19);
    tail.rotation.z = -0.2;
    // 头上顶着一个火鸡面的桶
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.2, 18), G.lambert({ color: 0xd9281f, emissive: 0x2a0604 }));
    cup.position.y = 1.62;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.172, 0.158, 0.06, 18), G.lambert({ color: 0xfff3dc }));
    band.position.y = 1.66;
    const twig = G.lambert({ color: 0x6b4a34 });
    for (const sd of [-1, 1]) {
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.55, 6), twig);
      a.position.set(sd * 0.45, 1.0, 0);
      a.rotation.z = sd * -1.0;
      g.add(a);
    }
    g.add(nose, scarf, tail, cup, band);
    g.scale.setScalar(0.001);
    scene.add(g);
    snowman.g = g;
    snowman.col = { x: sx, z: sz, r: 0.5, off: true };
    G.Colliders.circles.push(snowman.col);
    let idx = 0;
    Tap.add(Tap.proxy(g, 0.6, 0, 0.9, 0), 6, (h, x, y) => {
      snowman.wob = 1;
      G.Audio.sfx('poof');
      T.emit('puff', v3(sx, g.position.y + 1.2, sz), 8, { spread: 0.6, velRand: 0.9 });
      G.UI.pop(SNOW_LINES[idx++ % SNOW_LINES.length], x, y);
    }, { enabled: () => snowman.k > 0.6, hint: v3(sx, g.position.y + 2.0, sz), hintDist: 9 });
  }
  function updateSnowman(dt, t, snow) {
    const s = snowman;
    s.k = G.smooth(0.4, 0.8, snow);
    s.col.off = s.k < 0.5;
    s.g.visible = s.k > 0.01;
    if (!s.g.visible) return;
    s.wob = Math.max(0, s.wob - dt * 1.6);
    const w = Math.sin(s.wob * 18) * s.wob * 0.12;
    s.g.scale.set(s.k * (1 + w), s.k * (1 - w), s.k * (1 + w));
    s.g.rotation.z = Math.sin(s.wob * 14) * s.wob * 0.08;
  }

  /* ---------- 蒲公英：点一下就吹散 ---------- */
  const dandelions = [];
  function buildDandelions(scene) {
    const spots = [[-2.5, 21.6], [3.7, 17.6], [-3.1, 12.4], [2.9, 9.6]];
    const stem = G.lambert({ color: 0x6f9a48 }), fluff = G.lambert({ color: 0xffffff, emissive: 0x77736c });
    const stemGeo = new THREE.CylinderGeometry(0.006, 0.008, 1, 5), headGeo = new THREE.IcosahedronGeometry(0.055, 2);
    stemGeo.translate(0, 0.5, 0);
    const r = G.rng(88), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (const sp of spots) {
      const g = new THREE.Group();
      const gy = G.Field.height(sp[0], sp[1]);
      g.position.set(sp[0], gy, sp[1]);
      const n = 6, stems = new THREE.InstancedMesh(stemGeo, stem, n), heads = new THREE.InstancedMesh(headGeo, fluff, n), hp = [];
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, d = r() * 0.45, h = 0.6 + r() * 0.3;
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        e.set(0, 0, (r() - 0.5) * 0.2);
        m4.compose(v3(x, 0, z), q.setFromEuler(e), v3(1, h, 1));
        stems.setMatrixAt(i, m4);
        hp.push(v3(x, h + 0.02, z));
      }
      stems.frustumCulled = heads.frustumCulled = false;
      heads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      g.add(stems, heads);
      scene.add(g);
      const d = { g, heads, hp, blown: 0, k: 1, full: -1 };
      dandelions.push(d);
      Tap.add(Tap.proxy(g, 0.6, 0, 0.75, 0), 5.5, () => {
        if (d.blown > 0) return;
        d.blown = 40;
        G.Audio.sfx('air');
        for (const p of hp) T.emit('seed', v3(sp[0] + p.x, gy + p.y, sp[1] + p.z), 7, { spread: 0.1, velRand: 0.7, vel: v3(0, 0.35, 0), stagger: 0.4 });
      }, { enabled: () => d.k > 0.7 && d.blown <= 0, hint: v3(sp[0], gy + 1.25, sp[1]), hintDist: 6 });
    }
  }
  const dm = new THREE.Matrix4(), dq = new THREE.Quaternion(), ds = new THREE.Vector3();
  function updateDandelions(dt, snow, gH) {
    const season = (1 - G.smooth(0.15, 0.5, snow)) * G.smooth(0.72, 0.9, gH);
    for (const d of dandelions) {
      d.k = season;
      if (d.blown > 0) d.blown -= dt;
      const full = d.blown > 4 ? 0.12 : d.blown > 0 ? 0.12 + 0.88 * (1 - d.blown / 4) : 1;
      d.g.visible = season > 0.02;
      d.g.scale.setScalar(Math.max(0.001, season));
      if (full !== d.full) {
        d.full = full;
        d.hp.forEach((p, i) => d.heads.setMatrixAt(i, dm.compose(p, dq, ds.set(full, full, full))));
        d.heads.instanceMatrix.needsUpdate = true;
      }
    }
  }

  /* ---------- 猫食盆：点一下添猫粮，鸡柳会跑来吃 ---------- */
  const bowl = { food: 0 };
  function buildBowl(scene) {
    const bx = -1.08, bz = 3.28, by = 0.33;
    const g = new THREE.Group();
    g.position.set(bx, by, bz);
    const pts = [];
    for (let i = 0; i <= 6; i++) pts.push(new THREE.Vector2(0.06 + 0.05 * (i / 6), 0.05 * (i / 6)));
    const dish = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), G.lambert({ color: 0xf2a14a, side: THREE.DoubleSide, emissive: 0x2a1604 }));
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.07, 0.012, 20), dish.material);
    base.position.y = 0.006;
    const food = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 8), G.lambert({ color: 0x8a5a36 }));
    food.scale.set(1, 0.35, 1);
    food.position.y = 0.03;
    food.visible = false;
    g.add(dish, base, food);
    scene.add(g);
    bowl.foodMesh = food;
    bowl.pos = v3(bx, by, bz);
    Tap.add(Tap.proxy(g, 0.22, 0, 0.06, 0), 5, () => {
      bowl.food = 1;
      G.Audio.sfx('crinkle');
      if (G.Cat) G.Cat.feed(bowl);
    }, { hint: v3(bx, by + 0.42, bz), hintDist: 6 });
  }
  function updateBowl() {
    const f = bowl.foodMesh;
    f.visible = bowl.food > 0.03;
    f.scale.set(1, 0.35 * Math.max(0.05, bowl.food), 1);
  }

  /* ---------- 柴堆和灌木（只是摆设，让屋外更有生活气） ---------- */
  function buildProps(scene) {
    const bark = G.Trees.barkMat;
    const logGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.52, 9);
    logGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(logGeo.attributes.position.count * 3).fill(1), 3));
    const rows = [5, 4, 3];
    rows.forEach((n, row) => {
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(logGeo, bark);
        m.rotation.z = Math.PI / 2;
        m.position.set(3.98, 0.09 + row * 0.155, 0.85 + (i - (n - 1) / 2) * 0.175);
        scene.add(m);
      }
    });
    G.Colliders.rects.push({ x0: 3.7, x1: 4.26, z0: 0.4, z1: 1.3 });
    // 屋前的几丛常绿灌木
    const r = G.rng(31);
    for (const p of [[-3.15, 3.22, 0.44], [3.15, 3.22, 0.46], [-1.95, 3.18, 0.34], [1.95, 3.18, 0.36], [-3.95, 1.2, 0.4]]) {
      const geo = new THREE.IcosahedronGeometry(p[2], 2);
      const pos = geo.attributes.position, nrm = geo.attributes.normal;
      const col = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const k = 1 + (G.hash2(x * 17 + p[0], y * 9 + z * 13) - 0.5) * 0.3;
        pos.setXYZ(i, x * k, y * k * 0.8, z * k);
        const l = Math.hypot(x, y, z) || 1;
        nrm.setXYZ(i, x / l, y / l + 0.25, z / l);
        const c = 0.85 + r() * 0.3;
        col[i * 3] = c * 1.9;
        col[i * 3 + 1] = c * 1.75;
        col[i * 3 + 2] = c * 1.2;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const m = new THREE.Mesh(geo, G.Trees.pineMat);
      m.position.set(p[0], p[2] * 0.55, p[1]);
      scene.add(m);
    }
  }

  /* ---------- 5 月 21 日：门前有三盏可以亲手放飞的孔明灯 ---------- */
  const lanterns = [];
  function buildLanterns(scene) {
    const spots = [[-0.62, 0.17, 4.24], [0.62, 0.17, 4.24], [0.45, 0.02, 6.1]];
    const geo = new THREE.CylinderGeometry(0.2, 0.15, 0.4, 18, 1, true);
    spots.forEach((sp, i) => {
      const mat = G.lambert({ color: 0xffe2b0, emissive: 0x4a2408, side: THREE.DoubleSide });
      const g = new THREE.Group();
      const body = new THREE.Mesh(geo, mat);
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat);
      top.scale.y = 0.45;
      top.position.y = 0.2;
      const glow = G.glow(0xffb060, 1.5, 0);
      g.add(body, top, glow);
      scene.add(g);
      const L = { g, mat, glow, home: v3(sp[0], sp[1] + 0.22, sp[2]), fly: -1, k: 0, ph: i * 2.1 };
      g.position.copy(L.home);
      g.scale.setScalar(0.001);
      lanterns.push(L);
      Tap.add(Tap.proxy(g, 0.28, 0, 0.05, 0), 6, () => {
        if (L.fly >= 0) return;
        L.fly = 0;
        G.Audio.sfx('lantern');
        T.emit('star', L.g.position, 6, { spread: 0.4, velRand: 0.6 });
      }, { enabled: () => L.k > 0.8 && L.fly < 0, hint: (v) => v.copy(L.home).setY(L.home.y + 0.5), hintDist: 7 });
    });
  }
  function updateLanterns(dt, t, ctx) {
    const w = G.U.uWindDir.value;
    lanterns.forEach((L, i) => {
      const appear = G.clamp((ctx.pT - 2.2 - i * 0.3) / 0.6, 0, 1) * ctx.bday;
      L.k = appear;
      L.g.visible = appear > 0.01;
      if (!L.g.visible) {
        L.fly = -1;
        L.g.position.copy(L.home);
        return;
      }
      let lit = 0.25, fade = 1;
      if (L.fly >= 0) {
        L.fly += dt;
        const f = L.fly;
        lit = Math.min(1, 0.25 + f * 1.5);
        const rise = Math.max(0, f - 0.5);
        L.g.position.set(
          L.home.x + w.x * rise * rise * 0.03 + Math.sin(f * 0.7 + L.ph) * 0.3 * Math.min(1, rise),
          L.home.y + 0.5 * rise * rise * 0.35 + (rise > 2.5 ? (rise - 2.5) * 0.45 : 0),
          L.home.z + w.y * rise * rise * 0.03 + Math.cos(f * 0.6 + L.ph) * 0.3 * Math.min(1, rise));
        L.g.rotation.z = Math.sin(f * 0.8 + L.ph) * 0.08;
        fade = 1 - G.smooth(34, 42, f);
        if (f > 42) {
          L.fly = -1;
          L.g.position.copy(L.home);
        }
      }
      L.g.scale.setScalar(Math.max(0.001, appear * fade));
      L.mat.emissive.setRGB(0.3 + 0.75 * lit, 0.14 + 0.42 * lit, 0.03 + 0.12 * lit);
      L.glow.material.opacity = (0.1 + 0.55 * lit) * appear * fade * (0.9 + 0.1 * Math.sin(t * 9 + L.ph));
    });
  }

  T.buildMore = function (scene) {
    buildSnowman(scene);
    buildDandelions(scene);
    buildBowl(scene);
    buildProps(scene);
    buildLanterns(scene);
  };
  T.updateMore = function (dt, t, ctx) {
    updateSnowman(dt, t, ctx.snow);
    updateDandelions(dt, ctx.snow, ctx.gH);
    updateBowl();
    updateLanterns(dt, t, ctx);
  };
  T.bowl = bowl;
})();
