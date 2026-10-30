// v927 : enregistreur de combats du Mode Créateur : il note chaque coup sans rien changer au combat, et son bilan tient debout.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { playDuelOps } from './duel-bot.mjs';

globalThis.localStorage ||= new MemoryStorage();
const { Game } = await import('../js/core/game.js');
const CL = await import('../js/ui/combat-log.js');

function fight(seed, log) {
  const catalog = loadCatalog();
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom(seed), clock: () => new Date('2026-10-30T10:00:00Z') });
  g.s.settings.dev = true;
  for (const id of catalog.cards.filter((c) => ['HR', 'M'].includes(c.rarity)).slice(0, 6).map((c) => c.id)) g.devGive(id);
  g.setTeam(g.autoTeam());
  g.devBoss('devoreur', { power: true });
  g.startBattle('boss');
  const st = g.duelState('run');
  let E = g;
  if (log) { CL.clogStart(st, { where: 'run', floor: 5, room: 'boss', defMode: 'on', fast: 0, gap: 1 }); E = CL.clogWrap(g, st); }
  const end = playDuelOps(E, 'run', rngFrom(`${seed}-coups`), 1500);
  return { g, st: end, rec: log ? CL.clogEnd(end) : null };
}

test('enregistreur : même combat avec ou sans, bilan complet', () => {
  CL.setClog(true);
  const a = fight('clog', false), b = fight('clog', true);
  assert.equal(JSON.stringify(a.st.units), JSON.stringify(b.st.units), 'le combat ne change pas');
  const r = b.rec;
  assert.ok(r && r.steps.length > 5, 'des coups notés');
  assert.ok(r.allies.length && r.enemies.some((e) => e.boss), 'équipe et gardien notés');
  assert.ok(['won', 'lost'].includes(r.over));
  const s = r.sum;
  assert.ok(s.level && s.rounds >= 1);
  assert.ok(s.dmg.out > 0, 'dégâts donnés comptés');
  assert.equal(s.defense.attacks, r.steps.filter((x) => x.k === 'enemy').length);
  assert.equal(s.defense.dodge + s.defense.parry + s.defense.none, s.defense.qte);
  assert.equal(CL.clogList().length, 1, 'gardé sur l’appareil');
  assert.match(CL.clogText(), /Équipe :/);
  JSON.parse(JSON.stringify(CL.clogList()));
  CL.clogClear(); CL.setClog(false);
  assert.equal(CL.clogList().length, 0);
});

test('bilan : abus repérés', () => {
  const c = {
    over: 'won', allies: [{ uid: 'a1', name: 'A', side: 'ally', hp: 50, maxHp: 50, level: 3 }],
    enemies: [{ uid: 'e1', name: 'G', side: 'enemy', hp: 100, maxHp: 100, boss: true }, { uid: 'e2', name: 'S', side: 'enemy', hp: 20, maxHp: 20 }],
    steps: [1, 2, 3, 4, 5, 6].map((i) => ({ k: 'act', r: 1, u: 'a1', key: 'estoc', ev: i === 1 ? [{ t: 'dmg', u: 'e1', d: 100, src: 'a1' }, { t: 'die', u: 'e1' }] : [] })),
    rounds: [{ r: 1, hp: { a1: 50, e1: 100, e2: 20 } }], end: { round: 1, hp: { a1: 50, e1: 0, e2: 0 } },
  };
  const s = CL.clogAnalyze(c);
  assert.equal(s.level, 'Très facile');
  assert.ok(s.flags.some((f) => /Action répétée/.test(f)));
  assert.ok(s.flags.some((f) => /Coup démesuré/.test(f)));
  assert.ok(s.flags.some((f) => /dès le 1er tour/.test(f)));
  assert.equal(s.units.allies[0].kills, 1);
});
