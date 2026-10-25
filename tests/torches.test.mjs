// v735 : Torches de la Descente : une par combat, 5 par jour, sans réserve ; le chapitre attend le lendemain.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom, noWelcome } from './helpers.mjs';
import { Game } from '../js/core/game.js';
const catalog = loadCatalog();
import { TORCHES } from '../js/config.js';

test('v735 : une Torche par combat, 5 par jour, rallumées le lendemain sans se cumuler', () => {
  let now = new Date('2026-11-02T10:00:00').getTime();
  const g = noWelcome(new Game(catalog, new MemoryStorage(), { rng: rngFrom('t'), clock: () => new Date(now) }));
  g.team();
  assert.equal(TORCHES, 5);
  assert.deepEqual(g.torches(), { left: 5, max: 5 });
  g.startRun();
  // joue jusqu'au prochain combat gagné (portes, récompenses, autels, étages)
  const fight = () => {
    for (let k = 0; k < 50; k++) {
      const r = g.s.descent.run;
      if (!r) { g.startRun({ start: 6 }); continue; }
      if (r.phase === 'doors') { const o = g.chooseDoor(g.doors()[0]); if (o.battle) { Object.values(r.battle.units).forEach((u) => { if (u.side === 'enemy') u.hp = 0; }); r.battle.over = 'won'; g.finishBattle(); return; } }
      else if (r.phase === 'reward') { if (r.talentOffer?.length) g.chooseTalent(0); g.chooseReward(r.rewards[0]); }
      else if (r.phase === 'altar') g.chooseBlessing(r.altar[0]);
      else if (r.phase === 'omen') g.chooseOmen(r.omenOffer[0]);
      else g.nextFloor();
    }
  };
  // amène l'expédition devant ses portes, sans combattre
  const toDoors = () => { for (let k = 0; k < 20; k++) { const r = g.s.descent.run; if (!r) g.startRun({ start: 6 }); else if (r.phase === 'doors') return; else if (r.phase === 'reward') { if (r.talentOffer?.length) g.chooseTalent(0); g.chooseReward(r.rewards[0]); } else if (r.phase === 'altar') g.chooseBlessing(r.altar[0]); else if (r.phase === 'omen') g.chooseOmen(r.omenOffer[0]); else g.nextFloor(); } };
  for (let i = 0; i < 4; i++) fight();
  assert.equal(g.torches().left, 1);
  fight();
  assert.equal(g.torches().left, 0);
  // plus de Torche : le chapitre reste ouvert mais aucun combat ne commence
  toDoors();
  assert.throws(() => g.chooseDoor(g.doors().find((d) => d !== 'altar' && d !== 'treasure') || g.doors()[0]), /Torches sont éteintes/);
  assert.ok(g.s.descent.run, 'le chapitre attend le lendemain');
  // le lendemain : 5 Torches, pas une de plus ; deux jours d'absence n'en donnent pas 10
  now += 3 * 86400000;
  assert.equal(g.torches().left, 5);
});
