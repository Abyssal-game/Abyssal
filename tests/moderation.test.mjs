// Modération des pseudos : filtre de base, mêmes listes côté jeu et côté serveur, joueurs masqués.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pseudoProblem, normalizePseudo, BANNED_PARTS, BANNED_WORDS, RESERVED, isMaskedPseudo, isBlocked, setBlocked, blockedIds, clearBlocked } from '../js/core/moderation.js';

test('pseudos refusés : insultes, déguisées ou collées', () => {
  for (const p of ['Connard', 'C0nnard', 'Gros con', 'gros_con', 'Hitler88', 'Sale Pute', 'N1gger', 'Encülé', 'PD-du-77', 'admin']) {
    assert.ok(pseudoProblem(p), `${p} devrait être refusé`);
  }
});

test('v551 : insultes déguisées et noms réservés refusés', () => {
  for (const p of ['C0NN4RD', 'PUT3', 'B1TCH', 'P U T E', 'p.u.t.e', 'B 1 T C H', 'fuuuck', 'Fvck', 'sh1t', 'C O N', 'Сonnard',
    'Hijo de puta', 'Arschloch', 'Vaffanculo', 'Caralho', 'Stronzo', 'Scheiße', 'Maricón', 'Cabrón', 'motherfucker', '5al0pe',
    'Abyssal', 'ABYSSAL', 'A b y s s a l', '4BY55AL', 'Abyss4l', 'AbyssaI', 'xXAbyssalXx', 'Le Gardien', 'LeGardien', 'Le  Gardien',
    'L3  G4rd1en', 'Le_Gardien', 'LLLe GGGardien', 'Lé Gàrdien', 'Créateur', 'Mod', 'Agent kkk']) {
    assert.ok(pseudoProblem(p), `${p} devrait être refusé`);
  }
  assert.match(pseudoProblem('L3 G4rd1en'), /réservé/);
  for (const p of ['Agent K', 'Therapist', 'Retardataire', 'Abysses', 'Gardienne', 'Leviathan', 'Hector 12', 'Bastien', 'Pascal', 'Analyse', 'Matador']) {
    assert.equal(pseudoProblem(p), null, `${p} devrait être accepté`);
  }
});

test('pseudos acceptés : mots innocents qui contiennent un mot court', () => {
  for (const p of ['Faucon noir', 'Gardien du Sceau', 'Technique', 'Unique', 'Député', 'Orbite', 'Constance', 'Violette', 'Badminton', 'Janus', 'Culte', 'Scunthorpe', 'Suceur de sang', 'Joueur-c96589ee']) {
    assert.equal(pseudoProblem(p), null, `${p} devrait être accepté`);
  }
});

test('forme du pseudo : longueur et caractères', () => {
  assert.ok(pseudoProblem('ab'));
  assert.ok(pseudoProblem('x'.repeat(17)));
  assert.ok(pseudoProblem('<script>'));
  assert.equal(pseudoProblem('  Ok_Pseudo-1  '), null);
  assert.equal(normalizePseudo('Éñ0ç4'), 'enoca');
});

test('les listes de mots du serveur (06-signalements.sql) sont les mêmes que celles du jeu', () => {
  const sql = readFileSync(new URL('../supabase/06-signalements.sql', import.meta.url), 'utf8');
  const arr = (name) => [...sql.match(new RegExp(`${name} text\\[\\] := array\\[([^\\]]+)\\]`))[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(arr('parts'), BANNED_PARTS);
  assert.deepEqual(arr('words'), BANNED_WORDS);
  assert.deepEqual(arr('reserved'), RESERVED);
  const sql14 = readFileSync(new URL('../supabase/14-pseudos.sql', import.meta.url), 'utf8');
  const fn = (t) => t.slice(t.indexOf('create or replace function public.pseudo_ok'), t.indexOf('end $$;'));
  assert.equal(fn(sql14), fn(sql), '14-pseudos.sql reprend la même fonction');
  assert.ok([...BANNED_PARTS, ...BANNED_WORDS, ...RESERVED].every((w) => /^[a-z]+$/.test(w)));
});

test('pseudo masqué par le serveur reconnu', () => {
  assert.ok(isMaskedPseudo('Joueur-c96589ee'));
  assert.ok(!isMaskedPseudo('Joueur-moi'));
});

test('joueurs masqués sur l’appareil', () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  try {
    assert.ok(!isBlocked('a'));
    setBlocked('a', true); setBlocked('b', true); setBlocked('a', true);
    assert.deepEqual(blockedIds(), ['b', 'a']);
    setBlocked('b', false);
    assert.ok(isBlocked('a') && !isBlocked('b'));
    mem.set('abyssal.blocked', 'pas du json');
    assert.deepEqual(blockedIds(), []);
    clearBlocked();
    assert.deepEqual(blockedIds(), []);
  } finally { delete globalThis.localStorage; }
});
