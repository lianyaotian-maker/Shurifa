/* 草原小屋 · 草原画廊：小路右边一面带小屋檐的弧形木墙，挂着 8 个画框，屋檐下一串小灯。
   - 墙上挂最新的 8 张，有新画挂上来时最旧的一张收进南头架子上的画册；画册可以一页页翻看所有旧画
   - 北头的画架：点它上传一张图片（可以写一句话、录一段话讲讲这幅画），上传后直接挂上墙
   - 点墙上的画看大图、听语音
   图片存在 Supabase 的 gallery 表里：大图（最长边 1280）和小图（最长边 512，墙上和画册里用），删一条就全没了 */
(function () {
  'use strict';
  const Gl = { rows: [], available: null, loaded: false, loading: false, failAt: -1e9, lastLoad: -1e9 };
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const C0 = { x: 2.6, z: 18.6 }, R = 5.6, PANEL = 2.3, NP = 4, DA = PANEL / R;
  const WALL = 8, PAGE = 6;
  const KAI = '"Kaiti SC","STKaiti","KaiTi","BiauKai","Songti SC","STSong","Noto Serif CJK SC",serif';
  const CACHE = 'grass-house-gallery';
  // 墙上从左到右 8 个位置，最新的挂在正中间，越旧越往两边
  const ORDER = [3, 4, 2, 5, 1, 6, 0, 7];
  const at = (a, r) => ({ x: C0.x + Math.cos(a) * (r || R), z: C0.z + Math.sin(a) * (r || R) });
  const faceRy = (a) => Math.atan2(-Math.cos(a), -Math.sin(a)); // 让物体的正面朝着弧心（小路那边）

  /* ---------- 画布贴图 ---------- */
  function planks() {
    return G.tex(G.canvas(256, 256, (x, w, h) => {
      const r = G.rng(77);
      for (let i = 0; i < 4; i++) {
        const x0 = i * 64, t = 0.9 + r() * 0.14;
        const g = x.createLinearGradient(x0, 0, x0 + 64, 0);
        g.addColorStop(0, `rgb(${150 * t},${104 * t},${66 * t})`);
        g.addColorStop(0.5, `rgb(${184 * t},${134 * t},${88 * t})`);
        g.addColorStop(1, `rgb(${156 * t},${108 * t},${70 * t})`);
        x.fillStyle = g;
        x.fillRect(x0, 0, 64, h);
        x.strokeStyle = 'rgba(80,50,30,0.25)';
        x.lineWidth = 1;
        for (let k = 0; k < 6; k++) {
          const gx = x0 + 6 + r() * 52;
          x.beginPath();
          x.moveTo(gx, 0);
          x.bezierCurveTo(gx + (r() - 0.5) * 10, h * 0.33, gx + (r() - 0.5) * 10, h * 0.66, gx + (r() - 0.5) * 6, h);
          x.stroke();
        }
        x.fillStyle = 'rgba(40,24,14,0.7)';
        x.fillRect(x0, 0, 3, h);
      }
    }), true);
  }
  function shingles() {
    return G.tex(G.canvas(128, 128, (x, w, h) => {
      x.fillStyle = '#3b3f4a';
      x.fillRect(0, 0, w, h);
      for (let row = 0; row < 4; row++) {
        const off = row % 2 ? 16 : 0;
        for (let c = -1; c < 5; c++) {
          const sx = c * 32 + off, sy = row * 32;
          const g = x.createLinearGradient(0, sy, 0, sy + 32);
          g.addColorStop(0, '#4c5260');
          g.addColorStop(1, '#2c3039');
          x.fillStyle = g;
          x.fillRect(sx + 1, sy + 1, 30, 30);
        }
      }
    }), true);
  }
  function signTex(text, w, h, bg, fg) {
    return G.tex(G.canvas(w, h, (x) => {
      x.fillStyle = bg;
      x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(232,192,96,0.9)';
      x.lineWidth = h * 0.05;
      x.strokeRect(h * 0.08, h * 0.08, w - h * 0.16, h - h * 0.16);
      x.fillStyle = fg;
      x.font = '700 ' + Math.round(h * 0.5) + 'px ' + KAI;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      const sp = (w * 0.6) / Math.max(1, text.length - 1);
      for (let i = 0; i < text.length; i++) x.fillText(text[i], w / 2 + (i - (text.length - 1) / 2) * sp, h * 0.54);
    }));
  }
  function emptyTex(line1, line2) {
    return G.tex(G.canvas(256, 224, (x, w, h) => {
      x.fillStyle = '#f4efe4';
      x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(150,120,90,0.35)';
      x.setLineDash([8, 6]);
      x.lineWidth = 3;
      x.strokeRect(14, 14, w - 28, h - 28);
      x.setLineDash([]);
      x.fillStyle = 'rgba(120,90,70,0.55)';
      x.font = '300 64px sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('+', w / 2, h * 0.38);
      x.font = '600 24px ' + KAI;
      x.fillText(line1, w / 2, h * 0.64);
      x.font = '18px ' + KAI;
      x.fillText(line2, w / 2, h * 0.78);
    }));
  }
  function labelTex(row) {
    const c = G.canvas(256, 64, (x, w, h) => {
      x.fillStyle = '#f7f2e8';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#4a3428';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      const cap = (row.caption || '').trim();
      const who = (row.name || '无名的旅人') + (row.has_voice ? '  ♪' : '');
      if (cap) {
        x.font = '600 22px ' + KAI;
        let t = cap;
        while (x.measureText(t).width > w - 20 && t.length > 1) t = t.slice(0, -1);
        x.fillText(t === cap ? t : t + '…', w / 2, h * 0.36);
        x.font = '15px sans-serif';
        x.fillStyle = '#8a6e5c';
        x.fillText(who, w / 2, h * 0.75);
      } else {
        x.font = '18px sans-serif';
        x.fillText(who, w / 2, h / 2);
      }
    });
    return G.tex(c);
  }

  /* ---------- 墙、画框、画架、画册 ---------- */
  const slots = [];
  let placeholder, setupTex, wallMat;
  function frameBars(g, mat) {
    const bars = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
      g.add(m);
      bars.push(m);
    }
    return bars;
  }
  // 画框按图片的长宽比调整：最大 0.82 × 0.74
  function fitSlot(s, aspect) {
    let w = 0.82, h = w / aspect;
    if (h > 0.74) {
      h = 0.74;
      w = h * aspect;
    }
    const b = 0.06, m = 0.05;
    s.pic.scale.set(w, h, 1);
    s.mat.scale.set(w + m * 2, h + m * 2, 1);
    const W = w + m * 2 + b * 2, H = h + m * 2 + b * 2;
    s.bars[0].scale.set(W, b, 0.06);
    s.bars[0].position.set(0, H / 2 - b / 2, 0.02);
    s.bars[1].scale.set(W, b, 0.06);
    s.bars[1].position.set(0, -H / 2 + b / 2, 0.02);
    s.bars[2].scale.set(b, H, 0.06);
    s.bars[2].position.set(-W / 2 + b / 2, 0, 0.02);
    s.bars[3].scale.set(b, H, 0.06);
    s.bars[3].position.set(W / 2 - b / 2, 0, 0.02);
    s.label.position.y = -H / 2 - 0.11;
  }
  function setSlot(s, row) {
    if (s.row && row && s.row.id === row.id) return;
    s.row = row || null;
    if (s.tex && s.tex !== placeholder && s.tex !== setupTex) s.tex.dispose();
    if (s.labelTex) s.labelTex.dispose();
    s.labelTex = null;
    s.label.visible = false;
    if (!row) {
      s.tex = Gl.available === false ? setupTex : placeholder;
      s.pic.material.map = s.tex;
      s.pic.material.needsUpdate = true;
      fitSlot(s, 256 / 224);
      return;
    }
    const id = row.id, im = new Image();
    im.onload = () => {
      if (!s.row || s.row.id !== id) return;
      const t = new THREE.Texture(im);
      t.anisotropy = 4;
      t.needsUpdate = true;
      s.tex = t;
      s.pic.material.map = t;
      s.pic.material.needsUpdate = true;
      fitSlot(s, im.naturalWidth / im.naturalHeight || 1);
      s.labelTex = labelTex(row);
      s.label.material.map = s.labelTex;
      s.label.material.needsUpdate = true;
      s.label.visible = true;
    };
    im.src = row.thumb;
  }
  function setRows(rows) {
    Gl.rows = rows;
    for (let i = 0; i < WALL; i++) setSlot(slots[ORDER[i]], rows[i]);
  }

  Gl.build = function (scene) {
    Gl.scene = scene;
    const g = new THREE.Group();
    scene.add(g);
    wallMat = G.lambert({ map: planks(), emissive: new THREE.Color(0, 0, 0) });
    const postMat = G.lambert({ color: 0x5a3a26 });
    const roofMat = G.lambert({ map: shingles(), side: THREE.DoubleSide });
    const trimMat = G.lambert({ color: 0xefe6d6 });
    const frameMat = G.lambert({ color: 0x3e2a1e });
    const matMat = G.lambert({ color: 0xf6f1e6, emissive: 0x2a2622 });
    placeholder = emptyTex('空着的画框', '点这里挂一幅画');
    setupTex = emptyTex('画廊还在布置中', '过几天再来挂画吧');
    const cols = G.Colliders;
    for (let k = 0; k < NP; k++) {
      const a = (k - (NP - 1) / 2) * DA, p = at(a), y = G.Field.height(p.x, p.z) - 0.05;
      const pg = new THREE.Group();
      pg.position.set(p.x, y, p.z);
      pg.rotation.y = faceRy(a);
      g.add(pg);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(PANEL + 0.02, 2.55, 0.1), wallMat);
      wall.position.set(0, 1.3, -0.05);
      pg.add(wall);
      for (const sx of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.75, 0.16), postMat);
        post.position.set((sx * PANEL) / 2, 1.375, 0);
        pg.add(post);
      }
      // 墙脚一条深色踢脚板、墙顶一条浅色压条
      const kick = new THREE.Mesh(new THREE.BoxGeometry(PANEL, 0.22, 0.05), postMat);
      kick.position.set(0, 0.15, 0.02);
      pg.add(kick);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(PANEL + 0.1, 0.1, 0.16), trimMat);
      cap.position.set(0, 2.6, 0);
      pg.add(cap);
      // 小屋檐：向前斜着伸出来
      const roof = new THREE.Mesh(new THREE.BoxGeometry(PANEL + 0.34, 0.05, 1.0), roofMat);
      roof.position.set(0, 2.82, 0.3);
      roof.rotation.x = 0.32;
      pg.add(roof);
      const fascia = new THREE.Mesh(new THREE.BoxGeometry(PANEL + 0.34, 0.12, 0.04), trimMat);
      fascia.position.set(0, 2.62, 0.78);
      fascia.rotation.x = 0.32;
      pg.add(fascia);
      // 每块墙两个画框
      for (const sx of [-1, 1]) {
        const fg = new THREE.Group();
        fg.position.set(sx * 0.55, 1.62, 0.02);
        pg.add(fg);
        const mat = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), matMat);
        mat.position.z = 0.005;
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        pic.position.z = 0.012;
        const label = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.125), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        label.position.z = 0.012;
        label.visible = false;
        fg.add(mat, pic, label);
        const s = { g: fg, pic, mat, label, bars: frameBars(fg, frameMat), row: null, tex: null };
        slots.push(s);
        const e = G.Tap.add(G.Tap.proxy(fg, 0.45, 0, 0, 0.05), 7, () => Gl.tapSlot(s), { enabled: () => !(G.Moon && G.Moon.on) });
        e.prio = true;
      }
      // 墙的碰撞体
      for (let i = -2; i <= 2; i++) {
        const q = at(a + (i / 2) * (DA / 2), R);
        cols.circles.push({ x: q.x, z: q.z, r: 0.35 });
      }
    }
    // 槽位按从左到右（从北到南）排好
    slots.sort((s1, s2) => s1.g.getWorldPosition(v3(0, 0, 0)).z - s2.g.getWorldPosition(v3(0, 0, 0)).z);
    for (const s of slots) setSlot(s, null);
    // 屋檐正中的招牌
    {
      const p = at(0, R - 0.2), y = G.Field.height(p.x, p.z);
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.42), G.lambert({ map: signTex('草原画廊', 384, 108, '#4b2c1f', '#f6dc96'), emissive: 0xffffff, emissiveMap: null }));
      sg.material.emissive.setRGB(0.18, 0.15, 0.12);
      sg.position.set(p.x, y + 3.28, p.z);
      sg.rotation.y = faceRy(0);
      g.add(sg);
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.52, 0.05), postMat);
      back.position.set(0, 0, -0.03);
      sg.add(back);
      for (const sx of [-0.6, 0.6]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.05), postMat);
        leg.position.set(sx, -0.38, -0.03);
        sg.add(leg);
      }
    }
    // 屋檐下的一串小灯：每块墙之间垂一点
    const lp = [], ph = [];
    for (let k = 0; k < NP; k++) {
      const a0 = (k - NP / 2) * DA, n = 9;
      for (let i = 0; i <= n; i++) {
        const t = i / n, a = a0 + t * DA, q = at(a, R - 0.82);
        lp.push(q.x, G.Field.height(q.x, q.z) + 2.52 - Math.sin(t * Math.PI) * 0.16, q.z);
        ph.push(Math.random());
      }
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    bg.setAttribute('aPh', new THREE.Float32BufferAttribute(ph, 1));
    Gl.bulbs = new THREE.Points(bg, new THREE.ShaderMaterial({
      uniforms: { uTime: G.U.uTime, uPx: G.U.uPx, uNight: G.U.uNight },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: 'attribute float aPh; uniform float uTime; uniform float uPx; uniform float uNight; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vA = (0.35 + 0.65 * uNight) * (0.85 + 0.15 * sin(uTime * 1.7 + aPh * 6.28)); gl_PointSize = clamp(0.16 * uPx / max(-mv.z, 0.2), 2.0, 40.0); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vA; void main(){ float d2 = dot(gl_PointCoord - 0.5, gl_PointCoord - 0.5) * 4.0; vec3 c = vec3(1.0, 0.78, 0.45) * exp(-d2 * 6.0) * 0.7 + vec3(1.0, 0.95, 0.8) * exp(-d2 * 40.0); gl_FragColor = vec4(c * vA, 1.0); }'
    }));
    Gl.bulbs.frustumCulled = false;
    g.add(Gl.bulbs);
    // 灯线
    const wire = [];
    for (let i = 0; i + 3 < lp.length; i += 3) wire.push(lp[i], lp[i + 1], lp[i + 2], lp[i + 3], lp[i + 4], lp[i + 5]);
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
    g.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x2a2a22 })));

    /* 北头：画架（点它挂一幅画） */
    {
      const a = -(NP / 2) * DA - 0.2, p = at(a, R - 1.2), y = G.Field.height(p.x, p.z);
      const eg = new THREE.Group();
      eg.position.set(p.x, y, p.z);
      eg.rotation.y = faceRy(a) + 0.35;
      g.add(eg);
      const wood = G.lambert({ color: 0xa8784c });
      for (const [x, rz, rx] of [[-0.32, 0.12, -0.12], [0.32, -0.12, -0.12], [0, 0, 0.38]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.9, 0.05), wood);
        leg.position.set(x, 0.92, rx > 0 ? -0.32 : 0);
        leg.rotation.set(rx, 0, rz);
        eg.add(leg);
      }
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.12), wood);
      shelf.position.set(0, 0.72, 0.06);
      eg.add(shelf);
      const canvas = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.6, 0.03), G.lambert({ map: G.tex(G.canvas(256, 200, (x, w, h) => {
        x.fillStyle = '#fbf7ee';
        x.fillRect(0, 0, w, h);
        // 几笔水彩：小屋、草地、月亮
        x.fillStyle = 'rgba(120,180,90,0.55)';
        x.beginPath();
        x.ellipse(w * 0.5, h * 0.98, w * 0.6, h * 0.3, 0, 0, Math.PI * 2);
        x.fill();
        x.fillStyle = 'rgba(190,60,50,0.75)';
        x.fillRect(w * 0.56, h * 0.5, w * 0.2, h * 0.16);
        x.fillStyle = 'rgba(60,60,80,0.8)';
        x.beginPath();
        x.moveTo(w * 0.53, h * 0.5);
        x.lineTo(w * 0.66, h * 0.38);
        x.lineTo(w * 0.79, h * 0.5);
        x.fill();
        x.fillStyle = 'rgba(240,200,90,0.8)';
        x.beginPath();
        x.arc(w * 0.22, h * 0.24, 14, 0, Math.PI * 2);
        x.fill();
        x.fillStyle = '#5a3a2a';
        x.font = '600 26px ' + KAI;
        x.textAlign = 'center';
        x.fillText('挂一幅画', w * 0.5, h * 0.9);
      })), emissive: 0x2a2620 }));
      canvas.position.set(0, 1.06, 0.03);
      canvas.rotation.x = -0.12;
      eg.add(canvas);
      // 架子上几罐颜料
      const pots = [0xc0392b, 0x2e86c1, 0xf1c40f];
      pots.forEach((c, i) => {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 10), G.lambert({ color: c }));
        pot.position.set(-0.2 + i * 0.12, 0.77, 0.08);
        eg.add(pot);
      });
      cols.circles.push({ x: p.x, z: p.z, r: 0.5 });
      G.Tap.add(G.Tap.proxy(eg, 0.55, 0, 1.0, 0), 6, () => Gl.open('up'), { hint: v3(p.x, y + 1.75, p.z), hintDist: 10, enabled: () => !(G.Moon && G.Moon.on) });
    }
    /* 南头：放画册的木架 */
    {
      const a = (NP / 2) * DA + 0.2, p = at(a, R - 1.2), y = G.Field.height(p.x, p.z);
      const lg = new THREE.Group();
      lg.position.set(p.x, y, p.z);
      lg.rotation.y = faceRy(a) - 0.35;
      g.add(lg);
      const wood = G.lambert({ color: 0x6e4630 });
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.0, 10), wood);
      post.position.y = 0.5;
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.08, 14), wood);
      foot.position.y = 0.04;
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.5), wood);
      top.position.set(0, 1.04, 0);
      top.rotation.x = 0.4;
      lg.add(post, foot, top);
      // 摊开的画册：两页，中间一条红色书签带
      const book = new THREE.Group();
      book.position.set(0, 1.08, 0.01);
      book.rotation.x = 0.4 - Math.PI / 2;
      lg.add(book);
      const cover = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.46, 0.03), G.lambert({ color: 0x7a2a2a }));
      cover.position.z = -0.016;
      book.add(cover);
      const pageTex = G.tex(G.canvas(256, 192, (x, w, h) => {
        x.fillStyle = '#fbf6ea';
        x.fillRect(0, 0, w, h);
        x.fillStyle = 'rgba(120,100,80,0.18)';
        x.fillRect(w / 2 - 2, 0, 4, h);
        const r = G.rng(3);
        for (const [px, py] of [[20, 18], [140, 18], [20, 104], [140, 104]]) {
          x.fillStyle = `hsl(${Math.floor(r() * 360)},35%,${70 + r() * 10}%)`;
          x.fillRect(px, py, 96, 70);
          x.strokeStyle = '#fff';
          x.lineWidth = 4;
          x.strokeRect(px, py, 96, 70);
        }
      }));
      const pages = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.42), G.lambert({ map: pageTex, emissive: 0x2a2620 }));
      pages.position.z = 0.002;
      book.add(pages);
      const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.36), G.lambert({ color: 0xc0392b, side: THREE.DoubleSide }));
      ribbon.position.set(0.02, -0.3, 0.004);
      book.add(ribbon);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.14), G.lambert({ map: signTex('画册', 256, 72, '#4b2c1f', '#f6dc96') }));
      sign.position.set(0, 0.72, 0.1);
      lg.add(sign);
      cols.circles.push({ x: p.x, z: p.z, r: 0.45 });
      G.Tap.add(G.Tap.proxy(lg, 0.5, 0, 1.0, 0), 6, () => Gl.open('album'), { hint: v3(p.x, y + 1.6, p.z), hintDist: 10, enabled: () => !(G.Moon && G.Moon.on) });
    }
    // 从小路走到画廊的几块踏脚石
    {
      const sm = G.lambert({ color: 0xb8b2a4 }), r = G.rng(41);
      for (let i = 0; i < 6; i++) {
        const t = i / 5, x = 1.4 + t * (C0.x + R - 1.6 - 1.4) * 0.72, z = 19.4 - t * 0.9 + (r() - 0.5) * 0.3;
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.33, 0.06, 7), sm);
        st.position.set(x, G.Field.height(x, z) + 0.02, z);
        st.rotation.y = r() * 6;
        st.scale.set(1 + r() * 0.3, 1, 0.8 + r() * 0.2);
        g.add(st);
      }
    }
    Gl.center = at(0, R - 2);
    // 先显示手机里记着的上一次
    try {
      const c = JSON.parse(localStorage.getItem(CACHE) || 'null');
      if (c && Array.isArray(c.rows)) setRows(c.rows);
    } catch (e) { /* 忽略 */ }
    Gl.initUI();
  };

  /* ---------- 数据 ---------- */
  const url = (q) => G.Board.rest('gallery') + '?' + q + '&apikey=' + G.Board.key();
  const COLS = 'id,created_at,name,caption,thumb,has_voice';
  async function load() {
    if (Gl.loading || !G.Board.ready()) return;
    Gl.loading = true;
    try {
      const r = await G.Board.req(url('select=' + COLS + '&order=created_at.desc&limit=' + WALL), {}, 25000);
      if (r.status === 404 || r.status === 400) {
        // 还没有建 gallery 这张表
        Gl.available = false;
        setRows([]);
        Gl.loaded = true;
        return;
      }
      if (!r.ok) throw new Error('gallery ' + r.status);
      const rows = await r.json();
      Gl.available = true;
      Gl.loaded = true;
      Gl.lastLoad = performance.now();
      setRows(rows);
      try { localStorage.setItem(CACHE, JSON.stringify({ at: new Date().toISOString(), rows })); } catch (e) { /* 存不下就算了 */ }
    } catch (e) {
      Gl.failAt = performance.now();
    } finally {
      Gl.loading = false;
    }
  }
  Gl.load = load;

  /* ---------- 每帧：走近了才去取画；夜里画框被小灯照着 ---------- */
  Gl.update = function (dt, t, P) {
    if (!slots.length) return;
    const night = G.U.uNight.value;
    const d = Math.hypot(P.x - Gl.center.x, P.z - Gl.center.z), now = performance.now();
    const near = !(G.Moon && G.Moon.on) && d < 45;
    if (near && !Gl.loading && (!Gl.loaded ? now - Gl.failAt > 20000 : now - Gl.lastLoad > 180000)) load();
    const k = 1 - 0.22 * night;
    for (const s of slots) s.pic.material.color.setRGB(k, k, k);
    wallMat.emissive.setRGB(0.2 * night, 0.12 * night, 0.05 * night);
  };

  /* ---------- 对话框：看画 / 挂画 / 画册 ---------- */
  const $ = (id) => document.getElementById(id);
  let el, mode = null, list = [], idx = 0, page = 0, pageRows = [], img = null, thumb = null, lastSend = 0, voiceW = null;
  Gl.initUI = function () {
    el = $('gal');
    voiceW = G.Voice.widget($('glRec'), $('glVc'), (t) => { $('glState').textContent = t; });
    el.addEventListener('click', (e) => { if (e.target === el) Gl.close(); });
    $('glClose').addEventListener('click', () => Gl.close());
    $('glBack').addEventListener('click', () => showAlbum());
    $('glPrev').addEventListener('click', () => showPic(idx - 1));
    $('glNext').addEventListener('click', () => showPic(idx + 1));
    $('glPgPrev').addEventListener('click', () => loadPage(page - 1));
    $('glPgNext').addEventListener('click', () => loadPage(page + 1));
    $('glPick').addEventListener('click', () => $('glFile').click());
    $('glFile').addEventListener('change', onFile);
    $('glSend').addEventListener('click', send);
    $('glVoice').addEventListener('click', playVoice);
  };
  function pane(name) {
    for (const p of ['glViewP', 'glUpP', 'glAlbP']) $(p).hidden = p !== name;
  }
  Gl.open = function (m, arg) {
    if (Gl.available === false) {
      G.UI.toast('画廊还在布置中，过几天再来挂画吧');
      return;
    }
    G.Player.enabled = false;
    G.Player.jx = G.Player.jy = 0;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('on'));
    if (m === 'up') showUpload();
    else if (m === 'album') {
      page = 0;
      showAlbum(true);
    } else if (m === 'view') {
      list = arg.list;
      $('glBack').hidden = !arg.fromAlbum;
      showPic(arg.i);
    }
  };
  Gl.close = function () {
    voiceW.cancel();
    G.Voice.stopPlay();
    el.classList.remove('on');
    setTimeout(() => { if (!el.classList.contains('on')) el.hidden = true; }, 350);
    G.Player.enabled = true;
    mode = null;
  };
  Gl.tapSlot = function (s) {
    if (!s.row) return Gl.open('up');
    const i = Gl.rows.findIndex((r) => r.id === s.row.id);
    Gl.open('view', { list: Gl.rows, i: Math.max(0, i) });
  };
  const fmtDate = (s) => {
    const d = new Date(s);
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  };

  // 看一幅画：先放小图，大图到了再换
  function showPic(i) {
    if (!list.length) return;
    idx = (i + list.length) % list.length;
    const r = list[idx];
    mode = 'view';
    pane('glViewP');
    G.Voice.stopPlay();
    $('glTitle').textContent = '草原画廊';
    const im = $('glImg');
    im.src = r.thumb;
    $('glLoad').textContent = '高清图加载中…';
    $('glCap').textContent = r.caption || '';
    $('glMeta').textContent = (r.name || '无名的旅人') + ' · ' + fmtDate(r.created_at);
    $('glVoice').hidden = !r.has_voice;
    $('glVoice').textContent = '▶ 听听这幅画的故事';
    $('glPrev').hidden = $('glNext').hidden = list.length < 2;
    G.Board.field('gallery', r.id, 'image').then((d) => {
      if (mode === 'view' && list[idx] === r) {
        if (d) im.src = d;
        $('glLoad').textContent = '';
      }
    }).catch(() => { if (list[idx] === r) $('glLoad').textContent = ''; });
  }
  async function playVoice() {
    const r = list[idx], b = $('glVoice'), key = 'gal-' + r.id;
    if (G.Voice.playing() === key) return G.Voice.stopPlay();
    b.textContent = '加载中…';
    try {
      const d = await G.Board.field('gallery', r.id, 'voice');
      if (!d) { b.textContent = '语音不见了'; return; }
      const on = G.Voice.play(d, key, () => { b.textContent = '▶ 听听这幅画的故事'; });
      b.textContent = on ? '■ 正在播放，点一下停' : '▶ 听听这幅画的故事';
    } catch (e) {
      b.textContent = '没加载出来，点一下再试';
    }
  }

  // 画册：墙上 8 张以外的旧画，每页 6 张
  function showAlbum(first) {
    mode = 'album';
    pane('glAlbP');
    $('glBack').hidden = true;
    $('glTitle').textContent = '画册';
    G.Voice.stopPlay();
    if (first || !pageRows.length) loadPage(page);
    else renderPage();
  }
  async function loadPage(p) {
    if (p < 0) return;
    const grid = $('glGrid');
    grid.innerHTML = '<p class="gl-empty">翻页中…</p>';
    try {
      const r = await G.Board.req(url('select=' + COLS + '&order=created_at.desc&offset=' + (WALL + p * PAGE) + '&limit=' + (PAGE + 1)), {}, 25000);
      if (!r.ok) throw new Error('album');
      const rows = await r.json();
      if (p > 0 && !rows.length) return loadPage(p - 1);
      if (p !== page) G.Audio.sfx('paper', 0.5); // 翻页的纸声
      page = p;
      pageRows = rows;
      renderPage();
    } catch (e) {
      grid.innerHTML = '<p class="gl-empty">画册没翻开，网络不太好，过一会儿再试试</p>';
    }
  }
  function renderPage() {
    const grid = $('glGrid'), rows = pageRows.slice(0, PAGE);
    grid.innerHTML = '';
    $('glPgNo').textContent = '第 ' + (page + 1) + ' 页';
    $('glPgPrev').disabled = page === 0;
    $('glPgNext').disabled = pageRows.length <= PAGE;
    if (!rows.length) {
      grid.innerHTML = '<p class="gl-empty">画册还是空的。墙上挂满 8 幅以后，再挂新画时，最旧的一幅会收进这里。</p>';
      $('glPgNo').textContent = '';
      return;
    }
    rows.forEach((r, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gl-th';
      const im = document.createElement('img');
      im.src = r.thumb;
      im.alt = r.caption || '画册里的一幅画';
      const cap = document.createElement('span');
      cap.textContent = (r.caption || r.name || '无名的旅人') + (r.has_voice ? ' ♪' : '');
      b.append(im, cap);
      b.addEventListener('click', () => {
        list = rows;
        $('glBack').hidden = false;
        showPic(i);
      });
      grid.appendChild(b);
    });
  }

  // 挂一幅画
  function showUpload() {
    mode = 'up';
    pane('glUpP');
    $('glBack').hidden = true;
    $('glTitle').textContent = '挂一幅画';
    try { $('glName').value = localStorage.getItem('grass-house-name') || ''; } catch (e) { /* 忽略 */ }
    voiceW.show(true);
    if (!img) setPick(null);
  }
  function setPick(d) {
    img = d;
    const p = $('glPick');
    p.innerHTML = '';
    p.classList.toggle('has', !!d);
    if (d) {
      const im = document.createElement('img');
      im.src = d;
      im.alt = '要挂上墙的图片';
      p.appendChild(im);
    } else p.textContent = '点这里选一张图片';
  }
  async function onFile() {
    const f = $('glFile').files && $('glFile').files[0];
    $('glFile').value = '';
    if (!f) return;
    $('glState').textContent = '正在处理图片…';
    try {
      const big = await G.Board.compress(f);
      const small = await G.Board.compress(f, [512, 384, 256], 90000);
      setPick(big);
      thumb = small;
      $('glState').textContent = '';
    } catch (e) {
      $('glState').textContent = '这张图片打不开，换一张试试';
    }
  }
  async function send() {
    if (G.Voice.recording()) { $('glState').textContent = '先点录音按钮停下来'; return; }
    if (!img) { $('glState').textContent = '先选一张图片吧'; return; }
    if (Date.now() - lastSend < 20000) { $('glState').textContent = '慢一点，过几秒再挂下一幅'; return; }
    const name = $('glName').value.trim().slice(0, 20), caption = $('glCapIn').value.trim().slice(0, 60);
    const voice = voiceW.data && voiceW.data.url;
    const f = new URLSearchParams();
    if (name) f.set('name', name);
    if (caption) f.set('caption', caption);
    f.set('image', img);
    f.set('thumb', thumb);
    if (voice) f.set('voice', voice);
    $('glSend').disabled = true;
    $('glState').textContent = '正在挂上墙…（图片比较大，要稍等一会儿）';
    lastSend = Date.now();
    try {
      const r = await G.Board.req(G.Board.rest('gallery') + '?apikey=' + G.Board.key(), { method: 'POST', body: f }, 60000);
      if (!r.ok) throw new Error('send ' + r.status);
      try { localStorage.setItem('grass-house-name', name); } catch (e) { /* 忽略 */ }
      setPick(null);
      thumb = null;
      voiceW.set(null);
      $('glCapIn').value = '';
      $('glState').textContent = '';
      Gl.close();
      G.UI.toast('挂上墙了！');
      G.Audio.sfx('magic', 0.8);
      Gl.loaded = false;
      Gl.failAt = -1e9;
      await load();
      const s = slots[ORDER[0]];
      G.Things.emit('star', s.g.getWorldPosition(v3(0, 0, 0)), 14, { spread: 0.7, velRand: 0.6, vel: v3(0, 0.4, 0), size: 1.3 });
    } catch (e) {
      $('glState').textContent = '没挂上去，网络不太好，过一会儿再点“挂上墙”（选的图和写的字都还在）';
    }
    $('glSend').disabled = false;
  }

  G.Gallery = Gl;
})();
