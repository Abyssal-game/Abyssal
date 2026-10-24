// Composant carte : miniature (grilles) et grand format (vue détaillée, ouverture).
import { RARITY, VARIANTS } from '../config.js';
import { artUrl, hasRealArt } from '../art/assets.js';
import { sigil, icon } from './icons.js';
import { esc } from './dom.js';
import { seeded } from '../art/geometry.js';

let catalogRef = null;
export function setCardCatalog(c) { catalogRef = c; }
// Renommée (palier 0 à 3) des créatures possédées : badge et lueur sur la carte
let fameRef = () => 0;
export function setFameLookup(f) { fameRef = f; }
// Apogée (niveau maximum atteint) : cadre doré animé
let apexRef = () => false;
let favRef = () => false;
export function setFavLookup(f) { favRef = f; }
export function setApexLookup(f) { apexRef = f; }
// v482 : finition de prestige posée sur la carte (habillage)
let dressRef = () => null;
export function setDressLookup(f) { dressRef = f; }
const FAME_NAMES = ['', 'Vétéran', 'Héros', 'Légende'];

function hueFor(id) { return Math.floor(seeded('hue:' + id)() * 300) + 30; }

/**
 * @param card    carte du catalogue
 * @param opts    { size: 'mini'|'full', variant, known, lazy, count, isNew, mystery, nameKnown, tag }
 */
export function cardHTML(card, opts = {}) {
  const { size = 'mini', variant = 'normal', lazy = false, count = 0, isNew = false, mystery = false, nameKnown = false, tag = '' } = opts;
  const r = RARITY[card.rarity];
  const fc = catalogRef?.faction[card.faction]?.colors.secondary || '#888';
  const foreign = !!opts.foreign; /* v500 : carte d'un ami : ni tes favoris, ni ta renommée, ni tes finitions de prestige */
  const fame = mystery || foreign ? 0 : fameRef(card.id);
  const dress = mystery || foreign ? null : opts.dress !== undefined ? opts.dress : dressRef(card.id); /* v484 : opts.dress pour les aperçus de l'Échoppe */
  const cls = ['tcg', `tcg-${size}`, `r-${card.rarity}`, `f-${card.faction}`, mystery ? 'is-mystery' : `v-${variant}`, hasRealArt(card.id) ? 'real' : '', fame ? `fm${fame}` : '', !mystery && !foreign && apexRef(card.id) ? 'apex' : '', dress ? `dr dr-${dress}` : ''].join(' ');
  const fameB = fame ? `<span class="tcg-fame" title="${FAME_NAMES[fame]}" aria-label="Renommée : ${FAME_NAMES[fame]}"><img alt="" src="assets/icons/fame-${fame}.webp" onerror="this.remove()"></span>` : '';
  const style = `--rc:${r.color};--fc:${fc};--hue:${hueFor(card.id)}deg`;
  const lite = size === 'mini';
  const img = lazy
    ? `<img alt="" decoding="async" data-lazy="${lite ? 1 : 0}${mystery ? 1 : 0}" data-card="${card.id}" data-variant="${variant}">`
    : `<img alt="" decoding="async" src="${artUrl(card, { variant, lite, mystery })}" data-card="${card.id}" data-variant="${variant}">`;
  const name = mystery ? (nameKnown ? esc(card.name) : 'Inconnue') : esc(card.name);
  // Cadre illustré des variantes Or et Cosmique (posé au-dessus de la carte)
  const vframe = dress ? '<div class="tcg-dress"></div>' : !mystery && ['holo', 'gold'].includes(variant) ? '<div class="tcg-vframe"></div>' /* v617 : l'Abyssale et les nouvelles finitions n'ont plus de cadre peint */ : '';
  const label = mystery ? `Carte non découverte ${card.id}${nameKnown ? ', ' + card.name : ''}` : `${card.name}, ${r.name}${variant !== 'normal' ? ', ' + VARIANTS[variant].name : ''}`;

  if (size === 'mini') {
    return `<div class="${cls}" style="${style}" data-id="${card.id}" role="button" tabindex="0" aria-label="${esc(label)}">
      <div class="tcg-art">${img}</div><div class="tcg-shine"></div><div class="tcg-frame"></div>
      ${mystery ? `<div class="tcg-lock">${icon('lock')}</div>` : variant !== 'normal' ? `<span class="tcg-vbadge">${VARIANTS[variant].short}</span>` : ''}
      <span class="tcg-sig">${sigil(card.faction)}</span>
      <div class="tcg-plate"><span class="tcg-gem">${r.short}</span><span class="tcg-nm">${name}</span></div>
      ${vframe}${fameB}${!mystery && !foreign && favRef(card.id) ? '<span class="tcg-fav" aria-label="Favori">★</span>' : ''}${count > 1 ? `<span class="tcg-count">×${count}</span>` : ''}${isNew ? '<span class="tcg-new">Nouveau</span>' : ''}${tag}
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
    </div>${vframe}${fameB}
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
    entries.forEach((e) => { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); watched.delete(e.target); } });
  }, { rootMargin: '400px 0px' });
  /* v576 : les images des écrans quittés restaient surveillées (des centaines de plus à chaque visite de la Collection) :
     le navigateur les recalculait à chaque image affichée. On retire celles qui ne sont plus dans la page. */
  for (const i of watched) if (!i.isConnected) { io.unobserve(i); watched.delete(i); }
  imgs.forEach((i) => { if (!watched.has(i)) { watched.add(i); if (!paused) io.observe(i); } });
}
/* v576 : pendant qu'une fenêtre couvre l'écran, la surveillance des images de la page du dessous est suspendue
   (le navigateur la recalculait à chaque image de l'animation d'ouverture : ~170 ms sur la Collection) */
let paused = false;
const onCover = () => {
  const on = document.body.classList.contains('has-sheet');
  if (!io || on === paused) return;
  paused = on;
  for (const i of watched) { if (!i.isConnected) { watched.delete(i); io.unobserve(i); continue; } if (on) io.unobserve(i); else io.observe(i); }
};
if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined' && document.body) new MutationObserver(onCover).observe(document.body, { attributes: true, attributeFilter: ['class'] });
const watched = new Set();
/* v576 : grille de cartes remplie au fil du défilement : les premières cartes tout de suite, les suivantes seulement quand
   on approche du bas (avant : tout était dessiné par paquets à chaque image, l'écran restait saccadé 1 à 2 s après l'ouverture).
   La hauteur finale est réservée : le retour sur la page retrouve sa position, la grille se complète jusqu'à elle. */
export function fillGrid(grid, list, html, { first = 24, step = 24, ahead = 1400 } = {}) {
  const run = (grid.fillRun = (grid.fillRun || 0) + 1);
  let n = Math.min(first, list.length);
  grid.innerHTML = list.slice(0, n).map(html).join('');
  lazyArt(grid);
  grid.style.minHeight = ''; grid.style.alignContent = 'start'; /* sinon la grille étire ses rangées sur la hauteur réservée */
  const k0 = grid.children[0];
  if (k0 && list.length > n) {
    const cols = [...grid.children].filter((x) => x.offsetTop === k0.offsetTop).length || 1;
    const gap = parseFloat(getComputedStyle(grid).rowGap) || 0;
    grid.style.minHeight = `${Math.ceil(list.length / cols) * (k0.offsetHeight + gap)}px`;
  }
  let queued = false;
  const stop = () => { removeEventListener('scroll', queue, true); removeEventListener('resize', queue); };
  function tick() {
    queued = false;
    if (run !== grid.fillRun || !grid.isConnected) return stop();
    if (n >= list.length) { grid.style.minHeight = ''; return stop(); }
    const last = grid.lastElementChild;
    if (last && last.getBoundingClientRect().top > innerHeight + ahead) return; /* rien à dessiner tant qu'on ne s'approche pas */
    grid.insertAdjacentHTML('beforeend', list.slice(n, n + step).map(html).join(''));
    n += step;
    lazyArt(grid);
    queue();
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(() => setTimeout(tick, 0)); } }
  addEventListener('scroll', queue, { passive: true, capture: true }); addEventListener('resize', queue); /* v699 : capture = aussi le défilement d'une fenêtre (choix de l'équipe) */
  queue();
  return { count: () => n };
}
export function pruneLazy() { if (io) for (const i of watched) if (!i.isConnected) { io.unobserve(i); watched.delete(i); } }

// Inclinaison 3D de la carte entière (cadre compris), au doigt ou à la souris.
export function enableTilt(el, { reduced = false } = {}) {
  const card = el.classList.contains('tcg') ? el : el.querySelector('.tcg');
  if (!card) return () => {};
  // Rotation au doigt : on fait tourner la carte comme un objet tenu en main.
  // Le glissé est relatif (pas de saut au premier toucher) ; au lâcher, la carte revient doucement.
  const MAX = 32;
  let cur = { x: 0, y: 0 }, tgt = { x: 0, y: 0 }, idle = { x: 0, y: 0 };
  let touching = false, raf = 0, alive = true, start = null, moved = false, t0 = performance.now();
  const apply = () => {
    /* v419 : au repos, plus de rotation 3D (seulement les reflets qui bougent) : sur iPhone, la carte inclinée en 3D en permanence
       laissait voir un fin trait noir horizontal (jointure entre les tuiles d'affichage de Safari). La 3D ne joue plus qu'au doigt. */
    const rest = !touching && Math.abs(cur.x) < 0.6 && Math.abs(cur.y) < 0.6;
    card.style.transform = reduced || rest ? '' : `perspective(900px) rotateX(${cur.x.toFixed(2)}deg) rotateY(${cur.y.toFixed(2)}deg) scale(${touching ? 1.03 : 1})`;
    const ly = cur.y + (touching || reduced ? 0 : idle.y), lx = cur.x + (touching || reduced ? 0 : idle.x);
    card.style.setProperty('--mx', `${(50 + (ly / MAX) * 50).toFixed(1)}%`);
    card.style.setProperty('--my', `${(50 - (lx / MAX) * 50).toFixed(1)}%`);
    card.style.setProperty('--tilt', (Math.min(1, Math.hypot(cur.x, cur.y) / MAX)).toFixed(3));
  };
  let frame = 0;
  const loop = (now) => {
    if (!alive) return;
    if (!touching) {
      tgt.x = 0; tgt.y = 0; /* v419 : plus de balancement 3D au repos (voir apply) */
      const t = (now - t0) / 1000; idle.x = Math.sin(t * 0.9) * 3; idle.y = Math.cos(t * 0.7) * 4.5; /* les reflets, eux, se balancent encore */
    }
    const k = touching ? 0.45 : 0.07;
    cur.x += (tgt.x - cur.x) * k; cur.y += (tgt.y - cur.y) * k;
    // v364 : au repos, la carte se balance à 30 images par seconde (la lueur suit), et plus du tout si l'app est en arrière-plan
    frame++;
    if (touching || frame % 2 === 0) { if (!document.hidden) apply(); }
    /* v576 : au repos, les reflets se balancent 2,5 s puis la boucle s'endort (avant : 30 dessins par seconde tant que la fiche
       restait ouverte, ce qui ralentissait tout le reste) ; elle repart au premier toucher */
    if (!touching && now - t0 > 2500 && Math.abs(cur.x) < 0.3 && Math.abs(cur.y) < 0.3) { raf = 0; return; }
    raf = requestAnimationFrame(loop);
  };
  const clamp = (v) => Math.max(-MAX, Math.min(MAX, v));
  const down = (e) => {
    touching = true; moved = false;
    start = { x: e.clientX, y: e.clientY, rx: cur.x, ry: cur.y, w: card.getBoundingClientRect().width };
    card.classList.add('tilting');
    try { card.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
    if (!raf && alive) raf = requestAnimationFrame(loop);
  };
  const move = (e) => {
    if (!touching || !start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) > 6) moved = true;
    const k = (MAX * 2.2) / start.w; // traverser la carte = une bonne rotation
    tgt.y = clamp(start.ry + dx * k); tgt.x = clamp(start.rx - dy * k);
    e.preventDefault();
  };
  const up = () => { if (!touching) return; touching = false; start = null; card.classList.remove('tilting'); tgt.x = 0; tgt.y = 0; t0 = performance.now(); if (!raf && alive) raf = requestAnimationFrame(loop); };
  const click = (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } };
  card.addEventListener('pointerdown', down);
  card.addEventListener('pointermove', move, { passive: false });
  card.addEventListener('pointerup', up);
  card.addEventListener('pointercancel', up);
  card.addEventListener('lostpointercapture', up);
  card.addEventListener('touchmove', (e) => { if (touching) e.preventDefault(); }, { passive: false }); // la page ne défile pas pendant la rotation
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
