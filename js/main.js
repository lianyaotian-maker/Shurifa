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
  G.Post.init(renderer);
  G.renderer = renderer;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xffffff, U.uFogDensity.value);
  G.updateView();
  const camera = new THREE.PerspectiveCamera(58, G.view.w / G.view.h, 0.05, 700);
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
    const v = G.updateView(), w = v.w, h = v.h;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h);
    if (G.Post) G.Post.resize();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    U.uPx.value = (h * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
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
  G.Party.build(scene);
  status('正在叫醒鸡柳…');
  await G.nextFrame();
  G.Things.build(scene);
  G.Cat.build(scene);
  G.Life.build(scene);
  G.Night.build(scene, camera);
  G.Moon.build(scene, { hemi, sun, fill }, camera);
  G.Fireflies.build(scene, G.Moon.earthBoard);
  G.Gallery.build(scene);
  G.Player.init(camera, renderer.domElement, { joyBase: $('joy'), joyKnob: $('knob') });

  function setQuality(q) {
    quality = q;
    const Q = QUAL[q];
    dpr = Math.min(Q.dpr, Math.max(1, window.devicePixelRatio || 1));
    G.Nature.setQuality(q);
    G.Post.enabled = q !== 'low'; // “流畅”档关闭后期效果
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
    // 画面转了 90° 时，滑条在屏幕上是竖着的
    const k = G.view.rot ? (x.clientY - r.top) / r.height : (x.clientX - r.left) / r.width;
    return G.clamp(k, 0, 1) * 364;
  };
  slider.addEventListener('pointerdown', (e) => {
    dragId = e.pointerId;
    try { slider.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
    slider.classList.add('drag');
    setDay(fromX(e), true);
    e.preventDefault();
  });
  slider.addEventListener('pointermove', (e) => { if (e.pointerId === dragId) setDay(fromX(e), true); });
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
  // 日夜开关
  const dnBtn = $('dn');
  function syncDn() {
    const night = G.Night.target > 0.5;
    dnBtn.classList.toggle('night', night);
    dnBtn.setAttribute('aria-label', night ? '回到黄昏' : '进入夜晚');
    dnBtn.setAttribute('aria-pressed', String(night));
  }
  dnBtn.addEventListener('click', () => {
    G.Night.toggle();
    syncDn();
    G.Audio.sfx('heart', 0.6);
  });

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
  const B = { on: false, hold: 0, start: 0, amt: 0, lantern: -1e4, fw: -1e4, special: false };
  const camForward = () => new THREE.Vector3(-Math.sin(G.Player.yaw), 0, -Math.cos(G.Player.yaw));
  if (targetDay === SPECIAL) {
    // 正好在这一天打开：彩蛋直接出现（烟花等走进草原再放）
    B.on = true;
    B.amt = 1;
    B.start = -200;
    B.lantern = -70;
    U.uBdayOrigin.value.set(G.Player.x, G.Player.z);
    G.Interior.cakeScale = 1;
    G.Party.trigger(G.Player, camForward());
  }
  // 那一刻的界面反馈：滑块处炸开金色光点，屏幕四周泛起暖光
  const SPARK = ['#ffe3a3', '#ffc7d6', '#fff6e6', '#ffd27a', '#c9f2dc', '#cfe0ff'];
  function celebrate() {
    const r = thumb.getBoundingClientRect();
    const c = G.toLocal(r.left + r.width / 2, r.top + r.height / 2), cx = c.x, cy = c.y;
    for (let i = 0; i < 26; i++) {
      const el = document.createElement('i');
      const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 110;
      el.style.left = cx + 'px';
      el.style.top = cy + 'px';
      el.style.setProperty('--dx', Math.cos(a) * d + 'px');
      el.style.setProperty('--dy', Math.abs(Math.sin(a)) * d * 0.9 + 10 + 'px');
      el.style.background = SPARK[i % SPARK.length];
      el.style.animationDelay = (Math.random() * 0.18).toFixed(2) + 's';
      $('sparks').appendChild(el);
      setTimeout(() => el.remove(), 1800);
    }
    const f = $('flash');
    f.classList.remove('go');
    void f.offsetWidth;
    f.classList.add('go');
  }
  function updateBirthday(dt) {
    const special = targetDay === SPECIAL;
    if (special !== B.special) {
      B.special = special;
      $('datebar').classList.toggle('special', special);
    }
    B.hold = special ? B.hold + dt : 0;
    if (!B.on && special && B.hold > 0.25) {
      B.on = true;
      B.start = clock;
      B.lantern = clock;
      B.fw = clock;
      U.uBdayOrigin.value.set(G.Player.x, G.Player.z);
      G.Party.trigger(G.Player, camForward());
      celebrate();
      G.Audio.sfx('magic');
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
  let lastLine = '';
  function seasonIdx(d) {
    const m = SEA.dateOfDay(d).m;
    return m === 12 || m <= 2 ? 0 : m <= 5 ? 1 : m <= 8 ? 2 : 3;
  }
  function pickLine() {
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
    const w = G.view.w;
    el.style.left = G.clamp(x, 120, w - 120) + 'px';
    el.style.top = Math.max(90, y - 14) + 'px';
    $('pops').appendChild(el);
    setTimeout(() => el.classList.add('out'), 2000);
    setTimeout(() => el.remove(), 2600);
  }
  // 给其他模块用的界面小工具
  // 长椅上的信
  const letterEl = $('letter'), letterP = letterEl.querySelector('p'), letterDefault = letterP.textContent;
  function closeLetter() {
    letterEl.classList.remove('on');
    setTimeout(() => { if (!letterEl.classList.contains('on')) letterEl.hidden = true; }, 500);
    G.Player.enabled = true;
  }
  letterEl.addEventListener('click', (e) => { if (e.target === letterEl || e.target.id === 'letterClose') closeLetter(); });
  // 八音盒选歌面板
  const mbEl = $('musicbox'), mbList = $('mbList');
  let mbSaved = new Set();
  // 看看哪几首已经存在手机里（存好的点开不用等）
  async function mbCheckSaved() {
    mbSaved = await G.Audio.cachedSongs();
    if (!mbEl.hidden) mbRender();
  }
  function mbRender(err) {
    const np = G.Audio.nowPlaying(), items = [];
    if (B.on) items.push({ idx: -1, name: '生日快乐', note: '离得越远越小声' });
    G.Audio.songs.forEach((s, i) => items.push({ idx: i, name: s.name, note: mbSaved.has(i) ? '已存在手机里 · 点开就放' : '全草原都听得到' }));
    mbList.innerHTML = '';
    for (const it of items) {
      const b = document.createElement('button');
      const on = np && np.idx === it.idx;
      b.className = 'mb-song' + (on ? (np.loading ? ' wait' : ' on') : '');
      b.innerHTML = '<span class="eq"><i></i><i></i><i></i></span><span></span><small></small>';
      b.children[1].textContent = it.name;
      b.children[2].textContent = on && np.loading ? (np.progress > 0 && np.progress < 1 ? '下载中 ' + Math.round(np.progress * 100) + '%（下好就放）' : '准备中…') : it.note;
      b.addEventListener('click', () => {
        G.Audio.init();
        if (it.idx < 0) G.Audio.playBirthday();
        else G.Audio.playSong(it.idx);
        G.Audio.sfx('tick', 0.6);
      });
      mbList.appendChild(b);
    }
    const cur = np && items.find((x) => x.idx === np.idx);
    $('mbNow').textContent = err === 'error' ? '网络不太好，这首歌没下载下来，再点一下试试' : cur ? (np.loading ? '正在下载：' : '正在放：') + cur.name : '没有在放歌';
    // 刚下载完一首：更新“已存在手机里”
    if (np && np.type === 'song' && !np.loading && !mbSaved.has(np.idx)) mbCheckSaved();
    $('mbStop').disabled = !np;
  }
  G.Audio.onMusic = (err) => { if (!mbEl.hidden) mbRender(err); };
  function closeMb() {
    mbEl.classList.remove('on');
    setTimeout(() => { if (!mbEl.classList.contains('on')) mbEl.hidden = true; }, 400);
    G.Player.enabled = true;
  }
  mbEl.addEventListener('click', (e) => { if (e.target === mbEl || e.target.id === 'mbClose') closeMb(); });
  $('mbStop').addEventListener('click', () => { G.Audio.stopMusic(); G.Audio.sfx('tick', 0.6); });
  // 屏幕上方淡入淡出的一句提示
  let toastT = null;
  function toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('on'), 5200);
  }
  // 留言板（草原小路边）
  const bdEl = $('board'), bdList = $('bdList'), bdText = $('bdText'), bdName = $('bdName'), bdSend = $('bdSend'), bdState = $('bdState');
  try { bdName.value = store.get('grass-house-name') || ''; } catch (e) { /* 忽略 */ }
  function fmtDate(s) {
    const d = new Date(s);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  // 附图：选一张照片 → 压缩 → 在写字框下面显示小图，可以点 × 去掉
  const bdPick = $('bdPick'), bdFile = $('bdFile'), bdPrev = $('bdPrev'), bdView = $('bdView');
  let bdImg = null;
  // 录音：按钮和录好后的小条
  const bdVoice = G.Voice.widget($('bdRec'), $('bdVc'), (t) => { bdState.textContent = t; });
  function bdShowPick() {
    bdPick.hidden = G.Board.images !== true;
    bdVoice.show(G.Board.images === true);
  }
  function bdSetImg(d) {
    bdImg = d;
    bdPrev.innerHTML = '';
    bdPrev.hidden = !d;
    if (!d) return;
    const im = document.createElement('img');
    im.src = d;
    im.alt = '要附上的图片';
    const x = document.createElement('button');
    x.type = 'button';
    x.textContent = '×';
    x.setAttribute('aria-label', '不附这张图了');
    x.addEventListener('click', () => bdSetImg(null));
    bdPrev.append(im, x);
  }
  bdPick.addEventListener('click', () => bdFile.click());
  bdFile.addEventListener('change', async () => {
    const f = bdFile.files && bdFile.files[0];
    bdFile.value = '';
    if (!f) return;
    bdState.textContent = '正在处理图片…';
    try {
      bdSetImg(await G.Board.compress(f));
      bdState.textContent = '';
    } catch (e) {
      bdState.textContent = '这张图片打不开，换一张试试';
    }
  });
  // 看大图
  function bdOpenView(src) {
    bdView.innerHTML = '';
    const im = document.createElement('img');
    im.src = src;
    im.alt = '留言里的图片';
    bdView.appendChild(im);
    bdView.hidden = false;
  }
  bdView.addEventListener('click', () => { bdView.hidden = true; });
  // 图片滚到眼前才去取
  const bdIO = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { bdIO.unobserve(e.target); bdFetchImg(e.target); }
  }, { root: bdList, rootMargin: '200px 0px' }) : null;
  function bdFetchImg(box) {
    box.textContent = '图片加载中…';
    box.classList.remove('err');
    G.Board.image(box.dataset.id).then((d) => {
      box.textContent = '';
      if (!d) { box.textContent = '图片不见了'; return; }
      const im = document.createElement('img');
      im.src = d;
      im.alt = '留言里的图片';
      box.appendChild(im);
      box.classList.add('ok');
    }).catch(() => {
      box.textContent = '图片没加载出来，点一下再试试';
      box.classList.add('err');
    });
  }
  // 语音留言：一个小气泡，点了才去取录音，再点一下停
  function bdVoiceBtn(r) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bd-voice';
    const idle = '▶ 听语音';
    b.textContent = idle;
    const key = r.pending ? 'pend-' + r.created_at : 'msg-' + r.id;
    b.addEventListener('click', async () => {
      if (G.Voice.playing() === key) return G.Voice.stopPlay();
      b.textContent = '加载中…';
      try {
        const url = r.pending ? r.voice : await G.Board.voice(r.id);
        if (!url) { b.textContent = '语音不见了'; return; }
        const on = G.Voice.play(url, key, () => { b.textContent = idle; b.classList.remove('on'); });
        b.textContent = on ? '■ 正在播放，点一下停' : idle;
        b.classList.toggle('on', on);
      } catch (e) {
        b.textContent = '没加载出来，点一下再试';
      }
    });
    return b;
  }
  function bdImgBox(r) {
    const box = document.createElement('div');
    box.className = 'bd-img';
    if (r.pending) {
      const im = document.createElement('img');
      im.src = r.image;
      im.alt = '等待寄出的图片';
      box.appendChild(im);
      box.classList.add('ok');
    } else {
      box.dataset.id = r.id;
      box.textContent = '图片';
      if (bdIO) bdIO.observe(box);
      else bdFetchImg(box);
    }
    box.addEventListener('click', () => {
      const im = box.querySelector('img');
      if (im) bdOpenView(im.src);
      else if (box.classList.contains('err')) bdFetchImg(box);
    });
    return box;
  }
  // 待寄的留言也显示在最上面，标上“等待寄出”
  function bdRender(rows) {
    const pend = G.Board.pending().slice().reverse().map((m) => ({ name: m.name, body: m.body, image: m.image, has_image: !!m.image, voice: m.voice, has_voice: !!m.voice, created_at: new Date(m.t).toISOString(), pending: true }));
    rows = pend.concat(rows || []);
    bdList.innerHTML = '';
    if (!rows.length) {
      const p = document.createElement('p');
      p.className = 'bd-empty';
      p.textContent = '还没有人留言，写下第一句吧。';
      bdList.appendChild(p);
      return;
    }
    for (const r of rows) {
      const it = document.createElement('div');
      it.className = 'bd-note' + (r.pending ? ' pending' : '');
      const h = document.createElement('div');
      h.className = 'bd-meta';
      h.textContent = (r.name || '无名的旅人') + ' · ' + fmtDate(r.created_at) + (r.pending ? ' · 等待寄出' : '');
      it.appendChild(h);
      if (r.body) {
        const b = document.createElement('p');
        b.textContent = r.body;
        it.appendChild(b);
      }
      if (r.has_voice) it.appendChild(bdVoiceBtn(r));
      if (r.has_image) it.appendChild(bdImgBox(r));
      bdList.appendChild(it);
    }
  }
  // 读留言：先显示手机里记着的；再连数据库；连不上就看网站上的备份，过一会儿自动再试
  let bdRetry = 0, bdRows = null;
  async function bdLoad(quiet) {
    clearTimeout(bdRetry);
    if (!G.Board.ready()) {
      bdState.textContent = '留言板还在布置中，暂时不能留言';
      bdSend.disabled = true;
      bdRender([]);
      bdList.firstChild.textContent = '留言板还没有连接好。';
      return;
    }
    if (!bdRows) {
      const c = G.Board.cached();
      if (c) bdRender((bdRows = c.rows));
    }
    if (!quiet) bdState.textContent = '正在取信…（网络慢的话要等一会儿）';
    try {
      const rows = await G.Board.list();
      bdShowPick();
      bdRender((bdRows = rows));
      bdState.textContent = '';
      if (G.Board.pending().length && (await G.Board.flush(rows))) {
        bdState.textContent = '之前没寄出的留言已经挂上去了';
        bdRender((bdRows = await G.Board.list().catch(() => bdRows)));
      }
    } catch (e) {
      if (!bdRows) {
        const snap = await G.Board.snapshot();
        if (snap) bdRender((bdRows = snap.rows));
      }
      bdState.textContent = bdRows ? '网络不太好，先给你看之前的留言，正在自动重连…' : '暂时连不上留言板，正在自动重连…';
      if (!bdEl.hidden) bdRetry = setTimeout(() => { if (!bdEl.hidden) bdLoad(true); }, 20000);
    }
  }
  let lastSend = 0;
  bdSend.addEventListener('click', async () => {
    if (G.Voice.recording()) { bdState.textContent = '先点录音按钮停下来'; return; }
    const body = bdText.value.trim().slice(0, 300), name = bdName.value.trim().slice(0, 20), image = bdImg, voice = bdVoice.data && bdVoice.data.url;
    if (!body && !image && !voice) { bdState.textContent = '先写点什么吧'; return; }
    if (Date.now() - lastSend < 15000) { bdState.textContent = '慢一点，过几秒再写下一条'; return; }
    bdSend.disabled = true;
    bdState.textContent = image || voice ? '正在寄出（带着' + (image ? '图片' : '语音') + '，要稍等一会儿）…' : '正在寄出…';
    store.set('grass-house-name', name);
    lastSend = Date.now();
    try {
      await G.Board.send(name, body, image, voice);
      bdText.value = '';
      bdSetImg(null);
      bdVoice.set(null);
      bdState.textContent = '已经挂在留言板上了';
      G.Audio.sfx('paper');
      await bdLoad(true);
      bdState.textContent = '已经挂在留言板上了';
    } catch (e) {
      // 寄不出去：先存在手机里，网络好了自动寄出（图片太大存不下时，写的字和图片都留在框里）
      if (G.Board.queue(name, body, image, voice)) {
        bdText.value = '';
        bdSetImg(null);
        bdVoice.set(null);
        bdRender(bdRows || []);
        bdState.textContent = '网络不太好，先帮你存着了，连上以后会自动挂上去';
      } else bdState.textContent = '网络不太好，没寄出去，写的内容还在，过一会儿再点“挂上去”';
      if (!bdEl.hidden) bdRetry = setTimeout(() => { if (!bdEl.hidden) bdLoad(true); }, 20000);
    }
    bdSend.disabled = false;
  });
  // 打开网页时、网络恢复时，悄悄把待寄的留言寄出去
  async function bdFlushQuiet() {
    if (!G.Board.ready() || !G.Board.pending().length) return;
    try {
      const rows = await G.Board.list();
      await G.Board.flush(rows);
    } catch (e) { /* 下次再试 */ }
  }
  setTimeout(bdFlushQuiet, 8000);
  window.addEventListener('online', bdFlushQuiet);
  function closeBd() {
    clearTimeout(bdRetry);
    bdView.hidden = true;
    bdVoice.cancel();
    G.Voice.stopPlay();
    bdEl.classList.remove('on');
    setTimeout(() => { if (!bdEl.classList.contains('on')) bdEl.hidden = true; }, 400);
    G.Player.enabled = true;
  }
  bdEl.addEventListener('click', (e) => { if (e.target === bdEl || e.target.id === 'bdClose') closeBd(); });
  G.UI = {
    toast,
    board() {
      // 画面比较窄（竖着、小屏）时上下排，宽的时候左右分栏
      bdEl.classList.toggle('narrow', G.view.w < 640);
      bdShowPick();
      bdEl.hidden = false;
      G.Player.enabled = false;
      G.Player.jx = G.Player.jy = 0;
      bdSend.disabled = false;
      requestAnimationFrame(() => bdEl.classList.add('on'));
      G.Audio.sfx('paper', 0.6);
      bdLoad();
    },
    async musicbox() {
      G.Audio.init();
      if (!G.Audio.songs.length) await G.Audio.loadSongList();
      // 5.21 那天：没在放歌时，默认放生日歌
      if (B.on && !G.Audio.nowPlaying()) G.Audio.playBirthday();
      mbEl.hidden = false;
      G.Player.enabled = false;
      G.Player.jx = G.Player.jy = 0;
      mbRender();
      mbCheckSaved();
      requestAnimationFrame(() => mbEl.classList.add('on'));
    },
    // 长椅上的信用默认的那句；别处的信可以传进自己的内容
    letter(text) {
      letterP.textContent = text || letterDefault;
      letterEl.hidden = false;
      G.Player.enabled = false;
      G.Player.jx = G.Player.jy = 0;
      requestAnimationFrame(() => letterEl.classList.add('on'));
      $('letterClose').focus({ preventScroll: true });
    },
    pop,
    spicy() {
      const el = $('spicy');
      el.classList.remove('go');
      void el.offsetWidth;
      el.classList.add('go');
    }
  };
  // 脚步声：根据脚下是木头、小路、雪地、落叶还是草地来选
  let lastS = null;
  G.Player.onStep = (land) => {
    const P = G.Player, pr = G.Field.PORCH;
    let s;
    if (G.Moon.on) {
      s = G.Moon.surfaceAt(P.x, P.z);
      G.Audio.step(s, land ? 0.9 : s === 'stone' ? 0.7 : 0.5);
      return;
    }
    if ((Math.abs(P.x) < 3.6 && Math.abs(P.z) < 2.8) || (P.x > pr.x0 && P.x < pr.x1 && P.z > 2.8 && P.z < 4.45)) s = 'wood';
    else if (U.uSnow.value > 0.45) s = 'snow';
    else if (G.Field.pathDist(P.x, P.z) < 0.85) s = 'gravel';
    else if (lastS && lastS.leaves > 0.45) s = 'leaves';
    else if (U.uGrassH.value > 1.12) s = 'tall';
    else s = 'grass';
    G.Audio.step(s, land ? 1.25 : s === 'wood' ? 0.7 : 0.8);
  };
  G.Player.onSeat = (seat) => {
    const el = $('seat');
    el.textContent = seat ? seat.label || '拨动摇杆起身' : '';
    el.classList.toggle('on', !!seat);
  };
  const ray = new THREE.Raycaster();
  ray.far = 14;
  const ndc = new THREE.Vector2();
  let bump = null;
  // 火鸡面、蛋糕
  G.Tap.add(G.Interior.packs, 6.5, (h, x, y) => {
    if (h.instanceId === undefined) return;
    pop(pickLine(), x, y);
    G.Audio.sfx('crinkle');
    const m = new THREE.Matrix4();
    G.Interior.packs.getMatrixAt(h.instanceId, m);
    bump = { id: h.instanceId, m, t: 0 };
  });
  G.Tap.add(G.Interior.cake, 5, () => {
    G.Interior.blowOut = 4.5; // 吹灭蜡烛，过一会儿又会亮起来
    G.Audio.sfx('air', 0.8);
  }, { enabled: () => G.Interior.cake.visible });
  // 墙和门会挡住点击（玻璃不挡）
  for (const m of G.House.shell.children) if (m.name !== 'glass') G.Tap.add(m, 99, null, { block: true });
  G.Tap.add(G.House.door, 99, null, { block: true });
  G.Player.onTap = function (x, y) {
    G.Audio.resume();
    ndc.set((x / G.view.w) * 2 - 1, -(y / G.view.h) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(G.Tap.list, true);
    let pickE = null, pickH = null;
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.tap) o = o.parent;
      if (!o) continue;
      const e = o.userData.tap;
      if (e.enabled && !e.enabled()) continue;
      if (!pickE) {
        if (e.block || h.distance > e.dist) return;
        pickE = e;
        pickH = h;
        if (e.prio) break;
      } else if (e.prio && !e.block && h.distance < pickH.distance + 1.2 && h.distance <= e.dist) {
        // 小东西（比如长椅上的信）优先于包着它的大物件
        pickE = e;
        pickH = h;
        break;
      } else if (h.distance > pickH.distance + 1.2) break;
    }
    if (!pickE) return;
    pickE.quiet = clock + 22;
    pickE.fn(pickH, x, y);
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
  G.Post.selfTest(scene, camera);

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
    G.Audio.init(); // 声音必须在点击之后才能启动
    $('hud').classList.add('on');
    $('hint').classList.add('on');
    const hideHint = () => $('hint').classList.remove('on');
    setTimeout(hideHint, 7000);
    G.Player.onFirstMove = () => setTimeout(hideHint, 1500);
    if (B.on) {
      B.fw = clock;
      setTimeout(celebrate, 900);
    }
  }
  $('go').addEventListener('click', begin);
  $('jump').addEventListener('pointerdown', (e) => { e.preventDefault(); G.Player.jump(); });
  // 声音开关
  const soundBtn = $('sound');
  function setSound(on) {
    G.Audio.setOn(on);
    soundBtn.textContent = on ? '有声' : '静音';
    soundBtn.classList.toggle('off', !on);
    soundBtn.setAttribute('aria-pressed', String(on));
    store.set('grass-house-sound', on ? '1' : '0');
  }
  setSound(store.get('grass-house-sound') !== '0');
  soundBtn.addEventListener('click', () => {
    G.Audio.init();
    setSound(!G.Audio.on);
    if (G.Audio.on) setTimeout(() => G.Audio.sfx('heart', 1.5), 80);
  });
  $('help').addEventListener('click', () => {
    $('hint').classList.add('on');
    setTimeout(() => $('hint').classList.remove('on'), 5000);
  });

  /* ---------- 主循环 ---------- */
  let ambT = 0;
  let last = performance.now(), ema = 1 / 60, adaptT = 0, holdUp = 0, wasInside = false, outsideT = 99;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    // 加载刚结束时，第一帧的时间戳可能比“上一帧”还早，时间差不能是负数
    if (!(dt > 0)) dt = 0;
    if (dt > 0.1) dt = 0.1;
    if (G.debug.pause) return;
    tick(dt);
  }
  // 测试用：暂停循环后手动推进若干帧
  G.debug = {
    pause: /[?&]test=1/.test(location.search),
    step(n, dt) {
      for (let i = 0; i < n; i++) tick(dt || 1 / 30, i === n - 1);
    },
    // 只推进逻辑、不画画面
    sim(n, dt, fn) {
      for (let i = 0; i < n; i++) {
        if (fn) fn(i);
        tick(dt || 1 / 30, false);
      }
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
    const S = G.Night.blend(SEA.sample(shownDay));
    lastS = S;
    applySeason(S);
    const hint = updateBirthday(dt);
    U.uGrassH.value *= 1 - 0.3 * B.amt; // 那一天草矮一点，让花海露出来

    if (!started) G.Player.yaw += Math.sin(clock * 0.25) * 0.00025; // 开场时镜头轻轻晃动
    G.Player.update(dt);
    G.Night.update(dt, clock, camera, G.Player);
    G.Moon.update(dt, clock, G.Player);
    G.Fireflies.update(dt, clock, G.Player);
    G.Gallery.update(dt, clock, G.Player);
    G.Nature.update(camera);
    G.House.update(dt, G.Player, U.uSnow.value, G.Cat);
    G.Interior.update(dt, clock, B.amt, B.on || B.amt > 0.5);
    updateBump(dt);
    G.FX.update(S, { mul: QUAL[quality].mul, bday: B.amt, hint: hint, lanternT: clock - B.lantern });
    G.Party.update(dt, clock, { amt: B.amt, pT: clock - B.start, fwT: clock - B.fw });
    const ctx = { snow: U.uSnow.value, gH: G.Moon.on ? 0 : S.gH, bday: B.amt, pT: clock - B.start };
    G.Things.update(dt, clock, ctx);
    G.Cat.update(dt, clock, ctx);
    G.Life.update(S, B.amt);
    // 环境声每 0.25 秒按季节调一次
    ambT -= dt;
    if (ambT <= 0) {
      ambT = 0.25;
      const snow = U.uSnow.value;
      if (G.Moon.on) G.Audio.ambient(G.Moon.ambient(G.Player));
      else G.Audio.ambient({
        wind: G.clamp(0.45 + 0.45 * snow + 0.25 * S.leaves, 0, 1) * (1 - 0.45 * G.Night.k),
        meadow: (1 - 0.7 * snow) * (1 - 0.3 * G.Night.k),
        birds: G.clamp((S.flw * 1.4 + S.petals * 0.4) * (1 - snow), 0, 1) * (1 - G.Night.k),
        crickets: G.clamp(Math.max(S.ffly, 0.85 * G.Night.k) * (1 - snow), 0, 1),
        moon: G.Moon.callAmt(G.Player),
        inside: G.Player.inHouse(G.Player.x, G.Player.z)
      });
    }
    // 鸡柳和你脚下的草会被压倒一小圈
    const cs = G.Cat.state;
    U.uPress.value[0].set(G.Cat.x, G.Cat.z, 0.62, cs === 'walk' ? 0.55 : 0.92);
    U.uPress.value[1].set(G.Player.x, G.Player.z, 0.55, G.Player.seat ? 0 : 0.65);

    // 走进屋：面从天花板哗啦啦掉下来
    const inside = G.Player.inHouse(G.Player.x, G.Player.z) && G.Player.z < 2.2;
    if (inside && !wasInside && outsideT > 5) {
      G.Interior.rain();
      G.Audio.sfx('rain');
      G.Cat.startle();
    }
    if (inside) outsideT = 0;
    else outsideT += dt;
    wasInside = inside;

    if (!draw) return;
    G.Post.render(scene, camera);
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
