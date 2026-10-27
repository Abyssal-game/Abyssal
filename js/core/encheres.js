// v427 : Les Enchères de Mammon — enchères à l'aveugle à trois (toi et deux enchérisseurs).
// Chacun a 15 offrandes (1 à 15). Mammon met en vente 15 lots, un par manche : 10 créatures (1 à 10 points) et
// 5 malédictions (−1 à −5). Tout le monde pose une offrande en secret, puis on révèle. Les offrandes jouées par
// plusieurs joueurs s'annulent. Parmi celles qui restent, la plus haute prend une créature, la plus basse prend une
// malédiction. Si tout s'annule, le lot reste sur la table et s'ajoute au suivant. Une offrande jouée est perdue.
// Trois créatures d'une même faction : +5. Après le dernier lot, le plus de points gagne.
// Moteur pur (aucun DOM) : l'état est un objet simple, sauvegardé tel quel dans s.encheres.cur.
import { FACTION_ORDER } from '../config.js';
import { dexp } from './detmath.js';

export const SEATS = ['p', 'a', 'b'];
export const OFFERS = 15;
export const SET_BONUS = 5;

function hash(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Enchérisseurs : les arbitres des Sceaux. skill 1 à 4 (1 : mise au feeling ; 2 : compte les lots restants ;
// 3-4 : prévoit les offrandes des autres pour éviter les annulations) ; noise : part de hasard ; bias : mise plus haute
// (+) ou plus prudente (−) ; sets : goût des familles de trois ; bluff : coups de folie (très haut ou très bas).
export const BIDDERS = {
  initie: { name: 'Ilda', skill: 1, noise: 0.1, bias: 0, sets: 1, bluff: 0, hint: 'Offre toujours selon la valeur du lot : facile à lire.',
    hello: 'Je n’ai jamais rien acheté à Mammon. On commence doucement ?', beaten: 'J’ai trop économisé… il me reste plein d’offrandes !', gloat: 'J’ai gagné en dépensant moins que toi ?' },
  collectionneur: { name: 'Maître Orvel', skill: 1, noise: 0.05, bias: 0.05, sets: 1, bluff: 0, hint: 'Comme Ilda, un cran plus haut, et il aime les familles de trois.',
    hello: 'Trois pièces de la même faction… et la collection est parfaite.', beaten: 'Il me manquait une pièce. Une seule.', gloat: 'Une collection complète. Inestimable.' },
  stratege: { name: 'Sœur Vesna', skill: 2, noise: 0.15, bias: 0, sets: 1, bluff: 0, hint: 'Garde ses grosses offrandes pour les plus gros lots qui restent.',
    hello: 'Chaque offrande est une prière. Je ne prie pas pour rien.', beaten: 'Mes prières ont été mal placées.', gloat: 'Patience et mesure.' },
  maitre: { name: 'Le Maître des Sceaux', skill: 2, noise: 0.15, bias: 0.05, sets: 1, bluff: 0.08, hint: 'Compte les lots qui restent, et bluffe parfois.',
    hello: 'Les règles d’une vente sont simples. Les acheteurs, jamais.', beaten: 'J’ai mal compté. Cela n’arrive pas.', gloat: 'Le compte était bon.' },
  echo: { name: 'L’Écho de l’Abîme', skill: 2, noise: 0.45, bias: 0, sets: 1, temp: 1.5, bluff: 0, hint: 'Imprévisible : ses offrandes partent dans tous les sens.',
    hello: 'J’offre ce que tu offres. Ou presque.', beaten: '… l’écho se tait.', gloat: 'Tu m’as entendu offrir ? Moi, je t’ai entendu.' },
  archiviste: { name: 'L’Archiviste', skill: 2, noise: 0.35, bias: 0, sets: 1, temp: 3, bluff: 0.1, hint: 'Compte les lots qui restent, avec des écarts difficiles à prévoir.',
    hello: 'J’ai catalogué toutes les ventes de Mammon. Toutes.', beaten: 'Erreur… d’inventaire.', gloat: 'Valeur de ta collection : inférieure.' },
  banquier: { name: 'Mammon', skill: 1, noise: 0.15, bias: 0.25, sets: 2.5, temp: 0.6, bluff: 0, hint: 'Dépense sans compter, surtout pour une famille de trois.',
    hello: 'Bienvenue dans MA salle des ventes. Tout se paie, ici.', beaten: 'Vendu… à quelqu’un d’autre que moi ? Inadmissible.', gloat: 'La maison gagne toujours.' },
  souverain: { name: 'La Souveraine du Néant', skill: 3, read: true, lam: 0.75, noise: 0.15, bias: -0.25, sets: 0.6, temp: 4, bluff: 0, hint: 'Avare, et elle note tes offrandes passées pour deviner les prochaines.',
    hello: 'Tout ce qui est vendu ici finira dans le Néant. Autant que ce soit le mien.', beaten: 'Alors… le Néant peut perdre une enchère.', gloat: 'Retourne au silence, les mains vides.' },
};

// Tables : deux enchérisseurs chacune. Mesure v466 (simulation, 400 ventes par table) : joueur qui s'adapte 87 / 83 / 62 / 34 %,
// joueur moyen 75 / 62 / 46 / 22 %, joueur faible 55 / 41 / 35 / 22 %, au hasard 62 % à l'Étal (70 % avant). Les enchères sont un jeu de pierre-feuille-ciseaux : un style « fort » perd contre
// certains styles « faibles » ; la difficulté vient surtout de la lisibilité des enchérisseurs (prévisible → imprévisible).
export const TABLES = [
  { key: 'etal', name: 'L’Étal des curiosités', stars: 1, seats: ['initie', 'collectionneur'], reward: 25, chest: 'bois', bg: 'salle-encheres-etal' },
  { key: 'reliques', name: 'La Vente des reliques', stars: 2, seats: ['stratege', 'maitre'], reward: 35, chest: 'fer', bg: 'salle-encheres-reliques' },
  { key: 'nuit', name: 'La Vente de minuit', stars: 3, seats: ['echo', 'archiviste'], reward: 50, chest: 'or', bg: 'salle-encheres-nuit' },
  { key: 'grande', name: 'La Grande Vente', stars: 4, seats: ['banquier', 'souverain'], reward: 70, chest: 'abyssal', bg: 'salle-encheres-grande' },
  // v492 : ventes 5 à 8, chacune avec ses lots (rules : creatures = valeurs des créatures, curses = valeurs des malédictions,
  // facs = nombre de factions parmi les créatures, set = bonus d'une famille de trois)
  { key: 'maudite', name: 'La Vente maudite', stars: 4, seats: ['stratege', 'archiviste'], reward: 80, chest: 'or', bg: 'salle-encheres-maudite', power: { who: 'b', k: 'halfcurse', name: 'Contre-sort', text: 'Les malédictions que prend l’Archiviste ne lui coûtent que la moitié (arrondie en sa faveur).' }, rule: 'Sept malédictions (jusqu’à −7) pour huit créatures.', rules: { creatures: [3, 4, 5, 6, 7, 8, 9, 10], curses: [1, 2, 3, 4, 5, 6, 7], boost: { a: { skill: 3, lam: 0.35, temp: 1.5, noise: 0.1 }, b: { skill: 2, noise: 0.15, bias: 0.1 } } } },
  { key: 'tresors', name: 'La Vente des trésors', stars: 5, seats: ['collectionneur', 'banquier'], reward: 90, chest: 'or', bg: 'salle-encheres-tresors', power: { who: 'b', k: 'setplus', n: 5, name: 'Collection de la maison', text: 'Chaque famille de trois de Mammon lui rapporte 5 points de plus.' }, rule: 'Douze créatures, jusqu’à 12 points, et seulement trois malédictions.', rules: { creatures: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], curses: [2, 4, 6], boost: { a: { skill: 3, read: true, lam: 0.75, temp: 3, noise: 0.1 }, b: { skill: 2, noise: 0.15, bias: 0.1 } } } },
  { key: 'lignees', name: 'La Vente des lignées', stars: 5, seats: ['maitre', 'echo'], reward: 100, chest: 'abyssal', bg: 'salle-encheres-lignees', power: { who: 'b', k: 'echo', name: 'Résonance', text: 'À la fin de la vente, la plus belle créature de l’Écho compte double.' }, rule: 'Trois factions seulement, et une famille de trois rapporte +10.', rules: { facs: 3, set: 10, boost: { a: { skill: 2, noise: 0.15, bias: 0.1 }, b: { skill: 3, read: true, lam: 0.45, temp: 2, noise: 0.1 } } } },
  { key: 'neant', name: 'La Vente du Néant', stars: 5, seats: ['souverain', 'archiviste'], reward: 120, chest: 'abyssal', bg: 'salle-encheres-neant', power: { who: 'a', k: 'tribute', n: 2, name: 'Tribut du Néant', text: 'Chaque malédiction que tu prends donne 2 points à la Souveraine.' }, rule: 'Malédictions doublées : de −2 à −10.', rules: { curses: [2, 4, 6, 8, 10], boost: { a: { skill: 3, lam: 0.35, temp: 1.5, noise: 0.1 }, b: { skill: 2, noise: 0.15, bias: 0.1 } } } },
];
// v492 : un haut fait par vente (payé une fois, en plus de la victoire)
const curses = (st) => st.won.p.filter((l) => l.v < 0).length;
const setsOf = (st) => scoreOf(st, 'p').sets;
export const FEATS = {
  etal: { text: 'Gagne sans prendre de malédiction.', ok: (st) => !curses(st) },
  reliques: { text: 'Gagne avec une famille de trois.', ok: (st) => setsOf(st) >= 1 },
  nuit: { text: 'Gagne avec 25 points ou plus.', ok: (st) => st.final.scores.p >= 25 },
  grande: { text: 'Gagne sans prendre de malédiction.', ok: (st) => !curses(st) },
  maudite: { text: 'Gagne en prenant une malédiction au plus.', ok: (st) => curses(st) <= 1 },
  tresors: { text: 'Gagne avec 35 points ou plus.', ok: (st) => st.final.scores.p >= 35 },
  lignees: { text: 'Gagne avec 30 points ou plus.', ok: (st) => st.final.scores.p >= 30 },
  neant: { text: 'Gagne sans prendre de malédiction.', ok: (st) => !curses(st) },
};
export const featOk = (st) => st.over === 'won' && !!FEATS[st.table]?.ok(st);
export const FEAT_SHARDS = 60;
export const FEATS_TITLE = 'Commissaire de l’Abîme';
export const LAST_TITLE = 'Acquéreur du Néant';
export const TABLE = Object.fromEntries(TABLES.map((t) => [t.key, t]));
export const tableBg = (key) => `assets/sceaux/${TABLE[key]?.bg || 'salle-encheres'}.webp`; /* v494 : décor peint propre à la salle */
export const tableUnlocked = (s, i) => i === 0 || !!(s.settings?.dev && s.devGames) || !!s.encheres?.beaten?.[TABLES[i - 1].key];
export const ENCHERES_REWARD = { firstWin: 100, daily: 40, dailyPaid: 5, afterCap: 5, xp: 10 };
export const ENCHERES_TITLE = 'Favori de Mammon';
export const dailyTable = (day, unlocked) => TABLES[hash(`encheres:${day}`) % Math.max(1, Math.min(unlocked, TABLES.length))].key;

// Rareté de l'illustration selon la valeur du lot (pour l'écran seulement)
const RAR_OF = (v) => (v <= 2 ? 'C' : v <= 4 ? 'PC' : v <= 6 ? 'R' : v <= 8 ? 'HR' : v === 9 ? 'M' : 'S');
export const setBonus = (st) => st.setBonus || SET_BONUS;

export function newGame(cat, { table, seed = Date.now(), daily = false }) {
  const T = TABLE[table];
  if (!T) throw new Error('Table inconnue.');
  const r = mulberry(seed), RU = T.rules || {};
  const CV = RU.creatures || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], KV = RU.curses || [1, 2, 3, 4, 5];
  const facs = FACTION_ORDER.slice();
  for (let i = facs.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [facs[i], facs[j]] = [facs[j], facs[i]]; }
  // répartition des créatures entre les factions (par défaut 3, 3, 2, 2 pour 10 : deux familles de trois possibles)
  const nf = RU.facs || 4, per = Array.from({ length: nf }, (_, k) => Math.floor(CV.length / nf) + (k < CV.length % nf ? 1 : 0));
  const fpat = per.flatMap((n, k) => Array(n).fill(facs[k]));
  for (let i = fpat.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [fpat[i], fpat[j]] = [fpat[j], fpat[i]]; }
  const used = new Set();
  const lots = [];
  for (const [n, v] of CV.entries()) {
    const f = fpat[n];
    let id = null;
    const pool = (cat?.byFaction?.[f] || []).filter((c) => !used.has(c.id));
    const fit = pool.filter((c) => c.rarity === RAR_OF(v));
    const list = fit.length ? fit : pool;
    if (list.length) { id = list[Math.floor(r() * list.length)].id; used.add(id); }
    lots.push({ v, f, id });
  }
  for (const v of KV) lots.push({ v: -v, f: null, id: null });
  for (let i = lots.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [lots[i], lots[j]] = [lots[j], lots[i]]; }
  const all = () => Array.from({ length: OFFERS }, (_, k) => k + 1);
  return {
    v: 1, table, seed, daily, seats: { a: T.seats[0], b: T.seats[1] }, setBonus: RU.set || SET_BONUS,
    lots, i: 0, pot: [], offers: { p: all(), a: all(), b: all() }, won: { p: [], a: [], b: [] },
    log: [], over: null, final: null,
  };
}

// v492 : dans les ventes 5 à 8, les enchérisseurs jouent plus fin (rules.boost : réglages ajoutés à leur profil)
export const bidderOf = (st, who) => (who === 'p' ? null : { ...BIDDERS[st.seats[who]], ...(TABLE[st.table]?.rules?.boost?.[who] || {}) });
export const potValue = (st) => [...st.pot, st.lots[st.i]].filter(Boolean).reduce((a, l) => a + l.v, 0);
// Score : valeurs des lots + 5 par famille de trois créatures d'une même faction
export function scoreOf(st, who) {
  const lots = st.won[who];
  const n = {};
  lots.forEach((l) => { if (l.f) n[l.f] = (n[l.f] || 0) + 1; });
  const sets = Object.values(n).reduce((a, k) => a + Math.floor(k / 3), 0);
  const pow = powBonus(st, who, sets);
  return { lots: lots.reduce((a, l) => a + l.v, 0), sets, pow, total: lots.reduce((a, l) => a + l.v, 0) + sets * setBonus(st) + pow };
}
// v752 : pouvoir annoncé d'un enchérisseur des ventes 5 à 8 (TABLES[].power, la même règle pour tous, affichée avant la vente)
export const powerOf = (st) => TABLE[st.table]?.power || null;
function powBonus(st, who, sets) {
  const P = powerOf(st);
  if (!P || P.who !== who) return 0;
  if (P.k === 'halfcurse') return st.won[who].filter((l) => l.v < 0).reduce((a, l) => a + Math.ceil(-l.v / 2), 0); /* v754 : arrondi en sa faveur, comme le dit le texte */
  if (P.k === 'setplus') return sets * P.n;
  if (P.k === 'echo') return Math.max(0, ...st.won[who].map((l) => l.v));
  if (P.k === 'tribute') return st.won.p.filter((l) => l.v < 0).length * P.n;
  return 0;
}

// Une manche : bids = { p, a, b } (offrandes). Renvoie le détail pour l'écran.
export function resolve(st, bids) {
  if (st.over) throw new Error('La vente est terminée.');
  for (const x of SEATS) if (!st.offers[x].includes(bids[x])) throw new Error('Offrande déjà jouée.');
  const lot = st.lots[st.i], pile = [...st.pot, lot], value = pile.reduce((a, l) => a + l.v, 0);
  SEATS.forEach((x) => { st.offers[x] = st.offers[x].filter((o) => o !== bids[x]); });
  const count = {};
  SEATS.forEach((x) => { count[bids[x]] = (count[bids[x]] || 0) + 1; });
  const live = SEATS.filter((x) => count[bids[x]] === 1);
  let taker = null;
  if (live.length) taker = live.reduce((best, x) => (best == null ? x : value > 0 ? (bids[x] > bids[best] ? x : best) : (bids[x] < bids[best] ? x : best)), null);
  const ev = { i: st.i, lot, pile, value, bids: { ...bids }, cancelled: SEATS.filter((x) => count[bids[x]] > 1), taker };
  if (taker) { st.won[taker].push(...pile); st.pot = []; } else st.pot = pile;
  st.log.push(ev); st.log = st.log.slice(-20);
  st.i++;
  if (st.i >= st.lots.length) finish(st);
  ev.over = st.over;
  return ev;
}
function finish(st) {
  const sc = Object.fromEntries(SEATS.map((x) => [x, scoreOf(st, x)]));
  // départage : le plus de créatures, puis la plus belle créature
  const key = (x) => [sc[x].total, st.won[x].filter((l) => l.v > 0).length, Math.max(0, ...st.won[x].map((l) => l.v))];
  const order = SEATS.slice().sort((x, y) => { const a = key(x), b = key(y); for (let k = 0; k < 3; k++) if (a[k] !== b[k]) return b[k] - a[k]; return 0; });
  st.final = { scores: Object.fromEntries(SEATS.map((x) => [x, sc[x].total])), order, lost: st.pot.length ? st.pot : [] };
  st.over = order[0] === 'p' ? 'won' : 'lost';
}

// ——— Intelligence des enchérisseurs ———
const sorted = (a) => a.slice().sort((x, y) => x - y);
// Valeur ressentie du lot pour `who` : la pile, plus la famille de trois en vue (et celle qu'on prive un adversaire)
function feltValue(st, who, prof) {
  const pile = [...st.pot, st.lots[st.i]];
  let v = pile.reduce((a, l) => a + l.v, 0);
  const P = powerOf(st), own = P && P.who === who;
  if (v < 0 && own && P.k === 'halfcurse') v = Math.ceil(v / 2);
  const sb = setBonus(st) + (own && P.k === 'setplus' ? P.n : 0);
  if (v > 0) pile.filter((l) => l.f).forEach((l) => {
    const mine = st.won[who].filter((x) => x.f === l.f).length % 3;
    if (mine === 2) v += sb * prof.sets; else if (mine === 1) v += 1.2 * prof.sets * setBonus(st) / SET_BONUS;
    if (prof.skill >= 2) SEATS.filter((x) => x !== who).forEach((x) => { if (st.won[x].filter((y) => y.f === l.f).length % 3 === 2) v += 2; });
  });
  return v;
}
// Mise « au feeling » : la place du lot parmi les lots restants donne la place de l'offrande parmi les siennes
function instinct(st, who, prof, rnd, v = feltValue(st, who, prof)) {
  const mine = sorted(st.offers[who]);
  if (mine.length === 1) return mine[0];
  const rest = st.lots.slice(st.i).map((l) => Math.abs(l.v));
  const mag = Math.abs(v);
  let q = rest.filter((x) => x < mag).length / Math.max(1, rest.length - 1);
  if (prof.skill < 2) q = Math.min(1, mag / 10);
  q = q + prof.bias + (rnd() - 0.5) * 2 * prof.noise;
  if (prof.bluff && rnd() < prof.bluff) q = rnd() < 0.5 ? 0 : 1;
  q = Math.max(0, Math.min(1, q));
  return mine[Math.round(q * (mine.length - 1))];
}
const NAIVE = { skill: 2, noise: 0.2, bias: 0, sets: 1, bluff: 0 };
// v463 : les enchérisseurs habiles lisent les autres : à partir des ventes passées, ils estiment si un adversaire
// mise plus (ou moins) que la valeur des lots, et à quel point il est imprévisible
function readOf(st, x) {
  const seen = st.log.filter((ev) => ev.bids && ev.bids[x] != null);
  if (seen.length < 2) return NAIVE;
  const d = seen.map((ev) => ev.bids[x] / 15 - Math.min(1, Math.abs(ev.value) / 10));
  const m = d.reduce((a, b) => a + b, 0) / d.length;
  const sd = Math.sqrt(d.reduce((a, b) => a + (b - m) * (b - m), 0) / d.length);
  return { skill: 1, noise: Math.min(0.6, 0.1 + sd), bias: Math.max(-0.4, Math.min(0.4, m)), sets: 1, bluff: 0 };
}
export function aiBid(st, who, prof = bidderOf(st, who), rnd = Math.random) {
  if (prof.skill <= 2) return instinct(st, who, prof, rnd);
  // 3-4 : on imagine les offrandes des deux autres (au feeling, sur leurs offrandes restantes, connues de tous)
  const others = SEATS.filter((x) => x !== who), v = feltValue(st, who, prof);
  const mine = sorted(st.offers[who]);
  const restAbs = st.lots.slice(st.i + 1).reduce((a, l) => a + Math.abs(l.v), 0);
  const myRest = mine.reduce((a, b) => a + b, 0) || 1;
  const N = prof.skill >= 4 ? 60 : 30;
  const reads = others.map((x) => (prof.read ? readOf(st, x) : NAIVE));
  const sims = Array.from({ length: N }, () => others.map((x, k) => instinct(st, x, reads[k], rnd)));
  const us = mine.map((c) => {
    let gain = 0;
    for (const [b1, b2] of sims) {
      const bids = [c, b1, b2], live = bids.filter((x) => bids.filter((y) => y === x).length === 1);
      if (!live.length) continue;
      const tb = v > 0 ? Math.max(...live) : Math.min(...live);
      if (tb === c) gain += v;
    }
    // ce qu'une offrande coûte pour la suite : sa part de « pouvoir d'achat » sur les lots qui restent
    return gain / N - (prof.lam ?? 0.35) * c * (restAbs / myRest);
  });
  // choix tiré parmi les meilleures (température) : deux enchérisseurs qui pensent pareil ne s'annulent pas toujours
  const T = prof.temp ?? 0.8, m = Math.max(...us), w = us.map((u) => dexp((u - m) / T)); /* v540 : même résultat partout (le serveur de partie rejoue la vente) */
  let r = rnd() * w.reduce((a, b) => a + b, 0), best = mine[mine.length - 1];
  for (let k = 0; k < mine.length; k++) { r -= w[k]; if (r <= 0) { best = mine[k]; break; } }
  if (prof.bluff && rnd() < prof.bluff) return instinct(st, who, prof, rnd);
  return best;
}
// Offrandes des deux enchérisseurs pour la manche en cours
// Offrandes des deux enchérisseurs pour la manche en cours
export const aiBids = (st, rnd = Math.random) => ({ a: aiBid(st, 'a', bidderOf(st, 'a'), rnd), b: aiBid(st, 'b', bidderOf(st, 'b'), rnd) });
