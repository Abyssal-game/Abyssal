import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { STARTER, TEAM, BUDGET } from '../js/core/army.js';
import { unlockSources } from '../js/core/unlocks.js';
import { FRAMES, LEVEL_TITLES } from '../js/config.js';

const catalog = loadCatalog();
const newGame = (seed) => new Game(catalog, new MemoryStorage(), { rng: rngFrom(seed), clock: () => new Date(2026, 9, 14, 12) });

test('nouveau joueur : aucune créature offerte, deux boosters de bienvenue qui forment l’équipe', () => {
  for (const seed of ['w1', 'w2', 'w3', 'w4', 'w5']) {
    const g = newGame(seed);
    assert.equal(g.s.tickets.standard, 2);
    assert.ok(g.welcomePending());
    assert.deepEqual(g.team(), []);
    assert.equal(g.uniqueCount(), 0, 'pas de Communes offertes d’office');
    g.openBooster('standard'); g.openBooster('standard');
    assert.ok(!g.welcomePending());
    const t = g.team();
    assert.ok(t.length >= TEAM.active, `équipe jouable (${seed})`);
    assert.ok(g.teamCost(t) <= BUDGET);
    assert.ok(g.startRun());
  }
});

test('filet de sécurité : sans booster et sans créatures, les 5 Communes sont offertes', () => {
  const g = newGame('w6');
  g.s.tickets.standard = 0;
  assert.deepEqual(g.team(), STARTER);
});

test('titres et cadres : chacun a une explication pour le débloquer', () => {
  const U = unlockSources(catalog);
  for (const [, t] of LEVEL_TITLES) assert.ok(U.titles.some((x) => x.name === t), t);
  for (const a of catalog.achievements) if (a.reward.title) assert.ok(U.titles.find((x) => x.name === a.reward.title).how.includes(a.name));
  for (const s of catalog.sets) if (s.reward.frame) assert.ok(U.frames.find((x) => x.key === s.reward.frame).how.length > 10);
  assert.ok(U.frames.every((f) => FRAMES[f.key] && f.how));
  assert.ok(U.frames.find((f) => f.key === 'or').how.includes(' Ou : '), 'deux façons d’obtenir le cadre d’or');
});

