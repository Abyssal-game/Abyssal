// Composant carte : miniature (grilles) et grand format (vue détaillée, ouverture).
import { RARITY, VARIANTS } from '../config.js';
import { artUrl, hasRealArt } from '../art/assets.js';
import { sigil, icon } from './icons.js';
import { esc } from './dom.js';
import { seeded } from '../art/geometry.js';

let catalogRef = null;
export function setCardCatalog(c) { catalogRef = c; }

function hueFor(id) { return Math.floor(seeded('hue:' + id)() * 300) + 30; }

/**
 * @param card    carte du catalogue
 * @param opts    { size: 'mini'|'full', variant, known, lazy, count, isNew, mystery, nameKnown, tag }
 */
export function cardHTML(card, opts = {}) {
  const { size = 'mini', variant = 'normal', lazy = false, count = 0, isNew = false, mystery = false, nameKnown = false, tag = '' } = opts;
  const r = RARITY[card.rarity];
  const fc = catalogRef?.faction[card.faction]?.colors.secondary || '#888';
  const cls = ['tcg', `tcg-${size}`, `r-${card.rarity}`, `f-${card.faction}`, mystery ? 'is-mystery' : `v-${variant}`, hasRealArt(card.id) ? 'real' : ''].join(' ');
  const style = `--rc:${r.color};--fc:${fc};--hue:${hueFor(card.id)}deg`;
  const lite = size === 'mini';
  const img = lazy
    ? `<img alt="" decoding="async" data-lazy="${lite ? 1 : 0}${mystery ? 1 : 0}" data-card="${card.id}" data-variant="${variant}">`
    : `<img alt="" decoding="async" src="${artUrl(card, { variant, lite, mystery })}" data-card="${card.id}" data-variant="${variant}">`;
  const name = mystery ? (nameKnown ? esc(card.name) : 'Inconnue') : esc(card.name);
  const label = mystery ? `Carte non découverte ${card.id}${nameKnown ? ', ' + card.name : ''}` : `${card.name}, ${r.name}${variant !== 'normal' ? ', ' + VARIANTS[variant].name : ''}`;

  if (size === 'mini') {
    return `<div class="${cls}" style="${style}" data-id="${card.id}" role="button" tabindex="0" aria-label="${esc(label)}">
      <div class="tcg-art">${img}</div><div class="tcg-shine"></div><div class="tcg-frame"></div>
      ${mystery ? `<div class="tcg-lock">${icon('lock')}</div>` : variant !== 'normal' ? `<span class="tcg-vbadge">${VARIANTS[variant].short}</span>` : ''}
      <span class="tcg-sig">${sigil(card.faction)}</span>
      <div class="tcg-plate"><span class="tcg-gem">${r.short}</span><span class="tcg-nm">${name}</span></div>
      ${count > 1 ? `<span class="tcg-count">×${count}</span>` : ''}${isNew ? '<span class="tcg-new">Nouveau</span>' : ''}${tag}
    </div>`;
  }
  // Grand format : l'illustration d'abord, un bandeau de nom et un court texte.
  const fac = catalogRef?.faction[card.faction];
  const total = catalogRef ? catalogRef.byFaction[card.faction].length : 0;
  return `<div class="${cls}" style="${style}" data-id="${card.id}" aria-label="${esc(label)}">
    <div class="tcg-art">${img}</div><div class="tcg-shine"></div><div class="tcg-glare"></div><div class="tcg-frame"></div>
    <div class="tcg-head">
      <span class="tcg-titles"><span class="tcg-nm">${name}</span>${mystery ? '' : `<span class="tcg-sub">${esc(card.title)}</span>`}</span>
      <span class="tcg-sig" title="${esc(fac?.name || '')}">${sigil(card.faction)}</span>
    </div>
    <div class="tcg-body">
      ${mystery ? '<p class="tcg-hidden">Page scellée du Bestiaire</p>' : `<div class="tcg-type">${esc(card.category)} · ${esc(fac?.name || '')}</div><p class="tcg-lore">« ${esc(card.lore)} »</p>`}
      <div class="tcg-foot"><span class="tcg-gem">${r.short}</span><span>${card.id} · ${card.number}/${total}</span><span>${!mystery && variant !== 'normal' ? esc(VARIANTS[variant].name) : r.name}</span></div>
    </div>
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

// Inclinaison 3D de la carte entière (cadre compris) : au doigt, à la souris,
// ou avec le gyroscope du téléphone. Mouvement amorti, retour en douceur.
let gyro = { on: false, beta: null, gamma: null };
function onOrient(e) { if (e.beta != null) { gyro.beta = e.beta; gyro.gamma = e.gamma; } }
export function gyroAvailable() { return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches; }
export function gyroOn() { return gyro.on; }
export async function setGyro(on) {
  if (on) {
    try {
      const D = window.DeviceOrientationEvent;
      if (D && typeof D.requestPermission === 'function' && (await D.requestPermission()) !== 'granted') return false;
    } catch (e) { return false; }
    window.addEventListener('deviceorientation', onOrient);
    gyro.on = true;
  } else {
    window.removeEventListener('deviceorientation', onOrient);
    gyro = { on: false, beta: null, gamma: null };
  }
  return gyro.on;
}

export function enableTilt(el, { reduced = false } = {}) {
  const card = el.classList.contains('tcg') ? el : el.querySelector('.tcg');
  if (!card) return () => {};
  const MAX = 24;
  let cur = { x: 0, y: 0 }, tgt = { x: 0, y: 0 };
  let touching = false, raf = 0, alive = true, start = null, moved = false, t0 = performance.now();
  let base = null; // orientation de référence du téléphone
  const apply = () => {
    card.style.transform = reduced ? '' : `perspective(800px) rotateX(${cur.x.toFixed(2)}deg) rotateY(${cur.y.toFixed(2)}deg)`;
    // le reflet suit l'angle : comme une vraie carte sous une lampe
    card.style.setProperty('--mx', `${(50 + (cur.y / MAX) * 50).toFixed(1)}%`);
    card.style.setProperty('--my', `${(50 - (cur.x / MAX) * 50).toFixed(1)}%`);
    card.style.setProperty('--tilt', (Math.min(1, Math.hypot(cur.x, cur.y) / MAX)).toFixed(3));
  };
  const loop = (now) => {
    if (!alive) return;
    if (!touching) {
      if (gyro.on && gyro.beta != null) {
        if (!base) base = { b: gyro.beta, g: gyro.gamma };
        base.b += (gyro.beta - base.b) * 0.004; base.g += (gyro.gamma - base.g) * 0.004; // se recentre lentement
        tgt.x = Math.max(-MAX, Math.min(MAX, -(gyro.beta - base.b) * 0.9));
        tgt.y = Math.max(-MAX, Math.min(MAX, (gyro.gamma - base.g) * 0.9));
      } else if (!reduced) {
        const t = (now - t0) / 1000; // léger balancement au repos pour faire vivre les reflets
        tgt.x = Math.sin(t * 0.9) * 3.5; tgt.y = Math.cos(t * 0.7) * 5;
      } else { tgt.x = 0; tgt.y = 0; }
    }
    const k = touching ? 0.35 : 0.08;
    cur.x += (tgt.x - cur.x) * k; cur.y += (tgt.y - cur.y) * k;
    apply();
    raf = requestAnimationFrame(loop);
  };
  const fromPoint = (e) => {
    const r = card.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    tgt.y = (px - 0.5) * 2 * MAX; tgt.x = (0.5 - py) * 2 * MAX;
  };
  const down = (e) => {
    touching = true; moved = false; start = { x: e.clientX, y: e.clientY };
    card.classList.add('tilting');
    try { card.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
    fromPoint(e);
  };
  const move = (e) => {
    if (e.pointerType === 'mouse' && !touching) { fromPoint(e); card.classList.add('tilting'); return; }
    if (!touching) return;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) moved = true;
    fromPoint(e);
  };
  const up = () => { touching = false; card.classList.remove('tilting'); tgt.x = 0; tgt.y = 0; t0 = performance.now(); };
  const leave = (e) => { if (e.pointerType === 'mouse') up(); };
  // un glissé ne doit pas compter comme un toucher (bascule de l'illustration)
  const click = (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } };
  card.addEventListener('pointerdown', down);
  card.addEventListener('pointermove', move);
  card.addEventListener('pointerup', up);
  card.addEventListener('pointercancel', up);
  card.addEventListener('pointerleave', leave);
  card.addEventListener('click', click, true);
  card.addEventListener('dragstart', (e) => e.preventDefault());
  card.classList.add('tiltable');
  raf = requestAnimationFrame(loop);
  return () => { alive = false; cancelAnimationFrame(raf); };
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
