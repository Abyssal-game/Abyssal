// Partie de démonstration pour les captures des stores : collection fournie, équipe montée, tutoriels déjà vus.
// Usage : node tools/store-demo-save.mjs > fichier.json  (la sauvegarde est écrite sur la sortie)
import { loadCatalog, MemoryStorage, rngFrom } from '../tests/helpers.mjs';
import { Game } from '../js/core/game.js';
import { SAVE_KEY } from '../js/config.js';
import * as SC from '../js/core/sceaux.js';
const GUIDE_V = 99; // au-dessus de la version du guide d'accueil (js/screens/welcome.js)

const catalog = loadCatalog();
const st = new MemoryStorage();
const g = new Game(catalog, st, { rng: rngFrom('abyssal-store') });
g.devGrant({ tickets: { standard: 60, premium: 12 } });
while ((g.s.tickets.standard || 0) > 0) g.openBooster('standard');
while ((g.s.tickets.premium || 0) > 0) g.openBooster('premium');
// quelques pièces maîtresses, avec leurs finitions
for (const r of ['S', 'M']) catalog.byRarity[r].slice(0, r === 'S' ? 3 : 8).forEach((c) => c.variants.forEach((v) => g.devGive(c.id, v)));
g.devDuplicates(12);
g.devGrant({ shards: 2400, ash: 1800 });
g.devChests();
g.setTeam(g.autoTeam());
g.s.seenIntro = GUIDE_V;
g.s.name = 'Morgane'; // v700 : un nom de joueur sur les captures (plus « Toi »)
g.s.tips = Object.fromEntries('army-doors army-team boosters cb-break cb-combo cb-defense cb-defense2 cb-defense3 cb-dice cb-dice2 cb-dice3 cb-duo cb-entrance cb-goal cb-intro cb-phase2 cb-runes cb-skill cb-talent cb-traits cb-ult coffres collection fournaise pacts renfort sceaux sceaux-awake sceaux-board sceaux-combo sceaux-perks tirage'.split(' ').map((k) => [k, 1]));
g.markAllSeen();
g.s.bossesBeaten.devoreur = Date.now(); // ouvre les Duels des Sceaux
g.devGrant({ tickets: { premium: 1 } }); // un booster à ouvrir pour la capture d'ouverture
g.s.seedN = Number(process.env.OPEN_SEED || 6000); /* v889 : tirage du booster de la capture d'ouverture */
const mode = process.argv[2] || '';
if (mode === 'sceaux') { // partie de Sceaux commencée : quelques cartes déjà posées
  g.sceauxStart({ rival: 'initie' });
  const r = rngFrom('pose');
  for (let k = 0; k < 4 && !g.s.sceaux.cur.over; k++) { if (g.s.sceaux.cur.turn === 'o') g.sceauxAi(); else { const m = SC.aiMove(catalog, g.s.sceaux.cur, 4, r); g.sceauxPlay(m[0], m[1]); } }
}
const begin = () => { g.startRun(); const r = g.s.descent.run; if (r?.phase === 'omen') g.chooseOmen(r.omenOffer[0]); }; // v354 : passe le Présage (ouvert après le premier gardien)
if (mode === 'portes') begin(); // expédition commencée, sur l'écran des portes
if (mode === 'combat') { begin(); const d = g.doors(); g.chooseDoor(d.includes('fight') ? 'fight' : d[0]); }
/* v889 : combat contre un gardien des profondeurs (étage COMBAT_FLOOR, 25 par défaut : L’Éclipse), pour des captures qui donnent envie */
if (mode === 'gardien') {
  const f = Number(process.env.COMBAT_FLOOR || 25);
  g.s.descent.best = f - 1; for (let k = 5; k < f; k += 5) g.s.bossesBeaten[`f${k}`] ||= Date.now();
  g.startRun({ start: Math.floor((f - 1) / 5) * 5 + 1 }); const r = g.s.descent.run; if (r?.phase === 'omen') g.chooseOmen(r.omenOffer[0]);
  g.s.descent.run.floor = f; g.chooseDoor(g.doors()[0]);
}
g.persist();
process.stdout.write(st.getItem(SAVE_KEY));
