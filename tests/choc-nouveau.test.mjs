// v811 : le nouveau Choc des Boosters : règles des manches (force, Cercle des Royaumes, Sceau d'Ardeur, Renfort, vainqueur),
// ce que voit chaque joueur, jetons (un par jour, réserve), cartes gardées, et partie en ligne réservée au serveur de partie.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { CHOC, CYCLE, beats, forceOf, newGame, apply, viewFor, wonIdx, aiPick } from '../js/core/choc.js';
import { OPS, ARGS } from '../js/core/ops.js';
const catalog = loadCatalog();
let now = new Date('2026-11-02T10:00:00');
const fresh = () => noWelcome(new Game(catalog, new MemoryStorage(), { rng: rngFrom('c'), clock: () => now }));
const C = (rarity, faction, variant = 'normal', id = 'INF-001') => ({ id, rarity, faction, variant });

test('v811 : force = rareté, +1 finition, +2 si la faction domine, +3 avec le Sceau', () => {
  assert.equal(CYCLE.length, 7);
  for (let i = 0; i < 7; i++) assert.ok(beats(CYCLE[i], CYCLE[(i + 1) % 7]));
  assert.ok(beats('primordial', 'infernal'));
  assert.ok(!beats('sauvage', 'infernal'));
  assert.equal(forceOf(C('R', 'infernal'), C('C', 'abyssal'), false), 3);
  assert.equal(forceOf(C('R', 'infernal', 'holo'), C('C', 'sauvage'), true), 3 + 1 + 2 + 3);
});

test('v811 : trois manches, Renfort après la 2e, le plus de manches gagnées l’emporte, cartes gagnantes gardées', () => {
  const hand = (f) => [C('C', f), C('PC', f), C('R', f), C('HR', f), C('M', f), C('S', f)];
  let st = newGame({ a: hand('infernal'), b: hand('abyssal') }, { a: [C('C', 'infernal'), C('C', 'infernal'), C('S', 'infernal')], b: [C('C', 'abyssal'), C('C', 'abyssal'), C('C', 'abyssal')] });
  st = apply(st, 'a', 5); // S
  assert.equal(st.turn, 'b');
  assert.throws(() => apply(st, 'a', 4), /déjà posée/);
  st = apply(st, 'b', 0); // C
  assert.equal(st.last.win, 'a'); assert.equal(st.r, 2);
  st = apply(st, 'b', 5, true); st = apply(st, 'a', 0); // S+3 contre C
  assert.equal(st.last.win, 'b'); assert.ok(st.seal.b);
  assert.throws(() => apply(st, 'b', 1, true), /impossible/, 'le Sceau ne sert qu’une fois');
  assert.ok(st.last.renfort); assert.equal(st.hand.a.length, 9);
  assert.throws(() => apply(st, 'a', 5), /impossible/, 'une carte jouée ne revient pas');
  st = apply(st, 'a', 8); st = apply(st, 'b', 1); // S du Renfort contre PC
  assert.ok(st.over); assert.equal(st.winner, 'a');
  assert.deepEqual(wonIdx(st, 'a'), [5, 8]);
  assert.deepEqual(wonIdx(st, 'b'), [5]);
});

test('v811 : de l’adversaire, on ne voit que faction et rareté (et pas sa carte posée)', () => {
  let st = newGame({ a: [C('R', 'celeste', 'gold', 'CEL-010')], b: [C('M', 'necrotique', 'holo', 'NEC-020'), C('C', 'sauvage')] }, { a: [], b: [] });
  st = apply(st, 'b', 0, true);
  const v = viewFor(st, 'a');
  assert.deepEqual(v.hand.b[0], { rarity: 'M', faction: 'necrotique', hid: true });
  assert.equal(v.pick.b, true);
  assert.equal(v.extra, undefined);
  assert.equal(v.hand.a[0].id, 'CEL-010');
});

test('v811 : l’IA de l’entraînement joue toujours une carte permise', () => {
  const pool = catalog.cards.slice(0, 40).map((c) => ({ id: c.id, rarity: c.rarity, faction: c.faction, variant: 'normal' }));
  let r = 1;
  const rng = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  for (let k = 0; k < 30; k++) {
    const pick = (n) => Array.from({ length: n }, () => pool[Math.floor(rng() * pool.length)]);
    let st = newGame({ a: pick(6), b: pick(6) }, { a: pick(3), b: pick(3) });
    while (!st.over) { const x = aiPick(st, 'a', rng), y = aiPick(st, 'b', rng); st = apply(apply(st, 'a', x.i, x.seal), 'b', y.i, y.seal); }
    assert.ok(['a', 'b', 'draw'].includes(st.winner));
  }
});

test('v811 : un jeton par jour jusqu’à 3, gagnés ailleurs jusqu’à 9, jamais achetés', () => {
  now = new Date('2026-11-02T10:00:00');
  const g = fresh();
  assert.equal(g.chocTokens().n, CHOC.tokensMax);
  g.chocSpend(); g.chocSpend(); g.chocSpend();
  assert.throws(() => g.chocSpend(), /Plus de jeton/);
  now = new Date('2026-11-03T10:00:00');
  assert.equal(g.chocTokens().n, 1);
  now = new Date('2026-11-10T10:00:00');
  assert.equal(g.chocTokens().n, CHOC.tokensMax, 'la réserve ne dépasse pas 3 avec les jetons du jour');
  g.grant({ chocTok: 20 });
  assert.equal(g.chocTokens().n, CHOC.tokensCap);
  for (const k of Object.keys(OPS)) assert.ok(!/^choc(Give|Spend|Apply)$/.test(k), 'jetons jamais donnés par le téléphone');
});

test('v811 : cartes gardées et copie prise ajoutées une seule fois, ligue et série', () => {
  now = new Date('2026-11-02T10:00:00');
  const g = fresh();
  const [a, b, c] = catalog.cards.filter((x) => x.rarity === 'R').slice(0, 3);
  const out = g.chocApply('m1', { result: 'win', cards: [{ id: a.id, variant: 'normal' }, { id: b.id, variant: 'holo' }], take: { id: c.id, variant: 'normal' }, foe: 'Bob' });
  assert.equal(out.cards.length, 2); assert.ok(out.take);
  assert.ok(g.entry(a.id) && g.entry(c.id));
  assert.equal(out.shards, CHOC.winShards);
  assert.equal(out.league.delta, 20);
  assert.equal(g.s.versus.trophies[c.id].f, 'Bob');
  assert.equal(g.chocApply('m1', { result: 'win', cards: [{ id: a.id }] }), null, 'une seule fois');
  const l = g.chocApply('m2', { result: 'lose', cards: [{ id: a.id }], take: { id: b.id } });
  assert.equal(l.take, null, 'le perdant ne prend rien');
  assert.equal(g.s.versus.streak, 0);
});

test('v811 : le Choc en ligne passe par le serveur de partie (jetons), jamais directement', () => {
  const sql = fs.readFileSync(new URL('../supabase/09-multijoueur.sql', import.meta.url), 'utf8');
  for (const f of ['choc_new(uuid, uuid, text)', 'choc_join(uuid, uuid)', 'choc_refunds(uuid)', 'choc_claim(uuid, uuid, int, int)']) assert.ok(sql.includes(`'${f}'`), f);
  assert.ok(sql.includes("execute format('grant execute on function public.%s to service_role', f)"));
  assert.ok(sql.includes("if m.game = 'choc' then raise exception 'Le Choc s’encaisse par le serveur de partie.'"));
  assert.ok(/if p_game is null or p_game not in \('encheres', 'cryptes'\)/.test(sql), 'mp_new refuse le Choc');
  assert.ok(sql.includes("return public.choc_view(st, me)"));
  for (const m of ['chocNew', 'chocJoin', 'chocRefund', 'chocClaim']) { assert.equal(OPS[m]?.net, true, m); assert.ok(ARGS[m], m); }
  const srv = fs.readFileSync(new URL('../serveur/partie.mjs', import.meta.url), 'utf8');
  assert.ok(/async chocNew\(c, g[^]*?g\.chocSpend\(\)/.test(srv));
});
