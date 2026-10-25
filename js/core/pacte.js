// v449 : Le Pacte — jeu de « tenter sa chance » à deux (toi contre un arbitre de l'Abysse).
// Le paquet : 49 cartes (7 factions × valeurs 1 à 7) et 9 cartes spéciales (3 Sceaux, 3 Gardiens, 3 Offrandes).
// À ton tour, tu tires des cartes une à une et tu les poses devant toi. Tu t'arrêtes quand tu veux : tu gagnes la somme
// des cartes posées. Mais si tu tires une faction déjà posée ce tour-ci, le pacte se brise : tu perds tout le tour.
// Sceau : protège d'une brisure (la carte en double est jetée). Gardien : arrêt forcé (tu encaisses tout de suite).
// Offrande : double la carte de faction suivante. Les 7 factions dans le même tour : +15 et le tour s'arrête.
// Le premier à 60 points gagne (tour complet : l'adversaire joue toujours le même nombre de tours que toi).
// Moteur pur (aucun DOM) : l'état est un objet simple, sauvegardé tel quel dans s.pacte.cur.
import { FACTION_ORDER } from '../config.js';

export const TARGET = 60;
export const SEVEN_BONUS = 15;
export const VALUES = 7;
export const SPECIALS = { sceau: 3, gardien: 3, offrande: 3 };
/* v557 : nouvelle carte du Pacte contre l'Abysse : le Présage (on voit la carte suivante avant de choisir). Les parties en ligne gardent le paquet d'origine (moteur SQL). */
export const ORACLES = 2;
/* v561 (idées choisies par le propriétaire) : la Malédiction (l'adversaire devra tirer une carte de plus à son prochain tour)
   et Défier le pacte (une fois par partie : une dernière carte, puis le tour compte double… ou tout est perdu). Contre l'Abysse seulement. */
export const CURSES = 2;

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

// Adversaires : les arbitres des Sceaux. Tous comparent le gain espéré au risque (cartes vues comptées) ;
// caution : poids du risque ; max : nombre de cartes au-delà duquel ils s'arrêtent (prudents) ; risk : goût du risque ;
// race : audace quand ils sont menés ; cool : prudence quand ils mènent ; noise : part de décisions au hasard.
export const RIVALS = {
  initie: { name: 'Ilda', caution: 2.5, max: 1.3, risk: 0, race: 0.1, cool: 0.6, noise: 0.15, hint: 'Très prudente : elle s’arrête presque toujours après une ou deux cartes.',
    hello: 'Un pacte ? Je signe… mais seulement un petit.', beaten: 'J’aurais dû tirer une carte de plus.', gloat: 'Petit à petit, j’ai gagné !' },
  collectionneur: { name: 'Maître Orvel', caution: 1.8, max: 1.9, risk: 0, race: 0.2, cool: 0.4, noise: 0.1, hint: 'Frileux : rarement plus de deux cartes, sauf quand tu le distances.',
    hello: 'Une carte de plus ? Ou une de trop… tout est là.', beaten: 'J’ai été trop sage, cette fois.', gloat: 'La sagesse paie toujours.' },
  maitre: { name: 'Le Maître des Sceaux', caution: 1, risk: 0, race: 0.5, cool: 0.2, noise: 0.04, hint: 'Compte les cartes déjà tirées, pèse chaque risque, se presse quand tu approches du but.',
    hello: 'Chaque pacte a un prix. Je connais toujours le prix.', beaten: 'Le hasard… a mal compté.', gloat: 'Le compte était juste.' },
  banquier: { name: 'Mammon', caution: 0.9, risk: 0.12, race: 0.8, cool: 0.1, noise: 0.02, power: { k: 'house', n: 2, min: 15, name: 'La part de la maison', text: 'Quand tu encaisses 15 points ou plus en un tour, Mammon en prend 2 pour lui.' }, hint: 'Calcule tout et ose davantage quand il est mené.',
    hello: 'Signe ici, et ici. Les petites lignes ? Elles sont pour moi.', beaten: 'Un pacte rompu… à mes dépens ? Inadmissible.', gloat: 'La maison gagne toujours.' },
  // v492 : quatre nouveaux adversaires pour les salles 5 à 8
  stratege: { name: 'Sœur Vesna', caution: 1.1, risk: 0, race: 0.4, cool: 0.3, noise: 0.03, power: { k: 'prayer', n: 1, name: 'Prière', text: 'Une fois par partie, sa brisure est pardonnée, comme si elle avait un Sceau.' }, hint: 'Calcule chaque risque et ne se laisse jamais distancer.',
    hello: 'Sans Sceau, chaque carte est une prière. Prie bien.', beaten: 'J’ai prié… une carte trop tard.', gloat: 'La patience est une arme.' },
  echo: { name: 'L’Écho de l’Abîme', caution: 0.75, risk: 0.3, race: 0.6, cool: 0, noise: 0.08, power: { k: 'echo', every: 2, name: 'Résonance', text: 'Un tour sur deux, sa première carte de faction compte double.' }, hint: 'Audacieux : il tire plus que de raison, et ça lui réussit souvent.',
    hello: 'Encore une. Et encore une. Tu entends l’écho ?', beaten: '… l’écho se brise.', gloat: 'Tu as eu peur de tirer. Moi, jamais.' },
  archiviste: { name: 'L’Archiviste', caution: 0.95, risk: 0.05, race: 0.7, cool: 0.15, noise: 0.01, power: { k: 'archive', n: 0.85, name: 'Archives', text: 'Quand il brise le pacte, il garde quand même 85 % des points de son tour.' }, hint: 'Compte chaque carte sortie, sans jamais se tromper.',
    hello: 'J’ai noté chaque carte de ce paquet. Toutes.', beaten: 'Erreur… de calcul ? Impossible.', gloat: 'Le registre ne ment pas.' },
  souverain: { name: 'La Souveraine du Néant', caution: 0.85, risk: 0.1, race: 0.9, cool: 0.1, noise: 0, power: { k: 'void', n: 0.4, name: 'Le Néant', text: 'Chacune de tes brisures te coûte aussi 40 % des points que tu as déjà gagnés.' }, hint: 'Calcule tout et ose quand elle est menée.',
    hello: 'Signe. Ton nom finira dans le Néant, comme les autres.', beaten: 'Le Néant… a perdu un pacte ?', gloat: 'Retourne au silence.' },
};
export const TABLES = [
  { key: 'novice', name: 'Le Pacte du novice', stars: 1, rival: 'initie', reward: 25, chest: 'bois', bg: 'salle-pacte-novice' },
  { key: 'six', name: 'Le Pacte des six', stars: 2, rival: 'collectionneur', reward: 35, chest: 'fer', bg: 'salle-pacte-six' },
  { key: 'sceaux', name: 'Le Pacte des Sceaux', stars: 3, rival: 'maitre', reward: 50, chest: 'or', bg: 'salle-pacte-sceaux' },
  { key: 'mammon', name: 'Le Pacte de Mammon', stars: 4, rival: 'banquier', reward: 70, chest: 'abyssal', bg: 'salle-pacte-mammon', },
  // v492 : salles 5 à 8, chacune avec sa règle (rules : target, seven, sp = cartes spéciales du paquet)
  { key: 'cendres', name: 'Le Pacte des cendres', stars: 4, rival: 'stratege', reward: 80, chest: 'or', bg: 'salle-pacte-cendres', rule: 'Aucun Sceau dans le paquet : rien ne te protège d’une brisure.', rules: { sp: { sceau: 0, gardien: 3, offrande: 3 } } },
  { key: 'minuit', name: 'Le Pacte de minuit', stars: 5, rival: 'echo', reward: 90, chest: 'or', bg: 'salle-pacte-minuit', rule: 'Partie longue : 80 points. Les sept factions rapportent +25.', rules: { target: 80, seven: 25 } },
  { key: 'registre', name: 'Le Pacte du registre', stars: 5, rival: 'archiviste', reward: 100, chest: 'abyssal', bg: 'salle-pacte-registre', rule: 'Six Offrandes et un seul Gardien : les gros tours sont possibles… pour les deux.', rules: { sp: { sceau: 2, gardien: 1, offrande: 6 } } },
  { key: 'neant', name: 'Le Pacte du Néant', stars: 5, rival: 'souverain', reward: 120, chest: 'abyssal', bg: 'salle-pacte-neant', rule: '70 points, aucun Sceau, cinq Gardiens.', rules: { target: 70, sp: { sceau: 0, gardien: 5, offrande: 3 } } },
];
// v492 : un haut fait par salle (payé une fois, en plus de la victoire)
export const FEATS = {
  novice: { text: 'Gagne en 6 tours ou moins.', ok: (st) => st.turns.p <= 6 },
  six: { text: 'Gagne sans jamais briser le pacte.', ok: (st) => !st.stats.busts.p },
  sceaux: { text: 'Encaisse 20 points en un seul tour.', ok: (st) => st.stats.best.p >= 20 },
  mammon: { text: 'Gagne avec 15 points d’avance.', ok: (st) => st.final.scores.p - st.final.scores.a >= 15 },
  cendres: { text: 'Gagne en brisant le pacte une fois au plus.', ok: (st) => st.stats.busts.p <= 1 },
  minuit: { text: 'Encaisse 20 points en un seul tour.', ok: (st) => st.stats.best.p >= 20 },
  registre: { text: 'Encaisse 22 points en un seul tour.', ok: (st) => st.stats.best.p >= 22 },
  neant: { text: 'Gagne avec 10 points d’avance.', ok: (st) => st.final.scores.p - st.final.scores.a >= 10 },
};
export const featOk = (st) => st.over === 'won' && !!FEATS[st.table]?.ok(st);
export const FEAT_SHARDS = 60;
export const FEATS_TITLE = 'Maître du Pacte';
export const LAST_TITLE = 'Signataire du Néant';
export const TABLE = Object.fromEntries(TABLES.map((t) => [t.key, t]));
export const tgt = (st) => st.target || TARGET;
export const sevenOf = (st) => st.seven || SEVEN_BONUS;
export const tableBg = (key) => `assets/sceaux/${TABLE[key]?.bg || 'salle-pacte'}.webp`; /* v494 : décor peint propre à la salle */
export const tableUnlocked = (s, i) => i === 0 || !!s.pacte?.beaten?.[TABLES[i - 1].key];
export const PACTE_REWARD = { firstWin: 100, daily: 40, dailyPaid: 5, afterCap: 5, xp: 10 };
export const PACTE_TITLE = 'Signataire de l’Abîme';
export const dailyTable = (day, unlocked) => TABLES[hash(`pacte:${day}`) % Math.max(1, Math.min(unlocked, TABLES.length))].key;

// Rareté de l'illustration selon la valeur (pour l'écran seulement)
const RAR_OF = (v) => (v <= 2 ? 'C' : v === 3 ? 'PC' : v === 4 ? 'R' : v === 5 ? 'HR' : v === 6 ? 'M' : 'S');

function buildDeck(cat, r, sp = SPECIALS) {
  const deck = [];
  for (const f of FACTION_ORDER) {
    const pool = cat?.byFaction?.[f] || [];
    const used = new Set();
    for (let v = 1; v <= VALUES; v++) {
      const fit = pool.filter((c) => c.rarity === RAR_OF(v) && !used.has(c.id));
      const list = fit.length ? fit : pool.filter((c) => !used.has(c.id));
      const id = list.length ? list[Math.floor(r() * list.length)].id : null;
      if (id) used.add(id);
      deck.push({ f, v, id });
    }
  }
  for (const [k, n] of Object.entries(sp)) for (let i = 0; i < n; i++) deck.push({ sp: k });
  return shuffle(deck, r);
}

export function newGame(cat, { table, seed = Date.now(), daily = false }) {
  const T = TABLE[table];
  if (!T) throw new Error('Table inconnue.');
  const r = mulberry(seed), RU = T.rules || {};
  return { table, daily, seed, shuf: 0, rival: T.rival, target: RU.target || TARGET, seven: RU.seven || SEVEN_BONUS, deck: buildDeck(cat, r, { ...(RU.sp || SPECIALS), oracle: ORACLES, curse: CURSES }), discard: [], scores: { p: 0, a: 0 }, /* v750 : plus d’avance donnée aux adversaires (le propriétaire : « c’est juste de la triche ») */
    turn: 'p', row: [], sceaux: 0, offer: false, must: 0, curse: { p: 0, a: 0 }, dbl: { p: true, a: true }, dblOn: false, pw: {}, round: 1, turns: { p: 0, a: 0 }, last: null, over: null, final: null, stats: { busts: { p: 0, a: 0 }, best: { p: 0, a: 0 }, sevens: { p: 0, a: 0 } } };
}

// Valeur du tour en cours (cartes de faction posées, Offrandes comprises)
export const rowValue = (st) => st.row.reduce((n, c) => n + (c.f ? c.v * (c.x2 ? 2 : 1) : 0), 0);
export const rowFactions = (st) => new Set(st.row.filter((c) => c.f).map((c) => c.f));

function takeCard(st) {
  if (!st.deck.length) {
    // paquet vide : la défausse est mélangée (même graine pour tous : le défi du jour reste le même)
    st.shuf++;
    st.deck = shuffle(st.discard.splice(0), mulberry(st.seed + st.shuf * 7919));
  }
  return st.deck.pop();
}

// Chance que la prochaine carte brise le pacte (le Sceau n'est pas compté ici : il protège, la carte reste brisante)
/* v751 : pouvoir annoncé de l'adversaire (remplace l'avance de points cachée) */
export const powerOf = (st) => RIVALS[st.rival]?.power || null;
const isPow = (st, k) => powerOf(st)?.k === k;
export const debtOf = (st) => TABLE[st.table]?.rules?.debt || 0;
export function bustChance(st) {
  const fs = rowFactions(st);
  if (!fs.size) return 0;
  if (st.peek && st.deck.length) { const nx = st.deck[st.deck.length - 1]; return nx.f && fs.has(nx.f) ? 1 : 0; } /* v557 : Présage */
  const src = st.deck.length ? st.deck : st.discard;
  if (!src.length) return 0;
  return src.filter((c) => c.f && fs.has(c.f)).length / src.length;
}

function bank(st, who, why) {
  let v = (rowValue(st) + (why === 'seven' ? sevenOf(st) : 0)) * (st.dblOn ? 2 : 1);
  st.house = 0;
  if (who === 'p' && isPow(st, 'house') && v >= (powerOf(st).min || 0)) { const h = Math.min(powerOf(st).n, v); v -= h; st.scores.a += h; st.house = h; } /* Mammon : la part de la maison */
  st.scores[who] += v;
  st.stats.best[who] = Math.max(st.stats.best[who], v);
  if (why === 'seven') st.stats.sevens[who]++;
  return v;
}
function endTurn(st, who) {
  st.discard.push(...st.row.map(({ x2, ...c }) => c));
  st.row = []; st.sceaux = 0; st.offer = false; st.peek = false; st.dblOn = false; st.turns[who]++;
  if (who === 'a') {
    // fin du tour complet : quelqu'un a atteint le but ?
    if (st.scores.p >= tgt(st) || st.scores.a >= tgt(st)) {
      if (st.scores.p !== st.scores.a) {
        st.over = st.scores.p > st.scores.a ? 'won' : 'lost';
        st.final = { scores: { ...st.scores } };
        return;
      }
    }
    st.round++;
  }
  st.turn = who === 'p' ? 'a' : 'p';
  /* v561 : Malédiction reçue : la carte habituelle, plus une par Malédiction, avant de pouvoir s'arrêter */
  const nx = st.turn;
  if (st.curse?.[nx]) { st.must = 1 + st.curse[nx]; st.curse[nx] = 0; } else st.must = 0;
}

// Tire une carte pour le joueur dont c'est le tour. Renvoie l'événement pour l'écran.
export function draw(st) {
  if (st.over) throw new Error('La partie est terminée.');
  const who = st.turn;
  const c = takeCard(st);
  st.peek = false;
  if (st.must > 0) st.must--;
  const ev = { who, card: c, result: 'ok', gain: 0 };
  if (c.sp === 'sceau') { st.sceaux++; st.row.push(c); }
  else if (c.sp === 'oracle') { st.row.push(c); st.peek = st.deck.length > 0; }
  else if (c.sp === 'offrande') { st.offer = true; st.row.push(c); }
  else if (c.sp === 'curse') { st.row.push(c); const o = who === 'p' ? 'a' : 'p'; st.curse = st.curse || { p: 0, a: 0 }; st.curse[o] = (st.curse[o] || 0) + 1; ev.curse = o; }
  else if (c.sp === 'gardien') { st.row.push(c); ev.result = 'forced'; ev.gain = bank(st, who, 'forced'); if (st.house) ev.house = st.house; endTurn(st, who); }
  else {
    const fs = rowFactions(st);
    if (fs.has(c.f)) {
      if (st.sceaux === 0 && who === 'a' && isPow(st, 'prayer') && (st.pw.prayer || 0) < powerOf(st).n) {
        /* Vesna : la Prière pardonne sa brisure (une fois par partie) */
        st.pw.prayer = (st.pw.prayer || 0) + 1; ev.result = 'saved'; ev.prayer = true;
        st.discard.push(c); if (st.offer) st.offer = false;
      } else if (st.sceaux > 0) {
        st.sceaux--; ev.result = 'saved';
        const s = st.row.findIndex((x) => x.sp === 'sceau');
        if (s >= 0) st.discard.push(st.row.splice(s, 1)[0]);
        st.discard.push(c);
        if (st.offer) st.offer = false;
      } else {
        st.row.push(c); ev.result = 'bust'; ev.lost = rowValue(st) - c.v * (st.offer ? 2 : 1);
        /* v750 : la dette de Mammon, la même pour les deux joueurs : une brisure coûte aussi des points déjà gagnés */
        const debt = Math.min(debtOf(st), st.scores[who]); if (debt) { st.scores[who] -= debt; ev.debt = debt; }
        if (who === 'a' && isPow(st, 'archive')) { const k = Math.floor(ev.lost * powerOf(st).n); if (k) { st.scores.a += k; ev.kept = k; } } /* l'Archiviste garde la moitié de son tour */
        if (who === 'p' && isPow(st, 'void') && (st.pw.void || 0) < (powerOf(st).max || 99)) { st.pw.void = (st.pw.void || 0) + 1; const n = powerOf(st).n, d = Math.min(n < 1 ? Math.round(st.scores.p * n) : n, st.scores.p); if (d) { st.scores.p -= d; ev.voidCost = d; } } /* la Souveraine : ta première brisure coûte aussi */
        st.stats.busts[who]++; endTurn(st, who);
      }
    } else {
      let x2 = st.offer; st.offer = false;
      if (who === 'a' && isPow(st, 'echo') && !st.row.some((x) => x.f) && st.turns.a % (powerOf(st).every || 1) === 0) { x2 = true; ev.echo = true; } /* l'Écho : Résonance */
      st.row.push(x2 ? { ...c, x2: true } : c);
      ev.x2 = x2;
      if (rowFactions(st).size === FACTION_ORDER.length) { ev.result = 'seven'; ev.gain = bank(st, who, 'seven'); if (st.house) ev.house = st.house; endTurn(st, who); }
    }
  }
  st.last = ev;
  return ev;
}

// S'arrêter : on encaisse le tour
export function stop(st) {
  if (st.over) throw new Error('La partie est terminée.');
  const who = st.turn;
  if (!st.row.some((c) => c.f)) throw new Error('Tire au moins une carte de faction avant de t’arrêter.');
  if (st.must > 0) throw new Error('La Malédiction t’oblige à tirer encore une carte.');
  const gain = bank(st, who, 'stop');
  const house = st.house;
  endTurn(st, who);
  const ev = { who, result: 'stop', gain };
  if (house) ev.house = house;
  st.last = ev;
  return ev;
}

// v561 : Défier le pacte : une dernière carte ; si le pacte tient, le tour compte double (une fois par partie)
export const canDouble = (st) => !st.over && !!st.dbl?.[st.turn] && st.row.some((c) => c.f) && !st.peek && (st.must || 0) <= 1;
export function double(st) {
  if (!canDouble(st)) throw new Error('Défier le pacte n’est pas possible maintenant.');
  const who = st.turn;
  st.dbl[who] = false; st.dblOn = true;
  const ev = draw(st);
  ev.dbl = true;
  if (st.turn === who && !st.over && ev.result !== 'bust') { const s2 = stop(st); ev.result = 'stop'; ev.gain = s2.gain; if (s2.house) ev.house = s2.house; }
  st.dblOn = false;
  st.last = ev;
  return ev;
}

// Valeur moyenne d'une carte de faction non brisante encore dans le paquet
function meanSafe(st) {
  const fs = rowFactions(st), src = st.deck.length ? st.deck : st.discard;
  const ok = src.filter((c) => c.f && !fs.has(c.f));
  return ok.length ? ok.reduce((n, c) => n + c.v, 0) / ok.length : 3;
}
// L'adversaire continue-t-il ? (décision avant chaque tirage)
export function aiWants(st, rng = Math.random) {
  const R = RIVALS[st.rival], who = st.turn, me = st.scores[who], opp = st.scores[who === 'p' ? 'a' : 'p'], TARGET = tgt(st), SEVEN_BONUS = sevenOf(st);
  const v = rowValue(st), nf = st.row.filter((c) => c.f).length;
  if (!nf) return true;
  if (st.must > 0) return true; /* v561 : Malédiction : il doit tirer */
  /* v557 : Présage : la carte suivante est connue */
  const nx = st.peek && st.deck.length ? st.deck[st.deck.length - 1] : null;
  if (nx) return !(nx.f && rowFactions(st).has(nx.f) && !st.sceaux);
  // dernier tour : s'il faut rattraper, on tire tant qu'on n'a pas dépassé
  if (who === 'a' && st.scores.p >= TARGET && me + v <= st.scores.p) return true;
  if (me + v >= TARGET && me + v > opp) return false;
  if (rng() < R.noise) return rng() < 0.5;
  if (R.max && nf >= Math.floor(R.max + rng()) + (opp - me > 15 ? 1 : 0)) return false; // les prudents ne dépassent pas leur nombre de cartes
  // v463 : tous calculent (cartes déjà sorties comptées, Sceau, Offrande, sept factions) ; leur caractère change
  // le poids du risque (`caution`), l'audace quand ils sont menés (`race`) et la prudence quand ils mènent (`cool`)
  const p = bustChance(st), protect = st.sceaux > 0 ? 0.15 : 1;
  const behind = Math.max(0, opp - me) / TARGET, ahead = Math.max(0, me - opp) / TARGET;
  const oppNear = Math.max(0, opp - TARGET * 0.75) / (TARGET * 0.25); // l'autre approche du but : il faut se presser
  const gain = (1 - p) * meanSafe(st) * (st.offer ? 2 : 1) + (rowFactions(st).size === 6 ? (1 - p) * SEVEN_BONUS : 0);
  const pw = who === 'a' ? powerOf(st) : null, soft = pw?.k === 'prayer' && (st.pw?.prayer || 0) < pw.n ? 0.15 : pw?.k === 'archive' ? 1 - pw.n : 1;
  const loss = p * (v + Math.min(debtOf(st), me)) * protect * soft;
  return gain * (1 + R.risk + R.race * (behind + 0.5 * oppNear) - R.cool * ahead) > loss * R.caution;
}
// v561 : l'adversaire tente Défier le pacte quand le risque est faible et le tour assez gros
function aiDoubles(st, rng) {
  if (!canDouble(st)) return false;
  const R = RIVALS[st.rival];
  if (R.caution > 1.2) return false; /* les prudents (Ilda, Orvel) ne tentent jamais Défier le pacte */
  const v = rowValue(st), p = bustChance(st) * (st.sceaux ? 0.15 : 1);
  if (st.scores[st.turn] + v >= tgt(st)) return false;
  return v >= 8 && p < 0.12 + (R.risk || 0) * 0.6 && rng() > R.noise;
}
// Tour complet de l'adversaire (liste des événements, pour l'écran)
export function aiTurn(st, rng = Math.random) {
  const evs = [];
  let guard = 0;
  while (!st.over && st.turn === 'a' && guard++ < 60) {
    if (aiWants(st, rng)) evs.push(draw(st));
    else if (aiDoubles(st, rng)) evs.push(double(st));
    else evs.push(stop(st));
  }
  return evs;
}
