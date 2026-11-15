/* 草原小屋 · 公共工具与共享状态 */
(function () {
  'use strict';
  const G = (window.G = {});

  G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.smooth = (a, b, x) => {
    const t = G.clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  G.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  G.gauss = function (r) {
    let u = 0;
    while (u === 0) u = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
  };
  G.hash2 = (x, y) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  G.vnoise = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = G.hash2(ix, iy), b = G.hash2(ix + 1, iy), c = G.hash2(ix, iy + 1), d = G.hash2(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };

  /* ---------- 所有着色器共享的 uniform ---------- */
  const C = () => new THREE.Color();
  G.U = {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(-0.485, 0.242, -0.84).normalize() },
    uSunColor: { value: C() },
    uAmbTop: { value: C() },
    uAmbBottom: { value: C() },
    uFogColor: { value: C() },
    uSunGlow: { value: C() },
    uFogDensity: { value: 0.0095 },
    uZenith: { value: C() },
    uCloudLit: { value: C() },
    uCloudShade: { value: C() },
    uMountain: { value: C() },
    uGrassBase: { value: C() },
    uGrassTip: { value: C() },
    uGrassAlt: { value: C() },
    uGrassH: { value: 1 },
    uRim: { value: new THREE.Color(1.0, 0.78, 0.45) },
    uShadowTint: { value: new THREE.Color(0.68, 0.7, 1.0) },
    uSnow: { value: 0 },
    uSnowColor: { value: new THREE.Color(0.95, 0.96, 1.0) },
    uFoliage: { value: 1 },
    uFlowerAmt: { value: 0.5 },
    uBdayAmt: { value: 0 },
    uBdayRadius: { value: 0 },
    uBdayOrigin: { value: new THREE.Vector2() },
    uWindDir: { value: new THREE.Vector2(0.82, 0.57).normalize() },
    uField: { value: null },
    uFieldHalf: { value: 112 },
    uPath: { value: [] },
    uPress: { value: [new THREE.Vector4(0, 0, 1, 0), new THREE.Vector4(0, 0, 1, 0)] },
    uPx: { value: 600 }
  };
  // 室内灯光（暖色）
  G.RU = {
    uLampPos: { value: new THREE.Vector3(0, 2.85, 0.2) },
    uLampColor: { value: new THREE.Color(1.0, 0.74, 0.44) },
    uRoomAmb: { value: new THREE.Color(0.46, 0.37, 0.32) },
    uCandle: { value: new THREE.Vector4(2.4, 1.3, 0.7, 0) }
  };

  /* ---------- 雾：带夕阳方向暖色的指数雾（覆盖 three 内置雾） ---------- */
  THREE.ShaderChunk.fog_pars_vertex = [
    '#ifdef USE_FOG',
    'varying float vFogDepth;',
    'varying vec3 vFogWorld;',
    '#endif'
  ].join('\n');
  THREE.ShaderChunk.fog_vertex = [
    '#ifdef USE_FOG',
    'vFogDepth = - mvPosition.z;',
    'vec4 fogWP = vec4( transformed, 1.0 );',
    '#ifdef USE_INSTANCING',
    'fogWP = instanceMatrix * fogWP;',
    '#endif',
    'vFogWorld = ( modelMatrix * fogWP ).xyz;',
    '#endif'
  ].join('\n');
  THREE.ShaderChunk.fog_pars_fragment = [
    '#ifdef USE_FOG',
    'uniform vec3 fogColor;',
    'varying float vFogDepth;',
    'varying vec3 vFogWorld;',
    'uniform vec3 uSunDir;',
    'uniform vec3 uSunGlow;',
    'uniform vec3 uZenith;',
    '#ifdef FOG_EXP2',
    'uniform float fogDensity;',
    '#else',
    'uniform float fogNear;',
    'uniform float fogFar;',
    '#endif',
    '#endif'
  ].join('\n');
  THREE.ShaderChunk.fog_fragment = [
    '#ifdef USE_FOG',
    '#ifdef FOG_EXP2',
    'float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );',
    '#else',
    'float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );',
    '#endif',
    'vec3 fogDirV = normalize( vFogWorld - cameraPosition );',
    'float fogSd = dot( fogDirV, uSunDir );',
    'vec3 fogBase = mix( fogColor, mix( fogColor, uZenith, 0.5 ), smoothstep( 0.35, -0.75, fogSd ) );',
    'vec3 fogCol = fogBase + uSunGlow * ( pow( max( fogSd, 0.0 ), 8.0 ) * 0.55 );',
    'gl_FragColor.rgb = mix( gl_FragColor.rgb, fogCol, fogFactor );',
    '#endif'
  ].join('\n');

  // 给内置材质挂上雾需要的 uniform；extra 可继续改写着色器，key 用来区分程序缓存
  G.patch = function (mat, extra, key) {
    mat.onBeforeCompile = function (sh) {
      sh.uniforms.uSunDir = G.U.uSunDir;
      sh.uniforms.uSunGlow = G.U.uSunGlow;
      sh.uniforms.uZenith = G.U.uZenith;
      if (extra) extra(sh);
    };
    const k = 'grass-' + (key || 'base');
    mat.customProgramCacheKey = () => k;
    return mat;
  };
  G.lambert = (params, extra, key) => G.patch(new THREE.MeshLambertMaterial(params), extra, key);

  /* ---------- 画布贴图 ---------- */
  G.canvas = function (w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    return c;
  };
  G.tex = function (canvas, repeat) {
    const t = new THREE.CanvasTexture(canvas);
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  };

  // 柔光精灵（假泛光）
  G.glowTex = G.tex(
    G.canvas(128, 128, (x) => {
      const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.22, 'rgba(255,255,255,0.55)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.14)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 128, 128);
    })
  );
  G.glow = function (color, size, opacity) {
    const m = new THREE.SpriteMaterial({
      map: G.glowTex,
      color: new THREE.Color(color),
      transparent: true,
      opacity: opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    const s = new THREE.Sprite(m);
    s.scale.set(size, size, 1);
    s.userData.baseOpacity = opacity;
    return s;
  };

  /* ---------- 几何体合并器：按材质分桶，世界坐标贴图 ---------- */
  G.Merger = class {
    constructor() {
      this.buckets = new Map();
    }
    bucket(key) {
      let b = this.buckets.get(key);
      if (!b) {
        b = { p: [], n: [], uv: [], c: [] };
        this.buckets.set(key, b);
      }
      return b;
    }
    // keys: 字符串 / 按 group 的数组 / 函数(世界法线, groupIndex) => key
    add(geo, m, keys, opts) {
      opts = opts || {};
      const g = geo.index ? geo.toNonIndexed() : geo;
      const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
      const nm = new THREE.Matrix3().getNormalMatrix(m);
      const groups = g.groups && g.groups.length ? g.groups : [{ start: 0, count: pos.count, materialIndex: 0 }];
      const v = new THREE.Vector3(), n = new THREE.Vector3(), fn = new THREE.Vector3();
      const col = opts.color || [1, 1, 1];
      const s = opts.uvScale || 1;
      for (const gr of groups) {
        for (let i = gr.start; i < gr.start + gr.count; i += 3) {
          // 用三角形第一个顶点的法线来决定材质
          fn.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
          const key = typeof keys === 'function' ? keys(fn, gr.materialIndex) : Array.isArray(keys) ? keys[gr.materialIndex] : keys;
          if (key == null) continue;
          const b = this.bucket(key);
          for (let k = i; k < i + 3; k++) {
            v.fromBufferAttribute(pos, k).applyMatrix4(m);
            n.fromBufferAttribute(nor, k).applyMatrix3(nm).normalize();
            b.p.push(v.x, v.y, v.z);
            b.n.push(n.x, n.y, n.z);
            if (opts.uv === 'keep' && uv) {
              b.uv.push(uv.getX(k), uv.getY(k));
            } else {
              const ax = Math.abs(fn.x), ay = Math.abs(fn.y), az = Math.abs(fn.z);
              if (ay >= ax && ay >= az) b.uv.push(v.x * s, v.z * s);
              else if (ax >= az) b.uv.push(v.z * s, v.y * s);
              else b.uv.push(v.x * s, v.y * s);
            }
            b.c.push(col[0], col[1], col[2]);
          }
        }
      }
    }
    box(w, h, d, x, y, z, keys, opts, rot) {
      const m = new THREE.Matrix4();
      if (rot) m.makeRotationFromEuler(rot);
      m.setPosition(x, y, z);
      if (opts && opts.parent) m.premultiply(opts.parent);
      this.add(new THREE.BoxGeometry(w, h, d), m, keys, opts);
    }
    build(mats) {
      const grp = new THREE.Group();
      for (const [key, b] of this.buckets) {
        const mat = mats[key];
        if (!mat) continue;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3));
        geo.computeBoundingSphere();
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = key;
        grp.add(mesh);
      }
      return grp;
    }
  };

  // 等待一帧，让加载文字有机会刷新
  G.nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
})();
