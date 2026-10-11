// Portraits et vignettes des héros. Image définitive : assets/heroes/<clé>.webp
// (déclarée dans la liste « heroes » du manifeste), sinon un portrait provisoire généré.
import { HEROES, INVOCATIONS, xpToNext } from '../core/heroes.js';
import { hasHeroArt } from '../art/assets.js';
import { esc } from './dom.js';

const SIGILS = {
  brenna: '<path d="M50 14v72M30 22c14 0 20 8 20 18 0-10 6-18 20-18-2 14-8 22-20 22-12 0-18-8-20-22z" stroke-width="5"/><path d="M38 86h24" stroke-width="5"/>',
  aldric: '<path d="M50 14 24 24v24c0 18 11 30 26 38 15-8 26-20 26-38V24z" stroke-width="5"/><path d="M50 30v40M36 46h28" stroke-width="5"/>',
  sylea: '<path d="M30 16c26 14 26 54 0 68" stroke-width="5"/><path d="M30 16v68M22 50h56M68 42l10 8-10 8" stroke-width="4"/>',
  morgane: '<circle cx="50" cy="50" r="22" stroke-width="5"/><path d="M50 14v10M50 76v10M14 50h10M76 50h10M25 25l7 7M68 68l7 7M25 75l7-7M68 32l7-7" stroke-width="4"/>',
};
const cache = new Map();
export function heroArtUrl(key) {
  if (hasHeroArt(key)) return `assets/heroes/${key}.webp`;
  if (cache.has(key)) return cache.get(key);
  const h = HEROES[key];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420"><defs><radialGradient id="g" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="${h.color}" stop-opacity=".55"/><stop offset=".55" stop-color="#160F1E"/><stop offset="1" stop-color="#07070B"/></radialGradient></defs>
<rect width="300" height="420" fill="url(#g)"/><g transform="translate(70 70) scale(1.6)" fill="none" stroke="${h.color}" stroke-linecap="round" stroke-linejoin="round" opacity=".9">${SIGILS[key]}</g>
<text x="150" y="340" text-anchor="middle" font-family="Georgia,serif" font-size="30" font-weight="700" fill="${h.color}" letter-spacing="3">${esc(h.cls.toUpperCase())}</text>
<text x="150" y="372" text-anchor="middle" font-family="Georgia,serif" font-size="17" fill="#D9D0BF" opacity=".75">Portrait à venir</text></svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  cache.set(key, url);
  return url;
}

// Vignette de héros (sélection d'équipe, écran Héros)
export function heroCardHTML(g, key, { selected = false, order = 0, act = '' } = {}) {
  const h = HEROES[key], info = g.heroInfo(key), w = g.heroWounded(key);
  return `<button class="hc ${selected ? 'on' : ''} ${w ? 'wounded' : ''}" data-hero="${key}" ${act ? `data-act="${act}"` : ''} style="--hc:${h.color}">
    <span class="hc-art"><img alt="" src="${heroArtUrl(key)}"></span>
    ${order ? `<span class="dc-ord">${order}</span>` : ''}
    <span class="hc-lv">Niv. ${info.level}</span>
    ${w ? `<span class="hc-w">Blessé · ${Math.ceil(g.woundLeft(key) / 3600000)} h</span>` : ''}
    <span class="hc-t"><b>${esc(h.name)}</b><span>${esc(h.cls)} · ${esc(h.race)}</span>
      <span class="xpbar"><i style="width:${info.need ? (info.into / info.need) * 100 : 100}%"></i></span></span>
  </button>`;
}

export function invocationCardHTML(g, key, { selected = false } = {}) {
  const inv = INVOCATIONS[key], open = g.invocationUnlocked(key);
  const lv = g.invocationLevel(key);
  const lock = inv.unlock.card ? `Possède la carte ${esc(inv.name)}, ou atteins l’étage ${inv.unlock.depth}` : '';
  return `<button class="ic-c ${selected ? 'on' : ''} ${open ? '' : 'locked'}" data-inv="${key}" ${open ? '' : 'disabled'} style="--hc:${inv.color}">
    <span class="ic-art" data-card="${inv.card}"></span>
    <span class="ic-t"><b>${esc(inv.name)}</b>${open ? `<span class="small">Niv. ${lv}</span>` : `<span class="small">${lock}</span>`}</span>
  </button>`;
}
export { xpToNext };
