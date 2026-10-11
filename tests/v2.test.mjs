import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game2, chestForDepth } from '../v2/js/game.js';
import { POOL, STARTER, roleOf, levelFromDups, MAX_LEVEL, BUDGET } from '../v2/js/units.js';
import { duelUnit } from '../v2/js/duel.js';

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
  assert.ok(duelUnit(catalog.get(id), { level: 10 }).maxHp > duelUnit(catalog.get(id), { level: 1 }).maxHp);
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

test('v2 : duel de cartes — riposte, Garde, Assaut, réserve, ultime', async () => {
  const D = await import('../v2/js/duel.js');
  const card = (id) => catalog.get(id);
  // Garde : doit être attaquée en premier
  const allies = STARTER.map((id) => D.duelUnit(card(id)));
  const foes = ['NEC-001', 'INF-001'].map((id) => D.duelUnit(card(id), { side: 'enemy' }));
  const st = D.createDuel(allies, foes, { ult: 'nova' });
  const guard = Object.values(st.units).find((u) => u.side === 'enemy' && u.kw === 'garde');
  assert.deepEqual(D.targetsFor(st, 'ally'), [guard.uid]);
  // riposte : l'attaquant (sans Assaut) prend des dégâts
  const atk = D.front(st, 'ally').find((u) => u.kw !== 'assaut' && u.atk > 0);
  const hp0 = atk.hp, ghp = guard.hp;
  D.attack(st, atk.uid, guard.uid);
  assert.ok(guard.hp < ghp && atk.hp < hp0, 'dégâts et riposte');
  assert.equal(D.canAct(st, atk), false, 'une attaque par tour');
  // Assaut : pas de riposte
  const as = D.front(st, 'ally').find((u) => u.kw === 'assaut');
  const ahp = as.hp; D.attack(st, as.uid, guard.uid);
  assert.equal(as.hp, ahp);
  // fin du tour : les ennemis jouent, puis c'est de nouveau à nous
  D.endTurn(st);
  assert.equal(st.turn, 'ally');
  // réserve : une carte tombée est remplacée
  assert.equal(D.reserve(st, 'ally').length + D.front(st, 'ally').length, D.alive(st, 'ally').length);
  D.front(st, 'ally')[0].hp = 0;
  assert.equal(D.front(st, 'ally').length, Math.min(3, D.alive(st, 'ally').length));
  // ultime quand la jauge est pleine
  st.gauge = D.GAUGE_MAX;
  assert.ok(D.ultReady(st));
  const ev = D.useUlt(st);
  assert.ok(ev.some((e) => e.t === 'ult') && st.gauge === 0);
  // un duel automatique se termine
  const st2 = D.createDuel(STARTER.map((id) => D.duelUnit(card(id))), ['ABY-001', 'PRI-001', 'CEL-001'].map((id) => D.duelUnit(card(id), { side: 'enemy' })));
  D.autoDuel(st2);
  assert.ok(['won', 'lost'].includes(st2.over));
  assert.ok(st2.round < 20);
});
