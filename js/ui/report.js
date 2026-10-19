// Classements : toucher le pseudo d'un autre joueur pour l'ajouter en ami (v500), le signaler ou le masquer (exigence des stores).
import { esc, toast, openSheet } from './dom.js';
import { icon } from './icons.js';
import * as cloud from '../cloud/cloud.js';
import { isBlocked, setBlocked } from '../core/moderation.js';

const REASONS = [
  ['insulte', 'Insultant ou grossier'],
  ['haine', 'Haineux ou discriminatoire'],
  ['sexuel', 'Sexuel'],
  ['usurpation', 'Se fait passer pour quelqu’un'],
  ['autre', 'Autre raison'],
];

export const MASKED_NAME = 'Joueur masqué';
// v500 : réponse du serveur à une demande d'ami
export const FRIEND_MSG = { sent: 'Demande d’ami envoyée.', accepted: 'Vous êtes maintenant amis !', pending: 'Demande déjà envoyée : il doit l’accepter.', already: 'Vous êtes déjà amis.' };

// Attributs à poser sur une ligne de classement (rien pour sa propre ligne).
export function rowAttrs(uid, pseudo, me) {
  if (!uid || uid === me) return '';
  return ` data-uid="${esc(uid)}" data-pseudo="${esc(pseudo || '')}" role="button" tabindex="0"`;
}
// Nom affiché : « Joueur masqué » pour un joueur masqué sur cet appareil.
export const shownName = (uid, pseudo) => (isBlocked(uid) ? MASKED_NAME : pseudo || '?');

function openReport(uid, pseudo, onChange) {
  const blocked = isBlocked(uid);
  const s = openSheet(`<div class="rep stack">
      <h2>${esc(blocked ? MASKED_NAME : pseudo)}</h2>
      ${blocked ? '' : `<button class="btn primary block" data-f="1">${icon('user')}Ajouter en ami</button>`}
      <p class="small muted">Ce pseudo te semble choquant, haineux ou trompeur ? Signale-le : au bout de plusieurs signalements, il est masqué pour tout le monde. Ton signalement est anonyme pour ce joueur.</p>
      <div class="rep-reasons">${REASONS.map(([k, t]) => `<button class="btn small block" data-r="${k}">${esc(t)}</button>`).join('')}</div>
      <button class="btn ghost block" data-b="1">${blocked ? icon('eye') : ''}${blocked ? 'Réafficher ce joueur' : 'Masquer ce joueur pour moi'}</button>
    </div>`, { cls: 'sheet-small', label: 'Signaler un pseudo' });
  let busy = false;
  s.body.addEventListener('click', async (e) => {
    if (e.target.closest('[data-f]')) {
      if (busy) return; busy = true;
      try { const out = await cloud.friendRequest(pseudo); toast(FRIEND_MSG[out] || 'Fait.', { kind: 'success', icon: 'user' }); s.close(); }
      catch (err) { toast(esc(err.message), { kind: 'error', icon: 'info', ms: 6000 }); busy = false; }
      return;
    }
    const b = e.target.closest('[data-b]');
    if (b) {
      setBlocked(uid, !blocked);
      toast(blocked ? 'Joueur réaffiché.' : 'Joueur masqué sur cet appareil.', { icon: 'user' });
      s.close(); onChange && onChange();
      return;
    }
    const r = e.target.closest('[data-r]');
    if (!r || busy) return;
    busy = true;
    try {
      const out = await cloud.reportPseudo(uid, r.dataset.r);
      setBlocked(uid, true);
      toast(out === 'masqué' ? 'Merci. Ce pseudo est maintenant masqué pour tout le monde.' : 'Merci, ton signalement a été envoyé. Ce joueur est masqué pour toi.', { kind: 'success', icon: 'check' });
      s.close(); onChange && onChange();
    } catch (err) {
      toast(esc(err.status === 404 ? 'Le signalement n’est pas encore activé sur le serveur.' : err.message), { kind: 'error', icon: 'info', ms: 6000 });
      busy = false;
    }
  });
}

// Branche le toucher sur toutes les lignes d'un classement (à appeler une fois par boîte).
export function bindReport(box, onChange) {
  if (!box || box.dataset.rep) return;
  box.dataset.rep = '1';
  const go = (e) => {
    const row = e.target.closest('.lb-row[data-uid]');
    if (!row || !box.contains(row)) return;
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    openReport(row.dataset.uid, row.dataset.pseudo, onChange);
  };
  box.addEventListener('click', go);
  box.addEventListener('keydown', go);
}
