// v280 : Sublimer — obtenir la finition suivante ; v615 : contre des obsidiennes (décision du propriétaire)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { sublimeObs } from '../js/config.js';

const catalog = loadCatalog();
const newGame = () => { const g = noWelcome(new Game(catalog, new MemoryStorage(), { rng: rngFrom('sub'), clock: () => new Date(2026, 9, 12, 12) })); g.s.settings.dev = true; g.s.devCodex = true; return g; };
const pick = (r, v) => catalog.cards.find((c) => c.rarity === r && c.variants.includes(v));

test('chaîne normale → argentée → enluminée → abyssale → cristalline → prismatique, payée en obsidiennes', () => {
  const g = newGame(), c = pick('M', 'gold');
  assert.equal(g.sublimeInfo(c.id), null, 'carte non possédée');
  g.addCard(c.id, 'normal', 'reward');
  g.s.obs = 1e6; const ash = g.s.ash;
  for (const v of ['holo', 'gold', 'galaxy', 'crystal', 'prism']) {
    const x = g.sublimeInfo(c.id);
    assert.equal(x.to, v);
    assert.equal(x.cost, sublimeObs('M', v));
    const o = g.s.obs;
    g.sublime(c.id);
    assert.equal(g.s.obs, o - x.cost);
    assert.equal(g.s.collection[c.id].v[v], 1);
  }
  assert.equal(g.s.ash, ash, 'les cendres ne servent plus');
  assert.equal(g.s.collection[c.id].v.normal, 1, 'la carte d’origine est conservée');
  assert.equal(g.sublimeInfo(c.id), null, 'plus rien à sublimer');
});

test('pas assez d’obsidiennes : refusé sans rien changer', () => {
  const g = newGame(), c = pick('R', 'holo');
  g.addCard(c.id, 'normal', 'reward');
  g.s.obs = 0; g.s.ash = 1e6;
  assert.throws(() => g.sublime(c.id), /obsidiennes/);
  assert.ok(!g.s.collection[c.id].v.holo);
});

test('prix croissants avec la rareté et la finition', () => {
  const R = ['C', 'PC', 'R', 'HR', 'M', 'S'], V = ['holo', 'gold', 'galaxy', 'crystal', 'prism'];
  for (const v of V) for (let i = 1; i < R.length; i++) assert.ok(sublimeObs(R[i], v) > sublimeObs(R[i - 1], v));
  for (const r of R) for (let i = 1; i < V.length; i++) assert.ok(sublimeObs(r, V[i]) > sublimeObs(r, V[i - 1]));
});

test('une carte sans finition enluminée passe d’argentée à abyssale', () => {
  const c = catalog.cards.find((x) => x.variants.includes('galaxy') && x.variants.includes('holo') && !x.variants.includes('gold'));
  if (!c) return;
  const g = newGame(); g.addCard(c.id, 'holo', 'reward'); g.s.obs = 1e6;
  assert.equal(g.sublimeInfo(c.id).to, 'galaxy');
});
