// v512 : Versus Booster : défis de boosters entre joueurs. Le serveur tient les défis et ouvre les boosters
// (supabase/08-versus.sql) ; le jeu tient les éclats misés et ajoute les cartes gagnées.
import { BOOSTERS, LUCK_POINTS } from '../config.js';

export const VERSUS_TYPES = ['standard', 'faction', 'event', 'premium'];
export const VERSUS_MAX = 3; // boosters par défi
export const VERSUS_HOURS = 48; // un défi non relevé expire (mise rendue)

export const stakeOf = (type, packs) => (BOOSTERS[type]?.price || 0) * packs;
export const cardPts = (c) => (LUCK_POINTS[c.rarity] || 0) + (c.variant && c.variant !== 'normal' ? LUCK_POINTS.variant : 0);
export const scoreOf = (cards) => (cards || []).reduce((a, c) => a + (c.pts ?? cardPts(c)), 0);

// v516 : composition libre : jusqu'à 3 boosters de types différents, les mêmes pour les deux joueurs
export const lineupStake = (lineup) => (lineup || []).reduce((a, it) => a + (BOOSTERS[it.type]?.price || 0), 0);
// Composition d'un défi reçu du serveur (nouveau format, ou ancien : un type × N)
export const lineupOf = (r) => (Array.isArray(r?.lineup) && r.lineup.length ? r.lineup
  : Array.from({ length: r?.packs || 1 }, () => ({ type: r?.type, faction: r?.faction || undefined, factions: r?.factions || undefined })));
export const lineupOk = (lineup) => Array.isArray(lineup) && lineup.length >= 1 && lineup.length <= VERSUS_MAX
  && lineup.every((it) => VERSUS_TYPES.includes(it.type) && (it.type !== 'faction' || !!it.faction));

/* v735 : plus de mise (refus d'Apple : un jeu où l'on mise et où l'on peut perdre au hasard est un « jeu d'argent simulé »).
   Chacun garde les cartes de ses propres boosters ; le jeu offre au gagnant un butin : une copie de la plus belle carte
   de l'adversaire (Hyper rare au plus ; à la place d'une Mythique ou d'une Secrète, un coffre abyssal) et un bonus
   d'éclats proportionnel au prix de ses boosters. Seuls `packsPerDay` boosters par jour comptent pour le butin. */
export const VERSUS_PRIZE = { win: 0.4, tie: 0.15, packsPerDay: 6, trophyRar: ['C', 'PC', 'R', 'HR'] };

/* v807 : l'enjeu sans rien perdre de sa collection (demande du propriétaire : « retrouver l'adrénaline »).
   La Série ardente : chaque victoire d'affilée multiplie le butin en éclats du jeu ; une défaite l'éteint (une égalité la garde).
   Paliers de série : un coffre offert en plus. Les Ligues du Choc : chaque duel fait gagner ou perdre des points ; une ligue
   par mois (à l'heure du joueur), on peut redescendre ; au changement de mois, récompense de la ligue où l'on finit. */
export const STREAK_MULT = [1, 1, 1.5, 2, 2.5, 3, 4, 5]; // index = série après la victoire (plafonnée au dernier)
export const streakMult = (n) => STREAK_MULT[Math.max(0, Math.min(n, STREAK_MULT.length - 1))];
export const STREAK_CHESTS = { 3: 'fer', 5: 'or', 7: 'abyssal', 10: 'abyssal' };
export const LEAGUES = [
  { k: 'bronze', name: 'Bronze', min: 0, color: '#C07A45' },
  { k: 'argent', name: 'Argent', min: 100, color: '#C9D2DE' },
  { k: 'or', name: 'Or', min: 250, color: '#F2C14E' },
  { k: 'obsidienne', name: 'Obsidienne', min: 450, color: '#9C7BFF' },
  { k: 'abysse', name: 'Abysse', min: 700, color: '#E0485E' },
];
export const LEAGUE_PTS = { win: 20, tie: 0, lose: -20, streakBonus: 2, streakMax: 10 };
export const LEAGUE_REWARD = { bronze: null, argent: { chests: { fer: 1 } }, or: { chests: { or: 1 } }, obsidienne: { chests: { abyssal: 1 } }, abysse: { chests: { abyssal: 1 }, tickets: { premium: 2 } } };
export const leagueIdx = (pts) => { let i = 0; LEAGUES.forEach((l, k) => { if ((pts || 0) >= l.min) i = k; }); return i; };
export const leagueDelta = (result, streakBefore) => (result === 'win' ? LEAGUE_PTS.win + Math.min(LEAGUE_PTS.streakMax, LEAGUE_PTS.streakBonus * (streakBefore || 0))
  : result === 'lose' ? LEAGUE_PTS.lose : LEAGUE_PTS.tie);
