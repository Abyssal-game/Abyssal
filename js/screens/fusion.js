// Fusion des doublons : 5 exemplaires en trop d'une rareté donnent 1 carte de la rareté au-dessus.
import { RARITY, FUSION } from '../config.js';
import { cardHTML } from '../ui/card.js';
import { icon, EMBLEM } from '../ui/icons.js';
import { openSheet, esc, toast, fmt } from '../ui/dom.js';

export function openFusion(app) {
  const g = app.game, cat = app.catalog;
  const sheet = openSheet('', { cls: 'fusion-sheet', label: 'Fusion des doublons', onClose: () => app.refreshView && app.refreshView() });

  function list() {
    const rows = Object.entries(FUSION.next).map(([r, next]) => {
      const n = g.spareCount(r), can = n >= FUSION.cost;
      const R = RARITY[r], N = RARITY[next];
      return `<div class="fu-row panel">
        <div class="fu-from"><span class="fu-gem" style="--rc:${R.color}">${R.short}</span><div><b>${R.name}</b><span class="small muted">${n} doublon${n > 1 ? 's' : ''}</span></div></div>
        <span class="progress fu-bar"><i style="width:${Math.min(100, (n / FUSION.cost) * 100)}%;--bar:${R.color}"></i></span>
        <button class="btn small ${can ? 'primary' : ''}" data-fuse="${r}" ${can ? '' : 'disabled'}>${FUSION.cost} → 1 <span class="fu-gem sm" style="--rc:${N.color}">${N.short}</span></button>
      </div>`;
    }).join('');
    sheet.setContent(`<div class="fusion">
      <h2>${icon('sparkle')} Fusion des doublons</h2>
      <p class="small muted">Fusionne ${FUSION.cost} doublons d’une même rareté pour obtenir une carte de la rareté supérieure, avec plus de chances d’en découvrir une nouvelle. Ton premier exemplaire de chaque carte et tes variantes sont toujours gardés.</p>
      <div class="stack">${rows}</div>
    </div>`);
  }

  async function fuse(r) {
    let res;
    try { app.pendingProgress = []; res = g.fuse(r); }
    catch (e) { app.pendingProgress = null; app.sfx.error(); toast(esc(e.message), { kind: 'error' }); return; }
    const card = cat.get(res.id);
    sheet.setContent(`<div class="fusion fu-result">
      <p class="small muted center">${res.used.length} doublons se consument…</p>
      <div class="fu-stage"><div class="fu-orb" style="--rc:${RARITY[card.rarity].color}"></div>
        <div class="fu-card"><div class="fu-flip"><div class="tcg-back">${EMBLEM}</div></div></div></div>
      <p class="fu-label center"></p>
      <div class="row gap fu-actions" hidden><button class="btn" data-fu="again">${icon('sparkle')}Fusionner encore</button><button class="btn primary" data-fu="see">${icon('eye')}Voir la carte</button></div>
    </div>`);
    app.sfx.rumble(0.9);
    const reduced = app.reduced();
    await new Promise((ok) => setTimeout(ok, reduced ? 50 : 1000));
    const flip = sheet.body.querySelector('.fu-flip');
    if (!flip) return;
    flip.classList.add('half');
    await new Promise((ok) => setTimeout(ok, reduced ? 20 : 180));
    flip.innerHTML = cardHTML(card, { size: 'full' });
    flip.classList.remove('half');
    sheet.body.querySelector('.fu-stage').classList.add('done');
    app.sfx.reveal(card.rarity);
    sheet.body.querySelector('.fu-label').innerHTML = `<b style="color:${RARITY[card.rarity].color}">${RARITY[card.rarity].name}</b> · ${res.isNewCard ? `<span class="newtag">Nouvelle découverte</span>${res.shards ? ` · +${fmt(res.shards)} éclats` : ''}` : 'déjà dans ta collection'}`;
    sheet.body.querySelector('.fu-actions').hidden = false;
    app.flushProgress();
    sheet.body.querySelector('.fu-actions').addEventListener('click', (e) => {
      const a = e.target.closest('[data-fu]'); if (!a) return;
      if (a.dataset.fu === 'see') app.openCard(card.id);
      else list();
    });
  }

  sheet.body.addEventListener('click', (e) => { const b = e.target.closest('[data-fuse]'); if (b && !b.disabled) fuse(b.dataset.fuse); });
  list();
  return sheet;
}
