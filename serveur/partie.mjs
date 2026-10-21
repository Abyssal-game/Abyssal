// v539 : le serveur de partie (étape 1 de l'anti-triche ; v540, étape 2 : combats et mini-jeux rejoués coup par coup). Il tient la progression de chaque compte : il rejoue chaque
// opération envoyée par le téléphone avec le même moteur (js/core/game.js), tire lui-même au hasard (boosters), vérifie les
// récompenses en ligne, et c'est son résultat qui est gardé. Indépendant de l'hébergement : la fonction Supabase
// (supabase/functions/partie/index.ts) lui fournit la base (`db`) ; les tests lui donnent une base en mémoire.
import { Game } from '../js/core/game.js';
import { migrate, defaultSave } from '../js/core/save.js';
import { SAVE_KEY } from '../js/config.js';
import { lineupStake } from '../js/core/versus.js';
import { friendCard } from '../js/core/friends.js';
import { OPS, FREE, FREE_DEV, setPath, clone, digest } from '../js/core/ops.js';
import { catalogue } from './catalogue.mjs';

export const PARTIE_VERSION = 1;
const MAX_OPS = 2000, TZ_LOCK_DAYS = 7; // un combat compte souvent plus de cent coups

class Mem {
  constructor(txt) { this.m = new Map(); if (txt) this.m.set(SAVE_KEY, txt); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const cryptoRng = () => { const a = new Uint32Array(1); globalThis.crypto.getRandomValues(a); return a[0] / 4294967296; };
const okTz = (z) => Number.isInteger(z) && z >= -840 && z <= 840;

// Un jeu autour d'une sauvegarde : l'heure est celle du joueur (son fuseau, gardé au moins 7 jours)
export function gameFor(data, { tz = 0, rng = cryptoRng, now = () => Date.now() } = {}) {
  const g = new Game(catalogue(), new Mem(data ? JSON.stringify(data) : null), { rng, clock: () => new Date(now() + tz * 60000) });
  return g;
}

// Opérations qui demandent le réseau : le serveur fait lui-même l'appel en ligne et applique ce qu'il reçoit
const NET = {
  async versusCreate(c, g, lineup, to = null) {
    const stake = lineupStake(lineup);
    if (!(stake > 0)) throw new Error('Mise invalide.');
    if (g.s.shards < stake) throw new Error(`Il te manque ${stake - g.s.shards} éclats pour cette mise.`);
    const id = await c.db.rpc('versus_create_mix', { p_lineup: lineup, p_to: to }, c.token);
    g.versusPay(stake);
    return { id, stake };
  },
  async versusAccept(c, g, id) {
    const d = await c.db.versusDuel(id);
    if (!d) throw new Error('Défi introuvable.');
    if (g.s.shards < d.stake) throw new Error(`Il te manque ${d.stake - g.s.shards} éclats.`);
    const r = await c.db.rpc('versus_accept', { p_id: id }, c.token);
    g.versusPay(d.stake);
    return { ok: true, r };
  },
  async versusClaim(c, g, id) {
    const res = await c.db.rpc('versus_claim', { p_id: id }, c.token);
    const out = g.versusApply(id, res);
    return { res, out };
  },
  async mpClaim(c, g, game, id, friendsOnly = false) {
    const r = await c.db.rpc('mp_claim', { p_id: id }, c.token);
    const out = friendsOnly || game === 'cryptes' ? { shards: 0 } : g.mpReward(game, id, r);
    return { r, out };
  },
  async shadowPay(c, g, day) {
    if (!(await c.db.shadowDrew(c.uid, day))) throw new Error('Aucun tirage ce jour-là.');
    return g.shadowPay(day);
  },
  async shadowClaim(c, g, week) {
    const rank = await c.db.rpc('shadow_claim', { p_week: week }, c.token);
    const sh = g.shadowState(); sh.asked = week;
    const chest = rank ? g.shadowPrize(week, rank) : null;
    return { rank, chest };
  },
};

// Petites opérations du Mode Créateur qui n'existaient pas comme méthodes du jeu
const DEV = {
  devObs(g, n) { g.s.obs = n == null ? 0 : g.obs() + n; },
  devCodexXp(g, n) { g.codexXp(+n || 0, 'dev'); },
  devCodexPrem(g) { const c = g.codex(); c.premium = !c.premium; },
  devCodexReset(g) { g.s.codex = null; g.codex(); },
  devSnapshot(g, save) { g.replaceSave(migrate(save)); },
};

// Une requête : { ops: [{ q, m, a, s }], dev, free, tz, digest, want }
export async function handle({ uid, token, body }, { db, now = () => Date.now(), rng = cryptoRng }) {
  if (!uid) return { status: 401, body: { error: 'Connecte-toi d’abord.' } };
  const b = body && typeof body === 'object' ? body : {};
  const ops = Array.isArray(b.ops) ? b.ops.slice(0, MAX_OPS) : [];
  const dev = typeof b.dev === 'string' && /^[\w-]{4,40}$/.test(b.dev) ? b.dev : 'x';
  let row;
  try { row = await db.lock(uid); } catch (e) { return { status: 503, body: { error: String(e?.message || e).slice(0, 200) } }; } // ex. : SQL 12 pas encore collé
  if (!row) return { status: 423, body: { error: 'Ta partie est occupée sur un autre appareil. Réessaie dans un instant.' } };
  const fx = { trials: [] };
  try {
    let data = row.data;
    if (!data) { const old = await db.legacySave(uid); data = old ? migrate(old) : defaultSave(now()); data.serverSince = now(); }
    let tz = okTz(row.tz) ? row.tz : 0, tzAt = row.tz_at || 0;
    if (okTz(b.tz) && b.tz !== tz && (!row.tz_at || now() - tzAt > TZ_LOCK_DAYS * 864e5 || row.tz == null)) { tz = b.tz; tzAt = now(); }
    const creator = await db.isCreator(uid);
    const g = gameFor(data, { tz, rng, now });
    if (!Number.isInteger(g.s.seedBase)) g.s.seedBase = Math.floor(rng() * 2 ** 31); // v540 : graine des combats et mini-jeux (le téléphone la reçoit)
    const seqs = { ...(row.seqs || {}) };
    let last = Number(seqs['d:' + dev]) || 0;
    const rets = {}, errs = {}, prog = {};
    let curQ = 0;
    g.on('progress', (ev) => { if (curQ) (prog[curQ] ||= []).push(...ev); }); // annonces (succès, niveaux…) rendues au téléphone
    const c = { uid, token, db, g };
    for (const op of ops) {
      const q = Number(op?.q);
      if (!Number.isInteger(q) || q <= last) continue; // déjà rejouée (réponse perdue puis renvoyée)
      last = q; curQ = q;
      const def = typeof op?.m === 'string' && Object.hasOwn(OPS, op.m) ? OPS[op.m] : null;
      try {
        if (!def || def.kind === 'local') throw new Error('Opération refusée.');
        if (def.kind === 'dev' && !creator) throw new Error('Réservé au Mode Créateur.');
        const args = Array.isArray(op.a) ? clone(op.a) : [];
        let r;
        if (NET[op.m]) r = await NET[op.m](c, g, ...args);
        else if (DEV[op.m]) r = DEV[op.m](g, ...args);
        else if (typeof g[op.m] === 'function') r = g[op.m](...args);
        else throw new Error('Opération inconnue.');
        if (op.m === 'finishTrial' || op.m === 'abandonTrial') { if (r?.won && r.points) fx.trials.push({ day: r.day, idx: r.i, hp: r.points - 100 }); }
        if (def.kind === 'first' || def.kind === 'dev' || op.r) rets[q] = r === undefined ? null : clone(r);
      } catch (e) { errs[q] = String(e?.message || e).slice(0, 200); }
    }
    curQ = 0;
    seqs['d:' + dev] = last;
    // réglages et marques de l'interface (libres), outils du Mode Créateur (créateur seulement)
    if (b.free && typeof b.free === 'object') {
      for (const p of FREE) { const v = b.free[p]; if (v !== undefined && JSON.stringify(v).length < 20000) setPath(g.s, p, clone(v)); }
      if (creator) for (const p of FREE_DEV) { if (b.free[p] !== undefined) setPath(g.s, p, clone(b.free[p])); }
      if (!creator && g.s.settings) g.s.settings.dev = false;
    }
    g.persist(); // note aussi le jour joué (coffre de la semaine)
    const out = g.s, dg = digest(out);
    // profil public et fiche d'ami : republiés seulement s'ils ont changé (ou s'il y a des Épreuves à compter)
    const profile = { avatar: g.shownAvatar(), title: out.title, frame: out.frame || null, plate: out.plate || null, /* v564 : vus par les autres */ level: g.levelInfo().level, owned: g.uniqueCount() }, card = friendCard(g);
    let h = 2166136261; for (const ch of JSON.stringify([profile, card])) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    const pub = h.toString(36), mustPub = pub !== seqs._pub || fx.trials.length > 0 || !!b.pub;
    seqs._pub = pub;
    const saved = await db.save(uid, { data: out, version: (row.version || 0) + 1, seqs, tz, tz_at: tzAt });
    if (!saved) { await db.unlock(uid).catch(() => {}); return { status: 409, body: { error: 'Ta partie a changé ailleurs : réessaie.' } }; }
    // ce que les autres voient : profil public, fiche d'ami, classement des Épreuves (tenus par le serveur)
    if (mustPub) { try { await db.publish(uid, profile, card, fx.trials); } catch (e) { /* jamais bloquant */ } }
    const res = { ok: true, v: (row.version || 0) + 1, digest: dg, rets, errs, prog, tz };
    if (b.want || b.digest !== dg) res.data = out; // la partie n'est renvoyée que si celle du téléphone diffère
    return { status: 200, body: res };
  } catch (e) {
    await db.unlock(uid).catch(() => {});
    return { status: 500, body: { error: String(e?.message || e).slice(0, 200) } };
  }
}
