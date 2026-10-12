// ABYSSAL : duel de cartes. Moteur pur (état JSON, reprise exacte).
// Chaque carte a une ATTAQUE, des PV et une capacité liée à son rôle.
// Ton tour : chaque carte au combat attaque une fois (la cible riposte), puis « Fin du tour »
// et les créatures corrompues attaquent. 3 cartes au combat par camp ; la réserve prend la relève.
// Stratégie : les ennemis annoncent leur cible (intention), une fois par tour on peut échanger
// une carte avec la réserve, et chaque attaque ennemie peut être esquivée (plus dur face à plus fort).
import { roleOf } from './army.js';

export const FRONT = 3;
export const GAUGE_MAX = 5;

// Capacités (une par rôle)
export const KEYWORDS = {
  garde:     { name: 'Garde',     icon: 'shield',  desc: 'Les ennemis doivent l’attaquer en premier.' },
  assaut:    { name: 'Assaut',    icon: 'swords',  desc: 'Quand elle attaque, la cible ne riposte pas. En contrepartie, elle ne riposte pas non plus jusqu’à son prochain tour.' },
  soin:      { name: 'Soin',      icon: 'heart',   desc: 'À la fin de son tour, soigne l’allié le plus blessé.' },
  venin:     { name: 'Venin',     icon: 'skull',   desc: 'Empoisonne ce qu’elle touche : 2 PV perdus à chaque tour. Son coup traverse les boucliers.' },
  gel:       { name: 'Gel',       icon: 'eye',     desc: 'Ce qu’elle touche ne peut pas attaquer au tour suivant, et perd sa charge. Un gardien gelé résiste au gel suivant.' },
  cri:       { name: 'Cri',       icon: 'sparkle', desc: 'Au début de son tour, ses alliés gagnent +1 en attaque.' },
  deferlante: { name: 'Déferlante', icon: 'flame', desc: 'Son attaque touche aussi les voisins de la cible (moitié des dégâts).' },
};
// Synergies entre capacités (affichées dans les règles et au moment où elles jouent)
export const SYNERGIES = [
  { a: 'gel', b: 'venin', name: 'Givre-venin', desc: 'Le Venin sur une cible gelée l’empoisonne deux fois plus.' },
  { a: 'cri', b: 'deferlante', name: 'Raz-de-marée', desc: 'Renforcée par un Cri, la Déferlante frappe les voisins à pleine puissance.' },
  { a: 'venin', b: null, name: 'Perce-bouclier', desc: 'Le Venin traverse les boucliers (et la Carapace des gardiens).' },
  { a: 'gel', b: null, name: 'Interruption', desc: 'Geler un ennemi qui se charge annule son coup chargé.' },
];
// Intentions ennemies : ce que chaque ennemi prépare (annoncé au début de ton tour)
export const INTENTS = {
  hit:    { name: 'Coup',        icon: 'swords', desc: 'Frappe la cible annoncée.' },
  zone:   { name: 'Zone',        icon: 'flame',  desc: 'Frappe toutes tes cartes au combat (60 % de son attaque), sans riposte.' },
  charge: { name: 'Se charge',   icon: 'sparkle', desc: 'N’attaque pas ce tour-ci, mais frappera deux fois plus fort au suivant. Gèle-le pour l’interrompre.' },
  heavy:  { name: 'Coup chargé', icon: 'skull',  desc: 'Frappe la cible annoncée avec deux fois son attaque.' },
};
// Pouvoirs des gardiens (un tous les 5 étages, dans cet ordre, puis on recommence)
// weak : la capacité qui le contre (point faible affiché avant et pendant le combat)
export const BOSS_POWERS = {
  carapace: { name: 'Carapace', desc: 'Un tour sur deux, le gardien se couvre d’un bouclier qui bloque un coup.', weak: 'venin', counter: 'Le Venin traverse sa carapace.' },
  givre:    { name: 'Souffle de givre', desc: 'Un tour sur deux, le gardien gèle ta créature la plus forte.', weak: 'soin', counter: 'Tes Soigneurs dégèlent tes créatures à la fin de son tour.' },
  fureur:   { name: 'Fureur croissante', desc: 'À chaque tour, le gardien gagne +1 en attaque.', weak: 'gel', counter: 'Gelé, il ne gagne pas de fureur.' },
  devoreur: { name: 'Dévoreur', desc: 'À chaque tour, le gardien récupère 15 % de ses PV.', weak: 'assaut', counter: 'Un coup d’Assaut l’empêche de se soigner au tour suivant.' },
};
// Instinct de meute : les Communes frappent plus fort les élites et les gardiens
export const PACK_BONUS = 1;
export const bossPowerOf = (floor) => ['carapace', 'givre', 'fureur', 'devoreur'][(Math.max(1, Math.floor(floor / 5)) - 1) % 4];
const KW_BY_ROLE = { protecteur: 'garde', degats: 'assaut', soin: 'soin', poison: 'venin', controle: 'gel', soutien: 'cri', zone: 'deferlante' };
// Gabarit par rôle à la rareté Commune, niveau 1
const BASE = { protecteur: [2, 11], degats: [4, 6], soin: [1, 7], poison: [2, 7], controle: [2, 7], soutien: [2, 8], zone: [2, 6] };
const RARITY_MULT = { C: 1, PC: 1.15, R: 1.3, HR: 1.45, M: 1.6, S: 1.75 };
export const keywordOf = (card) => KW_BY_ROLE[roleOf(card)];

let seq = 0;
// Une carte de combat. scale : force (niveau pour les alliés, profondeur pour les ennemis).
export function duelUnit(card, { side = 'ally', level = 1, scale = null, boss = false, elite = false } = {}) {
  const role = roleOf(card), [a, h] = BASE[role];
  const k = RARITY_MULT[card.rarity] * (scale ?? (1 + 0.08 * (level - 1)));
  const atk = Math.max(1, Math.round(a * k * (boss ? 1.3 : 1)));
  const hp = Math.max(1, Math.round(h * k * (boss ? 2.6 : elite ? 1.5 : 1)));
  return {
    uid: `${side[0]}${++seq}`, id: card.id, name: card.name, side, rarity: card.rarity, role, kw: KW_BY_ROLE[role],
    atk, hp, maxHp: hp, level, boss, elite, poison: 0, frozen: 0, boost: 0, shield: 0, attacked: false, intent: null, kind: null,
  };
}

// ——— État ———
export function createDuel(allies, enemies, { gauge = 0, ult = 'sceau', power = 1, known = {}, ruleMult = 1, bossPower = null } = {}) {
  const st = { units: {}, order: { ally: [], enemy: [] }, turn: 'ally', round: 1, gauge: Math.min(GAUGE_MAX, gauge), ult, power, known, ruleMult, over: null, kills: [], swapped: false, queue: [], bossPower };
  for (const u of [...allies, ...enemies]) { st.units[u.uid] = { ...u }; st.order[u.side].push(u.uid); }
  ['ally', 'enemy'].forEach((side) => front(st, side).forEach((u) => { u.inPlay = true; }));
  startTurn(st, 'ally', []);
  planIntents(st);
  return st;
}
export const alive = (st, side) => st.order[side].map((id) => st.units[id]).filter((u) => u.hp > 0);
export const front = (st, side) => alive(st, side).slice(0, FRONT);
export const reserve = (st, side) => alive(st, side).slice(FRONT);
const other = (side) => (side === 'ally' ? 'enemy' : 'ally');
const atkOf = (st, u, t) => Math.max(0, u.atk + u.boost + (u.side === 'ally' && t && st.known[t.id] ? 1 : 0) + (u.side === 'ally' && u.rarity === 'C' && t && (t.boss || t.elite) ? PACK_BONUS : 0)) * (st.ruleMult || 1);
// Petit hasard reproductible (même combat repris = mêmes intentions)
const roll = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return ((h >>> 0) % 1000) / 1000; };

// Cibles autorisées : la Garde d'abord
export function targetsFor(st, side) {
  const f = front(st, other(side));
  const g = f.filter((u) => u.kw === 'garde');
  return (g.length ? g : f).map((u) => u.uid);
}
export const canAct = (st, u) => st.turn === u.side && !st.over && u.hp > 0 && !u.attacked && !u.frozen && front(st, u.side).includes(u);

// ——— Dégâts ———
function damage(st, u, n, ev, src = null, pierce = false) {
  if (u.hp <= 0 || n <= 0) return 0;
  if (u.shield && pierce) { u.shield = 0; ev.push({ t: 'status', u: u.uid, s: 'Perce-bouclier' }); }
  if (u.shield) { u.shield = 0; ev.push({ t: 'block', u: u.uid }); return 0; }
  const d = Math.min(u.hp, Math.round(n));
  u.hp -= d;
  ev.push({ t: 'dmg', u: u.uid, d, hp: u.hp, src });
  if (u.hp <= 0) {
    ev.push({ t: 'die', u: u.uid });
    if (u.side === 'enemy') st.kills.push(u.id);
  }
  return d;
}
function heal(u, n, ev) {
  if (u.hp <= 0) return;
  const h = Math.min(u.maxHp - u.hp, Math.round(n));
  if (h > 0) { u.hp += h; ev.push({ t: 'heal', u: u.uid, d: h }); }
}
function check(st, ev) {
  if (!alive(st, 'enemy').length) st.over = 'won';
  else if (!alive(st, 'ally').length) st.over = 'lost';
  // une carte de réserve qui entre en jeu ne peut pas attaquer tout de suite
  for (const side of ['ally', 'enemy']) front(st, side).forEach((u) => { if (!u.inPlay) { u.inPlay = true; u.attacked = true; ev.push({ t: 'enter', u: u.uid }); } });
}

// ——— Attaque d'une carte ———
// kind : intention d'un ennemi ('zone' : toute la ligne à 60 %, 'heavy' : double dégâts)
export function attack(st, aUid, tUid, { dodged = false, kind = 'hit' } = {}) {
  const a = st.units[aUid], t = st.units[tUid], ev = [];
  if (!a || !t || !canAct(st, a) || !targetsFor(st, a.side).includes(tUid)) return ev;
  a.attacked = true;
  if (a.kw === 'assaut') a.exposed = true; // ne ripostera pas avant son prochain tour
  ev.push({ t: 'attack', a: a.uid, u: t.uid, kind });
  if (kind === 'zone') {
    if (dodged) { ev.push({ t: 'dodge', u: t.uid }); if (t.side === 'ally') st.gauge = Math.min(GAUGE_MAX, st.gauge + 1); }
    else front(st, t.side).forEach((x) => damage(st, x, Math.ceil(atkOf(st, a, x) * 0.6), ev, a.uid));
    check(st, ev);
    return ev;
  }
  let hit = 0;
  // une esquive réussie remplit la jauge du pouvoir
  if (dodged) { t.dodges = (t.dodges || 0) + 1; ev.push({ t: 'dodge', u: t.uid }); if (t.side === 'ally') st.gauge = Math.min(GAUGE_MAX, st.gauge + 1); }
  else hit = damage(st, t, atkOf(st, a, t) * (kind === 'heavy' ? 2 : 1), ev, a.uid, a.kw === 'venin');
  if (hit && t.hp > 0) {
    if (a.kw === 'venin') {
      const combo = t.frozen > 0;
      t.poison = Math.min(combo ? 10 : 6, t.poison + (combo ? 4 : 2));
      ev.push({ t: 'status', u: t.uid, s: combo ? 'Givre-venin !' : 'Venin', syn: combo });
    }
    if (a.kw === 'gel') {
      if (t.boss && t.frostCD > 0) ev.push({ t: 'status', u: t.uid, s: 'Résiste au gel' });
      else {
        t.frozen = 1;
        if (t.boss) t.frostCD = 2;
        ev.push({ t: 'status', u: t.uid, s: 'Gelé' });
        if (t.charged) { t.charged = false; t.kind = null; ev.push({ t: 'status', u: t.uid, s: 'Charge interrompue', syn: true }); }
      }
    }
    if (a.kw === 'assaut' && t.boss) t.wound = 1;
  }
  if (a.kw === 'deferlante') {
    const row = front(st, t.side), i = row.findIndex((x) => x.uid === t.uid);
    const full = a.boost > 0; // Raz-de-marée : renforcée par un Cri
    if (full && (row[i - 1] || row[i + 1])) ev.push({ t: 'status', u: a.uid, s: 'Raz-de-marée !', syn: true });
    [row[i - 1], row[i + 1]].filter(Boolean).forEach((n) => damage(st, n, full ? atkOf(st, a, n) : Math.ceil(atkOf(st, a, n) / 2), ev, a.uid));
  }
  // riposte (sauf contre Assaut, et pas pour une carte d'Assaut qui vient d'attaquer)
  if (t.hp > 0 && a.kw !== 'assaut' && !t.exposed && atkOf(st, t, a) > 0) { ev.push({ t: 'riposte', a: t.uid, u: a.uid }); damage(st, a, atkOf(st, t, a), ev, t.uid); }
  if (a.side === 'ally') st.gauge = Math.min(GAUGE_MAX, st.gauge + 1);
  check(st, ev);
  return ev;
}

// ——— Pouvoir du gardien, au début de son tour ———
function bossAct(st, ev) {
  const b = front(st, 'enemy').find((u) => u.boss && u.hp > 0);
  if (!b) return;
  const frozen = b.attacked; // gelé ce tour-ci
  if (b.frostCD) b.frostCD--;
  const wound = b.wound; b.wound = 0;
  const even = st.round % 2 === 1; // tours 1, 3, 5…
  const p = st.bossPower;
  if (p === 'carapace' && even) { b.shield = 1; ev.push({ t: 'boss', u: b.uid, s: 'Carapace !' }); }
  else if (p === 'givre' && even) {
    const t = front(st, 'ally').filter((u) => u.hp > 0).sort((x, y) => y.atk - x.atk)[0];
    if (t) { t.frozen = 1; ev.push({ t: 'boss', u: b.uid, s: 'Souffle de givre' }); ev.push({ t: 'status', u: t.uid, s: 'Gelé' }); }
  } else if (p === 'fureur') {
    if (frozen) ev.push({ t: 'status', u: b.uid, s: 'Fureur gelée', syn: true });
    else { b.atk += 1; ev.push({ t: 'boss', u: b.uid, s: `Fureur : ${b.atk} ATQ` }); }
  } else if (p === 'devoreur' && b.hp < b.maxHp) {
    if (wound) ev.push({ t: 'status', u: b.uid, s: 'Plaie ouverte : pas de soin', syn: true });
    else { heal(b, b.maxHp * 0.15, ev); ev.push({ t: 'boss', u: b.uid, s: 'Dévore…' }); }
  }
}

// ——— Début et fin de tour ———
function startTurn(st, side, ev) {
  st.turn = side;
  if (side === 'ally') st.swapped = false;
  for (const u of alive(st, side)) { u.attacked = false; u.boost = 0; u.exposed = false; }
  for (const u of front(st, side)) {
    if (u.frozen) { u.frozen--; if (u.frozen === 0) u.attacked = true; } // gelé : passe ce tour
    if (u.poison) { damage(st, u, 2, ev); u.poison = Math.max(0, u.poison - 2); }
  }
  if (side === 'enemy' && st.bossPower) bossAct(st, ev);
  const criers = front(st, side).filter((u) => u.kw === 'cri' && u.hp > 0);
  if (criers.length) { front(st, side).forEach((u) => { u.boost += criers.length; }); ev.push({ t: 'status', u: criers[0].uid, s: `Cri : +${criers.length} ATQ` }); }
  check(st, ev);
}
function endOf(st, side, ev) {
  for (const u of front(st, side).filter((x) => x.kw === 'soin' && x.hp > 0)) {
    const w = alive(st, side).filter((x) => x.hp < x.maxHp).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
    if (w) heal(w, Math.max(2, Math.round(u.atk * 1.5 + 1)), ev);
  }
  // Dégel : à la fin du tour adverse, tes Soigneurs libèrent les créatures gelées par un gardien
  if (side === 'enemy' && st.bossPower === 'givre' && front(st, 'ally').some((x) => x.kw === 'soin' && x.hp > 0)) {
    front(st, 'ally').filter((x) => x.frozen && x.hp > 0).forEach((x) => { x.frozen = 0; ev.push({ t: 'status', u: x.uid, s: 'Dégel', syn: true }); });
  }
}
// Fin du tour du joueur. Le tour ennemi se joue coup par coup (beginEnemyTurn, nextStrike, strike,
// endEnemyTurn) pour laisser le joueur esquiver ; endTurn le joue d'un bloc (simulations).
export function beginEnemyTurn(st) {
  const ev = [];
  if (st.over || st.turn !== 'ally') return ev;
  endOf(st, 'ally', ev);
  startTurn(st, 'enemy', ev);
  ev.push({ t: 'phase', side: 'enemy' });
  st.queue = front(st, 'enemy').map((u) => u.uid);
  return ev;
}
// Prochain coup ennemi : { a: attaquant, t: cible } (l'intention annoncée si elle tient encore), ou null
export function nextStrike(st) {
  while (!st.over && st.turn === 'enemy' && st.queue.length) {
    const e = st.units[st.queue[0]];
    if (!e || !canAct(st, e)) { st.queue.shift(); continue; }
    const ts = targetsFor(st, 'enemy');
    const t = e.intent && ts.includes(e.intent) ? e.intent : enemyTarget(st, e);
    if (!t) { st.queue.shift(); continue; }
    return { a: e.uid, t, kind: e.kind || 'hit' };
  }
  return null;
}
export function strike(st, a, t, { dodged = false } = {}) {
  if (st.queue[0] === a) st.queue.shift();
  const e = st.units[a], kind = e?.kind || 'hit';
  if (kind === 'charge') {
    // se charge : pas d'attaque ce tour-ci, coup double au suivant
    e.attacked = true; e.charged = true;
    return [{ t: 'status', u: a, s: 'Se charge…' }];
  }
  if (kind === 'heavy') e.charged = false;
  return attack(st, a, t, { dodged, kind });
}
export function endEnemyTurn(st) {
  const ev = [];
  st.queue = [];
  if (!st.over && st.turn === 'enemy') { endOf(st, 'enemy', ev); st.round++; startTurn(st, 'ally', ev); planIntents(st); ev.push({ t: 'phase', side: 'ally' }); }
  return ev;
}
export function endTurn(st, dodge = () => false) {
  const ev = beginEnemyTurn(st);
  for (let s = nextStrike(st); s; s = nextStrike(st)) ev.push(...strike(st, s.a, s.t, { dodged: s.kind !== 'charge' && dodge(st, s) }));
  ev.push(...endEnemyTurn(st));
  return ev;
}
// Intentions : au début de ton tour, chaque ennemi annonce qui il va frapper.
// Chaque ennemi annonce aussi le type de son attaque : coup simple, zone (Fléaux), charge.
function planIntents(st) {
  for (const e of alive(st, 'enemy')) {
    const on = front(st, 'enemy').includes(e) && !e.frozen;
    e.intent = on ? enemyTarget(st, e) : null;
    e.kind = on ? intentKind(st, e) : null;
  }
}
function intentKind(st, e) {
  if (e.charged) return 'heavy';
  const r = roll(`${e.uid}:${st.round}`);
  if (e.kw === 'deferlante' && r < 0.5) return 'zone';
  if (st.round >= 2 && r > (e.boss ? 0.62 : e.elite ? 0.72 : 0.85)) return 'charge';
  return 'hit';
}
// Dégâts annoncés sur chacune de tes cartes (pour l'affichage)
export function threats(st) {
  const out = {};
  if (st.turn !== 'ally') return out;
  const ts = targetsFor(st, 'enemy');
  for (const e of front(st, 'enemy')) {
    if (e.frozen) continue;
    if (e.kind === 'charge') continue;
    if (e.kind === 'zone') { front(st, 'ally').forEach((x) => { out[x.uid] = (out[x.uid] || 0) + Math.ceil(atkOf(st, e, x) * 0.6); }); continue; }
    const t = e.intent && ts.includes(e.intent) ? e.intent : enemyTarget(st, e);
    if (t) out[t] = (out[t] || 0) + atkOf(st, e, st.units[t]) * (e.kind === 'heavy' ? 2 : 1);
  }
  return out;
}

// Échange : une fois par tour, une carte au combat laisse sa place à une carte de la réserve.
// La carte qui entre ne peut pas attaquer ce tour-ci.
export const canSwap = (st) => st.turn === 'ally' && !st.over && !st.swapped && reserve(st, 'ally').length > 0;
export function swap(st, outUid, inUid) {
  const ev = [];
  const o = st.order.ally, i = o.indexOf(outUid), j = o.indexOf(inUid);
  const f = front(st, 'ally'), r = reserve(st, 'ally');
  if (!canSwap(st) || !f.some((u) => u.uid === outUid) || !r.some((u) => u.uid === inUid)) return ev;
  [o[i], o[j]] = [o[j], o[i]];
  const a = st.units[inUid], b = st.units[outUid];
  a.inPlay = true; a.attacked = true; b.inPlay = false;
  st.swapped = true;
  ev.push({ t: 'swap', u: inUid, out: outUid });
  return ev;
}

// Difficulté d'une esquive : durée (ms) de la fenêtre à viser, plus courte face à un ennemi
// de plus haut niveau que la carte visée, face aux élites et gardiens, et face à un coup chargé.
export function dodgeWindow(st, a, t) {
  const e = st.units[a], u = st.units[t];
  const w = (140 + 25 * ((u?.level || 1) - (e?.level || 1)) - (e?.boss ? 40 : e?.elite ? 20 : 0)) * (e?.kind === 'heavy' ? 0.8 : 1);
  return Math.max(45, Math.min(260, Math.round(w)));
}

// IA ennemie : achève ce qu'elle peut tuer, sinon frappe la carte la plus dangereuse.
function enemyTarget(st, e) {
  const ts = targetsFor(st, 'enemy').map((id) => st.units[id]);
  const kill = ts.filter((t) => t.hp <= atkOf(st, e, t)).sort((x, y) => y.atk - x.atk)[0];
  return (kill || ts.sort((x, y) => y.atk - x.atk || x.hp - y.hp)[0])?.uid;
}

// ——— Pouvoir du Gardien (ultime) ———
export const ultReady = (st) => !st.over && st.turn === 'ally' && st.gauge >= GAUGE_MAX;
export function useUlt(st) {
  const ev = [];
  if (!ultReady(st)) return ev;
  st.gauge = 0;
  const p = st.power || 1, allies = front(st, 'ally'), foes = front(st, 'enemy');
  ev.push({ t: 'ult', key: st.ult });
  if (st.ult === 'sceau') allies.forEach((u) => { heal(u, u.maxHp * 0.3 * p, ev); u.shield = 1; });
  else if (st.ult === 'revive') {
    const fallen = st.order.ally.map((id) => st.units[id]).filter((u) => u.hp <= 0);
    if (fallen.length) fallen.forEach((u) => { u.hp = Math.round(u.maxHp * 0.5 * p); u.poison = 0; u.inPlay = false; ev.push({ t: 'revive', u: u.uid }); });
    else allies.forEach((u) => heal(u, u.maxHp * 0.4 * p, ev));
  } else if (st.ult === 'nova') foes.forEach((u) => damage(st, u, (3 + st.round) * p, ev));
  else if (st.ult === 'smite') { const t = foes.slice().sort((x, y) => y.hp - x.hp)[0]; if (t) damage(st, t, (8 + 2 * st.round) * p, ev); }
  else if (st.ult === 'aegis') allies.forEach((u) => { u.shield = 1; u.attacked = false; u.frozen = 0; ev.push({ t: 'status', u: u.uid, s: 'Égide' }); });
  check(st, ev);
  return ev;
}

// ——— Jeu automatique (bouton Auto, simulations) ———
// Joue les attaques de ton tour (sans finir le tour)
export function autoAttacks(st) {
  const ev = [];
  if (ultReady(st) && (st.ult !== 'sceau' && st.ult !== 'revive' || front(st, 'ally').some((u) => u.hp < u.maxHp / 2) || st.order.ally.some((id) => st.units[id].hp <= 0))) ev.push(...useUlt(st));
  for (let guard = 0; guard < 10 && !st.over; guard++) {
    const a = front(st, 'ally').filter((u) => canAct(st, u)).sort((x, y) => (y.kw === 'assaut') - (x.kw === 'assaut') || y.atk - x.atk)[0];
    if (!a) break;
    const ts = targetsFor(st, 'ally').map((id) => st.units[id]);
    const kill = ts.filter((t) => t.hp <= atkOf(st, a, t) && (a.kw === 'assaut' || t.atk < a.hp)).sort((x, y) => y.atk - x.atk)[0];
    const safe = ts.filter((t) => a.kw === 'assaut' || t.atk < a.hp).sort((x, y) => x.hp - y.hp)[0];
    ev.push(...attack(st, a.uid, (kill || safe || ts.sort((x, y) => x.hp - y.hp)[0]).uid));
  }
  return ev;
}
// dodge(st, coup) : décide si une attaque ennemie est esquivée (simulations)
export function autoTurn(st, dodge) {
  const ev = autoAttacks(st);
  if (!st.over) ev.push(...endTurn(st, dodge));
  return ev;
}
export function autoDuel(st, max = 60, dodge) {
  for (let i = 0; i < max && !st.over; i++) autoTurn(st, dodge);
  if (!st.over) st.over = 'lost';
  return st;
}
