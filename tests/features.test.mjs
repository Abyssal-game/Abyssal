import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { FUSION } from '../js/config.js';

const catalog = loadCatalog();
const newGame = (seed = 'f', day = new Date(2026, 9, 10, 12)) => new Game(catalog, new MemoryStorage(), { rng: rngFrom(seed), clock: () => day });

test('missions du jour : trois types différents, stables dans la journée, renouvelées le lendemain', () => {
  const g = newGame();
  const a = g.missions().list.map((x) => x.key);
  assert.equal(a.length, 3);
  assert.equal(new Set(g.missions().list.map((x) => x.kind)).size, 3);
  assert.deepEqual(g.missions().list.map((x) => x.key), a);
  const g2 = newGame('f', new Date(2026, 9, 11, 12));
  assert.equal(g2.missions().day, '2026-10-11');
});

test('missions : progression, récompense et bonus', () => {
  const g = newGame();
  const m = g.missions();
  m.list = [
    { key: 'open2', kind: 'booster', n: 2, shards: 50, p: 0, claimed: false },
    { key: 'offering', kind: 'daily', n: 1, shards: 30, p: 0, claimed: false },
    { key: 'new3', kind: 'new', n: 3, shards: 50, p: 0, claimed: false },
  ];
  g.s.shards = 10000;
  g.openBooster('standard'); g.openBooster('standard');
  g.claimDaily();
  assert.equal(m.list[0].p, 2);
  assert.equal(m.list[1].p, 1);
  assert.ok(m.list[2].p >= 3);
  const before = g.s.shards;
  g.claimMission(0); g.claimMission(1); g.claimMission(2);
  assert.equal(g.s.shards, before + 130);
  assert.throws(() => g.claimMission(0));
  const t = g.s.tickets.standard;
  g.claimMission('bonus');
  assert.equal(g.s.tickets.standard, t + 1);
  assert.throws(() => g.claimMission('bonus'));
});

test('fusion : 5 doublons communs donnent une peu commune, la première copie est gardée', () => {
  const g = newGame('fusion');
  const commons = catalog.byRarity.C.slice(0, 3);
  commons.forEach((c) => { for (let i = 0; i < 3; i++) g.addCard(c.id); }); // 2 doublons chacune = 6
  assert.equal(g.spareCount('C'), 6);
  const r = g.fuse('C');
  assert.equal(catalog.get(r.id).rarity, 'PC');
  assert.equal(r.used.length, FUSION.cost);
  assert.equal(g.spareCount('C'), 1);
  commons.forEach((c) => assert.ok(g.entry(c.id).v.normal >= 1));
  assert.throws(() => g.fuse('C'));
  assert.throws(() => g.fuse('M'));
});

test('chance : statistiques et plus belles ouvertures', () => {
  const g = newGame('luck');
  g.s.shards = 100000;
  for (let i = 0; i < 12; i++) g.openBooster('standard');
  const st = g.s.stats;
  assert.equal(Object.values(st.pulls).reduce((a, b) => a + b, 0), 60);
  assert.ok(st.expHR > 0);
  assert.ok(g.s.best.length === 5);
  for (let i = 1; i < 5; i++) assert.ok(g.s.best[i - 1].score >= g.s.best[i].score);
});

test('rituel : chance calculée, réussite transforme la carte, échec augmente la ferveur', () => {
  const always = new Game(catalog, new MemoryStorage(), { rng: () => 0, clock: () => new Date(2026, 9, 10) });
  const target = catalog.byRarity.R[0];
  always.addCard(target.id);
  const commons = catalog.byRarity.C.slice(0, 4);
  commons.forEach((c) => { for (let i = 0; i < 4; i++) always.addCard(c.id); }); // 12 doublons C
  assert.equal(always.ritualTarget(target.id, 'normal'), 'holo');
  assert.equal(always.ritualChance(target.id, 'normal', {}), 0);
  assert.equal(always.ritualChance(target.id, 'normal', { C: 5 }), 20);
  const r = always.ritual(target.id, 'normal', { C: 5 });
  assert.ok(r.success);
  assert.equal(always.entry(target.id).v.holo, 1);
  assert.equal(always.entry(target.id).v.normal, 0);
  assert.equal(always.spareCount('C'), 7);

  const never = new Game(catalog, new MemoryStorage(), { rng: () => 0.999, clock: () => new Date(2026, 9, 10) });
  never.addCard(target.id);
  commons.forEach((c) => { for (let i = 0; i < 4; i++) never.addCard(c.id); });
  const r2 = never.ritual(target.id, 'normal', { C: 2 });
  assert.ok(!r2.success);
  assert.equal(never.s.fervor[`${target.id}:holo`], 1);
  assert.ok(never.owns(target.id));
  assert.equal(never.ritualChance(target.id, 'normal', { C: 2 }), 20);
  // rituel interdit raté : la carte est consumée
  const r3 = never.ritual(target.id, 'normal', { C: 2 }, true);
  assert.ok(r3.lost);
  assert.ok(!never.owns(target.id));
  // les C et PC n'ont pas de feuille d'or : chroma -> cosmique
  assert.equal(never.ritualTarget(commons[0].id, 'chroma'), 'galaxy');
});


test('héros : équipe, niveaux, invocations débloquées', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('h'), clock: () => new Date(2026, 9, 10, 12) });
  assert.deepEqual(g.ownedHeroes(), ['brenna', 'aldric', 'sylea', 'morgane']);
  assert.equal(g.heroLevel('brenna'), 1);
  g.hero('brenna').xp = 40; assert.equal(g.heroLevel('brenna'), 2);
  assert.ok(g.invocationUnlocked('phenix'));
  assert.ok(!g.invocationUnlocked('bahamut'));
  g.addCard('ABY-043'); assert.ok(g.invocationUnlocked('bahamut'));
  g.s.descent.best = 15; assert.ok(g.invocationUnlocked('fenrir'));
  assert.deepEqual(g.setParty(['sylea', 'morgane', 'brenna', 'aldric']), ['sylea', 'morgane', 'brenna']);
});

test('descente : torches, combats au tour par tour, chasse, défaite et blessures', () => {
  const day = new Date(2026, 9, 10, 12);
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('d'), clock: () => day });
  g.startRun();
  assert.equal(g.torchesLeft(), 2);
  assert.throws(() => g.startRun());
  let out;
  for (let i = 0; i < 200 && g.s.descent.run; i++) {
    const run = g.s.descent.run;
    if (run.phase === 'doors') { out = g.chooseDoor(g.doors().includes('elite') ? 'elite' : g.doors().includes('boss') ? 'boss' : g.doors().find((d) => d === 'fight') || g.doors()[0]); if (out.battle) out = g.autoResolve(); }
    else if (run.phase === 'altar') g.chooseBlessing(run.altar[0]);
    else g.nextFloor();
  }
  assert.ok(out.lost, 'une équipe niveau 1 finit par tomber');
  assert.ok(g.huntCount() > 0, 'des créatures rejoignent le Bestiaire de chasse');
  assert.ok(out.summary.fallen.length >= 1);
  out.summary.fallen.forEach((k) => assert.ok(g.heroWounded(k)));
  assert.ok(g.s.heroes.brenna.xp > 0, 'les héros gagnent de l’expérience');
  // descente maudite ratée : tout le butin est perdu, mais aucune carte
  const g2 = new Game(catalog, new MemoryStorage(), { rng: rngFrom('m'), clock: () => day });
  const owned = g2.uniqueCount();
  g2.startRun({ cursed: true });
  g2.s.descent.run.loot.shards = 500;
  const shards = g2.s.shards;
  g2.s.descent.run.team.forEach((m) => { m.fallen = true; });
  const sum = g2.endRun(true);
  assert.equal(g2.s.shards, shards);
  assert.equal(g2.uniqueCount(), owned);
  assert.equal(sum.loot.shards, 0);
});

test('combat : parade parfaite, interruption au givre, invocation, reprise', async () => {
  const B = await import('../js/core/battle.js');
  const H = await import('../js/core/heroes.js');
  const heroes = ['brenna', 'aldric', 'morgane'].map((k) => H.makeHero(k, { level: 5 }));
  const enemies = catalog.byRarity.C.slice(0, 3).map((c) => H.makeEnemy(c, { level: 2 }));
  const st = B.createBattle(heroes, enemies, 42, { invocation: { key: 'bahamut', power: 1 } });
  assert.ok(B.front(st, 'enemy').every((e) => e.intent), 'chaque ennemi annonce son intention');
  // une attaque préparée est interrompue par le givre
  const foe = B.front(st, 'enemy')[0];
  foe.st.charging = true; foe.intent = { k: 'heavy', t: B.front(st, 'ally')[0].uid };
  const mage = B.front(st, 'ally').find((h) => h.id === 'morgane');
  mage.energy = 3; st.now = mage.ct;
  const ev = B.act(st, { actor: mage.uid, action: 'skill', skill: 'givre', target: foe.uid });
  assert.ok(ev.some((e) => e.t === 'interrupt'));
  assert.ok(!foe.st.charging);
  // parade parfaite : aucun dégât, contre-attaque
  const tank = B.front(st, 'ally')[0];
  foe.st.charging = false; foe.intent = { k: 'heavy', t: tank.uid };
  const hp = tank.hp; st.now = foe.ct;
  const ev2 = B.act(st, { actor: foe.uid, action: 'enemy', parry: 'perfect' });
  assert.equal(tank.hp, hp);
  assert.ok(ev2.some((e) => e.t === 'parry'));
  // invocation quand la jauge est pleine
  st.gauge = 100;
  const ev3 = B.act(st, { actor: tank.uid, action: 'invoke' });
  assert.ok(ev3.some((e) => e.t === 'summon'));
  assert.equal(st.gauge, 0);
  // l'état se sauvegarde et se reprend
  const copy = JSON.parse(JSON.stringify(st));
  B.autoBattle(copy, { strike: 'good', parry: 'good' });
  assert.ok(copy.over);
});

test('correctifs : migration, expédition de la veille, ancienne expédition clôturée', async () => {
  const { migrate, defaultSave } = await import('../js/core/save.js');
  const old = defaultSave(); old.descent = { day: null, run: { floor: 3, loot: { shards: 40 } } }; delete old.stats.pulls; old.missions = null; delete old.heroes;
  const m = migrate(old);
  assert.equal(m.stats.pulls.C, 0);
  assert.ok(Array.isArray(m.missions.list));
  assert.ok(m.heroes.brenna);
  const g0 = new Game(catalog, new MemoryStorage(), { clock: () => new Date(2026, 9, 10, 12) });
  g0.s = m; const before = g0.s.shards;
  g0.descent();
  assert.equal(g0.s.descent.run, null);
  assert.equal(g0.s.shards, before + 40);
  let now = new Date(2026, 9, 10, 23, 50);
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('mid'), clock: () => now });
  g.startRun();
  now = new Date(2026, 9, 11, 0, 10);
  g.descent();
  g.recordDepth(5);
  assert.equal(g.s.descent.bestToday, 0);
  assert.equal(g.s.descent.best, 5);
});

test('objets : soin des héros, torche, parchemin', () => {
  const day = new Date(2026, 9, 10, 12);
  const g = new Game(catalog, new MemoryStorage(), { rng: () => 0.5, clock: () => day });
  g.s.shards = 5000;
  g.hero('aldric').wound = day.getTime() + 3600000;
  assert.ok(g.heroWounded('aldric'));
  g.buyItem('baume'); g.useItem('baume', 'aldric');
  assert.ok(!g.heroWounded('aldric'));
  g.buyItem('torche'); assert.throws(() => g.useItem('torche'));
  g.s.descent.used = 2; g.useItem('torche'); assert.equal(g.torchesLeft(), 2);
  g.buyItem('parchemin'); g.useItem('parchemin', 'sylea'); assert.equal(g.s.heroes.sylea.xp, 80);
});
