// v310 : corrections issues de l'audit du moteur (sauvegarde illisible, cartes inconnues, fin de combat, trophée…)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { SAVE_KEY, SAVE_BACKUP_KEY } from '../js/config.js';
import { defaultSave, SAVE_STASH_KEY } from '../js/core/save.js';
import * as SC from '../js/core/sceaux.js';

const catalog = loadCatalog();
const clock = () => new Date(2026, 9, 15, 12);

test('une sauvegarde illisible est mise de côté (jamais écrasée), puis restaurée dès qu’elle redevient lisible', () => {
  const st = new MemoryStorage();
  const real = defaultSave(); real.shards = 12345; real.collection = { 'INF-001': { n: 3, v: { normal: 3 }, lv: 5, first: 1, isNew: false } };
  const future = { ...real, version: 999 }; // écrite par une version plus récente
  st.setItem(SAVE_KEY, JSON.stringify(future)); st.setItem(SAVE_BACKUP_KEY, JSON.stringify(future));
  const g = new Game(catalog, st, { rng: rngFrom('a'), clock });
  assert.equal(g.unreadable, true);
  g.claimDaily?.(); g.persist();
  assert.ok(st.getItem(SAVE_STASH_KEY).includes('12345'), 'la vraie partie est gardée de côté');
  // la version du jeu sait maintenant la lire (simulé : on remet une version connue dans la copie gardée)
  st.setItem(SAVE_STASH_KEY, JSON.stringify(real));
  const g2 = new Game(catalog, st, { rng: rngFrom('b'), clock });
  assert.equal(g2.restoredStash, true);
  assert.equal(g2.s.shards, 12345);
  assert.equal(st.getItem(SAVE_STASH_KEY), null);
  assert.ok(st.getItem(SAVE_KEY).includes('12345'));
});

test('une carte inconnue (version plus récente) dans la collection ne bloque rien et n’est pas supprimée', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('c'), clock });
  g.s.collection['ZZZ-999'] = { n: 3, v: { normal: 3 }, lv: 2, first: 1, isNew: false };
  g.s.ash = 500;
  assert.doesNotThrow(() => g.checkProgress());
  assert.doesNotThrow(() => g.burnSpares());
  assert.equal(g.upgradeCost('ZZZ-999'), 0);
  assert.equal(g.s.collection['ZZZ-999'].n, 3, 'gardée telle quelle');
  assert.doesNotThrow(() => g.openBooster('standard'));
});

test('Sceaux : ta propre carte posée ne t’est jamais proposée comme trophée', () => {
  const X = catalog.cards.find((c) => c.rarity === 'C').id;
  const st = SC.newGame(catalog, { hand: [X, ...SC.autoHand(catalog, []).slice(0, 4)], rival: 'initie', seed: 1 });
  st.oppHand = [X]; st.hands.o = [];
  st.board = Array(9).fill(null);
  st.board[0] = { id: X, owner: 'p', from: 'p', vals: [5, 5, 5, 5] };
  st.over = 'won';
  assert.deepEqual(SC.trophyChoices(catalog, st), []);
  st.board[8] = { id: X, owner: 'p', from: 'o', vals: [5, 5, 5, 5] }; // capturée à l'adversaire
  assert.deepEqual(SC.trophyChoices(catalog, st), [X]);
});
