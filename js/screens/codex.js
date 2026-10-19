// v470 : ÉBAUCHE du pass de saison (« Le Codex de l'Abîme ») et de la boutique en argent réel (« L'Échoppe »).
// Visible seulement en Mode Créateur (option « Codex et Échoppe ») ; les achats sont simulés (aucun paiement).
import { CODEX, CODEX_XP, CODEX_XP_LABEL, CODEX_TIERS, CODEX_FRAMES, CODEX_BACKS, SHOP, CATALOG, OBS, codexTier, tierProgress, claimable, freshCodex } from '../core/codex.js';
import { FRAMES } from '../config.js';
import { CHESTS } from '../core/descent.js';
import { icon, picon } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';

const ALL_FRAMES = { ...FRAMES, ...CODEX_FRAMES };
const PACK_NAME = { standard: 'booster standard', premium: 'booster premium' };
/* v474 : pierre d'obsidienne (icône provisoire, en attendant une image Gemini) */
export const OBS_I = '<svg class="obs-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 20 8.5 16.5 21h-9L4 8.5Z" fill="#1A0F2E" stroke="#B48CFF" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 2 9.5 9h5Zm-8 6.5h16M9.5 9 7.5 21m7-12 2 12" fill="none" stroke="#7A5CC0" stroke-width=".9"/><path d="M12 3.6 10.4 8.2h3.2Z" fill="#D9C4FF" opacity=".7"/></svg>';
const obsTxt = (n) => `<span class="obs-n">${OBS_I}${fmt(n)}</span>`;

export default function codexScreen(app, root) {
  const g = app.game;
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
    if (r.obs) parts.push(`<span class="cx-r">${obsTxt(r.obs)}&nbsp;${esc(OBS.name.toLowerCase())}</span>`);
    return parts.join('');
  };

  function codexTab() {
    const c = g.codex(), t = codexTier(c), n = claimable(c), max = t >= CODEX.tiers;
    const cell = (tier, tr, r) => {
      if (!r) return `<div class="cx-cell empty">${rw(null)}</div>`;
      const got = c[tr].includes(tier), lockedPrem = tr === 'prem' && !c.premium, reached = tier <= t;
      const state = got ? 'got' : !reached ? 'far' : lockedPrem ? 'lock' : 'ready';
      return `<div class="cx-cell ${tr} ${state}">${rw(r)}${state === 'ready' ? `<button class="btn small primary" data-cx="claim" data-tr="${tr}" data-t="${tier}">Récupérer</button>` : state === 'got' ? `<span class="cx-ok">${icon('check')}</span>` : state === 'lock' ? `<span class="cx-lk">${icon('lock')}</span>` : ''}</div>`;
    };
    return `<section class="panel cx-head">
        <div class="cx-lvl"><b>${t}</b><small>/ ${CODEX.tiers}</small></div>
        <div class="cx-prog"><span class="small">${max ? 'Codex terminé pour cette saison !' : `Palier ${t + 1} : ${c.xp % CODEX.xpPerTier} / ${CODEX.xpPerTier} points`}</span><span class="cx-bar"><i style="width:${Math.round(tierProgress(c) * 100)}%"></i></span>
          <span class="small muted">${fmt(c.xp)} points de Codex · saison du ${esc(CODEX.starts.split('-').reverse().join('/'))} au ${esc(CODEX.ends.split('-').reverse().join('/'))}</span></div>
      </section>
      <div class="cx-actions">${n ? `<button class="btn primary dc-plq dc-plq-red" data-cx="all">Tout récupérer (${n})</button>` : ''}
        ${c.premium ? `<span class="cx-badge on">${icon('star')}${esc(CODEX.premiumName)} acquis</span>` : `<button class="btn dc-plq dc-plq-dark cx-unlock" data-cx="unlock">${icon('star')}<span>Débloquer le ${esc(CODEX.premiumName)}</span>${obsTxt(CODEX.cost)}</button>`}</div>
      <details class="panel dc-fold"><summary>${picon('help')}<span class="dc-sum-t">Gagner des points de Codex</span></summary>
        <ul class="cx-xp">${Object.entries(CODEX_XP).map(([k, v]) => `<li><span>${esc(CODEX_XP_LABEL[k])}</span><b>+${v}</b><small class="muted">${fmt(c.log[k] || 0)} gagnés</small></li>`).join('')}</ul>
        <p class="small muted">La voie de gauche se gagne en jouant. La voie enluminée (à droite) se débloque une fois par saison avec des obsidiennes : seulement des cadres peints, des titres et des dos de cartes, jamais de puissance. Les cadres et dos marqués « Échoppe » s'achètent aussi à l'unité.</p></details>
      <div class="cx-cols"><span>Palier</span><span>Voie de l'Abîme (gratuite)</span><span>${esc(CODEX.premiumName)}</span></div>
      <ol class="cx-track">${CODEX_TIERS.map((x) => `<li class="cx-row ${x.tier <= t ? 'reached' : ''} ${x.tier === t + 1 ? 'next' : ''}"><span class="cx-n">${x.tier}</span>${cell(x.tier, 'free', x.free)}${cell(x.tier, 'prem', x.prem)}</li>`).join('')}</ol>`;
  }

  function shopTab() {
    const have = g.obs();
    const name = (it) => it.name || (it.kind === 'frame' ? ALL_FRAMES[it.id] : CODEX_BACKS[it.id]) || it.id;
    const pic = (it) => it.kind === 'frame' ? `<span class="cx-av"><span class="avatar-mini pf pf-${it.id}"></span></span>`
      : it.kind === 'back' ? `<img class="cx-bk" alt="" src="assets/backs/${it.id}.webp">`
      : `<span class="cx-fan">${it.give.backs.slice(0, 4).map((b) => `<img alt="" src="assets/backs/${b}.webp">`).join('')}</span>`;
    const tile = (it) => { const own = g.catalogOwned(it.id), cost = g.catalogCost(it.id); return `<article class="cx-tile ${it.kind} ${own ? 'own' : ''}">${pic(it)}<b>${esc(name(it))}</b>${it.desc ? `<small class="muted">${esc(it.desc)}</small>` : ''}
      ${own ? `<span class="cx-badge on">${icon('check')}Acquis</span>` : `<button class="btn small ${cost <= have ? 'primary' : ''}" data-cx="get" data-id="${it.id}">${obsTxt(cost)}</button>`}</article>`; };
    const sec = (title, kind) => `<h3 class="cx-h">${title}</h3><div class="cx-grid ${kind}">${CATALOG.filter((x) => x.kind === kind).map(tile).join('')}</div>`;
    const euro = (it) => { const own = it.once && g.shopOwned(it.id); return `<article class="panel cx-item ${it.kind || ''} ${own ? 'own' : ''}">
        <div class="cx-it-h"><b>${it.kind === 'obs' ? obsTxt(it.give.obs) : esc(it.name)}</b>${it.bonus ? `<span class="cx-bonus">+${it.bonus} offertes</span>` : ''}<span class="cx-price">${esc(it.price)}</span></div>
        ${it.desc ? `<p class="small">${esc(it.desc)}</p><div class="cx-it-r">${rw(it.give)}</div>` : ''}
        <div class="cx-it-f">${own ? `<span class="cx-badge on">${icon('check')}Acquis</span>` : `<button class="btn primary small" data-cx="buy" data-id="${it.id}">Acheter · ${esc(it.price)}</button>`}<small class="muted">${esc(it.store)}</small></div></article>`; };
    return `<section class="panel cx-wallet"><span class="cx-w-n">${obsTxt(have)}</span><span class="small">${esc(OBS.name)} : la monnaie de l'Échoppe, achetée en euros, dépensée seulement en cosmétiques.</span>
        <button class="btn small" data-cx="jump">Obtenir des ${esc(OBS.name.toLowerCase())}</button></section>
      <p class="small muted cx-note">Les cadres simples, les titres et le dos de l'Abysse se gagnent toujours en jouant. Ici : les cosmétiques <b>peints</b>, seulement décoratifs. Pendant l'aperçu, tout achat en euros est simulé : aucun paiement.</p>
      ${sec('Cadres de profil', 'frame')}
      ${sec('Dos de cartes', 'back')}
      ${sec('Lots', 'bundle')}
      <h3 class="cx-h" id="cx-euro">${esc(OBS.name)} et Pack du Fondateur</h3>
      <div class="cx-shop">${SHOP.map(euro).join('')}</div>
      <button class="btn ghost block" data-cx="restore">Restaurer mes achats</button>
      <p class="small muted center">Paiement par l'App Store, remboursements selon les règles d'Apple. Rien ici ne rend tes créatures plus fortes.</p>`;
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
    root.innerHTML = `<header class="screen-head ui-hero bn-premium"><h1>${esc(CODEX.name)}</h1><p class="muted">${esc(CODEX.title)}</p><span class="sc-rec">Aperçu Créateur · invisible pour les joueurs</span></header>
      <div class="seg cx-seg" role="group">${[['codex', 'Le Codex'], ['shop', 'L’Échoppe']].map(([k, l]) => `<button class="seg-b" data-cx="tab" data-v="${k}" aria-pressed="${ui.tab === k}">${l}</button>`).join('')}</div>
      ${ui.tab === 'shop' ? shopTab() : codexTab()}
      ${devTab()}`;
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
      if (k === 'jump') { document.getElementById('cx-euro')?.scrollIntoView({ behavior: 'smooth' }); return; }
      if (k === 'get' || k === 'unlock') { /* v474 : dépense d'obsidiennes */
        const it = CATALOG.find((x) => x.id === b.dataset.id), cost = it ? g.catalogCost(it.id) : CODEX.cost;
        const label = it ? (it.name || ALL_FRAMES[it.id] || CODEX_BACKS[it.id]) : CODEX.premiumName;
        if (g.obs() < cost) {
          if (await confirmBox(`Il te manque <b>${fmt(cost - g.obs())} obsidiennes</b> pour ${esc(label)}.`, { ok: 'Obtenir des obsidiennes' })) { ui.tab = 'shop'; draw(); document.getElementById('cx-euro')?.scrollIntoView({ behavior: 'smooth' }); }
          return;
        }
        if (!(await confirmBox(`Échanger <b>${fmt(cost)} obsidiennes</b> contre ${esc(label)} ?`, { ok: 'Confirmer' }))) return;
        if (it) g.catalogBuy(it.id); else g.codexUnlock();
        app.sfx.levelup?.(); toast(`${esc(label)} : acquis.${it?.kind === 'frame' ? ' Choisis-le dans ton Profil.' : it ? ' Choisis-le dans ton Profil (dos de cartes).' : ''}`, { kind: 'success', icon: 'star' });
      }
      if (k === 'obs') { g.s.obs = g.obs() + 1000; g.persist(); }
      if (k === 'obs0') { g.s.obs = 0; g.persist(); }
      if (k === 'restore') toast('« Restaurer mes achats » marchera avec l’App Store, quand les achats seront ouverts.', { icon: 'info' });
      if (k === 'xp') { g.codexXp(+b.dataset.v, 'dev'); g.persist(); }
      if (k === 'prem') { const c = g.codex(); c.premium = !c.premium; g.persist(); }
      if (k === 'reset') { if (!(await confirmBox('Remettre le Codex à zéro (points, récompenses récupérées, voie enluminée) ? Les objets déjà gagnés restent.', { ok: 'Remettre à zéro' }))) return; g.s.codex = freshCodex(); g.persist(); }
    } catch (err) { toast(esc(err.message), { kind: 'error' }); return; }
    app.chrome?.(); draw();
  });
  draw();
}
