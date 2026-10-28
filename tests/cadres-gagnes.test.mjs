// v875 : les cadres de l'Échoppe ne sont plus vendus ; chacun se gagne (niveau de profil ou succès), y compris rétroactivement.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { CATALOG, EARNED_FRAMES, CODEX_FRAMES } from '../js/core/codex.js';
import { LEVEL_FRAMES } from '../js/config.js';
import { unlockSources } from '../js/core/unlocks.js';

test('aucun cadre en vente, chaque ancien cadre de l’Échoppe se gagne une seule fois', () => {
  const cat = loadCatalog();
  assert.ok(!CATALOG.some((it) => it.kind === 'frame'));
  const from = [...LEVEL_FRAMES.map(([, f]) => f), ...cat.achievements.map((a) => a.reward?.frame).filter((f) => f?.startsWith('cx-'))];
  for (const f of EARNED_FRAMES) { assert.ok(CODEX_FRAMES[f], f); assert.equal(from.filter((x) => x === f).length, 1, f); }
  const U = unlockSources(cat);
  for (const f of EARNED_FRAMES) assert.ok(U.frames.some((x) => x.key === f && x.how), `explication pour ${f}`);
});

test('cadres des niveaux et des succès déjà atteints donnés au joueur', () => {
  const g = new Game(loadCatalog(), new MemoryStorage());
  g.s.xp = 200000; g.checkProgress?.();
  assert.ok(g.s.level >= 50);
  for (const [, f] of LEVEL_FRAMES) assert.ok(g.s.frames.includes(f), f);
  g.s.achievements.depth_20 = 1; g.checkProgress?.();
  assert.ok(g.s.frames.includes('cx-vif-foudre'));
});
