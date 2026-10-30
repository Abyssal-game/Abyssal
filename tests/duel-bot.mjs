// v540 : joueur automatique qui passe par les coups du jeu (g.duelAct…), comme l'écran de combat : le serveur de partie
// doit pouvoir rejouer le combat à l'identique. Choisit au hasard parmi les actions possibles (dés, compétences, permutations,
// pouvoir d'équipe), défend au hasard (esquive, parade, rien).
import { actionsFor, actionTargets, front, ultReady } from '../js/core/duel.js';

export function playDuelOps(g, where, r, max = 600) {
  for (let n = 0; n < max; n++) {
    const st = g.duelState(where);
    if (st.over) return st;
    if (st.turn === 'ally') {
      if (ultReady(st) && r() < 0.3) { g.duelUlt(where); continue; }
      const actor = st.init ? st.units[st.actor] : front(st, 'ally').find((u) => actionsFor(st, u.uid).some((a) => a.ok));
      const opts = actor ? actionsFor(st, actor.uid).filter((a) => a.ok && (a.key !== 'swap' || r() < 0.1)) : [];
      const a = opts.length ? (r() < 0.6 && opts.find((x) => x.key === 'attack')) || opts[Math.floor(r() * opts.length)] : null;
      if (!a) { g.duelPass(where); }
      else {
        const ts = a.target === 'none' ? [null] : actionTargets(st, actor.uid, a.key);
        if (!ts.length) { g.duelPass(where); }
        else g.duelAct(where, actor.uid, a.key, ts[Math.floor(r() * ts.length)], a.dice ? [0, 1, 3][Math.floor(r() * 3)] : 0);
      }
      continue;
    }
    // tour des ennemis, comme l'écran : chacun joue, le joueur défend, puis fin du tour
    for (let k = 0; k < 16 && !g.duelState(where).over && g.duelState(where).turn === 'enemy'; k++) {
      for (let x = g.duelNext(where); x; x = g.duelNext(where)) {
          const k = Math.floor(r() * 4); /* v928 : une fois sur quatre, la séquence touche par touche (comme l'écran) */
          if (x.s.qte && k === 3) g.duelEnemy(where, x.s.a, 'none', Array.from({ length: 1 + Math.floor(r() * 4) }, () => 'PEx'[Math.floor(r() * 3)]).join(''));
          else g.duelEnemy(where, x.s.a, x.s.qte ? ['none', 'dodge', 'parry'][k % 3] : 'none');
        }
      g.duelEndEnemy(where);
    }
  }
  return g.duelState(where);
}
