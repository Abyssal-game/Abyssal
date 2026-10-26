// v539 : accès à la base pour le serveur de partie, par l'API HTTP de Supabase (clé secrète : jamais dans le jeu).
// Les fonctions SQL appelées sont dans supabase/12-serveur-de-partie.sql ; celles du Pari, des parties en ligne et du
// Tirage sont appelées « au nom du joueur » (son jeton), pour que leurs règles s'appliquent comme avant.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function createRestDb({ url, secret, publishable }) {
  const head = (k) => ({ apikey: k, 'Content-Type': 'application/json', ...(k.startsWith('eyJ') ? { Authorization: `Bearer ${k}` } : {}) });
  async function call(name, body, { token = null } = {}) {
    const h = token ? { apikey: publishable, 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : head(secret);
    const res = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers: h, body: JSON.stringify(body) });
    const txt = await res.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
    if (!res.ok) throw new Error(data?.message || data?.msg || `Erreur du serveur (${res.status}).`);
    return data;
  }
  return {
    async user(token) {
      const res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: publishable, Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      const u = await res.json();
      return u?.id || null;
    },
    async lock(uid) {
      for (let i = 0; i < 16; i++) { const r = await call('partie_lock', { p_uid: uid }); if (r) return r; await wait(400); }
      return null;
    },
    unlock: (uid) => call('partie_unlock', { p_uid: uid }),
    save: (uid, r) => call('partie_save', { p_uid: uid, p_data: r.data, p_version: r.version, p_seqs: r.seqs, p_tz: r.tz, p_tz_at: r.tz_at }),
    legacySave: (uid) => call('partie_legacy', { p_uid: uid }),
    giftMemory: (uid) => call('partie_gift_memory', { p_uid: uid }), // v796 : supabase/19-cadeaux.sql
    isCreator: (uid) => call('partie_creator', { p_uid: uid }),
    versusDuel: (id) => call('partie_versus', { p_id: id }),
    shadowDrew: (uid, day) => call('partie_shadow_drew', { p_uid: uid, p_day: day }),
    publish: (uid, profile, card, trials) => call('partie_publish', { p_uid: uid, p_profile: profile, p_card: card, p_trials: trials }),
    rpc: (name, args, token) => call(name, args, { token }),
  };
}
