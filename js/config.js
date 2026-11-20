/* 草原小屋 · 留言板连接设置
   在 Supabase 后台 Project Settings → API 里找到这两项，填进引号里：
   - supabaseUrl：Project URL，形如 https://xxxx.supabase.co
   - supabaseKey：anon public key（公开密钥，本来就是放在网页里用的；数据安全靠数据库里的权限规则） */
window.G = window.G || {};
G.Config = {
  supabaseUrl: '',
  supabaseKey: ''
};
