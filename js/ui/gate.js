// v325 : compte obligatoire (décision du propriétaire, 15 octobre 2026).
// Au lancement, tant qu'aucun compte n'est connecté sur l'appareil, un écran plein recouvre le jeu :
// créer un compte, se connecter ou retrouver son mot de passe (le formulaire est celui de l'écran Compte).
// La partie déjà présente sur l'appareil n'est jamais effacée : à la connexion, elle part en ligne
// (ou le joueur choisit quelle partie garder si le compte en a déjà une). Une fois connecté, le jeu
// reste jouable hors ligne ; l'écran revient seulement après une déconnexion ou une suppression du compte.
import * as cloud from '../cloud/cloud.js';
import accountScreen from '../screens/account.js';

const BYPASS_KEY = 'abyssal.nogate'; // réservé aux outils (captures des stores, essai Android)
// v331 : mode invité (décision du propriétaire du 16 octobre 2026) : on peut jouer sans compte, en sachant que la
// progression reste seulement sur l'appareil. Le choix est mémorisé ; il s'efface dès qu'un compte se connecte.
const GUEST_KEY = 'abyssal.guest';
export const isGuest = () => { try { return !cloud.isLoggedIn() && localStorage.getItem(GUEST_KEY) === '1'; } catch (e) { return false; } };
export function needsAccount() {
  if (cloud.isLoggedIn()) return false;
  try { if (localStorage.getItem(BYPASS_KEY) === '1' || localStorage.getItem(GUEST_KEY) === '1') return false; } catch (e) { /* rien */ }
  return true;
}
cloud.onAuth((s) => { if (s?.access_token) { try { localStorage.removeItem(GUEST_KEY); } catch (e) { /* rien */ } } });

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
      <button class="btn ghost block gate-guest" type="button">Jouer sans compte</button>
      <p class="small muted center gate-guest-note">Sans compte, ta progression reste <b>seulement sur cet appareil</b> : elle est perdue si tu supprimes l’application ou changes de téléphone.</p>
    </div>`;
  document.body.appendChild(el);
  const saved = app.params;
  app.params = ['inscription']; // un nouveau joueur voit d'abord « Créer un compte »
  const stopScreen = accountScreen(app, el.querySelector('.gate-acc'));
  app.params = saved;
  requestAnimationFrame(() => el.classList.add('on'));
  const off = cloud.onAuth((s) => { if (s?.access_token) close(); });
  el.querySelector('.gate-guest').addEventListener('click', async () => {
    const { confirmBox } = await import('./dom.js');
    const ok = await confirmBox('Jouer sans compte ?<br><br>Ta progression ne sera <b>pas sauvegardée en ligne</b> : si tu supprimes l’application, vides les données du navigateur ou changes de téléphone, <b>elle sera perdue</b>. Pas de classement ni de Tirage des Ombres non plus.<br><br>Tu pourras créer un compte plus tard (Sanctuaire → Compte) : ta partie y sera alors envoyée.', { ok: 'Jouer sans compte', cancel: 'Créer un compte' });
    if (!ok) return;
    try { localStorage.setItem(GUEST_KEY, '1'); } catch (e) { /* rien */ }
    close();
  });
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
