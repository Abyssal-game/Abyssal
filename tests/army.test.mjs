import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { STARTER, roleOf, levelFromDups, MAX_LEVEL, BUDGET } from '../js/core/army.js';
import { chestForDepth } from '../js/core/descent.js';
import { duelUnit } from '../js/core/duel.js';
import { SAVE_KEY } from '../js/config.js';

const catalog = loadCatalog();
const day = new Date(2026, 9, 12, 12);
const newGame = (seed = 'a', storage = new MemoryStorage()) => new Game(catalog, storage, { rng: rngFrom(seed), clock: () => day });

test('équipe : 5 Communes offertes à qui n’a pas 3 créatures, sinon les meilleures cartes sous le budget', () => {
  const g = newGame();
  assert.deepEqual(g.team(), STARTER);
  assert.equal(new Set(STARTER.map((id) => roleOf(catalog.get(id)))).size, 5, 'cinq rôles différents au départ');
  const h = newGame('b');
  catalog.cards.slice(0, 40).forEach((c) => h.addCard(c.id));
  const t = h.team();
  assert.equal(t.length, 5);
  assert.ok(h.teamCost(t) <= BUDGET);
  assert.ok(t.every((id) => h.owns(id)));
});

test('niveaux : chaque doublon renforce la créature', () => {
  const g = newGame('d');
  const id = STARTER[0];
  assert.equal(g.addCard(id).levelUp, 0, 'nouvelle carte');
  assert.equal(g.cardLevel(id), 1);
  assert.equal(g.addCard(id).levelUp, 2);
  assert.equal(levelFromDups(100).level, MAX_LEVEL);
  assert.ok(duelUnit(catalog.get(id), { level: 10 }).maxHp > duelUnit(catalog.get(id), { level: 1 }).maxHp);
});

test('budget d’équipe et pouvoir ultime', () => {
  const g = newGame('u');
  ['ART-039', 'NEC-044', 'ABY-043', ...STARTER].forEach((id) => g.addCard(id));
  assert.throws(() => g.setTeam(['ART-039', 'NEC-044', 'ABY-043', 'NEC-001', 'INF-001']), /budget/);
  g.setTeam(['ART-039', 'NEC-001', 'INF-001', 'CEL-001', 'SAU-014']);
  assert.equal(g.ultimate().key, 'aegis');
  g.setTeam(['NEC-001', 'INF-001', 'CEL-001']);
  assert.equal(g.ultimate().key, 'sceau');
});

test('aventure : une expédition rapporte un coffre selon la profondeur ; le coffre donne des boosters', () => {
  assert.equal(chestForDepth(3), 'bois'); assert.equal(chestForDepth(7), 'fer'); assert.equal(chestForDepth(12), 'or'); assert.equal(chestForDepth(16), 'abyssal');
  const g = newGame('r');
  g.startRun();
  assert.equal(g.torchesLeft(), 2);
  for (let k = 0; k < 300 && g.s.descent.run; k++) {
    const r = g.s.descent.run;
    if (r.phase === 'doors') { const o = g.chooseDoor(g.doors()[0]); if (o.battle) g.autoResolve(); }
    else if (r.phase === 'reward') g.chooseReward(r.rewards[0]);
    else if (r.phase === 'altar') g.chooseBlessing(r.altar[0]);
    else if (r.cleared >= 3) g.endRun(false);
    else g.nextFloor();
  }
  const last = g.s.descent.last;
  assert.ok(last.floor >= 1);
  assert.ok(g.chestCount() >= 1, 'au moins un coffre');
  assert.ok(Object.keys(g.s.hunt).length > 0, 'les créatures vaincues entrent au Bestiaire de chasse');
  const type = Object.keys(g.s.chests).find((k) => g.s.chests[k] > 0);
  const tickets = { ...g.s.tickets };
  const packs = g.openChest(type);
  assert.ok(packs.length >= 1);
  packs.forEach((k) => assert.ok(g.s.tickets[k] > (tickets[k] || 0)));
  const res = g.openBooster(packs[0]);
  assert.equal(res.opening.paidWith, 'ticket');
  // après les 3 torches : on peut rejouer, sans coffre
  g.s.descent.used = 3;
  const run = g.startRun();
  assert.equal(run.free, true);
  g.endRun(false);
});

test('passage au nouveau système : héros et équipement deviennent des éclats, les coffres sont gardés', () => {
  const st = new MemoryStorage();
  const old = newGame('m', st);
  old.addCard('ABY-001'); old.addCard('PRI-001'); old.addCard('CEL-001');
  const raw = JSON.parse(JSON.stringify(old.s));
  delete raw.army; delete raw.team; delete raw.chests;
  raw.heroes = { brenna: { xp: 500, wound: 0 }, aldric: { xp: 0, wound: 0 } };
  raw.party = ['brenna', 'aldric']; raw.pacts = { brenna: 'ABY-001' }; raw.invXp = { phenix: 30 };
  raw.arsenal = { items: { g1: { b: 'x', r: 'E', f: 1 } }, eq: {}, chests: { bois: 1, or: 2 }, keys: {}, fer: 40, pending: null };
  raw.items = { baume: 2, torche: 1 };
  raw.descent = { ...raw.descent, run: { v: 2, day: '2026-10-12', loot: { shards: 30, ash: 5, tickets: {}, chests: { fer: 1 } } }, used: 1 };
  st.setItem(SAVE_KEY, JSON.stringify(raw));
  const g = newGame('m2', st);
  assert.equal(g.s.army, 1);
  for (const k of ['heroes', 'party', 'pacts', 'arsenal', 'invXp']) assert.equal(g.s[k], undefined, k);
  assert.deepEqual({ bois: g.s.chests.bois, or: g.s.chests.or, fer: g.s.chests.fer }, { bois: 1, or: 2, fer: 1 });
  assert.equal(g.s.items.baume, undefined);
  assert.equal(g.s.items.torche, 1);
  assert.equal(g.s.descent.run, null);
  assert.equal(g.s.descent.used, 0, 'torche rendue');
  assert.ok(g.s.armyNews.shards > 30 + 160);
  assert.ok(g.s.shards >= raw.shards + g.s.armyNews.shards);
  // une seule fois
  const again = newGame('m3', st);
  assert.equal(again.s.shards, g.s.shards);
});

test('duel de cartes — riposte, Garde, Assaut, réserve, ultime', async () => {
  const D = await import('../js/core/duel.js');
  const card = (id) => catalog.get(id);
  // Garde : doit être attaquée en premier
  const allies = STARTER.map((id) => D.duelUnit(card(id)));
  const foes = ['NEC-001', 'INF-001'].map((id) => D.duelUnit(card(id), { side: 'enemy' }));
  const st = D.createDuel(allies, foes, { ult: 'nova' });
  const guard = Object.values(st.units).find((u) => u.side === 'enemy' && u.kw === 'garde');
  assert.deepEqual(D.targetsFor(st, 'ally'), [guard.uid]);
  // riposte : l'attaquant (sans Assaut) prend des dégâts
  const atk = D.front(st, 'ally').find((u) => u.kw !== 'assaut' && u.atk > 0);
  const hp0 = atk.hp, ghp = guard.hp;
  D.attack(st, atk.uid, guard.uid);
  assert.ok(guard.hp < ghp && atk.hp < hp0, 'dégâts et riposte');
  assert.equal(D.canAct(st, atk), false, 'une attaque par tour');
  // Assaut : pas de riposte
  const as = D.front(st, 'ally').find((u) => u.kw === 'assaut');
  const ahp = as.hp; D.attack(st, as.uid, guard.uid);
  assert.equal(as.hp, ahp);
  // fin du tour : les ennemis jouent, puis c'est de nouveau à nous
  D.endTurn(st);
  assert.equal(st.turn, 'ally');
  // réserve : une carte tombée est remplacée
  assert.equal(D.reserve(st, 'ally').length + D.front(st, 'ally').length, D.alive(st, 'ally').length);
  D.front(st, 'ally')[0].hp = 0;
  assert.equal(D.front(st, 'ally').length, Math.min(3, D.alive(st, 'ally').length));
  // ultime quand la jauge est pleine
  st.gauge = D.GAUGE_MAX;
  assert.ok(D.ultReady(st));
  const ev = D.useUlt(st);
  assert.ok(ev.some((e) => e.t === 'ult') && st.gauge === 0);
  // un duel automatique se termine
  const st2 = D.createDuel(STARTER.map((id) => D.duelUnit(card(id))), ['ABY-001', 'PRI-001', 'CEL-001'].map((id) => D.duelUnit(card(id), { side: 'enemy' })));
  D.autoDuel(st2);
  assert.ok(['won', 'lost'].includes(st2.over));
  assert.ok(st2.round < 20);
});

test('variantes retirées : les exemplaires deviennent holographiques ou or', () => {
  const st = new MemoryStorage();
  const g = newGame('v', st);
  g.addCard('PRI-031');
  const raw = JSON.parse(JSON.stringify(g.s));
  raw.collection['PRI-031'].v = { normal: 1, chroma: 2, alt: 1, ancestral: 1 };
  st.setItem(SAVE_KEY, JSON.stringify(raw));
  const h = newGame('v2', st);
  assert.deepEqual(h.s.collection['PRI-031'].v, { normal: 1, holo: 3, gold: 1 });
});

test('gardiens, créature de la semaine et 7e jour d’offrande', async () => {
  const D = await import('../js/core/duel.js');
  assert.equal(D.bossPowerOf(5), 'carapace'); assert.equal(D.bossPowerOf(10), 'givre'); assert.equal(D.bossPowerOf(25), 'carapace');
  const card = (id) => catalog.get(id);
  const st = D.createDuel(STARTER.map((id) => D.duelUnit(card(id))), [D.duelUnit(card('ABY-030'), { side: 'enemy', boss: true })], { bossPower: 'fureur' });
  const boss = Object.values(st.units).find((u) => u.boss), atk0 = boss.atk;
  D.endTurn(st);
  assert.ok(boss.hp <= 0 || boss.atk > atk0, 'la fureur augmente l’attaque');
  const g = newGame('w');
  const w = g.weekly();
  assert.ok(catalog.get(w.id) && !w.done);
  g.s.daily = { last: null, streak: 0 };
  for (let i = 0; i < 6; i++) g.s.daily = { last: null, streak: i }; // série de 6 jours
  g.s.daily = { last: '2026-10-11', streak: 6 };
  const r = g.claimDaily();
  assert.equal(r.streak, 7); assert.equal(r.chest, 'fer');
});

test('équipe : on peut tout retirer ; la Descente est seulement bloquée sous 3 créatures', () => {
  const g = newGame('t');
  g.team();
  g.setTeam([]);
  assert.deepEqual(g.team(), [], 'pas de remplissage automatique après un choix du joueur');
  assert.throws(() => g.startRun(), /au moins 3/);
  g.setTeam(STARTER.slice(0, 3));
  assert.ok(g.startRun());
});

test('duel — intentions typées, combinaisons, esquive récompensée, points faibles des gardiens', async () => {
  const D = await import('../js/core/duel.js');
  const card = (id) => catalog.get(id);
  const U = (id, o = {}) => D.duelUnit(card(id), o);
  // Esquive réussie : jauge +1, la fenêtre ne rétrécit plus
  let st = D.createDuel([U('INF-001'), U('INF-002')], [U('INF-004', { side: 'enemy' })]);
  const [a1] = st.order.ally, [e1] = st.order.enemy;
  const w0 = D.dodgeWindow(st, e1, a1);
  D.beginEnemyTurn(st);
  st.units[e1].kind = 'hit';
  const g0 = st.gauge;
  D.strike(st, e1, a1, { dodged: true });
  assert.equal(st.gauge, g0 + 1);
  assert.equal(D.dodgeWindow(st, e1, a1), w0);
  // Zone : toute la ligne prend 60 %
  st = D.createDuel([U('INF-001'), U('INF-002'), U('INF-004')], [U('INF-008', { side: 'enemy' })]);
  const z = st.units[st.order.enemy[0]];
  D.beginEnemyTurn(st); z.kind = 'zone';
  const hp = st.order.ally.map((id) => st.units[id].hp);
  D.strike(st, z.uid, st.order.ally[0]);
  st.order.ally.forEach((id, i) => assert.equal(st.units[id].hp, hp[i] - Math.ceil(z.atk * 0.6)));
  // Charge puis coup chargé (double), et le Gel interrompt la charge
  st = D.createDuel([U('INF-009'), U('INF-011')], [U('INF-001', { side: 'enemy' })]);
  const c = st.units[st.order.enemy[0]], tank = st.units[st.order.ally[0]], ice = st.units[st.order.ally[1]];
  D.beginEnemyTurn(st); c.kind = 'charge';
  const before = tank.hp;
  D.strike(st, c.uid, tank.uid);
  assert.equal(tank.hp, before);
  assert.ok(c.charged);
  D.endEnemyTurn(st);
  assert.equal(c.kind, 'heavy');
  assert.equal(D.threats(st)[c.intent], c.atk * 2);
  D.attack(st, ice.uid, c.uid);
  assert.ok(!c.charged && c.frozen);
  // Venin traverse le bouclier ; Givre-venin sur une cible gelée
  st = D.createDuel([U('INF-006'), U('INF-011')], [U('INF-009', { side: 'enemy' })]);
  const v = st.units[st.order.ally[0]], g2 = st.units[st.order.ally[1]], foe = st.units[st.order.enemy[0]];
  foe.shield = 1;
  D.attack(st, g2.uid, foe.uid);       // le bouclier bloque le Gel
  assert.ok(!foe.frozen);
  st.units[foe.uid].shield = 1; foe.frozen = 1;
  const hp2 = foe.hp;
  D.attack(st, v.uid, foe.uid);        // Venin : perce le bouclier, poison doublé sur cible gelée
  assert.ok(foe.hp < hp2);
  assert.equal(foe.poison, 4);
  // Assaut : pas de riposte de la cible, et pas de riposte de l'attaquant jusqu'à son tour
  st = D.createDuel([U('INF-001')], [U('INF-002', { side: 'enemy' }), U('INF-004', { side: 'enemy' })]);
  const as = st.units[st.order.ally[0]], [f1, f2] = st.order.enemy.map((id) => st.units[id]);
  D.attack(st, as.uid, f1.uid);
  assert.ok(as.exposed);
  D.beginEnemyTurn(st); f2.kind = 'hit';
  const fhp = f2.hp;
  D.strike(st, f2.uid, as.uid);
  assert.equal(f2.hp, fhp);
  // Gardien : Gel résisté un tour sur deux, fureur stoppée quand il est gelé ; Communes +1 contre lui
  st = D.createDuel([U('INF-011'), U('INF-001')], [U('ABY-030', { side: 'enemy', boss: true })], { bossPower: 'fureur' });
  const boss = st.units[st.order.enemy[0]], gel = st.units[st.order.ally[0]], com = st.units[st.order.ally[1]];
  const bhp = boss.hp;
  D.attack(st, com.uid, boss.uid);
  assert.equal(bhp - boss.hp, com.atk + D.PACK_BONUS);
  D.attack(st, gel.uid, boss.uid);
  assert.ok(boss.frozen);
  const atk = boss.atk;
  D.endTurn(st, () => false);
  assert.equal(boss.atk, atk);           // gelé : pas de fureur
  D.attack(st, gel.uid, boss.uid);
  assert.ok(!boss.frozen);               // résiste au gel suivant
});
