// v497 : Persévérance : les défaites sur un même chapitre affaiblissent ses ennemis ; un abandon ne compte pas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game, GRIT } from '../js/core/game.js';

test('Persévérance : +1 par défaite (plafonnée), rien pour un abandon, remise à zéro par une victoire du chapitre', () => {
  const g = new Game(loadCatalog(), new MemoryStorage(), { rng: rngFrom('grit') }); noWelcome(g); g.team();
  g.startRun(); if (g.s.descent.run.phase === 'omen') g.chooseOmen(g.s.descent.run.omenOffer[0]);
  g.abandonRun();
  assert.equal(g.grit(1), 0, 'abandon');
  for (let i = 0; i < GRIT.max + 3; i++) { g.startRun(); if (g.s.descent.run.phase === 'omen') g.chooseOmen(g.s.descent.run.omenOffer[0]); g.endRun(true); }
  assert.equal(g.grit(1), GRIT.max);
  assert.ok(Math.abs(g.gritMult(1) - (1 - GRIT.step * GRIT.max)) < 1e-9);
  assert.equal(g.grit(2), 0, 'propre au chapitre');
  // les ennemis du chapitre sont affaiblis
  g.startRun(); const run = g.s.descent.run; if (run.phase === 'omen') g.chooseOmen(run.omenOffer[0]);
  const o = g.chooseDoor(g.doors()[0]); assert.ok(o.battle);
  const weak = Object.values(run.battle.units).filter((u) => u.side === 'enemy').map((u) => u.maxHp);
  g.abandonRun(); delete g.s.descent.grit;
  g.startRun(); const run2 = g.s.descent.run; if (run2.phase === 'omen') g.chooseOmen(run2.omenOffer[0]);
  g.chooseDoor(g.doors()[0]);
  const full = Object.values(run2.battle.units).filter((u) => u.side === 'enemy').map((u) => u.maxHp);
  assert.ok(weak.reduce((a, b) => a + b) < full.reduce((a, b) => a + b));
});
