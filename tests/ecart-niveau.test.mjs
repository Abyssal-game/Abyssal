// v493 : écart de niveau dans la Descente : une équipe trop faible pour l'étage n'est plus protégée et blesse moins.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from './helpers.mjs';
import { duelUnit, createDuel, allyCap, dmgOf } from '../js/core/duel.js';
import { refPowFor } from '../js/core/game.js';

const catalog = loadCatalog();
const C = catalog.cards.find((c) => c.rarity === 'C'), M = catalog.cards.find((c) => c.rarity === 'M');

test('écart de niveau : protection et dégâts selon la force attendue à l’étage', () => {
  const weak = duelUnit(C, { level: 1 }), strong = duelUnit(M, { level: 10 });
  const foe = duelUnit(M, { side: 'enemy', scale: 3.6, boss: true });
  const deep = createDuel([weak, strong], [foe], { refPow: refPowFor(70) }), near = createDuel([weak, strong], [foe], { refPow: refPowFor(5) });
  const w = Object.values(deep.units).find((u) => u.id === C.id), s = Object.values(deep.units).find((u) => u.id === M.id);
  // à l'étage 70, la commune niveau 1 peut être abattue d'un coup ; la Mythique niveau 10 garde sa protection
  assert.ok(allyCap(w, 'hit', deep) >= w.maxHp);
  assert.equal(allyCap(s, 'hit', deep), allyCap(s, 'hit', null));
  assert.equal(allyCap(w, 'hit', near), allyCap(w, 'hit', null));
  // et ses coups font moins mal à ces profondeurs
  const e = Object.values(deep.units).find((u) => u.side === 'enemy'), e2 = Object.values(near.units).find((u) => u.side === 'enemy');
  const w2 = Object.values(near.units).find((u) => u.id === C.id);
  assert.ok(dmgOf(deep, w, e) < dmgOf(near, w2, e2));
});
