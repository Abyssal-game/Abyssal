// v564 : ce que les autres joueurs voient de ton apparence (demande du propriétaire : « que ça apparaisse sur les
// classements et pendant les jeux en ligne ») : plaque de pseudo (bannière peinte derrière le nom) et réactions en ligne.
import { EMOTES } from '../core/codex.js';
import { EMBLEM } from './icons.js';
import { esc } from './dom.js';
import { t } from '../i18n.js';

const okKey = (k) => typeof k === 'string' && /^[a-z0-9-]{1,40}$/.test(k);

// le nom posé sur sa plaque (rien si pas de plaque ou clé douteuse venue d'ailleurs)
export const withPlate = (k, html) => (okKey(k) && k.startsWith('pl-') ? `<span class="np np-${k}">${html}</span>` : html);
// classes d'un cadre de portrait venu d'un autre joueur
export const frameCls = (k) => (okKey(k) ? `pf pf-${k}` : '');

// une réaction : portrait de l'arbitre (ou l'emblème du jeu pour les réactions offertes) et sa phrase
export const emotePic = (k) => {
  const e = EMOTES[k];
  return e?.who ? `<img alt="" src="assets/sceaux/rival-${e.who}.webp">` : e?.boss ? `<img class="re-boss" alt="" src="assets/bosses/${e.boss}.webp">` : EMBLEM;
};
export const emoteHTML = (k) => `<span class="re-pic ${EMOTES[k]?.who || EMOTES[k]?.boss ? '' : 're-free'}">${emotePic(k)}</span><span class="re-txt">${esc(EMOTES[k]?.text || '')}</span>`;

// bulle de réaction au-dessus (adversaire) ou au-dessous (toi) de la partie, 2,8 s
const live = {};
export function showEmote(k, side, name, sfx) {
  if (!EMOTES[k]) return;
  live[side]?.remove();
  const el = document.createElement('div');
  el.className = `re-bubble ${side}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `${emoteHTML(k)}${name ? `<small translate="no">${esc(name)}</small>` : ''}`;
  document.body.appendChild(el);
  live[side] = el;
  requestAnimationFrame(() => el.classList.add('on'));
  sfx?.();
  setTimeout(() => { el.classList.remove('on'); setTimeout(() => { el.remove(); if (live[side] === el) delete live[side]; }, 300); }, 2800);
}
// v565 : habillage des boosters choisi au Profil (posé par applySettings dans main.js, lu par packHTML)
let packSkin = null;
export const setPackSkin = (k) => { packSkin = okKey(k) && k.startsWith('sachet-') ? k : null; };
export const getPackSkin = () => packSkin;
export const skinOk = (k) => (okKey(k) && k.startsWith('sachet-') ? k : null); // sachet venu d'un autre joueur
export const emoteLabel = (k) => t(EMOTES[k]?.text || '');
