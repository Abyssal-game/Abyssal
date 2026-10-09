// Simule des ouvertures de boosters avec les vraies règles du jeu.
// Usage : npm run sim -- [nombre] (10 000 par défaut)
import { loadCatalog } from '../tests/helpers.mjs';
import { drawBooster, boosterOdds } from '../js/core/boosters.js';
import { BOOSTERS, RARITY_ORDER } from '../js/config.js';

const N = Number(process.argv[2]) || 10000;
const cat = loadCatalog();
for (const type of Object.keys(BOOSTERS)) {
  const count = {}; let cards = 0, guar = 0, firstM = [], since = 0;
  let pity = { sinceHR: 0, sinceM: 0 };
  for (let i = 0; i < N; i++) {
    const r = drawBooster(type, cat, { pity, faction: 'infernal' });
    pity = r.pity; if (r.guaranteed) guar++;
    since++;
    if (r.cards.some((c) => c.rarity === 'M' || c.rarity === 'S')) { firstM.push(since); since = 0; }
    r.cards.forEach((c) => { count[c.rarity] = (count[c.rarity] || 0) + 1; cards++; });
  }
  const odds = boosterOdds(type);
  console.log(`\n${BOOSTERS[type].name} — ${N} boosters, ${cards} cartes`);
  console.log(RARITY_ORDER.map((r) => `${r.padEnd(2)} ${(((count[r] || 0) / cards) * 100).toFixed(2).padStart(6)} %`).join('   '));
  console.log(`théorie : au moins une HR+ ${odds.atLeastHR.toFixed(1)} % · M+ ${odds.atLeastM.toFixed(1)} % par booster`);
  console.log(`garanties déclenchées : ${guar} · boosters moyens entre deux Mythiques/Secrètes : ${(firstM.reduce((a, b) => a + b, 0) / Math.max(1, firstM.length)).toFixed(1)}`);
}
