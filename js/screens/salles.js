// Les Salles Oubliées : écran du plateau tactique (table de jeu, figurines, cartes d'action, dés).
// Toute la règle est dans core/dungeon.js ; ici on affiche, on anime et on relaie les touchers.
import { RARITY } from '../config.js';
import { artUrl } from '../art/assets.js';
import { icon, picon } from '../ui/icons.js';
import { esc, fmt, toast, openSheet, confirmBox, bindActions } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { tuto } from '../ui/tutos.js';
import { chestSVG } from '../ui/chest.js';
import { CHESTS } from '../core/descent.js';
import { MAX_LEVEL } from '../core/army.js';
import { Game } from '../core/game.js';
import * as DG from '../core/dungeon.js';
import { POWERS, powerOf } from '../core/powers.js';

const SL = 'assets/salles/';
// Pouvoirs qui ont déjà leur icône peinte (assets/salles/pw/<clé>.webp) ; les autres gardent l'icône générique
const PW_ART = { has: (k) => !!POWERS[k] }; // les 38 pouvoirs ont leur icône peinte
const cardIcon = (k, def) => (PW_ART.has(k) ? `<img class="sl-pw" alt="" src="${SL}pw/${k}.webp">` : icon(def.icon || 'sparkle'));
const HOW = [
  ['salles', '#C9A24E', 'Tes 3 figurines', 'Choisis 3 créatures : chacune a son propre pouvoir (un ange soigne, un dragon crache le feu…). Leur niveau compte.'],
  ['act-attack', '#E0485E', '2 actions par tour', 'Touche une figurine, puis une case jaune pour la déplacer, un ennemi entouré de rouge pour l’attaquer, ou une carte.'],
  ['luck', '#F2C14E', 'Les dés', 'Chaque attaque lance un D20 : 1 = échec critique, 20 = critique (dégâts doublés). Certains coups ajoutent un D6.'],
  ['cards', '#9C7BFF', 'Les cartes', 'Chaque figurine pioche une carte par tour (3 en main au plus). Les coffres donnent des objets, rangés dans le sac.'],
  ['danger', '#FF8A3A', 'Les ennemis', 'Ils avancent et frappent à leur tour. Un portail fait venir un renfort tous les 3 tours : détruis-le vite.'],
  ['crown', '#7FD3FF', 'Les salles', 'Quand tout est mort, la porte s’ouvre (+40 % de PV). 3 salles, puis le gardien : un coffre si tu gagnes.'],
];
const ST_TXT = { poison: ['Poison', 'poison'], frozen: ['Gelée', 'frost'], shield: ['Bouclier', 'guard'], mark: ['Marquée', 'bad'], curse: ['Maudite', 'bad'], slow: ['Ralentie', 'bad'], armor: ['Carapace', 'guard'], armor2: ['Garde', 'guard'], taunt: ['Provocation', 'guard'], elusive: ['Insaisissable', 'buff'], regen: ['Régénération', 'buff'], lucky: ['Présage', 'buff'], buffT: ['Attaque +', 'buff'] };
const TIER_TXT = { crit: 'Critique !', success: 'Touché', miss: 'Raté', fumble: 'Échec critique', bonus: '' };

export default function sallesScreen(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.salles ||= { pick: null, diff: 'normal' });
  let st = g.sallesState();
  let sel = null, mode = null, busy = false, alive_ = true;
  const reduced = app.reduced();
  const T = (ms) => (reduced ? Math.min(ms, 40) : ms);
  const wait = (ms) => new Promise((r) => setTimeout(r, T(ms)));
  const $ = (q) => root.querySelector(q);
  const cardOf = (u) => (u.id ? cat.get(u.id) : null);
  const portrait = (u) => (u.portal ? `<img class="sl-pt" alt="" src="${SL}portal.webp">` : u.minion ? `<img class="sl-pt" alt="" src="${SL}goule.webp">` : `<img class="sl-pt" alt="" src="${artUrl(cardOf(u), { lite: true })}">`);

  // ——— Accueil : choisir 3 figurines et la difficulté ———
  function lobby() {
    document.body.classList.remove('battle-mode');
    setScene('descent');
    const s = g.s.salles;
    const team = g.team();
    const owned = Object.keys(g.s.collection).map((id) => cat.get(id)).filter(Boolean).sort((a, b) => (team.includes(b.id) - team.includes(a.id)) || g.cardLevel(b.id) - g.cardLevel(a.id) || a.name.localeCompare(b.name, 'fr'));
    if (!ui.pick || !ui.pick.every((id) => g.owns(id))) ui.pick = team.slice(0, 3);
    const picked = ui.pick;
    const tok = (c) => { const on = picked.includes(c.id); return `<button class="sl-pick ${on ? 'on' : ''}" data-act="pick" data-id="${c.id}" aria-pressed="${on}" style="--rc:${RARITY[c.rarity].color}"><span class="sl-pick-art"><img alt="" loading="lazy" src="${artUrl(c, { lite: true })}"></span><b>${esc(c.name)}</b><small>Niv. ${g.cardLevel(c.id)} · ${esc(powerName(c))}</small></button>`; };
    root.innerHTML = `<header class="screen-head ui-hero bn-salles"><h1>Les Salles Oubliées</h1><p class="muted">Un jeu de plateau : 3 figurines, 2 actions chacune, des cartes de pouvoir et des dés. Trois salles, puis le gardien.</p></header>
      ${s.last ? `<section class="panel sl-last ${s.last.won ? 'won' : 'lost'}"><b>${s.last.won ? 'Dernière partie : le gardien est tombé !' : 'Dernière partie : perdue'}</b><span class="small muted">${s.last.rooms} salle${s.last.rooms > 1 ? 's' : ''} nettoyée${s.last.rooms > 1 ? 's' : ''} · ${s.last.kills} ennemi${s.last.kills > 1 ? 's' : ''} · +${fmt(s.last.shards)} éclats${s.last.chest ? ` · ${esc(CHESTS[s.last.chest].name)}` : ''}</span></section>` : ''}
      <section class="panel"><h2 class="section-title">Tes 3 figurines <small class="muted">${picked.length}/3</small></h2>
        <p class="small muted">Touche une créature pour la prendre ou la retirer. Chacune a <b>son propre pouvoir</b> : choisis une équipe qui se complète.</p>
        <div class="sl-picks">${owned.map(tok).join('')}</div></section>
      <section class="panel"><h2 class="section-title">Difficulté</h2>
        <div class="seg" role="group" aria-label="Difficulté">${Object.entries(Game.SALLES_DIFF).map(([k, d]) => `<button class="seg-b" data-act="diff" data-v="${k}" aria-pressed="${ui.diff === k}">${d.name}</button>`).join('')}</div>
        <p class="small muted">${ui.diff === 'facile' ? 'Ennemis plus faibles, récompenses réduites (coffre de bois si tu gagnes).' : ui.diff === 'difficile' ? 'Ennemis bien plus forts, récompenses ×1,6 (coffre d’or si tu gagnes).' : 'Récompenses normales (coffre de fer si tu gagnes).'}</p>
        <button class="btn primary block big-cta dc-plq dc-plq-red" data-act="start" ${picked.length === 3 ? '' : 'disabled'}>${icon('p:salles')}Ouvrir les Salles</button>
        <p class="small muted center">Libre et sans limite. Tu peux quitter en cours de partie : elle t’attend.</p></section>
      <details class="panel dc-fold dc-how"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/help.webp"><span class="dc-sum-t">Comment ça marche</span></summary>
        <ol class="how-steps">${HOW.map(([ic, c, t, d], i) => `<li style="--hc:${c}"><span class="how-ic">${picon(ic)}<em>${i + 1}</em></span><span><b>${t}</b><span class="small">${d}</span></span></li>`).join('')}</ol></details>
      <p class="small muted center">Record : ${s.best || 0} salle${(s.best || 0) > 1 ? 's' : ''} · ${s.wins || 0} victoire${(s.wins || 0) > 1 ? 's' : ''} sur ${s.runs || 0} partie${(s.runs || 0) > 1 ? 's' : ''}</p>`;
  }
  const powerName = (c) => POWERS[powerOf(c, cat)]?.name || '';

  // ——— Plateau ———
  function board() {
    document.body.classList.add('battle-mode');
    setScene(null);
    root.innerHTML = `<div class="sl"><div class="sl-bg"></div>
      <header class="sl-top"><span class="sl-room"></span><span class="sl-msg"></span><span class="sl-btns"><button class="btn small ghost" data-d="help" aria-label="Aide">?</button><button class="btn small ghost" data-d="quit" aria-label="Pause">${icon('close')}</button></span></header>
      <div class="sl-board" style="--cols:8;--rows:9"><div class="sl-cells"></div><div class="sl-props"></div><div class="sl-tokens"></div><div class="sl-fx"></div></div>
      <div class="sl-panel"></div>
      <div class="sl-dice" hidden></div>
    </div>`;
    drawRoom();
    drawTokens();
    draw();
  }
  function drawRoom() {
    const cells = $('.sl-cells'), props = $('.sl-props');
    const W = st.grid[0].length, H = st.grid.length;
    $('.sl-board').style.setProperty('--cols', W); $('.sl-board').style.setProperty('--rows', H);
    let h = '', p = '';
    st.grid.forEach((row, y) => [...row].forEach((c, x) => {
      const pos = `left:${(x / W) * 100}%;top:${(y / H) * 100}%`;
      h += `<div class="sl-c ${c === '#' ? 'wall' : 'floor'}" data-x="${x}" data-y="${y}" style="${pos}"></div>`;
      if (c === 'x') p += `<img class="sl-prop pillar" alt="" src="${SL}pillar.webp" style="${pos}">`;
      if (c === 'D') p += `<img class="sl-prop door" data-door alt="" src="${SL}door-${st.doorOpen ? 'open' : 'closed'}.webp" style="${pos}">`;
    }));
    for (const ch of st.chests) p += `<img class="sl-prop chest" data-chest="${ch.x},${ch.y}" alt="" src="${SL}chest-${ch.open ? 'open' : 'closed'}.webp" style="left:${(ch.x / W) * 100}%;top:${(ch.y / H) * 100}%">`;
    cells.innerHTML = h; props.innerHTML = p;
    $('.sl-tokens').innerHTML = '';
    drawTraps();
  }
  function drawTraps() {
    const W = st.grid[0].length, H = st.grid.length;
    root.querySelectorAll('.sl-prop.trap').forEach((e) => e.remove());
    for (const t of st.traps) $('.sl-props').insertAdjacentHTML('beforeend', `<img class="sl-prop trap" alt="" src="${SL}trap.webp" style="left:${(t.x / W) * 100}%;top:${(t.y / H) * 100}%">`);
  }
  const tokEl = (uid) => root.querySelector(`.sl-tok[data-uid="${uid}"]`);
  function tokenHTML(u) {
    const base = u.portal ? '' : `<img class="sl-base" alt="" src="${SL}base-${u.side === 'ally' ? 'ally' : u.boss ? 'boss' : u.elite ? 'elite' : 'enemy'}.webp">`;
    return `${base}${portrait(u)}<span class="sl-hp"><i style="width:${Math.max(0, (u.hp / u.maxHp) * 100)}%"></i></span><span class="sl-badges"></span><span class="sl-acts"></span>`;
  }
  function drawTokens() {
    const layer = $('.sl-tokens');
    const W = st.grid[0].length, H = st.grid.length;
    const seen = new Set();
    for (const u of Object.values(st.units)) {
      if (u.hp <= 0) continue;
      seen.add(u.uid);
      let el = tokEl(u.uid);
      if (!el) { el = document.createElement('div'); el.className = `sl-tok ${u.side} ${u.boss ? 'boss' : ''} ${u.portal ? 'portal' : ''} ${u.minion ? 'minion' : ''}`; el.dataset.uid = u.uid; el.innerHTML = tokenHTML(u); layer.appendChild(el); }
      el.style.left = `${(u.x / W) * 100}%`; el.style.top = `${(u.y / H) * 100}%`;
      el.querySelector('.sl-hp i').style.width = `${Math.max(0, (u.hp / u.maxHp) * 100)}%`;
      el.querySelector('.sl-hp').classList.toggle('low', u.hp <= u.maxHp * 0.3);
      el.querySelector('.sl-badges').innerHTML = Object.keys(u.st).filter((k) => ST_TXT[k] && u.st[k]).slice(0, 3).map((k) => `<i class="sb ${ST_TXT[k][1]}" title="${ST_TXT[k][0]}">${k === 'shield' ? u.st.shield : k === 'poison' ? '☠' : k === 'frozen' ? '❄' : k === 'mark' || k === 'curse' ? '◎' : k === 'elusive' ? '◌' : '●'}</i>`).join('');
      el.querySelector('.sl-acts').innerHTML = u.side === 'ally' && !u.minion && st.turn === 'ally' ? Array.from({ length: DG.ACTS }, (_, i) => `<i class="${i < u.acts ? 'on' : ''}"></i>`).join('') : '';
      el.classList.toggle('sel', sel === u.uid);
      el.classList.toggle('done', u.side === 'ally' && u.acts === 0 && st.turn === 'ally');
    }
    root.querySelectorAll('.sl-tok').forEach((e) => { if (!seen.has(e.dataset.uid)) e.remove(); });
  }
  // Surbrillances : cases atteignables, cibles possibles
  function drawHints() {
    root.querySelectorAll('.sl-c.can-move, .sl-c.can-target').forEach((e) => e.classList.remove('can-move', 'can-target'));
    root.querySelectorAll('.sl-tok.can-hit, .sl-tok.can-target').forEach((e) => e.classList.remove('can-hit', 'can-target'));
    if (!sel || st.turn !== 'ally' || st.phase !== 'play') return;
    const u = st.units[sel]; if (!u || u.acts <= 0) return;
    if (mode) {
      for (const t of DG.targets(st, sel, mode.k)) { if (t.uid) tokEl(t.uid)?.classList.add('can-target'); else root.querySelector(`.sl-c[data-x="${t.x}"][data-y="${t.y}"]`)?.classList.add('can-target'); }
      return;
    }
    for (const c of DG.reach(st, u)) root.querySelector(`.sl-c[data-x="${c.x}"][data-y="${c.y}"]`)?.classList.add('can-move');
    for (const t of DG.attackTargets(st, sel)) tokEl(t.uid)?.classList.add('can-hit');
  }
  function draw() {
    if (!alive_) return;
    $('.sl-room').innerHTML = st.room === DG.ROOMS ? `${icon('skull')} Le gardien` : `Salle ${st.room} / ${DG.ROOMS - 1}`;
    drawTokens(); drawHints();
    const panel = $('.sl-panel');
    if (st.phase === 'cleared') { panel.innerHTML = `<div class="sl-clear"><b>${icon('check')} Salle nettoyée</b><span class="small muted">${st.room < DG.ROOMS ? 'La porte s’ouvre. Tes figurines récupèrent 40 % de leurs PV.' : 'Le gardien est tombé !'}</span><button class="btn primary block dc-plq dc-plq-red" data-d="next">${st.room < DG.ROOMS ? (st.room === DG.ROOMS - 1 ? 'Affronter le gardien' : `Passer la porte · salle ${st.room + 1}`) : 'Remonter avec le butin'}</button></div>`; return; }
    if (st.phase !== 'play') { panel.innerHTML = ''; return; }
    if (st.turn !== 'ally') { panel.innerHTML = '<p class="sl-wait small muted center">Les ennemis jouent…</p>'; return; }
    const u = sel && st.units[sel];
    const chest = u && DG.chestNear(st, sel);
    const cards = u ? DG.playable(st, sel) : [];
    const hand = u ? `<div class="sl-hand">${cards.map((c, i) => `<button class="sl-card ${c.from} ${c.ok ? 'ok' : ''} ${mode && mode.k === c.k && mode.i === i ? 'on' : ''}" data-d="card" data-k="${c.k}" data-i="${i}" ${c.ok ? '' : 'disabled'}><span class="sl-card-ic">${cardIcon(c.k, c.def)}</span><b>${esc(c.def.name)}</b><small>${c.def.acts ? `${c.def.acts} action${c.def.acts > 1 ? 's' : ''}` : 'gratuit'}${c.def.range > 1 ? ` · ${c.def.range} cases` : ''}</small></button>`).join('')}${cards.length ? '' : '<span class="small muted">Aucune carte en main.</span>'}</div>` : '';
    panel.innerHTML = `<div class="sl-sel">${u ? `<span class="sl-sel-name"><b>${esc(u.name)}</b><span class="small">${u.hp}/${u.maxHp} PV · ATQ ${u.atk} · ${u.acts} action${u.acts > 1 ? 's' : ''}${u.range > 1 ? ' · tir à ' + u.range : ''}</span></span>` : `<span class="small muted">${alive(st).some((x) => x.acts > 0) ? 'Touche une de tes figurines.' : 'Plus d’action : termine le tour.'}</span>`}
        <span class="sl-sel-btns">${chest && u.acts > 0 ? `<button class="btn small gold" data-d="chest">${icon('p:chest')}Coffre</button>` : ''}${mode ? `<button class="btn small ghost" data-d="cancel">Annuler</button>` : ''}<button class="btn small primary dc-plq dc-plq-red sl-end" data-d="end">Fin du tour</button></span></div>
      ${mode ? `<p class="small sl-hint">${esc(DG.cardDef(mode.k).desc)}<br><b>Choisis la cible.</b></p>` : u && u.acts > 0 ? `<p class="small muted sl-hint">${mode ? '' : 'Touche une case pour te déplacer, un ennemi pour attaquer, ou une carte.'}</p>` : ''}
      ${hand}`;
    if (st.bag.length) panel.insertAdjacentHTML('beforeend', `<p class="small muted sl-bag">${icon('p:chest')} Sac : ${st.bag.map((k) => esc(DG.ITEMS[k].name)).join(', ')}</p>`);
  }
  const alive = (s) => DG.alive(s, 'ally').filter((x) => !x.minion);
  const say = (m) => { const e = $('.sl-msg'); if (e) e.innerHTML = m; };
  const float = (uid, txt, cls) => { const t = tokEl(uid); if (!t) return; const f = document.createElement('span'); f.className = `dv-float ${cls}`; f.textContent = txt; t.appendChild(f); setTimeout(() => f.remove(), 900); };
  const flashCell = (x, y, r = 0) => { const W = st.grid[0].length, H = st.grid.length; for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) { const e = root.querySelector(`.sl-c[data-x="${xx}"][data-y="${yy}"]`); if (e) { e.classList.add('aoe'); setTimeout(() => e.classList.remove('aoe'), 600); } } };
  async function showDice(e) {
    const d = $('.sl-dice'); if (!d) return;
    const who = st.units[e.u];
    d.hidden = false;
    d.innerHTML = `<img alt="" src="${SL}d${e.d}.webp"><b>${e.n}</b><span class="sl-dice-t ${e.tier}">${e.d === 6 ? `+${e.n} dégâts` : TIER_TXT[e.tier] || ''}${e.d === 20 && e.bonus ? `<small> (+${e.bonus})</small>` : ''}</span><small>${who ? esc(who.name) : ''}</small>`;
    d.classList.remove('roll'); void d.offsetWidth; d.classList.add('roll');
    app.sfx.dice?.();
    await wait(520);
    if (e.tier === 'crit') app.sfx.crit?.(); else if (e.tier === 'fumble') app.sfx.fumble?.(); else if (e.tier === 'miss') app.sfx.miss?.();
    await wait(e.tier === 'crit' || e.tier === 'fumble' ? 500 : 300);
    d.hidden = true;
  }
  // Rejoue la liste d'événements du moteur, avec les animations
  async function play(ev) {
    busy = true;
    for (const e of ev) {
      if (!alive_) return;
      switch (e.t) {
        case 'move': { drawTokens(); await wait(260); break; }
        case 'dice': await showDice(e); break;
        case 'attack': { const a = tokEl(e.a); a?.classList.add('bump'); setTimeout(() => a?.classList.remove('bump'), 300); app.sfx.slash?.(); await wait(120); break; }
        case 'dmg': { drawTokens(); float(e.u, `−${e.d}`, 'dmg'); const t = tokEl(e.u); t?.classList.add('hit'); setTimeout(() => t?.classList.remove('hit'), 350); app.sfx.hit?.(); await wait(320); break; }
        case 'heal': { drawTokens(); float(e.u, `+${e.d}`, 'heal'); app.sfx.heal?.(); await wait(260); break; }
        case 'miss': { float(e.u, e.fumble ? 'Échec !' : 'Raté', 'dodge'); await wait(260); break; }
        case 'status': { float(e.u, e.s, 'info'); await wait(220); break; }
        case 'death': { const t = tokEl(e.u); t?.classList.add('dead'); app.sfx.death?.(); await wait(420); drawTokens(); break; }
        case 'spawn': { drawTokens(); const t = tokEl(e.u); t?.classList.add('spawn'); app.sfx.summon?.(); await wait(380); break; }
        case 'push': case 'swap': { drawTokens(); await wait(240); break; }
        case 'card': { say(`${esc(st.units[e.u]?.name || '')} : <b>${esc(DG.cardDef(e.k).name)}</b>`); app.sfx.skill?.(); await wait(200); break; }
        case 'ecard': { say(`${esc(st.units[e.u]?.name || 'Ennemi')} utilise <b>${esc(DG.cardDef(e.k)?.name || e.k)}</b>`); app.sfx.boss?.(); await wait(450); break; }
        case 'aoe': { flashCell(e.x, e.y, e.r); await wait(200); break; }
        case 'draw': break;
        case 'chest': { const im = root.querySelector(`.sl-prop[data-chest="${e.x},${e.y}"]`); if (im) im.src = `${SL}chest-open.webp`; app.sfx.coin?.(); toast(`Dans le coffre : <b>${esc(DG.ITEMS[e.k].name)}</b>. ${esc(DG.ITEMS[e.k].desc)}`, { kind: 'success', icon: 'chest' }); await wait(300); break; }
        case 'trapset': { drawTraps(); await wait(200); break; }
        case 'trap': { drawTraps(); float(e.u, 'Piège !', 'dmg'); await wait(260); break; }
        case 'cleared': { const d = root.querySelector('[data-door]'); if (d) d.src = `${SL}door-open.webp`; app.sfx.achievement?.(); say(`<b>Salle ${e.n} nettoyée</b>`); await wait(500); break; }
        case 'room': { drawRoom(); drawTokens(); banner(e.boss ? `${icon('skull')} Le gardien` : `Salle ${e.n}`); app.sfx.enter?.(); await wait(900); break; }
        case 'won': case 'lost': break;
        default: break;
      }
    }
    busy = false;
  }
  function banner(html) { const b = document.createElement('div'); b.className = 'cb-banner sl-banner'; b.innerHTML = html; $('.sl-board')?.appendChild(b); setTimeout(() => b.remove(), T(1100)); }

  async function run(fn) {
    if (busy || !st || !alive_) return;
    let ev;
    try { ev = fn(); } catch (err) { app.sfx.error(); toast(esc(err.message), { kind: 'error' }); return; }
    if (!ev || !ev.length) return;
    g.persist();
    await play(ev);
    if (!alive_) return;
    if (['won', 'lost'].includes(st.phase)) return finish();
    if (st.turn === 'ally' && st.phase === 'play') { if (!sel || !st.units[sel] || st.units[sel].acts <= 0) sel = nextFigure(); }
    mode = null;
    draw();
  }
  const nextFigure = () => (alive(st).find((u) => u.acts > 0) || alive(st)[0] || { uid: null }).uid;

  async function finish() {
    const won = st.phase === 'won';
    app.pendingProgress = [];
    let r;
    try { r = g.sallesFinish(); } catch (err) { app.pendingProgress = null; toast(esc(err.message), { kind: 'error' }); return; }
    (won ? app.sfx.victory : app.sfx.defeat)?.();
    app.chrome?.();
    st = null;
    const sh = openSheet(`<div class="sl-end ${won ? 'won' : 'lost'}">
      <h2>${won ? 'Le gardien est tombé !' : 'Les Salles se referment'}</h2>
      <p class="small">${r.rooms} salle${r.rooms > 1 ? 's' : ''} nettoyée${r.rooms > 1 ? 's' : ''} · ${r.kills} ennemi${r.kills > 1 ? 's' : ''} vaincu${r.kills > 1 ? 's' : ''} · ${r.crits} critique${r.crits > 1 ? 's' : ''}</p>
      <div class="dc-sum2-loot">${r.chest ? `<span class="dc-sum2-chest" style="--cc:${CHESTS[r.chest].color}">${chestSVG(r.chest)}<b>${esc(CHESTS[r.chest].name)}</b></span>` : ''}<span class="dc-sum2-shards">${icon('crystal')}<b>+${fmt(r.shards)}</b><small>éclats</small></span></div>
      <button class="btn primary block" data-e="ok">Continuer</button></div>`, { label: 'Fin de partie', onClose: () => { if (alive_) lobby(); } });
    sh.body.querySelector('[data-e="ok"]').addEventListener('click', () => sh.close());
    app.flushProgress();
  }

  // ——— Touchers ———
  root.addEventListener('click', async (e) => {
    if (!alive_) return;
    const d = e.target.closest('[data-d]');
    if (d) {
      const k = d.dataset.d;
      if (k === 'help') return tuto(app, 'salles', { force: true });
      if (k === 'quit') return pause();
      if (busy || !st) return;
      if (k === 'end') { sel = null; mode = null; return run(() => DG.endTurn(st, cat)); }
      if (k === 'next') return run(() => DG.nextRoomAction(st, cat));
      if (k === 'chest' && sel) return run(() => DG.openChest(st, sel));
      if (k === 'cancel') { mode = null; return draw(); }
      if (k === 'card' && sel) {
        const key = d.dataset.k, def = DG.cardDef(key);
        const opts = DG.targets(st, sel, key);
        if (opts.length === 1 && opts[0].uid === sel) return run(() => DG.play(st, sel, key, { uid: sel }));
        mode = { k: key, i: +d.dataset.i, def }; app.sfx.tap?.(); return draw();
      }
      return;
    }
    if (busy || !st || st.turn !== 'ally' || st.phase !== 'play') return;
    const tok = e.target.closest('.sl-tok');
    if (tok) {
      const u = st.units[tok.dataset.uid]; if (!u) return;
      if (mode) { if (tok.classList.contains('can-target')) return run(() => DG.play(st, sel, mode.k, { uid: u.uid })); mode = null; return draw(); }
      if (u.side === 'ally' && !u.minion) { sel = u.uid; app.sfx.tap?.(); return draw(); }
      if (u.side === 'enemy' && sel && tok.classList.contains('can-hit')) return run(() => DG.attack(st, sel, u.uid));
      if (u.side === 'enemy') return info(u);
      return;
    }
    const cell = e.target.closest('.sl-c');
    if (cell && sel) {
      const x = +cell.dataset.x, y = +cell.dataset.y;
      if (mode) { if (cell.classList.contains('can-target')) return run(() => DG.play(st, sel, mode.k, { x, y })); mode = null; return draw(); }
      if (cell.classList.contains('can-move')) return run(() => DG.move(st, sel, x, y));
    }
  });
  function info(u) {
    const pw = u.power && POWERS[u.power];
    openSheet(`<div class="sl-info"><h2>${esc(u.name)}</h2><p class="small muted">${u.boss ? 'Gardien' : u.elite ? 'Élite' : u.portal ? 'Portail : un renfort tous les 3 tours tant qu’il tient' : 'Ennemi'}${u.id ? ` · ${esc(RARITY[u.rarity].name)}` : ''}</p>
      <dl class="facts"><div><dt>PV</dt><dd>${u.hp} / ${u.maxHp}</dd></div><div><dt>Attaque</dt><dd>${u.atk}</dd></div><div><dt>Défense</dt><dd>${u.def} <small class="muted">(il faut ${6 + u.def} ou plus au D20)</small></dd></div><div><dt>Déplacement</dt><dd>${u.move} case${u.move > 1 ? 's' : ''}</dd></div></dl>
      ${pw ? `<p class="small"><b>${esc(pw.name)}</b> · ${esc(pw.desc)}</p>` : ''}</div>`, { label: u.name });
  }
  async function pause() {
    const sh = openSheet(`<div class="cb-pause"><h2>${icon('p:salles')} Pause</h2>
      <button class="btn primary block" data-p="pause">Mettre en pause</button><p class="small muted">La partie t’attend dans l’onglet Salles, exactement là où tu l’as laissée.</p>
      <button class="btn ghost block cb-abandon" data-p="abandon">${icon('p:abandon')}Abandonner la partie</button><p class="small muted">Tu gardes les éclats des salles déjà nettoyées.</p>
      <button class="btn ghost block" data-p="back">Reprendre</button></div>`, { label: 'Pause' });
    sh.body.addEventListener('click', async (ev) => {
      const p = ev.target.closest('[data-p]')?.dataset.p; if (!p) return;
      sh.close();
      if (p === 'pause') { toast('Partie en pause : reprends-la depuis l’onglet Salles.', { icon: 'swords' }); app.go('descente'); }
      if (p === 'abandon') { if (!(await confirmBox('Abandonner cette partie ? Elle compte comme perdue.', { ok: 'Abandonner', danger: true }))) return; app.pendingProgress = []; g.sallesAbandon(); app.sfx.error(); app.chrome?.(); st = null; app.flushProgress(); lobby(); }
    });
  }
  bindActions(root, {
    pick(el) { const id = el.dataset.id; if (ui.pick.includes(id)) ui.pick = ui.pick.filter((x) => x !== id); else if (ui.pick.length < 3) ui.pick.push(id); else { toast('Tu as déjà 3 figurines : retires-en une d’abord.', { kind: 'error' }); return; } app.sfx.tap?.(); lobby(); },
    diff(el) { ui.diff = el.dataset.v; app.sfx.tap?.(); lobby(); },
    start() {
      try { st = g.sallesStart(ui.pick, ui.diff); } catch (err) { app.sfx.error(); toast(esc(err.message), { kind: 'error' }); return; }
      sel = nextFigure(); mode = null;
      board(); banner('Salle 1'); app.sfx.enter?.();
      tuto(app, 'salles');
    },
  });

  if (st) { sel = nextFigure(); board(); if (st.phase === 'won' || st.phase === 'lost') finish(); } else lobby();
  return () => { alive_ = false; document.body.classList.remove('battle-mode'); };
}
