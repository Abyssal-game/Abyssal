import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game2, chestForDepth } from '../v2/js/game.js';
import { POOL, STARTER, roleOf, levelFromDups, MAX_LEVEL, BUDGET, makeCreature } from '../v2/js/units.js';

const catalog = loadCatalog();
const day = new Date(2026, 9, 12, 12);
const newGame = (seed = 'v') => new Game2(catalog, new MemoryStorage(), { rng: rngFrom(seed), clock: () => day });

test('v2 : le prototype démarre avec 5 créatures et une équipe valide', () => {
  const g = newGame();
  assert.equal(POOL.filter((id) => catalog.get(id)).length, POOL.length, 'toutes les cartes du prototype existent');
  assert.deepEqual(g.s.team, STARTER);
  assert.ok(g.teamCost() <= BUDGET);
  assert.equal(new Set(STARTER.map((id) => roleOf(catalog.get(id)))).size, 5, 'cinq rôles différents au départ');
});

test('v2 : doublons → niveaux, puis cendres au niveau maximum', () => {
  const g = newGame('d');
  const id = STARTER[0];
  assert.equal(g.level(id), 1);
  assert.equal(g.addCard(id).levelUp, 2);
  assert.equal(levelFromDups(100).level, MAX_LEVEL);
  g.s.cards[id].n = 200;
  assert.ok(g.addCard(id).ash > 0);
  assert.ok(makeCreature(catalog.get(id), { level: 10 }).maxHp > makeCreature(catalog.get(id), { level: 1 }).maxHp);
});

test('v2 : budget d’équipe et pouvoir ultime', () => {
  const g = newGame('b');
  ['ART-039', 'NEC-044', 'ABY-043'].forEach((id) => g.addCard(id));
  assert.throws(() => g.setTeam(['ART-039', 'NEC-044', 'ABY-043', 'NEC-001', 'INF-001']), /budget/);
  g.setTeam(['ART-039', 'NEC-001', 'INF-001', 'CEL-001', 'SAU-014']);
  assert.equal(g.ultimate().key, 'aegis');
  g.setTeam(['NEC-001', 'INF-001', 'CEL-001']);
  assert.equal(g.ultimate().key, 'sceau');
});

test('v2 : boosters gratuits et payants, garantie Hyper rare', () => {
  const g = newGame('p');
  assert.equal(g.freePack().stock, 2);
  g.buyPack(); g.buyPack();
  assert.equal(g.freePack().stock, 0);
  const shards = g.s.shards;
  assert.equal(g.buyPack().length, 5);
  assert.equal(g.s.shards, shards - 100);
  g.s.pity.sinceHR = 9;
  const cards = g.drawPack('standard');
  assert.ok(cards.some((c) => ['HR', 'M', 'S'].includes(catalog.get(c.id).rarity)));
});

test('v2 : une expédition complète rapporte un coffre selon la profondeur, qui contient des boosters', () => {
  assert.equal(chestForDepth(3), 'bois'); assert.equal(chestForDepth(7), 'fer'); assert.equal(chestForDepth(12), 'or'); assert.equal(chestForDepth(16), 'abyssal');
  const g = newGame('r');
  g.startRun();
  assert.equal(g.torchesLeft(), 2);
  for (let k = 0; k < 300 && g.s.descent.run; k++) {
    const r = g.s.descent.run;
    if (r.phase === 'doors') { const o = g.chooseDoor(g.doors()[0]); if (o.battle) g.autoResolve(); }
    else if (r.phase === 'altar') g.chooseBlessing(r.altar[0]);
    else if (r.cleared >= 3) g.endRun(false);
    else g.nextFloor();
  }
  const last = g.s.descent.last;
  assert.ok(last.floor >= 1);
  const n = g.chestCount();
  assert.ok(n >= 1, 'au moins un coffre');
  const type = Object.keys(g.s.chests).find((k) => g.s.chests[k] > 0);
  const before = Object.keys(g.s.cards).length + Object.values(g.s.cards).reduce((a, e) => a + e.n, 0);
  const packs = g.openChest(type);
  assert.ok(packs.length >= 1 && packs.every((p) => p.cards.length === 5));
  const after = Object.keys(g.s.cards).length + Object.values(g.s.cards).reduce((a, e) => a + e.n, 0);
  assert.ok(after > before);
});

test('v2 : combat avec réserve (relève et remplacement tactique)', async () => {
  const { createBattle, act, beginTurn, current, front, bench } = await import('../js/core/battle.js');
  const { makeEnemy } = await import('../js/core/heroes.js');
  const g = newGame('s');
  const team = STARTER.map((id) => makeCreature(catalog.get(id)));
  const st = createBattle(team, [makeEnemy(catalog.cards[0], { level: 1 })], 5);
  assert.equal(front(st, 'ally').length, 3);
  assert.equal(bench(st, 'ally').length, 2);
  while (current(st).side !== 'ally') { beginTurn(st); const u = current(st); act(st, { actor: u.uid, action: 'enemy' }); }
  beginTurn(st);
  const u = current(st), r = bench(st, 'ally')[0];
  act(st, { actor: u.uid, action: 'swap', target: r.uid });
  assert.ok(front(st, 'ally').includes(r), 'la réserve entre');
  assert.ok(bench(st, 'ally').includes(u), 'la créature sort');
  // une créature tombée est remplacée par la réserve
  front(st, 'ally')[0].hp = 0;
  assert.equal(front(st, 'ally').length, 3);
  assert.ok(g);
});
