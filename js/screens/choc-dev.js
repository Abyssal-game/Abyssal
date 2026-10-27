// v843 : banc d'essai du Choc des Boosters (Mode Créateur seulement) : jour de la semaine imposé, ligue et Série
// ardente simulées pour l'affichage, Panthéon d'hier simulé (parties tirées sur le téléphone, revisibles).
// Tout reste sur l'appareil (localStorage['abyssal.chocDev2']) : rien n'est envoyé au serveur, rien n'est gagné.
import { drawBooster } from '../core/boosters.js';
import { cardPts } from '../core/versus.js';

const KEY = 'abyssal.chocDev2';
export const DEV_DAYS = [['', 'Vrai jour'], ['mon', 'Lundi'], ['tue', 'Mardi'], ['wed', 'Mercredi'], ['thu', 'Jeudi'], ['fri', 'Vendredi'], ['sat', 'Samedi'], ['sun', 'Dimanche']];
const KIND = { mon: 'normal', tue: 'normal', wed: 'normal', thu: 'normal', fri: 'normal', sat: 'premium', sun: 'mystere' };
export const chocDev = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
export const setChocDev = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* rien */ } };
const on = (g) => !!g?.s?.settings?.dev;
/* le jour imposé (null = vrai jour) */
export const devDayKind = (g) => (on(g) && KIND[chocDev().day]) || null;
/* ligue et série simulées (null = les vraies) */
export const devLeague = (g) => { const d = on(g) ? chocDev() : {}; return { pts: Number.isFinite(d.lg) ? d.lg : null, streak: Number.isFinite(d.streak) ? d.streak : null }; };
export const devHallOn = (g) => on(g) && !!chocDev().hall;

const PSEUDOS = ['Morgana', 'Le Veilleur', 'Nyxara', 'Corbac', 'Sélène', 'Brasier', 'Vorn', 'Ombrelune', 'Kaelith', 'Tisseuse', 'Gravepeine', 'Azraël-7', 'Lyra', 'Draven', 'Mélusine', 'Fendragon'];
const pick = (a, r) => a[Math.floor(r() * a.length)];
/* Un Panthéon d'hier simulé : 40 parties tirées comme au vrai Choc, les 3 plus belles tables et les 3 plus beaux tirages */
export function fakeHall(cat, lineupOf, kind = 'normal') {
  const r = Math.random, cards = (cat.cards || []).filter((c) => c.rarity === 'HR' || c.rarity === 'M' || c.rarity === 'S');
  const pk = (it) => drawBooster(it.type, cat, it.type === 'faction' ? { faction: it.faction } : it.type === 'event' ? { event: { factions: it.factions } } : {}).cards.map((c) => { const x = { id: c.id, rarity: c.rarity, variant: c.variant || 'normal' }; return { ...x, pts: cardPts(x) }; });
  const player = (i) => ({ id: `sim-${i}`, pseudo: PSEUDOS[i % PSEUDOS.length], avatar: cards.length ? pick(cards, r).id : null, frame: null, plate: null, badge: null });
  const games = [];
  for (let k = 0; k < 40; k++) {
    const lineup = lineupOf(kind), a = lineup.map(pk), b = lineup.map(pk);
    const ta = a.flat().reduce((n, c) => n + c.pts, 0), tb = b.flat().reduce((n, c) => n + c.pts, 0);
    const i = Math.floor(r() * PSEUDOS.length); let j = Math.floor(r() * PSEUDOS.length); if (j === i) j = (j + 1) % PSEUDOS.length;
    const best = (p) => p.flat().slice().sort((x, y) => y.pts - x.pts).slice(0, 3);
    games.push({ sum: ta + tb, kind, lineup, packs: { a, b }, winner: ta > tb ? 'a' : tb > ta ? 'b' : 'draw',
      a: { ...player(i), total: ta, best: best(a) }, b: { ...player(j), total: tb, best: best(b) } });
  }
  const tables = games.slice().sort((x, y) => y.sum - x.sum).slice(0, 3);
  const pulls = games.flatMap((m) => ['a', 'b'].flatMap((s) => m.packs[s].flat().map((c) => ({ card: c, player: m[s], won: m.winner === s }))))
    .sort((x, y) => y.card.pts - x.card.pts).slice(0, 3);
  const d = new Date(Date.now() - 86400000);
  return { sim: true, day: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, games: 40, tables, cards: pulls };
}
