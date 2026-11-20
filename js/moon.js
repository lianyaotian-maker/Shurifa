/* 草原小屋 · 月中世界：夜里朝月亮走，顺着光点进入月亮。
   这里是地形、天空、进出月亮和每帧的动画；月宫里的建筑和小物件在 moon2.js */
(function () {
  'use strict';
  const SH = G.SH;
  const M = { on: false, busy: false, C: new THREE.Vector3(3000, 0, 0), R: 56 };
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const C = M.C;
  const L = (x, y, z) => v3(C.x + x, y, C.z + z); // 月面局部坐标 → 世界坐标
  M.v3 = v3;
  M.L = L;
  // 月面上的光从来时方向的右后上方照过来，正面看得清亭子
  M.LIGHT = v3(0.5, 0.6, 0.62).normalize();
  M.FOG = new THREE.Color(0.1, 0.11, 0.25);
  M.met = { uMetS: { value: v3(0, 1, 0) }, uMetD: { value: v3(1, 0, 0) }, uMetT: { value: -100 } };

  /* ---------- 月面高度 ---------- */
  const CRATERS = [[-18, 14, 5.5, 1.2], [20, 12, 7, 1.5], [-24, -20, 8, 1.6], [26, -22, 4.5, 1.0], [7, 36, 6, 1.3], [-36, 2, 5, 1.1], [34, 30, 4, 0.9], [-30, 30, 6.5, 1.4], [38, -2, 5, 1.0], [-6, -38, 7, 1.4], [16, -40, 4, 0.8]];
  {
    // 再撒一些小坑（避开中间的小院和来时的路）
    const r = G.rng(777);
    for (let i = 0; i < 46; i++) {
      const a = r() * 6.283, d = 13 + r() * 40, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(x) < 4 && z > 0 && z < 26) continue;
      const rad = 0.8 + r() * r() * 3.2;
      CRATERS.push([x, z, rad, rad * (0.16 + r() * 0.1)]);
    }
  }
  function crater(d, r, depth) {
    if (d > r * 1.6) return 0;
    const inner = d < r ? -depth * (1 - (d / r) * (d / r)) : 0;
    return inner + depth * 0.4 * Math.exp(-Math.pow((d - r) / (0.28 * r), 2));
  }
  function craterK(lx, lz) {
    // 坑底（负）和坑沿（正）的程度，用来上色
    let k = 0;
    for (const c of CRATERS) {
      const d = Math.hypot(lx - c[0], lz - c[1]);
      if (d > c[2] * 1.6) continue;
      k += d < c[2] ? -(1 - (d / c[2]) ** 2) * Math.min(1, c[3]) : Math.exp(-Math.pow((d - c[2]) / (0.3 * c[2]), 2)) * 0.8 * Math.min(1, c[3]);
    }
    return k;
  }
  function rawH(lx, lz) {
    let h = 0.5 * Math.sin(lx * 0.07 + 1) * Math.sin(lz * 0.06) + 0.25 * Math.sin(lx * 0.13 + lz * 0.11) + (G.vnoise(lx * 0.18, lz * 0.18) - 0.5) * 0.35;
    for (const c of CRATERS) h += crater(Math.hypot(lx - c[0], lz - c[1]), c[2], c[3]);
    const d = Math.hypot(lx, lz);
    h *= G.smooth(9, 20, d); // 月宫周围是平地
    if (d > M.R - 8) {
      // 远处高低错落的环形山
      const a = Math.atan2(lz, lx), cx = Math.cos(a), sz = Math.sin(a);
      const n = G.vnoise(cx * 2.2 + 7, sz * 2.2 + 3) * 0.6 + G.vnoise(cx * 5.5 + 1, sz * 5.5 + 9) * 0.3 + G.vnoise(cx * 14 + 4, sz * 14 + 2 + d * 0.08) * 0.1;
      h += G.smooth(M.R - 6, M.R + 18, d) * (7 + 26 * n * n) + G.smooth(M.R + 10, M.R + 40, d) * 6 * G.vnoise(lx * 0.08, lz * 0.08);
    }
    return h;
  }
  M.rawH = rawH;
  M.CRATERS = CRATERS;
  // 八角石台：PLAT 是台面的边心距
  const PLAT = (M.PLAT = 3.3), PLAT_H = (M.PLAT_H = 0.42), PLINTH = (M.PLINTH = 3.75);
  const oct = (M.oct = (x, z) => Math.max(Math.abs(x), Math.abs(z), Math.abs(x + z) * 0.7071, Math.abs(x - z) * 0.7071));
  M.groundAt = function (x, z) {
    const lx = x - C.x, lz = z - C.z;
    const o = oct(lx, lz);
    if (o < PLAT) return PLAT_H;
    if (Math.abs(lx) < 0.95 && Math.abs(lz) < 3.66) return 0.28; // 前后两道台阶
    if (o < PLINTH || (Math.abs(lx) < 1.05 && Math.abs(lz) < 4.15)) return 0.14;
    return rawH(lx, lz);
  };

  /* ---------- 声音用：脚下的地面、每处该听到什么 ---------- */
  // 亭子台基、台阶、石板路、门槛是石头，其他地方是软软的月壤
  M.surfaceAt = function (x, z) {
    const lx = x - C.x, lz = z - C.z;
    if (oct(lx, lz) < PLINTH + 0.05 || (Math.abs(lx) < 1.1 && Math.abs(lz) < 4.2)) return 'stone';
    if (Math.abs(lx) < 0.65 && ((lz > 4 && lz < 20.8) || (lz < -4 && lz > -12.6))) return 'stone';
    if (Math.abs(lz + 13) < 0.5 && Math.abs(lx) < 1.2) return 'stone';
    return 'dust';
  };
  // 月亮上：风铃声离亭子越近越清楚；走近月洞门，能听到门那边草原的鸟叫和风
  M.ambient = function (P) {
    const lx = P.x - C.x, lz = P.z - C.z;
    const portal = G.smooth(9, 1.5, Math.hypot(lx, lz + 13)) * (lz > -13.3 ? 1 : 0.5);
    const pav = G.smooth(18, 3, Math.hypot(lx, lz));
    return { wind: 0.06 + 0.3 * portal, meadow: 0, birds: 0.9 * portal, crickets: 0, moon: 0.3 + 0.7 * pav, inside: false };
  };
  // 草原的夜里：走近引路光柱，隐隐约约听到月亮上的风铃
  M.callAmt = function (P) {
    if (!M.door || M.on) return 0;
    return G.smooth(0.55, 1, G.U.uNight.value) * G.smooth(26, 4, Math.hypot(P.x - M.door.x, P.z - M.door.y));
  };

  /* ---------- 天空：深蓝夜空、几层星星、银河、流星 ---------- */
  const SKY_FS = SH.COMMON + /* glsl */ `
uniform vec3 uMetS;
uniform vec3 uMetD;
uniform float uMetT;
varying vec3 vDir;
float fbm4(vec2 p){ float s = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
// 按纬度分带、每一带的格子数取整，星星在哪儿都是圆的，也没有接缝
vec3 starL(vec3 d, float sc, float dens, float sz, float seed){
  float lat = asin(clamp(d.y, -1.0, 1.0));
  float lon = atan(d.z, d.x);
  float by = lat * sc;
  float bi = floor(by);
  float cl = max(cos((bi + 0.5) / sc), 0.0);
  float nx = max(1.0, floor(6.2832 * sc * cl));
  float bx = (lon / 6.2832 + 0.5) * nx;
  vec2 id = vec2(floor(bx), bi);
  float h = hash12(id * 1.37 + seed);
  vec2 j = vec2(hash12(id + seed + 3.1), hash12(id + seed + 7.7)) * 0.6 + 0.2;
  vec2 f = vec2(fract(bx), fract(by)) - j;
  f.x *= 6.2832 * sc * max(cl, 0.02) / nx;
  float dd = length(f);
  float br = fract(h * 13.7);
  float tw = 0.62 + 0.38 * sin(uTime * (1.1 + br * 3.0) + h * 60.0);
  vec3 c = mix(vec3(0.72, 0.8, 1.0), vec3(1.0, 0.86, 0.7), step(0.7, fract(h * 7.3)));
  return c * step(1.0 - dens, h) * (smoothstep(sz, 0.0, dd) + smoothstep(sz * 2.5, 0.0, dd) * 0.12) * (0.3 + 0.7 * br) * tw;
}
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  float up = clamp(h, 0.0, 1.0);
  vec3 col = mix(vec3(0.085, 0.095, 0.21), vec3(0.012, 0.016, 0.05), pow(up, 0.5));
  // 地平线上一层薄薄的蓝紫色辉光
  col += vec3(0.1, 0.1, 0.24) * exp(-up * 10.0) * 0.55;
  col = mix(col, vec3(0.1, 0.11, 0.25), smoothstep(0.0, -0.08, h));
  float sky = smoothstep(-0.02, 0.12, h);
  // 银河：一条斜斜跨过头顶的光带
  vec3 MW = normalize(vec3(0.918, -0.259, -0.298));
  float b = dot(d, MW);
  vec3 u1 = normalize(cross(MW, vec3(0.0, 1.0, 0.0)));
  vec3 u2 = cross(MW, u1);
  vec2 bp = vec2(dot(d, u1), dot(d, u2));
  float n = fbm4(bp * 5.0 + b * 9.0);
  float w = exp(-b * b / 0.02) * (0.45 + 0.75 * n);
  float lane = exp(-b * b / 0.0016) * smoothstep(0.45, 0.72, fbm4(bp * 9.0 + 4.0));
  col += mix(vec3(0.16, 0.18, 0.42), vec3(0.46, 0.42, 0.58), w * w) * w * 0.42 * sky * (1.0 - lane * 0.7);
  float neb = fbm4(bp * 2.5 + 11.0) - 0.75;
  col += vec3(0.32, 0.2, 0.42) * exp(-neb * neb * 40.0) * 0.06 * sky;
  // 三层星星：少量亮星、一般的星、银河里密密的小星
  vec3 st = starL(d, 30.0, 0.09, 0.075, 1.0) * 1.6 + starL(d, 80.0, 0.16, 0.13, 7.0) + starL(d, 150.0, 0.06 + 0.5 * w, 0.12, 13.0) * 0.6;
  col += st * sky;
  // 流星：方向和出现的时间由脚本给（这样能配上声音）
  float prog = (uTime - uMetT) / 1.1;
  vec3 Bn = cross(uMetD, uMetS);
  vec2 q = vec2(dot(d - uMetS, uMetD), dot(d - uMetS, Bn));
  float head = mix(-0.22, 0.22, prog);
  float along = clamp((q.x - head + 0.2) / 0.2, 0.0, 1.0) * step(q.x, head);
  float met = smoothstep(0.003, 0.0, abs(q.y)) * along * along * sin(clamp(prog, 0.0, 1.0) * 3.1416) * step(prog, 1.0) * step(0.6, dot(d, uMetS));
  col += vec3(0.85, 0.9, 1.0) * met * 1.6;
  gl_FragColor = vec4(col, 1.0);
}
`;

  /* ---------- 月面：银灰的月壤、细细的颗粒、闪光的小晶粒、灯下的暖光 ---------- */
  const GROUND_VS = /* glsl */ `
attribute vec3 aCol;
varying vec3 vCol;
varying vec3 vN;
varying vec3 vW;
void main(){
  vCol = aCol;
  vN = normal;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
  const GROUND_FS = SH.COMMON + /* glsl */ `
uniform vec3 uL;
uniform vec3 uC;
uniform vec3 uMFog;
uniform vec4 uPools[14];
varying vec3 vCol;
varying vec3 vN;
varying vec3 vW;
float fbm3(vec2 p){ float s = 0.0; float a = 0.5; for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = p * 2.07 + vec2(3.1, 1.7); a *= 0.5; } return s; }
void main(){
  vec2 p = vW.xz;
  vec2 lp = p - uC.xz;
  float n1 = fbm3(p * 0.33);
  float n2 = vnoise(p * 2.7);
  float g = hash12(floor(p * 16.0));
  vec3 base = vCol * (0.84 + 0.26 * n1 + 0.07 * n2 + 0.06 * (g - 0.5));
  // 细小的碎石点
  vec2 pc = p * 5.0;
  float hp = hash12(floor(pc));
  base *= 1.0 - 0.16 * step(0.9, hp) * smoothstep(0.32, 0.12, length(fract(pc) - 0.5));
  // 起伏的细节：用噪声做一点凹凸
  float e = 0.15;
  float hx = fbm3((p + vec2(e, 0.0)) * 0.9) - fbm3((p - vec2(e, 0.0)) * 0.9);
  float hz = fbm3((p + vec2(0.0, e)) * 0.9) - fbm3((p - vec2(0.0, e)) * 0.9);
  vec3 N = normalize(normalize(vN) + vec3(-hx, 0.0, -hz) * 1.1);
  float dif = max(dot(N, uL), 0.0);
  vec3 lit = base * (vec3(0.3, 0.33, 0.5) * (0.65 + 0.35 * N.y) + vec3(0.86, 0.89, 1.0) * dif * 0.82);
  // 亭子和桂花树脚下的一点阴影
  float o = max(max(abs(lp.x), abs(lp.y)), max(abs(lp.x + lp.y), abs(lp.x - lp.y)) * 0.7071);
  lit *= mix(0.72, 1.0, smoothstep(3.75, 5.2, o));
  lit *= mix(0.7, 1.0, smoothstep(1.3, 3.4, length(lp - vec2(-7.5, -2.5))));
  // 灯笼照在地上的暖光
  vec3 pool = vec3(0.0);
  for (int i = 0; i < 14; i++) {
    vec2 dv = lp - uPools[i].xy;
    float q = dot(dv, dv) / (uPools[i].z * uPools[i].z);
    pool += uPools[i].w / (1.0 + q * 3.0) * smoothstep(1.0, 0.3, q);
  }
  lit += base * vec3(1.0, 0.68, 0.38) * pool;
  // 月壤里亮晶晶的小晶粒，近处才看得见
  float dist = length(vW - cameraPosition);
  vec2 sc = p * 8.0;
  float hs = hash12(floor(sc) + 17.0);
  float sp = step(0.986, hs) * smoothstep(0.16, 0.0, length(fract(sc) - 0.5)) * (0.5 + 0.5 * sin(uTime * 2.3 + hs * 90.0 + dot(cameraPosition.xz, vec2(0.9, 0.6)) * 1.3));
  lit += vec3(0.82, 0.9, 1.0) * sp * 1.4 * smoothstep(22.0, 3.0, dist);
  gl_FragColor = vec4(mix(lit, uMFog, fogF(dist) * 0.92), 1.0);
}
`;

  /* ---------- 小工具 ---------- */
  const room = (M.room = (c, e) => {
    const col = new THREE.Color(c);
    return G.lambert({ color: col, emissive: col.clone().multiplyScalar(e === undefined ? 0.18 : e) });
  });
  M.mesh = function (geo, mat, x, y, z, parent) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    (parent || M.group).add(m);
    return m;
  };

  M.build = function (scene, lights, camera) {
    M.scene = scene;
    M.lights = lights;
    M.camera = camera;
    const g = (M.group = new THREE.Group());
    g.visible = false;
    scene.add(g);
    M.cols = { rects: [], circles: [] };
    M.glows = [];
    M.pools = [];

    /* 天空 */
    const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), SH.mat(SH.SKY_VS, SKY_FS, M.met, { side: THREE.BackSide, depthWrite: false }));
    sky.frustumCulled = false;
    sky.renderOrder = -100;
    g.add(sky);

    /* 月面 */
    const geo = new THREE.PlaneGeometry(200, 200, 160, 160);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = rawH(x, z), d = Math.hypot(x, z);
      pos.setY(i, h);
      // 大片的深浅（像月海）、坑底更暗、坑沿更亮、远山的山脊发白
      const mare = G.smooth(0.45, 0.7, G.vnoise(x * 0.035 + 4, z * 0.035 + 9) * 0.7 + G.vnoise(x * 0.09, z * 0.09) * 0.3);
      const ck = craterK(x, z) * G.smooth(9, 20, d);
      let c = 0.86 - mare * 0.12 + ck * 0.1;
      c += G.smooth(M.R, M.R + 30, d) * 0.06;
      const warm = G.vnoise(x * 0.05 + 20, z * 0.05) * 0.05;
      col.set([c * (0.78 + warm), c * 0.8, c * (0.9 - warm * 0.5)], i * 3);
    }
    geo.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    M.poolU = [];
    for (let i = 0; i < 14; i++) M.poolU.push(new THREE.Vector4(0, 0, 1, 0));
    const ground = new THREE.Mesh(geo, SH.mat(GROUND_VS, GROUND_FS, {
      uL: { value: M.LIGHT },
      uC: { value: C },
      uMFog: { value: M.FOG },
      uPools: { value: M.poolU }
    }));
    ground.position.copy(C);
    g.add(ground);

    /* 建筑和小物件（moon2.js） */
    M.buildParts(g);
    M.pools.slice(0, 14).forEach((p, i) => M.poolU[i].set(p[0], p[1], p[2], p[3]));

    /* 草原上的引路光点：夜里从小屋后面一直延伸到月亮方向 */
    const sd = G.U.uSunDir.value, dir = new THREE.Vector2(sd.x, sd.z).normalize();
    M.door = new THREE.Vector2(dir.x * 56, dir.y * 56);
    const n = 34, gp = new Float32Array(n * 3), gs = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / n, d = 6 + t * 50, w = Math.sin(t * 9) * 1.6;
      const x = dir.x * d - dir.y * w, z = dir.y * d + dir.x * w;
      gp.set([x, G.Field.height(x, z) + 0.6, z], i * 3);
      gs[i] = t;
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.BufferAttribute(gp, 3));
    gg.setAttribute('aT', new THREE.BufferAttribute(gs, 1));
    M.guide = new THREE.Points(gg, new THREE.ShaderMaterial({
      uniforms: Object.assign({}, G.U, { uAmt: { value: 0 } }),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: SH.COMMON + 'attribute float aT; uniform float uAmt; uniform float uPx; varying float vA; void main(){ vec3 p = position; p.y += sin(uTime * 1.5 + aT * 20.0) * 0.15; vec4 mv = viewMatrix * vec4(p, 1.0); float wave = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(aT * 12.0 - uTime * 2.2), 3.0); vA = uAmt * wave; gl_PointSize = min(0.9 * uPx / max(-mv.z, 0.5), 90.0) * step(0.01, vA); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); vec3 c = mix(vec3(1.0, 0.9, 0.7), vec3(0.75, 0.85, 1.0), d * 2.0); gl_FragColor = vec4(c * (smoothstep(0.5, 0.0, d) * 0.7 + smoothstep(0.12, 0.0, d)) * vA, 1.0); }'
    }));
    M.guide.frustumCulled = false;
    scene.add(M.guide);
    // 光点尽头：一道光柱
    const dy = G.Field.height(M.door.x, M.door.y);
    M.beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 40, 24, 1, true), new THREE.ShaderMaterial({
      uniforms: { uTime: G.U.uTime, uAmt: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uTime; uniform float uAmt; varying vec2 vUv; void main(){ float a = (1.0 - vUv.y) * (1.0 - vUv.y) * (0.75 + 0.25 * sin(vUv.x * 40.0 + uTime * 2.0)); gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a * 0.55 * uAmt, 1.0); }'
    }));
    M.beam.position.set(M.door.x, dy + 20, M.door.y);
    scene.add(M.beam);

    M.earthCols = G.Colliders;
  };

  /* ---------- 进出月亮 ---------- */
  function fade(on) {
    const f = document.getElementById('moonfade');
    f.classList.toggle('on', on);
  }
  // 月亮世界用图层 1：在月亮上时镜头只看图层 1，草原上的东西不会被画出来
  const MOON_LAYER = 1;
  M.layer = (o) => o.traverse((c) => c.layers.enable(MOON_LAYER));
  function swapWorld(toMoon) {
    M.group.visible = toMoon;
    const sun = M.lights.sun;
    if (toMoon) {
      M.layer(M.group);
      if (G.Cat) M.layer(G.Cat.root);
      for (const o of M.scene.children) if (o.isLight || o.userData.keep) o.layers.enable(MOON_LAYER);
      M.camera.layers.set(MOON_LAYER);
      G.Colliders = M.cols;
      sun.position.copy(M.LIGHT).multiplyScalar(100);
    } else {
      M.camera.layers.set(0);
      G.Colliders = M.earthCols;
      sun.position.copy(G.U.uSunDir.value).multiplyScalar(100);
    }
    M.on = toMoon;
    document.body.classList.toggle('moon', toMoon);
  }
  function placeCat(x, z, heading) {
    const Ct = G.Cat;
    if (!Ct) return;
    Ct.x = x;
    Ct.z = z;
    Ct.y = G.Player.groundAt(x, z);
    Ct.heading = heading;
    Ct.state = 'sit';
    Ct.timer = 6;
    Ct.path = [];
  }
  M.enter = function () {
    if (M.busy || M.on) return;
    M.busy = true;
    fade(true);
    G.Audio.sfx('portal');
    setTimeout(() => {
      swapWorld(true);
      const P = G.Player;
      if (P.seat) P.stand();
      P.x = C.x + 0.4;
      P.z = C.z + 21;
      P.y = M.groundAt(P.x, P.z) + P.eye;
      P.vy = 0;
      P.yaw = 0;
      P.pitch = 0.08;
      placeCat(C.x + 1.6, C.z + 19.5, Math.PI);
      if (G.Cat) G.Cat.spots = [[C.x + 3.6, C.z + 4.6], [C.x + 5.6, C.z + 1.6], [C.x - 4.1, C.z + 1.9], [C.x + 1.6, C.z + 4.6], [C.x - 2.2, C.z + 9.5]];
      setTimeout(() => {
        fade(false);
        M.busy = false;
      }, 400);
    }, 1300);
  };
  M.exit = function () {
    if (M.busy || !M.on) return;
    M.busy = true;
    fade(true);
    G.Audio.sfx('portal');
    setTimeout(() => {
      swapWorld(false);
      const P = G.Player, d = M.door;
      if (P.seat) P.stand();
      const back = new THREE.Vector2(-d.x, -d.y).normalize();
      P.x = d.x + back.x * 5;
      P.z = d.y + back.y * 5;
      P.y = G.Field.height(P.x, P.z) + P.eye;
      P.vy = 0;
      P.yaw = Math.atan2(-back.x, -back.y);
      P.pitch = 0;
      placeCat(P.x + back.x * 1.4 + 0.6, P.z + back.y * 1.4, P.yaw + Math.PI);
      if (G.Cat) G.Cat.spots = null;
      M.cool = 4;
      setTimeout(() => {
        fade(false);
        M.busy = false;
      }, 400);
    }, 1300);
  };

  /* ---------- 每帧 ---------- */
  M.update = function (dt, t, P) {
    const nk = G.U.uNight.value;
    M.cool = Math.max(0, (M.cool || 0) - dt);
    if (!M.on) {
      // 夜里点亮引路光点；走进光柱就进入月亮
      const amt = G.smooth(0.55, 1, nk);
      M.guide.material.uniforms.uAmt.value = amt;
      M.beam.material.uniforms.uAmt.value = amt;
      M.guide.visible = M.beam.visible = amt > 0.01;
      if (amt > 0.9 && !M.cool && Math.hypot(P.x - M.door.x, P.z - M.door.y) < 2.6) M.enter();
      if (amt > 0.9 && !M.told) {
        M.told = true;
        setTimeout(() => { if (!M.on && !M.busy && G.U.uNight.value > 0.5) G.UI.toast('月亮好像在召唤你……顺着光点朝它走走看'); }, 2500);
      }
      return;
    }
    // 月面上：灯光换成清冷的月色
    const Lg = M.lights;
    Lg.hemi.color.setRGB(0.44, 0.49, 0.72);
    Lg.hemi.groundColor.setRGB(0.22, 0.22, 0.31);
    Lg.sun.color.setRGB(0.74, 0.77, 0.88);
    Lg.fill.color.setRGB(0.3, 0.32, 0.5);
    M.scene.fog.color.copy(M.FOG);
    M.animate(dt, t, P);
    // 走进月洞门就回草原
    if (!M.busy && Math.abs(P.z - M.gate.z) < 0.6 && Math.abs(P.x - M.gate.x) < 1.0) M.exit();
    // 月亮上的边界
    const dx = P.x - C.x, dz = P.z - C.z, d = Math.hypot(dx, dz);
    if (d > M.R) {
      P.x = C.x + (dx / d) * M.R;
      P.z = C.z + (dz / d) * M.R;
    }
    // 流星：隔一会儿划过一颗；正好在眼前时配一声很轻的“咻——叮”
    M.metNext = (M.metNext === undefined ? 4 : M.metNext) - dt;
    if (M.metNext <= 0) {
      M.metNext = 7 + Math.random() * 9;
      const a = Math.random() * Math.PI * 2, S0 = M.met.uMetS.value.set(Math.cos(a), 0.5 + Math.random() * 0.9, Math.sin(a)).normalize();
      const T1 = v3(0, 1, 0).cross(S0).negate().normalize(), B1 = T1.clone().cross(S0);
      M.met.uMetD.value.copy(T1).multiplyScalar(Math.random() < 0.5 ? 1 : -1).addScaledVector(B1, -0.55).normalize();
      M.met.uMetT.value = G.U.uTime.value;
      const cp = Math.cos(P.pitch), look = v3(-Math.sin(P.yaw) * cp, Math.sin(P.pitch), -Math.cos(P.yaw) * cp);
      if (look.dot(S0) > 0.72) G.Audio.sfx('meteor', 0.9);
    }
    // 很久才有一声颂钵，月亮上很安静
    M.bowlT = (M.bowlT === undefined ? 16 : M.bowlT) - dt;
    if (M.bowlT <= 0) {
      M.bowlT = 40 + Math.random() * 25;
      G.Audio.bowl(0.17);
    }
  };

  G.Moon = M;
})();
