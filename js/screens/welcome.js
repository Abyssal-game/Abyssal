// Guide de bienvenue : quelques pages, montré une fois (et à nouveau quand le guide change),
// rejouable depuis les Réglages.
import { icon, EMBLEM } from '../ui/icons.js';
import { openSheet } from '../ui/dom.js';
import { packHTML, GIFT_N } from './shop.js';
import { openPack } from './opening.js';

// Version du guide : l'augmenter le remontre une fois à tout le monde
const GUIDE_V = 2;
// img : illustration (assets/ui/tuto-N.webp) ; bn : bannière d'une page du jeu (assets/ui/bn-*.webp)
// v699 (tour du 24 octobre 2026) : 4 pages au lieu de 9 ; le reste est expliqué au bon moment par les bulles d'aide
const PAGES = [
  { img: 1, t: 'Bienvenue dans l’Abysse', p: 'Les sept royaumes avaient enfermé leurs monstres dans un livre : le Bestiaire interdit. Une nuit, il a été déchiré. Ses pages se sont envolées, ses chapitres sont tombés dans l’Abysse. Tu es le dernier à savoir lire les sceaux : retrouve les pages, et referme les chapitres.' },
  { img: 2, t: 'Ouvre des boosters', p: 'Chaque booster renferme des pages perdues du Bestiaire : chaque carte est une créature. Déchire le paquet du doigt, puis retourne les cartes. Un booster gratuit t’attend chaque jour, et tes meilleures créatures forment ton équipe.' },
  { img: 3, t: 'La Descente', p: 'Chaque chapitre tombé est gardé par un rêve de l’Abysse. Dans Aventure, descends avec ton équipe : 20 chapitres de 5 étages, et un gardien au bout de chacun. Tes doublons deviennent des cendres, qui font monter tes créatures de niveau.' },
  { img: 4, t: 'Reviens chaque jour', p: 'L’Accueil rassemble ce qui t’attend : les Épreuves du jour, les missions, les coffres et tes parties du Cercle de l’Abysse, contre ses arbitres ou d’autres joueurs. Les bulles d’aide t’expliqueront le reste au bon moment.' },
];

export function showWelcome(app, { force = false } = {}) {
  const g = app.game;
  if ((g.s.seenIntro || 0) >= GUIDE_V && !force) { showGift(app); return; }
  let i = 0;
  const sheet = openSheet('', { cls: 'welcome', label: 'Bienvenue', onClose: () => { g.s.seenIntro = GUIDE_V; g.persist(); if (!force) setTimeout(() => showGift(app), 350); } });
  PAGES.forEach((pg) => { new Image().src = pg.img ? `assets/ui/tuto-${pg.img}.webp` : `assets/ui/bn-${pg.bn}.webp`; });
  /* v649 : toutes les pages posées l'une sur l'autre dans la même case : la fenêtre garde la taille de la plus grande, rien ne bouge en changeant de page */
  const artOf = (pg) => (pg.img ? `<img class="wl-art" alt="" src="assets/ui/tuto-${pg.img}.webp">`
    : pg.bn ? `<img class="wl-art wl-bn" alt="" src="assets/ui/bn-${pg.bn}.webp">` : `<div class="wl-ic">${pg.ic ? icon(pg.ic) : EMBLEM}</div>`);
  sheet.setContent(`<div class="wl">
      <div class="wl-deck">${PAGES.map((pg, k) => `<div class="wl-page" data-p="${k}">${artOf(pg)}<h2>${pg.t}</h2><p>${pg.p}</p></div>`).join('')}</div>
      <div class="wl-dots">${PAGES.map(() => '<i></i>').join('')}</div>
      <div class="row gap wl-btns"><button class="btn ghost" data-w="back"></button><button class="btn primary" data-w="next"></button></div>
    </div>`);
  const draw = () => {
    sheet.body.querySelectorAll('.wl-page').forEach((el, k) => { el.classList.toggle('on', k === i); el.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
    sheet.body.querySelectorAll('.wl-dots i').forEach((el, k) => el.classList.toggle('on', k === i));
    const back = sheet.body.querySelector('[data-w="back"]');
    back.textContent = i ? 'Retour' : 'Passer'; back.dataset.act = i ? 'prev' : 'skip';
    sheet.body.querySelector('[data-w="next"]').textContent = i < PAGES.length - 1 ? 'Suivant' : 'C’est parti !';
  };
  sheet.body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-w]'); if (!b) return;
    if (b.dataset.w === 'next') { if (i < PAGES.length - 1) { i++; draw(); } else sheet.close(); }
    if (b.dataset.w === 'back' && b.dataset.act === 'prev') { i = Math.max(0, i - 1); draw(); }
    if (b.dataset.w === 'back' && b.dataset.act === 'skip') sheet.close();
  });
  draw();
}

// v518 : le cadeau de bienvenue, montré une fois après le guide : les boosters offerts, en plus du booster gratuit du jour
export function showGift(app) {
  const g = app.game, cat = app.catalog;
  const n = Math.min(g.s.welcomeGift || 0, g.s.tickets.standard || 0);
  if (!n || g.s.giftShown) return;
  const daily = g.freePack().stock;
  const sheet = openSheet(`<div class="gift-sheet">
      <span class="gift-ribbon">Cadeau de bienvenue</span>
      <div class="gift-packs big">${Array.from({ length: n }, () => `<span class="gift-pk">${packHTML('standard', cat)}</span>`).join('')}</div>
      <h2>${n > 1 ? `${n} boosters offerts` : '1 booster offert'}</h2>
      <p>Pour ton arrivée dans l’Abysse, voici ${n > 1 ? `<b>${n} boosters</b>` : '<b>un booster</b>'} en cadeau. Ouvre-les pour découvrir tes premières créatures : elles formeront ton équipe.</p>
      ${daily ? `<p class="small gift-daily">${icon('p:free-pack')}<span>Et ce n’est pas tout : un <b>booster gratuit</b> t’attend <b>chaque jour</b>. Aujourd’hui, tu as donc <b>${n + daily} boosters</b> à ouvrir !</span></p>` : ''}
      <button class="btn primary block big-cta dc-plq dc-plq-red" data-g="open">${icon('ticket')}Ouvrir mon cadeau</button>
    </div>`, { cls: 'sheet-small', label: 'Cadeau de bienvenue' });
  g.s.giftShown = true; g.persist();
  app.sfx.achievement?.();
  sheet.body.addEventListener('click', (e) => {
    if (!e.target.closest('[data-g="open"]')) return;
    sheet.close();
    app.go('boutique');
    setTimeout(() => openPack(app, 'standard', { onDone: () => app.refreshView?.() }), 600);
  });
}
