// Guide de bienvenue : quelques pages, montré une seule fois (rejouable depuis les Réglages).
import { icon, EMBLEM } from '../ui/icons.js';
import { openSheet } from '../ui/dom.js';

const PAGES = [
  { ic: null, img: 1, t: 'Bienvenue dans l’Abysse', p: 'Le Bestiaire interdit a été déchiré. Ses créatures se cachent dans des boosters scellés. À toi de les retrouver.' },
  { ic: 'booster', img: 2, t: 'Ouvre des boosters', p: 'Le gros bouton du milieu. Déchire le paquet du doigt, puis retourne les cartes. Des boosters offerts se rechargent toutes les 6 heures.' },
  { ic: 'swords', img: 3, t: 'Pars à l’aventure', p: 'Tes cartes combattent pour toi ! Dans l’onglet Aventure, ton équipe de 5 créatures descend dans l’Abysse et rapporte des coffres pleins de boosters.' },
  { ic: 'home', img: 4, t: 'Reviens chaque jour', p: 'L’Accueil rassemble ce qui t’attend aujourd’hui : l’offrande, les missions et les coffres à ouvrir. Le reste est dans l’onglet Plus.' },
];

export function showWelcome(app, { force = false } = {}) {
  const g = app.game;
  if (g.s.seenIntro && !force) return;
  let i = 0;
  const sheet = openSheet('', { cls: 'welcome', label: 'Bienvenue', onClose: () => { g.s.seenIntro = true; g.persist(); } });
  [1, 2, 3, 4].forEach((n) => { new Image().src = `assets/ui/tuto-${n}.webp`; });
  const draw = () => {
    const pg = PAGES[i];
    sheet.setContent(`<div class="wl">
      ${pg.img ? `<img class="wl-art" alt="" src="assets/ui/tuto-${pg.img}.webp">` : `<div class="wl-ic">${pg.ic ? icon(pg.ic) : EMBLEM}</div>`}
      <h2>${pg.t}</h2><p>${pg.p}</p>
      <div class="wl-dots">${PAGES.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="row gap wl-btns">${i ? '<button class="btn ghost" data-w="prev">Retour</button>' : '<button class="btn ghost" data-w="skip">Passer</button>'}<button class="btn primary" data-w="next">${i < PAGES.length - 1 ? 'Suivant' : 'C’est parti !'}</button></div>
    </div>`);
  };
  sheet.body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-w]'); if (!b) return;
    if (b.dataset.w === 'next') { if (i < PAGES.length - 1) { i++; draw(); } else sheet.close(); }
    if (b.dataset.w === 'prev') { i = Math.max(0, i - 1); draw(); }
    if (b.dataset.w === 'skip') sheet.close();
  });
  draw();
}
