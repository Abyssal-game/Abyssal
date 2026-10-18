// v425 : la Cour des Masques — donne, annonces, réponses, passe, Sceau de vérité, fin de partie, IA, récompenses.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import * as MQ from '../js/core/masques.js';

const catalog = loadCatalog();
const clock = () => new Date(2026, 9, 18, 12);

test('donne : 42 cartes, 6 par faction, 14 par joueur, illustration de la bonne faction', () => {
  const st = MQ.newGame(catalog, { table: 'antichambre', seed: 5 });
  assert.equal(st.deck.length, 42);
  for (const f of MQ.FACTIONS) assert.equal(st.deck.filter((c) => c.f === f).length, 6);
  for (const x of MQ.SEATS) assert.equal(st.hands[x].length, 14);
  assert.equal(new Set([...st.hands.p, ...st.hands.a, ...st.hands.b]).size, 42);
  assert.ok(st.deck.every((c) => catalog.get(c.id)?.faction === c.f));
  assert.deepEqual(MQ.newGame(catalog, { table: 'antichambre', seed: 5 }).hands, st.hands, 'même graine, même donne');
});

test('réponse juste : celui qui a donné garde la carte ; réponse fausse : celui qui a répondu la garde', () => {
  for (const [lie, sayTrue, taker] of [[false, true, 'p'], [false, false, 'a'], [true, false, 'p'], [true, true, 'a']]) {
    const st = MQ.newGame(null, { table: 'antichambre', seed: 9 }); st.turn = 'p';
    const card = st.hands.p[0], f = st.deck[card].f, claim = lie ? MQ.FACTIONS.find((x) => x !== f) : f;
    MQ.give(st, 'p', card, 'a', claim);
    assert.equal(st.hands.p.length, 13);
    const ev = MQ.answer(st, 'a', sayTrue);
    assert.equal(ev.taker, taker);
    assert.deepEqual(st.front[taker], [card]);
    assert.equal(st.turn, taker, 'celui qui garde la carte joue ensuite');
    assert.equal(st.claims.p.lies, lie ? 1 : 0);
  }
});

test('passe : seulement vers celui qui n’a pas vu la carte ; le dernier doit répondre', () => {
  const st = MQ.newGame(null, { table: 'antichambre', seed: 2 }); st.turn = 'a';
  const card = st.hands.a[0], f = st.deck[card].f;
  MQ.give(st, 'a', card, 'p', f);
  assert.deepEqual(MQ.passTargets(st), ['b']);
  assert.throws(() => MQ.pass(st, 'p', 'a', f), /déjà vu/);
  MQ.pass(st, 'p', 'b', MQ.FACTIONS.find((x) => x !== f));
  assert.deepEqual(MQ.passTargets(st), []);
  const ev = MQ.answer(st, 'b', false); /* p a menti en passant : b voit juste, p garde la carte */
  assert.equal(ev.taker, 'p');
  assert.equal(st.claims.a.lies, 0); assert.equal(st.claims.p.lies, 1);
});

test('Sceau de vérité : une fois par partie, seulement sur une carte reçue', () => {
  const st = MQ.newGame(null, { table: 'antichambre', seed: 4 }); st.turn = 'a';
  assert.throws(() => MQ.peek(st));
  MQ.give(st, 'a', st.hands.a[0], 'p', 'infernal');
  assert.equal(MQ.peek(st), st.deck[st.pending.card].f);
  assert.equal(st.seals.p, 0);
  MQ.answer(st, 'p', true);
  st.turn = 'b'; MQ.give(st, 'b', st.hands.b[0], 'p', 'infernal');
  assert.throws(() => MQ.peek(st), /déjà servi/);
});

test('défaite : 4 cartes d’une même faction devant soi, ou plus de carte quand vient son tour', () => {
  const st = MQ.newGame(null, { table: 'antichambre', seed: 7 }); st.turn = 'a';
  const f = 'infernal', mine = st.deck.map((c, i) => i).filter((i) => st.deck[i].f === f);
  st.front.p = mine.slice(0, 3); st.hands.a = [mine[3]]; st.hands.p = st.hands.p.filter((c) => !mine.includes(c)); st.hands.b = st.hands.b.filter((c) => !mine.includes(c));
  MQ.give(st, 'a', mine[3], 'p', f);
  MQ.answer(st, 'p', false);
  assert.equal(st.over, 'lost'); assert.equal(st.loser, 'p'); assert.equal(st.why, 'four');
  const s2 = MQ.newGame(null, { table: 'antichambre', seed: 7 }); s2.turn = 'p'; s2.hands.a = [];
  const c = s2.hands.p[0]; MQ.give(s2, 'p', c, 'a', s2.deck[c].f === 'infernal' ? 'abyssal' : 'infernal');
  MQ.answer(s2, 'a', true); /* a se trompe : il garde la carte et doit jouer, sans main */
  assert.equal(s2.over, 'won'); assert.equal(s2.why, 'empty');
});

test('IA : parties complètes sans erreur, et les tables difficiles sont plus dures', () => {
  const rate = (table) => {
    let w = 0; const N = 300, P = { lie: 0.45, skill: 2, pass: 0.3 }, r = rngFrom(`mq${table}`);
    for (let i = 0; i < N; i++) {
      const st = MQ.newGame(null, { table, seed: i + 1 }); let n = 0;
      while (!st.over && n++ < 400) {
        const p = st.pending;
        if (p && p.to === 'p') { const d = MQ.aiReceive(st, 'p', P, r); if (d.act === 'pass') MQ.pass(st, 'p', d.to, d.claim); else MQ.answer(st, 'p', d.sayTrue); }
        else if (!p && st.turn === 'p') { const d = MQ.aiGive(st, 'p', P, r); MQ.give(st, 'p', d.card, d.to, d.claim); }
        else MQ.aiStep(st, r);
      }
      assert.ok(st.over, 'la partie se termine');
      if (st.over === 'won') w++;
    }
    return w / N;
  };
  const a = rate('antichambre'), t = rate('trone');
  assert.ok(a > t + 0.2, `Antichambre ${a}, Trône ${t}`);
});

function finished(g, table, result) {
  g.masquesStart(table ? { table } : { daily: true });
  const st = g.s.masques.cur; st.over = result; st.loser = result === 'won' ? 'a' : 'p';
  return g.masquesFinish();
}
test('récompenses : coffre et bonus de première victoire une fois, déblocage dans l’ordre, défi du jour', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('mq'), clock });
  assert.throws(() => g.masquesStart({ table: 'antichambre' }), /gardien/);
  g.s.bossesBeaten.devoreur = 1;
  assert.throws(() => g.masquesStart({ table: 'miroirs' }), /précédente/);
  assert.throws(() => g.masquesStart({ daily: true }), /Antichambre/);
  const before = g.s.shards, bois = g.s.chests.bois || 0;
  const o = finished(g, 'antichambre', 'won');
  assert.equal(o.first, true); assert.deepEqual(o.chests, ['bois']);
  assert.equal(g.s.shards - before, MQ.MASQUES_REWARD.firstWin + MQ.TABLE.antichambre.reward);
  assert.equal(g.s.chests.bois, bois + 1);
  assert.equal(g.masquesFinish(), o, 'jamais payée deux fois');
  g.masquesQuit();
  const o2 = finished(g, 'antichambre', 'won'); assert.equal(o2.first, false); assert.deepEqual(o2.chests, []);
  g.masquesQuit();
  assert.doesNotThrow(() => g.masquesStart({ table: 'miroirs' })); g.masquesQuit();
  const d = finished(g, null, 'won'); assert.ok(d.chests.includes('bois')); g.masquesQuit();
  assert.throws(() => g.masquesStart({ daily: true }), /déjà/);
  const l = finished(g, 'antichambre', 'lost'); assert.equal(l.shards, 0); assert.equal(g.s.masques.losses, 1);
});

test('regarder pour passer : plus le droit de répondre ensuite', () => {
  const st = MQ.newGame(null, { table: 'antichambre', seed: 11 }); st.turn = 'a';
  MQ.give(st, 'a', st.hands.a[0], 'p', 'celeste');
  MQ.look(st, 'p');
  assert.throws(() => MQ.answer(st, 'p', true), /passe-la/);
  MQ.pass(st, 'p', 'b', 'celeste');
  assert.throws(() => MQ.look(st, 'b'), /réponds/);
  assert.doesNotThrow(() => MQ.answer(st, 'b', true));
});
