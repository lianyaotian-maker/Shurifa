/* 草原小屋 · 留言板（在草原小路边）：留言存在 Supabase（云端数据库），所有人都能看到、能写，不能改也不能删。
   国内有些网络连 supabase.co 很慢或者时断时续，所以：
   - 请求不带自定义请求头（钥匙放在网址里），浏览器不用先发一次“预检”，慢网络下少等一个来回；连不上会自动再试
   - 上次读到的留言记在手机里，打开就先显示
   - 网站上还有一份定时保存的备份 board.json（和网页放在一起，网页能打开它就能打开）
   - 寄不出去的留言先存在手机里，网络好了自动寄出，不会丢
   附图：手机上先把照片压成 JPEG（最长边 1280 像素，几百 KB 以内，顺便去掉拍摄地点等信息），
   和留言存在同一条里；列表只取文字，图片滚到眼前才单独加载。
   语音：录好的 MP3（见 voice.js）也存在同一条里，点了播放才去取 */
(function () {
  'use strict';
  const B = {};
  const cfg = () => G.Config || {};
  B.ready = () => !!(cfg().supabaseUrl && cfg().supabaseKey);
  // 某张表的地址（留言板是 messages，画廊是 gallery）
  B.rest = (table) => cfg().supabaseUrl.replace(/\/$/, '') + '/rest/v1/' + table;
  const base = () => B.rest('messages');
  const key = (B.key = () => encodeURIComponent(cfg().supabaseKey));
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    // 存不下（比如空间满了）时返回 false
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };
  const CACHE = 'grass-house-board-cache', OUTBOX = 'grass-house-board-outbox';
  // 数据库里有没有图片、语音那两栏（还没加的话就不显示附图、录音按钮）
  B.images = null;
  B.store = store;

  B.req = req;
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
    let err, tries = 0;
    while (tries < 2) {
      const ms = tries ? 25000 : 15000;
      try {
        const cols = 'id,created_at,name,body' + (B.images === false ? '' : ',has_image,has_voice');
        const r = await req(base() + '?select=' + cols + '&order=created_at.desc&limit=200&apikey=' + key(), {}, ms);
        if (r.status === 400 && B.images !== false) {
          // 还没有图片、语音那两栏：先按只有文字的方式读
          B.images = false;
          continue;
        }
        if (!r.ok) throw new Error('list ' + r.status);
        const rows = await r.json();
        if (B.images === null) B.images = true;
        store.set(CACHE, { at: new Date().toISOString(), rows });
        return rows;
      } catch (e) {
        err = e;
        tries++;
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
  // 单独取一条记录里的大字段（图片、语音），取过的记在内存里
  const big = new Map();
  B.field = function (table, id, col) {
    const k = table + '/' + id + '/' + col;
    if (!big.has(k)) {
      const p = (async () => {
        for (const ms of [20000, 30000]) {
          try {
            const r = await req(B.rest(table) + '?select=' + col + '&id=eq.' + encodeURIComponent(id) + '&apikey=' + key(), {}, ms);
            if (!r.ok) continue;
            const row = (await r.json())[0];
            return row && row[col] ? row[col] : null;
          } catch (e) { /* 再试一次 */ }
        }
        throw new Error(col);
      })();
      big.set(k, p);
      p.catch(() => big.delete(k));
    }
    return big.get(k);
  };
  B.image = (id) => B.field('messages', id, 'image');
  B.voice = (id) => B.field('messages', id, 'voice');

  /* ---------- 图片压缩 ---------- */
  // 读进照片 → 缩到最长边 1280（还大就 960）→ 压成 JPEG，直到 data URL 不超过约 400 KB
  // sizes 是依次尝试的最长边，limit 是 data URL 的长度上限
  B.compress = function (file, sizes, limit) {
    sizes = sizes || [1280, 960, 720];
    limit = limit || 400000;
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => {
        URL.revokeObjectURL(url);
        try {
          for (const max of sizes) {
            const s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
            const w = Math.max(1, Math.round(im.naturalWidth * s)), h = Math.max(1, Math.round(im.naturalHeight * s));
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const x = c.getContext('2d');
            x.fillStyle = '#fff'; // 透明的图片铺白底
            x.fillRect(0, 0, w, h);
            x.drawImage(im, 0, 0, w, h);
            for (const q of [0.82, 0.72, 0.62, 0.52]) {
              const d = c.toDataURL('image/jpeg', q);
              if (d.length <= limit) return resolve(d);
            }
          }
          reject(new Error('too big'));
        } catch (e) {
          reject(e);
        }
      };
      im.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('decode'));
      };
      im.src = url;
    });
  };

  /* ---------- 写 ---------- */
  // 用表单格式提交，也不需要预检
  B.send = async function (name, body, image, voice) {
    const f = new URLSearchParams();
    if (name) f.set('name', name);
    f.set('body', body || '');
    if (image) f.set('image', image);
    if (voice) f.set('voice', voice);
    const r = await req(base() + '?apikey=' + key(), { method: 'POST', body: f }, image || voice ? 45000 : 25000);
    if (!r.ok) throw new Error('send ' + r.status);
    return true;
  };
  // 寄不出去的先放进“待寄”；手机里存不下时返回 false
  B.pending = () => store.get(OUTBOX) || [];
  B.queue = function (name, body, image, voice) {
    const q = B.pending();
    q.push({ name: name || null, body: body || '', image: image || null, voice: voice || null, t: Date.now() });
    return store.set(OUTBOX, q);
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
        const already = (rows || []).some((r) => r.body === m.body && (r.name || null) === m.name && !!r.has_image === !!m.image && !!r.has_voice === !!m.voice && Date.parse(r.created_at) > m.t - 120000);
        if (!already) {
          try {
            await B.send(m.name, m.body, m.image, m.voice);
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
