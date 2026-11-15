/* 草原小屋 · 着色器 */
(function () {
  'use strict';
  const S = (G.SH = {});

  S.COMMON = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uAmbTop;
uniform vec3 uAmbBottom;
uniform vec3 uFogColor;
uniform vec3 uSunGlow;
uniform float uFogDensity;
uniform vec3 uRim;
uniform vec3 uShadowTint;
uniform vec3 uSnowColor;
uniform float uSnow;
uniform float uFoliage;
uniform sampler2D uField;
uniform float uFieldHalf;
uniform vec2 uWindDir;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i); float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0)); float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
vec4 fieldAt(vec2 xz){ return texture2D(uField, (xz + uFieldHalf) / (2.0 * uFieldHalf)); }
float fogF(float d){ float x = uFogDensity * d; return 1.0 - exp(-x * x); }
vec3 fogC(vec3 dir){ return uFogColor + uSunGlow * (pow(max(dot(dir, uSunDir), 0.0), 8.0) * 0.55); }
float windWave(vec2 p){
  float a = dot(p, uWindDir); float b = dot(p, vec2(-uWindDir.y, uWindDir.x));
  return sin(a * 0.21 - uTime * 1.2 + sin(b * 0.06) * 2.0) * 0.62 + sin(a * 0.57 - uTime * 2.0 + b * 0.13) * 0.38;
}
float shadowAt(vec4 f){ return max(f.b, f.a * uFoliage); }
`;

  /* ---------- 草 ---------- */
  S.GRASS_VS = S.COMMON + /* glsl */ `
attribute vec2 aOffset;
attribute vec4 aParams;
uniform vec2 uCenter;
uniform float uSize;
uniform vec4 uFadeR;
uniform float uBladeW;
uniform float uBladeH;
uniform float uGrassH;
uniform vec3 uGrassBase;
uniform vec3 uGrassTip;
uniform vec3 uGrassAlt;
varying vec3 vColor;
varying float vFog;
varying vec3 vDir;
void main(){
  vec2 base = uCenter - 0.5 * uSize;
  vec2 wp = base + mod(aOffset - base, uSize);
  vec4 f = fieldAt(wp);
  float dist = length(wp - cameraPosition.xz);
  float fade = (1.0 - smoothstep(uFadeR.z, uFadeR.w, dist)) * smoothstep(uFadeR.x, uFadeR.y, dist);
  float rnd = aParams.w;
  float pn = vnoise(wp * 0.09);
  float h = uBladeH * uGrassH * aParams.x * fade * (1.0 - f.g) * (0.7 + 0.6 * pn) * (1.0 - 0.45 * uSnow);
  h *= smoothstep(uSnow * 0.7 - 0.05, uSnow * 0.7, rnd); // 积雪越厚，露出来的草越少
  float hf = position.y;
  float yaw = aParams.z;
  vec3 side = vec3(cos(yaw), 0.0, sin(yaw));
  float w = windWave(wp);
  float bend = 0.26 + 0.22 * w + 0.06 * sin(uTime * 3.1 + rnd * 40.0);
  vec2 lean = uWindDir * bend + vec2(cos(rnd * 31.0), sin(rnd * 31.0)) * 0.16;
  vec3 pos = vec3(wp.x, f.r, wp.y);
  pos += side * (position.x * uBladeW * aParams.y);
  pos.y += hf * h * (1.0 - 0.22 * dot(lean, lean));
  pos.xz += lean * (hf * hf * h);
  float sh = shadowAt(f);
  float sunAmt = 1.0 - sh * 0.85;
  vec3 col = mix(uGrassBase, uGrassTip, pow(hf, 1.1));
  col = mix(col, uGrassAlt * (0.7 + 0.3 * hf), smoothstep(0.55, 0.85, pn) * 0.55);
  col *= (0.86 + 0.28 * rnd) * mix(0.62, 1.0, hf) * (1.0 + 0.12 * w * hf);
  vec3 amb = mix(uAmbBottom, uAmbTop, 0.35 + 0.65 * hf);
  vec3 lit = col * (amb + uSunColor * sunAmt * (0.4 + 0.6 * hf));
  vec3 V = normalize(pos - cameraPosition);
  float back = pow(max(dot(V, uSunDir), 0.0), 4.0);
  lit += uSunColor * uRim * (back * hf * hf * sunAmt * 0.9);
  lit = mix(lit, lit * uShadowTint, sh * 0.55);
  lit = mix(lit, uSnowColor * (amb + uSunColor * sunAmt * 0.55), uSnow * smoothstep(0.3, 1.0, hf) * 0.8);
  vColor = lit;
  vDir = V;
  vec4 mv = viewMatrix * vec4(pos, 1.0);
  vFog = fogF(-mv.z);
  gl_Position = projectionMatrix * mv;
}
`;
  S.SIMPLE_FS = S.COMMON + /* glsl */ `
varying vec3 vColor;
varying float vFog;
varying vec3 vDir;
void main(){ gl_FragColor = vec4(mix(vColor, fogC(normalize(vDir)), vFog), 1.0); }
`;

  /* ---------- 地面 ---------- */
  S.TERRAIN_VS = /* glsl */ `
varying vec3 vWP;
varying vec3 vN;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz;
  vN = normal;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
  S.TERRAIN_FS = S.COMMON + /* glsl */ `
uniform vec3 uGrassBase;
uniform vec3 uGrassTip;
uniform vec3 uGrassAlt;
uniform vec2 uPath[16];
uniform float uBdayAmt;
uniform float uBdayRadius;
uniform vec2 uBdayOrigin;
varying vec3 vWP;
varying vec3 vN;
float pathDist(vec2 p){
  float d = 1000.0;
  for (int i = 0; i < 15; i++) {
    vec2 a = uPath[i]; vec2 b = uPath[i + 1];
    vec2 pa = p - a; vec2 ba = b - a;
    float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    d = min(d, length(pa - ba * t));
  }
  return d;
}
void main(){
  vec2 xz = vWP.xz;
  vec4 f = fieldAt(xz);
  float sh = shadowAt(f);
  float n1 = vnoise(xz * 0.08);
  float n2 = vnoise(xz * 0.55 + 3.1);
  float n3 = vnoise(xz * 2.3);
  vec3 g = mix(uGrassBase, uGrassTip, 0.36 + 0.22 * n1);
  g = mix(g, uGrassAlt * 0.85, smoothstep(0.55, 0.85, n1) * 0.5);
  g *= 0.84 + 0.18 * n2 + 0.08 * n3;
  g *= 1.0 + 0.07 * windWave(xz);
  float pm = 0.0;
  if (xz.x > -6.0 && xz.x < 7.0 && xz.y > 1.0 && xz.y < 47.0) {
    float pd = pathDist(xz) + (n2 - 0.5) * 0.35;
    pm = 1.0 - smoothstep(0.55, 0.9, pd);
  }
  vec3 dirt = vec3(0.72, 0.62, 0.48) * (0.88 + 0.18 * n3);
  vec3 base = mix(g, dirt, pm);
  // 生日那天：远处的草地也星星点点开满花
  float bm = clamp((uBdayRadius - length(xz - uBdayOrigin)) / 6.0, 0.0, 1.0) * uBdayAmt * (1.0 - pm);
  if (bm > 0.0) {
    float sp = smoothstep(0.4, 0.68, vnoise(xz * 3.1 + 11.0));
    float hue = vnoise(xz * 0.9 + 5.0);
    vec3 fc = hue < 0.33 ? vec3(1.0, 0.66, 0.78) : (hue < 0.6 ? vec3(1.0, 0.94, 0.86) : vec3(1.0, 0.84, 0.42));
    base = mix(base, fc, sp * bm * 0.75);
  }
  float sn = clamp(uSnow * (1.0 - pm * 0.3) * (0.85 + 0.3 * n2), 0.0, 1.0);
  base = mix(base, uSnowColor * (0.92 + 0.08 * n3), sn);
  vec3 N = normalize(vN);
  float wrap = clamp((dot(N, uSunDir) + 0.25) / 1.25, 0.0, 1.0);
  float sunAmt = 1.0 - sh * 0.85;
  vec3 amb = mix(uAmbBottom, uAmbTop, N.y * 0.5 + 0.5);
  vec3 col = base * (amb + uSunColor * wrap * sunAmt);
  vec3 V = normalize(vWP - cameraPosition);
  float back = pow(max(dot(V, uSunDir), 0.0), 4.0);
  col += uSunColor * uRim * (back * 0.32 * (1.0 - pm) * sunAmt * (1.0 - sn * 0.6));
  col = mix(col, col * uShadowTint, sh * 0.5);
  float d = length(vWP - cameraPosition);
  gl_FragColor = vec4(mix(col, fogC(V), fogF(d)), 1.0);
}
`;

  /* ---------- 天空 ---------- */
  S.SKY_VS = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = position;
  vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
  gl_Position = vec4(p.xy, p.w * 0.99999, p.w);
}
`;
  S.SKY_FS = S.COMMON + /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
varying vec3 vDir;
float fbm(vec2 p){
  float s = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return s;
}
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  float sd = max(dot(d, uSunDir), 0.0);
  float t = pow(clamp(h, 0.0, 1.0), 0.42);
  vec3 col = mix(uFogColor, uZenith, t);
  col = mix(col, uFogColor * 0.96, smoothstep(0.0, -0.08, h));
  col += uSunGlow * (pow(sd, 8.0) * 0.55 + pow(sd, 48.0) * 0.45);
  float dens = 0.0;
  if (h > 0.0) {
    vec2 uv = d.xz / (h + 0.12) * 1.1 + vec2(uTime * 0.0045, uTime * 0.0018);
    float n = fbm(uv * 1.3);
    dens = smoothstep(0.5, 0.78, n) * smoothstep(0.02, 0.2, h) * (1.0 - 0.5 * smoothstep(0.6, 0.95, h));
    vec3 cc = mix(uCloudShade, uCloudLit, clamp(0.25 + 0.75 * pow(sd, 2.5) + (n - 0.6) * 1.1, 0.0, 1.0));
    cc += uSunGlow * pow(sd, 10.0) * 0.5;
    col = mix(col, cc, dens * 0.88);
  }
  col += vec3(1.0, 0.95, 0.82) * smoothstep(0.99935, 0.99965, dot(d, uSunDir)) * 0.9 * (1.0 - dens * 0.7);
  gl_FragColor = vec4(col, 1.0);
}
`;

  /* ---------- 远山 ---------- */
  S.MTN_VS = /* glsl */ `
attribute float aH;
varying vec3 vDir;
varying float vH;
void main(){
  vH = aH;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = wp.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
  S.MTN_FS = S.COMMON + /* glsl */ `
uniform vec3 uMountain;
uniform float uHaze;
varying vec3 vDir;
varying float vH;
void main(){
  vec3 d = normalize(vDir);
  float haze = mix(1.0, uHaze, smoothstep(0.0, 0.55, vH));
  vec3 c = uMountain * (0.92 + 0.12 * vH);
  c += uSunGlow * pow(max(dot(d, uSunDir), 0.0), 6.0) * 0.25;
  c = mix(c, uSnowColor * 0.85, uSnow * smoothstep(0.55, 0.9, vH) * 0.5);
  gl_FragColor = vec4(mix(c, fogC(d), haze), 1.0);
}
`;

  /* ---------- 野花 ---------- */
  S.FLOWER_VS = S.COMMON + /* glsl */ `
attribute vec2 aOffset;
attribute vec4 aRnd;
attribute vec3 aColor;
attribute float aKind;
uniform vec2 uCenter;
uniform float uSize;
uniform vec4 uFadeR;
uniform float uScale;
uniform float uFlowerAmt;
uniform float uBdayAmt;
uniform float uBdayRadius;
uniform vec2 uBdayOrigin;
uniform float uGrassH;
uniform vec3 uGrassBase;
uniform vec3 uGrassTip;
varying vec3 vColor;
varying float vFog;
varying vec3 vDir;
void main(){
  vec2 base = uCenter - 0.5 * uSize;
  vec2 wp = base + mod(aOffset - base, uSize);
  vec4 f = fieldAt(wp);
  float dist = length(wp - cameraPosition.xz);
  float fade = (1.0 - smoothstep(uFadeR.z, uFadeR.w, dist)) * smoothstep(uFadeR.x, uFadeR.y, dist);
  float clump = vnoise(wp * 0.11 + 7.3);
  float thr = uFlowerAmt * (0.12 + 1.7 * clump * clump);
  float vis = 1.0 - smoothstep(thr - 0.05, thr, aRnd.x);
  float bv = clamp((uBdayRadius - length(wp - uBdayOrigin)) / 6.0, 0.0, 1.0) * uBdayAmt;
  float pop = bv * (1.0 + 0.3 * sin(bv * 3.14159));
  float s = max(vis, pop) * fade * (1.0 - f.g) * (1.0 - uSnow);
  float stemH = (0.38 + 0.4 * aRnd.y) * (0.6 + 0.45 * uGrassH) * uScale * (1.0 + 0.2 * uBdayAmt);
  float grow = min(s * 1.6, 1.0);
  float yaw = aRnd.w * 6.2832;
  vec3 p;
  if (aKind < 0.5) {
    vec3 side = vec3(cos(yaw), 0.0, sin(yaw));
    p = side * (position.x * 0.014 * uScale) + vec3(0.0, position.y * stemH * grow, 0.0);
  } else {
    float sc = 0.062 * uScale * mix(1.0, 1.9, uBdayAmt) * s;
    vec3 q = position * sc;
    float tl = (aRnd.z - 0.5) * 0.9;
    q = vec3(q.x, q.y * cos(tl) - q.z * sin(tl), q.y * sin(tl) + q.z * cos(tl));
    float cy = cos(yaw); float sy = sin(yaw);
    q = vec3(q.x * cy - q.z * sy, q.y, q.x * sy + q.z * cy);
    p = q + vec3(0.0, stemH * grow, 0.0);
  }
  float w = windWave(wp);
  float k = p.y / max(stemH, 0.001);
  p.xz += uWindDir * ((0.12 + 0.12 * w) * k * stemH);
  vec3 pos = p + vec3(wp.x, f.r, wp.y);
  float sh = shadowAt(f);
  float sunAmt = 1.0 - sh * 0.85;
  vec3 c = aKind < 0.5 ? mix(uGrassBase, uGrassTip, 0.5) * 0.8 : (aKind < 1.5 ? vec3(1.0, 0.8, 0.3) : aColor);
  vec3 amb = mix(uAmbBottom, uAmbTop, 0.75);
  vec3 lit = c * (amb + uSunColor * sunAmt * 0.8);
  vec3 V = normalize(pos - cameraPosition);
  float back = pow(max(dot(V, uSunDir), 0.0), 3.0);
  lit += c * uSunColor * (back * sunAmt * 0.55 * step(0.5, aKind));
  lit = mix(lit, lit * uShadowTint, sh * 0.5);
  vColor = lit;
  vDir = V;
  vec4 mv = viewMatrix * vec4(pos, 1.0);
  vFog = fogF(-mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

  /* ---------- 粒子：花瓣 0 / 落叶 1 / 雪 2 / 萤火虫 3 / 金色光点 4 ---------- */
  S.PART_VS = S.COMMON + /* glsl */ `
attribute vec4 aSeed;
uniform vec3 uBox;
uniform vec3 uVel;
uniform float uSize;
uniform float uAmount;
uniform float uPx;
uniform vec3 uColA;
uniform vec3 uColB;
varying vec3 vColor;
varying float vAlpha;
varying float vRot;
varying float vFlip;
varying float vFog;
void main(){
  float t = uTime;
  float r = aSeed.w;
  vec3 base = cameraPosition - vec3(0.5 * uBox.x, 0.35 * uBox.y, 0.5 * uBox.z);
  vec3 p;
  float vis;
#if MODE >= 3
  vec2 xz = aSeed.xz * uBox.xz + vec2(sin(t * 0.31 + r * 20.0), cos(t * 0.27 + r * 13.0)) * 1.5;
  xz = base.xz + mod(xz - base.xz, uBox.xz);
  float g = fieldAt(xz).r;
  #if MODE == 3
  float y = g + 0.35 + 1.5 * aSeed.y + sin(t * 0.8 + r * 9.0) * 0.25;
  #else
  float y = g + 0.2 + mod(aSeed.y * 9.0 + t * (0.35 + 0.3 * r), 9.0);
  #endif
  p = vec3(xz.x, y, xz.y);
  vis = step(r, uAmount);
#else
  p = aSeed.xyz * uBox + uVel * t * (0.7 + 0.6 * r);
  p.x += sin(t * 0.9 + r * 30.0) * 0.7;
  p.z += cos(t * 0.7 + r * 17.0) * 0.7;
  p = base + mod(p - base, uBox);
  float g = fieldAt(p.xz).r;
  vis = step(r, uAmount) * step(g, p.y);
#endif
  vec4 mv = viewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  vRot = t * (1.0 + 2.0 * r) + r * 10.0;
  vFlip = cos(t * (1.5 + 2.0 * r) + r * 7.0);
  vec3 c = mix(uColA, uColB, fract(r * 7.13));
#if MODE >= 3
  float blink = 0.5 + 0.5 * sin(t * (1.3 + r) + r * 40.0);
  #if MODE == 3
  blink = smoothstep(0.35, 1.0, blink);
  #else
  blink = 0.55 + 0.45 * blink;
  #endif
  vColor = c;
  vAlpha = vis * blink;
#else
  vColor = c * (mix(uAmbBottom, uAmbTop, 0.7) + uSunColor * 0.7);
  vAlpha = vis;
#endif
  vFog = fogF(dist);
  float size = uSize * (0.7 + 0.6 * fract(r * 3.7));
  gl_PointSize = min(size * uPx / max(dist, 0.1), 96.0) * step(0.01, vAlpha);
  gl_Position = projectionMatrix * mv;
}
`;
  S.PART_FS = S.COMMON + /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vRot;
varying float vFlip;
varying float vFog;
void main(){
  vec2 q = gl_PointCoord - 0.5;
#if MODE <= 1
  float cr = cos(vRot); float sr = sin(vRot);
  q = vec2(q.x * cr - q.y * sr, q.x * sr + q.y * cr);
  q.y /= max(abs(vFlip), 0.25);
  #if MODE == 0
  float wv = 0.2 * sqrt(max(0.0, 1.0 - pow((q.y + 0.04) / 0.36, 2.0)));
  float a = 1.0 - smoothstep(wv - 0.03, wv, abs(q.x));
  a *= step(abs(q.y + 0.04), 0.36);
  vec3 col = vColor * (0.88 + 0.3 * (0.5 - q.y));
  #else
  float wv = 0.21 * (1.0 - pow(clamp(abs(q.y) / 0.46, 0.0, 1.0), 1.6));
  float a = (1.0 - smoothstep(wv - 0.03, wv, abs(q.x))) * step(abs(q.y), 0.46);
  vec3 col = vColor * (1.0 - 0.25 * (1.0 - smoothstep(0.0, 0.015, abs(q.x))));
  #endif
  if (a < 0.02) discard;
  gl_FragColor = vec4(mix(col, uFogColor, vFog), a * vAlpha);
#elif MODE == 2
  float a = smoothstep(0.5, 0.1, length(q));
  gl_FragColor = vec4(mix(vColor, uFogColor, vFog), a * vAlpha * 0.9);
#else
  float d = length(q);
  float core = smoothstep(0.12, 0.0, d);
  float halo = exp(-d * d * 18.0) * 0.6;
  vec3 col = vColor * (core * 1.4 + halo);
  gl_FragColor = vec4(col * vAlpha * (1.0 - vFog * 0.7), 1.0);
#endif
}
`;

  /* ---------- 孔明灯 ---------- */
  S.LANTERN_VS = S.COMMON + /* glsl */ `
attribute vec4 aSeed;
uniform float uLT;
uniform float uAmount;
uniform float uPx;
varying float vAlpha;
varying float vFog;
varying float vGlow;
void main(){
  float ang = aSeed.x * 6.2832;
  float rad = 9.0 + aSeed.y * 75.0;
  vec2 xz = vec2(cos(ang), sin(ang)) * rad;
  float speed = 0.6 + 0.6 * aSeed.z;
  float delay = aSeed.w * 10.0;
  float tt = uLT - delay;
  float life = 120.0 / speed;
  float age = mod(max(tt, 0.0), life);
  float y0 = fieldAt(xz).r + 0.5;
  xz += uWindDir * age * 0.35 + vec2(sin(age * 0.23 + aSeed.w * 9.0), cos(age * 0.19 + aSeed.z * 7.0)) * 1.4;
  vec3 p = vec3(xz.x, y0 + age * speed, xz.y);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  float a = uAmount * step(0.0, tt) * smoothstep(0.0, 3.0, age) * (1.0 - smoothstep(life - 25.0, life, age));
  vAlpha = a;
  vGlow = 0.75 + 0.25 * sin(uTime * 3.0 + aSeed.w * 30.0);
  vFog = fogF(dist) * 0.6;
  gl_PointSize = min(3.4 * uPx / max(dist, 0.5), 220.0) * step(0.003, a);
  gl_Position = projectionMatrix * mv;
}
`;
  S.LANTERN_FS = S.COMMON + /* glsl */ `
varying float vAlpha;
varying float vFog;
varying float vGlow;
void main(){
  vec2 q = gl_PointCoord - 0.5;
  float halo = exp(-dot(q, q) * 14.0) * 0.55;
  float yy = q.y;
  float k = clamp((yy + 0.2) / 0.37, 0.0, 1.0);
  float hw = mix(0.135, 0.095, k);
  float top = -0.2 + 0.03 * (1.0 - pow(clamp(abs(q.x) / 0.135, 0.0, 1.0), 2.0));
  float body = (1.0 - smoothstep(hw - 0.015, hw, abs(q.x))) * smoothstep(top - 0.01, top + 0.005, yy) * (1.0 - smoothstep(0.165, 0.175, yy));
  vec3 bodyCol = mix(vec3(1.0, 0.42, 0.16), vec3(1.0, 0.86, 0.52), k * k) * (0.75 + 0.35 * vGlow);
  vec3 haloCol = vec3(1.0, 0.66, 0.34);
  vec3 col = mix(haloCol, bodyCol, body);
  col = mix(col, uFogColor, vFog * 0.5);
  float a = max(body, halo * 0.6 * vGlow);
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a * vAlpha);
}
`;

  /* ---------- 炊烟 / 热气 ---------- */
  S.PUFF_VS = S.COMMON + /* glsl */ `
attribute vec4 aSeed;
uniform vec3 uOrigin;
uniform float uAmount;
uniform float uPx;
uniform float uLife;
uniform float uRise;
uniform float uSpread;
uniform float uSize0;
uniform float uSize1;
uniform vec3 uTint;
varying float vAlpha;
varying float vFog;
varying vec3 vColor;
void main(){
  float age = fract(uTime / uLife + aSeed.w);
  vec3 p = uOrigin + vec3((aSeed.x - 0.5) * uSpread * age, age * uRise, (aSeed.z - 0.5) * uSpread * age);
  p.xz += uWindDir * (age * age * uRise * 0.6);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  vAlpha = uAmount * smoothstep(0.0, 0.12, age) * (1.0 - age);
  vColor = uTint * (mix(uAmbBottom, uAmbTop, 0.8) + uSunColor * 0.5);
  vFog = fogF(dist);
  gl_PointSize = min(mix(uSize0, uSize1, age) * uPx / max(dist, 0.2), 200.0) * step(0.003, vAlpha);
  gl_Position = projectionMatrix * mv;
}
`;
  S.PUFF_FS = S.COMMON + /* glsl */ `
varying float vAlpha;
varying float vFog;
varying vec3 vColor;
void main(){
  float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
  gl_FragColor = vec4(mix(vColor, uFogColor, vFog), a * a * vAlpha);
}
`;

  /* ---------- 室内：暖色吊灯 + 蜡烛光 ---------- */
  S.ROOM_VS = /* glsl */ `
#ifdef PACK
attribute float aVariant;
#endif
varying vec3 vN;
varying vec3 vWP;
varying vec2 vUv;
varying vec3 vCol;
void main(){
  vec4 p = vec4(position, 1.0);
  vec3 n = normal;
#ifdef USE_INSTANCING
  p = instanceMatrix * p;
  n = mat3(instanceMatrix) * n;
#endif
  vec4 wp = modelMatrix * p;
  vWP = wp.xyz;
  vN = normalize(mat3(modelMatrix) * n);
  vUv = uv;
#ifdef PACK
  vUv.y = (uv.y + aVariant) / 3.0;
#endif
  vCol = vec3(1.0);
#ifdef USE_COLOR
  vCol = color;
#endif
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
  S.ROOM_FS = /* glsl */ `
uniform vec3 uColor;
uniform sampler2D map;
uniform float uUseMap;
uniform float uEmit;
uniform vec3 uLampPos;
uniform vec3 uLampColor;
uniform vec3 uRoomAmb;
uniform vec4 uCandle;
varying vec3 vN;
varying vec3 vWP;
varying vec2 vUv;
varying vec3 vCol;
void main(){
  vec3 base = uColor * vCol;
  if (uUseMap > 0.5) base *= texture2D(map, vUv).rgb;
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 L = uLampPos - vWP;
  float d = length(L);
  L /= d;
  float lamp = (max(dot(N, L), 0.0) * 0.75 + 0.25) / (1.0 + 0.09 * d * d);
  vec3 C = uCandle.xyz - vWP;
  float dc = length(C);
  float cand = (max(dot(N, C / dc), 0.0) * 0.7 + 0.3) * uCandle.w / (1.0 + 2.5 * dc * dc);
  float hemi = 0.6 + 0.4 * N.y;
  float ao = 0.72 + 0.28 * smoothstep(0.35, 1.3, vWP.y);
  vec3 light = uRoomAmb * hemi * ao + uLampColor * lamp * 1.7 + vec3(1.0, 0.72, 0.4) * cand;
  gl_FragColor = vec4(base * light + base * uEmit, 1.0);
}
`;

  /* ---------- 材质工厂 ---------- */
  S.mat = function (vs, fs, uniforms, opts) {
    const u = Object.assign({}, G.U, uniforms || {});
    return new THREE.ShaderMaterial(Object.assign({ vertexShader: vs, fragmentShader: fs, uniforms: u }, opts || {}));
  };
  S.room = function (color, map, opts) {
    opts = opts || {};
    const u = Object.assign({}, G.RU, {
      uColor: { value: new THREE.Color(color) },
      map: { value: map || null },
      uUseMap: { value: map ? 1 : 0 },
      uEmit: { value: opts.emit || 0 }
    });
    const m = new THREE.ShaderMaterial({
      vertexShader: S.ROOM_VS,
      fragmentShader: S.ROOM_FS,
      uniforms: u,
      vertexColors: !!opts.vertexColors,
      side: opts.side || THREE.FrontSide,
      defines: opts.pack ? { PACK: 1 } : {}
    });
    return m;
  };
})();
