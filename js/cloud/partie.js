// v539 : le téléphone et le serveur de partie (anti-triche, étape 1).
// Le jeu applique chaque action tout de suite (même moteur) et la note (js/core/oprec.js) ; ces actions partent au serveur
// (supabase/functions/partie) qui les rejoue : c'est sa partie qui fait foi. Les boosters et les récompenses en ligne
// sont faits d'abord par le serveur (on attend sa réponse). Si l'état du téléphone diffère de celui du serveur
// (partie modifiée, autre appareil), le téléphone reprend celui du serveur, sans toucher aux réglages, jamais pendant un combat ou une partie.
// Tant que le serveur de partie n'est pas en place (fonction pas publiée, SQL pas collé), l'ancien système reste (« legacy »).
import * as cloud from './cloud.js';
import { recordOps } from '../core/oprec.js';
import { FREE, FREE_DEV, getPath, setPath, mergeFree, clone, digest } from '../core/ops.js';
import { migrate } from '../core/save.js';
import { toast } from '../ui/dom.js';

export const partie = { mode: 'unknown', error: null, last: 0 };
const K = { queue: 'abyssal.ops', seq: 'abyssal.opseq', dev: 'abyssal.device', mode: 'abyssal.partieMode' };
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* rien */ } };
let app = null, g = null, timer = 0, inflight = null, waiting = null, lastFree = '', seq = Number(lsGet(K.seq)) || 0;
let queue = [];
const firstQs = new Set();
const firstRes = new Map(); /* v754 : réponses des actions « first », gardées d’un paquet à l’autre */
const listeners = new Set();
export const onPartie = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((f) => f(partie));
const uid = () => cloud.currentUser()?.id || null;
const device = () => { let d = lsGet(K.dev); if (!d) { d = `d${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`; lsSet(K.dev, d); } return d; };
const saveQueue = () => lsSet(K.queue, JSON.stringify({ uid: uid(), ops: queue }));
export const serverMode = () => partie.mode === 'server';
export const pendingOps = () => queue.length;

function loadState() {
  try { const o = JSON.parse(lsGet(K.queue) || 'null'); queue = o && o.uid === uid() && Array.isArray(o.ops) ? o.ops : []; } catch (e) { queue = []; }
  const m = lsGet(K.mode);
  partie.mode = uid() && m === `server:${uid()}` ? 'server' : 'unknown';
}
function enqueue(op) {
  op.q = ++seq; lsSet(K.seq, String(seq));
  queue.push(op); saveQueue();
  clearTimeout(timer); timer = setTimeout(() => flush().catch(() => {}), 2500);
  return op.q;
}

// ce que le téléphone garde quand il reprend la partie du serveur : réglages, marques de l'interface, partie en cours
function freeSnap() {
  const o = {};
  for (const p of [...FREE, ...FREE_DEV]) { const v = getPath(g.s, p); if (v !== undefined) o[p] = v; }
  return o;
}
const safe = () => !queue.length && !document.body.classList.contains('battle-mode') && !document.querySelector('.opening');
// v740 : actions refusées par le serveur, gardées sur l'appareil (Mode Créateur → Journal du serveur) pour comprendre un écart
const ERR_KEY = 'abyssal.partieErrs';
export function partieErrs() { try { return JSON.parse(lsGet(ERR_KEY) || '[]'); } catch (e) { return []; } }
function noteErrs(ops, errs) {
  const ks = Object.keys(errs || {});
  if (!ks.length) return;
  const byQ = Object.fromEntries(ops.map((o) => [o.q, o.m]));
  const list = [...ks.map((q) => ({ t: Date.now(), m: byQ[q] || '?', e: String(errs[q]).slice(0, 160) })), ...partieErrs()].slice(0, 30);
  lsSet(ERR_KEY, JSON.stringify(list));
}
// combat terminé sur le téléphone mais pas sur le serveur : on le dit au lieu de relancer le combat sans explication
const openFights = (s) => [s?.trials?.battle && !s.trials.battle.over ? 'trial' : null, s?.descent?.run?.battle && !s.descent.run.battle.over ? 'run' : null].filter(Boolean);
export function adopt(data) {
  if (digest(data) === digest(g.s)) { waiting = null; return; } // rien qui compte n'a changé : on ne redessine pas
  const back = openFights(data).filter((k) => !openFights(g.s).includes(k));
  if (back.length) { noteErrs([{ q: 0, m: 'adopt' }], { 0: `combat repris du serveur (${back.join(', ')})` }); toast('Le serveur n’a pas reçu la fin de ce combat : il reprend là où le serveur l’a compté.', { kind: 'error', ms: 6000 }); }
  const m = clone(data);
  for (const p of [...FREE, ...FREE_DEV]) { const v = getPath(g.s, p); if (v !== undefined) setPath(m, p, clone(mergeFree(p, getPath(data, p), v))); } /* v810 : « déjà vu » réunis */
  waiting = null;
  g.replaceSave(migrate(m));
  app.applySettings?.();
  app.refresh?.();
  app.chrome?.();
}

// Envoie les actions en attente ; reçoit la partie du serveur si elle diffère de celle du téléphone
export function flush({ want = false } = {}) {
  if (!cloud.isLoggedIn() || partie.mode === 'legacy') return Promise.resolve(null);
  if (inflight) return inflight.then(() => flush({ want }), () => flush({ want }));
  const ops = queue.slice(0, 1500), sent = ops.length ? ops[ops.length - 1].q : 0; // v540 : par paquets (un combat compte des centaines de coups)
  const fr = freeSnap(), frTxt = JSON.stringify(fr);
  const body = { ops, dev: device(), tz: -new Date().getTimezoneOffset(), digest: digest(g.s), want: want || partie.mode !== 'server', ...(frTxt !== lastFree ? { free: fr } : {}) };
  const who = uid();
  inflight = cloud.partieCall(body).then((res) => {
    inflight = null;
    if (uid() !== who) return null; // compte changé entre-temps
    if (partie.mode !== 'server') { partie.mode = 'server'; lsSet(K.mode, `server:${who}`); }
    noteErrs(ops, res?.errs);
    for (const [q, v] of Object.entries(res?.rets || {})) if (firstQs.has(Number(q))) firstRes.set(Number(q), { ret: v }); /* v754 */
    for (const [q, v] of Object.entries(res?.errs || {})) if (firstQs.has(Number(q))) firstRes.set(Number(q), { err: v });
    queue = queue.filter((o) => o.q > sent); saveQueue();
    if (queue.length) { clearTimeout(timer); timer = setTimeout(() => flush().catch(() => {}), 300); } // la suite des coups en attente
    lastFree = frTxt; partie.error = null; partie.last = Date.now();
    for (const [q, ev] of Object.entries(res?.prog || {})) if (firstQs.has(Number(q)) && ev?.length) g.emit('progress', ev); // annonces des actions faites par le serveur
    if (res?.data) { if (safe()) adopt(res.data); else waiting = res.data; } else waiting = null; // la partie du serveur est celle du téléphone
    emit();
    return res;
  }, (err) => {
    inflight = null;
    // fonction absente (404) ou base sans 12-serveur-de-partie.sql : l'ancien système reste
    if (partie.mode !== 'server' && (err.status === 404 || err.status === 503 || /partie_lock|function.*not.*find|Could not find/i.test(err.message || ''))) { partie.mode = 'legacy'; queue = []; saveQueue(); emit(); return null; }
    partie.error = err.message; emit();
    throw err;
  });
  return inflight;
}

// Premier contact avec le serveur (au lancement, après une connexion) : 'server', 'legacy' ou 'offline'
export async function probe() {
  if (!cloud.isLoggedIn()) return 'offline';
  try { const r = await flush({ want: true }); return r ? 'server' : partie.mode === 'legacy' ? 'legacy' : 'offline'; }
  catch (e) { return 'offline'; }
}

// Action faite d'abord par le serveur (boosters, récompenses en ligne) : on attend sa réponse
async function viaServer(list) {
  /* v754 : sans réseau, on ne repasse plus à l'ancien système (le booster s'ouvrait sur le téléphone, puis le serveur l'effaçait) */
  if (partie.mode !== 'server') { const m = await probe(); if (m === 'legacy') return null; if (m !== 'server') throw new Error('Connexion au serveur impossible : vérifie ton réseau et réessaie.'); }
  const qs = list.map(([m, a]) => { const q = enqueue({ m, a: clone(a) }); firstQs.add(q); return q; });
  clearTimeout(timer);
  let res;
  try {
    /* v754 : plus de 1 500 actions en attente : on envoie paquet après paquet jusqu'aux nôtres (avant : réponse vide, ouverture en erreur) */
    for (let k = 0; k < 40; k++) { res = await flush(); if (!queue.some((o) => qs.includes(o.q))) break; }
    if (queue.some((o) => qs.includes(o.q))) throw new Error('non envoyé');
  } catch (e) { queue = queue.filter((o) => !qs.includes(o.q)); saveQueue(); qs.forEach((q) => { firstQs.delete(q); firstRes.delete(q); }); throw new Error('Connexion au serveur impossible : vérifie ton réseau et réessaie.'); }
  if (res?.data) adopt(res.data);
  return qs.map((q) => { const r = firstRes.get(q) || { ret: undefined }; firstRes.delete(q); return r; });
}
export async function first(m, ...args) {
  if (partie.mode !== 'legacy' && cloud.isLoggedIn()) {
    const r = await viaServer([[m, args]]);
    if (r) { if (r[0].err) throw new Error(r[0].err); return r[0].ret; }
  }
  return LEGACY[m](...args);
}
export async function firstMany(list) {
  if (partie.mode !== 'legacy' && cloud.isLoggedIn()) { const r = await viaServer(list); if (r) return r; }
  return list.map(([m, a]) => { try { return { ret: LEGACY[m](...a) }; } catch (e) { return { err: e.message }; } });
}

// L'ancien système (sans serveur de partie) : ce que faisait le jeu avant v539
const LEGACY = {
  iapSync() { throw new Error('Les achats demandent le serveur de partie : réessaie dans un instant.'); }, /* v680 */
  openBooster: (type, opts) => g.openBooster(type, opts),
  async versusCreate(lineup, to, stake) {
    g.versusPay(stake);
    try { const id = await cloud.versusCreateMix(lineup, to); return { id, stake }; }
    catch (er) {
      /* v527 : réponse perdue (réseau) : le défi a peut-être été créé ; on regarde avant de rendre la mise */
      if (!er.status) { try { const d = await cloud.versusList(); if ((d?.mine || []).some((r) => r.mine && r.status === 'open' && Date.now() - new Date(r.created_at).getTime() < 120000 && r.stake === stake)) return { stake }; } catch (e2) { /* on rend la mise */ } }
      g.versusRefund(stake); throw er;
    }
  },
  async versusAccept(id, stake) {
    g.versusPay(stake);
    try { return { ok: true, r: await cloud.versusAccept(id) }; }
    catch (e) {
      if (!e.status) { try { const d = await cloud.versusList(); if ((d?.mine || []).some((x) => x.id === id && x.status === 'done')) return { ok: true }; } catch (e2) { /* on rend la mise */ } }
      g.versusRefund(stake); throw e;
    }
  },
  async versusClaim(id) { const res = await cloud.versusClaim(id); return { res, out: g.versusApply(id, res) }; },
  async versusPick(id, idx) { const res = await cloud.versusPick(id, idx); return { res, out: g.versusPickApply(id, res) }; }, /* v736 */
  async mpClaim(game, id, friendsOnly = false) { const r = await cloud.mpClaim(id); return { r, out: friendsOnly ? { shards: 0 } : g.mpReward(game, id, r) }; },
  shadowPay: (day) => g.shadowPay(day),
  async shadowClaim(week) {
    const rank = await cloud.shadowClaim(week);
    const sh = g.shadowState(); sh.asked = week; g.persist();
    return { rank, chest: rank ? g.shadowPrize(week, rank) : null };
  },
  devObs(n) { g.s.obs = n == null ? 0 : g.obs() + n; g.persist(); },
  devCodexXp(n) { g.codexXp(+n || 0, 'dev'); g.persist(); },
  devCodexPrem() { const c = g.codex(); c.premium = !c.premium; g.persist(); },
  devCodexReset() { g.s.codex = null; g.codex(); g.persist(); },
  devSnapshot(save) { g.replaceSave(migrate(save)); },
};

export function startPartie(theApp) {
  app = theApp; g = app.game;
  loadState();
  recordOps(g, enqueue, () => partie.mode !== 'legacy' && cloud.isLoggedIn()); /* v754 : notées dès qu'un compte est connecté (avant : perdues si le premier contact avec le serveur échouait) */
  cloud.onAuth((s) => {
    if (!s) { queue = []; saveQueue(); partie.mode = 'unknown'; firstQs.clear(); lastFree = ''; emit(); return; }
    loadState();
  });
  document.addEventListener('visibilitychange', () => {
    if (!cloud.isLoggedIn() || partie.mode !== 'server') return;
    flush({ want: document.visibilityState === 'visible' }).catch(() => {});
  });
  // à intervalles : envoie ce qui attend, reprend la partie du serveur quand c'est le bon moment
  setInterval(() => {
    if (partie.mode !== 'server') return;
    if (waiting && safe()) adopt(waiting);
    if (queue.length) flush().catch(() => {});
  }, 15000);
}
