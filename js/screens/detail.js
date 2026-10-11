// Vue détaillée d'une carte (fenêtre plein écran) : grand format, variantes,
// lore, capacités, lignée, ensembles, actions.
import { combatHTML, toggleTeam } from './army.js';
import { RARITY, VARIANTS, ECONOMY, VARIANT_RATES } from '../config.js';
import { openRitual } from './ritual.js';
import { cardHTML, enableTilt } from '../ui/card.js';
import { boosterOdds } from '../core/boosters.js';
import { openSheet, esc, toast, confirmBox, fmt, bindActions } from '../ui/dom.js';
import { icon, sigil, picon } from '../ui/icons.js';

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
  // Version à élever : celle affichée si elle est sur l'échelle du rituel, sinon la version normale.
  function ritualFrom() {
    const e = g.entry(current);
    if (!e) return null;
    for (const v of [shownVariant, 'normal', 'holo', 'gold']) if (e.v[v] > 0 && g.ritualTarget(current, v)) return v;
    return null;
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
    if (!shownVariant || !ownedVariants.includes(shownVariant)) shownVariant = ownedVariants.includes('normal') ? 'normal' : ownedVariants[0] || 'normal';
    const idx = list ? list.indexOf(current) : -1;
    const nav = list && list.length > 1 ? `<div class="detail-nav"><button class="icon-btn" data-act="prev" aria-label="Carte précédente" ${idx <= 0 ? 'disabled' : ''}>${icon('prev')}</button><span class="small muted">${idx + 1} / ${list.length}</span><button class="icon-btn" data-act="next" aria-label="Carte suivante" ${idx >= list.length - 1 ? 'disabled' : ''}>${icon('next')}</button></div>` : '';

    const variantsRow = owned ? `<div class="variant-row" role="group" aria-label="Variantes">${card.variants.map((v) => {
      const has = ownedVariants.includes(v);
      return `<button class="chip" data-act="variant" data-v="${v}" aria-pressed="${v === shownVariant}" ${has ? '' : 'disabled'} title="${has ? 'Afficher' : 'Pas encore obtenue'}">${has ? '' : icon('lock')}${VARIANTS[v].short}${has && e.v[v] > 1 ? ` ×${e.v[v]}` : ''}</button>`;
    }).join('')}</div>` : '';

    let body;
    if (owned) {
      const line = card.evolution ? cat.lines[card.evolution.line] : null;
      const sets = card.sets.map((k) => cat.set[k]).filter(Boolean);
      const isAvatar = g.s.avatar === current;
      const inShow = g.s.showcase.includes(current);
      const inTeam = g.s.team.includes(current), li = g.cardLevelInfo(current);
      const rit = ritualFrom();
      const tabs = [['combat', 'swords', 'Combat'], ['story', 'book', 'Histoire'], ['rarity', 'crystal', 'Rareté']];
      const TAB = {
        combat: `${combatHTML(g, card)}`,
        story: `<p class="lore big">« ${esc(card.lore)} »</p>
          <dl class="facts dt-facts"><div><dt>Catégorie</dt><dd>${esc(card.category)}</dd></div><div><dt>Faction</dt><dd><span class="fac-dot" style="color:${fac.colors.secondary}">${sigil(card.faction)}</span>${esc(fac.name)}</dd></div><div><dt>Découverte le</dt><dd>${dateFr(e.first)}</dd></div><div><dt>Numéro</dt><dd>${card.id}</dd></div></dl>
          ${line ? `<h3 class="section-title">${esc(line.name)}</h3><div class="strip">${line.cards.map((c) => cardHTML(c, { mystery: !g.owns(c.id), nameKnown: g.nameKnown(c.id) })).join('')}</div><p class="small muted">Stade ${card.evolution.stage} sur ${card.evolution.stages}.</p>` : ''}
          ${sets.length ? `<h3 class="section-title">Ensembles</h3><div class="stack">${sets.map((s) => { const p = g.setProgress(s.key); return `<a class="set-link panel" href="#/succes/ensembles"><b>${esc(s.name)}</b><span class="small muted">${p.owned} / ${p.total}${p.done ? ' · complété' : ''}</span><span class="progress"><i style="width:${(p.owned / p.total) * 100}%"></i></span></a>`; }).join('')}</div>` : ''}`,
        rarity: `<p>${odds(card)}</p><p class="small muted">Chance de la trouver dans une version spéciale, par booster standard :</p><div class="var-odds">${variantOdds(card)}</div>
          ${rit ? `<div class="panel ri-cta"><div><b>${icon('sparkle')} Rituel d’élévation</b><p class="small muted">Sacrifie des doublons pour la faire passer en ${esc(VARIANTS[g.ritualTarget(current, rit)].name.toLowerCase())}.</p></div><button class="btn primary small" data-act="ritual">Élever</button></div>` : ''}`,
      };
      body = `
        <div class="dt-sum">
          <span class="dt-chip" style="--c:${r.color}">${r.name}</span>
          <span class="dt-chip" style="--c:${fac.colors.secondary}">${sigil(card.faction)}${esc(fac.name)}</span>
          <span class="dt-chip">×${e.n} exemplaire${e.n > 1 ? 's' : ''}</span>
          <span class="dt-chip gold">Niv. ${li.level}</span>
        </div>
        <button class="btn ${inTeam ? 'ghost' : 'primary'} block dt-team" data-act="team">${icon('swords')}${inTeam ? 'Dans ton équipe · retirer' : 'Ajouter à mon équipe'}</button>
        <div class="dt-acts">
          <button class="dt-act ${isAvatar ? 'on' : ''}" data-act="avatar">${picon('seal')}<span>${isAvatar ? 'Mon avatar' : 'Avatar'}</span></button>
          <button class="dt-act ${inShow ? 'on' : ''}" data-act="showcase">${picon('crown')}<span>${inShow ? 'En vitrine' : 'Vitrine'}</span></button>
          <button class="dt-act" data-act="artonly">${picon('holo')}<span>Illustration</span></button>
          ${rit ? `<button class="dt-act" data-act="ritual">${picon('ritual')}<span>Élever</span></button>` : ''}
        </div>
        <div class="dt-tabs" role="tablist">${tabs.map(([k, ic, l]) => `<button class="dt-tab" role="tab" data-act="tab" data-v="${k}" aria-selected="${dtab === k}">${picon(ic)}<span>${l}</span></button>`).join('')}</div>
        <div class="panel dt-pane">${TAB[dtab]}</div>`;
    } else {
      const craft = ECONOMY.craftAsh[card.rarity];
      body = `
        <div class="panel detail-facts">
          <dl class="facts">
            <div><dt>Faction</dt><dd><span class="fac-dot" style="color:${fac.colors.secondary}">${sigil(card.faction)}</span>${esc(fac.name)}</dd></div>
            <div><dt>Rareté</dt><dd style="color:${r.color}">${r.name}</dd></div>
            <div><dt>Nom</dt><dd>${known ? esc(card.name) : 'Inconnu'}</dd></div>
            <div><dt>Collection</dt><dd>${card.id}</dd></div>
          </dl>
        </div>
        <p class="lore">Cette page du Bestiaire est encore scellée. Trouve la carte dans un booster${craft ? ', ou invoque-la avec des cendres' : ''}.</p>
        <p class="small">${icon('swords')} Une fois obtenue, elle peut combattre dans ton équipe, et tes créatures lui font +1 dégât dans l’Abysse.</p>
        <p class="small">${odds(card)}</p>
        <p class="small muted">Les noms d’une faction se révèlent quand tu en possèdes la moitié. Tu peux aussi déchiffrer un nom pour ${ECONOMY.decipherAsh} cendres.</p>
        <div class="row gap wrap">
          ${craft ? `<button class="btn primary" data-act="craft" ${g.s.ash < craft ? 'disabled' : ''}>${icon('ash')}Invoquer · ${fmt(craft)} cendres</button>` : '<p class="small muted">Les cartes secrètes ne peuvent pas être invoquées : seul le hasard les révèle.</p>'}
          ${known ? '' : `<button class="btn" data-act="decipher" ${g.s.ash < ECONOMY.decipherAsh ? 'disabled' : ''}>${icon('eye')}Déchiffrer le nom · ${ECONOMY.decipherAsh}</button>`}
        </div>
        <p class="small muted">Tu possèdes ${fmt(g.s.ash)} cendres. Les doublons obtenus dans les boosters en rapportent.</p>`;
    }
    sheet.setContent(`<div class="detail">
      ${nav}
      <div class="detail-card">${cardHTML(card, { size: 'full', variant: shownVariant, mystery: !owned, nameKnown: known })}</div>
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
    avatar() { g.setAvatar(current); toast('Avatar mis à jour.', { icon: 'user' }); draw(); },
    showcase() { g.toggleShowcase(current); draw(); },
    team() { if (toggleTeam(app, current)) draw(); },
    ritual() { openRitual(app, current, ritualFrom(), { onClose: () => { shownVariant = null; draw(); } }); },
    tab(el) { dtab = el.dataset.v; draw(); },
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
