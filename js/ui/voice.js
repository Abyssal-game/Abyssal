// v794 : voix des personnages (narrateur, gardiens, arbitres) faites avec ElevenLabs.
// Une réplique = assets/voix/<langue>/<personnage>-<empreinte du texte français>.mp3, listée dans assets/voix/manifest.json
// (outils : node tools/voix-script.mjs pour les textes à faire lire, node tools/voix-cut.mjs pour découper un fichier reçu).
// Sans fichier dans la langue du joueur, rien ne se joue (le texte reste affiché là où il l'était déjà).
import { getBytes, listV, playVoice } from './sound.js';
import { LANG, t } from '../i18n.js';
import { NARRATOR } from '../core/voices.js';
import { vhash, vkey } from './voice-key.js';

export { vhash, vkey };

let set = null, on = true, playing = null, lastNar = 0;
const manifest = () => (set ||= getBytes(`assets/voix/manifest.json${listV()}`).then((b) => new Set(JSON.parse(new TextDecoder().decode(b)))).catch(() => new Set()));
export function setVoices(v) { on = v !== false; if (!on) stopVoice(); }
export function stopVoice() { try { playing?.stop(); } catch (e) { /* rien */ } playing = null; }
/** la réplique a-t-elle une voix dans la langue du joueur ? */
export async function hasVoice(speaker, fr, lang = LANG) { return (await manifest()).has(`${lang}/${vkey(speaker, fr)}`); }

/** joue la réplique (texte français = clé) ; renvoie { ms } ou null. Une nouvelle réplique coupe la précédente. */
export async function speak(speaker, fr, { lang = LANG } = {}) {
  if (!on || !fr || document.hidden) return null;
  const k = `${lang}/${vkey(speaker, fr)}`;
  if (!(await manifest()).has(k)) return null;
  stopVoice();
  const h = await playVoice(`assets/voix/${k}.mp3`);
  playing = h;
  return h;
}

/* Le narrateur en combat : une phrase tirée parmi celles de l'évènement, au plus une toutes les 20 s
   (sauf les grands moments : gardien vaincu, défaite, chapitre refermé, cartes rares), avec une ligne de sous-titre. */
const BIG = new Set(['boss-down', 'defeat', 'chapter', 'secret', 'mythic', 'close']);
export async function narrate(ev, { chance = 1, host = null } = {}) {
  const lines = NARRATOR[ev];
  if (!on || !lines?.length) return null;
  const now = performance.now();
  if (!BIG.has(ev) && (now - lastNar < 20000 || Math.random() > chance)) return null;
  const fr = lines[Math.floor(Math.random() * lines.length)];
  if (!(await hasVoice('narrateur', fr))) return null;
  lastNar = performance.now();
  const h = await speak('narrateur', fr);
  if (h) caption(t(fr), h.ms, host);
  return h;
}
function caption(text, ms, host) {
  document.querySelectorAll('.nar-cap').forEach((x) => x.remove());
  const el = document.createElement('div');
  el.className = 'nar-cap'; el.setAttribute('aria-live', 'polite'); el.setAttribute('translate', 'no');
  el.textContent = text;
  (host || document.body).appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, Math.max(1800, ms + 300));
}

/* v794 : une réplique écrite dans la page et dite une seule fois (l'écran se redessine souvent : la même phrase n'est pas
   redite pendant 90 s) ; renvoie le texte, pour l'écrire dans la page. obj et tag restent pour lire le code (quelle partie, quel moment). */
const recentSaid = new Map();
export function vsay(obj, tag, speaker, fr) {
  if (fr) {
    const k = `${speaker}|${fr}`, now = Date.now();
    if (!(now - (recentSaid.get(k) || 0) < 90000)) { recentSaid.set(k, now); speak(speaker, fr); }
  }
  return fr;
}
