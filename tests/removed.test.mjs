// Cartes retirées : remboursées en cendres et effacées des équipes à l'ouverture de la sauvegarde.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';

const catalog = loadCatalog();
const opts = { rng: rngFrom('rm'), clock: () => new Date(2026, 9, 12, 12) };

test('cartes retirées : remboursées et retirées de l’équipe', () => {
  const st = new MemoryStorage();
  const g = new Game(catalog, st, opts);
  assert.equal(catalog.get('ABY-050'), undefined);
  assert.equal(catalog.get('CEL-046'), undefined);
  const ash = g.s.ash;
  g.s.collection['ABY-050'] = { v: { normal: 2 } };
  g.s.team = [...g.s.team, 'ABY-050'];
  g.s.teamPresets = [{ name: 'A', ids: ['ABY-050', ...g.s.team.slice(0, 1)] }];
  g.persist();
  const g2 = new Game(catalog, st, opts);
  assert.equal(g2.owns('ABY-050'), false);
  assert.equal(g2.s.ash, ash + 2 * 600);
  assert.ok(!g2.s.team.includes('ABY-050'));
  assert.ok(!g2.s.teamPresets[0].ids.includes('ABY-050'));
  const g3 = new Game(catalog, st, opts);
  assert.equal(g3.s.ash, g2.s.ash, 'pas de double remboursement');
});
