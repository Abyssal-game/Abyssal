// v539 : serveur de partie. Toute méthode du jeu qui change la partie doit être classée dans js/core/ops.js
// (rejouée par le serveur, faite par le serveur, coup de partie en cours, Mode Créateur) ou être interne.
// Sinon, ce qu'elle change sur le téléphone serait effacé par la partie du serveur.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { OPS } from '../js/core/ops.js';

// méthodes appelées seulement par d'autres méthodes du jeu, par le serveur ou au chargement
const INTERNAL = ['dropRemoved', 'fixVariants', 'convertHeroes', 'replaceSave', 'versusPay', 'versusRefund', 'versusApply', 'mpReward', 'shadowPrize', 'setSetting', 'endRun'];

test('serveur de partie : chaque méthode qui change la partie est classée', () => {
  const s = fs.readFileSync(new URL('../js/core/game.js', import.meta.url), 'utf8');
  const idx = [...s.matchAll(/\n {2}(?:async )?([a-zA-Z_]\w*)\([^)]*\) \{/g)].map((m) => [m.index, m[1]]);
  const missing = [];
  idx.forEach(([st, n], i) => {
    const body = s.slice(st, i + 1 < idx.length ? idx[i + 1][0] : s.length);
    if (body.includes('this.persist()') && !Object.hasOwn(OPS, n) && !INTERNAL.includes(n)) missing.push(n);
  });
  assert.deepEqual(missing, [], `à classer dans js/core/ops.js : ${missing.join(', ')}`);
});

test('serveur de partie : les opérations nommées existent dans le jeu (ou sont faites par le serveur)', () => {
  const s = fs.readFileSync(new URL('../js/core/game.js', import.meta.url), 'utf8');
  const srv = fs.readFileSync(new URL('../serveur/partie.mjs', import.meta.url), 'utf8');
  for (const m of Object.keys(OPS)) assert.ok(new RegExp(`\\n {2}${m}\\(`).test(s) || new RegExp(`\\b${m}\\(c, g|\\b${m}\\(g`).test(srv), m);
});
