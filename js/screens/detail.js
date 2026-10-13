// Vue détaillée d'une carte (fenêtre plein écran) : grand format, variantes,
// lore, capacités, lignée, ensembles, actions.
import { combatHTML, toggleTeam } from './army.js';
import { RARITY, VARIANTS, ECONOMY, VARIANT_RATES } from '../config.js';
import { openBurn, upgradeCard } from './furnace.js';
import { cardHTML, enableTilt } from '../ui/card.js';
import { boosterOdds } from '../core/boosters.js';
import { openSheet, esc, toast, confirmBox, fmt, bindActions } from '../ui/dom.js';
import { icon, sigil, picon } from '../ui/icons.js';
import { FORMS, formUnlocked } from '../core/forms.js';
import { relationsOf } from '../core/relations.js';

// Chance réelle d'obtenir cette carte précise dans un booster standard.
function oddsFor(cat, card) {
  const o = boosterOdds('standard');
  const n = cat.byRarity[card.rarity].length;
  const p = 1 - o.slots.reduce((q, s) => q * (1 - s.odds[card.rarity] / 100 / n), 1);
  return Math.round(1 / p);
}

const dateFr = (t) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export function openCardDetail(app, id, { list = null, variant = null } = {}) {
  const g = app.game, cat = app.catalog;
  let current = id;
  let shownVariant = variant;
  let stopTilt = () => {};
  let dtab = 'combat';
  const sheet = openSheet('', { full: true, cls: 'detail-sheet', label: 'Carte', onClose: () => { stopTilt(); app.refreshView && app.refreshView(); } });

  const odds = (card) => `Une chance sur <b>${oddsFor(cat, card).toLocaleString('fr-FR')}</b> de la trouver dans un booster standard (sans compter les garanties).`;
  function variantOdds(card) {
    const pCard = 1 / oddsFor(cat, card);
    return Object.entries(VARIANT_RATES).filter(([v]) => card.variants.includes(v)).map(([v, pct]) => {
      const n = Math.round(1 / (pCard * pct / 100));
      return `<div><span>${esc(VARIANTS[v].name)}</span><b>1 / ${n.toLocaleString('fr-FR')}</b></div>`;
    }).join('');
  }
  // Forme corrompue : présentation, condition d'éveil et choix de la forme emmenée au combat
  function formHTML(card) {
    const f = FORMS[card.id];
    if (!f) return '';
    const open = formUnlocked(g, card.id), on = g.formOf(card.id) === 'corrompue';
    return `<div class="fm-panel ${on ? 'on' : ''} ${open ? '' : 'locked'}"><span class="fm-k">${icon(open ? 'sparkle' : 'lock')} Forme corrompue</span>
      <b>${open ? esc(f.name) : 'Forme endormie'}</b><span class="small fm-t">${open ? esc(f.title) : `Pour l’éveiller : ${esc(f.condText.charAt(0).toLowerCase() + f.condText.slice(1))}.`}</span>
      ${open ? `<p class="small"><b>${esc(f.passiveName)}.</b> ${esc(f.passiveDesc)}</p><p class="lore small">« ${esc(f.lore)} »</p>
      <div class="seg fm-seg" role="group" aria-label="Forme au combat"><button class="seg-b" data-act="form" data-v="" aria-pressed="${!on}">Originelle</button><button class="seg-b" data-act="form" data-v="corrompue" aria-pressed="${on}">Corrompue</button></div>` : ''}</div>`;
  }
  // Relations de la créature : découvertes en combat, sinon seulement annoncées
  function relHTML(card) {
    const rs = relationsOf(card);
    if (!rs.length) return '';
    const T = { proie: 'Prédation', rival: 'Rivalité', legende: 'Légende' };
    return `<h3 class="section-title">Relations</h3><div class="stack">${rs.map((r) => (g.s.relations[r.key] ? `<div class="lr-e rel t-${r.type}"><span class="lr-type">${T[r.type]}</span><b>${esc(r.name)}</b><span class="small">${esc(r.desc)}</span></div>` : `<div class="lr-e locked"><b>${icon('lock')} ${T[r.type]} inconnue</b><span class="small muted">${r.type === 'legende' ? 'Réunis-la avec les créatures de son mythe et combats.' : 'Elle se révèle en combat.'}</span></div>`)).join('')}</div>`;
  }
  function draw() {
    stopTilt();
    const card = cat.get(current);
    const e = g.entry(current);
    const owned = !!e;
    const known = g.nameKnown(current);
    const fac = cat.faction[card.faction];
    const r = RARITY[card.rarity];
    if (owned && e.isNew) g.markSeen(current);
    const ownedVariants = owned ? Object.keys(e.v).filter((v) => e.v[v] > 0) : [];
    if (!shownVariant || !ownedVariants.includes(shownVariant)) shownVariant = owned ? g.shownVariant(current) : 'normal';
    const idx = list ? list.indexOf(current) : -1;
    const nav = list && list.length > 1 ? `<div class="detail-nav"><button class="icon-btn" data-act="prev" aria-label="Carte précédente" ${idx <= 0 ? 'disabled' : ''}>${icon('prev')}</button><span class="small muted">${idx + 1} / ${list.length}</span><button class="icon-btn" data-act="next" aria-label="Carte suivante" ${idx >= list.length - 1 ? 'disabled' : ''}>${icon('next')}</button></div>` : '';

    const variantsRow = owned ? `<div class="variant-row" role="group" aria-label="Variantes">${card.variants.map((v) => {
      const has = ownedVariants.includes(v);
      return `<button class="chip" data-act="variant" data-v="${v}" aria-pressed="${v === shownVariant}" ${has ? '' : 'disabled'} title="${has ? 'Afficher' : 'Pas encore obtenue'}">${has ? '' : icon('lock')}${VARIANTS[v].short}${has && e.v[v] > 1 ? ` ×${e.v[v]}` : ''}</button>`;
    }).join('')}</div>${ownedVariants.length > 1 ? (g.shownVariant(current) === shownVariant
      ? `<p class="small muted center dt-showv">${icon('check')} Apparence affichée partout</p>`
      : `<button class="btn small gold dt-showv" data-act="showv">${icon('eye')}Afficher cette apparence partout</button>`) : ''}` : '';

    let body;
    if (owned) {
      const line = card.evolution ? cat.lines[card.evolution.line] : null;
      const sets = card.sets.map((k) => cat.set[k]).filter(Boolean);
      const isAvatar = g.s.avatar === current;
      const inShow = g.s.showcase.includes(current);
      const inTeam = g.s.team.includes(current), li = g.cardLevelInfo(current);
      const tabs = [['combat', 'team', 'Combat'], ['story', 'history', 'Histoire'], ['rarity', 'crystal', 'Rareté']];
      const TAB = {
        combat: `${formHTML(card)}${combatHTML(g, card)}`,
        story: `<p class="lore big">« ${esc(card.lore)} »</p>
          <dl class="facts dt-facts"><div><dt>Catégorie</dt><dd>${esc(card.category)}</dd></div><div><dt>Faction</dt><dd><span class="fac-dot" style="color:${fac.colors.secondary}">${sigil(card.faction)}</span>${esc(fac.name)}</dd></div><div><dt>Découverte le</dt><dd>${dateFr(e.first)}</dd></div><div><dt>Numéro</dt><dd>${card.id}</dd></div></dl>
          ${relHTML(card)}
          ${line ? `<h3 class="section-title">${esc(line.name)}</h3><div class="strip">${line.cards.map((c) => cardHTML(c, { mystery: !g.owns(c.id), nameKnown: g.nameKnown(c.id) })).join('')}</div><p class="small muted">Stade ${card.evolution.stage} sur ${card.evolution.stages}.</p>` : ''}
          ${sets.length ? `<h3 class="section-title">Ensembles</h3><div class="stack">${sets.map((s) => { const p = g.setProgress(s.key); return `<a class="set-link panel" href="#/succes/ensembles"><b>${esc(s.name)}</b><span class="small muted">${p.owned} / ${p.total}${p.done ? ' · complété' : ''}</span><span class="progress"><i style="width:${(p.owned / p.total) * 100}%"></i></span></a>`; }).join('')}</div>` : ''}`,
        rarity: `<p>${odds(card)}</p><p class="small muted">Chance de la trouver dans une version spéciale, par booster standard :</p><div class="var-odds">${variantOdds(card)}</div>
          <p class="small muted">Les finitions ne s’obtiennent que dans les boosters (deux fois plus souvent dans un premium). Brûlée dans la Fournaise, une carte holographique vaut ×${ECONOMY.burnFinish.holo} cendres, or ×${ECONOMY.burnFinish.gold}, cosmique ×${ECONOMY.burnFinish.galaxy}.</p>`,
      };
      body = `
        <div class="dt-sum">
          <span class="dt-chip" style="--c:${r.color}">${r.name}</span>
          <span class="dt-chip" style="--c:${fac.colors.secondary}">${sigil(card.faction)}${esc(fac.name)}</span>
          <span class="dt-chip">×${e.n} exemplaire${e.n > 1 ? 's' : ''}</span>
          <span class="dt-chip gold">Niv. ${li.level}</span>
        </div>
        <button class="btn ${inTeam ? 'ghost' : 'primary'} block dt-team" data-act="team">${picon('team')}${inTeam ? 'Dans ton équipe · retirer' : 'Ajouter à mon équipe'}</button>
        <div class="dt-acts">
          <button class="dt-act ${isAvatar ? 'on' : ''}" data-act="avatar">${picon('avatar')}<span>${isAvatar ? 'Mon avatar' : 'Avatar'}</span></button>
          <button class="dt-act ${inShow ? 'on' : ''}" data-act="showcase">${picon('showcase')}<span>${inShow ? 'En vitrine' : 'Vitrine'}</span></button>
          <button class="dt-act" data-act="artonly">${picon('illus')}<span>Illustration</span></button>
          <button class="dt-act" data-act="burn">${picon('ritual')}<span>Brûler</span></button>
        </div>
        <div class="dt-tabs" role="tablist">${tabs.map(([k, ic, l]) => `<button class="dt-tab" role="tab" data-act="tab" data-v="${k}" aria-selected="${dtab === k}">${picon(ic)}<span>${l}</span></button>`).join('')}</div>
        <div class="panel dt-pane">${TAB[dtab]}</div>`;
    } else {
      const craft = ECONOMY.craftAsh[card.rarity];
      body = `
        <div class="panel detail-facts dt-sealed">
          <dl class="facts">
            <div><dt>Faction</dt><dd><span class="fac-dot" style="color:${fac.colors.secondary}">${sigil(card.faction)}</span>${esc(fac.name)}</dd></div>
            <div><dt>Rareté</dt><dd style="color:${r.color}">${r.name}</dd></div>
          </dl>
          <p class="small">Page encore scellée : trouve la carte dans un booster${craft ? ' ou invoque-la avec des cendres' : ''}. ${odds(card)}</p>
          <p class="small muted">Son nom se révèle quand tu possèdes la moitié de sa faction.</p>
        </div>
        ${craft ? `<button class="btn primary block" data-act="craft" ${g.s.ash < craft ? 'disabled' : ''}>${icon('ash')}Invoquer · ${fmt(craft)} cendres <small>(tu en as ${fmt(g.s.ash)})</small></button>` : '<p class="small muted center">Les cartes secrètes ne peuvent pas être invoquées : seul le hasard les révèle.</p>'}`;
    }
    sheet.setContent(`<div class="detail ${owned ? '' : 'is-sealed'}">
      ${nav}
      <div class="detail-card ${owned && g.formOf(current) ? 'fm-on' : ''}">${cardHTML(card, { size: 'full', variant: shownVariant, mystery: !owned, nameKnown: known })}${owned && g.formOf(current) ? `<span class="fm-badge">${esc(FORMS[current].name)}</span>` : ''}</div>
      ${owned ? `<p class="tilt-hint small muted">${icon('refresh')} Fais glisser ton doigt sur la carte pour la faire pivoter.</p>` : ''}
      ${variantsRow}
      <div class="detail-info">${body}</div>
    </div>`);
    stopTilt = enableTilt(sheet.body.querySelector('.detail-card'), { reduced: app.reduced() });
  }

  bindActions(sheet.body, {
    prev() { const i = list.indexOf(current); if (i > 0) { current = list[i - 1]; shownVariant = null; draw(); } },
    next() { const i = list.indexOf(current); if (i < list.length - 1) { current = list[i + 1]; shownVariant = null; draw(); } },
    variant(el) { shownVariant = el.dataset.v; draw(); },
    showv() { try { g.setShownVariant(current, shownVariant); app.sfx.tap(); toast(`Apparence <b>${esc(VARIANTS[shownVariant].name.toLowerCase())}</b> affichée partout.`, { icon: 'eye' }); draw(); } catch (err) { toast(esc(err.message), { kind: 'error' }); } },
    avatar() { g.setAvatar(current); toast('Avatar mis à jour.', { icon: 'user' }); draw(); },
    showcase() { g.toggleShowcase(current); draw(); },
    team() { if (toggleTeam(app, current)) draw(); },
    burn() { openBurn(app, current, { onClose: () => { shownVariant = null; draw(); } }); },
    lvup() { if (upgradeCard(app, current)) draw(); },
    tab(el) { dtab = el.dataset.v; draw(); },
    form(el) {
      try { g.setForm(current, el.dataset.v || null); app.sfx.discover?.(); toast(el.dataset.v ? `<b>${esc(FORMS[current].name)}</b> combattra sous sa forme corrompue.` : 'Elle combattra sous sa forme originelle.', { icon: 'sparkle' }); draw(); }
      catch (err) { toast(esc(err.message), { kind: 'error' }); }
    },
    artonly(el) {
      const c = sheet.body.querySelector('.detail-card .tcg');
      const on = c.classList.toggle('art-only');
      el.querySelector('span').textContent = on ? 'Texte' : 'Illustration';
      if (on) sheet.el.scrollTo({ top: 0, behavior: 'smooth' });
    },
    async craft() {
      const card = cat.get(current);
      const cost = ECONOMY.craftAsh[card.rarity];
      if (!(await confirmBox(`Invoquer cette carte pour <b>${fmt(cost)} cendres</b> ?`, { ok: 'Invoquer' }))) return;
      try { g.craft(current); app.sfx.reveal(card.rarity); toast(`<b>${esc(card.name)}</b> rejoint ta collection.`, { kind: 'success', icon: 'sparkle' }); draw(); }
      catch (err) { app.sfx.error(); toast(esc(err.message), { kind: 'error' }); }
    },
    decipher() {
      try { g.decipher(current); toast(`Nom déchiffré : <b>${esc(cat.get(current).name)}</b>`, { icon: 'eye' }); draw(); }
      catch (err) { toast(esc(err.message), { kind: 'error' }); }
    },
  });
  // Ouvre une carte de la lignée
  sheet.body.addEventListener('click', (ev) => {
    const t = ev.target.closest('.strip .tcg');
    if (t) { current = t.dataset.id; shownVariant = null; draw(); sheet.el.scrollTop = 0; }
  });
  // Balayage horizontal pour naviguer
  let sx = null;
  sheet.body.addEventListener('touchstart', (ev) => { if (!ev.target.closest('.detail-card')) sx = ev.touches[0].clientX; }, { passive: true });
  sheet.body.addEventListener('touchend', (ev) => {
    if (sx === null || !list) return;
    const dx = ev.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 70) sheet.body.querySelector(`[data-act="${dx < 0 ? 'next' : 'prev'}"]`)?.click();
  });
  draw();
  return sheet;
}
