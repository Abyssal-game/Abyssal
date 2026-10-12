// ABYSSAL : écran du combat tactique.
// Toucher une de tes créatures ouvre ses actions (Attaque, compétence, Défense, Permuter) ; on choisit
// ensuite la cible. Les compétences à risque montrent leurs chances et modificateurs avant le jet de D20.
// Tour ennemi : chaque ennemi exécute son intention ; les attaques dangereuses ouvrent la défense
// active (esquive dans l'or, parade parfaite au cœur blanc). Toute la logique est dans core/duel.js.
import { RARITY } from '../config.js';
import { artUrl } from '../art/assets.js';
import { icon, EMBLEM, sigil } from '../ui/icons.js';
import { esc, openSheet, toast } from '../ui/dom.js';
import { coach } from '../ui/coach.js';
import { tuto } from '../ui/tutos.js';
import { cardHTML } from '../ui/card.js';
import {
  BOSS_POWERS, INTENTS, SYNERGIES, PACK_BONUS, FERVOR_MAX, AP_MAX, front, reserve, actionsFor, actionTargets, act, preview,
  beginEnemyTurn, nextEnemy, enemyAct, endEnemyTurn, takeSkips, defenseWindow, threats, intentInfo, useUlt, ultReady, autoActs,
} from '../core/duel.js';
import { KITS, AI_FAMILIES, DICE_TIERS, WEAK_TO } from '../core/skills.js';
import { ULTS } from '../core/army.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Décor selon la profondeur (salle du Gardien à part) et effets illustrés (fond noir fondu en mode « écran »)
const bgOf = (run) => `assets/battle/bg-${run.room === 'boss' ? 'boss' : run.floor >= 15 ? 4 : run.floor >= 10 ? 3 : run.floor >= 5 ? 2 : 1}.webp`;
const FX = ['slash', 'impact', 'dodge', 'heal', 'venom', 'frost', 'seal', 'death'];
const fxUrl = (n) => `assets/fx/${n}.webp`;
const DANGER = ['', '!', '!!', '!!!'];

export function runDuel(app, root, { title, onEnd }) {
  const g = app.game, cat = app.catalog, run = g.descent().run, st = run.battle;
  const ui = (app.state.duel ||= { fast: false });
  const reduced = app.reduced();
  const T = (ms) => (reduced ? Math.min(ms, 80) : ui.fast ? ms * 0.45 : ms);
  const defMode = g.s.settings.defense || 'on'; // 'on' | 'easy' | 'off'
  let alive_ = true, busy = false, sel = null, mode = null; // mode : action en attente de cible
  let confirm = null; // { key, t } : compétence à risque en attente de confirmation
  const ctl = new AbortController();
  const ult = ULTS[st.ult];
  document.body.classList.add('battle-mode');

  FX.forEach((n) => { new Image().src = fxUrl(n); });
  root.innerHTML = `<div class="dv cb ${run.room} has-bg" style="--bgimg:url(${new URL(bgOf(run), document.baseURI).href})">
    <div class="dv-top"><b>${esc(title)}</b><span class="row gap">
      <button class="btn small ghost" data-d="help" aria-label="Règles du combat">?</button>
      <button class="btn small ghost ${ui.fast ? 'on' : ''}" data-d="fast" aria-label="Animations accélérées">×2</button>
      <button class="btn small ghost" data-d="quit" aria-label="Pause">${icon('close')}</button></span></div>
    <div class="dv-row enemy"></div>
    <div class="dv-mid"><span class="dv-msg" aria-live="polite"></span><span class="dv-resw"></span></div>
    <div class="cb-acts" hidden></div>
    <div class="dv-row ally"></div>
    <div class="dv-bar cb-bar">
      <button class="cb-res" data-d="ult" style="--uc:${ult.color}" aria-label="Actions, Ferveur et pouvoir d’équipe">
        <span class="cb-ap"><small>Actions</small><span class="cb-pips"></span></span>
        <span class="cb-fv"><small>Ferveur</small><span class="cb-gems"></span></span>
        <span class="cb-ult"><b>${esc(ult.name)}</b><small></small></span>
      </button>
      <button class="btn small ghost dv-auto" data-d="auto">Auto</button>
      <button class="btn primary dv-end" data-d="end">Fin du tour</button>
    </div>
  </div>`;
  const $ = (s) => root.querySelector(s);
  const enEl = $('.dv-row.enemy'), alEl = $('.dv-row.ally'), msgEl = $('.dv-msg'), actsEl = $('.cb-acts');
  const say = (h) => { msgEl.innerHTML = h; };
  const el = (uid) => root.querySelector(`[data-uid="${uid}"]`);

  // ——— Carte de combat ———
  let th = {}, tgtInfo = {};
  const statusHTML = (u) => [
    u.shield ? `<i class="sh" title="Bouclier : bloque un coup">${icon('shield')}</i>` : '',
    u.poison ? `<i class="po" title="Poison">${icon('skull')}${u.poison}</i>` : '',
    u.frozen || u.stunned ? '<i class="fr" title="Gelé : passe son tour">Gel</i>' : '',
    u.slow ? '<i class="fr" title="Ralenti : prochaine attaque -50 %">Lent</i>' : '',
    u.mark ? '<i class="mk" title="Marqué : +30 % de dégâts, +3 aux jets">Marque</i>' : '',
    u.defend ? `<i class="df" title="Défense : -50 % de dégâts">${icon('shield')}-50%</i>` : '',
    u.guardBy ? '<i class="gd" title="Protégé par un Rempart">Rempart</i>' : '',
    u.exposed ? '<i class="ex" title="Exposée : +25 % de dégâts subis">Exposée</i>' : '',
    u.boost ? `<i class="bo">+${u.boost}</i>` : '',
  ].join('');
  const intentChip = (u) => {
    const i = intentInfo(st, u);
    if (!i || st.turn !== 'ally') return '';
    const named = ['charge', 'channel', 'shield', 'heal', 'rally', 'frost'].includes(i.kind);
    const label = named ? esc(i.def.name) : `${i.dmg}${i.kind === 'blast' ? ' ×3' : ''}`;
    return `<span class="cb-int d${i.danger} k-${i.kind}" title="${esc(i.def.name)} : ${esc(i.def.desc)}">${icon(i.def.icon)}<b>${label}</b>${i.danger >= 2 ? `<em>${DANGER[i.danger]}</em>` : ''}</span>`;
  };
  const cardEl = (u) => {
    const c = cat.get(u.id), kit = KITS[u.role];
    const dead = u.hp <= 0, enemy = u.side === 'enemy';
    const ready = !enemy && st.turn === 'ally' && actionsFor(st, u.uid).some((a) => a.ok && a.key !== 'swap');
    const tgt = tgtInfo[u.uid];
    return `<button class="dv-c ${u.side} ${enemy ? 'corrupt' : ''} ${dead ? 'dead' : ''} ${ready ? 'ready' : ''} ${!enemy && st.turn === 'ally' && !ready ? 'spent' : ''} ${sel === u.uid ? 'sel' : ''} ${u.boss ? 'boss' : ''} ${u.broken ? 'broken' : ''} ${tgt ? 'target' : ''} ${u.brkMax ? 'has-brk' : ''} ${enemy && intentInfo(st, u) && st.turn === 'ally' ? 'has-int' : ''}" data-uid="${u.uid}" style="--rc:${RARITY[u.rarity].color}" aria-label="${esc(c.name)}, ${Math.max(0, u.hp)} PV">
      <span class="dv-art"><img alt="" src="${artUrl(c)}"></span>
      <span class="dv-kw" title="${esc(kit.name)}">${icon(kit.icon)}<em>${esc(kit.name)}</em></span>
      ${u.boss ? `<span class="dv-boss">${u.phase2 ? 'Furie' : 'Gardien'}</span>` : u.elite ? '<span class="dv-boss elite">Élite</span>' : ''}
      <span class="dv-nm">${esc(c.name)}</span>
      ${u.brkMax ? `<span class="cb-brk ${u.broken ? 'is-broken' : ''}" title="Brisure">${u.broken ? '<b>BRISÉ</b>' : `<i style="width:${(u.brk / u.brkMax) * 100}%"></i>`}</span>` : ''}
      <span class="dv-atk">${icon('swords')}<b>${u.atk + (u.boost || 0)}</b></span>
      <span class="dv-hp ${u.hp < u.maxHp ? 'hurt' : ''}">${icon('heart')}<b>${Math.max(0, u.hp)}</b></span>
      ${!enemy && th[u.uid] ? `<span class="dv-threat" title="Dégâts annoncés">${icon('skull')}-${th[u.uid]}</span>` : ''}
      ${enemy ? intentChip(u) : ''}
      ${tgt ? `<span class="cb-tgt">${tgt}</span>` : ''}
      <span class="dv-st">${statusHTML(u)}</span>
    </button>`;
  };
  const resHTML = (side) => {
    const r = reserve(st, side);
    if (!r.length) return '';
    if (side === 'enemy') return `<span class="dv-res" title="Réserve ennemie">+${r.length}</span>`;
    return `<span class="dv-resv cb-resv" aria-label="Réserve">${r.map((u) => `<img alt="" src="${artUrl(cat.get(u.id), { lite: true })}" title="${esc(cat.get(u.id).name)} : ${u.hp}/${u.maxHp} PV">`).join('')}<small>Réserve</small></span>`;
  };

  // ——— Barre d'actions de la créature choisie ———
  function actsHTML() {
    const u = sel && st.units[sel];
    if (!u || st.turn !== 'ally' || busy) return '';
    const kit = KITS[u.role];
    const list = actionsFor(st, u.uid);
    return `<div class="cb-head"><b>${esc(cat.get(u.id).name)}</b><span>${esc(kit.name)} · ${u.acts}/2 actions</span><button class="cb-x" data-d="desel" aria-label="Annuler la sélection">${icon('close')}</button></div>
      <div class="cb-grid">${list.map((a) => `<button class="cb-a ${a.ok ? '' : 'off'} ${mode?.key === a.key ? 'on' : ''} ${a.key === kit.skill.key ? 'sig' : ''}" data-a="${a.key}" aria-disabled="${!a.ok}">
        <span class="cb-ai">${icon(a.icon)}</span><b>${esc(a.name)}</b>
        <span class="cb-cost">${'<i class="pa"></i>'.repeat(a.ap) || '<i class="free">0</i>'}${a.fervor ? `<i class="fv">${a.fervor}</i>` : ''}${a.dice ? '<i class="d20">D20</i>' : ''}</span></button>`).join('')}</div>`;
  }
  function confirmHTML() {
    const { key, t } = confirm;
    const u = st.units[sel], tg = st.units[t], a = actionsFor(st, sel).find((x) => x.key === key);
    const r = preview(st, sel, key, t).roll;
    return `<div class="cb-confirm">
      <p><b>${esc(a.name)}</b> → ${esc(cat.get(tg.id).name)}</p>
      <div class="cb-odds"><span class="cb-pct" style="--p:${r.chance}"><b>${r.chance}%</b><small>réussite</small></span>
      <ul><li>Difficulté (DD) : <b>${r.dc}</b></li>${r.mods.length ? r.mods.map(([n, v]) => `<li class="mod">${esc(n)} <b>+${v}</b></li>`).join('') : '<li class="muted">Aucun bonus : marque, gel, Brisure ou faiblesse aident.</li>'}
      <li class="muted">1 : échec critique · 20 : critique</li></ul></div>
      <p class="small muted">${esc(KITS[u.role].skill.desc)}</p>
      <div class="row gap"><button class="btn ghost" data-d="cancel">Annuler</button><button class="btn primary" data-d="go">${icon('sparkle')}Lancer le dé</button></div>
    </div>`;
  }

  // ——— Tutoriel du premier combat : une main dorée montre quoi toucher ———
  let guide = !g.s.tips?.['cb-guide'];
  function guideStep() {
    root.querySelectorAll('.guide').forEach((x) => x.classList.remove('guide'));
    if (!guide || busy || st.turn !== 'ally' || st.over) return;
    let t = null, txt = '';
    const first = front(st, 'ally').find((u) => actionsFor(st, u.uid)[0].ok);
    if (mode?.key === 'attack') { t = el(actionTargets(st, sel, 'attack')[0]); txt = 'Touche un ennemi pour l’attaquer'; }
    else if (sel && actionsFor(st, sel)[0].ok) { t = actsEl.querySelector('[data-a="attack"]'); txt = `Choisis « ${esc(KITS[st.units[sel].role].basic.name)} » : son attaque (1 action)`; }
    else if (first) { t = el(first.uid); txt = `Touche une de tes créatures · ${st.ap} action${st.ap > 1 ? 's' : ''} restante${st.ap > 1 ? 's' : ''}`; }
    else { t = $('.dv-end'); txt = 'Plus d’actions : touche « Fin du tour »'; }
    if (t) { t.classList.add('guide'); say(`<b class="dc-good">${txt}</b>`); }
  }
  function endGuide() { if (!guide) return; guide = false; g.s.tips = { ...(g.s.tips || {}), 'cb-guide': Date.now() }; g.persist(); }

  // ——— Affichage ———
  function draw() {
    if (!alive_) return;
    th = threats(st);
    tgtInfo = {};
    if (mode && sel && st.turn === 'ally') {
      for (const id of actionTargets(st, sel, mode.key)) {
        const p = preview(st, sel, mode.key, id);
        tgtInfo[id] = p.roll ? `${p.roll.chance}%` : p.dmg ? `-${p.dmg}${p.weak ? ' ★' : ''}` : 'Cible';
      }
    }
    enEl.innerHTML = front(st, 'enemy').map(cardEl).join('') + resHTML('enemy');
    alEl.innerHTML = front(st, 'ally').map(cardEl).join('');
    $('.dv-resw').innerHTML = resHTML('ally');
    const showActs = !!sel && st.turn === 'ally' && !busy && !st.over;
    actsEl.hidden = !showActs;
    actsEl.innerHTML = showActs ? (confirm ? confirmHTML() : actsHTML()) : '';
    $('.cb-pips').innerHTML = Array.from({ length: Math.max(AP_MAX, st.ap) }, (_, i) => `<i class="${i < st.ap ? 'on' : ''}"></i>`).join('');
    $('.cb-gems').innerHTML = Array.from({ length: FERVOR_MAX }, (_, i) => `<i class="${i < st.fervor ? 'on' : ''}"></i>`).join('');
    const ready = ultReady(st);
    $('.cb-res').classList.toggle('ready', ready);
    $('.cb-ult small').textContent = ready ? 'Prêt ! Touche' : `${st.fervor}/${FERVOR_MAX}`;
    const canMore = st.ap > 0 && front(st, 'ally').some((u) => actionsFor(st, u.uid).some((a) => a.ok && a.key !== 'swap' && a.key !== 'defend'));
    $('.dv-end').classList.toggle('pulse', st.turn === 'ally' && !canMore && !busy);
    root.querySelectorAll('.dv-bar button').forEach((b) => { b.disabled = busy || st.turn !== 'ally' || !!st.over; });
    if (!busy && st.turn === 'ally' && !st.over) {
      if (confirm) say('Vérifie tes chances, puis lance le dé');
      else if (mode) say(`${esc(mode.name)} : choisis la cible <button class="cb-cancel" data-d="cancel">Annuler</button>`);
      else if (sel) say(`Choisis une action · <b>${st.ap}</b> action${st.ap > 1 ? 's' : ''} pour l’équipe`);
      else say(canMore ? `Touche une créature · <b>${st.ap}</b> action${st.ap > 1 ? 's' : ''} pour l’équipe` : 'Touche <b>Fin du tour</b>');
    } else if (st.turn === 'enemy' && !st.over) say('<b class="dc-bad">Tour des créatures corrompues</b>');
    guideStep();
  }

  // ——— Effets ———
  const shake = (big) => { if (reduced) return; const d = $('.dv'); d.classList.remove('shake', 'big'); void d.offsetWidth; d.classList.add('shake'); d.classList.toggle('big', !!big); };
  const sparks = (uid, cls = '') => {
    if (reduced) return;
    const t = el(uid); if (!t) return;
    const b = document.createElement('span'); b.className = `dv-burst ${cls}`;
    b.innerHTML = Array.from({ length: 10 }, (_, i) => `<i style="--a:${i * 36 + Math.round(Math.random() * 20)}deg;--r:${30 + Math.round(Math.random() * 26)}px"></i>`).join('');
    t.appendChild(b); setTimeout(() => b.remove(), 650);
  };
  const fxAt = (uid, name, { big = false, center = false } = {}) => {
    if (reduced) return;
    const box = $('.dv'); if (!box) return;
    const b = box.getBoundingClientRect();
    let x = b.width / 2, y = b.height / 2, size = b.width * 0.9;
    if (!center) { const t = el(uid); if (!t) return; const r = t.getBoundingClientRect(); x = r.left - b.left + r.width / 2; y = r.top - b.top + r.height / 2; size = r.width * (big ? 1.9 : 1.45); }
    const im = document.createElement('img');
    im.className = `dv-fx fx-${name}${center ? ' center' : ''}`; im.alt = ''; im.src = fxUrl(name);
    im.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px`;
    box.appendChild(im); setTimeout(() => im.remove(), center ? 1400 : 750);
  };
  const float = (uid, txt, cls) => { const t = el(uid); if (!t) return; const f = document.createElement('span'); f.className = `dv-float ${cls}`; f.textContent = txt; t.appendChild(f); setTimeout(() => f.remove(), 900); };
  const banner = (html, cls = '', ms = 900) => {
    const b = document.createElement('div'); b.className = `cb-banner ${cls}`; b.innerHTML = html;
    $('.dv').appendChild(b); setTimeout(() => b.remove(), T(ms) + 200);
  };
  const fervorPop = (d, why) => {
    const f = $('.cb-fv'); if (!f) return;
    const s = document.createElement('span'); s.className = 'cb-fpop'; s.textContent = `+${d}${why ? ` ${why}` : ''}`;
    f.appendChild(s); setTimeout(() => s.remove(), 1000);
  };

  // Jet de D20 animé (toucher pour passer)
  async function rollFx(e) {
    const tier = DICE_TIERS[e.tier];
    const box = document.createElement('div');
    box.className = `cb-dice t-${e.tier}`;
    box.innerHTML = `<div class="cb-d20"><svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,4 92,28 92,72 50,96 8,72 8,28" /><path d="M50 4 30 40h40zM30 40 8 72M70 40l22 32M30 40l20 40 20-40M50 80v16M50 80 8 72M50 80l42-8" /></svg><b>?</b></div>
      <p class="cb-dline"></p><p class="cb-dtier"></p>`;
    $('.dv').appendChild(box);
    const num = box.querySelector('b');
    app.sfx.dice();
    let skip = false;
    box.addEventListener('pointerdown', () => { skip = true; }, { once: true });
    const spin = T(650), t0 = performance.now();
    while (!skip && performance.now() - t0 < spin && alive_) { num.textContent = 1 + Math.floor(Math.random() * 20); await wait(55); }
    num.textContent = e.r;
    box.classList.add('done');
    box.querySelector('.cb-dline').innerHTML = `${e.r}${e.mods.map(([n, v]) => ` <span>+${v} ${esc(n)}</span>`).join('')} = <b>${e.total}</b> · DD ${e.dc}`;
    box.querySelector('.cb-dtier').innerHTML = `<b style="color:${tier.color}">${tier.name}</b>`;
    if (e.tier === 'crit') { app.sfx.crit(); shake(true); } else if (e.tier === 'fumble') app.sfx.fumble(); else app.sfx.tap();
    await wait(skip ? T(350) : T(e.tier === 'crit' || e.tier === 'fumble' ? 1100 : 800));
    box.classList.add('out'); setTimeout(() => box.remove(), 250);
  }

  // ——— Lecture des événements (animations) ———
  async function play(ev) {
    for (const e of ev) {
      if (!alive_) return;
      switch (e.t) {
        case 'act':
          if (e.skill) { app.sfx.skill(); banner(`${icon(KITS[st.units[e.u].role].skill.icon)} ${esc(e.name)}`, 'skill', 700); await wait(T(360)); }
          if (e.tgt && st.units[e.tgt]?.side === 'enemy' && e.key !== 'marque') lunge(e.u, e.tgt);
          break;
        case 'eact': {
          const def = INTENTS[e.kind];
          if (e.kind === 'heavy' || e.kind === 'blast') banner(`${icon(def.icon)} ${esc(def.name)} !`, 'danger', 700);
          if (e.tgt && st.units[e.tgt]?.side === 'ally') lunge(e.a, e.tgt);
          await wait(T(200));
          break;
        }
        case 'attack': await wait(T(110)); break;
        case 'counter': lunge(e.a, e.u); float(e.a, 'Riposte !', 'syn'); await wait(T(260)); break;
        case 'dmg': {
          const t = el(e.u);
          if (t) { t.classList.remove('hit'); void t.offsetWidth; t.classList.add('hit'); const hp = t.querySelector('.dv-hp b'); if (hp) hp.textContent = Math.max(0, e.hp); t.querySelector('.dv-hp')?.classList.add('hurt'); }
          fxAt(e.u, e.d >= 8 ? 'impact' : 'slash', { big: e.d >= 8 });
          float(e.u, `-${e.d}`, e.d >= 8 ? 'dmg big' : 'dmg'); (e.d >= 8 ? app.sfx.smash : app.sfx.slash)(); sparks(e.u); if (e.d >= 8 || e.hp <= 0) shake(e.d >= 12);
          await wait(T(240));
          break;
        }
        case 'heal': { app.sfx.heal(); fxAt(e.u, 'heal'); float(e.u, `+${e.d}`, 'heal'); const hp = el(e.u)?.querySelector('.dv-hp b'); if (hp) hp.textContent = st.units[e.u].hp; await wait(T(200)); break; }
        case 'block': app.sfx.block(); float(e.u, 'Bloqué', 'info'); sparks(e.u, 'blue'); await wait(T(240)); break;
        case 'dodge': {
          app.sfx.dodge();
          if (e.u) { fxAt(e.u, 'dodge', { big: true }); const t = el(e.u); if (t) { t.classList.remove('dodge'); void t.offsetWidth; t.classList.add('dodge'); } float(e.u, 'Esquive !', 'dodge'); }
          else banner('Esquive !', 'good', 600);
          await wait(T(320));
          break;
        }
        case 'parry': app.sfx.parry(); banner('Parade parfaite !', 'parry', 800); if (e.u) { fxAt(e.u, 'dodge', { big: true }); sparks(e.u, 'gold'); } shake(false); await wait(T(420)); break;
        case 'fervor': fervorPop(e.d, e.why); draw(); break;
        case 'brk': { const t = el(e.u)?.querySelector('.cb-brk i'); if (t) t.style.width = `${(e.brk / e.max) * 100}%`; break; }
        case 'broken': app.sfx.shatter(); draw(); el(e.u)?.classList.add('shatter'); banner('BRISURE !', 'broken', 1000); sparks(e.u, 'big'); shake(true); await wait(T(700)); break;
        case 'recover': float(e.u, 'Se relève', 'info'); await wait(T(260)); break;
        case 'roll': await rollFx(e); break;
        case 'boss': { app.sfx.boss(); const t = el(e.u); if (t) { t.classList.remove('roar'); void t.offsetWidth; t.classList.add('roar'); } float(e.u, e.s, 'boss'); shake(true); await wait(T(650)); break; }
        case 'phase2': app.sfx.boss(); draw(); banner(`${icon('skull')} ${esc(e.s)}`, 'danger', 1200); shake(true); await wait(T(900)); break;
        case 'swap': app.sfx.enter(); draw(); el(e.u)?.classList.add('enter'); float(e.u, 'Entre en jeu', 'info'); await wait(T(340)); break;
        case 'aoe': if (e.side === 'enemy') shake(true); await wait(T(150)); break;
        case 'status':
          if (e.k === 'poison') { if (/\+|×/.test(e.s)) { app.sfx.poison(); fxAt(e.u, 'venom', { big: !!e.syn }); } }
          else if (e.k === 'frost' && /^Gel/.test(e.s) && !/passe/.test(e.s)) { app.sfx.freeze(); fxAt(e.u, 'frost'); }
          else if (e.syn) app.sfx.skill();
          float(e.u, e.s, e.syn ? 'syn' : e.k === 'bad' ? 'dmg' : 'info');
          draw();
          await wait(T(e.syn ? 480 : 260));
          break;
        case 'die': app.sfx.death(); fxAt(e.u, 'death', { big: true }); sparks(e.u, 'big'); el(e.u)?.classList.add('dying'); await wait(T(440)); draw(); break;
        case 'enter': draw(); el(e.u)?.classList.add('enter'); await wait(T(340)); break;
        case 'revive': draw(); float(e.u, 'Relevée !', 'heal'); await wait(T(280)); break;
        case 'phase': draw(); say(e.side === 'enemy' ? '<b class="dc-bad">Tour des créatures corrompues</b>' : 'À toi !'); await wait(T(e.side === 'enemy' ? 380 : 160)); break;
        case 'ult': await ultFx(); break;
        default: break;
      }
    }
    draw();
  }
  function lunge(aUid, tUid) {
    const a = el(aUid), t = el(tUid);
    if (!a || !t || reduced) return;
    const ra = a.getBoundingClientRect(), rt = t.getBoundingClientRect();
    a.style.setProperty('--dx', `${(rt.left - ra.left) * 0.55}px`);
    a.style.setProperty('--dy', `${(rt.top - ra.top) * 0.55}px`);
    a.classList.remove('lunge'); void a.offsetWidth; a.classList.add('lunge');
  }
  async function ultFx() {
    const c = run.ult.card ? cat.get(run.ult.card) : null;
    const fx = document.createElement('div');
    fx.className = 'tb-summon'; fx.style.setProperty('--ic', ult.color);
    fx.innerHTML = `${c ? `<img alt="" src="${artUrl(c)}">` : `<span class="tb-sceau">${EMBLEM}</span>`}<b>${esc(ult.name)}</b>`;
    $('.dv').appendChild(fx);
    $('.dv').style.setProperty('--uc', ult.color);
    $('.dv').classList.add('ultflash'); fxAt(null, 'seal', { center: true }); setTimeout(() => $('.dv')?.classList.remove('ultflash'), 900);
    app.sfx.ult();
    await wait(reduced ? 300 : T(1200));
    fx.classList.add('out'); setTimeout(() => fx.remove(), 400);
  }

  async function finish() {
    if (!st.over || !alive_) return;
    busy = true; sel = null; mode = null; confirm = null; draw();
    say(st.over === 'won' ? '<b class="dc-good">Victoire !</b>' : '<b class="dc-bad">Défaite…</b>');
    (st.over === 'won' ? app.sfx.victory : app.sfx.defeat)();
    await wait(T(800));
    if (alive_) { alive_ = false; ctl.abort(); document.body.classList.remove('battle-mode'); onEnd(); }
  }

  // ——— Défense active ———
  // Un curseur traverse la barre en accélérant. Toucher dans l'or : esquive. Au cœur blanc : parade parfaite.
  let defTap = null;
  function defenseQTE(s) {
    return new Promise((resolve) => {
      const e = st.units[s.a], moving = e?.boss || e?.elite;
      const w = defenseWindow(st, s.a, s.t), ease = (x) => x ** 1.7, D = 900;
      const k = defMode === 'easy' ? 1.6 : 1;
      const width = (ms) => Math.max(0.03, ease(Math.min(1, 0.75 + (ms * k) / D)) - ease(0.75));
      const zw = width(w.dodge), pw = Math.min(zw, width(w.parry));
      const z0 = 0.35 + Math.random() * (0.6 - zw);
      const tEls = s.kind === 'blast' ? front(st, 'ally').map((u) => el(u.uid)) : [el(s.t)];
      el(s.a)?.classList.add('aim'); tEls.forEach((x) => x?.classList.add('aimed'));
      const def = INTENTS[s.kind];
      const bar = document.createElement('div');
      bar.className = 'dv-dodge cb-def';
      bar.innerHTML = `<span class="dv-dodge-t">${esc(def.name)} ! <small>Touche dans l’or pour esquiver, au cœur blanc pour parer</small></span><span class="dv-dodge-bar"><i class="z"><i class="p"></i></i><i class="c"></i></span>`;
      $('.dv-mid').appendChild(bar); $('.dv-mid').classList.add('qte');
      const cur = bar.querySelector('.c'), zEl = bar.querySelector('.z'), pEl = bar.querySelector('.p');
      zEl.style.cssText = `left:${z0 * 100}%;width:${zw * 100}%`;
      pEl.style.cssText = `left:${((zw - pw) / 2 / zw) * 100}%;width:${(pw / zw) * 100}%`;
      let t0 = 0, done = false, raf = 0;
      const zoneAt = (x) => (moving ? Math.min(0.97 - zw, Math.max(0.3, z0 + Math.sin(x * 9) * 0.1)) : z0);
      const end = (res) => {
        if (done) return; done = true; cancelAnimationFrame(raf); defTap = null;
        bar.classList.add(res === 'none' ? 'ko' : 'ok', `r-${res}`);
        bar.querySelector('.dv-dodge-t').textContent = res === 'parry' ? 'Parade parfaite !' : res === 'dodge' ? 'Esquive !' : 'Raté…';
        if (res === 'none') app.sfx.miss();
        setTimeout(() => { bar.remove(); $('.dv-mid')?.classList.remove('qte'); el(s.a)?.classList.remove('aim'); tEls.forEach((x) => x?.classList.remove('aimed')); resolve(res); }, res === 'none' ? 200 : 300);
      };
      const step = () => {
        const x = (performance.now() - t0) / D, pos = ease(Math.min(1, x));
        cur.style.left = `${pos * 100}%`;
        if (moving) zEl.style.left = `${zoneAt(x) * 100}%`;
        if (x >= 1) end('none'); else raf = requestAnimationFrame(step);
      };
      defTap = () => {
        if (!t0) return end('none'); // trop tôt
        const x = (performance.now() - t0) / D, pos = ease(Math.min(1, x)), zz = zoneAt(x);
        const pz = zz + (zw - pw) / 2;
        end(pos >= pz && pos <= pz + pw ? 'parry' : pos >= zz && pos <= zz + zw ? 'dodge' : 'none');
      };
      setTimeout(() => { if (!done && alive_) { t0 = performance.now(); raf = requestAnimationFrame(step); } }, (reduced ? 250 : 300) + Math.random() * 450);
    });
  }
  async function enemyTurn() {
    for (let s = nextEnemy(st); s && alive_; s = nextEnemy(st)) {
      const skips = takeSkips(st);
      if (skips.length) await play(skips);
      let res = 'none';
      if (s.qte && defMode !== 'off') {
        if (!g.s.tips?.['cb-defense']) await tuto(app, 'cb-defense');
        if (!alive_) return;
        res = await defenseQTE(s);
      }
      if (!alive_) return;
      const ev = enemyAct(st, s.a, res); g.persist();
      await play(ev);
    }
    if (!alive_) return;
    const ev = endEnemyTurn(st); g.persist();
    await play(ev);
  }
  async function doEnd() {
    if (busy || st.turn !== 'ally' || st.over) return;
    busy = true; sel = null; mode = null; confirm = null; draw();
    const ev = beginEnemyTurn(st); g.persist();
    await play(ev);
    if (!st.over) await enemyTurn();
    if (guide) endGuide();
    busy = false; draw();
    if (st.over) return finish();
    tips();
  }
  // Bulles d'aide au bon moment (une seule fois chacune)
  async function tips() {
    if (busy || st.over || guide) return;
    const foes = front(st, 'enemy');
    if (foes.some((e) => e.brkMax)) await tuto(app, 'cb-break');
    if (foes.some((e) => ['charge', 'channel', 'heavy', 'blast'].includes(e.intent?.kind))) await tuto(app, 'cb-intent');
    if (st.fervor >= 1 && g.s.tips?.['cb-guide']) await tuto(app, 'cb-skill');
    draw();
  }

  // ——— Actions du joueur ———
  async function exec(fn) {
    busy = true; draw();
    const ev = fn(); g.persist();
    await play(ev);
    busy = false;
    if (sel && !actionsFor(st, sel).some((a) => a.ok && a.key !== 'swap')) sel = null;
    draw();
    if (st.over) return finish();
  }
  async function choose(key) {
    const a = actionsFor(st, sel).find((x) => x.key === key);
    if (!a) return;
    if (!a.ok) { app.sfx.error(); toast(esc(a.why), { icon: 'info' }); return; }
    app.sfx.tap();
    const u = sel;
    if (a.target === 'none') { mode = null; return exec(() => act(st, u, key)); }
    const ts = actionTargets(st, u, key);
    if (key === 'swap') { if (ts.length === 1) { mode = null; return exec(() => act(st, u, 'swap', ts[0])); } return pickReserve(); }
    if (a.dice && !g.s.tips?.['cb-dice']) await tuto(app, 'cb-dice');
    if (ts.length === 1 && (key === 'rempart' || key === 'priere')) { mode = null; return exec(() => act(st, u, key, ts[0])); }
    mode = { key, name: a.name };
    draw();
  }
  function pickTarget(uid) {
    const key = mode.key;
    if (!actionTargets(st, sel, key).includes(uid)) {
      const t = st.units[uid];
      if (key === 'entrave' && t?.frostCD > 0) toast('Elle vient d’être gelée : immunisée au gel ce tour-ci.', { icon: 'info' });
      else if (t?.side === 'enemy' && key !== 'priere' && key !== 'rempart') toast('Une créature avec <b>Garde</b> protège les autres : vise-la d’abord.', { icon: 'shield' });
      return;
    }
    const a = actionsFor(st, sel).find((x) => x.key === key);
    if (a.dice) { confirm = { key, t: uid }; mode = null; app.sfx.tap(); draw(); return; }
    const u = sel; mode = null;
    return exec(() => act(st, u, key, uid));
  }
  function pickReserve() {
    const r = reserve(st, 'ally'), su = st.units[sel];
    const sh = openSheet(`<h2>Qui entre en jeu ?</h2><p class="small muted">À la place de <b>${esc(cat.get(su.id).name)}</b>. Coût : ${st.freeSwap ? 'gratuit (Relais d’ombre)' : '1 action'}. Elle peut agir ce tour-ci ; PV et états sont conservés.</p>
      <div class="dv-pick">${r.map((x) => `<button class="dv-pick-c" data-in="${x.uid}"><img alt="" src="${artUrl(cat.get(x.id), { lite: true })}"><b>${esc(cat.get(x.id).name)}</b><span>${esc(KITS[x.role].name)} · ${icon('swords')}${x.atk} · ${icon('heart')}${x.hp}/${x.maxHp}</span></button>`).join('')}</div>`, { label: 'Permuter' });
    sh.body.addEventListener('click', (ev) => { const p = ev.target.closest('[data-in]'); if (p) { sh.close(); const u = sel; mode = null; exec(() => act(st, u, 'swap', p.dataset.in)); } });
  }

  // ——— Touchers ———
  root.addEventListener('pointerdown', (e) => { if (defTap && !e.target.closest('[data-d="quit"],[data-d="help"],[data-d="fast"]')) { e.preventDefault(); defTap(); } }, { signal: ctl.signal });
  root.addEventListener('click', async (e) => {
    if (!alive_) return;
    const b = e.target.closest('[data-d]');
    if (b) {
      const k = b.dataset.d;
      if (k === 'quit') { toast('Combat en pause : il t’attend dans la Descente.', { icon: 'swords' }); app.go(''); return; }
      if (k === 'fast') { ui.fast = !ui.fast; b.classList.toggle('on', ui.fast); return; }
      if (k === 'help') return help();
      if (busy) return;
      if (k === 'desel') { sel = null; mode = null; confirm = null; draw(); return; }
      if (k === 'cancel') { mode = null; confirm = null; draw(); return; }
      if (k === 'go' && confirm) { const { key, t } = confirm; confirm = null; const u = sel; return exec(() => act(st, u, key, t)); }
      if (k === 'end') return doEnd();
      if (k === 'ult') {
        if (ultReady(st)) { sel = null; mode = null; confirm = null; return exec(() => useUlt(st)); }
        toast(`<b>${esc(ult.name)}</b> : ${esc(ult.desc)}<br>Il faut ${FERVOR_MAX} Ferveur et 1 action.`, { icon: 'sparkle' });
        return;
      }
      if (k === 'auto') { sel = null; mode = null; confirm = null; busy = true; draw(); const ev = autoActs(st); g.persist(); await play(ev); busy = false; draw(); if (st.over) return finish(); return doEnd(); }
      return;
    }
    const ab = e.target.closest('[data-a]');
    if (ab) { if (!busy && sel) choose(ab.dataset.a); return; }
    const c = e.target.closest('.dv-c');
    if (!c || busy || st.over || confirm) return;
    const u = st.units[c.dataset.uid];
    if (mode) return pickTarget(u.uid);
    if (u.side === 'ally') {
      if (sel === u.uid) { info(u); return; }
      if (st.turn === 'ally' && actionsFor(st, u.uid).some((a) => a.ok)) { sel = u.uid; app.sfx.tap(); draw(); }
      else info(u);
      return;
    }
    // ennemi touché avec une créature choisie : attaque directe (raccourci)
    if (sel && actionsFor(st, sel)[0].ok && actionTargets(st, sel, 'attack').includes(u.uid)) { const a = sel; return exec(() => act(st, a, 'attack', u.uid)); }
    info(u);
  }, { signal: ctl.signal });

  // ——— Fiches ———
  function info(u) {
    const c = cat.get(u.id), kit = KITS[u.role];
    const i = u.side === 'enemy' ? intentInfo(st, u) : null;
    const fam = u.fam ? AI_FAMILIES[u.fam] : null;
    const weakF = u.side === 'enemy' && (st.discovered[u.faction] || u.mark) ? WEAK_TO[u.faction] : null;
    const tgtName = i?.target && st.units[i.target]?.side === 'ally' ? cat.get(st.units[i.target].id).name : '';
    openSheet(`<div class="tb-info"><div class="tb-info-card ${u.side === 'enemy' ? 'corrupt' : ''}">${cardHTML(c, { size: 'full', nameKnown: true })}</div>
      <h3>${esc(c.name)}${u.side === 'enemy' ? ' corrompu' : ''}</h3>
      <dl class="facts"><div><dt>Attaque</dt><dd>${u.atk + (u.boost || 0)}</dd></div><div><dt>PV</dt><dd>${Math.max(0, u.hp)} / ${u.maxHp}</dd></div><div><dt>Niveau</dt><dd>${u.level || 1}</dd></div>${u.brkMax ? `<div><dt>Brisure</dt><dd>${u.broken ? 'Brisé' : `${u.brk} / ${u.brkMax}`}</dd></div>` : ''}</dl>
      ${i ? `<p class="small cb-iline"><b>${icon(i.def.icon)} Intention : ${esc(i.def.name)}</b>${i.dmg ? ` · ${i.dmg} dégâts${i.kind === 'blast' ? ' à chacune' : ''}` : ''}${tgtName ? ` sur ${esc(tgtName)}` : ''}. ${esc(i.def.desc)}${i.qte && defMode !== 'off' ? ' <b>Défense active possible.</b>' : ''}</p>` : ''}
      ${fam ? `<p class="small"><b>${esc(fam.name)}</b> : ${esc(fam.desc)} <span class="dc-good">${esc(fam.counter)}</span></p>` : ''}
      ${u.boss && st.bossPower ? `<p class="small dc-bad"><b>${esc(BOSS_POWERS[st.bossPower].name)}</b> : ${esc(BOSS_POWERS[st.bossPower].desc)} Sous la moitié de ses PV, il entre en phase 2.</p><p class="small dc-good"><b>Point faible</b> : ${esc(BOSS_POWERS[st.bossPower].counter)}</p>` : ''}
      ${u.side === 'enemy' ? `<p class="small">${weakF ? `<b>Faiblesse</b> : ${sigil(weakF)} ${esc(cat.faction[weakF]?.name || weakF)} (+50 % de dégâts)` : '<b>Faiblesse</b> : inconnue. Frappe-la avec la bonne faction, ou marque-la, pour la découvrir.'}</p>` : `
      <p class="small"><b>${icon('swords')} ${esc(kit.basic.name)}</b> (1 action) : ${esc(kit.basic.desc)}</p>
      <p class="small"><b>${icon(kit.skill.icon)} ${esc(kit.skill.name)}</b> (${kit.skill.ap} action${kit.skill.ap > 1 ? 's' : ''}, ${kit.skill.fervor} Ferveur) : ${esc(kit.skill.desc)}</p>
      <p class="small"><b>${esc(kit.passive.name)}</b> : ${esc(kit.passive.desc)}</p>
      ${u.rarity === 'C' ? `<p class="small dc-good">${icon('star')} Instinct de meute : +${PACK_BONUS} dégât aux élites et aux gardiens.</p>` : ''}`}
      ${u.side === 'enemy' && g.owns(u.id) ? `<p class="small dc-good">${icon('book')} Tu possèdes sa carte : tes créatures lui font +1 dégât.</p>` : ''}
      <p class="small muted">${statusLines(u)}</p></div>`, { label: c.name });
  }
  function statusLines(u) {
    const s = [];
    if (u.shield) s.push('Bouclier : bloque le prochain coup.');
    if (u.poison) s.push(`Poison ${u.poison} : perd ${u.poison} PV au début de son tour, puis le poison diminue de moitié.`);
    if (u.frozen || u.stunned) s.push('Gelé : passe son prochain tour.');
    if (u.slow) s.push('Ralenti : sa prochaine attaque fait moitié moins mal.');
    if (u.mark) s.push('Marqué : +30 % de dégâts subis, +3 aux jets de dés contre lui.');
    if (u.broken) s.push('Brisé : +50 % de dégâts subis, +5 aux jets.');
    if (u.defend) s.push('En défense : -50 % de dégâts.');
    if (u.guardBy) s.push('Protégé par un Rempart.');
    return s.join(' ');
  }
  function help() {
    openSheet(`<h2>Le combat</h2><ul class="small">
      <li><b>${AP_MAX} actions par tour</b> pour toute l’équipe. Touche une créature, puis une action, puis la cible. Une créature agit au plus 2 fois par tour. Raccourci : ta créature puis un ennemi = Attaque.</li>
      <li><b>Attaque</b> (1 action) : dégâts fiables, +1 Ferveur. <b>Défense</b> (1 action) : -50 % de dégâts jusqu’à ton prochain tour. <b>Permuter</b> (1 action, une fois par tour) : une créature de la réserve prend la place ; PV et états sont gardés, et la réserve récupère 10 % de PV par tour.</li>
      <li><b>Ferveur</b> (${FERVOR_MAX} au plus, gardée d’un combat à l’autre) : attaques, faiblesses, esquives (+1), parades parfaites (+2) et Brisures (+2) la remplissent. Les compétences la dépensent ; pleine, elle lance le <b>pouvoir d’équipe</b> (${esc(ult.name)} : ${esc(ult.desc)}).</li>
      <li><b>Intentions</b> : au-dessus de chaque ennemi, ce qu’il fera et les dégâts prévus ; « ! » = danger. Le badge rouge sur tes cartes annonce les dégâts qu’elles vont prendre.</li>
      <li><b>Défense active</b> (coups chargés, attaques de zone, sorts, élites et gardiens) : touche dans l’or pour esquiver (+1 Ferveur), au cœur blanc pour parer (aucun dégât, +2 Ferveur, Brisure, contre-attaque des Gardes et des Assauts). Réglable dans les Réglages.</li>
      <li><b>Dés</b> : Coup d’estoc, Contagion et Entrave lancent un D20 contre une difficulté (DD). 1 : échec critique ; sous le DD : réussite partielle ; DD atteint : réussite ; 20 : critique. Marque, gel, Brisure et faiblesse donnent des bonus.</li>
      <li><b>Brisure</b> (élites, gardiens) : vide, l’ennemi perd son action, subit +50 % de dégâts et +5 aux jets contre lui jusqu’à la fin de ton tour suivant.</li>
      <li><b>Faiblesses</b> : chaque faction en craint une autre (+50 % de dégâts) ; contre sa propre faction : -25 %. ★ sur une cible = faiblesse exploitée.</li>
      <li><b>Instinct de meute</b> : tes Communes font +${PACK_BONUS} dégât aux élites et aux gardiens.</li></ul>
      <h3>Les rôles</h3>${Object.values(KITS).map((k) => `<p class="small">${icon(k.icon)} <b>${esc(k.name)}</b> · <b>${esc(k.skill.name)}</b> (${k.skill.ap} act., ${k.skill.fervor} Ferveur) : ${esc(k.skill.desc)} <i>${esc(k.passive.name)} : ${esc(k.passive.desc)}</i></p>`).join('')}
      <h3>Les combinaisons</h3>${SYNERGIES.map((x) => `<p class="small"><b class="dv-syn-n">${esc(x.name)}</b> : ${esc(x.desc)}</p>`).join('')}
      <h3>Les ennemis</h3>${Object.values(AI_FAMILIES).map((f) => `<p class="small"><b>${esc(f.name)}</b> : ${esc(f.desc)} <span class="dc-good">${esc(f.counter)}</span></p>`).join('')}
      <h3>Les gardiens</h3>${Object.values(BOSS_POWERS).map((x) => `<p class="small"><b>${esc(x.name)}</b> : ${esc(x.desc)} <span class="dc-good">${esc(x.counter)}</span></p>`).join('')}
      <p class="small muted">Sous la moitié de leurs PV, les gardiens entrent en phase 2 : plus forts, ils alternent coups chargés et déflagrations, et visent tes Soigneurs.</p>`, { label: 'Règles du combat' });
  }

  draw();
  // combat repris pendant le tour ennemi (application fermée en plein tour)
  if (st.turn === 'enemy' && !st.over) { busy = true; draw(); enemyTurn().then(() => { busy = false; draw(); if (st.over) finish(); }); }
  else if (st.over) finish();
  else if (guide) tuto(app, 'cb-intro').then(() => draw());
  else tips();
  return { stop() { alive_ = false; ctl.abort(); document.body.classList.remove('battle-mode'); } };
}
