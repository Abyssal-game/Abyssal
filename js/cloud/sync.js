// Synchronisation : la sauvegarde part en ligne quelques secondes après chaque changement,
// le profil public suit, et les scores de la Descente sont envoyés au classement.
import * as cloud from './cloud.js';
import { pseudoProblem } from '../core/moderation.js';
import { friendCard } from '../core/friends.js';
import { migrate, today, defaultSave } from '../core/save.js';
import { openSheet, esc, toast } from '../ui/dom.js';
import { t } from '../i18n.js';
import { serverMode, probe, flush, pendingOps } from './partie.js';

export const sync = { status: 'off', lastPush: 0, error: null, profile: null };
let app = null, timer = 0, busy = false, pending = false;
const listeners = new Set();
export const onSync = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
/* v890 : objets du Gardien donnés au compte du créateur dès que son badge est lu (le serveur refuse l'opération sans le badge) */
function creatorKit() {
  try {
    if (!app || sync.profile?.badge !== 'createur' || !app.game.needsCreatorKit()) return;
    app.game.creatorKit();
    toast(t('Les objets du Gardien t’attendent : Profil › Personnaliser.'), { kind: 'success', icon: 'sparkle', ms: 6000 });
  } catch (e) { /* rien */ }
}
const emit = () => { creatorKit(); listeners.forEach((f) => f(sync)); };

function profilePayload() {
  const g = app.game, s = g.s;
  const p = { avatar: g.shownAvatar(), title: s.title, level: g.levelInfo().level, owned: g.uniqueCount() };
  /* v564 : cadre et plaque vus par les autres, seulement quand le serveur les connaît (supabase/15-vitrine.sql collé) */
  if (sync.profile && 'plate' in sync.profile) Object.assign(p, { frame: s.frame || null, plate: s.plate || null, ...('sachet' in sync.profile ? { sachet: s.sachet || null } : {}) });
  if (sync.profile && 'boards' in sync.profile) p.boards = { mat: s.mat || null, pb: s.pboard || null, cb: s.cboard || null, cd: s.cback || null }; /* v904 : plateaux et dos des mini-jeux */
  return p;
}

// Date (côté serveur) de la dernière sauvegarde en ligne connue de cet appareil.
const SYNCED_KEY = 'abyssal.syncedAt', PAUSED_KEY = 'abyssal.syncPaused';
/* v536 : marque exacte (updated_at) de la dernière sauvegarde en ligne écrite ou lue par cet appareil : si elle a changé, un autre appareil a écrit */
const STAMP_KEY = 'abyssal.syncedStamp';
const OWNER_KEY = 'abyssal.owner'; /* v754 : compte à qui appartient la partie de cet appareil */
export const clearOwner = () => lsSet(OWNER_KEY, null);
const ms = (x) => new Date(x).getTime() || 0;
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* rien */ } };
let choosing = false; // tant qu'on compare les deux parties, rien ne part en ligne

export async function pushNow(force = false) {
  if (!cloud.isLoggedIn() || !app) return;
  /* v539 : serveur de partie : la partie, le profil et la fiche d'ami sont tenus par le serveur ; on envoie seulement les actions */
  if (serverMode()) {
    sync.status = 'saving'; emit();
    try { for (let k = 0; k < 40; k++) { await flush(); if (!pendingOps()) break; } if (pendingOps()) throw new Error('Une partie de ta progression attend encore d’être envoyée.'); sync.status = 'ok'; /* v754 : tout envoyer (par paquets de 1 500), pas seulement le premier paquet */ sync.error = null; sync.lastPush = Date.now(); } catch (e) { sync.status = 'error'; sync.error = e.message; }
    emit();
    return;
  }
  if (choosing || sync.status === 'paused') return;
  if (busy) { pending = true; return; }
  busy = true; sync.status = 'saving'; emit();
  /* v536 : un autre appareil a écrit depuis notre dernière synchronisation : on compare d'abord (avant, l'ancienne partie écrasait la nouvelle) */
  if (!force) {
    const stamp = lsGet(STAMP_KEY);
    let other = false;
    if (stamp) { try { const r = await cloud.pullSaveStamp(); other = !!r && ms(r) !== ms(stamp); } catch (e) { /* réseau : on tente l'envoi comme avant */ } }
    if (other) { busy = false; pending = false; reconcile({ intro: 'Ta partie a avancé sur un autre appareil.', auto: true }).catch(() => {}); return; }
  }
  try {
    const w = await cloud.pushSave(app.game.s);
    sync.lastPush = w.at;
    lsSet(SYNCED_KEY, String(sync.lastPush)); lsSet(STAMP_KEY, w.iso);
    if (sync.profile?.pseudo) await cloud.updateProfile(profilePayload()); /* v500 : le pseudo (définitif) ne repart plus à chaque sauvegarde */
    if (sync.profile?.pseudo) await publishCard();
    sync.status = 'ok'; sync.error = null;
  } catch (e) { sync.status = 'error'; sync.error = e.message; }
  busy = false; emit();
  if (pending) { pending = false; schedule(); }
}
// v500 : fiche lue par les amis (envoyée seulement quand elle change ; une erreur ici ne bloque pas la sauvegarde)
let lastCard = '';
async function publishCard() {
  try {
    const card = friendCard(app.game), txt = JSON.stringify(card);
    if (txt === lastCard) return;
    await cloud.publishCard(card); lastCard = txt;
  } catch (e) { /* serveur sans la table des amis (07-amis.sql pas encore collé) : rien */ }
}
function schedule() { clearTimeout(timer); timer = setTimeout(pushNow, 4000); }

// Remplace la partie de cet appareil par une sauvegarde venue du serveur.
function adopt(remote) {
  const s = migrate(remote.data); // lève une erreur si la sauvegarde en ligne est illisible
  app.game.replaceSave(s); // convertit au passage une partie de l'ancien système (héros)
  app.applySettings?.();
  app.refresh();
  sync.lastPush = Date.now();
  lsSet(SYNCED_KEY, String(Math.max(Date.now(), new Date(remote.updated_at).getTime() || 0)));
  lsSet(STAMP_KEY, remote.updated_at);
}
const fresh = (s) => !s.resetAt && !s.stats.boosters && !Object.keys(s.collection).length; /* v412 : une partie effacée exprès n'est pas « neuve » */
const describe = (s, when) => `${Object.keys(s.collection || {}).length} créatures · ${s.stats?.boosters || 0} boosters ouverts${when ? ` · ${new Date(when).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}`;

function askChoice(remote, local, intro) {
  return new Promise((resolve) => {
    const sh = openSheet(`<h2>Deux parties trouvées</h2>
      <p class="small muted">${intro} Laquelle veux-tu garder ? L’autre sera remplacée.</p>
      <button class="btn block sync-pick" data-c="remote"><b>Partie en ligne</b><span class="small muted">${esc(describe(remote.data, remote.updated_at))}</span></button>
      <button class="btn block sync-pick" data-c="local"><b>Partie de cet appareil</b><span class="small muted">${esc(describe(local, local.updatedAt))}</span></button>`, { cls: 'sheet-small', label: 'Choisir la partie', onClose: () => resolve(null) });
    sh.body.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) { const c = b.dataset.c; resolve(c); sh.close(); } });
  });
}

// Compare la partie de l'appareil et la partie en ligne, puis applique le choix.
async function reconcile({ intro, auto }) {
  choosing = true; sync.status = 'saving'; emit();
  try {
    const remote = await cloud.pullSave();
    const local = app.game.s;
    if (!remote) { choosing = false; lsSet(PAUSED_KEY, null); sync.status = 'ok'; await pushNow(true); return 'pushed'; }
    const synced = Number(lsGet(SYNCED_KEY) || 0);
    const remoteT = new Date(remote.updated_at).getTime() || 0;
    const localChanged = (local.updatedAt || 0) > synced + 2000;
    const stamp = lsGet(STAMP_KEY);
    const remoteChanged = stamp ? ms(remote.updated_at) !== ms(stamp) : remoteT > synced + 2000; /* v536 : sans dépendre des horloges des appareils */
    let choice;
    if (fresh(local)) choice = 'remote';
    else if (auto && !remoteChanged) choice = 'local';            // rien de neuf en ligne
    else if (auto && !localChanged) choice = 'remote';            // l'appareil n'a pas bougé depuis : on prend la plus récente
    else choice = await askChoice(remote, local, intro);
    choosing = false;
    if (choice === 'remote') { adopt(remote); lsSet(PAUSED_KEY, null); sync.status = 'ok'; emit(); return 'pulled'; }
    if (choice === 'local') { lsSet(PAUSED_KEY, null); sync.status = 'ok'; await pushNow(true); return 'pushed'; }
    lsSet(PAUSED_KEY, '1'); sync.status = 'paused'; emit();
    return 'cancelled';
  } catch (e) {
    choosing = false; sync.status = 'error'; sync.error = e.message; emit();
    throw e;
  }
}

// Après connexion : choisir quelle partie garder si les deux existent.
export function afterLogin() {
  /* v527 : promesse gardée : la porte du compte attend la fin du choix de partie avant le guide et le cadeau */
  sync.pending = (async () => {
    try { sync.profile = await cloud.getProfile(); } catch (e) { sync.profile = null; }
    lsSet(SYNCED_KEY, null); lsSet(STAMP_KEY, null);
    /* v754 : la partie de cet appareil appartient à un autre compte (session perdue sans déconnexion) : elle ne part jamais
       sur celui-ci (sinon le nouveau compte recevait toute la collection de l'ancien) ; l'appareil repart d'une partie neuve */
    const me = cloud.currentUser()?.id || null, owner = lsGet(OWNER_KEY);
    if (me && owner && owner !== me) {
      const keep = { ...app.game.s.settings, dev: false, devCode: false };
      const neuf = migrate(defaultSave()); neuf.settings = { ...neuf.settings, ...keep };
      app.game.replaceSave(neuf); app.refresh?.();
    }
    if (me) lsSet(OWNER_KEY, me);
    /* v539 : une partie déjà jouée sur cet appareil (ancien invité) part d'abord sur le compte, comme avant ; puis le serveur de partie la reprend */
    let k = null;
    if (!serverMode() && !fresh(app.game.s)) k = await reconcile({ intro: 'Ce compte a déjà une partie en ligne.', auto: false });
    if ((await probe()) === 'server') { sync.status = 'ok'; emit(); return 'pulled'; }
    return k || reconcile({ intro: 'Ce compte a déjà une partie en ligne.', auto: false });
  })();
  return sync.pending;
}
// Reprise de la synchronisation (bouton « Reprendre » quand elle est en pause).
// v412 : après « Effacer toute la progression », la partie vide part tout de suite en ligne (avant, l'ancienne revenait au lancement)
export async function eraseOnline() {
  if (!cloud.isLoggedIn()) return false;
  if (serverMode()) { try { await flush(); return true; } catch (e) { return false; } }
  lsSet(PAUSED_KEY, null); choosing = false; sync.status = 'ok';
  await pushNow(true);
  return sync.status === 'ok';
}
export function resumeSync() { if (serverMode()) return flush({ want: true }); return reconcile({ intro: 'La synchronisation était en pause.', auto: false }); }

export async function restoreFromCloud() {
  if (serverMode()) { await flush({ want: true }); return; }
  const remote = await cloud.pullSave();
  if (!remote) throw new Error('Aucune sauvegarde en ligne pour ce compte.');
  adopt(remote);
  lsSet(PAUSED_KEY, null); sync.status = 'ok';
  emit();
}

export async function setPseudo(pseudo) {
  const p = pseudo.trim();
  const bad = pseudoProblem(p);
  if (bad) throw new Error(bad);
  await cloud.saveProfile(serverMode() ? { pseudo: p } : { pseudo: p, ...profilePayload() }); /* v539 : le reste du profil est écrit par le serveur de partie */
  if (serverMode()) cloud.partieCall({ ops: [], pub: true }).catch(() => {}); // le serveur remplit tout de suite portrait, titre et niveau
  sync.profile = { ...(sync.profile || {}), pseudo: p };
  await refreshProfile();
}

// Relit le profil sur le serveur (pseudo, badge…) : un badge attribué depuis Supabase apparaît sans relancer l'app.
let lastRefresh = 0;
export async function refreshProfile(force = true) {
  if (!cloud.isLoggedIn()) return null;
  if (!force && Date.now() - lastRefresh < 15000) return sync.profile;
  lastRefresh = Date.now();
  try {
    sync.profile = await cloud.getProfile();
    if (app && app.game.s.settings.dev && !app.game.s.settings.devCode && sync.profile && sync.profile.badge !== 'createur') app.game.setSetting('dev', false); /* v462 : sauf s'il a été ouvert par le code du créateur */
    emit();
  } catch (e) { /* réseau : on garde l'ancien */ }
  return sync.profile;
}

let lastBack = 0;
export function startSync(theApp) {
  app = theApp;
  { const me = cloud.isLoggedIn() ? cloud.currentUser()?.id : null; if (me && !lsGet(OWNER_KEY)) lsSet(OWNER_KEY, me); } /* v754 */
  app.game.on('change', () => { if (cloud.isLoggedIn() && sync.status !== 'paused' && !serverMode()) schedule(); });
  // v407 : le classement du jour compte les points des Épreuves du jour (la Descente est devenue la campagne)
  app.game.on('trialEnd', (out) => {
    if (!cloud.isLoggedIn() || !sync.profile?.pseudo) return;
    if (app.game.s.settings.dev) return; // pas de score au classement en Mode Créateur
    if (serverMode()) return; /* v539 : le serveur de partie envoie lui-même les Épreuves gagnées */
    if (!out.won || !out.score) return;
    /* v538 : chaque Épreuve gagnée part seule et le serveur fait le total ; sans 11-anti-triche.sql, l'ancien envoi du total */
    cloud.trialWin(out.day || today(), out.i, (out.points || 100) - 100)
      .catch((err) => { if (err?.status === 404) return cloud.submitScore(out.day || today(), out.score, false); })
      .catch(() => {});
  });

  document.addEventListener('visibilitychange', () => {
    if (!cloud.isLoggedIn()) return;
    if (document.visibilityState === 'hidden') { clearTimeout(timer); pushNow(); return; }
    /* v536 : de retour dans l'app, on regarde si la partie a avancé sur un autre appareil (avant : seulement au lancement) */
    if (!serverMode() && !choosing && sync.status !== 'paused' && Date.now() - lastBack > 10000) { lastBack = Date.now(); reconcile({ intro: 'Ta partie a avancé sur un autre appareil.', auto: true }).catch(() => {}); }
  });
  if (cloud.isLoggedIn()) {
    cloud.getProfile().then((p) => { sync.profile = p; emit(); }).catch(() => {});
    // v539 : d'abord le serveur de partie ; sans lui (pas encore en place), l'ancien système
    (async () => {
      if (!serverMode()) {
        /* passage au serveur de partie : la dernière progression de l'appareil part d'abord en ligne (elle sert de point de départ, une seule fois) */
        if (lsGet(STAMP_KEY) && (app.game.s.updatedAt || 0) > Number(lsGet(SYNCED_KEY) || 0) + 2000 && !lsGet(PAUSED_KEY)) await pushNow(true).catch(() => {});
      }
      if ((await probe()) === 'server') { sync.status = 'ok'; emit(); return; }
      if (lsGet(PAUSED_KEY)) { sync.status = 'paused'; emit(); }
      // au démarrage : si la partie en ligne a avancé ailleurs (autre appareil), on la récupère ou on demande
      else reconcile({ intro: 'Ta partie a avancé sur un autre appareil.', auto: true }).catch(() => {});
    })();
  }
}
