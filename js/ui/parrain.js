// v881 : code de parrainage entré à l'inscription (ou reçu par un lien « ?parrain=… ») : gardé sur l'appareil puis envoyé au
// serveur de partie une fois le compte prêt (après le choix du pseudo, pour que parrain et filleul deviennent amis).
import { isLoggedIn } from '../cloud/cloud.js';
import { esc, toast } from './dom.js';
import { t } from '../i18n.js';

const KEY = 'abyssal.parrainCode';
const clean = (v) => String(v || '').trim().slice(0, 16);
export function stashCode(v) { const c = clean(v); try { if (c.length >= 3) localStorage.setItem(KEY, c); else localStorage.removeItem(KEY); } catch (e) { /* rien */ } }
export function pendingCode() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
const dropCode = () => { try { localStorage.removeItem(KEY); } catch (e) { /* rien */ } };
// lien d'invitation du site (…/Abyssal/?parrain=Pseudo)
export function captureCode() {
  try { const c = new URLSearchParams(location.search).get('parrain'); if (c && /^[\p{L}\p{N}_ -]{3,16}$/u.test(c)) stashCode(c); } catch (e) { /* rien */ }
}

export async function linkParrain(app, code) {
  try {
    const r = await app.partie.first('parrainLink', clean(code));
    toast(t('{name} est ton parrain ! Joue 3 jours différents et bats le premier gardien : vous serez récompensés tous les deux.', { name: `<b>${esc(r?.pseudo || code)}</b>` }), { kind: 'success', icon: 'user', ms: 8000 });
    return true;
  } catch (e) { toast(esc(e.message), { kind: 'error', icon: 'info', ms: 7000 }); return false; }
}
let tried = false;
export async function tryPendingParrain(app) {
  const c = pendingCode();
  if (!c || tried || !isLoggedIn() || !app.partie) return;
  tried = true; dropCode();
  await linkParrain(app, c);
}
