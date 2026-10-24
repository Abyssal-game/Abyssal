// Profil : titre, cadre, niveau, statistiques, vitrine, historique.
import { sync } from '../cloud/sync.js';
import { cardHTML, lazyArt } from '../ui/card.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil, EMBLEM, picon, setIcon } from '../ui/icons.js';
import { esc, fmt, pct, bindActions, toast, openSheet } from '../ui/dom.js';
import { unlockSources } from '../core/unlocks.js';
import { RARITIES, FRAMES, BOOSTERS, FACTION_ORDER, VARIANTS, RARITY, RARITY_ORDER } from '../config.js';
import { CODEX_FRAMES, CODEX_BACKS, FINISHES, PLATES, SACHETS, TAPIS, FONDS, LIVE_BACKS, CATALOG, SEASONS, SHOP } from '../core/codex.js';
import { withPlate, fondCls, fondStyle } from '../ui/vitrine.js'; /* v564 : plaque de pseudo */

export default function profile(app, root) {
  const g = app.game, cat = app.catalog;

  const VORDER = ['prism', 'crystal', 'galaxy', 'gold', 'holo'];
  function luckHTML() {
    const s = g.s, st = s.stats;
    if (!st.boosters) return '';
    // carte la plus rare : rareté, puis variante la plus précieuse, puis la plus ancienne
    const owned = Object.keys(s.collection).map((id) => cat.get(id)).filter(Boolean);
    const vRank = (id) => { const e = g.entry(id); const i = VORDER.findIndex((v) => e.v[v]); return i < 0 ? 99 : i; };
    const rarest = owned.sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || vRank(a.id) - vRank(b.id) || g.entry(a.id).first - g.entry(b.id).first)[0];
    const rv = rarest ? g.shownVariant(rarest.id) : 'normal';
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
        <p class="small muted">Cartes tirées dans tes boosters.</p>
      </div>
      ${rarest ? `<div class="panel rarest"><div>${cardHTML(rarest, { variant: rv })}</div><div><span class="small muted">Ta carte la plus rare</span><h3>${esc(rarest.name)}</h3><p class="small"><b style="color:${RARITY[rarest.rarity].color}">${RARITY[rarest.rarity].name}</b>${rv !== 'normal' ? ` · ${esc(VARIANTS[rv].name)}` : ''}</p><p class="small muted">Trouvée le ${new Date(g.entry(rarest.id).first).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p></div></div>` : ''}
      ${s.best.length ? `<h3>Tes plus belles ouvertures</h3><div class="stack">${s.best.map((b, i) => `<div class="panel hist best-op"><span class="best-rank">${i + 1}</span><div><div class="row between small"><b>${esc(BOOSTERS[b.type]?.name || b.type)}</b><span class="muted">${new Date(b.t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${b.score} pts</span></div><div class="hist-cards">${b.cards.map((c) => { const card = cat.get(c.id); return card ? `<button class="hist-c" data-id="${c.id}" style="--rc:${RARITY[card.rarity].color}" title="${esc(card.name)}"><img alt="${esc(card.name)}" loading="lazy" src="${artUrl(card, { lite: true })}">${c.v !== 'normal' ? `<em>${esc(VARIANTS[c.v].short)}</em>` : ''}</button>` : ''; }).join('')}</div></div></div>`).join('')}</div>` : ''}</div></details>`;
  }

  const U = unlockSources(cat);

  /* v483 : menu « Personnaliser » (remplace « Titres et cadres » et le bouton Personnaliser) : avatar, titres, cadres,
     dos de cartes, finitions de prestige, et plus tard sachets de booster et arènes */
  let cs = null, csTab = null, csSlot = 'standard'; /* v587 : booster habillé (standard ou premium) */
  function customHTML() {
    const s = g.s, av = g.shownAvatar() && cat.get(g.shownAvatar()); /* v545 : le portrait que voient les autres joueurs */
    const allF = Object.entries({ ...FRAMES, ...CODEX_FRAMES }).filter(([k]) => s.frames.includes(k) || U.frames.some((f) => f.key === k));
    const ownF = allF.filter(([k]) => s.frames.includes(k)), lockedF = allF.filter(([k]) => !s.frames.includes(k));
    const lockedT = U.titles.filter((t) => !s.titles.includes(t.name));
    const backs = [[null, 'Dos de l’Abysse', 'assets/backs/back.webp'], ...(s.backs || []).map((k) => [k, CODEX_BACKS[k] || k, `assets/backs/${k}.webp`])];
    const backNow = backs.find(([k]) => (s.back || null) === k) || backs[0];
    const fins = (s.finishes || []).filter((k) => FINISHES[k]);
    const dressed = Object.keys(s.dress || {}).length;
    const frameBtn = ([k, name]) => { const has = s.frames.includes(k), how = U.frames.find((f) => f.key === k)?.how || ''; return `<button class="frame-pick ${has ? '' : 'pf-lock'}" data-cs="${has ? 'frame' : 'how'}" data-v="${has ? k : esc(name)}" data-how="${esc(how)}" aria-pressed="${s.frame === k}"><span class="avatar-mini pf pf-${k}">${has ? avImg : icon('lock')}</span><span class="small">${esc(name)}</span></button>`; };
    /* v557 : menu Personnaliser refait (scène illustrée, rangées avec aperçu, nombre possédé sur le total, barre) */
    const shownName = sync.profile?.pseudo || s.name || 'Toi';
    const avImg = av ? `<img alt="" src="${artUrl(av, { lite: true })}">` : EMBLEM;
    const fan = backs.slice(0, 3).map(([, , u], i) => `<img class="cs-fan f${i}" alt="" src="${u}">`).join('');
    const head = `<div class="cs-hero bn-profile ${fondCls(s.fond)}"${fondStyle(s.fond)}><span class="avatar-big pf pf-${s.frame}">${avImg}</span><div><b class="cs-name">${withPlate(s.plate, esc(shownName))}</b><span class="cs-title">${esc(s.title)}</span><span class="cs-lv">Niveau ${g.levelInfo().level}</span></div><span class="cs-fanbox">${fan}</span></div>`;
    const SECTIONS = [
      ['avatar', 'Avatar', av ? `<img alt="" src="${artUrl(av, { lite: true })}">` : EMBLEM, av ? esc(av.name) : 'Une de tes créatures', Object.keys(s.collection).length],
      ['titles', 'Titres', picon('titles'), esc(s.title), `${s.titles.length}`],
      ['frames', 'Cadres de profil', `<span class="avatar-mini pf pf-${s.frame}">${avImg}</span>`, esc(({ ...FRAMES, ...CODEX_FRAMES })[s.frame] || ''), `${ownF.length}`],
      ['plates', 'Plaque de pseudo', `<span class="np ${s.plate ? `np-${s.plate}` : 'np-none'} np-demo" translate="no">${esc(shownName)}</span>`, esc(PLATES[s.plate] || 'Aucune plaque'), `${(s.plates || []).length}`], /* v564 */
      ['backs', 'Dos de cartes', `<img alt="" src="${backNow[2]}">`, esc(backNow[1]), `${backs.length}`],
      ['sachets', 'Sachets de booster', `<img alt="" src="assets/packs/${s.sachet || 'standard3'}.webp">`, esc(SACHETS[s.sachet] || 'Sachets d’origine'), `${(s.sachets || []).length}`], /* v565 */
      ['mats', 'Tapis de jeu', `<img class="cs-mat" alt="" src="assets/${s.mat ? `tapis/${s.mat}` : 'sceaux/plateau'}.webp">`, esc(TAPIS[s.mat] || 'Plateau d’origine'), `${(s.mats || []).length}`], /* v632 */
      ['fonds', 'Fond de profil', `<img class="cs-fond" alt="" src="assets/${s.fond ? `fonds/${s.fond}` : 'ui/bn-profile'}.webp">`, esc(FONDS[s.fond] || 'Fond d’origine'), `${(s.fonds || []).length}`], /* v632 */
      ['finishes', 'Finitions de cartes', fins.length ? `<span class="cx-fin"><img alt="" src="assets/art/lite/ABY-039.webp"><img alt="" src="assets/variants/${fins[0]}-frame.webp"></span>` : `<span class="cx-fin"><img alt="" src="assets/art/lite/ABY-039.webp"></span>`, fins.length ? `${dressed} carte${dressed > 1 ? 's' : ''} habillée${dressed > 1 ? 's' : ''}` : 'Contours peints des cartes', `${fins.length}`],
    ].filter(([k]) => (k !== 'finishes' || false) /* v569 : finitions de cartes retirées (« ça ne rend pas bien ») */ && (k !== 'plates' || (s.plates || []).length || g.shopOn()) && (k !== 'sachets' || (s.sachets || []).length || g.shopOn()) && (k !== 'mats' || (s.mats || []).length || g.shopOn()) && (k !== 'fonds' || (s.fonds || []).length || g.shopOn())); /* v499 : plus de tuiles « Bientôt » : finitions seulement si on en possède */
    const TOT = { avatar: g.total(), titles: s.titles.length + lockedT.length, frames: new Set([...allF.map(([k]) => k), ...CATALOG.map((it) => it.give?.frame), ...SEASONS.flatMap((se) => se.tiers.map((t) => t.prem?.frame)), ...SHOP.map((it) => it.give?.frame)].filter((k) => k && (FRAMES[k] || CODEX_FRAMES[k]))).size, /* v695 : cadres de l’Échoppe et du Codex comptés comme les dos */ backs: 1 + new Set([...(s.backs || []), ...CATALOG.flatMap((it) => [it.give.back, ...(it.give.backs || [])]), ...SEASONS.flatMap((se) => se.tiers.map((t) => t.prem?.back)), ...SHOP.map((it) => it.give?.back)].filter(Boolean)).size, /* v574 : seulement les dos qui existent encore (74 avant, objets retirés compris) */ plates: Object.keys(PLATES).length, sachets: Object.keys(SACHETS).length, mats: Object.keys(TAPIS).length, fonds: Object.keys(FONDS).length, finishes: Object.keys(FINISHES).length };
    if (!csTab) return `${head}<div class="cs-list">${SECTIONS.map(([k, n, pic, sub, cnt]) => { const tot = TOT[k] || 0, has = Math.min(+cnt || 0, tot || 0); return `<button class="cs-row k-${k}" data-cs="tab" data-v="${k}"><span class="cs-pic">${pic}</span><span class="cs-txt"><b>${n}</b><small>${sub}</small><span class="cs-bar"><i style="width:${tot ? (has / tot) * 100 : 0}%"></i></span></span><span class="cs-cnt"><b>${has}</b><small>/ ${tot}</small></span><span class="cs-go">${icon('next')}</span></button>`; }).join('')}</div>`;
    const back = `<button class="btn ghost small cs-back" data-cs="tab" data-v="">${icon('prev')}Personnaliser</button>`;
    const title = SECTIONS.find(([k]) => k === csTab)?.[1] || '';
    let body = '';
    if (csTab === 'avatar') {
      const ids = Object.keys(s.collection).filter((id) => cat.get(id));
      body = ids.length ? `<div class="av-grid">${ids.map((id) => { const c = cat.get(id); return `<button class="av-pick ${s.avatar === id ? 'on' : ''}" data-cs="avatar" data-v="${id}" style="--rc:${RARITY[c.rarity].color}"><img alt="" loading="lazy" src="${artUrl(c, { lite: true })}"><small>${esc(c.name)}</small></button>`; }).join('')}</div>` : '<p class="muted center">Obtiens d’abord une créature dans un booster.</p>';
    } else if (csTab === 'titles') {
      body = `<div class="chips pf-titles">${s.titles.map((x) => `<button class="chip" data-cs="title" data-v="${esc(x)}" aria-pressed="${x === s.title}">${esc(x)}</button>`).join('')}</div>
        ${lockedT.length ? `<h3 class="pf-tf-h">${icon('lock')} ${lockedT.length} titre${lockedT.length > 1 ? 's' : ''} à gagner</h3><p class="small muted">Touche un titre pour savoir comment l’obtenir.</p><div class="chips pf-titles">${lockedT.map((x) => `<button class="chip pf-lock" data-cs="how" data-how="${esc(x.how)}" data-v="${esc(x.name)}">${icon('lock')}${esc(x.name)}</button>`).join('')}</div>` : ''}`;
    } else if (csTab === 'frames') {
      body = `<div class="frames">${ownF.map(frameBtn).join('')}</div>
        ${lockedF.length ? `<h3 class="pf-tf-h">${icon('lock')} ${lockedF.length} cadre${lockedF.length > 1 ? 's' : ''} à gagner</h3><p class="small muted">Touche un cadre pour savoir comment l’obtenir.</p><div class="frames">${lockedF.map(frameBtn).join('')}</div>` : ''}`;
    } else if (csTab === 'plates') {
      const pl = [[null, 'Aucune plaque'], ...(s.plates || []).map((k) => [k, PLATES[k] || k])];
      body = `<p class="small muted">La bannière derrière ton pseudo : sur ton profil, aux classements et chez tes adversaires en ligne.</p><div class="cs-plates">${pl.map(([k, n]) => `<button class="cs-plate" data-cs="plate" data-v="${k || ''}" aria-pressed="${(s.plate || null) === k}"><span class="np ${k ? `np-${k}` : 'np-none'}">${esc(shownName)}</span><small>${esc(n)}</small></button>`).join('')}</div>${g.shopOn() ? '<p class="small muted">D’autres plaques à l’Échoppe.</p>' : ''}`;
    } else if (csTab === 'sachets') {
      const prem = csSlot === 'premium', cur = (prem ? s.sachetPrem : s.sachet) || null;
      const sa = [[null, 'Sachet d’origine', prem ? 'premium' : 'standard3'], ...(s.sachets || []).map((k) => [k, SACHETS[k] || k, k])];
      body = `<div class="seg cs-slot" role="radiogroup" aria-label="Booster à habiller">${[['standard', 'Booster standard'], ['premium', 'Booster premium']].map(([k, n]) => `<button class="seg-b" role="radio" aria-checked="${csSlot === k}" aria-pressed="${csSlot === k}" data-cs="slot" data-v="${k}">${n}</button>`).join('')}</div>
        <p class="small muted">${prem ? 'L’habillage de ton booster premium.' : 'L’habillage de ton booster standard. Ton adversaire le voit au Pari des Boosters.'} Les boosters de faction et des Alliances gardent leur sachet d’origine.</p><div class="cs-sachets">${sa.map(([k, n, f]) => `<button class="cs-sachet" data-cs="sachet" data-v="${k || ''}" aria-pressed="${cur === k}"><img alt="" src="assets/packs/${f}.webp"><small>${esc(n)}</small></button>`).join('')}</div>`;
    } else if (csTab === 'mats') { /* v632 */
      const ms = [[null, 'Plateau d’origine', 'sceaux/plateau'], ...(s.mats || []).map((k) => [k, TAPIS[k] || k, `tapis/${k}`])];
      body = `<p class="small muted">Le plateau de tes Duels des Sceaux, contre l’Abysse et en ligne.</p><div class="cs-mats">${ms.map(([k, n, f]) => `<button class="cs-matb" data-cs="mat" data-v="${k || ''}" aria-pressed="${(s.mat || null) === k}"><img alt="" src="assets/${f}.webp"><small>${esc(n)}</small></button>`).join('')}</div>`;
    } else if (csTab === 'fonds') { /* v632 */
      const fs = [[null, 'Fond d’origine', 'ui/bn-profile'], ...(s.fonds || []).map((k) => [k, FONDS[k] || k, `fonds/${k}`])];
      body = `<p class="small muted">La scène derrière ton portrait : sur ton profil, et chez les autres joueurs quand ils ouvrent ta fiche.</p><div class="cs-fonds">${fs.map(([k, n, f]) => `<button class="cs-fondb" data-cs="fond" data-v="${k || ''}" aria-pressed="${(s.fond || null) === k}"><img alt="" src="assets/${f}.webp"><small>${esc(n)}</small></button>`).join('')}</div>`;
    } else if (csTab === 'backs') {
      body = `<p class="small muted">Le dos de toutes les cartes face cachée du jeu.</p><div class="pf-backs">${backs.map(([k, n, u]) => `<button class="pf-back" data-cs="cardback" data-v="${k || ''}" aria-pressed="${(s.back || null) === k}"><img alt="" src="${u}"><span class="small">${esc(n)}</span></button>`).join('')}</div>`;
    } else if (csTab === 'finishes') {
      body = fins.length ? `<p class="small muted">Un contour peint posé sur une carte que tu possèdes. Choisis une finition, puis touche les cartes à habiller (touche encore pour retirer).</p>
        <div class="cs-fins">${fins.map((k) => `<button class="cs-fin" data-cs="fin" data-v="${k}" aria-pressed="${cs?.fin === k}"><span class="cx-fin"><img alt="" src="assets/art/lite/ABY-039.webp"><img alt="" src="assets/variants/${k}-frame.webp"></span><small>${esc(FINISHES[k].name)}</small></button>`).join('')}</div>
        ${cs?.fin ? `<div class="av-grid cs-dress">${Object.keys(s.collection).filter((id) => cat.get(id)).map((id) => { const c = cat.get(id), on = s.dress?.[id] === cs.fin; return `<button class="av-pick ${on ? 'on' : ''}" data-cs="dress" data-v="${id}" style="--rc:${RARITY[c.rarity].color}"><img alt="" loading="lazy" src="${artUrl(c, { lite: true })}">${s.dress?.[id] ? `<i class="cs-dtag">${esc(FINISHES[s.dress[id]]?.name || '')}</i>` : ''}<small>${esc(c.name)}</small></button>`; }).join('')}</div>` : ''}` : '<p class="muted center">Pas encore de finition de prestige. Les contours peints des cartes arrivent bientôt.</p>';
    }
    return `${head}<div class="cs-sec-h">${back}<h3>${title}</h3></div>${body}`;
  }
  function openCustom(tab = null) {
    csTab = tab; cs = openSheet('', { label: 'Personnaliser', full: true });
    const paint = () => { cs.setContent(`<h2 class="center">Personnaliser</h2>${customHTML()}`); };
    paint();
    cs.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cs]'); if (!b) return;
      const k = b.dataset.cs, v = b.dataset.v;
      if (k === 'tab') { csTab = v || null; cs.fin = null; app.sfx.tap?.(); paint(); cs.body.scrollTop = 0; return; }
      if (k === 'how') { toast(`${icon('lock')} <b>${esc(v)}</b><br><span class="small">${esc(b.dataset.how || 'Pas encore disponible.')}</span>`, { ms: 6000 }); return; }
      if (k === 'avatar') g.setAvatar(v);
      if (k === 'title') g.setTitle(v);
      if (k === 'frame') g.setFrame(v);
      if (k === 'plate') g.setPlate(v || null);
      if (k === 'mat') { g.setMat(v || null); app.applySettings?.(); } /* v632 */
      if (k === 'fond') g.setFond(v || null); /* v632 */
      if (k === 'slot') { csSlot = v === 'premium' ? 'premium' : 'standard'; app.sfx.tap?.(); paint(); return; }
      if (k === 'sachet') { g.setSachet(v || null, csSlot); app.applySettings?.(); }
      if (k === 'cardback') { g.setBack(v || null); app.applySettings?.(); }
      if (k === 'fin') cs.fin = cs.fin === v ? null : v;
      if (k === 'dress') { try { g.setDress(v, g.s.dress?.[v] === cs.fin ? null : cs.fin); } catch (err) { toast(esc(err.message), { kind: 'error' }); } }
      app.sfx.tap?.(); const y = cs.body.scrollTop; paint(); cs.body.scrollTop = y; render(); app.chrome?.();
    });
  }

  function render() {
    const s = g.s, lv = g.levelInfo();
    const owned = g.uniqueCount(), total = g.total();
    const av = g.shownAvatar() && cat.get(g.shownAvatar());
    const show = (s.showcase.length ? s.showcase.map((id) => cat.get(id)) : g.bestCards(3)).filter(Boolean);
    root.innerHTML = `
      <section class="panel ornate profile-head bn-profile ${fondCls(s.fond)}"${fondStyle(s.fond)} data-act="custom">
        <div class="av-col"><button class="avatar-big pf pf-${s.frame}" data-act="custom" aria-label="Personnaliser ton profil">${av ? `<img alt="" src="${artUrl(av)}">` : EMBLEM}</button></div>
        <div class="ph-text">
          <h1>${sync.profile?.pseudo ? `<span class="ph-name">${withPlate(s.plate, esc(sync.profile.pseudo))}</span>` /* v499 : connecté, le nom affiché est le pseudo en ligne (un seul nom) */ : `<button class="ph-name" data-act="rename">${withPlate(s.plate, esc(s.name || 'Ton nom'))} <span class="small muted">${icon('edit')}</span></button>`}</h1>
          <p class="ph-title">${esc(s.title)}</p>
          <p class="muted small">Niveau ${lv.level} · ${fmt(lv.into)} / ${fmt(lv.need)} XP</p>
          <span class="xpbar"><i style="width:${(lv.into / lv.need) * 100}%"></i></span>
          <p class="small muted">${av ? `Avatar : ${esc(av.name)}<br>` : ''}<span class="ph-hint">Touche ton portrait pour te personnaliser</span></p>
        </div>
      </section>

      <h2 class="section-title">Vitrine</h2>
      ${show.length ? `<div class="showcase" id="showcase">${show.map((c) => { const e = g.entry(c.id); const v = g.shownVariant(c.id); return cardHTML(c, { variant: v }); }).join('')}</div><p class="small muted">${s.showcase.length ? 'Tes cartes mises en vitrine.' : 'Tes cartes les plus prestigieuses. Mets-en d’autres en vitrine depuis leur fiche.'}</p>` : '<p class="muted">Ta vitrine est vide : ouvre ton premier booster.</p>'}

      <div class="stats-grid pf-3">
        <div class="panel stat"><b>${owned}</b><span>créatures sur ${total}</span></div>
        <div class="panel stat"><b>${fmt(s.stats.boosters)}</b><span>boosters ouverts</span></div>
        <div class="panel stat"><b>${g.descent().best || 0}</b><span>étage record</span></div>
      </div>

      <button class="panel pf-custom-row" data-act="custom"><img class="pf-cr-ic" alt="" src="assets/icons/customize.webp" onerror="this.remove()"><span class="pf-cr-t"><b>Personnaliser</b><span class="small muted">Avatar, titres, cadres, plaques, dos, sachets, tapis, fonds</span></span><span class="pf-cr-go">${icon('next')}</span></button>

      ${luckHTML()}

      <details class="panel dc-fold"><summary>${picon('stats')} Statistiques détaillées</summary><div>
        <div class="stats-grid">
          <div class="panel stat"><b>${fmt(s.stats.cards)}</b><span>cartes obtenues</span></div>
          <div class="panel stat"><b>${g.variantCount()}</b><span>finitions</span></div>
          <div class="panel stat"><b>${g.rarityCount('M')}</b><span>mythiques</span></div>
          <div class="panel stat"><b>${g.rarityCount('S')}</b><span>secrètes</span></div>
        </div>
        <h3>Par rareté</h3>
        <div class="rar-bars">${RARITIES.map((r) => `<div><span style="color:${r.color}">${r.name}</span><b>${g.rarityCount(r.key)} / ${cat.byRarity[r.key].length}</b></div>`).join('')}</div>
        <h3>Par faction</h3>
        ${FACTION_ORDER.map((f) => { const p = g.factionProgress(f); return `<div class="fac-row"><span style="color:${cat.faction[f].colors.secondary}">${sigil(f)}</span><span>${esc(cat.faction[f].name)}</span><span class="progress"><i style="width:${p.ratio * 100}%;--bar:${cat.faction[f].colors.secondary}"></i></span><b>${p.owned}/${p.total}</b></div>`; }).join('')}
        <h3>Ensembles</h3>
        ${cat.sets.map((st) => { const p = g.setProgress(st.key); return `<div class="fac-row ${p.done ? 'set-done' : ''}"><span>${setIcon(st.key)}</span><span>${esc(st.name)}${p.done ? ` ${icon('check')}` : ''}</span><span class="progress"><i style="width:${(p.owned / p.total) * 100}%"></i></span><b>${p.owned}/${p.total}</b></div>`; }).join('')}
      </div></details>

      ${s.history.length ? `<details class="panel dc-fold"><summary>${picon('openings')} Dernières ouvertures</summary><div class="history">${s.history.slice(0, 10).map((h) => `<div class="panel hist"><div class="row between small"><b>${esc(BOOSTERS[h.type]?.name || h.type)}${h.faction ? ` · ${esc(cat.faction[h.faction].name)}` : ''}</b><span class="muted">${new Date(h.t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span></div><div class="hist-cards">${h.cards.map((c) => { const card = cat.get(c.id); return card ? `<button class="hist-c" data-id="${c.id}" style="--rc:${RARITIES.find((r) => r.key === card.rarity).color}" title="${esc(card.name)}"><img alt="${esc(card.name)}" loading="lazy" src="${artUrl(card, { lite: true })}">${c.n ? '<i>N</i>' : ''}${c.v !== 'normal' ? `<em>${esc(VARIANTS[c.v].short)}</em>` : ''}</button>` : ''; }).join('')}</div></div>`).join('')}</div></details>` : ''}
    `;
    lazyArt(root);
  }
  bindActions(root, {
    custom(el) { openCustom(el.dataset.v || null); },
    title(el) { g.setTitle(el.dataset.v); render(); },
    frame(el) { g.setFrame(el.dataset.v); render(); },
    cardback(el) { g.setBack(el.dataset.v || null); app.applySettings?.(); app.sfx.tap?.(); render(); }, /* v473 : dos de cartes */
    pickav() {
      const ids = Object.keys(g.s.collection).filter((id) => cat.get(id));
      if (!ids.length) { toast('Obtiens d’abord une créature dans un booster.', { icon: 'info' }); return; }
      const sh = openSheet('<h2>Choisis ton avatar</h2>', { label: 'Avatar' });
      sh.setContent(`<h2 class="center">Choisis ton avatar</h2><div class="av-grid">${ids.map((id) => { const c = cat.get(id); return `<button class="av-pick ${g.s.avatar === id ? 'on' : ''}" data-id="${id}" style="--rc:${RARITY[c.rarity].color}"><img alt="" loading="lazy" src="${artUrl(c, { lite: true })}"><small>${esc(c.name)}</small></button>`; }).join('')}</div>`);
      sh.body.addEventListener('click', (e) => { const b = e.target.closest('.av-pick'); if (!b) return; g.setAvatar(b.dataset.id); app.sfx?.tap?.(); sh.close(); render(); app.chrome?.(); });
    },
    async rename() {
      const sh = openSheet('', { label: 'Ton nom', cls: 'sheet-small' });
      sh.setContent(`<h2 class="center">Ton nom</h2><p class="small muted center">Il s’affiche en haut de l’écran et sur ton profil.</p><input class="input" id="pf-name" maxlength="16" autocomplete="off" value="${esc(g.s.name || '')}" placeholder="Ton nom"><div class="row gap"><button class="btn ghost" data-n="no">Annuler</button><button class="btn primary" data-n="ok">Enregistrer</button></div>`);
      const inp = sh.body.querySelector('#pf-name'); setTimeout(() => inp.focus(), 50);
      sh.body.addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (!b) return; if (b.dataset.n === 'ok') { g.setName(inp.value); app.chrome?.(); render(); } sh.close(); });
    },
    how(el) { toast(`${icon('lock')} <b>${esc(el.dataset.v)}</b><br><span class="small">${esc(el.dataset.how || 'Pas encore disponible.')}</span>`, { ms: 6000 }); },
  });
  root.addEventListener('click', (e) => {
    const t = e.target.closest('#showcase .tcg, .hist-c, .rarest .tcg');
    if (t) app.openCard(t.dataset.id);
  });
  render();
  app.refreshView = render;
  return () => { app.refreshView = null; };
}
