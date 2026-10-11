// ABYSSAL v2 : duel de cartes. Moteur pur (état JSON, reprise exacte).
// Chaque carte a une ATTAQUE, des PV et une capacité liée à son rôle.
// Ton tour : chaque carte au combat attaque une fois (la cible riposte), puis « Fin du tour »
// et les créatures corrompues attaquent. 3 cartes au combat par camp ; la réserve prend la relève.
import { roleOf } from './units.js';

export const FRONT = 3;
export const GAUGE_MAX = 5;

// Capacités (une par rôle)
export const KEYWORDS = {
  garde:     { name: 'Garde',     icon: 'shield',  desc: 'Les ennemis doivent l’attaquer en premier.' },
  assaut:    { name: 'Assaut',    icon: 'swords',  desc: 'Quand elle attaque, la cible ne riposte pas.' },
  soin:      { name: 'Soin',      icon: 'heart',   desc: 'À la fin de son tour, soigne l’allié le plus blessé.' },
  venin:     { name: 'Venin',     icon: 'skull',   desc: 'Empoisonne ce qu’elle touche : 2 PV perdus à chaque tour.' },
  gel:       { name: 'Gel',       icon: 'eye',     desc: 'Ce qu’elle touche ne peut pas attaquer au tour suivant.' },
  cri:       { name: 'Cri',       icon: 'sparkle', desc: 'Au début de son tour, ses alliés gagnent +1 en attaque.' },
  deferlante: { name: 'Déferlante', icon: 'flame', desc: 'Son attaque touche aussi les voisins de la cible (moitié des dégâts).' },
};
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
    atk, hp, maxHp: hp, level, boss, elite, poison: 0, frozen: 0, boost: 0, shield: 0, attacked: false,
  };
}

// ——— État ———
export function createDuel(allies, enemies, { gauge = 0, ult = 'sceau', power = 1, known = {}, ruleMult = 1 } = {}) {
  const st = { units: {}, order: { ally: [], enemy: [] }, turn: 'ally', round: 1, gauge: Math.min(GAUGE_MAX, gauge), ult, power, known, ruleMult, over: null, kills: [] };
  for (const u of [...allies, ...enemies]) { st.units[u.uid] = { ...u }; st.order[u.side].push(u.uid); }
  ['ally', 'enemy'].forEach((side) => front(st, side).forEach((u) => { u.inPlay = true; }));
  startTurn(st, 'ally', []);
  return st;
}
export const alive = (st, side) => st.order[side].map((id) => st.units[id]).filter((u) => u.hp > 0);
export const front = (st, side) => alive(st, side).slice(0, FRONT);
export const reserve = (st, side) => alive(st, side).slice(FRONT);
const other = (side) => (side === 'ally' ? 'enemy' : 'ally');
const atkOf = (st, u, t) => Math.max(0, u.atk + u.boost + (u.side === 'ally' && t && st.known[t.id] ? 1 : 0)) * (st.ruleMult || 1);

// Cibles autorisées : la Garde d'abord
export function targetsFor(st, side) {
  const f = front(st, other(side));
  const g = f.filter((u) => u.kw === 'garde');
  return (g.length ? g : f).map((u) => u.uid);
}
export const canAct = (st, u) => st.turn === u.side && !st.over && u.hp > 0 && !u.attacked && !u.frozen && front(st, u.side).includes(u);

// ——— Dégâts ———
function damage(st, u, n, ev, src = null) {
  if (u.hp <= 0 || n <= 0) return 0;
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
export function attack(st, aUid, tUid) {
  const a = st.units[aUid], t = st.units[tUid], ev = [];
  if (!a || !t || !canAct(st, a) || !targetsFor(st, a.side).includes(tUid)) return ev;
  a.attacked = true;
  ev.push({ t: 'attack', a: a.uid, u: t.uid });
  const hit = damage(st, t, atkOf(st, a, t), ev, a.uid);
  if (hit && t.hp > 0) {
    if (a.kw === 'venin') { t.poison = Math.min(6, t.poison + 2); ev.push({ t: 'status', u: t.uid, s: 'Venin' }); }
    if (a.kw === 'gel') { t.frozen = 1; ev.push({ t: 'status', u: t.uid, s: 'Gelé' }); }
  }
  if (a.kw === 'deferlante') {
    const row = front(st, t.side), i = row.findIndex((x) => x.uid === t.uid);
    [row[i - 1], row[i + 1]].filter(Boolean).forEach((n) => damage(st, n, Math.ceil(atkOf(st, a, n) / 2), ev, a.uid));
  }
  // riposte (sauf Assaut)
  if (t.hp > 0 && a.kw !== 'assaut' && atkOf(st, t, a) > 0) { ev.push({ t: 'riposte', a: t.uid, u: a.uid }); damage(st, a, atkOf(st, t, a), ev, t.uid); }
  if (a.side === 'ally') st.gauge = Math.min(GAUGE_MAX, st.gauge + 1);
  check(st, ev);
  return ev;
}

// ——— Début et fin de tour ———
function startTurn(st, side, ev) {
  st.turn = side;
  for (const u of alive(st, side)) { u.attacked = false; u.boost = 0; }
  for (const u of front(st, side)) {
    if (u.frozen) { u.frozen--; if (u.frozen === 0) u.attacked = true; } // gelé : passe ce tour
    if (u.poison) { damage(st, u, 2, ev); u.poison = Math.max(0, u.poison - 2); }
  }
  const criers = front(st, side).filter((u) => u.kw === 'cri' && u.hp > 0);
  if (criers.length) { front(st, side).forEach((u) => { u.boost += criers.length; }); ev.push({ t: 'status', u: criers[0].uid, s: `Cri : +${criers.length} ATQ` }); }
  check(st, ev);
}
function endOf(st, side, ev) {
  for (const u of front(st, side).filter((x) => x.kw === 'soin' && x.hp > 0)) {
    const w = alive(st, side).filter((x) => x.hp < x.maxHp).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
    if (w) heal(w, Math.max(2, Math.round(u.atk * 1.5 + 1)), ev);
  }
}
// Fin du tour du joueur : soins, tour ennemi complet (IA), puis début du tour suivant du joueur.
export function endTurn(st) {
  const ev = [];
  if (st.over || st.turn !== 'ally') return ev;
  endOf(st, 'ally', ev);
  startTurn(st, 'enemy', ev);
  ev.push({ t: 'phase', side: 'enemy' });
  for (const e of front(st, 'enemy')) {
    if (st.over) break;
    if (!canAct(st, e)) continue;
    const tg = enemyTarget(st, e);
    if (tg) ev.push(...attack(st, e.uid, tg));
  }
  if (!st.over) { endOf(st, 'enemy', ev); st.round++; startTurn(st, 'ally', ev); ev.push({ t: 'phase', side: 'ally' }); }
  return ev;
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
export function autoTurn(st) {
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
  if (!st.over) ev.push(...endTurn(st));
  return ev;
}
export function autoDuel(st, max = 60) {
  for (let i = 0; i < max && !st.over; i++) autoTurn(st);
  if (!st.over) st.over = 'lost';
  return st;
}
