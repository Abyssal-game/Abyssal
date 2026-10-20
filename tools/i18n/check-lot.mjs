// v537 : node tools/i18n/check-lot.mjs lot-XXX.json out.json : chaque texte du lot traduit, mêmes marqueurs ({0}, {e0}, {n0}) et balises
import fs from 'node:fs';
const lot = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).map((x) => x.fr);
let tr; try { tr = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')); } catch (e) { console.log('JSON INVALIDE :', e.message); process.exit(1); }
const ph = (s) => (s.match(/\{[en]?\d+\}/g) || []).sort().join(',');
const tags = (s) => (s.match(/<\/?(b|i|small|br|em|strong|u|sup|sub)>/g) || []).sort().join(',');
let bad = 0;
for (const k of lot) {
  if (!(k in tr)) { console.log('MANQUE :', JSON.stringify(k).slice(0, 120)); bad++; continue; }
  const v = tr[k];
  if (typeof v !== 'string' || (!v.trim() && k.trim())) { console.log('VIDE :', k.slice(0, 80)); bad++; continue; }
  if (ph(k) !== ph(v)) { console.log('MARQUEURS :', JSON.stringify(k).slice(0, 100), '=>', JSON.stringify(v).slice(0, 100)); bad++; }
  if (tags(k) !== tags(v)) { console.log('BALISES :', JSON.stringify(k).slice(0, 100), '=>', JSON.stringify(v).slice(0, 100)); bad++; }
}
const extra = Object.keys(tr).filter((k) => !lot.includes(k));
if (extra.length) { console.log('CLÉS EN TROP :', extra.length, JSON.stringify(extra.slice(0, 3))); bad++; }
console.log(bad ? `${bad} problème(s)` : `OK : ${lot.length} textes`);
process.exit(bad ? 1 : 0);
