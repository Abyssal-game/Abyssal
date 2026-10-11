// Coffre dessiné (illustration si elle existe, sinon dessin vectoriel)
import { CHESTS } from '../core/descent.js';
import { hasChestArt } from '../art/assets.js';

// Coffre dessiné (couvercle séparé pour l'animation d'ouverture)
export function chestSVG(type, { open = false } = {}) {
  if (hasChestArt(type)) return `<img class="ch-img" alt="" src="assets/chests/${type}${open ? '-open' : ''}.webp">`;
  const c = CHESTS[type].color;
  const gem = type === 'abyssal' ? '<path d="M60 64l7 8-7 9-7-9z" fill="#E9B8FF"/>' : type === 'or' ? '<circle cx="60" cy="72" r="6" fill="#FFF0B8"/>' : '<rect x="55" y="66" width="10" height="12" rx="2" fill="#2A1A10"/>';
  const band = type === 'bois' ? '#6E4A2A' : type === 'fer' ? '#5C6676' : type === 'or' ? '#B8862C' : '#5B1F8A';
  return `<svg class="ch-svg" viewBox="0 0 120 110" aria-hidden="true">
    <defs><linearGradient id="chb-${type}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${band}"/></linearGradient></defs>
    <g class="ch-body"><rect x="14" y="54" width="92" height="46" rx="6" fill="url(#chb-${type})" stroke="#0B0810" stroke-width="3"/>
      <rect x="14" y="54" width="92" height="9" fill="${band}" opacity=".8"/><rect x="28" y="54" width="9" height="46" fill="${band}"/><rect x="83" y="54" width="9" height="46" fill="${band}"/>${gem}</g>
    <g class="ch-lid"><path d="M14 56V40c0-16 20-26 46-26s46 10 46 26v16z" fill="url(#chb-${type})" stroke="#0B0810" stroke-width="3"/>
      <path d="M28 54V30M92 54V30" stroke="${band}" stroke-width="9"/><path d="M14 46h92" stroke="${band}" stroke-width="5" opacity=".7"/></g>
  </svg>`;
}
