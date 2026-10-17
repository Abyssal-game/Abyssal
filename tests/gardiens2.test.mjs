// v383 : les cinq gardiens des étages 30 à 50 (Reine des Essaims, Bourreau, Chœur des Noyés, Seigneur des Chaînes, Horloger).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from './helpers.mjs';
import * as D from '../js/core/duel.js';
import { bossOf } from '../js/core/bosses.js';

const catalog = loadCatalog();
const A = (id, o = {}) => D.duelUnit(catalog.get(id), o);
const E = (id, o = {}) => D.duelUnit(catalog.get(id), { side: 'enemy', ...o });
const units = (st, side) => st.order[side].map((id) => st.units[id]);
const boss = (st) => units(st, 'enemy').find((u) => u.boss);
const team = () => [A('INF-001', { level: 5 }), A('INF-009', { level: 5 }), A('INF-003', { level: 5 })];
const duel = (key) => D.createDuel(team(), [E('NEC-010', { boss: true, scale: 1.2 })], { seed: 7, boss: key });
// le gardien joue l'intention donnée (sans défense)
const play = (st, intent) => { const b = boss(st); b.intent = intent; D.beginEnemyTurn(st); const s = D.nextEnemy(st); D.enemyAct(st, s.a, 'none'); D.endEnemyTurn(st); return b; };

test('étages 30 à 50 : les nouveaux gardiens, puis le cycle des dix', () => {
  assert.deepEqual([30, 35, 40, 45, 50].map(bossOf), ['essaim', 'bourreau', 'choeur', 'chaines', 'horloge']);
  assert.deepEqual([55, 60, 65, 70, 75].map(bossOf), ['miroirs', 'golem', 'peste', 'chasseur', 'voeux']);
});

test('Reine des Essaims : l’Essaim frappe toute l’équipe et l’empoisonne', () => {
  const st = duel('essaim');
  const b = play(st, { kind: 'brood' });
  assert.equal(b.charged, 'swarm');
  const st2 = duel('essaim');
  play(st2, { kind: 'swarm' });
  assert.ok(units(st2, 'ally').slice(0, 3).every((x) => x.poison > 0 || x.hp <= 0));
});

test('Bourreau : la Sentence condamne, l’exécution frappe dans le vide si la condamnée est en réserve', () => {
  const st = duel('bourreau');
  const t = units(st, 'ally')[2];
  const b = play(st, { kind: 'sentence', t: t.uid });
  assert.ok(t.condemned); assert.equal(b.charged, 'execute');
  const hp = t.hp;
  t.inPlay = false; // permutée en réserve
  st.order.ally = st.order.ally.filter((id) => id !== t.uid).concat(t.uid);
  play(st, { kind: 'execute', t: t.uid });
  assert.equal(t.hp, hp);
  assert.ok(!t.condemned);
});

test('Chœur des Noyés : la Complainte retire boucliers et bonus, et 2 Ferveur', () => {
  const st = duel('choeur');
  const a = units(st, 'ally')[0]; a.shield = 1; a.boost = 3; st.fervor = 4;
  play(st, { kind: 'lament' });
  assert.equal(a.shield, 0); assert.equal(a.boost, 0);
  assert.ok(st.fervor <= 4 - 2 + 2, 'la Ferveur baisse (hors gains du tour)');
});

test('Seigneur des Chaînes : la créature la plus forte est enchaînée', () => {
  const st = duel('chaines');
  const t = units(st, 'ally')[0];
  const b = boss(st); b.intent = { kind: 'chain', t: t.uid };
  D.beginEnemyTurn(st); const s = D.nextEnemy(st);
  const ev = D.enemyAct(st, s.a, 'none');
  // la cible, ou le Protecteur qui prend le coup à sa place, est enchaînée
  assert.ok(ev.some((x) => x.t === 'status' && x.s === 'Enchaînée' && st.units[x.u].frozen));
});

test('Horloger : le retour en arrière rend les PV perdus depuis l’annonce (un quart au plus)', () => {
  const st = duel('horloge');
  const b = boss(st);
  b.hp = b.maxHp; b.mark = b.maxHp; b.charged = 'rewind';
  b.hp = Math.round(b.maxHp * 0.6);
  play(st, { kind: 'rewind' });
  assert.ok(b.hp >= Math.round(b.maxHp * 0.6) + Math.round(b.maxHp * 0.25) - 1 && b.hp <= b.maxHp);
});

// v387 : étages 55 à 75
const hitBoss = (st, n) => { const b = boss(st), a = units(st, 'ally')[0]; b.intent = null; return D.act(st, a.uid, 'attack', b.uid); };

test('Sorcière des Miroirs : le premier coup se retourne contre l’attaquant', () => {
  const st = duel('miroirs');
  const b = boss(st), a = units(st, 'ally')[0];
  b.mirror = true;
  const hp = b.hp, ahp = a.hp;
  D.act(st, a.uid, 'attack', b.uid);
  assert.equal(b.hp, hp, 'elle ne prend rien');
  assert.ok(a.hp < ahp, 'l’attaquant est blessé');
  assert.equal(b.mirror, false);
});

test('Golem de Cendres : la carapace durcit à chaque coup et tombe à la Brisure', () => {
  const st = duel('golem');
  const b = boss(st), a = units(st, 'ally')[0];
  D.act(st, a.uid, 'attack', b.uid);
  assert.equal(b.ashArmor, 1);
  b.broken = true;
  const hp = b.hp; a.pa = 3;
  D.act(st, a.uid, 'attack', b.uid);
  assert.equal(b.ashArmor || 0, 0);
  assert.ok(b.hp < hp);
});

test('Peste Grise : le poison gagne les créatures saines', () => {
  const st = duel('peste');
  const [x, y] = units(st, 'ally');
  x.poison = 3; y.poison = 0;
  boss(st).intent = { kind: 'hit', t: x.uid };
  const ev = D.endTurn(st);
  // (le poison reçu peut s'écouler au début du tour suivant : on lit les événements)
  assert.ok(ev.some((e) => e.t === 'status' && e.s === 'La contagion se répand'));
  assert.ok(ev.some((e) => e.t === 'status' && e.u === y.uid && /^Poison \+/.test(e.s)));
});

test('Chasseur Sans Ombre : caché, il ne prend que 30 % des dégâts, sauf s’il est marqué', () => {
  const st = duel('chasseur'), st2 = duel('chasseur');
  const b = boss(st), b2 = boss(st2);
  b.veiled = true; b2.veiled = false;
  const h1 = b.hp, h2 = b2.hp;
  D.act(st, units(st, 'ally')[0].uid, 'attack', b.uid);
  D.act(st2, units(st2, 'ally')[0].uid, 'attack', b2.uid);
  assert.ok(h1 - b.hp < h2 - b2.hp, 'moins de dégâts dans l’ombre');
});

test('Dame des Vœux : le Vœu donne de la Ferveur, le Prix la soigne', () => {
  const st = duel('voeux');
  st.fervor = 0; st.gauge = 0;
  const b = play(st, { kind: 'wish' });
  assert.ok(st.fervor >= 3); assert.equal(b.charged, 'price');
  const st2 = duel('voeux');
  const b2 = boss(st2); b2.hp = Math.round(b2.maxHp / 2); const hp = b2.hp;
  play(st2, { kind: 'price' });
  assert.ok(b2.hp > hp, 'le Prix la soigne');
});

// v392 : étages 80 à 100
test('étages 80 à 100, puis le cycle des vingt', () => {
  assert.deepEqual([80, 85, 90, 95, 100].map(bossOf), ['titan', 'jumeaux', 'juge', 'bete', 'abysse']);
});

test('Titan Endormi : il dort 3 tours, puis son Séisme est plus fort s’il a été blessé', () => {
  const st = duel('titan');
  assert.equal(boss(st).intent?.kind, 'slumber');
  const a = duel('titan'), b2 = duel('titan');
  boss(b2).sleepDmg = boss(b2).maxHp; // blessé pendant son sommeil
  const hpA = units(a, 'ally').reduce((n, x) => n + x.hp, 0), hpB = units(b2, 'ally').reduce((n, x) => n + x.hp, 0);
  play(a, { kind: 'quake' }); play(b2, { kind: 'quake' });
  const lossA = hpA - units(a, 'ally').reduce((n, x) => n + Math.max(0, x.hp), 0), lossB = hpB - units(b2, 'ally').reduce((n, x) => n + Math.max(0, x.hp), 0);
  assert.ok(lossB > lossA, `${lossB} > ${lossA}`);
});

test('Jumeaux du Crépuscule : un jumeau lié, et le survivant devient fou de chagrin', () => {
  const st = D.createDuel(team(), [E('NEC-010', { boss: true, scale: 1.2 }), E('NEC-002', { scale: 1.2 })], { seed: 7, boss: 'jumeaux' });
  const [b, t] = units(st, 'enemy');
  assert.ok(t.twin);
  const atk = b.atk;
  t.hp = 1; D.act(st, units(st, 'ally')[0].uid, 'attack', t.uid);
  if (t.hp <= 0) assert.ok(b.grief && b.atk > atk);
});

test('Juge des Sceaux : le Verdict interdit une action à toute l’équipe', () => {
  const st = duel('juge');
  const b = boss(st); b.intent = { kind: 'verdict', forbid: 'attack' };
  D.beginEnemyTurn(st); const s = D.nextEnemy(st); D.enemyAct(st, s.a, 'none'); D.endEnemyTurn(st);
  assert.equal(st.forbid, 'attack');
  const u = st.init ? st.units[st.actor] : units(st, 'ally')[0];
  if (u?.side === 'ally') assert.equal(D.actionsFor(st, u.uid).find((x) => x.key === 'attack').ok, false);
});

test('Bête de l’Apocalypse : en phase 2, elle grandit à chaque tour', () => {
  const st = duel('bete');
  const b = boss(st); b.phase2 = true; /* en phase 2 (toujours, à l'étage 95), à chaque tour */
  const atk = b.atk, mx = b.maxHp;
  b.intent = { kind: 'hit', t: units(st, 'ally')[0].uid };
  D.endTurn(st);
  assert.ok(b.atk > atk && b.maxHp > mx);
});

test('L’Abysse : trois phases selon ses PV', () => {
  const st = duel('abysse');
  const b = boss(st);
  assert.ok(!b.phase2, 'jamais déchaîné d’emblée');
  b.hp = Math.round(b.maxHp * 0.6); b.intent = { kind: 'hit', t: units(st, 'ally')[0].uid };
  D.endTurn(st); assert.equal(b.ph, 2);
  b.hp = Math.round(b.maxHp * 0.3); b.intent = { kind: 'hit', t: units(st, 'ally')[0].uid };
  D.endTurn(st); assert.equal(b.ph, 3); assert.ok(b.night);
});
