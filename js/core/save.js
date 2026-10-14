// Sauvegarde locale versionnée (localStorage), migration, export / import.
// La sauvegarde reste sur l'appareil : elle n'est synchronisée nulle part.
import { ECONOMY, OLD_VARIANTS, SAVE_VERSION, SAVE_KEY, SAVE_BACKUP_KEY, EXPORT_PREFIX } from '../config.js';
import { levelFromDups } from './army.js';

export function today(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function defaultSave(now = Date.now()) {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    shards: ECONOMY.start.shards,
    ash: ECONOMY.start.ash,
    tickets: { standard: 0, premium: 0, ...ECONOMY.start.tickets },
    collection: {},       // id -> { n, v: {variante: nombre}, first, isNew }
    deciphered: {},       // id -> true : nom révélé sans posséder la carte
    pity: { sinceHR: 0, sinceM: 0 },
    xp: 0,
    level: 1,
    achievements: {},     // clé -> date
    setsDone: {},         // clé -> date
    factionsDone: {},     // faction -> date
    titles: ['Novice des Sceaux'],
    title: 'Novice des Sceaux',
    frames: ['base'],
    frame: 'base',
    avatar: null,         // id de carte possédée
    showcase: [],         // jusqu'à 3 cartes mises en avant
    daily: { last: null, streak: 0 },
    freePack: { stock: 1, since: now }, // booster standard gratuit rechargeable
    stats: { boosters: 0, cards: 0, crafted: 0, daily: 0, ashEarned: 0, shardsSpent: 0, fused: 0, rituals: 0, ritualsWon: 0, pulls: { C: 0, PC: 0, R: 0, HR: 0, M: 0, S: 0 }, expHR: 0, gotHR: 0 },
    missions: { day: null, list: [], bonus: false }, // missions du jour
    best: [],             // plus belles ouvertures (score décroissant)
    fervor: {},           // 'id:variante' -> échecs de rituel accumulés
    items: {},            // objets possédés : clé -> nombre
    itemBuys: { day: null },
    tips: {},             // bulles d'aide déjà vues
    fame: {},             // Renommée : id de créature -> points (victoires vécues)
    season: { id: null, best: 0, claimed: [] }, // saison mensuelle de la Descente
    hunt: {},             // Bestiaire de chasse : id de créature -> nombre de victoires
    // Arsenal : objets (id -> { b: modèle, r: rareté, f: forge, a: propriété }), équipement par héros,
    // coffres et clés (un cadeau de départ pour découvrir), fer runique, garantie de légendaire.
    team: [],             // 5 cartes : 3 au combat, 2 en réserve
    teamPresets: [],      // équipes enregistrées : { name, ids }
    chests: { bois: 0, fer: 0, or: 0, abyssal: 0 }, // coffres (pleins de boosters)
    descent: { day: null, used: 0, bestToday: 0, best: 0, runs: 0, run: null },
    history: [],          // dernières ouvertures
    recent: [],           // dernières découvertes (ids)
    settings: { sound: true, volume: 0.7, music: true, musicVol: 0.55, haptics: true, loud: false, motion: 'auto', decor: 'riche', quality: 'auto', fastOpen: false, defense: 'on', textSize: 'normal', contrast: false, dev: false },
    seenIntro: false,
    // Extension : gardiens vaincus, relations découvertes, formes choisies, récits, Duels des Sceaux,
    // Chasse aux Reliques et Guerre des Factions. Tous facultatifs : une sauvegarde ancienne les reçoit vides.
    bossesBeaten: {},     // clé de gardien -> date de la première victoire
    relations: {},        // clé de relation -> date de découverte
    forms: {},            // id -> 'corrompue' (forme choisie)
    lore: {},             // fragment de récit -> date de déblocage
    sceaux: { wins: 0, losses: 0, draws: 0, beaten: {}, day: null, paidToday: 0, streak: 0, best: 0, history: [] },
    relics: { best: 0, runs: 0, wins: 0, run: null, last: null, day: null, paidToday: 0 },
    war: { week: null, side: null, points: 0, used: {}, claimed: {}, history: [], report: null },
  };
}

// Migrations successives : chaque fonction fait passer de la version n à n+1.
const MIGRATIONS = {
  // v1 (prototype) : la collection s'appelait « owned » et ne stockait que le nombre d'exemplaires.
  1: (s) => {
    const collection = {};
    for (const [id, n] of Object.entries(s.owned || {})) collection[id] = { n, v: { normal: n }, first: s.createdAt || Date.now(), isNew: false };
    const { owned, ...rest } = s;
    return { ...rest, collection, version: 2 };
  },
};

export function migrate(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Sauvegarde illisible');
  let s = { ...raw };
  if (typeof s.version !== 'number') s.version = 1;
  if (s.version > SAVE_VERSION) throw new Error('Cette sauvegarde provient d’une version plus récente du jeu.');
  while (s.version < SAVE_VERSION) {
    const m = MIGRATIONS[s.version];
    if (!m) throw new Error(`Migration manquante depuis la version ${s.version}`);
    s = m(s);
  }
  // Complète les champs ajoutés depuis (valeurs par défaut), sans écraser l'existant.
  const d = defaultSave(s.createdAt || Date.now());
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  s.settings = { ...d.settings, ...s.settings };
  s.stats = { ...d.stats, ...s.stats };
  s.tickets = { ...d.tickets, ...s.tickets };
  s.pity = { ...d.pity, ...s.pity };
  // objets imbriqués ajoutés au fil des versions : complétés sans écraser l'existant
  s.stats.pulls = { ...d.stats.pulls, ...(s.stats.pulls || {}) };
  for (const k of ['descent', 'missions', 'freePack', 'daily', 'itemBuys', 'chests', 'sceaux', 'relics', 'war', 'season']) s[k] = { ...d[k], ...(s[k] && typeof s[k] === 'object' ? s[k] : {}) };
  if (!Array.isArray(s.team)) s.team = [];
  if (!Array.isArray(s.teamPresets)) s.teamPresets = [];
  s.teamPresets = s.teamPresets.filter((p) => p && typeof p.name === 'string' && Array.isArray(p.ids)).slice(0, 4);
  for (const k of ['items', 'fervor', 'collection', 'deciphered', 'achievements', 'setsDone', 'factionsDone', 'hunt', 'fame', 'bossesBeaten', 'relations', 'forms', 'lore']) if (!s[k] || typeof s[k] !== 'object') s[k] = {};
  delete s.salles; // les Salles Oubliées ont été supprimées (v206)
  for (const [k, sub] of [['sceaux', 'beaten'], ['war', 'used'], ['war', 'claimed']]) if (!s[k][sub] || typeof s[k][sub] !== 'object') s[k][sub] = {};
  for (const [k, sub] of [['sceaux', 'history'], ['war', 'history']]) if (!Array.isArray(s[k][sub])) s[k][sub] = [];
  if (!Array.isArray(s.season.claimed)) s.season.claimed = [];
  for (const k of ['best', 'recent', 'history', 'showcase', 'titles', 'frames']) if (!Array.isArray(s[k])) s[k] = d[k];
  // Variantes retirées : les exemplaires deviennent holographiques ou or (rien n'est perdu)
  for (const e of Object.values(s.collection)) {
    if (!e || !e.v) continue;
    for (const [o, to] of Object.entries(OLD_VARIANTS)) if (e.v[o]) { e.v[to] = (e.v[to] || 0) + e.v[o]; delete e.v[o]; }
    // Fournaise : le niveau ne vient plus des doublons, il est enregistré (ancien niveau conservé)
    if (!e.lv) e.lv = levelFromDups(Math.max(0, (e.n || 1) - 1)).level;
  }
  for (const k of Object.keys(s.fervor)) if (OLD_VARIANTS[k.split(':')[1]]) delete s.fervor[k];
  for (const h of [...s.history, ...s.best]) for (const c of h?.cards || []) if (OLD_VARIANTS[c.v]) c.v = OLD_VARIANTS[c.v];
  return s;
}

export function loadSave(storage) {
  for (const key of [SAVE_KEY, SAVE_BACKUP_KEY]) {
    try {
      const txt = storage.getItem(key);
      if (txt) return { save: migrate(JSON.parse(txt)), source: key };
    } catch (e) {
      // sauvegarde corrompue : on tente la copie de secours
    }
  }
  return { save: defaultSave(), source: null };
}

export function writeSave(storage, save) {
  save.updatedAt = Date.now();
  const txt = JSON.stringify(save);
  const prev = storage.getItem(SAVE_KEY);
  if (prev) storage.setItem(SAVE_BACKUP_KEY, prev);
  storage.setItem(SAVE_KEY, txt);
}

// Encodage texte sûr (UTF-8 -> base64) pour le code de transfert.
function toB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}
function fromB64(b64) {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
function checksum(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

export function exportCode(save) {
  const json = JSON.stringify(save);
  return `${EXPORT_PREFIX}${checksum(json)}:${toB64(json)}`;
}

export function importCode(code) {
  const txt = String(code || '').trim();
  if (txt.startsWith('{')) return migrate(JSON.parse(txt)); // fichier JSON brut
  if (!txt.startsWith(EXPORT_PREFIX)) throw new Error('Ce texte n’est pas un code de sauvegarde ABYSSAL.');
  const rest = txt.slice(EXPORT_PREFIX.length);
  const i = rest.indexOf(':');
  const sum = rest.slice(0, i), b64 = rest.slice(i + 1).replace(/\s+/g, '');
  let json;
  try { json = fromB64(b64); } catch { throw new Error('Code de sauvegarde incomplet ou abîmé.'); }
  if (checksum(json) !== sum) throw new Error('Le code a été modifié ou tronqué (somme de contrôle invalide).');
  return migrate(JSON.parse(json));
}
