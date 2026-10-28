// v881 : parrainage. Le serveur de partie (serveur/partie.mjs) lit l'état du parrainage (supabase/21-parrainage.sql,
// parrain_tick) et applique ici les récompenses : le cadeau du filleul une fois son parrainage validé, et chaque palier du
// parrain (1 à 10) une seule fois. Jamais appelé par le téléphone : il reçoit la partie du serveur.
import { REFERRAL } from '../config.js';

export function parrainApply(g, r) {
  const got = [];
  if (!r || typeof r !== 'object') return got;
  const p = (g.s.parrain ||= { gift: false, paid: [] });
  if (!Array.isArray(p.paid)) p.paid = [];
  if (r.me && typeof r.me === 'object') {
    p.by = typeof r.me.parrain === 'string' ? r.me.parrain : p.by || null;
    p.state = r.me.state;
    if (r.me.state === 'ok' && !p.gift) { g.grant(REFERRAL.gift, 'parrain'); p.gift = true; got.push({ gift: true }); }
  }
  for (const k of Array.isArray(r.ranks) ? r.ranks : []) {
    if (!Number.isInteger(k) || k < 1 || k > REFERRAL.max || p.paid.includes(k)) continue;
    g.grant(REFERRAL.ladder[k - 1], 'parrain'); p.paid.push(k); got.push({ rank: k });
  }
  return got;
}
