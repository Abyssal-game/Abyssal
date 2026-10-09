// Collection : recherche, filtres (faction, rareté, possession), tri, grille.
import { cardHTML, lazyArt } from '../ui/card.js';
import { icon, sigil } from '../ui/icons.js';
import { esc, bindActions, pct } from '../ui/dom.js';
import { RARITIES, FACTION_ORDER, RARITY_ORDER } from '../config.js';

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function collection(app, root, params) {
  const g = app.game, cat = app.catalog;
  const st = (app.state.col ||= { q: '', factions: [], rarities: [], show: 'all', sort: 'num' });
  if (params[0] && FACTION_ORDER.includes(params[0])) { st.factions = [params[0]]; }
  const total = g.total();

  root.innerHTML = `
    <header class="screen-head">
      <h1>Collection</h1>
      <p class="muted" id="col-summary"></p>
    </header>
    <div class="col-tools">
      <label class="input-wrap"><span class="sr">Rechercher une créature</span>${icon('search')}<input class="input" id="col-q" type="search" placeholder="Rechercher une créature…" value="${esc(st.q)}" autocomplete="off" enterkeyhint="search"></label>
      <div class="chips" role="group" aria-label="Filtrer par faction">${FACTION_ORDER.map((f) => `<button class="chip" data-act="fac" data-v="${f}" style="--chip:${cat.faction[f].colors.secondary}" aria-pressed="${st.factions.includes(f)}">${sigil(f)}${esc(cat.faction[f].name)}</button>`).join('')}</div>
      <div class="chips" role="group" aria-label="Filtrer par rareté">${RARITIES.map((r) => `<button class="chip" data-act="rar" data-v="${r.key}" style="--chip:${r.color}" aria-pressed="${st.rarities.includes(r.key)}"><span class="dot" style="background:${r.color}"></span>${r.name}</button>`).join('')}</div>
      <div class="row gap wrap col-row">
        <div class="seg" role="group" aria-label="Afficher">${[['all', 'Toutes'], ['owned', 'Possédées'], ['missing', 'Manquantes'], ['new', 'Nouvelles']].map(([k, l]) => `<button class="seg-b" data-act="show" data-v="${k}" aria-pressed="${st.show === k}">${l}</button>`).join('')}</div>
        <label class="sort"><span class="sr">Trier par</span>${icon('sort')}<select class="input" id="col-sort">${[['num', 'Numéro'], ['name', 'Nom'], ['rarity', 'Rareté'], ['power', 'Puissance'], ['date', 'Date de découverte']].map(([k, l]) => `<option value="${k}" ${st.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <div class="row between small"><span id="col-count" class="muted" aria-live="polite"></span><span class="row gap"><button class="linkish" data-act="reset">Réinitialiser les filtres</button><button class="linkish" data-act="seen" id="col-seen">Tout marquer comme vu</button></span></div>
    </div>
    <div class="grid-cards" id="col-grid"></div>
    <p class="empty muted center" id="col-empty" hidden>Aucune carte ne correspond à ces filtres.</p>
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
    for (const v of ['special', 'ancestral', 'corrupt', 'chroma', 'holo', 'alt']) if (e.v[v]) return v;
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
    root.querySelector('#col-count').textContent = `${list.length} carte${list.length > 1 ? 's' : ''} affichée${list.length > 1 ? 's' : ''}`;
    root.querySelector('#col-seen').hidden = g.newCount() === 0;
  }
  function syncPressed() {
    root.querySelectorAll('[data-act="fac"]').forEach((b) => b.setAttribute('aria-pressed', st.factions.includes(b.dataset.v)));
    root.querySelectorAll('[data-act="rar"]').forEach((b) => b.setAttribute('aria-pressed', st.rarities.includes(b.dataset.v)));
    root.querySelectorAll('[data-act="show"]').forEach((b) => b.setAttribute('aria-pressed', st.show === b.dataset.v));
  }
  const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  bindActions(root, {
    fac(el) { st.factions = toggle(st.factions, el.dataset.v); syncPressed(); drawGrid(); },
    rar(el) { st.rarities = toggle(st.rarities, el.dataset.v); syncPressed(); drawGrid(); },
    show(el) { st.show = el.dataset.v; syncPressed(); drawGrid(); },
    reset() { Object.assign(st, { q: '', factions: [], rarities: [], show: 'all', sort: 'num' }); root.querySelector('#col-q').value = ''; root.querySelector('#col-sort').value = 'num'; syncPressed(); drawGrid(); },
    seen() { g.markAllSeen(); drawGrid(); },
  });
  let tq;
  root.querySelector('#col-q').addEventListener('input', (e) => { clearTimeout(tq); tq = setTimeout(() => { st.q = e.target.value; drawGrid(); }, 140); });
  root.querySelector('#col-sort').addEventListener('change', (e) => { st.sort = e.target.value; drawGrid(); });
  const grid = root.querySelector('#col-grid');
  const open = (t) => app.openCard(t.dataset.id, { list: ids });
  grid.addEventListener('click', (e) => { const t = e.target.closest('.tcg'); if (t) open(t); });
  grid.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('tcg')) { e.preventDefault(); open(e.target); } });
  drawGrid();
  app.refreshView = () => { const y = window.scrollY; drawGrid(); window.scrollTo(0, y); };
  return () => { app.refreshView = null; };
}
