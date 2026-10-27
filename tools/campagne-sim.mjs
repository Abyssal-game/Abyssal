// v871 : mesure de la difficulté de la campagne de la Descente, étage par étage (remplace tools/fuzz.mjs pour l'équilibre :
// celui-ci date d'avant la campagne en chapitres et joue au hasard). Pour chaque étage, N combats joués par le pilote
// automatique du Labo (js/core/lab.js) avec une « équipe type » à la force conseillée de l'étage (advisedPower) et une défense
// donnée (LAB_DEF : none, weak, mid, good). Les étages multiples de 5 sont des gardiens.
// Usage : node tools/campagne-sim.mjs [combats par étage = 40] [défense = mid] [dernier étage = 60] [premier étage = 1]
import { loadCatalog, MemoryStorage, rngFrom } from '../tests/helpers.mjs';
import { Game } from '../js/core/game.js';
import { labSimulate } from '../js/core/lab.js';

const N = +process.argv[2] || 40, DEF = process.argv[3] || 'mid', LAST = +process.argv[4] || 60, FIRST = +process.argv[5] || 1;
const g = new Game(loadCatalog(), new MemoryStorage(), { rng: rngFrom('campagne'), clock: () => new Date(2026, 10, 2, 12) });
const rows = [];
for (let f = FIRST; f <= LAST; f++) {
  const room = f % 5 === 0 ? 'boss' : 'fight';
  const r = labSimulate(g, { floor: f, room, level: 'type' }, N, DEF);
  rows.push({ étage: f, salle: room === 'boss' ? 'gardien' : 'combat', victoires: `${r.win} %`, 'PV perdus': `${r.lost} %`, tours: r.rounds, tombées: r.fallen });
}
console.table(rows);
