// Outils géométriques et aléatoires partagés par le générateur d'illustrations.
// Aucune dépendance au DOM : utilisable dans le navigateur et dans Node (tests).

export function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

// Générateur pseudo-aléatoire déterministe (mulberry32).
export function seeded(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hashString(String(seed));
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + (hi - lo) * next();
  next.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * next());
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  next.chance = (p) => next() < p;
  return next;
}

export const F = (n) => Math.round(n * 10) / 10;

export function polyD(pts, closed = true) {
  return 'M' + pts.map((p) => F(p[0]) + ' ' + F(p[1])).join('L') + (closed ? 'Z' : '');
}

// Courbe lisse (Catmull-Rom convertie en Bézier cubiques).
export function smoothD(pts, closed = true) {
  const n = pts.length;
  if (n < 2) return '';
  let d = `M${F(pts[0][0])} ${F(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p0 = closed ? pts[(i - 1 + n) % n] : pts[Math.max(0, i - 1)];
    const p3 = closed ? pts[(i + 2) % n] : pts[Math.min(n - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${F(c1[0])} ${F(c1[1])} ${F(c2[0])} ${F(c2[1])} ${F(p2[0])} ${F(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}

// Échantillonne une spline ouverte passant par les points.
export function spline(pts, seg = 8) {
  const out = [];
  const n = pts.length;
  if (n === 1) return [pts[0]];
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (let s = 0; s < seg; s++) {
      const t = s / seg, t2 = t * t, t3 = t2 * t;
      const c = (k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([c(0), c(1)]);
    }
  }
  out.push(pts[n - 1]);
  return out;
}

// Forme effilée le long d'une courbe : membres, cous, queues, cornes, tentacules.
export function tube(pts, w0, w1 = 0, wf = null, seg = 9) {
  const s = spline(pts, seg);
  const n = s.length;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = s[Math.max(0, i - 1)], b = s[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    const t = i / (n - 1);
    const w = (wf ? wf(t) : w0 + (w1 - w0) * t) / 2;
    L.push([s[i][0] - dy * w, s[i][1] + dx * w]);
    R.push([s[i][0] + dy * w, s[i][1] - dx * w]);
  }
  return polyD(L.concat(R.reverse()));
}

// Points d'une courbe échantillonnée (pour poser des détails le long d'un corps).
export function along(pts, count, seg = 9) {
  const s = spline(pts, seg);
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const k = Math.min(s.length - 2, Math.floor(t * (s.length - 1)));
    const a = s[k], b = s[k + 1];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    out.push({ x: a[0], y: a[1], a: ang, t });
  }
  return out;
}

// Construit une silhouette symétrique depuis sa moitié droite (de haut en bas).
export function mirror(half, cx = 150) {
  const left = half.slice(1, -1).reverse().map(([x, y]) => [2 * cx - x, y]);
  return half.concat(left);
}

export const mx = (m, x, cx = 150) => cx + m * (x - cx);

export function ring(cx, cy, r, n, jitter = 0, rnd = Math.random, rot = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    const rr = r * (1 + (rnd() - 0.5) * jitter);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}

export function star(cx, cy, r1, r2, n, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const a = rot + (i / (n * 2)) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

export function gearD(cx, cy, r, teeth, depth = 6) {
  const pts = [];
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * Math.PI * 2;
    const rr = i % 4 < 2 ? r : r - depth;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return polyD(pts);
}

// Ligne de crête irrégulière (montagnes, ruines, horizon).
export function ridge(rnd, y0, amp, step, x0 = -10, x1 = 310, bottom = 430, sharp = false) {
  const pts = [[x0, bottom]];
  let y = y0;
  for (let x = x0; x <= x1 + step; x += step) {
    y = y0 + (rnd() - 0.5) * amp * 2;
    pts.push([x, y]);
    if (sharp) pts.push([x + step / 2, y0 - rnd() * amp * 1.6]);
  }
  pts.push([x1 + step, bottom]);
  return sharp ? polyD(pts) : smoothD(pts);
}
