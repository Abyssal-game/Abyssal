// L'équipe de cartes : fiche de combat d'une créature, écran Équipe et écran Coffres.
import { RARITY, BOOSTERS } from '../config.js';
import { cardHTML, lazyArt } from '../ui/card.js';
import { artUrl } from '../art/assets.js';
import { icon, roleIcon, actIcon } from '../ui/icons.js';
import { esc, fmt, toast, openSheet, bindActions, confirmBox } from '../ui/dom.js';
import { coach } from '../ui/coach.js';
import { tuto } from '../ui/tutos.js';
import { chestSVG } from '../ui/chest.js';
import { CHESTS, CHEST_ORDER, powerPts } from '../core/descent.js';
import { ROLES, COST, BUDGET, TEAM, MAX_LEVEL, ULTS, roleOf, canUlt, ultOf } from '../core/army.js';
import { duelUnit } from '../core/duel.js';
import { kitOf, synergiesFor, KEYWORDS, keywordOf } from '../core/skills.js';
import { CREATURE_KITS, kitSteps, nextUnlock } from '../core/kits.js';
import { TAGS, toName } from '../core/synergy.js';
import { openPack } from './opening.js';
import { openChestScene } from './chest-open.js';
import { upgradeCard } from './furnace.js';

// Étiquettes posées sur une carte : capacité, niveau, coût, attaque et PV
export const armyBadges = (g, c) => {
  const fm = g.owns(c.id) ? g.formOf(c.id) : null;
  const u = duelUnit(c, { level: g.owns(c.id) ? g.cardLevel(c.id) : 1, form: fm }), kw = KEYWORDS[keywordOf(c)];
  return `${fm ? '<span class="fm-tag">Corrompue</span>' : ''}<span class="v2-badges"><span class="v2-role" style="--ro:${ROLES[roleOf(c)].color}" title="${esc(kw.name)}">${roleIcon(keywordOf(c))}</span>${g.owns(c.id) ? `<span class="v2-lv">Niv. ${g.cardLevel(c.id)}</span>` : ''}<span class="v2-cost">${COST[c.rarity]}</span><span class="v2-ah"><i>${icon('swords')}${u.atk}</i><i>${icon('heart')}${u.maxHp}</i></span></span>`;
};
export const armyCard = (g, c, opts = {}) => cardHTML(c, { variant: g.owns(c.id) ? g.shownVariant(c.id) : 'normal', ...opts, tag: armyBadges(g, c) });

// Identité propre de la créature : ses 4 étapes (ouvertes ou verrouillées selon le niveau),
// ses forces, ses faiblesses et ses alliés
export function identityHTML(c, level) {
  const k = CREATURE_KITS[c.id];
  if (!k) return '';
  const nx = nextUnlock(c.id, level);
  return `<div class="panel ck-panel">
    <div class="ck-h"><b>${icon('sparkle')} Propre à ${esc(c.name)} · ${esc(k.style)}</b><span class="small muted">Sa frappe, puis ce qu’elle débloque en montant de niveau</span></div>
    <ol class="ck-steps">${kitSteps(c.id, level).map((x) => `<li class="ck-s ${x.open ? 'on' : 'locked'}">
      <span class="ck-lv">${x.open ? icon('check') : icon('lock')}<small>Niv. ${x.lv}</small></span>
      ${x.img ? `<img class="ck-ic" alt="" src="${x.img}">` : ''}
      <span class="ck-t"><b><span class="ck-k">${x.kind}</span> ${esc(x.name)}</b>${x.cost ? `<span class="cb-k">${x.cost}</span>` : ''}<span class="small">${esc(x.desc)}</span></span></li>`).join('')}</ol>
    ${nx ? `<p class="small ck-next">${icon('p:level-up')} Prochain déblocage au niveau ${nx.lv} : <b>${esc(nx.kind === 'Éveil' ? 'l’Éveil' : nx.kind === 'Apogée' ? 'l’Apogée' : nx.name)}</b></p>` : '<p class="small ck-next gold">Identité complète : tout est débloqué.</p>'}
    <div class="ck-traits"><p class="small"><b class="dc-good">Forces</b> ${esc(k.plus)}</p><p class="small"><b class="dc-bad">Faiblesses</b> ${esc(k.moins)}</p><p class="small"><b>Alliés</b> ${esc(k.synergy)}</p></div>
  </div>`;
}

// Bloc « Au combat » d'une carte : attaque, PV, capacité, pouvoir, niveau
export function combatHTML(g, c) {
  const owned = g.owns(c.id), kit = kitOf(c), role = ROLES[roleOf(c)], syn = synergiesFor(roleOf(c));
  const strike = CREATURE_KITS[c.id]?.strike || kit.basic;
  const li = g.cardLevelInfo(c.id), fm = owned ? g.formOf(c.id) : null, u = duelUnit(c, { level: li.level, form: fm }), nx = li.level < MAX_LEVEL ? duelUnit(c, { level: li.level + 1, form: fm }) : null;
  const ult = canUlt(c) ? ULTS[ultOf(c)] : null;
  return `<div class="army-combat">
    <p class="small muted">${esc(role.name)} · coût d’équipe ${COST[c.rarity]}</p>
    <div class="v2-big-stats"><span class="dv-atk">${icon('swords')}<b>${u.atk}</b><small>Attaque</small></span><span class="dv-hp">${icon('heart')}<b>${u.maxHp}</b><small>PV</small></span></div>
    <div class="panel v2-skill cb-kit">
      <div class="ck-h"><b>${roleIcon(kit.kw)} Rôle : ${esc(role.name)}</b><span class="small muted">Commun à toutes les créatures de ce rôle, dès le niveau 1</span></div>
      ${CREATURE_KITS[c.id] ? '' : `<p class="small"><b>${actIcon('attack')} ${esc(strike.name)}</b> <span class="cb-k">gratuite · +1 PA</span><br>${esc(strike.desc)} +1 Ferveur.</p>`}
      <p class="small"><b class="gold">${actIcon(kit.skill.key, kit.skill.icon)} ${esc(kit.skill.name)}</b> <span class="cb-k">${kit.skill.pa} PA${kit.skill.dice ? ' · D20' : ''}</span><br>${esc(kit.skill.desc)}</p>
      <p class="small"><b>${esc(kit.passive.name)}</b> <span class="cb-k">trait du rôle</span><br>${esc(kit.passive.desc)}</p>
      ${c.rarity === 'C' ? `<p class="small dc-good">${icon('star')} Instinct de meute : +1 dégât aux élites et aux gardiens.</p>` : ''}
    </div>
    ${identityHTML(c, owned ? li.level : 1)}
    ${syn.length ? `<div class="panel v2-skill"><b>${icon('p:combo')} Combinaisons</b>${syn.map((x) => `<p class="small"><b>${esc(x.name)}</b> : ${esc(x.desc)}</p>`).join('')}</div>` : ''}
    ${ult ? `<div class="panel v2-skill ult" style="--uc:${ult.color}"><b>${icon('p:power')} Pouvoir : ${esc(ult.name)}</b><p class="small">${esc(ult.desc)}</p><p class="small muted">Dans l’équipe, la Mythique ou Secrète la plus rare remplace le Sceau du Serment par son pouvoir.</p></div>` : ''}
    ${owned ? `<div class="v2-lvl"><b>Niveau ${li.level} / ${MAX_LEVEL}</b><span class="xpbar"><i style="width:${(li.level / MAX_LEVEL) * 100}%"></i></span>${li.cost ? `<button class="btn small gold block fz-up" data-act="lvup">${icon('p:level-up')}Niveau ${li.level + 1} · ${li.cost} cendres${nx && (nx.atk > u.atk || nx.maxHp > u.maxHp) ? ` <small>(${nx.atk > u.atk ? `+${nx.atk - u.atk} ATQ ` : ''}${nx.maxHp > u.maxHp ? `+${nx.maxHp - u.maxHp} PV` : ''})</small>` : ''}${nextUnlock(c.id, li.level)?.lv === li.level + 1 ? ` <small class="ck-unl">+ ${esc(nextUnlock(c.id, li.level).name)}</small>` : ''}</button><span class="small muted">Tu as ${g.s.ash} cendres. Brûle tes doublons dans la Fournaise pour en gagner.</span>` : '<span class="small muted">Niveau maximum</span>'}</div>` : ''}
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
    if (e.target.closest('[data-act="lvup"]') && upgradeCard(app, id)) draw();
  });
  draw();
}

// ——— Écran Équipe ————————————————————————————————————————————————————
export function teamScreen(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.team ||= { sort: 'power' });
  // Équipes enregistrées : charger d'un toucher, enregistrer l'équipe actuelle, supprimer
  const presetsHTML = () => {
    const list = g.teamPresets();
    return `<div class="tp"><span class="small muted">Mes équipes</span><div class="tp-row">${list.map((p, i) => `<span class="tp-c"><button class="tp-load" data-act="pload" data-i="${i}"><span class="tp-av">${p.ids.slice(0, 3).map((id) => { const c = cat.get(id); return c ? `<img alt="" src="${artUrl(c, { lite: true })}">` : ''; }).join('')}</span><b>${esc(p.name)}</b></button><button class="tp-x" data-act="pdel" data-i="${i}" aria-label="Supprimer l’équipe ${esc(p.name)}">✕</button></span>`).join('')}${list.length < 4 ? `<button class="tp-new" data-act="psave" ${g.team().length ? '' : 'disabled'}>${icon('plus')}<b>Enregistrer</b></button>` : ''}</div></div>`;
  };
  // Synergies de l'équipe : qui profite de quoi
  const synHTML = (team) => {
    const syn = g.teamSynergies(team);
    if (team.length < 2) return '';
    const nm = (id) => esc(cat.get(id).name);
    const toB = (n) => { const t = toName(n), i = t.indexOf(' '); return `${t.slice(0, i)} <b>${esc(t.slice(i + 1))}</b>`; };
    return `<div class="panel v2-skill tm-syn"><b>${icon('p:combo')} Synergies de l’équipe</b>${syn.length ? syn.slice(0, 6).map((x) => `<p class="small"><b>${nm(x.b)}</b> apporte ${esc(TAGS[x.tag])} ${toB(cat.get(x.a).name)}.</p>`).join('') : '<p class="small muted">Aucune pour l’instant : « Suggérer une équipe » cherche des créatures qui se complètent.</p>'}</div>`;
  };
  const draw = () => {
    const team = g.team(), cost = g.teamCost(team), ult = g.ultimate(team), run = g.descent().run;
    const slot = (i) => { const c = team[i] && cat.get(team[i]); return c ? `<div class="v2-slot full">${armyCard(g, c)}${run ? '' : `<span class="tm-ctl"><button class="tm-b" data-act="move" data-id="${c.id}" aria-label="${i < TEAM.active ? 'Mettre en réserve' : 'Envoyer au combat'}">${i < TEAM.active ? '▼' : '▲'}</button><button class="tm-b x" data-act="drop" data-id="${c.id}" aria-label="Retirer de l’équipe">✕</button></span>`}</div>` : `<div class="v2-slot"><span>+</span><small>${i < TEAM.active ? 'Combat' : 'Réserve'}</small></div>`; };
    const owned = Object.keys(g.s.collection).map((id) => cat.get(id)).filter(Boolean);
    const RI = (r) => ['C', 'PC', 'R', 'HR', 'M', 'S'].indexOf(r);
    owned.sort(ui.sort === 'cost' ? (a, b) => COST[a.rarity] - COST[b.rarity] || g.cardLevel(b.id) - g.cardLevel(a.id) : (a, b) => g.cardLevel(b.id) - g.cardLevel(a.id) || RI(b.rarity) - RI(a.rarity));
    root.innerHTML = `<header class="screen-head ui-hero bn-team"><h1>Mon équipe</h1><p class="muted">3 créatures au combat, 2 en réserve qui prennent la relève.</p></header>
      ${run ? `<p class="panel small center">${icon('info')} Une expédition est en cours : l’équipe ne peut pas changer avant ton retour.</p>` : ''}
      <section class="panel v2-team">
        <div class="v2-budget"><span>Budget</span><span class="progress"><i style="width:${Math.min(100, (cost / BUDGET) * 100)}%;--bar:${cost > BUDGET ? '#FF5468' : 'var(--gold)'}"></i></span><b>${cost} / ${BUDGET}</b></div>
        <p class="small muted">Coût : Commune 1, Peu commune 2, Rare 3, Hyper rare 4, Mythique 5, Secrète 6.</p>
        ${team.length ? (() => { const fl = team.slice(0, TEAM.active), tp = g.teamPower(fl), reach = Math.max(1, Math.round(6 + (tp - 1) * 22)); return `<p class="small tm-power">${icon('p:level-up')} Force au combat : <b>${powerPts(tp)}</b> · de quoi viser l’étage <b>${reach}</b> environ. <span class="muted">La force d’une créature dépend de sa rareté et de son niveau : une Secrète au niveau 1 est plus faible qu’une Hyper rare au niveau 5.</span></p>`; })() : ''}
        ${team.length < TEAM.active ? `<p class="small v2-warn">${icon('info')} Il faut au moins ${TEAM.active} créatures pour partir dans la Descente (encore ${TEAM.active - team.length}).</p>` : ''}
        ${run ? '' : `<div class="tm-tools"><button class="btn small primary" data-act="auto">${icon('sparkle')}Suggérer une équipe</button>${team.length ? '<button class="btn small ghost" data-act="clear">Vider</button>' : ''}</div><p class="small muted tm-help">Touche <b>+</b> sous une créature pour l’ajouter, <b>▲▼</b> pour la passer du combat à la réserve, <b>✕</b> pour la retirer.</p>`}
        ${run ? '' : presetsHTML()}
        <h3 class="section-title">Au combat</h3><div class="v2-slots">${[0, 1, 2].map(slot).join('')}</div>
        <h3 class="section-title">En réserve</h3><div class="v2-slots res">${[3, 4].map(slot).join('')}</div>
        ${synHTML(team)}
        <div class="panel v2-skill ult" style="--uc:${ult.color}"><b>${icon('p:power')} Pouvoir : ${esc(ult.name)}</b><p class="small">${esc(ult.desc)}</p><p class="small muted">${ult.card ? `Porté par ${esc(cat.get(ult.card).name)}.` : 'Ajoute une Mythique ou une Secrète pour un pouvoir plus puissant.'}</p></div>
      </section>
      <h2 class="section-title">Ta collection <span class="more small"><button class="linkish" data-act="sort">${ui.sort === 'cost' ? 'Trier par niveau' : 'Trier par coût'}</button></span></h2>
      <div class="grid-cards v2-grid" id="tm-grid"></div>`;
    lazyArt(root);
    // v391 : la grille de la collection par paquets (216 cartes d'un coup bloquaient l'écran plus d'une seconde, à chaque ajout)
    const grid = root.querySelector('#tm-grid'), html = (c) => `<div class="v2-pick ${team.includes(c.id) ? 'in' : ''}">${armyCard(g, c)}${run ? '' : `<button class="tm-add ${team.includes(c.id) ? 'in' : ''}" data-act="quick" data-id="${c.id}">${team.includes(c.id) ? '✓ Dans l’équipe' : `+ Ajouter · ${COST[c.rarity]}`}</button>`}</div>`;
    const turn = (draw.turn = (draw.turn || 0) + 1), FIRST = 12, STEP = 18;
    grid.innerHTML = owned.slice(0, FIRST).map(html).join(''); lazyArt(grid);
    const k0 = grid.children[0];
    if (k0 && owned.length > FIRST) { const cols = [...grid.children].filter((x) => x.offsetTop === k0.offsetTop).length || 1; const gap = parseFloat(getComputedStyle(grid).rowGap) || 0; grid.style.minHeight = `${Math.ceil(owned.length / cols) * (k0.offsetHeight + gap)}px`; }
    const more = (from) => {
      if (turn !== draw.turn || !grid.isConnected) return;
      if (from >= owned.length) { grid.style.minHeight = ''; return; }
      grid.insertAdjacentHTML('beforeend', owned.slice(from, from + STEP).map(html).join('')); lazyArt(grid);
      setTimeout(() => requestAnimationFrame(() => more(from + STEP)), 0);
    };
    requestAnimationFrame(() => more(FIRST));
  };
  root.addEventListener('click', (e) => { if (e.target.closest('[data-act]')) return; const t = e.target.closest('.tcg'); if (t) openCreature(app, t.dataset.id, { onChange: draw }); });
  bindActions(root, {
    sort() { ui.sort = ui.sort === 'cost' ? 'power' : 'cost'; draw(); },
    quick(el) { if (toggleTeam(app, el.dataset.id)) draw(); },
    drop(el) { if (toggleTeam(app, el.dataset.id)) draw(); },
    move(el) {
      const t = g.team().slice(), i = t.indexOf(el.dataset.id);
      if (i < 0) return;
      // du combat vers la réserve : échange avec la 1re créature en réserve ; de la réserve vers le combat : avec la dernière au combat
      const j = i < TEAM.active ? (t.length > TEAM.active ? TEAM.active : -1) : TEAM.active - 1;
      if (j < 0) { toast('Ajoute d’abord une créature en réserve pour faire l’échange.', { kind: 'error' }); return; }
      [t[i], t[j]] = [t[j], t[i]];
      try { g.setTeam(t); app.sfx.tap(); draw(); } catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
    pload(el) {
      try { const r = g.loadTeamPreset(Number(el.dataset.i)); app.sfx.discover?.(); toast(`Équipe « ${esc(g.teamPresets()[el.dataset.i].name)} » chargée${r.missing ? ` (${r.missing} carte${r.missing > 1 ? 's' : ''} absente${r.missing > 1 ? 's' : ''})` : ''}.`, { icon: 'p:team-ic' }); draw(); }
      catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
    async pdel(el) {
      const p = g.teamPresets()[el.dataset.i];
      if (p && await confirmBox(`Supprimer l’équipe « ${esc(p.name)} » ? Tes cartes ne bougent pas.`, { ok: 'Supprimer', danger: true })) { g.deleteTeamPreset(Number(el.dataset.i)); draw(); }
    },
    psave() {
      const sh = openSheet(`<div class="tp-sheet"><h2>Enregistrer cette équipe</h2><p class="small muted">Donne-lui un nom court, par exemple « Givre » ou « Anti-gardien ».</p>
        <input class="input" id="tp-name" maxlength="18" placeholder="Nom de l’équipe" autocomplete="off"><div class="row gap"><button class="btn ghost" data-t="no">Annuler</button><button class="btn primary" data-t="ok">Enregistrer</button></div></div>`, { cls: 'sheet-small', label: 'Enregistrer l’équipe' });
      const inp = sh.body.querySelector('#tp-name');
      setTimeout(() => inp?.focus(), 50);
      const go = () => { try { g.saveTeamPreset(inp.value); app.sfx.coin?.(); toast(`Équipe « ${esc(inp.value.trim())} » enregistrée.`, { icon: 'check' }); sh.close(); draw(); } catch (err) { toast(esc(err.message), { kind: 'error' }); } };
      sh.body.addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; if (b.dataset.t === 'ok') go(); else sh.close(); });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    },
    auto() { try { g.setTeam(g.suggestTeam()); app.sfx.discover(); toast(`Équipe suggérée : tes créatures les plus fortes qui se complètent (${g.teamSynergies().length} synergie${g.teamSynergies().length > 1 ? 's' : ''}).`, { icon: 'sparkle' }); draw(); } catch (e) { toast(esc(e.message), { kind: 'error' }); } },
    async clear() { // v311 : confirmation (avant, un toucher effaçait l'équipe)
      if (!(await confirmBox('Retirer toutes les créatures de l’équipe ?', { ok: 'Vider l’équipe' }))) return;
      try { g.setTeam([]); app.sfx.sheet?.(); draw(); } catch (e) { toast(esc(e.message), { kind: 'error' }); }
    },
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
    root.innerHTML = `<header class="screen-head ui-hero bn-chests"><h1>Coffres</h1><p class="muted">Gagnés dans l’Aventure : des cendres, et des éclats ou un booster (or, abyssal).</p></header>
      ${g.chestCount() > 1 ? `<button class="btn primary block dc-plq dc-plq-red ch-all" data-act="all">${icon('p:chest')}Ouvrir les ${g.chestCount()} coffres d’un coup</button>` : ''}
      <div class="ch-grid">${CHEST_ORDER.map((t) => { const n = g.s.chests[t] || 0; return `<button class="ch-c ${n ? '' : 'none'}" data-act="open" data-t="${t}" style="--cc:${CHESTS[t].color}" ${n ? '' : 'disabled'}>
        <span class="ch-art">${chestSVG(t)}</span>${n ? `<span class="ch-n">${n}</span>` : ''}<b>${esc(CHESTS[t].name)}</b><span class="small">${esc(CHESTS[t].desc)}</span></button>`; }).join('')}</div>
      <details class="panel dc-fold"><summary>${icon('info')} D’où viennent les coffres ?</summary><ul class="small">
        <li>À la fin d’une expédition, la profondeur atteinte donne le coffre : rien avant l’étage 3, puis étages 3 à 7 bois, 8 à 15 fer, 16 à 24 or, 25 et plus abyssal.</li>
        <li>La première victoire contre chaque gardien (tous les 5 étages) donne aussi un coffre.</li>
        <li>Si toute l’équipe tombe, le coffre perd une qualité. En descente maudite, il en gagne une, mais tout est perdu si l’équipe tombe.</li></ul></details>`;
  };
  bindActions(root, {
    open(el) { openChestScene(app, el.dataset.t, { onDone: () => (app.refresh ? app.refresh() : draw()) }); },
    all() {
      const r = g.openAllChests(); app.sfx.chest?.();
      const packs = Object.entries(r.packs).map(([k, n]) => `${n} ${esc((BOOSTERS[k]?.name.toLowerCase() || k).replace(/^booster/, n > 1 ? 'boosters' : 'booster'))}`);
      openSheet(`<h2 class="center">${r.n} coffres ouverts</h2><div class="ch-sum">${r.shards ? `<p>${icon('crystal')} <b>+${fmt(r.shards)}</b> éclats</p>` : ''}${r.ash ? `<p>${icon('ash')} <b>+${fmt(r.ash)}</b> cendres</p>` : ''}${packs.length ? `<p>${icon('ticket')} ${packs.join(', ')} : à ouvrir dans les Boosters</p>` : ''}</div>${packs.length ? '<a class="btn primary block" href="#/boutique">Ouvrir mes boosters</a>' : ''}`, { label: 'Coffres ouverts', cls: 'sheet-small' });
      app.flushProgress?.(); app.chrome?.(); draw();
    },
  });
  draw();
  if (g.chestCount()) tuto(app, 'coffres'); /* v404 : pas de bulle sans coffre */
  app.refreshView = draw;
  return () => { app.refreshView = null; };
}
