// ABYSSAL v2 (prototype) : les cartes deviennent des combattants.
// Rôle (déduit des capacités de la carte), compétence, coût d'équipe, niveau (doublons),
// pouvoir ultime des Mythiques et Secrètes, et créatures corrompues (ennemis).
import { SKILLS } from '../../js/core/heroes.js';

// Les 25 créatures du prototype (toutes les raretés, tous les rôles, toutes les factions)
export const POOL = [
  'NEC-001', 'INF-001', 'CEL-001', 'ABY-003', 'SAU-014', 'ART-003', 'PRI-001', 'ABY-001',
  'CEL-017', 'PRI-014', 'ART-018', 'INF-018', 'NEC-017', 'SAU-022',
  'ABY-030', 'PRI-026', 'CEL-031', 'INF-037', 'NEC-028',
  'ART-038', 'SAU-043', 'ABY-040', 'ABY-043',
  'ART-039', 'NEC-044',
];
// Équipe de départ : 5 Communes aux rôles complémentaires
export const STARTER = ['NEC-001', 'INF-001', 'CEL-001', 'ABY-003', 'SAU-014'];

// ——— Rôles ————————————————————————————————————————————————————————————
export const ROLES = {
  protecteur: { name: 'Protecteur', icon: 'shield', color: '#7FA8D8', skill: 'c_garde',   desc: 'Encaisse et protège les plus fragiles.',
    base: { hp: 112, atk: 8, mag: 4, def: 8, spd: 4 } },
  degats:     { name: 'Attaquant',  icon: 'swords', color: '#E0533A', skill: 'c_frappe',  desc: 'Frappe fort une seule cible.',
    base: { hp: 74, atk: 14, mag: 4, def: 3, spd: 7 } },
  soin:       { name: 'Soigneur',   icon: 'heart',  color: '#6FD3A0', skill: 'c_soin',    desc: 'Soigne l’allié le plus blessé.',
    base: { hp: 72, atk: 6, mag: 12, def: 3, spd: 5 } },
  poison:     { name: 'Empoisonneur', icon: 'skull', color: '#9FCB3A', skill: 'c_venin',  desc: 'Affaiblit les cibles résistantes avec le poison.',
    base: { hp: 78, atk: 10, mag: 8, def: 3, spd: 6 } },
  controle:   { name: 'Entraveur',  icon: 'eye',    color: '#B48CFF', skill: 'c_entrave', desc: 'Étourdit et interrompt les gros coups.',
    base: { hp: 80, atk: 9, mag: 9, def: 4, spd: 6 } },
  soutien:    { name: 'Soutien',    icon: 'sparkle', color: '#F2C14E', skill: 'c_cri',    desc: 'Renforce toute l’équipe et remplit la jauge.',
    base: { hp: 82, atk: 8, mag: 8, def: 4, spd: 6 } },
  zone:       { name: 'Fléau',      icon: 'flame',  color: '#FF8A3D', skill: 'c_vague',   desc: 'Frappe toute la ligne ennemie.',
    base: { hp: 70, atk: 7, mag: 12, def: 3, spd: 5 } },
};
export function roleOf(card) {
  const a = new Set((card.abilities || []).map((x) => x.key));
  if (a.has('guard') || a.has('armor') || a.has('aegis')) return 'protecteur';
  if (a.has('regen') || a.has('bless')) return 'soin';
  if (a.has('venom') || a.has('drain')) return 'poison';
  if (a.has('fear') || a.has('drown') || a.has('curse')) return 'controle';
  if (a.has('command') || a.has('omen') || a.has('relic')) return 'soutien';
  if (a.has('cataclysm') || a.has('strike')) return 'zone';
  return 'degats';
}
export const skillOf = (card) => SKILLS[ROLES[roleOf(card)].skill];

// ——— Rareté : coût d'équipe et puissance (écart volontairement modéré) ———————
export const COST = { C: 1, PC: 2, R: 3, HR: 4, M: 5, S: 6 };
export const BUDGET = 15;
export const TEAM = { active: 3, reserve: 2 };
const RARITY_MULT = { C: 1, PC: 1.08, R: 1.17, HR: 1.26, M: 1.36, S: 1.44 };

// ——— Niveaux : chaque doublon fait progresser la créature (niveau 10 au maximum) ———
export const MAX_LEVEL = 10;
export const dupCost = (lvl) => Math.ceil(lvl / 2); // doublons pour passer du niveau lvl à lvl+1
export function levelFromDups(d = 0) {
  let lvl = 1, rest = d;
  while (lvl < MAX_LEVEL && rest >= dupCost(lvl)) { rest -= dupCost(lvl); lvl++; }
  return { level: lvl, into: rest, need: lvl >= MAX_LEVEL ? 0 : dupCost(lvl) };
}
export const levelGrowth = (lvl) => 1 + 0.07 * (lvl - 1);

// ——— Pouvoir ultime (un seul par équipe) ————————————————————————————————
// Sans Mythique ni Secrète, l'équipe a le Sceau du Gardien. Une Mythique ou une Secrète
// de l'équipe le remplace par son pouvoir, selon sa faction.
export const ULTS = {
  sceau:  { name: 'Sceau du Gardien',  color: '#E8C35A', desc: 'Soigne l’équipe de 20 % et donne un bouclier à chacun.' },
  revive: { name: 'Renaissance',       color: '#FF9A3A', desc: 'Relève les créatures tombées (40 % des PV) ; sinon soigne l’équipe de 35 %.' },
  nova:   { name: 'Cataclysme',        color: '#FF5A3A', desc: 'Frappe tous les ennemis et les expose (+30 % de dégâts subis, 2 tours).' },
  smite:  { name: 'Croc du Néant',     color: '#7FD3FF', desc: 'Énorme coup sur l’ennemi le plus solide ; s’il tombe, la jauge revient à moitié.' },
  aegis:  { name: 'Égide mécanique',   color: '#C9D1DE', desc: 'Bouclier sur toute l’équipe et +2 énergie à chacun.' },
};
const ULT_BY_FACTION = { celeste: 'revive', necrotique: 'revive', infernal: 'nova', primordial: 'nova', abyssal: 'smite', sauvage: 'smite', artificiel: 'aegis' };
export const canUlt = (card) => card && (card.rarity === 'M' || card.rarity === 'S');
export const ultOf = (card) => (canUlt(card) ? ULT_BY_FACTION[card.faction] || 'nova' : 'sceau');

// ——— Unités de combat ———————————————————————————————————————————————
let seq = 0;
const blank = () => ({ stealth: 0, inspired: 0, weak: 0, bear: 0, regen: 0, stun: 0, burn: 0, frozen: 0, mark: 0, exposed: 0, taunt: 0, protectedBy: null, protecting: 0, defend: false, shield: 0, armorUp: 0, enraged: false, charging: false, poison: 0 });

// Créature alliée. Les statistiques de la carte donnent une nuance (±15 %) autour du gabarit du rôle.
export function makeCreature(card, { level = 1, blessings = [] } = {}) {
  const role = roleOf(card), R = ROLES[role];
  const k = RARITY_MULT[card.rarity] * levelGrowth(level);
  const s = card.stats || {};
  const nuance = (v, avg) => Math.max(0.85, Math.min(1.15, 1 + ((v || avg) - avg) / (avg * 4)));
  const u = {
    uid: `c${++seq}`, kind: 'hero', creature: true, side: 'ally', id: card.id, name: card.name, cls: R.name, role, level, rarity: card.rarity,
    maxHp: Math.round(R.base.hp * k * nuance(s.hp, 12)), atk: Math.round(R.base.atk * k * nuance(s.atk, 5)), mag: Math.round(R.base.mag * k * nuance(s.mag, 5)),
    def: Math.round(R.base.def * k), spd: R.base.spd + (s.spd >= 7 ? 1 : 0), energy: 1, res: 0, skills: [R.skill], st: blank(), ct: 0,
  };
  if (blessings.includes('blades')) u.atk += 3;
  if (blessings.includes('haste')) u.spd += 2;
  if (blessings.includes('vigor')) u.maxHp = Math.round(u.maxHp * 1.2);
  if (blessings.includes('scales')) u.armor = 2;
  if (blessings.includes('thirst')) u.lifesteal = 0.3;
  if (blessings.includes('fury')) u.fury = true;
  if (blessings.includes('ward')) u.ward = true;
  u.hp = u.maxHp;
  return u;
}
