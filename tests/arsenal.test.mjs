import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { BASES, CHESTS, LEG_PITY, rollChest, itemStats, canUse } from '../js/core/gear.js';
import { SKILLS, makeEnemy, HERO_ORDER, HEROES } from '../js/core/heroes.js';
import { createBattle, act, beginTurn, current } from '../js/core/battle.js';
import { migrate } from '../js/core/save.js';

const catalog = loadCatalog();
const day = new Date(2026, 9, 10, 12);
const newGame = (seed = 'a') => new Game(catalog, new MemoryStorage(), { rng: rngFrom(seed), clock: () => day });

test('arsenal : modèles cohérents (sorts connus, emplacements, héros)', () => {
  for (const [k, b] of Object.entries(BASES)) {
    assert.ok(['arme', 'armure', 'relique', 'sort'].includes(b.slot), k);
    if (b.spell) assert.ok(SKILLS[b.spell]?.spell, k);
    (b.for || []).forEach((h) => assert.ok(HERO_ORDER.includes(h), k));
  }
  assert.ok(canUse('hache', 'brenna') && !canUse('hache', 'morgane') && canUse('talisman', 'morgane'));
  assert.deepEqual(itemStats({ b: 'hache', r: 'C', f: 0 }), { atk: 3 });
  assert.ok(itemStats({ b: 'hache', r: 'L', f: 10 }).atk > itemStats({ b: 'hache', r: 'E', f: 0 }).atk);
});

test('coffres : cadeau de départ, sans clé, choix, fer runique, garantie légendaire', () => {
  const g = newGame();
  assert.equal(g.chestCount('bois'), 2);
  const r1 = g.openChest('bois');
  assert.equal(r1.items.length, 1);
  assert.equal(Object.keys(g.arsenal().items).length, 1);
  const r2 = g.openChest('fer');
  assert.equal(r2.items.length, 2);
  assert.ok(r2.items.some((it) => it.r !== 'C'), 'coffre de fer : au moins un rare');
  const r3 = g.openChest('or');
  assert.ok(r3.choice && r3.items.length === 3);
  assert.equal(new Set(r3.items.map((it) => BASES[it.b].slot)).size >= 2, true, 'choix variés');
  assert.throws(() => g.openChest('bois'), /Choisis d’abord/);
  const fer = g.arsenal().fer || 0;
  g.chooseChestItem(1);
  assert.equal(g.arsenal().pending, null);
  assert.ok(g.arsenal().fer > fer, 'les objets non gardés deviennent du fer runique');
  g.addChests({ or: 1 });
  assert.ok(g.openChest('or').choice, 'plus besoin de clé');
  g.chooseChestItem(0);
  // garantie
  const rng = rngFrom('p');
  const ctx = { heroes: ['brenna', 'aldric', 'sylea', 'morgane'], party: ['brenna'], eqScore: () => 0 };
  const forced = rollChest(rng, 'fer', ctx, LEG_PITY - 1);
  assert.ok(forced.items.some((it) => it.r === 'L'));
  // probabilités : somme 100
  Object.values(CHESTS).forEach((c) => assert.equal(Object.values(c.odds).reduce((a, b) => a + b, 0), 100));
});

test('équipement : équiper, statistiques, sort ajouté, forge, démantèlement, verrou en expédition', () => {
  const g = newGame('e');
  const id = g.pushItem({ b: 'hache', r: 'R', f: 0, a: null });
  const before = g.heroUnit('brenna').atk;
  assert.throws(() => g.equip(id, 'morgane'), /ne peut pas/);
  g.equip(id, 'brenna');
  assert.equal(g.wearer(id), 'brenna');
  assert.equal(g.heroUnit('brenna').atk, before + itemStats(g.gearItem(id)).atk);
  const sp = g.pushItem({ b: 'seisme', r: 'E', f: 0, a: null });
  g.equip(sp, 'brenna');
  assert.ok(g.heroUnit('brenna').skills.includes('seisme'));
  g.arsenal().fer = 100;
  g.s.shards = 1000;
  g.forge(id);
  assert.equal(g.gearItem(id).f, 1);
  assert.equal(g.salvage(id).n, 0, 'un objet porté ne se démantèle pas');
  assert.ok(g.gearItem(id));
  const junk = g.pushItem({ b: 'talisman', r: 'C', f: 0, a: null });
  const r = g.salvage([junk]);
  assert.equal(r.n, 1);
  assert.equal(g.gearItem(junk), null);
  // auto-équipement
  const best = g.pushItem({ b: 'brisemont', r: 'L', f: 0, a: 'elan' });
  g.autoEquip('brenna');
  assert.equal(g.equipped('brenna').arme, best);
  const u = g.heroUnit('brenna');
  assert.equal(u.res, 50, 'Brise-Montagne : rage de départ');
  assert.equal(u.energy, 2, 'Élan : +1 énergie');
  g.startRun();
  assert.throws(() => g.equip(id, 'brenna'), /expédition/);
});

test('sorts et effets en combat', () => {
  const g = newGame('s');
  const ids = [g.pushItem({ b: 'meteore', r: 'L', f: 0 }), g.pushItem({ b: 'astres', r: 'L', f: 0 })];
  ids.forEach((id) => g.equip(id, 'morgane'));
  const m = g.heroUnit('morgane');
  assert.equal(m.energy, 3);
  const enemies = catalog.cards.filter((c) => c.rarity === 'C').slice(0, 3).map((c) => ({ ...JSON.parse(JSON.stringify(c)) }));
  const st = createBattle([m], enemies.map((c) => makeEnemy(c, { level: 1 })), 7);
  while (current(st).kind !== 'hero') { beginTurn(st); const u = current(st); if (u.kind === 'enemy') act(st, { actor: u.uid, action: 'enemy' }); }
  beginTurn(st);
  const u = current(st);
  const ev = act(st, { actor: u.uid, action: 'skill', skill: 'meteore' });
  assert.ok(ev.filter((e) => e.t === 'hit').length >= 2, 'Pluie de météores touche toute la ligne');
  assert.ok(Object.values(st.units).some((x) => x.side === 'enemy' && x.hp > 0 && x.st.burn));
});

test('descente : coffres au butin, perdus si l’équipe tombe ; migration ajoute l’Arsenal', () => {
  const g = newGame('l');
  g.startRun();
  g.addLoot({ shards: 10, chests: { or: 1 } });
  const s = g.endRun(false);
  assert.equal(s.loot.chests.or, 1);
  assert.equal(g.chestCount('or'), 2);
  g.startRun();
  g.addLoot({ chests: { fer: 2 } });
  g.s.descent.run.team.forEach((m) => { m.fallen = true; });
  g.endRun(true);
  assert.equal(g.chestCount('fer'), 1, 'coffres perdus');
  // anciennes clés converties en éclats
  const sh = g.s.shards; g.arsenal().keys = { or: 2 }; g.convertOldKeys();
  assert.equal(g.s.shards, sh + 300);
  const old = migrate({ version: 2, createdAt: 1, shards: 5 });
  assert.equal(old.arsenal.chests.bois, 2);
  assert.ok(old.arsenal.items && old.arsenal.eq);
});

test('boutique : coffre de fer dans l’Arsenal, premium non achetable', () => {
  const g = newGame('b');
  g.s.shards = 5000;
  g.buyItem('coffreFer');
  assert.equal(g.chestCount('fer'), 2);
  assert.equal(g.itemCount('coffreFer'), 0);
  assert.equal(g.canBuy('premium'), false);
  g.s.tickets.premium = 1;
  assert.equal(g.canBuy('premium'), true);
});

test('nouvelles classes : arrivée par la profondeur, mécaniques en combat', () => {
  const g = newGame('n');
  assert.ok(!g.s.heroes.kael);
  g.startRun();
  g.recordDepth(6);
  assert.ok(g.s.heroes.kael && g.s.heroes.thalia && !g.s.heroes.lucien);
  assert.deepEqual(g.takeHeroNews(), ['kael', 'thalia']);
  assert.deepEqual(g.takeHeroNews(), []);
  // chaque classe a ses compétences, ses armes et ses sorts
  for (const k of HERO_ORDER) {
    HEROES[k].skills.forEach((sk) => assert.ok(SKILLS[sk], sk));
    assert.ok(Object.values(BASES).some((b) => b.slot === 'arme' && b.for?.includes(k)), k);
    assert.equal(Object.values(BASES).filter((b) => b.slot === 'sort' && b.for?.includes(k)).length, 2, k);
    assert.ok(Object.values(BASES).some((b) => b.slot === 'armure' && b.for?.includes(k)), k);
  }
  // l'assassin caché n'est jamais visé
  const enemies = catalog.cards.filter((c) => c.rarity === 'C').slice(0, 2).map((c) => makeEnemy(c, { level: 1 }));
  const heroes = ['kael', 'thalia', 'ossian'].map((k) => H(k));
  const st = createBattle(heroes, enemies, 11);
  const kael = Object.values(st.units).find((u) => u.id === 'kael');
  kael.st.stealth = 2;
  for (let i = 0; i < 30 && !st.over; i++) {
    beginTurn(st); const u = current(st); if (!u) break;
    if (u.kind === 'enemy') { const ev = act(st, { actor: u.uid, action: 'enemy' }); ev.filter((e) => e.t === 'hit' && !e.aoe).forEach((e) => assert.notEqual(e.u, kael.uid)); }
    else act(st, { actor: u.uid, action: 'defend' });
    kael.st.stealth = 2;
  }
});
import { makeHero } from '../js/core/heroes.js';
function H(k) { return makeHero(k, { level: 3 }); }

test('pactes : débloqués à l’étage 2, effets par faction et rareté, connaissance plafonnée', async () => {
  const { pactOf, PACT_UNLOCK } = await import('../js/core/pacts.js');
  const g = newGame('p');
  const inf = catalog.cards.find((c) => c.faction === 'infernal' && c.rarity === 'C');
  const myth = catalog.cards.find((c) => c.faction === 'celeste' && c.rarity === 'M');
  g.addCard(inf.id); g.addCard(myth.id);
  assert.throws(() => g.setPact('brenna', inf.id), /étage/);
  g.s.descent.best = PACT_UNLOCK;
  g.setPact('brenna', inf.id);
  assert.equal(pactOf(inf).tier, 1);
  assert.equal(pactOf(myth).tier, 3);
  assert.equal(g.heroUnit('brenna').pactDmg, 0.1);
  g.setPact('aldric', inf.id);
  assert.equal(g.pactHolder(inf.id), 'aldric', 'une carte ne lie qu’un héros');
  assert.equal(g.s.pacts.brenna, undefined);
  g.setPact('brenna', myth.id);
  const u = g.heroUnit('brenna');
  assert.ok(u.lastStand && u.regenTurn, 'mythique céleste : régénération et survie');
  // survie au coup fatal
  const st = createBattle([u], [makeEnemy(inf, { level: 30, boss: true })], 3);
  const hero = Object.values(st.units).find((x) => x.kind === 'hero');
  const boss = Object.values(st.units).find((x) => x.kind === 'enemy');
  boss.intent = { k: 'heavy', t: hero.uid };
  act(st, { actor: boss.uid, action: 'enemy' });
  assert.ok(hero.hp > 0, 'sauvé une fois');
  // connaissance : carte possédée +10 %, plafond 20 %
  assert.equal(g.knowledge(inf.id), 0.1);
  g.s.hunt[inf.id] = 99;
  assert.equal(g.knowledge(inf.id), 0.2);
  g.s.descent.run = { v: 2 };
  assert.throws(() => g.setPact('brenna', null), /expédition/);
});
