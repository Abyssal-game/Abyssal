// v540 : calculs qui donnent exactement le même résultat sur l'iPhone (Safari) et sur le serveur de partie (Deno) :
// seulement des additions, multiplications et divisions (exactes partout), jamais Math.exp ou Math.pow,
// dont les derniers chiffres peuvent varier d'un moteur à l'autre. Le serveur rejoue les parties : un écart d'un bit suffirait.
export function ipow(x, n) { let r = 1; for (let i = 0; i < n; i++) r *= x; return r; }
// e^x : x = k·ln 2 + r, |r| ≤ ln 2 / 2, série de Taylor sur r, puis 2^k par multiplications
const LN2 = 0.6931471805599453;
export function dexp(x) {
  if (!(x > -700)) return 0;
  if (x > 700) return Infinity;
  const k = Math.round(x / LN2), r = x - k * LN2;
  let term = 1, sum = 1;
  for (let i = 1; i < 30; i++) { term = (term * r) / i; sum += term; }
  let p = 1;
  if (k > 0) for (let i = 0; i < k; i++) p *= 2; else for (let i = 0; i < -k; i++) p /= 2;
  return sum * p;
}
