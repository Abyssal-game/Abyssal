// Composant carte : miniature (grilles) et grand format (vue détaillée, ouverture).
import { RARITY, VARIANTS } from '../config.js';
import { artUrl } from '../art/assets.js';
import { sigil, icon } from './icons.js';
import { esc } from './dom.js';
import { seeded } from '../art/geometry.js';

let catalogRef = null;
export function setCardCatalog(c) { catalogRef = c; }

const STAT_LABELS = [['atk', 'ATQ'], ['def', 'DÉF'], ['spd', 'VIT'], ['mag', 'MAG'], ['hp', 'PV']];

export function abilityText(a) {
  const def = catalogRef?.abilities[a.key];
  if (!def) return { name: a.key, desc: '' };
  return { name: def.name + (a.value ? ` ${a.value}` : ''), desc: def.desc.replace('{v}', a.value ?? '') };
}

function hueFor(id) { return Math.floor(seeded('hue:' + id)() * 300) + 30; }

/**
 * @param card    carte du catalogue
 * @param opts    { size: 'mini'|'full', variant, known, lazy, count, isNew, mystery, nameKnown, tag }
 */
export function cardHTML(card, opts = {}) {
  const { size = 'mini', variant = 'normal', lazy = false, count = 0, isNew = false, mystery = false, nameKnown = false, tag = '' } = opts;
  const r = RARITY[card.rarity];
  const fc = catalogRef?.faction[card.faction]?.colors.secondary || '#888';
  const cls = ['tcg', `tcg-${size}`, `r-${card.rarity}`, `f-${card.faction}`, mystery ? 'is-mystery' : `v-${variant}`].join(' ');
  const style = `--rc:${r.color};--fc:${fc};--hue:${hueFor(card.id)}deg`;
  const lite = size === 'mini';
  const img = lazy
    ? `<img alt="" decoding="async" data-lazy="${lite ? 1 : 0}${mystery ? 1 : 0}" data-card="${card.id}" data-variant="${variant}">`
    : `<img alt="" decoding="async" src="${artUrl(card, { variant, lite, mystery })}" data-card="${card.id}" data-variant="${variant}">`;
  const name = mystery ? (nameKnown ? esc(card.name) : '???') : esc(card.name);
  const label = mystery ? `Carte non découverte ${card.id}${nameKnown ? ', ' + card.name : ''}` : `${card.name}, ${r.name}${variant !== 'normal' ? ', ' + VARIANTS[variant].name : ''}`;

  if (size === 'mini') {
    return `<div class="${cls}" style="${style}" data-id="${card.id}" role="button" tabindex="0" aria-label="${esc(label)}">
      <div class="tcg-art">${img}</div><div class="tcg-shine"></div><div class="tcg-frame"></div>
      ${mystery ? `<div class="tcg-lock">${icon('lock')}</div>` : `<span class="tcg-cost">${card.stats.cost}</span>`}
      <span class="tcg-sig">${sigil(card.faction)}</span>
      <div class="tcg-plate"><span class="tcg-gem">${r.short}</span><span class="tcg-nm">${name}</span></div>
      ${count > 1 ? `<span class="tcg-count">×${count}</span>` : ''}${isNew ? '<span class="tcg-new">Nouveau</span>' : ''}${tag}
    </div>`;
  }
  // Grand format
  const ab = card.abilities.map(abilityText);
  const stats = STAT_LABELS.map(([k, l]) => `<span class="st"><b>${card.stats[k]}</b><i>${l}</i></span>`).join('');
  return `<div class="${cls}" style="${style}" data-id="${card.id}" aria-label="${esc(label)}">
    <div class="tcg-art">${img}</div><div class="tcg-shine"></div><div class="tcg-glare"></div><div class="tcg-frame"></div>
    <div class="tcg-head">
      <span class="tcg-cost" title="Coût d’invocation">${card.stats.cost}</span>
      <span class="tcg-titles"><span class="tcg-nm">${name}</span>${mystery ? '' : `<span class="tcg-sub">${esc(card.title)}</span>`}</span>
      <span class="tcg-sig" title="${esc(catalogRef?.faction[card.faction]?.name || '')}">${sigil(card.faction)}</span>
    </div>
    ${mystery ? `<div class="tcg-body"><p class="tcg-hidden">Page scellée du Bestiaire</p><div class="tcg-foot"><span class="tcg-gem">${r.short}</span><span>${card.id}</span><span>${r.name}</span></div></div>` : `
    <div class="tcg-body">
      <div class="tcg-type">${esc(card.category)} · Puissance ${card.power}</div>
      ${ab.length ? `<div class="tcg-abil">${ab.map((a) => `<p><b>${esc(a.name)}</b> ${esc(a.desc)}</p>`).join('')}</div>` : '<div class="tcg-abil"><p class="muted">Aucune capacité particulière.</p></div>'}
      <p class="tcg-lore">« ${esc(card.lore)} »</p>
      <div class="tcg-stats">${stats}</div>
      <div class="tcg-foot"><span class="tcg-gem">${r.short}</span><span>${card.id}</span><span>${variant !== 'normal' ? esc(VARIANTS[variant].name) : r.name}</span></div>
    </div>`}
  </div>`;
}

// Chargement différé des illustrations des grilles.
let io = null;
export function lazyArt(root) {
  const load = (i) => {
    const f = i.dataset.lazy;
    if (f === undefined) return;
    const card = catalogRef.get(i.dataset.card);
    i.src = artUrl(card, { variant: i.dataset.variant, lite: f[0] === '1', mystery: f[1] === '1' });
    i.removeAttribute('data-lazy');
  };
  const imgs = root.querySelectorAll('img[data-lazy]');
  if (!('IntersectionObserver' in window)) { imgs.forEach(load); return; }
  if (!io) io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } });
  }, { rootMargin: '400px 0px' });
  imgs.forEach((i) => io.observe(i));
}

// Inclinaison et reflet suivant le doigt ou la souris (grand format).
export function enableTilt(el, { reduced = false } = {}) {
  const card = el.classList.contains('tcg') ? el : el.querySelector('.tcg');
  if (!card) return () => {};
  let raf = 0;
  const set = (x, y) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      card.style.setProperty('--mx', `${x * 100}%`);
      card.style.setProperty('--my', `${y * 100}%`);
      if (!reduced) card.style.transform = `perspective(900px) rotateY(${(x - 0.5) * 16}deg) rotateX(${(0.5 - y) * 16}deg)`;
    });
  };
  const move = (e) => {
    const r = card.getBoundingClientRect();
    set(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
  };
  const leave = () => { cancelAnimationFrame(raf); card.style.transform = ''; card.style.removeProperty('--mx'); card.style.removeProperty('--my'); card.classList.remove('tilting'); };
  const down = () => card.classList.add('tilting');
  card.addEventListener('pointermove', move);
  card.addEventListener('pointerdown', down);
  card.addEventListener('pointerleave', leave);
  card.addEventListener('pointerup', leave);
  card.addEventListener('pointercancel', leave);
  return leave;
}

// Repli si une vraie illustration déclarée est introuvable.
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName !== 'IMG' || !img.dataset.card || img.dataset.fallback) return;
  const card = catalogRef?.get(img.dataset.card);
  if (!card) return;
  img.dataset.fallback = '1';
  import('../art/assets.js').then(({ proceduralUrl }) => { img.src = proceduralUrl(card, { alt: img.dataset.variant === 'alt' }); });
}, true);
