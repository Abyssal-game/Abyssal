// Vue détaillée d'une carte (fenêtre plein écran) : grand format, variantes,
// lore, capacités, lignée, ensembles, actions.
import { combatHTML, toggleTeam } from './army.js';
import { RARITY, VARIANTS, ECONOMY, VARIANT_RATES } from '../config.js';
import { openBurn, upgradeCard } from './furnace.js';
import { cardHTML, enableTilt } from '../ui/card.js';
import { boosterOdds } from '../core/boosters.js';
import { openSheet, esc, toast, confirmBox, fmt, bindActions } from '../ui/dom.js';
import { FINISHES } from '../core/codex.js';
import { icon, sigil, picon, setIcon } from '../ui/icons.js';
import { FORMS, formUnlocked } from '../core/forms.js';
import { relationsOf } from '../core/relations.js';
import { fameTier, fameNext, FAME_TIERS } from '../core/renown.js';

// Chance réelle d'obtenir cette carte précise dans un booster standard.
function oddsFor(cat, card) {
  const o = boosterOdds('standard');
  const n = cat.byRarity[card.rarity].length;
  const p = 1 - o.slots.reduce((q, s) => q * (1 - s.odds[card.rarity] / 100 / n), 1);
  return Math.round(1 / p);
}

const DATE_FR = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); /* v576 : un seul formateur (en créer un à chaque date coûtait ~20 ms) */
const dateFr = (t) => DATE_FR.format(new Date(t));

// Renommée : palier, points et prochain palier
function fameHTML(pts) {
  const t = fameTier(pts), nx = fameNext(pts), prev = t ? FAME_TIERS[t - 1].n : 0;
  return `<div class="panel dt-fame fm${t}"><span class="dt-fame-ic">${t ? `<img alt="" src="assets/icons/fame-${t}.webp" onerror="this.replaceWith(document.createTextNode('★'))">` : '★'}</span>
    <span class="dt-fame-tx"><b>${t ? `Renommée : ${FAME_TIERS[t - 1].name}` : 'Renommée'}</b><span class="small muted">${nx ? `${pts} / ${nx.n} pour devenir ${nx.name} · +1 par victoire de Descente où elle reste debout (+2 contre une élite ou un gardien)` : `${pts} points · le plus haut palier`}</span>
    ${nx ? `<span class="progress"><i style="width:${((pts - prev) / (nx.n - prev)) * 100}%"></i></span>` : ''}</span></div>`;
}

// Défis de la créature : trois objectifs, chacun récompensé en cendres et en Renommée
function challengesHTML(g, id) {
  return `<div class="panel dt-ch"><b class="dt-ch-h">${icon('star')} Ses défis</b>${g.challenges(id).map((x) => `<div class="dt-ch-r ${x.claimed ? 'done' : x.ok ? 'ok' : ''}">
    <span class="dt-ch-t"><b>${esc(x.name)}</b><span class="small muted">${esc(x.desc)} · ${x.v} / ${x.n}</span>${x.claimed ? '' : `<span class="progress"><i style="width:${(x.v / x.n) * 100}%"></i></span>`}</span>
    ${x.claimed ? `<span class="small dc-good">${icon('check')} Fait</span>` : x.ok ? `<button class="btn small gold" data-act="chal" data-k="${x.key}">+${x.ash} ${icon('ash')}</button>` : `<span class="small muted">${icon('ash')} ${x.ash}</span>`}</div>`).join('')}</div>`;
}

export function openCardDetail(app, id, { list = null, variant = null } = {}) {
  const g = app.game, cat = app.catalog;
  let current = id;
  let shownVariant = variant;
  let stopTilt = () => {};
  // v348 : la fiche se rouvre sur le dernier onglet consulté (Histoire pour qui lit les légendes, Combat pour les stratèges)
  let dtab = (() => { try { return localStorage.getItem('abyssal.dtab') || 'combat'; } catch (e) { return 'combat'; } })();
  const sheet = openSheet('', { full: true, cls: 'detail-sheet', label: 'Carte', onClose: () => { stopTilt(); app.refreshView && app.refreshView(); } });

  const odds = (card) => `Une chance sur <b>${oddsFor(cat, card).toLocaleString('fr-FR')}</b> de la trouver dans un booster standard (sans compter les garanties).`;
  function variantOdds(card) {
    const pCard = 1 / oddsFor(cat, card);
    return Object.entries(VARIANT_RATES).filter(([v]) => card.variants.includes(v)).map(([v, pct]) => {
      const n = Math.round(1 / (pCard * pct / 100));
      return `<div><span>${esc(VARIANTS[v].name)}</span><b>1 / ${n.toLocaleString('fr-FR')}</b></div>`;
    }).join('');
  }
  // v280 : chance qu'un booster standard (3 cartes) contienne au moins une carte de cette finition
  const anyOdds = (v) => Math.round(1 / (1 - (1 - VARIANT_RATES[v] / 100) ** 3));
  // v280 : Sublimer — la finition suivante ; v615 : contre des obsidiennes (seulement quand l'Échoppe est ouverte)
  const OBS = '<img class="obs-i" alt="" src="assets/icons/obsidienne.webp">';
  function sublimeHTML() {
    const x = g.shopOn() && g.sublimeInfo(current);
    if (!x) return '';
    const can = g.obs() >= x.cost;
    return `<div class="panel dt-sub"><b>${icon('sparkle')} Sublimer en ${esc(VARIANTS[x.to].name.toLowerCase())}</b>
      <span class="small muted">Tu la possèdes en ${esc(VARIANTS[x.from].name.toLowerCase())} : obtiens un exemplaire ${esc(VARIANTS[x.to].name.toLowerCase())} contre des obsidiennes. Ta carte actuelle est conservée.</span>
      <button class="btn small ${can ? 'gold' : ''}" data-act="sub" ${can ? '' : 'disabled'}>Sublimer · ${x.cost.toLocaleString('fr-FR')} ${OBS}${can ? '' : ` · tu en as ${g.obs().toLocaleString('fr-FR')}`}</button></div>`;
  }
  // Forme corrompue : présentation, condition d'éveil et choix de la forme emmenée au combat
  function formHTML(card) {
    const f = FORMS[card.id];
    if (!f) return '';
    const open = formUnlocked(g, card.id), on = g.formOf(card.id) === 'corrompue';
    return `<div class="fm-panel ${on ? 'on' : ''} ${open ? '' : 'locked'}"><span class="fm-k">${icon(open ? 'sparkle' : 'lock')} Forme corrompue</span>
      <b>${open ? esc(f.name) : 'Forme endormie'}</b><span class="small fm-t">${open ? esc(f.title) : `Pour la libérer : ${esc(f.condText.charAt(0).toLowerCase() + f.condText.slice(1))}.`}</span>
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

    const variantsRow = owned ? `<div class="variant-row" role="group" aria-label="Finitions">${['normal', 'holo', 'gold', 'galaxy', 'crystal', 'prism'].filter((v) => card.variants.includes(v)).map((v) => { // v288 : ordre de rareté
      const has = ownedVariants.includes(v);
      return `<button class="chip" data-act="variant" data-v="${v}" aria-pressed="${v === shownVariant}" ${has ? '' : 'disabled'} title="${has ? 'Afficher' : 'Pas encore obtenue'}">${has ? '' : icon('lock')}${VARIANTS[v].short}${has && e.v[v] > 1 ? ` ×${e.v[v]}` : ''}</button>`;
    }).join('')}</div>${ownedVariants.length > 1 ? (g.shownVariant(current) === shownVariant
      ? `<p class="small muted center dt-showv">${icon('check')} Apparence affichée partout</p>`
      : `<button class="btn small gold dt-showv" data-act="showv">${icon('eye')}Afficher cette apparence partout</button>`) : ''}` : '';

    /* v482 : habillage (finition de prestige achetée à l'Échoppe) */
    const fins = owned ? (g.s.finishes || []).filter((k) => FINISHES[k]) : [];
    const cur = g.s.dress?.[current] || null;
    const dressRow = false && fins.length ? /* v569 : finitions retirées */ `<div class="dt-dress"><span class="small muted">Finition de prestige</span><div class="chips">${[[null, 'Aucune'], ...fins.map((k) => [k, FINISHES[k].name])].map(([k, n]) => `<button class="chip" data-act="dress" data-v="${k || ''}" aria-pressed="${cur === k}">${esc(n)}</button>`).join('')}</div></div>` : '';

    let body;
    if (owned) {
      const line = card.evolution ? cat.lines[card.evolution.line] : null;
      const sets = card.sets.map((k) => cat.set[k]).filter(Boolean);
      const li = g.cardLevelInfo(current);
      const tabs = [['combat', 'team', 'Combat'], ['chal', 'feats', 'Défis'], ['story', 'history', 'Histoire'], ['rarity', 'crystal', 'Rareté']];
      const TAB = {
        combat: `${formHTML(card)}${combatHTML(g, card)}`,
        chal: `${fameHTML(g.fameOf(current))}${challengesHTML(g, current)}`,
        story: `<p class="lore big">« ${esc(card.lore)} »</p>
          <dl class="facts dt-facts"><div><dt>Catégorie</dt><dd>${esc(card.category)}</dd></div><div><dt>Faction</dt><dd><span class="fac-dot" style="color:${fac.colors.secondary}">${sigil(card.faction)}</span>${esc(fac.name)}</dd></div><div><dt>Découverte le</dt><dd>${dateFr(e.first)}</dd></div><div><dt>Numéro</dt><dd>${card.id}</dd></div></dl>
          ${relHTML(card)}
          ${line ? `<h3 class="section-title">${esc(line.name)}</h3><div class="strip">${line.cards.map((c) => cardHTML(c, { mystery: !g.owns(c.id), nameKnown: g.nameKnown(c.id) })).join('')}</div><p class="small muted">Stade ${card.evolution.stage} sur ${card.evolution.stages}.</p>` : ''}
          ${sets.length ? `<h3 class="section-title">Ensembles</h3><div class="stack">${sets.map((s) => { const p = g.setProgress(s.key); return `<a class="set-link panel" href="#/succes/ensembles"><b class="set-h">${setIcon(s.key)}<span>${esc(s.name)}</span></b><span class="small muted">${p.owned} / ${p.total}${p.done ? ' · complété' : ''}</span><span class="progress"><i style="width:${(p.owned / p.total) * 100}%"></i></span></a>`; }).join('')}</div>` : ''}`,
        rarity: `<p>${odds(card)}</p><p class="small muted">Chance de la trouver dans une version spéciale, par booster standard :</p><div class="var-odds">${variantOdds(card)}</div>
          <p class="small muted">Toutes cartes confondues, environ un booster standard sur ${anyOdds('holo')} contient une argentée, un sur ${anyOdds('gold')} une enluminée, un sur ${anyOdds('galaxy')} une abyssale, un sur ${anyOdds('crystal')} une cristalline et un sur ${anyOdds('prism')} une prismatique (deux fois plus souvent dans un premium).</p>
          ${sublimeHTML()}
          <p class="small muted">Brûlée dans la Fournaise, une carte argentée vaut ×${ECONOMY.burnFinish.holo} cendres, enluminée ×${ECONOMY.burnFinish.gold}, abyssale ×${ECONOMY.burnFinish.galaxy}, cristalline ×${ECONOMY.burnFinish.crystal}, prismatique ×${ECONOMY.burnFinish.prism}.</p>`,
      };
      body = `
        <div class="dt-sum">
          <span class="dt-chip" style="--c:${r.color}">${r.name}</span>
          <span class="dt-chip" style="--c:${fac.colors.secondary}">${sigil(card.faction)}${esc(fac.name)}</span>
          <span class="dt-chip">×${e.n} exemplaire${e.n > 1 ? 's' : ''}</span>
          <span class="dt-chip gold">Niv. ${li.level}${li.level >= li.max ? ' · Apogée' : ''}</span>
          <span class="dt-acts"><button class="dt-chip dt-chipb ${g.isFav(current) ? 'on' : ''}" data-act="fav" aria-pressed="${g.isFav(current)}">${icon('star')}Favori</button>
          <button class="dt-chip dt-chipb ${g.s.showcase.includes(current) ? 'on' : ''}" data-act="showcase" aria-pressed="${g.s.showcase.includes(current)}">${picon('showcase')}Vitrine</button>
          <button class="dt-chip dt-chipb burn" data-act="burn">${picon('furnace')}Brûler</button></span>
        </div>
        <div class="dt-tabs" role="tablist">${tabs.map(([k, ic, l]) => `<button class="dt-tab" role="tab" data-act="tab" data-v="${k}" aria-selected="${dtab === k}">${picon(ic)}<span>${l}</span></button>`).join('')}</div>
        <div class="panel dt-pane">${TAB[dtab] || TAB.combat}</div>`;
    } else {
      body = `
        <div class="panel detail-facts dt-sealed">
          <dl class="facts">
            <div><dt>Faction</dt><dd><span class="fac-dot" style="color:${fac.colors.secondary}">${sigil(card.faction)}</span>${esc(fac.name)}</dd></div>
            <div><dt>Rareté</dt><dd style="color:${r.color}">${r.name}</dd></div>
          </dl>
          <p class="small">Page encore scellée : trouve la carte dans un booster ou dans la Descente. ${odds(card)}</p>
          <p class="small muted">Son nom se révèle quand tu possèdes la moitié de sa faction.</p>
        </div>`;
    }
    sheet.setContent(`<div class="detail ${owned ? '' : 'is-sealed'}">
      ${nav}
      <div class="detail-card ${owned && g.formOf(current) ? 'fm-on' : ''}">${cardHTML(card, { size: 'full', variant: shownVariant, mystery: !owned, nameKnown: known })}${owned && g.formOf(current) ? `<span class="fm-badge">${esc(FORMS[current].name)}</span>` : ''}</div>
      ${owned ? `<p class="tilt-hint small muted">${icon('refresh')} Touche la carte pour masquer ou remettre son texte · fais-la glisser pour la faire pivoter.</p>` : ''}
      ${variantsRow}
      ${dressRow}
      <div class="detail-info">${body}</div>
    </div>`);
    stopTilt = enableTilt(sheet.body.querySelector('.detail-card'), { reduced: app.reduced() });
  }

  bindActions(sheet.body, {
    prev() { const i = list.indexOf(current); if (i > 0) { current = list[i - 1]; shownVariant = null; draw(); } },
    next() { const i = list.indexOf(current); if (i < list.length - 1) { current = list[i + 1]; shownVariant = null; draw(); } },
    variant(el) { shownVariant = el.dataset.v; draw(); },
    dress(el) { try { const k = el.dataset.v || null; g.setDress(current, k); app.sfx?.tap?.(); toast(k ? `Finition <b>${esc(FINISHES[k].name)}</b> posée sur cette carte.` : 'Finition retirée.', { icon: 'sparkle' }); draw(); } catch (err) { toast(esc(err.message), { kind: 'error' }); } },
    sub() { try { const x = g.sublime(current); shownVariant = x.to; app.sfx?.levelup?.(); toast(`Carte sublimée : la voici en <b>${esc(VARIANTS[x.to].name.toLowerCase())}</b> (−${x.cost.toLocaleString('fr-FR')} obsidiennes).`, { kind: 'success', icon: 'sparkle' }); draw(); } catch (err) { toast(esc(err.message), { kind: 'error' }); } },
    showv() { try { g.setShownVariant(current, shownVariant); app.sfx.tap(); toast(`Apparence <b>${esc(VARIANTS[shownVariant].name.toLowerCase())}</b> affichée partout.`, { icon: 'eye' }); draw(); } catch (err) { toast(esc(err.message), { kind: 'error' }); } },
    fav() { const on = g.toggleFav(current); app.sfx?.tap?.(); toast(on ? 'Ajoutée à tes favoris : elle ne pourra pas être brûlée par erreur.' : 'Retirée de tes favoris.', { icon: 'star' }); draw(); },
    chal(el) { try { const x = g.claimChallenge(current, el.dataset.k); app.sfx?.levelup?.(); toast(`Défi « ${esc(x.name)} » réussi : <b>+${x.ash} cendres</b> et +${x.fame} Renommée`, { kind: 'success', icon: 'ash' }); draw(); } catch (e) { toast(esc(e.message), { kind: 'error' }); } },
    showcase() { const was = g.s.showcase.includes(current); g.toggleShowcase(current); app.sfx?.tap?.(); toast(was ? 'Retirée de ta vitrine.' : 'Mise en vitrine sur ton profil (3 cartes au plus).', { icon: 'star' }); draw(); }, /* v404 */
    burn() { openBurn(app, current, { onClose: () => { shownVariant = null; draw(); } }); },
    lvup() { if (upgradeCard(app, current)) draw(); },
    tab(el) { dtab = el.dataset.v; try { localStorage.setItem('abyssal.dtab', dtab); } catch (e) { /* rien */ } draw(); },
    form(el) {
      try { g.setForm(current, el.dataset.v || null); app.sfx.discover?.(); toast(el.dataset.v ? `<b>${esc(FORMS[current].name)}</b> combattra sous sa forme corrompue.` : 'Elle combattra sous sa forme originelle.', { icon: 'sparkle' }); draw(); }
      catch (err) { toast(esc(err.message), { kind: 'error' }); }
    },
    decipher() {
      try { g.decipher(current); toast(`Nom déchiffré : <b>${esc(cat.get(current).name)}</b>`, { icon: 'eye' }); draw(); }
      catch (err) { toast(esc(err.message), { kind: 'error' }); }
    },
  });
  // Toucher la carte (sans la faire glisser) : masque ou remet son texte (v252)
  let dp = null;
  sheet.body.addEventListener('pointerdown', (ev) => { dp = ev.target.closest('.detail-card .tcg') ? { x: ev.clientX, y: ev.clientY, t: Date.now() } : null; }, { passive: true });
  sheet.body.addEventListener('click', (ev) => {
    const c = ev.target.closest('.detail-card .tcg');
    if (!c || !dp || Math.hypot(ev.clientX - dp.x, ev.clientY - dp.y) > 10 || Date.now() - dp.t > 600) return;
    c.classList.toggle('art-only'); app.sfx?.tap?.();
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
