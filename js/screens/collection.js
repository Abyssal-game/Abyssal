// Collection : recherche, filtres (faction, rareté, possession), tri, grille.
import { hasSample, haptic } from '../ui/sound.js';
import { tw, LANG } from '../i18n.js';
import { tuto } from '../ui/tutos.js';
import { cardHTML, lazyArt, fillGrid } from '../ui/card.js';
import { icon, sigil } from '../ui/icons.js';
import { esc, bindActions, pct, openSheet } from '../ui/dom.js';
import { RARITIES, FACTION_ORDER, RARITY_ORDER, RARITY } from '../config.js';
import { ROLES, roleOf } from '../core/army.js';
import { CREATURE_KITS, PASSIVES } from '../core/kits.js';

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function collection(app, root, params) {
  const g = app.game, cat = app.catalog;
  const st = (app.state.col ||= { q: '', factions: [], rarities: [], show: app.game.uniqueCount() < 100 ? 'owned' : 'all', sort: 'num', view: 'grid', albumFac: 'infernal', albumPage: 0 });
  st.roles ||= []; st.passive ||= '';
  const nf = () => st.factions.length + st.rarities.length + st.roles.length + (st.passive ? 1 : 0);
  // passifs proposés au filtre : ceux des cartes, par ordre alphabétique
  /* v447 : rangement visible dans la Grille et le Classeur (numéro, nom, rareté) ; « date » reste dans Filtres et tri (Grille) */
  const ORDERS = [['num', 'N°'], ['name', 'A → Z'], ['rarity', 'Rareté']];
  const ord = () => (ORDERS.some(([k]) => k === st.sort) ? st.sort : 'num');
  const passOpts = Object.keys(PASSIVES).sort((a, b) => PASSIVES[a].name.localeCompare(PASSIVES[b].name, 'fr'));
  if (params[0] && FACTION_ORDER.includes(params[0])) { st.factions = [params[0]]; }
  const total = g.total();
  tuto(app, 'collection');

  root.innerHTML = `
    <header class="screen-head ui-hero bn-collection">
      <h1>Collection</h1>
      <p class="muted" id="col-summary"></p>
      <span class="progress ui-prog"><i id="col-prog"></i></span>
    <div class="col-head-row col-view">
      <div class="seg" role="group" aria-label="Mode d’affichage">${[['grid', 'Grille'], ['album', 'Classeur']].map(([k, l]) => `<button class="seg-b" data-act="view" data-v="${k}" aria-pressed="${(st.view || 'grid') === k}">${l}</button>`).join('')}</div>
    </div>
    </header>
    <div class="col-bar">
      <label class="input-wrap col-search"><span class="sr">Rechercher une créature</span>${icon('search')}<input class="input" id="col-q" type="search" placeholder="Rechercher une créature…" value="${esc(st.q)}" autocomplete="off" enterkeyhint="search"></label>
      <button class="col-fbtn" data-act="filters" aria-label="Filtres et rangement">${icon('filter')}<span id="col-fl">Filtres</span><b class="badge" id="col-fn" hidden></b></button>
    </div>
    <div class="col-active" id="col-active"></div>
    <div id="col-main">
    <div class="row between small col-countrow"><span id="col-count" class="muted" aria-live="polite"></span><button class="linkish" data-act="seen" id="col-seen">Tout marquer comme vu</button></div>
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
      if (st.roles.length && !st.roles.includes(roleOf(c))) return false;
      if (st.passive && CREATURE_KITS[c.id]?.passive !== st.passive && CREATURE_KITS[c.id]?.passive2 !== st.passive) return false;
      if (st.show === 'owned' && !e) return false;
      if (st.show === 'missing' && e) return false;
      if (st.show === 'fav' && !g.isFav(c.id)) return false;
      if (st.show === 'new' && !(e && e.isNew)) return false;
      if (st.show === 'var' && !(e && ['holo', 'gold', 'galaxy', 'crystal', 'prism'].some((v) => e.v?.[v] > 0))) return false; // v348 : finitions possédées
      if (q) {
        const known = g.nameKnown(c.id);
        const hay = norm(`${c.id} ${known ? `${c.name} ${c.title} ${tw(c.name)} ${tw(c.title)}` : ''} ${e ? `${c.category} ${tw(c.category)}` : ''}`);
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const fo = (c) => FACTION_ORDER.indexOf(c.faction) * 1000 + c.number;
    const ri = (c) => RARITY_ORDER.indexOf(c.rarity);
    const sorters = {
      num: (a, b) => fo(a) - fo(b),
      name: (a, b) => (g.nameKnown(b.id) - g.nameKnown(a.id)) || tw(a.name).localeCompare(tw(b.name), LANG),
      rarity: (a, b) => ri(b) - ri(a) || (g.owns(b.id) - g.owns(a.id)) || fo(a) - fo(b), /* v447 : possédées d'abord dans une rareté */
      power: (a, b) => (g.owns(b.id) - g.owns(a.id)) || b.power - a.power || fo(a) - fo(b),
      date: (a, b) => (g.entry(b.id)?.first || 0) - (g.entry(a.id)?.first || 0) || fo(a) - fo(b),
    };
    return list.sort(sorters[st.sort] || sorters.num);
  }

  function bestVariant(e) {
    if (e.show && e.v[e.show] > 0) return e.show;
    for (const v of ['prism', 'crystal', 'galaxy', 'gold', 'holo']) if (e.v[v]) return v;
    return 'normal';
  }

  const html = (c) => {
    const e = g.entry(c.id);
    return e ? cardHTML(c, { lazy: true, count: e.n, isNew: e.isNew, variant: bestVariant(e), tag: g.formOf(c.id) ? '<span class="fm-tag">Corrompue</span>' : '' })
      : cardHTML(c, { lazy: true, mystery: true, nameKnown: g.nameKnown(c.id) });
  };
  let drawnHtml = new Map(); /* v576 : ce que montre chaque carte de la grille, pour ne redessiner que celles qui ont changé */
  /* au retour d'une fiche : seules les cartes modifiées sont remplacées (avant : toute la grille, 500 cartes, reconstruite) */
  function drawSummary() {
    const owned = g.uniqueCount();
    root.querySelector('#col-summary').textContent = `${owned} créatures découvertes sur ${total} (${pct(owned / total)}) · ${g.newCount()} nouvelle${g.newCount() > 1 ? 's' : ''}`;
    root.querySelector('#col-prog').style.width = `${(owned / total) * 100}%`;
  }
  function patchGrid() {
    const list = filtered(), grid = root.querySelector('#col-grid');
    if (list.length !== ids.length || list.some((c, i) => c.id !== ids[i]) || grid.children.length > list.length) return drawGrid();
    list.slice(0, grid.children.length).forEach((c, i) => {
      const h = html(c);
      if (drawnHtml.get(c.id) === h) return;
      drawnHtml.set(c.id, h);
      const old = grid.children[i], t = document.createElement('template'); t.innerHTML = h;
      old.replaceWith(t.content.firstElementChild);
    });
    lazyArt(grid);
    drawSummary();
  }
  function drawGrid() {
    const list = filtered();
    ids = list.map((c) => c.id);
    const grid = root.querySelector('#col-grid');
    drawnHtml = new Map();
    const html1 = (c) => { const h = html(c); drawnHtml.set(c.id, h); return h; };
    fillGrid(grid, list, html1, { first: 24, step: 15 }); /* v576 : complétée au fil du défilement */
    const empty = root.querySelector('#col-empty');
    empty.hidden = list.length > 0;
    /* v536 : nouveau joueur sans créature : on l'envoie ouvrir son premier booster (avant : « aucune carte ne correspond à ces filtres ») */
    if (!list.length) empty.innerHTML = g.uniqueCount() ? 'Aucune carte ne correspond à ces filtres.' : 'Tu n’as encore aucune créature.<br><a class="btn primary dc-plq dc-plq-red" href="#/boutique" style="margin-top:12px">Ouvrir mon premier booster</a>';
    drawSummary();
    root.querySelector('#col-count').textContent = `${list.length} carte${list.length > 1 ? 's' : ''} affichée${list.length > 1 ? 's' : ''}`;
    root.querySelector('#col-seen').hidden = g.newCount() === 0;
  }
  // Classeur : une faction, des pages de 9 emplacements numérotés.
  function drawAlbum() {
    const f = st.albumFac || 'infernal';
    const fac = cat.faction[f];
    const ri = (c) => RARITY_ORDER.indexOf(c.rarity), o = ord();
    /* v447 : A → Z = noms connus d'abord (les autres gardent leur numéro, pour ne rien dévoiler) ; Rareté = la plus rare d'abord */
    const cards = [...cat.byFaction[f]].sort(o === 'name' ? (a, b) => (g.nameKnown(b.id) - g.nameKnown(a.id)) || (g.nameKnown(a.id) ? tw(a.name).localeCompare(tw(b.name), LANG) : a.number - b.number)
      : o === 'rarity' ? (a, b) => ri(b) - ri(a) || (!!g.entry(b.id) - !!g.entry(a.id)) || a.number - b.number : (a, b) => a.number - b.number);
    const pages = [];
    for (let i = 0; i < cards.length; i += 9) pages.push(cards.slice(i, i + 9));
    const box = root.querySelector('#col-album');
    box.innerHTML = `
      <div class="alb-tabs" role="radiogroup" aria-label="Faction du classeur">${FACTION_ORDER.map((k) => { const p = g.factionProgress(k); return `<button class="alb-tab" role="radio" data-act="afac" data-v="${k}" style="--chip:${cat.faction[k].colors.secondary}" aria-checked="${k === f}" aria-label="${esc(cat.faction[k].name)}, ${p.owned} sur ${p.total}">${sigil(k)}<span class="alb-tc">${p.owned}/${p.total}</span></button>`; }).join('')}</div>
      <div class="album" style="--fc:${fac.colors.secondary}">${pages.map((pg, i) => { const full = pg.every((c) => g.entry(c.id)); return `<section class="album-page ${full ? 'full' : ''}" aria-label="Page ${i + 1}${full ? ', complète' : ''}">
        <div class="album-ph"><span>${sigil(f)} ${esc(fac.name)}</span>${full ? '<span class="alb-seal"><img alt="" src="assets/icons/seal.webp">Complète</span>' : ''}<span>Page ${i + 1} / ${pages.length}</span></div>
        <div class="album-grid">${pg.map((c) => { const e = g.entry(c.id); return e
          ? `<div class="slot">${cardHTML(c, { lazy: true, isNew: e.isNew, variant: bestVariant(e) })}</div>`
          : `<div class="slot slot-empty" role="button" tabindex="0" data-id="${c.id}" aria-label="Emplacement ${c.number} vide, ${RARITY[c.rarity].name}"><span class="slot-num">${c.number}</span><img class="alb-gem" alt="" src="assets/ui/rar-${c.rarity}.webp"></div>`; }).join('')}</div>
      </section>`; }).join('')}</div>
      <div class="album-nav"><button class="album-arr" data-pg="-1" aria-label="Page précédente">${icon('prev')}</button><div class="album-dots">${pages.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div><button class="album-arr" data-pg="1" aria-label="Page suivante">${icon('next')}</button></div>
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
    const pgs = [...al.querySelectorAll('.album-page')];
    al.addEventListener('scroll', () => {
      const i = Math.round(al.scrollLeft / (al.clientWidth + 14));
      if (i !== st.albumPage) { // page tournée : petit effet de feuillet et bruit de page
        pgs[i]?.classList.remove('turn'); void pgs[i]?.offsetWidth; pgs[i]?.classList.add('turn');
        /* v793 : vrai bruit de page cartonnée et petite vibration ; page complète : un éclat d'or */
        try { if (hasSample('ci-page')) app.sfx['ci-page']?.(); else app.sfx?.flip?.(); } catch (e) { /* son facultatif */ }
        haptic(pgs[i]?.classList.contains('full') ? 'success' : 'page');
      }
      st.albumPage = i;
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
    }, { passive: true });
    box.querySelectorAll('.album-arr').forEach((b) => b.addEventListener('click', () => {
      const i = Math.max(0, Math.min(pages.length - 1, (st.albumPage || 0) + Number(b.dataset.pg)));
      al.scrollTo({ left: i * (al.clientWidth + 14), behavior: app.reduced() ? 'auto' : 'smooth' });
    }));
  }
  function drawView() {
    const album = st.view === 'album';
    root.querySelector('#col-main').hidden = album;
    root.querySelector('#col-album').hidden = !album;
    root.querySelectorAll('[data-act="view"]').forEach((b) => b.setAttribute('aria-pressed', (st.view || 'grid') === b.dataset.v));
    if (album) drawAlbum(); else drawGrid();
  }

  /* v646 : un seul bouton « Filtres » (fenêtre) au lieu de quatre rangées ; les filtres actifs en pastilles qu'on retire d'un toucher */
  const SHOWS = [['all', 'Toutes'], ['owned', 'Possédées'], ['missing', 'Manquantes'], ['new', 'Nouvelles'], ['var', 'Finitions'], ['fav', 'Favoris']];
  const SORTS = [...ORDERS, ['date', 'Récentes']];
  const album = () => st.view === 'album';
  const actives = () => {
    if (album()) return [];
    const l = [];
    if (st.show !== 'all') l.push(['show', '', esc(SHOWS.find(([k]) => k === st.show)?.[1])]);
    if (st.sort !== 'num') l.push(['sort', '', `Rangées : <b>${SORTS.find(([k]) => k === st.sort)?.[1]}</b>`]);
    st.factions.forEach((f) => l.push(['fac', f, esc(cat.faction[f].name)]));
    st.rarities.forEach((r) => l.push(['rar', r, esc(RARITY[r].name)]));
    st.roles.forEach((r) => l.push(['role', r, esc(ROLES[r].name)]));
    if (st.passive) l.push(['pass', '', esc(PASSIVES[st.passive].name)]);
    return l;
  };
  function drawBar() {
    const l = actives();
    root.querySelector('.col-search').hidden = album();
    root.querySelector('#col-fl').innerHTML = album() ? (ord() === 'num' ? 'Ranger' : `Ranger : <b>${ORDERS.find(([k]) => k === ord())[1]}</b>`) : 'Filtres';
    const n = root.querySelector('#col-fn'); n.hidden = !l.length; n.textContent = l.length;
    root.querySelector('#col-active').innerHTML = l.length ? `${l.map(([k, v, lab]) => `<button class="col-pill" data-act="unf" data-k="${k}" data-v="${esc(v)}"><span class="sr">Retirer</span><span>${lab}</span><i aria-hidden="true">✕</i></button>`).join('')}${l.length > 1 ? '<button class="linkish col-clear" data-act="reset">Tout effacer</button>' : ''}` : '';
  }
  const pick = (act, v, lab, on, extra = '') => `<button class="chip" data-f="${act}" data-v="${v}" ${extra} aria-pressed="${on}">${lab}</button>`;
  function sheetHTML() {
    const n = album() ? 0 : filtered().length;
    const sec = (t, h) => `<section class="cf-sec"><h3>${t}</h3>${h}</section>`;
    return `<h2>${album() ? 'Ranger le classeur' : 'Filtres et rangement'}</h2>
      ${album() ? '' : sec('Afficher', `<div class="chips">${SHOWS.map(([k, l]) => pick('show', k, l, st.show === k)).join('')}</div>`)}
      ${sec('Ranger par', `<div class="chips">${(album() ? ORDERS : SORTS).map(([k, l]) => pick('sort', k, l, (album() ? ord() : st.sort) === k)).join('')}</div>`)}
      ${album() ? '' : sec('Royaume', `<div class="chips fac-grid">${FACTION_ORDER.map((f) => pick('fac', f, `${sigil(f)}<span class="fg-n">${esc(cat.faction[f].name)}</span>`, st.factions.includes(f), `style="--chip:${cat.faction[f].colors.secondary}"`)).join('')}</div>`)
        + sec('Rareté', `<div class="chips">${RARITIES.map((r) => pick('rar', r.key, `<span class="dot" style="background:${r.color}"></span>${r.name}`, st.rarities.includes(r.key), `style="--chip:${r.color}"`)).join('')}</div>`)
        + sec('Rôle', `<div class="chips">${Object.entries(ROLES).map(([k, r]) => pick('role', k, esc(r.name), st.roles.includes(k), `style="--chip:${r.color}"`)).join('')}</div>`)
        + sec('Passif', `<label class="sort"><span class="sr">Filtrer par passif</span>${icon('sparkle')}<select class="input" id="cf-pass"><option value="">Tous les passifs</option>${passOpts.map((k) => `<option value="${k}" ${st.passive === k ? 'selected' : ''}>${esc(PASSIVES[k].name)}</option>`).join('')}</select></label>`)}
      <div class="cf-foot">${album() ? '' : '<button class="btn ghost" data-f="reset">Réinitialiser</button>'}<button class="btn primary" data-f="close">${album() ? 'Fermer' : `Voir ${n} carte${n > 1 ? 's' : ''}`}</button></div>`;
  }
  function apply() { st.albumPage = 0; drawBar(); drawView(); }
  function openFilters() {
    const sh = openSheet(sheetHTML(), { label: 'Filtres et rangement', cls: 'col-fsheet' });
    const redraw = () => { const y = sh.el.scrollTop; sh.setContent(sheetHTML()); sh.el.scrollTop = y; };
    sh.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-f]'); if (!b) return;
      const f = b.dataset.f, v = b.dataset.v;
      if (f === 'close') return sh.close();
      if (f === 'show') st.show = v;
      if (f === 'sort') st.sort = v;
      if (f === 'fac') st.factions = toggle(st.factions, v);
      if (f === 'rar') st.rarities = toggle(st.rarities, v);
      if (f === 'role') st.roles = toggle(st.roles, v);
      if (f === 'reset') resetAll();
      app.sfx?.tap?.(); apply(); redraw();
    });
    sh.body.addEventListener('change', (e) => { if (e.target.id === 'cf-pass') { st.passive = e.target.value; apply(); redraw(); } });
  }
  function resetAll() { Object.assign(st, { q: '', factions: [], rarities: [], roles: [], passive: '', show: 'all', sort: 'num' }); root.querySelector('#col-q').value = ''; }
  const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  bindActions(root, {
    filters() { openFilters(); },
    unf(el) {
      const k = el.dataset.k, v = el.dataset.v;
      if (k === 'show') st.show = 'all'; if (k === 'sort') st.sort = 'num'; if (k === 'pass') st.passive = '';
      if (k === 'fac') st.factions = toggle(st.factions, v); if (k === 'rar') st.rarities = toggle(st.rarities, v); if (k === 'role') st.roles = toggle(st.roles, v);
      app.sfx?.tap?.(); apply();
    },
    reset() { resetAll(); apply(); },
    seen() { g.markAllSeen(); drawGrid(); },
    view(el) { st.view = el.dataset.v; drawBar(); drawView(); },
    afac(el) { app.sfx?.sheet?.(); st.albumFac = el.dataset.v; st.albumPage = 0; drawAlbum(); }, // v359 : un petit froissement de page à chaque faction
  });
  let tq;
  root.querySelector('#col-q').addEventListener('input', (e) => { clearTimeout(tq); tq = setTimeout(() => { st.q = e.target.value; drawGrid(); }, 140); });
  const open = (t) => app.openCard(t.dataset.id, { list: ids });
  for (const box of [root.querySelector('#col-grid'), root.querySelector('#col-album')]) {
    box.addEventListener('click', (e) => { const t = e.target.closest('.tcg, .slot-empty'); if (t) open(t); });
    box.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.tcg, .slot-empty')) { e.preventDefault(); open(e.target); } });
  }
  drawBar();
  drawView();
  app.refreshView = () => { const y = window.scrollY; if (st.view === 'album') drawView(); else patchGrid(); window.scrollTo(0, y); };
  return () => { app.refreshView = null; };
}
