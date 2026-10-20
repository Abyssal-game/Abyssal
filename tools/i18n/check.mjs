// node check.mjs lot-XX.json en-XX.json : vérifie qu'une traduction est complète et garde balises et marqueurs
import fs from 'node:fs';
const keys = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let tr; try { tr = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')); } catch (e) { console.log('JSON INVALIDE :', e.message); process.exit(1); }
const ph = (s) => (s.match(/\{e?\d+\}/g) || []).sort().join(',');
const tags = (s) => (s.match(/<\/?(b|i|small|br|em|strong|u|sup|sub)>/g) || []).sort().join(',');
let bad = 0;
for (const k of keys) {
  if (!(k in tr)) { console.log('MANQUE :', JSON.stringify(k).slice(0, 120)); bad++; continue; }
  const v = tr[k];
  if (typeof v !== 'string') { console.log('PAS UN TEXTE :', k.slice(0, 80)); bad++; continue; }
  if (ph(k) !== ph(v)) { console.log('MARQUEURS :', JSON.stringify(k).slice(0, 100), '=>', JSON.stringify(v).slice(0, 100)); bad++; }
  if (tags(k) !== tags(v)) { console.log('BALISES :', JSON.stringify(k).slice(0, 100), '=>', JSON.stringify(v).slice(0, 100)); bad++; }
}
const extra = Object.keys(tr).filter((k) => !keys.includes(k));
if (extra.length) console.log('CLÉS EN TROP (à retirer) :', extra.length, JSON.stringify(extra.slice(0, 3)));
console.log(bad || extra.length ? `${bad} problème(s), ${extra.length} en trop` : `OK : ${keys.length} textes`);
