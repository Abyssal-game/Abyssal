// Rituel d'élévation : une carte monte d'un cran (holographique, chromatique, or, cosmique)
// en sacrifiant des doublons. Chance affichée, ferveur en cas d'échec, rituel interdit risqué.
import { RARITY, RARITIES, VARIANTS, RITUAL } from '../config.js';
import { cardHTML } from '../ui/card.js';
import { icon } from '../ui/icons.js';
import { openSheet, esc, toast, confirmBox } from '../ui/dom.js';

const KEYS = ['C', 'PC', 'R', 'HR', 'M', 'S'];

export function openRitual(app, id, from, { onClose } = {}) {
  const g = app.game, cat = app.catalog;
  const card = cat.get(id);
  const offer = Object.fromEntries(KEYS.map((k) => [k, 0]));
  let forbidden = false, busy = false;
  const sheet = openSheet('', { cls: 'ritual-sheet', label: 'Rituel d’élévation', onClose: () => { onClose && onClose(); app.refreshView && app.refreshView(); } });

  function draw() {
    const e = g.entry(id);
    if (!e || !(e.v[from] > 0)) { sheet.setContent('<p class="muted center">Cette carte n’est plus disponible pour le rituel.</p>'); return; }
    const to = g.ritualTarget(id, from);
    if (!to) { sheet.setContent(`<div class="ritual"><h2>${icon('sparkle')} Rituel d’élévation</h2><p>${esc(card.name)} a atteint le sommet : <b>${esc(VARIANTS[from].name)}</b>.</p></div>`); return; }
    const chance = g.ritualChance(id, from, offer, forbidden);
    const fervor = g.s.fervor[`${id}:${to}`] || 0;
    const rows = KEYS.map((k) => {
      const max = g.ritualSpare(k, id);
      if (!max && !offer[k]) return '';
      const R = RARITY[k];
      return `<div class="ri-off"><span class="fu-gem" style="--rc:${R.color}">${R.short}</span><span class="ri-on"><b>${R.name}</b><span class="small muted">${max} doublon${max > 1 ? 's' : ''} · ${RITUAL.points[k]} pt${RITUAL.points[k] > 1 ? 's' : ''}</span></span>
        <span class="ri-step"><button class="icon-btn" data-ri="minus" data-k="${k}" aria-label="Retirer" ${offer[k] ? '' : 'disabled'}>−</button><b>${offer[k]}</b><button class="icon-btn" data-ri="plus" data-k="${k}" aria-label="Ajouter" ${offer[k] < max ? '' : 'disabled'}>+</button></span></div>`;
    }).join('');
    sheet.setContent(`<div class="ritual">
      <h2>${icon('sparkle')} Rituel d’élévation</h2>
      <div class="ri-cards">
        <div class="ri-c">${cardHTML(card, { variant: from })}<span class="small muted">${esc(VARIANTS[from].name)}</span></div>
        <span class="ri-arrow">${icon('next')}</span>
        <div class="ri-c ri-to">${cardHTML(card, { variant: to })}<span class="small"><b>${esc(VARIANTS[to].name)}</b></span></div>
      </div>
      <div class="ri-chance ${forbidden ? 'forbidden' : ''}"><div class="ring" style="--p:${chance};--c:${forbidden ? '#FF3A5A' : 'var(--gold)'}"><span>${String(chance).replace('.', ',')}%</span></div>
        <div><b>Chance de réussite</b><p class="small muted">${fervor ? `Ferveur : +${fervor * RITUAL.fervor} % grâce à ${fervor} échec${fervor > 1 ? 's' : ''} précédent${fervor > 1 ? 's' : ''}.` : 'Chaque échec ajoute de la ferveur : la tentative suivante sera plus facile.'}</p></div></div>
      ${g.s.ritualBoost ? `<p class="small ri-boost">${icon('sparkle')} Un encens de ferveur brûle : +${g.s.ritualBoost} % pour ce rituel.</p>` : g.itemCount('encens') ? `<button class="btn small" data-ri="encens">${icon('sparkle')}Brûler un encens (+15 %) · ${g.itemCount('encens')} en stock</button>` : ''}
      <h3 class="section-title">Offrandes</h3>
      ${rows || '<p class="small muted">Tu n’as aucun doublon à offrir. Ouvre des boosters pour en obtenir.</p>'}
      <div class="ri-forbid ${forbidden ? 'on' : ''}"><div><b>Rituel interdit</b><p class="small">Chance doublée. Mais si le rituel échoue, <b>cet exemplaire de ${esc(card.name)} est consumé</b>.</p></div>
        <button class="switch" role="switch" aria-checked="${forbidden}" data-ri="forbid" aria-label="Rituel interdit"><i></i></button></div>
      <p class="small muted">Les offrandes sont détruites, que le rituel réussisse ou non. Ton premier exemplaire de chaque carte n’est jamais offert.</p>
      <button class="btn ${forbidden ? 'danger' : 'primary'} block" data-ri="go" ${chance ? '' : 'disabled'}>${icon('sparkle')}Lancer le rituel</button>
    </div>`);
  }

  async function go() {
    if (busy) return;
    if (forbidden && !(await confirmBox(`Rituel interdit : en cas d’échec, cet exemplaire de <b>${esc(card.name)}</b> sera perdu. Continuer ?`, { ok: 'Je prends le risque', danger: true }))) return;
    busy = true;
    const to = g.ritualTarget(id, from);
    let res;
    try { app.pendingProgress = []; res = g.ritual(id, from, offer, forbidden); }
    catch (err) { app.pendingProgress = null; busy = false; app.sfx.error(); toast(esc(err.message), { kind: 'error' }); return; }
    const reduced = app.reduced();
    sheet.setContent(`<div class="ritual ri-run">
      <div class="ri-circle ${forbidden ? 'forbidden' : ''}"><div class="ri-runes"></div><div class="ri-card">${cardHTML(card, { size: 'full', variant: from })}</div></div>
      <p class="ri-msg center">Les offrandes se consument…</p>
      <div class="row gap ri-end" hidden></div>
    </div>`);
    app.sfx.rumble(1.6);
    try { navigator.vibrate?.([30, 60, 30, 60, 60]); } catch (e) { /* rien */ }
    await new Promise((ok) => setTimeout(ok, reduced ? 60 : 1800));
    const box = sheet.body.querySelector('.ri-circle');
    const msg = sheet.body.querySelector('.ri-msg');
    if (!box) return;
    if (res.success) {
      box.classList.add('won');
      box.querySelector('.ri-card').innerHTML = cardHTML(card, { size: 'full', variant: to });
      app.sfx.reveal(['M', 'S'].includes(card.rarity) ? card.rarity : 'HR');
      msg.innerHTML = `<b class="ri-ok">Le rituel a réussi !</b><br>${esc(card.name)} devient <b>${esc(VARIANTS[to].name)}</b>.`;
    } else {
      box.classList.add(res.lost || forbidden ? 'burnt' : 'failed');
      app.sfx.error();
      msg.innerHTML = forbidden
        ? `<b class="ri-ko">Le rituel interdit a échoué.</b><br>${res.lost ? `${esc(card.name)} a été consumée et quitte ta collection.` : `Un exemplaire de ${esc(card.name)} a été consumé.`}`
        : `<b class="ri-ko">Le rituel a échoué.</b><br>Ta ferveur augmente : +${RITUAL.fervor} % pour la prochaine tentative.`;
    }
    const end = sheet.body.querySelector('.ri-end');
    const canRetry = !res.success && g.entry(id)?.v[from] > 0;
    end.innerHTML = `<button class="btn" data-ri="close">Fermer</button>${canRetry ? `<button class="btn primary" data-ri="again">${icon('sparkle')}Réessayer</button>` : res.success && g.ritualTarget(id, to) ? `<button class="btn primary" data-ri="next">${icon('sparkle')}Continuer l’élévation</button>` : ''}`;
    end.hidden = false;
    app.flushProgress();
    if (res.success) from = to;
    KEYS.forEach((k) => { offer[k] = 0; });
    forbidden = false;
    busy = false;
  }

  sheet.body.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ri]');
    if (!b || b.disabled) return;
    const a = b.dataset.ri, k = b.dataset.k;
    if (a === 'plus') { offer[k]++; app.sfx.tap(); draw(); }
    if (a === 'minus') { offer[k] = Math.max(0, offer[k] - 1); app.sfx.tap(); draw(); }
    if (a === 'forbid') { forbidden = !forbidden; draw(); }
    if (a === 'encens') { try { g.useItem('encens'); app.sfx.discover(); } catch (err) { toast(esc(err.message), { kind: 'error' }); } draw(); }
    if (a === 'go') go();
    if (a === 'again' || a === 'next') draw();
    if (a === 'close') sheet.close();
  });
  draw();
  return sheet;
}
