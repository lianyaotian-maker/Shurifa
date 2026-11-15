/* 草原小屋 · 地形高度、小路、树的位置，以及烘焙进贴图的阴影 */
(function () {
  'use strict';
  const HALF = 112, N = 256, CELL = (2 * HALF) / N;

  const HILLS = [
    [-30, 12, 7, 11], [26, -24, 5.5, 10], [34, 18, 3.5, 8],
    [-16, -34, 4, 9], [8, 47, 2.5, 10], [-44, -8, 3, 9], [-6, -42, 3, 12]
  ];
  const HOUSE = { x0: -3.6, x1: 3.6, z0: -2.8, z1: 2.8 };
  const PORCH = { x0: -1.45, x1: 1.45, z0: 2.8, z1: 4.4 };
  const TREES = [
    { x: 8.4, z: -4.6, type: 'oak', s: 1.12 },
    { x: -6.8, z: 9.6, type: 'blossom', s: 0.92 },
    { x: -30, z: 12, type: 'oak', s: 1.35 },
    { x: 24, z: -27, type: 'pine', s: 1.1 },
    { x: 29.5, z: -21, type: 'pine', s: 0.9 },
    { x: 20.5, z: -20.5, type: 'pine', s: 0.8 },
    { x: -14, z: -2.5, type: 'pine', s: 1.0 },
    { x: 13.5, z: 15, type: 'oak', s: 0.95 },
    { x: -20, z: 28, type: 'blossom', s: 0.8 },
    { x: 38, z: 4, type: 'oak', s: 1.0 },
    { x: -38, z: -24, type: 'pine', s: 1.2 }
  ];
  const SPAWN = { x: 1.9, z: 31.5 };

  // 小路：控制点 → Catmull-Rom 细分成 16 个点（着色器也用同一组点）
  const CTRL = [[3.0, 44], [0.2, 35], [2.2, 26], [-0.8, 17], [0.8, 10], [0, 4.3]];
  function catmull(pts, n) {
    const out = [], segs = pts.length - 1;
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * segs;
      const s = Math.min(Math.floor(t), segs - 1), u = t - s;
      const p0 = pts[Math.max(s - 1, 0)], p1 = pts[s], p2 = pts[s + 1], p3 = pts[Math.min(s + 2, segs)];
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
    return out;
  }
  const PATH = catmull(CTRL, 16);
  function pathDist(x, z) {
    let best = 1e9;
    for (let i = 0; i < PATH.length - 1; i++) {
      const ax = PATH[i][0], az = PATH[i][1], vx = PATH[i + 1][0] - ax, vz = PATH[i + 1][1] - az;
      const t = G.clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1);
      const d = Math.hypot(x - ax - vx * t, z - az - vz * t);
      if (d < best) best = d;
    }
    return best;
  }
  function rectDist(x, z, r) {
    const dx = Math.max(r.x0 - x, 0, x - r.x1), dz = Math.max(r.z0 - z, 0, z - r.z1);
    return Math.hypot(dx, dz);
  }

  const SD = G.U.uSunDir.value;
  const sdH = Math.hypot(SD.x, SD.z);
  const hx = SD.x / sdH, hz = SD.z / sdH, tanE = SD.y / sdH;

  function rawHeight(x, z) {
    let h = 0;
    for (let i = 0; i < HILLS.length; i++) {
      const c = HILLS[i], dx = x - c[0], dz = z - c[1];
      h += c[2] * Math.exp(-(dx * dx + dz * dz) / (2 * c[3] * c[3]));
    }
    h += 0.55 * Math.sin(x * 0.071 + 1.3) * Math.sin(z * 0.063 + 0.4) + 0.3 * Math.sin(x * 0.13 - z * 0.09 + 2.0);
    const r = Math.hypot(x, z);
    if (r > 70) {
      const a = Math.atan2(z, x);
      let ring = 11 + 7 * Math.sin(a * 3 + 0.5) + 4 * Math.sin(a * 7 + 1.7) + 2.5 * Math.sin(a * 13 + 0.3);
      const sd = Math.max(0, (x * hx + z * hz) / r); // 夕阳方向的山压低，让太阳落在开阔的天边
      ring *= 1 - 0.6 * sd * sd;
      h += ring * G.smooth(78, 135, r);
    }
    return h;
  }
  function height(x, z) {
    return rawHeight(x, z) * G.smooth(1.5, 11, rectDist(x, z, HOUSE));
  }

  // 树冠遮挡体（用于阴影）
  function treeTop(t) {
    return height(t.x, t.z);
  }
  const OCC = [];
  for (const t of TREES) {
    const y = treeTop(t), s = t.s;
    if (t.type === 'oak') {
      OCC.push({ x: t.x, y: y + 4.6 * s, z: t.z, r: 2.5 * s, pine: false });
      OCC.push({ x: t.x, y: y + 5.9 * s, z: t.z, r: 1.5 * s, pine: false });
    } else if (t.type === 'blossom') {
      OCC.push({ x: t.x, y: y + 3.6 * s, z: t.z, r: 2.2 * s, pine: false });
    } else {
      OCC.push({ x: t.x, y: y + 2.6 * s, z: t.z, r: 1.8 * s, pine: true });
      OCC.push({ x: t.x, y: y + 4.4 * s, z: t.z, r: 1.3 * s, pine: true });
      OCC.push({ x: t.x, y: y + 6.0 * s, z: t.z, r: 0.8 * s, pine: true });
    }
  }

  function inHouse(px, py, pz) {
    if (py < -0.5) return false;
    const az = Math.abs(pz);
    if (Math.abs(px) < 4.0 && az < 3.3 && py < 4.75 - 0.643 * az) return true;
    if (Math.abs(px - 2.1) < 0.32 && Math.abs(pz + 1.1) < 0.32 && py < 5.45) return true;
    return false;
  }

  function blur(arr) {
    const tmp = new Float32Array(arr.length);
    const k = [1, 4, 6, 4, 1];
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
          let s = 0;
          for (let o = -2; o <= 2; o++) s += arr[j * N + G.clamp(i + o, 0, N - 1)] * k[o + 2];
          tmp[j * N + i] = s / 16;
        }
      for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
          let s = 0;
          for (let o = -2; o <= 2; o++) s += tmp[G.clamp(j + o, 0, N - 1) * N + i] * k[o + 2];
          arr[j * N + i] = s / 16;
        }
    }
  }

  let grid = null;
  function hAt(x, z) {
    const fx = G.clamp((x + HALF) / CELL - 0.5, 0, N - 1.001), fz = G.clamp((z + HALF) / CELL - 0.5, 0, N - 1.001);
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
    const a = grid[j * N + i], b = grid[j * N + i + 1], c = grid[(j + 1) * N + i], d = grid[(j + 1) * N + i + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function build() {
    grid = new Float32Array(N * N);
    const mask = new Float32Array(N * N), shS = new Float32Array(N * N), shT = new Float32Array(N * N);
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) grid[j * N + i] = height(-HALF + (i + 0.5) * CELL, -HALF + (j + 0.5) * CELL);

    for (let j = 0; j < N; j++) {
      const z = -HALF + (j + 0.5) * CELL;
      for (let i = 0; i < N; i++) {
        const x = -HALF + (i + 0.5) * CELL, idx = j * N + i, h0 = grid[idx];
        const r = Math.hypot(x, z);
        let s = 0, a = 0;
        // 房子的影子
        const along = -x * hx - z * hz, perp = Math.abs(-x * hz + z * hx);
        if (along > -5 && along < 24 && perp < 6.5) {
          for (let t = 0; t < 24; t += 0.3) {
            if (inHouse(x + hx * t, h0 + 0.1 + tanE * t, z + hz * t)) { s = 1; break; }
          }
        }
        // 山丘的影子
        if (!s && r < 92) {
          for (let t = 1; t < 46; t += 0.7) {
            const py = h0 + 0.12 + tanE * t;
            if (py > 10.5) break;
            if (py < hAt(x + hx * t, z + hz * t) - 0.05) { s = 1; break; }
          }
        }
        // 树冠（解析的射线-球求交）
        const oy = h0 + 0.1;
        for (let k = 0; k < OCC.length; k++) {
          const o = OCC[k];
          const lx = o.x - x, ly = o.y - oy, lz = o.z - z;
          const tca = lx * SD.x + ly * SD.y + lz * SD.z;
          if (tca < 0 || tca > 90) continue;
          const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
          if (d2 < o.r * o.r) {
            const f = 0.8 * (1 - G.smooth(0.5, 1.0, Math.sqrt(d2) / o.r));
            if (o.pine) s = Math.max(s, f);
            else a = Math.max(a, f);
          }
        }
        // 墙根的柔和暗部
        s = Math.max(s, (1 - G.smooth(0, 1.4, rectDist(x, z, HOUSE))) * 0.45);
        shS[idx] = s;
        shT[idx] = a;
        // 不长草的地方：小路、房子、门廊、树干
        let m = 1 - G.smooth(0.6, 1.05, pathDist(x, z));
        m = Math.max(m, 1 - G.smooth(0.05, 0.45, rectDist(x, z, HOUSE)));
        m = Math.max(m, 1 - G.smooth(0.0, 0.3, rectDist(x, z, PORCH)));
        for (const t of TREES) m = Math.max(m, 1 - G.smooth(0.35 * t.s, 0.8 * t.s, Math.hypot(x - t.x, z - t.z)));
        mask[idx] = m;
      }
    }
    blur(shS);
    blur(shT);

    const data = new Uint16Array(N * N * 4);
    const H = THREE.DataUtils.toHalfFloat;
    for (let k = 0; k < N * N; k++) {
      data[k * 4] = H(grid[k]);
      data[k * 4 + 1] = H(mask[k]);
      data[k * 4 + 2] = H(Math.min(1, shS[k]));
      data[k * 4 + 3] = H(Math.min(1, shT[k]));
    }
    const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.HalfFloatType);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    G.U.uField.value = tex;
    G.U.uFieldHalf.value = HALF;
    G.U.uPath.value = PATH.map((p) => new THREE.Vector2(p[0], p[1]));
    return tex;
  }

  G.Field = { HALF, N, HOUSE, PORCH, TREES, SPAWN, PATH, height, hAt, pathDist, rectDist, build };
})();
