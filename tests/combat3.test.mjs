// Refonte du combat (v155) : aperçu de Brisure, plafond des gardiens, effets d'entrée, combinaisons nommées.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from './helpers.mjs';
import * as D from '../js/core/duel.js';
import { roleOf } from '../js/core/army.js';

const catalog = loadCatalog();
const byRole = (role, n = 0) => catalog.cards.filter((c) => c.rarity === 'C' && roleOf(c) === role)[n].id;
const A = (id, o = {}) => D.duelUnit(catalog.get(id), o);
const E = (id, o = {}) => D.duelUnit(catalog.get(id), { side: 'enemy', ...o });
const ally = (st) => st.order.ally.map((id) => st.units[id]);
const foe = (st) => st.order.enemy.map((id) => st.units[id]);

test('aperçu : la Brisure annoncée est celle infligée', () => {
  const st = D.createDuel([A(byRole('protecteur')), A(byRole('degats')), A(byRole('soin'))], [E('NEC-010', { elite: true, scale: 3 })], { seed: 3 });
  const [p] = ally(st), t = foe(st)[0];
  const pv = D.preview(st, p.uid, 'attack', t.uid);
  assert.ok(pv.brk >= 2, 'le Protecteur brise mieux (+1)');
  const before = t.brk;
  D.act(st, p.uid, 'attack', t.uid);
  assert.equal(before - t.brk, pv.brk);
});

test('aperçu : « BRISE ! » quand le coup vide la jauge, et l’intention est annulée', () => {
  const st = D.createDuel([A(byRole('protecteur')), A(byRole('degats')), A(byRole('soin'))], [E('NEC-010', { elite: true, scale: 4 })], { seed: 3 });
  const [p] = ally(st), t = foe(st)[0];
  t.brk = 1; t.intent = { kind: 'charge', t: null };
  const pv = D.preview(st, p.uid, 'attack', t.uid);
  assert.equal(pv.breaks, true);
  const ev = D.act(st, p.uid, 'attack', t.uid);
  assert.ok(ev.some((e) => e.t === 'broken'));
  assert.equal(t.broken, true);
  assert.equal(t.intent.cancelled, true);
});

test('gardien : un seul coup ne retire jamais plus de 40 % de ses PV max', () => {
  const st = D.createDuel([A(byRole('degats')), A(byRole('degats', 1)), A(byRole('soin'))], [E('NEC-010', { boss: true, scale: 2 })], { seed: 3 });
  const [a] = ally(st), b = foe(st)[0];
  a.atk = 999;
  const pv = D.preview(st, a.uid, 'attack', b.uid);
  D.act(st, a.uid, 'attack', b.uid);
  const cap = Math.round(b.maxHp * D.BOSS_HIT_CAP);
  assert.equal(b.maxHp - b.hp, cap);
  assert.equal(pv.dmg, cap, 'l’aperçu montre le plafond');
});

test('entrée en scène : effet du rôle, coût de 1 action, une seule permutation par tour', () => {
  const st = D.createDuel([A(byRole('degats')), A(byRole('degats', 1)), A(byRole('soin')), A(byRole('protecteur')), A(byRole('soutien'))], [E('NEC-010', { scale: 2 })], { seed: 3, fervor: 0 });
  const [a] = ally(st), [, , , p, s] = ally(st);
  const ap = st.ap;
  const ev = D.act(st, a.uid, 'swap', p.uid);
  assert.ok(ev.some((e) => e.k === 'entrance'));
  assert.equal(p.shield, 1, 'Prise de garde : bouclier');
  assert.equal(st.ap, ap - 1);
  assert.equal(D.act(st, p.uid, 'swap', s.uid).length, 0, 'deuxième permutation refusée');
  assert.equal(st.ap, ap - 1);
});

test('entrée en scène : le Soutien donne 1 Ferveur, le Contrôle ralentit l’ennemi qui visait la sortante', () => {
  const st = D.createDuel([A(byRole('degats')), A(byRole('degats', 1)), A(byRole('soin')), A(byRole('soutien')), A(byRole('controle'))], [E('NEC-010', { scale: 2 })], { seed: 3, fervor: 0 });
  const [a, b] = ally(st), [, , , s, c] = ally(st), e = foe(st)[0];
  const f = st.fervor;
  D.act(st, a.uid, 'swap', s.uid);
  assert.equal(st.fervor, f + 1);
  D.endTurn(st);
  if (st.over) return;
  e.intent = { kind: 'hit', t: b.uid };
  D.act(st, b.uid, 'swap', c.uid);
  assert.equal(e.slow, true);
  assert.equal(e.intent.t, c.uid, 'la cible annoncée devient la créature entrée');
});

test('combinaisons : Chasse (Marque puis Estoc) et Bastion (Rempart puis Prière)', () => {
  const st = D.createDuel([A(byRole('soutien')), A(byRole('degats')), A(byRole('protecteur'))], [E('NEC-010', { scale: 4 })], { seed: 7, fervor: 6 });
  const [s, d] = ally(st), t = foe(st)[0];
  D.act(st, s.uid, 'marque', t.uid);
  const ev = D.act(st, d.uid, 'estoc', t.uid);
  const tier = ev.find((e) => e.t === 'roll')?.tier;
  if (tier !== 'fumble') assert.ok(ev.some((e) => e.combo === 'chasse'));

  const st2 = D.createDuel([A(byRole('protecteur')), A(byRole('soin')), A(byRole('degats'))], [E('NEC-010', { scale: 4 })], { seed: 7, fervor: 6 });
  const [p, h, x] = ally(st2);
  D.act(st2, p.uid, 'rempart', x.uid);
  x.hp = Math.max(1, x.hp - 3);
  const ev2 = D.act(st2, h.uid, 'priere', x.uid);
  assert.ok(ev2.some((e) => e.combo === 'bastion'));
  assert.equal(x.shield, 1);
});

test('actions : un double toucher ne dépense pas deux fois, les points d’action ne passent jamais sous zéro', () => {
  const st = D.createDuel([A(byRole('degats')), A(byRole('degats', 1)), A(byRole('soin'))], [E('NEC-010', { scale: 9 })], { seed: 3 });
  const [a, b, c] = ally(st), t = foe(st)[0];
  D.act(st, a.uid, 'attack', t.uid); D.act(st, a.uid, 'attack', t.uid);
  assert.equal(st.ap, 1);
  assert.equal(D.act(st, a.uid, 'attack', t.uid).length, 0, 'une créature agit 2 fois au plus');
  D.act(st, b.uid, 'attack', t.uid);
  assert.equal(st.ap, 0);
  assert.equal(D.act(st, c.uid, 'attack', t.uid).length, 0);
  assert.equal(st.ap, 0);
});

test('ennemi Protecteur : couvre d’abord l’allié qui prépare une attaque', () => {
  const prot = catalog.cards.find((c) => roleOf(c) === 'protecteur' && c.rarity === 'C').id;
  for (let seed = 1; seed < 40; seed++) {
    const st = D.createDuel([A(byRole('degats')), A(byRole('degats', 1)), A(byRole('soin'))], [E(prot, { scale: 2 }), E('NEC-010', { scale: 2 })], { seed });
    const [p, m] = foe(st);
    m.charged = 'heavy'; m.hp = m.maxHp; p.hp = Math.round(p.maxHp / 3);
    st.round = 1; // au tour suivant (pair), le Protecteur ennemi pose un bouclier
    D.endTurn(st); if (st.over) continue;
    if (p.intent?.kind === 'shield') { assert.equal(p.intent.t, m.uid); return; }
  }
  assert.fail('le Protecteur ennemi n’a jamais posé de bouclier');
});
