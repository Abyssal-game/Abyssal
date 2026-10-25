// v564 : ce que les autres joueurs voient de ton apparence (demande du propriétaire : « que ça apparaisse sur les
// classements et pendant les jeux en ligne ») : plaque de pseudo (bannière peinte derrière le nom) et réactions en ligne.
import { EMOTES } from '../core/codex.js';
import { EMBLEM } from './icons.js';
import { esc } from './dom.js';
import { t } from '../i18n.js';

const okKey = (k) => typeof k === 'string' && /^[a-z0-9-]{1,40}$/.test(k);

// le nom posé sur sa plaque (rien si pas de plaque ou clé douteuse venue d'ailleurs)
export const withPlate = (k, html) => (okKey(k) && k.startsWith('pl-') ? `<span class="np np-${k}">${html}</span>` : html);
/* v632 : fond de profil (le sien ou celui d'un autre joueur) : classe et image à poser sur l'en-tête du profil */
const fondOk = (k) => okKey(k) && k.startsWith('fp-');
export const fondCls = (k) => (fondOk(k) ? 'has-fond' : '');
export const fondUrl = (k) => new URL(`assets/fonds/${k}.webp`, document.baseURI).href; /* adresse complète : une url() relative dans une variable CSS serait lue depuis le dossier css/ */
export const fondStyle = (k) => (fondOk(k) ? ` style="--pf-bg:url('${fondUrl(k)}')"` : '');
// classes d'un cadre de portrait venu d'un autre joueur
export const frameCls = (k) => (okKey(k) ? `pf pf-${k}` : '');

// une réaction : portrait de l'arbitre (ou l'emblème du jeu pour les réactions offertes) et sa phrase
/* v760 : gardiens dont le portrait de réaction peint (assets/emotes/gp-<clé>.webp) est arrivé */
const GP_EMOTES = new Set(['devoreur', 'matriarche', 'roi', 'architecte', 'eclipse', 'essaim', 'bourreau', 'choeur', 'chaines', 'horloge', 'miroirs', 'peste', 'chasseur', 'voeux', 'titan', 'jumeaux', 'juge', 'bete', 'abysse']);
export const emotePic = (k) => {
  const e = EMOTES[k];
  if (e?.pic) return `<img alt="" src="assets/emotes/${e.pic}.webp">`; /* v630 : portrait propre (réactions du Codex) */
  return e?.who ? `<img alt="" src="assets/sceaux/rival-${e.who}.webp">` : e?.boss ? `<img alt="" src="assets/emotes/${GP_EMOTES.has(e.boss) ? 'gp' : 'gs'}-${e.boss}.webp">` /* v760 : portrait peint par Gemini (tools/emote-gemini.py), sinon visage tiré de l’affiche (tools/emote-boss.py) */ : EMBLEM;
};
export const emoteHTML = (k) => `<span class="re-pic ${EMOTES[k]?.who || EMOTES[k]?.boss || EMOTES[k]?.pic ? '' : 're-free'}">${emotePic(k)}</span><span class="re-txt">${esc(EMOTES[k]?.text || '')}</span>`;

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
/* v587 : un habillage par booster (standard ou premium) ; les boosters de faction, des Alliances et de l'Abysse gardent le leur */
const packSkin = { standard: null, premium: null };
const skinKey = (k) => (okKey(k) && k.startsWith('sachet-') ? k : null);
export const setPackSkin = (std, prem) => { packSkin.standard = skinKey(std); packSkin.premium = skinKey(prem); };
export const getPackSkin = (type) => packSkin[type] || null;
export const skinOk = (k) => (okKey(k) && k.startsWith('sachet-') ? k : null); // sachet venu d'un autre joueur
export const emoteLabel = (k) => t(EMOTES[k]?.text || '');

/* v644 : un pseudo trop long pour sa plaque (petites cases de Personnaliser, de l'Échoppe…) : la taille du texte baisse jusqu'à ce qu'il tienne en entier */
export function fitPlate(el) {
  el.style.fontSize = '';
  let fs = parseFloat(getComputedStyle(el).fontSize) || 12;
  for (let i = 0; i < 10 && el.scrollWidth > el.clientWidth + 1 && fs > 6; i++) { fs *= 0.9; el.style.fontSize = `${fs.toFixed(2)}px`; }
}
export function watchPlates() {
  let queued = false;
  const run = () => { queued = false; document.querySelectorAll('.np-demo').forEach((el) => { if (el.isConnected && el.offsetParent) fitPlate(el); }); };
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
  new MutationObserver((list) => { for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1 && (n.classList.contains('np-demo') || n.querySelector('.np-demo'))) return ask(); })
    .observe(document.body, { childList: true, subtree: true });
  document.fonts?.ready.then(ask);
}
