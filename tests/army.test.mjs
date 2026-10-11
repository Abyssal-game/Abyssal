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
