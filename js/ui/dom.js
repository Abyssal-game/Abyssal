// Petits outils d'interface : échappement, fenêtres, notifications, confirmation.
import { icon } from './icons.js';
import { sfx } from './sound.js';

// v308 : espace insécable avant « : ; ! ? % » et après « (typographie française : jamais de « : » seul en début de ligne)
export const frSpaces = (h) => String(h).replace(/ ([:;!?»%])/g, '\u00a0$1').replace(/« /g, '«\u00a0');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n));
export const pct = (x, d = 0) => `${(x * 100).toFixed(d).replace('.', ',')}\u00a0%`; /* v536 : espace insécable (« (0 » / « %) » sur deux lignes) */

export function reducedMotion(settings) {
  if (settings?.motion === 'reduced') return true;
  if (settings?.motion === 'full') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Notifications courtes -------------------------------------------------------
// v292 : une annonce à la fois — les suivantes attendent que la précédente s'efface (les erreurs passent devant)
const toastQueue = [];
let toastBusy = false;
export function toast(html, opts = {}) {
  html = frSpaces(html);
  if (opts.kind === 'error') toastQueue.unshift([html, opts]); else toastQueue.push([html, opts]);
  if (toastQueue.length > 6) toastQueue.splice(1, toastQueue.length - 6); // pas de file interminable
  if (!toastBusy) nextToast();
}
function nextToast() {
  const n = toastQueue.shift();
  if (!n) { toastBusy = false; return; }
  toastBusy = true;
  const [html, { kind = 'info', ms = 3200, icon: ic, onClick, onShow } = {}] = n;
  const root = document.getElementById('toasts');
  if (!root) { toastBusy = false; return; }
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.innerHTML = `${ic ? `<span class="toast-ic">${icon(ic)}</span>` : ''}<div>${html}</div>`;
  root.replaceChildren(el);
  requestAnimationFrame(() => el.classList.add('in'));
  try { onShow?.(); } catch (e) { /* un son ne bloque jamais l'annonce */ }
  let done = false;
  const close = () => { if (done) return; done = true; el.classList.remove('in'); setTimeout(() => { el.remove(); nextToast(); }, 300); };
  el.addEventListener('click', () => { onClick?.(); close(); });
  // file chargée : chaque annonce reste un peu moins longtemps
  setTimeout(close, toastQueue.length ? Math.min(ms, 3400) : ms);
}

/* v576 : attente d'une réponse du serveur : un petit sceau qui tourne apparaît après 180 ms (rien ne clignote si la réponse
   est rapide), pour qu'un toucher ne semble jamais ignoré. pending() renvoie la fonction qui le retire. */
export function pending(text = '') {
  let el = null;
  const t = setTimeout(() => {
    el = document.createElement('div'); el.className = 'pend'; el.setAttribute('role', 'status');
    el.innerHTML = `<span class="pend-ring"></span>${text ? `<b>${text}</b>` : ''}`;
    document.body.appendChild(el); requestAnimationFrame(() => el?.classList.add('on'));
  }, 180);
  return () => { clearTimeout(t); if (el) { const x = el; el = null; x.classList.remove('on'); setTimeout(() => x.remove(), 160); } };
}
export async function withPending(promise, text) { const done = pending(text); try { return await promise; } finally { done(); } }

// Fenêtres superposées (feuilles) ----------------------------------------------
const stack = [];
// v319 : chaque feuille ouverte ajoute une entrée d'historique. Le bouton retour (navigateur, Android, geste) ferme
// alors la feuille au lieu de quitter la page. Quand on ferme la feuille autrement (croix, fond, Échap), on retire
// cette entrée avec history.back(), et on ignore le popstate que cela provoque.
let popPending = 0;
let afterPop = [];
export function handlePopstate() {
  if (popPending > 0) { popPending--; if (!popPending) flushAfterPop(); return; }
  /* v536 : entrée d'une feuille fermée par un changement de page : on la saute (sinon le retour suivant ne faisait rien) */
  if (!stack.length) { if (history.state?.sheet) history.back(); return; }
  closeTopSheet(true);
}
function flushAfterPop() { const q = afterPop; afterPop = []; q.forEach((fn) => fn()); }
// v376 : changer de page juste après avoir fermé une feuille : le history.back() de la fermeture arrive plus tard et
// ramenait sur la page quittée (« Mettre en pause » restait dans le combat) ; on attend donc qu'il soit passé
export function afterHistory(fn) {
  if (popPending <= 0) return fn();
  afterPop.push(fn);
  setTimeout(() => { if (afterPop.includes(fn)) { popPending = 0; flushAfterPop(); } }, 600); /* filet : popstate jamais reçu */
}
// changement de page pendant qu'une feuille est ouverte : on la ferme sans toucher à l'historique
window.addEventListener('hashchange', () => { while (stack.length) stack[stack.length - 1].close(true); });
export function openSheet(html, { cls = '', onClose, label = 'Fenêtre', full = false } = {}) {
  const root = document.getElementById('overlay-root');
  const wrap = document.createElement('div');
  wrap.className = `sheet-wrap ${full ? 'sheet-full' : ''}`;
  wrap.innerHTML = `<div class="sheet-backdrop"></div><section class="sheet ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label)}"><button class="sheet-close icon-btn" aria-label="Fermer">${icon('close')}</button><div class="sheet-body">${html}</div></section>`;
  root.appendChild(wrap);
  sfx.sheet();
  document.body.classList.add('has-sheet');
  const prevFocus = document.activeElement;
  let pushed = false;
  try { history.pushState({ sheet: true }, ''); pushed = true; } catch (e) { pushed = false; }
  const api = {
    el: wrap.querySelector('.sheet'),
    body: wrap.querySelector('.sheet-body'),
    close(fromHistory) {
      if (api.closed) return;
      api.closed = true;
      if (pushed && fromHistory !== true) { popPending++; history.back(); }
      wrap.classList.remove('in');
      const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1);
      if (!stack.length && !document.querySelector('.opening')) { document.body.classList.remove('has-sheet'); }
      setTimeout(() => wrap.remove(), 260);
      onClose && onClose();
      prevFocus && prevFocus.focus && prevFocus.focus({ preventScroll: true });
    },
    setContent(h) { api.body.innerHTML = h; },
  };
  wrap.querySelector('.sheet-backdrop').addEventListener('click', () => api.close());
  wrap.querySelector('.sheet-close').addEventListener('click', () => api.close());
  stack.push(api);
  requestAnimationFrame(() => { wrap.classList.add('in'); api.el.querySelector('.sheet-close').focus({ preventScroll: true }); });
  return api;
}
export function closeTopSheet(fromHistory) { const s = stack[stack.length - 1]; if (s) { s.close(fromHistory === true); return true; } return false; }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeTopSheet(); });

export function confirmBox(text, { ok = 'Confirmer', cancel = 'Annuler', danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const s = openSheet(`<div class="confirm"><p>${frSpaces(text)}</p><div class="row gap"><button class="btn ghost" data-a="no">${esc(cancel)}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-a="yes">${esc(ok)}</button></div></div>`, {
      cls: 'sheet-small', label: 'Confirmation', onClose: () => { if (!done) resolve(false); },
    });
    s.body.addEventListener('click', (e) => {
      const a = e.target.closest('[data-a]');
      if (!a) return;
      done = true;
      resolve(a.dataset.a === 'yes');
      s.close();
    });
  });
}

// Délégation d'événements par attribut data-act
export function bindActions(root, handlers) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !root.contains(el)) return;
    const fn = handlers[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
}
