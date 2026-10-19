// v460 puis v495 : force des ennemis réglée étage par étage (FOE_EASE, BOSS_EASE), sans jamais faire marche arrière.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lateSoft, bossEase, FOE_EASE, BOSS_EASE, enemyScale } from '../js/core/descent.js';

test('réglage des ennemis : points reliés, bornes respectées', () => {
  assert.equal(lateSoft(1), FOE_EASE[0][1]); assert.equal(lateSoft(5), 1);
  assert.equal(lateSoft(100), FOE_EASE.at(-1)[1]); assert.equal(lateSoft(150), FOE_EASE.at(-1)[1]);
  assert.equal(bossEase(100), BOSS_EASE.at(-1)[1]);
  for (let f = 1; f <= 100; f++) { assert.ok(lateSoft(f) > 0.5 && lateSoft(f) <= 1); assert.ok(bossEase(f) > 0.5 && bossEase(f) <= 1.1); }
});
test('la difficulté des combats ordinaires monte étage après étage (pas de marche arrière)', () => {
  for (let f = 1; f < 100; f++) assert.ok(enemyScale(f + 1) * lateSoft(f + 1) >= enemyScale(f) * lateSoft(f), `étage ${f}`);
});
