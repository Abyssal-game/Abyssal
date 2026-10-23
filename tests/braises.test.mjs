// v668 : Braises de vie : les créatures tombées pendant un chapitre gagné restent à terre ; une braise les ranime.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { BRAISE } from '../js/config.js';
import { OPS } from '../js/core/ops.js';

const catalog = loadCatalog();
let now = new Date(2026, 10, 3, 12);
const newGame = (seed = 'br') => noWelcome(new Game(catalog, new MemoryStorage(), { rng: rngFrom(seed), clock: () => now }));
const ready = (g) => { const t = g.team(); assert.ok(t.length >= 3); g.s.descent.best = 0; return t; };

test('Braises : une offerte par jour, gardée jusqu’à 2, puis celles gagnées', () => {
  const g = newGame();
  g.s.createdAt = new Date(2026, 10, 3, 9).getTime();
  assert.equal(g.braises().free, 1);
  now = new Date(2026, 10, 6, 12);
  assert.equal(g.braises().free, BRAISE.max, 'la réserve gratuite plafonne');
  const t = ready(g);
  g.s.fallen = { [t[0]]: 1, [t[1]]: 1, [t[2]]: 1 };
  g.s.braises = 1;
  g.reviveFallen(t[0]); g.reviveFallen(t[1]);
  assert.equal(g.braises().free, 0); assert.equal(g.s.braises, 1, 'les braises offertes partent d’abord');
  g.reviveFallen(t[2]);
  assert.equal(g.s.braises, 0);
  assert.deepEqual(g.fallenIds(), []);
  assert.throws(() => g.reviveFallen(t[2]), /pas tombée/);
  now = new Date(2026, 10, 3, 12);
});

test('Braises : achat en cendres, ranimer impossible pendant un chapitre', () => {
  const g = newGame('br2');
  const t = ready(g);
  g.s.ash = BRAISE.ash - 1;
  assert.throws(() => g.buyBraise(), /cendres/);
  g.s.ash = BRAISE.ash; g.buyBraise();
  assert.equal(g.s.ash, 0); assert.equal(g.s.braises, 1);
  g.s.fallen = { [t[3] || t[0]]: 1 };
  g.startRun();
  assert.throws(() => g.reviveFallen(t[3] || t[0]), /chapitre/);
});

test('Braises : une créature à terre le reste au chapitre suivant ; il faut 3 créatures debout', () => {
  const g = newGame('br3');
  const t = ready(g);
  g.startRun();
  const run = g.s.descent.run; if (run.phase === 'omen') g.chooseOmen(run.omenOffer[0]);
  run.team[0].fallen = true; run.team[0].hp = 0;
  g.endRun(false); /* chapitre gagné */
  assert.ok(g.isFallen(run.team[0].id));
  assert.deepEqual(g.s.descent.last.fallen, [run.team[0].id]);
  g.startRun();
  const r2 = g.s.descent.run;
  const m = r2.team.find((x) => x.id === run.team[0].id);
  assert.ok(m.fallen && m.hp === 0, 'elle repart à terre');
  assert.equal(r2.team[r2.team.length - 1].id, m.id, 'derrière les autres');
  g.abandonRun();
  t.slice(0, 3).forEach((id) => { g.s.fallen[id] = 1; });
  assert.throws(() => g.startRun(), /debout/);
});

test('Braises : un chapitre perdu ou abandonné ne laisse personne à terre', () => {
  const g = newGame('br4');
  ready(g);
  g.startRun();
  const run = g.s.descent.run;
  run.team[0].fallen = true; run.team[0].hp = 0;
  g.abandonRun();
  assert.deepEqual(g.fallenIds(), []);
  g.startRun();
  g.s.descent.run.team[1].fallen = true;
  g.endRun(true);
  assert.deepEqual(g.fallenIds(), []);
});

test('Braises : le gardien en donne à sa première victoire (2 dès le chapitre 11)', () => {
  const g = newGame('br5');
  ready(g);
  assert.equal(g.floorReward({ floor: 5 }).braises, BRAISE.boss);
  assert.equal(g.floorReward({ floor: 4 }).braises, undefined);
  assert.equal(g.floorReward({ floor: 55 }).braises, BRAISE.bossLate);
  assert.equal(OPS.reviveFallen.kind, 'sync'); assert.equal(OPS.buyBraise.kind, 'sync');
});
