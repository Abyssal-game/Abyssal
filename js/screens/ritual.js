// Rituel d'élévation : une carte monte d'un cran (holographique, or, cosmique)
// contre des cendres. Il réussit toujours, et les doublons (niveaux) ne sont jamais touchés.
import { VARIANTS, RARITY } from '../config.js';
import { artUrl } from '../art/assets.js';
import { cardHTML } from '../ui/card.js';
import { icon } from '../ui/icons.js';
import { openSheet, esc, toast, fmt } from '../ui/dom.js';

export function openRitual(app, id, from, { onClose } = {}) {
  const g = app.game, cat = app.catalog;
  const card = cat.get(id);
  let busy = false;
  const sheet = openSheet('', { cls: 'ritual-sheet', full: true, label: 'Rituel d’élévation', onClose: () => { onClose && onClose(); app.refreshView && app.refreshView(); } });

  function draw() {
    const e = g.entry(id);
    if (!e || !(e.v[from] > 0)) { sheet.setContent('<p class="muted center">Cette carte n’est plus disponible pour le rituel.</p>'); return; }
    const to = g.ritualTarget(id, from);
    if (!to) { sheet.setContent(`<div class="ritual"><h2>${icon('sparkle')} Rituel d’élévation</h2><p>${esc(card.name)} a atteint le sommet : <b>${esc(VARIANTS[from].name)}</b>.</p></div>`); return; }
    const cost = g.ritualCost(id, from), have = g.s.ash, ok = have >= cost;
    sheet.setContent(`<div class="ritual">
      <h2>${icon('sparkle')} Rituel d’élévation</h2>
      <div class="ri-cards">
        <div class="ri-c">${cardHTML(card, { variant: from })}<span class="small muted">${esc(VARIANTS[from].name)}</span></div>
        <span class="ri-arrow">${icon('next')}</span>
        <div class="ri-c ri-to">${cardHTML(card, { variant: to })}<span class="small"><b>${esc(VARIANTS[to].name)}</b></span></div>
      </div>
      <div class="ri-cost ${ok ? '' : 'short'}">
        <span>${icon('ash')}<b>${fmt(cost)}</b> cendres</span>
        <span class="small muted">Tu en as ${fmt(have)}${ok ? '' : ` : il en manque ${fmt(cost - have)}`}</span>
        <i style="--p:${Math.min(100, (have / cost) * 100)}%"></i>
      </div>
      ${g.s.ritualBoost ? `<p class="small ri-boost">${icon('sparkle')} Un encens brûle : -${g.s.ritualBoost} % sur ce rituel.</p>` : g.itemCount('encens') ? `<button class="btn small" data-ri="encens">${icon('sparkle')}Brûler un encens (-15 %) · ${g.itemCount('encens')} en stock</button>` : ''}
      <p class="small muted">Le rituel réussit toujours. Tes doublons ne sont pas touchés : ils gardent le niveau de tes créatures. Les cendres viennent des doublons trouvés dans les boosters.</p>
      <button class="btn primary block" data-ri="go" ${ok ? '' : 'disabled'}>${icon('sparkle')}Lancer le rituel</button>
    </div>`);
  }

  async function go() {
    if (busy) return;
    busy = true;
    let res;
    try { app.pendingProgress = []; res = g.ritual(id, from); }
    catch (err) { app.pendingProgress = null; busy = false; app.sfx.error(); toast(esc(err.message), { kind: 'error' }); return; }
    const to = res.to;
    const reduced = app.reduced();
    sheet.setContent(`<div class="ritual ri-run">
      <div class="ri-circle"><div class="ri-runes"></div><div class="ri-card">${cardHTML(card, { size: 'full', variant: from })}</div></div>
      <p class="ri-msg center">Les cendres se consument…</p>
      <div class="row gap ri-end" hidden></div>
    </div>`);
    app.sfx.rumble(1.6);
    await new Promise((ok) => setTimeout(ok, reduced ? 60 : 1800));
    const box = sheet.body.querySelector('.ri-circle');
    const msg = sheet.body.querySelector('.ri-msg');
    if (!box) return;
    box.classList.add('won');
    box.querySelector('.ri-card').innerHTML = cardHTML(card, { size: 'full', variant: to });
    app.sfx.reveal(['M', 'S'].includes(card.rarity) ? card.rarity : 'HR');
    msg.innerHTML = `<b class="ri-ok">Le rituel a réussi !</b><br>${esc(card.name)} devient <b>${esc(VARIANTS[to].name)}</b>.`;
    const end = sheet.body.querySelector('.ri-end');
    end.innerHTML = `<button class="btn" data-ri="close">Fermer</button>${g.ritualTarget(id, to) ? `<button class="btn primary" data-ri="next">${icon('sparkle')}Continuer l’élévation</button>` : ''}`;
    end.hidden = false;
    app.flushProgress();
    from = to;
    busy = false;
  }

  sheet.body.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ri]');
    if (!b || b.disabled) return;
    const a = b.dataset.ri;
    if (a === 'encens') { try { g.useItem('encens'); app.sfx.discover(); } catch (err) { toast(esc(err.message), { kind: 'error' }); } draw(); }
    if (a === 'go') go();
    if (a === 'next') draw();
    if (a === 'close') sheet.close();
  });
  draw();
  return sheet;
}

// Autel du rituel : toutes les cartes que tu peux élever, en pleine page
export function openRitualHub(app) {
  const g = app.game, cat = app.catalog;
  const sheet = openSheet('', { cls: 'ritual-sheet ri-hub', full: true, label: 'Rituel d’élévation' });
  function draw() {
    const list = [];
    for (const c of cat.cards) {
      const e = g.entry(c.id);
      if (!e) continue;
      const from = ['normal', 'holo', 'gold'].find((v) => e.v[v] > 0 && g.ritualTarget(c.id, v));
      if (from) list.push({ c, from, to: g.ritualTarget(c.id, from), cost: g.ritualCost(c.id, from) });
    }
    list.sort((a, b) => (a.cost <= g.s.ash) - (b.cost <= g.s.ash) || a.cost - b.cost).reverse();
    sheet.setContent(`<div class="ri-hub-in">
      <header class="ri-hub-head"><h2>${icon('sparkle')} Rituel d’élévation</h2>
        <p class="small muted">Fais passer une carte en holographique, en or puis en cosmique. Le rituel réussit toujours et se paie en cendres (${icon('ash')} <b>${fmt(g.s.ash)}</b>).</p></header>
      ${list.length ? `<div class="ri-hub-grid">${list.map(({ c, from, to, cost }) => `<button class="ri-hub-c ${cost <= g.s.ash ? 'ok' : ''}" data-id="${c.id}" data-from="${from}" style="--rc:${RARITY[c.rarity].color}">
        <img alt="" src="${artUrl(c, { lite: true })}"><b>${esc(c.name)}</b><span class="small">${esc(VARIANTS[from].short)} → <b>${esc(VARIANTS[to].short)}</b></span><span class="ri-hub-cost">${icon('ash')} ${fmt(cost)}</span></button>`).join('')}</div>` : '<p class="muted center">Aucune carte à élever pour l’instant.</p>'}
    </div>`);
  }
  sheet.body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (b) openRitual(app, b.dataset.id, b.dataset.from, { onClose: draw });
  });
  draw();
  return sheet;
}
