// v425 : la Salle des jeux (Aventure → Jeux) : les jeux de cartes à part, Duels des Sceaux et Cour des Masques.
import { icon } from '../ui/icons.js';
import { setScene } from '../ui/scene.js';
import * as MQ from '../core/masques.js';

export default function gamesScreen(app, root) {
  const g = app.game;
  setScene('menu');
  const sc = g.s.sceaux, mq = g.s.masques;
  const rec = (w, l) => (w + l ? `${w} victoire${w > 1 ? 's' : ''} · ${l} défaite${l > 1 ? 's' : ''}` : 'Pas encore joué');
  const tile = (href, cls, title, sub, info, img) => `<a class="panel gm-tile ${cls}" href="${href}"><span class="gm-art" style="background-image:url(${img})"></span>
    <span class="gm-txt"><b>${title}</b><span class="small">${sub}</span><span class="small muted">${info}</span></span>${icon('next')}</a>`;
  root.innerHTML = `<header class="screen-head ui-hero bn-sceaux"><h1>Salle des jeux</h1><p class="muted">Des jeux de cartes à part, contre les arbitres de l’Abysse.</p></header>
    ${g.sceauxOpen() ? '' : `<section class="panel tr-lock">${icon('lock')}<b>Encore scellée</b><p class="small">Vaincs ton <b>premier gardien</b> dans la Descente (étage 5) pour ouvrir la Salle des jeux.</p><a class="btn primary block" href="#/descente">${icon('p:descend')}Aller à la Descente</a></section>`}
    <div class="gm-list ${g.sceauxOpen() ? '' : 'locked'}">
      ${tile('#/sceaux', 'gm-sceaux', 'Duels des Sceaux', 'Pose tes cartes sur un plateau de 3 × 3 et capture celles de l’adversaire.', `${rec(sc.wins, sc.losses)} · ${Object.keys(sc.beaten || {}).length} / 8 adversaires battus`, 'assets/sceaux/salle.webp')}
      ${tile('#/masques', 'gm-masques', 'La Cour des Masques', 'Bluff à trois : donne une carte, annonce sa faction… et mens si tu l’oses.', `${rec(mq.wins, mq.losses)} · ${Object.keys(mq.beaten || {}).length} / ${MQ.TABLES.length} tables gagnées`, 'assets/ui/bn-masques.webp')}
    </div>`;
}
