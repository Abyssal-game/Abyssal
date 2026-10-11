// Bulles d'aide : expliquent une chose au bon moment, une seule fois par partie.
// coach(app, clé, texte) affiche la bulle et se résout quand le joueur la ferme.
import { icon } from './icons.js';

export function tipSeen(app, key) { return !!app.game.s.tips?.[key]; }

export function coach(app, key, html, { title = '' } = {}) {
  const g = app.game;
  if (g.s.tips?.[key]) return Promise.resolve(false);
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
    const done = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 250); resolve(true); };
    el.querySelector('button').addEventListener('click', done, { once: true });
  });
}

// Pour revoir toutes les bulles (depuis les Réglages)
export function resetTips(app) { app.game.s.tips = {}; app.game.persist(); }
