// Titres et cartes connus du jeu, pour supabase/11-anti-triche.sql (lu par tools/anti-triche-sql.mjs et par les tests).
import { loadCatalog } from '../tests/helpers.mjs';
import { unlockSources } from '../js/core/unlocks.js';
import { SEASONS, SHOP } from '../js/core/codex.js';
import { CREATOR_KIT } from '../js/config.js';

// titres retirés du jeu mais encore dans des sauvegardes (jeux retirés, anciens noms)
const RETIRED = ['Novice des Sceaux', 'Éveilleur des Sceaux', 'Maître des Masques', 'Prêtre des Trois Autels',
  /* v547 : titres de l'ancienne ébauche du Codex */ 'Scribe de l’Abîme', 'Enlumineur', 'Gardien des pages', 'Maître du Codex', 'Lecteur assidu',
  /* v674 : titres des saisons de Noël et de la Saint-Valentin, et anciens noms de saisons */ 'Porteur de chandelles', 'Chanteur de minuit', 'Gardien du houx', 'Hôte de la Veillée', 'Messager des présents', 'Cœur de braise', 'Gardien de la Veillée', 'Gardien du solstice', 'Amant des ombres', 'Âme liée', 'Soupir de l’Abysse', 'Maître des confettis', 'Maître du Carnaval', 'Marteau des Titans', 'Forgeron des Titans', 'Enfant du Solstice', 'Fidèle de la première heure', 'Témoin de la première année'];

export function allTitles() {
  const cat = loadCatalog(), out = new Set(unlockSources(cat).titles.map((t) => t.name));
  for (const se of SEASONS) for (const t of se.tiers) for (const r of [t.free, t.prem]) if (r?.title) out.add(r.title);
  for (const p of SHOP) if (p.give?.title) out.add(p.give.title);
  out.add(CREATOR_KIT.title); /* v890 : titre du Gardien (réservé au badge du créateur par profiles_sane) */
  RETIRED.forEach((t) => out.add(t));
  return [...out].sort();
}
export const allCardIds = () => loadCatalog().cards.map((c) => c.id).sort();
