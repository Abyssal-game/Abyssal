// v262 : combat à la Clair Obscur — ordre d'initiative, chaque créature joue une fois par tour avec ses propres PA
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from './helpers.mjs';
import * as D from '../js/core/duel.js';
import { PA_START, PA_TURN, PA_MAX } from '../js/core/skills.js';
import { roleOf } from '../js/core/army.js';

const cat = loadCatalog();
const pick = (role, k = 0) => cat.cards.filter((c) => roleOf(c) === role)[k];
function mk(roles = ['degats', 'protecteur', 'soin'], { foes = 2, scale = 6, seed = 11, reserve = [] } = {}) {
  const allies = [...roles, ...reserve].map((r, i) => D.duelUnit(pick(r, i), { level: 5 }));
  const enemies = Array.from({ length: foes }, (_, i) => D.duelUnit(cat.cards.filter((c) => c.rarity === 'C')[i], { side: 'enemy', scale }));
  const st = D.createDuel(allies, enemies, { seed });
  D.startInitiative(st);
  return st;
}
// joue les ennemis jusqu'à la prochaine alliée (sans défense active)
const foesPlay = (st) => { for (let k = 0; k < 12 && !st.over && st.turn === 'enemy'; k++) { for (let s = D.nextEnemy(st); s; s = D.nextEnemy(st)) D.enemyAct(st, s.a, 'none'); D.endEnemyTurn(st); } };

test('ordre d’initiative : toutes les créatures au combat, triées par vitesse', () => {
  const st = mk();
  const ids = [...D.front(st, 'ally'), ...D.front(st, 'enemy')].map((u) => u.uid).sort();
  assert.deepEqual(st.init.slice().sort(), ids);
  const sp = st.init.map((id) => D.speedOf(st.units[id]));
  for (let i = 1; i < sp.length; i++) assert.ok(sp[i - 1] >= sp[i] - 1, 'ordre décroissant (au départage près)');
});

test('une seule créature a la main ; les autres attendent leur tour', () => {
  const st = mk();
  foesPlay(st);
  assert.equal(st.turn, 'ally');
  const me = st.units[st.actor];
  const other = D.front(st, 'ally').find((u) => u !== me);
  assert.ok(D.actionsFor(st, me.uid)[0].ok);
  const a = D.actionsFor(st, other.uid)[0];
  assert.ok(!a.ok && /son tour/.test(a.why));
  assert.equal(D.act(st, other.uid, 'attack', D.actionTargets(st, other.uid, 'attack')[0]).length, 0, 'refusé');
});

test('chaque alliée joue exactement une fois par tour, puis le tour suivant commence', () => {
  const st = mk(['degats', 'protecteur', 'soin'], { scale: 30 });
  const played = [];
  const r0 = st.round;
  for (let k = 0; k < 20 && st.round === r0 && !st.over; k++) {
    foesPlay(st);
    if (st.round !== r0 || st.turn !== 'ally') break;
    played.push(st.actor);
    D.act(st, st.actor, 'defend');
  }
  assert.equal(played.length, 3);
  assert.equal(new Set(played).size, 3, 'trois créatures différentes');
});

test('PA personnels : +1 au début de son tour, +1 en attaquant, la compétence les dépense', () => {
  const st = mk(['degats', 'protecteur', 'soin'], { scale: 40 });
  foesPlay(st);
  const u = st.units[st.actor];
  assert.equal(u.pa, PA_START + PA_TURN);
  const before = u.pa;
  D.act(st, u.uid, 'attack', D.actionTargets(st, u.uid, 'attack')[0]);
  assert.equal(u.pa, before + 1, 'l’attaque rapporte 1 PA');
  assert.notEqual(st.actor, u.uid, 'son tour est fini');
  // compétence : coûte ses PA, pas la Ferveur
  for (let k = 0; k < 20 && !st.over; k++) { foesPlay(st); if (st.actor === u.uid) break; D.act(st, st.actor, 'defend'); }
  assert.equal(st.actor, u.uid);
  const sk = D.actionsFor(st, u.uid)[1];
  const fv = st.fervor, pa = u.pa;
  assert.ok(sk.ok, sk.why);
  const ts = D.actionTargets(st, u.uid, sk.key);
  D.act(st, u.uid, sk.key, sk.target === 'none' ? null : ts[0]);
  assert.equal(u.pa, pa - sk.ap);
  assert.ok(st.fervor >= fv, 'la Ferveur n’est plus dépensée par les compétences');
});

test('pas assez de PA : compétence refusée avec la raison', () => {
  const st = mk();
  foesPlay(st);
  const u = st.units[st.actor];
  u.pa = 0;
  const sk = D.actionsFor(st, u.uid)[1];
  assert.ok(!sk.ok && /PA/.test(sk.why));
  assert.ok(D.actionsFor(st, u.uid)[0].ok, 'l’attaque reste possible (gratuite)');
});

test('PA plafonnés', () => {
  const st = mk();
  foesPlay(st);
  const u = st.units[st.actor];
  u.pa = PA_MAX;
  D.act(st, u.uid, 'attack', D.actionTargets(st, u.uid, 'attack')[0]);
  assert.equal(u.pa, PA_MAX);
});

test('Défense : dure jusqu’au prochain tour de la créature (même au tour suivant)', () => {
  const st = mk(['degats', 'protecteur', 'soin'], { scale: 30 });
  foesPlay(st);
  const u = st.units[st.actor];
  D.act(st, u.uid, 'defend');
  assert.equal(u.defend, true);
  for (let k = 0; k < 20 && !st.over && st.actor !== u.uid; k++) { foesPlay(st); if (st.actor === u.uid) break; assert.equal(u.defend, true, 'toujours en défense'); D.act(st, st.actor, 'defend'); }
  assert.equal(st.actor, u.uid);
  assert.equal(u.defend, false, 'retombe au début de son tour');
});

test('Passer : la main passe à la suivante', () => {
  const st = mk();
  foesPlay(st);
  const a = st.actor;
  D.passTurn(st);
  assert.notEqual(st.actor, a);
});

test('Permuter : la créature qui entre prend la main et joue tout de suite', () => {
  const st = mk(['degats', 'protecteur', 'soin'], { reserve: ['zone'] });
  foesPlay(st);
  const out = st.actor, inn = D.reserve(st, 'ally')[0].uid;
  D.act(st, out, 'swap', inn);
  assert.equal(st.actor, inn);
  assert.ok(D.actionsFor(st, inn)[0].ok);
  assert.ok(st.init.includes(inn) && !st.init.includes(out));
});

test('gel : la créature gelée passe son prochain tour', () => {
  const st = mk(['degats', 'protecteur', 'soin'], { scale: 30 });
  foesPlay(st);
  const u = st.units[st.actor];
  const v = D.front(st, 'ally').find((x) => x !== u && st.init.indexOf(x.uid) > st.ip);
  if (!v) return; // ordre où toutes les autres ont déjà joué : rien à vérifier
  v.frozen = 1;
  D.act(st, u.uid, 'defend');
  for (let k = 0; k < 10 && !st.over && st.round === 1; k++) { foesPlay(st); if (st.round !== 1) break; assert.notEqual(st.actor, v.uid, 'elle ne joue pas'); D.act(st, st.actor, 'defend'); }
  assert.equal(v.frozen, 0);
});

test('pouvoir d’équipe : ne coûte aucun PA et ne termine pas le tour', () => {
  const st = mk();
  foesPlay(st);
  st.fervor = 6; st.ult = 'aegis'; /* v820 : plus de Sceau du Serment par défaut */
  const a = st.actor, pa = st.units[a].pa;
  assert.ok(D.ultReady(st));
  D.useUlt(st);
  assert.equal(st.actor, a);
  assert.ok(st.units[a].pa >= pa);
});

test('combat automatique complet en ordre d’initiative', () => {
  for (let s = 1; s <= 12; s++) {
    const st = mk(['degats', 'protecteur', 'soin'], { seed: s, scale: 4 + s });
    D.autoDuel(st, 60);
    assert.ok(st.over === 'won' || st.over === 'lost');
  }
});

test('Descente : un combat commencé avant la mise à jour passe à l’ordre d’initiative', async () => {
  const { Game } = await import('../js/core/game.js');
  const { MemoryStorage, rngFrom } = await import('./helpers.mjs');
  const clock = () => new Date(2026, 9, 1, 12);
  for (const turn of ['ally', 'enemy']) {
    const g = new Game(cat, new MemoryStorage(), { rng: rngFrom('mig' + turn), clock });
    const ids = cat.cards.filter((c) => c.rarity === 'C').slice(0, 5).map((c) => c.id);
    ids.forEach((id) => g.addCard(id)); g.s.team = ids; g.s.teamSet = true;
    g.startRun();
    g.startBattle('fight');
    const st = g.s.descent.run.battle;
    assert.ok(st.init, 'nouveau combat : ordre d’initiative');
    // on simule une sauvegarde d'avant v262
    delete st.init; delete st.ip; delete st.actor; st.turn = 'ally'; st.ap = 3;
    if (turn === 'enemy') { D.beginEnemyTurn(st); assert.equal(st.turn, 'enemy'); }
    g.descent();
    if (turn === 'ally') assert.ok(st.init && (st.turn === 'enemy' || st.actor), 'converti tout de suite');
    else {
      assert.ok(st.initPending && !st.init, 'converti à la fin du tour ennemi');
      for (let s = D.nextEnemy(st); s; s = D.nextEnemy(st)) D.enemyAct(st, s.a, 'none');
      D.endEnemyTurn(st);
      assert.ok(st.over || st.init, 'ordre d’initiative après le tour ennemi');
    }
    D.autoDuel(st, 60);
    assert.ok(st.over);
  }
});
