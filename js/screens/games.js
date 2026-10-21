// v425 : la Salle des jeux (Aventure → Jeux) : les jeux de cartes à part (Duels des Sceaux, Enchères, Pacte, Cryptes).
import { icon } from '../ui/icons.js';
import { setScene } from '../ui/scene.js';
import * as EN from '../core/encheres.js';
import * as PA from '../core/pacte.js';
import * as CR from '../core/cryptes.js';
import * as cloud from '../cloud/cloud.js';

export default function gamesScreen(app, root) {
  const g = app.game;
  setScene('menu');
  const vs = g.s.versus, sc = g.s.sceaux, en = g.s.encheres, pa = g.s.pacte, cr = g.s.cryptes;
  const rec = (w, l) => (w + l ? `${w} victoire${w > 1 ? 's' : ''} · ${l} défaite${l > 1 ? 's' : ''}` : 'Pas encore joué');
  /* v466 : chaque tuile dit si son défi du jour reste à relever */
  const left = g.gamesDailyLeft(), opened = { sceaux: g.sceauxDailyOpen(), pacte: g.pacteDailyOpen(), cryptes: g.cryptesDailyOpen(), encheres: g.encheresDailyOpen() };
  const daily = (k) => (!g.sceauxOpen() || !opened[k] ? '' : left.includes(k) ? `<span class="gm-daily">${icon('p:hourglass')}Défi du jour à relever</span>` : g.dailyState(k) === 'tried' ? `<span class="gm-daily done">${icon('p:hourglass')}Défi du jour tenté</span>` : `<span class="gm-daily done">${icon('check')}Défi du jour relevé</span>`); /* v538 : un seul essai */
  const tile = (href, cls, title, sub, info, img) => `<a class="panel gm-tile ${cls}" href="${href}"><span class="gm-art" style="background-image:url(${img})"></span>
    <span class="gm-txt"><b>${title}</b><span class="small">${sub}</span><span class="small muted">${info}</span>${daily(href.slice(2))}</span>${icon('next')}</a>`;
  root.innerHTML = `<header class="screen-head ui-hero bn-jeux"><h1>Salle des jeux</h1><p class="muted">Des jeux de cartes à part, contre les arbitres de l’Abysse.</p></header>
    ${g.sceauxOpen() ? '' : `<section class="panel tr-lock">${icon('lock')}<b>Encore scellée</b><p class="small">Vaincs ton <b>premier gardien</b> dans la Descente (étage 5) pour ouvrir la Salle des jeux.</p><a class="btn primary block" href="#/descente">${icon('p:descend')}Aller à la Descente</a></section>`}
    <div class="gm-list ${g.sceauxOpen() ? '' : 'locked'}">
      ${tile('#/sceaux', 'gm-sceaux', 'Duels des Sceaux', 'Pose tes cartes sur un plateau de 3 × 3 et capture celles de l’adversaire.', `${rec(sc.wins, sc.losses)} · ${Object.keys(sc.beaten || {}).length} / 8 adversaires battus`, 'assets/ui/bn-sceaux.webp')}
      ${tile('#/cryptes', 'gm-cryptes', 'Les Cryptes', 'Un jeu de mémoire : retrouve les paires et réveille les pouvoirs des factions.', `${rec(cr.wins, cr.losses)} · ${Object.keys(cr.beaten || {}).length} / ${CR.TABLES.length} cryptes gagnées`, 'assets/ui/bn-cryptes.webp')}
      ${tile('#/pacte', 'gm-pacte', 'Le Pacte', 'Tire des cartes, encore une… et arrête-toi avant de briser le pacte.', `${rec(pa.wins, pa.losses)} · ${Object.keys(pa.beaten || {}).length} / ${PA.TABLES.length} pactes gagnés`, 'assets/ui/bn-pacte.webp')}
      ${tile('#/versus', 'gm-versus', 'Le Pari des Boosters', 'Contre un autre joueur : ouvrez vos boosters face à face, le meilleur total remporte toutes les cartes.', vs.played ? `${vs.played} duel${vs.played > 1 ? 's' : ''} · ${vs.wins} victoire${vs.wins > 1 ? 's' : ''} · ${vs.won} cartes gagnées` : 'Joue en ligne contre d’autres joueurs', 'assets/ui/bn-versus.webp')}
      ${tile('#/encheres', 'gm-encheres', 'Les Enchères de Mammon', 'Enchères à l’aveugle à trois : offre plus que les autres… sans jamais offrir pareil.', `${rec(en.wins, en.losses)} · ${Object.keys(en.beaten || {}).length} / ${EN.TABLES.length} ventes gagnées`, 'assets/ui/bn-encheres.webp')}
    </div>`;
  /* v519 : parties en ligne qui attendent ton coup (v523 : Sceaux et Pacte) */
  if (cloud.isLoggedIn()) for (const gm of ['sceaux', 'pacte', 'encheres', 'cryptes']) cloud.mpList(gm).then((L) => {
    const n = L.filter((v) => v.status === 'playing' && (v.turn === v.me || v.turn === 'ab')).length;
    const t = root.querySelector(`.gm-${gm} .gm-txt`);
    if (n && t) t.insertAdjacentHTML('beforeend', `<span class="gm-daily">${icon('p:hourglass')}À toi de jouer en ligne (${n})</span>`);
  }).catch(() => {});
  /* v512 : duels du Versus relevés pendant ton absence */
  if (g.sceauxOpen() && cloud.isLoggedIn()) cloud.versusList().then((d) => {
    const n = (d?.mine || []).filter((r) => r.status === 'done' && !r.claimed).length;
    const t = root.querySelector('.gm-versus .gm-txt');
    if (n && t && !t.querySelector('.gm-daily')) t.insertAdjacentHTML('beforeend', `<span class="gm-daily">${icon('p:hourglass')}${n} duel${n > 1 ? 's' : ''} à voir</span>`);
  }).catch(() => {});
}
