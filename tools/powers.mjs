// Génère data/powers.json : le pouvoir des Salles Oubliées de chaque carte (tools/powers.mjs).
// Les lignes déjà présentes dans le fichier sont gardées (corrections à la main) ; seules les
// cartes nouvelles reçoivent une suggestion. Lancer avec --reset pour tout recalculer.
import fs from 'node:fs';
import { loadCatalog } from '../tests/helpers.mjs';
import { POWERS, suggestPower } from '../js/core/powers.js';
const cat = loadCatalog();
const file = new URL('../data/powers.json', import.meta.url);
// Corrections à la main pour les créatures connues (gardées même avec --reset)
const OVERRIDES = {
  'CEL-031': 'regen', 'SAU-044': 'tentacules', 'SAU-043': 'frenesie', 'SAU-033': 'charge', 'SAU-041': 'presage', 'ABY-039': 'tentacules',
  'ART-011': 'carapace', 'ART-041': 'souffle', 'CEL-053': 'sceau', 'CEL-035': 'terreur', 'INF-054': 'jugement', 'NEC-029': 'releve', 'PRI-053': 'souffle',
};
const old = { ...(process.argv.includes('--reset') ? {} : cat.powers || {}), ...OVERRIDES };
const out = {};
for (const c of cat.cards) out[c.id] = POWERS[old[c.id]] ? old[c.id] : suggestPower(c);
fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
const count = {};
for (const k of Object.values(out)) count[k] = (count[k] || 0) + 1;
console.log(Object.keys(out).length, 'cartes ·', Object.entries(count).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · '));
if (process.argv.includes('--show')) for (const c of cat.cards) console.log(c.id, c.category.padEnd(26), POWERS[out[c.id]].name.padEnd(18), c.name);
