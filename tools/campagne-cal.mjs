// v871 : calage de la difficulté de la campagne. Pour chaque étage, cherche (par dichotomie) le multiplicateur des PV et de
// l'attaque des ennemis qui donne le taux de victoires visé (courbe CIBLE ci-dessous, équipe type à la force conseillée,
// défense « mid » du Labo). Écrit un JSON { étage: multiplicateur } : on reporte ensuite ces valeurs dans FOE_EASE / BOSS_EASE
// (js/core/descent.js), lissées. Usage : node tools/campagne-cal.mjs <premier> <dernier> [combats par essai = 30] > sortie.json
import { loadCatalog, MemoryStorage, rngFrom } from '../tests/helpers.mjs';
import { Game } from '../js/core/game.js';
import { labSimulate } from '../js/core/lab.js';

const lerp = (pts, f) => { if (f <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (f <= pts[i][0]) { const [a, x] = pts[i - 1], [b, y] = pts[i]; return x + (y - x) * (f - a) / (b - a); } return pts.at(-1)[1]; };
export const CIBLE = {
  fight: [[1, 95], [8, 95], [20, 85], [50, 75], [100, 62]],
  boss: [[5, 88], [15, 82], [25, 75], [50, 62], [75, 50], [100, 45]],
};
const A = +process.argv[2] || 1, B = +process.argv[3] || A, N = +process.argv[4] || 30;
const g = new Game(loadCatalog(), new MemoryStorage(), { rng: rngFrom('cal'), clock: () => new Date(2026, 10, 2, 12) });
const out = {};
for (let f = A; f <= B; f++) {
  const room = f % 5 === 0 ? 'boss' : 'fight', target = lerp(CIBLE[room], f);
  let lo = Math.log(0.55), hi = Math.log(1.8), best = null;
  for (let k = 0; k < 6; k++) {
    const m = Math.exp((lo + hi) / 2), r = labSimulate(g, { floor: f, room, level: 'type', hp: m, atk: m }, N, 'mid');
    if (!best || Math.abs(r.win - target) < Math.abs(best.win - target)) best = { m, win: r.win };
    if (r.win > target) lo = Math.log(m); else hi = Math.log(m);
  }
  out[f] = { m: +best.m.toFixed(3), win: best.win, target: Math.round(target), room };
  process.stderr.write(`${f} ${room} m=${best.m.toFixed(3)} win=${best.win} cible=${Math.round(target)}\n`);
}
console.log(JSON.stringify(out));
