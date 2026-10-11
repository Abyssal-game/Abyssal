// Interface des pactes : description d'un pacte et choix de la carte liée à un héros.
import { pactOf, PACT_FX, TIER_NAMES, PACT_UNLOCK } from '../core/pacts.js';
import { HEROES } from '../core/heroes.js';
import { RARITY, RARITY_ORDER, FACTION_ORDER } from '../config.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil } from './icons.js';
import { esc, openSheet, toast } from './dom.js';

// Lignes d'effet d'un pacte (niveaux atteints en clair, niveaux suivants grisés)
export function pactLinesHTML(card, { all = false } = {}) {
  const p = pactOf(card);
  if (!p) return '';
  const fx = PACT_FX[p.faction].t;
  return `<ul class="pact-lines">${fx.map((l, i) => (i < p.tier ? `<li>${esc(l)}</li>` : all ? `<li class="off">${esc(l)} <span>(${i === 1 ? 'Rare' : 'Mythique'} ou mieux)</span></li>` : '')).join('')}</ul>`;
}
export const pactTitle = (card) => { const p = pactOf(card); return p ? `${p.name} · ${TIER_NAMES[p.tier]}` : ''; };

// Bloc « Pacte » de la fiche d'un héros
export function pactBlockHTML(g, hero) {
  if (!g.pactsOpen()) return `<p class="small muted pact-lock">${icon('lock')} Atteins l’étage ${PACT_UNLOCK} de la Descente pour sceller des pactes avec tes cartes.</p>`;
  const c = g.pactCard(hero);
  const run = !!g.s.descent.run;
  if (!c) return `<button class="pact-slot empty" data-hs="pact" ${run ? 'disabled' : ''}><span class="pact-thumb">+</span><span><b>Aucun pacte</b><small>Lie une de tes cartes à ce héros pour gagner son effet.</small></span></button>`;
  return `<button class="pact-slot" data-hs="pact" style="--rc:${RARITY[c.rarity].color}" ${run ? 'disabled' : ''}>
    <span class="pact-thumb"><img alt="" src="${artUrl(c, { lite: true })}"></span>
    <span><b>${esc(c.name)}</b><small style="color:${RARITY[c.rarity].color}">${sigil(c.faction)} ${esc(pactTitle(c))}</small>${pactLinesHTML(c)}</span></button>`;
}

// Choix de la carte du pacte
export function openPactPicker(app, hero, done) {
  const g = app.game, cat = app.catalog;
  const st = { f: null };
  const sh = openSheet('', { label: 'Pacte' });
  function draw() {
    const cur = g.s.pacts?.[hero];
    const list = cat.cards.filter((c) => g.owns(c.id) && (!st.f || c.faction === st.f))
      .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || FACTION_ORDER.indexOf(a.faction) - FACTION_ORDER.indexOf(b.faction) || a.number - b.number);
    sh.setContent(`<h2>Pacte · ${esc(HEROES[hero].name.split(' ')[0])}</h2>
      <p class="small muted">La <b>faction</b> de la carte choisit l’effet, sa <b>rareté</b> le renforce : les Rares ajoutent un effet, les Mythiques et Secrètes changent une règle du combat.</p>
      <div class="chips" role="group" aria-label="Faction"><button class="chip" data-f="" aria-pressed="${!st.f}">Toutes</button>${FACTION_ORDER.map((f) => `<button class="chip" data-f="${f}" style="--chip:${cat.faction[f].colors.secondary}" aria-pressed="${st.f === f}">${sigil(f)}${esc(PACT_FX[f].name)}</button>`).join('')}</div>
      ${st.f ? `<div class="panel pact-fx"><b>${esc(PACT_FX[st.f].name)}</b>${pactLinesHTML(cat.cards.find((c) => c.faction === st.f && c.rarity === 'S') || cat.byFaction[st.f][0], { all: true })}</div>` : ''}
      ${cur ? '<button class="btn ghost block small" data-pid="">Retirer le pacte</button>' : ''}
      <div class="pact-list">${list.map((c) => { const h = g.pactHolder(c.id); return `<button class="pact-row ${c.id === cur ? 'on' : ''}" data-pid="${c.id}" style="--rc:${RARITY[c.rarity].color}">
        <span class="pact-thumb"><img alt="" loading="lazy" src="${artUrl(c, { lite: true })}"></span>
        <span class="pact-t"><b>${esc(c.name)}</b><small style="color:${RARITY[c.rarity].color}">${esc(RARITY[c.rarity].name)} · ${esc(pactTitle(c))}</small>${pactLinesHTML(c)}${h && h !== hero ? `<small class="muted">Lié à ${esc(HEROES[h].name.split(' ')[0])} : il lui sera retiré.</small>` : ''}</span>
        ${c.id === cur ? icon('check') : ''}</button>`; }).join('') || '<p class="small muted">Aucune carte de cette faction. Ouvre des boosters !</p>'}</div>`);
  }
  sh.body.addEventListener('click', (e) => {
    const f = e.target.closest('[data-f]');
    if (f) { st.f = f.dataset.f || null; app.sfx.tap(); return draw(); }
    const b = e.target.closest('[data-pid]');
    if (!b) return;
    try { g.setPact(hero, b.dataset.pid || null); app.sfx.discover(); if (b.dataset.pid) toast(`Pacte scellé avec <b>${esc(cat.get(b.dataset.pid).name)}</b>.`, { icon: 'sparkle' }); sh.close(); done && done(); }
    catch (err) { app.sfx.error(); toast(esc(err.message), { kind: 'error' }); }
  });
  draw();
}
