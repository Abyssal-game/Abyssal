// v811 : le nouveau Choc des Boosters (décision du propriétaire du 26 octobre 2026 : un vrai enjeu, sans jeu d'argent).
// v816 (choix du propriétaire du 27 octobre 2026) : plus de domination entre factions ni de Sceau d'Ardeur : les Flammes.
// Chacun ouvre 2 boosters standard (3 cartes) en même temps que l'adversaire : une main de 6 cartes. De l'adversaire, on ne voit
// que la faction et la rareté de ses cartes, et combien de Flammes il lui reste. 3 manches : chacun pose une carte face cachée
// avec 0 à 4 Flammes, révélées ensemble ; la plus forte gagne la manche (égalité : manche nulle). Force = rareté (C 1 … S 6),
// +1 si la carte a une finition, +1 par Flamme. 8 Flammes pour toute la partie. Après la 2e manche, un 3e booster s'ouvre pour
// chacun (le Renfort). Victoire : le plus de manches gagnées, sinon le total des forces jouées. Chacun garde les cartes qui ont
// gagné leur manche, plus une au choix ; le gagnant prend aussi la copie d'une carte adverse. Le reste retourne à l'Abysse.
// Le serveur tient les parties en ligne (choc_apply dans supabase/09-multijoueur.sql, mêmes règles) ; ce moteur sert à
// l'entraînement contre l'Abysse et aux tests.

export const CHOC = {
  tokensMax: 1, // v838 : un jeton par jour, qui ne se garde pas (rendez-vous quotidien : rien à mettre de côté pour le week-end)
  tokensCap: 9, // plafond avec les jetons gagnés ailleurs (Tournoi, coffre de la semaine, Codex), à jouer le jour même
  hand: 2, renfort: 1, packCards: 3, rounds: 3,
  finish: 1,
  flames: 8, flameMax: 4, // Flammes pour toute la partie, au plus 4 sur une même carte
  winShards: 30, // éclats du jeu pour une victoire (× la Série ardente)
};
export const RAR_FORCE = { C: 1, PC: 2, R: 3, HR: 4, M: 5, S: 6 };

export const baseForce = (c) => (RAR_FORCE[c?.rarity] || 0) + (c?.variant && c.variant !== 'normal' ? CHOC.finish : 0);
export const forceOf = (c, f = 0) => baseForce(c) + (f | 0);

const other = (w) => (w === 'a' ? 'b' : 'a');
const clone = (x) => JSON.parse(JSON.stringify(x));
export const flamesLeft = (st, who) => (st.flames ? st.flames[who] : CHOC.flames);
export const flameCap = (st, who) => Math.min(CHOC.flameMax, flamesLeft(st, who));

// hands = { a: [6 cartes], b: [6] }, extras = { a: [3], b: [3] } ; carte = { id, rarity, faction, variant }
export function newGame(hands, extras) {
  return { hand: clone(hands), extra: clone(extras), used: { a: [], b: [] }, pick: { a: null, b: null }, flames: { a: CHOC.flames, b: CHOC.flames },
    rounds: [], wins: { a: 0, b: 0 }, total: { a: 0, b: 0 }, r: 1, n: 0, turn: 'ab', last: null, over: false, winner: null };
}
export const canPick = (st, who, i, f = 0) => !st.over && !st.pick[who] && Number.isInteger(i) && i >= 0 && i < st.hand[who].length
  && !st.used[who].includes(i) && Number.isInteger(f) && f >= 0 && f <= flameCap(st, who);

// pose (secrète) de la carte i de who avec f Flammes ; quand les deux ont posé, la manche est révélée
export function apply(st0, who, i, f = 0) {
  if (st0.over) throw new Error('Cette partie est terminée.');
  if (st0.pick[who]) throw new Error('Ta carte est déjà posée : on attend ton adversaire.');
  if (!canPick(st0, who, i, f)) throw new Error('Carte impossible à jouer.');
  const st = clone(st0);
  if (!st.flames) st.flames = { a: CHOC.flames, b: CHOC.flames };
  st.pick[who] = { i, f };
  if (!st.pick[other(who)]) { st.turn = other(who); return st; }
  const pa = st.pick.a, pb = st.pick.b, ca = st.hand.a[pa.i], cb = st.hand.b[pb.i];
  const fa = forceOf(ca, pa.f), fb = forceOf(cb, pb.f);
  const win = fa > fb ? 'a' : fb > fa ? 'b' : null;
  st.used.a.push(pa.i); st.used.b.push(pb.i);
  st.flames.a -= pa.f; st.flames.b -= pb.f;
  st.total.a += fa; st.total.b += fb;
  if (win) st.wins[win]++;
  const side = (p, c, fo) => ({ i: p.i, card: c, force: fo, f: p.f });
  const ev = { n: st.n + 1, r: st.r, a: side(pa, ca, fa), b: side(pb, cb, fb), win };
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

// IA de l'entraînement : elle ne voit de toi que la rareté de tes cartes et tes Flammes restantes (comme un joueur). Elle estime
// ta carte la plus probable et tes Flammes, cherche à gagner la manche au moindre coût, sinon perd avec sa plus petite carte
// sans Flamme ; elle garde des Flammes pour les manches suivantes. rng() dans [0, 1[.
export function aiPick(st, who, rng = () => 0.5) {
  const me = st.hand[who], foe = other(who), fh = st.hand[foe];
  const mine = me.map((c, i) => i).filter((i) => !st.used[who].includes(i));
  const theirs = fh.map((c, i) => i).filter((i) => !st.used[foe].includes(i)).map((i) => fh[i]);
  const left = CHOC.rounds - st.r + 1, cap = flameCap(st, who), foeF = flamesLeft(st, foe);
  const sorted = theirs.map((c) => RAR_FORCE[c.rarity] || 0).sort((x, y) => y - x);
  const exp = (rng() < 0.7 ? sorted[0] : sorted[Math.min(sorted.length - 1, 1 + Math.floor(rng() * 2))] || sorted[0]) || 0;
  const expF = exp + 0.4 + Math.min(CHOC.flameMax, Math.round(foeF / left) + (rng() < 0.3 ? 1 : 0));
  const keep = left > 1 ? 1.4 : 0; // une Flamme vaut plus tant qu'il reste des manches
  let best = null;
  for (const i of mine) {
    for (let f = 0; f <= cap; f++) {
      const fo = forceOf(me[i], f), win = fo > expF;
      const cost = baseForce(me[i]) * 0.8 + f * keep;
      const score = (win ? 14 - cost : -cost - 6) + rng() * 1.5;
      if (!best || score > best.score) best = { i, f, score };
    }
  }
  return best ? { i: best.i, f: best.f } : null;
}
// ce que voit un joueur (même chose que choc_view du serveur) : sa main ; de l'adversaire, faction et rareté des cartes non jouées
// et ses Flammes restantes (celles qu'il vient de poser restent cachées jusqu'à la révélation)
export function viewFor(st, me) {
  if (st.over) { const v = clone(st); delete v.extra; return v; }
  const foe = other(me), v = clone(st);
  v.extraN = st.extra?.[me]?.length || 0; delete v.extra;
  v.pick = { [me]: st.pick[me], [foe]: !!st.pick[foe] };
  v.hand = { [me]: st.hand[me], [foe]: st.hand[foe].map((c, i) => (st.used[foe].includes(i) ? c : { rarity: c.rarity, faction: c.faction, hid: true })) };
  return v;
}
