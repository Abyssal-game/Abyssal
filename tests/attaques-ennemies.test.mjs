// v558 : Rafale et Étreinte des ennemis ordinaires ; fenêtres de défense resserrées.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from './helpers.mjs';
import * as D from '../js/core/duel.js';

const catalog = loadCatalog();
const A = (id, o = {}) => D.duelUnit(catalog.get(id), o);
const E = (id, o = {}) => D.duelUnit(catalog.get(id), { side: 'enemy', ...o });
const units = (st, side) => st.order[side].map((id) => st.units[id]);
const duel = () => D.createDuel([A('INF-001', { level: 5 }), A('INF-009', { level: 5 }), A('INF-003', { level: 5 })], [E('NEC-002', { scale: 2 })], { seed: 3 });
const setup = (kind) => {
  const st = duel(), foe = units(st, 'enemy')[0], t = units(st, 'ally')[0];
  t.maxHp = t.hp = 500; foe.intent = { kind, t: t.uid, qte: true };
  return { st, foe, t };
};

test('Rafale : trois coups sans défense, une seule défense pour toute la rafale', () => {
  const a = setup('flurry');
  const ev = D.enemyAct(a.st, a.foe.uid, 'none');
  assert.equal(ev.filter((x) => x.t === 'dmg' && x.u === a.t.uid).length, 3);
  const b = setup('flurry');
  const ev2 = D.enemyAct(b.st, b.foe.uid, 'dodge');
  assert.equal(ev2.filter((x) => x.t === 'dodge').length, 1, 'une esquive, pas trois');
  const c = setup('flurry');
  D.enemyAct(c.st, c.foe.uid, 'parry');
  assert.equal(c.t.hp, 500, 'parée : aucun dégât');
});

test('Étreinte : agrippée sans défense, libre après une esquive ou une parade', () => {
  const a = setup('grab');
  D.enemyAct(a.st, a.foe.uid, 'none');
  assert.equal(a.t.frozen, 1);
  for (const d of ['dodge', 'parry']) { const b = setup('grab'); D.enemyAct(b.st, b.foe.uid, d); assert.ok(!b.t.frozen, d); }
});

test('fenêtres de défense : parade courte, toujours jouable', () => {
  const { st, foe, t } = setup('hit');
  const w = D.defenseWindow(st, foe.uid, t.uid);
  assert.ok(w.dodge >= 170 && w.dodge <= 270);
  assert.ok(w.parry >= 12 && w.parry <= 60); /* v599 : trait blanc resserré (Labo des défenses) */
});
