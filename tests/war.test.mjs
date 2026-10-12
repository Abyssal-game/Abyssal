// Guerre des Factions : serment, points (variété, serment), paliers, fin de semaine, honnêteté.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { WAR, warPoints, tiersReached, daysLeft } from '../js/core/war.js';
import { migrate, defaultSave } from '../js/core/save.js';

const catalog = loadCatalog();
let now = new Date(2026, 9, 14, 12); // mercredi
const newGame = () => new Game(catalog, new MemoryStorage(), { rng: rngFrom('war'), clock: () => now });

test('points : variété dans la journée et bonus de serment', () => {
  assert.equal(warPoints('fight', 0, false), 10);
  assert.equal(warPoints('fight', WAR.sources.fight.fresh, false), 5);
  assert.equal(warPoints('boss', 0, true), 60);
  assert.equal(warPoints('inconnu', 0, true), 0);
  assert.deepEqual(tiersReached(260), [0, 1]);
  assert.equal(daysLeft(new Date(2026, 9, 12)), 7); // lundi
  assert.equal(daysLeft(new Date(2026, 9, 18)), 1); // dimanche
});

test('serment : rien sans serment, une seule fois par semaine, points comptés', () => {
  now = new Date(2026, 9, 14, 12);
  const g = newGame();
  assert.equal(g.warAdd('fight'), 0);
  assert.throws(() => g.warJoin('nulle-part'), /inconnu/);
  g.warJoin('infernal');
  assert.throws(() => g.warJoin('celeste'), /déjà/);
  const inf = catalog.byFaction.infernal.slice(0, 3).map((c) => c.id), cel = catalog.byFaction.celeste.slice(0, 3).map((c) => c.id);
  assert.equal(g.warAdd('fight', inf), 15);
  assert.equal(g.warAdd('fight', cel), 10);
  assert.equal(g.warAdd('sceaux'), 15);
  assert.equal(g.war().points, 40);
});

test('paliers : réclamés une fois ; fin de semaine : versés automatiquement, historique', () => {
  now = new Date(2026, 9, 14, 12);
  const g = newGame();
  g.warJoin('abyssal');
  assert.throws(() => g.warClaim(0), /pas encore/);
  g.s.war.points = 820;
  const s0 = g.s.shards;
  g.warClaim(0);
  assert.throws(() => g.warClaim(0), /déjà/);
  assert.ok(g.s.shards - s0 >= WAR.tiers[0].shards);
  // semaine suivante : paliers 1 à 3 versés, cadre et titre gagnés
  now = new Date(2026, 9, 20, 12);
  const s1 = g.s.shards;
  const w = g.war();
  assert.equal(w.side, null); assert.equal(w.points, 0);
  assert.equal(g.s.shards - s1, WAR.tiers[1].shards + WAR.tiers[2].shards + WAR.tiers[3].shards);
  assert.ok(g.s.frames.includes('guerre'));
  assert.ok(g.s.titles.includes(WAR.tiers[3].title));
  assert.equal(w.history[0].points, 820); assert.equal(w.history[0].tiers, 4);
  assert.equal(w.report.paid, WAR.tiers[1].shards + WAR.tiers[2].shards + WAR.tiers[3].shards);
});

test('victoires réelles : Sceaux et Chasse donnent des points ; vieille sauvegarde complétée', () => {
  now = new Date(2026, 9, 14, 12);
  const g = newGame();
  g.warJoin('celeste');
  g.sceauxStart({ rival: 'initie' });
  const st = g.s.sceaux.cur; st.over = 'won'; st.final = { p: 6, o: 4 };
  assert.equal(g.sceauxFinish().war, 15);
  const old = defaultSave(); delete old.war;
  const m = migrate(old);
  assert.equal(m.war.side, null); assert.deepEqual(m.war.history, []);
});
