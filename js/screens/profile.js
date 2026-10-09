// Profil : titre, cadre, niveau, statistiques, vitrine, historique.
import { cardHTML, lazyArt } from '../ui/card.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil, EMBLEM } from '../ui/icons.js';
import { esc, fmt, pct, bindActions } from '../ui/dom.js';
import { RARITIES, FRAMES, BOOSTERS, FACTION_ORDER, VARIANTS } from '../config.js';

export default function profile(app, root) {
  const g = app.game, cat = app.catalog;

  function render() {
    const s = g.s, lv = g.levelInfo();
    const owned = g.uniqueCount(), total = g.total();
    const av = s.avatar && cat.get(s.avatar);
    const show = (s.showcase.length ? s.showcase.map((id) => cat.get(id)) : g.bestCards(3)).filter(Boolean);
    root.innerHTML = `
      <section class="panel ornate profile-head">
        <div class="avatar-big pf pf-${s.frame}">${av ? `<img alt="" src="${artUrl(av)}">` : EMBLEM}</div>
        <div class="ph-text">
          <h1>${esc(s.title)}</h1>
          <p class="muted small">Niveau ${lv.level} · ${fmt(lv.into)} / ${fmt(lv.need)} XP</p>
          <span class="xpbar"><i style="width:${(lv.into / lv.need) * 100}%"></i></span>
          <p class="small muted">${av ? `Avatar : ${esc(av.name)}` : 'Choisis un avatar depuis la fiche d’une carte possédée.'}</p>
        </div>
      </section>
      <div class="row gap wrap"><a class="btn small" href="#/succes">${icon('trophy')}Succès</a><a class="btn small" href="#/parametres">${icon('gear')}Réglages et sauvegarde</a></div>

      <h2 class="section-title">Vitrine</h2>
      ${show.length ? `<div class="showcase" id="showcase">${show.map((c) => { const e = g.entry(c.id); const v = ['special', 'ancestral', 'corrupt', 'chroma', 'holo', 'alt'].find((x) => e.v[x]) || 'normal'; return cardHTML(c, { variant: v }); }).join('')}</div><p class="small muted">${s.showcase.length ? 'Tes cartes mises en vitrine.' : 'Tes cartes les plus prestigieuses. Mets-en d’autres en vitrine depuis leur fiche.'}</p>` : '<p class="muted">Ta vitrine est vide : ouvre ton premier booster.</p>'}

      <h2 class="section-title">Statistiques</h2>
      <div class="stats-grid">
        <div class="panel stat"><b>${owned}</b><span>créatures sur ${total}</span></div>
        <div class="panel stat"><b>${pct(owned / total, 1)}</b><span>du bestiaire</span></div>
        <div class="panel stat"><b>${fmt(s.stats.cards)}</b><span>cartes obtenues</span></div>
        <div class="panel stat"><b>${fmt(s.stats.boosters)}</b><span>boosters ouverts</span></div>
        <div class="panel stat"><b>${g.rarityCount('M')}</b><span>mythiques</span></div>
        <div class="panel stat"><b>${g.rarityCount('S')}</b><span>secrètes</span></div>
        <div class="panel stat"><b>${g.variantCount()}</b><span>variantes</span></div>
        <div class="panel stat"><b>${s.stats.arenaWins}–${s.stats.arenaLosses}</b><span>duels (V–D)</span></div>
      </div>
      <div class="panel">
        <h3>Par rareté</h3>
        <div class="rar-bars">${RARITIES.map((r) => `<div><span style="color:${r.color}">${r.name}</span><b>${g.rarityCount(r.key)} / ${cat.byRarity[r.key].length}</b></div>`).join('')}</div>
        <h3>Par faction</h3>
        ${FACTION_ORDER.map((f) => { const p = g.factionProgress(f); return `<div class="fac-row"><span style="color:${cat.faction[f].colors.secondary}">${sigil(f)}</span><span>${esc(cat.faction[f].name)}</span><span class="progress"><i style="width:${p.ratio * 100}%;--bar:${cat.faction[f].colors.secondary}"></i></span><b>${p.owned}/${p.total}</b></div>`; }).join('')}
        <h3>Ensembles</h3>
        ${cat.sets.map((st) => { const p = g.setProgress(st.key); return `<div class="fac-row"><span>${p.done ? icon('star') : ''}</span><span>${esc(st.name)}</span><span class="progress"><i style="width:${(p.owned / p.total) * 100}%"></i></span><b>${p.owned}/${p.total}</b></div>`; }).join('')}
      </div>

      <h2 class="section-title">Titres</h2>
      <div class="chips">${s.titles.map((t) => `<button class="chip" data-act="title" data-v="${esc(t)}" aria-pressed="${t === s.title}">${esc(t)}</button>`).join('')}</div>
      <h2 class="section-title">Cadres de profil</h2>
      <div class="frames">${Object.entries(FRAMES).map(([k, name]) => { const has = s.frames.includes(k); return `<button class="frame-pick" data-act="frame" data-v="${k}" ${has ? '' : 'disabled'} aria-pressed="${s.frame === k}"><span class="avatar-mini pf pf-${k}">${has ? '' : icon('lock')}</span><span class="small">${esc(name)}</span></button>`; }).join('')}</div>

      <h2 class="section-title">Dernières ouvertures</h2>
      ${s.history.length ? `<div class="history">${s.history.slice(0, 10).map((h) => `<div class="panel hist"><div class="row between small"><b>${esc(BOOSTERS[h.type]?.name || h.type)}${h.faction ? ` · ${esc(cat.faction[h.faction].name)}` : ''}</b><span class="muted">${new Date(h.t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span></div><div class="hist-cards">${h.cards.map((c) => { const card = cat.get(c.id); return card ? `<button class="hist-c" data-id="${c.id}" style="--rc:${RARITIES.find((r) => r.key === card.rarity).color}" title="${esc(card.name)}"><img alt="${esc(card.name)}" loading="lazy" src="${artUrl(card, { lite: true })}">${c.n ? '<i>N</i>' : ''}${c.v !== 'normal' ? `<em>${esc(VARIANTS[c.v].short)}</em>` : ''}</button>` : ''; }).join('')}</div></div>`).join('')}</div>` : '<p class="muted">Aucune ouverture pour l’instant.</p>'}
    `;
    lazyArt(root);
  }
  bindActions(root, {
    title(el) { g.setTitle(el.dataset.v); render(); },
    frame(el) { g.setFrame(el.dataset.v); render(); },
  });
  root.addEventListener('click', (e) => {
    const t = e.target.closest('#showcase .tcg, .hist-c');
    if (t) app.openCard(t.dataset.id);
  });
  render();
  app.refreshView = render;
  return () => { app.refreshView = null; };
}
