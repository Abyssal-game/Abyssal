// La Descente : expédition quotidienne dans l'Abysse avec une équipe de cartes.
// Données des étages : portes, créatures corrompues, coffres, bénédictions, règle du jour.
import { RARITY_ORDER } from '../config.js';
import { COMBAT_BLESSINGS } from './skills.js';

export const DESCENT = {
  torches: 3,            // expéditions avec coffre par jour
  bossEvery: 5,
};

// Bénédictions de l'autel (pour toute l'expédition)
export const BLESSINGS = {
  blades: { name: 'Lames affûtées', desc: '+1 en attaque pour toutes tes créatures.' },
  vigor:  { name: 'Vigueur', desc: '+20 % de PV maximum et soin complet.' },
  ward:   { name: 'Sceau protecteur', desc: 'Chaque créature commence chaque combat avec un bouclier.' },
  greed:  { name: 'Avidité', desc: '+30 % d’éclats pour le reste de l’expédition.' },
  ...COMBAT_BLESSINGS, // bénédictions qui changent la façon de combattre
};

// Coffres : la profondeur atteinte décide du coffre ; il contient des boosters.
export const CHESTS = {
  bois:    { name: 'Coffre de bois',  color: '#B07A45', packs: [], shards: 50, ash: 20, desc: '50 éclats et 20 cendres' },
  fer:     { name: 'Coffre de fer',   color: '#A9B6C9', packs: [], shards: 150, ash: 40, desc: '150 éclats et 40 cendres' },
  or:      { name: 'Coffre d’or',     color: '#F2C14E', packs: ['standard'], shards: 0, ash: 60, desc: '1 booster standard et 60 cendres' },
  abyssal: { name: 'Coffre abyssal',  color: '#B04BFF', packs: ['premium'], shards: 0, ash: 100, desc: '1 booster premium et 100 cendres' },
};
export const CHEST_ORDER = ['bois', 'fer', 'or', 'abyssal'];
// Étages où le coffre de fin s'améliore (bois, fer, or, abyssal)
export const CHEST_FLOORS = [3, 8, 16, 25];
export const chestForDepth = (floor) => (floor >= 25 ? 'abyssal' : floor >= 16 ? 'or' : floor >= 8 ? 'fer' : floor >= 3 ? 'bois' : null);
export const shiftChest = (c, n) => { const i = c ? CHEST_ORDER.indexOf(c) + n : n - 1; return i < 0 ? null : CHEST_ORDER[Math.min(CHEST_ORDER.length - 1, i)]; };

// Force des créatures corrompues selon la profondeur
// Force des ennemis : +6 % par étage jusqu'au 20e, puis +3 % (la progression du joueur plafonne au niveau 10)
// Niveau de créature attendu pour un joueur qui arrive à cet étage (calibré par simulation, mode Créateur)
// Plancher de difficulté (v236) : l'étage « équivalent » au niveau moyen de l'équipe, moins une marge.
// Les combats ordinaires et les élites ne sont jamais plus faciles que cet étage : plus de combats sans enjeu.
export const FLOOR_MARGIN = 5;
export const floorFloor = (avgLevel) => Math.max(1, Math.round(avgLevel / 0.75 + 6 - FLOOR_MARGIN));
export const expectedLevel = (floor) => Math.max(1, Math.min(10, Math.round((floor - 6) * 0.75)));
export const enemyScale = (floor) => 1 + 0.06 * Math.min(19, floor - 1) + 0.03 * Math.max(0, floor - 20);

// Familles de comportement des créatures (page du Bestiaire)
export const FAMILIES = {
  brute:      { name: 'Brute', desc: 'Frappe fort, sans finesse.' },
  gardien:    { name: 'Gardien', desc: 'Protège ses alliés : il faut l’abattre en premier.' },
  lanceur:    { name: 'Lanceur de sorts', desc: 'Ses attaques touchent aussi ses voisins.' },
  venimeux:   { name: 'Venimeux', desc: 'Empoisonne ses proies.' },
  guerisseur: { name: 'Guérisseur', desc: 'Soigne ses alliés blessés : abats-le vite.' },
  enrage:     { name: 'Enragé', desc: 'Frappe sans relâche.' },
  traqueur:   { name: 'Traqueur', desc: 'S’acharne sur la proie la plus faible.' },
  controleur: { name: 'Contrôleur', desc: 'Gèle ses adversaires.' },
  essaim:     { name: 'Essaim', desc: 'Nombreux et fragiles.' },
};
export function familyOf(card) {
  const a = new Set((card.abilities || []).map((x) => x.key));
  if (/essaim|insecte/i.test(card.category)) return 'essaim';
  if (a.has('bless') || a.has('regen')) return 'guerisseur';
  if (a.has('guard') || a.has('armor') || a.has('aegis')) return 'gardien';
  if (a.has('venom')) return 'venimeux';
  if (a.has('drown') || a.has('fear')) return 'controleur';
  if (a.has('frenzy') || a.has('devour')) return 'enrage';
  if (a.has('curse') || a.has('cataclysm') || a.has('strike')) return 'lanceur';
  if (a.has('elusive') || a.has('first')) return 'traqueur';
  return 'brute';
}

// Étapes du Bestiaire de chasse
export const HUNT_STAGES = [
  { k: 1, name: 'Découverte', desc: 'Nom et illustration révélés.' },
  { k: 5, name: 'Étude', desc: 'Comportement connu.' },
  { k: 15, name: 'Maîtrise', desc: 'Tes créatures lui font +1 dégât, même sans posséder sa carte.' },
  { k: 40, name: 'Trophée', desc: 'Titre de chasseur et récompense.' },
];
export function huntStage(kills = 0) {
  let i = -1;
  HUNT_STAGES.forEach((s, j) => { if (kills >= s.k) i = j; });
  return i; // -1 : jamais vaincue
}

// Rareté maximale des ennemis selon la profondeur (les mythiques arrivent tard).
function enemyPool(catalog, floor) {
  const maxR = Math.min(3, 1 + Math.floor((floor - 1) / 4));
  return catalog.cards.filter((c) => RARITY_ORDER.indexOf(c.rarity) <= maxR);
}
function bossPool(catalog, floor) {
  const min = floor >= 20 ? 4 : 3;
  return catalog.cards.filter((c) => RARITY_ORDER.indexOf(c.rarity) >= min);
}

// Générateur déterministe à partir d'une chaîne (même donjon pour tout le monde le même jour).
export function rngOf(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
const pick = (rng, list) => list[Math.floor(rng() * list.length)];


// ——— Étages ———————————————————————————————————————————————————————
export const ROOMS = {
  fight:    { name: 'Combat',         desc: 'Des créatures barrent le passage. Victoire : un bonus au choix.' },
  elite:    { name: 'Élite',          desc: 'Plus dangereux : éclats doublés et 3 bonus au choix.' },
  altar:    { name: 'Autel ancien',   desc: 'Choisis une bénédiction pour toute l’expédition.' },
  rest:     { name: 'Source sacrée',  desc: 'Tes créatures récupèrent 30 % de leurs PV.' },
  treasure: { name: 'Trésor oublié',  desc: 'Une poignée d’éclats.' },
  boss:     { name: 'Gardien',        desc: 'Le gardien de l’étage. Première victoire contre lui : un coffre.' },
};

// Chaque étage se gagne au combat : combat simple ou élite (plus dur, mieux payé).
// Tous les 5 étages, un gardien. Le premier étage est un combat simple.
export function floorDoors(day, floor) {
  if (floor % DESCENT.bossEvery === 0) return ['boss'];
  return floor === 1 ? ['fight'] : ['fight', 'elite'];
}
// Après une victoire : un bonus au choix (2 propositions, 3 après une élite)
export const REWARD_ROOMS = ['rest', 'altar', 'treasure'];
export function floorRewards(day, floor, room, owned = []) {
  const rng = rngOf(`rewards:${day}:${floor}:${room}`); // v257 : propre à chaque porte (affiché dessus avant de choisir)
  const keys = REWARD_ROOMS.filter((k) => k !== 'altar' || Object.keys(BLESSINGS).some((b) => !owned.includes(b)));
  if (room === 'elite' || room === 'boss') return keys;
  const out = [];
  while (out.length < 2 && keys.length) out.push(keys.splice(Math.floor(rng() * keys.length), 1)[0]);
  return out;
}
// Niveau des créatures corrompues (il rend la défense active plus difficile)
export const enemyLevel = (floor, room) => Math.max(1, Math.round(1 + (floor - 1) * 0.55)) + (room === 'elite' ? 1 : room === 'boss' ? 2 : 0);

// Ennemis d'un étage : plus nombreux, plus rares et plus forts en profondeur.
export function floorEnemies(catalog, day, floor, room) {
  const rng = rngOf(`enemies:${day}:${floor}:${room}`);
  const pool = enemyPool(catalog, floor);
  const out = [];
  if (room === 'boss') out.push({ id: pick(rng, bossPool(catalog, floor)).id, boss: true });
  if (room === 'elite') out.push({ id: pick(rng, pool.filter((c) => c.rarity !== 'C')).id, elite: true });
  const n = room === 'boss' ? (floor >= 10 ? 2 : 1) : room === 'elite' ? 1 + (floor >= 6 ? 1 : 0) : 2 + (floor >= 3 ? 1 : 0) + (floor >= 9 ? 1 : 0);
  for (let i = 0; i < n; i++) out.push({ id: pick(rng, pool).id });
  return out;
}

// Événement de la semaine : une partie des créatures ordinaires viennent des deux factions à l'honneur
export function eventSwap(catalog, list, day, floor, factions) {
  const rng = rngOf(`event:${day}:${floor}`);
  const pool = enemyPool(catalog, floor).filter((c) => factions.includes(c.faction));
  if (!pool.length) return list;
  return list.map((e) => (e.boss || e.elite || rng() >= 0.4 ? e : { ...e, id: pick(rng, pool).id }));
}
// Traits (v257) : dès l'étage 3, certains ennemis ordinaires (et des élites dès l'étage 6) ont une mécanique propre
export const TRAITS = {
  explosif: { name: 'Explosif', desc: 'À sa mort, il explose et blesse toutes tes créatures au combat.' },
  voleur:   { name: 'Voleur d’action', desc: 'Tant qu’il est debout, il vole 1 PA à ta créature qui en a le plus, à chaque tour à partir du 3e.' },
  egide:    { name: 'Lien d’égide', desc: 'Il subit 35 % de dégâts en moins tant qu’un autre ennemi est au combat.' },
  enrage:   { name: 'Enragé', desc: 'Sous la moitié de ses PV, il entre en rage : +2 en attaque.' },
};
export function foeTraits(day, floor, room, n) {
  const rng = rngOf(`traits:${day}:${floor}:${room}`), keys = Object.keys(TRAITS), out = Array(n).fill(null);
  if (room === 'boss' || floor < 3) return out;
  const chance = room === 'elite' ? (floor >= 8 ? 0.4 : 0) : Math.min(0.5, 0.2 + floor * 0.02);
  for (let i = 0; i < n; i++) if (rng() < chance && out.filter(Boolean).length < (floor >= 15 ? 2 : 1)) out[i] = pick(rng, keys);
  return out;
}
// Ennemis nommés : de temps en temps, une créature corrompue porte un nom, plus coriace, avec un butin en plus
const NAMED_FIRST = ['Grak', 'Morvenn', 'Sylth', 'Ourgal', 'Vesk', 'Ithra', 'Bralm', 'Kesh', 'Noct', 'Thalm', 'Ruvh', 'Zoryn'];
const NAMED_EPI = ['le Rongé', 'la Maudite', 'l’Affamé', 'aux Mille Plaies', 'le Sans-Sommeil', 'la Veuve', 'le Parjure', 'l’Écorché', 'des Fosses', 'le Dernier', 'la Cendreuse', 'l’Oublié'];
export const NAMED_CHANCE = 0.15;
export function namedFoe(day, floor, room) {
  const rng = rngOf(`named:${day}:${floor}:${room}`);
  if (room === 'boss' || floor < 2 || rng() >= NAMED_CHANCE) return null;
  return `${pick(rng, NAMED_FIRST)} ${pick(rng, NAMED_EPI)}`;
}

export function blessingChoices(day, floor, owned = []) {
  const rng = rngOf(`altar:${day}:${floor}`);
  const keys = Object.keys(BLESSINGS).filter((k) => !owned.includes(k));
  const out = [];
  while (out.length < 3 && keys.length) out.push(keys.splice(Math.floor(rng() * keys.length), 1)[0]);
  return out;
}

// ——— Règle du jour ————————————————————————————————————————————————————
// Une règle différente chaque jour, la même pour tout le monde. {faction} est remplacé
// par une faction tirée le même jour.
export const DAILY_RULES = {
  furie:    { name: 'Furie · {faction}',   desc: 'Les créatures de la faction {faction} frappent 25 % plus fort.', faction: true },
  sommeil:  { name: 'Sommeil · {faction}', desc: 'Les créatures de la faction {faction} ont 25 % de PV en moins.', faction: true },
  sources:  { name: 'Sources bénies',      desc: 'Les sources sacrées soignent 60 % des PV au lieu de 30 %.' },
  ruee:     { name: 'Ruée vers les éclats', desc: 'Les éclats trouvés sont augmentés de 50 %.' },
  lune:     { name: 'Nuit du pouvoir', desc: 'La Ferveur commence l’expédition à 4 au lieu de 2.' },
  chasse:   { name: 'Chasse aux élites',   desc: 'Chaque élite vaincue rapporte un coffre et deux fois plus d’éclats.' },
  instable: { name: 'Abysse instable',     desc: 'Tout le monde frappe 25 % plus fort : tes créatures comme les corrompues.' },
};
const RULE_KEYS = Object.keys(DAILY_RULES);
const RULE_FACTIONS = ['infernal', 'abyssal', 'celeste', 'sauvage', 'necrotique', 'primordial', 'artificiel'];
export function dailyRule(day, factionNames = {}) {
  const rng = rngOf(`rule:${day}`);
  const key = RULE_KEYS[Math.floor(rng() * RULE_KEYS.length)];
  const faction = DAILY_RULES[key].faction ? RULE_FACTIONS[Math.floor(rng() * RULE_FACTIONS.length)] : null;
  const fname = faction ? (factionNames[faction] || faction) : '';
  const fill = (t) => t.replace('{faction}', fname);
  return { key, faction, name: fill(DAILY_RULES[key].name), desc: fill(DAILY_RULES[key].desc) };
}
