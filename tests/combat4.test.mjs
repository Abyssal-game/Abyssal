// Objectifs bonus, phases 2 des gardiens, proie désignée, talents d'expédition, épreuve du jour.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import * as D from '../js/core/duel.js';
import { Game } from '../js/core/game.js';
import { roleOf } from '../js/core/army.js';

const catalog = loadCatalog();
const byRole = (role, n = 0) => catalog.cards.filter((c) => c.rarity === 'C' && roleOf(c) === role)[n].id;
const A = (id, o = {}) => D.duelUnit(catalog.get(id), o);
const E = (id, o = {}) => D.duelUnit(catalog.get(id), { side: 'enemy', ...o });
const ally = (st) => st.order.ally.map((id) => st.units[id]);
const foe = (st) => st.order.enemy.map((id) => st.units[id]);
const team = () => [A(byRole('protecteur')), A(byRole('degats')), A(byRole('soin')), A(byRole('degats', 1)), A(byRole('soutien'))];
const clock = () => new Date(2026, 9, 14, 12);

test('objectifs : « Sans perte » échoue dès qu’une créature tombe, « Briseur » réussit à la Brisure', () => {
  const st = D.createDuel(team(), [E('NEC-010', { elite: true, scale: 3 })], { seed: 2, goal: 'nofall' });
  assert.equal(D.goalState(st).state, 'pending');
  st.fallenLog = [{ u: 'x' }];
  assert.equal(D.goalState(st).state, 'fail');
  const st2 = D.createDuel(team(), [E('NEC-010', { elite: true, scale: 3 })], { seed: 2, goal: 'brk' });
  const t = foe(st2)[0]; t.cracked = { seq: -1, until: 9 };
  D.act(st2, ally(st2)[0].uid, 'attack', t.uid);
  assert.equal(D.goalState(st2).state, 'done');
});

test('objectifs : « Éclair » échoue après 3 tours ; objectif inconnu ignoré', () => {
  const st = D.createDuel(team(), [E('NEC-010', { scale: 9 })], { seed: 2, goal: 'swift' });
  for (let i = 0; i < 3 && !st.over; i++) D.endTurn(st);
  if (!st.over) assert.equal(D.goalState(st).state, 'fail');
  assert.equal(D.createDuel(team(), [E('NEC-010')], { goal: 'nimporte' }).goal, null);
});

const bossDuel = (key, seed = 3) => {
  const st = D.createDuel(team(), [E('NEC-010', { boss: true, scale: 3 })], { seed, boss: key });
  const b = foe(st)[0]; b.hp = Math.floor(b.maxHp / 2) - 1;
  return { st, b };
};

test('Dévoreur, phase 2 : il engloutit une créature, la Brisure la libère', () => {
  const { st, b } = bossDuel('devoreur');
  D.beginEnemyTurn(st);
  const v = st.units[st.swallowed];
  assert.ok(v?.swallowed, 'une créature est engloutie');
  assert.ok(!D.front(st, 'ally').includes(v), 'elle a quitté le combat');
  const hp = v.hp;
  while (D.nextEnemy(st)) D.enemyAct(st, st.queue[0], 'dodge');
  D.endEnemyTurn(st);
  D.beginEnemyTurn(st); // digestion
  assert.ok(v.hp < hp);
  if (st.over) return;
  while (D.nextEnemy(st)) D.enemyAct(st, st.queue[0], 'dodge');
  D.endEnemyTurn(st);
  b.brk = 0; b.broken = false; b.cracked = { seq: -1, until: 99 }; // Fêlé : le coup de rupture le brise
  const p = D.front(st, 'ally').find((u) => u.role === 'protecteur') || D.front(st, 'ally')[0];
  if (p.role !== 'protecteur') { b.mark = 2; b.markBy = 'x'; }
  const ev = D.act(st, p.uid, 'attack', b.uid);
  assert.ok(ev.some((e) => e.t === 'release'));
  assert.equal(v.swallowed, false);
});

test('Matriarche, phase 2 : la carapace de glace absorbe, l’Infernal la fait fondre plus vite', () => {
  const { st, b } = bossDuel('matriarche');
  D.beginEnemyTurn(st);
  assert.ok(b.ice > 0);
  const ice = b.ice, hp = b.hp;
  while (D.nextEnemy(st)) D.enemyAct(st, st.queue[0], 'dodge');
  D.endEnemyTurn(st);
  const a = D.front(st, 'ally').find((u) => u.faction !== 'infernal' && D.actionsFor(st, u.uid)[0].ok);
  if (!a) return;
  D.act(st, a.uid, 'attack', b.uid);
  assert.ok(b.ice < ice);
  assert.equal(b.hp, hp, 'la glace a tout pris');
});

test('Roi sans Visage, phase 2 : il résiste à la faction de son dernier agresseur', () => {
  const { st, b } = bossDuel('roi');
  D.beginEnemyTurn(st);
  while (D.nextEnemy(st)) D.enemyAct(st, st.queue[0], 'dodge');
  D.endEnemyTurn(st);
  const a = D.front(st, 'ally').find((u) => D.actionsFor(st, u.uid)[0].ok);
  D.act(st, a.uid, 'attack', b.uid);
  assert.equal(b.mask, a.faction);
  assert.equal(D.factionMult(a, b), 0.5);
});

test('Architecte, phase 2 : l’Effondrement frappe à zéro ; la Brisure le repousse', () => {
  const { st, b } = bossDuel('architecte');
  D.beginEnemyTurn(st);
  assert.equal(b.doom, D.DOOM_TURNS - 1, 'le compte commence à décroître');
  b.brk = 1;
  while (D.nextEnemy(st)) D.enemyAct(st, st.queue[0], 'dodge');
  D.endEnemyTurn(st);
  const a = D.front(st, 'ally').find((u) => D.actionsFor(st, u.uid)[0].ok);
  D.act(st, a.uid, 'attack', b.uid);
  if (b.broken) assert.equal(b.doom, D.DOOM_TURNS + 1);
});

test('Éclipse, phase 2 : Totalité, les factions non faibles font −40 %', () => {
  const { st, b } = bossDuel('eclipse');
  D.beginEnemyTurn(st);
  assert.equal(b.totality, true);
  const neutral = { faction: ['sauvage', 'infernal', 'abyssal', 'artificiel', 'primordial', 'celeste', 'necrotique'].find((f) => !['necrotique', 'abyssal', 'celeste', 'infernal'].includes(f)) };
  assert.equal(D.factionMult(neutral, b), 0.6);
});

test('proie désignée : tous les ennemis la visent et frappent plus fort', () => {
  const sup = catalog.cards.find((c) => c.rarity === 'C' && roleOf(c) === 'soutien').id;
  const st = D.createDuel(team(), [E(sup, { scale: 2 }), E('NEC-010', { scale: 2 }), E('NEC-010', { scale: 2 })], { seed: 5 });
  const [s] = foe(st);
  s.intent = { kind: 'hunt', t: D.front(st, 'ally')[2].uid };
  const prey = st.units[s.intent.t];
  const before = D.dmgOf(st, foe(st)[1], prey);
  D.beginEnemyTurn(st);
  D.enemyAct(st, s.uid);
  assert.equal(prey.prey, 2);
  assert.ok(D.dmgOf(st, foe(st)[1], prey) > before);
});

test('v753 : plus de talent proposé après une élite', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('tal'), clock });
  const ids = catalog.cards.filter((c) => c.rarity === 'C').slice(0, 5).map((c) => c.id);
  ids.forEach((id) => g.addCard(id)); g.s.team = ids; g.s.teamSet = true;
  g.startRun();
  const run = g.s.descent.run;
  run.floor = 3; run.phase = 'doors';
  g.startBattle('elite');
  const st = run.battle; foe(st).forEach((e) => { e.hp = 0; }); st.over = 'won';
  const out = g.finishBattle();
  assert.equal(out.talents, undefined); assert.ok(!run.talentOffer); /* v753 : plus de talent */
  g.chooseReward(run.rewards[0]);
});

test('mode Cauchemar : verrouillé avant l’étage 20, ennemis renforcés, gardien éveillé dès le début', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('nm'), clock });
  const ids = catalog.cards.filter((c) => c.rarity === 'C').slice(0, 5).map((c) => c.id);
  ids.forEach((id) => g.addCard(id)); g.s.team = ids; g.s.teamSet = true;
  assert.throws(() => g.startRun({ nightmare: true }), /Cauchemar/);
  g.s.descent.best = 20;
  g.startRun({ nightmare: true });
  const run = g.s.descent.run;
  run.floor = 5; run.phase = 'doors';
  g.startBattle('boss');
  const st = run.battle, b = Object.values(st.units).find((u) => u.boss);
  assert.equal(b.awakened, true);
  D.beginEnemyTurn(st);
  assert.equal(b.phase2, true, 'phase 2 dès le premier tour ennemi');
});

test('objectifs : dévoilés à partir de l’étage 4 pour un nouveau joueur (v398)', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('gl'), clock });
  const ids = catalog.cards.filter((c) => c.rarity === 'C').slice(0, 5).map((c) => c.id);
  ids.forEach((id) => g.addCard(id)); g.s.team = ids; g.s.teamSet = true;
  g.startRun();
  const run = g.s.descent.run;
  assert.equal(g.goalFor(run, 'fight'), null);
  run.floor = 3;
  assert.equal(g.goalFor(run, 'fight'), null);
  run.floor = 4;
  assert.ok(g.goalFor(run, 'fight'));
});

test('premiers pas (v398) : pas de porte Élite avant l’étage 3 tant que le record est sous 3', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('nv'), clock });
  const ids = catalog.cards.filter((c) => c.rarity === 'C').slice(0, 5).map((c) => c.id);
  ids.forEach((id) => g.addCard(id)); g.s.team = ids; g.s.teamSet = true;
  g.startRun();
  const run = g.s.descent.run;
  run.floor = 2;
  assert.deepEqual(g.doors(), ['fight']);
  g.s.descent.best = 5;
  assert.ok(g.doors().includes('elite'));
});

test('v307 : la formation choisie en combat (permutation) est gardée aux étages suivants, et se change entre deux étages', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('formation'), clock: () => new Date(2026, 9, 15, 12) });
  g.s.tickets.standard = 0;
  const ids = catalog.cards.filter((c) => c.rarity === 'C').slice(0, 5).map((c) => c.id);
  ids.forEach((id) => g.addCard(id, 'normal', 'reward'));
  g.setTeam(ids);
  const run = g.startRun();
  assert.deepEqual(run.team.map((m) => m.id), ids);
  g.chooseDoor(g.doors().includes('fight') ? 'fight' : g.doors()[0]);
  const st = run.battle;
  // permutation : la 1re créature (au combat) part en réserve, la 4e entre
  const front0 = D.front(st, 'ally')[0], res0 = D.reserve(st, 'ally')[0];
  const o = st.order.ally, i = o.indexOf(front0.uid), j = o.indexOf(res0.uid); [o[i], o[j]] = [o[j], o[i]];
  for (const u of Object.values(st.units)) if (u.side === 'enemy') u.hp = 0;
  st.over = 'won';
  g.finishBattle();
  const team = g.s.descent.run.team.map((m) => m.id);
  assert.equal(team[0], res0.id, 'la créature entrée reste au combat');
  assert.ok(team.indexOf(front0.id) >= 3, 'la créature sortie reste en réserve');
  // entre deux étages : échange manuel
  assert.throws(() => g.swapRunTeam(0, 0), /deux créatures/);
  g.swapRunTeam(0, 4);
  assert.equal(g.s.descent.run.team[4].id, res0.id);
  // une créature tombée passe à la fin et ne s'échange plus
  g.s.descent.run.team[1].fallen = true;
  assert.throws(() => g.swapRunTeam(1, 2), /tombée/);
});
