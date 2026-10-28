// v881 : parrainage. Le serveur de partie relie le filleul à son parrain (parrainLink), puis applique les récompenses que
// la base lui indique (parrain_tick) : le cadeau du filleul et chaque palier du parrain, une seule fois chacun.
import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../serveur/partie.mjs';
import { REFERRAL } from '../js/config.js';
import { OPS, ARGS } from '../js/core/ops.js';
import { parrainApply } from '../js/core/parrain.js';
import { gameFor } from '../serveur/partie.mjs';
import { rngFrom } from './helpers.mjs';

const NOW = new Date(2026, 9, 28, 10).getTime();
function memDb(state) {
  const rows = new Map();
  return {
    rows, ticks: 0,
    async lock(uid) { const r = rows.get(uid) || { data: null, version: 0, seqs: {} }; return JSON.parse(JSON.stringify(r)); },
    async unlock() {}, async save(uid, r) { rows.set(uid, JSON.parse(JSON.stringify(r))); return true; },
    async legacySave() { return null; }, async isCreator() { return false; }, async publish() {},
    async parrainLink(uid, code) { if (code.toLowerCase() !== 'alexis') throw new Error('Aucun joueur ne porte ce pseudo.'); state.linked = uid; return { pseudo: 'Alexis' }; },
    async parrainTick(uid) { this.ticks++; return state[uid] || { me: null, ranks: [] }; },
  };
}
const send = (db, uid, body, now = NOW) => handle({ uid, token: 't', body: { dev: 'tel1', tz: 0, ...body } }, { db, now: () => now, rng: rngFrom('srv') });

test('parrainage : 10 paliers, de plus en plus beaux, cadre au 5e et dos vivant au 10e', () => {
  assert.equal(REFERRAL.ladder.length, REFERRAL.max);
  assert.ok(REFERRAL.ladder[4].frame && REFERRAL.ladder[9].back);
  assert.ok(!JSON.stringify(REFERRAL).includes('braise'), 'pas de Braises de vie (demande du propriétaire)');
  assert.ok(!JSON.stringify(REFERRAL).includes('obs'), 'jamais d’obsidiennes (elles s’achètent)');
  assert.equal(OPS.parrainLink.kind, 'first'); assert.deepEqual(ARGS.parrainLink, ['s']);
});

test('parrainage : code entré, cadeau du filleul donné une seule fois', async () => {
  const st = {}, db = memDb(st);
  let out = await send(db, 'f1', { ops: [{ q: 1, m: 'parrainLink', a: ['inconnu'] }], want: true });
  assert.match(out.body.errs[1], /Aucun joueur/);
  out = await send(db, 'f1', { ops: [{ q: 2, m: 'parrainLink', a: ['Alexis'] }], want: true });
  assert.equal(out.body.rets[2].pseudo, 'Alexis'); assert.equal(st.linked, 'f1');
  const before = out.body.data;
  st.f1 = { me: { state: 'ok', parrain: 'Alexis', days: 3, boss: true }, ranks: [] };
  out = await send(db, 'f1', { ops: [], want: true, par: true });
  const after = out.body.data;
  assert.equal(after.shards - before.shards, REFERRAL.gift.shards);
  assert.equal(after.tickets.premium - (before.tickets.premium || 0), 1);
  assert.deepEqual(out.body.par, [{ gift: true }]);
  out = await send(db, 'f1', { ops: [], want: true, par: true });
  assert.equal(out.body.data.shards, after.shards, 'pas deux fois');
  assert.equal(out.body.par, undefined);
});

test('parrainage : paliers du parrain, une seule fois, jamais au-delà du 10e', async () => {
  const st = { p1: { me: null, ranks: [1, 2] } }, db = memDb(st);
  let out = await send(db, 'p1', { ops: [], want: true });
  assert.deepEqual(out.body.par.map((x) => x.rank), [1, 2]);
  const s1 = out.body.data;
  assert.ok(s1.titles.includes('Recruteur') === false);
  st.p1 = { me: null, ranks: [1, 2, 3, 11] };
  out = await send(db, 'p1', { ops: [], want: true }, NOW + 1000); /* moins de 10 minutes : pas de nouvelle lecture */
  assert.equal(out.body.par, undefined);
  out = await send(db, 'p1', { ops: [], want: true }, NOW + 11 * 60000);
  assert.deepEqual(out.body.par.map((x) => x.rank), [3]);
  assert.ok(out.body.data.titles.includes('Recruteur'));
  assert.deepEqual(out.body.data.parrain.paid, [1, 2, 3]);
});

test('parrainage : tous les paliers donnent leurs récompenses', () => {
  const g = gameFor(null, { rng: rngFrom('x'), now: () => NOW });
  const sh = g.s.shards, got = parrainApply(g, { me: null, ranks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
  assert.equal(got.length, 10);
  assert.ok(g.s.frames.includes('cx-vif-lien') && g.s.backs.includes('dos-heraut') && g.s.titles.includes('Héraut de l’Abîme'));
  assert.equal(g.s.shards - sh, REFERRAL.ladder.reduce((a, r) => a + (r.shards || 0), 0));
});
