// v253 : talents qui changent une règle (Faim abyssale, Élan, Rémanence, Dernier rempart, Vigilance, Ferveur ardente, Ténacité, Perce-armure)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from './helpers.mjs';
import * as D from '../js/core/duel.js';
import { roleOf } from '../js/core/army.js';
import { TALENTS } from '../js/core/skills.js';

const cat = loadCatalog();
const roleCards = (role) => cat.cards.filter((c) => roleOf(c) === role);
const pick = (role) => roleCards(role)[0];
function mk(roles, { foeScale = 1, elite = false, talents = {} } = {}) {
  const allies = roles.map((r) => D.duelUnit(pick(r), { level: 5 }));
  const foe = D.duelUnit(cat.cards.find((c) => c.rarity === 'R'), { side: 'enemy', scale: foeScale, level: 5, elite });
  const st = D.createDuel(allies, [foe], { seed: 5, fervor: 4 });
  const unit = (role) => st.order.ally.map((id) => st.units[id]).find((u) => u.role === role);
  for (const [role, t] of Object.entries(talents)) unit(role).talent = t;
  st.ap = 3; st.fervor = 4;
  return { st, unit, foe: st.units[st.order.enemy[0]] };
}

test('les talents proposés changent tous une règle (Instinct et Carapace ne sont plus proposés)', () => {
  const offered = Object.keys(TALENTS).filter((k) => !TALENTS[k].legacy);
  assert.equal(offered.length, 12);
  assert.ok(!offered.includes('vif') && !offered.includes('robuste'));
});

test('Faim abyssale : +1 Ferveur de plus sur un coup de grâce, une fois par combat', () => {
  const { st, unit, foe } = mk(['degats', 'soin', 'soutien'], { talents: { degats: 'faim' } });
  foe.hp = 1; const f0 = st.fervor;
  const ev = D.act(st, unit('degats').uid, 'attack', foe.uid);
  assert.ok(ev.some((e) => e.t === 'fervor' && e.why === 'Faim abyssale'));
  assert.ok(st.fervor >= Math.min(6, f0 + 2) || st.fervor === 6);
});

test('Élan : achever un ennemi rend 1 action à l’équipe', () => {
  const { st, unit, foe } = mk(['degats', 'soin', 'soutien'], { talents: { degats: 'elan' } });
  foe.hp = 1; st.ap = 1;
  D.act(st, unit('degats').uid, 'attack', foe.uid);
  assert.equal(st.ap, 1, '1 action dépensée, 1 rendue');
});

test('Rémanence : la Marque qu’elle pose dure 3 tours au lieu de 2', () => {
  const { st, unit, foe } = mk(['soutien', 'degats', 'soin'], { talents: { soutien: 'remanence' } });
  D.act(st, unit('soutien').uid, 'marque', foe.uid);
  assert.equal(foe.mark, 3);
});

test('Dernier rempart : la première Brisure donne un bouclier à toute l’équipe au combat', () => {
  const { st, unit, foe } = mk(['protecteur', 'degats', 'soin'], { foeScale: 6, elite: true, talents: { protecteur: 'rempart' } });
  assert.ok(foe.brkMax > 0); foe.brk = 0; foe.cracked = { seq: -1, until: 9 }; foe.hp = foe.maxHp;
  const ev = D.act(st, unit('protecteur').uid, 'attack', foe.uid);
  assert.ok(ev.some((e) => e.t === 'broken'), 'brisé');
  assert.ok(st.order.ally.map((id) => st.units[id]).filter((u) => u.hp > 0).every((u) => u.shield === 1), 'bouclier sur toute l’équipe');
});

test('Vigilance : son attaque interrompt un ennemi qui se charge', () => {
  const { st, unit, foe } = mk(['degats', 'soin', 'soutien'], { foeScale: 8, talents: { degats: 'vigilance' } });
  foe.charged = 'heavy'; foe.intent = { kind: 'heavy', t: unit('degats').uid };
  const ev = D.act(st, unit('degats').uid, 'attack', foe.uid);
  assert.equal(foe.charged, null); assert.ok(foe.intent.cancelled);
  assert.ok(ev.some((e) => /Vigilance/.test(e.s || '')));
});

test('Ferveur ardente : la compétence signature coûte 1 Ferveur de moins', () => {
  const { st, unit } = mk(['degats', 'soin', 'soutien'], { talents: { degats: 'ardente' } });
  const a = D.actionsFor(st, unit('degats').uid).find((x) => x.key === 'estoc');
  assert.equal(a.fervor, 1);
  const b = D.actionsFor(st, unit('soin').uid).find((x) => x.key === 'priere');
  assert.equal(b.fervor, 2, 'les autres paient plein tarif');
});

test('Ténacité : elle survit à 1 PV une fois par combat', () => {
  const { st, unit, foe } = mk(['protecteur', 'degats', 'soin'], { foeScale: 30, talents: { protecteur: 'tenacite' } });
  const p = unit('protecteur'); p.hp = 5;
  D.beginEnemyTurn(st);
  foe.intent = { kind: 'hit', t: p.uid }; st.queue = [foe.uid];
  D.enemyAct(st, foe.uid, 'none');
  assert.equal(p.hp, 1, 'tient à 1 PV');
  assert.ok(p.tenSaved);
});

test('Perce-armure : ses attaques ignorent les boucliers', () => {
  const { st, unit, foe } = mk(['degats', 'soin', 'soutien'], { foeScale: 8, talents: { degats: 'perce' } });
  foe.shield = 1; const hp = foe.hp;
  const ev = D.act(st, unit('degats').uid, 'attack', foe.uid);
  assert.ok(!ev.some((e) => e.t === 'block') && foe.hp < hp);
});
