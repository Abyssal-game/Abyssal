// v250 : Brèche et Exposé (états posés par une créature, exploités par une autre), frappe parfaite assurée
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from './helpers.mjs';
import * as D from '../js/core/duel.js';
import { RHYTHM } from '../js/core/duel.js';
import { roleOf } from '../js/core/army.js';

const cat = loadCatalog();
const unit = (c, o = {}) => D.duelUnit(c, { level: 5, ...o });
const roleCards = (role) => cat.cards.filter((c) => roleOf(c) === role);
function pick(role) { const c = roleCards(role)[0]; assert.ok(c, `carte ${role}`); return c; }
function mk(roles, foeScale = 1, seed = 7) {
  const allies = roles.map((r) => unit(pick(r)));
  const foe = unit(cat.cards.find((c) => c.rarity === 'R'), { side: 'enemy', scale: foeScale, level: 5 });
  const st = D.createDuel(allies, [foe], { seed, fervor: 6 });
  st.ap = 3; st.fervor = 6;
  return { st, allies, foe: st.units[st.order.enemy[0]] };
}

test('Brèche : posée par l’attaque d’un Protecteur, exploitée par un autre allié (pas par lui-même)', () => {
  const { st, allies, foe } = mk(['protecteur', 'degats', 'soin'], 8);
  const pu = st.order.ally.map((id) => st.units[id]).find((u) => u.role === 'protecteur');
  const du = st.order.ally.map((id) => st.units[id]).find((u) => u.role === 'degats');
  foe.shield = 1; foe.hp = foe.maxHp;
  let ev = D.act(st, pu.uid, 'attack', foe.uid);
  assert.ok(ev.some((e) => e.t === 'block'), 'le bouclier bloque le premier coup');
  // 2e coup du Protecteur : pose la Brèche ; 3e coup (lui-même) ne l’exploite pas
  st.ap = 3; pu.acts = 0;
  ev = D.act(st, pu.uid, 'attack', foe.uid);
  assert.ok(foe.breach && foe.breach.by === pu.uid, 'Brèche posée');
  foe.shield = 1; st.ap = 3; pu.acts = 0;
  ev = D.act(st, pu.uid, 'attack', foe.uid);
  assert.ok(ev.some((e) => e.t === 'block') && foe.breach, 'le poseur ne profite pas de sa propre Brèche');
  foe.shield = 1; st.ap = 3;
  const hp = foe.hp;
  ev = D.act(st, du.uid, 'attack', foe.uid);
  const syn = ev.find((e) => e.combo === 'breche');
  assert.ok(syn && syn.by === pu.uid && syn.a === du.uid, 'Brèche exploitée par un autre allié');
  assert.ok(!ev.some((e) => e.t === 'block') && foe.hp < hp, 'le coup perce le bouclier');
  assert.equal(foe.breach, null, 'consommée');
});

test('Exposé : posé par une compétence à dé réussie, exploité par l’attaque d’un autre allié (+1 Ferveur)', () => {
  const { st, foe } = mk(['controle', 'degats', 'soin'], 10);
  const cu = st.order.ally.map((id) => st.units[id]).find((u) => u.role === 'controle');
  const du = st.order.ally.map((id) => st.units[id]).find((u) => u.role === 'degats');
  st.rhythm = RHYTHM.perfect; // réussite assurée
  let ev = D.act(st, cu.uid, 'entrave', foe.uid);
  const roll = ev.find((e) => e.t === 'roll');
  assert.ok(roll.perfect && roll.tier !== 'fumble' && roll.tier !== 'partial', 'frappe parfaite → réussite');
  assert.ok(foe.open && foe.open.by === cu.uid, 'Exposé posé');
  const fv = st.fervor; st.ap = 3;
  ev = D.act(st, du.uid, 'attack', foe.uid);
  const syn = ev.find((e) => e.combo === 'expose');
  assert.ok(syn && syn.by === cu.uid && syn.a === du.uid, 'Exposé exploité');
  assert.ok(st.fervor > fv - 0 || ev.some((e) => e.t === 'fervor' && e.why === 'Exposé'), '+1 Ferveur');
  assert.equal(foe.open, null);
});

test('Brèche et Exposé expirent à la fin du tour suivant', () => {
  const { st, foe } = mk(['protecteur', 'degats', 'soin'], 8);
  foe.breach = { by: 'x', until: st.round + 1 }; foe.open = { by: 'x', until: st.round + 1 };
  D.beginEnemyTurn(st); while (D.nextEnemy(st)) { D.enemyAct(st, D.nextEnemy(st).a, 'none'); }
  D.endEnemyTurn(st);
  assert.ok(foe.breach && foe.open, 'encore là au tour suivant');
  D.beginEnemyTurn(st); while (D.nextEnemy(st)) { D.enemyAct(st, D.nextEnemy(st).a, 'none'); }
  D.endEnemyTurn(st);
  assert.ok(!foe.breach && !foe.open, 'expirés');
});

test('Frappe parfaite : un 1 ne reste pas un échec critique ; un 20 reste un critique', () => {
  let fumbles = 0, crits = 0, partials = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const { st, foe } = mk(['degats', 'soin', 'soutien'], 10, seed);
    const du = st.order.ally.map((id) => st.units[id]).find((u) => u.role === 'degats');
    st.rhythm = RHYTHM.perfect;
    const roll = D.act(st, du.uid, 'estoc', foe.uid).find((e) => e.t === 'roll');
    if (!roll) continue;
    if (roll.tier === 'fumble') fumbles++; if (roll.tier === 'crit') crits++; if (roll.tier === 'partial') partials++;
  }
  assert.equal(fumbles, 0); assert.equal(partials, 0);
});
