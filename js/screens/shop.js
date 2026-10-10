import { itemsShopHTML, bindItemShop } from './items.js';
// Boutique : boosters achetables avec la monnaie du jeu uniquement.
import { BOOSTERS, RARITIES, PITY, FACTION_ORDER, ECONOMY } from '../config.js';
import { boosterOdds } from '../core/boosters.js';
import { icon, sigil, EMBLEM } from '../ui/icons.js';
import { esc, fmt, openSheet, bindActions, toast } from '../ui/dom.js';
import { artUrl, hasRealArt } from '../art/assets.js';
import { RARITY } from '../config.js';
import { openPack } from './opening.js';

export function waitText(ms) {
  const m = Math.max(1, Math.ceil(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
}

// Libellé du bouton d'ouverture : ticket, gratuit ou prix en éclats.
export function payLabel(g, type, again = false) {
  const t = g.s.tickets[type] || 0;
  if (t > 0) return `${icon('ticket')}${again ? 'Encore un' : 'Ouvrir'} · ticket (${t})`;
  if (type === 'standard') { const f = g.freePack(); if (f.stock > 0) return `${icon('sparkle')}${again ? 'Encore un' : 'Ouvrir'} · gratuit (${f.stock})`; }
  return `${again ? 'Encore un' : 'Acheter'} <span class="price">${icon('crystal')}${fmt(BOOSTERS[type].price)}</span>`;
}

// Visuels d'emballage : assets/packs/<clé>.webp (booster, faction ou événement).
export function packHTML(type, cat, { faction, event } = {}) {
  const def = BOOSTERS[type];
  let label = def.name.replace('Booster ', '');
  let key = type;
  if (type === 'faction' && faction) { label = cat.faction[faction].name; key = faction; }
  if (type === 'event' && event) label = event.name;
  const tag = type === 'premium' ? 'Rare garantie' : '5 cartes';
  return `<div class="pack pack-${type}">
    <img class="pk-img" alt="" src="assets/packs/${key}.webp">
    <div class="pk-logo">ABYSSAL</div>
    <div class="pk-label"><span class="pk-name">${esc(label)}</span><span class="pk-tag">${tag}</span></div>
    <div class="pk-tearline"></div>
    <div class="pk-foil"></div>
  </div>`;
}

export function showOdds(app, type) {
  const o = boosterOdds(type);
  const def = BOOSTERS[type];
  const rows = RARITIES.map((r) => `<tr><th scope="row" style="color:${r.color}">${r.name}</th>${o.slots.map((s) => `<td>${s.odds[r.key] ? s.odds[r.key].toFixed(s.odds[r.key] < 1 ? 2 : 1).replace('.', ',') + ' %' : '—'}</td>`).join('')}</tr>`).join('');
  openSheet(`<h2>Probabilités · ${esc(def.name)}</h2>
    <p class="small muted">Chaque carte est tirée au hasard (générateur cryptographique du navigateur), d’abord sa rareté selon la table de son emplacement, puis une créature de cette rareté. Ces valeurs sont celles réellement utilisées par le jeu.</p>
    <div class="table-wrap"><table class="odds"><thead><tr><th></th>${o.slots.map((s, i) => `<th scope="col">Carte ${i + 1}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
    <p class="small">Chance d’au moins une Hyper rare ou mieux : <b>${o.atLeastHR.toFixed(1).replace('.', ',')} %</b> · au moins une Mythique ou mieux : <b>${o.atLeastM.toFixed(1).replace('.', ',')} %</b>.</p>
    <h3>Garanties</h3>
    <ul class="small"><li>Après ${PITY.hr - 1} boosters d’affilée sans Hyper rare ou mieux, la dernière carte du suivant est <b>au moins Hyper rare</b>.</li><li>Après ${PITY.m - 1} boosters d’affilée sans Mythique ou mieux, la dernière carte du suivant est <b>au moins Mythique</b>.</li><li>Les compteurs sont communs à tous les boosters et repartent à zéro dès que la rareté est obtenue.</li></ul>
    <h3>Variantes</h3>
    <p class="small">Chaque carte peut sortir en variante cosmétique (holographique, chromatique, corrompue, illustration alternative, ancestrale pour les Rares et mieux). Une variante est purement visuelle.${def.variantMult > 1 ? ` Ce booster multiplie leurs chances par ${String(def.variantMult).replace('.', ',')}.` : ''}</p>
    <h3>Doublons</h3>
    <p class="small">Un doublon exact rapporte des cendres (${RARITIES.map((r) => `${r.short} ${ECONOMY.duplicateAsh[r.key]}`).join(', ')}). Les cendres servent à invoquer une carte manquante.</p>`, { label: 'Probabilités' });
}

export default function shop(app, root, params = []) {
  const g = app.game, cat = app.catalog;
  const st = (app.state.shop ||= { faction: 'infernal' });
  const ev = g.event();

  function freeLine() {
    const f = g.freePack();
    if (!f.nextAt) return `<p class="small free-line">${icon('sparkle')} Boosters gratuits au maximum (${f.stock}). Ouvre-les !</p>`;
    return `<p class="small free-line">${icon('hourglass')} Prochain booster gratuit dans ${waitText(f.nextAt - Date.now())} (${f.stock} en réserve).</p>`;
  }

  function render() {
    // garde la position de défilement (page et rangée des factions) pendant le rafraîchissement
    const keepX = root.querySelector('.fac-pick')?.scrollLeft || 0;
    const keepY = window.scrollY;
    draw();
    const fp = root.querySelector('.fac-pick');
    if (fp) fp.scrollLeft = keepX;
    window.scrollTo(0, keepY);
  }

  function draw() {
    const s = g.s;
    const card = (type, extra = '') => {
      const def = BOOSTERS[type];
      const tickets = s.tickets[type] || 0;
      const can = g.canBuy(type);
      return `<article class="panel product" data-type="${type}">
        <div class="product-pack">${packHTML(type, cat, { faction: st.faction, event: ev })}</div>
        <div class="product-info">
          <h2>${esc(def.name)}</h2>
          <p class="small muted">${esc(def.desc)}</p>
          ${extra}
          <div class="row gap wrap">
            <button class="btn ${can ? 'primary' : ''}" data-act="buy" data-type="${type}" ${can ? '' : 'disabled'}>
              ${payLabel(g, type)}
            </button>
            <button class="btn ghost small" data-act="odds" data-type="${type}">${icon('info')}Probabilités</button>
          </div>
          ${!can ? `<p class="small muted">Il te manque ${fmt(def.price - s.shards)} éclats.</p>` : ''}
          ${type === 'standard' ? freeLine() : ''}
        </div>
      </article>`;
    };
    root.innerHTML = `
      <header class="screen-head">
        <h1>Boosters</h1>
        <p class="muted">Choisis ton booster et tente ta chance.</p>
      </header>
      <nav class="seg shop-seg" aria-label="Rayons"><a class="seg-b" href="#/boutique" aria-pressed="${params[0] !== 'objets'}">Boosters</a><a class="seg-b" href="#/boutique/objets" aria-pressed="${params[0] === 'objets'}">Objets</a></nav>
      <div class="panel pity">
        <div><span class="small muted">Garantie Hyper rare</span><b>${g.s.pity.sinceHR} / ${PITY.hr - 1}</b><span class="progress"><i style="width:${(g.s.pity.sinceHR / (PITY.hr - 1)) * 100}%;--bar:#C266FF"></i></span></div>
        <div><span class="small muted">Garantie Mythique</span><b>${g.s.pity.sinceM} / ${PITY.m - 1}</b><span class="progress"><i style="width:${(g.s.pity.sinceM / (PITY.m - 1)) * 100}%;--bar:#F0C75E"></i></span></div>
        <p class="small muted">Boosters ouverts d’affilée sans cette rareté. Au maximum, la garantie s’applique au booster suivant.</p>
      </div>
      <div class="products">
        ${card('standard')}
        ${card('faction', `<div class="chips fac-pick" role="radiogroup" aria-label="Faction du booster">${FACTION_ORDER.map((f) => `<button class="chip" role="radio" data-act="pickfac" data-v="${f}" style="--chip:${cat.faction[f].colors.secondary}" aria-pressed="${st.faction === f}" aria-checked="${st.faction === f}">${sigil(f)}${esc(cat.faction[f].name)}</button>`).join('')}</div>`)}
        ${card('event', `<p class="event-line"><b>${esc(ev.name)}</b> · ${ev.factions.map((f) => esc(cat.faction[f].name)).join(' et ')}<br><span class="small muted">${esc(ev.desc)} Encore ${ev.daysLeft} jour${ev.daysLeft > 1 ? 's' : ''}.</span></p>`)}
        ${card('premium')}
      </div>
      ${itemsShopHTML(g)}
      <p class="small muted center">Gagne des éclats avec les découvertes, l’offrande du jour, les succès, les ensembles, les niveaux et les boosters gratuits.</p>
    `;
  }
  render();
  bindActions(root, {
    pickfac(el) { st.faction = el.dataset.v; render(); },
    odds(el) { showOdds(app, el.dataset.type); },
    buy(el) {
      const type = el.dataset.type;
      openPack(app, type, { faction: type === 'faction' ? st.faction : undefined, onDone: () => render() });
    },
  });
  bindItemShop(app, root, render);
  if (params[0] === 'objets') requestAnimationFrame(() => root.querySelector('#objets')?.scrollIntoView({ block: 'start' }));
  app.refreshView = render;
  const timer = setInterval(() => { if (!document.querySelector('.opening')) render(); }, 60000);
  return () => { app.refreshView = null; clearInterval(timer); };
}
