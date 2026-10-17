// Mesure de difficulté des Duels des Sceaux (v403) : pour chaque adversaire (normal et implacable), N parties.
// Le joueur est simulé par l'IA de niveau 3 (sans erreur), avec une main conseillée tirée de 40 cartes C/PC/R.
// Usage : node tools/sceaux-sim.mjs [parties=150]
import { loadCatalog } from '../tests/helpers.mjs';
import * as SC from '../js/core/sceaux.js';

const N = Number(process.argv[2]) || 150;
const cat = loadCatalog();
const mul = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const low = cat.cards.filter((c) => ['C', 'PC', 'R'].includes(c.rarity)).map((c) => c.id);
const out = [];
for (const base of SC.RIVALS) {
  const row = [base.name.padEnd(24)];
  for (const R of [base, SC.awakened(base)]) {
    let won = 0;
    for (let i = 0; i < N; i++) {
      const rnd = mul(i * 7919 + R.key.length * 31 + (R.awake ? 5 : 0));
      const pool = low.slice().sort(() => rnd() - 0.5).slice(0, 40);
      const st = SC.newGame(cat, { hand: SC.autoHand(cat, pool), rival: R, seed: 1000 + i });
      while (!st.over) {
        const who = st.turn;
        const m = who === 'p' ? SC.aiMove(cat, st, 3, rnd, 0) : SC.aiMove(cat, st, R.ai[0], rnd, R.ai[1]);
        SC.place(cat, st, who, m[0], m[1]);
      }
      if (st.over === 'won') won++;
    }
    row.push(`${String(Math.round((won / N) * 100)).padStart(3)} %`);
  }
  out.push(row.join('  '));
}
console.log(`Victoires du joueur (IA niveau 3), ${N} parties : normal  implacable`);
console.log(out.join('\n'));
