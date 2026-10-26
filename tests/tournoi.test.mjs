// v795 : Tournoi du Cercle : un jeu par semaine, 8 adversaires d'affilée.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game, TOURNEY_GAMES } from '../js/core/game.js';
import { cleanCard, friendCard } from '../js/core/friends.js';

const catalog = loadCatalog();
const mk = (seed, d) => noWelcome(new Game(catalog, new MemoryStorage(), { rng: rngFrom(seed), clock: () => d }));
const FIN = { sceaux: 'sceauxFinish', pacte: 'pacteFinish', cryptes: 'cryptesFinish', encheres: 'encheresFinish' };
const end = (g, game, r) => { const st = g.s[game].cur; st.over = r; st.final ||= { scores: { p: 0, a: 0, b: 0 } }; return g[FIN[game]](); };

test('un jeu différent chaque semaine, le même toute la semaine', () => {
  const lun = mk('a', new Date(2026, 10, 2, 12)), dim = mk('b', new Date(2026, 10, 8, 20)), sui = mk('c', new Date(2026, 10, 9, 9));
  assert.equal(lun.tourney().game, dim.tourney().game);
  assert.notEqual(lun.tourney().game, sui.tourney().game);
  assert.ok(TOURNEY_GAMES.includes(lun.tourney().game));
});

for (const day of [2, 9, 16, 23]) test(`8 victoires d'affilée : coffre d'or à 4, coffre abyssal et 2 tickets premium à 8 (semaine du ${day})`, () => {
  const g = mk(`t${day}`, new Date(2026, 10, day, 12));
  const game = g.tourney().game;
  if (game === 'sceaux') g.s.sceaux.hand = Object.keys(g.s.collection).slice(0, 5);
  const or = g.s.chests.or || 0, ab = g.s.chests.abyssal || 0, pr = g.s.tickets.premium || 0;
  for (let i = 0; i < 8; i++) { const cur = g.tourneyPlay(); assert.equal(cur.tourney.round, i); const out = end(g, game, 'won'); assert.equal(out.tourney.round, i + 1); }
  const T = g.tourney();
  assert.equal(T.best, 8); assert.ok(T.champ); assert.equal(T.wins, 1);
  assert.ok(g.s.chests.or >= or + 1, 'coffre d’or du tournoi');
  assert.ok(g.s.chests.abyssal >= ab + 1);
  assert.equal(g.s.tickets.premium, pr + 2);
  assert.equal(cleanCard(friendCard(g)).st.tn.b, 8);
});

test('une défaite arrête la série ; on recommence à la 1re manche, le meilleur score reste', () => {
  const g = mk('perd', new Date(2026, 10, 9, 12));
  const game = g.tourney().game;
  if (game === 'sceaux') g.s.sceaux.hand = Object.keys(g.s.collection).slice(0, 5);
  g.tourneyPlay(); end(g, game, 'won');
  g.tourneyPlay(); end(g, game, 'won');
  g.tourneyPlay(); const o = end(g, game, 'lost');
  assert.ok(o.tourney.lost);
  assert.equal(g.tourney().best, 2); assert.equal(g.tourney().alive, false);
  const cur = g.tourneyPlay(); assert.equal(cur.tourney.round, 0);
  assert.equal(g.tourney().best, 2);
});
