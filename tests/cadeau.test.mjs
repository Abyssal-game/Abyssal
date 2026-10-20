// v518 : cadeau de bienvenue : les 2 boosters offerts à l'arrivée sont suivis à part du booster gratuit du jour
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { defaultSave, migrate } from '../js/core/save.js';

const catalog = loadCatalog();
const mk = () => new Game(catalog, new MemoryStorage(), { rng: rngFrom('gift'), clock: () => new Date(2026, 9, 20, 12) });

test('cadeau : 2 boosters offerts, numérotés, puis le booster du jour', () => {
  const g = mk();
  assert.equal(g.s.welcomeGift, 2);
  assert.equal(g.openBooster('standard').opening.gift, 1);
  assert.equal(g.openBooster('standard').opening.gift, 2);
  assert.equal(g.s.welcomeGift, 0);
  const third = g.openBooster('standard').opening;
  assert.equal(third.gift, 0);
  assert.equal(third.paidWith, 'free');
});

test('cadeau : une ancienne partie déjà commencée n’a pas de cadeau', () => {
  const old = defaultSave(); delete old.welcomeGift; old.stats.boosters = 5; old.tickets.standard = 2;
  assert.equal(migrate(old).welcomeGift, 0);
  const neuve = defaultSave(); delete neuve.welcomeGift;
  assert.equal(migrate(neuve).welcomeGift, 2);
});
