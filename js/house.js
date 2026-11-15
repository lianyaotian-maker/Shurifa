/* 草原小屋 · 北欧红色小木屋（外观） */
(function () {
  'use strict';
  const FY = 0.35, WH = 2.6, T = 0.15, TOP = FY + WH, RIDGE = 4.75;
  const H = { FY, WH, TOP, RIDGE };

  /* ---------- 画布贴图 ---------- */
  function planks(w, h, base, line, count, vertical, seed) {
    const r = G.rng(seed);
    return G.canvas(w, h, (x) => {
      x.fillStyle = base;
      x.fillRect(0, 0, w, h);
      const n = count, step = (vertical ? w : h) / n;
      for (let i = 0; i < n; i++) {
        const v = (r() - 0.5) * 0.12;
        x.fillStyle = v > 0 ? 'rgba(255,255,255,' + v + ')' : 'rgba(0,0,0,' + -v + ')';
        if (vertical) x.fillRect(i * step, 0, step, h);
        else x.fillRect(0, i * step, w, step);
        // 木纹
        x.strokeStyle = 'rgba(0,0,0,0.05)';
        x.lineWidth = 1;
        for (let k = 0; k < 4; k++) {
          x.beginPath();
          if (vertical) {
            const px = i * step + r() * step;
            x.moveTo(px, 0);
            x.bezierCurveTo(px + 3, h * 0.3, px - 3, h * 0.6, px + 2, h);
          } else {
            const py = i * step + r() * step;
            x.moveTo(0, py);
            x.bezierCurveTo(w * 0.3, py + 2, w * 0.6, py - 2, w, py + 1);
          }
          x.stroke();
        }
        x.fillStyle = line;
        if (vertical) x.fillRect(i * step, 0, 2, h);
        else x.fillRect(0, i * step, w, 2);
        if (!vertical && r() < 0.9) x.fillRect(Math.floor(r() * w), i * step, 2, step);
      }
    });
  }
  function makeTextures() {
    const t = {};
    t.red = G.tex(planks(256, 256, '#ad3b30', 'rgba(70,18,14,0.55)', 8, true, 3), true);
    t.roof = G.tex(G.canvas(256, 256, (x) => {
      const r = G.rng(5);
      x.fillStyle = '#3b3c45';
      x.fillRect(0, 0, 256, 256);
      for (let row = 0; row < 8; row++) {
        const off = row % 2 ? 16 : 0;
        for (let c = -1; c < 9; c++) {
          const v = 50 + Math.floor(r() * 18);
          x.fillStyle = 'rgb(' + v + ',' + (v + 2) + ',' + (v + 10) + ')';
          x.fillRect(c * 32 + off + 1, row * 32 + 1, 30, 29);
          x.fillStyle = 'rgba(0,0,0,0.25)';
          x.fillRect(c * 32 + off + 1, row * 32 + 26, 30, 4);
        }
      }
    }), true);
    t.stone = G.tex(G.canvas(256, 256, (x) => {
      const r = G.rng(9);
      x.fillStyle = '#7d7871';
      x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 70; i++) {
        const v = 120 + Math.floor(r() * 50);
        x.fillStyle = 'rgb(' + v + ',' + (v - 4) + ',' + (v - 10) + ')';
        const w = 30 + r() * 40, h = 20 + r() * 22;
        x.beginPath();
        x.ellipse(r() * 256, r() * 256, w / 2, h / 2, 0, 0, Math.PI * 2);
        x.fill();
      }
    }), true);
    t.deck = G.tex(planks(256, 256, '#9c7553', 'rgba(60,35,20,0.5)', 8, false, 13), true);
    t.brick = G.tex(G.canvas(128, 128, (x) => {
      const r = G.rng(17);
      x.fillStyle = '#b8a594';
      x.fillRect(0, 0, 128, 128);
      for (let row = 0; row < 8; row++) {
        const off = row % 2 ? 16 : 0;
        for (let c = -1; c < 5; c++) {
          const v = r();
          x.fillStyle = 'rgb(' + Math.round(128 + v * 28) + ',' + Math.round(66 + v * 16) + ',' + Math.round(52 + v * 10) + ')';
          x.fillRect(c * 32 + off + 2, row * 16 + 2, 28, 12);
        }
      }
    }), true);
    t.door = G.tex(G.canvas(128, 256, (x) => {
      x.fillStyle = '#2f5e64';
      x.fillRect(0, 0, 128, 256);
      x.strokeStyle = 'rgba(255,255,255,0.16)';
      x.lineWidth = 4;
      x.strokeRect(14, 120, 100, 118);
      x.strokeRect(14, 70, 100, 40);
      // 门上的小窗，透出屋里的暖光
      x.fillStyle = '#ffd497';
      x.fillRect(22, 14, 84, 46);
      x.fillStyle = '#f1ece2';
      x.fillRect(62, 14, 4, 46);
      x.fillRect(22, 35, 84, 4);
      x.strokeStyle = '#f1ece2';
      x.strokeRect(20, 12, 88, 50);
    }));
    // 室内
    t.wallIn = G.tex(planks(256, 256, '#ece2d2', 'rgba(150,120,90,0.35)', 8, false, 21), true);
    t.floor = G.tex(planks(512, 512, '#b5895d', 'rgba(70,40,20,0.55)', 10, false, 33), true);
    t.rug = G.tex(G.canvas(256, 160, (x) => {
      x.fillStyle = '#efe4d0';
      x.fillRect(0, 0, 256, 160);
      const st = [['#b8433a', 18], ['#3f7a78', 40], ['#d9a441', 62], ['#b8433a', 92], ['#3f7a78', 114], ['#d9a441', 136]];
      for (const s of st) {
        x.fillStyle = s[0];
        x.fillRect(10, s[1], 236, 7);
      }
      x.strokeStyle = '#b8433a';
      x.lineWidth = 3;
      x.strokeRect(6, 6, 244, 148);
      for (let i = 12; i < 160; i += 16) {
        x.fillStyle = '#d9c8aa';
        x.fillRect(0, i, 4, 6);
        x.fillRect(252, i, 4, 6);
      }
    }));
    return t;
  }

  /* ---------- 墙体（带门窗洞） ---------- */
  function wall(mg, len, cx, cz, rotY, out, openings) {
    const parent = new THREE.Matrix4().makeRotationY(rotY).setPosition(cx, 0, cz);
    const keyFn = (n) => {
      const d = n.x * out[0] + n.z * out[1];
      return d > 0.7 ? 'ext' : d < -0.7 ? 'int' : 'trim';
    };
    const opts = { parent, uvScale: 1 / 1.6 };
    const piece = (x0, x1, y0, y1) => mg.box(x1 - x0, y1 - y0, T, (x0 + x1) / 2, FY + (y0 + y1) / 2, 0, keyFn, opts);
    const ops = openings.slice().sort((a, b) => a.x0 - b.x0);
    let x = -len / 2;
    for (const o of ops) {
      if (o.x0 > x) piece(x, o.x0, 0, WH);
      if (o.y0 > 0) piece(o.x0, o.x1, 0, o.y0);
      if (o.y1 < WH) piece(o.x0, o.x1, o.y1, WH);
      x = o.x1;
    }
    if (x < len / 2) piece(x, len / 2, 0, WH);
    // 窗框、窗台、十字窗棂、玻璃
    const glows = [];
    for (const o of ops) {
      if (o.door) {
        mg.box(0.12, o.y1 + 0.14, 0.05, o.x0 - 0.06, FY + (o.y1 + 0.14) / 2, T / 2 + 0.025, 'trim', { parent });
        mg.box(0.12, o.y1 + 0.14, 0.05, o.x1 + 0.06, FY + (o.y1 + 0.14) / 2, T / 2 + 0.025, 'trim', { parent });
        mg.box(o.x1 - o.x0 + 0.36, 0.12, 0.06, (o.x0 + o.x1) / 2, FY + o.y1 + 0.08, T / 2 + 0.03, 'trim', { parent });
        continue;
      }
      const w = o.x1 - o.x0, h = o.y1 - o.y0, mx = (o.x0 + o.x1) / 2, my = FY + (o.y0 + o.y1) / 2;
      mg.box(w + 0.26, 0.06, 0.18, mx, FY + o.y0 - 0.03, T / 2 + 0.07, 'trim', { parent });
      mg.box(0.09, h + 0.1, 0.05, o.x0 - 0.045, my, T / 2 + 0.025, 'trim', { parent });
      mg.box(0.09, h + 0.1, 0.05, o.x1 + 0.045, my, T / 2 + 0.025, 'trim', { parent });
      mg.box(w + 0.18, 0.09, 0.05, mx, FY + o.y1 + 0.045, T / 2 + 0.025, 'trim', { parent });
      mg.box(0.045, h, 0.05, mx, my, 0.02, 'trim', { parent });
      mg.box(w, 0.045, 0.05, mx, my + h * 0.1, 0.02, 'trim', { parent });
      const gm = new THREE.Matrix4().makeTranslation(mx, my, 0).premultiply(parent);
      mg.add(new THREE.PlaneGeometry(w, h), gm, 'glass', { uv: 'keep' });
      const wpos = new THREE.Vector3(mx, my, 0.45).applyMatrix4(parent);
      glows.push(wpos);
      if (o.flowers) {
        mg.box(w + 0.1, 0.2, 0.22, mx, FY + o.y0 - 0.17, T / 2 + 0.14, 'deck', { parent, uvScale: 1 });
        const fr = G.rng(Math.floor(mx * 100) + 7);
        const cols = [[0.95, 0.42, 0.5], [1, 0.85, 0.4], [0.98, 0.95, 0.9], [0.8, 0.5, 0.9]];
        for (let i = 0; i < 9; i++) {
          const fx = o.x0 + 0.08 + (w - 0.16) * (i / 8) + (fr() - 0.5) * 0.05;
          const fm = new THREE.Matrix4().makeTranslation(fx, FY + o.y0 - 0.02 + fr() * 0.06, T / 2 + 0.12 + (fr() - 0.5) * 0.08).premultiply(parent);
          mg.add(new THREE.IcosahedronGeometry(0.055 + fr() * 0.02, 0), fm, 'fbox', { color: cols[i % 4] });
          const lm = new THREE.Matrix4().makeTranslation(fx + 0.04, FY + o.y0 - 0.05, T / 2 + 0.16).premultiply(parent);
          mg.add(new THREE.IcosahedronGeometry(0.06, 0), lm, 'fbox', { color: [0.3, 0.55, 0.25] });
        }
      }
    }
    return glows;
  }

  H.build = function (scene) {
    const tx = (H.tex = makeTextures());
    const mats = (H.mats = {
      ext: G.lambert({ map: tx.red }),
      trim: G.lambert({ color: 0xf1ece2 }),
      roof: G.lambert({ map: tx.roof }),
      stone: G.lambert({ map: tx.stone }),
      deck: G.lambert({ map: tx.deck }),
      brick: G.lambert({ map: tx.brick }),
      fbox: G.lambert({ vertexColors: true }),
      glass: G.patch(new THREE.MeshBasicMaterial({ color: 0xffe6bf, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })),
      int: G.SH.room(0xffffff, tx.wallIn),
      intDark: G.SH.room(0x6d4c36, null),
      floor: G.SH.room(0xffffff, tx.floor)
    });
    const mg = new G.Merger();
    const glows = [];
    // 前墙：门 + 两扇带花箱的窗
    glows.push(...wall(mg, 7.2, 0, 2.8 - T / 2, 0, [0, 1], [
      { x0: -0.5, x1: 0.5, y0: 0, y1: 2.1, door: true },
      { x0: -2.7, x1: -1.6, y0: 0.95, y1: 2.0, flowers: true },
      { x0: 1.6, x1: 2.7, y0: 0.95, y1: 2.0, flowers: true }
    ]));
    glows.push(...wall(mg, 7.2, 0, -2.8 + T / 2, Math.PI, [0, -1], []));
    glows.push(...wall(mg, 5.3, -3.6 + T / 2, 0, -Math.PI / 2, [-1, 0], [{ x0: 0.6, x1: 1.6, y0: 0.95, y1: 2.0 }]));
    glows.push(...wall(mg, 5.3, 3.6 - T / 2, 0, Math.PI / 2, [1, 0], [
      { x0: -1.6, x1: -0.5, y0: 0.95, y1: 2.0 },
      { x0: 0.9, x1: 1.9, y0: 0.95, y1: 2.0 }
    ]));
    // 墙角白色包边
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) mg.box(0.22, WH + 0.02, 0.22, sx * 3.58, FY + WH / 2, sz * 2.78, 'trim');
    // 山墙
    const tri = new THREE.Shape();
    tri.moveTo(-2.8, 0);
    tri.lineTo(2.8, 0);
    tri.lineTo(0, RIDGE - TOP);
    const gable = new THREE.ExtrudeGeometry(tri, { depth: T, bevelEnabled: false });
    for (const sx of [-1, 1]) {
      const m = new THREE.Matrix4().makeRotationY(sx * Math.PI / 2).setPosition(sx * (3.6 - T), TOP, 0);
      mg.add(gable, m, (n) => (n.x * sx > 0.7 ? 'ext' : n.x * sx < -0.7 ? 'int' : 'trim'), { uvScale: 1 / 1.6 });
    }
    // 屋顶
    const th = Math.atan((RIDGE - TOP) / 2.8);
    const L = Math.hypot(2.8, RIDGE - TOP) + 0.5;
    H.snowCaps = [];
    for (const sz of [1, -1]) {
      const rot = new THREE.Euler(sz * th, 0, 0);
      const dir = new THREE.Vector3(0, -Math.sin(th), sz * Math.cos(th));
      const nor = new THREE.Vector3(0, Math.cos(th), sz * Math.sin(th));
      const c = new THREE.Vector3(0, RIDGE, 0).addScaledVector(dir, L / 2).addScaledVector(nor, 0.07);
      const m = new THREE.Matrix4().makeRotationFromEuler(rot).setPosition(c);
      mg.add(new THREE.BoxGeometry(8.0, 0.14, L), m, (n) => {
        const d = n.dot(nor);
        return d > 0.7 ? 'roof' : d < -0.7 ? 'int' : 'trim';
      }, { uvScale: 1 / 1.2 });
      // 冬天的屋顶积雪
      const cap = new THREE.Group();
      cap.position.copy(c);
      cap.rotation.copy(rot);
      const sm = new THREE.Mesh(new THREE.BoxGeometry(8.1, 1, L + 0.04), G.lambert({ color: 0xf3f5fb }));
      cap.add(sm);
      cap.visible = false;
      scene.add(cap);
      H.snowCaps.push(sm);
    }
    mg.box(8.0, 0.14, 0.34, 0, RIDGE + 0.1, 0, 'roof');
    // 地基、地板、门廊台阶
    mg.box(7.36, 0.34, 5.76, 0, 0.17 - 0.0, 0, 'stone', { uvScale: 1 / 1.4 });
    mg.box(6.9, 0.04, 5.3, 0, FY - 0.02, 0, (n) => (n.y > 0.7 ? 'floor' : null), { uvScale: 1 / 1.6 });
    mg.box(2.9, 0.1, 1.25, 0, 0.28, 3.42, 'deck', { uvScale: 1 / 1.2 });
    mg.box(1.7, 0.17, 0.38, 0, 0.085, 4.22, 'deck', { uvScale: 1 / 1.2 });
    // 烟囱：砌在右侧山墙外面，从地面一直通到屋脊上方
    mg.box(0.7, 2.4, 0.8, 3.97, 1.2, 0, 'brick', { uvScale: 1 / 0.9 });
    mg.box(0.64, 0.2, 0.7, 3.97, 2.48, 0, 'brick', { uvScale: 1 / 0.9 });
    mg.box(0.56, 3.0, 0.56, 3.97, 4.0, 0, 'brick', { uvScale: 1 / 0.9 });
    mg.box(0.7, 0.08, 0.7, 3.97, 5.54, 0, 'stone');
    // 室内横梁与屋脊梁
    for (const bx of [-2.2, 0, 2.2]) mg.box(0.14, 0.18, 5.3, bx, TOP - 0.05, 0, 'intDark');
    mg.box(6.9, 0.16, 0.16, 0, RIDGE - 0.16, 0, 'intDark');
    const shell = mg.build(mats);
    for (const m of shell.children) if (m.name === 'glass') m.renderOrder = 5;
    scene.add(shell);

    // 门：靠近时自动打开
    H.door = new THREE.Group();
    H.door.position.set(-0.5, FY, 2.8 - T / 2);
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.1, 0.05), [
      mats.trim, mats.trim, mats.trim, mats.trim, G.lambert({ map: tx.door }), G.SH.room(0x2f5e64, null)
    ]);
    doorMesh.position.set(0.5, 1.05, 0);
    H.door.add(doorMesh);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), G.lambert({ color: 0xd8b25a, emissive: 0x3a2a08 }));
    knob.position.set(0.86, 1.0, 0.05);
    H.door.add(knob);
    scene.add(H.door);
    H.doorAngle = 0;

    // 门廊灯
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.14), G.lambert({ color: 0x2a2a2e }));
    lamp.position.set(0.82, FY + 2.05, 2.9);
    scene.add(lamp);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.1), new THREE.MeshBasicMaterial({ color: 0xffd79a }));
    bulb.position.copy(lamp.position);
    bulb.position.z += 0.025;
    scene.add(bulb);
    H.glows = [];
    const g1 = G.glow(0xffc27a, 1.3, 0.75);
    g1.position.set(0.82, FY + 2.05, 3.02);
    const g2 = G.glow(0xffa860, 3.6, 0.22);
    g2.position.copy(g1.position);
    scene.add(g1, g2);
    H.glows.push(g1, g2);
    for (const p of glows) {
      const g = G.glow(0xffb36a, 2.3, 0.28);
      g.position.copy(p);
      scene.add(g);
      H.glows.push(g);
    }
    H.flowerBoxes = shell.children.find((m) => m.name === 'fbox');

    // 碰撞：外墙（门洞留空）
    const R = G.Colliders.rects;
    R.push({ x0: -3.6, x1: -0.5, z0: 2.62, z1: 2.8 }, { x0: 0.5, x1: 3.6, z0: 2.62, z1: 2.8 });
    R.push({ x0: -3.6, x1: 3.6, z0: -2.8, z1: -2.62 });
    R.push({ x0: -3.6, x1: -3.42, z0: -2.8, z1: 2.8 }, { x0: 3.42, x1: 3.6, z0: -2.8, z1: 2.8 });
    R.push({ x0: 3.6, x1: 4.32, z0: -0.4, z1: 0.4 });
  };

  H.update = function (dt, player, snow) {
    // 门
    const dx = player.x, dz = player.z - 2.8;
    const near = dx * dx + dz * dz < 3.2 * 3.2;
    const target = near ? 1.6 : 0;
    H.doorAngle += (target - H.doorAngle) * Math.min(1, dt * 3.2);
    H.door.rotation.y = H.doorAngle;
    // 屋顶积雪
    for (const sm of H.snowCaps) {
      const th = 0.02 + 0.16 * snow;
      sm.parent.visible = snow > 0.04;
      sm.scale.y = th;
      sm.position.y = 0.07 + th / 2;
    }
    if (H.flowerBoxes) H.flowerBoxes.visible = snow < 0.45;
  };

  G.House = H;
})();
