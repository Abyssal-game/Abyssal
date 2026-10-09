// Réécrit le champ artPrompt de toutes les cartes selon la charte d'illustration
// (peinture numérique dark fantasy semi-réaliste). Usage : node tools/restyle-prompts.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../tests/helpers.mjs';
import { FACTION_ORDER } from '../js/config.js';

const FACTION = {
  infernal: 'lueurs rouge sang et braises orangées, fumée et cendres, ruines de cuivre en fusion',
  abyssal: 'lueurs cyan bioluminescentes, eaux noires des profondeurs, rayons de lumière filtrant d’en haut',
  celeste: 'lumière dorée et blanc spectral, plumes, auréoles, nuées divines',
  sauvage: 'lueurs ambrées et vert toxique, forêt maudite dans la brume, clair de lune',
  necrotique: 'lueurs violettes spectrales, brume de crypte, éclats magiques pourpres',
  primordial: 'lave incandescente et or ancien, ciel cosmique ou volcanique, échelle titanesque',
  artificiel: 'runes cyan électrique, reflets de bronze et d’acier, vapeur de forge',
};
const RARITY = {
  C: 'cadrage moyen, créature seule',
  PC: 'pose dynamique, quelques effets lumineux',
  R: 'contre-plongée héroïque, effets magiques marqués',
  HR: 'contre-plongée imposante, armure ou anatomie très ornementée, effets magiques intenses',
  M: 'composition épique plein cadre, aura immense, présence divine',
  S: 'composition iconique et luxueuse, accents dorés, aura irréelle',
};
for (const f of FACTION_ORDER) {
  const file = path.join(ROOT, `data/cards/${f}.json`);
  const cards = JSON.parse(fs.readFileSync(file, 'utf8'));
  cards.forEach((c) => {
    c.artPrompt = `${c.name} — ${c.visual} Illustration de carte de jeu dark fantasy, peinture numérique semi-réaliste, encrage marqué et coups de pinceau visibles, éclairage dramatique en contre-jour, ${FACTION[f]}, particules magiques en suspension, ${RARITY[c.rarity]}, très détaillé, format vertical 5:7, sans texte, sans bordure, sans logo.`;
  });
  fs.writeFileSync(file, JSON.stringify(cards, null, 1) + '\n');
}
console.log('Prompts réécrits.');
