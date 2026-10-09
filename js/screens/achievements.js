// Succès et ensembles thématiques.
import { cardHTML, lazyArt } from '../ui/card.js';
import { icon } from '../ui/icons.js';
import { esc, bindActions } from '../ui/dom.js';

export default function achievements(app, root, params) {
  const g = app.game, cat = app.catalog;
  const st = (app.state.ach ||= { tab: 'succes' });
  if (params[0] === 'ensembles') st.tab = 'ensembles';

  function succes() {
    const list = cat.achievements.slice().sort((a, b) => !!g.s.achievements[a.key] - !!g.s.achievements[b.key]);
    return `<div class="ach-list">${list.map((a) => {
      const done = g.s.achievements[a.key];
      const cur = Math.min(g.achievementValue(a), g.achievementTarget(a));
      const tgt = g.achievementTarget(a);
      return `<article class="panel ach ${done ? 'done' : ''}">
        <span class="ach-ic">${icon(done ? 'trophy' : 'lock')}</span>
        <div class="ach-body"><h3>${esc(a.name)}</h3><p class="small muted">${esc(a.desc)}</p>
          ${done ? `<p class="small ok">Débloqué le ${new Date(done).toLocaleDateString('fr-FR')}</p>` : `<span class="progress"><i style="width:${(cur / tgt) * 100}%"></i></span><span class="small muted">${cur} / ${tgt}</span>`}
        </div>
        <span class="ach-reward small">${app.rewardText(a.reward)}</span>
      </article>`;
    }).join('')}</div>`;
  }

  function ensembles() {
    return cat.sets.map((s) => {
      const p = g.setProgress(s.key);
      return `<article class="panel set ${p.done ? 'done' : ''}">
        <div class="row between"><h3>${esc(s.name)}</h3><b class="${p.done ? 'ok' : 'muted'}">${p.owned} / ${p.total}</b></div>
        <p class="small muted">${esc(s.desc)}</p>
        <span class="progress"><i style="width:${(p.owned / p.total) * 100}%"></i></span>
        <p class="small">${icon('star')} Récompense : ${app.rewardText(s.reward)}${p.done ? ' · <span class="ok">obtenue</span>' : ''}</p>
        <div class="strip" data-set="${s.key}">${s.cards.map((id) => { const c = cat.get(id); return g.owns(id) ? cardHTML(c, { lazy: true }) : cardHTML(c, { lazy: true, mystery: true, nameKnown: g.nameKnown(id) }); }).join('')}</div>
      </article>`;
    }).join('');
  }

  function render() {
    const doneA = Object.keys(g.s.achievements).length, doneS = Object.keys(g.s.setsDone).length;
    root.innerHTML = `
      <header class="screen-head"><h1>Succès</h1><p class="muted">${doneA} / ${cat.achievements.length} succès · ${doneS} / ${cat.sets.length} ensembles complétés</p></header>
      <div class="seg wide" role="tablist">${[['succes', 'Succès'], ['ensembles', 'Ensembles']].map(([k, l]) => `<button class="seg-b" role="tab" data-act="tab" data-v="${k}" aria-selected="${st.tab === k}" aria-pressed="${st.tab === k}">${l}</button>`).join('')}</div>
      <div class="stack">${st.tab === 'succes' ? succes() : ensembles()}</div>`;
    lazyArt(root);
  }
  bindActions(root, { tab(el) { st.tab = el.dataset.v; render(); } });
  root.addEventListener('click', (e) => {
    const t = e.target.closest('.strip .tcg');
    if (t) { const set = cat.set[t.closest('.strip').dataset.set]; app.openCard(t.dataset.id, { list: set.cards }); }
  });
  render();
  app.refreshView = render;
  return () => { app.refreshView = null; };
}
