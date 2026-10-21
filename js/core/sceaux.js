// ABYSSAL : Duels des Sceaux, un jeu de cartes sur un plateau de 3 × 3 (logique pure, sans affichage).
//
// Chaque joueur a 5 cartes. Chaque carte porte quatre valeurs (haut, droite, bas, gauche), de 1 à 10
// (10 s'affiche « A »). On pose une carte par tour sur une case libre ; si une valeur dépasse
// strictement la valeur d'en face d'une carte adverse voisine, cette carte est capturée.
// Après les 9 poses, on compte les cartes contrôlées sur le plateau, plus la carte restée en main :
// le plus grand total gagne. À 5 contre 5, le joueur qui tient la case centrale (le cœur du Sceau) l'emporte.
// Règles à combinaisons : Identique et Somme capturent sur deux côtés à la fois, puis les cartes ainsi prises
// capturent à leur tour leurs voisines (Combo), en cascade.
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
// v358 : tri à la demande du propriétaire (« trop de règles ») : on garde Classique, Identique, Somme, Cases sacrées
// et Abîme (v359 : Abîme retirée aussi, à la demande du propriétaire). Les autres (retired) ne sont plus proposées ni montrées, mais restent lisibles pour une partie déjà commencée.
export const RULES = {
  classique: { name: 'Classique', desc: 'Les règles de base, sans surprise.' },
  sacre:     { name: 'Cases sacrées', desc: 'Une case bénie (+1 à toutes les valeurs de la carte posée) et une case maudite (−1).' },
  instable:  { name: 'Plateau instable', desc: 'Une case bénie et une case maudite, qui changent de place toutes les deux poses.', retired: true },
  faction:   { name: 'Fraternité', desc: 'Avec au moins 3 cartes d’une même faction en main, leur plus faible valeur gagne +1.', retired: true },
  identique: { name: 'Identique', desc: 'Si ta carte touche deux cartes voisines (ou plus) avec des valeurs égales à celles d’en face, les cartes adverses parmi elles sont capturées. Puis Combo : chaque carte prise capture à son tour ses voisines plus faibles.' },
  somme:     { name: 'Somme', desc: 'Si ta carte forme la même somme (ta valeur + celle d’en face) avec deux voisines ou plus, les cartes adverses parmi elles sont capturées. Puis Combo : chaque carte prise capture à son tour ses voisines plus faibles.' },
  abime:     { name: 'Abîme', desc: 'Identique, Somme et Combo à la fois, avec une case bénie (+1) et une case maudite (−1).', retired: true },
  usure:     { name: 'Usure', desc: 'Identique et Combo, avec une case bénie (+1) et une case maudite (−1) fixes.', retired: true },
  archive:   { name: 'Archives', desc: 'Somme et Combo, et la Fraternité : 3 cartes d’une même faction en main renforcent leur plus faible valeur.', retired: true },
  neant:     { name: 'Néant', desc: 'Toutes les règles à la fois : Identique, Somme, Combo, Fraternité et plateau instable.', retired: true },
};
export const RULE_LIST = Object.keys(RULES).filter((k) => !RULES[k].retired);
// Pouvoirs de rareté (la rareté ne change pas le total des valeurs, elle donne un pouvoir)
// Rempart : la première capture qui la viserait échoue. Fureur : à sa pose, elle capture aussi à égalité.
export const PERKS = {
  rempart: { name: 'Inviolable', desc: 'La première fois qu’on devrait la capturer, elle résiste.', rar: ['HR', 'S'] },
  fureur:  { name: 'Ardeur', desc: 'Quand tu la poses, elle capture aussi les cartes voisines à égalité.', rar: ['M', 'S'] },
};
export const perksOf = (card) => Object.keys(PERKS).filter((k) => PERKS[k].rar.includes(card?.rarity));
// Une règle peut en combiner plusieurs
const PARTS = { abime: ['identique', 'somme', 'sacre'], usure: ['identique', 'sacre'], archive: ['somme', 'faction'], neant: ['identique', 'somme', 'instable', 'faction'] };
export const ruleHas = (st, k) => st.rule === k || (PARTS[st.rule] || []).includes(k);
// Le cœur du Sceau : départage les égalités
export const CENTER = 4;

// Adversaires : du plus simple au plus redoutable. level : étoiles affichées et rareté de leur main.
// ai / aiAwake : [force du jeu (voir aiMove), part de coups imparfaits, écart maximal d'un coup imparfait en cartes]
// v475 : réglés par simulation (tools/sceaux-sim.mjs) pour une échelle régulière : environ 80 % de victoires d'un bon joueur
// contre Ilda jusqu'à environ 20 % contre la Souveraine, et chaque revanche implacable plus dure que l'adversaire normal.
export const RIVALS = [
  { key: 'initie', stars: 1, starsAwake: 2, ai: [3, 0.5, 1], aiAwake: [4, 0.5, 0.5], name: 'Ilda', title: 'l’Initiée', level: 1, faction: null, portrait: 'CEL-006', rule: 'classique', reward: 20,
    hello: 'Tu connais les Sceaux ? Moi, j’apprends encore. On joue doucement ?', win: 'Oh ! Tu m’apprendras ce coup-là ?', lose: 'J’ai gagné ? J’ai gagné !' },
  { key: 'collectionneur', stars: 2, starsAwake: 3, ai: [4, 0.25, 1], aiAwake: [3, 0.75, 0.5], name: 'Maître Orvel', title: 'le Collectionneur', level: 2, faction: 'artificiel', portrait: 'ART-004', rule: 'identique', reward: 30,
    hello: 'Chaque carte que je pose vaut une fortune. Ne les abîme pas.', win: 'Ma collection pleure.', lose: 'Ma collection reste intacte. Reviens quand tu auras mieux.' },
  { key: 'stratege', stars: 2, starsAwake: 3, ai: [5, 0.75, 2], handTier: 2, aiAwake: [4, 0.5, 2], name: 'Sœur Vesna', title: 'la Stratège', level: 3, faction: 'celeste', portrait: 'CEL-005', rule: 'sacre', reward: 40,
    hello: 'Chaque case est une prière. Choisis bien où tu t’agenouilles.', win: 'La lumière t’a guidé, cette fois.', lose: 'Tu as joué au hasard. La lumière, jamais.' },
  { key: 'maitre', stars: 3, starsAwake: 3, ai: [4, 0.75, 2], aiAwake: [4, 0.75, 1], name: 'Le Maître des Sceaux', title: 'arbitre des règles', level: 4, faction: 'necrotique', portrait: 'NEC-001', rule: 'somme', reward: 55,
    hello: 'J’ai scellé plus de créatures que tu n’en verras jamais.', win: 'Tu as brisé mon sceau. Ce n’est pas rien.', lose: 'Reviens quand tu sauras compter.' },
  { key: 'echo', stars: 3, starsAwake: 4, ai: [4, 0.5, 1], aiAwake: [4, 0.6, 1], name: 'L’Écho de l’Abîme', title: 'veilleur des profondeurs', level: 4, faction: 'abyssal', portrait: 'ABY-039', rule: 'sacre', reward: 70,
    hello: 'Je joue tes coups avant toi. Je les ai déjà joués mille fois.', win: '… l’écho se tait.', lose: 'Tu m’entends ? C’est toi, en bas.' },
  { key: 'banquier', stars: 4, starsAwake: 4, ai: [3, 0.75, 1], aiAwake: [3, 0.5, 0.5], name: 'Mammon', title: 'le Banquier des Enfers', level: 5, faction: 'infernal', portrait: 'INF-040', rule: 'somme', reward: 80,
    hello: 'Tout se paie, ici. Surtout les bonnes sommes.', win: 'Une perte… je la noterai dans mon grand livre.', lose: 'Intérêts encaissés. Merci de ta visite.' },
  { key: 'archiviste', stars: 4, starsAwake: 5, ai: [4, 0.5, 2], aiAwake: [4, 0.25, 1], name: 'L’Archiviste', title: 'mémoire d’engrenages', level: 5, faction: 'artificiel', portrait: 'ART-041', rule: 'identique', reward: 90,
    hello: 'J’ai catalogué chacune de tes parties. Elles se terminent toutes pareil.', win: 'Erreur… à… réindexer.', lose: 'Résultat conforme aux prévisions.' },
  { key: 'souverain', stars: 5, starsAwake: 5, ai: [4, 0.25, 2], aiAwake: [5, 0.75, 1], name: 'La Souveraine du Néant', title: 'avant le premier Sceau', level: 5, faction: 'primordial', portrait: 'PRI-053', rule: 'identique', reward: 100,
    hello: 'Avant les Sceaux, il n’y avait que moi. Il n’y aura que moi après.', win: 'Alors… le Néant peut perdre.', lose: 'Retourne au silence, petite flamme.' },
];
// Revanche « implacable » (anciennement éveillée) : après une victoire, l'adversaire revient plus fort (main plus rare, jeu plus fin)
// v403 : étoiles = difficulté mesurée (tools/sceaux-sim.mjs : ≥ 70 % de victoires 1★, 50-70 % 2★, 30-50 % 3★, 20-30 % 4★, < 20 % 5★)
export const awakened = (R) => ({ ...R, stars: R.starsAwake, awake: true, level: Math.min(5, R.level + 1), ai: R.aiAwake, reward: Math.round(R.reward * 1.5), name: R.name, title: `${R.title} · implacable` });
export const RIVAL = Object.fromEntries(RIVALS.map((r) => [r.key, r]));
export const rivalUnlocked = (s, i) => i === 0 || !!s.sceaux?.beaten?.[RIVALS[i - 1].key];

// Récompenses : plafonnées par jour pour qu'aucun mode ne devienne la seule source d'éclats
export const SCEAUX_REWARD = { dailyPaid: 5, firstWin: 100, daily: 40, firstAwake: 150, afterCap: 5, xp: 10 };
// v408 : coffres des Sceaux. Première victoire contre un adversaire : un coffre selon son rang (bois pour les deux premiers,
// puis fer, or, abyssal) ; première victoire en revanche implacable : un rang au-dessus ; défi du jour gagné : un coffre de bois.
export const SCEAUX_CHESTS = ['bois', 'bois', 'fer', 'fer', 'or', 'or', 'abyssal', 'abyssal'];
export const sceauxChest = (key, awake = false) => { const i = RIVALS.findIndex((r) => r.key === key); if (i < 0) return null; const order = ['bois', 'fer', 'or', 'abyssal']; return order[Math.min(3, order.indexOf(SCEAUX_CHESTS[i]) + (awake ? 1 : 0))]; };
// Trophée : après une victoire, une fois par jour, tu gardes une carte adverse que tu contrôles (rareté HR au plus)
export const TROPHY_MAX = ['C', 'PC', 'R', 'HR'];
export function trophyChoices(cat, st) {
  if (st.over !== 'won') return [];
  const ids = st.board.filter((c) => c && c.owner === 'p' && (c.from ? c.from === 'o' : true) && st.hands.o.indexOf(c.id) < 0 && st.oppHand?.includes(c.id)).map((c) => c.id); // v310 : jamais ta propre carte
  return [...new Set(ids)].filter((id) => TROPHY_MAX.includes(cat.get(id)?.rarity));
}
export const SCEAUX_TITLES = { initie: 'Initié des Sceaux', maitre: 'Maître des Sceaux', echo: 'Briseur d’Échos', souverain: 'Souverain des Sceaux' };

// Main d'un adversaire : 5 cartes de sa faction, de plus en plus rares avec son niveau (déterministe)
export function rivalHand(cat, rival, salt = '') {
  const r = mulberry(hash(`rival:${rival.key}:${rival.awake ? 'eveil:' : ''}${salt}`));
  const pool = (rival.faction ? cat.byFaction[rival.faction] : cat.cards).filter((c) => c.rarity !== 'S' || rival.level >= 4);
  // v304 : mains moins chargées en pouvoirs (Rempart, Fureur) : la difficulté vient surtout du jeu de l'adversaire
  // v403 : handTier allège une main (Vesna : une seule nouveauté, les cases sacrées, sans carte Inviolable) ; pas en implacable
  const tiers = { 1: ['C', 'C', 'C', 'PC', 'PC'], 2: ['C', 'PC', 'PC', 'R', 'R'], 3: ['PC', 'PC', 'R', 'R', 'HR'], 4: ['PC', 'R', 'R', 'HR', 'HR'], 5: ['R', 'R', 'HR', 'HR', 'M'] }[rival.awake ? rival.level : rival.handTier || rival.level];
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
    v: 1, rival: R.key, rule: R.rule, daily, seed, oppHand: opp.slice(), level: R.level, ai: R.ai ? { level: R.ai[0], slip: R.ai[1], tol: R.ai[2] ?? Infinity } : null, awake: !!R.awake, rname: R.name,
    board: Array(9).fill(null), hands: { p: hand.slice(0, 5), o: opp }, turn: rnd() < 0.5 ? 'p' : 'o', placed: 0,
    cells: { blessed: null, cursed: null }, over: null, last: null, log: [],
    fac: { p: dominant(cat, hand), o: dominant(cat, opp) },
  };
  st.first = st.turn;
  if (ruleHas(st, 'sacre') || ruleHas(st, 'instable')) moveCells(st, rnd);
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
  if (ruleHas(st, 'faction') && st.fac[who] && card.faction === st.fac[who]) { const i = v.indexOf(Math.min(...v)); v[i]++; }
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
  const perks = st.noPerks ? [] : perksOf(cat.get(id)); /* v538 : parties en ligne sans pouvoirs de rareté */
  st.board[cell] = { id, owner: who, from: who, vals, guard: perks.includes('rempart') }; // from : qui l'a posée (trophée)
  const fury = perks.includes('fureur');
  // Rempart : la carte visée résiste une fois (le rempart tombe)
  const held = new Set(); // v358 : une carte Inviolable qui vient de résister ne peut pas être prise dans la même pose
  const take = (o) => { if (held.has(o)) return false; if (o.guard) { o.guard = false; held.add(o); flips.push({ cell: st.board.indexOf(o), blocked: true }); return false; } return true; };
  const flips = [];
  const near = neighbors(cell).map((n, d) => (n >= 0 && st.board[n] ? { n, d, o: st.board[n], mine: vals[d], theirs: st.board[n].vals[OPP[d]] } : null)).filter(Boolean);
  // Identique / Somme : deux voisines ou plus (les tiennes comptent pour déclencher, seules les adverses sont prises)
  const special = new Map();
  if (ruleHas(st, 'identique')) { const eq = near.filter((x) => x.mine === x.theirs); if (eq.length >= 2) eq.forEach((x) => special.set(x.n, ['identique', x])); }
  if (ruleHas(st, 'somme')) {
    const sums = {};
    near.forEach((x) => { (sums[x.mine + x.theirs] ||= []).push(x); });
    Object.values(sums).forEach((g) => { if (g.length >= 2) g.forEach((x) => { if (!special.has(x.n)) special.set(x.n, ['somme', x]); }); });
  }
  const chain = [];
  for (const [n, [rule, x]] of special) if (x.o.owner !== who && take(x.o)) { x.o.owner = who; flips.push({ cell: n, dir: x.d, mine: x.mine, theirs: x.theirs, rule, from: cell }); chain.push(n); }
  // capture simple
  near.forEach((x) => {
    if (x.o.owner === who) return;
    if ((x.mine > x.theirs || (fury && x.mine === x.theirs)) && take(x.o)) { x.o.owner = who; flips.push({ cell: x.n, dir: x.d, mine: x.mine, theirs: x.theirs, from: cell, rule: x.mine === x.theirs ? 'fureur' : undefined }); }
  });
  // Combo : chaque carte prise par Identique ou Somme capture à son tour (en cascade, chaque carte une seule fois)
  while (chain.length) {
    const c = chain.shift(), src = st.board[c];
    neighbors(c).forEach((n, d) => {
      const o = n >= 0 && st.board[n];
      if (!o || o.owner === who || src.vals[d] <= o.vals[OPP[d]] || !take(o)) return;
      o.owner = who; flips.push({ cell: n, dir: d, mine: src.vals[d], theirs: o.vals[OPP[d]], rule: 'combo', from: c }); chain.push(n);
    });
  }
  st.placed++;
  st.last = { cell, who, flips };
  st.log.push({ who, id, cell, flips: flips.filter((f) => !f.blocked).map((f) => f.cell) });
  if (ruleHas(st, 'instable') && st.placed % 2 === 0 && st.placed < 9) { const r = mulberry(st.rng + st.placed); moveCells(st, r); }
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
  const heart = st.board[CENTER]?.owner || null;
  st.over = s.p > s.o ? 'won' : s.p < s.o ? 'lost' : heart === 'p' ? 'won' : heart === 'o' ? 'lost' : 'draw';
  st.final = s;
  st.tiebreak = s.p === s.o && !!heart;
}

// ——— Intelligence de l'adversaire ———
function cloneGame(st) { return { ...st, board: st.board.map((c) => (c ? { ...c, vals: c.vals.slice() } : null)), hands: { p: st.hands.p.slice(), o: st.hands.o.slice() }, cells: { ...st.cells }, log: [], last: null }; }
const legalMoves = (st, who) => { const m = []; st.hands[who].forEach((_, h) => st.board.forEach((c, i) => { if (!c) m.push([h, i]); })); return m; };
const boardDiff = (st, who) => { const s = score(st), h = st.board[CENTER]?.owner; const d = who === 'o' ? s.o - s.p : s.p - s.o; return d + (h ? (h === who ? 0.5 : -0.5) : 0); };
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
// Recherche : valeur d'une position pour `who` en jouant `plies` poses de plus (alpha-bêta).
// Sans pose restante (ou en fin de partie), on compte simplement l'avance sur le plateau.
function search(cat, st, who, plies, alpha, beta) {
  if (st.over || plies <= 0) return boardDiff(st, who) + (st.over ? (st.over === (who === 'p' ? 'won' : 'lost') ? 50 : st.over === 'draw' ? 0 : -50) : 0);
  const max = st.turn === who;
  let best = max ? -Infinity : Infinity;
  for (const [h, c] of legalMoves(st, st.turn)) {
    const t = cloneGame(st);
    place(cat, t, t.turn, h, c);
    const v = search(cat, t, who, plies - 1, alpha, beta);
    if (max) { if (v > best) best = v; if (best > alpha) alpha = best; } else { if (v < best) best = v; if (best < beta) beta = best; }
    if (alpha >= beta) break;
  }
  return best;
}
// Force de l'adversaire (level) :
//   1 : souvent au hasard ; 2 : prend le plus de cartes ; 3 : se méfie des côtés faibles exposés ;
//   4 : prévoit ta meilleure réponse ; 5 : prévoit deux coups de plus ; 6 : calcule la fin de partie parfaitement.
// slip : part de coups imparfaits (il choisit alors parmi ses 3 meilleurs coups) — rend un adversaire plus humain.
export function aiMove(cat, st, level = 2, rnd = Math.random, slip = 0, tol = Infinity) {
  const who = st.turn;
  const moves = legalMoves(st, who);
  if (!moves.length) return null;
  if (level <= 1 && rnd() < 0.6) return moves[Math.floor(rnd() * moves.length)];
  const scored = [];
  const left = 9 - st.placed;
  for (const [h, c] of moves) {
    const t = cloneGame(st);
    const flips = place(cat, t, who, h, c).filter((f) => !f.blocked);
    let v = flips.length * 10 + (c === CENTER && level >= 2 ? 4 : 0);
    if (level >= 3) v -= exposure(cat, t, c, who) * 6;
    if (level === 4 && !t.over) {
      // l'adversaire répond au mieux : on garde le coup qui laisse le plus d'avance après sa réponse
      let worst = Infinity;
      for (const [h2, c2] of legalMoves(t, t.turn)) {
        const u = cloneGame(t);
        place(cat, u, u.turn, h2, c2);
        worst = Math.min(worst, boardDiff(u, who));
      }
      v = boardDiff(t, who) * 10 + (worst === Infinity ? 0 : worst * 12) - exposure(cat, t, c, who) * 3;
    }
    if (level >= 5) {
      // 5 : trois poses d'avance ; 6 : jusqu'au bout dès que la fin est assez proche
      const plies = level >= 6 && left <= 6 ? left - 1 : 2;
      v = search(cat, t, who, plies, -Infinity, Infinity) * 12 - exposure(cat, t, c, who) * 2 + (c === CENTER ? 1 : 0);
    }
    v += rnd() * (level >= 3 ? 0.5 : 3);
    scored.push([v, h, c]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  // v475 : erreurs « humaines » : un coup imparfait reste proche du meilleur (écart ≤ tol cartes), jamais un cadeau énorme
  let k = 0;
  if (slip > 0 && rnd() < slip) {
    const unit = level >= 5 ? 24 : level === 4 ? 44 : 10, floor = scored[0][0] - tol * unit;
    const near = scored.slice(1, 4).filter((s) => s[0] >= floor).length;
    if (near) k = 1 + Math.floor(rnd() * near);
  }
  return [scored[k][1], scored[k][2]];
}
// Défi du jour : un adversaire déjà débloqué et une règle spéciale, les mêmes pour toute la journée
export function dailyChallenge(day, unlockedCount, known = ['sacre', 'identique', 'somme']) {
  const h = hash(`defi:${day}`);
  const rival = RIVALS[h % Math.max(1, unlockedCount)];
  // v403 : seulement les règles spéciales déjà rencontrées (adversaires débloqués) ; la règle Classique s'il n'y en a aucune
  const rules = known.length ? known : ['classique'];
  const rule = rules[(h >>> 8) % rules.length];
  return { rival: rival.key, rule, seed: h };
}
