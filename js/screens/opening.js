// Ouverture de booster : sceau à briser, révélation carte par carte ou d'un coup,
// effets selon la rareté, récapitulatif. Les cartes sont déjà enregistrées
// dans la sauvegarde avant la première animation.
import { BOOSTERS, RARITY, VARIANTS } from '../config.js';
import { cardHTML } from '../ui/card.js';
import { artUrl } from '../art/assets.js';
import { icon, EMBLEM, roleIcon, picon } from '../ui/icons.js';
import { esc, fmt, toast } from '../ui/dom.js';
import { packHTML, payLabel, GIFT_N } from './shop.js';
import { stillOf, stillNow, backUrl } from '../ui/still.js';
import { roleOf, ROLES } from '../core/army.js';
import { keywordOf, KEYWORDS } from '../core/duel.js';
import { hapPattern } from '../ui/sound.js';

// v720 : temps entre le début du son monté (reveal-m-full, reveal-s-full) et le retournement, pour que la carte arrive sur le sommet du son
const RISE_MS = { M: 2230, S: 2730 };
const RI = (r) => ['C', 'PC', 'R', 'HR', 'M', 'S'].indexOf(r);

// preset : ouverture déjà tirée ailleurs (Tirage des Ombres) : rien n'est ajouté à la collection
// v539 : le booster est tiré par le serveur de partie (anti-triche) : on attend sa réponse avant l'ouverture
let asking = false;
// v541 : titre connu avant la réponse du serveur (même ordre de paiement que game.openBooster : ticket, gratuit, éclats)
function guessTitle(g, type) {
  if ((g.s.tickets[type] || 0) > 0) return type === 'standard' && g.s.welcomeGift > 0 ? `Cadeau de bienvenue · ${GIFT_N - g.s.welcomeGift + 1} / ${GIFT_N}` : null;
  if (type === 'standard' && g.freePack().stock > 0) return 'Booster gratuit du jour';
  return null;
}
function canPay(g, type) {
  const def = BOOSTERS[type];
  if ((g.s.tickets[type] || 0) > 0 || (type === 'standard' && g.freePack().stock > 0)) return true;
  if (!def.rewardOnly && g.s.shards >= def.price) return true; /* v728 */
  throw new Error(`Il te manque ${def.price - g.s.shards} éclats (tu en as ${g.s.shards}). La Descente et les Duels des Sceaux en rapportent.`);
}
export async function openPack(app, type, { faction, onDone, preset = null, title = null, packKey = null } = {}) {
  const g = app.game, cat = app.catalog;
  if (asking) return;
  const fail = (e) => { asking = false; app.pendingProgress = null; app.sfx.error(); toast(esc(e.message), { kind: 'error', icon: 'info' }); };
  const viaServer = !preset && !!app.partie;
  if (!title && !preset) title = guessTitle(g, type);
  try { if (!preset) canPay(g, type); } catch (e) { fail(e); return; }
  if (!preset) app.pendingProgress = [];
  asking = true;
  // v541 : le booster s'affiche tout de suite ; le serveur tire les cartes pendant qu'on le déchire
  let opening = null;
  const got = (async () => (preset ? { opening: preset } : viaServer ? app.partie.first('openBooster', type, { faction }) : g.openBooster(type, { faction })))()
    .then((r) => { opening = r.opening; asking = false; return opening; }, (e) => { fail(e); throw e; });
  got.catch(() => {});
  if (!viaServer || g.s.settings.fastOpen) { try { await got; } catch (e) { return; } }
  // illustrations chargées dès que les cartes sont connues : la carte se retourne sans passer par un fond noir
  let pre = [];
  got.then((op) => { pre = op.cards.map((c) => { const im = new Image(); im.decoding = 'async'; im.src = artUrl(cat.get(c.id), { variant: c.variant }); return im; }); }, () => {});
  const ready = (i) => Promise.race([pre[i]?.decode ? pre[i].decode().catch(() => {}) : Promise.resolve(), new Promise((r) => setTimeout(r, 900))]);
  const reduced = app.reduced();
  const fast = g.s.settings.fastOpen;
  const def = BOOSTERS[type];
  const ev = g.event();

  const el = document.createElement('div');
  el.className = 'opening';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', `Ouverture : ${title || def.name}`);
  el.innerHTML = `<div class="op-bg"></div><div class="op-rays"></div>
    <header class="op-top"><span class="op-title">${esc(title || def.name)}</span><button class="btn small dc-plq dc-plq-dark op-all" data-op="all">${icon('skip')}Tout révéler</button></header>
    <div class="op-stage" aria-live="polite"></div>
    <footer class="op-bottom"><div class="op-dots">${(opening?.cards || BOOSTERS[type].slots).map(() => '<i></i>').join('')}</div><p class="op-hint small muted"></p></footer>`;
  document.body.appendChild(el);
  document.body.classList.add('has-sheet', 'lock-scroll');
  /* v609 : dos de carte fixe pendant l'ouverture (un dos animé répété jusqu'à 6 fois pesait trop sur l'iPhone) */
  const bk = backUrl();
  const setBack = (u) => { if (u) el.style.setProperty('--card-back', `url("${u}")`); };
  if (bk) { const u = stillNow(bk); if (u) setBack(u); else stillOf(bk).then(setBack); }
  const stage = el.querySelector('.op-stage');
  const hint = el.querySelector('.op-hint');
  const dots = el.querySelectorAll('.op-dots i');
  let index = 0, phase = 'pack', busy = false, tapQueued = false;

  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 30) : ms));

  function statusLine(c) {
    const r = RARITY[c.rarity];
    let s = `<b style="color:${r.color}">${r.name}</b>`;
    if (c.variant !== 'normal') s += ` · <span class="vtag">${VARIANTS[c.variant].name}</span>`;
    if (preset) s += ` · <b class="op-pts">+${c.pts} point${c.pts > 1 ? 's' : ''}</b>${c.double ? ' <span class="muted">(ta faction : ×2)</span>' : ''}`;
    else if (c.isNewCard) { const card = cat.get(c.id), fp = app.game.factionProgress(card.faction); s += ` · <span class="newtag">Nouvelle entrée au Bestiaire</span><br><span class="op-gain">${icon('book')} ${esc(cat.faction[card.faction].name)} : ${fp.owned} / ${fp.total}</span> <span class="op-gain">${icon('swords')} Elle peut rejoindre ton équipe</span>`; }
    else if (c.isNewVariant) s += ` · <span class="newtag">Nouvelle finition</span>`;
    else s += ` · doublon <span class="muted">à brûler : ${icon('ash')} ${c.burn} cendres</span>`;
    // rôle et capacité en combat
    const card = cat.get(c.id), role = ROLES[roleOf(card)], kw = KEYWORDS[keywordOf(card)];
    s += `<br><span class="op-role" style="--rlc:${role.color}" title="${esc(kw.desc)}">${roleIcon(keywordOf(card))}<b>${esc(role.name)}</b></span>`;
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
    let pk = packHTML(packKey || type, cat, { faction, event: ev });
    /* v609 : le sachet est copié 14 fois (lanières de la déchirure) : toujours en image fixe, sinon un sachet animé
       redessiné 14 fois à chaque image épuisait la mémoire de l'iPhone et fermait l'app */
    const pkSrc = (/src="([^"]+)"/.exec(pk) || [])[1];
    const pkStill = stillNow(pkSrc);
    if (pkStill) pk = pk.replace(`src="${pkSrc}"`, `src="${pkStill}"`);
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
    if (pkSrc && !pkStill) stillOf(pkSrc).then((u) => { if (u) pack.querySelectorAll('.pk-img').forEach((im) => { im.src = u; }); });
    got.then((op) => { /* v541 : l'aura vient quand le serveur a tiré les cartes */
      const top = op.cards.reduce((m, c) => (RI(c.rarity) > RI(m) ? c.rarity : m), 'C');
      if (RI(top) >= 3) { pack.classList.add('pk-aura', `pk-aura-${top}`); pack.style.setProperty('--aura', RARITY[top].color); }
    }, () => {});
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
    const finish = () => { if (!done) { done = true; stage.style.touchAction = ''; tear(dir); } };
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
    // Déchirure très tolérante : le doigt peut partir de n'importe où sur l'écran, dans n'importe
    // quelle direction. Dès ~20 px de glissé, le booster finit de se déchirer tout seul ;
    // il ne revient jamais en arrière. Un simple toucher l'ouvre aussi.
    const zone = stage;
    const pt = (e) => (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
    const begin = (e) => {
      if (done || busy || start) return;
      const q = pt(e), r = pack.getBoundingClientRect();
      start = { x: q.clientX, y: q.clientY, w: r.width, moved: false };
    };
    const drag = (e) => {
      if (!start || done || busy) return;
      const q = pt(e), dx = q.clientX - start.x, dy = q.clientY - start.y, dist = Math.hypot(dx, dy);
      if (e.cancelable) e.preventDefault();
      if (!start.moved && dist < 8) return;
      if (!start.moved) { start.moved = true; setDir(dx >= 0 ? 1 : -1); pack.classList.add('dragging'); }
      setP(Math.max(p, dist / (start.w * 0.6)));
      if (dist > 20) { start = null; pack.classList.remove('dragging'); reduced ? finish() : animateTo(300); }
    };
    const end = () => {
      if (!start || done || busy) return;
      const moved = start.moved;
      start = null;
      pack.classList.remove('dragging');
      if (!moved) setDir(1);
      reduced ? finish() : animateTo(moved ? 260 : 600);
    };
    zone.style.touchAction = 'none';
    zone.addEventListener('pointerdown', begin);
    zone.addEventListener('pointermove', drag);
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    // secours pour Safari : les événements tactiles, au cas où les « pointer » sont interrompus
    zone.addEventListener('touchstart', begin, { passive: true });
    zone.addEventListener('touchmove', drag, { passive: false });
    zone.addEventListener('touchend', end);
    zone.addEventListener('touchcancel', end);
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
    if (!opening) { try { await got; } catch (e) { close(); return; } } // v541 : réseau lent : le booster reste ouvert jusqu'aux cartes
    if (closed) return;
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
    const last = !left && opening.cards.length > 1; // dernière carte : sa lueur trahit sa rareté
    stage.innerHTML = `<div class="op-pile ${first ? 'rise' : ''}">
      ${Array.from({ length: Math.min(left, 4) }, (_, k) => `<div class="op-under" style="--k:${k + 1}"><div class="tcg-back">${EMBLEM}</div></div>`).join('')}
      <div class="op-card ${glow} ${last ? 'op-last' : ''}" style="--lc:${RARITY[c.rarity].color}" role="button" tabindex="0" aria-label="Retourner la carte ${index + 1} sur ${opening.cards.length}"><div class="op-flip"><div class="tcg-back">${EMBLEM}</div></div></div>
    </div><p class="op-label"></p>`;
    hint.textContent = RI(c.rarity) >= 4 ? 'Quelque chose d’immense attend derrière ce sceau…' : RI(c.rarity) >= 3 ? 'Cette carte vibre sous tes doigts.' : last ? 'Dernière carte… sa lueur trahit sa rareté.' : 'Touche la carte pour la retourner.';
    bindCard(stage.querySelector('.op-card'));
  }

  // Gestes sur la carte : toucher = retourner / suivante ; glisser (carte révélée) = suivante, façon Tinder.
  function bindCard(card) {
    let s = null;
    card.addEventListener('pointerdown', (e) => {
      if (busy) { tapQueued = true; return; } /* v576 : un toucher pendant une animation n'est plus perdu : il est joué juste après */
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
    if (lvl < 3 && !reduced && btn.classList.contains('op-last')) {
      // dernière carte : un court instant de suspense
      btn.classList.add('charging');
      app.sfx.rumble(0.35);
      await wait(480);
      btn.classList.remove('charging');
      if (phase === 'summary') { busy = false; return; }
    }
    if (lvl >= 3 && !reduced) {
      // Montée en tension : la carte tremble, la lumière monte, l'écran s'assombrit.
      const big = lvl >= 4;
      btn.classList.add('charging');
      el.classList.add('hush');
      if (big) el.classList.add('hush-big');
      /* v720 : Mythique et Secrète : le son monte pendant la charge, la carte se retourne sur son sommet */
      if (big) app.sfx.revealRise(c.rarity); else app.sfx.suspense();
      hapPattern(big ? [40, 60, 40, 60, 60, 40, 120] : [30, 50, 40]); /* v521 : vraies vibrations dans l'app */
      await wait(big ? RISE_MS[c.rarity] : 600);
      if (phase === 'summary') { busy = false; return; }
      btn.classList.remove('charging');
      el.classList.remove('hush', 'hush-big');
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 700);
    }
    /* v576 : la carte commence à se retourner tout de suite ; le décodage de son illustration se fait pendant le mouvement
       (avant : on l'attendait d'abord, jusqu'à 0,9 s sans aucune réaction au toucher) */
    app.sfx.flip();
    inner.classList.add('half');
    await Promise.all([wait(lvl >= 4 ? 320 : 170), ready(index)]);
    if (phase === 'summary') { busy = false; return; }
    inner.innerHTML = cardHTML(card, { size: 'full', variant: c.variant });
    inner.classList.remove('half');
    btn.classList.add('revealed');
    dots[index].style.background = RARITY[c.rarity].color;
    dots[index].classList.add('on');
    stage.querySelector('.op-label').innerHTML = statusLine(c);
    if (RI(c.rarity) >= 4) epic(c.rarity, !reduced);
    else app.sfx.reveal(c.rarity);
    if (c.variant !== 'normal') shine(c.variant, RI(c.rarity) >= 4 ? 1400 : 200);
    if (c.isNewCard) { /* v272 : plus de carillon ici, il couvrait le son de la rareté (le badge « Nouvelle » suffit) */ if (!reduced) { const cc = stage.querySelector('.op-card, .tcg'); cc?.classList.add('op-first'); setTimeout(() => cc?.classList.remove('op-first'), 1300); } }
    await wait(RI(c.rarity) >= 4 ? 900 : 250);
    busy = false;
    if (tapQueued && phase !== 'summary') { tapQueued = false; return nextCard(-1); }
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

  function epic(r, risen) {
    app.sfx.reveal(r, { risen });
    if (r === 'S') app.sfx.rumble?.(1.6); // v329 : grondement grave sous la révélation d'une Secrète
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
    else { showBack(); if (tapQueued) { tapQueued = false; flip(); } }
  }

  function summary() {
    if (phase === 'summary') return;
    if (!opening) { got.then(() => summary(), () => close()); return; }
    phase = 'summary';
    el.querySelector('.op-all')?.setAttribute('hidden', ''); // v311 : tout est révélé, le bouton n'a plus de sens
    busy = false;
    el.classList.add('is-summary');
    el.querySelector('[data-op="all"]').hidden = true;
    const r = opening.rewards;
    const newCount = opening.cards.filter((c) => c.isNewCard).length;
    dots.forEach((d, i) => { d.style.background = RARITY[opening.cards[i].rarity].color; d.classList.add('on'); });
    const canAgain = !preset && g.canBuy(type);
    // doublons de ce booster encore en trop dans la collection : à brûler d'un toucher
    const dupIds = [...new Set(opening.cards.filter((c) => !c.isNewCard && !c.isNewVariant).map((c) => c.id))];
    const dupAsh = !preset && dupIds.length ? g.spareAsh(dupIds).ash : 0;
    el.scrollLeft = 0; el.scrollTop = 0; /* v373 : jamais de contenu décalé */
    stage.innerHTML = `<div class="op-summary">
      <h2 class="op-sum-title"><span>${preset ? `${fmt(preset.score)} points` : newCount ? `${newCount} nouvelle${newCount > 1 ? 's' : ''} créature${newCount > 1 ? 's' : ''}` : 'Booster ouvert'}</span></h2>
      ${opening.gift ? `<p class="small op-gift">${icon('ticket')} ${opening.gift < GIFT_N ? `Cadeau de bienvenue : encore ${GIFT_N - opening.gift} booster${GIFT_N - opening.gift > 1 ? 's' : ''} offert${GIFT_N - opening.gift > 1 ? 's' : ''} à ouvrir.` : g.freePack().stock ? 'Ton cadeau de bienvenue est ouvert ! Il te reste ton booster gratuit du jour.' : 'Ton cadeau de bienvenue est ouvert !'}</p>` : ''}
      ${opening.guaranteed ? `<p class="small guarantee">${icon('star')} Garantie appliquée : ${opening.guaranteed === 'm' ? 'Mythique ou mieux' : 'Hyper rare ou mieux'}.</p>` : ''}
      <div class="op-grid">${opening.cards.map((c, i) => `<div class="op-cell" style="--i:${i}">${cardHTML(cat.get(c.id), { variant: c.variant, isNew: c.isNewCard || c.isNewVariant, lazy: false })}<span class="op-tag">${preset ? `+${c.pts} pts${c.double ? ' ×2' : ''}` : c.isNewCard ? 'Nouvelle recrue' : c.isNewVariant ? VARIANTS[c.variant].short : `Doublon · ${c.burn} ${icon('ash')}`}</span></div>`).join('')}</div>
      <div class="op-loot">
        ${r.shards ? `<span>${icon('crystal')}<b>+${fmt(r.shards)}</b><small>éclats</small></span>` : ''}
        ${r.ash ? `<span>${icon('ash')}<b>+${fmt(r.ash)}</b><small>cendres</small></span>` : ''}
        ${r.xp ? `<span>${picon('xp2')}<b>+${fmt(r.xp)}</b><small>XP</small></span>` : ''}
        ${dupAsh ? `<button class="op-burn" data-op="burn" aria-label="Brûler les doublons de ce booster pour ${fmt(dupAsh)} cendres">${icon('p:furnace')}<b>Brûler</b><small>+${fmt(dupAsh)} ${icon('ash')}</small></button>` : ''}
      </div>
      <p class="small muted center op-sum-hint">Touche une carte pour l’examiner.</p>
    </div>`;
    el.insertAdjacentHTML('beforeend', `<div class="op-actions op-actions-fixed">
        <button class="btn dc-plq dc-plq-dark op-btn-close" data-op="close">Fermer</button>
        ${canAgain ? `<button class="btn primary dc-plq dc-plq-red op-btn-again" data-op="again">${payLabel(g, type, true)}</button>` : ''}
      </div>`);
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
    document.body.classList.remove('has-sheet', 'lock-scroll');
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
    if (a.dataset.op === 'burn') {
      const ids = [...new Set(opening.cards.filter((c) => !c.isNewCard && !c.isNewVariant).map((c) => c.id))];
      app.pendingProgress = [];
      const r = app.game.burnSpares(ids);
      app.sfx.rumble?.(0.9);
      a.outerHTML = `<span class="op-burnt">${icon('ash')}<b>+${fmt(r.ash)}</b><small>cendres</small></span>`;
      app.flushProgress(); app.chrome?.();
    }
    if (a.dataset.op === 'again') { close(); setTimeout(() => openPack(app, type, { faction, onDone }), 280); }
  });

  if (fast) summary();
  else showPack();
  got.catch(() => { if (phase === 'pack' && !busy) close(); }); // v541 : refusé par le serveur avant la déchirure
}
