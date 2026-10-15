// Prompts des illustrations à refaire (tools/redo-art.json), au même format que les autres cartes.
// node tools/redo-art.mjs           → affiche les prompts
// node tools/redo-art.mjs <ID> --write → enregistre la nouvelle description dans la carte (après réception de l'image)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../tests/helpers.mjs';
import { FACTION_ORDER } from '../js/config.js';

const TAIL = {
  C: 'cadrage moyen, créature seule', PC: 'pose dynamique, quelques effets lumineux', R: 'contre-plongée héroïque, effets magiques marqués',
  HR: 'contre-plongée imposante, armure ou anatomie très ornementée, effets magiques intenses', M: 'composition épique plein cadre, aura immense, présence divine',
  S: 'composition iconique et luxueuse, accents dorés, aura irréelle',
};
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const redo = read('tools/redo-art.json').cards;
const factions = Object.fromEntries(FACTION_ORDER.map((f) => [f, read(`data/cards/${f}.json`)]));
const style = Object.fromEntries(FACTION_ORDER.map((f) => [f, factions[f][0].artPrompt.split(' Illustration de carte de jeu dark fantasy, ')[1].split(', particules magiques en suspension')[0]]));
const find = (id) => Object.values(factions).flat().find((c) => c.id === id);
export const promptOf = (c, visual) => `${c.name} — ${visual} Illustration de carte de jeu dark fantasy, ${style[c.faction]}, particules magiques en suspension, ${TAIL[c.rarity]}, très détaillé, format vertical 5:7, sans texte, sans bordure, sans logo.`;

const [id] = process.argv.slice(2);
if (id && process.argv.includes('--write')) {
  const c = find(id);
  if (!c || !redo[id]) { console.error(`Rien à refaire pour ${id}`); process.exit(1); }
  c.artPrompt = promptOf(c, redo[id].visual);
  fs.writeFileSync(path.join(ROOT, `data/cards/${c.faction}.json`), JSON.stringify(factions[c.faction], null, 1) + '\n');
  console.log(`${id} : description mise à jour.`);
} else {
  for (const [k, r] of Object.entries(redo)) { const c = find(k); console.log(`${k} ${c.name} (${c.rarity}) — ${r.why}\n${promptOf(c, r.visual)}\n`); }
}
