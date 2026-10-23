// v470 : ÉBAUCHE du pass de saison (« Le Codex de l'Abîme ») et de la boutique en argent réel (« L'Échoppe »).
// Visible seulement en Mode Créateur (option « Codex et Échoppe ») ; les achats sont simulés (aucun paiement).
import { CODEX, CODEX_XP, CODEX_XP_LABEL, tiersOf, seasonByKey, CODEX_FRAMES, CODEX_BACKS, FINISHES, PLATES, EMOTES, SACHETS, TAPIS, FONDS, SHOP, CATALOG, OBS, codexTier, tierProgress, claimable, freshCodex } from '../core/codex.js';
import { FRAMES } from '../config.js';
import { CHESTS } from '../core/descent.js';
import { icon, picon } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, openSheet } from '../ui/dom.js';
import { cardHTML, enableTilt } from '../ui/card.js';
import { artUrl } from '../art/assets.js';
import { EMBLEM } from '../ui/icons.js';
import { setScene } from '../ui/scene.js';
import { t, tx } from '../i18n.js'; /* v574 */
import { emoteHTML, emotePic, emoteLabel, fondStyle, withPlate } from '../ui/vitrine.js'; /* v564 : plaques de pseudo et réactions en ligne */
import { sync } from '../cloud/sync.js';
import { packHTML } from './shop.js'; /* v570 : aperçu des sachets */

const ALL_FRAMES = { ...FRAMES, ...CODEX_FRAMES };
const PACK_NAME = { standard: 'booster standard', premium: 'booster premium' };
/* v478 : pierre d'obsidienne peinte (Gemini, store/icons/obsidienne-source.jpg) */
export const OBS_I = '<img class="obs-i" src="assets/icons/obsidienne.webp" alt="" aria-hidden="true">';
const obsTxt = (n) => `<span class="obs-n">${OBS_I}${fmt(n)}</span>`;

export default function codexScreen(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.codex ||= { tab: 'codex' });
  setScene('shop');

  // Une récompense en une ligne (icône + texte)
  const rw = (r) => {
    if (!r) return '<span class="cx-none">—</span>';
    const parts = [];
    if (r.shards) parts.push(`<span class="cx-r">${icon('crystal')}+${fmt(r.shards)}</span>`);
    if (r.ash) parts.push(`<span class="cx-r">${icon('ash')}+${fmt(r.ash)}</span>`);
    for (const [k, n] of Object.entries(r.chests || {})) parts.push(`<span class="cx-r" style="color:${CHESTS[k]?.color || '#E8C987'}">${icon('p:chest')}${n > 1 ? `${n} × ` : ''}${esc(CHESTS[k]?.name || k)}</span>`);
    for (const [k, n] of Object.entries(r.tickets || {})) parts.push(`<span class="cx-r">${icon('p:booster')}${n} ${esc(PACK_NAME[k] || k)}${n > 1 ? 's' : ''}</span>`);
    if (r.frame) parts.push(`<span class="cx-r"><i class="avatar-mini pf pf-${r.frame}"></i>${esc(ALL_FRAMES[r.frame] || r.frame)}</span>`);
    if (r.title) parts.push(`<span class="cx-r">${picon('titles')}Titre « ${esc(r.title)} »</span>`);
    if (r.back) parts.push(`<span class="cx-r"><img class="cx-back" alt="" src="assets/backs/${r.back}.webp">${esc(CODEX_BACKS[r.back] || r.back)}</span>`);
    if (r.sachet) parts.push(`<span class="cx-r"><img class="cx-back" alt="" src="assets/packs/${r.sachet}.webp">${esc(SACHETS[r.sachet] || r.sachet)}</span>`); /* v565 */
    if (r.plate) parts.push(`<span class="cx-r"><span class="np np-${r.plate} cxr-np" translate="no">${esc(myName())}</span>${esc(PLATES[r.plate] || r.plate)}</span>`); /* v630 */
    if (r.emote) parts.push(`<span class="cx-r"><span class="re-pic cxr-re">${emotePic(r.emote)}</span>${esc(t('Réaction'))} : ${esc(emoteLabel(r.emote))}</span>`); /* v630 */
    if (r.finish) parts.push(`<span class="cx-r">${picon('holo')}Finition ${esc(FINISHES[r.finish]?.name || r.finish)}</span>`);
    if (r.obs) parts.push(`<span class="cx-r">${obsTxt(r.obs)}&nbsp;${esc(OBS.name.toLowerCase())}</span>`);
    return parts.join('');
  };

  /* v533 : refonte visuelle du Codex et de l'Échoppe (demande du propriétaire : « ça ne donne pas envie »).
     Images Gemini attendues dans assets/ui/ (cx-saison1, cx-enlumine, ech-vitrine, obs-1..4, ech-fondateur) : sans elles, repli sur un dégradé. */
  const myName = () => sync.profile?.pseudo || g.s.name || 'Toi'; /* v564 */
  const myAv = () => { const c = cat.get(g.shownAvatar()); return c ? `<img alt="" src="${artUrl(c, { lite: true })}">` : EMBLEM; };
  const opt = (src, cls = '') => `<img class="${cls}" alt="" src="${src}" onerror="this.remove()">`;
  /* rang d'un objet selon son prix (couleur de la tuile) */
  const rank = (it) => { if (it.r) return it.r; /* v584 : rareté choisie selon la beauté */ const c = it.cost || 0; return it.kind === 'bundle' ? 'leg' : c >= 450 ? 'myth' : c >= 250 ? 'leg' : c >= 180 ? 'epic' : 'rare'; };
  const RANK = { rare: 'Rare', epic: 'Épique', leg: 'Légendaire', myth: 'Mythique' };
  // Une récompense du Codex en grand (visuel + libellé)
  const rwBig = (r) => {
    if (!r) return '';
    const items = [];
    if (r.shards) items.push([`<span class="cxr-ic">${icon('crystal')}</span>`, `+${fmt(r.shards)}`, 'éclats']);
    if (r.ash) items.push([`<span class="cxr-ic">${icon('ash')}</span>`, `+${fmt(r.ash)}`, 'cendres']);
    for (const [k, n] of Object.entries(r.chests || {})) items.push([`<img class="cxr-chest" alt="" src="assets/chests/${k}.webp">`, n > 1 ? `${n} ×` : '', esc(CHESTS[k]?.name || k)]);
    for (const [k, n] of Object.entries(r.tickets || {})) items.push([`<img class="cxr-pack" alt="" src="assets/packs/${k === 'standard' ? 'standard2' : k}.webp">`, `${n} ×`, esc(PACK_NAME[k] || k)]);
    if (r.frame) items.push([`<span class="avatar-mini pf pf-${r.frame}">${myAv()}</span>`, '', esc(ALL_FRAMES[r.frame] || r.frame)]);
    if (r.back) items.push([`<img class="cxr-back" alt="" src="assets/backs/${r.back}.webp">`, '', esc(CODEX_BACKS[r.back] || r.back)]);
    if (r.sachet) items.push([`<img class="cxr-pack" alt="" src="assets/packs/${r.sachet}.webp">`, '', esc(SACHETS[r.sachet] || r.sachet)]); /* v565 */
    if (r.plate) items.push([`<span class="np np-${r.plate} cxr-np" translate="no">${esc(myName())}</span>`, '', esc(PLATES[r.plate] || r.plate)]); /* v630 */
    if (r.emote) items.push([`<span class="re-pic cxr-re">${emotePic(r.emote)}</span>`, esc(t('Réaction')), esc(emoteLabel(r.emote))]); /* v630 */
    if (r.finish) items.push([`<span class="cx-fin cxr-fin"><img alt="" src="assets/art/lite/${esc(g.bestCards(1)[0]?.id || 'ABY-039')}.webp"><img alt="" src="assets/variants/${r.finish}-frame.webp" onerror="this.remove()"></span>`, '', `Finition ${esc(FINISHES[r.finish]?.name || r.finish)}`]);
    if (r.title) items.push([`<span class="cxr-ic">${picon('titles')}</span>`, 'Titre', `« ${esc(r.title)} »`]);
    if (r.obs) items.push([`<span class="cxr-ic">${OBS_I}</span>`, `+${fmt(r.obs)}`, esc(OBS.name.toLowerCase())]);
    return items.map(([v, n, l]) => `<span class="cxr">${v}<span class="cxr-t">${n ? `<b>${n}</b>` : ''}<small>${l}</small></span></span>`).join('');
  };

  /* v636 : une récompense cosmétique du Codex, vue comme un objet (aperçu) */
  /* v640 : toutes les récompenses d'un palier (le palier 30 donne une couronne, un dos et un titre), titre compris si demandé */
  const seasonItems = (r, tier, titles = false) => ['frame', 'back', 'sachet', 'plate', 'emote', 'mat', 'fond', ...(titles ? ['title'] : [])].filter((x) => r?.[x]).map((k) => ({ id: r[k], kind: k, season: true, tier }));
  function codexTab() {
    const c = g.codex(), t = codexTier(c), n = claimable(c), max = t >= CODEX.tiers;
    const cell = (tier, tr, r) => {
      if (!r) return `<div class="cxk-c ${tr} void"></div>`;
      const got = c[tr].includes(tier), lockedPrem = tr === 'prem' && !c.premium, reached = tier <= t;
      const state = got ? 'got' : !reached ? 'far' : lockedPrem ? 'lock' : 'ready';
      const look = state !== 'ready' && tr === 'prem' && seasonItems(r, tier, true).length; /* v640 : titres compris */ /* v636 : toucher une récompense cosmétique = son aperçu */
      return `<div class="cxk-c ${tr} ${state} ${look ? 'look' : ''}" ${state === 'ready' ? `data-cx="claim" data-tr="${tr}" data-t="${tier}" role="button" tabindex="0"` : look ? `data-cx="seez" data-t="${tier}" role="button" tabindex="0"` : ''}>${rwBig(r)}
        ${state === 'ready' ? '<span class="cxk-go">Récupérer</span>' : state === 'got' ? `<span class="cxk-ok">${icon('check')}</span>` : state === 'lock' ? `<span class="cxk-lk">${icon('lock')}</span>` : ''}</div>`;
    };
    const se = g.codexSeason(), best = se.best; /* v550 : les plus belles pièces de la saison */
    /* v636 : toutes les récompenses cosmétiques de la saison, en vitrine (toucher = aperçu) ; jours restants */
    const loot = tiersOf(c.season).flatMap((x) => seasonItems(x.prem, x.tier, x.tier === 30).map((it) => ({ x, it }))); /* v643 : le titre ultime aussi */ ui.loot = loot.map((o) => o.it); /* v640 : tous les objets, palier 30 compris */
    const left = Math.max(0, Math.ceil((new Date(`${se.ends}T23:59:59`) - g.clock()) / 864e5));
    const lootHTML = loot.length ? `<section class="cx-loot"><h3 class="cxs-sh">${icon('star')}À gagner cette saison <small>${loot.length} objets</small></h3>
      <div class="cxs-rail">${loot.map(({ x, it }) => `<button class="cxs-t wide r-season ${it.kind} ${ownedOf(it) ? 'own' : ''}" data-cx="seel" data-i="${loot.findIndex((o) => o.it === it)}"><span class="cxs-pic">${picOf(it)}</span><span class="cxs-rk">Palier ${x.tier}</span><b>${esc(nameOf(it))}</b>${ownedOf(it) ? `<span class="cxs-own">${icon('check')}Possédé</span>` : ''}</button>`).join('')}</div></section>` : '';
    const pitch = c.premium ? '' : `<section class="cx-pitch">
        ${opt('assets/ui/cx-enlumine.webp', 'cx-pitch-art')}
        <div class="cx-pitch-in"><small class="cx-kick">Voie enluminée</small><h2>${esc(CODEX.premiumName)}</h2>
          <p>${esc(se.pitch)}</p>
          <div class="cx-pitch-show">${best.map((k) => k.startsWith('dos') ? `<img class="cxr-back" alt="" src="assets/backs/${k}.webp" onerror="this.remove()">` : `<span class="avatar-mini pf pf-${k}">${myAv()}</span>`).join('')}</div>
          <button class="btn dc-plq dc-plq-red cx-unlock2" data-cx="unlock">${icon('star')}<span>Débloquer</span><b class="cx-eur">${esc(CODEX.price)}</b></button></div></section>`;
    return `<section class="cx-season">
        ${opt(se.art, 'cx-season-art')}
        <div class="cx-season-in"><small class="cx-kick">Du ${esc(se.starts.split('-').reverse().join('/'))} au ${esc(se.ends.split('-').reverse().join('/'))}${g.codexLive() ? '' : ' · bientôt'}</small>
          <h2>${esc(se.title)}</h2>${g.codexLive() ? `<p class="small cx-left">${icon('bell')}Encore ${left} jour${left > 1 ? 's' : ''}</p>` : ''}
          ${(() => { const p = g.s.codexPast, old = p && seasonByKey(p.season); return old && p.day >= se.starts ? `<p class="small cx-past">${icon('check')} Fin de la ${esc(old.title)} : ${p.n} récompense${p.n > 1 ? 's' : ''} oubliée${p.n > 1 ? 's' : ''} t’${p.n > 1 ? 'ont' : 'a'} été donnée${p.n > 1 ? 's' : ''}.</p>` : ''; })()}
          <div class="cx-season-row"><span class="cx-medal"><b>${t}</b><small>/ ${CODEX.tiers}</small></span>
            <span class="cx-season-p"><span>${max ? 'Codex terminé pour cette saison !' : `Palier ${t + 1} · ${c.xp % CODEX.xpPerTier} / ${CODEX.xpPerTier} points`}</span><span class="cx-bar2"><i style="width:${Math.round(tierProgress(c) * 100)}%"></i></span></span></div>
          ${c.premium ? `<span class="cx-badge on">${icon('star')}${esc(CODEX.premiumName)} acquis</span>` : ''}</div></section>
      ${n ? `<button class="btn primary block dc-plq dc-plq-red cx-all" data-cx="all">${icon('chest')}Tout récupérer (${n})</button>` : ''}
      ${pitch}
      ${lootHTML}
      <div class="cxk-head"><span>Voie de l'Abîme<small>gratuite</small></span><span></span><span class="prem">Voie enluminée<small>${c.premium ? 'à toi' : 'à débloquer'}</small></span></div>
      <ol class="cxk">${tiersOf(c.season).map((x) => `<li class="cxk-r ${x.tier <= t ? 'reached' : ''} ${x.tier === t + 1 ? 'next' : ''} ${x.tier === CODEX.tiers ? 'ult' : ''}" ${x.tier === Math.min(CODEX.tiers, t + 1) ? 'id="cx-now"' : ''}>${cell(x.tier, 'free', x.free)}<span class="cxk-n">${x.tier}</span>${cell(x.tier, 'prem', x.prem)}</li>`).join('')}</ol>
      <details class="panel dc-fold"><summary>${picon('help')}<span class="dc-sum-t">Gagner des points de Codex</span></summary>
        <ul class="cx-xp">${Object.entries(CODEX_XP).map(([k, v]) => `<li><span>${esc(CODEX_XP_LABEL[k])}</span><b>+${v}</b><small class="muted">${fmt(c.log[k] || 0)} gagnés</small></li>`).join('')}</ul>
        <p class="small muted">La voie de gauche se gagne en jouant. La voie enluminée s’achète une fois par saison : une récompense à chaque palier, sur le thème de la saison, jamais en vente à l’Échoppe et jamais de puissance.</p></details>`;
  }

  /* v636 : l'Échoppe refaite (demande du propriétaire : « que les menus donnent envie, que les cosmétiques soient mis en valeur,
     bien rangés, faciles à trouver, avec de beaux aperçus ») : un accueil (vitrine de la semaine, nouveautés, rayons illustrés),
     puis un rayon par famille, rangé par rareté, avec filtres ; l'aperçu passe d'un objet à l'autre et permet d'équiper. */
  const KINDS = {
    frame: ['Cadres', 'Cadre de profil', 'Autour de ton portrait, partout où il apparaît'],
    live: ['Dos de cartes', 'Dos de cartes', 'Le dos animé de toutes tes cartes face cachée'],
    sachet: ['Sachets', 'Sachet de booster', 'L’habillage de tes boosters standard et premium'],
    plate: ['Plaques', 'Plaque de pseudo', 'La bannière derrière ton pseudo'],
    fond: ['Fonds de profil', 'Fond de profil', 'La scène derrière ton portrait, vue par tous'],
    mat: ['Tapis', 'Tapis de jeu', 'Le plateau de tes Duels des Sceaux'],
    emote: ['Réactions', 'Réaction', 'Des bulles à envoyer en partie en ligne'],
    bundle: ['Lots', 'Lot', 'Plusieurs objets, moins chers qu’à l’unité'],
  };
  const kindOf = (it) => (it.kind === 'back' ? 'live' : it.kind);
  const nameOf = (it) => (it.kind === 'title' ? `Titre « ${it.id} »` : null) || it.name || (it.kind === 'frame' ? ALL_FRAMES[it.id] : it.kind === 'finish' ? `Finition ${FINISHES[it.id].name}` : it.kind === 'plate' ? PLATES[it.id] : it.kind === 'sachet' ? SACHETS[it.id] : it.kind === 'mat' ? TAPIS[it.id] : it.kind === 'fond' ? FONDS[it.id] : it.kind === 'emote' ? EMOTES[it.id].name : CODEX_BACKS[it.id]) || it.id;
  const picOf = (it, big = false) => it.kind === 'frame' ? `<span class="${big ? 'avatar-big' : 'avatar-mini'} pf pf-${it.id}">${myAv()}</span>`
    : it.kind === 'back' ? `<img class="cx-bk" alt="" src="assets/backs/${it.id}.webp">`
    : it.kind === 'sachet' ? `<img class="cx-sa" alt="" src="assets/packs/${it.id}.webp">`
    : it.kind === 'plate' ? `<span class="np np-${it.id} np-demo" translate="no">${esc(myName())}</span>`
    : it.kind === 'mat' ? `<img class="cx-mat" alt="" src="assets/tapis/${it.id}.webp">`
    : it.kind === 'fond' ? `<span class="cx-fondt has-fond"${fondStyle(it.id)}><span class="avatar-mini pf pf-${g.s.frame}">${myAv()}</span></span>`
    : it.kind === 'title' ? `<span class="cx-ttl">${picon('titles')}</span>`
    : it.kind === 'emote' ? `<span class="re-tile">${emoteHTML(it.id)}</span>`
    : it.give?.emotes ? `<span class="re-fan">${it.give.emotes.slice(0, 4).map((k) => `<span class="re-pic">${emotePic(k)}</span>`).join('')}</span>`
    : it.give?.backs ? `<span class="cx-fan">${it.give.backs.slice(0, 4).map((b) => `<img alt="" src="assets/backs/${b}.webp">`).join('')}</span>` : '';
  /* l'objet est-il porté en ce moment ? (et comment le porter) */
  const worn = (it) => { const s = g.s; return it.kind === 'title' ? s.title === it.id : it.kind === 'frame' ? s.frame === it.id : it.kind === 'back' ? s.back === it.id : it.kind === 'sachet' ? s.sachet === it.id || s.sachetPrem === it.id : it.kind === 'plate' ? s.plate === it.id : it.kind === 'mat' ? s.mat === it.id : it.kind === 'fond' ? s.fond === it.id : false; };
  const wearable = (it) => ['title', 'frame', 'back', 'sachet', 'plate', 'mat', 'fond'].includes(it.kind);
  const wear = (it) => {
    if (it.kind === 'title') g.setTitle(it.id); if (it.kind === 'frame') g.setFrame(it.id); if (it.kind === 'back') g.setBack(it.id); if (it.kind === 'sachet') g.setSachet(it.id, 'standard');
    if (it.kind === 'plate') g.setPlate(it.id); if (it.kind === 'mat') g.setMat(it.id); if (it.kind === 'fond') g.setFond(it.id);
    app.applySettings?.(); app.chrome?.();
  };
  const ownedOf = (it) => (it.kind === 'title' ? g.s.titles.includes(it.id) : it.season ? g.s[{ frame: 'frames', back: 'backs', sachet: 'sachets', plate: 'plates', emote: 'emotes', mat: 'mats', fond: 'fonds' }[it.kind]]?.includes(it.id) : g.catalogOwned(it.id));
  const RANKS = ['myth', 'leg', 'epic', 'rare'];
  
  function shopTab() {
    const have = g.obs();
    const tile = (it, wide = false) => { const own = g.catalogOwned(it.id), cost = g.catalogCost(it.id), r = rank(it), on = own && worn(it);
      return `<button class="cxs-t r-${r} ${it.kind} ${own ? 'own' : ''} ${wide ? 'wide' : ''}" data-cx="see" data-id="${it.id}"><span class="cxs-pic">${picOf(it)}</span><span class="cxs-rk">${RANK[r]}</span><b>${esc(nameOf(it))}</b>
        ${on ? `<span class="cxs-own on">${icon('check')}Équipé</span>` : own ? `<span class="cxs-own">${icon('check')}Possédé</span>` : `<span class="cxs-pr ${cost <= have ? '' : 'short'}">${obsTxt(cost)}</span>`}</button>`; };
    const wallet = `<section class="cxs-wallet"><span class="cxs-w-n">${obsTxt(have)}</span><span class="small">${esc(OBS.name)} · seulement pour des cosmétiques</span>
        <button class="btn small primary" data-cx="cat" data-v="obs">Obtenir</button></section>`;
    const inKind = (k) => CATALOG.filter((x) => kindOf(x) === k);
    /* — un rayon — */
    if (ui.cat && ui.cat !== 'obs' && KINDS[ui.cat]) {
      const k = ui.cat, [label, , desc] = KINDS[k], all = inKind(k), owned = all.filter((x) => g.catalogOwned(x.id)).length;
      const rar = RANKS.includes(ui.rar) ? ui.rar : null;
      const list = all.filter((x) => (!rar || rank(x) === rar) && (!ui.hideOwned || !g.catalogOwned(x.id)));
      const groups = RANKS.map((r) => [r, list.filter((x) => rank(x) === r).sort((a, b) => (g.catalogOwned(a.id) - g.catalogOwned(b.id)) || (b.cost - a.cost))]).filter(([, l]) => l.length);
      const tabs = Object.keys(KINDS).filter((x) => inKind(x).length);
      return `${wallet}
        <nav class="cxs-nav" aria-label="Rayons"><button class="cxs-home" data-cx="cat" data-v="">${icon('prev')}Accueil</button>${tabs.map((x) => `<button class="cxs-cat ${x === k ? 'on' : ''}" data-cx="cat" data-v="${x}">${KINDS[x][0]}</button>`).join('')}</nav>
        <section class="cxs-aisle"><h2>${label}</h2><p class="small muted">${desc}</p><p class="small cxs-cnt"><b>${owned} / ${all.length}</b> possédés</p>
          <div class="cxs-filt">${[[null, 'Toutes'], ...RANKS.map((r) => [r, RANK[r]])].filter(([r]) => !r || all.some((x) => rank(x) === r)).map(([r, l]) => `<button class="chip ${r ? `r-${r}` : ''}" data-cx="rar" data-v="${r || ''}" aria-pressed="${(rar || null) === r}">${l}</button>`).join('')}
            <button class="chip" data-cx="hide" aria-pressed="${!!ui.hideOwned}">${icon('eye')}Masquer ce que j’ai</button></div></section>
        ${groups.length ? groups.map(([r, l]) => `<h3 class="cxs-gh r-${r}"><span>${RANK[r]}</span><small>${l.length}</small></h3><div class="cxs-grid ${k === 'live' ? 'back' : k}">${l.map((x) => tile(x)).join('')}</div>`).join('')
          : `<p class="muted center cxs-none">${ui.hideOwned ? 'Tu as déjà tout ce rayon. Bravo !' : 'Rien ici pour l’instant.'}</p>`}`;
    }
    /* — les obsidiennes — */
    if (ui.cat === 'obs') {
      const euro = (it, i) => { const own = it.once && g.shopOwned(it.id); const art = it.kind === 'obs' ? `assets/ui/obs-${Math.min(4, i + 1)}.webp` : 'assets/ui/ech-fondateur2.webp';
        return `<article class="cxs-e ${it.kind === 'obs' ? 'obs' : 'founder'} ${own ? 'own' : ''}">${opt(art, 'cxs-e-art')}
          <div class="cxs-e-in"><b>${it.kind === 'obs' ? obsTxt(it.give.obs) : esc(it.name)}</b>${it.bonus ? `<span class="cx-bonus">+${it.bonus} offertes</span>` : ''}
          ${it.desc ? `<small>${esc(it.desc)}</small>` : ''}</div>
          ${own ? `<span class="cxs-own">${icon('check')}Possédé</span>` : `<button class="btn primary small" data-cx="buy" data-id="${it.id}">${esc(it.price)}</button>`}</article>`; };
      let obsI = 0;
      return `${wallet}<nav class="cxs-nav"><button class="cxs-home" data-cx="cat" data-v="">${icon('prev')}Accueil</button></nav>
        <section class="cxs-aisle"><h2>${esc(OBS.name)}</h2><p class="small muted">Elles ne servent qu’aux cosmétiques : rien ici ne rend tes créatures plus fortes.</p></section>
        <div class="cxs-euro" id="cx-euro">${SHOP.filter((it) => it.kind === 'obs').map((it) => euro(it, it.kind === 'obs' ? obsI++ : 0)).join('')}</div>
        <button class="btn ghost block" data-cx="restore">Restaurer mes achats</button>
        <p class="small muted center">Pendant l'aperçu, tout achat en euros est simulé : aucun paiement.</p>`;
    }
    /* — l'accueil (v637 : sans vitrine ni nouveautés ; obsidiennes et Pack du Fondateur en tête, bien visibles) — */
    const aisles = Object.keys(KINDS).filter((k) => inKind(k).length).map((k) => { const l = inKind(k), own = l.filter((x) => g.catalogOwned(x.id)).length;
      const show = l.slice().sort((a, b) => RANKS.indexOf(rank(a)) - RANKS.indexOf(rank(b)))[0];
      return `<button class="cxs-aisle-t k-${k}" data-cx="cat" data-v="${k}"><span class="cxs-at-pic">${picOf(show)}</span><b>${KINDS[k][0]}</b><small>${KINDS[k][2]}</small><span class="cxs-at-n">${own} / ${l.length}</span></button>`; }).join('');
    const fd = SHOP.find((x) => x.id === 'fondateur'), fdOwn = fd && g.shopOwned(fd.id);
    const big = `<div class="cxs-bigs">
        <button class="cxs-big k-obs" data-cx="cat" data-v="obs"><span class="cxs-big-pic">${[1, 2, 3, 4].map((n) => opt(`assets/ui/obs-${n}.webp`)).join('')}</span>
          <span class="cxs-big-t"><b>${esc(OBS.name)}</b><small>De 100 à 2 800 · bonus offert sur les gros paquets</small></span><span class="cxs-big-go">${icon('next')}</span></button>
        ${fd ? `<button class="cxs-big k-founder ${fdOwn ? 'own' : ''}" data-cx="founder">${opt('assets/ui/ech-fondateur2.webp', 'cxs-big-bg')}
          <span class="cxs-big-t"><small class="cx-kick">Une seule fois</small><b>${esc(fd.name)}</b><small>${fdOwn ? `${icon('check')}Déjà à toi` : `Voir ce qu’il contient · ${esc(fd.price)}`}</small></span><span class="cxs-big-go">${icon('next')}</span></button>` : ''}</div>`;
    return `${wallet}${big}
      <h3 class="cxs-sh">${icon('chest')}Les rayons</h3><div class="cxs-aisles">${aisles}</div>`;
  }

  /* v637 : ce que contient le Pack du Fondateur (aperçu de chaque objet) */
  function founder() {
    const it = SHOP.find((x) => x.id === 'fondateur'), gv = it.give, own = g.shopOwned(it.id), s = g.s;
    const av = cat.get(g.shownAvatar()), avImg = av ? `<img alt="" src="${artUrl(av, { lite: true })}">` : EMBLEM;
    const rows = [];
    if (gv.frame) rows.push(['Cadre de profil', ALL_FRAMES[gv.frame], `<span class="avatar-big pf pf-${gv.frame}">${avImg}</span>`]);
    if (gv.back) rows.push(['Dos de cartes', CODEX_BACKS[gv.back], `<span class="cx-fd-backs">${[0, 1, 2].map(() => `<img alt="" src="assets/backs/${gv.back}.webp">`).join('')}</span>`]);
    if (gv.sachet) rows.push(['Sachet de booster', SACHETS[gv.sachet], `<span class="cx-pv-packs">${packHTML('standard', null, { skin: gv.sachet })}</span>`]);
    if (gv.plate) rows.push(['Plaque de pseudo', PLATES[gv.plate], `<span class="np np-${gv.plate}">${esc(myName())}</span>`]);
    if (gv.fond) rows.push(['Fond de profil', FONDS[gv.fond], `<span class="cx-fondt has-fond"${fondStyle(gv.fond)}><span class="avatar-mini pf pf-${s.frame}">${avImg}</span></span>`]);
    if (gv.title) rows.push(['Titre', '', `<span class="cx-fd-title">${picon('titles')}<b>${esc(gv.title)}</b><small>avec son badge au classement</small></span>`]);
    if (gv.obs) rows.push([esc(OBS.name), `${fmt(gv.obs)} obsidiennes`, `<span class="cx-fd-obs">${OBS_I}<b>${fmt(gv.obs)}</b></span>`]);
    const sh = openSheet('', { label: it.name, full: true, cls: 'cx-pv cx-fd' });
    sh.setContent(`<img class="cx-fd-hero" alt="" src="assets/ui/ech-fondateur2-large.webp" onerror="this.remove()"><header class="cx-pv-head r-myth"><small class="cx-kick">Vendu une seule fois</small><h2 class="cx-pv-title">${esc(it.name)}</h2><small class="cx-pv-pos">${rows.length} récompenses</small></header>
      <p class="small muted center">Pour celles et ceux qui soutiennent l’Abysse dès le début : des objets introuvables ailleurs, jamais de puissance.</p>
      ${rows.map(([k, n, v]) => `<section class="cx-fd-row"><p class="cx-pv-cap">${k}</p><div class="cx-fd-v">${v}</div><b class="cx-fd-n">${esc(n || '')}</b></section>`).join('')}
      <div class="cx-pv-foot">${own ? `<span class="cx-badge on">${icon('check')}Déjà à toi</span>` : `<button class="btn primary cx-pv-buy" data-fd="buy">Acheter · ${esc(it.price)}</button><small class="muted">Aperçu Créateur : achat simulé</small>`}</div>`);
    sh.body.addEventListener('click', async (e) => { if (!e.target.closest('[data-fd="buy"]')) return;
      if (!(await confirmBox(`<b>Achat simulé</b> : ${esc(it.name)} (${esc(it.price)}).<br>Aperçu Créateur : aucun paiement, l'achat est simplement ajouté à ton profil.`, { ok: 'Simuler l’achat' }))) return;
      try { g.shopBuy(it.id); app.sfx.levelup?.(); toast(`${esc(it.name)} : acquis (achat simulé).`, { kind: 'success', icon: 'star' }); sh.close?.(); app.chrome?.(); draw(); } catch (err) { toast(esc(err.message), { kind: 'error' }); } });
  }

  function devTab() {
    const c = g.codex();
    return `<details class="panel dc-fold cx-dev"><summary>${picon('settings')}<span class="dc-sum-t">Réglages de l'aperçu (Créateur)</span></summary>
      <p class="small muted">Pour voir ce que ça donne : ces boutons ne servent qu'à l'essai. Les paliers et les prix se règlent dans <code>js/core/codex.js</code> (demande-moi).</p>
      <div class="row gap wrap"><button class="btn small" data-cx="xp" data-v="100">+100 points</button><button class="btn small" data-cx="xp" data-v="1000">+10 paliers</button><button class="btn small" data-cx="obs">+1000 obsidiennes</button><button class="btn small" data-cx="obs0">Obsidiennes à 0</button>
      <button class="btn small" data-cx="prem">${c.premium ? 'Retirer' : 'Donner'} le ${esc(CODEX.premiumName)}</button><button class="btn small" data-cx="reset">Remettre le Codex à zéro</button></div></details>`;
  }

  function draw() {
    if (!g.codexOn()) { location.replace('#/boutique'); return; } /* caché : rien ne doit trahir le pass hors Mode Créateur */
    root.innerHTML = `<header class="screen-head ui-hero ${ui.tab === 'shop' ? 'bn-echoppe' : 'bn-codex'} cx-top"><h1>${ui.tab === 'shop' ? 'L’Échoppe' : esc(CODEX.name)}</h1><span class="sc-rec">Aperçu Créateur · invisible pour les joueurs</span></header>
      <nav class="cx-tabs2" aria-label="Codex et Échoppe">${[['codex', 'Le Codex', 'Paliers de la saison', 'book'], ['shop', 'L’Échoppe', 'Cosmétiques', 'obsidienne']].map(([k, l, sub, ic]) => `<button class="cx-tab2 t-${k}" data-cx="tab" data-v="${k}" aria-pressed="${ui.tab === k}"><img alt="" src="assets/icons/${ic}.webp"><span><b>${l}</b><small>${sub}</small></span></button>`).join('')}</nav>
      ${ui.tab === 'shop' ? shopTab() : codexTab()}
      ${devTab()}`;
    if (ui.tab !== 'shop' && !ui.scrolled) { ui.scrolled = true; requestAnimationFrame(() => document.getElementById('cx-now')?.scrollIntoView({ block: 'center' })); }
  }


  /* v474 : dépense d'obsidiennes (catalogue ou Codex enluminé) ; renvoie vrai si l'achat est fait */
  async function buy(id) {
    const it = CATALOG.find((x) => x.id === id), cost = g.catalogCost(it.id);
    const label = it.name || ALL_FRAMES[it.id] || CODEX_BACKS[it.id] || PLATES[it.id] || SACHETS[it.id] || TAPIS[it.id] || FONDS[it.id] || (EMOTES[it.id] && `${EMOTES[it.id].name} · « ${EMOTES[it.id].text} »`) || (FINISHES[it.id] && `Finition ${FINISHES[it.id].name}`); /* v574 : nom des plaques, sachets et réactions */
    if (g.obs() < cost) {
      if (await confirmBox(t('Il te manque <b>{n} obsidiennes</b> pour {name}.', { n: fmt(cost - g.obs()), name: esc(tx(label)) }), { ok: 'Obtenir des obsidiennes' }) /* v574 : phrase traduite (le nom change à chaque objet) */) { ui.tab = 'shop'; ui.cat = 'obs'; draw(); }
      return false;
    }
    if (!(await confirmBox(t('Échanger <b>{n} obsidiennes</b> contre {name} ?', { n: fmt(cost), name: esc(tx(label)) }), { ok: 'Confirmer' }))) return false;
    g.catalogBuy(it.id);
    app.sfx.levelup?.(); toast(`${t('{name} : acquis.', { name: esc(tx(label)) })}${it?.kind === 'finish' ? ' Pose-la sur tes cartes dans Profil › Personnaliser.' : it?.kind === 'emote' || it?.give?.emotes ? ' Envoie-la pendant tes parties en ligne.' : it?.kind === 'plate' ? ' Choisis-la dans Profil › Personnaliser.' : it ? ' Choisis-le dans Profil › Personnaliser.' : ''}`, { kind: 'success', icon: 'star' });
    return true;
  }

  /* v640 : aperçu refait (« la page est fade et moche ») : une vitrine éclairée à la couleur de la rareté, l'objet en grand qui flotte,
     flèches et points pour passer d'un objet à l'autre, puis l'objet « en situation » (profil, classement, partie, ouverture…)
     avec la bascule « Avec cet objet / Mon actuel », les endroits où on le verra, et le pied d'achat ou d'équipement.
     start : un objet (Échoppe ou récompense du Codex) ; list : les objets entre lesquels on navigue (rayon, saison, palier). */
  function preview(start, list = null) {
    let items = (list || [start]).map((x) => (typeof x === 'string' ? CATALOG.find((c) => c.id === x) : x)).filter(Boolean);
    let at = Math.max(0, items.findIndex((x) => x === start || (typeof start === 'string' ? x.id === start : x.id === start?.id && x.kind === start?.kind)));
    if (!items.length) return;
    const s = g.s, av = cat.get(g.shownAvatar());
    const avImg = av ? `<img alt="" src="${artUrl(av, { lite: true })}">` : EMBLEM;
    const mine = g.bestCards(6).filter(Boolean);
    let mode = 'with', pick = 0, plain = false, bare = false, stopTilt = null;
    const it = () => items[at];
    /* le profil, avec ou sans l'objet (la bascule « Mon actuel » montre ce que tu portes aujourd'hui) */
    const look = () => { const o = it(), w = mode === 'with';
      return { frame: w && o.kind === 'frame' ? o.id : s.frame, plate: w && o.kind === 'plate' ? o.id : s.plate, fond: w && o.kind === 'fond' ? o.id : s.fond,
        title: w && o.kind === 'title' ? o.id : s.title, back: w && o.kind === 'back' ? o.id : s.back, sachet: w && o.kind === 'sachet' ? o.id : s.sachet,
        mat: w && o.kind === 'mat' ? o.id : s.mat }; };
    const profMock = (L) => `<div class="pv2-prof ${L.fond ? 'has-fond' : ''}"${fondStyle(L.fond)}><span class="avatar-big pf pf-${L.frame}">${avImg}</span>
        <div class="pv2-prof-t"><b>${withPlate(L.plate, esc(myName()))}</b><span class="pv2-ttl">${esc(L.title || '')}</span><small>Niveau ${g.levelInfo().level}</small></div></div>`;
    const lbMock = (L) => `<div class="lb-row pv2-lb"><span class="lb-rank">1</span><span class="lb-av pf pf-${L.frame}">${avImg}</span><span class="lb-name"><b>${withPlate(L.plate, esc(myName()))}</b><span class="small muted">${esc(L.title || '')}</span></span><span class="lb-floor">412 pts</span></div>`;
    const seatMock = (L) => `<div class="pv2-seat"><span class="avatar-mini pf pf-${L.frame}">${avImg}</span><b>${withPlate(L.plate, esc(myName()))}</b><small>à toi de jouer</small></div>`;
    const backOf = (k) => (k ? `assets/backs/${k}.webp` : 'assets/backs/back.webp');
    const matOf = (k) => (k ? `assets/tapis/${k}.webp` : 'assets/sceaux/plateau.webp');
    const board = (k) => `<div class="cx-pv-board"><div class="sc-board" ${k ? `data-pmat="${k}"` : ''}><div class="sc-plate">${Array.from({ length: 9 }, (_, i) => { const c = [0, 4, 8].includes(i) ? mine[[0, 4, 8].indexOf(i)] : null; return `<span class="sc-cell ${i === 4 && !c ? 'heart' : ''}">${c ? `<img class="cx-pv-sc" alt="" src="${artUrl(c, { lite: true })}">` : ''}</span>`; }).join('')}</div></div></div>`;
    /* l'objet en grand, au centre de la vitrine */
    const hero = (o) => {
      if (o.kind === 'frame') return `<span class="avatar-big pf pf-${o.id} pv2-big-av">${avImg}</span>`;
      if (o.kind === 'back') return `<img class="pv2-big-back" alt="" src="${backOf(o.id)}">`;
      if (o.kind === 'sachet') return `<span class="pv2-big-pack">${packHTML('standard', null, { skin: o.id })}</span>`;
      if (o.kind === 'plate') return `<span class="np np-${o.id} pv2-big-np">${esc(myName())}</span>`;
      if (o.kind === 'mat') return `<img class="pv2-big-mat" alt="" src="${matOf(o.id)}">`;
      if (o.kind === 'fond') return `<span class="pv2-big-fond has-fond"${fondStyle(o.id)}><span class="avatar-mini pf pf-${s.frame}">${avImg}</span></span>`;
      if (o.kind === 'emote') return `<span class="pv2-big-emote">${emoteHTML(o.id)}</span>`;
      if (o.kind === 'title') return `<span class="pv2-big-title">${picon('titles')}<b>« ${esc(o.id)} »</b></span>`;
      if (o.give?.emotes) return `<span class="re-fan pv2-big-fan">${o.give.emotes.slice(0, 5).map((k) => `<span class="re-pic">${emotePic(k)}</span>`).join('')}</span>`;
      if (o.give?.backs) return `<span class="cx-fan pv2-big-fan">${o.give.backs.slice(0, 5).map((b) => `<img alt="" src="assets/backs/${b}.webp">`).join('')}</span>`;
      return picOf(o, true);
    };
    /* où on le verra */
    const WHERE = { frame: ['Profil', 'Barre du haut', 'Classements', 'Parties en ligne', 'Fiche vue par les autres'], plate: ['Profil', 'Classements', 'Parties en ligne', 'Fiche vue par les autres'],
      fond: ['Profil', 'Fiche vue par les autres'], title: ['Profil', 'Classements', 'Fiche vue par les autres'], back: ['Ouverture des boosters', 'Cartes face cachée', 'Jeux de cartes'],
      sachet: ['Boutique des boosters', 'Ouverture', 'Pari des Boosters'], mat: ['Duels des Sceaux', 'Duels en ligne'], emote: ['Parties en ligne'] };
    /* l'objet en situation */
    const scenes = (o) => { const L = look();
      if (['frame', 'plate', 'fond', 'title'].includes(o.kind)) return `<p class="pv2-cap">Ton profil</p>${profMock(L)}
          ${o.kind !== 'fond' ? `<p class="pv2-cap">Au classement</p>${lbMock(L)}` : ''}${['frame', 'plate'].includes(o.kind) ? `<p class="pv2-cap">En partie en ligne, chez ton adversaire</p>${seatMock(L)}` : ''}`;
      if (o.kind === 'back') return `<p class="pv2-cap">À l'ouverture d'un booster</p><div class="cx-pv-fan pv2-fan">${[0, 1, 2].map(() => `<img alt="" src="${backOf(L.back)}">`).join('')}</div>`;
      if (o.kind === 'sachet') return `<p class="pv2-cap">Dans la boutique des boosters (au choix : standard ou premium)</p><div class="cx-pv-packs">${['standard', 'premium'].map((t) => packHTML(t, null, { skin: L.sachet || null })).join('')}</div>`;
      if (o.kind === 'mat') return `<p class="pv2-cap">Ton plateau des Duels des Sceaux</p>${board(L.mat)}`;
      if (o.kind === 'emote') return `<p class="pv2-cap">Chez ton adversaire, pendant une partie en ligne</p><div class="pv2-emote-scene">${seatMock(L)}<div class="re-bubble demo on">${emoteHTML(o.id)}<small>${esc(myName())}</small></div></div>`;
      if (o.give?.emotes) return `<p class="pv2-cap">Les réactions du lot</p><div class="re-grid">${o.give.emotes.map((k) => `<span class="re-pick">${emoteHTML(k)}</span>`).join('')}</div>`;
      if (o.give?.backs) return `<p class="pv2-cap">Les dos du lot</p><div class="cx-pv-grid">${o.give.backs.map((b) => `<figure><img alt="" src="assets/backs/${b}.webp"><figcaption>${esc((CODEX_BACKS[b] || b).replace('Dos du royaume ', ''))}</figcaption></figure>`).join('')}</div>`;
      if (o.kind === 'finish') { const lst = mine.length ? mine : [cat.get('ABY-039')], c = lst[pick % lst.length];
        return `<div class="cx-pvf-stage"><div class="detail-card cx-pvf-card">${cardHTML(c, { size: 'full', variant: 'normal', dress: plain ? null : o.id })}</div></div>`; }
      return '';
    };
    const toggle = (o) => (['frame', 'plate', 'fond', 'title', 'back', 'sachet', 'mat'].includes(o.kind) ? `<div class="pv2-seg" role="group" aria-label="Comparer"><button class="${mode === 'with' ? 'on' : ''}" data-pv="mode" data-v="with">${icon('star')}Avec cet objet</button><button class="${mode === 'now' ? 'on' : ''}" data-pv="mode" data-v="now">Mon actuel</button></div>` : '');
    const foot = (o) => { const own = ownedOf(o), on = own && worn(o);
      const wearBtn = own && wearable(o) && !on ? `<button class="btn primary pv2-buy" data-pv="wear">${icon('check')}Équiper</button>` : '';
      if (o.season) return `<div class="pv2-foot">${own ? (wearBtn || `<span class="cx-badge on">${icon('check')}${on ? 'Équipé' : 'Déjà à toi'}</span>`) : `<span class="pv2-src">${icon('star')}<span><b>Voie enluminée · palier ${o.tier}</b><small>Introuvable à l’Échoppe</small></span></span>`}</div>`;
      const cost = g.catalogCost(o.id);
      return `<div class="pv2-foot">${own ? (wearBtn || `<span class="cx-badge on">${icon('check')}${on ? 'Équipé' : 'Déjà à toi'}</span>`) : `<button class="btn primary pv2-buy" data-pv="buy">Acheter · ${obsTxt(cost)}</button><small class="muted">Tu as ${obsTxt(g.obs())}</small>`}</div>`; };
    const sh = openSheet('', { label: 'Aperçu', full: true, cls: 'cx-pv pv2', onClose: () => stopTilt?.() });
    const paint = () => {
      stopTilt?.();
      const o = it(), r = o.season ? 'season' : rank(o), n = items.length, nm = nameOf(o);
      const fam = o.kind === 'title' ? 'Titre' : KINDS[kindOf(o)]?.[1] || '';
      const dots = n > 1 && n <= 12 ? `<span class="pv2-dots">${items.map((_, i) => `<i class="${i === at ? 'on' : ''}"></i>`).join('')}</span>` : n > 1 ? `<small class="pv2-pos">${at + 1} / ${n}</small>` : '';
      sh.setContent(`<section class="pv2-stage r-${r} k-${o.kind}">
          <span class="pv2-ray"></span><span class="pv2-dust"></span>
          <p class="pv2-kick"><span>${esc(fam)}</span><b class="pv2-rk">${o.season ? `Codex · palier ${o.tier}` : RANK[r]}</b></p>
          <div class="pv2-show">${n > 1 ? `<button class="pv2-nav prev" data-pv="nav" data-d="-1" aria-label="Précédent">${icon('prev')}</button>` : ''}
            <div class="pv2-obj">${hero(o)}</div><span class="pv2-ped"></span>
            ${n > 1 ? `<button class="pv2-nav next" data-pv="nav" data-d="1" aria-label="Suivant">${icon('next')}</button>` : ''}</div>
          <h2 class="pv2-name">${esc(nm)}</h2>${dots}
          ${o.desc ? `<p class="pv2-desc">${esc(o.desc)}</p>` : KINDS[kindOf(o)] ? `<p class="pv2-desc">${esc(KINDS[kindOf(o)][2])}</p>` : ''}
        </section>
        <section class="pv2-body">${toggle(o)}<div class="pv2-scenes">${scenes(o)}</div>
          ${WHERE[o.kind] ? `<p class="pv2-cap">Où on le verra</p><div class="pv2-where">${WHERE[o.kind].map((w) => `<span>${esc(w)}</span>`).join('')}</div>` : ''}</section>
        ${foot(o)}`);
      const dc = sh.body.querySelector('.cx-pvf-card'); stopTilt = dc ? enableTilt(dc, { reduced: app.reduced?.() }) : null;
      if (bare) dc?.querySelector('.tcg')?.classList.add('art-only');
    };
    paint();
    sh.body.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-pv]'); if (!b) return;
      const o = it(), v = b.dataset.pv;
      if (v === 'mode') { mode = b.dataset.v; app.sfx.tap?.(); paint(); return; }
      if (v === 'nav') { at = (at + +b.dataset.d + items.length) % items.length; mode = 'with'; pick = 0; plain = false; bare = false; app.sfx.tap?.(); paint(); sh.el.scrollTo?.({ top: 0 }); return; }
      if (v === 'buy') { try { if (await buy(o.id)) { paint(); app.chrome?.(); draw(); } } catch (err) { toast(esc(err.message), { kind: 'error' }); } }
      if (v === 'wear') { wear(o); app.sfx.tap?.(); toast(t('{name} : équipé.', { name: esc(tx(nameOf(o))) }), { kind: 'success', icon: 'check' }); paint(); draw(); }
    });
    /* glisser du doigt dans la vitrine = objet suivant ou précédent */
    let sx = null;
    sh.body.addEventListener('pointerdown', (e) => { sx = e.target.closest('.pv2-stage') ? e.clientX : null; }, { passive: true });
    sh.body.addEventListener('pointerup', (e) => { if (sx == null || items.length < 2) return; const d = e.clientX - sx; sx = null; if (Math.abs(d) > 50) { at = (at + (d < 0 ? 1 : -1) + items.length) % items.length; mode = 'with'; app.sfx.tap?.(); paint(); } }, { passive: true });
  }

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-cx]'); if (!b) return;
    const k = b.dataset.cx;
    try {
      if (k === 'tab') { ui.tab = b.dataset.v; app.sfx.tap?.(); return draw(); }
      if (k === 'claim') { g.codexClaim(b.dataset.tr, +b.dataset.t); app.sfx.chest?.(); toast('Récompense du Codex récupérée.', { kind: 'success', icon: 'star' }); }
      if (k === 'all') { const got = g.codexClaimAll(); app.sfx.chest?.(); toast(`${got.length} récompense${got.length > 1 ? 's' : ''} du Codex récupérée${got.length > 1 ? 's' : ''}.`, { kind: 'success', icon: 'star' }); }
      if (k === 'buy') {
        const it = SHOP.find((x) => x.id === b.dataset.id);
        if (!(await confirmBox(`<b>Achat simulé</b> : ${esc(it.name)} (${esc(it.price)}).<br>Aperçu Créateur : aucun paiement, l'achat est simplement ajouté à ton profil.`, { ok: 'Simuler l’achat' }))) return;
        g.shopBuy(it.id); app.sfx.levelup?.(); toast(`${esc(it.name)} : acquis (achat simulé).`, { kind: 'success', icon: 'star' });
      }
      if (k === 'jump') { ui.cat = 'obs'; draw(); return; }
      if (k === 'founder') { app.sfx.tap?.(); founder(); return; } /* v637 */
      if (k === 'cat') { ui.cat = b.dataset.v || null; ui.rar = null; app.sfx.tap?.(); draw(); root.querySelector('.cxs-wallet')?.scrollIntoView({ block: 'start' }); return; }
      if (k === 'rar') { ui.rar = b.dataset.v || null; app.sfx.tap?.(); return draw(); } /* v636 */
      if (k === 'hide') { ui.hideOwned = !ui.hideOwned; app.sfx.tap?.(); return draw(); }
      if (k === 'see') { /* v484, v636 : on passe d'un objet à l'autre dans le rayon ouvert */
        const it = CATALOG.find((x) => x.id === b.dataset.id); const ids = it ? [...root.querySelectorAll('[data-cx="see"]')].map((x) => x.dataset.id).filter((v, i, a) => a.indexOf(v) === i) : null;
        preview(it || b.dataset.id, ids); return; }
      if (k === 'seez') { const tr = tiersOf(g.codex().season)[+b.dataset.t - 1]; const l = seasonItems(tr?.prem, +b.dataset.t, true); if (l.length) preview(l[0], l); return; } /* v640 : toutes les récompenses du palier */
      if (k === 'seel') { const l = ui.loot || []; if (l[+b.dataset.i]) preview(l[+b.dataset.i], l); return; } /* v640 : vitrine de la saison */
      if (k === 'unlock') { /* v548 : 4,99 € (achat simulé tant que l'App Store n'est pas branché) */
        if (!(await confirmBox(`<b>Achat simulé</b> : ${esc(CODEX.premiumName)} (${esc(CODEX.price)}).<br>Aperçu Créateur : aucun paiement, la voie enluminée est simplement débloquée.`, { ok: 'Simuler l’achat' }))) return;
        g.shopBuy('codex'); app.sfx.levelup?.(); toast(`${esc(CODEX.premiumName)} : débloqué (achat simulé).`, { kind: 'success', icon: 'star' });
      }
      if (k === 'get') { if (!(await buy(b.dataset.id))) return; }
      /* v539 : outils d'essai passés par le serveur de partie (refusés sans le badge Créateur) */
      if (k === 'obs') await app.partie.first('devObs', 1000);
      if (k === 'obs0') await app.partie.first('devObs', null);
      if (k === 'restore') toast('« Restaurer mes achats » marchera avec l’App Store, quand les achats seront ouverts.', { icon: 'info' });
      if (k === 'xp') await app.partie.first('devCodexXp', +b.dataset.v);
      if (k === 'prem') await app.partie.first('devCodexPrem');
      if (k === 'reset') { if (!(await confirmBox('Remettre le Codex à zéro (points, récompenses récupérées, voie enluminée) ? Les objets déjà gagnés restent.', { ok: 'Remettre à zéro' }))) return; await app.partie.first('devCodexReset'); }
    } catch (err) { toast(esc(err.message), { kind: 'error' }); return; }
    app.chrome?.(); draw();
  });
  draw();
}
