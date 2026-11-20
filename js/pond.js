/* 草原小屋 · 池塘和木栈桥：会倒映天空的水面、荷叶和荷花、芦苇、偶尔跃出水面的小鱼、
   冬天结冰；栈桥尽头可以坐下，夜里桥头有一盏小灯 */
(function () {
  'use strict';
  const SH = G.SH;
  const PD = {};
  let F, WY, DY;

  const WATER_VS = /* glsl */ `
varying vec3 vWP;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
  const WATER_FS = SH.COMMON + /* glsl */ `
uniform vec4 uPond;      // 中心 x、z，半轴 a、b
uniform vec4 uRip[2];    // 涟漪：x、z、开始时间、强度
uniform float uIce;
varying vec3 vWP;
float waves(vec2 p){
  float t = uTime;
  return vnoise(p * 1.25 + t * vec2(0.22, 0.16)) + 0.55 * vnoise(p * 3.2 - t * vec2(0.28, 0.09)) + 0.25 * vnoise(p * 7.0 + t * vec2(0.1, 0.35));
}
void main(){
  vec2 p = vWP.xz;
  vec2 lp = (p - uPond.xy) / uPond.zw;
  float d = length(lp);
  float e = 0.08;
  float h0 = waves(p);
  float gx = (waves(p + vec2(e, 0.0)) - h0) / e;
  float gz = (waves(p + vec2(0.0, e)) - h0) / e;
  // 小鱼跃起时的一圈圈涟漪
  for (int i = 0; i < 2; i++) {
    vec2 dv = p - uRip[i].xy;
    float r = length(dv);
    float age = uTime - uRip[i].z;
    if (age > 0.0 && age < 3.5) {
      float ring = sin((r - age * 0.9) * 22.0) * exp(-pow((r - age * 0.9) * 3.0, 2.0)) * exp(-age * 0.9) * uRip[i].w;
      vec2 dir = dv / max(r, 0.001);
      gx += dir.x * ring * 3.0;
      gz += dir.y * ring * 3.0;
    }
  }
  vec3 N = normalize(vec3(-gx * 0.09, 1.0, -gz * 0.09));
  vec3 V = normalize(vWP - cameraPosition);
  vec3 R = reflect(V, N);
  R.y = abs(R.y);
  float sd = dot(R, uSunDir);
  vec3 sky = mix(horizonC(sd), uZenith, pow(clamp(R.y, 0.0, 1.0), 0.45));
  sky += uSunGlow * (pow(max(sd, 0.0), 8.0) * 0.55 + pow(max(sd, 0.0), 60.0) * 0.6);
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(-V, N), 0.0), 5.0);
  vec3 amb = mix(uAmbBottom, uAmbTop, 0.6);
  vec3 deep = vec3(0.08, 0.2, 0.22) * (amb + uSunColor * 0.25);
  vec3 shallow = vec3(0.24, 0.32, 0.2) * (amb + uSunColor * 0.4);
  vec3 body = mix(deep, shallow, smoothstep(0.55, 0.98, d));
  vec3 col = mix(body, sky, 0.22 + 0.7 * fres);
  // 太阳（夜里是月亮）在水面上的一道亮光
  col += uSunColor * pow(max(sd, 0.0), 400.0) * 3.0 + uSunColor * pow(max(sd, 0.0), 40.0) * 0.18;
  // 夜里水面倒映出大月亮（被波纹打碎）
  float mw = 1.0 - smoothstep(0.0105, 0.0125, 1.0 - sd);
  col = mix(col, vec3(1.0, 0.94, 0.8), mw * uNight * 0.6);
  col += vec3(1.0, 0.92, 0.78) * pow(max(sd, 0.0), 30.0) * 0.25 * uNight;
  col += vec3(1.0) * smoothstep(0.9, 1.0, d) * 0.06; // 岸边一点点浅色
  col += vec3(1.0, 0.7, 0.38) * lanternAt(vWP) * 0.4;
  // 冬天结冰
  float cr = smoothstep(0.03, 0.0, abs(vnoise(p * 1.7) - 0.5)) * 0.25;
  vec3 ice = mix(vec3(0.78, 0.86, 0.95), uSnowColor, smoothstep(0.45, 0.8, vnoise(p * 0.9 + 3.0))) * (amb + uSunColor * 0.55) * (1.0 - cr);
  ice = mix(ice, sky, 0.18);
  col = mix(col, ice, uIce);
  float fd = length(vWP - cameraPosition);
  gl_FragColor = vec4(mix(col, fogC(V), fogF(fd)), 1.0);
}
`;

  // 栈桥：从西岸伸进水里，尽头是一个方形平台
  const DECK = { x0: 9.4, x1: 16.2, z0: 4.4, z1: 5.6, p: { x0: 16.2, x1: 18.5, z0: 3.85, z1: 6.15 } };
  const onDeck = (x, z) => (x >= DECK.x0 && x <= DECK.x1 && z >= DECK.z0 && z <= DECK.z1) || (x >= DECK.p.x0 && x <= DECK.p.x1 && z >= DECK.p.z0 && z <= DECK.p.z1);
  PD.deckAt = (x, z) => (onDeck(x, z) ? DY : null);
  PD.onDeck = onDeck;
  // 走到水里就挡住（栈桥上除外）
  PD.blocked = (x, z) => F.pondD(x, z) < 0.96 && !onDeck(x, z);

  PD.build = function (scene) {
    F = G.Field;
    const P = F.POND;
    WY = P.waterY;
    DY = WY + 0.42;
    const rnd = G.rng(733);
    const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

    /* 水面 */
    PD.water = new THREE.Mesh(new THREE.CircleGeometry(1, 72).rotateX(-Math.PI / 2), SH.mat(WATER_VS, WATER_FS, {
      uPond: { value: new THREE.Vector4(P.x, P.z, P.a, P.b) },
      uRip: { value: [new THREE.Vector4(0, 0, -99, 0), new THREE.Vector4(0, 0, -99, 0)] },
      uIce: { value: 0 }
    }));
    PD.water.scale.set(P.a * 1.18, 1, P.b * 1.18);
    PD.water.position.set(P.x, WY, P.z);
    scene.add(PD.water);

    /* 荷叶和荷花 */
    const free = (x, z) => !(x > DECK.x0 - 0.6 && x < DECK.p.x1 + 0.6 && z > DECK.p.z0 - 0.6 && z < DECK.p.z1 + 0.6);
    const padGeo = new THREE.CircleGeometry(1, 22, 0.35, Math.PI * 2 - 0.35).rotateX(-Math.PI / 2);
    const pads = [], blooms = [];
    for (let i = 0; i < 400 && pads.length < 46; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.86;
      const x = P.x + Math.cos(a) * r * P.a, z = P.z + Math.sin(a) * r * P.b;
      // 一丛一丛地长
      if (!free(x, z) || G.vnoise(x * 0.5, z * 0.5) < 0.45) continue;
      pads.push({ x, z, s: 0.22 + rnd() * 0.24, rot: rnd() * 6.3 });
      if (rnd() < 0.22) blooms.push({ x: x + 0.05, z: z - 0.03, s: 0.8 + rnd() * 0.5 });
    }
    PD.padMat = G.lambert({ color: 0x4f8a3a, side: THREE.DoubleSide });
    PD.pads = new THREE.InstancedMesh(padGeo, PD.padMat, pads.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = v3(0, 1, 0);
    pads.forEach((p, i) => {
      m4.compose(v3(p.x, WY + 0.012, p.z), q.setFromAxisAngle(up, p.rot), v3(p.s, 1, p.s));
      PD.pads.setMatrixAt(i, m4);
      PD.pads.setColorAt(i, new THREE.Color().setHSL(0.27 + rnd() * 0.05, 0.45, 0.32 + rnd() * 0.1));
    });
    scene.add(PD.pads);
    // 荷花：几片粉色花瓣围成一圈，中间黄色花心
    const bloom = new THREE.Group();
    const petal = new THREE.SphereGeometry(0.05, 10, 6);
    petal.scale(0.55, 0.35, 1.1);
    const pm = G.lambert({ color: 0xffb3cb, emissive: 0x3a1a24 }), cm = G.lambert({ color: 0xffd65a, emissive: 0x3a2a08 });
    for (const b of blooms) {
      const g = new THREE.Group();
      for (let k = 0; k < 7; k++) {
        const pt = new THREE.Mesh(petal, pm);
        const a = (k / 7) * Math.PI * 2;
        pt.position.set(Math.cos(a) * 0.035, 0.03, Math.sin(a) * 0.035);
        pt.rotation.set(0.55, -a + Math.PI / 2, 0, 'YXZ');
        g.add(pt);
      }
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), cm);
      c.position.y = 0.035;
      g.add(c);
      g.position.set(b.x, WY + 0.012, b.z);
      g.scale.setScalar(b.s);
      bloom.add(g);
    }
    scene.add(bloom);
    PD.bloom = bloom;

    /* 芦苇和香蒲：长在岸边，随风轻摆 */
    PD.reedMat = G.lambert({ color: 0x6f9a48, side: THREE.DoubleSide }, (sh) => {
      sh.uniforms.uTime = G.U.uTime;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace('#include <begin_vertex>', 'vec3 transformed = vec3( position );\nfloat sw = max(position.y, 0.0);\ntransformed.x += sin(uTime * 1.6 + instanceMatrix[3].x * 0.7 + instanceMatrix[3].z) * 0.06 * sw * sw;');
    }, 'reed');
    const blade = new THREE.ConeGeometry(0.018, 1, 3);
    blade.translate(0, 0.5, 0);
    const reeds = [];
    for (let i = 0; i < 900 && reeds.length < 150; i++) {
      const a = rnd() * Math.PI * 2, r = 0.9 + rnd() * 0.16;
      const x = P.x + Math.cos(a) * r * P.a, z = P.z + Math.sin(a) * r * P.b;
      if (!free(x, z) || G.vnoise(x * 0.4 + 9, z * 0.4) < 0.42) continue;
      reeds.push({ x, z, h: 0.7 + rnd() * 0.7, lean: (rnd() - 0.5) * 0.25, rot: rnd() * 6.3 });
    }
    PD.reeds = new THREE.InstancedMesh(blade, PD.reedMat, reeds.length);
    const heads = [];
    reeds.forEach((r, i) => {
      const y = Math.max(WY - 0.1, F.height(r.x, r.z) - 0.05);
      q.setFromEuler(new THREE.Euler(r.lean, r.rot, r.lean * 0.6));
      m4.compose(v3(r.x, y, r.z), q, v3(1, r.h, 1));
      PD.reeds.setMatrixAt(i, m4);
      if (i % 3 === 0) heads.push({ x: r.x + Math.sin(r.lean) * 0.0, y: y + r.h * 0.86, z: r.z, rot: q.clone() });
    });
    scene.add(PD.reeds);
    const headGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.17, 8);
    PD.heads = new THREE.InstancedMesh(headGeo, G.lambert({ color: 0x5a3a24 }), heads.length);
    heads.forEach((h, i) => {
      m4.compose(v3(h.x, h.y, h.z), h.rot, v3(1, 1, 1));
      PD.heads.setMatrixAt(i, m4);
    });
    scene.add(PD.heads);

    /* 木栈桥 */
    const mg = new G.Merger();
    const plank = 0.17, gap = 0.02;
    for (let x = DECK.x0; x < DECK.x1 - 0.01; x += plank + gap) mg.box(plank, 0.05, DECK.z1 - DECK.z0, x + plank / 2, DY - 0.025, (DECK.z0 + DECK.z1) / 2, 'deck', { uvScale: 1 / 1.2 });
    for (let x = DECK.p.x0; x < DECK.p.x1 - 0.01; x += plank + gap) mg.box(plank, 0.05, DECK.p.z1 - DECK.p.z0, x + plank / 2, DY - 0.025, (DECK.p.z0 + DECK.p.z1) / 2, 'deck', { uvScale: 1 / 1.2 });
    for (const z of [DECK.z0 + 0.08, DECK.z1 - 0.08]) mg.box(DECK.x1 - DECK.x0, 0.1, 0.08, (DECK.x0 + DECK.x1) / 2, DY - 0.1, z, 'post');
    const post = (x, z, top) => {
      const bot = F.height(x, z) - 0.3;
      mg.box(0.11, top - bot, 0.11, x, (top + bot) / 2, z, 'post');
    };
    for (let x = DECK.x0 + 0.2; x < DECK.x1; x += 1.45) {
      post(x, DECK.z0 + 0.06, DY - 0.05);
      post(x, DECK.z1 - 0.06, DY - 0.05);
    }
    const pp = DECK.p;
    for (const x of [pp.x0 + 0.06, (pp.x0 + pp.x1) / 2, pp.x1 - 0.06]) for (const z of [pp.z0 + 0.06, pp.z1 - 0.06]) post(x, z, DY + 0.75);
    // 平台三面的矮栏杆（入口那一面空着）
    mg.box(pp.x1 - pp.x0, 0.06, 0.07, (pp.x0 + pp.x1) / 2, DY + 0.72, pp.z0 + 0.06, 'post');
    mg.box(pp.x1 - pp.x0, 0.06, 0.07, (pp.x0 + pp.x1) / 2, DY + 0.72, pp.z1 - 0.06, 'post');
    mg.box(0.07, 0.06, pp.z1 - pp.z0, pp.x1 - 0.06, DY + 0.72, (pp.z0 + pp.z1) / 2, 'post');
    mg.box(pp.x1 - pp.x0, 0.05, 0.05, (pp.x0 + pp.x1) / 2, DY + 0.38, pp.z0 + 0.06, 'post');
    mg.box(pp.x1 - pp.x0, 0.05, 0.05, (pp.x0 + pp.x1) / 2, DY + 0.38, pp.z1 - 0.06, 'post');
    // 栏杆挡人
    G.Colliders.rects.push(
      { x0: pp.x0, x1: pp.x1, z0: pp.z0, z1: pp.z0 + 0.1 },
      { x0: pp.x0, x1: pp.x1, z0: pp.z1 - 0.1, z1: pp.z1 },
      { x0: pp.x1 - 0.1, x1: pp.x1, z0: pp.z0, z1: pp.z1 }
    );
    // 桥头灯柱
    mg.box(0.09, 1.55, 0.09, pp.x1 - 0.06, DY + 0.78, pp.z1 - 0.06, 'post');
    mg.box(0.34, 0.06, 0.06, pp.x1 - 0.2, DY + 1.52, pp.z1 - 0.06, 'post');
    const deck = mg.build({ deck: G.lambert({ map: G.House.tex.deck, color: 0xd8c4a8 }), post: G.lambert({ map: G.House.tex.deck, color: 0x8a6a50 }) });
    scene.add(deck);
    const lampPos = v3(pp.x1 - 0.34, DY + 1.36, pp.z1 - 0.06);
    const lampBox = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.18, 0.13), G.lambert({ color: 0x2a2a2e }));
    lampBox.position.copy(lampPos);
    PD.lampBulb = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.09), new THREE.MeshBasicMaterial({ color: 0x6a5a40 }));
    PD.lampBulb.position.copy(lampPos);
    PD.lampGlow = G.glow(0xffc27a, 1.3, 0);
    PD.lampGlow2 = G.glow(0xffa860, 4.0, 0);
    PD.lampGlow.position.copy(lampPos);
    PD.lampGlow2.position.copy(lampPos);
    scene.add(lampBox, PD.lampBulb, PD.lampGlow, PD.lampGlow2);

    // 栈桥尽头坐下：面朝夕阳（夜里是月亮），脚悬在水面上
    const sd = G.U.uSunDir.value, f = v3(sd.x, 0, sd.z).normalize();
    const seat = v3(17.35, DY, pp.z0 + 0.32);
    G.Tap.add(G.Tap.proxy(scene, 0.55, seat.x, DY + 0.2, seat.z), 4.5, () => {
      G.Player.sit({
        pos: (v) => v.set(seat.x, DY + 0.72, seat.z),
        exit: { x: 16.6, z: 5.0 },
        yaw: Math.atan2(-f.x, -f.z),
        label: '坐在栈桥尽头 · 拨动摇杆起身'
      });
    }, { hint: v3(seat.x, DY + 0.75, seat.z), hintDist: 7 });

    /* 小鱼 */
    const fish = new THREE.Group();
    const fm = G.lambert({ color: 0xff8a3a, emissive: 0x3a1806 });
    const fb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), fm);
    fb.scale.set(0.7, 0.8, 1.6);
    const ft = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 4), fm);
    ft.rotation.x = -Math.PI / 2;
    ft.position.z = -0.14;
    ft.scale.set(0.3, 1, 1);
    fish.add(fb, ft);
    fish.visible = false;
    scene.add(fish);
    PD.fish = { g: fish, t: -1, next: 4, a: v3(), b: v3() };
    PD.ripN = 0;
  };

  function ripple(x, z, amp) {
    const r = PD.water.material.uniforms.uRip.value[PD.ripN++ % 2];
    r.set(x, z, G.U.uTime.value, amp);
  }

  const m4u = new THREE.Matrix4(), qu = new THREE.Quaternion();
  PD.update = function (dt, t, S, P) {
    const ice = G.smooth(0.35, 0.75, S.snow);
    PD.water.material.uniforms.uIce.value = ice;
    const open = ice < 0.5;
    PD.pads.visible = PD.bloom.visible = open;
    // 荷叶：秋天变黄，花只在春夏开
    PD.padMat.color.setRGB(1 + 0.6 * S.leaves, 1 - 0.1 * S.leaves, 1 - 0.5 * S.leaves);
    PD.bloom.visible = open && (S.flw > 0.2 || G.U.uBdayAmt.value > 0.3);
    PD.reedMat.color.setRGB(S.gTip[0] * 0.8, S.gTip[1] * 0.8, S.gTip[2] * 0.75);
    // 桥头灯：天黑后点亮
    const nk = G.U.uNight.value, fl = 0.92 + 0.08 * Math.sin(t * 9);
    PD.lampGlow.material.opacity = 0.8 * nk * fl;
    PD.lampGlow2.material.opacity = 0.25 * nk * fl;
    PD.lampBulb.material.color.setRGB(0.42 + 0.58 * nk, 0.35 + 0.5 * nk, 0.25 + 0.28 * nk);
    PD.lampBulb.visible = true;
    // 小鱼：不结冰的时候，隔一会儿跃出水面
    const F2 = PD.fish, Pn = F.POND;
    if (F2.t < 0) {
      F2.next -= dt;
      if (F2.next <= 0 && open) {
        let x, z;
        for (let k = 0; k < 20; k++) {
          const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.6;
          x = Pn.x + Math.cos(a) * r * Pn.a;
          z = Pn.z + Math.sin(a) * r * Pn.b;
          if (Math.abs(z - 5) > 1.4) break;
        }
        const ang = Math.random() * Math.PI * 2;
        F2.a.set(x, WY, z);
        F2.b.set(x + Math.cos(ang) * 1.1, WY, z + Math.sin(ang) * 1.1);
        F2.t = 0;
        ripple(x, z, 1);
        const d = Math.hypot(P.x - x, P.z - z);
        if (d < 25) G.Audio.sfx('splash', G.clamp(1.3 - d / 18, 0.15, 1));
      }
    } else {
      F2.t += dt / 0.9;
      const k = Math.min(1, F2.t);
      const pos = new THREE.Vector3().lerpVectors(F2.a, F2.b, k);
      pos.y = WY + Math.sin(k * Math.PI) * 0.55 - 0.05;
      F2.g.position.copy(pos);
      const dx = F2.b.x - F2.a.x, dz = F2.b.z - F2.a.z;
      F2.g.rotation.set(-Math.cos(k * Math.PI) * 0.9, Math.atan2(dx, dz), 0, 'YXZ');
      F2.g.visible = k > 0.02 && k < 0.98;
      if (F2.t >= 1) {
        F2.t = -1;
        F2.next = 6 + Math.random() * 10;
        F2.g.visible = false;
        ripple(F2.b.x, F2.b.z, 0.8);
        const d = Math.hypot(P.x - F2.b.x, P.z - F2.b.z);
        if (d < 25) G.Audio.sfx('splash', G.clamp(1.1 - d / 18, 0.12, 0.9));
      }
    }
  };

  G.Pond = PD;
})();
