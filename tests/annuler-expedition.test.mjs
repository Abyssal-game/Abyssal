// v377 : une expédition où rien n'a été joué (présage, premières portes) s'annule sans conséquence : la torche est rendue.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game } from '../js/core/game.js';

const catalog = loadCatalog();
const mk = (seed) => noWelcome(new Game(catalog, new MemoryStorage(), { rng: rngFrom(seed), clock: () => new Date(2026, 9, 18, 12) }));

test('annuler une expédition pas encore jouée rend la torche', () => {
  const g = mk('cancel');
  g.team();
  g.s.bossesBeaten.devoreur = 1; // présages ouverts
  const torches = g.torchesLeft();
  const run = g.startRun();
  assert.equal(run.phase, 'omen');
  assert.equal(g.torchesLeft(), torches - 1);
  assert.ok(g.canCancelRun());
  g.cancelRun();
  assert.equal(g.descent().run, null);
  assert.equal(g.torchesLeft(), torches);
  assert.equal(g.s.stats.abandons || 0, 0);
  // présage choisi, portes encore jamais franchies : toujours annulable
  const r2 = g.startRun();
  g.chooseOmen(r2.omenOffer[0]);
  assert.ok(g.canCancelRun());
  g.cancelRun();
  assert.equal(g.torchesLeft(), torches);
  // combat engagé : plus annulable, il faut abandonner
  g.startRun();
  g.chooseOmen(g.descent().run.omenOffer[0]);
  g.chooseDoor(g.doors()[0]);
  assert.equal(g.canCancelRun(), false);
  assert.throws(() => g.cancelRun(), /abandonner/);
});
