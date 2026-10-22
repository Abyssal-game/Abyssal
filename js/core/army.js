// ABYSSAL : les cartes sont des créatures qui combattent pour le Gardien des Sceaux.
// Rôle (déduit des capacités de la carte), coût d'équipe, niveau (doublons)
// et pouvoir ultime des Mythiques et Secrètes.

// Équipe offerte à un joueur qui n'a pas encore 3 créatures : 5 Communes aux rôles complémentaires
export const STARTER = ['NEC-001', 'INF-001', 'CEL-001', 'ABY-003', 'SAU-014'];

// ——— Rôles ————————————————————————————————————————————————————————————
export const ROLES = {
  protecteur: { name: 'Protecteur', icon: 'shield', color: '#7FA8D8', desc: 'Encaisse et protège les plus fragiles.' },
  degats:     { name: 'Attaquant',  icon: 'swords', color: '#E0533A', desc: 'Frappe fort une seule cible.' },
  soin:       { name: 'Soigneur',   icon: 'heart',  color: '#6FD3A0', desc: 'Soigne l’allié le plus blessé.' },
  poison:     { name: 'Empoisonneur', icon: 'skull', color: '#9FCB3A', desc: 'Affaiblit les cibles résistantes avec le poison.' },
  controle:   { name: 'Entraveur',  icon: 'eye',    color: '#B48CFF', desc: 'Étourdit et interrompt les gros coups.' },
  soutien:    { name: 'Soutien',    icon: 'sparkle', color: '#F2C14E', desc: 'Renforce toute l’équipe et remplit la jauge.' },
  zone:       { name: 'Fléau',      icon: 'flame',  color: '#FF8A3D', desc: 'Frappe toute la ligne ennemie.' },
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
};

// ——— Rareté : coût d'équipe et puissance (écart volontairement modéré) ———————
export const COST = { C: 1, PC: 2, R: 3, HR: 4, M: 5, S: 6 };
// v495 : plus de budget de rareté (demande du propriétaire) : n'importe quelles 5 créatures. COST reste pour teamCost (affichage).
export const BUDGET = Infinity;
export const TEAM = { active: 3, reserve: 2 };

// ——— Niveaux : chaque doublon fait progresser la créature (niveau 10 au maximum) ———
export const MAX_LEVEL = 10;
export const dupCost = (lvl) => Math.ceil(lvl / 2); // doublons pour passer du niveau lvl à lvl+1
export function levelFromDups(d = 0) {
  let lvl = 1, rest = d;
  while (lvl < MAX_LEVEL && rest >= dupCost(lvl)) { rest -= dupCost(lvl); lvl++; }
  return { level: lvl, into: rest, need: lvl >= MAX_LEVEL ? 0 : dupCost(lvl) };
};

// ——— Pouvoir ultime (un seul par équipe) ————————————————————————————————
// Sans Mythique ni Secrète, l'équipe a le Sceau du Serment. Une Mythique ou une Secrète
// de l'équipe le remplace par son pouvoir, selon sa faction.
export const ULTS = {
  sceau:  { name: 'Sceau du Serment', color: '#E8C35A', desc: 'Soigne tes créatures au combat (20 % des PV) et leur donne un bouclier qui absorbe jusqu’à 30 % de leurs PV.' },
  revive: { name: 'Renaissance',      color: '#FF9A3A', desc: 'Relève les créatures tombées (50 % des PV) ; sinon soigne l’équipe de 40 %.' },
  nova:   { name: 'Cataclysme',       color: '#FF5A3A', desc: 'Frappe tous les ennemis au combat, plus fort à chaque tour.' },
  smite:  { name: 'Croc du Néant',    color: '#7FD3FF', desc: 'Énorme coup sur l’ennemi qui a le plus de PV.' },
  aegis:  { name: 'Égide mécanique',  color: '#C9D1DE', desc: 'Bouclier sur tes créatures au combat, dégel, et +2 PA pour chacune.' },
};
const ULT_BY_FACTION = { celeste: 'revive', necrotique: 'revive', infernal: 'nova', primordial: 'nova', abyssal: 'smite', sauvage: 'smite', artificiel: 'aegis' };
export const canUlt = (card) => card && (card.rarity === 'M' || card.rarity === 'S');
export const ultOf = (card) => (canUlt(card) ? ULT_BY_FACTION[card.faction] || 'nova' : 'sceau');
