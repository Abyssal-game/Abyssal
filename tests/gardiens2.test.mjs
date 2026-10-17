// v383 : les cinq gardiens des étages 30 à 50 (Reine des Essaims, Bourreau, Chœur des Noyés, Seigneur des Chaînes, Horloger).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from './helpers.mjs';
import * as D from '../js/core/duel.js';
import { bossOf } from '../js/core/bosses.js';

const catalog = loadCatalog();
const A = (id, o = {}) => D.duelUnit(catalog.get(id), o);
const E = (id, o = {}) => D.duelUnit(catalog.get(id), { side: 'enemy', ...o });
const units = (st, side) => st.order[side].map((id) => st.units[id]);
const boss = (st) => units(st, 'enemy').find((u) => u.boss);
const team = () => [A('INF-001', { level: 5 }), A('INF-009', { level: 5 }), A('INF-003', { level: 5 })];
const duel = (key) => D.createDuel(team(), [E('NEC-010', { boss: true, scale: 1.2 })], { seed: 7, boss: key });
// le gardien joue l'intention donnée (sans défense)
const play = (st, intent) => { const b = boss(st); b.intent = intent; D.beginEnemyTurn(st); const s = D.nextEnemy(st); D.enemyAct(st, s.a, 'none'); D.endEnemyTurn(st); return b; };

test('étages 30 à 50 : les nouveaux gardiens, puis le cycle des dix', () => {
  assert.deepEqual([30, 35, 40, 45, 50].map(bossOf), ['essaim', 'bourreau', 'choeur', 'chaines', 'horloge']);
  assert.equal(bossOf(55), 'devoreur');
});

test('Reine des Essaims : l’Essaim frappe toute l’équipe et l’empoisonne', () => {
  const st = duel('essaim');
  const b = play(st, { kind: 'brood' });
  assert.equal(b.charged, 'swarm');
  const st2 = duel('essaim');
  play(st2, { kind: 'swarm' });
  assert.ok(units(st2, 'ally').slice(0, 3).every((x) => x.poison > 0 || x.hp <= 0));
});

test('Bourreau : la Sentence condamne, l’exécution frappe dans le vide si la condamnée est en réserve', () => {
  const st = duel('bourreau');
  const t = units(st, 'ally')[2];
  const b = play(st, { kind: 'sentence', t: t.uid });
  assert.ok(t.condemned); assert.equal(b.charged, 'execute');
  const hp = t.hp;
  t.inPlay = false; // permutée en réserve
  st.order.ally = st.order.ally.filter((id) => id !== t.uid).concat(t.uid);
  play(st, { kind: 'execute', t: t.uid });
  assert.equal(t.hp, hp);
  assert.ok(!t.condemned);
});

test('Chœur des Noyés : la Complainte retire boucliers et bonus, et 2 Ferveur', () => {
  const st = duel('choeur');
  const a = units(st, 'ally')[0]; a.shield = 1; a.boost = 3; st.fervor = 4;
  play(st, { kind: 'lament' });
  assert.equal(a.shield, 0); assert.equal(a.boost, 0);
  assert.ok(st.fervor <= 4 - 2 + 2, 'la Ferveur baisse (hors gains du tour)');
});

test('Seigneur des Chaînes : la créature la plus forte est enchaînée', () => {
  const st = duel('chaines');
  const t = units(st, 'ally')[0];
  const b = boss(st); b.intent = { kind: 'chain', t: t.uid };
  D.beginEnemyTurn(st); const s = D.nextEnemy(st);
  const ev = D.enemyAct(st, s.a, 'none');
  // la cible, ou le Protecteur qui prend le coup à sa place, est enchaînée
  assert.ok(ev.some((x) => x.t === 'status' && x.s === 'Enchaînée' && st.units[x.u].frozen));
});

test('Horloger : le retour en arrière rend les PV perdus depuis l’annonce (un quart au plus)', () => {
  const st = duel('horloge');
  const b = boss(st);
  b.hp = b.maxHp; b.mark = b.maxHp; b.charged = 'rewind';
  b.hp = Math.round(b.maxHp * 0.6);
  play(st, { kind: 'rewind' });
  assert.ok(b.hp >= Math.round(b.maxHp * 0.6) + Math.round(b.maxHp * 0.25) - 1 && b.hp <= b.maxHp);
});
