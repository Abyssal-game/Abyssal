// v728 : corrections de l'audit du 24 octobre 2026 (économie)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game } from '../js/core/game.js';

const catalog = loadCatalog();
const mk = (seed, d = new Date(2026, 9, 18, 12)) => noWelcome(new Game(catalog, new MemoryStorage(), { rng: rngFrom(seed), clock: () => d }));

test('le Booster de l’Abysse ne s’achète jamais (prix 0)', () => {
  const g = mk('aby'); g.s.shards = 5000; g.s.tickets.abysse = 0;
  assert.throws(() => g.openBooster('abysse'), /récompense/);
  assert.equal(g.s.shards, 5000);
});

test('un jour du Tirage sorti de la liste ne se repaie pas', () => {
  const g = mk('sh'); const sh = g.shadowState();
  const days = Array.from({ length: 15 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
  let got = 0; for (let r = 0; r < 3; r++) for (const d of days) got += g.shadowPay(d);
  const per = got / 15; // chaque jour payé une seule fois
  assert.ok(Object.keys(sh.paid).length <= 14);
  assert.ok(per > 0);
  const before = g.s.shards; for (const d of days) g.shadowPay(d); assert.equal(g.s.shards, before);
});
