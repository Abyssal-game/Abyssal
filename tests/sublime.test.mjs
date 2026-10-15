// v280 : Sublimer — obtenir la finition suivante contre des cendres
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { ECONOMY, SUBLIME_ASH } from '../js/config.js';

const catalog = loadCatalog();
const newGame = () => noWelcome(new Game(catalog, new MemoryStorage(), { rng: rngFrom('sub'), clock: () => new Date(2026, 9, 12, 12) }));
const pick = (r, v) => catalog.cards.find((c) => c.rarity === r && c.variants.includes(v));

test('chaîne normale → holo → or → cosmique, avec le bon coût', () => {
  const g = newGame(), c = pick('M', 'gold');
  assert.equal(g.sublimeInfo(c.id), null, 'carte non possédée');
  g.addCard(c.id, 'normal', 'reward');
  g.s.ash = 1e6;
  for (const v of ['holo', 'gold', 'galaxy']) {
    const x = g.sublimeInfo(c.id);
    assert.equal(x.to, v);
    assert.equal(x.cost, ECONOMY.burnAsh.M * SUBLIME_ASH[v]);
    const ash = g.s.ash;
    g.sublime(c.id);
    assert.equal(g.s.ash, ash - x.cost);
    assert.equal(g.s.collection[c.id].v[v], 1);
  }
  assert.equal(g.s.collection[c.id].v.normal, 1, 'la carte d’origine est conservée');
  assert.equal(g.sublimeInfo(c.id), null, 'plus rien à sublimer');
});

test('pas assez de cendres : refusé sans rien changer', () => {
  const g = newGame(), c = pick('R', 'holo');
  g.addCard(c.id, 'normal', 'reward');
  g.s.ash = 0;
  assert.throws(() => g.sublime(c.id), /cendres/);
  assert.ok(!g.s.collection[c.id].v.holo);
});

test('sublimer puis brûler ne rapporte jamais de cendres', () => {
  for (const r of Object.keys(ECONOMY.burnAsh)) for (const v of ['holo', 'gold', 'galaxy']) assert.ok(SUBLIME_ASH[v] > ECONOMY.burnFinish[v], `${r} ${v}`);
});

test('une carte sans finition or passe de holo à cosmique', () => {
  const c = catalog.cards.find((x) => x.variants.includes('galaxy') && x.variants.includes('holo') && !x.variants.includes('gold'));
  if (!c) return;
  const g = newGame(); g.addCard(c.id, 'holo', 'reward'); g.s.ash = 1e6;
  assert.equal(g.sublimeInfo(c.id).to, 'galaxy');
});
