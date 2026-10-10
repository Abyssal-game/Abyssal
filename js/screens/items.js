// Objets : rayon de la boutique et sac du joueur (utilisation, choix d'une carte cible).
import { ITEMS } from '../config.js';
import { cardHTML, lazyArt } from '../ui/card.js';
import { icon } from '../ui/icons.js';
import { esc, fmt, toast, openSheet } from '../ui/dom.js';

export function itemsShopHTML(g) {
  return `<h2 class="section-title">Objets</h2>
    <div class="items">${Object.entries(ITEMS).map(([k, it]) => {
      const lim = it.limit ? it.limit - g.boughtToday(k) : null;
      const can = g.s.shards >= it.price && (lim === null || lim > 0);
      return `<article class="panel item">
        <span class="item-ic">${icon(it.icon)}</span>
        <div class="item-t"><b>${esc(it.name)}</b><p class="small muted">${esc(it.desc)}</p>
          <span class="small">${g.itemCount(k) ? `Dans ton sac : <b>${g.itemCount(k)}</b>` : ''}${lim !== null ? `${g.itemCount(k) ? ' · ' : ''}<span class="muted">${lim} achat${lim > 1 ? 's' : ''} restant${lim > 1 ? 's' : ''} aujourd’hui</span>` : ''}</span></div>
        <button class="btn small ${can ? 'gold' : ''}" data-item-buy="${k}" ${can ? '' : 'disabled'}>${icon('crystal')}${fmt(it.price)}</button>
      </article>`;
    }).join('')}</div>`;
}

export function bindItemShop(app, root, after) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-item-buy]');
    if (!b || b.disabled) return;
    try { app.game.buyItem(b.dataset.itemBuy); app.sfx.coin(); toast(`<b>${esc(ITEMS[b.dataset.itemBuy].name)}</b> rejoint ton sac.`, { kind: 'success', icon: ITEMS[b.dataset.itemBuy].icon }); after(); }
    catch (err) { app.sfx.error(); toast(esc(err.message), { kind: 'error' }); }
  });
}

// Sac : objets possédés et leur utilisation
export function bagHTML(g) {
  const owned = Object.keys(ITEMS).filter((k) => g.itemCount(k));
  return `<section class="panel bag"><div class="row between"><h3>${icon('booster')} Ton sac</h3><a class="small" href="#/boutique">Acheter des objets</a></div>
    ${owned.length ? `<div class="bag-list">${owned.map((k) => `<button class="bag-it" data-item-use="${k}" title="${esc(ITEMS[k].desc)}"><span class="item-ic sm">${icon(ITEMS[k].icon)}</span><span>${esc(ITEMS[k].name)}</span><b>×${g.itemCount(k)}</b></button>`).join('')}</div>`
      : '<p class="small muted">Vide. Les baumes soignent tes cartes blessées, les torches bénies offrent une expédition de plus.</p>'}
  </section>`;
}

export function bindBag(app, root, after) {
  const g = app.game, cat = app.catalog;
  const use = (k, target) => {
    try { g.useItem(k, target); app.sfx.discover(); toast(`Objet utilisé : ${esc(ITEMS[k].name)}.`, { kind: 'success', icon: ITEMS[k].icon }); after(); }
    catch (err) { app.sfx.error(); toast(esc(err.message), { kind: 'error' }); }
  };
  const pickCard = (k, ids, title) => {
    if (!ids.length) { toast(k === 'baume' ? 'Aucune carte blessée.' : 'Aucune carte disponible.', { icon: 'info' }); return; }
    const s = openSheet(`<h2>${esc(title)}</h2><div class="grid-cards">${ids.map((id) => `<div class="pick-c" data-id="${id}">${cardHTML(cat.get(id), { lazy: true, variant: g.bestCombatVariant(id) })}<span class="dc-lv">Niv. ${g.cardLevel(id)}</span></div>`).join('')}</div>`, { label: title });
    lazyArt(s.body);
    s.body.addEventListener('click', (e) => { const t = e.target.closest('.pick-c'); if (t) { s.close(); use(k, t.dataset.id); } });
  };
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-item-use]');
    if (!b) return;
    const k = b.dataset.itemUse;
    if (k === 'baume') pickCard(k, Object.keys(g.s.descent.wounds).filter((id) => g.isWounded(id) && g.owns(id)), 'Soigner quelle carte ?');
    else if (k === 'parchemin') pickCard(k, [...new Set([...g.s.descent.team, ...Object.keys(g.s.collection)])].filter((id) => g.owns(id)).slice(0, 60), 'Donner l’expérience à quelle carte ?');
    else use(k);
  });
}
