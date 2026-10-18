// v450 : Les Cryptes (paires, main qui passe, pouvoirs des factions, fin, récompenses).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import * as CR from '../js/core/cryptes.js';

const catalog = loadCatalog();
const clock = () => new Date(2026, 9, 18, 12);
const pos = (st, k) => st.cards.map((c, i) => (c.k === k && !c.gone ? i : -1)).filter((i) => i >= 0);
const pairOf = (st, f) => st.cards.find((c) => c.f === f && !c.gone).k;
const rng0 = () => 0.5;

test('cryptes : 20 cartes, 10 paires, les 7 factions, une créature de la bonne faction par paire', () => {
  const st = CR.newGame(catalog, { table: 'ossuaire', seed: 4 });
  assert.equal(st.cards.length, 20);
  const ks = {}; st.cards.forEach((c) => { ks[c.k] = (ks[c.k] || 0) + 1; });
  assert.equal(Object.keys(ks).length, 10); assert.ok(Object.values(ks).every((n) => n === 2));
  assert.equal(new Set(st.cards.map((c) => c.f)).size, 7);
  assert.ok(st.cards.every((c) => catalog.get(c.id)?.faction === c.f));
});

test('cryptes : une paire se garde et on rejoue ; une erreur passe la main', () => {
  const st = CR.newGame(null, { table: 'ossuaire', seed: 1 });
  const k = pairOf(st, 'primordial'), [a, b] = pos(st, k);
  CR.flip(st, a, rng0); const ev = CR.flip(st, b, rng0);
  assert.equal(ev.kind, 'match'); assert.equal(st.turn, 'p'); assert.equal(CR.scoreOf(st, 'p'), 2, 'paire + 1 (Primordial)');
  const h = CR.hidden(st), x = h[0], y = h.find((i) => st.cards[i].k !== st.cards[x].k);
  const m = (CR.flip(st, x, rng0), CR.flip(st, y, rng0));
  assert.equal(m.kind, 'miss'); assert.equal(st.turn, 'a');
});

test('cryptes : Céleste garde la main après une erreur ; Artificiel bloque le pouvoir suivant ; Nécrotique vole une paire', () => {
  const st = CR.newGame(null, { table: 'ossuaire', seed: 2 });
  let [a, b] = pos(st, pairOf(st, 'celeste')); CR.flip(st, a, rng0); CR.flip(st, b, rng0);
  assert.equal(st.grace.p, 1);
  const h = CR.hidden(st), x = h[0], y = h.find((i) => st.cards[i].k !== st.cards[x].k);
  CR.flip(st, x, rng0); const m = CR.flip(st, y, rng0);
  assert.ok(m.graced); assert.equal(st.turn, 'p');
  [a, b] = pos(st, pairOf(st, 'artificiel')); CR.flip(st, a, rng0); CR.flip(st, b, rng0);
  assert.ok(st.block.a);
  st.turn = 'a';
  [a, b] = pos(st, pairOf(st, 'necrotique')); CR.flip(st, a, rng0); const n = CR.flip(st, b, rng0);
  assert.ok(n.blocked, 'pouvoir adverse bloqué'); assert.equal(st.pairs.p.length, 2, 'rien volé');
  const extra = st.cards.find((c) => c.f === 'necrotique' && !c.gone);
  if (extra) { [a, b] = pos(st, extra.k); CR.flip(st, a, rng0); const s2 = CR.flip(st, b, rng0); assert.equal(s2.stolen, st.pairs.a.at(-1)); assert.equal(st.pairs.p.length, 1); }
});

test('cryptes : Infernal, Sauvage et Abyssal demandent de choisir des cartes face cachée ; l’échange déplace les cartes', () => {
  const st = CR.newGame(null, { table: 'ossuaire', seed: 3 });
  let [a, b] = pos(st, pairOf(st, 'abyssal')); CR.flip(st, a, rng0); CR.flip(st, b, rng0);
  assert.equal(st.pending.power, 'abyssal');
  assert.throws(() => CR.flip(st, CR.hidden(st)[0], rng0), /pouvoir/);
  const [x, y] = CR.hidden(st); const kx = st.cards[x].k, ky = st.cards[y].k;
  CR.usePower(st, [x, y], rng0);
  assert.equal(st.cards[x].k, ky); assert.equal(st.cards[y].k, kx); assert.equal(st.pending, null);
  [a, b] = pos(st, pairOf(st, 'infernal')); CR.flip(st, a, rng0); CR.flip(st, b, rng0);
  const ev = CR.usePower(st, [CR.hidden(st)[0]], rng0);
  assert.ok(ev.card && ev.card.f);
});

test('cryptes : la partie se termine toujours, et l’adversaire joue seul contre chaque table', () => {
  let r = 9; const rng = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  for (const T of CR.TABLES) for (let n = 0; n < 40; n++) {
    const st = CR.newGame(catalog, { table: T.key, seed: n });
    let g = 0;
    while (!st.over && g++ < 2000) {
      if (st.turn === 'a') CR.flip(st, CR.aiPick(st, rng), rng);
      else if (st.pending) CR.usePower(st, CR.hidden(st).slice(0, st.pending.pick), rng);
      else CR.flip(st, CR.hidden(st)[Math.floor(rng() * CR.hidden(st).length)], rng);
    }
    assert.ok(st.over);
    assert.equal(st.final.scores.p + st.final.scores.a, 10 + st.bonus.p + st.bonus.a);
  }
});

test('cryptes : récompenses et ouverture de la crypte suivante', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('cr'), clock });
  assert.throws(() => g.cryptesStart({ table: 'ossuaire' }), /premier gardien/);
  g.s.bossesBeaten.devoreur = 1;
  assert.throws(() => g.cryptesStart({ table: 'chapelle' }), /précédente/);
  g.cryptesStart({ table: 'ossuaire' });
  const st = g.s.cryptes.cur; st.over = 'won'; st.final = { scores: { p: 6, a: 4 } };
  const before = g.s.shards; const out = g.cryptesFinish();
  assert.ok(out.first); assert.equal(g.s.shards - before, CR.CRYPTES_REWARD.firstWin + CR.TABLE.ossuaire.reward);
  assert.ok(CR.tableUnlocked(g.s, 1)); assert.ok(g.cryptesDailyOpen());
});
