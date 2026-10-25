// Boutique : boosters achetables avec la monnaie du jeu uniquement.
import { tuto } from '../ui/tutos.js';
import { BOOSTERS, RARITIES, PITY, FACTION_ORDER, ECONOMY, VARIANT_RATES } from '../config.js';
import { boosterOdds } from '../core/boosters.js';
import { icon, sigil, EMBLEM } from '../ui/icons.js';
import { esc, fmt, openSheet, bindActions, toast, paint } from '../ui/dom.js';
import { artUrl, hasRealArt } from '../art/assets.js';
import { RARITY } from '../config.js';
import { openPack } from './opening.js';
import { cardHTML, lazyArt } from '../ui/card.js';
import { parisDay, claimShadowPrize } from './shadow.js';
import * as cloud from '../cloud/cloud.js';
import { getPackSkin } from '../ui/vitrine.js'; /* v565 */

export function waitText(ms) {
  const m = Math.max(1, Math.ceil(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
}

// Libellé du bouton d'ouverture : ticket, gratuit ou prix en éclats.
export function payLabel(g, type, again = false) {
  const t = g.s.tickets[type] || 0;
  /* v518 : les boosters offerts à l'arrivée se disent « cadeau », le booster du jour « du jour » */
  if (type === 'standard' && t > 0 && g.s.welcomeGift > 0) return again ? `${icon('ticket')}Cadeau suivant` : `${icon('ticket')}Ouvrir · cadeau (${g.s.welcomeGift})`;
  if (t > 0) return `${icon('ticket')}${again ? 'Encore un' : 'Ouvrir'} · ticket (${t})`;
  if (type === 'standard') { const f = g.freePack(); if (f.stock > 0) return `${icon('p:free-pack')}${again ? 'Booster du jour' : `Ouvrir · gratuit (${f.stock})`}`; }
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

// v438 : nouveaux sachets (nouveaux noms : le service worker garderait les anciens)
const PACK_FILE = { abysse: 'abysse2', standard: 'standard3', event: 'event4' };
/* v565 : sachet choisi au Profil : remplace le visuel des boosters standard, Alliances et premium (pas ceux des factions) ;
   SKIN_BOX = case sombre où s’écrit le nom ; skin: null = visuel d'origine (l'adversaire au Pari) */
const SKINNED = ['standard', 'premium']; /* v587 : les Alliances gardent leur sachet */
/* v643 : case sombre de chaque sachet mesurée sur l'image (haut, bas, gauche, droite en % du sachet ; 5e valeur : taille du texte si la case est petite) : le nom et « 3 cartes » y sont centrés */
const SKIN_BOX = {
  /* v685 */ 'sachet-vif-hiver': [69.2, 83.2, 10, 10],
  'sachet-vif-ames': [67.5, 87.5, 9, 9], 'sachet-fondateur': [71, 88.5, 6, 6], 'sachet-vif-fondateur': [64, 86.5, 31, 31, 0.8],
  'sachet-braise': [71.5, 88, 6, 6], 'sachet-lune-sang': [71, 85.8, 9.5, 9.5], 'sachet-souverain': [75.4, 85.4, 10.5, 10.5, .8],
  'sachet-vif-eclipse': [71.3, 85.6, 9.5, 10], 'sachet-vif-phenix': [73.2, 89, 7, 7], 'sachet-vif-kraken': [72.3, 89, 7, 7], 
  'sachet-vif-dragon': [69.6, 87, 9, 9], 'sachet-vif-astrolabe': [67.4, 84.4, 10.5, 10], 'sachet-vif-givre-noir': [65.3, 82.9, 13.5, 13], 'sachet-vif-orage': [68.2, 83.6, 13.5, 13.5], 'sachet-vif-foret': [67, 85.6, 10.5, 10.5],
  'sachet-vif-necro': [66.2, 83.9, 12, 12.5], 'sachet-vif-automate': [70.8, 88.4, 9, 9], 'sachet-vif-celeste': [72.4, 89, 7.5, 7.5], 'sachet-vif-infernal': [72, 88.2, 7, 7], 
  'sachet-vif-meduse': [72.5, 88.7, 10.5, 10.5], 'sachet-vif-corbeau': [70.1, 86, 9, 8], 'sachet-vif-sablier': [69.4, 87.7, 8, 8], 'sachet-vif-araignee': [67.9, 85.8, 9, 8],
  'sachet-vif-scorpion': [71.3, 89, 8, 8], 'sachet-vif-loup': [71.5, 88.7, 8, 8], 'sachet-vif-orchidee': [69.1, 87.7, 11.5, 11.5],
  'sachet-vif-geode': [70.8, 88.5, 10.5, 10], 'sachet-vif-coeur': [69.5, 88, 7, 7] };
const skinVars = (k) => { const [t, b, l, r, s = 1] = SKIN_BOX[k] || [70, 86, 12, 12]; return `--lt:${t}%;--lb:${100 - b}%;--ll:${l}%;--lr:${r}%;--ls:${s}`; };
export function packHTML(type, cat, { faction, event, skin = getPackSkin(type) } = {}) {
  const def = BOOSTERS[type] || { name: type === 'shadow' ? 'Booster des Ombres' : 'Booster' };
  let label = type === 'shadow' ? 'Ombres' : def.name.replace('Booster ', '');
  let key = type;
  if (type === 'faction' && faction) { label = cat.faction[faction].name; key = faction; }
  if (type === 'event') label = 'Alliances';
  const tag = type === 'abysse' || type === 'shadow' ? '5 cartes' : type === 'premium' ? 'Rare garantie' : '3 cartes';
  const sk = skin && SKINNED.includes(type) ? skin : null;
  return `<div class="pack pack-${type} ${sk ? 'pack-skin' : ''}"${sk ? ` style="${skinVars(sk)}"` : ''}>
    <img class="pk-img" alt="" src="assets/packs/${sk || PACK_FILE[key] || key}.webp">${type === 'standard' && !sk ? '<img class="pk-glow" alt="" src="assets/packs/standard3-glow.webp">' : ''}
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
    <h3>Finitions</h3>
    <p class="small">Chaque carte peut sortir en finition argentée (${VARIANT_RATES.holo.toString().replace('.', ',')} %), enluminée (${VARIANT_RATES.gold.toString().replace('.', ',')} %), abyssale (${VARIANT_RATES.galaxy.toString().replace('.', ',')} %), cristalline (${VARIANT_RATES.crystal.toString().replace('.', ',')} %) ou prismatique (${VARIANT_RATES.prism.toString().replace('.', ',')} %). Une finition est purement visuelle. On l’obtient dans les boosters.${def.variantMult > 1 ? ` Ce booster multiplie leurs chances par ${String(def.variantMult).replace('.', ',')}.` : ''}</p>
    <h3>Doublons</h3>
    <p class="small">Un doublon se brûle dans la Fournaise pour des cendres (${RARITIES.map((r) => `${r.short} ${ECONOMY.burnAsh[r.key]}`).join(', ')} ; ×${ECONOMY.burnFinish.holo} argentée, ×${ECONOMY.burnFinish.gold} enluminée, ×${ECONOMY.burnFinish.galaxy} abyssale, ×${ECONOMY.burnFinish.crystal} cristalline, ×${ECONOMY.burnFinish.prism} prismatique). Les cendres font monter le niveau de tes créatures.</p>`, { label: 'Probabilités' });
}


// v518 : cadeau de bienvenue bien visible : les boosters offerts à l'arrivée, en plus du booster gratuit du jour
export const GIFT_N = ECONOMY.start.tickets.standard || 2;
export function giftHTML(g, cat) {
  const n = Math.min(g.s.welcomeGift || 0, g.s.tickets.standard || 0);
  if (!n) return '';
  const daily = g.freePack().stock, total = n + daily;
  return `<section class="panel ornate gift-box">
      <span class="gift-ribbon">Cadeau de bienvenue</span>
      <div class="gift-packs">${Array.from({ length: GIFT_N }, (_, i) => `<span class="gift-pk ${i < GIFT_N - n ? 'done' : ''}">${packHTML('standard', cat)}${i < GIFT_N - n ? '<i class="gift-ok">Ouvert</i>' : ''}</span>`).join('')}</div>
      <p class="gift-t">L’Abysse t’offre <b>${GIFT_N} boosters</b> pour ton arrivée.${n < GIFT_N ? ` Encore <b>${n}</b> à ouvrir !` : ''}</p>
      ${daily ? `<p class="small muted gift-s">En plus, ton <b>booster gratuit du jour</b> t’attend : ${total} boosters à ouvrir aujourd’hui.</p>` : ''}
      <button class="btn primary block big-cta dc-plq dc-plq-red" data-act="buy" data-type="standard">${icon('ticket')}Ouvrir ${n < GIFT_N ? 'mon dernier' : 'un'} booster offert</button>
    </section>`;
}

export default function shop(app, root, params = []) {
  claimShadowPrize(app);
  const g = app.game, cat = app.catalog;
  const st = (app.state.shop ||= { faction: 'infernal' });
  const ev = g.event();

  function freeLine() {
    const f = g.freePack();
    if (!f.nextAt) return `<p class="free-line full">${icon('p:free-pack')}<span><b>Booster gratuit du jour</b><small>Il se garde : jusqu’à 2 en réserve si tu ne l’ouvres pas tout de suite.</small></span></p>`;
    return `<p class="free-line">${icon('hourglass')}<span>Prochain booster gratuit dans <b>${waitText(f.nextAt - Date.now())}</b><small>Un booster gratuit chaque jour, à minuit (jusqu’à 2 en réserve).</small></span></p>`;
  }

  function render() {
    // garde la position de défilement (page et rangée des factions) pendant le rafraîchissement
    const keepX = root.querySelector('.fac-pick')?.scrollLeft || 0;
    const keepY = window.scrollY;
    draw();
    tuto(app, 'boosters');
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
            <button class="linkish small shop-odds" data-act="odds" data-type="${type}">${icon('info')}Probabilités</button>
          </div>
          ${!can ? `<p class="small muted">Il te manque ${fmt(def.price - s.shards)} éclats.</p>` : ''}
          ${type === 'standard' ? freeLine() : ''}
        </div>
        ${below ? `<div class="product-below">${below}</div>` : ''}
      </article>`;
    };
    paint(root, `
      ${giftHTML(g, cat)}
      <!-- v428 : plus de bannière ni d'encart du Tirage (il a son sous-onglet) : les boosters directement -->
      ${(() => { const n = ownedPacks(); return n >= 2 ? `<button class="btn gold block dc-plq dc-plq-dark shop-all" data-act="openall">${icon('ticket')}Ouvrir mes ${n} boosters</button>` : ''; })()}
      <div class="products">
        ${card('standard')}
        ${card('faction', '', `<div class="chips fac-pick fac-grid" role="radiogroup" aria-label="Faction du booster">${FACTION_ORDER.map((f) => `<button class="chip" role="radio" data-act="pickfac" data-v="${f}" style="--chip:${cat.faction[f].colors.secondary}" aria-pressed="${st.faction === f}" aria-checked="${st.faction === f}">${sigil(f)}<span class="fg-n">${esc(cat.faction[f].name)}</span></button>`).join('')}</div>`)}
        ${card('event', `<p class="event-line"><b>Alliées cette semaine</b> : ${ev.factions.map((f) => esc(cat.faction[f].name)).join(' et ')}<br><span class="small muted">Nouvelle alliance dans ${ev.daysLeft} jour${ev.daysLeft > 1 ? 's' : ''}.</span></p>`)}
        ${card('premium')}
        ${g.s.tickets.abysse ? card('abysse') : ''}
      </div>
    `);
    requestAnimationFrame(fitBuy); setTimeout(fitBuy, 600); document.fonts?.ready.then(fitBuy); /* après la traduction et la police */
  }
  // v529 : le texte d'un bouton d'ouverture se réduit juste assez pour rester dans son cadre (il débordait sur le bord doré)
  function fitBuy() {
    /* v541 : mesures d'abord, puis écritures (avant : un recalcul de la page entière par bouton et par demi-pixel) */
    const bs = [...root.querySelectorAll('.shop-buy')];
    bs.forEach((b) => b.style.removeProperty('font-size'));
    const sizes = bs.map((b) => {
      const cs = getComputedStyle(b), avail = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const r = document.createRange(); r.selectNodeContents(b);
      const w = r.getBoundingClientRect().width, fs = parseFloat(cs.fontSize);
      return avail > 0 && w > avail ? Math.max(9, Math.floor((fs * avail / w) * 2) / 2) : 0;
    });
    bs.forEach((b, i) => { if (sizes[i]) b.style.setProperty('font-size', `${sizes[i]}px`, 'important'); });
  }
  // v422 : boosters déjà à toi (tickets et boosters gratuits), ouverts d'un coup avec un récapitulatif
  function ownedPacks() {
    if (g.welcomePending() || g.s.welcomeGift > 0) return 0; /* v518 : pendant le cadeau de bienvenue, un booster à la fois */
    return Object.entries(g.s.tickets).filter(([k, n]) => n > 0 && BOOSTERS[k] && k !== 'abysse').reduce((a, [, n]) => a + n, 0) + g.freePack().stock;
  }
  let allBusy = false;
  async function openAll() {
    if (allBusy) return;
    const got = [];
    app.pendingProgress = [];
    /* v539 : tous les boosters partent ensemble au serveur de partie, qui les tire */
    const list = [];
    /* v729 : le Booster de l’Abysse s’ouvre seul, avec sa mise en scène */
    for (const type of Object.keys(BOOSTERS)) if (type !== 'abysse') for (let i = 0; i < (g.s.tickets[type] || 0); i++) list.push(['openBooster', [type, { faction: type === 'faction' ? st.faction : undefined }]]);
    for (let i = 0; i < g.freePack().stock; i++) list.push(['openBooster', ['standard']]);
    allBusy = true;
    try {
      const res = app.partie ? await app.partie.firstMany(list) : list.map(([, a]) => ({ ret: g.openBooster(...a) }));
      for (const r of res) { if (r.err) throw new Error(r.err); got.push(...r.ret.opening.cards); }
    } catch (e) { toast(esc(e.message), { kind: 'error' }); }
    allBusy = false;
    if (!got.length) { app.flushProgress(); return; }
    const RI = (r) => ['C', 'PC', 'R', 'HR', 'M', 'S'].indexOf(r);
    got.sort((a, b) => (b.isNewCard - a.isNewCard) || RI(cat.get(b.id).rarity) - RI(cat.get(a.id).rarity));
    const nNew = got.filter((c) => c.isNewCard).length, nFin = got.filter((c) => c.variant !== 'normal').length;
    const best = got.reduce((m, c) => (RI(cat.get(c.id).rarity) > RI(m) ? cat.get(c.id).rarity : m), 'C');
    app.sfx.reveal?.(best);
    const sh = openSheet(`<h2 class="center">${got.length} cartes ouvertes</h2><p class="small muted center">${nNew} nouvelle${nNew > 1 ? 's' : ''} créature${nNew > 1 ? 's' : ''}${nFin ? ` · ${nFin} finition${nFin > 1 ? 's' : ''}` : ''}</p><div class="grid-cards shop-allgrid">${got.map((c) => cardHTML(cat.get(c.id), { size: 'mini', variant: c.variant, isNew: c.isNewCard })).join('')}</div>`, { label: 'Boosters ouverts', onClose: () => { app.flushProgress(); render(); } });
    lazyArt(sh.body);
    app.chrome?.();
  }
  // v331 : ce que tes éclats permettent, les taux réels par carte, et d'où viennent vraiment les Secrètes
  render();
  bindActions(root, {
    pickfac(el) { st.faction = el.dataset.v; render(); },
    openall() { openAll(); },
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
