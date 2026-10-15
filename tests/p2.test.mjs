// v269 : Hâte, Retard, Assaut conjoint, détonation du poison, ultimes à condition
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from './helpers.mjs';
import * as D from '../js/core/duel.js';
import { roleOf } from '../js/core/army.js';

const cat = loadCatalog();
const pick = (role, k = 0) => cat.cards.filter((c) => roleOf(c) === role && c.rarity === 'C')[k];
function mk(roles, { foes = 2, scale = 10, elite = false, seed = 3 } = {}) {
  const allies = roles.map((r) => D.duelUnit(pick(r), { level: 5 }));
  const enemies = Array.from({ length: foes }, (_, i) => D.duelUnit(cat.cards.filter((c) => c.rarity === 'C')[i + 3], { side: 'enemy', scale, elite: elite && i === 0 }));
  const st = D.createDuel(allies, enemies, { seed, fervor: 6 });
  D.startInitiative(st);
  const u = (r) => st.order.ally.map((id) => st.units[id]).find((x) => x.role === r);
  return { st, u };
}
// force l'ordre du tour : la liste donnée, puis les autres
function order(st, first) { st.init = [...first, ...st.init.filter((id) => !first.includes(id))]; st.ip = 0; st.turn = 'ally'; st.actor = first[0]; st.units[first[0]].acts = 0; st.units[first[0]].pa = 6; }

test('Hâte : la créature choisie joue juste après la Soutien, une fois par tour', () => {
  const { st, u } = mk(['soutien', 'protecteur', 'degats']);
  const s = u('soutien'), d = u('degats'), p = u('protecteur');
  const foes = st.order.enemy;
  order(st, [s.uid, p.uid, ...foes, d.uid]);
  const a = D.actionsFor(st, s.uid).find((x) => x.key === 'hate');
  assert.ok(a && a.ok, a?.why);
  assert.ok(!D.actionTargets(st, s.uid, 'hate').includes(p.uid), 'déjà juste après : inutile');
  D.act(st, s.uid, 'hate', d.uid);
  assert.equal(st.actor, d.uid, 'l’Assaut joue tout de suite après');
  assert.equal(st.hasteRound, st.round);
});

test('Assaut conjoint : deux coups, effets des deux rôles, l’alliée appelée perd son tour, une fois par combat', () => {
  const { st, u } = mk(['degats', 'poison', 'protecteur'], { scale: 30 });
  const d = u('degats'), v = u('poison');
  const f = st.units[st.order.enemy[0]];
  order(st, [d.uid, v.uid, ...st.order.enemy]);
  f.mark = 2; f.markBy = 'x';
  const a = D.actionsFor(st, d.uid).find((x) => x.key === 'duo');
  assert.ok(a.ok, a.why);
  const hp = f.hp, fv = st.fervor;
  const ev = D.act(st, d.uid, 'duo', f.uid);
  assert.ok(ev.some((e) => e.t === 'duo'));
  assert.ok(ev.filter((e) => e.t === 'dmg' && e.u === f.uid).length >= 2, 'deux coups');
  assert.ok(f.hp < hp && f.poison >= 4, 'effet du Venin');
  assert.equal(st.fervor <= fv - D.DUO_FERVOR + 2, true, '3 Ferveur dépensées');
  assert.notEqual(st.actor, v.uid, 'l’alliée appelée ne rejoue pas');
  assert.equal(st.duoUsed, true);
});

test('Assaut conjoint : refusé sans cible Fêlée, Brisée ou Marquée', () => {
  const { st, u } = mk(['degats', 'soin', 'protecteur']);
  const d = u('degats');
  order(st, [d.uid, u('soin').uid, ...st.order.enemy]);
  const a = D.actionsFor(st, d.uid).find((x) => x.key === 'duo');
  assert.ok(!a.ok && /Fêlé/.test(a.why));
});

test('Retard : une Entrave partielle fait reculer l’ennemi dans l’ordre du tour', () => {
  const { st, u } = mk(['controle', 'soin', 'protecteur'], { foes: 3 });
  const c = u('controle'), [e1, e2, e3] = st.order.enemy;
  order(st, [c.uid, e1, e2, e3]);
  st.rhythm = 0;
  // on force un jet partiel
  const r = D.rollInfo(st, c.uid, 'entrave', e1); assert.ok(r);
  let tries = 0, ev;
  do { order(st, [c.uid, e1, e2, e3]); st.seed = 1000 + tries; st.units[e1].frozen = 0; ev = D.act(st, c.uid, 'entrave', e1); tries++; } while (!ev.some((e) => e.t === 'roll' && e.tier === 'partial') && tries < 200);
  assert.ok(ev.some((e) => e.s === 'Retardée'), 'retardée');
});

test('Détonation : le Raz-de-marée fait exploser un poison de 6 ou plus', () => {
  const { st, u } = mk(['zone', 'soin', 'protecteur'], { scale: 20 });
  const z = u('zone'), f = st.units[st.order.enemy[0]];
  order(st, [z.uid, ...st.order.enemy]);
  f.poison = 8;
  const ev = D.act(st, z.uid, 'raz');
  assert.ok(ev.some((e) => /Détonation/.test(e.s || '')));
  assert.equal(f.poison, 0);
});
