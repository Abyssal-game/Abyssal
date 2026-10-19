// v500 : fiche publiée pour les amis (résumé, jamais la sauvegarde) et import sans Mode Créateur (v499).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { friendCard, cardEntry, VARIANT_BITS } from '../js/core/friends.js';
import { exportCode, importCode } from '../js/core/save.js';
import fs from 'node:fs';

test('fiche d’ami : collection en bits de finitions, niveaux, succès, sans monnaies ni réglages', () => {
  const g = new Game(loadCatalog(), new MemoryStorage(), { rng: rngFrom('ami') }); noWelcome(g);
  g.addCard('INF-001'); g.addCard('INF-001', 'holo'); g.addCard('CEL-001');
  g.s.ash = 1e6; g.upgrade('CEL-001');
  const c = friendCard(g);
  assert.equal(cardEntry(c, 'INF-001').bits, VARIANT_BITS.normal | VARIANT_BITS.holo);
  assert.deepEqual(cardEntry(c, 'INF-001').variants.sort(), ['holo', 'normal']);
  assert.equal(cardEntry(c, 'CEL-001').lv, 2);
  assert.equal(cardEntry(c, 'ZZZ-999'), null);
  const txt = JSON.stringify(c);
  for (const k of ['shards', 'ash', 'obs', 'settings', 'tickets', 'chests', 'run']) assert.ok(!txt.includes(`"${k}"`), k);
  assert.ok(txt.length < 100000);
});

test('une sauvegarde importée n’ouvre jamais le Mode Créateur', () => {
  const g = new Game(loadCatalog(), new MemoryStorage(), { rng: rngFrom('dev') }); noWelcome(g);
  g.s.settings.dev = true; g.s.settings.devCode = true; g.s.devCodex = true; g.s.devGames = true;
  for (const code of [exportCode(g.s), JSON.stringify(g.s)]) {
    const s = importCode(code);
    assert.equal(s.settings.dev, false); assert.equal(s.settings.devCode, false); assert.equal(s.devCodex, false); assert.equal(s.devGames, false);
  }
});

test('SQL des amis : pseudo définitif, tables fermées, fonctions réservées aux joueurs connectés', () => {
  const sql = fs.readFileSync(new URL('../supabase/07-amis.sql', import.meta.url), 'utf8');
  assert.match(sql, /Ton pseudo est définitif/);
  assert.match(sql, /revoke all on public\.friendships from anon, authenticated/);
  assert.match(sql, /are_friends\(auth\.uid\(\), id\)/);
  for (const f of ['friend_request', 'friend_respond', 'friend_remove', 'friend_list']) assert.match(sql, new RegExp(`revoke execute on function public\\.${f}`));
});
