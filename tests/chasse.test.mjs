// v858 : La Grande Chasse. Une bête par semaine, seule, un combat par jour de 8 tours au plus ; les dégâts comptent même si
// l'équipe tombe ; le serveur de partie rejoue le combat coup par coup et envoie les dégâts à la jauge commune.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { HUNT, HUNT_ORDER, HUNT_BOSSES, huntBossOf, huntLoot, huntWeek } from '../js/core/chasse.js';
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

test('chasse : le combat s’arrête au bout de HUNT.rounds tours (la bête se détourne)', () => {
  const g = fresh('d');
  const st = g.startChasse().battle;
  for (const u of Object.values(st.units)) if (u.side === 'ally') { u.maxHp *= 1000; u.hp = u.maxHp; } // une équipe immortelle : elle tient jusqu'au bout
  const out = g.autoChasse();
  assert.ok(out.survived);
  assert.equal(out.rounds, HUNT.rounds);
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
    async svc(name, args) { svcCalls.push({ name, args }); if (name === 'chasse_claim_info') return { killed: true, rank: 2 }; return { ok: true }; },
  };
  let q = 0; const queue = [];
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('tel'), clock: () => new Date(NOW) });
  recordOps(g, (op) => queue.push({ ...op, q: ++q }));
  const send = async (extra = {}) => handle({ uid: 'u1', token: 't', body: { ops: queue.splice(0), dev: 'tel1', tz: 0, digest: digest(g.s), ...extra } }, { db, now: () => NOW, rng: rngFrom('srv') });
  const base = fresh('srv-base'); base.s.seedBase = 4242; base.s.seedN = 0;
  rows.set('u1', { data: JSON.parse(JSON.stringify(base.s)), version: 1, seqs: {} });
  g.replaceSave(JSON.parse(JSON.stringify(base.s)));
  g.startChasse();
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
