// Accueil : logo, deux accès principaux et ce qui est à faire aujourd'hui.
import { cardHTML, lazyArt } from '../ui/card.js';
import { artUrl, hasRealArt } from '../art/assets.js';
import { icon, EMBLEM, sigil, picon } from '../ui/icons.js';
import { esc, fmt, toast, bindActions, pct } from '../ui/dom.js';
import { FACTION_ORDER } from '../config.js';
import { seeded } from '../art/geometry.js';
import { today } from '../core/save.js';
import { openFusion } from './fusion.js';
import { FUSION } from '../config.js';
import { setScene } from '../ui/scene.js';

// Icône et couleur de chaque type de mission du jour
const MISSION_LOOK = { booster: ['booster', '#E0485E'], new: ['book', '#B48CFF'], rare: ['crystal', '#6FB4FF'], variant: ['holo', '#FF8AD8'], ritual: ['ritual', '#FF9A3A'], depth: ['depth', '#9C7BFF'], win: ['crown', '#F2C14E'], daily: ['crystal', '#7FD3FF'], chest: ['chest', '#E8C35A'] };

export default function home(app, root) {
  const g = app.game, cat = app.catalog, s = g.s;
  const total = g.total(), owned = g.uniqueCount();
  const ev = g.event();
  const daily = g.dailyAmount();
  const recent = s.recent.map((id) => cat.get(id)).filter(Boolean).slice(0, 10);
  const freeCount = Object.values(s.tickets).reduce((a, b) => a + b, 0) + g.freePack().stock;

  const chests = g.chestCount();

  // « Aujourd'hui » : tout ce qui se récupère ou s'accomplit dans la journée, au même endroit.
  function todayHTML() {
    const m = g.missions();
    const allClaimed = m.list.every((x) => x.claimed);
    const rows = [];
    // Série de jours : 7 cases, un coffre de fer au 7e jour
    const sd = g.canDailyClaim() ? daily.streak : (s.daily.streak || 0), pos = ((sd - 1) % 7) + 1;
    const streakBar = `<span class="td-streak">${Array.from({ length: 7 }, (_, k) => `<i class="${k < (g.canDailyClaim() ? pos - 1 : pos) ? 'on' : ''} ${k === pos - 1 && g.canDailyClaim() ? 'now' : ''} ${k === 6 ? 'chest' : ''}">${k === 6 ? icon('lock') : k + 1}</i>`).join('')}</span>`;
    rows.push(`<div class="td-row td-daily ${g.canDailyClaim() ? '' : 'done'}"><span class="td-ic mi" style="--mc:#7FD3FF">${picon('crystal')}</span><span class="td-t"><b>Offrande du jour</b><span class="small muted">${g.canDailyClaim() ? `Jour ${pos} sur 7${pos === 7 ? ' : un coffre de fer en plus !' : ''}` : `Récupérée · série de ${sd} jour${sd > 1 ? 's' : ''}`}</span>${streakBar}</span>${g.canDailyClaim() ? `<button class="btn small gold" data-act="daily">+${daily.amount}</button>` : `<span class="small muted">Demain</span>`}</div>`);
    const wk = g.weekly(), wc = cat.get(wk.id);
    if (!wk.done) rows.push(`<a class="td-row" href="#/descente"><span class="td-ic mi td-wk" style="--mc:#FF6B7F"><img alt="" src="${artUrl(wc, { lite: true })}"></span><span class="td-t"><b>Créature de la semaine</b><span class="small muted">Vaincs ${esc(wc.name)} dans l’Abysse pour gagner sa carte</span></span>${icon('next')}</a>`);
    m.list.forEach((x, i) => {
      const done = x.p >= x.n;
      rows.push(`<div class="td-row ${x.claimed ? 'done' : ''}"><span class="td-ic mi" style="--mc:${x.faction ? cat.faction[x.faction].colors.secondary : MISSION_LOOK[x.kind]?.[1] || '#C8A45D'}">${x.claimed ? icon('check') : x.faction ? sigil(x.faction) : picon(MISSION_LOOK[x.kind]?.[0] || 'seal')}</span><span class="td-t"><b>${esc(x.text)}</b>${x.claimed ? '' : `<span class="progress"><i style="width:${(x.p / x.n) * 100}%"></i></span>`}</span>${x.claimed ? '<span class="small muted">Fait</span>' : done ? `<button class="btn small gold" data-act="mission" data-i="${i}">+${x.shards}</button>` : `<span class="td-n small muted">${x.p}/${x.n}</span>`}</div>`);
    });
    if (allClaimed && !m.bonus) rows.push(`<div class="td-row"><span class="td-ic mi" style="--mc:#F2C14E">${picon('booster')}</span><span class="td-t"><b>Bonus des 3 missions</b><span class="small muted">Un booster et un coffre de fer</span></span><button class="btn small primary" data-act="mbonus">Récupérer</button></div>`);
    if (chests) rows.push(`<a class="td-row" href="#/coffres"><span class="td-ic mi" style="--mc:#E8C35A">${picon('chest')}</span><span class="td-t"><b>${chests} coffre${chests > 1 ? 's' : ''} à ouvrir</b><span class="small muted">Pleins de boosters</span></span>${icon('next')}</a>`);
    return `<section class="panel today"><div class="today-head"><h2>Aujourd’hui</h2></div>${rows.join('')}</section>`;
  }

  root.innerHTML = `
    <section class="home-brand">
      <h1 class="hb-title"><img src="assets/brand/title.webp" alt="ABYSSAL — Le Bestiaire interdit"></h1>
    </section>

    <div class="home-acts">
      <a class="ha ha-pack" href="#/boutique"><span class="ha-art"></span><b>Boosters</b><span>${freeCount ? `${freeCount} offert${freeCount > 1 ? 's' : ''}` : 'Tente ta chance'}</span>${freeCount ? `<span class="cta-badge">${freeCount}</span>` : ''}</a>
      <a class="ha ha-dive" href="#/descente"><span class="ha-art"></span><b>Aventure</b><span>${g.descent().run ? `En cours · étage ${g.descent().run.floor}` : g.torchesLeft() ? `${g.torchesLeft()} torche${g.torchesLeft() > 1 ? 's' : ''} aujourd’hui` : 'Reviens demain'}</span></a>
    </div>

    ${todayHTML()}
    <p class="home-col small muted center"><a href="#/collection">${owned} / ${total} créatures découvertes</a></p>
  `;
  lazyArt(root);
  setScene('home');
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
        toast(`Offrande reçue : <b>+${r.amount} éclats</b>${r.chest ? ' et <b>un coffre de fer</b> pour tes 7 jours d’affilée !' : ''}`, { kind: r.chest ? 'epic' : 'success', icon: 'crystal' });
        app.refresh();
      } catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
  });
  app.refreshView = () => app.refresh();
  return () => { app.refreshView = null; };
}
