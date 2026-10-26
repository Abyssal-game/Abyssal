// Succès et ensembles thématiques.
import { cardHTML, lazyArt } from '../ui/card.js';
import { icon, setIcon } from '../ui/icons.js';
import { esc, bindActions, fmt, toast, confirmBox, paint } from '../ui/dom.js';

/* v732 : un médaillon peint par famille de succès (assets/icons/ach-<famille>.webp). Tant qu'une image manque
   (famille absente de ACH_PAINTED), l'ancienne icône reste. */
const ACH_FAM = { unique: 'collection', rarity: 'collection', factions: 'collection', evolines: 'collection', boosters: 'boosters', daily: 'boosters',
  depth: 'descente', hunted: 'combat', trophies: 'combat', trialWins: 'combat', trialPerfect: 'combat', sets: 'ensembles', variants: 'finitions', finish: 'finitions', burned: 'forge', mastered: 'forge', cardLevel: 'forge', chocWins: 'choc', chocStreak: 'choc', chocLeague: 'choc' }; /* v807 */
const ACH_PAINTED = new Set(['collection', 'boosters', 'descente', 'combat', 'ensembles', 'finitions', 'forge', 'choc']);
const achIc = (a, done) => { const f = ACH_FAM[a.cond?.type] || 'collection';
  return ACH_PAINTED.has(f) ? `<span class="ach-ic med ${done ? '' : 'off'}"><img alt="" src="assets/icons/ach-${f}.webp"></span>` : `<span class="ach-ic">${icon(done ? 'trophy' : 'star')}</span>`; };

export default function achievements(app, root, params) {
  const g = app.game, cat = app.catalog;
  const st = (app.state.ach ||= { tab: 'succes' });
  if (params[0] === 'ensembles') st.tab = 'ensembles';

  // Les succès les plus proches d'abord ; le reste et les succès débloqués sont repliés.
  function succes() {
    const row = (a) => {
      const done = g.s.achievements[a.key];
      const cur = Math.min(g.achievementValue(a), g.achievementTarget(a));
      const tgt = g.achievementTarget(a);
      return `<article class="panel ach ${done ? 'done' : ''}">
        ${achIc(a, done)}
        <div class="ach-body"><h3>${esc(a.name)}</h3><p class="small muted">${esc(a.desc)}</p>
          ${done ? '' : `<span class="progress"><i style="width:${(cur / tgt) * 100}%"></i></span>`}
          <span class="small muted">${done ? `Débloqué le ${new Date(done).toLocaleDateString('fr-FR')}` : `${cur} / ${tgt}`} · ${app.rewardText(a.reward)}</span>
        </div>
      </article>`;
    };
    const ratio = (a) => Math.min(g.achievementValue(a), g.achievementTarget(a)) / g.achievementTarget(a);
    const todo = cat.achievements.filter((a) => !g.s.achievements[a.key]).sort((x, y) => ratio(y) - ratio(x));
    const done = cat.achievements.filter((a) => g.s.achievements[a.key]);
    return `<h2 class="section-title">Les plus proches</h2>
      <div class="ach-list">${todo.slice(0, 5).map(row).join('') || '<p class="muted">Tous les succès sont débloqués. Bravo !</p>'}</div>
      ${todo.length > 5 ? `<details class="panel dc-fold"><summary>${icon('star')} Les ${todo.length - 5} autres succès</summary><div class="ach-list">${todo.slice(5).map(row).join('')}</div></details>` : ''}
      ${done.length ? `<details class="panel dc-fold"><summary>${icon('trophy')} Débloqués <span class="small muted">${done.length}</span></summary><div class="ach-list">${done.map(row).join('')}</div></details>` : ''}`;
  }

  function ensembles() {
    return cat.sets.map((s) => {
      const p = g.setProgress(s.key);
      return `<article class="panel set ${p.done ? 'done' : ''}">
        <div class="row between"><h3 class="set-h">${setIcon(s.key)}<span>${esc(s.name)}</span></h3><b class="${p.done ? 'ok' : 'muted'}">${p.owned} / ${p.total}</b></div>
        <p class="small muted">${esc(s.desc)}</p>
        <span class="progress"><i style="width:${(p.owned / p.total) * 100}%"></i></span>
        <p class="small">${icon('star')} Récompense : ${app.rewardText(s.reward)}${p.done ? ' · <span class="ok">obtenue</span>' : ''}</p>
        <div class="strip" data-set="${s.key}">${s.cards.map((id) => { const c = cat.get(id); return g.owns(id) ? cardHTML(c, { lazy: true }) : cardHTML(c, { lazy: true, mystery: true, nameKnown: g.nameKnown(id) }); }).join('')}${s.key === 'scelleurs' ? '<div class="set-ghost" aria-label="Septième Scelleur : nom gratté"><b>VII</b><small>Nom gratté</small></div>' /* v676 : la place du Menteur reste vide */ : ''}</div>
      </article>`;
    }).join('');
  }

  function render() {
    const doneA = Object.keys(g.s.achievements).length, doneS = Object.keys(g.s.setsDone).length;
    paint(root, `
      <header class="screen-head ui-hero bn-trophies"><h1>Succès</h1><p class="muted">${doneA} / ${cat.achievements.length} succès · ${doneS} / ${cat.sets.length} ensembles complétés</p></header>
      <div class="seg wide" role="tablist">${[['succes', 'Succès'], ['ensembles', 'Ensembles']].map(([k, l]) => `<button class="seg-b" role="tab" data-act="tab" data-v="${k}" aria-selected="${st.tab === k}" aria-pressed="${st.tab === k}">${l}</button>`).join('')}</div>
      <div class="stack">${st.tab === 'succes' ? succes() : ensembles()}</div>`);
    lazyArt(root);
  }
  bindActions(root, {
    tab(el) { st.tab = el.dataset.v; render(); window.scrollTo(0, 0); },
  });
  root.addEventListener('click', (e) => {
    const t = e.target.closest('.strip .tcg');
    if (t) { const set = cat.set[t.closest('.strip').dataset.set]; app.openCard(t.dataset.id, { list: set.cards }); }
  });
  render();
  app.refreshView = render;
  return () => { app.refreshView = null; };
}
