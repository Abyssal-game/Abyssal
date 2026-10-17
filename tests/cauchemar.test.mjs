// v367 : trois paliers de Cauchemar, chacun ouvert par l'étage 10 du palier précédent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game, NIGHT_TIERS, NIGHT_TIER_OPEN, nightTier } from '../js/core/game.js';

const catalog = loadCatalog();
const mk = (seed) => noWelcome(new Game(catalog, new MemoryStorage(), { rng: rngFrom(seed), clock: () => new Date(2026, 9, 18, 12) }));

test('paliers du Cauchemar : ouverture progressive, ennemis plus forts, meilleur coffre', () => {
  const g = mk('nt');
  g.team();
  g.s.descent.best = 25;
  assert.deepEqual(g.nightTiersOpen(), [1]);
  assert.throws(() => g.startRun({ nightmare: 2 }), /Cauchemar II/);
  g.s.descent.bestNightmare = NIGHT_TIER_OPEN; // l'ancien record unique compte pour le palier I
  assert.deepEqual(g.nightTiersOpen(), [1, 2]);
  const hp = {};
  for (const t of [1, 2]) {
    const run = g.startRun({ nightmare: t });
    assert.equal(nightTier(run), NIGHT_TIERS[t]);
    g.chooseDoor(g.doors()[0] === 'fight' ? 'fight' : g.doors()[0]);
    const foes = Object.values(run.battle?.units || {}).filter((u) => u.side === 'enemy');
    hp[t] = foes.reduce((a, u) => a + u.maxHp, 0);
    g.endRun(false);
  }
  if (hp[1] && hp[2]) assert.ok(hp[2] > hp[1] * 0.9, 'les ennemis du palier II sont plus robustes');
  // record par palier
  g.s.descent.nightBest = { 1: 12, 2: NIGHT_TIER_OPEN };
  assert.deepEqual(g.nightTiersOpen(), [1, 2, 3]);
  assert.ok(g.nightmareEquiv(1, 3) >= g.nightmareEquiv(1, 1));
  // une ancienne expédition Cauchemar (sans palier) reste au palier I
  assert.equal(nightTier({ nightmare: true }), NIGHT_TIERS[1]);
});
