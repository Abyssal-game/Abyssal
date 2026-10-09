// Bestiaire : encyclopédie des créatures connues et chroniques débloquées
// au fil des découvertes.
import { artUrl } from '../art/assets.js';
import { icon, sigil, EMBLEM } from '../ui/icons.js';
import { esc, bindActions } from '../ui/dom.js';
import { FACTION_ORDER, RARITY } from '../config.js';

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function bestiary(app, root) {
  const g = app.game, cat = app.catalog, lore = cat.lore;
  const st = (app.state.best ||= { tab: 'chroniques', faction: 'infernal', q: '' });

  function chronicles() {
    const n = g.uniqueCount();
    const unlocked = (at) => (at === 'all' ? n >= g.total() : n >= at);
    return `
      <article class="panel ornate genesis"><span class="gen-emblem">${EMBLEM}</span><h2>${esc(lore.genesis.title)}</h2>${lore.genesis.text.map((p) => `<p class="lore">${esc(p)}</p>`).join('')}</article>
      <h2 class="section-title">Chroniques du Néant</h2>
      <div class="chron">${lore.chronicles.map((c) => unlocked(c.at)
        ? `<article class="panel chron-item"><h3>${esc(c.title)}</h3><p class="lore">${esc(c.text)}</p></article>`
        : `<article class="panel chron-item locked">${icon('lock')}<div><h3>${esc(c.title.split('.')[0])}. Page scellée</h3><p class="small muted">Se révèle à ${c.at === 'all' ? 'la complétion du bestiaire' : `${c.at} créatures découvertes`} (tu en as ${n}).</p></div></article>`).join('')}</div>
      <h2 class="section-title">Les sept royaumes</h2>
      <div class="realms">${cat.factions.map((f) => `<a class="panel realm" href="#/faction/${f.key}" style="--fc:${f.colors.secondary}"><span class="realm-sig">${sigil(f.key)}</span><div><h3>${esc(f.realm)}</h3><p class="small muted">${esc(f.motto)}</p></div></a>`).join('')}</div>
      <h2 class="section-title">Conflits</h2>
      ${lore.conflicts.map((c) => `<article class="panel conflict"><h3>${esc(c.title)}</h3><p class="small">${c.sides.map((s) => `<span style="color:${cat.faction[s].colors.secondary}">${sigil(s)} ${esc(cat.faction[s].name)}</span>`).join(' contre ')}</p><p class="lore">${esc(c.text)}</p></article>`).join('')}
      <h2 class="section-title">Figures du Bestiaire</h2>
      ${lore.figures.map((f) => `<article class="panel figure"><h3>${esc(f.name)}</h3><p class="lore">${esc(f.text)}</p></article>`).join('')}
      <h2 class="section-title">Mystères</h2>
      ${lore.mysteries.map((m) => g.s.setsDone[m.set]
        ? `<article class="panel mystery"><h3>${esc(m.title)}</h3><p class="lore">${esc(m.text)}</p></article>`
        : `<article class="panel mystery locked">${icon('lock')}<div><h3>Mystère scellé</h3><p class="small muted">Complète l’ensemble « ${esc(cat.set[m.set].name)} » pour le lire.</p></div></article>`).join('')}`;
  }

  function creatures() {
    const q = norm(st.q.trim());
    const list = cat.byFaction[st.faction].filter((c) => !q || (g.nameKnown(c.id) && norm(c.name + ' ' + c.category).includes(q)));
    const fp = g.factionProgress(st.faction);
    const groups = {};
    list.forEach((c) => (groups[g.owns(c.id) ? c.category : 'Pages scellées'] ||= []).push(c));
    const keys = Object.keys(groups).sort((a, b) => (a === 'Pages scellées') - (b === 'Pages scellées') || a.localeCompare(b, 'fr'));
    return `
      <div class="chips" role="group" aria-label="Faction">${FACTION_ORDER.map((f) => `<button class="chip" data-act="fac" data-v="${f}" style="--chip:${cat.faction[f].colors.secondary}" aria-pressed="${st.faction === f}">${sigil(f)}${esc(cat.faction[f].name)}</button>`).join('')}</div>
      <label class="input-wrap"><span class="sr">Rechercher dans le bestiaire</span>${icon('search')}<input class="input" id="best-q" type="search" placeholder="Rechercher une créature connue…" value="${esc(st.q)}"></label>
      <p class="small muted">${fp.owned} entrées sur ${fp.total} dans ${esc(cat.faction[st.faction].realm)}.</p>
      ${keys.map((k) => `<h3 class="section-title">${esc(k)}</h3><div class="codex">${groups[k].map((c) => entry(c)).join('')}</div>`).join('') || '<p class="muted">Aucune créature connue ne correspond.</p>'}`;
  }

  function entry(c) {
    const owned = g.owns(c.id);
    const r = RARITY[c.rarity];
    if (!owned) {
      return `<button class="codex-row sealed" data-id="${c.id}"><span class="codex-thumb"><img alt="" loading="lazy" src="${artUrl(c, { mystery: true })}"></span><span class="codex-text"><b>${g.nameKnown(c.id) ? esc(c.name) : 'Page scellée'}</b><span class="small muted">${c.id} · <span style="color:${r.color}">${r.name}</span></span></span>${icon('lock')}</button>`;
    }
    return `<button class="codex-row" data-id="${c.id}"><span class="codex-thumb"><img alt="" loading="lazy" src="${artUrl(c, { lite: true })}"></span><span class="codex-text"><b>${esc(c.name)}</b><span class="small" style="color:${r.color}">${esc(c.title)} · ${r.name}</span><span class="lore small">${esc(c.lore)}</span></span></button>`;
  }

  function render() {
    root.innerHTML = `
      <header class="screen-head"><h1>Bestiaire</h1><p class="muted">Le livre interdit, page après page.</p></header>
      <div class="seg wide" role="tablist">${[['chroniques', 'Chroniques'], ['creatures', 'Créatures']].map(([k, l]) => `<button class="seg-b" role="tab" data-act="tab" data-v="${k}" aria-selected="${st.tab === k}" aria-pressed="${st.tab === k}">${l}</button>`).join('')}</div>
      <div class="stack best-body">${st.tab === 'chroniques' ? chronicles() : creatures()}</div>`;
    const q = root.querySelector('#best-q');
    if (q) q.addEventListener('input', (e) => { st.q = e.target.value; const pos = e.target.selectionStart; render(); const n = root.querySelector('#best-q'); n.focus(); n.setSelectionRange(pos, pos); });
  }
  bindActions(root, {
    tab(el) { st.tab = el.dataset.v; render(); },
    fac(el) { st.faction = el.dataset.v; render(); },
  });
  root.addEventListener('click', (e) => {
    const row = e.target.closest('.codex-row');
    if (row) app.openCard(row.dataset.id, { list: [...root.querySelectorAll('.codex-row')].map((r) => r.dataset.id) });
  });
  render();
  app.refreshView = render;
  return () => { app.refreshView = null; };
}
