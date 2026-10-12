// Chasse aux Reliques : chemins, reliques (4 au plus), événements, marchand, butin en jeu / à l'abri, sortie, mort.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import * as HT from '../js/core/hunt.js';
import { migrate, defaultSave } from '../js/core/save.js';

const catalog = loadCatalog();
const clock = () => new Date(2026, 9, 12, 12);
const TEAM5 = ['INF-001', 'INF-009', 'INF-003', 'INF-011', 'INF-005'];
function newGame(seed = 'h', storage = new MemoryStorage()) {
  const g = new Game(catalog, storage, { rng: rngFrom(seed), clock });
  TEAM5.forEach((id) => { g.addCard(id); for (let k = 0; k < 6; k++) g.addCard(id); });
  g.setTeam(TEAM5);
  return g;
}
const strong = (g) => Object.values(g.relicRun().battle.units).forEach((u) => { if (u.side === 'ally') { u.atk = 99; u.maxHp = u.hp = 999; } });

test('chemins : deux salles différentes, combat à la première, gardien à la dernière', () => {
  for (let s = 0; s < 50; s++) {
    for (let step = 1; step < HT.HUNT.rooms; step++) {
      const p = HT.pathChoices(s, step);
      assert.equal(p.length, 2); assert.notEqual(p[0], p[1]);
      p.forEach((r) => assert.ok(HT.ROOMS[r]));
      if (step === 1) { assert.equal(p[0], 'combat'); assert.ok(!p.includes('merchant')); }
    }
    assert.deepEqual(HT.pathChoices(s, HT.HUNT.rooms), ['boss']);
    assert.deepEqual(HT.pathChoices(s, 4), HT.pathChoices(s, 4));
  }
  assert.ok(HT.EVENTS.length >= 6);
  HT.EVENTS.forEach((e) => assert.ok(e.choices.length >= 2));
});

test('départ : relique de départ, puis la salle 1 ; une seule chasse à la fois', () => {
  const g = newGame();
  const run = g.relicStart();
  assert.equal(run.phase, 'start'); assert.equal(run.offer.length, 3); assert.ok(run.paid);
  assert.throws(() => g.relicStart(), /déjà/);
  assert.throws(() => g.relicGo('combat'), /inconnu/);
  g.relicPick(run.offer[0]);
  assert.equal(run.step, 1); assert.equal(run.phase, 'paths'); assert.deepEqual(run.relics, [run.relics[0]]);
});

test('reliques : 4 au plus, remplacer en choisit une à laisser, pas de doublon', () => {
  const g = newGame();
  const run = g.relicStart();
  run.relics = ['coeur', 'oeil', 'couronne', 'miroir'];
  assert.throws(() => g.relicAdd('sablier'), /4/);
  g.relicAdd('sablier', 'oeil');
  assert.deepEqual(run.relics, ['coeur', 'couronne', 'miroir', 'sablier']);
  assert.throws(() => g.relicAdd('coeur', 'miroir'), /déjà/);
});

test('combat : les reliques passent au moteur, butin en jeu, Lanterne qui soigne', () => {
  const g = newGame();
  const run = g.relicStart();
  g.relicPick(run.offer[0]);
  run.relics = ['lanterne', 'coeur'];
  run.team.forEach((m) => { m.hp = Math.ceil(m.maxHp / 2); });
  const out = g.relicGo('combat');
  assert.ok(out.battle);
  assert.deepEqual(run.battle.relics, ['lanterne', 'coeur']);
  strong(g);
  const r = g.relicAuto();
  assert.ok(r.won); assert.ok(r.shards > 0); assert.ok(r.lantern);
  assert.equal(run.risk, r.shards); assert.equal(run.safe, 0);
  assert.equal(run.step, 2); assert.equal(run.phase, 'paths');
});

test('seuil : après la salle 3, le butin en jeu est mis à l’abri', () => {
  const g = newGame();
  const run = g.relicStart();
  g.relicPick(null);
  run.step = 3; run.risk = 80; run.phase = 'paths'; run.paths = ['combat', 'event'];
  g.relicGo('event');
  g.relicEvent(1);
  assert.equal(run.safe, 80); assert.equal(run.risk, 0); assert.equal(run.step, 4);
});

test('mort : le butin en jeu est perdu, celui à l’abri est gardé', () => {
  const g = newGame();
  const run = g.relicStart();
  g.relicPick(null);
  run.safe = 50; run.risk = 70;
  g.relicGo('combat');
  Object.values(run.battle.units).forEach((u) => { if (u.side === 'enemy') { u.atk = 999; u.maxHp = u.hp = 9999; } });
  const r = g.relicAuto();
  assert.ok(!r.won);
  assert.equal(r.summary.wiped, true); assert.equal(r.summary.shards, 50); assert.equal(r.summary.lost, 70);
  assert.equal(g.relicRun(), null);
});

test('sortie volontaire : tout le butin est gardé ; impossible au milieu d’une salle', () => {
  const g = newGame();
  const run = g.relicStart();
  g.relicPick(null);
  run.safe = 30; run.risk = 40;
  g.relicGo(run.paths[0] === 'combat' ? 'combat' : run.paths[0]);
  assert.throws(() => g.relicExit(), /entre deux salles/);
  if (run.phase === 'battle') { strong(g); g.relicAuto(); }
  const s0 = g.s.shards, want = run.safe + run.risk;
  const sum = g.relicExit();
  assert.equal(sum.shards, want); assert.ok(g.s.shards - s0 >= want);
});

test('marchand : soin, relance, relique, Passeur ; prix majorés par la Lanterne', () => {
  const g = newGame();
  const run = g.relicStart();
  g.relicPick(null);
  run.phase = 'paths'; run.paths = ['merchant', 'combat']; run.risk = 300; run.relics = ['lanterne'];
  g.relicGo('merchant');
  assert.equal(HT.shopPrice('heal', run.relics), Math.round(HT.SHOP.heal.price * 1.25));
  run.team[0].fallen = true; run.team[0].hp = 0;
  g.relicBuy('revive', run.team[0].id);
  assert.ok(!run.team[0].fallen);
  g.relicBuy('heal');
  assert.throws(() => g.relicBuy('heal'), /Déjà/);
  const k = run.shop.relics[0];
  g.relicBuy('relic', k);
  assert.ok(run.relics.includes(k));
  const before = run.risk;
  const p = g.relicBuy('passeur');
  assert.equal(p.fee, Math.ceil(before * 0.15)); assert.equal(run.risk, 0); assert.equal(run.safe, before - p.fee);
  assert.throws(() => g.relicBuy('heal'), /Pas assez|Déjà/);
  g.relicLeaveShop();
  assert.equal(run.phase, 'paths');
});

test('événements : chaque choix s’applique sans erreur', () => {
  for (const ev of HT.EVENTS) ev.choices.forEach((c, i) => {
    const g = newGame(`ev${ev.key}${i}`);
    const run = g.relicStart(); g.relicPick(null);
    run.relics = ['coeur']; run.risk = 40;
    run.phase = 'event'; run.event = ev.key;
    const out = g.relicEvent(i);
    assert.ok(out.next);
    run.team.forEach((m) => assert.ok(m.hp >= 1 || m.fallen));
  });
});

test('gardien : coffre, titre et cadre ; butin plafonné ; chasses payées limitées par jour', () => {
  const g = newGame();
  const run = g.relicStart(); g.relicPick(null);
  assert.equal(g.relicLoot(10000), HT.HUNT.lootCap);
  assert.equal(g.relicLoot(10), 0);
  run.risk = 100; run.safe = 0; run.step = HT.HUNT.rooms; run.phase = 'paths'; run.paths = HT.pathChoices(run.seed, run.step);
  g.relicGo('boss');
  assert.ok(run.battle.bossKey);
  strong(g);
  const s0 = g.s.shards, c0 = g.s.chests[HT.COFFRE_HUNT] || 0;
  const r = g.relicAuto();
  assert.ok(r.won); assert.ok(r.next.won);
  assert.equal(g.s.chests[HT.COFFRE_HUNT], c0 + 1);
  assert.ok(g.s.frames.includes('reliques'));
  assert.ok(g.s.shards - s0 >= r.next.shards); assert.equal(r.next.shards, 100 + r.shards);
  // deuxième chasse payée, puis une troisième sans récompense
  g.relicStart(); g.relicPick(null); g.relicExit();
  const third = g.relicStart(); g.relicPick(null);
  assert.equal(third.paid, false);
  third.risk = 200;
  assert.equal(g.relicExit().shards, 0);
});

test('sauvegarde : une chasse en cours survit au rechargement ; ancienne sauvegarde complétée', () => {
  const storage = new MemoryStorage();
  const g = newGame('sv', storage);
  const run = g.relicStart(); g.relicPick(run.offer[1]);
  const g2 = new Game(catalog, storage, { rng: rngFrom('sv2'), clock });
  assert.equal(g2.relicRun().step, 1);
  assert.deepEqual(g2.relicRun().relics, run.relics);
  const old = defaultSave(); delete old.relics;
  const m = migrate(old);
  assert.equal(m.relics.run, null); assert.equal(m.relics.paidToday, 0);
});
