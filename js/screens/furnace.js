// La Fournaise : on y brûle des cartes (doublons ou non) pour des cendres,
// et les cendres font monter le niveau des créatures.
import { VARIANTS } from '../config.js';
import { icon } from '../ui/icons.js';
import { openSheet, confirmBox, esc, toast, fmt } from '../ui/dom.js';
import { duelUnit } from '../core/duel.js';
import { MAX_LEVEL } from '../core/army.js';
import { unlockAt } from '../core/kits.js';

const FIN_ORDER = ['normal', 'holo', 'gold', 'galaxy'];

// Monte d'un niveau (bouton « Niveau suivant » des fiches)
export function upgradeCard(app, id) {
  const g = app.game, c = app.catalog.get(id);
  try {
    app.pendingProgress = [];
    const r = g.upgrade(id);
    app.sfx.discover?.();
    toast(`<b>${esc(c.name)}</b> passe au niveau <b>${r.level}</b> (−${fmt(r.cost)} cendres).`, { kind: 'success', icon: 'star' });
    const un = unlockAt(id, r.level);
    if (un) { toast(`${un.kind === 'Éveil' ? `<b>${esc(c.name)}</b> s’éveille !` : un.kind === 'Apogée' ? `<b>${esc(c.name)}</b> atteint son Apogée !` : `${un.kind === 'Compétence' ? 'Nouvelle compétence' : 'Nouveau passif'} : <b>${esc(un.name)}</b>`}<br><span class="small">${esc(un.desc)}</span>`, { kind: 'success', icon: 'sparkle' }); app.sfx.fury?.(); }
    app.flushProgress();
    app.chrome?.();
    return true;
  } catch (err) { app.pendingProgress = null; app.sfx.error(); toast(esc(err.message), { kind: 'error' }); return false; }
}

// Ce que gagne la créature au niveau suivant
export function nextLevelGain(g, c) {
  const lv = g.cardLevel(c.id);
  if (lv >= MAX_LEVEL) return '';
  const fm = g.formOf(c.id), u = duelUnit(c, { level: lv, form: fm }), nx = duelUnit(c, { level: lv + 1, form: fm });
  const un = unlockAt(c.id, lv + 1);
  return [nx.atk > u.atk ? `+${nx.atk - u.atk} ATQ` : '', nx.maxHp > u.maxHp ? `+${nx.maxHp - u.maxHp} PV` : '', un ? `+ ${un.kind === 'Éveil' || un.kind === 'Apogée' ? un.kind : un.name}` : ''].filter(Boolean).join(' ');
}

// Brûler une créature précise : une finition au choix, le dernier exemplaire compris
export function openBurn(app, id, { onClose } = {}) {
  const g = app.game, card = app.catalog.get(id);
  const sheet = openSheet('', { cls: 'ritual-sheet', label: 'Fournaise', onClose: () => { onClose && onClose(); app.refreshView && app.refreshView(); } });
  function draw() {
    const e = g.entry(id);
    if (!e) { sheet.setContent(`<div class="fz-burn"><h2>${icon('p:furnace')} Fournaise</h2><p class="muted">${esc(card.name)} a quitté ta collection.</p><button class="btn block" data-fz="close">Fermer</button></div>`); return; }
    const rows = FIN_ORDER.filter((v) => e.v[v] > 0).map((v) => {
      const k = e.v[v], val = g.burnValue(id, v), last = e.n === 1;
      return `<div class="fz-row"><span><b>${esc(VARIANTS[v].name)}</b><small class="muted">×${k} · ${icon('ash')} ${fmt(val)} chacune</small></span>
        <button class="btn small ${last ? 'danger' : 'gold'}" data-fz="one" data-v="${v}">${icon('p:furnace')}Brûler${last ? ' la dernière' : ''}</button></div>`;
    }).join('');
    const sp = g.spareAsh([id]);
    sheet.setContent(`<div class="fz-burn">
      <h2>${icon('p:furnace')} Fournaise</h2>
      <p class="small muted">${esc(card.name)} · ${e.n} exemplaire${e.n > 1 ? 's' : ''} · niveau ${g.cardLevel(id)}. Une carte brûlée disparaît et laisse des cendres. Les finitions rares en laissent bien plus.</p>
      ${sp.n ? `<button class="btn primary block" data-fz="spares">${icon('p:furnace')}Brûler les ${sp.n} doublon${sp.n > 1 ? 's' : ''} · +${fmt(sp.ash)} cendres</button>` : ''}
      <div class="fz-rows">${rows}</div>
      <p class="small muted">Tu as ${icon('ash')} <b>${fmt(g.s.ash)}</b> cendres.</p>
    </div>`);
  }
  sheet.body.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-fz]');
    if (!b) return;
    const a = b.dataset.fz;
    if (a === 'close') return sheet.close();
    const e = g.entry(id);
    try {
      app.pendingProgress = [];
      if (a === 'spares') { const r = g.burnSpares([id]); toast(`${r.n} doublon${r.n > 1 ? 's' : ''} brûlé${r.n > 1 ? 's' : ''} : <b>+${fmt(r.ash)} cendres</b>`, { kind: 'success', icon: 'ash' }); }
      if (a === 'one') {
        const v = b.dataset.v;
        if (e.n === 1 && !(await confirmBox(`C’est ton <b>dernier exemplaire</b> de ${esc(card.name)}.<br>Elle quittera ta collection${g.cardLevel(id) > 1 ? ` et perdra son <b>niveau ${g.cardLevel(id)}</b>` : ''}. Tu recevras <b>${fmt(g.burnValue(id, v))} cendres</b>.`, { ok: 'Brûler', danger: true }))) { app.pendingProgress = null; return; }
        if (e.n > 1 && v !== 'normal' && e.v[v] === 1 && !(await confirmBox(`Brûler ta seule version <b>${esc(VARIANTS[v].name.toLowerCase())}</b> de ${esc(card.name)} pour <b>${fmt(g.burnValue(id, v))} cendres</b> ?`, { ok: 'Brûler', danger: true }))) { app.pendingProgress = null; return; }
        const r = g.burn(id, v);
        toast(r.gone ? `${esc(card.name)} est partie en fumée : <b>+${fmt(r.ash)} cendres</b>` : `<b>+${fmt(r.ash)} cendres</b>`, { kind: 'success', icon: 'ash' });
      }
      app.sfx.rumble?.(0.8);
      app.flushProgress();
      app.chrome?.();
    } catch (err) { app.pendingProgress = null; app.sfx.error(); toast(esc(err.message), { kind: 'error' }); }
    draw();
  });
  draw();
  return sheet;
}
