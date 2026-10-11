// La Descente : expédition quotidienne dans l'Abysse avec une équipe de héros.
// Données des étages : portes, ennemis (créatures du Bestiaire avec niveaux), butin, bénédictions.
import { makeEnemy, enemyLevel, enemyPool, bossPool } from './heroes.js';

export const DESCENT = {
  teamSize: 3,
  torches: 3,            // expéditions par jour
  bossEvery: 5,
  woundHours: 6,         // un héros tombé est affaibli (-20 %) pendant ce temps
  cursedLoot: 2,         // descente maudite : butin doublé, mais tout est perdu si l'équipe tombe
};

export const BLESSINGS = {
  blades:  { name: 'Lames affûtées',   desc: '+3 ATQ pour toute l’équipe.' },
  scales:  { name: 'Peau d’écailles',  desc: 'Chaque dégât subi est réduit de 2.' },
  thirst:  { name: 'Soif de sang',     desc: 'Les héros se soignent de 30 % des dégâts infligés.' },
  vigor:   { name: 'Vigueur',          desc: '+20 % de PV max, et soin complet de l’équipe.' },
  haste:   { name: 'Pas du vent',      desc: '+2 VIT pour toute l’équipe.' },
  greed:   { name: 'Avidité',          desc: 'Le butin des prochains combats augmente de 30 %.' },
  ward:    { name: 'Sceau protecteur', desc: 'Chaque héros annule le premier coup de chaque combat.' },
  fury:    { name: 'Rage du Néant',    desc: 'Les attaques ont 25 % de chances de frapper une seconde fois.' },
};

// Générateur déterministe à partir d'une chaîne (même donjon pour tout le monde le même jour).
export function rngOf(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
const pick = (rng, list) => list[Math.floor(rng() * list.length)];


// ——— Étages ———————————————————————————————————————————————————————
const ROOM_TYPES = ['fight', 'fight', 'elite', 'altar', 'rest', 'treasure'];
export const ROOMS = {
  fight:    { name: 'Combat',         desc: 'Des créatures barrent le passage.' },
  elite:    { name: 'Élite',          desc: 'Un adversaire redoutable. Butin doublé.' },
  altar:    { name: 'Autel ancien',   desc: 'Choisis une bénédiction pour toute l’expédition.' },
  rest:     { name: 'Source sacrée',  desc: 'Ton équipe récupère 40 % de ses PV.' },
  treasure: { name: 'Trésor oublié',  desc: 'Un coffre, sans gardien… en apparence.' },
  boss:     { name: 'Gardien',        desc: 'Le gardien de l’étage. Victoire : coffre et booster.' },
};

// Deux portes proposées à chaque étage (les étages multiples de 5 sont des gardiens).
export function floorDoors(day, floor) {
  if (floor % DESCENT.bossEvery === 0) return ['boss'];
  const rng = rngOf(`doors:${day}:${floor}`);
  const a = pick(rng, ROOM_TYPES);
  let b = pick(rng, ROOM_TYPES);
  for (let i = 0; i < 6 && b === a; i++) b = pick(rng, ROOM_TYPES);
  return floor === 1 ? ['fight', b === 'fight' ? 'rest' : b] : [a, b];
}

// Ennemis d'un étage : plus nombreux, plus rares et plus forts en profondeur.
export function floorEnemies(catalog, day, floor, room) {
  const rng = rngOf(`enemies:${day}:${floor}:${room}`);
  const level = enemyLevel(floor, room);
  const pool = enemyPool(catalog, floor);
  const out = [];
  if (room === 'boss') out.push(makeEnemy(pick(rng, bossPool(catalog, floor)), { level, boss: true }));
  if (room === 'elite') out.push(makeEnemy(pick(rng, pool.filter((c) => c.rarity !== 'C')), { level, elite: true }));
  const n = room === 'boss' ? (floor >= 10 ? 2 : 1) : room === 'elite' ? 1 + (floor >= 6 ? 1 : 0) : 2 + (floor >= 3 ? 1 : 0) + (floor >= 9 ? 1 : 0);
  for (let i = 0; i < n; i++) out.push(makeEnemy(pick(rng, pool), { level: Math.max(1, level - (room === 'fight' ? 0 : 1)) }));
  return out;
}

// Butin d'une salle (avant le multiplicateur d'avidité ou de malédiction)
// Coffres : bois en surface, fer plus bas ; les gardiens gardent les coffres d'or puis abyssaux.
export function roomLoot(floor, room, rng) {
  const base = 12 + floor * 5;
  const small = floor >= 6 ? 'fer' : 'bois';
  if (room === 'fight') return { shards: base, ash: rng() < 0.4 ? 5 + floor : 0, chests: rng() < 0.12 ? { bois: 1 } : {} };
  if (room === 'elite') return { shards: base * 2, ash: 10 + floor * 2, chests: rng() < 0.5 ? { [small]: 1 } : {} };
  if (room === 'treasure') return { shards: base, ash: rng() < 0.5 ? 8 + floor : 0, chests: { [small]: 1 } };
  if (room === 'boss') {
    return { shards: base * 3, ash: 20 + floor * 3, tickets: { [floor >= 15 ? 'premium' : 'standard']: 1 },
      chests: { [floor >= 15 ? 'abyssal' : 'or']: 1 } };
  }
  return { shards: 0, ash: 0 };
}

export function blessingChoices(day, floor, owned = []) {
  const rng = rngOf(`altar:${day}:${floor}`);
  const keys = Object.keys(BLESSINGS).filter((k) => !owned.includes(k));
  const out = [];
  while (out.length < 3 && keys.length) out.push(keys.splice(Math.floor(rng() * keys.length), 1)[0]);
  return out;
}
