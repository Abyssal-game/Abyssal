import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { noWelcome } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { fameTier, fameNext, SEASON_STEPS, seasonId, seasonName, seasonDaysLeft } from '../js/core/renown.js';
import { loadSave, writeSave } from '../js/core/save.js';
import { SAVE_KEY } from '../js/config.js';

const catalog = loadCatalog();
let now = new Date(2026, 9, 12, 12);
const newGame = (seed = 'a', storage = new MemoryStorage()) => noWelcome(new Game(catalog, storage, { rng: rngFrom(seed), clock: () => now }));

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

test('Saison : les expéditions sans coffre ne comptent pas', () => {
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

test('première victoire : un cadeau une seule fois ; record d’étage signalé en fin d’expédition', async () => {
  const { FIRST_WIN } = await import('../js/core/game.js');
  const g = newGame('first');
  g.startRun();
  let first = null, wins = 0;
  for (let k = 0; k < 300 && g.s.descent.run; k++) {
    const r = g.s.descent.run;
    if (r.phase === 'doors') { const o = g.chooseDoor(g.doors()[0]); if (o.battle) { const out = g.autoResolve(); if (out.won) { wins++; if (out.firstWin) { assert.equal(first, null, 'une seule fois'); first = out.firstWin; } } } }
    else if (r.phase === 'reward') g.chooseReward(r.rewards[0]);
    else if (r.phase === 'altar') g.chooseBlessing(r.altar[0]);
    else if (r.cleared >= 2) g.endRun(false);
    else g.nextFloor();
  }
  assert.ok(wins >= 1); assert.equal(first, FIRST_WIN);
  assert.equal(g.s.descent.last.record, true, 'première expédition : record');
  g.startRun(); g.endRun(false);
  assert.ok(!g.s.descent.last.record, 'expédition plus courte : pas de record');
});

test('coffre de la semaine, favoris et défis de créature', async () => {
  const { WEEK_DAYS } = await import('../js/core/game.js');
  const g = newGame('week');
  const wc = g.weekChest();
  assert.equal(wc.days, 1); assert.ok(!wc.ready);
  assert.throws(() => g.claimWeekChest());
  g.s.week.days = ['a', 'b', 'c', 'd', 'e'].slice(0, WEEK_DAYS);
  const or = g.s.chests.or || 0;
  g.claimWeekChest();
  assert.equal(g.s.chests.or, or + 1); assert.throws(() => g.claimWeekChest(), /déjà/);
  // favoris : la dernière copie ne se brûle pas
  g.team(); const ids = Object.keys(g.s.collection); const id = ids[0];
  g.toggleFav(id); assert.ok(g.isFav(id));
  assert.throws(() => g.burn(id, Object.keys(g.s.collection[id].v)[0], g.s.collection[id].n), /favoris/);
  g.toggleFav(id); assert.ok(!g.isFav(id));
  // défis
  g.s.cstats[id] = { w: 10 };
  const ash = g.s.ash;
  g.claimChallenge(id, 'w');
  assert.equal(g.s.ash, ash + 25);
  assert.throws(() => g.claimChallenge(id, 'w'));
  assert.throws(() => g.claimChallenge(id, 'k'));
});

test('Descente : ennemis nommés de temps en temps, créatures de l’événement plus fréquentes', async () => {
  const { namedFoe, eventSwap, floorEnemies } = await import('../js/core/descent.js');
  let named = 0;
  for (let f = 2; f < 202; f++) if (namedFoe('2026-10-14', f, 'fight')) named++;
  assert.ok(named > 10 && named < 60, `${named} ennemis nommés sur 200 étages`);
  assert.equal(namedFoe('2026-10-14', 5, 'boss'), null);
  let evc = 0, tot = 0;
  for (let f = 1; f < 60; f++) { const l = eventSwap(catalog, floorEnemies(catalog, 'd', f, 'fight'), 'd', f, ['infernal', 'necrotique']); l.forEach((e) => { tot++; if (['infernal', 'necrotique'].includes(catalog.get(e.id).faction)) evc++; }); }
  assert.ok(evc / tot > 0.4, `part de l’événement : ${(evc / tot).toFixed(2)}`);
});

test('cendres : chaque victoire dans la Descente et chaque coffre en donnent', async () => {
  const { CHESTS } = await import('../js/core/descent.js');
  const g = noWelcome(new Game(loadCatalog(), new MemoryStorage(), { rng: rngFrom('ash'), clock: () => new Date(2026, 9, 10, 12) }));
  g.team(); g.s.ash = 0;
  g.startRun();
  for (let k = 0; k < 50 && g.s.descent.run && !g.s.descent.run.battle?.over; k++) {
    const r = g.s.descent.run;
    if (r.phase === 'doors') { const o = g.chooseDoor(g.doors()[0]); if (o.battle) { const out = g.autoResolve(); if (out?.won) { assert.ok(out.ash >= 2, 'cendres de victoire'); break; } } } else break;
  }
  assert.ok(g.s.ash > 0);
  for (const t of ['bois', 'fer', 'or', 'abyssal']) {
    assert.ok(CHESTS[t].ash > 0);
    g.s.chests[t] = 1; const a = g.s.ash; g.openChest(t); assert.equal(g.s.ash, a + CHESTS[t].ash);
  }
});
