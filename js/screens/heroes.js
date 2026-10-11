// Héros : liste, fiche détaillée (statistiques, compétences, progression) et invocations.
import { HEROES, HERO_ORDER, SKILLS, INVOCATIONS, INVOCATION_ORDER, makeHero, invocationPower } from '../core/heroes.js';
import { VARIANTS } from '../config.js';
import { heroCardHTML, heroArtUrl, invocationCardHTML } from '../ui/hero.js';
import { artUrl } from '../art/assets.js';
import { icon } from '../ui/icons.js';
import { esc, fmt, openSheet, toast } from '../ui/dom.js';
import { BASES, SLOTS, SLOT_ORDER, GEAR_RARITY, canUse, itemScore } from '../core/gear.js';
import { gearIcon, statLine, effectLines, itemName } from '../ui/gear.js';

export function fillInvocationArt(app, root) {
  root.querySelectorAll('.ic-art[data-card]').forEach((el) => {
    const c = app.catalog.get(el.dataset.card);
    const open = !el.closest('.locked');
    if (c) el.innerHTML = `<img alt="" class="${open ? '' : 'veiled'}" src="${artUrl(c, { lite: true, mystery: !open && !app.game.owns(c.id) })}">`;
  });
}

// Choix d'un objet pour un emplacement
function pickGear(app, hero, slot, done) {
  const g = app.game;
  const list = Object.entries(g.arsenal().items)
    .filter(([, it]) => BASES[it.b]?.slot === slot && canUse(it.b, hero))
    .sort((x, y) => itemScore(y[1]) - itemScore(x[1]));
  const cur = g.equipped(hero)[slot];
  const sh = openSheet(`<h2>${esc(SLOTS[slot].name)} · ${esc(HEROES[hero].name.split(' ')[0])}</h2>
    ${list.length ? `<div class="gp-list">${list.map(([id, it]) => { const w = g.wearer(id); return `<button class="gp-row ${id === cur ? 'on' : ''}" data-id="${id}" style="--gc:${GEAR_RARITY[it.r].color}"><span class="gi-ic">${gearIcon(BASES[it.b].type)}</span><span class="gp-t"><b>${esc(itemName(it))}</b><span class="small">${esc(GEAR_RARITY[it.r].name)}${statLine(it) ? ` · ${statLine(it)}` : ''}</span>${effectLines(it).map((l) => `<span class="small gs-fx">${l}</span>`).join('')}${w && w !== hero ? `<span class="small muted">Porté par ${esc(HEROES[w].name.split(' ')[0])} : il lui sera retiré</span>` : ''}</span>${id === cur ? icon('check') : ''}</button>`; }).join('')}</div>`
      : `<p class="small muted">Aucun objet de ce type pour ${esc(HEROES[hero].name.split(' ')[0])}. Ouvre des coffres dans l’<a href="#/arsenal">Arsenal</a>.</p>`}
    ${cur ? '<button class="btn ghost block" data-id="none">Retirer l’objet</button>' : ''}`, { label: SLOTS[slot].name });
  sh.body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    try { if (b.dataset.id === 'none') g.unequip(hero, slot); else g.equip(b.dataset.id, hero); app.sfx.tap(); sh.close(); done(); }
    catch (err) { app.sfx.error(); toast(esc(err.message), { kind: 'error' }); }
  });
}

export function openHero(app, key) {
  const g = app.game, h = HEROES[key];
  const sheet = openSheet('', { label: h.name, onClose: () => { app.refreshView && app.refreshView(); } });
  const stat = (l, v, b) => `<div><dt>${l}</dt><dd>${v}${b ? `<small class="hs-gb">+${b}</small>` : ''}</dd></div>`;
  function draw() {
  const info = g.heroInfo(key);
  const u = g.heroUnit(key);
  const gb = g.gearOf(key).stats;
  const eq = g.equipped(key);
  const run = !!g.s.descent.run;
  sheet.setContent(`<div class="hero-sheet" style="--hc:${h.color}">
    <div class="hs-top"><img alt="" src="${heroArtUrl(key)}"><div class="hs-name"><h2>${esc(h.name)}</h2><p>${esc(h.cls)} · ${esc(h.race)}</p><p class="small muted">${esc(h.role)}</p></div></div>
    <div class="hs-lv"><b>Niveau ${info.level}</b><span class="xpbar"><i style="width:${info.need ? (info.into / info.need) * 100 : 100}%"></i></span><span class="small muted">${info.need ? `${fmt(info.into)} / ${fmt(info.need)} XP` : 'Niveau maximum'}</span></div>
    ${g.heroWounded(key) ? `<p class="small dc-bad">${icon('heart')} Blessé encore ${Math.ceil(g.woundLeft(key) / 3600000)} h : statistiques réduites de 20 %. Un baume de soin le remet sur pied.</p>` : ''}
    <dl class="facts hs-stats">${stat('PV', u.maxHp, gb.hp)}${stat('Attaque', u.atk, gb.atk)}${stat('Magie', u.mag, gb.mag)}${stat('Défense', u.def, gb.def)}${stat('Vitesse', u.spd, gb.spd)}</dl>
    <h3 class="section-title">Équipement <button class="linkish" data-hs="auto" ${run ? 'disabled' : ''}>Équiper le meilleur</button></h3>
    <div class="hs-eq">${SLOT_ORDER.map((sl) => { const it = eq[sl] && g.gearItem(eq[sl]); return it
      ? `<button class="hs-slot full" data-hs="slot" data-sl="${sl}" style="--gc:${GEAR_RARITY[it.r].color}" ${run ? 'disabled' : ''}><span class="gi-ic">${gearIcon(BASES[it.b].type)}</span><span><b>${esc(itemName(it))}</b><small>${esc(SLOTS[sl].name)}</small></span></button>`
      : `<button class="hs-slot" data-hs="slot" data-sl="${sl}" ${run ? 'disabled' : ''}><span class="gi-ic empty">+</span><span><b>${esc(SLOTS[sl].name)}</b><small>Vide</small></span></button>`; }).join('')}</div>
    ${run ? '<p class="small muted">Expédition en cours : l’équipement se change à la surface.</p>' : ''}
    <h3 class="section-title">Talent</h3><p class="small">${esc(h.passive)}</p>
    <h3 class="section-title">Compétences</h3>
    ${u.skills.map((k) => `<div class="hs-sk"><b>${esc(SKILLS[k].name)}</b><span class="tb-cost">${'◆'.repeat(SKILLS[k].cost)}</span>${SKILLS[k].spell ? '<span class="hs-spell">Sort</span>' : ''}<p class="small muted">${esc(SKILLS[k].desc)}</p></div>`).join('')}
    <p class="lore small">« ${esc(h.lore)} »</p>
  </div>`);
  }
  sheet.body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-hs]');
    if (!b || b.disabled) return;
    if (b.dataset.hs === 'auto') { try { g.autoEquip(key); app.sfx.tap(); toast('Meilleur équipement en place.', { icon: 'check' }); } catch (err) { toast(esc(err.message), { kind: 'error' }); } draw(); }
    if (b.dataset.hs === 'slot') pickGear(app, key, b.dataset.sl, draw);
  });
  draw();
}

export function openInvocation(app, key) {
  const g = app.game, inv = INVOCATIONS[key], c = app.catalog.get(inv.card);
  const lv = g.invocationLevel(key), v = g.invocationVariant(key);
  const p = Math.round((invocationPower(lv, v) - 1) * 100);
  openSheet(`<div class="hero-sheet" style="--hc:${inv.color}">
    <div class="hs-top"><img alt="" src="${artUrl(c)}"><div class="hs-name"><h2>${esc(inv.name)}</h2><p>Invocation</p><p class="small muted">Niveau ${lv}${p ? ` · puissance +${p} %` : ''}</p></div></div>
    <p>${esc(inv.desc)}</p>
    <p class="small muted">La jauge d’invocation se remplit à chaque action de tes héros, quand ils sont frappés, et davantage avec les frappes et parades parfaites. Une fois pleine, n’importe quel héros peut invoquer à son tour.</p>
    <p class="small muted">Elle gagne de l’expérience à chaque expédition, et beaucoup plus quand tu l’invoques. Posséder sa carte dans une version rare la renforce : ${v !== 'normal' ? `ta version ${esc(VARIANTS[v].name.toLowerCase())} donne un bonus.` : 'holographique +5 %, or +12 %, cosmique +16 %…'}</p>
  </div>`, { label: inv.name });
}

export default function heroes(app, root) {
  const g = app.game;
  function render() {
    root.innerHTML = `
      <header class="screen-head"><h1>Héros</h1><p class="muted">Ceux qui descendent dans l’Abysse. Ils gagnent en niveau à chaque expédition.</p></header>
      <div class="hc-grid">${HERO_ORDER.filter((k) => g.s.heroes[k]).map((k) => heroCardHTML(g, k, { selected: g.s.party.includes(k), order: g.s.party.indexOf(k) + 1 })).join('')}</div>
      <p class="small muted">Touche un héros pour voir sa fiche. Ton équipe de 3 se compose dans la Descente.</p>
      ${HERO_ORDER.some((k) => !g.s.heroes[k]) ? `<h2 class="section-title">À rejoindre</h2>
      <div class="hc-grid">${HERO_ORDER.filter((k) => !g.s.heroes[k]).map((k) => `<div class="hc locked" style="--hc:${HEROES[k].color}"><span class="hc-art"><img alt="" src="${heroArtUrl(k)}"></span><span class="hc-lock">${icon('lock')} Étage ${HEROES[k].unlock}</span><span class="hc-t"><b>${esc(HEROES[k].name)}</b><span>${esc(HEROES[k].cls)} · ${esc(HEROES[k].race)}</span><span class="small">${esc(HEROES[k].role)}</span></span></div>`).join('')}</div>
      <p class="small muted">Atteins l’étage indiqué dans la Descente pour qu’ils rejoignent ton Antre.</p>` : ''}
      <h2 class="section-title">Invocations</h2>
      <div class="ic-grid">${INVOCATION_ORDER.map((k) => invocationCardHTML(g, k, { selected: g.s.invocation === k })).join('')}</div>
      <div class="row gap"><a class="btn block" href="#/arsenal">${icon('shield')}Arsenal</a><a class="btn block" href="#/descente">${icon('swords')}Descente</a></div>`;
    fillInvocationArt(app, root);
  }
  root.addEventListener('click', (e) => {
    const h = e.target.closest('[data-hero]'); if (h) return openHero(app, h.dataset.hero);
    const i = e.target.closest('[data-inv]'); if (i) return openInvocation(app, i.dataset.inv);
  });
  render();
  app.refreshView = render;
  return () => { app.refreshView = null; };
}
