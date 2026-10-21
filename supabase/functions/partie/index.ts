// @ts-nocheck
// v539 : fonction serveur « partie » (Supabase Edge Function). Publiée par GitHub (.github/workflows/serveur.yml).
// Elle tient la progression de chaque compte : voir serveur/partie.mjs. Écrite en JavaScript (sans types).
import { handle } from '../../../serveur/partie.mjs';
import { createRestDb } from '../../../serveur/db-rest.mjs';

const env = (k) => Deno.env.get(k) || '';
const pick = (k) => { try { const o = JSON.parse(env(k) || '{}'); return o.default || Object.values(o)[0] || ''; } catch (e) { return ''; } };
const db = createRestDb({
  url: env('SUPABASE_URL'),
  secret: pick('SUPABASE_SECRET_KEYS') || env('SUPABASE_SERVICE_ROLE_KEY'),
  publishable: pick('SUPABASE_PUBLISHABLE_KEYS') || env('SUPABASE_ANON_KEY'),
});
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'POST seulement.' });
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  let uid = null;
  try { uid = token ? await db.user(token) : null; } catch (e) { uid = null; }
  if (!uid) return json(401, { error: 'Session expirée : reconnecte-toi.' });
  let body = null;
  try { body = await req.json(); } catch (e) { return json(400, { error: 'Requête illisible.' }); }
  try { const out = await handle({ uid, token, body }, { db }); return json(out.status, out.body); }
  catch (e) { return json(500, { error: String(e?.message || e).slice(0, 200) }); }
});
