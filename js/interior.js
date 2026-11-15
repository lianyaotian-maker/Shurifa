/* 草原小屋 · 屋里：货架、成山的火鸡面、从天而降的面、餐桌、生日蛋糕 */
(function () {
  'use strict';
  const I = {};
  const PW = 0.19, PH = 0.14, PD = 0.045; // 一包面：宽 19cm、高 14cm、厚 4.5cm
  const PILE = { x: -1.25, z: -0.55, H: 1.25, R: 1.55 };
  const TABLE = { x: 2.35, z: 0.95 };
  const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC","Noto Sans SC",sans-serif';

  /* ---------- 原创包装设计（3 种口味） ---------- */
  const VARIANTS = [
    { bg1: '#e3352b', bg2: '#b3141b', band: '#1c1414', title: '#ffffff', stroke: '#6e0a0e', badge: '超辣', badgeBg: '#141010', f1: '#ff9a2e', f2: '#ffd34d', sub: '香辣火鸡味 · 炒面' },
    { bg1: '#3b2d2d', bg2: '#140f0f', band: '#e3352b', title: '#ff5a2c', stroke: '#000000', badge: '2倍辣', badgeBg: '#e3352b', f1: '#ff4b2b', f2: '#ff9a2e', sub: '双倍辣 · 请谨慎' },
    { bg1: '#f7b8c8', bg2: '#ea8ca7', band: '#7b2140', title: '#ffffff', stroke: '#a3365a', badge: '芝士奶油', badgeBg: '#7b2140', f1: '#ffc861', f2: '#fff0b0', sub: '奶油芝士 · 微辣' }
  ];
  function flame(x, cx, by, fw, fh, c1, c2) {
    const f = (w, h, c) => {
      x.fillStyle = c;
      x.beginPath();
      x.moveTo(cx - w / 2, by);
      x.quadraticCurveTo(cx - w * 0.75, by - h * 0.45, cx - w * 0.1, by - h * 0.7);
      x.quadraticCurveTo(cx - w * 0.05, by - h * 0.85, cx + w * 0.05, by - h);
      x.quadraticCurveTo(cx + w * 0.75, by - h * 0.5, cx + w / 2, by);
      x.closePath();
      x.fill();
    };
    f(fw, fh, c1);
    f(fw * 0.55, fh * 0.6, c2);
  }
  function chick(x, cx, cy, r, v) {
    flame(x, cx - r * 0.1, cy - r * 0.82, r * 0.6, r * 0.75, '#ff4a2a', '#ffb23e'); // 头顶的小火苗
    x.fillStyle = '#ffd84a';
    x.beginPath();
    x.arc(cx, cy, r, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#fff1a8';
    x.beginPath();
    x.ellipse(cx, cy + r * 0.35, r * 0.55, r * 0.45, 0, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#2a1a12';
    x.beginPath();
    x.arc(cx - r * 0.35, cy - r * 0.15, r * 0.1, 0, Math.PI * 2);
    x.arc(cx + r * 0.3, cy - r * 0.15, r * 0.1, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#ff8a3d';
    x.beginPath();
    x.moveTo(cx - r * 0.12, cy + r * 0.02);
    x.lineTo(cx + r * 0.12, cy + r * 0.02);
    x.lineTo(cx, cy + r * 0.22);
    x.fill();
    x.fillStyle = 'rgba(255,90,110,0.7)';
    x.beginPath();
    x.arc(cx - r * 0.55, cy + r * 0.12, r * 0.13, 0, Math.PI * 2);
    x.arc(cx + r * 0.5, cy + r * 0.12, r * 0.13, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#7fd0ff'; // 被辣出的汗
    x.beginPath();
    x.moveTo(cx + r * 0.95, cy - r * 0.55);
    x.quadraticCurveTo(cx + r * 1.12, cy - r * 0.25, cx + r * 0.95, cy - r * 0.2);
    x.quadraticCurveTo(cx + r * 0.8, cy - r * 0.3, cx + r * 0.95, cy - r * 0.55);
    x.fill();
  }
  function chili(x, cx, cy, s, c) {
    x.fillStyle = c;
    x.beginPath();
    x.ellipse(cx, cy, s * 0.28, s * 0.62, -0.5, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#3c8a3a';
    x.fillRect(cx + s * 0.1, cy - s * 0.8, s * 0.14, s * 0.3);
  }
  function packAtlas() {
    const W = 1024, Hh = 1024, RH = Hh / 3, FW = Math.round(RH * (PW / PH));
    const canvas = G.canvas(W, Hh, (x) => {
      VARIANTS.forEach((v, k) => {
        const y0 = (2 - k) * RH, w = FW, h = RH;
        x.save();
        x.beginPath();
        x.rect(0, y0, w, h);
        x.clip();
        x.translate(0, y0);
        const g = x.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, v.bg1);
        g.addColorStop(1, v.bg2);
        x.fillStyle = g;
        x.fillRect(0, 0, w, h);
        x.fillStyle = 'rgba(255,255,255,0.07)'; // 放射光
        for (let i = 0; i < 14; i++) {
          x.beginPath();
          x.moveTo(w * 0.36, h * 0.5);
          const a = (i / 14) * Math.PI * 2;
          x.lineTo(w * 0.36 + Math.cos(a) * w, h * 0.5 + Math.sin(a) * w);
          x.lineTo(w * 0.36 + Math.cos(a + 0.12) * w, h * 0.5 + Math.sin(a + 0.12) * w);
          x.fill();
        }
        for (let i = 0; i < 9; i++) flame(x, w * (0.02 + i * 0.12), h * 0.86, w * 0.16, h * (0.2 + 0.12 * Math.abs(Math.sin(i * 1.7))), v.f1, v.f2);
        x.fillStyle = v.band;
        x.fillRect(0, h * 0.84, w, h * 0.16);
        x.fillStyle = k === 2 ? '#ffe3ea' : '#ffffff';
        x.font = '600 ' + Math.round(h * 0.075) + 'px ' + FONT;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText(v.sub, w * 0.5, h * 0.92);
        x.font = '700 ' + Math.round(h * 0.055) + 'px ' + FONT;
        x.fillStyle = 'rgba(255,255,255,0.85)';
        x.fillText('SPICY  FIRE  NOODLE', w * 0.36, h * 0.24);
        x.save();
        x.translate(w * 0.36, h * 0.47);
        x.rotate(-0.06);
        x.font = '900 ' + Math.round(h * 0.27) + 'px ' + FONT;
        x.lineJoin = 'round';
        x.lineWidth = h * 0.045;
        x.strokeStyle = v.stroke;
        x.strokeText('火鸡面', 0, 0);
        x.fillStyle = v.title;
        x.fillText('火鸡面', 0, 0);
        x.restore();
        // 角标
        x.fillStyle = v.badgeBg;
        const bw = h * (v.badge.length > 2 ? 0.36 : 0.24);
        x.beginPath();
        x.ellipse(h * 0.17, h * 0.13, bw / 2 + 4, h * 0.075, 0, 0, Math.PI * 2);
        x.fill();
        x.fillStyle = '#fff';
        x.font = '800 ' + Math.round(h * 0.07) + 'px ' + FONT;
        x.fillText(v.badge, h * 0.17, h * 0.135);
        // 辣度
        for (let i = 0; i < 5; i++) chili(x, w * 0.66 + i * h * 0.075, h * 0.12, h * 0.07, i < (k === 2 ? 2 : 5) ? '#ff2d2d' : 'rgba(255,255,255,0.35)');
        chick(x, w * 0.83, h * 0.56, h * 0.15, v);
        x.restore();
        // 侧边
        x.fillStyle = v.bg2;
        x.fillRect(FW + 16, y0, 64, h);
        x.fillStyle = v.band;
        x.fillRect(FW + 16, y0 + h * 0.84, 64, h * 0.16);
      });
    });
    const t = G.tex(canvas);
    return { tex: t, uFront: FW / W, uSide0: (FW + 20) / W, uSide1: (FW + 76) / W };
  }
  function packGeometry(at) {
    const g = new THREE.BoxGeometry(PW, PH, PD);
    const uv = g.attributes.uv;
    // BoxGeometry 每个面 4 个独立顶点，顺序为 +x -x +y -y +z -z
    for (let f = 0; f < 6; f++) {
      for (let vi = f * 4; vi < f * 4 + 4; vi++) {
        const u = uv.getX(vi);
        if (f >= 4) uv.setX(vi, u * at.uFront);
        else uv.setX(vi, at.uSide0 + (at.uSide1 - at.uSide0) * u);
      }
    }
    g.clearGroups();
    return g;
  }

  /* ---------- 成堆的面 ---------- */
  function mound(x, z) {
    const r = Math.hypot(x - PILE.x, z - PILE.z);
    if (r >= PILE.R) return 0;
    const k = 1 - r / PILE.R;
    return PILE.H * Math.pow(k, 1.15) + 0.07 * Math.sin(x * 7.3) * Math.sin(z * 6.1) * k;
  }
  function moundNormal(x, z) {
    const e = 0.05;
    const dx = (mound(x + e, z) - mound(x - e, z)) / (2 * e), dz = (mound(x, z + e) - mound(x, z - e)) / (2 * e);
    return new THREE.Vector3(-dx, 1, -dz).normalize();
  }

  // 镜子：映出屋里暖暖的灯光和木墙，带一道斜斜的高光
  function mirrorTex() {
    return G.tex(G.canvas(128, 96, (x) => {
      const g = x.createLinearGradient(0, 0, 0, 96);
      g.addColorStop(0, '#8a7a6a');
      g.addColorStop(0.55, '#c8a27a');
      g.addColorStop(1, '#6e5440');
      x.fillStyle = g;
      x.fillRect(0, 0, 128, 96);
      const r = x.createRadialGradient(40, 30, 2, 40, 30, 40);
      r.addColorStop(0, 'rgba(255,230,180,0.9)');
      r.addColorStop(1, 'rgba(255,230,180,0)');
      x.fillStyle = r;
      x.fillRect(0, 0, 128, 96);
      x.fillStyle = 'rgba(255,255,255,0.35)';
      x.beginPath();
      x.moveTo(70, 0); x.lineTo(92, 0); x.lineTo(52, 96); x.lineTo(30, 96);
      x.fill();
      x.fillStyle = 'rgba(255,255,255,0.18)';
      x.beginPath();
      x.moveTo(100, 0); x.lineTo(108, 0); x.lineTo(68, 96); x.lineTo(60, 96);
      x.fill();
    }));
  }

  /* ---------- 小面包：碗里的火鸡面贴图 ---------- */
  function noodleTex() {
    return G.tex(G.canvas(256, 256, (x) => {
      const r = G.rng(5);
      x.fillStyle = '#c9331b';
      x.fillRect(0, 0, 256, 256);
      x.lineCap = 'round';
      for (let i = 0; i < 90; i++) {
        x.strokeStyle = r() < 0.5 ? '#e8662f' : '#f08a44';
        x.lineWidth = 5 + r() * 3;
        x.beginPath();
        let px = r() * 256, py = r() * 256;
        x.moveTo(px, py);
        for (let k = 0; k < 4; k++) {
          const nx = px + (r() - 0.5) * 90, ny = py + (r() - 0.5) * 90;
          x.quadraticCurveTo(px + (r() - 0.5) * 60, py + (r() - 0.5) * 60, nx, ny);
          px = nx;
          py = ny;
        }
        x.stroke();
      }
      for (let i = 0; i < 70; i++) {
        x.fillStyle = '#fff6dc';
        x.beginPath();
        x.ellipse(r() * 256, r() * 256, 3, 1.6, r() * 3, 0, Math.PI * 2);
        x.fill();
      }
      for (let i = 0; i < 14; i++) {
        x.fillStyle = '#1f3a22';
        x.save();
        x.translate(r() * 256, r() * 256);
        x.rotate(r() * 3);
        x.fillRect(-10, -3, 20, 6);
        x.restore();
      }
    }));
  }

  I.build = function (scene) {
    const FY = G.House.FY, SH = G.SH;
    const R = G.Colliders.rects;
    const at = packAtlas();
    I.packTex = at.tex;

    /* 货架 */
    const mg = new G.Merger();
    const slots = []; // {pos, yaw}
    const units = [
      { x: -2.25, z: -2.43, yaw: 0, w: 2.2, cols: 10 },
      { x: 0, z: -2.43, yaw: 0, w: 2.2, cols: 10 },
      { x: 2.25, z: -2.43, yaw: 0, w: 2.2, cols: 10 },
      { x: -3.23, z: -0.8, yaw: Math.PI / 2, w: 2.0, cols: 9 }
    ];
    const LV = [0.08, 0.5, 0.92, 1.34, 1.76, 2.18];
    const rr = G.rng(99);
    for (const u of units) {
      const parent = new THREE.Matrix4().makeRotationY(u.yaw).setPosition(u.x, 0, u.z);
      const o = { parent, uvScale: 1 / 1.2 };
      mg.box(0.04, 2.22, 0.42, -u.w / 2 + 0.02, FY + 1.11, 0, 'shelf', o);
      mg.box(0.04, 2.22, 0.42, u.w / 2 - 0.02, FY + 1.11, 0, 'shelf', o);
      mg.box(u.w, 2.22, 0.02, 0, FY + 1.11, -0.2, 'shelf', o);
      for (const ly of LV) mg.box(u.w, 0.035, 0.42, 0, FY + ly, 0, 'shelf', o);
      for (let l = 0; l < 5; l++) {
        const by = FY + LV[l] + 0.0175;
        for (let c = 0; c < u.cols; c++) {
          const lx = -u.w / 2 + 0.13 + c * ((u.w - 0.26) / (u.cols - 1));
          for (const lz of [0.1, -0.08]) {
            for (let tier = 0; tier < 2; tier++) {
              const p = new THREE.Vector3(lx + (rr() - 0.5) * 0.02, by + PH / 2 + tier * (PH + 0.002), lz).applyMatrix4(parent);
              slots.push({ p, yaw: u.yaw + (rr() - 0.5) * 0.12, lean: -0.05 - rr() * 0.05, v: rr() < 0.62 ? 0 : rr() < 0.55 ? 1 : 2 });
            }
          }
        }
      }
      // 碰撞
      const hw = u.w / 2, hd = 0.22;
      if (u.yaw === 0) R.push({ x0: u.x - hw, x1: u.x + hw, z0: u.z - hd, z1: u.z + hd });
      else R.push({ x0: u.x - hd, x1: u.x + hd, z0: u.z - hw, z1: u.z + hw });
    }

    /* 餐桌、椅子、地毯 */
    const T = TABLE, TY = FY + 0.74;
    mg.box(0.9, 0.05, 1.35, T.x, TY, T.z, 'wood');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) mg.box(0.05, 0.72, 0.05, T.x + sx * 0.38, FY + 0.36, T.z + sz * 0.6, 'wood');
    function chair(cx, cz, yaw) {
      const parent = new THREE.Matrix4().makeRotationY(yaw).setPosition(cx, 0, cz);
      const o = { parent };
      mg.box(0.42, 0.04, 0.42, 0, FY + 0.45, 0, 'wood', o);
      mg.box(0.42, 0.5, 0.04, 0, FY + 0.72, -0.2, 'wood', o);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) mg.box(0.035, 0.45, 0.035, sx * 0.18, FY + 0.225, sz * 0.18, 'wood', o);
    }
    chair(1.58, 1.05, Math.PI / 2);
    chair(2.35, 1.98, Math.PI);
    R.push({ x0: T.x - 0.47, x1: T.x + 0.47, z0: T.z - 0.7, z1: T.z + 0.7 });
    R.push({ x0: 1.36, x1: 1.8, z0: 0.83, z1: 1.27 }, { x0: 2.13, x1: 2.57, z0: 1.76, z1: 2.2 });
    mg.add(new THREE.PlaneGeometry(2.4, 1.5).rotateX(-Math.PI / 2), new THREE.Matrix4().makeTranslation(0.2, FY + 0.004, 1.15), 'rug', { uv: 'keep' });

    /* 吊灯 */
    mg.box(0.015, 1.3, 0.015, 0.3, G.House.RIDGE - 0.9, 0, 'dark');
    const shell = mg.build({
      shelf: SH.room(0xd2aa78, G.House.tex.wallIn),
      wood: SH.room(0xa97c53, G.House.tex.floor),
      rug: SH.room(0xffffff, G.House.tex.rug),
      dark: SH.room(0x2b2b2b, null)
    });
    scene.add(shell);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.2, 24, 1, true), SH.room(0x2f4a3a, null, { side: THREE.DoubleSide }));
    shade.position.set(0.3, 3.08, 0);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff0c8 }));
    bulb.position.set(0.3, 2.98, 0);
    scene.add(shade, bulb);
    G.RU.uLampPos.value.set(0.3, 2.9, 0);
    const lg1 = G.glow(0xffd08a, 0.9, 0.75), lg2 = G.glow(0xffb070, 3.2, 0.14);
    lg1.position.set(0.3, 2.96, 0);
    lg2.position.copy(lg1.position);
    scene.add(lg1, lg2);
    // 吊灯：点一下开关
    I.lamp = { shade, bulb, lg1, lg2, on: true, k: 1 };
    G.Tap.add(G.Tap.proxy(shade, 0.34, 0, -0.08, 0), 6, () => {
      I.lamp.on = !I.lamp.on;
      G.Audio.sfx('tick');
    }, { hint: new THREE.Vector3(0.3, 2.7, 0), hintDist: 4.5 });

    /* 火鸡面：货架 + 面山 + 两批“从天而降” */
    const pileN = 560, rainN = 120;
    const total = slots.length + pileN + rainN * 2;
    const geo = packGeometry(at);
    const variant = new Float32Array(total);
    const mat = SH.room(0xffffff, at.tex, { pack: true });
    const mesh = new THREE.InstancedMesh(geo, mat, total);
    mesh.frustumCulled = false;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    const e = new THREE.Euler();
    slots.forEach((s, i) => {
      e.set(s.lean, s.yaw, 0, 'YXZ');
      q.setFromEuler(e);
      m4.compose(s.p, q, one);
      mesh.setMatrixAt(i, m4);
      variant[i] = s.v;
    });
    const pr = G.rng(2024), Z = new THREE.Vector3(0, 0, 1), up = new THREE.Vector3(0, 1, 0);
    const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
    for (let i = 0; i < pileN; i++) {
      const rad = PILE.R * 0.97 * Math.sqrt(pr()), a = pr() * Math.PI * 2;
      const x = PILE.x + Math.cos(a) * rad, z = PILE.z + Math.sin(a) * rad;
      const n = moundNormal(x, z);
      const y = FY + mound(x, z) - pr() * 0.1;
      qa.setFromUnitVectors(Z, n);
      qb.setFromAxisAngle(n, pr() * Math.PI * 2);
      q.multiplyQuaternions(qb, qa);
      e.set((pr() - 0.5) * 0.5, 0, (pr() - 0.5) * 0.5);
      q.multiply(new THREE.Quaternion().setFromEuler(e));
      m4.compose(new THREE.Vector3(x, y + PD / 2, z).addScaledVector(n, 0.005), q, one);
      mesh.setMatrixAt(slots.length + i, m4);
      variant[slots.length + i] = pr() < 0.6 ? 0 : pr() < 0.5 ? 1 : 2;
    }
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = slots.length + pileN; i < total; i++) {
      mesh.setMatrixAt(i, zero);
      variant[i] = pr() < 0.6 ? 0 : pr() < 0.5 ? 1 : 2;
    }
    geo.setAttribute('aVariant', new THREE.InstancedBufferAttribute(variant, 1));
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);
    I.packs = mesh;
    // 面山下面的红色底子，免得从缝里看到地板
    const prof = [];
    for (let i = 0; i <= 12; i++) {
      const rr2 = PILE.R * 0.93 * (1 - i / 12);
      prof.push(new THREE.Vector2(Math.max(rr2, 0.001), mound(PILE.x + rr2, PILE.z) * 0.92));
    }
    const under = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), SH.room(0x9a2420, null, { side: THREE.DoubleSide }));
    under.position.set(PILE.x, FY, PILE.z);
    scene.add(under);
    G.Colliders.circles.push({ x: PILE.x, z: PILE.z, r: 1.2 });

    // 雨点般落下的面
    I.pools = [0, 1].map((k) => ({ start: slots.length + pileN + k * rainN, n: rainN, t: 0, active: false, items: [], grid: new Float32Array(48 * 36) }));
    I.rainRng = G.rng(5150);

    /* 一碗热乎乎的火鸡面 */
    const bowl = new THREE.Group();
    const bp = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      bp.push(new THREE.Vector2(0.05 + 0.075 * Math.sin(t * Math.PI / 2), 0.075 * t));
    }
    const bowlMesh = new THREE.Mesh(new THREE.LatheGeometry(bp, 28), SH.room(0xf3eadb, null, { side: THREE.DoubleSide }));
    const soup = new THREE.Mesh(new THREE.CircleGeometry(0.118, 28).rotateX(-Math.PI / 2), SH.room(0xffffff, noodleTex()));
    soup.position.y = 0.062;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.124, 0.006, 6, 28).rotateX(Math.PI / 2), SH.room(0x3a6ea5, null));
    rim.position.y = 0.075;
    const chop = SH.room(0x8a5a36, null);
    for (const o of [-0.02, 0.02]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.26), chop);
      c.position.set(o, 0.083, 0.02);
      c.rotation.y = 0.35;
      bowl.add(c);
    }
    bowl.add(bowlMesh, soup, rim);
    bowl.position.set(T.x - 0.05, TY + 0.025, T.z + 0.35);
    G.Tap.add(bowl, 5, (h, x, y) => I.eat(x, y), { hint: new THREE.Vector3(bowl.position.x, bowl.position.y + 0.3, bowl.position.z), hintDist: 4.5 });

    /* 八音盒：放在窗下的小柜子上。胡桃木盒身、黄铜包角，盒盖内侧有镜子，
       丝绒内衬里有带钉的音筒和簧片梳，小鸡站在小舞台上转圈，侧面有发条钥匙 */
    const cab = { x: 3.18, z: -1.4 };
    const cabTop = FY + 0.78;
    const cabM = new G.Merger();
    const cabP = new THREE.Matrix4().makeRotationY(-Math.PI / 2).setPosition(cab.x, 0, cab.z);
    cabM.box(0.62, 0.04, 0.4, 0, cabTop - 0.02, 0, 'wood', { parent: cabP });
    cabM.box(0.58, 0.7, 0.36, 0, FY + 0.39, 0, 'wood', { parent: cabP });
    cabM.box(0.26, 0.28, 0.01, -0.14, FY + 0.5, 0.181, 'cream', { parent: cabP });
    cabM.box(0.26, 0.28, 0.01, 0.14, FY + 0.5, 0.181, 'cream', { parent: cabP });
    for (const sx of [-0.27, 0.27]) for (const sz of [-0.15, 0.15]) cabM.box(0.04, 0.04, 0.04, sx, FY + 0.02, sz, 'wood', { parent: cabP });
    scene.add(cabM.build({ wood: SH.room(0x9a6a44, G.House.tex.floor), cream: SH.room(0xe9dcc4, null) }));
    for (const sx of [-0.04, 0.04]) {
      const kn = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), SH.room(0xd9b25a, null, { emit: 0.2 }));
      kn.position.set(cab.x - 0.19, FY + 0.5, cab.z + sx);
      scene.add(kn);
    }
    G.Colliders.rects.push({ x0: cab.x - 0.21, x1: 3.45, z0: cab.z - 0.32, z1: cab.z + 0.32 });

    const mb = new THREE.Group();
    const walnut = SH.room(0x6b3f26, null), walnutL = SH.room(0x8a5634, null), inlay = SH.room(0xe2c79a, null);
    const brass = SH.room(0xe2b85a, null, { emit: 0.22 }), steel = SH.room(0xc9d2da, null, { emit: 0.18 });
    const velvet = SH.room(0x8e1e2c, null), mirror = SH.room(0xffffff, mirrorTex(), { emit: 0.12 }), dark = SH.room(0x1e1410, null);
    const W = 0.34, D = 0.22, Hb = 0.13; // 宽、深、盒身高
    const box = (m, w, h, d, x, y, z, parent) => {
      const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      o.position.set(x, y, z);
      (parent || mb).add(o);
      return o;
    };
    // 底座、盒身、腰线、四角黄铜包角、四个小圆脚
    box(walnut, W + 0.016, 0.02, D + 0.016, 0, 0.032, 0);
    box(walnutL, W, Hb - 0.012, D, 0, 0.042 + (Hb - 0.012) / 2, 0);
    box(inlay, W + 0.004, 0.008, D + 0.004, 0, 0.095, 0);
    box(walnut, W + 0.006, 0.012, D + 0.006, 0, 0.042 + Hb - 0.012, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      box(brass, 0.014, Hb - 0.006, 0.014, sx * (W / 2 + 0.002), 0.042 + (Hb - 0.006) / 2, sz * (D / 2 + 0.002));
      const ft = new THREE.Mesh(new THREE.SphereGeometry(0.013, 12, 8), brass);
      ft.position.set(sx * (W / 2 - 0.02), 0.013, sz * (D / 2 - 0.02));
      mb.add(ft);
    }
    // 正面的锁扣和钥匙孔
    box(brass, 0.04, 0.034, 0.004, 0, 0.115, D / 2 + 0.002);
    box(dark, 0.006, 0.014, 0.002, 0, 0.113, D / 2 + 0.0045);
    // 丝绒内衬（盒口内侧）
    const top = 0.042 + Hb;
    box(velvet, W - 0.03, 0.004, D - 0.03, 0, top - 0.01, 0);
    // 音筒（带小钉）和簧片梳
    const drum = new THREE.Group();
    drum.position.set(0.02, top + 0.008, -0.035);
    const dc = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.15, 24), brass);
    dc.rotation.z = Math.PI / 2;
    drum.add(dc);
    const pinG = new THREE.SphereGeometry(0.0026, 5, 4);
    const pins = new THREE.InstancedMesh(pinG, steel, 70);
    const pm = new THREE.Matrix4(), pr2 = G.rng(9);
    for (let i = 0; i < 70; i++) {
      const a = pr2() * Math.PI * 2, x = -0.07 + (Math.floor(pr2() * 18) / 17) * 0.14;
      pm.makeTranslation(x, Math.cos(a) * 0.023, Math.sin(a) * 0.023);
      pins.setMatrixAt(i, pm);
    }
    drum.add(pins);
    for (const sx of [-1, 1]) box(steel, 0.008, 0.03, 0.03, 0.02 + sx * 0.082, top - 0.002, -0.035);
    mb.add(drum);
    box(steel, 0.15, 0.008, 0.02, 0.02, top - 0.004, 0.012);
    for (let i = 0; i < 18; i++) box(steel, 0.0045, 0.0022, 0.03, 0.02 - 0.07 + i * (0.14 / 17), top + 0.002, -0.005);
    // 发条（侧面的蝴蝶钥匙）
    const key = new THREE.Group();
    key.position.set(W / 2 + 0.012, 0.085, 0);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.03, 8), brass);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.x = 0.012;
    key.add(shaft);
    for (const sy of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.018, 14, 10), brass);
      wing.scale.set(0.25, 1, 0.75);
      wing.position.set(0.03, sy * 0.017, 0);
      key.add(wing);
    }
    mb.add(key);
    // 小舞台和转圈的小鸡
    const stage = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.012, 24), brass);
    stage.position.set(-0.1, top + 0.004, 0.035);
    mb.add(stage);
    const chick = new THREE.Group();
    chick.position.set(-0.1, top + 0.01, 0.035);
    const yel = SH.room(0xffd84a, null, { emit: 0.15 });
    const cb = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), yel);
    cb.position.y = 0.026;
    const ch = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), yel);
    ch.position.set(0, 0.056, 0.006);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.0065, 0.016, 8), SH.room(0xff8a3d, null));
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.055, 0.027);
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 8, 6), dark);
      e.position.set(sx * 0.008, 0.062, 0.021);
      chick.add(e);
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), yel);
      wing.scale.set(0.45, 0.9, 1.2);
      wing.position.set(sx * 0.025, 0.028, 0);
      chick.add(wing);
    }
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.003, 6, 10), SH.room(0xff8fb1, null, { emit: 0.15 }));
    bow.position.set(0.006, 0.075, 0.004);
    chick.add(cb, ch, beak, bow);
    mb.add(chick);
    // 盒盖：铰链在后上沿，打开约 105°，内侧是镜子，外侧中间嵌一块黄铜小牌
    const lid = new THREE.Group();
    lid.position.set(0, top + 0.002, -D / 2);
    const lo = new THREE.Mesh(new THREE.BoxGeometry(W + 0.006, 0.016, D + 0.006), walnut);
    lo.position.set(0, 0.008, D / 2);
    const plaque = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.003, 28), brass);
    plaque.scale.set(1.5, 1, 1);
    plaque.position.set(0, 0.0175, D / 2);
    const inl = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, 0.002, D - 0.02), inlay);
    inl.position.set(0, 0.0165, D / 2);
    const mframe = new THREE.Mesh(new THREE.BoxGeometry(W - 0.03, 0.003, D - 0.03), brass);
    mframe.position.set(0, -0.001, D / 2);
    const mir = new THREE.Mesh(new THREE.BoxGeometry(W - 0.05, 0.002, D - 0.05), mirror);
    mir.position.set(0, -0.003, D / 2);
    lid.add(lo, inl, plaque, mframe, mir);
    lid.rotation.x = -1.83;
    mb.add(lid);
    mb.position.set(cab.x, cabTop, cab.z);
    mb.rotation.y = -Math.PI / 2;
    mb.scale.setScalar(1.15);
    scene.add(mb);
    I.mbox = { g: mb, drum, key, chick, note: 0, flip: 0 };
    chick.userData.y0 = chick.position.y;
    G.Tap.add(G.Tap.proxy(mb, 0.24, 0, 0.12, 0), 5, () => G.UI.musicbox(), { hint: new THREE.Vector3(cab.x - 0.05, cabTop + 0.42, cab.z), hintDist: 5 });
    scene.add(bowl);
    I.bowl = bowl;
    I.steamOrigin = new THREE.Vector3(bowl.position.x, bowl.position.y + 0.09, bowl.position.z);

    /* 生日蛋糕（只在那一天出现） */
    const cake = new THREE.Group();
    const cream = SH.room(0xfbf1e6, null), pink = SH.room(0xf3a6bd, null), berry = SH.room(0xe0303a, null);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.012, 32), SH.room(0xffffff, null));
    plate.position.y = 0.006;
    const t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.11, 36), cream);
    t1.position.y = 0.067;
    const drip = new THREE.Mesh(new THREE.CylinderGeometry(0.173, 0.173, 0.03, 36, 1, true), pink);
    drip.position.y = 0.108;
    const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.08, 36), cream);
    t2.position.y = 0.162;
    const drip2 = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.118, 0.022, 36, 1, true), pink);
    drip2.position.y = 0.193;
    cake.add(plate, t1, drip, t2, drip2);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), berry);
      b.position.set(Math.cos(a) * 0.145, 0.13, Math.sin(a) * 0.145);
      cake.add(b);
    }
    I.flames = [];
    const candleCols = [0xf6c6d6, 0xbfe3f5, 0xfff0a8, 0xc9f0c3, 0xe2cbf7];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      const cx = Math.cos(a) * 0.06, cz = Math.sin(a) * 0.06;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 8), SH.room(candleCols[i], null));
      c.position.set(cx, 0.237, cz);
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffcf6b }));
      f.scale.set(1, 1.8, 1);
      f.position.set(cx, 0.288, cz);
      const fg = G.glow(0xffb45a, 0.14, 0.7);
      fg.position.copy(f.position);
      cake.add(c, f, fg);
      I.flames.push({ f, fg, ph: i * 1.7 });
    }
    const cg = G.glow(0xffb060, 1.1, 0.16);
    cg.position.set(0, 0.3, 0);
    cake.add(cg);
    I.cakeGlow = cg;
    cake.position.set(T.x + 0.05, TY + 0.025, T.z - 0.2);
    cake.scale.setScalar(0.001);
    cake.visible = false;
    cake.userData.kind = 'cake';
    scene.add(cake);
    I.cake = cake;
    I.cakeScale = 0;
    I.blowOut = 0;
    G.RU.uCandle.value.set(cake.position.x, cake.position.y + 0.3, cake.position.z, 0);
  };

  /* ---------- 进门时，面从天而降 ---------- */
  const FYc = () => G.House.FY;
  function cell(x, z) {
    const i = G.clamp(Math.floor((x + 3.6) / 0.15), 0, 47), j = G.clamp(Math.floor((z + 2.7) / 0.15), 0, 35);
    return j * 48 + i;
  }
  I.rain = function () {
    const p = I.pools[I.nextPool = ((I.nextPool || 0) + 1) % 2];
    const r = I.rainRng;
    p.grid.fill(0);
    p.items = [];
    for (let i = 0; i < p.n; i++) {
      let x, z;
      for (let k = 0; k < 20; k++) {
        x = -3.0 + r() * 6.1;
        z = -2.05 + r() * 4.4;
        const inTable = x > TABLE.x - 0.6 && x < TABLE.x + 0.6 && z > TABLE.z - 0.85 && z < TABLE.z + 0.85;
        const inShelf = x < -2.95 && z < 0.35;
        const inCab = x > 2.85 && z > -1.85 && z < -0.95;
        if (!inTable && !inShelf && !inCab) break;
      }
      const ax = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
      const n = mound(x, z) > 0.02 ? moundNormal(x, z) : new THREE.Vector3(0, 1, 0);
      const qa = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      const qb = new THREE.Quaternion().setFromAxisAngle(n, r() * Math.PI * 2);
      p.items.push({
        x, z, y0: 3.3 + r() * 1.0, delay: r() * 1.7, ax, spin: 4 + r() * 8,
        q0: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)),
        qRest: qb.multiply(qa), landed: false, landT: 0, y: 0, qLand: new THREE.Quaternion()
      });
    }
    p.t = 0;
    p.active = true;
  };
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);
  function updatePool(p, dt) {
    if (!p.active) return false;
    p.t += dt;
    let busy = false;
    const other = I.pools[0] === p ? I.pools[1] : I.pools[0];
    for (let i = 0; i < p.items.length; i++) {
      const it = p.items[i];
      const tt = p.t - it.delay;
      if (tt < 0) {
        busy = true;
        tmpM.makeScale(0, 0, 0);
      } else if (!it.landed) {
        busy = true;
        const y = it.y0 - 0.5 * 9.8 * tt * tt;
        const c = cell(it.x, it.z);
        const land = FYc() + mound(it.x, it.z) + p.grid[c] + other.grid[c] + PD / 2;
        tmpQ.setFromAxisAngle(it.ax, tt * it.spin).multiply(it.q0);
        if (y <= land) {
          it.landed = true;
          it.landT = p.t;
          it.y = land;
          it.qLand.copy(tmpQ);
          p.grid[c] += PD * 0.9;
        }
        tmpM.compose(tmpV.set(it.x, Math.max(y, land), it.z), tmpQ, ONE);
      } else {
        const k = Math.min(1, (p.t - it.landT) / 0.16);
        if (k < 1) busy = true;
        tmpQ.copy(it.qLand).slerp(it.qRest, k);
        const bounce = Math.sin(k * Math.PI) * 0.03;
        tmpM.compose(tmpV.set(it.x, it.y + bounce, it.z), tmpQ, ONE);
      }
      I.packs.setMatrixAt(p.start + i, tmpM);
    }
    if (!busy) p.active = false;
    return true;
  }

  // 吃一口火鸡面：辣到喷火
  const HOT = ['嘶——哈——好辣！', '辣得想喷火（已经喷了）', '再来一口……等等，水呢？', '鸡柳歪头看着你：喵？'];
  let hotIdx = 0;
  I.eat = function (x, y) {
    const cam = G.Player.camera, f = new THREE.Vector3();
    cam.getWorldDirection(f);
    const p = cam.position.clone().addScaledVector(f, 0.55);
    p.y -= 0.12;
    G.Things.emit('flame', p, 12, { spread: 0.1, velRand: 0.5, vel: f.clone().multiplyScalar(1.5), stagger: 0.35 });
    G.Audio.sfx('fire');
    G.UI.spicy();
    G.UI.pop(HOT[hotIdx++ % HOT.length], x, y);
  };
  I.update = function (dt, time, bday, wantCake) {
    I.bdayNow = bday > 0.5;
    // 吊灯开关
    const L = I.lamp;
    L.k += ((L.on ? 1 : 0.08) - L.k) * Math.min(1, dt * 8);
    G.RU.uLampColor.value.setRGB(1.0 * L.k, 0.74 * L.k, 0.44 * L.k);
    L.bulb.material.color.setRGB(0.22 + 0.78 * L.k, 0.2 + 0.74 * L.k, 0.17 + 0.61 * L.k);
    L.lg1.material.opacity = 0.75 * L.k;
    L.lg2.material.opacity = 0.14 * L.k;
    // 八音盒：有歌在放时，音筒、发条和小鸡都转起来，冒出音符
    const mbx = I.mbox, np = G.Audio.nowPlaying && G.Audio.nowPlaying();
    if (np && !np.loading) {
      mbx.drum.rotation.x += dt * 1.6;
      mbx.key.rotation.x -= dt * 1.1;
      mbx.chick.rotation.y += dt * 2.2;
      mbx.chick.position.y = mbx.chick.userData.y0 + Math.abs(Math.sin(time * 4.4)) * 0.004;
      mbx.note -= dt;
      if (mbx.note <= 0) {
        mbx.note = 0.55;
        mbx.flip ^= 1;
        const p = mbx.g.position;
        G.Things.emit(mbx.flip ? 'note' : 'note2', new THREE.Vector3(p.x - 0.05, p.y + 0.3, p.z), 1, { spread: 0.08, velRand: 0.12, vel: new THREE.Vector3(-0.05, 0.16, 0) });
      }
    }
    const PL = G.Player;
    G.Audio.tickMusic(Math.hypot(PL.x - mbx.g.position.x, PL.z - mbx.g.position.z), !PL.inHouse(PL.x, PL.z));
    let dirty = false;
    for (const p of I.pools) dirty = updatePool(p, dt) || dirty;
    if (dirty) I.packs.instanceMatrix.needsUpdate = true;
    // 蛋糕
    const target = wantCake ? 1 : 0;
    I.cakeScale += (target - I.cakeScale) * Math.min(1, dt * (wantCake ? 2.2 : 3));
    const s = I.cakeScale;
    I.cake.visible = s > 0.01;
    const pop = s * (1 + 0.18 * Math.sin(Math.min(s, 1) * Math.PI));
    I.cake.scale.setScalar(Math.max(0.001, pop));
    if (I.blowOut > 0) I.blowOut -= dt;
    const lit = I.blowOut > 0 ? 0 : 1;
    let fl = 0;
    for (const f of I.flames) {
      const k = 0.85 + 0.15 * Math.sin(time * 13 + f.ph) * Math.sin(time * 7.3 + f.ph * 2);
      f.f.visible = lit > 0;
      f.f.scale.set(1, 1.8 * k, 1);
      f.fg.material.opacity = 0.7 * k * lit;
      fl += k;
    }
    I.cakeGlow.material.opacity = 0.16 * lit * (fl / 5);
    G.RU.uCandle.value.w = s * lit * (0.55 + 0.1 * Math.sin(time * 11));
  };

  I.pickTargets = function () {
    return [I.packs, I.bowl, I.cake];
  };
  I.PILE = PILE;
  G.Interior = I;
})();
