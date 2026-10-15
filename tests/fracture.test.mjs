// v265 : Marque consommable, Fracture en deux temps, Riposte chargée, soin excédentaire
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from './helpers.mjs';
import * as D from '../js/core/duel.js';
import { roleOf } from '../js/core/army.js';

const cat = loadCatalog();
const pick = (role) => cat.cards.find((c) => roleOf(c) === role && c.rarity === 'C');
function mk(roles = ['protecteur', 'degats', 'soutien'], { elite = true, scale = 8 } = {}) {
  const allies = roles.map((r) => D.duelUnit(pick(r), { level: 5 }));
  const foe = D.duelUnit(cat.cards.find((c) => c.rarity === 'R'), { side: 'enemy', scale, elite });
  const st = D.createDuel(allies, [foe], { seed: 5, fervor: 6 });
  const u = (r) => st.order.ally.map((id) => st.units[id]).find((x) => x.role === r);
  return { st, u, f: st.units[st.order.enemy[0]] };
}
const again = (st, x) => { st.ap = 3; x.acts = 0; };

test('Marque : un seul coup d’un autre allié en profite, puis elle part ; +2 Brisure', () => {
  const { st, u, f } = mk();
  D.act(st, u('soutien').uid, 'marque', f.uid);
  assert.ok(f.mark && f.markBy === u('soutien').uid);
  const brk = f.brk;
  const ev = D.act(st, u('degats').uid, 'attack', f.uid);
  assert.ok(ev.some((e) => e.combo === 'chasse'));
  assert.equal(f.mark, 0, 'consommée');
  assert.ok(brk - f.brk >= 1 + D.MARK_BRK, 'Brisure de l’attaque + 2');
});

test('Marque : celle qui la pose ne la consomme pas', () => {
  const { st, u, f } = mk();
  const s = u('soutien');
  D.act(st, s.uid, 'marque', f.uid); again(st, s);
  D.act(st, s.uid, 'attack', f.uid);
  assert.ok(f.mark > 0, 'toujours là');
});

test('Fracture en deux temps : jauge vide = Fêlé ; le même coup ne brise pas ; le coup de rupture suivant brise', () => {
  const { st, u, f } = mk();
  f.brk = 1; f.intent = { kind: 'charge', t: null };
  const p = u('protecteur');
  D.act(st, p.uid, 'attack', f.uid);
  assert.ok(f.cracked && !f.broken, 'Fêlé seulement');
  // une attaque d'Assaut sans Marque n'est pas un coup de rupture
  D.act(st, u('degats').uid, 'attack', f.uid);
  assert.ok(f.cracked && !f.broken);
  again(st, p);
  const ev = D.act(st, p.uid, 'attack', f.uid);
  assert.ok(ev.some((e) => e.t === 'broken') && f.broken && !f.cracked);
  assert.equal(f.intent.cancelled, true, 'action annulée');
});

test('Fracture : un coup qui consomme une Marque est aussi un coup de rupture', () => {
  const { st, u, f } = mk();
  f.brk = 0; f.cracked = { seq: -1, until: 9 };
  D.act(st, u('soutien').uid, 'marque', f.uid);
  const ev = D.act(st, u('degats').uid, 'attack', f.uid);
  assert.ok(ev.some((e) => e.t === 'broken'));
});

test('Fêlé sans rupture : il se ressaisit à la fin du tour suivant (jauge à moitié)', () => {
  const { st, f } = mk();
  f.brk = 0; f.cracked = { seq: -1, until: st.round + 1 };
  for (let k = 0; k < 2 && !st.over; k++) D.endTurn(st, () => 'dodge');
  if (st.over) return;
  assert.equal(f.cracked, null);
  assert.equal(f.brk, Math.ceil(f.brkMax / 2));
});

test('Riposte chargée : chaque coup encaissé par le Protecteur le charge, sa prochaine attaque la dépense', () => {
  const { st, u, f } = mk(['protecteur', 'degats', 'soin'], { elite: false, scale: 3 });
  const p = u('protecteur'), d = u('degats');
  D.act(st, p.uid, 'rempart', d.uid);
  D.beginEnemyTurn(st);
  f.intent = { kind: 'hit', t: d.uid, qte: false };
  st.queue = [f.uid];
  D.enemyAct(st, f.uid, 'none');
  assert.equal(p.riposte, 1);
  D.endEnemyTurn(st);
  if (st.over) return;
  const ev = D.act(st, p.uid, 'attack', f.uid);
  assert.ok(ev.some((e) => /Riposte chargée/.test(e.s || '')));
  assert.equal(p.riposte, 0);
});

test('Prière : le soin qui dépasse les PV max devient un bouclier (20 % au plus)', () => {
  const { st, u } = mk(['soin', 'degats', 'protecteur']);
  const h = u('soin'), t = u('protecteur');
  t.hp = t.maxHp - 1;
  D.act(st, h.uid, 'priere', t.uid);
  assert.equal(t.hp, t.maxHp);
  assert.ok(t.ward > 0 && t.ward <= Math.round(t.maxHp * D.HEAL_WARD));
});
