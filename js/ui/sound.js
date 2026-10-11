// Effets sonores synthétisés (Web Audio) : aucun fichier audio à télécharger.
let ctx = null, master = null, enabled = true, volume = 0.7;

function ensure() {
  if (!enabled) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume * 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function configureSound({ sound, volume: v }) {
  enabled = sound !== false;
  if (typeof v === 'number') volume = v;
  if (master) master.gain.value = volume * 0.5;
}

function tone(freq, { type = 'sine', dur = 0.25, gain = 0.3, delay = 0, attack = 0.01, slide = 0 } = {}) {
  const c = ensure(); if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise({ dur = 0.3, gain = 0.2, freq = 1200, q = 0.8, delay = 0, sweep = 0 } = {}) {
  const c = ensure(); if (!c) return;
  const t = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(freq + sweep, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

const CHORDS = {
  C: [392], PC: [392, 494], R: [392, 494, 587], HR: [330, 415, 494, 659],
  M: [262, 330, 392, 523, 659, 784], S: [233, 294, 349, 466, 587, 698, 932],
};

export const sfx = {
  tap() { tone(660, { type: 'triangle', dur: 0.06, gain: 0.08 }); },
  error() { tone(180, { type: 'sawtooth', dur: 0.2, gain: 0.08, slide: -60 }); },
  coin() { tone(988, { type: 'square', dur: 0.08, gain: 0.06 }); tone(1319, { type: 'square', dur: 0.14, gain: 0.06, delay: 0.07 }); },
  tear() { noise({ dur: 0.45, gain: 0.35, freq: 900, sweep: 3000, q: 0.6 }); tone(80, { type: 'sine', dur: 0.5, gain: 0.25, slide: -30 }); },
  flip() { noise({ dur: 0.16, gain: 0.18, freq: 2400, q: 1.2 }); },
  rip(p = 0) { noise({ dur: 0.07, gain: 0.16, freq: 1400 + p * 2600, q: 1.4 }); },
  swipe() { noise({ dur: 0.22, gain: 0.12, freq: 700, sweep: 2600, q: 0.7 }); },
  reveal(r) {
    const notes = CHORDS[r] || CHORDS.C;
    const big = r === 'M' || r === 'S';
    notes.forEach((f, i) => tone(f, { type: big ? 'sawtooth' : 'triangle', dur: big ? 1.8 : 0.6, gain: big ? 0.07 : 0.12, delay: i * (big ? 0.06 : 0.05), attack: big ? 0.15 : 0.01 }));
    if (big) { tone(65, { dur: 2, gain: 0.3, slide: 30 }); noise({ dur: 1.4, gain: 0.08, freq: 6000, q: 0.4 }); }
    if (r === 'HR') tone(110, { dur: 0.8, gain: 0.2 });
  },
  // Grondement qui monte avant une carte exceptionnelle
  rumble(sec = 1) { tone(48, { type: 'sawtooth', dur: sec, gain: 0.12, attack: sec * 0.8, slide: 40 }); noise({ dur: sec, gain: 0.1, freq: 160, q: 0.5, sweep: 500 }); tone(96, { dur: sec, gain: 0.08, attack: sec * 0.9, slide: 120 }); },
  discover() { tone(784, { type: 'sine', dur: 0.3, gain: 0.1 }); tone(1175, { type: 'sine', dur: 0.5, gain: 0.08, delay: 0.08 }); },
  achievement() { [523, 659, 784, 1047].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.35, gain: 0.1, delay: i * 0.09 })); },
  hit() { noise({ dur: 0.12, gain: 0.25, freq: 500 }); tone(120, { dur: 0.15, gain: 0.2, slide: -50 }); },
  // Sons du combat
  slash() { noise({ dur: 0.14, gain: 0.22, freq: 2600, sweep: 900, q: 1.1 }); tone(240, { type: 'triangle', dur: 0.09, gain: 0.08, slide: -120 }); },
  smash() { noise({ dur: 0.3, gain: 0.32, freq: 260, q: 0.5 }); tone(70, { type: 'sawtooth', dur: 0.35, gain: 0.2, slide: -35 }); tone(55, { dur: 0.4, gain: 0.22 }); },
  dodge() { noise({ dur: 0.28, gain: 0.14, freq: 600, sweep: 4200, q: 0.8 }); tone(880, { type: 'sine', dur: 0.18, gain: 0.06, slide: 440, delay: 0.05 }); },
  miss() { tone(300, { type: 'square', dur: 0.12, gain: 0.05, slide: -140 }); },
  block() { tone(1400, { type: 'triangle', dur: 0.25, gain: 0.08 }); tone(2100, { type: 'sine', dur: 0.3, gain: 0.05, delay: 0.02 }); },
  heal() { [660, 880, 1100].forEach((f, i) => tone(f, { type: 'sine', dur: 0.28, gain: 0.06, delay: i * 0.06 })); },
  poison() { noise({ dur: 0.35, gain: 0.1, freq: 400, q: 3 }); tone(160, { type: 'sine', dur: 0.3, gain: 0.08, slide: -40 }); },
  freeze() { noise({ dur: 0.3, gain: 0.12, freq: 5200, q: 2 }); tone(1760, { type: 'sine', dur: 0.25, gain: 0.04, slide: -400 }); },
  death() { tone(220, { type: 'sawtooth', dur: 0.6, gain: 0.1, slide: -170 }); noise({ dur: 0.5, gain: 0.12, freq: 800, sweep: 200, q: 0.7 }); },
  enter() { tone(330, { type: 'triangle', dur: 0.12, gain: 0.07 }); tone(495, { type: 'triangle', dur: 0.16, gain: 0.07, delay: 0.08 }); },
  boss() { tone(65, { type: 'sawtooth', dur: 0.8, gain: 0.16, slide: 20 }); tone(98, { type: 'sawtooth', dur: 0.8, gain: 0.1, delay: 0.1 }); noise({ dur: 0.6, gain: 0.08, freq: 200, q: 0.5 }); },
  ult() { [262, 330, 392, 523, 659].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.6, gain: 0.08, delay: i * 0.07 })); noise({ dur: 0.8, gain: 0.1, freq: 3000, sweep: 800, q: 0.5 }); },
  victory() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.4, gain: 0.1, delay: i * 0.1 })); },
  defeat() { [392, 330, 262, 196].forEach((f, i) => tone(f, { type: 'sawtooth', dur: 0.45, gain: 0.07, delay: i * 0.16 })); },
  summon() { tone(220, { type: 'triangle', dur: 0.4, gain: 0.12, slide: 220 }); },
};
