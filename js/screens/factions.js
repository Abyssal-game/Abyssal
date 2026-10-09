// Factions : vue des sept royaumes et page détaillée de chacun.
import { cardHTML, lazyArt } from '../ui/card.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil } from '../ui/icons.js';
import { esc, pct } from '../ui/dom.js';
import { RARITIES, RARITY_ORDER } from '../config.js';

export default function factions(app, root, params) {
  const g = app.game, cat = app.catalog;
  const key = app.route === 'faction' ? params[0] : null;
  if (key && cat.faction[key]) return factionPage(app, root, key);

  root.innerHTML = `
    <header class="screen-head"><h1>Factions</h1><p class="muted">Sept forces nées du premier souffle, sept royaumes qui ne se sont jamais réconciliés.</p></header>
    <div class="fac-list">${cat.factions.map((f) => {
      const p = g.factionProgress(f.key);
      const feat = cat.get(f.featured);
      return `<a class="fac-card" href="#/faction/${f.key}" style="--fc:${f.colors.secondary};--fp:${f.colors.primary}">
        <img alt="" loading="lazy" src="${artUrl(feat, { mystery: !g.owns(feat.id), lite: true })}">
        <span class="fac-veil"></span>
        <span class="fac-text">
          <span class="fac-sig">${sigil(f.key)}</span>
          <b>${esc(f.name)}</b>
          <span class="small">${esc(f.realm)}</span>
          <span class="progress"><i style="width:${p.ratio * 100}%;--bar:${f.colors.secondary}"></i></span>
          <span class="small muted">${p.owned} / ${p.total} · ${pct(p.ratio)}${g.s.factionsDone[f.key] ? ' · complétée' : ''}</span>
        </span>
      </a>`;
    }).join('')}</div>`;
}

function factionPage(app, root, key) {
  const g = app.game, cat = app.catalog, f = cat.faction[key];
  const p = g.factionProgress(key);
  const feat = cat.get(f.featured);
  const RI = (r) => RARITY_ORDER.indexOf(r);
  const top = cat.byFaction[key].slice().sort((a, b) => RI(b.rarity) - RI(a.rarity) || b.power - a.power).slice(0, 8);
  const conflicts = cat.lore.conflicts.filter((c) => c.sides.includes(key));
  root.innerHTML = `
    <a class="back-link" href="#/factions">${icon('back')}Factions</a>
    <section class="fac-hero" style="--fc:${f.colors.secondary};--fp:${f.colors.primary}">
      <img alt="" src="${artUrl(feat, { mystery: !g.owns(feat.id) })}">
      <div class="fac-hero-veil"></div>
      <div class="fac-hero-text"><span class="fac-sig big">${sigil(key)}</span><h1>${esc(f.name)}</h1><p class="lore">${esc(f.realm)} · « ${esc(f.motto)} »</p></div>
    </section>
    <div class="panel"><p>${esc(f.desc)}</p>
      <p class="small"><b style="color:${f.colors.secondary}">Passif de combat · ${esc(f.passive.name)}</b> — ${esc(f.passive.desc)}</p></div>
    <h2 class="section-title">Progression</h2>
    <div class="panel">
      <div class="row between"><b>${p.owned} / ${p.total} créatures</b><span class="muted">${pct(p.ratio)}</span></div>
      <span class="progress"><i style="width:${p.ratio * 100}%;--bar:${f.colors.secondary}"></i></span>
      <div class="rar-bars">${RARITIES.map((r) => { const x = p.byRarity[r.key]; return x.total ? `<div><span style="color:${r.color}">${r.name}</span><b>${x.owned}/${x.total}</b></div>` : ''; }).join('')}</div>
      <p class="small muted">${g.s.factionsDone[key] ? 'Faction complétée : cadre de profil obtenu.' : 'Compléter la faction offre 250 éclats et un cadre de profil.'}${p.ratio < 0.5 ? ' Les noms de ses créatures se révèlent à 50 %.' : ''}</p>
      <div class="row gap wrap"><a class="btn small" href="#/collection/${key}">${icon('cards')}Voir dans la collection</a><a class="btn small primary" href="#/boutique">${icon('booster')}Booster de faction</a></div>
    </div>
    <h2 class="section-title">Créatures principales</h2>
    <div class="strip" id="fac-top">${top.map((c) => (g.owns(c.id) ? cardHTML(c, { lazy: true }) : cardHTML(c, { lazy: true, mystery: true, nameKnown: g.nameKnown(c.id) }))).join('')}</div>
    ${conflicts.length ? `<h2 class="section-title">Conflits</h2>${conflicts.map((c) => `<article class="panel conflict"><h3>${esc(c.title)}</h3><p class="lore">${esc(c.text)}</p></article>`).join('')}` : ''}
  `;
  lazyArt(root);
  root.querySelector('#fac-top').addEventListener('click', (e) => { const t = e.target.closest('.tcg'); if (t) app.openCard(t.dataset.id, { list: top.map((c) => c.id) }); });
  app.refreshView = () => app.refresh();
  return () => { app.refreshView = null; };
}
