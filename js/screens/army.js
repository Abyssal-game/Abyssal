// L'équipe de cartes : fiche de combat d'une créature, écran Équipe et écran Coffres.
import { RARITY } from '../config.js';
import { cardHTML, lazyArt } from '../ui/card.js';
import { icon, roleIcon, actIcon } from '../ui/icons.js';
import { esc, toast, openSheet, bindActions } from '../ui/dom.js';
import { coach } from '../ui/coach.js';
import { tuto } from '../ui/tutos.js';
import { chestSVG } from '../ui/chest.js';
import { CHESTS, CHEST_ORDER } from '../core/descent.js';
import { ROLES, COST, BUDGET, TEAM, MAX_LEVEL, ULTS, roleOf, canUlt, ultOf } from '../core/army.js';
import { duelUnit } from '../core/duel.js';
import { kitOf, synergiesFor, KEYWORDS, keywordOf } from '../core/skills.js';
import { openPack } from './opening.js';
import { openChestScene } from './chest-open.js';

// Étiquettes posées sur une carte : capacité, niveau, coût, attaque et PV
export const armyBadges = (g, c) => {
  const u = duelUnit(c, { level: g.owns(c.id) ? g.cardLevel(c.id) : 1 }), kw = KEYWORDS[keywordOf(c)];
  return `<span class="v2-badges"><span class="v2-role" style="--ro:${ROLES[roleOf(c)].color}" title="${esc(kw.name)}">${roleIcon(keywordOf(c))}</span>${g.owns(c.id) ? `<span class="v2-lv">Niv. ${g.cardLevel(c.id)}</span>` : ''}<span class="v2-cost">${COST[c.rarity]}</span><span class="v2-ah"><i>${icon('swords')}${u.atk}</i><i>${icon('heart')}${u.maxHp}</i></span></span>`;
};
export const armyCard = (g, c, opts = {}) => cardHTML(c, { ...opts, tag: armyBadges(g, c) });

// Bloc « Au combat » d'une carte : attaque, PV, capacité, pouvoir, niveau
export function combatHTML(g, c) {
  const owned = g.owns(c.id), kit = kitOf(c), role = ROLES[roleOf(c)], syn = synergiesFor(roleOf(c));
  const li = g.cardLevelInfo(c.id), u = duelUnit(c, { level: li.level }), nx = li.level < MAX_LEVEL ? duelUnit(c, { level: li.level + 1 }) : null;
  const ult = canUlt(c) ? ULTS[ultOf(c)] : null;
  return `<div class="army-combat">
    <p class="small muted">${esc(role.name)} · coût d’équipe ${COST[c.rarity]}</p>
    <div class="v2-big-stats"><span class="dv-atk">${icon('swords')}<b>${u.atk}</b><small>Attaque</small></span><span class="dv-hp">${icon('heart')}<b>${u.maxHp}</b><small>PV</small></span></div>
    <div class="panel v2-skill cb-kit">
      <p class="small"><b>${icon('swords')} ${esc(kit.basic.name)}</b> <span class="cb-k">1 action</span><br>${esc(kit.basic.desc)} +1 Ferveur.</p>
      <p class="small"><b class="gold">${actIcon(kit.skill.key, kit.skill.icon)} ${esc(kit.skill.name)}</b> <span class="cb-k">${kit.skill.ap} action${kit.skill.ap > 1 ? 's' : ''} · ${kit.skill.fervor} Ferveur${kit.skill.dice ? ' · D20' : ''}</span><br>${esc(kit.skill.desc)}</p>
      <p class="small"><b>${roleIcon(kit.kw)} ${esc(kit.passive.name)}</b> <span class="cb-k">passif</span><br>${esc(kit.passive.desc)}</p>
      ${c.rarity === 'C' ? `<p class="small dc-good">${icon('star')} Instinct de meute : +1 dégât aux élites et aux gardiens.</p>` : ''}
    </div>
    ${syn.length ? `<div class="panel v2-skill"><b>${icon('p:combo')} Combinaisons</b>${syn.map((x) => `<p class="small"><b>${esc(x.name)}</b> : ${esc(x.desc)}</p>`).join('')}</div>` : ''}
    ${ult ? `<div class="panel v2-skill ult" style="--uc:${ult.color}"><b>${icon('p:power')} Pouvoir : ${esc(ult.name)}</b><p class="small">${esc(ult.desc)}</p><p class="small muted">Dans l’équipe, la Mythique ou Secrète la plus rare remplace le Sceau du Gardien par son pouvoir.</p></div>` : ''}
    ${owned ? `<div class="v2-lvl"><b>Niveau ${li.level}</b><span class="xpbar"><i style="width:${li.need ? (li.into / li.need) * 100 : 100}%"></i></span><span class="small muted">${li.need ? `${li.into} / ${li.need} doublon${li.need > 1 ? 's' : ''} pour le niveau ${li.level + 1}${nx && (nx.atk > u.atk || nx.maxHp > u.maxHp) ? ` (${nx.atk > u.atk ? `+${nx.atk - u.atk} ATQ ` : ''}${nx.maxHp > u.maxHp ? `+${nx.maxHp - u.maxHp} PV` : ''})` : ''}` : 'Niveau maximum'}</span></div>` : ''}
  </div>`;
}

// Ajoute ou retire une carte de l'équipe (message d'erreur si impossible)
export function toggleTeam(app, id) {
  const g = app.game;
  try {
    const t = g.team().slice();
    if (t.includes(id)) {
      g.setTeam(t.filter((x) => x !== id));
    } else {
      if (t.length >= TEAM.active + TEAM.reserve) throw new Error('Ton équipe est complète : retire d’abord une créature.');
      g.setTeam([...t, id]);
    }
    app.sfx.tap();
    return true;
  } catch (err) { app.sfx.error(); toast(esc(err.message), { kind: 'error' }); return false; }
}

// Fiche de combat d'une créature (depuis l'écran Équipe)
export function openCreature(app, id, { onChange } = {}) {
  const g = app.game, c = app.catalog.get(id);
  const sh = openSheet('', { label: c.name, onClose: () => onChange && onChange() });
  const draw = () => {
    const inTeam = g.s.team.includes(id);
    sh.setContent(`<div class="v2-detail">
      <div class="v2-detail-card">${cardHTML(c, { size: 'full', mystery: !g.owns(id), nameKnown: true })}</div>
      <div class="v2-detail-h"><div><h2>${esc(c.name)}</h2><p class="small" style="color:${RARITY[c.rarity].color}">${RARITY[c.rarity].name}</p></div></div>
      ${combatHTML(g, c)}
      ${g.owns(id) ? `<button class="btn ${inTeam ? 'ghost' : 'primary'} block" data-v="team">${inTeam ? 'Retirer de l’équipe' : 'Ajouter à l’équipe'}</button>
        <button class="btn small ghost block" data-v="card">${icon('book')}Voir la carte</button>` : ''}
    </div>`);
  };
  sh.body.addEventListener('click', (e) => {
    if (e.target.closest('[data-v="team"]')) { if (toggleTeam(app, id)) draw(); }
    if (e.target.closest('[data-v="card"]')) { sh.close(); app.openCard(id); }
  });
  draw();
}

// ——— Écran Équipe ————————————————————————————————————————————————————
export function teamScreen(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.team ||= { sort: 'power' });
  const draw = () => {
    const team = g.team(), cost = g.teamCost(team), ult = g.ultimate(team), run = g.descent().run;
    const slot = (i) => { const c = team[i] && cat.get(team[i]); return c ? `<div class="v2-slot full">${armyCard(g, c)}</div>` : `<div class="v2-slot"><span>+</span><small>${i < TEAM.active ? 'Combat' : 'Réserve'}</small></div>`; };
    const owned = Object.keys(g.s.collection).map((id) => cat.get(id)).filter(Boolean);
    const RI = (r) => ['C', 'PC', 'R', 'HR', 'M', 'S'].indexOf(r);
    owned.sort(ui.sort === 'cost' ? (a, b) => COST[a.rarity] - COST[b.rarity] || g.cardLevel(b.id) - g.cardLevel(a.id) : (a, b) => g.cardLevel(b.id) - g.cardLevel(a.id) || RI(b.rarity) - RI(a.rarity));
    root.innerHTML = `<header class="screen-head"><h1>Mon équipe</h1><p class="muted">3 créatures au combat, 2 en réserve qui prennent la relève.</p></header>
      ${run ? `<p class="panel small center">${icon('info')} Une expédition est en cours : l’équipe ne peut pas changer avant ton retour.</p>` : ''}
      <section class="panel v2-team">
        <div class="v2-budget"><span>Budget</span><span class="progress"><i style="width:${Math.min(100, (cost / BUDGET) * 100)}%;--bar:${cost > BUDGET ? '#FF5468' : 'var(--gold)'}"></i></span><b>${cost} / ${BUDGET}</b></div>
        <p class="small muted">Coût : Commune 1, Peu commune 2, Rare 3, Hyper rare 4, Mythique 5, Secrète 6.</p>
        ${team.length < TEAM.active ? `<p class="small v2-warn">${icon('info')} Il faut au moins ${TEAM.active} créatures pour partir dans la Descente (encore ${TEAM.active - team.length}).</p>` : ''}
        ${team.length && !run ? `<button class="linkish small" data-act="clear">Vider l’équipe</button>` : ''}
        <h3 class="section-title">Au combat</h3><div class="v2-slots">${[0, 1, 2].map(slot).join('')}</div>
        <h3 class="section-title">En réserve</h3><div class="v2-slots res">${[3, 4].map(slot).join('')}</div>
        <div class="panel v2-skill ult" style="--uc:${ult.color}"><b>${icon('p:power')} Pouvoir : ${esc(ult.name)}</b><p class="small">${esc(ult.desc)}</p><p class="small muted">${ult.card ? `Porté par ${esc(cat.get(ult.card).name)}.` : 'Ajoute une Mythique ou une Secrète pour un pouvoir plus puissant.'}</p></div>
      </section>
      <h2 class="section-title">Ta collection <span class="more small"><button class="linkish" data-act="sort">${ui.sort === 'cost' ? 'Trier par niveau' : 'Trier par coût'}</button></span></h2>
      <div class="grid-cards v2-grid">${owned.map((c) => `<div class="v2-pick ${team.includes(c.id) ? 'in' : ''}">${armyCard(g, c)}</div>`).join('')}</div>`;
    lazyArt(root);
  };
  root.addEventListener('click', (e) => { const t = e.target.closest('.tcg'); if (t) openCreature(app, t.dataset.id, { onChange: draw }); });
  bindActions(root, {
    sort() { ui.sort = ui.sort === 'cost' ? 'power' : 'cost'; draw(); },
    clear() { try { g.setTeam([]); app.sfx.tap(); draw(); } catch (e) { toast(esc(e.message), { kind: 'error' }); } },
  });
  draw();
  tuto(app, 'army-team');
  app.refreshView = draw;
  return () => { app.refreshView = null; };
}

// ——— Écran Coffres ———————————————————————————————————————————————————
export function chestsScreen(app, root) {
  const g = app.game;
  const draw = () => {
    root.innerHTML = `<header class="screen-head"><h1>Coffres</h1><p class="muted">Gagnés dans l’Aventure. Chaque coffre contient des boosters.</p></header>
      <div class="ch-grid">${CHEST_ORDER.map((t) => { const n = g.s.chests[t] || 0; return `<button class="ch-c ${n ? '' : 'none'}" data-act="open" data-t="${t}" style="--cc:${CHESTS[t].color}" ${n ? '' : 'disabled'}>
        <span class="ch-art">${chestSVG(t)}</span>${n ? `<span class="ch-n">${n}</span>` : ''}<b>${esc(CHESTS[t].name)}</b><span class="small">${esc(CHESTS[t].desc)}</span></button>`; }).join('')}</div>
      <details class="panel dc-fold"><summary>${icon('info')} D’où viennent les coffres ?</summary><ul class="small">
        <li>À la fin d’une expédition, la profondeur atteinte donne le coffre : étages 1 à 4 bois, 5 à 9 fer, 10 à 14 or, 15 et plus abyssal.</li>
        <li>Chaque gardien vaincu (tous les 5 étages) donne aussi un coffre.</li>
        <li>Si toute l’équipe tombe, le coffre perd une qualité. En descente maudite, il en gagne une, mais tout est perdu si l’équipe tombe.</li></ul></details>`;
  };
  bindActions(root, {
    open(el) { openChestScene(app, el.dataset.t, { onDone: () => (app.refresh ? app.refresh() : draw()) }); },
  });
  draw();
  app.refreshView = draw;
  return () => { app.refreshView = null; };
}
