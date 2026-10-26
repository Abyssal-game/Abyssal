// v771 : la fin de la Descente, après la première victoire contre l'Abysse (et rejouable : Bestiaire → Histoire, Mode Créateur).
// L'œil se referme, la première page du Bestiaire glisse jusqu'au joueur, les sept noms (le septième gratté) puis le sien,
// celui qui rêve ouvre les yeux, la page scellée de l'Abysse (trophée : elle ne combat jamais), puis l'annonce de l'Arc I.
import { esc, reducedMotion } from '../ui/dom.js';
import { sync } from '../cloud/sync.js';
import { currentUser } from '../cloud/cloud.js';
import { t, LANG } from '../i18n.js';
import { sfx, haptic, hasSample, playVoice, loadVoice, clearVoices, getBytes, listV } from '../ui/sound.js';
import { musicCinema, musicRelease } from '../ui/music.js';

/* v787 : signatures peintes dans la langue de la cinématique (assets/fin/sig-<clé>-<langue>.webp) ; ajouter la langue ici à l'arrivée des images, sinon le français */
const SIG_LANGS = new Set(['en', 'es', 'de', 'it', 'pt']);
const sigSrc = (k, l) => `assets/fin/sig-${k}${l !== 'fr' && SIG_LANGS.has(l) ? '-' + l : ''}.webp`;
const NAMES = [['braise', 'La Scelleuse de Braise'], ['fosses', 'Le Scelleur des Fosses'], ['cieux', 'La Scelleuse des Cieux'], ['bois', 'Le Scelleur des Bois'], ['tombes', 'La Scelleuse des Tombes'], ['montagnes', 'Le Scelleur des Montagnes']]; /* v774 : une signature peinte par Scelleur */

/* la page scellée de l'Abysse : affichée comme une carte, mais jamais dans la collection ni en combat */
export function abyssPageHTML() {
  return `<div class="endx-card"><img alt="" src="assets/fin/carte-abysse.webp"><span class="endx-cn"><b>L’Abysse</b><small>Le plus grand rêve</small></span><span class="endx-tag">Page scellée · Trophée</span></div>`;
}

/* v785 : Mode Créateur → Cinématiques : chaque scène, pour démarrer où on veut */
export const CINE_SCENES = {
  prologue: ['Les royaumes forgent le Bestiaire', 'Les sept gardiens le scellent', 'Gros plan : le sceau', 'La déchirure', 'Le livre éclate', 'Les pages tombent dans l’Abysse', 'Le dernier à savoir lire les sceaux'],
  fin: ['L’œil se referme', 'La page qui glisse', 'Le vélin et les signatures', 'Celui qui rêve', 'Gros plan : les yeux s’ouvrent', 'La page scellée de l’Abysse', 'Arc I · Bientôt'],
};

export function playEnding(app, { name, lang, start } = {}) {
  const who = name || sync.profile?.pseudo || app.game?.s?.name || 'Toi';
  const sigLang = lang || LANG;
  const nameAt = (i) => 0.5 + i * 0.55; /* secondes : apparition de chaque signature */
  const scenes = [
    { cls: 'eye', voice: 'fin-1', snd: ['ci-oeil', 'rumble'], hap: 'heavy', fx: 'motes', hold: 2600, text: 'L’œil se referme.',
      extra: '<div class="endx-eyeanim endx-anim" data-frames="8" data-first="1500" data-step="300" data-last="520"></div>' }, /* v774 : l'œil qui se ferme, 8 images */
    { img: 'page', cls: 'page', tr: 'black', voice: 'fin-2', snd: ['ci-page', 'page'], hap: 'light', fx: 'dust', text: 'Dans le silence, une page glisse jusqu’à toi : la toute première du Bestiaire interdit, celle que personne n’avait jamais vue.' },
    { img: 'velin', cls: 'velin', tr: 'page', voice: 'fin-3', snd: [null, 'page'], fx: 'dust', hold: 5200, text: 'Sept noms y sont signés, ceux des premiers Scelleurs ; le septième a été gratté jusqu’au vélin. Dessous, une ligne d’encre fraîche s’écrit toute seule : c’est ton nom.',
      beats: [...NAMES.map((_, i) => nameAt(i)), nameAt(6), 0.4 + nameAt(7)], /* une plume et une petite vibration par signature */
      extra: `<div class="endx-names">${NAMES.map(([k, n], i) => `<span style="--d:${nameAt(i)}s"><img alt="${esc(n)}" src="${sigSrc(k, sigLang)}"></span>`).join('')}<span class="scr" style="--d:${nameAt(6)}s"><img alt="" src="assets/fin/sig-gratte.webp"></span><span class="me" style="--d:${0.4 + nameAt(7)}s" translate="no">${esc(who)}</span></div>` },
    { img: 'reveur', cls: 'dream', tr: 'ink', fog: true, voice: 'fin-4', snd: ['ci-reveil', 'rumble'], hap: 'heartbeat', fx: 'motes', text: 'Les vingt chapitres sont refermés. Mais au bas de la page, quelque chose vient d’ouvrir les yeux.', extra: '<i class="endx-eyes"></i>' },
    { opt: 'assets/fin/reveil.webp', cls: 'close', tr: 'black', snd: [null, null], hap: 'heartbeat', fx: 'motes', hold: 1400, /* v779 : gros plan animé attendu (Gemini) : les yeux qui s'ouvrent */
      extra: '<div class="endx-close wide endx-anim" data-frames="6" data-first="700" data-step="330" data-last="520" style="background-image:url(assets/fin/reveil.webp);background-size:600% 100%"></div>' },
    { cls: 'trophy', tr: 'flash', voice: 'fin-5', snd: ['ci-trophee', null], fx: 'sparks', hold: 5000, sfx: () => sfx.reveal?.('S'), extra: `<div class="endx-tro"><span class="endx-k">Le dernier rêve</span>${abyssPageHTML()}<p>Tu n’as pas dompté l’Abysse : tu l’as refermé dans une page. Il ne combat pour personne. Il attend celui qui rêve.</p><small>Elle t’attend dans le Bestiaire, onglet Histoire.</small></div>` },
    { cls: 'tease', tr: 'ink', voice: 'fin-6', snd: [null, 'sheet'], hap: 'success', fx: 'motes', auto: false, extra: `<div class="endx-arc"><span class="endx-k">Arc I</span><h2>La Première Veille</h2><p>Celui qui rêve est réveillé. Le Bestiaire n’est pas encore fini.</p><b class="endx-soon">Bientôt</b><button class="btn gold" data-endx="close">Fermer</button></div>` },
  ];
  return playScenes(app, scenes, { dir: 'fin', music: 'fin', skipTo: scenes.findIndex((x) => x.cls === 'trophy'), lang, start });
}

/* v793 : la fin se joue à CHAQUE victoire contre l'Abysse (étage 100) ; si l'app est fermée ou coupée pendant
   la cinématique, elle est rejouée au lancement suivant (abyssal.endPending, effacé à la fin de la cinématique) */
const END_PENDING = 'abyssal.endPending';
export function playEndingSure(app) {
  try { localStorage.setItem(END_PENDING, JSON.stringify({ at: Date.now(), owner: currentUser()?.id || null })); } catch (e) { /* stockage indisponible */ }
  return playEnding(app).then(() => { try { localStorage.removeItem(END_PENDING); } catch (e) { /* idem */ } });
}
export function resumeEnding(app, tries = 0) {
  let p = null;
  try { p = JSON.parse(localStorage.getItem(END_PENDING) || 'null'); } catch (e) { p = null; }
  if (!p) return;
  if (Date.now() - (p.at || 0) > 30 * 864e5 || (p.owner && currentUser()?.id && p.owner !== currentUser().id)) { try { localStorage.removeItem(END_PENDING); } catch (e) { /* rien */ } return; }
  if ((p.owner && !currentUser()) || document.body.classList.contains('gated') || document.body.classList.contains('battle-mode') || document.querySelector('.gate, .sheet-wrap, .opening, .dv, .bx-intro, .endx, #boot')) { if (tries < 60) setTimeout(() => resumeEnding(app, tries + 1), 1500); return; }
  playEndingSure(app).then(() => app.refresh?.());
}

/* v775 : le prologue, au tout premier lancement (avant le guide de bienvenue) ; revisible dans Bestiaire → Histoire */
export function playPrologue(app, { lang, start } = {}) {
  const scenes = [
    { img: 'p1', cam: 'in', voice: 'pro-1', snd: ['ci-forge', 'rumble'], hap: 'heavy', fx: 'embers', text: 'Les sept royaumes ont forgé le Bestiaire interdit pour enfermer ce qui ne devait plus marcher sous le ciel.' },
    { img: 'p2b', tr: 'ink', cam: 'up', voice: 'pro-2', hap: 'double', fx: 'dust', text: 'Sept gardiens, un par royaume, l’ont scellé de leur main. Ce furent les premiers Scelleurs.' },
    { opt: 'assets/prologue/sceau.webp', cls: 'close', tr: 'black', snd: ['ci-sceller', null], hap: 'medium', fx: 'embers', hold: 1300, /* v779 : gros plan animé attendu (Gemini) : la cire du sceau */
      extra: '<div class="endx-close endx-anim" data-frames="8" data-first="500" data-step="230" data-last="380" style="background-image:url(assets/prologue/sceau.webp)"></div>' },
    /* v784 : la déchirure en un seul temps : le narrateur parle pendant que les mains se posent sur le livre (image 2 tenue),
       puis, sa phrase finie, le livre se déchire : bruitage, éclair, vibration et pages, une seule fois */
    { cls: 'close tear', tr: 'black', voice: 'pro-3', fx: ['pages'], hold: 1500, text: 'Une nuit, quelqu’un l’a déchiré.',
      climax: { snd: ['ci-dechirer', 'rip'], hitAt: 2, hap: 'shatter' },
      extra: '<div class="endx-close endx-anim" data-frames="8" data-first="650" data-step="240" data-last="520" data-wait="1" style="background-image:url(assets/prologue/dechirure.webp)"></div>' },
    { img: 'p3', tr: 'fade', cam: 'shake', hap: 'medium', fx: ['pages', 'ash'], hold: 2200 },
    { img: 'p4', cls: 'top', tr: 'page', cam: 'down', fog: true, voice: 'pro-4', snd: ['ci-chute', 'rumble'], hap: 'heavy', fx: ['pages', 'ash'], hold: 3800, text: 'Ses pages se sont envolées, et ses vingt chapitres sont tombés dans l’Abysse. Quelque chose les attendait.' },
    { img: 'p5', cls: 'last', tr: 'ink', cam: 'out', fog: true, voice: 'pro-5', snd: ['ci-abime', 'page'], hap: 'heartbeat', fx: 'motes', auto: false, text: 'Tu es le dernier à savoir lire les sceaux. Descends, et referme-les.', after: '<button class="btn gold endx-go" data-endx="close">Commencer</button>' },
  ];
  return playScenes(app, scenes, { dir: 'prologue', music: 'prologue', lang, start });
}

/* ——— v779 : lecteur des cinématiques ———
   Chaque scène : image (lente caméra), brume, particules, texte écrit à l'encre lettre après lettre, bruitage (enregistré si livré,
   sinon l'ancien), vibration, voix du narrateur (si elle existe dans la langue du joueur), transition propre, puis passage tout seul
   (un toucher termine le texte, puis passe à la suite). Les scènes « opt » (gros plans animés) ne sont jouées que si leur image existe. */
const LETTER_MS = 26, TEXT_DELAY = 700;
let voiceSet = null;
const voices = () => (voiceSet ||= getBytes(`assets/voix/manifest.json${listV()}`).then((b) => new Set(JSON.parse(new TextDecoder().decode(b)))).catch(() => new Set()));
/* v785 : langue de la cinématique (celle du jeu, ou une autre choisie dans le Mode Créateur, sans changer celle du jeu) */
let CUR = LANG, DICT = null;
const lt = (s) => (CUR === LANG ? t(s) : CUR === 'fr' ? s : (DICT?.[s] ?? s));
const voiceUrl = (id) => `assets/voix/${CUR}/${id}.mp3`;
/* textes posés en français dans le code (boutons, titres des scènes) : traduits dans la langue choisie */
function localize(root) {
  if (CUR === LANG) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const k = n.nodeValue.trim(); if (!k || n.parentNode.closest('.endx-t, [translate="no"].me')) continue;
    const v = lt(k); if (v !== k) n.nodeValue = n.nodeValue.replace(k, v);
  }
  root.querySelectorAll('[alt]').forEach((a) => { const v = lt(a.alt); if (v) a.alt = v; });
}
const probe = (src) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(true); im.onerror = () => ok(false); im.src = src; });

/* le texte, déjà traduit, lettre par lettre (les mots ne se coupent jamais) */
function inkHTML(text) {
  let n = 0;
  return lt(text).split(/( )/).map((w) => (w === ' ' ? ' ' : `<span class="w">${[...w].map((ch) => `<i style="--i:${n++}">${esc(ch)}</i>`).join('')}</span>`)).join('');
}
const inkMs = (text) => TEXT_DELAY + [...lt(text)].length * LETTER_MS;

async function playScenes(app, scenes, { dir, skipTo = -1, music = null, lang = null, start = 0 }) {
  CUR = lang && lang !== LANG ? lang : LANG; DICT = null;
  if (CUR !== LANG && CUR !== 'fr') { try { DICT = (await import(`../i18n/${CUR}.js`)).default; } catch (e) { DICT = null; } }
  return new Promise((done) => {
    const rm = reducedMotion(app.game?.s?.settings);
    const light = document.documentElement.classList.contains('fx-light');
    const el = document.createElement('div');
    el.className = 'endx';
    if (CUR !== LANG) { el.setAttribute('translate', 'no'); el.lang = CUR; }
    const main = scenes.filter((s) => !s.opt);
    el.innerHTML = `<div class="endx-prog">${main.map(() => '<i><b></b></i>').join('')}</div><button class="endx-skip" data-endx="skip">Passer</button>`;
    scenes.forEach((s) => { if (s.opt) probe(s.opt).then((ok) => { s.ok = ok; }); });
    const vs = voices();
    let i = -1, busy = false, written = false, voiceOn = false, closed = false;
    let node = null, wrT = 0, autoT = 0, beatT = [], vh = null, stopFx = null, token = 0, release = null, held = false;
    const play = ([k, alt] = []) => { try { if (k && hasSample(k)) sfx[k]?.(); else if (alt) sfx[alt]?.(); } catch (e) { /* son facultatif */ } };
    const prog = () => {
      const k = main.indexOf(scenes[i]); if (k < 0) return; /* gros plan : la barre ne bouge pas */
      el.querySelectorAll('.endx-prog i').forEach((x, j) => { x.className = j < k ? 'on' : j === k ? 'cur' : ''; x.firstChild.style.animationDuration = ''; });
    };
    const maybeAuto = () => {
      const s = scenes[i];
      if (!written || voiceOn || closed || s.auto === false || autoT) return;
      const ms = s.hold ?? 3400;
      const bar = el.querySelector('.endx-prog i.cur b');
      if (bar) { bar.style.animationDuration = `${ms}ms`; bar.parentNode.classList.add('run'); }
      autoT = setTimeout(() => { autoT = 0; next(true); }, ms);
    };
    const finishText = () => {
      if (written) return;
      /* v784 : scène à temps fort : un toucher fait éclater la déchirure ; la scène se termine avec la dernière image */
      if (held) { node?.classList.add('written'); release?.(); return; }
      clearTimeout(wrT); written = true;
      node?.classList.add('written'); maybeAuto();
    };
    const show = () => {
      const s = scenes[i], my = ++token;
      clearTimeout(wrT); clearTimeout(autoT); autoT = 0; beatT.forEach(clearTimeout); beatT = [];
      vh?.stop(); vh = null; voiceOn = false; written = false; release = null; held = false;
      stopFx?.(); stopFx = null;
      const old = node;
      node = document.createElement('div');
      const tr = rm ? 'fade' : (s.tr || 'fade');
      node.className = `endx-s ${s.cls || ''} tr-${tr}${s.cam && !rm ? ` cam-${s.cam}` : ''}${rm ? ' written' : ''}`;
      node.innerHTML = `${s.img ? `<img class="endx-bg" alt="" src="assets/${dir}/${s.img}.webp">` : ''}${s.fog && !light ? '<i class="endx-fog"></i>' : ''}${s.fx && !rm ? '<canvas class="endx-fx"></canvas>' : ''}${s.extra || ''}${s.text ? `<p class="endx-t ink" translate="no">${inkHTML(s.text)}</p>` : ''}${s.after || ''}${s.auto === false ? '' : '<span class="endx-tap">Touche pour continuer</span>'}`;
      el.insertBefore(node, el.querySelector('.endx-prog'));
      localize(node);
      if (old) { old.classList.add('gone'); setTimeout(() => old.remove(), 1300); }
      if (tr === 'flash') { const f = document.createElement('i'); f.className = 'endx-flash'; el.appendChild(f); setTimeout(() => f.remove(), 1100); }
      prog();
      try { s.sfx?.(); } catch (e) { /* son facultatif */ }
      if (s.snd) play(s.snd);
      if (s.hap) haptic(s.hap);
      (s.beats || []).forEach((sec) => beatT.push(setTimeout(() => { if (hasSample('ci-plume')) sfx['ci-plume'](); haptic('tick'); }, sec * 1000)));
      const startFx = () => { if (s.fx && !rm) { const cv = node.querySelector('.endx-fx'); requestAnimationFrame(() => { if (my === token && !stopFx) stopFx = runFx(cv, [].concat(s.fx), light); }); } };
      const c = s.climax;
      if (!c) startFx();
      node.querySelectorAll('.endx-anim').forEach((a) => {
        if (!c) return sprite(a, rm);
        held = true;
        release = sprite(a, rm, {
          release: () => { if (my === token) play(c.snd); },
          frame: (f) => {
            if (my !== token || f !== c.hitAt) return;
            haptic(c.hap); startFx();
            const fl = document.createElement('i'); fl.className = 'endx-flash'; el.appendChild(fl); setTimeout(() => fl.remove(), 1100);
          },
          end: () => { if (my !== token) return; held = false; finishText(); },
        });
      });
      /* la scène suivante se prépare : image et voix */
      const nx = scenes.slice(i + 1).find((x) => !x.opt || x.ok);
      if (nx?.img) new Image().src = `assets/${dir}/${nx.img}.webp`;
      if (s.voice) {
        voiceOn = true;
        vs.then((set) => {
          if (my !== token) return;
          if (!set.has(`${CUR}/${s.voice}`)) { voiceOn = false; setTimeout(() => { if (my === token) release?.(); }, s.text ? inkMs(s.text) + 300 : 600); maybeAuto(); return; }
          if (nx?.voice && set.has(`${CUR}/${nx.voice}`)) loadVoice(voiceUrl(nx.voice));
          playVoice(voiceUrl(s.voice)).then((h) => {
            if (my !== token) { h?.stop(); return; }
            if (!h) { voiceOn = false; release?.(); maybeAuto(); return; }
            vh = h; setTimeout(() => { if (my === token) { voiceOn = false; vh = null; release?.(); maybeAuto(); } }, h.ms + 250);
          });
        });
      }
      /* fin de l'écriture : le texte, et le gros plan animé (l'œil) jusqu'à sa dernière image */
      if (!held) wrT = setTimeout(finishText, rm ? 600 : Math.max(s.text ? inkMs(s.text) : 400, animMs(node) + 400));
    };
    const next = (auto) => {
      if (closed || (busy && !auto)) return;
      let j = i + 1;
      while (j < scenes.length && scenes[j].opt && !scenes[j].ok) j++;
      if (j >= scenes.length) return close();
      busy = true; i = j; show(); setTimeout(() => { busy = false; }, 900);
    };
    const close = () => {
      if (closed) return; closed = true;
      clearTimeout(wrT); clearTimeout(autoT); beatT.forEach(clearTimeout);
      vh?.stop(); stopFx?.(); clearVoices();
      if (music) musicRelease();
      CUR = LANG; DICT = null;
      el.classList.add('out'); setTimeout(() => { el.remove(); done(); }, 400);
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-endx]');
      if (b?.dataset.endx === 'close') return close();
      if (b?.dataset.endx === 'skip') {
        if (skipTo >= 0 && i < skipTo) { i = skipTo - 1; busy = false; return next(); }
        return close();
      }
      if (!written) return finishText();
      clearTimeout(autoT); autoT = 0;
      next();
    });
    document.body.appendChild(el);
    localize(el);
    if (music) musicCinema(music);
    if (start > 0) i = Math.min(start, scenes.length - 1) - 1; /* v785 : départ à une scène choisie (Mode Créateur) */
    next();
  });
}

/* durée d'un gros plan animé (pour attendre la dernière image avant de passer) */
function animMs(node) {
  const a = node.querySelector('.endx-anim'); if (!a) return 0;
  const n = +a.dataset.frames || 8;
  return (+a.dataset.first || 0) + (n - 2) * (+a.dataset.step || 300) + (+a.dataset.last || 0);
}
/* planche d'images (bande horizontale) jouée image par image ; la première image est tenue un moment */
function sprite(a, rm, hooks = {}) {
  const n = +a.dataset.frames || 8, step = +a.dataset.step || 300, last = +a.dataset.last || step;
  const wait = a.dataset.wait != null ? +a.dataset.wait : -1;
  const at = (f) => { a.style.backgroundPositionX = `${(f / (n - 1)) * 100}%`; };
  let f = 0, released = wait < 0, parked = false;
  /* v784 : data-wait = image tenue jusqu'à ce que la scène relâche l'animation (fin de la voix, toucher) */
  const go = () => {
    if (!a.isConnected || f >= n - 1) return;
    f++; at(f); hooks.frame?.(f);
    if (f === n - 1) { setTimeout(() => hooks.end?.(), last); return; }
    if (!released && f === wait) { parked = true; return; }
    setTimeout(go, f === n - 2 ? last : step);
  };
  const release = () => { if (released) return; released = true; hooks.release?.(); if (parked) { parked = false; go(); } };
  if (rm) { release(); at(n - 1); hooks.frame?.(n - 1); hooks.end?.(); return release; }
  setTimeout(go, +a.dataset.first || 0);
  return release;
}

/* ——— particules (un canevas par scène) ——— */
const GLOW = {};
function glow(rgb) {
  if (GLOW[rgb]) return GLOW[rgb];
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.25, `rgba(${rgb},.7)`); g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  return (GLOW[rgb] = c);
}
const R = (a, b) => a + Math.random() * (b - a);
const FX = {
  embers: { n: 34, rgb: '255,140,60', add: true, make: (W, H, f) => ({ x: R(0, W), y: f ? R(0, H) : H + 10, vy: -R(22, 70), sw: R(6, 22), ph: R(0, 6), s: R(1.4, 3.4), a: R(0.5, 1) }),
    step: (p, dt, W, H, t) => { p.y += p.vy * dt; p.x += Math.sin(t * 1.6 + p.ph) * p.sw * dt; p.k = 0.55 + 0.45 * Math.sin(t * 9 + p.ph); if (p.y < -12) p.dead = 1; } },
  motes: { n: 26, rgb: '185,130,255', add: true, make: (W, H, f) => ({ x: R(0, W), y: f ? R(0, H) : H + 8, vy: -R(5, 16), sw: R(4, 12), ph: R(0, 6), s: R(1, 2.6), a: R(0.35, 0.85) }),
    step: (p, dt, W, H, t) => { p.y += p.vy * dt; p.x += Math.sin(t * 0.7 + p.ph) * p.sw * dt; p.k = 0.6 + 0.4 * Math.sin(t * 2 + p.ph); if (p.y < -10) p.dead = 1; } },
  dust: { n: 30, rgb: '255,222,165', add: true, make: (W, H) => ({ x: R(0, W), y: R(0, H), vx: R(-7, 7), vy: R(-5, 3), ph: R(0, 6), s: R(0.8, 2), a: R(0.25, 0.7) }),
    step: (p, dt, W, H, t) => { p.x += p.vx * dt; p.y += p.vy * dt; p.k = 0.5 + 0.5 * Math.sin(t * 1.3 + p.ph); if (p.x < -5 || p.x > W + 5 || p.y < -5 || p.y > H + 5) p.dead = 1; } },
  sparks: { n: 24, rgb: '255,215,120', add: true, make: (W, H) => ({ x: W / 2 + R(-0.38, 0.38) * W, y: H * 0.45 + R(-0.32, 0.32) * H, life: R(0.8, 2.2), age: 0, s: R(1, 2.8), a: 1 }),
    step: (p, dt) => { p.age += dt; p.k = Math.sin(Math.min(1, p.age / p.life) * Math.PI); if (p.age > p.life) p.dead = 1; } },
  ash: { n: 22, rgb: '175,165,185', make: (W, H, f) => ({ x: R(0, W), y: f ? R(0, H) : -8, vy: R(14, 34), sw: R(8, 20), ph: R(0, 6), s: R(1, 2.4), a: R(0.3, 0.6) }),
    step: (p, dt, W, H, t) => { p.y += p.vy * dt; p.x += Math.sin(t + p.ph) * p.sw * dt; p.k = 1; if (p.y > H + 8) p.dead = 1; } },
  pages: { n: 14, paper: true, make: (W, H, f) => ({ x: R(0, W), y: f ? R(-H * 0.2, H) : -20, vx: R(-14, 14), vy: R(30, 75), r: R(0, 6), vr: R(-2, 2), fl: R(0, 6), vf: R(2, 5), w: R(7, 15), a: R(0.6, 0.9) }),
    step: (p, dt, W, H) => { p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.fl += p.vf * dt; if (p.y > H + 24) p.dead = 1; } },
  burst: { n: 22, paper: true, once: true, make: (W, H) => { const an = R(0, Math.PI * 2), sp = R(140, 320); return { x: W / 2 + R(-20, 20), y: H * 0.42 + R(-20, 20), vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 60, r: R(0, 6), vr: R(-7, 7), fl: R(0, 6), vf: R(5, 11), w: R(6, 13), a: 0.95 }; },
    step: (p, dt, W, H) => { p.vx *= 1 - 1.4 * dt; p.vy = p.vy * (1 - 1.4 * dt) + 90 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.fl += p.vf * dt; if (p.y > H + 24 || p.x < -30 || p.x > W + 30) p.dead = 1; } },
};
function runFx(cv, kinds, light) {
  if (!cv) return null;
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  const c = cv.getContext('2d');
  const ps = [];
  kinds.forEach((k) => { const K = FX[k]; if (!K) return; const n = Math.round(K.n * (light ? 0.45 : 1)); for (let j = 0; j < n; j++) ps.push(Object.assign(K.make(W, H, true), { K })); });
  let raf = 0, last = performance.now(), t0 = last;
  const loop = (now) => {
    if (!cv.isConnected) return;
    raf = requestAnimationFrame(loop);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000), tt = (now - t0) / 1000; last = now;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    for (let j = ps.length - 1; j >= 0; j--) {
      const p = ps[j], K = p.K;
      K.step(p, dt, W, H, tt);
      if (p.dead) { if (K.once) { ps.splice(j, 1); continue; } Object.assign(p, K.make(W, H, false), { dead: 0, K }); }
      if (K.paper) {
        const sx = Math.cos(p.fl);
        c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.scale(sx || 0.05, 1);
        c.globalAlpha = p.a; c.globalCompositeOperation = 'source-over';
        c.fillStyle = sx > 0 ? '#EDE2C6' : '#B9A985'; c.fillRect(-p.w / 2, -p.w * 0.65, p.w, p.w * 1.3);
        c.restore();
      } else {
        c.globalAlpha = p.a * (p.k ?? 1); c.globalCompositeOperation = K.add ? 'lighter' : 'source-over';
        const z = p.s * 6; c.drawImage(glow(K.rgb), p.x - z / 2, p.y - z / 2, z, z);
      }
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}
