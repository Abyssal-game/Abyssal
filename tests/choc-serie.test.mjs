// v807 : Choc des Boosters : Série ardente (butin multiplié, coffres de série), Ligues du mois, succès, carte trophée, fiche.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { VERSUS_PRIZE, streakMult, LEAGUES, LEAGUE_PTS, leagueIdx } from '../js/core/versus.js';
import { friendCard, cleanCard } from '../js/core/friends.js';
const catalog = loadCatalog();
let now = new Date('2026-11-02T10:00:00');
const fresh = () => noWelcome(new Game(catalog, new MemoryStorage(), { rng: rngFrom('s'), clock: () => now }));
const hr = catalog.cards.find((c) => c.rarity === 'HR');
const duel = (g, id, result) => g.versusApply(id, { result, cards: [], stake: 400, packs: 1, trophy: { id: hr.id } });

test('v807 : la Série ardente multiplie le butin, une défaite l’éteint, une égalité la garde', () => {
  now = new Date('2026-11-02T10:00:00');
  const g = fresh();
  const a = duel(g, 'a', 'win'), b = duel(g, 'b', 'win'), c = duel(g, 'c', 'win');
  assert.equal(a.streak.after, 1); assert.equal(a.shards, 400 * VERSUS_PRIZE.win * streakMult(1));
  assert.equal(b.mult, streakMult(2)); assert.equal(c.mult, 2);
  assert.equal(c.streakChest, 'fer', '3 victoires d’affilée : coffre de fer');
  const t = duel(g, 'd', 'tie');
  assert.equal(t.streak.after, 3, 'égalité : la série tient');
  const l = duel(g, 'e', 'lose');
  assert.equal(l.streak.after, 0); assert.ok(l.streak.broken);
  assert.equal(g.s.versus.best, 3);
});

test('v807 : Ligue du mois : points, montée, descente, récompense au changement de mois', () => {
  now = new Date('2026-11-02T10:00:00');
  const g = fresh();
  let n = 0;
  for (let i = 0; i < 6; i++) duel(g, `w${n++}`, 'win');
  const pts = g.s.versus.lg.pts;
  assert.ok(pts >= 6 * LEAGUE_PTS.win, 'chaque victoire rapporte, plus le bonus de série');
  assert.ok(leagueIdx(pts) >= 1);
  const top = leagueIdx(pts);
  const l = duel(g, `l${n++}`, 'lose');
  assert.equal(l.league.delta, LEAGUE_PTS.lose);
  // on peut redescendre
  while (leagueIdx(g.s.versus.lg.pts) >= top && g.s.versus.lg.pts > 0) duel(g, `l${n++}`, 'lose');
  assert.ok(leagueIdx(g.s.versus.lg.pts) < top);
  assert.equal(g.s.versus.lgTop, top, 'meilleure ligue gardée');
  // fin du mois : récompense de la ligue où l'on finit, points remis à zéro
  for (let i = 0; i < 6; i++) duel(g, `w${n++}`, 'win');
  const tier = leagueIdx(g.s.versus.lg.pts), chests = { ...g.s.chests };
  now = new Date('2026-12-01T09:00:00');
  g.chocLeague();
  assert.equal(g.s.versus.lg.pts, 0); assert.equal(g.s.versus.lg.m, '2026-12');
  assert.equal(g.s.versus.lgLast.tier, tier); assert.equal(g.s.versus.lgLast.m, '2026-11');
  const gained = Object.keys(g.s.chests).some((k) => (g.s.chests[k] || 0) > (chests[k] || 0));
  assert.equal(gained, tier >= 1, 'récompense à partir de la ligue Argent');
  g.chocLeague();
  assert.equal(g.s.versus.lgLast.m, '2026-11', 'une seule fois');
});

test('v807 : succès du Choc, carte trophée, tableau de chasse publié et nettoyé', () => {
  now = new Date('2026-11-02T10:00:00');
  const g = fresh();
  for (let i = 0; i < 5; i++) duel(g, `x${i}`, 'win');
  assert.ok(g.s.achievements.choc_s5, 'série de 5');
  (g.s.versus.pick ||= {}).p1 = true;
  g.versusPickApply('p1', { trophy: { id: hr.id }, foe: 'Bob<script>' });
  assert.equal(g.s.versus.trophies[hr.id].f, 'Bobscript');
  const ch = cleanCard(friendCard(g)).st.ch;
  assert.equal(ch.w, 5); assert.equal(ch.s, 5); assert.equal(ch.m, '2026-11');
  assert.equal(cleanCard({ st: { ch: { w: -3, l: 9, m: '<b>', c: 'x y' } } }).st.ch.l, 4);
  assert.equal(cleanCard({ st: { ch: { m: '<b>' } } }).st.ch.m, '');
  assert.ok(LEAGUES.length === 5);
});
