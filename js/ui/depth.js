// v793 : effet de profondeur. Quand on incline le téléphone, les reflets des grandes cartes glissent comme sur une vraie
// carte holographique, et le décor de l'Accueil bouge un peu derrière la page. Réglage : Réglages → Jeu → Affichage.
// Sur iPhone, il faut l'accord du joueur (fenêtre de l'iPhone « accès aux mouvements ») : demandé seulement quand il active
// le réglage (geste du doigt obligatoire). Aucune rotation 3D (v419) : seulement des reflets et de petits décalages.
const subs = new Set();
let on = false, listening = false, lastEvt = 0, denied = false, rearmed = false, base = null, cur = { x: 0, y: 0 }, raw = { x: 0, y: 0 }, raf = 0, lastT = 0;
const clamp = (v) => Math.max(-1, Math.min(1, v));
export const depthNeedsPermission = () => typeof window !== 'undefined' && typeof window.DeviceOrientationEvent?.requestPermission === 'function';
export const depthSupported = () => typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
export const depthValue = () => cur;
/** cb({x, y}) à chaque changement (x : gauche/droite, y : avant/arrière, de −1 à 1) ; renvoie la fonction pour se désabonner */
export function onDepth(cb) { subs.add(cb); return () => subs.delete(cb); }

function orient(e) {
  if (e.gamma == null || e.beta == null) return;
  lastEvt = Date.now();
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
  if (on && ok && depthNeedsPermission()) rearm();
}
/* v867 : dans l'app iPhone, l'accès aux mouvements accordé une fois ne survit pas toujours à un nouveau lancement : rien
   n'arrivait et l'effet restait immobile. Au premier toucher, si aucun mouvement n'est arrivé, on redemande l'accès
   (l'iPhone répond tout de suite s'il l'a gardé, sinon il affiche sa fenêtre). */
function rearm() {
  if (rearmed) return;
  rearmed = true;
  const go = async () => {
    if (lastEvt || !on) return done();
    try {
      const r = await window.DeviceOrientationEvent.requestPermission();
      try { localStorage.setItem('abyssal.motion', r); } catch (e) { /* rien */ }
      denied = r !== 'granted';
      if (!denied) { listening = false; listen(true); }
    } catch (e) { /* pas un geste valable : on réessaiera au toucher suivant */ return; }
    done();
  };
  const done = () => { window.removeEventListener('touchend', go, true); window.removeEventListener('click', go, true); };
  window.addEventListener('touchend', go, true); window.addEventListener('click', go, true);
}
/** v867 : état lisible pour Réglages : 'off', 'denied', 'waiting' (aucun mouvement reçu), 'ok' */
export const depthStatus = () => (!on ? 'off' : denied ? 'denied' : lastEvt && Date.now() - lastEvt < 5000 ? 'ok' : 'waiting');
/** à appeler pendant un toucher (activation du réglage) : demande l'accord de l'iPhone ; renvoie true si l'effet peut marcher */
export async function askDepth() {
  if (!depthSupported()) return false;
  if (!depthNeedsPermission()) { on = true; listen(true); return true; }
  try {
    const r = await window.DeviceOrientationEvent.requestPermission();
    try { localStorage.setItem('abyssal.motion', r); } catch (e) { /* rien */ }
    denied = r !== 'granted';
    if (r === 'granted') { on = true; listening = false; listen(true); return true; }
  } catch (e) { /* refusé ou indisponible */ }
  return false;
}
