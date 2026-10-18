// Gestion des illustrations : une vraie image si elle est déclarée dans
// assets/art/manifest.json (assets/art/<ID>.webp, ou <ID>-alt.webp pour
// l'illustration alternative), sinon l'illustration procédurale provisoire.
import { renderArt, renderMystery } from './procedural.js';

let available = new Set();
let heroArt = new Set();
let chestArt = new Set();
let factionArt = new Set();
const cache = new Map();
// v473 : dos de cartes au choix du joueur (assets/backs/<clé>.webp), sinon le dos par défaut du manifeste
let defaultBack = null, chosenBack = null;
function paintBack() {
  const u = chosenBack ? `assets/backs/${chosenBack}.webp` : defaultBack;
  if (!u || typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--card-back', `url("${new URL(u, document.baseURI).href}")`);
  document.documentElement.classList.add('has-back');
}
export function setCardBack(key) { chosenBack = key || null; paintBack(); }

export async function loadArtManifest(base = './') {
  try {
    const r = await fetch(base + 'assets/art/manifest.json', { cache: 'no-cache' });
    if (r.ok) {
      const m = await r.json();
      available = new Set(m.available || []);
      heroArt = new Set(m.heroes || []);
      chestArt = new Set(m.chests || []);
      factionArt = new Set(m.factions || []);
      // Dos de carte illustré (facultatif) : assets/backs/back.webp
      if (m.cardBack) { defaultBack = m.cardBack; paintBack(); }
    }
  } catch (e) {
    available = new Set();
  }
}

export function hasRealArt(id, alt = false) { return available.has(alt ? `${id}-alt` : id); }
export function hasHeroArt(key) { return heroArt.has(key); }
// Coffres illustrés : assets/chests/<clé>.webp et <clé>-open.webp
export function hasChestArt(key) { return chestArt.has(key); }
// Symboles de factions illustrés : assets/factions/<clé>.webp, utilisés seulement quand les 7 sont là
// (pour garder un style homogène).
export function factionArtReady(keys) { return keys.every((k) => factionArt.has(k)); }

// Les URL ne sont jamais révoquées : une image déjà affichée peut être
// redécodée par le navigateur à tout moment (défilement, mise en cache).
function remember(key, url) {
  cache.set(key, url);
  return url;
}

export function proceduralUrl(card, { alt = false, lite = false, mystery = false } = {}) {
  const key = `${mystery ? 'm' : alt ? 'a' : lite ? 'l' : 'f'}:${card.id}`;
  if (cache.has(key)) return cache.get(key);
  const svg = mystery ? renderMystery(card) : renderArt(card, { alt, lite });
  return remember(key, URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })));
}

export function artUrl(card, { variant = 'normal', lite = false, mystery = false } = {}) {
  if (!mystery) {
    const alt = variant === 'alt';
    const dir = lite ? 'assets/art/lite/' : 'assets/art/'; // miniature légère pour les petites cartes
    if (hasRealArt(card.id, alt)) return `${dir}${card.id}${alt ? '-alt' : ''}.webp`;
    // Pas d'illustration alternative dédiée : on reprend la vraie image (retournée par le CSS).
    if (alt && hasRealArt(card.id)) return `${dir}${card.id}.webp`;
    return proceduralUrl(card, { alt, lite });
  }
  if (hasRealArt(card.id)) return `assets/art/${lite ? 'lite/' : ''}${card.id}.webp`; // assombrie par le CSS (.is-mystery.real)
  return proceduralUrl(card, { mystery: true });
}
