// v407 : Épreuves du jour — trois combats par jour réglés sur la force du joueur, une récompense par victoire.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game, TRIALS } from '../js/core/game.js';

const catalog = loadCatalog();
let now = new Date(2026, 9, 18, 12);
const mk = (seed) => noWelcome(new Game(catalog, new MemoryStorage(), { rng: rngFrom(seed), clock: () => now }));
const win = (g) => { const st = g.trials().battle; Object.values(st.units).forEach((u) => { if (u.side === 'enemy') u.hp = 0; }); st.over = 'won'; return g.finishTrial(); };

test('trois Épreuves par jour, une seule tentative chacune, récompense à la victoire', () => {
  const g = mk('ep');
  g.team();
  assert.equal(TRIALS.length, 3);
  assert.equal(g.trialInfo(2).room, 'elite', 'sans gardien vaincu, la 3e Épreuve est une élite');
  g.s.bossesBeaten.devoreur = 1;
  assert.equal(g.trialInfo(2).room, 'boss');
  const ch0 = g.chestCount(), sh0 = g.s.shards;
  g.startTrial(0);
  assert.throws(() => g.startTrial(1), /en cours/);
  const out = win(g);
  assert.equal(out.won, true);
  assert.ok(out.points >= 100);
  assert.equal(g.chestCount(), ch0 + 1);
  assert.ok(g.s.shards > sh0);
  assert.throws(() => g.startTrial(0), /déjà jouée/);
  g.startTrial(2);
  assert.equal(g.trials().battle.bossKey, 'devoreur');
  const lost = g.abandonTrial();
  assert.equal(lost.won, false);
  assert.deepEqual(g.trials().done, ['won', null, 'lost']);
  assert.equal(g.season().best, 1, 'une victoire du mois');
  // le lendemain, tout revient
  now = new Date(2026, 9, 19, 12);
  assert.deepEqual(g.trials().done, [null, null, null]);
  now = new Date(2026, 9, 18, 12);
});

test('la difficulté suit les meilleures cartes, pas l’équipe choisie', () => {
  const g = mk('ep2');
  g.team();
  const f0 = g.trialFloor(0);
  const strong = catalog.cards.filter((c) => c.rarity === 'HR').slice(0, 5).map((c) => c.id);
  strong.forEach((id) => { g.addCard(id); g.s.collection[id].lv = 8; });
  assert.ok(g.trialFloor(0) > f0 + 5, 'des cartes fortes dans la collection rendent les Épreuves plus dures, même hors de l’équipe');
});

test('les ennemis du jour sont les mêmes pour tout le monde (à la force de chacun)', () => {
  const a = mk('a'), b = mk('b');
  a.team(); b.team();
  a.startTrial(1); b.startTrial(1);
  const ids = (g) => Object.values(g.trials().battle.units).filter((u) => u.side === 'enemy').map((u) => u.id).sort();
  assert.deepEqual(ids(a), ids(b));
});
