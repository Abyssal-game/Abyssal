// Vue détaillée d'une carte (fenêtre plein écran) : grand format, variantes,
// lore, capacités, lignée, ensembles, actions.
import { RARITY, VARIANTS, ECONOMY } from '../config.js';
import { cardHTML, enableTilt, abilityText } from '../ui/card.js';
import { openSheet, esc, toast, confirmBox, fmt, bindActions } from '../ui/dom.js';
import { icon, sigil } from '../ui/icons.js';

const dateFr = (t) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export function openCardDetail(app, id, { list = null, variant = null } = {}) {
  const g = app.game, cat = app.catalog;
  let current = id;
  let shownVariant = variant;
  let stopTilt = () => {};
  const sheet = openSheet('', { full: true, cls: 'detail-sheet', label: 'Carte', onClose: () => { stopTilt(); app.refreshView && app.refreshView(); } });

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
      const ab = card.abilities.map(abilityText);
      const line = card.evolution ? cat.lines[card.evolution.line] : null;
      const sets = card.sets.map((k) => cat.set[k]).filter(Boolean);
      const isAvatar = g.s.avatar === current;
      const inShow = g.s.showcase.includes(current);
      body = `
        <div class="detail-actions row gap wrap">
          <button class="btn small ${isAvatar ? 'gold' : ''}" data-act="avatar">${icon('user')}${isAvatar ? 'Avatar actuel' : 'Choisir comme avatar'}</button>
          <button class="btn small" data-act="artonly">${icon('eye')}Voir l’illustration</button>
          <button class="btn small ${inShow ? 'gold' : ''}" data-act="showcase">${icon('pin')}${inShow ? 'En vitrine' : 'Mettre en vitrine'}</button>
        </div>
        <div class="panel detail-facts">
          <dl class="facts">
            <div><dt>Faction</dt><dd><span class="fac-dot" style="color:${fac.colors.secondary}">${sigil(card.faction)}</span>${esc(fac.name)}</dd></div>
            <div><dt>Rareté</dt><dd style="color:${r.color}">${r.name}</dd></div>
            <div><dt>Catégorie</dt><dd>${esc(card.category)}</dd></div>
            <div><dt>Exemplaires</dt><dd>${e.n}</dd></div>
            <div><dt>Découverte</dt><dd>${dateFr(e.first)}</dd></div>
            <div><dt>Collection</dt><dd>${card.id}</dd></div>
          </dl>
        </div>
        <h3 class="section-title">Description</h3>
        <p class="lore big">« ${esc(card.lore)} »</p>
        <p>${esc(card.visual)}</p>
        <h3 class="section-title">Combat</h3>
        <div class="statbars">${[['atk', 'Attaque', 12], ['def', 'Défense', 8], ['spd', 'Vitesse', 10], ['mag', 'Magie', 10], ['hp', 'Points de vie', 26], ['cost', 'Coût d’invocation', 10]].map(([k, l, max]) => `<div class="sb"><span>${l}</span><span class="progress" aria-hidden="true"><i style="width:${(card.stats[k] / max) * 100}%;--bar:${r.color}"></i></span><b>${card.stats[k]}</b></div>`).join('')}</div>
        ${ab.length ? `<ul class="abil-list">${ab.map((a) => `<li><b>${esc(a.name)}</b> — ${esc(a.desc)}</li>`).join('')}</ul>` : '<p class="muted">Aucune capacité particulière : sa force est dans ses statistiques.</p>'}
        <p class="small"><b style="color:${fac.colors.secondary}">Passif ${esc(fac.name)} · ${esc(fac.passive.name)}</b> — ${esc(fac.passive.desc)}</p>
        ${line ? `<h3 class="section-title">${esc(line.name)}</h3><div class="strip">${line.cards.map((c) => cardHTML(c, { mystery: !g.owns(c.id), nameKnown: g.nameKnown(c.id) })).join('')}</div><p class="small muted">Stade ${card.evolution.stage} sur ${card.evolution.stages}. Les stades sont des cartes distinctes à collectionner.</p>` : ''}
        ${sets.length ? `<h3 class="section-title">Ensembles</h3><div class="stack">${sets.map((s) => { const p = g.setProgress(s.key); return `<a class="set-link panel" href="#/succes/ensembles"><b>${esc(s.name)}</b><span class="small muted">${p.owned} / ${p.total}${p.done ? ' · complété' : ''}</span><span class="progress"><i style="width:${(p.owned / p.total) * 100}%"></i></span></a>`; }).join('')}</div>` : ''}
        <details class="prompt-box"><summary>${icon('scroll')} Fiche d’illustration</summary><p class="small">Illustration actuelle : ${card.image && app.hasRealArt?.(card.id) ? 'définitive' : 'provisoire, générée par le jeu'}. Fichier attendu : <code>${esc(card.image)}</code></p><p class="small muted">${esc(card.artPrompt)}</p></details>`;
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
    artonly(el) {
      const c = sheet.body.querySelector('.detail-card .tcg');
      const on = c.classList.toggle('art-only');
      el.lastChild.textContent = on ? 'Afficher le texte' : 'Voir l’illustration';
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
  sheet.body.addEventListener('click', (ev) => {
    if (ev.target.closest('.detail-card .tcg') && g.owns(current)) sheet.body.querySelector('[data-act="artonly"]')?.click();
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
