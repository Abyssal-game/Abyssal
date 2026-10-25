import { VERSION } from '../config.js';
// Effets sonores : fichiers enregistrés (assets/sfx, ElevenLabs) joués par Web Audio. Les sons synthétisés ci-dessous ne
// servent plus que pour « rip » et « rumble » (sans fichier) : depuis la v308, rien de synthétisé pendant le chargement.
// Chaîne : chaque son → (sec + réverbération de salle) → compresseur → volume général.
// Les sons sont faits de couches : transitoire (le « clic » du contact), corps (le grave), queue (la résonance).
// Petites variations aléatoires de hauteur pour que les sons répétés ne sonnent pas mécaniques.
let ctx = null, endG = null, master = null, bus = null, verb = null, enabled = true, volume = 0.7, haptics = true, loud = false;
// Branchements de la musique (js/ui/music.js) : baisse de la musique pendant les grands moments
export const hooks = { duck: null };
let noiseBuf = null, brownBuf = null, voices = 0;
const MAX_VOICES = 48;

function ensure() {
  if (!enabled) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume * 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    endG = ctx.createGain(); endG.connect(ctx.destination); /* v622 : sortie commune (sons et musique), coupée en fondu */
    comp.connect(master).connect(endG);
    bus = ctx.createGain(); bus.connect(comp);
    // Réverbération : réponse impulsionnelle générée (bruit stéréo qui décroît), comme une crypte
    verb = ctx.createConvolver();
    verb.buffer = impulse(2.4, 2.8);
    const wet = ctx.createGain(); wet.gain.value = 0.32;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 180;
    verb.connect(hp).connect(wet).connect(comp);
    noiseBuf = makeNoise(false); brownBuf = makeNoise(true);
    // iPhone : l'audio peut être suspendu en revenant dans l'app
    // app en arrière-plan : tout est suspendu (batterie)
    document.addEventListener('visibilitychange', () => { if (document.hidden) audioQuiet(); else audioWake(); });
    /* v622 : app quittée depuis les applications récentes : le son est coupé en fondu dès que l'app passe en retrait */
    window.addEventListener('pagehide', audioQuiet);
    window.addEventListener('blur', () => { if (window.Capacitor?.isNativePlatform?.()) audioQuiet(); });
    window.addEventListener('focus', () => { if (!document.hidden) audioWake(); });
    loadSamples(); // v308 : tous les sons sont chargés dès le premier toucher
  }
  if (ctx.state !== 'running' || (endG.gain.value < 1 && !document.hidden)) audioWake();
  return ctx;
}

/* v622 (le propriétaire : « quand je quitte l'app en la retirant des applications récentes, ça fait une sorte de bip ») :
   le son était suspendu d'un coup, en pleine onde, puis l'iPhone fermait l'app : coupure sèche = petit « bip » / claquement.
   Désormais le volume général descend à zéro en 40 ms, puis le son est suspendu ; au retour, il remonte en douceur. */
let quietT = 0;
export function audioQuiet() {
  if (!ctx || !endG) return;
  if (document.hidden || window.Capacitor?.isNativePlatform?.()) needKick = true;
  clearTimeout(quietT);
  try { const t = ctx.currentTime; endG.gain.cancelScheduledValues(t); endG.gain.setValueAtTime(endG.gain.value, t); endG.gain.linearRampToValueAtTime(0, t + 0.04); } catch (e) { /* rien */ }
  quietT = setTimeout(() => { if (ctx.state === 'running') ctx.suspend().catch(() => {}); }, 70);
}
export function audioWake() {
  if (!ctx || !endG) return;
  clearTimeout(quietT);
  const up = () => { try { const t = ctx.currentTime; endG.gain.cancelScheduledValues(t); endG.gain.setValueAtTime(endG.gain.value, t); endG.gain.linearRampToValueAtTime(1, t + 0.12); } catch (e) { /* rien */ } };
  if (ctx.state !== 'running') ctx.resume().then(up).catch(() => {}); else up();
  /* v662 : si la relance ne répond pas (son « interrompu » au retour), on garde la main au prochain toucher */
  setTimeout(() => { if (ctx.state !== 'running') needKick = true; else if (endG.gain.value < 0.5 && !document.hidden) up(); }, 600);
}
export function configureSound({ sound, volume: v, haptics: h, loud: l }) {
  enabled = sound !== false;
  if (typeof v === 'number') volume = v;
  haptics = h !== false; loud = !!l;
  setHapLevel(Number(arguments[0]?.hapLevel ?? 1));
  if (master) master.gain.value = volume * 0.9;
  // iPhone (iOS 17+) : « playback » joue même quand le bouton silencieux est activé
  // v369 : dans l'application iPhone, toujours « playback » (sinon « ambient » ici annulait le réglage de l'app : jeu muet)
  const native = !!window.Capacitor?.isNativePlatform?.();
  try { if (navigator.audioSession) navigator.audioSession.type = loud || native ? 'playback' : 'ambient'; } catch (e) { /* rien */ }
}
// Contexte audio partagé avec la musique (créé au premier toucher)
export function audioCtx() { return ensure(); }
export const audioCtxIfAny = () => ctx;
export const audioOut = () => endG || ctx?.destination; /* v622 : la musique passe aussi par la sortie commune */
// v370 : déblocage robuste (iPhone, surtout dans l'application) : à chaque fin de toucher, si le son est suspendu
// ou interrompu, on le relance et on joue un échantillon muet (geste accepté par WebKit)
let unlocking = false, needKick = false;
/* v662 (le propriétaire : « je sors de l'app sans la fermer, je reviens : plus de son ») : au retour, l'iPhone laisse
   souvent le son « interrompu » ; sa relance peut ne jamais répondre, et l'ancien déblocage restait alors bloqué pour
   toujours (unlocking jamais remis à faux). Désormais : au premier toucher après un retour, le son est relancé
   (suspendu puis repris s'il se dit déjà en marche, cas où WebKit reste muet), avec un délai de secours, et on
   réessaie à chaque toucher tant qu'il n'est pas reparti. */
const kick = () => {
  if (!ctx || unlocking) return;
  if (ctx.state === 'running' && !needKick) return;
  unlocking = true;
  const t0 = setTimeout(() => { unlocking = false; }, 900);
  const done = () => { clearTimeout(t0); unlocking = false; if (ctx.state === 'running') { needKick = false; if (!document.hidden) audioWake(); } };
  try { const b = ctx.createBuffer(1, 1, 22050), src = ctx.createBufferSource(); src.buffer = b; src.connect(ctx.destination); src.start(0); } catch (e) { /* rien */ }
  const p = ctx.state === 'running' ? ctx.suspend().then(() => ctx.resume()) : ctx.resume();
  p.catch(() => {}).finally(done);
};
if (typeof document !== 'undefined') ['touchstart', 'touchend', 'click', 'keydown'].forEach((t) => document.addEventListener(t, kick, { capture: true, passive: true }));
// v370 : état du son, affiché dans Réglages → À propos (diagnostic sur téléphone)
export function audioInfo() {
  return { state: ctx ? ctx.state : 'pas encore créé', samples: Object.keys(samples).length, expected: sampleList ? sampleList.size : null, diag: audioDiag, session: navigator.audioSession ? navigator.audioSession.type : 'sans objet', enabled, volume };
}

// Vibrations. Android : navigator.vibrate. iPhone (iOS 18+) : Safari n'a pas de vibration pour le web,
// mais basculer un interrupteur natif (<input type=checkbox switch>) produit un petit retour haptique.
let hapEl = null;
function hapOnce() {
  if (!hapEl) {
    hapEl = document.createElement('label');
    hapEl.setAttribute('aria-hidden', 'true');
    hapEl.style.cssText = 'position:fixed;left:-200px;top:0;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none';
    const i = document.createElement('input'); i.type = 'checkbox'; i.setAttribute('switch', ''); i.tabIndex = -1;
    hapEl.appendChild(i); document.body.appendChild(hapEl);
    hapEl.addEventListener('click', (e) => e.stopPropagation());
  }
  hapEl.click();
}
/* v705 : un vocabulaire de vibrations. Dans l'app, le moteur du téléphone (Capacitor Haptics) :
   sel = petit cran (comme une molette), L / M / H = choc léger, moyen, fort, ok / warn / err = réussite, alerte, échec.
   Chaque retour est une suite [délai en ms, pas]. Intensité (Réglages) : 0 discrète (ni crans ni chocs légers),
   1 normale, 2 intense (chaque pas monte d'un cran). Sur le site : navigator.vibrate (Android), sinon l'interrupteur. */
const HSEQ = {
  tick: [[0, 'sel']], light: [[0, 'L']], medium: [[0, 'M']], heavy: [[0, 'H']],
  success: [[0, 'ok']], warning: [[0, 'warn']], error: [[0, 'err']],
  double: [[0, 'M'], [90, 'M']],
  tear: [[0, 'L'], [45, 'L'], [90, 'M']],
  hurt: [[0, 'M'], [70, 'L']],
  parry: [[0, 'H'], [50, 'L']],
  crit: [[0, 'H'], [70, 'M']],
  shatter: [[0, 'H'], [60, 'H'], [150, 'M']],
  death: [[0, 'M'], [120, 'L']],
  ult: [[0, 'M'], [80, 'H'], [200, 'M']],
  boss: [[0, 'H'], [220, 'M'], [440, 'H']],
  fury: [[0, 'warn'], [180, 'H'], [300, 'H']],
  heartbeat: [[0, 'M'], [150, 'L'], [700, 'M'], [850, 'L']],
  chest: [[0, 'M'], [240, 'ok']],
  victory: [[0, 'ok'], [200, 'M'], [330, 'H']],
  bossvictory: [[0, 'H'], [130, 'H'], [300, 'ok'], [520, 'H']],
  defeat: [[0, 'err'], [320, 'L']],
  rareHR: [[0, 'M'], [110, 'L']],
  rareM: [[0, 'M'], [170, 'M'], [340, 'H']],
  rareS: [[0, 'L'], [130, 'M'], [260, 'M'], [390, 'H'], [560, 'H'], [760, 'ok']],
};
const HUP = { sel: 'L', L: 'M', M: 'H', H: 'H' };
const HWEIGHT = { sel: 0, L: 1, M: 2, H: 3, ok: 2, warn: 2, err: 3 };
const HVIB = { sel: 8, L: 14, M: 24, H: 40, ok: [18, 60, 28], warn: [30, 70, 30], err: [40, 50, 40, 50, 40] };
let hapLevel = 1, hapLast = 0, hapLastW = -1, selReady = false;
export function setHapLevel(n) { hapLevel = n === 0 || n === 2 ? n : 1; }
const nativeHaptics = () => (typeof window !== 'undefined' ? window.Capacitor?.Plugins?.Haptics : null);
function hapStep(step) {
  if (hapLevel === 0 && (step === 'sel' || step === 'L')) return;
  if (hapLevel === 2 && HUP[step]) step = HUP[step];
  const H = nativeHaptics();
  try {
    if (H) {
      if (step === 'sel') {
        if (!selReady) { selReady = true; H.selectionStart?.(); }
        H.selectionChanged?.();
      } else if (step === 'ok' || step === 'warn' || step === 'err') H.notification({ type: step === 'ok' ? 'SUCCESS' : step === 'warn' ? 'WARNING' : 'ERROR' });
      else H.impact({ style: step === 'H' ? 'HEAVY' : step === 'M' ? 'MEDIUM' : 'LIGHT' });
      return;
    }
    if (navigator.vibrate) { navigator.vibrate(HVIB[step]); return; }
    if (enabled && HWEIGHT[step] >= 1) hapOnce();
  } catch (e) { /* rien */ }
}
/* un retour par nom ; un retour plus faible arrivé dans les 60 ms d'un autre est sauté (pas de bouillie de vibrations) */
export function haptic(kind) {
  if (!haptics) return;
  const seq = HSEQ[kind]; if (!seq) return;
  const w = Math.max(...seq.map(([, s]) => HWEIGHT[s]));
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - hapLast < 60 && w <= hapLastW) return;
  hapLast = now; hapLastW = w;
  for (const [t, s] of seq) { if (t) setTimeout(() => hapStep(s), t); else hapStep(s); }
}
// 1 = léger, 2 = moyen, 3 = fort (appels plus anciens)
export function hap(n = 1) { if (n > 0) haptic(n >= 3 ? 'heavy' : n === 2 ? 'medium' : 'light'); }
// Rythme de vibrations (motif en ms : vibration, pause, vibration…), comme navigator.vibrate
export function hapPattern(pattern) {
  if (!haptics) return;
  let t = 0;
  pattern.forEach((ms, i) => { if (i % 2 === 0) { const st = ms >= 60 ? 'H' : ms >= 35 ? 'M' : 'L'; setTimeout(() => hapStep(st), t); } t += ms; });
}

function impulse(sec, decay) {
  const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay) * (i < 200 ? i / 200 : 1);
  }
  return b;
}
function makeNoise(brown) {
  const n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return b;
}
const rnd = (a, b) => a + Math.random() * (b - a);
const vary = (f, k = 0.04) => f * (1 + rnd(-k, k));

// Sortie d'une voix : panoramique, part de réverbération, libération automatique
function out(node, { pan = 0, wet = 0.5, dur = 1 } = {}) {
  let n = node;
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; n.connect(p); n = p; }
  n.connect(bus);
  if (wet > 0) { const s = ctx.createGain(); s.gain.value = wet; n.connect(s).connect(verb); }
  voices++; setTimeout(() => { voices--; }, (dur + 0.2) * 1000);
}
// Enveloppe : montée rapide, descente exponentielle
function env(g, t, { gain, attack = 0.005, dur = 0.3, hold = 0 }) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  if (hold) g.gain.setValueAtTime(gain, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + dur);
}
const busy = () => voices > MAX_VOICES;

// Oscillateur (avec glissement de hauteur et filtre passe-bas optionnels)
function osc(freq, { type = 'sine', dur = 0.3, gain = 0.2, attack = 0.005, hold = 0, delay = 0, to = 0, glide = null, lp = 0, lpTo = 0, q = 0.7, detune = 0, pan = 0, wet = 0.4, vib = 0 } = {}) {
  const c = ensure(); if (!c || busy()) return;
  const t = c.currentTime + delay, end = attack + hold + dur;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + (glide ?? end));
  if (vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = vib; lg.gain.value = freq * 0.012; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + end + 0.05); }
  let n = o;
  if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = q; f.frequency.setValueAtTime(lp, t); if (lpTo) f.frequency.exponentialRampToValueAtTime(lpTo, t + end); n.connect(f); n = f; }
  n.connect(g); env(g, t, { gain, attack, dur, hold });
  out(g, { pan, wet, dur: end + delay });
  o.start(t); o.stop(t + end + 0.05);
}
// Bruit filtré (souffle, frottement, éclat) ; type : lowpass | highpass | bandpass
function noise({ dur = 0.3, gain = 0.2, type = 'bandpass', freq = 1200, to = 0, q = 0.8, attack = 0.003, hold = 0, delay = 0, brown = false, pan = 0, wet = 0.3, rate = 1 } = {}) {
  const c = ensure(); if (!c || busy()) return;
  const t = c.currentTime + delay, end = attack + hold + dur;
  const s = c.createBufferSource(); s.buffer = brown ? brownBuf : noiseBuf; s.playbackRate.value = rate;
  const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + end);
  const g = c.createGain(); env(g, t, { gain, attack, dur, hold });
  s.connect(f).connect(g); out(g, { pan, wet, dur: end + delay });
  s.start(t, Math.random() * 1.5); s.stop(t + end + 0.05);
}
// Coup sourd (grosse caisse) : sinus dont la hauteur chute très vite
function thump(freq = 110, { to = 40, dur = 0.35, gain = 0.5, delay = 0, wet = 0.15 } = {}) {
  osc(freq, { dur, gain, to, glide: dur * 0.6, delay, wet, attack: 0.002 });
}
// Cloche / métal (synthèse FM) : ratio non entier = son métallique
function bell(freq, { dur = 1.2, gain = 0.12, ratio = 3.5, index = 2.2, delay = 0, pan = 0, wet = 0.6, attack = 0.002 } = {}) {
  const c = ensure(); if (!c || busy()) return;
  const t = c.currentTime + delay;
  const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
  car.frequency.value = freq; mod.frequency.value = freq * ratio;
  mg.gain.setValueAtTime(freq * index, t); mg.gain.exponentialRampToValueAtTime(Math.max(1, freq * 0.05), t + dur);
  mod.connect(mg).connect(car.frequency);
  car.connect(g); env(g, t, { gain, attack, dur });
  out(g, { pan, wet, dur: dur + delay });
  car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
}
// Nappe (accord de dents de scie désaccordées, filtre qui s'ouvre) : chœur, cuivres, tension
function pad(freqs, { dur = 1.2, gain = 0.05, attack = 0.25, delay = 0, lp = 600, lpTo = 2400, wet = 0.7, type = 'sawtooth' } = {}) {
  freqs.forEach((f, i) => [-9, 9].forEach((dt) => osc(f, { type, dur, gain, attack, delay: delay + i * 0.01, lp, lpTo, detune: dt, wet, pan: dt > 0 ? 0.25 : -0.25 })));
}
// Souffle qui passe (mouvement rapide), de gauche à droite
function whoosh({ dur = 0.25, gain = 0.18, from = 500, to = 2600, delay = 0, q = 1.4, pan = 0 } = {}) {
  noise({ dur, gain: gain * 4, freq: from, to, q, attack: dur * 0.45, delay, pan, wet: 0.25 });
}
// Grésillement : grains brefs aléatoires (déchirure, éclats, dés)
function grains(n, { span = 0.3, freq = 3000, spread = 1500, gain = 0.1, dur = 0.02, delay = 0, q = 3, wet = 0.2, accel = 0 } = {}) {
  for (let i = 0; i < n; i++) {
    const x = i / Math.max(1, n - 1);
    const at = delay + span * (accel ? Math.pow(x, 1 + accel) : Math.random());
    noise({ dur: dur * rnd(0.6, 1.4), gain: gain * rnd(0.5, 1), freq: freq + rnd(-spread, spread), q, delay: at, wet, pan: rnd(-0.4, 0.4) });
  }
}
// Distorsion douce : pour les rugissements et les impacts lourds
let curve = null;
function grit(freq, { dur = 0.6, gain = 0.15, to = 0, lp = 900, delay = 0, vib = 0, wet = 0.4 } = {}) {
  const c = ensure(); if (!c || busy()) return;
  if (!curve) { const k = 30, n = 1024; curve = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; curve[i] = ((3 + k) * x * 20 * Math.PI / 180) / (Math.PI + k * Math.abs(x)); } }
  const t = c.currentTime + delay;
  const o = c.createOscillator(), o2 = c.createOscillator(), ws = c.createWaveShaper(), f = c.createBiquadFilter(), g = c.createGain();
  ws.curve = curve;
  o.type = 'sawtooth'; o2.type = 'square'; o.frequency.setValueAtTime(freq, t); o2.frequency.setValueAtTime(freq * 0.501, t);
  if (to) { o.frequency.exponentialRampToValueAtTime(to, t + dur); o2.frequency.exponentialRampToValueAtTime(to * 0.501, t + dur); }
  if (vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = vib; lg.gain.value = freq * 0.04; l.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency); l.start(t); l.stop(t + dur + 0.05); }
  f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = 1.2;
  const m = c.createGain(); m.gain.value = 0.5;
  o.connect(m); o2.connect(m); m.connect(ws).connect(f).connect(g);
  env(g, t, { gain, attack: 0.03, dur });
  out(g, { wet, dur: dur + delay });
  o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
}

// Gammes (Hz) : ré mineur, sombre mais noble
const N = { D3: 146.8, F3: 174.6, A3: 220, C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392, A4: 440, Bb4: 466.2, C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784, A5: 880, C6: 1046.5, D6: 1174.7, E6: 1318.5, F6: 1396.9, A6: 1760 };
const REVEAL = {
  C: [N.A5], PC: [N.D5, N.A5], R: [N.D5, N.F5, N.A5, N.D6],
  HR: [N.D5, N.F5, N.A5, N.C6, N.D6], M: [N.D4, N.A4, N.D5, N.F5, N.A5, N.D6], S: [N.D4, N.A4, N.D5, N.E5, N.A5, N.D6, N.F6],
};

export const sfx = {
  // ——— Interface ———
  // v439 : sons enregistrés seulement (ElevenLabs), sans repli synthétisé
  gavel() {}, cancel() {}, page() {}, 'en-coin'() {}, /* v465 : pièce posée aux Enchères */
  /* v457 : sons propres au Pacte (pa-) et aux Cryptes (cr-) ; v463 : ceux des Trois Autels retirés avec le jeu */
  'pa-draw'() {}, 'pa-bust'() {}, 'pa-seal'() {}, 'pa-guard'() {}, 'pa-offer'() {}, 'pa-seven'() {}, 'pa-bank'() {}, 'cr-flip'() {}, 'cr-pair'() {}, 'cr-miss'() {}, 'cr-power'() {}, 'vd-tear'() {}, 'vd-flip'() {}, 'vd-rare'() {}, 'vd-win'() {}, 'vd-lose'() {}, /* v561 : sons du Choc des Boosters (ElevenLabs) */
  tap() { noise({ dur: 0.03, gain: 0.5, freq: vary(3200, 0.1), q: 1.2, wet: 0.05 }); osc(vary(1500, 0.05), { dur: 0.05, gain: 0.1, to: 900, wet: 0.05 }); },
  error() { osc(N.A3, { type: 'triangle', dur: 0.14, gain: 0.12, lp: 900, wet: 0.15 }); osc(N.F3, { type: 'triangle', dur: 0.22, gain: 0.12, lp: 700, delay: 0.1, wet: 0.2 }); },
  coin() { bell(vary(N.A6 * 0.75, 0.02), { dur: 0.35, gain: 0.14, ratio: 2.76, index: 1.2 }); bell(N.A6, { dur: 0.5, ratio: 2.76, index: 1.2, delay: 0.06, pan: 0.2, gain: 0.12 }); noise({ dur: 0.12, gain: 0.04, type: 'highpass', freq: 7000, delay: 0.04 }); },
  discover() { whoosh({ dur: 0.25, gain: 0.12, from: 600, to: 2400 }); },
  achievement() {
    [N.D4, N.F4, N.A4, N.D5].forEach((f, i) => osc(f, { type: 'sawtooth', dur: i === 3 ? 0.8 : 0.18, gain: 0.07, attack: 0.02, lp: 700, lpTo: 2600, delay: i * 0.11, wet: 0.5 }));
    bell(N.D6, { dur: 1.4, gain: 0.06, ratio: 2, index: 1, delay: 0.33 }); thump(90, { delay: 0.33, gain: 0.3 });
  },
  // ——— Boosters ———
  tear() { grains(26, { span: 0.38, freq: 3800, spread: 2200, gain: 0.12, q: 1.5, accel: 0.4 }); noise({ dur: 0.4, gain: 0.08, type: 'highpass', freq: 2500, to: 6000, attack: 0.05 }); thump(80, { gain: 0.35, delay: 0.32 }); bell(N.D6, { dur: 1, gain: 0.04, ratio: 2, index: 0.6, delay: 0.34 }); },
  flip() { whoosh({ dur: 0.09, gain: 0.12, from: 1400, to: 4200, q: 1.1 }); noise({ dur: 0.035, gain: 0.35, freq: 2600, q: 1.2, delay: 0.08, wet: 0.1 }); },
  rip(p = 0) { grains(3, { span: 0.05, freq: 2600 + p * 2600, spread: 800, gain: 0.3, q: 1.2 }); },
  swipe() { whoosh({ dur: 0.22, gain: 0.14, from: vary(500), to: 3000, pan: rnd(-0.3, 0.3) }); },
  reveal(r) {
    const notes = REVEAL[r] || REVEAL.C, big = r === 'M' || r === 'S';
    notes.forEach((f, i) => bell(f, { dur: big ? 2.6 : 1.3, gain: big ? 0.07 : notes.length < 3 ? 0.16 : 0.1, ratio: 2, index: big ? 1.4 : 0.9, delay: i * (big ? 0.08 : 0.06), pan: (i % 2 ? 0.25 : -0.25) }));
    if (r === 'R' || r === 'HR') noise({ dur: 0.9, gain: 0.04, type: 'highpass', freq: 6000, attack: 0.1, wet: 0.8 });
    if (r === 'HR') { pad([N.D4, N.A4], { dur: 1.2, gain: 0.025, lp: 500, lpTo: 2000 }); thump(70, { gain: 0.35 }); }
    if (big) {
      thump(60, { to: 30, dur: 0.9, gain: 0.6 }); pad([N.D3, N.A3, N.D4, N.F4], { dur: 2.4, gain: 0.03, attack: 0.15, lp: 400, lpTo: 3000 });
      noise({ dur: 2, gain: 0.05, type: 'highpass', freq: 7000, attack: 0.3, wet: 0.9 });
      if (r === 'S') bell(N.A6, { dur: 3, gain: 0.05, ratio: 3.01, index: 2, delay: 0.5 });
    }
  },
  rumble(sec = 1) { noise({ dur: sec * 0.3, gain: 0.25, type: 'lowpass', freq: 90, to: 260, attack: sec * 0.7, brown: true, wet: 0.3 }); osc(40, { dur: sec * 0.3, gain: 0.25, attack: sec * 0.7, to: 60, vib: 7 }); grains(Math.round(8 * sec), { span: sec, freq: 900, spread: 500, gain: 0.04, q: 1 }); },
  // ——— Combat : coups ———
  hit() { thump(vary(120), { gain: 0.4 }); noise({ dur: 0.1, gain: 0.18, type: 'lowpass', freq: 2200, wet: 0.15 }); },
  slash() {
    const p = rnd(-0.3, 0.3);
    noise({ dur: 0.13, gain: 0.22, type: 'bandpass', freq: vary(6500, 0.1), to: 1800, q: 1.2, attack: 0.02, pan: p, wet: 0.2 });
    noise({ dur: 0.05, gain: 0.2, type: 'lowpass', freq: 1600, delay: 0.07, wet: 0.1 }); thump(vary(140), { to: 60, dur: 0.16, gain: 0.3, delay: 0.07 });
    bell(vary(2400, 0.08), { dur: 0.25, gain: 0.025, ratio: 1.41, index: 3, delay: 0.07, pan: p });
  },
  smash() {
    thump(95, { to: 32, dur: 0.55, gain: 0.7 });
    noise({ dur: 0.35, gain: 0.3, type: 'lowpass', freq: 1800, to: 300, wet: 0.35 });
    grit(70, { dur: 0.3, gain: 0.1, to: 40, lp: 500 });
    grains(10, { span: 0.4, delay: 0.05, freq: 1400, spread: 900, gain: 0.05, q: 1 });
  },
  pose() { thump(130, { to: 70, dur: 0.12, gain: 0.35, wet: 0.1 }); noise({ dur: 0.06, gain: 0.12, type: 'lowpass', freq: 900, wet: 0.1 }); },
  capture() { whoosh({ dur: 0.2, gain: 0.12, from: 800, to: 5000 }); bell(N.D6, { dur: 0.7, gain: 0.06, ratio: 2, index: 1, delay: 0.12 }); bell(N.A6, { dur: 0.8, gain: 0.04, ratio: 2, index: 1, delay: 0.18 }); },
  dodge() { const p = rnd(-0.6, 0.6); whoosh({ dur: 0.22, gain: 0.2, from: 350, to: 3600, q: 1.8, pan: p }); whoosh({ dur: 0.16, gain: 0.08, from: 1800, to: 700, delay: 0.14, pan: -p }); },
  miss() { thump(100, { to: 55, dur: 0.25, gain: 0.25 }); whoosh({ dur: 0.25, gain: 0.08, from: 1200, to: 300 }); },
  block() { noise({ dur: 0.03, gain: 0.25, type: 'highpass', freq: 3000, wet: 0.1 }); bell(vary(520, 0.03), { dur: 0.7, gain: 0.1, ratio: 1.41, index: 4 }); bell(vary(1360, 0.03), { dur: 0.45, gain: 0.05, ratio: 1.73, index: 3 }); thump(110, { dur: 0.15, gain: 0.25 }); },
  parry() {
    noise({ dur: 0.04, gain: 0.35, type: 'highpass', freq: 4000, wet: 0.2 });
    bell(1800, { dur: 1.6, gain: 0.12, ratio: 1.41, index: 5 }); bell(2700, { dur: 1.2, gain: 0.06, ratio: 1.73, index: 3, pan: 0.3 });
    whoosh({ dur: 0.3, gain: 0.08, from: 6000, to: 1500, delay: 0.02 }); thump(140, { dur: 0.15, gain: 0.3 });
  },
  crit() {
    thump(80, { to: 30, dur: 0.5, gain: 0.55 }); noise({ dur: 0.25, gain: 0.22, type: 'lowpass', freq: 3000, to: 500 });
    [N.D5, N.A5, N.D6].forEach((f, i) => bell(f, { dur: 1.1, gain: 0.06, ratio: 2, index: 1.5, delay: 0.04 + i * 0.05, pan: i - 1 }));
  },
  fumble() { osc(N.A3, { type: 'triangle', dur: 0.4, gain: 0.14, to: N.D3, lp: 800, wet: 0.4 }); thump(90, { to: 45, dur: 0.3, gain: 0.3, delay: 0.05 }); },
  shatter() {
    thump(70, { to: 30, dur: 0.6, gain: 0.6 });
    noise({ dur: 0.5, gain: 0.25, type: 'highpass', freq: 2500, to: 8000, wet: 0.5 });
    for (let i = 0; i < 14; i++) bell(rnd(2200, 7000), { dur: rnd(0.3, 0.9), gain: 0.03, ratio: rnd(1.3, 2.9), index: 2, delay: rnd(0, 0.35), pan: rnd(-0.7, 0.7), wet: 0.6 });
    grains(16, { span: 0.45, freq: 5000, spread: 2500, gain: 0.07, q: 2 });
  },
  // ——— Combat : magie et états ———
  skill() { whoosh({ dur: 0.35, gain: 0.12, from: 300, to: 5000, q: 2 }); bell(N.A5, { dur: 0.9, gain: 0.05, ratio: 2, index: 1.5, delay: 0.25 }); osc(N.D4, { type: 'sawtooth', dur: 0.4, gain: 0.03, lp: 400, lpTo: 3000, attack: 0.2, wet: 0.6 }); },
  heal() { [N.D5, N.F5, N.A5, N.D6].forEach((f, i) => bell(f, { dur: 1.1, gain: 0.05, ratio: 2, index: 0.7, delay: i * 0.07, pan: (i - 1.5) * 0.25 })); noise({ dur: 0.7, gain: 0.03, type: 'highpass', freq: 6500, attack: 0.15, wet: 0.9 }); },
  poison() {
    for (let i = 0; i < 6; i++) osc(rnd(180, 480), { dur: 0.06, gain: 0.08, to: rnd(500, 900), glide: 0.05, delay: i * rnd(0.04, 0.08), lp: 1200, wet: 0.25 });
    noise({ dur: 0.45, gain: 0.07, type: 'bandpass', freq: 500, q: 4, attack: 0.1, wet: 0.3 });
  },
  freeze() {
    noise({ dur: 0.5, gain: 0.12, type: 'highpass', freq: 8000, to: 3000, attack: 0.02, wet: 0.5 });
    [3100, 4200, 5300].forEach((f, i) => bell(f, { dur: 0.9, gain: 0.03, ratio: 2.4, index: 1.5, delay: i * 0.05, pan: i - 1 }));
    grains(10, { span: 0.35, freq: 6000, spread: 1500, gain: 0.05, q: 4 });
  },
  enter() { whoosh({ dur: 0.2, gain: 0.1, from: 600, to: 3200 }); thump(120, { to: 60, dur: 0.14, gain: 0.25, delay: 0.16 }); bell(N.D5, { dur: 0.6, gain: 0.04, ratio: 2, index: 1, delay: 0.16 }); },
  summon() { whoosh({ dur: 0.45, gain: 0.1, from: 200, to: 4000 }); bell(N.D5, { dur: 1, gain: 0.06, ratio: 2, index: 1, delay: 0.35 }); thump(80, { delay: 0.35, gain: 0.3 }); },
  death() {
    osc(N.D3, { type: 'sawtooth', dur: 0.9, gain: 0.06, to: 55, lp: 700, lpTo: 150, detune: -12, wet: 0.6 });
    osc(N.F3, { type: 'sawtooth', dur: 0.9, gain: 0.05, to: 60, lp: 700, lpTo: 150, detune: 12, wet: 0.6 });
    noise({ dur: 0.8, gain: 0.08, type: 'lowpass', freq: 1200, to: 200, attack: 0.05, wet: 0.5 }); thump(70, { to: 30, dur: 0.5, gain: 0.35 });
  },
  boss() {
    grit(55, { dur: 1.1, gain: 0.16, to: 42, lp: 700, vib: 6 });
    noise({ dur: 1, gain: 0.14, type: 'bandpass', freq: 320, to: 180, q: 1.5, attack: 0.08, brown: true, wet: 0.5 });
    thump(55, { to: 28, dur: 0.9, gain: 0.55 }); osc(36, { dur: 1.2, gain: 0.25, attack: 0.1 });
  },
  ult() {
    noise({ dur: 0.1, gain: 0.12, type: 'bandpass', freq: 400, to: 6000, q: 2, attack: 0.55, wet: 0.4 });
    osc(N.D3, { type: 'sawtooth', dur: 0.15, gain: 0.05, to: N.D4, attack: 0.55, lp: 300, lpTo: 2500, wet: 0.4 });
    thump(70, { to: 28, dur: 0.9, gain: 0.7, delay: 0.6 });
    pad([N.D4, N.A4, N.D5, N.F5], { dur: 1.6, gain: 0.03, attack: 0.05, delay: 0.6, lp: 900, lpTo: 4000 });
    [N.D6, N.A5, N.F6].forEach((f, i) => bell(f, { dur: 2, gain: 0.05, ratio: 2, index: 1.6, delay: 0.62 + i * 0.07, pan: i - 1 }));
  },
  dice() { grains(9, { span: 0.55, freq: 2600, spread: 900, gain: 0.16, dur: 0.018, q: 2.5, accel: 1.2, wet: 0.15 }); thump(160, { to: 110, dur: 0.06, gain: 0.15, delay: 0.55 }); },
  // ——— Navigation ———
  nav() { whoosh({ dur: 0.16, gain: 0.05, from: vary(900), to: 2400, q: 0.9 }); noise({ dur: 0.05, gain: 0.06, type: 'lowpass', freq: 700, delay: 0.1, wet: 0.2 }); },
  sheet() { whoosh({ dur: 0.18, gain: 0.06, from: 600, to: 1800, q: 0.8 }); grains(4, { span: 0.12, freq: 2200, spread: 900, gain: 0.03, q: 1.2 }); },
  fury() {
    noise({ dur: 0.45, gain: 0.16, type: 'bandpass', freq: 300, to: 2400, q: 0.9, attack: 0.04, brown: true, wet: 0.3 });
    grit(82, { dur: 0.5, gain: 0.12, to: 55, lp: 800 }); grains(12, { span: 0.4, freq: 2800, spread: 1500, gain: 0.05, q: 1.5, delay: 0.05 });
    thump(90, { to: 35, dur: 0.4, gain: 0.45, delay: 0.05 });
  },
  // ——— Fins de combat ———
  victory() {
    thump(70, { gain: 0.5 }); thump(70, { gain: 0.45, delay: 0.18 });
    [N.D4, N.A4, N.D5].forEach((f, i) => osc(f, { type: 'sawtooth', dur: 0.2, gain: 0.06, attack: 0.02, lp: 900, lpTo: 2400, delay: 0.18 + i * 0.12, wet: 0.5 }));
    pad([N.D4, N.F4, N.A4, N.D5], { dur: 1.4, gain: 0.035, attack: 0.04, delay: 0.54, lp: 1200, lpTo: 3500 });
    bell(N.D6, { dur: 2, gain: 0.06, ratio: 2, index: 1.2, delay: 0.54 }); thump(60, { to: 30, dur: 0.8, gain: 0.55, delay: 0.54 });
  },
  // Identités des créatures : passif qui agit, bouclier, renfort, provocation, marque
  passive() { bell(N.A5, { dur: 0.7, gain: 0.06, ratio: 2.4, index: 1.1 }); bell(N.E6, { dur: 0.6, gain: 0.04, ratio: 2, index: 0.8, delay: 0.06 }); grains(5, { span: 0.15, freq: 5200, spread: 1400, gain: 0.05, delay: 0.02 }); },
  shield() { bell(vary(392, 0.03), { dur: 0.9, gain: 0.1, ratio: 1.5, index: 2.6, wet: 0.5 }); noise({ dur: 0.25, gain: 0.06, freq: 900, to: 2400, q: 1.2, attack: 0.08 }); },
  boost() { [N.D5, N.A5, N.D6].forEach((f, i) => osc(f, { type: 'triangle', dur: 0.32, gain: 0.05, delay: i * 0.06, wet: 0.4 })); whoosh({ dur: 0.3, gain: 0.08, from: 400, to: 2600, q: 1.6 }); },
  taunt() { grit(N.D3 * 0.5, { dur: 0.7, gain: 0.12, to: N.A3 * 0.5, lp: 700, vib: 6 }); thump(80, { to: 45, dur: 0.4, gain: 0.35 }); },
  mark() { bell(N.F6, { dur: 0.5, gain: 0.05, ratio: 3, index: 1.5 }); noise({ dur: 0.08, gain: 0.08, type: 'highpass', freq: 4000 }); },
  // Moments propres (v214) : un son enregistré peut les remplacer ; sinon, une variante synthétisée
  bossvictory() { sfx.victory(); }, // victoire contre un gardien (fichier bossvictory.mp3 s'il est livré)
  levelup() { [N.D5, N.A5, N.D6].forEach((f, i) => bell(f, { dur: 0.8, gain: 0.07, ratio: 2, index: 0.9, delay: i * 0.08 })); whoosh({ dur: 0.3, gain: 0.08, from: 400, to: 3000 }); },
  burn() { sfx.rumble(0.8); },
  burnall() { sfx.rumble(1.2); },
  chest() { sfx.rumble(1.3); },
  unlock() { sfx.discover(); },
  apogee() { sfx.achievement(); },
  fame() { sfx.achievement(); },
  season() { sfx.achievement(); },
  // v263 : sons propres au combat chacun son tour et aux synergies (un fichier livré les remplace ; sinon une variante synthétisée)
  yourturn() { bell(N.D5, { dur: 0.7, gain: 0.07, ratio: 2, index: 1 }); bell(N.A5, { dur: 0.9, gain: 0.06, ratio: 2, index: 1, delay: 0.08, pan: 0.2 }); whoosh({ dur: 0.25, gain: 0.07, from: 500, to: 3000 }); },
  enemyturn() { grit(N.D3 * 0.5, { dur: 0.5, gain: 0.1, to: N.A3 * 0.5, lp: 600 }); thump(70, { to: 35, dur: 0.4, gain: 0.35 }); },
  actor() { bell(N.A5, { dur: 0.35, gain: 0.05, ratio: 2, index: 0.8 }); noise({ dur: 0.03, gain: 0.2, freq: 3000, q: 1.2 }); },
  pa() { bell(N.E6, { dur: 0.3, gain: 0.035, ratio: 2, index: 0.6 }); },
  synergy() { sfx.crit(); },
  chain() { sfx.crit(); },
  finisher() { sfx.smash(); },
  explode() { sfx.smash(); sfx.shatter(); },
  enrage() { sfx.fury(); },
  perfect() { sfx.parry(); },
  recover() { osc(N.D3, { type: 'sawtooth', dur: 0.5, gain: 0.04, to: N.A3, lp: 500, lpTo: 1500, wet: 0.4 }); thump(90, { gain: 0.2, delay: 0.3 }); },
  suspense() { sfx.rumble(0.6); },
  suspensebig() { sfx.rumble(1.3); },
  revealRise() { sfx.rumble(1.3); }, // v720 : montée de la Mythique / Secrète pendant la charge (fichiers reveal-m-full, reveal-s-full)
  defeat() {
    pad([N.D3, N.F3, N.A3], { dur: 2.2, gain: 0.04, attack: 0.3, lp: 700, lpTo: 200 });
    bell(98, { dur: 3, gain: 0.12, ratio: 1.41, index: 3, delay: 0.1, wet: 0.8 }); thump(55, { to: 28, dur: 1, gain: 0.5, delay: 0.1 });
  },
};

// ——— Sons enregistrés (assets/sfx/<clé>.mp3) ———
/* v468 : sur le site, la liste porte le numéro de version (jamais une ancienne copie du navigateur) ; pas dans l'app */
export const listV = () => (/^https?:/.test(location.protocol) ? `?v=${VERSION}` : '');
// La liste des fichiers livrés est dans assets/sfx/manifest.json. Un son enregistré remplace son équivalent
// synthétisé ; sans fichier (ou sans réseau), le son synthétisé reste joué. Clés de l'ouverture de carte :
// reveal-c, reveal-pc, reveal-r, reveal-hr, reveal-m, reveal-s (une par rareté).
const samples = {}; let sampleList = null, sampleLoad = null;
// v371 : lecture d'un fichier local robuste (application iPhone : fetch, sinon XMLHttpRequest) et diagnostic
export const audioDiag = { got: 0, failGet: 0, failDecode: 0, err: '' };
const viaXhr = (url) => new Promise((ok, ko) => { const x = new XMLHttpRequest(); x.open('GET', url); x.responseType = 'arraybuffer'; x.onload = () => (x.response && x.response.byteLength ? ok(x.response) : ko(new Error(`XHR ${x.status}`))); x.onerror = () => ko(new Error('XHR erreur')); x.send(); });
export async function getBytes(url) {
  try { const r = await fetch(url); if (r.ok) { const b = await r.arrayBuffer(); if (b.byteLength) return b; } throw new Error(`fetch ${r.status}`); }
  catch (e) { try { return await viaXhr(url); } catch (e2) { audioDiag.failGet++; audioDiag.err = `${url.split('/').pop()} : ${e.message} / ${e2.message}`; throw e2; } }
}
export function decodeBytes(b) {
  return new Promise((ok, ko) => {
    let p;
    try { p = ctx.decodeAudioData(b, ok, ko); } catch (e) { ko(e); return; }
    if (p && p.then) p.then(ok, ko);
  }).then((buf) => { audioDiag.got++; return buf; }, (e) => { audioDiag.failDecode++; audioDiag.err = `décodage : ${e?.message || e}`; throw e; });
}
function loadSamples() {
  if (sampleLoad || !ctx) return;
  sampleLoad = getBytes(`assets/sfx/manifest.json${listV()}`).then((b) => JSON.parse(new TextDecoder().decode(b))).catch((e) => { audioDiag.err = `liste : ${e.message}`; return []; }).then((list) => {
    sampleList = new Set(list);
    list.forEach((k) => getBytes(`assets/sfx/${k}.mp3`).then(decodeBytes).then((buf) => { if (buf) samples[k] = buf; }).catch(() => {}));
  });
}
// Un son par rareté (reveal-c, reveal-pc, reveal-r, reveal-hr, reveal-m, reveal-s) ;
// sans fichier pour une rareté, on prend le plus proche en dessous, puis le son synthétisé
const REVEAL_UP = ['C', 'PC', 'R', 'HR', 'M', 'S'];
const sampleKey = (k, a) => {
  if (k === 'discover') return 'sheet'; // v290 : l'ancien carillon « discover » sonnait comme un bip, remplacé partout par un froissement doux
  if (k === 'actor') return 'sheet'; // v308 : « actor » (tour d'une créature) était un bip mesuré (raies pures vers 2 kHz)
  if (k !== 'reveal') return k;
  for (let i = Math.max(0, REVEAL_UP.indexOf(a[0])); i >= 0; i--) { const key = `reveal-${REVEAL_UP[i].toLowerCase()}`; if (samples[key]) return key; }
  return 'reveal-c';
};
// v308 (audit audio mesuré à l'ffmpeg) : volume propre à certains fichiers, et aigus adoucis pour ceux qui sonnaient comme des bips
const SAMPLE_GAIN = { 'reveal-c': 7, chest: 1.4, tear: 1.4, bossvictory: 1.26, 'reveal-s': 1.5, 'reveal-s-full': 1.5, 'reveal-m': 1.2, 'reveal-m-full': 1.2, // v720 : nouveaux sons ElevenLabs (v329 : 2,2 pour l'ancien) : la Secrète doit claquer (demande du propriétaire) ; le compresseur du bus évite la saturation
  unlock: 1.6, 'pa-bank': 3, 'cr-miss': 2, 'cr-flip': 1.6, 'pa-guard': 1.3 }; /* v439 */
const SAMPLE_LOWPASS = { yourturn: 1200, passive: 1200, mark: 1400 };
const lastPlay = {}, playing = {};
let risenAt = -1e9;
function playSample(key, gain = 1) {
  const buf = samples[key];
  if (!buf || !ensure()) return false;
  // anti-rebond : pas deux fois le même son à moins de 45 ms, ni plus de 3 fois en même temps
  const now = ctx.currentTime;
  if (now - (lastPlay[key] ?? -1) < 0.045 || (playing[key] || 0) >= 3) return true;
  lastPlay[key] = now; playing[key] = (playing[key] || 0) + 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.04; // petite variation : moins mécanique
  src.onended = () => { playing[key] = Math.max(0, (playing[key] || 1) - 1); };
  const g = ctx.createGain(); g.gain.value = 0.9 * (SAMPLE_GAIN[key] || 1) * gain;
  let out = src;
  if (SAMPLE_LOWPASS[key]) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = SAMPLE_LOWPASS[key]; lp.Q.value = 0.5; out = src.connect(lp); }
  out.connect(g); g.connect(bus); src.start();
  return true;
}
// sons sans fichier : seuls ceux-là restent synthétisés (bruits, jamais des notes)
const SYNTH_ONLY = new Set(['rip', 'rumble']);

// Vibrations associées (v705 : nom du retour, voir HSEQ) et baisse de la musique pendant les grands moments
const HAP = {
  tap: 'tick', nav: 'tick', swipe: 'tick', coin: 'tick', mark: 'tick', heal: 'tick', dodge: 'tick', 'cr-flip': 'tick',
  flip: 'light', discover: 'light', hit: 'light', slash: 'light', pose: 'light', block: 'light', skill: 'light', poison: 'light', freeze: 'light',
  shield: 'light', taunt: 'light', dice: 'light', burn: 'light', enter: 'light', enemyturn: 'light', yourturn: 'light', synergy: 'light', chain: 'light',
  'pa-draw': 'light', 'en-coin': 'light', 'cr-miss': 'light', 'vd-flip': 'light', boost: 'light',
  smash: 'medium', capture: 'medium', summon: 'medium', explode: 'medium', burnall: 'medium', 'cr-power': 'medium', 'pa-seal': 'medium', 'pa-guard': 'medium', 'pa-bank': 'medium', 'pa-offer': 'medium',
  'cr-pair': 'double', miss: 'hurt', tear: 'tear', 'vd-tear': 'tear', parry: 'parry', crit: 'crit', perfect: 'crit', finisher: 'crit', shatter: 'shatter', death: 'death',
  ult: 'ult', boss: 'boss', fury: 'fury', enrage: 'warning', suspensebig: 'heartbeat', revealRise: 'heartbeat', chest: 'chest', gavel: 'heavy', 'vd-rare': 'heavy',
  victory: 'victory', 'vd-win': 'victory', 'pa-seven': 'success', bossvictory: 'bossvictory', defeat: 'defeat', 'vd-lose': 'defeat', 'pa-bust': 'error', error: 'error',
  achievement: 'success', levelup: 'success', unlock: 'success', apogee: 'success', fame: 'success', season: 'success',
};
const DUCK = { revealRise: 5.5, bossvictory: 5, victory: 3.5, defeat: 4, ult: 2.5, achievement: 2, boss: 2, apogee: 2.5, fame: 2, season: 2 };
for (const k of Object.keys(sfx)) {
  const f = sfx[k];
  sfx[k] = (...a) => {
    if (k === 'reveal') { const big = a[0] === 'M' || a[0] === 'S'; if (big || a[0] === 'HR') { hooks.duck?.(a[0] === 'S' ? 5 : big ? 3.5 : 2, a[0] === 'S' ? 0.08 : 0.25); } haptic(a[0] === 'S' ? 'rareS' : a[0] === 'M' ? 'rareM' : a[0] === 'HR' ? 'rareHR' : a[0] === 'R' ? 'light' : a[0] === 'PC' ? 'tick' : ''); }
    else { if (HAP[k]) haptic(HAP[k]); if (DUCK[k]) hooks.duck?.(DUCK[k]); }
    // un son ne doit jamais bloquer le jeu (v265) : toute erreur audio est ignorée
    try {
      if (!ensure()) return undefined;
      loadSamples();
      if (k === 'reveal' && a[1]?.risen && performance.now() - risenAt < 8000) return undefined; // v720 : le son monté pendant la charge (revealRise) joue déjà
      const key = k === 'revealRise' ? `reveal-${String(a[0]).toLowerCase()}-full` : sampleKey(k, a);
      if (playSample(key, k === 'actor' ? 0.6 : 1)) { if (k === 'revealRise') risenAt = performance.now(); return undefined; }
      // v308 : fichier pas encore chargé (ou introuvable) : silence plutôt qu'un son synthétisé (bips)
      return SYNTH_ONLY.has(k) ? f(...a) : undefined;
    } catch (e) { return undefined; }
  };
}

// Liste d'écoute (Réglages)
export const SFX_DEMO = [
  ['Toucher', () => sfx.tap()], ['Ouverture', () => sfx.tear()], ['Rare', () => sfx.reveal('R')], ['Mythique', () => sfx.reveal('M')],
  ['Coup', () => sfx.slash()], ['Coup lourd', () => sfx.smash()], ['Parade', () => sfx.parry()], ['Brisure', () => sfx.shatter()],
  ['Soin', () => sfx.heal()], ['Gel', () => sfx.freeze()], ['Passif', () => sfx.passive()], ['Bouclier', () => sfx.shield()], ['Renfort', () => sfx.boost()], ['Gardien', () => sfx.boss()], ['Pouvoir', () => sfx.ult()],
  ['Dé', () => sfx.dice()], ['À toi', () => sfx.yourturn()], ['Tour ennemi', () => sfx.enemyturn()], ['Synergie', () => sfx.synergy()], ['Explosion', () => sfx.explode()],
  ['Victoire', () => sfx.victory()], ['Défaite', () => sfx.defeat()],
];
