/* 草原小屋 · 夜晚：温柔的蓝紫夜色、月亮、手里的小灯笼 */
(function () {
  'use strict';
  const N = { target: 0, k: 0, t: 0 };
  // 夜晚的颜色（显示空间 0~1）
  const NIGHT = {
    zen: [0.06, 0.07, 0.19], hor: [0.19, 0.19, 0.37], glow: [0.24, 0.27, 0.46], sun: [0.40, 0.47, 0.72],
    ambT: [0.21, 0.24, 0.42], ambB: [0.09, 0.10, 0.18], cLit: [0.30, 0.32, 0.52], cShade: [0.11, 0.12, 0.24],
    mtn: [0.09, 0.10, 0.22]
  };
  const KEYS = Object.keys(NIGHT);
  const ease = (x) => x * x * (3 - 2 * x);

  // 把当天的黄昏颜色按夜晚程度混成夜色（冬天的雪地稍微亮一点）
  N.blend = function (S) {
    const k = N.k;
    if (k <= 0) return S;
    const snowLift = 1 + 0.35 * S.snow;
    for (const key of KEYS) {
      const a = S[key], b = NIGHT[key], m = key === 'sun' || key === 'ambT' ? snowLift : 1;
      for (let i = 0; i < 3; i++) a[i] = a[i] + (b[i] * m - a[i]) * k;
    }
    // 草稍微褪色、偏冷
    for (const key of ['gBase', 'gTip', 'gAlt']) {
      const a = S[key], l = (a[0] + a[1] + a[2]) / 3;
      a[0] += (l * 0.85 - a[0]) * 0.35 * k;
      a[1] += (l * 0.95 - a[1]) * 0.3 * k;
      a[2] += (l * 1.15 - a[2]) * 0.35 * k;
    }
    return S;
  };

  N.build = function (scene, camera) {
    // 月亮：放在夕阳落下的方向（这样光照和阴影都对得上），比真实的大一些
    const tex = new THREE.TextureLoader().load('img/moon.png');
    N.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xfff2dc, transparent: true, depthWrite: false, fog: false, opacity: 0 }));
    N.moon.renderOrder = -95;
    N.moon.scale.setScalar(66);
    N.halo = G.glow(0xbfd0ff, 230, 0);
    N.halo.renderOrder = -96;
    N.halo2 = G.glow(0xdfe6ff, 110, 0);
    N.halo2.renderOrder = -96;
    scene.add(N.halo, N.halo2, N.moon);

    // 手里提着的纸灯笼（挂在镜头上）
    const L = new THREE.Group();
    const paper = new THREE.MeshBasicMaterial({ color: 0xffc06a, fog: false });
    const dark = new THREE.MeshBasicMaterial({ color: 0x3a2618, fog: false });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), paper);
    body.scale.set(1, 1.15, 1);
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.0025, 6, 24), dark);
    rib.rotation.x = Math.PI / 2;
    const capT = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.034, 0.018, 16), dark);
    capT.position.y = 0.072;
    const capB = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.024, 0.016, 16), dark);
    capB.position.y = -0.072;
    const tas = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.012, 0.06, 8), new THREE.MeshBasicMaterial({ color: 0xc8302a, fog: false }));
    tas.position.y = -0.11;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.003, 6, 16, Math.PI), dark);
    handle.position.y = 0.08;
    const g1 = G.glow(0xffb45a, 0.26, 0.7), g2 = G.glow(0xff9a40, 0.7, 0.22);
    L.add(body, rib, capT, capB, tas, handle, g1, g2);
    for (const m of L.children) {
      m.renderOrder = 20;
      if (m.material) m.material.depthTest = false;
    }
    L.position.set(0.3, -0.2, -0.66);
    L.visible = false;
    camera.add(L);
    if (!camera.parent) scene.add(camera);
    N.lantern = L;
    N.lanternGlows = [g1, g2];
    N.body = body;
    // 照亮房子、树、鸡柳（Lambert 材质用三的点光源；草地和地面用着色器里的 uLantern）
    N.light = new THREE.PointLight(0xffb066, 0, 7, 2);
    scene.add(N.light);
  };

  N.toggle = function () {
    N.target = N.target > 0.5 ? 0 : 1;
    return N.target;
  };

  const wp = new THREE.Vector3(), fwd = new THREE.Vector3();
  N.update = function (dt, t, camera, P) {
    // 大约 4 秒从黄昏过渡到夜晚
    const dir = N.target > N.t ? 1 : -1;
    N.t = G.clamp(N.t + dir * dt / 4, 0, 1);
    if (Math.abs(N.target - N.t) < 1e-3) N.t = N.target;
    N.k = ease(N.t);
    const k = N.k;
    G.U.uNight.value = k;
    G.U.uFogDensity.value = 0.0095 + 0.003 * k;
    G.U.uRim.value.setRGB(1.0 - 0.45 * k, 0.78 - 0.1 * k, 0.45 + 0.45 * k);
    // 月亮跟着镜头（看起来无限远）
    const sd = G.U.uSunDir.value;
    N.moon.position.copy(camera.position).addScaledVector(sd, 450);
    N.halo.position.copy(camera.position).addScaledVector(sd, 460);
    N.halo2.position.copy(N.halo.position);
    N.moon.material.opacity = G.smooth(0.25, 0.9, k);
    N.moon.visible = N.halo.visible = N.halo2.visible = k > 0.01;
    N.halo.material.opacity = 0.22 * k;
    N.halo2.material.opacity = 0.3 * k;
    // 灯笼：夜里在屋外提着，进屋收起
    const inside = P.inHouse(P.x, P.z);
    const want = k > 0.35 && !inside && !P.seat ? 1 : 0;
    N.lk = (N.lk || 0) + (want - (N.lk || 0)) * Math.min(1, dt * 4);
    const lk = N.lk;
    N.lantern.visible = lk > 0.02;
    const sway = Math.sin(P.bob * 0.5) * 0.03 + Math.sin(t * 1.3) * 0.01;
    N.lantern.position.set(0.3 + sway * 0.4, -0.2 - (1 - lk) * 0.4 + Math.abs(Math.sin(P.bob * 0.5)) * 0.012, -0.66);
    N.lantern.rotation.z = sway * 2.2;
    const flick = 0.9 + 0.06 * Math.sin(t * 13) + 0.04 * Math.sin(t * 7.7 + 1);
    N.lanternGlows[0].material.opacity = 0.7 * lk * flick;
    N.lanternGlows[1].material.opacity = 0.22 * lk * flick;
    N.body.material.color.setRGB(0.95, 0.58 * flick + 0.04, 0.26 * flick);
    // 灯光放在身前稍低的地方，照亮脚下
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    wp.set(P.x + fwd.x * 0.6, P.y - 0.75, P.z + fwd.z * 0.6);
    G.U.uLantern.value.set(wp.x, wp.y, wp.z, 1.35 * lk * flick);
    N.light.position.copy(wp);
    N.light.intensity = 1.6 * lk * flick;
  };

  G.Night = N;
})();
