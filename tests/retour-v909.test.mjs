// v909 : cadeau de retour (après 3 jours sans jouer : un booster ; après 7 : un booster premium) et missions du Cercle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { MISSIONS } from '../js/config.js';
import { OPS, ARGS } from '../js/core/ops.js';

const catalog = loadCatalog();
let now = new Date(2026, 9, 18, 12);
const g = noWelcome(new Game(catalog, new MemoryStorage(), { rng: rngFrom('retour'), clock: () => now }));
const at = (d) => { now = new Date(2026, 9, d, 12); };

test('cadeau de retour : rien le lendemain, un booster après 3 jours, premium après 7, une seule fois', () => {
  assert.ok(OPS.claimComeback?.kind === 'sync' && Array.isArray(ARGS.claimComeback));
  if (g.canDailyClaim()) g.claimDaily();
  assert.equal(g.comeback(), null);
  at(19); assert.equal(g.comeback(), null); g.claimDaily();
  at(22); const st = g.s.tickets.standard || 0;
  assert.deepEqual(g.comeback(), { away: 3, ticket: 'standard' });
  g.claimComeback(); assert.equal(g.s.tickets.standard, st + 1);
  assert.equal(g.comeback(), null); assert.throws(() => g.claimComeback());
  g.claimDaily();
  at(29); const pr = g.s.tickets.premium || 0;
  assert.equal(g.comeback().ticket, 'premium'); g.claimComeback(); assert.equal(g.s.tickets.premium, pr + 1);
});

test('missions du Cercle : tirables et avancées par une partie', () => {
  assert.ok(MISSIONS.some((m) => m.kind === 'cercle') && MISSIONS.some((m) => m.kind === 'cercleplay'));
  const m = g.missions();
  m.list = [{ key: 'cercle', kind: 'cercle', n: 1, shards: 35, p: 0, claimed: false, text: '' }, { key: 'cercle2', kind: 'cercleplay', n: 2, shards: 30, p: 0, claimed: false, text: '' }];
  g.track('cercleplay'); g.track('cercle');
  assert.equal(m.list[0].p, 1); assert.equal(m.list[1].p, 1);
});
