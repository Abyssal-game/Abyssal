// @ts-nocheck
// v693 : fonction serveur « push » (Supabase Edge Function) : vide la file des notifications (supabase/17-notifications.sql)
// et les envoie aux iPhone par Apple. Publiée par GitHub (.github/workflows/serveur.yml). Appelée par la base elle-même
// (pg_net, pg_cron) : elle ne prend aucune donnée de l'appel, elle envoie seulement ce qui attend dans la file.
// Secrets (Supabase → Edge Functions → Secrets), jamais dans le dépôt : APNS_KEY (contenu du fichier .p8),
// APNS_KEY_ID (identifiant de la clé, 10 caractères), APNS_TEAM_ID (identifiant de l'équipe Apple, 10 caractères).
import { drain, apnsJwt, apnsSender } from '../../../serveur/push.mjs';

const env = (k) => Deno.env.get(k) || '';
const pick = (k) => { try { const o = JSON.parse(env(k) || '{}'); return o.default || Object.values(o)[0] || ''; } catch (e) { return ''; } };
const URL0 = env('SUPABASE_URL');
const SECRET = pick('SUPABASE_SECRET_KEYS') || env('SUPABASE_SERVICE_ROLE_KEY');
const head = { apikey: SECRET, 'Content-Type': 'application/json', ...(SECRET.startsWith('eyJ') ? { Authorization: `Bearer ${SECRET}` } : {}) };
const rpc = async (name, body) => {
  const res = await fetch(`${URL0}/rest/v1/rpc/${name}`, { method: 'POST', headers: head, body: JSON.stringify(body) });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${name} : ${res.status} ${txt.slice(0, 160)}`);
  return txt ? JSON.parse(txt) : null;
};

let jwt = { v: '', at: 0 };
const getJwt = async () => {
  if (!jwt.v || Date.now() - jwt.at > 50 * 60 * 1000) jwt = { v: await apnsJwt({ key: env('APNS_KEY'), keyId: env('APNS_KEY_ID'), teamId: env('APNS_TEAM_ID') }), at: Date.now() };
  return jwt.v;
};
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async () => {
  if (!env('APNS_KEY') || !env('APNS_KEY_ID') || !env('APNS_TEAM_ID')) return json(200, { ok: false, error: 'Clé Apple absente (secrets APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID).' });
  try {
    const out = await drain({
      take: (n) => rpc('push_take', { p_limit: n }),
      done: (ids) => rpc('push_done', { p_ids: ids }),
      drop: (t) => rpc('push_drop', { p_token: t }),
      send: apnsSender({ getJwt }),
    });
    return json(200, { ok: true, ...out });
  } catch (e) { return json(200, { ok: false, error: String(e?.message || e).slice(0, 200) }); }
});
