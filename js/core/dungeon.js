// Les Salles Oubliées : plateau tactique à la Demeo (moteur pur, sans affichage).
// 3 figurines sur une grille, 2 actions chacune par tour (se déplacer ou jouer une carte),
// jets de D20 pour toucher, D6 pour certains coups, cartes de pouvoir piochées à chaque tour,
// ennemis qui se déplacent, portails qui en font venir d'autres, 3 salles puis le gardien.
// L'état est un simple objet (sauvegardé tel quel) ; chaque action renvoie une liste d'événements.
import { RARITY_ORDER } from '../config.js';
import { roleOf } from './army.js';
import { POWERS, powerOf } from './powers.js';
import { rngOf } from './descent.js';

export const ACTS = 2;            // actions par figurine et par tour
export const HAND_MAX = 3;        // cartes en main au plus
export const ROOMS = 4;           // 3 salles puis le gardien
export const PORTAL_EVERY = 3;    // un renfort tous les N tours tant que le portail tient
export const TEAM = 3;

// ——— Salles ———————————————————————————————————————————————————————
// '#' mur · '.' sol · 'a' départ de tes figurines · 'e' ennemi · 'p' portail · 'C' coffre · 'D' porte · 'x' pilier
const ROOM_TPL = [
  ['########', '#..D...#', '#.e..e.#', '#..x...#', '#......#', '#.x..C.#', '#......#', '#.a.a.a#', '########'],
  ['########', '#...D..#', '#.e....#', '#....e.#', '#.x.x..#', '#C.....#', '#...x..#', '#a..a.a#', '########'],
  ['########', '#D.....#', '#..e.e.#', '#.x....#', '#....x.#', '#.e....#', '#....C.#', '#.a.a.a#', '########'],
  ['########', '#..D...#', '#e....e#', '#..xx..#', '#......#', '#.p....#', '#....C.#', '#.a.a.a#', '########'],
  ['########', '#....D.#', '#.e..e.#', '#......#', '#x....x#', '#...p..#', '#.C....#', '#a.a..a#', '########'],
  ['########', '#.D....#', '#e..x.e#', '#......#', '#..xx..#', '#.e..p.#', '#......#', '#.a.a.a#', '########'],
];
const BOSS_TPL = ['########', '#......#', '#..B...#', '#.e..e.#', '#......#', '#x....x#', '#......#', '#.a.a.a#', '########'];

// ——— Figurines —————————————————————————————————————————————————————
let seq = 0;
const RMULT = { C: 1, PC: 1.1, R: 1.2, HR: 1.3, M: 1.45, S: 1.55 };
// Les vraies statistiques des cartes servent enfin : attaque, défense (difficulté à toucher),
// vitesse (déplacement), magie (force des pouvoirs) et PV.
export function figure(card, { side = 'ally', level = 1, scale = 1, boss = false, elite = false, catalog = null } = {}) {
  const st = card.stats, lv = Math.max(0, level - 1);
  // tes figurines sont des héros : un socle de PV et d'attaque en plus des statistiques de la carte
  const hero = side === 'ally' && !boss;
  const k = scale * (side === 'enemy' && !boss ? RMULT[card.rarity] : 1); // le gardien est déjà mis à l'échelle à part
  // ennemis : statistiques resserrées (une Rare ne doit pas écraser des héros Communs)
  const baseHp = hero ? st.hp + 8 + lv * 2 : 3 + st.hp * 0.6;
  const baseAtk = hero ? st.atk + 3 + Math.floor(lv / 2) : 2 + st.atk * 0.6;
  const hp = Math.max(4, Math.round(baseHp * k * (boss ? 2 : elite ? 1.3 : 1)));
  const power = powerOf(card, catalog);
  return {
    uid: `${side[0]}${++seq}`, id: card.id, name: card.name, side, rarity: card.rarity, faction: card.faction, role: roleOf(card),
    x: 0, y: 0, hp, maxHp: hp,
    atk: Math.max(1, Math.round(baseAtk * k)),
    def: Math.min(10, st.def + Math.floor(lv / 3) + (boss ? 1 : 0)),
    mag: st.mag + Math.floor(lv / 3), move: Math.max(2, Math.min(5, 2 + Math.round(st.spd / 3))),
    range: POWERS[power].range > 1 && ['controle', 'soutien', 'soin', 'zone'].includes(roleOf(card)) ? 2 : 1,
    level, power, acts: 0, st: {}, hand: [], deck: [], discard: [], boss, elite, cd: 0, acted: false,
  };
}
// Goule invoquée par « Relève des morts »
const minion = (side) => ({ uid: `m${++seq}`, id: null, name: 'Goule', side, rarity: 'C', faction: 'necrotique', role: 'degats', x: 0, y: 0, hp: 5, maxHp: 5, atk: 2, def: 1, mag: 0, move: 3, range: 1, level: 1, power: null, acts: 0, st: {}, hand: [], deck: [], discard: [], minion: true, cd: 0 });
const portal = (room) => ({ uid: `p${++seq}`, id: null, name: 'Portail', side: 'enemy', rarity: 'C', faction: null, role: null, x: 0, y: 0, hp: 8 + room * 3, maxHp: 8 + room * 3, atk: 0, def: 2, mag: 0, move: 0, range: 0, level: 1, power: null, acts: 0, st: {}, hand: [], deck: [], discard: [], portal: true, cd: 0 });

// Force des ennemis selon la salle : 0,8 · 0,95 · 1,1 · 1,25 (× le réglage de difficulté)
export const roomScale = (room) => 0.8 + 0.15 * (room - 1);

// ——— Création ——————————————————————————————————————————————————————
const at = (st, x, y) => st.grid[y]?.[x];
const unitAt = (st, x, y) => Object.values(st.units).find((u) => u.hp > 0 && u.x === x && u.y === y);
export const alive = (st, side) => st.order[side].map((id) => st.units[id]).filter((u) => u.hp > 0);
const free = (st, x, y) => at(st, x, y) && at(st, x, y) !== '#' && at(st, x, y) !== 'x' && !unitAt(st, x, y) && !(at(st, x, y) === 'D' && !st.doorOpen);
export const dist = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); // 8 directions
const seen = (st, a, b) => { // ligne de vue : aucun mur entre les deux cases
  let { x, y } = a; const dx = Math.sign(b.x - x), dy = Math.sign(b.y - y);
  const n = Math.max(Math.abs(b.x - x), Math.abs(b.y - y));
  for (let i = 1; i < n; i++) { x += dx; y += dy; if (at(st, x, y) === '#' || at(st, x, y) === 'x') return false; }
  return true;
};

// cards : les 3 cartes du joueur · enemyPool : cartes ennemies possibles · boss : carte du gardien
export function createDungeon({ cards, levels = {}, pool, bossCard, seed = 'salles', catalog = null, scale = 1 }) {
  const st = { ver: 1, seed, scale, room: 0, phase: 'play', turn: 'ally', round: 1, grid: [], units: {}, order: { ally: [], enemy: [] }, traps: [], chests: [], doorOpen: false, bag: [], log: [], stats: { kills: 0, rooms: 0, dice: 0, crits: 0, fumbles: 0, dmg: 0 }, pool: pool.map((c) => c.id), bossId: bossCard.id, team: cards.map((c) => c.id), levels };
  cards.slice(0, TEAM).forEach((c) => { const u = figure(c, { level: levels[c.id] || 1, catalog }); st.units[u.uid] = u; st.order.ally.push(u.uid); u.deck = freshDeck(u); });
  const ev = [];
  nextRoom(st, ev, catalog);
  return st;
}
const freshDeck = (u) => shuffle([u.power, u.power, u.power, 'garde'], rngOf(`${u.uid}:${u.hp}`));
function shuffle(a, rng) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// Cartes communes (pas de pouvoir) : disponibles dans le deck de chaque figurine
export const COMMON = {
  garde: { name: 'Garde', icon: 'shield', acts: 1, range: 0, desc: 'Jusqu’à son prochain tour, elle subit 2 dégâts de moins par coup.', eff: { type: 'status', self: true, s: 'armor2', turns: 1 } },
};
// Objets trouvés dans les coffres (sac commun)
export const ITEMS = {
  potion:   { name: 'Potion de vie', icon: 'heart', acts: 1, range: 0, desc: 'Rend 8 PV à la figurine qui la boit.', eff: { type: 'heal', flat: 8, self: true } },
  bombe:    { name: 'Bombe de verre', icon: 'flame', acts: 1, range: 3, desc: 'Explose sur une case : 5 dégâts à tout ce qui l’entoure (1 case).', eff: { type: 'burst', flat: 5, radius: 1, splash: 1 } },
  elixir:   { name: 'Élixir de rage', icon: 'swords', acts: 1, range: 0, desc: '+3 en attaque jusqu’à la fin de la salle.', eff: { type: 'buff', stat: 'atk', n: 3, self: true, turns: 99 } },
  parchemin:{ name: 'Parchemin de hâte', icon: 'sparkle', acts: 0, range: 0, desc: 'Gratuit : la figurine regagne ses 2 actions.', eff: { type: 'refresh', self: true, n: 2 } },
  antidote: { name: 'Antidote', icon: 'heart', acts: 1, range: 2, desc: 'Libère un allié du poison, du gel et des malédictions, et rend 3 PV.', eff: { type: 'heal', flat: 3, cleanse: true } },
};
export const cardDef = (key) => POWERS[key] || COMMON[key] || ITEMS[key];

// Ennemis possibles dans une salle : la rareté monte avec la salle
export const ROOM_TIER = [['C', 'PC'], ['PC', 'R'], ['R', 'HR'], ['HR']];
const roomPool = (st, catalog) => { const tier = ROOM_TIER[st.room - 1] || ['HR']; const l = st.pool.map((id) => catalog?.get(id)).filter((c) => c && tier.includes(c.rarity)); return l.length ? l : st.pool.map((id) => catalog?.get(id)).filter(Boolean); };

function nextRoom(st, ev, catalog) {
  st.room++;
  const rng = rngOf(`${st.seed}:room:${st.room}`);
  // salle 1 sans portail (pour apprendre), ensuite au hasard
  const tpls = st.room === 1 ? ROOM_TPL.filter((t) => !t.some((r) => r.includes('p'))) : ROOM_TPL;
  const tpl = st.room === ROOMS ? BOSS_TPL : tpls[Math.floor(rng() * tpls.length)];
  st.grid = tpl.map((r) => r.replace(/[aepBC]/g, (c) => (c === 'C' ? 'C' : '.')));
  st.doorOpen = false; st.traps = []; st.chests = []; st.turn = 'ally'; st.round = 1; st.refreshed = false;
  tpl.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'C') st.chests.push({ x, y, open: false }); }));
  // ennemis de la salle précédente retirés, alliés replacés (et un peu soignés)
  st.order.enemy = []; Object.keys(st.units).forEach((k) => { if (st.units[k].side === 'enemy' || st.units[k].minion) delete st.units[k]; });
  st.order.ally = st.order.ally.filter((id) => st.units[id]);
  const starts = []; tpl.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'a') starts.push({ x, y }); }));
  alive(st, 'ally').forEach((u, i) => { u.x = starts[i].x; u.y = starts[i].y; u.acts = ACTS; u.cd = 0; u.st = {}; if (st.room > 1) heal(st, u, Math.round(u.maxHp * 0.4), ev); u.deck = freshDeck(u); u.discard = []; while (u.hand.length < 2 && (u.deck.length || u.discard.length)) draw(st, u, ev); });
  // ennemis : rareté qui monte avec la salle, mis à l'échelle
  const cands = roomPool(st, catalog);
  const sc = st.scale * roomScale(st.room);
  tpl.forEach((row, y) => [...row].forEach((c, x) => {
    let u = null;
    if (c === 'e' && cands.length) u = figure(cands[Math.floor(rng() * cands.length)], { side: 'enemy', scale: sc, elite: st.room >= 3 && rng() < 0.3, catalog });
    if (c === 'p') u = portal(st.room);
    if (c === 'B') u = figure(catalog.get(st.bossId), { side: 'enemy', scale: sc, boss: true, catalog });
    if (u) { u.x = x; u.y = y; st.units[u.uid] = u; st.order.enemy.push(u.uid); u.acts = 0; }
  }));
  st.phase = 'play';
  ev.push({ t: 'room', n: st.room, boss: st.room === ROOMS });
  startAllyTurn(st, ev);
  return ev;
}

// ——— Tours ——————————————————————————————————————————————————————————
function startAllyTurn(st, ev) {
  st.turn = 'ally'; st.refreshed = false;
  for (const u of alive(st, 'ally')) {
    u.acts = ACTS; u.acted = false;
    tick(st, u, ev);
    if (u.st.frozen) { u.acts = 0; delete u.st.frozen; ev.push({ t: 'status', u: u.uid, s: 'Gelée : passe son tour', k: 'frost' }); }
    if (u.hp > 0 && !u.minion) draw(st, u, ev);
  }
  // statuts à durée : expirent au début du tour de leur camp
  for (const u of alive(st, 'ally')) expire(u);
  check(st, ev);
}
// Statuts à durée : un de moins à chaque tour de leur camp (le bonus d'attaque retombe à la fin)
function expire(u) {
  for (const k of Object.keys(u.st)) {
    if (typeof u.st[k] !== 'number' || ['poison', 'regen', 'shield', 'buffAtk', 'tauntR'].includes(k)) continue;
    if (--u.st[k] > 0) continue;
    delete u.st[k];
    if (k === 'buffT') { u.atk -= u.st.buffAtk || 0; delete u.st.buffAtk; }
    if (k === 'curse') u.atk += 2;
  }
}
function tick(st, u, ev) {
  if (u.st.poison) { hurt(st, u, 3, ev, null, { pure: true }); ev.push({ t: 'status', u: u.uid, s: 'Poison −3', k: 'poison' }); if (--u.st.poison <= 0) delete u.st.poison; }
  if (u.st.regen && u.hp > 0) { heal(st, u, 2 + Math.round(u.mag / 2), ev); if (--u.st.regen <= 0) delete u.st.regen; }
}
function draw(st, u, ev) {
  if (u.hand.length >= HAND_MAX) return;
  if (!u.deck.length) { if (!u.discard.length) return; u.deck = shuffle(u.discard, rngOf(`${st.seed}:${u.uid}:${st.room}:${st.round}`)); u.discard = []; }
  const k = u.deck.pop(); u.hand.push(k); ev.push({ t: 'draw', u: u.uid, k });
}

export function endTurn(st, catalog = null) {
  const ev = [];
  if (st.phase !== 'play' || st.turn !== 'ally') return ev;
  st.turn = 'enemy';
  for (const u of alive(st, 'ally')) { u.acts = 0; }
  for (const e of alive(st, 'enemy')) { if (st.phase !== 'play') break; enemyAct(st, e, ev); }
  // portails : renforts
  for (const p of alive(st, 'enemy').filter((u) => u.portal)) {
    if (st.round % PORTAL_EVERY === 0) spawnFromPortal(st, p, ev, catalog);
  }
  // fin des statuts ennemis à durée
  for (const e of alive(st, 'enemy')) expire(e);
  if (st.phase === 'play') { st.round++; startAllyTurn(st, ev); }
  return ev;
}
function spawnFromPortal(st, p, ev, catalog) {
  const rng = rngOf(`${st.seed}:spawn:${st.room}:${st.round}`);
  const spots = neighbors(p).filter(({ x, y }) => free(st, x, y));
  if (!spots.length) return;
  const cands = roomPool(st, catalog);
  const c = cands[Math.floor(rng() * cands.length)]; if (!c) return;
  const u = figure(c, { side: 'enemy', scale: st.scale * roomScale(st.room), catalog });
  const s = spots[Math.floor(rng() * spots.length)]; u.x = s.x; u.y = s.y; u.acts = 0;
  st.units[u.uid] = u; st.order.enemy.push(u.uid);
  ev.push({ t: 'spawn', u: u.uid, from: p.uid });
}
const neighbors = (u) => [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]].map(([dx, dy]) => ({ x: u.x + dx, y: u.y + dy }));

// ——— Déplacements ———————————————————————————————————————————————————
// Cases atteignables (BFS, 8 directions, pas à travers les murs ni les figurines)
export function reach(st, u, max = u.move) {
  if (u.st.slow) max = Math.max(1, max - 2);
  const out = new Map([[`${u.x},${u.y}`, { x: u.x, y: u.y, d: 0, prev: null }]]);
  const q = [out.get(`${u.x},${u.y}`)];
  while (q.length) {
    const c = q.shift();
    if (c.d >= max) continue;
    for (const n of neighbors(c)) {
      const k = `${n.x},${n.y}`;
      if (out.has(k) || !free(st, n.x, n.y)) continue;
      out.set(k, { x: n.x, y: n.y, d: c.d + 1, prev: c }); q.push(out.get(k));
    }
  }
  out.delete(`${u.x},${u.y}`);
  return [...out.values()];
}
const pathTo = (cell) => { const p = []; for (let c = cell; c; c = c.prev) p.unshift({ x: c.x, y: c.y }); return p; };
export function move(st, uid, x, y) {
  const ev = []; const u = st.units[uid];
  if (!u || u.side !== 'ally' || st.turn !== 'ally' || st.phase !== 'play' || u.acts < 1) return ev;
  const cell = reach(st, u).find((c) => c.x === x && c.y === y);
  if (!cell) return ev;
  u.acts--;
  walk(st, u, pathTo(cell), ev);
  return ev;
}
function walk(st, u, path, ev) {
  for (const p of path.slice(1)) {
    u.x = p.x; u.y = p.y;
    const tr = st.traps.find((t) => t.x === p.x && t.y === p.y && t.side !== u.side);
    if (tr) { st.traps = st.traps.filter((t) => t !== tr); ev.push({ t: 'trap', u: u.uid, x: p.x, y: p.y }); hurt(st, u, tr.dmg, ev, tr.by); break; }
  }
  ev.push({ t: 'move', u: u.uid, path });
}

// ——— Dés ———————————————————————————————————————————————————————————
const D = (st) => { st.stats.dice++; return 1 + Math.floor(rng(st)() * 20); };
const rng = (st) => { st.rolls = (st.rolls || 0) + 1; return rngOf(`${st.seed}:dice:${st.room}:${st.round}:${st.rolls}`); };
// D20 : 1 = échec critique (raté), 20 = critique (dégâts ×2), sinon total ≥ DD = touché.
function roll(st, a, t, ev, dc = null) {
  const n = D(st), bonus = (a.st.lucky ? 2 : 0) + (t?.st.mark ? 3 : 0) + Math.floor(a.level / 3);
  const need = dc ?? 6 + (t ? t.def : 0);
  const tier = n === 1 ? 'fumble' : n === 20 ? 'crit' : n + bonus >= need ? 'success' : 'miss';
  if (tier === 'crit') st.stats.crits++; if (tier === 'fumble') st.stats.fumbles++;
  ev.push({ t: 'dice', u: a.uid, d: 20, n, bonus, need, tier });
  return tier;
}
const d6 = (st, a, ev) => { const n = 1 + Math.floor(rng(st)() * 6); ev.push({ t: 'dice', u: a.uid, d: 6, n, tier: 'bonus' }); return n; };

// ——— Dégâts, soins, statuts ——————————————————————————————————————————
function hurt(st, u, n, ev, srcUid = null, { pure = false } = {}) {
  if (u.hp <= 0 || n <= 0) return 0;
  const a = srcUid && st.units[srcUid];
  if (!pure) {
    if (u.st.curse) n = Math.round(n * 1.5);
    if (u.st.mark && a?.side === 'ally') n = Math.round(n * 1.5);
    if (u.st.armor) n -= 3; if (u.st.armor2) n -= 2; if (u.st.taunt) n -= 2;
    if (u.boss) n = Math.min(n, Math.round(u.maxHp * 0.35));
    if (u.side === 'ally' && a?.side === 'enemy') n = Math.min(n, Math.round(u.maxHp * (a.boss ? 0.6 : 0.5))); // jamais tuée d'un seul coup à pleine vie
    n = Math.max(0, n);
    if (u.st.shield > 0) { const took = Math.min(u.st.shield, n); u.st.shield -= took; n -= took; ev.push({ t: 'status', u: u.uid, s: u.st.shield ? `Bouclier −${took}` : 'Bouclier brisé', k: 'guard' }); if (!u.st.shield) delete u.st.shield; }
  }
  const d = Math.min(u.hp, n);
  if (d <= 0) return 0;
  u.hp -= d; st.stats.dmg += a?.side === 'ally' ? d : 0;
  ev.push({ t: 'dmg', u: u.uid, d, hp: u.hp, src: srcUid });
  if (u.hp <= 0) { ev.push({ t: 'death', u: u.uid }); if (u.side === 'enemy' && !u.portal) st.stats.kills++; if (a && a.side === 'ally' && a.pendingKill) { a.atk += 2; delete a.pendingKill; ev.push({ t: 'status', u: a.uid, s: 'Dévorer : +2 ATQ', k: 'buff' }); } }
  return d;
}
function heal(st, u, n, ev) {
  if (u.hp <= 0) return 0;
  const d = Math.min(u.maxHp - u.hp, Math.round(n));
  if (d <= 0) return 0;
  u.hp += d; ev.push({ t: 'heal', u: u.uid, d, hp: u.hp });
  return d;
}
function applyOn(st, a, t, ons, ev, dealt) {
  for (const o of ons || []) {
    const [k, v] = o.split(':');
    if (k === 'poison') { t.st.poison = Math.max(t.st.poison || 0, +v); ev.push({ t: 'status', u: t.uid, s: `Poison (${v} tours)`, k: 'poison' }); }
    if (k === 'freeze' && !t.boss) { t.st.frozen = 1; ev.push({ t: 'status', u: t.uid, s: 'Gelée', k: 'frost' }); }
    if (k === 'freeze' && t.boss) { t.st.slow = 1; ev.push({ t: 'status', u: t.uid, s: 'Ralenti', k: 'frost' }); }
    if (k === 'drain' && dealt > 0) heal(st, a, dealt, ev);
    if (k === 'mark') { t.st.mark = 2; ev.push({ t: 'status', u: t.uid, s: 'Marquée', k: 'bad' }); }
    if (k === 'push') push(st, a, t, +v, ev);
  }
}
function push(st, a, t, n, ev) {
  if (t.boss || t.hp <= 0) return;
  const dx = Math.sign(t.x - a.x), dy = Math.sign(t.y - a.y);
  for (let i = 0; i < n; i++) { if (!free(st, t.x + dx, t.y + dy)) break; t.x += dx; t.y += dy; }
  ev.push({ t: 'push', u: t.uid, x: t.x, y: t.y });
}
// Une attaque avec jet de D20 ; renvoie les dégâts infligés
function strike(st, a, t, ev, { mult = 1, dc = null, die = 0, on = [], critOn = [], flat = null } = {}) {
  const tier = roll(st, a, t, ev, dc);
  if (tier === 'fumble' || tier === 'miss') { ev.push({ t: 'miss', u: t.uid, by: a.uid, fumble: tier === 'fumble' }); return 0; }
  let n = flat ?? Math.round(a.atk * mult) + (die ? d6(st, a, ev) : 0);
  if (tier === 'crit') n *= 2;
  ev.push({ t: 'attack', a: a.uid, u: t.uid });
  const d = hurt(st, t, n, ev, a.uid);
  applyOn(st, a, t, on, ev, d);
  if (tier === 'crit') applyOn(st, a, t, critOn, ev, d);
  return d;
}

// ——— Cibles valables d'une carte —————————————————————————————————————
export function targets(st, uid, key) {
  const u = st.units[uid], def = cardDef(key);
  if (!u || !def) return [];
  const e = def.eff, foes = alive(st, 'enemy').filter((x) => !x.st.elusive), pals = alive(st, 'ally');
  const inRange = (x) => dist(u, x) <= def.range && seen(st, u, x);
  switch (e.type) {
    case 'heal': case 'shield': return e.all || e.self ? [u] : pals.filter(inRange);
    case 'strike': case 'burst': case 'line': case 'chain': case 'pull': case 'freeze': case 'curse': case 'mark':
      return e.flat && e.type === 'burst' ? cells(st, u, def.range) : foes.filter(inRange);
    case 'leap': return foes.filter((x) => dist(u, x) <= def.range && (!e.straight || x.x === u.x || x.y === u.y || Math.abs(x.x - u.x) === Math.abs(x.y - u.y)) && neighbors(x).some(({ x: cx, y: cy }) => free(st, cx, cy) && dist({ x: cx, y: cy }, u) < dist(x, u) + 1));
    case 'multi': return foes.filter(inRange);
    case 'swap': return [...foes, ...pals.filter((x) => x !== u)].filter(inRange);
    case 'trap': return cells(st, u, def.range).filter(({ x, y }) => free(st, x, y));
    case 'refresh': return e.self ? [u] : pals.filter((x) => x !== u && inRange(x));
    case 'summon': return neighbors(u).filter(({ x, y }) => free(st, x, y));
    case 'ring': return foes.some((x) => dist(x, u) <= 1) ? [u] : [];
    case 'all': return foes.filter((x) => !x.portal).length ? [u] : [];
    case 'fear': case 'taunt': return foes.some((x) => dist(x, u) <= e.radius) ? [u] : [];
    default: return [u]; // status, buff, draw : sur soi
  }
}
const cells = (st, u, r) => { const out = []; for (let y = u.y - r; y <= u.y + r; y++) for (let x = u.x - r; x <= u.x + r; x++) if (at(st, x, y) && at(st, x, y) !== '#' && at(st, x, y) !== 'x' && seen(st, u, { x, y })) out.push({ x, y }); return out; };

// Cartes jouables maintenant par une figurine (avec au moins une cible)
export function playable(st, uid) {
  const u = st.units[uid];
  if (!u || st.turn !== 'ally' || st.phase !== 'play') return [];
  const list = [...u.hand.map((k) => ({ k, from: 'hand' })), ...st.bag.map((k) => ({ k, from: 'bag' }))];
  return list.map((c) => ({ ...c, def: cardDef(c.k), ok: u.acts >= cardDef(c.k).acts && targets(st, uid, c.k).length > 0 && !(cardDef(c.k).eff.type === 'refresh' && cardDef(c.k).eff.once && st.refreshed) }));
}

// ——— Jouer une carte ——————————————————————————————————————————————————
// target : { uid } ou { x, y } selon la carte
export function play(st, uid, key, target = null) {
  const ev = []; const u = st.units[uid], def = cardDef(key);
  if (!u || !def || st.turn !== 'ally' || st.phase !== 'play' || u.acts < def.acts) return ev;
  const from = u.hand.includes(key) ? 'hand' : st.bag.includes(key) ? 'bag' : null;
  if (!from) return ev;
  const opts = targets(st, uid, key);
  const tgt = opts.find((o) => (target?.uid ? o.uid === target.uid : o.x === target?.x && o.y === target?.y)) || (opts.length === 1 && opts[0].uid === uid ? opts[0] : null);
  if (!tgt) return ev;
  if (from === 'hand') { u.hand.splice(u.hand.indexOf(key), 1); u.discard.push(key); } else st.bag.splice(st.bag.indexOf(key), 1);
  u.acts -= def.acts; u.acted = true;
  ev.push({ t: 'card', u: uid, k: key, from });
  resolve(st, u, def, tgt, ev);
  check(st, ev);
  return ev;
}
function resolve(st, a, def, tgt, ev) {
  const e = def.eff, pow = 3 + a.mag;
  const T = tgt.uid ? st.units[tgt.uid] : null;
  switch (e.type) {
    case 'heal': {
      const list = e.all ? alive(st, a.side) : [T || a];
      for (const t of list) { heal(st, t, e.flat ?? pow * e.mult, ev); if (e.cleanse) cleanse(t, ev); }
      break; }
    case 'shield': {
      const list = e.radius ? alive(st, a.side).filter((x) => dist(x, a) <= e.radius) : [T || a];
      for (const t of list) { t.st.shield = Math.max(t.st.shield || 0, Math.round(pow * e.mult)); ev.push({ t: 'status', u: t.uid, s: `Bouclier ${t.st.shield}`, k: 'guard' }); }
      break; }
    case 'strike': {
      if (e.selfCost) hurt(st, a, e.selfCost, ev, null, { pure: true });
      if (e.onKill) a.pendingKill = true;
      const m = e.freshMult && !T.acted ? e.freshMult : e.mult;
      strike(st, a, T, ev, { mult: m, dc: e.dc, die: e.die, on: e.on, critOn: e.critOn });
      delete a.pendingKill;
      break; }
    case 'multi': for (let i = 0; i < e.n && T.hp > 0; i++) strike(st, a, T, ev, { mult: e.mult, dc: e.dc }); break;
    case 'burst': {
      const c = T || tgt;
      const list = alive(st, 'enemy').filter((x) => dist(x, c) <= e.radius);
      ev.push({ t: 'aoe', x: c.x, y: c.y, r: e.radius });
      for (const t of list) { const n = e.flat ?? Math.round(a.atk * e.mult * (T && t === T ? 1 : e.splash)); hurt(st, t, n, ev, a.uid); applyOn(st, a, t, e.on, ev, n); }
      break; }
    case 'ring': {
      const tier = e.dc ? roll(st, a, null, ev, e.dc) : 'success';
      if (tier === 'fumble') break;
      ev.push({ t: 'aoe', x: a.x, y: a.y, r: 1 });
      for (const t of alive(st, 'enemy').filter((x) => dist(x, a) <= 1)) { const n = Math.round(a.atk * e.mult * (tier === 'crit' ? 2 : 1)); hurt(st, t, n, ev, a.uid); applyOn(st, a, t, e.on, ev, n); }
      break; }
    case 'all': for (const t of alive(st, 'enemy').filter((x) => !x.portal)) hurt(st, t, Math.round(a.atk * e.mult), ev, a.uid); break;
    case 'line': {
      const dx = Math.sign(T.x - a.x), dy = Math.sign(T.y - a.y);
      for (let i = 1; i <= e.len; i++) { const x = a.x + dx * i, y = a.y + dy * i; if (at(st, x, y) === '#' || at(st, x, y) === 'x') break; const t = unitAt(st, x, y); if (t && t.side === 'enemy') strike(st, a, t, ev, { mult: e.mult, dc: e.dc }); }
      break; }
    case 'chain': {
      const d = strike(st, a, T, ev, { mult: e.mult, dc: e.dc });
      const next = alive(st, 'enemy').filter((x) => x !== T && dist(x, T) <= 1)[0];
      if (d > 0 && next) hurt(st, next, Math.round(a.atk * e.hopMult), ev, a.uid);
      break; }
    case 'nearest': {
      const list = alive(st, 'enemy').filter((x) => dist(x, a) <= e.radius && seen(st, a, x)).sort((p, q) => dist(p, a) - dist(q, a)).slice(0, e.n);
      for (const t of list) strike(st, a, t, ev, { mult: e.mult });
      break; }
    case 'leap': {
      const spot = neighbors(T).filter(({ x, y }) => free(st, x, y)).sort((p, q) => dist(p, a) - dist(q, a))[0];
      const cellsMoved = spot ? dist(spot, a) : 0;
      if (spot) { ev.push({ t: 'move', u: a.uid, path: [{ x: a.x, y: a.y }, spot] }); a.x = spot.x; a.y = spot.y; }
      strike(st, a, T, ev, { mult: e.mult + (e.perCell ? 0 : 0), flat: e.perCell ? Math.round(a.atk * e.mult) + cellsMoved * e.perCell : null });
      break; }
    case 'pull': {
      const spot = neighbors(a).filter(({ x, y }) => free(st, x, y)).sort((p, q) => dist(p, T) - dist(q, T))[0];
      if (spot && !T.boss) { T.x = spot.x; T.y = spot.y; ev.push({ t: 'push', u: T.uid, x: T.x, y: T.y }); }
      strike(st, a, T, ev, { mult: 0.6, on: e.on });
      break; }
    case 'freeze': {
      const tier = roll(st, a, T, ev, e.dc);
      if (tier === 'fumble' || tier === 'miss') { ev.push({ t: 'miss', u: T.uid, by: a.uid }); break; }
      applyOn(st, a, T, ['freeze'], ev, 0);
      if (tier === 'crit') for (const t of alive(st, 'enemy').filter((x) => x !== T && dist(x, T) <= e.critRadius)) applyOn(st, a, t, ['freeze'], ev, 0);
      break; }
    case 'curse': T.st.curse = e.turns; T.atk = Math.max(1, T.atk - 2); ev.push({ t: 'status', u: T.uid, s: 'Maudite', k: 'bad' }); break;
    case 'mark': applyOn(st, a, T, ['mark'], ev, 0); T.st.mark = e.turns; break;
    case 'fear': for (const t of alive(st, 'enemy').filter((x) => !x.portal && dist(x, a) <= e.radius)) { push(st, a, t, 1, ev); t.st.slow = 1; ev.push({ t: 'status', u: t.uid, s: 'Terrifiée', k: 'bad' }); } break;
    case 'status': { const t = e.self ? a : T; t.st[e.s] = e.turns + (e.s === 'regen' ? 0 : 1); ev.push({ t: 'status', u: t.uid, s: def.name, k: 'buff' }); break; }
    case 'taunt': a.st.taunt = e.turns + 1; a.st.tauntR = e.radius; ev.push({ t: 'status', u: a.uid, s: 'Provocation', k: 'guard' }); break;
    case 'buff': { const list = e.self ? [a] : alive(st, a.side).filter((x) => dist(x, a) <= e.radius); for (const t of list) { t.atk += e.n; t.st.buffAtk = (t.st.buffAtk || 0) + e.n; t.st.buffT = e.turns + 1; ev.push({ t: 'status', u: t.uid, s: `+${e.n} ATQ`, k: 'buff' }); } break; }
    case 'refresh': { const t = e.self ? a : T; t.acts = Math.min(ACTS, t.acts + (e.n || 1)); if (e.once) st.refreshed = true; ev.push({ t: 'status', u: t.uid, s: 'Action regagnée', k: 'buff' }); break; }
    case 'swap': { const [x, y] = [a.x, a.y]; a.x = T.x; a.y = T.y; T.x = x; T.y = y; ev.push({ t: 'swap', a: a.uid, u: T.uid }); break; }
    case 'trap': st.traps.push({ x: tgt.x, y: tgt.y, dmg: Math.round(a.atk * 1.2), by: a.uid, side: a.side }); ev.push({ t: 'trapset', x: tgt.x, y: tgt.y, u: a.uid }); break;
    case 'summon': { const m = minion(a.side); m.x = tgt.x; m.y = tgt.y; m.acts = 0; st.units[m.uid] = m; st.order.ally.push(m.uid); ev.push({ t: 'spawn', u: m.uid, from: a.uid }); break; }
    case 'draw': { for (let i = 0; i < e.n; i++) draw(st, a, ev); a.st[e.s] = e.turns + 1; break; }
    default: break;
  }
}
function cleanse(t, ev) { let did = false; for (const k of ['poison', 'frozen', 'curse', 'slow']) if (t.st[k]) { delete t.st[k]; did = true; } if (did) ev.push({ t: 'status', u: t.uid, s: 'Purifiée', k: 'buff' }); }

// Attaque de base (toujours disponible, 1 action) : jet de D20, dégâts = attaque
export function attack(st, uid, tuid) {
  const ev = []; const u = st.units[uid], t = st.units[tuid];
  if (!u || !t || u.side !== 'ally' || st.turn !== 'ally' || st.phase !== 'play' || u.acts < 1 || t.hp <= 0 || t.side !== 'enemy') return ev;
  if (dist(u, t) > u.range || !seen(st, u, t) || t.st.elusive) return ev;
  u.acts--; u.acted = true;
  strike(st, u, t, ev, { mult: 1 });
  check(st, ev);
  return ev;
}
export function attackTargets(st, uid) { const u = st.units[uid]; return u ? alive(st, 'enemy').filter((t) => dist(u, t) <= u.range && seen(st, u, t) && !t.st.elusive) : []; }

// Coffre adjacent : 1 action, donne un objet dans le sac commun
export function openChest(st, uid) {
  const ev = []; const u = st.units[uid];
  if (!u || st.turn !== 'ally' || st.phase !== 'play' || u.acts < 1) return ev;
  const ch = st.chests.find((c) => !c.open && dist(c, u) <= 1);
  if (!ch) return ev;
  u.acts--; ch.open = true;
  const r = rngOf(`${st.seed}:chest:${st.room}:${ch.x}:${ch.y}`);
  const keys = Object.keys(ITEMS); const k = keys[Math.floor(r() * keys.length)];
  st.bag.push(k); ev.push({ t: 'chest', u: uid, x: ch.x, y: ch.y, k });
  return ev;
}
export const chestNear = (st, uid) => { const u = st.units[uid]; return u ? st.chests.find((c) => !c.open && dist(c, u) <= 1) || null : null; };

// Salle nettoyée : la porte s'ouvre ; « Continuer » mène à la salle suivante (ou termine après le gardien)
export function nextRoomAction(st, catalog) {
  const ev = [];
  if (st.phase !== 'cleared') return ev;
  if (st.room >= ROOMS) { st.phase = 'won'; ev.push({ t: 'won' }); return ev; }
  nextRoom(st, ev, catalog);
  return ev;
}

function check(st, ev) {
  if (st.phase !== 'play') return;
  for (const k of Object.keys(st.units)) { const u = st.units[k]; if (u.hp <= 0 && (u.minion || u.side === 'enemy')) { st.order[u.side] = st.order[u.side].filter((id) => id !== k); delete st.units[k]; } }
  if (!alive(st, 'ally').filter((u) => !u.minion).length) { st.phase = 'lost'; ev.push({ t: 'lost' }); return; }
  if (!alive(st, 'enemy').length) { st.phase = 'cleared'; st.doorOpen = true; st.stats.rooms++; ev.push({ t: 'cleared', n: st.room }); }
}

// ——— Ennemis ——————————————————————————————————————————————————————————
// Chaque ennemi agit selon son rôle : les cogneurs foncent, les tireurs gardent leurs distances,
// les soigneurs soignent. Un ennemi utilise son pouvoir offensif quand il le peut (recharge 3 tours).
function enemyAct(st, e, ev) {
  if (e.portal || e.hp <= 0) return;
  tick(st, e, ev); if (e.hp <= 0) return;
  if (e.st.frozen) { delete e.st.frozen; ev.push({ t: 'status', u: e.uid, s: 'Gelé : passe son tour', k: 'frost' }); return; }
  if (e.cd > 0) e.cd--;
  const allies = alive(st, 'ally').filter((u) => !u.st.elusive);
  if (!allies.length) return;
  // provocation : si un allié provoque à portée, il devient la seule cible
  const taunter = allies.find((u) => u.st.taunt && dist(u, e) <= (u.st.tauntR || 3));
  const pickTarget = (list) => list.slice().sort((p, q) => dist(p, e) - dist(q, e) || p.hp - q.hp)[0];
  let target = taunter || pickTarget(allies);
  const ranged = e.range > 1;
  const pow = e.power && POWERS[e.power], offensive = pow && ['strike', 'burst', 'multi', 'line', 'chain', 'nearest', 'ring'].includes(pow.eff.type) && !pow.eff.selfCost;
  const canHit = (t) => dist(e, t) <= e.range && seen(st, e, t);
  // soigneur ennemi : soigne un allié blessé à portée
  if (e.role === 'soin') { const w = alive(st, 'enemy').filter((x) => x !== e && x.hp < x.maxHp * 0.6 && dist(x, e) <= 3).sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp)[0]; if (w) { heal(st, w, 3 + e.mag, ev); ev.push({ t: 'ecard', u: e.uid, k: 'grace' }); return; } }
  // déplacement : vers la cible (ou à distance pour les tireurs)
  if (!canHit(target) || (ranged && dist(e, target) < 2)) {
    const opts = reach(st, e, e.st.slow ? Math.max(1, e.move - 2) : e.move);
    delete e.st.slow;
    const want = ranged ? 2 : 1;
    const score = (c) => { const d = dist(c, target); const los = seen(st, c, target); return (d <= e.range && los ? 0 : 100) + Math.abs(d - want) * 10 + (ranged && d < want ? 50 : 0); };
    const best = opts.sort((p, q) => score(p) - score(q))[0];
    if (best && score(best) < score({ x: e.x, y: e.y })) walk(st, e, pathTo(best), ev);
    if (e.hp <= 0) return;
  }
  if (!canHit(target)) { target = allies.filter(canHit)[0]; if (!target) return; }
  // pouvoir offensif prêt ?
  if (offensive && e.cd === 0 && dist(e, target) <= pow.range && (!e.boss || st.round % 2 === 0)) {
    e.cd = 3; ev.push({ t: 'ecard', u: e.uid, k: e.power });
    const E = pow.eff;
    if (E.type === 'strike') strike(st, e, target, ev, { mult: E.mult, dc: E.dc, die: E.die, on: E.on, critOn: E.critOn });
    else if (E.type === 'multi') for (let i = 0; i < E.n && target.hp > 0; i++) strike(st, e, target, ev, { mult: E.mult, dc: E.dc });
    else if (E.type === 'burst') { ev.push({ t: 'aoe', x: target.x, y: target.y, r: E.radius }); for (const t of alive(st, 'ally').filter((x) => dist(x, target) <= E.radius)) { const n = Math.round(e.atk * E.mult * (t === target ? 1 : E.splash)); hurt(st, t, n, ev, e.uid); applyOn(st, e, t, E.on, ev, n); } }
    else if (E.type === 'ring') { ev.push({ t: 'aoe', x: e.x, y: e.y, r: 1 }); for (const t of alive(st, 'ally').filter((x) => dist(x, e) <= 1)) { const n = Math.round(e.atk * E.mult); hurt(st, t, n, ev, e.uid); applyOn(st, e, t, E.on, ev, n); } }
    else if (E.type === 'line') { const dx = Math.sign(target.x - e.x), dy = Math.sign(target.y - e.y); for (let i = 1; i <= E.len; i++) { const t = unitAt(st, e.x + dx * i, e.y + dy * i); if (at(st, e.x + dx * i, e.y + dy * i) === '#') break; if (t && t.side === 'ally') strike(st, e, t, ev, { mult: E.mult, dc: E.dc }); } }
    else if (E.type === 'chain') { const d = strike(st, e, target, ev, { mult: E.mult }); const nx = alive(st, 'ally').filter((x) => x !== target && dist(x, target) <= 1)[0]; if (d > 0 && nx) hurt(st, nx, Math.round(e.atk * E.hopMult), ev, e.uid); }
    else if (E.type === 'nearest') for (const t of alive(st, 'ally').filter((x) => dist(x, e) <= E.radius).slice(0, E.n)) strike(st, e, t, ev, { mult: E.mult });
  } else strike(st, e, target, ev, { mult: 1 });
  check(st, ev);
}

// ——— Pilote automatique (simulations et bouton Auto) ———————————————————
export function autoTurn(st, catalog) {
  const ev = [];
  if (st.phase === 'cleared') return nextRoomAction(st, catalog);
  if (st.phase !== 'play' || st.turn !== 'ally') return ev;
  for (let guard = 0; guard < 12; guard++) {
    const us = alive(st, 'ally').filter((u) => u.acts > 0 && !u.minion);
    if (!us.length) break;
    let did = false;
    for (const u of us) {
      if (u.acts <= 0 || st.phase !== 'play') continue;
      // 1. carte jouable utile ; 2. attaque ; 3. coffre ; 4. se rapprocher
      const cards = playable(st, u.uid).filter((c) => c.ok && c.def.eff.type !== 'refresh');
      const foesNear = alive(st, 'enemy').filter((x) => dist(x, u) <= 2).length;
      const useful = cards.find((c) => { const e = c.def.eff; if (e.type === 'heal') return (c.from === 'bag' ? u.hp < u.maxHp * 0.5 : alive(st, 'ally').some((x) => x.hp < x.maxHp * 0.5)); if (['status', 'taunt', 'shield', 'fear'].includes(e.type)) return foesNear > 0 && u.hp < u.maxHp * 0.6 && u.acts >= 2; if (e.type === 'buff') return foesNear > 0 && st.round === 2; if (['draw', 'trap', 'summon', 'swap'].includes(e.type)) return false; return c.def.acts <= u.acts; });
      if (useful) {
        const opts = targets(st, u.uid, useful.k);
        const e = useful.def.eff;
        const pick = e.type === 'heal' ? (opts.find((x) => x.uid && st.units[x.uid].hp < st.units[x.uid].maxHp * 0.5) || opts[0]) : opts.sort((p, q) => (st.units[p.uid]?.hp || 99) - (st.units[q.uid]?.hp || 99))[0];
        const r = play(st, u.uid, useful.k, pick?.uid ? { uid: pick.uid } : pick);
        if (r.length) { ev.push(...r); did = true; continue; }
      }
      const ts = attackTargets(st, u.uid);
      if (ts.length) { ev.push(...attack(st, u.uid, ts.sort((p, q) => p.hp - q.hp)[0].uid)); did = true; continue; }
      if (chestNear(st, u.uid)) { ev.push(...openChest(st, u.uid)); did = true; continue; }
      const foes = alive(st, 'enemy');
      if (!foes.length) { u.acts = 0; continue; }
      const cells_ = reach(st, u);
      const near = (c) => Math.min(...foes.map((f) => dist(c, f)));
      const best = cells_.sort((p, q) => near(p) - near(q))[0];
      if (best && near(best) < near(u)) { ev.push(...move(st, u.uid, best.x, best.y)); did = true; }
      else u.acts = 0;
    }
    if (!did) break;
  }
  if (st.phase === 'play') ev.push(...endTurn(st, catalog));
  return ev;
}
export function autoDungeon(st, catalog, maxTurns = 80) {
  for (let i = 0; i < maxTurns && ['play', 'cleared'].includes(st.phase); i++) autoTurn(st, catalog);
  if (!['won', 'lost'].includes(st.phase)) st.phase = 'lost';
  return st;
}
