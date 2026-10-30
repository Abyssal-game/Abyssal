// v460 puis v495 : force des ennemis réglée étage par étage (FOE_EASE, BOSS_EASE), sans jamais faire marche arrière.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lateSoft, bossEase, FOE_EASE, BOSS_EASE, enemyScale } from '../js/core/descent.js';

test('réglage des ennemis : points reliés, bornes respectées', () => {
  assert.equal(lateSoft(1), FOE_EASE[0][1]); assert.ok(lateSoft(5) > 1, 'v502 : premiers étages relevés');
  assert.equal(lateSoft(100), FOE_EASE.at(-1)[1]); assert.equal(lateSoft(150), FOE_EASE.at(-1)[1]);
  assert.equal(bossEase(100), BOSS_EASE.at(-1)[1]);
  for (let f = 1; f <= 100; f++) { assert.ok(lateSoft(f) > 0.5 && lateSoft(f) <= 2.7); assert.ok(bossEase(f) > 0.5 && bossEase(f) <= 2.4) /* v606 : gardien du 55 à ×1,54 ; v871 : recalage mesuré, gardien du 90 à ×1,72 ; v928 : recalage après la défense touche par touche (étages 23-27 à ×2,6, gardien du 15 à ×2,33) */; }
});
/* v871 : la courbe suit la mesure des victoires (tools/campagne-sim.mjs) : la force brute peut baisser là où la composition
   des ennemis faisait un mur (étages 12, 28), jamais de plus de 30 % d'un étage au suivant, et elle monte de bout en bout */
test('la difficulté des combats ordinaires : pas de chute brutale, montée de bout en bout', () => {
  for (let f = 1; f < 100; f++) assert.ok(enemyScale(f + 1) * lateSoft(f + 1) >= 0.7 * enemyScale(f) * lateSoft(f), `étage ${f}`);
  assert.ok(enemyScale(99) * lateSoft(99) > 1.1 * enemyScale(20) * lateSoft(20)); /* v928 : 1,3 → 1,1 (le recalage a surtout relevé les étages 15-50) */
});
