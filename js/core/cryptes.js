// v450 : Les Cryptes — jeu de mémoire à deux (toi contre un arbitre de l'Abysse), avec les pouvoirs des factions.
// 20 cartes face cachée, en 10 paires (une créature par paire ; les 7 factions, trois d'entre elles en double).
// À ton tour, tu retournes deux cartes. Une paire : tu la gardes, son pouvoir se déclenche, et tu rejoues.
// Sinon, les cartes se referment et la main passe. Quand tout est pris, le plus de points gagne (1 par paire).
// Pouvoirs : Infernal (regarder une carte en secret), Abyssal (échanger deux cartes de place), Céleste (ta prochaine
// erreur ne passe pas la main), Nécrotique (voler la dernière paire adverse), Sauvage (révéler une carte à tous),
// Primordial (+1 point), Artificiel (bloquer le prochain pouvoir adverse).
// Moteur pur (aucun DOM) : l'état est un objet simple, sauvegardé tel quel dans s.cryptes.cur.
import { FACTION_ORDER } from '../config.js';

export const PAIRS = 10;
export const COLS = 5; // grille de 5 × 4 à l'écran

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

export const POWERS = {
  infernal: { name: 'Regard infernal', short: 'Regarde une carte en secret.', pick: 1 },
  abyssal: { name: 'Remous abyssal', short: 'Échange deux cartes de place.', pick: 2 },
  celeste: { name: 'Grâce céleste', short: 'Ta prochaine erreur ne passe pas la main.' },
  necrotique: { name: 'Pillage des tombes', short: 'Vole la dernière paire de l’adversaire.' },
  sauvage: { name: 'Cri sauvage', short: 'Retourne une carte, à la vue de tous.', pick: 1 },
  primordial: { name: 'Souffle primordial', short: '+1 point.' },
  artificiel: { name: 'Verrou artificiel', short: 'Bloque le prochain pouvoir de l’adversaire.' },
};

// Adversaires : les arbitres des Sceaux. mem : chance de retenir une carte vue ; fade : chance d'oublier, à chaque tour,
// une carte retenue ; spite : utilise ses pouvoirs pour gêner (échange des cartes que tu as vues).
export const RIVALS = {
  initie: { name: 'Ilda', mem: 0.2, fade: 0.3, spite: 0, hint: 'Oublie vite ce qu’elle a vu.',
    hello: 'Des cryptes ? J’ai la mémoire d’un moineau… on y va ?', beaten: 'Je l’avais vue, celle-là ! Enfin… je crois.', gloat: 'Même un moineau trouve ses graines !' },
  stratege: { name: 'Sœur Vesna', mem: 0.45, fade: 0.15, spite: 0.3, hint: 'Retient une carte sur deux, et brouille parfois les tiennes.',
    hello: 'Chaque tombe garde un nom. Je les récite tous les soirs.', beaten: 'Ma litanie avait un trou.', gloat: 'La prière garde la mémoire.' },
  archiviste: { name: 'L’Archiviste', mem: 0.62, fade: 0.08, spite: 0.6, hint: 'Retient beaucoup, et échange les cartes que tu viens de voir.',
    hello: 'J’ai catalogué chaque crypte. Chaque dalle. Chaque os.', beaten: 'Erreur… d’inventaire.', gloat: 'Tout est noté. Tout.' },
  echo: { name: 'L’Écho de l’Abîme', mem: 0.8, fade: 0.04, spite: 0.9, hint: 'N’oublie presque rien, et brouille sans cesse tes souvenirs.',
    hello: 'Chaque carte retournée résonne en moi… à jamais.', beaten: '… l’écho se tait.', gloat: 'Tu m’as entendu ? Moi, je me souviens de tout.' },
};
export const TABLES = [
  { key: 'ossuaire', name: 'L’Ossuaire', stars: 1, rival: 'initie', reward: 25, chest: 'bois' },
  { key: 'chapelle', name: 'La Chapelle des noms', stars: 2, rival: 'stratege', reward: 35, chest: 'fer' },
  { key: 'archives', name: 'Les Archives scellées', stars: 3, rival: 'archiviste', reward: 50, chest: 'or' },
  { key: 'puits', name: 'Le Puits de l’Écho', stars: 4, rival: 'echo', reward: 70, chest: 'abyssal' },
];
export const TABLE = Object.fromEntries(TABLES.map((t) => [t.key, t]));
export const tableUnlocked = (s, i) => i === 0 || !!s.cryptes?.beaten?.[TABLES[i - 1].key];
export const CRYPTES_REWARD = { firstWin: 100, daily: 40, dailyPaid: 5, afterCap: 5, xp: 10 };
export const CRYPTES_TITLE = 'Gardien des Cryptes';
export const dailyTable = (day, unlocked) => TABLES[hash(`cryptes:${day}`) % Math.max(1, Math.min(unlocked, TABLES.length))].key;

export function newGame(cat, { table, seed = Date.now(), daily = false }) {
  const T = TABLE[table];
  if (!T) throw new Error('Table inconnue.');
  const r = mulberry(seed);
  const facs = shuffle(FACTION_ORDER.slice(), r);
  const pf = [...FACTION_ORDER, ...facs.slice(0, PAIRS - FACTION_ORDER.length)];
  const used = new Set();
  const pairs = pf.map((f, k) => {
    const pool = (cat?.byFaction?.[f] || []).filter((c) => !used.has(c.id) && c.rarity !== 'S');
    const c = pool.length ? pool[Math.floor(r() * pool.length)] : null;
    if (c) used.add(c.id);
    return { k, f, id: c?.id || null };
  });
  const cards = shuffle(pairs.flatMap((p) => [{ k: p.k, f: p.f, id: p.id }, { k: p.k, f: p.f, id: p.id }]), r).map((c) => ({ ...c, gone: null }));
  return { table, daily, seed, rival: T.rival, cards, turn: 'p', open: [], pairs: { p: [], a: [] }, bonus: { p: 0, a: 0 },
    grace: { p: 0, a: 0 }, block: { p: false, a: false }, pending: null, shown: [], mem: {}, turns: 0, last: null, over: null, final: null };
}

const other = (x) => (x === 'p' ? 'a' : 'p');
export const scoreOf = (st, x) => st.pairs[x].length + st.bonus[x];
export const hidden = (st) => st.cards.map((c, i) => (c.gone ? -1 : i)).filter((i) => i >= 0 && !st.open.includes(i));
export const left = (st) => st.cards.filter((c) => !c.gone).length / 2;

// Mémoire de l'adversaire : il retient (ou non) chaque carte qu'il voit
function see(st, i, rng, sure = false) {
  const R = RIVALS[st.rival];
  if (sure || rng() < R.mem) st.mem[i] = st.cards[i].k;
}
function fadeMem(st, rng) {
  const R = RIVALS[st.rival];
  for (const i of Object.keys(st.mem)) if (st.cards[i].gone || st.mem[i] !== st.cards[i].k || rng() < R.fade) delete st.mem[i];
}

function finish(st) {
  if (st.cards.some((c) => !c.gone)) return;
  const p = scoreOf(st, 'p'), a = scoreOf(st, 'a');
  // égalité : celui qui a pris la dernière paire l'emporte
  st.over = p > a || (p === a && st.lastPair === 'p') ? 'won' : 'lost';
  st.final = { scores: { p, a } };
}

// Retourne une carte (le joueur dont c'est le tour). Renvoie l'événement pour l'écran.
export function flip(st, i, rng = Math.random) {
  if (st.over) throw new Error('La partie est terminée.');
  if (st.pending) throw new Error('Choisis d’abord la cible du pouvoir.');
  const c = st.cards[i];
  if (!c || c.gone || st.open.includes(i)) throw new Error('Cette carte ne peut pas être retournée.');
  const who = st.turn;
  st.open.push(i);
  see(st, i, rng, who === 'a');
  noteShown(st, [i]);
  if (st.open.length < 2) { st.last = { who, kind: 'first', i }; return st.last; }
  const [x, y] = st.open;
  st.open = [];
  if (st.cards[x].k === st.cards[y].k) {
    st.cards[x].gone = st.cards[y].gone = who;
    st.pairs[who].push(c.k); st.lastPair = who;
    delete st.mem[x]; delete st.mem[y];
    const ev = { who, kind: 'match', i: [x, y], f: c.f, k: c.k, power: c.f, blocked: false };
    if (st.block[who]) { st.block[who] = false; ev.blocked = true; }
    else applyPower(st, who, c.f, ev, rng);
    finish(st);
    st.last = ev;
    return ev;
  }
  const ev = { who, kind: 'miss', i: [x, y], graced: false };
  if (st.grace[who] > 0) { st.grace[who]--; ev.graced = true; } else { st.turn = other(who); st.turns++; fadeMem(st, rng); }
  st.last = ev;
  return ev;
}

function applyPower(st, who, f, ev, rng) {
  const opp = other(who);
  if (f === 'celeste') st.grace[who]++;
  else if (f === 'primordial') st.bonus[who]++;
  else if (f === 'artificiel') st.block[opp] = true;
  else if (f === 'necrotique') { const k = st.pairs[opp].pop(); if (k != null) { st.pairs[who].push(k); ev.stolen = k; } else ev.empty = true; }
  else if (POWERS[f]?.pick) {
    if (hidden(st).length < POWERS[f].pick) { ev.empty = true; return; }
    if (who === 'p') st.pending = { power: f, pick: POWERS[f].pick };
    else aiPower(st, f, ev, rng);
  }
}

// Le joueur choisit la (les) carte(s) du pouvoir en attente
export function usePower(st, picks, rng = Math.random) {
  const P = st.pending;
  if (!P) throw new Error('Aucun pouvoir en attente.');
  const hid = hidden(st);
  if (picks.length !== P.pick || picks.some((i) => !hid.includes(i)) || new Set(picks).size !== picks.length) throw new Error('Choisis une carte face cachée.');
  st.pending = null;
  const ev = { who: 'p', kind: 'power', power: P.power, i: picks };
  if (P.power === 'infernal') ev.card = st.cards[picks[0]];
  if (P.power === 'sauvage') { ev.card = st.cards[picks[0]]; see(st, picks[0], rng); }
  if (P.power === 'abyssal') swap(st, picks[0], picks[1]);
  st.last = ev;
  return ev;
}
function swap(st, i, j) {
  [st.cards[i], st.cards[j]] = [st.cards[j], st.cards[i]];
  const mi = st.mem[i], mj = st.mem[j];
  delete st.mem[i]; delete st.mem[j];
  if (mj != null) st.mem[i] = mj;
  if (mi != null) st.mem[j] = mi;
}

// Pouvoirs de l'adversaire : il les choisit lui-même
function aiPower(st, f, ev, rng) {
  const R = RIVALS[st.rival], hid = hidden(st);
  const unknown = hid.filter((i) => st.mem[i] == null);
  if (f === 'infernal' || f === 'sauvage') {
    const i = (unknown.length ? unknown : hid)[Math.floor(rng() * (unknown.length ? unknown : hid).length)];
    st.mem[i] = st.cards[i].k; ev.i2 = [i];
    if (f === 'sauvage') ev.card = st.cards[i];
  } else if (f === 'abyssal') {
    // il brouille les cartes que tu as déjà vues (les plus récentes), ou en échange deux au hasard
    const seen = (st.shown || []).filter((i) => hid.includes(i));
    let a, b;
    if (seen.length >= 2 && rng() < R.spite) { a = seen[seen.length - 1]; b = seen[seen.length - 2]; }
    else { const s = shuffle(hid.slice(), rng); a = s[0]; b = s[1]; }
    swap(st, a, b); ev.i2 = [a, b];
  }
}

// Ce que l'adversaire fait maintenant : retourner une carte (renvoie son indice)
export function aiPick(st, rng = Math.random) {
  const hid = hidden(st), byK = {};
  for (const i of hid) if (st.mem[i] != null) (byK[st.mem[i]] ||= []).push(i);
  if (st.open.length === 1) {
    const o = st.open[0], k = st.cards[o].k;
    const known = (byK[k] || []).find((i) => i !== o);
    if (known != null) return known;
    const unknown = hid.filter((i) => st.mem[i] == null && i !== o);
    const pool = unknown.length ? unknown : hid.filter((i) => i !== o);
    return pool[Math.floor(rng() * pool.length)];
  }
  const pair = Object.values(byK).find((l) => l.length >= 2);
  if (pair) return pair[0];
  const unknown = hid.filter((i) => st.mem[i] == null);
  const pool = unknown.length ? unknown : hid;
  return pool[Math.floor(rng() * pool.length)];
}
// Pour l'écran : cartes vues par le joueur (l'adversaire s'en sert pour brouiller avec Abyssal)
export function noteShown(st, idx) {
  st.shown = [...(st.shown || []).filter((i) => !idx.includes(i)), ...idx].slice(-8);
}
