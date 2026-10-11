import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { BASES, CHESTS, LEG_PITY, rollChest, itemStats, canUse } from '../js/core/gear.js';
import { SKILLS, makeEnemy } from '../js/core/heroes.js';
import { createBattle, act, beginTurn, current } from '../js/core/battle.js';
import { migrate } from '../js/core/save.js';

const catalog = loadCatalog();
const day = new Date(2026, 9, 10, 12);
const newGame = (seed = 'a') => new Game(catalog, new MemoryStorage(), { rng: rngFrom(seed), clock: () => day });

test('arsenal : modèles cohérents (sorts connus, emplacements, héros)', () => {
  for (const [k, b] of Object.entries(BASES)) {
    assert.ok(['arme', 'armure', 'relique', 'sort'].includes(b.slot), k);
    if (b.spell) assert.ok(SKILLS[b.spell]?.spell, k);
    (b.for || []).forEach((h) => assert.ok(['brenna', 'aldric', 'sylea', 'morgane'].includes(h), k));
  }
  assert.ok(canUse('hache', 'brenna') && !canUse('hache', 'morgane') && canUse('talisman', 'morgane'));
  assert.deepEqual(itemStats({ b: 'hache', r: 'C', f: 0 }), { atk: 3 });
  assert.ok(itemStats({ b: 'hache', r: 'L', f: 10 }).atk > itemStats({ b: 'hache', r: 'E', f: 0 }).atk);
});

test('coffres : cadeau de départ, clé requise, choix, fer runique, garantie légendaire', () => {
  const g = newGame();
  assert.equal(g.chestCount('bois'), 2);
  assert.equal(g.keyCount('or'), 1);
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
  assert.equal(g.keyCount('or'), 0);
  g.addChests({ or: 1 });
  assert.throws(() => g.openChest('or'), /clé d’or/);
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
  assert.equal(g.heroUnit('brenna').atk, before + 5);
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
  g.addLoot({ shards: 10, chests: { or: 1 }, keys: { or: 1 } });
  const s = g.endRun(false);
  assert.equal(s.loot.chests.or, 1);
  assert.equal(g.chestCount('or'), 2);
  assert.equal(g.keyCount('or'), 2);
  g.startRun();
  g.addLoot({ chests: { fer: 2 }, keys: { or: 1 } });
  g.s.descent.run.team.forEach((m) => { m.fallen = true; });
  g.endRun(true);
  assert.equal(g.chestCount('fer'), 1, 'coffres perdus');
  assert.equal(g.keyCount('or'), 3, 'clés gardées hors descente maudite');
  const old = migrate({ version: 2, createdAt: 1, shards: 5 });
  assert.equal(old.arsenal.chests.bois, 2);
  assert.ok(old.arsenal.items && old.arsenal.eq);
});

test('boutique : coffre de fer et clés vont dans l’Arsenal', () => {
  const g = newGame('b');
  g.s.shards = 5000;
  g.buyItem('coffreFer');
  assert.equal(g.chestCount('fer'), 2);
  assert.equal(g.itemCount('coffreFer'), 0);
  g.buyItem('cleOr');
  assert.throws(() => g.buyItem('cleOr'), /Limite/);
});
