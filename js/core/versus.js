// v512 : Versus Booster : défis de boosters entre joueurs. Le serveur tient les défis et ouvre les boosters
// (supabase/08-versus.sql) ; le jeu tient les éclats misés et ajoute les cartes gagnées.
import { BOOSTERS, LUCK_POINTS } from '../config.js';

export const VERSUS_TYPES = ['standard', 'faction', 'event', 'premium'];
export const VERSUS_MAX = 3; // boosters par défi
export const VERSUS_HOURS = 48; // un défi non relevé expire (mise rendue)

export const stakeOf = (type, packs) => (BOOSTERS[type]?.price || 0) * packs;
export const cardPts = (c) => (LUCK_POINTS[c.rarity] || 0) + (c.variant && c.variant !== 'normal' ? LUCK_POINTS.variant : 0);
export const scoreOf = (cards) => (cards || []).reduce((a, c) => a + (c.pts ?? cardPts(c)), 0);
