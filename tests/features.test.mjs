import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { RITUAL } from '../js/config.js';

const catalog = loadCatalog();
const newGame = (seed = 'f', day = new Date(2026, 9, 10, 12)) => new Game(catalog, new MemoryStorage(), { rng: rngFrom(seed), clock: () => day });

test('missions du jour : trois types différents, stables dans la journée, renouvelées le lendemain', () => {
  const g = newGame();
  const a = g.missions().list.map((x) => x.key);
  assert.equal(a.length, 3);
  assert.equal(new Set(g.missions().list.map((x) => x.kind)).size, 3);
  assert.deepEqual(g.missions().list.map((x) => x.key), a);
  const g2 = newGame('f', new Date(2026, 9, 11, 12));
  assert.equal(g2.missions().day, '2026-10-11');
});

test('missions : progression, récompense et bonus', () => {
  const g = newGame();
  const m = g.missions();
  m.list = [
    { key: 'open2', kind: 'booster', n: 2, shards: 50, p: 0, claimed: false },
    { key: 'offering', kind: 'daily', n: 1, shards: 30, p: 0, claimed: false },
    { key: 'new3', kind: 'new', n: 3, shards: 50, p: 0, claimed: false },
  ];
  g.s.shards = 10000;
  g.openBooster('standard'); g.openBooster('standard');
  g.claimDaily();
  assert.equal(m.list[0].p, 2);
  assert.equal(m.list[1].p, 1);
  assert.ok(m.list[2].p >= 3);
  const before = g.s.shards;
  g.claimMission(0); g.claimMission(1); g.claimMission(2);
  assert.equal(g.s.shards, before + 130);
  assert.throws(() => g.claimMission(0));
  const t = g.s.tickets.standard;
  g.claimMission('bonus');
  assert.equal(g.s.tickets.standard, t + 1);
  assert.throws(() => g.claimMission('bonus'));
});

test('chance : statistiques et plus belles ouvertures', () => {
  const g = newGame('luck');
  g.s.shards = 100000;
  for (let i = 0; i < 12; i++) g.openBooster('standard');
  const st = g.s.stats;
  assert.equal(Object.values(st.pulls).reduce((a, b) => a + b, 0), 60);
  assert.ok(st.expHR > 0);
  assert.ok(g.s.best.length === 5);
  for (let i = 1; i < 5; i++) assert.ok(g.s.best[i - 1].score >= g.s.best[i].score);
});

test('rituel : toujours réussi, payé en cendres, les doublons sont gardés', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: () => 0.999, clock: () => new Date(2026, 9, 10) });
  const target = catalog.byRarity.R[0];
  for (let i = 0; i < 3; i++) g.addCard(target.id);
  const lvl = g.cardLevel(target.id);
  assert.equal(g.ritualTarget(target.id, 'normal'), 'holo');
  const cost = g.ritualCost(target.id, 'normal');
  assert.equal(cost, RITUAL.cost.holo);
  g.s.ash = cost - 1;
  assert.throws(() => g.ritual(target.id, 'normal'));
  g.s.ash = cost + 5;
  const r = g.ritual(target.id, 'normal');
  assert.ok(r.success);
  assert.equal(g.s.ash, 5);
  assert.equal(g.entry(target.id).v.holo, 1);
  assert.equal(g.entry(target.id).v.normal, 2);
  assert.equal(g.cardLevel(target.id), lvl);
  // ancienne ferveur : réduction du coût
  g.s.fervor[`${target.id}:gold`] = 2;
  assert.equal(g.ritualCost(target.id, 'holo'), Math.round(RITUAL.cost.gold * 0.8 / 5) * 5);
  // les C et PC n'ont pas de feuille d'or : holographique -> cosmique
  assert.equal(g.ritualTarget(catalog.byRarity.C[0].id, 'holo'), 'galaxy');
});
