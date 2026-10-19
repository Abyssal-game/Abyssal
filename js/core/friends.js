// Amis (v500) : la fiche publiée pour ses amis. Un résumé de la partie (jamais la sauvegarde complète) :
// collection (finitions et niveaux), succès, ensembles, statistiques. Lu par l'écran Amis (js/screens/friends.js).
export const CARD_VERSION = 1;
// finitions possédées d'une carte, en bits (normale, argentée, enluminée, abyssale)
export const VARIANT_BITS = { normal: 1, holo: 2, gold: 4, galaxy: 8 };

export function friendCard(g) {
  const s = g.s, col = {};
  for (const [id, e] of Object.entries(s.collection || {})) {
    if (!g.catalog.get(id)) continue;
    let b = 0;
    for (const [k, n] of Object.entries(e.v || {})) if (n > 0 && VARIANT_BITS[k]) b |= VARIANT_BITS[k];
    const lv = e.lv || 1;
    col[id] = lv > 1 ? [b, lv] : b;
  }
  const game = (k) => ({ w: s[k]?.wins || 0, b: Object.keys(s[k]?.beaten || {}).length });
  return {
    v: CARD_VERSION,
    lv: g.levelInfo().level, title: s.title || '', frame: s.frame || null, avatar: s.avatar || null,
    show: (s.showcase || []).filter((id) => col[id] !== undefined).slice(0, 3),
    titles: (s.titles || []).length,
    col,
    ach: Object.keys(s.achievements || {}),
    sets: Object.keys(s.setsDone || {}),
    st: {
      boosters: s.stats?.boosters || 0, best: s.descent?.best || 0, bosses: Object.keys(s.bossesBeaten || {}).length,
      trials: s.stats?.trialWins || 0, night: Math.max(0, ...Object.values(s.descent?.nightBest || {}).map(Number).filter((x) => x >= 0)),
      games: { sceaux: game('sceaux'), pacte: game('pacte'), cryptes: game('cryptes'), encheres: game('encheres') },
    },
  };
}

// Lecture d'une fiche reçue : finitions et niveau d'une carte
export function cardEntry(card, id) {
  const x = card?.col?.[id];
  if (x === undefined) return null;
  const [b, lv] = Array.isArray(x) ? x : [x, 1];
  return { bits: b, lv: lv || 1, variants: Object.entries(VARIANT_BITS).filter(([, bit]) => b & bit).map(([k]) => k) };
}
