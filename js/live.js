// v618 : mises à jour à distance de l'application iPhone, sans passer par l'App Store.
// Le jeu (HTML, JS, CSS, images) est publié avec le site ; live.json y liste chaque fichier et son empreinte.
// 1. Le téléphone lit le live.json publié. S'il annonce une version plus récente que celle qui tourne,
//    il recopie le jeu actuel dans Library/NoCloud/ionic_built_snapshots/v<N> (copie instantanée sur l'iPhone),
//    puis n'y télécharge que les fichiers qui ont changé (empreinte vérifiée).
// 2. Au lancement suivant (ou au retour dans l'app après un long moment, hors combat), l'app repart de ce dossier
//    (WebView.setServerBasePath, mécanisme fourni par Capacitor). Si la nouvelle version démarre bien, elle est gardée
//    (persistServerBasePath) ; si elle plante, le lancement suivant revient à l'ancienne et cette version est écartée.
// 3. Quand l'application elle-même est mise à jour par l'App Store, Capacitor revient tout seul au jeu embarqué.
// Seulement sur iPhone pour l'instant (Android : à faire avant sa sortie). Rien ne s'active dans un navigateur.
import { VERSION, LIVE_BASES, LIVE_NATIVE, LIVE_KEY } from './config.js';

const KEY = 'abyssal.live';
const LIB = 'LIBRARY_NO_CLOUD';
const DIR = 'ionic_built_snapshots';
const RESUME_MS = 20 * 60e3; // retour dans l'app après 20 min : on peut installer une version prête
const CHECK_MS = 60 * 60e3; // au plus une recherche par heure (sauf demande depuis Réglages)

const cap = () => (typeof window !== 'undefined' ? window.Capacitor : null);
const plug = (n) => cap()?.Plugins?.[n] || cap()?.registerPlugin?.(n) || null;
export const liveOn = () => !!cap()?.isNativePlatform?.() && cap()?.getPlatform?.() === 'ios';
const num = (v) => +String(v).replace(/\D/g, '') || 0;
const RUNNING = num(VERSION);
const later = (f, ms) => { const t = setTimeout(f, ms); t?.unref?.(); }; // unref : rien ne retient les tests sous Node

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
function save(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* stockage indisponible */ } }

// Pure : fichiers à télécharger et à retirer pour passer de la liste `have` à la liste `want`.
export function liveDiff(have, want) {
  const get = [], drop = [];
  for (const [f, h] of Object.entries(want.files || {})) if ((have.files || {})[f] !== h) get.push(f);
  for (const f of Object.keys(have.files || {})) if (!(f in (want.files || {}))) drop.push(f);
  return { get, drop };
}
// Pure : faut-il prendre cette version ?
export function liveWanted(m, { running = RUNNING, native = LIVE_NATIVE, bad = [] } = {}) {
  return !!m && num(m.v) > running && (num(m.native) || 0) <= native && !bad.includes(num(m.v));
}

let status = { state: 'idle' };
const listeners = new Set();
const setStatus = (s) => { status = s; listeners.forEach((f) => { try { f(s); } catch (e) { /* écran fermé */ } }); };
export const liveStatus = () => ({ ...status, ready: load().ready || null });
export const onLiveStatus = (f) => { listeners.add(f); return () => listeners.delete(f); };

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function hashOf(buf) { return hex(await crypto.subtle.digest('SHA-256', buf)).slice(0, 16); }
function b64(buf) {
  const u = new Uint8Array(buf); let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}
const snapPath = (v) => `${DIR}/v${v}`;
async function absPath(v) {
  const { uri } = await plug('Filesystem').getUri({ directory: LIB, path: snapPath(v) });
  return decodeURIComponent(String(uri).replace(/^file:\/\//, '')).replace(/\/$/, '');
}
async function basePath() { try { return (await plug('WebView').getServerBasePath()).path || ''; } catch (e) { return ''; } }

// Signature : live.json est signé au moment de la publication (ECDSA P-256, clé secrète gardée dans les secrets GitHub).
// L'application ne connaît que la clé publique (LIVE_KEY) : une liste non signée ou modifiée est refusée, et chaque fichier
// téléchargé doit avoir l'empreinte écrite dans cette liste signée.
const unb64 = (s) => Uint8Array.from(atob(String(s).trim()), (c) => c.charCodeAt(0));
let pubKey = LIVE_KEY;
export const liveTestKey = (k) => { pubKey = k; }; // tests seulement (clé d'essai)
export async function liveVerify(text, sig, key = pubKey) {
  if (!key?.x || !key?.y || !sig) return false;
  try {
    const k = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: key.x, y: key.y, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, k, unb64(sig), new TextEncoder().encode(text));
  } catch (e) { return false; }
}

async function fetchManifest() {
  for (const base of LIVE_BASES) {
    try {
      const t = Date.now();
      const [r, s] = await Promise.all([fetch(`${base}live.json?t=${t}`, { cache: 'no-store' }), fetch(`${base}live.sig?t=${t}`, { cache: 'no-store' })]);
      if (!r.ok) continue;
      const text = await r.text();
      if (!s.ok || !(await liveVerify(text, await s.text()))) return { unsigned: true };
      const m = JSON.parse(text);
      if (m && m.files) return { m, text, base: /^https:\/\//.test(m.base || '') ? m.base : base };
    } catch (e) { /* adresse suivante */ }
  }
  return null;
}

// Numéro de build de l'application installée (CFBundleVersion = numéro du jeu au moment de l'archive) :
// une version publiée qui demande une application plus récente n'est pas prise.
let nativeBuild = 0;
async function binBuild() {
  if (!nativeBuild) { try { nativeBuild = num((await plug('App').getInfo()).build); } catch (e) { nativeBuild = 0; } }
  return nativeBuild || LIVE_NATIVE;
}

let busy = false;
// Cherche une version plus récente et la prépare. Renvoie l'état final (pour Réglages).
export async function liveCheck({ force = false } = {}) {
  if (!liveOn() || busy) return liveStatus();
  const st = load();
  if (!force && st.checked && Date.now() - st.checked < CHECK_MS) return liveStatus();
  busy = true; setStatus({ state: 'checking' });
  try {
    st.checked = Date.now(); save(st);
    const got = await fetchManifest();
    if (!got) { setStatus({ state: 'offline' }); return liveStatus(); }
    if (got.unsigned) { setStatus({ state: 'unsigned' }); return liveStatus(); }
    const { m, text, base } = got, v = num(m.v);
    const native = await binBuild();
    if (!liveWanted(m, { bad: st.bad || [], native })) { setStatus({ state: v > RUNNING && num(m.native) > native ? 'needApp' : 'uptodate' }); return liveStatus(); }
    if (st.ready === v) { setStatus({ state: 'ready', v }); return liveStatus(); }
    const own = await (await fetch('live.json', { cache: 'no-store' })).json();
    const FS = plug('Filesystem');
    const target = snapPath(v);
    try { await FS.rmdir({ directory: LIB, path: target, recursive: true }); } catch (e) { /* absent */ }
    try { await FS.mkdir({ directory: LIB, path: DIR, recursive: true }); } catch (e) { /* déjà là */ }
    const from = await basePath();
    if (!from) throw new Error('chemin du jeu inconnu');
    await FS.copy({ from: 'file://' + encodeURI(from), to: target, toDirectory: LIB });
    const { get, drop } = liveDiff(own, m);
    setStatus({ state: 'downloading', v, done: 0, total: get.length });
    let done = 0, i = 0;
    const one = async () => {
      while (i < get.length) {
        const f = get[i++];
        const r = await fetch(`${base}${encodeURI(f)}?h=${m.files[f]}`, { cache: 'no-store' });
        if (!r.ok) throw new Error(`${f} : ${r.status}`);
        const buf = await r.arrayBuffer();
        if ((await hashOf(buf)) !== m.files[f]) throw new Error(`${f} : empreinte différente`);
        await FS.writeFile({ directory: LIB, path: `${target}/${f}`, data: b64(buf), recursive: true });
        setStatus({ state: 'downloading', v, done: ++done, total: get.length });
      }
    };
    await Promise.all([one(), one(), one(), one()]);
    for (const f of drop) { try { await FS.deleteFile({ directory: LIB, path: `${target}/${f}` }); } catch (e) { /* déjà absent */ } }
    await FS.writeFile({ directory: LIB, path: `${target}/live.json`, data: text, encoding: 'utf8' });
    const st2 = load(); st2.ready = v; save(st2);
    setStatus({ state: 'ready', v });
  } catch (e) {
    setStatus({ state: 'error', msg: String(e?.message || e) });
  } finally { busy = false; }
  return liveStatus();
}

// Passe tout de suite sur la version prête (l'écran se recharge). Seulement quand rien n'est en cours.
async function apply() {
  const st = load(), v = st.ready;
  if (!v || v <= RUNNING || (st.bad || []).includes(v)) return false;
  try {
    const path = await absPath(v);
    st.trying = v; st.ready = null; save(st);
    await plug('WebView').setServerBasePath({ path });
    return true;
  } catch (e) { const s = load(); s.trying = null; save(s); return false; }
}

// À appeler au démarrage (dans l'application seulement). `idle()` dit si on peut recharger l'écran sans gêner.
export async function initLive({ idle = () => true } = {}) {
  if (!liveOn()) return;
  const st = load();
  const here = await basePath();
  const inSnap = here.includes(`/${DIR}/`);
  if (st.trying && st.trying !== RUNNING) {
    // la version essayée n'a pas tenu (plantage, ou retour au jeu embarqué) : on ne la reprend plus
    st.bad = [...new Set([...(st.bad || []), st.trying])].slice(-10); st.trying = null; save(st);
  }
  if (st.trying === RUNNING && inSnap) {
    // nouvelle version lancée : si elle tient 8 secondes, on la garde pour les prochains lancements
    later(async () => {
      if (!document.querySelector('#view')?.children.length) return;
      try {
        await plug('WebView').persistServerBasePath();
        const s = load(); s.trying = null; s.ok = RUNNING; save(s);
        const FS = plug('Filesystem');
        const { files } = await FS.readdir({ directory: LIB, path: DIR });
        for (const f of files || []) { const n = typeof f === 'string' ? f : f.name; if (n !== `v${RUNNING}`) { try { await FS.rmdir({ directory: LIB, path: `${DIR}/${n}`, recursive: true }); } catch (e) { /* suivant */ } } }
      } catch (e) { /* on réessaiera au prochain lancement */ }
    }, 8000);
  } else if (st.ready && st.ready > RUNNING) {
    if (await apply()) return; // l'écran repart sur la nouvelle version
  }
  later(() => liveCheck(), 12000);
  let away = 0;
  plug('App')?.addListener?.('appStateChange', ({ isActive }) => {
    if (!isActive) { away = Date.now(); return; }
    if (away && Date.now() - away > RESUME_MS && load().ready && idle()) apply();
    else later(() => liveCheck(), 3000);
  });
}
