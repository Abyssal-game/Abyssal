// Visuels de l'Arsenal : icônes d'objets (dessinées au trait), tuiles, coffres, lignes de statistiques.
import { BASES, GEAR_RARITY, SLOTS, EFFECTS, AFFIXES, CHESTS, KEYS, itemStats, spellPower } from '../core/gear.js';
import { HEROES, SKILLS } from '../core/heroes.js';
import { esc } from './dom.js';

const P = {
  axe: '<path d="M14 42 34 14"/><path d="M28 10c6-2 12 2 12 9-5 0-8-1-10-4"/><path d="M28 10c-2 5-1 10 3 12 2-3 3-6 3-9"/><path d="M12 39l5 5"/>',
  hammer: '<path d="M16 40 32 20"/><path d="M26 10l12 12 4-4-12-12z"/><path d="M14 38l4 4"/>',
  sword: '<path d="M36 8 16 28"/><path d="M36 8l4 0 0 4-20 20"/><path d="M12 26l10 10"/><path d="M14 34l-5 5"/>',
  mace: '<path d="M14 40 28 22"/><circle cx="32" cy="16" r="7"/><path d="M32 6v3M42 16h-3M39 9l-2 2M25 9l2 2M39 23l-2-2"/><path d="M12 38l4 4"/>',
  bow: '<path d="M14 8c18 6 24 20 26 32"/><path d="M14 8l26 32"/><path d="M8 26l22-6"/><path d="M26 16l4 4-6 0"/>',
  dagger: '<path d="M18 30 34 10l2 2-16 20"/><path d="M14 28l8 8"/><path d="M16 34l-6 6"/><path d="M30 38 18 22" opacity=".55"/>',
  staff: '<path d="M14 42 32 14"/><circle cx="34" cy="11" r="5"/><path d="M27 6c-3 3-3 7 0 10M41 6c3 3 3 7 0 10"/>',
  orb: '<circle cx="24" cy="20" r="11"/><path d="M17 16c2-4 6-5 9-4"/><path d="M16 36h16l-3-6H19z"/><path d="M14 40h20"/>',
  plate: '<path d="M14 10l6-2c2 3 6 3 8 0l6 2 6 6-4 6-2-2v20H14V20l-2 2-4-6z"/><path d="M24 14v26M18 24h12"/>',
  leather: '<path d="M16 10l4-2c2 3 6 3 8 0l4 2 4 8-3 2v20H15V20l-3-2z"/><path d="M20 26h8M20 32h8M24 12v6"/>',
  robe: '<path d="M18 8c2 4 10 4 12 0l4 4-2 6 4 22H12l4-22-2-6z"/><path d="M24 14v26M19 40l5-8 5 8"/>',
  talisman: '<path d="M24 6v6"/><path d="M24 12l10 10-10 18-10-18z"/><circle cx="24" cy="24" r="3"/>',
  ring: '<ellipse cx="24" cy="28" rx="11" ry="10"/><path d="M19 12l5-5 5 5-5 6z"/>',
  amulet: '<path d="M10 8c2 10 8 14 14 14s12-4 14-14"/><path d="M24 22l9 9-9 10-9-10z"/><path d="M24 27v8"/>',
  feather: '<path d="M14 40C14 22 22 10 38 8c0 16-10 26-24 28"/><path d="M14 40 32 16"/><path d="M20 30l6 0M24 24l6 0"/>',
  eye: '<path d="M6 24c6-9 12-12 18-12s12 3 18 12c-6 9-12 12-18 12S12 33 6 24z"/><circle cx="24" cy="24" r="6"/><path d="M24 18v12"/>',
  tome: '<path d="M10 10h12c2 0 2 2 2 2v28s0-2-2-2H10z"/><path d="M38 10H26c-2 0-2 2-2 2v28s0-2 2-2h12z"/><path d="M31 18l-2 4h4l-2 4"/>',
};
export function gearIcon(type) {
  return `<svg class="gi-svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[type] || P.talisman}</svg>`;
}

const STAT_NAMES = { hp: 'PV', atk: 'ATQ', mag: 'MAG', def: 'DÉF', spd: 'VIT' };
export function statLine(it) {
  return Object.entries(itemStats(it)).map(([k, v]) => `+${v} ${STAT_NAMES[k]}`).join(' · ');
}
export const itemName = (it) => BASES[it.b].name + (it.f ? ` +${it.f}` : '');
export function whoCanUse(it) {
  const b = BASES[it.b];
  return b.for ? b.for.map((h) => HEROES[h].name.split(' ')[0]).join(', ') : 'Tous les héros';
}
// Texte d'effets : sort, effet légendaire, propriété
export function effectLines(it) {
  const b = BASES[it.b], out = [];
  if (b.spell) out.push(`<b>${esc(SKILLS[b.spell].name)}</b> <span class="tb-cost">${'◆'.repeat(SKILLS[b.spell].cost)}</span> ${esc(SKILLS[b.spell].desc)} <span class="muted">(puissance ×${spellPower(it).toFixed(2).replace('.', ',')})</span>`);
  if (b.fx) out.push(`<b class="gi-leg">Unique</b> ${esc(EFFECTS[b.fx])}`);
  if (it.a) out.push(`<b>${esc(AFFIXES[it.a].name)}</b> ${esc(AFFIXES[it.a].desc)}`);
  return out;
}

// Tuile d'objet (grilles de l'Arsenal, choix d'un coffre, emplacements)
export function itemTileHTML(it, { id = '', wearer = null, attrs = '', big = false } = {}) {
  const b = BASES[it.b], R = GEAR_RARITY[it.r];
  return `<button class="gi gi-${it.r} ${big ? 'big' : ''}" ${id ? `data-gear="${id}"` : ''} ${attrs} style="--gc:${R.color}">
    <span class="gi-ic">${gearIcon(b.type)}</span>
    ${it.f ? `<span class="gi-f">+${it.f}</span>` : ''}
    ${it.isNew ? '<span class="gi-new">Nouveau</span>' : ''}
    ${wearer ? `<span class="gi-who" style="--hc:${HEROES[wearer].color}">${esc(HEROES[wearer].name.split(' ')[0])}</span>` : ''}
    <span class="gi-t"><b>${esc(b.name)}</b><span>${esc(R.name)} · ${esc(SLOTS[b.slot].name.toLowerCase())}</span></span>
  </button>`;
}

// Coffre dessiné (couvercle séparé pour l'animation d'ouverture)
export function chestSVG(type) {
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
export function keyHTML(k, n) {
  return `<span class="gk" style="--kc:${KEYS[k].color}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="7.5" cy="12" r="4"/><path d="M11.5 12H21M17 12v3.5M20 12v2.5"/></svg><b>${n}</b></span>`;
}
