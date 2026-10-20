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
    welcomeGift: ECONOMY.start.tickets.standard || 0, /* v518 : boosters offerts à l'arrivée (parmi les tickets standard), montrés comme un cadeau */
    collection: {},       // id -> { n, v: {variante: nombre}, first, isNew }
    deciphered: {},       // id -> true : nom révélé sans posséder la carte
    pity: { sinceHR: 0, sinceM: 0 },
    xp: 0,
    level: 1,
    achievements: {},     // clé -> date
    setsDone: {},         // clé -> date
    factionsDone: {},     // faction -> date
    titles: ['Novice de l’Abysse'],
    name: '',             // nom choisi par le joueur (profil)
    title: 'Novice de l’Abysse',
    frames: ['base'],
    frame: 'base',
    avatar: null,         // id de carte possédée
    showcase: [],         // jusqu'à 3 cartes mises en avant
    daily: { last: null, streak: 0 },
    freePack: { day: null }, // booster standard gratuit du jour (jour de la dernière ouverture)
    stats: { boosters: 0, cards: 0, crafted: 0, daily: 0, ashEarned: 0, shardsSpent: 0, fused: 0, rituals: 0, ritualsWon: 0, pulls: { C: 0, PC: 0, R: 0, HR: 0, M: 0, S: 0 }, expHR: 0, gotHR: 0 },
    missions: { day: null, list: [], bonus: false }, // missions du jour
    best: [],             // plus belles ouvertures (score décroissant)
    fervor: {},           // 'id:variante' -> échecs de rituel accumulés
    items: {},            // objets possédés : clé -> nombre
    itemBuys: { day: null },
    tips: {},             // bulles d'aide déjà vues
    favs: {},             // favoris : id -> date
    cstats: {},           // défis de créature : id -> { w, k, b }
    cdone: {},            // défis récompensés : id -> { clé: date }
    fame: {},             // Renommée : id de créature -> points (victoires vécues)
    season: { id: null, best: 0, claimed: [] }, // saison mensuelle (v407 : Épreuves du jour gagnées dans le mois)
    trials: { day: null, done: [null, null, null], score: 0, cur: null, battle: null }, // v407 : Épreuves du jour
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
    bossWins: {},         // v348 : clé de gardien -> nombre de victoires
    relations: {},        // clé de relation -> date de découverte
    forms: {},            // id -> 'corrompue' (forme choisie)
    lore: {},             // fragment de récit -> date de déblocage
    sceaux: { wins: 0, losses: 0, draws: 0, beaten: {}, day: null, paidToday: 0, streak: 0, best: 0, history: [] },
    masques: { wins: 0, losses: 0, beaten: {}, day: null, paidToday: 0, dailyDone: null, streak: 0, best: 0, history: [], cur: null }, /* v425 : la Cour des Masques */
    encheres: { wins: 0, losses: 0, beaten: {}, feats: {}, day: null, paidToday: 0, dailyDone: null, streak: 0, best: 0, history: [], cur: null }, /* v427 : les Enchères de Mammon */
    pacte: { wins: 0, losses: 0, beaten: {}, feats: {}, day: null, paidToday: 0, dailyDone: null, streak: 0, best: 0, history: [], cur: null }, /* v449 : Le Pacte */
    cryptes: { wins: 0, losses: 0, beaten: {}, feats: {}, day: null, paidToday: 0, dailyDone: null, streak: 0, best: 0, history: [], cur: null }, /* v450 : Les Cryptes */
    autels: { wins: 0, losses: 0, beaten: {}, day: null, paidToday: 0, dailyDone: null, streak: 0, best: 0, history: [], cur: null, deck: null, lent: [] }, /* v451 : Les Trois Autels */
    enigmes: { day: null, tries: [0, 0, 0], stars: [0, 0, 0], done: [false, false, false], chest: null, streak: 0, lastFull: null, solved: 0, starsTotal: 0 }, /* v427 : les Énigmes des Sceaux */
    mp: { day: null, paid: 0, done: {} }, /* v519 : mini-jeux contre d'autres joueurs (récompenses du jour, parties déjà encaissées) */
    versus: { played: 0, wins: 0, losses: 0, ties: 0, won: 0, spent: 0, done: {} }, /* v512 : Versus Booster (défis de boosters entre joueurs) */
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
  // v310 : « version » absente ou en texte : une sauvegarde qui a déjà une collection n'est pas un prototype v1
  if (typeof s.version !== 'number') s.version = s.collection && typeof s.collection === 'object' ? (Number(s.version) || SAVE_VERSION) : 1;
  if (s.version > SAVE_VERSION) throw new Error('Cette sauvegarde provient d’une version plus récente du jeu.');
  while (s.version < SAVE_VERSION) {
    const m = MIGRATIONS[s.version];
    if (!m) throw new Error(`Migration manquante depuis la version ${s.version}`);
    s = m(s);
  }
  const hadGift = typeof s.welcomeGift === 'number';
  // Complète les champs ajoutés depuis (valeurs par défaut), sans écraser l'existant.
  const d = defaultSave(s.createdAt || Date.now());
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  s.settings = { ...d.settings, ...s.settings };
  if (s.settings.defense === 'easy') s.settings.defense = 'on'; // v333 : défense « assistée » retirée
  s.stats = { ...d.stats, ...s.stats };
  s.tickets = { ...d.tickets, ...s.tickets };
  s.pity = { ...d.pity, ...s.pity };
  // objets imbriqués ajoutés au fil des versions : complétés sans écraser l'existant
  s.stats.pulls = { ...d.stats.pulls, ...(s.stats.pulls || {}) };
  for (const k of ['descent', 'missions', 'freePack', 'daily', 'itemBuys', 'chests', 'sceaux', 'masques', 'encheres', 'pacte', 'cryptes', 'autels', 'enigmes', 'versus', 'mp', 'relics', 'war', 'season', 'trials']) s[k] = { ...d[k], ...(s[k] && typeof s[k] === 'object' ? s[k] : {}) };
  if (!Array.isArray(s.team)) s.team = [];
  if (!Array.isArray(s.teamPresets)) s.teamPresets = [];
  s.teamPresets = s.teamPresets.filter((p) => p && typeof p.name === 'string' && Array.isArray(p.ids)).slice(0, 4);
  for (const k of ['items', 'bossWins', 'fervor', 'collection', 'deciphered', 'achievements', 'setsDone', 'factionsDone', 'hunt', 'fame', 'favs', 'cstats', 'cdone', 'bossesBeaten', 'relations', 'forms', 'lore']) if (!s[k] || typeof s[k] !== 'object') s[k] = {};
  delete s.salles; // les Salles Oubliées ont été supprimées (v206)
  for (const [k, sub] of [['sceaux', 'beaten'], ['masques', 'beaten'], ['encheres', 'beaten'], ['pacte', 'beaten'], ['cryptes', 'beaten'], ['encheres', 'feats'], ['pacte', 'feats'], ['cryptes', 'feats'], ['autels', 'beaten'], ['war', 'used'], ['war', 'claimed'], ['versus', 'done']]) if (!s[k][sub] || typeof s[k][sub] !== 'object') s[k][sub] = {};
  for (const [k, sub] of [['sceaux', 'history'], ['masques', 'history'], ['encheres', 'history'], ['pacte', 'history'], ['cryptes', 'history'], ['autels', 'history'], ['war', 'history']]) if (!Array.isArray(s[k][sub])) s[k][sub] = [];
  if (!Array.isArray(s.season.claimed)) s.season.claimed = [];
  for (const k of ['best', 'recent', 'history', 'showcase', 'titles', 'frames']) if (!Array.isArray(s[k])) s[k] = d[k];
  // Variantes retirées : les exemplaires deviennent holographiques ou or (rien n'est perdu)
  for (const e of Object.values(s.collection)) {
    if (!e || !e.v) continue;
    for (const [o, to] of Object.entries(OLD_VARIANTS)) if (e.v[o]) { e.v[to] = (e.v[to] || 0) + e.v[o]; delete e.v[o]; }
    // Fournaise : le niveau ne vient plus des doublons, il est enregistré (ancien niveau conservé)
    if (!e.lv) e.lv = levelFromDups(Math.max(0, (e.n || 1) - 1)).level;
    // v373 : une finition (holo, or, cosmique) débloque aussi la version normale de la carte
    if (!e.v.normal && Object.values(e.v).some((k) => k > 0)) { e.v.normal = 1; e.n = (e.n || 0) + 1; }
  }
  for (const k of Object.keys(s.fervor)) if (OLD_VARIANTS[k.split(':')[1]]) delete s.fervor[k];
  for (const h of [...s.history, ...s.best]) for (const c of h?.cards || []) if (OLD_VARIANTS[c.v]) c.v = OLD_VARIANTS[c.v];
  // v403 : le titre de départ « Novice des Sceaux » devient « Novice de l’Abysse » (les Sceaux sont un mini-jeu fermé au début)
  if (Array.isArray(s.titles)) s.titles = [...new Set(s.titles.map((t) => (t === 'Novice des Sceaux' ? 'Novice de l’Abysse' : t)))];
  if (s.title === 'Novice des Sceaux') s.title = 'Novice de l’Abysse';
  // v518 : partie d'avant le cadeau de bienvenue : ses tickets standard restent un cadeau seulement si aucun booster n'a été ouvert
  if (!hadGift) s.welcomeGift = !s.stats?.boosters ? Math.min(ECONOMY.start.tickets.standard || 0, s.tickets?.standard || 0) : 0;
  return s;
}

// v310 : une sauvegarde illisible n'est plus jamais écrasée sans trace. Elle est mise de côté (clé « .illisible ») ;
// si une version plus récente du jeu sait la relire plus tard (cas d'un ancien service worker), elle est restaurée.
export const SAVE_STASH_KEY = `${SAVE_KEY}.illisible`;
export function loadSave(storage) {
  try {
    const stash = storage.getItem(SAVE_STASH_KEY);
    if (stash) { const save = migrate(JSON.parse(stash)); return { save, source: SAVE_STASH_KEY, restored: true }; }
  } catch (e) { /* toujours illisible : elle reste de côté */ }
  let bad = null;
  for (const key of [SAVE_KEY, SAVE_BACKUP_KEY]) {
    let txt = null;
    try {
      txt = storage.getItem(key);
      if (txt) return { save: migrate(JSON.parse(txt)), source: key };
    } catch (e) {
      // sauvegarde corrompue (ou d'une version plus récente) : on tente la copie de secours
      if (txt && !bad) bad = txt;
    }
  }
  if (bad) { try { if (!storage.getItem(SAVE_STASH_KEY)) storage.setItem(SAVE_STASH_KEY, bad); } catch (e) { /* stockage plein */ } }
  return { save: defaultSave(), source: null, unreadable: !!bad };
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

// v499 : une sauvegarde importée ne peut pas ouvrir le Mode Créateur ni les ébauches cachées (Codex, Salle des jeux)
function noDev(s) {
  if (s.settings) { s.settings.dev = false; s.settings.devCode = false; }
  s.devCodex = false; s.devGames = false;
  return s;
}
export function importCode(code) {
  const txt = String(code || '').trim();
  if (txt.startsWith('{')) return noDev(migrate(JSON.parse(txt))); // fichier JSON brut
  if (!txt.startsWith(EXPORT_PREFIX)) throw new Error('Ce texte n’est pas un code de sauvegarde ABYSSAL.');
  const rest = txt.slice(EXPORT_PREFIX.length);
  const i = rest.indexOf(':');
  const sum = rest.slice(0, i), b64 = rest.slice(i + 1).replace(/\s+/g, '');
  let json;
  try { json = fromB64(b64); } catch { throw new Error('Code de sauvegarde incomplet ou abîmé.'); }
  if (checksum(json) !== sum) throw new Error('Le code a été modifié ou tronqué (somme de contrôle invalide).');
  return noDev(migrate(JSON.parse(json)));
}
