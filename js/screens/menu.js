// Menu : tout ce qui n'est pas dans la barre du bas, rangé par thème.
import { icon, EMBLEM, picon } from '../ui/icons.js';
import { artUrl } from '../art/assets.js';
import { esc, fmt } from '../ui/dom.js';
import { sync } from '../cloud/sync.js';
import { isLoggedIn, friendList } from '../cloud/cloud.js';
import { openCreator } from './creator.js';

export default function menu(app, root) {
  const g = app.game, cat = app.catalog, s = g.s, lv = g.levelInfo();
  const av = s.avatar && cat.get(s.avatar);
  const achDone = Object.keys(s.achievements).length;
  const creator = sync.profile?.badge === 'createur';
  // Grandes tuiles illustrées, réparties sur tout l'écran
  const T = (href, ic, title, sub) => `<a class="mn-tile" href="${href}"><span class="mn-tile-ic">${picon(ic)}</span><b>${title}</b><span>${sub}</span></a>`;
  const A = (act, ic, title, sub) => `<button class="mn-tile" data-mn="${act}"><span class="mn-tile-ic">${picon(ic)}</span><b>${title}</b><span>${sub}</span></button>`;
  // v316 : le Profil est une grande tuile en largeur (avatar, nom, niveau), les quatre autres forment un carré ;
  // la tuile du Créateur, rare, prend aussi toute la largeur en bas.
  const profile = `<a class="mn-tile mn-wide" href="#/profil"><span class="mn-tile-ic avatar-big pf pf-${s.frame}">${av ? `<img alt="" src="${artUrl(av)}">` : EMBLEM}</span><b>${esc(sync.profile?.pseudo || s.name || 'Ton profil')}</b><span>Niveau ${lv.level} · ${esc(s.title)}</span><em>Vitrine, titres, statistiques</em></a>`;
  root.innerHTML = `
    <header class="screen-head mn-head ui-hero bn-sanctuary"><h1>Le Sanctuaire</h1><p class="muted">Ton profil, tes succès, tes titres et les réglages du jeu.</p></header>
    <nav class="mn-grid">
      ${profile}
      ${T('#/amis', 'team-ic', 'Amis', isLoggedIn() ? '<span class="mn-fr">Collections et succès de tes amis</span>' : 'Avec un compte').replace('class="mn-tile"', 'class="mn-tile mn-wide mn-friends"')}
      ${T('#/succes', 'crown', 'Succès', `${achDone} / ${cat.achievements.length} débloqués`)}
      ${T('#/bestiaire', 'book', 'Bestiaire', 'Créatures, royaumes, histoire')}
      ${T('#/compte', 'account', 'Compte', isLoggedIn() ? `Connecté${sync.profile?.pseudo ? ` · ${esc(sync.profile.pseudo)}` : ''}` : 'Sauvegarde, classement')}
      ${T('#/parametres', 'settings', 'Réglages', 'Son, musique, tutoriels')}
      ${creator ? A('creator', 'creator', 'Mode Créateur', s.settings.dev ? 'Actif' : 'Pouvoirs du créateur').replace('class="mn-tile"', 'class="mn-tile mn-wide"') : ''}
    </nav>`;
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mn]');
    if (!b) return;
    if (b.dataset.mn === 'creator') { if (!g.s.settings.dev) g.setSetting('dev', true); openCreator(app); }
  });
  /* v500 : demandes d'ami reçues, sur la tuile Amis */
  if (isLoggedIn()) friendList().then((rows) => { const n = rows.filter((r) => r.status === 'pending' && r.incoming).length; const t = root.querySelector('.mn-fr'); if (t && n) t.innerHTML = `<b class="mn-fr-n">${n} demande${n > 1 ? 's' : ''} d’ami</b>`; }).catch(() => {});
  app.refreshView = () => app.refresh();
  return () => { app.refreshView = null; };
}
