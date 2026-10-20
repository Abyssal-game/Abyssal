// v521 : notifications du téléphone (app iPhone et Android seulement, réglage « Notifications »).
// Notifications locales programmées par l'app elle-même (Capacitor LocalNotifications), sans serveur :
//  • le booster gratuit du jour, à 10 h, s'il n'est pas encore ouvert ;
//  • les parties en ligne : rappel 2 h avant la fin du délai quand c'est à toi de jouer.
// Les alertes en direct (« ton adversaire a joué », « ton défi a été relevé », demande d'ami) demandent des
// notifications envoyées par le serveur : prévues ensuite (clé Apple à créer par le propriétaire).
import { isNative } from './native.js';

const LN = () => (isNative() ? window.Capacitor?.Plugins?.LocalNotifications : null);
const DAILY_ID = 1001;
const REMIND_BASE = 20000;
const REMIND_HOURS = 2;
export const notifSupported = () => !!LN();

// Demande l'autorisation au téléphone ; renvoie true si les notifications sont permises
export async function askPermission() {
  const L = LN(); if (!L) return false;
  try {
    let p = await L.checkPermissions();
    if (p.display !== 'granted') p = await L.requestPermissions();
    return p.display === 'granted';
  } catch (e) { return false; }
}
const idOf = (s) => { let h = 0; for (const ch of String(s)) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0; return REMIND_BASE + (Math.abs(h) % 9000); };
async function pendingIds() { try { return ((await LN().getPending()).notifications || []).map((n) => n.id); } catch (e) { return []; } }
async function cancel(ids) { if (ids.length) { try { await LN().cancel({ notifications: ids.map((id) => ({ id })) }); } catch (e) { /* rien */ } } }

// Booster du jour : prochain 10 h où le booster gratuit est disponible et pas encore ouvert
export async function syncDaily(g) {
  const L = LN(); if (!L) return;
  await cancel([DAILY_ID]);
  if (!g.s.settings.notif) return;
  const now = new Date(), at = new Date(now); at.setHours(10, 0, 0, 0);
  const fresh = g.freePack().stock > 0;
  if (fresh && at > now) { /* aujourd'hui à 10 h */ } else { at.setDate(at.getDate() + 1); }
  try {
    await L.schedule({ notifications: [{ id: DAILY_ID, title: 'ABYSSAL', body: 'Ton booster gratuit du jour t’attend !', schedule: { at, allowWhileIdle: true } }] });
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
    await L.schedule({ notifications: list.map(({ v, at }) => ({ id: idOf(v.id), title: v.game === 'pacte' ? 'Le Pacte' : 'Duels des Sceaux', body: `Plus que ${REMIND_HOURS} h pour jouer ton coup contre ${v.foe?.pseudo || 'ton adversaire'}, sinon la partie est perdue !`, schedule: { at, allowWhileIdle: true } })) });
  } catch (e) { /* rien */ }
}

export async function clearAll() {
  const L = LN(); if (!L) return;
  await cancel((await pendingIds()).filter((id) => id === DAILY_ID || (id >= REMIND_BASE && id < REMIND_BASE + 9000)));
}

// Une seule fois, dans l'app : proposer les notifications (après l'arrivée du joueur, sur l'Accueil, sans fenêtre ouverte)
export async function maybeAsk(app) {
  const g = app.game;
  if (!notifSupported() || g.s.notifAsked || g.welcomePending() || app.route !== '' || document.querySelector('.sheet-wrap, .opening, .vd')) return;
  g.s.notifAsked = true; g.persist();
  const { openSheet } = await import('./ui/dom.js');
  const sh = openSheet(`<div class="notif-ask"><h2>Être prévenu ?</h2>
      <p>ABYSSAL peut t’envoyer une notification quand ton <b>booster gratuit du jour</b> t’attend, et avant la fin du délai quand c’est <b>à toi de jouer</b> contre un autre joueur.</p>
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
  g.setSetting('notif', !!on);
  if (on) await syncDaily(g); else await clearAll();
  return on;
}
