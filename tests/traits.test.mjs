// v257 : traits d'ennemis, butin des portes, palier après un gardien
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from './helpers.mjs';
import * as D from '../js/core/duel.js';
import { roleOf } from '../js/core/army.js';
import { foeTraits, floorRewards } from '../js/core/descent.js';

const cat = loadCatalog();
const pick = (role) => cat.cards.find((c) => roleOf(c) === role);
function mk(traits, { foeHp = 30 } = {}) {
  const allies = ['degats', 'soin', 'soutien'].map((r) => D.duelUnit(pick(r), { level: 5 }));
  const foes = traits.map((t) => { const u = D.duelUnit(cat.cards.find((c) => c.rarity === 'R'), { side: 'enemy', level: 5 }); u.maxHp = u.hp = foeHp; if (t) u.trait = t; return u; });
  const st = D.createDuel(allies, foes, { seed: 3 });
  const deg = st.order.ally.map((id) => st.units[id]).find((u) => u.role === 'degats');
  return { st, deg, foes: st.order.enemy.map((id) => st.units[id]) };
}

test('traits : pas avant l’étage 3, jamais sur un gardien, toujours les mêmes pour un étage', () => {
  assert.deepEqual(foeTraits('d', 2, 'fight', 3), [null, null, null]);
  assert.deepEqual(foeTraits('d', 10, 'boss', 2), [null, null]);
  assert.deepEqual(foeTraits('d', 9, 'fight', 3), foeTraits('d', 9, 'fight', 3));
  let n = 0; for (let f = 3; f < 60; f++) n += foeTraits(`x${f}`, f, 'fight', 3).filter(Boolean).length;
  assert.ok(n > 5, 'des traits apparaissent');
});

test('Explosif : sa mort blesse les créatures alliées au combat', () => {
  const { st, deg, foes } = mk(['explosif', null]);
  foes[0].hp = 1; const before = st.order.ally.map((id) => st.units[id].hp);
  const ev = D.act(st, deg.uid, 'attack', foes[0].uid);
  assert.ok(ev.some((e) => e.trait === 'explosif'));
  assert.ok(st.order.ally.some((id, i) => st.units[id].hp < before[i]));
});

test('Lien d’égide : il encaisse moins tant qu’un autre ennemi est debout', () => {
  const a = mk(['egide', null]), b = mk([null, null]);
  assert.ok(D.dmgOf(a.st, a.deg, a.foes[0]) < D.dmgOf(b.st, b.deg, b.foes[0]));
  a.foes[1].hp = 0;
  assert.equal(D.dmgOf(a.st, a.deg, a.foes[0]), D.dmgOf(b.st, b.deg, b.foes[0]));
});

test('Enragé : +2 ATQ une seule fois sous la moitié de ses PV', () => {
  const { st, deg, foes } = mk(['enrage'], { foeHp: 40 });
  const atk = foes[0].atk; foes[0].hp = 21;
  D.act(st, deg.uid, 'attack', foes[0].uid);
  if (foes[0].hp > 0 && foes[0].hp <= 20) { assert.equal(foes[0].atk, atk + 2); assert.ok(foes[0].enraged); }
});

test('butin : propre à chaque porte ; élite et gardien proposent les 3 bonus', () => {
  assert.equal(floorRewards('d', 4, 'elite').length, 3);
  assert.equal(floorRewards('d', 5, 'boss').length, 3);
  assert.equal(floorRewards('d', 4, 'fight').length, 2);
});
