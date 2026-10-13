// Effets sonores synthétisés (Web Audio) : aucun fichier audio à télécharger.
// Chaîne : chaque son → (sec + réverbération de salle) → compresseur → volume général.
// Les sons sont faits de couches : transitoire (le « clic » du contact), corps (le grave), queue (la résonance).
// Petites variations aléatoires de hauteur pour que les sons répétés ne sonnent pas mécaniques.
let ctx = null, master = null, bus = null, verb = null, enabled = true, volume = 0.7;
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
    comp.connect(master).connect(ctx.destination);
    bus = ctx.createGain(); bus.connect(comp);
    // Réverbération : réponse impulsionnelle générée (bruit stéréo qui décroît), comme une crypte
    verb = ctx.createConvolver();
    verb.buffer = impulse(2.4, 2.8);
    const wet = ctx.createGain(); wet.gain.value = 0.32;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 180;
    verb.connect(hp).connect(wet).connect(comp);
    noiseBuf = makeNoise(false); brownBuf = makeNoise(true);
    // iPhone : l'audio peut être suspendu en revenant dans l'app
    document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx.state !== 'running') ctx.resume().catch(() => {}); });
  }
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  return ctx;
}

export function configureSound({ sound, volume: v }) {
  enabled = sound !== false;
  if (typeof v === 'number') volume = v;
  if (master) master.gain.value = volume * 0.9;
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
const N = { D3: 146.8, F3: 174.6, A3: 220, C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392, A4: 440, Bb4: 466.2, C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784, A5: 880, C6: 1046.5, D6: 1174.7, F6: 1396.9, A6: 1760 };
const REVEAL = {
  C: [N.A5], PC: [N.D5, N.A5], R: [N.D5, N.F5, N.A5, N.D6],
  HR: [N.D5, N.F5, N.A5, N.C6, N.D6], M: [N.D4, N.A4, N.D5, N.F5, N.A5, N.D6], S: [N.D4, N.A4, N.D5, N.E5, N.A5, N.D6, N.F6],
};

export const sfx = {
  // ——— Interface ———
  tap() { noise({ dur: 0.03, gain: 0.5, freq: vary(3200, 0.1), q: 1.2, wet: 0.05 }); osc(vary(1500, 0.05), { dur: 0.05, gain: 0.1, to: 900, wet: 0.05 }); },
  error() { osc(N.A3, { type: 'triangle', dur: 0.14, gain: 0.12, lp: 900, wet: 0.15 }); osc(N.F3, { type: 'triangle', dur: 0.22, gain: 0.12, lp: 700, delay: 0.1, wet: 0.2 }); },
  coin() { bell(vary(N.A6 * 0.75, 0.02), { dur: 0.35, gain: 0.14, ratio: 2.76, index: 1.2 }); bell(N.A6, { dur: 0.5, ratio: 2.76, index: 1.2, delay: 0.06, pan: 0.2, gain: 0.12 }); noise({ dur: 0.12, gain: 0.04, type: 'highpass', freq: 7000, delay: 0.04 }); },
  discover() { bell(N.D5, { dur: 1.1, gain: 0.08, ratio: 2, index: 0.8 }); bell(N.A5, { dur: 1.4, gain: 0.07, ratio: 2, index: 0.8, delay: 0.1, pan: 0.2 }); },
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
  // ——— Fins de combat ———
  victory() {
    thump(70, { gain: 0.5 }); thump(70, { gain: 0.45, delay: 0.18 });
    [N.D4, N.A4, N.D5].forEach((f, i) => osc(f, { type: 'sawtooth', dur: 0.2, gain: 0.06, attack: 0.02, lp: 900, lpTo: 2400, delay: 0.18 + i * 0.12, wet: 0.5 }));
    pad([N.D4, N.F4, N.A4, N.D5], { dur: 1.4, gain: 0.035, attack: 0.04, delay: 0.54, lp: 1200, lpTo: 3500 });
    bell(N.D6, { dur: 2, gain: 0.06, ratio: 2, index: 1.2, delay: 0.54 }); thump(60, { to: 30, dur: 0.8, gain: 0.55, delay: 0.54 });
  },
  defeat() {
    pad([N.D3, N.F3, N.A3], { dur: 2.2, gain: 0.04, attack: 0.3, lp: 700, lpTo: 200 });
    bell(98, { dur: 3, gain: 0.12, ratio: 1.41, index: 3, delay: 0.1, wet: 0.8 }); thump(55, { to: 28, dur: 1, gain: 0.5, delay: 0.1 });
  },
};

// Liste d'écoute (Réglages)
export const SFX_DEMO = [
  ['Toucher', () => sfx.tap()], ['Ouverture', () => sfx.tear()], ['Rare', () => sfx.reveal('R')], ['Mythique', () => sfx.reveal('M')],
  ['Coup', () => sfx.slash()], ['Coup lourd', () => sfx.smash()], ['Parade', () => sfx.parry()], ['Brisure', () => sfx.shatter()],
  ['Soin', () => sfx.heal()], ['Gel', () => sfx.freeze()], ['Gardien', () => sfx.boss()], ['Pouvoir', () => sfx.ult()],
  ['Dé', () => sfx.dice()], ['Victoire', () => sfx.victory()], ['Défaite', () => sfx.defeat()],
];
