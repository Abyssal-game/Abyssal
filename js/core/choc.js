// v811 : le nouveau Choc des Boosters (décision du propriétaire du 26 octobre 2026 : un vrai enjeu, sans jeu d'argent).
// Chacun ouvre 2 boosters de duel (3 cartes) en même temps que l'adversaire : une main de 6 cartes. De l'adversaire, on ne voit
// que la faction et la rareté de ses cartes. 3 manches : chacun pose une carte face cachée, révélées ensemble ; la plus forte
// gagne la manche. Force = rareté (C 1 … S 6), +1 si la carte a une finition, +2 si sa faction domine celle de la carte
// adverse (Cercle des Royaumes), +3 avec le Sceau d'Ardeur (une fois par partie). Après la 2e manche, un 3e booster s'ouvre
// pour chacun (le Renfort). Victoire : le plus de manches gagnées, sinon le total des forces jouées. Chacun garde les cartes
// qui ont gagné leur manche, plus une au choix ; le gagnant prend aussi la copie d'une carte adverse. Le reste retourne à l'Abysse.
// Le serveur tient les parties en ligne (choc_apply dans supabase/09-multijoueur.sql, mêmes règles) ; ce moteur sert à
// l'entraînement contre l'Abysse et aux tests.

export const CHOC = {
  tokensMax: 3, // jetons rendus chaque jour (un par jour) jusqu'à ce plafond
  tokensCap: 9, // plafond avec les jetons gagnés ailleurs (Tournoi, coffre de la semaine, Codex)
  hand: 2, renfort: 1, packCards: 3, rounds: 3,
  finish: 1, beat: 2, seal: 3,
  winShards: 30, // éclats du jeu pour une victoire (× la Série ardente)
};
export const RAR_FORCE = { C: 1, PC: 2, R: 3, HR: 4, M: 5, S: 6 };
// Cercle des Royaumes : chaque faction domine la suivante
export const CYCLE = ['infernal', 'sauvage', 'artificiel', 'abyssal', 'celeste', 'necrotique', 'primordial'];
export const VERB = { infernal: 'brûle', sauvage: 'dévore', artificiel: 'enchaîne', abyssal: 'noie', celeste: 'purifie', necrotique: 'ronge', primordial: 'écrase' };
export const preyOf = (f) => { const i = CYCLE.indexOf(f); return i < 0 ? null : CYCLE[(i + 1) % CYCLE.length]; };
export const beats = (a, b) => !!a && preyOf(a) === b;

export const baseForce = (c) => (RAR_FORCE[c?.rarity] || 0) + (c?.variant && c.variant !== 'normal' ? CHOC.finish : 0);
export const forceOf = (c, foe, seal) => baseForce(c) + (beats(c?.faction, foe?.faction) ? CHOC.beat : 0) + (seal ? CHOC.seal : 0);

const other = (w) => (w === 'a' ? 'b' : 'a');
const clone = (x) => JSON.parse(JSON.stringify(x));

// hands = { a: [6 cartes], b: [6] }, extras = { a: [3], b: [3] } ; carte = { id, rarity, faction, variant }
export function newGame(hands, extras) {
  return { hand: clone(hands), extra: clone(extras), used: { a: [], b: [] }, pick: { a: null, b: null }, seal: { a: false, b: false },
    rounds: [], wins: { a: 0, b: 0 }, total: { a: 0, b: 0 }, r: 1, n: 0, turn: 'ab', last: null, over: false, winner: null };
}
export const canPick = (st, who, i, seal) => !st.over && !st.pick[who] && Number.isInteger(i) && i >= 0 && i < st.hand[who].length
  && !st.used[who].includes(i) && (!seal || !st.seal[who]);

// pose (secrète) de la carte i de who ; quand les deux ont posé, la manche est révélée
export function apply(st0, who, i, seal = false) {
  if (st0.over) throw new Error('Cette partie est terminée.');
  if (st0.pick[who]) throw new Error('Ta carte est déjà posée : on attend ton adversaire.');
  if (!canPick(st0, who, i, seal)) throw new Error('Carte impossible à jouer.');
  const st = clone(st0);
  st.pick[who] = { i, seal: !!seal };
  if (!st.pick[other(who)]) { st.turn = other(who); return st; }
  const pa = st.pick.a, pb = st.pick.b, ca = st.hand.a[pa.i], cb = st.hand.b[pb.i];
  const fa = forceOf(ca, cb, pa.seal), fb = forceOf(cb, ca, pb.seal);
  const win = fa > fb ? 'a' : fb > fa ? 'b' : null;
  st.used.a.push(pa.i); st.used.b.push(pb.i);
  if (pa.seal) st.seal.a = true;
  if (pb.seal) st.seal.b = true;
  st.total.a += fa; st.total.b += fb;
  if (win) st.wins[win]++;
  const side = (p, c, f, foe) => ({ i: p.i, card: c, force: f, seal: p.seal, beat: beats(c.faction, foe.faction) });
  const ev = { n: st.n + 1, r: st.r, a: side(pa, ca, fa, cb), b: side(pb, cb, fb, ca), win };
  st.rounds.push({ a: ev.a, b: ev.b, win });
  st.n++; st.pick = { a: null, b: null }; st.turn = 'ab';
  if (st.r === CHOC.hand && st.extra) { // le Renfort : un 3e booster pour chacun
    st.hand.a = st.hand.a.concat(st.extra.a); st.hand.b = st.hand.b.concat(st.extra.b);
    delete st.extra; ev.renfort = true;
  }
  st.r++;
  if (st.r > CHOC.rounds) {
    st.over = true; st.turn = null;
    st.winner = st.wins.a !== st.wins.b ? (st.wins.a > st.wins.b ? 'a' : 'b') : st.total.a !== st.total.b ? (st.total.a > st.total.b ? 'a' : 'b') : 'draw';
    ev.over = true; ev.winner = st.winner;
  }
  st.last = ev;
  return st;
}
// index des cartes de who qui ont gagné leur manche (gardées d'office)
export const wonIdx = (st, who) => st.rounds.filter((r) => r.win === who).map((r) => r[who].i);

// IA de l'entraînement : elle ne voit de toi que la faction et la rareté (comme un joueur), estime ta carte la plus probable
// et cherche à gagner la manche au moindre coût ; garde le Sceau pour une manche serrée. rng() dans [0, 1[.
export function aiPick(st, who, rng = () => 0.5) {
  const me = st.hand[who], foe = other(who), fh = st.hand[foe];
  const mine = me.map((c, i) => i).filter((i) => !st.used[who].includes(i));
  const theirs = fh.map((c, i) => i).filter((i) => !st.used[foe].includes(i));
  // carte adverse attendue : sa plus forte, parfois une autre (bluff)
  const guess = theirs.map((i) => fh[i]).sort((x, y) => (RAR_FORCE[y.rarity] || 0) - (RAR_FORCE[x.rarity] || 0));
  const exp = guess[rng() < 0.65 ? 0 : Math.min(guess.length - 1, 1 + Math.floor(rng() * guess.length))] || guess[0];
  const expF = (RAR_FORCE[exp?.rarity] || 0) + 0.4;
  let best = null;
  for (const i of mine) {
    for (const seal of st.seal[who] ? [false] : [false, true]) {
      const c = me[i], f = forceOf(c, exp, seal), win = f > expF + (beats(exp?.faction, c.faction) ? CHOC.beat : 0);
      // gagner coûte peu (garder les grosses cartes), perdre exprès avec la plus petite
      const cost = baseForce(c) + (seal ? 2.5 : 0);
      const score = (win ? 10 - cost : -cost - 4) + rng() * 1.2;
      if (!best || score > best.score) best = { i, seal, score };
    }
  }
  return best ? { i: best.i, seal: best.seal } : null;
}
// ce que voit un joueur (même chose que choc_view du serveur) : sa main ; de l'adversaire, faction et rareté des cartes non jouées
export function viewFor(st, me) {
  if (st.over) { const v = clone(st); delete v.extra; return v; }
  const foe = other(me), v = clone(st);
  v.extraN = st.extra?.[me]?.length || 0; delete v.extra;
  v.pick = { [me]: st.pick[me], [foe]: !!st.pick[foe] };
  v.hand = { [me]: st.hand[me], [foe]: st.hand[foe].map((c, i) => (st.used[foe].includes(i) ? c : { rarity: c.rarity, faction: c.faction, hid: true })) };
  return v;
}
