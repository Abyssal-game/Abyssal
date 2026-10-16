// v344 : un ennemi tué au milieu de son attaque de zone (épines, riposte) ne frappe pas les créatures suivantes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from './helpers.mjs';
import * as D from '../js/core/duel.js';

const catalog = loadCatalog();
test('attaque de zone : l’ennemi tué par des épines s’arrête net', () => {
  const allies = ['INF-001', 'INF-002', 'INF-004'].map((id) => D.duelUnit(catalog.get(id)));
  allies[0].talent = 'epines';
  const foe = D.duelUnit(catalog.get('NEC-010'), { side: 'enemy', scale: 3 });
  const st = D.createDuel(allies, [foe], { seed: 4 });
  const e = st.units[st.order.enemy[0]];
  e.hp = 2; e.intent = { kind: 'blast' };
  const a = st.order.ally.map((id) => st.units[id]);
  // l'ordre de frappe suit l'ordre de l'équipe : la créature aux épines est touchée la première
  const before = a.map((u) => u.hp);
  st.turn = 'enemy';
  D.enemyAct(st, e.uid, 'none');
  assert.ok(e.hp <= 0, 'les épines ont tué l’ennemi');
  assert.ok(a[0].hp < before[0], 'la première créature a bien été touchée');
  assert.equal(a[1].hp, before[1], 'la deuxième n’est pas touchée par un ennemi déjà mort');
  assert.equal(a[2].hp, before[2], 'la troisième non plus');
  assert.equal(st.over, 'won');
});
