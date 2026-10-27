// L'équipe de cartes : fiche de combat d'une créature, écran Équipe et écran Coffres.
import { RARITY, BOOSTERS } from '../config.js';
import { cardHTML, lazyArt, fillGrid } from '../ui/card.js';
import { artUrl } from '../art/assets.js';
import { icon, roleIcon, actIcon } from '../ui/icons.js';
import { esc, fmt, toast, openSheet, bindActions, confirmBox } from '../ui/dom.js';
import { t, tw, LANG } from '../i18n.js';
import { coach } from '../ui/coach.js';
import { tuto } from '../ui/tutos.js';
import { chestSVG } from '../ui/chest.js';
import { CHESTS, CHEST_ORDER, powerPts, floorForPower } from '../core/descent.js';
import { ROLES, TEAM, MAX_LEVEL, ULTS, roleOf, canUlt, ultOf } from '../core/army.js';
import { duelUnit } from '../core/duel.js';
import { kitOf, synergiesFor, KEYWORDS, keywordOf } from '../core/skills.js';
import { CREATURE_KITS, kitSteps, nextUnlock } from '../core/kits.js';
import { TAGS, toName } from '../core/synergy.js';
import { openPack } from './opening.js';
import { openChestScene } from './chest-open.js';
import { upgradeCard } from './furnace.js';
import { openRevive } from '../ui/braise.js';

// Étiquettes posées sur une carte : capacité, niveau, coût, attaque et PV
export const armyBadges = (g, c) => {
  const fm = g.owns(c.id) ? g.formOf(c.id) : null;
  const u = duelUnit(c, { level: g.owns(c.id) ? g.cardLevel(c.id) : 1, form: fm }), kw = KEYWORDS[keywordOf(c)];
  return `${fm ? '<span class="fm-tag">Corrompue</span>' : ''}<span class="v2-badges"><span class="v2-role" style="--ro:${ROLES[roleOf(c)].color}" title="${esc(kw.name)}">${roleIcon(keywordOf(c))}</span>${g.owns(c.id) ? `<span class="v2-lv">Niv. ${g.cardLevel(c.id)}</span>` : ''}<span class="v2-ah"><i>${icon('swords')}${u.atk}</i><i>${icon('heart')}${u.maxHp}</i></span></span>`;
};
export const armyCard = (g, c, opts = {}) => cardHTML(c, { variant: g.owns(c.id) ? g.shownVariant(c.id) : 'normal', ...opts, tag: armyBadges(g, c) });

// Identité propre de la créature : ses 4 étapes (ouvertes ou verrouillées selon le niveau),
// ses forces, ses faiblesses et ses alliés
export function identityHTML(c, level) {
  const k = CREATURE_KITS[c.id];
  if (!k) return '';
  const nx = nextUnlock(c.id, level);
  return `<div class="panel ck-panel">
    <div class="ck-h"><b>${icon('sparkle')} ${t('Propre à {name}', { name: esc(tw(c.name)) })} · <span>${esc(k.style)}</span></b><span class="small muted">Sa frappe, puis ce qu’elle débloque en montant de niveau</span></div>
    <ol class="ck-steps">${kitSteps(c.id, level).map((x) => `<li class="ck-s ${x.open ? 'on' : 'locked'}">
      <span class="ck-lv">${x.open ? icon('check') : icon('lock')}<small>Niv. ${x.lv}</small></span>
      ${x.img ? `<img class="ck-ic" alt="" src="${x.img}">` : ''}
      <span class="ck-t"><b><span class="ck-k">${x.kind}</span> ${esc(x.name)}</b>${x.cost ? `<span class="cb-k">${x.cost}</span>` : ''}<span class="small">${esc(x.desc)}</span></span></li>`).join('')}</ol>
    ${nx ? `<p class="small ck-next">${icon('p:level-up')} ${t('Prochain déblocage au niveau {lv} :', { lv: nx.lv })} <b>${esc(nx.kind === 'Éveil' ? t('l’Éveil') : nx.kind === 'Apogée' ? t('l’Apogée') : nx.name)}</b></p>` : '<p class="small ck-next gold">Identité complète : tout est débloqué.</p>'}
    <div class="ck-traits"><p class="small"><b class="dc-good">Forces</b> <span>${esc(k.plus)}</span></p><p class="small"><b class="dc-bad">Faiblesses</b> <span>${esc(k.moins)}</span></p><p class="small"><b>Alliés</b> <span>${esc(k.synergy)}</span></p></div>
  </div>`;
}

// Bloc « Au combat » d'une carte : attaque, PV, capacité, pouvoir, niveau
export function combatHTML(g, c) {
  const owned = g.owns(c.id), kit = kitOf(c), role = ROLES[roleOf(c)], syn = synergiesFor(roleOf(c));
  const strike = CREATURE_KITS[c.id]?.strike || kit.basic;
  const li = g.cardLevelInfo(c.id), fm = owned ? g.formOf(c.id) : null, u = duelUnit(c, { level: li.level, form: fm }), nx = li.level < MAX_LEVEL ? duelUnit(c, { level: li.level + 1, form: fm }) : null;
  const ult = canUlt(c) ? ULTS[ultOf(c)] : null;
  return `<div class="army-combat">
    <p class="small muted">${esc(role.name)}</p>
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
    ${ult ? `<div class="panel v2-skill ult" style="--uc:${ult.color}"><b>${icon('p:power')} Pouvoir : ${esc(ult.name)}</b><p class="small">${esc(ult.desc)}</p><p class="small muted">Dans l’équipe, la Mythique ou Secrète la plus rare donne son pouvoir d’équipe.</p></div>` : ''}
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
    return `<div class="panel v2-skill tm-syn"><b>${icon('p:combo')} Synergies de l’équipe</b>${syn.length ? syn.slice(0, 6).map((x) => (LANG === 'fr' ? `<p class="small"><b>${nm(x.b)}</b> apporte ${esc(TAGS[x.tag])} ${toB(cat.get(x.a).name)}.</p>` : `<p class="small">${t(`{a} apporte ${TAGS[x.tag]} à {b}.`, { a: `<b>${esc(tw(cat.get(x.b).name))}</b>`, b: `<b>${esc(tw(cat.get(x.a).name))}</b>` })}</p>`)).join('') : '<p class="small muted">Aucune pour l’instant : « Suggérer une équipe » cherche des créatures qui se complètent.</p>'}</div>`;
  };
  const draw = () => {
    const team = g.team(), ult = g.ultimate(team), run = g.descent().run;
    const slot = (i) => { const c = team[i] && cat.get(team[i]); return c ? `<div class="v2-slot full ${g.isFallen(c.id) ? 'fallen' : ''}">${armyCard(g, c)}${g.isFallen(c.id) ? `<img class="v2-skull" alt="" src="assets/icons/mort.webp">${run ? '' : `<button class="btn small tm-revive" data-act="revive" data-id="${c.id}">Ranimer</button>`}` : ''}${run ? '' : `<span class="tm-ctl"><button class="tm-b" data-act="move" data-id="${c.id}" aria-label="${i < TEAM.active ? 'Mettre en réserve' : 'Envoyer au combat'}">${i < TEAM.active ? '▼' : '▲'}</button><button class="tm-b x" data-act="drop" data-id="${c.id}" aria-label="Retirer de l’équipe">✕</button></span>`}</div>` : `<button class="v2-slot" data-act="${run ? 'none' : 'pick'}"><span>+</span><small>${i < TEAM.active ? 'Combat' : 'Réserve'}</small></button>`; };
    root.innerHTML = `<header class="screen-head ui-hero bn-team"><h1>Mon équipe</h1><p class="muted">3 créatures au combat, 2 en réserve qui prennent la relève.</p></header>
      ${run ? `<p class="panel small center">${icon('info')} Un chapitre de la Descente est en cours : l’équipe ne peut pas changer avant la fin du chapitre (ou son abandon).</p>` : ''}
      <section class="panel v2-team">
        ${team.length ? (() => { const tp = g.teamPower(team), reach = floorForPower(tp); return `<p class="small tm-power">${icon('p:level-up')} Force de ton équipe : <b>${powerPts(tp)}</b> · de quoi viser l’étage <b>${reach}</b> environ.</p>`; })() : ''}
        ${team.length < TEAM.active ? `<p class="small v2-warn">${icon('info')} Il faut au moins ${TEAM.active} créatures pour partir dans la Descente (encore ${TEAM.active - team.length}).</p>` : ''}
        <h3 class="section-title">Au combat</h3><div class="v2-slots">${[0, 1, 2].map(slot).join('')}</div>
        <h3 class="section-title">En réserve</h3><div class="v2-slots res">${[3, 4].map(slot).join('')}</div>
        ${run ? '' : `<button class="btn primary block tm-pick" data-act="pick">${icon('p:team-ic')}Choisir mes créatures</button>`}
        ${synHTML(team)}
        ${ult.key ? `<div class="panel v2-skill ult" style="--uc:${ult.color}"><b>${icon('p:power')} Pouvoir : ${esc(ult.name)}</b><p class="small">${esc(ult.desc)}</p><p class="small muted">Porté par ${esc(cat.get(ult.card).name)}.</p></div>` : `<div class="panel v2-skill ult"><b>${icon('p:power')} Pouvoir d’équipe</b><p class="small muted">Ajoute une Mythique ou une Secrète à ton équipe : elle lui donne un pouvoir d’équipe, lancé quand la Ferveur est pleine.</p></div>`}
        ${run ? '' : `<div class="tm-tools"><button class="btn small primary" data-act="auto">${icon('sparkle')}Suggérer une équipe</button>${team.length ? '<button class="btn small ghost" data-act="clear">Vider</button>' : ''}</div>`}
        ${run ? '' : presetsHTML()}
        <details class="dc-fold tm-more"><summary>${icon('info')} Comment composer ton équipe</summary>
          <p class="small muted">Aucune limite de rareté : tu peux aligner tes créatures les plus fortes, ou celles qui se complètent le mieux.</p>
          <p class="small muted">La force d’une créature dépend de sa rareté et de son niveau : une Secrète au niveau 1 est plus faible qu’une Hyper rare au niveau 5.</p>
          <p class="small muted">Touche une case vide ou <b>Choisir mes créatures</b> pour ajouter une créature, <b>▲▼</b> pour la passer du combat à la réserve, <b>✕</b> pour la retirer.</p>
        </details>
      </section>
`;
    lazyArt(root);
  };
  /* v699 (tour du 24 octobre 2026) : la collection n'est plus sous l'équipe (l'écran faisait 25 hauteurs d'écran) :
     elle s'ouvre dans une fenêtre, filtrée par rôle, la plus forte d'abord */
  function openPicker() {
    const sh = openSheet('<div class="tm-picker"></div>', { cls: 'tm-pick-sheet', label: 'Choisir mes créatures', full: true, onClose: () => draw() });
    const box = sh.body.querySelector('.tm-picker');
    const RI = (r) => ['C', 'PC', 'R', 'HR', 'M', 'S'].indexOf(r);
    const paint = () => {
      const team = g.team();
      const owned = Object.keys(g.s.collection).map((id) => cat.get(id)).filter(Boolean).filter((c) => !ui.role || roleOf(c) === ui.role);
      owned.sort(ui.sort === 'cost' ? (a, b) => RI(b.rarity) - RI(a.rarity) || g.cardLevel(b.id) - g.cardLevel(a.id) : (a, b) => g.cardLevel(b.id) - g.cardLevel(a.id) || RI(b.rarity) - RI(a.rarity));
      box.innerHTML = `<h2 class="center">Choisir mes créatures</h2>
        <p class="small muted center tm-pk-n">Équipe : <b>${team.length} / ${TEAM.active + 2}</b> · les trois premières combattent, les deux suivantes attendent en réserve.</p>
        <div class="tm-pk-bar"><div class="chips tm-roles" role="group" aria-label="Filtrer par rôle"><button class="chip" data-p="role" data-v="" aria-pressed="${!ui.role}">Tous</button>${Object.entries(ROLES).map(([k, r]) => `<button class="chip" data-p="role" data-v="${k}" style="--chip:${r.color}" aria-pressed="${ui.role === k}">${esc(r.name)}</button>`).join('')}</div>
        <button class="linkish small" data-p="sort">${ui.sort === 'cost' ? 'Trier par niveau' : 'Trier par rareté'}</button></div>
        <div class="grid-cards v2-grid" id="tm-grid"></div>
        <div class="tm-pk-foot"><button class="btn primary block" data-p="done">Terminé</button></div>`;
      const html = (c) => `<div class="v2-pick ${team.includes(c.id) ? 'in' : ''}">${armyCard(g, c)}<button class="tm-add ${team.includes(c.id) ? 'in' : ''}" data-p="quick" data-id="${c.id}">${team.includes(c.id) ? '✓ Dans l’équipe' : '+ Ajouter'}</button></div>`;
      fillGrid(box.querySelector('#tm-grid'), owned, html, { first: 12, step: 12 });
    };
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-p]');
      if (!b) { const t = e.target.closest('.tcg'); if (t) openCreature(app, t.dataset.id, { onChange: paint }); return; }
      const p = b.dataset.p;
      if (p === 'done') return sh.close();
      if (p === 'role') { ui.role = b.dataset.v || null; paint(); }
      if (p === 'sort') { ui.sort = ui.sort === 'cost' ? 'power' : 'cost'; paint(); }
      if (p === 'quick') {
        const top = sh.body.scrollTop;
        if (toggleTeam(app, b.dataset.id)) {
          const inTeam = g.team().includes(b.dataset.id);
          b.classList.toggle('in', inTeam); b.closest('.v2-pick')?.classList.toggle('in', inTeam);
          b.textContent = inTeam ? '✓ Dans l’équipe' : '+ Ajouter';
          const n = box.querySelector('.tm-pk-n b'); if (n) n.textContent = `${g.team().length} / ${TEAM.active + 2}`;
          sh.body.scrollTop = top;
        }
      }
    });
    paint();
  }
  root.addEventListener('click', (e) => { if (e.target.closest('[data-act]')) return; const t = e.target.closest('.tcg'); if (t) openCreature(app, t.dataset.id, { onChange: draw }); });
  bindActions(root, {
    pick() { openPicker(); },
    none() {},
    revive(el) { openRevive(app, el.dataset.id, () => draw()); },
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
    auto() { try { g.setTeam(g.suggestTeam()); app.sfx.discover(); toast(t(g.teamSynergies().length > 1 ? 'Équipe suggérée : tes créatures les plus fortes qui se complètent ({n} synergies).' : 'Équipe suggérée : tes créatures les plus fortes qui se complètent ({n} synergie).', { n: g.teamSynergies().length }), { icon: 'sparkle' }); draw(); } catch (e) { toast(esc(e.message), { kind: 'error' }); } },
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
        <li>Descente : la première victoire au 3e étage de chaque chapitre donne un coffre (bois, puis fer dès l’étage 15, or dès l’étage 50).</li>
        <li>Épreuves du jour : un coffre par victoire, plus beau à mesure que ton record avance dans la Descente.</li>
        <li>Chaque gardien vaincu pour la première fois donne un coffre d’or (étages 5, 15, 25…) ou abyssal (étages 10, 20, 30…).</li>
        <li>Le Cauchemar redonne ces coffres, d’une qualité au-dessus.</li></ul></details>`;
  };
  bindActions(root, {
    open(el) { openChestScene(app, el.dataset.t, { onDone: () => (app.refresh ? app.refresh() : draw()) }); },
    all() {
      const r = g.openAllChests(); app.sfx.chest?.();
      const packs = Object.entries(r.packs).map(([k, n]) => `${n} ${esc((BOOSTERS[k]?.name.toLowerCase() || k).replace(/^booster/, n > 1 ? 'boosters' : 'booster'))}`);
      openSheet(`<h2 class="center">${r.n} coffres ouverts</h2><div class="ch-sum">${r.shards ? `<p>${icon('crystal')} <b>+${fmt(r.shards)}</b> éclats</p>` : ''}${r.ash ? `<p>${icon('ash')} <b>+${fmt(r.ash)}</b> cendres</p>` : ''}${packs.length ? `<p>${icon('ticket')} <span>${packs.join(', ')}</span> <span>${t('à ouvrir dans les Boosters')}</span></p>` : ''}</div>${packs.length ? '<a class="btn primary block" href="#/boutique">Ouvrir mes boosters</a>' : ''}`, { label: 'Coffres ouverts', cls: 'sheet-small' });
      app.flushProgress?.(); app.chrome?.(); draw();
    },
  });
  draw();
  if (g.chestCount()) tuto(app, 'coffres'); /* v404 : pas de bulle sans coffre */
  app.refreshView = draw;
  return () => { app.refreshView = null; };
}
