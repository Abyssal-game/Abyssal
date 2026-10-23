// v668 : Braises de vie. Une créature tombée pendant un chapitre gagné reste à terre ; une Braise de vie la ranime.
// Fenêtres communes à la Descente et à l'Équipe : ranimer une créature, comprendre d'où viennent les braises.
import { BRAISE } from '../config.js';
import { TEAM } from '../core/army.js';
import { artUrl } from '../art/assets.js';
import { icon } from './icons.js';
import { esc, fmt, toast, openSheet } from './dom.js';
import { t, tw } from '../i18n.js';

/* icône provisoire (torche allumée) en attendant l'image peinte de la Braise de vie */
export const BRAISE_IC = '<img class="br-ic" alt="" src="assets/icons/torch-on.webp">';

const nextFree = (b) => (b.free < BRAISE.max ? 'Une Braise de vie t’est offerte chaque jour.' : '');

export function braiseInfoHTML() {
  return `<h2 class="center">Les Braises de vie</h2>
    <div class="br-big">${BRAISE_IC}</div>
    <p>Une créature qui tombe pendant un chapitre que tu <b>gagnes</b> reste à terre au chapitre suivant. Une Braise de vie la ranime, avec tous ses PV.</p>
    <p>Si le chapitre est <b>perdu ou abandonné</b>, il recommence et toute ton équipe se relève.</p>
    <ul class="br-list">
      <li>${icon('crown')}<span>Chaque gardien vaincu pour la première fois : <b>${BRAISE.boss}</b> Braise de vie (<b>${BRAISE.bossLate}</b> à partir du chapitre ${BRAISE.lateFrom}).</span></li>
      <li>${icon('star')}<span><b>Une offerte chaque jour</b>, qui se garde (${BRAISE.max} au plus en réserve).</span></li>
      <li>${icon('ash')}<span>Une Braise de vie s’achète <b>${BRAISE.ash} cendres</b>.</span></li>
    </ul>
    <p class="small muted center">Il faut au moins ${TEAM.active} créatures debout pour descendre : tu peux aussi remplacer une créature à terre dans ton équipe.</p>`;
}
export const openBraiseInfo = () => openSheet(braiseInfoHTML(), { label: 'Braises de vie', cls: 'dc-sheet br-sheet' });

/* bandeau : nombre de braises, créatures à terre dans l'équipe */
export function braiseBar(g, team) {
  const b = g.braises(), down = team.filter((id) => g.isFallen(id)).length;
  return `<div class="br-bar ${down ? 'down' : ''}"><span class="br-bar-ic">${BRAISE_IC}</span><span class="br-bar-t"><b>Braises de vie : ${b.total}</b><small>${down ? (down > 1 ? `${down} créatures à terre : touche-en une pour la ranimer.` : '1 créature à terre : touche-la pour la ranimer.') : 'Elles raniment une créature tombée.'}</small></span><button class="icon-btn br-info" data-act="braiseinfo" aria-label="Les Braises de vie">${icon('info')}</button></div>`;
}

/* ranimer une créature tombée : une braise, ou une braise achetée en cendres sur-le-champ */
export function openRevive(app, id, onDone) {
  const g = app.game, c = app.catalog.get(id);
  if (!c || !g.isFallen(id)) return;
  const b = g.braises(), canBuy = g.s.ash >= BRAISE.ash;
  const s = openSheet(`<h2 class="center" translate="no">${esc(t('Ranimer {name}', { name: tw(c.name) }))}</h2>
    <div class="br-card"><img alt="" src="${artUrl(c, { lite: true })}"><img class="v2-skull" alt="" src="assets/icons/mort.webp"></div>
    <p class="small center">Une Braise de vie la remet debout, avec tous ses PV.</p>
    ${b.total ? `<button class="btn primary block dc-plq dc-plq-red" data-b="use">${BRAISE_IC}Utiliser une Braise de vie (${b.total})</button>`
      : `<p class="small center muted">Tu n’as plus de Braise de vie. ${nextFree(b)}</p><button class="btn gold block dc-plq dc-plq-dark" data-b="buy" ${canBuy ? '' : 'disabled'}>${icon('ash')}Ranimer · ${fmt(BRAISE.ash)} cendres</button>${canBuy ? '' : `<p class="small center muted">Il te manque ${fmt(BRAISE.ash - g.s.ash)} cendres.</p>`}`}
    <button class="btn ghost block" data-b="info">${icon('info')}D’où viennent les Braises de vie ?</button>`, { label: 'Ranimer', cls: 'dc-sheet br-sheet' });
  s.el.addEventListener('click', (e) => {
    const k = e.target.closest('[data-b]')?.dataset.b;
    if (!k) return;
    if (k === 'info') { s.close(); setTimeout(openBraiseInfo, 280); return; }
    try {
      if (k === 'buy') g.buyBraise();
      g.reviveFallen(id);
      app.sfx.summon?.();
      toast(esc(t('{name} se relève !', { name: tw(c.name) })), { icon: 'heart' });
      s.close();
      onDone?.();
    } catch (err) { toast(esc(err.message), { kind: 'error' }); }
  });
}
