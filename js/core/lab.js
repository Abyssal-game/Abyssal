// v595 : banc d'essai de la Descente (Labo des combats, Mode Créateur). Un combat « bac à sable » construit exactement
// comme un vrai combat de la Descente (mêmes ennemis : g.foesFor), mais gardé en mémoire : il ne touche pas la sauvegarde,
// ne passe pas par les opérations du serveur de partie et ne rapporte rien. Le propriétaire y règle la force des ennemis
// (PV, attaque) étage par étage et note ce qu'il ressent ; fitCurve en tire une courbe pour tous les étages.
import { labKinds, createDuel, duelUnit, act as duelActRaw, useUlt, beginEnemyTurn, nextEnemy, takeSkips, enemyAct, endEnemyTurn, startInitiative, autoDuel, RHYTHM } from './duel.js';
import { FERVOR_START } from './skills.js';
import { bossOf } from './bosses.js';
import { cardPower, advisedPower, enemyScale, lateSoft, bossEase, FOE_EASE, BOSS_EASE, chapterOf } from './descent.js';
import { refPowFor } from './game.js';
import { ULTS, ultOf, TEAM } from './army.js';

export const LAB_ROOMS = { fight: 'Combat', elite: 'Élite', boss: 'Gardien' };
/* notes du propriétaire : multiplicateur proposé sur la force essayée (« trop facile » = ennemis 25 % plus forts) */
export const LAB_NOTES = { easy2: ['Trop facile', 1.25], easy: ['Un peu facile', 1.1], ok: ['Juste bien', 1], hard: ['Un peu dur', 0.9], hard2: ['Trop dur', 0.78] };
/* profils de défense pour la simulation (part de parades, part d'esquives), comme les bancs d'essai des versions 502 à 509 */
export const LAB_DEF = { none: ['Sans défense', 0, 0], weak: ['Défense faible', 0.05, 0.4], mid: ['Défense moyenne', 0.15, 0.5], good: ['Bonne défense', 0.3, 0.5] };

const RAR = ['C', 'PC', 'R', 'HR', 'M', 'S'];
let seedN = 1;

/* créatures de l'équipe : la tienne (tes niveaux, ou un niveau imposé), ou une « équipe type » à la force conseillée de l'étage */
export function labAllies(g, floor, level = 'mine') {
  const cat = g.catalog;
  if (level === 'type') {
    const target = advisedPower(floor);
    let rar = 'S', lv = 10;
    outer: for (const r of RAR) for (let l = 1; l <= 10; l++) if (cardPower(r, l) >= target) { rar = r; lv = l; break outer; }
    const pool = cat.byRarity[rar] || [];
    const pick = []; const seen = new Set();
    for (const c of pool) { if (seen.has(c.faction)) continue; seen.add(c.faction); pick.push(c); if (pick.length >= TEAM.active + TEAM.reserve) break; }
    return { units: pick.map((c) => duelUnit(c, { level: lv })), cards: pick.map((c) => c.id), label: `Équipe type : ${pick.length} cartes ${rar} niveau ${lv}` };
  }
  let ids = (g.s.team || []).filter((id) => g.owns(id));
  if (ids.length < TEAM.active) ids = [...new Set([...ids, ...g.bestCards(TEAM.active + TEAM.reserve).map((c) => c.id)])];
  ids = ids.slice(0, TEAM.active + TEAM.reserve);
  const units = ids.map((id) => duelUnit(cat.get(id), { level: level === 'mine' ? g.cardLevel(id) : +level }));
  return { units, cards: ids, label: level === 'mine' ? 'Ton équipe, à tes niveaux' : `Ton équipe au niveau ${level}` };
}

/* opts : floor, room, level ('mine' | 'type' | 1..10), hp, atk (multiplicateurs essayés), day, seed, curve (multiplicateurs d'une courbe à essayer) */
export function labBattle(g, { floor = 1, room = 'fight', level = 'mine', hp = 1, atk = 1, day = null, seed = null, curve = null, attacks = null, skills = null, teamUlt = null } = {}) {
  if (room === 'boss') floor = Math.max(5, Math.round(floor / 5) * 5);
  day ||= new Date().toISOString().slice(0, 10);
  const fake = { day, floor, start: (chapterOf(floor) - 1) * 5 + 1, minFloor: 1, team: [], blessings: [], noGrit: true, lab: true };
  const enemies = g.foesFor(fake, room);
  const cm = curve ? curve(floor, room) : { hp: 1, atk: 1 };
  for (const e of enemies) {
    const kh = hp * cm.hp, ka = atk * cm.atk;
    if (kh !== 1) { e.maxHp = Math.max(1, Math.round(e.maxHp * kh)); e.hp = e.maxHp; }
    if (ka !== 1) e.atk = Math.max(1, Math.round(e.atk * ka));
  }
  const al = labAllies(g, floor, level);
  const lead = al.cards[0] ? g.catalog.get(al.cards[0]) : null, uk = ultOf(lead);
  const ult = { key: uk, ...(ULTS[uk] || {}), card: lead?.id || null, power: 1 };
  const st = createDuel(al.units, enemies, { fervor: FERVOR_START, ult: uk, power: 1, known: {}, boss: room === 'boss' ? bossOf(floor) : null,
    seed: seed ?? ((Date.now() + seedN++ * 7919) % 2147483647), refPow: refPowFor(floor) });
  if (attacks?.length) { labKinds(attacks); st.labAtk = attacks.map((a, i) => (a.on === false ? -1 : i)).filter((i) => i >= 0); } /* v596 : attaques inventées */
  else labKinds([]);
  if (skills?.length) st.labSkills = skills.map((k) => (k.on === false ? null : k)); /* v598 : pouvoirs inventés */
  if (teamUlt && teamUlt.on !== false) st.labUlt = teamUlt;
  startInitiative(st);
  const run = { lab: true, free: true, battle: st, floor, room, day, ult, team: [], blessings: [] };
  return { st, run, team: al };
}

/* moteur du bac à sable : mêmes coups que g.duelAct… mais sur le combat du Labo, sans sauvegarde ni serveur */
export function labEngine(st) {
  return {
    duelAct(w, uid, key, t = null, rhythm = 0) { st.rhythm = [RHYTHM.good, RHYTHM.perfect].includes(rhythm) ? rhythm : 0; return duelActRaw(st, uid, key, t); },
    duelUlt() { return useUlt(st); },
    duelPass() { return beginEnemyTurn(st); },
    duelNext() { const s = nextEnemy(st); st.nextQte = s ? { a: s.a, qte: !!s.qte } : null; return s ? { s, skips: takeSkips(st) } : null; },
    duelEnemy(w, a, res = 'none') { const q = st.nextQte; const d = q && q.a === a && q.qte && (res === 'dodge' || res === 'parry') ? res : 'none'; st.nextQte = null; return enemyAct(st, a, d); },
    duelEndEnemy() { return endEnemyTurn(st); },
  };
}

/* bilan d'un combat terminé : PV perdus par l'équipe (%), créatures tombées, tours */
export function labSummary(st) {
  const al = st.order.ally.map((id) => st.units[id]);
  const max = al.reduce((a, u) => a + u.maxHp, 0), left = al.reduce((a, u) => a + Math.max(0, u.hp), 0);
  return { won: st.over === 'won', lost: max ? Math.round(100 * (1 - left / max)) : 0, fallen: al.filter((u) => u.hp <= 0).length, rounds: st.round };
}

/* n combats joués par le pilote automatique ; défense = clé de LAB_DEF */
export function labSimulate(g, opts, n = 20, def = 'mid') {
  const [, pp, pd] = LAB_DEF[def] || LAB_DEF.mid;
  let wins = 0, lost = 0, rounds = 0, fallen = 0;
  for (let i = 0; i < n; i++) {
    const day = new Date(Date.UTC(2026, 10, 1) + i * 86400000).toISOString().slice(0, 10); /* jours sans règle du jour (retirées le 18 octobre 2026) */
    const { st } = labBattle(g, { ...opts, day, seed: 1000 + i * 31 });
    let r = 12345 + i * 977; const rnd = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
    autoDuel(st, 60, () => { const x = rnd(); return x < pp ? 'parry' : x < pp + pd ? 'dodge' : 'none'; });
    const s = labSummary(st); wins += s.won ? 1 : 0; lost += s.lost; rounds += s.rounds; fallen += s.fallen;
  }
  return { n, win: Math.round((100 * wins) / n), lost: Math.round(lost / n), rounds: +(rounds / n).toFixed(1), fallen: +(fallen / n).toFixed(1) };
}

/* ——— courbe ———
   notes : [{ floor, room, hp, atk, note }] ; valeur retenue d'une note = force essayée × multiplicateur de la note.
   Pour chaque famille (« foe » = combats et élites, « boss » = gardiens) : points reliés en ligne droite entre les étages
   notés (au-delà : la valeur du point le plus proche), puis la force réelle des ennemis (échelle de l'étage × réglage du jeu
   × courbe) des combats ne doit jamais baisser d'un étage au suivant : si une note la fait baisser, la courbe est relevée au minimum. */
export const noteValue = (n) => ({ hp: n.hp * (LAB_NOTES[n.note]?.[1] ?? 1), atk: n.atk * (LAB_NOTES[n.note]?.[1] ?? 1) });
const lerp = (pts, f) => {
  if (!pts.length) return 1;
  if (f <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (f <= pts[i][0]) { const [a, x] = pts[i - 1], [b, y] = pts[i]; return x + (y - x) * (f - a) / (b - a); }
  return pts[pts.length - 1][1];
};
export function fitCurve(notes) {
  const fam = (room) => (room === 'boss' ? 'boss' : 'foe');
  const pts = { foe: { hp: [], atk: [] }, boss: { hp: [], atk: [] } };
  for (const k of ['foe', 'boss']) {
    const by = {};
    for (const n of notes.filter((x) => fam(x.room) === k && x.note)) { const v = noteValue(n); (by[n.floor] ||= []).push(v); }
    for (const f of Object.keys(by).map(Number).sort((a, b) => a - b)) {
      const l = by[f];
      pts[k].hp.push([f, l.reduce((a, v) => a + v.hp, 0) / l.length]); pts[k].atk.push([f, l.reduce((a, v) => a + v.atk, 0) / l.length]);
    }
  }
  const base = (f, k) => enemyScale(f) * (k === 'boss' ? bossEase(f) : lateSoft(f));
  const out = { foe: { hp: [], atk: [] }, boss: { hp: [], atk: [] }, raised: [] };
  for (const k of ['foe', 'boss']) for (const s of ['hp', 'atk']) {
    let prev = 0;
    for (let f = 1; f <= 100; f++) {
      let m = lerp(pts[k][s], f);
      if (k === 'boss') { out[k][s].push(m); continue; } /* gardiens : chacun a sa propre force (pas de règle de progression), la courbe suit seulement les notes */
      const real = base(f, k) * m;
      if (real < prev - 1e-9) { const m2 = prev / base(f, k); out.raised.push(`${k === 'boss' ? 'Gardien' : 'Combat'} ${s === 'hp' ? 'PV' : 'ATQ'} étage ${f} : ${m.toFixed(2)} → ${m2.toFixed(2)}`); m = m2; }
      prev = base(f, k) * m;
      out[k][s].push(m);
    }
  }
  out.points = pts;
  out.at = (f, room) => { const k = fam(room); return { hp: out[k].hp[f - 1] ?? 1, atk: out[k].atk[f - 1] ?? 1 }; };
  return out;
}
/* réglages du jeu actuels (pour le rapport) */
export const LAB_EASE = { FOE_EASE, BOSS_EASE };
