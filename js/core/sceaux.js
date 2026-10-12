// ABYSSAL : Duels des Sceaux, un jeu de cartes sur un plateau de 3 × 3 (logique pure, sans affichage).
//
// Chaque joueur a 5 cartes. Chaque carte porte quatre valeurs (haut, droite, bas, gauche), de 1 à 10
// (10 s'affiche « A »). On pose une carte par tour sur une case libre ; si une valeur dépasse
// strictement la valeur d'en face d'une carte adverse voisine, cette carte est capturée.
// Après les 9 poses, on compte les cartes contrôlées sur le plateau, plus la carte restée en main :
// le plus grand total gagne ; 5 contre 5 donne une égalité.
//
// Les valeurs ne dépendent pas des statistiques de combat. Toutes les cartes ont le même total (20) :
// la rareté rend seulement le profil plus tranché (un 9 mais des 1), jamais plus fort au total.
import { STARTER } from './army.js';

export const DIRS = ['haut', 'droite', 'bas', 'gauche'];
const OPP = [2, 3, 0, 1];
const STEP = { C: 2, PC: 3, R: 4, HR: 5, M: 6, S: 7 };

function hash(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Les quatre valeurs d'une carte : total 20, profil plus tranché quand la rareté monte
export function sideValues(card) {
  const r = mulberry(hash(`sceau:${card.id}`));
  const v = [5, 5, 5, 5];
  const n = STEP[card.rarity] || 2;
  for (let k = 0, guard = 0; k < n && guard < 60; guard++) {
    const from = Math.floor(r() * 4), to = Math.floor(r() * 4);
    if (from === to || v[from] <= 1 || v[to] >= 10) continue;
    v[from]--; v[to]++; k++;
  }
  return v;
}
export const showVal = (n) => (n >= 10 ? 'A' : String(n));

// Règles spéciales (une seule à la fois ; le mode classique n'en a aucune)
export const RULES = {
  classique: { name: 'Classique', desc: 'Les règles de base, sans surprise.' },
  sacre:     { name: 'Cases sacrées', desc: 'Une case bénie (+1 à toutes les valeurs de la carte posée) et une case maudite (−1).' },
  instable:  { name: 'Plateau instable', desc: 'Une case bénie et une case maudite, qui changent de place toutes les deux poses.' },
  faction:   { name: 'Fraternité', desc: 'Avec au moins 3 cartes d’une même faction en main, leur plus faible valeur gagne +1.' },
};

// Adversaires : du plus simple au plus redoutable. level : force de l'IA (1 à 4).
export const RIVALS = [
  { key: 'initie', name: 'Ilda', title: 'l’Initiée', level: 1, faction: null, portrait: 'CEL-006', rule: 'classique', reward: 20,
    hello: 'Tu connais les Sceaux ? Moi, j’apprends encore. On joue doucement ?', win: 'Oh ! Tu m’apprendras ce coup-là ?', lose: 'J’ai gagné ? J’ai gagné !' },
  { key: 'collectionneur', name: 'Maître Orvel', title: 'le Collectionneur', level: 2, faction: 'artificiel', portrait: 'ART-004', rule: 'classique', reward: 30,
    hello: 'Chaque carte que je pose vaut une fortune. Ne les abîme pas.', win: 'Ma collection pleure.', lose: 'Une carte de plus pour ma vitrine.' },
  { key: 'stratege', name: 'Sœur Vesna', title: 'la Stratège', level: 3, faction: 'celeste', portrait: 'CEL-005', rule: 'sacre', reward: 40,
    hello: 'Chaque case est une prière. Choisis bien où tu t’agenouilles.', win: 'La lumière t’a guidé, cette fois.', lose: 'Tu as joué au hasard. La lumière, jamais.' },
  { key: 'maitre', name: 'Le Maître des Sceaux', title: 'gardien des règles', level: 4, faction: 'necrotique', portrait: 'NEC-001', rule: 'faction', reward: 55,
    hello: 'J’ai scellé plus de créatures que tu n’en verras jamais.', win: 'Tu as brisé mon sceau. Ce n’est pas rien.', lose: 'Reviens quand tu sauras compter.' },
  { key: 'echo', name: 'L’Écho de l’Abîme', title: 'adversaire ultime', level: 4, faction: 'abyssal', portrait: 'ABY-039', rule: 'instable', reward: 70,
    hello: 'Je joue tes coups avant toi. Je les ai déjà joués mille fois.', win: '… l’écho se tait.', lose: 'Tu m’entends ? C’est toi, en bas.' },
];
export const RIVAL = Object.fromEntries(RIVALS.map((r) => [r.key, r]));
export const rivalUnlocked = (s, i) => i === 0 || !!s.sceaux?.beaten?.[RIVALS[i - 1].key];

// Récompenses : plafonnées par jour pour qu'aucun mode ne devienne la seule source d'éclats
export const SCEAUX_REWARD = { dailyPaid: 5, firstWin: 100, daily: 40 };
export const SCEAUX_TITLES = { initie: 'Initié des Sceaux', maitre: 'Maître des Sceaux', echo: 'Briseur d’Échos' };

// Main d'un adversaire : 5 cartes de sa faction, de plus en plus rares avec son niveau (déterministe)
export function rivalHand(cat, rival, salt = '') {
  const r = mulberry(hash(`rival:${rival.key}:${salt}`));
  const pool = (rival.faction ? cat.byFaction[rival.faction] : cat.cards).filter((c) => c.rarity !== 'S' || rival.level >= 4);
  const tiers = { 1: ['C', 'C', 'C', 'PC', 'PC'], 2: ['C', 'PC', 'PC', 'R', 'R'], 3: ['PC', 'R', 'R', 'HR', 'HR'], 4: ['R', 'HR', 'HR', 'M', 'M'] }[rival.level];
  const out = [];
  for (const t of tiers) {
    const cands = pool.filter((c) => c.rarity === t && !out.includes(c.id));
    const list = cands.length ? cands : pool.filter((c) => !out.includes(c.id));
    out.push(list[Math.floor(r() * list.length)].id);
  }
  return out;
}
// Main conseillée parmi les cartes possédées : des forces dans des directions différentes.
// Avec moins de 5 cartes, on complète avec les cartes de départ (prêtées pour la partie).
export function autoHand(cat, ownedIds) {
  const cards = ownedIds.map((id) => cat.get(id)).filter(Boolean);
  const picked = [];
  const cover = [0, 0, 0, 0];
  for (let k = 0; k < 5 && cards.length; k++) {
    let best = null, bs = -1;
    for (const c of cards) {
      if (picked.includes(c.id)) continue;
      const v = sideValues(c);
      const score = v.reduce((a, x, d) => a + Math.max(0, x - cover[d]), 0) * 10 + Math.max(...v);
      if (score > bs) { bs = score; best = c; }
    }
    if (!best) break;
    picked.push(best.id);
    sideValues(best).forEach((x, d) => { cover[d] = Math.max(cover[d], x); });
  }
  for (const id of STARTER) if (picked.length < 5 && !picked.includes(id)) picked.push(id);
  return picked.slice(0, 5);
}

// ——— Partie ———
export function newGame(cat, { hand, rival, seed = Date.now(), daily = false }) {
  const R = typeof rival === 'string' ? RIVAL[rival] : rival;
  const rnd = mulberry(seed);
  const opp = rivalHand(cat, R, daily ? `jour:${seed}` : '');
  const st = {
    v: 1, rival: R.key, rule: R.rule, daily, seed,
    board: Array(9).fill(null), hands: { p: hand.slice(0, 5), o: opp }, turn: rnd() < 0.5 ? 'p' : 'o', placed: 0,
    cells: { blessed: null, cursed: null }, over: null, last: null, log: [],
    fac: { p: dominant(cat, hand), o: dominant(cat, opp) },
  };
  st.first = st.turn;
  if (st.rule === 'sacre' || st.rule === 'instable') moveCells(st, rnd);
  st.rng = Math.floor(rnd() * 2 ** 31);
  return st;
}
function dominant(cat, ids) {
  const n = {};
  ids.forEach((id) => { const f = cat.get(id)?.faction; if (f) n[f] = (n[f] || 0) + 1; });
  const [f, k] = Object.entries(n).sort((a, b) => b[1] - a[1])[0] || [];
  return k >= 3 ? f : null;
}
function moveCells(st, rnd) {
  const free = st.board.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
  if (free.length < 2) { st.cells = { blessed: null, cursed: null }; return; }
  const a = free.splice(Math.floor(rnd() * free.length), 1)[0];
  const b = free[Math.floor(rnd() * free.length)];
  st.cells = { blessed: a, cursed: b };
}
// Valeurs effectives d'une carte posée sur une case (règles spéciales comprises)
export function valuesOn(cat, st, id, cell, who) {
  const card = cat.get(id);
  const v = sideValues(card).slice();
  if (st.rule === 'faction' && st.fac[who] && card.faction === st.fac[who]) { const i = v.indexOf(Math.min(...v)); v[i]++; }
  const mod = cell === st.cells.blessed ? 1 : cell === st.cells.cursed ? -1 : 0;
  return v.map((x) => Math.max(1, Math.min(10, x + mod)));
}
export const neighbors = (i) => [i >= 3 ? i - 3 : -1, i % 3 < 2 ? i + 1 : -1, i < 6 ? i + 3 : -1, i % 3 > 0 ? i - 1 : -1];

// Pose une carte (index dans la main) sur une case. Renvoie la liste des captures, ou lève une erreur.
export function place(cat, st, who, handIdx, cell) {
  if (st.over) throw new Error('La partie est terminée.');
  if (st.turn !== who) throw new Error('Ce n’est pas ton tour.');
  if (!(cell >= 0 && cell < 9) || st.board[cell]) throw new Error('Cette case est déjà prise.');
  const id = st.hands[who][handIdx];
  if (!id) throw new Error('Carte introuvable.');
  const vals = valuesOn(cat, st, id, cell, who);
  st.hands[who] = st.hands[who].filter((_, k) => k !== handIdx);
  st.board[cell] = { id, owner: who, vals };
  const flips = [];
  neighbors(cell).forEach((n, d) => {
    if (n < 0) return;
    const o = st.board[n];
    if (!o || o.owner === who) return;
    if (vals[d] > o.vals[OPP[d]]) { o.owner = who; flips.push({ cell: n, dir: d, mine: vals[d], theirs: o.vals[OPP[d]] }); }
  });
  st.placed++;
  st.last = { cell, who, flips };
  st.log.push({ who, id, cell, flips: flips.map((f) => f.cell) });
  if (st.rule === 'instable' && st.placed % 2 === 0 && st.placed < 9) { const r = mulberry(st.rng + st.placed); moveCells(st, r); }
  if (st.placed >= 9) finish(st);
  else st.turn = who === 'p' ? 'o' : 'p';
  return flips;
}
export function score(st) {
  const s = { p: st.hands.p.length, o: st.hands.o.length };
  st.board.forEach((c) => { if (c) s[c.owner]++; });
  return s;
}
function finish(st) {
  const s = score(st);
  st.over = s.p > s.o ? 'won' : s.p < s.o ? 'lost' : 'draw';
  st.final = s;
}

// ——— Intelligence de l'adversaire ———
function cloneGame(st) { return { ...st, board: st.board.map((c) => (c ? { ...c, vals: c.vals.slice() } : null)), hands: { p: st.hands.p.slice(), o: st.hands.o.slice() }, cells: { ...st.cells }, log: [], last: null }; }
const legalMoves = (st, who) => { const m = []; st.hands[who].forEach((_, h) => st.board.forEach((c, i) => { if (!c) m.push([h, i]); })); return m; };
const boardDiff = (st, who) => { const s = score(st); return who === 'o' ? s.o - s.p : s.p - s.o; };
// Risque : côtés d'une carte tournés vers une case vide, plus faibles que ce que l'adversaire peut y poser
function exposure(cat, st, cell, who) {
  const other = who === 'o' ? 'p' : 'o';
  const theirs = st.hands[other].map((id) => sideValues(cat.get(id)));
  if (!theirs.length) return 0;
  const me = st.board[cell];
  let risk = 0;
  neighbors(cell).forEach((n, d) => {
    if (n < 0 || st.board[n]) return;
    const best = Math.max(...theirs.map((v) => v[OPP[d]]));
    if (best > me.vals[d]) risk++;
  });
  return risk;
}
export function aiMove(cat, st, level = 2, rnd = Math.random) {
  const who = st.turn;
  const moves = legalMoves(st, who);
  if (!moves.length) return null;
  if (level <= 1 && rnd() < 0.6) return moves[Math.floor(rnd() * moves.length)];
  let best = null, bs = -Infinity;
  for (const [h, c] of moves) {
    const t = cloneGame(st);
    const flips = place(cat, t, who, h, c);
    let v = flips.length * 10;
    if (level >= 3) v -= exposure(cat, t, c, who) * 6;
    if (level >= 4 && !t.over) {
      // l'adversaire répond au mieux : on garde le coup qui laisse le plus d'avance après sa réponse
      let worst = Infinity;
      for (const [h2, c2] of legalMoves(t, t.turn)) {
        const u = cloneGame(t);
        place(cat, u, u.turn, h2, c2);
        worst = Math.min(worst, boardDiff(u, who));
      }
      v = boardDiff(t, who) * 10 + (worst === Infinity ? 0 : worst * 12) - exposure(cat, t, c, who) * 3;
    }
    v += rnd() * (level >= 3 ? 0.5 : 3);
    if (v > bs) { bs = v; best = [h, c]; }
  }
  return best;
}
// Défi du jour : un adversaire déjà débloqué et une règle spéciale, les mêmes pour toute la journée
export function dailyChallenge(day, unlockedCount) {
  const h = hash(`defi:${day}`);
  const rival = RIVALS[h % Math.max(1, unlockedCount)];
  const rule = ['sacre', 'instable', 'faction'][(h >>> 8) % 3];
  return { rival: rival.key, rule, seed: h };
}
