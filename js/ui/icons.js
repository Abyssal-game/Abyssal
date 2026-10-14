// Icônes au trait (24 × 24) et sceaux des factions. Aucune image externe.
const I = (body, extra = '') => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${body}</svg>`;

export const ICONS = {
  home: I('<path d="M4 11 12 4l8 7"/><path d="M6 10v9h4v-5h4v5h4v-9"/><path d="M12 4v-1.5"/>'),
  cards: I('<rect x="3.5" y="5" width="11" height="15" rx="1.6"/><path d="M8 3.6h10.5a1.6 1.6 0 0 1 1.6 1.6V18"/><path d="M6.5 9h5M6.5 12h5"/>'),
  booster: I('<path d="M6 3h12l-1 4 1 14H6l1-14z"/><path d="M7 7h10"/><path d="m12 10 1.4 2.8 3 .4-2.2 2.1.5 3-2.7-1.4-2.7 1.4.5-3-2.2-2.1 3-.4z"/>'),
  book: I('<path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5z"/><path d="M11 4c.6.6 1.4 1 2 0"/><circle cx="16.5" cy="9" r="1.6"/>'),
  user: I('<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.8-3.8 3.6-5.6 7-5.6s6.2 1.8 7 5.6"/>'),
  gear: I('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>'),
  trophy: I('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5c0 3 1.4 4.5 3.2 4.8M16 6h3c0 3-1.4 4.5-3.2 4.8"/><path d="M12 13v3.5M8.5 20h7M9.5 20l.8-3.5h3.4l.8 3.5"/>'),
  shield: I('<path d="M12 3 5 6v5.5c0 4.4 3 7.8 7 9.5 4-1.7 7-5.1 7-9.5V6z"/><path d="M12 8v8M8.5 11.5h7"/>'),
  swords: I('<path d="m4 4 9.5 9.5M4 4v3.5L13 16.5M4 4h3.5L16.5 13"/><path d="m20 4-6 6M20 4v3M20 4h-3"/><path d="m13 15 3 3M15 13l3 3M17 19l2 2M19 17l2 2"/>'),
  search: I('<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/>'),
  menu: I('<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  skull: I('<path d="M12 3.5c-4.4 0-7.5 3-7.5 7 0 2.4 1.1 4.1 2.8 5.1V19h9.4v-3.4c1.7-1 2.8-2.7 2.8-5.1 0-4-3.1-7-7.5-7z"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/><path d="M11 15h2M10 19v1.5M14 19v1.5"/>'),
  crown: I('<path d="M4 8l4 4 4-6 4 6 4-4-1.5 10h-13z"/><path d="M5.5 20.5h13"/>'),
  check: I('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  close: I('<path d="M6 6l12 12M18 6 6 18"/>'),
  back: I('<path d="M15 5 8 12l7 7"/>'),
  next: I('<path d="m9 5 7 7-7 7"/>'),
  prev: I('<path d="M15 5 8 12l7 7"/>'),
  star: I('<path d="m12 3.5 2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8L8 13.5l-4.3-4 5.8-.7z"/>'),
  crystal: I('<path d="M12 2.5 18 9l-6 12.5L6 9z"/><path d="M6 9h12M12 2.5 9.5 9l2.5 12.5L14.5 9z"/>'),
  ash: I('<path d="M12 3c1.5 3.2 5 5.4 5 9.6A5 5 0 0 1 12 18a5 5 0 0 1-5-5.4C7 10 9 9.2 9.6 6.8c1.2 1.4 1.6 2.6 1.5 4C13 9.6 13 6.4 12 3z"/><path d="M5 21h14M8 21l.6-1.6M16 21l-.6-1.6"/>'),
  edit: I('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>'),
  ticket: I('<path d="M3.5 8V6.5h17V8a2 2 0 0 0 0 4v.5a2 2 0 0 0 0 4V18h-17v-1.5a2 2 0 0 0 0-4V12a2 2 0 0 0 0-4z"/><path d="M9 6.5v11.5" stroke-dasharray="1.5 2"/>'),
  lock: I('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><circle cx="12" cy="15.5" r="1.4"/>'),
  eye: I('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  sound: I('<path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
  mute: I('<path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>'),
  download: I('<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M5 19.5h14"/>'),
  upload: I('<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M5 19.5h14"/>'),
  copy: I('<rect x="8" y="8" width="11.5" height="12" rx="1.8"/><path d="M5 15.5V5.8A1.8 1.8 0 0 1 6.8 4h8.7"/>'),
  sparkle: I('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
  info: I('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  filter: I('<path d="M4 5.5h16l-6 7.5v5.5l-4 1.5v-7z"/>'),
  sort: I('<path d="M7 4v16M3.5 16.5 7 20l3.5-3.5M17 20V4M13.5 7.5 17 4l3.5 3.5"/>'),
  heart: I('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  pin: I('<path d="m12 3 2.4 5 5.4.6-4 3.8 1 5.4L12 15.2 7.2 17.8l1-5.4-4-3.8 5.4-.6z"/>'),
  flame: I('<path d="M12 3c1.5 3.5 5.5 5.5 5.5 10a5.5 5.5 0 0 1-11 0c0-2.6 1.5-4 2.4-5.6.8 1.6 1.2 2.6 1.1 4 1.5-1.6 2.2-4.8 2-8.4z"/>'),
  scroll: I('<path d="M7 4h11a2 2 0 0 1 2 2v1h-4"/><path d="M16 7v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1h10"/><path d="M7 4a2 2 0 0 0-2 2v11M9 9h5M9 12.5h5"/>'),
  play: I('<path d="M7 4.5v15l12-7.5z"/>'),
  skip: I('<path d="M5 5v14l9-7zM15 5v14l4-7z"/>'),
  refresh: I('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>'),
  trash: I('<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>'),
  code: I('<path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5"/>'),
  hourglass: I('<path d="M6.5 3.5h11M6.5 20.5h11M7.5 3.5c0 5 9 5.5 9 8.5s-9 3.5-9 8.5M16.5 3.5c0 5-9 5.5-9 8.5s9 3.5 9 8.5"/>'),
};


// Sceaux des factions (traits fins, couleur via currentColor).
const S = (body) => `<svg class="sigil" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
export const SIGILS = {
  infernal: S('<circle cx="16" cy="18" r="9"/><path d="M8.5 11C6.5 7.5 7 4.5 9 3c-.2 3 1.3 5 4 6.3M23.5 11c2-3.5 1.5-6.5-.5-8 .2 3-1.3 5-4 6.3"/><path d="m16 25-6-10.5h12z"/><circle cx="16" cy="18" r="1.4" fill="currentColor"/>'),
  abyssal: S('<path d="M16 4c5 4 7 8 7 12a7 7 0 0 1-14 0c0-4 2-8 7-12z"/><path d="M12 20c1.5 2 6.5 2 8 0M9.5 25c-2 1.5-4 1.8-6 1M22.5 25c2 1.5 4 1.8 6 1M16 23v5"/><circle cx="16" cy="15" r="2.4"/>'),
  celeste: S('<circle cx="16" cy="16" r="3.5"/><path d="M16 3v5M16 24v5M3 16h5M24 16h5"/><path d="M12.5 12.5C9 10 6 10 3.5 11.5c2 1.8 5 2.5 8 2M19.5 12.5C23 10 26 10 28.5 11.5c-2 1.8-5 2.5-8 2"/><circle cx="16" cy="16" r="8.5" stroke-dasharray="1.5 2.5"/>'),
  sauvage: S('<path d="M9 27c-1-6 0-12 3-18M15 28c0-7 1-13 3-19M21 27c1-6 1-11 4-16"/><path d="M12 9 10 4M18 9l1.5-5M25 11l3-3.5"/><path d="M5 9c2 0 4 1 5 3"/>'),
  necrotique: S('<path d="M10 14a6 6 0 1 1 12 0v3.5l-2 1.5v3h-8v-3l-2-1.5z"/><circle cx="13.5" cy="14.5" r="1.6" fill="currentColor"/><circle cx="18.5" cy="14.5" r="1.6" fill="currentColor"/><path d="M14 22.5v2M18 22.5v2M5 7a12 12 0 0 1 22 0"/>'),
  primordial: S('<path d="M16 3 29 26H3z"/><circle cx="16" cy="18" r="4.5"/><path d="M16 15.5c1 1.6 1 3.4 0 5"/><path d="M9 26c2-3 4.5-4.5 7-4.5s5 1.5 7 4.5"/>'),
  artificiel: S('<circle cx="16" cy="16" r="6"/><path d="M16 4v3.5M16 24.5V28M4 16h3.5M24.5 16H28M7.5 7.5 10 10M22 22l2.5 2.5M7.5 24.5 10 22M22 10l2.5-2.5"/><path d="M14 13.5h4l-3 5h3"/>'),
};

// Emblème du jeu : le sceau illustré (œil reptilien, étoile, couronne d'épines dorées).
export const EMBLEM = '<img class="emblem" src="assets/brand/emblem.webp" alt="" aria-hidden="true">';

// Les monnaies (éclats, cendres) sont peintes ; les autres icônes restent en traits
// Les petits dessins au trait les plus visibles sont remplacés par des icônes peintes ;
// icon('p:nom') donne directement l'icône peinte assets/icons/nom.webp.
const CUR_PIC = { crystal: 'cur-shard', ash: 'cur-ash', sparkle: 'xp', star: 'xp', lock: 'mysteries', skull: 'danger', ticket: 'ticket', hourglass: 'hourglass',
  // v240 : icônes peintes déjà livrées, utilisées partout à la place du dessin au trait
  'swords': 'swords', 'crown': 'crown', 'rule': 'rule', 'book': 'book', 'chest': 'chest', 'booster': 'booster', 'xp': 'xp', 'titles': 'titles', 'team': 'team', 'streak': 'streak', 'stats': 'stats', 'stairs-up': 'stairs-up', 'stairs-down': 'stairs-down', 'showcase': 'showcase', 'openings': 'openings', 'luck': 'luck', 'illus': 'illus', 'hunt': 'hunt', 'genesis': 'genesis', 'furnace': 'furnace', 'figures': 'figures', 'discover': 'discover', 'conflicts': 'conflicts', 'chronicles': 'chronicles', 'cards': 'cards', 'avatar': 'avatar',
  // v242 : planches d'icônes peintes (images 13 à 16)
  'next': 'ui-next', 'prev': 'ui-prev', 'close': 'ui-close', 'check': 'ui-check', 'plus': 'ui-plus', 'info': 'ui-info', 'search': 'ui-search', 'filter': 'ui-filter', 'sort': 'ui-sort', 'eye': 'ui-eye', 'edit': 'ui-edit', 'trash': 'ui-trash', 'copy': 'ui-copy', 'upload': 'ui-upload', 'download': 'ui-download', 'refresh': 'ui-refresh', 'user': 'ui-user', 'trophy': 'ui-trophy', 'heart': 'ui-heart', 'skip': 'ui-skip', 'gear': 'ui-gear', 'back': 'ui-prev', 'key': 'ui-key', 'bell': 'ui-bell', 'pause': 'ui-pause' };
export const icon = (name) => {
  const pic = name.startsWith('p:') ? name.slice(2) : CUR_PIC[name];
  return pic ? `<img class="ic ic-cur" alt="" src="assets/icons/${pic}.webp">` : ICONS[name] || '';
};
// Emblème peint de la faction, toujours (le dessin au trait ne sert plus qu'en secours si l'image échoue)
export const sigil = (faction) => (SIGILS[faction] ? `<img class="sigil sigil-img" alt="" src="assets/factions/${faction}.webp">` : '');

// Emblèmes des ensembles (assets/sets/<clé>.webp) : ajouter la clé ici quand l'image peinte est livrée
const SET_ART = new Set(['peches', 'titans', 'souverains', 'dragons', 'firmament', 'fleaux', 'oublies', 'seigneurs', 'plaies', 'neant', 'pactes', 'goetie', 'pantheons', 'legendes']);
export const setIcon = (key) => (SET_ART.has(key) ? `<img class="set-ic" alt="" src="assets/sets/${key}.webp">` : `<span class="set-ic set-ic-0">${icon('star')}</span>`);

// Icônes peintes (assets/icons) : défis du jour, étapes de l'Aventure
export const picon = (name) => `<img class="picon" alt="" src="assets/icons/${name}.webp">`;

// Emblème peint d'un rôle de combat (garde, assaut, soin, venin, gel, cri, deferlante)
// Icônes peintes des actions de combat (attaque, défense, relève et les 7 compétences)
const ACT_PICS = new Set(['attack', 'defend', 'swap', 'rempart', 'estoc', 'priere', 'contagion', 'entrave', 'marque', 'raz']);
export const actIcon = (key, fallback) => (ACT_PICS.has(key) ? `<img class="aicon" alt="" src="assets/icons/act-${key}.webp">` : icon(fallback));
// Blason peint de victoire ou de défaite, avec un texte au centre de la plaque
export const crestHTML = (won, big, small = '', cls = '') => `<div class="crest ${won ? 'won' : 'lost'} ${cls}" role="img" aria-label="${won ? 'Victoire' : 'Défaite'}"><span><b>${big}</b>${small ? `<small>${small}</small>` : ''}</span></div>`;
export const roleIcon = (kw) => `<img class="ricon" alt="" src="assets/icons/role-${kw}.webp">`;
