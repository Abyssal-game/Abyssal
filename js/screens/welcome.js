// Guide de bienvenue : 4 pages, montré une seule fois (rejouable depuis les Réglages).
import { icon, EMBLEM } from '../ui/icons.js';
import { openSheet } from '../ui/dom.js';

const PAGES = [
  { ic: null, t: 'Bienvenue dans l’Abysse', p: 'Le Bestiaire interdit a été déchiré. Ses 335 créatures se cachent dans des boosters scellés. À toi de les retrouver.' },
  { ic: 'booster', t: 'Ouvre des boosters', p: 'Déchire le paquet du doigt, puis retourne les cartes. Les plus rares tremblent avant d’apparaître… Des boosters offerts se rechargent toutes les 6 heures.' },
  { ic: 'swords', t: 'Descends dans l’Abysse', p: 'Chaque jour, 3 torches pour explorer un donjon avec ton équipe de 6 cartes. Combats au tour par tour : touche au bon moment pour frapper fort ou parer.' },
  { ic: 'sparkle', t: 'Rends tes cartes légendaires', p: 'Fusionne tes doublons, élève tes cartes en holographique, or ou cosmique grâce au Rituel, et accomplis les missions du jour.' },
  { ic: 'menu', t: 'Tout est dans le Menu', p: 'Profil, succès, objets, bestiaire, compte en ligne et réglages : l’onglet Menu, en bas à droite, rassemble tout le reste.' },
];

export function showWelcome(app, { force = false } = {}) {
  const g = app.game;
  if (g.s.seenIntro && !force) return;
  let i = 0;
  const sheet = openSheet('', { cls: 'welcome', label: 'Bienvenue', onClose: () => { g.s.seenIntro = true; g.persist(); } });
  const draw = () => {
    const pg = PAGES[i];
    sheet.setContent(`<div class="wl">
      <div class="wl-ic">${pg.ic ? icon(pg.ic) : EMBLEM}</div>
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
