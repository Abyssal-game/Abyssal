// v427 : Enchères de Mammon (annulations, lots qui restent, familles, fin) et Énigmes des Sceaux (fabrication, essais, étoiles).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import * as EN from '../js/core/encheres.js';
import * as EG from '../js/core/enigmes.js';

const catalog = loadCatalog();
const clock = () => new Date(2026, 9, 18, 12);

test('enchères : 15 lots (10 créatures, 5 malédictions), 15 offrandes chacun, illustrations de la bonne faction', () => {
  const st = EN.newGame(catalog, { table: 'etal', seed: 3 });
  assert.equal(st.lots.length, 15);
  assert.deepEqual(st.lots.map((l) => l.v).sort((a, b) => a - b), [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.ok(st.lots.filter((l) => l.v > 0).every((l) => catalog.get(l.id)?.faction === l.f));
  for (const x of EN.SEATS) assert.equal(st.offers[x].length, 15);
});

test('enchères : les offrandes identiques s’annulent ; la plus haute prend la créature, la plus basse la malédiction', () => {
  const st = EN.newGame(null, { table: 'etal', seed: 1 });
  st.lots[0] = { v: 7, f: 'infernal' };
  let ev = EN.resolve(st, { p: 9, a: 12, b: 12 });
  assert.deepEqual(ev.cancelled.sort(), ['a', 'b']); assert.equal(ev.taker, 'p', 'les 12 s’annulent : le 9 seul l’emporte');
  st.lots[1] = { v: -3, f: null };
  ev = EN.resolve(st, { p: 2, a: 1, b: 5 });
  assert.equal(ev.taker, 'a', 'la plus basse prend la malédiction');
  assert.ok(!st.offers.p.includes(9) && !st.offers.p.includes(2), 'offrandes jouées perdues');
  assert.throws(() => EN.resolve(st, { p: 9, a: 3, b: 3 }), /déjà jouée/);
});

test('enchères : si tout s’annule, le lot reste sur la table et s’ajoute au suivant', () => {
  const st = EN.newGame(null, { table: 'etal', seed: 2 });
  st.lots[0] = { v: 4, f: 'celeste' }; st.lots[1] = { v: -2, f: null };
  let ev = EN.resolve(st, { p: 5, a: 5, b: 5 });
  assert.equal(ev.taker, null); assert.equal(st.pot.length, 1);
  ev = EN.resolve(st, { p: 3, a: 8, b: 1 });
  assert.equal(ev.value, 2, '4 − 2 : la pile reste positive');
  assert.equal(ev.taker, 'a'); assert.equal(st.won.a.length, 2); assert.equal(st.pot.length, 0);
});

test('enchères : trois créatures d’une faction = +5 ; la vente se termine après 15 lots ; l’IA joue des offrandes valides', () => {
  const st = EN.newGame(null, { table: 'grande', seed: 9 });
  st.won.p = [{ v: 1, f: 'sauvage' }, { v: 2, f: 'sauvage' }, { v: 3, f: 'sauvage' }, { v: -1, f: null }];
  assert.equal(EN.scoreOf(st, 'p').total, 5 + 5);
  const r = rngFrom('en');
  for (const T of EN.TABLES) {
    const s2 = EN.newGame(null, { table: T.key, seed: 4 });
    while (!s2.over) { const b = EN.aiBids(s2, r); EN.resolve(s2, { p: EN.aiBid(s2, 'p', { skill: 3, noise: 0.1, bias: 0, sets: 1, bluff: 0 }, r), ...b }); }
    assert.equal(s2.i, 15); assert.ok(['won', 'lost'].includes(s2.over)); assert.equal(s2.final.order.length, 3);
  }
});

test('enchères : récompenses une fois, déblocage dans l’ordre, défi du jour', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('en2'), clock });
  assert.throws(() => g.encheresStart({ table: 'etal' }), /gardien/);
  g.s.bossesBeaten.devoreur = 1;
  assert.throws(() => g.encheresStart({ table: 'reliques' }), /précédente/);
  const before = g.s.shards;
  g.encheresStart({ table: 'etal' }); g.s.encheres.cur.over = 'won'; g.s.encheres.cur.final = { scores: { p: 30, a: 10, b: 5 }, order: ['p', 'a', 'b'] };
  const o = g.encheresFinish();
  assert.equal(o.first, true); assert.deepEqual(o.chests, ['bois']);
  assert.equal(g.s.shards - before, EN.ENCHERES_REWARD.firstWin + EN.TABLE.etal.reward);
  assert.equal(g.encheresFinish(), o);
  g.encheresQuit();
  assert.doesNotThrow(() => { g.encheresStart({ table: 'reliques' }); g.encheresQuit(); });
  g.encheresStart({ daily: true }); g.s.encheres.cur.over = 'won'; g.s.encheres.cur.final = { scores: { p: 1, a: 0, b: 0 }, order: ['p', 'a', 'b'] };
  assert.ok(g.encheresFinish().chests.includes('bois')); g.encheresQuit();
  assert.throws(() => g.encheresStart({ daily: true }), /déjà/);
});

test('énigmes : trois par jour, toujours fabriquées, identiques pour tous, solution vérifiée', () => {
  for (let d = 1; d <= 20; d++) {
    const day = `2026-12-${String(d).padStart(2, '0')}`;
    const list = EG.dayPuzzles(catalog, day);
    assert.equal(list.length, 3);
    list.forEach((pz, k) => {
      assert.ok(pz, `${day} ${k}`);
      assert.ok(pz.goal >= 2);
      for (const s of pz.solutions) assert.equal(EG.tryMove(catalog, pz, s.h, s.cell).n, pz.goal);
      assert.equal(EG.bestMoves(catalog, pz)[0].n, pz.goal, 'aucune pose ne fait mieux que le but');
    });
    assert.deepEqual(EG.dayPuzzles(catalog, day).map((p) => p.board), list.map((p) => p.board));
  }
});

test('énigmes : étoiles selon les essais, solution après trois ratés, coffre quand les trois sont résolues', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('eg'), clock });
  g.s.bossesBeaten.devoreur = 1;
  const list = g.enigmePuzzles();
  const wrong = (pz) => EG.bestMoves(catalog, pz).find((m) => m.n < pz.goal);
  // énigme I : un raté puis la bonne réponse → 2 étoiles
  let w = wrong(list[0]); let o = g.enigmeTry(0, w.h, w.cell); assert.equal(o.ok, false); assert.equal(o.left, 2);
  o = g.enigmeTry(0, list[0].solutions[0].h, list[0].solutions[0].cell); assert.equal(o.ok, true); assert.equal(o.stars, 2);
  assert.throws(() => g.enigmeTry(0, 0, 0), /déjà/);
  // énigme II : trois ratés → solution montrée, pas d'étoile
  w = wrong(list[1]); for (let n = 0; n < 3; n++) o = g.enigmeTry(1, w.h, w.cell);
  assert.equal(o.failed, true); assert.ok(o.solutions.length);
  // énigme III réussie : pas de coffre (la II est ratée)
  o = g.enigmeTry(2, list[2].solutions[0].h, list[2].solutions[0].cell); assert.equal(o.stars, 3); assert.equal(o.chest, null);
  // le lendemain, les trois du premier coup : coffre de bois
  const g2 = new Game(catalog, new MemoryStorage(), { rng: rngFrom('eg2'), clock: () => new Date(2026, 9, 19, 12) });
  g2.s.bossesBeaten.devoreur = 1;
  const l2 = g2.enigmePuzzles(), bois = g2.s.chests.bois || 0;
  l2.forEach((pz, k) => { o = g2.enigmeTry(k, pz.solutions[0].h, pz.solutions[0].cell); });
  assert.equal(o.chest, 'bois'); assert.equal(g2.s.chests.bois, bois + 1); assert.equal(g2.s.enigmes.starsTotal, 9);
});
