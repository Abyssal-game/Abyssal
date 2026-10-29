// v470 : ébauche du Codex de l'Abîme (pass de saison) et de l'Échoppe : points, paliers, voie enluminée, achats cachés.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { CODEX, CODEX_TIERS, SEASONS, SHOP, CATALOG, CODEX_ONLY, codexTier, claimable } from '../js/core/codex.js';

const catalog = loadCatalog();
const [Y0, M0] = SEASONS[0].starts.split('-').map(Number);
const clock = () => new Date(Y0, M0 - 1, 5, 12); // pendant la Saison I (Nuit des Âmes)
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
  assert.ok(r3.frame ? g.s.frames.includes(r3.frame) : r3.plate ? g.s.plates.includes(r3.plate) : (g.s.obs || 0) === obs3 + r3.obs); /* v630 : plaque des Lanternes */
  assert.equal(claimable(g.codex()), 3); // paliers 1 et 2 de la voie enluminée (titre, obsidiennes), palier 3 de la voie gratuite (v811 : jeton du Choc)
});

test('codex : la voie enluminée ne donne jamais de puissance (ni éclats, cendres, coffres ou tickets)', () => {
  for (const t of CODEX_TIERS) if (t.prem) for (const k of ['shards', 'ash', 'chests', 'tickets']) assert.equal(t.prem[k], undefined, `palier ${t.tier}`);
  for (const it of [...SHOP, ...CATALOG]) if (it.give) for (const k of ['shards', 'ash', 'chests', 'tickets']) assert.equal(it.give[k], undefined, it.id);
  for (const it of CATALOG) assert.ok(['frame', 'back', 'bundle', 'finish', 'plate', 'emote', 'sachet', 'mat', 'pboard', 'cboard', 'cback', 'eboard', 'fond'].includes(it.kind) && !it.give.obs && !it.give.title, it.id);
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

test('échoppe : achat simulé réservé au Mode Créateur (une seule fois pour le Fondateur)', () => {
  const g = mk();
  assert.throws(() => g.shopBuy('fondateur'), /Mode Créateur/);
  g.s.settings.dev = true; g.s.devCodex = true;
  g.shopBuy('fondateur');
  assert.ok(g.s.titles.includes('Fondateur') && g.s.backs.includes('dos-vif-fondateur') && g.s.frames.includes('cx-vif-fondateur') && g.s.plates.includes('pl-fondateur') && g.s.fonds.includes('fp-fondateur')); /* v638 */
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
  g.s.settings.dev = true; g.s.devCodex = true; g.s.obs = 340; /* v584 : prix par rareté (cadre Épique 280) */
  g.catalogBuy('pl-braise'); /* v875 : plus de cadre en vente : une plaque Épique (280) */
  assert.ok(g.s.plates.includes('pl-braise')); assert.equal(g.obs(), 60);
  assert.throws(() => g.catalogBuy('pl-braise'), /déjà/);
  assert.throws(() => g.catalogBuy('dos-infernal'), /manque 220/); /* v584 : dos Épique à 280 */
  g.s.obs = 300; g.catalogBuy('dos-infernal');
  assert.equal(g.catalogCost('royaumes'), Math.round(CATALOG.find((i) => i.id === 'royaumes').cost * 6 / 7));
  g.s.obs = 5000; g.catalogBuy('royaumes');
  assert.ok(g.catalogOwned('royaumes') && g.s.backs.length === 7);
  assert.equal(g.obs(), 5000 - Math.round(CATALOG.find((i) => i.id === 'royaumes').cost * 6 / 7));
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
test('codex : rien ne se gagne avant la saison, et les points d’avant sont remis à zéro à son ouverture', async () => {
  const { SEASONS: SE } = await import('../js/core/codex.js');
  const [y, m] = SE[0].starts.split('-').map(Number);
  let now = new Date(y, m - 2, 20, 12);
  const st = new MemoryStorage(), g = new Game(catalog, st, { rng: rngFrom('cx2'), clock: () => now });
  g.codexXp(300, 'win');
  assert.equal(g.codex().xp, 0, 'avant la saison');
  g.s.settings.dev = true; g.s.devCodex = true;
  g.codexXp(300, 'dev');
  assert.equal(g.codex().xp, 300, 'essai du Mode Créateur');
  g.codex().premium = true;
  now = new Date(y, m - 1, 1, 0, 5);
  assert.equal(g.codex().xp, 0, 'remis à zéro le premier jour de la saison à minuit');
  assert.ok(g.codex().premium, 'la voie enluminée reste');
  g.s.settings.dev = false;
  g.codexXp(150, 'win');
  assert.equal(g.codex().xp, 150);
  assert.equal(g.codex().xp, 150, 'une seule remise à zéro');
});

test('codex v550 : saisons d’un mois, les récompenses oubliées sont données au changement de saison', async () => {
  const { SEASONS: SE } = await import('../js/core/codex.js');
  const [y0, m0] = SE[0].starts.split('-').map(Number);
  const day = (m, d) => new Date(y0, m0 - 1 + (m - 11), d, 12); /* m = 11 : le mois de la Saison I */
  let now = day(11, 10);
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('cx3'), clock: () => now });
  assert.equal(g.codexSeason().key, 's1-ames');
  now = new Date(y0, m0 - 1, Number(SE[0].ends.slice(8)), 12); assert.equal(g.codexSeason().key, 's1-ames');
  now = day(12, 1); assert.equal(g.codexSeason().key, 's3-hiver');
  now = new Date(y0, m0 + 1, 15, 12); assert.equal(g.codexSeason().key, 's9-marees');
  now = day(11, 10);
  g.codex(); g.codexXp(CODEX.xpPerTier * 6, 'win'); g.codex().premium = true;
  const shards = g.s.shards, frames = (g.s.backs || []).length; /* v562 : palier 6 = dos de la Nuit des Âmes */
  now = day(12, 1);
  const c = g.codex();
  assert.equal(c.season, 's3-hiver'); assert.equal(c.xp, 0); assert.ok(!c.premium, 'le Codex enluminé se rachète à chaque saison');
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

test('v630 : la Saison I a un objet à chaque palier, chacun avec son image et absent de l’Échoppe', async () => {
  const fs = await import('node:fs');
  const { SEASONS, CATALOG, EMOTES } = await import('../js/core/codex.js');
  const se = SEASONS.find((x) => x.key === 's1-ames');
  const items = se.items;
  assert.equal(items.filter(Boolean).length, 10);
  const file = (r) => r.frame ? `assets/frames/${r.frame}-4.webp` : r.back ? `assets/backs/${r.back}.webp` : r.sachet ? `assets/packs/${r.sachet}.webp` : r.plate ? `assets/plates/${r.plate}.webp` : `assets/emotes/${EMOTES[r.emote].pic}.webp`;
  for (const r of items) {
    const k = r.frame || r.back || r.sachet || r.plate || r.emote;
    assert.ok(fs.existsSync(new URL(`../${file(r)}`, import.meta.url)), k);
    assert.ok(!CATALOG.some((it) => it.id === k), `${k} ne doit pas être vendu`);
  }
});

test('v632 : tapis de jeu et fonds de profil : achat, choix, fiche vue par les autres', async () => {
  const { TAPIS, FONDS, CATALOG } = await import('../js/core/codex.js');
  const { friendCard, cleanCard } = await import('../js/core/friends.js');
  const g = mk(); g.s.obs = 5000; g.s.settings.dev = true; g.s.devCodex = true; /* l'Échoppe n'est ouverte qu'en Mode Créateur */
  for (const k of [...Object.keys(TAPIS), ...Object.keys(FONDS)].filter((k) => k !== 'fp-fondateur' && k !== 'fp-gardien') /* v638 : Pack du Fondateur seulement ; v890 : réservé au créateur */) assert.ok(CATALOG.some((it) => it.id === k), `${k} en vente`);
  g.setMat('tp-mammon'); assert.equal(g.s.mat ?? null, null, 'pas de tapis sans l’avoir acheté');
  g.catalogBuy('tp-mammon'); g.setMat('tp-mammon'); assert.equal(g.s.mat, 'tp-mammon');
  g.catalogBuy('fp-trone'); g.setFond('fp-trone'); assert.equal(g.s.fond, 'fp-trone');
  assert.ok(g.catalogOwned('tp-mammon') && g.catalogOwned('fp-trone'));
  const card = cleanCard(friendCard(g));
  assert.equal(card.fond, 'fp-trone');
  assert.equal(cleanCard({ ...friendCard(g), fond: '<img onerror=x>' }).fond, null);
});

test('v638 : les objets du Pack du Fondateur existent et ne sont pas vendus à l’Échoppe', async () => {
  const fs = await import('node:fs');
  const fd = SHOP.find((x) => x.id === 'fondateur').give;
  for (const k of [fd.frame, fd.back, fd.sachet, fd.plate, fd.fond]) assert.ok(!CATALOG.some((it) => it.id === k), `${k} hors de l’Échoppe`);
  for (const f of [`assets/frames/${fd.frame}-4.webp`, `assets/backs/${fd.back}.webp`, `assets/packs/${fd.sachet}.webp`, `assets/plates/${fd.plate}.webp`, `assets/fonds/${fd.fond}.webp`]) assert.ok(fs.existsSync(new URL(`../${f}`, import.meta.url)), f);
});

// v680 : ouverture le 1er jour de la Saison I, achats payés vérifiés par le serveur, défis de la semaine, paliers achetés
const before = () => new Date(Y0, M0 - 2, 20, 12);
test('codex v680 : fermé avant la Saison I, ouvert à tous le premier jour', () => {
  assert.equal(mk(before).codexOn(), false);
  assert.equal(mk().codexOn(), true);
});

test('v684 : l’Échoppe peut ouvrir avant le Codex (CODEX.shopFrom)', () => {
  const was = CODEX.shopFrom;
  try {
    CODEX.shopFrom = null;
    assert.equal(mk(before).shopOn(), false, 'fermée tant que shopFrom est vide');
    assert.equal(mk().shopOn(), true, 'ouverte avec le Codex');
    const d = before(); CODEX.shopFrom = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const g = mk(before);
    assert.equal(g.shopOn(), true); assert.equal(g.codexOn(), false, 'le Codex reste fermé');
    g.s.obs = 1000; const it = CATALOG.find((x) => x.kind === 'back'); /* v875 : plus de cadre en vente */
    g.catalogBuy(it.id); assert.ok(g.catalogOwned(it.id), 'achat possible à l’Échoppe avant le Codex');
    g.codexXp(20, 'floor'); assert.equal(g.codex().xp, 0, 'aucun point de Codex avant la saison');
  } finally { CODEX.shopFrom = was; }
});

test('achats payés : chaque transaction donnée une seule fois, déjà acquis = obsidiennes', () => {
  const g = mk();
  const tx = (id, p) => ({ id, product: SHOP.find((x) => x.id === p).store });
  let got = g.iapApply([tx('t1', 'obs-500'), tx('t2', 'codex')]);
  assert.equal(got.length, 2); assert.equal(g.obs(), 600); assert.ok(g.codex().premium);
  got = g.iapApply([tx('t1', 'obs-500'), tx('t2', 'codex')]);
  assert.equal(got.length, 0, 'déjà données'); assert.equal(g.obs(), 600);
  g.iapApply([tx('t3', 'codex')]);
  assert.equal(g.obs(), 1100, 'Codex déjà débloqué : 500 obsidiennes à la place');
  g.iapApply([tx('t4', 'fondateur')]); assert.ok(g.s.titles.includes('Fondateur')); assert.equal(g.obs(), 1700);
  g.iapApply([{ id: 't5', product: 'inconnu' }, null, { product: SHOP[0].store }]);
  assert.equal(g.obs(), 1700, 'produit inconnu ou sans identifiant : rien');
});

test('défis de la semaine : trois, les mêmes pour tous, un palier chacun', async () => {
  const { questsFor } = await import('../js/core/codex.js');
  const a = mk(), b = mk();
  assert.deepEqual(a.quests().list.map((q) => [q.key, q.n]), b.quests().list.map((q) => [q.key, q.n]));
  assert.equal(a.quests().list.length, 3);
  assert.ok(new Set([0, 1, 2, 3, 4].map((w) => JSON.stringify(questsFor(SEASONS[0].key, w)))).size > 1, 'les défis changent d’une semaine à l’autre');
  const q = a.quests().list[0], why = { descent: 'win', trial: 'trial', game: 'game', mission: 'mission' }[q.key];
  for (let i = 0; i < q.n; i++) a.codexXp(1, why);
  const done = a.quests().list.find((x) => x.key === q.key);
  assert.ok(done.done); assert.equal(a.codex().xp, q.n + CODEX.questXp);
  a.codexXp(1, why); assert.equal(a.codex().xp, q.n + 1 + CODEX.questXp, 'un défi ne paie qu’une fois');
  assert.equal(mk(before).quests().list.every((x) => !x.done && x.have === 0), true);
});

test('acheter un palier : obsidiennes, pas au-delà du dernier', () => {
  const g = mk();
  assert.throws(() => g.codexBuyTier(), /manque/);
  g.s.obs = CODEX.tierObs * 2;
  g.codexXp(10, 'mission');
  assert.equal(g.codexBuyTier(), 1); assert.equal(codexTier(g.codex()), 1); assert.equal(g.obs(), CODEX.tierObs);
  g.codexXp(1e6, 'dev');
  assert.throws(() => g.codexBuyTier(), /dernier palier/);
  assert.throws(() => mk(before).codexBuyTier(), /pas encore commencé/);
});

test('v895 : plateaux du Pacte : en vente, achat, choix, plateau d’origine par défaut', async () => {
  const { PBOARDS, CATALOG } = await import('../js/core/codex.js');
  const { BOARD_SEALS, boardOf } = await import('../js/core/codex.js');
  const g = mk(); g.s.obs = 5000; g.s.settings.dev = true; g.s.devCodex = true;
  for (const k of Object.keys(PBOARDS)) { assert.ok(CATALOG.some((it) => it.id === k && it.kind === 'pboard'), `${k} en vente`); assert.equal(BOARD_SEALS[k]?.length, 7, `${k} : 7 alvéoles`); }
  assert.ok(!CATALOG.some((it) => it.id === 'pp-cuir'), 'le plateau d’origine ne se vend pas');
  assert.equal(boardOf(null), 'pp-cuir'); assert.equal(boardOf('pp-inconnu'), 'pp-cuir');
  g.setPboard('pp-autel'); assert.equal(g.s.pboard ?? null, null, 'pas de plateau sans l’avoir acheté');
  g.catalogBuy('pp-autel'); g.setPboard('pp-autel'); assert.equal(g.s.pboard, 'pp-autel'); assert.ok(g.catalogOwned('pp-autel'));
  g.setPboard(null); assert.equal(g.s.pboard, null);
});

test('v898 : plateaux et dos des Cryptes : en vente, achat, choix', async () => {
  const { CBOARDS, CBACKS, PBOARDS, BOARD_SEALS, CATALOG } = await import('../js/core/codex.js');
  const g = mk(); g.s.obs = 9000; g.s.settings.dev = true; g.s.devCodex = true;
  for (const k of Object.keys(PBOARDS)) assert.equal(BOARD_SEALS[k]?.length, 7, `${k} : 7 alvéoles`);
  for (const [L, kind] of [[CBOARDS, 'cboard'], [CBACKS, 'cback']]) for (const k of Object.keys(L)) assert.ok(CATALOG.some((it) => it.id === k && it.kind === kind), `${k} en vente`);
  g.setCboard('cp-forge'); g.setCback('cd-forge'); assert.equal(g.s.cboard ?? null, null); assert.equal(g.s.cback ?? null, null);
  g.catalogBuy('cp-forge'); g.catalogBuy('cd-forge'); g.setCboard('cp-forge'); g.setCback('cd-forge');
  assert.equal(g.s.cboard, 'cp-forge'); assert.equal(g.s.cback, 'cd-forge'); assert.ok(g.catalogOwned('cp-forge') && g.catalogOwned('cd-forge'));
});

test('v907 : salles des Enchères : en vente, achat, choix', async () => {
  const { EBOARDS, CATALOG } = await import('../js/core/codex.js');
  const fs = await import('node:fs');
  const g = mk(); g.s.obs = 9000; g.s.settings.dev = true; g.s.devCodex = true;
  for (const k of Object.keys(EBOARDS)) { assert.ok(CATALOG.some((it) => it.id === k && it.kind === 'eboard'), `${k} en vente`); assert.ok(fs.existsSync(`assets/encheres/${k}.webp`) && fs.existsSync(`assets/encheres/${k}-mini.webp`), `${k} : images`); }
  g.setEboard('ep-givre'); assert.equal(g.s.eboard ?? null, null);
  g.catalogBuy('ep-givre'); g.setEboard('ep-givre'); assert.equal(g.s.eboard, 'ep-givre'); assert.ok(g.catalogOwned('ep-givre'));
  g.setEboard(null); assert.equal(g.s.eboard, null);
});
