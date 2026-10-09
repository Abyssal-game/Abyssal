import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, rngFrom } from './helpers.mjs';
import { createDuel, play, attack, endTurn, canAttack, targets, RULES } from '../js/combat/engine.js';
import { playTurn } from '../js/combat/ai.js';

const catalog = loadCatalog();
const fake = (id, faction, stats, abilities = []) => ({ id, name: id, faction, rarity: 'C', abilities, stats: { atk: 2, def: 0, spd: 3, mag: 0, hp: 4, cost: 1, ...stats } });

function duelWith(cards, deckA, deckB) {
  return createDuel({ decks: [deckA, deckB], cards, rng: rngFrom('duel') });
}

test('mise en place : mains, mana, premier tour', () => {
  const cards = [fake('A', 'sauvage', {}), fake('B', 'infernal', {})];
  const s = duelWith(cards, Array(15).fill('A'), Array(15).fill('B'));
  assert.equal(s.active, 0);
  assert.equal(s.players[0].hand.length, RULES.startHand + 1);
  assert.equal(s.players[1].hand.length, RULES.startHand + 1);
  assert.equal(s.players[0].mana, 1);
});

test('invocation, mal d’invocation, Charge et attaque du héros', () => {
  const cards = [fake('A', 'necrotique', { cost: 1 }), fake('C', 'necrotique', { cost: 1, atk: 3 }, [{ key: 'charge' }])];
  let s = duelWith(cards, ['A', 'C', 'A', 'A', 'A', 'A'], Array(6).fill('A'));
  const iA = s.players[0].hand.indexOf('A');
  s = play(s, 0, iA);
  const u = s.players[0].board[0];
  assert.equal(canAttack(s, 0, u.uid), false);
  s = endTurn(s, 0); s = endTurn(s, 1);
  const iC = s.players[0].hand.indexOf('C');
  s = play(s, 0, iC);
  const c = s.players[0].board.find((x) => x.id === 'C');
  assert.equal(canAttack(s, 0, c.uid), true);
  const hp = s.players[1].hp;
  s = attack(s, 0, c.uid, 'hero');
  assert.equal(s.players[1].hp, hp - 3);
});

test('Gardien oblige à le cibler ; Égide absorbe le premier coup', () => {
  const cards = [fake('G', 'artificiel', { cost: 1, hp: 3 }, [{ key: 'guard' }, { key: 'aegis' }]), fake('X', 'sauvage', { cost: 1, atk: 4 }, [{ key: 'charge' }])];
  let s = duelWith(cards, Array(8).fill('X'), Array(8).fill('G'));
  s = endTurn(s, 0);
  s = play(s, 1, 0);
  s = endTurn(s, 1);
  s = play(s, 0, 0);
  const x = s.players[0].board[0];
  const g = s.players[1].board[0];
  assert.deepEqual(targets(s, 0, x.uid), [g.uid]);
  assert.throws(() => attack(s, 0, x.uid, 'hero'));
  s = attack(s, 0, x.uid, g.uid);
  const g2 = s.players[1].board[0];
  assert.equal(g2.hp, 3, 'l’Égide annule les dégâts');
  assert.equal(g2.aegis, false);
});

test('Première frappe : pas de riposte si la cible meurt', () => {
  const cards = [fake('F', 'celeste', { cost: 1, atk: 5, hp: 2 }, [{ key: 'charge' }, { key: 'first' }]), fake('D', 'infernal', { cost: 1, atk: 9, hp: 3 })];
  let s = duelWith(cards, Array(8).fill('F'), Array(8).fill('D'));
  s = endTurn(s, 0); s = play(s, 1, 0); s = endTurn(s, 1);
  s = play(s, 0, 0);
  const f = s.players[0].board[0], d = s.players[1].board[0];
  s = attack(s, 0, f.uid, d.uid);
  assert.equal(s.players[1].board.length, 0);
  assert.equal(s.players[0].board[0].hp, 2);
});

test('Dernier souffle et Reliquat', () => {
  const cards = [fake('K', 'sauvage', { cost: 1, atk: 6 }, [{ key: 'charge' }]), fake('R', 'necrotique', { cost: 1, atk: 1, hp: 2 }, [{ key: 'relic' }, { key: 'death', value: 1 }])];
  let s = duelWith(cards, Array(8).fill('K'), Array(8).fill('R'));
  s = endTurn(s, 0); s = play(s, 1, 0); s = endTurn(s, 1);
  s = play(s, 0, 0);
  const k = s.players[0].board[0], r = s.players[1].board[0];
  s = attack(s, 0, k.uid, r.uid);
  assert.equal(s.players[1].board.length, 1);
  assert.equal(s.players[1].board[0].name, 'Reste');
  assert.ok(s.players[0].board[0].hp < 4);
});

test('victoire par épuisement des PV', () => {
  const cards = [fake('Z', 'sauvage', { cost: 1, atk: 12 }, [{ key: 'charge' }])];
  let s = duelWith(cards, Array(10).fill('Z'), Array(10).fill('Z'));
  s.players[1].hp = 5;
  s = play(s, 0, 0);
  s = attack(s, 0, s.players[0].board[0].uid, 'hero');
  assert.equal(s.over, true);
  assert.equal(s.winner, 0);
  assert.throws(() => endTurn(s, 0));
});

test('partie complète IA contre IA avec de vraies cartes : se termine', () => {
  const rng = rngFrom('ai');
  const pick = () => Array.from({ length: 15 }, () => catalog.cards[Math.floor(rng() * catalog.cards.length)].id);
  for (let g = 0; g < 20; g++) {
    let s = createDuel({ decks: [pick(), pick()], cards: catalog.cards, rng });
    let guard = 0;
    while (!s.over && guard++ < 200) s = playTurn(s, s.active);
    assert.ok(s.over, 'la partie doit se terminer');
    assert.ok([0, 1, 'draw'].includes(s.winner));
  }
});
