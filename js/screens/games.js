// v425 : la Salle des jeux (Aventure → Jeux) : les jeux de cartes à part (Duels des Sceaux, Enchères, Pacte, Cryptes).
import { icon } from '../ui/icons.js';
import { setScene } from '../ui/scene.js';
import * as EN from '../core/encheres.js';
import * as PA from '../core/pacte.js';
import * as CR from '../core/cryptes.js';

export default function gamesScreen(app, root) {
  const g = app.game;
  setScene('menu');
  const sc = g.s.sceaux, en = g.s.encheres, pa = g.s.pacte, cr = g.s.cryptes;
  const rec = (w, l) => (w + l ? `${w} victoire${w > 1 ? 's' : ''} · ${l} défaite${l > 1 ? 's' : ''}` : 'Pas encore joué');
  const tile = (href, cls, title, sub, info, img) => `<a class="panel gm-tile ${cls}" href="${href}"><span class="gm-art" style="background-image:url(${img})"></span>
    <span class="gm-txt"><b>${title}</b><span class="small">${sub}</span><span class="small muted">${info}</span></span>${icon('next')}</a>`;
  root.innerHTML = `<header class="screen-head ui-hero bn-jeux"><h1>Salle des jeux</h1><p class="muted">Des jeux de cartes à part, contre les arbitres de l’Abysse.</p></header>
    ${g.sceauxOpen() ? '' : `<section class="panel tr-lock">${icon('lock')}<b>Encore scellée</b><p class="small">Vaincs ton <b>premier gardien</b> dans la Descente (étage 5) pour ouvrir la Salle des jeux.</p><a class="btn primary block" href="#/descente">${icon('p:descend')}Aller à la Descente</a></section>`}
    <div class="gm-list ${g.sceauxOpen() ? '' : 'locked'}">
      ${tile('#/sceaux', 'gm-sceaux', 'Duels des Sceaux', 'Pose tes cartes sur un plateau de 3 × 3 et capture celles de l’adversaire.', `${rec(sc.wins, sc.losses)} · ${Object.keys(sc.beaten || {}).length} / 8 adversaires battus`, 'assets/ui/bn-sceaux.webp')}
      ${tile('#/cryptes', 'gm-cryptes', 'Les Cryptes', 'Un jeu de mémoire : retrouve les paires et réveille les pouvoirs des factions.', `${rec(cr.wins, cr.losses)} · ${Object.keys(cr.beaten || {}).length} / ${CR.TABLES.length} cryptes gagnées`, 'assets/ui/bn-cryptes.webp')}
      ${tile('#/pacte', 'gm-pacte', 'Le Pacte', 'Tire des cartes, encore une… et arrête-toi avant de briser le pacte.', `${rec(pa.wins, pa.losses)} · ${Object.keys(pa.beaten || {}).length} / ${PA.TABLES.length} pactes gagnés`, 'assets/ui/bn-pacte.webp')}
      ${tile('#/encheres', 'gm-encheres', 'Les Enchères de Mammon', 'Enchères à l’aveugle à trois : offre plus que les autres… sans jamais offrir pareil.', `${rec(en.wins, en.losses)} · ${Object.keys(en.beaten || {}).length} / ${EN.TABLES.length} ventes gagnées`, 'assets/ui/bn-encheres.webp')}
    </div>`;
}
