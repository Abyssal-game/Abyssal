// Adversaire de l'Arène : choix glouton mais raisonnable, une action à la fois
// (l'interface peut ainsi animer chaque coup).
import { canPlay, play, canAttack, attack, targets, effAtk, reduction, endTurn } from './engine.js';

// Renvoie la prochaine action de l'IA, ou { type: 'end' }.
export function nextAction(state, p) {
  const pl = state.players[p], foe = state.players[1 - p];
  // 1. Invoquer la carte la plus chère jouable
  const playable = pl.hand.map((id, i) => ({ i, cost: state.lib[id].stats.cost })).filter((x) => canPlay(state, p, x.i)).sort((a, b) => b.cost - a.cost);
  if (playable.length) return { type: 'play', index: playable[0].i };
  // 2. Attaquer
  const ready = pl.board.filter((u) => canAttack(state, p, u.uid));
  if (!ready.length) return { type: 'end' };
  const lethal = ready.reduce((s, u) => s + (targets(state, p, u.uid).includes('hero') ? effAtk(state, u) : 0), 0) >= foe.hp;
  for (const u of ready.sort((a, b) => effAtk(state, b) - effAtk(state, a))) {
    const t = targets(state, p, u.uid);
    if (lethal && t.includes('hero')) return { type: 'attack', uid: u.uid, target: 'hero' };
    const atk = effAtk(state, u);
    let best = null, bestScore = 0;
    for (const tid of t) {
      if (tid === 'hero') continue;
      const v = foe.board.find((x) => x.uid === tid);
      const kills = !v.aegis && Math.max(1, atk - reduction(state, v)) >= v.hp;
      const back = effAtk(state, v);
      const dies = !u.aegis && Math.max(1, back - reduction(state, u)) >= u.hp;
      let score = 0;
      if (kills) score += 4 + v.cost + effAtk(state, v);
      if (dies) score -= 2 + u.cost;
      if (v.ab.guard) score += 1;
      if (score > bestScore) { bestScore = score; best = tid; }
    }
    if (best !== null) return { type: 'attack', uid: u.uid, target: best };
    if (t.includes('hero')) return { type: 'attack', uid: u.uid, target: 'hero' };
    if (t.length) return { type: 'attack', uid: u.uid, target: t[0] };
  }
  return { type: 'end' };
}

export function applyAction(state, p, a) {
  if (a.type === 'play') return play(state, p, a.index);
  if (a.type === 'attack') return attack(state, p, a.uid, a.target);
  return endTurn(state, p);
}

// Joue un tour complet (utile pour les tests et les simulations).
export function playTurn(state, p, maxSteps = 40) {
  let s = state;
  for (let i = 0; i < maxSteps && !s.over && s.active === p; i++) s = applyAction(s, p, nextAction(s, p));
  if (!s.over && s.active === p) s = endTurn(s, p);
  return s;
}
