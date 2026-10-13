import { itemsShopHTML, bindItemShop } from './items.js';
// Boutique : boosters achetables avec la monnaie du jeu uniquement.
import { BOOSTERS, RARITIES, PITY, FACTION_ORDER, ECONOMY, VARIANT_RATES } from '../config.js';
import { boosterOdds } from '../core/boosters.js';
import { icon, sigil, EMBLEM } from '../ui/icons.js';
import { esc, fmt, openSheet, bindActions, toast } from '../ui/dom.js';
import { artUrl, hasRealArt } from '../art/assets.js';
import { RARITY } from '../config.js';
import { openPack } from './opening.js';
import { parisDay, claimShadowPrize } from './shadow.js';

export function waitText(ms) {
  const m = Math.max(1, Math.ceil(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
}

// Libellé du bouton d'ouverture : ticket, gratuit ou prix en éclats.
export function payLabel(g, type, again = false) {
  const t = g.s.tickets[type] || 0;
  if (t > 0) return `${icon('ticket')}${again ? 'Encore un' : 'Ouvrir'} · ticket (${t})`;
  if (type === 'standard') { const f = g.freePack(); if (f.stock > 0) return `${icon('p:free-pack')}${again ? 'Encore un' : 'Ouvrir'} · gratuit (${f.stock})`; }
  return `${again ? 'Encore un' : 'Acheter'} <span class="price">${icon('crystal')}${fmt(BOOSTERS[type].price)}</span>`;
}

// Visuels d'emballage : assets/packs/<clé>.webp (booster, faction ou événement).
// Compteurs de garanties : combien de boosters avant la prochaine Hyper rare / Mythique assurée
export function pityHTML(g) {
  const row = (r, n, max, label) => {
    const left = max - n;
    return `<div class="pt-row"><span class="pt-gem rgem" data-r="${r}" style="--rc:${RARITY[r].color}">${RARITY[r].short}</span><span class="pt-t"><b>${label}</b><small>${left <= 1 ? 'garantie au prochain booster !' : `garantie dans ${left} boosters au plus`}</small></span><span class="pt-bar"><i style="width:${Math.min(100, (n / (max - 1)) * 100)}%;--rc:${RARITY[r].color}"></i></span></div>`;
  };
  return `<div class="pity-box" aria-label="Garanties">${row('HR', g.s.pity.sinceHR, PITY.hr, 'Hyper rare')}${row('M', g.s.pity.sinceM, PITY.m, 'Mythique')}</div>`;
}

export function packHTML(type, cat, { faction, event } = {}) {
  const def = BOOSTERS[type] || { name: type === 'shadow' ? 'Booster des Ombres' : 'Booster' };
  let label = type === 'shadow' ? 'Ombres' : def.name.replace('Booster ', '');
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
    <p class="small">Chaque carte peut sortir en finition holographique (${VARIANT_RATES.holo.toString().replace('.', ',')} %), feuille d’or (${VARIANT_RATES.gold.toString().replace('.', ',')} %) ou cosmique (${VARIANT_RATES.galaxy.toString().replace('.', ',')} %). Une finition est purement visuelle, et les boosters sont le seul moyen d’en obtenir.${def.variantMult > 1 ? ` Ce booster multiplie leurs chances par ${String(def.variantMult).replace('.', ',')}.` : ''}</p>
    <h3>Doublons</h3>
    <p class="small">Un doublon se brûle dans la Fournaise pour des cendres (${RARITIES.map((r) => `${r.short} ${ECONOMY.burnAsh[r.key]}`).join(', ')} ; ×${ECONOMY.burnFinish.holo} holographique, ×${ECONOMY.burnFinish.gold} or, ×${ECONOMY.burnFinish.galaxy} cosmique). Les cendres font monter le niveau de tes créatures et invoquent une carte manquante.</p>`, { label: 'Probabilités' });
}


export default function shop(app, root, params = []) {
  claimShadowPrize(app);
  const g = app.game, cat = app.catalog;
  const st = (app.state.shop ||= { faction: 'infernal' });
  const ev = g.event();

  function freeLine() {
    const f = g.freePack();
    if (!f.nextAt) return `<p class="free-line full">${icon('p:free-pack')}<span><b>${f.stock} boosters gratuits</b><small>Réserve pleine : ouvre-les !</small></span></p>`;
    return `<p class="free-line">${icon('hourglass')}<span>Prochain booster gratuit dans <b>${waitText(f.nextAt - Date.now())}</b><small>${f.stock ? `${f.stock} en réserve` : 'Aucun en réserve'}</small></span></p>`;
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
    const card = (type, extra = '', below = '') => {
      const def = BOOSTERS[type];
      const tickets = s.tickets[type] || 0;
      const can = g.canBuy(type);
      return `<article class="panel product" data-type="${type}">
        <div class="product-banner bn-${type}"><h2>${esc(def.name)}</h2></div>
        <div class="product-pack">${packHTML(type, cat, { faction: st.faction, event: ev })}</div>
        <div class="product-info">
          <p class="small muted">${esc(def.desc)}</p>
          ${extra}
          <div class="row gap wrap">
            <button class="btn ${can ? 'primary dc-plq dc-plq-red' : 'dc-plq dc-plq-dark'} shop-buy" data-act="buy" data-type="${type}" ${can ? '' : 'disabled'}>
              ${payLabel(g, type)}
            </button>
            <button class="btn ghost small" data-act="odds" data-type="${type}">${icon('info')}Probabilités</button>
          </div>
          ${!can ? `<p class="small muted">Il te manque ${fmt(def.price - s.shards)} éclats.</p>` : ''}
          ${type === 'standard' ? freeLine() : ''}
        </div>
        ${below ? `<div class="product-below">${below}</div>` : ''}
      </article>`;
    };
    root.innerHTML = `
      <header class="screen-head ui-hero bn-boosters"><h1>Boosters</h1><p class="muted">Ouvre des boosters pour agrandir ton Bestiaire.</p></header>
      <a class="panel sh-banner" href="#/tirage"><span class="sh-b-ic">${icon('p:shadow')}</span><span><b>Le Tirage des Ombres</b><span class="small muted">${g.shadowState().paid[parisDay()] ? 'Tirage du jour fait · voir le classement' : 'Ton booster gratuit du jour pour le classement de la semaine'}</span></span><span class="sh-b-go">${icon('next')}</span></a>
      <div class="products">
        ${card('standard')}
        ${card('faction', '', `<div class="chips fac-pick fac-grid" role="radiogroup" aria-label="Faction du booster">${FACTION_ORDER.map((f) => `<button class="chip" role="radio" data-act="pickfac" data-v="${f}" style="--chip:${cat.faction[f].colors.secondary}" aria-pressed="${st.faction === f}" aria-checked="${st.faction === f}">${sigil(f)}<span class="fg-n">${esc(cat.faction[f].name)}</span></button>`).join('')}</div>`)}
        ${card('event', `<p class="event-line"><b>${esc(ev.name)}</b> · ${ev.factions.map((f) => esc(cat.faction[f].name)).join(' et ')}<br><span class="small muted">${esc(ev.desc)} Encore ${ev.daysLeft} jour${ev.daysLeft > 1 ? 's' : ''}.</span></p>`)}
        ${g.s.tickets.premium ? card('premium') : ''}
      </div>
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
  app.refreshView = render;
  const timer = setInterval(() => { if (!document.querySelector('.opening')) render(); }, 60000);
  return () => { app.refreshView = null; clearInterval(timer); };
}
