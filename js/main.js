/* 草原小屋 · 主程序：渲染、季节、日期滑条、5.21 彩蛋、互动、画质 */
(async function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const U = G.U, SEA = G.Season, SPECIAL = SEA.SPECIAL;
  const status = (t) => { $('status').textContent = t; };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 无痕模式等 */ } }
  };

  /* ---------- 渲染器 ---------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    status('这台设备暂时打不开 3D 画面，换个浏览器试试');
    return;
  }
  $('view').appendChild(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    status('画面暂停了，刷新一下页面就好');
    $('start').hidden = false;
    $('start').classList.remove('gone');
  });
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xffffff, U.uFogDensity.value);
  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.05, 700);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 0.95);
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.copy(U.uSunDir.value).multiplyScalar(100);
  const fill = new THREE.DirectionalLight(0xffffff, 0.32);
  fill.position.set(48, 32, 82);
  scene.add(hemi, sun, fill);

  /* ---------- 画质 ---------- */
  const QUAL = {
    low: { name: '流畅', dpr: 1.1, min: 0.8, max: 1.3, mul: 0.6 },
    mid: { name: '均衡', dpr: 1.5, min: 1.0, max: 1.8, mul: 1 },
    high: { name: '精美', dpr: 2.0, min: 1.3, max: 2.4, mul: 1 }
  };
  const ORDER = ['low', 'mid', 'high'];
  let quality = store.get('grass-house-q');
  if (!QUAL[quality]) quality = 'mid';
  let dpr = Math.min(QUAL[quality].dpr, window.devicePixelRatio || 1);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    U.uPx.value = (h * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const rot = $('rotate');
    const portrait = h > w && matchMedia('(pointer: coarse)').matches;
    rot.hidden = !portrait;
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));
  resize();

  /* ---------- 搭建场景 ---------- */
  status('正在铺草地…');
  await G.nextFrame();
  G.Field.build();
  G.Nature.build(scene);
  status('正在盖小木屋…');
  await G.nextFrame();
  G.House.build(scene);
  G.Trees.build(scene);
  status('正在搬火鸡面…');
  await G.nextFrame();
  G.Interior.build(scene);
  G.FX.build(scene);
  G.Player.init(camera, renderer.domElement, { joyBase: $('joy'), joyKnob: $('knob') });

  function setQuality(q) {
    quality = q;
    const Q = QUAL[q];
    dpr = Math.min(Q.dpr, Math.max(1, window.devicePixelRatio || 1));
    G.Nature.setQuality(q);
    $('quality').textContent = '画质 · ' + Q.name;
    store.set('grass-house-q', q);
    resize();
  }
  setQuality(quality);
  $('quality').addEventListener('click', () => setQuality(ORDER[(ORDER.indexOf(quality) + 1) % 3]));

  /* ---------- 日期 ---------- */
  function initialDay() {
    try {
      const qs = new URLSearchParams(location.search);
      const d = qs.get('day');
      if (d !== null && !isNaN(+d)) return ((Math.round(+d) % 365) + 365) % 365;
      const md = qs.get('date');
      if (md && /^\d{1,2}-\d{1,2}$/.test(md)) {
        const [m, dd] = md.split('-').map(Number);
        return SEA.dayFromDate(new Date(2025, m - 1, dd));
      }
    } catch (e) { /* 忽略 */ }
    return SEA.dayFromDate(new Date());
  }
  let targetDay = initialDay();
  let shownDay = targetDay;
  const slider = $('slider'), thumb = $('thumb'), label = $('dateLabel');
  function setDay(d, fromDrag) {
    d = ((Math.round(d) % 365) + 365) % 365;
    if (fromDrag && Math.abs(SEA.diff(d, SPECIAL)) <= 1) d = SPECIAL; // 轻轻吸住，但不做任何标记
    targetDay = d;
    thumb.style.left = (d / 364) * 100 + '%';
    slider.setAttribute('aria-valuenow', d);
    const parts = SEA.label(d).split(' · ');
    label.innerHTML = '<b>' + parts[0] + '</b><span>' + parts[1] + '</span>';
    slider.setAttribute('aria-valuetext', SEA.label(d));
  }
  setDay(targetDay);
  let dragId = null;
  const fromX = (x) => {
    const r = slider.getBoundingClientRect();
    return G.clamp((x - r.left) / r.width, 0, 1) * 364;
  };
  slider.addEventListener('pointerdown', (e) => {
    dragId = e.pointerId;
    slider.setPointerCapture(e.pointerId);
    slider.classList.add('drag');
    setDay(fromX(e.clientX), true);
    e.preventDefault();
  });
  slider.addEventListener('pointermove', (e) => { if (e.pointerId === dragId) setDay(fromX(e.clientX), true); });
  const endDrag = (e) => {
    if (e.pointerId === dragId) {
      dragId = null;
      slider.classList.remove('drag');
    }
  };
  slider.addEventListener('pointerup', endDrag);
  slider.addEventListener('pointercancel', endDrag);
  slider.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { setDay(targetDay - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { setDay(targetDay + 1); e.preventDefault(); }
  });
  function stepper(btn, k) {
    let t1 = null, t2 = null;
    const stop = () => { clearTimeout(t1); clearInterval(t2); };
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      setDay(targetDay + k);
      t1 = setTimeout(() => { t2 = setInterval(() => setDay(targetDay + k), 70); }, 380);
    });
    btn.addEventListener('pointerup', stop);
    btn.addEventListener('pointerleave', stop);
    btn.addEventListener('pointercancel', stop);
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { setDay(targetDay + k); e.preventDefault(); } });
  }
  stepper($('prev'), -1);
  stepper($('next'), 1);

  /* ---------- 季节 → 画面 ---------- */
  const tmpC = new THREE.Color();
  function applySeason(S) {
    U.uZenith.value.fromArray(S.zen);
    U.uFogColor.value.fromArray(S.hor);
    U.uSunGlow.value.fromArray(S.glow);
    U.uSunColor.value.fromArray(S.sun);
    U.uAmbTop.value.fromArray(S.ambT);
    U.uAmbBottom.value.fromArray(S.ambB);
    U.uCloudLit.value.fromArray(S.cLit);
    U.uCloudShade.value.fromArray(S.cShade);
    U.uMountain.value.fromArray(S.mtn);
    U.uGrassBase.value.fromArray(S.gBase);
    U.uGrassTip.value.fromArray(S.gTip);
    U.uGrassAlt.value.fromArray(S.gAlt);
    U.uGrassH.value = S.gH;
    U.uSnow.value = S.snow;
    U.uFoliage.value = S.fol;
    U.uFlowerAmt.value = S.flw;
    scene.fog.color.copy(U.uFogColor.value);
    hemi.color.copy(U.uAmbTop.value);
    hemi.groundColor.copy(U.uAmbBottom.value);
    sun.color.copy(U.uSunColor.value);
    fill.color.copy(tmpC.copy(U.uFogColor.value).lerp(U.uAmbTop.value, 0.5));
    G.Trees.update(S);
  }

  /* ---------- 5 月 21 日 ---------- */
  let clock = 0;
  const B = { on: false, hold: 0, start: 0, amt: 0, lantern: -1e4 };
  if (targetDay === SPECIAL) {
    // 正好在这一天打开：彩蛋直接出现
    B.on = true;
    B.amt = 1;
    B.start = -200;
    B.lantern = -70;
    U.uBdayOrigin.value.set(G.Player.x, G.Player.z);
    G.Interior.cakeScale = 1;
  }
  function updateBirthday(dt) {
    const special = targetDay === SPECIAL;
    B.hold = special ? B.hold + dt : 0;
    if (!B.on && special && B.hold > 0.25) {
      B.on = true;
      B.start = clock;
      B.lantern = clock;
      U.uBdayOrigin.value.set(G.Player.x, G.Player.z);
    }
    if (B.on && !special) B.on = false;
    B.amt += ((B.on ? 1 : 0) - B.amt) * Math.min(1, dt * (B.on ? 0.9 : 1.4));
    if (B.amt < 0.002) B.amt = 0;
    U.uBdayAmt.value = B.amt;
    if (B.on) U.uBdayRadius.value = (clock - B.start) * 20;
    const dd = Math.abs(SEA.diff(targetDay, SPECIAL));
    const hint = special ? 0 : G.clamp((6.5 - dd) / 5.5, 0, 1);
    thumb.style.setProperty('--glow', Math.max(hint * 0.75, B.amt).toFixed(3));
    return hint;
  }

  /* ---------- 点一点 ---------- */
  const LINES = [
    '辣度：满格。建议先倒一杯牛奶', '保质期：直到你忍不住把它煮了', '这一包说，它想跟你回家',
    '店长提示：本店只卖火鸡面，别问了', '警告：可能导致嘴巴喷火', '嘶——哈——嘶——哈——',
    '酱料建议放一半。你：不，全放。', '这包比上一包更辣（并没有）', '据说吃完就能在草原上飞起来',
    '库存充足，可以一直吃到明年', '今日推荐：火鸡面。明日推荐：火鸡面。', '你摸过的这包，已经变得更辣了',
    '辣到流泪也要吃完，这是规矩', '这一包是镇店之宝，嘘', '温馨提示：吃完记得多喝水',
    '已加入购物车（并没有购物车）', '这包面在这里等你很久了', '小鸡说：我也不知道为什么这么辣'
  ];
  const SEASON_LINE = ['外面在下雪，屋里有火鸡面', '春天的第一口辣，敬草原', '夏天吃辣，越吃越热', '秋天就该吃点辣的'];
  const BOWL_LINES = ['刚煮好的，小心烫', '吸溜——（可惜吃不到）', '这碗是给你留的'];
  let lastLine = '', sweetShown = false;
  function seasonIdx(d) {
    const m = SEA.dateOfDay(d).m;
    return m === 12 || m <= 2 ? 0 : m <= 5 ? 1 : m <= 8 ? 2 : 3;
  }
  function pickLine() {
    if (B.on && !sweetShown) {
      sweetShown = true;
      return '今天的火鸡面……好像有点甜？';
    }
    let s;
    let guard = 0;
    do {
      s = Math.random() < 0.2 ? SEASON_LINE[seasonIdx(targetDay)] : LINES[Math.floor(Math.random() * LINES.length)];
    } while (s === lastLine && guard++ < 8);
    lastLine = s;
    return s;
  }
  function pop(text, x, y) {
    const el = document.createElement('div');
    el.className = 'pop';
    el.textContent = text;
    const w = window.innerWidth;
    el.style.left = G.clamp(x, 120, w - 120) + 'px';
    el.style.top = Math.max(90, y - 14) + 'px';
    $('pops').appendChild(el);
    setTimeout(() => el.classList.add('out'), 2000);
    setTimeout(() => el.remove(), 2600);
  }
  const ray = new THREE.Raycaster();
  ray.far = 6.5;
  const ndc = new THREE.Vector2();
  let bump = null;
  G.Player.onTap = function (x, y) {
    ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(G.Interior.pickTargets(), true);
    if (!hits.length) return;
    const h = hits[0];
    let o = h.object;
    while (o && !o.userData.kind && o !== G.Interior.packs) o = o.parent;
    if (h.object === G.Interior.packs && h.instanceId !== undefined) {
      pop(pickLine(), x, y);
      const m = new THREE.Matrix4();
      G.Interior.packs.getMatrixAt(h.instanceId, m);
      bump = { id: h.instanceId, m, t: 0 };
    } else if (o && o.userData.kind === 'bowl') {
      pop(BOWL_LINES[Math.floor(Math.random() * BOWL_LINES.length)], x, y);
    } else if (o && o.userData.kind === 'cake' && G.Interior.cake.visible) {
      G.Interior.blowOut = 4.5; // 吹灭蜡烛，过一会儿又会亮起来
    }
  };
  const bp = new THREE.Vector3(), bq = new THREE.Quaternion(), bs = new THREE.Vector3(), bm = new THREE.Matrix4();
  function updateBump(dt) {
    if (!bump) return;
    bump.t += dt;
    const k = Math.min(1, bump.t / 0.4);
    bump.m.decompose(bp, bq, bs);
    const s = 1 + 0.35 * Math.sin(k * Math.PI);
    bp.y += 0.06 * Math.sin(k * Math.PI);
    bm.compose(bp, bq, bs.multiplyScalar(s));
    G.Interior.packs.setMatrixAt(bump.id, k < 1 ? bm : bump.m);
    G.Interior.packs.instanceMatrix.needsUpdate = true;
    if (k >= 1) bump = null;
  }

  /* ---------- 开始 ---------- */
  status('正在点灯…');
  await G.nextFrame();
  applySeason(SEA.sample(shownDay));
  G.Player.update(0);
  G.Nature.update(camera);
  try { renderer.compile(scene, camera); } catch (e) { /* 首帧再编译 */ }

  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone === true || matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches;
  $('a2hs').hidden = !(ios && !standalone);
  status('');
  $('go').hidden = false;
  $('go').focus({ preventScroll: true });
  let started = false;
  function begin() {
    if (started) return;
    started = true;
    $('start').classList.add('gone');
    setTimeout(() => { $('start').hidden = true; }, 900);
    G.Player.enabled = true;
    $('hud').classList.add('on');
    $('hint').classList.add('on');
    const hideHint = () => $('hint').classList.remove('on');
    setTimeout(hideHint, 7000);
    G.Player.onFirstMove = () => setTimeout(hideHint, 1500);
  }
  $('go').addEventListener('click', begin);
  $('jump').addEventListener('pointerdown', (e) => { e.preventDefault(); G.Player.jump(); });
  $('help').addEventListener('click', () => {
    $('hint').classList.add('on');
    setTimeout(() => $('hint').classList.remove('on'), 5000);
  });

  /* ---------- 主循环 ---------- */
  let last = performance.now(), ema = 1 / 60, adaptT = 0, holdUp = 0, wasInside = false, outsideT = 99;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;
    if (G.debug.pause) return;
    tick(dt);
  }
  // 测试用：暂停循环后手动推进若干帧
  G.debug = {
    pause: /[?&]test=1/.test(location.search),
    step(n, dt) {
      for (let i = 0; i < n; i++) tick(dt || 1 / 30, i === n - 1);
    }
  };
  function tick(dt, draw) {
    if (draw === undefined) draw = true;
    clock += dt;
    U.uTime.value = clock;

    // 季节平滑过渡到目标日期
    const dd = SEA.diff(shownDay, targetDay);
    shownDay = Math.abs(dd) < 0.01 ? targetDay : shownDay + dd * Math.min(1, dt * 3.2);
    shownDay = ((shownDay % 365) + 365) % 365;
    const S = SEA.sample(shownDay);
    applySeason(S);
    const hint = updateBirthday(dt);
    U.uGrassH.value *= 1 - 0.3 * B.amt; // 那一天草矮一点，让花海露出来

    if (!started) G.Player.yaw += Math.sin(clock * 0.25) * 0.00025; // 开场时镜头轻轻晃动
    G.Player.update(dt);
    G.Nature.update(camera);
    G.House.update(dt, G.Player, U.uSnow.value);
    G.Interior.update(dt, clock, B.amt, B.on || B.amt > 0.5);
    updateBump(dt);
    G.FX.update(S, { mul: QUAL[quality].mul, bday: B.amt, hint: hint, lanternT: clock - B.lantern });

    // 走进屋：面从天花板哗啦啦掉下来
    const inside = G.Player.inHouse(G.Player.x, G.Player.z) && G.Player.z < 2.2;
    if (inside && !wasInside && outsideT > 5) G.Interior.rain();
    if (inside) outsideT = 0;
    else outsideT += dt;
    wasInside = inside;

    if (!draw) return;
    renderer.render(scene, camera);
    if (G.debug.pause) return;

    // 自动调节分辨率，保持流畅
    ema += (dt - ema) * 0.05;
    adaptT += dt;
    holdUp -= dt;
    if (adaptT > 2) {
      adaptT = 0;
      const Q = QUAL[quality];
      const cap = Math.min(Q.max, Math.max(1, window.devicePixelRatio || 1));
      if (ema > 0.0215 && dpr > Q.min + 0.01) {
        dpr = Math.max(Q.min, dpr - 0.15);
        holdUp = 20;
        resize();
      } else if (ema < 0.0175 && holdUp <= 0 && dpr < cap - 0.01) {
        dpr = Math.min(cap, dpr + 0.1);
        holdUp = 6;
        resize();
      }
    }
  }
  requestAnimationFrame(frame);

  // 阻止 iOS 的缩放手势
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  window.__ready = true;
})();
