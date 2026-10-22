// Amis (v500) : la fiche publiée pour ses amis. Un résumé de la partie (jamais la sauvegarde complète) :
// collection (finitions et niveaux), succès, ensembles, statistiques. Lu par l'écran Amis (js/screens/friends.js).
export const CARD_VERSION = 1;
// finitions possédées d'une carte, en bits (normale, argentée, enluminée, abyssale)
export const VARIANT_BITS = { normal: 1, holo: 2, gold: 4, galaxy: 8, crystal: 16, prism: 32 };

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
    lv: g.levelInfo().level, title: s.title || '', frame: s.frame || null, plate: s.plate || null, fond: s.fond || null, avatar: (g.shownAvatar ? g.shownAvatar() : s.avatar) || null,
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

// v538 : une fiche vient d'un autre joueur (peut-être d'une app modifiée) : on ne garde que des valeurs du bon type,
// jamais de texte qui pourrait finir dans la page sans être échappé (clés, nombres bornés).
const int = (x, max = 1e7) => { const n = Math.floor(Number(x)); return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0; };
const key = (x) => (typeof x === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(x) ? x : null);
const keys = (a, n) => (Array.isArray(a) ? a.map(key).filter(Boolean).slice(0, n) : []);
export function cleanCard(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const col = {};
  if (d.col && typeof d.col === 'object') for (const [id, x] of Object.entries(d.col).slice(0, 3000)) {
    if (!key(id)) continue;
    col[id] = Array.isArray(x) ? [int(x[0], 63), Math.max(1, int(x[1], 99))] : int(x, 63);
  }
  const st = d.st && typeof d.st === 'object' ? d.st : {}, gm = st.games && typeof st.games === 'object' ? st.games : {};
  const games = {};
  for (const k of ['sceaux', 'pacte', 'cryptes', 'encheres']) games[k] = { w: int(gm[k]?.w), b: int(gm[k]?.b, 99) };
  return {
    v: int(d.v, 99), lv: Math.max(1, int(d.lv, 9999)), title: typeof d.title === 'string' ? d.title.slice(0, 60) : '', frame: key(d.frame), plate: key(d.plate), fond: key(d.fond), avatar: key(d.avatar),
    show: keys(d.show, 3), titles: int(d.titles, 999), col, ach: keys(d.ach, 1000), sets: keys(d.sets, 500),
    st: { boosters: int(st.boosters), best: int(st.best, 9999), bosses: int(st.bosses, 999), trials: int(st.trials), night: int(st.night, 9999), games },
    ...(d.n != null ? { n: int(d.n, 9999) } : {}), partial: !!d.partial,
  };
}
