// Profil : titre, cadre, niveau, statistiques, vitrine, historique.
import { cardHTML, lazyArt } from '../ui/card.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil, EMBLEM, picon } from '../ui/icons.js';
import { esc, fmt, pct, bindActions } from '../ui/dom.js';
import { RARITIES, FRAMES, BOOSTERS, FACTION_ORDER, VARIANTS, RARITY, RARITY_ORDER } from '../config.js';

export default function profile(app, root) {
  const g = app.game, cat = app.catalog;

  const VORDER = ['special', 'galaxy', 'gold', 'holo'];
  function luckHTML() {
    const s = g.s, st = s.stats;
    if (!st.boosters) return '';
    // carte la plus rare : rareté, puis variante la plus précieuse, puis la plus ancienne
    const owned = Object.keys(s.collection).map((id) => cat.get(id)).filter(Boolean);
    const vRank = (id) => { const e = g.entry(id); const i = VORDER.findIndex((v) => e.v[v]); return i < 0 ? 99 : i; };
    const rarest = owned.sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || vRank(a.id) - vRank(b.id) || g.entry(a.id).first - g.entry(b.id).first)[0];
    const rv = rarest ? (VORDER.find((v) => g.entry(rarest.id).v[v]) || 'normal') : 'normal';
    const ratio = st.expHR > 0.5 ? st.gotHR / st.expHR : null;
    const verdict = ratio === null ? 'Ouvre encore quelques boosters pour mesurer ta chance.'
      : ratio >= 1.5 ? 'Les sceaux te sourient : une chance insolente.' : ratio >= 1.1 ? 'Plus chanceux que la moyenne.' : ratio >= 0.9 ? 'Pile dans la moyenne.' : ratio >= 0.6 ? 'Un peu en dessous de la moyenne… pour l’instant.' : 'Le Néant te met à l’épreuve. Ça va tourner.';
    const p = st.pulls || {};
    return `<details class="panel dc-fold"><summary>${picon('luck')} Ta chance</summary><div>
      <div>
        <div class="luck">
          <div class="ring" style="--p:${ratio === null ? 0 : Math.min(100, ratio * 50)};--c:${ratio !== null && ratio >= 1 ? 'var(--gold)' : '#8FA3C8'}"><span>${ratio === null ? '—' : Math.round(ratio * 100) + '%'}</span></div>
          <div><b>${ratio === null ? 'Chance à mesurer' : `${Math.round(ratio * 100)} % de la moyenne`}</b><p class="small muted">${verdict}</p><p class="small muted">Hyper rares ou mieux obtenues : ${st.gotHR} (moyenne attendue : ${st.expHR.toFixed(1).replace('.', ',')}).</p></div>
        </div>
        <div class="luck-grid">${['R', 'HR', 'M', 'S', 'PC', 'C'].map((r) => `<div><b style="color:${RARITY[r].color}">${p[r] || 0}</b><span>${RARITY[r].name}${(p[r] || 0) > 1 ? 's' : ''}</span></div>`).join('')}</div>
        <p class="small muted">Cartes tirées dans les boosters depuis la mise à jour.</p>
      </div>
      ${rarest ? `<div class="panel rarest"><div>${cardHTML(rarest, { variant: rv })}</div><div><span class="small muted">Ta carte la plus rare</span><h3>${esc(rarest.name)}</h3><p class="small"><b style="color:${RARITY[rarest.rarity].color}">${RARITY[rarest.rarity].name}</b>${rv !== 'normal' ? ` · ${esc(VARIANTS[rv].name)}` : ''}</p><p class="small muted">Trouvée le ${new Date(g.entry(rarest.id).first).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p></div></div>` : ''}
      ${s.best.length ? `<h3>Tes plus belles ouvertures</h3><div class="stack">${s.best.map((b, i) => `<div class="panel hist best-op"><span class="best-rank">${i + 1}</span><div><div class="row between small"><b>${esc(BOOSTERS[b.type]?.name || b.type)}</b><span class="muted">${new Date(b.t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${b.score} pts</span></div><div class="hist-cards">${b.cards.map((c) => { const card = cat.get(c.id); return card ? `<button class="hist-c" data-id="${c.id}" style="--rc:${RARITY[card.rarity].color}" title="${esc(card.name)}"><img alt="${esc(card.name)}" loading="lazy" src="${artUrl(card, { lite: true })}">${c.v !== 'normal' ? `<em>${esc(VARIANTS[c.v].short)}</em>` : ''}</button>` : ''; }).join('')}</div></div></div>`).join('')}</div>` : ''}</div></details>`;
  }

  function render() {
    const s = g.s, lv = g.levelInfo();
    const owned = g.uniqueCount(), total = g.total();
    const av = s.avatar && cat.get(s.avatar);
    const show = (s.showcase.length ? s.showcase.map((id) => cat.get(id)) : g.bestCards(3)).filter(Boolean);
    root.innerHTML = `
      <section class="panel ornate profile-head bn-profile">
        <div class="avatar-big pf pf-${s.frame}">${av ? `<img alt="" src="${artUrl(av)}">` : EMBLEM}</div>
        <div class="ph-text">
          <h1>${esc(s.title)}</h1>
          <p class="muted small">Niveau ${lv.level} · ${fmt(lv.into)} / ${fmt(lv.need)} XP</p>
          <span class="xpbar"><i style="width:${(lv.into / lv.need) * 100}%"></i></span>
          <p class="small muted">${av ? `Avatar : ${esc(av.name)}` : 'Choisis un avatar depuis la fiche d’une carte possédée.'}</p>
        </div>
      </section>

      <h2 class="section-title">Vitrine</h2>
      ${show.length ? `<div class="showcase" id="showcase">${show.map((c) => { const e = g.entry(c.id); const v = ['special', 'galaxy', 'gold', 'holo'].find((x) => e.v[x]) || 'normal'; return cardHTML(c, { variant: v }); }).join('')}</div><p class="small muted">${s.showcase.length ? 'Tes cartes mises en vitrine.' : 'Tes cartes les plus prestigieuses. Mets-en d’autres en vitrine depuis leur fiche.'}</p>` : '<p class="muted">Ta vitrine est vide : ouvre ton premier booster.</p>'}

      <div class="stats-grid pf-3">
        <div class="panel stat"><b>${owned}</b><span>créatures sur ${total}</span></div>
        <div class="panel stat"><b>${fmt(s.stats.boosters)}</b><span>boosters ouverts</span></div>
        <div class="panel stat"><b>${g.descent().best || 0}</b><span>étage record</span></div>
      </div>

      <details class="panel dc-fold"><summary>${picon('titles')} Titres et cadres</summary><div>
        <div class="chips">${s.titles.map((t) => `<button class="chip" data-act="title" data-v="${esc(t)}" aria-pressed="${t === s.title}">${esc(t)}</button>`).join('')}</div>
        <div class="frames">${Object.entries(FRAMES).map(([k, name]) => { const has = s.frames.includes(k); return `<button class="frame-pick" data-act="frame" data-v="${k}" ${has ? '' : 'disabled'} aria-pressed="${s.frame === k}"><span class="avatar-mini pf pf-${k}">${has ? '' : icon('lock')}</span><span class="small">${esc(name)}</span></button>`; }).join('')}</div>
      </div></details>

      ${luckHTML()}

      <details class="panel dc-fold"><summary>${picon('stats')} Statistiques détaillées</summary><div>
        <div class="stats-grid">
          <div class="panel stat"><b>${fmt(s.stats.cards)}</b><span>cartes obtenues</span></div>
          <div class="panel stat"><b>${g.variantCount()}</b><span>variantes</span></div>
          <div class="panel stat"><b>${g.rarityCount('M')}</b><span>mythiques</span></div>
          <div class="panel stat"><b>${g.rarityCount('S')}</b><span>secrètes</span></div>
        </div>
        <h3>Par rareté</h3>
        <div class="rar-bars">${RARITIES.map((r) => `<div><span style="color:${r.color}">${r.name}</span><b>${g.rarityCount(r.key)} / ${cat.byRarity[r.key].length}</b></div>`).join('')}</div>
        <h3>Par faction</h3>
        ${FACTION_ORDER.map((f) => { const p = g.factionProgress(f); return `<div class="fac-row"><span style="color:${cat.faction[f].colors.secondary}">${sigil(f)}</span><span>${esc(cat.faction[f].name)}</span><span class="progress"><i style="width:${p.ratio * 100}%;--bar:${cat.faction[f].colors.secondary}"></i></span><b>${p.owned}/${p.total}</b></div>`; }).join('')}
        <h3>Ensembles</h3>
        ${cat.sets.map((st) => { const p = g.setProgress(st.key); return `<div class="fac-row"><span>${p.done ? icon('star') : ''}</span><span>${esc(st.name)}</span><span class="progress"><i style="width:${(p.owned / p.total) * 100}%"></i></span><b>${p.owned}/${p.total}</b></div>`; }).join('')}
      </div></details>

      ${s.history.length ? `<details class="panel dc-fold"><summary>${picon('openings')} Dernières ouvertures</summary><div class="history">${s.history.slice(0, 10).map((h) => `<div class="panel hist"><div class="row between small"><b>${esc(BOOSTERS[h.type]?.name || h.type)}${h.faction ? ` · ${esc(cat.faction[h.faction].name)}` : ''}</b><span class="muted">${new Date(h.t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span></div><div class="hist-cards">${h.cards.map((c) => { const card = cat.get(c.id); return card ? `<button class="hist-c" data-id="${c.id}" style="--rc:${RARITIES.find((r) => r.key === card.rarity).color}" title="${esc(card.name)}"><img alt="${esc(card.name)}" loading="lazy" src="${artUrl(card, { lite: true })}">${c.n ? '<i>N</i>' : ''}${c.v !== 'normal' ? `<em>${esc(VARIANTS[c.v].short)}</em>` : ''}</button>` : ''; }).join('')}</div></div>`).join('')}</div></details>` : ''}
    `;
    lazyArt(root);
  }
  bindActions(root, {
    title(el) { g.setTitle(el.dataset.v); render(); },
    frame(el) { g.setFrame(el.dataset.v); render(); },
  });
  root.addEventListener('click', (e) => {
    const t = e.target.closest('#showcase .tcg, .hist-c, .rarest .tcg');
    if (t) app.openCard(t.dataset.id);
  });
  render();
  app.refreshView = render;
  return () => { app.refreshView = null; };
}
