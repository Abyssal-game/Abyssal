// Titres et cartes connus du jeu, pour supabase/11-anti-triche.sql (lu par tools/anti-triche-sql.mjs et par les tests).
import { loadCatalog } from '../tests/helpers.mjs';
import { unlockSources } from '../js/core/unlocks.js';
import { SEASONS, SHOP } from '../js/core/codex.js';

// titres retirés du jeu mais encore dans des sauvegardes (jeux retirés, anciens noms)
const RETIRED = ['Novice des Sceaux', 'Éveilleur des Sceaux', 'Maître des Masques', 'Prêtre des Trois Autels',
  /* v547 : titres de l'ancienne ébauche du Codex */ 'Scribe de l’Abîme', 'Enlumineur', 'Gardien des pages', 'Maître du Codex', 'Lecteur assidu'];

export function allTitles() {
  const cat = loadCatalog(), out = new Set(unlockSources(cat).titles.map((t) => t.name));
  for (const se of SEASONS) for (const t of se.tiers) for (const r of [t.free, t.prem]) if (r?.title) out.add(r.title);
  for (const p of SHOP) if (p.give?.title) out.add(p.give.title);
  RETIRED.forEach((t) => out.add(t));
  return [...out].sort();
}
export const allCardIds = () => loadCatalog().cards.map((c) => c.id).sort();
