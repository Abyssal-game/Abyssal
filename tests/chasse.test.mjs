// v858 : La Grande Chasse. Une bête par semaine, seule, un combat par jour de 8 tours au plus ; les dégâts comptent même si
// l'équipe tombe ; le serveur de partie rejoue le combat coup par coup et envoie les dégâts à la jauge commune.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { HUNT, HUNT_ORDER, HUNT_BOSSES, HUNT_MILES, huntBossOf, huntLoot, huntWeek, huntTierOf } from '../js/core/chasse.js';
import { autoTurn, dmgOf } from '../js/core/duel.js';
import { BOSSES } from '../js/core/bosses.js';
import { playDuelOps } from './duel-bot.mjs';
import { digest } from '../js/core/ops.js';
import { recordOps } from '../js/core/oprec.js';
import { handle } from '../serveur/partie.mjs';

const catalog = loadCatalog();
const NOW = new Date(2026, 10, 3, 10).getTime(); // mardi 3 novembre 2026
const fresh = (rng = 'c') => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom(rng), clock: () => new Date(NOW) });
  g.devGrant({ tickets: { standard: 20 } });
  while (g.s.tickets.standard > 0) g.openBooster('standard');
  g.setTeam(g.autoTeam());
  return g;
};

test('chasse : huit bêtes, chacune une fiche de gardien et une carte qui existe', () => {
  assert.equal(HUNT_ORDER.length, 8);
  for (const k of HUNT_ORDER) {
    assert.ok(BOSSES[k], k);
    assert.ok(catalog.get(HUNT_BOSSES[k].card), `${k} : carte ${HUNT_BOSSES[k].card}`);
    for (let r = 1; r <= 12; r++) for (const ph of [1, 2]) assert.equal(typeof HUNT_BOSSES[k].pattern(ph, r), 'string');
  }
  const seen = new Set(); for (let w = 2900; w < 2908; w++) seen.add(huntBossOf(w));
  assert.equal(seen.size, 8, 'une bête différente chaque semaine sur 8 semaines');
});

test('chasse : la bête combat seule, un combat par jour, les dégâts sont comptés', () => {
  const g = fresh();
  const c = g.startChasse();
  const st = c.battle;
  assert.equal(st.order.enemy.length, 1, 'aucun serviteur');
  assert.ok(st.units[st.order.enemy[0]].boss);
  assert.equal(st.bossKey, huntBossOf(huntWeek(new Date(NOW))));
  const out = g.autoChasse();
  assert.ok(out.dmg > 0, 'des dégâts');
  assert.equal(g.chasse().weeks[out.week].total, out.dmg);
  assert.ok(g.chasseDone());
  assert.throws(() => g.startChasse(), /déjà chassé/);
});

test('chasse : au bout de HUNT.rounds tours, l’Anéantissement balaie toute l’équipe (v866)', () => {
  const g = fresh('d');
  const st = g.startChasse().battle;
  const heal = () => { for (const u of Object.values(st.units)) if (u.side === 'ally' && u.hp > 0 && !st.huntCata) u.hp = u.maxHp; }; // une équipe qui tient jusqu'au bout
  const evs = [];
  for (let i = 0; i < 400 && !st.over; i++) { evs.push(...autoTurn(st)); heal(); }
  assert.equal(st.over, 'lost');
  assert.ok(st.huntCata, 'Anéantissement lancé');
  assert.ok(Object.values(st.units).filter((u) => u.side === 'ally').every((u) => u.hp <= 0), 'toute l’équipe tombe');
  assert.ok(evs.some((e) => e.t === 'status' && /^Anéantissement dans 3 tours/.test(e.s)), 'annoncé 3 tours avant');
  const out = g.finishChasse();
  assert.ok(out.survived && out.cata);
  assert.equal(out.rounds, HUNT.rounds);
});

test('chasse : la bête frappe plus fort à chaque tour (v866)', () => {
  const st = fresh('r').startChasse().battle;
  const b = Object.values(st.units).find((u) => u.boss), a = Object.values(st.units).find((u) => u.side === 'ally');
  st.round = 1; const d1 = dmgOf(st, b, a, 1);
  st.round = 6; const d6 = dmgOf(st, b, a, 1);
  assert.ok(d6 > d1 * 1.8, `${d1} → ${d6}`);
});

test('chasse : palier de la bête et point faible de la semaine (v866)', () => {
  assert.equal(huntTierOf(0, 1000), 0);
  assert.equal(huntTierOf(250, 1000), 1);
  assert.equal(huntTierOf(500, 1000), 2);
  assert.equal(huntTierOf(800, 1000), 3);
  const g0 = fresh('t'), g3 = fresh('t');
  const s0 = g0.startChasse(0).battle, s3 = g3.startChasse(3).battle;
  const b0 = Object.values(s0.units).find((u) => u.boss), b3 = Object.values(s3.units).find((u) => u.boss), B = HUNT_BOSSES[s3.bossKey];
  assert.ok(b3.atk > b0.atk, 'plus forte');
  for (const k of B.rise) assert.ok(b3[k], `pouvoir ${k}`);
  assert.equal(s3.huntTier, 3);
  assert.equal(s0.huntBane, B.bane);
  const a = Object.values(s0.units).find((u) => u.side === 'ally');
  const fa = a.faction; a.faction = 'x'; const base = dmgOf(s0, a, b0, 1); a.faction = B.bane; const boosted = dmgOf(s0, a, b0, 1); a.faction = fa;
  assert.ok(boosted > base * 1.2, `point faible : ${base} → ${boosted}`);
});

test('chasse : paliers personnels de la semaine (v866)', () => {
  const g = fresh('m');
  g.startChasse();
  const st = g.chasse().battle; st.over = 'lost'; st.huntDmg = HUNT_MILES[1].dmg + 5;
  const before = { ...g.s.chests };
  const out = g.finishChasse();
  assert.equal(out.miles.length, 2);
  assert.equal(g.chasse().weeks[out.week].miles, 2);
  for (const m of out.miles) for (const [k, n] of Object.entries(m.reward.chests)) assert.ok((g.s.chests[k] || 0) >= (before[k] || 0) + n, k);
});

test('chasse : le coup de grâce donne son titre (v866)', () => {
  const r = huntLoot({ days: 1, rank: 40, killer: true });
  assert.equal(r.title2, 'Coup de grâce');
  assert.ok(r.chests.abyssal);
  assert.equal(huntLoot({ days: 1, rank: 40 }).title2, undefined);
});

test('chasse : butin de la semaine selon la participation', () => {
  assert.equal(huntLoot({ days: 0 }), null);
  assert.deepEqual(huntLoot({ days: 1, rank: 50 }).chests, { or: 1 });
  assert.ok(huntLoot({ days: 4 }).tickets.premium);
  const top = huntLoot({ days: 2, rank: 3 });
  assert.ok(top.title && top.chests.abyssal);
  const g = fresh('e');
  g.startChasse(); g.autoChasse();
  const w = g.chasse().cur;
  assert.throws(() => g.chasseClaimApply(w, { killed: false }), /pas encore tombée/);
  const r = g.chasseClaimApply(w, { killed: true, rank: 1 });
  assert.ok(r.title);
  assert.throws(() => g.chasseClaimApply(w, { killed: true, rank: 1 }), /déjà reçu/);
});

test('chasse : le serveur rejoue le combat, retrouve les mêmes dégâts et les envoie à la jauge commune', async () => {
  const rows = new Map(), svcCalls = [];
  const db = {
    async lock(uid) { const r = rows.get(uid) || { data: null, version: 0, seqs: {} }; return JSON.parse(JSON.stringify(r)); },
    async unlock() {},
    async save(uid, r) { rows.set(uid, JSON.parse(JSON.stringify(r))); return true; },
    async legacySave() { return null; }, async isCreator() { return false; }, async publish() {},
    async svc(name, args) { svcCalls.push({ name, args }); if (name === 'chasse_claim_info') return { killed: true, rank: 2 }; if (name === 'chasse_tier') return 2; return { ok: true }; },
  };
  let q = 0; const queue = [];
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('tel'), clock: () => new Date(NOW) });
  recordOps(g, (op) => queue.push({ ...op, q: ++q }));
  const send = async (extra = {}) => handle({ uid: 'u1', token: 't', body: { ops: queue.splice(0), dev: 'tel1', tz: 0, digest: digest(g.s), ...extra } }, { db, now: () => NOW, rng: rngFrom('srv') });
  const base = fresh('srv-base'); base.s.seedBase = 4242; base.s.seedN = 0;
  rows.set('u1', { data: JSON.parse(JSON.stringify(base.s)), version: 1, seqs: {} });
  g.replaceSave(JSON.parse(JSON.stringify(base.s)));
  g.startChasse(2); // le téléphone connaît le palier 2 (comme la base)
  playDuelOps(g, 'chasse', rngFrom('jeu'));
  const out = g.finishChasse();
  const res = await send();
  assert.equal(res.status, 200);
  assert.deepEqual(Object.values(res.body.errs).slice(0, 3), []);
  assert.equal(res.body.digest, digest(g.s), 'même partie des deux côtés');
  const add = svcCalls.find((x) => x.name === 'chasse_add');
  assert.ok(add, 'dégâts envoyés à la jauge');
  assert.equal(add.args.p_dmg, out.dmg);
  assert.equal(add.args.p_week, out.week);
  // butin : le serveur demande l'état de la bête, jamais le téléphone
  queue.push({ m: 'chasseClaim', a: [out.week], q: ++q });
  const res2 = await send();
  const ret = Object.values(res2.body.rets)[0];
  assert.ok(ret?.chests?.or, 'butin donné');
});

test('chasse : le serveur impose le vrai palier de la bête (le téléphone ne peut pas l’adoucir) (v866)', async () => {
  const rows = new Map();
  const db = {
    async lock() { const r = rows.get('u1'); return JSON.parse(JSON.stringify(r)); }, async unlock() {},
    async save(uid, r) { rows.set(uid, JSON.parse(JSON.stringify(r))); return true; },
    async legacySave() { return null; }, async isCreator() { return false; }, async publish() {},
    async svc(name) { if (name === 'chasse_tier') return 3; return { ok: true }; },
  };
  const base = fresh('srv-t'); base.s.seedBase = 99; base.s.seedN = 0;
  rows.set('u1', { data: JSON.parse(JSON.stringify(base.s)), version: 1, seqs: {} });
  const res = await handle({ uid: 'u1', token: 't', body: { ops: [{ m: 'startChasse', a: [0], q: 1 }], dev: 'tel1', tz: 0, digest: 'x' } }, { db, now: () => NOW, rng: rngFrom('srv') });
  assert.equal(res.status, 200);
  assert.equal(rows.get('u1').data.chasse.battle.huntTier, 3);
});
