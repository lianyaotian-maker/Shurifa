/* 草原小屋 · 月中世界的建筑和小物件：
   八角亭、石板路和石灯、月光花、碎石、桂花树和红绸、留言板、捣药的玉兔、新月秋千、月洞门和竹子 */
(function () {
  'use strict';
  const M = G.Moon;
  const v3 = M.v3, L = M.L, C = M.C;
  const PI = Math.PI, OC = Math.cos(PI / 8);
  const hex = (h) => new THREE.Color(h).toArray();
  const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

  const COL = {
    stone: hex(0xdedce6), stone2: hex(0xc2c0ce), stone3: hex(0x9a99ac), ridge: hex(0xc4dde2), dark: hex(0x3c3a48),
    red: hex(0xb5302a), red2: hex(0x7a2420), gold: hex(0xe8c060), teal: hex(0x2d7480), blue: hex(0x2c4f86),
    white: hex(0xf8f6f4), celadon: hex(0xb9dccf), cushion: hex(0xd2506a),
    wood: hex(0x6e4230), wood2: hex(0x4b2c1f), woodL: hex(0xc0905e), bark: hex(0x5a4034),
    lan: hex(0xff5a3a), lanW: hex(0xffe0aa), stem: hex(0x3d6a52), leafM: hex(0x386c55),
    osm: hex(0xffc44a), jade: hex(0xd8ffe6), cake: hex(0xc98a3c), cakeTop: hex(0xe2a85c),
    gtile: hex(0x5b6170), bamboo: hex(0x4f8068)
  };

  /* ---------- 画布贴图 ---------- */
  const KAI = '"Kaiti SC","STKaiti","KaiTi","BiauKai","Songti SC","STSong","Noto Serif CJK SC",serif';
  function plaqueTex(text, w, h, bg, fg, border) {
    return G.tex(G.canvas(w, h, (x) => {
      x.fillStyle = bg;
      x.fillRect(0, 0, w, h);
      x.strokeStyle = border;
      x.lineWidth = h * 0.06;
      x.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1);
      x.lineWidth = h * 0.016;
      x.strokeRect(h * 0.14, h * 0.14, w - h * 0.28, h - h * 0.28);
      x.fillStyle = fg;
      x.font = '700 ' + Math.round(h * 0.56) + 'px ' + KAI;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      const sp = text.length > 1 ? (w * 0.62) / (text.length - 1) : 0;
      for (let i = 0; i < text.length; i++) x.fillText(text[i], w / 2 + (i - (text.length - 1) / 2) * sp, h * 0.54);
    }));
  }
  function makeTextures() {
    const T = {};
    // 琉璃瓦：一垄一垄的筒瓦
    T.roof = G.tex(G.canvas(128, 128, (x, w, h) => {
      x.fillStyle = '#1c3946';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 4; i++) {
        const cx = i * 32 + 16, g = x.createLinearGradient(cx - 13, 0, cx + 13, 0);
        g.addColorStop(0, '#1d3a47');
        g.addColorStop(0.35, '#4a8a9c');
        g.addColorStop(0.55, '#74b4c0');
        g.addColorStop(1, '#22434f');
        x.fillStyle = g;
        x.fillRect(cx - 13, 0, 26, h);
      }
      for (let j = 0; j < 2; j++) {
        x.fillStyle = 'rgba(8,22,32,0.6)';
        x.fillRect(0, j * 64, w, 4);
        x.fillStyle = 'rgba(210,240,245,0.28)';
        x.fillRect(0, j * 64 + 4, w, 2);
      }
    }), true);
    // 檐下的椽子，檐口一圈青绿彩头
    T.rafter = G.tex(G.canvas(64, 128, (x, w, h) => {
      x.fillStyle = '#3e1a18';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 2; i++) {
        const g = x.createLinearGradient(i * 32 + 4, 0, i * 32 + 28, 0);
        g.addColorStop(0, '#6a2c24');
        g.addColorStop(0.5, '#93432f');
        g.addColorStop(1, '#5a2420');
        x.fillStyle = g;
        x.fillRect(i * 32 + 5, 0, 22, h);
        x.fillStyle = '#2f7a80';
        x.fillRect(i * 32 + 5, 0, 22, 12);
        x.fillStyle = '#e8c060';
        x.beginPath();
        x.arc(i * 32 + 16, 6, 4, 0, PI * 2);
        x.fill();
      }
    }), true);
    T.rafter.wrapT = THREE.ClampToEdgeWrapping;
    // 额枋上的彩画
    T.beam = G.tex(G.canvas(256, 64, (x, w, h) => {
      x.fillStyle = '#1d5866';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#e8c060';
      x.fillRect(0, 3, w, 3);
      x.fillRect(0, h - 6, w, 3);
      x.fillStyle = '#284c86';
      x.beginPath();
      x.ellipse(w / 2, h / 2, 62, 21, 0, 0, PI * 2);
      x.fill();
      x.strokeStyle = '#e8c060';
      x.lineWidth = 3;
      x.stroke();
      x.lineWidth = 2;
      for (const s of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          x.beginPath();
          x.arc(w / 2 + s * (16 + k * 15), h / 2, 9, 0, PI * 2);
          x.stroke();
        }
        const cx = w / 2 + s * 100;
        x.fillStyle = '#3d8a7a';
        x.beginPath();
        x.arc(cx, h / 2, 17, 0, PI * 2);
        x.fill();
        x.stroke();
        for (let p = 0; p < 8; p++) {
          const a = (p / 8) * PI * 2;
          x.beginPath();
          x.arc(cx + Math.cos(a) * 11, h / 2 + Math.sin(a) * 11, 5, 0, PI * 2);
          x.stroke();
        }
        x.fillStyle = '#e8c060';
        x.beginPath();
        x.arc(cx, h / 2, 5, 0, PI * 2);
        x.fill();
      }
    }));
    // 挂落：镂空的木格子
    T.lattice = G.tex(G.canvas(256, 64, (x, w, h) => {
      x.strokeStyle = '#fff';
      x.lineWidth = 5;
      x.strokeRect(3, 3, w - 6, 30);
      x.lineWidth = 3;
      for (let i = 0; i < 9; i++) {
        const x0 = 8 + i * 27.5;
        x.strokeRect(x0, 9, 22, 18);
        x.beginPath();
        x.moveTo(x0 + 11, 9);
        x.lineTo(x0 + 11, 27);
        x.stroke();
      }
      // 下沿垂下的花牙子
      for (let i = 0; i < 8; i++) {
        const cx = 22 + i * 30.5;
        x.beginPath();
        x.moveTo(cx - 10, 33);
        x.quadraticCurveTo(cx, 58, cx + 10, 33);
        x.stroke();
      }
      x.lineWidth = 6;
      x.beginPath();
      x.moveTo(4, 30);
      x.lineTo(4, 62);
      x.moveTo(w - 4, 30);
      x.lineTo(w - 4, 62);
      x.stroke();
    }));
    // 亭子里的藻井
    T.ceil = G.tex(G.canvas(512, 512, (x, w) => {
      x.scale(2, 2);
      w = 256;
      const c = w / 2;
      const oct = (r) => {
        x.beginPath();
        for (let k = 0; k <= 8; k++) {
          const a = (k / 8) * PI * 2 + PI / 8;
          x[k ? 'lineTo' : 'moveTo'](c + Math.cos(a) * r, c + Math.sin(a) * r);
        }
      };
      x.fillStyle = '#16404c';
      x.fillRect(0, 0, w, w);
      oct(128);
      x.fillStyle = '#1d5866';
      x.fill();
      oct(98);
      x.fillStyle = '#284c86';
      x.fill();
      x.strokeStyle = '#e8c060';
      x.lineWidth = 3;
      for (const r of [124, 98, 72]) {
        oct(r);
        x.stroke();
      }
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * PI * 2;
        x.beginPath();
        x.arc(c + Math.cos(a) * 85, c + Math.sin(a) * 85, 7, 0, PI * 2);
        x.fillStyle = '#e8c060';
        x.fill();
      }
      x.fillStyle = '#a82e2a';
      x.beginPath();
      x.arc(c, c, 52, 0, PI * 2);
      x.fill();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * PI * 2;
        x.save();
        x.translate(c + Math.cos(a) * 30, c + Math.sin(a) * 30);
        x.rotate(a);
        x.beginPath();
        x.ellipse(0, 0, 18, 8, 0, 0, PI * 2);
        x.fillStyle = '#f0d27a';
        x.fill();
        x.restore();
      }
      x.beginPath();
      x.arc(c, c, 12, 0, PI * 2);
      x.fillStyle = '#fff2c8';
      x.fill();
    }));
    // 留言板上的小纸条（四种字迹拼在一张图上）
    T.card = G.tex(G.canvas(256, 256, (x) => {
      const r = G.rng(31);
      for (let k = 0; k < 4; k++) {
        const ox = (k % 2) * 128, oy = Math.floor(k / 2) * 128;
        x.fillStyle = '#fbf8f2';
        x.fillRect(ox + 4, oy + 4, 120, 120);
        x.strokeStyle = 'rgba(70,60,80,0.75)';
        x.lineWidth = 2.4;
        x.lineCap = 'round';
        const lines = 4 + (k % 2);
        for (let l = 0; l < lines; l++) {
          const y = oy + 26 + l * 19;
          let px = ox + 16;
          const end = ox + 100 - r() * 30;
          x.beginPath();
          x.moveTo(px, y);
          while (px < end) {
            const step = 5 + r() * 7;
            x.quadraticCurveTo(px + step / 2, y - 4 - r() * 5, px + step, y + (r() - 0.5) * 3);
            px += step;
          }
          x.stroke();
        }
        // 角落里的小涂鸦
        x.fillStyle = ['#e2506a', '#e8b04a', '#6a8ae0', '#e2506a'][k];
        const dx = ox + 104, dy = oy + 104;
        if (k === 1) {
          x.beginPath();
          for (let p = 0; p < 10; p++) {
            const a = (p / 10) * PI * 2 - PI / 2, rr = p % 2 ? 4 : 10;
            x[p ? 'lineTo' : 'moveTo'](dx + Math.cos(a) * rr, dy + Math.sin(a) * rr);
          }
          x.fill();
        } else if (k === 2) {
          x.beginPath();
          x.arc(dx, dy, 10, 0, PI * 2);
          x.fill();
          x.fillStyle = '#fbf8f2';
          x.beginPath();
          x.arc(dx + 5, dy - 3, 9, 0, PI * 2);
          x.fill();
        } else {
          x.beginPath();
          x.moveTo(dx, dy + 8);
          x.bezierCurveTo(dx - 14, dy - 2, dx - 6, dy - 12, dx, dy - 4);
          x.bezierCurveTo(dx + 6, dy - 12, dx + 14, dy - 2, dx, dy + 8);
          x.fill();
        }
      }
    }));
    // 竹叶
    T.leaf = G.tex(G.canvas(64, 16, (x) => {
      x.fillStyle = '#fff';
      x.beginPath();
      x.moveTo(1, 8);
      x.quadraticCurveTo(22, 0, 63, 8);
      x.quadraticCurveTo(22, 16, 1, 8);
      x.fill();
    }));
    // 粉墙：一点点斑驳
    T.plaster = G.tex(G.canvas(128, 128, (x, w, h) => {
      const r = G.rng(5);
      x.fillStyle = '#f2efea';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        x.fillStyle = 'rgba(' + (150 + r() * 60) + ',' + (150 + r() * 60) + ',' + (170 + r() * 50) + ',' + (0.03 + r() * 0.05) + ')';
        x.beginPath();
        x.arc(r() * w, r() * h, 2 + r() * 10, 0, PI * 2);
        x.fill();
      }
    }), true);
    T.plaster.repeat.set(0.4, 0.4);
    // 灰瓦
    T.gtile = G.tex(G.canvas(64, 64, (x, w, h) => {
      x.fillStyle = '#4a4f5c';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 2; i++) {
        const g = x.createLinearGradient(i * 32 + 3, 0, i * 32 + 29, 0);
        g.addColorStop(0, '#3a3e4a');
        g.addColorStop(0.5, '#8a90a0');
        g.addColorStop(1, '#3e424e');
        x.fillStyle = g;
        x.fillRect(i * 32 + 4, 0, 24, h);
      }
      x.fillStyle = 'rgba(20,20,30,0.5)';
      x.fillRect(0, 0, w, 3);
    }), true);
    // 新月表面：浅浅的斑
    T.cres = G.tex(G.canvas(256, 256, (x, w, h) => {
      const r = G.rng(12);
      x.fillStyle = '#fff';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        const cx = r() * w, cy = r() * h, rr = 4 + r() * r() * 34;
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
        g.addColorStop(0, 'rgba(225,205,160,0.5)');
        g.addColorStop(0.7, 'rgba(235,215,175,0.25)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g;
        x.beginPath();
        x.arc(cx, cy, rr, 0, PI * 2);
        x.fill();
      }
    }), true);
    T.cres.repeat.set(0.35, 0.35);
    T.boardSign = plaqueTex('留言板', 384, 128, '#4b2c1f', '#f6dc96', '#c8a050');
    T.gateSign = plaqueTex('回草原', 384, 128, '#ece8e0', '#2e3a4a', '#7a7f8a');
    return T;
  }

  /* ---------- 材质 ---------- */
  // 顶点色材质：自发光也跟着顶点色走，金色亮一点、石头暗一点
  function vcMat(emis, extra) {
    const p = Object.assign({ color: 0xffffff, vertexColors: true, emissive: new THREE.Color(emis, emis, emis), side: THREE.DoubleSide }, extra || {});
    if (p.map && !p.emissiveMap) p.emissiveMap = p.map;
    return G.lambert(p, (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive * vColor;');
    }, 'moonvc');
  }

  /* ---------- 几何小工具 ---------- */
  const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _l = new THREE.Vector3(), _nm = new THREE.Matrix3();
  // 把很多小零件按材质合成几个大网格，省绘制次数
  class Acc {
    constructor() {
      this.b = new Map();
    }
    add(geo, m, key, color) {
      let b = this.b.get(key);
      if (!b) this.b.set(key, (b = { p: [], n: [], c: [], uv: [] }));
      const g = geo.index ? geo.toNonIndexed() : geo;
      const P = g.attributes.position, N = g.attributes.normal, UV = g.attributes.uv;
      _nm.getNormalMatrix(m);
      const fn = typeof color === 'function';
      for (let i = 0; i < P.count; i++) {
        _l.fromBufferAttribute(P, i);
        _v.copy(_l).applyMatrix4(m);
        _n.fromBufferAttribute(N, i).applyMatrix3(_nm).normalize();
        b.p.push(_v.x, _v.y, _v.z);
        b.n.push(_n.x, _n.y, _n.z);
        const c = fn ? color(_v, _n, _l) : color;
        b.c.push(c[0], c[1], c[2]);
        if (UV) b.uv.push(UV.getX(i), UV.getY(i));
        else b.uv.push(0, 0);
      }
    }
    build(mats, parent) {
      for (const [key, b] of this.b) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
        geo.computeBoundingSphere();
        const m = new THREE.Mesh(geo, mats[key]);
        m.name = 'moon-' + key;
        parent.add(m);
      }
    }
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  // 位置、旋转（YXZ 顺序）、缩放 → 矩阵（parent 是外面一层的矩阵）
  function T(x, y, z, rx, ry, rz, s, parent) {
    _e.set(rx || 0, ry || 0, rz || 0, 'YXZ');
    _q.setFromEuler(_e);
    if (s === undefined) _s.set(1, 1, 1);
    else if (typeof s === 'number') _s.set(s, s, s);
    else _s.set(s[0], s[1], s[2]);
    _m.compose(_p.set(x, y, z), _q, _s);
    if (parent) _m.premultiply(parent);
    return _m;
  }
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const sph = (r, a, b) => new THREE.SphereGeometry(r, a || 16, b || 12);
  const cyl = (rt, rb, h, s) => new THREE.CylinderGeometry(rt, rb, h, s || 12);
  const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg || 16);
  // 八角柱：尺寸给边心距，角朝着柱子的方向
  const octG = (at, ab, h) => new THREE.CylinderGeometry(at / OC, ab / OC, h, 8, 1, false, PI / 8);
  // 粗细渐变的管子（树枝、屋脊、藤蔓）
  function tube(pts, r0, r1, rs, ts, closed) {
    const curve = new THREE.CatmullRomCurve3(pts, !!closed);
    const fr = curve.computeFrenetFrames(ts, !!closed);
    const pos = [], nor = [], idx = [];
    const P = new THREE.Vector3(), N = new THREE.Vector3();
    for (let i = 0; i <= ts; i++) {
      const t = i / ts;
      curve.getPointAt(closed ? t % 1 : t, P);
      const r = r0 + (r1 - r0) * t;
      for (let j = 0; j <= rs; j++) {
        const a = (j / rs) * PI * 2;
        N.copy(fr.normals[i]).multiplyScalar(Math.cos(a)).addScaledVector(fr.binormals[i], Math.sin(a));
        pos.push(P.x + N.x * r, P.y + N.y * r, P.z + N.z * r);
        nor.push(N.x, N.y, N.z);
      }
    }
    for (let i = 0; i < ts; i++) {
      for (let j = 0; j < rs; j++) {
        const a = i * (rs + 1) + j, b = a + rs + 1;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setIndex(idx);
    return geo;
  }
  // 花边的圆饼（月饼）
  function scallop(r, h, k) {
    const g = new THREE.CylinderGeometry(r, r, h, 48, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z);
      if (d > 1e-4) {
        const s = 1 + 0.08 * Math.cos(Math.atan2(z, x) * k);
        p.setX(i, x * s);
        p.setZ(i, z * s);
      }
    }
    g.computeVertexNormals();
    return g;
  }
  function uvScale(geo, sx, sy) {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
    return geo;
  }
  // 一闪一闪的光点（月光花、飘浮的光尘）
  function glowPoints(pts, color, size, drift) {
    const geo = new THREE.BufferGeometry(), ph = new Float32Array(pts.length / 3);
    for (let i = 0; i < ph.length; i++) ph[i] = Math.random();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    geo.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
    const p = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: { uTime: G.U.uTime, uPx: G.U.uPx, uSize: { value: size }, uDrift: { value: drift || 0 }, uCol: { value: new THREE.Color(color) } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: 'attribute float aPh; uniform float uTime; uniform float uPx; uniform float uSize; uniform float uDrift; varying float vA; void main(){ vec3 p = position + uDrift * vec3(sin(uTime * 0.23 + aPh * 6.28) * 0.9, sin(uTime * 0.31 + aPh * 11.0) * 0.5, cos(uTime * 0.19 + aPh * 7.0) * 0.9); vec4 mv = modelViewMatrix * vec4(p, 1.0); vA = 0.5 + 0.5 * sin(uTime * (1.0 + aPh) + aPh * 6.2832); gl_PointSize = min(uSize * uPx / max(-mv.z, 0.3), 64.0); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uCol; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uCol * (smoothstep(0.5, 0.0, d) * 0.45 + smoothstep(0.14, 0.0, d) * 0.7) * vA, 1.0); }'
    }));
    p.frustumCulled = false;
    return p;
  }
  function glowAt(color, size, op, x, y, z) {
    const s = G.glow(color, size, op);
    s.position.set(x, y, z);
    M.group.add(s);
    return s;
  }

  /* ================= 八角亭 ================= */
  const H0 = M.PLAT_H;
  const RE = 4.45, RB = H0 + 2.67, RH = 2.1;
  // 屋面上的点：k 第几面，u 沿着檐口，v 从宝顶(0)到檐口(1)
  function rp(k, u, v, out) {
    const a0 = (k * PI) / 4 + PI / 8, a1 = a0 + PI / 4;
    const x = Math.cos(a0) * (1 - u) + Math.cos(a1) * u, z = Math.sin(a0) * (1 - u) + Math.sin(a1) * u;
    const cf = Math.pow(Math.abs(2 * u - 1), 6);
    const s = v * RE * (1 + 0.07 * cf * v * v);
    const y = RB + RH * Math.pow(Math.max(0, 1 - v), 1.55) + v * v * v * (0.16 * (2 * u - 1) * (2 * u - 1) + 0.38 * cf);
    return out.set(x * s, y, z * s);
  }
  function pavilion(A, tex) {
    const PV = new THREE.Matrix4().makeTranslation(C.x, 0, C.z);
    const at = (x, y, z, rx, ry, rz, s) => T(x, y, z, rx, ry, rz, s, PV);
    /* 台基：下层台明、上层台面、一圈线脚 */
    A.add(octG(3.75, 3.82, 0.14), at(0, 0.07, 0), 'stone', COL.stone2);
    A.add(octG(3.3, 3.3, 0.24), at(0, 0.26, 0), 'stone', COL.stone);
    A.add(octG(3.33, 3.33, 0.035), at(0, 0.2, 0), 'stone', COL.stone3);
    A.add(octG(3.38, 3.38, 0.06), at(0, 0.39, 0), 'stone', COL.stone);
    // 台面上嵌的八角纹
    A.add(octG(2.35, 2.35, 0.01), at(0, H0 + 0.004, 0), 'stone', COL.stone2);
    A.add(octG(2.22, 2.22, 0.012), at(0, H0 + 0.005, 0), 'stone', COL.stone);
    A.add(octG(1.05, 1.05, 0.014), at(0, H0 + 0.006, 0), 'stone', COL.stone2);
    // 前后台阶和两边的垂带石
    for (const s of [1, -1]) {
      A.add(box(1.9, 0.14, 0.36), at(0, 0.21, s * 3.48), 'stone', COL.stone);
      A.add(box(2.1, 0.14, 0.42), at(0, 0.07, s * 3.94), 'stone', COL.stone2);
      for (const sx of [-1, 1]) A.add(box(0.16, 0.12, 0.9), at(sx * 1.05, 0.31, s * 3.72, s * 0.318), 'stone', COL.stone);
    }
    /* 白玉栏杆 */
    const BA = 3.12, corners = [];
    for (let k = 0; k < 8; k++) {
      const a = (k * PI) / 4 + PI / 8;
      corners.push([(Math.cos(a) * BA) / OC, (Math.sin(a) * BA) / OC]);
    }
    const capG = lathe([[0, 0], [0.085, 0], [0.09, 0.035], [0.06, 0.06], [0.08, 0.11], [0.05, 0.16], [0.015, 0.2], [0, 0.21]], 10);
    const balG = lathe([[0, 0], [0.03, 0], [0.026, 0.06], [0.042, 0.18], [0.024, 0.32], [0.03, 0.38], [0, 0.38]], 7);
    const post = (x, z) => {
      A.add(box(0.13, 0.66, 0.13), at(x, H0 + 0.33, z), 'stone', COL.stone);
      A.add(capG, at(x, H0 + 0.66, z), 'stone', COL.stone);
    };
    const rail = (ax, az, bx, bz) => {
      const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx), mx = (ax + bx) / 2, mz = (az + bz) / 2;
      A.add(box(l, 0.07, 0.11), at(mx, H0 + 0.6, mz, 0, ry), 'stone', COL.stone);
      A.add(box(l, 0.07, 0.09), at(mx, H0 + 0.06, mz, 0, ry), 'stone', COL.stone2);
      const n = Math.max(1, Math.round(l / 0.21));
      for (let i = 1; i < n; i++) A.add(balG, at(ax + (dx * i) / n, H0 + 0.1, az + (dz * i) / n, 0, 0, 0, [1, 1.22, 1]), 'stone', COL.stone);
      const nc = Math.floor(l / 0.36) + 1;
      for (let i = 0; i < nc; i++) {
        const t = (i + 0.5) / nc;
        M.cols.circles.push({ x: C.x + ax + dx * t, z: C.z + az + dz * t, r: 0.17 });
      }
    };
    for (let k = 0; k < 8; k++) {
      const a = corners[k], b = corners[(k + 1) % 8];
      post(a[0], a[1]);
      if (k === 1 || k === 5) {
        // 前后留出台阶的口子
        const ex = b[0] - a[0], ez = b[1] - a[1], l = Math.hypot(ex, ez), cut = (l / 2 - 0.95) / l;
        const p1 = [a[0] + ex * cut, a[1] + ez * cut], p2 = [b[0] - ex * cut, b[1] - ez * cut];
        rail(a[0], a[1], p1[0], p1[1]);
        rail(p2[0], p2[1], b[0], b[1]);
        post(p1[0], p1[1]);
        post(p2[0], p2[1]);
      } else rail(a[0], a[1], b[0], b[1]);
    }
    /* 红柱、柱础、金箍 */
    const plinthG = lathe([[0, 0], [0.27, 0], [0.285, 0.05], [0.23, 0.1], [0.19, 0.15], [0, 0.15]], 16);
    const colG = cyl(0.13, 0.145, 2.5, 16), bandG = cyl(0.153, 0.153, 0.07, 16);
    for (let k = 0; k < 8; k++) {
      const a = (k * PI) / 4 + PI / 8, x = Math.cos(a) * 2.7, z = Math.sin(a) * 2.7;
      A.add(plinthG, at(x, H0, z), 'stone', COL.stone);
      A.add(colG, at(x, H0 + 1.39, z), 'paint', COL.red);
      A.add(bandG, at(x, H0 + 2.47, z), 'gold', COL.gold);
      A.add(bandG, at(x, H0 + 0.24, z), 'gold', COL.gold);
      M.cols.circles.push({ x: C.x + x, z: C.z + z, r: 0.2 });
    }
    /* 额枋（彩画）、平板枋、挂落、雀替、斗拱 */
    const BAp = 2.7 * OC, EL = 2 * 2.7 * Math.sin(PI / 8);
    const braceSh = new THREE.Shape();
    braceSh.moveTo(0, 0);
    braceSh.lineTo(0.55, 0);
    braceSh.quadraticCurveTo(0.42, -0.04, 0.3, -0.1);
    braceSh.quadraticCurveTo(0.1, -0.16, 0, -0.34);
    braceSh.lineTo(0, 0);
    const braceG = new THREE.ExtrudeGeometry(braceSh, { depth: 0.06, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -0.03);
    for (let k = 0; k < 8; k++) {
      const n = ((k + 1) * PI) / 4, cx = Math.cos(n), sz = Math.sin(n), ry = PI / 2 - n;
      A.add(box(EL + 0.12, 0.28, 0.16), at(cx * BAp, H0 + 2.5, sz * BAp, 0, ry), 'beam', [1, 1, 1]);
      A.add(box(EL + 0.22, 0.08, 0.24), at(cx * BAp, H0 + 2.68, sz * BAp, 0, ry), 'paint', COL.red);
      A.add(new THREE.PlaneGeometry(EL - 0.26, 0.3), at(cx * BAp, H0 + 2.21, sz * BAp, 0, ry), 'lattice', COL.red);
      // 雀替：柱子两边各一个金色的托
      const a0 = (k * PI) / 4 + PI / 8, a1 = a0 + PI / 4;
      const c0 = [Math.cos(a0) * 2.7, Math.sin(a0) * 2.7], c1 = [Math.cos(a1) * 2.7, Math.sin(a1) * 2.7];
      const ex = (c1[0] - c0[0]) / EL, ez = (c1[1] - c0[1]) / EL, bry = Math.atan2(-ez, ex);
      A.add(braceG, at(c0[0] + ex * 0.1, H0 + 2.36, c0[1] + ez * 0.1, 0, bry), 'gold', COL.gold);
      A.add(braceG, at(c1[0] - ex * 0.1, H0 + 2.36, c1[1] - ez * 0.1, 0, bry + PI), 'gold', COL.gold);
      // 斗拱
      for (let i = 0; i < 5; i++) {
        const t = (i + 0.5) / 5 - 0.5, tx = -sz * t * EL, tz = cx * t * EL;
        A.add(box(0.13, 0.12, 0.34), at(cx * (BAp + 0.08) + tx, H0 + 2.78, sz * (BAp + 0.08) + tz, 0, ry), 'paint', COL.teal);
        A.add(box(0.17, 0.05, 0.2), at(cx * (BAp + 0.2) + tx, H0 + 2.865, sz * (BAp + 0.2) + tz, 0, ry), 'gold', COL.gold);
      }
    }
    // 天花板和藻井
    A.add(octG(2.95, 2.95, 0.1), at(0, H0 + 2.92, 0), 'paint', COL.red2);
    A.add(new THREE.CircleGeometry(2.62 / OC, 8, PI / 8), at(0, H0 + 2.866, 0, PI / 2), 'ceil', [1, 1, 1]);
    /* 屋顶：内凹的八角攒尖，琉璃瓦，檐角起翘 */
    const NU = 12, NV = 16, rpos = [], ruv = [], ruv2 = [], ridx = [];
    for (let k = 0; k < 8; k++) {
      const base = rpos.length / 3;
      for (let i = 0; i <= NV; i++) {
        const v = i / NV, el = 2 * RE * Math.sin(PI / 8) * v;
        for (let j = 0; j <= NU; j++) {
          const u = j / NU;
          rp(k, u, v, _p);
          rpos.push(_p.x, _p.y, _p.z);
          ruv.push(((u - 0.5) * el) / 1.12, (v * 4.8) / 0.8);
          ruv2.push(((u - 0.5) * el) / 0.5, v);
        }
      }
      for (let i = 0; i < NV; i++) {
        for (let j = 0; j < NU; j++) {
          const a = base + i * (NU + 1) + j, b = a + NU + 1, c = a + 1, d = b + 1;
          ridx.push(a, c, b, c, d, b);
        }
      }
    }
    const roofG = new THREE.BufferGeometry();
    roofG.setAttribute('position', new THREE.Float32BufferAttribute(rpos, 3));
    roofG.setAttribute('uv', new THREE.Float32BufferAttribute(ruv, 2));
    roofG.setIndex(ridx);
    roofG.computeVertexNormals();
    const roof = new THREE.Mesh(roofG, G.lambert({ map: tex.roof, emissive: 0xffffff, emissiveMap: tex.roof, emissiveIntensity: 0.16 }));
    roof.position.set(C.x, 0, C.z);
    M.group.add(roof);
    const underG = roofG.clone();
    underG.setAttribute('uv', new THREE.Float32BufferAttribute(ruv2, 2));
    const under = new THREE.Mesh(underG, G.lambert({ map: tex.rafter, side: THREE.BackSide, emissive: 0xffffff, emissiveMap: tex.rafter, emissiveIntensity: 0.22 }));
    under.position.copy(roof.position);
    M.group.add(under);
    // 垂脊、檐角、小走兽、风铃
    const bellG = lathe([[0, 0.13], [0.025, 0.125], [0.045, 0.08], [0.06, 0.02], [0.066, 0], [0, 0]], 10);
    for (let k = 0; k < 8; k++) {
      const pts = [];
      for (let i = 1; i <= 10; i++) pts.push(rp(k, 0, 0.04 + (i / 10) * 0.96, _p).clone().add(v3(0, 0.06, 0)));
      pts.push(rp(k, 0, 1.035, _p).clone().add(v3(0, 0.1, 0)));
      pts.push(rp(k, 0, 1.06, _p).clone().add(v3(0, 0.2, 0)));
      A.add(tube(pts, 0.07, 0.04, 8, 36), PV, 'paint', COL.ridge);
      const tip = pts[pts.length - 1];
      A.add(sph(0.065, 10, 8), at(tip.x, tip.y, tip.z), 'gold', COL.gold);
      for (const vv of [0.74, 0.81, 0.88]) {
        const q = rp(k, 0, vv, _p);
        A.add(sph(0.05, 8, 6), at(q.x, q.y + 0.14, q.z, 0, 0, 0, [1, 1.3, 1]), 'gold', COL.gold);
      }
      const bt = rp(k, 0, 1.025, _p).clone();
      A.add(cyl(0.006, 0.006, 0.24, 4), at(bt.x, bt.y - 0.1, bt.z), 'gold', COL.gold);
      A.add(bellG, at(bt.x, bt.y - 0.37, bt.z), 'gold', COL.gold);
    }
    // 檐口一圈金边
    const ept = [];
    for (let k = 0; k < 8; k++) for (let j = 0; j < NU; j++) ept.push(rp(k, j / NU, 1, _p).clone().add(v3(0, -0.02, 0)));
    A.add(tube(ept, 0.045, 0.045, 6, 8 * NU * 2, true), PV, 'gold', COL.gold);
    // 宝顶
    A.add(lathe([[0, 0], [0.32, 0], [0.35, 0.06], [0.2, 0.12], [0.28, 0.2], [0.12, 0.3], [0.21, 0.42], [0.22, 0.5], [0.15, 0.6], [0.06, 0.66], [0.13, 0.76], [0.12, 0.85], [0.05, 0.93], [0.018, 1.25], [0, 1.3]], 18), at(0, RB + RH - 0.06, 0), 'gold', COL.gold);
    glowAt(0xffe2a0, 1.6, 0.35, C.x, RB + RH + 0.5, C.z);
    /* 八角挂的宫灯 */
    const lanG = lathe([[0, -0.27], [0.1, -0.26], [0.18, -0.19], [0.215, -0.08], [0.222, 0], [0.215, 0.08], [0.18, 0.19], [0.1, 0.26], [0, 0.27]], 14);
    const lcapG = cyl(0.1, 0.12, 0.05, 14), tasG = lathe([[0, 0], [0.022, -0.02], [0.045, -0.24], [0, -0.25]], 8);
    for (let k = 0; k < 8; k++) {
      const a = (k * PI) / 4 + PI / 8, x = Math.cos(a) * 3.5, z = Math.sin(a) * 3.5, y = H0 + 2.25;
      const top = rp(k, 0, 0.765, _p).y;
      A.add(cyl(0.007, 0.007, top - y - 0.28, 4), at(x, (top + y + 0.28) / 2, z), 'gold', COL.gold);
      A.add(lanG, at(x, y, z), 'glow', COL.lan);
      for (let r = 0; r < 4; r++) A.add(box(0.012, 0.5, 0.012), at(x + Math.cos((r * PI) / 2) * 0.2, y, z + Math.sin((r * PI) / 2) * 0.2), 'gold', COL.gold);
      A.add(lcapG, at(x, y + 0.28, z), 'gold', COL.gold);
      A.add(lcapG, at(x, y - 0.28, z, PI), 'gold', COL.gold);
      A.add(tasG, at(x, y - 0.3, z), 'paint', COL.red);
      M.glows.push(glowAt(0xff8a50, 1.7, 0.55, C.x + x, y, C.z + z));
    }
    // 亭子正中的六角宫灯
    {
      const y = H0 + 2.22;
      A.add(cyl(0.012, 0.012, H0 + 2.87 - (y + 0.3), 4), at(0, (H0 + 2.87 + y + 0.3) / 2, 0), 'gold', COL.gold);
      A.add(cyl(0.25, 0.25, 0.4, 6), at(0, y, 0), 'glow', COL.lanW);
      A.add(cyl(0.31, 0.27, 0.07, 6), at(0, y + 0.235, 0), 'gold', COL.gold);
      A.add(cyl(0.27, 0.31, 0.07, 6), at(0, y - 0.235, 0), 'gold', COL.gold);
      A.add(new THREE.ConeGeometry(0.2, 0.16, 6), at(0, y + 0.34, 0), 'gold', COL.gold);
      for (let i = 0; i < 6; i++) {
        const a = (i * PI) / 3;
        A.add(box(0.03, 0.42, 0.03), at(Math.sin(a) * 0.26, y, Math.cos(a) * 0.26), 'paint', COL.red2);
        A.add(tasG, at(Math.sin(a) * 0.3, y - 0.27, Math.cos(a) * 0.3, 0, 0, 0, 0.8), 'paint', COL.red);
      }
      M.glows.push(glowAt(0xffc890, 2.6, 0.5, C.x, y, C.z));
    }
    M.pools.push([0, 0, 6.8, 0.42]);
    /* 石桌、鼓凳、茶具和月饼 */
    A.add(lathe([[0, 0], [0.34, 0], [0.36, 0.05], [0.22, 0.11], [0.16, 0.3], [0.15, 0.45], [0.22, 0.62], [0.6, 0.67], [0.645, 0.72], [0.62, 0.77], [0, 0.77]], 28), at(0, H0, 0), 'stone', COL.stone);
    const stoolG = lathe([[0, 0], [0.17, 0], [0.22, 0.08], [0.245, 0.22], [0.22, 0.36], [0.17, 0.44], [0, 0.44]], 18);
    const studG = new THREE.TorusGeometry(0.218, 0.013, 4, 28).rotateX(PI / 2);
    for (let i = 0; i < 4; i++) {
      const a = PI / 4 + (i * PI) / 2, x = Math.cos(a) * 1.15, z = Math.sin(a) * 1.15;
      A.add(stoolG, at(x, H0, z), 'stone', COL.stone2);
      A.add(studG, at(x, H0 + 0.075, z), 'gold', COL.gold);
      A.add(studG, at(x, H0 + 0.365, z), 'gold', COL.gold);
      A.add(cyl(0.15, 0.16, 0.035, 16), at(x, H0 + 0.455, z), 'paint', COL.cushion);
    }
    M.cols.circles.push({ x: C.x, z: C.z, r: 0.75 });
    const TY = H0 + 0.77;
    A.add(lathe([[0, 0], [0.06, 0], [0.095, 0.03], [0.105, 0.075], [0.085, 0.125], [0.045, 0.145], [0.048, 0.16], [0.03, 0.165], [0.012, 0.19], [0, 0.195]], 18), at(0.15, TY, -0.12), 'paint', COL.celadon);
    A.add(tube([v3(0.23, TY + 0.05, -0.12), v3(0.29, TY + 0.1, -0.12), v3(0.315, TY + 0.15, -0.12)], 0.022, 0.012, 6, 6), PV, 'paint', COL.celadon);
    A.add(new THREE.TorusGeometry(0.05, 0.011, 6, 12, PI), at(0.05, TY + 0.085, -0.12, 0, 0, PI / 2), 'paint', COL.celadon);
    const cupG = lathe([[0, 0], [0.022, 0], [0.028, 0.008], [0.04, 0.045], [0.036, 0.047], [0.026, 0.012], [0, 0.012]], 12);
    for (const c of [[0.38, 0.12], [0.18, 0.34], [-0.1, -0.35], [0.42, -0.22]]) A.add(cupG, at(c[0], TY, c[1]), 'paint', COL.celadon);
    A.add(lathe([[0, 0], [0.12, 0], [0.17, 0.02], [0.18, 0.03], [0.165, 0.03], [0, 0.012]], 22), at(-0.2, TY, 0.12), 'stone', COL.white);
    const cakeG = scallop(0.055, 0.032, 12);
    for (const c of [[-0.24, 0.1], [-0.15, 0.08], [-0.2, 0.18]]) {
      A.add(cakeG, at(c[0], TY + 0.03, c[1]), 'paint', COL.cake);
      A.add(cyl(0.042, 0.042, 0.004, 16), at(c[0], TY + 0.047, c[1]), 'paint', COL.cakeTop);
    }
    /* 桌上的一封信：月白色信封，金色火漆 */
    const env = new THREE.Group();
    env.position.set(C.x - 0.08, TY + 0.004, C.z + 0.44);
    env.rotation.y = 0.18;
    const ebody = new THREE.Mesh(box(0.25, 0.006, 0.17), G.lambert({ color: 0xf6f1e6, emissive: 0x4a4658 }));
    const eflap = new THREE.Mesh(new THREE.ConeGeometry(0.104, 0.07, 4, 1), G.lambert({ color: 0xeee6d6, emissive: 0x403c4c }));
    eflap.scale.set(1.18, 0.05, 0.84);
    eflap.rotation.y = PI / 4;
    eflap.position.set(0, 0.004, -0.03);
    const eseal = new THREE.Mesh(cyl(0.022, 0.024, 0.008, 18), G.lambert({ color: 0xe0b04a, emissive: 0x6a4a10 }));
    eseal.position.set(0, 0.008, 0.012);
    env.add(ebody, eflap, eseal);
    M.group.add(env);
    const ep = G.Tap.add(G.Tap.proxy(env, 0.17, 0, 0.02, 0), 4.5, () => {
      G.Audio.sfx('paper');
      G.UI.letter('Not all at once—but always.');
    }, { hint: L(-0.08, TY + 0.36, 0.44), hintDist: 7, enabled: () => M.on });
    ep.prio = true;
  }

  /* ================= 石板路、石灯、月光花、碎石、光尘 ================= */
  function paths(A, rnd) {
    const stoneG = new THREE.CylinderGeometry(1, 1.06, 1, 7);
    const lay = (x0, z0, x1, z1, wig) => {
      const l = Math.hypot(x1 - x0, z1 - z0), n = Math.round(l / 0.74);
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = x0 + (x1 - x0) * t + (rnd() - 0.5) * 0.24 + Math.sin(t * PI * 2) * wig, z = z0 + (z1 - z0) * t + (rnd() - 0.5) * 0.1;
        const s = 0.29 + rnd() * 0.07;
        A.add(stoneG, T(C.x + x, M.rawH(x, z) + 0.015, C.z + z, 0, rnd() * 6.28, 0, [s * (1.1 + rnd() * 0.25), 0.06, s * (0.86 + rnd() * 0.2)]), 'stone', shade(COL.stone3, 0.92 + rnd() * 0.16));
      }
    };
    lay(0.3, 20.4, 0, 4.6, 0.28);
    lay(0, -4.6, 0, -12.1, 0.18);
  }
  function stoneLantern(A, x, z, ry) {
    const PM = T(C.x + x, M.rawH(x, z), C.z + z, 0, ry, 0, 1).clone();
    const at = (px, py, pz, rx, rry, rz, s) => T(px, py, pz, rx, rry, rz, s, PM);
    A.add(cyl(0.3, 0.34, 0.14, 6), at(0, 0.07, 0), 'stone', COL.stone3);
    A.add(lathe([[0, 0], [0.12, 0], [0.09, 0.12], [0.085, 0.45], [0.11, 0.56], [0, 0.56]], 8), at(0, 0.14, 0), 'stone', COL.stone3);
    A.add(cyl(0.27, 0.2, 0.12, 6), at(0, 0.76, 0), 'stone', COL.stone3);
    A.add(cyl(0.16, 0.16, 0.26, 6), at(0, 0.95, 0), 'glow', COL.lanW);
    for (let i = 0; i < 6; i++) {
      const a = (i * PI) / 3 + PI / 6;
      A.add(box(0.055, 0.3, 0.055), at(Math.sin(a) * 0.19, 0.95, Math.cos(a) * 0.19, 0, a), 'stone', COL.stone3);
    }
    A.add(lathe([[0, 0], [0.37, 0], [0.39, 0.03], [0.28, 0.1], [0.12, 0.2], [0.05, 0.24], [0, 0.25]], 6), at(0, 1.1, 0), 'stone', COL.stone3);
    A.add(sph(0.06, 8, 6), at(0, 1.38, 0), 'stone', COL.stone3);
    const w = v3(x, M.rawH(x, z) + 0.95, z);
    M.glows.push(glowAt(0xffc888, 1.3, 0.5, C.x + w.x, w.y, C.z + w.z));
    M.pools.push([x, z, 2.3, 0.6]);
    M.cols.circles.push({ x: C.x + x, z: C.z + z, r: 0.36 });
  }
  function moonFlowers(A, rnd) {
    const spots = [];
    for (let z = 5.5; z < 20; z += 2.3) spots.push([(z % 4.6 < 2.3 ? -1 : 1) * (1.25 + rnd() * 0.35), z, 3 + Math.floor(rnd() * 3), 0.35]);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * PI * 2 + 0.3;
      spots.push([-7.5 + Math.cos(a) * 1.75, -2.5 + Math.sin(a) * 1.75, 3, 0.3]);
    }
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) spots.push([sx * (1.7 + i * 0.75), -12.4 + rnd() * 0.3, 3, 0.3]);
    for (let i = 0; i < 10; i++) {
      const a = rnd() * PI * 2, d = 5 + rnd() * 3.5;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(x) < 1.6 || Math.hypot(x + 5.2, z - 0.6) < 1.4 || Math.hypot(x - 4.6, z - 2.6) < 1.4) continue;
      spots.push([x, z, 3 + Math.floor(rnd() * 3), 0.4]);
    }
    for (let i = 0; i < 5; i++) spots.push([10 + Math.cos(i * 1.3) * 2.6, -5 + Math.sin(i * 1.3) * 2.6, 3, 0.35]);
    const stemG = cyl(0.007, 0.011, 1, 4), cupG = lathe([[0, 0], [0.02, 0.006], [0.05, 0.04], [0.068, 0.08], [0.062, 0.086]], 8), lfG = sph(1, 6, 4);
    const tints = [[0.78, 0.92, 1.0], [0.93, 0.88, 1.0], [0.84, 1.0, 0.95], [1.0, 0.95, 0.86]];
    const gp = [];
    for (const [cx, cz, n, rad] of spots) {
      for (let i = 0; i < n; i++) {
        const a = rnd() * 6.28, r = Math.sqrt(rnd()) * rad, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        const y = M.groundAt(C.x + x, C.z + z), h = 0.16 + rnd() * 0.28, tx = (rnd() - 0.5) * 0.5, tz = (rnd() - 0.5) * 0.5;
        A.add(stemG, T(C.x + x, y + h / 2, C.z + z, 0, 0, 0, [1, h, 1]), 'leaf', COL.stem);
        A.add(cupG, T(C.x + x, y + h, C.z + z, tx, 0, tz, 1), 'glow', tints[Math.floor(rnd() * 4)]);
        for (let j = 0; j < 2; j++) A.add(lfG, T(C.x + x, y + 0.03 + j * 0.05, C.z + z, 0.5, rnd() * 6.28, 0, [0.075, 0.012, 0.03]), 'leaf', COL.leafM);
        gp.push(C.x + x, y + h + 0.06, C.z + z);
      }
    }
    M.group.add(glowPoints(gp, 0xbfe0ff, 0.42));
  }
  function rocks(A, rnd) {
    // 小石头用粗一点的多面体，大石头细一些、带两层起伏，看起来更像风化的岩块
    const rockGeo = (s, detail, rough) => {
      const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        _v.fromBufferAttribute(p, i);
        let k = 0.74 + 0.5 * G.vnoise(_v.x * 1.6 + s * 3.1 + 5, _v.y * 1.6 + _v.z * 1.3 + s * 7);
        if (rough) k += 0.16 * (G.vnoise(_v.x * 4.5 + s, _v.z * 4.5 + _v.y * 3.7) - 0.5) + 0.06 * (G.vnoise(_v.x * 11 + 3, _v.y * 11 + _v.z * 9) - 0.5);
        p.setXYZ(i, _v.x * k, _v.y * k * (_v.y > 0 ? 0.72 : 0.5), _v.z * k);
      }
      g.computeVertexNormals();
      return g;
    };
    const small = [0, 1, 2, 3].map((s) => rockGeo(s, 1, false)), big = [4, 5, 6].map((s) => rockGeo(s, 2, true)), huge = rockGeo(7, 3, true);
    const free = (x, z) => !((Math.abs(x) < 3 && z > -14.5 && z < 23) || (Math.abs(x) < 7 && Math.abs(z + 13) < 3) || Math.hypot(x - 10, z + 5) < 4.5 || Math.hypot(x + 7.5, z + 2.5) < 3.5 || Math.hypot(x + 5.2, z - 0.6) < 2.2 || Math.hypot(x - 4.6, z - 2.6) < 2.5 || M.oct(x, z) < 4.6);
    const put = (x, z, s) => {
      const y = M.rawH(x, z) - s * 0.2;
      const geo = s > 0.95 ? huge : s > 0.45 ? big[Math.floor(rnd() * 3)] : small[Math.floor(rnd() * 4)];
      const base = shade([0.44, 0.45, 0.52], 0.8 + rnd() * 0.3);
      // 底部暗一些，像埋在月壤里
      A.add(geo, T(C.x + x, y, C.z + z, (rnd() - 0.5) * 0.3, rnd() * 6.28, (rnd() - 0.5) * 0.3, [s * (0.8 + rnd() * 0.5), s, s * (0.8 + rnd() * 0.5)]), 'rock', (w, n, l) => shade(base, 0.62 + 0.42 * G.clamp(l.y + 0.4, 0, 1)));
      if (s > 0.5 && Math.hypot(x, z) < M.R) M.cols.circles.push({ x: C.x + x, z: C.z + z, r: s * 0.85 });
    };
    // 大大小小的石头，坑沿上多一些
    let n = 0;
    while (n < 170) {
      let x, z;
      if (rnd() < 0.5) {
        const c = M.CRATERS[Math.floor(rnd() * M.CRATERS.length)], a = rnd() * 6.28, d = c[2] * (0.9 + rnd() * 0.5);
        x = c[0] + Math.cos(a) * d;
        z = c[1] + Math.sin(a) * d;
      } else {
        const a = rnd() * 6.28, d = 9 + rnd() * 46;
        x = Math.cos(a) * d;
        z = Math.sin(a) * d;
      }
      if (!free(x, z) || Math.hypot(x, z) > 60) continue;
      n++;
      put(x, z, 0.12 + Math.pow(rnd(), 3) * 1.25);
    }
    // 小院周围散落的小石子
    for (let i = 0; i < 70; i++) {
      const a = rnd() * 6.28, d = 4.6 + rnd() * 5, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (!free(x, z) && !(M.oct(x, z) >= 4.6 && Math.abs(x) > 1.4)) continue;
      put(x, z, 0.05 + rnd() * 0.1);
    }
  }

  /* ================= 桂花树（带红绸） ================= */
  function tree(A, rnd) {
    const TX = -7.5, TZ = -2.5, ox = C.x + TX, oz = C.z + TZ;
    const I = new THREE.Matrix4();
    // 树干和根
    A.add(tube([v3(0, -0.1, 0), v3(0.06, 0.8, 0.02), v3(-0.08, 1.6, 0.1), v3(0.05, 2.3, 0.0), v3(0.0, 3.0, -0.06)].map((p) => p.add(v3(ox, 0, oz))), 0.34, 0.15, 12, 16), I, 'bark', COL.bark);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2 + 0.4;
      A.add(tube([v3(Math.cos(a) * 0.12, 0.45, Math.sin(a) * 0.12), v3(Math.cos(a) * 0.42, 0.1, Math.sin(a) * 0.42), v3(Math.cos(a) * 0.68, -0.08, Math.sin(a) * 0.68)].map((p) => p.add(v3(ox, 0, oz))), 0.13, 0.03, 6, 6), I, 'bark', COL.bark);
    }
    // 树枝（两级）
    const tips = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * PI * 2 + rnd() * 0.5, h = 1.75 + rnd() * 1.0, len = 1.3 + rnd() * 0.8;
      const s = v3(ox, h, oz), dir = v3(Math.cos(a), 0.65 + rnd() * 0.5, Math.sin(a)).normalize();
      const mid = s.clone().addScaledVector(dir, len * 0.5).add(v3(0, 0.12, 0)), end = s.clone().addScaledVector(dir, len).add(v3(0, 0.25, 0));
      A.add(tube([s, mid, end], 0.11, 0.04, 6, 8), I, 'bark', COL.bark);
      tips.push(end);
      for (let j = 0; j < 2; j++) {
        const b0 = s.clone().lerp(end, 0.5 + rnd() * 0.35), a2 = a + (j ? 0.8 : -0.8) * (0.5 + rnd() * 0.5);
        const e2 = b0.clone().add(v3(Math.cos(a2) * 0.7, 0.35 + rnd() * 0.3, Math.sin(a2) * 0.7));
        A.add(tube([b0, b0.clone().lerp(e2, 0.5).add(v3(0, 0.06, 0)), e2], 0.045, 0.018, 5, 5), I, 'bark', COL.bark);
        tips.push(e2);
      }
    }
    // 树冠：一团团起伏的叶簇
    const blobs = [[ox, 4.15, oz, 1.25]];
    for (const p of tips) {
      blobs.push([p.x, p.y + 0.2, p.z, 0.55 + rnd() * 0.25]);
      for (let j = 0; j < 2; j++) blobs.push([p.x + (rnd() - 0.5) * 0.9, p.y + 0.1 + rnd() * 0.5, p.z + (rnd() - 0.5) * 0.9, 0.38 + rnd() * 0.24]);
    }
    for (let i = 0; i < 18; i++) {
      const u = rnd() * 1.3 - 0.35, a = rnd() * 6.283, r = Math.sqrt(1 - u * u);
      blobs.push([ox + Math.cos(a) * r * 1.45, 4.05 + u * 0.95, oz + Math.sin(a) * r * 1.45, 0.5 + rnd() * 0.3]);
    }
    const disp = (n, seed) => 1 + 0.2 * (G.vnoise(n.x * 2.1 + seed, n.y * 2.1 + n.z * 1.7 + seed * 0.7) - 0.5) * 2;
    const flowers = [], leafCard = new THREE.PlaneGeometry(0.3, 0.12);
    blobs.forEach((b, bi) => {
      const geo = new THREE.IcosahedronGeometry(1, 2), p = geo.attributes.position, nor = geo.attributes.normal;
      for (let i = 0; i < p.count; i++) {
        _n.fromBufferAttribute(p, i).normalize();
        const k = disp(_n, bi * 3.7);
        p.setXYZ(i, _n.x * k, _n.y * k * 0.86, _n.z * k);
        nor.setXYZ(i, _n.x, _n.y, _n.z);
      }
      A.add(geo, T(b[0], b[1], b[2], 0, 0, 0, b[3]), 'leaf', (w, n) => {
        const up = n.y * 0.5 + 0.5, nz = G.vnoise(w.x * 3.1, w.z * 3.1 + w.y * 2.0);
        const k = 0.78 + 0.32 * up + 0.16 * (nz - 0.5);
        return [0.16 * k, 0.33 * k, 0.26 * k];
      });
      // 叶簇表面再贴一层小叶片，轮廓毛茸茸的
      for (let c = 0; c < 14; c++) {
        const u = rnd() * 1.8 - 0.8, a = rnd() * 6.283, r = Math.sqrt(1 - u * u);
        const d = v3(Math.cos(a) * r, u, Math.sin(a) * r), k = disp(d, bi * 3.7) * b[3], t = 0.75 + 0.45 * (u * 0.5 + 0.5) + rnd() * 0.15;
        A.add(leafCard, T(b[0] + d.x * (k + 0.03), b[1] + d.y * (k + 0.03) * 0.86, b[2] + d.z * (k + 0.03), rnd() * 6, rnd() * 6, rnd() * 6, 0.8 + rnd() * 0.6), 'bleaf', [0.17 * t, 0.36 * t, 0.27 * t]);
      }
      // 一簇簇金黄的桂花
      for (let c = 0; c < 3; c++) {
        const u = rnd() * 1.6 - 0.6, a = rnd() * 6.283, r = Math.sqrt(1 - u * u);
        const dc = v3(Math.cos(a) * r, u, Math.sin(a) * r);
        for (let f = 0; f < 5; f++) {
          const d = dc.clone().add(v3((rnd() - 0.5) * 0.25, (rnd() - 0.5) * 0.25, (rnd() - 0.5) * 0.25)).normalize();
          const k = disp(d, bi * 3.7) * b[3] + 0.02;
          flowers.push(v3(b[0] + d.x * k, b[1] + d.y * k * 0.86, b[2] + d.z * k));
        }
      }
    });
    const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.042, 0), M.room(0xffc84a, 0.75), flowers.length);
    const m4 = new THREE.Matrix4();
    flowers.forEach((p, i) => {
      m4.makeRotationY(rnd() * 6);
      m4.setPosition(p);
      fl.setMatrixAt(i, m4);
    });
    M.group.add(fl);
    glowAt(0xffd27a, 8, 0.13, ox, 3.9, oz);
    M.pools.push([TX, TZ, 3.6, 0.32]);
    // 树池
    for (let k = 0; k < 8; k++) {
      const n = (k * PI) / 4;
      A.add(box(2 * 1.0 * Math.tan(PI / 8) + 0.12, 0.3, 0.16), T(ox + Math.cos(n) * 1.0, 0.15, oz + Math.sin(n) * 1.0, 0, PI / 2 - n), 'stone', COL.stone2);
      A.add(box(2 * 1.06 * Math.tan(PI / 8) + 0.14, 0.05, 0.24), T(ox + Math.cos(n) * 1.02, 0.325, oz + Math.sin(n) * 1.02, 0, PI / 2 - n), 'stone', COL.stone);
    }
    A.add(new THREE.CircleGeometry(0.95, 16), T(ox, 0.2, oz, -PI / 2), 'rock', [0.24, 0.21, 0.24]);
    M.cols.circles.push({ x: ox, z: oz, r: 1.15 });
    // 挂在树上的红绸和小木牌
    M.ribbons = [];
    const ribMat = M.room(0xd8342c, 0.42);
    ribMat.side = THREE.DoubleSide;
    const tagMat = M.room(0xb88a5a, 0.3);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * PI * 2 + 0.2, r = 1.3 + rnd() * 0.5, y = 2.35 + rnd() * 0.35, len = 0.5 + rnd() * 0.35;
      const rg = new THREE.Group();
      rg.position.set(ox + Math.cos(a) * r, y, oz + Math.sin(a) * r);
      rg.rotation.y = rnd() * 6;
      const rb = new THREE.Mesh(new THREE.PlaneGeometry(0.06, len), ribMat);
      rb.position.y = -len / 2;
      rg.add(rb);
      const rb2 = new THREE.Mesh(new THREE.PlaneGeometry(0.05, len * 0.8), ribMat);
      rb2.position.set(0.03, -len * 0.4, 0.01);
      rb2.rotation.z = 0.12;
      rg.add(rb2);
      const tg = new THREE.Mesh(box(0.07, 0.12, 0.012), tagMat);
      tg.position.y = -len - 0.05;
      rg.add(tg);
      M.group.add(rg);
      M.ribbons.push({ g: rg, ph: rnd() * 6 });
    }
    // 飘落的桂花
    const pn = 90, pg = new THREE.BufferGeometry();
    M.petals = { n: pn, p: new Float32Array(pn * 3), v: [], ox, oz };
    for (let i = 0; i < pn; i++) M.petals.v.push({ y: rnd() * 5, a: rnd() * 6.283, r: rnd() * 3, s: 0.22 + rnd() * 0.3, ph: rnd() * 6 });
    pg.setAttribute('position', new THREE.BufferAttribute(M.petals.p, 3));
    M.petals.pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffd060, size: 0.07, transparent: true, opacity: 0.95, depthWrite: false, fog: false }));
    M.petals.pts.frustumCulled = false;
    M.group.add(M.petals.pts);
  }

  /* ================= 留言板 ================= */
  function board(A, tex, rnd) {
    const bx = -5.2, bz = 0.6, ry = 0.9;
    const bg = new THREE.Group();
    bg.position.set(C.x + bx, 0, C.z + bz);
    bg.rotation.y = ry;
    M.group.add(bg);
    bg.updateMatrix();
    const BM = bg.matrix.clone();
    const at = (x, y, z, rx, rry, rz, s) => T(x, y, z, rx, rry, rz, s, BM);
    for (const sx of [-1, 1]) {
      A.add(box(0.11, 2.2, 0.11), at(sx * 0.88, 1.1, 0), 'paint', COL.wood);
      A.add(box(0.24, 0.16, 0.24), at(sx * 0.88, 0.08, 0), 'stone', COL.stone2);
    }
    A.add(box(1.74, 1.1, 0.08), at(0, 1.34, 0), 'paint', COL.wood2);
    A.add(box(1.56, 0.94, 0.02), at(0, 1.34, 0.04), 'paint', [0.78, 0.64, 0.46]);
    // 小纸条：颜色、角度都随意一点，用图钉钉着
    const tints = [[1, 0.95, 0.8], [1, 0.84, 0.88], [0.85, 0.94, 1], [0.9, 1, 0.86], [1, 0.98, 0.94], [0.96, 0.88, 1]];
    let i = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5; c++) {
        if (rnd() < 0.15) continue;
        const w = 0.22 + rnd() * 0.05, h = 0.2 + rnd() * 0.05, cell = Math.floor(rnd() * 4);
        const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
        for (let k = 0; k < uv.count; k++) uv.setXY(k, (cell % 2) * 0.5 + uv.getX(k) * 0.5, 0.5 - Math.floor(cell / 2) * 0.5 + uv.getY(k) * 0.5);
        const x = -0.6 + c * 0.3 + (rnd() - 0.5) * 0.06, y = 1.66 - r * 0.29 + (rnd() - 0.5) * 0.04;
        A.add(geo, at(x, y, 0.052 + i * 0.0015, 0, 0, (rnd() - 0.5) * 0.25), 'card', tints[i % tints.length]);
        A.add(sph(0.014, 6, 4), at(x, y + h / 2 - 0.025, 0.07), 'gold', i % 3 ? COL.gold : COL.red);
        i++;
      }
    }
    // 顶上的小屋檐
    A.add(box(2.0, 0.12, 0.16), at(0, 1.96, 0), 'paint', COL.wood);
    for (const s of [-1, 1]) A.add(uvScale(box(2.25, 0.04, 0.5), 4, 1), at(0, 2.2, s * 0.21, s * 0.5), 'gtile', [1, 1, 1]);
    A.add(cyl(0.045, 0.045, 2.32, 8), at(0, 2.33, 0, 0, 0, PI / 2), 'paint', COL.dark);
    for (const sx of [-1, 1]) A.add(new THREE.ConeGeometry(0.05, 0.2, 6), at(sx * 1.17, 2.38, 0, 0, 0, -sx * 0.6), 'paint', COL.dark);
    // 匾：留言板
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.22), G.lambert({ map: tex.boardSign, emissive: 0xffffff, emissiveMap: tex.boardSign, emissiveIntensity: 0.35 }));
    sg.position.set(0, 1.97, 0.09);
    bg.add(sg);
    // 下面一排许愿木牌
    A.add(cyl(0.008, 0.008, 1.66, 4), at(0, 0.66, 0.03, 0, 0, PI / 2), 'paint', COL.red);
    for (let k = 0; k < 6; k++) {
      const x = -0.62 + k * 0.25 + (rnd() - 0.5) * 0.04, l = 0.06 + rnd() * 0.05;
      A.add(cyl(0.004, 0.004, l, 3), at(x, 0.66 - l / 2, 0.03), 'paint', COL.red);
      A.add(box(0.09, 0.15, 0.014), at(x, 0.66 - l - 0.075, 0.03, 0, 0, (rnd() - 0.5) * 0.2), 'paint', COL.woodL);
      A.add(cyl(0.006, 0.01, 0.1, 4), at(x, 0.66 - l - 0.2, 0.03), 'paint', COL.red);
    }
    M.cols.circles.push({ x: C.x + bx - Math.cos(ry) * 0.6, z: C.z + bz + Math.sin(ry) * 0.6, r: 0.4 }, { x: C.x + bx, z: C.z + bz, r: 0.4 }, { x: C.x + bx + Math.cos(ry) * 0.6, z: C.z + bz - Math.sin(ry) * 0.6, r: 0.4 });
    G.Tap.add(G.Tap.proxy(bg, 0.8, 0, 1.3, 0), 5, () => G.UI.board(), { hint: L(bx, 2.65, bz), hintDist: 7, enabled: () => M.on });
  }

  /* ================= 玉兔和药臼 ================= */
  function rabbit(A, mats) {
    const HX = 4.6, HZ = 2.6, REST = -0.36;
    const fx = Math.sin(REST), fz = Math.cos(REST);
    const MX = HX + fx * 0.45, MZ = HZ + fz * 0.45;
    const W = COL.white, PINK = hex(0xffb3c4);
    const rb = new THREE.Group();
    const ra = new Acc();
    ra.add(sph(1, 22, 16), T(0, 0.25, -0.03, -0.25, 0, 0, [0.21, 0.26, 0.25]), 'fur', W);
    ra.add(sph(1, 16, 12), T(0, 0.33, 0.09, 0, 0, 0, [0.15, 0.16, 0.13]), 'fur', W);
    for (const s of [-1, 1]) {
      ra.add(sph(1, 14, 10), T(s * 0.125, 0.14, -0.08, 0, 0, 0, [0.11, 0.13, 0.16]), 'fur', W);
      ra.add(sph(1, 12, 8), T(s * 0.12, 0.035, 0.07, 0, 0, 0, [0.06, 0.038, 0.13]), 'fur', W);
      ra.add(sph(1, 10, 8), T(s * 0.08, 0.4, 0.15, 0.95, 0, -s * 0.35, [0.042, 0.1, 0.042]), 'fur', W);
    }
    ra.add(sph(1, 12, 10), T(0, 0.15, -0.27, 0, 0, 0, 0.075), 'fur', W);
    ra.build(mats, rb);
    const head = new THREE.Group();
    head.position.set(0, 0.57, 0.08);
    rb.add(head);
    const ha = new Acc();
    ha.add(sph(1, 22, 16), T(0, 0, 0, 0, 0, 0, [0.155, 0.142, 0.15]), 'fur', W);
    for (const s of [-1, 1]) {
      ha.add(sph(1, 14, 10), T(s * 0.058, -0.052, 0.098, 0, 0, 0, [0.068, 0.058, 0.062]), 'fur', W);
      ha.add(sph(1, 12, 10), T(s * 0.084, 0.022, 0.112, 0, s * 0.35, 0, [0.026, 0.031, 0.02]), 'paint', [0.32, 0.06, 0.14]);
      ha.add(sph(1, 8, 6), T(s * 0.084 + 0.009, 0.036, 0.13, 0, 0, 0, 0.0085), 'glow', [1, 1, 1]);
      ha.add(sph(1, 10, 8), T(s * 0.102, -0.042, 0.1, 0, s * 0.5, 0, [0.03, 0.017, 0.01]), 'paint', PINK);
    }
    ha.add(sph(1, 10, 8), T(0, -0.027, 0.153, 0, 0, 0, [0.02, 0.014, 0.012]), 'paint', PINK);
    // 头上别着一小枝桂花
    for (let i = 0; i < 6; i++) ha.add(new THREE.IcosahedronGeometry(0.019, 0), T(0.075 + Math.cos(i * 1.1) * 0.03, 0.11 + Math.sin(i * 1.7) * 0.02, 0.05 + Math.sin(i) * 0.02), 'gold', COL.osm);
    ha.add(sph(1, 6, 4), T(0.05, 0.1, 0.03, 0, 0.6, 0.6, [0.045, 0.008, 0.018]), 'leaf', COL.leafM);
    ha.build(mats, head);
    const ears = [];
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.058, 0.1, -0.025);
      ear.rotation.set(-0.18, 0, -s * 0.16);
      head.add(ear);
      const ea = new Acc();
      ea.add(sph(1, 14, 10), T(0, 0.16, 0, 0, 0, 0, [0.05, 0.17, 0.027]), 'fur', W);
      ea.add(sph(1, 10, 8), T(0, 0.16, 0.016, 0, 0, 0, [0.03, 0.14, 0.012]), 'paint', PINK);
      ea.build(mats, ear);
      ears.push(ear);
    }
    const pestle = new THREE.Group();
    pestle.position.set(0, 0.44, 0.2);
    rb.add(pestle);
    const pa = new Acc();
    pa.add(tube([v3(0, 0.08, -0.07), v3(0, -0.06, 0.07), v3(0, -0.2, 0.2)], 0.019, 0.026, 7, 4), new THREE.Matrix4(), 'paint', COL.woodL);
    pa.add(sph(1, 10, 8), T(0, -0.21, 0.21, 0, 0, 0, 0.034), 'paint', COL.woodL);
    for (const s of [-1, 1]) pa.add(sph(1, 10, 8), T(s * 0.036, 0, 0, 0, 0, 0, [0.04, 0.034, 0.045]), 'fur', W);
    pa.build(mats, pestle);
    M.group.add(rb);
    // 药臼：石臼里装着发光的仙药
    const MM = T(C.x + MX, 0, C.z + MZ, 0, 0, 0, 1).clone();
    A.add(cyl(0.27, 0.29, 0.06, 8), T(0, 0.03, 0, 0, 0, 0, 1, MM), 'stone', COL.stone3);
    A.add(lathe([[0, 0.06], [0.15, 0.06], [0.175, 0.09], [0.18, 0.27], [0.2, 0.3], [0.15, 0.315], [0.13, 0.28], [0.115, 0.13], [0, 0.13]], 20), MM, 'stone', COL.stone2);
    A.add(new THREE.CircleGeometry(0.128, 18), T(0, 0.23, 0, -PI / 2, 0, 0, 1, MM), 'glow', COL.jade);
    glowAt(0xc8ffe0, 0.9, 0.4, C.x + MX, 0.32, C.z + MZ);
    M.pools.push([MX, MZ, 1.2, 0.35]);
    M.cols.circles.push({ x: C.x + MX, z: C.z + MZ, r: 0.3 });
    M.rabbit = { g: rb, head, pestle, ears, home: L(HX, 0, HZ), x: C.x + HX, z: C.z + HZ, t: 0, hop: 0, target: null, next: 6, heading: REST, rest: REST, mortar: L(MX, 0.36, MZ), prevS: 0 };
    rb.position.set(M.rabbit.x, 0, M.rabbit.z);
    rb.scale.setScalar(1.2);
    G.Tap.add(G.Tap.proxy(rb, 0.4, 0, 0.45, 0), 4.5, () => {
      const R = M.rabbit;
      R.hop = 1;
      R.happy = 2.5;
      G.Things.emit('heart', v3(R.x, 1.0, R.z), 4, { spread: 0.2, velRand: 0.35, vel: v3(0, 0.35, 0), stagger: 0.25 });
      G.Audio.sfx('squeak');
    }, { hint: (v) => v.set(M.rabbit.x, 1.35, M.rabbit.z), hintDist: 6, enabled: () => M.on });
  }

  /* ================= 新月秋千 ================= */
  function swing(A, tex, mats, rnd) {
    const cr = new THREE.Group();
    const R0 = 2.6, R1 = 2.25, DX = 0.95;
    const ix = (R0 * R0 - R1 * R1 + DX * DX) / (2 * DX), iy = Math.sqrt(R0 * R0 - ix * ix);
    const a0 = Math.atan2(iy, ix), b0 = Math.atan2(iy, ix - DX);
    const sh = new THREE.Shape();
    sh.absarc(0, 0, R0, a0, 2 * PI - a0, false);
    sh.absarc(DX, 0, R1, 2 * PI - b0, b0, true);
    const cg = new THREE.ExtrudeGeometry(sh, { depth: 0.34, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.11, bevelSegments: 4, curveSegments: 72 }).translate(0, 0, -0.17);
    const cm = new THREE.Mesh(cg, G.lambert({ color: 0xfff2cc, map: tex.cres, emissive: 0xfff0c8, emissiveMap: tex.cres, emissiveIntensity: 0.82 }));
    cr.add(cm);
    cr.position.copy(L(10, 6.4, -5));
    cr.rotation.set(0, -0.5, 0.22);
    M.group.add(cr);
    glowAt(0xfff0c0, 11, 0.3, cr.position.x, cr.position.y, cr.position.z);
    glowAt(0xfff6d8, 4.5, 0.22, cr.position.x - 1.2, cr.position.y + 0.2, cr.position.z + 0.3);
    cr.updateMatrixWorld(true);
    const tip = v3(ix, -iy, 0).applyMatrix4(cm.matrixWorld);
    // 挂秋千的小金杆
    const sw = (M.swing = { pivot: tip, L: tip.y - 0.65, th: 0, om: 0.4, seated: false });
    A.add(cyl(0.035, 0.035, 0.78, 10), T(tip.x, tip.y, tip.z, 0, 0.5, PI / 2), 'gold', COL.gold);
    for (const s of [-1, 1]) A.add(sph(0.05, 10, 8), T(tip.x + Math.cos(0.5) * s * 0.39, tip.y, tip.z - Math.sin(0.5) * s * 0.39), 'gold', COL.gold);
    const sg = new THREE.Group();
    sg.position.copy(tip);
    sg.rotation.order = 'YXZ';
    sg.rotation.y = 0.5;
    const sa = new Acc();
    const ropeG = cyl(0.013, 0.013, sw.L, 5), lfG = sph(1, 6, 4), flG = new THREE.IcosahedronGeometry(0.03, 0);
    for (const sx of [-0.28, 0.28]) {
      sa.add(ropeG, T(sx, -sw.L / 2, 0), 'paint', [0.86, 0.8, 0.66]);
      // 缠在绳子上的藤叶和小花
      for (let y = 0.15; y < sw.L - 0.1; y += 0.19) {
        const a = y * 9 + sx * 5;
        sa.add(lfG, T(sx + Math.cos(a) * 0.03, -y, Math.sin(a) * 0.03, 0.3, -a, 0.4, [0.05, 0.01, 0.022]), 'leaf', COL.leafM);
        if (rnd() < 0.45) sa.add(flG, T(sx + Math.cos(a + 2) * 0.03, -y - 0.05, Math.sin(a + 2) * 0.03), 'glow', rnd() < 0.5 ? [1, 0.86, 0.92] : [1, 0.97, 0.88]);
      }
    }
    sa.add(box(0.72, 0.05, 0.26), T(0, -sw.L, 0), 'paint', COL.woodL);
    sa.add(box(0.62, 0.04, 0.22), T(0, -sw.L + 0.045, 0), 'paint', COL.cushion);
    for (const sx of [-0.36, 0.36]) sa.add(box(0.03, 0.07, 0.28), T(sx, -sw.L, 0), 'gold', COL.gold);
    sa.build(mats, sg);
    M.group.add(sg);
    sw.g = sg;
    // 秋千绕着自己的 x 轴转（先转了 0.5 的朝向），座位往 -(sin0.5, cos0.5) 那边荡出去；镜头要跟着同一个方向
    const SWF = v3(-Math.sin(0.5), 0, -Math.cos(0.5));
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
    // 新月下沿挂着几颗小星星
    const st = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * PI * 2 + PI / 2, r = i % 2 ? 0.05 : 0.12;
      st[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    const starG = new THREE.ExtrudeGeometry(st, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 1 }).translate(0, 0, -0.0125);
    const starM = M.room(0xffe08a, 0.85), thM = M.room(0xfff2d0, 0.6);
    M.dangles = [];
    for (const [ang, len] of [[3.45, 0.9], [3.8, 0.55], [4.15, 1.15], [4.5, 0.7]]) {
      const ap = v3(Math.cos(ang) * R0, Math.sin(ang) * R0, 0).applyMatrix4(cm.matrixWorld);
      const dg = new THREE.Group();
      dg.position.copy(ap);
      const th = new THREE.Mesh(cyl(0.004, 0.004, len, 3), thM);
      th.position.y = -len / 2;
      dg.add(th);
      const s = new THREE.Mesh(starG, starM);
      s.position.y = -len - 0.1;
      dg.add(s);
      const sgl = G.glow(0xffe8a0, 0.6, 0.4);
      sgl.position.y = -len - 0.1;
      dg.add(sgl);
      M.group.add(dg);
      M.dangles.push({ g: dg, s, ph: rnd() * 6 });
    }
  }

  /* ================= 月洞门、粉墙灰瓦、竹子 ================= */
  function gate(A, tex, rnd) {
    const GZ = -13, W = 4.6, HT = 3.85, CY = 1.6, CR = 1.55;
    const GM = new THREE.Matrix4().makeTranslation(C.x, 0, C.z + GZ);
    const at = (x, y, z, rx, ry, rz, s) => T(x, y, z, rx, ry, rz, s, GM);
    const sh = new THREE.Shape();
    sh.moveTo(-W, -0.3);
    sh.lineTo(W, -0.3);
    sh.lineTo(W, HT);
    sh.lineTo(-W, HT);
    sh.lineTo(-W, -0.3);
    const hole = new THREE.Path();
    hole.absarc(0, CY, CR, 0, PI * 2, true);
    sh.holes.push(hole);
    A.add(new THREE.ExtrudeGeometry(sh, { depth: 0.42, bevelEnabled: false, curveSegments: 56 }).translate(0, 0, -0.21), GM, 'plaster', [0.8, 0.79, 0.83]);
    // 门洞一圈石框
    const ring = new THREE.Shape();
    ring.absarc(0, CY, CR + 0.17, 0, PI * 2, false);
    const rh = new THREE.Path();
    rh.absarc(0, CY, CR, 0, PI * 2, true);
    ring.holes.push(rh);
    A.add(new THREE.ExtrudeGeometry(ring, { depth: 0.52, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 56 }).translate(0, 0, -0.26), GM, 'stone', COL.stone2);
    // 墙脚、墙头
    for (const s of [-1, 1]) A.add(box(W - 1.25 + 0.06, 0.42, 0.5), at((s * (W + 1.25)) / 2, 0.21, 0), 'stone', COL.stone3);
    A.add(box(2 * W + 0.14, 0.12, 0.56), at(0, HT + 0.06, 0), 'paint', COL.dark);
    for (const s of [-1, 1]) A.add(uvScale(box(2 * W + 0.6, 0.05, 0.46), 18, 1), at(0, HT + 0.24, s * 0.2, s * 0.52), 'gtile', [1, 1, 1]);
    A.add(cyl(0.065, 0.065, 2 * W + 0.7, 8), at(0, HT + 0.38, 0, 0, 0, PI / 2), 'paint', COL.dark);
    for (const s of [-1, 1]) A.add(new THREE.ConeGeometry(0.07, 0.3, 6), at(s * (W + 0.42), HT + 0.45, 0, 0, 0, -s * 0.7), 'paint', COL.dark);
    for (const s of [-1, 1]) A.add(box(0.36, HT + 0.1, 0.5), at(s * (W + 0.08), (HT + 0.1) / 2, 0), 'stone', COL.stone2);
    // 门槛石
    A.add(box(2.2, 0.05, 0.7), at(0, 0.025, 0), 'stone', COL.stone2);
    // 匾：回草原
    const pq = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.35), G.lambert({ map: tex.gateSign, emissive: 0xffffff, emissiveMap: tex.gateSign, emissiveIntensity: 0.3 }));
    pq.position.set(C.x, CY + CR + 0.38, C.z + GZ + 0.245);
    M.group.add(pq);
    A.add(box(1.15, 0.45, 0.04), at(0, CY + CR + 0.38, 0.215), 'paint', COL.dark);
    // 门里看得见草原的黄昏
    const portal = new THREE.Mesh(new THREE.CircleGeometry(CR, 64), new THREE.ShaderMaterial({
      uniforms: { uTime: G.U.uTime },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform float uTime; varying vec2 vUv;',
        'void main(){',
        '  vec2 q = vUv - 0.5; float r = length(q) * 2.0; float a = atan(q.y, q.x);',
        '  float sw = sin(a * 3.0 - uTime * 1.1 + r * 7.0) * 0.025 * r;',
        '  vec2 p = vUv + vec2(sw, sw * 0.6);',
        '  vec3 sky = mix(vec3(1.0, 0.66, 0.42), vec3(0.45, 0.4, 0.74), smoothstep(0.42, 0.98, p.y));',
        '  sky += vec3(1.0, 0.82, 0.55) * exp(-length((p - vec2(0.3, 0.47)) * vec2(1.0, 1.7)) * 9.0) * 0.9;',
        '  float hill = 0.42 + 0.045 * sin(p.x * 7.0 + 1.0) + 0.025 * sin(p.x * 17.0 + 2.0);',
        '  vec3 grass = mix(vec3(0.22, 0.36, 0.16), vec3(0.62, 0.62, 0.28), smoothstep(hill - 0.3, hill, p.y));',
        '  float house = step(abs(p.x - 0.64), 0.045) * step(p.y, hill + 0.05) * step(hill - 0.02, p.y) + step(abs(p.x - 0.64), 0.06 - (p.y - hill - 0.05) * 1.1) * step(hill + 0.05, p.y) * step(p.y, hill + 0.1);',
        '  vec3 col = p.y < hill ? grass : sky;',
        '  col = mix(col, vec3(0.62, 0.2, 0.16), house * 0.85);',
        '  col += vec3(1.0, 0.85, 0.5) * step(abs(p.x - 0.64), 0.012) * step(abs(p.y - hill - 0.015), 0.012) * 0.8;',
        '  float edge = smoothstep(0.62, 1.0, r);',
        '  col = mix(col, vec3(0.78, 0.86, 1.0), edge * (0.7 + 0.3 * sin(a * 5.0 + uTime * 2.0)));',
        '  gl_FragColor = vec4(col, smoothstep(1.0, 0.965, r) * 0.93);',
        '}'
      ].join('\n')
    }));
    portal.position.set(C.x, CY, C.z + GZ);
    M.group.add(portal);
    glowAt(0xffe0c0, 5.5, 0.32, C.x, CY, C.z + GZ + 0.3);
    M.pools.push([0, GZ + 1.2, 2.6, 0.32]);
    M.gate = L(0, 0, GZ);
    M.cols.rects.push({ x0: C.x - W - 0.3, x1: C.x - 1.0, z0: C.z + GZ - 0.28, z1: C.z + GZ + 0.28 }, { x0: C.x + 1.0, x1: C.x + W + 0.3, z0: C.z + GZ - 0.28, z1: C.z + GZ + 0.28 });
    // 墙边的竹子
    const leafG = new THREE.PlaneGeometry(0.34, 0.075);
    const clumps = [[-W - 1.1, GZ + 0.2, 7], [W + 1.1, GZ - 0.1, 7], [-2.8, GZ - 1.1, 5], [3.2, GZ - 1.2, 5]];
    for (const [cx, cz, n] of clumps) {
      for (let i = 0; i < n; i++) {
        const x = cx + (rnd() - 0.5) * 1.2, z = cz + (rnd() - 0.5) * 1.0, h = 3.4 + rnd() * 2.4, r = 0.035 + rnd() * 0.02;
        const SM = T(C.x + x, M.rawH(x, z) - 0.1, C.z + z, (rnd() - 0.5) * 0.18, rnd() * 6, (rnd() - 0.5) * 0.18, 1).clone();
        const seg = 0.42 + rnd() * 0.1, ns = Math.floor(h / seg);
        for (let s = 0; s < ns; s++) {
          A.add(cyl(r * (1 - s / ns * 0.4), r * (1 - s / ns * 0.4) * 1.04, seg - 0.02, 7), T(0, s * seg + seg / 2, 0, 0, 0, 0, 1, SM), 'paint', shade(COL.bamboo, 0.9 + rnd() * 0.15));
          A.add(cyl(r * 1.15, r * 1.15, 0.02, 7), T(0, (s + 1) * seg, 0, 0, 0, 0, 1, SM), 'paint', shade(COL.bamboo, 1.2));
          if (s > ns * 0.45) {
            for (let k = 0; k < 2; k++) {
              const a = rnd() * 6.28;
              for (let f = 0; f < 4; f++) {
                const la = a + (f - 1.5) * 0.35;
                A.add(leafG, T(Math.cos(la) * 0.17, (s + 1) * seg - 0.04 - f * 0.03, Math.sin(la) * 0.17, 0.25 + rnd() * 0.3, -la, -0.35 - rnd() * 0.3, 1, SM), 'bleaf', shade([0.3, 0.52, 0.4], 0.8 + rnd() * 0.35));
              }
            }
          }
        }
      }
      M.cols.circles.push({ x: C.x + cx, z: C.z + cz, r: 0.75 });
    }
  }

  /* ================= 组装 ================= */
  M.buildParts = function (g) {
    const tex = makeTextures();
    const mats = {
      stone: vcMat(0.1),
      paint: vcMat(0.22),
      gold: vcMat(0.4),
      glow: vcMat(0.92),
      bark: vcMat(0.12),
      leaf: vcMat(0.2),
      rock: vcMat(0.1),
      fur: vcMat(0.3),
      beam: vcMat(0.3, { map: tex.beam }),
      lattice: vcMat(0.3, { map: tex.lattice, alphaTest: 0.5 }),
      ceil: vcMat(0.35, { map: tex.ceil }),
      card: vcMat(0.35, { map: tex.card }),
      gtile: vcMat(0.14, { map: tex.gtile }),
      plaster: vcMat(0.12, { map: tex.plaster }),
      bleaf: vcMat(0.2, { map: tex.leaf, alphaTest: 0.45 })
    };
    const rnd = G.rng(9191);
    const A = new Acc();
    pavilion(A, tex);
    paths(A, rnd);
    for (const [x, z] of [[-1.75, 8.6], [1.75, 8.6], [-1.75, 15.2], [1.75, 15.2], [-2.4, -10.4], [2.4, -10.4]]) stoneLantern(A, x, z, rnd() * 0.6);
    moonFlowers(A, rnd);
    rocks(A, rnd);
    tree(A, rnd);
    board(A, tex, rnd);
    rabbit(A, mats);
    swing(A, tex, mats, rnd);
    gate(A, tex, rnd);
    A.build(mats, g);
    // 空中慢慢飘的光尘
    const mp = [];
    for (let i = 0; i < 150; i++) {
      const a = rnd() * 6.283, r = 2 + Math.sqrt(rnd()) * 26, x = Math.cos(a) * r, z = Math.sin(a) * r;
      mp.push(C.x + x, M.rawH(x, z) + 0.4 + rnd() * 4.5, C.z + z);
    }
    g.add(glowPoints(mp, 0xe8e0ff, 0.12, 1));
  };

  /* ---------- 每帧的小动画 ---------- */
  M.animate = function (dt, t, P) {
    for (const gl of M.glows) gl.material.opacity = gl.userData.baseOpacity * (0.86 + 0.14 * Math.sin(t * 3 + gl.position.x * 1.7 + gl.position.z));
    // 桂花飘落
    const Pt = M.petals;
    Pt.v.forEach((p, i) => {
      p.y -= p.s * dt;
      if (p.y < 0) {
        p.y = 4.6 + Math.random();
        p.a = Math.random() * 6.283;
        p.r = Math.random() * 3.0;
      }
      Pt.p[i * 3] = Pt.ox + Math.cos(p.a) * p.r + Math.sin(t * 0.8 + p.ph) * 0.3;
      Pt.p[i * 3 + 1] = p.y;
      Pt.p[i * 3 + 2] = Pt.oz + Math.sin(p.a) * p.r + Math.cos(t * 0.7 + p.ph) * 0.3;
    });
    Pt.pts.geometry.attributes.position.needsUpdate = true;
    for (const r of M.ribbons) {
      r.g.rotation.z = Math.sin(t * 0.9 + r.ph) * 0.08;
      r.g.rotation.x = Math.sin(t * 0.7 + r.ph * 1.3) * 0.05;
    }
    for (const d of M.dangles) {
      d.s.rotation.y = t * 0.7 + d.ph;
      d.g.rotation.z = Math.sin(t * 0.8 + d.ph) * 0.04;
    }
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
          R.heading = R.rest;
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
    const ps = Math.sin(t * 4), pc = Math.cos(t * 4);
    R.pestle.rotation.x = pound ? -0.6 + Math.pow(Math.abs(ps), 0.7) * 0.9 : -0.2;
    R.head.rotation.x = pound ? 0.15 + Math.abs(ps) * 0.08 : -0.1;
    R.head.rotation.z = R.happy > 0 ? Math.sin(t * 10) * 0.15 : 0;
    R.ears[0].rotation.x = -0.18 + Math.max(0, Math.sin(t * 1.3)) * 0.12 * Math.max(0, Math.sin(t * 7));
    R.ears[1].rotation.x = -0.18 + Math.max(0, Math.sin(t * 1.1 + 2)) * 0.12 * Math.max(0, Math.sin(t * 7 + 1));
    // 杵落到臼底的那一下：“笃”一声，臼里冒一点小亮光（离得近才有）
    if (pound && R.prevS > 0 !== pc > 0) {
      const d = Math.hypot(P.x - R.x, P.z - R.z);
      if (d < 11) {
        G.Audio.sfx('pound', G.clamp(1.25 - d / 9, 0.08, 1));
        if (Math.random() < 0.6) G.Things.emit('star', R.mortar, 1, { spread: 0.12, velRand: 0.25, vel: v3(0, 0.45, 0), size: 0.7 });
      }
    }
    R.prevS = pc;
    // 新月秋千：先按这一帧镜头用的角度摆好模型，再算下一帧（镜头和秋千不会差一帧）
    const sw = M.swing;
    sw.g.rotation.x = sw.th;
    let acc = -(9.8 / 6 / sw.L) * Math.sin(sw.th) * 6 - (sw.seated ? 0.03 : 0.12) * sw.om;
    if (sw.seated) {
      const amp = Math.sqrt(sw.th * sw.th + (sw.om * sw.om) / (9.8 / sw.L));
      if (amp < 0.45) acc += Math.sign(sw.om || 1) * 0.4;
    }
    sw.om += acc * dt;
    sw.th += sw.om * dt;
  };
})();
