/* 草原小屋 · 天空、远山、地面、草、野花 */
(function () {
  'use strict';
  const SH = G.SH;
  const N = {};

  /* ---------- 天空 ---------- */
  function buildSky(scene) {
    const m = SH.mat(SH.SKY_VS, SH.SKY_FS, {}, { side: THREE.BackSide, depthWrite: false });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), m);
    sky.frustumCulled = false;
    sky.renderOrder = -100;
    scene.add(sky);
  }

  /* ---------- 远山（两层剪影） ---------- */
  function buildMountains(scene) {
    const sun = G.U.uSunDir.value;
    const sh = new THREE.Vector2(sun.x, sun.z).normalize();
    const rings = [
      { R: 235, base: 26, amp: 30, haze: 0.42, seed: 1.3, tint: 0.92 },
      { R: 305, base: 44, amp: 42, haze: 0.62, seed: 4.1, tint: 1.04 }
    ];
    for (const ring of rings) {
      const M = 200, pos = [], hs = [], idx = [];
      for (let i = 0; i <= M; i++) {
        const a = (i / M) * Math.PI * 2;
        const dx = Math.cos(a), dz = Math.sin(a);
        let h = ring.base + ring.amp * (0.5 * Math.sin(a * 3 + ring.seed) + 0.3 * Math.sin(a * 7 + ring.seed * 2) + 0.2 * Math.sin(a * 17 + ring.seed * 3) + 0.15 * (G.vnoise(a * 9, ring.seed) - 0.5));
        const s = Math.max(0, dx * sh.x + dz * sh.y);
        h *= 1 - 0.65 * s * s;
        h = Math.max(h, 8);
        const R = ring.R + 12 * Math.sin(a * 5 + ring.seed);
        pos.push(dx * R, -30, dz * R, dx * R, h, dz * R);
        hs.push(0, 1);
        if (i < M) {
          const k = i * 2;
          idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('aH', new THREE.Float32BufferAttribute(hs, 1));
      geo.setIndex(idx);
      const m = SH.mat(SH.MTN_VS, SH.MTN_FS, { uHaze: { value: ring.haze } }, { side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geo, m);
      mesh.frustumCulled = false;
      mesh.renderOrder = -90;
      scene.add(mesh);
    }
  }

  /* ---------- 地面 ---------- */
  function buildTerrain(scene) {
    const geo = new THREE.PlaneGeometry(320, 320, 220, 220);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, G.Field.height(p.getX(i), p.getZ(i)));
    geo.computeVertexNormals();
    const m = SH.mat(SH.TERRAIN_VS, SH.TERRAIN_FS);
    const mesh = new THREE.Mesh(geo, m);
    mesh.frustumCulled = false;
    scene.add(mesh);
  }

  /* ---------- 草：跟着镜头的环绕草块（近处密、远处疏） ---------- */
  function bladeGeometry(far) {
    const g = new THREE.InstancedBufferGeometry();
    if (far) {
      g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0, 1, 0], 3));
      g.setIndex([0, 1, 2]);
    } else {
      const ys = [0, 0.35, 0.68], ws = [0.5, 0.4, 0.26], pos = [];
      for (let i = 0; i < 3; i++) pos.push(-ws[i], ys[i], 0, ws[i], ys[i], 0);
      pos.push(0, 1, 0);
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6]);
    }
    return g;
  }
  function grassPatch(scene, max, size, far, seed) {
    const g = bladeGeometry(far);
    const r = G.rng(seed);
    const off = new Float32Array(max * 2), par = new Float32Array(max * 4);
    for (let i = 0; i < max; i++) {
      off[i * 2] = r() * size;
      off[i * 2 + 1] = r() * size;
      par[i * 4] = 0.6 + 0.65 * r();
      par[i * 4 + 1] = 0.75 + 0.55 * r();
      par[i * 4 + 2] = r() * Math.PI * 2;
      par[i * 4 + 3] = r();
    }
    g.setAttribute('aOffset', new THREE.InstancedBufferAttribute(off, 2));
    g.setAttribute('aParams', new THREE.InstancedBufferAttribute(par, 4));
    g.instanceCount = max;
    const m = SH.mat(SH.GRASS_VS, SH.SIMPLE_FS, {
      uCenter: { value: new THREE.Vector2() },
      uSize: { value: size },
      uFadeR: { value: far ? new THREE.Vector4(15, 21, size * 0.36, size * 0.48) : new THREE.Vector4(-2, -1, size * 0.36, size * 0.5) },
      uBladeW: { value: far ? 0.2 : 0.075 },
      uBladeH: { value: far ? 0.62 : 0.56 }
    }, { side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  }

  /* ---------- 野花 ---------- */
  const PALETTE = [
    [1.0, 0.62, 0.74], [0.98, 0.96, 0.92], [1.0, 0.86, 0.36],
    [0.8, 0.68, 0.96], [1.0, 0.56, 0.46], [0.64, 0.78, 0.99], [1.0, 0.74, 0.86]
  ];
  function flowerGeometry() {
    const pos = [], kind = [], idx = [];
    // 花茎
    pos.push(-0.5, 0, 0, 0.5, 0, 0, -0.5, 1, 0, 0.5, 1, 0);
    kind.push(0, 0, 0, 0);
    idx.push(0, 1, 2, 1, 3, 2);
    // 五瓣花头
    const c = 4;
    pos.push(0, 0.05, 0);
    kind.push(1);
    const R = 25;
    for (let i = 0; i < R; i++) {
      const a = (i / R) * Math.PI * 2;
      const rr = 0.32 + 0.68 * Math.pow(Math.abs(Math.cos(a * 2.5)), 0.55);
      pos.push(Math.cos(a) * rr, 0.18 * rr, Math.sin(a) * rr);
      kind.push(2);
      idx.push(c, c + 1 + i, c + 1 + ((i + 1) % R));
    }
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
    g.setIndex(idx);
    return g;
  }
  function flowerPatch(scene, max, size, far, seed) {
    const g = flowerGeometry();
    const r = G.rng(seed);
    const off = new Float32Array(max * 2), rnd = new Float32Array(max * 4), col = new Float32Array(max * 3);
    for (let i = 0; i < max; i++) {
      off[i * 2] = r() * size;
      off[i * 2 + 1] = r() * size;
      rnd[i * 4] = r();
      rnd[i * 4 + 1] = r();
      rnd[i * 4 + 2] = r();
      rnd[i * 4 + 3] = r();
      const c = PALETTE[Math.floor(r() * PALETTE.length)];
      const v = 0.92 + 0.12 * r();
      col[i * 3] = Math.min(1, c[0] * v);
      col[i * 3 + 1] = Math.min(1, c[1] * v);
      col[i * 3 + 2] = Math.min(1, c[2] * v);
    }
    g.setAttribute('aOffset', new THREE.InstancedBufferAttribute(off, 2));
    g.setAttribute('aRnd', new THREE.InstancedBufferAttribute(rnd, 4));
    g.setAttribute('aColor', new THREE.InstancedBufferAttribute(col, 3));
    g.instanceCount = max;
    const m = SH.mat(SH.FLOWER_VS, SH.SIMPLE_FS, {
      uCenter: { value: new THREE.Vector2() },
      uSize: { value: size },
      uFadeR: { value: far ? new THREE.Vector4(14, 19, size * 0.38, size * 0.49) : new THREE.Vector4(-2, -1, size * 0.36, size * 0.5) },
      uScale: { value: far ? 1.7 : 1.0 }
    }, { side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  }

  // 不同画质下的数量
  N.PRESETS = {
    low: { grassNear: 42000, grassFar: 18000, flowerNear: 6000, flowerFar: 4000 },
    mid: { grassNear: 78000, grassFar: 30000, flowerNear: 10000, flowerFar: 6500 },
    high: { grassNear: 120000, grassFar: 44000, flowerNear: 15000, flowerFar: 9000 }
  };

  N.build = function (scene) {
    buildSky(scene);
    buildMountains(scene);
    buildTerrain(scene);
    const P = N.PRESETS.high;
    N.grassNear = grassPatch(scene, P.grassNear, 44, false, 11);
    N.grassFar = grassPatch(scene, P.grassFar, 116, true, 23);
    N.flowerNear = flowerPatch(scene, P.flowerNear, 40, false, 37);
    N.flowerFar = flowerPatch(scene, P.flowerFar, 120, true, 41);
  };
  N.setQuality = function (q) {
    const P = N.PRESETS[q] || N.PRESETS.mid;
    N.grassNear.geometry.instanceCount = P.grassNear;
    N.grassFar.geometry.instanceCount = P.grassFar;
    N.flowerNear.geometry.instanceCount = P.flowerNear;
    N.flowerFar.geometry.instanceCount = P.flowerFar;
  };
  N.update = function (cam) {
    for (const m of [N.grassNear, N.grassFar, N.flowerNear, N.flowerFar]) m.material.uniforms.uCenter.value.set(cam.position.x, cam.position.z);
  };

  G.Nature = N;
})();
