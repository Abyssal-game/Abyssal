// Silhouettes des créatures. Chaque forme dessine dans un repère 300 × 420,
// centrée vers (150, 210), sol vers y = 335. Les formes sont paramétrées par
// la fiche « art » de chaque carte (tête, cornes, ailes, queue…).
import { F, polyD, smoothD, tube, mirror, mx, ring, star, along, spline, gearD } from './geometry.js';

// Collecteur de calques ------------------------------------------------------
export class Builder {
  constructor(r, P) {
    this.r = r; this.P = P;
    this.backGlow = []; // halos, auras derrière la silhouette
    this.back = [];     // plans arrière (aile lointaine…)
    this.sil = [];      // silhouette principale
    this.det = [];      // détails gravés (lignes claires)
    this.lit = [];      // éléments clairs : os, crocs, lames, or
    this.glow = [];     // yeux, runes, flammes
  }
  S(d) { this.sil.push(d); return this; }
  eye(x, y, rad = 2.2, col) {
    const c = col || this.P.eye;
    this.glow.push(`<circle cx="${F(x)}" cy="${F(y)}" r="${F(rad * 2.4)}" fill="${c}" opacity=".45"/><circle cx="${F(x)}" cy="${F(y)}" r="${F(rad)}" fill="${c}"/><circle cx="${F(x)}" cy="${F(y)}" r="${F(rad * 0.45)}" fill="#fff"/>`);
  }
  line(d, w = 1, op = 0.35, col) {
    this.det.push(`<path d="${d}" fill="none" stroke="${col || this.P.rim}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`);
  }
}

const BONE = '#e8e1d4';
const STEEL = '#9aa6b8';

// Membres et accessoires -----------------------------------------------------
function claws(b, x, y, ang, len = 9, n = 3, w = 2.6) {
  for (let i = 0; i < n; i++) {
    const a = ang + (i - (n - 1) / 2) * 0.32;
    const p1 = [x + Math.cos(a) * len * 0.6, y + Math.sin(a) * len * 0.6];
    const p2 = [x + Math.cos(a + 0.25) * len, y + Math.sin(a + 0.25) * len];
    b.S(tube([[x, y], p1, p2], w, 0));
  }
}

function hornPair(b, type, hx, hy, r, scale = 1, cx = 150) {
  for (const m of [1, -1]) {
    const X = (x) => mx(m, x, cx);
    const s = scale;
    const ox = hx - cx; // décalage horizontal de l'ancrage
    if (type === 'ram') {
      const c = [cx + ox + 14 * s, hy + 2 * s];
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const a = -2.2 + i * 0.42;
        const rad = (17 - i * 0.85) * s;
        pts.push([c[0] + Math.cos(a) * rad, c[1] + Math.sin(a) * rad]);
      }
      b.S(tube(pts.map(([x, y]) => [X(x), y]), 9 * s, 2 * s));
      for (let k = 2; k < 13; k += 2) b.line(`M${F(X(pts[k][0]))} ${F(pts[k][1])}l${F(m * 2)} 3`, 0.8, 0.3);
    } else if (type === 'long') {
      b.S(tube([[X(cx + ox), hy], [X(cx + ox + 10 * s), hy - 26 * s], [X(cx + ox + 26 * s), hy - 48 * s], [X(cx + ox + 34 * s), hy - 70 * s]], 8 * s, 0));
    } else if (type === 'curl') {
      b.S(tube([[X(cx + ox), hy], [X(cx + ox + 8 * s), hy - 22 * s], [X(cx + ox + 26 * s), hy - 30 * s], [X(cx + ox + 34 * s), hy - 18 * s], [X(cx + ox + 30 * s), hy - 6 * s]], 7 * s, 1));
    } else if (type === 'back') {
      b.S(tube([[X(cx + ox), hy], [X(cx + ox + 16 * s), hy - 10 * s], [X(cx + ox + 36 * s), hy - 4 * s], [X(cx + ox + 50 * s), hy + 8 * s]], 7 * s, 0));
    } else if (type === 'antler' || type === 'inverted') {
      const dir = type === 'inverted' ? 1 : -1;
      const base = [X(cx + ox), hy];
      const p1 = [X(cx + ox + 14 * s), hy + dir * 26 * s], p2 = [X(cx + ox + 34 * s), hy + dir * 46 * s], p3 = [X(cx + ox + 40 * s), hy + dir * 76 * s];
      b.S(tube([base, p1, p2, p3], 5 * s, 1));
      const tines = [[p1, 0.8, 22], [p2, 1.1, 26], [p2, 0.1, 22], [[X(cx + ox + 38 * s), hy + dir * 62 * s], 1.5, 18]];
      tines.forEach(([p, a, l]) => {
        const ang = dir < 0 ? -Math.PI / 2 - m * (a - 0.6) : Math.PI / 2 + m * (a - 0.6);
        b.S(tube([p, [p[0] + Math.cos(ang) * l * s * 0.6 + m * 4, p[1] + Math.sin(ang) * l * s * 0.6], [p[0] + Math.cos(ang) * l * s + m * 6, p[1] + Math.sin(ang) * l * s]], 3.4 * s, 0.4));
      });
    } else if (type === 'bull') {
      b.S(tube([[X(cx + ox), hy + 4], [X(cx + ox + 22 * s), hy - 2 * s], [X(cx + ox + 34 * s), hy - 18 * s], [X(cx + ox + 30 * s), hy - 32 * s]], 8 * s, 0));
    } else if (type === 'short') {
      b.S(tube([[X(cx + ox), hy], [X(cx + ox + 4 * s), hy - 10 * s], [X(cx + ox + 10 * s), hy - 18 * s]], 6 * s, 0));
    }
  }
  if (type === 'many') {
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.36 + (r() - 0.5) * 0.1;
      const l = (30 + r() * 40 + (4 - Math.abs(i - 4)) * 8) * scale;
      const bx = cx + Math.cos(a) * 12 * scale, by = hy + Math.sin(a) * 10 * scale;
      const bend = (i - 4) * 0.08;
      b.S(tube([[bx, by], [bx + Math.cos(a + bend) * l * 0.5, by + Math.sin(a + bend) * l * 0.5], [bx + Math.cos(a + bend * 3) * l, by + Math.sin(a + bend * 3) * l]], 6 * scale, 0));
    }
  } else if (type === 'crown') {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const x = cx - 18 * scale + i * 3.6 * scale;
      pts.push([x, hy - (i % 2 ? 6 : 20 + (i === 5 ? 10 : 0)) * scale]);
    }
    b.S(polyD([[cx - 18 * scale, hy + 2], ...pts, [cx + 18 * scale, hy + 2]]));
    b.glow.push(`<circle cx="${cx}" cy="${F(hy - 26 * scale)}" r="2" fill="${b.P.glow}"/>`);
  } else if (type === 'thorns') {
    for (let i = 0; i < 11; i++) {
      const a = -Math.PI / 2 + (i - 5) * 0.28;
      const l = (16 + r() * 22) * scale;
      const bx = cx + Math.cos(a) * 14 * scale, by = hy + Math.sin(a) * 12 * scale;
      b.S(tube([[bx, by], [bx + Math.cos(a + 0.3) * l * 0.6, by + Math.sin(a + 0.3) * l * 0.6], [bx + Math.cos(a - 0.2) * l, by + Math.sin(a - 0.2) * l]], 3 * scale, 0));
    }
  }
}

function wingPair(b, type, ax, ay, span, lift, r, cx = 150) {
  const s = span;
  for (const m of [1, -1]) {
    const X = (x) => mx(m, x, cx);
    if (type === 'bat' || type === 'tatter') {
      const A = [ax, ay];
      const W = [ax + 56 * s, ay - 66 * s * lift];
      const T = [[ax + 122 * s, ay - 100 * s * lift], [ax + 138 * s, ay - 26 * s * lift], [ax + 120 * s, ay + 36 * s], [ax + 80 * s, ay + 70 * s]];
      const B = [ax + 6, ay + 64 * s];
      let d = `M${F(X(A[0]))} ${F(A[1])}L${F(X(W[0]))} ${F(W[1])}L${F(X(T[0][0]))} ${F(T[0][1])}`;
      const pts = [...T, B];
      for (let i = 0; i < pts.length - 1; i++) {
        const p = pts[i], q = pts[i + 1];
        const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        const c = [mid[0] + (W[0] - mid[0]) * 0.32, mid[1] + (W[1] - mid[1]) * 0.32];
        if (type === 'tatter') {
          const j1 = [p[0] + (c[0] - p[0]) * 0.5 + (r() - 0.5) * 10, p[1] + (c[1] - p[1]) * 0.5 + (r() - 0.5) * 10];
          const j2 = [c[0] + (q[0] - c[0]) * 0.4, c[1] + (q[1] - c[1]) * 0.4];
          d += `L${F(X(j1[0]))} ${F(j1[1])}L${F(X(c[0] + (r() - 0.5) * 12))} ${F(c[1] + (r() - 0.5) * 12)}L${F(X(j2[0]))} ${F(j2[1])}L${F(X(q[0]))} ${F(q[1])}`;
        } else d += `Q${F(X(c[0]))} ${F(c[1])} ${F(X(q[0]))} ${F(q[1])}`;
      }
      d += 'Z';
      b.S(d);
      b.S(tube([[X(A[0]), A[1]], [X((A[0] + W[0]) / 2), (A[1] + W[1]) / 2 - 6], [X(W[0]), W[1]]], 9 * s, 5 * s));
      T.forEach((t) => {
        b.S(tube([[X(W[0]), W[1]], [X(t[0]), t[1]]], 3.4 * s, 1));
        b.line(polyD([[X(W[0]), W[1]], [X(t[0]), t[1]]], false), 0.9, 0.35);
      });
      b.S(tube([[X(W[0]), W[1]], [X(W[0] + 4 * s), W[1] - 12 * s]], 4, 0));
    } else if (type === 'feather' || type === 'gold') {
      const top = [[ax, ay], [ax + 40 * s, ay - 64 * s * lift], [ax + 104 * s, ay - 88 * s * lift], [ax + 148 * s, ay - 52 * s * lift]];
      const pts = along(top, 16);
      const rows = [[1, 1], [0.62, 0.9], [0.34, 0.8]];
      rows.forEach(([lk, wk], ri) => {
        pts.forEach((p, i) => {
          const t = p.t;
          const len = (26 + 86 * t) * lk * s;
          const ang = Math.PI / 2 - t * 1.05 - ri * 0.05;
          const x0 = p.x, y0 = p.y;
          const tip = [x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len];
          const mid = [x0 + Math.cos(ang + 0.08) * len * 0.5, y0 + Math.sin(ang + 0.08) * len * 0.5];
          const w = (8 + 6 * t) * wk * s;
          const d = tube([[X(x0), y0], [X(mid[0]), mid[1]], [X(tip[0]), tip[1]]], 0, 0, (u) => w * Math.sin(Math.PI * Math.min(1, u * 1.1)) + 1);
          if (type === 'gold') b.lit.push(`<path d="${d}" fill="url(#goldG)" stroke="#5a4320" stroke-width=".5"/>`);
          else b.S(d);
          if (ri === 0 && i % 2 === 0) b.line(polyD([[X(x0), y0], [X(tip[0]), tip[1]]], false), 0.6, 0.3);
        });
      });
      b.S(tube(top.map(([x, y]) => [X(x), y]), 10 * s, 4 * s));
    } else if (type === 'bone') {
      const A = [ax, ay], W = [ax + 54 * s, ay - 62 * s * lift];
      const T = [[ax + 118 * s, ay - 96 * s * lift], [ax + 134 * s, ay - 20 * s * lift], [ax + 110 * s, ay + 40 * s]];
      b.back.push(`<path d="${polyD([[X(A[0]), A[1]], [X(W[0]), W[1]], ...T.map(([x, y]) => [X(x + (r() - 0.5) * 10), y]), [X(ax + 10), ay + 60]])}" fill="${b.P.rim}" opacity=".12"/>`);
      b.lit.push(`<path d="${tube([[X(A[0]), A[1]], [X(W[0]), W[1]]], 6 * s, 4 * s)}" fill="url(#boneG)"/>`);
      T.forEach((t) => b.lit.push(`<path d="${tube([[X(W[0]), W[1]], [X((W[0] + t[0]) / 2), (W[1] + t[1]) / 2 - 4], [X(t[0]), t[1]]], 3 * s, 1)}" fill="url(#boneG)"/>`));
      b.lit.push(`<circle cx="${F(X(W[0]))}" cy="${F(W[1])}" r="${F(4 * s)}" fill="${BONE}"/>`);
    } else if (type === 'flame') {
      for (let i = 0; i < 7; i++) {
        const a = -0.2 - i * 0.22 * lift;
        const l = (70 + i * 10 + r() * 20) * s;
        const p0 = [ax, ay + i * 3];
        const p1 = [ax + Math.cos(a) * l * 0.5, ay + Math.sin(a) * l * 0.5 + (r() - 0.5) * 12];
        const p2 = [ax + Math.cos(a - 0.2) * l, ay + Math.sin(a - 0.2) * l];
        b.glow.push(`<path d="${tube([[X(p0[0]), p0[1]], [X(p1[0]), p1[1]], [X(p2[0]), p2[1]]], 14 * s, 0)}" fill="url(#flameG)" opacity=".85"/>`);
      }
    } else if (type === 'insect') {
      [[-0.55, 120], [-0.15, 96]].forEach(([a, l]) => {
        const c = [ax + Math.cos(a) * l * s * 0.5, ay + Math.sin(a) * l * s * 0.5];
        b.back.push(`<ellipse cx="${F(X(c[0]))}" cy="${F(c[1])}" rx="${F(l * s * 0.55)}" ry="${F(16 * s)}" transform="rotate(${F((m > 0 ? a : Math.PI - a) * 57.3)} ${F(X(c[0]))} ${F(c[1])})" fill="${b.P.rim}" opacity=".18" stroke="${b.P.rim}" stroke-width=".8"/>`);
        b.line(polyD([[X(ax), ay], [X(ax + Math.cos(a) * l * s), ay + Math.sin(a) * l * s]], false), 0.7, 0.4);
      });
    }
  }
}

// Formes ---------------------------------------------------------------------
function hum(b, o, r) {
  const bulk = o.body === 'bulky' ? 12 : o.body === 'lean' ? -5 : 0;
  const hy = 100;
  const P = b.P;
  if (o.halo) {
    const hc = o.halo === 'spike' ? P.glow : P.light;
    if (o.halo === 'spike') b.backGlow.push(`<path d="${polyD(star(150, hy - 4, 40, 24, 16))}" fill="none" stroke="${hc}" stroke-width="2"/>`);
    b.backGlow.push(`<circle cx="150" cy="${hy - 4}" r="30" fill="none" stroke="${hc}" stroke-width="3"/><circle cx="150" cy="${hy - 4}" r="36" fill="none" stroke="${hc}" stroke-width=".8" opacity=".6"/>`);
  }
  if (o.wings) {
    const sp = o.wings === 'six' ? 0.8 : 1;
    if (o.wings === 'six') {
      wingPair(b, 'feather', 166, 128, 0.75, 1.5, r);
      wingPair(b, 'feather', 168, 140, 0.95, 0.9, r);
      wingPair(b, 'feather', 166, 190, 0.7, -0.7, r);
    } else wingPair(b, o.wings, 168, 136, sp * (o.span || 1), o.lift || 1, r);
  }
  if (o.body === 'cloak') {
    b.S(polyD(mirror([[150, 116], [180, 124], [204, 140], [214, 190], [226, 250], [238, 300], [250, 340], [236, 334], [228, 344], [214, 334], [198, 346], [182, 336], [166, 344], [150, 338]])));
  }
  if (o.tail) {
    b.S(tube([[156, 206], [196, 236], [226, 282], [214, 316], [238, 330]], 10, 2));
    b.S(polyD([[238, 322], [252, 332], [236, 340], [240, 331]]));
  }
  // bas du corps
  if (o.body === 'robe' || o.body === 'cloak' || o.body === 'gown' || o.body === 'tatter') {
    const fl = o.body === 'gown' ? 34 : 0;
    const hem = [];
    for (let i = 0; i <= 6; i++) {
      const x = 214 + fl - i * ((64 + fl) / 6);
      const y = 338 + (o.body === 'tatter' ? (i % 2 ? -16 - r() * 10 : 4) : i % 2 ? -4 : 2);
      hem.push([x, y]);
    }
    b.S(polyD(mirror([[150, 196], [174, 198], [180, 228], [190, 270], [200 + fl * 0.5, 306], ...hem, [150, 340]])));
    b.line(`M150 214Q156 280 150 336M166 212Q178 276 188 334M134 212Q122 276 112 334`, 0.8, 0.22);
  } else {
    const goat = o.legs === 'goat';
    for (const m of [1, -1]) {
      const X = (x) => mx(m, x);
      const pts = goat ? [[X(162), 202], [X(178), 248], [X(166), 282], [X(176), 322]] : [[X(162), 204], [X(170), 262], [X(170), 320]];
      b.S(tube(pts, 20 + bulk * 0.6, 10));
      if (goat) b.S(polyD([[X(168), 316], [X(186), 318], [X(186), 332], [X(166), 332]]));
      else b.S(polyD([[X(162), 318], [X(186), 322], [X(190), 332], [X(160), 332]]));
      if (o.body === 'armor') b.lit.push(`<path d="${tube([[X(166), 256], [X(171), 266]], 16, 14)}" fill="url(#steelG)" opacity=".8"/>`);
    }
    b.S(polyD(mirror([[150, 196], [174, 198], [178, 222], [166, 236], [150, 232]])));
  }
  // torse
  const torso = [[150, 120], [160, 122], [178, 127], [190 + bulk, 133], [197 + bulk, 145], [193 + bulk, 160], [182 + bulk * 0.5, 172], [178 + bulk * 0.4, 196], [170, 208], [150, 210]];
  b.S(smoothD(mirror(torso)));
  if (o.body === 'armor') {
    b.lit.push(`<path d="${smoothD(mirror([[150, 126], [178, 130], [192 + bulk, 138], [186 + bulk, 158], [176, 176], [150, 184]]))}" fill="url(#steelG)" opacity=".75"/>`);
    for (const m of [1, -1]) b.lit.push(`<path d="${smoothD([[mx(m, 176), 124], [mx(m, 206 + bulk), 128], [mx(m, 212 + bulk), 148], [mx(m, 196 + bulk), 150]])}" fill="url(#steelG)"/>`);
    b.line(`M150 130V182M136 150H164M138 166H162`, 0.8, 0.4, '#1a1c24');
  } else if (o.body !== 'robe' && o.body !== 'gown') {
    b.line(`M150 140V200M136 146Q143 156 150 152Q157 156 164 146M140 172H160M141 186H159`, 0.9, 0.28);
  }
  // bras
  const sx = 186 + bulk, sy = 138;
  const pose = o.arms || 'down';
  for (const m of [1, -1]) {
    const X = (x) => mx(m, x);
    let e, h;
    const ps = pose === 'staff' && m === -1 ? 'down' : pose === 'sword' && m === -1 ? 'down' : pose;
    if (ps === 'spread') { e = [222 + bulk, 150]; h = [254 + bulk, 136]; }
    else if (ps === 'up') { e = [216 + bulk, 108]; h = [226 + bulk, 70]; }
    else if (ps === 'pray') { e = [196 + bulk, 186]; h = [156, 164]; }
    else if (ps === 'reach') { e = [224 + bulk, 170]; h = [250 + bulk, 200]; }
    else if (ps === 'staff' || ps === 'sword' || ps === 'scythe') { e = [212 + bulk, 172]; h = [214 + bulk, 196]; }
    else { e = [204 + bulk, 178]; h = [210 + bulk, 218]; }
    b.S(tube([[X(sx), sy], [X(e[0]), e[1]], [X(h[0]), h[1]]], 16 + bulk * 0.4, 9));
    if (ps !== 'pray') {
      const ang = Math.atan2(h[1] - e[1], m * (h[0] - e[0]));
      claws(b, X(h[0]), h[1], ang, o.claws ? 14 : 8, 3, o.claws ? 3 : 2.6);
    }
    if (o.chains) {
      let cyy = h[1] + 6;
      let s = '';
      for (let k = 0; k < 10 && cyy < 336; k++) { s += `<ellipse cx="${F(X(h[0] + k * 1.5))}" cy="${F(cyy)}" rx="2.6" ry="4.2" fill="none" stroke="${STEEL}" stroke-width="1.4"/>`; cyy += 7; }
      b.lit.push(s);
    }
  }
  for (let k = 0; k < (o.multi || 0); k++) {
    for (const m of [1, -1]) {
      const a = -0.9 + k * (1.6 / Math.max(1, o.multi - 1)) + (r() - 0.5) * 0.2;
      const X = (x) => mx(m, x);
      const e = [196 + bulk + Math.cos(a) * 40, 150 + Math.sin(a) * 40];
      const h = [196 + bulk + Math.cos(a - 0.3) * 78, 150 + Math.sin(a - 0.3) * 78];
      b.S(tube([[X(180 + bulk), 146 + k * 6], [X(e[0]), e[1]], [X(h[0]), h[1]]], 12, 7));
      claws(b, X(h[0]), h[1], Math.atan2(h[1] - e[1], m * (h[0] - e[0])), 9, 3, 2.4);
    }
  }
  if (o.globe) {
    b.backGlow.push(`<circle cx="150" cy="22" r="64" fill="none" stroke="${P.light}" stroke-width="2"/><ellipse cx="150" cy="22" rx="64" ry="20" fill="none" stroke="${P.light}" stroke-width="1"/><path d="M150 -42V86" stroke="${P.light}" stroke-width="1"/>`);
    b.back.push(`<circle cx="150" cy="22" r="62" fill="#000" opacity=".55"/>`);
  }
  if (o.fire) b.glow.push(`<path d="${tube([[226 + bulk, 76], [228 + bulk, 50], [222 + bulk, 26]], 16, 0)}" fill="url(#flameG)"/><circle cx="${226 + bulk}" cy="66" r="6" fill="#fff4c0"/>`);
  if (pose === 'staff') {
    const x = 214 + bulk;
    b.S(tube([[x, 54], [x + 2, 200], [x + 4, 334]], 5, 4));
    b.glow.push(`<circle cx="${x}" cy="50" r="9" fill="${P.glow}"/><circle cx="${x}" cy="50" r="4" fill="#fff"/>`);
    b.S(polyD([[x - 10, 44], [x, 30], [x + 10, 44], [x + 4, 60], [x - 4, 60]]));
  } else if (pose === 'sword') {
    const x = 216 + bulk;
    b.lit.push(`<path d="${polyD([[x - 4, 204], [x + 4, 204], [x + 3, 320], [x, 334], [x - 3, 320]])}" fill="url(#steelG)"/><path d="M${x - 14} 200H${x + 14}" stroke="${STEEL}" stroke-width="4"/>`);
    b.glow.push(`<path d="M${x} 210V326" stroke="${P.glow}" stroke-width="1" opacity=".7"/>`);
  } else if (pose === 'scythe') {
    const x = 214 + bulk;
    b.S(tube([[x - 30, 330], [x, 200], [x + 20, 50]], 5, 4));
    b.lit.push(`<path d="M${x + 20} 52Q${x - 50} 20 ${x - 92} 84Q${x - 46} 42 ${x + 16} 64Z" fill="url(#steelG)"/>`);
  }
  // tête
  const head = o.head || 'face';
  const eyeY = hy + 1;
  let ey = 2.2, eyes = true;
  if (head === 'face' || head === 'skull' || head === 'crown' || head === 'mask') {
    const w = head === 'skull' ? 16 : 14;
    b.S(smoothD([[150, hy - 18], [150 + w - 2, hy - 13], [150 + w, hy - 2], [150 + w - 4, hy + 10], [150, hy + 20], [150 - w + 4, hy + 10], [150 - w, hy - 2], [150 - w + 2, hy - 13]]));
    if (head === 'skull') { ey = 3; b.line(`M144 ${hy + 12}h12M146 ${hy + 12}v4M150 ${hy + 12}v4M154 ${hy + 12}v4`, 0.8, 0.5, BONE); }
    if (head === 'mask') {
      b.lit.push(`<path d="${smoothD([[150, hy - 16], [162, hy - 10], [163, hy + 4], [150, hy + 18], [137, hy + 4], [138, hy - 10]])}" fill="url(#boneG)"/><path d="M143 ${hy + 9}q7 4 14 0" stroke="#3a2a20" stroke-width="1.2" fill="none"/>`);
    }
    if (head === 'crown') hornPair(b, 'crown', 150, hy - 14, r, 1);
  } else if (head === 'hood') {
    b.S(smoothD([[150, hy - 36], [166, hy - 16], [172, hy + 4], [180, hy + 26], [160, hy + 22], [150, hy + 28], [140, hy + 22], [120, hy + 26], [128, hy + 4], [134, hy - 16]]));
    b.det.push(`<ellipse cx="150" cy="${hy + 2}" rx="10" ry="13" fill="#000" opacity=".8"/>`);
  } else if (head === 'helm') {
    b.S(smoothD([[150, hy - 20], [164, hy - 14], [166, hy + 6], [160, hy + 20], [140, hy + 20], [134, hy + 6], [136, hy - 14]]));
    b.S(polyD([[148, hy - 44], [154, hy - 44], [156, hy - 16], [144, hy - 16]]));
    b.lit.push(`<path d="${smoothD([[150, hy - 19], [163, hy - 13], [165, hy + 5], [159, hy + 19], [141, hy + 19], [135, hy + 5], [137, hy - 13]])}" fill="url(#steelG)" opacity=".7"/>`);
    b.glow.push(`<path d="M139 ${hy + 1}h22" stroke="${P.eye}" stroke-width="2.4" stroke-linecap="round"/>`);
    eyes = false;
  } else if (head === 'goat') {
    b.S(smoothD([[150, hy - 18], [160, hy - 12], [178, hy - 6], [164, hy - 1], [161, hy + 12], [157, hy + 30], [150, hy + 34], [143, hy + 30], [139, hy + 12], [136, hy - 1], [122, hy - 6], [140, hy - 12]]));
  } else if (head === 'beast') {
    b.S(smoothD([[150, hy - 12], [162, hy - 14], [172, hy - 34], [175, hy - 8], [172, hy + 6], [160, hy + 16], [156, hy + 26], [150, hy + 28], [144, hy + 26], [140, hy + 16], [128, hy + 6], [125, hy - 8], [128, hy - 34], [138, hy - 14]]));
    b.lit.push(`<path d="M144 ${hy + 22}l2 7 2-6M156 ${hy + 22}l-2 7-2-6" fill="${BONE}"/>`);
  } else if (head === 'bird') {
    b.S(smoothD([[150, hy - 18], [163, hy - 10], [164, hy + 4], [156, hy + 12], [150, hy + 30], [144, hy + 12], [136, hy + 4], [137, hy - 10]]));
    for (let i = 0; i < 5; i++) b.S(tube([[150 + (i - 2) * 5, hy - 14], [150 + (i - 2) * 9, hy - 30 - (2 - Math.abs(i - 2)) * 6]], 4, 0));
  } else if (head === 'void' || head === 'none') {
    eyes = false;
    if (head === 'void') {
      b.glow.push(`<circle cx="150" cy="${hy}" r="14" fill="${P.glow}" opacity=".5"/><circle cx="150" cy="${hy}" r="7" fill="${P.eye}"/><circle cx="150" cy="${hy}" r="3" fill="#fff"/>`);
      b.backGlow.push(`<circle cx="150" cy="${hy}" r="22" fill="none" stroke="${P.glow}" stroke-width="1.5"/>`);
    } else {
      b.S(polyD([[140, 120], [160, 120], [158, 114], [142, 114]]));
      b.glow.push(`<path d="M146 116q4-8 8 0" stroke="${P.glow}" stroke-width="2" fill="none"/>`);
      if (pose !== 'staff' && pose !== 'sword') {
        const hx = 210 + bulk, hyy = 226;
        b.S(smoothD([[hx, hyy - 14], [hx + 11, hyy - 6], [hx + 10, hyy + 8], [hx, hyy + 14], [hx - 10, hyy + 8], [hx - 11, hyy - 6]]));
        b.eye(hx - 4, hyy, 1.8); b.eye(hx + 4, hyy, 1.8);
      }
    }
  }
  if (o.hair) {
    for (const m of [1, -1]) for (let i = 0; i < 4; i++) {
      b.S(tube([[mx(m, 156 + i * 2), hy - 10], [mx(m, 172 + i * 8), hy + 30 + i * 10], [mx(m, 168 + i * 12 + r() * 10), hy + 90 + i * 20]], 6, 0));
    }
  }
  if (o.horns) hornPair(b, o.horns, 160, hy - 10, r, o.hornScale || 1);
  if (eyes) {
    const n = o.eyes || 2;
    if (n === 1) b.eye(150, eyeY - 2, 4.2);
    else { b.eye(144.5, eyeY, ey); b.eye(155.5, eyeY, ey); }
    if (n >= 3) b.eye(150, hy - 9, 2);
    if (n > 3) for (let i = 0; i < n - 3; i++) b.eye(150 + (r() - 0.5) * 70, 130 + r() * 70, 1.4 + r() * 1.2);
  }
  if (o.core) b.glow.push(`<circle cx="150" cy="160" r="12" fill="${P.glow}" opacity=".55"/><circle cx="150" cy="160" r="5" fill="#fff"/>`);
  if (o.runes) for (let i = 0; i < 5; i++) b.glow.push(`<path d="M${F(140 + r() * 20)} ${F(140 + i * 12)}l${F((r() - 0.5) * 10)} 4l4 -3" stroke="${P.glow}" stroke-width="1" fill="none"/>`);
}

// Morphologies des quadrupèdes (vue de profil, tête à gauche).
const ARCH = {
  canine: {
    body: [[96, 200], [104, 170], [130, 158], [168, 168], [200, 164], [218, 176], [222, 202], [206, 224], [176, 228], [150, 226], [118, 236]],
    front: [[[118, 214], [114, 262], [118, 318]], [[136, 220], [142, 266], [136, 320]]],
    back: [[[198, 198], [216, 244], [200, 284], [210, 320]], [[184, 208], [196, 250], [182, 286], [190, 320]]],
    neck: [[120, 196], [102, 170], [88, 150]], head: [80, 146], tail: [214, 184], lw: [24, 10], hip: [196, 318],
  },
  feline: {
    body: [[88, 214], [96, 184], [126, 172], [170, 182], [206, 174], [228, 188], [232, 214], [216, 234], [180, 240], [140, 238], [110, 244]],
    front: [[[110, 228], [104, 272], [108, 320]], [[128, 232], [134, 274], [128, 322]]],
    back: [[[208, 210], [226, 250], [212, 286], [220, 320]], [[194, 218], [204, 254], [192, 288], [200, 322]]],
    neck: [[112, 206], [94, 188], [80, 176]], head: [72, 172], tail: [226, 196], lw: [28, 12], hip: [210, 320],
  },
  equine: {
    body: [[104, 192], [110, 166], [140, 156], [180, 160], [208, 158], [226, 172], [226, 198], [206, 214], [170, 216], [136, 214], [112, 210]],
    front: [[[118, 204], [114, 256], [118, 318]], [[134, 208], [140, 258], [136, 320]]],
    back: [[[206, 196], [220, 240], [208, 280], [214, 320]], [[192, 204], [200, 244], [190, 282], [196, 320]]],
    neck: [[118, 180], [104, 142], [94, 112]], head: [84, 104], tail: [224, 172], lw: [18, 8], hip: [210, 320],
  },
  heavy: {
    body: [[88, 214], [94, 172], [116, 146], [150, 148], [190, 158], [224, 174], [232, 206], [216, 242], [180, 252], [130, 252], [98, 242]],
    front: [[[112, 236], [108, 280], [112, 322]], [[132, 240], [138, 282], [132, 324]]],
    back: [[[206, 228], [216, 270], [210, 322]], [[190, 236], [196, 276], [190, 324]]],
    neck: [[108, 204], [92, 200], [76, 202]], head: [68, 202], tail: [228, 190], lw: [34, 16], hip: [204, 322],
  },
  reptile: {
    body: [[76, 244], [94, 224], [140, 214], [190, 218], [224, 228], [228, 250], [200, 264], [140, 266], [96, 262]],
    front: [[[112, 248], [92, 268], [96, 306]], [[132, 254], [140, 282], [130, 310]]],
    back: [[[196, 244], [220, 266], [214, 306]], [[180, 252], [184, 282], [176, 310]]],
    neck: [[100, 238], [84, 232], [70, 228]], head: [64, 226], tail: [224, 238], lw: [24, 11], hip: [204, 310],
  },
};
const HEAD_ARCH = { dog: 'canine', fox: 'canine', wolf: 'canine', lion: 'feline', cat: 'feline', human: 'feline', bird: 'feline', horse: 'equine', stag: 'equine', goat: 'equine', bull: 'heavy', boar: 'heavy', bear: 'heavy', lizard: 'reptile' };
const POSES = { canine: ['stand', 'howl', 'prowl', 'stand'], feline: ['stand', 'prowl'], equine: ['stand', 'rear'], heavy: ['stand', 'charge'], reptile: ['stand'] };

function rot(p, c, a) {
  const dx = p[0] - c[0], dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)];
}

function beast(b, o, r) {
  const P = b.P;
  const type = o.head || 'dog';
  const A = ARCH[o.arch || HEAD_ARCH[type] || 'canine'];
  const archName = o.arch || HEAD_ARCH[type] || 'canine';
  const k = o.size === 'big' ? 1.1 : o.size === 'small' ? 0.86 : 1;
  let pose = o.pose;
  if (!pose) {
    const opts = POSES[archName];
    pose = o.wings && archName !== 'reptile' ? (r() < 0.6 ? 'rear' : 'stand') : opts[Math.floor(r() * opts.length)];
  }
  if (pose === 'rear' && archName === 'heavy') pose = 'charge';
  if (pose === 'sit') pose = 'prowl';
  // transformation de posture appliquée à tous les points
  let ang = 0, pivot = A.hip;
  if (pose === 'rear') ang = 0.36;
  if (pose === 'sit') { ang = 0.42; pivot = [A.hip[0] - 10, A.hip[1] - 20]; }
  const S = (p) => [150 + (p[0] - 150) * k, 318 + (p[1] - 318) * k];
  const T = (p) => {
    let q = p;
    if (pose === 'prowl' && p[0] < 170) q = [p[0], p[1] + (170 - p[0]) * 0.16];
    if (pose === 'charge' && p[0] < 150) q = [p[0] - 6, p[1] + (150 - p[0]) * 0.1];
    if (ang) q = rot(q, pivot, ang);
    return S(q);
  };
  const TT = (pts) => pts.map(T);
  const legW = A.lw;

  if (o.wings) wingPair(b, o.wings, 150 * 1, T([150, 170])[1] + 6, 0.85 * k, 1.15, r, T([150, 170])[0]);
  // queue
  const t0 = A.tail;
  const tail = o.tail || 'normal';
  if (tail === 'scorpion') {
    const pts = TT([[t0[0] - 6, t0[1]], [t0[0] + 24, t0[1] - 28], [t0[0] + 28, t0[1] - 72], [t0[0] + 6, t0[1] - 96], [t0[0] - 18, t0[1] - 90]]);
    b.S(tube(pts, 14, 6));
    along(pts, 7).forEach((p) => b.line(`M${F(p.x - 4)} ${F(p.y - 3)}l8 6`, 0.8, 0.35));
    const e = pts[pts.length - 1];
    b.S(polyD([[e[0] + 2, e[1] - 6], [e[0] - 18, e[1] + 6], [e[0] - 4, e[1] + 10]]));
    b.glow.push(`<circle cx="${F(e[0] - 16)}" cy="${F(e[1] + 6)}" r="2.5" fill="${P.glow}"/>`);
  } else if (tail === 'snake') {
    const pts = TT([[t0[0] - 6, t0[1] + 4], [t0[0] + 30, t0[1] + 10], [t0[0] + 46, t0[1] - 16], [t0[0] + 40, t0[1] - 46], [t0[0] + 24, t0[1] - 58]]);
    b.S(tube(pts, 11, 7));
    const e = pts[pts.length - 1];
    b.S(smoothD([[e[0] + 6, e[1] - 4], [e[0] - 10, e[1] - 8], [e[0] - 18, e[1]], [e[0] - 8, e[1] + 6], [e[0] + 6, e[1] + 6]]));
    b.eye(e[0] - 8, e[1] - 3, 1.5);
  } else if (tail === 'bushy') {
    b.S(tube(TT([[t0[0] - 6, t0[1] + 4], [t0[0] + 26, t0[1] + 18], [t0[0] + 42, t0[1] + 52], [t0[0] + 38, t0[1] + 90]]), 22, 5));
  } else if (tail === 'lion') {
    const pts = TT([[t0[0] - 6, t0[1] + 4], [t0[0] + 28, t0[1] + 26], [t0[0] + 38, t0[1] + 70], [t0[0] + 26, t0[1] + 98]]);
    b.S(tube(pts, 7, 3));
    const e = pts[pts.length - 1];
    b.S(smoothD(ring(e[0], e[1] + 4, 9, 7, 0.4, r)));
  } else if (tail === 'many') {
    for (let i = 0; i < 9; i++) {
      const a = -1.5 + i * 0.24;
      const s = T([t0[0] - 6, t0[1] + 4]);
      b.S(tube([s, [s[0] + Math.cos(a) * 46, s[1] + Math.sin(a) * 46], [s[0] + Math.cos(a - 0.25) * 96, s[1] + Math.sin(a - 0.25) * 96 - 10]], 16, 2));
      if (b.P.particle !== 'spark') b.glow.push(`<circle cx="${F(s[0] + Math.cos(a - 0.25) * 96)}" cy="${F(s[1] + Math.sin(a - 0.25) * 96 - 10)}" r="3" fill="#9fd0ff"/>`);
    }
  } else if (tail !== 'none') {
    b.S(tube(TT([[t0[0] - 6, t0[1] + 4], [t0[0] + 24, t0[1] + 14], [t0[0] + 38, t0[1] + 44], [t0[0] + 34, t0[1] + 76]]), 10, 2));
  }
  // pattes arrière (derrière le corps)
  const legs = o.legs || 4;
  const backLegs = pose === 'sit'
    ? [[[A.hip[0] - 10, A.hip[1] - 100], [A.hip[0] + 14, A.hip[1] - 50], [A.hip[0] - 30, A.hip[1] - 6], [A.hip[0] - 46, A.hip[1]]]]
    : A.back;
  backLegs.forEach((pts) => {
    const q = pose === 'sit' ? pts.map(S) : TT(pts);
    b.S(tube(q, legW[0] * k * 1.05, legW[1] * k));
    foot(b, q[q.length - 1], o.hooves, k);
  });
  // corps
  b.S(smoothD(TT(A.body)));
  const mid = TT([[124, 206], [150, 222], [196, 206]]);
  b.line(polyD(spline(mid, 6), false), 0.9, 0.25);
  if (o.spikes) for (let i = 0; i < 7; i++) {
    const x = 120 + i * 14;
    const p0 = T([x - 5, A.body[2][1] + 6]), p1 = T([x + 2, A.body[2][1] - 12 - (i % 2) * 6]), p2 = T([x + 6, A.body[2][1] + 6]);
    b.S(polyD([p0, p1, p2]));
  }
  // pattes avant
  let frontLegs = A.front;
  if (pose === 'rear') frontLegs = A.front.map((pts, i) => [pts[0], [pts[0][0] - 22, pts[0][1] + 14 + i * 6], [pts[0][0] - 30 - i * 6, pts[0][1] + 44 + i * 4]]);
  if (pose === 'sit') {
    const ch = T(A.front[0][0]), ch2 = T(A.front[1][0]);
    [[ch, [ch[0] - 4, 284], [ch[0] - 2, 320]], [ch2, [ch2[0] + 4, 286], [ch2[0] + 2, 322]]].forEach((q) => {
      b.S(tube(q.map(([x, y]) => [x, y]), legW[0] * k, legW[1] * k));
      foot(b, q[2], o.hooves, k);
    });
  } else {
    frontLegs.forEach((pts) => {
      const q = TT(pts);
      b.S(tube(q, legW[0] * k, legW[1] * k));
      foot(b, q[q.length - 1], o.hooves, k);
    });
  }
  if (legs >= 8) A.front.concat(A.back).forEach((pts) => {
    const q = TT(pts.map(([x, y]) => [x + 18, y + 2]));
    b.S(tube(q, legW[0] * k * 0.8, legW[1] * k * 0.8));
  });
  // cous et têtes
  const heads = o.heads || 1;
  for (let h = 0; h < heads; h++) {
    const off = heads === 1 ? 0 : h - (heads - 1) / 2;
    let neck = A.neck.map(([x, y], i) => [x - Math.abs(off) * 4 * i, y + off * 18 * i]);
    let hp = [A.head[0] - Math.abs(off) * 8, A.head[1] + off * 38];
    let hang = 0;
    if (pose === 'howl' && heads === 1) { neck = [A.neck[0], [A.neck[1][0] + 2, A.neck[1][1] - 12], [A.neck[2][0] + 8, A.neck[2][1] - 26]]; hp = [A.head[0] + 10, A.head[1] - 30]; hang = 0.7; }
    if (pose === 'prowl') hang = -0.2;
    if (pose === 'rear') hang = 0.15;
    if (pose === 'charge') hang = -0.35;
    const nq = TT(neck);
    nq.push(T([hp[0] + 10, hp[1] + 4]));
    b.S(tube(nq, (archName === 'equine' ? 26 : 38) * k, (archName === 'equine' ? 18 : 24) * k));
    if (o.mane) {
      const c = T([hp[0] + 14, hp[1] + 10]);
      const pts = [];
      for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; const rr = (i % 2 ? 24 : 38) * k; pts.push([c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr * 0.92]); }
      b.S(polyD(pts));
    }
    const hpos = T(hp);
    beastHead(b, type, hpos[0], hpos[1], r, { ...o, headScale: (o.headScale || 1.55) * k }, hang + ang);
  }
  if (o.goat) {
    const base = T([176, 176]);
    b.S(tube([base, [base[0] + 6, base[1] - 30], [base[0] + 2, base[1] - 52]], 18, 12));
    beastHead(b, 'goat', base[0] - 4, base[1] - 56, r, { headScale: 1.05 }, 0.1);
  }
  if (o.rider) {
    const c = T([160, 160]);
    const R_ = (pts) => pts.map(([x, y]) => [c[0] + x, c[1] + y]);
    b.S(smoothD(R_([[-12, 20], [10, 20], [14, -16], [10, -46], [0, -60], [-14, -58], [-18, -36], [-18, -6]])));
    b.S(smoothD(R_([[-2, -60], [8, -68], [8, -82], [-2, -90], [-12, -86], [-14, -72]])));
    b.S(tube(R_([[6, -44], [26, -20], [16, 4]]), 10, 6));
    b.S(tube(R_([[-12, -44], [-38, -26], [-50, -6]]), 10, 6));
    if (P.particle === 'bubble') b.line(polyD(R_([[-10, -40], [0, -20], [-10, 10]]), false), 1.2, 0.6, '#c0303a');
    b.eye(c[0], c[1] - 76, 1.8);
  }
  if (o.chains) {
    let s = '';
    for (let i = 0; i < 18; i++) s += `<ellipse cx="${F(60 + i * 10)}" cy="${F(312 + Math.sin(i / 2) * 6)}" rx="4.6" ry="2.6" fill="none" stroke="${STEEL}" stroke-width="1.4"/>`;
    b.lit.push(s);
  }
  if (o.mech) {
    const pts = TT([[120, 200], [146, 212], [172, 204], [196, 196]]);
    pts.forEach(([x, y]) => b.glow.push(`<circle cx="${F(x)}" cy="${F(y)}" r="2.2" fill="${P.glow}"/>`));
    b.line(polyD(TT([[106, 196], [216, 196]]), false), 1, 0.45, P.glow);
    const g = T([160, 204]);
    b.det.push(`<path d="${gearD(g[0], g[1], 14, 9, 4)}" fill="none" stroke="${P.rim}" stroke-width="1" opacity=".5"/>`);
  }
  if (o.fire) {
    const m = T([A.head[0] - 60, A.head[1] + 8]);
    const h0 = T([A.head[0] - 34, A.head[1] + 6]);
    b.glow.push(`<path d="${tube([h0, [(h0[0] + m[0]) / 2, (h0[1] + m[1]) / 2 + 6], [m[0] - 20, m[1] + 18]], 8, 34)}" fill="url(#flameG)" opacity=".85"/>`);
  }
}

function foot(b, p, hooves, k = 1) {
  if (hooves) b.S(polyD([[p[0] - 6 * k, p[1] - 4], [p[0] + 6 * k, p[1] - 4], [p[0] + 7 * k, p[1] + 6], [p[0] - 8 * k, p[1] + 6]]));
  else claws(b, p[0] - 2, p[1] + 2, Math.PI * 0.95, 10 * k, 3, 3);
}

function beastHead(b, type, hx, hy, r, o = {}, ang = 0) {
  const k = o.headScale || 1.3;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  // rotation : angle positif = museau qui se relève (tête tournée vers la gauche)
  const tp = ([x, y]) => [hx + (x * ca - y * sa) * k, hy + (x * sa + y * ca) * k];
  const T = (pts) => pts.map(tp);
  const P = b.P;
  let eye = [-6, -4];
  const teeth = (pts) => b.lit.push(`<path d="${polyD(T(pts))}" fill="${BONE}"/>`);
  switch (type) {
    case 'lion':
      b.S(smoothD(T([[14, 10], [12, -10], [2, -16], [-12, -12], [-24, -6], [-30, 2], [-26, 10], [-14, 16], [4, 16]])));
      teeth([[-24, 9], [-21, 15], [-18, 9]]); teeth([[-16, 11], [-14, 16], [-12, 11]]);
      break;
    case 'human':
      b.S(smoothD(T([[14, 10], [12, -10], [2, -18], [-8, -16], [-14, -8], [-14, -2], [-19, 4], [-14, 6], [-15, 12], [-10, 18], [2, 20]])));
      eye = [-8, -4];
      break;
    case 'stag': case 'goat':
      b.S(smoothD(T([[12, 6], [8, -10], [14, -22], [2, -14], [-12, -8], [-30, 0], [-32, 6], [-18, 10], [0, 12]])));
      if (type === 'goat') {
        const pts = [];
        for (let i = 0; i <= 10; i++) { const a = -2.4 + i * 0.5; const rad = 12 - i * 0.7; pts.push([8 + Math.cos(a) * rad, -12 + Math.sin(a) * rad - 4]); }
        b.S(tube(T(pts), 6 * k, 1.5 * k));
      } else antlers(b, tp, o.horns === 'inverted', k);
      break;
    case 'bull':
      b.S(smoothD(T([[14, 10], [14, -12], [0, -16], [-18, -12], [-28, 0], [-28, 14], [-12, 18], [6, 18]])));
      b.S(tube(T([[4, -12], [18, -18], [26, -32], [22, -44]]), 7 * k, 0));
      b.S(tube(T([[-2, -12], [-10, -24], [-6, -38]]), 6 * k, 0));
      break;
    case 'bird':
      b.S(smoothD(T([[14, 8], [10, -12], [-4, -16], [-16, -10], [-24, -4], [-36, 6], [-24, 6], [-26, 12], [-12, 12], [4, 14]])));
      for (let i = 0; i < 4; i++) b.S(tube(T([[6 + i * 3, -12], [16 + i * 6, -22 - i * 2]]), 4 * k, 0));
      b.lit.push(`<path d="${polyD(T([[-22, -2], [-37, 6], [-24, 8]]))}" fill="#c8a45d"/>`);
      break;
    case 'boar':
      b.S(smoothD(T([[14, 12], [12, -12], [0, -16], [-20, -8], [-34, 4], [-34, 14], [-14, 18], [4, 18]])));
      b.S(polyD(T([[6, -12], [12, -26], [14, -10]])));
      b.lit.push(`<path d="${tube(T([[-26, 12], [-34, 4], [-32, -6]]), 4 * k, 0)}" fill="${BONE}"/>`);
      break;
    case 'bear':
      b.S(smoothD(T([[14, 12], [12, -10], [8, -20], [0, -14], [-12, -12], [-24, -4], [-30, 4], [-24, 12], [-8, 16], [4, 18]])));
      break;
    case 'cat': case 'fox':
      b.S(smoothD(T([[12, 8], [10, -10], [12, -26], [0, -14], [-8, -14], [-14, -26], [-16, -10], [-28, 0], [-30, 6], [-14, 12], [2, 14]])));
      break;
    case 'horse':
      b.S(smoothD(T([[14, 4], [10, -14], [14, -26], [2, -18], [-14, -8], [-34, 8], [-36, 16], [-24, 18], [-6, 12], [6, 14]])));
      break;
    case 'lizard':
      b.S(smoothD(T([[14, 8], [10, -8], [-8, -10], [-30, -4], [-38, 4], [-28, 10], [-8, 12]])));
      for (let i = 0; i < 5; i++) b.S(polyD(T([[-4 + i * 4, -8], [-2 + i * 5, -22 - (i % 2) * 6], [2 + i * 4, -8]])));
      teeth([[-30, 9], [-28, 14], [-26, 9]]);
      break;
    case 'dog': case 'wolf': default:
      b.S(smoothD(T([[14, 8], [12, -8], [12, -28], [2, -16], [-6, -14], [-18, -8], [-34, -2], [-40, 4], [-32, 9], [-24, 12], [-8, 15], [6, 16]])));
      teeth([[-32, 9], [-30, 15], [-28, 9]]); teeth([[-24, 11], [-22, 16], [-20, 11]]);
  }
  if (o.unicorn) b.lit.push(`<path d="${tube(T([[-6, -12], [-14, -28], [-22, -48]]), 5 * k, 0)}" fill="url(#boneG)"/>`);
  if (o.horns === 'short' && type !== 'stag' && type !== 'goat' && type !== 'bull') b.S(tube(T([[2, -12], [6, -24], [12, -32]]), 5 * k, 0));
  const e = tp(eye);
  b.eye(e[0], e[1], 1.8 + k * 0.3);
}

function antlers(b, tp, inverted, k) {
  const d = inverted ? 1 : -1;
  const main = [[4, -10], [12, -10 + d * 18], [24, -10 + d * 34], [30, -10 + d * 56]];
  b.S(tube(main.map(tp), 4.6 * k, 1));
  [[main[1], -0.6, 16], [main[2], -0.9, 18], [main[2], 0.6, 14], [[28, -10 + d * 46], -0.4, 12]].forEach(([p, a, l]) => {
    const base = Math.atan2(d, 0.4) + a;
    b.S(tube([p, [p[0] + Math.cos(base) * l * 0.6, p[1] + Math.sin(base) * l * 0.6], [p[0] + Math.cos(base + 0.2) * l, p[1] + Math.sin(base + 0.2) * l]].map(tp), 3 * k, 0.4));
  });
  const main2 = main.map(([x, y]) => [x - 10, y + (inverted ? 4 : -2)]);
  b.S(tube(main2.map(tp), 4 * k, 1));
}

function dragon(b, o, r) {
  const P = b.P;
  const legs = o.legs ?? 4;
  if (o.wings !== 'none') {
    // aile lointaine plus sombre
    b.back.push(`<path d="${polyD([[160, 170], [120, 80], [96, 30], [70, 70], [60, 120], [92, 150], [130, 190]])}" fill="#000" opacity=".55"/>`);
    const W = [196, 72], tips = [[262, 24], [292, 92], [282, 160], [238, 196]];
    let d = `M164 170L${W[0]} ${W[1]}L${tips[0][0]} ${tips[0][1]}`;
    [...tips.slice(1), [186, 214]].forEach((q, i) => {
      const p = i === 0 ? tips[0] : tips[i];
      const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      const c = [mid[0] + (W[0] - mid[0]) * 0.32, mid[1] + (W[1] - mid[1]) * 0.32];
      d += o.wings === 'tatter' ? `L${F(c[0] + (r() - 0.5) * 14)} ${F(c[1])}L${F(q[0])} ${F(q[1])}` : `Q${F(c[0])} ${F(c[1])} ${F(q[0])} ${F(q[1])}`;
    });
    b.S(d + 'Z');
    b.S(tube([[164, 170], [178, 120], [W[0], W[1]]], 12, 7));
    tips.forEach((t) => { b.S(tube([W, t], 4, 1)); b.line(polyD([W, t], false), 0.9, 0.35); });
  }
  // queue
  b.S(tube([[200, 236], [236, 270], [252, 312], [214, 334], [160, 330], [118, 340], [90, 334]], 26, 2));
  b.S(polyD([[92, 328], [70, 334], [92, 340]]));
  // corps
  b.S(smoothD([[120, 204], [126, 172], [150, 160], [182, 170], [206, 196], [212, 228], [198, 252], [168, 262], [138, 256], [120, 236]]));
  for (let i = 0; i < 6; i++) b.line(`M${130 + i * 4} ${186 + i * 12}q14 4 24 0`, 0.9, 0.3);
  // pattes
  if (legs >= 2) {
    b.S(tube([[186, 228], [204, 262], [190, 294], [204, 318]], 30, 10));
    claws(b, 206, 320, 0.2, 12, 3, 3.4);
  }
  if (legs >= 4) {
    b.S(tube([[136, 214], [116, 238], [112, 264]], 16, 8));
    claws(b, 112, 266, 1.9, 10, 3, 3);
  }
  // cous et têtes
  const heads = o.heads || 1;
  for (let k = 0; k < heads; k++) {
    const spread = heads === 1 ? 0 : (k / (heads - 1) - 0.5) * 2;
    const hx = 98 + spread * 34 - Math.abs(spread) * 6, hy = 84 + Math.abs(spread) * 30 + (heads > 4 ? (k % 2) * 22 : 0);
    const neck = [[132, 184], [112 + spread * 10, 150], [124 + spread * 24, 118], [hx + 8, hy + 4]];
    b.S(tube(neck, heads > 1 ? 18 : 26, 13));
    if (o.spikes !== false) along(neck, 6).slice(1, 5).forEach((p) => {
      const nx = Math.cos(p.a - Math.PI / 2), ny = Math.sin(p.a - Math.PI / 2);
      b.S(polyD([[p.x + nx * 4 - 3, p.y + ny * 4], [p.x + nx * 16, p.y + ny * 16 - 2], [p.x + nx * 4 + 3, p.y + ny * 4]]));
    });
    const s = heads > 1 ? 0.8 : 1;
    const T = (pts) => pts.map(([x, y]) => [hx + x * s, hy + y * s]);
    b.S(smoothD(T([[12, 8], [12, -6], [0, -12], [-14, -10], [-34, -4], [-42, 2], [-30, 6], [-38, 14], [-20, 16], [-4, 16]])));
    hornPair(b, o.horns || 'back', hx + 6 * s, hy - 8 * s, r, 0.7 * s, hx + 6 * s);
    b.lit.push(`<path d="${polyD(T([[-34, 6], [-31, 11], [-28, 6], [-25, 11], [-22, 6]]))}" fill="${BONE}"/>`);
    b.eye(hx - 8 * s, hy - 4 * s, 2.2);
    if (o.fire && k === 0) b.glow.push(`<path d="${tube([[hx - 38 * s, hy + 8], [hx - 70, hy + 30], [hx - 96, hy + 70]], 6, 40)}" fill="url(#flameG)" opacity=".9"/>`);
  }
}

function serpent(b, o, r) {
  const P = b.P;
  const path = [[40, 330], [150, 348], [250, 322], [232, 292], [140, 300], [92, 274], [118, 236], [190, 220], [206, 184], [170, 150], [150, 122]];
  if (o.bite) {
    // Ouroboros : anneau parfait, la tête mord la queue.
    const pts = ring(150, 200, 92, 40, 0, r, -Math.PI / 2).slice(4);
    b.S(tube(pts, 30, 12));
    along(pts, 30).forEach((p) => b.line(`M${F(p.x + Math.cos(p.a + 1.57) * 9)} ${F(p.y + Math.sin(p.a + 1.57) * 9)}L${F(p.x - Math.cos(p.a + 1.57) * 9)} ${F(p.y - Math.sin(p.a + 1.57) * 9)}`, 0.8, 0.3));
    b.S(smoothD([[140, 100], [160, 92], [188, 98], [200, 110], [186, 122], [160, 120]]));
    b.eye(178, 103, 2.4);
    b.backGlow.push(`<circle cx="150" cy="200" r="60" fill="none" stroke="${P.glow}" stroke-width="2" opacity=".7"/>`);
    return;
  }
  if (o.frill) {
    const pts = [];
    for (let i = 0; i <= 12; i++) { const a = Math.PI + (i / 12) * Math.PI; pts.push([150 + Math.cos(a) * (i % 2 ? 34 : 48), 112 + Math.sin(a) * (i % 2 ? 30 : 44)]); }
    b.S(polyD([[150, 124], ...pts]));
    for (let i = 0; i <= 12; i += 2) { const a = Math.PI + (i / 12) * Math.PI; b.line(`M150 116L${F(150 + Math.cos(a) * 44)} ${F(112 + Math.sin(a) * 40)}`, 0.8, 0.35); }
  }
  if (o.wings) wingPair(b, o.wings, 166, 170, 0.9, 1.1, r);
  b.S(tube(path, 14, 34, (t) => 14 + Math.sin(Math.PI * Math.min(1, t * 1.3)) * 22));
  along(path, 34).forEach((p, i) => {
    if (i % 2) return;
    const nx = Math.cos(p.a + Math.PI / 2), ny = Math.sin(p.a + Math.PI / 2);
    b.line(`M${F(p.x - nx * 10)} ${F(p.y - ny * 10)}Q${F(p.x + Math.cos(p.a) * 4)} ${F(p.y + Math.sin(p.a) * 4)} ${F(p.x + nx * 10)} ${F(p.y + ny * 10)}`, 0.8, 0.28);
  });
  if (o.fins) along(path, 10).slice(3, 9).forEach((p) => {
    const nx = Math.cos(p.a - Math.PI / 2), ny = Math.sin(p.a - Math.PI / 2);
    b.S(polyD([[p.x + nx * 10 - 6, p.y + ny * 10], [p.x + nx * 30, p.y + ny * 30 - 4], [p.x + nx * 10 + 6, p.y + ny * 10]]));
  });
  const heads = o.heads || 1;
  for (let k = 0; k < heads; k++) {
    const spread = heads === 1 ? 0 : (k / (heads - 1) - 0.5) * 2;
    const hx = 150 + spread * 70, hy = 106 + Math.abs(spread) * 30;
    if (heads > 1) b.S(tube([[150, 150], [150 + spread * 40, 130], [hx, hy + 10]], 16, 12));
    b.S(smoothD([[hx, hy - 18], [hx + 14, hy - 12], [hx + 18, hy + 4], [hx + 10, hy + 22], [hx, hy + 28], [hx - 10, hy + 22], [hx - 18, hy + 4], [hx - 14, hy - 12]]));
    b.lit.push(`<path d="M${hx - 6} ${hy + 22}l2 9 2-8M${hx + 6} ${hy + 22}l-2 9-2-8" fill="${BONE}"/>`);
    if (o.horns) hornPair(b, o.horns, hx + 8, hy - 10, r, 0.6, hx);
    b.eye(hx - 7, hy + 2, 2.4); b.eye(hx + 7, hy + 2, 2.4);
  }
}

function tentacle(b, o, r) {
  const P = b.P;
  const n = o.count || 8;
  const core = o.core || 'mantle';
  const cy = core === 'mantle' ? 150 : 170;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.05 + (0.9 * i) / (n - 1)) + (r() - 0.5) * 0.15;
    const L = 130 + r() * 70;
    const pts = [];
    const sx = 150 + Math.cos(a) * 30, sy = cy + 30 + Math.sin(a) * 16;
    const wob = (r() - 0.5) * 2;
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const aa = a + Math.sin(t * 3 + wob) * 0.5 * t;
      pts.push([sx + Math.cos(aa) * L * t + Math.cos(a + 1.57) * Math.sin(t * 6 + wob) * 14 * t, sy + Math.sin(aa) * L * t * 0.95]);
    }
    const tip = pts[pts.length - 1];
    pts.push([tip[0] + 12 * Math.sign(Math.cos(a) || 1), tip[1] - 10], [tip[0] + 4 * Math.sign(Math.cos(a) || 1), tip[1] - 18]);
    b.S(tube(pts, 22, 1));
    if (o.dogs && i < o.dogs) {
      const p = pts[3];
      beastHead(b, 'dog', p[0] + (Math.cos(a) > 0 ? -10 : 10), p[1] - 6, r, { headScale: 0.8 });
    }
    if (i % 2 === 0) along(pts, 9).slice(1, 7).forEach((p) => b.lit.push(`<circle cx="${F(p.x + Math.cos(p.a + 1.57) * 5)}" cy="${F(p.y + Math.sin(p.a + 1.57) * 5)}" r="1.6" fill="${P.rim}" opacity=".5"/>`));
  }
  if (core === 'mantle') {
    b.S(smoothD([[150, 52], [178, 70], [190, 120], [184, 170], [168, 196], [132, 196], [116, 170], [110, 120], [122, 70]]));
    b.line(`M132 90Q150 80 168 90M126 120Q150 108 174 120`, 1, 0.25);
    b.eye(134, 172, 3.2); b.eye(166, 172, 3.2);
  } else if (core === 'eye') {
    b.S(smoothD(ring(150, cy, 48, 14, 0.06, r)));
    b.glow.push(`<circle cx="150" cy="${cy}" r="30" fill="${P.light}" opacity=".9"/><circle cx="150" cy="${cy}" r="18" fill="${P.eye}"/><ellipse cx="150" cy="${cy}" rx="5" ry="15" fill="#05060a"/>`);
  } else if (core === 'maw') {
    b.S(smoothD(ring(150, cy, 52, 14, 0.1, r)));
    b.det.push(`<circle cx="150" cy="${cy}" r="30" fill="#000"/>`);
    let t = '';
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; t += `<path d="${polyD([[150 + Math.cos(a - 0.12) * 30, cy + Math.sin(a - 0.12) * 30], [150 + Math.cos(a) * 18, cy + Math.sin(a) * 18], [150 + Math.cos(a + 0.12) * 30, cy + Math.sin(a + 0.12) * 30]])}"/>`; }
    b.lit.push(`<g fill="${BONE}">${t}</g>`);
    b.glow.push(`<circle cx="150" cy="${cy}" r="8" fill="${P.glow}" opacity=".7"/>`);
  } else if (core === 'bell') {
    b.back.push(`<path d="${smoothD([[150, 70], [196, 96], [212, 160], [190, 176], [150, 168], [110, 176], [88, 160], [104, 96]])}" fill="${P.rim}" opacity=".25"/>`);
    b.glow.push(`<path d="M120 120Q150 100 180 120M110 150Q150 130 190 150" stroke="${P.glow}" stroke-width="1.6" fill="none"/>`);
    b.S(smoothD([[150, 140], [170, 150], [174, 176], [150, 190], [126, 176], [130, 150]]));
  } else if (core === 'head') {
    if (o.hair) for (const m of [1, -1]) for (let i = 0; i < 4; i++) b.S(tube([[mx(m, 160), 70], [mx(m, 186 + i * 8), 100 + i * 10], [mx(m, 200 + i * 14), 150 + i * 20]], 7, 0));
    b.S(smoothD([[150, 60], [178, 76], [186, 112], [178, 150], [162, 168], [138, 168], [122, 150], [114, 112], [122, 76]]));
    if (o.horns) hornPair(b, o.horns, 162, 76, r, 1);
    b.eye(138, 118, 3); b.eye(162, 118, 3);
    if (o.eyes) for (let i = 0; i < o.eyes; i++) b.eye(132 + r() * 36, 84 + r() * 30, 1.6);
  }
  if (o.crown) hornPair(b, 'crown', 150, 64, r, 1.2);
}

function wheel(b, o, r) {
  const P = b.P;
  wingPair(b, o.gold ? 'gold' : 'feather', 168, 170, 0.95, 1.1, r);
  wingPair(b, o.gold ? 'gold' : 'feather', 166, 210, 0.7, -0.6, r);
  const rings = o.rings || 3;
  let s = '';
  for (let i = 0; i < rings; i++) {
    const rot = i * (180 / rings) + 20;
    s += `<ellipse cx="150" cy="190" rx="${92 - i * 6}" ry="${34 + i * 6}" transform="rotate(${rot} 150 190)" fill="none" stroke="url(#goldG)" stroke-width="9"/>`;
    s += `<ellipse cx="150" cy="190" rx="${92 - i * 6}" ry="${34 + i * 6}" transform="rotate(${rot} 150 190)" fill="none" stroke="#3a2a10" stroke-width="1" stroke-dasharray="2 6"/>`;
  }
  s += `<circle cx="150" cy="190" r="56" fill="none" stroke="url(#goldG)" stroke-width="7"/>`;
  b.lit.push(s);
  const eyes = o.eyes || 14;
  for (let i = 0; i < eyes; i++) {
    const ring_ = i % rings, rot = (ring_ * (180 / rings) + 20) * (Math.PI / 180);
    const t = (i / eyes) * Math.PI * 2 * 1.7;
    const ex = Math.cos(t) * (92 - ring_ * 6), ey = Math.sin(t) * (34 + ring_ * 6);
    const x = 150 + ex * Math.cos(rot) - ey * Math.sin(rot), y = 190 + ex * Math.sin(rot) + ey * Math.cos(rot);
    b.glow.push(`<ellipse cx="${F(x)}" cy="${F(y)}" rx="4.2" ry="2.6" fill="#fff"/><circle cx="${F(x)}" cy="${F(y)}" r="1.6" fill="${P.eye === '#ffffff' ? '#c8a45d' : P.eye}"/>`);
  }
  b.glow.push(`<circle cx="150" cy="190" r="26" fill="#fff8e0"/><circle cx="150" cy="190" r="14" fill="${o.iris || '#c8a45d'}"/><circle cx="150" cy="190" r="6" fill="#120c04"/>`);
}

function golem(b, o, r) {
  const P = b.P;
  const shape = o.shape || 'block';
  if (shape === 'spider') {
    for (const m of [1, -1]) for (let i = 0; i < 4; i++) {
      const X = (x) => mx(m, x);
      const knee = [X(200 + i * 10), 150 + i * 20 - 30], foot = [X(238 + i * 12), 330 - (i % 2) * 6];
      b.S(tube([[X(166), 200 + i * 8], knee, foot], 10, 4));
      b.lit.push(`<circle cx="${F(knee[0])}" cy="${F(knee[1])}" r="5" fill="url(#bronzeG)"/>`);
    }
    b.S(smoothD(ring(150, 210, 40, 12, 0.05, r)));
    b.S(smoothD(ring(150, 162, 24, 10, 0.05, r)));
    b.det.push(`<path d="${gearD(150, 214, 22, 12, 4)}" fill="none" stroke="${P.rim}" stroke-width="1" opacity=".5"/>`);
    for (let i = 0; i < 6; i++) b.eye(138 + (i % 3) * 12, 156 + Math.floor(i / 3) * 8, 1.6);
    b.glow.push(`<circle cx="150" cy="214" r="8" fill="${P.glow}"/>`);
    return;
  }
  if (shape === 'clock') {
    b.S(smoothD(ring(150, 180, 74, 24, 0, r)));
    b.det.push(`<circle cx="150" cy="180" r="62" fill="none" stroke="${P.rim}" stroke-width="1.2" opacity=".5"/>`);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; b.lit.push(`<path d="M${F(150 + Math.cos(a) * 54)} ${F(180 + Math.sin(a) * 54)}L${F(150 + Math.cos(a) * 62)} ${F(180 + Math.sin(a) * 62)}" stroke="#c8a45d" stroke-width="2.4"/>`); }
    b.glow.push(`<path d="M150 180L150 128M150 180L184 196" stroke="${P.glow}" stroke-width="3" stroke-linecap="round"/><circle cx="150" cy="180" r="5" fill="#fff"/>`);
    for (const m of [1, -1]) {
      b.S(tube([[mx(m, 212), 190], [mx(m, 236), 240], [mx(m, 226), 300]], 14, 8));
      b.S(tube([[mx(m, 170), 246], [mx(m, 178), 290], [mx(m, 176), 332]], 18, 12));
    }
    b.lit.push(`<path d="${gearD(150, 92, 22, 10, 5)}" fill="url(#bronzeG)"/>`);
    return;
  }
  const W = shape === 'tall' ? 0.7 : shape === 'colossus' ? 1.2 : 1;
  const hy = shape === 'colossus' ? 74 : shape === 'tall' ? 84 : 92;
  const torso = [[150, hy + 22], [180 * W + 150 * (1 - W), hy + 24], [210 * W + 150 * (1 - W), hy + 36], [214 * W + 150 * (1 - W), hy + 70], [196 * W + 150 * (1 - W), hy + 108], [176 * W + 150 * (1 - W), hy + 128], [150, hy + 132]];
  b.S(polyD(mirror(torso)));
  for (const m of [1, -1]) {
    const X = (x) => mx(m, 150 + (x - 150) * W);
    if (shape === 'tall') {
      b.S(tube([[X(206), hy + 40], [X(224), hy + 100], [X(226), hy + 160]], 9, 7));
      b.lit.push(`<circle cx="${F(X(224))}" cy="${hy + 100}" r="6" fill="url(#bronzeG)"/>`);
      b.S(polyD([[X(218), hy + 158], [X(236), hy + 158], [X(232), hy + 186], [X(222), hy + 186]]));
      b.S(tube([[X(164), hy + 128], [X(170), hy + 190], [X(170), 330]], 12, 9));
      b.lit.push(`<circle cx="${F(X(170))}" cy="${hy + 190}" r="6" fill="url(#bronzeG)"/>`);
    } else {
      b.S(polyD([[X(204), hy + 28], [X(236), hy + 32], [X(240), hy + 64], [X(206), hy + 66]]));
      b.S(polyD([[X(214), hy + 66], [X(236), hy + 66], [X(240), hy + 132], [X(214), hy + 128]]));
      b.S(polyD([[X(206), hy + 130], [X(248), hy + 132], [X(250), hy + 172], [X(208), hy + 170]]));
      b.S(polyD([[X(156), hy + 128], [X(190), hy + 128], [X(194), 288], [X(158), 288]]));
      b.S(polyD([[X(154), 286], [X(200), 288], [X(204), 334], [X(150), 334]]));
      b.line(polyD([[X(204), hy + 46], [X(238), hy + 48]], false), 1, 0.4);
    }
  }
  // tête
  const head = o.head || 'block';
  if (head === 'block') { b.S(polyD([[134, hy - 8], [166, hy - 8], [170, hy + 24], [130, hy + 24]])); b.glow.push(`<path d="M138 ${hy + 6}h24" stroke="${P.eye}" stroke-width="3"/>`); }
  else if (head === 'lantern') { b.S(polyD([[136, hy - 14], [164, hy - 14], [168, hy + 24], [132, hy + 24]])); b.glow.push(`<rect x="139" y="${hy - 8}" width="22" height="26" fill="${P.glow}" opacity=".9"/><circle cx="150" cy="${hy + 5}" r="5" fill="#fff"/>`); b.S(polyD([[140, hy - 14], [150, hy - 28], [160, hy - 14]])); }
  else if (head === 'mask') { b.S(smoothD([[150, hy - 16], [166, hy - 8], [166, hy + 16], [150, hy + 30], [134, hy + 16], [134, hy - 8]])); b.lit.push(`<path d="${smoothD([[150, hy - 14], [164, hy - 7], [164, hy + 15], [150, hy + 28], [136, hy + 15], [136, hy - 7]])}" fill="url(#bronzeG)"/>`); b.eye(144, hy + 4, 2); b.eye(156, hy + 4, 2); }
  else if (head === 'gargoyle') { beastHeadFront(b, 150, hy + 6, r); hornPair(b, 'curl', 160, hy - 4, r, 0.8); }
  else if (head === 'none') { b.glow.push(`<circle cx="150" cy="${hy + 10}" r="10" fill="${P.glow}"/>`); }
  // cœurs / runes
  const cores = o.cores || 1;
  for (let i = 0; i < cores; i++) {
    const x = cores === 1 ? 150 : 128 + (i % 3) * 22, y = hy + 64 + Math.floor(i / 3) * 28;
    b.glow.push(`<circle cx="${x}" cy="${y}" r="10" fill="${P.glow}" opacity=".6"/><circle cx="${x}" cy="${y}" r="5" fill="#fff"/>`);
  }
  if (o.runes !== false) for (let i = 0; i < 6; i++) {
    const x = 132 + r() * 36, y = hy + 36 + r() * 80;
    b.glow.push(`<path d="M${F(x)} ${F(y)}l${F((r() - 0.5) * 14)} 6l6 -4l-2 8" stroke="${P.glow}" stroke-width="1" fill="none" opacity=".8"/>`);
  }
  for (let i = 0; i < 12; i++) b.det.push(`<circle cx="${F(126 + r() * 48)}" cy="${F(hy + 30 + r() * 96)}" r=".9" fill="${P.rim}" opacity=".5"/>`);
}

function beastHeadFront(b, x, y, r) {
  b.S(smoothD([[x, y - 12], [x + 12, y - 14], [x + 20, y - 30], [x + 20, y - 6], [x + 16, y + 10], [x + 6, y + 20], [x, y + 22], [x - 6, y + 20], [x - 16, y + 10], [x - 20, y - 6], [x - 20, y - 30], [x - 12, y - 14]]));
  b.lit.push(`<path d="M${x - 6} ${y + 16}l2 7 2-6M${x + 6} ${y + 16}l-2 7-2-6" fill="${BONE}"/>`);
  b.eye(x - 7, y - 2, 2.2); b.eye(x + 7, y - 2, 2.2);
}

function spectre(b, o, r) {
  const P = b.P;
  const hy = 98;
  // traînées
  for (let i = 0; i < 7; i++) {
    const x0 = 126 + i * 8;
    b.S(tube([[x0, 230], [x0 + (r() - 0.5) * 40, 280], [x0 + (r() - 0.5) * 70, 330 + r() * 30]], 18, 0));
  }
  b.S(smoothD(mirror([[150, hy + 10], [170, hy + 18], [190, hy + 40], [194, hy + 90], [186, hy + 140], [172, 246], [150, 252]])));
  if (o.hair) for (const m of [1, -1]) for (let i = 0; i < 5; i++) b.S(tube([[mx(m, 156), hy - 8], [mx(m, 178 + i * 10), hy + 20 + i * 8], [mx(m, 196 + i * 16 + r() * 20), hy + 70 + i * 26]], 7, 0));
  // bras
  const arms = o.arms || 'reach';
  for (const m of [1, -1]) {
    const X = (x) => mx(m, x);
    let pts;
    if (arms === 'wrap') pts = [[X(184), hy + 44], [X(206), hy + 90], [X(178), hy + 120], [X(156), hy + 112]];
    else if (arms === 'up') pts = [[X(184), hy + 44], [X(218), hy + 10], [X(236), hy - 40]];
    else pts = [[X(184), hy + 44], [X(222), hy + 74], [X(258), hy + 70]];
    b.S(tube(pts, 14, 5));
    const h = pts[pts.length - 1], p = pts[pts.length - 2];
    const ang = Math.atan2(h[1] - p[1], h[0] - p[0]);
    for (let k = 0; k < 4; k++) b.S(tube([[h[0], h[1]], [h[0] + Math.cos(ang + (k - 1.5) * 0.3) * 22, h[1] + Math.sin(ang + (k - 1.5) * 0.3) * 22]], 2.6, 0));
    if (arms === 'lantern' && m === 1) {
      b.lit.push(`<path d="M${F(h[0])} ${F(h[1])}v14" stroke="${STEEL}" stroke-width="1.4"/>`);
      b.glow.push(`<rect x="${F(h[0] - 7)}" y="${F(h[1] + 14)}" width="14" height="18" rx="3" fill="${P.glow}"/><circle cx="${F(h[0])}" cy="${F(h[1] + 23)}" r="4" fill="#fff"/>`);
    }
  }
  if (arms === 'scythe') {
    b.S(tube([[110, 330], [220, 160], [236, 60]], 5, 4));
    b.lit.push(`<path d="M236 62Q160 26 112 92Q164 46 230 82Z" fill="url(#steelG)"/>`);
  }
  // tête
  const head = o.head || 'hood';
  if (head === 'hood') {
    b.S(smoothD([[150, hy - 34], [168, hy - 14], [176, hy + 10], [182, hy + 30], [150, hy + 34], [118, hy + 30], [124, hy + 10], [132, hy - 14]]));
    b.det.push(`<ellipse cx="150" cy="${hy + 6}" rx="11" ry="14" fill="#000" opacity=".85"/>`);
    b.eye(145, hy + 4, 2); b.eye(155, hy + 4, 2);
  } else if (head === 'skull') {
    b.lit.push(`<path d="${smoothD([[150, hy - 18], [166, hy - 10], [166, hy + 6], [158, hy + 22], [142, hy + 22], [134, hy + 6], [134, hy - 10]])}" fill="url(#boneG)"/><circle cx="144" cy="${hy + 2}" r="4.5" fill="#0a0810"/><circle cx="156" cy="${hy + 2}" r="4.5" fill="#0a0810"/><path d="M150 ${hy + 8}l-2 5h4z" fill="#0a0810"/>`);
    b.eye(144, hy + 2, 1.8); b.eye(156, hy + 2, 1.8);
  } else if (head === 'woman') {
    b.S(smoothD([[150, hy - 18], [162, hy - 12], [164, hy + 4], [158, hy + 16], [150, hy + 20], [142, hy + 16], [136, hy + 4], [138, hy - 12]]));
    b.lit.push(`<path d="${smoothD([[150, hy - 14], [160, hy - 8], [161, hy + 4], [150, hy + 17], [139, hy + 4], [140, hy - 8]])}" fill="${P.rim}" opacity=".35"/>`);
    b.eye(145, hy + 1, 1.8); b.eye(155, hy + 1, 1.8);
    if (o.scream) b.det.push(`<ellipse cx="150" cy="${hy + 12}" rx="3" ry="5" fill="#000"/>`);
  } else if (head === 'crown') {
    b.S(smoothD([[150, hy - 18], [164, hy - 10], [164, hy + 8], [150, hy + 22], [136, hy + 8], [136, hy - 10]]));
    hornPair(b, 'crown', 150, hy - 14, r, 1);
    b.eye(145, hy, 2.2); b.eye(155, hy, 2.2);
  } else if (head === 'mask') {
    b.S(smoothD([[150, hy - 18], [164, hy - 10], [164, hy + 8], [150, hy + 22], [136, hy + 8], [136, hy - 10]]));
    b.lit.push(`<path d="${smoothD([[150, hy - 16], [162, hy - 9], [162, hy + 7], [150, hy + 20], [138, hy + 7], [138, hy - 9]])}" fill="url(#boneG)"/><path d="M142 ${hy + 12}q8 6 16 0" stroke="#7a1020" stroke-width="2" fill="none"/>`);
    b.eye(145, hy, 1.8); b.eye(155, hy, 1.8);
  }
}

function skeleton(b, o, r) {
  const P = b.P;
  const pose = o.pose || 'giant';
  if (pose === 'giant') {
    // crâne colossal et mains qui surgissent
    b.lit.push(`<path d="${smoothD([[150, 60], [204, 80], [222, 140], [206, 196], [190, 232], [110, 232], [94, 196], [78, 140], [96, 80]])}" fill="url(#boneG)"/>`);
    b.lit.push(`<path d="${smoothD([[112, 200], [188, 200], [184, 262], [150, 272], [116, 262]])}" fill="url(#boneG)"/>`);
    b.lit.push(`<g fill="#0a0810"><ellipse cx="124" cy="150" rx="20" ry="24"/><ellipse cx="176" cy="150" rx="20" ry="24"/><path d="M150 176l-9 20h18z"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${118 + i * 8}" y="206" width="6" height="${i % 2 ? 16 : 20}" rx="1"/>`).join('')}</g>`);
    b.eye(124, 152, 4); b.eye(176, 152, 4);
    for (const m of [1, -1]) {
      const X = (x) => mx(m, x);
      b.lit.push(`<path d="${tube([[X(250), 420], [X(258), 330], [X(240), 270]], 14, 10)}" fill="url(#boneG)"/>`);
      for (let k = 0; k < 4; k++) b.lit.push(`<path d="${tube([[X(240), 270], [X(226 + k * 9), 232 - (k % 2) * 6], [X(214 + k * 12), 210 - k * 2]], 6, 3)}" fill="url(#boneG)"/>`);
    }
    for (let i = 0; i < 6; i++) b.line(`M${F(110 + r() * 80)} ${F(80 + r() * 40)}l${F((r() - 0.5) * 20)} ${F(10 + r() * 14)}`, 0.8, 0.5, '#4a4038');
    return;
  }
  // squelette debout
  const g = [];
  g.push(`<circle cx="150" cy="96" r="16"/><path d="${tube([[150, 112], [150, 200]], 6, 6)}"/>`);
  for (let i = 0; i < 5; i++) g.push(`<path d="M150 ${128 + i * 12}q${26 - i * 2} 4 ${22 - i * 2} 14" fill="none" stroke="url(#boneG)" stroke-width="3.4"/><path d="M150 ${128 + i * 12}q${-26 + i * 2} 4 ${-22 + i * 2} 14" fill="none" stroke="url(#boneG)" stroke-width="3.4"/>`);
  g.push(`<path d="${smoothD([[130, 196], [170, 196], [174, 212], [126, 212]])}"/>`);
  for (const m of [1, -1]) {
    const X = (x) => mx(m, x);
    g.push(`<path d="${tube([[X(158), 124], [X(184), 128], [X(196), 176], [X(204), 220]], 5, 4)}"/>`);
    g.push(`<path d="${tube([[X(162), 210], [X(168), 268], [X(170), 330]], 6, 5)}"/>`);
  }
  b.lit.push(`<g fill="url(#boneG)">${g.join('')}</g>`);
  b.lit.push(`<g fill="#0a0810"><circle cx="144" cy="96" r="4.5"/><circle cx="156" cy="96" r="4.5"/></g>`);
  b.eye(144, 96, 2); b.eye(156, 96, 2);
  if (o.weapon !== false) b.lit.push(`<path d="${polyD([[204, 214], [208, 214], [207, 320], [206, 330], [205, 320]])}" fill="url(#steelG)"/><path d="M196 212h20" stroke="${STEEL}" stroke-width="3"/>`);
  if (o.crown) hornPair(b, 'crown', 150, 82, r, 1);
}

function bird(b, o, r) {
  const P = b.P;
  wingPair(b, o.flame ? 'flame' : 'feather', 162, 170, 1.15, 0.55, r);
  if (o.flame) wingPair(b, 'feather', 162, 172, 0.7, 0.5, r);
  // queue
  for (let i = 0; i < 7; i++) {
    const a = Math.PI / 2 + (i - 3) * 0.16;
    const L = 110 + (3 - Math.abs(i - 3)) * 30;
    const pts = [[150, 226], [150 + Math.cos(a) * L * 0.5, 226 + Math.sin(a) * L * 0.5], [150 + Math.cos(a) * L + (r() - 0.5) * 20, 226 + Math.sin(a) * L]];
    if (o.flame) b.glow.push(`<path d="${tube(pts, 12, 0)}" fill="url(#flameG)" opacity=".85"/>`);
    else b.S(tube(pts, 12, 2));
  }
  b.S(smoothD([[150, 140], [172, 160], [176, 200], [164, 236], [150, 244], [136, 236], [124, 200], [128, 160]]));
  for (let i = 0; i < 5; i++) b.line(`M${138 + i * 2} ${176 + i * 12}q12 6 ${24 - i * 4} 0`, 0.8, 0.3);
  const head = o.head || 'eagle';
  if (head === 'human') {
    b.S(smoothD([[150, 110], [162, 118], [162, 134], [150, 146], [138, 134], [138, 118]]));
    b.eye(145, 128, 1.8); b.eye(155, 128, 1.8);
    if (o.hair) for (const m of [1, -1]) b.S(tube([[mx(m, 156), 116], [mx(m, 172), 150], [mx(m, 170), 190]], 8, 0));
  } else {
    b.S(smoothD([[150, 108], [164, 116], [166, 134], [156, 146], [144, 146], [134, 134], [136, 116]]));
    b.lit.push(`<path d="M144 136L150 ${head === 'owl' ? 146 : 160}L156 136Z" fill="#c8a45d"/>`);
    if (head === 'owl') { b.S(polyD([[136, 118], [130, 98], [144, 112]])); b.S(polyD([[164, 118], [170, 98], [156, 112]])); b.eye(143, 126, 3.2); b.eye(157, 126, 3.2); }
    else { b.eye(143, 126, 2); b.eye(157, 126, 2); }
    if (o.crest || o.flame) for (let i = 0; i < 5; i++) {
      const pts = [[150 + (i - 2) * 3, 110], [150 + (i - 2) * 8, 92 - (2 - Math.abs(i - 2)) * 8]];
      if (o.flame) b.glow.push(`<path d="${tube(pts, 6, 0)}" fill="url(#flameG)"/>`); else b.S(tube(pts, 4, 0));
    }
  }
  for (const m of [1, -1]) { b.S(tube([[mx(m, 156), 236], [mx(m, 160), 268]], 6, 4)); claws(b, mx(m, 160), 270, Math.PI / 2, 10, 3, 2.6); }
  if (o.storm) for (let k = 0; k < 2; k++) {
    let x = k ? 230 : 70, y = 120; const pts = [[x, y]];
    while (y < 260) { x += (r() - 0.5) * 26; y += 18 + r() * 16; pts.push([x, y]); }
    b.glow.push(`<path d="${polyD(pts, false)}" stroke="#e8fbff" stroke-width="1.8" fill="none"/>`);
  }
}

function fish(b, o, r) {
  const P = b.P;
  const body = [[270, 236], [236, 186], [180, 160], [120, 158], [70, 176], [40, 204], [34, 230], [60, 252], [110, 272], [180, 270], [236, 254]];
  if (o.fins !== false) {
    b.S(polyD([[200, 170], [214, 120], [196, 132], [186, 104], [172, 130], [158, 106], [150, 140], [130, 120], [128, 158]]));
    b.S(polyD([[130, 250], [110, 316], [150, 296], [160, 258]]));
  }
  b.S(polyD([[262, 236], [300, 186], [292, 236], [304, 290]]));
  b.S(smoothD(body));
  for (let i = 0; i < 8; i++) b.line(`M${150 + i * 14} 176q-10 46 0 88`, 0.8, 0.22);
  if (o.bones) {
    let t = `<path d="${tube([[60, 214], [150, 206], [270, 230]], 7, 3)}"/>`;
    for (let i = 0; i < 11; i++) { const x = 110 + i * 14; t += `<path d="M${x} 210q${-6} 30 ${-2} 56" fill="none" stroke="url(#boneG)" stroke-width="3.4"/>`; }
    b.lit.push(`<g fill="url(#boneG)">${t}<path d="${smoothD([[34, 216], [60, 190], [100, 196], [96, 232], [50, 240]])}"/></g><circle cx="78" cy="208" r="7" fill="#0a0810"/>`);
    b.eye(78, 208, 2.4);
  }
  if (o.whale) {
    b.line(`M40 226Q90 240 130 238`, 1.2, 0.5);
    for (let i = 0; i < 8; i++) b.line(`M${60 + i * 9} 238l2 26`, 0.8, 0.3);
    b.eye(98, 214, 2.4);
  } else {
    // gueule béante
    b.det.push(`<path d="M34 216Q80 212 120 222Q80 250 40 252Z" fill="#050306"/>`);
    let t = '';
    for (let i = 0; i < 9; i++) { const x = 42 + i * 9; t += `<path d="M${x} 217l4 ${12 - (i % 3) * 2}l4 -12z"/><path d="M${x + 2} 250l4 -${10 - (i % 2) * 3}l4 10z"/>`; }
    b.lit.push(`<g fill="${BONE}">${t}</g>`);
    b.eye(118, 196, 3);
  }
  if (o.lure) {
    b.S(tube([[96, 168], [80, 120], [50, 100], [34, 120]], 4, 2));
    b.glow.push(`<circle cx="34" cy="124" r="9" fill="${P.glow}" opacity=".7"/><circle cx="34" cy="124" r="4" fill="#fff"/>`);
  }
  if (o.spikes) for (let i = 0; i < 6; i++) b.S(polyD([[90 + i * 26, 166], [96 + i * 26, 136 - (i % 2) * 10], [104 + i * 26, 166]]));
  for (let i = 0; i < 10; i++) b.glow.push(`<circle cx="${F(110 + r() * 140)}" cy="${F(230 + r() * 26)}" r="1.4" fill="${P.glow}"/>`);
}

function insect(b, o, r) {
  const P = b.P;
  const type = o.type || 'spider';
  if (type === 'spider') {
    for (const m of [1, -1]) for (let i = 0; i < 4; i++) {
      const X = (x) => mx(m, x);
      const a = -0.8 + i * 0.5;
      const knee = [X(176 + Math.cos(a) * 60), 190 + Math.sin(a) * 60 - 40];
      const foot = [X(196 + Math.cos(a) * 110), 330 - Math.abs(i - 1.5) * 20];
      b.S(tube([[X(160), 196], knee, foot], 9, 2));
    }
    b.S(smoothD(ring(150, 140, 46, 14, 0.04, r)));
    b.S(smoothD(ring(150, 200, 26, 12, 0.04, r)));
    b.glow.push(`<path d="M140 120l10 14 10-14M140 160l10-14 10 14" stroke="${P.glow}" stroke-width="2.4" fill="none"/>`);
    for (let i = 0; i < 8; i++) b.eye(140 + (i % 4) * 7, 206 + Math.floor(i / 4) * 6, 1.6);
    if (o.face) b.lit.push(`<path d="${smoothD([[150, 116], [168, 126], [168, 150], [150, 166], [132, 150], [132, 126]])}" fill="url(#boneG)" opacity=".9"/>`);
  } else if (type === 'scarab' || type === 'locust') {
    for (const m of [1, -1]) for (let i = 0; i < 3; i++) b.S(tube([[mx(m, 170), 200 + i * 16], [mx(m, 214), 200 + i * 22], [mx(m, 232), 260 + i * 22]], 7, 2));
    if (type === 'locust') wingPair(b, 'insect', 160, 170, 1, 1, r);
    b.S(smoothD([[150, 140], [184, 160], [194, 220], [176, 280], [150, 296], [124, 280], [106, 220], [116, 160]]));
    b.line(`M150 150V292`, 1.2, 0.5);
    b.S(smoothD([[150, 110], [170, 120], [172, 144], [128, 144], [130, 120]]));
    b.S(tube([[150, 116], [146, 80], [160, 56]], 10, 2));
    b.eye(138, 130, 2.6); b.eye(162, 130, 2.6);
    if (type === 'scarab') b.backGlow.push(`<circle cx="150" cy="${o.sun ? 70 : 200}" r="${o.sun ? 34 : 70}" fill="${P.light}" opacity=".6"/>`);
  } else if (type === 'mantis') {
    b.S(tube([[150, 330], [150, 240], [150, 150]], 18, 12));
    for (const m of [1, -1]) {
      b.S(tube([[mx(m, 156), 160], [mx(m, 200), 120], [mx(m, 214), 180]], 10, 6));
      b.lit.push(`<path d="${tube([[mx(m, 214), 180], [mx(m, 210), 230], [mx(m, 196), 250]], 6, 0)}" fill="url(#steelG)"/>`);
      b.S(tube([[mx(m, 150), 250], [mx(m, 200), 270], [mx(m, 214), 332]], 5, 2));
    }
    b.S(polyD([[124, 100], [176, 100], [150, 140]]));
    b.eye(130, 104, 3.4); b.eye(170, 104, 3.4);
    wingPair(b, 'insect', 158, 210, 1.1, 0.4, r);
  } else if (type === 'centipede') {
    const pts = [[60, 330], [120, 320], [200, 300], [230, 250], [190, 200], [130, 190], [110, 150], [140, 110]];
    along(pts, 22).forEach((p) => {
      const nx = Math.cos(p.a + Math.PI / 2), ny = Math.sin(p.a + Math.PI / 2);
      b.S(tube([[p.x, p.y], [p.x + nx * 22, p.y + ny * 22 + 4]], 3, 1));
      b.S(tube([[p.x, p.y], [p.x - nx * 22, p.y - ny * 22 + 4]], 3, 1));
    });
    b.S(tube(pts, 30, 20));
    along(pts, 22).forEach((p) => b.line(`M${F(p.x + Math.cos(p.a + 1.57) * 12)} ${F(p.y + Math.sin(p.a + 1.57) * 12)}L${F(p.x - Math.cos(p.a + 1.57) * 12)} ${F(p.y - Math.sin(p.a + 1.57) * 12)}`, 1, 0.3));
    b.S(tube([[140, 110], [128, 86], [116, 76]], 4, 1));
    b.S(tube([[140, 110], [156, 86], [170, 76]], 4, 1));
    b.eye(134, 112, 2.2); b.eye(148, 106, 2.2);
  }
}

function tree(b, o, r) {
  const P = b.P;
  const type = o.type || 'treant';
  if (type === 'mandrake') {
    for (let i = 0; i < 7; i++) b.S(tube([[150, 120], [150 + (i - 3) * 14, 80 - r() * 20], [150 + (i - 3) * 22, 50 - r() * 20]], 8, 0));
    b.S(smoothD([[150, 110], [182, 140], [186, 200], [170, 250], [150, 260], [130, 250], [114, 200], [118, 140]]));
    for (const m of [1, -1]) {
      b.S(tube([[mx(m, 176), 170], [mx(m, 214), 200], [mx(m, 236), 240], [mx(m, 248), 268]], 12, 1));
      b.S(tube([[mx(m, 160), 246], [mx(m, 172), 290], [mx(m, 190), 334]], 14, 1));
    }
    b.det.push(`<ellipse cx="150" cy="190" rx="12" ry="16" fill="#000"/>`);
    b.eye(140, 160, 2.6); b.eye(160, 160, 2.6);
    return;
  }
  if (type === 'fungal') {
    for (let i = 0; i < 5; i++) {
      const x = 80 + i * 35 + (r() - 0.5) * 10, h = 80 + r() * 140, w = 30 + r() * 30;
      b.S(tube([[x, 334], [x + (r() - 0.5) * 20, 334 - h]], 10, 6));
      b.S(smoothD([[x - w, 334 - h + 4], [x - w * 0.6, 334 - h - w * 0.5], [x, 334 - h - w * 0.7], [x + w * 0.6, 334 - h - w * 0.5], [x + w, 334 - h + 4]]));
      for (let k = 0; k < 4; k++) b.glow.push(`<circle cx="${F(x - w * 0.5 + r() * w)}" cy="${F(334 - h - r() * w * 0.4)}" r="${F(1.5 + r() * 2)}" fill="${P.glow}"/>`);
    }
    b.eye(140, 200, 3); b.eye(160, 200, 3);
    return;
  }
  // tréant
  const branch = (x0, y0, ang, len, w, depth) => {
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    b.S(tube([[x0, y0], [(x0 + x1) / 2 + (r() - 0.5) * 16, (y0 + y1) / 2], [x1, y1]], w, w * 0.5));
    if (o.thorns) for (let k = 0; k < 2; k++) { const t = 0.3 + r() * 0.5; const px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t; b.S(polyD([[px - 2, py], [px + (r() - 0.5) * 12, py - 8], [px + 2, py]])); }
    if (depth > 0) for (let i = 0; i < 2; i++) branch(x1, y1, ang + (i ? 0.5 : -0.5) + (r() - 0.5) * 0.4, len * 0.7, w * 0.6, depth - 1);
  };
  b.S(polyD([[110, 336], [126, 300], [130, 200], [170, 200], [174, 300], [190, 336]]));
  for (let i = 0; i < 4; i++) b.S(tube([[150 + (i - 1.5) * 16, 320], [150 + (i - 1.5) * 40, 336], [150 + (i - 1.5) * 60, 340]], 10, 2));
  branch(140, 210, -Math.PI / 2 - 0.5, 70, 16, 3);
  branch(160, 210, -Math.PI / 2 + 0.5, 70, 16, 3);
  branch(150, 200, -Math.PI / 2, 60, 18, 2);
  b.line(`M136 300Q140 260 134 220M164 300Q160 250 168 214`, 1, 0.3);
  b.det.push(`<path d="M138 262q12 14 24 0q-12 6-24 0z" fill="#000"/>`);
  b.eye(140, 236, 3); b.eye(160, 236, 3);
  if (o.flowers) for (let i = 0; i < 8; i++) b.glow.push(`<circle cx="${F(80 + r() * 140)}" cy="${F(60 + r() * 100)}" r="2.4" fill="${P.glow}"/>`);
}

function orb(b, o, r) {
  const P = b.P;
  const type = o.type || 'eye';
  if (type === 'eye') {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      b.S(tube([[150 + Math.cos(a) * 60, 190 + Math.sin(a) * 60], [150 + Math.cos(a + 0.3) * 100, 190 + Math.sin(a + 0.3) * 100], [150 + Math.cos(a + 0.5) * 140, 190 + Math.sin(a + 0.5) * 140]], 10, 0));
    }
    b.S(smoothD(ring(150, 190, 76, 18, 0.04, r)));
    b.glow.push(`<circle cx="150" cy="190" r="58" fill="${P.light}" opacity=".95"/><circle cx="150" cy="190" r="38" fill="${P.eye}"/><circle cx="150" cy="190" r="16" fill="#030308"/><circle cx="140" cy="178" r="6" fill="#fff" opacity=".8"/>`);
    for (let i = 0; i < 8; i++) { const a = r() * Math.PI * 2; b.det.push(`<path d="M${F(150 + Math.cos(a) * 58)} ${F(190 + Math.sin(a) * 58)}q${F(Math.cos(a + 1) * -8)} ${F(Math.sin(a + 1) * -8)} ${F(Math.cos(a) * -14)} ${F(Math.sin(a) * -14)}" stroke="#a01830" stroke-width="1.2" fill="none" opacity=".8"/>`); }
  } else if (type === 'maw') {
    b.S(smoothD(ring(150, 190, 110, 26, 0.08, r)));
    for (let k = 0; k < 3; k++) {
      const rr = 84 - k * 22;
      b.det.push(`<circle cx="150" cy="190" r="${rr}" fill="#000" opacity="${0.6 + k * 0.15}"/>`);
      let t = '';
      for (let i = 0; i < 22 - k * 4; i++) { const a = (i / (22 - k * 4)) * Math.PI * 2 + k * 0.2; t += `<path d="${polyD([[150 + Math.cos(a - 0.1) * rr, 190 + Math.sin(a - 0.1) * rr], [150 + Math.cos(a) * (rr - 16), 190 + Math.sin(a) * (rr - 16)], [150 + Math.cos(a + 0.1) * rr, 190 + Math.sin(a + 0.1) * rr]])}"/>`; }
      b.lit.push(`<g fill="${BONE}" opacity="${1 - k * 0.2}">${t}</g>`);
    }
    b.glow.push(`<circle cx="150" cy="190" r="16" fill="${P.glow}"/><circle cx="150" cy="190" r="6" fill="#fff"/>`);
  } else if (type === 'star') {
    b.backGlow.push(`<circle cx="150" cy="190" r="110" fill="${P.glow}" opacity=".35"/>`);
    b.backGlow.push(`<path d="${polyD(star(150, 190, 120, 60, 12))}" fill="${P.light}" opacity=".5"/><circle cx="150" cy="190" r="72" fill="${P.light}"/>`);
    b.back.push(`<circle cx="150" cy="190" r="62" fill="#050307"/>`);
    b.glow.push(`<circle cx="150" cy="190" r="62" fill="none" stroke="#fff" stroke-width="2"/>`);
    if (o.hands) for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      b.S(tube([[150 + Math.cos(a) * 60, 190 + Math.sin(a) * 60], [150 + Math.cos(a + 0.2) * 110, 190 + Math.sin(a + 0.2) * 110], [150 + Math.cos(a + 0.5) * 140, 190 + Math.sin(a + 0.5) * 140]], 12, 2));
    }
  } else if (type === 'fractal') {
    for (let k = 0; k < 6; k++) b.lit.push(`<path d="${polyD(star(150, 190, 120 - k * 18, 60 - k * 9, 6 + (k % 3), k * 0.4))}" fill="none" stroke="${k % 2 ? P.glow : '#c8a45d'}" stroke-width="${1.6 - k * 0.15}"/>`);
    b.S(smoothD(ring(150, 190, 30, 10, 0, r)));
    b.eye(150, 190, 6);
  } else if (type === 'portal') {
    for (let k = 0; k < 8; k++) b.glow.push(`<ellipse cx="150" cy="200" rx="${110 - k * 12}" ry="${150 - k * 16}" fill="none" stroke="${k % 2 ? P.glow : P.light}" stroke-width="${2 - k * 0.15}" opacity="${1 - k * 0.08}"/>`);
    b.S(`M30 340L30 120Q30 30 150 30Q270 30 270 120L270 340L250 340L250 124Q250 54 150 54Q50 54 50 124L50 340Z`);
    for (let i = 0; i < 7; i++) b.glow.push(`<path d="M${F(60 + i * 30)} ${F(80 + (i % 2) * 20)}l4 8-6 4" stroke="${P.glow}" stroke-width="1.4" fill="none"/>`);
    b.eye(150, 200, 5);
  } else if (type === 'crystal') {
    const pts = [[150, 50], [210, 130], [196, 280], [150, 330], [104, 280], [90, 130]];
    b.lit.push(`<path d="${polyD(pts)}" fill="${P.light}" opacity=".25"/>`);
    b.S(polyD([[150, 70], [196, 136], [186, 266], [150, 306], [114, 266], [104, 136]]));
    b.glow.push(`<path d="M150 70L150 306M104 136L196 136M114 266L186 266M150 70L114 266M150 70L186 266" stroke="${P.glow}" stroke-width="1" opacity=".7"/>`);
    b.eye(150, 190, 6);
  } else if (type === 'sun') {
    b.backGlow.push(`<circle cx="150" cy="180" r="120" fill="${P.light}" opacity=".5"/>`);
    b.glow.push(`<circle cx="150" cy="180" r="80" fill="#fff6d0"/>`);
    b.S(smoothD([[60, 180], [100, 120], [150, 104], [200, 120], [240, 180], [210, 168], [170, 230], [130, 230], [90, 168]]));
    b.eye(130, 160, 3); b.eye(170, 160, 3);
  } else if (type === 'void') {
    b.backGlow.push(`<circle cx="150" cy="190" r="100" fill="${P.glow}" opacity=".5"/>`);
    b.S(smoothD(ring(150, 190, 80, 30, 0.3, r)));
    for (let i = 0; i < 20; i++) b.eye(110 + r() * 80, 150 + r() * 80, 1 + r() * 2.2);
  }
}

function swarm(b, o, r) {
  const P = b.P;
  const kind = o.kind || 'bat';
  const n = o.count || 22;
  const leader = o.leader !== false;
  const draw = (x, y, s) => {
    if (kind === 'bat') {
      b.S(`M${F(x)} ${F(y)}q${F(-6 * s)} ${F(-8 * s)} ${F(-16 * s)} ${F(-6 * s)}q${F(4 * s)} ${F(4 * s)} ${F(2 * s)} ${F(8 * s)}q${F(5 * s)} ${F(-2 * s)} ${F(14 * s)} ${F(2 * s)}q${F(9 * s)} ${F(-4 * s)} ${F(14 * s)} ${F(-2 * s)}q${F(-2 * s)} ${F(-4 * s)} ${F(2 * s)} ${F(-8 * s)}q${F(-10 * s)} ${F(-2 * s)} ${F(-16 * s)} ${F(6 * s)}z`);
    } else if (kind === 'fly' || kind === 'locust') {
      b.S(smoothD(ring(x, y, 4 * s, 8, 0.2, r)));
      b.back.push(`<ellipse cx="${F(x - 5 * s)}" cy="${F(y - 4 * s)}" rx="${F(6 * s)}" ry="${F(2.6 * s)}" fill="${P.rim}" opacity=".3" transform="rotate(30 ${F(x)} ${F(y)})"/><ellipse cx="${F(x + 5 * s)}" cy="${F(y - 4 * s)}" rx="${F(6 * s)}" ry="${F(2.6 * s)}" fill="${P.rim}" opacity=".3" transform="rotate(-30 ${F(x)} ${F(y)})"/>`);
    } else if (kind === 'crow') {
      b.S(`M${F(x)} ${F(y)}l${F(-18 * s)} ${F(-4 * s)}l${F(10 * s)} ${F(6 * s)}l${F(-6 * s)} ${F(6 * s)}l${F(14 * s)} ${F(-4 * s)}l${F(14 * s)} ${F(4 * s)}l${F(-6 * s)} ${F(-6 * s)}l${F(10 * s)} ${F(-6 * s)}z`);
    } else if (kind === 'rat') {
      b.S(smoothD([[x - 8 * s, y], [x, y - 6 * s], [x + 8 * s, y - 2 * s], [x + 14 * s, y + 2 * s], [x + 6 * s, y + 4 * s], [x - 8 * s, y + 4 * s]]));
      b.S(tube([[x - 8 * s, y + 2 * s], [x - 20 * s, y + 6 * s], [x - 26 * s, y]], 2 * s, 0.4));
    } else if (kind === 'imp') {
      b.S(smoothD(ring(x, y, 5 * s, 8, 0.1, r)));
      b.S(smoothD([[x, y + 3 * s], [x + 5 * s, y + 8 * s], [x + 4 * s, y + 16 * s], [x - 4 * s, y + 16 * s], [x - 5 * s, y + 8 * s]]));
      b.S(`M${F(x + 3 * s)} ${F(y + 6 * s)}l${F(12 * s)} ${F(-8 * s)}l${F(-2 * s)} ${F(10 * s)}z M${F(x - 3 * s)} ${F(y + 6 * s)}l${F(-12 * s)} ${F(-8 * s)}l${F(2 * s)} ${F(10 * s)}z`);
      b.S(`M${F(x - 4 * s)} ${F(y - 3 * s)}l${F(-2 * s)} ${F(-6 * s)}l${F(4 * s)} ${F(4 * s)}zM${F(x + 4 * s)} ${F(y - 3 * s)}l${F(2 * s)} ${F(-6 * s)}l${F(-4 * s)} ${F(4 * s)}z`);
    } else if (kind === 'wisp') {
      b.glow.push(`<circle cx="${F(x)}" cy="${F(y)}" r="${F(5 * s)}" fill="${P.glow}" opacity=".6"/><circle cx="${F(x)}" cy="${F(y)}" r="${F(2 * s)}" fill="#fff"/>`);
      return;
    }
    if (s > 0.6) { b.eye(x - 1.6 * s, y - (kind === 'imp' ? 0 : 1) * s, 0.8 * s); b.eye(x + 1.6 * s, y - (kind === 'imp' ? 0 : 1) * s, 0.8 * s); }
  };
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7) * 130;
    draw(150 + Math.cos(a) * d, 190 + Math.sin(a) * d * 1.1, 0.6 + r() * 0.9);
  }
  if (leader) draw(150, 190, 3.2);
}

function blob(b, o, r) {
  const P = b.P;
  const pts = ring(150, 220, 96, 22, 0.35, r, 0).map(([x, y]) => [x, Math.min(y, 336)]);
  for (let i = 0; i < 6; i++) b.S(tube([[90 + i * 24, 280], [86 + i * 24 + (r() - 0.5) * 20, 330], [90 + i * 24, 360]], 16, 4));
  b.S(smoothD(pts));
  if (o.crown) hornPair(b, 'crown', 150, 130, r, 1.4);
  const eyes = o.eyes || 9;
  for (let i = 0; i < eyes; i++) b.eye(100 + r() * 100, 160 + r() * 110, 1.6 + r() * 3);
  for (let i = 0; i < (o.mouths || 2); i++) {
    const x = 110 + r() * 80, y = 230 + r() * 60;
    b.det.push(`<path d="M${F(x - 16)} ${F(y)}q16 14 32 0q-16 5-32 0z" fill="#000"/>`);
    b.lit.push(`<path d="M${F(x - 12)} ${F(y + 2)}l3 5 3-4 3 5 3-5 3 5 3-5 3 4" fill="none" stroke="${BONE}" stroke-width="1"/>`);
  }
}

function object(b, o, r) {
  const P = b.P;
  const kind = o.kind || 'lantern';
  if (kind === 'lantern') {
    b.lit.push(`<path d="${smoothD([[150, 90], [196, 120], [206, 190], [196, 260], [150, 284], [104, 260], [94, 190], [104, 120]])}" fill="#d9b26a"/>`);
    for (let i = 0; i < 7; i++) b.lit.push(`<path d="M${100 + i * 0} ${120 + i * 24}Q150 ${130 + i * 24} 200 ${120 + i * 24}" stroke="#5a3a18" stroke-width="1.4" fill="none"/>`);
    b.glow.push(`<path d="${smoothD([[150, 96], [190, 122], [200, 190], [190, 254], [150, 276], [110, 254], [100, 190], [110, 122]])}" fill="#ffb347" opacity=".35"/>`);
    b.S(`M120 84h60v12h-60zM124 280h52v12h-52z`);
    b.det.push(`<path d="M120 216q30 40 60 0q-30 16-60 0z" fill="#2a0806"/>`);
    b.lit.push(`<path d="${tube([[150, 230], [156, 270], [140, 300], [150, 320]], 12, 4)}" fill="#c0303a"/>`);
    b.eye(150, 170, 7, '#ff3a2a');
    b.S(tube([[150, 84], [150, 40]], 3, 3));
  } else if (kind === 'bell') {
    b.S(smoothD([[150, 60], [186, 80], [196, 160], [230, 280], [150, 296], [70, 280], [104, 160], [114, 80]]));
    b.det.push(`<ellipse cx="150" cy="286" rx="70" ry="12" fill="#000"/>`);
    b.lit.push(`<path d="M86 250Q150 240 214 250" stroke="url(#bronzeG)" stroke-width="5" fill="none"/>`);
    b.eye(150, 284, 6);
    for (let i = 0; i < 3; i++) b.glow.push(`<path d="M${60 - i * 14} ${200 + i * 20}q-10 -30 0 -60M${240 + i * 14} ${200 + i * 20}q10 -30 0 -60" stroke="${P.glow}" stroke-width="1.4" fill="none" opacity="${0.8 - i * 0.2}"/>`);
  } else if (kind === 'mask') {
    b.lit.push(`<path d="${smoothD([[150, 70], [210, 100], [220, 190], [190, 290], [150, 320], [110, 290], [80, 190], [90, 100]])}" fill="url(#boneG)"/>`);
    b.det.push(`<path d="M106 170q20-20 34 4q-18 14-34-4zM194 170q-20-20-34 4q18 14 34-4zM120 260q30 24 60 0q-30 10-60 0z" fill="#0a0608" opacity=".95"/>`);
    b.eye(124, 172, 3.6); b.eye(176, 172, 3.6);
    b.det.push(`<path d="M150 80V310M110 120q40 16 80 0" stroke="#7a1020" stroke-width="1.4" fill="none" opacity=".7"/>`);
  } else if (kind === 'book') {
    b.S(`M60 250L150 230L240 250L240 300L150 280L60 300Z`);
    b.lit.push(`<path d="M66 246Q110 220 148 230V276Q110 266 66 292Z" fill="#e8dcc0"/><path d="M234 246Q190 220 152 230V276Q190 266 234 292Z" fill="#e8dcc0"/>`);
    for (let i = 0; i < 6; i++) b.lit.push(`<path d="${polyD([[150 + (r() - 0.5) * 200, 60 + r() * 140], [0, 0]].slice(0, 1).flatMap(([x, y]) => [[x, y], [x + 18, y - 4], [x + 22, y + 18], [x + 4, y + 22]]))}" fill="#e8dcc0" opacity=".8"/>`);
    b.glow.push(`<circle cx="150" cy="160" r="30" fill="${P.glow}" opacity=".5"/>`);
    b.eye(150, 160, 8);
    for (let i = 0; i < 8; i++) b.det.push(`<path d="M${80 + (i % 4) * 14} ${250 + Math.floor(i / 4) * 8}h${10 + r() * 20}M${170 + (i % 4) * 14} ${240 + Math.floor(i / 4) * 8}h${10 + r() * 20}" stroke="#3a2a18" stroke-width="1"/>`);
  } else if (kind === 'head') {
    b.S(`M110 300h80l10 36h-100z`);
    b.lit.push(`<path d="${smoothD([[150, 110], [190, 130], [196, 200], [180, 260], [150, 290], [120, 260], [104, 200], [110, 130]])}" fill="url(#bronzeG)"/>`);
    b.det.push(`<path d="M128 240q22 14 44 0" stroke="#3a2008" stroke-width="3" fill="none"/><path d="M150 180v40l-8 4" stroke="#3a2008" stroke-width="2" fill="none"/>`);
    b.eye(134, 182, 3.4); b.eye(166, 182, 3.4);
    b.lit.push(`<path d="M150 300v-10" stroke="#5a3a18" stroke-width="10"/>`);
  } else if (kind === 'mirror') {
    b.lit.push(`<path d="${smoothD(ring(150, 190, 96, 20, 0, r).map(([x, y]) => [x, 190 + (y - 190) * 1.3]))}" fill="url(#goldG)"/>`);
    b.det.push(`<ellipse cx="150" cy="190" rx="80" ry="108" fill="#08060c"/>`);
    b.det.push(`<path d="${smoothD([[150, 120], [164, 132], [162, 150], [186, 176], [196, 300], [104, 300], [114, 176], [138, 150], [136, 132]])}" fill="${P.rim}" opacity=".22"/>`);
    b.eye(145, 136, 1.8); b.eye(155, 136, 1.8);
  } else if (kind === 'doll') {
    hum(b, { head: 'face', body: 'gown', arms: 'down' }, r);
    b.lit.push(`<path d="M138 92q12-6 24 0" stroke="#7a1020" stroke-width="1.4" fill="none"/><path d="M150 118L120 60M150 118L180 60M150 118L150 20" stroke="${BONE}" stroke-width=".6" opacity=".6"/>`);
  }
}

export const FORMS = { hum, beast, dragon, serpent, tentacle, wheel, golem, spectre, skeleton, bird, fish, insect, tree, orb, swarm, blob, object };
