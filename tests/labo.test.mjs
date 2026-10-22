// v595 : banc d'essai de la Descente (Labo des combats) : bac à sable sans effet sur la partie, simulation, courbe.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { labBattle, labEngine, labSimulate, fitCurve, labSummary } from '../js/core/lab.js';
import { autoDuel } from '../js/core/duel.js';
import { enemyScale, lateSoft } from '../js/core/descent.js';

const game = () => { const g = new Game(loadCatalog(), new MemoryStorage(), { rng: rngFrom('labo') }); noWelcome(g); g.team(); return g; };

test('combat du Labo : mêmes ennemis que la Descente, multiplicateurs appliqués, sauvegarde intacte', () => {
  const g = game(); g.descent(); const before = JSON.stringify(g.s); /* descent() pose seulement le jour courant */
  const a = labBattle(g, { floor: 12, room: 'fight', seed: 5, day: '2026-11-03' });
  const b = labBattle(g, { floor: 12, room: 'fight', seed: 5, day: '2026-11-03', hp: 2, atk: 1.5 });
  const ea = a.st.order.enemy.map((id) => a.st.units[id]), eb = b.st.order.enemy.map((id) => b.st.units[id]);
  assert.deepEqual(ea.map((e) => e.id), eb.map((e) => e.id));
  ea.forEach((e, i) => { assert.ok(Math.abs(eb[i].maxHp - e.maxHp * 2) <= 1); assert.ok(eb[i].atk >= e.atk); });
  const eng = labEngine(a.st);
  autoDuel(a.st);
  assert.ok(a.st.over);
  assert.equal(typeof eng.duelPass, 'function');
  assert.equal(JSON.stringify(g.s), before, 'la partie ne change pas');
  const s = labSummary(a.st); assert.ok(s.lost >= 0 && s.lost <= 100);
});

test('gardien du Labo : étage ramené à un multiple de 5, gardien présent', () => {
  const g = game(), { st, run } = labBattle(g, { floor: 23, room: 'boss', level: 'type' });
  assert.equal(run.floor, 25);
  assert.ok(st.order.enemy.some((id) => st.units[id].boss));
});

test('simulation : des ennemis plus forts font perdre plus souvent', () => {
  const g = game();
  const easy = labSimulate(g, { floor: 10, room: 'fight', level: 'type', hp: 0.6, atk: 0.6 }, 12, 'mid');
  const hard = labSimulate(g, { floor: 10, room: 'fight', level: 'type', hp: 2.2, atk: 2.2 }, 12, 'mid');
  assert.ok(easy.win >= hard.win, `${easy.win} ${hard.win}`);
  assert.ok(easy.lost <= hard.lost);
});

test('courbe : passe par les notes, jamais de baisse de force d’un étage au suivant', () => {
  const c = fitCurve([{ floor: 10, room: 'fight', hp: 1.2, atk: 1, note: 'ok' }, { floor: 30, room: 'fight', hp: 1, atk: 1, note: 'easy2' }, { floor: 31, room: 'fight', hp: 0.5, atk: 0.5, note: 'ok' }]);
  assert.ok(Math.abs(c.foe.hp[9] - 1.2) < 1e-9);
  assert.ok(Math.abs(c.foe.hp[29] - 1.25) < 1e-9);
  for (let f = 2; f <= 100; f++) assert.ok(enemyScale(f) * lateSoft(f) * c.foe.hp[f - 1] >= enemyScale(f - 1) * lateSoft(f - 1) * c.foe.hp[f - 2] - 1e-9, `étage ${f}`);
  assert.ok(c.raised.length > 0, 'la baisse à l’étage 31 est corrigée');
  assert.deepEqual(c.at(5, 'boss'), { hp: 1, atk: 1 });
});

test('attaques inventées au Labo : utilisées dans le combat d’essai seulement, avec leurs effets', async () => {
  const { enemyAct, labKinds } = await import('../js/core/duel.js');
  const g = game();
  const atk = [{ name: 'Morsure de test', mult: 1.5, hits: 2, target: 'weakest', poison: 4, chance: 1 }, { name: 'Vague de test', mult: 0.5, target: 'all', freeze: true, chance: 0, on: false }];
  const { st } = labBattle(g, { floor: 8, room: 'fight', seed: 3, day: '2026-11-03', attacks: atk });
  const e = st.order.enemy.map((id) => st.units[id])[0];
  const D = await import('../js/core/duel.js');
  D.beginEnemyTurn(st);
  let seen = false;
  for (let k = 0; k < 6 && !st.over; k++) { for (let s = D.nextEnemy(st); s; s = D.nextEnemy(st)) { if (st.units[s.a].intent?.kind === 'lab0') { seen = true; assert.ok(s.qte); } enemyAct(st, s.a, 'none'); } D.endEnemyTurn(st); if (st.turn === 'ally') D.beginEnemyTurn(st); }
  assert.ok(seen, 'l’attaque inventée est jouée');
  assert.ok(Object.values(st.units).some((u) => u.side === 'ally' && (u.poison || 0) > 0 || u.hp <= 0), 'poison posé');
  labKinds([]);
  const real = labBattle(g, { floor: 8, room: 'fight', seed: 3, day: '2026-11-03' }).st;
  assert.ok(!real.labAtk);
  assert.ok(e);
});

test('pouvoirs inventés au Labo : compétence proposée, jouée, pouvoir d’équipe remplacé', async () => {
  const D = await import('../js/core/duel.js');
  const g = game();
  const { st } = labBattle(g, { floor: 3, room: 'fight', seed: 9, day: '2026-11-03', level: 'type',
    skills: [{ name: 'Éclair de test', ap: 0, target: 'allEnemies', mult: 1.2, poison: 2 }], teamUlt: { name: 'Grâce de test', target: 'ally', heal: 0.5, shield: true } });
  const actor = st.actor, acts = D.actionsFor(st, actor);
  const sk = acts.find((a) => a.key === 'lsk0');
  assert.ok(sk && sk.ok, 'la compétence inventée est proposée');
  const before = st.order.enemy.map((id) => st.units[id].hp);
  const ev = D.act(st, actor, 'lsk0');
  assert.ok(ev.some((e) => e.t === 'dmg'));
  assert.ok(st.order.enemy.some((id, i) => st.units[id].hp < before[i]));
  st.fervor = 10;
  if (st.turn === 'ally' && st.actor && D.ultReady(st)) { D.useUlt(st); assert.ok(D.front(st, 'ally').every((u) => u.shield === 1)); }
});
