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
    if (c.isNewCard) s += ` · <span class="newtag">Nouvelle découverte</span><br><span class="op-gain">${icon('swords')} Elle peut rejoindre ton équipe</span>`;
    else if (c.isNewVariant) s += ` · <span class="newtag">Nouvelle variante</span>${c.levelUp ? `<br><span class="op-gain">${icon('star')} Niveau ${c.levelUp} !</span>` : ''}`;
    else s += ` · doublon <span class="muted">+${c.ash} cendres</span>${c.levelUp ? `<br><span class="op-gain">${icon('star')} Niveau ${c.levelUp} !</span>` : ''}`;
    return s;
  }

  // Booster : déchirer en glissant le doigt sur la ligne, ou toucher pour l'ouvrir.
  // La bande du haut est découpée en lanières qui se soulèvent une à une sous le doigt,
  // le long d'une ligne de déchirure irrégulière (différente à chaque booster).
  const SLICES = 12, EDGE = 48;
  const ragged = Array.from({ length: EDGE + 1 }, (_, k) => 9.4 + Math.random() * 1.9 + (k % 3 === 0 ? 0.5 : 0));
  const edgeY = (x) => ragged[Math.round(x * EDGE)];
  const pt = (x) => `${(x * 100).toFixed(2)}% ${edgeY(x).toFixed(2)}%`;
  const sliceClip = (a, b) => {
    const pts = [];
    for (let k = Math.round(b * EDGE); k >= Math.round(a * EDGE); k--) pts.push(pt(k / EDGE));
    return `polygon(${(a * 100).toFixed(2)}% 0, ${(b * 100).toFixed(2)}% 0, ${pts.join(', ')})`;
  };
  const bodyClip = () => `polygon(${ragged.map((_, k) => pt(k / EDGE)).join(', ')}, 100% 100%, 0 100%)`;
  const edgePath = (dir) => {
    const xs = ragged.map((y, k) => [(k / EDGE) * 100, y]);
    if (dir < 0) xs.reverse();
    return 'M' + xs.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L');
  };

  function showPack() {
    const pk = packHTML(type, cat, { faction, event: ev });
    const slices = Array.from({ length: SLICES }, (_, i) => `<div class="pk-slice" style="clip-path:${sliceClip(i / SLICES, (i + 1) / SLICES)};transform-origin:${(((i + 0.5) / SLICES) * 100).toFixed(1)}% 10.5%">${pk}</div>`).join('');
    stage.innerHTML = `<div class="op-pack" role="button" tabindex="0" aria-label="Ouvrir le booster : glisse le doigt le long de la ligne pointillée, ou touche-le">
      <div class="pk-inside"><div class="pk-cards"><div class="tcg-back">${EMBLEM}</div></div></div>
      <div class="pk-piece pk-body" style="clip-path:${bodyClip()}">${pk}</div>
      <div class="pk-strip">${slices}</div>
      <svg class="pk-edge" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${edgePath(1)}" pathLength="1"/></svg>
      <div class="pk-burst"></div>
    </div>`;
    hint.innerHTML = `${icon('sparkle')} Glisse le doigt le long de la ligne pour déchirer, ou touche le booster.`;
    const pack = stage.querySelector('.op-pack');
    const top = opening.cards.reduce((m, c) => (RI(c.rarity) > RI(m) ? c.rarity : m), 'C');
    if (RI(top) >= 3) { pack.classList.add('pk-aura', `pk-aura-${top}`); pack.style.setProperty('--aura', RARITY[top].color); }
    const sl = [...pack.querySelectorAll('.pk-slice')];
    const edge = pack.querySelector('.pk-edge path');
    let start = null, p = 0, dir = 1, lastTick = 0, done = false;
    const setP = (v) => {
      p = Math.max(0, Math.min(1, v));
      sl.forEach((el2, i) => {
        const k = dir > 0 ? i : SLICES - 1 - i;
        const t = Math.max(0, Math.min(1, p * SLICES * 1.25 - k));
        el2.style.transform = t ? `translateY(${(-t * 2.6).toFixed(2)}%) rotate(${(-dir * t * (4 + (k % 3))).toFixed(2)}deg)` : '';
        el2.style.filter = t ? `brightness(${(1 + t * 0.25).toFixed(2)}) drop-shadow(0 ${(t * 4).toFixed(1)}px ${(t * 5).toFixed(1)}px rgba(0,0,0,.6))` : '';
      });
      edge.style.strokeDashoffset = String(1 - p);
      pack.style.setProperty('--p', p);
      if (p - lastTick > 0.06) { lastTick = p; app.sfx.rip(p); }
    };
    const setDir = (d) => { dir = d; edge.setAttribute('d', edgePath(d)); pack.style.setProperty('--dir', d); };
    const finish = () => { if (!done) { done = true; tear(dir); } };
    const animateTo = (ms) => {
      busy = true;
      const from = p, t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / ms);
        setP(from + (1 - from) * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2));
        if (k < 1) requestAnimationFrame(step); else { busy = false; finish(); }
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
      // déchirure tolérante : le geste peut être horizontal ou en biais, n'importe où sur le paquet
      const dx = e.clientX - start.x, dy = e.clientY - start.y, d = Math.abs(dx) >= Math.abs(dy) * 0.6 ? dx : (dx || 1) / Math.abs(dx || 1) * Math.hypot(dx, dy);
      if (!start.moved && Math.hypot(dx, dy) < 6) return;
      if (!start.moved) { start.moved = true; setDir(d >= 0 ? 1 : -1); pack.classList.add('dragging'); }
      setP(Math.max(p, Math.abs(d) / (start.w * 0.5)));
      if (p >= 1) { start = null; pack.classList.remove('dragging'); finish(); }
    });
    const up = () => {
      if (!start || done) return;
      const moved = start.moved;
      start = null;
      pack.classList.remove('dragging');
      if (!moved) { setDir(1); return reduced ? finish() : animateTo(650); }
      if (p > 0.25) animateTo(240);
      else { pack.classList.add('snap'); setP(0); lastTick = 0; setTimeout(() => pack.classList.remove('snap'), 300); }
    };
    pack.addEventListener('pointerup', up);
    pack.addEventListener('pointercancel', up);
    pack.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !done && !busy) { e.preventDefault(); setDir(1); animateTo(650); } });
  }

  async function tear(dir = 1) {
    if (phase !== 'pack') return;
    busy = true;
    app.sfx.tear();
    const pack = stage.querySelector('.op-pack');
    pack.style.setProperty('--dir', dir);
    pack.classList.add('torn');
    await wait(380);
    pack.classList.add('open');
    await wait(560);
    el.classList.add('flash');
    pack.classList.add('out');
    await wait(420);
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
    const lvl = RI(c.rarity);
    if (lvl >= 3 && !reduced) {
      // Montée en tension : la carte tremble, la lumière monte, l'écran s'assombrit.
      const big = lvl >= 4;
      btn.classList.add('charging');
      el.classList.add('hush');
      if (big) el.classList.add('hush-big');
      app.sfx.rumble(big ? 1.3 : 0.6);
      try { navigator.vibrate?.(big ? [40, 60, 40, 60, 60, 40, 120] : [30, 50, 40]); } catch (e) { /* rien */ }
      await wait(big ? 1300 : 600);
      if (phase === 'summary') { busy = false; return; }
      btn.classList.remove('charging');
      el.classList.remove('hush', 'hush-big');
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 700);
    }
    app.sfx.flip();
    inner.classList.add('half');
    await wait(lvl >= 4 ? 320 : 170);
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
      <div class="op-grid">${opening.cards.map((c, i) => `<div class="op-cell" style="--i:${i}">${cardHTML(cat.get(c.id), { variant: c.variant, isNew: c.isNewCard || c.isNewVariant, lazy: false })}<span class="op-tag">${c.isNewCard ? 'Nouvelle recrue' : c.levelUp ? `Niveau ${c.levelUp} !` : c.isNewVariant ? VARIANTS[c.variant].short : `+${c.ash} cendres`}</span></div>`).join('')}</div>
      ${newCount || opening.cards.some((c) => c.levelUp) ? `<p class="small op-gain center">${icon('swords')} ${newCount ? `${newCount > 1 ? 'Les nouvelles créatures peuvent' : 'La nouvelle créature peut'} rejoindre ton équipe. ` : ''}Chaque doublon fait monter une créature de niveau.</p>` : ''}
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

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    el.classList.add('out');
    document.body.classList.remove('has-sheet');
    // Un second toucher (ou un toucher fantôme d'iOS) ne doit pas atteindre la page dessous,
    // où se trouve souvent un bouton « Ouvrir » : on avale les touchers pendant un court instant.
    const swallow = (e) => { e.stopPropagation(); e.preventDefault(); };
    document.addEventListener('click', swallow, true);
    setTimeout(() => document.removeEventListener('click', swallow, true), 700);
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
    if (closed) return;
    if (a.dataset.op === 'close') close();
    if (a.dataset.op === 'again') { close(); setTimeout(() => openPack(app, type, { faction, onDone }), 280); }
  });

  if (fast) summary();
  else showPack();
}
