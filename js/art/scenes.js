// Arrière-plans atmosphériques. Chaque scène dessine 300 × 420 unités, éclairée
// depuis l'arrière de la créature (contre-jour), pour faire ressortir les silhouettes.
import { F, polyD, smoothD, tube, ridge, gearD, ring, star, spline } from './geometry.js';

const wrap = (s, attrs = '') => `<g ${attrs}>${s}</g>`;

function fogBand(y, h, color, op) {
  return `<rect x="-20" y="${F(y)}" width="340" height="${F(h)}" fill="${color}" opacity="${op}" filter="url(#soft)"/>`;
}

function rays(cx, cy, n, len, color, op, rnd, spread = Math.PI * 2, base = -Math.PI / 2) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = base - spread / 2 + (spread * (i + rnd() * 0.6)) / n;
    const w = 0.03 + rnd() * 0.05;
    const l = len * (0.6 + rnd() * 0.5);
    const p = [[cx, cy], [cx + Math.cos(a - w) * l, cy + Math.sin(a - w) * l], [cx + Math.cos(a + w) * l, cy + Math.sin(a + w) * l]];
    s += `<path d="${polyD(p)}" fill="${color}" opacity="${F(op * (0.4 + rnd() * 0.6) * 100) / 100}"/>`;
  }
  return `<g filter="url(#soft)">${s}</g>`;
}

function deadTree(x, y, h, rnd, color, op = 1) {
  let s = '';
  const branch = (x0, y0, ang, len, w, depth) => {
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    const mid = [(x0 + x1) / 2 + (rnd() - 0.5) * len * 0.3, (y0 + y1) / 2 + (rnd() - 0.5) * len * 0.3];
    s += `<path d="${tube([[x0, y0], mid, [x1, y1]], w, w * 0.45)}"/>`;
    if (depth > 0) {
      const k = 2 + (rnd() < 0.4 ? 1 : 0);
      for (let i = 0; i < k; i++) branch(x1, y1, ang + (rnd() - 0.5) * 1.3, len * (0.55 + rnd() * 0.25), w * 0.5, depth - 1);
    }
  };
  branch(x, y, -Math.PI / 2 + (rnd() - 0.5) * 0.3, h * 0.45, h * 0.09, 3);
  s += `<path d="${polyD([[x - h * 0.12, y + 2], [x - h * 0.04, y - h * 0.08], [x + h * 0.04, y - h * 0.08], [x + h * 0.13, y + 2]])}"/>`;
  return `<g fill="${color}" opacity="${op}">${s}</g>`;
}

function pineRow(rnd, y, color, op, n = 12, hmin = 60, hmax = 140) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = -20 + (340 * (i + rnd() * 0.8)) / n;
    const h = hmin + rnd() * (hmax - hmin);
    const w = h * (0.18 + rnd() * 0.1);
    const pts = [[x, y - h]];
    const tiers = 5;
    for (let t = 1; t <= tiers; t++) pts.push([x + (w * t) / tiers, y - h + (h * t) / tiers], [x + (w * t) / tiers * 0.55, y - h + (h * t) / tiers + 2]);
    const right = pts.slice(1);
    const left = right.map(([px, py]) => [2 * x - px, py]).reverse();
    s += `<path d="${polyD([pts[0], ...right, [x + 3, y + 30], [x - 3, y + 30], ...left])}"/>`;
  }
  return `<g fill="${color}" opacity="${op}">${s}</g>`;
}

function tombstones(rnd, y, color) {
  let s = '';
  for (let i = 0; i < 9; i++) {
    const x = 10 + i * 34 + rnd() * 14;
    const h = 14 + rnd() * 22;
    const w = 9 + rnd() * 7;
    const yy = y + rnd() * 16;
    if (rnd() < 0.35) s += `<path d="M${F(x - 2)} ${F(yy)}v${F(-h)}h4v${F(h)}zM${F(x - w * 0.6)} ${F(yy - h * 0.7)}h${F(w * 1.2)}v4h${F(-w * 1.2)}z" transform="rotate(${F((rnd() - 0.5) * 16)} ${F(x)} ${F(yy)})"/>`;
    else s += `<path d="M${F(x - w / 2)} ${F(yy)}V${F(yy - h + w / 2)}A${F(w / 2)} ${F(w / 2)} 0 0 1 ${F(x + w / 2)} ${F(yy - h + w / 2)}V${F(yy)}Z" transform="rotate(${F((rnd() - 0.5) * 14)} ${F(x)} ${F(yy)})"/>`;
  }
  return `<g fill="${color}">${s}</g>`;
}

function arches(rnd, color, op) {
  let s = '';
  const cols = [20, 280, 70, 230];
  cols.forEach((x, i) => {
    const w = i < 2 ? 34 : 18;
    const top = i < 2 ? 60 + rnd() * 30 : 150 + rnd() * 30;
    const broken = rnd() < 0.5;
    s += `<path d="${polyD([[x - w / 2, 430], [x - w / 2, top + 10], [x - w / 2 - 4, top], [x + w / 2 + 4, top], [x + w / 2, top + 10], [x + w / 2, 430]])}"/>`;
    if (broken) s += `<path d="${polyD([[x - w / 2 - 4, top], [x - w / 4, top - 14], [x + w / 6, top - 4], [x + w / 2 + 4, top - 18], [x + w / 2 + 4, top]])}"/>`;
  });
  s += `<path d="M2 120 Q150 -10 298 120 L298 100 Q150 -34 2 100Z" opacity=".8"/>`;
  return `<g fill="${color}" opacity="${op}">${s}</g>`;
}

function clouds(rnd, y, color, op, n = 9, r0 = 26) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = -10 + (320 * i) / (n - 1) + (rnd() - 0.5) * 20;
    s += `<circle cx="${F(x)}" cy="${F(y + (rnd() - 0.5) * 18)}" r="${F(r0 * (0.7 + rnd() * 0.7))}"/>`;
  }
  return `<g fill="${color}" opacity="${op}" filter="url(#soft)">${s}<rect x="-10" y="${F(y)}" width="320" height="200"/></g>`;
}

export function particlesSvg(type, rnd, n, P) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = rnd() * 300, y = 30 + rnd() * 380, k = rnd();
    switch (type) {
      case 'ember': s += `<circle cx="${F(x)}" cy="${F(y)}" r="${F(0.6 + k * 1.8)}" fill="${k > 0.6 ? '#ffd27a' : P.glow}" opacity="${F(0.4 + k * 0.6)}"/>`; break;
      case 'bubble': s += `<circle cx="${F(x)}" cy="${F(y)}" r="${F(0.8 + k * 3)}" fill="none" stroke="${P.rim}" stroke-width=".6" opacity="${F(0.2 + k * 0.5)}"/>`; break;
      case 'mote': s += `<circle cx="${F(x)}" cy="${F(y)}" r="${F(0.5 + k * 1.6)}" fill="#fffbe8" opacity="${F(0.3 + k * 0.7)}"/>`; break;
      case 'spore': s += `<circle cx="${F(x)}" cy="${F(y)}" r="${F(0.6 + k * 1.4)}" fill="${k > 0.5 ? '#d8f07a' : P.glow}" opacity="${F(0.25 + k * 0.6)}"/>`; break;
      case 'ash': s += `<rect x="${F(x)}" y="${F(y)}" width="${F(1 + k * 2.5)}" height="${F(0.8 + k)}" fill="${P.rim}" opacity="${F(0.15 + k * 0.4)}" transform="rotate(${F(k * 180)} ${F(x)} ${F(y)})"/>`; break;
      case 'snow': s += `<circle cx="${F(x)}" cy="${F(y)}" r="${F(0.6 + k * 1.6)}" fill="#f2f8ff" opacity="${F(0.35 + k * 0.6)}"/>`; break;
      case 'spark': s += `<path d="M${F(x)} ${F(y)}l${F(2 + k * 5)} ${F(-1 - k * 3)}" stroke="${k > 0.5 ? '#c9fbff' : P.glow}" stroke-width="${F(0.6 + k)}" opacity="${F(0.4 + k * 0.6)}"/>`; break;
      case 'star': s += `<circle cx="${F(x)}" cy="${F(y)}" r="${F(0.3 + k * 1.1)}" fill="#fff" opacity="${F(0.3 + k * 0.7)}"/>`; break;
      default: s += `<circle cx="${F(x)}" cy="${F(y)}" r="${F(0.5 + k)}" fill="${P.rim}" opacity="${F(0.2 + k * 0.5)}"/>`;
    }
  }
  return s;
}

// Scènes -------------------------------------------------------------------
const SCENES = {
  inferno(r, P, lv) {
    let s = '';
    s += `<ellipse cx="150" cy="400" rx="260" ry="150" fill="${P.light}" opacity=".35" filter="url(#soft)"/>`;
    s += wrap(`<path d="${ridge(r, 250, 34, 22, -10, 310, 430, true)}"/>`, `fill="#2a0a0c" opacity=".85"`);
    for (let i = 0; i < 4; i++) {
      const x = 20 + r() * 260, w = 6 + r() * 10, h = 70 + r() * 110;
      s += `<path d="${polyD([[x - w, 330], [x - w * 0.4, 330 - h * 0.7], [x - w * 0.2, 330 - h], [x + w * 0.3, 330 - h * 0.65], [x + w, 330]])}" fill="#16060a" opacity=".9"/>`;
    }
    s += wrap(`<path d="${ridge(r, 318, 14, 30)}"/>`, `fill="#0c0406"`);
    s += `<path d="M-10 345 Q80 330 150 340 T310 336" stroke="${P.glow}" stroke-width="3" fill="none" opacity=".9" filter="url(#glowS)"/>`;
    s += `<path d="M-10 368 Q60 356 140 366 T310 360" stroke="#ffb347" stroke-width="1.6" fill="none" opacity=".6" filter="url(#glowS)"/>`;
    return s;
  },
  abyss(r, P, lv) {
    let s = '';
    s += rays(150, -40, 7, 520, '#bff4ff', 0.13, r, 0.9, Math.PI / 2);
    s += wrap(`<path d="${polyD([[-10, 430], [-10, 40], [20, 90], [40, 70], [55, 180], [44, 260], [70, 330], [60, 430]])}"/><path d="${polyD([[310, 430], [310, 20], [282, 110], [262, 90], [250, 210], [266, 280], [238, 360], [250, 430]])}"/>`, `fill="#030b14" opacity=".92"`);
    for (let i = 0; i < 9; i++) {
      const x = 10 + r() * 280, h = 30 + r() * 70;
      s += `<path d="${tube([[x, 430], [x + (r() - 0.5) * 20, 430 - h * 0.5], [x + (r() - 0.5) * 30, 430 - h]], 6, 1)}" fill="#04121c" opacity=".9"/>`;
    }
    for (let i = 0; i < 18; i++) s += `<circle cx="${F(r() * 300)}" cy="${F(60 + r() * 330)}" r="${F(0.8 + r() * 1.6)}" fill="${P.glow}" opacity="${F(0.3 + r() * 0.5)}" filter="url(#glowS)"/>`;
    s += wrap(`<path d="${ridge(r, 350, 10, 26)}"/>`, `fill="#020509"`);
    return s;
  },
  ocean(r, P, lv) {
    let s = '';
    s += `<circle cx="${F(80 + r() * 140)}" cy="70" r="26" fill="#dfeffa" opacity=".75" filter="url(#glowS)"/>`;
    s += clouds(r, 40, '#0b1a28', 0.8, 8, 30);
    if (r() < 0.6) {
      let x = 40 + r() * 220, y = 0; const pts = [[x, y]];
      while (y < 200) { x += (r() - 0.5) * 30; y += 20 + r() * 20; pts.push([x, y]); }
      s += `<path d="${polyD(pts, false)}" stroke="#e8f7ff" stroke-width="1.6" fill="none" filter="url(#glowS)" opacity=".8"/>`;
    }
    s += `<rect x="0" y="292" width="300" height="140" fill="#02070c"/>`;
    for (let i = 0; i < 5; i++) {
      const y = 290 + i * 26;
      s += `<path d="${ridge(r, y, 6 + i * 2, 18 - i)}" fill="${i % 2 ? '#03101a' : '#041622'}"/>`;
    }
    s += `<rect x="0" y="292" width="300" height="2" fill="${P.rim}" opacity=".25"/>`;
    return s;
  },
  heaven(r, P, lv) {
    let s = '';
    s += `<circle cx="150" cy="150" r="${120 + lv * 10}" fill="#fff7dc" opacity=".55" filter="url(#soft)"/>`;
    s += rays(150, 150, 22 + lv * 4, 360, '#fff1c4', 0.3, r);
    for (let i = 0; i < 2; i++) {
      const x = i ? 262 : 38;
      s += `<path d="M${x - 9} 300V140h-4v-8h26v8h-4V300z" fill="#b39a6a" opacity=".35"/>`;
    }
    s += clouds(r, 300, '#f7ecd2', 0.85, 10, 30);
    s += clouds(r, 345, '#d9c69c', 0.9, 9, 26);
    return s;
  },
  forest(r, P, lv) {
    let s = '';
    s += `<circle cx="${F(100 + r() * 100)}" cy="${F(80 + r() * 30)}" r="34" fill="${P.light}" opacity=".85" filter="url(#glowS)"/>`;
    s += pineRow(r, 300, '#21331f', 0.6, 14, 80, 160);
    s += fogBand(250, 70, '#7f9a6a', 0.18);
    s += pineRow(r, 330, '#101c12', 0.85, 10, 120, 220);
    s += fogBand(300, 60, '#5d7a4d', 0.2);
    for (let i = 0; i < 2; i++) s += deadTree(i ? 280 : 18, 430, 260, r, '#050806');
    s += wrap(`<path d="${ridge(r, 352, 8, 30)}"/>`, `fill="#040604"`);
    return s;
  },
  crypt(r, P, lv) {
    let s = '';
    const mx = 70 + r() * 160;
    s += `<circle cx="${F(mx)}" cy="92" r="44" fill="#ebe4ff" opacity=".9" filter="url(#glowS)"/>`;
    s += `<circle cx="${F(mx + 12)}" cy="84" r="9" fill="#cfc4ee" opacity=".5"/><circle cx="${F(mx - 14)}" cy="104" r="6" fill="#cfc4ee" opacity=".4"/>`;
    s += clouds(r, 150, '#1d1530', 0.45, 7, 18);
    s += wrap(`<path d="${ridge(r, 300, 18, 40)}"/>`, `fill="#120d1d"`);
    s += tombstones(r, 300, '#0d0915');
    s += deadTree(r() < 0.5 ? 30 : 270, 330, 200, r, '#07050b');
    s += fogBand(320, 60, '#a898d8', 0.16);
    s += wrap(`<path d="${ridge(r, 350, 6, 30)}"/>`, `fill="#050308"`);
    return s;
  },
  volcano(r, P, lv) {
    let s = '';
    s += `<path d="${polyD([[20, 330], [120, 150], [140, 158], [160, 146], [180, 152], [280, 330]])}" fill="#2a120a"/>`;
    s += `<ellipse cx="150" cy="148" rx="34" ry="12" fill="${P.glow}" opacity=".8" filter="url(#glowS)"/>`;
    for (let i = 0; i < 4; i++) {
      const x0 = 132 + i * 12;
      s += `<path d="${polyD(spline([[x0, 156], [x0 + (r() - 0.5) * 40, 220], [x0 + (r() - 0.5) * 80, 320]]), false)}" stroke="${P.glow}" stroke-width="2" fill="none" opacity=".75" filter="url(#glowS)"/>`;
    }
    s += `<ellipse cx="150" cy="90" rx="90" ry="50" fill="#3a1f18" opacity=".7" filter="url(#soft)"/>`;
    s += wrap(`<path d="${ridge(r, 300, 26, 26, -10, 310, 430, true)}"/>`, `fill="#120806"`);
    s += wrap(`<path d="${ridge(r, 345, 8, 30)}"/>`, `fill="#070403"`);
    return s;
  },
  cosmos(r, P, lv) {
    let s = '';
    const cols = [P.glow, '#5a3aa8', '#2a7fa8', P.light];
    for (let i = 0; i < 6; i++) s += `<ellipse cx="${F(r() * 300)}" cy="${F(r() * 420)}" rx="${F(60 + r() * 90)}" ry="${F(30 + r() * 60)}" fill="${r.pick(cols)}" opacity="${F(0.12 + r() * 0.18)}" filter="url(#soft)" transform="rotate(${F(r() * 180)} 150 210)"/>`;
    s += particlesSvg('star', r, 90, P);
    const px = r() < 0.5 ? 60 : 240, py = 70 + r() * 60;
    s += `<circle cx="${F(px)}" cy="${F(py)}" r="22" fill="#0b0a14"/><circle cx="${F(px)}" cy="${F(py)}" r="22" fill="none" stroke="${P.light}" stroke-width="1" opacity=".5"/>`;
    s += `<ellipse cx="${F(px)}" cy="${F(py)}" rx="40" ry="8" fill="none" stroke="${P.rim}" stroke-width="1.4" opacity=".55" transform="rotate(-18 ${F(px)} ${F(py)})"/>`;
    return s;
  },
  void(r, P, lv) {
    let s = '';
    s += `<circle cx="150" cy="190" r="150" fill="${P.glow}" opacity=".12" filter="url(#soft)"/>`;
    for (let i = 0; i < 4; i++) s += `<circle cx="150" cy="190" r="${60 + i * 34}" fill="none" stroke="${P.rim}" stroke-width=".7" stroke-dasharray="${2 + i} ${4 + i * 2}" opacity="${F(0.35 - i * 0.06)}"/>`;
    s += `<path d="${polyD(star(150, 190, 150, 60, 7))}" fill="none" stroke="${P.rim}" stroke-width=".5" opacity=".18"/>`;
    s += particlesSvg('star', r, 40, P);
    return s;
  },
  forge(r, P, lv) {
    let s = '';
    for (let i = 0; i < 5; i++) {
      const x = r() * 300, y = 40 + r() * 300, rr = 30 + r() * 60;
      s += `<path d="${gearD(x, y, rr, 10 + Math.floor(rr / 8), 7)}" fill="#0d1a20" opacity=".9"/><circle cx="${F(x)}" cy="${F(y)}" r="${F(rr * 0.35)}" fill="#08090d"/>`;
    }
    s += `<path d="M0 120H300M0 128H300" stroke="#1d3640" stroke-width="5"/>`;
    for (let i = 0; i < 3; i++) {
      const y = 90 + r() * 240;
      s += `<path d="M0 ${F(y)}H${F(40 + r() * 80)}V${F(y + 30)}H${F(140 + r() * 60)}" stroke="${P.glow}" stroke-width="1.2" fill="none" opacity=".55" filter="url(#glowS)"/>`;
    }
    s += fogBand(290, 80, '#9fd8e8', 0.12);
    s += `<rect x="0" y="340" width="300" height="90" fill="#06090b"/><path d="M0 340H300" stroke="${P.rim}" stroke-width="1" opacity=".35"/>`;
    for (let i = 0; i < 8; i++) s += `<path d="M${i * 40} 340l20 90" stroke="#0d1418" stroke-width="2"/>`;
    return s;
  },
  ruins(r, P, lv) {
    let s = '';
    s += `<circle cx="150" cy="170" r="110" fill="${P.light}" opacity=".3" filter="url(#soft)"/>`;
    s += arches(r, '#0d0b12', 0.95);
    s += fogBand(300, 70, P.rim, 0.12);
    s += wrap(`<path d="${ridge(r, 344, 8, 24)}"/>`, `fill="#050407"`);
    for (let i = 0; i < 6; i++) { const x = r() * 300; s += `<rect x="${F(x)}" y="${F(334 + r() * 10)}" width="${F(8 + r() * 14)}" height="8" fill="#0a090d" transform="rotate(${F((r() - 0.5) * 40)} ${F(x)} 340)"/>`; }
    return s;
  },
  temple(r, P, lv) {
    let s = '';
    s += `<circle cx="150" cy="150" r="70" fill="${P.light}" opacity=".9" filter="url(#glowS)"/>`;
    s += `<circle cx="150" cy="150" r="120" fill="${P.light}" opacity=".25" filter="url(#soft)"/>`;
    s += `<path d="${polyD([[-10, 320], [70, 210], [150, 320]])}" fill="#3a2410" opacity=".55"/><path d="${polyD([[160, 320], [250, 190], [330, 320]])}" fill="#2c1a0c" opacity=".7"/>`;
    for (let i = 0; i < 6; i++) { const x = 10 + i * 56; s += `<rect x="${x}" y="230" width="14" height="110" fill="#1c1208"/><rect x="${x - 4}" y="224" width="22" height="8" fill="#1c1208"/>`; }
    s += `<rect x="-5" y="216" width="310" height="10" fill="#1c1208"/>`;
    s += wrap(`<path d="${ridge(r, 338, 10, 50)}"/>`, `fill="#120b05"`);
    return s;
  },
  ice(r, P, lv) {
    let s = '';
    s += `<circle cx="150" cy="120" r="140" fill="#bfe8ff" opacity=".18" filter="url(#soft)"/>`;
    for (let i = 0; i < 3; i++) s += `<path d="M-10 ${60 + i * 26} Q80 ${20 + i * 30} 150 ${70 + i * 20} T310 ${50 + i * 26}" stroke="${i % 2 ? '#7affc8' : '#9fd8ff'}" stroke-width="${10 - i * 2}" fill="none" opacity=".22" filter="url(#soft)"/>`;
    s += wrap(`<path d="${ridge(r, 250, 40, 26, -10, 310, 430, true)}"/>`, `fill="#2a4256" opacity=".7"`);
    s += wrap(`<path d="${ridge(r, 300, 24, 32, -10, 310, 430, true)}"/>`, `fill="#142230"`);
    s += wrap(`<path d="${ridge(r, 348, 6, 30)}"/>`, `fill="#c8dceb" opacity=".25"`);
    s += wrap(`<path d="${ridge(r, 354, 6, 30)}"/>`, `fill="#08111a"`);
    return s;
  },
  swamp(r, P, lv) {
    let s = '';
    s += `<ellipse cx="150" cy="260" rx="200" ry="90" fill="${P.light}" opacity=".2" filter="url(#soft)"/>`;
    for (let i = 0; i < 4; i++) s += deadTree(20 + r() * 260, 310, 120 + r() * 120, r, '#0b120c', 0.7);
    s += `<rect x="0" y="310" width="300" height="120" fill="#060b08"/>`;
    for (let i = 0; i < 6; i++) s += `<path d="M${F(r() * 300)} ${F(320 + r() * 90)}h${F(20 + r() * 40)}" stroke="${P.rim}" stroke-width=".8" opacity=".25"/>`;
    for (let i = 0; i < 6; i++) s += `<circle cx="${F(r() * 300)}" cy="${F(200 + r() * 120)}" r="2.4" fill="${P.glow}" filter="url(#glowS)" opacity=".8"/>`;
    s += fogBand(290, 50, '#8fb08a', 0.2);
    return s;
  },
  sky(r, P, lv) {
    let s = '';
    s += `<circle cx="150" cy="150" r="130" fill="${P.light}" opacity=".35" filter="url(#soft)"/>`;
    s += rays(150, 150, 14, 330, P.light, 0.18, r);
    s += clouds(r, 70, '#1b1d26', 0.5, 6, 26);
    s += clouds(r, 310, '#1a1c25', 0.9, 10, 30);
    s += clouds(r, 350, '#0c0d12', 0.95, 9, 26);
    return s;
  },
  mountain(r, P, lv) {
    let s = '';
    s += `<circle cx="150" cy="120" r="140" fill="${P.light}" opacity=".3" filter="url(#soft)"/>`;
    s += wrap(`<path d="${ridge(r, 280, 50, 40, -10, 310, 430, true)}"/>`, `fill="#3a2c22" opacity=".55"`);
    s += wrap(`<path d="${ridge(r, 330, 34, 34, -10, 310, 430, true)}"/>`, `fill="#1a120c"`);
    s += clouds(r, 360, '#b8a890', 0.35, 10, 24);
    return s;
  },
  gold(r, P, lv) {
    // Fond « gravure » des cartes secrètes.
    let s = '';
    s += `<circle cx="150" cy="190" r="140" fill="#c8a45d" opacity=".08" filter="url(#soft)"/>`;
    for (let i = 0; i < 3; i++) s += `<circle cx="150" cy="190" r="${80 + i * 40}" fill="none" stroke="#c8a45d" stroke-width="${i === 1 ? 1.2 : 0.6}" opacity="${0.5 - i * 0.1}"/>`;
    s += `<path d="${polyD(star(150, 190, 158, 70, 8))}" fill="none" stroke="#c8a45d" stroke-width=".6" opacity=".35"/>`;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      s += `<path d="M${F(150 + Math.cos(a) * 124)} ${F(190 + Math.sin(a) * 124)}L${F(150 + Math.cos(a) * 134)} ${F(190 + Math.sin(a) * 134)}" stroke="#e6cf8f" stroke-width=".8" opacity=".6"/>`;
    }
    s += particlesSvg('star', r, 50, { rim: '#e6cf8f' });
    return s;
  },
};

export const SCENE_NAMES = Object.keys(SCENES);

export function sceneSvg(name, r, P, lv) {
  const fn = SCENES[name] || SCENES.ruins;
  return fn(r, P, lv);
}
