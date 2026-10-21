// v470 : ébauche du Codex de l'Abîme (pass de saison) et de l'Échoppe : points, paliers, voie enluminée, achats cachés.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { CODEX, CODEX_TIERS, SHOP, CATALOG, CODEX_ONLY, codexTier, claimable } from '../js/core/codex.js';

const catalog = loadCatalog();
const clock = () => new Date(2026, 11, 5, 12); // pendant la Saison I
const mk = (c = clock) => new Game(catalog, new MemoryStorage(), { rng: rngFrom('cx'), clock: c });

test('codex : points plafonnés au dernier palier, paliers atteints', () => {
  const g = mk();
  g.codexXp(250, 'dev');
  assert.equal(codexTier(g.codex()), 2);
  g.codexXp(1e6, 'dev');
  assert.equal(g.codex().xp, CODEX.tiers * CODEX.xpPerTier);
  assert.equal(codexTier(g.codex()), CODEX.tiers);
});

test('codex : voie gratuite récupérable, voie enluminée fermée sans achat', () => {
  const g = mk();
  g.codexXp(CODEX.xpPerTier * 3, 'dev');
  const before = g.s.shards;
  const r = g.codexClaim('free', 1);
  assert.equal(g.s.shards, before + (r.shards || 0));
  assert.throws(() => g.codexClaim('free', 1), /Rien/);
  assert.throws(() => g.codexClaim('free', 5), /pas encore/);
  assert.throws(() => g.codexClaim('prem', 1), /voie enluminée/);
  g.codex().premium = true;
  g.codexClaim('prem', 3);
  assert.ok(g.s.frames.includes(CODEX_TIERS[2].prem.frame));
  assert.equal(claimable(g.codex()), 3); // paliers avec quelque chose à prendre : 1 (titre enluminé), 2 et 3 (gratuits)
});

test('codex : la voie enluminée ne donne jamais de puissance (ni éclats, cendres, coffres ou tickets)', () => {
  for (const t of CODEX_TIERS) if (t.prem) for (const k of ['shards', 'ash', 'chests', 'tickets']) assert.equal(t.prem[k], undefined, `palier ${t.tier}`);
  for (const it of [...SHOP, ...CATALOG]) if (it.give) for (const k of ['shards', 'ash', 'chests', 'tickets']) assert.equal(it.give[k], undefined, it.id);
  for (const it of CATALOG) assert.ok(['frame', 'back', 'bundle', 'finish'].includes(it.kind) && !it.give.obs && !it.give.title, it.id);
  for (const k of CODEX_ONLY) assert.ok(!CATALOG.some((it) => it.id === k), `${k} reste exclusif au Codex`);
});

test('échoppe : fermée hors Mode Créateur, achat simulé ensuite (une seule fois pour le Fondateur)', () => {
  const g = mk();
  assert.throws(() => g.shopBuy('fondateur'), /pas encore ouverte/);
  g.s.settings.dev = true; g.s.devCodex = true;
  g.shopBuy('fondateur');
  assert.ok(g.s.titles.includes('Fondateur') && g.s.frames.includes('cx-fondateur') && g.s.backs.includes('dos-fondateur'));
  assert.throws(() => g.shopBuy('fondateur'), /Déjà/);
  assert.equal(g.obs(), 500);
  g.shopBuy('obs-100'); g.shopBuy('obs-100');
  assert.equal(g.obs(), 700, 'les paquets d’obsidiennes se rachètent');
  g.codexUnlock();
  assert.ok(g.codex().premium); assert.equal(g.obs(), 700 - CODEX.cost);
  assert.throws(() => g.codexUnlock(), /Déjà/);
});

test('obsidiennes : achats du catalogue, manque signalé, lot au prix réduit', () => {
  const g = mk();
  g.s.settings.dev = true; g.s.devCodex = true; g.s.obs = 400;
  g.catalogBuy('cx-yeux');
  assert.ok(g.s.frames.includes('cx-yeux')); assert.equal(g.obs(), 50);
  assert.throws(() => g.catalogBuy('cx-yeux'), /déjà/);
  assert.throws(() => g.catalogBuy('dos-infernal'), /manque 250/);
  g.s.obs = 300; g.catalogBuy('dos-infernal');
  assert.equal(g.catalogCost('royaumes'), Math.round(1500 * 6 / 7));
  g.s.obs = 5000; g.catalogBuy('royaumes');
  assert.ok(g.catalogOwned('royaumes') && g.s.backs.length === 7);
  assert.equal(g.obs(), 5000 - Math.round(1500 * 6 / 7));
});

test('dos de cartes : seulement un dos possédé, retour au dos par défaut possible', () => {
  const g = mk();
  g.setBack('dos-abime');
  assert.equal(g.s.back ?? null, null, 'pas possédé : rien ne change');
  g.grant({ back: 'dos-abime' });
  g.setBack('dos-abime');
  assert.equal(g.s.back, 'dos-abime');
  g.setBack(null);
  assert.equal(g.s.back, null);
});

test('v482 : finitions de prestige, achetées une fois, posées seulement sur une carte possédée', () => {
  const g = mk();
  g.s.settings.dev = true; g.s.devCodex = true; g.s.obs = 2000;
  const id = Object.keys(g.s.collection)[0] || catalog.cards[0].id;
  if (!g.owns(id)) g.addCard?.(id);
  assert.throws(() => g.setDress(id, 'fin-spectrale'), /pas encore/);
  g.catalogBuy('fin-spectrale');
  assert.ok(g.s.finishes.includes('fin-spectrale') && g.catalogOwned('fin-spectrale'));
  g.setDress(id, 'fin-spectrale');
  assert.equal(g.s.dress[id], 'fin-spectrale');
  g.setDress(id, null);
  assert.equal(g.s.dress[id], undefined);
  const other = catalog.cards.find((c) => !g.owns(c.id)).id;
  assert.throws(() => g.setDress(other, 'fin-spectrale'), /possèdes pas/);
});

// v538 : la saison commence le 1er décembre ; les points d'avant ne comptent pas
test('codex : rien ne se gagne avant la saison, et les points d’avant sont remis à zéro à son ouverture', () => {
  let now = new Date(2026, 10, 20, 12);
  const st = new MemoryStorage(), g = new Game(catalog, st, { rng: rngFrom('cx2'), clock: () => now });
  g.codexXp(300, 'win');
  assert.equal(g.codex().xp, 0, 'avant la saison');
  g.s.settings.dev = true; g.s.devCodex = true;
  g.codexXp(300, 'dev');
  assert.equal(g.codex().xp, 300, 'essai du Mode Créateur');
  g.codex().premium = true;
  now = new Date(2026, 11, 1, 9);
  assert.equal(g.codex().xp, 0, 'remis à zéro le 1er décembre');
  assert.ok(g.codex().premium, 'la voie enluminée reste');
  g.s.settings.dev = false;
  g.codexXp(150, 'win');
  assert.equal(g.codex().xp, 150);
  assert.equal(g.codex().xp, 150, 'une seule remise à zéro');
});
