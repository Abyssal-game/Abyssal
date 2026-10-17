// Enchaînement, coup de grâce et bilan de combat.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from './helpers.mjs';
import * as D from '../js/core/duel.js';

const catalog = loadCatalog();
const A = (id, o = {}) => D.duelUnit(catalog.get(id), o);
const E = (id, o = {}) => D.duelUnit(catalog.get(id), { side: 'enemy', ...o });
const ally = (st) => st.order.ally.map((id) => st.units[id]);
const foe = (st) => st.order.enemy.map((id) => st.units[id]);
const fresh = () => D.createDuel([A('INF-001'), A('INF-002'), A('INF-004')], [E('NEC-010', { scale: 3 })], { seed: 5 });

test('enchaînement : +1 par autre créature ayant déjà frappé la cible ce tour, +2 au plus', () => {
  const st = fresh();
  const [a, b, c] = ally(st), t = foe(st)[0];
  assert.equal(D.comboOf(st, a, t), 0);
  const base = D.dmgOf(st, b, t, 1, { basic: true });
  const ev = D.act(st, a.uid, 'attack', t.uid);
  assert.ok(ev.length);
  assert.equal(D.comboOf(st, b, t), 1);
  assert.equal(D.dmgOf(st, b, t, 1, { basic: true }), base + 1);
  assert.equal(D.comboOf(st, a, t), 0, 'la même créature ne s’enchaîne pas avec elle-même');
  const ev2 = D.act(st, b.uid, 'attack', t.uid);
  assert.ok(ev2.some((e) => e.t === 'combo' && e.n === 2));
  assert.equal(D.comboOf(st, c, t), 2);
  st.hitBy[t.uid].push('x', 'y');
  assert.equal(D.comboOf(st, c, t), D.COMBO_MAX);
});

test('enchaînement : remis à zéro au tour suivant', () => {
  const st = fresh();
  const [a, b] = ally(st), t = foe(st)[0];
  D.act(st, a.uid, 'attack', t.uid);
  D.endTurn(st);
  if (!st.over) assert.equal(D.comboOf(st, b, t), 0);
});

test('coup de grâce : achever un ennemi donne 1 Ferveur', () => {
  const st = D.createDuel([A('INF-001'), A('INF-002'), A('INF-004')], [E('NEC-010'), E('NEC-010')], { seed: 5, fervor: 0 });
  const t = foe(st)[0];
  t.hp = 1;
  const f0 = st.fervor;
  const ev = D.act(st, ally(st)[0].uid, 'attack', t.uid);
  assert.ok(ev.some((e) => e.t === 'finisher'));
  assert.ok(st.fervor >= f0 + 2, 'attaque (+1) et coup de grâce (+1)');
  assert.equal(st.stats.finishers, 1);
});

test('bilan : une défaite explique qui a frappé, qui est tombé, et donne un conseil', () => {
  const st = D.createDuel([A('INF-001')], [E('NEC-010', { scale: 4, boss: true })], { seed: 2 });
  for (let k = 0; k < 30 && !st.over; k++) D.endTurn(st);
  assert.equal(st.over, 'lost');
  const r = D.battleReport(st, (uid) => catalog.get(st.units[uid].id).name);
  assert.ok(r.length >= 2);
  assert.ok(r.some((l) => /infligé le plus/.test(l)));
  assert.ok(r.some((l) => /succombé/.test(l)));
});

test('objectifs : trois cibles concrètes, qui suivent la progression', async () => {
  const { Game } = await import('../js/core/game.js');
  const { MemoryStorage, rngFrom } = await import('./helpers.mjs');
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('obj'), clock: () => new Date(2026, 9, 12, 12) });
  g.s.ash = 0; // pas de cendres : pas d'objectif « Renforce »
  assert.equal(g.sceauxOpen(), false, 'Sceaux scellés avant le premier gardien');
  let gl = g.goals();
  assert.equal(gl.length, 3);
  assert.match(gl[0].title, /Commence la Descente/);
  assert.deepEqual(gl.map((x) => x.kind), ['depth', 'boss', 'collection']);
  assert.ok(gl.every((x) => x.href && x.title));
  assert.match(gl[1].title, /Dévoreur/);
  g.s.bossesBeaten.devoreur = 1;
  assert.equal(g.sceauxOpen(), true, 'Sceaux ouverts après le premier gardien');
  assert.match(g.goals()[1].title, /Matriarche/);
  g.s.descent.best = 7;
  assert.match(g.goals()[0].title, /chapitre 2/, 'v406 : le chapitre en cours');
  assert.match(g.goals()[0].sub, /Matriarche/);
  assert.match(g.goals()[0].sub, /abyssal/, 'gardien de l’étage 10 : coffre abyssal');
  // équipe trop faible et assez de cendres : objectif « Renforce »
  (await import('./helpers.mjs')).noWelcome(g); g.team(); // équipe de départ, niveau 1
  g.s.ash = 500;
  assert.ok(g.goals().some((x) => x.kind === 'forge' && /Renforce/.test(x.title)));
  g.s.ash = 0;
  for (const k of (await import('../js/core/bosses.js')).BOSS_ORDER) g.s.bossesBeaten[k] = 1;
  assert.equal(g.goals()[1].kind, 'sceaux');
  // ensemble presque complet : il passe devant le royaume
  const set = catalog.sets[0];
  set.cards.slice(0, -2).forEach((id) => g.addCard(id));
  assert.match(g.goals().find((x) => x.kind === 'collection').title, new RegExp(`ensemble ${set.name}`));
});

test('équipes enregistrées : 4 au plus, rechargées d’un toucher, gardées par la sauvegarde', async () => {
  const { Game } = await import('../js/core/game.js');
  const { MemoryStorage, rngFrom } = await import('./helpers.mjs');
  const { migrate, defaultSave } = await import('../js/core/save.js');
  const storage = new MemoryStorage();
  const g = new Game(catalog, storage, { rng: rngFrom('tp'), clock: () => new Date(2026, 9, 12, 12) });
  const a = ['INF-001', 'INF-009', 'INF-003', 'INF-011', 'INF-005'], b = ['ABY-003', 'ABY-004', 'CEL-004', 'CEL-005', 'SAU-014'];
  [...a, ...b].forEach((id) => g.addCard(id));
  g.setTeam(a); g.saveTeamPreset('Feu');
  g.setTeam(b); g.saveTeamPreset('Mer');
  assert.throws(() => g.saveTeamPreset('  '), /nom/);
  g.loadTeamPreset(0);
  assert.deepEqual(g.s.team, a);
  g.saveTeamPreset('feu', b);
  assert.equal(g.teamPresets().length, 2, 'même nom : remplacée');
  g.saveTeamPreset('C'); g.saveTeamPreset('D');
  assert.throws(() => g.saveTeamPreset('E'), /4 équipes/);
  g.deleteTeamPreset(3);
  assert.equal(g.teamPresets().length, 3);
  const g2 = new Game(catalog, storage, { rng: rngFrom('tp2'), clock: () => new Date(2026, 9, 12, 12) });
  assert.equal(g2.teamPresets().length, 3);
  const old = defaultSave(); delete old.teamPresets;
  assert.deepEqual(migrate(old).teamPresets, []);
});

test('attaque rythmée : le bonus s’ajoute au jet suivant, une seule fois', async () => {
  const D = await import('../js/core/duel.js');
  const { Game } = await import('../js/core/game.js');
  const { MemoryStorage, rngFrom, noWelcome } = await import('./helpers.mjs');
  const g = noWelcome(new Game(catalog, new MemoryStorage(), { rng: rngFrom('ry'), clock: () => new Date(2026, 9, 12, 12) }));
  g.team(); g.startRun(); g.chooseDoor(g.doors()[0]);
  const st = g.s.descent.run.battle;
  const ally = D.front(st, 'ally')[0], foe = D.front(st, 'enemy')[0];
  const base = D.rollInfo(st, ally.uid, 'estoc', foe.uid);
  st.rhythm = D.RHYTHM.perfect;
  const boosted = D.rollInfo(st, ally.uid, 'estoc', foe.uid);
  assert.equal(boosted.mod, base.mod + D.RHYTHM.perfect);
  assert.ok(boosted.mods.some(([n]) => n === 'Frappe parfaite'));
});
