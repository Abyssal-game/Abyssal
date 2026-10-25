// v492 : salles 5 à 8 des trois mini-jeux (règles propres) et hauts faits (payés une fois, titre quand tous sont faits).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import * as PA from '../js/core/pacte.js';
import * as CR from '../js/core/cryptes.js';
import * as EN from '../js/core/encheres.js';

const catalog = loadCatalog();
const clock = () => new Date(2026, 9, 19, 12);

test('jeux : 8 salles par jeu, chacune avec un haut fait, et les nouvelles avec leur règle', () => {
  for (const M of [PA, CR, EN]) {
    assert.equal(M.TABLES.length, 8);
    for (const [i, t] of M.TABLES.entries()) { assert.ok(M.FEATS[t.key], t.key); if (i >= 4) assert.ok(t.rule, t.key); }
  }
});

test('pacte : règles des salles (but, cartes spéciales, aucune avance, pouvoirs des adversaires)', () => {
  const st = PA.newGame(catalog, { table: 'neant', seed: 3 });
  assert.equal(st.target, 70); assert.equal(st.scores.a, 0); /* v750 : plus d’avance donnée aux adversaires */
  assert.equal(st.deck.filter((c) => c.sp === 'sceau').length, 0);
  assert.equal(st.deck.filter((c) => c.sp === 'gardien').length, 5);
  assert.equal(PA.newGame(catalog, { table: 'minuit', seed: 3 }).target, 80);
  // v751 : pouvoirs annoncés (plus d’avance de points)
  const m = PA.newGame(catalog, { table: 'mammon', seed: 3 });
  assert.equal(m.scores.a, 0);
  const fs = [...new Set(m.deck.filter((c) => c.f).map((c) => c.f))];
  m.row = [{ f: fs[0], v: 7 }, { f: fs[1], v: 7 }, { f: fs[2], v: 3 }];
  const e1 = PA.stop(m); assert.equal(e1.gain, 15); assert.equal(e1.house, 2); assert.equal(m.scores.a, 2);
  const v = PA.newGame(catalog, { table: 'cendres', seed: 3 });
  v.turn = 'a'; v.row = [{ f: fs[0], v: 3 }]; v.deck.push({ f: fs[0], v: 2 });
  const e2 = PA.draw(v); assert.equal(e2.result, 'saved'); assert.ok(e2.prayer);
  v.row = [{ f: fs[0], v: 3 }]; v.deck.push({ f: fs[0], v: 2 });
  assert.equal(PA.draw(v).result, 'bust');
  const n = PA.newGame(catalog, { table: 'neant', seed: 3 });
  n.scores.p = 20; n.row = [{ f: fs[0], v: 3 }]; n.sceaux = 0; n.deck.push({ f: fs[0], v: 2 });
  const e3 = PA.draw(n); assert.equal(e3.result, 'bust'); assert.equal(e3.voidCost, 8); assert.equal(n.scores.p, 12);
});

test('cryptes : paires maudites (−1 point, pas de pouvoir) et crypte mouvante', () => {
  const st = CR.newGame(catalog, { table: 'tombeau', seed: 5 });
  assert.equal(st.curse.length, 2);
  const k = st.curse[0], [a, b] = st.cards.map((c, i) => (c.k === k ? i : -1)).filter((i) => i >= 0);
  CR.flip(st, a, () => 0.5); const ev = CR.flip(st, b, () => 0.5);
  assert.ok(ev.cursed); assert.equal(CR.scoreOf(st, 'p'), 0); assert.equal(st.pending, null);
  // une erreur : la main passe et deux cartes cachées échangent leur place
  const hid = CR.hidden(st), x = hid[0], y = hid.find((i) => st.cards[i].k !== st.cards[x].k);
  CR.flip(st, x, () => 0.5); const m = CR.flip(st, y, () => 0.5);
  assert.equal(m.kind, 'miss'); assert.equal(m.drift.length, 2);
});

test('enchères : lots propres aux salles (15 lots), familles à +10 aux lignées', () => {
  for (const t of EN.TABLES) assert.equal(EN.newGame(catalog, { table: t.key, seed: 9 }).lots.length, 15, t.key);
  const m = EN.newGame(catalog, { table: 'maudite', seed: 9 });
  assert.equal(m.lots.filter((l) => l.v < 0).length, 7);
  assert.equal(EN.newGame(catalog, { table: 'lignees', seed: 9 }).setBonus, 10);
});

test('hauts faits : payés une fois, titre quand tous sont faits', () => {
  const g = new Game(catalog, { storage: new MemoryStorage(), rng: rngFrom(7), clock });
  g.s.bossesBeaten.devoreur = 1;
  g.pacteStart({ table: 'novice' });
  let st = g.s.pacte.cur; st.over = 'won'; st.final = { scores: { p: 61, a: 10 } }; st.turns.p = 5;
  const out = g.pacteFinish();
  assert.equal(out.feat, PA.FEATS.novice.text); assert.ok(g.s.pacte.feats.novice);
  g.pacteQuit(); g.pacteStart({ table: 'novice' });
  st = g.s.pacte.cur; st.over = 'won'; st.final = { scores: { p: 61, a: 10 } }; st.turns.p = 5;
  assert.equal(g.pacteFinish().feat, undefined);
  for (const t of PA.TABLES) { g.s.pacte.beaten[t.key] = 1; if (t.key !== 'neant') g.s.pacte.feats[t.key] = 1; }
  g.pacteQuit(); g.pacteStart({ table: 'neant' });
  st = g.s.pacte.cur; st.over = 'won'; st.final = { scores: { p: 72, a: 50 } };
  const o2 = g.pacteFinish();
  assert.ok(g.s.titles.includes(PA.FEATS_TITLE)); assert.ok(o2.title.includes(PA.FEATS_TITLE));
});
