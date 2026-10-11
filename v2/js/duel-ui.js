// ABYSSAL v2 : écran du duel de cartes.
// Grandes cartes avec ATTAQUE et PV ; toucher une de tes cartes, puis l'ennemi à frapper.
import { RARITY } from '../../js/config.js';
import { artUrl } from '../../js/art/assets.js';
import { icon, EMBLEM } from '../../js/ui/icons.js';
import { esc, openSheet, toast } from '../../js/ui/dom.js';
import { coach } from '../../js/ui/coach.js';
import { cardHTML } from '../../js/ui/card.js';
import { KEYWORDS, GAUGE_MAX, front, reserve, alive, targetsFor, canAct, attack, endTurn, useUlt, ultReady, autoTurn } from './duel.js';
import { ULTS } from './units.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function runDuel(app, root, { title, onEnd }) {
  const g = app.game, cat = app.catalog, run = g.descent().run, st = run.battle;
  const ui = (app.state.duel ||= { fast: false });
  const reduced = app.reduced();
  const T = (ms) => (reduced ? Math.min(ms, 80) : ui.fast ? ms * 0.5 : ms);
  let alive_ = true, busy = false, sel = null;
  const ctl = new AbortController(); // l'écouteur disparaît avec le combat
  const ult = ULTS[st.ult];
  document.body.classList.add('battle-mode');

  root.innerHTML = `<div class="dv ${run.room}">
    <div class="dv-top"><b>${esc(title)}</b><span class="row gap">
      <button class="btn small ghost" data-d="help" aria-label="Règles">?</button>
      <button class="btn small ghost ${ui.fast ? 'on' : ''}" data-d="fast">×2</button>
      <button class="btn small ghost" data-d="quit" aria-label="Pause">${icon('close')}</button></span></div>
    <div class="dv-row enemy"></div>
    <div class="dv-mid"><span class="dv-msg"></span></div>
    <div class="dv-row ally"></div>
    <div class="dv-bar">
      <button class="dv-ult" data-d="ult" style="--uc:${ult.color}"><span class="dv-ult-ring"><i></i></span><span class="dv-ult-t"><b>${esc(ult.name)}</b><small></small></span></button>
      <button class="btn small ghost dv-auto" data-d="auto">Auto</button>
      <button class="btn primary dv-end" data-d="end">Fin du tour</button>
    </div>
  </div>`;
  const $ = (s) => root.querySelector(s);
  const enEl = $('.dv-row.enemy'), alEl = $('.dv-row.ally'), msgEl = $('.dv-msg');
  const say = (h) => { msgEl.innerHTML = h; };

  // ——— Carte de duel ———
  const cardEl = (u) => {
    const c = cat.get(u.id), kw = KEYWORDS[u.kw], acts = canAct(st, u);
    const dead = u.hp <= 0;
    return `<button class="dv-c ${u.side} ${u.side === 'enemy' ? 'corrupt' : ''} ${dead ? 'dead' : ''} ${acts && u.side === 'ally' ? 'ready' : ''} ${u.attacked && u.side === st.turn ? 'spent' : ''} ${sel === u.uid ? 'sel' : ''} ${u.boss ? 'boss' : ''}" data-uid="${u.uid}" style="--rc:${RARITY[u.rarity].color}">
      <span class="dv-art"><img alt="" src="${artUrl(c)}"></span>
      <span class="dv-kw" title="${esc(kw.name)}">${icon(kw.icon)}<em>${esc(kw.name)}</em></span>
      ${u.boss ? '<span class="dv-boss">Gardien</span>' : u.elite ? '<span class="dv-boss elite">Élite</span>' : ''}
      <span class="dv-nm">${esc(c.name)}</span>
      <span class="dv-atk">${icon('swords')}<b>${u.atk + (u.boost || 0)}</b></span>
      <span class="dv-hp ${u.hp < u.maxHp ? 'hurt' : ''}">${icon('heart')}<b>${Math.max(0, u.hp)}</b></span>
      <span class="dv-st">${u.shield ? `<i class="sh">${icon('shield')}</i>` : ''}${u.poison ? `<i class="po">${icon('skull')}${u.poison}</i>` : ''}${u.frozen ? '<i class="fr">Gelé</i>' : ''}${u.boost ? `<i class="bo">+${u.boost}</i>` : ''}</span>
    </button>`;
  };
  const resHTML = (side) => { const r = reserve(st, side); return r.length ? `<span class="dv-res" title="Réserve">+${r.length}</span>` : ''; };
  function draw() {
    if (!alive_) return;
    enEl.innerHTML = front(st, 'enemy').map(cardEl).join('') + resHTML('enemy');
    alEl.innerHTML = front(st, 'ally').map(cardEl).join('') + resHTML('ally');
    const ready = ultReady(st);
    const ring = $('.dv-ult-ring i');
    ring.style.setProperty('--p', `${(st.gauge / GAUGE_MAX) * 100}`);
    $('.dv-ult').classList.toggle('ready', ready);
    $('.dv-ult small').textContent = ready ? 'Prêt ! Touche pour lancer' : `${st.gauge} / ${GAUGE_MAX}`;
    const left = front(st, 'ally').filter((u) => canAct(st, u)).length;
    $('.dv-end').classList.toggle('pulse', st.turn === 'ally' && !left && !busy);
    root.querySelectorAll('.dv-bar button').forEach((b) => { b.disabled = busy || st.turn !== 'ally' || !!st.over; });
    if (sel) targetsFor(st, 'ally').forEach((id) => root.querySelector(`[data-uid="${id}"]`)?.classList.add('target'));
    if (!busy && st.turn === 'ally' && !st.over) say(sel ? 'Touche l’ennemi à attaquer' : left ? 'Touche une de tes cartes pour attaquer' : 'Touche <b>Fin du tour</b>');
  }
  const el = (uid) => root.querySelector(`[data-uid="${uid}"]`);
  const float = (uid, txt, cls) => { const t = el(uid); if (!t) return; const f = document.createElement('span'); f.className = `dv-float ${cls}`; f.textContent = txt; t.appendChild(f); setTimeout(() => f.remove(), 900); };

  // ——— Lecture des événements (animations) ———
  async function play(ev) {
    for (const e of ev) {
      if (!alive_) return;
      if (e.t === 'attack' || e.t === 'riposte') {
        const a = el(e.a), t = el(e.u);
        if (a && t) {
          const ra = a.getBoundingClientRect(), rt = t.getBoundingClientRect();
          a.style.setProperty('--dx', `${(rt.left - ra.left) * 0.55}px`);
          a.style.setProperty('--dy', `${(rt.top - ra.top) * 0.55}px`);
          a.classList.remove('lunge', 'small'); void a.offsetWidth; a.classList.add('lunge'); a.classList.toggle('small', e.t === 'riposte');
        }
        await wait(T(e.t === 'riposte' ? 160 : 220));
      } else if (e.t === 'dmg') {
        const t = el(e.u);
        if (t) { t.classList.remove('hit'); void t.offsetWidth; t.classList.add('hit'); const hp = t.querySelector('.dv-hp b'); if (hp) hp.textContent = Math.max(0, e.hp); t.querySelector('.dv-hp')?.classList.add('hurt'); }
        float(e.u, `-${e.d}`, 'dmg'); app.sfx.hit();
        await wait(T(260));
      } else if (e.t === 'heal') { float(e.u, `+${e.d}`, 'heal'); const t = el(e.u); const hp = t?.querySelector('.dv-hp b'); if (hp) hp.textContent = st.units[e.u].hp; await wait(T(220)); }
      else if (e.t === 'block') { float(e.u, 'Bloqué', 'info'); await wait(T(260)); }
      else if (e.t === 'status') { float(e.u, e.s, 'info'); await wait(T(240)); }
      else if (e.t === 'die') { el(e.u)?.classList.add('dying'); await wait(T(420)); draw(); }
      else if (e.t === 'enter') { draw(); el(e.u)?.classList.add('enter'); await wait(T(380)); }
      else if (e.t === 'revive') { draw(); float(e.u, 'Relevée !', 'heal'); await wait(T(300)); }
      else if (e.t === 'phase') { draw(); say(e.side === 'enemy' ? '<b class="dc-bad">Tour des créatures corrompues</b>' : 'À toi !'); await wait(T(e.side === 'enemy' ? 420 : 200)); }
      else if (e.t === 'ult') await ultFx();
    }
    draw();
  }
  async function ultFx() {
    const c = run.ult.card ? cat.get(run.ult.card) : null;
    const fx = document.createElement('div');
    fx.className = 'tb-summon'; fx.style.setProperty('--ic', ult.color);
    fx.innerHTML = `${c ? `<img alt="" src="${artUrl(c)}">` : `<span class="tb-sceau">${EMBLEM}</span>`}<b>${esc(ult.name)}</b>`;
    root.querySelector('.dv').appendChild(fx);
    app.sfx.reveal('M');
    await wait(reduced ? 300 : 1300);
    fx.classList.add('out'); setTimeout(() => fx.remove(), 400);
  }

  async function finish() {
    if (!st.over || !alive_) return;
    busy = true; draw();
    say(st.over === 'won' ? '<b class="dc-good">Victoire !</b>' : '<b class="dc-bad">Défaite…</b>');
    await wait(T(800));
    if (alive_) { alive_ = false; ctl.abort(); document.body.classList.remove('battle-mode'); onEnd(); }
  }
  async function doEnd() {
    if (busy || st.turn !== 'ally' || st.over) return;
    busy = true; sel = null; draw();
    const ev = endTurn(st); g.persist();
    await play(ev);
    busy = false; draw();
    if (st.over) return finish();
  }

  // ——— Touchers ———
  root.addEventListener('click', async (e) => {
    if (!alive_) return;
    const b = e.target.closest('[data-d]');
    if (b) {
      const k = b.dataset.d;
      if (k === 'quit') { toast('Combat en pause : il t’attend dans la Descente.', { icon: 'swords' }); app.go(''); return; }
      if (k === 'fast') { ui.fast = !ui.fast; b.classList.toggle('on', ui.fast); return; }
      if (k === 'help') return help();
      if (busy) return;
      if (k === 'end') return doEnd();
      if (k === 'ult' && ultReady(st)) { busy = true; sel = null; const ev = useUlt(st); g.persist(); await play(ev); busy = false; draw(); if (st.over) finish(); return; }
      if (k === 'auto') { busy = true; sel = null; draw(); const ev = autoTurn(st); g.persist(); await play(ev); busy = false; draw(); if (st.over) finish(); return; }
      return;
    }
    const c = e.target.closest('.dv-c');
    if (!c || busy || st.over) return;
    const u = st.units[c.dataset.uid];
    if (u.side === 'ally') {
      if (canAct(st, u)) { sel = sel === u.uid ? null : u.uid; app.sfx.tap(); draw(); }
      else { info(u); }
      return;
    }
    // ennemi
    if (sel && targetsFor(st, 'ally').includes(u.uid)) {
      const a = sel; sel = null; busy = true; draw();
      const ev = attack(st, a, u.uid); g.persist();
      await play(ev);
      busy = false; draw();
      if (st.over) return finish();
      return;
    }
    if (sel && !targetsFor(st, 'ally').includes(u.uid)) { toast('Une créature avec <b>Garde</b> protège les autres : attaque-la d’abord.', { icon: 'shield' }); return; }
    info(u);
  }, { signal: ctl.signal });

  function info(u) {
    const c = cat.get(u.id), kw = KEYWORDS[u.kw];
    openSheet(`<div class="tb-info"><div class="tb-info-card ${u.side === 'enemy' ? 'corrupt' : ''}">${cardHTML(c, { size: 'full', nameKnown: true })}</div>
      <h3>${esc(c.name)}${u.side === 'enemy' ? ' corrompu' : ''}</h3>
      <dl class="facts"><div><dt>Attaque</dt><dd>${u.atk}</dd></div><div><dt>PV</dt><dd>${Math.max(0, u.hp)} / ${u.maxHp}</dd></div></dl>
      <p class="small"><b>${icon(kw.icon)} ${esc(kw.name)}</b> : ${esc(kw.desc)}</p>
      ${u.side === 'enemy' && g.owns(u.id) ? `<p class="small dc-good">${icon('book')} Tu possèdes sa carte : tes créatures lui font +1 dégât.</p>` : ''}</div>`, { label: c.name });
  }
  function help() {
    openSheet(`<h2>Le duel de cartes</h2><ul class="small">
      <li>Chaque carte a une <b>attaque</b> ${icon('swords')} et des <b>PV</b> ${icon('heart')}.</li>
      <li>Touche une de tes cartes, puis l’ennemi à frapper. La cible <b>riposte</b> avec son attaque.</li>
      <li>Chaque carte attaque une fois par tour. Ensuite, touche <b>Fin du tour</b> : les créatures corrompues attaquent.</li>
      <li>Si une carte tombe, ta <b>réserve</b> prend sa place.</li>
      <li>Chaque attaque charge le <b>pouvoir du Gardien</b> : à ${GAUGE_MAX}, touche-le pour le lancer.</li></ul>
      <h3>Les capacités</h3>${Object.values(KEYWORDS).map((k) => `<p class="small">${icon(k.icon)} <b>${esc(k.name)}</b> : ${esc(k.desc)}</p>`).join('')}`, { label: 'Règles du duel' });
  }

  draw();
  coach(app, 'v2-duel', 'Chaque carte a son <b>attaque</b> (épée) et ses <b>PV</b> (cœur). Touche une de tes cartes, puis l’ennemi à frapper : il <b>riposte</b>. Quand toutes tes cartes ont attaqué, touche <b>Fin du tour</b>.<br><br>Chaque carte a une <b>capacité</b> qui agit toute seule (Garde, Soin, Venin…). Touche une carte qui a déjà joué pour lire sa capacité.', { title: 'Le duel de cartes' });
  return { stop() { alive_ = false; ctl.abort(); document.body.classList.remove('battle-mode'); } };
}
