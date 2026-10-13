import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { drawBooster, boosterOdds, rollRarity, currentEvent, weekIndex } from '../js/core/boosters.js';
import { Game, levelFromXp } from '../js/core/game.js';
import { defaultSave, exportCode, importCode, migrate, loadSave, writeSave } from '../js/core/save.js';
import { TABLES, PITY, BOOSTERS, RARITY_ORDER, ECONOMY, SAVE_KEY } from '../js/config.js';

const catalog = loadCatalog();

test('identifiants uniques et cartes complètes', () => {
  const ids = new Set();
  for (const c of catalog.cards) {
    assert.ok(!ids.has(c.id), `doublon ${c.id}`);
    ids.add(c.id);
    for (const k of ['name', 'title', 'faction', 'rarity', 'category', 'visual', 'lore', 'art', 'stats', 'variants', 'artPrompt']) assert.ok(c[k], `${c.id} : champ ${k} manquant`);
    for (const k of ['atk', 'def', 'spd', 'mag', 'hp', 'cost']) assert.equal(typeof c.stats[k], 'number');
    for (const a of c.abilities) assert.ok(catalog.abilities[a.key], `${c.id} : capacité inconnue ${a.key}`);
  }
  assert.ok(catalog.cards.length >= 300, `seulement ${catalog.cards.length} cartes`);
  const names = new Set(catalog.cards.map((c) => c.name));
  assert.equal(names.size, catalog.cards.length, 'noms en double');
});

test('les ensembles référencent des cartes existantes', () => {
  for (const s of catalog.sets) {
    assert.ok(s.cards.length >= 5, `${s.key} trop petit`);
    s.cards.forEach((id) => assert.ok(catalog.get(id), `${s.key} : ${id}`));
    if (s.reward.special) assert.ok(catalog.get(s.reward.special).variants.includes('special'));
  }
});

test('la distribution des raretés respecte les tables (100 000 tirages)', () => {
  const rng = rngFrom('rar');
  const n = 100000;
  const count = {};
  for (let i = 0; i < n; i++) { const r = rollRarity(TABLES.base.weights, rng); count[r] = (count[r] || 0) + 1; }
  for (const [r, w] of Object.entries(TABLES.base.weights)) {
    const got = (count[r] || 0) / n * 100;
    assert.ok(Math.abs(got - w) < Math.max(0.35, w * 0.06), `${r} : ${got.toFixed(2)} % au lieu de ${w} %`);
  }
});

test('booster standard : 5 cartes, dernier emplacement au moins PC', () => {
  const rng = rngFrom('std');
  for (let i = 0; i < 2000; i++) {
    const r = drawBooster('standard', catalog, { rng });
    assert.equal(r.cards.length, 5);
    assert.ok(RARITY_ORDER.indexOf(r.cards[4].rarity) >= 1);
  }
});

test('booster premium : dernier emplacement au moins Rare', () => {
  const rng = rngFrom('prem');
  for (let i = 0; i < 2000; i++) assert.ok(RARITY_ORDER.indexOf(drawBooster('premium', catalog, { rng }).cards[4].rarity) >= 2);
});

test('booster de faction et événement restent dans leur pool', () => {
  const rng = rngFrom('fac');
  for (let i = 0; i < 300; i++) drawBooster('faction', catalog, { rng, faction: 'abyssal' }).cards.forEach((c) => assert.equal(catalog.get(c.id).faction, 'abyssal'));
  const ev = currentEvent(new Date(2026, 9, 9));
  for (let i = 0; i < 300; i++) drawBooster('event', catalog, { rng, event: ev }).cards.forEach((c) => assert.ok(ev.factions.includes(catalog.get(c.id).faction)));
});

test('garantie HR au 10e booster sans HR, garantie M au 40e', () => {
  const alwaysCommon = () => 0; // tire toujours la première entrée de chaque table
  let pity = { sinceHR: 0, sinceM: 0 };
  for (let i = 1; i <= PITY.hr; i++) {
    const r = drawBooster('standard', catalog, { rng: alwaysCommon, pity });
    if (i < PITY.hr) assert.equal(r.guaranteed, null);
    else { assert.equal(r.guaranteed, 'hr'); assert.equal(r.cards[4].rarity, 'HR'); }
    pity = r.pity;
  }
  assert.equal(pity.sinceHR, 0);
  const r = drawBooster('standard', catalog, { rng: alwaysCommon, pity: { sinceHR: 0, sinceM: PITY.m - 1 } });
  assert.equal(r.guaranteed, 'm');
  assert.equal(r.cards[4].rarity, 'M');
});

test('probabilités affichées cohérentes', () => {
  const o = boosterOdds('standard');
  o.slots.forEach((s) => assert.ok(Math.abs(Object.values(s.odds).reduce((a, b) => a + b, 0) - 100) < 1e-9));
  assert.ok(o.atLeastHR > 3 && o.atLeastHR < 15);
});

test('rotation hebdomadaire des événements', () => {
  assert.equal(weekIndex(new Date(2026, 9, 5)), weekIndex(new Date(2026, 9, 11))); // lundi -> dimanche
  assert.equal(weekIndex(new Date(2026, 9, 12)), weekIndex(new Date(2026, 9, 11)) + 1);
});

test('ouverture : monnaie débitée, cartes enregistrées, doublons en cendres', () => {
  const store = new MemoryStorage();
  const g = new Game(catalog, store, { rng: rngFrom('game') });
  g.s.tickets.standard = 0;
  g.s.freePack.stock = 0;
  g.s.shards = 500;
  const before = g.s.shards;
  const { opening, progress } = g.openBooster('standard');
  const bonus = progress.reduce((t, e) => t + (e.reward?.shards || 0), 0);
  assert.equal(g.s.shards, before - BOOSTERS.standard.price + opening.rewards.shards + bonus);
  opening.cards.forEach((c) => assert.ok(g.owns(c.id)));
  // la sauvegarde contient bien les cartes
  const reloaded = new Game(catalog, store);
  opening.cards.forEach((c) => assert.ok(reloaded.owns(c.id)));
  // doublon : cendres
  const id = opening.cards[0].id;
  const ash = g.s.ash;
  const r = g.addCard(id, 'normal');
  assert.equal(r.isNewCard, false);
  assert.equal(g.s.ash, ash + ECONOMY.duplicateAsh[catalog.get(id).rarity]);
});

test('ticket utilisé avant les éclats ; refus sans fonds', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('t') });
  const shards = g.s.shards;
  g.openBooster('standard');
  assert.equal(g.s.tickets.standard, 1);
  assert.ok(g.s.shards >= shards);
  g.s.tickets.standard = 0; g.s.shards = 10;
  assert.throws(() => g.openBooster('premium'));
  assert.equal(g.s.shards, 10);
});

test('succès et ensembles débloqués et sauvegardés', () => {
  const store = new MemoryStorage();
  const g = new Game(catalog, store, { rng: rngFrom('ach') });
  g.addCard('INF-001');
  const ev = g.checkProgress();
  g.persist();
  assert.ok(ev.some((e) => e.key === 'first_card'));
  const set = catalog.set.peches;
  set.cards.forEach((id) => g.addCard(id));
  const ev2 = g.checkProgress();
  g.persist();
  assert.ok(ev2.some((e) => e.kind === 'set' && e.key === 'peches'));
  const again = new Game(catalog, store);
  assert.ok(again.s.achievements.first_card);
  assert.ok(again.s.setsDone.peches);
  assert.ok(again.s.collection[set.reward.special].v.special);
});

test('faction complète : récompense et cadre', () => {
  const g = new Game(catalog, new MemoryStorage());
  catalog.byFaction.artificiel.forEach((c) => g.addCard(c.id));
  const ev = g.checkProgress();
  assert.ok(ev.some((e) => e.kind === 'faction' && e.key === 'artificiel'));
  assert.ok(g.s.frames.includes('artificiel'));
  assert.ok(g.s.achievements.faction_1);
});

test('offrande quotidienne : une par jour, série', () => {
  let day = new Date(2026, 9, 9, 10);
  const g = new Game(catalog, new MemoryStorage(), { clock: () => day });
  const a = g.claimDaily();
  assert.equal(a.streak, 1);
  assert.throws(() => g.claimDaily());
  day = new Date(2026, 9, 10, 9);
  assert.equal(g.claimDaily().streak, 2);
  day = new Date(2026, 9, 13, 9);
  assert.equal(g.claimDaily().streak, 1);
});

test('invocation par cendres et déchiffrement', () => {
  const g = new Game(catalog, new MemoryStorage());
  g.s.ash = 1000;
  g.craft('CEL-001');
  assert.ok(g.owns('CEL-001'));
  assert.throws(() => g.craft('CEL-001'));
  const secret = catalog.cards.find((c) => c.rarity === 'S');
  assert.throws(() => g.craft(secret.id));
  const unknown = catalog.byFaction.necrotique.find((c) => !g.nameKnown(c.id));
  g.decipher(unknown.id);
  assert.ok(g.nameKnown(unknown.id));
});

test('niveaux', () => {
  assert.equal(levelFromXp(0).level, 1);
  assert.equal(levelFromXp(150).level, 2);
  const g = new Game(catalog, new MemoryStorage());
  g.s.xp = 9000;
  const ev = g.checkProgress();
  assert.ok(ev.filter((e) => e.kind === 'level').length > 5);
  assert.ok(g.s.titles.includes('Occultiste'));
});

test('export / import et migration', () => {
  const s = defaultSave();
  s.collection['ABY-001'] = { n: 2, v: { normal: 1, holo: 1 }, first: 1, isNew: false };
  s.shards = 1234;
  const code = exportCode(s);
  const back = importCode(code);
  assert.equal(back.shards, 1234);
  assert.deepEqual(back.collection['ABY-001'].v, { normal: 1, holo: 1 });
  assert.throws(() => importCode(code.slice(0, -6) + 'AAAAAA'));
  assert.throws(() => importCode('bonjour'));
  const v1 = { version: 1, owned: { 'INF-001': 3 }, shards: 50, createdAt: 5 };
  const m = migrate(v1);
  assert.equal(m.version, 2);
  assert.equal(m.collection['INF-001'].n, 3);
  assert.ok(m.settings && m.tickets);
});

test('sauvegarde corrompue : repli sur la copie de secours', () => {
  const store = new MemoryStorage();
  const s = defaultSave(); s.shards = 777;
  writeSave(store, s);
  s.shards = 888;
  writeSave(store, s);
  store.setItem(SAVE_KEY, '{abîmé');
  const { save, source } = loadSave(store);
  assert.equal(save.shards, 777);
  assert.notEqual(source, SAVE_KEY);
});

test('booster gratuit : se recharge avec le temps, plafonné', () => {
  let now = new Date(2026, 9, 10, 8);
  const g = new Game(catalog, new MemoryStorage(), { clock: () => now, rng: rngFrom('free') });
  g.s.freePack = { stock: 0, since: now.getTime() };
  g.s.tickets.standard = 0; g.s.shards = 0;
  assert.equal(g.canBuy('standard'), false);
  now = new Date(2026, 9, 10, 20, 1);
  assert.equal(g.freePack().stock, 1);
  const { opening } = g.openBooster('standard');
  assert.equal(opening.paidWith, 'free');
  assert.equal(g.freePack().stock, 0);
  now = new Date(2026, 9, 13, 8);
  assert.equal(g.freePack().stock, 1, 'plafonné au maximum');
  assert.equal(g.freePack().nextAt, null);
});
