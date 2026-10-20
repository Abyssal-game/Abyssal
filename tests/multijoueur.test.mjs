// v519 : Duels des Sceaux contre d'autres joueurs : récompense encaissée une fois, plafond du jour, SQL à jour
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { MP_REWARD, MP_HOURS, MP_FAST_SECS } from '../js/core/mp.js';
import { sideValues } from '../js/core/sceaux.js';

const catalog = loadCatalog();
const mk = () => new Game(catalog, new MemoryStorage(), { rng: rngFrom('mp'), clock: () => new Date(2026, 9, 20, 12) });

test('en ligne : une partie ne rapporte qu’une fois, victoires payées plafonnées', () => {
  const g = mk();
  const s0 = g.s.shards;
  assert.equal(g.mpReward('sceaux', 'm1', 'win').shards, MP_REWARD.win);
  assert.equal(g.mpReward('sceaux', 'm1', 'win'), null);
  for (let i = 2; i <= MP_REWARD.paidPerDay + 2; i++) g.mpReward('sceaux', `m${i}`, 'win');
  assert.equal(g.s.shards - s0, MP_REWARD.win * MP_REWARD.paidPerDay);
  g.mpReward('sceaux', 'x', 'lose');
  assert.deepEqual(g.s.mp.sceaux, { wins: MP_REWARD.paidPerDay + 2, losses: 1, draws: 0 });
  assert.equal(g.mpReward('sceaux', 'y', 'already'), null);
});

test('en ligne : le SQL du serveur reprend les valeurs des cartes et le délai', () => {
  const sql = fs.readFileSync(new URL('../supabase/09-multijoueur.sql', import.meta.url), 'utf8');
  for (const c of catalog.cards) assert.ok(sql.includes(`('${c.id}','${c.rarity}','{${sideValues(c).join(',')}}')`), `carte ${c.id} : relancer node tools/mp-sql.mjs`);
  assert.ok(sql.includes(`select ${MP_HOURS} $$`));
  assert.ok(sql.includes(`make_interval(secs => ${MP_FAST_SECS} + 3`), 'v522 : délai de la partie rapide');
});
