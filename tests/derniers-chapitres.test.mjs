// v460 : derniers chapitres adoucis pour les ennemis ordinaires et les élites ; les gardiens gardent leur force.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lateSoft, LATE_SOFT, enemyScale } from '../js/core/descent.js';

test('adoucissement : rien jusqu’à l’étage 30, puis jusqu’à −25 % à l’étage 100', () => {
  assert.equal(lateSoft(5), 1); assert.equal(lateSoft(30), 1);
  assert.ok(lateSoft(65) < 1 && lateSoft(65) > lateSoft(95));
  assert.equal(lateSoft(100), 1 - LATE_SOFT.at100);
  assert.equal(LATE_SOFT.at100, 0.25);
  // la difficulté continue de monter étage après étage (pas de marche arrière)
  for (let f = 30; f < 100; f++) assert.ok(enemyScale(f + 1) * lateSoft(f + 1) >= enemyScale(f) * lateSoft(f));
});
