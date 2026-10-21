// v539 : serveur de partie, longue session. Un joueur automatique joue 6 jours (boosters, coffres, offrande, missions,
// Renforcer, Fournaise, chapitres de la Descente, Épreuves, Sceaux, Pacte, Cryptes, Enchères) ; après chaque envoi,
// le serveur doit arriver exactement au même état que le téléphone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { playDuelOps } from './duel-bot.mjs';
import * as CR from '../js/core/cryptes.js';
import { digest } from '../js/core/ops.js';
import { recordOps } from '../js/core/oprec.js';
import { handle } from '../serveur/partie.mjs';
import { SAVE_KEY } from '../js/config.js';

const catalog = loadCatalog();
const DAY = 864e5;

function memDb() {
  const rows = new Map();
  return {
    rows,
    async lock(uid) { return JSON.parse(JSON.stringify(rows.get(uid) || { data: null, version: 0, seqs: {} })); },
    async unlock() {},
    async save(uid, r) { rows.set(uid, JSON.parse(JSON.stringify(r))); return true; },
    async legacySave() { return null; }, async isCreator() { return false; }, async publish() {},
    async versusDuel() { return null; }, async shadowDrew() { return false; }, async rpc() { throw new Error('hors ligne'); },
  };
}
// ce qui doit être identique (sans les dates)
const view = (s) => JSON.stringify({
  shards: s.shards, ash: s.ash, xp: s.xp, tickets: s.tickets, chests: s.chests, pity: s.pity,
  col: Object.fromEntries(Object.entries(s.collection).map(([k, e]) => [k, [e.n, e.v, e.lv || 1]])),
  missions: s.missions, best: s.descent.best, runs: s.descent.runs, run: s.descent.run && { ...s.descent.run, battle: !!s.descent.run.battle },
  trials: { done: s.trials.done, score: s.trials.score }, team: s.team, hunt: s.hunt, fame: s.fame, cstats: s.cstats, titles: s.titles,
  ach: Object.keys(s.achievements).sort(), sets: Object.keys(s.setsDone).sort(), bosses: Object.keys(s.bossesBeaten).sort(), codex: s.codex?.xp,
  games: ['sceaux', 'pacte', 'cryptes', 'encheres'].map((k) => [s[k].wins, s[k].losses, Object.keys(s[k].beaten || {}).sort(), s[k].paidToday]),
  stats: { ...s.stats, firstWin: !!s.stats.firstWin, abyssSecret: !!s.stats.abyssSecret }, week: s.week?.days?.length, daily: s.daily,
});

test('serveur de partie : 6 jours de jeu, le serveur suit le téléphone à l’identique', async () => {
  let now = new Date(2026, 9, 21, 9).getTime();
  const db = memDb();
  let q = 0;
  const queue = [];
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('bot'), clock: () => new Date(now) });
  recordOps(g, (op) => queue.push({ ...op, q: ++q }));
  const r = rngFrom('choix');
  const adopt = (data) => { g.storage.setItem(SAVE_KEY, JSON.stringify(data)); g.replaceSave(JSON.parse(JSON.stringify(data))); };
  const send = async (extra = {}) => {
    const out = await handle({ uid: 'u', token: 't', body: { ops: queue.splice(0), dev: 'bot', tz: 0, digest: digest(g.s), ...extra } }, { db, now: () => now, rng: rngFrom(`srv${q}`) });
    assert.equal(out.status, 200, JSON.stringify(out.body));
    return out.body;
  };
  const tryDo = (f) => { try { return f(); } catch (e) { return null; } };
  let syncs = 0;
  const check = async () => {
    const b = await send();
    assert.deepEqual(b.errs, {}, `opérations refusées : ${JSON.stringify(b.errs)}`);
    assert.equal(b.digest, digest(g.s), 'empreintes');
    assert.equal(view(db.rows.get('u').data), view(g.s), 'état complet');
    syncs++;
  };
  adopt((await send({ want: true })).data);

  for (let day = 0; day < 6; day++) {
    // boosters (tickets, booster gratuit) : tirés par le serveur
    let n = 0;
    while (n < 12) {
      const type = Object.keys(g.s.tickets).find((k) => g.s.tickets[k] > 0) || (g.freePack().stock > 0 ? 'standard' : null);
      if (!type) break;
      queue.push({ m: 'openBooster', a: [type, { faction: type === 'faction' ? 'infernal' : undefined }], q: ++q });
      const b = await send();
      assert.deepEqual(b.errs, {});
      adopt(b.data);
      n++;
    }
    tryDo(() => g.claimDaily());
    g.missions();
    tryDo(() => g.openAllChests());
    tryDo(() => g.setTeam(g.autoTeam()));
    for (const id of g.s.team) tryDo(() => g.upgrade(id));
    tryDo(() => g.burnSpares());
    await check();
    // un chapitre de la Descente
    tryDo(() => g.startRun());
    for (let k = 0; k < 8 && g.s.descent.run; k++) {
      const run = g.s.descent.run;
      if (run.phase === 'omen') g.chooseOmen(run.omenOffer[0]);
      else if (run.phase === 'doors') g.startBattle(run.floor % 5 === 0 ? 'boss' : 'fight');
      else if (run.phase === 'battle') { playDuelOps(g, 'run', r); g.finishBattle(); }
      else if (run.phase === 'reward') { if (run.talentOffer?.length) g.chooseTalent(0); g.chooseReward(run.rewards[Math.floor(r() * run.rewards.length)]); }
      else if (run.phase === 'altar') g.chooseBlessing(run.altar[0]);
      else if (run.phase === 'pact') g.choosePact(null);
      else if (run.phase === 'cleared') g.nextFloor();
      else break;
    }
    if (g.s.descent.run && r() < 0.5) g.abandonRun();
    await check();
    // Épreuves du jour
    for (let i = 0; i < 3; i++) { if (!tryDo(() => g.startTrial(i))) continue; playDuelOps(g, 'trial', r); g.finishTrial(); }
    // mini-jeux : les coups restent sur le téléphone
    if (tryDo(() => g.sceauxStart({ rival: 'initie' }))) {
      for (let k = 0; k < 20 && !g.s.sceaux.cur.over; k++) {
        const st = g.s.sceaux.cur;
        if (st.turn === 'p') g.sceauxPlay(0, st.board.findIndex((c) => !c)); else g.sceauxAi();
      }
      g.sceauxFinish();
    }
    if (tryDo(() => g.pacteStart({ table: 'novice' }))) {
      for (let k = 0; k < 200 && !g.s.pacte.cur.over; k++) {
        const st = g.s.pacte.cur;
        if (st.turn === 'p') { if (r() < 0.6 || !tryDo(() => g.pacteStop() || true)) g.pacteDraw(); } else g.pacteAi();
      }
      g.pacteFinish();
    }
    if (tryDo(() => g.cryptesStart({ table: 'ossuaire' }))) {
      for (let k = 0; k < 400 && !g.s.cryptes.cur.over; k++) {
        const st = g.s.cryptes.cur, hid = CR.hidden(st);
        if (st.pending) { const pk = hid.slice().sort(() => 0).slice(0, st.pending.pick || 0); if (!tryDo(() => g.cryptesPower(pk) || true)) break; }
        else if (st.turn === 'p') { if (!tryDo(() => g.cryptesFlip(hid[Math.floor(r() * hid.length)]) || true)) break; }
        else if (!g.cryptesAi()) break;
      }
      tryDo(() => g.cryptesFinish());
    }
    if (tryDo(() => g.encheresStart({ table: 'etal' }))) {
      for (let k = 0; k < 40 && !g.s.encheres.cur.over; k++) { const o = g.s.encheres.cur.offers.p; g.encheresBid(o[Math.floor(r() * o.length)]); }
      g.encheresFinish();
    }
    if (day === 2 && tryDo(() => g.sceauxStart({ rival: 'initie' }))) g.gameForfeit('sceaux'); // un abandon
    await check();
    for (let i = 0; i < 3; i++) tryDo(() => g.claimMission(i));
    tryDo(() => g.claimWeekChest());
    await check();
    now += DAY;
  }
  assert.ok(syncs >= 18);
  assert.ok(g.s.stats.boosters >= 3 && g.s.descent.runs >= 3, 'boosters et chapitres');
  assert.ok(g.s.sceaux.wins + g.s.sceaux.losses + g.s.sceaux.draws >= 3 && g.s.pacte.wins + g.s.pacte.losses >= 3, 'mini-jeux joués');
  assert.ok((g.s.stats.trials || 0) >= 3, 'Épreuves jouées');
  assert.ok(g.s.cryptes.wins + g.s.cryptes.losses >= 3 && g.s.encheres.wins + g.s.encheres.losses >= 3, 'Cryptes et Enchères jouées');
  console.log('bilan', g.s.cryptes.wins, g.s.encheres.wins, g.s.stats.boosters, g.s.descent.runs, g.s.descent.best, g.s.sceaux.wins, g.s.pacte.wins, g.s.stats.trials, g.s.shards, Object.keys(g.s.collection).length);
});

// v540 : les 20 gardiens (mécaniques à part, beaucoup de hasard) : chaque combat est rejoué par le serveur à l'identique
test('serveur de partie : les 20 gardiens, combats rejoués à l’identique', async () => {
  const now = new Date(2026, 9, 22, 9).getTime();
  const rows = new Map();
  const db = {
    async lock(uid) { return JSON.parse(JSON.stringify(rows.get(uid) || { data: null, version: 0, seqs: {} })); }, async unlock() {},
    async save(uid, r) { rows.set(uid, JSON.parse(JSON.stringify(r))); return true; }, async legacySave() { return null; },
    async isCreator() { return true; }, async publish() {}, async versusDuel() { return null; }, async shadowDrew() { return false; }, async rpc() { throw new Error('hors ligne'); },
  };
  let q = 0;
  const queue = [];
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('gardiens'), clock: () => new Date(now) });
  recordOps(g, (op) => queue.push({ ...op, q: ++q }));
  const send = async (extra = {}) => (await handle({ uid: 'c', token: 't', body: { ops: queue.splice(0), dev: 'bot', tz: 0, digest: digest(g.s), ...extra } }, { db, now: () => now, rng: rngFrom(`s${q}`) })).body;
  const adopt = (data) => { g.storage.setItem(SAVE_KEY, JSON.stringify(data)); g.replaceSave(JSON.parse(JSON.stringify(data))); };
  adopt((await send({ want: true })).data);
  g.s.settings.dev = true;
  for (const id of catalog.cards.filter((c) => ['HR', 'M', 'S'].includes(c.rarity)).slice(0, 8).map((c) => c.id)) g.devGive(id);
  g.setTeam(g.autoTeam());
  let won = 0;
  const r = rngFrom('coups');
  for (const key of ['devoreur', 'matriarche', 'roi', 'architecte', 'eclipse', 'essaim', 'bourreau', 'choeur', 'chaines', 'horloge', 'miroirs', 'golem', 'peste', 'chasseur', 'voeux', 'titan', 'jumeaux', 'juge', 'bete', 'abysse']) {
    g.devBoss(key, { power: true });
    g.startBattle('boss');
    const st = playDuelOps(g, 'run', r, 1500);
    if (st.over === 'won') won++;
    g.finishBattle();
    if (g.s.descent.run) g.abandonRun();
    const b = await send();
    assert.deepEqual(b.errs, {}, `${key} : ${JSON.stringify(b.errs)}`);
    assert.equal(b.digest, digest(g.s), `${key} : même partie`);
    assert.deepEqual(Object.keys(rows.get('c').data.bossesBeaten).sort(), Object.keys(g.s.bossesBeaten).sort(), `${key} : mêmes gardiens vaincus`);
  }
  assert.ok(won >= 1, `au moins un gardien battu (${won})`);
});
