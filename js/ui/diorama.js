// Décor du plateau de combat : un donjon miniature vu d'en haut, comme une maquette posée sur la table.
// Mur du fond avec une grande arche (on voit la peinture du décor à travers), sol en perspective,
// murs latéraux, rebord de la maquette, accessoires, lumières, particules. Tout est en HTML/CSS/SVG
// (aucun moteur 3D) : le sol et les murs latéraux sont des plans en perspective CSS.
// Le décor ne reçoit jamais les touchers et reste sous les cartes.

const DIO = 'assets/dio/';
// adresse absolue : une url() relative placée dans une variable CSS serait résolue depuis la feuille de style
const abs = (u) => new URL(u, document.baseURI).href;
// Images peintes (Gemini) déjà livrées, dans assets/dio/p/<nom>.webp : elles remplacent le dessin
// fait par le code (accessoires) ou la texture calculée (sol « floor-<royaume> »). Ajouter le nom ici à la livraison.
export const PAINTED = new Set(['brazier', 'crystal', 'mushrooms', 'column', 'column-broken', 'angel', 'horned', 'rock', 'candles', 'tomb', 'obelisk', 'amber', 'gear', 'ice',
  'floor-infernal', 'floor-abyssal', 'floor-celeste', 'floor-sauvage', 'floor-necrotique', 'floor-primordial', 'floor-artificiel', 'floor-givre']);
const painted = (name, h = '') => (PAINTED.has(name) ? `<img class="dio-img" alt="" src="${DIO}p/${name}.webp" ${h}>` : null);

// ——— Royaumes : matériaux, teintes, accessoires, particules ———
// stone / wall : teintes multipliées sur les textures grises ; glow : couleur des lueurs du royaume.
export const DIO_THEMES = {
  infernal:   { floor: 'floor-stone', tile: 170, stone: '#6b4a40', wall: '#5a3a33', glow: '#FF6A2A', joints: 0.95, parts: ['ember', 12], wallDeco: 'chains', corner: 'brazier', side: 'horned', floorDeco: 'cracks' },
  abyssal:    { floor: 'floor-stone', tile: 190, puddles: 0.8, stone: '#4d4566', wall: '#3b3452', glow: '#B57BFF', joints: 0.55, parts: ['mote', 10], wallDeco: 'tendrils', corner: 'crystal', side: 'crystal', floorDeco: 'cracks' },
  celeste:    { floor: 'floor-marble', tile: 260, stone: '#d8d2e6', wall: '#a39db8', glow: '#FFE3A0', joints: 0, parts: ['glint', 10], wallDeco: 'banners', corner: 'column', side: 'angel', floorDeco: 'runes', bannerCol: ['#E9E2F5', '#C9A24E'] },
  sauvage:    { floor: 'floor-stone', tile: 180, stone: '#5d6650', wall: '#4b5341', glow: '#A8FF7A', joints: 0, moss: 0.9, parts: ['spore', 10], wallDeco: 'roots', corner: 'mushrooms', side: 'rock', floorDeco: 'moss' },
  necrotique: { floor: 'floor-stone', tile: 170, puddles: 0.7, stone: '#566260', wall: '#434d4b', glow: '#8CFFC8', joints: 0.25, parts: ['mist', 2], wallDeco: 'cobwebs', corner: 'candles', side: 'tomb', floorDeco: 'none' },
  primordial: { floor: 'floor-stone', tile: 280, stone: '#7c6a4e', wall: '#665639', glow: '#FFC85A', joints: 0.35, parts: ['dust', 9], wallDeco: 'runes', corner: 'obelisk', side: 'amber', floorDeco: 'runes' },
  artificiel: { floor: 'floor-metal', tile: 190, stone: '#6b7682', wall: '#4b535e', glow: '#73DAFF', joints: 0.8, parts: ['spark', 8], wallDeco: 'pipes', corner: 'gear', side: 'gear', floorDeco: 'none' },
  givre:      { floor: 'floor-stone', tile: 190, stone: '#8ea6bd', wall: '#6d849b', glow: '#A8ECFF', joints: 0.3, frost: 0.95, parts: ['snow', 14], wallDeco: 'icicles', corner: 'ice', side: 'ice', floorDeco: 'frost' },
};

// ——— Chaque peinture de décor : son royaume et sa lumière (couleur relevée dans l'image) ———
export const PAINTINGS = {
  'bg-1': ['necrotique', '#54BCFF'], 'bg-2': ['necrotique', '#13E7FF'], 'bg-3': ['infernal', '#FF6100'], 'bg-4': ['abyssal', '#C9A0FF'], 'bg-boss': ['infernal', '#FF7A5A'],
  'f-1': ['necrotique', '#FFB060'], 'f-2': ['necrotique', '#35FFA4'], 'f-3': ['artificiel', '#FF953E'], 'f-4': ['primordial', '#05BAFF'], 'f-5': ['abyssal', '#4BFFE6'],
  'f-6': ['sauvage', '#E8A6FF'], 'f-7': ['infernal', '#FF4700'], 'f-8': ['givre', '#4BDDFF'], 'f-9': ['necrotique', '#ABFFDD'], 'f-10': ['primordial', '#FFCE45'],
  'f-11': ['givre', '#67ECFF'], 'f-12': ['abyssal', '#FF42B8'], 'f-13': ['artificiel', '#FFBE82'], 'f-14': ['abyssal', '#327CFF'], 'f-15': ['celeste', '#A531FF'],
  'f-16': ['infernal', '#FF2A1A'], 'g-1': ['primordial', '#FFA32D'], 'g-2': ['givre', '#58E9FF'], 'g-3': ['infernal', '#FF5703'], 'g-4': ['sauvage', '#60FF7E'],
  'g-5': ['primordial', '#FFA635'], 'g-6': ['celeste', '#65E2FF'], 'g-7': ['infernal', '#FF5200'], 'g-8': ['abyssal', '#D742FF'],
};

// ——— Salles des gardiens : une peinture, un royaume, une lumière, un monument ———
export const BOSS_ROOMS = {
  devoreur:   { paint: 'g-8', theme: 'abyssal', light: '#FF3B5C', monument: 'maw' },
  matriarche: { paint: 'g-2', theme: 'givre', light: '#7FE6FF', monument: 'frostcrown' },
  roi:        { paint: 'g-5', theme: 'primordial', light: '#FFC65A', monument: 'masks' },
  architecte: { paint: 'bg-boss', theme: 'primordial', light: '#FFD36A', monument: 'geometry' },
  eclipse:    { paint: 'g-6', theme: 'celeste', light: '#FF9A3C', monument: 'eclipse' },
};

// Décor d'un combat : d'après la peinture de l'étage (et la salle du gardien s'il y en a un)
export function roomFor(paintUrl, bossKey) {
  if (bossKey && BOSS_ROOMS[bossKey]) {
    const B = BOSS_ROOMS[bossKey];
    return { key: B.theme, light: B.light, paint: `assets/battle/${B.paint}.webp`, view: `assets/ui/ph-${bossKey}.webp`, boss: bossKey, monument: B.monument };
  }
  const k = (paintUrl.match(/battle\/([a-z0-9-]+)\.webp/) || [])[1];
  const [key, light] = PAINTINGS[k] || ['necrotique', '#9FE0FF'];
  return { key, light, paint: null, boss: null };
}

// ——— Accessoires en SVG (volumes par dégradés ; couleurs du royaume) ———
let uid = 0;
const id = (n) => `dio${++uid}${n}`;
const svg = (w, h, body, cls = '') => `<svg class="dio-svg ${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${body}</svg>`;

function stoneGrad(g, light = '#8b8578', dark = '#2a2622') {
  return `<linearGradient id="${g}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${dark}"/><stop offset=".35" stop-color="${light}"/><stop offset=".6" stop-color="${light}" stop-opacity=".85"/><stop offset="1" stop-color="${dark}"/></linearGradient>`;
}
const P = {
  // brasero sur trépied : la flamme est un élément CSS posé dessus
  brazier(c) {
    const m = id('m'), r = id('r');
    return svg(60, 90, `<defs><linearGradient id="${m}" x1="0" x2="1"><stop offset="0" stop-color="#151214"/><stop offset=".45" stop-color="#5a4a40"/><stop offset="1" stop-color="#151214"/></linearGradient>
      <radialGradient id="${r}" cx=".5" cy=".3" r=".7"><stop offset="0" stop-color="${c.glow}"/><stop offset=".5" stop-color="#ff7a20" stop-opacity=".7"/><stop offset="1" stop-color="#300" stop-opacity="0"/></radialGradient></defs>
      <path d="M18 88 L27 50 M42 88 L33 50 M30 88 L30 52" stroke="#1d191b" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M8 34 Q30 62 52 34 Z" fill="url(#${m})"/><ellipse cx="30" cy="34" rx="22" ry="5" fill="#2a2220" stroke="#B88B3A" stroke-width="1.6"/>
      <ellipse cx="30" cy="34" rx="18" ry="3.6" fill="url(#${r})"/>`, 'p-brazier') + '<i class="dio-fire" style="--fs:1"></i>';
  },
  crystal(c) {
    const a = id('a'), b = id('b');
    const shard = (x, w, h, lean) => `<path d="M${x} 100 L${x - w} ${100 - h * 0.62} L${x + lean} ${100 - h} L${x + w} ${100 - h * 0.6} Z" fill="url(#${a})"/><path d="M${x} 100 L${x + lean} ${100 - h} L${x + w} ${100 - h * 0.6} Z" fill="url(#${b})"/>`;
    return svg(80, 100, `<defs><linearGradient id="${a}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#1b1030"/><stop offset=".7" stop-color="${c.glow}" stop-opacity=".9"/><stop offset="1" stop-color="#fff"/></linearGradient>
      <linearGradient id="${b}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#0c0618"/><stop offset="1" stop-color="${c.glow}" stop-opacity=".55"/></linearGradient></defs>
      ${shard(22, 8, 52, -4)}${shard(56, 9, 60, 5)}${shard(40, 12, 92, 2)}${shard(30, 6, 34, -2)}${shard(64, 6, 30, 3)}`, 'p-crystal');
  },
  ice(c) { return P.crystal({ glow: c.glow || '#bff3ff' }).replace('p-crystal', 'p-crystal p-ice'); },
  amber(c) { return P.crystal({ glow: '#FFB347' }).replace('p-crystal', 'p-crystal p-amber'); },
  column(c, broken = false) {
    const g = id('g');
    const top = broken ? 'M10 40 L14 30 L22 36 L30 22 L37 34 L44 28 L50 40' : '';
    return svg(60, 160, `<defs>${stoneGrad(g, c.marble ? '#efe9f6' : '#9a9384', c.marble ? '#6d6880' : '#2b2723')}</defs>
      <rect x="4" y="146" width="52" height="14" rx="2" fill="url(#${g})"/><rect x="8" y="138" width="44" height="9" rx="2" fill="url(#${g})"/>
      ${broken ? `<path d="${top} L50 138 L10 138 Z" fill="url(#${g})"/>` : `<rect x="10" y="22" width="40" height="117" fill="url(#${g})"/><rect x="5" y="12" width="50" height="11" rx="2" fill="url(#${g})"/><rect x="2" y="2" width="56" height="11" rx="2" fill="url(#${g})"/>`}
      <path d="M18 ${broken ? 40 : 24} V138 M26 ${broken ? 34 : 24} V138 M34 ${broken ? 30 : 24} V138 M42 ${broken ? 36 : 24} V138" stroke="#000" stroke-opacity=".18" stroke-width="1.6"/>
      ${c.marble ? `<rect x="8" y="132" width="44" height="3" fill="#C9A24E" opacity=".8"/>` : ''}`, 'p-column');
  },
  obelisk(c) {
    const g = id('g');
    return svg(50, 150, `<defs>${stoneGrad(g, '#8a7a5c', '#2a2318')}</defs>
      <path d="M12 146 L16 22 L25 6 L34 22 L38 146 Z" fill="url(#${g})"/><rect x="6" y="140" width="38" height="10" rx="2" fill="url(#${g})"/>
      <g stroke="${c.glow}" stroke-width="1.6" fill="none" stroke-linecap="round" class="dio-rune"><path d="M25 36 v12 m-5 -6 h10"/><path d="M21 62 l8 8 m0 -8 l-8 8"/><path d="M25 86 a5 5 0 1 0 0.1 0"/><path d="M20 108 l5 -8 l5 8 z"/></g>`, 'p-obelisk');
  },
  candles(c) {
    const w = id('w');
    const cand = (x, h, r) => `<rect x="${x - r}" y="${86 - h}" width="${r * 2}" height="${h}" rx="${r * 0.6}" fill="url(#${w})"/><path d="M${x - r} ${87 - h} q${r * 0.5} ${r * 2.4} ${r} ${r * 0.6} t${r} -${r * 0.3}" fill="#d8c8a0" opacity=".9"/><ellipse cx="${x}" cy="${86 - h}" rx="${r}" ry="${r * 0.35}" fill="#f2e6c4"/>`;
    return svg(60, 90, `<defs><linearGradient id="${w}" x1="0" x2="1"><stop offset="0" stop-color="#6b5a3c"/><stop offset=".45" stop-color="#d9c79c"/><stop offset=".7" stop-color="#b8a47a"/><stop offset="1" stop-color="#4a3c26"/></linearGradient></defs>
      <ellipse cx="30" cy="86" rx="27" ry="4.5" fill="#000" opacity=".55"/><path d="M6 86 q6 -6 14 -2 q8 -5 18 -1 q10 -4 16 3 z" fill="#c9b78e" opacity=".55"/>${cand(16, 24, 3.4)}${cand(28, 40, 4)}${cand(40, 18, 3.2)}${cand(49, 30, 3)}`, 'p-candles')
      + '<i class="dio-flame" style="--x:26.7%;--y:68%"></i><i class="dio-flame" style="--x:46.7%;--y:50.5%"></i><i class="dio-flame" style="--x:66.7%;--y:75%"></i><i class="dio-flame" style="--x:81.7%;--y:62%"></i>';
  },
  tomb(c) {
    const g = id('g');
    return svg(60, 90, `<defs>${stoneGrad(g, '#7d847f', '#262a28')}</defs><path d="M10 88 V30 Q30 4 50 30 V88 Z" fill="url(#${g})"/>
      <path d="M22 38 h16 M30 30 v26" stroke="#111" stroke-opacity=".55" stroke-width="3"/><path d="M14 62 l9 4 l3 8" stroke="#111" stroke-opacity=".4" fill="none"/>
      <path d="M10 88 Q20 76 30 84 Q40 74 50 88 Z" fill="#3c4a36" opacity=".8"/>`, 'p-tomb');
  },
  mushrooms(c) {
    const m = (x, s, h) => `<path d="M${x - 2 * s} 92 Q${x} ${92 - h} ${x + 2 * s} 92 Z" fill="#cdbfa8"/><path d="M${x - 9 * s} ${92 - h + 4} Q${x} ${92 - h - 14 * s} ${x + 9 * s} ${92 - h + 4} Z" fill="${c.glow}" opacity=".9"/><circle cx="${x - 3 * s}" cy="${92 - h - 2 * s}" r="${1.4 * s}" fill="#fff" opacity=".8"/>`;
    return svg(70, 95, `${m(20, 1, 30)}${m(44, 1.4, 48)}${m(58, 0.8, 22)}`, 'p-mush');
  },
  rock() {
    const g = id('g');
    return svg(80, 50, `<defs>${stoneGrad(g, '#7a7468', '#24211d')}</defs><path d="M4 48 L10 26 L28 14 L44 20 L52 34 L60 30 L76 40 L78 48 Z" fill="url(#${g})"/><path d="M28 14 L34 30 L52 34" stroke="#000" stroke-opacity=".3" fill="none"/>`, 'p-rock');
  },
  gear(c) {
    const teeth = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<rect x="-5" y="-48" width="10" height="12" rx="2" transform="rotate(${(a * 180) / Math.PI})"/>`; }).join('');
    const g = id('g');
    return svg(100, 100, `<defs><radialGradient id="${g}" cx=".4" cy=".35"><stop offset="0" stop-color="#9aa6b2"/><stop offset="1" stop-color="#2b3138"/></radialGradient></defs>
      <g transform="translate(50 50)"><g fill="url(#${g})">${teeth}<circle r="38"/><circle r="14" fill="#1a1e23"/><circle r="26" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="3"/></g></g>`, 'p-gear');
  },
  // statues dans une niche : silhouettes sombres, éclairées par le bord
  statue(c, kind) {
    const g = id('g');
    const wings = kind === 'angel' ? `<path d="M30 40 Q4 30 2 70 Q14 58 30 62 Z M50 40 Q76 30 78 70 Q66 58 50 62 Z" fill="url(#${g})" opacity=".9"/>` : '';
    const horns = kind === 'horned' ? `<path d="M33 18 Q24 6 26 -2 Q30 10 37 14 Z M47 18 Q56 6 54 -2 Q50 10 43 14 Z" fill="url(#${g})"/>` : '';
    return svg(80, 160, `<defs><linearGradient id="${g}" x1="0" x2="1"><stop offset="0" stop-color="${c.glow}" stop-opacity=".55"/><stop offset=".18" stop-color="#2a2630"/><stop offset=".85" stop-color="#15131a"/><stop offset="1" stop-color="${c.glow}" stop-opacity=".35"/></linearGradient></defs>
      ${wings}${horns}<path d="M40 8 Q52 8 52 24 Q52 36 46 40 Q62 46 60 64 L66 140 L14 140 L20 64 Q18 46 34 40 Q28 36 28 24 Q28 8 40 8 Z" fill="url(#${g})"/>
      <path d="M40 46 V128" stroke="#000" stroke-opacity=".35" stroke-width="2"/><rect x="38" y="60" width="4" height="70" fill="#B8B0A0" opacity=".45"/>
      <rect x="8" y="138" width="64" height="12" rx="2" fill="#2a262c"/><rect x="4" y="148" width="72" height="12" rx="2" fill="#1d1a20"/>`, 'p-statue');
  },
  angel(c) { return P.statue(c, 'angel'); },
  horned(c) { return P.statue(c, 'horned'); },
};

// Décorations du mur du fond (suspendues en haut), en coordonnées d'écran
function wallDeco(kind, W, Hb, c, arch) {
  const out = [];
  const xs = [W * 0.08, W * 0.27, W * 0.73, W * 0.92];
  if (kind === 'chains') {
    for (const x of [arch.l - 14, arch.r + 14]) {
      let d = '';
      for (let i = 0; i < 9; i++) d += `<ellipse cx="${x}" cy="${6 + i * 9}" rx="${i % 2 ? 2.2 : 3.6}" ry="5" fill="none" stroke="#2b2422" stroke-width="2.4"/>`;
      out.push(d);
    }
  } else if (kind === 'banners') {
    const [cloth, trim] = c.bannerCol || ['#6a1a24', '#C9A24E'];
    for (const x of [xs[1], xs[2]]) {
      const w = W * 0.075, h = Hb * 0.5;
      out.push(`<g class="dio-banner"><rect x="${x - w / 2 - 3}" y="2" width="${w + 6}" height="4" rx="2" fill="${trim}"/>
        <path d="M${x - w / 2} 6 H${x + w / 2} V${h} L${x + w * 0.25} ${h - 8} L${x} ${h + 2} L${x - w * 0.3} ${h - 10} L${x - w / 2} ${h} Z" fill="${cloth}" opacity=".92"/>
        <path d="M${x - w / 2 + 3} 8 V${h - 6} M${x + w / 2 - 3} 8 V${h - 6}" stroke="${trim}" stroke-width="1.4" opacity=".8"/>
        ${c.mask ? `<ellipse cx="${x}" cy="${h * 0.42}" rx="${w * 0.24}" ry="${w * 0.32}" fill="#EDE6DA"/><ellipse cx="${x - w * 0.09}" cy="${h * 0.38}" rx="${w * 0.05}" ry="${w * 0.03}" fill="#222"/><ellipse cx="${x + w * 0.09}" cy="${h * 0.38}" rx="${w * 0.05}" ry="${w * 0.03}" fill="#222"/>` : `<circle cx="${x}" cy="${h * 0.4}" r="${w * 0.2}" fill="none" stroke="${trim}" stroke-width="1.6"/>`}</g>`);
    }
  } else if (kind === 'icicles') {
    let d = '';
    for (let x = 4; x < W; x += 9 + ((x * 7) % 11)) { const h = 8 + ((x * 13) % 26); d += `<path d="M${x} 0 L${x + 3} ${h} L${x + 6} 0 Z"/>`; }
    out.push(`<g fill="${c.glow}" opacity=".75">${d}</g>`);
  } else if (kind === 'roots') {
    let d = '';
    for (const x of [W * 0.05, W * 0.2, W * 0.36, W * 0.62, W * 0.8, W * 0.95]) { const h = Hb * (0.25 + ((x * 3) % 7) / 20); d += `<path d="M${x} 0 C${x - 10} ${h * 0.3} ${x + 12} ${h * 0.6} ${x - 3} ${h}" stroke="#2c2416" stroke-width="${3 + ((x * 5) % 3)}" fill="none" stroke-linecap="round"/>`; }
    out.push(d + `<g fill="${c.glow}" opacity=".6">${[0.13, 0.42, 0.7, 0.87].map((f) => `<circle cx="${W * f}" cy="${Hb * 0.22}" r="2"/>`).join('')}</g>`);
  } else if (kind === 'cobwebs') {
    const web = (x, flip) => { const s = flip ? -1 : 1; let d = ''; for (let i = 1; i <= 4; i++) d += `<path d="M${x} ${i * 9} Q${x + s * i * 6} ${i * 6} ${x + s * i * 10} 0" fill="none"/>`; return d + `<path d="M${x} 0 L${x + s * 40} 30 M${x} 0 L${x + s * 20} 40 M${x} 0 L${x + s * 44} 10" fill="none"/>`; };
    out.push(`<g stroke="#cfd6d2" stroke-opacity=".28" stroke-width=".8">${web(2, false)}${web(W - 2, true)}</g>`);
  } else if (kind === 'pipes') {
    out.push(`<g stroke-linecap="round"><path d="M0 ${Hb * 0.16} H${arch.l - 8} V${Hb * 0.9}" stroke="#39414a" stroke-width="7" fill="none"/><path d="M${W} ${Hb * 0.22} H${arch.r + 8} V${Hb * 0.9}" stroke="#39414a" stroke-width="7" fill="none"/>
      <path d="M0 ${Hb * 0.16} H${arch.l - 8} V${Hb * 0.9}" stroke="#7e8a96" stroke-width="2" fill="none" opacity=".6"/><path d="M${W} ${Hb * 0.22} H${arch.r + 8} V${Hb * 0.9}" stroke="#7e8a96" stroke-width="2" fill="none" opacity=".6"/>
      ${[arch.l - 8, arch.r + 8].map((x) => `<rect x="${x - 6}" y="${Hb * 0.5}" width="12" height="7" rx="2" fill="#B8862C"/>`).join('')}</g>`);
  } else if (kind === 'runes') {
    out.push(`<g class="dio-rune" stroke="${c.glow}" stroke-width="1.6" fill="none" stroke-linecap="round">${[0.1, 0.22, 0.78, 0.9].map((f, i) => { const x = W * f, y = Hb * 0.5; return [`<path d="M${x} ${y - 7} v14 m-6 -7 h12"/>`, `<path d="M${x - 5} ${y - 6} l10 12 m0 -12 l-10 12"/>`, `<path d="M${x - 6} ${y + 6} l6 -12 l6 12 z"/>`, `<circle cx="${x}" cy="${y}" r="6"/>`][i]; }).join('')}</g>`);
  } else if (kind === 'tendrils') {
    let d = '';
    for (const f of [0.06, 0.18, 0.84, 0.95]) { const x = W * f; d += `<path d="M${x} 0 C${x + 14} ${Hb * 0.2} ${x - 14} ${Hb * 0.4} ${x + 4} ${Hb * 0.62}" stroke="#2a1c3c" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="${x + 4}" cy="${Hb * 0.62}" r="2.5" fill="${c.glow}"/>`; }
    out.push(d);
  }
  return out.join('');
}

// ——— Monuments des gardiens (en haut, au centre, dans l'arche) ———
function monument(kind, c) {
  if (kind === 'eclipse') return '<div class="dio-mon dio-eclipse"><i class="dio-corona"></i><i class="dio-disc"></i></div>';
  if (kind === 'maw') return '<div class="dio-mon dio-maw"><i class="dio-gullet"></i></div>';
  if (kind === 'frostcrown') return `<div class="dio-mon dio-frostcrown">${P.crystal({ glow: '#CFF6FF' })}</div>`;
  if (kind === 'masks') return '<div class="dio-mon dio-crown"><img alt="" src="assets/icons/crown.webp"></div>';
  if (kind === 'geometry') return '<div class="dio-mon dio-geo"><img alt="" src="assets/fx/seal.webp"></div>';
  return '';
}
// dents tout autour de l'arche du Dévoreur
function mawTeeth(arch) {
  let d = '';
  const n = 15, cx = (arch.l + arch.r) / 2, r = (arch.r - arch.l) / 2;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (i / n), x = cx - Math.cos(a) * r, y = arch.spring - Math.sin(a) * r;
    const ix = cx - Math.cos(a) * (r - 13 - (i % 2) * 6), iy = arch.spring - Math.sin(a) * (r - 13 - (i % 2) * 6);
    const ox = -Math.sin(a) * 4, oy = Math.cos(a) * 4;
    d += `<path d="M${x + ox} ${y - oy} L${ix} ${iy} L${x - ox} ${y + oy} Z"/>`;
  }
  for (const s of [-1, 1]) for (let j = 0; j < 4; j++) { const x = cx + s * r, y = arch.spring + 14 + j * 22; d += `<path d="M${x} ${y - 5} L${x - s * (12 + (j % 2) * 5)} ${y} L${x} ${y + 5} Z"/>`; }
  return `<g fill="#E9DFC8" stroke="#3a2a22" stroke-width=".8" class="dio-teeth">${d}</g>`;
}

// ——— Construction ———
// Caméra : la salle est vue d'en haut et de face. Le point de fuite est au-dessus de l'écran.
function geometry(W, H) {
  const yFront = H * 0.872, yBack = H * 0.262;
  const Pp = Math.max(480, H * 0.82), oy = -H * 0.36;
  const k = (yBack - oy) / (yFront - oy); // échelle du fond de la salle
  const D = Pp / k - Pp;                  // profondeur de la salle
  const backHalf = W * 0.4, half = backHalf / k;
  const proj = (x, y, z) => { const s = Pp / (Pp - z); return { x: W / 2 + x * s, y: oy + (y - oy) * s, s }; };
  return { W, H, yFront, yBack, P: Pp, oy, k, D, backHalf, half, proj };
}

export function mountDiorama(dv, { room, decor = 'riche', reduced = false, bossKey = null, aspect = null } = {}) {
  const T = DIO_THEMES[room.key] || DIO_THEMES.necrotique;
  const c = { ...T, glow: room.light || T.glow, marble: T.floor === 'floor-marble', mask: room.monument === 'masks' };
  if (room.monument === 'masks') c.bannerCol = ['#3a1450', '#D8B25A'];
  const el = document.createElement('div');
  el.className = `dio th-${room.key} ${room.boss ? `boss b-${room.boss}` : ''} ${decor === 'sobre' ? 'sobre' : ''} ${reduced ? 'still' : ''} ${aspect ? `asp-${aspect}` : ''}`;
  el.setAttribute('aria-hidden', 'true');
  el.style.setProperty('--glow', c.glow);
  el.style.setProperty('--stone', T.stone);
  el.style.setProperty('--wallc', T.wall);
  dv.prepend(el);
  dv.classList.add('has-dio');

  function build() {
    const W = dv.clientWidth, H = dv.clientHeight;
    if (!W || !H) return;
    const G = geometry(W, H);
    const { yFront, yBack, k, D, backHalf, half, proj, oy } = G;
    // arche du fond
    const archHalf = W * 0.17;
    const arch = { l: W / 2 - archHalf, r: W / 2 + archHalf, spring: yBack * 0.5, top: yBack * 0.5 - archHalf };
    const Hb = yBack + 2;
    const tile = 240 * k;
    const ws = id('ws'), wt = id('wt'), vg = id('vg'), ag = id('ag');
    const hole = `M${arch.l} ${Hb} V${arch.spring} A${archHalf} ${archHalf} 0 0 1 ${arch.r} ${arch.spring} V${Hb} Z`;
    // claveaux de l'arche
    let vous = '';
    const nv = 13;
    for (let i = 0; i < nv; i++) {
      const a0 = Math.PI * (i / nv), a1 = Math.PI * ((i + 1) / nv);
      const r0 = archHalf, r1 = archHalf + 15;
      const P0 = (r, a) => `${W / 2 - Math.cos(a) * r} ${arch.spring - Math.sin(a) * r}`;
      vous += `<path d="M${P0(r0, a0 + 0.012)} L${P0(r1, a0 + 0.012)} L${P0(r1, a1 - 0.012)} L${P0(r0, a1 - 0.012)} Z" fill="url(#${ws})"/>`;
    }
    const pil = (x) => `<rect x="${x - 11}" y="${arch.spring - 4}" width="22" height="${Hb - arch.spring + 4}" fill="url(#${ws})"/><rect x="${x - 14}" y="${arch.spring - 10}" width="28" height="8" rx="1.5" fill="url(#${ws})"/><rect x="${x - 11}" y="${arch.spring - 4}" width="22" height="${Hb - arch.spring + 4}" fill="url(#${vg})"/>`;
    const wall = `<svg class="dio-back" width="${W}" height="${Hb}" viewBox="0 0 ${W} ${Hb}" aria-hidden="true">
      <defs><pattern id="${ws}" patternUnits="userSpaceOnUse" width="${tile}" height="${tile}"><image href="${DIO}wall-stone.webp" width="${tile}" height="${tile}"/></pattern>
        <linearGradient id="${wt}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".78"/><stop offset=".55" stop-color="#000" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>
        <linearGradient id="${vg}" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset=".4" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
        <radialGradient id="${ag}" cx=".5" cy=".75" r=".6"><stop offset="0" stop-color="${c.glow}" stop-opacity=".55"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/></radialGradient></defs>
      <path d="M0 0 H${W} V${Hb} H0 Z ${hole}" fill-rule="evenodd" fill="url(#${ws})"/>
      <path d="M0 0 H${W} V${Hb} H0 Z ${hole}" fill-rule="evenodd" fill="var(--wallc)" class="dio-tint"/>
      ${room.monument === 'maw' ? '' : vous}${pil(arch.l - 4)}${pil(arch.r + 4)}
      <rect x="0" y="${Hb - 8}" width="${W}" height="8" fill="url(#${ws})"/><rect x="0" y="${Hb - 8}" width="${W}" height="2" fill="#fff" opacity=".12"/>
      <path d="M0 0 H${W} V${Hb} H0 Z ${hole}" fill-rule="evenodd" fill="url(#${wt})"/>
      <ellipse cx="${W / 2}" cy="${arch.spring}" rx="${archHalf * 2.1}" ry="${archHalf * 1.5}" fill="url(#${ag})" class="dio-archglow"/>
      ${room.monument === 'maw' ? mawTeeth(arch) : `<path d="M${W / 2 - 9} ${arch.top - 16} L${W / 2 + 9} ${arch.top - 16} L${W / 2 + 6} ${arch.top + 4} L${W / 2 - 6} ${arch.top + 4} Z" fill="url(#${ws})" stroke="${c.glow}" stroke-opacity=".5"/><circle cx="${W / 2}" cy="${arch.top - 6}" r="3" fill="${c.glow}" class="dio-keyrune"/>`}
      <g class="dio-hang">${wallDeco(room.monument === 'masks' ? 'banners' : room.monument === 'maw' ? 'tendrils' : T.wallDeco, W, Hb, c, arch)}</g>
    </svg>`;
    // sol en perspective (plan CSS couché) : texture, joints lumineux, mousse, givre, flaques de lumière
    const fw = half * 2, fl = W / 2 - half;
    const tileF = T.tile;
    const pFloor = PAINTED.has(`floor-${room.key}`);
    const mask = (name, cls, op) => `<div class="dio-ov ${cls}" style="--m:url(${abs(`${DIO}${name}.webp`)});--ts:${tileF}px;opacity:${op}"></div>`;
    const floor = `<div class="dio-floor" style="left:${fl}px;top:${yFront - D}px;width:${fw}px;height:${D}px;transform-origin:50% 100%;--ts:${tileF}px">
      <div class="dio-ftex ${pFloor ? 'painted' : ''}" style="background-image:url(${pFloor ? `${DIO}p/floor-${room.key}.webp` : `${DIO}${T.floor}.webp`})"></div>
      ${pFloor ? '' : `${mask('grime', 'ov-grime', 0.75).replace(`--ts:${tileF}px`, `--ts:${Math.round(tileF * 2.6)}px`)}${T.puddles ? mask('puddle', 'ov-puddle', T.puddles).replace(`--ts:${tileF}px`, `--ts:${Math.round(tileF * 2.2)}px`) + mask('puddle', 'ov-sheen', 0.5).replace(`--ts:${tileF}px`, `--ts:${Math.round(tileF * 2.2)}px`) : ''}
      ${T.joints ? mask('joints', 'ov-joints', T.joints) : ''}${T.moss ? mask('moss', 'ov-moss', T.moss) : ''}${T.frost ? mask('frost', 'ov-frost', T.frost) : ''}`}
      ${T.floorDeco === 'cracks' && !pFloor ? mask('cracks', 'ov-cracks', 0.8) : ''}${(T.floorDeco === 'runes' && !pFloor) || room.monument === 'geometry' ? `<div class="dio-runes ${room.monument === 'geometry' ? 'geo' : ''}"></div>` : ''}
      <div class="dio-brk"></div><div class="dio-sealring"></div>
      <div class="dio-fpool"></div></div>`;
    // murs latéraux (plans CSS dressés)
    const Hw = (yBack + 40) / k;
    const side = (s) => `<div class="dio-side ${s < 0 ? 'l' : 'r'}" style="left:${s < 0 ? W / 2 - half : W / 2 + half - D}px;top:${yFront - Hw}px;width:${D}px;height:${Hw}px;transform-origin:${s < 0 ? '0%' : '100%'} 100%;--tw:${240}px"></div>`;
    // accessoires posés au sol, à l'échelle de leur profondeur
    const place = (fx, fz, h, html, cls = '') => {
      const p = proj(fx * half, yFront, -fz * D);
      const hh = h * p.s;
      return `<div class="dio-prop ${cls}" style="left:${p.x}px;top:${p.y - hh}px;height:${hh}px;--s:${p.s.toFixed(3)}">${html}</div>`;
    };
    let props = '';
    const corner = T.corner, sideP = T.side;
    const cornerHTML = painted(corner) || (corner === 'column' ? P.column(c) : P[corner] ? P[corner](c) : '');
    props += place(-0.86, 0.94, corner === 'column' ? 230 : corner === 'obelisk' ? 210 : 120, cornerHTML, `pc-${corner}`);
    props += place(0.86, 0.94, corner === 'column' ? 230 : corner === 'obelisk' ? 210 : 120, corner === 'column' ? (painted('column-broken') || P.column(c, true)) : cornerHTML, `pc-${corner}`);
    const sideHTML = painted(sideP) || (P[sideP] ? P[sideP](c) : '');
    const sideH = ['angel', 'horned'].includes(sideP) ? 200 : sideP === 'tomb' ? 110 : sideP === 'gear' ? 110 : 100;
    props += place(-0.86, 0.6, sideH, sideHTML, `ps-${sideP}`);
    props += place(0.86, 0.62, sideH, sideP === 'tomb' ? (painted('candles') || P.candles(c)) : sideHTML, `ps-${sideP}`);
    props += place(-0.62, 0.985, 60, painted('rock') || P.rock(), 'p-rubble');
    // torches des murs latéraux (peintes) et leur halo
    const torch = (s, fz) => { const p = proj(s * half, yFront - 175, -fz * D); const h = 92 * p.s; return `<div class="dio-torch ${s < 0 ? 'l' : 'r'}" style="left:${p.x + s * 2}px;top:${p.y - h / 2}px;height:${h}px"><img alt="" src="assets/icons/torch-on.webp"><i class="dio-tglow"></i></div>`; };
    const torches = torch(-1, 0.82) + torch(1, 0.82) + (() => { const y = yBack * 0.58, h = 72 * k * 1.9; return [arch.l - 34, arch.r + 34].map((x) => `<div class="dio-torch b" style="left:${x}px;top:${y - h / 2}px;height:${h}px"><img alt="" src="assets/icons/torch-on.webp"><i class="dio-tglow"></i></div>`).join(''); })();
    // particules
    const [pk, pn] = T.parts;
    let parts = '';
    if (pk === 'mist') parts = '<i class="dio-mist m1"></i><i class="dio-mist m2"></i>';
    else for (let i = 0; i < pn; i++) parts += `<i class="dio-pt pt-${pk}" style="--px:${(i * 37 + 11) % 100}%;--py:${30 + ((i * 53) % 60)}%;--pd:${6 + ((i * 7) % 7)}s;--pl:${-((i * 1.7) % 6).toFixed(1)}s"></i>`;
    // Mélange : la peinture de l'étage remplit le fond ; le sol de la maquette apparaît en fondu par-dessus
    el.innerHTML = `<div class="dio-far" style="${room.paint ? `background-image:url(${abs(room.paint)})` : ''}"></div>
      <div class="dio-3d" style="perspective:${G.P}px;perspective-origin:50% ${oy}px">${floor}</div>
      <div class="dio-props">${props}</div>
      <div class="dio-light"></div><div class="dio-fury"></div><div class="dio-fx"></div>
      <div class="dio-ledge" style="top:${yFront}px"></div>
      <div class="dio-parts">${parts}</div>`;
    el.style.setProperty('--yb', `${yBack}px`);
    el.style.setProperty('--yf', `${yFront}px`);
    el.style.setProperty('--ash', `${arch.spring}px`);
    el.style.setProperty('--atop', `${arch.top}px`);
    el.style.setProperty('--aw', `${archHalf * 2}px`);
  }
  build();
  let lastW = dv.clientWidth, lastH = dv.clientHeight;
  const ro = new ResizeObserver(() => { const w = dv.clientWidth, h = dv.clientHeight; if (Math.abs(w - lastW) > 2 || Math.abs(h - lastH) > 2) { lastW = w; lastH = h; build(); } });
  ro.observe(dv);
  // Réactions du décor (brèves : elles s'effacent d'elles-mêmes)
  const pulse = (cls, ms = 900) => { if (decor === 'sobre' && cls !== 'awake') return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); };
  if (room.boss) { el.classList.add('awake'); setTimeout(() => el.classList.remove('awake'), 2200); }
  return {
    el,
    flare: () => pulse('flare', 700),       // coup critique, parade : les flammes s'avivent
    roar: () => pulse('roar', 900),         // rugissement du gardien : la salle tremble
    brk: () => pulse('brk', 1100),          // Brisure : les fissures du sol s'illuminent
    seal: () => pulse('seal', 1600),        // Sceau du Gardien : cercle doré au sol et lueur dorée
    ult: () => pulse('ultl', 1200),
    fury() { el.classList.add('fury'); },  // phase 2 du gardien
    fallen() { el.classList.add('fallen'); el.classList.remove('fury'); },
    aspect(a) { el.classList.remove('asp-soleil', 'asp-lune'); if (a) el.classList.add(`asp-${a}`); },
    destroy() { ro.disconnect(); },
  };
}
