// Bestiaire : encyclopédie des créatures connues et chroniques débloquées
// au fil des découvertes.
import { artUrl } from '../art/assets.js';
import { icon, sigil, EMBLEM, picon } from '../ui/icons.js';
import { esc, bindActions } from '../ui/dom.js';
import { FACTION_ORDER, RARITY } from '../config.js';
import { FAMILIES, HUNT_STAGES, huntStage, familyOf } from '../core/descent.js';
import { loreEntries, markLoreRead, unreadLore } from '../core/lore.js';

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function bestiary(app, root) {
  const g = app.game, cat = app.catalog, lore = cat.lore;
  const st = (app.state.best ||= { tab: 'creatures', faction: 'infernal', q: '' });

  function chronicles() {
    const n = g.uniqueCount();
    const unlocked = (at) => (at === 'all' ? n >= g.total() : n >= at);
    const open = lore.chronicles.filter((c) => unlocked(c.at));
    const sealed = lore.chronicles.filter((c) => !unlocked(c.at));
    const nextAt = sealed.find((c) => c.at !== 'all')?.at;
    const myst = lore.mysteries.filter((m) => g.s.setsDone[m.set]);
    return `
      <h2 class="section-title">Les sept royaumes</h2>
      <div class="realms">${cat.factions.map((f) => `<a class="panel realm" href="#/faction/${f.key}" style="--fc:${f.colors.secondary}"><span class="realm-sig">${sigil(f.key)}</span><div><h3>${esc(f.realm)}</h3><p class="small muted">${esc(f.motto)}</p></div></a>`).join('')}</div>
      <h2 class="section-title">Le Livre interdit</h2>
      <details class="panel dc-fold"><summary>${picon('genesis')} ${esc(lore.genesis.title)}</summary><div>${lore.genesis.text.map((p) => `<p class="lore">${esc(p)}</p>`).join('')}</div></details>
      <details class="panel dc-fold"><summary>${picon('chronicles')} Chroniques du Néant <span class="small muted">${open.length} / ${lore.chronicles.length}</span></summary><div>
        ${open.map((c) => `<h3>${esc(c.title)}</h3><p class="lore">${esc(c.text)}</p>`).join('')}
        ${sealed.length ? `<p class="small muted">${icon('lock')} ${sealed.length} page${sealed.length > 1 ? 's' : ''} encore scellée${sealed.length > 1 ? 's' : ''}.${nextAt ? ` La prochaine s’ouvre à ${nextAt} créatures découvertes (tu en as ${n}).` : ''}</p>` : ''}
      </div></details>
      <details class="panel dc-fold"><summary>${picon('conflicts')} Conflits</summary><div>
        ${lore.conflicts.map((c) => `<h3>${esc(c.title)}</h3><p class="small">${c.sides.map((s) => `<span style="color:${cat.faction[s].colors.secondary}">${esc(cat.faction[s].name)}</span>`).join(' contre ')}</p><p class="lore">${esc(c.text)}</p>`).join('')}
      </div></details>
      <details class="panel dc-fold"><summary>${picon('figures')} Figures du Bestiaire</summary><div>
        ${lore.figures.map((f) => `<h3>${esc(f.name)}</h3><p class="lore">${esc(f.text)}</p>`).join('')}
      </div></details>
      <details class="panel dc-fold"><summary>${picon('mysteries')} Mystères <span class="small muted">${myst.length} / ${lore.mysteries.length}</span></summary><div>
        ${myst.map((m) => `<h3>${esc(m.title)}</h3><p class="lore">${esc(m.text)}</p>`).join('')}
        ${myst.length < lore.mysteries.length ? `<p class="small muted">${icon('lock')} Chaque ensemble de cartes complété révèle un mystère.</p>` : ''}
      </div></details>`;
  }

  function creatures() {
    const q = norm(st.q.trim());
    const list = cat.byFaction[st.faction].filter((c) => !q || (g.nameKnown(c.id) && norm(c.name + ' ' + c.category).includes(q)));
    const fp = g.factionProgress(st.faction);
    const groups = {};
    // les pages encore scellées ne sont pas listées une par une : un simple compteur suffit
    const sealedN = list.filter((c) => !g.owns(c.id) && !g.nameKnown(c.id)).length;
    list.filter((c) => g.owns(c.id) || g.nameKnown(c.id)).forEach((c) => (groups[g.owns(c.id) ? c.category : 'Pages scellées'] ||= []).push(c));
    const keys = Object.keys(groups).sort((a, b) => (a === 'Pages scellées') - (b === 'Pages scellées') || a.localeCompare(b, 'fr'));
    return `
      <div class="chips fac-grid" role="group" aria-label="Faction">${FACTION_ORDER.map((f) => `<button class="chip" data-act="fac" data-v="${f}" style="--chip:${cat.faction[f].colors.secondary}" aria-pressed="${st.faction === f}">${sigil(f)}<span class="fg-n">${esc(cat.faction[f].name)}</span></button>`).join('')}</div>
      <label class="input-wrap"><span class="sr">Rechercher dans le bestiaire</span>${icon('search')}<input class="input" id="best-q" type="search" placeholder="Rechercher une créature connue…" value="${esc(st.q)}"></label>
      <p class="small muted">${fp.owned} entrées sur ${fp.total} dans ${esc(cat.faction[st.faction].realm)}.</p>
      ${keys.map((k) => `<h3 class="section-title">${esc(k)}</h3><div class="codex">${groups[k].map((c) => entry(c)).join('')}</div>`).join('') || '<p class="muted">Aucune créature connue ne correspond.</p>'}
      ${sealedN && !q ? `<p class="small muted center sealed-n">${icon('lock')} ${sealedN} page${sealedN > 1 ? 's' : ''} encore scellée${sealedN > 1 ? 's' : ''} dans ce royaume. Ouvre des boosters pour les révéler.</p>` : ''}`;
  }

  // Bestiaire de chasse : les créatures vaincues dans la Descente
  function hunt() {
    const fp = cat.byFaction[st.faction];
    const seen = fp.filter((c) => g.huntKills(c.id) > 0).length;
    return `
      <p class="small muted">Chaque créature vaincue dans la Descente s’inscrit ici (${g.huntCount()} au total). À ${HUNT_STAGES[2].k} victoires, tu la maîtrises : tes créatures lui font +1 dégât.</p>
      <div class="chips fac-grid" role="group" aria-label="Faction">${FACTION_ORDER.map((f) => `<button class="chip" data-act="fac" data-v="${f}" style="--chip:${cat.faction[f].colors.secondary}" aria-pressed="${st.faction === f}">${sigil(f)}<span class="fg-n">${esc(cat.faction[f].name)}</span></button>`).join('')}</div>
      <p class="small muted">${seen} / ${fp.length} créatures de ${esc(cat.faction[st.faction].realm)} chassées.</p>
      <div class="codex">${fp.filter((c) => g.huntKills(c.id) > 0).map((c) => {
        const k = g.huntKills(c.id), stg = huntStage(k), r = RARITY[c.rarity];
        const fam = FAMILIES[familyOf(c)];
        return `<button class="codex-row hunt-row" data-id="${c.id}"><span class="codex-thumb"><img alt="" loading="lazy" src="${artUrl(c, { lite: true, mystery: !g.owns(c.id) && false })}"></span><span class="codex-text"><b>${esc(c.name)}</b><span class="small"><span class="hunt-stage s${stg}">${esc(HUNT_STAGES[stg].name)}</span> · ${k} victoire${k > 1 ? 's' : ''}</span><span class="small muted">${stg >= 1 ? `${esc(fam.name)} : ${esc(fam.desc)}` : `Encore ${HUNT_STAGES[1].k - k} victoire${HUNT_STAGES[1].k - k > 1 ? 's' : ''} pour l’étudier.`}</span></span></button>`;
      }).join('')}</div>`;
  }

  // Récits : gardiens, formes corrompues, relations et fragments des royaumes
  function recits() {
    const all = loreEntries(g, cat), open = all.filter((e) => e.unlocked);
    const fresh = new Set(all.filter((e) => e.unlocked && !g.s.lore[e.key]).map((e) => e.key));
    const nb = (e) => (fresh.has(e.key) ? '<span class="lr-new">Nouveau</span>' : '');
    const lock = (e) => `<div class="lr-e locked"><b>${icon('lock')} ${e.kind === 'boss' || e.kind === 'form' ? 'Récit scellé' : esc(e.title)}</b><span class="small muted">${esc(e.hint)}</span></div>`;
    const of = (k) => all.filter((e) => e.kind === k);
    const html = `<p class="small muted">${open.length} récit${open.length > 1 ? 's' : ''} sur ${all.length}. Ils s’ouvrent en jouant : gardiens vaincus, formes éveillées, relations rencontrées, royaumes complétés.</p>
      <h2 class="section-title">Les gardiens de l’Abîme</h2>
      <div class="stack">${of('boss').map((e) => (e.unlocked ? `<div class="lr-e boss">${nb(e)}<b>${esc(e.title)}</b><span class="small lr-sub">${esc(e.sub)}</span><p class="lore">${esc(e.text)}</p><p class="small"><b>Sa mécanique.</b> ${esc(e.mechanic)}</p><p class="small"><b>Pour le contrer.</b> ${esc(e.counter)}</p></div>` : lock(e))).join('')}</div>
      <h2 class="section-title">Formes corrompues</h2>
      <div class="stack">${of('form').map((e) => { const c = cat.get(e.id); return e.unlocked ? `<button class="lr-e form" data-act="card" data-id="${e.id}">${nb(e)}<span class="lr-th"><img alt="" src="${artUrl(c, { lite: true })}"></span><span><b>${esc(e.title)}</b><span class="small lr-sub">${esc(c.name)} · ${esc(e.sub)}</span><p class="lore small">${esc(e.text)}</p></span></button>` : lock(e); }).join('')}</div>
      <h2 class="section-title">Relations entre créatures</h2>
      <div class="stack">${of('rel').map((e) => (e.unlocked ? `<div class="lr-e rel t-${e.rel.type}">${nb(e)}<span class="lr-type">${e.rel.type === 'proie' ? 'Prédation' : e.rel.type === 'rival' ? 'Rivalité' : 'Légende'}</span><b>${esc(e.title)}</b><span class="small">${esc(e.text)}</span></div>` : `<div class="lr-e locked"><b>${icon('lock')} ${e.rel.type === 'proie' ? 'Prédation' : e.rel.type === 'rival' ? 'Rivalité' : 'Légende'} inconnue</b><span class="small muted">${esc(e.hint)}</span></div>`)).join('')}</div>
      <h2 class="section-title">Fragments des royaumes</h2>
      ${FACTION_ORDER.map((f) => { const fr = of('frag').filter((e) => e.faction === f), n = fr.filter((e) => e.unlocked).length; return `<details class="panel dc-fold lr-fac" style="--fc:${cat.faction[f].colors.secondary}"><summary>${sigil(f)} ${esc(cat.faction[f].realm)} <span class="small muted">${n} / ${fr.length}</span>${fr.some((e) => fresh.has(e.key)) ? '<span class="lr-new">Nouveau</span>' : ''}</summary><div>${fr.map((e) => (e.unlocked ? `<h3>${esc(e.title)}</h3><p class="lore">${esc(e.text)}</p>` : `<p class="small muted">${icon('lock')} ${esc(e.hint)}</p>`)).join('')}</div></details>`; }).join('')}`;
    // les récits affichés une fois ne sont plus « nouveaux »
    setTimeout(() => markLoreRead(g, [...fresh]), 0);
    return html;
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
      <header class="screen-head ui-hero bn-bestiary"><h1>Bestiaire</h1><p class="muted">Le livre interdit, page après page.</p></header>
      <div class="seg wide" role="tablist">${[['creatures', 'Créatures'], ['recits', 'Récits'], ['chasse', 'Chasse'], ['chroniques', 'Royaumes']].map(([k, l]) => `<button class="seg-b" role="tab" data-act="tab" data-v="${k}" aria-selected="${st.tab === k}" aria-pressed="${st.tab === k}">${l}${k === 'recits' && st.tab !== 'recits' && unreadLore(g, cat).length ? '<i class="lr-dot"></i>' : ''}</button>`).join('')}</div>
      <div class="stack best-body">${st.tab === 'chroniques' ? chronicles() : st.tab === 'chasse' ? hunt() : st.tab === 'recits' ? recits() : creatures()}</div>`;
    const q = root.querySelector('#best-q');
    if (q) q.addEventListener('input', (e) => { st.q = e.target.value; const pos = e.target.selectionStart; render(); const n = root.querySelector('#best-q'); n.focus(); n.setSelectionRange(pos, pos); });
  }
  bindActions(root, {
    tab(el) { st.tab = el.dataset.v; render(); },
    fac(el) { st.faction = el.dataset.v; render(); },
    card() {},
  });
  root.addEventListener('click', (e) => {
    const lf = e.target.closest('.lr-e.form');
    if (lf) return app.openCard(lf.dataset.id);
    const row = e.target.closest('.codex-row');
    if (row) app.openCard(row.dataset.id, { list: [...root.querySelectorAll('.codex-row')].map((r) => r.dataset.id) });
  });
  render();
  app.refreshView = render;
  return () => { app.refreshView = null; };
}
