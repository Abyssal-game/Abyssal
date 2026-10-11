// Héros : liste, fiche détaillée (statistiques, compétences, progression) et invocations.
import { HEROES, HERO_ORDER, SKILLS, INVOCATIONS, INVOCATION_ORDER, makeHero, invocationPower } from '../core/heroes.js';
import { VARIANTS } from '../config.js';
import { heroCardHTML, heroArtUrl, invocationCardHTML } from '../ui/hero.js';
import { artUrl } from '../art/assets.js';
import { icon } from '../ui/icons.js';
import { esc, fmt, openSheet } from '../ui/dom.js';

export function fillInvocationArt(app, root) {
  root.querySelectorAll('.ic-art[data-card]').forEach((el) => {
    const c = app.catalog.get(el.dataset.card);
    const open = !el.closest('.locked');
    if (c) el.innerHTML = `<img alt="" class="${open ? '' : 'veiled'}" src="${artUrl(c, { lite: true, mystery: !open && !app.game.owns(c.id) })}">`;
  });
}

export function openHero(app, key) {
  const g = app.game, h = HEROES[key], info = g.heroInfo(key);
  const u = makeHero(key, { level: info.level, wounded: g.heroWounded(key) });
  const stat = (l, v) => `<div><dt>${l}</dt><dd>${v}</dd></div>`;
  openSheet(`<div class="hero-sheet" style="--hc:${h.color}">
    <div class="hs-top"><img alt="" src="${heroArtUrl(key)}"><div class="hs-name"><h2>${esc(h.name)}</h2><p>${esc(h.cls)} · ${esc(h.race)}</p><p class="small muted">${esc(h.role)}</p></div></div>
    <div class="hs-lv"><b>Niveau ${info.level}</b><span class="xpbar"><i style="width:${info.need ? (info.into / info.need) * 100 : 100}%"></i></span><span class="small muted">${info.need ? `${fmt(info.into)} / ${fmt(info.need)} XP` : 'Niveau maximum'}</span></div>
    ${g.heroWounded(key) ? `<p class="small dc-bad">${icon('heart')} Blessé encore ${Math.ceil(g.woundLeft(key) / 3600000)} h : statistiques réduites de 20 %. Un baume de soin le remet sur pied.</p>` : ''}
    <dl class="facts hs-stats">${stat('PV', u.maxHp)}${stat('Attaque', u.atk)}${stat('Magie', u.mag)}${stat('Défense', u.def)}${stat('Vitesse', u.spd)}</dl>
    <h3 class="section-title">Talent</h3><p class="small">${esc(h.passive)}</p>
    <h3 class="section-title">Compétences</h3>
    ${h.skills.map((k) => `<div class="hs-sk"><b>${esc(SKILLS[k].name)}</b><span class="tb-cost">${'◆'.repeat(SKILLS[k].cost)}</span><p class="small muted">${esc(SKILLS[k].desc)}</p></div>`).join('')}
    <p class="lore small">« ${esc(h.lore)} »</p>
  </div>`, { label: h.name });
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
      <h2 class="section-title">Invocations</h2>
      <div class="ic-grid">${INVOCATION_ORDER.map((k) => invocationCardHTML(g, k, { selected: g.s.invocation === k })).join('')}</div>
      <a class="btn block" href="#/descente">${icon('swords')}Aller à la Descente</a>`;
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
