// Identité des créatures (kits.js) : données cohérentes, déblocages par niveau, et chaque effet affiché
// produit bien quelque chose en combat.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCatalog, ROOT } from './helpers.mjs';
import * as D from '../js/core/duel.js';
import { CREATURE_KITS, PASSIVES, MOVES, KIT_LEVELS, OPS, kitOf, moveOf, passiveOf, statShape, moveDefOf, opsValue } from '../js/core/kits.js';
import { roleOf } from '../js/core/army.js';

const catalog = loadCatalog();
const HAND = ['INF-001', 'NEC-001', 'CEL-001', 'ABY-003', 'CEL-018', 'NEC-017', 'SAU-031', 'INF-012', 'SAU-043', 'ABY-039', 'SAU-049', 'CEL-031'];
const FOE = catalog.cards.find((c) => roleOf(c) === 'degats' && c.rarity === 'C' && !HAND.includes(c.id));
const ally = (id, level = 1) => D.duelUnit(catalog.get(id), { level });
const foe = (o = {}) => { const u = D.duelUnit(FOE, { side: 'enemy', scale: 1, ...o }); u.faction = null; return u; };
// alliés de remplissage sans identité (pour isoler l'effet testé)
const filler = (n) => catalog.cards.filter((c) => roleOf(c) === 'degats' && c.rarity === 'C' && !HAND.includes(c.id)).slice(1, 1 + n).map((c) => { const u = D.duelUnit(c, { level: 1 }); delete u.ck; delete u.ckLv; return u; });
// Un combat prêt à jouer : l'unité testée en tête, des ennemis neutres (sans faction)
function duel(units, enemies = [foe(), foe(), foe()]) {
  const st = D.createDuel(units, enemies, { seed: 7 });
  Object.values(st.units).forEach((u) => { u.faction = null; });
  st.ap = 9; st.fervor = 6;
  return st;
}
const uidOf = (st, id) => Object.values(st.units).find((u) => u.id === id).uid;
const enemies = (st) => D.front(st, 'enemy');
const mkey = (k) => (typeof k.move === 'string' ? k.move : 'own');

test('kits : les 395 créatures ont une identité complète, chaque effet est défini et illustré', () => {
  assert.equal(Object.keys(CREATURE_KITS).length, catalog.cards.length, 'une identité par carte');
  for (const [id, k] of Object.entries(CREATURE_KITS)) {
    assert.ok(catalog.get(id), `${id} existe`);
    assert.ok(PASSIVES[k.passive], `${id} : passif ${k.passive}`);
    if (k.passive2) assert.ok(PASSIVES[k.passive2] && k.passive2 !== k.passive, `${id} : second passif ${k.passive2}`);
    const m = moveDefOf(k);
    assert.ok(m, `${id} : compétence`);
    assert.ok(k.strike?.name && k.strike?.desc && k.plus && k.moins && k.synergy && k.style, `${id} : fiche complète`);
    assert.ok(typeof m.run === 'function' && typeof m.ai === 'function' && m.desc && m.name, `${id} : effet, IA et texte`);
    assert.ok(fs.existsSync(path.join(ROOT, `assets/pw/${m.icon}.webp`)), `${id} : icône peinte ${m.icon}`);
    if (m.ops) m.ops.forEach((o) => assert.ok(OPS[o.op], `${id} : effet ${o.op}`));
  }
  // chaque passif et chaque compétence écrite à la main sert, et le moteur lit chaque passif (aucun passif affiché sans effet)
  const used = new Set(Object.values(CREATURE_KITS).flatMap((k) => [k.passive, k.passive2].filter(Boolean)));
  assert.deepEqual(Object.keys(PASSIVES).sort(), [...used].sort(), 'aucun passif orphelin');
  const hand = Object.values(CREATURE_KITS).map((k) => k.move).filter((m) => typeof m === 'string');
  assert.deepEqual(Object.keys(MOVES).sort(), [...new Set(hand)].sort(), 'aucune compétence orpheline');
  const src = fs.readFileSync(path.join(ROOT, 'js/core/duel.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'js/core/kits.js'), 'utf8');
  for (const p of Object.keys(PASSIVES)) assert.ok(new RegExp(`hasP\\([^)]*'${p}'\\)`).test(src), `passif ${p} branché`);
});

test('kits générés : compétences dans leur budget de puissance', () => {
  const BUDGET = { '1/2': 1.45, '1/3': 1.9, '2/3': 2.9 }, BONUS = { C: 0, PC: 0.1, R: 0.2, HR: 0.3, M: 0.45, S: 0.6 };
  for (const [id, k] of Object.entries(CREATURE_KITS)) {
    if (typeof k.move === 'string') continue;
    const b = BUDGET[`${k.move.ap}/${k.move.cd}`] + BONUS[catalog.get(id).rarity], v = opsValue(k.move.ops);
    assert.ok(v <= b * 1.3 && v >= b * 0.7, `${id} : valeur ${v.toFixed(2)} pour un budget ${b}`);
  }
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
    assert.ok(!D.actionsFor(st, u.uid).some((a) => a.key === mkey(k)));
    ({ st, u } = at(KIT_LEVELS.passive)); assert.equal(passiveOf(u), k.passive);
    ({ st, u } = at(KIT_LEVELS.move - 1)); assert.equal(moveOf(u), null);
    ({ st, u } = at(KIT_LEVELS.move));
    const acts = D.actionsFor(st, u.uid);
    assert.deepEqual(acts.map((a) => a.key).slice(-2), ['defend', 'swap'], 'défense et permutation restent en fin de liste');
    const mv = acts.find((a) => a.key === mkey(k));
    assert.ok(mv && mv.own, `${id} : compétence propre au niveau ${KIT_LEVELS.move}`);
  }
});

test('kits : chaque compétence propre agit vraiment', () => {
  for (const [id, k] of Object.entries(CREATURE_KITS)) {
    const units = [ally(id, 10), ...filler(2)];
    units.slice(1).forEach((x) => { x.hp = Math.ceil(x.maxHp / 3); });
    const st = duel(units, [foe({ elite: true }), foe(), foe()]);
    st.fervor = 2; // une compétence qui donne de la Ferveur doit pouvoir en donner
    const u = st.units[uidOf(st, id)];
    u.hp = Math.ceil(u.maxHp / 2); u.absorbed = 10;
    D.front(st, 'enemy').forEach((e) => { e.intent = { kind: 'hit', t: D.front(st, 'ally')[1].uid }; });
    const before = JSON.stringify(st.units);
    const ts = D.actionTargets(st, u.uid, mkey(k));
    const a = D.actionsFor(st, u.uid).find((x) => x.key === mkey(k));
    assert.ok(a.ok, `${id} : ${mkey(k)} jouable (${a.why})`);
    const ev = D.act(st, u.uid, mkey(k), a.target === 'none' ? null : ts[0]);
    assert.ok(ev.length > 1, `${id} : ${mkey(k)} produit des événements`);
    assert.notEqual(JSON.stringify(st.units), before, `${id} : ${mkey(k)} change le combat`);
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

test('fiche : 5 étapes par créature, chacune décrite, et le déblocage annoncé au bon niveau', async () => {
  const { kitSteps, nextUnlock, unlockAt } = await import('../js/core/kits.js');
  for (const id of Object.keys(CREATURE_KITS)) {
    const s1 = kitSteps(id, 1);
    assert.deepEqual(s1.map((x) => x.lv), [1, 3, 6, 9, 10]);
    assert.ok(s1.every((x) => x.name && x.desc), `${id} : chaque étape a un texte`);
    assert.deepEqual(s1.map((x) => x.open), [true, false, false, false, false]);
    assert.equal(nextUnlock(id, 1).k, 'passive');
    assert.equal(nextUnlock(id, 9).k, 'apogee'); assert.equal(nextUnlock(id, 10), null);
    assert.equal(unlockAt(id, 10).k, 'apogee');
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

test('les 20 passifs de capacités changent vraiment le combat (avec le passif contre sans)', () => {
  const withP = (key) => Object.keys(CREATURE_KITS).find((id) => !HAND.includes(id) && CREATURE_KITS[id].passive === key && roleOf(catalog.get(id)) !== 'zone');
  // mesure(st, u) dans un combat où la créature est en tête ; lv 3 (passif) contre lv 1 (sans passif, mêmes stats)
  const run = (key, setup, measure, { creation = false } = {}) => {
    const id = withP(key) || Object.keys(CREATURE_KITS).find((x) => CREATURE_KITS[x].passive === key);
    const at = (lv) => {
      const me = ally(id, 3); if (!creation) me.ckLv = 3; else me.ckLv = lv;
      const st = duel([me, ...filler(2)], [foe({ scale: 2 }), foe({ scale: 1.5 }), foe()]);
      const u = st.units[uidOf(st, id)];
      if (!creation) u.ckLv = lv;
      setup?.(st, u);
      return measure(st, u);
    };
    return [at(3), at(1), id];
  };
  const hitBy = (st, e, t) => { st.turn = 'enemy'; e.intent = { kind: 'hit', t: t.uid }; st.queue = [e.uid]; D.enemyAct(st, e.uid); };
  const E = (st, i = 0) => enemies(st)[i];
  const cases = {
    ruee: run('ruee', null, (st, u) => { const t = E(st), h = t.hp; D.act(st, u.uid, 'attack', t.uid); return h - t.hp; }),
    premiere: run('premiere', null, (st, u) => { const t = E(st), h = t.hp; D.act(st, u.uid, 'attack', t.uid); return h - t.hp; }),
    venin: run('venin', null, (st, u) => { const t = E(st); D.act(st, u.uid, 'attack', t.uid); return t.poison; }),
    malediction: run('malediction', null, (st, u) => { const t = E(st); t.mark = 0; D.act(st, u.uid, 'attack', t.uid); return t.mark; }),
    drain: run('drain', (st, u) => { u.hp = 1; }, (st, u) => { D.act(st, u.uid, 'attack', E(st).uid); return u.hp; }),
    frenesie: run('frenesie', (st, u) => { u.hp = 1; }, (st, u) => D.dmgOf(st, u, E(st))),
    devoreur: run('devoreur', null, (st, u) => { E(st).hp = 1; D.act(st, u.uid, 'attack', E(st).uid); return u.atk; }),
    blindage: run('blindage', null, (st, u) => { const h = u.hp; E(st, 2).atk = 5; hitBy(st, E(st, 2), u); return -(h - u.hp); }),
    effroi: run('effroi', null, (st, u) => { const h = u.hp; hitBy(st, E(st, 2), u); return -(h - u.hp); }),
    sentinelle: run('sentinelle', null, (st, u) => { const pal = D.front(st, 'ally')[1]; D.act(st, u.uid, 'rempart', pal.uid); const h = u.hp; hitBy(st, E(st), pal); return -(h - u.hp); }),
    benediction: run('benediction', (st) => { const pal = D.front(st, 'ally')[1]; pal.hp = Math.ceil(pal.maxHp * 0.4); E(st, 2).atk = Math.max(1, Math.round(pal.maxHp * 0.2)); }, (st) => { const pal = D.front(st, 'ally')[1]; hitBy(st, E(st, 2), pal); return pal.hp; }),
    reliquat: run('reliquat', (st) => { st.fervor = 0; }, (st, u) => { u.hp = 1; hitBy(st, E(st), u); return st.fervor; }),
    regeneration: run('regeneration', (st, u) => { u.hp = Math.ceil(u.maxHp / 2); enemies(st).forEach((e) => { e.atk = 0; }); }, (st, u) => { D.endTurn(st); return u.hp; }),
    commandement: run('commandement', (st) => { enemies(st).forEach((e) => { e.atk = 0; }); }, (st) => { D.endTurn(st); return D.front(st, 'ally')[1].boost; }),
    egide: run('egide', null, (st, u) => u.shield, { creation: true }),
    augure: run('augure', null, (st) => (st.openEv || []).filter((e) => e.t === 'fervor').length, { creation: true }),
    engloutir: run('engloutir', null, (st) => enemies(st).filter((e) => e.slow).length, { creation: true }),
    eruption: run('eruption', null, (st) => -enemies(st).reduce((x, e) => x + e.hp, 0), { creation: true }),
    cataclysme: run('cataclysme', null, (st) => -enemies(st).reduce((x, e) => x + e.hp, 0), { creation: true }),
    insaisissable: run('insaisissable', (st, u) => { u.atk = 99; u.hp = 2; u.maxHp = 2; enemies(st).forEach((e) => { e.atk = 0; e.intent = null; }); }, (st, u) => { D.endTurn(st); return -enemies(st).filter((e) => e.intent?.t === u.uid).length; }),
  };
  for (const [key, [a, b, id]] of Object.entries(cases)) assert.ok(a > b, `${key} (${id}) : avec ${a}, sans ${b}`);
  assert.equal(Object.keys(cases).length, 20);
});

test('noms : une compétence propre ne reprend jamais le nom d’une compétence de rôle ou d’un passif', async () => {
  const { KITS } = await import('../js/core/skills.js');
  const roleNames = Object.values(KITS).map((k) => k.skill.name.split(' ')[0]);
  const passNames = Object.values(PASSIVES).map((p) => p.name);
  for (const [id, k] of Object.entries(CREATURE_KITS)) {
    const n = moveDefOf(k).name;
    assert.ok(!roleNames.some((r) => n.startsWith(r)), `${id} : « ${n} » ressemble à une compétence de rôle`);
    assert.ok(!passNames.includes(n.split(' ')[0]), `${id} : « ${n} » porte le nom d’un passif`);
  }
});

test('icônes : chaque icône de passif annoncée existe', async () => {
  const { passiveIconUrl } = await import('../js/core/kits.js');
  const { kitSteps } = await import('../js/core/kits.js');
  for (const k of Object.keys(PASSIVES)) { const u = passiveIconUrl(k); assert.ok(u && fs.existsSync(path.join(ROOT, u)), `${k} : ${u}`); }
  for (const id of Object.keys(CREATURE_KITS)) kitSteps(id, 10).forEach((x) => assert.ok(x.img && fs.existsSync(path.join(ROOT, x.img)), `${id} ${x.k} : ${x.img}`));
});

test('équipe suggérée : dans le budget, 5 créatures possédées, avec des synergies', async () => {
  const { suggestTeam, teamSynergies, tagsOf } = await import('../js/core/synergy.js');
  const { COST, BUDGET } = await import('../js/core/army.js');
  const owned = catalog.cards.filter((c, i) => i % 5 === 0);
  for (const lv of [1, 6, 10]) {
    const t = suggestTeam(owned, () => lv).map((id) => catalog.get(id));
    assert.equal(t.length, 5);
    assert.ok(t.every((c) => owned.includes(c)));
    assert.ok(t.reduce((x, c) => x + COST[c.rarity], 0) <= BUDGET);
    if (lv >= 6) assert.ok(teamSynergies(t, () => lv).length >= 2, `niveau ${lv} : synergies`);
  }
  assert.ok(tagsOf(catalog.get('NEC-017'), 6).gives.has('slow'), 'la Banshee ralentit');
  assert.ok(tagsOf(catalog.get('ABY-039'), 3).wants.has('slow'), 'le Kraken profite du gel');
});

test('Apogée : au niveau 10, la compétence propre d’une créature du joueur se recharge un tour plus vite', async () => {
  const { rechargeOf, moveOf } = await import('../js/core/kits.js');
  const { duelUnit } = await import('../js/core/duel.js');
  let n = 0;
  for (const id of Object.keys(CREATURE_KITS).slice(0, 60)) {
    const c = catalog.get(id); if (!c) continue;
    const u9 = duelUnit(c, { level: 9 }), u10 = duelUnit(c, { level: 10 }), e10 = duelUnit(c, { level: 10, side: 'enemy' });
    const k = moveOf(u10); if (!k) continue;
    const a = rechargeOf(u9, k), b = rechargeOf(u10, k);
    assert.equal(b, Math.max(1, a - 1), id);
    if (moveOf(e10) === k) assert.equal(rechargeOf(e10, k), a, 'les ennemis n’en profitent pas');
    n++;
  }
  assert.ok(n > 30);
});
