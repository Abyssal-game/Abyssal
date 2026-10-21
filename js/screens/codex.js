// v470 : ÉBAUCHE du pass de saison (« Le Codex de l'Abîme ») et de la boutique en argent réel (« L'Échoppe »).
// Visible seulement en Mode Créateur (option « Codex et Échoppe ») ; les achats sont simulés (aucun paiement).
import { CODEX, CODEX_XP, CODEX_XP_LABEL, tiersOf, seasonByKey, CODEX_FRAMES, CODEX_BACKS, FINISHES, PLATES, EMOTES, SACHETS, SHOP, CATALOG, OBS, codexTier, tierProgress, claimable, freshCodex } from '../core/codex.js';
import { FRAMES } from '../config.js';
import { CHESTS } from '../core/descent.js';
import { icon, picon } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, openSheet } from '../ui/dom.js';
import { cardHTML, enableTilt } from '../ui/card.js';
import { artUrl } from '../art/assets.js';
import { EMBLEM } from '../ui/icons.js';
import { setScene } from '../ui/scene.js';
import { emoteHTML, emotePic } from '../ui/vitrine.js'; /* v564 : plaques de pseudo et réactions en ligne */
import { sync } from '../cloud/sync.js';

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
  const rank = (it) => { const c = it.cost || 0; return it.kind === 'bundle' ? 'leg' : c >= 450 ? 'myth' : c >= 250 ? 'leg' : c >= 180 ? 'epic' : 'rare'; };
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
    if (r.finish) items.push([`<span class="cx-fin cxr-fin"><img alt="" src="assets/art/lite/${esc(g.bestCards(1)[0]?.id || 'ABY-039')}.webp"><img alt="" src="assets/variants/${r.finish}-frame.webp" onerror="this.remove()"></span>`, '', `Finition ${esc(FINISHES[r.finish]?.name || r.finish)}`]);
    if (r.title) items.push([`<span class="cxr-ic">${picon('titles')}</span>`, 'Titre', `« ${esc(r.title)} »`]);
    if (r.obs) items.push([`<span class="cxr-ic">${OBS_I}</span>`, `+${fmt(r.obs)}`, esc(OBS.name.toLowerCase())]);
    return items.map(([v, n, l]) => `<span class="cxr">${v}<span class="cxr-t">${n ? `<b>${n}</b>` : ''}<small>${l}</small></span></span>`).join('');
  };

  function codexTab() {
    const c = g.codex(), t = codexTier(c), n = claimable(c), max = t >= CODEX.tiers;
    const cell = (tier, tr, r) => {
      if (!r) return `<div class="cxk-c ${tr} void"></div>`;
      const got = c[tr].includes(tier), lockedPrem = tr === 'prem' && !c.premium, reached = tier <= t;
      const state = got ? 'got' : !reached ? 'far' : lockedPrem ? 'lock' : 'ready';
      return `<div class="cxk-c ${tr} ${state}" ${state === 'ready' ? `data-cx="claim" data-tr="${tr}" data-t="${tier}" role="button" tabindex="0"` : ''}>${rwBig(r)}
        ${state === 'ready' ? '<span class="cxk-go">Récupérer</span>' : state === 'got' ? `<span class="cxk-ok">${icon('check')}</span>` : state === 'lock' ? `<span class="cxk-lk">${icon('lock')}</span>` : ''}</div>`;
    };
    const se = g.codexSeason(), best = se.best; /* v550 : les plus belles pièces de la saison */
    const pitch = c.premium ? '' : `<section class="cx-pitch">
        ${opt('assets/ui/cx-enlumine.webp', 'cx-pitch-art')}
        <div class="cx-pitch-in"><small class="cx-kick">Voie enluminée</small><h2>${esc(CODEX.premiumName)}</h2>
          <p>${esc(se.pitch)}</p>
          <div class="cx-pitch-show">${best.map((k) => k.startsWith('dos') ? `<img class="cxr-back" alt="" src="assets/backs/${k}.webp" onerror="this.remove()">` : `<span class="avatar-mini pf pf-${k}">${myAv()}</span>`).join('')}</div>
          <button class="btn dc-plq dc-plq-red cx-unlock2" data-cx="unlock">${icon('star')}<span>Débloquer</span><b class="cx-eur">${esc(CODEX.price)}</b></button></div></section>`;
    return `<section class="cx-season">
        ${opt(se.art, 'cx-season-art')}
        <div class="cx-season-in"><small class="cx-kick">Du ${esc(se.starts.split('-').reverse().join('/'))} au ${esc(se.ends.split('-').reverse().join('/'))}${g.codexLive() ? '' : ' · bientôt'}</small>
          <h2>${esc(se.title)}</h2>
          ${(() => { const p = g.s.codexPast, old = p && seasonByKey(p.season); return old && p.day >= se.starts ? `<p class="small cx-past">${icon('check')} Fin de la ${esc(old.title)} : ${p.n} récompense${p.n > 1 ? 's' : ''} oubliée${p.n > 1 ? 's' : ''} t’${p.n > 1 ? 'ont' : 'a'} été donnée${p.n > 1 ? 's' : ''}.</p>` : ''; })()}
          <div class="cx-season-row"><span class="cx-medal"><b>${t}</b><small>/ ${CODEX.tiers}</small></span>
            <span class="cx-season-p"><span>${max ? 'Codex terminé pour cette saison !' : `Palier ${t + 1} · ${c.xp % CODEX.xpPerTier} / ${CODEX.xpPerTier} points`}</span><span class="cx-bar2"><i style="width:${Math.round(tierProgress(c) * 100)}%"></i></span></span></div>
          ${c.premium ? `<span class="cx-badge on">${icon('star')}${esc(CODEX.premiumName)} acquis</span>` : ''}</div></section>
      ${n ? `<button class="btn primary block dc-plq dc-plq-red cx-all" data-cx="all">${icon('chest')}Tout récupérer (${n})</button>` : ''}
      ${pitch}
      <div class="cxk-head"><span>Voie de l'Abîme<small>gratuite</small></span><span></span><span class="prem">Voie enluminée<small>${c.premium ? 'à toi' : 'à débloquer'}</small></span></div>
      <ol class="cxk">${tiersOf(c.season).map((x) => `<li class="cxk-r ${x.tier <= t ? 'reached' : ''} ${x.tier === t + 1 ? 'next' : ''} ${x.tier === CODEX.tiers ? 'ult' : ''}" ${x.tier === Math.min(CODEX.tiers, t + 1) ? 'id="cx-now"' : ''}>${cell(x.tier, 'free', x.free)}<span class="cxk-n">${x.tier}</span>${cell(x.tier, 'prem', x.prem)}</li>`).join('')}</ol>
      <details class="panel dc-fold"><summary>${picon('help')}<span class="dc-sum-t">Gagner des points de Codex</span></summary>
        <ul class="cx-xp">${Object.entries(CODEX_XP).map(([k, v]) => `<li><span>${esc(CODEX_XP_LABEL[k])}</span><b>+${v}</b><small class="muted">${fmt(c.log[k] || 0)} gagnés</small></li>`).join('')}</ul>
        <p class="small muted">La voie de gauche se gagne en jouant. La voie enluminée s’achète une fois par saison : une récompense à chaque palier, sur le thème de la saison, jamais en vente à l’Échoppe et jamais de puissance.</p></details>`;
  }

  function shopTab() {
    const have = g.obs();
    const name = (it) => it.name || (it.kind === 'frame' ? ALL_FRAMES[it.id] : it.kind === 'finish' ? `Finition ${FINISHES[it.id].name}` : it.kind === 'plate' ? PLATES[it.id] : it.kind === 'emote' ? EMOTES[it.id].name : CODEX_BACKS[it.id]) || it.id;
    const pic = (it, big = false) => it.kind === 'frame' ? `<span class="${big ? 'avatar-big' : 'avatar-mini'} pf pf-${it.id}">${myAv()}</span>`
      : it.kind === 'back' ? `<img class="cx-bk" alt="" src="assets/backs/${it.id}.webp">`
      : it.kind === 'finish' ? (big ? cardHTML(g.bestCards(1)[0] || cat.get('ABY-039'), { dress: it.id }) : `<span class="cx-fin"><img alt="" src="assets/art/lite/ABY-039.webp"><img alt="" src="assets/variants/${it.id}-frame.webp"></span>`)
      : it.kind === 'plate' ? `<span class="np np-${it.id} np-demo">${esc(myName())}</span>`
      : it.kind === 'emote' ? `<span class="re-tile">${emoteHTML(it.id)}</span>`
      : it.give.emotes ? `<span class="re-fan">${it.give.emotes.slice(0, 4).map((k) => `<span class="re-pic">${emotePic(k)}</span>`).join('')}</span>`
      : `<span class="cx-fan">${it.give.backs.slice(0, 4).map((b) => `<img alt="" src="assets/backs/${b}.webp">`).join('')}</span>`;
    const tile = (it) => { const own = g.catalogOwned(it.id), cost = g.catalogCost(it.id), r = rank(it);
      return `<button class="cxs-t r-${r} ${it.kind} ${own ? 'own' : ''}" data-cx="see" data-id="${it.id}"><span class="cxs-pic">${pic(it)}</span><span class="cxs-rk">${RANK[r]}</span><b>${esc(name(it))}</b>
        ${own ? `<span class="cxs-own">${icon('check')}Possédé</span>` : `<span class="cxs-pr ${cost <= have ? '' : 'short'}">${obsTxt(cost)}</span>`}</button>`; };
    const CATS = [['frame', 'Cadres'], ['plate', 'Plaques'], ['back', 'Dos'], ['finish', 'Finitions'], ['emote', 'Réactions'], ['bundle', 'Lots'], ['obs', OBS.name]];
    const cur = ui.cat || 'frame';
    const list = CATALOG.filter((x) => x.kind === cur).slice().sort((a, b) => (g.catalogOwned(a.id) - g.catalogOwned(b.id)) || (b.cost - a.cost));
    /* à la une : un bel objet par semaine (le même pour tous), pas encore possédé */
    const week = Math.floor(g.clock().getTime() / 864e5 / 7);
    const stars = CATALOG.filter((x) => x.kind !== 'bundle' && x.cost >= 700 && !g.catalogOwned(x.id));
    const hero = stars.length ? stars[week % stars.length] : null;
    const heroHTML = hero ? `<section class="cxs-hero r-${rank(hero)} ${hero.kind}">${opt('assets/ui/ech-vitrine.webp', 'cxs-hero-bg')}
        <small class="cx-kick">À la une cette semaine</small>
        <button class="cxs-hero-pic" data-cx="see" data-id="${hero.id}">${pic(hero, true)}</button>
        <b class="cxs-hero-n">${esc(name(hero))}</b><span class="cxs-rk">${RANK[rank(hero)]}</span>
        <div class="cxs-hero-f"><button class="btn small ghost" data-cx="see" data-id="${hero.id}">${icon('eye')}Aperçu</button><button class="btn small primary" data-cx="get" data-id="${hero.id}">${obsTxt(g.catalogCost(hero.id))}</button></div></section>` : '';
    const euro = (it, i) => { const own = it.once && g.shopOwned(it.id); const art = it.kind === 'obs' ? `assets/ui/obs-${Math.min(4, i + 1)}.webp` : 'assets/ui/ech-fondateur.webp';
      return `<article class="cxs-e ${it.kind === 'obs' ? 'obs' : 'founder'} ${own ? 'own' : ''}">${opt(art, 'cxs-e-art')}
        <div class="cxs-e-in"><b>${it.kind === 'obs' ? obsTxt(it.give.obs) : esc(it.name)}</b>${it.bonus ? `<span class="cx-bonus">+${it.bonus} offertes</span>` : ''}
        ${it.desc ? `<small>${esc(it.desc)}</small>` : ''}</div>
        ${own ? `<span class="cxs-own">${icon('check')}Possédé</span>` : `<button class="btn primary small" data-cx="buy" data-id="${it.id}">${esc(it.price)}</button>`}</article>`; };
    let obsI = 0;
    return `<section class="cxs-wallet"><span class="cxs-w-n">${obsTxt(have)}</span><span class="small">${esc(OBS.name)} · seulement pour des cosmétiques</span>
        <button class="btn small primary" data-cx="cat" data-v="obs">Obtenir</button></section>
      ${cur !== 'obs' ? heroHTML : ''}
      <div class="cxs-cats" role="tablist">${CATS.map(([k, l]) => `<button class="cxs-cat ${k === cur ? 'on' : ''}" data-cx="cat" data-v="${k}" role="tab" aria-selected="${k === cur}">${l}</button>`).join('')}</div>
      ${cur === 'obs' ? `<div class="cxs-euro" id="cx-euro">${SHOP.filter((it) => it.kind !== 'codex').map((it) => euro(it, it.kind === 'obs' ? obsI++ : 0)).join('')}</div>
        <button class="btn ghost block" data-cx="restore">Restaurer mes achats</button>
        <p class="small muted center">Pendant l'aperçu, tout achat en euros est simulé : aucun paiement. Rien ici ne rend tes créatures plus fortes.</p>`
      : `<div class="cxs-grid ${cur}">${list.map(tile).join('')}</div>
        ${cur === 'finish' ? '<p class="small muted center">Une finition achetée se pose sur autant de cartes que tu veux, une par carte. Elle ne change rien à leurs valeurs.</p>' : ''}`}`;
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
      <div class="seg cx-seg" role="group">${[['codex', 'Le Codex'], ['shop', 'L’Échoppe']].map(([k, l]) => `<button class="seg-b" data-cx="tab" data-v="${k}" aria-pressed="${ui.tab === k}">${l}</button>`).join('')}</div>
      ${ui.tab === 'shop' ? shopTab() : codexTab()}
      ${devTab()}`;
    if (ui.tab !== 'shop' && !ui.scrolled) { ui.scrolled = true; requestAnimationFrame(() => document.getElementById('cx-now')?.scrollIntoView({ block: 'center' })); }
  }


  /* v474 : dépense d'obsidiennes (catalogue ou Codex enluminé) ; renvoie vrai si l'achat est fait */
  async function buy(id) {
    const it = CATALOG.find((x) => x.id === id), cost = g.catalogCost(it.id);
    const label = it.name || ALL_FRAMES[it.id] || CODEX_BACKS[it.id] || (FINISHES[it.id] && `Finition ${FINISHES[it.id].name}`);
    if (g.obs() < cost) {
      if (await confirmBox(`Il te manque <b>${fmt(cost - g.obs())} obsidiennes</b> pour ${esc(label)}.`, { ok: 'Obtenir des obsidiennes' })) { ui.tab = 'shop'; ui.cat = 'obs'; draw(); }
      return false;
    }
    if (!(await confirmBox(`Échanger <b>${fmt(cost)} obsidiennes</b> contre ${esc(label)} ?`, { ok: 'Confirmer' }))) return false;
    g.catalogBuy(it.id);
    app.sfx.levelup?.(); toast(`${esc(label)} : acquis.${it?.kind === 'finish' ? ' Pose-la sur tes cartes dans Profil › Personnaliser.' : it?.kind === 'emote' || it?.give?.emotes ? ' Envoie-la pendant tes parties en ligne.' : it?.kind === 'plate' ? ' Choisis-la dans Profil › Personnaliser.' : it ? ' Choisis-le dans Profil › Personnaliser.' : ''}`, { kind: 'success', icon: 'star' });
    return true;
  }

  /* v484 : aperçu « en vrai » d'un objet de l'Échoppe, avant de l'acheter */
  function preview(id) {
    const it = CATALOG.find((x) => x.id === id); if (!it) return;
    const s = g.s, av = s.avatar && cat.get(s.avatar);
    const avImg = av ? `<img alt="" src="${artUrl(av, { lite: true })}">` : EMBLEM;
    const mine = g.bestCards(6).filter(Boolean);
    let pick = 0, plain = false, bare = false, stopTilt = null;
    const nm = it.name || ALL_FRAMES[it.id] || CODEX_BACKS[it.id] || PLATES[it.id] || (EMOTES[it.id] && `${EMOTES[it.id].name} · « ${EMOTES[it.id].text} »`) || (FINISHES[it.id] && `Finition ${FINISHES[it.id].name}`);
    const body = () => {
      if (it.kind === 'frame') return `<p class="cx-pv-cap">Sur ton profil</p>
        <div class="cx-pv-prof"><span class="avatar-big pf pf-${it.id}">${avImg}</span><div><b>${esc(s.name || 'Ton nom')}</b><span>${esc(s.title)}</span></div></div>
        <p class="cx-pv-cap">En haut de l'écran et au classement</p>
        <div class="cx-pv-bar"><span class="top-avatar pf pf-${it.id}">${avImg}</span><b>${esc(s.name || 'Toi')}</b><span class="cx-pv-rank"><i>1</i><span class="avatar-mini pf pf-${it.id}">${avImg}</span>${esc(s.name || 'Toi')}<em>étage ${g.descent().best || 0}</em></span></div>
        <p class="cx-pv-cap">À côté de ton cadre actuel</p>
        <div class="cx-pv-vs"><div><span class="avatar-mini pf pf-${s.frame}">${avImg}</span><small>Actuel</small></div><div><span class="avatar-mini pf pf-${it.id}">${avImg}</span><small>${esc(nm)}</small></div></div>`;
      if (it.kind === 'back') return `<p class="cx-pv-cap">Le dos de toutes tes cartes face cachée</p>
        <div class="cx-pv-back"><img alt="" src="assets/backs/${it.id}.webp"></div>
        <p class="cx-pv-cap">À l'ouverture d'un booster</p>
        <div class="cx-pv-fan">${[0, 1, 2].map(() => `<img alt="" src="assets/backs/${it.id}.webp">`).join('')}</div>
        <p class="cx-pv-cap">À côté de ton dos actuel</p>
        <div class="cx-pv-vs"><div><img class="cx-pv-sm" alt="" src="${s.back ? `assets/backs/${s.back}.webp` : 'assets/backs/back.webp'}"><small>Actuel</small></div><div><img class="cx-pv-sm" alt="" src="assets/backs/${it.id}.webp"><small>${esc(nm)}</small></div></div>`;
      if (it.kind === 'finish') { /* v488 : aperçu refait : grande carte inclinable, avant / après, choix de la carte, texte masqué au toucher */
        const list = mine.length ? mine : [cat.get('ABY-039')], c = list[pick % list.length];
        return `<div class="cx-pvf-stage">
            <div class="detail-card cx-pvf-card">${cardHTML(c, { size: 'full', variant: 'normal', dress: plain ? null : it.id })}</div>
            <p class="cx-pvf-hint">${icon('eye')}Touche la carte pour ${bare ? 'remettre le texte' : 'voir l’illustration seule'} · fais-la pivoter du doigt</p>
          </div>
          <div class="cx-pvf-seg" role="group" aria-label="Comparer">
            <button class="${plain ? 'on' : ''}" data-pv="plain">Sans finition</button><button class="${plain ? '' : 'on'}" data-pv="dress">${esc(FINISHES[it.id]?.name || 'Finition')}</button>
          </div>
          ${list.length > 1 ? `<p class="cx-pv-cap">Choisis la carte</p>
          <div class="cx-pvf-pick">${list.map((x, i) => `<button class="${i === pick % list.length ? 'on' : ''}" data-pv="pick" data-i="${i}" aria-label="${esc(x.name)}">${cardHTML(x, { dress: it.id })}</button>`).join('')}</div>` : ''}
          <p class="cx-pvf-note">Achetée une fois, la finition se pose sur autant de cartes que tu veux, depuis la fiche de chaque carte. Elle ne change rien à leurs valeurs.</p>`;
      }
      if (it.kind === 'plate') return `<p class="cx-pv-cap">Sur ton profil</p>
        <div class="cx-pv-prof"><span class="avatar-big pf pf-${s.frame}">${avImg}</span><div><b><span class="np np-${it.id}">${esc(myName())}</span></b><span>${esc(s.title)}</span></div></div>
        <p class="cx-pv-cap">Au classement, vu par tous les joueurs</p>
        <div class="lb-row cx-pv-lb"><span class="lb-rank">1</span><span class="lb-av pf pf-${s.frame}">${avImg}</span><span class="lb-name"><b><span class="np np-${it.id}">${esc(myName())}</span></b><span class="small muted">${esc(s.title)}</span></span><span class="lb-floor">412 pts</span></div>
        <p class="cx-pv-cap">Pendant une partie en ligne, chez ton adversaire</p>
        <div class="cx-pv-seat"><span class="sc-med">${avImg}</span><b><span class="np np-${it.id}">${esc(myName())}</span></b></div>`;
      if (it.kind === 'emote') return `<p class="cx-pv-cap">Pendant une partie en ligne, ton adversaire voit</p>
        <div class="re-bubble demo on">${emoteHTML(it.id)}<small>${esc(myName())}</small></div>
        <p class="cx-pv-cap">Les réactions s'envoient avec la bulle à droite de l'écran de jeu, une toutes les 3 secondes. Ton adversaire peut les masquer.</p>`;
      if (it.give?.emotes) return `<p class="cx-pv-cap">Les huit réactions du lot</p><div class="re-grid">${it.give.emotes.map((k) => `<span class="re-pick">${emoteHTML(k)}</span>`).join('')}</div>`;
      return `<p class="cx-pv-cap">Les sept dos du lot</p><div class="cx-pv-grid">${it.give.backs.map((b) => `<figure><img alt="" src="assets/backs/${b}.webp"><figcaption>${esc((CODEX_BACKS[b] || b).replace('Dos du royaume ', ''))}</figcaption></figure>`).join('')}</div>`;
    };
    const foot = () => { const own = g.catalogOwned(it.id), cost = g.catalogCost(it.id);
      return `<div class="cx-pv-foot">${own ? `<span class="cx-badge on">${icon('check')}Déjà à toi</span>` : `<button class="btn primary cx-pv-buy" data-pv="buy">Acheter · ${obsTxt(cost)}</button><small class="muted">Tu as ${obsTxt(g.obs())}</small>`}</div>`; };
    const sh = openSheet('', { label: 'Aperçu', full: true, cls: 'cx-pv', onClose: () => stopTilt?.() });
    const paint = () => {
      stopTilt?.();
      sh.setContent(`<h2 class="center cx-pv-title">${esc(nm)}</h2>${it.desc ? `<p class="small muted center">${esc(it.desc)}</p>` : ''}${body()}${foot()}`);
      const dc = sh.body.querySelector('.cx-pvf-card'); stopTilt = dc ? enableTilt(dc, { reduced: app.reduced?.() }) : null;
      if (bare) dc?.querySelector('.tcg')?.classList.add('art-only');
    };
    paint();
    /* toucher la carte sans la faire pivoter : texte masqué ou remis (comme la fiche d'une carte) */
    let dp = null;
    sh.body.addEventListener('pointerdown', (ev) => { dp = ev.target.closest('.cx-pvf-card .tcg') ? { x: ev.clientX, y: ev.clientY, t: Date.now() } : null; }, { passive: true });
    sh.body.addEventListener('click', async (e) => {
      const tc = e.target.closest('.cx-pvf-card .tcg');
      if (tc) {
        if (!dp || Math.hypot(e.clientX - dp.x, e.clientY - dp.y) > 10 || Date.now() - dp.t > 600) return;
        bare = !bare; tc.classList.toggle('art-only', bare); app.sfx.tap?.();
        const h = sh.body.querySelector('.cx-pvf-hint'); if (h) h.innerHTML = `${icon('eye')}Touche la carte pour ${bare ? 'remettre le texte' : 'voir l’illustration seule'} · fais-la pivoter du doigt`;
        return;
      }
      const b = e.target.closest('[data-pv]'); if (!b) return;
      if (b.dataset.pv === 'pick') { pick = +b.dataset.i; app.sfx.tap?.(); paint(); sh.el.scrollTo?.({ top: 0, behavior: 'smooth' }); }
      if (b.dataset.pv === 'plain' || b.dataset.pv === 'dress') { plain = b.dataset.pv === 'plain'; app.sfx.tap?.(); paint(); }
      if (b.dataset.pv === 'buy') { try { if (await buy(it.id)) { paint(); app.chrome?.(); draw(); } } catch (err) { toast(esc(err.message), { kind: 'error' }); } }
    });
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
      if (k === 'cat') { ui.cat = b.dataset.v; app.sfx.tap?.(); return draw(); }
      if (k === 'see') { preview(b.dataset.id); return; } /* v484 */
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
