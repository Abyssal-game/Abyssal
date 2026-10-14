// Outils communs aux tests : catalogue lu sur disque, stockage en mémoire.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCatalog } from '../js/core/catalog.js';
import { FACTION_ORDER } from '../js/config.js';
import { seeded } from '../js/art/geometry.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

export function loadCatalog() {
  return createCatalog({
    cards: FACTION_ORDER.flatMap((f) => read(`data/cards/${f}.json`)),
    factions: read('data/factions.json'),
    sets: read('data/sets.json'),
    abilities: read('data/abilities.json'),
    achievements: read('data/achievements.json'),
    lore: read('data/lore.json'),
  });
}

export class MemoryStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}

export const rngFrom = (seed) => seeded(seed);

// Joueur qui a déjà ouvert ses boosters de bienvenue (les tests de combat partent des 5 Communes de secours)
export const noWelcome = (g) => { g.s.tickets.standard = 0; return g; };
