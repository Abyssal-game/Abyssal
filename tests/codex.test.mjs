// v470 : ébauche du Codex de l'Abîme (pass de saison) et de l'Échoppe : points, paliers, voie enluminée, achats cachés.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { CODEX, CODEX_TIERS, SHOP, codexTier, claimable } from '../js/core/codex.js';

const catalog = loadCatalog();
const clock = () => new Date(2026, 9, 18, 12);
const mk = () => new Game(catalog, new MemoryStorage(), { rng: rngFrom('cx'), clock });

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
  for (const it of SHOP) if (it.give) for (const k of ['shards', 'ash', 'chests', 'tickets']) assert.equal(it.give[k], undefined, it.id);
});

test('échoppe : fermée hors Mode Créateur, achat simulé ensuite (une seule fois pour le Fondateur)', () => {
  const g = mk();
  assert.throws(() => g.shopBuy('fondateur'), /pas encore ouverte/);
  g.s.settings.dev = true; g.s.devCodex = true;
  g.shopBuy('fondateur');
  assert.ok(g.s.titles.includes('Fondateur') && g.s.frames.includes('cx-fondateur') && g.s.backs.includes('dos-fondateur'));
  assert.throws(() => g.shopBuy('fondateur'), /Déjà/);
  g.shopBuy('codex');
  assert.ok(g.codex().premium && g.shopOwned('codex'));
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
