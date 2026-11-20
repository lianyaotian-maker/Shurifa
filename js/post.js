/* 草原小屋 · 后期：柔光（泛光）、夕阳光束、高光柔和过渡、调色、暗角、抖动
   不支持时自动退回到直接渲染。 */
(function () {
  'use strict';
  const P = { ok: false, hdr: false, enabled: true };
  let R, gl, rtScene, down = [], up = [], rtRays, cam, scene, quad;
  const size = new THREE.Vector2();
  const sunNdc = new THREE.Vector3(), fwd = new THREE.Vector3();

  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const PRE_FS = /* glsl */ `
uniform sampler2D tMap; uniform vec2 uTexel; uniform float uThr; uniform float uKnee;
varying vec2 vUv;
void main(){
  vec3 c = (texture2D(tMap, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(tMap, vUv + uTexel * vec2(1.0, -1.0)).rgb
          + texture2D(tMap, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(tMap, vUv + uTexel * vec2(1.0, 1.0)).rgb) * 0.25;
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThr + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 0.0001);
  c *= max(soft, br - uThr) / max(br, 0.0001);
  gl_FragColor = vec4(min(c, vec3(4.0)), 1.0);
}`;
  const DOWN_FS = /* glsl */ `
uniform sampler2D tMap; uniform vec2 uTexel;
varying vec2 vUv;
void main(){
  vec3 c = texture2D(tMap, vUv).rgb * 0.5;
  c += (texture2D(tMap, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(tMap, vUv + uTexel * vec2(1.0, -1.0)).rgb
      + texture2D(tMap, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(tMap, vUv + uTexel * vec2(1.0, 1.0)).rgb) * 0.125;
  gl_FragColor = vec4(c, 1.0);
}`;
  const UP_FS = /* glsl */ `
uniform sampler2D tLow; uniform sampler2D tHigh; uniform vec2 uTexel;
varying vec2 vUv;
void main(){
  vec3 l = (texture2D(tLow, vUv + uTexel * vec2(-0.5, -0.5)).rgb + texture2D(tLow, vUv + uTexel * vec2(0.5, -0.5)).rgb
          + texture2D(tLow, vUv + uTexel * vec2(-0.5, 0.5)).rgb + texture2D(tLow, vUv + uTexel * vec2(0.5, 0.5)).rgb) * 0.25;
  gl_FragColor = vec4(texture2D(tHigh, vUv).rgb + l, 1.0);
}`;
  const RAYS_FS = /* glsl */ `
uniform sampler2D tMap; uniform vec2 uSun;
varying vec2 vUv;
void main(){
  vec2 d = uSun - vUv;
  vec3 acc = vec3(0.0); float w = 1.0; float tot = 0.0;
  for (int i = 0; i < 22; i++) {
    acc += texture2D(tMap, vUv + d * (float(i) / 22.0) * 0.92).rgb * w;
    tot += w; w *= 0.93;
  }
  gl_FragColor = vec4(acc / tot, 1.0);
}`;
  const FINAL_FS = /* glsl */ `
uniform sampler2D tScene; uniform sampler2D tBloom; uniform sampler2D tRays;
uniform float uBloom; uniform float uRays; uniform float uHdr; uniform float uTime; uniform float uWarm;
varying vec2 vUv;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec3 c = texture2D(tScene, vUv).rgb;
  c += texture2D(tBloom, vUv).rgb * uBloom;
  c += texture2D(tRays, vUv).rgb * uRays;
  c = max(c, 0.0);
  // 高光不再一刀切成白色，而是柔和地过渡
  vec3 hi = 0.78 + 0.22 * (1.0 - exp(-(c - 0.78) / 0.22));
  c = mix(c, mix(c, hi, step(0.78, c)), uHdr);
  // 一点点饱和度和暖意
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 1.08);
  c *= mix(vec3(1.0), vec3(1.025, 1.0, 0.972), uWarm);
  // 暗角
  vec2 q = (vUv - 0.5) * vec2(1.0, 0.82);
  c *= 1.0 - 0.2 * smoothstep(0.32, 0.78, length(q));
  // 抖动，消除天空渐变的色带
  c += (hash12(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 255.0;
  gl_FragColor = vec4(c, 1.0);
}`;

  function target(type, extra) {
    return new THREE.WebGLRenderTarget(4, 4, Object.assign({
      type, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false, generateMipmaps: false
    }, extra || {}));
  }
  function mat(fs, uniforms) {
    return new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });
  }
  function complete(rt) {
    R.setRenderTarget(rt);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    R.setRenderTarget(null);
    return ok;
  }

  P.init = function (renderer) {
    R = renderer;
    gl = R.getContext();
    try {
      if (!R.capabilities.isWebGL2 || /[?&]post=0/.test(location.search)) return false;
      P.hdr = R.extensions.has('EXT_color_buffer_half_float') || R.extensions.has('EXT_color_buffer_float');
      let type = P.hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
      rtScene = target(type, { depthBuffer: true, samples: 4 });
      if (!complete(rtScene)) {
        rtScene.dispose();
        P.hdr = false;
        type = THREE.UnsignedByteType;
        rtScene = target(type, { depthBuffer: true, samples: 4 });
        if (!complete(rtScene)) {
          rtScene.dispose();
          rtScene = target(type, { depthBuffer: true });
          if (!complete(rtScene)) return false;
        }
      }
      for (let i = 0; i < 4; i++) down.push(target(type));
      for (let i = 0; i < 3; i++) up.push(target(type));
      rtRays = target(type);
      if (!complete(down[0])) return false;
      cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      scene = new THREE.Scene();
      quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
      quad.frustumCulled = false;
      scene.add(quad);
      P.m = {
        pre: mat(PRE_FS, { tMap: { value: null }, uTexel: { value: new THREE.Vector2() }, uThr: { value: P.hdr ? 1.0 : 0.86 }, uKnee: { value: P.hdr ? 0.3 : 0.1 } }),
        down: mat(DOWN_FS, { tMap: { value: null }, uTexel: { value: new THREE.Vector2() } }),
        up: mat(UP_FS, { tLow: { value: null }, tHigh: { value: null }, uTexel: { value: new THREE.Vector2() } }),
        rays: mat(RAYS_FS, { tMap: { value: null }, uSun: { value: new THREE.Vector2(0.5, 0.5) } }),
        fin: mat(FINAL_FS, {
          tScene: { value: null }, tBloom: { value: null }, tRays: { value: null },
          uBloom: { value: P.hdr ? 0.2 : 0.12 }, uRays: { value: 0 }, uHdr: { value: P.hdr ? 1 : 0 }, uTime: G.U.uTime, uWarm: { value: 1 }
        })
      };
      P.ok = true;
      P.resize();
      return true;
    } catch (e) {
      P.ok = false;
      return false;
    }
  };

  P.resize = function () {
    if (!P.ok) return;
    R.getDrawingBufferSize(size);
    const w = Math.max(8, size.x), h = Math.max(8, size.y);
    rtScene.setSize(w, h);
    for (let i = 0; i < 4; i++) down[i].setSize(Math.max(2, w >> (i + 2)), Math.max(2, h >> (i + 2)));
    for (let i = 0; i < 3; i++) up[i].setSize(Math.max(2, w >> (i + 2)), Math.max(2, h >> (i + 2)));
    rtRays.setSize(Math.max(2, w >> 2), Math.max(2, h >> 2));
  };

  function pass(m, out) {
    quad.material = m;
    R.setRenderTarget(out);
    R.render(scene, cam);
  }

  P.render = function (sc, camera) {
    if (!P.ok || !P.enabled) {
      R.setRenderTarget(null);
      R.render(sc, camera);
      return;
    }
    const m = P.m;
    // 雪地本身就很亮：提高门槛、减弱柔光，免得整片发白
    const snow = G.U.uSnow.value;
    m.pre.uniforms.uThr.value = (P.hdr ? 1.0 : 0.86) + (P.hdr ? 0.6 : 0.1) * snow;
    m.fin.uniforms.uBloom.value = (P.hdr ? 0.17 : 0.11) * (1 - 0.4 * snow);
    R.setRenderTarget(rtScene);
    R.render(sc, camera);
    // 提取高光并逐级缩小、再逐级放大叠加
    m.pre.uniforms.tMap.value = rtScene.texture;
    m.pre.uniforms.uTexel.value.set(1 / rtScene.width, 1 / rtScene.height);
    pass(m.pre, down[0]);
    for (let i = 1; i < 4; i++) {
      m.down.uniforms.tMap.value = down[i - 1].texture;
      m.down.uniforms.uTexel.value.set(1 / down[i - 1].width, 1 / down[i - 1].height);
      pass(m.down, down[i]);
    }
    let low = down[3];
    for (let i = 2; i >= 0; i--) {
      m.up.uniforms.tLow.value = low.texture;
      m.up.uniforms.tHigh.value = down[i].texture;
      m.up.uniforms.uTexel.value.set(1 / low.width, 1 / low.height);
      pass(m.up, up[i]);
      low = up[i];
    }
    // 夕阳光束：太阳在画面里（或刚出画面）时才有
    const sd = G.U.uSunDir.value;
    sunNdc.copy(sd).multiplyScalar(500).add(camera.position).project(camera);
    camera.getWorldDirection(fwd);
    const facing = G.smooth(0.15, 0.6, fwd.dot(sd));
    const off = Math.max(Math.abs(sunNdc.x), Math.abs(sunNdc.y));
    const amt = facing * (1 - G.smooth(1.1, 1.9, off)) * (sunNdc.z < 1 ? 1 : 0);
    m.fin.uniforms.uRays.value = amt * (P.hdr ? 0.24 : 0.15) * (1 - 0.55 * G.U.uNight.value) * (G.Moon && G.Moon.on ? 0 : 1);
    if (amt > 0.01) {
      m.rays.uniforms.tMap.value = down[0].texture;
      m.rays.uniforms.uSun.value.set(sunNdc.x * 0.5 + 0.5, sunNdc.y * 0.5 + 0.5);
      pass(m.rays, rtRays);
    }
    m.fin.uniforms.tScene.value = rtScene.texture;
    m.fin.uniforms.tBloom.value = up[0].texture;
    m.fin.uniforms.tRays.value = rtRays.texture;
    pass(m.fin, null);
  };

  // 开机自检：万一某台设备上后期链路画出来是黑的（或全白），就自动关掉，退回直接渲染
  P.selfTest = function (sc, camera) {
    if (!P.ok) return;
    try {
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(4);
      const read = () => {
        let sum = 0;
        for (let i = 0; i < 3; i++)
          for (let j = 0; j < 3; j++) {
            gl.readPixels(Math.floor(w * (0.2 + 0.3 * i)), Math.floor(h * (0.2 + 0.3 * j)), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
            sum += px[0] + px[1] + px[2];
          }
        return sum;
      };
      R.setRenderTarget(null);
      R.render(sc, camera);
      const a = read();
      P.render(sc, camera);
      const b = read();
      const white = 9 * 3 * 250;
      if ((a > 60 && b < a * 0.3) || (b >= white && a < white * 0.8)) P.ok = false;
    } catch (e) {
      P.ok = false;
    }
  };

  G.Post = P;
})();
