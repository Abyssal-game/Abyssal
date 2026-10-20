// v519 : parties en ligne (Duels des Sceaux) : combien attendent ton coup. Vérifié au lancement, au retour dans l'app
// et toutes les 2 minutes ; une annonce « À toi de jouer » par coup à jouer (hors de l'écran des Sceaux).
import * as cloud from './cloud.js';
import { sync } from './sync.js';
import { esc, toast } from '../ui/dom.js';
import { t } from '../i18n.js';

export const mpw = { turns: 0 };
const SEEN = 'abyssal.mpSeen';
let last = 0, busy = false;

export async function checkTurns(app, { force = false } = {}) {
  if (busy || !cloud.isLoggedIn() || !sync.profile?.pseudo) return;
  if (!force && Date.now() - last < 110000) return;
  busy = true; last = Date.now();
  try {
    const mine = (await cloud.mpList('sceaux')).filter((v) => v.status === 'playing' && v.turn === v.me);
    let seen = {};
    try { seen = JSON.parse(localStorage.getItem(SEEN) || '{}'); } catch (e) { /* rien */ }
    for (const v of mine) {
      const key = `${v.id}:${v.state?.placed}`;
      if (seen[key]) continue;
      seen[key] = 1;
      if (app.route !== 'sceaux') toast(t('À toi de jouer aux Duels des Sceaux contre <b>{name}</b> !', { name: esc(v.foe?.pseudo || t('un joueur')) }), { icon: 'hourglass', ms: 5000 });
    }
    const keys = Object.keys(seen); if (keys.length > 100) seen = Object.fromEntries(keys.slice(-100).map((k) => [k, 1]));
    try { localStorage.setItem(SEEN, JSON.stringify(seen)); } catch (e) { /* rien */ }
    if (mpw.turns !== mine.length) { mpw.turns = mine.length; app.chrome?.(); }
  } catch (e) { /* serveur sans les parties en ligne : rien */ }
  busy = false;
}
