/* 草原小屋 · 月亮上的留言板：留言存在 Supabase（云端数据库），所有人都能看到、能写，不能改也不能删 */
(function () {
  'use strict';
  const B = {};
  const cfg = () => G.Config || {};
  B.ready = () => !!(cfg().supabaseUrl && cfg().supabaseKey);
  function headers(extra) {
    const k = cfg().supabaseKey;
    // 新版的 publishable key 只放在 apikey 里；旧版 anon key（JWT）还要同时放进 Authorization
    const h = { apikey: k, 'Content-Type': 'application/json' };
    if (/^eyJ/.test(k)) h.Authorization = 'Bearer ' + k;
    return Object.assign(h, extra || {});
  }
  async function withTimeout(p, ms) {
    let t;
    const to = new Promise((_, rej) => { t = setTimeout(() => rej(new Error('timeout')), ms); });
    try { return await Promise.race([p, to]); } finally { clearTimeout(t); }
  }
  B.list = async function () {
    const url = cfg().supabaseUrl.replace(/\/$/, '') + '/rest/v1/messages?select=id,created_at,name,body&order=created_at.desc&limit=200';
    const r = await withTimeout(fetch(url, { headers: headers() }), 12000);
    if (!r.ok) throw new Error('list ' + r.status);
    return r.json();
  };
  B.send = async function (name, body) {
    const url = cfg().supabaseUrl.replace(/\/$/, '') + '/rest/v1/messages';
    const r = await withTimeout(fetch(url, { method: 'POST', headers: headers({ Prefer: 'return=representation' }), body: JSON.stringify({ name: name || null, body }) }), 12000);
    if (!r.ok) throw new Error('send ' + r.status);
    return (await r.json())[0];
  };
  G.Board = B;
})();
