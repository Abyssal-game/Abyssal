// v735 : Choc des Boosters sans mise : chacun garde ses cartes, le gagnant reçoit un butin offert par le jeu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { VERSUS_PRIZE, streakMult } from '../js/core/versus.js';
const catalog = loadCatalog();
const now = new Date('2026-11-02T10:00:00');
const fresh = () => noWelcome(new Game(catalog, new MemoryStorage(), { rng: rngFrom('c'), clock: () => now }));
const pick = (r) => catalog.cards.find((c) => c.rarity === r);

test('v735 : le perdant garde ses cartes, le gagnant reçoit une copie, un coffre abyssal ou des éclats', () => {
  const g = fresh(), a = pick('R'), b = pick('C'), hr = pick('HR'), m = pick('M');
  const lose = g.versusApply('d1', { result: 'lose', cards: [{ id: a.id }, { id: b.id }], stake: 800, packs: 2 });
  assert.equal(lose.cards.length, 2, 'le perdant garde ses cartes');
  assert.ok(g.owns(a.id));
  const sh = g.s.shards;
  const win = g.versusApply('d2', { result: 'win', cards: [{ id: b.id }], stake: 1000, packs: 1, trophy: { id: hr.id, variant: 'normal' } });
  assert.equal(win.trophy.id, hr.id);
  assert.ok(g.owns(hr.id), 'copie de la plus belle carte adverse');
  assert.equal(win.shards, 1000 * VERSUS_PRIZE.win);
  assert.ok(g.s.shards - sh >= win.shards);
  const ch = g.s.chests.abyssal || 0;
  const big = g.versusApply('d3', { result: 'win', cards: [], stake: 400, packs: 1, trophy: { id: m.id } });
  assert.equal(big.trophy, null);
  assert.equal(big.chest, 'abyssal');
  assert.equal((g.s.chests.abyssal || 0) - ch, 1, 'une Mythique devient un coffre abyssal');
  // limite : 6 boosters par jour comptent pour le butin (2 + 1 + 1 déjà comptés)
  const w4 = g.versusApply('d4', { result: 'win', cards: [], stake: 1200, packs: 3, trophy: { id: hr.id } });
  assert.equal(w4.counted, 2);
  assert.equal(w4.shards, Math.round(1200 * VERSUS_PRIZE.win * streakMult(3) * 2 / 3 / 5) * 5, 'v807 : 3e victoire d’affilée, butin ×2');
  const w5 = g.versusApply('d5', { result: 'win', cards: [], stake: 400, packs: 1, trophy: { id: hr.id } });
  assert.equal(w5.counted, 0);
  assert.equal(w5.shards, 0);
  assert.equal(w5.trophy, null);
  assert.equal(g.versusApply('d5', { result: 'win', cards: [] }), null, 'encaissé une seule fois');
});

test('v736 : le gagnant choisit sa carte parmi celles de l’adversaire, une seule fois', () => {
  const g = fresh(), hr = pick('HR'), c = pick('C');
  const w = g.versusApply('p1', { result: 'win', cards: [{ id: c.id }], stake: 400, packs: 1, choices: [{ id: hr.id, rarity: 'HR' }, { id: c.id, rarity: 'C' }], pick: true });
  assert.equal(w.pick, true);
  assert.equal(w.trophy, null);
  assert.ok(g.s.versus.pick.p1);
  const o = g.versusPickApply('p1', { trophy: { id: hr.id, rarity: 'HR' } });
  assert.equal(o.trophy.id, hr.id);
  assert.ok(g.owns(hr.id));
  assert.equal(g.versusPickApply('p1', { trophy: { id: hr.id } }), null, 'une seule fois');
  // une Mythique choisie devient un coffre abyssal ; pas de choix quand le butin du jour est épuisé
  g.versusApply('p2', { result: 'win', cards: [], stake: 400, packs: 1, choices: [{ id: pick('M').id, rarity: 'M' }], pick: true });
  const ch = g.s.chests.abyssal || 0;
  assert.equal(g.versusPickApply('p2', { trophy: null, chest: 'abyssal' }).chest, 'abyssal');
  assert.equal((g.s.chests.abyssal || 0) - ch, 1);
  g.s.versus.prizePacks = 6;
  const late = g.versusApply('p3', { result: 'win', cards: [], stake: 400, packs: 1, choices: [{ id: hr.id, rarity: 'HR' }], pick: true });
  assert.ok(!late.pick);
});
