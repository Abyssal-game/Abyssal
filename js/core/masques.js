// v425 : La Cour des Masques, un jeu de bluff à trois (toi et deux courtisans masqués).
// 42 cartes, 6 par faction ; 14 en main chacun. À ton tour, tu donnes une carte face cachée à un courtisan en annonçant
// sa faction (tu peux mentir). Celui qui la reçoit dit « Vrai » ou « Mensonge » : s'il a raison, celui qui l'a donnée la
// garde devant lui ; sinon, c'est lui qui la garde. Il peut aussi la regarder et la passer à celui qui ne l'a pas encore vue,
// avec une nouvelle annonce. Celui qui garde la carte joue ensuite. Le premier qui a 4 cartes d'une même faction devant lui
// perd (ou celui qui doit jouer sans carte en main). Sceau de vérité : une fois par partie, tu peux regarder avant de répondre.
// Moteur pur (aucun DOM) : l'état est un objet simple, sauvegardé tel quel dans s.masques.cur.
import { FACTION_ORDER } from '../config.js';

export const FACTIONS = FACTION_ORDER;
export const PER_FACTION = 6;
export const HAND_SIZE = 14;
export const LOSE_AT = 4;
export const SEATS = ['p', 'a', 'b'];

function hash(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Courtisans : les arbitres des Sceaux, masqués. lie = part de mensonges ; skill 1 à 4 (compte des cartes, mémoire des
// menteurs, prudence) ; pass = envie de regarder et passer quand il hésite ; tell = le « tic » qui trahit parfois un
// mensonge (lie : chance de le montrer en mentant, truth : chance de le montrer en disant vrai, pour brouiller les pistes).
export const COURTIERS = {
  initie: { name: 'Ilda', title: 'l’Initiée', lie: 0.2, skill: 1, pass: 0.15, tell: { lie: 0.65, truth: 0.08, text: 'rougit sous son masque' },
    hint: 'Ment rarement… et rougit quand elle le fait.', hello: 'Un bal masqué ! Je n’ai jamais su mentir, tu sais.', beaten: 'Oh non… j’ai encore tout cru.', gloat: 'J’ai gagné en disant la vérité ? C’est permis ?' },
  collectionneur: { name: 'Maître Orvel', title: 'le Collectionneur', lie: 0.45, skill: 1, pass: 0.3, tell: { lie: 0.45, truth: 0.12, text: 'ajuste son monocle' },
    hint: 'Ment une fois sur deux ; son monocle le trahit souvent.', hello: 'Chaque carte que je donne est une pièce de collection. Ou pas.', beaten: 'Ma collection de cartes refusées est complète. Hélas.', gloat: 'Une estimation parfaite, comme toujours.' },
  stratege: { name: 'Sœur Vesna', title: 'la Stratège', lie: 0.35, skill: 2, pass: 0.35, tell: { lie: 0.35, truth: 0.1, text: 'serre son chapelet' },
    hint: 'Ment peu, mais retient qui t’a menti.', hello: 'La vérité est une prière. Le mensonge aussi, parfois.', beaten: 'La lumière m’a trompée. Ou c’était toi.', gloat: 'Tu as menti trois fois. Je comptais.' },
  maitre: { name: 'Le Maître des Sceaux', title: 'arbitre des règles', lie: 0.5, skill: 2, pass: 0.25, tell: { lie: 0.3, truth: 0.15, text: 'tapote la table' },
    hint: 'Ni menteur ni honnête : il joue les chiffres.', hello: 'Les règles sont simples. Les joueurs, jamais.', beaten: 'Une règle m’a échappé. La tienne.', gloat: 'Le compte était bon. Pour moi.' },
  echo: { name: 'L’Écho de l’Abîme', title: 'veilleur des profondeurs', lie: 0.5, skill: 3, pass: 0.45, tell: { lie: 0.2, truth: 0.35, text: 'sourit derrière son masque' },
    hint: 'Son sourire ment plus souvent que lui.', hello: 'Je répète ce que tu dis. Mais pas toujours ce que tu penses.', beaten: '… l’écho se tait.', gloat: 'Tu t’es entendu mentir ? Moi, oui.' },
  banquier: { name: 'Mammon', title: 'le Banquier des Enfers', lie: 0.72, skill: 3, pass: 0.3, tell: { lie: 0.15, truth: 0.15, text: 'fait tinter une pièce' },
    hint: 'Ment presque toujours. Presque.', hello: 'Ici, la vérité coûte cher. Je la vends rarement.', beaten: 'Une dette. Je la noterai dans mon grand livre.', gloat: 'Intérêts encaissés. Merci de ta confiance.' },
  archiviste: { name: 'L’Archiviste', title: 'mémoire d’engrenages', lie: 0.45, skill: 4, pass: 0.35, tell: { lie: 0, truth: 0, text: 'cliquette' },
    hint: 'Compte chaque carte. Ne montre jamais rien.', hello: 'J’ai catalogué toutes les cartes de ce jeu. Toutes.', beaten: 'Erreur… à… réindexer.', gloat: 'Probabilité de ta défaite : confirmée.' },
  souverain: { name: 'La Souveraine du Néant', title: 'avant le premier Sceau', lie: 0.6, skill: 4, pass: 0.3, tell: { lie: 0.1, truth: 0.2, text: 'laisse ses yeux s’éteindre' },
    hint: 'Ment plus qu’elle ne dit vrai, et s’entend avec l’Archiviste.', hello: 'Ôte ton masque, petite flamme. Ah, c’est ton visage.', beaten: 'Alors… le Néant peut se tromper.', gloat: 'Retourne au silence. Avec tes cartes.' },
};
export const COURTIER_KEYS = Object.keys(COURTIERS);

// Tables : deux courtisans chacune, de la plus douce à la plus redoutable. gang : les deux courtisans s'en prennent à toi.
// Réglage (tools : session, pilote automatique de niveau 3 à la place du joueur) visé : ≈ 80 / 65 / 50 / 38 % de victoires.
export const TABLES = [
  { key: 'antichambre', name: 'L’Antichambre', stars: 1, seats: ['initie', 'collectionneur'], reward: 25, chest: 'bois', room: 'salle' },
  { key: 'miroirs', name: 'La Galerie des miroirs', stars: 2, seats: ['stratege', 'maitre'], reward: 35, chest: 'fer', room: 'salle-celeste', gang: 0.35 },
  { key: 'pourpre', name: 'Le Salon pourpre', stars: 3, seats: ['echo', 'banquier'], reward: 50, chest: 'or', room: 'salle-necrotique', gang: 1.3 },
  { key: 'trone', name: 'Le Trône sans visage', stars: 4, seats: ['archiviste', 'souverain'], reward: 70, chest: 'abyssal', room: 'salle-abyssal', gang: 3 },
];
export const TABLE = Object.fromEntries(TABLES.map((t) => [t.key, t]));
export const tableUnlocked = (s, i) => i === 0 || !!s.masques?.beaten?.[TABLES[i - 1].key];
export const MASQUES_REWARD = { firstWin: 100, daily: 40, dailyPaid: 5, afterCap: 5, xp: 10 };
export const MASQUES_TITLE = 'Maître des Masques';
// Défi du jour : une table déjà ouverte, la même donne pour tous le même jour
export const dailyTable = (day, unlocked) => TABLES[hash(`masques:${day}`) % Math.max(1, Math.min(unlocked, TABLES.length))].key;

// Nouvelle partie. cat (facultatif) donne une illustration de la bonne faction à chaque carte (seulement pour l'écran).
export function newGame(cat, { table, seed = Date.now(), daily = false }) {
  const T = TABLE[table];
  if (!T) throw new Error('Table inconnue.');
  const r = mulberry(seed);
  const deck = [];
  FACTIONS.forEach((f) => {
    const pool = (cat?.byFaction?.[f] || []).map((c) => c.id);
    const ids = pool.slice();
    for (let i = 0; i < PER_FACTION; i++) {
      let id = null;
      if (ids.length) id = ids.splice(Math.floor(r() * ids.length), 1)[0];
      deck.push({ f, id });
    }
  });
  const order = deck.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const hands = { p: [], a: [], b: [] };
  order.forEach((c, i) => hands[SEATS[i % 3]].push(c));
  return {
    v: 1, table, seed, daily, seats: { a: T.seats[0], b: T.seats[1] }, gang: T.gang || 0,
    deck, hands, front: { p: [], a: [], b: [] },
    turn: SEATS[Math.floor(r() * 3)], pending: null,
    seals: { p: 1 }, claims: { p: { n: 0, lies: 0 }, a: { n: 0, lies: 0 }, b: { n: 0, lies: 0 } },
    log: [], rounds: 0, over: null, loser: null, why: null,
  };
}

export const courtierOf = (st, who) => (who === 'p' ? null : COURTIERS[st.seats[who]]);
export const frontCount = (st, who, f) => st.front[who].filter((c) => st.deck[c].f === f).length;
export const frontCounts = (st, who) => Object.fromEntries(FACTIONS.map((f) => [f, frontCount(st, who, f)]));
export const danger = (st, who) => Math.max(0, ...FACTIONS.map((f) => frontCount(st, who, f)));
export const handCounts = (st, who) => Object.fromEntries(FACTIONS.map((f) => [f, st.hands[who].filter((c) => st.deck[c].f === f).length]));
// Joueurs à qui la carte en cours peut encore être passée (ceux qui ne l'ont pas vue)
export const passTargets = (st) => (st.pending ? SEATS.filter((x) => x !== st.pending.to && !st.pending.seen.includes(x)) : []);

// Donner une carte (index dans le paquet) à un joueur en annonçant une faction
export function give(st, who, card, to, claim) {
  if (st.over) throw new Error('La partie est terminée.');
  if (st.pending || st.turn !== who) throw new Error('Ce n’est pas ton tour.');
  if (to === who || !SEATS.includes(to)) throw new Error('Choisis à qui donner la carte.');
  if (!FACTIONS.includes(claim)) throw new Error('Choisis une faction à annoncer.');
  const k = st.hands[who].indexOf(card);
  if (k < 0) throw new Error('Cette carte n’est pas dans ta main.');
  st.hands[who].splice(k, 1);
  const tell = tellFor(st, who, st.deck[card].f !== claim);
  st.pending = { card, from: who, to, claim, seen: [who], chain: [{ from: who, to, claim }], tell, peeked: false };
  return st.pending;
}
// Regarder la carte reçue, puis la passer à celui qui ne l'a pas vue, avec une nouvelle annonce
export function pass(st, who, to, claim) {
  const p = st.pending;
  if (!p || p.to !== who) throw new Error('Tu n’as pas de carte à passer.');
  if (!passTargets(st).includes(to)) throw new Error('Tout le monde a déjà vu cette carte.');
  if (!FACTIONS.includes(claim)) throw new Error('Choisis une faction à annoncer.');
  p.seen.push(who); p.from = who; p.to = to; p.claim = claim; p.peeked = false; p.looked = null;
  p.chain.push({ from: who, to, claim, pass: true });
  p.tell = tellFor(st, who, st.deck[p.card].f !== claim);
  return p;
}
// Regarder la carte pour la passer : une fois regardée (hors Sceau de vérité), on ne peut plus répondre, il faut la passer
export function look(st, who) {
  const p = st.pending;
  if (!p || p.to !== who) throw new Error('Aucune carte à regarder.');
  if (!passTargets(st).length) throw new Error('Tout le monde a déjà vu cette carte : réponds.');
  p.looked = who;
  return st.deck[p.card].f;
}
// Sceau de vérité : le joueur regarde la carte avant de répondre (une fois par partie)
export function peek(st) {
  const p = st.pending;
  if (!p || p.to !== 'p') throw new Error('Aucune carte à regarder.');
  if (p.peeked || p.seen.includes('p')) return st.deck[p.card].f;
  if (!(st.seals.p > 0)) throw new Error('Ton Sceau de vérité a déjà servi.');
  st.seals.p--; p.peeked = true;
  return st.deck[p.card].f;
}
// Répondre : sayTrue = « Vrai », sinon « Mensonge »
export function answer(st, who, sayTrue) {
  const p = st.pending;
  if (!p || p.to !== who) throw new Error('Aucune carte à juger.');
  if (p.looked === who) throw new Error('Tu as regardé la carte : passe-la.');
  const f = st.deck[p.card].f, truth = f === p.claim, correct = !!sayTrue === truth;
  const taker = correct ? p.from : who;
  st.front[taker].push(p.card);
  // la carte est retournée : chacun voit qui avait menti dans toute la chaîne d'annonces
  p.chain.forEach((c) => { st.claims[c.from].n++; if (c.claim !== f) st.claims[c.from].lies++; });
  const ev = { card: p.card, f, from: p.from, to: who, claim: p.claim, sayTrue: !!sayTrue, truth, correct, taker, chain: p.chain, peeked: p.peeked };
  st.log.push(ev); st.log = st.log.slice(-40);
  st.pending = null; st.rounds++;
  st.turn = taker;
  if (frontCount(st, taker, f) >= LOSE_AT) { st.over = taker === 'p' ? 'lost' : 'won'; st.loser = taker; st.why = 'four'; }
  else if (!st.hands[taker].length) { st.over = taker === 'p' ? 'lost' : 'won'; st.loser = taker; st.why = 'empty'; }
  ev.over = st.over;
  return ev;
}

// Tic du courtisan : affiché parfois quand il ment (et parfois, pour brouiller, quand il dit vrai)
function tellFor(st, who, lying) {
  const C = courtierOf(st, who); if (!C) return false;
  const r = mulberry(hash(`tell:${st.seed}:${st.rounds}:${who}:${st.pending ? st.pending.chain.length : 0}`))();
  return r < (lying ? C.tell.lie : C.tell.truth);
}

// ——— Intelligence des courtisans ———
// Ce que le joueur `who` sait : sa main, toutes les cartes posées face visible, la carte qu'il a vue en la passant.
function unknownCounts(st, who) {
  const u = Object.fromEntries(FACTIONS.map((f) => [f, PER_FACTION]));
  st.hands[who].forEach((c) => u[st.deck[c].f]--);
  SEATS.forEach((x) => st.front[x].forEach((c) => u[st.deck[c].f]--));
  return u;
}
// Probabilité (vue par `who`) que l'annonce en cours dise vrai
export function truthChance(st, who, prof) {
  const p = st.pending, u = unknownCounts(st, who), tot = Object.values(u).reduce((a, b) => a + b, 0) || 1;
  const uc = u[p.claim];
  if (prof.skill >= 2 && uc <= 0) return 0; /* plus aucune carte de cette faction ailleurs : c'est un mensonge */
  const pc = prof.skill >= 2 ? Math.max(0.01, uc / tot) : 1 / 7;
  const c = st.claims[p.from], h = prof.skill >= 2 ? 1 - (c.lies + 1) / (c.n + 2) : 0.5;
  // un menteur annonce volontiers une faction dont la cible a déjà plusieurs cartes devant elle
  const q = (frontCount(st, who, p.claim) >= 2 ? 2.2 : 1) / 6;
  const pt = (pc * h) / (pc * h + (1 - pc) * (1 - h) * q);
  return Math.min(0.97, Math.max(0.03, pt));
}
const pickW = (items, rnd) => { const t = items.reduce((a, x) => a + Math.max(0, x.w), 0); if (t <= 0) return items[0]; let r = rnd() * t; for (const x of items) { r -= Math.max(0, x.w); if (r <= 0) return x; } return items.at(-1); };

// Profil de jeu d'un siège (le joueur simulé utilise aussi ce moteur, avec un profil donné)
export const profileOf = (st, who) => COURTIERS[st.seats[who]];

// Décision quand `who` reçoit une carte : { act: 'answer', sayTrue } ou { act: 'pass', to, claim }
export function aiReceive(st, who, prof = profileOf(st, who), rnd = Math.random) {
  const p = st.pending;
  const pt = truthChance(st, who, prof);
  const noise = [0, 0.32, 0.2, 0.1, 0.04][prof.skill] || 0.1;
  const targets = passTargets(st);
  // hésitation : regarder et passer (il voit la carte, puis l'annonce au dernier joueur)
  if (targets.length && Math.abs(pt - 0.5) < 0.22 && rnd() < prof.pass) {
    const to = targets[0];
    return { act: 'pass', to, claim: aiClaim(st, who, p.card, to, prof, rnd) };
  }
  let sayTrue = pt >= 0.5;
  if (prof.skill >= 2) {
    // prudence : se tromper avec 3 cartes de cette faction devant soi fait perdre
    const u = unknownCounts(st, who), fc = frontCounts(st, who), others = FACTIONS.filter((f) => f !== p.claim);
    const ot = others.reduce((a, f) => a + Math.max(0, u[f]), 0) || 1;
    const loseIfTrueSaid = (1 - pt) * others.reduce((a, f) => a + (fc[f] >= LOSE_AT - 1 ? Math.max(0, u[f]) / ot : 0), 0);
    const loseIfLieSaid = pt * (fc[p.claim] >= LOSE_AT - 1 ? 1 : 0);
    const sTrue = pt - 3 * loseIfTrueSaid, sLie = (1 - pt) - 3 * loseIfLieSaid;
    sayTrue = sTrue >= sLie;
  }
  if (rnd() < noise) sayTrue = !sayTrue;
  return { act: 'answer', sayTrue };
}
// Annonce choisie pour la carte `card` donnée à `to`
function aiClaim(st, who, card, to, prof, rnd) {
  const f = st.deck[card].f;
  let lieRate = prof.lie;
  const tf = frontCount(st, to, f);
  if (prof.skill >= 3 && tf >= LOSE_AT - 1) lieRate = Math.min(0.9, lieRate + 0.2); /* la cible en a 3 : dire vrai lui ferait dire « mensonge » */
  if (rnd() >= lieRate) return f;
  const opts = FACTIONS.filter((x) => x !== f).map((x) => ({ x, w: 1 + 1.5 * frontCount(st, to, x) * (prof.skill >= 2 ? 1 : 0.3) }));
  return pickW(opts, rnd).x;
}
// Tour de `who` : quelle carte donner, à qui, avec quelle annonce
export function aiGive(st, who, prof = profileOf(st, who), rnd = Math.random) {
  const others = SEATS.filter((x) => x !== who);
  const gang = who !== 'p' && st.gang ? st.gang : 0;
  const tw = others.map((x) => ({ x, w: 1 + (prof.skill >= 2 ? 1.2 * danger(st, x) : 0.3 * danger(st, x)) + (x === 'p' ? gang * 4 : 0) }));
  const to = pickW(tw, rnd).x;
  const mine = frontCounts(st, who), theirs = frontCounts(st, to);
  const facs = [...new Set(st.hands[who].map((c) => st.deck[c].f))];
  const fw = facs.map((f) => {
    let w = 1 + (prof.skill >= 2 ? 1.4 : 0.4) * theirs[f];
    if (mine[f] >= LOSE_AT - 1) w *= prof.skill >= 2 ? 0.05 : 0.5; /* si la cible voit juste, la carte revient devant moi */
    else if (mine[f] === LOSE_AT - 2 && prof.skill >= 3) w *= 0.5;
    return { f, w };
  });
  const f = pickW(fw, rnd).f;
  const card = st.hands[who].find((c) => st.deck[c].f === f);
  return { card, to, claim: aiClaim(st, who, card, to, prof, rnd) };
}
// Joue tout ce qui revient aux courtisans jusqu'à ce que le joueur doive agir (ou fin). Renvoie les étapes, pour l'écran.
export function aiStep(st, rnd = Math.random) {
  if (st.over) return null;
  const p = st.pending;
  if (p && p.to !== 'p') {
    const d = aiReceive(st, p.to, profileOf(st, p.to), rnd);
    if (d.act === 'pass') { const by = p.to; pass(st, by, d.to, d.claim); return { kind: 'pass', by, to: d.to, claim: d.claim, tell: st.pending.tell }; }
    const by = p.to, ev = answer(st, by, d.sayTrue); return { kind: 'answer', by, ev };
  }
  if (!p && st.turn !== 'p') {
    const by = st.turn, d = aiGive(st, by, profileOf(st, by), rnd);
    give(st, by, d.card, d.to, d.claim); return { kind: 'give', by, to: d.to, claim: d.claim, tell: st.pending.tell };
  }
  return null;
}
