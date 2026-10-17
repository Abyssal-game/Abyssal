// v394 : l'étage 100 est le fond de la Descente ; le Booster de l'Abysse (5 cartes, finitions, Secrète la première fois).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { FINAL_FLOOR } from '../js/config.js';

const catalog = loadCatalog();
const mk = (seed) => noWelcome(new Game(catalog, new MemoryStorage(), { rng: rngFrom(seed), clock: () => new Date(2026, 9, 18, 12) }));

test('vaincre L’Abysse à l’étage 100 termine l’expédition et donne le Booster de l’Abysse', () => {
  const g = mk('fond');
  g.team();
  g.devBoss('abysse', { power: true });
  const run = g.descent().run;
  assert.equal(run.floor, FINAL_FLOOR);
  g.chooseDoor('boss');
  const st = run.battle;
  Object.values(st.units).forEach((u) => { if (u.side === 'enemy') u.hp = 0; });
  st.over = 'won';
  const out = g.finishBattle();
  assert.ok(out.summit);
  assert.equal(g.descent().run, null, 'expédition terminée');
  assert.equal(g.s.tickets.abysse, 1);
  assert.ok(g.s.titles.includes('Vainqueur de l’Abysse'));
  assert.ok(!g.startFloors().some((f) => f > FINAL_FLOOR));
});

test('Booster de l’Abysse : 5 cartes en finition, une Secrète non possédée la première fois', () => {
  const g = mk('pack');
  g.s.tickets.abysse = 2;
  const owned = new Set(Object.keys(g.s.collection));
  const r = g.openBooster('abysse').opening;
  assert.equal(r.cards.length, 5);
  assert.ok(r.cards.every((c) => c.variant !== 'normal'));
  assert.ok(r.cards.some((c) => catalog.get(c.id).rarity === 'S' && !owned.has(c.id)));
  assert.ok(r.cards.some((c) => ['M', 'S'].includes(catalog.get(c.id).rarity)));
  const r2 = g.openBooster('abysse').opening;
  assert.equal(r2.cards.length, 5);
  assert.equal(g.s.tickets.abysse, 0);
});

test('v405 : après le fond, l’objectif de l’Accueil ne vise jamais au-delà de l’étage 100', () => {
  const g = mk('apres');
  g.s.descent.best = FINAL_FLOOR;
  g.s.bossesBeaten.abysse = 1;
  const depth = () => g.goals().find((x) => x.kind === 'depth');
  const goal = depth();
  assert.doesNotMatch(goal.title, /\d/);
  assert.match(goal.title, /Cauchemar/);
  g.s.descent.best = 103;
  assert.ok(!/1\d\d/.test(depth().title));
});
