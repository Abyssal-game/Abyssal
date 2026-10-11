// L'Arsenal : coffres et clés, ouverture animée, inventaire, fiche d'objet (équiper, forger, démanteler).
import { BASES, SLOTS, SLOT_ORDER, GEAR_RARITY, GEAR_ORDER, CHESTS, CHEST_ORDER, KEYS, LEG_PITY, canUse, itemScore, forgeCost, salvageValue } from '../core/gear.js';
import { HEROES, HERO_ORDER } from '../core/heroes.js';
import { itemTileHTML, gearIcon, statLine, effectLines, itemName, whoCanUse, chestSVG, keyHTML } from '../ui/gear.js';
import { heroArtUrl } from '../ui/hero.js';
import { icon } from '../ui/icons.js';
import { esc, fmt, toast, openSheet, confirmBox } from '../ui/dom.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ——— Fiche d'un objet ———————————————————————————————————————————————————
export function openGear(app, id, { onChange } = {}) {
  const g = app.game;
  const sheet = openSheet('', { label: 'Objet', onClose: () => { onChange && onChange(); app.refreshView && app.refreshView(); } });
  function draw() {
    const it = g.gearItem(id);
    if (!it) { sheet.close(); return; }
    const b = BASES[it.b], R = GEAR_RARITY[it.r], who = g.wearer(id);
    const cost = forgeCost(it), maxF = it.f >= R.forge;
    const users = HERO_ORDER.filter((h) => g.s.heroes[h] && canUse(it.b, h));
    const run = !!g.s.descent.run;
    sheet.setContent(`<div class="gs" style="--gc:${R.color}">
      <div class="gs-top"><span class="gi-ic big">${gearIcon(b.type)}</span>
        <div><h2>${esc(itemName(it))}</h2><p class="gs-r">${esc(R.name)} · ${esc(SLOTS[b.slot].name)}</p><p class="small muted">${esc(whoCanUse(it))}</p></div></div>
      ${statLine(it) ? `<p class="gs-stats">${statLine(it)}</p>` : ''}
      ${effectLines(it).map((l) => `<p class="small gs-fx">${l}</p>`).join('')}
      <p class="small muted">Forge : rang ${it.f} / ${R.forge}${who ? ` · porté par <b style="color:${HEROES[who].color}">${esc(HEROES[who].name)}</b>` : ''}</p>
      ${run ? `<p class="small dc-bad">${icon('info')} Une expédition est en cours : l’équipement se change à la surface.</p>` : ''}
      <h3 class="section-title">Équiper</h3>
      <div class="gs-heroes">${users.map((h) => `<button class="gs-h ${who === h ? 'on' : ''}" data-g="equip" data-h="${h}" style="--hc:${HEROES[h].color}" ${run ? 'disabled' : ''}><img alt="" src="${heroArtUrl(h)}"><span>${esc(HEROES[h].name.split(' ')[0])}</span>${who === h ? `<i>${icon('check')}</i>` : ''}</button>`).join('')}</div>
      ${who ? `<button class="btn small ghost" data-g="unequip" ${run ? 'disabled' : ''}>Retirer</button>` : ''}
      <div class="gs-acts">
        <button class="btn ${maxF ? '' : 'gold'}" data-g="forge" ${maxF || (who && run) ? 'disabled' : ''}>${icon('flame')}${maxF ? 'Forge au maximum' : `Forger +${it.f + 1}`}${maxF ? '' : `<span class="small">${cost.fer} fer · ${cost.shards} éclats</span>`}</button>
        <button class="btn ghost" data-g="salvage" ${who ? 'disabled' : ''}>${icon('trash')}Démanteler<span class="small">+${salvageValue(it)} fer</span></button>
      </div>
      <p class="small muted">Fer runique : <b>${fmt(g.arsenal().fer || 0)}</b>. Chaque rang de forge ajoute 8 % aux statistiques (4 % à la puissance d’un sort).${who ? ' Un objet porté ne peut pas être démantelé.' : ''}</p>
    </div>`);
  }
  sheet.body.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-g]');
    if (!b || b.disabled) return;
    const a = b.dataset.g;
    try {
      if (a === 'equip') { g.equip(id, b.dataset.h); app.sfx.tap(); toast(`${esc(itemName(g.gearItem(id)))} équipé sur ${esc(HEROES[b.dataset.h].name.split(' ')[0])}.`, { icon: 'check' }); }
      if (a === 'unequip') { const h = g.wearer(id); g.unequip(h, BASES[g.gearItem(id).b].slot); app.sfx.tap(); }
      if (a === 'forge') { const f = g.forge(id); app.sfx.coin(); toast(`Forge réussie : rang <b>+${f}</b>.`, { kind: 'success', icon: 'flame' }); }
      if (a === 'salvage') {
        if (!(await confirmBox(`Démanteler <b>${esc(itemName(g.gearItem(id)))}</b> ? Il sera fondu en fer runique.`, { ok: 'Démanteler', danger: true }))) return;
        const r = g.salvage(id); app.sfx.coin(); toast(`+${r.fer} fer runique.`, { icon: 'flame' }); sheet.close(); return;
      }
    } catch (err) { app.sfx.error(); toast(esc(err.message), { kind: 'error' }); }
    draw();
  });
  const it = g.gearItem(id);
  if (it?.isNew) { it.isNew = false; g.persist(); }
  draw();
  return sheet;
}

// ——— Ouverture d'un coffre ——————————————————————————————————————————————
export async function openChestFlow(app, type, { after } = {}) {
  const g = app.game, c = CHESTS[type];
  let res;
  try { app.pendingProgress = []; res = g.openChest(type); }
  catch (err) { app.pendingProgress = null; app.sfx.error(); toast(esc(err.message), { kind: 'error' }); return; }
  const best = res.items.reduce((a, it) => Math.max(a, GEAR_ORDER.indexOf(it.r)), 0);
  const bestColor = GEAR_RARITY[GEAR_ORDER[best]].color;
  const reduced = app.reduced();
  const sheet = openSheet(`<div class="cho" style="--cc:${c.color};--bc:${bestColor}">
      <p class="cho-t">${esc(c.name)}</p>
      <button class="cho-chest" aria-label="Ouvrir le coffre">${chestSVG(type)}<span class="cho-glow"></span></button>
      <p class="cho-msg small muted">Touche le coffre pour l’ouvrir.</p>
      <div class="cho-items"></div>
      <div class="cho-end row gap" hidden></div>
    </div>`, { cls: 'chest-sheet', label: c.name, onClose: () => { if (g.arsenal().pending) { /* le choix reste en attente : il sera proposé à nouveau */ } after && after(); app.flushProgress(); } });
  const box = sheet.body.querySelector('.cho');
  const chest = box.querySelector('.cho-chest');
  if (chest.querySelector('.ch-img')) new Image().src = `assets/chests/${type}-open.webp`; // préchargement
  let opened = false;
  const open = async () => {
    if (opened) return; opened = true;
    box.querySelector('.cho-msg').textContent = '';
    chest.classList.add('shake');
    app.sfx.rumble(best >= 2 ? 1.4 : 0.8);
    await wait(reduced ? 50 : 900);
    chest.classList.remove('shake');
    chest.classList.add('open', `r-${GEAR_ORDER[best]}`);
    const img = chest.querySelector('.ch-img');
    if (img) img.src = `assets/chests/${type}-open.webp`;
    try { navigator.vibrate?.(best >= 2 ? [30, 50, 80] : 30); } catch (e) { /* rien */ }
    app.sfx.reveal(best === 3 ? 'M' : best === 2 ? 'HR' : 'R');
    await wait(reduced ? 50 : 450);
    showItems();
  };
  chest.addEventListener('click', open);
  function showItems() {
    const list = box.querySelector('.cho-items');
    const p = g.arsenal().pending;
    if (res.choice) {
      box.querySelector('.cho-msg').innerHTML = 'Choisis <b>un</b> objet à garder. Les autres seront fondus en fer runique.';
      list.innerHTML = p.items.map((it, i) => `<div class="cho-it" style="--i:${i}">${itemTileHTML(it, { attrs: `data-pick="${i}"`, big: true })}<p class="small">${statLine(it) || '&nbsp;'}</p>${effectLines(it).map((l) => `<p class="small gs-fx">${l}</p>`).join('')}<p class="small muted">${esc(whoCanUse(it))}</p></div>`).join('');
    } else {
      list.innerHTML = res.ids.map((id, i) => `<div class="cho-it" style="--i:${i}">${itemTileHTML(g.gearItem(id), { id, big: true })}<p class="small">${statLine(g.gearItem(id)) || '&nbsp;'}</p>${effectLines(g.gearItem(id)).map((l) => `<p class="small gs-fx">${l}</p>`).join('')}<p class="small muted">${esc(whoCanUse(g.gearItem(id)))}</p></div>`).join('');
      endButtons();
    }
  }
  function endButtons() {
    const end = box.querySelector('.cho-end');
    const more = g.chestCount(type) && (!c.key || g.keyCount(c.key));
    end.innerHTML = `<button class="btn" data-c="close">Fermer</button>${more ? `<button class="btn primary" data-c="again">${icon('lock')}Encore un (${g.chestCount(type)})</button>` : ''}`;
    end.hidden = false;
  }
  sheet.body.addEventListener('click', async (e) => {
    const pk = e.target.closest('[data-pick]');
    if (pk && g.arsenal().pending) {
      const i = +pk.dataset.pick;
      const r = g.chooseChestItem(i);
      app.sfx.discover();
      box.querySelectorAll('.cho-it').forEach((x, j) => x.classList.toggle(j === i ? 'kept' : 'melted', true));
      box.querySelector('.cho-msg').innerHTML = `Objet gardé${r.fer ? ` · les autres donnent <b>+${r.fer} fer runique</b>` : ''}.`;
      pk.dataset.gear = r.id; pk.removeAttribute('data-pick');
      endButtons();
      return;
    }
    const gi = e.target.closest('[data-gear]');
    if (gi && !g.arsenal().pending) return openGear(app, gi.dataset.gear);
    const b = e.target.closest('[data-c]');
    if (!b) return;
    if (b.dataset.c === 'close') sheet.close();
    if (b.dataset.c === 'again') { sheet.close(); openChestFlow(app, type, { after }); }
  });
  if (reduced) open();
}

// ——— Écran ————————————————————————————————————————————————————————————
export default function arsenal(app, root) {
  const g = app.game;
  const ui = (app.state.arsenal ||= { slot: 'arme', hero: 'all' });
  function render() {
    const a = g.arsenal();
    if (a.pending) return resumePending();
    const items = Object.entries(a.items)
      .filter(([, it]) => BASES[it.b] && BASES[it.b].slot === ui.slot && (ui.hero === 'all' || canUse(it.b, ui.hero)))
      .sort((x, y) => GEAR_ORDER.indexOf(y[1].r) - GEAR_ORDER.indexOf(x[1].r) || itemScore(y[1]) - itemScore(x[1]));
    const count = Object.keys(a.items).length;
    const junk = Object.entries(a.items).filter(([id, it]) => it.r === 'C' && !g.wearer(id)).length;
    root.innerHTML = `
      <header class="screen-head"><h1>Arsenal</h1><p class="muted">Armes, armures, reliques et sorts de tes héros. Les coffres se gagnent dans la Descente.</p></header>
      <section class="panel ars-res"><span>${keyHTML('or', g.keyCount('or'))}<small>Clés d’or</small></span><span>${keyHTML('abyssal', g.keyCount('abyssal'))}<small>Clés abyssales</small></span><span class="ars-fer">${icon('flame')}<b>${fmt(a.fer || 0)}</b><small>Fer runique</small></span></section>
      <h2 class="section-title">Coffres</h2>
      <div class="ch-grid">${CHEST_ORDER.map((t) => {
        const c = CHESTS[t], n = g.chestCount(t), locked = c.key && !g.keyCount(c.key);
        return `<button class="ch-c ${n ? '' : 'none'}" data-chest="${t}" style="--cc:${c.color}" ${n ? '' : 'disabled'}>
          <span class="ch-art">${chestSVG(t)}</span>${n ? `<span class="ch-n">${n}</span>` : ''}
          <b>${esc(c.name)}</b><span class="small">${n ? (locked ? `${icon('lock')} ${esc(KEYS[c.key].name)} requise` : 'Toucher pour ouvrir') : esc(c.desc)}</span></button>`;
      }).join('')}</div>
      <p class="small muted">Garantie : un objet <b style="color:${GEAR_RARITY.L.color}">légendaire</b> au plus tard tous les ${LEG_PITY} coffres de fer, d’or ou abyssaux (encore ${Math.max(1, LEG_PITY - (a.pity || 0))}). <button class="linkish" data-a="odds">Probabilités</button></p>
      <h2 class="section-title">Équipement <span class="small muted">${count} objet${count > 1 ? 's' : ''}</span></h2>
      <div class="seg wide ars-slots" role="tablist">${SLOT_ORDER.map((s) => `<button role="tab" class="seg-b" aria-selected="${ui.slot === s}" aria-pressed="${ui.slot === s}" data-slot="${s}">${SLOTS[s].plural}</button>`).join('')}</div>
      <div class="chips ars-heroes"><button class="chip" aria-pressed="${ui.hero === 'all'}" data-hf="all">Tous</button>${HERO_ORDER.filter((h) => g.s.heroes[h]).map((h) => `<button class="chip" aria-pressed="${ui.hero === h}" data-hf="${h}" style="--chip:${HEROES[h].color}">${esc(HEROES[h].name.split(' ')[0])}</button>`).join('')}</div>
      ${items.length ? `<div class="gi-grid">${items.map(([id, it]) => itemTileHTML(it, { id, wearer: g.wearer(id) })).join('')}</div>`
        : `<p class="small muted center">Aucun objet ici pour l’instant. Ouvre des coffres !</p>`}
      ${junk ? `<button class="btn small ghost block" data-a="junk">${icon('trash')}Démanteler les ${junk} objets communs non portés</button>` : ''}`;
  }
  function resumePending() {
    const p = g.arsenal().pending;
    root.innerHTML = `<header class="screen-head"><h1>Arsenal</h1></header>
      <section class="panel center"><p>Un ${esc(CHESTS[p.type].name.toLowerCase())} est ouvert : choisis l’objet que tu gardes.</p>
      <div class="cho-items">${p.items.map((it, i) => `<div class="cho-it">${itemTileHTML(it, { attrs: `data-pick="${i}"`, big: true })}<p class="small">${statLine(it) || '&nbsp;'}</p>${effectLines(it).map((l) => `<p class="small gs-fx">${l}</p>`).join('')}<p class="small muted">${esc(whoCanUse(it))}</p></div>`).join('')}</div></section>`;
  }
  function showOdds() {
    const rows = CHEST_ORDER.map((t) => `<tr><th scope="row">${esc(CHESTS[t].name)}</th>${GEAR_ORDER.map((r) => `<td>${CHESTS[t].odds[r] ? String(CHESTS[t].odds[r]).replace('.', ',') + ' %' : '—'}</td>`).join('')}<td>${CHESTS[t].items}${CHESTS[t].choice ? ' (1 gardé)' : ''}</td></tr>`).join('');
    openSheet(`<h2>Probabilités des coffres</h2>
      <p class="small muted">Chances par objet. Les objets proposés sont choisis pour tes héros : plus souvent pour ceux de ton équipe et pour les emplacements vides.</p>
      <div class="table-wrap"><table class="odds"><thead><tr><th></th>${GEAR_ORDER.map((r) => `<th scope="col" style="color:${GEAR_RARITY[r].color}">${GEAR_RARITY[r].name}</th>`).join('')}<th>Objets</th></tr></thead><tbody>${rows}</tbody></table></div>
      <ul class="small"><li>Coffre de fer : au moins un objet rare ou mieux.</li><li>Après ${LEG_PITY - 1} coffres (fer, or, abyssal) sans légendaire, le suivant en contient un.</li><li>Les épiques ont une propriété bonus ; les légendaires sont uniques, avec un effet propre en plus.</li></ul>
      <h3>Où trouver les coffres</h3>
      <ul class="small"><li>Salles au trésor et élites de la Descente : bois, puis fer dès l’étage 6.</li><li>Gardiens : coffre d’or, puis abyssal dès l’étage 15. Clé d’or dès l’étage 10, clé abyssale dès l’étage 20.</li><li>Bonus des missions du jour : une clé d’or. Boutique : coffre de fer et clés.</li><li>Attention : les coffres trouvés pendant une expédition sont perdus si toute l’équipe tombe.</li></ul>`, { label: 'Probabilités des coffres' });
  }
  root.addEventListener('click', async (e) => {
    const pk = e.target.closest('[data-pick]');
    if (pk && g.arsenal().pending) { const r = g.chooseChestItem(+pk.dataset.pick); app.sfx.discover(); toast(`Objet gardé${r.fer ? ` · +${r.fer} fer runique` : ''}.`, { icon: 'check' }); render(); return; }
    const ch = e.target.closest('[data-chest]');
    if (ch && !ch.disabled) return openChestFlow(app, ch.dataset.chest, { after: render });
    const gi = e.target.closest('[data-gear]');
    if (gi) return openGear(app, gi.dataset.gear, { onChange: render });
    const s = e.target.closest('[data-slot]');
    if (s) { ui.slot = s.dataset.slot; app.sfx.tap(); return render(); }
    const h = e.target.closest('[data-hf]');
    if (h) { ui.hero = h.dataset.hf; app.sfx.tap(); return render(); }
    const b = e.target.closest('[data-a]');
    if (b?.dataset.a === 'odds') return showOdds();
    if (b?.dataset.a === 'junk') {
      const ids = Object.entries(g.arsenal().items).filter(([id, it]) => it.r === 'C' && !g.wearer(id)).map(([id]) => id);
      if (!(await confirmBox(`Démanteler ${ids.length} objets communs non portés ?`, { ok: 'Démanteler', danger: true }))) return;
      const r = g.salvage(ids); app.sfx.coin(); toast(`+${r.fer} fer runique.`, { icon: 'flame' }); render();
    }
  });
  render();
  app.refreshView = render;
  return () => { app.refreshView = null; };
}
