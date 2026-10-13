// La Fournaise : on y brûle des cartes (doublons ou non) pour des cendres,
// et les cendres font monter le niveau des créatures.
import { VARIANTS, RARITY } from '../config.js';
import { artUrl } from '../art/assets.js';
import { icon } from '../ui/icons.js';
import { openSheet, confirmBox, esc, toast, fmt } from '../ui/dom.js';
import { duelUnit } from '../core/duel.js';
import { MAX_LEVEL } from '../core/army.js';

const FIN_ORDER = ['normal', 'holo', 'gold', 'galaxy'];

// Monte d'un niveau (bouton « Niveau suivant » des fiches)
export function upgradeCard(app, id) {
  const g = app.game, c = app.catalog.get(id);
  try {
    app.pendingProgress = [];
    const r = g.upgrade(id);
    app.sfx.discover?.();
    toast(`<b>${esc(c.name)}</b> passe au niveau <b>${r.level}</b> (−${fmt(r.cost)} cendres).`, { kind: 'success', icon: 'star' });
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
  return [nx.atk > u.atk ? `+${nx.atk - u.atk} ATQ` : '', nx.maxHp > u.maxHp ? `+${nx.maxHp - u.maxHp} PV` : ''].filter(Boolean).join(' ');
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

// La Fournaise en pleine page : doublons à brûler, puis créatures de l'équipe à renforcer
export function openFurnace(app) {
  const g = app.game, cat = app.catalog;
  const sheet = openSheet('', { cls: 'ritual-sheet ri-hub', full: true, label: 'Fournaise', onClose: () => app.refreshView && app.refreshView() });
  function draw() {
    const sp = g.spareAsh();
    const spares = cat.cards.filter((c) => g.spare(c.id) > 0);
    const team = g.team().map((id) => cat.get(id)).filter(Boolean);
    const cell = (c, foot, cls = '') => `<button class="ri-hub-c ${cls}" data-id="${c.id}" style="--rc:${RARITY[c.rarity].color}"><span class="ri-hub-art"><img alt="" src="${artUrl(c, { lite: true })}"></span><b>${esc(c.name)}</b>${foot}</button>`;
    sheet.setContent(`<div class="ri-hub-in">
      <header class="screen-head ui-hero bn-furnace ri-hub-hero"><h1>La Fournaise</h1><p class="muted">Brûle tes cartes pour des cendres, et les cendres renforcent tes créatures.</p>
        <span class="ri-hub-ash">${icon('ash')}<b>${fmt(g.s.ash)}</b> cendres</span></header>
      <h2 class="section-title">Doublons</h2>
      ${sp.n ? `<button class="btn primary block" data-fz="all">${icon('p:furnace')}Tout brûler : ${sp.n} doublon${sp.n > 1 ? 's' : ''} · +${fmt(sp.ash)} cendres</button>
        <p class="small muted">Un exemplaire de chaque finition est toujours gardé.</p>
        <div class="ri-hub-grid">${spares.map((c) => cell(c, `<span class="ri-hub-step">×${g.spare(c.id)} en trop</span><span class="ri-hub-cost">${icon('ash')} ${fmt(g.spareAsh([c.id]).ash)}</span>`, 'ok')).join('')}</div>`
        : '<p class="small muted">Aucun doublon pour l’instant. Ceux que tu tires dans les boosters arrivent ici.</p>'}
      <h2 class="section-title">Renforcer ton équipe</h2>
      ${team.length ? `<div class="ri-hub-grid">${team.map((c) => { const li = g.cardLevelInfo(c.id); return cell(c, `<span class="ri-hub-step">Niv. ${li.level}${li.cost ? ` <i>→</i> <em>${li.level + 1}</em>` : ' (max)'}</span>${li.cost ? `<span class="ri-hub-cost">${icon('ash')} ${fmt(li.cost)}</span>` : ''}`, li.cost && li.cost <= g.s.ash ? 'ok' : ''); }).join('')}</div>` : ''}
      <p class="small muted ri-hub-foot">Touche une créature pour la renforcer ou la brûler. Toutes tes cartes peuvent être brûlées depuis leur fiche, même la dernière : elle quitte alors ta collection.</p>
    </div>`);
  }
  sheet.body.addEventListener('click', async (e) => {
    if (e.target.closest('[data-fz="all"]')) {
      const sp = g.spareAsh();
      if (!(await confirmBox(`Brûler <b>${sp.n} doublon${sp.n > 1 ? 's' : ''}</b> pour <b>${fmt(sp.ash)} cendres</b> ?<br><span class="small">Tu gardes un exemplaire de chaque finition.</span>`, { ok: 'Tout brûler' }))) return;
      app.pendingProgress = [];
      const r = g.burnSpares();
      app.sfx.rumble?.(1.2);
      toast(`La Fournaise rugit : <b>+${fmt(r.ash)} cendres</b>`, { kind: 'epic', icon: 'ash' });
      app.flushProgress(); app.chrome?.();
      return draw();
    }
    const b = e.target.closest('[data-id]');
    if (b) openFurnaceCard(app, b.dataset.id, draw);
  });
  draw();
  return sheet;
}

// Fiche courte : renforcer ou brûler
function openFurnaceCard(app, id, onChange) {
  const g = app.game, c = app.catalog.get(id);
  const sh = openSheet('', { cls: 'ritual-sheet', label: c.name, onClose: onChange });
  const draw = () => {
    if (!g.owns(id)) return sh.close();
    const li = g.cardLevelInfo(id), gain = nextLevelGain(g, c);
    sh.setContent(`<div class="fz-burn">
      <h2>${esc(c.name)}</h2>
      <p class="small muted">Niveau ${li.level} / ${MAX_LEVEL} · ${g.entry(id).n} exemplaire${g.entry(id).n > 1 ? 's' : ''}</p>
      ${li.cost ? `<button class="btn gold block" data-fz="up">${icon('p:level-up')}Niveau ${li.level + 1} · ${fmt(li.cost)} cendres${gain ? ` <small>(${gain})</small>` : ''}</button>` : '<p class="small dc-good">Niveau maximum.</p>'}
      <button class="btn ghost block" data-fz="burn">${icon('p:furnace')}La brûler…</button>
      <p class="small muted">Tu as ${icon('ash')} <b>${fmt(g.s.ash)}</b> cendres.</p>
    </div>`);
  };
  sh.body.addEventListener('click', (e) => {
    if (e.target.closest('[data-fz="up"]')) { upgradeCard(app, id); draw(); }
    if (e.target.closest('[data-fz="burn"]')) openBurn(app, id, { onClose: draw });
  });
  draw();
}
