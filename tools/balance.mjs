// Simulation d'équilibrage : de vrais combats sur le moteur du jeu (duel.js), joués par l'IA automatique
// du joueur (autoActs), avec une défense active « moyenne » (40 % d'esquives, 15 % de parades).
// Compare des équipes types (rôles, raretés, niveaux) contre des combats normaux, des élites et des gardiens.
// Usage : node tools/balance.mjs [nombre de combats par cas, 40 par défaut]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCatalog } from '../js/core/catalog.js';
import { FACTION_ORDER } from '../js/config.js';
import { Game } from '../js/core/game.js';
import * as D from '../js/core/duel.js';
import { roleOf, ultOf, ULTS } from '../js/core/army.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
export const cat = createCatalog({ cards: FACTION_ORDER.flatMap((f) => read(`data/cards/${f}.json`)), factions: read('data/factions.json'), sets: read('data/sets.json'), abilities: read('data/abilities.json'), achievements: read('data/achievements.json'), lore: read('data/lore.json') });
class Mem { constructor() { this.m = new Map(); } getItem(k) { return this.m.get(k) ?? null; } setItem(k, v) { this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }
const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// Un combat : la porte demandée à l'étage demandé, l'équipe donnée au niveau donné
export function fight(ids, { floor = 3, room = 'fight', level = 1, seed = 1 } = {}) {
  const r = rng(seed);
  const g = new Game(cat, new Mem(), { rng: r, clock: () => new Date(2026, 9, 6, 12) });
  ['NEC-001', 'INF-001', 'CEL-001'].forEach((id) => g.addCard(id));
  g.s.team = ['NEC-001', 'INF-001', 'CEL-001']; g.s.teamSet = true;
  ids.forEach((id) => { g.addCard(id); g.s.collection[id].lv = level; });
  g.startRun();
  const run = g.s.descent.run;
  run.team = ids.map((id) => { const u = D.duelUnit(cat.get(id), { level }); return { id, hp: u.maxHp, maxHp: u.maxHp, fallen: false }; });
  const ult = g.ultimate(ids); run.ult = { key: ult.key, power: ult.power, card: ult.card };
  g.devFloor(floor);
  g.startBattle(room); // la porte voulue, directement (sans pacte)
  const st = g.s.descent.run.battle;
  if (!st) return null;
  const def = () => { const x = r(); return x < 0.15 ? 'parry' : x < 0.55 ? 'dodge' : 'none'; };
  const dmg = { dealt: 0, actions: 0 };
  let t = 0;
  for (; t < 40 && !st.over; t++) {
    if (D.ultReady(st) && r() < 0.5) D.useUlt(st);
    const ev = D.autoActs(st);
    for (const e of ev) if (e.t === 'dmg' && st.units[e.u]?.side === 'enemy') dmg.dealt += e.d;
    dmg.actions += ev.filter((e) => e.t === 'act').length;
    if (st.over) break;
    D.endTurn(st, def);
  }
  const allies = Object.values(st.units).filter((u) => u.side === 'ally');
  const hpLeft = allies.reduce((s, u) => s + Math.max(0, u.hp), 0) / allies.reduce((s, u) => s + u.maxHp, 0);
  return { won: st.over === 'won', turns: t + 1, hpLeft, dpa: dmg.actions ? dmg.dealt / dmg.actions : 0 };
}

export function bench(ids, opts, n = 40) {
  let won = 0, turns = 0, hp = 0, dpa = 0, k = 0;
  for (let i = 0; i < n; i++) {
    const o = fight(ids, { ...opts, seed: 1000 + i * 37 });
    if (!o) continue;
    k++; if (o.won) { won++; turns += o.turns; hp += o.hpLeft; } dpa += o.dpa;
  }
  return { win: Math.round((won / Math.max(1, k)) * 100), turns: won ? (turns / won).toFixed(1) : '-', hp: won ? Math.round((hp / won) * 100) : 0, dpa: (dpa / Math.max(1, k)).toFixed(1) };
}

// Une expédition complète depuis l'étage 1 : portes au hasard, premières récompenses, sans pacte.
// Les PV se gardent d'un combat à l'autre : c'est la mesure la plus fiable de la puissance d'une équipe.
export function runDepth(ids, { level = 1, seed = 1, cap = 80 } = {}) {
  const r = rng(seed);
  const g = new Game(cat, new Mem(), { rng: r, clock: () => new Date(2026, 9, 1 + (seed % 28), 12) });
  ids.forEach((id) => { g.addCard(id); g.s.collection[id].lv = level; });
  g.s.team = ids; g.s.teamSet = true;
  g.startRun();
  const def = () => { const x = r(); return x < 0.15 ? 'parry' : x < 0.55 ? 'dodge' : 'none'; };
  const play = (st) => { for (let t = 0; t < 60 && !st.over; t++) { if (D.ultReady(st) && r() < 0.5) D.useUlt(st); D.autoActs(st); if (!st.over) D.endTurn(st, def); } };
  for (let k = 0; k < 600 && g.s.descent.run; k++) {
    const R = g.s.descent.run;
    if (R.floor > cap) { g.endRun(false); break; }
    if (R.phase === 'doors') { const ds = g.doors(); const o = g.chooseDoor(ds[Math.floor(r() * ds.length)]); if (o.battle) { play(R.battle); g.finishBattle(); } }
    else if (R.phase === 'pact') { g.choosePact(null); play(R.battle); g.finishBattle(); }
    else if (R.phase === 'reward' && R.talentOffer?.length) g.chooseTalent(0);
    else if (R.phase === 'reward') g.chooseReward(R.rewards[0]);
    else if (R.phase === 'altar') g.chooseBlessing(R.altar[0]);
    else if (R.phase === 'cleared') g.nextFloor();
    else break;
  }
  return g.s.descent.last?.floor || 0;
}
export function depth(ids, level, n = 30) {
  let f = 0;
  for (let i = 0; i < n; i++) f += runDepth(ids, { level, seed: 500 + i * 53 });
  return +(f / n).toFixed(1);
}

// Cartes représentatives : la première carte de chaque (rôle, rareté)
const pick = (role, rar, skip = 0) => cat.cards.filter((c) => roleOf(c) === role && c.rarity === rar)[skip]?.id;
export const TEAMS = {
  'Communes (départ)': ['NEC-001', 'INF-001', 'CEL-001', 'ABY-003', 'SAU-014'],
  '3 Attaquants C': [pick('degats', 'C'), pick('degats', 'C', 1), pick('degats', 'C', 2), pick('soin', 'C'), pick('protecteur', 'C')],
  '3 Protecteurs C': [pick('protecteur', 'C'), pick('protecteur', 'C', 1), pick('protecteur', 'C', 2), pick('degats', 'C'), pick('soin', 'C')],
  'Poison + Gel C/PC': [pick('poison', 'PC'), pick('controle', 'PC'), pick('poison', 'C'), pick('soin', 'C'), pick('protecteur', 'C')],
  'Mixte R': [pick('protecteur', 'R'), pick('degats', 'R'), pick('soin', 'R'), pick('soutien', 'R'), pick('zone', 'R')],
  'Mixte HR': [pick('protecteur', 'HR'), pick('degats', 'HR'), pick('soin', 'HR'), pick('controle', 'HR'), pick('zone', 'HR')],
  '2 Mythiques + 3 R': [pick('controle', 'M'), pick('zone', 'M'), pick('protecteur', 'R'), pick('soin', 'R'), pick('degats', 'R')],
  'Secrètes + Mythiques': [pick('protecteur', 'S'), pick('controle', 'S'), pick('soin', 'S'), pick('zone', 'M'), pick('degats', 'M')],
};

if (process.argv[1] && process.argv[1].endsWith('balance.mjs')) {
  const n = +(process.argv[2] || 40);
  const cases = [['étage 3', { floor: 3, room: 'fight' }], ['élite 8', { floor: 8, room: 'elite' }], ['gardien 10', { floor: 10, room: 'boss' }], ['gardien 20', { floor: 20, room: 'boss' }]];
  console.log(`Victoires % · tours moyens · PV restants % · dégâts par action   (${n} combats par case)`);
  for (const level of [1, 10]) {
    console.log(`\n— Niveau ${level} —`);
    console.log('équipe'.padEnd(24) + cases.map(([n]) => n.padEnd(22)).join(''));
    for (const [name, ids] of Object.entries(TEAMS)) {
      const row = cases.map(([, o]) => { const b = bench(ids, { ...o, level }, n); return `${String(b.win).padStart(3)}% ${String(b.turns).padStart(4)}t ${String(b.hp).padStart(3)}% ${b.dpa}`.padEnd(22); });
      console.log(name.padEnd(24) + row.join(''));
    }
  }
}
