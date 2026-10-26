// v793 : ajoute (ou remplace) des traductions dans les 5 dictionnaires.
// node tools/i18n/add.mjs lot.json   avec lot.json = { "texte français": { "en": "…", "es": "…", "de": "…", "it": "…", "pt": "…" } }
// Les clés sont placées avant la fin de l'export default (jamais dans la liste des noms).
import fs from 'node:fs';
const lot = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const lang of ['en', 'es', 'de', 'it', 'pt']) {
  const file = `js/i18n/${lang}.js`;
  let src = fs.readFileSync(file, 'utf8');
  const end = src.indexOf('\n};');
  let head = src.slice(0, end), tail = src.slice(end);
  let added = 0, changed = 0;
  for (const [fr, tr] of Object.entries(lot)) {
    const v = tr[lang];
    if (v == null) throw new Error(`traduction ${lang} manquante : ${fr}`);
    const line = `  ${JSON.stringify(fr)}: ${JSON.stringify(v)},`;
    const re = new RegExp(`^  ${JSON.stringify(fr).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: .*,$`, 'm');
    if (re.test(head)) { head = head.replace(re, () => line); changed++; }
    else { head += `\n${line}`; added++; }
  }
  if (!head.trimEnd().endsWith(',')) head = head.replace(/\s*$/, ',');
  fs.writeFileSync(file, head + tail);
  console.log(lang, `+${added}`, `~${changed}`);
}
