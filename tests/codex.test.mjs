// v470 : ébauche du Codex de l'Abîme (pass de saison) et de l'Échoppe : points, paliers, voie enluminée, achats cachés.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { CODEX, CODEX_TIERS, SEASONS, SHOP, CATALOG, CODEX_ONLY, codexTier, claimable } from '../js/core/codex.js';

const catalog = loadCatalog();
const clock = () => new Date(2026, 10, 5, 12); // pendant la Saison I (Nuit des Âmes)
const mk = (c = clock) => new Game(catalog, new MemoryStorage(), { rng: rngFrom('cx'), clock: c });

test('codex : points plafonnés au dernier palier, paliers atteints', () => {
  const g = mk();
  g.codexXp(CODEX.xpPerTier * 2.5, 'dev');
  assert.equal(codexTier(g.codex()), 2);
  g.codexXp(1e6, 'dev');
  assert.equal(g.codex().xp, CODEX.tiers * CODEX.xpPerTier);
  assert.equal(codexTier(g.codex()), CODEX.tiers);
});

test('codex : voie gratuite récupérable, voie enluminée fermée sans achat', () => {
  const g = mk();
  g.codexXp(CODEX.xpPerTier * 3, 'dev');
  const before = g.s.shards;
  const r = g.codexClaim('free', 2); /* v547 : la voie gratuite donne un palier sur deux */
  assert.equal(g.s.shards, before + (r.shards || 0));
  assert.throws(() => g.codexClaim('free', 2), /Rien/);
  assert.throws(() => g.codexClaim('free', 1), /Rien/);
  assert.throws(() => g.codexClaim('free', 5), /pas encore/);
  assert.throws(() => g.codexClaim('prem', 1), /voie enluminée/);
  g.codex().premium = true;
  const r3 = CODEX_TIERS[2].prem, obs3 = g.s.obs || 0; /* v562 : le palier 3 de la saison I donne des obsidiennes (cadre retiré) */
  g.codexClaim('prem', 3);
  assert.ok(r3.frame ? g.s.frames.includes(r3.frame) : (g.s.obs || 0) === obs3 + r3.obs);
  assert.equal(claimable(g.codex()), 2); // paliers 1 et 2 de la voie enluminée (titre, obsidiennes)
});

test('codex : la voie enluminée ne donne jamais de puissance (ni éclats, cendres, coffres ou tickets)', () => {
  for (const t of CODEX_TIERS) if (t.prem) for (const k of ['shards', 'ash', 'chests', 'tickets']) assert.equal(t.prem[k], undefined, `palier ${t.tier}`);
  for (const it of [...SHOP, ...CATALOG]) if (it.give) for (const k of ['shards', 'ash', 'chests', 'tickets']) assert.equal(it.give[k], undefined, it.id);
  for (const it of CATALOG) assert.ok(['frame', 'back', 'bundle', 'finish', 'plate', 'emote', 'sachet'].includes(it.kind) && !it.give.obs && !it.give.title, it.id);
  for (const k of CODEX_ONLY) assert.ok(!CATALOG.some((it) => it.id === k), `${k} reste exclusif au Codex`);
});

test('codex v547 : une récompense enluminée à chaque palier, aucune n’est à vendre, le palier 30 est exceptionnel', () => {
  for (const se of SEASONS) for (const t of se.tiers) {
    assert.ok(t.prem, `palier ${t.tier} : voie enluminée vide`);
    for (const k of [t.prem.frame, t.prem.back, t.prem.finish].filter(Boolean)) assert.ok(CODEX_ONLY.includes(k) && !CATALOG.some((it) => it.id === k), `${k} ne doit pas être en vente`);
  }
  const last = CODEX_TIERS[CODEX.tiers - 1].prem;
  assert.ok(last.frame && last.back && last.title); /* v569 : couronne + dos vivant (plus de finition) */
  const obs = CODEX_TIERS.reduce((n, t) => n + (t.prem.obs || 0), 0);
  assert.ok(obs <= 450, 'les obsidiennes de la voie enluminée restent modestes');
});

test('échoppe : fermée hors Mode Créateur, achat simulé ensuite (une seule fois pour le Fondateur)', () => {
  const g = mk();
  assert.throws(() => g.shopBuy('fondateur'), /pas encore ouverte/);
  g.s.settings.dev = true; g.s.devCodex = true;
  g.shopBuy('fondateur');
  assert.ok(g.s.titles.includes('Fondateur') && g.s.backs.includes('dos-fondateur'));
  assert.throws(() => g.shopBuy('fondateur'), /Déjà/);
  assert.equal(g.obs(), 600);
  g.shopBuy('obs-100'); g.shopBuy('obs-100');
  assert.equal(g.obs(), 800, 'les paquets d’obsidiennes se rachètent');
  g.codexUnlock();
  assert.ok(g.codex().premium); assert.equal(g.obs(), 800, 'le Codex enluminé se paie en euros, pas en obsidiennes');
  assert.throws(() => g.codexUnlock(), /Déjà/);
});

test('obsidiennes : achats du catalogue, manque signalé, lot au prix réduit', () => {
  const g = mk();
  g.s.settings.dev = true; g.s.devCodex = true; g.s.obs = 200;
  g.catalogBuy('cx-yeux');
  assert.ok(g.s.frames.includes('cx-yeux')); assert.equal(g.obs(), 60);
  assert.throws(() => g.catalogBuy('cx-yeux'), /déjà/);
  assert.throws(() => g.catalogBuy('dos-infernal'), /manque 140/); /* v573 : dos vivant à 200 */
  g.s.obs = 300; g.catalogBuy('dos-infernal');
  assert.equal(g.catalogCost('royaumes'), Math.round(1000 * 6 / 7));
  g.s.obs = 5000; g.catalogBuy('royaumes');
  assert.ok(g.catalogOwned('royaumes') && g.s.backs.length === 7);
  assert.equal(g.obs(), 5000 - Math.round(1000 * 6 / 7));
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

test('v482 / v569 : finitions de prestige retirées de la vente, encore posées seulement sur une carte possédée', () => {
  const g = mk();
  g.s.settings.dev = true; g.s.devCodex = true; g.s.obs = 2000;
  const id = Object.keys(g.s.collection)[0] || catalog.cards[0].id;
  if (!g.owns(id)) g.addCard?.(id);
  assert.throws(() => g.setDress(id, 'fin-neant'), /pas encore/);
  assert.ok(!CATALOG.some((it) => it.kind === 'finish'), 'plus aucune finition à l’Échoppe (v569)');
  g.s.finishes = ['fin-neant']; /* une partie qui l'aurait achetée avant */
  g.setDress(id, 'fin-neant');
  assert.equal(g.s.dress[id], 'fin-neant');
  g.setDress(id, null);
  assert.equal(g.s.dress[id], undefined);
  const other = catalog.cards.find((c) => !g.owns(c.id)).id;
  assert.throws(() => g.setDress(other, 'fin-neant'), /possèdes pas/);
});

// v538 : la saison commence le 1er décembre ; les points d'avant ne comptent pas
test('codex : rien ne se gagne avant la saison, et les points d’avant sont remis à zéro à son ouverture', () => {
  let now = new Date(2026, 9, 20, 12);
  const st = new MemoryStorage(), g = new Game(catalog, st, { rng: rngFrom('cx2'), clock: () => now });
  g.codexXp(300, 'win');
  assert.equal(g.codex().xp, 0, 'avant la saison');
  g.s.settings.dev = true; g.s.devCodex = true;
  g.codexXp(300, 'dev');
  assert.equal(g.codex().xp, 300, 'essai du Mode Créateur');
  g.codex().premium = true;
  now = new Date(2026, 10, 1, 0, 5);
  assert.equal(g.codex().xp, 0, 'remis à zéro le 1er novembre à minuit');
  assert.ok(g.codex().premium, 'la voie enluminée reste');
  g.s.settings.dev = false;
  g.codexXp(150, 'win');
  assert.equal(g.codex().xp, 150);
  assert.equal(g.codex().xp, 150, 'une seule remise à zéro');
});

test('codex v550 : trois saisons d’un mois, les récompenses oubliées sont données au changement de saison', () => {
  const day = (m, d) => new Date(m <= 12 ? 2026 : 2027, (m - 1) % 12, d, 12);
  let now = day(11, 10);
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('cx3'), clock: () => now });
  assert.equal(g.codexSeason().key, 's1-ames');
  now = day(11, 30); assert.equal(g.codexSeason().key, 's1-ames');
  now = day(12, 1); assert.equal(g.codexSeason().key, 's2-noel');
  now = day(13, 31); assert.equal(g.codexSeason().key, 's3-hiver');
  now = day(11, 10);
  g.codex(); g.codexXp(CODEX.xpPerTier * 6, 'win'); g.codex().premium = true;
  const shards = g.s.shards, frames = (g.s.backs || []).length; /* v562 : palier 6 = dos de la Nuit des Âmes */
  now = day(12, 1);
  const c = g.codex();
  assert.equal(c.season, 's2-noel'); assert.equal(c.xp, 0); assert.ok(!c.premium, 'le Codex enluminé se rachète à chaque saison');
  assert.ok(g.s.shards > shards, 'éclats des paliers gratuits donnés'); assert.ok((g.s.backs || []).length > frames, 'dos du palier 6 donné');
  assert.equal(g.s.codexPast.season, 's1-ames');
});

test('v564 : plaques de pseudo et réactions en ligne (achat, choix, lot qui ne fait pas payer ce qu’on a)', () => {
  const g = mk(); g.s.settings.dev = true; g.s.devCodex = true; g.s.obs = 5000;
  assert.equal(g.emotesOwned().length, 4, 'quatre réactions offertes à tous');
  g.setPlate('pl-braise'); assert.equal(g.s.plate || null, null, 'pas de plaque sans l’avoir achetée');
  g.catalogBuy('pl-braise'); g.setPlate('pl-braise'); assert.equal(g.s.plate, 'pl-braise');
  g.catalogBuy('re-mammon'); assert.ok(g.emotesOwned().includes('re-mammon'));
  assert.equal(g.catalogCost('arbitres'), 525, 'le lot retire la réaction déjà achetée');
  g.catalogBuy('arbitres'); assert.equal(g.emotesOwned().length, 12);
  g.setPlate(null); assert.equal(g.s.plate, null);
});
