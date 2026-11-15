/* 草原小屋 · 第一人称：左手摇杆走路、右手滑动环顾、点一点互动、跳跃、碰撞 */
(function () {
  'use strict';
  const P = {
    x: 0, y: 0, z: 0, vy: 0, yaw: 0, pitch: -0.04,
    jx: 0, jy: 0, keys: {}, eye: 1.55, radius: 0.3, moved: 0, bob: 0,
    onTap: null, onFirstMove: null, enabled: false
  };
  const FY = () => G.House.FY;
  const reduceMotion = (() => {
    try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  })();

  P.inHouse = (x, z) => x > -3.45 && x < 3.45 && z > -2.65 && z < 2.65;
  P.groundAt = function (x, z) {
    if (x > -3.6 && x < 3.6 && z > -2.8 && z < 2.8) return FY();
    const pr = G.Field.PORCH;
    if (x > pr.x0 + 0.05 && x < pr.x1 - 0.05 && z > 2.8 && z < 4.05) return 0.33;
    if (x > -0.85 && x < 0.85 && z >= 4.05 && z < 4.42) return 0.17;
    return G.Field.height(x, z);
  };

  P.init = function (camera, el, ui) {
    P.camera = camera;
    camera.rotation.order = 'YXZ';
    const sp = G.Field.SPAWN;
    P.x = sp.x;
    P.z = sp.z;
    P.y = P.groundAt(P.x, P.z) + P.eye;
    P.yaw = Math.atan2(P.x, P.z); // 面向小屋
    const joyBase = ui.joyBase, joyKnob = ui.joyKnob;
    let joyId = null, lookId = null, jc = { x: 0, y: 0 }, last = {}, start = {};
    const JR = 58;
    const restJoy = () => {
      joyBase.classList.remove('active');
      joyBase.style.left = '';
      joyBase.style.top = '';
      joyKnob.style.transform = 'translate(-50%, -50%)';
    };
    function down(e) {
      if (!P.enabled) return;
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
      start[e.pointerId] = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
      last[e.pointerId] = { x: e.clientX, y: e.clientY };
      const touch = e.pointerType !== 'mouse';
      if (touch && joyId === null && e.clientX < window.innerWidth * 0.42) {
        joyId = e.pointerId;
        jc = { x: e.clientX, y: e.clientY };
        joyBase.classList.add('active');
        joyBase.style.left = jc.x + 'px';
        joyBase.style.top = jc.y + 'px';
      } else if (lookId === null) {
        lookId = e.pointerId;
      }
      e.preventDefault();
    }
    function move(e) {
      const s = start[e.pointerId];
      if (!s) return;
      const l = last[e.pointerId];
      const dx = e.clientX - l.x, dy = e.clientY - l.y;
      l.x = e.clientX;
      l.y = e.clientY;
      s.moved = Math.max(s.moved, Math.hypot(e.clientX - s.x, e.clientY - s.y));
      if (e.pointerId === joyId) {
        let vx = e.clientX - jc.x, vy = e.clientY - jc.y;
        const len = Math.hypot(vx, vy);
        if (len > JR) {
          vx = (vx / len) * JR;
          vy = (vy / len) * JR;
        }
        P.jx = vx / JR;
        P.jy = vy / JR;
        joyKnob.style.transform = 'translate(calc(-50% + ' + vx + 'px), calc(-50% + ' + vy + 'px))';
      } else if (e.pointerId === lookId) {
        const k = e.pointerType === 'mouse' ? 0.0036 : 0.0046;
        P.yaw -= dx * k;
        P.pitch = G.clamp(P.pitch - dy * k, -1.25, 1.2);
        if (s.moved > 12) P.noteMove();
      }
      e.preventDefault();
    }
    function up(e) {
      const s = start[e.pointerId];
      if (s && s.moved < 10 && performance.now() - s.t < 350 && P.onTap) P.onTap(e.clientX, e.clientY);
      if (e.pointerId === joyId) {
        joyId = null;
        P.jx = P.jy = 0;
        restJoy();
      }
      if (e.pointerId === lookId) lookId = null;
      delete start[e.pointerId];
      delete last[e.pointerId];
    }
    el.addEventListener('pointerdown', down, { passive: false });
    el.addEventListener('pointermove', move, { passive: false });
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    window.addEventListener('keydown', (e) => {
      P.keys[e.code] = true;
      if (e.code === 'Space') { P.jump(); e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => { P.keys[e.code] = false; });
    window.addEventListener('blur', () => { P.keys = {}; });
  };

  P.noteMove = function () {
    if (P.onFirstMove) {
      const f = P.onFirstMove;
      P.onFirstMove = null;
      f();
    }
  };
  P.jump = function () {
    if (!P.enabled) return;
    const g = P.groundAt(P.x, P.z) + P.eye;
    if (P.y <= g + 0.06) P.vy = 4.3;
  };

  function collide() {
    const r = P.radius, C = G.Colliders;
    for (let it = 0; it < 2; it++) {
      for (const b of C.rects) {
        const cx = G.clamp(P.x, b.x0, b.x1), cz = G.clamp(P.z, b.z0, b.z1);
        let dx = P.x - cx, dz = P.z - cz;
        const d = Math.hypot(dx, dz);
        if (d < r) {
          if (d > 1e-5) {
            P.x = cx + (dx / d) * r;
            P.z = cz + (dz / d) * r;
          } else {
            // 已经在矩形里：推到最近的边
            const l = P.x - b.x0, rr = b.x1 - P.x, t = P.z - b.z0, bb = b.z1 - P.z;
            const m = Math.min(l, rr, t, bb);
            if (m === l) P.x = b.x0 - r;
            else if (m === rr) P.x = b.x1 + r;
            else if (m === t) P.z = b.z0 - r;
            else P.z = b.z1 + r;
          }
        }
      }
      for (const c of C.circles) {
        if (c.off) continue;
        const dx = P.x - c.x, dz = P.z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
        if (d < m && d > 1e-5) {
          P.x = c.x + (dx / d) * m;
          P.z = c.z + (dz / d) * m;
        }
      }
    }
    const rr = Math.hypot(P.x, P.z), lim = 66;
    if (rr > lim) {
      P.x *= lim / rr;
      P.z *= lim / rr;
    }
  }

  P.update = function (dt) {
    let ix = P.jx, iy = P.jy;
    const K = P.keys;
    if (K.KeyW || K.ArrowUp) iy -= 1;
    if (K.KeyS || K.ArrowDown) iy += 1;
    if (K.KeyA || K.ArrowLeft) ix -= 1;
    if (K.KeyD || K.ArrowRight) ix += 1;
    const len = Math.hypot(ix, iy);
    if (len > 1) {
      ix /= len;
      iy /= len;
    }
    const inside = P.inHouse(P.x, P.z);
    const speed = inside ? 2.3 : 3.8;
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
    const mvx = (fx * -iy + rx * ix) * speed, mvz = (fz * -iy + rz * ix) * speed;
    if (P.enabled) {
      P.x += mvx * dt;
      P.z += mvz * dt;
    }
    const sp = Math.hypot(mvx, mvz);
    if (sp > 0.1) {
      P.moved += sp * dt;
      P.bob += sp * dt * 2.2;
      if (P.moved > 0.6) P.noteMove();
    }
    collide();
    const ground = P.groundAt(P.x, P.z) + P.eye;
    if (P.vy !== 0 || P.y > ground + 0.08) {
      P.vy -= 13 * dt;
      P.y += P.vy * dt;
      if (P.y <= ground) {
        P.y = ground;
        P.vy = 0;
      }
    } else {
      P.y += (ground - P.y) * Math.min(1, dt * 12);
    }
    const cam = P.camera;
    const bob = reduceMotion ? 0 : Math.sin(P.bob) * 0.025 * Math.min(1, sp / 2);
    cam.position.set(P.x, P.y + bob, P.z);
    cam.rotation.set(P.pitch, P.yaw, 0);
  };

  G.Player = P;
})();
