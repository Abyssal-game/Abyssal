// v271 : runes du gardien, serviteurs qui renforcent sa grosse attaque, Éveil tactique par rôle
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from './helpers.mjs';
import * as D from '../js/core/duel.js';
import { CREATURE_KITS, moveFor } from '../js/core/kits.js';
import { roleOf } from '../js/core/army.js';

const cat = loadCatalog();
const pick = (role) => cat.cards.find((c) => roleOf(c) === role && c.rarity === 'C');
function bossFight({ servants = 2, seed = 4 } = {}) {
  const allies = ['protecteur', 'degats', 'soin'].map((r) => D.duelUnit(pick(r), { level: 5 }));
  const boss = D.duelUnit(cat.cards.find((c) => c.rarity === 'HR'), { side: 'enemy', scale: 3, boss: true });
  const others = Array.from({ length: servants }, (_, i) => D.duelUnit(cat.cards.filter((c) => c.rarity === 'C')[i + 5], { side: 'enemy', scale: 3 }));
  const st = D.createDuel(allies, [boss, ...others], { seed, fervor: 6 });
  D.startInitiative(st);
  return { st, b: st.units[st.order.enemy[0]], allies: st.order.ally.map((id) => st.units[id]) };
}

test('runes : trois runes tirées, chacune retire 10 % des dégâts subis par le gardien', () => {
  const { st, b, allies } = bossFight();
  assert.equal(st.runes.length, 3);
  const a = allies[1];
  const full = D.dmgOf(st, a, b, 1);
  const saved = st.runes; st.runes = null;
  const bare = D.dmgOf(st, a, b, 1);
  st.runes = saved;
  assert.ok(full < bare, 'les runes protègent');
});

test('runes : les trois brisées, le gardien est Fêlé', () => {
  const { st, b, allies } = bossFight({ servants: 0 });
  st.runes = [{ k: 'marque', broken: true }, { k: 'parade', broken: true }, { k: 'conjoint', broken: false }];
  b.mark = 2; b.markBy = 'x';
  // un Assaut conjoint sur lui brise la dernière rune
  const u = st.units[st.actor] || allies[0];
  st.turn = 'ally'; st.actor = allies[0].uid; st.init = [allies[0].uid, allies[1].uid, b.uid]; st.ip = 0; allies[0].acts = 0;
  const ev = D.act(st, allies[0].uid, 'duo', b.uid);
  assert.ok(ev.some((e) => e.t === 'rune' && e.k === 'conjoint'), 'rune brisée');
  assert.ok(b.cracked || b.broken, 'Fêlé (ou déjà brisé par le coup de rupture)');
  void u;
});

test('serviteurs : la grosse attaque du gardien est plus forte tant qu’ils sont debout', () => {
  const run = (servants) => {
    const { st, b, allies } = bossFight({ servants, seed: 9 });
    st.turn = 'enemy'; st.queue = [b.uid]; b.intent = { kind: 'heavy', t: allies[0].uid, qte: true };
    allies.forEach((x) => { x.maxHp = x.hp = 500; });
    const ev = D.enemyAct(st, b.uid, 'none');
    return ev.filter((e) => e.t === 'dmg').reduce((n, e) => n + e.d, 0);
  };
  assert.ok(run(2) > run(0), 'renforcée');
});

test('Éveil tactique : la compétence propre d’un Protecteur éveillé charge sa riposte', () => {
  const card = cat.cards.find((c) => roleOf(c) === 'protecteur' && CREATURE_KITS[c.id]);
  const p = D.duelUnit(card, { level: 9 });
  const foe = D.duelUnit(cat.cards.find((c) => c.rarity === 'C'), { side: 'enemy', scale: 6 });
  const st = D.createDuel([p, D.duelUnit(pick('degats'), { level: 5 }), D.duelUnit(pick('soin'), { level: 5 })], [foe], { seed: 2, fervor: 6 });
  D.startInitiative(st);
  const u = st.units[st.order.ally[0]], f = st.units[st.order.enemy[0]];
  st.turn = 'ally'; st.actor = u.uid; st.init = [u.uid, ...st.init.filter((x) => x !== u.uid)]; st.ip = 0; u.acts = 0; u.pa = 6;
  const a = D.actionsFor(st, u.uid).find((x) => x.own);
  assert.ok(a, 'compétence propre');
  const ts = D.actionTargets(st, u.uid, a.key);
  D.act(st, u.uid, a.key, a.target === 'none' ? null : ts[0]);
  assert.ok((u.riposte || 0) >= 1, 'riposte chargée');
  void f; void moveFor;
});
