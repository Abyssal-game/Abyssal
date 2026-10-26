// v803 : Mode Créateur → Choc des Boosters (essai) : un face-à-face complet contre un adversaire fictif, sans serveur.
// Les boosters des deux camps sont tirés sur le téléphone (même tirage que la boutique, sans garantie de chance),
// la mise en scène est celle du vrai Choc (playDuel). Rien n'est payé, gagné ni enregistré.
import { FACTION_ORDER } from '../config.js';
import { drawBooster } from '../core/boosters.js';
import { cardPts, scoreOf, streakMult, leagueIdx, leagueDelta, STREAK_CHESTS } from '../core/versus.js';
import { FREE_EMOTES } from '../core/codex.js';
import { playDuel } from './versus-duel.js';
import { toast } from '../ui/dom.js';

export const TEST_LINEUPS = {
  std1: [{ type: 'standard' }],
  mix3: [{ type: 'standard' }, { type: 'faction' }, { type: 'premium' }],
  prem3: [{ type: 'premium' }, { type: 'premium' }, { type: 'premium' }],
};
const FOES = ['Vesna', 'Orvel', 'Ilda', 'Le Maître', 'L’Archiviste'];

export function playTestDuel(app, { lineup = TEST_LINEUPS.std1, force = 'any', streak = null, onClose } = {}) {
  const g = app.game, cat = g.catalog, ev = g.event();
  const L = lineup.map((it) => (it.type === 'faction' && !it.faction ? { ...it, faction: FACTION_ORDER[Math.floor(Math.random() * FACTION_ORDER.length)] } : { ...it }));
  const side = () => L.flatMap((it) => drawBooster(it.type, cat, { faction: it.faction, event: ev }).cards).map((c) => ({ ...c, pts: cardPts(c) }));
  let mine, theirs;
  for (let i = 0; i < 400; i++) {
    mine = side(); theirs = side();
    const a = scoreOf(mine), b = scoreOf(theirs);
    const res = a > b ? 'win' : a === b ? 'tie' : 'lose';
    if (force === 'any' || force === res) break;
  }
  if (force === 'tie' && scoreOf(mine) !== scoreOf(theirs)) {
    /* égalité rare au hasard : l'adversaire reçoit d'autres cartes de mêmes raretés et finitions */
    theirs = mine.map((c) => { const pool = cat.byRarity[c.rarity] || []; const k = pool[Math.floor(Math.random() * pool.length)] || c; return { ...c, id: k.id }; });
  }
  const r = { lineup: L, my_cards: mine, their_cards: theirs, my_score: scoreOf(mine), their_score: scoreOf(theirs), avatar: theirs.slice().sort((x, y) => y.pts - x.pts)[0]?.id };
  const res = r.my_score > r.their_score ? 'win' : r.my_score === r.their_score ? 'tie' : 'lose';
  /* v807 : série et ligue simulées à partir des tiennes (rien n'est enregistré) ; série de l'adversaire et réaction au hasard */
  const v = g.s.versus || {}, before = streak ?? (v.streak || 0), after = res === 'win' ? before + 1 : res === 'lose' ? 0 : before;
  const pts0 = v.lg?.pts || 0, pts1 = Math.max(0, pts0 + leagueDelta(res, before));
  const out = { result: res, pick: res === 'win', mult: res === 'win' ? streakMult(after) : 1, shards: res === 'win' ? Math.round(160 * streakMult(after) / 5) * 5 : res === 'tie' ? 60 : 0,
    streakChest: res === 'win' ? STREAK_CHESTS[after] || null : null,
    streak: { before, after, broken: res === 'lose' && before >= 2 }, league: { before: leagueIdx(pts0), after: leagueIdx(pts1), pts: pts1, delta: pts1 - pts0 } };
  r.choc = { s: Math.floor(Math.random() * 7), l: Math.floor(Math.random() * 5), m: new Date(g.clock()).toISOString().slice(0, 7) };
  if (Math.random() < 0.6) r.their_react = FREE_EMOTES[Math.floor(Math.random() * FREE_EMOTES.length)];
  playDuel(app, r, out, {
    foeName: `${FOES[Math.floor(Math.random() * FOES.length)]} (essai)`,
    myAvatar: g.shownAvatar(),
    onPick: async (i) => { const c = theirs[i]; toast('Duel d’essai : rien n’est ajouté à ta collection.', { icon: 'info' }); return c && (c.rarity === 'M' || c.rarity === 'S') ? { chest: true } : { trophy: { id: c?.id, isNewCard: c && !g.owns(c.id) } }; },
    onReact: async () => { toast('Duel d’essai : la réaction n’est pas envoyée.', { icon: 'info' }); },
    onRematch: () => { toast('Duel d’essai : pas de revanche à envoyer.', { icon: 'info' }); onClose?.(); },
    onClose,
  });
}
