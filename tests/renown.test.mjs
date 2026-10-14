import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { fameTier, fameNext, SEASON_STEPS, seasonId, seasonName, seasonDaysLeft } from '../js/core/renown.js';
import { loadSave, writeSave } from '../js/core/save.js';
import { SAVE_KEY } from '../js/config.js';

const catalog = loadCatalog();
let now = new Date(2026, 9, 12, 12);
const newGame = (seed = 'a', storage = new MemoryStorage()) => new Game(catalog, storage, { rng: rngFrom(seed), clock: () => now });

test('Renommée : paliers Vétéran, Héros, Légende', () => {
  assert.equal(fameTier(0), 0); assert.equal(fameTier(9), 0); assert.equal(fameTier(10), 1);
  assert.equal(fameTier(40), 2); assert.equal(fameTier(150), 3);
  assert.equal(fameNext(12).name, 'Héros'); assert.equal(fameNext(100), null);
});

test('Renommée : les victoires de Descente donnent des points aux créatures restées debout', () => {
  const g = newGame('fame');
  const ev = [];
  g.on('progress', (e) => ev.push(...e));
  g.startRun();
  const team = g.s.descent.run.team.map((m) => m.id);
  let wins = 0;
  for (let k = 0; k < 300 && g.s.descent.run; k++) {
    const r = g.s.descent.run;
    if (r.phase === 'doors') { const o = g.chooseDoor(g.doors()[0]); if (o.battle) { const out = g.autoResolve(); if (out.won) wins++; } }
    else if (r.phase === 'reward') g.chooseReward(r.rewards[0]);
    else if (r.phase === 'altar') g.chooseBlessing(r.altar[0]);
    else if (r.cleared >= 3) g.endRun(false);
    else g.nextFloor();
  }
  assert.ok(wins >= 1);
  const pts = team.map((id) => g.fameOf(id));
  assert.ok(pts.some((p) => p >= wins), 'au moins une créature a gagné un point par victoire');
  // palier franchi : annoncé
  const id = team[0];
  g.s.fame[id] = 9;
  const up = g.gainFame([id], 1);
  assert.equal(up.length, 1); assert.equal(up[0].tier, 1);
  assert.ok(ev.some((e) => e.kind === 'fame' && e.id === id));
  assert.equal(g.gainFame([id], 1).length, 0, 'pas de nouvelle annonce sans nouveau palier');
});

test('Saison : paliers récompensés une fois, remise à zéro au changement de mois', () => {
  now = new Date(2026, 9, 12, 12);
  const g = newGame('season');
  assert.equal(seasonId(now), '2026-10'); assert.equal(seasonName('2026-10'), 'Saison d’octobre 2026'); assert.equal(seasonName('2026-03'), 'Saison de mars 2026');
  assert.equal(seasonDaysLeft(now), 20);
  const shards = g.s.shards, fer = g.s.chests.fer;
  const ev = g.seasonDepth(12);
  assert.deepEqual(ev.map((e) => e.floor), [5, 10]);
  assert.equal(g.s.shards, shards + SEASON_STEPS[0].reward.shards);
  assert.equal(g.s.chests.fer, fer + 1);
  assert.equal(g.seasonDepth(12).length, 0, 'déjà réclamé');
  assert.equal(g.season().best, 12);
  now = new Date(2026, 10, 2, 12);
  assert.equal(g.season().id, '2026-11'); assert.equal(g.season().best, 0);
  assert.equal(g.seasonDepth(6).length, 1, 'nouvelle saison : les paliers reviennent');
  now = new Date(2026, 9, 12, 12);
});

test('Saison : les expéditions sans coffre et l’Épreuve du jour ne comptent pas', () => {
  const g = newGame('season2');
  g.s.descent.run = { free: true, day: g.descent().day };
  g.recordDepth(8);
  assert.equal(g.season().best, 0);
  g.s.descent.run = { day: g.descent().day };
  g.recordDepth(8);
  assert.equal(g.season().best, 8);
  g.s.descent.run = null;
});

test('Sauvegarde : Renommée et saison ajoutées aux anciennes sauvegardes', () => {
  const st = new MemoryStorage();
  const g = newGame('old', st);
  g.persist();
  const raw = JSON.parse(st.getItem(SAVE_KEY));
  const s = raw.data || raw;
  delete s.fame; delete s.season;
  st.setItem(SAVE_KEY, JSON.stringify(raw));
  const g2 = newGame('old', st);
  assert.deepEqual(g2.s.fame, {});
  assert.deepEqual(g2.s.season.claimed, []);
});
