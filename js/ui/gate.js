// v325 : compte obligatoire (décision du propriétaire, 15 octobre 2026).
// Au lancement, tant qu'aucun compte n'est connecté sur l'appareil, un écran plein recouvre le jeu :
// créer un compte, se connecter ou retrouver son mot de passe (le formulaire est celui de l'écran Compte).
// La partie déjà présente sur l'appareil n'est jamais effacée : à la connexion, elle part en ligne
// (ou le joueur choisit quelle partie garder si le compte en a déjà une). Une fois connecté, le jeu
// reste jouable hors ligne ; l'écran revient seulement après une déconnexion ou une suppression du compte.
import * as cloud from '../cloud/cloud.js';
import accountScreen from '../screens/account.js';

const BYPASS_KEY = 'abyssal.nogate'; // réservé aux outils (captures des stores, essai Android)
// v515 : compte obligatoire de nouveau (décision du propriétaire du 20 octobre 2026 : la progression est liée au compte,
// e-mail et pseudo). Le mode invité de la v331 est retiré : un ancien invité voit l'écran Compte au lancement, et sa
// partie part sur le compte qu'il crée. L'ancienne clé 'abyssal.guest' est effacée.
try { localStorage.removeItem('abyssal.guest'); } catch (e) { /* rien */ }
export function needsAccount() {
  if (cloud.isLoggedIn()) return false;
  try { if (localStorage.getItem(BYPASS_KEY) === '1') return false; } catch (e) { /* rien */ }
  return true;
}

let open = null;
export function showGate(app, then = () => {}) {
  if (!needsAccount()) { then(); return; }
  if (open) return;
  if (location.hash && location.hash !== '#/') location.replace('#/');
  document.body.classList.add('gated');
  const el = document.createElement('div');
  el.className = 'gate';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Compte');
  el.innerHTML = `<div class="gate-in">
      <img class="gate-logo" src="assets/brand/title.webp" alt="ABYSSAL — Le Bestiaire interdit">
      <p class="gate-lead">Crée ton compte pour entrer dans l’Abysse : ta collection est sauvegardée en ligne, tu la retrouves sur n’importe quel appareil, et tu entres dans les classements.</p>
      <div class="gate-acc"></div>
      <p class="small muted center gate-guest-note">Ta progression est liée à ton compte : si tu as déjà joué sur ce téléphone, ta partie y est envoyée dès que tu crées ton compte.</p>
    </div>`;
  document.body.appendChild(el);
  const saved = app.params;
  app.params = ['inscription']; // un nouveau joueur voit d'abord « Créer un compte »
  const stopScreen = accountScreen(app, el.querySelector('.gate-acc'));
  app.params = saved;
  requestAnimationFrame(() => el.classList.add('on'));
  const off = cloud.onAuth((s) => { if (s?.access_token) close(); });
  open = { el };
  function close() {
    off();
    try { stopScreen?.(); } catch (e) { /* rien */ }
    open = null;
    document.body.classList.remove('gated');
    el.classList.remove('on');
    setTimeout(() => el.remove(), 400);
    app.refresh();
    then();
  }
}
