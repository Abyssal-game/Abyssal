// Pages « Renforcer » et « Fournaise » (sous-onglets de la Collection)
import { tuto } from '../ui/tutos.js';
import { RARITY, RARITY_ORDER } from '../config.js';
import { artUrl } from '../art/assets.js';
import { icon } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, bindActions } from '../ui/dom.js';
import { MAX_LEVEL } from '../core/army.js';
import { upgradeCard, nextLevelGain, openBurn } from './furnace.js';
import { nextUnlock } from '../core/kits.js';

const RI = (r) => RARITY_ORDER.indexOf(r);
const ashLine = (g) => `<span class="fg-ash">${icon('ash')}<b>${fmt(g.s.ash)}</b> cendres</span>`;
const mini = (c) => `<span class="fg-art" style="--rc:${RARITY[c.rarity].color}"><img alt="" loading="lazy" src="${artUrl(c, { lite: true })}"></span>`;

// ——— Renforcer : monter le niveau des créatures avec des cendres ———
export function forgeScreen(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.forge ||= { all: false });
  function draw() {
    const team = g.team();
    const ids = ui.all ? Object.keys(g.s.collection) : team;
    const list = ids.map((id) => cat.get(id)).filter(Boolean)
      .sort((a, b) => (team.indexOf(b.id) >= 0) - (team.indexOf(a.id) >= 0) || RI(b.rarity) - RI(a.rarity) || g.cardLevel(b.id) - g.cardLevel(a.id) || a.name.localeCompare(b.name, 'fr'));
    root.innerHTML = `<header class="screen-head ui-hero bn-renfort"><h1>Renforcer</h1><p class="muted">Chaque niveau rend une créature plus forte (attaque et PV), jusqu’au niveau ${MAX_LEVEL}. Ça se paie en cendres.</p>${ashLine(g)}</header>
      <div class="seg fg-seg" role="group" aria-label="Créatures affichées"><button class="seg-b" data-act="show" data-v="team" aria-pressed="${!ui.all}">Mon équipe</button><button class="seg-b" data-act="show" data-v="all" aria-pressed="${ui.all}">Toutes mes créatures</button></div>
      ${list.length ? `<div class="fg-list">${list.map((c) => {
        const li = g.cardLevelInfo(c.id), gain = nextLevelGain(g, c), ok = li.cost && li.cost <= g.s.ash;
        return `<div class="panel fg-row ${team.includes(c.id) ? 'in-team' : ''}">
          <button class="fg-open" data-act="open" data-id="${c.id}" aria-label="Voir ${esc(c.name)}">${mini(c)}</button>
          <span class="fg-mid"><b>${esc(c.name)}</b><span class="small" style="color:${RARITY[c.rarity].color}">${RARITY[c.rarity].name}${ui.all && team.includes(c.id) ? ' · <span class="muted">équipe</span>' : ''}</span>
            <span class="fg-lv"><span class="xpbar"><i style="width:${(li.level / MAX_LEVEL) * 100}%"></i></span><span class="small">Niv. ${li.level}/${MAX_LEVEL}</span></span>${(() => { const nu = nextUnlock(c.id, li.level); return nu ? `<span class="small ck-fg">${icon('sparkle')} Niv. ${nu.lv} : ${esc(nu.kind === 'Éveil' ? 'Éveil' : nu.name)}</span>` : ''; })()}</span>
          ${li.cost ? `<button class="btn small ${ok ? 'gold' : 'ghost'} fg-up" data-act="up" data-id="${c.id}">${icon('p:level-up')}<span><b>Niv. ${li.level + 1}</b><small>${icon('ash')}${fmt(li.cost)}${gain ? ` · ${gain}` : ''}</small></span></button>` : '<span class="fg-max">Max</span>'}
        </div>`;
      }).join('')}</div>` : '<p class="panel small muted center">Ton équipe est vide : compose-la dans l’onglet Équipe.</p>'}
      <a class="panel fg-link" href="#/fournaise">${icon('p:furnace')}<span><b>Pas assez de cendres ?</b><span class="small muted">Brûle tes doublons dans la Fournaise.</span></span>${icon('next')}</a>`;
  }
  bindActions(root, {
    show(el) { ui.all = el.dataset.v === 'all'; app.sfx.tap(); draw(); },
    up(el) { const y = window.scrollY; if (upgradeCard(app, el.dataset.id)) { draw(); window.scrollTo(0, y); } },
    open(el) { app.openCard(el.dataset.id); },
  });
  app.refreshView = draw;
  draw();
  tuto(app, 'renfort');
  return () => { app.refreshView = null; };
}

// ——— Fournaise : brûler des doublons, ou n'importe quelle carte ———
export function furnaceScreen(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.furnace ||= { q: '' });
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function grid(cards, foot) {
    return `<div class="fg-grid">${cards.map((c) => `<button class="fg-cell" data-act="burn" data-id="${c.id}">${mini(c)}<b>${esc(c.name)}</b>${foot(c)}</button>`).join('')}</div>`;
  }
  function draw() {
    const sp = g.spareAsh();
    const spares = cat.cards.filter((c) => g.spare(c.id) > 0);
    const q = norm(ui.q || '');
    const owned = Object.keys(g.s.collection).map((id) => cat.get(id)).filter((c) => c && (!q || norm(c.name).includes(q)))
      .sort((a, b) => RI(a.rarity) - RI(b.rarity) || a.name.localeCompare(b.name, 'fr'));
    root.innerHTML = `<header class="screen-head ui-hero bn-furnace"><h1>La Fournaise</h1><p class="muted">Brûle des cartes pour des cendres. Les cendres font monter tes créatures de niveau (onglet Renforcer).</p>${ashLine(g)}</header>
      <section class="panel"><h2 class="section-title">Tes doublons</h2>
        ${sp.n ? `<button class="btn primary block" data-act="all">${icon('p:furnace')}Tout brûler (${sp.n}) · +${fmt(sp.ash)} ${icon('ash')}</button>
          <p class="small muted">Un exemplaire de chaque finition est toujours gardé.</p>
          ${grid(spares, (c) => `<small>×${g.spare(c.id)} · ${icon('ash')}${fmt(g.spareAsh([c.id]).ash)}</small>`)}`
          : '<p class="small muted">Aucun doublon pour l’instant. Ceux que tu tires dans les boosters arrivent ici.</p>'}
      </section>
      <section class="panel"><h2 class="section-title">Brûler une autre carte</h2>
        <p class="small muted">Même ta dernière copie : la créature quitte alors ta collection (on te demande toujours de confirmer).</p>
        <label class="search fg-search">${icon('search')}<input class="input plain" type="search" placeholder="Rechercher une créature…" value="${esc(ui.q || '')}" data-q></label>
        ${owned.length ? grid(owned, (c) => `<small>${icon('ash')}${fmt(g.burnValue(c.id, 'normal'))}</small>`) : '<p class="small muted">Aucune créature trouvée.</p>'}
      </section>`;
    const inp = root.querySelector('[data-q]');
    inp?.addEventListener('input', () => { ui.q = inp.value; clearTimeout(draw.t); draw.t = setTimeout(() => { const pos = inp.selectionStart; draw(); const n = root.querySelector('[data-q]'); n.focus(); n.setSelectionRange(pos, pos); }, 250); });
  }
  bindActions(root, {
    async all() {
      const sp = g.spareAsh();
      if (!(await confirmBox(`Brûler <b>${sp.n} doublon${sp.n > 1 ? 's' : ''}</b> pour <b>${fmt(sp.ash)} cendres</b> ?<br><span class="small">Tu gardes un exemplaire de chaque finition.</span>`, { ok: 'Tout brûler' }))) return;
      app.pendingProgress = [];
      const r = g.burnSpares();
      app.sfx.rumble?.(1.2);
      toast(`La Fournaise rugit : <b>+${fmt(r.ash)} cendres</b>`, { kind: 'epic', icon: 'ash' });
      app.flushProgress(); app.chrome?.();
      draw();
    },
    burn(el) { openBurn(app, el.dataset.id, { onClose: draw }); },
  });
  app.refreshView = draw;
  draw();
  tuto(app, 'fournaise');
  return () => { app.refreshView = null; clearTimeout(draw.t); };
}
