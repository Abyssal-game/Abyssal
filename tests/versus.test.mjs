// v512 : Versus Booster : mise payée par le jeu, gains encaissés une seule fois, SQL du serveur à jour.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { BOOSTERS, TABLES, LUCK_POINTS } from '../js/config.js';
import { VERSUS_TYPES, stakeOf, scoreOf, cardPts, lineupStake, lineupOf, lineupOk } from '../js/core/versus.js';

const catalog = loadCatalog();
const mk = () => new Game(catalog, new MemoryStorage(), { rng: rngFrom('vs'), clock: () => new Date(2026, 9, 20, 12) });

test('versus : mise et points', () => {
  assert.equal(stakeOf('premium', 3), 3 * BOOSTERS.premium.price);
  assert.ok(!VERSUS_TYPES.includes('abysse'));
  assert.equal(cardPts({ rarity: 'HR', variant: 'gold' }), LUCK_POINTS.HR + LUCK_POINTS.variant);
  assert.equal(scoreOf([{ rarity: 'C', variant: 'normal' }, { rarity: 'R', variant: 'holo' }]), LUCK_POINTS.C + LUCK_POINTS.R + LUCK_POINTS.variant);
});

test('versus : payer, gagner une seule fois, rendre la mise', () => {
  const g = mk();
  g.s.shards = 1000;
  assert.throws(() => g.versusPay(1200));
  g.versusPay(800);
  assert.equal(g.s.shards, 200);
  const cards = catalog.cards.filter((c) => !g.owns(c.id)).slice(0, 4).map((c) => ({ id: c.id, rarity: c.rarity, variant: 'normal', pts: 1 }));
  const out = g.versusApply('d1', { result: 'win', cards, stake: 800 });
  assert.equal(out.cards.length, 4);
  assert.ok(cards.every((c) => g.owns(c.id)));
  assert.equal(g.versusApply('d1', { result: 'win', cards, stake: 800 }), null); // deux fois : rien
  assert.equal(g.s.versus.wins, 1);
  const lose = g.versusApply('d2', { result: 'lose', cards: [], stake: 800 });
  assert.equal(lose.cards.length, 0);
  const before = g.s.shards;
  g.versusApply('d3', { result: 'refund', cards: [], stake: 500 });
  assert.equal(g.s.shards, before + 500);
  assert.equal(g.versusApply('d4', { result: 'already', cards, stake: 1 }), null);
  assert.deepEqual([g.s.versus.played, g.s.versus.wins, g.s.versus.losses], [2, 1, 1]);
});

test('versus : le SQL du serveur reprend les cartes, prix et probabilités du jeu', () => {
  const sql = fs.readFileSync(new URL('../supabase/08-versus.sql', import.meta.url), 'utf8');
  for (const c of catalog.cards) assert.ok(sql.includes(`('${c.id}','${c.rarity}','${c.faction}'`), `carte ${c.id} : relancer node tools/versus-sql.mjs`);
  for (const t of VERSUS_TYPES) {
    assert.ok(sql.includes(`when '${t}' then ${BOOSTERS[t].price}`), `prix ${t}`);
    for (const s of BOOSTERS[t].slots) assert.ok(sql.includes(JSON.stringify(TABLES[s].weights)), `poids ${s}`);
  }
});

test('versus : composition libre (v516)', () => {
  const L = [{ type: 'standard' }, { type: 'faction', faction: 'celeste' }, { type: 'premium' }];
  assert.equal(lineupStake(L), BOOSTERS.standard.price + BOOSTERS.faction.price + BOOSTERS.premium.price);
  assert.ok(lineupOk(L));
  assert.ok(!lineupOk([{ type: 'faction' }]));
  assert.ok(!lineupOk([...L, { type: 'standard' }]));
  assert.ok(!lineupOk([{ type: 'abysse' }]));
  assert.deepEqual(lineupOf({ lineup: L }), L);
  assert.equal(lineupOf({ type: 'premium', packs: 2 }).length, 2); // ancien format
  const sql = fs.readFileSync(new URL('../supabase/08-versus.sql', import.meta.url), 'utf8');
  assert.ok(sql.includes('function public.versus_create_mix(p_lineup jsonb'));
  assert.ok(!sql.includes('--PRIX--'));
});
