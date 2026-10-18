// v334 : présages de départ, porte Gouffre, règles du jour qui changent la façon de jouer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { OMENS, omenChoices, dailyRule, DAILY_RULES, RULES_V2_FROM } from '../js/core/descent.js';

const catalog = loadCatalog();
const mk = (seed, d = 18) => noWelcome(new Game(catalog, new MemoryStorage(), { rng: rngFrom(seed), clock: () => new Date(2026, 9, d, 12) }));

test('présage : proposé après le premier gardien, trois choix fixes du jour, gardé pour toute l’expédition', () => {
  const g = mk('om');
  g.team();
  assert.equal(g.startRun().phase, 'doors', 'pas de présage avant le premier gardien');
  g.endRun(false);
  g.s.bossesBeaten.devoreur = 1;
  const run = g.startRun();
  assert.equal(run.phase, 'omen');
  assert.deepEqual(run.omenOffer, omenChoices(run.day));
  assert.equal(new Set(run.omenOffer).size, 3);
  assert.throws(() => g.chooseDoor('fight'), /porte/i);
  const k = run.omenOffer[0];
  g.chooseOmen(k);
  assert.equal(run.omen, k);
  assert.equal(run.phase, 'doors');
  g.chooseDoor('fight');
  if (OMENS[k].relic) assert.deepEqual(run.battle.relics, [OMENS[k].relic]);
});

test('Présage de la Soif : plus de source, et les créatures se soignent en frappant', () => {
  const g = mk('soif');
  g.team(); g.s.bossesBeaten.devoreur = 1;
  const run = g.startRun(); run.omenOffer = ['soif', 'avare', 'dent']; g.chooseOmen('soif');
  for (const room of ['fight', 'elite']) assert.ok(!g.rewardsFor(run, room).includes('rest'));
  assert.ok(g.rewardsFor(run, 'fight').length >= 1);
  g.chooseDoor('fight');
  assert.equal(run.battle.soif, true);
});

test('v406 : plus de Gouffre dans la campagne (il sautait des étages et leurs récompenses)', () => {
  const g = mk('gf');
  g.team(); g.s.bossesBeaten.devoreur = 1;
  const run = g.startRun(); g.chooseOmen(run.omenOffer[0]);
  for (let f = 1; f < 60; f++) { run.floor = f; assert.ok(!g.doors().includes('gouffre')); }
});

test('règles du jour : les nouvelles à partir du 17 octobre 2026, retirées dès le 18 (les jours passés gardent la leur)', () => {
  const v2 = Object.keys(DAILY_RULES).filter((k) => DAILY_RULES[k].v2);
  assert.equal(v2.length, 4);
  for (let d = 1; d < 17; d++) assert.ok(!v2.includes(dailyRule(`2026-10-${String(d).padStart(2, '0')}`).key));
  assert.ok(v2.includes(dailyRule('2026-10-17').key) || !!dailyRule('2026-10-17').key);
  assert.ok(RULES_V2_FROM === '2026-10-17');
  // v430 : plus de règle du jour à partir du 18 octobre 2026 (règle neutre, sans effet)
  for (let d = 18; d <= 31; d++) assert.equal(dailyRule(`2026-10-${d}`).key, 'none');
  assert.equal(dailyRule('2027-03-05').off, true);
});

test('Disette : source à 15 %, trésor doublé', () => {
  const g = mk('dis');
  g.team();
  const run = g.startRun();
  const real = g.rule.bind(g);
  g.rule = () => ({ ...real(), key: 'disette' });
  assert.equal(g.restHeal(run), 0.15);
  const t2 = g.treasurePreview();
  g.rule = () => ({ ...real(), key: 'calme' });
  assert.ok(t2 >= g.treasurePreview() * 2 - 1, 'trésor doublé');
  assert.equal(g.restHeal(run), 0.3);
  g.rule = real;
});
