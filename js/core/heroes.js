// Héros jouables, invocations et ennemis (créatures du Bestiaire) : données et création des unités.
import { RARITY_ORDER } from '../config.js';
import { applyPact } from './pacts.js';

// ——— Progression ———————————————————————————————————————————————————————
export const MAX_LEVEL = 30;
export const xpToNext = (lvl) => 40 + 25 * (lvl - 1);
export function levelOf(xp = 0) {
  let lvl = 1, rest = xp;
  while (lvl < MAX_LEVEL && rest >= xpToNext(lvl)) { rest -= xpToNext(lvl); lvl++; }
  return { level: lvl, into: rest, need: lvl >= MAX_LEVEL ? 0 : xpToNext(lvl) };
}
export const totalXpFor = (lvl) => { let t = 0; for (let l = 1; l < lvl; l++) t += xpToNext(l); return t; };
const growth = (lvl) => 1 + 0.09 * (lvl - 1);
const egrowth = (lvl) => 1 + 0.15 * (lvl - 1) + 0.002 * (lvl - 1) ** 2; // les ennemis montent plus vite : il faut faire progresser ses héros

// ——— Héros ————————————————————————————————————————————————————————————
// res : ressource propre à la classe (affichée sous le portrait).
export const HEROES = {
  brenna: {
    name: 'Brenna Forge-Rune', cls: 'Guerrière', race: 'Naine', role: 'Encaisse et frappe fort', color: '#E07A3A', icon: 'axe',
    base: { hp: 96, atk: 12, mag: 3, def: 6, spd: 5 }, res: 'rage',
    passive: 'Rage : chaque coup donné (+12) ou reçu (+18) remplit sa rage, que Fendoir libère.',
    skills: ['fendoir', 'defi'],
    lore: 'Dernière gardienne de la Forge des Runes. Elle n’a jamais reculé, pas même devant le Néant.',
  },
  aldric: {
    name: 'Aldric de Vaux', cls: 'Paladin', race: 'Humain', role: 'Protège et soigne', color: '#E8C35A', icon: 'shield',
    base: { hp: 104, atk: 9, mag: 8, def: 8, spd: 4 }, res: 'ferveur',
    passive: 'Ferveur : les coups qu’il encaisse en protégeant un allié remplissent sa ferveur, qui renforce ses soins.',
    skills: ['egide', 'lumiere'],
    lore: 'Chevalier d’un ordre éteint, il garde encore le serment de protéger ceux qui marchent derrière lui.',
  },
  sylea: {
    name: 'Syléa Feuille-d’Ombre', cls: 'Rôdeuse', race: 'Elfe', role: 'Marque et achève', color: '#5FC98A', icon: 'bow',
    base: { hp: 72, atk: 13, mag: 5, def: 3, spd: 8 }, res: null,
    passive: 'Chasseuse : attaquer une cible marquée lui rend 1 énergie.',
    skills: ['marque', 'volee'],
    lore: 'Elle a suivi la piste d’une bête jusqu’au bord de l’Abysse, et n’a jamais voulu faire demi-tour.',
  },
  morgane: {
    name: 'Morgane l’Éclipsée', cls: 'Mage', race: 'Humaine', role: 'Dégâts magiques et interruption', color: '#9C7BFF', icon: 'flame',
    base: { hp: 64, atk: 5, mag: 15, def: 2, spd: 6 }, res: null,
    passive: 'Éléments : le feu sur une cible gelée, ou le givre sur une cible en feu, provoque une Brisure (dégâts doublés).',
    skills: ['feu', 'givre'],
    lore: 'Née pendant une éclipse, elle entend le feu et la glace se disputer dans ses veines.',
  },
  kael: {
    name: 'Kaël Lame-Cendre', cls: 'Assassin', race: 'Humain', role: 'Se cache et exécute', color: '#E0533A', icon: 'swords',
    base: { hp: 68, atk: 12, mag: 3, def: 3, spd: 8 }, res: null, unlock: 3,
    passive: 'Coup dans le dos : +35 % de dégâts contre les ennemis sous la moitié de leurs PV.',
    skills: ['ombre', 'execution'],
    lore: 'On dit qu’il a appris son métier dans les cendres d’une ville que personne n’a revue. Il ne dément pas.',
  },
  thalia: {
    name: 'Thalia Cœur-de-Chêne', cls: 'Druidesse', race: 'Demi-sylvestre', role: 'Change de forme et soigne', color: '#7CC24A', icon: 'heart',
    base: { hp: 90, atk: 10, mag: 10, def: 5, spd: 5 }, res: null, unlock: 6,
    passive: 'Forme d’ours : défense ×1,5 et dégâts +30 % tant que dure la transformation.',
    skills: ['ours', 'seve'],
    lore: 'La forêt sacrée l’a vue naître d’un gland tombé un soir d’orage. Elle se bat pour que la forêt survive à l’Abysse.',
  },
  lucien: {
    name: 'Lucien Chante-Brume', cls: 'Barde', race: 'Demi-elfe', role: 'Renforce l’équipe, affaiblit l’ennemi', color: '#C8649B', icon: 'sparkle',
    base: { hp: 74, atk: 7, mag: 11, def: 3, spd: 7 }, res: null, unlock: 9,
    passive: 'Inspiration : chacun de ses chants remplit aussi la jauge d’invocation de 10 points.',
    skills: ['hymne', 'dissonance'],
    lore: 'Il prétend avoir chanté pour une reine des fées. La reine, elle, prétend ne pas s’en souvenir.',
  },
  ossian: {
    name: 'Ossian le Pâle', cls: 'Nécromancien', race: 'Humain', role: 'Moissonne les âmes', color: '#5FD3A0', icon: 'skull',
    base: { hp: 66, atk: 4, mag: 14, def: 2, spd: 5 }, res: 'ames', unlock: 12,
    passive: 'Moisson : chaque ennemi vaincu lui donne une âme (5 au maximum), que Danse macabre libère.',
    skills: ['drain', 'macabre'],
    lore: 'Il parle aux morts depuis l’enfance. Les vivants, eux, ont cessé de lui répondre.',
  },
};
export const HERO_ORDER = ['brenna', 'aldric', 'sylea', 'morgane', 'kael', 'thalia', 'lucien', 'ossian'];
// Ressources affichées sous le portrait en combat
export const RES_NAMES = { rage: 'Rage', ferveur: 'Ferveur', ames: 'Âmes' };

export const SKILLS = {
  fendoir: { name: 'Fendoir', cost: 1, target: 'enemy', desc: 'Frappe à 120 %, plus 1 % par point de rage (consomme la rage).' },
  defi:    { name: 'Cri de défi', cost: 1, target: 'self', desc: 'Attire les attaques 2 tours, défense ×1,5, +25 rage.' },
  egide:   { name: 'Égide', cost: 1, target: 'ally', desc: 'Protège un allié 2 tours : Aldric reçoit ses coups (à 70 %).' },
  lumiere: { name: 'Lumière sacrée', cost: 2, target: 'ally', desc: 'Soigne 25 % des PV, plus la ferveur accumulée.' },
  marque:  { name: 'Marque du chasseur', cost: 1, target: 'enemy', desc: 'Marque une cible 3 tours : elle subit +30 % de dégâts.' },
  volee:   { name: 'Volée de flèches', cost: 2, target: 'enemies', desc: 'Touche toute la ligne (×1,7 sur les cibles marquées).' },
  feu:     { name: 'Trait de feu', cost: 1, target: 'enemy', desc: 'Dégâts magiques ×1,5 et Brûlure 3 tours.' },
  givre:   { name: 'Lance de givre', cost: 1, target: 'enemy', desc: 'Dégâts ×1,1, Gel 2 tours et interrompt une attaque en préparation.' },
  ombre:    { name: 'Voile d’ombre', cost: 1, target: 'self', desc: 'Disparaît : ne peut plus être ciblé, et sa prochaine attaque fait double dégâts.' },
  execution: { name: 'Exécution', cost: 2, target: 'enemy', desc: 'Frappe à ×1,5 ; à ×2,6 si la cible a moins de 30 % de ses PV.' },
  ours:     { name: 'Forme d’ours', cost: 1, target: 'self', desc: 'Se transforme 3 tours : défense ×1,5, dégâts +30 %, attire les coups.' },
  seve:     { name: 'Sève de vie', cost: 1, target: 'ally', desc: 'Soigne 20 % des PV, puis régénère 6 % par tour pendant 3 tours.' },
  hymne:    { name: 'Hymne de bravoure', cost: 1, target: 'self', desc: 'Toute l’équipe inflige +25 % de dégâts pendant 2 tours.' },
  dissonance: { name: 'Dissonance', cost: 1, target: 'enemies', desc: 'Magie ×0,5 sur toute la ligne ; les ennemis frappent 25 % moins fort 2 tours.' },
  drain:    { name: 'Drain de vie', cost: 1, target: 'enemy', desc: 'Magie ×1,2 ; se soigne de la moitié des dégâts.' },
  macabre:  { name: 'Danse macabre', cost: 2, target: 'enemies', desc: 'Les morts frappent toute la ligne : ×0,5, +25 % par âme (consomme les âmes).' },
  // Compétences des créatures (prototype v2) : une par rôle
  c_garde:   { name: 'Garde', cost: 1, target: 'self', desc: 'Protège l’allié le plus blessé 2 tours (reçoit ses coups à 70 %) et durcit sa défense.' },
  c_frappe:  { name: 'Coup puissant', cost: 1, target: 'enemy', desc: 'Frappe une cible à ×1,8.' },
  c_soin:    { name: 'Soin', cost: 1, target: 'ally', desc: 'Soigne un allié de 25 % de ses PV, plus la magie.' },
  c_venin:   { name: 'Venin', cost: 1, target: 'enemy', desc: 'Frappe à ×0,7 et empoisonne 3 tours (6 % des PV par tour).' },
  c_entrave: { name: 'Entrave', cost: 2, target: 'enemy', desc: 'Frappe à ×0,6, étourdit 1 tour et interrompt un gros coup en préparation.' },
  c_cri:     { name: 'Cri de ralliement', cost: 1, target: 'self', desc: 'L’équipe inflige +25 % de dégâts 2 tours ; +10 à la jauge.' },
  c_vague:   { name: 'Déferlante', cost: 2, target: 'enemies', desc: 'Frappe toute la ligne ennemie (magie ×0,8).' },
  // Sorts de l'Arsenal (ajoutés par l'emplacement « Sort »)
  seisme:   { name: 'Séisme', cost: 2, target: 'enemies', spell: true, desc: 'Frappe toute la ligne (×0,8) ; +10 rage par cible.' },
  rempart:  { name: 'Rempart runique', cost: 2, target: 'self', spell: true, desc: 'Chaque héros reçoit un bouclier qui annule le prochain coup.' },
  jugement: { name: 'Jugement', cost: 1, target: 'enemy', spell: true, desc: 'Dégâts sacrés (magie ×1,3) ; la cible est exposée 2 tours.' },
  priere:   { name: 'Prière des Veilleurs', cost: 2, target: 'self', spell: true, desc: 'Soigne toute l’équipe de 15 % des PV.' },
  gorge:    { name: 'Tir à la gorge', cost: 1, target: 'enemy', spell: true, desc: 'Dégâts ×0,8 ; interrompt une attaque en préparation.' },
  percant:  { name: 'Tir perçant', cost: 2, target: 'enemy', spell: true, desc: 'Dégâts ×2, ignore la défense.' },
  meteore:  { name: 'Pluie de météores', cost: 3, target: 'enemies', spell: true, desc: 'Magie ×1,2 sur toute la ligne et Brûlure 2 tours.' },
  blizzard: { name: 'Blizzard', cost: 2, target: 'enemies', spell: true, desc: 'Magie ×0,6 sur toute la ligne et Gel 1 tour.' },
  venin:    { name: 'Lame empoisonnée', cost: 1, target: 'enemy', spell: true, desc: 'Dégâts ×0,8 et Poison 3 tours.' },
  eventail: { name: 'Éventail de lames', cost: 2, target: 'enemies', spell: true, desc: 'Frappe toute la ligne (×0,7).' },
  ronces:   { name: 'Ronces', cost: 2, target: 'enemies', spell: true, desc: 'Magie ×0,6 sur toute la ligne et Poison 2 tours.' },
  renouveau: { name: 'Renouveau', cost: 2, target: 'self', spell: true, desc: 'Toute l’équipe régénère 6 % des PV par tour pendant 3 tours.' },
  berceuse: { name: 'Berceuse', cost: 2, target: 'enemy', spell: true, desc: 'Endort la cible 1 tour et interrompt une attaque en préparation.' },
  ballade:  { name: 'Ballade héroïque', cost: 2, target: 'self', spell: true, desc: '+1 énergie pour chaque allié.' },
  malediction: { name: 'Malédiction', cost: 1, target: 'enemy', spell: true, desc: 'La cible est exposée 3 tours et frappe 25 % moins fort.' },
  pacte:    { name: 'Pacte de sang', cost: 0, target: 'self', spell: true, desc: 'Sacrifie 15 % de ses PV pour gagner 2 énergie.' },
};

// ——— Invocations ——————————————————————————————————————————————————————
// card : la créature du Bestiaire invoquée (son illustration est réutilisée).
// unlock : ce qui la débloque (posséder la carte, ou atteindre une profondeur).
export const INVOCATIONS = {
  phenix:  { name: 'Phénix', card: 'CEL-031', color: '#FF9A3A', unlock: { start: true }, desc: 'Relève les héros tombés (40 % des PV) ; si personne n’est tombé, soigne toute l’équipe.' },
  bahamut: { name: 'Bahamut', card: 'ABY-043', color: '#7FD3FF', unlock: { card: 'ABY-043', depth: 10 }, desc: 'Mégaflare : frappe tous les ennemis et les expose (+30 % de dégâts subis, 2 tours).' },
  fenrir:  { name: 'Fenrir', card: 'SAU-049', color: '#C9D1DE', unlock: { card: 'SAU-049', depth: 15 }, desc: 'Croc du Ragnarök : énorme morsure ; si la proie meurt, la jauge revient à moitié.' },
};
export const INVOCATION_ORDER = ['phenix', 'bahamut', 'fenrir'];
export const GAUGE = { action: 10, hurt: 6, perfect: 8 };
// Les variantes de carte restent cosmétiques : seule le niveau renforce une invocation.
export const invocationPower = (level) => 1 + 0.1 * (level - 1);

// ——— Unités ————————————————————————————————————————————————————————————
let seq = 0;
const blank = () => ({ stealth: 0, inspired: 0, weak: 0, bear: 0, regen: 0, stun: 0, burn: 0, frozen: 0, mark: 0, exposed: 0, taunt: 0, protectedBy: null, protecting: 0, defend: false, shield: 0, armorUp: 0, enraged: false, charging: false, poison: 0 });

// gear : bonus de l'équipement (voir gearBonus dans gear.js)
export function makeHero(key, { level = 1, wounded = false, blessings = [], gear = null, pact = null } = {}) {
  const h = HEROES[key];
  const k = growth(level) * (wounded ? 0.8 : 1);
  const u = {
    uid: `h${++seq}`, kind: 'hero', side: 'ally', id: key, name: h.name, cls: h.cls, level,
    maxHp: Math.round(h.base.hp * k), atk: Math.round(h.base.atk * k), mag: Math.round(h.base.mag * k), def: Math.round(h.base.def * k), spd: h.base.spd,
    energy: 1, res: 0, skills: h.skills.slice(), st: blank(), wounded, ct: 0,
  };
  if (gear) {
    const w = wounded ? 0.8 : 1;
    for (const k of ['hp', 'atk', 'mag', 'def']) u[k === 'hp' ? 'maxHp' : k] += Math.round((gear.stats[k] || 0) * w);
    u.spd += gear.stats.spd || 0;
    const fx = gear.fx;
    if (gear.spell) { u.skills.push(gear.spell.key); u.sp = gear.spell.pow; }
    if (fx.rage) u.res = 50;
    if (fx.heal) u.healBoost = 0.3;
    if (fx.volley) u.volley = 2.4;
    if (fx.shatter) u.shatter = 3;
    if (fx.ward) u.ward = true;
    if (fx.energy) u.energy = 3;
    if (fx.execute) u.execMult = 3.5;
    if (fx.souls) u.res = 60;
    if (fx.bearStart) u.st.bear = 3;
    if (fx.song) u.songTurns = 3;
    u.dodge = (fx.dodge ? 0.15 : 0) + 0.1 * (fx.a_esquive || 0);
    u.lifesteal = (fx.vamp ? 0.15 : 0) + 0.08 * (fx.a_vamp || 0);
    u.gaugeBonus = (fx.gauge ? 4 : 0) + 2 * (fx.a_lien || 0);
    u.energy = Math.min(3, u.energy + (fx.a_elan || 0));
  }
  applyPact(u, pact);
  if (blessings.includes('blades')) u.atk += 3;
  if (blessings.includes('haste')) u.spd += 2;
  if (blessings.includes('vigor')) u.maxHp = Math.round(u.maxHp * 1.2);
  if (blessings.includes('scales')) u.armor = 2;
  if (blessings.includes('thirst')) u.lifesteal = (u.lifesteal || 0) + 0.3;
  if (blessings.includes('fury')) u.fury = true;
  if (blessings.includes('ward')) u.ward = true;
  u.hp = u.maxHp;
  return u;
}

// Familles de comportement des créatures : déduites de leurs capacités et de leur catégorie.
export const FAMILIES = {
  brute:      { name: 'Brute', desc: 'Prépare des coups dévastateurs : interromps-la ou pare au bon moment.', pattern: ['attack', 'attack', 'charge'] },
  gardien:    { name: 'Gardien', desc: 'Protège ses alliés derrière un bouclier.', pattern: ['attack', 'guard', 'attack'] },
  lanceur:    { name: 'Lanceur de sorts', desc: 'Frappe toute ton équipe un tour sur deux.', pattern: ['attack', 'aoe'] },
  venimeux:   { name: 'Venimeux', desc: 'Empoisonne ses proies.', pattern: ['poison', 'attack'] },
  guerisseur: { name: 'Guérisseur', desc: 'Soigne ses alliés blessés : abats-le en premier.', pattern: ['attack', 'heal'] },
  enrage:     { name: 'Enragé', desc: 'Devient furieux sous la moitié de ses PV.', pattern: ['attack'] },
  traqueur:   { name: 'Traqueur', desc: 'S’acharne sur le héros le plus faible.', pattern: ['hunt', 'attack'] },
  controleur: { name: 'Contrôleur', desc: 'Prépare des attaques qui étourdissent.', pattern: ['attack', 'charge'] },
  essaim:     { name: 'Essaim', desc: 'Frappe deux fois, mais fragile.', pattern: ['double'] },
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

export const enemyLevel = (floor, room) => Math.max(1, Math.round(floor * 1.1) + (room === 'elite' ? 2 : room === 'boss' ? 3 : 0));

export function makeEnemy(card, { level = 1, boss = false, elite = false } = {}) {
  const s = card.stats;
  const k = egrowth(level) * (boss ? 2.6 : elite ? 1.35 : 1);
  const fam = familyOf(card);
  const u = {
    uid: `e${++seq}`, kind: 'enemy', side: 'enemy', id: card.id, name: card.name, rarity: card.rarity, level, family: fam, boss, elite,
    maxHp: Math.round((s.hp * 4.2 + 22) * k * (fam === 'essaim' ? 0.7 : 1)),
    atk: Math.round((s.atk * 1.2 + 5) * egrowth(level) * (boss ? 1.25 : elite ? 1.1 : 1)),
    mag: Math.round((s.mag * 1.2 + 3) * egrowth(level)),
    def: Math.round(s.def * 1.1 * egrowth(level)), spd: s.spd, energy: 0, res: 0, st: blank(), ct: 0, turns: 0,
  };
  u.hp = u.maxHp;
  return u;
}

// Rareté maximale des ennemis selon la profondeur (les mythiques arrivent tard).
export function enemyPool(catalog, floor) {
  const maxR = Math.min(3, 1 + Math.floor((floor - 1) / 4));
  return catalog.cards.filter((c) => RARITY_ORDER.indexOf(c.rarity) <= maxR && !Object.values(INVOCATIONS).some((i) => i.card === c.id));
}
export function bossPool(catalog, floor) {
  const min = floor >= 20 ? 4 : 3;
  return catalog.cards.filter((c) => RARITY_ORDER.indexOf(c.rarity) >= min && !Object.values(INVOCATIONS).some((i) => i.card === c.id));
}

// Étapes du Bestiaire de chasse
export const HUNT_STAGES = [
  { k: 1, name: 'Découverte', desc: 'Nom et illustration révélés.' },
  { k: 5, name: 'Étude', desc: 'Comportement et statistiques connus.' },
  { k: 15, name: 'Maîtrise', desc: '+10 % de dégâts contre cette créature.' },
  { k: 40, name: 'Trophée', desc: 'Titre de chasseur et récompense.' },
];
export function huntStage(kills = 0) {
  let i = -1;
  HUNT_STAGES.forEach((s, j) => { if (kills >= s.k) i = j; });
  return i; // -1 : jamais vaincue
}
