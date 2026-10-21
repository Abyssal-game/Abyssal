// Musique d'ambiance générée en direct (Web Audio) : aucun fichier à télécharger.
// Chaque lieu a son ambiance (nappe grave, accords lents, cloches, chœur, vent, gouttes, pulsation),
// tirée au hasard dans une gamme : elle ne se répète jamais exactement.
// Passage d'une ambiance à l'autre en fondu. Volume séparé des effets sonores.
import { audioCtx, hooks, getBytes, decodeBytes, listV } from './sound.js';

let ctx = null, out = null, verb = null, duckG = null, on = true, vol = 0.5;
let cur = null, want = 'antre', preview = null, timer = null, brown = null;

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Ambiances. root : note de base (MIDI). scale : demi-tons utilisables. chords : accords (degrés en demi-tons).
const THEMES = {
  antre: { // l'Antre : calme, crypte éclairée de bougies
    root: 50, scale: [0, 2, 3, 5, 7, 8, 10], chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]],
    drone: 0.05, lp: 420, every: [9, 13], pad: 0.016, bells: [4, 9], bell: 0.022, choir: 0.012, wind: 0.012,
  },
  boutique: { // boosters, coffres, tirage : mystère, scintillements
    root: 52, scale: [0, 2, 3, 5, 7, 9, 10], chords: [[0, 3, 7], [2, 5, 9], [-2, 2, 5], [5, 9, 12]],
    drone: 0.04, lp: 520, every: [7, 10], pad: 0.016, bells: [2, 5], bell: 0.024, choir: 0.008, wind: 0, shimmer: true,
  },
  descente: { // avant de descendre : vent des profondeurs, inquiétant
    root: 45, scale: [0, 1, 3, 5, 7, 8, 10], chords: [[0, 3, 7], [1, 5, 8], [-2, 1, 5], [0, 3, 6]],
    drone: 0.06, lp: 330, every: [10, 14], pad: 0.014, bells: [6, 12], bell: 0.02, choir: 0.006, wind: 0.03,
  },
  combat: { // combat : pulsation et tension
    root: 45, scale: [0, 1, 3, 5, 7, 8, 10], chords: [[0, 3, 7], [1, 5, 8], [0, 3, 6], [-2, 1, 5]],
    drone: 0.06, lp: 380, every: [6, 8], pad: 0.014, bells: [7, 12], bell: 0.016, choir: 0, wind: 0.012, pulse: 76,
  },
  boss: { // gardien : plus rapide, cuivres graves, dissonances
    root: 43, scale: [0, 1, 3, 6, 7, 8, 11], chords: [[0, 3, 6], [1, 4, 8], [0, 1, 7], [-1, 3, 6]],
    drone: 0.07, lp: 420, every: [4, 6], pad: 0.016, bells: [8, 14], bell: 0.014, choir: 0.01, wind: 0.015, pulse: 96, brass: true,
  },
  sceaux: { // Sceaux : salle des règles, harpe et chœur
    root: 50, scale: [0, 2, 3, 5, 7, 9, 10], chords: [[0, 3, 7], [5, 9, 12], [-2, 2, 5], [3, 7, 10]],
    drone: 0.04, lp: 460, every: [8, 11], pad: 0.012, bells: [7, 12], bell: 0.016, choir: 0.012, wind: 0, pluck: [2.5, 5],
  },
};
THEMES.abysse = THEMES.boss; THEMES.encheres = THEMES.sceaux; THEMES.pacte = THEMES.sceaux; THEMES.cryptes = THEMES.sceaux; THEMES.duels = THEMES.sceaux; /* v467 : musique des Duels des Sceaux */ /* v458 : musiques du Pacte, des Cryptes et des Trois Autels */ /* v443 : Enchères et Énigmes */ /* v442 : combat contre L'Abysse (assets/music/abysse.mp3) */
/* v463 : Cour des Masques, Énigmes et Trois Autels retirés du jeu (et leurs musiques) */
export const MUSIC_DEMO = [['Accueil', 'antre'], ['Butin', 'boutique'], ['Descente', 'descente'], ['Combat', 'combat'], ['Gardien', 'boss'], ['Cercle de l’Abysse', 'sceaux'], ['Duels des Sceaux', 'duels'], ['Enchères', 'encheres'], ['Le Pacte', 'pacte'], ['Les Cryptes', 'cryptes'], ['L’Abysse', 'abysse']];

// Lieu → ambiance
const ROUTE_THEME = { boutique: 'boutique', coffres: 'boutique', tirage: 'boutique', arsenal: 'boutique', descente: 'descente', heros: 'descente', marchand: 'descente', sceaux: 'duels', jeux: 'sceaux', encheres: 'encheres', pacte: 'pacte', cryptes: 'cryptes', epreuves: 'descente' }; /* v434 : le Cercle de l’Abysse */ /* v408 : Épreuves du jour = ambiance de la Descente, musique de combat en combat */

function init() {
  if (ctx) return ctx;
  ctx = audioCtx();
  if (!ctx) return null;
  out = ctx.createGain(); out.gain.value = vol * 0.55;
  duckG = ctx.createGain(); duckG.gain.value = 1;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3;
  duckG.connect(out).connect(comp).connect(ctx.destination);
  // réverbération longue, comme une cathédrale souterraine
  verb = ctx.createConvolver();
  const n = Math.floor(ctx.sampleRate * 4.5), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2); }
  verb.buffer = b;
  const wet = ctx.createGain(); wet.gain.value = 0.55; verb.connect(wet).connect(duckG);
  const bn = ctx.sampleRate * 4; brown = ctx.createBuffer(1, bn, ctx.sampleRate);
  const d = brown.getChannelData(0); let last = 0;
  for (let i = 0; i < bn; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
  hooks.duck = duck;
  loadTracks();
  return ctx;
}

// Baisse la musique quelques secondes (victoire, carte mythique…)
function duck(sec = 3, depth = 0.25) {
  if (!ctx || !duckG) return;
  const t = ctx.currentTime, g = duckG.gain;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(depth, t + 0.15); g.setValueAtTime(depth, t + sec); g.linearRampToValueAtTime(1, t + sec + 2);
}

// ——— Instruments (chacun sort dans le groupe de l'ambiance en cours) ———
function voice(grp, node, wet) { node.connect(grp.g); if (wet) { const s = ctx.createGain(); s.gain.value = wet; node.connect(s).connect(verb); } }
function envGain(t, a, hold, r, peak) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + r);
  return g;
}
function padChord(grp, th, t, dur) {
  const ch = pick(th.chords), base = th.root + 12;
  ch.forEach((st, i) => {
    const f = midi(base + st);
    const g = envGain(t, 3, Math.max(0.5, dur - 3), 4.5, th.pad);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900 + i * 150; lp.Q.value = 0.5;
    [-7, 7].forEach((dt, k) => {
      const o = ctx.createOscillator(); o.type = k ? 'sawtooth' : 'triangle'; o.frequency.value = f; o.detune.value = dt;
      o.connect(lp); o.start(t); o.stop(t + dur + 8);
    });
    lp.connect(g); voice(grp, g, 0.6);
  });
  return ch;
}
function bell(grp, f, t, gain, dur = 3.5) {
  const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain();
  car.frequency.value = f; mod.frequency.value = f * 2.0;
  mg.gain.setValueAtTime(f * 1.1, t); mg.gain.exponentialRampToValueAtTime(f * 0.02, t + dur);
  mod.connect(mg).connect(car.frequency);
  const g = envGain(t, 0.004, 0, dur, gain);
  let n = car.connect(g);
  if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = rnd(-0.6, 0.6); n = g.connect(p); }
  voice(grp, n, 0.9);
  car.start(t); mod.start(t); car.stop(t + dur + 0.1); mod.stop(t + dur + 0.1);
}
function choir(grp, f, t, dur, gain) {
  // voix « aah » : dents de scie + deux formants
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
  const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.2; lg.gain.value = f * 0.008; l.connect(lg).connect(o.frequency);
  const mix = ctx.createGain(); mix.gain.value = 1;
  [[750, 6, 1], [1150, 7, 0.6]].forEach(([fr, q, k]) => { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fr; b.Q.value = q; const kg = ctx.createGain(); kg.gain.value = k; o.connect(b).connect(kg).connect(mix); });
  const g = envGain(t, 2.5, Math.max(0.3, dur - 2.5), 3, gain);
  mix.connect(g); voice(grp, g, 0.8);
  o.start(t); l.start(t); o.stop(t + dur + 3.2); l.stop(t + dur + 3.2);
}
function pluck(grp, f, t, gain) {
  const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 6, t); lp.frequency.exponentialRampToValueAtTime(f * 1.2, t + 0.8);
  const g = envGain(t, 0.003, 0, 1.6, gain);
  o.connect(lp).connect(g); voice(grp, g, 0.7);
  o.start(t); o.stop(t + 1.8);
}
function drum(grp, t, f, gain) {
  const o = ctx.createOscillator(); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.25);
  const g = envGain(t, 0.003, 0, 0.45, gain);
  o.connect(g); voice(grp, g, 0.25);
  o.start(t); o.stop(t + 0.5);
}
function drip(grp, t) {
  const o = ctx.createOscillator(), f = rnd(1300, 2600);
  o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.9, t + 0.06);
  const g = envGain(t, 0.002, 0, 0.12, 0.03);
  o.connect(g); voice(grp, g, 1);
  o.start(t); o.stop(t + 0.2);
}
function brass(grp, f, t) {
  const g = envGain(t, 1.2, 0.8, 2, 0.03);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2; lp.frequency.setValueAtTime(200, t); lp.frequency.linearRampToValueAtTime(1100, t + 1.6); lp.frequency.linearRampToValueAtTime(250, t + 4);
  [f, f * 1.005, f / 2].forEach((x) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = x; o.connect(lp); o.start(t); o.stop(t + 4.2); });
  lp.connect(g); voice(grp, g, 0.5);
}

// ——— Une ambiance = un groupe (volume propre pour les fondus) + couches continues + événements ———
// ——— Musiques enregistrées (assets/music/<ambiance>.mp3, liste dans assets/music/manifest.json) ———
// Une musique livrée remplace l'ambiance calculée de son lieu ; elle tourne en boucle.
const tracks = {}, trackGet = {}; let trackList = null, trackLoad = null, recent = [];
// v308 : réglage de volume par musique (mesuré : le gardien était la plus basse alors qu'elle doit être la plus intense)
const TRACK_GAIN = { duels: 1.3, boss: 1.26, boutique: 1.19, descente: 1.19, abysse: 1.26 };
// v442 : musique jouée une fois depuis le début, puis boucle sur un passage (secondes) ; le fichier est préparé pour que la fin du passage s'enchaîne sur son début
const TRACK_LOOP = { abysse: [50, 142] };
// Seule la liste est lue au démarrage ; chaque musique est téléchargée la première fois que son lieu est visité
function loadTracks() {
  if (trackLoad) return;
  trackLoad = getBytes(`assets/music/manifest.json${listV()}`).then((b) => JSON.parse(new TextDecoder().decode(b))).catch(() => []).then((list) => { trackList = new Set(list); if (cur?.pending) needTrack(cur.key); }); // v308 : la musique du premier écran n'attendait pas la liste
}
function needTrack(key) {
  if (!trackList?.has(key) || trackGet[key]) return;
  trackGet[key] = getBytes(`assets/music/${key}.mp3`) /* v371 : lecture robuste (application iPhone) */
    .then((b) => b && decodeBytes(b))
    .then((buf) => { if (!buf) return; tracks[key] = buf; if (cur && cur.key === key && cur.pending) { stopTheme(cur); cur = startTheme(key); } }) // le silence d'attente cède la place au fichier
    .catch(() => { delete trackGet[key]; }); // nouvel essai à la prochaine visite
}
function startTheme(key) {
  const th = THEMES[key], t = ctx.currentTime;
  const grp = { key, th, g: ctx.createGain(), stops: [], next: {}, chord: th.chords[0] };
  grp.g.gain.setValueAtTime(0.0001, t); grp.g.gain.linearRampToValueAtTime(1, t + 3);
  grp.g.connect(duckG);
  needTrack(key);
  if (tracks[key]) {
    // v308 : boucle sur le fichier entier (il boucle déjà proprement : couper 50 ms à chaque bout faisait sauter le rythme)
    const s = ctx.createBufferSource(); s.buffer = tracks[key]; s.loop = true;
    if (TRACK_LOOP[key]) { s.loopStart = TRACK_LOOP[key][0]; s.loopEnd = Math.min(TRACK_LOOP[key][1], s.buffer.duration); }
    const g = ctx.createGain(); g.gain.value = 1.6 * (TRACK_GAIN[key] || 1); // les fichiers sont mixés plus bas que les ambiances calculées
    s.connect(g).connect(grp.g); s.start(t); grp.stops.push(s); grp.file = true;
    // mémoire : on ne garde décodées que cette musique et la précédente (une musique décodée pèse ~45 Mo)
    recent = [key, ...recent.filter((k) => k !== key)].slice(0, 2);
    for (const k of Object.keys(tracks)) if (!recent.includes(k)) { delete tracks[k]; delete trackGet[k]; }
    return grp;
  }
  // v308 : pas d'ambiance calculée (ses cloches sonnaient comme des bips) : silence le temps que le fichier arrive
  if (!trackList || trackList.has(key)) { grp.file = true; grp.pending = true; return grp; }
  return Object.assign(grp, { file: true }); // lieu sans musique enregistrée : silence
  // nappe grave continue : fondamentale + quinte, filtre qui respire lentement
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = th.lp; lp.Q.value = 1.5;
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.05; lg.gain.value = th.lp * 0.45; lfo.connect(lg).connect(lp.frequency); lfo.start(t);
  const dg = ctx.createGain(); dg.gain.value = th.drone;
  [[th.root - 12, -5, 'sawtooth'], [th.root - 12, 5, 'sawtooth'], [th.root - 5, 0, 'triangle']].forEach(([m, dt, type]) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = midi(m); o.detune.value = dt; o.connect(lp); o.start(t); grp.stops.push(o);
  });
  lp.connect(dg); voice(grp, dg, 0.4); grp.stops.push(lfo);
  // vent : bruit brun filtré qui va et vient
  if (th.wind) {
    const s = ctx.createBufferSource(); s.buffer = brown; s.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 380; bp.Q.value = 0.8;
    const wl = ctx.createOscillator(), wg = ctx.createGain(); wl.frequency.value = 0.07; wg.gain.value = 220; wl.connect(wg).connect(bp.frequency);
    const g = ctx.createGain(); g.gain.value = th.wind * 6;
    s.connect(bp).connect(g); voice(grp, g, 0.3); s.start(t); wl.start(t); grp.stops.push(s, wl);
  }
  // premiers événements
  grp.next = { pad: t + 0.2, bell: t + rnd(2, 4), choir: t + rnd(4, 8), pluck: t + rnd(1, 3), drip: t + rnd(1, 3), pulse: t + 1.5, brass: t + 3, step: 0 };
  return grp;
}
function stopTheme(grp) {
  const t = ctx.currentTime;
  grp.g.gain.cancelScheduledValues(t); grp.g.gain.setValueAtTime(grp.g.gain.value, t); grp.g.gain.linearRampToValueAtTime(0.0001, t + 2.5);
  grp.dead = true;
  setTimeout(() => { grp.stops.forEach((o) => { try { o.stop(); } catch (e) { /* rien */ } }); try { grp.g.disconnect(); } catch (e) { /* rien */ } }, 2800);
}
// Programme les notes des prochaines secondes
function schedule(grp) {
  if (grp.file) return;
  const th = grp.th, now = ctx.currentTime, ahead = now + 1.2, nx = grp.next;
  // retour d'arrière-plan : on ne rattrape pas les notes manquées
  for (const k of ['pad', 'bell', 'choir', 'pluck', 'drip', 'pulse', 'brass']) if (nx[k] < now - 0.3) nx[k] = now + rnd(0.1, 0.6);
  if (nx.pad < ahead) { const dur = rnd(...th.every); grp.chord = padChord(grp, th, nx.pad, dur); nx.pad += dur; }
  const sc = th.scale;
  if (th.bell && nx.bell < ahead) {
    const n = Math.random() < 0.35 ? 2 : 1;
    for (let i = 0; i < n; i++) bell(grp, midi(th.root + 24 + pick(sc) + (Math.random() < 0.3 ? 12 : 0)), nx.bell + i * rnd(0.25, 0.6), th.bell * (th.shimmer ? 1.1 : 1));
    nx.bell += rnd(...th.bells);
  }
  if (th.choir && nx.choir < ahead) { const st = pick(grp.chord); choir(grp, midi(th.root + 12 + st), nx.choir, rnd(4, 7), th.choir); nx.choir += rnd(7, 12); }
  if (th.pluck && nx.pluck < ahead) {
    const notes = [...grp.chord].sort((a, b) => a - b), up = Math.random() < 0.6;
    (up ? notes : notes.reverse()).forEach((st, i) => pluck(grp, midi(th.root + 24 + st), nx.pluck + i * 0.22, 0.03));
    nx.pluck += rnd(...th.pluck);
  }
  if (th.drips && nx.drip < ahead) { drip(grp, nx.drip); nx.drip += rnd(...th.drips); }
  if (th.pulse) {
    const beat = 60 / th.pulse;
    // motif : BOUM . boum-boum . (tambours graves)
    while (nx.pulse < ahead) {
      const s = nx.step % 4;
      if (s === 0) drum(grp, nx.pulse, 78, 0.16);
      if (s === 2) { drum(grp, nx.pulse, 70, 0.1); drum(grp, nx.pulse + beat / 2, 70, 0.08); }
      nx.pulse += beat; nx.step++;
    }
  }
  if (th.brass && nx.brass < ahead) { brass(grp, midi(th.root - 12 + pick(grp.chord)), nx.brass); nx.brass += rnd(7, 10); }
}

function tick() {
  if (!ctx || !on || document.hidden || ctx.state !== 'running') return;
  // en combat : l'ambiance suit l'écran (combat, gardien)
  let key = preview || want;
  if (!preview && document.body.classList.contains('battle-mode') && (key === 'descente')) key = document.querySelector('.dv-c.boss:not(.dead)') ? (document.querySelector('.dv-c.boss:not(.dead) .dv-bfig[src*="bosses/abysse"]') ? 'abysse' : 'boss') : 'combat'; /* v442 : L'Abysse a sa musique */
  if (!cur || cur.key !== key) { if (cur) stopTheme(cur); cur = startTheme(key); }
  schedule(cur);
}

// Appelé à chaque changement de page
export function musicRoute(route) {
  want = ROUTE_THEME[route] || 'antre';
  preview = null;
}
// Écoute d'une ambiance depuis les Réglages (jusqu'au prochain changement de page)
export function musicPreview(key) { preview = THEMES[key] ? key : null; if (!init()) return; tick(); }

export function configureMusic({ music, musicVol, sound }) {
  on = music !== false && sound !== false;
  if (typeof musicVol === 'number') vol = musicVol;
  if (!on) {
    if (cur && ctx) { stopTheme(cur); cur = null; }
    clearInterval(timer); timer = null;
    return;
  }
  // le contexte audio ne démarre qu'après un premier toucher (règle des navigateurs)
  if (!navigator.userActivation || navigator.userActivation.hasBeenActive) init();
  if (out) out.gain.setTargetAtTime(vol * 0.55, ctx.currentTime, 0.2);
  if (!timer) timer = setInterval(() => { if (!ctx) { if (navigator.userActivation?.hasBeenActive) init(); return; } tick(); }, 400);
}
