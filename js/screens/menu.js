// Menu : tout ce qui n'est pas dans la barre du bas, rangé par thème.
import { icon, EMBLEM } from '../ui/icons.js';
import { artUrl } from '../art/assets.js';
import { esc, fmt } from '../ui/dom.js';
import { sync } from '../cloud/sync.js';
import { isLoggedIn } from '../cloud/cloud.js';
import { openFusion } from './fusion.js';
import { openCreator } from './creator.js';

export default function menu(app, root) {
  const g = app.game, cat = app.catalog, s = g.s, lv = g.levelInfo();
  const av = s.avatar && cat.get(s.avatar);
  const spare = ['C', 'PC', 'R', 'HR'].reduce((a, r) => a + g.spareCount(r), 0);
  const achDone = Object.keys(s.achievements).length;
  const creator = sync.profile?.badge === 'createur';
  const chests = Object.values(g.arsenal().chests).reduce((a, n) => a + n, 0);
  const T = (href, ic, title, sub, extra = '') => `<a class="mn-t" href="${href}"${extra}><span class="mn-ic">${icon(ic)}</span><span class="mn-tx"><b>${title}</b><span>${sub}</span></span>${icon('next')}</a>`;
  const A = (act, ic, title, sub) => `<button class="mn-t" data-mn="${act}"><span class="mn-ic">${icon(ic)}</span><span class="mn-tx"><b>${title}</b><span>${sub}</span></span>${icon('next')}</button>`;
  root.innerHTML = `
    <a class="panel mn-me" href="#/profil">
      <span class="avatar-big pf pf-${s.frame}">${av ? `<img alt="" src="${artUrl(av)}">` : EMBLEM}</span>
      <span class="mn-me-t"><b>${esc(sync.profile?.pseudo || s.title)}</b><span class="small muted">${esc(s.title)} · niveau ${lv.level}</span>
        <span class="xpbar"><i style="width:${(lv.into / lv.need) * 100}%"></i></span>
        <span class="small muted">${g.uniqueCount()} / ${g.total()} créatures · ${fmt(s.shards)} éclats</span></span>
    </a>
    <h2 class="section-title">Mon aventure</h2>
    <nav class="mn-list">
      ${T('#/heros', 'swords', 'Héros et invocations', 'Niveaux, compétences, fiches')}
      ${T('#/arsenal', 'shield', 'Arsenal', chests ? `${chests} coffre${chests > 1 ? 's' : ''} à ouvrir` : 'Armes, armures, reliques, sorts')}
      ${T('#/profil', 'user', 'Profil', 'Vitrine, chance, statistiques, titres')}
      ${T('#/succes', 'trophy', 'Succès et ensembles', `${achDone} / ${cat.achievements.length} succès`)}
      ${A('fusion', 'sparkle', 'Fusion des doublons', `${spare} doublon${spare > 1 ? 's' : ''} disponible${spare > 1 ? 's' : ''}`)}
      ${T('#/boutique/objets', 'heart', 'Objets', 'Baumes, torches bénies, encens…')}
    </nav>
    <h2 class="section-title">L’univers</h2>
    <nav class="mn-list">
      ${T('#/bestiaire', 'book', 'Bestiaire', 'Chroniques et créatures découvertes')}
      ${T('#/factions', 'shield', 'Factions', 'Les sept royaumes')}
    </nav>
    <h2 class="section-title">Compte et réglages</h2>
    <nav class="mn-list">
      ${T('#/compte', 'user', 'Compte en ligne', isLoggedIn() ? `Connecté${sync.profile?.pseudo ? ` · ${esc(sync.profile.pseudo)}` : ''}` : 'Sauvegarde en ligne, classement mondial')}
      ${T('#/parametres', 'gear', 'Réglages', 'Son, animations, sauvegarde')}
      ${creator ? A('creator', 'crown', 'Mode Créateur', s.settings.dev ? 'Actif' : 'Pouvoirs du créateur') : ''}
    </nav>
    <footer class="credit">ABYSSAL · Créé par <b>Alexis Seguin</b></footer>`;
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mn]');
    if (!b) return;
    if (b.dataset.mn === 'fusion') openFusion(app);
    if (b.dataset.mn === 'creator') { if (!g.s.settings.dev) g.setSetting('dev', true); openCreator(app); }
  });
  app.refreshView = () => app.refresh();
  return () => { app.refreshView = null; };
}
