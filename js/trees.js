/* 草原小屋 · 树（橡树 / 樱花树 / 松树），随季节变色、落叶、积雪 */
(function () {
  'use strict';
  G.Colliders = G.Colliders || { rects: [], circles: [] };

  function makeBucket() {
    return { p: [], n: [], c: [], b: [] };
  }
  // 把几何体按矩阵变换后塞进桶里；normalFn 可改写法线
  function push(bk, geo, m, color, blob, normalFn) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const pos = g.attributes.position, nor = g.attributes.normal;
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    const v = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m);
      n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      if (normalFn) normalFn(v, n);
      bk.p.push(v.x, v.y, v.z);
      bk.n.push(n.x, n.y, n.z);
      bk.c.push(color[0], color[1], color[2]);
      if (blob) bk.b.push(blob[0], blob[1], blob[2], blob[3]);
      else bk.b.push(v.x, v.y, v.z, -1);
    }
  }
  function lumpy(r, seed) {
    const g = new THREE.IcosahedronGeometry(r, 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 1 + (G.hash2(x * 13.1 + seed, y * 5.3 + z * 7.7) - 0.5) * 0.22;
      p.setXYZ(i, x * k, y * k, z * k);
    }
    g.computeVertexNormals();
    return g;
  }
  function cyl(rTop, rBot, h) {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, 8, 1, true);
    g.translate(0, h / 2, 0);
    return g;
  }
  function M(x, y, z, rx, ry, rz) {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, 'YXZ'));
    m.setPosition(x, y, z);
    return m;
  }

  function addBranches(bark, x, y0, z, s, rng, count, yA, yB, len) {
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + rng() * 0.8;
      const y = y0 + (yA + (yB - yA) * rng()) * s;
      const tilt = 0.7 + rng() * 0.35;
      push(bark, cyl(0.05 * s, 0.12 * s, len * s * (0.8 + 0.4 * rng())), M(x, y, z, 0, ang, tilt), [1, 1, 1]);
    }
  }

  function buildTree(t, B, rng) {
    const s = t.s, x = t.x, z = t.z, y = G.Field.height(x, z) - 0.15;
    const leafCol = () => {
      const v = 0.82 + 0.3 * rng();
      return [v, v * (0.94 + 0.1 * rng()), v * (0.9 + 0.12 * rng())];
    };
    if (t.type === 'pine') {
      push(B.bark, cyl(0.12 * s, 0.26 * s, 2.4 * s), M(x, y, z), [1, 1, 1]);
      const cx = x, cz = z;
      for (let i = 0; i < 4; i++) {
        const r = 2.1 * s * (1 - i * 0.21), h = 2.5 * s, by = y + (1.0 + i * 1.35) * s;
        const g = new THREE.ConeGeometry(r, h, 11, 1);
        g.translate(0, h / 2, 0);
        const ax = by + h * 0.3;
        push(B.pine, g, M(x, by, z, 0, rng() * 3, 0), leafCol(), null, (v, n) => {
          const rx = v.x - cx, rz = v.z - cz, l = Math.hypot(rx, rz) || 1;
          n.set(rx / l, Math.max(0.35, (v.y - ax) / (h * 0.8)), rz / l).normalize();
        });
      }
      G.Colliders.circles.push({ x, z, r: 0.4 * s });
      return;
    }
    const oak = t.type === 'oak';
    const trunkH = (oak ? 3.6 : 2.6) * s;
    push(B.bark, cyl(0.2 * s, (oak ? 0.36 : 0.28) * s, trunkH), M(x, y, z, 0, 0, (rng() - 0.5) * 0.08), [1, 1, 1]);
    addBranches(B.bark, x, y, z, s, rng, oak ? 5 : 4, oak ? 2.4 : 1.7, oak ? 3.5 : 2.5, oak ? 2.1 : 1.6);
    // 树冠
    const cy = y + (oak ? 4.6 : 3.5) * s;
    const blobs = [[0, 0, 0, oak ? 2.0 : 1.7]];
    const ring = oak ? 6 : 5;
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2 + rng() * 0.5;
      const rr = (oak ? 1.55 : 1.45) * (0.85 + 0.3 * rng());
      blobs.push([Math.cos(a) * rr, (rng() - 0.45) * (oak ? 1.1 : 0.7), Math.sin(a) * rr, (oak ? 1.25 : 1.05) * (0.85 + 0.3 * rng())]);
    }
    blobs.push([0.2, oak ? 1.3 : 0.9, -0.1, oak ? 1.3 : 1.0]);
    const center = new THREE.Vector3(x, cy, z);
    const bucket = oak ? B.oak : B.blossom;
    blobs.forEach((b, i) => {
      const bx = x + b[0] * s, by = cy + b[1] * s, bz = z + b[2] * s;
      const thr = i === 0 ? 0.14 : 0.2 + 0.5 * rng(); // 冬天按顺序凋零
      const br = b[3] * s;
      push(bucket, lumpy(br, i * 3.7 + x), M(bx, by, bz), leafCol(), [bx, by, bz, thr], (v, n) => {
        // 柔和的“棉花团”法线：一半朝着小团中心，一半朝着整棵树冠中心
        const a = new THREE.Vector3(v.x - bx, v.y - by, v.z - bz).normalize();
        const c = new THREE.Vector3(v.x - center.x, (v.y - center.y) * 1.2, v.z - center.z).normalize();
        n.copy(a).add(c).normalize();
      });
    });
    G.Colliders.circles.push({ x, z, r: (oak ? 0.45 : 0.36) * s });
  }

  function toMesh(bk, mat) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(bk.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(bk.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(bk.c, 3));
    g.setAttribute('aBlob', new THREE.Float32BufferAttribute(bk.b, 4));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.frustumCulled = false;
    return m;
  }

  // 改写 Lambert：树叶随季节缩放消失、朝上的面积雪
  function treeMat(color, scale, snowK, key, sway) {
    const mat = G.lambert({ color: new THREE.Color(color), vertexColors: true }, (sh) => {
      sh.uniforms.uFol = G.U.uFoliage;
      sh.uniforms.uSnow = G.U.uSnow;
      sh.uniforms.uTime = G.U.uTime;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 aBlob;\nuniform float uFol;\nuniform float uTime;\nvarying float vUpN;')
        .replace(
          '#include <begin_vertex>',
          'vec3 transformed = vec3( position );\n' +
            (scale ? 'float fs = smoothstep( aBlob.w - 0.12, aBlob.w + 0.04, uFol );\ntransformed = aBlob.xyz + ( position - aBlob.xyz ) * fs;\n' : '') +
            // 树冠随风轻轻晃
            (sway ? 'transformed.x += sin( uTime * 1.2 + position.y * 0.9 + position.z * 0.35 ) * ' + sway.toFixed(3) + ';\ntransformed.z += cos( uTime * 1.0 + position.y * 0.8 + position.x * 0.3 ) * ' + (sway * 0.8).toFixed(3) + ';\n' : '') +
            'vUpN = normal.y;'
        );
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uSnow;\nvarying float vUpN;')
        .replace(
          '#include <color_fragment>',
          '#include <color_fragment>\ndiffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.93, 0.95, 1.0 ), uSnow * smoothstep( 0.3, 0.85, vUpN ) * ' + snowK.toFixed(2) + ' );'
        );
    }, key);
    return mat;
  }

  const T = {};
  T.build = function (scene) {
    const rng = G.rng(777);
    const B = { bark: makeBucket(), oak: makeBucket(), blossom: makeBucket(), pine: makeBucket() };
    for (const t of G.Field.TREES) buildTree(t, B, rng);
    T.barkMat = treeMat(0x6e5241, false, 0.8, 'bark');
    T.oakMat = treeMat(0x6aa040, true, 0.6, 'leaf', 0.05);
    T.blossomMat = treeMat(0xffb6cc, true, 0.6, 'leaf', 0.05);
    T.pineMat = treeMat(0x2c5236, false, 0.9, 'pine', 0.025);
    scene.add(toMesh(B.bark, T.barkMat));
    scene.add(toMesh(B.oak, T.oakMat));
    scene.add(toMesh(B.blossom, T.blossomMat));
    scene.add(toMesh(B.pine, T.pineMat));
  };
  T.update = function (S) {
    T.oakMat.color.setRGB(S.oak[0], S.oak[1], S.oak[2]);
    T.blossomMat.color.setRGB(S.blos[0], S.blos[1], S.blos[2]);
    T.pineMat.color.setRGB(S.pine[0], S.pine[1], S.pine[2]);
    // 树叶有一点透光感，逆光时不至于发闷
    T.oakMat.emissive.copy(T.oakMat.color).multiplyScalar(0.2);
    T.blossomMat.emissive.copy(T.blossomMat.color).multiplyScalar(0.24);
    T.pineMat.emissive.copy(T.pineMat.color).multiplyScalar(0.1);
  };
  G.Trees = T;
})();
