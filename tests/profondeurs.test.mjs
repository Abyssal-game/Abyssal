// v331 : départs avancés, traits des profondeurs, paliers au-delà de l'étage 30.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { foeTraits, TRAITS, DEEP_FROM } from '../js/core/descent.js';
import * as D from '../js/core/duel.js';

const catalog = loadCatalog();
const mk = (seed) => noWelcome(new Game(catalog, new MemoryStorage(), { rng: rngFrom(seed), clock: () => new Date(2026, 9, 16, 12) }));

test('départs avancés : ouverts par les gardiens vaincus, coffre plus bas et 3 étages minimum', () => {
  const g = mk('dep');
  g.team();
  assert.deepEqual(g.startFloors(), [1]);
  assert.throws(() => g.startRun({ start: 6 }), /pas encore ouvert/);
  g.s.descent.best = 17;
  assert.deepEqual(g.startFloors(), [1, 6, 11, 16]);
  const run = g.startRun({ start: 11 });
  assert.equal(run.floor, 11);
  assert.equal(run.cleared, 10);
  run.cleared = 12;
  assert.equal(g.chestNow(run), null, 'deux étages franchis : pas de coffre');
  run.cleared = 13;
  assert.equal(g.chestNow(run), 'bois', 'fer à l’étage 13, un rang plus bas');
  const sum = g.endRun(false);
  assert.equal(sum.start, 11);
  assert.deepEqual(sum.chests, ['bois']);
  assert.equal(g.s.descent.bestToday, 0, 'hors classement du jour');
});

test('traits des profondeurs : jamais avant l’étage 31, plus nombreux après', () => {
  const deep = Object.keys(TRAITS).filter((k) => TRAITS[k].deep);
  assert.equal(deep.length, 3);
  for (let f = 3; f < DEEP_FROM; f++) for (let day = 0; day < 20; day++) assert.ok(!foeTraits(`d${day}`, f, 'fight', 3).some((t) => deep.includes(t)));
  let seen = 0;
  for (let day = 0; day < 60; day++) seen += foeTraits(`d${day}`, 35, 'fight', 3).filter((t) => deep.includes(t)).length;
  assert.ok(seen > 10);
});

test('Épineux renvoie 2 dégâts, Vampire se soigne', () => {
  const A = (id) => D.duelUnit(catalog.get(id));
  const E = (id, o = {}) => ({ ...D.duelUnit(catalog.get(id), { side: 'enemy', scale: 3 }), ...o });
  const st = D.createDuel([A('INF-001'), A('INF-002'), A('INF-004')], [E('NEC-010', { trait: 'epineux' })], { seed: 3 });
  const a = st.units[st.order.ally[0]], t = st.units[st.order.enemy[0]];
  const hp0 = a.hp;
  D.act(st, a.uid, 'attack', t.uid);
  assert.equal(a.hp, hp0 - 2);
  const st2 = D.createDuel([A('INF-001')], [E('NEC-010', { trait: 'vampire' })], { seed: 3 });
  const v = st2.units[st2.order.enemy[0]]; v.hp = v.maxHp - 10;
  const before = v.hp;
  for (let k = 0; k < 4 && !st2.over; k++) D.endTurn(st2);
  assert.ok(v.hp > before || v.hp === v.maxHp, 'il récupère des PV en frappant');
});

test('palier de l’étage 40 : récompensé une seule fois', () => {
  const g = mk('pal');
  g.s.descent.best = 39;
  const t0 = g.s.tickets.premium || 0, s0 = g.s.shards;
  g.recordDepth(40);
  assert.equal(g.s.tickets.premium, t0 + 1);
  assert.ok(g.s.shards >= s0 + 200);
  g.recordDepth(40);
  assert.equal(g.s.tickets.premium, t0 + 1);
});
