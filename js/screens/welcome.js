// Guide de bienvenue : quelques pages, montré une fois (et à nouveau quand le guide change),
// rejouable depuis les Réglages.
import { icon, EMBLEM } from '../ui/icons.js';
import { openSheet } from '../ui/dom.js';

// Version du guide : l'augmenter le remontre une fois à tout le monde
const GUIDE_V = 2;
// img : illustration (assets/ui/tuto-N.webp) ; bn : bannière d'une page du jeu (assets/ui/bn-*.webp)
const PAGES = [
  { img: 1, t: 'Bienvenue dans l’Abysse', p: 'Le Bestiaire interdit a été déchiré. Ses créatures se cachent dans des boosters scellés. À toi de les retrouver, de les renforcer et de les mener au combat.' },
  { img: 2, t: 'Ouvre des boosters', p: 'Le gros bouton du milieu. Déchire le paquet du doigt, puis retourne les cartes. Un booster gratuit t’attend chaque jour. Certaines cartes sortent en finition rare : argentée, enluminée ou abyssale.' },
  { bn: 'collection', t: 'Ta collection', p: 'L’onglet Collection a trois pages, en haut : Cartes (tout le Bestiaire), Équipe (tes 5 combattants) et Forge (Renforcer et Fournaise).' },
  { bn: 'furnace', t: 'Cendres et niveaux', p: 'Dans la Fournaise, brûle tes doublons : ils deviennent des cendres. Dans Renforcer, les cendres font monter tes créatures de niveau, pour plus d’attaque et de PV.' },
  { img: 3, t: 'La Descente', p: 'Dans l’onglet Aventure, ton équipe descend dans l’Abysse : 3 créatures au combat, 2 en réserve. 20 chapitres de 5 étages, un gardien à la fin de chacun, et une récompense à chaque étage gagné.' },
  { bn: 'trial', t: 'Les Épreuves du jour', p: 'Toujours dans Aventure : trois combats par jour, réglés sur la force de tes meilleures cartes. Chaque victoire rapporte un coffre, et fait avancer la saison du mois.' },
  { bn: 'sceaux', t: 'Une autre aventure', p: 'Toujours dans Aventure : les Duels des Sceaux, un jeu de cartes où l’on capture celles de l’adversaire. Ils s’ouvrent quand tu as vaincu ton premier gardien de la Descente.' },
  { bn: 'shadow', t: 'Coffres et Tirage des Ombres', p: 'Dans l’onglet Butin, ouvre tes boosters et les coffres gagnés en jouant. Le Tirage des Ombres donne un booster par jour : sa valeur compte pour le classement de la semaine, et les 3 premiers gagnent un coffre.' },
  { img: 4, t: 'Reviens chaque jour', p: 'L’Accueil rassemble ce qui t’attend : ton prochain objectif, l’offrande, les Épreuves, les missions et les coffres. Le Sanctuaire garde ton profil, tes succès, le bestiaire et les réglages (son, musique, vibrations, tutoriels).' },
];

export function showWelcome(app, { force = false } = {}) {
  const g = app.game;
  if ((g.s.seenIntro || 0) >= GUIDE_V && !force) return;
  let i = 0;
  const sheet = openSheet('', { cls: 'welcome', label: 'Bienvenue', onClose: () => { g.s.seenIntro = GUIDE_V; g.persist(); } });
  PAGES.forEach((pg) => { new Image().src = pg.img ? `assets/ui/tuto-${pg.img}.webp` : `assets/ui/bn-${pg.bn}.webp`; });
  const draw = () => {
    const pg = PAGES[i];
    const art = pg.img ? `<img class="wl-art" alt="" src="assets/ui/tuto-${pg.img}.webp">`
      : pg.bn ? `<img class="wl-art wl-bn" alt="" src="assets/ui/bn-${pg.bn}.webp">` : `<div class="wl-ic">${pg.ic ? icon(pg.ic) : EMBLEM}</div>`;
    sheet.setContent(`<div class="wl">
      ${art}
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
