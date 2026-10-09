// Illustrations procédurales provisoires.
// Style : silhouettes en contre-jour, liseré lumineux, yeux incandescents,
// décor atmosphérique propre à chaque faction. Elles seront remplacées par
// de vraies illustrations (voir assets.js) sans toucher à la logique du jeu.
import { seeded, F } from './geometry.js';
import { Builder, FORMS } from './creatures.js';
import { sceneSvg, particlesSvg } from './scenes.js';

export const PALETTES = {
  infernal:   { sky: ['#0b0204', '#3a0a10', '#8a2412'], light: '#ff7a2a', glow: '#ff5a1f', eye: '#ffb030', rim: '#ffa060', body: ['#3a1418', '#0a0507'], particle: 'ember', scene: 'inferno' },
  abyssal:    { sky: ['#0b4a66', '#06223a', '#01060c'], light: '#35bde5', glow: '#35bde5', eye: '#8ff6ff', rim: '#8fe8ff', body: ['#123040', '#04080c'], particle: 'bubble', scene: 'abyss' },
  celeste:    { sky: ['#f6ecd0', '#b89a64', '#3a2e1c'], light: '#fff4d6', glow: '#f0b030', eye: '#fff6d8', rim: '#fff4cc', body: ['#4a3e2c', '#120f0a'], particle: 'mote', scene: 'heaven' },
  sauvage:    { sky: ['#06100a', '#17301e', '#3c5a2c'], light: '#e8c070', glow: '#d8b040', eye: '#ffd23a', rim: '#e0cc90', body: ['#25301e', '#060806'], particle: 'spore', scene: 'forest' },
  necrotique: { sky: ['#070510', '#1e1434', '#433066'], light: '#d0c8ff', glow: '#9a7aff', eye: '#d8c4ff', rim: '#d4ccff', body: ['#241e34', '#06050a'], particle: 'ash', scene: 'crypt' },
  primordial: { sky: ['#0a0605', '#3a1a0a', '#b0581c'], light: '#ffc860', glow: '#ff8a30', eye: '#ffe080', rim: '#ffd48a', body: ['#34241a', '#080605'], particle: 'ember', scene: 'volcano' },
  artificiel: { sky: ['#05080a', '#10202a', '#1f4250'], light: '#5ae0ff', glow: '#35d0ff', eye: '#8ff8ff', rim: '#a8e4f0', body: ['#232c34', '#07090b'], particle: 'spark', scene: 'forge' },
};

// Décors et teintes alternatifs par faction : la graine de la carte choisit,
// pour éviter que toutes les cartes d'une faction se ressemblent.
const SCENE_POOL = {
  infernal: ['inferno', 'inferno', 'ruins', 'volcano'],
  abyssal: ['abyss', 'abyss', 'ocean'],
  celeste: ['heaven', 'heaven', 'sky', 'ruins'],
  sauvage: ['forest', 'forest', 'swamp', 'mountain'],
  necrotique: ['crypt', 'crypt', 'ruins', 'swamp'],
  primordial: ['volcano', 'mountain', 'volcano'],
  artificiel: ['forge', 'forge', 'ruins'],
};
const TINT_POOL = {
  infernal: [null, null, '#ff2a3a', '#ffb020', '#7dff5a'],
  abyssal: [null, null, '#3dffc8', '#5a8aff'],
  celeste: [null, null, '#ffd9a0'],
  sauvage: [null, null, '#a8ff6a', '#ff9a3a'],
  necrotique: [null, null, '#5affb0', '#ff4a6a'],
  primordial: [null, null, '#ff4a2a', '#ffd84a'],
  artificiel: [null, null, '#ff9a2a', '#b07aff'],
};

const SCENE_PARTICLE = { ice: 'snow', cosmos: 'star', void: 'star', heaven: 'mote', ocean: 'bubble', swamp: 'spore', gold: 'star' };
const SCENE_LIGHT = { ice: '#cfeeff', cosmos: '#c8b0ff', void: '#b89aff', ocean: '#bfe6ff', temple: '#ffd88a', sky: '#ffe0a8', mountain: '#ffd8a0', crypt: '#d8d0ff' };

export const RARITY_INDEX = { C: 0, PC: 1, R: 2, HR: 3, M: 4, S: 5 };

function defs(P, lv, secret) {
  const [b0, b1] = P.body;
  const sky = P.sky;
  return `<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset=".55" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[2]}"/></linearGradient>
<linearGradient id="bodyG" gradientUnits="userSpaceOnUse" x1="120" y1="40" x2="190" y2="360"><stop offset="0" stop-color="${b0}"/><stop offset=".6" stop-color="${b1}"/><stop offset="1" stop-color="#030305"/></linearGradient>
<linearGradient id="boneG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4eee2"/><stop offset=".6" stop-color="#cfc4ae"/><stop offset="1" stop-color="#7d725f"/></linearGradient>
<linearGradient id="steelG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6edf7"/><stop offset=".5" stop-color="#8c97aa"/><stop offset="1" stop-color="#3c4352"/></linearGradient>
<linearGradient id="bronzeG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1c98a"/><stop offset=".5" stop-color="#a4692e"/><stop offset="1" stop-color="#4a2a10"/></linearGradient>
<linearGradient id="goldG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2c0"/><stop offset=".45" stop-color="#c8a45d"/><stop offset="1" stop-color="#5a4320"/></linearGradient>
<linearGradient id="flameG" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff2b0"/><stop offset=".4" stop-color="${P.glow}"/><stop offset="1" stop-color="${P.glow}" stop-opacity="0"/></linearGradient>
<radialGradient id="vig" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".8"/></radialGradient>
<radialGradient id="back" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${P.light}" stop-opacity="${F(0.55 + lv * 0.07)}"/><stop offset="1" stop-color="${P.light}" stop-opacity="0"/></radialGradient>
<pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="4" height="4" fill="#0b0906"/><path d="M0 0V4" stroke="#c8a45d" stroke-width=".9" opacity=".75"/></pattern>
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="glowS" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="rim" x="-20%" y="-20%" width="140%" height="140%">
<feGaussianBlur in="SourceAlpha" stdDeviation="${secret ? 3 : 5 + lv}" result="b"/><feFlood flood-color="${secret ? '#c8a45d' : P.light}" flood-opacity="${secret ? 0.4 : F(0.55 + lv * 0.06)}"/><feComposite in2="b" operator="in" result="glow"/>
<feOffset in="SourceAlpha" dx="-1.6" dy="-1.6" result="off"/><feComposite in="SourceAlpha" in2="off" operator="out" result="edge"/><feGaussianBlur in="edge" stdDeviation=".7" result="edgeb"/><feFlood flood-color="${P.rim}"/><feComposite in2="edgeb" operator="in" result="rimL"/>
<feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/><feMergeNode in="rimL"/></feMerge></filter>
</defs>`;
}

// Fond de cadre « sceau » pour les raretés élevées.
function sigil(lv, P, r) {
  if (lv < 3) return '';
  let s = `<g opacity="${lv >= 4 ? 0.55 : 0.32}" fill="none" stroke="${lv >= 4 ? '#e6c879' : P.glow}">`;
  s += `<circle cx="150" cy="190" r="118" stroke-width="1.2"/><circle cx="150" cy="190" r="106" stroke-width=".6" stroke-dasharray="3 5"/>`;
  const n = lv >= 4 ? 9 : 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = 150 + Math.cos(a) * 112, y = 190 + Math.sin(a) * 112;
    s += `<path d="M${F(x - 4)} ${F(y)}l4 -6l4 6l-4 6z" stroke-width=".8"/>`;
  }
  s += '</g>';
  return s;
}

/**
 * Produit le SVG d'une carte.
 * @param {object} card  carte du catalogue (id, faction, rarity, art)
 * @param {object} opt   { alt: bool, lite: bool }
 */
export function renderArt(card, opt = {}) {
  const art = card.art || { form: 'blob' };
  const lv = RARITY_INDEX[card.rarity] ?? 0;
  const secret = card.rarity === 'S' && !opt.alt;
  const base = PALETTES[card.faction] || PALETTES.infernal;
  const r = seeded(card.id + (opt.alt ? ':alt' : ''));
  const pick = seeded('scene:' + card.id);
  let sceneName = opt.alt ? (art.altScene || ALT_SCENE[base.scene] || 'ruins') : (art.scene || pick.pick(SCENE_POOL[card.faction] || [base.scene]));
  const autoTint = art.tint ? null : pick.pick(TINT_POOL[card.faction] || [null]);
  if (secret) sceneName = 'gold';
  const tint = art.tint || autoTint;
  const P = { ...base, ...(tint ? { glow: tint, eye: art.eye || tint } : {}), ...(art.eye ? { eye: art.eye } : {}) };
  if (SCENE_LIGHT[sceneName] && !tint) P.light = SCENE_LIGHT[sceneName];
  if (sceneName === 'ice') P.sky = ['#0a1622', '#1b3a52', '#5f8fac'];
  if (sceneName === 'cosmos' || sceneName === 'void') P.sky = ['#020208', '#0d0820', '#1a1036'];
  if (sceneName === 'ocean') P.sky = ['#0a1520', '#0d2436', '#16364c'];
  if (sceneName === 'temple') P.sky = ['#2a1606', '#8a5418', '#e0a050'];
  if (sceneName === 'heaven') P.sky = ['#fff8e6', '#d8bf88', '#6a5434'];
  if (sceneName === 'sky') P.sky = ['#0c0e18', '#2a2a3a', '#5a4a40'];
  if (sceneName === 'swamp') P.sky = ['#050a07', '#122017', '#26402a'];
  if (sceneName === 'gold') P.sky = ['#08070a', '#0d0b0a', '#14110b'];
  if (art.light) P.light = art.light;

  const b = new Builder(r, P);
  const form = FORMS[art.form] || FORMS.blob;
  form(b, art, r);

  const scale = (art.scale || 1) * [0.86, 0.92, 0.97, 1.03, 1.1, 1.06][lv];
  const flip = art.flip ? `translate(300 0) scale(-1 1)` : '';
  const ty = art.dy || 0;
  const tf = `${flip} translate(150 ${192 + ty}) scale(${F(scale * 100) / 100}) translate(-150 -215)`;

  const particle = SCENE_PARTICLE[sceneName] || P.particle;
  const pCount = opt.lite ? 8 + lv * 3 : 18 + lv * 10;

  const bodyFill = secret ? 'url(#hatch)' : 'url(#bodyG)';
  const bodyStroke = secret ? ' stroke="#e6c879" stroke-width="1.1"' : '';

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice">`;
  svg += defs(P, lv, secret);
  svg += `<rect width="300" height="420" fill="url(#sky)"/>`;
  svg += sceneSvg(sceneName, r, P, lv);
  svg += `<ellipse cx="150" cy="200" rx="${130 + lv * 8}" ry="${150 + lv * 8}" fill="url(#back)"/>`;
  svg += sigil(lv, P, r);
  if (lv === 4) {
    // Couronne de rayons des mythiques
    let rays = '';
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2 + r() * 0.05;
      const l = 150 + (i % 2) * 60;
      rays += `<path d="M150 190L${F(150 + Math.cos(a - 0.025) * l)} ${F(190 + Math.sin(a - 0.025) * l)}L${F(150 + Math.cos(a + 0.025) * l)} ${F(190 + Math.sin(a + 0.025) * l)}Z"/>`;
    }
    svg += `<g fill="#ffe6a8" opacity=".22" filter="url(#glowS)">${rays}</g>`;
  }
  svg += `<g transform="${tf}">`;
  if (b.backGlow.length) svg += `<g filter="url(#glowS)">${b.backGlow.join('')}</g>`;
  if (b.back.length) svg += `<g>${b.back.join('')}</g>`;
  svg += `<g fill="${bodyFill}"${bodyStroke} filter="url(#rim)">${b.sil.map((d) => `<path d="${d}"/>`).join('')}</g>`;
  if (b.det.length) svg += `<g>${b.det.join('')}</g>`;
  if (b.lit.length) svg += `<g${secret ? ' opacity=".9"' : ''}>${b.lit.join('')}</g>`;
  if (b.glow.length) svg += `<g filter="url(#glowS)">${b.glow.join('')}</g>`;
  svg += `</g>`;
  // avant-plan : brume et particules
  svg += `<rect x="-20" y="330" width="340" height="120" fill="${P.sky[2]}" opacity=".18" filter="url(#soft)"/>`;
  svg += `<g>${particlesSvg(particle, r, pCount, P)}</g>`;
  if (lv >= 4 && !opt.lite) svg += `<g filter="url(#glowS)">${particlesSvg('mote', r, 14, P)}</g>`;
  svg += `<rect width="300" height="420" fill="url(#vig)"/>`;
  svg += `</svg>`;
  return svg;
}

const ALT_SCENE = { inferno: 'ruins', abyss: 'ocean', heaven: 'sky', forest: 'swamp', crypt: 'ruins', volcano: 'cosmos', forge: 'void' };

// Silhouette mystère pour les cartes non découvertes.
export function renderMystery(card) {
  const P = PALETTES[card.faction] || PALETTES.infernal;
  const art = card.art || { form: 'blob' };
  const r = seeded(card.id);
  const b = new Builder(r, P);
  (FORMS[art.form] || FORMS.blob)(b, art, r);
  const flip = art.flip ? `translate(300 0) scale(-1 1)` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="m" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="${P.glow}" stop-opacity=".22"/><stop offset="1" stop-color="#08090d" stop-opacity="0"/></radialGradient><filter id="bl"><feGaussianBlur stdDeviation="2.5"/></filter></defs><rect width="300" height="420" fill="#0b0c12"/><rect width="300" height="420" fill="url(#m)"/><g transform="${flip} translate(150 ${192 + (art.dy || 0)}) scale(${F((art.scale || 1) * 0.9 * 100) / 100}) translate(-150 -215)" fill="#020204" stroke="${P.glow}" stroke-opacity=".35" stroke-width="1.4" filter="url(#bl)">${b.sil.map((d) => `<path d="${d}"/>`).join('')}</g></svg>`;
}
