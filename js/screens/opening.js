// Ouverture de booster : sceau à briser, révélation carte par carte ou d'un coup,
// effets selon la rareté, récapitulatif. Les cartes sont déjà enregistrées
// dans la sauvegarde avant la première animation.
import { BOOSTERS, RARITY, VARIANTS } from '../config.js';
import { cardHTML } from '../ui/card.js';
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

  // Booster : déchirer en glissant le doigt sur la ligne, ou toucher pour l'ouvrir.
  const zigzag = (top) => {
    const pts = [];
    for (let k = 0; k <= 16; k++) pts.push(`${(k / 16) * 100}% ${k % 2 ? 11.2 : 13.8}%`);
    return top ? `polygon(0 0, 100% 0, ${pts.reverse().join(', ')})` : `polygon(${pts.join(', ')}, 100% 100%, 0 100%)`;
  };

  function showPack() {
    const pk = packHTML(type, cat, { faction, event: ev });
    stage.innerHTML = `<div class="op-pack" role="button" tabindex="0" aria-label="Ouvrir le booster : glisse le doigt le long de la ligne pointillée, ou touche-le">
      <div class="pk-piece pk-body" style="clip-path:${zigzag(false)}">${pk}</div>
      <div class="pk-piece pk-top" style="clip-path:${zigzag(true)}">${pk}</div>
      <div class="pk-seam"><i></i></div><div class="pk-burst"></div>
    </div>`;
    hint.innerHTML = `${icon('sparkle')} Glisse le doigt le long de la ligne pour déchirer, ou touche le booster.`;
    const pack = stage.querySelector('.op-pack');
    const top = pack.querySelector('.pk-top');
    const seam = pack.querySelector('.pk-seam');
    let start = null, p = 0, dir = 1, lastTick = 0, done = false;
    const setP = (v) => {
      p = Math.max(0, Math.min(1, v));
      pack.style.setProperty('--p', p);
      seam.classList.toggle('rtl', dir < 0);
      top.style.transformOrigin = dir > 0 ? '100% 12%' : '0 12%';
      top.style.transform = `translateY(${-p * 3}%) rotate(${-dir * p * 5}deg)`;
      if (p - lastTick > 0.07) { lastTick = p; app.sfx.rip(p); }
    };
    const finish = () => { if (!done) { done = true; tear(dir); } };
    // Ouverture automatique (toucher) : la déchirure se dessine d'elle-même
    const autoTear = () => {
      if (done || busy) return;
      busy = true;
      if (reduced) { busy = false; return finish(); }
      const t0 = performance.now();
      const step = (t) => {
        setP((t - t0) / 420);
        if (p < 1) requestAnimationFrame(step); else { busy = false; finish(); }
      };
      requestAnimationFrame(step);
    };
    pack.addEventListener('pointerdown', (e) => {
      if (done || busy) return;
      const r = pack.getBoundingClientRect();
      start = { x: e.clientX, y: e.clientY, w: r.width, moved: false };
      pack.setPointerCapture(e.pointerId);
    });
    pack.addEventListener('pointermove', (e) => {
      if (!start || done) return;
      const dx = e.clientX - start.x;
      if (!start.moved && Math.abs(dx) < 8) return;
      if (!start.moved) { start.moved = true; dir = dx > 0 ? 1 : -1; pack.classList.add('dragging'); }
      setP(Math.max(p, (dx * dir) / (start.w * 0.75)));
      if (p >= 1) { start = null; pack.classList.remove('dragging'); finish(); }
    });
    const up = () => {
      if (!start || done) return;
      const moved = start.moved;
      start = null;
      pack.classList.remove('dragging');
      if (!moved) return autoTear();
      if (p > 0.6) { const from = p; const t0 = performance.now(); const step = (t) => { setP(from + (t - t0) / 200); if (p < 1) requestAnimationFrame(step); else finish(); }; requestAnimationFrame(step); }
      else { pack.classList.add('snap'); setP(0); lastTick = 0; setTimeout(() => pack.classList.remove('snap'), 260); }
    };
    pack.addEventListener('pointerup', up);
    pack.addEventListener('pointercancel', up);
    pack.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); autoTear(); } });
  }

  async function tear(dir = 1) {
    if (phase !== 'pack') return;
    busy = true;
    app.sfx.tear();
    const pack = stage.querySelector('.op-pack');
    pack.style.setProperty('--dir', dir);
    pack.classList.add('torn');
    await wait(260);
    el.classList.add('flash');
    pack.classList.add('open');
    await wait(620);
    el.classList.remove('flash');
    busy = false;
    if (phase === 'summary') return;
    phase = 'reveal';
    showBack(true);
  }

  // Pile de cartes : la carte du dessus, les autres dos visibles derrière.
  function showBack(first = false) {
    const c = opening.cards[index];
    const glow = RI(c.rarity) >= 2 ? `glow-${c.rarity}` : '';
    const left = opening.cards.length - index - 1;
    stage.innerHTML = `<div class="op-pile ${first ? 'rise' : ''}">
      ${Array.from({ length: Math.min(left, 4) }, (_, k) => `<div class="op-under" style="--k:${k + 1}"><div class="tcg-back">${EMBLEM}</div></div>`).join('')}
      <div class="op-card ${glow}" role="button" tabindex="0" aria-label="Retourner la carte ${index + 1} sur ${opening.cards.length}"><div class="op-flip"><div class="tcg-back">${EMBLEM}</div></div></div>
    </div><p class="op-label"></p>`;
    hint.textContent = RI(c.rarity) >= 4 ? 'Quelque chose d’immense attend derrière ce sceau…' : RI(c.rarity) >= 3 ? 'Cette carte vibre sous tes doigts.' : 'Touche la carte pour la retourner.';
    bindCard(stage.querySelector('.op-card'));
  }

  // Gestes sur la carte : toucher = retourner / suivante ; glisser (carte révélée) = suivante, façon Tinder.
  function bindCard(card) {
    let s = null;
    card.addEventListener('pointerdown', (e) => {
      if (busy) return;
      s = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
      card.setPointerCapture(e.pointerId);
    });
    card.addEventListener('pointermove', (e) => {
      if (!s || !card.classList.contains('revealed')) return;
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (!s.moved && Math.hypot(dx, dy) < 8) return;
      s.moved = true;
      card.classList.add('dragging');
      card.style.transform = `translate(${dx}px, ${dy * 0.35}px) rotate(${dx * 0.06}deg)`;
      card.style.setProperty('--swipe', Math.min(1, Math.abs(dx) / 120));
    });
    const up = (e) => {
      if (!s) return;
      const dx = e.clientX - s.x, dt = performance.now() - s.t;
      const moved = s.moved;
      s = null;
      card.classList.remove('dragging');
      if (!card.classList.contains('revealed')) { if (!busy) flip(); return; }
      if (!moved) return nextCard(-1);
      const fast = Math.abs(dx) / Math.max(dt, 1) > 0.6;
      if (Math.abs(dx) > 90 || (fast && Math.abs(dx) > 30)) nextCard(dx > 0 ? 1 : -1, dx);
      else { card.classList.add('snap'); card.style.transform = ''; card.style.removeProperty('--swipe'); setTimeout(() => card.classList.remove('snap'), 250); }
    };
    card.addEventListener('pointerup', up);
    card.addEventListener('pointercancel', () => { s = null; card.classList.remove('dragging'); card.style.transform = ''; });
    card.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (card.classList.contains('revealed')) nextCard(-1); else flip();
    });
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
    if (RI(c.rarity) >= 4) epic(c.rarity);
    else app.sfx.reveal(c.rarity);
    if (c.variant !== 'normal') shine(c.variant, RI(c.rarity) >= 4 ? 1400 : 200);
    if (c.isNewCard) setTimeout(() => app.sfx.discover(), 250);
    await wait(RI(c.rarity) >= 4 ? 900 : 250);
    busy = false;
    hint.textContent = index < opening.cards.length - 1 ? 'Glisse la carte sur le côté, ou touche-la pour la suivante.' : 'Glisse ou touche pour voir le récapitulatif.';
    btn.setAttribute('aria-label', 'Carte suivante');
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

  async function nextCard(dir = -1, from = 0) {
    if (busy) return;
    busy = true;
    const btn = stage.querySelector('.op-card');
    app.sfx.swipe();
    if (!reduced) {
      btn.classList.add('fly');
      btn.style.transform = `translate(${dir * Math.max(window.innerWidth, 500) * 1.1}px, ${-40 + Math.abs(from) * 0.1}px) rotate(${dir * 28}deg)`;
      btn.style.opacity = '0';
      await wait(260);
    }
    busy = false;
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

  el.addEventListener('dragstart', (e) => e.preventDefault());
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
