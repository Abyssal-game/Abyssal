// Menu : tout ce qui n'est pas dans la barre du bas, rangé par thème.
import { icon, EMBLEM, picon } from '../ui/icons.js';
import { artUrl } from '../art/assets.js';
import { esc, fmt } from '../ui/dom.js';
import { sync } from '../cloud/sync.js';
import { isLoggedIn } from '../cloud/cloud.js';
import { openCreator } from './creator.js';

export default function menu(app, root) {
  const g = app.game, cat = app.catalog, s = g.s, lv = g.levelInfo();
  const av = s.avatar && cat.get(s.avatar);
  const achDone = Object.keys(s.achievements).length;
  const creator = sync.profile?.badge === 'createur';
  // Grandes tuiles illustrées, réparties sur tout l'écran
  const T = (href, ic, title, sub) => `<a class="mn-tile" href="${href}"><span class="mn-tile-ic">${picon(ic)}</span><b>${title}</b><span>${sub}</span></a>`;
  const A = (act, ic, title, sub) => `<button class="mn-tile" data-mn="${act}"><span class="mn-tile-ic">${picon(ic)}</span><b>${title}</b><span>${sub}</span></button>`;
  root.innerHTML = `
    <header class="screen-head mn-head ui-hero bn-sanctuary"><h1>Le Sanctuaire</h1><p class="muted">Ton profil, tes trophées et les réglages du jeu.</p></header>
    <nav class="mn-grid">
      ${T('#/profil', 'seal', 'Profil', 'Vitrine, titres, statistiques')}
      ${T('#/succes', 'crown', 'Succès', `${achDone} / ${cat.achievements.length} débloqués`)}
      ${T('#/bestiaire', 'book', 'Bestiaire', 'Créatures, royaumes, histoire')}
      ${T('#/compte', 'account', 'Compte en ligne', isLoggedIn() ? `Connecté${sync.profile?.pseudo ? ` · ${esc(sync.profile.pseudo)}` : ''}` : 'Sauvegarde, classement')}
      ${T('#/parametres', 'settings', 'Réglages', 'Son, tutoriels, sauvegarde')}
      ${creator ? A('creator', 'creator', 'Mode Créateur', s.settings.dev ? 'Actif' : 'Pouvoirs du créateur') : ''}
    </nav>`;
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mn]');
    if (!b) return;
    if (b.dataset.mn === 'creator') { if (!g.s.settings.dev) g.setSetting('dev', true); openCreator(app); }
  });
  app.refreshView = () => app.refresh();
  return () => { app.refreshView = null; };
}
