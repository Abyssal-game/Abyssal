// Génère supabase/09-multijoueur.sql (mini-jeux en ligne) : valeurs des cartes aux Sceaux et délai par coup lus dans le jeu.
// À relancer si des cartes sont ajoutées, puis recoller le fichier dans Supabase.
import fs from 'node:fs';
import { sideValues } from '../js/core/sceaux.js';
import { MP_HOURS } from '../js/core/mp.js';

const root = new URL('..', import.meta.url);
const cards = [];
for (const f of fs.readdirSync(new URL('data/cards/', root)).filter((x) => x.endsWith('.json')).sort()) {
  for (const c of JSON.parse(fs.readFileSync(new URL(`data/cards/${f}`, root)))) cards.push(c);
}
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const rows = cards.map((c) => `(${q(c.id)},${q(c.rarity)},'{${sideValues(c).join(',')}}')`).join(',\n');
const sql = fs.readFileSync(new URL('tools/mp-template.sql', root), 'utf8').replace('--CARTES--', rows).replaceAll('--HEURES--', String(MP_HOURS));
fs.writeFileSync(new URL('supabase/09-multijoueur.sql', root), sql);
console.log(cards.length, 'cartes');
