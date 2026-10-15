// Bulles d'aide : expliquent une chose au bon moment, une seule fois par partie.
// coach(app, clé, texte) affiche la bulle et se résout quand le joueur la ferme.
import { icon } from './icons.js';

export function tipSeen(app, key) { return !!app.game.s.tips?.[key]; }

import { frSpaces } from './dom.js';
export { frSpaces };

export function coach(app, key, html, { title = '' } = {}) {
  html = frSpaces(html); title = frSpaces(title);
  const g = app.game;
  if (g.s.tips?.[key]) return Promise.resolve(false);
  if (document.body.classList.contains('gated')) return Promise.resolve(false); // v325 : pas de bulle derrière l'écran de compte
  g.s.tips = { ...(g.s.tips || {}), [key]: Date.now() };
  g.persist();
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'coach';
    el.setAttribute('role', 'dialog');
    el.innerHTML = `<div class="coach-box">
      ${title ? `<b class="coach-t">${icon('info')} ${title}</b>` : ''}
      <p>${html}</p>
      <button class="btn primary small" type="button">J’ai compris</button></div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('on'));
    // v311 : la bulle se ferme aussi avec Échap, et toute seule si on change d'écran (elle restait affichée par-dessus)
    let shut = false;
    const done = () => { if (shut) return; shut = true; window.removeEventListener('hashchange', done); document.removeEventListener('keydown', esc); el.classList.remove('on'); setTimeout(() => el.remove(), 250); resolve(true); };
    const esc = (e) => { if (e.key === 'Escape') done(); };
    el.querySelector('button').addEventListener('click', done, { once: true });
    window.addEventListener('hashchange', done); document.addEventListener('keydown', esc);
  });
}

// Pour revoir toutes les bulles (depuis les Réglages)
export function resetTips(app) { app.game.s.tips = {}; app.game.persist(); }
