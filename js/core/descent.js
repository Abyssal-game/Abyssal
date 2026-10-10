// La Descente : expédition quotidienne dans l'Abysse avec une équipe de cartes.
// Moteur pur (aucun accès au navigateur) : unités, combats automatiques, étages, butin.
import { RARITY_ORDER } from '../config.js';

export const DESCENT = {
  teamSize: 6,
  front: 3,              // créatures en première ligne, les autres attendent derrière
  torches: 3,            // expéditions par jour
  bossEvery: 5,
  woundHours: 24,        // une carte tombée se repose ce temps-là
  variantBonus: { normal: 0, alt: 0.03, holo: 0.05, corrupt: 0.06, chroma: 0.08, ancestral: 0.1, gold: 0.12, galaxy: 0.16, special: 0.16 },
  levelBonus: 0.06,      // +6 % de statistiques par niveau de carte
  maxLevel: 10,
  xpPerFight: 10,
  factionBonus: [[5, 0.2], [3, 0.1]], // 5 cartes d'une faction : +20 %, 3 : +10 %
  cursedLoot: 2,
};

export const BLESSINGS = {
  blades:  { name: 'Lames affûtées',   desc: '+2 ATQ pour toute l’équipe.' },
  scales:  { name: 'Peau d’écailles',  desc: 'Chaque dégât subi est réduit de 1.' },
  thirst:  { name: 'Soif de sang',     desc: 'Toute l’équipe se soigne de la moitié des dégâts infligés.' },
  vigor:   { name: 'Vigueur',          desc: '+20 % de PV max, et soin complet de l’équipe.' },
  haste:   { name: 'Pas du vent',      desc: '+3 VIT pour toute l’équipe.' },
  greed:   { name: 'Avidité',          desc: 'Le butin des prochains combats augmente de 30 %.' },
  ward:    { name: 'Sceau protecteur', desc: 'Chaque créature annule le premier coup de chaque combat.' },
  fury:    { name: 'Rage du Néant',    desc: 'Les attaques ont 20 % de chances de frapper deux fois.' },
};

// Générateur déterministe à partir d'une chaîne (même donjon pour tout le monde le même jour).
export function rngOf(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
const pick = (rng, list) => list[Math.floor(rng() * list.length)];

export function cardLevel(xp = 0) { return Math.min(DESCENT.maxLevel, 1 + Math.floor(Math.sqrt(xp / 20))); }
export function levelXp(level) { return 20 * (level - 1) ** 2; }

// Valeur d'une capacité : celle de la carte, sinon dérivée de sa magie.
const abilValue = (a, mag) => (typeof a.value === 'number' ? a.value : Math.max(1, Math.round(mag / 2)));

let uidSeq = 0;
export function makeUnit(card, { side = 'ally', level = 1, variant = 'normal', mult = 1, bonus = 0, blessings = [] } = {}) {
  const st = card.stats;
  const k = (1 + (level - 1) * DESCENT.levelBonus + (DESCENT.variantBonus[variant] || 0) + bonus) * mult;
  const abil = {};
  for (const a of card.abilities || []) abil[a.key] = abilValue(a, st.mag);
  const u = {
    uid: `${side[0]}${++uidSeq}`, id: card.id, name: card.name, rarity: card.rarity, faction: card.faction, side, variant, level,
    atk: Math.max(1, Math.round(st.atk * k)), def: Math.round(st.def * k), spd: st.spd, mag: st.mag,
    maxHp: Math.max(4, Math.round(st.hp * 2 * k)), abil,
  };
  if (side === 'ally') {
    if (blessings.includes('blades')) u.atk += 2;
    if (blessings.includes('haste')) u.spd += 3;
    if (blessings.includes('vigor')) u.maxHp = Math.round(u.maxHp * 1.2);
    if (blessings.includes('scales')) u.abil.armor = (u.abil.armor || 0) + 1;
    if (blessings.includes('thirst')) u.abil.drain = u.abil.drain || 1;
    if (blessings.includes('fury')) u.fury = true;
    if (blessings.includes('ward')) u.abil.aegis = 1;
  }
  u.hp = u.maxHp;
  return u;
}

// Bonus de faction de l'équipe
export function factionBonus(cards) {
  const count = {};
  cards.forEach((c) => { count[c.faction] = (count[c.faction] || 0) + 1; });
  const best = Math.max(0, ...Object.values(count));
  const f = Object.keys(count).find((k) => count[k] === best);
  for (const [n, b] of DESCENT.factionBonus) if (best >= n) return { faction: f, n: best, bonus: b };
  return { faction: null, n: best, bonus: 0 };
}

// Puissance indicative d'une unité (affichage, choix des ennemis)
export const unitPower = (u) => Math.round(u.atk * 2 + u.def + u.spd * 0.5 + u.maxHp * 0.5);

// ——— Combat automatique ———————————————————————————————————————————————
// allies / enemies : listes d'unités (copiées). Renvoie le vainqueur, les unités finales
// et la liste des événements pour l'animation.
export function fight(alliesIn, enemiesIn, rng) {
  const allies = alliesIn.map((u) => ({ ...u, abil: { ...u.abil }, status: {} }));
  const enemies = enemiesIn.map((u) => ({ ...u, abil: { ...u.abil }, status: {} }));
  const all = [...allies, ...enemies];
  const ev = [];
  const alive = (l) => l.filter((u) => u.hp > 0);
  const frontOf = (l) => alive(l).slice(0, DESCENT.front);
  const foes = (u) => (u.side === 'ally' ? enemies : allies);
  const friends = (u) => (u.side === 'ally' ? allies : enemies);
  const onField = new Set();

  const damage = (src, tgt, amount, kind = 'hit') => {
    if (tgt.hp <= 0) return 0;
    let d = Math.max(1, Math.round(amount) - (tgt.abil.armor || 0));
    if (tgt.status.aegis) { tgt.status.aegis = false; ev.push({ t: 'block', u: tgt.uid }); return 0; }
    d = Math.min(d, tgt.hp);
    tgt.hp -= d;
    ev.push({ t: kind, a: src ? src.uid : null, u: tgt.uid, d, hp: tgt.hp });
    if (tgt.hp <= 0) die(tgt, src);
    return d;
  };
  const heal = (u, n) => {
    if (u.hp <= 0 || n <= 0) return;
    const h = Math.min(n, u.maxHp - u.hp);
    if (h > 0) { u.hp += h; ev.push({ t: 'heal', u: u.uid, d: h, hp: u.hp }); }
  };
  function die(u, killer) {
    ev.push({ t: 'die', u: u.uid });
    if (u.abil.death) frontOf(foes(u)).forEach((f) => damage(u, f, u.abil.death, 'burst'));
    if (u.abil.relic) {
      const rem = { uid: `${u.uid}r`, id: u.id, name: 'Reste', rarity: 'C', faction: u.faction, side: u.side, variant: 'normal', level: 1, atk: 1, def: 0, spd: 1, mag: 0, maxHp: 4, hp: 4, abil: {}, status: {}, remnant: true };
      const list = friends(u);
      list.splice(list.indexOf(u) + 1, 0, rem);
      all.push(rem);
      ev.push({ t: 'summon', u: rem.uid, after: u.uid, unit: { ...rem } });
    }
    if (killer && killer.hp > 0 && killer.abil.devour) { killer.atk += 1; killer.maxHp += 2; killer.hp += 2; ev.push({ t: 'grow', u: killer.uid, atk: killer.atk, hp: killer.hp }); }
  }
  // Arrivée sur le terrain : capacités d'invocation
  function enter(u) {
    if (onField.has(u.uid)) return;
    onField.add(u.uid);
    u.status.aegis = !!u.abil.aegis;
    ev.push({ t: 'enter', u: u.uid });
    const opp = frontOf(foes(u));
    const danger = () => frontOf(foes(u)).sort((a, b) => b.atk - a.atk)[0];
    if (u.abil.strike && opp.length) damage(u, danger(), u.abil.strike + 1, 'spell');
    if (u.abil.curse && opp.length) damage(u, pick(rng, frontOf(foes(u))), u.abil.curse, 'spell');
    if (u.abil.cataclysm) [...frontOf(foes(u)), ...frontOf(friends(u)).filter((f) => f !== u)].forEach((f) => damage(u, f, u.abil.cataclysm, 'burst'));
    if (u.abil.bless) frontOf(friends(u)).forEach((f) => heal(f, u.abil.bless + 1));
    if (u.abil.command) frontOf(friends(u)).filter((f) => f !== u).forEach((f) => { f.atk += u.abil.command; ev.push({ t: 'grow', u: f.uid, atk: f.atk, hp: f.hp }); });
    if (u.abil.drown && opp.length) { const t = danger(); if (t) { t.status.stun = true; ev.push({ t: 'stun', u: t.uid }); } }
    if (u.abil.omen) { u.atk += 1; ev.push({ t: 'grow', u: u.uid, atk: u.atk, hp: u.hp }); }
  }
  const refresh = () => { [...frontOf(allies), ...frontOf(enemies)].forEach(enter); };

  function target(u) {
    let opp = frontOf(foes(u));
    if (!opp.length) return null;
    const guards = opp.filter((o) => o.abil.guard);
    if (guards.length) opp = guards;
    const visible = opp.filter((o) => !(o.abil.elusive && !o.status.revealed) && !(o.abil.fear && u.atk <= 2));
    if (visible.length) opp = visible;
    // préfère achever une cible affaiblie, avec une part de hasard
    return rng() < 0.6 ? opp.slice().sort((a, b) => a.hp - b.hp)[0] : pick(rng, opp);
  }
  function attack(u) {
    const t = target(u);
    if (!t) return;
    u.status.revealed = true;
    const dealt = damage(u, t, Math.max(1, u.atk - Math.floor(t.def / 3)));
    if (t.hp > 0 && u.abil.venom) t.status.venom = (t.status.venom || 0) + 1;
    if (u.abil.drain && dealt) heal(u, Math.ceil(dealt / 2));
  }

  refresh();
  for (let round = 1; round <= 30; round++) {
    if (!alive(allies).length || !alive(enemies).length) break;
    ev.push({ t: 'round', n: round });
    for (const u of [...frontOf(allies), ...frontOf(enemies)]) {
      if (u.abil.regen) heal(u, u.abil.regen);
      if (u.status.venom) damage(null, u, u.status.venom, 'venom');
    }
    const order = [...frontOf(allies), ...frontOf(enemies)]
      .map((u) => ({ u, k: u.spd + (u.abil.first || (round === 1 && u.abil.charge) ? 100 : 0) + rng() }))
      .sort((a, b) => b.k - a.k).map((x) => x.u);
    for (const u of order) {
      if (u.hp <= 0) continue;
      if (!alive(allies).length || !alive(enemies).length) break;
      if (u.status.stun) { u.status.stun = false; ev.push({ t: 'stunned', u: u.uid }); continue; }
      const hits = (u.abil.frenzy ? 2 : 1) + (u.fury && rng() < 0.2 ? 1 : 0);
      for (let i = 0; i < hits && u.hp > 0; i++) attack(u);
      refresh();
    }
  }
  const won = alive(allies).length > 0 && !alive(enemies).length;
  return { won, allies, enemies, events: ev };
}

// ——— Étages ———————————————————————————————————————————————————————
const ROOM_TYPES = ['fight', 'fight', 'elite', 'altar', 'rest', 'treasure'];
export const ROOMS = {
  fight:    { name: 'Combat',         desc: 'Des créatures barrent le passage.' },
  elite:    { name: 'Élite',          desc: 'Un adversaire redoutable. Butin doublé.' },
  altar:    { name: 'Autel ancien',   desc: 'Choisis une bénédiction pour toute l’expédition.' },
  rest:     { name: 'Source sacrée',  desc: 'Ton équipe récupère 40 % de ses PV.' },
  treasure: { name: 'Trésor oublié',  desc: 'Un coffre, sans gardien… en apparence.' },
  boss:     { name: 'Gardien',        desc: 'Le gardien de l’étage. Victoire : coffre et booster.' },
};

// Deux portes proposées à chaque étage (les étages multiples de 5 sont des gardiens).
export function floorDoors(day, floor) {
  if (floor % DESCENT.bossEvery === 0) return ['boss'];
  const rng = rngOf(`doors:${day}:${floor}`);
  const a = pick(rng, ROOM_TYPES);
  let b = pick(rng, ROOM_TYPES);
  for (let i = 0; i < 6 && b === a; i++) b = pick(rng, ROOM_TYPES);
  return floor === 1 ? ['fight', b === 'fight' ? 'rest' : b] : [a, b];
}

// Ennemis d'un étage : plus nombreux, plus rares et plus forts en profondeur.
export function floorEnemies(catalog, day, floor, room) {
  const rng = rngOf(`enemies:${day}:${floor}:${room}`);
  const depth = floor - 1;
  const rIdx = (r) => RARITY_ORDER.indexOf(r);
  const maxR = Math.min(5, 1 + Math.floor(depth / 3));
  const pool = catalog.cards.filter((c) => rIdx(c.rarity) <= Math.min(maxR, 3));
  const n = room === 'boss' ? 2 : Math.min(6, 3 + Math.floor(depth / 4));
  const mult = 0.55 + depth * 0.075 + (room === 'elite' ? 0.25 : 0);
  const out = [];
  if (room === 'boss') {
    const bossPool = catalog.cards.filter((c) => rIdx(c.rarity) >= (floor >= 15 ? 4 : 3));
    out.push(makeUnit(pick(rng, bossPool), { side: 'enemy', mult: mult * 1.9 + 0.2 }));
  }
  for (let i = 0; i < n; i++) out.push(makeUnit(pick(rng, pool), { side: 'enemy', mult }));
  return out;
}

// Butin d'une salle (avant le multiplicateur d'avidité ou de malédiction)
export function roomLoot(floor, room, rng) {
  const base = 12 + floor * 5;
  if (room === 'fight') return { shards: base, ash: rng() < 0.4 ? 5 + floor : 0 };
  if (room === 'elite') return { shards: base * 2, ash: 10 + floor * 2 };
  if (room === 'treasure') return { shards: Math.round(base * 1.5), ash: rng() < 0.5 ? 8 + floor : 0 };
  if (room === 'boss') return { shards: base * 3, ash: 20 + floor * 3, tickets: { [floor >= 15 ? 'premium' : 'standard']: 1 } };
  return { shards: 0, ash: 0 };
}

export function blessingChoices(day, floor, owned = []) {
  const rng = rngOf(`altar:${day}:${floor}`);
  const keys = Object.keys(BLESSINGS).filter((k) => !owned.includes(k));
  const out = [];
  while (out.length < 3 && keys.length) out.push(keys.splice(Math.floor(rng() * keys.length), 1)[0]);
  return out;
}
