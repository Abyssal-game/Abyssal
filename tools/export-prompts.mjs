// Exporte les prompts d'illustration de toutes les cartes dans prompts.csv,
// pour produire les illustrations définitives avec l'outil de son choix.
import fs from 'node:fs';
import path from 'node:path';
import { loadCatalog, ROOT } from '../tests/helpers.mjs';

const cat = loadCatalog();
const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
const lines = ['id;fichier;nom;faction;rarete;prompt'];
cat.cards.forEach((c) => lines.push([c.id, c.image, c.name, c.faction, c.rarity, c.artPrompt].map(q).join(';')));
fs.writeFileSync(path.join(ROOT, 'prompts.csv'), '﻿' + lines.join('\n'));
console.log(`prompts.csv : ${cat.cards.length} prompts.`);
