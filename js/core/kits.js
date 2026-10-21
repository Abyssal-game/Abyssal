// ABYSSAL : identité de combat de chaque créature (données + effets), en complément du kit de son rôle.
//
// Chaque créature garde le kit de son rôle (Garde, Assaut, Soin…) et gagne, en montant de niveau :
//   niveau 1 : sa FRAPPE propre (l'attaque de base, avec un effet à elle)
//   niveau 3 : son PASSIF
//   niveau 6 : sa COMPÉTENCE propre (une action de plus, à côté de celle du rôle)
//   niveau 9 : son ÉVEIL (le passif ou la compétence s'améliore)
// Les statistiques suivent toujours la rareté et le niveau (duel.js) ; « stat » ne fait que déplacer
// un peu la puissance entre attaque et PV (même budget), selon la nature de la créature.
// Les variantes (holo, or, cosmique) ne changent rien au combat.
//
// Un seul endroit définit chaque effet : les compétences (MOVES) et les passifs (PASSIVES) reçoivent
// les outils du moteur (api) au lieu de les réimplémenter. Prototype : 12 créatures (CREATURE_KITS).

import { GEN_KITS } from './kits-data.js';

export const KIT_LEVELS = { strike: 1, passive: 3, move: 6, awaken: 9, apogee: 10 };
export const KIT_STEPS = [
  { k: 'strike', lv: 1, name: 'Frappe' }, { k: 'passive', lv: 3, name: 'Passif' },
  { k: 'move', lv: 6, name: 'Compétence' }, { k: 'awaken', lv: 9, name: 'Éveil' },
];

// ——— Les 12 créatures du prototype, écrites à la main ———
// stat : répartition attaque / PV (le produit reste proche de 1). strike : effets de la frappe.
// plus / moins / synergy : la fiche « Forces, faiblesses, alliés ».
// Les autres créatures sont générées (kits-data.js, tools/gen-kits.mjs) : passif tiré de leur capacité,
// second passif à l'Éveil si elles en ont deux, compétence composée d'effets élémentaires (OPS).
const HAND_KITS = {
  'INF-001': {
    style: 'Harceleur', stat: { atk: 1.1, hp: 0.9 },
    strike: { name: 'Griffe de braise', desc: 'Dégâts normaux, +1 Brisure.', brk: 1 },
    passive: 'attiser', move: 'gerbe',
    plus: 'Rapide à remplir la Ferveur sur les cibles marquées ou brisées.', moins: 'Fragile, peu de PV.', synergy: 'Marque du chasseur, Brisure, Entraveurs.',
  },
  'NEC-001': {
    style: 'Increvable', stat: { atk: 0.9, hp: 1.12 },
    strike: { name: 'Coup de bouclier', desc: 'Dégâts normaux, +1 Brisure en plus.' },
    passive: 'inebranlable', move: 'murdos',
    plus: 'Survit une fois à un coup mortel par combat.', moins: 'Dégâts faibles.', synergy: 'Soigneurs (Bastion), Défense.',
  },
  'CEL-001': {
    style: 'Voix de l’équipe', stat: { atk: 0.92, hp: 1.08 },
    strike: { name: 'Note claire', desc: '70 % des dégâts, et soigne de 2 l’allié le plus blessé.', mult: 0.7, healLowest: 2 },
    passive: 'choeur', move: 'hymne',
    plus: 'Soigne en attaquant : elle ne perd jamais son tour.', moins: 'Frappe faiblement.', synergy: 'Attaquants (son Chœur leur donne +1 ATQ).',
  },
  'ABY-003': {
    style: 'Venin qui se propage', stat: { atk: 0.95, hp: 1.05 },
    strike: { name: 'Piqûre', desc: 'Dégâts normaux, +2 poison, et +1 poison à un ennemi voisin. Traverse les boucliers.', splashPoison: 1 },
    passive: 'filaments', move: 'encre',
    plus: 'Son poison survit à sa cible.', moins: 'Lente contre une seule grosse cible.', synergy: 'Manticore, Entraveurs (Givre-venin).',
  },
  'CEL-018': {
    style: 'Plongeon du ciel', stat: { atk: 1.08, hp: 0.95 },
    strike: { name: 'Lance', desc: 'Dégâts normaux. Traverse les boucliers.', pierce: true },
    passive: 'elue', move: 'plongeon',
    plus: 'Coup sûr sans dé (Plongeon), et plus forte quand un allié tombe.', moins: 'Plongeon se recharge en 3 tours ; peu de PV.', synergy: 'Marque, cibles brisées.',
  },
  'NEC-017': {
    style: 'Cri qui fige', stat: { atk: 0.95, hp: 1.05 },
    strike: { name: 'Gémissement', desc: 'Dégâts normaux, +2 Brisure sur un ennemi qui se charge ou se concentre.', brkCharging: 2 },
    passive: 'presage', move: 'cri',
    plus: 'Toute l’équipe frappe plus fort les ennemis ralentis ou gelés.', moins: 'Peu de dégâts seule.', synergy: 'Attaquants, Kraken, Méduse.',
  },
  'SAU-031': {
    style: 'Chasseuse venimeuse', stat: { atk: 1.05, hp: 0.95 },
    strike: { name: 'Griffes', desc: 'Dégâts normaux, +2 poison (+3 sur une cible déjà empoisonnée). Traverse les boucliers.', poisonMore: 1 },
    passive: 'chasseur', move: 'epines',
    plus: 'Achève les cibles empoisonnées, et son poison passe à un voisin (Éveil).', moins: 'Contre une cible sans poison, elle est moyenne.', synergy: 'Méduse Funèbre, Entraveurs.',
  },
  'INF-012': {
    style: 'Protecteur qui rend les coups', stat: { atk: 1.05, hp: 0.96 },
    strike: { name: 'Masse ardente', desc: '120 % des dégâts, +1 Brisure en plus.', mult: 1.2 },
    passive: 'colere', move: 'represailles',
    plus: 'Plus il protège, plus il frappe fort.', moins: 'Doit encaisser pour briller.', synergy: 'Soigneurs, Rempart sur l’allié menacé.',
  },
  'SAU-043': {
    style: 'Trois têtes, un portail', stat: { atk: 0.97, hp: 1.04 },
    strike: { name: 'Triple morsure', desc: 'Trois morsures à 45 % : chacune profite de la Chaîne, et chaque morsure en plus ajoute 1 Brisure.', hits: 3, mult: 0.45 },
    passive: 'enfers', move: 'hurlement',
    plus: 'Punit les ennemis qui frappent ses protégés.', moins: 'Chaque morsure est faible contre les boucliers.', synergy: 'Rempart, Défense, équipes fragiles.',
  },
  'ABY-039': {
    style: 'Étreinte des abysses', stat: { atk: 1, hp: 1.02 },
    strike: { name: 'Tentacule', desc: 'Dégâts normaux, +2 Brisure sur une cible gelée.' },
    passive: 'profondeurs', move: 'etreinte',
    plus: 'Contrôle plusieurs ennemis à la fois.', moins: 'Frappe peu par lui-même ; son Étreinte se recharge lentement.', synergy: 'Banshee, Méduse (Givre-venin), Attaquants.',
  },
  'SAU-049': {
    style: 'La faim qui grandit', stat: { atk: 1.08, hp: 0.95 },
    strike: { name: 'Croc du loup', desc: 'Dégâts normaux, +50 % sur une cible sous la moitié de ses PV.', lowBonus: 0.5 },
    passive: 'faim', move: 'soleil',
    plus: 'Dévastateur contre les gardiens et les élites ; chaque proie le renforce.', moins: 'Sans proie à achever, il s’essouffle.', synergy: 'Marque, Brisure, poison qui affaiblit.',
  },
  'CEL-031': {
    style: 'Flamme qui renaît', stat: { atk: 0.95, hp: 1.05 },
    strike: { name: 'Plume ardente', desc: 'Dégâts normaux ; soigne l’allié le plus blessé de 30 % des dégâts.', lifeShare: 0.3 },
    passive: 'renaissance', move: 'flammes',
    plus: 'Se relève une fois par combat.', moins: 'Moins de soin brut qu’un Soigneur classique.', synergy: 'Attaquants (Flammes de vie : +2 ATQ).',
  },
};

// ——— Passifs (débloqués au niveau 3, renforcés par l'Éveil au niveau 9) ———
export const PASSIVES = {
  attiser: { name: 'Attiser', desc: 'Frapper une cible marquée ou brisée rapporte +1 Ferveur (une fois par tour).', awaken: 'Et +1 Brisure.' },
  inebranlable: { name: 'Inébranlable', desc: 'Une fois par combat, un coup mortel le laisse à 1 PV.', awaken: 'Il se relève aussi avec un bouclier.' },
  choeur: { name: 'Chœur', desc: 'Les créatures qu’elle soigne gagnent +1 ATQ pour ce tour.', awaken: '+2 ATQ.' },
  filaments: { name: 'Filaments', desc: 'Quand une cible empoisonnée meurt, la moitié de son poison passe à un ennemi voisin.', awaken: 'Tout son poison, +2.' },
  elue: { name: 'Élue des braves', desc: 'Quand une de tes créatures tombe : +2 ATQ (pour le combat) et +1 Ferveur.', awaken: '+3 ATQ.' },
  presage: { name: 'Présage funeste', desc: 'Tant qu’elle est au combat, ton équipe fait +25 % de dégâts aux ennemis ralentis ou gelés.', awaken: '+40 %.' },
  chasseur: { name: 'Venin du chasseur', desc: '+40 % de dégâts sur les cibles empoisonnées.', awaken: 'Quand sa cible meurt, son poison passe à un ennemi voisin.' },
  colere: { name: 'Colère du rempart', desc: 'Chaque coup encaissé à la place d’un allié (Rempart) : +1 ATQ pour le combat (3 au plus).', awaken: '5 au plus.' },
  enfers: { name: 'Molosse des Enfers', desc: 'Un ennemi qui frappe une créature qu’il protège (Rempart), ou qui le frappe pendant son Hurlement, subit 3 dégâts.', awaken: '5 dégâts et +1 Brisure.' },
  profondeurs: { name: 'Profondeurs', desc: 'Ses coups font +30 % de dégâts aux ennemis gelés ou ralentis.', awaken: 'Étreinte se recharge en 2 tours au lieu de 3.' },
  faim: { name: 'Faim sans fin', desc: 'Chaque ennemi qu’il achève : +1 ATQ (pour le combat) et 20 % de PV rendus.', awaken: 'Et il peut agir une fois de plus ce tour-ci.' },
  renaissance: { name: 'Second souffle', desc: 'Une fois par combat, se relève avec 40 % de ses PV.', awaken: 'En renaissant, soigne toute l’équipe de 15 %.' },
  // — un passif par capacité imprimée sur les cartes (les créatures générées) —
  ruee: { name: 'Ruée', desc: 'Sa première frappe de chaque combat fait +100 % de dégâts et +1 Brisure.', awaken: '+150 %.' },
  sentinelle: { name: 'Sentinelle', desc: 'Quand elle encaisse pour un allié (Rempart), elle prend 25 % de dégâts en moins.', awaken: '40 % de moins.' },
  drain: { name: 'Drain', desc: 'Ses coups lui rendent 20 % des dégâts infligés.', awaken: '30 %.' },
  premiere: { name: 'Première frappe', desc: '+40 % de dégâts sur un ennemi qui a encore tous ses PV.', awaken: '+60 %.' },
  eruption: { name: 'Éruption', desc: 'Au début de chaque combat, frappe l’ennemi le plus fort à 60 % de son attaque.', awaken: '100 %.' },
  malediction: { name: 'Malédiction', desc: 'Sa première frappe de chaque tour marque la cible : le prochain coup d’une autre de tes créatures fait +50 % et +2 Brisure.', awaken: 'La marque dure un tour de plus.' },
  benediction: { name: 'Bénédiction', desc: 'Une fois par combat, quand un allié passe sous 30 % de ses PV, elle le soigne de 20 %.', awaken: 'Deux fois par combat.' },
  egide: { name: 'Égide', desc: 'Commence chaque combat avec un bouclier (il bloque un coup).', awaken: 'Le bouclier revient au 4e tour.' },
  reliquat: { name: 'Reliquat', desc: 'Quand elle tombe, ton équipe gagne 2 Ferveur.', awaken: 'Et tes créatures au combat +1 ATQ.' },
  commandement: { name: 'Commandement', desc: 'Au début de ton tour, ta créature au combat la plus forte (hors elle) gagne +2 ATQ pour ce tour.', awaken: '+3 ATQ.' },
  engloutir: { name: 'Engloutir', desc: 'Au début de chaque combat, ralentit l’ennemi le plus fort (sa prochaine attaque fait moitié moins mal).', awaken: 'Le ralentit aussi au 3e tour.' },
  regeneration: { name: 'Régénération', desc: 'Au début de ton tour, elle récupère 5 % de ses PV.', awaken: '8 %.' },
  venin: { name: 'Venin', desc: 'Ses frappes ajoutent +1 poison.', awaken: '+2 poison.' },
  frenesie: { name: 'Frénésie', desc: 'Sous la moitié de ses PV, +50 % de dégâts.', awaken: '+70 %.' },
  blindage: { name: 'Blindage', desc: 'Les coups ennemis qu’elle reçoit font 12 % de dégâts en moins.', awaken: '20 %.' },
  augure: { name: 'Augure', desc: 'Au début d’un combat, +1 Ferveur si ton équipe en a moins de 3.', awaken: 'Moins de 4.' },
  cataclysme: { name: 'Cataclysme', desc: 'Au début de chaque combat, frappe tous les ennemis à 30 % de son attaque.', awaken: '50 %.' },
  insaisissable: { name: 'Insaisissable', desc: 'Les ennemis visent une autre de tes créatures tant qu’elle n’a pas frappé dans le combat.', awaken: 'Elle redevient insaisissable à chaque tour où elle n’attaque pas.' },
  devoreur: { name: 'Vorace', desc: 'Chaque ennemi qu’elle achève : +1 ATQ pour le combat (+3 au plus).', awaken: '+5 au plus, et 15 % de PV rendus.' },
  effroi: { name: 'Effroi', desc: 'Les ennemis ordinaires qui la frappent font 20 % de dégâts en moins (pas les élites ni les gardiens).', awaken: '30 % de moins.' },
};
// Textes et frappes des créatures générées (tools/gen-kits.mjs) : rangés ici pour que kits-data.js reste léger
export const FAC_STRIKE = {
  infernal: { fx: { mult: 0.9, burn: 1 }, txt: '90 % des dégâts, et la cible brûle : +1 poison.' },
  abyssal: { fx: { mult: 0.9, lowBonus: 0.35 }, txt: '90 % des dégâts, +35 % sur une cible sous la moitié de ses PV.' },
  celeste: { fx: { mult: 0.85, healLowest: 2 }, txt: '85 % des dégâts, et soigne de 2 l’allié le plus blessé.' },
  sauvage: { fx: { mult: 1.05 }, txt: '105 % des dégâts.' },
  necrotique: { fx: { mult: 0.9, lifeShare: 0.25 }, txt: '90 % des dégâts ; soigne l’allié le plus blessé de 25 % des dégâts.' },
  artificiel: { fx: { mult: 0.95, pierce: true }, txt: '95 % des dégâts. Traverse les boucliers.' },
  primordial: { fx: { mult: 0.95, brkCharging: 2 }, txt: '95 % des dégâts, +2 Brisure sur un ennemi qui se charge ou se concentre.' },
};
export const ROLE_TXT = {
  protecteur: ['Encaisse à la place de ses alliés (Rempart) et tient longtemps.', 'Peu de dégâts par elle-même.', 'Soigneurs (Bastion), attaquants fragiles.'],
  degats: ['Fait beaucoup de dégâts, surtout aux cibles brisées ou affaiblies.', 'Fragile : elle craint les coups chargés.', 'Marque du chasseur, Brisure, Entraveurs.'],
  soin: ['Garde l’équipe debout et la libère du poison et du gel.', 'Frappe faiblement.', 'Protecteurs, équipes qui encaissent.'],
  poison: ['Son poison ronge les grosses cibles et traverse les boucliers.', 'Lente à faire effet contre une cible fragile.', 'Entraveurs (Givre-venin), Venin du chasseur.'],
  controle: ['Annule les coups dangereux en gelant ou en ralentissant.', 'Peu de dégâts ; les gardiens résistent au gel.', 'Attaquants (Bris de glace), Empoisonneurs.'],
  soutien: ['Rend toute l’équipe plus forte (Cri de guerre, Marque, Ferveur).', 'Faible seule : elle brille avec des attaquants.', 'Attaquants et Fléaux.'],
  zone: ['Frappe plusieurs ennemis à la fois.', 'Chaque coup est faible contre une seule grosse cible.', 'Soutiens (Cri de guerre : Raz-de-marée), Brisure.'],
};
// Une entrée compacte de kits-data.js → la même forme qu'un kit écrit à la main
function expandKit(g) {
  const P = PASSIVES[g.p], [plus, moins, syn] = ROLE_TXT[g.r];
  return {
    style: g.s, role: g.r, stat: { atk: g.a, hp: +(1 / g.a).toFixed(2) },
    strike: { name: g.k, desc: FAC_STRIKE[g.f].txt, ...FAC_STRIKE[g.f].fx },
    passive: g.p, ...(g.p2 ? { passive2: g.p2 } : {}), move: g.m,
    plus: `${plus} ${P.name} : ${P.desc.charAt(0).toLowerCase()}${P.desc.slice(1)}`,
    moins: g.a > 1.02 ? `${moins} Un peu moins de PV que les autres.` : moins, synergy: syn,
  };
}
export const CREATURE_KITS = { ...Object.fromEntries(Object.entries(GEN_KITS).map(([id, g]) => [id, expandKit(g)])), ...HAND_KITS };

// Passif tiré de chaque capacité de carte (data/abilities.json)
export const ABILITY_PASSIVE = { charge: 'ruee', guard: 'sentinelle', drain: 'drain', first: 'premiere', strike: 'eruption', curse: 'malediction', bless: 'benediction', aegis: 'egide', relic: 'reliquat', command: 'commandement', drown: 'engloutir', regen: 'regeneration', venom: 'venin', frenzy: 'frenesie', armor: 'blindage', omen: 'augure', cataclysm: 'cataclysme', elusive: 'insaisissable', devour: 'devoreur', fear: 'effroi' };

// ——— Compétences propres (débloquées au niveau 6) ———
// Elles ne coûtent pas de Ferveur (réservée aux compétences de rôle et au pouvoir d'équipe) :
// après usage, elles se rechargent pendant cd tours. ap : actions de l'équipe dépensées.
// target : 'enemy' | 'ally' | 'none' | 'anyEnemy' (même derrière une Garde). ai(st, u, api) : cible conseillée, ou null.
const pickLow = (list) => list.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
export const MOVES = {
  gerbe: {
    name: 'Gerbe d’étincelles', icon: 'brasier', ap: 1, cd: 2, target: 'enemy',
    desc: 'Frappe la cible et un ennemi voisin, chacun à 70 % de son attaque.',
    pv: (st, u, t, api) => api.dmgOf(st, u, t, 0.7),
    run(st, u, t, ev, api) { const row = api.front(st, 'enemy'), i = row.indexOf(t); [t, row[i - 1] || row[i + 1]].filter(Boolean).forEach((x) => api.hurt(st, x, api.dmgOf(st, u, x, 0.7), ev, u.uid)); },
    ai: (st, u, api) => (api.front(st, 'enemy').length >= 2 ? api.bestTarget(st, u) : null),
  },
  murdos: {
    name: 'Mur d’os', icon: 'carapace', ap: 1, cd: 3, target: 'ally',
    desc: 'Un bouclier (bloque un coup) sur lui et sur l’allié choisi.',
    run(st, u, t, ev) { [u, t].filter(Boolean).forEach((x) => { if (!x.shield) { x.shield = 1; ev.push({ t: 'status', u: x.uid, s: 'Mur d’os', k: 'guard' }); } }); },
    ai: (st, u, api) => { const th = api.threatened(st); return th && !th.shield ? th.uid : null; },
  },
  hymne: {
    name: 'Hymne', icon: 'hymne', ap: 1, cd: 3, target: 'none',
    desc: 'Soigne toute ton équipe au combat de 15 % de ses PV.', awaken: 'Retire aussi le poison.',
    run(st, u, t, ev, api) { api.front(st, 'ally').forEach((x) => { api.heal(x, x.maxHp * 0.15, ev, u); if (api.awake(u) && x.poison) { x.poison = 0; ev.push({ t: 'status', u: x.uid, s: 'Purifiée', k: 'heal' }); } }); },
    ai: (st, u, api) => (api.front(st, 'ally').filter((x) => x.hp < x.maxHp * 0.7).length >= 2 ? 'none' : null),
  },
  encre: {
    name: 'Nuage d’encre', icon: 'linceul', ap: 1, cd: 2, target: 'enemy',
    desc: 'Frappe à 60 % ; la cible est ralentie (sa prochaine attaque fait moitié moins mal) et reçoit 2 poison.',
    pv: (st, u, t, api) => api.dmgOf(st, u, t, 0.6),
    run(st, u, t, ev, api) { api.hurt(st, t, api.dmgOf(st, u, t, 0.6), ev, u.uid); if (t.hp <= 0) return; t.slow = true; ev.push({ t: 'status', u: t.uid, s: 'Ralentie', k: 'frost' }); api.addPoison(st, t, 2, ev, u); },
    ai: (st, u, api) => { const d = api.dangerous(st); return d && !d.slow ? d.uid : null; },
  },
  plongeon: {
    name: 'Plongeon', icon: 'charge', ap: 1, cd: 3, target: 'enemy',
    desc: 'Coup sûr, sans dé : 160 % des dégâts et +2 Brisure.', awaken: '220 % sur une cible sous 30 % de ses PV ou brisée.',
    pv: (st, u, t, api) => api.dmgOf(st, u, t, api.awake(u) && (t.broken || t.hp <= t.maxHp * 0.3) ? 2.2 : 1.6),
    run(st, u, t, ev, api) { const m = api.awake(u) && (t.broken || t.hp <= t.maxHp * 0.3) ? 2.2 : 1.6; const d = api.hurt(st, t, api.dmgOf(st, u, t, m), ev, u.uid); if (d && t.hp > 0) api.breakHit(st, t, 2, ev, u); },
    ai: (st, u, api) => { const t = api.front(st, 'enemy').find((x) => x.broken || x.mark || x.boss || x.elite); return t && api.targetsOf(st, u).includes(t.uid) ? t.uid : null; },
  },
  cri: {
    name: 'Cri d’outre-tombe', icon: 'terreur', ap: 1, cd: 3, target: 'none',
    desc: 'Ralentit tous les ennemis au combat.', awaken: 'Et gèle l’ennemi le plus dangereux (sauf gardien).',
    run(st, u, t, ev, api) { api.front(st, 'enemy').forEach((x) => { x.slow = true; ev.push({ t: 'status', u: x.uid, s: 'Ralenti', k: 'frost' }); }); if (api.awake(u)) { const d = api.dangerous(st); if (d && !d.boss) api.freeze(st, d, ev); } },
    ai: (st, u, api) => (api.front(st, 'enemy').length >= 2 && api.dangerous(st) ? 'none' : null),
  },
  epines: {
    name: 'Épines empoisonnées', icon: 'venin', ap: 1, cd: 2, target: 'anyEnemy',
    desc: 'Frappe n’importe quel ennemi, même derrière un Protecteur : dégâts normaux et +3 poison.',
    pv: (st, u, t, api) => api.dmgOf(st, u, t, 1),
    run(st, u, t, ev, api) { api.hurt(st, t, api.dmgOf(st, u, t, 1), ev, u.uid, { pierce: true }); if (t.hp > 0) api.addPoison(st, t, 3, ev, u); },
    // utile surtout pour atteindre ce qu'une Garde protège : un dangereux, un gardien, une élite
    ai: (st, u, api) => { const d = api.dangerous(st); const f = api.front(st, 'enemy').filter((x) => !api.targetsOf(st, u).includes(x.uid) && (x === d || x.boss || x.elite || x.hp <= api.dmgOf(st, u, x, 1)))[0]; return f ? f.uid : null; },
  },
  represailles: {
    name: 'Représailles', icon: 'martel', ap: 1, cd: 2, target: 'enemy',
    desc: 'Frappe avec son attaque + la moitié des dégâts encaissés au dernier tour ennemi (8 au plus), +2 Brisure.',
    pv: (st, u, t, api) => api.dmgOf(st, u, t, 1) + Math.min(8, Math.round(((u.absorbed || 0) + (u.absPrev || 0)) / 2)),
    run(st, u, t, ev, api) { const extra = Math.min(8, Math.round(((u.absorbed || 0) + (u.absPrev || 0)) / 2)); u.absorbed = 0; u.absPrev = 0; const d = api.hurt(st, t, api.dmgOf(st, u, t, 1) + extra, ev, u.uid); if (extra) ev.push({ t: 'status', u: u.uid, s: `Représailles +${extra}`, syn: true }); if (d && t.hp > 0) api.breakHit(st, t, 2, ev, u); },
    ai: (st, u, api) => (((u.absorbed || 0) + (u.absPrev || 0)) >= 6 ? api.bestTarget(st, u) : null),
  },
  hurlement: {
    name: 'Hurlement', icon: 'provoc', ap: 1, cd: 3, target: 'none',
    desc: 'Tous les ennemis le visent à leur prochain tour, et il se met en Défense.', awaken: 'Et ton équipe gagne +1 ATQ ce tour-ci.',
    run(st, u, t, ev, api) { api.taunt(st, u); u.defend = true; ev.push({ t: 'status', u: u.uid, s: 'Hurlement : tous sur lui !', syn: true, k: 'guard' }); if (api.awake(u)) api.front(st, 'ally').forEach((x) => { x.boost = (x.boost || 0) + 1; }); },
    ai: (st, u, api) => { const th = api.threatened(st); return th && th.uid !== u.uid && u.hp > u.maxHp * 0.5 ? 'none' : null; },
  },
  etreinte: {
    name: 'Étreinte des abysses', icon: 'tentacules', ap: 2, cd: 3, target: 'enemy',
    desc: 'Gèle la cible (sauf si elle vient d’être gelée) et ralentit ses voisins.',
    recharge: (u, api) => (api.awake(u) ? 2 : 3),
    targets: (st, u, api) => api.targetsOf(st, u).filter((id) => !(st.units[id].frostCD > 0)),
    run(st, u, t, ev, api) { api.freeze(st, t, ev); const row = api.front(st, 'enemy'), i = row.indexOf(t); [row[i - 1], row[i + 1]].filter(Boolean).forEach((x) => { x.slow = true; ev.push({ t: 'status', u: x.uid, s: 'Ralenti', k: 'frost' }); }); },
    ai: (st, u, api) => { const d = api.dangerous(st); return d && !(d.frostCD > 0) && api.targetsOf(st, u).includes(d.uid) ? d.uid : null; },
  },
  soleil: {
    name: 'Dévorer le soleil', icon: 'devorer', ap: 2, cd: 3, target: 'enemy',
    desc: '220 % des dégâts sur un gardien ou une élite, 140 % sinon, +3 Brisure.',
    pv: (st, u, t, api) => api.dmgOf(st, u, t, t.boss || t.elite ? 2.2 : 1.4),
    run(st, u, t, ev, api) { const d = api.hurt(st, t, api.dmgOf(st, u, t, t.boss || t.elite ? 2.2 : 1.4), ev, u.uid); if (d && t.hp > 0) api.breakHit(st, t, 3, ev, u); },
    ai: (st, u, api) => { const t = api.front(st, 'enemy').find((x) => x.boss || x.elite); return t && api.targetsOf(st, u).includes(t.uid) ? t.uid : null; },
  },
  flammes: {
    name: 'Flammes de vie', icon: 'regen', ap: 1, cd: 3, target: 'ally',
    desc: 'Soigne un allié de 30 % de ses PV et lui donne +2 ATQ ce tour-ci.',
    run(st, u, t, ev, api) { api.heal(t, t.maxHp * 0.3, ev, u); t.boost = (t.boost || 0) + 2; ev.push({ t: 'status', u: t.uid, s: '+2 ATQ', k: 'heal' }); },
    ai: (st, u, api) => { const low = pickLow(api.front(st, 'ally')); return low && low.hp < low.maxHp * 0.6 ? low.uid : null; },
  },
};

// ——— Effets élémentaires : chaque effet n'est écrit qu'une fois ———
// Une compétence composée est une liste d'effets { op, on, m (multiplicateur), n (quantité), p (part des PV) }.
// on : 't' la cible, 'tn' la cible et un voisin, 'foes' tous les ennemis au combat, 'self' elle-même,
//      'ally' l'allié choisi, 'team' ton équipe au combat, 'low' ton allié le plus blessé.
// v : valeur de l'effet pour le budget de puissance (tools/gen-kits.mjs), par cible touchée.
const pct = (x) => `${Math.round(x * 100)} %`;
export const OPS = {
  hit: { v: (o) => o.m, run: (st, u, x, o, ev, api) => api.hurt(st, x, api.dmgOf(st, u, x, o.m), ev, u.uid, { pierce: !!o.pierce }) },
  poison: { v: (o) => 0.22 * o.n, run: (st, u, x, o, ev, api) => api.addPoison(st, x, o.n, ev, u) },
  slow: { v: () => 0.5, run: (st, u, x, o, ev) => { x.slow = true; ev.push({ t: 'status', u: x.uid, s: 'Ralenti', k: 'frost' }); } },
  freeze: { v: () => 1.3, run: (st, u, x, o, ev, api) => { if (!(x.frostCD > 0)) api.freeze(st, x, ev); else { x.slow = true; ev.push({ t: 'status', u: x.uid, s: 'Ralenti', k: 'frost' }); } } },
  brk: { v: (o) => 0.25 * o.n, run: (st, u, x, o, ev, api) => api.breakHit(st, x, o.n, ev, u) },
  mark: { v: () => 0.6, run: (st, u, x, o, ev, api) => { x.mark = Math.max(x.mark || 0, 2 + api.linger(st, u.uid)); x.markBy = u.uid; ev.push({ t: 'status', u: x.uid, s: 'Marquée', k: 'mark' }); } },
  shield: { v: () => 0.7, run: (st, u, x, o, ev) => { if (!x.shield) { x.shield = 1; ev.push({ t: 'status', u: x.uid, s: 'Bouclier', k: 'guard' }); } } },
  heal: { v: (o) => 4 * o.p, run: (st, u, x, o, ev, api) => api.heal(x, x.maxHp * o.p, ev, u) },
  boost: { v: (o) => 0.3 * o.n, run: (st, u, x, o, ev) => { x.boost = (x.boost || 0) + o.n; ev.push({ t: 'status', u: x.uid, s: `+${o.n} ATQ`, k: 'heal' }); } },
  defend: { v: () => 0.4, run: (st, u, x, o, ev) => { x.defend = true; ev.push({ t: 'status', u: x.uid, s: 'En défense', k: 'defend' }); } },
  taunt: { v: () => 1.1, run: (st, u, x, o, ev, api) => { api.taunt(st, x); ev.push({ t: 'status', u: x.uid, s: 'Tous sur elle !', syn: true, k: 'guard' }); } },
  cleanse: { v: () => 0.3, run: (st, u, x, o, ev) => { if (x.poison || x.frozen) { x.poison = 0; x.frozen = 0; ev.push({ t: 'status', u: x.uid, s: 'Purifiée', k: 'heal' }); } } },
  fervor: { v: (o) => 0.5 * o.n, run: (st, u, x, o, ev, api) => api.gainFervor(st, o.n, ev, 'Compétence') },
};
// Nombre moyen de cibles touchées, pour le budget
export const ON_COUNT = { t: 1, n: 0.8, tn: 1.8, foes: 2.4, self: 1, ally: 1, team: 2.6, low: 1 };
// Texte d'un effet, au présent, sujet « elle » (la créature)
const OP_TXT = {
  hit: (o) => ({ t: `frappe à ${pct(o.m)}`, tn: `frappe la cible et un voisin à ${pct(o.m)}`, foes: `frappe tous les ennemis à ${pct(o.m)}` }[o.on]),
  poison: (o) => (o.on === 'foes' ? `+${o.n} poison à tous les ennemis` : o.on === 'tn' ? `+${o.n} poison à la cible et à un voisin` : `+${o.n} poison`),
  slow: (o) => (o.on === 'foes' ? 'ralentit tous les ennemis' : o.on === 'tn' ? 'ralentit la cible et un voisin' : o.on === 'n' ? 'ralentit un voisin de la cible' : 'ralentit la cible'),
  freeze: () => 'gèle la cible',
  brk: (o) => `+${o.n} Brisure${o.on === 'foes' ? ' à chaque ennemi' : ''}`,
  mark: () => 'marque la cible (le prochain coup d’une autre créature : +50 % et +2 Brisure)',
  shield: (o) => ({ self: 'se donne un bouclier', ally: 'donne un bouclier à l’allié choisi', team: 'donne un bouclier à toute l’équipe', low: 'donne un bouclier à l’allié le plus blessé' }[o.on]),
  heal: (o) => ({ self: `se soigne de ${pct(o.p)}`, ally: `soigne l’allié choisi de ${pct(o.p)}`, team: `soigne toute l’équipe de ${pct(o.p)}`, low: `soigne l’allié le plus blessé de ${pct(o.p)}` }[o.on]),
  boost: (o) => ({ self: `gagne +${o.n} ATQ ce tour-ci`, ally: `donne +${o.n} ATQ à l’allié choisi ce tour-ci`, team: `donne +${o.n} ATQ à toute l’équipe ce tour-ci` }[o.on]),
  defend: () => 'se met en Défense',
  taunt: () => 'attire sur elle toutes les attaques du prochain tour ennemi',
  cleanse: (o) => (o.on === 'team' ? 'retire poison et gel de toute l’équipe' : 'retire poison et gel de l’allié choisi'),
  fervor: (o) => `+${o.n} Ferveur`,
};
const sentence = (parts) => { const p = parts.filter(Boolean); const t = p.length > 1 ? `${p.slice(0, -1).join(', ')} et ${p[p.length - 1]}` : p[0] || ''; return `${t.charAt(0).toUpperCase()}${t.slice(1)}.`; };
export const describeOps = (ops) => sentence(ops.map((o) => OP_TXT[o.op](o)));
// Valeur d'une compétence composée (budget de puissance)
export const opsValue = (ops) => ops.reduce((x, o) => x + OPS[o.op].v(o) * (ON_COUNT[o.on] || 1), 0);

// Cibles concrètes d'un effet
function opTargets(st, u, t, on, api) {
  const row = api.front(st, 'enemy');
  if (on === 't') return [t];
  if (on === 'tn' || on === 'n') { const i = row.indexOf(t); return [on === 'tn' ? t : null, row[i - 1] || row[i + 1]].filter(Boolean); }
  if (on === 'foes') return row;
  if (on === 'self') return [u];
  if (on === 'ally') return [t];
  if (on === 'team') return api.front(st, 'ally');
  if (on === 'low') return [pickLow(api.front(st, 'ally'))].filter(Boolean);
  return [];
}
// Une compétence composée → même forme qu'une compétence écrite à la main (MOVES)
const composed = new Map();
export function composeMove(spec) {
  if (composed.has(spec)) return composed.get(spec);
  const ops = spec.ops, first = ops[0];
  const onEnemy = ops.some((o) => ['t', 'tn', 'n'].includes(o.on)), onAlly = ops.some((o) => o.on === 'ally');
  const target = onEnemy ? (spec.reach ? 'anyEnemy' : 'enemy') : onAlly ? 'ally' : 'none';
  const hitT = ops.find((o) => o.op === 'hit' && ['t', 'tn'].includes(o.on));
  const M = {
    name: spec.name, icon: spec.icon, ap: spec.ap, cd: spec.cd, target, ops,
    desc: `${describeOps(ops)}${spec.reach ? ' Même derrière un Protecteur.' : ''}`,
    pv: hitT ? (st, u, t, api) => api.dmgOf(st, u, t, hitT.m) : null,
    run(st, u, t, ev, api) {
      const sets = ops.map((o) => opTargets(st, u, t, o.on, api));
      ops.forEach((o, i) => sets[i].forEach((x) => { if (x && x.hp > 0) OPS[o.op].run(st, u, x, o, ev, api); }));
    },
    // Quand l'IA la joue : selon son premier effet
    ai(st, u, api) {
      const foes = api.front(st, 'enemy'), allies = api.front(st, 'ally');
      const pickT = (f) => { const ok = (target === 'anyEnemy' ? foes : api.targetsOf(st, u).map((id) => st.units[id])).filter(f); return ok[0]?.uid || null; };
      if (first.op === 'heal' || first.op === 'cleanse') {
        if (first.on === 'team') return allies.filter((x) => x.hp < x.maxHp * 0.7).length >= 2 ? 'none' : null;
        const low = pickLow(allies);
        if (!low || low.hp >= low.maxHp * 0.55) return null;
        return target === 'ally' ? low.uid : target === 'none' ? 'none' : api.bestTarget(st, u);
      }
      if (['shield', 'taunt', 'defend'].includes(first.op)) {
        const th = api.threatened(st);
        if (!th) return null;
        if (first.op === 'taunt' && (th === u || u.hp < u.maxHp * 0.5)) return null;
        return target === 'ally' ? th.uid : target === 'none' ? 'none' : api.bestTarget(st, u);
      }
      if (first.op === 'freeze' || first.op === 'slow') {
        if (first.on === 'foes') return foes.length >= 2 && api.dangerous(st) ? 'none' : null;
        const d = api.dangerous(st);
        return d && !d.slow && !(d.frostCD > 0 && first.op === 'freeze') ? pickT((x) => x === d) : null;
      }
      if (first.op === 'mark') return pickT((x) => (x.boss || x.elite) && !x.mark);
      if (first.op === 'boost') return (st.init ? allies.filter((x) => x.uid !== u.uid && !x.acts).length >= 1 : allies.filter((x) => x.acts < 2).length >= 2 && st.ap >= 2) ? (target === 'ally' ? allies.sort((a, b) => b.atk - a.atk)[0].uid : 'none') : null;
      if (first.op === 'fervor') return st.fervor <= 3 ? 'none' : null;
      if (first.op === 'poison') return pickT((x) => (x.poison || 0) < 3 && (x.boss || x.elite || x.hp > 6));
      if (first.on === 'foes') return foes.length >= 2 ? 'none' : null;
      if (first.on === 'tn') return foes.length >= 2 ? api.bestTarget(st, u) : null;
      return target === 'anyEnemy' ? (pickT((x) => !api.targetsOf(st, u).includes(x.uid) && (x.boss || x.elite)) || null) : api.bestTarget(st, u);
    },
  };
  composed.set(spec, M);
  return M;
}

// ——— Lecture du kit d'une unité de combat ———
export const kitOf = (u) => (u && u.side === 'ally' && u.ck ? CREATURE_KITS[u.ck] : null);
export const hasPerk = (u, step) => !!kitOf(u) && (u.ckLv || 1) >= KIT_LEVELS[step];
export const awake = (u) => hasPerk(u, 'awaken');
// Clé d'action de la compétence propre : son nom de MOVES, ou 'own' pour une compétence composée
const moveKey = (k) => (typeof k.move === 'string' ? k.move : 'own');
export const moveOf = (u) => (hasPerk(u, 'move') && moveDefOf(kitOf(u)) ? moveKey(kitOf(u)) : null);
export const moveDefOf = (k) => (!k ? null : typeof k.move === 'string' ? MOVES[k.move] || null : k.move ? composeMove(k.move) : null);
// Définition de la compétence propre d'une unité, si c'est bien elle qu'on désigne par cette clé
export const moveFor = (u, key) => (key && moveOf(u) === key ? moveDefOf(kitOf(u)) : null);
// Passifs actifs : le passif (niveau 3), et le second passif à l'Éveil pour les créatures à deux capacités
export function passivesOf(u) {
  const k = kitOf(u);
  if (!k || (u.ckLv || 1) < KIT_LEVELS.passive) return [];
  const out = PASSIVES[k.passive] ? [k.passive] : [];
  if (k.passive2 && awake(u) && PASSIVES[k.passive2]) out.push(k.passive2);
  return out;
}
export const hasP = (u, key) => passivesOf(u).includes(key);
export const passiveOf = (u) => passivesOf(u)[0] || null;
// Passif renforcé par l'Éveil (seulement si l'Éveil n'apporte pas un second passif)
export const boosted = (u, key) => awake(u) && kitOf(u)?.passive === key && !kitOf(u).passive2 && hasP(u, key);
// Recharge (en tours) d'une compétence propre
// Apogée (niveau 10, créatures du joueur) : la compétence propre se recharge un tour plus vite
export const apogee = (u) => u.side !== 'enemy' && hasPerk(u, 'apogee');
export const rechargeOf = (u, key) => {
  const own = moveFor(u, key), M = own || MOVES[key], cd = M.recharge ? M.recharge(u, { awake }) : M.cd;
  return own && apogee(u) ? Math.max(1, cd - 1) : cd;
};
// Répartition attaque / PV d'une carte (fiche et duelUnit)
export const statShape = (id) => CREATURE_KITS[id]?.stat || { atk: 1, hp: 1 };

// Multiplicateur de dégâts dû aux passifs (attaquant et équipe), appliqué dans dmgOf
export function passiveMult(st, a, t, front) {
  let m = 1;
  if (a.side !== 'ally' || !t) return m;
  if (hasP(a, 'chasseur') && t.poison > 0) m *= 1.4;
  if (hasP(a, 'profondeurs') && (t.frozen > 0 || t.slow)) m *= 1.3;
  if (hasP(a, 'premiere') && t.hp >= t.maxHp) m *= boosted(a, 'premiere') ? 1.6 : 1.4;
  if (hasP(a, 'frenesie') && a.hp < a.maxHp / 2) m *= boosted(a, 'frenesie') ? 1.7 : 1.5;
  if (t.frozen > 0 || t.slow) {
    const seer = front(st, 'ally').find((x) => hasP(x, 'presage'));
    if (seer) m *= boosted(seer, 'presage') ? 1.4 : 1.25;
  }
  return m;
}

// v271 : Éveil tactique — à l'Éveil (niveau 9), la compétence propre gagne un effet lié au rôle de la créature
export const ROLE_AWAKEN = {
  degats: 'devient un coup de rupture (elle brise un ennemi Fêlé).',
  zone: 'devient un coup de rupture pour tous les ennemis touchés.',
  protecteur: 'charge sa riposte (+1).',
  soin: 'donne aussi +1 PA à ta créature la plus blessée.',
  poison: 'fait détoner un poison de 6 ou plus sur sa cible (poison × 1,5).',
  controle: 'retarde sa cible de 2 places dans l’ordre du tour.',
  soutien: 'fait jouer juste après elle ta créature la plus forte qui n’a pas encore joué.',
};
// ——— Présentation (fiche de la créature, Renforcer, montée de niveau) ———
export const moveIconUrl = (k) => `assets/pw/${k}.webp`;
// Passifs qui ont leur icône peinte (assets/icons/pp-<clé>.webp)
const PASSIVE_ART = new Set(['attiser', 'inebranlable', 'choeur', 'filaments', 'elue', 'presage', 'chasseur', 'colere', 'enfers', 'profondeurs', 'faim', 'renaissance', 'ruee', 'sentinelle', 'drain', 'premiere', 'eruption', 'malediction', 'benediction', 'egide', 'reliquat', 'commandement', 'engloutir', 'regeneration', 'venin', 'frenesie', 'blindage', 'augure', 'cataclysme', 'insaisissable', 'devoreur', 'effroi']);
export const passiveIconUrl = (k) => (PASSIVE_ART.has(k) ? `assets/icons/pp-${k}.webp` : null);
// Frappe : icône de la faction de la carte (préfixe de son numéro)
const FAC_OF = { INF: 'infernal', ABY: 'abyssal', CEL: 'celeste', SAU: 'sauvage', NEC: 'necrotique', ART: 'artificiel', PRI: 'primordial' };
export const strikeIconUrl = (id) => (FAC_OF[id.slice(0, 3)] ? `assets/icons/fs-${FAC_OF[id.slice(0, 3)]}.webp` : null);
// Les 4 étapes d'une créature, ouvertes ou non selon son niveau
export function kitSteps(id, level = 1) {
  const k = CREATURE_KITS[id];
  if (!k) return [];
  const P = PASSIVES[k.passive], M = moveDefOf(k), P2 = k.passive2 && PASSIVES[k.passive2];
  const RA = ROLE_AWAKEN[k.role];
  const aw = [P2 ? `Gagne un second passif, ${P2.name} : ${P2.desc}` : [P.awaken && `${P.name} : ${P.awaken}`, M.awaken && `${M.name} : ${M.awaken}`].filter(Boolean).join(' '), RA && `${M.name} ${RA}`].filter(Boolean).join(' ');
  return [
    { k: 'strike', kind: 'Frappe', name: k.strike.name, desc: k.strike.desc, img: strikeIconUrl(id) },
    { k: 'passive', kind: 'Passif', name: P.name, desc: P.desc, img: passiveIconUrl(k.passive) },
    { k: 'move', kind: 'Compétence', name: M.name, desc: M.desc, img: moveIconUrl(M.icon), cost: `${M.ap} PA · recharge ${M.cd} tours` },
    { k: 'awaken', kind: 'Éveil', name: 'Éveil', desc: aw, img: (P2 && passiveIconUrl(k.passive2)) || 'assets/icons/ck-eveil.webp' },
    { k: 'apogee', kind: 'Apogée', name: 'Apogée', desc: `${M.name} se recharge un tour plus vite${M.cd > 1 ? ` (${M.cd - 1} tour${M.cd > 2 ? 's' : ''} au lieu de ${M.cd})` : ''}, et la carte reçoit un cadre doré animé.`, img: 'assets/icons/ck-apogee.webp' },
  ].map((x) => ({ ...x, lv: KIT_LEVELS[x.k], open: level >= KIT_LEVELS[x.k] }));
}
export const nextUnlock = (id, level) => kitSteps(id, level).find((x) => !x.open) || null;
// Étape débloquée exactement à ce niveau (message de montée de niveau)
export const unlockAt = (id, level) => kitSteps(id, level).find((x) => x.lv === level && x.lv > 1) || null;
