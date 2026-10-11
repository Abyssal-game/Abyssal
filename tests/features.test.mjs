import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { FUSION } from '../js/config.js';

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

test('fusion : 5 doublons communs donnent une peu commune, la première copie est gardée', () => {
  const g = newGame('fusion');
  const commons = catalog.byRarity.C.slice(0, 3);
  commons.forEach((c) => { for (let i = 0; i < 3; i++) g.addCard(c.id); }); // 2 doublons chacune = 6
  assert.equal(g.spareCount('C'), 6);
  const r = g.fuse('C');
  assert.equal(catalog.get(r.id).rarity, 'PC');
  assert.equal(r.used.length, FUSION.cost);
  assert.equal(g.spareCount('C'), 1);
  commons.forEach((c) => assert.ok(g.entry(c.id).v.normal >= 1));
  assert.throws(() => g.fuse('C'));
  assert.throws(() => g.fuse('M'));
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

test('rituel : chance calculée, réussite transforme la carte, échec augmente la ferveur', () => {
  const always = new Game(catalog, new MemoryStorage(), { rng: () => 0, clock: () => new Date(2026, 9, 10) });
  const target = catalog.byRarity.R[0];
  always.addCard(target.id);
  const commons = catalog.byRarity.C.slice(0, 4);
  commons.forEach((c) => { for (let i = 0; i < 4; i++) always.addCard(c.id); }); // 12 doublons C
  assert.equal(always.ritualTarget(target.id, 'normal'), 'holo');
  assert.equal(always.ritualChance(target.id, 'normal', {}), 0);
  assert.equal(always.ritualChance(target.id, 'normal', { C: 5 }), 20);
  const r = always.ritual(target.id, 'normal', { C: 5 });
  assert.ok(r.success);
  assert.equal(always.entry(target.id).v.holo, 1);
  assert.equal(always.entry(target.id).v.normal, 0);
  assert.equal(always.spareCount('C'), 7);

  const never = new Game(catalog, new MemoryStorage(), { rng: () => 0.999, clock: () => new Date(2026, 9, 10) });
  never.addCard(target.id);
  commons.forEach((c) => { for (let i = 0; i < 4; i++) never.addCard(c.id); });
  const r2 = never.ritual(target.id, 'normal', { C: 2 });
  assert.ok(!r2.success);
  assert.equal(never.s.fervor[`${target.id}:holo`], 1);
  assert.ok(never.owns(target.id));
  assert.equal(never.ritualChance(target.id, 'normal', { C: 2 }), 20);
  // rituel interdit raté : la carte est consumée
  const r3 = never.ritual(target.id, 'normal', { C: 2 }, true);
  assert.ok(r3.lost);
  assert.ok(!never.owns(target.id));
  // les C et PC n'ont pas de feuille d'or : holographique -> cosmique
  assert.equal(never.ritualTarget(commons[0].id, 'holo'), 'galaxy');
});
