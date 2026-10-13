import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from './helpers.mjs';
import * as DG from '../js/core/dungeon.js';
import { POWERS, suggestPower, powerOf } from '../js/core/powers.js';
import { STARTER } from '../js/core/army.js';

const cat = loadCatalog();
const mk = (seed = 't', opts = {}) => DG.createDungeon({ cards: STARTER.slice(0, 3).map((id) => cat.get(id)), pool: cat.byFaction.infernal, bossCard: cat.byFaction.infernal.find((c) => c.rarity === 'M'), seed, catalog: cat, ...opts });

test('pouvoirs : chaque carte en a un, logique (un ange soigne, un mort-vivant ne soigne jamais)', () => {
  for (const c of cat.cards) assert.ok(POWERS[powerOf(c, cat)], c.id);
  const undead = cat.cards.filter((c) => ['Mort-vivant', 'Goule', 'Spectre', 'Vampire'].includes(c.category));
  assert.ok(undead.length > 10);
  for (const c of undead) assert.ok(!['grace', 'hymne'].includes(powerOf(c, cat)), `${c.name} ne doit pas soigner`);
  const angels = cat.cards.filter((c) => c.category === 'Ange');
  assert.ok(angels.some((c) => ['grace', 'hymne'].includes(powerOf(c, cat))), 'des anges soignent');
  assert.equal(suggestPower(cat.get('NEC-035')), 'drain', 'Nosferatu draine');
  assert.ok(Object.keys(cat.powers).length >= 395, 'data/powers.json complet');
});

test('salle : 3 figurines placées, ennemis présents, cartes en main, déplacement et attaque au D20', () => {
  const st = mk('s1');
  assert.equal(st.room, 1);
  const us = DG.alive(st, 'ally'), foes = DG.alive(st, 'enemy');
  assert.equal(us.length, 3); assert.ok(foes.length >= 2);
  assert.ok(!foes.some((f) => f.portal), 'pas de portail dans la première salle');
  for (const u of us) { assert.equal(u.acts, DG.ACTS); assert.ok(u.hand.length >= 2 && u.hand.length <= DG.HAND_MAX); assert.ok(u.hp > 10, 'socle de héros'); }
  const u = us[0];
  const cells = DG.reach(st, u);
  assert.ok(cells.length > 0 && cells.every((c) => c.d <= u.move));
  const c = cells[0];
  const ev = DG.move(st, u.uid, c.x, c.y);
  assert.ok(ev.some((e) => e.t === 'move')); assert.equal(u.acts, 1); assert.deepEqual([u.x, u.y], [c.x, c.y]);
  assert.equal(DG.move(st, u.uid, 0, 0).length, 0, 'un mur n’est pas atteignable');
  // on téléporte un ennemi à côté pour tester l'attaque
  const f = foes[0]; const spot = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: u.x + dx, y: u.y + dy })).find(({ x, y }) => st.grid[y][x] === '.' && !DG.alive(st, 'enemy').concat(us).some((z) => z.x === x && z.y === y));
  f.x = spot.x; f.y = spot.y;
  const hp = f.hp;
  const ev2 = DG.attack(st, u.uid, f.uid);
  const dice = ev2.find((e) => e.t === 'dice');
  assert.ok(dice && dice.d === 20 && dice.n >= 1 && dice.n <= 20);
  assert.equal(u.acts, 0);
  if (['success', 'crit'].includes(dice.tier)) assert.ok(f.hp < hp); else assert.equal(f.hp, hp);
  assert.equal(DG.attack(st, u.uid, f.uid).length, 0, 'plus d’action');
});

test('cartes : une carte jouée quitte la main, coûte ses actions, et a des cibles cohérentes', () => {
  const st = mk('s2');
  const u = DG.alive(st, 'ally').find((x) => x.hand.includes(x.power)) || DG.alive(st, 'ally')[0];
  u.hand = [u.power, 'garde'];
  const before = u.acts;
  const ev = DG.play(st, u.uid, 'garde');
  assert.ok(ev.some((e) => e.t === 'card' && e.k === 'garde'));
  assert.equal(u.acts, before - 1); assert.ok(!u.hand.includes('garde')); assert.ok(u.discard.includes('garde'));
  assert.ok(u.st.armor2);
  const list = DG.playable(st, u.uid);
  assert.ok(list.every((c) => c.def));
});

test('tour ennemi : les ennemis se rapprochent et frappent, un portail fait venir des renforts', () => {
  const st = mk('s3', { scale: 1 });
  const before = DG.alive(st, 'enemy').map((e) => [e.x, e.y]);
  const ev = DG.endTurn(st, cat);
  assert.ok(ev.some((e) => e.t === 'move' && st.units[e.u]?.side === 'enemy') || ev.some((e) => e.t === 'attack'), 'les ennemis agissent');
  assert.equal(st.turn, 'ally'); assert.equal(st.round, 2);
  // portail : on en fabrique un dans la salle et on avance jusqu'au tour de renfort
  const p = { uid: 'pX', name: 'Portail', side: 'enemy', x: 6, y: 2, hp: 10, maxHp: 10, atk: 0, def: 2, mag: 0, move: 0, range: 0, level: 1, power: null, acts: 0, st: {}, hand: [], deck: [], discard: [], portal: true, cd: 0, rarity: 'C' };
  st.units.pX = p; st.order.enemy.push('pX');
  const n0 = DG.alive(st, 'enemy').length;
  DG.alive(st, 'ally').forEach((u) => { u.hp = u.maxHp = 500; });
  let spawned = false;
  for (let i = 0; i < DG.PORTAL_EVERY + 1; i++) { const e = DG.endTurn(st, cat); if (e.some((x) => x.t === 'spawn')) spawned = true; }
  assert.ok(spawned, 'un renfort est sorti du portail');
  assert.ok(DG.alive(st, 'enemy').length > n0 || st.stats.kills > 0);
});

test('partie complète en pilote automatique : 4 salles, victoire ou défaite, état sauvegardable', () => {
  const st = mk('s4', { levels: Object.fromEntries(STARTER.map((id) => [id, 10])), scale: 0.7 });
  DG.autoDungeon(st, cat);
  assert.ok(['won', 'lost'].includes(st.phase));
  assert.ok(st.room >= 1 && st.room <= DG.ROOMS);
  const copy = JSON.parse(JSON.stringify(st));
  assert.equal(copy.phase, st.phase);
  // jamais tuée d'un seul coup à pleine vie
  const st2 = mk('s5');
  const u = DG.alive(st2, 'ally')[0]; const f = DG.alive(st2, 'enemy')[0]; f.atk = 999; f.x = u.x + 1; f.y = u.y; f.range = 1;
  DG.endTurn(st2, cat);
  assert.ok(u.hp > 0, 'plafond par coup');
});
