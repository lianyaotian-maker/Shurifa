/* 草原小屋 · 粒子：花瓣、落叶、雪、萤火虫、金色光点、孔明灯、炊烟、热气 */
(function () {
  'use strict';
  const SH = G.SH;
  const FX = {};

  function seeds(n, seed) {
    const r = G.rng(seed);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    const a = new Float32Array(n * 4);
    for (let i = 0; i < n * 4; i++) a[i] = r();
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(a, 4));
    return g;
  }
  function points(scene, geo, vs, fs, uniforms, defines, additive, order) {
    const m = new THREE.ShaderMaterial({
      vertexShader: vs,
      fragmentShader: fs,
      uniforms: Object.assign({}, G.U, uniforms),
      defines: defines || {},
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    const p = new THREE.Points(geo, m);
    p.frustumCulled = false;
    p.renderOrder = order;
    scene.add(p);
    return p;
  }
  function parts(scene, mode, n, box, vel, size, a, b, additive, seed) {
    return points(scene, seeds(n, seed), SH.PART_VS, SH.PART_FS, {
      uBox: { value: new THREE.Vector3(box[0], box[1], box[2]) },
      uVel: { value: new THREE.Vector3(vel[0], vel[1], vel[2]) },
      uSize: { value: size },
      uAmount: { value: 0 },
      uColA: { value: new THREE.Color(a[0], a[1], a[2]) },
      uColB: { value: new THREE.Color(b[0], b[1], b[2]) }
    }, { MODE: mode }, additive, additive ? 11 : 10);
  }
  function puff(scene, n, origin, life, rise, spread, s0, s1, tint, seed, order) {
    return points(scene, seeds(n, seed), SH.PUFF_VS, SH.PUFF_FS, {
      uOrigin: { value: origin.clone() },
      uAmount: { value: 0 },
      uLife: { value: life },
      uRise: { value: rise },
      uSpread: { value: spread },
      uSize0: { value: s0 },
      uSize1: { value: s1 },
      uTint: { value: new THREE.Color(tint[0], tint[1], tint[2]) }
    }, null, false, order);
  }

  FX.build = function (scene) {
    FX.petals = parts(scene, 0, 700, [34, 14, 34], [0.5, -0.55, 0.35], 0.09, [1.0, 0.7, 0.8], [1.0, 0.94, 0.95], false, 1);
    FX.leaves = parts(scene, 1, 600, [36, 16, 36], [0.75, -0.8, 0.45], 0.14, [0.97, 0.58, 0.16], [0.86, 0.3, 0.12], false, 2);
    FX.snow = parts(scene, 2, 1800, [36, 16, 36], [0.15, -1.0, 0.1], 0.075, [1, 1, 1], [0.92, 0.95, 1.0], false, 3);
    FX.flies = parts(scene, 3, 260, [40, 1, 40], [0, 0, 0], 0.16, [0.82, 1.0, 0.45], [1.0, 0.92, 0.5], true, 4);
    FX.motes = parts(scene, 4, 160, [26, 1, 26], [0, 0, 0], 0.15, [1.0, 0.86, 0.5], [1.0, 0.7, 0.42], true, 5);
    FX.lanterns = points(scene, seeds(220, 6), SH.LANTERN_VS, SH.LANTERN_FS, {
      uLT: { value: 0 },
      uAmount: { value: 0 }
    }, null, false, 12);
    FX.smoke = puff(scene, 46, new THREE.Vector3(3.97, 5.66, 0), 7, 6, 2.2, 0.5, 2.6, [0.86, 0.84, 0.88], 7, 9);
    FX.steam = puff(scene, 14, G.Interior.steamOrigin, 2.6, 0.45, 0.12, 0.05, 0.24, [1, 1, 1], 8, 9);
    FX.steam.material.uniforms.uAmount.value = 0.55;
  };

  // 每帧更新数量（mul：画质系数）
  FX.update = function (S, o) {
    const mul = o.mul;
    FX.petals.material.uniforms.uAmount.value = Math.max(S.petals, o.bday * 0.7) * mul;
    FX.leaves.material.uniforms.uAmount.value = S.leaves * mul;
    FX.snow.material.uniforms.uAmount.value = S.snowfall * mul;
    FX.flies.material.uniforms.uAmount.value = Math.max(S.ffly, o.bday * 0.25) * mul;
    FX.motes.material.uniforms.uAmount.value = Math.max(o.hint * 0.5, o.bday * 0.85);
    FX.lanterns.material.uniforms.uAmount.value = o.bday;
    FX.lanterns.material.uniforms.uLT.value = o.lanternT;
    FX.smoke.material.uniforms.uAmount.value = S.smoke * 0.7;
  };

  G.FX = FX;
})();
