// Collection : recherche, filtres (faction, rareté, possession), tri, grille.
import { tuto } from '../ui/tutos.js';
import { cardHTML, lazyArt } from '../ui/card.js';
import { icon, sigil } from '../ui/icons.js';
import { esc, bindActions, pct } from '../ui/dom.js';
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
  const passOpts = Object.keys(PASSIVES).sort((a, b) => PASSIVES[a].name.localeCompare(PASSIVES[b].name, 'fr'));
  if (params[0] && FACTION_ORDER.includes(params[0])) { st.factions = [params[0]]; }
  const total = g.total();
  tuto(app, 'collection');

  root.innerHTML = `
    <header class="screen-head ui-hero bn-collection">
      <h1>Collection</h1>
      <p class="muted" id="col-summary"></p>
      <span class="progress ui-prog"><i id="col-prog"></i></span>
    </header>
    <div class="col-head-row">
      <div class="seg" role="group" aria-label="Mode d’affichage">${[['grid', 'Grille'], ['album', 'Classeur']].map(([k, l]) => `<button class="seg-b" data-act="view" data-v="${k}" aria-pressed="${(st.view || 'grid') === k}">${l}</button>`).join('')}</div>
    </div>
    <div id="col-main">
    <div class="col-tools">
      <label class="input-wrap"><span class="sr">Rechercher une créature</span>${icon('search')}<input class="input" id="col-q" type="search" placeholder="Rechercher une créature…" value="${esc(st.q)}" autocomplete="off" enterkeyhint="search"></label>
      <div class="seg wide" role="group" aria-label="Afficher">${[['all', 'Toutes'], ['owned', 'Possédées'], ['missing', 'Manquantes'], ['new', 'Nouvelles'], ['var', `Finitions${(() => { const n = Object.values(g.s.collection).filter((e) => ['holo', 'gold', 'galaxy'].some((v) => e.v?.[v] > 0)).length; return n ? ` (${n})` : ''; })()}`], ['fav', '★']].map(([k, l]) => `<button class="seg-b" data-act="show" data-v="${k}" aria-pressed="${st.show === k}">${l}</button>`).join('')}</div>
      <details class="dc-fold col-filters" ${nf() ? 'open' : ''}><summary>${icon('filter')} Filtres et tri${nf() ? ` <span class="badge">${nf()}</span>` : ''}</summary>
        <div class="chips fac-grid" role="group" aria-label="Filtrer par faction">${FACTION_ORDER.map((f) => `<button class="chip" data-act="fac" data-v="${f}" style="--chip:${cat.faction[f].colors.secondary}" aria-pressed="${st.factions.includes(f)}">${sigil(f)}<span class="fg-n">${esc(cat.faction[f].name)}</span></button>`).join('')}</div>
        <div class="chips" role="group" aria-label="Filtrer par rareté">${RARITIES.map((r) => `<button class="chip" data-act="rar" data-v="${r.key}" style="--chip:${r.color}" aria-pressed="${st.rarities.includes(r.key)}"><span class="dot" style="background:${r.color}"></span>${r.name}</button>`).join('')}</div>
        <div class="chips" role="group" aria-label="Filtrer par rôle">${Object.entries(ROLES).map(([k, r]) => `<button class="chip" data-act="role" data-v="${k}" style="--chip:${r.color}" aria-pressed="${st.roles.includes(k)}">${esc(r.name)}</button>`).join('')}</div>
        <label class="sort"><span class="sr">Filtrer par passif</span>${icon('sparkle')}<select class="input" id="col-pass"><option value="">Tous les passifs</option>${passOpts.map((k) => `<option value="${k}" ${st.passive === k ? 'selected' : ''}>${esc(PASSIVES[k].name)}</option>`).join('')}</select></label>
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
      if (st.roles.length && !st.roles.includes(roleOf(c))) return false;
      if (st.passive && CREATURE_KITS[c.id]?.passive !== st.passive && CREATURE_KITS[c.id]?.passive2 !== st.passive) return false;
      if (st.show === 'owned' && !e) return false;
      if (st.show === 'missing' && e) return false;
      if (st.show === 'fav' && !g.isFav(c.id)) return false;
      if (st.show === 'new' && !(e && e.isNew)) return false;
      if (st.show === 'var' && !(e && ['holo', 'gold', 'galaxy'].some((v) => e.v?.[v] > 0))) return false; // v348 : finitions possédées
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
    if (e.show && e.v[e.show] > 0) return e.show;
    for (const v of ['galaxy', 'gold', 'holo']) if (e.v[v]) return v;
    return 'normal';
  }

  function drawGrid() {
    const list = filtered();
    ids = list.map((c) => c.id);
    const grid = root.querySelector('#col-grid');
    grid.innerHTML = list.map((c) => {
      const e = g.entry(c.id);
      return e ? cardHTML(c, { lazy: true, count: e.n, isNew: e.isNew, variant: bestVariant(e), tag: g.formOf(c.id) ? '<span class="fm-tag">Corrompue</span>' : '' })
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
        app.sfx?.flip?.();
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

  function syncPressed() {
    root.querySelectorAll('[data-act="fac"]').forEach((b) => b.setAttribute('aria-pressed', st.factions.includes(b.dataset.v)));
    root.querySelectorAll('[data-act="rar"]').forEach((b) => b.setAttribute('aria-pressed', st.rarities.includes(b.dataset.v)));
    root.querySelectorAll('[data-act="role"]').forEach((b) => b.setAttribute('aria-pressed', st.roles.includes(b.dataset.v)));
    root.querySelectorAll('[data-act="show"]').forEach((b) => b.setAttribute('aria-pressed', st.show === b.dataset.v));
  }
  const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  bindActions(root, {
    fac(el) { st.factions = toggle(st.factions, el.dataset.v); syncPressed(); drawGrid(); },
    rar(el) { st.rarities = toggle(st.rarities, el.dataset.v); syncPressed(); drawGrid(); },
    role(el) { st.roles = toggle(st.roles, el.dataset.v); syncPressed(); drawGrid(); },
    show(el) { st.show = el.dataset.v; syncPressed(); drawGrid(); },
    reset() { Object.assign(st, { q: '', factions: [], rarities: [], roles: [], passive: '', show: 'all', sort: 'num' }); const ps = root.querySelector('#col-pass'); if (ps) ps.value = ''; root.querySelector('#col-q').value = ''; root.querySelector('#col-sort').value = 'num'; syncPressed(); drawGrid(); },
    seen() { g.markAllSeen(); drawGrid(); },
    view(el) { st.view = el.dataset.v; drawView(); },
    afac(el) { st.albumFac = el.dataset.v; st.albumPage = 0; drawAlbum(); },
  });
  let tq;
  root.querySelector('#col-q').addEventListener('input', (e) => { clearTimeout(tq); tq = setTimeout(() => { st.q = e.target.value; drawGrid(); }, 140); });
  root.querySelector('#col-sort').addEventListener('change', (e) => { st.sort = e.target.value; drawGrid(); });
  root.querySelector('#col-pass').addEventListener('change', (e) => { st.passive = e.target.value; drawGrid(); });
  const open = (t) => app.openCard(t.dataset.id, { list: ids });
  for (const box of [root.querySelector('#col-grid'), root.querySelector('#col-album')]) {
    box.addEventListener('click', (e) => { const t = e.target.closest('.tcg, .slot-empty'); if (t) open(t); });
    box.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.tcg, .slot-empty')) { e.preventDefault(); open(e.target); } });
  }
  drawView();
  app.refreshView = () => { const y = window.scrollY; drawView(); window.scrollTo(0, y); };
  return () => { app.refreshView = null; };
}
