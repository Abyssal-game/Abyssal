// Règles de combat alignées sur leur texte d'aide : Hurlement en ordre d'initiative, Rune du Sang par les compétences,
// Rémanence sur toutes les Marques, digestion du Dévoreur par la voie normale de la mort.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from './helpers.mjs';
import * as D from '../js/core/duel.js';
import { roleOf } from '../js/core/army.js';

const cat = loadCatalog();
const A = (id, level = 1) => D.duelUnit(cat.get(id), { level });
const E = (id, o = {}) => D.duelUnit(cat.get(id), { side: 'enemy', scale: 1, ...o });
const neutral = (st) => { Object.values(st.units).forEach((u) => { u.faction = null; }); st.ap = 9; st.fervor = 6; return st; };
const foes = (st) => D.front(st, 'enemy');
const playEnemies = (st, ev = []) => { while (D.nextEnemy(st)) ev.push(...D.enemyAct(st, st.queue[0], 'none')); ev.push(...D.endEnemyTurn(st)); return ev; };

test('Hurlement (initiative) : lancé en fin de tour, il couvre tout le tour ennemi suivant, puis s’arrête', () => {
  // Cerbère (SAU-043) + un second protecteur : sans provocation, les deux Gardes sont visables
  const st = neutral(D.createDuel([A('SAU-043', 6), A('INF-015', 6), A('ABY-001', 6)], [E('NEC-010'), E('NEC-011'), E('NEC-012')], { seed: 3 }));
  D.startInitiative(st);
  const p = Object.values(st.units).find((u) => u.id === 'SAU-043'), other = Object.values(st.units).find((u) => u.id === 'INF-015');
  assert.deepEqual(D.targetsFor(st, 'enemy'), [p.uid, other.uid]);
  // le Cerbère joue en dernier : tous les ennemis ont déjà agi ce tour-ci
  st.init = [...st.init.filter((id) => id !== p.uid), p.uid]; st.ip = st.init.length - 1; st.actor = p.uid; st.turn = 'ally'; p.pa = 3; p.acts = 0;
  const r0 = st.round;
  D.act(st, p.uid, 'hurlement');
  assert.equal(st.round, r0 + 1, 'le tour suivant a commencé');
  assert.deepEqual(D.targetsFor(st, 'enemy'), [p.uid], 'tous sur lui, au tour suivant aussi');
  assert.ok(foes(st).every((e) => !e.intent?.t || st.units[e.intent.t].side === 'enemy' || e.intent.t === p.uid), 'les intentions visent le Cerbère');
  assert.ok(p.defend, 'en Défense');
  // tour suivant : les coups reçus pendant le Hurlement déclenchent Gardien des Enfers ; au tour d’après, la provocation s’arrête
  const ev = [];
  for (let g = 0; g < 20 && !st.over && st.round === r0 + 1; g++) { if (st.turn === 'ally') ev.push(...D.passTurn(st)); else playEnemies(st, ev); }
  assert.ok(ev.some((e) => e.t === 'attack' && e.u === p.uid), 'un ennemi l’a frappé');
  assert.ok(ev.some((e) => e.s === 'Molosse des Enfers'), 'Molosse des Enfers a joué pendant le Hurlement');
  assert.equal(st.round, r0 + 2);
  assert.deepEqual(D.targetsFor(st, 'enemy'), [p.uid, other.uid], 'deux tours plus tard, fini');
});

test('Hurlement (initiative) : lancé avant les ennemis, il couvre leurs actions du tour en cours seulement', () => {
  const st = neutral(D.createDuel([A('SAU-043', 6), A('INF-015', 6), A('ABY-001', 6)], [E('NEC-010'), E('NEC-011'), E('NEC-012')], { seed: 3 }));
  D.startInitiative(st);
  const p = Object.values(st.units).find((u) => u.id === 'SAU-043'), other = Object.values(st.units).find((u) => u.id === 'INF-015');
  st.init = [p.uid, ...st.init.filter((id) => id !== p.uid)]; st.ip = 0; st.actor = p.uid; st.turn = 'ally'; p.pa = 3; p.acts = 0;
  const r0 = st.round;
  D.act(st, p.uid, 'hurlement');
  assert.equal(st.round, r0);
  assert.deepEqual(D.targetsFor(st, 'enemy'), [p.uid]);
  const ev = [];
  for (let g = 0; g < 20 && !st.over && st.round === r0; g++) { if (st.turn === 'ally') ev.push(...D.passTurn(st)); else playEnemies(st, ev); }
  assert.ok(ev.some((e) => e.t === 'attack' && e.u === p.uid), 'un ennemi l’a frappé ce tour-ci');
  assert.deepEqual(D.targetsFor(st, 'enemy'), [p.uid, other.uid], 'au tour suivant, fini (pas de double effet)');
});

test('Hurlement (tour par tour) : il couvre le tour ennemi en cours et s’arrête au tour suivant', () => {
  const st = neutral(D.createDuel([A('SAU-043', 6), A('INF-015', 6)], [E('NEC-010'), E('NEC-011')], { seed: 3 }));
  const p = Object.values(st.units).find((u) => u.id === 'SAU-043'), other = Object.values(st.units).find((u) => u.id === 'INF-015');
  D.act(st, p.uid, 'hurlement');
  assert.deepEqual(D.targetsFor(st, 'enemy'), [p.uid]);
  D.beginEnemyTurn(st);
  assert.deepEqual(D.targetsFor(st, 'enemy'), [p.uid], 'pendant le tour ennemi');
  playEnemies(st);
  if (st.over) return;
  assert.deepEqual(D.targetsFor(st, 'enemy'), [p.uid, other.uid], 'au tour suivant, fini');
});

test('Rune du Sang : elle cède aussi sous une compétence qui exploite la faiblesse de faction', () => {
  const boss = cat.cards.find((c) => c.faction === 'sauvage' && roleOf(c) === 'degats');
  const mk = (faction) => {
    const zone = cat.cards.find((c) => roleOf(c) === 'zone' && c.faction === faction);
    const st = D.createDuel([D.duelUnit(zone, { level: 5 })], [D.duelUnit(boss, { side: 'enemy', scale: 2, boss: true })], { seed: 1, boss: 'devoreur' });
    st.runes = [{ k: 'faiblesse', broken: false }]; st.ap = 9; st.fervor = 6;
    return st;
  };
  let st = mk('infernal'); // l'Infernal exploite la faiblesse du Sauvage
  let u = D.front(st, 'ally')[0], b = foes(st)[0];
  assert.ok(D.isWeak(u, b));
  const ev = D.act(st, u.uid, 'raz', b.uid);
  assert.ok(ev.some((e) => e.t === 'dmg' && e.u === b.uid), 'le Raz-de-marée l’a blessé');
  assert.equal(st.runes[0].broken, true, 'la rune cède sous le Raz-de-marée');
  assert.ok(ev.some((e) => e.t === 'rune' && e.k === 'faiblesse'));
  st = mk('celeste'); u = D.front(st, 'ally')[0]; b = foes(st)[0]; // pas de faiblesse : la rune tient
  assert.ok(!D.isWeak(u, b));
  D.act(st, u.uid, 'raz', b.uid);
  assert.equal(st.runes[0].broken, false, 'sans faiblesse, la rune tient');
});

test('Rémanence : la Malédiction et l’effet « marque » des compétences propres durent aussi 1 tour de plus', () => {
  const mk = (id, talent = 'remanence') => {
    const st = neutral(D.createDuel([A(id, 6)], [E('NEC-010')], { seed: 1 }));
    const u = D.front(st, 'ally')[0]; u.talent = talent;
    return [st, u, foes(st)[0]];
  };
  let [st, u, t] = mk('ABY-008'); // Malédiction : la première frappe du tour marque (1 tour)
  D.act(st, u.uid, 'attack', t.uid);
  assert.equal(t.markBy, u.uid); assert.equal(t.mark, 2, 'Malédiction + Rémanence : 1 + 1');
  [st, u, t] = mk('ABY-008', null);
  D.act(st, u.uid, 'attack', t.uid);
  assert.equal(t.mark, 1, 'Malédiction seule : 1');
  [st, u, t] = mk('ABY-002'); // Désignation abyssale : effet « marque » (2 tours)
  D.act(st, u.uid, 'own', t.uid);
  assert.equal(t.markBy, u.uid); assert.equal(t.mark, 3, 'marque + Rémanence : 2 + 1');
  [st, u, t] = mk('ABY-002', null);
  D.act(st, u.uid, 'own', t.uid);
  assert.equal(t.mark, 2, 'marque seule : 2');
});

test('Dévoreur : la digestion passe par la voie normale de la mort (Renaissance, Ténacité, puis chute enregistrée)', () => {
  const mk = () => {
    const st = D.createDuel([A('CEL-031', 3), A('ABY-001'), A('INF-015')], [E('NEC-010', { boss: true, scale: 3 })], { seed: 3, boss: 'devoreur' });
    const b = foes(st)[0], v = Object.values(st.units).find((x) => x.id === 'CEL-031');
    v.hp = v.maxHp; D.front(st, 'ally').forEach((x) => { if (x !== v) x.hp = 1; }); // le Phénix, le plus vigoureux, sera avalé
    b.hp = Math.floor(b.maxHp / 2) - 1;
    D.beginEnemyTurn(st);
    assert.equal(st.swallowed, v.uid); assert.ok(v.swallowed);
    D.front(st, 'ally').forEach((x) => { x.hp = x.maxHp; }); b.atk = 0; // le reste de l’équipe tient : seule la digestion compte
    playEnemies(st);
    return { st, b, v };
  };
  // Renaissance (passif du Phénix) : il se relève dans le ventre du gardien, puis la digestion continue
  let { st, b, v } = mk();
  v.hp = 1;
  let ev = D.beginEnemyTurn(st);
  assert.ok(ev.some((e) => e.t === 'revive' && e.u === v.uid), 'Renaissance déclenchée par la digestion');
  assert.ok(v.hp > 0 && v.ckReborn && v.swallowed, 'relevé, toujours englouti');
  assert.equal(st.over, null);
  playEnemies(st);
  v.hp = 1;
  ev = D.beginEnemyTurn(st);
  assert.ok(ev.some((e) => e.t === 'die' && e.u === v.uid), 'la seconde digestion le tue comme une mort normale');
  assert.ok(v.hp <= 0 && v.down && !v.swallowed && st.swallowed === null);
  assert.ok(st.fallenLog.some((f) => f.u === v.uid && f.kind === 'gorge' && f.by === b.uid), 'chute enregistrée (Dévoré)');
  // Ténacité : la première digestion mortelle le laisse à 1 PV
  ({ st, b, v } = mk());
  v.ckReborn = true; v.talent = 'tenacite'; v.hp = 2; // la digestion (15 % des PV max, 1 au moins) le tuerait
  ev = D.beginEnemyTurn(st);
  assert.ok(ev.some((e) => e.s === 'Ténacité !'), 'Ténacité joue');
  assert.equal(v.hp, 1); assert.ok(v.swallowed);
});
