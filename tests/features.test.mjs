import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { noWelcome } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { ECONOMY } from '../js/config.js';

const catalog = loadCatalog();
const newGame = (seed = 'f', day = new Date(2026, 9, 10, 12)) => noWelcome(new Game(catalog, new MemoryStorage(), { rng: rngFrom(seed), clock: () => day }));

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

test('Fournaise : brûler des doublons ou la dernière carte, monter de niveau avec les cendres', () => {
  const g = noWelcome(new Game(catalog, new MemoryStorage(), { rng: () => 0.999, clock: () => new Date(2026, 9, 10) }));
  g.team(); g.s.ash = 0; // créatures de départ ; on part sans les cendres offertes
  const target = catalog.byRarity.R[0];
  const r1 = g.addCard(target.id);
  assert.equal(r1.isNewCard, true);
  const r2 = g.addCard(target.id);
  assert.equal(r2.dup, true);
  assert.equal(r2.burn, ECONOMY.burnAsh.R);
  assert.equal(g.s.ash, 0, 'un doublon ne donne rien tout seul');
  assert.equal(g.cardLevel(target.id), 1, 'un doublon ne fait plus monter de niveau');
  g.addCard(target.id); g.addCard(target.id, 'holo');
  assert.equal(g.spare(target.id), 2);
  // tout brûler : on garde un exemplaire de chaque finition
  const b = g.burnSpares();
  assert.equal(b.n, 2);
  assert.equal(g.s.ash, 2 * ECONOMY.burnAsh.R);
  assert.deepEqual(g.entry(target.id).v, { normal: 1, holo: 1 });
  // la finition rare vaut plus
  assert.equal(g.burnValue(target.id, 'holo'), ECONOMY.burnAsh.R * ECONOMY.burnFinish.holo);
  // niveau : coût = base × niveau
  g.s.ash = 1000;
  assert.equal(g.upgradeCost(target.id), ECONOMY.levelAsh.R);
  g.upgrade(target.id);
  assert.equal(g.cardLevel(target.id), 2);
  assert.equal(g.s.ash, 1000 - ECONOMY.levelAsh.R);
  assert.equal(g.upgradeCost(target.id), ECONOMY.levelAsh.R * 2);
  g.s.ash = 0;
  assert.throws(() => g.upgrade(target.id));
  // brûler la dernière carte : elle quitte la collection (et l'équipe)
  g.s.team = [target.id, ...g.s.team.slice(0, 2)];
  g.burn(target.id, 'holo');
  const last = g.burn(target.id, 'normal');
  assert.equal(last.gone, true);
  assert.equal(g.owns(target.id), false);
  assert.ok(!g.s.team.includes(target.id));
  // retrouvée plus tard : elle repart du niveau 1
  g.addCard(target.id);
  assert.equal(g.cardLevel(target.id), 1);
});
