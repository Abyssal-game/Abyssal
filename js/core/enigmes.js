// v427 : Les Énigmes des Sceaux — trois casse-têtes par jour, les mêmes pour tous, sur le moteur des Duels des Sceaux.
// Un plateau à moitié rempli, une main imposée : trouve LA pose qui capture le plus de cartes (le nombre est donné).
// Énigme I : règle Classique ; II et III : Identique ou Somme (avec Combo). Trois essais : 3, 2 ou 1 étoile.
// Chaque énigme est fabriquée à partir de la date et vérifiée : la meilleure pose existe, elle bat nettement les autres,
// et il n'y a qu'une ou deux bonnes réponses.
import { sideValues, place, perksOf } from './sceaux.js';

function hash(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const TRIES = 3;
// Réglages des trois énigmes : cartes déjà posées, cartes en main, captures visées au minimum
export const LEVELS = [
  { name: 'Énigme I', placed: 4, hand: 2, min: 2, rules: ['classique'] },
  { name: 'Énigme II', placed: 5, hand: 3, min: 3, rules: ['identique', 'somme'] },
  { name: 'Énigme III', placed: 6, hand: 3, min: 4, rules: ['somme', 'identique'] },
];
export const ENIGME_REWARD = { shards: [15, 25, 40], perStar: 5, allChest: 'bois', xp: 5 };
export const starsFor = (tries) => Math.max(0, TRIES + 1 - tries);

// État de jeu minimal compris par `place` (moteur des Sceaux)
const stateOf = (pz) => ({ v: 1, rule: pz.rule, board: pz.board.map((c) => (c ? { ...c, vals: c.vals.slice() } : null)), hands: { p: pz.hand.slice(), o: [] }, turn: 'p', placed: pz.board.filter(Boolean).length, cells: { blessed: null, cursed: null }, fac: { p: null, o: null }, log: [], over: null });
// Pose une carte de la main sur une case : renvoie les captures (cartes adverses prises) et l'état obtenu
export function tryMove(cat, pz, handIdx, cell) {
  const st = stateOf(pz);
  const flips = place(cat, st, 'p', handIdx, cell).filter((f) => !f.blocked);
  return { flips, n: flips.length, st };
}
export function bestMoves(cat, pz) {
  const res = [];
  pz.hand.forEach((_, h) => pz.board.forEach((c, i) => { if (!c) res.push({ h, cell: i, n: tryMove(cat, pz, h, i).n }); }));
  res.sort((a, b) => b.n - a.n);
  return res;
}

// Fabrique l'énigme `k` (0, 1, 2) du jour `day`
export function makePuzzle(cat, day, k) {
  const L = LEVELS[k];
  const r = mulberry(hash(`enigme:${day}:${k}`));
  // cartes sans pouvoir de rareté (Communes à Rares) : seules les valeurs comptent
  const pool = cat.cards.filter((c) => ['C', 'PC', 'R'].includes(c.rarity) && !perksOf(c).length);
  const pick = () => pool[Math.floor(r() * pool.length)];
  const rule = L.rules[Math.floor(r() * L.rules.length)];
  let fallback = null;
  for (let attempt = 0; attempt < 600; attempt++) {
    const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
    const board = Array(9).fill(null);
    const used = new Set();
    cells.slice(0, L.placed).forEach((i, n) => {
      let c = pick(); while (used.has(c.id)) c = pick();
      used.add(c.id);
      // une ou deux de tes cartes déjà posées (elles comptent pour Identique et Somme), le reste à l'adversaire
      board[i] = { id: c.id, owner: n < (rule === 'classique' ? 1 : 2) ? 'p' : 'o', from: 'o', vals: sideValues(c), guard: false };
    });
    const hand = [];
    while (hand.length < L.hand) { const c = pick(); if (!used.has(c.id)) { used.add(c.id); hand.push(c.id); } }
    const pz = { day, k, rule, board, hand };
    const moves = bestMoves(cat, pz);
    const top = moves[0].n, nTop = moves.filter((m) => m.n === top).length, second = moves.find((m) => m.n < top)?.n ?? 0;
    if (top >= L.min && nTop <= 2 && top - second >= (k === 0 ? 1 : 2)) return { ...pz, goal: top, solutions: moves.filter((m) => m.n === top).map(({ h, cell }) => ({ h, cell })) };
    if (top >= 2 && nTop <= 3 && (!fallback || top > fallback.goal)) fallback = { ...pz, goal: top, solutions: moves.filter((m) => m.n === top).map(({ h, cell }) => ({ h, cell })) };
  }
  return fallback;
}
export function dayPuzzles(cat, day) { return LEVELS.map((_, k) => makePuzzle(cat, day, k)); }
