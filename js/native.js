// Application des stores (Capacitor, Android puis iPhone) : ce qui change par rapport à la version web.
// Dans un navigateur, rien ici ne s'active. Les modules natifs sont fournis par l'application elle-même
// (window.Capacitor.Plugins), sans bibliothèque à charger.
import { closeTopSheet } from './ui/dom.js';

const cap = () => (typeof window !== 'undefined' ? window.Capacitor : null);
export const isNative = () => !!cap()?.isNativePlatform?.();
const plugin = (name) => cap()?.Plugins?.[name] || null;

// Bouton retour d'Android : ferme d'abord ce qui est ouvert, puis revient à l'écran précédent,
// et seulement à l'accueil met l'application en arrière-plan.
function onBack() {
  if (closeTopSheet()) return;
  // ouverture d'un coffre, présentation d'un gardien : on attend le toucher du joueur
  if (document.querySelector('.chx, .bx-intro')) return;
  if (document.querySelector('.vd')) { document.querySelector('.vd [data-v="close"], .vd [data-v="all"]')?.click(); return; } /* v521 : face-à-face du Pari */
  if (document.querySelector('.opening')) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); return; }
  const tip = document.querySelector('.coach button');
  if (tip) { tip.click(); return; }
  if (document.querySelector('.sc-dlg')) { document.dispatchEvent(new PointerEvent('pointerdown')); return; }
  const back = document.querySelector('.sc-end [data-x="back"]');
  if (back) { back.click(); return; }
  const route = location.hash.replace(/^#\/?/, '');
  if (!route) { plugin('App')?.minimizeApp?.(); return; }
  if (history.length > 1) history.back(); else location.hash = '#/';
}

export function initNative({ suspendAudio, resumeAudio } = {}) {
  if (!isNative()) return false;
  document.documentElement.classList.add('native');
  const App = plugin('App');
  App?.addListener?.('backButton', onBack);
  // v372 : dans l'application, un lien « nouvelle fenêtre » vers une page du jeu (politique de confidentialité) partait
  // vers une autre application de l'iPhone (adresse capacitor://). On l'ouvre dans l'app ; sa croix ramène au jeu.
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[target="_blank"]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (/^[a-z]+:/i.test(href)) return; // lien vers un autre site : comportement normal
    e.preventDefault();
    location.href = href;
  }, true);
  // musique et sons coupés quand l'application passe en arrière-plan
  App?.addListener?.('appStateChange', ({ isActive }) => { (isActive ? resumeAudio : suspendAudio)?.(); });
  return true;
}

// Export de la sauvegarde : dans l'application, on passe par le menu Partager du téléphone
// (Enregistrer dans Fichiers, Drive, e-mail…). Renvoie false hors application.
export async function shareFile(name, text) {
  const Filesystem = plugin('Filesystem'), Share = plugin('Share');
  if (!isNative() || !Filesystem || !Share) return false;
  const { uri } = await Filesystem.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' });
  try { await Share.share({ title: 'Sauvegarde ABYSSAL', files: [uri] }); }
  catch (e) { if (!/cancel/i.test(String(e?.message || e))) throw e; }
  return true;
}
