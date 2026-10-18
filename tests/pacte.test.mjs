// v449 : Le Pacte (paquet, brisure, Sceau, Gardien, Offrande, sept factions, fin à tours égaux, récompenses).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import * as PA from '../js/core/pacte.js';

const catalog = loadCatalog();
const clock = () => new Date(2026, 9, 18, 12);
const F = (f, v) => ({ f, v, id: null });

test('pacte : 58 cartes (7 factions × 1 à 7, 3 Sceaux, 3 Gardiens, 3 Offrandes), illustrations de la bonne faction', () => {
  const st = PA.newGame(catalog, { table: 'novice', seed: 5 });
  assert.equal(st.deck.length, 58);
  assert.equal(st.deck.filter((c) => c.f).length, 49);
  for (const k of ['sceau', 'gardien', 'offrande']) assert.equal(st.deck.filter((c) => c.sp === k).length, 3);
  assert.ok(st.deck.filter((c) => c.f).every((c) => catalog.get(c.id)?.faction === c.f));
  assert.deepEqual(PA.newGame(catalog, { table: 'novice', seed: 5 }).deck.map((c) => c.id || c.sp), st.deck.map((c) => c.id || c.sp), 'même graine, même paquet');
});

test('pacte : une faction en double brise le pacte et fait perdre le tour ; s’arrêter encaisse', () => {
  const st = PA.newGame(null, { table: 'novice', seed: 1 });
  st.deck.push(F('infernal', 2), F('celeste', 6), F('infernal', 5)); // tirées dans l'ordre inverse (pile)
  PA.draw(st); PA.draw(st);
  assert.equal(PA.rowValue(st), 11);
  assert.ok(PA.bustChance(st) > 0);
  const ev = PA.draw(st);
  assert.equal(ev.result, 'bust'); assert.equal(ev.lost, 11);
  assert.equal(st.scores.p, 0); assert.equal(st.turn, 'a'); assert.equal(st.row.length, 0);
  st.deck.push(F('sauvage', 4), F('abyssal', 3));
  PA.draw(st); PA.draw(st);
  const s = PA.stop(st);
  assert.equal(s.gain, 7); assert.equal(st.scores.a, 7); assert.equal(st.turn, 'p'); assert.equal(st.round, 2);
});

test('pacte : le Sceau protège d’une brisure, le Gardien force l’arrêt, l’Offrande double la carte suivante', () => {
  const st = PA.newGame(null, { table: 'novice', seed: 2 });
  st.deck.push(F('infernal', 7), { sp: 'sceau' }, F('infernal', 3));
  PA.draw(st); PA.draw(st);
  const ev = PA.draw(st);
  assert.equal(ev.result, 'saved'); assert.equal(st.sceaux, 0); assert.equal(PA.rowValue(st), 3, 'le double est jeté, le pacte tient');
  st.deck.push(F('celeste', 4), { sp: 'offrande' });
  PA.draw(st); PA.draw(st);
  assert.equal(PA.rowValue(st), 11, '3 + 4 × 2');
  st.deck.push({ sp: 'gardien' });
  const f = PA.draw(st);
  assert.equal(f.result, 'forced'); assert.equal(st.scores.p, 11); assert.equal(st.turn, 'a');
});

test('pacte : les sept factions dans un tour donnent +15 et arrêtent le tour', () => {
  const st = PA.newGame(null, { table: 'novice', seed: 3 });
  ['infernal', 'abyssal', 'celeste', 'sauvage', 'necrotique', 'primordial', 'artificiel'].forEach((f) => st.deck.push(F(f, 1)));
  let ev;
  for (let i = 0; i < 7; i++) ev = PA.draw(st);
  assert.equal(ev.result, 'seven'); assert.equal(st.scores.p, 7 + PA.SEVEN_BONUS); assert.equal(st.turn, 'a');
});

test('pacte : la partie se termine à tours égaux, toujours, contre chaque adversaire', () => {
  let r = 7; const rng = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  for (const T of PA.TABLES) for (let i = 0; i < 60; i++) {
    const st = PA.newGame(catalog, { table: T.key, seed: i });
    let n = 0;
    while (!st.over && n++ < 3000) { if (st.turn === 'p') { if (!st.row.some((c) => c.f) || PA.bustChance(st) < 0.3) PA.draw(st); else PA.stop(st); } else PA.aiTurn(st, rng); }
    assert.ok(st.over, 'partie finie');
    assert.equal(st.turns.p, st.turns.a, 'autant de tours pour chacun');
    assert.ok(Math.max(st.scores.p, st.scores.a) >= PA.TARGET);
    assert.equal(st.over === 'won', st.scores.p > st.scores.a);
  }
});

test('pacte : récompenses (1re victoire, coffre, pacte suivant ouvert) et Salle des jeux fermée avant le premier gardien', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('pa'), clock });
  assert.throws(() => g.pacteStart({ table: 'novice' }), /premier gardien/);
  g.s.bossesBeaten.devoreur = 1;
  assert.throws(() => g.pacteStart({ table: 'six' }), /précédent/);
  g.pacteStart({ table: 'novice' });
  const st = g.s.pacte.cur;
  st.over = 'won'; st.final = { scores: { p: 61, a: 40 } };
  const before = g.s.shards, chests = g.s.chests.bois || 0;
  const out = g.pacteFinish();
  assert.ok(out.first); assert.equal(g.s.shards - before, PA.PACTE_REWARD.firstWin + PA.TABLE.novice.reward);
  assert.equal(g.s.chests.bois, chests + 1);
  assert.ok(PA.tableUnlocked(g.s, 1)); assert.ok(g.pacteDailyOpen());
  assert.equal(g.pacteFinish(), out, 'pas de double récompense');
});
