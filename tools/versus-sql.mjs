// Génère supabase/08-versus.sql (Versus Booster) : cartes, probabilités, prix et points lus dans le jeu.
// À relancer si des cartes sont ajoutées ou si les boosters changent, puis recoller le fichier dans Supabase.
import fs from 'node:fs';
import { TABLES, BOOSTERS, VARIANT_RATES, LUCK_POINTS } from '../js/config.js';
import { VERSUS_TYPES } from '../js/core/versus.js';

const root = new URL('..', import.meta.url);
const cards = [];
for (const f of fs.readdirSync(new URL('data/cards/', root)).filter((x) => x.endsWith('.json')).sort()) {
  for (const c of JSON.parse(fs.readFileSync(new URL(`data/cards/${f}`, root)))) cards.push(c);
}
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const rows = cards.map((c) => `(${q(c.id)},${q(c.rarity)},${q(c.faction)},'{${c.variants.filter((v) => v in VARIANT_RATES).join(',')}}')`).join(',\n');
const used = [...new Set(VERSUS_TYPES.flatMap((t) => BOOSTERS[t].slots))];
const poids = used.map((t) => `    when ${q(t)} then ${q(JSON.stringify(TABLES[t].weights))}::jsonb`).join('\n') + '\n    else null';
const boosters = VERSUS_TYPES.map((t) => `    when ${q(t)} then slots := array[${BOOSTERS[t].slots.map(q).join(',')}]; mult := ${BOOSTERS[t].variantMult};`).join('\n');
const fin = Object.entries(VARIANT_RATES).map(([v, p]) =>
  `    if v = 'normal' and ${q(v)} = any(c.variants) then if x >= 0 and x < ${p} * mult then v := ${q(v)}; end if; x := x - ${p} * mult; end if;`).join('\n');
const pts = ['C', 'PC', 'R', 'HR', 'M', 'S'].map((r) => `when ${q(r)} then ${LUCK_POINTS[r]}`).join(' ') + ' else 0';
const prix = VERSUS_TYPES.map((t) => `when ${q(t)} then ${BOOSTERS[t].price}`).join(' ');
const sql = fs.readFileSync(new URL('tools/versus-template.sql', root), 'utf8')
  .replace('--CARTES--', rows).replace('--POIDS--', poids).replace('--BOOSTERS--', boosters)
  .replace('--FINITIONS--', fin).replace('--POINTS--', pts).replace('--PTVAR--', String(LUCK_POINTS.variant)).replaceAll('--PRIX--', prix);
fs.writeFileSync(new URL('supabase/08-versus.sql', root), sql);
console.log(cards.length, 'cartes');
