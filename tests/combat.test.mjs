// Combat tactique : actions, Ferveur, D20, intentions, défense active, Brisure, gardiens, Descente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import * as D from '../js/core/duel.js';
import { AP_MAX, FERVOR_MAX, diceChance } from '../js/core/skills.js';

const catalog = loadCatalog();
const card = (id) => catalog.get(id);
const A = (id, o = {}) => D.duelUnit(card(id), o);
const E = (id, o = {}) => D.duelUnit(card(id), { side: 'enemy', ...o });
// Rôles (faction infernale côté joueur, nécrotique côté ennemi : pas de faiblesse entre elles)
const ASSAUT = 'INF-001', GARDE = 'INF-009', SOIN = 'INF-003', VENIN = 'INF-006', GEL = 'INF-011', CRI = 'INF-005', ZONE = 'INF-008';
const FOE = 'NEC-002', FOE2 = 'NEC-004', FOE3 = 'NEC-006';
const units = (st, side) => st.order[side].map((id) => st.units[id]);
const clone = (st) => JSON.parse(JSON.stringify(st));
// Cherche une graine qui donne le résultat voulu au prochain jet (le hasard est enregistré dans l'état)
function withRoll(st, wanted) {
  for (let s = 1; s < 5000; s++) {
    const c = clone(st); c.seed = s;
    const r = 1 + Math.floor(D.rand(c) * 20);
    if (wanted(r)) { st.seed = s; return r; }
  }
  throw new Error('aucune graine');
}

test('actions : 3 points par tour, 2 actions par créature, jamais de ressource négative', () => {
  const st = D.createDuel([A(ASSAUT), A(GARDE), A(SOIN)], [E(FOE, { scale: 3 }), E(FOE2, { scale: 3 })], { seed: 1 });
  assert.equal(st.ap, AP_MAX);
  const [a] = units(st, 'ally'), [e] = units(st, 'enemy');
  assert.ok(D.act(st, a.uid, 'attack', e.uid).length);
  assert.ok(D.act(st, a.uid, 'attack', e.uid).length);
  assert.equal(a.acts, 2);
  assert.equal(D.act(st, a.uid, 'attack', e.uid).length, 0, 'une créature agit 2 fois au plus');
  const b = units(st, 'ally')[1];
  assert.ok(D.act(st, b.uid, 'attack', e.uid).length);
  assert.equal(st.ap, 0);
  assert.equal(D.act(st, units(st, 'ally')[2].uid, 'attack', e.uid).length, 0, 'plus de points d’action');
  assert.ok(st.ap >= 0 && st.fervor >= 0 && st.fervor <= FERVOR_MAX);
  D.endTurn(st);
  assert.equal(st.ap, AP_MAX, 'les points reviennent au tour suivant');
});

test('Ferveur : gagnée en attaquant, compétence refusée sans Ferveur, dépensée sinon ; gardée entre les combats', () => {
  const st = D.createDuel([A(SOIN), A(ASSAUT)], [E(FOE, { scale: 3 })], { fervor: 0, seed: 2 });
  const [heal, atk] = units(st, 'ally'), [e] = units(st, 'enemy');
  assert.equal(D.actionsFor(st, heal.uid).find((x) => x.key === 'priere').ok, false);
  assert.equal(D.act(st, heal.uid, 'priere', atk.uid).length, 0);
  D.act(st, atk.uid, 'attack', e.uid);
  D.act(st, atk.uid, 'attack', e.uid);
  assert.equal(st.fervor, 2);
  atk.hp = 2;
  assert.ok(D.act(st, heal.uid, 'priere', atk.uid).length);
  assert.equal(st.fervor, 0);
  assert.ok(atk.hp > 2);
  // Descente : la Ferveur du combat suivant reprend celle de la fin du précédent
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('fv'), clock: () => new Date(2026, 9, 12, 12) });
  g.team();
  const run = g.startRun();
  const f0 = run.gauge;
  g.chooseDoor('fight');
  run.battle.fervor = 5;
  D.autoDuel(run.battle, 60, () => 'parry');
  const f1 = run.battle.fervor;
  g.finishBattle();
  if (g.s.descent.run) assert.equal(g.s.descent.run.gauge, Math.min(3, f1), 'gardée, 3 au plus');
  assert.ok(f0 >= 0);
});

test('dés : réussite, réussite partielle, échec critique et critique ; chances affichées exactes', () => {
  assert.equal(diceChance(10, 0), 55);  // 10 à 19 (10 faces) + le 20
  assert.equal(diceChance(10, 3), 70);
  assert.equal(diceChance(25, 0), 5);   // seul le 20 naturel
  assert.equal(diceChance(2, 10), 95);  // le 1 naturel échoue toujours
  const mk = () => { const st = D.createDuel([A(ASSAUT)], [E(FOE, { scale: 6 })], { fervor: 6, seed: 3 }); return [st, units(st, 'ally')[0], units(st, 'enemy')[0]]; };
  const tiers = {};
  for (const [name, f] of [['crit', (r) => r === 20], ['fumble', (r) => r === 1], ['success', (r) => r >= 12 && r < 20], ['partial', (r) => r > 1 && r < 8]]) {
    const [st, a, e] = mk();
    withRoll(st, f);
    const hp = e.hp;
    const ev = D.act(st, a.uid, 'estoc', e.uid);
    const roll = ev.find((x) => x.t === 'roll');
    tiers[name] = { tier: roll.tier, dmg: hp - e.hp, exposed: !!a.exposed };
  }
  assert.equal(tiers.crit.tier, 'crit');
  assert.equal(tiers.fumble.tier, 'fumble');
  assert.equal(tiers.success.tier, 'success');
  assert.equal(tiers.partial.tier, 'partial');
  assert.ok(tiers.crit.dmg > tiers.success.dmg && tiers.success.dmg > tiers.partial.dmg && tiers.partial.dmg > tiers.fumble.dmg);
  assert.ok(tiers.fumble.dmg > 0, 'un échec critique fait quand même un peu de dégâts');
  assert.ok(tiers.fumble.exposed, 'échec critique : la créature est exposée');
  // les préparations améliorent les chances : marque, gel, Brisure
  const [st] = mk();
  const [a] = units(st, 'ally'), [e] = units(st, 'enemy');
  const base = D.rollInfo(st, a.uid, 'estoc', e.uid).chance;
  e.mark = 2;
  assert.ok(D.rollInfo(st, a.uid, 'estoc', e.uid).chance > base);
});

test('Entrave : le gel interrompt une charge ; un gardien gelé est immunisé au tour suivant, même avec un 20', () => {
  const st = D.createDuel([A(GEL), A(ASSAUT)], [E(FOE, { boss: true, scale: 2 })], { fervor: 6, seed: 4, bossPower: 'fureur' });
  const [g] = units(st, 'ally'), [b] = units(st, 'enemy');
  b.charged = 'heavy'; b.intent = { kind: 'heavy', t: g.uid, qte: true };
  withRoll(st, (r) => r === 20);
  D.act(st, g.uid, 'entrave', b.uid);
  assert.ok(b.frozen && !b.charged && b.intent.cancelled);
  const atk = b.atk;
  D.endTurn(st);
  assert.equal(b.atk, atk, 'gelé, le gardien ne gagne pas de fureur');
  assert.ok(b.frostCD > 0);
  assert.ok(!D.actionTargets(st, g.uid, 'entrave').includes(b.uid), 'immunisé : il n’est plus une cible valide');
  withRoll(st, (r) => r === 20);
  assert.equal(D.act(st, g.uid, 'entrave', b.uid).length, 0);
  assert.ok(!b.frozen);
});

test('défense active : parade parfaite, esquive, parade ratée', () => {
  const mk = () => {
    const st = D.createDuel([A(GARDE), A(ASSAUT)], [E(FOE, { elite: true, scale: 2 })], { fervor: 0, seed: 5 });
    const [g] = units(st, 'ally'), [e] = units(st, 'enemy');
    D.beginEnemyTurn(st);
    e.intent = { kind: 'hit', t: g.uid, qte: true };
    return [st, g, e];
  };
  let [st, g, e] = mk();
  let hp = g.hp, ehp = e.hp, brk = e.brk;
  D.enemyAct(st, e.uid, 'parry');
  assert.equal(g.hp, hp, 'parade : aucun dégât');
  assert.equal(st.fervor, 2, 'parade : +2 Ferveur');
  assert.ok(e.brk < brk, 'parade : Brisure de l’attaquant');
  assert.ok(e.hp < ehp, 'la Garde contre-attaque');
  [st, g, e] = mk();
  hp = g.hp;
  D.enemyAct(st, e.uid, 'dodge');
  assert.equal(g.hp, hp); assert.equal(st.fervor, 1);
  [st, g, e] = mk();
  hp = g.hp;
  D.enemyAct(st, e.uid, 'none');
  assert.ok(g.hp < hp, 'parade ratée : dégâts normaux');
  assert.equal(st.fervor, 0, 'pas de punition supplémentaire');
  // les attaques ordinaires des ennemis simples ne demandent pas de timing
  const s2 = D.createDuel([A(GARDE)], [E(FOE)], { seed: 6 });
  const i = D.intentInfo(s2, units(s2, 'enemy')[0]);
  if (i.kind === 'hit') assert.equal(i.qte, false);
});

test('Brisure : interrompt, fait passer le tour, rend vulnérable, puis l’ennemi se relève plus solide', () => {
  const st = D.createDuel([A(ASSAUT), A(GARDE), A(CRI)], [E(FOE, { elite: true, scale: 4 })], { seed: 7 });
  const [a, g] = units(st, 'ally'), [e] = units(st, 'enemy');
  e.charged = 'heavy'; e.intent = { kind: 'heavy', t: a.uid, qte: true };
  const max = e.brkMax;
  let guard = 0;
  while (!e.broken && guard++ < 10) { st.ap = 3; a.acts = 0; g.acts = 0; D.act(st, g.uid, 'attack', e.uid); }
  assert.ok(e.broken, 'la jauge se vide');
  assert.ok(e.intent.cancelled && !e.charged, 'l’attaque préparée est interrompue');
  const n = D.dmgOf(st, a, e, 1, { basic: true });
  e.broken = false; const n0 = D.dmgOf(st, a, e, 1, { basic: true }); e.broken = true;
  assert.ok(n > n0, 'vulnérable : plus de dégâts');
  const hpA = a.hp;
  D.endTurn(st);
  assert.equal(a.hp, hpA, 'brisé : il perd son action');
  assert.ok(e.broken, 'toujours vulnérable pendant ton tour suivant');
  D.endTurn(st);
  assert.ok(!e.broken && e.brkMax > max && e.brk === e.brkMax, 'il se relève avec une jauge plus solide');
});

test('permutation : 1 action, une fois par tour, PV et poison conservés, l’intention suit la place', () => {
  const st = D.createDuel([A(ASSAUT), A(GARDE), A(SOIN), A(VENIN)], [E(FOE)], { seed: 8 });
  const [a] = units(st, 'ally'), r = units(st, 'ally')[3], [e] = units(st, 'enemy');
  a.hp = 3; a.poison = 4;
  e.intent = { kind: 'hit', t: a.uid, qte: false };
  const ap = st.ap;
  D.act(st, a.uid, 'swap', r.uid);
  assert.equal(st.ap, ap - 1);
  assert.ok(D.reserve(st, 'ally').includes(a) && D.front(st, 'ally').includes(r));
  assert.equal(a.hp, 3); assert.equal(a.poison, 4);
  assert.equal(e.intent.t, r.uid, 'la créature qui entre prend le coup prévu');
  assert.equal(D.act(st, r.uid, 'swap', a.uid).length, 0, 'une seule permutation par tour');
  D.endTurn(st);
  assert.equal(a.poison, 4, 'le poison ne s’efface pas en réserve');
  assert.ok(a.hp > 3, 'la réserve récupère un peu');
});

test('gardien : phase 2 sous la moitié des PV, Carapace percée par le Venin', () => {
  const st = D.createDuel([A(VENIN), A(GARDE), A(SOIN)], [E(FOE, { boss: true, scale: 2 })], { seed: 9, bossPower: 'carapace' });
  const [v] = units(st, 'ally'), [b] = units(st, 'enemy');
  D.endTurn(st);
  assert.equal(b.shield, 1, 'la carapace se forme');
  const hp = b.hp;
  D.act(st, v.uid, 'attack', b.uid);
  assert.ok(b.hp < hp && !b.shield, 'le Venin traverse la carapace');
  b.hp = Math.floor(b.maxHp / 2);
  const ev = D.endTurn(st);
  assert.ok(b.phase2 && ev.some((x) => x.t === 'phase2'), 'phase 2');
  assert.ok(['channel', 'charge', 'hit', 'blast', 'heavy'].includes(b.intent?.kind));
});

test('combats complets : victoire sans perte, victoire avec une créature tombée, défaite, combat automatique', () => {
  // victoire nette
  let st = D.createDuel([A(ASSAUT, { level: 10 }), A(GARDE, { level: 10 }), A(SOIN, { level: 10 })], [E(FOE)], { seed: 10 });
  D.autoDuel(st, 30);
  assert.equal(st.over, 'won');
  assert.ok(units(st, 'ally').every((u) => u.hp > 0));
  // victoire avec une perte
  st = D.createDuel([A(ASSAUT, { level: 10 }), A(GARDE, { level: 10 }), A(SOIN)], [E(FOE, { scale: 2 }), E(FOE2)], { seed: 11 });
  units(st, 'ally')[2].hp = 1;
  units(st, 'enemy').forEach((e) => { e.intent = { kind: 'hit', t: units(st, 'ally')[2].uid, qte: false }; });
  D.act(st, units(st, 'ally')[0].uid, 'attack', units(st, 'enemy')[0].uid);
  D.endTurn(st);
  D.autoDuel(st, 30);
  assert.equal(st.over, 'won');
  assert.ok(units(st, 'ally').some((u) => u.hp <= 0));
  // défaite
  st = D.createDuel([A(SOIN)], [E(FOE, { scale: 6 }), E(FOE2, { scale: 6 }), E(FOE3, { scale: 6 })], { seed: 12 });
  D.autoDuel(st, 30);
  assert.equal(st.over, 'lost');
  // le pilote automatique ne fait jamais de parade
  st = D.createDuel([A(ASSAUT), A(GARDE), A(GEL)], [E(FOE, { elite: true, scale: 2 }), E(FOE2)], { seed: 13 });
  D.autoDuel(st, 40);
  assert.ok(st.over);
  assert.equal(st.stats.parries, 0);
});

test('reprise : l’état sauvegardé redonne exactement le même combat ; anciennes sauvegardes converties', () => {
  const st = D.createDuel([A(ASSAUT), A(GARDE), A(GEL)], [E(FOE, { elite: true, scale: 2 }), E(FOE2)], { seed: 14, fervor: 4 });
  const copy = clone(st);
  D.autoDuel(st, 40); D.autoDuel(copy, 40);
  assert.deepEqual(copy.units, st.units, 'même graine, même combat');
  // ancien combat (avant la refonte) dans une expédition en cours
  const storage = new MemoryStorage();
  const g = new Game(catalog, storage, { rng: rngFrom('old'), clock: () => new Date(2026, 9, 12, 12) });
  g.team(); g.startRun(); g.chooseDoor('fight');
  const old = g.s.descent.run.battle;
  delete old.ver; delete old.ap; delete old.fervor; old.gauge = 3; old.turn = 'enemy';
  Object.values(old.units).forEach((u) => { delete u.acts; delete u.brk; delete u.fam; });
  g.persist();
  const g2 = new Game(catalog, storage, { rng: rngFrom('old2'), clock: () => new Date(2026, 9, 12, 12) });
  const st2 = g2.descent().run.battle;
  assert.equal(st2.ver, 2); assert.equal(st2.turn, 'ally'); assert.equal(st2.ap, AP_MAX); assert.equal(st2.fervor, 3);
  D.autoDuel(st2, 40);
  assert.ok(st2.over);
});

test('Descente : PV et créatures tombées gardés d’un étage à l’autre, bénédictions de combat', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('ds'), clock: () => new Date(2026, 9, 12, 12) });
  g.team();
  const run = g.startRun();
  g.chooseDoor('fight');
  const st = run.battle;
  const fallen = units(st, 'ally')[0];
  fallen.hp = 0;
  const hurt = units(st, 'ally')[1];
  hurt.hp = 3;
  units(st, 'enemy').forEach((e) => { e.hp = 0; });
  st.over = 'won';
  g.finishBattle();
  const m = run.team.find((x) => x.id === fallen.id), h = run.team.find((x) => x.id === hurt.id);
  assert.ok(m.fallen);
  assert.equal(h.hp, 3);
  g.chooseReward(run.rewards[0]);
  if (run.phase === 'altar') g.chooseBlessing(run.altar[0]);
  g.nextFloor();
  g.chooseDoor(g.doors()[0]);
  const ids = units(run.battle, 'ally').map((u) => u.id);
  assert.ok(!ids.includes(fallen.id), 'une créature tombée ne revient pas');
  const again = units(run.battle, 'ally').find((u) => u.id === hurt.id);
  assert.ok(again.hp <= h.hp, 'les PV sont gardés');
  // bénédictions
  const st3 = D.createDuel([A(ASSAUT), A(GARDE), A(SOIN), A(VENIN)], [E(FOE)], { blessings: ['relais', 'ferveur', 'sursis'], fervor: 1, seed: 15 });
  assert.equal(st3.fervor, 2, 'Braise sacrée : +1 Ferveur');
  const [a] = units(st3, 'ally'), r = units(st3, 'ally')[3];
  D.act(st3, a.uid, 'swap', r.uid);
  assert.equal(st3.ap, AP_MAX, 'Relais d’ombre : première permutation gratuite');
  const t = units(st3, 'ally')[1];
  units(st3, 'enemy')[0].intent = { kind: 'hit', t: t.uid, qte: false };
  t.hp = 1; t.shield = 0;
  D.endTurn(st3);
  assert.ok(t.hp >= 1, 'Sursis : survit à un coup mortel');
});
