// v807 : Choc des Boosters : écussons des Ligues, flamme de la Série ardente, tableau de chasse (profil, fiche d'un joueur)
import { LEAGUES } from '../core/versus.js';
import { artUrl } from '../art/assets.js';
import { esc, fmt } from './dom.js';
import { t } from '../i18n.js';

/* écusson d'une ligue (image peinte assets/versus/ligue-<clé>.webp ; sans elle, une pastille à sa couleur) */
export const leagueBadge = (i, cls = '') => { const L = LEAGUES[i] || LEAGUES[0];
  return `<span class="vd-lg ${cls}" style="--lgc:${L.color}"><img alt="" src="assets/versus/ligue-${L.k}.webp" onerror="this.remove()"><b>${t(L.name)}</b></span>`; };
/* flamme de la Série ardente (image peinte assets/versus/flamme.webp ; sans elle, l'icône de série) */
export const flameHTML = (n, cls = '') => `<span class="vd-flame ${cls}"><img alt="" src="assets/versus/flamme.webp" onerror="this.onerror=null;this.src='assets/icons/streak.webp'"><b>${n}</b></span>`;

/* tableau de chasse : ch = { w, p, s, b, m, l, t, c, cv } (fiche publiée, js/core/friends.js chocCard) ; month = mois en cours */
export function chocBoardHTML(ch, cat, month, own = false) {
  if (!ch || !ch.p) return '';
  const card = ch.c && cat.get(ch.c);
  const tile = (n, l) => `<div class="panel stat"><b>${n}</b><span>${l}</span></div>`;
  return `<details class="panel dc-fold ch-board"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/swords.webp"><span class="dc-sum-t">${t(own ? 'Ton tableau de chasse' : 'Son tableau de chasse')} · ${t('Choc des Boosters')}</span></summary><div>
    <div class="ch-row">${ch.m === month ? leagueBadge(ch.l, 'big') : ''}${ch.s >= 1 ? flameHTML(ch.s, 'big') : ''}</div>
    <div class="stats-grid">${tile(fmt(ch.w), t('victoires sur {n} duels', { n: fmt(ch.p) }))}${tile(ch.b, t('meilleure série'))}${tile(t(LEAGUES[ch.t]?.name || 'Bronze'), t('meilleure ligue'))}</div>
    ${card ? `<div class="ch-best"><img alt="" src="${artUrl(card, { lite: true })}"><span><small>${t('Plus belle carte sortie au Choc')}</small><b>${esc(card.name)}</b></span></div>` : ''}
  </div></details>`;
}
