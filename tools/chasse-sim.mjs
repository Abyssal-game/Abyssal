// v858 : mesure de la Grande Chasse. Pour chaque bête, des combats joués automatiquement (autoDuel : l'ordinateur joue
// ton équipe, sans esquive ni parade) avec trois équipes (débutante, moyenne, forte). Affiche les dégâts moyens, les tours
// tenus et la part d'équipes tombées avant la fin.
// Usage : node tools/chasse-sim.mjs [combats par bête] [défense : nulle | bonne | experte] [palier 0-3]
// v866 : « bonne » défense = un joueur attentif (55 % d'esquives, 25 % de parades) : c'est lui qui doit tomber avant le Anéantissement.
import { loadCatalog, MemoryStorage, rngFrom } from '../tests/helpers.mjs';
import { Game } from '../js/core/game.js';
import { HUNT_ORDER, HUNT, huntWeek } from '../js/core/chasse.js';
import { autoDuel } from '../js/core/duel.js';

const N = +process.argv[2] || 10, DEF = process.argv[3] || 'bonne', TIER = +process.argv[4] || 0;
const catalog = loadCatalog();
const monday = new Date(2026, 10, 2, 12); // lundi 2 novembre 2026
const w0 = huntWeek(monday);
const dateFor = (key) => { const k = HUNT_ORDER.indexOf(key), d = (((k - w0) % HUNT_ORDER.length) + HUNT_ORDER.length) % HUNT_ORDER.length; return new Date(monday.getTime() + d * 7 * 864e5); };

function player(kind) {
  const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom('sim-' + kind), clock: () => monday });
  const P = { faible: [6, 0, 0, 1], moyen: [40, 6, 8, 5], fort: [120, 30, 30, 9] }[kind];
  g.devGrant({ tickets: { standard: P[0], premium: P[1] } });
  while ((g.s.tickets.standard || 0) > 0) g.openBooster('standard');
  while ((g.s.tickets.premium || 0) > 0) g.openBooster('premium');
  if (P[2]) g.devDuplicates(P[2]);
  g.setTeam(g.autoTeam());
  for (const id of g.team()) { const e = g.s.collection[id]; if (e) e.level = Math.max(e.level || 1, P[3]); }
  return JSON.stringify(g.s);
}
const out = [];
for (const kind of ['faible', 'moyen', 'fort']) {
  const save = player(kind);
  for (const key of HUNT_ORDER) {
    let dmg = 0, rounds = 0, wiped = 0, killed = 0, floor = 0;
    for (let i = 0; i < N; i++) {
      const when = dateFor(key);
      const g = new Game(catalog, new MemoryStorage(), { rng: rngFrom(`${kind}-${key}-${i}`), clock: () => when });
      g.s = JSON.parse(save); g.s.seedBase = 1000 + i; g.s.seedN = 0;
      g.startChasse(TIER);
      floor = g.chasse().floor;
      const st = g.chasse().battle;
      const dr = rngFrom(`def-${kind}-${key}-${i}`);
      autoDuel(st, 60, DEF === 'bonne' ? () => { const x = dr(); return x < 0.55 ? 'dodge' : x < 0.8 ? 'parry' : 'none'; } : DEF === 'experte' ? () => { const x = dr(); return x < 0.45 ? 'dodge' : x < 0.92 ? 'parry' : 'none'; } : undefined);
      const r = g.finishChasse();
      if (r.boss !== key) throw new Error(`bête attendue ${key}, reçue ${r.boss}`);
      dmg += r.dmg; rounds += r.survived ? HUNT.rounds : r.rounds; if (!r.survived) wiped++;
      if (st.units && Object.values(st.units).some((u) => u.boss && u.hp <= 0)) killed++;
    }
    out.push({ équipe: kind, bête: key, étage: floor, dégâts: Math.round(dmg / N), tours: +(rounds / N).toFixed(1), tombées: `${Math.round((wiped / N) * 100)} %`, cataclysme: `${Math.round(((N - wiped) / N) * 100)} %`, abattue: killed });
  }
}
console.table(out);
for (const kind of ['faible', 'moyen', 'fort']) { const l = out.filter((x) => x.équipe === kind); console.log(kind, 'dégâts moyens', Math.round(l.reduce((a, x) => a + x.dégâts, 0) / l.length), 'tours', (l.reduce((a, x) => a + x.tours, 0) / l.length).toFixed(1)); }
