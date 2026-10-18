// v451 : Les Trois Autels — duel tactique court (toi contre un arbitre de l'Abysse).
// En 6 tours, chacun pose ses créatures sur 3 autels tirés parmi 12. Pour gagner, il faut dominer 2 autels sur 3.
// Ferveur : autant que le numéro du tour (1 au 1er tour, 6 au 6e). Coût d'une carte : sa rareté (Commune 1 … Secrète 6),
// force : Commune 2, Peu commune 3, Rare 5, Hyper rare 6, Mythique 8, Secrète 9 (une carte rare arrive plus tard).
// Les deux camps posent en même temps ; on révèle d'abord tes cartes, puis celles de l'adversaire. Le rôle de chaque
// créature agit à la pose. Égalité sur un autel : la force totale sur les trois autels départage.
// Moteur pur (aucun DOM) : l'état est un objet simple, sauvegardé tel quel dans s.autels.cur.
import { FACTION_ORDER } from '../config.js';
import { roleOf, COST } from './army.js';

export const TURNS = 6;
export const HAND0 = 3;
export const HAND_MAX = 7;
export const SLOTS = 4;
export const DECK = 12;
export const POWER = { C: 2, PC: 3, R: 5, HR: 6, M: 8, S: 9 };
export const CURVE = ['C', 'C', 'C', 'PC', 'PC', 'PC', 'R', 'R', 'R', 'HR', 'M', 'S'];

function hash(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = (arr, r) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

// Rôles à la pose (clés de roleOf)
export const ROLE_FX = {
  protecteur: '+2 aux autres cartes de ton camp sur cet autel.',
  degats: '+2 s’il est posé au dernier tour.',
  soin: '+2 à ta carte la plus faible de cet autel.',
  poison: '−1 à toutes les cartes adverses de cet autel.',
  controle: 'La prochaine carte adverse posée ici a −2.',
  soutien: '+1 Ferveur au tour suivant.',
  zone: '−1 à toutes les cartes, des deux camps, sur les deux autres autels.',
};

// Les 12 autels
const FAC_NAME = { infernal: 'de la Géhenne', abyssal: 'des Abysses', celeste: 'de l’Aube éternelle', sauvage: 'de la Tanière', necrotique: 'de l’Ossuaire', primordial: 'des Origines', artificiel: 'de la Forge' };
const FAC_ADJ = { infernal: 'Infernaux', abyssal: 'Abyssaux', celeste: 'Célestes', sauvage: 'Sauvages', necrotique: 'Nécrotiques', primordial: 'Primordiaux', artificiel: 'Artificiels' };
export const ALTARS = {
  ...Object.fromEntries(FACTION_ORDER.map((f) => [f, { name: `Autel ${FAC_NAME[f]}`, fac: f, desc: `Les ${FAC_ADJ[f]} ont +2 ici.` }])),
  givre: { name: 'Autel du Givre', desc: 'Les cartes posées à partir du 4e tour ont −1 ici.' },
  aube: { name: 'Autel de l’Aube', desc: 'Les cartes posées aux deux premiers tours ont +2 ici.' },
  etroit: { name: 'Autel étroit', desc: 'Deux cartes au plus par camp ici.' },
  humble: { name: 'Autel des humbles', desc: 'Les Communes et les Peu communes ont +2 ici.' },
  silence: { name: 'Autel du Silence', desc: 'Les rôles n’agissent pas ici.' },
};
export const ALTAR_KEYS = Object.keys(ALTARS);

// Adversaires : skill = qualité du calcul (0 : au hasard parmi les bons coups ; 1 : le meilleur), noise = écarts ;
// deck = goût (faction favorite), head = Ferveur en plus au 1er tour.
export const RIVALS = {
  initie: { name: 'Ilda', noise: 3, greed: 0.6, fav: 'celeste', curve: ['C', 'C', 'C', 'C', 'C', 'C', 'PC', 'PC', 'PC', 'PC', 'R', 'R'], hint: 'Pose un peu au hasard, et n’a que de petites cartes.',
    hello: 'Trois autels… je vais bien en garder un, non ?', beaten: 'J’ai tout mis sur le mauvais autel.', gloat: 'Deux autels sur trois ! J’ai compté !' },
  maitre: { name: 'Le Maître des Sceaux', noise: 2, greed: 0.85, fav: 'artificiel', hint: 'Renforce les autels qu’il peut gagner.',
    hello: 'Un autel se prend. Deux se gagnent. Trois se méritent.', beaten: 'J’ai mal pesé les autels.', gloat: 'Le compte était bon.' },
  banquier: { name: 'Mammon', noise: 0.6, greed: 1, fav: 'infernal', hint: 'Calcule chaque pose, et dépense toute sa Ferveur.',
    hello: 'Chaque autel a un prix. Je paie toujours le juste prix.', beaten: 'Une offrande… mal placée ? Inadmissible.', gloat: 'La maison gagne toujours.' },
  souverain: { name: 'La Souveraine du Néant', noise: 0.1, greed: 1, fav: 'abyssal', head: 2, hint: 'Ne se trompe presque jamais, et commence avec 2 Ferveur de plus.',
    hello: 'Les trois autels m’appartiennent déjà. Tu viens seulement les regarder.', beaten: 'Alors… le Néant peut perdre un autel.', gloat: 'Retourne au silence.' },
};
export const TABLES = [
  { key: 'parvis', name: 'Le Parvis', stars: 1, rival: 'initie', reward: 25, chest: 'bois' },
  { key: 'nef', name: 'La Nef des Sceaux', stars: 2, rival: 'maitre', reward: 35, chest: 'fer' },
  { key: 'choeur', name: 'Le Chœur de Mammon', stars: 3, rival: 'banquier', reward: 50, chest: 'or' },
  { key: 'sanctuaire', name: 'Le Sanctuaire du Néant', stars: 4, rival: 'souverain', reward: 70, chest: 'abyssal' },
];
export const TABLE = Object.fromEntries(TABLES.map((t) => [t.key, t]));
export const tableUnlocked = (s, i) => i === 0 || !!s.autels?.beaten?.[TABLES[i - 1].key];
export const AUTELS_REWARD = { firstWin: 100, daily: 40, dailyPaid: 5, afterCap: 5, xp: 10 };
export const AUTELS_TITLE = 'Prêtre des Trois Autels';
export const dailyTable = (day, unlocked) => TABLES[hash(`autels:${day}`) % Math.max(1, Math.min(unlocked, TABLES.length))].key;

// Grimoire de 12 cartes selon la courbe CURVE, tiré dans une liste d'identifiants (ta collection, ou tout le catalogue)
export function buildDeck(cat, ids, r, fav = null, curve = CURVE) {
  const pool = ids.map((id) => cat.get(id)).filter(Boolean);
  const used = new Set(), out = [];
  const order = ['S', 'M', 'HR', 'R', 'PC', 'C'];
  for (const want of curve) {
    let c = null;
    for (const rr of order.slice(order.indexOf(want))) {
      let l = pool.filter((x) => x.rarity === rr && !used.has(x.id));
      if (fav && l.some((x) => x.faction === fav) && r() < 0.5) l = l.filter((x) => x.faction === fav);
      if (l.length) { c = l[Math.floor(r() * l.length)]; break; }
    }
    if (!c) { const l = cat.cards.filter((x) => x.rarity === 'C' && !used.has(x.id)); c = l[Math.floor(r() * l.length)]; }
    used.add(c.id); out.push(c.id);
  }
  return out;
}
export const cardInfo = (cat, id) => { const c = cat.get(id); return { id, f: c.faction, r: c.rarity, cost: COST[c.rarity], base: POWER[c.rarity], role: roleOf(c) }; };

export function newGame(cat, { table, seed = Date.now(), daily = false, deck }) {
  const T = TABLE[table];
  if (!T) throw new Error('Table inconnue.');
  const r = mulberry(seed), R = RIVALS[T.rival];
  const altars = shuffle(ALTAR_KEYS.slice(), r).slice(0, 3);
  const aDeck = buildDeck(cat, cat.cards.map((c) => c.id), r, R.fav, R.curve || CURVE);
  const pDeck = shuffle((deck && deck.length === DECK ? deck : buildDeck(cat, cat.cards.map((c) => c.id), r)).slice(), r);
  shuffle(aDeck, r);
  const info = Object.fromEntries([...pDeck, ...aDeck].map((id) => [id, cardInfo(cat, id)]));
  const st = { table, daily, seed, rival: T.rival, altars, info, decks: { p: pDeck, a: aDeck }, hands: { p: [], a: [] },
    board: { p: [[], [], []], a: [[], [], []] }, turn: 0, energy: { p: 0, a: 0 }, bonus: { p: 0, a: R.head || 0 }, gel: { p: [0, 0, 0], a: [0, 0, 0] },
    log: [], over: null, final: null };
  for (let i = 0; i < HAND0; i++) { draw(st, 'p'); draw(st, 'a'); }
  startTurn(st);
  return st;
}
function draw(st, x) { if (st.decks[x].length && st.hands[x].length < HAND_MAX) st.hands[x].push(st.decks[x].pop()); }
function startTurn(st) {
  st.turn++;
  for (const x of ['p', 'a']) { st.energy[x] = st.turn + st.bonus[x]; st.bonus[x] = 0; draw(st, x); }
}
const other = (x) => (x === 'p' ? 'a' : 'p');
export const cap = (st, a) => (st.altars[a] === 'etroit' ? 2 : SLOTS);
export const powerOf = (c) => Math.max(0, c.base + c.mod);
export const altarSum = (st, x, a) => st.board[x][a].reduce((n, c) => n + powerOf(c), 0);
export const totalSum = (st, x) => [0, 1, 2].reduce((n, a) => n + altarSum(st, x, a), 0);

// Vérifie un ensemble de poses [{ id, a }] pour le camp x
export function checkPlays(st, x, plays) {
  let cost = 0; const n = [0, 0, 0], seen = new Set();
  for (const p of plays) {
    if (!st.hands[x].includes(p.id) || seen.has(p.id)) return 'Cette carte n’est pas dans ta main.';
    if (![0, 1, 2].includes(p.a)) return 'Autel inconnu.';
    seen.add(p.id); cost += st.info[p.id].cost; n[p.a]++;
  }
  if (cost > st.energy[x]) return 'Pas assez de Ferveur.';
  for (let a = 0; a < 3; a++) if (st.board[x][a].length + n[a] > cap(st, a)) return 'Cet autel est plein.';
  return null;
}

// Pose une carte (révélation) : effets de l'autel, puis rôle
function place(st, x, id, a, ev) {
  const I = st.info[id], A = ALTARS[st.altars[a]], o = other(x);
  const c = { id, f: I.f, r: I.r, base: I.base, mod: 0, t: st.turn, role: I.role };
  const notes = [];
  if (A.fac && I.f === A.fac) { c.mod += 2; notes.push('+2 autel'); }
  if (st.altars[a] === 'givre' && st.turn >= 4) { c.mod -= 1; notes.push('−1 givre'); }
  if (st.altars[a] === 'aube' && st.turn <= 2) { c.mod += 2; notes.push('+2 aube'); }
  if (st.altars[a] === 'humble' && (I.r === 'C' || I.r === 'PC')) { c.mod += 2; notes.push('+2 humble'); }
  if (st.gel[x][a]) { c.mod -= st.gel[x][a]; notes.push(`−${st.gel[x][a]} entrave`); st.gel[x][a] = 0; }
  st.board[x][a].push(c);
  st.hands[x] = st.hands[x].filter((h) => h !== id);
  const fx = st.altars[a] === 'silence' ? null : I.role;
  const mine = st.board[x][a], theirs = st.board[o][a];
  if (fx === 'protecteur') mine.forEach((y) => { if (y !== c) y.mod += 2; });
  else if (fx === 'degats' && st.turn === TURNS) c.mod += 2;
  else if (fx === 'soin') { const l = mine.filter((y) => y !== c); const w = (l.length ? l : [c]).reduce((m, y) => (powerOf(y) < powerOf(m) ? y : m)); w.mod += 2; }
  else if (fx === 'poison') theirs.forEach((y) => { y.mod -= 1; });
  else if (fx === 'controle') st.gel[o][a] += 2;
  else if (fx === 'soutien') st.bonus[x] += 1;
  else if (fx === 'zone') [0, 1, 2].filter((b) => b !== a).forEach((b) => [...st.board.p[b], ...st.board.a[b]].forEach((y) => { y.mod -= 1; }));
  ev.push({ x, id, a, role: fx, silenced: st.altars[a] === 'silence' && !!I.role, notes });
}

// Fin du tour : on révèle tes poses, puis celles de l'adversaire. Renvoie les événements (pour l'écran).
export function playTurn(st, pPlays, aPlays) {
  if (st.over) throw new Error('La partie est terminée.');
  const e1 = checkPlays(st, 'p', pPlays); if (e1) throw new Error(e1);
  const e2 = checkPlays(st, 'a', aPlays); if (e2) throw new Error(e2);
  const ev = [];
  for (const p of pPlays) place(st, 'p', p.id, p.a, ev);
  for (const p of aPlays) if (st.board.a[p.a].length < cap(st, p.a)) place(st, 'a', p.id, p.a, ev);
  st.log.push({ turn: st.turn, ev });
  if (st.turn >= TURNS) finish(st); else startTurn(st);
  return ev;
}
export function altarWinner(st, a) {
  const p = altarSum(st, 'p', a), q = altarSum(st, 'a', a);
  if (p !== q) return p > q ? 'p' : 'a';
  const tp = totalSum(st, 'p'), ta = totalSum(st, 'a');
  return tp === ta ? null : tp > ta ? 'p' : 'a';
}
function finish(st) {
  const w = [0, 1, 2].map((a) => altarWinner(st, a));
  const np = w.filter((x) => x === 'p').length, na = w.filter((x) => x === 'a').length;
  st.over = np > na ? 'won' : 'lost'; // égalité parfaite (très rare) : l'autel garde ses offrandes, c'est une défaite
  st.final = { winners: w, altars: [0, 1, 2].map((a) => ({ p: altarSum(st, 'p', a), a: altarSum(st, 'a', a) })), total: { p: totalSum(st, 'p'), a: totalSum(st, 'a') } };
}

// ——— Intelligence de pose ———
// Valeur d'une position pour le camp x : viser 2 autels sur 3 (les deux meilleurs écarts comptent le plus)
function evalPos(st, x) {
  const o = other(x), d = [0, 1, 2].map((a) => altarSum(st, x, a) - altarSum(st, o, a));
  const f = d.map((v) => Math.tanh(v / 4)).sort((a, b) => b - a);
  return f[0] + f[1] + 0.35 * f[2] + 0.01 * (totalSum(st, x) - totalSum(st, o));
}
const clone = (st) => JSON.parse(JSON.stringify(st));
// Toutes les façons de jouer sa main ce tour-ci (sous-ensembles payables × autels), au plus `limit`
function options(st, x, limit = 900) {
  const hand = st.hands[x], out = [[]];
  const rec = (i, cur, cost, n) => {
    if (out.length >= limit) return;
    if (i === hand.length) { if (cur.length) out.push(cur.slice()); return; }
    rec(i + 1, cur, cost, n);
    const id = hand[i], c = st.info[id].cost;
    if (cost + c > st.energy[x]) return;
    for (let a = 0; a < 3; a++) {
      if (st.board[x][a].length + n[a] >= cap(st, a)) continue;
      n[a]++; cur.push({ id, a }); rec(i + 1, cur, cost + c, n); cur.pop(); n[a]--;
    }
  };
  rec(0, [], 0, [0, 0, 0]);
  return out;
}
// Choix des poses pour le camp x (sans connaître celles de l'autre camp ce tour-ci)
export function choosePlays(st, x, rng = Math.random, prof = null) {
  const R = prof || RIVALS[st.rival];
  let best = [], bv = -Infinity;
  for (const plays of options(st, x)) {
    const s = clone(st); s.over = 'x';
    const ev = [];
    for (const p of plays) place(s, x, p.id, p.a, ev);
    const spent = plays.reduce((n, p) => n + st.info[p.id].cost, 0);
    // garder de la Ferveur ne sert à rien (elle ne s'accumule pas) ; les grosses cartes valent mieux plus tard
    let v = evalPos(s, x) + 0.04 * R.greed * spent;
    v += (rng() - 0.5) * 0.25 * R.noise;
    if (v > bv) { bv = v; best = plays; }
  }
  return best;
}
