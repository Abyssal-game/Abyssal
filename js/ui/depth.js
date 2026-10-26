// v793 : effet de profondeur. Quand on incline le téléphone, les reflets des grandes cartes glissent comme sur une vraie
// carte holographique, et le décor de l'Accueil bouge un peu derrière la page. Réglage : Réglages → Jeu → Affichage.
// Sur iPhone, il faut l'accord du joueur (fenêtre de l'iPhone « accès aux mouvements ») : demandé seulement quand il active
// le réglage (geste du doigt obligatoire). Aucune rotation 3D (v419) : seulement des reflets et de petits décalages.
const subs = new Set();
let on = false, listening = false, base = null, cur = { x: 0, y: 0 }, raw = { x: 0, y: 0 }, raf = 0, lastT = 0;
const clamp = (v) => Math.max(-1, Math.min(1, v));
export const depthNeedsPermission = () => typeof window !== 'undefined' && typeof window.DeviceOrientationEvent?.requestPermission === 'function';
export const depthSupported = () => typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
export const depthValue = () => cur;
/** cb({x, y}) à chaque changement (x : gauche/droite, y : avant/arrière, de −1 à 1) ; renvoie la fonction pour se désabonner */
export function onDepth(cb) { subs.add(cb); return () => subs.delete(cb); }

function orient(e) {
  if (e.gamma == null || e.beta == null) return;
  if (!base) base = { g: e.gamma, b: e.beta };
  // la position tenue en main devient peu à peu la position « droite »
  base.g += (e.gamma - base.g) * 0.012; base.b += (e.beta - base.b) * 0.012;
  raw = { x: clamp((e.gamma - base.g) / 22), y: clamp((e.beta - base.b) / 22) };
  if (!raf) raf = requestAnimationFrame(tick);
}
function tick(now) {
  raf = 0;
  if (now - lastT < 32) { raf = requestAnimationFrame(tick); return; } /* 30 images par seconde au plus */
  lastT = now;
  const nx = cur.x + (raw.x - cur.x) * 0.25, ny = cur.y + (raw.y - cur.y) * 0.25;
  const moved = Math.abs(nx - cur.x) + Math.abs(ny - cur.y) > 0.003;
  cur = { x: nx, y: ny };
  if (moved && !document.hidden && !document.body.classList.contains('battle-mode')) {
    for (const cb of subs) { try { cb(cur); } catch (e) { /* abonné disparu */ } }
    const sky = document.querySelector('.home-sky');
    if (sky) { sky.style.setProperty('--dx', cur.x.toFixed(3)); sky.style.setProperty('--dy', cur.y.toFixed(3)); }
  }
  if (moved) raf = requestAnimationFrame(tick);
}
function listen(v) {
  if (v === listening) return;
  listening = v;
  if (v) window.addEventListener('deviceorientation', orient);
  else { window.removeEventListener('deviceorientation', orient); base = null; cur = { x: 0, y: 0 }; for (const cb of subs) { try { cb(cur); } catch (e) { /* rien */ } } }
}
/** appelé par applySettings : true = le joueur veut l'effet */
export function setDepth(want) {
  on = !!want && depthSupported();
  let ok = !depthNeedsPermission();
  try { if (localStorage.getItem('abyssal.motion') === 'granted') ok = true; } catch (e) { /* rien */ }
  listen(on && ok);
}
/** à appeler pendant un toucher (activation du réglage) : demande l'accord de l'iPhone ; renvoie true si l'effet peut marcher */
export async function askDepth() {
  if (!depthSupported()) return false;
  if (!depthNeedsPermission()) { on = true; listen(true); return true; }
  try {
    const r = await window.DeviceOrientationEvent.requestPermission();
    try { localStorage.setItem('abyssal.motion', r); } catch (e) { /* rien */ }
    if (r === 'granted') { on = true; listen(true); return true; }
  } catch (e) { /* refusé ou indisponible */ }
  return false;
}
