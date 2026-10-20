// v537 : node tools/i18n/assemble.mjs <dossier des lots> <langue> : rassemble les lots traduits dans js/i18n/<langue>.js
// (lots lot-NNN.json : sortie des traductions ; kinds.json dit si un lot va dans le dictionnaire ou dans les noms)
import fs from 'node:fs';
import path from 'node:path';
const [dir, lang] = process.argv.slice(2);
const kinds = JSON.parse(fs.readFileSync(path.join(dir, 'kinds.json'), 'utf8'));
const dict = {}, names = {};
let missing = 0;
kinds.forEach((k, i) => {
  const f = path.join(dir, lang, `lot-${String(i).padStart(3, '0')}.json`);
  const src = JSON.parse(fs.readFileSync(path.join(dir, `lot-${String(i).padStart(3, '0')}.json`), 'utf8'));
  const tr = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  for (const { fr } of src) { if (typeof tr[fr] === 'string') (k === 'names' ? names : dict)[fr] = tr[fr]; else missing++; }
});
const lit = (o) => Object.entries(o).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
const head = { es: 'espagnol', de: 'allemand', it: 'italien', pt: 'portugais du Brésil' }[lang] || lang;
fs.writeFileSync(`js/i18n/${lang}.js`, `// Dictionnaire ${head} (v537, traduit depuis le français ; même forme que en.js). Généré par tools/i18n/assemble.mjs.\nexport default {\n${lit(dict)}\n};\n\nexport const names = {\n${lit(names)}\n};\n`);
console.log(lang, Object.keys(dict).length, 'textes,', Object.keys(names).length, 'noms,', missing, 'manquants');
