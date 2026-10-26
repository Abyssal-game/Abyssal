// v804 : journal des erreurs de l'app (Mode Créateur → Diagnostic) : les 25 dernières erreurs JavaScript, gardées
// sur l'appareil, pour que le propriétaire puisse les copier (il n'a pas accès à la console de l'iPhone).
import { VERSION } from '../config.js';

const KEY = 'abyssal.errLog';
export function errLog() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
export function errClear() { try { localStorage.removeItem(KEY); } catch (e) { /* rien */ } }
function note(msg, where) {
  const m = String(msg || '').slice(0, 300);
  if (!m || /ResizeObserver loop|Script error\.?$/.test(m)) return;
  try {
    const l = errLog(), last = l[0];
    if (last && last.m === m && Date.now() - last.t < 5000) return;
    l.unshift({ t: Date.now(), v: VERSION, r: location.hash || '#/', m, w: String(where || '').slice(0, 160) });
    localStorage.setItem(KEY, JSON.stringify(l.slice(0, 25)));
  } catch (e) { /* rien */ }
}
export function startErrLog() {
  window.addEventListener('error', (e) => { if (e.target && e.target !== window) return; note(e.message, `${(e.filename || '').split('/').pop()}:${e.lineno || ''}`); });
  window.addEventListener('unhandledrejection', (e) => { const r = e.reason; note(r?.message || r, r?.stack?.split('\n')[1]?.trim()); });
}
