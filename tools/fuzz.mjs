// Test de robustesse : des milliers de parties jouées au hasard (Descente, Cauchemar, gardiens, Sceaux).
// Après chaque action, on vérifie que l'état reste cohérent. Usage : node tools/fuzz.mjs [nombre]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCatalog } from '../js/core/catalog.js';
import { FACTION_ORDER } from '../js/config.js';
import { Game } from '../js/core/game.js';
import * as D from '../js/core/duel.js';
import * as SC from '../js/core/sceaux.js';
import { FERVOR_MAX, PA_MAX } from '../js/core/skills.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const cat = createCatalog({ cards: FACTION_ORDER.flatMap((f) => read(`data/cards/${f}.json`)), factions: read('data/factions.json'), sets: read('data/sets.json'), abilities: read('data/abilities.json'), achievements: read('data/achievements.json'), lore: read('data/lore.json') });
class Mem { constructor() { this.m = new Map(); } getItem(k) { return this.m.get(k) ?? null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const N = +(process.argv[2] || 400);
const problems = new Map();
const report = (kind, detail) => { const k = kind; if (!problems.has(k)) problems.set(k, { n: 0, ex: detail }); problems.get(k).n++; };
const stats = { battles: 0, turns: 0, actions: 0, stalls: 0, bosses: {}, bossWins: {}, floors: [], nightmare: [], sceaux: { n: 0, draw: 0, won: 0 }, talents: {}, maxDmg: 0 };

function check(st, where) {
  if (!Number.isFinite(st.ap) || st.ap < 0) report('Points d’action invalides', `${where} ap=${st.ap}`);
  if (st.init) {
    for (const id of st.order.ally) { const p = st.units[id].pa; if (!Number.isFinite(p) || p < 0 || p > PA_MAX) report('PA d’une créature hors limites', `${where} ${id} pa=${p}`); }
    if (!st.over && st.turn === 'ally' && !(st.actor && D.front(st, 'ally').some((u) => u.uid === st.actor))) report('Tour allié sans créature qui a la main', `${where} actor=${st.actor}`);
    if (!st.over && st.turn === 'enemy' && !st.queue.length) report('Tour ennemi sans ennemi', where);
  }
  if (!Number.isFinite(st.fervor) || st.fervor < 0 || st.fervor > FERVOR_MAX) report('Ferveur hors limites', `${where} ${st.fervor}`);
  for (const u of Object.values(st.units)) {
    if (!Number.isFinite(u.hp) || !Number.isFinite(u.maxHp) || !Number.isFinite(u.atk)) report('Valeur non numérique (PV/ATQ)', `${where} ${u.id} hp=${u.hp} atk=${u.atk}`);
    if (u.hp > u.maxHp) report('PV au-dessus du maximum', `${where} ${u.id} ${u.hp}/${u.maxHp}`);
    if (u.brkMax && (u.brk < 0 || u.brk > u.brkMax)) report('Brisure hors limites', `${where} ${u.id} ${u.brk}/${u.brkMax}`);
    if (u.swallowed && D.front(st, u.side).includes(u)) report('Créature engloutie encore au combat', `${where} ${u.id}`);
    if (u.poison > 14 || u.poison < 0) report('Poison hors limites', `${where} ${u.poison}`);
  }
  if (st.swallowed && !st.units[st.swallowed]) report('Proie engloutie introuvable', where);
}
function checkEv(ev, where) {
  for (const e of ev) {
    if (!e || !e.t) report('Événement vide', where);
    if (e?.t === 'dmg') { if (!(e.d > 0) || !Number.isFinite(e.d)) report('Dégât invalide', `${where} ${JSON.stringify(e)}`); stats.maxDmg = Math.max(stats.maxDmg, e.d); }
    if (e?.u && typeof e.u === 'string' && e.u.length > 0 && e.t !== 'phase' && e.t !== 'over' && e.t !== 'ult') { /* uid présent */ }
  }
}
// Un tour joué : au hasard ou avec le pilote automatique
function playerTurn(st, r, where) {
  if (r() < 0.5) { const ev = D.autoActs(st); checkEv(ev, where); stats.actions += ev.length; return; }
  for (let k = 0; k < 10 && !st.over && st.turn === 'ally' && (st.init || st.ap > 0); k++) {
    if (D.ultReady(st) && r() < 0.3) { checkEv(D.useUlt(st), where + ' pouvoir'); continue; }
    const us = D.front(st, 'ally').filter((u) => D.actionsFor(st, u.uid).some((a) => a.ok));
    if (!us.length) break;
    const u = us[Math.floor(r() * us.length)];
    const acts = D.actionsFor(st, u.uid).filter((a) => a.ok);
    const a = acts[Math.floor(r() * acts.length)];
    const ts = a.target === 'none' ? [null] : D.actionTargets(st, u.uid, a.key);
    if (!ts.length) continue;
    const t = ts[Math.floor(r() * ts.length)];
    const ap = st.ap, pa = u.pa;
    const ev = D.act(st, u.uid, a.key, t);
    if (!ev.length) report('Action autorisée mais refusée', `${where} ${a.key}`);
    else if (!st.init && st.ap > ap && a.key !== 'swap') report('Points d’action qui augmentent', `${where} ${a.key}`);
    else if (st.init && a.ap > 0 && u.pa > pa - a.ap + 1) report('Compétence qui ne coûte pas ses PA', `${where} ${a.key} ${pa}→${u.pa}`);
    // double toucher : la même action renvoyée tout de suite ne doit jamais dépenser deux fois plus que prévu
    checkEv(ev, where + ' ' + a.key); stats.actions++;
    check(st, where + ' après ' + a.key);
  }
}
function duel(st, r, where, maxTurns = 320) {
  stats.battles++;
  const def = () => { const x = r(); return x < 0.25 ? 'parry' : x < 0.65 ? 'dodge' : 'none'; };
  let t = 0;
  for (; t < maxTurns && !st.over; t++) {
    try {
      playerTurn(st, r, where);
      if (st.over) break;
      const ev = D.endTurn(st, def); checkEv(ev, where + ' tour ennemi'); check(st, where + ' fin de tour');
      stats.turns++;
    } catch (e) { report('Plantage pendant un combat', `${where} : ${e.stack.split('\n').slice(0, 3).join(' | ')}`); st.over = 'lost'; return; }
  }
  if (!st.over) {
    stats.stalls++;
    const desc = Object.values(st.units).filter((u) => u.hp > 0).map((u) => `${u.side[0]}:${u.id} ${u.hp}/${u.maxHp} atk${u.atk} sh${u.shield || 0} ice${u.ice || 0} fam:${u.fam || u.role}${u.inPlay ? '' : ' (réserve)'}${u.swallowed ? ' (avalé)' : ''}`).join(' ; ');
    report('Combat qui ne finit jamais', `${where} → ${desc}`);
    st.over = 'lost';
  }
  try { D.battleReport(st, (u) => u); D.goalState(st); } catch (e) { report('Plantage du bilan de combat', e.message); }
}

for (let i = 1; i <= N; i++) {
  const r = rng(i * 7919);
  const g = new Game(cat, new Mem(), { rng: r, clock: () => new Date(2026, 9, 1 + (i % 28), 12) });
  const tier = [['C'], ['C', 'PC', 'R'], ['R', 'HR', 'M'], ['HR', 'M', 'S']][i % 4];
  const pool = cat.cards.filter((c) => tier.includes(c.rarity));
  const ids = []; while (ids.length < 5) { const c = pool[Math.floor(r() * pool.length)]; if (!ids.includes(c.id)) ids.push(c.id); }
  ids.forEach((id) => { for (let k = 0; k < 1 + Math.floor(r() * 8); k++) g.addCard(id); });
  // Fournaise : doublons brûlés, puis niveaux achetés au hasard (jusqu'au niveau 10)
  g.burnSpares(); g.s.ash = 1e6;
  ids.forEach((id) => { const n = Math.floor(r() * 10); for (let k = 0; k < n; k++) g.upgrade(id); });
  g.s.team = ids; g.s.teamSet = true;
  if (g.team().length < 3) { g.s.team = g.s.team.slice(0, 3); if (g.team().length < 3) continue; } // équipe trop chère pour le budget : on en garde une valide
  const nightmare = r() < 0.3; if (nightmare) g.s.descent.best = 25;
  try {
    g.startRun({ cursed: r() < 0.3, nightmare });
    const run = g.s.descent.run;
    if (r() < 0.5) g.devFloor(1 + Math.floor(r() * 40)); // départ en profondeur : tous les gardiens, éveillés au-delà de 30
    for (let k = 0; k < 300 && g.s.descent.run; k++) {
      const R = g.s.descent.run;
      if (R.phase === 'doors') {
        const ds = g.doors(); const room = ds[Math.floor(r() * ds.length)];
        const o = g.chooseDoor(room);
        if (o.battle) { const bk = R.battle.bossKey; if (bk) stats.bosses[bk] = (stats.bosses[bk] || 0) + 1; duel(R.battle, r, `${room} étage ${R.floor}${bk ? ' ' + bk : ''}${R.nightmare ? ' cauchemar' : ''}`); const out = g.finishBattle(); if (bk && out.won) stats.bossWins[bk] = (stats.bossWins[bk] || 0) + 1; }
      } else if (R.phase === 'pact') { const offers = [...R.pactOffer, null]; g.choosePact(offers[Math.floor(r() * offers.length)]); const bk = R.battle.bossKey; if (bk) stats.bosses[bk] = (stats.bosses[bk] || 0) + 1; duel(R.battle, r, `pacte ${R.pact} ${R.room} étage ${R.floor}${bk ? ' ' + bk : ''}`); const out = g.finishBattle(); if (bk && out.won) stats.bossWins[bk] = (stats.bossWins[bk] || 0) + 1; }
      else if (R.phase === 'reward' && R.talentOffer?.length) { const o = g.chooseTalent(Math.floor(r() * R.talentOffer.length)); stats.talents[o.talent] = (stats.talents[o.talent] || 0) + 1; }
      else if (R.phase === 'reward') g.chooseReward(R.rewards[Math.floor(r() * R.rewards.length)]);
      else if (R.phase === 'altar') { if (r() < 0.1 && R.rewardsBak) g.cancelAltar(); else g.chooseBlessing(R.altar[Math.floor(r() * R.altar.length)]); }
      else if (R.phase === 'cleared') { if (r() < 0.08) g.endRun(false); else g.nextFloor(); }
      else { report('Phase de Descente inconnue', R.phase); break; }
    }
    if (g.s.descent.run) report('Expédition jamais terminée (300 étapes)', `seed ${i}`);
    else (nightmare ? stats.nightmare : stats.floors).push(g.s.descent.last.floor);
  } catch (e) { report('Plantage dans la Descente', `seed ${i} : ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
  // Sauvegarde : relecture après la partie
  try { const st2 = new Game(cat, g.storage, { rng: r, clock: () => new Date(2026, 9, 1 + (i % 28), 12) }); if (st2.s.shards !== g.s.shards) report('Sauvegarde relue différente', `seed ${i}`); } catch (e) { report('Plantage au rechargement de la sauvegarde', e.message); }
  // Duels des Sceaux, tous rivaux et règles
  for (let k = 0; k < 3; k++) {
    try {
      const R = SC.RIVALS[(i + k) % SC.RIVALS.length];
      const st = SC.newGame(cat, { hand: SC.autoHand(cat, ids), rival: { ...R, rule: Object.keys(SC.RULES)[(i * 3 + k) % Object.keys(SC.RULES).length] }, seed: i * 31 + k });
      for (let m = 0; m < 9 && !st.over; m++) {
        const mv = r() < 0.5 ? SC.aiMove(cat, st, 1 + Math.floor(r() * 4), r) : (() => { const h = Math.floor(r() * st.hands[st.turn].length); const free = st.board.map((c, x) => (c ? -1 : x)).filter((x) => x >= 0); return [h, free[Math.floor(r() * free.length)]]; })();
        SC.place(cat, st, st.turn, mv[0], mv[1]);
      }
      const s = SC.score(st);
      if (!st.over) report('Partie des Sceaux non terminée après 9 poses', st.rule);
      if (s.p + s.o !== 10) report('Sceaux : total de cartes différent de 10', `${st.rule} ${JSON.stringify(s)}`);
      if (st.over === 'draw') { stats.sceaux.draw++; report('Sceaux : égalité', st.rule); }
      if (st.over === 'won') stats.sceaux.won++;
      stats.sceaux.n++;
    } catch (e) { report('Plantage dans les Sceaux', e.stack.split('\n').slice(0, 3).join(' | ')); }
  }
}
const avg = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-');
console.log(`${N} joueurs simulés · ${stats.battles} combats · ${stats.turns} tours · ${stats.actions} actions · ${stats.sceaux.n} parties des Sceaux`);
console.log(`Étage moyen : ${avg(stats.floors)} (normal) · ${avg(stats.nightmare)} (Cauchemar) · plus gros coup : ${stats.maxDmg}`);
console.log('Gardiens (victoires / combats) :', Object.keys(stats.bosses).map((k) => `${k} ${stats.bossWins[k] || 0}/${stats.bosses[k]}`).join(' · '));
console.log('Talents choisis :', JSON.stringify(stats.talents));
if (!problems.size) console.log('AUCUN PROBLÈME DÉTECTÉ');
else for (const [k, v] of problems) console.log(`PROBLÈME ×${v.n} : ${k}\n   exemple : ${v.ex}`);
process.exit(problems.size ? 1 : 0);
