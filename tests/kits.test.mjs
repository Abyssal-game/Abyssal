// Identité des créatures (kits.js) : données cohérentes, déblocages par niveau, et chaque effet affiché
// produit bien quelque chose en combat.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCatalog, ROOT } from './helpers.mjs';
import * as D from '../js/core/duel.js';
import { CREATURE_KITS, PASSIVES, MOVES, KIT_LEVELS, kitOf, moveOf, passiveOf, statShape } from '../js/core/kits.js';
import { roleOf } from '../js/core/army.js';

const catalog = loadCatalog();
const FOE = catalog.cards.find((c) => roleOf(c) === 'degats' && c.rarity === 'C' && !CREATURE_KITS[c.id]);
const ally = (id, level = 1) => D.duelUnit(catalog.get(id), { level });
const foe = (o = {}) => { const u = D.duelUnit(FOE, { side: 'enemy', scale: 1, ...o }); u.faction = null; return u; };
const filler = (n) => catalog.cards.filter((c) => roleOf(c) === 'degats' && c.rarity === 'C' && !CREATURE_KITS[c.id]).slice(1, 1 + n).map((c) => D.duelUnit(c, { level: 1 }));
// Un combat prêt à jouer : l'unité testée en tête, des ennemis neutres (sans faction)
function duel(units, enemies = [foe(), foe(), foe()]) {
  const st = D.createDuel(units, enemies, { seed: 7 });
  Object.values(st.units).forEach((u) => { u.faction = null; });
  st.ap = 9; st.fervor = 6;
  return st;
}
const uidOf = (st, id) => Object.values(st.units).find((u) => u.id === id).uid;
const enemies = (st) => D.front(st, 'enemy');

test('kits : chaque créature existe, chaque passif et compétence est défini et illustré', () => {
  for (const [id, k] of Object.entries(CREATURE_KITS)) {
    assert.ok(catalog.get(id), `${id} existe`);
    assert.ok(PASSIVES[k.passive], `${id} : passif ${k.passive}`);
    assert.ok(MOVES[k.move], `${id} : compétence ${k.move}`);
    assert.ok(k.strike?.name && k.strike?.desc && k.plus && k.moins && k.synergy, `${id} : fiche complète`);
    const m = MOVES[k.move];
    assert.ok(typeof m.run === 'function' && typeof m.ai === 'function', `${k.move} : effet et IA`);
    assert.ok(fs.existsSync(path.join(ROOT, `assets/salles/pw/${m.icon}.webp`)), `${k.move} : icône peinte ${m.icon}`);
  }
  // pas de définition en double : chaque passif et chaque compétence sert à une seule créature
  const ps = Object.values(CREATURE_KITS).map((k) => k.passive), ms = Object.values(CREATURE_KITS).map((k) => k.move);
  assert.equal(new Set(ps).size, ps.length); assert.equal(new Set(ms).size, ms.length);
  assert.deepEqual(Object.keys(PASSIVES).sort(), [...new Set(ps)].sort(), 'aucun passif orphelin');
  assert.deepEqual(Object.keys(MOVES).sort(), [...new Set(ms)].sort(), 'aucune compétence orpheline');
  // chaque passif est lu par le moteur (aucun passif affiché sans effet)
  const src = fs.readFileSync(path.join(ROOT, 'js/core/duel.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'js/core/kits.js'), 'utf8');
  for (const p of Object.keys(PASSIVES)) assert.ok(src.includes(`=== '${p}'`), `passif ${p} branché`);
});

test('kits : budget attaque × PV conservé, variantes sans effet, ennemis sans kit', () => {
  for (const id of Object.keys(CREATURE_KITS)) {
    const s = statShape(id);
    assert.ok(Math.abs(s.atk * s.hp - 1) <= 0.05, `${id} : budget ${s.atk * s.hp}`);
  }
  const c = catalog.get('INF-012');
  assert.deepEqual([ally('INF-012', 5).atk, ally('INF-012', 5).maxHp], [D.duelUnit({ ...c, variant: 'galaxy', holo: true }, { level: 5 }).atk, D.duelUnit({ ...c, variant: 'galaxy', holo: true }, { level: 5 }).maxHp]);
  const e = D.duelUnit(c, { side: 'enemy', scale: 1 });
  assert.equal(kitOf(e), null, 'un ennemi n’a pas de kit');
  assert.equal(e.ck, undefined);
});

test('kits : déblocages par niveau (frappe 1, passif 3, compétence 6, éveil 9)', () => {
  for (const id of Object.keys(CREATURE_KITS)) {
    const at = (lv) => { const st = duel([ally(id, lv)]); return { st, u: st.units[uidOf(st, id)] }; };
    const k = CREATURE_KITS[id];
    let { st, u } = at(1);
    assert.equal(D.actionsFor(st, u.uid)[0].name, k.strike.name, `${id} : frappe propre dès le niveau 1`);
    assert.equal(passiveOf(u), null); assert.equal(moveOf(u), null);
    assert.ok(!D.actionsFor(st, u.uid).some((a) => a.key === k.move));
    ({ st, u } = at(KIT_LEVELS.passive)); assert.equal(passiveOf(u), k.passive);
    ({ st, u } = at(KIT_LEVELS.move - 1)); assert.equal(moveOf(u), null);
    ({ st, u } = at(KIT_LEVELS.move));
    const acts = D.actionsFor(st, u.uid);
    assert.deepEqual(acts.map((a) => a.key).slice(-2), ['defend', 'swap'], 'défense et permutation restent en fin de liste');
    const mv = acts.find((a) => a.key === k.move);
    assert.ok(mv && mv.own, `${id} : compétence propre au niveau ${KIT_LEVELS.move}`);
  }
});

test('kits : chaque compétence propre agit vraiment', () => {
  for (const [id, k] of Object.entries(CREATURE_KITS)) {
    const units = [ally(id, 10), ...filler(2)];
    units.slice(1).forEach((x) => { x.hp = Math.ceil(x.maxHp / 3); });
    const st = duel(units, [foe({ elite: true }), foe(), foe()]);
    const u = st.units[uidOf(st, id)];
    u.hp = Math.ceil(u.maxHp / 2); u.absorbed = 10;
    D.front(st, 'enemy').forEach((e) => { e.intent = { kind: 'hit', t: D.front(st, 'ally')[1].uid }; });
    const before = JSON.stringify(st.units);
    const ts = D.actionTargets(st, u.uid, k.move);
    const a = D.actionsFor(st, u.uid).find((x) => x.key === k.move);
    assert.ok(a.ok, `${id} : ${k.move} jouable (${a.why})`);
    const ev = D.act(st, u.uid, k.move, a.target === 'none' ? null : ts[0]);
    assert.ok(ev.length > 1, `${id} : ${k.move} produit des événements`);
    assert.notEqual(JSON.stringify(st.units), before, `${id} : ${k.move} change le combat`);
  }
});

test('frappes : Brisure en plus, coups multiples, soin, bonus sur cible affaiblie', () => {
  // Diablotin : +1 Brisure par rapport à une frappe normale
  let st = duel([ally('INF-001')], [foe({ elite: true })]);
  D.act(st, uidOf(st, 'INF-001'), 'attack', enemies(st)[0].uid);
  assert.equal(enemies(st)[0].brkMax - enemies(st)[0].brk, 2);
  // Cerbère : trois morsures
  st = duel([ally('SAU-043')], [foe({ elite: true })]);
  const ev = D.act(st, uidOf(st, 'SAU-043'), 'attack', enemies(st)[0].uid);
  assert.equal(ev.filter((e) => e.t === 'dmg').length, 3);
  // Choriste : soigne l'allié le plus blessé
  st = duel([ally('CEL-001'), ...filler(1)]);
  const w = D.front(st, 'ally')[1]; w.hp = 2;
  D.act(st, uidOf(st, 'CEL-001'), 'attack', enemies(st)[0].uid);
  assert.equal(w.hp, 4);
  // Fenrir : +50 % sur une cible sous la moitié de ses PV
  st = duel([ally('SAU-049')], [foe({ elite: true })]);
  const t = enemies(st)[0], f = st.units[uidOf(st, 'SAU-049')];
  const full = D.preview(st, f.uid, 'attack', t.uid).dmg;
  t.hp = Math.floor(t.maxHp / 2) - 1;
  assert.ok(D.preview(st, f.uid, 'attack', t.uid).dmg > full);
});

test('passifs : survie, renaissance, faim, chœur, poison qui passe, colère, enfers', () => {
  // Inébranlable : un coup mortel le laisse à 1 PV, une seule fois
  let st = duel([ally('NEC-001', 3)]);
  let u = st.units[uidOf(st, 'NEC-001')];
  st.turn = 'enemy'; const e0 = enemies(st)[0];
  e0.intent = { kind: 'hit', t: u.uid }; e0.atk = 99; st.queue = [e0.uid];
  u.hp = 3; D.enemyAct(st, e0.uid);
  assert.equal(u.hp, 1); assert.ok(u.ckSaved);
  // Renaissance : le Phénix se relève à 40 %
  st = duel([ally('CEL-031', 3), ...filler(1)]);
  u = st.units[uidOf(st, 'CEL-031')]; st.turn = 'enemy';
  const e1 = enemies(st)[0]; e1.intent = { kind: 'hit', t: u.uid }; e1.atk = 99; u.hp = 2;
  D.enemyAct(st, e1.uid);
  assert.equal(u.hp, Math.round(u.maxHp * 0.4));
  // Faim sans fin : achever un ennemi donne +1 ATQ
  st = duel([ally('SAU-049', 3)]);
  u = st.units[uidOf(st, 'SAU-049')]; const atk0 = u.atk;
  enemies(st)[0].hp = 1; D.act(st, u.uid, 'attack', enemies(st)[0].uid);
  assert.equal(u.atk, atk0 + 1);
  // Chœur : la créature soignée gagne +1 ATQ
  st = duel([ally('CEL-001', 3), ...filler(1)]);
  const w = D.front(st, 'ally')[1]; w.hp = 2;
  D.act(st, uidOf(st, 'CEL-001'), 'attack', enemies(st)[0].uid);
  assert.equal(w.boost, 1);
  // Filaments : le poison d'un ennemi mort passe à son voisin
  st = duel([ally('ABY-003', 3)]);
  const [a, b] = enemies(st); a.poison = 6; a.hp = 1; b.poison = 0;
  D.act(st, uidOf(st, 'ABY-003'), 'attack', a.uid);
  assert.equal(a.hp, 0); assert.equal(b.poison, 3);
  // Colère : chaque coup pris à la place d'un allié donne +1 ATQ
  st = duel([ally('INF-012', 3), ...filler(1)]);
  u = st.units[uidOf(st, 'INF-012')]; const pal = D.front(st, 'ally')[1];
  D.act(st, u.uid, 'rempart', pal.uid);
  const atk1 = u.atk; st.turn = 'enemy';
  const e2 = enemies(st)[0]; e2.intent = { kind: 'hit', t: pal.uid };
  D.enemyAct(st, e2.uid);
  assert.equal(u.atk, atk1 + 1);
  // Gardien des Enfers : frapper son protégé coûte 3 PV à l'ennemi
  st = duel([ally('SAU-043', 3), ...filler(1)]);
  u = st.units[uidOf(st, 'SAU-043')]; const p2 = D.front(st, 'ally')[1];
  D.act(st, u.uid, 'rempart', p2.uid); st.turn = 'enemy';
  const e3 = enemies(st)[0], hp3 = e3.hp; e3.intent = { kind: 'hit', t: p2.uid };
  D.enemyAct(st, e3.uid);
  assert.equal(e3.hp, hp3 - 3);
});

test('passifs de dégâts : chasseur et présage ; Hurlement attire les coups', () => {
  let st = duel([ally('SAU-031', 3)], [foe({ elite: true })]);
  let u = st.units[uidOf(st, 'SAU-031')], t = enemies(st)[0];
  const n0 = D.dmgOf(st, u, t); t.poison = 3;
  assert.ok(D.dmgOf(st, u, t) > n0, 'Venin du chasseur');
  st = duel([ally('NEC-017', 3), ...filler(1)], [foe({ elite: true })]);
  const mate = D.front(st, 'ally')[1]; t = enemies(st)[0];
  const n1 = D.dmgOf(st, mate, t); t.slow = true;
  assert.ok(D.dmgOf(st, mate, t) > n1, 'Présage funeste : +25 % sur une cible ralentie');
  // Hurlement : les intentions annoncées passent sur le Cerbère
  st = duel([ally('SAU-043', 6), ...filler(2)]);
  u = st.units[uidOf(st, 'SAU-043')];
  enemies(st).forEach((e) => { e.intent = { kind: 'hit', t: D.front(st, 'ally')[2].uid }; });
  D.act(st, u.uid, 'hurlement');
  assert.ok(enemies(st).every((e) => e.intent.t === u.uid));
  assert.deepEqual(D.targetsFor(st, 'enemy'), [u.uid]);
});

test('kits : combats complets sans erreur, l’IA utilise les compétences propres', () => {
  const ids = ['INF-012', 'SAU-049', 'CEL-031', 'NEC-017', 'ABY-003'];
  let used = 0, won = 0;
  for (let s = 0; s < 12; s++) {
    const st = D.createDuel(ids.map((id) => ally(id, 10)), [foe({ scale: 2.2, elite: true }), foe({ scale: 2 }), foe({ scale: 2 })], { seed: 100 + s });
    for (let i = 0; i < 40 && !st.over; i++) {
      used += D.autoActs(st).filter((e) => e.t === 'act' && MOVES[e.key]).length;
      if (!st.over) D.endTurn(st, () => 'dodge');
    }
    assert.ok(st.over, 'le combat se termine');
    if (st.over === 'won') won++;
    JSON.parse(JSON.stringify(st)); // l'état reste sauvegardable
  }
  assert.ok(used > 0, 'les compétences propres servent');
  assert.ok(won > 0);
});

test('fiche : 4 étapes par créature, chacune décrite, et le déblocage annoncé au bon niveau', async () => {
  const { kitSteps, nextUnlock, unlockAt } = await import('../js/core/kits.js');
  for (const id of Object.keys(CREATURE_KITS)) {
    const s1 = kitSteps(id, 1);
    assert.deepEqual(s1.map((x) => x.lv), [1, 3, 6, 9]);
    assert.ok(s1.every((x) => x.name && x.desc), `${id} : chaque étape a un texte`);
    assert.deepEqual(s1.map((x) => x.open), [true, false, false, false]);
    assert.equal(nextUnlock(id, 1).k, 'passive');
    assert.equal(nextUnlock(id, 9), null);
    assert.equal(unlockAt(id, 6).k, 'move'); assert.equal(unlockAt(id, 9).k, 'awaken');
    assert.equal(unlockAt(id, 1), null); assert.equal(unlockAt(id, 5), null);
  }
  assert.deepEqual(kitSteps('XXX-000', 5), [], 'une créature sans identité propre n’affiche rien');
});

test('compétences propres : sans Ferveur, puis recharge en tours', () => {
  const st = duel([ally('INF-012', 6), ...filler(1)]);
  const u = st.units[uidOf(st, 'INF-012')];
  st.fervor = 0;
  const a = D.actionsFor(st, u.uid).find((x) => x.key === 'represailles');
  assert.ok(a.ok && a.fervor === 0, 'jouable sans Ferveur');
  D.act(st, u.uid, 'represailles', enemies(st)[0].uid);
  const b = D.actionsFor(st, u.uid).find((x) => x.key === 'represailles');
  assert.ok(!b.ok && b.wait === 2, b.why);
  st.round += 2;
  assert.ok(D.actionsFor(st, u.uid).find((x) => x.key === 'represailles').wait === 0, 'rechargée deux tours plus tard');
});

test('kits : 150 combats aux actions tirées au hasard, aucun état impossible', () => {
  const ids = Object.keys(CREATURE_KITS);
  let seed = 3;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let n = 0; n < 150; n++) {
    const team = Array.from({ length: 5 }, (_, i) => ally(ids[(n + i * 5) % ids.length], 1 + Math.floor(rnd() * 10)));
    const st = D.createDuel(team, [foe({ scale: 1.5, elite: rnd() < 0.5 }), foe({ scale: 1.3 }), foe({ scale: 1.3 }), foe()], { seed: n });
    for (let turn = 0; turn < 30 && !st.over; turn++) {
      for (let k = 0; k < 6 && st.turn === 'ally' && !st.over; k++) {
        const us = D.front(st, 'ally');
        const u = us[Math.floor(rnd() * us.length)];
        const acts = D.actionsFor(st, u.uid).filter((a) => a.ok);
        if (!acts.length) continue;
        const a = acts[Math.floor(rnd() * acts.length)];
        const ts = D.actionTargets(st, u.uid, a.key);
        D.act(st, u.uid, a.key, a.target === 'none' ? null : ts[Math.floor(rnd() * ts.length)]);
      }
      if (!st.over) D.endTurn(st, () => (rnd() < 0.4 ? 'dodge' : 'none'));
    }
    for (const u of Object.values(st.units)) {
      assert.ok(Number.isFinite(u.hp) && Number.isFinite(u.atk) && u.hp <= u.maxHp, `${u.id} : PV ${u.hp}/${u.maxHp}, ATQ ${u.atk}`);
      assert.ok(u.atk <= 60, `${u.id} : attaque qui s’emballe (${u.atk})`);
    }
    assert.ok(st.fervor >= 0 && st.fervor <= 6 && st.ap >= 0);
  }
});
