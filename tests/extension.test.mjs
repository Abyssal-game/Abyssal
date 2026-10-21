// Extension : gardiens à mécaniques, pactes, reliques, relations, formes corrompues, sauvegarde.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, MemoryStorage, rngFrom } from './helpers.mjs';
import { Game } from '../js/core/game.js';
import * as D from '../js/core/duel.js';
import { migrate, defaultSave } from '../js/core/save.js';
import { BOSSES, BOSS_ORDER, bossOf } from '../js/core/bosses.js';
import { relationMult, activeLegends, familyOf } from '../js/core/relations.js';
import { pactChoices } from '../js/core/pacts.js';
import { FORMS } from '../js/core/forms.js';

const catalog = loadCatalog();
const card = (id) => catalog.get(id);
const A = (id, o = {}) => D.duelUnit(card(id), o);
const E = (id, o = {}) => D.duelUnit(card(id), { side: 'enemy', ...o });
const ASSAUT = 'INF-001', GARDE = 'INF-009', SOIN = 'INF-003', GEL = 'INF-011';
const FOE = 'NEC-002';
const units = (st, side) => st.order[side].map((id) => st.units[id]);
const boss = (st) => units(st, 'enemy').find((u) => u.boss);
// Fait jouer un tour ennemi complet sans défense, puis renvoie au tour du joueur
const pass = (st) => D.endTurn(st);
const team = () => [A(ASSAUT, { level: 5 }), A(GARDE, { level: 5 }), A(SOIN, { level: 5 })];
const bossDuel = (key, o = {}) => D.createDuel(team(), [E('NEC-010', { boss: true, scale: 1.2 })], { seed: 7, boss: key, ...o });

test('gardiens : chaque fiche a un motif, et le moteur résout tous ses tours sans erreur', () => {
  for (const key of BOSS_ORDER) {
    const st = bossDuel(key);
    assert.equal(st.bossKey, key);
    const seen = new Set();
    for (let r = 0; r < 8 && !st.over; r++) { const b = boss(st); if (b?.intent) seen.add(b.intent.kind); pass(st); }
    assert.ok(seen.size >= 2, `${key} varie ses intentions (${[...seen]})`);
  }
  assert.equal(bossOf(5), 'devoreur');
  assert.equal(bossOf(10), 'matriarche');
  assert.equal(bossOf(30), 'essaim');
  assert.equal(bossOf(50), 'horloge');
  assert.equal(bossOf(55), 'miroirs');
  assert.equal(bossOf(100), 'abysse');
  assert.equal(bossOf(105), 'devoreur');
});

test('Dévoreur : le festin le nourrit et le renforce ; le gel l’interrompt', () => {
  const st = bossDuel('devoreur');
  const b = boss(st);
  // forcer l'intention de festin
  b.intent = { kind: 'gorge', t: units(st, 'ally')[1].uid, qte: true };
  b.hp = Math.round(b.maxHp * 0.7);
  const atk = b.atk, hp = b.hp;
  D.beginEnemyTurn(st);
  const s = D.nextEnemy(st);
  D.enemyAct(st, s.a, 'none');
  assert.ok(b.atk > atk, 'il gagne de l’attaque');
  assert.ok(b.hp > hp, 'il se soigne de ce qu’il dévore');
  assert.equal(st.stats.feasts, 1);
  D.endEnemyTurn(st);
  // gel pendant la préparation : intention annulée, interruption comptée
  const st2 = bossDuel('devoreur');
  const b2 = boss(st2);
  b2.intent = { kind: 'gorge', t: units(st2, 'ally')[0].uid, qte: true };
  const ice = A(GEL, { level: 9 }); ice.uid = 'aGEL'; st2.units.aGEL = ice; st2.order.ally[0] = 'aGEL'; ice.inPlay = true;
  for (let seed = 1; seed < 500; seed++) {
    const c = JSON.parse(JSON.stringify(st2)); c.seed = seed;
    const r = 1 + Math.floor(D.rand(c) * 20);
    if (r === 20) { st2.seed = seed; break; }
  }
  st2.fervor = 6;
  D.act(st2, 'aGEL', 'entrave', b2.uid);
  assert.ok(b2.intent.cancelled, 'le festin est annulé');
  assert.equal(st2.stats.interrupts, 1);
});

test('Matriarche : le froid monte, puis la tempête frappe toute l’équipe et gèle', () => {
  const st = bossDuel('matriarche');
  const b = boss(st);
  b.intent = { kind: 'gather', t: null, qte: false };
  pass(st);
  assert.equal(b.intent?.kind, 'blizzard', 'la tempête est annoncée au tour suivant');
  const before = units(st, 'ally').map((u) => u.hp);
  pass(st);
  const after = units(st, 'ally').map((u) => u.hp);
  assert.ok(after.every((h, i) => h <= before[i]) && after.some((h, i) => h < before[i]), 'toute l’équipe est touchée');
});

test('Roi sans Visage : il annonce la compétence copiée, puis l’utilise', () => {
  const st = bossDuel('roi');
  const b = boss(st);
  b.intent = { kind: 'mimic', t: null, qte: false, copy: 'estoc', copyName: 'Coup d’estoc' };
  pass(st);
  assert.equal(b.intent?.kind, 'copy');
  assert.equal(b.intent.copy, 'estoc');
  const info = D.intentInfo(st, b);
  assert.ok(info.dmg > 0 && info.target, 'la copie annonce sa cible et ses dégâts');
});

test('Architecte : une Loi change les règles (silence : compétences plus chères)', () => {
  const st = bossDuel('architecte');
  const b = boss(st);
  b.intent = { kind: 'decree', t: null, qte: false, law: 'silence' };
  const garde = units(st, 'ally')[1];
  const cost = D.actionsFor(st, garde.uid).find((a) => a.key === 'rempart').fervor;
  pass(st);
  assert.equal(st.law, 'silence');
  assert.equal(D.actionsFor(st, garde.uid).find((a) => a.key === 'rempart').fervor, cost + 1);
  b.intent = { kind: 'decree', t: null, qte: false, law: 'hate' };
  pass(st);
  assert.equal(st.ap, 4, 'Loi de la hâte : 4 actions');
});

test('Éclipse : ses faiblesses changent avec son aspect', () => {
  const st = bossDuel('eclipse');
  const b = boss(st);
  const cel = A('CEL-005'), nec = A('NEC-001');
  assert.ok(D.factionMult(nec, b) > 1 && D.factionMult(cel, b) < 1, 'aspect du soleil');
  b.intent = { kind: 'shift', t: null, qte: false, aspect: 'lune' };
  pass(st);
  assert.equal(b.aspect, 'lune');
  assert.ok(D.factionMult(cel, b) > 1 && D.factionMult(nec, b) < 1, 'aspect de la lune');
});

test('pactes : un avantage réel et un prix réel', () => {
  const base = D.createDuel(team(), [E(FOE, { scale: 2 })], { seed: 3 });
  const sang = D.createDuel(team(), [E(FOE, { scale: 2 })], { seed: 3, pact: 'sang' });
  const [a0] = units(base, 'ally'), [e0] = units(base, 'enemy');
  const [a1] = units(sang, 'ally'), [e1] = units(sang, 'enemy');
  assert.ok(D.dmgOf(sang, a1, e1) > D.dmgOf(base, a0, e0), 'Sang : plus de dégâts');
  pass(sang);
  assert.ok(units(sang, 'ally').some((u) => u.hp < u.maxHp), 'Sang : des PV perdus chaque tour');
  const reflet = D.createDuel(team(), [E(FOE)], { seed: 3, pact: 'reflet', fervor: 4 });
  assert.equal(reflet.fervor, 2, 'Reflet : 2 Ferveur de moins');
  const cendre = D.createDuel(team(), [E(FOE)], { seed: 3, pact: 'cendre' });
  assert.equal(cendre.fervor, 6, 'Cendre : Ferveur pleine');
  // Gardien : la première créature qui tombe se relève
  const gard = D.createDuel(team(), [E(FOE, { scale: 6 })], { seed: 3, pact: 'gardien' });
  const v = units(gard, 'ally')[0];
  units(gard, 'ally').forEach((u) => { u.hp = 1; }); // plafond par coup : il faut être déjà blessé pour tomber
  const foe = units(gard, 'enemy')[0];
  foe.intent = { kind: 'heavy', t: v.uid, qte: true };
  pass(gard);
  assert.ok(v.hp > 0, 'relevée par le pacte');
  assert.equal(gard.guardianPact, false);
  const offer = pactChoices('2026-10-12:5:boss');
  assert.equal(offer.length, 3);
  assert.equal(new Set(offer).size, 3);
  assert.deepEqual(offer, pactChoices('2026-10-12:5:boss'), 'pas de relance');
});

test('reliques : effets et coûts appliqués au combat', () => {
  const base = D.createDuel(team(), [E(FOE)], { seed: 5 });
  const coeur = D.createDuel(team(), [E(FOE)], { seed: 5, relics: ['coeur'] });
  assert.ok(units(coeur, 'ally')[0].maxHp > units(base, 'ally')[0].maxHp, 'Cœur : plus de PV');
  const miroir = D.createDuel(team(), [E(FOE)], { seed: 5, relics: ['miroir'] });
  assert.equal(miroir.ap, 2, 'Miroir : 2 actions au premier tour');
  const sablier = D.createDuel(team(), [E(FOE)], { seed: 5, relics: ['sablier'] });
  assert.equal(sablier.ap, 4, 'Sablier : une action de plus au premier tour');
  const oeil = D.createDuel(team(), [E(FOE)], { seed: 5, relics: ['oeil'] });
  assert.ok(oeil.discovered[card(FOE).faction], 'Œil : faiblesses révélées');
});

test('relations : prédation, rivalité et légendes', () => {
  const dragon = A('PRI-043'), bete = E('SAU-001');
  assert.equal(familyOf(card('PRI-043')), 'dragon');
  assert.equal(relationMult(dragon, bete).m, 1.2);
  const ange = A('CEL-001'), demon = E('INF-001');
  assert.equal(relationMult(ange, demon).m, 1.15, 'rivaux');
  assert.equal(relationMult(D.duelUnit(card('INF-001')), D.duelUnit(card('CEL-001'), { side: 'enemy' })).m, 1.15, 'dans les deux sens');
  const legends = activeLegends(['ABY-030', 'ABY-031', 'INF-001']);
  assert.equal(legends.length, 1);
  const st = D.createDuel([A('ABY-030'), A('ABY-031'), A(ASSAUT)], [E(FOE)], { seed: 1 });
  const sc = A('ABY-030');
  assert.equal(units(st, 'ally')[0].atk, sc.atk + 1, 'bonus de légende');
  assert.ok(st.relSeen['l-messine']);
});

test('formes corrompues : un autre passif, sans toucher à la carte d’origine', () => {
  for (const id of Object.keys(FORMS)) assert.ok(card(id), `${id} existe`);
  const ph = A('CEL-031', { form: 'corrompue' });
  assert.equal(ph.form, 'rebirth');
  const st = D.createDuel([ph, A(ASSAUT), A(SOIN)], [E(FOE, { scale: 8 })], { seed: 2 });
  const p = units(st, 'ally')[0];
  assert.ok(p.hp < p.maxHp, 'commence affaibli');
  p.hp = 1;
  units(st, 'enemy')[0].intent = { kind: 'heavy', t: p.uid, qte: true };
  pass(st);
  assert.ok(p.hp > 0 && p.reborn, 'renaissance noire');
  const plain = A('CEL-031');
  assert.equal(plain.form, undefined, 'la forme originelle ne change pas');
});

test('Descente : plus de pacte avant le gardien (v250), combat direct contre le gardien de l’étage', () => {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom(9) });
  ['INF-001', 'INF-009', 'INF-003', 'INF-011', 'INF-005'].forEach((id) => g.addCard(id));
  g.setTeam(['INF-001', 'INF-009', 'INF-003', 'INF-011', 'INF-005']);
  g.startRun();
  const run = g.descent().run;
  run.floor = 5;
  run.phase = 'doors';
  const out = g.chooseDoor(g.doors().includes('boss') ? 'boss' : g.doors()[0]);
  if (out.pact) {
    assert.equal(run.phase, 'pact');
    const r = g.choosePact(out.pact[0]);
    assert.ok(r.battle);
    assert.equal(run.battle.pact, out.pact[0]);
    if (run.room === 'boss') assert.equal(run.battle.bossKey, 'devoreur');
  }
});

test('sauvegarde : une ancienne sauvegarde reçoit les nouveaux champs sans rien perdre', () => {
  const old = defaultSave();
  for (const k of ['bossesBeaten', 'relations', 'forms', 'lore', 'sceaux', 'relics', 'war']) delete old[k];
  old.shards = 777; old.collection = { 'INF-001': { n: 2, v: { normal: 2 }, first: 1, isNew: false } };
  const s = migrate(JSON.parse(JSON.stringify(old)));
  assert.equal(s.shards, 777);
  assert.equal(s.collection['INF-001'].n, 2);
  assert.deepEqual(s.bossesBeaten, {});
  assert.equal(s.sceaux.wins, 0);
  assert.deepEqual(s.war.history, []);
  // valeurs invalides : remplacées par des valeurs sûres
  const bad = migrate({ ...s, sceaux: 'n’importe quoi', war: { history: 3 } });
  assert.equal(bad.sceaux.wins, 0);
  assert.ok(Array.isArray(bad.war.history));
});

test('difficulté : plafond par coup sur tes créatures, cumul de bonus plafonné, fenêtre d’esquive minimale', () => {
  const st = D.createDuel(team(), [E(FOE, { scale: 30 })], { seed: 5 });
  const v = units(st, 'ally')[0], foe = units(st, 'enemy')[0];
  units(st, 'ally').forEach((u) => { u.guardBy = null; });
  foe.intent = { kind: 'hit', t: v.uid };
  D.enemyAct(st, foe.uid);
  assert.ok(v.maxHp - v.hp <= Math.round(v.maxHp * D.ALLY_HIT_CAP), 'coup normal : 45 % au plus');
  const w = units(st, 'ally')[1];
  foe.intent = { kind: 'heavy', t: w.uid };
  D.enemyAct(st, foe.uid);
  assert.ok(w.hp > 0 && w.maxHp - w.hp <= Math.round(w.maxHp * D.ALLY_BIG_CAP), 'coup chargé : 75 % au plus');
  // cumul : marque + Brisure + exposé + règle… jamais plus de ×3
  const a = units(st, 'ally')[0];
  Object.assign(foe, { mark: 2, broken: true, exposed: true });
  st.ruleMult = 1.25;
  assert.ok(D.dmgOf(st, a, foe) <= (a.atk + (a.boost || 0) + 2) * D.MULT_CAP + D.COMBO_MAX);
  // esquive : jamais sous 130 ms (v558 : plancher des gardiens), même contre un gardien bien plus fort
  const b = D.createDuel(team(), [E(FOE, { boss: true, scale: 5, level: 40 })], { seed: 5 });
  assert.ok(D.defenseWindow(b, units(b, 'enemy')[0].uid, units(b, 'ally')[0].uid).dodge >= 130);
});

test('Sceau du Gardien : une fois par combat, bouclier qui absorbe la moitié des PV', () => {
  const st = D.createDuel(team(), [E(FOE, { scale: 4 })], { seed: 4, fervor: 6, ult: 'sceau', power: 1 });
  assert.ok(D.ultReady(st));
  D.useUlt(st);
  const v = units(st, 'ally')[0];
  assert.equal(v.ward, Math.round(v.maxHp * D.SEAL_WARD));
  st.fervor = 6; st.ap = 3;
  assert.equal(D.ultReady(st), false, 'une seule fois par combat');
  const hp = v.hp, ward = v.ward;
  st.turn = 'enemy'; st.curKind = 'hit';
  const foe = units(st, 'enemy')[0];
  foe.intent = { kind: 'hit', t: v.uid };
  units(st, 'ally').forEach((u) => { u.guardBy = null; });
  D.enemyAct(st, foe.uid);
  assert.ok(v.ward < ward || v.hp < hp, 'le coup entame le bouclier');
  assert.ok(hp - v.hp <= Math.max(0, D.dmgOf(st, foe, v) - ward) + 1);
});
