// L'Arsenal : armes, armures, reliques et sorts des héros, coffres et clés, forge.
// Données pures et tirages ; l'état (inventaire, équipement) est géré par Game.

export const SLOTS = {
  arme:    { name: 'Arme',    plural: 'Armes' },
  armure:  { name: 'Armure',  plural: 'Armures' },
  relique: { name: 'Relique', plural: 'Reliques' },
  sort:    { name: 'Sort',    plural: 'Sorts' },
};
export const SLOT_ORDER = ['arme', 'armure', 'relique', 'sort'];

// Raretés de l'équipement (distinctes de celles des cartes).
// mult : puissance des statistiques ; forge : rang de forge maximum ; spell : puissance d'un sort.
export const GEAR_RARITY = {
  C: { name: 'Commun',     color: '#B8BEC9', mult: 1,   forge: 3,  spell: 1,    fer: 1 },
  R: { name: 'Rare',       color: '#4FA3FF', mult: 1.35, forge: 5,  spell: 1.15, fer: 3 },
  E: { name: 'Épique',     color: '#B36BFF', mult: 1.75, forge: 7,  spell: 1.3,  fer: 8 },
  L: { name: 'Légendaire', color: '#FFB547', mult: 2.2, forge: 10, spell: 1.5,  fer: 20 },
};
export const GEAR_ORDER = ['C', 'R', 'E', 'L'];

// Poids d'armure par héros
const WEIGHT = { brenna: 'lourde', aldric: 'lourde', sylea: 'legere', morgane: 'etoffe', kael: 'legere', thalia: 'legere', lucien: 'legere', ossian: 'etoffe' };
const HEAVY = ['brenna', 'aldric'], LIGHT = ['sylea', 'kael', 'thalia', 'lucien'], CLOTH = ['morgane', 'ossian'];

// Modèles d'objets. for : héros qui peuvent l'utiliser (absent = tous).
// stats à la rareté Commune (la vitesse ne grandit pas avec la rareté).
// leg : légendaire unique (seulement en rareté Légendaire), fx : son effet propre.
export const BASES = {
  // Armes
  hache:    { slot: 'arme', name: 'Hache de guerre',    type: 'axe',    for: ['brenna'],  stats: { atk: 3 } },
  marteau:  { slot: 'arme', name: 'Marteau runique',    type: 'hammer', for: ['brenna'],  stats: { atk: 2, def: 1, hp: 6 } },
  epee:     { slot: 'arme', name: 'Épée bâtarde',       type: 'sword',  for: ['aldric'], stats: { atk: 2, mag: 1, hp: 4 } },
  masse:    { slot: 'arme', name: 'Masse bénie',        type: 'mace',   for: ['aldric'], stats: { atk: 1, mag: 2, def: 1 } },
  arc:      { slot: 'arme', name: 'Arc long',           type: 'bow',    for: ['sylea'],  stats: { atk: 3 } },
  dagues:   { slot: 'arme', name: 'Dagues jumelles',    type: 'dagger', for: ['sylea'],  stats: { atk: 2, hp: 3 }, spd: 1 },
  baton:    { slot: 'arme', name: 'Bâton d’ébène',      type: 'staff',  for: ['morgane'], stats: { mag: 3 } },
  orbe:     { slot: 'arme', name: 'Orbe d’éclipse',     type: 'orb',    for: ['morgane'], stats: { mag: 2, hp: 4 }, spd: 1 },
  brisemont: { slot: 'arme', name: 'Brise-Montagne',    type: 'axe',    for: ['brenna'],  stats: { atk: 3.5 }, leg: true, fx: 'rage' },
  aube:     { slot: 'arme', name: 'Aube-Jurée',         type: 'sword',  for: ['aldric'], stats: { atk: 2, mag: 2 }, leg: true, fx: 'heal' },
  murmure:  { slot: 'arme', name: 'Murmure-Sylvestre',  type: 'bow',    for: ['sylea'],  stats: { atk: 3.5 }, leg: true, fx: 'volley' },
  eclipse:  { slot: 'arme', name: 'Cœur d’Éclipse',     type: 'orb',    for: ['morgane'], stats: { mag: 3.5 }, leg: true, fx: 'shatter' },
  kriss:    { slot: 'arme', name: 'Kriss d’ombre',      type: 'dagger', for: ['kael'],   stats: { atk: 3 } },
  griffes:  { slot: 'arme', name: 'Griffes de chat-noir', type: 'dagger', for: ['kael'],  stats: { atk: 2, hp: 3 }, spd: 1 },
  chene:    { slot: 'arme', name: 'Bâton de chêne',     type: 'staff',  for: ['thalia'], stats: { atk: 1, mag: 2, hp: 4 } },
  serpe:    { slot: 'arme', name: 'Serpe de gui',       type: 'dagger', for: ['thalia'], stats: { atk: 2, mag: 1 } },
  luth:     { slot: 'arme', name: 'Luth enchanté',      type: 'lute',   for: ['lucien'], stats: { mag: 3 } },
  rapiere:  { slot: 'arme', name: 'Rapière de duel',    type: 'sword',  for: ['lucien'], stats: { atk: 2, mag: 1 }, spd: 1 },
  faux:     { slot: 'arme', name: 'Faux d’os',          type: 'scythe', for: ['ossian'], stats: { mag: 3 } },
  crane:    { slot: 'arme', name: 'Crâne-reliquaire',   type: 'skull',  for: ['ossian'], stats: { mag: 2, hp: 5 } },
  crepuscule: { slot: 'arme', name: 'Lame du Crépuscule', type: 'dagger', for: ['kael'], stats: { atk: 3.5 }, leg: true, fx: 'execute' },
  racine:   { slot: 'arme', name: 'Racine-Mère',        type: 'staff',  for: ['thalia'], stats: { atk: 1.5, mag: 2 }, leg: true, fx: 'bearStart' },
  lyre:     { slot: 'arme', name: 'Lyre d’Orphée',      type: 'lute',   for: ['lucien'], stats: { mag: 3.5 }, leg: true, fx: 'song' },
  sceptre:  { slot: 'arme', name: 'Sceptre des Morts',  type: 'skull',  for: ['ossian'], stats: { mag: 3.5 }, leg: true, fx: 'souls' },
  // Armures
  cuirasse: { slot: 'armure', name: 'Cuirasse de fer',     type: 'plate', for: HEAVY, stats: { hp: 12, def: 1 } },
  harnois:  { slot: 'armure', name: 'Harnois des Sceaux',  type: 'plate', for: HEAVY, stats: { hp: 8, def: 2 } },
  cuir:     { slot: 'armure', name: 'Cuir de traqueur',    type: 'leather', for: LIGHT, stats: { hp: 9, def: 1 }, spd: 1 },
  mailles:  { slot: 'armure', name: 'Mailles elfiques',    type: 'leather', for: LIGHT, stats: { hp: 12, def: 1 } },
  robe:     { slot: 'armure', name: 'Robe d’arcaniste',    type: 'robe', for: CLOTH, stats: { hp: 8, mag: 1 } },
  manteau:  { slot: 'armure', name: 'Manteau d’ombre',     type: 'robe', for: CLOTH, stats: { hp: 9, def: 1 } },
  egide:    { slot: 'armure', name: 'Égide des Anciens',   type: 'plate', for: HEAVY, stats: { hp: 12, def: 2 }, leg: true, fx: 'ward' },
  voile:    { slot: 'armure', name: 'Voile de Nuit',       type: 'leather', for: LIGHT, stats: { hp: 10, def: 1 }, leg: true, fx: 'dodge' },
  astres:   { slot: 'armure', name: 'Manteau des Astres',  type: 'robe', for: CLOTH, stats: { hp: 9, mag: 1 }, leg: true, fx: 'energy' },
  venin:    { slot: 'sort', name: 'Lame empoisonnée',  type: 'tome', for: ['kael'],   spell: 'venin' },
  eventail: { slot: 'sort', name: 'Éventail de lames', type: 'tome', for: ['kael'],   spell: 'eventail' },
  ronces:   { slot: 'sort', name: 'Ronces',            type: 'tome', for: ['thalia'], spell: 'ronces' },
  renouveau: { slot: 'sort', name: 'Renouveau',        type: 'tome', for: ['thalia'], spell: 'renouveau' },
  berceuse: { slot: 'sort', name: 'Berceuse',          type: 'tome', for: ['lucien'], spell: 'berceuse' },
  ballade:  { slot: 'sort', name: 'Ballade héroïque',  type: 'tome', for: ['lucien'], spell: 'ballade' },
  malediction: { slot: 'sort', name: 'Malédiction',    type: 'tome', for: ['ossian'], spell: 'malediction' },
  pacte:    { slot: 'sort', name: 'Pacte de sang',     type: 'tome', for: ['ossian'], spell: 'pacte' },
  // Reliques (tous les héros)
  talisman: { slot: 'relique', name: 'Talisman d’os',     type: 'talisman', stats: { hp: 10 } },
  anneau:   { slot: 'relique', name: 'Anneau de sang',    type: 'ring', stats: { atk: 1, mag: 1 } },
  amulette: { slot: 'relique', name: 'Amulette de garde', type: 'amulet', stats: { def: 1, hp: 4 } },
  plume:    { slot: 'relique', name: 'Plume de corbeau',  type: 'feather', stats: { hp: 3 }, spd: 1 },
  phenix:   { slot: 'relique', name: 'Plume du Phénix',   type: 'feather', stats: { hp: 8 }, leg: true, fx: 'gauge' },
  oeil:     { slot: 'relique', name: 'Œil de l’Abysse',   type: 'eye', stats: { atk: 1, mag: 1 }, leg: true, fx: 'vamp' },
  // Sorts : chaque sort ajoute une compétence au héros (sa rareté renforce le sort).
  seisme:   { slot: 'sort', name: 'Séisme',           type: 'tome', for: ['brenna'],  spell: 'seisme' },
  rempart:  { slot: 'sort', name: 'Rempart runique',  type: 'tome', for: ['brenna'],  spell: 'rempart' },
  jugement: { slot: 'sort', name: 'Jugement',         type: 'tome', for: ['aldric'], spell: 'jugement' },
  priere:   { slot: 'sort', name: 'Prière des Veilleurs', type: 'tome', for: ['aldric'], spell: 'priere' },
  gorge:    { slot: 'sort', name: 'Tir à la gorge',   type: 'tome', for: ['sylea'],  spell: 'gorge' },
  percant:  { slot: 'sort', name: 'Tir perçant',      type: 'tome', for: ['sylea'],  spell: 'percant' },
  meteore:  { slot: 'sort', name: 'Pluie de météores', type: 'tome', for: ['morgane'], spell: 'meteore' },
  blizzard: { slot: 'sort', name: 'Blizzard',         type: 'tome', for: ['morgane'], spell: 'blizzard' },
};

// Effets des légendaires uniques
export const EFFECTS = {
  rage:    'Commence chaque combat avec 50 de rage.',
  heal:    'Les soins d’Aldric sont 30 % plus puissants.',
  volley:  'Volée de flèches frappe les cibles marquées à ×2,4 (au lieu de ×1,7).',
  shatter: 'Les Brisures triplent les dégâts (au lieu de les doubler).',
  ward:    'Un bouclier annule le premier coup reçu à chaque combat.',
  dodge:   '15 % de chances d’esquiver une attaque.',
  energy:  'Commence chaque combat avec toute son énergie.',
  gauge:   'Chaque action remplit la jauge d’invocation de 4 points de plus.',
  vamp:    'Vol de vie : se soigne de 15 % des dégâts infligés.',
  execute: 'Exécution frappe à ×3,5 (au lieu de ×2,6) les cibles affaiblies.',
  bearStart: 'Commence chaque combat en forme d’ours.',
  song:    'Les chants durent 3 tours au lieu de 2.',
  souls:   'Commence chaque combat avec 3 âmes.',
};
// Propriétés bonus (une sur les épiques, une en plus de l'effet sur les légendaires)
export const AFFIXES = {
  vamp:   { name: 'Vampirique', desc: 'Vol de vie de 8 %.' },
  elan:   { name: 'Élan',       desc: '+1 énergie au début de chaque combat.' },
  lien:   { name: 'Lien',       desc: 'Chaque action remplit la jauge d’invocation de 2 points de plus.' },
  esquive: { name: 'Esquive',   desc: '10 % de chances d’esquiver une attaque.' },
};
export const AFFIX_KEYS = Object.keys(AFFIXES);

export const canUse = (baseKey, hero) => { const b = BASES[baseKey]; return !!b && (!b.for || b.for.includes(hero)); };
export const weightOf = (hero) => WEIGHT[hero];

// Statistiques d'un objet (rareté et rang de forge compris)
export function itemStats(it) {
  const b = BASES[it.b], R = GEAR_RARITY[it.r];
  const k = R.mult * (1 + 0.08 * (it.f || 0));
  const out = {};
  for (const [s, v] of Object.entries(b.stats || {})) out[s] = Math.max(1, Math.round(v * k));
  if (b.spd) out.spd = b.spd;
  return out;
}
export const spellPower = (it) => GEAR_RARITY[it.r].spell * (1 + 0.04 * (it.f || 0));
// Puissance indicative d'un objet (pour trier et comparer)
export function itemScore(it) {
  const s = itemStats(it);
  const b = BASES[it.b];
  return Math.round((s.hp || 0) * 0.5 + (s.atk || 0) * 2 + (s.mag || 0) * 2 + (s.def || 0) * 2 + (s.spd || 0) * 4
    + (b.spell ? 12 * spellPower(it) : 0) + (b.fx ? 8 : 0) + (it.a ? 4 : 0));
}

// Bonus total de l'équipement d'un héros : statistiques, effets, sort.
export function gearBonus(items) {
  const out = { stats: { hp: 0, atk: 0, mag: 0, def: 0, spd: 0 }, fx: {}, spell: null };
  for (const it of items) {
    if (!it || !BASES[it.b]) continue;
    const b = BASES[it.b];
    for (const [s, v] of Object.entries(itemStats(it))) out.stats[s] += v;
    if (b.fx) out.fx[b.fx] = true;
    if (it.a) out.fx['a_' + it.a] = (out.fx['a_' + it.a] || 0) + 1;
    if (b.spell) out.spell = { key: b.spell, pow: spellPower(it) };
  }
  return out;
}

// Rang de forge : coût en fer runique et en éclats
export const forgeCost = (it) => ({ fer: (it.f + 1) * { C: 2, R: 3, E: 5, L: 8 }[it.r], shards: 20 * (it.f + 1) });
// Démantèlement : fer runique rendu (rareté + moitié du fer investi en forge)
export function salvageValue(it) {
  let fer = GEAR_RARITY[it.r].fer;
  for (let f = 0; f < (it.f || 0); f++) fer += Math.floor(((f + 1) * { C: 2, R: 3, E: 5, L: 8 }[it.r]) / 2);
  return fer;
}

// ——— Coffres et clés ——————————————————————————————————————————————————
export const CHESTS = {
  bois:    { name: 'Coffre de bois',  color: '#B07A45', items: 1, odds: { C: 76, R: 21, E: 3, L: 0 }, desc: 'Un objet, souvent commun.' },
  fer:     { name: 'Coffre de fer',   color: '#A9B6C9', items: 2, odds: { C: 44, R: 40, E: 13.5, L: 2.5 }, desc: 'Deux objets, rare ou mieux fréquent.' },
  or:      { name: 'Coffre d’or',     color: '#F2C14E', items: 3, choice: true, key: 'or', odds: { C: 0, R: 52, E: 38, L: 10 }, desc: 'Trois objets rares ou mieux : tu en gardes un.' },
  abyssal: { name: 'Coffre abyssal',  color: '#B04BFF', items: 3, choice: true, key: 'abyssal', odds: { C: 0, R: 0, E: 70, L: 30 }, desc: 'Trois objets épiques ou légendaires : tu en gardes un.' },
};
export const CHEST_ORDER = ['bois', 'fer', 'or', 'abyssal'];
export const KEYS = {
  or:      { name: 'Clé d’or',     color: '#F2C14E', desc: 'Ouvre un coffre d’or.' },
  abyssal: { name: 'Clé abyssale', color: '#B04BFF', desc: 'Ouvre un coffre abyssal.' },
};
// Garantie : un légendaire au plus tard tous les 20 coffres (hors bois)
export const LEG_PITY = 20;

function rollRarity(rng, odds) {
  const tot = GEAR_ORDER.reduce((a, r) => a + odds[r], 0);
  let x = rng() * tot;
  for (const r of GEAR_ORDER) { x -= odds[r]; if (x < 0) return r; }
  return GEAR_ORDER.filter((r) => odds[r] > 0).pop();
}

// Tirage d'un modèle « intelligent » : utilisable par tes héros, plus souvent pour ceux
// de ton équipe et pour les emplacements vides ou faibles.
// ctx : { heroes: [clés possédées], party: [clés], eqScore: (hero, slot) => score équipé, avoidSlots }
export function pickBase(rng, rarity, ctx) {
  const pool = Object.entries(BASES).filter(([, b]) => (rarity === 'L' ? b.leg || b.spell : !b.leg));
  const weighted = [];
  for (const [k, b] of pool) {
    let w = 0;
    for (const h of ctx.heroes) {
      if (!canUse(k, h)) continue;
      const cur = ctx.eqScore ? ctx.eqScore(h, b.slot) : 0;
      w += (ctx.party.includes(h) ? 2 : 1) * (cur ? 1 : 2.2);
    }
    if (!w) continue;
    if (ctx.avoidSlots?.includes(b.slot)) w *= 0.25;
    if (b.slot === 'sort') w *= 0.6; // les sorts restent plus rares que l'équipement
    // les reliques servent à tous : on évite qu'elles écrasent le reste
    if (!b.for) w *= 0.55;
    weighted.push([k, w]);
  }
  const tot = weighted.reduce((a, [, w]) => a + w, 0);
  let x = rng() * tot;
  for (const [k, w] of weighted) { x -= w; if (x < 0) return k; }
  return weighted[weighted.length - 1][0];
}

export function makeItem(rng, rarity, ctx) {
  const b = pickBase(rng, rarity, ctx);
  const it = { b, r: rarity, f: 0, a: null };
  if ((rarity === 'E' || rarity === 'L') && !BASES[b].spell) it.a = AFFIX_KEYS[Math.floor(rng() * AFFIX_KEYS.length)];
  return it;
}

// Contenu d'un coffre. pity : coffres (hors bois) ouverts depuis le dernier légendaire.
export function rollChest(rng, type, ctx, pity = 0) {
  const c = CHESTS[type];
  const out = [];
  let gotL = false;
  for (let i = 0; i < c.items; i++) {
    let r = rollRarity(rng, c.odds);
    if (!gotL && type !== 'bois' && pity + 1 >= LEG_PITY && i === c.items - 1) r = 'L';
    // coffre de fer : au moins un objet rare
    if (type === 'fer' && i === c.items - 1 && out.every((x) => x.r === 'C') && r === 'C') r = 'R';
    if (r === 'L') gotL = true;
    out.push(makeItem(rng, r, { ...ctx, avoidSlots: c.choice ? out.map((x) => BASES[x.b].slot) : [] }));
  }
  return { items: out, gotL };
}
