// Synchronisation : la sauvegarde part en ligne quelques secondes après chaque changement,
// le profil public suit, et les scores de la Descente sont envoyés au classement.
import * as cloud from './cloud.js';
import { migrate } from '../core/save.js';
import { today } from '../core/save.js';
import { openSheet, esc, toast } from '../ui/dom.js';

export const sync = { status: 'off', lastPush: 0, error: null, profile: null };
let app = null, timer = 0, busy = false, pending = false;
const listeners = new Set();
export const onSync = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((f) => f(sync));

function profilePayload() {
  const g = app.game, s = g.s;
  return { avatar: s.avatar, title: s.title, level: g.levelInfo().level, owned: g.uniqueCount() };
}

export async function pushNow() {
  if (!cloud.isLoggedIn() || !app) return;
  if (busy) { pending = true; return; }
  busy = true; sync.status = 'saving'; emit();
  try {
    sync.lastPush = await cloud.pushSave(app.game.s);
    if (sync.profile?.pseudo) await cloud.saveProfile({ pseudo: sync.profile.pseudo, ...profilePayload() });
    sync.status = 'ok'; sync.error = null;
  } catch (e) { sync.status = 'error'; sync.error = e.message; }
  busy = false; emit();
  if (pending) { pending = false; schedule(); }
}
function schedule() { clearTimeout(timer); timer = setTimeout(pushNow, 4000); }

// Remplace la partie de cet appareil par une sauvegarde venue du serveur.
function adopt(data) {
  const s = migrate(data);
  app.game.s = s;
  app.game.persist();
  app.applySettings?.();
  app.refresh();
}
const fresh = (s) => !s.stats.boosters && !Object.keys(s.collection).length;
const describe = (s, when) => `${Object.keys(s.collection || {}).length} créatures · ${s.stats?.boosters || 0} boosters ouverts${when ? ` · ${new Date(when).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}`;

// Après connexion : choisir quelle partie garder si les deux existent.
export async function afterLogin() {
  sync.status = 'saving'; emit();
  const remote = await cloud.pullSave();
  try { sync.profile = await cloud.getProfile(); } catch (e) { sync.profile = null; }
  const local = app.game.s;
  if (!remote) { await pushNow(); return 'pushed'; }
  if (fresh(local)) { adopt(remote.data); sync.status = 'ok'; sync.lastPush = Date.now(); emit(); return 'pulled'; }
  const choice = await new Promise((resolve) => {
    const sh = openSheet(`<h2>Deux parties trouvées</h2>
      <p class="small muted">Laquelle veux-tu garder ? L’autre sera remplacée.</p>
      <button class="btn block sync-pick" data-c="remote"><b>Partie en ligne</b><span class="small muted">${esc(describe(remote.data, remote.updated_at))}</span></button>
      <button class="btn block sync-pick" data-c="local"><b>Partie de cet appareil</b><span class="small muted">${esc(describe(local, local.updatedAt))}</span></button>`, { cls: 'sheet-small', label: 'Choisir la partie', onClose: () => resolve(null) });
    sh.body.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) { const c = b.dataset.c; resolve(c); sh.close(); } });
  });
  if (choice === 'remote') { adopt(remote.data); sync.status = 'ok'; sync.lastPush = Date.now(); emit(); return 'pulled'; }
  if (choice === 'local') { await pushNow(); return 'pushed'; }
  sync.status = 'paused'; emit();
  return 'cancelled';
}

export async function restoreFromCloud() {
  const remote = await cloud.pullSave();
  if (!remote) throw new Error('Aucune sauvegarde en ligne pour ce compte.');
  adopt(remote.data);
  sync.lastPush = Date.now();
  emit();
}

export async function setPseudo(pseudo) {
  const p = pseudo.trim();
  await cloud.saveProfile({ pseudo: p, ...profilePayload() });
  sync.profile = { ...(sync.profile || {}), pseudo: p };
  emit();
}

export function startSync(theApp) {
  app = theApp;
  app.game.on('change', () => { if (cloud.isLoggedIn() && sync.status !== 'paused') schedule(); });
  app.game.on('descentEnd', () => {
    if (!cloud.isLoggedIn() || !sync.profile?.pseudo) return;
    if (app.game.s.settings.dev) return; // pas de score au classement en Mode Créateur
    const d = app.game.s.descent;
    cloud.submitScore(d.day || today(), d.bestToday, !!d.cursed).catch(() => {});
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && cloud.isLoggedIn()) { clearTimeout(timer); pushNow(); } });
  if (cloud.isLoggedIn()) {
    sync.status = 'ok';
    cloud.getProfile().then((p) => { sync.profile = p; emit(); }).catch(() => {});
  }
}
