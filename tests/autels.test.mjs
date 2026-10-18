// v451 : Les Trois Autels (grimoire, Ferveur, coûts, rôles à la pose, effets des autels, fin, récompenses).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import * as AU from '../js/core/autels.js';
import { roleOf } from '../js/core/army.js';

const catalog = loadCatalog();
const clock = () => new Date(2026, 9, 18, 12);
const byRole = (role, r = 'C') => catalog.cards.find((c) => c.rarity === r && roleOf(c) === role).id;
// partie test : autels neutres choisis, mains imposées
function setup(altars = ['silence', 'humble', 'etroit']) {
  const st = AU.newGame(catalog, { table: 'parvis', seed: 1 });
  st.altars = altars;
  return st;
}
function give(st, x, ids) { ids.forEach((id) => { st.info[id] = AU.cardInfo(catalog, id); }); st.hands[x] = ids.slice(); }

test('autels : grimoire de 12 cartes selon la courbe, 3 autels différents, 3 cartes en main + 1 au premier tour', () => {
  const st = AU.newGame(catalog, { table: 'parvis', seed: 7 });
  assert.equal(new Set(st.altars).size, 3);
  assert.equal(st.hands.p.length, 4); assert.equal(st.decks.p.length, 8);
  assert.equal(st.turn, 1); assert.equal(st.energy.p, 1);
  const deck = AU.buildDeck(catalog, catalog.cards.map((c) => c.id), () => 0.3);
  assert.deepEqual(deck.map((id) => catalog.get(id).rarity), AU.CURVE);
});

test('autels : la Ferveur limite les poses, un autel étroit n’accepte que deux cartes', () => {
  const st = setup(['etroit', 'humble', 'givre']);
  const c1 = byRole('degats'), c2 = catalog.cards.filter((c) => c.rarity === 'C' && roleOf(c) === 'degats')[1].id, r = catalog.cards.find((c) => c.rarity === 'R').id;
  give(st, 'p', [c1, c2, r]);
  assert.match(AU.checkPlays(st, 'p', [{ id: c1, a: 0 }, { id: c2, a: 0 }]), /Ferveur/);
  st.energy.p = 9;
  st.board.p[0].push({ id: 'x', f: 'infernal', base: 2, mod: 0 });
  assert.match(AU.checkPlays(st, 'p', [{ id: c1, a: 0 }, { id: c2, a: 0 }]), /plein/);
  assert.equal(AU.checkPlays(st, 'p', [{ id: c1, a: 0 }, { id: c2, a: 1 }]), null);
});

test('autels : rôles à la pose (Protecteur, Empoisonneur, Entraveur, Fléau, Soutien) et autels (humbles, Silence)', () => {
  const st = setup(['aube', 'humble', 'silence']);
  st.energy.p = st.energy.a = 9;
  const att = byRole('degats'), pro = byRole('protecteur'), poi = byRole('poison'), ctl = byRole('controle'), zon = byRole('zone', catalog.cards.some((c) => c.rarity === 'C' && roleOf(c) === 'zone') ? 'C' : 'PC'), sou = byRole('soutien', catalog.cards.some((c) => c.rarity === 'C' && roleOf(c) === 'soutien') ? 'C' : 'PC');
  give(st, 'p', [att, pro, ctl]); give(st, 'a', [poi, zon, sou]);
  AU.playTurn(st, [{ id: att, a: 0 }, { id: pro, a: 0 }, { id: ctl, a: 1 }], [{ id: poi, a: 0 }, { id: zon, a: 2 }, { id: sou, a: 1 }]);
  const [c, p] = st.board.p[0];
  assert.equal(AU.powerOf(c), 2 + 2 + 2 - 1, 'aube +2, Protecteur +2, poison −1');
  assert.equal(AU.powerOf(p), 2 + 2 - 1, 'aube +2, poison −1');
  const so = st.board.a[1][0];
  assert.equal(so.mod, 2 - 2, 'humbles +2, Entraveur −2 sur la carte adverse suivante');
  assert.equal(st.board.a[2][0].mod, 0, 'au Silence, le Fléau n’agit pas');
  assert.equal(st.turn, 2); assert.equal(st.energy.a, 3, 'Soutien : +1 Ferveur au tour suivant');
});

test('autels : six tours, deux autels sur trois, l’adversaire joue toujours un coup valide', () => {
  let r = 11; const rng = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  for (const T of AU.TABLES) for (let n = 0; n < 15; n++) {
    const st = AU.newGame(catalog, { table: T.key, seed: n * 13 + 1 });
    while (!st.over) AU.playTurn(st, AU.choosePlays(st, 'p', rng, { noise: 1, greed: 1 }), AU.choosePlays(st, 'a', rng));
    assert.equal(st.turn, AU.TURNS);
    const w = st.final.winners;
    assert.equal(st.over === 'won', w.filter((x) => x === 'p').length > w.filter((x) => x === 'a').length);
    for (const x of ['p', 'a']) for (let a = 0; a < 3; a++) assert.ok(st.board[x][a].length <= AU.cap(st, a));
  }
});

test('autels : grimoire tiré de la collection, récompenses, autel suivant ouvert', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('au'), clock });
  assert.throws(() => g.autelsStart({ table: 'parvis' }), /premier gardien/);
  g.s.bossesBeaten.devoreur = 1;
  catalog.cards.slice(0, 40).forEach((c) => g.addCard(c.id));
  const deck = g.autelsDeck(true);
  assert.equal(deck.length, 12);
  assert.ok(deck.every((id) => g.s.collection[id] || g.s.autels.lent.includes(id)));
  g.autelsStart({ table: 'parvis' });
  const st = g.s.autels.cur;
  assert.ok([...st.hands.p, ...st.decks.p].every((id) => deck.includes(id)));
  st.over = 'won'; st.final = { winners: ['p', 'p', 'a'], altars: [], total: {} };
  const out = g.autelsFinish();
  assert.ok(out.first); assert.equal(out.shards, AU.AUTELS_REWARD.firstWin + AU.TABLE.parvis.reward, '(les succès débloqués par les 40 cartes ajoutent leurs propres éclats)');
  assert.ok(AU.tableUnlocked(g.s, 1));
});
