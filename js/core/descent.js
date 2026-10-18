// La Descente : expédition quotidienne dans l'Abysse avec une équipe de cartes.
// Données des étages : portes, créatures corrompues, coffres, bénédictions, règle du jour.
import { RARITY_ORDER } from '../config.js';
import { COMBAT_BLESSINGS } from './skills.js';

export const DESCENT = {
  torches: 3,            // (v406 : plus de limite par jour ; gardé pour les anciennes sauvegardes et le Mode Créateur)
  bossEvery: 5,
};
// v406 : la Descente devient la campagne du jeu, en chapitres de 5 étages (4 étages puis un gardien). Les PV se gardent
// d'un étage à l'autre dans un chapitre ; si l'équipe tombe, on recommence le chapitre, jamais depuis l'étage 1.
export const CHAPTER = DESCENT.bossEvery;
export const CHAPTERS = 20;
export const chapterOf = (floor) => Math.max(1, Math.ceil(floor / CHAPTER));
export const chapterStart = (ch) => (ch - 1) * CHAPTER + 1;
// Récompense de la première victoire à chaque étage (rien de plus en rejouant, hors petits gains des combats) :
// éclats et cendres qui grandissent avec la profondeur, un coffre au 3e étage de chaque chapitre (bois, puis fer dès
// l'étage 30), et pour chaque gardien un coffre d'or (étages 5, 15, 25…) ou abyssal (étages 10, 20, 30…).
export function floorFirstReward(floor) {
  if (floor % CHAPTER === 0) return { chests: { [(floor / CHAPTER) % 2 ? 'or' : 'abyssal']: 1 } };
  /* v420 : remesuré sur 30 jours (moteur réel) : la v406 rapportait trois fois moins que l'ancien système ; relevé */
  const r = { shards: 20 + floor * 3, ash: 6 + Math.round(floor / 3) };
  if (floor % CHAPTER === 3) r.chests = { [floor >= 50 ? 'or' : floor >= 15 ? 'fer' : 'bois']: 1 };
  return r;
}

// Bénédictions de l'autel (pour toute l'expédition)
export const BLESSINGS = {
  blades: { name: 'Lames affûtées', desc: '+1 en attaque pour toutes tes créatures.' },
  vigor:  { name: 'Vigueur', desc: '+20 % de PV maximum et soin complet.' },
  ward:   { name: 'Bouclier béni', desc: 'Chaque créature commence chaque combat avec un bouclier.' },
  greed:  { name: 'Avidité', desc: '+30 % d’éclats pour le reste du chapitre.' },
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
// v345 : force d'une carte, comme la compte le moteur (rareté × niveau : duelUnit, RARITY_MULT), et force d'équipe
// conseillée pour un étage. Mesurée au simulateur (expéditions complètes, 16 équipes par rareté et par niveau) :
// l'étage moyen atteint suit à peu près 6 + 22 × (force − 1). Le niveau seul trompait : des Rares au niveau 4 valent
// des Communes au niveau 9.
export const RARITY_POWER = { C: 1, PC: 1.15, R: 1.3, HR: 1.45, M: 1.6, S: 1.75 };
export const cardPower = (rarity, level = 1) => (RARITY_POWER[rarity] || 1) * (1 + 0.08 * (level - 1));
export const powerFor = (floor) => 1 + Math.max(0, floor - 6) / 22;
export const powerPts = (p) => Math.round(p * 100);
export const enemyScale = (floor) => 1 + 0.06 * Math.min(19, floor - 1) + 0.03 * Math.max(0, floor - 20);
// v460 : derniers chapitres adoucis (décision du propriétaire : l'étage 100 en ≈ 2 mois pour un joueur régulier).
// Les ennemis qui ne sont pas des gardiens perdent une part de leurs PV et de leur attaque, de 0 à l'étage `from`
// jusqu'à `at100` à l'étage 100 (mesuré au simulateur : avant, des murs aux étages 91-98 avec une équipe au maximum).
export const LATE_SOFT = { from: 30, at100: 0.25 };
export const lateSoft = (floor) => 1 - LATE_SOFT.at100 * Math.min(1, Math.max(0, floor - LATE_SOFT.from) / (100 - LATE_SOFT.from));

// v326 : les anciennes familles du Bestiaire (Brute, Lanceur, Essaim…) ont été retirées : le Bestiaire affiche
// désormais les familles réellement utilisées en combat (AI_FAMILIES et aiFamily, js/core/skills.js).

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
  elite:    { name: 'Élite',          desc: 'Plus dangereux : éclats doublés, 3 bonus au choix et un talent pour une de tes créatures.' },
  altar:    { name: 'Autel ancien',   desc: 'Choisis une bénédiction pour tout le chapitre.' },
  rest:     { name: 'Source sacrée',  desc: 'Tes créatures récupèrent 30 % de leurs PV.' },
  treasure: { name: 'Trésor oublié',  desc: 'Une poignée d’éclats.' },
  boss:     { name: 'Gardien',        desc: 'Le gardien du chapitre. Première victoire : un coffre d’or ou abyssal, et le chapitre suivant s’ouvre.' },
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
  egide:    { name: 'Lien protecteur', desc: 'Il subit 35 % de dégâts en moins tant qu’un autre ennemi est au combat.' },
  enrage:   { name: 'Enragé', desc: 'Sous la moitié de ses PV, il entre en rage : +2 en attaque.' },
  // v331 : traits des profondeurs, seulement au-delà de l'étage 30
  vampire:  { name: 'Vampire', desc: 'Il se soigne de la moitié des dégâts qu’il inflige.', deep: true },
  epineux:  { name: 'Épineux', desc: 'Chaque coup qui le blesse renvoie 2 dégâts à ta créature qui frappe.', deep: true },
  carapace: { name: 'Cuirasse', desc: 'Un bouclier bloque le premier coup qu’il reçoit, et revient un tour sur deux.', deep: true },
};
export const DEEP_FROM = 31;
export const traitIcon = (k) => TRAITS[k]?.icon || k;
export function foeTraits(day, floor, room, n) {
  const deep = floor >= DEEP_FROM;
  const rng = rngOf(`traits:${day}:${floor}:${room}`), keys = Object.keys(TRAITS).filter((k) => deep || !TRAITS[k].deep), out = Array(n).fill(null);
  if (room === 'boss' || floor < 3) return out;
  const chance = deep ? (room === 'elite' ? 0.55 : 0.6) : room === 'elite' ? (floor >= 8 ? 0.4 : 0) : Math.min(0.5, 0.2 + floor * 0.02);
  const max = deep ? 3 : floor >= 15 ? 2 : 1;
  for (let i = 0; i < n; i++) if (rng() < chance && out.filter(Boolean).length < max) out[i] = pick(rng, keys);
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
  furie:    { name: 'Rage · {faction}',   desc: 'Les créatures de la faction {faction} frappent 25 % plus fort.', faction: true },
  sommeil:  { name: 'Sommeil · {faction}', desc: 'Les créatures de la faction {faction} ont 25 % de PV en moins.', faction: true },
  sources:  { name: 'Sources bénies',      desc: 'Dans la Descente, les sources sacrées soignent 60 % des PV au lieu de 30 %.' },
  ruee:     { name: 'Ruée vers les éclats', desc: 'Les éclats trouvés dans la Descente sont augmentés de 50 %.' },
  lune:     { name: 'Nuit du pouvoir', desc: 'La Ferveur commence chaque chapitre et chaque Épreuve à 4 au lieu de 2.' },
  chasse:   { name: 'Chasse aux élites',   desc: 'Dans la Descente, chaque élite vaincue rapporte deux fois plus d’éclats.' },
  instable: { name: 'Abysse instable',     desc: 'Tout le monde frappe 25 % plus fort : tes créatures comme les corrompues.' },
  // v334 : règles qui changent la façon de jouer (tirées à partir du 17 octobre 2026)
  nuee:     { name: 'Nuée explosive',      desc: 'Toutes les créatures corrompues ordinaires explosent en mourant. En échange, +25 % d’éclats.', v2: true },
  disette:  { name: 'Disette',             desc: 'Dans la Descente, les sources sacrées ne soignent que 15 % des PV, mais les trésors rapportent deux fois plus.', v2: true },
  marque:   { name: 'Chasse à la Marque',  desc: 'Le coup qui consomme une Marque fait ×2 dégâts au lieu de ×1,5.', v2: true },
  reserve:  { name: 'Réserve de Ferveur',  desc: 'Chaque chapitre et chaque Épreuve commencent sans Ferveur, mais dans la Descente toute la Ferveur se garde d’un combat à l’autre (au lieu de 3).', v2: true },
};
export const RULES_V2_FROM = '2026-10-17';
const RULE_KEYS_V1 = Object.keys(DAILY_RULES).filter((k) => !DAILY_RULES[k].v2), RULE_KEYS_V2 = Object.keys(DAILY_RULES);
const RULE_FACTIONS = ['infernal', 'abyssal', 'celeste', 'sauvage', 'necrotique', 'primordial', 'artificiel'];
// v430 : règles du jour retirées à la demande du propriétaire (à partir du 18 octobre 2026) : règle neutre, sans effet ni affichage
export const RULES_OFF_FROM = '2026-10-18';
export function dailyRule(day, factionNames = {}) {
  if (String(day) >= RULES_OFF_FROM) return { key: 'none', faction: null, name: '', desc: '', off: true };
  const rng = rngOf(`rule:${day}`);
  const keys = String(day) >= RULES_V2_FROM ? RULE_KEYS_V2 : RULE_KEYS_V1; // les jours passés gardent leur règle
  const key = keys[Math.floor(rng() * keys.length)];
  const faction = DAILY_RULES[key].faction ? RULE_FACTIONS[Math.floor(rng() * RULE_FACTIONS.length)] : null;
  const fname = faction ? (factionNames[faction] || faction) : '';
  const fill = (t) => t.replace('{faction}', fname);
  return { key, faction, name: fill(DAILY_RULES[key].name), desc: fill(DAILY_RULES[key].desc) };
}

// ——— Présages de départ (v334) ————————————————————————————————————————
// Après le premier gardien vaincu, chaque expédition commence par un choix parmi trois présages, les mêmes pour
// tout le monde le même jour. Un présage dure toute l'expédition : un vrai avantage, et un vrai prix.
// Cinq d'entre eux reprennent les reliques que le moteur de combat connaît déjà (st.relics).
export const OMENS = {
  coeur:   { relic: 'coeur', name: 'Présage du Titan', icon: 'stat-hp', gain: 'Tes créatures ont 15 % de PV en plus en combat.', cost: 'Tes attaques ne donnent de la Ferveur qu’une fois sur deux.' },
  oeil:    { relic: 'oeil', name: 'Présage du Traître', icon: 'danger', gain: 'Les faiblesses de tous les ennemis sont révélées dès le début du combat.', cost: 'Tes créatures subissent 8 % de dégâts en plus.' },
  miroir:  { relic: 'miroir', name: 'Présage du Miroir', icon: 'showcase', gain: 'Une fois par combat, la première grosse attaque ennemie lui renvoie la moitié de ses dégâts.', cost: 'Tes créatures commencent chaque combat avec 1 PA de moins.' },
  sablier: { relic: 'sablier', name: 'Présage du Sablier', icon: 'hourglass', gain: 'Tes créatures commencent chaque combat avec 1 PA de plus.', cost: 'Tes créatures ont 5 % de PV en moins en combat.' },
  dent:    { relic: 'dent', name: 'Présage du Léviathan', icon: 'swords', gain: '+30 % de dégâts contre les élites et les gardiens.', cost: 'Chaque combat commence avec 1 Ferveur de moins.' },
  soif:    { name: 'Présage de la Soif', icon: 'heart', gain: 'Tes créatures récupèrent 10 % des dégâts qu’elles infligent.', cost: 'Les sources sacrées ne sont plus proposées.' },
  avare:   { name: 'Présage de l’Avare', icon: 'crystal', gain: '+50 % d’éclats pendant tout le chapitre.', cost: 'Les créatures corrompues frappent 10 % plus fort.' },
};
export function omenChoices(day) {
  const rng = rngOf(`omen:${day}`), keys = Object.keys(OMENS), out = [];
  while (out.length < 3) out.push(keys.splice(Math.floor(rng() * keys.length), 1)[0]);
  return out;
}
