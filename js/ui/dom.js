// Petits outils d'interface : échappement, fenêtres, notifications, confirmation.
import { icon } from './icons.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n));
export const pct = (x, d = 0) => `${(x * 100).toFixed(d).replace('.', ',')} %`;

export function reducedMotion(settings) {
  if (settings?.motion === 'reduced') return true;
  if (settings?.motion === 'full') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Notifications courtes -------------------------------------------------------
export function toast(html, { kind = 'info', ms = 3200, icon: ic } = {}) {
  const root = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.innerHTML = `${ic ? `<span class="toast-ic">${icon(ic)}</span>` : ''}<div>${html}</div>`;
  root.appendChild(el);
  while (root.children.length > 2) root.firstElementChild.remove();
  requestAnimationFrame(() => el.classList.add('in'));
  const close = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); };
  el.addEventListener('click', close);
  setTimeout(close, ms);
}

// Fenêtres superposées (feuilles) ----------------------------------------------
const stack = [];
export function openSheet(html, { cls = '', onClose, label = 'Fenêtre', full = false } = {}) {
  const root = document.getElementById('overlay-root');
  const wrap = document.createElement('div');
  wrap.className = `sheet-wrap ${full ? 'sheet-full' : ''}`;
  wrap.innerHTML = `<div class="sheet-backdrop"></div><section class="sheet ${cls}" role="dialog" aria-modal="true" aria-label="${esc(label)}"><button class="sheet-close icon-btn" aria-label="Fermer">${icon('close')}</button><div class="sheet-body">${html}</div></section>`;
  root.appendChild(wrap);
  document.body.classList.add('has-sheet');
  const prevFocus = document.activeElement;
  const api = {
    el: wrap.querySelector('.sheet'),
    body: wrap.querySelector('.sheet-body'),
    close() {
      if (api.closed) return;
      api.closed = true;
      wrap.classList.remove('in');
      const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1);
      if (!stack.length && !document.querySelector('.opening')) document.body.classList.remove('has-sheet');
      setTimeout(() => wrap.remove(), 260);
      onClose && onClose();
      prevFocus && prevFocus.focus && prevFocus.focus({ preventScroll: true });
    },
    setContent(h) { api.body.innerHTML = h; },
  };
  wrap.querySelector('.sheet-backdrop').addEventListener('click', api.close);
  wrap.querySelector('.sheet-close').addEventListener('click', api.close);
  stack.push(api);
  requestAnimationFrame(() => { wrap.classList.add('in'); api.el.querySelector('.sheet-close').focus({ preventScroll: true }); });
  return api;
}
export function closeTopSheet() { const s = stack[stack.length - 1]; if (s) { s.close(); return true; } return false; }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeTopSheet(); });

export function confirmBox(text, { ok = 'Confirmer', cancel = 'Annuler', danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const s = openSheet(`<div class="confirm"><p>${text}</p><div class="row gap"><button class="btn ghost" data-a="no">${esc(cancel)}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-a="yes">${esc(ok)}</button></div></div>`, {
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
