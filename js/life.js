/* 草原小屋 · 一点生气：掠过晚霞的鸟群、花丛间的蝴蝶 */
(function () {
  'use strict';
  const SH = G.SH;
  const L = {};

  const BIRD_VS = SH.COMMON + /* glsl */ `
attribute vec3 aOff;
attribute float aPh;
varying float vFog;
varying vec3 vDir;
void main(){
  float t = uTime;
  float ang = t * 0.045 + 3.6;
  vec3 C = vec3(cos(ang) * 150.0, 60.0 + sin(t * 0.13) * 8.0, sin(ang) * 150.0);
  vec3 fwd = vec3(-sin(ang), 0.0, cos(ang));
  vec3 right = vec3(fwd.z, 0.0, -fwd.x);
  float flap = sin(t * 6.5 + aPh);
  vec3 p = position;
  p.y += abs(p.x) * flap * 0.6;
  p.x *= 1.0 - 0.25 * abs(flap);
  p *= 1.35;
  vec3 wp = C + right * (aOff.x + p.x) + vec3(0.0, aOff.y + p.y + sin(t * 0.9 + aPh) * 0.6, 0.0) + fwd * (aOff.z + p.z);
  vDir = wp - cameraPosition;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  vFog = fogF(-mv.z);
  gl_Position = projectionMatrix * mv;
}
`;
  const BIRD_FS = SH.COMMON + /* glsl */ `
varying float vFog;
varying vec3 vDir;
void main(){
  gl_FragColor = vec4(mix(vec3(0.17, 0.14, 0.2), fogC(normalize(vDir)), vFog * 0.75), 1.0);
}
`;
  const FLY_VS = SH.COMMON + /* glsl */ `
attribute vec4 aSeed;
uniform vec3 uBox;
uniform float uAmount;
varying vec3 vColor;
varying float vFog;
varying vec3 vDir;
void main(){
  float t = uTime;
  float r = aSeed.w;
  vec2 base = cameraPosition.xz - 0.5 * uBox.xz;
  vec2 xz = aSeed.xz * uBox.xz + vec2(sin(t * 0.23 + r * 20.0), cos(t * 0.19 + r * 13.0)) * 3.0;
  xz = base + mod(xz - base, uBox.xz);
  float g = fieldAt(xz).r;
  float y = g + 0.75 + 0.7 * aSeed.y + sin(t * 1.3 + r * 9.0) * 0.3;
  float yaw = t * (r - 0.5) + r * 30.0 + sin(t * 0.7 + r * 5.0);
  float flap = abs(sin(t * 13.0 + r * 40.0));
  float a = 0.2 + flap * 1.15;
  float vis = step(r, uAmount) * (1.0 - smoothstep(0.3, 0.6, uSnow));
  vec3 p = position * 0.075 * vis;
  p = vec3(p.x * cos(a), abs(p.x) * sin(a), p.z);
  float cy = cos(yaw); float sy = sin(yaw);
  vec3 wp = vec3(xz.x, y, xz.y) + vec3(p.x * cy - p.z * sy, p.y, p.x * sy + p.z * cy);
  float h = fract(r * 5.37);
  vec3 c = h < 0.3 ? vec3(1.0, 0.98, 0.94) : (h < 0.55 ? vec3(1.0, 0.86, 0.4) : (h < 0.8 ? vec3(0.66, 0.82, 1.0) : vec3(1.0, 0.66, 0.6)));
  c *= 0.82 + 0.25 * abs(position.x);
  vColor = c * (mix(uAmbBottom, uAmbTop, 0.75) + uSunColor * 0.6);
  vDir = wp - cameraPosition;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  vFog = fogF(-mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

  L.build = function (scene) {
    // 鸟群：人字形
    const N = 9;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.28, 0, 0, -0.28, -1, 0, -0.12, 0, 0, 0.28, 0, 0, -0.28, 1, 0, -0.12], 3));
    const off = new Float32Array(N * 3), ph = new Float32Array(N);
    const r = G.rng(404);
    for (let i = 0; i < N; i++) {
      const k = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
      off.set([side * k * 2.3 + (r() - 0.5) * 0.8, k * 0.25 + (r() - 0.5) * 0.8, -k * 2.1 + (r() - 0.5) * 0.6], i * 3);
      ph[i] = r() * 6.28;
    }
    g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3));
    g.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 1));
    g.instanceCount = N;
    L.birds = new THREE.Mesh(g, SH.mat(BIRD_VS, BIRD_FS, {}, { side: THREE.DoubleSide }));
    L.birds.frustumCulled = false;
    scene.add(L.birds);

    // 蝴蝶
    const M = 16;
    const b = new THREE.InstancedBufferGeometry();
    b.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.55, 0, 0, -0.5, -1, 0, 0.2, 0, 0, 0.55, 0, 0, -0.5, 1, 0, 0.2], 3));
    const seed = new Float32Array(M * 4);
    for (let i = 0; i < M * 4; i++) seed[i] = r();
    for (let i = 0; i < M; i++) seed[i * 4 + 3] = (i + 0.5) / M;
    b.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
    b.instanceCount = M;
    L.flies = new THREE.Mesh(b, SH.mat(FLY_VS, SH.SIMPLE_FS, { uBox: { value: new THREE.Vector3(26, 1, 26) }, uAmount: { value: 0 } }, { side: THREE.DoubleSide }));
    L.flies.frustumCulled = false;
    scene.add(L.flies);
  };
  L.update = function (S, bday) {
    L.flies.material.uniforms.uAmount.value = Math.max(G.clamp(S.flw * 1.8, 0, 1), bday);
  };
  G.Life = L;
})();
