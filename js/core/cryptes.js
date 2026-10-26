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
  initie: { name: 'Ilda', mem: 0.35, fade: 0.2, spite: 0, confuse: 0.2, hint: 'Oublie vite ce qu’elle a vu.',
    hello: 'Des cryptes ? J’ai la mémoire d’un moineau… on y va ?', beaten: 'Je l’avais vue, celle-là ! Enfin… je crois.', gloat: 'Même un moineau trouve ses graines !' },
  stratege: { name: 'Sœur Vesna', mem: 0.5, fade: 0.15, spite: 0.4, confuse: 0.15, hint: 'Retient une carte sur deux, et brouille parfois les tiennes.',
    hello: 'Chaque tombe garde un nom. Je les récite tous les soirs.', beaten: 'Ma litanie avait un trou.', gloat: 'La prière garde la mémoire.' },
  archiviste: { name: 'L’Archiviste', mem: 0.72, fade: 0.07, spite: 0.7, confuse: 0.08, hint: 'Retient beaucoup, et échange les cartes que tu viens de voir.',
    hello: 'J’ai catalogué chaque crypte. Chaque dalle. Chaque os.', beaten: 'Erreur… d’inventaire.', gloat: 'Tout est noté. Tout.' },
  echo: { name: 'L’Écho de l’Abîme', power: { k: 'grace', grace: 1, name: 'Résonance', text: 'Sa première erreur de la partie ne lui fait pas passer la main.' }, mem: 0.9, fade: 0.03, spite: 0.9, confuse: 0.03, hint: 'N’oublie presque rien, et brouille sans cesse tes souvenirs.',
    hello: 'Chaque carte retournée résonne en moi… à jamais.', beaten: '… l’écho se tait.', gloat: 'Tu m’as entendu ? Moi, je me souviens de tout.' },
  // v492 : quatre nouveaux adversaires pour les cryptes 5 à 8
  collectionneur: { name: 'Maître Orvel', power: { k: 'collect', n: 5, name: 'Collection', text: 'Chaque 5e paire qu’il trouve lui rapporte 1 point de plus.' }, mem: 0.85, fade: 0.04, spite: 0.5, confuse: 0.06, hint: 'Bonne mémoire, et il suit les cartes qui bougent.',
    hello: 'Les rois bougent dans leurs tombes. Moi, je les suis du regard.', beaten: 'Une tombe m’a échappé.', gloat: 'Rien ne bouge sans que je le voie.' },
  banquier: { name: 'Mammon', power: { k: 'gold', name: 'L’or des tombes', text: 'Les paires maudites ne lui coûtent rien, et chaque paire maudite que tu prends lui donne 1 point.' }, mem: 0.88, fade: 0.04, spite: 0.6, confuse: 0.05, hint: 'Retient presque tout, et ne touche jamais une paire maudite… s’il peut l’éviter.',
    hello: 'Des paires maudites ? Elles seront pour toi. Je ne prends que l’or.', beaten: 'Une malédiction… sur MOI ?', gloat: 'L’or pour moi, la malédiction pour toi.' },
  maitre: { name: 'Le Maître des Sceaux', power: { k: 'lastword', grace: 2, name: 'Dernier mot', text: 'Ses 2 premières erreurs ne lui font pas passer la main, et il gagne les égalités.' }, mem: 0.92, fade: 0.02, spite: 0.8, confuse: 0.03, hint: 'Une mémoire presque parfaite. Ici, pas de pouvoir pour le gêner.',
    hello: 'Dans la Nef, les pouvoirs se taisent. Il ne reste que la mémoire.', beaten: 'Ma mémoire… a failli.', gloat: 'Le silence révèle les meilleurs.' },
  souverain: { name: 'La Souveraine du Néant', power: { k: 'void', n: 4, name: 'Le Néant', text: 'Toutes les 4 erreurs que tu fais, elle te vole ta dernière paire.' }, mem: 0.95, fade: 0.015, spite: 1, confuse: 0.015, hint: 'N’oublie rien, évite les malédictions et brouille tout ce que tu vois.',
    hello: 'Le Tombeau bouge, le Tombeau maudit. Et moi, je n’oublie jamais.', beaten: 'Le Néant… a oublié une carte ?', gloat: 'Ton souvenir s’efface déjà.' },
};
export const TABLES = [
  { key: 'ossuaire', name: 'L’Ossuaire', stars: 1, rival: 'initie', reward: 25, chest: 'bois', bg: 'salle-cryptes-ossuaire' },
  { key: 'chapelle', name: 'La Chapelle des noms', stars: 2, rival: 'stratege', reward: 35, chest: 'fer', bg: 'salle-cryptes-chapelle' },
  { key: 'archives', name: 'Les Archives scellées', stars: 3, rival: 'archiviste', reward: 50, chest: 'or', bg: 'salle-cryptes-archives' },
  { key: 'puits', name: 'Le Puits de l’Écho', stars: 4, rival: 'echo', reward: 70, chest: 'abyssal', bg: 'salle-cryptes-puits' },
  // v492 : cryptes 5 à 8, chacune avec sa règle : mouvante (à chaque fois que la main passe, deux cartes face cachée
  // échangent leur place, sous tes yeux), maudite (deux paires maudites : −1 point et pas de pouvoir), silence (aucun pouvoir)
  { key: 'cimetiere', name: 'Le Cimetière des rois', stars: 4, rival: 'collectionneur', reward: 80, chest: 'or', bg: 'salle-cryptes-cimetiere', rule: 'Crypte mouvante : chaque fois que la main passe, deux cartes face cachée échangent leur place, sous tes yeux.', rules: { drift: true } },
  { key: 'maudite', name: 'La Crypte maudite', stars: 5, rival: 'banquier', reward: 90, chest: 'or', bg: 'salle-cryptes-maudite', rule: 'Deux paires maudites : les prendre coûte 1 point, sans pouvoir.', rules: { curse: 2 } },
  { key: 'nef', name: 'La Nef silencieuse', stars: 5, rival: 'maitre', reward: 100, chest: 'abyssal', bg: 'salle-cryptes-nef', rule: 'Silence : aucune paire ne déclenche de pouvoir. Seule la mémoire compte.', rules: { silence: true } },
  { key: 'tombeau', name: 'Le Tombeau du Néant', stars: 5, rival: 'souverain', reward: 120, chest: 'abyssal', bg: 'salle-cryptes-tombeau', rule: 'Crypte mouvante et deux paires maudites.', rules: { drift: true, curse: 2 } },
];
// v492 : un haut fait par crypte (payé une fois, en plus de la victoire)
export const FEATS = {
  ossuaire: { text: 'Trouve 5 paires d’affilée.', ok: (st) => (st.stats?.run.p || 0) >= 5 },
  chapelle: { text: 'Gagne avec 8 points ou plus.', ok: (st) => st.final.scores.p >= 8 },
  archives: { text: 'Gagne avec 4 points d’avance.', ok: (st) => st.final.scores.p - st.final.scores.a >= 4 },
  puits: { text: 'Gagne avec 8 points ou plus.', ok: (st) => st.final.scores.p >= 8 },
  cimetiere: { text: 'Trouve 5 paires d’affilée.', ok: (st) => (st.stats?.run.p || 0) >= 5 },
  maudite: { text: 'Gagne avec 6 points ou plus, malédictions comprises.', ok: (st) => st.final.scores.p >= 6 },
  nef: { text: 'Trouve 5 paires d’affilée.', ok: (st) => (st.stats?.run.p || 0) >= 5 },
  tombeau: { text: 'Gagne avec 7 points ou plus.', ok: (st) => st.final.scores.p >= 7 },
};
export const featOk = (st) => st.over === 'won' && !!FEATS[st.table]?.ok(st);
export const FEAT_SHARDS = 60;
export const FEATS_TITLE = 'Mémoire des Cryptes';
export const LAST_TITLE = 'Gardien du Tombeau';
export const TABLE = Object.fromEntries(TABLES.map((t) => [t.key, t]));
export const tableBg = (key) => `assets/sceaux/${TABLE[key]?.bg || 'salle-cryptes'}.webp`; /* v494 : décor peint propre à la salle */
export const tableUnlocked = (s, i) => i === 0 || !!(s.settings?.dev && s.devGames) || !!s.cryptes?.beaten?.[TABLES[i - 1].key];
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
  const RU = T.rules || {};
  const curse = RU.curse ? shuffle(pairs.map((p) => p.k), r).slice(0, RU.curse) : [];
  return { table, daily, seed, rival: T.rival, cards, turn: 'p', open: [], pairs: { p: [], a: [] }, bonus: { p: 0, a: 0 },
    grace: { p: 0, a: 0 }, pw: { miss: 0, grace: RIVALS[T.rival].power?.grace || 0 }, block: { p: false, a: false }, pending: null, shown: [], mem: {}, turns: 0, last: null, over: null, final: null,
    drift: !!RU.drift, silence: !!RU.silence, curse, stats: { run: { p: 0, a: 0 }, cur: 0, stolen: { p: 0, a: 0 }, cursed: { p: 0, a: 0 } } };
}

const other = (x) => (x === 'p' ? 'a' : 'p');
/* v752 : pouvoir annoncé de l'adversaire des cryptes 4 à 8 (comme au Pacte) */
export const powerOf = (st) => RIVALS[st.rival]?.power || null;
const isPow = (st, k) => powerOf(st)?.k === k;
export const scoreOf = (st, x) => st.pairs[x].length + st.bonus[x];
export const hidden = (st) => st.cards.map((c, i) => (c.gone ? -1 : i)).filter((i) => i >= 0 && !st.open.includes(i));
export const left = (st) => st.cards.filter((c) => !c.gone).length / 2;

// Mémoire de l'adversaire : il retient (ou non) chaque carte qu'il voit
function see(st, i, rng, sure = false) {
  const R = RIVALS[st.rival];
  (st.seenAt ||= {})[i] = st.turns;
  if (sure || rng() < R.mem) st.mem[i] = st.cards[i].k;
}
/* v502 : comme un humain, même un adversaire distrait se souvient presque toujours des cartes retournées
   pendant ce tour et le précédent (`recent`) ; `mem` et `fade` ne règlent plus que la mémoire plus ancienne. */
export const RECENT = { initie: 0.8, stratege: 0.88, archiviste: 0.94, echo: 0.97, collectionneur: 0.96, banquier: 0.96, maitre: 0.98, souverain: 0.99 };
function knownOf(st, i, rng) {
  if (st.mem[i] != null) return st.mem[i];
  const t = st.seenAt?.[i];
  return t != null && t >= st.turns - 1 && rng() < (RECENT[st.rival] ?? 0.9) ? st.cards[i].k : null;
}
function fadeMem(st, rng) {
  const R = RIVALS[st.rival];
  for (const i of Object.keys(st.mem)) if (st.cards[i].gone || st.mem[i] !== st.cards[i].k || rng() < R.fade) delete st.mem[i];
}

function finish(st) {
  if (st.cards.some((c) => !c.gone)) return;
  const p = scoreOf(st, 'p'), a = scoreOf(st, 'a');
  // égalité : celui qui a pris la dernière paire l'emporte
  st.over = p > a || (p === a && st.lastPair === 'p' && !isPow(st, 'lastword')) ? 'won' : 'lost'; /* Dernier mot : à égalité, le Maître gagne */
  st.final = { scores: { p, a } };
}

// Retourne une carte (le joueur dont c'est le tour). Renvoie l'événement pour l'écran.
export function flip(st, i, rng = Math.random) {
  if (st.over) throw new Error('La partie est terminée.');
  if (st.pending) throw new Error('Choisis d’abord la cible du pouvoir.');
  if (!Number.isInteger(i)) throw new Error('Cette carte ne peut pas être retournée.'); /* v754 */
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
    const S = st.stats;
    if (S) { S.cur++; S.run[who] = Math.max(S.run[who], S.cur); }
    if (who === 'a' && isPow(st, 'collect')) { st.pw ||= {}; st.pw.found = (st.pw.found || 0) + 1; if (st.pw.found % powerOf(st).n === 0) { st.bonus.a++; ev.collect = true; } } /* Orvel : Collection (v754 : ses paires trouvées, pas celles volées) */
    if (st.curse?.includes(c.k)) {
      ev.cursed = true; if (S) S.cursed[who]++;
      if (who === 'a' && isPow(st, 'gold')) ev.gold = true; /* Mammon : l'or des tombes, la malédiction ne le touche pas */
      else { st.bonus[who]--; if (who === 'p' && isPow(st, 'gold')) { st.bonus.a++; ev.goldTax = true; } }
    }
    else if (st.silence) ev.silent = true;
    else if (st.block[who]) { st.block[who] = false; ev.blocked = true; }
    else applyPower(st, who, c.f, ev, rng);
    finish(st);
    st.last = ev;
    return ev;
  }
  const ev = { who, kind: 'miss', i: [x, y], graced: false };
  if (who === 'p' && isPow(st, 'void')) { st.pw.miss = (st.pw.miss || 0) + 1; if (st.pw.miss % powerOf(st).n === 0 && st.pairs.p.length) { const k = st.pairs.p.pop(); st.pairs.a.push(k); ev.voidSteal = k; if (st.curse?.includes(k)) { st.bonus.p++; st.bonus.a--; } } } /* la Souveraine : le Néant */
  if (st.stats) st.stats.cur = 0;
  if (st.grace[who] > 0) { st.grace[who]--; ev.graced = true; }
  else if (who === 'a' && st.pw?.grace > 0) { st.pw.grace--; ev.graced = true; ev.pwGrace = true; } /* Résonance, Dernier mot */
  else {
    st.turn = other(who); st.turns++; fadeMem(st, rng);
    // crypte mouvante : deux cartes face cachée échangent leur place (sous les yeux des deux joueurs)
    if (st.drift) { const hid = hidden(st); if (hid.length >= 2) { const s2 = shuffle(hid.slice(), rng); swap(st, s2[0], s2[1]); ev.drift = [s2[0], s2[1]]; } }
  }
  st.last = ev;
  return ev;
}

function applyPower(st, who, f, ev, rng) {
  const opp = other(who);
  if (f === 'celeste') st.grace[who]++;
  else if (f === 'primordial') st.bonus[who]++;
  else if (f === 'artificiel') st.block[opp] = true;
  else if (f === 'necrotique') { const k = st.pairs[opp].pop(); if (k != null) { st.pairs[who].push(k); ev.stolen = k; if (st.curse?.includes(k)) { st.bonus[who]--; st.bonus[opp]++; } /* v729 : une paire maudite volée garde sa malédiction */ if (st.stats) st.stats.stolen[opp]++; } else ev.empty = true; }
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
  if (!Array.isArray(picks) || !picks.every(Number.isInteger) || picks.length !== P.pick || picks.some((i) => !hid.includes(i)) || new Set(picks).size !== picks.length) throw new Error('Choisis une carte face cachée.');
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
  if (st.seenAt) { const si = st.seenAt[i], sj = st.seenAt[j]; delete st.seenAt[i]; delete st.seenAt[j]; if (sj != null) st.seenAt[i] = sj; if (si != null) st.seenAt[j] = si; }
}

// Pouvoirs de l'adversaire : il les choisit lui-même
function aiPower(st, f, ev, rng) {
  const R = RIVALS[st.rival], hid = hidden(st);
  const unknown = hid.filter((i) => st.mem[i] == null);
  if (f === 'infernal' || f === 'sauvage') {
    /* v475 : le Cri sauvage montre la carte à tous : il choisit d'abord une carte que tu as déjà vue (tu n'apprends rien) */
    const shownU = f === 'sauvage' && rng() < R.spite ? unknown.filter((i) => (st.shown || []).includes(i)) : [];
    const pool = shownU.length ? shownU : unknown.length ? unknown : hid;
    const i = pool[Math.floor(rng() * pool.length)];
    st.mem[i] = st.cards[i].k; ev.i2 = [i];
    if (f === 'sauvage') ev.card = st.cards[i];
  } else if (f === 'abyssal') {
    // il brouille les cartes que tu as déjà vues (les plus récentes), ou en échange deux au hasard
    const seen = (st.shown || []).filter((i) => hid.includes(i));
    let a, b;
    const pairSeen = seen.find((i) => seen.some((j) => j !== i && st.cards[j].k === st.cards[i].k));
    if (pairSeen != null && rng() < R.spite) { a = pairSeen; b = shuffle(hid.filter((i) => i !== pairSeen), rng)[0]; }
    else if (seen.length >= 2 && rng() < R.spite) { a = seen[seen.length - 1]; b = seen[seen.length - 2]; }
    else { const s = shuffle(hid.slice(), rng); a = s[0]; b = s[1]; }
    swap(st, a, b); ev.i2 = [a, b];
  }
}

// Ce que l'adversaire fait maintenant : retourner une carte (renvoie son indice)
// v463 : adversaires plus humains : au lieu d'oublier d'un coup, ils se trompent parfois de place
// (« elle était là… non, à côté » : `confuse`). (Essai écarté : une 2e carte déjà vue pour ne rien te révéler les affaiblissait.)
const near = (i) => [i - 1, i + 1, i - COLS, i + COLS].filter((j) => j >= 0 && j < PAIRS * 2 && (Math.floor(j / COLS) === Math.floor(i / COLS) || j % COLS === i % COLS));
function recall(st, i, rng) {
  const R = RIVALS[st.rival];
  if (rng() >= (R.confuse || 0)) return i;
  const hid = hidden(st), alt = near(i).filter((j) => hid.includes(j));
  return alt.length ? alt[Math.floor(rng() * alt.length)] : i;
}
export function aiPick(st, rng = Math.random) {
  const R = RIVALS[st.rival], hid = hidden(st), byK = {}, kn = {};
  for (const i of hid) { const k = knownOf(st, i, rng); if (k != null) { kn[i] = k; (byK[k] ||= []).push(i); } }
  const pickOf = (l) => l[Math.floor(rng() * l.length)];
  const cursed = (k) => !isPow(st, 'gold') && (st.curse || []).includes(k);
  if (st.open.length === 1) {
    const o = st.open[0], k = st.cards[o].k;
    const known = (byK[k] || []).find((i) => i !== o);
    const unknown = hid.filter((i) => kn[i] == null && i !== o);
    // v492 : une paire maudite, il ne la prend que s'il n'a rien d'autre à retourner
    if (known != null && cursed(k)) { const safe = unknown.length ? unknown : hid.filter((i) => i !== o && kn[i] != null && kn[i] !== k); if (safe.length) return pickOf(safe); }
    if (known != null) return recall(st, known, rng);
    return pickOf(unknown.length ? unknown : hid.filter((i) => i !== o));
  }
  const pair = Object.entries(byK).find(([k, l]) => l.length >= 2 && !cursed(+k))?.[1];
  if (pair) return recall(st, pair[0], rng);
  const unknown = hid.filter((i) => kn[i] == null);
  return pickOf(unknown.length ? unknown : hid);
}
// Pour l'écran : cartes vues par le joueur (l'adversaire s'en sert pour brouiller avec Abyssal)
export function noteShown(st, idx) {
  st.shown = [...(st.shown || []).filter((i) => !idx.includes(i)), ...idx].slice(-8);
}
