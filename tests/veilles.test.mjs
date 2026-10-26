// v795 : Les Veilles : chapitre de saison (étages 101 à 105) après l'Abysse, un Veilleur par saison du Codex.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { FINAL_FLOOR } from '../js/config.js';
import { VEILLES, VEILLEURS, BOSSES } from '../js/core/bosses.js';
import { SEASONS } from '../js/core/codex.js';
import { autoDuel } from '../js/core/duel.js';

const catalog = loadCatalog();
const mk = (seed, d = new Date(2026, 11, 10, 12)) => noWelcome(new Game(catalog, new MemoryStorage(), { rng: rngFrom(seed), clock: () => d }));
const win = (g) => { const st = g.descent().run.battle; Object.values(st.units).forEach((u) => { if (u.side === 'enemy') u.hp = 0; }); st.over = 'won'; return g.finishBattle(); };

test('chaque saison du Codex a son Veilleur, porté par une vraie carte', () => {
  for (const se of SEASONS) { const v = VEILLES[se.key]; assert.ok(v, se.key); assert.ok(BOSSES[v.boss]?.veille, v.boss); assert.ok(catalog.get(v.card), v.card); }
  for (const [k, b] of Object.entries(VEILLEURS)) for (let r = 1; r < 12; r++) for (const ph of [1, 2]) assert.ok(typeof b.pattern(ph, r) === 'string', k);
});

test('fermée avant l’Abysse ; ouverte ensuite, étages 101 à 105, sans toucher au record ni au chapitre', () => {
  const g = mk('veille');
  assert.throws(() => g.startRun({ veille: true }), /Abysse/);
  g.s.bossesBeaten.abysse = 1; g.s.descent.best = FINAL_FLOOR;
  const run = g.startRun({ veille: true });
  if (run.phase === 'omen') g.chooseOmen(run.omenOffer[0]);
  assert.equal(run.floor, 101); assert.equal(run.veille, 's1-ames');
  for (let f = 101; f < 105; f++) {
    g.chooseDoor('fight'); const o = win(g); assert.ok(o.first, `première victoire à ${f}`);
    if (run.phase === 'reward') { run.phase = 'cleared'; }
    g.nextFloor();
  }
  assert.equal(g.s.descent.best, FINAL_FLOOR, 'record inchangé');
  assert.deepEqual(g.doors(), ['boss']);
  g.chooseDoor('boss');
  assert.equal(run.battle.bossKey, 'v-ames');
  const boss = Object.values(run.battle.units).find((u) => u.boss);
  assert.equal(boss.id, 'NEC-043'); assert.ok(!boss.awakened);
  const premium = g.s.tickets.premium || 0;
  const out = win(g);
  assert.ok(out.veilleWon && out.summary.veilleWon);
  assert.ok(!out.summit && !out.summary.record);
  assert.equal(g.s.tickets.premium, premium + 2);
  assert.ok(g.s.veilles['s1-ames'].won);
  assert.equal(g.descent().run, null);
  assert.equal(g.s.descent.best, FINAL_FLOOR);
  // rejouée : plus de récompense de première victoire (Torches rallumées pour l'essai)
  g.s.descent.used = 0;
  const run2 = g.startRun({ veille: true }); if (run2.phase === 'omen') g.chooseOmen(run2.omenOffer[0]);
  g.chooseDoor('fight'); assert.ok(!win(g).first);
});

test('le Veilleur change avec la saison', () => {
  const g = mk('mars', new Date(2027, 2, 5, 12));
  assert.equal(g.veille().boss, VEILLES[g.veilleKey()].boss);
  assert.notEqual(g.veilleKey(), 's1-ames');
});

test('un combat contre chaque Veilleur se joue jusqu’au bout sans erreur', () => {
  for (const k of Object.keys(VEILLES)) {
    const g = mk(`auto-${k}`); g.s.bossesBeaten.abysse = 1; g.s.descent.best = FINAL_FLOOR;
    const run = g.startRun({ veille: true }); if (run.phase === 'omen') g.chooseOmen(run.omenOffer[0]);
    run.veille = k; run.floor = 105;
    g.chooseDoor('boss');
    assert.equal(run.battle.bossKey, VEILLES[k].boss);
    autoDuel(run.battle);
    assert.ok(run.battle.over, k);
  }
});
