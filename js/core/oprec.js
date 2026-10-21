// v539 : enregistreur d'opérations (serveur de partie, voir js/core/ops.js). Chaque appel d'une méthode du jeu venu de
// l'interface (pas d'une autre méthode) est noté avec ses arguments et, si besoin, l'état de la partie en cours juste avant.
// Le jeu l'applique tout de suite ; la liste part ensuite au serveur, qui la rejoue.
import { OPS, getPath, clone } from './ops.js';

export function recordOps(g, onOp, active = () => true) {
  let depth = 0;
  for (const [name, def] of Object.entries(OPS)) {
    const orig = g[name];
    if (typeof orig !== 'function' || def.kind === 'first') continue; // les opérations « first » passent par le serveur d'abord
    g[name] = function rec(...args) {
      if (depth > 0 || !active()) return orig.apply(g, args);
      if (def.kind === 'local') { depth++; try { return orig.apply(g, args); } finally { depth--; } }
      const a = clone(args);
      const s = def.sess ? Object.fromEntries(def.sess.map((p) => [p, clone(getPath(g.s, p)) ?? null])) : undefined;
      const before = def.lazy ? def.lazy(g.s) : undefined;
      depth++;
      let r;
      try { r = orig.apply(g, args); } finally { depth--; }
      if (def.lazy && def.lazy(g.s) === before) return r; // simple lecture : rien n'a changé
      onOp({ m: name, a, ...(s ? { s } : {}) });
      return r;
    };
  }
  return () => depth;
}
