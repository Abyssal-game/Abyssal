// Configuration centrale du jeu : raretés, tables de tirage, boosters,
// économie, variantes, progression. Toute la balance se règle ici.

export const VERSION = 'v327'; // même numéro que sw.js : affiché dans Réglages > À propos

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
    name: 'Booster standard', price: 400, slots: ['base', 'base', 'pcPlus'], pool: 'all', variantMult: 1,
    desc: '3 cartes de toutes les factions. La 3e est au moins Peu commune.',
  },
  faction: {
    name: 'Booster de faction', price: 500, slots: ['base', 'base', 'pcPlus'], pool: 'faction', variantMult: 1,
    desc: '3 cartes d’une seule faction, au choix. La 3e est au moins Peu commune.',
  },
  event: {
    name: 'Booster événement', price: 550, slots: ['event', 'event', 'pcPlus'], pool: 'event', variantMult: 1.5,
    desc: '3 cartes des deux factions de l’événement de la semaine, avec des chances accrues de Rare et mieux.',
  },
  premium: {
    rewardOnly: true, // ne s'achète pas : récompense des gardiens et des niveaux
    name: 'Booster premium', price: 750, slots: ['base', 'pcPlus', 'rPlus'], pool: 'all', variantMult: 2,
    desc: '3 cartes : la 2e Peu commune ou mieux, la 3e Rare ou mieux. Variantes deux fois plus fréquentes.',
  },
};

// Chance (en %) qu'une carte tirée sorte dans chaque finition (×2 dans un booster premium).
// v280 : plus fréquentes qu'avant (2,5 / 0,5 / 0,1) ; on peut aussi sublimer une carte avec des cendres (SUBLIME_ASH).
// Par booster standard de 3 cartes : ~12 % d'une holographique, ~3,6 % d'une or, ~1,2 % d'une cosmique.
export const VARIANT_RATES = { holo: 4, gold: 1.2, galaxy: 0.4 };
// Sublimer : obtenir la finition suivante d'une carte qu'on possède déjà dans la finition précédente.
// Coût = cendres de base de la rareté × ce facteur ; toujours plus que ce que la carte rapporte brûlée (burnFinish).
export const SUBLIME_ASH = { holo: 4, gold: 10, galaxy: 24 };
// Anciennes variantes retirées : les exemplaires possédés deviennent la variante indiquée.
export const OLD_VARIANTS = { chroma: 'holo', corrupt: 'holo', alt: 'holo', ancestral: 'gold', special: 'normal' };
// Ordre d'affichage par défaut : la finition la plus rare possédée
export const SHOW_ORDER = ['galaxy', 'gold', 'holo', 'normal'];

export const VARIANTS = {
  normal:    { name: 'Normale',                  short: 'Normale' },
  holo:      { name: 'Holographique',            short: 'Holo' },
  gold:      { name: 'Feuille d’or',             short: 'Or' },
  galaxy:    { name: 'Cosmique',                 short: 'Cosmique' },
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
  start: { shards: 0, ash: 60, tickets: { standard: 2 } }, // 60 cendres : de quoi monter tout de suite 2 ou 3 créatures
  discoveryShards: { C: 1, PC: 2, R: 3, HR: 7, M: 12, S: 25 },
  // Fournaise : cendres rendues par un exemplaire brûlé (rareté × finition)
  burnAsh: { C: 5, PC: 10, R: 25, HR: 60, M: 150, S: 375 },
  burnFinish: { normal: 1, holo: 3, gold: 8, galaxy: 20 },
  // Niveau des créatures : passer du niveau n à n+1 coûte levelAsh × n cendres (niveau 10 au plus)
  levelAsh: { C: 10, PC: 15, R: 25, HR: 40, M: 60, S: 80 },
  craftAsh: { C: 40, PC: 100, R: 250, HR: 600, M: 1600 }, // invocation retirée : sert seulement à rembourser les cartes retirées du jeu
  decipherAsh: 15,
  revealNamesAt: 0.5, // les noms d'une faction se révèlent à 50 % de complétion
  daily: { base: 50, perStreakDay: 5, maxStreakBonus: 30 },
};

export const XP = {
  booster: 10,
  discovery: { C: 10, PC: 20, R: 40, HR: 80, M: 160, S: 300 },
  duplicate: 2,
  // XP nécessaire pour passer du niveau n au niveau n+1
  toNext: (n) => 150 + (n - 1) * 90,
  levelReward: (n) => (n % 5 === 0 ? { shards: 50, tickets: { premium: 1 } } : { shards: 20 }),
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

// Booster standard gratuit du jour : un par jour, il ne s'accumule pas (reviens chaque jour).
export const FREE_PACK = { perDay: 1 };

export const FACTION_ORDER = ['infernal', 'abyssal', 'celeste', 'sauvage', 'necrotique', 'primordial', 'artificiel'];

export const SAVE_KEY = 'abyssal.save';
export const SAVE_BACKUP_KEY = 'abyssal.save.backup';
export const SAVE_VERSION = 2;
export const EXPORT_PREFIX = 'ABYSSAL1:';

// Missions du jour : 3 tirées chaque jour parmi ces modèles (renouvelées à minuit).
// kind : ce qui fait avancer la mission ; n : objectif ; shards : récompense.
export const MISSIONS = [
  { key: 'open2',    kind: 'booster',  n: 2, shards: 30, text: 'Ouvre 2 boosters' },
  { key: 'open3',    kind: 'booster',  n: 3, shards: 40, text: 'Ouvre 3 boosters' },
  { key: 'new3',     kind: 'new',      n: 3, shards: 30, text: 'Découvre 3 nouvelles créatures' },
  { key: 'new5',     kind: 'new',      n: 5, shards: 40, text: 'Découvre 5 nouvelles créatures' },
  { key: 'faction',  kind: 'faction',  n: 3, shards: 30, text: 'Obtiens 3 cartes {faction}' },
  { key: 'rare',     kind: 'rare',     n: 2, shards: 35, text: 'Obtiens 2 cartes Rares ou mieux' },
  { key: 'variant',  kind: 'variant',  n: 1, shards: 35, text: 'Obtiens une variante (holographique, or…)' },
  { key: 'burn',     kind: 'burn',     n: 3, shards: 30, text: 'Brûle 3 cartes dans la Fournaise' },
  { key: 'depth4',   kind: 'depth',    n: 4, shards: 40, text: 'Atteins l’étage 4 de la Descente' },
  { key: 'wins',     kind: 'win',      n: 5, shards: 35, text: 'Remporte 5 combats dans la Descente' },
  { key: 'chest2',   kind: 'chest',    n: 2, shards: 30, text: 'Ouvre 2 coffres' },
];
// (le bonus des 3 missions du jour a été retiré en v232, la mission « offrande du jour » en v234)


// Tirage des Ombres : un booster gratuit par jour tiré par le serveur (cartes non gagnées),
// classement de la semaine, coffres pour les 3 premiers s'il y a assez de participants.
export const SHADOW = { participation: 15, prizes: ['abyssal', 'or', 'fer'], minPlayers: 5 };

// Points d'une ouverture, pour le classement des plus belles ouvertures.
export const LUCK_POINTS = { C: 1, PC: 2, R: 6, HR: 20, M: 80, S: 200, variant: 8 };

// Boutique d'objets (payés en éclats). limit : achats maximum par jour.
export const ITEMS = {
  torche:    { name: 'Torche bénie',           price: 220, icon: 'flame',   desc: 'Rallume une torche déjà utilisée : une expédition de plus aujourd’hui.', limit: 2 },
};
