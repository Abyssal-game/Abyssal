// v917 : la fenêtre officielle de note de l'App Store / du Play Store (« Vous aimez ABYSSAL ? ★★★★★ »),
// demandée à un moment heureux : un gardien vaincu pour la première fois (le 1er, le 3e, le 10e) ou le fond de l'Abysse.
// Dans l'application seulement, avec le module natif InAppReview (@capacitor-community/in-app-review) : une application
// plus ancienne qui ne l'a pas ne montre rien. Apple et Google décident eux-mêmes d'afficher la fenêtre (3 fois par an
// au plus chez Apple) ; on la demande au plus 3 fois, à 45 jours d'écart au moins, jamais pendant un combat ou une fenêtre.
const KEY = 'abyssal.review';
const GAP = 45 * 86400000, MAX = 3, BOSS_MOMENTS = [1, 3, 10];

const plugin = () => (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.InAppReview : null) || null;
function load() { try { return JSON.parse(localStorage.getItem(KEY)) || { n: 0, last: 0 }; } catch (e) { return { n: 0, last: 0 }; } }
function save(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* stockage indisponible */ } }

/* Pure : faut-il demander maintenant ? */
export function reviewDue(st, now, bosses, summit) {
  if ((st.n || 0) >= MAX || now - (st.last || 0) < GAP) return false;
  return !!summit || BOSS_MOMENTS.includes(bosses);
}

const busy = () => typeof document !== 'undefined' && !!document.querySelector('.sheet-wrap, .chx, .opening, .bx-intro, .coach, .endx, body.battle-mode');

/* À appeler après une victoire de la Descente : out = résultat de finishBattle */
export function maybeAskReview(game, out) {
  const P = plugin();
  if (!P || !out || out.lost) return;
  const first = !!(out.boss?.first || out.summary?.boss?.first);
  if (!first && !out.summit) return;
  const st = load(), now = Date.now();
  if (!reviewDue(st, now, Object.keys(game.s.bossesBeaten || {}).length, !!out.summit)) return;
  let tries = 0;
  const go = () => {
    if (busy()) { if (++tries < 40) setTimeout(go, 1500); return; }
    save({ n: (st.n || 0) + 1, last: Date.now() });
    Promise.resolve(P.requestReview?.()).catch(() => {});
  };
  setTimeout(go, 3500);
}
