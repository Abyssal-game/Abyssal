// Duels des Sceaux : valeurs, captures, fin de partie, IA, récompenses plafonnées, sauvegarde.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import * as SC from '../js/core/sceaux.js';
import { migrate, defaultSave } from '../js/core/save.js';

const catalog = loadCatalog();
const ids = catalog.cards.map((c) => c.id);
const clock = () => new Date(2026, 9, 12, 12);
// Partie vide et contrôlée : mains fixées, règle classique, joueur qui commence
function game(first = 'p', rule = 'classique') {
  const st = SC.newGame(catalog, { hand: ids.slice(0, 5), rival: SC.RIVAL.initie, seed: 3 });
  st.rule = rule; st.cells = { blessed: null, cursed: null }; st.turn = first; st.first = first;
  st.hands.o = ids.slice(5, 10);
  return st;
}

test('valeurs : total 20 pour toute carte, de 1 à 10, stables', () => {
  for (const c of catalog.cards) {
    const v = SC.sideValues(c);
    assert.equal(v.reduce((a, b) => a + b, 0), 20, c.id);
    assert.ok(v.every((x) => x >= 1 && x <= 10));
    assert.deepEqual(SC.sideValues(c), v);
  }
  assert.equal(SC.showVal(10), 'A');
});

test('capture dans chacune des quatre directions, et pas à valeur égale', () => {
  for (let d = 0; d < 4; d++) {
    const cell = SC.neighbors(4)[(d + 2) % 4]; // case voisine du centre, dont le côté d regarde le centre
    for (const [want, flipped] of [[(v) => v > 5, true], [(v) => v === 5, false], [(v) => v < 5, false]]) {
      const st = game('p');
      st.board[4] = { id: ids[5], owner: 'o', vals: [5, 5, 5, 5] }; st.placed = 1;
      st.hands.p = [ids.find((id) => want(SC.sideValues(catalog.get(id))[d]))];
      const flips = SC.place(catalog, st, 'p', 0, cell);
      assert.equal(flips.length, flipped ? 1 : 0, `direction ${d}`);
      assert.equal(st.board[4].owner, flipped ? 'p' : 'o');
    }
  }
});

test('case prise, mauvais tour et carte absente sont refusés', () => {
  const st = game('p');
  SC.place(catalog, st, 'p', 0, 0);
  assert.throws(() => SC.place(catalog, st, 'p', 0, 1), /tour/);
  assert.throws(() => SC.place(catalog, st, 'o', 0, 0), /prise/);
  assert.throws(() => SC.place(catalog, st, 'o', 9, 1), /introuvable/);
  assert.throws(() => SC.place(catalog, st, 'o', 0, 9), /prise/);
});

test('la partie se termine après 9 poses ; le total compte la carte restée en main', () => {
  for (let seed = 0; seed < 30; seed++) {
    const st = game(seed % 2 ? 'p' : 'o');
    const rnd = rngFrom(seed);
    while (!st.over) { const m = SC.aiMove(catalog, st, 2, rnd); assert.ok(m, 'l’IA trouve toujours un coup'); SC.place(catalog, st, st.turn, m[0], m[1]); }
    assert.equal(st.placed, 9);
    assert.ok(st.board.every(Boolean));
    assert.equal(st.final.p + st.final.o, 10);
    assert.equal(st.over, st.final.p > 5 ? 'won' : st.final.p < 5 ? 'lost' : 'draw');
    assert.throws(() => SC.place(catalog, st, st.turn, 0, 0), /terminée/);
  }
});

test('règles spéciales : cases bénie / maudite, plateau instable, fraternité', () => {
  const st = game('p', 'sacre');
  st.cells = { blessed: 0, cursed: 8 };
  const id = st.hands.p[0], base = SC.sideValues(catalog.get(id));
  assert.deepEqual(SC.valuesOn(catalog, st, id, 0, 'p'), base.map((x) => Math.min(10, x + 1)));
  assert.deepEqual(SC.valuesOn(catalog, st, id, 8, 'p'), base.map((x) => Math.max(1, x - 1)));
  const ins = SC.newGame(catalog, { hand: ids.slice(0, 5), rival: { ...SC.RIVAL.initie, rule: 'instable' }, seed: 11 });
  const seen = new Set([JSON.stringify(ins.cells)]);
  const rnd = rngFrom('i');
  while (!ins.over) { const m = SC.aiMove(catalog, ins, 1, rnd); SC.place(catalog, ins, ins.turn, m[0], m[1]); seen.add(JSON.stringify(ins.cells)); if (ins.cells.blessed != null) assert.equal(ins.board[ins.cells.blessed], null); }
  assert.ok(seen.size >= 2, 'les cases bougent');
  const fr = catalog.cards.filter((c) => c.faction === 'infernal').slice(0, 5).map((c) => c.id);
  const f = SC.newGame(catalog, { hand: fr, rival: { ...SC.RIVAL.initie, rule: 'faction' }, seed: 1 });
  assert.equal(f.fac.p, 'infernal');
  const v = SC.valuesOn(catalog, f, fr[0], 4, 'p'), b = SC.sideValues(catalog.get(fr[0]));
  assert.equal(v.reduce((a, c) => a + c, 0), 21);
  assert.equal(Math.min(...v) >= Math.min(...b), true);
});

test('IA : les niveaux élevés battent les niveaux bas', () => {
  let hi = 0, lo = 0;
  for (let s = 0; s < 40; s++) {
    const st = game(s % 2 ? 'p' : 'o');
    const r = rngFrom(`ai${s}`);
    while (!st.over) { const lvl = st.turn === 'o' ? 4 : 1; const m = SC.aiMove(catalog, st, lvl, r); SC.place(catalog, st, st.turn, m[0], m[1]); }
    if (st.over === 'lost') hi++; else if (st.over === 'won') lo++;
  }
  assert.ok(hi > lo * 2, `niveau 4 : ${hi} victoires, niveau 1 : ${lo}`);
});

function play(g, rival) {
  g.sceauxStart(rival ? { rival } : { daily: true });
  const st = g.s.sceaux.cur, r = rngFrom('pl');
  while (!st.over) { if (st.turn === 'o') g.sceauxAi(); else { const m = SC.aiMove(catalog, st, 4, r); g.sceauxPlay(m[0], m[1]); } }
  return st;
}
function forceWin(g, rival) {
  const st = play(g, rival);
  st.over = 'won'; st.final = { p: 7, o: 3 };
  return g.sceauxFinish();
}

test('récompenses : jamais payées deux fois, plafond quotidien, déblocage dans l’ordre', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('sc'), clock });
  assert.throws(() => g.sceauxStart({ rival: 'collectionneur' }), /précédent/);
  const s0 = g.s.shards;
  const out = forceWin(g, 'initie');
  assert.ok(out.first);
  assert.equal(g.s.shards - s0, SC.SCEAUX_REWARD.firstWin + SC.RIVAL.initie.reward);
  assert.ok(g.s.titles.includes(SC.SCEAUX_TITLES.initie));
  const s1 = g.s.shards;
  assert.deepEqual(g.sceauxFinish(), out, 'la même partie ne paie pas deux fois');
  assert.equal(g.s.shards, s1);
  g.sceauxQuit();
  assert.doesNotThrow(() => g.sceauxStart({ rival: 'collectionneur' }));
  g.sceauxQuit();
  for (let k = 0; k < 8; k++) { forceWin(g, 'initie'); g.sceauxQuit(); }
  assert.equal(g.s.sceaux.paidToday, SC.SCEAUX_REWARD.dailyPaid);
  const s2 = g.s.shards;
  const capped = forceWin(g, 'initie');
  assert.ok(capped.capped);
  assert.equal(g.s.shards, s2);
  assert.equal(g.s.sceaux.wins, 10);
  assert.ok(g.s.sceaux.history.length <= 20);
});

test('défi du jour : une seule fois par jour, même adversaire pour la journée', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('dj'), clock });
  const d = g.sceauxDaily();
  assert.deepEqual(g.sceauxDaily(), d);
  const st = play(g);
  assert.equal(st.rival, d.rival);
  assert.equal(st.rule, d.rule);
  st.over = 'won'; st.final = { p: 6, o: 4 };
  const out = g.sceauxFinish();
  assert.ok(out.shards >= SC.SCEAUX_REWARD.daily);
  g.sceauxQuit();
  assert.throws(() => g.sceauxStart({ daily: true }), /déjà/);
});

test('main : 5 cartes possédées ou prêtées ; la partie en cours survit à un rechargement', () => {
  const storage = new MemoryStorage();
  const g = new Game(catalog, storage, { rng: rngFrom('mh'), clock });
  assert.equal(g.sceauxHand().length, 5);
  assert.throws(() => g.setSceauxHand(ids.slice(0, 4)), /5/);
  const own = ids.slice(20, 25); own.forEach((id) => g.addCard(id));
  assert.deepEqual(g.setSceauxHand(own), own);
  g.sceauxStart({ rival: 'initie' });
  if (g.s.sceaux.cur.turn === 'o') g.sceauxAi();
  g.sceauxPlay(0, g.s.sceaux.cur.board.findIndex((c) => !c));
  const placed = g.s.sceaux.cur.placed;
  const g2 = new Game(catalog, storage, { rng: rngFrom('mh2'), clock });
  assert.equal(g2.s.sceaux.cur.placed, placed);
  assert.deepEqual(g2.sceauxHand(), own);
  // sauvegarde ancienne (sans « sceaux ») : complétée sans erreur
  const old = defaultSave(); delete old.sceaux;
  const m = migrate(old);
  assert.equal(m.sceaux.wins, 0);
  assert.deepEqual(m.sceaux.beaten, {});
});
