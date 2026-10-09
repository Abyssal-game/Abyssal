// Vérifie la cohérence des données : identifiants, champs, capacités, ensembles,
// lignées, fichiers d'illustration déclarés. Usage : npm run check
import fs from 'node:fs';
import path from 'node:path';
import { loadCatalog, ROOT } from '../tests/helpers.mjs';
import { RARITY_ORDER, FACTION_ORDER } from '../js/config.js';
import { renderArt } from '../js/art/procedural.js';

const cat = loadCatalog();
const errors = [], warnings = [];
const ids = new Set(), names = new Set();
for (const f of FACTION_ORDER) {
  const prefix = cat.faction[f].prefix;
  cat.byFaction[f].forEach((c, i) => {
    if (c.id !== `${prefix}-${String(i + 1).padStart(3, '0')}`) warnings.push(`${c.id} : numéro hors séquence (position ${i + 1})`);
  });
}
for (const c of cat.cards) {
  if (ids.has(c.id)) errors.push(`Identifiant en double : ${c.id}`);
  ids.add(c.id);
  if (names.has(c.name)) errors.push(`Nom en double : ${c.name}`);
  names.add(c.name);
  for (const k of ['name', 'title', 'category', 'visual', 'lore', 'artPrompt']) if (!c[k] || typeof c[k] !== 'string') errors.push(`${c.id} : champ « ${k} » manquant`);
  if (!RARITY_ORDER.includes(c.rarity)) errors.push(`${c.id} : rareté inconnue ${c.rarity}`);
  if (!FACTION_ORDER.includes(c.faction)) errors.push(`${c.id} : faction inconnue ${c.faction}`);
  for (const k of ['atk', 'def', 'spd', 'mag', 'hp', 'cost']) if (!Number.isFinite(c.stats?.[k])) errors.push(`${c.id} : statistique ${k} invalide`);
  for (const a of c.abilities) if (!cat.abilities[a.key]) errors.push(`${c.id} : capacité inconnue « ${a.key} »`);
  if (!c.variants.includes('normal')) errors.push(`${c.id} : la variante normale doit exister`);
  if (c.lore.length > 220) warnings.push(`${c.id} : lore long (${c.lore.length} caractères)`);
  try { const svg = renderArt(c); if (svg.length < 2000) warnings.push(`${c.id} : illustration très pauvre`); } catch (e) { errors.push(`${c.id} : illustration impossible (${e.message})`); }
}
for (const s of cat.sets) for (const id of s.cards) if (!cat.get(id)) errors.push(`Ensemble ${s.key} : carte inconnue ${id}`);
for (const f of cat.factions) if (!cat.get(f.featured)) errors.push(`Faction ${f.key} : carte vedette inconnue`);
for (const l of Object.values(cat.lines)) l.cards.forEach((c, i) => { if (c.evolution.stage !== i + 1) errors.push(`Lignée ${l.key} : stade manquant avant ${c.id}`); });
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/art/manifest.json'), 'utf8'));
for (const id of manifest.available || []) {
  if (!cat.get(id.replace(/-alt$/, ''))) errors.push(`manifest.json : carte inconnue ${id}`);
  if (!fs.existsSync(path.join(ROOT, `assets/art/${id}.webp`))) errors.push(`manifest.json : fichier manquant assets/art/${id}.webp`);
}
const count = Object.fromEntries(RARITY_ORDER.map((r) => [r, cat.byRarity[r].length]));
console.log(`${cat.cards.length} cartes · ${JSON.stringify(count)} · ${cat.sets.length} ensembles · ${(manifest.available || []).length} illustrations définitives`);
warnings.forEach((w) => console.log('  avertissement :', w));
errors.forEach((e) => console.log('  ERREUR :', e));
console.log(errors.length ? `${errors.length} erreur(s).` : 'Données valides.');
process.exit(errors.length ? 1 : 0);
