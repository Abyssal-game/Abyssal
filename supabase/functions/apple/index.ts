// @ts-nocheck
// v925 : fonction serveur « apple » (Supabase Edge Function) : garde le jeton « Sign in with Apple » à la connexion et le
// rend à Apple quand le joueur supprime son compte (serveur/apple.mjs). Publiée par GitHub (.github/workflows/serveur.yml).
// Secrets (Supabase → Edge Functions → Secrets), jamais dans le dépôt : APPLE_SIWA_KEY (contenu du fichier .p8 d'une clé
// avec « Sign in with Apple »), APPLE_SIWA_KEY_ID (10 caractères), APNS_TEAM_ID (déjà posé pour les notifications).
import { handleApple, clientSecret } from '../../../serveur/apple.mjs';

const env = (k) => Deno.env.get(k) || '';
const pick = (k) => { try { const o = JSON.parse(env(k) || '{}'); return o.default || Object.values(o)[0] || ''; } catch (e) { return ''; } };
const URL0 = env('SUPABASE_URL');
const SECRET = pick('SUPABASE_SECRET_KEYS') || env('SUPABASE_SERVICE_ROLE_KEY');
const PUB = pick('SUPABASE_PUBLISHABLE_KEYS') || env('SUPABASE_ANON_KEY');
const svc = { apikey: SECRET, 'Content-Type': 'application/json', ...(SECRET.startsWith('eyJ') ? { Authorization: `Bearer ${SECRET}` } : {}) };
const rest = async (path, opt = {}) => {
  const res = await fetch(`${URL0}/rest/v1/${path}`, { ...opt, headers: { ...svc, ...(opt.headers || {}) } });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${txt.slice(0, 120)}`);
  return txt ? JSON.parse(txt) : null;
};
const db = {
  async get(uid) { const r = await rest(`apple_tokens?user_id=eq.${uid}&select=refresh_token`); return r?.[0]?.refresh_token || null; },
  set: (uid, tok) => rest('apple_tokens', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ user_id: uid, refresh_token: tok, updated_at: new Date().toISOString() }) }),
  del: (uid) => rest(`apple_tokens?user_id=eq.${uid}`, { method: 'DELETE' }),
};
let sec = { v: '', at: 0 };
const getSecret = async () => {
  if (!env('APPLE_SIWA_KEY') || !env('APPLE_SIWA_KEY_ID') || !env('APNS_TEAM_ID')) throw new Error('Clé Sign in with Apple absente (secrets APPLE_SIWA_KEY, APPLE_SIWA_KEY_ID).');
  if (!sec.v || Date.now() - sec.at > 50 * 60 * 1000) sec = { v: await clientSecret({ key: env('APPLE_SIWA_KEY'), keyId: env('APPLE_SIWA_KEY_ID'), teamId: env('APNS_TEAM_ID') }), at: Date.now() };
  return sec.v;
};
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'POST seulement.' });
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  let uid = null;
  try { const r = await fetch(`${URL0}/auth/v1/user`, { headers: { apikey: PUB, Authorization: `Bearer ${token}` } }); uid = r.ok ? (await r.json())?.id : null; } catch (e) { uid = null; }
  if (!uid) return json(401, { error: 'Session expirée : reconnecte-toi.' });
  let body = null;
  try { body = await req.json(); } catch (e) { return json(400, { error: 'Requête illisible.' }); }
  try { const out = await handleApple({ uid, body }, { db, getSecret }); return json(out.status, out.body); }
  catch (e) { return json(500, { error: String(e?.message || e).slice(0, 200) }); }
});
