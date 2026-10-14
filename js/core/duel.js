// ABYSSAL : moteur du combat tactique. Logique pure (état JSON sauvegardé, reprise exacte).
//
// Tour du joueur : 3 points d'action (PA) partagés par l'équipe. Chaque créature au combat peut
// attaquer (1 PA, +1 Ferveur), lancer sa compétence signature (PA + Ferveur, parfois un jet de D20),
// se défendre (1 PA) ou permuter avec la réserve (1 PA, une fois par tour). La Ferveur (6 au plus)
// est commune à l'équipe et gardée d'un combat à l'autre ; le pouvoir d'équipe la vide.
// Tour ennemi : chaque ennemi exécute l'intention annoncée. Les attaques dangereuses déclenchent la
// défense active (esquive, ou parade parfaite qui rend de la Ferveur et brise l'attaquant).
// Élites et gardiens ont une jauge de Brisure : vide, l'ennemi perd son action et devient vulnérable.
import { roleOf } from './army.js';
import {
  AP_MAX, FERVOR_MAX, ACTS_PER_UNIT, ULT_COST, KITS, COMMON_ACTS, WEAK_TO, WEAK_MULT, RESIST_MULT,
  aiFamily, INTENTS, BOSS_POWERS, bossPowerOf, diceChance, KEYWORDS, keywordOf, SYNERGIES,
} from './skills.js';
import { BOSSES, LAWS, ASPECTS } from './bosses.js';
import { familyOf, relationMult, activeLegends } from './relations.js';
import { FORMS } from './forms.js';
import { CREATURE_KITS, kitOf, moveOf, moveFor, hasP, boosted, awake, statShape, passiveMult, rechargeOf } from './kits.js';

export { KEYWORDS, keywordOf, INTENTS, BOSS_POWERS, bossPowerOf, SYNERGIES, FERVOR_MAX, AP_MAX, BOSSES, LAWS, ASPECTS };
export const FRONT = 3;
export const GAUGE_MAX = FERVOR_MAX; // compatibilité : l'ancienne jauge du pouvoir est devenue la Ferveur
export const PACK_BONUS = 1;         // Instinct de meute : les Communes frappent plus fort élites et gardiens

const KW_BY_ROLE = { protecteur: 'garde', degats: 'assaut', soin: 'soin', poison: 'venin', controle: 'gel', soutien: 'cri', zone: 'deferlante' };
const FAM_BY_ROLE = { protecteur: 'protecteur', soin: 'soutien', poison: 'parasite', controle: 'controleur', soutien: 'soutien', zone: 'mage' };
// Gabarit par rôle à la rareté Commune, niveau 1 : [attaque, PV]
const BASE = { protecteur: [2, 12], degats: [4, 7], soin: [2, 8], poison: [2, 8], controle: [2, 8], soutien: [2, 9], zone: [2, 7] };
const RARITY_MULT = { C: 1, PC: 1.15, R: 1.3, HR: 1.45, M: 1.6, S: 1.75 };
// Bonus au jet de l'Entrave glaciale (rôle contrôle) selon la rareté
export const FROST_MASTERY = { R: 1, HR: 2, M: 3, S: 4 };
const SINGLE = ['hit', 'heavy', 'poison', 'frost', 'gorge'];
// Intentions spéciales des gardiens (comptent comme « actions spéciales » pour le Pacte du Reflet)
const SPECIAL = ['heavy', 'blast', 'shield', 'heal', 'rally', 'hunt', 'charge', 'channel', 'gorge', 'gather', 'blizzard', 'mimic', 'copy', 'decree', 'shift'];

let seq = 0;
// Une carte de combat. scale : force (niveau pour les alliés, profondeur pour les ennemis).
export function duelUnit(card, { side = 'ally', level = 1, scale = null, boss = false, elite = false, form = null } = {}) {
  const role = roleOf(card), [a, h] = BASE[role];
  const fm = side === 'ally' && form ? FORMS[card.id] : null;
  const k = RARITY_MULT[card.rarity] * (scale ?? (1 + 0.08 * (level - 1)));
  // identité de la créature (alliés) : sa répartition attaque / PV, à budget égal
  const ck = side === 'ally' && CREATURE_KITS[card.id] ? card.id : null, sh = ck ? statShape(ck) : { atk: 1, hp: 1 };
  const atk = Math.max(1, Math.round(a * k * sh.atk * (boss ? 1.25 : 1)));
  const hp = Math.max(1, Math.round(h * k * sh.hp * (boss ? 3 : elite ? 1.6 : 1)));
  const brkMax = boss ? 10 : elite ? 6 : 0;
  return {
    uid: `${side[0]}${++seq}`, id: card.id, name: card.name, side, rarity: card.rarity, faction: card.faction, role, kw: KW_BY_ROLE[role],
    fam: side === 'enemy' ? aiFamily(card, { boss }) : null,
    atk, hp, maxHp: hp, level, boss, elite, poison: 0, frozen: 0, frostCD: 0, boost: 0, shield: 0, acts: 0, intent: null,
    brk: brkMax, brkMax, broken: false, mark: 0, family: familyOf(card),
    ...(ck ? { ck, ckLv: level } : {}),
    ...(fm ? { form: fm.passive, name: fm.name, atk: Math.max(1, atk + fm.atk), hp: Math.max(1, Math.round(hp * fm.hp)), maxHp: Math.max(1, Math.round(hp * fm.hp)) } : {}),
  };
}

// ——— Hasard : générateur enregistré dans l'état (équitable, reproductible après rechargement) ———
export function rand(st) {
  st.seed = (st.seed + 0x6D2B79F5) | 0;
  let t = st.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const d20 = (st) => 1 + Math.floor(rand(st) * 20);

// ——— État ———
export function createDuel(allies, enemies, { gauge = 0, fervor = gauge, ult = 'sceau', power = 1, known = {}, ruleMult = 1, bossPower = null, boss = null, pact = null, relics = [], blessings = [], seed = null, discovered = {}, goal = null } = {}) {
  const st = {
    ver: 2, units: {}, order: { ally: [], enemy: [] }, turn: 'ally', round: 1, ap: AP_MAX,
    fervor: Math.min(FERVOR_MAX, fervor + (blessings.includes('ferveur') ? 1 : 0)), gauge: 0,
    ult, power, known, ruleMult, bossPower, blessings, over: null, kills: [], swapped: false,
    freeSwap: blessings.includes('relais'), sursis: blessings.includes('sursis'), queue: [], skipEv: [], discovered: { ...discovered },
    seed: seed ?? Math.floor(Math.random() * 2 ** 31), stats: { parries: 0, dodges: 0, breaks: 0, crits: 0, fumbles: 0, interrupts: 0, feasts: 0 },
    bossKey: boss && BOSSES[boss] ? boss : null, law: null, aspect: null, pact: pact || null, relics: relics.slice(), relSeen: {}, bossLog: [], legends: [],
    goal: goal && GOALS[goal] ? goal : null,
  };
  for (const u of [...allies, ...enemies]) { st.units[u.uid] = { ...u }; st.order[u.side].push(u.uid); }
  setupExtras(st);
  ['ally', 'enemy'].forEach((side) => front(st, side).forEach((u) => { u.inPlay = true; }));
  openingPassives(st);
  st.gauge = st.fervor;
  startAllyTurn(st, []);
  return st;
}
// Gardien, pacte, reliques, légendes et formes : préparation au début du combat
function setupExtras(st) {
  const allies = st.order.ally.map((id) => st.units[id]);
  const scaleHp = (u, k) => { u.maxHp = Math.max(1, Math.round(u.maxHp * k)); u.hp = Math.min(u.maxHp, Math.max(1, Math.round(u.hp * k))); };
  if (st.bossKey === 'eclipse') { st.aspect = 'soleil'; st.order.enemy.forEach((id) => { if (st.units[id].boss) st.units[id].aspect = 'soleil'; }); }
  // Légendes : plusieurs créatures d'un même mythe dans l'équipe
  st.legends = activeLegends(allies.map((u) => u.id));
  for (const L of st.legends) {
    st.relSeen[L.key] = true;
    allies.filter((u) => L.members.includes(u.id)).forEach((u) => { u.atk += L.members.length >= 3 ? 2 : 1; scaleHp(u, 1.1); u.legend = L.key; });
  }
  allies.forEach((u) => { if (u.talent === 'garde') u.shield = 1; });
  // Formes corrompues
  allies.forEach((u) => { if (u.form === 'rebirth') { u.hp = Math.max(1, Math.round(u.maxHp * 0.7)); u.reborn = false; } });
  // Pactes
  if (st.pact === 'reflet') st.fervor = Math.max(0, st.fervor - 2);
  if (st.pact === 'cendre') { st.fervor = FERVOR_MAX; allies.forEach((u) => { u.healMult = 0.5; }); }
  if (st.pact === 'ombre') allies.forEach((u) => scaleHp(u, 0.8));
  if (st.pact === 'gardien') st.guardianPact = true;
  // Reliques (Chasse aux Reliques)
  const R_ = st.relics || [];
  if (R_.includes('coeur')) allies.forEach((u) => scaleHp(u, 1.35));
  if (R_.includes('sablier')) allies.forEach((u) => scaleHp(u, 0.9));
  if (R_.includes('dent')) st.fervor = Math.max(0, st.fervor - 1);
  if (R_.includes('oeil')) st.order.enemy.forEach((id) => { const f = st.units[id].faction; if (f) st.discovered[f] = true; });
  st.miroir = R_.includes('miroir');
  st.gauge = st.fervor;
}
// Un passif d'identité vient d'agir : l'écran montre son icône sur la carte
const pfx = (ev, u, p) => ev.push({ t: 'passive', u: u.uid, p });
// Passifs qui agissent au début du combat (créatures au combat) : Égide, Augure, Engloutir, Éruption, Cataclysme
function openingPassives(st) {
  const ev = [];
  const strongest = () => front(st, 'enemy').slice().sort((x, y) => y.atk - x.atk)[0];
  for (const u of front(st, 'ally')) {
    if (hasP(u, 'egide')) u.shield = 1;
    if (hasP(u, 'augure') && st.fervor < (boosted(u, 'augure') ? 4 : 3)) gainFervor(st, 1, ev, 'Augure');
    if (hasP(u, 'engloutir')) { const e = strongest(); if (e) e.slow = true; }
    if (hasP(u, 'eruption')) { const e = strongest(); if (e) hurt(st, e, dmgOf(st, u, e, boosted(u, 'eruption') ? 1 : 0.6), ev, u.uid); }
    if (hasP(u, 'cataclysme')) front(st, 'enemy').forEach((e) => hurt(st, e, dmgOf(st, u, e, boosted(u, 'cataclysme') ? 0.5 : 0.3), ev, u.uid));
  }
  st.openEv = ev.filter((e) => e.t !== 'status');
  check(st, []);
}
// Ancienne sauvegarde (combat en cours avant la refonte) : on complète l'état et on reprend au tour du joueur.
export function upgradeDuel(st) {
  if (!st || st.ver === 2) return st;
  Object.assign(st, { ver: 2, ap: AP_MAX, fervor: Math.min(FERVOR_MAX, st.gauge || 0), blessings: [], discovered: {}, queue: [], skipEv: [], swapped: false });
  st.seed = Math.floor(Math.random() * 2 ** 31);
  st.stats = { parries: 0, dodges: 0, breaks: 0, crits: 0, fumbles: 0 };
  for (const u of Object.values(st.units)) {
    Object.assign(u, { acts: 0, frostCD: u.frostCD || 0, mark: 0, broken: false, charged: null, exposed: false, intent: null });
    u.role = u.role || 'degats';
    if (u.side === 'enemy') { u.fam = u.boss ? 'gardien' : FAM_BY_ROLE[u.role] || 'predateur'; u.brkMax = u.boss ? 10 : u.elite ? 6 : 0; u.brk = u.brkMax; }
  }
  if (!st.over) startAllyTurn(st, []);
  return st;
}

export const alive = (st, side) => st.order[side].map((id) => st.units[id]).filter((u) => u.hp > 0 && !u.swallowed);
export const front = (st, side) => alive(st, side).slice(0, FRONT);
export const reserve = (st, side) => alive(st, side).slice(FRONT);
const other = (side) => (side === 'ally' ? 'enemy' : 'ally');
const has = (st, b) => (st.blessings || []).includes(b);
const inFront = (st, u) => !!u && u.hp > 0 && front(st, u.side).includes(u);

// Multiplicateur de faction : faiblesse ×1,5 ; même faction ×0,75
export function factionMult(a, t) {
  if (t?.mask && a?.faction === t.mask) return 0.5; // Roi sans Visage (phase 2) : il porte le visage de son dernier agresseur
  if (t?.aspect && a?.faction && ASPECTS[t.aspect]) return ASPECTS[t.aspect].weak.includes(a.faction) ? 1.6 : ASPECTS[t.aspect].resist.includes(a.faction) ? 0.5 : t.totality ? 0.6 : 1;
  if (!a?.faction || !t?.faction) return 1;
  if (WEAK_TO[t.faction] === a.faction) return WEAK_MULT;
  if (a.faction === t.faction) return RESIST_MULT;
  return 1;
}
export const isWeak = (a, t) => factionMult(a, t) > 1;

// Dégâts d'une attaque (avant bouclier) : compétence, faiblesses, marque, Brisure, postures
export function dmgOf(st, a, t, mult = 1, { basic = false } = {}) {
  let n = a.atk + (a.boost || 0);
  if (a.side === 'ally' && st.known?.[t.id]) n += 1;
  if (a.side === 'ally' && a.rarity === 'C' && (t.boss || t.elite)) n += PACK_BONUS;
  const flat = n * mult;
  n *= mult * (st.ruleMult || 1) * factionMult(a, t);
  if (t.mark) n *= 1.3;
  if (t.broken) n *= 1.5;
  if (t.broken && basic && a.side === 'ally' && has(st, 'curee')) n *= 1.5;
  if (a.role === 'degats' && a.side === 'ally' && (t.broken || t.hp <= t.maxHp * 0.3)) n *= 1.5; // Exécution
  if (a.fam === 'berserker' && a.hp < a.maxHp / 2) n *= 1.5;
  if (a.slow) n *= 0.5;
  if (t.defend) n *= 0.5;
  if (t.exposed) n *= 1.25;
  if (t.prey && a.side === 'enemy') n *= 1.2; // proie désignée par un ennemi
  n *= passiveMult(st, a, t, front); // passifs des créatures (Venin du chasseur, Présage, Profondeurs, Frénésie…)
  if (a.side === 'enemy' && !a.boss && !a.elite && hasP(t, 'effroi')) n *= boosted(t, 'effroi') ? 0.7 : 0.8;
  if (a.side === 'enemy' && hasP(t, 'blindage')) n *= boosted(t, 'blindage') ? 0.8 : 0.88;
  n *= relationMult(a, t).m;
  const R_ = st.relics || [];
  if (a.side === 'ally') {
    if (st.pact === 'sang') n *= 1.3;
    if (st.pact === 'ombre' && !st.ombreUsed) n *= 1.5;
    if (R_.includes('dent') && (t.boss || t.elite)) n *= 1.3;
    if (a.form === 'frenzy' && st.order.ally.some((id) => st.units[id].hp <= 0)) n *= 1.5;
    if (R_.includes('couronne')) n += Math.min(3, Math.floor(teamLoss(st) / 0.25)) * mult;
  } else {
    if (st.law === 'hate') n *= 1.3;
    if (R_.includes('oeil')) n *= 1.15;
  }
  // les bonus situationnels se cumulent, mais jamais au-delà de ×3 la force de base du coup
  n = Math.min(n, flat * MULT_CAP);
  if (t.boss && st.law === 'fer' && !t.broken) n *= 0.6;
  if (a.side === 'ally' && t.side === 'enemy' && mult > 0) n += comboOf(st, a, t);
  return mult > 0 ? Math.max(1, Math.round(n)) : 0;
}
// Enchaînement : +1 dégât par autre créature de ton équipe qui a déjà frappé cette cible ce tour-ci (+2 au plus)
export const COMBO_MAX = 2;
export function comboOf(st, a, t) {
  const by = st.hitBy?.[t.uid];
  return by ? Math.min(COMBO_MAX, by.filter((x) => x !== a.uid).length) : 0;
}
// Part des PV perdus par toute l'équipe (0 à 1), pour la Couronne des Cendres
function teamLoss(st) {
  const all = st.order.ally.map((id) => st.units[id]);
  const max = all.reduce((x, u) => x + u.maxHp, 0) || 1;
  return 1 - all.reduce((x, u) => x + Math.max(0, u.hp), 0) / max;
}

// ——— Effets élémentaires ———
// Un seul coup ne retire jamais plus de 40 % des PV max d'un gardien (les cumuls de bonus restent forts, sans tuer en un coup)
export const BOSS_HIT_CAP = 0.4;
const bossCap = (u) => Math.max(1, Math.round(u.maxHp * BOSS_HIT_CAP));
export const MULT_CAP = 3;
// Tes créatures : un coup normal retire au plus 45 % de leurs PV max, un coup annoncé (chargé, déflagration…) 75 %
export const ALLY_HIT_CAP = 0.45, ALLY_BIG_CAP = 0.75;
const BIG = ['heavy', 'blast', 'gorge', 'blizzard', 'copy'];
export const allyCap = (u, kind) => Math.max(1, Math.round(u.maxHp * (BIG.includes(kind) ? ALLY_BIG_CAP : ALLY_HIT_CAP)));
function hurt(st, u, n, ev, src = null, { pierce = false } = {}) {
  if (u.hp <= 0 || n <= 0) return 0;
  if (u.boss && u.side === 'enemy') n = Math.min(n, bossCap(u));
  if (u.side === 'ally' && src && st.units[src]?.side === 'enemy') n = Math.min(n, allyCap(u, st.curKind));
  if (u.shield && pierce) { u.shield = 0; ev.push({ t: 'status', u: u.uid, s: 'Perce-bouclier', syn: true }); }
  if (u.shield) { u.shield = 0; ev.push({ t: 'block', u: u.uid }); return 0; }
  // Sceau du Gardien : absorbe les dégâts jusqu'à épuisement
  if (u.ward > 0) {
    const took = Math.min(u.ward, Math.round(n));
    u.ward -= took; n = Math.round(n) - took;
    ev.push({ t: 'status', u: u.uid, s: u.ward ? `Sceau −${took} (${u.ward})` : 'Le Sceau se brise', k: 'guard' });
    if (n <= 0) return 0;
  }
  // Carapace de glace (Matriarche, phase 2) : absorbe les coups ; l'Infernal la fait fondre deux fois plus vite
  if (u.ice > 0) {
    const s0 = src && st.units[src];
    const k = s0?.faction === 'infernal' ? 2 : 1, took = Math.min(u.ice, Math.round(n) * k);
    u.ice -= took; ev.push({ t: 'status', u: u.uid, s: u.ice ? `Glace −${took} (${u.ice})` : 'La glace vole en éclats !', k: 'frost', syn: !u.ice });
    n = Math.max(0, Math.round(n) - Math.ceil(took / k));
    if (n <= 0) return 0;
  }
  let d = Math.min(u.hp, Math.round(n));
  if (u.side === 'ally' && d >= u.hp && d > 0 && u.hp > 1 && hasP(u, 'inebranlable') && !u.ckSaved) {
    u.ckSaved = true; d = u.hp - 1; if (boosted(u, 'inebranlable')) u.shield = 1;
    pfx(ev, u, 'inebranlable'); ev.push({ t: 'status', u: u.uid, s: 'Inébranlable !', syn: true, k: 'guard' });
  }
  if (u.side === 'ally' && d >= u.hp && st.sursis) { st.sursis = false; d = u.hp - 1; u.shield = 1; ev.push({ t: 'status', u: u.uid, s: 'Sursis !', syn: true }); }
  u.hp -= d;
  if (d > 0) ev.push({ t: 'dmg', u: u.uid, d, hp: u.hp, src });
  const a = src && st.units[src];
  if (a && d > 0 && a.side === 'ally' && u.side === 'enemy' && st.turn === 'ally') {
    const by = ((st.hitBy ||= {})[u.uid] ||= []);
    const combo = comboOf(st, a, u);
    if (!by.includes(a.uid)) by.push(a.uid);
    if (combo > 0) { st.stats.combos = (st.stats.combos || 0) + 1; ev.push({ t: 'combo', u: u.uid, n: combo + 1 }); }
  }
  if (a && d > 0 && a.side === 'enemy' && u.side === 'ally') { (st.taken ||= {})[a.uid] = ((st.taken || {})[a.uid] || 0) + d; u.absorbed = (u.absorbed || 0) + d; }
  // Talents d'expédition
  if (a && d > 0 && a.side === 'ally' && a.talent === 'sangsue' && a.hp > 0) heal(a, Math.max(1, Math.round(d * 0.3)), ev);
  if (a && d > 0 && a !== u && a.side === 'ally' && a.hp > 0 && hasP(a, 'drain')) heal(a, Math.max(1, Math.round(d * (boosted(a, 'drain') ? 0.3 : 0.2))), ev);
  // Bénédiction : un allié qui passe sous 30 % de ses PV est soigné (une ou deux fois par combat)
  if (u.side === 'ally' && d > 0 && u.hp > 0 && u.hp < u.maxHp * 0.3 && u.hp + d >= u.maxHp * 0.3) {
    const b = front(st, 'ally').find((x) => hasP(x, 'benediction') && (x.blessN || 0) < (boosted(x, 'benediction') ? 2 : 1));
    if (b) { b.blessN = (b.blessN || 0) + 1; pfx(ev, b, 'benediction'); ev.push({ t: 'status', u: u.uid, s: 'Bénédiction', syn: true, k: 'heal' }); heal(u, u.maxHp * 0.2, ev, b); }
  }
  if (a && d > 0 && u.side === 'ally' && u.talent === 'epines' && a.side === 'enemy' && a.hp > 0 && !st.thorns) { st.thorns = true; ev.push({ t: 'status', u: a.uid, s: 'Épines', k: 'bad' }); hurt(st, a, 2, ev); st.thorns = false; }
  // Roi sans Visage (phase 2) : il prend le visage de son agresseur et résiste désormais à sa faction
  if (a && d > 0 && u.boss && u.phase2 && st.bossKey === 'roi' && a.side === 'ally' && a.faction && u.mask !== a.faction) { u.mask = a.faction; ev.push({ t: 'status', u: u.uid, s: 'Nouveau visage', k: 'mask', syn: true }); }
  // Relations (prédation, rivalité) : annoncées la première fois qu'elles jouent
  const rel = a ? relationMult(a, u).rel : null;
  if (rel && d > 0 && !(st.relSeen ||= {})[rel]) { st.relSeen[rel] = true; ev.push({ t: 'status', u: u.uid, s: rel.startsWith('r-') ? 'Rivaux !' : 'Proie !', syn: true, rel }); }
  // Loi de l'écho : frapper l'Architecte blesse en retour
  if (u.boss && st.law === 'echo' && a && a.side === 'ally' && d > 0 && a.hp > 0) { ev.push({ t: 'status', u: a.uid, s: 'Écho', k: 'bad' }); hurt(st, a, 2, ev); }
  if (u.hp <= 0) {
    if (u.side === 'ally' && u.form === 'rebirth' && !u.reborn) {
      u.reborn = true; u.hp = Math.max(1, Math.round(u.maxHp * 0.3)); u.poison = 0;
      ev.push({ t: 'revive', u: u.uid }); ev.push({ t: 'status', u: u.uid, s: 'Renaissance noire', syn: true });
      return d;
    }
    if (u.side === 'ally' && hasP(u, 'renaissance') && !u.ckReborn) {
      u.ckReborn = true; u.hp = Math.max(1, Math.round(u.maxHp * 0.4)); u.poison = 0;
      ev.push({ t: 'revive', u: u.uid }); pfx(ev, u, 'renaissance'); ev.push({ t: 'status', u: u.uid, s: 'Renaissance !', syn: true, k: 'heal' });
      if (boosted(u, 'renaissance')) front(st, 'ally').forEach((x) => { if (x !== u) heal(x, x.maxHp * 0.15, ev); });
      return d;
    }
    if (u.side === 'ally' && st.guardianPact) {
      st.guardianPact = false; u.hp = Math.max(1, Math.round(u.maxHp * 0.35)); u.poison = 0;
      ev.push({ t: 'revive', u: u.uid }); ev.push({ t: 'status', u: u.uid, s: 'Pacte du Gardien', syn: true });
      return d;
    }
    ev.push({ t: 'die', u: u.uid });
    if (u.boss) release(st, ev);
    if (u.side === 'enemy') st.kills.push(u.id);
    // Coup de grâce : achever un ennemi donne 1 Ferveur
    if (u.side === 'enemy' && a && a.side === 'ally') { (st.finishedBy ||= {})[a.id] = (st.finishedBy[a.id] || 0) + 1; if (u.boss) (st.bossBy ||= {})[a.id] = 1; }
    if (u.side === 'enemy' && a && a.side === 'ally') { st.stats.finishers = (st.stats.finishers || 0) + 1; ev.push({ t: 'finisher', u: u.uid, a: a.uid }); gainFervor(st, 1, ev, 'Coup de grâce'); }
    if (u.side === 'ally') (st.fallenLog ||= []).push({ u: u.uid, by: a?.uid || null, round: st.round, kind: st.curKind || null });
    if (u.side === 'ally') alive(st, 'ally').filter((x) => x.form === 'vengeance').forEach((x) => { x.atk += 2; ev.push({ t: 'status', u: x.uid, s: 'Vengeance : +2 ATQ', syn: true }); });
    if (u.side === 'enemy') onEnemyDeath(st, u, a, ev);
    if (u.side === 'ally' && hasP(u, 'reliquat')) { pfx(ev, u, 'reliquat'); gainFervor(st, 2, ev, 'Reliquat'); if (boosted(u, 'reliquat')) front(st, 'ally').forEach((x) => { x.atk += 1; }); }
    if (u.side === 'ally') front(st, 'ally').filter((x) => hasP(x, 'elue')).forEach((x) => { const k = boosted(x, 'elue') ? 3 : 2; x.atk += k; pfx(ev, x, 'elue'); ev.push({ t: 'status', u: x.uid, s: `Élue des braves : +${k} ATQ`, syn: true }); gainFervor(st, 1, ev, 'Élue des braves'); });
  }
  return d;
}
function heal(u, n, ev, healer = null) {
  if (u.hp <= 0) return 0;
  const h = Math.min(u.maxHp - u.hp, Math.round(n * (u.healMult || 1)));
  if (h > 0) { u.hp += h; ev.push({ t: 'heal', u: u.uid, d: h }); }
  // Chœur : la créature soignée gagne de l'attaque pour ce tour (une fois par tour)
  if (h > 0 && healer && hasP(healer, 'choeur') && !u.chB) { u.chB = boosted(healer, 'choeur') ? 2 : 1; ev.push({ t: 'passive', u: healer.uid, p: 'choeur' }); u.boost = (u.boost || 0) + u.chB; ev.push({ t: 'status', u: u.uid, s: `Chœur : +${u.chB} ATQ`, syn: true }); }
  return h;
}
// Mort d'un ennemi : passifs des créatures (Faim sans fin, Filaments, Venin du chasseur)
function onEnemyDeath(st, u, a, ev) {
  if (a && a.side === 'ally' && a.hp > 0 && hasP(a, 'faim')) {
    a.atk += 1; heal(a, a.maxHp * 0.2, ev);
    pfx(ev, a, 'faim'); ev.push({ t: 'status', u: a.uid, s: 'Faim sans fin : +1 ATQ', syn: true });
    if (boosted(a, 'faim') && a.faimT !== st.round && st.turn === 'ally' && a.acts > 0) { a.faimT = st.round; a.acts--; ev.push({ t: 'status', u: a.uid, s: 'Encore faim : il peut rejouer', syn: true }); }
  }
  if (a && a.side === 'ally' && a.hp > 0 && hasP(a, 'devoreur') && (a.devN || 0) < (boosted(a, 'devoreur') ? 5 : 3)) {
    a.devN = (a.devN || 0) + 1; a.atk += 1;
    pfx(ev, a, 'devoreur'); ev.push({ t: 'status', u: a.uid, s: 'Dévoreur : +1 ATQ', syn: true });
    if (boosted(a, 'devoreur')) heal(a, a.maxHp * 0.15, ev);
  }
  if (!(u.poison > 0)) return;
  const fil = front(st, 'ally').find((x) => hasP(x, 'filaments'));
  let k = fil ? (boosted(fil, 'filaments') ? u.poison + 2 : Math.ceil(u.poison / 2)) : 0;
  if (a && a.side === 'ally' && hasP(a, 'chasseur') && boosted(a, 'chasseur')) k = Math.max(k, u.poison);
  if (!k) return;
  const o = st.order.enemy, i = o.indexOf(u.uid);
  const n = front(st, 'enemy').slice().sort((x, y) => Math.abs(o.indexOf(x.uid) - i) - Math.abs(o.indexOf(y.uid) - i))[0];
  if (!n) return;
  n.poison = Math.min(14, (n.poison || 0) + k);
  if (fil) pfx(ev, fil, 'filaments'); else if (a) pfx(ev, a, 'chasseur');
  ev.push({ t: 'status', u: n.uid, s: `Le poison passe : +${k}`, syn: true, k: 'poison' });
}
export function gainFervor(st, n, ev, why = '') {
  const before = st.fervor;
  st.fervor = Math.max(0, Math.min(FERVOR_MAX, st.fervor + n));
  st.gauge = st.fervor;
  if (st.fervor > before && ev) ev.push({ t: 'fervor', d: st.fervor - before, why });
}
function addPoison(st, t, n, ev, src) {
  if (t.hp <= 0) return;
  let k = n + (src?.side === 'ally' && has(st, 'venin') ? 1 : 0);
  const combo = t.frozen > 0 && src?.role === 'poison';
  if (combo) k *= 2;
  t.poison = Math.min(14, (t.poison || 0) + k);
  ev.push({ t: 'status', u: t.uid, s: combo ? `Givre-venin : +${k}` : `Poison +${k}`, syn: combo, k: 'poison' });
}
function freeze(st, t, ev, turns = 1) {
  t.frozen = turns;
  if (t.boss || t.elite) t.frostCD = 2;
  ev.push({ t: 'status', u: t.uid, s: 'Gelé', k: 'frost' });
  interruptBoss(st, t);
  if (t.charged) { t.charged = null; ev.push({ t: 'status', u: t.uid, s: 'Charge interrompue', syn: true }); }
  if (t.intent) t.intent = { ...t.intent, cancelled: true };
}
// Un gardien interrompu pendant une action spéciale : compté pour le récapitulatif
function interruptBoss(st, t) {
  if (!t.boss || !st.bossKey) return;
  if (t.charged || (t.intent && SPECIAL.includes(t.intent.kind) && !t.intent.cancelled)) { st.stats.interrupts = (st.stats.interrupts || 0) + 1; logBoss(st, 'Interruption'); }
}
// Brisure (élites et gardiens) : à zéro, l'ennemi perd sa prochaine action et devient vulnérable
// jusqu'à la fin de ton prochain tour. Il se relève ensuite avec une jauge plus solide (+40 %).
export function breakHit(st, t, n, ev, src = null) {
  if (!t.brkMax || t.broken || t.hp <= 0 || n <= 0) return;
  const k = src?.side === 'ally' && src.uid ? brkTotal(st, src, n) : n + (src?.side === 'ally' && has(st, 'brise') ? 1 : 0);
  t.brk = Math.max(0, t.brk - k);
  ev.push({ t: 'brk', u: t.uid, brk: t.brk, max: t.brkMax });
  if (t.brk > 0) return;
  t.broken = true; t.brokenSkip = true; t.brokenEnd = st.round + 1;
  if (t.boss) { release(st, ev); if (t.ice) { t.ice = 0; ev.push({ t: 'status', u: t.uid, s: 'La glace vole en éclats !', k: 'frost', syn: true }); } if (t.doom != null) { t.doom = DOOM_TURNS + 1; ev.push({ t: 'status', u: t.uid, s: 'Effondrement repoussé', syn: true }); } }
  interruptBoss(st, t);
  if (t.charged) { t.charged = null; ev.push({ t: 'status', u: t.uid, s: 'Charge interrompue', syn: true }); }
  if (t.intent) t.intent = { ...t.intent, cancelled: true };
  st.stats.breaks++;
  ev.push({ t: 'broken', u: t.uid });
  gainFervor(st, 2, ev, 'Brisure');
}
function discover(st, t, ev) {
  if (!t.faction || st.discovered[t.faction]) return;
  st.discovered[t.faction] = true;
  ev.push({ t: 'status', u: t.uid, s: 'Faiblesse découverte', k: 'weak' });
}
function check(st, ev) {
  if (st.over) return;
  if (!alive(st, 'enemy').length) st.over = 'won';
  else if (!alive(st, 'ally').length) st.over = 'lost';
  // une carte de réserve qui entre en jeu après une chute ne peut pas agir ce tour-ci
  for (const side of ['ally', 'enemy']) front(st, side).forEach((u) => { if (!u.inPlay) { u.inPlay = true; u.acts = ACTS_PER_UNIT; ev.push({ t: 'enter', u: u.uid }); } });
  if (st.over) ev.push({ t: 'over', r: st.over });
}

// ——— Cibles ———
// Une créature avec Garde doit être visée en premier (les assassins l'ignorent)
export function targetsFor(st, side, attacker = null) {
  const f = front(st, other(side));
  const howl = side === 'enemy' && f.find((u) => u.taunt === st.round); // Hurlement : tous sur lui
  if (howl) return [howl.uid];
  if (attacker?.fam === 'assassin') return f.map((u) => u.uid);
  const g = f.filter((u) => u.kw === 'garde');
  return (g.length ? g : f).map((u) => u.uid);
}

// ——— Actions du joueur ———
// Actions possibles d'une créature, avec coûts et raison si indisponible
export function actionsFor(st, uid) {
  const u = st.units[uid];
  const kit = KITS[u.role];
  const base = (key, def) => {
    const ap = key === 'swap' && st.freeSwap ? 0 : def.ap;
    const fervor = def.fervor + (st.law === 'silence' && !['attack', 'defend', 'swap'].includes(key) ? 1 : 0);
    let why = '';
    if (st.turn !== 'ally' || st.over) why = 'Ce n’est pas ton tour.';
    else if (!inFront(st, u)) why = 'Elle n’est pas au combat.';
    else if (u.stunned && key !== 'swap') why = 'Gelée : elle passe ce tour.';
    else if (key !== 'swap' && u.acts >= ACTS_PER_UNIT) why = `Elle a déjà agi ${ACTS_PER_UNIT} fois ce tour.`;
    else if (st.ap < ap) why = 'Plus assez de points d’action.';
    else if (st.fervor < fervor) why = `Il faut ${fervor} Ferveur.`;
    return { key, name: def.name, icon: def.icon, ap, fervor, target: def.target, desc: def.desc, dice: !!def.dice, ok: !why, why };
  };
  const strike = kitOf(u)?.strike || kit.basic;
  const out = [base('attack', { ...COMMON_ACTS.attack, name: strike.name, desc: `${strike.desc} +1 Ferveur.` }), base(kit.skill.key, kit.skill), base('defend', COMMON_ACTS.defend), base('swap', COMMON_ACTS.swap)];
  // Compétence propre de la créature (niveau 6), à côté de celle de son rôle
  const mk = moveOf(u);
  if (mk) {
    const M = moveFor(u, mk);
    const mv = base(mk, { name: M.name, icon: M.icon, ap: M.ap, fervor: 0, target: M.target === 'anyEnemy' ? 'enemy' : M.target, desc: M.desc + (awake(u) && M.awaken ? ` Éveil : ${M.awaken}` : '') });
    mv.own = true; mv.cd = rechargeOf(u, mk); mv.wait = Math.max(0, (u.mvReady || 0) - st.round);
    if (mv.ok && mv.wait) { mv.ok = false; mv.why = `${M.name} se recharge : prête dans ${mv.wait} tour${mv.wait > 1 ? 's' : ''}.`; }
    if (mv.ok && mv.target !== 'none' && !actionTargets(st, uid, mk).length) { mv.ok = false; mv.why = 'Aucune cible possible.'; }
    out.splice(2, 0, mv);
  }
  const sw = out.find((x) => x.key === 'swap'), d = out.find((x) => x.key === 'defend');
  if (sw.ok && st.swapped) { sw.ok = false; sw.why = 'Une seule permutation par tour.'; }
  if (sw.ok && !reserve(st, 'ally').length) { sw.ok = false; sw.why = 'Ta réserve est vide.'; }
  if (d.ok && u.defend) { d.ok = false; d.why = 'Elle se défend déjà.'; }
  const sk = out[1];
  if (sk.ok && sk.target !== 'none' && !actionTargets(st, uid, sk.key).length) { sk.ok = false; sk.why = 'Aucune cible possible.'; }
  return out;
}
export const canAct = (st, u) => st.turn === 'ally' && u.side === 'ally' && !st.over && inFront(st, u) && !u.stunned && u.acts < ACTS_PER_UNIT && st.ap > 0;
// Cibles valides d'une action
export function actionTargets(st, uid, key) {
  const u = st.units[uid];
  if (key === 'attack' || key === 'estoc' || key === 'contagion' || key === 'marque') return targetsFor(st, 'ally', u);
  if (key === 'entrave') return targetsFor(st, 'ally', u).filter((id) => !(st.units[id].frostCD > 0));
  if (key === 'rempart') return front(st, 'ally').filter((x) => x.uid !== uid).map((x) => x.uid);
  if (key === 'priere') return front(st, 'ally').map((x) => x.uid);
  if (key === 'swap') return reserve(st, 'ally').map((x) => x.uid);
  const M = moveFor(u, key);
  if (M) {
    if (M.targets) return M.targets(st, u, API);
    if (M.target === 'enemy') return targetsFor(st, 'ally', u);
    if (M.target === 'anyEnemy') return front(st, 'enemy').map((x) => x.uid);
    if (M.target === 'ally') return front(st, 'ally').map((x) => x.uid);
  }
  return [];
}

// Jet de D20 : difficulté (DD) et modificateurs, expliqués avant de confirmer
export function rollInfo(st, uid, key, tUid) {
  const u = st.units[uid], t = st.units[tUid];
  if (!u || !t) return null;
  const mods = [];
  let dc = 10, immune = '';
  if (key === 'estoc') {
    dc = 10 + (t.boss ? 3 : t.elite ? 1 : 0);
    if (t.frozen) mods.push(['Bris de glace (gelée)', 3]);
  } else if (key === 'contagion') {
    dc = 9 + (t.boss ? 2 : 0);
    if (t.frozen) mods.push(['Cible gelée', 3]);
    if (has(st, 'venin')) mods.push(['Fiole noire', 3]);
  } else if (key === 'entrave') {
    // v235 : gel plus fiable (8 au lieu de 10) et maîtrise du givre selon la rareté de la créature
    dc = 8 + (t.boss ? 6 : t.elite ? 3 : 0);
    if (FROST_MASTERY[u.rarity]) mods.push(['Maîtrise du givre', FROST_MASTERY[u.rarity]]);
    if (t.frostCD > 0) immune = 'Elle vient d’être gelée : immunisée au gel ce tour-ci.';
  } else return null;
  if (t.mark) mods.push(['Marquée', 3]);
  if (t.broken) mods.push(['Brisée', 5]);
  if (isWeak(u, t)) mods.push(['Faiblesse', 2]);
  if (has(st, 'des')) mods.push(['Faveur du destin', 2]);
  const mod = mods.reduce((a, [, v]) => a + v, 0);
  return { dc, mods, mod, chance: immune ? 0 : diceChance(dc, mod), immune };
}
function resolveRoll(st, info, ev, uid, tUid) {
  const r = d20(st);
  const total = r + info.mod;
  const tier = r === 1 ? 'fumble' : r === 20 ? 'crit' : total >= info.dc ? 'success' : 'partial';
  if (tier === 'crit') st.stats.crits++;
  if (tier === 'fumble') st.stats.fumbles++;
  ev.push({ t: 'roll', u: uid, tgt: tUid, r, mod: info.mod, mods: info.mods, dc: info.dc, total, tier });
  return tier;
}

// Prévisualisation d'une action sur une cible (dégâts estimés, jet de dés, faiblesse connue)
export function preview(st, uid, key, tUid) {
  const u = st.units[uid], t = st.units[tUid];
  const out = { roll: rollInfo(st, uid, key, tUid) };
  if (t && t.side === 'enemy') {
    if (key === 'attack') out.dmg = strikeDmg(st, u, t);
    if (key === 'estoc') out.dmg = dmgOf(st, u, t, 2);
    if (moveFor(u, key)?.pv) out.dmg = moveFor(u, key).pv(st, u, t, API);
    if (out.dmg && t.boss) out.dmg = Math.min(out.dmg, bossCap(t));
    // Brisure prévue (réussite pour le Coup d'estoc) ; l'ennemi doit survivre au coup pour être brisé
    const b = t.brkMax && !t.broken && !t.shield ? brkTotal(st, u, brkOf(st, u, t, key) + (key === 'attack' ? strikeBrk(u, t) : 0)) : 0;
    if (b) { out.brk = b; out.breaks = b >= t.brk && (out.dmg || 0) < t.hp; }
    out.weak = isWeak(u, t) && !!(st.discovered[t.faction] || t.mark);
  }
  return out;
}

// Exécute une action du joueur. Renvoie les événements à animer (rien si l'action est impossible).
export function act(st, uid, key, tUid = null) {
  const ev = [];
  const u = st.units[uid];
  if (!u) return ev;
  const a = actionsFor(st, uid).find((x) => x.key === key);
  if (!a || !a.ok) return ev;
  if (a.target !== 'none' && !actionTargets(st, uid, key).includes(tUid)) return ev;
  st.ap -= a.ap; st.fervor -= a.fervor; st.gauge = st.fervor;
  if (key !== 'swap') u.acts++;
  const t = tUid ? st.units[tUid] : null;
  ev.push({ t: 'act', u: uid, key, tgt: tUid, name: a.name, skill: !['attack', 'defend', 'swap'].includes(key) });
  if (key === 'attack') basicAttack(st, u, t, ev);
  else if (key === 'defend') { u.defend = true; ev.push({ t: 'status', u: uid, s: 'En défense', k: 'defend' }); }
  else if (key === 'swap') doSwap(st, u, t, ev);
  else if (key === 'rempart') { t.guardBy = uid; u.rempart = tUid; ev.push({ t: 'status', u: tUid, s: 'Rempart', k: 'guard' }); }
  else if (key === 'priere') {
    heal(t, t.maxHp * 0.4, ev, u);
    if (t.guardBy && !t.shield) { t.shield = 1; st.stats.named = (st.stats.named || 0) + 1; ev.push({ t: 'status', u: tUid, s: 'Bastion !', syn: true, combo: 'bastion', k: 'guard' }); }
    if (t.poison || t.frozen || t.stunned) { t.poison = 0; t.frozen = 0; t.stunned = false; ev.push({ t: 'status', u: tUid, s: 'Purifiée', k: 'heal' }); }
  } else if (key === 'marque') { t.mark = 2; discover(st, t, ev); ev.push({ t: 'status', u: tUid, s: 'Marquée', k: 'mark' }); }
  else if (key === 'raz') {
    ev.push({ t: 'aoe', u: uid, side: 'ally' });
    front(st, 'enemy').forEach((x) => { const b = brkOf(st, u, x, 'raz'); const d = hurt(st, x, dmgOf(st, u, x, 0.7), ev, uid); if (d) breakHit(st, x, b, ev, u); });
  } else if (key === 'estoc') {
    const info = rollInfo(st, uid, key, tUid);
    const tier = resolveRoll(st, info, ev, uid, tUid);
    const m = { crit: 3, success: 2, partial: 1.2, fumble: 0.5 }[tier];
    // Combinaisons nommées : la Marque prépare la Chasse, le gel prépare le Bris de glace
    if (t.mark && tier !== 'fumble') { st.stats.named = (st.stats.named || 0) + 1; ev.push({ t: 'status', u: tUid, s: 'Chasse !', syn: true, combo: 'chasse' }); }
    if (t.frozen > 0 && tier !== 'fumble') { st.stats.named = (st.stats.named || 0) + 1; ev.push({ t: 'status', u: tUid, s: 'Bris de glace !', syn: true, combo: 'glace' }); }
    weakBonus(st, u, t, ev);
    const frozen = t.frozen > 0;
    const d = hurt(st, t, dmgOf(st, u, t, m), ev, uid);
    if (d && t.hp > 0) breakHit(st, t, brkOf(st, u, { ...t, frozen: frozen ? 1 : 0 }, 'estoc', tier), ev, u);
    if (d && t.boss) t.wound = 1;
    if (tier === 'fumble') { u.exposed = true; ev.push({ t: 'status', u: uid, s: 'Exposée', k: 'bad' }); }
  } else if (key === 'contagion') {
    if (!t.poison) addPoison(st, t, 3, ev, u);
    const info = rollInfo(st, uid, key, tUid);
    const tier = resolveRoll(st, info, ev, uid, tUid);
    if (tier !== 'fumble') {
      t.poison = Math.min(14, t.poison * 2);
      ev.push({ t: 'status', u: tUid, s: `Poison ×2 (${t.poison})`, k: 'poison', syn: true });
      const row = front(st, 'enemy'), i = row.indexOf(t);
      const spread = tier === 'crit' ? row.filter((x) => x !== t) : tier === 'success' ? [row[i - 1], row[i + 1]].filter(Boolean) : [];
      const k = Math.ceil(t.poison / 2);
      spread.forEach((x) => { x.poison = Math.min(14, (x.poison || 0) + k); ev.push({ t: 'status', u: x.uid, s: `Contagion +${k}`, k: 'poison' }); });
    }
  } else if (key === 'entrave') {
    const info = rollInfo(st, uid, key, tUid);
    const tier = resolveRoll(st, info, ev, uid, tUid);
    // critique d'une Mythique ou Secrète sur un ennemi ordinaire : gelé 2 tours
    if (tier === 'crit' || tier === 'success') { freeze(st, t, ev, tier === 'crit' && (u.rarity === 'M' || u.rarity === 'S') && !t.boss && !t.elite ? 2 : 1); if (tier === 'crit') breakHit(st, t, 3, ev, u); }
    else if (tier === 'partial') { t.slow = true; ev.push({ t: 'status', u: tUid, s: 'Ralentie', k: 'frost' }); }
  } else if (moveFor(u, key)) { u.mvReady = st.round + rechargeOf(u, key); u.struck = true; u.lastStruck = st.round; moveFor(u, key).run(st, u, t, ev, API); }
  if (['attack', 'estoc', 'raz'].includes(key) || moveFor(u, key)?.pv) st.ombreUsed = true;
  check(st, ev);
  return ev;
}
// Brisure infligée par une attaque (hors bénédiction, ajoutée dans breakHit). tier : résultat du D20 pour le Coup d'estoc.
export function brkOf(st, u, t, key, tier = 'success') {
  if (!t?.brkMax) return 0;
  const frozen = t.frozen > 0, weak = isWeak(u, t) ? 1 : 0;
  if (key === 'attack') return 1 + (u.role === 'protecteur' ? 1 : 0) + (u.role === 'controle' && frozen ? 2 : 0) + weak + (u.form === 'shatter' ? 1 : 0);
  if (key === 'estoc') return { crit: 4, success: 3, partial: 1, fumble: 0 }[tier] + (frozen ? 2 : 0) + weak;
  if (key === 'raz') return 1 + (frozen ? 2 : 0);
  return 0;
}
const brkTotal = (st, u, n) => (n > 0 && u?.side === 'ally' ? n + (has(st, 'brise') ? 1 : 0) + (u.talent === 'brise' ? 1 : 0) : n);
function weakBonus(st, u, t, ev) {
  if (!isWeak(u, t)) return;
  st.stats.weak = (st.stats.weak || 0) + 1;
  discover(st, t, ev);
  gainFervor(st, 1, ev, 'Faiblesse');
}
// Frappe propre d'une créature (kits.js) : multiplicateur, coups multiples, Brisure en plus
const strikeOf = (u) => kitOf(u)?.strike || {};
const strikeMult = (u, t) => (strikeOf(u).mult || 1) * (strikeOf(u).lowBonus && t.hp < t.maxHp / 2 ? 1 + strikeOf(u).lowBonus : 1);
const charging = (t) => !!t.charged || ['charge', 'channel', 'gather', 'mimic'].includes(t.intent?.kind);
function strikeBrk(u, t) {
  const S = strikeOf(u);
  return (S.brk || 0) + (S.brkCharging && charging(t) ? S.brkCharging : 0) + Math.max(0, (S.hits || 1) - 1);
}
function strikeDmg(st, u, t) {
  const hits = strikeOf(u).hits || 1, one = dmgOf(st, u, t, strikeMult(u, t), { basic: true });
  return (t.boss ? Math.min(one, bossCap(t)) : one) * hits;
}
const lowestAlly = (st) => front(st, 'ally').filter((x) => x.hp < x.maxHp).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
function basicAttack(st, u, t, ev) {
  weakBonus(st, u, t, ev);
  const S = strikeOf(u), frozen = t.frozen > 0, hits = S.hits || 1;
  let m = strikeMult(u, t), rush = 0;
  if (hasP(u, 'ruee') && !u.rushed) { u.rushed = true; m *= boosted(u, 'ruee') ? 2.5 : 2; rush = 1; pfx(ev, u, 'ruee'); }
  u.struck = true; u.lastStruck = st.round;
  const marked = !!(t.mark || t.broken), poisoned = t.poison > 0, extraBrk = (S.brk || 0) + (S.brkCharging && charging(t) ? S.brkCharging : 0);
  let d = 0, landed = 0;
  for (let h = 0; h < hits && t.hp > 0; h++) {
    const x = hurt(st, t, dmgOf(st, u, t, m, { basic: true }), ev, u.uid, { pierce: u.role === 'poison' || !!S.pierce });
    d += x; if (x) landed++;
  }
  if (d && t.hp > 0) {
    if (u.role === 'poison') addPoison(st, t, 2 + (S.poisonMore && poisoned ? S.poisonMore : 0), ev, u);
    if (S.splashPoison) { const row = front(st, t.side), i = row.indexOf(t), n = row[i + 1] || row[i - 1]; if (n) addPoison(st, n, S.splashPoison, ev, u); }
    breakHit(st, t, brkOf(st, u, { ...t, frozen: frozen ? 1 : 0 }, 'attack') + extraBrk + rush + Math.max(0, landed - 1), ev, u);
    if (hasP(u, 'venin')) addPoison(st, t, boosted(u, 'venin') ? 2 : 1, ev, u);
    if (S.burn) addPoison(st, t, S.burn, ev, u);
    if (hasP(u, 'malediction') && u.curseT !== st.round && !t.mark && t.hp > 0) { u.curseT = st.round; t.mark = boosted(u, 'malediction') ? 2 : 1; pfx(ev, u, 'malediction'); ev.push({ t: 'status', u: t.uid, s: 'Maudite', k: 'mark' }); }
    if (u.role === 'degats' && t.boss) t.wound = 1;
  }
  if (S.healLowest) { const w = lowestAlly(st); if (w) heal(w, S.healLowest, ev, u); }
  if (S.lifeShare && d) { const w = lowestAlly(st); if (w) heal(w, Math.max(1, Math.round(d * S.lifeShare)), ev, u); }
  // Attiser : frapper une cible marquée ou brisée rapporte de la Ferveur (une fois par tour)
  if (d && marked && hasP(u, 'attiser') && !u.attised) {
    u.attised = true; pfx(ev, u, 'attiser'); gainFervor(st, 1, ev, 'Attiser');
    if (boosted(u, 'attiser') && t.hp > 0) breakHit(st, t, 1, ev, u);
  }
  if (u.role === 'zone') {
    const row = front(st, t.side), i = row.indexOf(t), full = u.boost > 0;
    if (full && (row[i - 1] || row[i + 1])) ev.push({ t: 'status', u: u.uid, s: 'Raz-de-marée !', syn: true });
    [row[i - 1], row[i + 1]].filter(Boolean).forEach((n) => hurt(st, n, full ? dmgOf(st, u, n) : Math.ceil(dmgOf(st, u, n) / 2), ev, u.uid));
  }
  if ((st.relics || []).includes('coeur')) { st.coeurTick = !st.coeurTick; if (st.coeurTick) return; }
  gainFervor(st, 1, ev);
}
function doSwap(st, out, inn, ev) {
  const o = st.order.ally, i = o.indexOf(out.uid), j = o.indexOf(inn.uid);
  [o[i], o[j]] = [o[j], o[i]];
  inn.inPlay = true; out.inPlay = false; inn.acts = 0;
  out.defend = false;
  st.freeSwap = false;
  st.swapped = true;
  // les intentions qui visaient la créature sortie frappent celle qui entre (elle prend sa place)
  const aimed = front(st, 'enemy').filter((e) => e.intent?.t === out.uid);
  aimed.forEach((e) => { e.intent = { ...e.intent, t: inn.uid }; });
  ev.push({ t: 'swap', u: inn.uid, out: out.uid });
  entrance(st, inn, aimed, ev);
}
// Effets d'entrée (permutation volontaire seulement, une fois par tour comme la permutation)
export const ENTRANCES = {
  protecteur: { name: 'Prise de garde', desc: 'Elle entre avec un bouclier qui bloque le prochain coup.' },
  degats:     { name: 'Entrée fracassante', desc: '+2 en attaque pour ce tour.' },
  soin:       { name: 'Main secourable', desc: 'Soigne l’allié au combat le plus blessé (15 % de ses PV max).' },
  poison:     { name: 'Nuée toxique', desc: '+2 poison à l’ennemi qui visait la créature remplacée (sinon au premier ennemi).' },
  controle:   { name: 'Souffle glacé', desc: 'L’ennemi qui visait la créature remplacée est ralenti : sa prochaine attaque fait moitié moins mal.' },
  soutien:    { name: 'Appel aux armes', desc: '+1 Ferveur.' },
  zone:       { name: 'Ressac', desc: '+1 Brisure à chaque élite ou gardien au combat.' },
};
function entrance(st, u, aimed, ev) {
  const E = ENTRANCES[u.role];
  if (!E) return;
  ev.push({ t: 'status', u: u.uid, s: E.name, syn: true, k: 'entrance' });
  const foe = aimed[0] || front(st, 'enemy')[0];
  if (u.role === 'protecteur') { u.shield = 1; ev.push({ t: 'status', u: u.uid, s: 'Bouclier', k: 'guard' }); }
  else if (u.role === 'degats') u.boost = (u.boost || 0) + 2;
  else if (u.role === 'soin') { const w = front(st, 'ally').filter((x) => x.hp < x.maxHp).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0]; if (w) heal(w, w.maxHp * 0.15, ev); }
  else if (u.role === 'poison' && foe) addPoison(st, foe, 2, ev, u);
  else if (u.role === 'controle' && aimed.length) { aimed.forEach((e) => { e.slow = true; ev.push({ t: 'status', u: e.uid, s: 'Ralenti', k: 'frost' }); }); }
  else if (u.role === 'soutien') gainFervor(st, 1, ev, 'Appel aux armes');
  else if (u.role === 'zone') front(st, 'enemy').forEach((x) => breakHit(st, x, 1, ev, u));
}

// ——— Pouvoir d'équipe : coûte 1 PA et toute la Ferveur, une seule fois par combat ———
export const ultReady = (st) => !st.over && !st.ultUsed && st.turn === 'ally' && st.fervor >= ULT_COST.fervor && st.ap >= ULT_COST.ap;
export const SEAL_WARD = 0.5; // bouclier du Sceau : absorbe jusqu'à 50 % des PV max
export function useUlt(st) {
  const ev = [];
  if (!ultReady(st)) return ev;
  st.fervor = 0; st.gauge = 0; st.ap -= ULT_COST.ap; st.ultUsed = true;
  st.stats.ults = (st.stats.ults || 0) + 1;
  const p = st.power || 1, allies = front(st, 'ally'), foes = front(st, 'enemy');
  ev.push({ t: 'ult', key: st.ult });
  if (st.ult === 'sceau') allies.forEach((u) => { heal(u, u.maxHp * 0.3 * p, ev); u.ward = Math.max(u.ward || 0, Math.round(u.maxHp * SEAL_WARD)); ev.push({ t: 'status', u: u.uid, s: `Sceau : ${u.ward}` }); });
  else if (st.ult === 'revive') {
    const fallen = st.order.ally.map((id) => st.units[id]).filter((u) => u.hp <= 0);
    if (fallen.length) fallen.forEach((u) => { u.hp = Math.round(u.maxHp * 0.5 * p); u.poison = 0; u.inPlay = false; ev.push({ t: 'revive', u: u.uid }); });
    else allies.forEach((u) => heal(u, u.maxHp * 0.4 * p, ev));
  } else if (st.ult === 'nova') foes.forEach((u) => { hurt(st, u, (3 + st.round) * p, ev); breakHit(st, u, 2, ev, { side: 'ally' }); });
  else if (st.ult === 'smite') { const t = foes.slice().sort((x, y) => y.hp - x.hp)[0]; if (t) { hurt(st, t, (8 + 2 * st.round) * p, ev); breakHit(st, t, 4, ev, { side: 'ally' }); } }
  else if (st.ult === 'aegis') { allies.forEach((u) => { u.shield = 1; u.stunned = false; ev.push({ t: 'status', u: u.uid, s: 'Égide' }); }); st.ap += 2; }
  check(st, ev);
  return ev;
}

// ——— Tours ———
function startAllyTurn(st, ev) {
  st.turn = 'ally';
  const R_ = st.relics || [];
  st.ap = AP_MAX + (st.law === 'hate' ? 1 : 0) + (st.round === 1 ? (R_.includes('sablier') ? 1 : 0) - (R_.includes('miroir') ? 1 : 0) : 0);
  st.swapped = false; st.ombreUsed = false; st.hitBy = {}; st.curKind = null;
  for (const u of alive(st, 'ally')) { u.acts = 0; u.boost = 0; u.defend = false; u.guardBy = null; u.rempart = null; u.exposed = false; u.stunned = false; u.attised = false; u.chB = 0; }
  for (const u of front(st, 'ally')) {
    if (u.frozen) { u.frozen = 0; u.stunned = true; ev.push({ t: 'status', u: u.uid, s: 'Gelée : passe son tour', k: 'frost' }); }
    tickPoison(st, u, ev);
    // Pacte du Sang : le prix se paie à chaque tour (jamais mortel)
    if (st.pact === 'sang' && st.round > 1 && u.hp > 1) { const d = Math.min(u.hp - 1, Math.max(1, Math.round(u.maxHp * 0.06))); u.hp -= d; ev.push({ t: 'dmg', u: u.uid, d, hp: u.hp }); ev.push({ t: 'status', u: u.uid, s: 'Prix du sang', k: 'bad' }); }
  }
  for (const u of front(st, 'ally')) {
    if (hasP(u, 'regeneration') && u.hp > 0 && u.hp < u.maxHp) heal(u, Math.max(1, u.maxHp * (boosted(u, 'regeneration') ? 0.08 : 0.05)), ev);
    if (st.round === 4 && boosted(u, 'egide') && !u.shield) { u.shield = 1; ev.push({ t: 'status', u: u.uid, s: 'Égide', k: 'guard' }); }
    if (st.round === 3 && boosted(u, 'engloutir')) { const e = front(st, 'enemy').slice().sort((x, y) => y.atk - x.atk)[0]; if (e) { e.slow = true; ev.push({ t: 'status', u: e.uid, s: 'Ralenti', k: 'frost' }); } }
  }
  for (const c of front(st, 'ally').filter((u) => hasP(u, 'commandement'))) {
    const best = front(st, 'ally').filter((x) => x !== c && !x.stunned).sort((x, y) => y.atk - x.atk)[0];
    if (best) { const n = boosted(c, 'commandement') ? 3 : 2; best.boost += n; ev.push({ t: 'status', u: best.uid, s: `Commandement : +${n} ATQ` }); }
  }
  const criers = front(st, 'ally').filter((u) => u.kw === 'cri' && u.hp > 0);
  if (criers.length) { front(st, 'ally').forEach((u) => { u.boost += criers.length; }); ev.push({ t: 'status', u: criers[0].uid, s: `Cri : +${criers.length} ATQ` }); }
  check(st, ev);
  planIntents(st);
}
// Poison : inflige sa valeur, puis diminue de moitié
function tickPoison(st, u, ev) {
  if (!u.poison || u.hp <= 0) return;
  const d = u.poison;
  u.poison = Math.floor(u.poison / 2);
  ev.push({ t: 'status', u: u.uid, s: `Poison -${d}`, k: 'poison' });
  hurt(st, u, d, ev);
}
// Fin du tour du joueur : effets de fin de tour, puis début du tour ennemi.
export function beginEnemyTurn(st) {
  const ev = [];
  if (st.over || st.turn !== 'ally') return ev;
  // Souffle de vie : chaque Soigneur soigne un peu l'allié le plus blessé
  for (const u of front(st, 'ally').filter((x) => x.kw === 'soin')) {
    const w = front(st, 'ally').filter((x) => x.hp < x.maxHp).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
    if (w) heal(w, Math.max(2, Math.round(u.atk + 1)), ev);
  }
  st.turn = 'enemy';
  for (const u of alive(st, 'enemy')) u.boost = 0;
  for (const u of alive(st, 'ally')) u.absorbed = 0;
  // Épuisement : un combat qui s'éternise blesse tout le monde, de plus en plus (évite les combats sans fin)
  if (st.round >= FATIGUE_AT) {
    const d = st.round - FATIGUE_AT + 1;
    if (d === 1) ev.push({ t: 'law', fatigue: true });
    for (const u of [...front(st, 'ally'), ...front(st, 'enemy')]) { u.shield = 0; ev.push({ t: 'status', u: u.uid, s: `Épuisement −${d}`, k: 'bad' }); hurt(st, u, d, ev); }
    check(st, ev);
    if (st.over) return ev;
  }
  for (const u of front(st, 'enemy')) tickPoison(st, u, ev);
  check(st, ev);
  if (!st.over && st.bossKey) { bossPhase(st, ev); if (!st.over) bossTick(st, ev); }
  else if (!st.over && st.bossPower) bossPower(st, ev);
  ev.push({ t: 'phase', side: 'enemy' });
  st.queue = front(st, 'enemy').map((u) => u.uid);
  st.skipEv = [];
  return ev;
}
// Gardiens à mécaniques : phase 2 sous la moitié de leurs PV. Chacun change la façon de jouer.
export const PHASE2 = {
  devoreur:   { name: 'Engloutir', desc: 'Il avale ta créature la plus vigoureuse : elle quitte le combat et se fait digérer à chaque tour. Brise-le (ou abats-le) pour la libérer.' },
  matriarche: { name: 'Carapace de glace', desc: 'Une carapace absorbe les coups (le quart de ses PV). Les créatures infernales la font fondre deux fois plus vite ; une Brisure la fait voler en éclats.' },
  roi:        { name: 'Mille visages', desc: 'Il prend le visage de la dernière créature qui l’a blessé et résiste à sa faction (−50 %). Change d’attaquant à chaque coup.' },
  architecte: { name: 'Effondrement', desc: 'Un compte à rebours de 3 tours : à zéro, la salle s’écroule sur toute ton équipe. Chaque Brisure le repousse.' },
  eclipse:    { name: 'Totalité', desc: 'Seules ses faiblesses la blessent pleinement : toutes les autres factions font −40 %.' },
};
export const DOOM_TURNS = 3;
export const FATIGUE_AT = 15; // tour à partir duquel l'Épuisement commence
function bossPhase(st, ev) {
  const b = front(st, 'enemy').find((u) => u.boss && u.hp > 0);
  if (!b || b.phase2 || (b.hp > b.maxHp / 2 && !b.awakened)) return;
  b.phase2 = true; b.atk = Math.round(b.atk * 1.2 + 0.5);
  const P = PHASE2[st.bossKey];
  ev.push({ t: 'phase2', u: b.uid, s: `${BOSSES[st.bossKey].name} : ${P ? P.name : 'phase 2'} !`, key: st.bossKey });
  logBoss(st, P ? P.name : 'Phase 2');
  if (st.bossKey === 'devoreur') {
    const v = front(st, 'ally').filter((x) => x.hp > 0).sort((x, y) => y.hp - x.hp)[0];
    if (v && alive(st, 'ally').length > 1) { v.swallowed = true; v.inPlay = false; v.defend = false; st.swallowed = v.uid; ev.push({ t: 'swallow', u: v.uid, a: b.uid }); check(st, ev); }
  } else if (st.bossKey === 'matriarche') { b.ice = Math.round(b.maxHp * 0.25); ev.push({ t: 'status', u: b.uid, s: `Carapace de glace (${b.ice})`, k: 'frost', syn: true }); }
  else if (st.bossKey === 'architecte') { b.doom = DOOM_TURNS; ev.push({ t: 'status', u: b.uid, s: `Effondrement : ${b.doom} tours`, k: 'charge', syn: true }); }
  else if (st.bossKey === 'eclipse') { b.totality = true; }
}
// Le Dévoreur relâche sa proie (Brisure ou mort du gardien)
function release(st, ev) {
  const v = st.swallowed && st.units[st.swallowed];
  st.swallowed = null;
  if (!v || !v.swallowed) return;
  v.swallowed = false;
  if (v.hp > 0) { ev.push({ t: 'release', u: v.uid }); ev.push({ t: 'status', u: v.uid, s: 'Libérée !', syn: true, k: 'heal' }); }
  check(st, ev);
}
// Début du tour ennemi en phase 2 : digestion, compte à rebours de l'Effondrement
function bossTick(st, ev) {
  const b = front(st, 'enemy').find((u) => u.boss && u.hp > 0);
  const v = st.swallowed && st.units[st.swallowed];
  if (v && v.swallowed && v.hp > 0) {
    const d = Math.min(v.hp, Math.max(1, Math.round(v.maxHp * 0.15)));
    v.hp -= d; ev.push({ t: 'status', u: b?.uid || v.uid, s: `Digère ${v.name} : −${d}`, k: 'bad' });
    if (v.hp <= 0) { v.swallowed = false; st.swallowed = null; (st.fallenLog ||= []).push({ u: v.uid, by: b?.uid || null, round: st.round, kind: 'gorge' }); ev.push({ t: 'status', u: b?.uid || v.uid, s: 'Dévorée…', k: 'bad' }); check(st, ev); }
  }
  if (b && b.doom != null && !b.broken) {
    b.doom--;
    if (b.doom > 0) ev.push({ t: 'status', u: b.uid, s: `Effondrement : ${b.doom}`, k: 'charge' });
    else {
      ev.push({ t: 'boss', u: b.uid, s: 'Effondrement !' }); ev.push({ t: 'aoe', u: b.uid, side: 'enemy' });
      front(st, 'ally').forEach((x) => hurt(st, x, Math.max(2, Math.round(x.maxHp * 0.45)), ev, b.uid));
      b.doom = DOOM_TURNS; check(st, ev);
    }
  }
}
const logBoss = (st, m) => { const l = (st.bossLog ||= []); if (!l.includes(m)) l.push(m); };
// Pouvoir du gardien, au début de son tour. Phase 2 sous la moitié de ses PV.
function bossPower(st, ev) {
  const b = front(st, 'enemy').find((u) => u.boss && u.hp > 0);
  if (!b) return;
  if (!b.phase2 && b.hp <= b.maxHp / 2) {
    b.phase2 = true; b.atk = Math.round(b.atk * 1.25 + 0.5);
    ev.push({ t: 'phase2', u: b.uid, s: 'Phase 2 : furie !' });
  }
  const p = st.bossPower, every = b.phase2 || st.round % 2 === 1;
  const stopped = b.frozen > 0 || b.broken;
  const wound = b.wound; b.wound = 0;
  if (p === 'carapace' && every && !b.broken) { b.shield = 1; ev.push({ t: 'boss', u: b.uid, s: 'Carapace !' }); }
  else if (p === 'givre' && every && !stopped) {
    const t = front(st, 'ally').filter((u) => u.hp > 0 && !u.frozen).sort((x, y) => y.atk - x.atk)[0];
    if (t) { t.frozen = 1; ev.push({ t: 'boss', u: b.uid, s: 'Souffle de givre' }); ev.push({ t: 'status', u: t.uid, s: 'Gelée', k: 'frost' }); }
  } else if (p === 'fureur') {
    if (stopped) ev.push({ t: 'status', u: b.uid, s: 'Fureur stoppée', syn: true });
    else { b.atk += b.phase2 ? 2 : 1; ev.push({ t: 'boss', u: b.uid, s: `Fureur : ${b.atk} ATQ` }); }
  } else if (p === 'devoreur' && b.hp < b.maxHp) {
    if (wound) ev.push({ t: 'status', u: b.uid, s: 'Plaie ouverte : pas de soin', syn: true });
    else { heal(b, b.maxHp * (b.phase2 ? 0.2 : 0.15), ev); ev.push({ t: 'boss', u: b.uid, s: 'Dévore…' }); }
  }
}

// Prochaine action ennemie : { a, kind, t, qte } (null quand le tour ennemi est fini).
// Les ennemis gelés ou brisés passent leur tour (événements récupérés par enemyAct/endEnemyTurn).
export function nextEnemy(st) {
  while (!st.over && st.turn === 'enemy' && st.queue.length) {
    const e = st.units[st.queue[0]];
    if (!e || !inFront(st, e)) { st.queue.shift(); continue; }
    if (e.frozen || e.brokenSkip || !e.intent || e.intent.cancelled) { st.queue.shift(); skipUnit(st, e); continue; }
    const it = refreshIntent(st, e);
    if (!it) { st.queue.shift(); continue; }
    return { a: e.uid, kind: it.kind, t: it.t, qte: it.qte };
  }
  return null;
}
function skipUnit(st, e) {
  if (e.frozen) { e.frozen -= 1; st.skipEv.push({ t: 'status', u: e.uid, s: e.frozen ? 'Gelé : passe son tour (encore 1)' : 'Gelé : passe son tour', k: 'frost' }); }
  else if (e.brokenSkip) { e.brokenSkip = false; st.skipEv.push({ t: 'status', u: e.uid, s: 'Brisé : passe son tour', k: 'broken' }); }
  e.intent = null;
}
export function takeSkips(st) { const e = st.skipEv || []; st.skipEv = []; return e; }
// La cible annoncée tient-elle encore ? Sinon l'ennemi en choisit une autre selon sa famille.
function refreshIntent(st, e) {
  const it = e.intent;
  if (SINGLE.includes(it.kind) || (it.kind === 'copy' && it.t)) {
    const ts = targetsFor(st, 'enemy', e);
    if (!ts.includes(it.t)) it.t = pickTarget(st, e);
    if (!it.t) return null;
  }
  return it;
}

// Résout l'action d'un ennemi. defense : 'none' | 'dodge' | 'parry' (défense active réussie).
export function enemyAct(st, aUid, defense = 'none') {
  const ev = takeSkips(st);
  if (st.queue[0] === aUid) st.queue.shift();
  const e = st.units[aUid];
  if (!e || e.hp <= 0 || st.over || !e.intent) return ev;
  const it = e.intent, kind = it.kind;
  e.intent = null;
  ev.push({ t: 'eact', a: aUid, kind, tgt: it.t });
  let dealt = 0;
  const big = ['heavy', 'blast', 'gorge', 'blizzard', 'copy'].includes(kind);
  st.curKind = kind;
  if (big && defense === 'none') st.stats.missed = (st.stats.missed || 0) + 1;
  const evStart = ev.length;
  const strike = (t, mult) => {
    if (!t || t.hp <= 0) return null;
    // Rempart : le protecteur prend le coup à la place, avec 40 % de dégâts en moins
    let target = t, m = mult;
    const g = t.guardBy && st.units[t.guardBy];
    if (g && inFront(st, g) && g.uid !== t.uid) { target = g; m *= 0.6 * (hasP(g, 'sentinelle') ? (boosted(g, 'sentinelle') ? 0.6 : 0.75) : 1); ev.push({ t: 'status', u: g.uid, s: 'Rempart !', k: 'guard' }); }
    ev.push({ t: 'attack', a: aUid, u: target.uid, kind });
    if (defense === 'dodge' || defense === 'parry') { defended(st, e, target, ev, defense, kind); return null; }
    const d = hurt(st, target, dmgOf(st, e, target, m), ev, aUid);
    if (target !== t && d > 0 && hasP(target, 'colere')) {
      const cap = boosted(target, 'colere') ? 5 : 3;
      if ((target.colere || 0) < cap) { target.colere = (target.colere || 0) + 1; target.atk += 1; pfx(ev, target, 'colere'); ev.push({ t: 'status', u: target.uid, s: `Colère : +1 ATQ (${target.colere}/${cap})`, syn: true }); }
    }
    const hound = target !== t || target.taunt === st.round ? target : null;
    if (hound && hasP(hound, 'enfers') && hound.hp > 0 && e.hp > 0) {
      pfx(ev, hound, 'enfers'); ev.push({ t: 'status', u: aUid, s: 'Gardien des Enfers', k: 'bad', syn: true });
      hurt(st, e, boosted(hound, 'enfers') ? 5 : 3, ev, hound.uid);
      if (boosted(hound, 'enfers') && e.hp > 0) breakHit(st, e, 1, ev, hound);
    }
    return target;
  };
  if (kind === 'hit') strike(st.units[it.t], 1);
  else if (kind === 'heavy') { e.charged = null; strike(st.units[it.t], e.boss ? 2.5 : 2.2); }
  else if (kind === 'poison') { const t = strike(st.units[it.t], 0.6); if (t && t.hp > 0) addPoison(st, t, 3, ev, e); }
  else if (kind === 'frost') { const t = strike(st.units[it.t], 0.5); if (t && t.hp > 0) { t.frozen = 1; ev.push({ t: 'status', u: t.uid, s: 'Gelée', k: 'frost' }); } }
  else if (kind === 'blast') {
    e.charged = null;
    ev.push({ t: 'aoe', u: aUid, side: 'enemy' });
    if (defense !== 'none') defended(st, e, null, ev, defense, kind);
    else front(st, 'ally').forEach((x) => hurt(st, x, dmgOf(st, e, x, e.boss ? 1 : 0.8), ev, aUid));
  } else if (kind === 'charge') { e.charged = 'heavy'; ev.push({ t: 'status', u: aUid, s: 'Se charge…', k: 'charge' }); }
  else if (kind === 'channel') { e.charged = 'blast'; ev.push({ t: 'status', u: aUid, s: 'Concentration…', k: 'charge' }); }
  else if (kind === 'shield') { const t = st.units[it.t]; if (t && t.hp > 0) { t.shield = 1; ev.push({ t: 'status', u: t.uid, s: 'Bouclier', k: 'guard' }); } }
  else if (kind === 'heal') { const t = st.units[it.t]; if (t) heal(t, t.maxHp * 0.25, ev); }
  else if (kind === 'hunt') { const t = st.units[it.t]; if (t && t.hp > 0 && !t.swallowed) { t.prey = 2; ev.push({ t: 'status', u: t.uid, s: 'Proie désignée', k: 'bad' }); } }
  else if (kind === 'rally') { front(st, 'enemy').forEach((x) => { if (x !== e) x.boost += 2; }); ev.push({ t: 'status', u: aUid, s: 'Renfort : +2 ATQ', k: 'charge' }); }
  else if (kind === 'gorge') {
    // Le Dévoreur : morsure qui le nourrit ; chaque festin réussi le rend plus fort
    logBoss(st, 'Dévorer');
    const t = strike(st.units[it.t], 1.6);
    const d = ev.slice(evStart).filter((x) => x.t === 'dmg' && st.units[x.u]?.side === 'ally').reduce((n, x) => n + x.d, 0);
    if (t && d > 0) { heal(e, d, ev); e.atk += e.phase2 ? 2 : 1; st.stats.feasts = (st.stats.feasts || 0) + 1; ev.push({ t: 'boss', u: aUid, s: `Festin : ${e.atk} ATQ` }); }
  } else if (kind === 'gather') { e.charged = 'blizzard'; logBoss(st, 'Tempête de givre'); ev.push({ t: 'status', u: aUid, s: 'Le froid monte…', k: 'charge' }); }
  else if (kind === 'blizzard') {
    e.charged = null;
    ev.push({ t: 'aoe', u: aUid, side: 'enemy' });
    if (defense !== 'none') defended(st, e, null, ev, defense, 'blast');
    else {
      front(st, 'ally').forEach((x) => hurt(st, x, dmgOf(st, e, x, 0.9), ev, aUid));
      front(st, 'ally').filter((x) => x.hp > 0 && !x.frozen).sort((x, y) => y.atk - x.atk).slice(0, e.phase2 ? 2 : 1).forEach((x) => { x.frozen = 1; ev.push({ t: 'status', u: x.uid, s: 'Gelée', k: 'frost' }); });
    }
  } else if (kind === 'mimic') {
    e.charged = 'copy'; e.copyKey = it.copy; e.copyName = it.copyName; logBoss(st, 'Copie');
    ev.push({ t: 'boss', u: aUid, s: `Copie : ${it.copyName}` });
  } else if (kind === 'copy') {
    e.charged = null; const k = it.copy;
    ev.push({ t: 'boss', u: aUid, s: `${it.copyName} !` });
    if (k === 'estoc') { const t = strike(st.units[it.t], 2); if (t && t.hp > 0) breakHit(st, t, 0, ev); }
    else if (k === 'entrave') { const t = strike(st.units[it.t], 0.6); if (t && t.hp > 0 && defense === 'none') { t.frozen = 1; ev.push({ t: 'status', u: t.uid, s: 'Gelée', k: 'frost' }); } }
    else if (k === 'marque') strike(st.units[it.t], 1.5);
    else if (k === 'rempart') front(st, 'enemy').forEach((x) => { x.shield = 1; ev.push({ t: 'status', u: x.uid, s: 'Bouclier', k: 'guard' }); });
    else if (k === 'priere') heal(e, e.maxHp * 0.25, ev);
    else if (k === 'contagion') { if (defense !== 'none') defended(st, e, null, ev, defense, 'blast'); else front(st, 'ally').forEach((x) => addPoison(st, x, 3, ev, e)); }
    else { ev.push({ t: 'aoe', u: aUid, side: 'enemy' }); if (defense !== 'none') defended(st, e, null, ev, defense, 'blast'); else front(st, 'ally').forEach((x) => hurt(st, x, dmgOf(st, e, x, 0.7), ev, aUid)); }
  } else if (kind === 'decree') {
    st.law = it.law; logBoss(st, LAWS[it.law].name);
    ev.push({ t: 'boss', u: aUid, s: LAWS[it.law].name }); ev.push({ t: 'law', law: it.law });
  } else if (kind === 'shift') {
    e.aspect = it.aspect; st.aspect = it.aspect; logBoss(st, ASPECTS[it.aspect].name);
    ev.push({ t: 'boss', u: aUid, s: ASPECTS[it.aspect].name }); ev.push({ t: 'law', aspect: it.aspect });
  }
  // Miroir de l'Abîme : la première grosse attaque du combat se retourne en partie contre l'ennemi
  if (big && st.miroir && e.hp > 0) {
    dealt = ev.slice(evStart).filter((x) => x.t === 'dmg' && st.units[x.u]?.side === 'ally').reduce((n, x) => n + x.d, 0);
    if (dealt > 0) { st.miroir = false; ev.push({ t: 'status', u: aUid, s: 'Miroir de l’Abîme', syn: true }); hurt(st, e, Math.ceil(dealt / 2), ev); }
  }
  // Pacte du Reflet : chaque action spéciale ennemie te renvoie son écho
  if (st.pact === 'reflet' && SPECIAL.includes(kind)) {
    gainFervor(st, 1, ev, 'Écho');
    if (['shield', 'heal'].includes(kind)) { const w = front(st, 'ally').slice().sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0]; if (w) { w.shield = 1; ev.push({ t: 'status', u: w.uid, s: 'Écho : bouclier', k: 'guard' }); } }
  }
  e.slow = false;
  check(st, ev);
  return ev;
}
// Défense active réussie. Esquive : aucun dégât, +1 Ferveur. Parade parfaite : aucun dégât,
// +2 Ferveur, +2 Brisure à l'attaquant, contre-attaque des Gardes et des Assauts.
function defended(st, e, t, ev, defense, kind) {
  if (defense === 'dodge') {
    st.stats.dodges++;
    ev.push({ t: 'dodge', u: t?.uid || null, a: e.uid });
    gainFervor(st, 1, ev, 'Esquive');
    return;
  }
  st.stats.parries++;
  ev.push({ t: 'parry', u: t?.uid || null, a: e.uid });
  gainFervor(st, 2 + (has(st, 'parade') ? 1 : 0), ev, 'Parade parfaite');
  breakHit(st, e, 2 + (has(st, 'parade') ? 1 : 0), ev, { side: 'ally' });
  const c = t && ['protecteur', 'degats'].includes(t.role) && t.hp > 0 ? t : null;
  if (c && e.hp > 0 && kind !== 'blast') { ev.push({ t: 'counter', a: c.uid, u: e.uid }); hurt(st, e, dmgOf(st, c, e, 1), ev, c.uid); }
}
export function endEnemyTurn(st) {
  const ev = takeSkips(st);
  st.queue = [];
  if (st.over || st.turn !== 'enemy') return ev;
  // Dégel : face au Souffle de givre, tes Soigneurs libèrent les créatures gelées
  if ((st.bossPower === 'givre' || st.bossKey === 'matriarche') && front(st, 'ally').some((x) => x.kw === 'soin')) {
    front(st, 'ally').filter((x) => x.frozen).forEach((x) => { x.frozen = 0; ev.push({ t: 'status', u: x.uid, s: 'Dégel', syn: true }); });
  }
  // Repos : les créatures en réserve récupèrent 10 % de leurs PV (le poison reste)
  reserve(st, 'ally').forEach((x) => { if (x.hp < x.maxHp) heal(x, Math.ceil(x.maxHp * 0.1), ev); });
  st.order.ally.forEach((id) => { const x = st.units[id]; if (x.prey) x.prey--; });
  for (const u of alive(st, 'enemy')) {
    if (u.mark) u.mark--;
    if (u.frostCD) u.frostCD--;
    if (u.broken && st.round >= u.brokenEnd) { u.broken = false; u.brokenSkip = false; u.brkMax = Math.round(u.brkMax * 1.4); u.brk = u.brkMax; ev.push({ t: 'recover', u: u.uid }); }
  }
  st.round++;
  startAllyTurn(st, ev);
  ev.push({ t: 'phase', side: 'ally' });
  return ev;
}

// ——— Intentions ennemies ———
// Cible selon la famille (Prédateur : la plus blessée ; Assassin : la plus fragile ; sinon la plus forte)
const elusive = (st, x) => hasP(x, 'insaisissable') && (boosted(x, 'insaisissable') ? x.lastStruck !== st.round - 1 && x.lastStruck !== st.round : !x.struck);
function pickTarget(st, e) {
  let ts = targetsFor(st, 'enemy', e).map((id) => st.units[id]).filter(Boolean);
  if (!ts.length) return null;
  const seen = ts.filter((x) => !elusive(st, x));
  if (seen.length) ts = seen;
  // coopération : tous les ennemis s'acharnent sur la proie désignée (si elle est attaquable)
  const prey = ts.find((x) => x.prey > 0);
  if (prey) return prey.uid;
  const by = (f) => ts.slice().sort(f)[0].uid;
  if (e.fam === 'predateur') return by((x, y) => x.hp - y.hp);
  if (e.fam === 'assassin') return by((x, y) => x.maxHp - y.maxHp || x.hp - y.hp);
  if (e.fam === 'gardien' && e.phase2) { const s = ts.find((x) => x.role === 'soin'); if (s) return s.uid; }
  return by((x, y) => (y.atk + (y.boost || 0)) - (x.atk + (x.boost || 0)) || x.hp - y.hp);
}
function planIntents(st) {
  for (const e of alive(st, 'enemy')) {
    e.intent = null;
    if (!inFront(st, e) || e.frozen || e.brokenSkip) continue;
    const kind = intentKind(st, e);
    let t = null;
    if (SINGLE.includes(kind)) t = pickTarget(st, e);
    if (kind === 'hunt') t = front(st, 'ally').filter((x) => x.hp > 0).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp || x.maxHp - y.maxHp)[0]?.uid || null;
    if (kind === 'shield') {
      const free = front(st, 'enemy').filter((x) => !x.shield);
      t = (free.find((x) => x !== e && x.charged) || free.sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0])?.uid || e.uid;
    }
    if (kind === 'heal') t = front(st, 'enemy').slice().sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0]?.uid;
    const extra = {};
    if (kind === 'gorge') t = targetsFor(st, 'enemy', e).map((id) => st.units[id]).sort((x, y) => y.hp - x.hp)[0]?.uid || null;
    if (kind === 'mimic') {
      // copie la compétence de ta créature la plus forte au combat
      const src = front(st, 'ally').slice().sort((x, y) => (y.atk + (y.boost || 0)) - (x.atk + (x.boost || 0)))[0];
      extra.copy = src ? KITS[src.role].skill.key : 'estoc'; extra.copyName = src ? KITS[src.role].skill.name : 'Coup d’estoc';
    }
    if (kind === 'copy') { extra.copy = e.copyKey; extra.copyName = e.copyName; t = ['estoc', 'entrave', 'marque'].includes(e.copyKey) ? pickTarget(st, e) : null; }
    if (kind === 'decree') { const ks = Object.keys(LAWS).filter((k) => k !== st.law); extra.law = ks[Math.floor(rand(st) * ks.length)]; }
    if (kind === 'shift') extra.aspect = e.aspect === 'soleil' ? 'lune' : 'soleil';
    e.intent = { kind, t, qte: qteFor(e, kind) || (kind === 'copy' && ['estoc', 'entrave', 'raz', 'contagion'].includes(extra.copy)), ...extra };
  }
}
const qteFor = (e, kind) => ['heavy', 'blast', 'frost', 'gorge', 'blizzard'].includes(kind) || ((e.boss || e.elite) && ['hit', 'poison'].includes(kind));
function intentKind(st, e) {
  if (e.charged) return e.charged;
  if (e.boss && st.bossKey) return BOSSES[st.bossKey].pattern(e.phase2 ? 2 : 1, st.round);
  const r = rand(st);
  const others = front(st, 'enemy').length > 1;
  switch (e.fam) {
    case 'gardien':
      if (e.phase2) return r < 0.4 ? 'channel' : r < 0.75 ? 'charge' : 'hit';
      return st.round % 3 === 2 ? 'charge' : 'hit';
    case 'mage': return st.round % 2 === 1 ? 'channel' : 'hit';
    case 'protecteur': return st.round % 2 === 0 && others ? 'shield' : 'hit';
    case 'parasite': return r < 0.6 ? 'poison' : 'hit';
    case 'controleur': return st.round % 3 === 2 ? 'frost' : 'hit';
    case 'soutien':
      if (e.role === 'soin' && front(st, 'enemy').some((x) => x.hp < x.maxHp * 0.5)) return 'heal';
      if (e.role === 'soutien' && others && st.round % 4 === 1 && !front(st, 'ally').some((x) => x.prey > 0)) return 'hunt';
      if (e.role === 'soutien' && others && st.round % 2 === 1) return 'rally';
      return 'hit';
    default: return st.round >= 2 && r < (e.elite ? 0.3 : 0.15) ? 'charge' : 'hit';
  }
}
// Ce qu'affiche l'intention d'un ennemi : dégâts estimés, cible réelle, danger (0 à 3)
export function intentInfo(st, e) {
  const it = e.intent;
  if (!it || it.cancelled || e.hp <= 0) return null;
  const t = it.t && st.units[it.t];
  const g = t?.guardBy && st.units[t.guardBy];
  const eff = g && inFront(st, g) ? g : t;
  let dmg = 0;
  const copyM = it.kind === 'copy' ? { estoc: 2, entrave: 0.6, marque: 1.5 }[it.copy] : null;
  const m = copyM || { hit: 1, heavy: e.boss ? 2.5 : 2.2, poison: 0.6, frost: 0.5, gorge: 1.6 }[it.kind];
  const capd = (x, n) => Math.min(n, allyCap(x, it.kind));
  if (m && eff) dmg = capd(eff, dmgOf(st, e, eff, m * (eff !== t ? 0.6 : 1)));
  if (it.kind === 'blast') dmg = Math.max(0, ...front(st, 'ally').map((x) => capd(x, dmgOf(st, e, x, e.boss ? 1 : 0.8))));
  if (it.kind === 'blizzard') dmg = Math.max(0, ...front(st, 'ally').map((x) => capd(x, dmgOf(st, e, x, 0.9))));
  if (it.kind === 'copy' && it.copy === 'raz') dmg = Math.max(0, ...front(st, 'ally').map((x) => capd(x, dmgOf(st, e, x, 0.7))));
  const single = SINGLE.includes(it.kind) || !!(it.kind === 'copy' && it.t);
  const lethal = !!eff && single && dmg >= eff.hp;
  const danger = ['heavy', 'blast', 'gorge', 'blizzard', 'copy'].includes(it.kind) || lethal ? 3 : ['frost', 'charge', 'channel', 'gather', 'mimic', 'decree', 'shift', 'hunt'].includes(it.kind) || (e.boss && it.kind === 'hit') ? 2 : dmg ? 1 : 0;
  return { ...it, def: INTENTS[it.kind], dmg, target: single ? eff?.uid || null : it.t, lethal, danger, aoe: ['blast', 'blizzard'].includes(it.kind) || (it.kind === 'copy' && it.copy === 'raz') };
}
// Dégâts annoncés sur chacune de tes cartes (badges rouges)
export function threats(st) {
  const out = {};
  if (st.turn !== 'ally') return out;
  for (const e of front(st, 'enemy')) {
    const i = intentInfo(st, e);
    if (!i || !i.dmg) continue;
    if (i.aoe) { const mm = i.kind === 'blast' ? (e.boss ? 1 : 0.8) : i.kind === 'blizzard' ? 0.9 : 0.7; front(st, 'ally').forEach((x) => { out[x.uid] = (out[x.uid] || 0) + dmgOf(st, e, x, mm); }); }
    else if (i.target) out[i.target] = (out[i.target] || 0) + i.dmg;
  }
  return out;
}

// Outils du moteur prêtés aux compétences et passifs des créatures (kits.js) : un seul code par effet
const targetScore = (st, a, t) => (t.hp <= dmgOf(st, a, t, 1, { basic: true }) ? 1000 : 0) + (intentInfo(st, t)?.danger || 0) * 20 + (isWeak(a, t) ? 15 : 0) + (t.broken ? 25 : 0) - t.hp;
const API = {
  front, hurt, dmgOf, breakHit, heal, addPoison, freeze, awake, gainFervor,
  targetsOf: (st, u) => targetsFor(st, 'ally', u),
  // meilleure cible d'attaque (même calcul que le pilote automatique)
  bestTarget: (st, u) => targetsFor(st, 'ally', u).map((id) => st.units[id]).sort((x, y) => targetScore(st, u, y) - targetScore(st, u, x))[0]?.uid || null,
  // ta créature la plus menacée par les intentions annoncées (au moins 35 % de ses PV)
  threatened: (st) => { const th = threats(st); return front(st, 'ally').filter((x) => (th[x.uid] || 0) >= Math.max(3, x.hp * 0.35)).sort((x, y) => (th[y.uid] / y.hp) - (th[x.uid] / x.hp))[0] || null; },
  // l'ennemi au combat dont l'intention est la plus dangereuse (danger 2 ou plus)
  dangerous: (st) => front(st, 'enemy').map((e) => ({ e, i: intentInfo(st, e) })).filter((x) => x.i && x.i.danger >= 2).sort((a, b) => b.i.danger - a.i.danger || b.i.dmg - a.i.dmg)[0]?.e || null,
};

// Défense active : durée (ms) de la zone d'esquive ; la parade parfaite en est le dernier instant
export function defenseWindow(st, aUid, tUid) {
  const e = st.units[aUid], u = st.units[tUid] || front(st, 'ally')[0];
  const kind = e?.intent?.kind || 'hit';
  let w = { hit: 230, poison: 230, frost: 210, heavy: 190, blast: 200 }[kind] || 220;
  // écart de niveau : il aide (ou gêne) un peu, sans jamais rendre l'esquive impossible
  w += Math.max(-30, Math.min(45, 10 * ((u?.level || 1) - (e?.level || 1))));
  // plancher selon la catégorie de l'ennemi : 200 ms (normal), 180 ms (élite), 160 ms (gardien)
  const floor = e?.boss ? 160 : e?.elite ? 180 : 200;
  if (e?.boss) w -= 30; else if (e?.elite) w -= 15;
  w = Math.max(floor, Math.min(320, Math.round(w)));
  // parade : fenêtre étroite (environ 1/5 de l'esquive), au tout dernier instant avant l'impact
  return { dodge: w, parry: Math.max(32, Math.round(w * 0.2)) };
}

// ——— Pilote automatique (bouton Auto et simulations) ———
// smart : contre d'abord les gros dangers (gel, rempart, défense, soin), exploite marques et Brisures,
// puis attaque les cibles les plus rentables. Il ne fait jamais de parade : la défense active reste au joueur.
export function autoActs(st, { smart = true } = {}) {
  const ev = [];
  const go = (uid, key, t) => { const e = act(st, uid, key, t); ev.push(...e); return e.length > 0; };
  for (let guard = 0; guard < 12 && !st.over && st.turn === 'ally' && st.ap > 0; guard++) {
    if (smart && ultReady(st) && shouldUlt(st)) { ev.push(...useUlt(st)); continue; }
    if (smart && smartMove(st, go)) continue;
    const me = front(st, 'ally').filter((u) => actionsFor(st, u.uid)[0].ok);
    if (!me.length) break;
    const a = me.sort((x, y) => (y.atk + y.boost) - (x.atk + x.boost))[0];
    const ts = actionTargets(st, a.uid, 'attack').map((id) => st.units[id]);
    const score = (t) => (t.hp <= dmgOf(st, a, t, 1, { basic: true }) ? 1000 : 0) + (smart ? (intentInfo(st, t)?.danger || 0) * 20 + (isWeak(a, t) ? 15 : 0) + (t.broken ? 25 : 0) : 0) - t.hp;
    const t = ts.sort((x, y) => score(y) - score(x))[0];
    if (!t || !go(a.uid, 'attack', t.uid)) break;
  }
  return ev;
}
function shouldUlt(st) {
  const hurtAllies = front(st, 'ally').some((u) => u.hp < u.maxHp * 0.45) || st.order.ally.some((id) => st.units[id].hp <= 0);
  if (st.ult === 'sceau' || st.ult === 'revive') return hurtAllies;
  return true;
}
function smartMove(st, go) {
  const can = (u, k) => actionsFor(st, u.uid).find((a) => a.key === k)?.ok;
  const allies = front(st, 'ally');
  const foes = front(st, 'enemy');
  const danger = foes.map((e) => ({ e, i: intentInfo(st, e) })).filter((x) => x.i && x.i.danger >= 3).sort((a, b) => b.i.dmg - a.i.dmg);
  // 1. un coup dangereux : geler l'ennemi, sinon protéger ou défendre la cible
  for (const { e, i } of danger) {
    const ice = allies.find((u) => u.role === 'controle' && can(u, 'entrave') && actionTargets(st, u.uid, 'entrave').includes(e.uid) && (rollInfo(st, u.uid, 'entrave', e.uid)?.chance || 0) >= 45);
    if (ice && go(ice.uid, 'entrave', e.uid)) return true;
    const tgt = i.target && st.units[i.target];
    if (tgt && (i.lethal || i.kind === 'heavy')) {
      const wall = allies.find((u) => u.role === 'protecteur' && u.uid !== tgt.uid && can(u, 'rempart') && !tgt.guardBy);
      if (wall && go(wall.uid, 'rempart', tgt.uid)) return true;
      if (i.lethal && !tgt.defend && tgt.acts === 0 && can(tgt, 'defend') && go(tgt.uid, 'defend')) return true;
    }
  }
  // 2. soigner une créature en danger
  const low = allies.filter((u) => u.hp < u.maxHp * 0.35).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  const healer = allies.find((u) => u.role === 'soin' && can(u, 'priere'));
  if (low && healer && go(healer.uid, 'priere', low.uid)) return true;
  // 2 ter. geler d'avance l'ennemi qui annonce le plus de dégâts, si le jet est favorable et la Ferveur suffit
  const icer = allies.find((u) => u.role === 'controle' && can(u, 'entrave'));
  if (icer && st.fervor >= 3) {
    const hot = actionTargets(st, icer.uid, 'entrave').map((id) => ({ e: st.units[id], i: intentInfo(st, st.units[id]) }))
      .filter((x) => x.i && x.i.dmg > 0 && (rollInfo(st, icer.uid, 'entrave', x.e.uid)?.chance || 0) >= 55).sort((a, b) => b.i.dmg - a.i.dmg)[0];
    if (hot && go(icer.uid, 'entrave', hot.e.uid)) return true;
  }
  // 2 bis. compétences propres des créatures, quand leur conseil s'applique
  for (const u of allies) {
    const k = moveOf(u);
    if (!k || !can(u, k)) continue;
    const r = moveFor(u, k).ai(st, u, API);
    if (r && go(u.uid, k, r === 'none' ? null : r)) return true;
  }
  // 3. Coup d'estoc sur une cible brisée, marquée ou gelée
  for (const u of allies.filter((x) => x.role === 'degats' && can(x, 'estoc'))) {
    const t = actionTargets(st, u.uid, 'estoc').map((id) => st.units[id]).find((x) => x.broken || x.mark || x.frozen);
    if (t && (rollInfo(st, u.uid, 'estoc', t.uid)?.chance || 0) >= 50 && go(u.uid, 'estoc', t.uid)) return true;
  }
  // 4. Marquer un gardien ou une élite
  const big = foes.find((e) => (e.boss || e.elite) && !e.mark);
  const marker = allies.find((u) => u.role === 'soutien' && can(u, 'marque'));
  if (big && marker && st.fervor >= 3 && st.ap >= 2 && go(marker.uid, 'marque', big.uid)) return true;
  // 5. Contagion sur une cible déjà bien empoisonnée
  const vn = allies.find((u) => u.role === 'poison' && can(u, 'contagion'));
  const sick = vn && actionTargets(st, vn.uid, 'contagion').map((id) => st.units[id]).find((x) => x.poison >= 3 && (x.boss || x.elite || foes.length >= 3));
  if (sick && st.fervor >= 3 && go(vn.uid, 'contagion', sick.uid)) return true;
  // 6. Raz-de-marée contre 3 ennemis ou plus
  const raz = allies.find((u) => u.role === 'zone' && can(u, 'raz'));
  if (raz && foes.length >= 3 && st.fervor >= 4 && go(raz.uid, 'raz')) return true;
  return false;
}
// Tour complet automatique. defense(st, coup) → 'none' | 'dodge' | 'parry' (talent du joueur simulé)
export function autoTurn(st, defense = () => 'none', opts = {}) {
  const ev = autoActs(st, opts);
  if (st.over) return ev;
  ev.push(...endTurn(st, defense));
  return ev;
}
export function autoDuel(st, max = 60, defense, opts) {
  for (let i = 0; i < max && !st.over; i++) autoTurn(st, defense, opts);
  if (!st.over) st.over = 'lost';
  return st;
}
// Fin de tour d'un bloc (simulations et tests)
export function endTurn(st, defense = () => 'none') {
  const ev = beginEnemyTurn(st);
  for (let s = nextEnemy(st); s; s = nextEnemy(st)) ev.push(...enemyAct(st, s.a, s.qte ? defense(st, s) : 'none'));
  ev.push(...endEnemyTurn(st));
  return ev;
}

// Bilan d'un combat terminé, en quelques phrases simples (noms fournis par l'appelant).
// Défaite : qui a fait le plus de dégâts, quelle attaque a été décisive, défenses manquées, conseil.
// Victoire : le fait marquant (Brisure, parades, enchaînements, coups de grâce).
const KIND_TXT = { heavy: 'un coup chargé', blast: 'une déflagration', gorge: 'le festin du Dévoreur', blizzard: 'une tempête de givre', copy: 'une copie de ta créature', hit: 'une attaque', poison: 'le poison', frost: 'le gel' };
// ——— Objectifs bonus : un par combat de la Descente ———
// rooms : salles où l'objectif peut tomber. state : 'done' (réussi), 'fail' (raté), sinon en cours.
export const GOALS = {
  nofall: { name: 'Sans perte', desc: 'Gagne sans qu’aucune créature ne tombe.', rooms: ['fight', 'elite', 'boss'] },
  swift:  { name: 'Éclair', desc: 'Gagne en 3 tours au plus.', rooms: ['fight'], limit: 3 },
  swift5: { name: 'Assaut rapide', desc: 'Gagne en 5 tours au plus.', rooms: ['elite', 'boss'], limit: 5 },
  weak:   { name: 'Points faibles', desc: 'Exploite 2 faiblesses de faction.', rooms: ['fight', 'elite', 'boss'], n: 2 },
  combo:  { name: 'Coordination', desc: 'Réussis une combinaison : Chasse, Bris de glace, Bastion ou un Enchaînement.', rooms: ['fight', 'elite', 'boss'] },
  parry:  { name: 'Lame-miroir', desc: 'Réussis une parade parfaite.', rooms: ['elite', 'boss'] },
  brk:    { name: 'Briseur', desc: 'Brise l’ennemi au moins une fois.', rooms: ['elite', 'boss'] },
  ferveur:{ name: 'Brasier', desc: 'Lance le pouvoir d’équipe.', rooms: ['fight', 'elite', 'boss'] },
};
export function goalState(st) {
  const k = st.goal, G = GOALS[k];
  if (!G) return null;
  const S = st.stats || {}, fell = (st.fallenLog || []).length > 0;
  let state = 'pending', p = '';
  if (k === 'nofall') state = fell ? 'fail' : st.over === 'won' ? 'done' : 'pending';
  else if (k === 'swift' || k === 'swift5') { state = st.round > G.limit ? 'fail' : st.over === 'won' ? 'done' : 'pending'; p = `tour ${Math.min(st.round, G.limit)}/${G.limit}`; }
  else if (k === 'weak') { state = (S.weak || 0) >= G.n ? 'done' : 'pending'; p = `${Math.min(G.n, S.weak || 0)}/${G.n}`; }
  else if (k === 'combo') state = (S.named || 0) + (S.combos || 0) > 0 ? 'done' : 'pending';
  else if (k === 'parry') state = S.parries > 0 ? 'done' : 'pending';
  else if (k === 'brk') state = S.breaks > 0 ? 'done' : 'pending';
  else if (k === 'ferveur') state = S.ults > 0 ? 'done' : 'pending';
  if (st.over === 'lost' && state !== 'done') state = 'fail';
  return { key: k, ...G, state, p };
}
export function battleReport(st, name) {
  const s = st.stats || {}, out = [];
  if (st.over === 'lost') {
    const top = Object.entries(st.taken || {}).sort((a, b) => b[1] - a[1])[0];
    if (top) out.push(`${name(top[0])} t’a infligé le plus de dégâts (${top[1]}).`);
    const first = (st.fallenLog || [])[0];
    if (first) out.push(`${name(first.u)} est tombé${first.round ? ` au tour ${first.round}` : ''}${first.by ? `, sous ${KIND_TXT[first.kind] || 'une attaque'} de ${name(first.by)}` : ''}.`);
    if (s.missed) out.push(`${s.missed} attaque${s.missed > 1 ? 's' : ''} dangereuse${s.missed > 1 ? 's' : ''} n’${s.missed > 1 ? 'ont' : 'a'} pas été parée${s.missed > 1 ? 's' : ''}.`);
    const tip = s.missed ? 'Contre les attaques annoncées « Danger », touche au bon moment pour esquiver ou parer.'
      : !s.breaks && Object.values(st.units).some((u) => u.side === 'enemy' && (u.boss || u.elite)) ? 'Concentre tes coups sur l’élite ou le gardien pour le briser : il perd son tour.'
      : 'Frappe la même cible avec plusieurs créatures : chaque coup suivant gagne un bonus d’Enchaînement.';
    out.push(tip);
  } else if (st.over === 'won') {
    const best = [[s.parries, (n) => `${n} parade${n > 1 ? 's' : ''} parfaite${n > 1 ? 's' : ''}`], [s.breaks, (n) => `${n} Brisure${n > 1 ? 's' : ''}`], [s.combos, (n) => `${n} enchaînement${n > 1 ? 's' : ''}`], [s.finishers, (n) => `${n} coup${n > 1 ? 's' : ''} de grâce`], [s.crits, (n) => `${n} critique${n > 1 ? 's' : ''} au dé`]]
      .filter(([n]) => n > 0).map(([n, f]) => f(n));
    if (best.length) out.push(`Fait marquant : ${best.slice(0, 2).join(' et ')}.`);
  }
  return out;
}
