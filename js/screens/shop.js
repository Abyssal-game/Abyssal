// Boutique : boosters achetables avec la monnaie du jeu uniquement.
import { BOOSTERS, RARITIES, PITY, FACTION_ORDER, ECONOMY } from '../config.js';
import { boosterOdds } from '../core/boosters.js';
import { icon, sigil, EMBLEM } from '../ui/icons.js';
import { esc, fmt, openSheet, bindActions, toast } from '../ui/dom.js';
import { openPack } from './opening.js';

export function packHTML(type, cat, { faction, event } = {}) {
  const def = BOOSTERS[type];
  let a = '#9F1834', b = '#683BBA', label = def.name.replace('Booster ', '');
  if (type === 'faction' && faction) { a = cat.faction[faction].colors.primary; b = cat.faction[faction].colors.secondary; label = cat.faction[faction].name; }
  if (type === 'event' && event) { a = cat.faction[event.factions[0]].colors.secondary; b = cat.faction[event.factions[1]].colors.secondary; label = event.name; }
  if (type === 'premium') { a = '#8A6526'; b = '#F1DB9E'; }
  const sig = type === 'faction' && faction ? sigil(faction) : EMBLEM;
  return `<div class="pack pack-${type}" style="--pa:${a};--pb:${b}"><div class="pack-crimp"></div><div class="pack-face"><span class="pack-sig">${sig}</span><span class="pack-brand">ABYSSAL</span><span class="pack-name">${esc(label)}</span><span class="pack-count">5 cartes</span></div><div class="pack-crimp bottom"></div></div>`;
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
    <p class="small">Chaque carte peut sortir en variante cosmétique (holographique, chromatique, corrompue, illustration alternative, ancestrale pour les Rares et mieux). Une variante ne change pas la carte en combat.${def.variantMult > 1 ? ` Ce booster multiplie leurs chances par ${String(def.variantMult).replace('.', ',')}.` : ''}</p>
    <h3>Doublons</h3>
    <p class="small">Un doublon exact rapporte des cendres (${RARITIES.map((r) => `${r.short} ${ECONOMY.duplicateAsh[r.key]}`).join(', ')}). Les cendres servent à invoquer une carte manquante.</p>`, { label: 'Probabilités' });
}

export default function shop(app, root) {
  const g = app.game, cat = app.catalog;
  const st = (app.state.shop ||= { faction: 'infernal' });
  const ev = g.event();

  function render() {
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
              ${tickets > 0 ? `${icon('ticket')}Ouvrir · ticket (${tickets})` : `Acheter <span class="price">${icon('crystal')}${fmt(def.price)}</span>`}
            </button>
            <button class="btn ghost small" data-act="odds" data-type="${type}">${icon('info')}Probabilités</button>
          </div>
          ${!can ? `<p class="small muted">Il te manque ${fmt(def.price - s.shards)} éclats.</p>` : ''}
        </div>
      </article>`;
    };
    root.innerHTML = `
      <header class="screen-head">
        <h1>Boosters</h1>
        <p class="muted">Tout s’achète avec les éclats gagnés en jouant. Aucun achat en argent réel.</p>
      </header>
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
      <p class="small muted center">Gagne des éclats avec les découvertes, l’offrande du jour, les succès, les ensembles, les niveaux et l’Arène.</p>
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
  return () => { app.refreshView = null; };
}
