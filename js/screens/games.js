import { paint } from '../ui/dom.js';
// v425 : le Cercle de l’Abysse (Aventure → Jeux) : les jeux de cartes à part (Duels des Sceaux, Enchères, Pacte, Cryptes).
import { icon } from '../ui/icons.js';
import { setScene } from '../ui/scene.js';
import * as EN from '../core/encheres.js';
import * as PA from '../core/pacte.js';
import * as CR from '../core/cryptes.js';
import * as SC from '../core/sceaux.js';
import * as cloud from '../cloud/cloud.js';
import { toast, esc, bindActions } from '../ui/dom.js';
import { cleanCard } from '../core/friends.js';

export default function gamesScreen(app, root) {
  const g = app.game;
  setScene('menu');
  const vs = g.s.versus, sc = g.s.sceaux, en = g.s.encheres, pa = g.s.pacte, cr = g.s.cryptes;
  const rec = (w, l) => (w + l ? `${w} victoire${w > 1 ? 's' : ''} · ${l} défaite${l > 1 ? 's' : ''}` : 'Pas encore joué');
  /* v466 : chaque tuile dit si son défi du jour reste à relever */
  const left = g.gamesDailyLeft(), opened = { sceaux: g.sceauxDailyOpen(), pacte: g.pacteDailyOpen(), cryptes: g.cryptesDailyOpen(), encheres: g.encheresDailyOpen() };
  const daily = (k) => (!g.sceauxOpen() || !opened[k] ? '' : left.includes(k) ? `<span class="gm-daily">${icon('p:hourglass')}Défi du jour à relever</span>` : g.dailyState(k) === 'tried' ? `<span class="gm-daily done">${icon('p:hourglass')}Défi du jour tenté</span>` : `<span class="gm-daily done">${icon('check')}Défi du jour relevé</span>`); /* v538 : un seul essai */
  /* v700 : le prochain adversaire (portrait peint) sur chaque tuile, pour donner envie d'y retourner */
  const firstLeft = (T, beaten) => T.find((x) => !(beaten || {})[x.key]);
  const nextOf = { sceaux: () => { const r = SC.RIVALS.find((x) => !(sc.beaten || {})[x.key]); return r ? [r.key] : null; },
    pacte: () => { const t = firstLeft(PA.TABLES, pa.beaten); return t ? [t.rival] : null; },
    cryptes: () => { const t = firstLeft(CR.TABLES, cr.beaten); return t ? [t.rival] : null; },
    encheres: () => { const t = firstLeft(EN.TABLES, en.beaten); return t ? t.seats : null; } };
  const nextHTML = (k) => { const n = nextOf[k]?.(); return n ? `<span class="gm-next">${n.map((r) => `<img alt="" src="assets/sceaux/rival2-${r}.webp">`).join('')}<small>Prochain défi</small></span>` : ''; };
  const tile = (href, cls, title, sub, info, img) => `<a class="panel gm-tile ${cls}" href="${href}"><span class="gm-art" style="background-image:url(${img})"></span>
    <span class="gm-txt"><b>${title}</b><span class="small">${sub}</span><span class="small muted">${info}</span>${nextHTML(href.slice(2))}${daily(href.slice(2))}</span>${icon('next')}</a>`;
  /* v795 : Tournoi du Cercle (un jeu par semaine, ses 8 adversaires d'affilée) */
  const TN = g.tourney(), TNAME = { sceaux: 'Duels des Sceaux', pacte: 'Le Pacte', cryptes: 'Les Cryptes', encheres: 'Les Enchères de Mammon' };
  const tnPic = (k, i) => { const T = k === 'sceaux' ? SC.RIVALS : k === 'pacte' ? PA.TABLES : k === 'cryptes' ? CR.TABLES : EN.TABLES, x = T[i]; return k === 'sceaux' ? x.key : k === 'encheres' ? x.seats?.[0] : x.rival; };
  const done = TN.alive ? TN.round : 0, next = TN.alive && TN.round < TN.tables.length ? TN.round : 0;
  const tourneyHTML = () => `<section class="panel tn-box ${TN.champ ? 'champ' : ''}">
    <div class="tn-h">${icon('trophy')}<span><b>Tournoi du Cercle</b><small>Cette semaine : ${TNAME[TN.game]} · fin dimanche soir</small></span></div>
    <ol class="tn-pips">${TN.tables.map((k, i) => `<li class="${i < done ? 'ok' : ''} ${i === next && !TN.champ ? 'cur' : ''}"><img alt="" src="assets/sceaux/rival2-${tnPic(TN.game, i)}.webp">${i < done ? `<i>${icon('check')}</i>` : ''}</li>`).join('')}</ol>
    <p class="small tn-line">${TN.champ && TN.round >= TN.tables.length ? '<b>Champion du Cercle</b> cette semaine ! Tu peux rejouer pour le plaisir.' : !TN.alive ? `Série arrêtée. Ton meilleur score de la semaine : <b>${TN.best} / ${TN.tables.length}</b>. Recommence depuis la première manche.` : TN.round ? `${TN.round} victoire${TN.round > 1 ? 's' : ''} d’affilée. Une défaite, et la série s’arrête.` : 'Bats les 8 adversaires d’affilée, dans l’ordre des salles. Une défaite ou une égalité, et tout recommence.'}</p>
    <p class="small muted tn-rw">${TN.gold ? icon('check') : ''} 4 victoires : coffre d’or · ${TN.champ ? icon('check') : ''} 8 victoires : coffre abyssal et 2 tickets premium</p>
    <button class="btn primary block dc-plq dc-plq-red" data-act="tplay">${icon('trophy')}${!TN.alive || TN.round >= TN.tables.length ? 'Recommencer le tournoi' : `Jouer la manche ${TN.round + 1}`}</button>
    <div class="tn-fr"></div>
  </section>`;
  paint(root, `<header class="screen-head ui-hero bn-jeux"><h1>Le Cercle de l’Abysse</h1><p class="muted">Des jeux de cartes contre les arbitres de l’Abysse, ou contre d’autres joueurs.</p></header>
    ${g.sceauxOpen() ? '' : `<section class="panel tr-lock">${icon('lock')}<b>Encore scellée</b><p class="small">Vaincs ton <b>premier gardien</b> dans la Descente (étage 5) pour ouvrir le Cercle de l’Abysse.</p><a class="btn primary block" href="#/descente">${icon('p:descend')}Aller à la Descente</a></section>`}
    ${g.sceauxOpen() ? tourneyHTML() : ''}
    <div class="gm-list ${g.sceauxOpen() ? '' : 'locked'}">
      ${tile('#/sceaux', 'gm-sceaux', 'Duels des Sceaux', 'Pose tes cartes sur un plateau de 3 × 3 et capture celles de l’adversaire.', `${rec(sc.wins, sc.losses)} · ${Object.keys(sc.beaten || {}).length} / 8 adversaires battus`, 'assets/ui/bn-sceaux.webp')}
      ${tile('#/cryptes', 'gm-cryptes', 'Les Cryptes', 'Un jeu de mémoire : retrouve les paires et réveille les pouvoirs des factions.', `${rec(cr.wins, cr.losses)} · ${Object.keys(cr.beaten || {}).length} / ${CR.TABLES.length} cryptes gagnées`, 'assets/ui/bn-cryptes.webp')}
      ${tile('#/pacte', 'gm-pacte', 'Le Pacte', 'Tire des cartes, encore une… et arrête-toi avant de briser le pacte.', `${rec(pa.wins, pa.losses)} · ${Object.keys(pa.beaten || {}).length} / ${PA.TABLES.length} pactes gagnés`, 'assets/ui/bn-pacte.webp')}
      ${tile('#/encheres', 'gm-encheres', 'Les Enchères de Mammon', 'Enchères à l’aveugle à trois : offre plus que les autres… sans jamais offrir pareil.', `${rec(en.wins, en.losses)} · ${Object.keys(en.beaten || {}).length} / ${EN.TABLES.length} ventes gagnées`, 'assets/ui/bn-encheres.webp')}
    </div>`);
  /* v519 : parties en ligne qui attendent ton coup (v523 : Sceaux et Pacte) */
  if (cloud.isLoggedIn()) for (const gm of ['sceaux', 'pacte', 'encheres', 'cryptes']) cloud.mpList(gm).then((L) => {
    const n = L.filter((v) => v.status === 'playing' && (v.turn === v.me || v.turn === 'ab')).length;
    const t = root.querySelector(`.gm-${gm} .gm-txt`);
    if (n && t) t.insertAdjacentHTML('beforeend', `<span class="gm-daily">${icon('p:hourglass')}À toi de jouer en ligne (${n})</span>`);
  }).catch(() => {});
  if (!root.__tn) { root.__tn = true; bindActions(root, { tplay() {
    try { const T = g.tourney(), cur = g.tourneyPlay(); app.sfx.tap?.(); location.hash = `#/${T.game}`; setTimeout(() => toast(`Tournoi du Cercle · manche ${cur.tourney.round + 1} sur ${T.tables.length}`, { icon: 'trophy' }), 400); } catch (e) { toast(esc(e.message), { kind: 'error' }); }
  } }); }
  /* classement de la semaine entre amis (fiches des amis, sans SQL de plus) */
  if (cloud.isLoggedIn() && g.sceauxOpen()) cloud.friendList().then(async (rows) => {
    const fr = rows.filter((r) => r.status === 'accepted');
    if (!fr.length) return;
    const cards = await cloud.playerCards(fr.map((r) => r.id));
    const byId = Object.fromEntries(cards.map((c) => [c.id, cleanCard(c.data)]));
    const list = [{ me: true, pseudo: 'Toi', b: TN.best }, ...fr.map((r) => ({ pseudo: r.pseudo, id: r.id, b: byId[r.id]?.st?.tn?.w === TN.week ? byId[r.id].st.tn.b : 0 }))].sort((a, b) => b.b - a.b).slice(0, 8);
    const box = root.querySelector('.tn-fr');
    if (box) box.innerHTML = `<b class="small">Entre amis, cette semaine</b><ol class="tn-rank">${list.map((x) => `<li class="${x.me ? 'me' : ''}"${x.id ? ` data-profile="${x.id}"` : ''}><span class="notranslate" translate="no">${esc(x.pseudo || '?')}</span><b>${x.b} / ${TN.tables.length}</b></li>`).join('')}</ol>`;
  }).catch(() => {});
}
