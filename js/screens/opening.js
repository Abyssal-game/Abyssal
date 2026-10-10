// Ouverture de booster : sceau à briser, révélation carte par carte ou d'un coup,
// effets selon la rareté, récapitulatif. Les cartes sont déjà enregistrées
// dans la sauvegarde avant la première animation.
import { BOOSTERS, RARITY, VARIANTS } from '../config.js';
import { cardHTML, enableTilt } from '../ui/card.js';
import { icon, EMBLEM } from '../ui/icons.js';
import { esc, fmt, toast } from '../ui/dom.js';
import { packHTML, payLabel } from './shop.js';

const RI = (r) => ['C', 'PC', 'R', 'HR', 'M', 'S'].indexOf(r);

export function openPack(app, type, { faction, onDone } = {}) {
  const g = app.game, cat = app.catalog;
  app.pendingProgress = [];
  let result;
  try {
    result = g.openBooster(type, { faction });
  } catch (e) {
    app.pendingProgress = null;
    app.sfx.error();
    toast(esc(e.message), { kind: 'error', icon: 'info' });
    return;
  }
  const { opening } = result;
  const reduced = app.reduced();
  const fast = g.s.settings.fastOpen;
  const def = BOOSTERS[type];
  const ev = g.event();

  const el = document.createElement('div');
  el.className = 'opening';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', `Ouverture : ${def.name}`);
  el.innerHTML = `<div class="op-bg"></div><div class="op-rays"></div>
    <header class="op-top"><span class="op-title">${esc(def.name)}</span><button class="btn small ghost" data-op="all">${icon('skip')}Tout révéler</button></header>
    <div class="op-stage" aria-live="polite"></div>
    <footer class="op-bottom"><div class="op-dots">${opening.cards.map(() => '<i></i>').join('')}</div><p class="op-hint small muted"></p></footer>`;
  document.body.appendChild(el);
  document.body.classList.add('has-sheet');
  const stage = el.querySelector('.op-stage');
  const hint = el.querySelector('.op-hint');
  const dots = el.querySelectorAll('.op-dots i');
  let index = 0, phase = 'pack', busy = false;

  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 30) : ms));

  function statusLine(c) {
    const r = RARITY[c.rarity];
    let s = `<b style="color:${r.color}">${r.name}</b>`;
    if (c.variant !== 'normal') s += ` · <span class="vtag">${VARIANTS[c.variant].name}</span>`;
    if (c.isNewCard) s += ' · <span class="newtag">Nouvelle découverte</span>';
    else if (c.isNewVariant) s += ' · <span class="newtag">Nouvelle variante</span>';
    else s += ` · doublon <span class="muted">+${c.ash} cendres</span>`;
    return s;
  }

  function showPack() {
    stage.innerHTML = `<button class="op-pack" aria-label="Briser le sceau du booster">${packHTML(type, cat, { faction, event: ev })}</button>`;
    hint.textContent = 'Touche le booster pour briser le sceau.';
    stage.querySelector('.op-pack').addEventListener('click', tear, { once: true });
  }

  async function tear() {
    if (busy) return;
    busy = true;
    app.sfx.tear();
    const p = stage.querySelector('.op-pack');
    p.classList.add('tearing');
    el.classList.add('flash');
    await wait(700);
    el.classList.remove('flash');
    busy = false;
    if (phase === 'summary') return;
    phase = 'reveal';
    showBack();
  }

  function showBack() {
    const c = opening.cards[index];
    const glow = RI(c.rarity) >= 2 ? `glow-${c.rarity}` : '';
    stage.innerHTML = `<button class="op-card ${glow}" aria-label="Retourner la carte ${index + 1} sur ${opening.cards.length}"><div class="op-flip"><div class="tcg-back">${EMBLEM}</div></div></button><p class="op-label"></p>`;
    hint.textContent = RI(c.rarity) >= 4 ? 'Quelque chose d’immense attend derrière ce sceau…' : RI(c.rarity) >= 3 ? 'Cette carte vibre sous tes doigts.' : 'Touche la carte pour la retourner.';
    stage.querySelector('.op-card').addEventListener('click', flip, { once: true });
  }

  async function flip() {
    if (busy) return;
    busy = true;
    const c = opening.cards[index];
    const card = cat.get(c.id);
    const btn = stage.querySelector('.op-card');
    const inner = btn.querySelector('.op-flip');
    app.sfx.flip();
    inner.classList.add('half');
    await wait(170);
    if (phase === 'summary') { busy = false; return; }
    inner.innerHTML = cardHTML(card, { size: 'full', variant: c.variant });
    inner.classList.remove('half');
    btn.classList.add('revealed');
    dots[index].style.background = RARITY[c.rarity].color;
    dots[index].classList.add('on');
    stage.querySelector('.op-label').innerHTML = statusLine(c);
    enableTilt(btn, { reduced });
    if (RI(c.rarity) >= 4) epic(c.rarity);
    else app.sfx.reveal(c.rarity);
    if (c.variant !== 'normal') shine(c.variant, RI(c.rarity) >= 4 ? 1400 : 200);
    if (c.isNewCard) setTimeout(() => app.sfx.discover(), 250);
    await wait(RI(c.rarity) >= 4 ? 900 : 250);
    busy = false;
    hint.textContent = index < opening.cards.length - 1 ? 'Touche pour la carte suivante.' : 'Touche pour voir le récapitulatif.';
    btn.setAttribute('aria-label', 'Carte suivante');
    btn.addEventListener('click', nextCard, { once: true });
  }

  // Annonce d'une variante cosmétique (holographique, or, cosmique…)
  function shine(variant, delay) {
    setTimeout(() => {
      if (phase === 'summary') return;
      const b = document.createElement('div');
      b.className = `op-banner op-variant v-${variant}`;
      b.textContent = VARIANTS[variant].name;
      el.appendChild(b);
      app.sfx.discover();
      setTimeout(() => b.remove(), 2200);
    }, delay);
  }

  function epic(r) {
    app.sfx.reveal(r);
    el.classList.add('epic', `epic-${r}`);
    const banner = document.createElement('div');
    banner.className = 'op-banner';
    banner.textContent = r === 'S' ? 'Carte secrète' : 'Mythique';
    el.appendChild(banner);
    if (!reduced) {
      const parts = document.createElement('div');
      parts.className = 'op-particles';
      parts.innerHTML = Array.from({ length: 36 }, (_, i) => `<i style="--a:${i * 10}deg;--d:${0.6 + Math.random() * 0.8}s;--r:${120 + Math.random() * 160}px"></i>`).join('');
      el.appendChild(parts);
      setTimeout(() => parts.remove(), 2200);
    }
    setTimeout(() => { banner.remove(); el.classList.remove('epic', `epic-${r}`); }, 2600);
  }

  async function nextCard() {
    if (busy) return;
    const btn = stage.querySelector('.op-card');
    if (!reduced) { btn.classList.add('away'); await wait(220); }
    if (phase === 'summary') return;
    index++;
    if (index >= opening.cards.length) summary();
    else showBack();
  }

  function summary() {
    if (phase === 'summary') return;
    phase = 'summary';
    busy = false;
    el.classList.add('is-summary');
    el.querySelector('[data-op="all"]').hidden = true;
    const r = opening.rewards;
    const newCount = opening.cards.filter((c) => c.isNewCard).length;
    dots.forEach((d, i) => { d.style.background = RARITY[opening.cards[i].rarity].color; d.classList.add('on'); });
    const canAgain = g.canBuy(type);
    stage.innerHTML = `<div class="op-summary">
      <h2>${newCount ? `${newCount} nouvelle${newCount > 1 ? 's' : ''} créature${newCount > 1 ? 's' : ''}` : 'Booster ouvert'}</h2>
      ${opening.guaranteed ? `<p class="small guarantee">${icon('star')} Garantie appliquée : ${opening.guaranteed === 'm' ? 'Mythique ou mieux' : 'Hyper rare ou mieux'}.</p>` : ''}
      <div class="op-grid">${opening.cards.map((c, i) => `<div class="op-cell" style="--i:${i}">${cardHTML(cat.get(c.id), { variant: c.variant, isNew: c.isNewCard || c.isNewVariant, lazy: false })}<span class="op-tag">${c.isNewCard ? 'Nouvelle' : c.isNewVariant ? VARIANTS[c.variant].short : `+${c.ash} cendres`}</span></div>`).join('')}</div>
      <ul class="op-rewards">
        ${r.shards ? `<li>${icon('crystal')}<span>Récompenses de découverte</span><b>+${fmt(r.shards)} éclats</b></li>` : ''}
        ${r.ash ? `<li>${icon('ash')}<span>Doublons convertis</span><b>+${fmt(r.ash)} cendres</b></li>` : ''}
        <li>${icon('sparkle')}<span>Expérience</span><b>+${fmt(r.xp)} XP</b></li>
      </ul>
      <p class="small muted center">Toutes ces cartes sont déjà dans ta collection. Touche une carte pour l’examiner.</p>
      <div class="op-actions">
        <button class="btn" data-op="close">Fermer</button>
        ${canAgain ? `<button class="btn primary" data-op="again">${payLabel(g, type, true)}</button>` : ''}
      </div>
    </div>`;
    hint.textContent = '';
    stage.querySelector('.op-grid').addEventListener('click', (e) => {
      const t = e.target.closest('.tcg');
      if (t) { const c = opening.cards.find((x) => x.id === t.dataset.id); app.openCard(t.dataset.id, { list: opening.cards.map((x) => x.id), variant: c.variant }); }
    });
    app.flushProgress();
  }

  function close() {
    el.classList.add('out');
    document.body.classList.remove('has-sheet');
    setTimeout(() => el.remove(), 250);
    document.removeEventListener('keydown', onKey);
    if (app.pendingProgress) app.flushProgress();
    onDone && onDone();
  }

  function onKey(e) {
    if (document.querySelector('.sheet-wrap')) return;
    if (e.key === 'Escape') { if (phase === 'summary') close(); else summary(); }
  }
  document.addEventListener('keydown', onKey);

  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-op]');
    if (!a) return;
    if (a.dataset.op === 'all') summary();
    if (a.dataset.op === 'close') close();
    if (a.dataset.op === 'again') { close(); setTimeout(() => openPack(app, type, { faction, onDone }), 280); }
  });

  if (fast) summary();
  else showPack();
}
