// Tirage des boosters : logique pure, testable dans Node.
// Le hasard vient d'une fonction rng() fournie (crypto.getRandomValues en jeu,
// générateur déterministe dans les tests).
import { TABLES, BOOSTERS, PITY, VARIANT_RATES, RARITY_ORDER, EVENTS } from '../config.js';

export function cryptoRandom() {
  const a = new Uint32Array(1);
  globalThis.crypto.getRandomValues(a);
  return a[0] / 4294967296;
}

export function rollRarity(weights, rng) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let x = rng() * total;
  for (const [k, w] of entries) {
    if (x < w) return k;
    x -= w;
  }
  return entries[entries.length - 1][0];
}

export function rollVariant(card, mult, rng) {
  // un seul tirage, réparti entre les variantes autorisées
  let x = rng() * 100;
  for (const [v, pct] of Object.entries(VARIANT_RATES)) {
    if (!card.variants.includes(v)) continue;
    const p = pct * mult;
    if (x < p) return v;
    x -= p;
  }
  return 'normal';
}

// Semaine courante (lundi 00 h, heure locale) : index de rotation des événements.
export function weekIndex(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
  return Math.floor((days + 3) / 7); // 1er janvier 1970 = jeudi
}

export function currentEvent(date = new Date()) {
  const ev = EVENTS[weekIndex(date) % EVENTS.length];
  const d = new Date(date);
  const dow = (d.getDay() + 6) % 7; // lundi = 0
  return { ...ev, daysLeft: 7 - dow };
}

export function poolFor(type, catalog, opts = {}) {
  const def = BOOSTERS[type];
  if (!def) throw new Error(`Booster inconnu : ${type}`);
  if (def.pool === 'faction') {
    if (!opts.faction) throw new Error('Faction manquante pour le booster de faction');
    return catalog.cards.filter((c) => c.faction === opts.faction);
  }
  if (def.pool === 'event') {
    const ev = opts.event || currentEvent();
    return catalog.cards.filter((c) => ev.factions.includes(c.faction));
  }
  return catalog.cards;
}

function groupByRarity(pool) {
  const g = {};
  for (const r of RARITY_ORDER) g[r] = [];
  pool.forEach((c) => g[c.rarity].push(c));
  return g;
}

// Si une rareté n'existe pas dans le pool, on descend à la rareté inférieure disponible.
function pickCard(groups, rarity, rng) {
  let i = RARITY_ORDER.indexOf(rarity);
  while (i >= 0 && groups[RARITY_ORDER[i]].length === 0) i--;
  if (i < 0) {
    i = RARITY_ORDER.findIndex((r) => groups[r].length > 0);
    if (i < 0) throw new Error('Pool de tirage vide');
  }
  const list = groups[RARITY_ORDER[i]];
  return list[Math.floor(rng() * list.length)];
}

/**
 * Ouvre un booster.
 * @returns {{cards: Array<{id, rarity, variant, slot}>, pity: {sinceHR, sinceM}, guaranteed: null|'hr'|'m'}}
 */
export function drawBooster(type, catalog, { rng = cryptoRandom, pity = { sinceHR: 0, sinceM: 0 }, faction, event } = {}) {
  const def = BOOSTERS[type];
  const groups = groupByRarity(poolFor(type, catalog, { faction, event }));
  const slots = def.slots.slice();
  let guaranteed = null;
  const last = slots.length - 1;
  if (pity.sinceM >= PITY.m - 1) { slots[last] = 'mPlus'; guaranteed = 'm'; }
  else if (pity.sinceHR >= PITY.hr - 1 && !['hrPlus', 'mPlus'].includes(slots[last])) { slots[last] = 'hrPlus'; guaranteed = 'hr'; }
  const cards = slots.map((slot) => {
    const rarity = rollRarity(TABLES[slot].weights, rng);
    const card = pickCard(groups, rarity, rng);
    let variant = rollVariant(card, def.variantMult, rng);
    if (def.minVariant && variant === 'normal' && card.variants.includes(def.minVariant)) variant = def.minVariant; /* v394 : Booster de l'Abysse, finition garantie */
    return { id: card.id, rarity: card.rarity, variant, slot };
  });
  const idx = (r) => RARITY_ORDER.indexOf(r);
  const gotHR = cards.some((c) => idx(c.rarity) >= idx('HR'));
  const gotM = cards.some((c) => idx(c.rarity) >= idx('M'));
  return {
    cards,
    guaranteed,
    pity: { sinceHR: gotHR ? 0 : pity.sinceHR + 1, sinceM: gotM ? 0 : pity.sinceM + 1 },
  };
}

// Probabilités affichées au joueur, par emplacement et pour l'ensemble du booster.
export function boosterOdds(type) {
  const def = BOOSTERS[type];
  const slots = def.slots.map((s) => {
    const w = TABLES[s].weights;
    const total = Object.values(w).reduce((a, b) => a + b, 0);
    return { table: s, label: TABLES[s].label, odds: Object.fromEntries(RARITY_ORDER.map((r) => [r, ((w[r] || 0) / total) * 100])) };
  });
  const atLeast = (keys) => 100 * (1 - slots.reduce((p, s) => p * (1 - keys.reduce((a, k) => a + s.odds[k], 0) / 100), 1));
  return { slots, atLeastHR: atLeast(['HR', 'M', 'S']), atLeastM: atLeast(['M', 'S']) };
}
