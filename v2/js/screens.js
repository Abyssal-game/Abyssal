// ABYSSAL v2 (prototype) : écrans Descente, Équipe, Boosters, Collection, Coffres,
// fiche d'une créature et révélation des cartes (boosters et coffres).
import { RARITY, VARIANTS } from '../../js/config.js';
import { ROOMS, DESCENT } from '../../js/core/descent.js';
import { cardHTML } from '../../js/ui/card.js';
import { artUrl } from '../../js/art/assets.js';
import { icon, sigil } from '../../js/ui/icons.js';
import { esc, fmt, toast, openSheet, confirmBox, bindActions } from '../../js/ui/dom.js';
import { chestSVG } from '../../js/ui/gear.js';
import { packHTML } from '../../js/screens/shop.js';
import { coach } from '../../js/ui/coach.js';
import { ROLES, COST, BUDGET, TEAM, MAX_LEVEL, ULTS, roleOf, canUlt, ultOf } from './units.js';
import { KEYWORDS, keywordOf, duelUnit } from './duel.js';
import { CHESTS, CHEST_ORDER, PRICE, chestForDepth } from './game.js';
import { runDuel } from './duel-ui.js';
import { BLESS2 } from './game.js';

const ROOM_ICON = { fight: 'swords', elite: 'skull', altar: 'star', rest: 'heart', treasure: 'crystal', boss: 'crown' };

// Petite étiquette de rôle / niveau / coût posée sur une carte
const badges = (g, c) => { const u = duelUnit(c, { level: g.owns(c.id) ? g.level(c.id) : 1 }); const kw = KEYWORDS[keywordOf(c)]; return `<span class="v2-badges"><span class="v2-role" style="--ro:${ROLES[roleOf(c)].color}" title="${esc(kw.name)}">${icon(kw.icon)}</span>${g.owns(c.id) ? `<span class="v2-lv">Niv. ${g.level(c.id)}</span>` : ''}<span class="v2-cost">${COST[c.rarity]}</span><span class="v2-ah"><i>${icon('swords')}${u.atk}</i><i>${icon('heart')}${u.maxHp}</i></span></span>`; };
const cardWithBadges = (g, c, opts = {}) => cardHTML(c, { ...opts, tag: badges(g, c) });

// ——— Fiche d'une créature ————————————————————————————————————————————
export function openCreature(app, id, { onChange } = {}) {
  const g = app.game, c = app.catalog.get(id);
  const sh = openSheet('', { label: c.name, onClose: () => onChange && onChange() });
  const draw = () => {
    const owned = g.owns(id), role = ROLES[roleOf(c)], kw = KEYWORDS[keywordOf(c)];
    const li = g.levelInfo(id), u = duelUnit(c, { level: li.level }), nx = li.level < MAX_LEVEL ? duelUnit(c, { level: li.level + 1 }) : null;
    const inTeam = g.s.team.includes(id);
    const ult = canUlt(c) ? ULTS[ultOf(c)] : null;
    sh.setContent(`<div class="v2-detail">
      <div class="v2-detail-card">${cardHTML(c, { size: 'full', mystery: !owned, nameKnown: true })}</div>
      <div class="v2-detail-h"><span class="v2-role big" style="--ro:${role.color}">${icon(role.icon)}</span><div><h2>${esc(c.name)}</h2><p class="small" style="color:${RARITY[c.rarity].color}">${RARITY[c.rarity].name} · ${esc(role.name)} · coût ${COST[c.rarity]}</p></div></div>
      <div class="v2-big-stats"><span class="dv-atk">${icon('swords')}<b>${u.atk}</b><small>Attaque</small></span><span class="dv-hp">${icon('heart')}<b>${u.maxHp}</b><small>PV</small></span></div>
      <div class="panel v2-skill"><b>${icon(kw.icon)} ${esc(kw.name)}</b><p class="small">${esc(kw.desc)}</p></div>
      ${ult ? `<div class="panel v2-skill ult" style="--uc:${ult.color}"><b>${icon('sparkle')} Pouvoir ultime : ${esc(ult.name)}</b><p class="small">${esc(ult.desc)}</p><p class="small muted">Une seule créature de l’équipe porte l’ultime : la Mythique ou Secrète la plus rare.</p></div>` : ''}
      ${owned ? `<div class="v2-lvl"><b>Niveau ${li.level}</b><span class="xpbar"><i style="width:${li.need ? (li.into / li.need) * 100 : 100}%"></i></span><span class="small muted">${li.need ? `${li.into} / ${li.need} doublon${li.need > 1 ? 's' : ''} pour le niveau ${li.level + 1}${nx && (nx.atk > u.atk || nx.maxHp > u.maxHp) ? ` (${nx.atk > u.atk ? `+${nx.atk - u.atk} ATQ ` : ''}${nx.maxHp > u.maxHp ? `+${nx.maxHp - u.maxHp} PV` : ''})` : ''}` : 'Niveau maximum : les doublons donnent des cendres'}</span></div>
        <button class="btn ${inTeam ? 'ghost' : 'primary'} block" data-v="team">${inTeam ? 'Retirer de l’équipe' : 'Ajouter à l’équipe'}</button>`
      : '<p class="small muted center">Pas encore dans ta collection : trouve-la dans un booster.</p>'}
    </div>`);
  };
  sh.body.addEventListener('click', (e) => {
    if (!e.target.closest('[data-v="team"]')) return;
    try {
      const t = g.s.team.slice();
      if (t.includes(id)) g.setTeam(t.filter((x) => x !== id));
      else {
        if (t.length >= TEAM.active + TEAM.reserve) throw new Error('Ton équipe est complète : retire d’abord une créature.');
        g.setTeam([...t, id]);
      }
      app.sfx.tap(); draw();
    } catch (err) { app.sfx.error(); toast(esc(err.message), { kind: 'error' }); }
  });
  draw();
}

// ——— Révélation des cartes (booster ou coffre) ———————————————————————————
// packs : [{ kind, cards: [{ id, variant, isNew, levelUp, level, ash }] }]
export function revealPacks(app, packs, { title = 'Booster', after } = {}) {
  const g = app.game, cat = app.catalog;
  const all = packs.flatMap((p) => p.cards);
  const sh = openSheet('', { cls: 'v2-reveal-sheet', label: title, onClose: () => after && after() });
  const tagOf = (c) => (c.isNew ? `<span class="v2-tag new">${icon('sparkle')} Nouvelle recrue</span>` : c.levelUp ? `<span class="v2-tag up">${icon('star')} Niveau ${c.levelUp} !</span>` : c.ash ? `<span class="v2-tag">+${c.ash} cendres</span>` : `<span class="v2-tag">Doublon · niv. ${c.level}</span>`);
  sh.setContent(`<div class="v2-reveal">
    <h2>${esc(title)}</h2>
    <p class="small muted center v2-hint">Touche les cartes pour les retourner.</p>
    ${packs.map((p, pi) => `${packs.length > 1 ? `<h3 class="section-title">${p.kind === 'premium' ? 'Booster premium' : 'Booster'} ${pi + 1}</h3>` : ''}
      <div class="v2-rgrid">${p.cards.map((c, i) => { const card = cat.get(c.id); return `<div class="v2-flip r-${card.rarity}" data-i="${pi}-${i}" style="--rc:${RARITY[card.rarity].color}">
        <div class="v2-flip-in"><div class="v2-back"></div><div class="v2-front">${cardWithBadges(g, card, { variant: c.variant })}${tagOf(c)}</div></div></div>`; }).join('')}</div>`).join('')}
    <div class="row gap v2-reveal-acts"><button class="btn" data-r="all">Tout retourner</button><button class="btn primary" data-r="close" style="display:none">Continuer</button></div>
  </div>`);
  let left = all.length;
  const flip = (el) => {
    if (el.classList.contains('on') || el.classList.contains('turn')) return;
    el.classList.add('turn'); left--;
    setTimeout(() => el.classList.add('on'), app.reduced() ? 0 : 180);
    setTimeout(() => el.classList.remove('turn'), 400);
    const r = el.className.match(/r-(\w+)/)?.[1];
    if (['HR', 'M', 'S'].includes(r)) { app.sfx.reveal(r === 'HR' ? 'HR' : r); try { navigator.vibrate?.(40); } catch (e) { /* rien */ } } else app.sfx.tap();
    if (!left) { sh.body.querySelector('[data-r="all"]').style.display = 'none'; sh.body.querySelector('[data-r="close"]').style.display = ''; sh.body.querySelector('.v2-hint').textContent = summary(); }
  };
  const summary = () => { const n = all.filter((c) => c.isNew).length, up = all.filter((c) => c.levelUp).length; return [n ? `${n} nouvelle${n > 1 ? 's' : ''} recrue${n > 1 ? 's' : ''}` : '', up ? `${up} montée${up > 1 ? 's' : ''} de niveau` : ''].filter(Boolean).join(' · ') || 'Des doublons pour renforcer ton équipe.'; };
  sh.body.addEventListener('click', (e) => {
    const f = e.target.closest('.v2-flip');
    if (f) { if (f.classList.contains('on')) { const id = f.querySelector('.tcg')?.dataset.id; if (id) openCreature(app, id); } else flip(f); return; }
    const b = e.target.closest('[data-r]');
    if (b?.dataset.r === 'all') sh.body.querySelectorAll('.v2-flip:not(.on)').forEach((el, i) => setTimeout(() => flip(el), i * 120));
    if (b?.dataset.r === 'close') sh.close();
  });
}

// ——— Écran Boosters ——————————————————————————————————————————————————
export function boostersScreen(app, root) {
  const g = app.game, cat = app.catalog;
  const draw = () => {
    const f = g.freePack();
    const wait = f.nextAt ? Math.max(1, Math.ceil((f.nextAt - Date.now()) / 60000)) : 0;
    root.innerHTML = `<header class="screen-head"><h1>Boosters</h1><p class="muted">Chaque carte est une créature qui combat pour toi. Un doublon la fait monter de niveau.</p></header>
      <section class="panel v2-pack">
        <div class="v2-pack-art">${packHTML('standard', cat)}</div>
        <div><h2>Booster standard</h2><p class="small muted">5 créatures, dont au moins une Peu commune.</p>
          <button class="btn primary block" data-act="buy" ${g.canBuy() ? '' : 'disabled'}>${f.stock ? `${icon('sparkle')}Ouvrir · gratuit (${f.stock})` : `Ouvrir · ${icon('crystal')} ${PRICE.standard}`}</button>
          <p class="small muted">${f.stock >= 3 ? 'Réserve de boosters gratuits pleine.' : `Prochain booster gratuit dans ${wait >= 60 ? `${Math.floor(wait / 60)} h ${String(wait % 60).padStart(2, '0')}` : `${wait} min`}.`}</p></div>
      </section>
      <p class="small muted center">Les meilleurs boosters se gagnent dans les coffres de la Descente : plus tu descends, plus le coffre est beau.</p>`;
  };
  bindActions(root, {
    buy() {
      try { const cards = g.buyPack(); app.sfx.tear(); revealPacks(app, [{ kind: 'standard', cards }], { title: 'Booster standard', after: () => { app.chrome(); draw(); } }); }
      catch (e) { app.sfx.error(); toast(esc(e.message), { kind: 'error' }); }
    },
  });
  draw();
  return draw;
}

// ——— Écran Coffres ———————————————————————————————————————————————————
export function chestsScreen(app, root) {
  const g = app.game;
  const draw = () => {
    root.innerHTML = `<header class="screen-head"><h1>Coffres</h1><p class="muted">Gagnés dans la Descente. Chaque coffre contient des boosters.</p></header>
      <div class="ch-grid">${CHEST_ORDER.map((t) => { const n = g.s.chests[t] || 0; return `<button class="ch-c ${n ? '' : 'none'}" data-act="open" data-t="${t}" style="--cc:${CHESTS[t].color}" ${n ? '' : 'disabled'}>
        <span class="ch-art">${chestSVG(t)}</span>${n ? `<span class="ch-n">${n}</span>` : ''}<b>${esc(CHESTS[t].name)}</b><span class="small">${esc(CHESTS[t].desc)}</span></button>`; }).join('')}</div>
      <details class="panel dc-fold"><summary>${icon('info')} D’où viennent les coffres ?</summary><ul class="small">
        <li>À la fin d’une expédition, la profondeur atteinte donne le coffre : étages 1 à 4 bois, 5 à 9 fer, 10 à 14 or, 15 et plus abyssal.</li>
        <li>Chaque gardien vaincu (tous les 5 étages) donne aussi un coffre.</li>
        <li>Si toute l’équipe tombe, le coffre perd une qualité. En descente maudite, il en gagne une, mais tout est perdu si l’équipe tombe.</li></ul></details>`;
  };
  bindActions(root, {
    open(el) {
      const t = el.dataset.t;
      const sh = openSheet(`<div class="cho" style="--cc:${CHESTS[t].color};--bc:${CHESTS[t].color}"><p class="cho-t">${esc(CHESTS[t].name)}</p>
        <button class="cho-chest" aria-label="Ouvrir le coffre">${chestSVG(t)}<span class="cho-glow"></span></button><p class="cho-msg small muted">Touche le coffre pour l’ouvrir.</p></div>`, { cls: 'chest-sheet', label: CHESTS[t].name });
      if (sh.body.querySelector('.ch-img')) new Image().src = `assets/chests/${t}-open.webp`;
      sh.body.querySelector('.cho-chest').addEventListener('click', async (e) => {
        const chest = e.currentTarget;
        if (chest.classList.contains('open')) return;
        let packs;
        try { packs = g.openChest(t); } catch (err) { toast(esc(err.message), { kind: 'error' }); sh.close(); return; }
        chest.classList.add('shake'); app.sfx.rumble(1);
        await new Promise((r) => setTimeout(r, app.reduced() ? 50 : 900));
        chest.classList.remove('shake'); chest.classList.add('open');
        const img = chest.querySelector('.ch-img'); if (img) img.src = `assets/chests/${t}-open.webp`;
        app.sfx.reveal('R');
        await new Promise((r) => setTimeout(r, app.reduced() ? 50 : 700));
        sh.close();
        revealPacks(app, packs, { title: CHESTS[t].name, after: () => { app.chrome(); draw(); } });
      });
    },
  });
  draw();
  return draw;
}

// ——— Écran Collection ————————————————————————————————————————————————
export function collectionScreen(app, root) {
  const g = app.game;
  const draw = () => {
    const owned = g.ownedCards().length;
    root.innerHTML = `<header class="screen-head"><h1>Collection</h1><p class="muted">${owned} / ${g.pool.length} créatures du prototype · ${icon('ash')} ${fmt(g.s.ash)} cendres</p></header>
      <div class="grid-cards v2-grid">${g.pool.map((c) => (g.owns(c.id) ? cardWithBadges(g, c) : cardHTML(c, { mystery: true, nameKnown: true, tag: badges(g, c) }))).join('')}</div>
      <p class="small muted center v2-old"><a href="./">Revenir à la version actuelle d’ABYSSAL</a></p>
      <p class="small muted center"><button class="linkish" data-act="reset">Recommencer le prototype de zéro</button></p>`;
  };
  root.addEventListener('click', (e) => { const t = e.target.closest('.tcg'); if (t) openCreature(app, t.dataset.id, { onChange: draw }); });
  bindActions(root, { async reset() { if (await confirmBox('Effacer la progression du prototype ? La version actuelle n’est pas touchée.', { ok: 'Recommencer', danger: true })) { g.reset(); app.chrome(); draw(); } } });
  draw();
  return draw;
}

// ——— Écran Équipe ————————————————————————————————————————————————————
export function teamScreen(app, root) {
  const g = app.game;
  const draw = () => {
    const team = g.s.team, cost = g.teamCost(), ult = g.ultimate();
    const slot = (i) => { const id = team[i]; const c = id && app.catalog.get(id); return c ? `<div class="v2-slot full">${cardWithBadges(g, c)}</div>` : `<div class="v2-slot"><span>+</span><small>${i < TEAM.active ? 'Combat' : 'Réserve'}</small></div>`; };
    root.innerHTML = `<header class="screen-head"><h1>Mon équipe</h1><p class="muted">3 créatures au combat, 2 en réserve qui prennent la relève.</p></header>
      <section class="panel v2-team">
        <div class="v2-budget"><span>Budget</span><span class="progress"><i style="width:${(cost / BUDGET) * 100}%;--bar:${cost > BUDGET ? '#FF5468' : 'var(--gold)'}"></i></span><b>${cost} / ${BUDGET}</b></div>
        <p class="small muted">Coût : Commune 1, Peu commune 2, Rare 3, Hyper rare 4, Mythique 5, Secrète 6.</p>
        <h3 class="section-title">Au combat</h3><div class="v2-slots">${[0, 1, 2].map(slot).join('')}</div>
        <h3 class="section-title">En réserve</h3><div class="v2-slots res">${[3, 4].map(slot).join('')}</div>
        <div class="panel v2-skill ult" style="--uc:${ult.color}"><b>${icon('sparkle')} Pouvoir ultime : ${esc(ult.name)}</b><p class="small">${esc(ult.desc)}</p><p class="small muted">${ult.card ? `Porté par ${esc(app.catalog.get(ult.card).name)}.` : 'Ajoute une Mythique ou une Secrète pour un pouvoir plus puissant.'}</p></div>
      </section>
      <h2 class="section-title">Ta collection <span class="more small">touche une carte</span></h2>
      <div class="grid-cards v2-grid">${g.ownedCards().map((c) => `<div class="v2-pick ${team.includes(c.id) ? 'in' : ''}">${cardWithBadges(g, c)}</div>`).join('')}</div>`;
  };
  root.addEventListener('click', (e) => { const t = e.target.closest('.tcg'); if (t) openCreature(app, t.dataset.id, { onChange: draw }); });
  draw();
  coach(app, 'v2-team', 'Ton équipe : <b>3 créatures au combat</b> et <b>2 en réserve</b>. Chaque carte a une <b>capacité</b> (icône en haut à gauche), son <b>attaque</b> et ses <b>PV</b>, et un <b>coût</b> (en haut à droite) : le total ne doit pas dépasser 15. Une équipe variée (un Protecteur, un Soigneur, des Attaquants…) va plus loin qu’une équipe de cartes rares.', { title: 'Compose ton équipe' });
  return draw;
}

// ——— Écran Descente ——————————————————————————————————————————————————
export function descentScreen(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.v2d ||= { cursed: false });
  let battle = null, playing = false;

  const teamStrip = (ids, run) => `<div class="v2-strip">${ids.map((id, i) => { const c = cat.get(id); const m = run?.team.find((x) => x.id === id); return `<span class="v2-mini ${i >= TEAM.active ? 'res' : ''} ${m?.fallen ? 'fallen' : ''}" style="--rc:${RARITY[c.rarity].color}"><img alt="" src="${artUrl(c, { lite: true })}">${m ? `<span class="hpbar"><i style="width:${(m.hp / m.maxHp) * 100}%"></i></span>` : `<small>${i < TEAM.active ? '' : 'Rés.'}</small>`}</span>`; }).join('')}</div>`;
  const ruleHTML = (r) => `<section class="panel dc-rule" style="--rf:${r.faction ? cat.faction[r.faction].colors.secondary : 'var(--gold)'}"><span class="dc-rule-ic">${r.faction ? sigil(r.faction) : icon('star')}</span><span><span class="small muted">Règle du jour</span><b>${esc(r.name)}</b><span class="small">${esc(r.desc)}</span></span></section>`;
  const chestChip = (c) => (c ? `<span class="v2-chest-chip" style="--cc:${CHESTS[c].color}">${icon('lock')} ${esc(CHESTS[c].name)}</span>` : '<span class="v2-chest-chip none">aucun coffre</span>');

  function lobby() {
    const d = g.descent(), torches = g.torchesLeft(), last = ui.last;
    root.innerHTML = `<header class="screen-head"><h1>La Descente</h1><p class="muted">${d.best ? `Record : étage ${d.best}` : 'Descends, survis, rapporte un coffre.'}</p></header>
      ${last ? `<section class="panel ornate dc-sum ${last.wiped ? 'lost' : 'won'}"><h2>${last.wiped ? 'L’équipe est tombée' : 'Retour à la surface'}</h2><p class="dc-depth">Étage <b>${last.floor}</b></p>
        <p class="small">${last.chests.length ? last.chests.map((c) => `<span class="v2-chest-chip" style="--cc:${CHESTS[c].color}">${icon('lock')} ${esc(CHESTS[c].name)}</span>`).join(' ') : 'Aucun coffre cette fois.'} ${last.shards ? `· ${icon('crystal')} ${fmt(last.shards)} éclats` : ''}</p>
        ${last.chests.length ? `<a class="btn gold block" href="#/coffres">${icon('lock')}Ouvrir mes coffres</a>` : ''}<button class="btn small ghost" data-act="dismiss">OK</button></section>` : ''}
      ${ruleHTML(g.rule())}
      <section class="panel dc-go">
        <div class="dc-go-top"><span class="dc-torches">${Array.from({ length: DESCENT.torches }, (_, i) => `<i class="${i < torches ? 'on' : ''}">${icon('flame')}</i>`).join('')}</span><span class="small muted">${torches ? `${torches} expédition${torches > 1 ? 's' : ''} avec coffre aujourd’hui` : 'Expéditions du jour faites : tu peux rejouer, sans coffre'}</span></div>
        ${teamStrip(g.s.team)}
        <p class="small muted center">Ultime : <b>${esc(g.ultimate().name)}</b> · budget ${g.teamCost()} / ${BUDGET}</p>
        <a class="btn small ghost block" href="#/equipe">${icon('user')}Modifier l’équipe</a>
        <button class="btn ${ui.cursed && torches ? 'danger' : 'primary'} block big-cta" data-act="start" ${g.s.team.length >= TEAM.active ? '' : 'disabled'}>${icon('flame')}${torches ? 'Descendre' : 'Descendre (sans coffre)'}</button>
        ${torches ? `<div class="dc-curse-row ${ui.cursed ? 'on' : ''}"><span><b>${icon('skull')} Descente maudite</b><span class="small muted">coffre d’une qualité au-dessus, mais rien si l’équipe tombe</span></span><button class="switch" role="switch" aria-checked="${ui.cursed}" data-act="curse" aria-label="Descente maudite"><i></i></button></div>` : ''}
      </section>
      <details class="panel dc-fold"><summary>${icon('info')} Comment ça marche</summary><ul class="small">
        <li>Tes cartes sont des créatures liées à ton livre : elles combattent pour toi. 3 au combat, 2 en réserve.</li>
        <li>Les créatures de l’Abysse sont des versions <b>corrompues</b>. Posséder la carte d’une créature donne +10 % de dégâts contre elle.</li>
        <li>À chaque étage, deux portes. Tous les 5 étages, un gardien garde un coffre.</li>
        <li>Remonte quand tu veux : la profondeur atteinte décide du coffre (1–4 bois, 5–9 fer, 10–14 or, 15+ abyssal).</li></ul></details>`;
    root.querySelectorAll('[data-act="dismiss"]').forEach((b) => b.addEventListener('click', () => { ui.last = null; lobby(); }));
  }
  const runHead = (run) => `<header class="dc-run-head"><div><span class="small muted">${run.free ? 'Descente libre (sans coffre)' : run.cursed ? `<span class="dc-bad">${icon('skull')} Maudite</span>` : 'La Descente'}</span><h1>Étage ${run.floor}</h1></div><div class="dc-loot"><span>${icon('crystal')}${fmt(run.shards)}</span>${run.chests.length ? `<span>${icon('lock')}${run.chests.length}</span>` : ''}</div></header>
    ${teamStrip(run.team.map((m) => m.id), run)}
    <p class="dc-rule-line small">${icon('star')} <b>${esc(g.rule(run.day).name)}</b> · ${esc(g.rule(run.day).desc)}</p>`;
  function doorsView(run) {
    const doors = g.doors();
    root.innerHTML = `${runHead(run)}<p class="dc-prompt">${doors.length > 1 ? 'Deux passages s’ouvrent devant toi.' : 'Un gardien barre la route.'}</p>
      <div class="dc-doors">${doors.map((r) => `<button class="dc-door r-${r}" data-act="door" data-r="${r}"><span class="dc-door-ic">${icon(ROOM_ICON[r])}</span><b>${ROOMS[r].name}</b><span class="small">${r === 'boss' ? 'Le gardien de l’étage. Victoire : un coffre.' : ROOMS[r].desc}</span></button>`).join('')}</div>
      ${run.cleared ? `<button class="btn ghost block" data-act="leave">${icon('back')}Remonter</button>` : ''}`;
  }
  function clearedView(run, extra = '') {
    const now = g.chestNow(run), next = run.free ? null : chestForDepth(run.floor + 1);
    root.innerHTML = `${runHead(run)}${extra}
      <section class="panel dc-risk"><div><span class="small muted">Si tu remontes</span>${chestChip(now)}<span class="small muted">${icon('crystal')} ${fmt(run.shards)} éclats</span></div>
        <div><span class="small muted">Étage ${run.floor + 1}${(run.floor + 1) % 5 === 0 ? ' · gardien' : ''}</span>${run.free ? '<span class="small">Descente libre</span>' : `<span class="small">${next !== chestForDepth(run.floor) ? `Coffre amélioré : ${esc(CHESTS[next].name)}` : 'Même coffre'}</span>`}<span class="small muted">Si l’équipe tombe : ${run.cursed ? 'tout est perdu' : 'coffre d’une qualité en dessous'}</span></div></section>
      <div class="dc-choice"><button class="btn primary block big-cta" data-act="next">${icon('next')}Descendre à l’étage ${run.floor + 1}</button><button class="btn block" data-act="leave">${icon('back')}Remonter avec le coffre</button></div>`;
  }
  function altarView(run) {
    root.innerHTML = `${runHead(run)}<p class="dc-prompt">L’autel murmure. Choisis une bénédiction.</p>
      <div class="dc-altar">${run.altar.map((k) => `<button class="dc-bl" data-act="bless" data-k="${k}"><span>${icon('star')}</span><b>${esc(BLESS2[k].name)}</b><span class="small">${esc(BLESS2[k].desc)}</span></button>`).join('')}</div>`;
  }
  function battleView(run) {
    if (battle) return;
    playing = true;
    const title = `Étage ${run.floor}${run.room === 'boss' ? ' · Gardien' : run.room === 'elite' ? ' · Élite' : ''}`;
    battle = runDuel(app, root, { title, onEnd: () => {
      battle = null; playing = false;
      let out;
      try { out = g.finishBattle(); } catch (e) { toast(esc(e.message), { kind: 'error' }); return render(); }
      app.chrome();
      if (out.lost) { app.sfx.error(); ui.last = out.summary; render(); }
      else {
        app.sfx.reveal(out.room === 'boss' ? 'M' : 'R');
        const disc = out.discovered.map((id) => cat.get(id)?.name).filter(Boolean);
        clearedView(g.descent().run, `<p class="dc-event dc-win">${icon('swords')} <b>Victoire !</b> +${fmt(out.shards)} éclats${out.chest ? ` · <b>${esc(CHESTS[out.chest].name)}</b> gagné !` : ''}${disc.length ? `<br><span class="small">${icon('book')} Première rencontre : ${disc.map(esc).join(', ')}</span>` : ''}</p>`);
      }
      window.scrollTo(0, 0);
    } });
  }
  function render() {
    const run = g.descent().run;
    if (!run) return lobby();
    if (run.phase === 'doors') return doorsView(run);
    if (run.phase === 'altar') return altarView(run);
    if (run.phase === 'battle') return battleView(run);
    return clearedView(run);
  }
  bindActions(root, {
    curse() { ui.cursed = !ui.cursed; render(); },
    start() { try { g.startRun({ cursed: ui.cursed }); ui.last = null; app.sfx.tear(); render(); window.scrollTo(0, 0); coach(app, 'v2-doors', 'Choisis une porte à chaque étage. Plus tu descends, plus le <b>coffre</b> que tu rapporteras est beau. Tu peux <b>remonter</b> après chaque étage pour garder ton coffre.', { title: 'La Descente' }); } catch (e) { toast(esc(e.message), { kind: 'error' }); } },
    door(el) {
      if (playing) return;
      let out;
      try { out = g.chooseDoor(el.dataset.r); } catch (e) { toast(esc(e.message), { kind: 'error' }); return; }
      if (out.battle) { window.scrollTo(0, 0); return battleView(g.descent().run); }
      if (out.altar) return render();
      app.sfx.coin();
      clearedView(g.descent().run, el.dataset.r === 'rest' ? `<p class="dc-event">${icon('heart')} L’eau de la source soigne tes créatures.</p>` : el.dataset.r === 'treasure' ? `<p class="dc-event">${icon('crystal')} +${fmt(out.shards)} éclats</p>` : '');
    },
    bless(el) { try { g.chooseBlessing(el.dataset.k); app.sfx.discover(); render(); } catch (e) { toast(esc(e.message), { kind: 'error' }); } },
    next() { try { g.nextFloor(); app.sfx.swipe(); render(); window.scrollTo(0, 0); } catch (e) { toast(esc(e.message), { kind: 'error' }); } },
    async leave() {
      if (!(await confirmBox('Remonter maintenant avec ton coffre ?', { ok: 'Remonter' }))) return;
      ui.last = g.endRun(false); app.sfx.coin(); app.chrome(); render(); window.scrollTo(0, 0);
    },
  });
  render();
  return { refresh: () => { if (!playing) render(); }, stop: () => { if (battle) { battle.stop(); battle = null; } } };
}
