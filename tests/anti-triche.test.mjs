// v538 : contre la triche (demande du propriétaire du 21 octobre 2026) : défis du jour à un seul essai,
// Sceaux en ligne sans pouvoirs de rareté, fiches d'amis nettoyées, contrôles du serveur à jour.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import * as SC from '../js/core/sceaux.js';
import { cleanCard } from '../js/core/friends.js';
import { allTitles, allCardIds } from '../tools/anti-triche-data.mjs';

const catalog = loadCatalog();
const clock = () => new Date(2026, 9, 21, 12);

test('défis du jour : un seul essai par jour, même perdu ou abandonné', () => {
  const g = new Game(catalog, { storage: new MemoryStorage(), rng: rngFrom(3), clock });
  g.s.pacte.beaten = { novice: Date.now() };
  assert.ok(g.pacteDailyOpen());
  assert.equal(g.dailyState('pacte'), 'open');
  assert.ok(g.gamesDailyLeft().includes('pacte'));
  g.pacteStart({ daily: true });
  assert.equal(g.dailyState('pacte'), 'tried');
  assert.ok(!g.gamesDailyLeft().includes('pacte'));
  g.pacteQuit();
  assert.throws(() => g.pacteStart({ daily: true }), /déjà tenté/);
  g.pacteStart({ table: 'novice' }); // les salles ordinaires se rejouent toujours
  g.s.sceaux.beaten = { initie: Date.now() };
  g.sceauxStart({ daily: true });
  assert.throws(() => g.sceauxStart({ daily: true }), /déjà tenté/);
});

test('Sceaux en ligne : sans pouvoirs, une Secrète ne résiste pas et ne capture pas à égalité', () => {
  const S = catalog.cards.find((c) => c.rarity === 'S'), C = catalog.cards.find((c) => c.rarity === 'C');
  const v = SC.sideValues(S);
  const st = (noPerks) => ({ rule: 'classique', board: [null, { id: C.id, owner: 'o', vals: [1, 1, 1, v[1]], guard: false }, null, null, null, null, null, null, null],
    hands: { p: [S.id], o: [] }, turn: 'p', placed: 1, cells: {}, over: null, last: null, log: [], fac: {}, noPerks });
  const a = st(false), b = st(true);
  SC.place(catalog, a, 'p', 0, 0); SC.place(catalog, b, 'p', 0, 0);
  assert.equal(a.board[1].owner, 'p', 'avec pouvoirs : Ardeur capture à égalité');
  assert.equal(a.board[0].guard, true);
  assert.equal(b.board[1].owner, 'o', 'sans pouvoirs : rien à égalité');
  assert.equal(b.board[0].guard, false);
});

test('fiche d’un autre joueur : seules des valeurs sûres sont gardées', () => {
  const d = cleanCard({ lv: '<b>9</b>', title: 'x'.repeat(200), frame: '"><img onerror=1>', avatar: 'INF-001', show: ['INF-001', '<x>'],
    col: { 'INF-001': [3, 7], '<script>': 1, 'ABY-002': 'abc' }, ach: ['first_card', 'a b'], st: { best: '1e9', games: { pacte: { w: '<i>' } } }, titles: -5 });
  assert.equal(d.lv, 1); assert.equal(d.title.length, 60); assert.equal(d.frame, null); assert.equal(d.avatar, 'INF-001');
  assert.deepEqual(d.show, ['INF-001']); assert.deepEqual(d.col, { 'INF-001': [3, 7], 'ABY-002': 0 }); assert.deepEqual(d.ach, ['first_card']);
  assert.equal(d.st.best, 9999); assert.equal(d.st.games.pacte.w, 0); assert.equal(d.titles, 0);
  assert.equal(cleanCard('nope'), null);
});

test('11-anti-triche.sql est à jour (titres et cartes du jeu) et le titre de départ est accepté', () => {
  const sql = fs.readFileSync(new URL('../supabase/11-anti-triche.sql', import.meta.url), 'utf8');
  const q = (s) => `('${s.replace(/'/g, "''")}')`;
  for (const t of allTitles()) assert.ok(sql.includes(q(t)), `titre manquant : ${t} (relancer node tools/anti-triche-sql.mjs)`);
  for (const id of allCardIds()) assert.ok(sql.includes(q(id)), `carte manquante : ${id}`);
  assert.ok(allTitles().includes('Novice de l’Abysse'));
  assert.ok(allTitles().includes('Vainqueur de l’Abysse') && allTitles().includes('Fondateur'));
});

test('09-multijoueur.sql : nouvelles parties des Sceaux sans pouvoirs', () => {
  const sql = fs.readFileSync(new URL('../supabase/09-multijoueur.sql', import.meta.url), 'utf8');
  assert.match(sql, /'perks', false/);
  assert.match(sql, /coalesce\(\(st ->> 'perks'\)::boolean, true\) and card\.rarity in \('HR', 'S'\)/);
});
