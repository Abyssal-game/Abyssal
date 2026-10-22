// Intègre un lot de nouvelles créatures (data/lot-*.json) à la fin des fichiers de faction.
// Les statistiques, le rôle et le dessin de secours viennent d'une carte existante de même rareté et de même rôle.
// Usage : node tools/add-lot.mjs data/lot-z.json [--write]   (sans --write : vérifie et affiche seulement)
// Après --write : node tools/gen-kits.mjs, puis les illustrations avec tools/add-art.py.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../tests/helpers.mjs';
import { FACTION_ORDER } from '../js/config.js';
import { roleOf } from '../js/core/army.js';

const VALUED = ['strike', 'curse', 'bless', 'death', 'command', 'regen', 'armor', 'cataclysm'];
const DEF_V = { C: 1, PC: 1, R: 2, HR: 2, M: 3, S: 3 };
const TAIL = {
  C: 'cadrage moyen, créature seule', PC: 'pose dynamique, quelques effets lumineux', R: 'contre-plongée héroïque, effets magiques marqués',
  HR: 'contre-plongée imposante, armure ou anatomie très ornementée, effets magiques intenses', M: 'composition épique plein cadre, aura immense, présence divine',
  S: 'composition iconique et luxueuse, accents dorés, aura irréelle',
};
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

export function buildLot(lot, factions = Object.fromEntries(FACTION_ORDER.map((f) => [f, read(`data/cards/${f}.json`)]))) {
  const all = Object.values(factions).flat();
  const names = new Set(all.map((c) => c.name));
  const abil = read('data/abilities.json');
  const next = Object.fromEntries(FACTION_ORDER.map((f) => [f, Math.max(...factions[f].map((c) => c.number))]));
  const style = Object.fromEntries(FACTION_ORDER.map((f) => [f, factions[f][0].artPrompt.split(' Illustration de carte de jeu dark fantasy, ')[1].split(', particules magiques en suspension')[0]]));
  const prefix = Object.fromEntries(FACTION_ORDER.map((f) => [f, factions[f][0].id.split('-')[0]]));
  const out = [], errors = [];
  for (const z of lot.cards) {
    if (!FACTION_ORDER.includes(z.faction)) { errors.push(`Z${z.z} : faction inconnue`); continue; }
    if (names.has(z.name)) errors.push(`Z${z.z} : le nom « ${z.name} » existe déjà`);
    names.add(z.name);
    z.abilities.forEach((k) => { if (!abil[k]) errors.push(`Z${z.z} : capacité inconnue ${k}`); });
    const role = roleOf({ abilities: z.abilities.map((key) => ({ key })) });
    const same = all.filter((c) => c.rarity === z.rarity && roleOf(c) === role);
    const tpl = same.find((c) => c.faction === z.faction) || same[0] || all.find((c) => c.rarity === z.rarity);
    const abilities = z.abilities.map((key) => (VALUED.includes(key) ? { key, value: tpl.abilities.find((a) => a.key === key)?.value || DEF_V[z.rarity] } : { key }));
    const n = ++next[z.faction];
    const id = `${prefix[z.faction]}-${String(n).padStart(3, '0')}`;
    out.push({
      z: z.z, card: {
        id, number: n, name: z.name, title: z.title, faction: z.faction, rarity: z.rarity, category: z.category,
        power: tpl.power, role: tpl.role, stats: { ...tpl.stats }, abilities, visual: z.visual, lore: z.lore, evolution: null, sets: [],
        variants: ['normal', 'holo', 'galaxy', 'gold', 'crystal', 'prism'], art: { ...tpl.art }, image: `assets/art/${id}.webp`,
        artPrompt: `${z.name} — ${z.visual} Illustration de carte de jeu dark fantasy, ${style[z.faction]}, particules magiques en suspension, ${TAIL[z.rarity]}, très détaillé, format vertical 5:7, sans texte, sans bordure, sans logo.`,
      },
    });
  }
  const byZ = Object.fromEntries(out.map((x) => [x.z, x.card.id]));
  const sets = (lot.sets || []).map(({ z, ...s }) => ({ ...s, cards: z.map((k) => byZ[k]) }));
  for (const s of sets) {
    if (s.cards.some((id) => !id)) errors.push(`Ensemble ${s.key} : numéro de carte inconnu`);
    s.cards.forEach((id) => out.find((x) => x.card.id === id).card.sets.push(s.key));
  }
  return { cards: out, sets, errors };
}

if (process.argv[1] && process.argv[1].endsWith('add-lot.mjs')) {
  const file = process.argv[2];
  if (!file) { console.log('Usage : node tools/add-lot.mjs data/lot-z.json [--write]'); process.exit(1); }
  const lot = read(file);
  const factions = Object.fromEntries(FACTION_ORDER.map((f) => [f, read(`data/cards/${f}.json`)]));
  const { cards, sets, errors } = buildLot(lot, factions);
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  cards.forEach(({ z, card }) => console.log(`Z${z} → ${card.id} ${card.name} (${card.rarity})`));
  if (process.argv.includes('--write')) {
    cards.forEach(({ card }) => factions[card.faction].push(card));
    for (const f of FACTION_ORDER) fs.writeFileSync(path.join(ROOT, `data/cards/${f}.json`), JSON.stringify(factions[f], null, 1) + '\n');
    const allSets = read('data/sets.json');
    fs.writeFileSync(path.join(ROOT, 'data/sets.json'), JSON.stringify([...allSets, ...sets], null, 1) + '\n');
    console.log(`${cards.length} cartes et ${sets.length} ensembles ajoutés.`);
  }
}
