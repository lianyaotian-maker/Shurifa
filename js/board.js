/* 草原小屋 · 留言板（在草原小路边）：留言存在 Supabase（云端数据库），所有人都能看到、能写，不能改也不能删。
   国内有些网络连 supabase.co 很慢或者时断时续，所以：
   - 请求不带自定义请求头（钥匙放在网址里），浏览器不用先发一次“预检”，慢网络下少等一个来回；连不上会自动再试
   - 上次读到的留言记在手机里，打开就先显示
   - 网站上还有一份定时保存的备份 board.json（和网页放在一起，网页能打开它就能打开）
   - 寄不出去的留言先存在手机里，网络好了自动寄出，不会丢 */
(function () {
  'use strict';
  const B = {};
  const cfg = () => G.Config || {};
  B.ready = () => !!(cfg().supabaseUrl && cfg().supabaseKey);
  const base = () => cfg().supabaseUrl.replace(/\/$/, '') + '/rest/v1/messages';
  const key = () => encodeURIComponent(cfg().supabaseKey);
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 无痕模式等 */ } }
  };
  const CACHE = 'grass-house-board-cache', OUTBOX = 'grass-house-board-outbox';

  async function req(url, opt, ms) {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    let t;
    const to = new Promise((_, rej) => { t = setTimeout(() => { if (ctl) ctl.abort(); rej(new Error('timeout')); }, ms); });
    try {
      return await Promise.race([fetch(url, Object.assign({ cache: 'no-store' }, opt, ctl ? { signal: ctl.signal } : {})), to]);
    } finally {
      clearTimeout(t);
    }
  }

  /* ---------- 读 ---------- */
  B.list = async function () {
    const url = base() + '?select=id,created_at,name,body&order=created_at.desc&limit=200&apikey=' + key();
    let err;
    for (const ms of [15000, 25000]) {
      try {
        const r = await req(url, {}, ms);
        if (!r.ok) throw new Error('list ' + r.status);
        const rows = await r.json();
        store.set(CACHE, { at: new Date().toISOString(), rows });
        return rows;
      } catch (e) {
        err = e;
      }
    }
    throw err;
  };
  // 手机里记着的上一次
  B.cached = () => store.get(CACHE);
  // 网站上定时保存的备份
  B.snapshot = async function () {
    try {
      const r = await req('board.json?t=' + Date.now(), {}, 12000);
      if (!r.ok) return null;
      const j = await r.json();
      return j && Array.isArray(j.rows) ? j : null;
    } catch (e) {
      return null;
    }
  };

  /* ---------- 写 ---------- */
  // 用表单格式提交，也不需要预检
  B.send = async function (name, body) {
    const f = new URLSearchParams();
    if (name) f.set('name', name);
    f.set('body', body);
    const r = await req(base() + '?apikey=' + key(), { method: 'POST', body: f }, 25000);
    if (!r.ok) throw new Error('send ' + r.status);
    return true;
  };
  // 寄不出去的先放进“待寄”
  B.pending = () => store.get(OUTBOX) || [];
  B.queue = function (name, body) {
    const q = B.pending();
    q.push({ name: name || null, body, t: Date.now() });
    store.set(OUTBOX, q);
  };
  // 把待寄的寄出去。rows 是刚从数据库读到的留言：如果某条其实已经寄到了（只是当时没收到回应），就不再重复寄
  let flushing = false;
  B.flush = async function (rows) {
    if (flushing || !B.ready()) return 0;
    let q = B.pending();
    if (!q.length) return 0;
    flushing = true;
    let sent = 0;
    try {
      for (const m of q.slice()) {
        const already = (rows || []).some((r) => r.body === m.body && (r.name || null) === m.name && Date.parse(r.created_at) > m.t - 120000);
        if (!already) {
          try {
            await B.send(m.name, m.body);
          } catch (e) {
            break; // 还是寄不出去，下次再说
          }
        }
        q = B.pending().filter((x) => !(x.t === m.t && x.body === m.body));
        store.set(OUTBOX, q);
        sent++;
      }
    } finally {
      flushing = false;
    }
    return sent;
  };
  G.Board = B;
})();
