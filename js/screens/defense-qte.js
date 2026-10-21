// v566 : défense active refaite (retour du propriétaire : « aucun QTE hormis la barre ne fonctionne bien : toucher à
// différents endroits, rien ne se passe ; marteler, impossible d'atteindre la moitié ; la direction, pas bien faite »).
// Causes trouvées : les gestes écoutaient toute la fenêtre ; sur iPhone, Safari reprenait la main (défilement, zoom au
// double toucher) : glissés annulés, touchers rapides avalés ; le point faible était positionné dans le repère du plateau
// (qui bouge avec la caméra) et jugé dans celui de l'écran. Désormais chaque geste se joue sur un calque à lui, plein
// écran (touch-action: none, comme le lancer de dé qui, lui, marchait), et tout est placé et jugé dans le même repère.
// Chaque geste rend 'parry' | 'dodge' | 'none' (inchangé pour le moteur et le serveur de partie).
import { esc } from '../ui/dom.js';
import { hap } from '../ui/sound.js';

// réglages par rang d'ennemi : ordinaire, élite, gardien
const TIERS = {
  normal: { hold: { start: 1500, rise: 1050, gold: 0.24, perf: 0.07 }, swipe: { win: 1150 }, rings: { T: 820, P: 80, OK: 175 }, mash: { N: 8, L: 2600 }, target: { L: 1000, n: 3 } },
  elite: { hold: { start: 1300, rise: 950, gold: 0.2, perf: 0.06 }, swipe: { win: 1000 }, rings: { T: 720, P: 70, OK: 160 }, mash: { N: 10, L: 2500 }, target: { L: 880, n: 3 } },
  boss: { hold: { start: 1200, rise: 850, gold: 0.17, perf: 0.05 }, swipe: { win: 900 }, rings: { T: 640, P: 62, OK: 145 }, mash: { N: 12, L: 2500 }, target: { L: 780, n: 4 } },
};
const WORDS = { parry: 'Parfait', dodge: 'Bien', none: 'Raté' };
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
export const scoreOf = (list) => { const n = list.reduce((a, r) => a + (r === 'parry' ? 2 : r === 'dodge' ? 1 : 0), 0) / (2 * Math.max(1, list.length)); return n >= 0.84 ? 'parry' : n >= 0.5 ? 'dodge' : 'none'; };

// Calque commun : titre, consigne, minuteur ; les touchers arrivent ici et nulle part ailleurs
function layer(kind, { title, icon = '', hint }) {
  const ov = document.createElement('div');
  ov.className = `qx qx-k-${kind}`;
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-label', title);
  ov.innerHTML = `<div class="qx-head"><b>${icon}${esc(title)}</b><small class="qx-hint">${hint}</small><span class="qx-time"><i></i></span></div><div class="qx-area"></div>`;
  // rien ne doit remonter au jeu (cartes, appui long, défilement, zoom)
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
  ov.addEventListener('touchstart', stop, { passive: false });
  ov.addEventListener('touchmove', stop, { passive: false });
  ov.addEventListener('contextmenu', stop);
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('on'));
  const api = {
    ov, area: ov.querySelector('.qx-area'),
    hint(h) { ov.querySelector('.qx-hint').innerHTML = h; },
    timer(ms) { const i = ov.querySelector('.qx-time i'); i.style.animation = 'none'; void i.offsetWidth; i.style.animation = `qxTime ${ms}ms linear forwards`; ov.classList.add('timing'); },
    stopTimer() { ov.classList.remove('timing'); ov.querySelector('.qx-time i').style.animationPlayState = 'paused'; },
    // petit mot au point touché (Parfait, Bien, Raté…)
    pop(x, y, txt, cls) {
      const p = document.createElement('b'); p.className = `qx-pop ${cls || ''}`; p.textContent = txt;
      p.style.left = `${x}px`; p.style.top = `${y}px`; ov.appendChild(p); setTimeout(() => p.remove(), 700);
    },
    ripple(x, y, cls = '') { const r = document.createElement('i'); r.className = `qx-rip ${cls}`; r.style.left = `${x}px`; r.style.top = `${y}px`; ov.appendChild(r); setTimeout(() => r.remove(), 450); },
    async close(res, words) {
      ov.classList.add('done', `r-${res}`);
      const st = document.createElement('div'); st.className = `qx-stamp s-${res}`; st.innerHTML = `<b>${esc(words[res])}</b>`; ov.appendChild(st);
      await wait(res === 'none' ? 420 : 520);
      ov.classList.remove('on'); setTimeout(() => ov.remove(), 200);
    },
  };
  return api;
}
const fx = (o, r) => { if (r === 'parry') { o.sfx.perfect?.(); hap(2); } else if (r === 'dodge') { o.sfx.hit?.(); hap(1); } else o.sfx.miss?.(); };

/* ——— Garde : maintenir le doigt pour monter la garde, relâcher dans l'or (le trait blanc = parfait) ——— */
export function holdQTE(o) {
  const C = TIERS[o.tier].hold, sc = o.speed || 1;
  return new Promise((resolve) => {
    const L = layer('hold', { title: o.title, icon: o.icon, hint: '<b>Garde le doigt appuyé</b>, puis <b>relâche dans l’or</b>' });
    const tgt = 0.55 + Math.random() * 0.25, a = tgt - C.gold / 2, b = tgt + C.gold / 2, R = 2 * Math.PI * 44;
    const arc = (x0, x1) => `stroke-dasharray="${((x1 - x0) * R).toFixed(1)} ${R.toFixed(1)}" stroke-dashoffset="${(-x0 * R).toFixed(1)}"`;
    L.area.innerHTML = `<div class="qx-gauge"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="trk" cx="50" cy="50" r="44"/><circle class="zg" cx="50" cy="50" r="44" ${arc(a, b)}/><circle class="zp" cx="50" cy="50" r="44" ${arc(tgt - C.perf / 2, tgt + C.perf / 2)}/><circle class="fill" cx="50" cy="50" r="44" stroke-dasharray="0 ${R.toFixed(1)}"/></svg><span class="qx-shield"></span><b class="qx-g-txt">Appuie</b></div>`;
    const fill = L.area.querySelector('.fill'), g = L.area.querySelector('.qx-gauge'), txt = L.area.querySelector('.qx-g-txt');
    let t0 = 0, v = 0, shown = 0, raf = 0, done = false, holding = false;
    L.timer(C.start / sc);
    const late = setTimeout(() => { if (!holding) end('none', 'Trop tard'); }, C.start / sc);
    const level = (ms) => Math.min(1, (ms / (C.rise / sc)) ** 1.35);
    const step = () => {
      v = level(performance.now() - t0); shown = v;
      fill.setAttribute('stroke-dasharray', `${(v * R).toFixed(1)} ${R.toFixed(1)}`);
      g.classList.toggle('near', v >= a && v <= b); g.classList.toggle('hot', Math.abs(v - tgt) <= C.perf / 2);
      if (v >= 1) return end('none', 'Trop haut');
      raf = requestAnimationFrame(step);
    };
    const down = (e) => { if (done || holding) return; e.preventDefault(); try { L.ov.setPointerCapture(e.pointerId); } catch (err) { /* rien */ } holding = true; clearTimeout(late); L.stopTimer(); g.classList.add('held'); txt.textContent = 'Relâche dans l’or'; t0 = performance.now(); hap(1); o.sfx.tap?.(); raf = requestAnimationFrame(step); };
    const up = () => { if (!holding || done) return; holding = false; const x = shown; end(Math.abs(x - tgt) <= C.perf / 2 + 0.008 ? 'parry' : x >= a - 0.008 && x <= b + 0.008 ? 'dodge' : 'none', x < a ? 'Trop tôt' : x > b ? 'Trop tard' : null); };
    function end(r, why) {
      if (done) return; done = true; cancelAnimationFrame(raf); clearTimeout(late);
      L.ov.removeEventListener('pointerdown', down); L.ov.removeEventListener('pointerup', up); L.ov.removeEventListener('pointercancel', up);
      g.classList.add(`r-${r}`); txt.textContent = why || WORDS[r]; fx(o, r);
      L.close(r, { parry: 'Parade parfaite !', dodge: 'Garde levée !', none: 'Garde brisée…' }).then(() => resolve(r));
    }
    L.ov.addEventListener('pointerdown', down); L.ov.addEventListener('pointerup', up); L.ov.addEventListener('pointercancel', up);
  });
}

/* ——— Glisser : une flèche montre le sens ; au signal, glisser vite dans ce sens (n'importe où sur l'écran) ——— */
const DIRS = { l: [-1, 0, 'vers la gauche', 180], r: [1, 0, 'vers la droite', 0], u: [0, -1, 'vers le haut', -90], d: [0, 1, 'vers le bas', 90] };
export function swipeQTE(o) {
  const C = TIERS[o.tier].swipe, sc = o.speed || 1, W = C.win / sc;
  return new Promise((resolve) => {
    const dk = Object.keys(DIRS)[Math.floor(Math.random() * 4)], [dx, dy, words, rot] = DIRS[dk];
    const L = layer('swipe', { title: o.title, icon: o.icon, hint: `Prépare-toi : tu vas <b>glisser ${words}</b>, au signal.` });
    L.area.innerHTML = `<div class="qx-arrow" style="--rot:${rot}deg"><img alt="" src="assets/icons/sw-arrow.webp"><i class="qx-hand d-${dk}"></i></div><b class="qx-go">Glisse !</b>`;
    let t0 = 0, sx = null, sy = null, done = false, timer = 0;
    const end = (r, x, y) => {
      if (done) return; done = true; clearTimeout(timer);
      L.ov.removeEventListener('pointerdown', down); L.ov.removeEventListener('pointermove', move); L.ov.removeEventListener('pointerup', up); L.ov.removeEventListener('pointercancel', up);
      if (x != null) L.pop(x, y, r === 'none' ? 'Mauvais sens' : WORDS[r], `p-${r}`);
      fx(o, r); L.close(r, { parry: 'À l’abri !', dodge: 'Éraflés…', none: 'Touchés…' }).then(() => resolve(r));
    };
    const judge = (x, y) => {
      const mx = x - sx, my = y - sy, d = Math.hypot(mx, my);
      if (d < 26) return false;
      if (!t0) { sx = x; sy = y; L.ov.classList.remove('early'); void L.ov.offsetWidth; L.ov.classList.add('early'); return false; } // avant le signal : on ignore et on attend
      const ok = (mx * dx + my * dy) / d >= 0.6; // dans un cône de ±53° autour du bon sens
      end(!ok ? 'none' : performance.now() - t0 <= W * 0.5 ? 'parry' : 'dodge', x, y);
      return true;
    };
    const down = (e) => { if (done) return; sx = e.clientX; sy = e.clientY; L.ripple(sx, sy); };
    const move = (e) => { if (sx == null || done) return; judge(e.clientX, e.clientY); };
    const up = (e) => { if (sx != null && !done) judge(e.clientX, e.clientY); sx = sy = null; };
    L.ov.addEventListener('pointerdown', down); L.ov.addEventListener('pointermove', move); L.ov.addEventListener('pointerup', up); L.ov.addEventListener('pointercancel', up);
    setTimeout(() => {
      if (done) return;
      t0 = performance.now(); L.ov.classList.add('go'); L.hint(`<b>Maintenant !</b> Glisse ${words}`); L.timer(W); o.sfx.swipe?.(); hap(1);
      timer = setTimeout(() => end('none'), W);
    }, (o.reduced ? 450 : 800) / sc + Math.random() * 250);
  });
}

/* ——— Cercles : plusieurs coups ; pour chacun, toucher quand le cercle d'or se referme sur le cœur blanc ——— */
export function ringsQTE(o, n) {
  const C = TIERS[o.tier].rings, sc = o.speed || 1, T = C.T / sc, P = C.P, OK = C.OK;
  return new Promise((resolve) => {
    const L = layer('rings', { title: o.title, icon: o.icon, hint: `Touche quand le <b>cercle d’or</b> se referme sur le <b>cœur blanc</b> · ${n} coups` });
    L.area.insertAdjacentHTML('beforeend', `<span class="qx-pips">${Array.from({ length: n }, () => '<i></i>').join('')}</span>`);
    const pips = L.area.querySelectorAll('.qx-pips i');
    const res = []; let cur = null, done = false;
    const W = innerWidth, H = innerHeight;
    const ax = Math.min(W - 70, Math.max(70, o.anchor?.x ?? W / 2)), ay = Math.min(H * 0.72, Math.max(H * 0.38, o.anchor?.y ?? H * 0.55));
    const judge = (r, x, y) => {
      if (!cur || cur.done) return; cur.done = true; clearTimeout(cur.to);
      res.push(r); pips[res.length - 1]?.classList.add(`r-${r}`); cur.node.classList.add(`r-${r}`);
      L.pop(x ?? cur.x, (y ?? cur.y) - 50, WORDS[r], `p-${r}`); fx(o, r);
      const node = cur.node; setTimeout(() => node.remove(), 320);
      setTimeout(next, 240 / sc);
    };
    const next = () => {
      if (done) return;
      if (res.length >= n) { done = true; L.ov.removeEventListener('pointerdown', tap); const r = scoreOf(res); L.close(r, { parry: 'Tout paré !', dodge: 'Encaissé…', none: 'Touché…' }).then(() => resolve(r)); return; }
      const x = ax + (Math.random() - 0.5) * Math.min(150, W * 0.4), y = ay + (Math.random() - 0.5) * 120;
      const node = document.createElement('div'); node.className = 'qx-ring';
      node.style.left = `${x}px`; node.style.top = `${y}px`;
      node.innerHTML = '<i class="c"></i><i class="o"></i>';
      L.ov.appendChild(node);
      const ring = node.querySelector('.o');
      // le cercle se referme exactement en T, puis continue un peu (on voit qu'on est en retard)
      ring.animate([{ transform: 'translate(-50%, -50%) scale(3)', opacity: 0.25 }, { opacity: 1, offset: 0.25 }, { transform: 'translate(-50%, -50%) scale(1)', offset: T / (T + OK) }, { transform: 'translate(-50%, -50%) scale(.55)', opacity: 0.2 }], { duration: T + OK, easing: 'linear', fill: 'forwards' });
      cur = { node, x, y, t0: performance.now(), done: false };
      cur.to = setTimeout(() => judge('none'), T + OK);
    };
    const tap = (e) => {
      if (!cur || cur.done || done) return;
      const d = performance.now() - cur.t0 - T;
      L.ripple(e.clientX, e.clientY);
      if (d < -OK) return judge('none', e.clientX, e.clientY); // bien trop tôt : coup raté (on ne peut pas marteler)
      judge(Math.abs(d) <= P ? 'parry' : Math.abs(d) <= OK ? 'dodge' : 'none', e.clientX, e.clientY);
    };
    L.ov.addEventListener('pointerdown', tap);
    setTimeout(next, (o.reduced ? 300 : 550) / sc);
  });
}

/* ——— Marteler : toucher vite, encore et encore (plusieurs doigts comptent), pour remplir la jauge avant la fin ——— */
export function mashQTE(o) {
  const C = TIERS[o.tier].mash, sc = o.speed || 1, Lms = C.L / sc, DECAY = 0.12;
  return new Promise((resolve) => {
    const L = layer('mash', { title: o.title, icon: o.icon, hint: 'Prépare-toi à <b>marteler</b> l’écran…' });
    L.area.innerHTML = `<div class="qx-mash"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="trk" cx="50" cy="50" r="44"/><circle class="fill" cx="50" cy="50" r="44"/></svg><b class="qx-m-n">0 / ${C.N}</b><small>touchers</small></div>`;
    const R = 2 * Math.PI * 44, fill = L.area.querySelector('.fill'), cnt = L.area.querySelector('.qx-m-n'), box = L.area.querySelector('.qx-mash');
    let v = 0, hits = 0, t0 = 0, last = 0, raf = 0, done = false;
    const paint = () => { fill.setAttribute('stroke-dasharray', `${(v * R).toFixed(1)} ${R.toFixed(1)}`); };
    paint();
    const end = (r) => {
      if (done) return; done = true; cancelAnimationFrame(raf); L.ov.removeEventListener('pointerdown', tap);
      box.classList.add(`r-${r}`); fx(o, r);
      L.close(r, { parry: 'Libéré !', dodge: 'De justesse !', none: 'Pris…' }).then(() => resolve(r));
    };
    const step = () => {
      const now = performance.now(), dt = (now - last) / 1000; last = now;
      v = Math.max(0, v - DECAY * dt); paint();
      if (now - t0 >= Lms) return end('none');
      raf = requestAnimationFrame(step);
    };
    const tap = (e) => {
      if (done) return;
      L.ripple(e.clientX, e.clientY, 'mash');
      if (!t0) return; // avant le signal
      hits++; v = Math.min(1, v + 1 / C.N); paint(); cnt.textContent = `${Math.min(hits, C.N)} / ${C.N}`;
      box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump');
      o.sfx.tap?.(); hap(1);
      if (v >= 0.999) end(performance.now() - t0 <= Lms * 0.65 ? 'parry' : 'dodge');
    };
    L.ov.addEventListener('pointerdown', tap);
    setTimeout(() => {
      if (done) return;
      t0 = last = performance.now(); L.ov.classList.add('go'); L.hint('<b>Martèle !</b> Touche vite, avec un ou deux doigts'); L.timer(Lms); o.sfx.swipe?.(); hap(2);
      raf = requestAnimationFrame(step);
    }, (o.reduced ? 350 : 650) / sc);
  });
}

/* ——— Points faibles : des marques s'allument une à une ; touche chacune avant que son cercle ne se referme ——— */
export function targetQTE(o) {
  const C = TIERS[o.tier].target, sc = o.speed || 1, Lms = C.L / sc, n = o.n || C.n;
  return new Promise((resolve) => {
    const L = layer('target', { title: o.title, icon: o.icon, hint: `Touche chaque <b>point faible</b> avant que son cercle ne se referme · ${n} points` });
    L.area.insertAdjacentHTML('beforeend', `<span class="qx-pips">${Array.from({ length: n }, () => '<i></i>').join('')}</span>`);
    const pips = L.area.querySelectorAll('.qx-pips i');
    const W = innerWidth, H = innerHeight, res = [];
    let cur = null, done = false, px = W / 2, py = H * 0.55;
    const judge = (r, x, y) => {
      if (!cur || cur.done) return; cur.done = true; clearTimeout(cur.to);
      res.push(r); pips[res.length - 1]?.classList.add(`r-${r}`); cur.node.classList.add(`r-${r}`);
      L.pop(x ?? cur.x, (y ?? cur.y) - 46, r === 'none' ? 'Trop tard' : WORDS[r], `p-${r}`); fx(o, r);
      const node = cur.node; setTimeout(() => node.remove(), 300);
      setTimeout(next, 160 / sc);
    };
    const next = () => {
      if (done) return;
      if (res.length >= n) { done = true; L.ov.removeEventListener('pointerdown', tap); const r = scoreOf(res); L.close(r, { parry: 'Débusqué !', dodge: 'Touché à temps', none: 'Surpris…' }).then(() => resolve(r)); return; }
      let x, y, k = 0;
      do { x = W * (0.16 + Math.random() * 0.68); y = H * (0.36 + Math.random() * 0.36); } while (Math.hypot(x - px, y - py) < 110 && ++k < 20);
      px = x; py = y;
      const node = document.createElement('div'); node.className = 'qx-mark';
      node.style.left = `${x}px`; node.style.top = `${y}px`;
      node.innerHTML = '<i class="eye"></i><i class="o"></i>';
      L.ov.appendChild(node);
      node.querySelector('.o').animate([{ transform: 'translate(-50%, -50%) scale(2.4)', opacity: 0.4 }, { opacity: 1, offset: 0.2 }, { transform: 'translate(-50%, -50%) scale(.7)', opacity: 1 }], { duration: Lms, easing: 'linear', fill: 'forwards' });
      cur = { node, x, y, t0: performance.now(), done: false };
      cur.to = setTimeout(() => judge('none'), Lms);
    };
    const tap = (e) => {
      if (!cur || cur.done || done) return;
      const d = Math.hypot(e.clientX - cur.x, e.clientY - cur.y);
      if (d > 58) { L.ripple(e.clientX, e.clientY, 'miss'); return; } // à côté : rien de perdu, on peut retoucher
      L.ripple(e.clientX, e.clientY);
      judge(performance.now() - cur.t0 <= Lms * 0.55 ? 'parry' : 'dodge', e.clientX, e.clientY);
    };
    L.ov.addEventListener('pointerdown', tap);
    setTimeout(next, (o.reduced ? 300 : 550) / sc);
  });
}
