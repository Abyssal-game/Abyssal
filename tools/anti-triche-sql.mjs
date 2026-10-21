// Génère supabase/11-anti-triche.sql : titres et cartes connus du jeu (un titre inventé ou un faux portrait sont refusés par le serveur).
// À relancer quand on ajoute des cartes ou des titres, puis recoller le fichier dans Supabase.
import fs from 'node:fs';
import { allTitles, allCardIds } from './anti-triche-data.mjs';

const root = new URL('..', import.meta.url);
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const titles = allTitles(), ids = allCardIds();
const sql = fs.readFileSync(new URL('tools/anti-triche-template.sql', root), 'utf8')
  .replace('--TITRES--', titles.map((t) => `(${q(t)})`).join(',\n'))
  .replace('--CARTES--', ids.map((t) => `(${q(t)})`).join(',\n'));
fs.writeFileSync(new URL('supabase/11-anti-triche.sql', root), sql);
console.log(titles.length, 'titres,', ids.length, 'cartes');
