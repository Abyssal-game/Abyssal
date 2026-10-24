// v521 : notifications du téléphone (app iPhone et Android seulement, réglage « Notifications »).
// Notifications locales programmées par l'app elle-même (Capacitor LocalNotifications), sans serveur :
//  • le booster gratuit du jour, à 10 h, s'il n'est pas encore ouvert ;
//  • les parties en ligne : rappel 2 h avant la fin du délai quand c'est à toi de jouer.
// v693 : les alertes en direct (« ton adversaire a joué », défi reçu, Pari relevé, demande d'ami…) sont envoyées par
// le serveur, même app fermée (supabase/17-notifications.sql, fonction « push ») : l'app donne son adresse de
// notification au serveur (syncPush), seulement dans l'app iPhone qui a le module (version 1.1 et suivantes).
import { isNative } from './native.js';
import { LANG, t } from './i18n.js';
import { CODEX, codexTier } from './core/codex.js';

const LN = () => (isNative() ? window.Capacitor?.Plugins?.LocalNotifications : null);
const DAILY_ID = 1001, CODEX_ID = 1002, STREAK_ID = 1003, EVE_ID = 1004, SHADOW_ID = 1005; /* v680 : fin de saison du Codex ; v708 : série d'offrandes brisée ; v709 : offrande du soir, Tirage des Ombres */
const REMIND_BASE = 20000;
const REMIND_HOURS = 2;
export const notifSupported = () => !!LN();
export const pushSupported = () => !!PN();
/* v693 : notifications du serveur (iPhone seulement pour l'instant : Android demandera Firebase) */
const PN = () => {
  const C = isNative() ? window.Capacitor : null;
  return C && C.getPlatform?.() === 'ios' && C.isPluginAvailable?.('PushNotifications') ? C.Plugins.PushNotifications : null;
};
const TOK = 'abyssal.pushToken';
const tokGet = () => { try { return localStorage.getItem(TOK) || ''; } catch (e) { return ''; } };
let wired = false;
// Donne (ou retire) l'adresse de notification de ce téléphone au serveur, selon le réglage et le compte connecté
export async function syncPush(app) {
  const P = PN(); if (!P) return;
  const g = app.game;
  const cloud = await import('./cloud/cloud.js');
  if (!wired) {
    wired = true;
    try {
      await P.addListener('registration', ({ value }) => {
        try { localStorage.setItem(TOK, value); } catch (e) { /* rien */ }
        if (cloud.isLoggedIn() && g.s.settings.notif) cloud.pushRegister(value, 'ios', LANG).catch(() => {});
      });
      await P.addListener('pushNotificationActionPerformed', (a) => {
        const r = a?.notification?.data?.route;
        if (typeof r === 'string' && /^#\/[a-z-]*$/.test(r)) app.go(r.slice(2));
      });
    } catch (e) { /* rien */ }
  }
  if (!cloud.isLoggedIn()) return;
  if (!g.s.settings.notif) { await pushOff(); return; }
  try {
    const p = await P.checkPermissions();
    if (p.receive === 'granted') await P.register();
  } catch (e) { /* rien */ }
}
// Notifications coupées ou déconnexion : le serveur oublie l'adresse de ce téléphone (à appeler avant la déconnexion)
export async function pushOff() {
  const tok = tokGet(); if (!tok || !PN()) return;
  try { const cloud = await import('./cloud/cloud.js'); if (cloud.isLoggedIn()) await cloud.pushUnregister(tok); } catch (e) { /* rien */ }
}

// Demande l'autorisation au téléphone ; renvoie true si les notifications sont permises
export async function askPermission() {
  const L = LN(); if (!L) return false;
  try {
    let p = await L.checkPermissions();
    if (p.display !== 'granted') p = await L.requestPermissions();
    const P = PN(); /* v693 : la même autorisation de l'iPhone sert aux notifications du serveur */
    if (P && p.display === 'granted') { try { const q = await P.checkPermissions(); if (q.receive !== 'granted') await P.requestPermissions(); } catch (e) { /* rien */ } }
    return p.display === 'granted';
  } catch (e) { return false; }
}
const idOf = (s) => { let h = 0; for (const ch of String(s)) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0; return REMIND_BASE + (Math.abs(h) % 9000); };
async function pendingIds() { try { return ((await LN().getPending()).notifications || []).map((n) => n.id); } catch (e) { return []; } }
async function cancel(ids) { if (ids.length) { try { await LN().cancel({ notifications: ids.map((id) => ({ id })) }); } catch (e) { /* rien */ } } }

// Booster du jour : prochain 10 h où le booster gratuit est disponible et pas encore ouvert
let lnWired = false;
export async function syncDaily(g) {
  const L = LN(); if (!L) return;
  /* v709 : toucher une notification locale qui porte une page (Tirage des Ombres) ouvre cette page */
  if (!lnWired) { lnWired = true; try { L.addListener?.('localNotificationActionPerformed', (a) => { const r = a?.notification?.extra?.route; if (r && /^#\//.test(r)) location.hash = r; }); } catch (e) { /* rien */ } }
  await cancel([DAILY_ID]);
  if (!g.s.settings.notif) return;
  const now = new Date(), at = new Date(now); at.setHours(10, 0, 0, 0);
  const fresh = g.freePack().stock > 0;
  if (fresh && at > now) { /* aujourd'hui à 10 h */ } else { at.setDate(at.getDate() + 1); }
  try {
    await L.schedule({ notifications: [{ id: DAILY_ID, title: 'ABYSSAL', body: t('Ton booster gratuit du jour t’attend !'), schedule: { at, allowWhileIdle: true } }] });
  } catch (e) { /* rien */ }
  await syncStreak(g);
  await syncEve(g);
  await syncShadow(g);
  await syncCodex(g);
}

/* v708 : le lendemain d'un jour sans visite (offrande manquée), à 11 h : la série d'offrandes a reculé d'un cran.
   Programmée à chaque sortie de l'app pour le surlendemain de la dernière offrande ; revenir avant la repousse. */
async function syncStreak(g) {
  const L = LN(); if (!L) return;
  await cancel([STREAK_ID]);
  try {
    const d = g.s.daily || {};
    if (!g.s.settings.notif || !d.last || (d.streak || 0) < 2) return;
    const [y, m, j] = d.last.split('-').map(Number);
    const at = new Date(y, m - 1, j + 2, 11, 0, 0, 0);
    if (at.getTime() < Date.now() + 60000) return;
    await L.schedule({ notifications: [{ id: STREAK_ID, title: t('L’Abysse a remarqué ton absence'), body: t('Hier, nul n’est venu recevoir l’offrande : ta série de {n} jours se fissure. Reviens aujourd’hui, avant que la flamme ne s’éteigne.', { n: d.streak }), schedule: { at, allowWhileIdle: true } }] });
  } catch (e) { /* rien */ }
}

/* v709 : le lendemain de la dernière offrande, à 20 h, si l'app n'a pas été ouverte de la journée (l'offrande se prend
   toute seule à l'ouverture) : la série tient encore jusqu'à minuit */
async function syncEve(g) {
  const L = LN(); if (!L) return;
  await cancel([EVE_ID]);
  try {
    const d = g.s.daily || {};
    if (!g.s.settings.notif || !d.last || (d.streak || 0) < 2) return;
    const [y, m, j] = d.last.split('-').map(Number);
    const at = new Date(y, m - 1, j + 1, 20, 0, 0, 0);
    if (at.getTime() < Date.now() + 60000) return;
    await L.schedule({ notifications: [{ id: EVE_ID, title: t('L’offrande brûle encore'), body: t('L’autel attend ton offrande de ce soir. Avant minuit, ta série de {n} jours tient toujours.', { n: d.streak }), schedule: { at, allowWhileIdle: true } }] });
  } catch (e) { /* rien */ }
}

/* v709 : Tirage des Ombres (jour à l'heure de Paris, comme le serveur) : 19 h le jour même s'il n'est pas encore fait,
   sinon le lendemain à 19 h ; seulement avec un compte (le Tirage se joue en ligne) */
const parisDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
async function syncShadow(g) {
  const L = LN(); if (!L) return;
  await cancel([SHADOW_ID]);
  try {
    if (!g.s.settings.notif) return;
    const cloud = await import('./cloud/cloud.js');
    if (!cloud.isLoggedIn()) return;
    const now = new Date(), at = new Date(now); at.setHours(19, 0, 0, 0);
    if (g.s.shadow?.paid?.[parisDay(now)] || at.getTime() < now.getTime() + 60000) at.setDate(at.getDate() + 1);
    await L.schedule({ notifications: [{ id: SHADOW_ID, title: t('Le Tirage des Ombres'), body: t('Les Ombres ont battu les cartes. Ton tirage du jour t’attend : il compte pour le classement de la semaine.'), schedule: { at, allowWhileIdle: true }, extra: { route: '#/tirage' } }] });
  } catch (e) { /* rien */ }
}

// v680 : 3 jours avant la fin de la saison du Codex, à 18 h, si le palier 30 n'est pas atteint
async function syncCodex(g) {
  const L = LN(); if (!L) return;
  await cancel([CODEX_ID]);
  try {
    if (!g.s.settings.notif || !g.codexLive()) return;
    const tier = codexTier(g.codex()), se = g.codexSeason();
    if (tier >= CODEX.tiers) return;
    const at = new Date(`${se.ends}T18:00:00`); at.setDate(at.getDate() - 3);
    if (at.getTime() < Date.now() + 60000) return;
    await L.schedule({ notifications: [{ id: CODEX_ID, title: t('Le Codex de l’Abîme'), body: t('Plus que 3 jours pour finir la saison « {name} » : tu es au palier {tier} sur {max}.', { name: t(se.name), tier, max: CODEX.tiers }), schedule: { at, allowWhileIdle: true } }] });
  } catch (e) { /* rien */ }
}

// Parties en ligne où c'est à toi de jouer : rappel avant la fin du délai (les autres rappels sont retirés)
export async function syncReminders(g, turns) {
  const L = LN(); if (!L) return;
  const old = (await pendingIds()).filter((id) => id >= REMIND_BASE && id < REMIND_BASE + 9000);
  await cancel(old);
  if (!g.s.settings.notif) return;
  const list = turns.map((v) => ({ v, at: new Date(new Date(v.deadline).getTime() - REMIND_HOURS * 3600000) })).filter((x) => x.at.getTime() > Date.now() + 60000);
  if (!list.length) return;
  try {
    await L.schedule({ notifications: list.map(({ v, at }) => ({ id: idOf(v.id), title: t({ pacte: 'Le Pacte', encheres: 'Les Enchères de Mammon', cryptes: 'Les Cryptes' }[v.game] || 'Duels des Sceaux'), body: t('Plus que {h} h pour jouer ton coup contre {foe}, sinon la partie est perdue !', { h: REMIND_HOURS, foe: v.foe?.pseudo || t('ton adversaire') }), schedule: { at, allowWhileIdle: true } })) });
  } catch (e) { /* rien */ }
}

export async function clearAll() {
  const L = LN(); if (!L) return;
  await cancel((await pendingIds()).filter((id) => id === DAILY_ID || id === CODEX_ID || id === STREAK_ID || id === EVE_ID || id === SHADOW_ID || (id >= REMIND_BASE && id < REMIND_BASE + 9000)));
}

// Une seule fois, dans l'app : proposer les notifications (après l'arrivée du joueur, sur l'Accueil, sans fenêtre ouverte)
export async function maybeAsk(app) {
  const g = app.game;
  if (!notifSupported() || g.s.notifAsked || g.welcomePending() || app.route !== '' || document.querySelector('.sheet-wrap, .opening, .vd')) return;
  g.s.notifAsked = true; g.persist();
  const { openSheet } = await import('./ui/dom.js');
  const sh = openSheet(`<div class="notif-ask"><h2>Être prévenu ?</h2>
      <p>${PN() ? 'ABYSSAL peut te prévenir quand ton <b>booster gratuit du jour</b> t’attend, quand c’est <b>à toi de jouer</b> contre un autre joueur, quand on te lance un <b>défi</b> et quand on te demande en <b>ami</b>.' : 'ABYSSAL peut t’envoyer une notification quand ton <b>booster gratuit du jour</b> t’attend, et avant la fin du délai quand c’est <b>à toi de jouer</b> contre un autre joueur.'}</p>
      <p class="small muted">Tu peux changer d’avis à tout moment : Réglages → Jeu → Notifications.</p>
      <div class="row gap"><button class="btn ghost" data-n="no">Non merci</button><button class="btn primary" data-n="yes">Oui, me prévenir</button></div></div>`, { cls: 'sheet-small', label: 'Notifications' });
  sh.body.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-n]'); if (!b) return;
    sh.close();
    if (b.dataset.n === 'yes') await enable(app, true);
  });
}
// Active ou coupe les notifications (avec la demande d'autorisation du téléphone)
export async function enable(app, on) {
  const g = app.game;
  if (on && !(await askPermission())) {
    g.setSetting('notif', false);
    const { toast } = await import('./ui/dom.js');
    toast('Notifications refusées : autorise-les dans les Réglages du téléphone → ABYSSAL → Notifications.', { kind: 'error', icon: 'info', ms: 6000 });
    return false;
  }
  if (!on) await pushOff(); /* v693 : avant de couper, le serveur oublie ce téléphone */
  g.setSetting('notif', !!on);
  if (on) await syncDaily(g); else await clearAll();
  syncPush(app).catch(() => {});
  return on;
}
