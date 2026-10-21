// Ouverture d'un coffre en plein écran : un vrai événement, comme un booster.
// Le coffre tremble, s'illumine, s'ouvre dans un éclat de lumière, et les boosters en
// jaillissent un par un avant de se ranger ; on peut les ouvrir aussitôt ou plus tard.
// Les coffres de bois et de fer ne donnent pas de booster : des éclats et des cendres.
import { CHESTS } from '../core/descent.js';
import { BOOSTERS } from '../config.js';
import { chestSVG } from '../ui/chest.js';
import { icon } from '../ui/icons.js';
import { esc, toast, fmt } from '../ui/dom.js';
import { packHTML } from './shop.js';
import { openPack } from './opening.js';

export function openChestScene(app, type, { onDone } = {}) {
  const g = app.game, def = CHESTS[type];
  const reduced = app.reduced();
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 40) : ms));
  const el = document.createElement('div');
  el.className = `opening chx chx-${type}`;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', def.name);
  el.style.setProperty('--cc', def.color);
  el.innerHTML = `<div class="op-bg chx-bg"></div><div class="op-rays"></div>
    <header class="op-top"><span class="op-title">${esc(def.name)}</span><button class="btn small ghost" data-x="close" aria-label="Fermer">${icon('close')}</button></header>
    <div class="chx-stage">
      <div class="chx-packs" aria-live="polite"></div>
      <button class="chx-chest" aria-label="Ouvrir le coffre"><span class="chx-aura"></span>${chestSVG(type)}<span class="chx-burst"></span></button>
      <p class="chx-msg">Touche le coffre pour l’ouvrir</p>
      <div class="chx-actions" hidden></div>
    </div>`;
  document.body.appendChild(el);
  document.body.classList.add('has-sheet', 'lock-scroll');
  if (el.querySelector('.ch-img')) new Image().src = `assets/chests/${type}-open.webp`;
  const chest = el.querySelector('.chx-chest'), msg = el.querySelector('.chx-msg'), row = el.querySelector('.chx-packs'), acts = el.querySelector('.chx-actions');
  let packs = null, busy = false, closed = false;

  // v311 : Échap et changement d'écran ferment le coffre (il restait affiché par-dessus les autres écrans)
  const onKey = (e) => { if (e.key === 'Escape' && !busy) close(); };
  const onRoute = () => close();
  document.addEventListener('keydown', onKey); window.addEventListener('hashchange', onRoute);
  function close(then) {
    if (closed) return; closed = true;
    document.removeEventListener('keydown', onKey); window.removeEventListener('hashchange', onRoute);
    el.classList.add('out');
    setTimeout(() => { el.remove(); document.body.classList.remove('has-sheet', 'lock-scroll'); then ? then() : onDone && onDone(); }, 250);
  }
  async function open() {
    if (busy || packs) return;
    busy = true;
    try { packs = g.openChest(type); } catch (err) { toast(esc(err.message), { kind: 'error' }); busy = false; close(); return; }
    el.querySelector('[data-x="close"]').hidden = true;
    // 1. tension : le coffre tremble, la lumière monte
    msg.textContent = 'Le sceau cède…';
    chest.classList.add('charging'); app.sfx.chest();
    await wait(1100);
    // 2. ouverture : éclair, couvercle, rayons
    chest.classList.remove('charging'); chest.classList.add('open');
    const img = chest.querySelector('.ch-img'); if (img) img.src = `assets/chests/${type}-open.webp`;
    el.classList.add('flash', 'epic'); setTimeout(() => el.classList.remove('flash'), 700);
    app.sfx.reveal(type === 'abyssal' || type === 'or' ? 'M' : 'HR');
    await wait(500);
    // 3. les boosters jaillissent un par un
    msg.textContent = '';
    for (let i = 0; i < packs.length; i++) {
      const k = packs[i];
      const p = document.createElement('div');
      p.className = `chx-pack ${k === 'premium' ? 'prem' : ''}`;
      p.style.setProperty('--i', i); p.style.setProperty('--n', packs.length);
      p.innerHTML = `${packHTML(k, app.catalog)}<span class="chx-pname">${esc(BOOSTERS[k].name)}</span>`;
      row.appendChild(p);
      app.sfx.swipe(); if (k === 'premium') setTimeout(() => app.sfx.discover(), 200);
      await wait(520);
    }
    // les éclats puis les cendres jaillissent après les boosters
    const extras = [def.shards && ['crystal', def.shards, 'éclats'], def.ash && ['ash', def.ash, 'cendres']].filter(Boolean);
    for (let j = 0; j < extras.length; j++) {
      const [ic, v, l] = extras[j];
      const p = document.createElement('div');
      p.className = 'chx-pack chx-shards'; p.style.setProperty('--i', packs.length + j); p.style.setProperty('--n', packs.length + extras.length);
      p.innerHTML = `<span class="chx-sh-ic">${icon(ic)}</span><b>+${v}</b><span class="chx-pname">${l}</span>`;
      row.appendChild(p); app.sfx.coin(); app.chrome?.();
      await wait(520);
    }
    const gains = [def.shards && `${def.shards} éclats`, def.ash && `${def.ash} cendres`].filter(Boolean);
    const n = packs.length, prem = packs.filter((k) => k === 'premium').length;
    if (!n) { // coffre sans booster : seulement des éclats
      const price = BOOSTERS.standard.price, have = g.s.shards;
      msg.innerHTML = `<b class="chx-count">+${gains.join(' et +')} !</b><span class="chx-bp small">${have >= price ? `Tu as ${fmt(have)} éclats : de quoi acheter un booster.` : `${fmt(have)} / ${fmt(price)} éclats pour ton prochain booster`}</span>`;
      acts.innerHTML = '<button class="btn primary block big-cta dc-plq dc-plq-red" data-x="later">Continuer</button>';
      acts.hidden = false; busy = false; return;
    }
    msg.innerHTML = `<b class="chx-count">${n} booster${n > 1 ? 's' : ''}${prem ? ` dont ${prem === n ? (n > 1 ? 'tous premium' : 'premium') : `${prem} premium`}` : ''}${gains.length ? ` et ${gains.join(' et ')}` : ''} !</b>`;
    acts.innerHTML = `<button class="btn primary block big-cta dc-plq dc-plq-red" data-x="go">${icon('p:booster')}Ouvrir ${n > 1 ? 'les boosters' : 'le booster'}</button><button class="btn block dc-plq dc-plq-dark" data-x="later">Plus tard (dans Boosters)</button>`;
    acts.hidden = false;
    busy = false;
  }
  const openAll = (list) => {
    const next = () => { const k = list.shift(); if (!k) { onDone && onDone(); return; } openPack(app, k, { onDone: () => setTimeout(next, 300) }); };
    next();
  };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-x]');
    if (b?.dataset.x === 'close') return close();
    if (b?.dataset.x === 'later') return close();
    if (b?.dataset.x === 'go') return close(() => openAll(packs.slice()));
    if (e.target.closest('.chx-chest')) open();
  });
}
