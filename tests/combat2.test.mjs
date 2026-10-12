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
  assert.ok(r.some((l) => /tombé/.test(l)));
});

test('objectifs : trois cibles concrètes, qui suivent la progression', async () => {
  const { Game } = await import('../js/core/game.js');
  const { MemoryStorage, rngFrom } = await import('./helpers.mjs');
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('obj'), clock: () => new Date(2026, 9, 12, 12) });
  let gl = g.goals();
  assert.equal(gl.length, 3);
  assert.deepEqual(gl.map((x) => x.kind), ['depth', 'boss', 'collection']);
  assert.ok(gl.every((x) => x.href && x.title));
  assert.match(gl[1].title, /Dévoreur/);
  g.s.bossesBeaten.devoreur = 1;
  assert.match(g.goals()[1].title, /Matriarche/);
  g.s.descent.best = 7;
  assert.match(g.goals()[0].title, /étage 10/);
  for (const k of ['devoreur', 'matriarche', 'roi', 'architecte', 'eclipse']) g.s.bossesBeaten[k] = 1;
  assert.equal(g.goals()[1].kind, 'sceaux');
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
