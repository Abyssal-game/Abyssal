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
  const T = (href, ic, title, sub, extra = '') => `<a class="mn-t" href="${href}"${extra}><span class="mn-ic ${ic.startsWith('p:') ? 'pic' : ''}">${ic.startsWith('p:') ? picon(ic.slice(2)) : icon(ic)}</span><span class="mn-tx"><b>${title}</b><span>${sub}</span></span>${icon('next')}</a>`;
  const A = (act, ic, title, sub) => `<button class="mn-t" data-mn="${act}"><span class="mn-ic">${icon(ic)}</span><span class="mn-tx"><b>${title}</b><span>${sub}</span></span>${icon('next')}</button>`;
  root.innerHTML = `
    <nav class="mn-list">
      ${T('#/profil', 'p:seal', 'Profil', 'Vitrine, titres, statistiques')}
      ${T('#/succes', 'p:crown', 'Succès', `${achDone} / ${cat.achievements.length} débloqués`)}
      ${T('#/bestiaire', 'p:book', 'Bestiaire', 'Les créatures, les royaumes, l’histoire')}
    </nav>
    <nav class="mn-list">
      ${T('#/compte', 'user', 'Compte en ligne', isLoggedIn() ? `Connecté${sync.profile?.pseudo ? ` · ${esc(sync.profile.pseudo)}` : ''}` : 'Sauvegarde en ligne, classement')}
      ${T('#/parametres', 'gear', 'Réglages', 'Son, animations, sauvegarde')}
      ${creator ? A('creator', 'crown', 'Mode Créateur', s.settings.dev ? 'Actif' : 'Pouvoirs du créateur') : ''}
    </nav>
    <footer class="credit">ABYSSAL · Créé par <b>Alexis Seguin</b></footer>`;
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mn]');
    if (!b) return;
    if (b.dataset.mn === 'creator') { if (!g.s.settings.dev) g.setSetting('dev', true); openCreator(app); }
  });
  app.refreshView = () => app.refresh();
  return () => { app.refreshView = null; };
}
