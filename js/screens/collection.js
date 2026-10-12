// Collection : recherche, filtres (faction, rareté, possession), tri, grille.
import { cardHTML, lazyArt } from '../ui/card.js';
import { icon, sigil } from '../ui/icons.js';
import { esc, bindActions, pct } from '../ui/dom.js';
import { openRitualHub } from './ritual.js';
import { RARITIES, FACTION_ORDER, RARITY_ORDER, RARITY } from '../config.js';

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function collection(app, root, params) {
  const g = app.game, cat = app.catalog;
  const st = (app.state.col ||= { q: '', factions: [], rarities: [], show: 'all', sort: 'num', view: 'grid', albumFac: 'infernal', albumPage: 0 });
  if (params[0] && FACTION_ORDER.includes(params[0])) { st.factions = [params[0]]; }
  const total = g.total();

  root.innerHTML = `
    <header class="screen-head ui-hero bn-collection">
      <h1>Collection</h1>
      <p class="muted" id="col-summary"></p>
      <span class="progress ui-prog"><i id="col-prog"></i></span>
    </header>
    <div class="col-head-row">
      <button class="btn small gold col-ritual" data-act="ritual">${icon('sparkle')}Rituel</button>
      <div class="seg" role="group" aria-label="Mode d’affichage">${[['grid', 'Grille'], ['album', 'Classeur']].map(([k, l]) => `<button class="seg-b" data-act="view" data-v="${k}" aria-pressed="${(st.view || 'grid') === k}">${l}</button>`).join('')}</div>
    </div>
    <div id="col-main">
    <div class="col-tools">
      <label class="input-wrap"><span class="sr">Rechercher une créature</span>${icon('search')}<input class="input" id="col-q" type="search" placeholder="Rechercher une créature…" value="${esc(st.q)}" autocomplete="off" enterkeyhint="search"></label>
      <div class="seg wide" role="group" aria-label="Afficher">${[['all', 'Toutes'], ['owned', 'Possédées'], ['missing', 'Manquantes'], ['new', 'Nouvelles']].map(([k, l]) => `<button class="seg-b" data-act="show" data-v="${k}" aria-pressed="${st.show === k}">${l}</button>`).join('')}</div>
      <details class="dc-fold col-filters" ${st.factions.length || st.rarities.length ? 'open' : ''}><summary>${icon('filter')} Filtres et tri${st.factions.length + st.rarities.length ? ` <span class="badge">${st.factions.length + st.rarities.length}</span>` : ''}</summary>
        <div class="chips fac-grid" role="group" aria-label="Filtrer par faction">${FACTION_ORDER.map((f) => `<button class="chip" data-act="fac" data-v="${f}" style="--chip:${cat.faction[f].colors.secondary}" aria-pressed="${st.factions.includes(f)}">${sigil(f)}<span class="fg-n">${esc(cat.faction[f].name)}</span></button>`).join('')}</div>
        <div class="chips" role="group" aria-label="Filtrer par rareté">${RARITIES.map((r) => `<button class="chip" data-act="rar" data-v="${r.key}" style="--chip:${r.color}" aria-pressed="${st.rarities.includes(r.key)}"><span class="dot" style="background:${r.color}"></span>${r.name}</button>`).join('')}</div>
        <div class="row between gap wrap"><label class="sort"><span class="sr">Trier par</span>${icon('sort')}<select class="input" id="col-sort">${[['num', 'Numéro'], ['name', 'Nom'], ['rarity', 'Rareté'], ['date', 'Date de découverte']].map(([k, l]) => `<option value="${k}" ${st.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label><button class="linkish" data-act="reset">Réinitialiser</button></div>
      </details>
      <div class="row between small"><span id="col-count" class="muted" aria-live="polite"></span><button class="linkish" data-act="seen" id="col-seen">Tout marquer comme vu</button></div>
    </div>
    <div class="grid-cards" id="col-grid"></div>
    <p class="empty muted center" id="col-empty" hidden>Aucune carte ne correspond à ces filtres.</p>
    </div>
    <div id="col-album" class="album-wrap" hidden></div>
  `;

  let ids = [];
  function filtered() {
    const q = norm(st.q.trim());
    let list = cat.cards.filter((c) => {
      const e = g.entry(c.id);
      if (st.factions.length && !st.factions.includes(c.faction)) return false;
      if (st.rarities.length && !st.rarities.includes(c.rarity)) return false;
      if (st.show === 'owned' && !e) return false;
      if (st.show === 'missing' && e) return false;
      if (st.show === 'new' && !(e && e.isNew)) return false;
      if (q) {
        const known = g.nameKnown(c.id);
        const hay = norm(`${c.id} ${known ? c.name + ' ' + c.title : ''} ${e ? c.category : ''}`);
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const fo = (c) => FACTION_ORDER.indexOf(c.faction) * 1000 + c.number;
    const ri = (c) => RARITY_ORDER.indexOf(c.rarity);
    const sorters = {
      num: (a, b) => fo(a) - fo(b),
      name: (a, b) => (g.nameKnown(b.id) - g.nameKnown(a.id)) || a.name.localeCompare(b.name, 'fr'),
      rarity: (a, b) => ri(b) - ri(a) || fo(a) - fo(b),
      power: (a, b) => (g.owns(b.id) - g.owns(a.id)) || b.power - a.power || fo(a) - fo(b),
      date: (a, b) => (g.entry(b.id)?.first || 0) - (g.entry(a.id)?.first || 0) || fo(a) - fo(b),
    };
    return list.sort(sorters[st.sort] || sorters.num);
  }

  function bestVariant(e) {
    for (const v of ['special', 'galaxy', 'gold', 'holo']) if (e.v[v]) return v;
    return 'normal';
  }

  function drawGrid() {
    const list = filtered();
    ids = list.map((c) => c.id);
    const grid = root.querySelector('#col-grid');
    grid.innerHTML = list.map((c) => {
      const e = g.entry(c.id);
      return e ? cardHTML(c, { lazy: true, count: e.n, isNew: e.isNew, variant: bestVariant(e) })
        : cardHTML(c, { lazy: true, mystery: true, nameKnown: g.nameKnown(c.id) });
    }).join('');
    lazyArt(grid);
    root.querySelector('#col-empty').hidden = list.length > 0;
    const owned = g.uniqueCount();
    root.querySelector('#col-summary').textContent = `${owned} créatures découvertes sur ${total} (${pct(owned / total)}) · ${g.newCount()} nouvelle${g.newCount() > 1 ? 's' : ''}`;
    root.querySelector('#col-prog').style.width = `${(owned / total) * 100}%`;
    root.querySelector('#col-count').textContent = `${list.length} carte${list.length > 1 ? 's' : ''} affichée${list.length > 1 ? 's' : ''}`;
    root.querySelector('#col-seen').hidden = g.newCount() === 0;
  }
  // Classeur : une faction, des pages de 9 emplacements numérotés.
  function drawAlbum() {
    const f = st.albumFac || 'infernal';
    const fac = cat.faction[f];
    const cards = [...cat.byFaction[f]].sort((a, b) => a.number - b.number);
    const pages = [];
    for (let i = 0; i < cards.length; i += 9) pages.push(cards.slice(i, i + 9));
    const box = root.querySelector('#col-album');
    box.innerHTML = `
      <div class="chips fac-grid" role="radiogroup" aria-label="Faction du classeur">${FACTION_ORDER.map((k) => { const p = g.factionProgress(k); return `<button class="chip" role="radio" data-act="afac" data-v="${k}" style="--chip:${cat.faction[k].colors.secondary}" aria-pressed="${k === f}" aria-checked="${k === f}">${sigil(k)}<span class="fg-n">${esc(cat.faction[k].name)}</span><span class="muted fg-c">${p.owned}/${p.total}</span></button>`; }).join('')}</div>
      <div class="album" style="--fc:${fac.colors.secondary}">${pages.map((pg, i) => `<section class="album-page" aria-label="Page ${i + 1}">
        <div class="album-ph"><span>${sigil(f)} ${esc(fac.name)}</span><span>Page ${i + 1} / ${pages.length}</span></div>
        <div class="album-grid">${pg.map((c) => { const e = g.entry(c.id); return e
          ? `<div class="slot">${cardHTML(c, { lazy: true, isNew: e.isNew, variant: bestVariant(e) })}</div>`
          : `<div class="slot slot-empty" role="button" tabindex="0" data-id="${c.id}" aria-label="Emplacement ${c.number} vide, ${RARITY[c.rarity].name}"><span class="slot-num">${c.number}</span><span class="fu-gem" style="--rc:${RARITY[c.rarity].color}">${RARITY[c.rarity].short}</span></div>`; }).join('')}</div>
      </section>`).join('')}</div>
      <div class="album-dots">${pages.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div>
      <p class="small muted center">Glisse pour tourner les pages. ${g.factionProgress(f).owned} / ${cards.length} emplacements remplis.</p>`;
    lazyArt(box);
    const owned = g.uniqueCount();
    root.querySelector('#col-summary').textContent = `${owned} créatures découvertes sur ${total} (${pct(owned / total)})`;
    root.querySelector('#col-prog').style.width = `${(owned / total) * 100}%`;
    ids = cards.map((c) => c.id);
    const al = box.querySelector('.album');
    const dots = [...box.querySelectorAll('.album-dots i')];
    const page = Math.min(st.albumPage || 0, pages.length - 1);
    requestAnimationFrame(() => { al.scrollLeft = page * (al.clientWidth + 14); });
    al.addEventListener('scroll', () => {
      const i = Math.round(al.scrollLeft / (al.clientWidth + 14));
      st.albumPage = i;
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
    }, { passive: true });
  }
  function drawView() {
    const album = st.view === 'album';
    root.querySelector('#col-main').hidden = album;
    root.querySelector('#col-album').hidden = !album;
    root.querySelectorAll('[data-act="view"]').forEach((b) => b.setAttribute('aria-pressed', (st.view || 'grid') === b.dataset.v));
    if (album) drawAlbum(); else drawGrid();
  }

  function syncPressed() {
    root.querySelectorAll('[data-act="fac"]').forEach((b) => b.setAttribute('aria-pressed', st.factions.includes(b.dataset.v)));
    root.querySelectorAll('[data-act="rar"]').forEach((b) => b.setAttribute('aria-pressed', st.rarities.includes(b.dataset.v)));
    root.querySelectorAll('[data-act="show"]').forEach((b) => b.setAttribute('aria-pressed', st.show === b.dataset.v));
  }
  const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  bindActions(root, {
    ritual() { openRitualHub(app); },
    fac(el) { st.factions = toggle(st.factions, el.dataset.v); syncPressed(); drawGrid(); },
    rar(el) { st.rarities = toggle(st.rarities, el.dataset.v); syncPressed(); drawGrid(); },
    show(el) { st.show = el.dataset.v; syncPressed(); drawGrid(); },
    reset() { Object.assign(st, { q: '', factions: [], rarities: [], show: 'all', sort: 'num' }); root.querySelector('#col-q').value = ''; root.querySelector('#col-sort').value = 'num'; syncPressed(); drawGrid(); },
    seen() { g.markAllSeen(); drawGrid(); },
    view(el) { st.view = el.dataset.v; drawView(); },
    afac(el) { st.albumFac = el.dataset.v; st.albumPage = 0; drawAlbum(); },
  });
  let tq;
  root.querySelector('#col-q').addEventListener('input', (e) => { clearTimeout(tq); tq = setTimeout(() => { st.q = e.target.value; drawGrid(); }, 140); });
  root.querySelector('#col-sort').addEventListener('change', (e) => { st.sort = e.target.value; drawGrid(); });
  const open = (t) => app.openCard(t.dataset.id, { list: ids });
  for (const box of [root.querySelector('#col-grid'), root.querySelector('#col-album')]) {
    box.addEventListener('click', (e) => { const t = e.target.closest('.tcg, .slot-empty'); if (t) open(t); });
    box.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.tcg, .slot-empty')) { e.preventDefault(); open(e.target); } });
  }
  drawView();
  app.refreshView = () => { const y = window.scrollY; drawView(); window.scrollTo(0, y); };
  return () => { app.refreshView = null; };
}
