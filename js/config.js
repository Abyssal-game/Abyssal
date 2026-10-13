// Configuration centrale du jeu : raretés, tables de tirage, boosters,
// économie, variantes, progression. Toute la balance se règle ici.

export const VERSION = 'v152'; // même numéro que sw.js : affiché dans Réglages > À propos

export const RARITIES = [
  { key: 'C',  name: 'Commune',     short: 'C',  color: '#A3ADBD' },
  { key: 'PC', name: 'Peu commune', short: 'PC', color: '#5FD08F' },
  { key: 'R',  name: 'Rare',        short: 'R',  color: '#5DAEFF' },
  { key: 'HR', name: 'Hyper rare',  short: 'HR', color: '#C266FF' },
  { key: 'M',  name: 'Mythique',    short: 'M',  color: '#F0C75E' },
  { key: 'S',  name: 'Secrète',     short: 'S',  color: '#FF5C8A' },
];
export const RARITY = Object.fromEntries(RARITIES.map((r, i) => [r.key, { ...r, index: i }]));
export const RARITY_ORDER = RARITIES.map((r) => r.key);

// Tables de rareté (poids en %). Chaque emplacement d'un booster utilise une table.
export const TABLES = {
// Volontairement avare : les grandes créatures se gagnent surtout dans la Descente (gardiens, coffres).
  base:   { label: 'Emplacement normal',       weights: { C: 74, PC: 20, R: 4.8, HR: 1, M: 0.17, S: 0.03 } },
  pcPlus: { label: 'Peu commune ou mieux',     weights: { PC: 82, R: 14, HR: 3.3, M: 0.6, S: 0.1 } },
  rPlus:  { label: 'Rare ou mieux',            weights: { R: 82, HR: 15, M: 2.6, S: 0.4 } },
  hrPlus: { label: 'Hyper rare ou mieux',      weights: { HR: 88, M: 10.5, S: 1.5 } },
  mPlus:  { label: 'Mythique ou mieux',        weights: { M: 90, S: 10 } },
  event:  { label: 'Emplacement événement',    weights: { C: 66, PC: 24, R: 7.5, HR: 2, M: 0.4, S: 0.1 } },
};

// Garanties réellement appliquées par boosters.js (comptées par booster ouvert).
export const PITY = {
  hr: 25, // au plus tard au 25e booster sans Hyper rare ou mieux, le dernier emplacement est HR ou mieux
  m: 100, // au plus tard au 100e booster sans Mythique ou mieux, le dernier emplacement est M ou mieux
};

export const BOOSTERS = {
  standard: {
    name: 'Booster standard', price: 200, slots: ['base', 'base', 'base', 'base', 'pcPlus'], pool: 'all', variantMult: 1,
    desc: '5 cartes de toutes les factions. Le 5e emplacement est au moins Peu commune.',
  },
  faction: {
    name: 'Booster de faction', price: 300, slots: ['base', 'base', 'base', 'base', 'pcPlus'], pool: 'faction', variantMult: 1,
    desc: '5 cartes d’une seule faction, au choix. Le 5e emplacement est au moins Peu commune.',
  },
  event: {
    name: 'Booster événement', price: 360, slots: ['event', 'event', 'event', 'event', 'pcPlus'], pool: 'event', variantMult: 1.5,
    desc: '5 cartes des deux factions de l’événement de la semaine, avec des chances accrues de Rare et mieux.',
  },
  premium: {
    rewardOnly: true, // ne s'achète pas : récompense des gardiens et des niveaux
    name: 'Booster premium', price: 750, slots: ['base', 'base', 'pcPlus', 'pcPlus', 'rPlus'], pool: 'all', variantMult: 2,
    desc: '5 cartes : deux emplacements Peu commune ou mieux, le dernier Rare ou mieux. Variantes deux fois plus fréquentes.',
  },
};

// Probabilité (%) qu'une carte tirée soit une variante cosmétique (multipliée par variantMult).
// Chance (en %) qu'une carte tirée sorte dans chaque variante. Volontairement rare :
// le Rituel d'élévation est l'autre moyen de les obtenir.
export const VARIANT_RATES = { holo: 4, gold: 0.6, galaxy: 0.2 };
// Anciennes variantes retirées : les exemplaires possédés deviennent la variante indiquée.
export const OLD_VARIANTS = { chroma: 'holo', corrupt: 'holo', alt: 'holo', ancestral: 'gold' };

// Rituel d'élévation : toujours réussi, payé en cendres (les doublons, qui font monter
// le niveau des créatures, ne sont jamais sacrifiés). Coût = base de la variante × rareté.
export const RITUAL = {
  ladder: ['normal', 'holo', 'gold', 'galaxy'],
  cost: { holo: 120, gold: 400, galaxy: 1200 },
  rarityMult: { C: 0.5, PC: 0.7, R: 1, HR: 1.4, M: 2, S: 2.5 },
  fervor: 10,         // ancienne ferveur (échecs passés) : -10 % du coût par échec, jusqu'à -50 %
};

export const VARIANTS = {
  normal:    { name: 'Normale',                  short: 'Normale' },
  holo:      { name: 'Holographique',            short: 'Holo' },
  gold:      { name: 'Feuille d’or',             short: 'Or' },
  galaxy:    { name: 'Cosmique',                 short: 'Cosmique' },
  special:   { name: 'Édition des Sceaux',       short: 'Édition' },
};

// Événements hebdomadaires : rotation chaque lundi (heure locale).
export const EVENTS = [
  { key: 'sceaux',  name: 'La Nuit des Sceaux brisés', factions: ['infernal', 'necrotique'], desc: 'Les portes de Dis et des cryptes s’ouvrent la même nuit.' },
  { key: 'maree',   name: 'La Marée noire',            factions: ['abyssal', 'primordial'],  desc: 'Les Fosses remontent, et avec elles ce qui dormait avant le temps.' },
  { key: 'chute',   name: 'L’Écho de la Chute',        factions: ['celeste', 'infernal'],    desc: 'Les anges et les déchus se souviennent ensemble de la grande guerre.' },
  { key: 'chasse',  name: 'La Grande Chasse',          factions: ['sauvage', 'necrotique'],  desc: 'Les bêtes courent, et les morts courent avec elles.' },
  { key: 'silence', name: 'Le Silence des profondeurs', factions: ['abyssal', 'artificiel'], desc: 'Des machines englouties se remettent en marche sous la mer.' },
  { key: 'aube',    name: 'L’Aube sauvage',            factions: ['celeste', 'sauvage'],     desc: 'Une lumière étrange se lève sur la Forêt Première.' },
];

export const ECONOMY = {
  start: { shards: 0, ash: 0, tickets: { standard: 2 } },
  discoveryShards: { C: 2, PC: 5, R: 12, HR: 25, M: 50, S: 100 },
  duplicateAsh: { C: 2, PC: 5, R: 15, HR: 40, M: 100, S: 250 },
  craftAsh: { C: 40, PC: 100, R: 250, HR: 600, M: 1600 }, // les secrètes ne s'invoquent pas
  decipherAsh: 15,
  revealNamesAt: 0.5, // les noms d'une faction se révèlent à 50 % de complétion
  daily: { base: 80, perStreakDay: 10, maxStreakBonus: 60 },
};

export const XP = {
  booster: 10,
  discovery: { C: 10, PC: 20, R: 40, HR: 80, M: 160, S: 300 },
  duplicate: 2,
  // XP nécessaire pour passer du niveau n au niveau n+1
  toNext: (n) => 150 + (n - 1) * 90,
  levelReward: (n) => (n % 5 === 0 ? { shards: 100, tickets: { premium: 1 } } : { shards: 60 }),
};

export const LEVEL_TITLES = [
  [1, 'Novice des Sceaux'], [3, 'Lecteur de grimoires'], [6, 'Chercheur de reliques'], [10, 'Occultiste'],
  [15, 'Archiviste interdit'], [20, 'Gardien du Bestiaire'], [30, 'Briseur de sceaux'], [40, 'Voix du Néant'],
];

export const FRAMES = {
  base: 'Cadre de fer', or: 'Cadre d’or', prisme: 'Cadre prismatique', titan: 'Cadre des Titans', neant: 'Cadre du Néant',
  infernal: 'Cadre infernal', abyssal: 'Cadre abyssal', celeste: 'Cadre céleste', sauvage: 'Cadre sauvage',
  necrotique: 'Cadre nécrotique', primordial: 'Cadre primordial', artificiel: 'Cadre artificiel',
  abysse: 'Cadre des Profondeurs', chasseur: 'Cadre du Chasseur',
  sceaux: 'Cadre des Sceaux', reliques: 'Cadre des Reliques', guerre: 'Cadre de la Guerre',
};

// Booster standard gratuit qui se recharge avec le temps (aucune obligation de revenir).
export const FREE_PACK = { everyHours: 8, max: 2 };

export const FACTION_ORDER = ['infernal', 'abyssal', 'celeste', 'sauvage', 'necrotique', 'primordial', 'artificiel'];

export const SAVE_KEY = 'abyssal.save';
export const SAVE_BACKUP_KEY = 'abyssal.save.backup';
export const SAVE_VERSION = 2;
export const EXPORT_PREFIX = 'ABYSSAL1:';

// Missions du jour : 3 tirées chaque jour parmi ces modèles (renouvelées à minuit).
// kind : ce qui fait avancer la mission ; n : objectif ; shards : récompense.
export const MISSIONS = [
  { key: 'open2',    kind: 'booster',  n: 2, shards: 50, text: 'Ouvre 2 boosters' },
  { key: 'open3',    kind: 'booster',  n: 3, shards: 70, text: 'Ouvre 3 boosters' },
  { key: 'new3',     kind: 'new',      n: 3, shards: 50, text: 'Découvre 3 nouvelles créatures' },
  { key: 'new5',     kind: 'new',      n: 5, shards: 70, text: 'Découvre 5 nouvelles créatures' },
  { key: 'faction',  kind: 'faction',  n: 3, shards: 50, text: 'Obtiens 3 cartes {faction}' },
  { key: 'rare',     kind: 'rare',     n: 2, shards: 60, text: 'Obtiens 2 cartes Rares ou mieux' },
  { key: 'variant',  kind: 'variant',  n: 1, shards: 60, text: 'Obtiens une variante (holographique, or…)' },
  { key: 'ritual',   kind: 'ritual',   n: 1, shards: 60, text: 'Accomplis un rituel d’élévation' },
  { key: 'depth4',   kind: 'depth',    n: 4, shards: 70, text: 'Atteins l’étage 4 de la Descente' },
  { key: 'wins',     kind: 'win',      n: 5, shards: 60, text: 'Remporte 5 combats dans la Descente' },
  { key: 'offering', kind: 'daily',    n: 1, shards: 30, text: 'Récupère l’offrande du jour' },
  { key: 'chest2',   kind: 'chest',    n: 2, shards: 50, text: 'Ouvre 2 coffres' },
];
export const MISSION_BONUS = { tickets: { standard: 1 }, chests: { fer: 1 } }; // les 3 missions du jour accomplies


// Points d'une ouverture, pour le classement des plus belles ouvertures.
export const LUCK_POINTS = { C: 1, PC: 2, R: 6, HR: 20, M: 80, S: 200, variant: 8 };

// Boutique d'objets (payés en éclats). limit : achats maximum par jour.
export const ITEMS = {
  torche:    { name: 'Torche bénie',           price: 220, icon: 'flame',   desc: 'Rallume une torche déjà utilisée : une expédition de plus aujourd’hui.', limit: 2 },
  encens:    { name: 'Encens de ferveur',      price: 150, icon: 'sparkle', desc: 'Ton prochain rituel d’élévation coûte 15 % de cendres en moins.', hidden: true },
  // Coffre : rejoint tes coffres (2 boosters à l'intérieur)
  coffreFer: { name: 'Coffre de fer',  price: 180, icon: 'lock', desc: 'Un coffre qui contient 2 boosters standard.', limit: 2, chests: { fer: 1 } },
};
