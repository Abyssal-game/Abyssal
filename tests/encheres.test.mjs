// v427 : Enchères de Mammon (annulations, lots qui restent, familles, fin).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import * as EN from '../js/core/encheres.js';

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
  /* v520 : la Salle des jeux est ouverte dès le départ */
  g.s.bossesBeaten.devoreur = 1;
  assert.throws(() => g.encheresStart({ table: 'reliques' }), /précédente/);
  const before = g.s.shards;
  g.encheresStart({ table: 'etal' }); g.s.encheres.cur.over = 'won'; g.s.encheres.cur.final = { scores: { p: 30, a: 10, b: 5 }, order: ['p', 'a', 'b'] };
  const o = g.encheresFinish();
  assert.equal(o.first, true); assert.deepEqual(o.chests, ['bois']);
  assert.equal(g.s.shards - before, EN.ENCHERES_REWARD.firstWin + EN.TABLE.etal.reward + (o.feat ? EN.FEAT_SHARDS : 0));
  assert.equal(g.encheresFinish(), o);
  g.encheresQuit();
  assert.doesNotThrow(() => { g.encheresStart({ table: 'reliques' }); g.encheresQuit(); });
  g.encheresStart({ daily: true }); g.s.encheres.cur.over = 'won'; g.s.encheres.cur.final = { scores: { p: 1, a: 0, b: 0 }, order: ['p', 'a', 'b'] };
  assert.ok(g.encheresFinish().chests.includes('bois')); g.encheresQuit();
  assert.throws(() => g.encheresStart({ daily: true }), /déjà/);
});
