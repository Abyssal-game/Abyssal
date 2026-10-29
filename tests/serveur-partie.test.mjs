// v539 : serveur de partie (anti-triche, étape 1). Le serveur rejoue les opérations du téléphone avec le même moteur :
// une partie honnête arrive au même résultat des deux côtés ; une partie modifiée est remise d'aplomb par le serveur.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { playDuelOps } from './duel-bot.mjs';
import { digest } from '../js/core/ops.js';
import { recordOps } from '../js/core/oprec.js';
import { handle } from '../serveur/partie.mjs';
import { SAVE_KEY } from '../js/config.js';

const catalog = loadCatalog();
const NOW = new Date(2026, 9, 21, 10).getTime();

// base en mémoire (même interface que serveur/db-rest.mjs)
function memDb({ creators = [], legacy = {}, rpc = {} } = {}) {
  const rows = new Map(), locks = new Set(), published = [];
  return {
    rows, published,
    async lock(uid) { if (locks.has(uid)) return null; locks.add(uid); const r = rows.get(uid) || { data: null, version: 0, seqs: {} }; return JSON.parse(JSON.stringify(r)); },
    async unlock(uid) { locks.delete(uid); },
    async save(uid, r) { const cur = rows.get(uid); if ((cur?.version || 0) !== r.version - 1) return false; rows.set(uid, JSON.parse(JSON.stringify(r))); locks.delete(uid); return true; },
    async legacySave(uid) { return legacy[uid] || null; },
    async isCreator(uid) { return creators.includes(uid); },
    async versusDuel(id) { return rpc.duels?.[id] || null; },
    async shadowDrew() { return false; },
    ...(rpc.giftMemory ? { giftMemory: rpc.giftMemory } : {}),
    async publish(uid, profile, card, trials) { published.push({ uid, profile, card, trials }); },
    async rpc(name, args) { if (!rpc[name]) throw new Error(`rpc ${name}`); return rpc[name](args); },
  };
}

// un « téléphone » : le jeu local, ses opérations notées, envoyées au serveur
function phone(db, uid = 'u1') {
  let q = 0;
  const queue = [];
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('tel'), clock: () => new Date(NOW) });
  recordOps(g, (op) => queue.push({ ...op, q: ++q }));
  return {
    g, queue,
    async send(extra = {}) {
      const ops = queue.splice(0);
      const out = await handle({ uid, token: 't', body: { ops, dev: 'tel1', tz: 0, digest: digest(g.s), ...extra } }, { db, now: () => NOW, rng: rngFrom('srv') });
      return out;
    },
    adopt(data) { g.storage.setItem(SAVE_KEY, JSON.stringify(data)); g.replaceSave(JSON.parse(JSON.stringify(data))); },
    first(m, args) { queue.push({ m, a: args, q: ++q }); return q; },
  };
}

test('serveur de partie : un nouveau compte reçoit une partie neuve', async () => {
  const db = memDb(), p = phone(db);
  const out = await p.send({ want: true });
  assert.equal(out.status, 200);
  assert.equal(out.body.v, 1);
  assert.ok(out.body.data && out.body.data.shards >= 0);
  assert.equal(db.rows.get('u1').version, 1);
});

test('serveur de partie : compte recréé avec le même e-mail : pas de 2e cadeau de bienvenue (v796)', async () => {
  const fresh = await phone(memDb(), 'u0').send({ want: true });
  const mem = { createdAt: 123, freePack: { day: '2026-10-21', left: 0 }, descent: { day: '2026-10-21', used: 4 } };
  const db = memDb({ rpc: { giftMemory: async (uid) => (uid === 'u2' ? mem : null) } }), p = phone(db, 'u2');
  const out = await p.send({ want: true });
  assert.equal(out.status, 200);
  const d = out.body.data;
  assert.equal(d.welcomeGift, 0);
  assert.equal(d.giftShown, true);
  assert.equal(d.giftsKept, true);
  assert.equal(d.tickets.standard, fresh.body.data.tickets.standard - 2);
  assert.deepEqual(d.freePack, mem.freePack);
  assert.equal(d.descent.used, 4);
  assert.equal(d.createdAt, 123);
  // e-mail jamais vu : partie neuve normale, et une base sans le SQL 19 ne bloque rien
  const db2 = memDb({ rpc: { giftMemory: async () => { throw new Error('42883'); } } });
  const o2 = await phone(db2, 'u3').send({ want: true });
  assert.equal(o2.body.data.welcomeGift, 2);
});

test('serveur de partie : l’ancienne sauvegarde en ligne est reprise une fois', async () => {
  const old = new Game(catalog, new MemoryStorage(), { rng: rngFrom(1), clock: () => new Date(NOW) });
  old.s.shards = 777; old.s.ash = 55;
  const db = memDb({ legacy: { u1: old.s } }), p = phone(db);
  const out = await p.send({ want: true });
  assert.equal(out.body.data.shards, 777);
  assert.equal(out.body.data.ash, 55);
});

test('serveur de partie : boosters ouverts par le serveur, chapitre joué sur le téléphone, même résultat des deux côtés', async () => {
  const db = memDb(), p = phone(db);
  p.adopt((await p.send({ want: true })).body.data);
  // les boosters de bienvenue : tirés par le serveur
  const q1 = p.first('openBooster', ['standard']), q2 = p.first('openBooster', ['standard']);
  let out = await p.send();
  assert.ok(out.body.rets[q1].opening.cards.length >= 3 && out.body.rets[q2].opening.cards.length >= 3);
  assert.ok(out.body.data, 'le téléphone n’a pas tiré : il reçoit la partie du serveur');
  p.adopt(out.body.data);
  // une journée de jeu : offrande, chapitre 1 joué au hasard sur le téléphone, retour
  const g = p.g;
  g.claimDaily();
  g.missions();
  g.startRun();
  if (g.s.descent.run.phase === 'omen') g.chooseOmen(g.s.descent.run.omens?.[0] || Object.keys(g.s.descent.run.omenChoices || {})[0]);
  for (let i = 0; i < 3 && g.s.descent.run; i++) {
    const run = g.s.descent.run;
    if (run.phase === 'doors') g.startBattle('fight');
    if (run.phase === 'battle') { playDuelOps(g, 'run', rngFrom(`b${i}`)); g.finishBattle(); }
    if (g.s.descent.run?.phase === 'reward') g.chooseReward(g.s.descent.run.rewards[0]);
    if (g.s.descent.run?.phase === 'altar') g.chooseBlessing(g.s.descent.run.altar[0]);
    if (g.s.descent.run?.phase === 'cleared') g.nextFloor();
  }
  if (g.s.descent.run) g.abandonRun();
  assert.ok(p.queue.length >= 5);
  out = await p.send();
  assert.deepEqual(out.body.errs, {}, JSON.stringify(out.body.errs));
  assert.equal(out.body.digest, digest(g.s), 'serveur et téléphone d’accord');
  assert.equal(out.body.data, undefined, 'rien à renvoyer quand tout concorde');
});

test('serveur de partie : des éclats ajoutés sur le téléphone sont refusés', async () => {
  const db = memDb(), p = phone(db);
  p.adopt((await p.send({ want: true })).body.data);
  const before = p.g.s.shards;
  p.g.s.shards += 100000; p.g.s.collection['INF-001'] = { n: 1, v: { gold: 1 }, lv: 10 };
  p.g.markAllSeen();
  const out = await p.send();
  assert.notEqual(out.body.digest, digest(p.g.s));
  assert.equal(out.body.data.shards, before);
  assert.equal(out.body.data.collection['INF-001'], undefined);
});

test('serveur de partie : une opération renvoyée deux fois ne compte qu’une fois', async () => {
  const db = memDb(), p = phone(db);
  p.adopt((await p.send({ want: true })).body.data);
  const s0 = db.rows.get('u1').data.shards;
  p.g.claimDaily();
  const ops = p.queue.splice(0).map((o, i) => ({ ...o, q: 100 + i }));
  const body = { ops, dev: 'tel1', tz: 0 };
  await handle({ uid: 'u1', token: 't', body }, { db, now: () => NOW });
  const once = db.rows.get('u1').data.shards;
  await handle({ uid: 'u1', token: 't', body }, { db, now: () => NOW });
  assert.ok(once > s0);
  assert.equal(db.rows.get('u1').data.shards, once);
});

test('serveur de partie : opérations refusées (coups de jeu, Mode Créateur sans badge)', async () => {
  const db = memDb(), p = phone(db);
  await p.send({ want: true });
  const ops = [{ q: 1, m: 'devGrant', a: [{ shards: 99999 }] }, { q: 2, m: 'duelState', a: ['run'] }, { q: 3, m: 'toString', a: [] }];
  const out = await handle({ uid: 'u1', token: 't', body: { ops, dev: 'x1' } }, { db, now: () => NOW });
  assert.match(out.body.errs[1], /Créateur/);
  assert.match(out.body.errs[2], /refusée/);
  assert.match(out.body.errs[3], /refusée/);
  const db2 = memDb({ creators: ['u1'] });
  await handle({ uid: 'u1', token: 't', body: { ops: [ops[0]], dev: 'x1' } }, { db: db2, now: () => NOW });
  assert.ok(db2.rows.get('u1').data.shards >= 99999);
});

/* v890 : objets du Gardien réservés au compte du créateur */
test('serveur de partie : les objets du Gardien seulement pour le badge du créateur', async () => {
  const db = memDb(), p = phone(db);
  p.adopt((await p.send({ want: true })).body.data);
  p.g.creatorKit();
  const out = await p.send();
  assert.match(out.body.errs[1], /Créateur/);
  assert.ok(!db.rows.get('u1').data.titles.includes('Le Gardien'));
  assert.ok(!(db.rows.get('u1').data.portraits || []).includes('x-gardien'));
  const db2 = memDb({ creators: ['u1'] }), p2 = phone(db2);
  p2.adopt((await p2.send({ want: true })).body.data);
  p2.g.creatorKit(); p2.g.setAvatar('x-gardien'); p2.g.setTitle('Le Gardien'); p2.g.setFrame('cx-vif-gardien'); p2.g.setFond('fp-gardien');
  await p2.send({ pub: true });
  const d = db2.rows.get('u1').data;
  assert.ok(d.titles.includes('Le Gardien') && d.frames.includes('cx-vif-gardien') && d.fonds.includes('fp-gardien') && d.portraits.includes('x-gardien'));
  assert.equal(d.avatar, 'x-gardien');
  assert.equal(db2.published.at(-1)?.profile.avatar, 'x-gardien');
  assert.ok(!p2.g.needsCreatorKit());
});

test('serveur de partie : une partie des Sceaux truquée ne compte pas (le serveur rejoue les vrais coups)', async () => {
  const db = memDb(), p = phone(db);
  p.adopt((await p.send({ want: true })).body.data);
  const g = p.g;
  g.sceauxStart({ rival: 'initie' });
  const cur = g.s.sceaux.cur;
  cur.over = 'won'; cur.final = { p: 9, o: 1 }; cur.rival = 'souverain'; // gagnée d'avance, sans jouer, contre la Souveraine
  g.sceauxFinish();
  const out = await p.send();
  const data = out.body.data || db.rows.get('u1').data;
  assert.ok(Object.values(out.body.errs).some((e) => /terminée/.test(e)), 'la fin est refusée : sur le serveur, la partie n’est pas jouée');
  assert.equal(data.sceaux.beaten.initie, undefined);
  assert.equal(data.sceaux.beaten.souverain, undefined);
  assert.equal(data.sceaux.wins, 0);
});

test('serveur de partie : un combat truqué ne compte pas', async () => {
  const db = memDb(), p = phone(db);
  p.adopt((await p.send({ want: true })).body.data);
  const g = p.g;
  g.claimDaily(); // de quoi avoir une partie normale
  for (const t of ['standard', 'standard']) p.first('openBooster', [t]);
  p.adopt((await p.send()).body.data);
  g.startRun();
  if (g.s.descent.run.phase === 'omen') g.chooseOmen(g.s.descent.run.omenOffer[0]);
  g.startBattle('fight');
  const st = g.s.descent.run.battle;
  Object.values(st.units).forEach((u) => { if (u.side === 'enemy') u.hp = 0; }); st.over = 'won'; // victoire inventée
  g.finishBattle();
  const out = await p.send();
  const data = out.body.data;
  assert.ok(data, 'le téléphone reprend la partie du serveur');
  assert.ok(Object.values(out.body.errs).length > 0);
  assert.equal(data.descent.run.cleared, 0, 'l’étage n’est pas gagné sur le serveur');
  assert.equal(data.descent.run.phase, 'battle', 'le combat continue sur le serveur');
});

test('serveur de partie : réglages libres, mais pas le Mode Créateur sans badge', async () => {
  const db = memDb(), p = phone(db);
  await p.send({ want: true });
  const free = { settings: { ...p.g.s.settings, volume: 0.2, dev: true }, tips: { a: 1 }, devForce: { rarity: 'S' } };
  await handle({ uid: 'u1', token: 't', body: { ops: [], dev: 'x', free } }, { db, now: () => NOW });
  const d = db.rows.get('u1').data;
  assert.equal(d.settings.volume, 0.2);
  assert.equal(d.settings.dev, false);
  assert.deepEqual(d.tips, { a: 1 });
  assert.ok(!d.devForce);
});

test('serveur de partie : Pari des Boosters, la mise est prise et les gains viennent du serveur', async () => {
  let claimed = false;
  const card = catalog.cards.find((c) => c.rarity === 'M');
  const rich = new Game(catalog, new MemoryStorage(), { rng: rngFrom(2), clock: () => new Date(NOW) }); rich.s.shards = 2000;
  const db = memDb({ legacy: { u1: rich.s }, rpc: { versus_create_mix: () => 'd1', versus_claim: () => (claimed ? { result: 'already', cards: [] } : (claimed = true, { result: 'win', cards: [{ id: card.id, variant: 'normal' }], stake: 400 })) } });
  const p = phone(db);
  p.adopt((await p.send({ want: true })).body.data);
  const s0 = p.g.s.shards;
  const q = p.first('versusCreate', [[{ type: 'standard' }], null]);
  let out = await p.send();
  assert.equal(out.body.rets[q].id, 'd1');
  assert.equal(db.rows.get('u1').data.shards, s0 - 400);
  const q2 = p.first('versusClaim', ['d1']), q3 = p.first('versusClaim', ['d1']);
  out = await p.send();
  assert.ok(db.rows.get('u1').data.collection[card.id], 'carte gagnée');
  assert.equal(out.body.rets[q2].res.result, 'win');
  assert.equal(out.body.rets[q3].out, null, 'encaissé une seule fois');
});

// v680 : achats payés : la liste vient de RevenueCat (jamais du téléphone), chaque achat donné une seule fois
test('serveur : iapSync donne les achats vérifiés auprès de RevenueCat, une seule fois', async () => {
  const { revenueCatTx, createRevenueCat } = await import('../serveur/iap.mjs');
  const { SHOP } = await import('../js/core/codex.js');
  const store = (id) => SHOP.find((x) => x.id === id).store;
  const json = { subscriber: { non_subscriptions: { [store('obs-1000')]: [{ id: 'rc1', store_transaction_id: '2000001', purchase_date: '2026-12-02T10:00:00Z', is_sandbox: true, store: 'app_store' }] } } };
  assert.deepEqual(revenueCatTx(json).map((t) => [t.id, t.product]), [['2000001', store('obs-1000')]]);
  let asked = null;
  const iap = createRevenueCat({ key: 'sk_test', fetch: async (url, o) => { asked = { url, auth: o.headers.Authorization }; return { ok: true, status: 200, json: async () => json }; } });
  const db = memDb();
  const call = (q) => handle({ uid: 'u9', token: 't', body: { ops: [{ q, m: 'iapSync', a: [] }], dev: 'dev1', want: true } }, { db, iap, now: () => NOW });
  let r = await call(1);
  assert.equal(r.status, 200); assert.equal(r.body.rets[1].length, 1); assert.equal(r.body.data.obs, 1300);
  assert.match(asked.url, /subscribers\/u9$/); assert.equal(asked.auth, 'Bearer sk_test');
  r = await call(2);
  assert.equal(r.body.rets[2].length, 0, 'déjà donné'); assert.equal(r.body.data.obs, 1300);
  r = await handle({ uid: 'u9', token: 't', body: { ops: [{ q: 3, m: 'iapSync', a: [] }], dev: 'dev1' } }, { db, now: () => NOW });
  assert.match(r.body.errs[3], /pas encore ouverts/, 'sans clé RevenueCat : refusé');
  assert.equal(createRevenueCat({ key: '' }), null);
});
