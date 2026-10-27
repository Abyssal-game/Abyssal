// v841 : ligne du Tournoi du Cercle sur l'écran de fin des quatre jeux (out.tourney posé par game.tourneyAfter)
import { icon } from './icons.js';
import { t } from '../i18n.js';

export function tourneyLine(out) {
  const r = out?.tourney;
  if (!r) return '';
  const body = r.lost
    ? t('Tournoi du Cercle : série arrêtée à la manche {n}. La prochaine série repart de la 1re manche.', { n: r.round + 1 })
    : r.champ ? t('Tournoi du Cercle : les {n} manches gagnées, champion du Cercle cette semaine !', { n: r.of })
    : t('Tournoi du Cercle : manche {n} sur {of} gagnée.', { n: r.round, of: r.of });
  const gift = r.chest ? ` ${t('Coffre d’or.')}` : r.reward ? ` ${t('Coffre abyssal et 2 tickets premium.')}` : '';
  return `<p class="sc-gain tn-end">${icon('p:crown')} ${body}${gift}</p><a class="btn block dc-plq dc-plq-dark tn-next" href="#/jeux">${r.lost || r.champ ? t('Retour au Tournoi') : t('Manche suivante')}</a>`;
}
