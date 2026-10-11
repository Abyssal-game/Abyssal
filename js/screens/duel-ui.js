// ABYSSAL : écran du duel de cartes.
// Grandes cartes avec ATTAQUE et PV ; toucher une de tes cartes, puis l'ennemi à frapper.
// Tour ennemi coup par coup : une barre d'esquive à toucher au bon moment. Cibles annoncées,
// échange avec la réserve, effets (étincelles, secousses, esquives).
import { RARITY } from '../config.js';
import { artUrl } from '../art/assets.js';
import { icon, EMBLEM } from '../ui/icons.js';
import { esc, openSheet, toast } from '../ui/dom.js';
import { coach } from '../ui/coach.js';
import { cardHTML } from '../ui/card.js';
import { KEYWORDS, GAUGE_MAX, front, reserve, targetsFor, canAct, attack, beginEnemyTurn, nextStrike, strike, endEnemyTurn, dodgeWindow, threats, canSwap, swap, useUlt, ultReady, autoAttacks } from '../core/duel.js';
import { ULTS } from '../core/army.js';

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
    <div class="dv-mid"><span class="dv-msg"></span><span class="dv-resw"></span></div>
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
  let th = {};
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
      ${u.side === 'ally' && th[u.uid] ? `<span class="dv-threat" title="Dégâts annoncés">${icon('skull')}-${th[u.uid]}</span>` : ''}
      ${u.side === 'enemy' ? `<span class="dv-lv">Niv. ${u.level || 1}</span>` : ''}
      <span class="dv-st">${u.shield ? `<i class="sh">${icon('shield')}</i>` : ''}${u.poison ? `<i class="po">${icon('skull')}${u.poison}</i>` : ''}${u.frozen ? '<i class="fr">Gelé</i>' : ''}${u.boost ? `<i class="bo">+${u.boost}</i>` : ''}</span>
    </button>`;
  };
  // Réserve : miniatures ; côté joueur, bouton d'échange (une fois par tour)
  const resHTML = (side) => {
    const r = reserve(st, side);
    if (!r.length) return '';
    if (side === 'enemy') return `<span class="dv-res" title="Réserve">+${r.length}</span>`;
    const on = canSwap(st) && sel && st.units[sel]?.side === 'ally';
    return `<button class="dv-resv ${on ? 'on' : ''} ${canSwap(st) ? '' : 'used'}" data-d="swap" aria-label="Échanger avec la réserve">${r.map((u) => `<img alt="" src="${artUrl(cat.get(u.id), { lite: true })}">`).join('')}<small>${icon('back')}Réserve</small></button>`;
  };
  function draw() {
    if (!alive_) return;
    th = threats(st);
    enEl.innerHTML = front(st, 'enemy').map(cardEl).join('') + resHTML('enemy');
    alEl.innerHTML = front(st, 'ally').map(cardEl).join('');
    $('.dv-resw').innerHTML = resHTML('ally');
    const ready = ultReady(st);
    const ring = $('.dv-ult-ring i');
    ring.style.setProperty('--p', `${(st.gauge / GAUGE_MAX) * 100}`);
    $('.dv-ult').classList.toggle('ready', ready);
    $('.dv-ult small').textContent = ready ? 'Prêt ! Touche pour lancer' : `${st.gauge} / ${GAUGE_MAX}`;
    const left = front(st, 'ally').filter((u) => canAct(st, u)).length;
    $('.dv-end').classList.toggle('pulse', st.turn === 'ally' && !left && !busy);
    root.querySelectorAll('.dv-bar button').forEach((b) => { b.disabled = busy || st.turn !== 'ally' || !!st.over; });
    if (sel) targetsFor(st, 'ally').forEach((id) => root.querySelector(`[data-uid="${id}"]`)?.classList.add('target'));
    if (!busy && st.turn === 'ally' && !st.over) {
      const su = sel && st.units[sel];
      say(su ? (canAct(st, su) ? `Touche l’ennemi à attaquer${canSwap(st) ? ', ou la <b>Réserve</b> pour l’échanger' : ''}` : canSwap(st) ? 'Touche la <b>Réserve</b> pour l’échanger' : 'Elle a déjà joué ce tour')
        : left ? 'Touche une de tes cartes pour attaquer' : 'Touche <b>Fin du tour</b>');
    }
  }
  const el = (uid) => root.querySelector(`[data-uid="${uid}"]`);
  const shake = (big) => { if (reduced) return; const d = root.querySelector('.dv'); d.classList.remove('shake', 'big'); void d.offsetWidth; d.classList.add('shake'); d.classList.toggle('big', !!big); };
  const sparks = (uid, cls = '') => {
    if (reduced) return;
    const t = el(uid); if (!t) return;
    const b = document.createElement('span'); b.className = `dv-burst ${cls}`;
    b.innerHTML = Array.from({ length: 10 }, (_, i) => `<i style="--a:${i * 36 + Math.round(Math.random() * 20)}deg;--r:${30 + Math.round(Math.random() * 26)}px"></i>`).join('');
    t.appendChild(b); setTimeout(() => b.remove(), 650);
  };
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
        float(e.u, `-${e.d}`, e.d >= 6 ? 'dmg big' : 'dmg'); app.sfx.hit(); sparks(e.u); if (e.d >= 6 || e.hp <= 0) shake(e.d >= 9);
        await wait(T(260));
      } else if (e.t === 'heal') { float(e.u, `+${e.d}`, 'heal'); const t = el(e.u); const hp = t?.querySelector('.dv-hp b'); if (hp) hp.textContent = st.units[e.u].hp; await wait(T(220)); }
      else if (e.t === 'block') { float(e.u, 'Bloqué', 'info'); sparks(e.u, 'blue'); await wait(T(260)); }
      else if (e.t === 'dodge') { const t = el(e.u); if (t) { t.classList.remove('dodge'); void t.offsetWidth; t.classList.add('dodge'); } float(e.u, 'Esquive !', 'dodge'); app.sfx.swipe?.(); await wait(T(320)); }
      else if (e.t === 'swap') { draw(); el(e.u)?.classList.add('enter'); float(e.u, 'Entre en jeu', 'info'); await wait(T(360)); }
      else if (e.t === 'status') { float(e.u, e.s, 'info'); await wait(T(240)); }
      else if (e.t === 'die') { sparks(e.u, 'big'); el(e.u)?.classList.add('dying'); await wait(T(460)); draw(); }
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
    root.querySelector('.dv').style.setProperty('--uc', ult.color);
    root.querySelector('.dv').classList.add('ultflash'); setTimeout(() => root.querySelector('.dv')?.classList.remove('ultflash'), 900);
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
  // Tour ennemi : chaque attaque s'annonce, une barre d'esquive apparaît ; touche quand le
  // curseur passe dans la zone dorée (plus étroite face à un ennemi plus fort).
  let dodgeTap = null;
  function dodgeQTE(a, t) {
    return new Promise((resolve) => {
      // Le curseur accélère (difficile de prévoir son passage) ; face à une élite ou un gardien,
      // la zone dorée se déplace aussi.
      const u = st.units[a], moving = u?.boss || u?.elite;
      const win = dodgeWindow(st, a, t), D = 900;
      const ease = (x) => x ** 1.7;                  // position du curseur selon le temps (0 → 1)
      const zw = Math.max(0.035, ease(Math.min(1, 0.75 + win / D)) - ease(0.75)); // largeur de la zone, ramenée à la vitesse du curseur vers la fin
      let z0 = 0.35 + Math.random() * (0.6 - zw);
      const aEl = el(a), tEl = el(t);
      aEl?.classList.add('aim'); tEl?.classList.add('aimed');
      const bar = document.createElement('div');
      bar.className = 'dv-dodge';
      bar.innerHTML = `<span class="dv-dodge-t">Esquive ! <small>touche quand le curseur est dans l’or</small></span><span class="dv-dodge-bar"><i class="z" style="left:${z0 * 100}%;width:${zw * 100}%"></i><i class="c"></i></span>`;
      $('.dv-mid').appendChild(bar); $('.dv-mid').classList.add('qte');
      const cur = bar.querySelector('.c'), zEl = bar.querySelector('.z');
      let t0 = 0, done = false, raf = 0;
      const zoneAt = (x) => (moving ? Math.min(0.97 - zw, Math.max(0.3, z0 + Math.sin(x * 9) * 0.12)) : z0);
      const end = (ok) => {
        if (done) return; done = true; cancelAnimationFrame(raf); dodgeTap = null;
        bar.classList.add(ok ? 'ok' : 'ko');
        setTimeout(() => { bar.remove(); $('.dv-mid')?.classList.remove('qte'); aEl?.classList.remove('aim'); tEl?.classList.remove('aimed'); resolve(ok); }, ok ? 260 : 160);
      };
      const step = () => {
        const x = (performance.now() - t0) / D, pos = ease(Math.min(1, x));
        cur.style.left = `${pos * 100}%`;
        if (moving) zEl.style.left = `${zoneAt(x) * 100}%`;
        if (x >= 1) end(false); else raf = requestAnimationFrame(step);
      };
      // toucher avant le départ du curseur = esquive ratée
      dodgeTap = () => { if (!t0) return end(false); const x = (performance.now() - t0) / D, pos = ease(Math.min(1, x)), zz = zoneAt(x); end(pos >= zz && pos <= zz + zw); };
      // départ après un délai variable : impossible de toucher en rythme
      setTimeout(() => { if (!done && alive_) { t0 = performance.now(); raf = requestAnimationFrame(step); } }, (reduced ? 250 : 300) + Math.random() * 450);
    });
  }
  async function enemyTurn() {
    for (let s = nextStrike(st); s && alive_; s = nextStrike(st)) {
      const ok = await dodgeQTE(s.a, s.t);
      if (!alive_) return;
      const ev = strike(st, s.a, s.t, { dodged: ok }); g.persist();
      await play(ev);
    }
    if (!alive_) return;
    const ev = endEnemyTurn(st); g.persist();
    await play(ev);
  }
  async function doEnd() {
    if (busy || st.turn !== 'ally' || st.over) return;
    busy = true; sel = null; draw();
    const ev = beginEnemyTurn(st); g.persist();
    await play(ev);
    await enemyTurn();
    busy = false; draw();
    if (st.over) return finish();
  }

  // ——— Touchers ———
  // l'esquive se déclenche au toucher, n'importe où sur l'écran du combat
  root.addEventListener('pointerdown', (e) => { if (dodgeTap && !e.target.closest('[data-d="quit"],[data-d="help"],[data-d="fast"]')) { e.preventDefault(); dodgeTap(); } }, { signal: ctl.signal });
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
      if (k === 'swap') return doSwap();
      if (k === 'ult' && ultReady(st)) { busy = true; sel = null; const ev = useUlt(st); g.persist(); await play(ev); busy = false; draw(); if (st.over) finish(); return; }
      if (k === 'auto') { busy = true; sel = null; draw(); const ev = autoAttacks(st); g.persist(); await play(ev); busy = false; draw(); if (st.over) return finish(); return doEnd(); }
      return;
    }
    const c = e.target.closest('.dv-c');
    if (!c || busy || st.over) return;
    const u = st.units[c.dataset.uid];
    if (u.side === 'ally') {
      // toucher une carte la sélectionne (attaque ou échange) ; la toucher encore ouvre sa fiche
      if (sel === u.uid) { sel = null; draw(); info(u); return; }
      if (canAct(st, u) || canSwap(st)) { sel = u.uid; app.sfx.tap(); draw(); }
      else info(u);
      return;
    }
    // ennemi
    if (sel && canAct(st, st.units[sel]) && targetsFor(st, 'ally').includes(u.uid)) {
      const a = sel; sel = null; busy = true; draw();
      const ev = attack(st, a, u.uid); g.persist();
      await play(ev);
      busy = false; draw();
      if (st.over) return finish();
      return;
    }
    if (sel && canAct(st, st.units[sel]) && !targetsFor(st, 'ally').includes(u.uid)) { toast('Une créature avec <b>Garde</b> protège les autres : attaque-la d’abord.', { icon: 'shield' }); return; }
    info(u);
  }, { signal: ctl.signal });

  async function doSwap() {
    if (!canSwap(st)) { toast('Un seul échange par tour.', { icon: 'info' }); return; }
    const su = sel && st.units[sel];
    if (!su || su.side !== 'ally') { toast('Touche d’abord la carte à remplacer, puis la Réserve.', { icon: 'info' }); return; }
    const r = reserve(st, 'ally');
    const go = async (inUid) => { sel = null; busy = true; const ev = swap(st, su.uid, inUid); g.persist(); await play(ev); busy = false; draw(); };
    if (r.length === 1) return go(r[0].uid);
    const sh = openSheet(`<h2>Qui entre en jeu ?</h2><p class="small muted">À la place de <b>${esc(cat.get(su.id).name)}</b>. La carte qui entre ne peut pas attaquer ce tour-ci.</p>
      <div class="dv-pick">${r.map((x) => `<button class="dv-pick-c" data-in="${x.uid}"><img alt="" src="${artUrl(cat.get(x.id), { lite: true })}"><b>${esc(cat.get(x.id).name)}</b><span>${icon('swords')}${x.atk} · ${icon('heart')}${x.hp}/${x.maxHp}</span></button>`).join('')}</div>`, { label: 'Échange' });
    sh.body.addEventListener('click', (ev) => { const p = ev.target.closest('[data-in]'); if (p) { sh.close(); go(p.dataset.in); } });
  }
  function info(u) {
    const c = cat.get(u.id), kw = KEYWORDS[u.kw];
    openSheet(`<div class="tb-info"><div class="tb-info-card ${u.side === 'enemy' ? 'corrupt' : ''}">${cardHTML(c, { size: 'full', nameKnown: true })}</div>
      <h3>${esc(c.name)}${u.side === 'enemy' ? ' corrompu' : ''}</h3>
      <dl class="facts"><div><dt>Attaque</dt><dd>${u.atk}</dd></div><div><dt>PV</dt><dd>${Math.max(0, u.hp)} / ${u.maxHp}</dd></div><div><dt>Niveau</dt><dd>${u.level || 1}</dd></div></dl>
      <p class="small"><b>${icon(kw.icon)} ${esc(kw.name)}</b> : ${esc(kw.desc)}</p>
      ${u.side === 'enemy' && g.owns(u.id) ? `<p class="small dc-good">${icon('book')} Tu possèdes sa carte : tes créatures lui font +1 dégât.</p>` : ''}</div>`, { label: c.name });
  }
  function help() {
    openSheet(`<h2>Le duel de cartes</h2><ul class="small">
      <li>Chaque carte a une <b>attaque</b> ${icon('swords')} et des <b>PV</b> ${icon('heart')}.</li>
      <li>Touche une de tes cartes, puis l’ennemi à frapper. La cible <b>riposte</b> avec son attaque.</li>
      <li>Chaque carte attaque une fois par tour. Ensuite, touche <b>Fin du tour</b> : les créatures corrompues attaquent.</li>
      <li>${icon('skull')} Le badge rouge sur une de tes cartes annonce les dégâts qu’elle va prendre : abats l’attaquant avant, ou mets-la à l’abri.</li>
      <li><b>Esquive</b> : quand un ennemi attaque, touche l’écran quand le curseur passe dans la zone dorée. Réussie, ta carte ne prend rien et riposte quand même. Le curseur part à un moment imprévisible et accélère. La zone est plus étroite face à un ennemi de plus haut niveau que ta carte, et chaque esquive réussie par une même carte rend la suivante plus dure. Face aux élites et aux gardiens, la zone bouge. Toucher trop tôt fait rater l’esquive.</li>
      <li><b>Réserve</b> : une fois par tour, touche une de tes cartes puis la Réserve pour l’échanger. La carte qui entre n’attaque pas ce tour-ci.</li>
      <li>Si une carte tombe, ta réserve prend sa place.</li>
      <li>Chaque attaque charge le <b>pouvoir du Gardien</b> : à ${GAUGE_MAX}, touche-le pour le lancer.</li></ul>
      <h3>Les capacités</h3>${Object.values(KEYWORDS).map((k) => `<p class="small">${icon(k.icon)} <b>${esc(k.name)}</b> : ${esc(k.desc)}</p>`).join('')}`, { label: 'Règles du duel' });
  }

  draw();
  // combat repris pendant le tour ennemi (application fermée en plein tour)
  if (st.turn === 'enemy' && !st.over) { busy = true; draw(); enemyTurn().then(() => { busy = false; draw(); if (st.over) finish(); }); }
  coach(app, 'v2-duel', 'Chaque carte a son <b>attaque</b> (épée) et ses <b>PV</b> (cœur). Touche une de tes cartes, puis l’ennemi à frapper : il <b>riposte</b>. Quand toutes tes cartes ont attaqué, touche <b>Fin du tour</b>.<br><br>Chaque carte a une <b>capacité</b> qui agit toute seule (Garde, Soin, Venin…). Touche une carte qui a déjà joué pour lire sa capacité.', { title: 'Le duel de cartes' }).then(() => coach(app, 'v2-dodge', 'Nouveau : les créatures corrompues <b>annoncent leur cible</b> (badge rouge sur ta carte). Pendant leur tour, touche l’écran quand le curseur passe dans la <b>zone dorée</b> pour <b>esquiver</b>. Une fois par tour, tu peux aussi <b>échanger</b> une carte avec ta réserve.', { title: 'Esquive et stratégie' }));
  return { stop() { alive_ = false; ctl.abort(); document.body.classList.remove('battle-mode'); } };
}
