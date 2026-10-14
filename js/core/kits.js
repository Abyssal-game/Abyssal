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

export const KIT_LEVELS = { strike: 1, passive: 3, move: 6, awaken: 9 };
export const KIT_STEPS = [
  { k: 'strike', lv: 1, name: 'Frappe' }, { k: 'passive', lv: 3, name: 'Passif' },
  { k: 'move', lv: 6, name: 'Compétence' }, { k: 'awaken', lv: 9, name: 'Éveil' },
];

// ——— Les 12 créatures du prototype ———
// stat : répartition attaque / PV (le produit reste proche de 1). strike : effets de la frappe.
// plus / moins / synergy : la fiche « Forces, faiblesses, alliés ».
export const CREATURE_KITS = {
  'INF-001': {
    style: 'Harceleur', stat: { atk: 1.1, hp: 0.9 },
    strike: { name: 'Griffe de braise', desc: 'Dégâts normaux, +1 Brisure.', brk: 1 },
    passive: 'attiser', move: 'gerbe',
    plus: 'Rapide à remplir la Ferveur sur les cibles marquées ou brisées.', moins: 'Fragile, peu de PV.', synergy: 'Marque du chasseur, Brisure, Entraveurs.',
  },
  'NEC-001': {
    style: 'Rempart increvable', stat: { atk: 0.9, hp: 1.12 },
    strike: { name: 'Coup de bouclier', desc: 'Dégâts normaux, +1 Brisure en plus.' },
    passive: 'inebranlable', move: 'murdos',
    plus: 'Survit une fois à un coup mortel par combat.', moins: 'Dégâts faibles.', synergy: 'Soigneurs (Bastion), Défense.',
  },
  'CEL-001': {
    style: 'Voix de l’équipe', stat: { atk: 0.92, hp: 1.08 },
    strike: { name: 'Note claire', desc: '70 % des dégâts, et soigne de 2 l’allié le plus blessé.', mult: 0.7, healLowest: 2 },
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
    style: 'Gardien qui rend les coups', stat: { atk: 1.05, hp: 0.96 },
    strike: { name: 'Masse ardente', desc: '120 % des dégâts, +1 Brisure en plus.', mult: 1.2 },
    passive: 'colere', move: 'represailles',
    plus: 'Plus il protège, plus il frappe fort.', moins: 'Doit encaisser pour briller.', synergy: 'Soigneurs, Rempart sur l’allié menacé.',
  },
  'SAU-043': {
    style: 'Trois têtes, un portail', stat: { atk: 0.97, hp: 1.04 },
    strike: { name: 'Triple morsure', desc: 'Trois morsures à 45 % : chacune profite de l’Enchaînement, et chaque morsure en plus ajoute 1 Brisure.', hits: 3, mult: 0.45 },
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
    strike: { name: 'Croc du loup', desc: 'Dégâts normaux, +50 % sur une cible sous la moitié de ses PV.', lowBonus: 0.5 },
    passive: 'faim', move: 'soleil',
    plus: 'Dévastateur contre les gardiens et les élites ; chaque proie le renforce.', moins: 'Sans proie à achever, il s’essouffle.', synergy: 'Marque, Brisure, poison qui affaiblit.',
  },
  'CEL-031': {
    style: 'Flamme qui renaît', stat: { atk: 0.95, hp: 1.05 },
    strike: { name: 'Plume ardente', desc: 'Dégâts normaux ; soigne l’allié le plus blessé de 30 % des dégâts.', lifeShare: 0.3 },
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
  presage: { name: 'Présage funeste', desc: 'Tant qu’elle est au combat, ton équipe fait +25 % de dégâts aux ennemis ralentis ou gelés.', awaken: '+40 %.' },
  chasseur: { name: 'Venin du chasseur', desc: '+40 % de dégâts sur les cibles empoisonnées.', awaken: 'Quand sa cible meurt, son poison passe à un ennemi voisin.' },
  colere: { name: 'Colère du gardien', desc: 'Chaque coup encaissé à la place d’un allié (Rempart) : +1 ATQ pour le combat (3 au plus).', awaken: '5 au plus.' },
  enfers: { name: 'Gardien des Enfers', desc: 'Un ennemi qui frappe une créature qu’il protège (Rempart), ou qui le frappe pendant son Hurlement, subit 3 dégâts.', awaken: '5 dégâts et +1 Brisure.' },
  profondeurs: { name: 'Profondeurs', desc: 'Ses coups font +30 % de dégâts aux ennemis gelés ou ralentis.', awaken: 'Étreinte se recharge en 2 tours au lieu de 3.' },
  faim: { name: 'Faim sans fin', desc: 'Chaque ennemi qu’il achève : +1 ATQ (pour le combat) et 20 % de PV rendus.', awaken: 'Et il peut agir une fois de plus ce tour-ci.' },
  renaissance: { name: 'Renaissance', desc: 'Une fois par combat, se relève avec 40 % de ses PV.', awaken: 'En renaissant, soigne toute l’équipe de 15 %.' },
};

// ——— Compétences propres (débloquées au niveau 6) ———
// Elles ne coûtent pas de Ferveur (réservée aux compétences de rôle et au pouvoir d'équipe) :
// après usage, elles se rechargent pendant cd tours. ap : actions de l'équipe dépensées.
// target : 'enemy' | 'ally' | 'none' | 'anyEnemy' (même derrière une Garde). ai(st, u, api) : cible conseillée, ou null.
const pickLow = (list) => list.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
export const MOVES = {
  gerbe: {
    name: 'Gerbe d’étincelles', icon: 'brasier', ap: 1, cd: 2, target: 'enemy',
    desc: 'Frappe la cible et un ennemi voisin, chacun à 70 % de son attaque.',
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
    desc: 'Soigne toute ton équipe au combat de 15 % de ses PV.', awaken: 'Retire aussi le poison.',
    run(st, u, t, ev, api) { api.front(st, 'ally').forEach((x) => { api.heal(x, x.maxHp * 0.15, ev, u); if (api.awake(u) && x.poison) { x.poison = 0; ev.push({ t: 'status', u: x.uid, s: 'Purifiée', k: 'heal' }); } }); },
    ai: (st, u, api) => (api.front(st, 'ally').filter((x) => x.hp < x.maxHp * 0.7).length >= 2 ? 'none' : null),
  },
  encre: {
    name: 'Nuage d’encre', icon: 'linceul', ap: 1, cd: 2, target: 'enemy',
    desc: 'Frappe à 60 % ; la cible est ralentie (sa prochaine attaque fait moitié moins mal) et reçoit 2 poison.',
    pv: (st, u, t, api) => api.dmgOf(st, u, t, 0.6),
    run(st, u, t, ev, api) { api.hurt(st, t, api.dmgOf(st, u, t, 0.6), ev, u.uid); if (t.hp <= 0) return; t.slow = true; ev.push({ t: 'status', u: t.uid, s: 'Ralentie', k: 'frost' }); api.addPoison(st, t, 2, ev, u); },
    ai: (st, u, api) => { const d = api.dangerous(st); return d && !d.slow ? d.uid : null; },
  },
  plongeon: {
    name: 'Plongeon', icon: 'charge', ap: 1, cd: 3, target: 'enemy',
    desc: 'Coup sûr, sans dé : 160 % des dégâts et +2 Brisure.', awaken: '220 % sur une cible sous 30 % de ses PV ou brisée.',
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
    desc: 'Frappe n’importe quel ennemi, même derrière une Garde : dégâts normaux et +3 poison.',
    pv: (st, u, t, api) => api.dmgOf(st, u, t, 1),
    run(st, u, t, ev, api) { api.hurt(st, t, api.dmgOf(st, u, t, 1), ev, u.uid, { pierce: true }); if (t.hp > 0) api.addPoison(st, t, 3, ev, u); },
    // utile surtout pour atteindre ce qu'une Garde protège : un dangereux, un gardien, une élite
    ai: (st, u, api) => { const d = api.dangerous(st); const f = api.front(st, 'enemy').filter((x) => !api.targetsOf(st, u).includes(x.uid) && (x === d || x.boss || x.elite || x.hp <= api.dmgOf(st, u, x, 1)))[0]; return f ? f.uid : null; },
  },
  represailles: {
    name: 'Représailles', icon: 'martel', ap: 1, cd: 2, target: 'enemy',
    desc: 'Frappe avec son attaque + la moitié des dégâts encaissés au dernier tour ennemi (8 au plus), +2 Brisure.',
    pv: (st, u, t, api) => api.dmgOf(st, u, t, 1) + Math.min(8, Math.round((u.absorbed || 0) / 2)),
    run(st, u, t, ev, api) { const extra = Math.min(8, Math.round((u.absorbed || 0) / 2)); u.absorbed = 0; const d = api.hurt(st, t, api.dmgOf(st, u, t, 1) + extra, ev, u.uid); if (extra) ev.push({ t: 'status', u: u.uid, s: `Représailles +${extra}`, syn: true }); if (d && t.hp > 0) api.breakHit(st, t, 2, ev, u); },
    ai: (st, u, api) => ((u.absorbed || 0) >= 6 ? api.bestTarget(st, u) : null),
  },
  hurlement: {
    name: 'Hurlement', icon: 'provoc', ap: 1, cd: 3, target: 'none',
    desc: 'Tous les ennemis le visent à leur prochain tour, et il se met en Défense.', awaken: 'Et ton équipe gagne +1 ATQ ce tour-ci.',
    run(st, u, t, ev, api) { u.taunt = st.round; u.defend = true; api.front(st, 'enemy').forEach((e) => { if (e.intent?.t && st.units[e.intent.t]?.side === 'ally') e.intent = { ...e.intent, t: u.uid }; }); ev.push({ t: 'status', u: u.uid, s: 'Hurlement : tous sur lui !', syn: true, k: 'guard' }); if (api.awake(u)) api.front(st, 'ally').forEach((x) => { x.boost = (x.boost || 0) + 1; }); },
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
    desc: '220 % des dégâts sur un gardien ou une élite, 140 % sinon, +3 Brisure.',
    pv: (st, u, t, api) => api.dmgOf(st, u, t, t.boss || t.elite ? 2.2 : 1.4),
    run(st, u, t, ev, api) { const d = api.hurt(st, t, api.dmgOf(st, u, t, t.boss || t.elite ? 2.2 : 1.4), ev, u.uid); if (d && t.hp > 0) api.breakHit(st, t, 3, ev, u); },
    ai: (st, u, api) => { const t = api.front(st, 'enemy').find((x) => x.boss || x.elite); return t && api.targetsOf(st, u).includes(t.uid) ? t.uid : null; },
  },
  flammes: {
    name: 'Flammes de vie', icon: 'regen', ap: 1, cd: 3, target: 'ally',
    desc: 'Soigne un allié de 30 % de ses PV et lui donne +2 ATQ ce tour-ci.',
    run(st, u, t, ev, api) { api.heal(t, t.maxHp * 0.3, ev, u); t.boost = (t.boost || 0) + 2; ev.push({ t: 'status', u: t.uid, s: '+2 ATQ', k: 'heal' }); },
    ai: (st, u, api) => { const low = pickLow(api.front(st, 'ally')); return low && low.hp < low.maxHp * 0.6 ? low.uid : null; },
  },
};

// ——— Lecture du kit d'une unité de combat ———
export const kitOf = (u) => (u && u.side === 'ally' && u.ck ? CREATURE_KITS[u.ck] : null);
export const hasPerk = (u, step) => !!kitOf(u) && (u.ckLv || 1) >= KIT_LEVELS[step];
export const moveOf = (u) => (hasPerk(u, 'move') && MOVES[kitOf(u).move] ? kitOf(u).move : null);
export const passiveOf = (u) => (hasPerk(u, 'passive') && PASSIVES[kitOf(u).passive] ? kitOf(u).passive : null);
export const awake = (u) => hasPerk(u, 'awaken');
// Recharge (en tours) d'une compétence propre
export const rechargeOf = (u, key) => (MOVES[key].recharge ? MOVES[key].recharge(u, { awake }) : MOVES[key].cd);
// Répartition attaque / PV d'une carte (fiche et duelUnit)
export const statShape = (id) => CREATURE_KITS[id]?.stat || { atk: 1, hp: 1 };

// Multiplicateur de dégâts dû aux passifs (attaquant et équipe), appliqué dans dmgOf
export function passiveMult(st, a, t, front) {
  let m = 1;
  if (a.side !== 'ally' || !t) return m;
  const p = passiveOf(a);
  if (p === 'chasseur' && t.poison > 0) m *= 1.4;
  if (p === 'profondeurs' && (t.frozen > 0 || t.slow)) m *= 1.3;
  if (t.frozen > 0 || t.slow) {
    const seer = front(st, 'ally').find((x) => passiveOf(x) === 'presage');
    if (seer) m *= awake(seer) ? 1.4 : 1.25;
  }
  return m;
}

// ——— Présentation (fiche de la créature, Renforcer, montée de niveau) ———
export const moveIconUrl = (k) => `assets/salles/pw/${k}.webp`;
// Les 4 étapes d'une créature, ouvertes ou non selon son niveau
export function kitSteps(id, level = 1) {
  const k = CREATURE_KITS[id];
  if (!k) return [];
  const P = PASSIVES[k.passive], M = MOVES[k.move];
  const aw = [P.awaken && `${P.name} : ${P.awaken}`, M.awaken && `${M.name} : ${M.awaken}`].filter(Boolean).join(' ');
  return [
    { k: 'strike', kind: 'Frappe', name: k.strike.name, desc: k.strike.desc },
    { k: 'passive', kind: 'Passif', name: P.name, desc: P.desc },
    { k: 'move', kind: 'Compétence', name: M.name, desc: M.desc, icon: M.icon, cost: `${M.ap} action${M.ap > 1 ? 's' : ''} · recharge ${M.cd} tours` },
    { k: 'awaken', kind: 'Éveil', name: 'Éveil', desc: aw },
  ].map((x) => ({ ...x, lv: KIT_LEVELS[x.k], open: level >= KIT_LEVELS[x.k] }));
}
export const nextUnlock = (id, level) => kitSteps(id, level).find((x) => !x.open) || null;
// Étape débloquée exactement à ce niveau (message de montée de niveau)
export const unlockAt = (id, level) => kitSteps(id, level).find((x) => x.lv === level && x.lv > 1) || null;
