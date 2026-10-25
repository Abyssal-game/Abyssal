// v754 : audit avant publication. Une app modifiée envoyait des arguments trafiqués ("5" au lieu de 5) ou des actions hors
// de leur moment ; le serveur de partie les rejouait tels quels. Et un abandon donnait de l'expérience (farm de niveaux).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import { OPS, ARGS, argsOk } from '../js/core/ops.js';
import * as SC from '../js/core/sceaux.js';
import * as CR from '../js/core/cryptes.js';
const catalog = loadCatalog();
const game = () => noWelcome(new Game(catalog, new MemoryStorage(), { rng: rngFrom('a754'), clock: () => new Date('2026-11-02T10:00:00') }));

test('v754 : chaque opération rejouée a une forme d’arguments, et les nombres en texte sont refusés', () => {
  for (const [m, d] of Object.entries(OPS)) if (d.kind === 'sync') assert.ok(ARGS[m], `forme manquante : ${m}`);
  assert.ok(argsOk('codexClaim', ['free', 5])); assert.ok(!argsOk('codexClaim', ['free', '5']));
  assert.ok(argsOk('sceauxPlay', [0, 4])); assert.ok(!argsOk('sceauxPlay', ['0', 4]));
  assert.ok(!argsOk('cryptesFlip', ['3'])); assert.ok(!argsOk('burn', ['INF-001', 'normal', 1.5]));
  assert.ok(!argsOk('startBattle', ['boss', { room: 'boss', shards: 999 }])); assert.ok(!argsOk('claimMission', [0, 1]));
  assert.ok(argsOk('duelAct', ['run', 'a1', 'attack', 'e1', null])); assert.ok(argsOk('setSachet', [null, 'standard']));
});

test('v754 : le moteur refuse aussi les index en texte (Sceaux, Cryptes, Codex, missions)', () => {
  assert.throws(() => SC.place(catalog, { over: false, turn: 'p', board: Array(9).fill(null), hands: { p: ['INF-001'] } }, 'p', '0', 4));
  const st = CR.newGame(catalog, { table: 'ossuaire', seed: 3 });
  assert.throws(() => CR.flip(st, '0'));
  const g = game();
  assert.throws(() => g.codexClaim('free', '1'));
  assert.throws(() => g.claimMission('at'));
});

test('v754 : pas de combat hors des portes proposées (gardien depuis l’étage 1, combat relancé)', () => {
  const g = game(); g.team(); g.startRun();
  const r = g.s.descent.run;
  assert.equal(r.phase, 'doors');
  assert.throws(() => g.startBattle('boss'), /porte/);
  const o = g.chooseDoor(g.doors()[0]);
  assert.ok(o.battle);
  assert.throws(() => g.startBattle('fight'), /porte/); // pendant le combat : pas de relance
});

test('v754 : un abandon de mini-jeu ne donne pas d’expérience', () => {
  const g = game();
  const xp = g.s.xp;
  g.pacteStart({ table: 'novice' }); const out = g.gameForfeit('pacte');
  assert.equal(out.xp, 0); assert.equal(g.s.xp, xp);
});
