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

test('niveaux : achetés avec des cendres, plafonnés', () => {
  const g = newGame('d');
  const id = STARTER[0];
  g.addCard(id);
  assert.equal(g.cardLevel(id), 1);
  g.addCard(id);
  assert.equal(g.cardLevel(id), 1, 'les doublons ne montent plus le niveau : ils se brûlent');
  g.s.ash = 10000;
  for (let i = 1; i < MAX_LEVEL; i++) g.upgrade(id);
  assert.equal(g.cardLevel(id), MAX_LEVEL);
  assert.throws(() => g.upgrade(id));
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

test('changement de rareté : une variante devenue impossible passe en holographique, rien n’est perdu', () => {
  const g = newGame('fix');
  const c = catalog.get('INF-048'); // passée de Hyper rare à Rare
  g.addCard(c.id);
  const pc = catalog.byRarity.PC[0];
  g.addCard(pc.id);
  g.s.collection[pc.id].v.gold = 2; // l'or n'existe pas pour les Peu communes
  g.fixVariants();
  assert.equal(g.s.collection[pc.id].v.gold, undefined);
  assert.equal(g.s.collection[pc.id].v.holo, 2);
});

test('abandon de la Descente : compte comme une défaite, combat effacé', () => {
  const g = newGame('ab');
  g.team();
  g.startRun();
  const run = g.s.descent.run;
  run.shards = 41; run.cleared = 6; run.floor = 7;
  const p = g.abandonPreview();
  assert.equal(p.shards, 20);
  assert.equal(p.chest, 'bois', 'coffre d’un rang plus bas (fer → bois)');
  g.chooseDoor(g.doors()[0]);
  const s = g.abandonRun();
  assert.equal(s.abandoned, true);
  assert.equal(s.wiped, true);
  assert.equal(s.shards, 20);
  assert.deepEqual(s.chests, ['bois']);
  assert.equal(g.s.descent.run, null);
  // maudite : rien
  g.s.descent.used = 0;
  g.startRun({ cursed: true });
  g.s.descent.run.shards = 50; g.s.descent.run.cleared = 4;
  const s2 = g.abandonRun();
  assert.equal(s2.shards, 0);
  assert.deepEqual(s2.chests, []);
});

test('apparence affichée : choisie par le joueur, sinon la plus rare ; ancienne Édition des Sceaux convertie', async () => {
  const g = newGame('show');
  const c = catalog.byRarity.R[0];
  g.addCard(c.id); g.addCard(c.id, 'holo');
  assert.equal(g.shownVariant(c.id), 'holo', 'par défaut : la plus rare');
  g.setShownVariant(c.id, 'normal');
  assert.equal(g.shownVariant(c.id), 'normal');
  assert.throws(() => g.setShownVariant(c.id, 'gold'));
  g.burn(c.id, 'normal');
  assert.equal(g.shownVariant(c.id), 'holo', 'finition choisie brûlée : retour à la plus rare');
  assert.ok(catalog.cards.every((x) => !x.variants.includes('special')));
  const { migrate } = await import('../js/core/save.js');
  const raw = JSON.parse(JSON.stringify(g.s));
  raw.collection[c.id].v.special = 2;
  const s = migrate(raw);
  assert.equal(s.collection[c.id].v.special, undefined);
  assert.equal(s.collection[c.id].v.normal, 2);
});

test('Tirage des Ombres : participation une fois par jour, prix une fois par semaine, cartes non gagnées', () => {
  const g = newGame('sh');
  const s0 = g.s.shards, n0 = g.uniqueCount();
  assert.equal(g.shadowPay('2026-10-13'), 15);
  assert.equal(g.shadowPay('2026-10-13'), 0);
  assert.equal(g.s.shards, s0 + 15);
  assert.equal(g.shadowPrize('2026-10-05', 1), 'abyssal');
  assert.equal(g.shadowPrize('2026-10-05', 1), null, 'pas deux fois');
  assert.equal(g.shadowPrize('2026-10-12', 3), 'fer');
  assert.equal(g.s.chests.abyssal, 1);
  assert.equal(g.uniqueCount(), n0);
});
