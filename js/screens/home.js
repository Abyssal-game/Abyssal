// Accueil : logo, deux accès principaux et ce qui est à faire aujourd'hui.
import { cardHTML, lazyArt } from '../ui/card.js';
import { artUrl, hasRealArt } from '../art/assets.js';
import { icon, EMBLEM, sigil } from '../ui/icons.js';
import { esc, fmt, toast, bindActions, pct } from '../ui/dom.js';
import { FACTION_ORDER } from '../config.js';
import { seeded } from '../art/geometry.js';
import { today } from '../core/save.js';
import { openFusion } from './fusion.js';
import { FUSION } from '../config.js';

export default function home(app, root) {
  const g = app.game, cat = app.catalog, s = g.s;
  const total = g.total(), owned = g.uniqueCount();
  const ev = g.event();
  const daily = g.dailyAmount();
  const recent = s.recent.map((id) => cat.get(id)).filter(Boolean).slice(0, 10);
  const freeCount = Object.values(s.tickets).reduce((a, b) => a + b, 0) + g.freePack().stock;

  const chests = Object.values(g.arsenal().chests).reduce((a, n) => a + n, 0);

  // « Aujourd'hui » : tout ce qui se récupère ou s'accomplit dans la journée, au même endroit.
  function todayHTML() {
    const m = g.missions();
    const allClaimed = m.list.every((x) => x.claimed);
    const rows = [];
    if (g.canDailyClaim()) rows.push(`<div class="td-row"><span class="td-ic gold">${icon('crystal')}</span><span class="td-t"><b>Offrande du jour</b><span class="small muted">${daily.streak > 1 ? `Série de ${daily.streak} jours` : 'À récupérer chaque jour'}</span></span><button class="btn small gold" data-act="daily">+${daily.amount}</button></div>`);
    m.list.forEach((x, i) => {
      const done = x.p >= x.n;
      rows.push(`<div class="td-row ${x.claimed ? 'done' : ''}"><span class="td-ic">${x.claimed ? icon('check') : icon('star')}</span><span class="td-t"><b>${esc(x.text)}</b>${x.claimed ? '' : `<span class="progress"><i style="width:${(x.p / x.n) * 100}%"></i></span>`}</span>${x.claimed ? '<span class="small muted">Fait</span>' : done ? `<button class="btn small gold" data-act="mission" data-i="${i}">+${x.shards}</button>` : `<span class="td-n small muted">${x.p}/${x.n}</span>`}</div>`);
    });
    if (allClaimed && !m.bonus) rows.push(`<div class="td-row"><span class="td-ic gold">${icon('ticket')}</span><span class="td-t"><b>Bonus des 3 missions</b><span class="small muted">Un booster et un coffre de fer</span></span><button class="btn small primary" data-act="mbonus">Récupérer</button></div>`);
    if (chests) rows.push(`<a class="td-row" href="#/arsenal"><span class="td-ic gold">${icon('lock')}</span><span class="td-t"><b>${chests} coffre${chests > 1 ? 's' : ''} à ouvrir</b><span class="small muted">Dans l’Arsenal</span></span>${icon('next')}</a>`);
    return `<section class="panel today"><h2>Aujourd’hui</h2>${rows.join('')}</section>`;
  }

  root.innerHTML = `
    <section class="home-brand">
      <span class="hb-emblem">${EMBLEM}</span>
      <h1 class="wordmark">ABYSSAL</h1>
      <p class="tagline"><i></i>Le Bestiaire interdit<i></i></p>
    </section>

    <div class="home-acts">
      <a class="ha ha-pack" href="#/boutique">${icon('booster')}<b>Boosters</b><span>${freeCount ? `${freeCount} offert${freeCount > 1 ? 's' : ''}` : 'Tente ta chance'}</span>${freeCount ? `<span class="cta-badge">${freeCount}</span>` : ''}</a>
      <a class="ha ha-dive" href="#/descente">${icon('swords')}<b>Aventure</b><span>${g.descent().run ? `En cours · étage ${g.descent().run.floor}` : g.torchesLeft() ? `${g.torchesLeft()} torche${g.torchesLeft() > 1 ? 's' : ''} aujourd’hui` : 'Reviens demain'}</span></a>
    </div>

    ${todayHTML()}
    <p class="home-col small muted center"><a href="#/collection">${owned} / ${total} créatures découvertes</a></p>
  `;
  lazyArt(root);
  bindActions(root, {
    fusion() { openFusion(app); },
    mission(el) {
      try { const r = g.claimMission(Number(el.dataset.i)); app.sfx.coin(); toast(`Mission accomplie : <b>+${r.shards} éclats</b>`, { kind: 'success', icon: 'crystal' }); app.refresh(); }
      catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
    mbonus() {
      try { g.claimMission('bonus'); app.sfx.achievement(); toast('Bonus des missions : <b>1 booster standard</b> et <b>1 coffre de fer</b> !', { kind: 'epic', icon: 'ticket' }); app.refresh(); }
      catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
    daily() {
      try {
        const r = g.claimDaily();
        app.sfx.coin();
        toast(`Offrande reçue : <b>+${r.amount} éclats</b>`, { kind: 'success', icon: 'crystal' });
        app.refresh();
      } catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
  });
  app.refreshView = () => app.refresh();
  return () => { app.refreshView = null; };
}
