// État du joueur et règles de progression. Toute modification passe par ici
// et est enregistrée immédiatement : une carte affichée est une carte sauvegardée.
import { suggestTeam, teamSynergies } from './synergy.js';
import { fameTier, FAME_TIERS, SEASON_STEPS, seasonId } from './renown.js';
export const CHALLENGES = [
  { key: 'w', stat: 'w', n: 10, ash: 25, fame: 3, name: 'Compagnon d’armes', desc: 'Gagne 10 combats avec elle, en restant debout' },
  { key: 'k', stat: 'k', n: 25, ash: 40, fame: 5, name: 'Faucheuse', desc: 'Achève 25 ennemis avec elle' },
  { key: 'b', stat: 'b', n: 1, ash: 60, fame: 8, name: 'Tueuse de gardien', desc: 'Porte le coup fatal à un gardien' },
];
export const WEEK_DAYS = 5; // jours joués dans la semaine pour le coffre de la semaine
export const FIRST_WIN = 50;
export const SHARD_FLOOR_CAP = 25; // au-delà de l'étage 25, les éclats par combat n'augmentent plus // éclats de la toute première victoire
import { FINAL_FLOOR, BOOSTERS, FREE_PACK, BRAISE, TORCHES, ECONOMY, XP, LEVEL_TITLES, LEVEL_FRAMES, RARITY_ORDER, FACTION_ORDER, RARITY, MISSIONS, LUCK_POINTS, ASH_FRAMES, SHOW_ORDER, SHADOW, sublimeObs, VARIANTS, FIN_ORDER, CREATOR_KIT } from '../config.js';
import { drawBooster, cryptoRandom, currentEvent, boosterOdds, weekIndex } from './boosters.js';
import { loadSave, writeSave, defaultSave, today, SAVE_STASH_KEY } from './save.js';
import { CHOC } from './choc.js'; /* v811 */
import { VERSUS_PRIZE, streakMult, STREAK_CHESTS, LEAGUES, LEAGUE_REWARD, leagueIdx, leagueDelta, cardPts } from './versus.js'; /* v735, v807 */
import { CODEX, CODEX_XP, SHOP, CATALOG, FREE_EMOTES, codexTier, seasonFor, tiersOf, freshCodex, pendingOf, CODEX_OPEN, QUEST_KINDS, questsFor, seasonWeek } from './codex.js';
import { rngOf, DESCENT, CHESTS, CHEST_ORDER, CHEST_FLOORS, floorDoors, floorEnemies, namedFoe, floorRewards, enemyLevel, floorFloor, blessingChoices, dailyRule, chestForDepth, shiftChest, enemyScale, lateSoft, bossEase, earlyHp, expectedLevel, cardPower, powerFor, advisedPower, floorForPower, huntStage, HUNT_STAGES, foeTraits, OMENS, omenChoices, CHAPTER, chapterOf, floorFirstReward } from './descent.js';
import { createDuel, autoDuel, duelUnit, bossPowerOf, upgradeDuel, battleReport, GOALS, goalState, startInitiative, act as duelActRaw, useUlt, beginEnemyTurn, nextEnemy, takeSkips, enemyAct, endEnemyTurn, RHYTHM } from './duel.js';
import { bossOf, BOSSES, BOSS_ORDER, VEILLES, VEILLE_START } from './bosses.js';
import { pactChoices, PACTS } from './pacts.js';
import { FORMS, formUnlocked } from './forms.js';
import * as SC from './sceaux.js';
import * as EN from './encheres.js';
import * as PA from './pacte.js';
import * as CR from './cryptes.js';
export const TOURNEY_GAMES = ['sceaux', 'pacte', 'cryptes', 'encheres'];
export const tourneyTables = (k) => (k === 'sceaux' ? SC.RIVALS : k === 'pacte' ? PA.TABLES : k === 'cryptes' ? CR.TABLES : EN.TABLES).map((x) => x.key);
import { MP_REWARD } from './mp.js';
import { FERVOR_START, FERVOR_MAX, FERVOR_CARRY, TALENTS } from './skills.js';
// Créature de la semaine : à partir de cet étage ; gardien vaincu : chance de le recruter
export const WEEKLY_FLOOR = 8;
/* v493 : force attendue d'une équipe à un étage (powerFor), plafonnée à ce qu'une équipe au maximum peut avoir */
export const REF_POW_MAX = 2.55; /* v495 puis v497 : le plafond suit la force conseillée de l'étage 100 */
export const REF_TOL = 1.0; /* v497 : plus de marge : sous la force conseillée de l'étage, l'équipe est pénalisée (passage obligé par la force) */
export const LEVEL_STEEP = 0.8; /* v497 : les hauts niveaux coûtent plus de cendres (au-delà du niveau 4 : +80 % par niveau) */
/* v497 : Persévérance : chaque défaite sur un même chapitre (hors Cauchemar) affaiblit ses ennemis de 3 %, jusqu'à 18 %,
   jusqu'à ce qu'il soit gagné (filet de sécurité contre les murs mesurés au simulateur) */
export const GRIT = { step: 0.02, max: 6 }; // marge : une équipe jusqu'à 15 % sous la force conseillée n'est pas pénalisée
export const refPowFor = (floor) => Math.min(REF_POW_MAX, powerFor(floor)) / REF_TOL;
export const FIGHT_ATK = 1; // force des ennemis ordinaires (réglée par simulation)
export const DESCENT_SHARDS = 0.15; // éclats gagnés dans la Descente : 15 % des montants de base
import { STARTER, COST, TEAM, ULTS, MAX_LEVEL, canUlt, ultOf, roleOf } from './army.js';

const RI = (r) => RARITY_ORDER.indexOf(r);
const ITEM_REFUND = { baume: 80, elixir: 260, parchemin: 120 };

// Petit générateur déterministe (même missions pour une même journée).
function seededRng(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}

export function levelFromXp(xp) {
  let level = 1, rest = xp;
  while (rest >= XP.toNext(level)) { rest -= XP.toNext(level); level++; }
  return { level, into: rest, need: XP.toNext(level) };
}

// Cartes retirées (identifiant → rareté, pour rembourser les exemplaires possédés)
const REMOVED_CARDS = { 'ABY-050': 'HR', 'CEL-046': 'HR' };

export const NIGHTMARE_AT = 20; // record à atteindre pour ouvrir le mode Cauchemar
// v367 : trois paliers de Cauchemar. Chacun s'ouvre en atteignant l'étage NIGHT_TIER_OPEN au palier précédent.
// hp / atk : force des ennemis ; chest : rangs de coffre en plus ; shards : multiplicateur d'éclats
export const NIGHT_TIERS = [null,
  { name: 'Cauchemar', hp: 1.35, atk: 1.25, chest: 1, shards: 1.5 },
  { name: 'Cauchemar II', hp: 1.6, atk: 1.4, chest: 1, shards: 2 },
  { name: 'Cauchemar III', hp: 1.9, atk: 1.6, chest: 2, shards: 2.5 }];
export const NIGHT_TIER_OPEN = 10;
export const nightTier = (run) => (run?.nightmare ? NIGHT_TIERS[run.nightTier || 1] : null);
// v407 : Épreuves du jour
export const TRIALS = [
  { key: 'combat', room: 'fight', name: 'Épreuve du combat', short: 'Combat' },
  { key: 'elite', room: 'elite', name: 'Épreuve de l’élite', short: 'Élite' },
  { key: 'gardien', room: 'boss', name: 'Épreuve du gardien', short: 'Gardien' },
];
// Réglage mesuré (pilote automatique, défense moyenne : 40 % d'esquives, 15 % de parades ; 8 profils d'équipe × 30 jours) :
// environ 55 % de victoires au combat, 61 % à l'élite, 57 % au gardien ; un joueur qui défend à la main fait mieux.
export const TRIAL_OFFSET = [11, 11, 9]; // étages en plus (se resserre avec la force)
export const TRIAL_MULT = [1.61, 2.24, 1.55]; // v800 : +15 % (le propriétaire gagnait trop facilement)
export const TRIAL_RAR = 1; // PV et attaque des ennemis
export const AWAKEN_AT = 30;   // gardiens éveillés à partir de cet étage

// v348 : nombre de jours entre deux dates « AAAA-MM-JJ » (heure locale)
const dayGap = (a, b) => { const p = (x) => { const [y, m, d] = x.split('-').map(Number); return new Date(y, m - 1, d).getTime(); }; return Math.round((p(b) - p(a)) / 864e5); };

// v540 : hasard d'une partie de mini-jeu, gardé dans la partie elle-même (le serveur de partie retrouve exactement les mêmes coups)
function sessRng(st) {
  return () => { st.rs = ((st.rs ?? 1) + 0x6D2B79F5) | 0; let t = st.rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const sessSeed = (seed) => (Number(seed) ^ 0x2545F491) | 0;

/* v796 : cadeaux déjà reçus gardés dans une partie neuve (effacement v739, et compte supprimé puis recréé avec le même e-mail :
   le serveur se souvient de l'e-mail, supabase/19-cadeaux.sql). Pas de 2e cadeau de bienvenue ; booster gratuit, offrande,
   Épreuves, missions, Torches et Braise du jour gardés ; date de création gardée. */
export function keepGifts(s, old) {
  if (!old || typeof old !== 'object') return s;
  s.createdAt = old.createdAt || s.createdAt;
  if (old.createdDay) s.createdDay = old.createdDay;
  s.tickets.standard = Math.max(0, s.tickets.standard - (ECONOMY.start.tickets.standard || 0));
  s.welcomeGift = 0; s.giftShown = true;
  if (old.freePack) s.freePack = { ...old.freePack };
  if (old.daily?.last) s.daily = { last: old.daily.last, streak: 0 };
  if (old.trials?.day) s.trials = { ...s.trials, day: old.trials.day, done: [...(old.trials.done || [null, null, null])], score: old.trials.score || 0 };
  if (old.missions?.day) s.missions = old.missions;
  if (old.braiseFree) s.braiseFree = { ...old.braiseFree };
  if (old.descent?.day) s.descent = { ...s.descent, day: old.descent.day, used: old.descent.used || 0 };
  return s;
}

export class Game {
  constructor(catalog, storage, { rng = cryptoRandom, clock = () => new Date() } = {}) {
    this.catalog = catalog;
    this.storage = storage;
    this.rng = rng;
    this.clock = clock;
    this.listeners = {};
    const { save, source, restored, unreadable } = loadSave(storage);
    this.s = save;
    this.loadedFrom = source;
    this.unreadable = !!unreadable; // v310 : la partie précédente n'a pas pu être lue (mise de côté, rien d'écrasé)
    if (restored) { this.restoredStash = true; try { writeSave(storage, save); storage.removeItem(SAVE_STASH_KEY); } catch (e) { /* rien */ } }
    try { this.convertHeroes(); } catch (e) { /* rien */ }
    try { this.fixVariants(); } catch (e) { /* rien */ }
    this.noteCreatedDay();
    try { this.dropRemoved(); } catch (e) { /* rien */ }
  }

  // v540 : graine d'un combat ou d'une partie, tirée de la partie (graine de base donnée par le serveur, compteur) :
  // le téléphone et le serveur de partie obtiennent la même. À n'appeler qu'après les vérifications (une action refusée ne doit rien changer).
  seed(tag = '') {
    const s = this.s;
    if (!Number.isInteger(s.seedBase)) s.seedBase = Math.floor(this.rng() * 2 ** 31);
    s.seedN = (s.seedN || 0) + 1;
    let h = (2166136261 ^ s.seedBase) >>> 0;
    for (const ch of `${s.seedN}:${tag}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    return h % 2147483647;
  }

  // Événements -------------------------------------------------------------
  on(evt, fn) { (this.listeners[evt] ||= []).push(fn); return () => { this.listeners[evt] = this.listeners[evt].filter((f) => f !== fn); }; }
  emit(evt, payload) { (this.listeners[evt] || []).forEach((f) => f(payload)); }

  persist() {
    this.markPlayed();
    try {
      writeSave(this.storage, this.s);
      this.emit('change', this.s);
      return true;
    } catch (e) {
      this.emit('error', 'La sauvegarde a échoué : l’espace de stockage du navigateur est peut-être plein ou désactivé.');
      return false;
    }
  }

  // Lectures ---------------------------------------------------------------
  entry(id) { return this.s.collection[id]; }
  owns(id) { return !!this.s.collection[id]; }
  uniqueCount() { return Object.keys(this.s.collection).length; }
  total() { return this.catalog.cards.length; }
  factionProgress(f) {
    const cards = this.catalog.byFaction[f];
    const owned = cards.filter((c) => this.owns(c.id));
    const byRarity = {};
    RARITY_ORDER.forEach((r) => {
      const all = cards.filter((c) => c.rarity === r);
      byRarity[r] = { owned: all.filter((c) => this.owns(c.id)).length, total: all.length };
    });
    return { owned: owned.length, total: cards.length, ratio: owned.length / cards.length, byRarity };
  }
  rarityCount(r) { return this.catalog.byRarity[r].filter((c) => this.owns(c.id)).length; }
  nameKnown(id) {
    if (this.owns(id) || this.s.deciphered[id]) return true;
    const c = this.catalog.get(id);
    return this.factionProgress(c.faction).ratio >= ECONOMY.revealNamesAt;
  }
  setProgress(key) {
    const set = this.catalog.set[key];
    const owned = set.cards.filter((id) => this.owns(id)).length;
    return { owned, total: set.cards.length, done: !!this.s.setsDone[key] };
  }
  variantCount() {
    let n = 0;
    for (const e of Object.values(this.s.collection)) for (const [v, k] of Object.entries(e.v)) if (v !== 'normal' && k > 0) n++;
    return n;
  }
  completeLines() {
    return Object.values(this.catalog.lines).filter((l) => l.cards.every((c) => this.owns(c.id))).length;
  }
  levelInfo() { return levelFromXp(this.s.xp); }
  newCount() { return Object.values(this.s.collection).filter((e) => e.isNew).length; }
  event() { return currentEvent(this.clock()); }
  canDailyClaim() { return this.s.daily.last !== today(this.clock()); }
  dailyAmount() {
    const t = this.clock();
    const y = new Date(t); y.setDate(y.getDate() - 1);
    // v348 : un jour manqué fait perdre un cran à la série (au lieu de la remettre à 1)
    const missed = this.s.daily.last ? Math.max(0, dayGap(this.s.daily.last, today(t)) - 1) : 0;
    const streak = this.s.daily.last === today(y) ? this.s.daily.streak + 1 : this.s.daily.last ? Math.max(0, (this.s.daily.streak || 0) - missed) + 1 : 1;
    return { streak, amount: ECONOMY.daily.base + Math.min(ECONOMY.daily.maxStreakBonus, (streak - 1) * ECONOMY.daily.perStreakDay) };
  }

  // Actions ----------------------------------------------------------------
  // Booster gratuit du jour : un par jour (heure locale). v348 : il se garde, jusqu'à FREE_PACK.max en réserve
  // (un jour sans jouer n'est plus perdu). s.freePack.day : le jour de la dernière ouverture ; left : ce qui restait.
  freePack(now = this.clock().getTime()) {
    const d = new Date(now), fp = this.s.freePack, day = today(d);
    /* v536 : sans ouverture encore, la réserve se remplit depuis la création de la partie (avant : bloquée à 1) */
    const start = this.s.createdAt ? (this.s.createdDay || today(new Date(this.s.createdAt))) /* v754 : jour de création à l’heure du joueur (createdDay), le même sur le téléphone et le serveur */ : day;
    const stock = !fp.day ? Math.min(FREE_PACK.max, FREE_PACK.perDay * (1 + Math.max(0, dayGap(start, day)))) : fp.day === day ? (fp.left || 0) : Math.min(FREE_PACK.max, (fp.left || 0) + dayGap(fp.day, day) * FREE_PACK.perDay);
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
    return { stock, nextAt: stock ? null : midnight };
  }

  // v668 : Braises de vie. Une créature tombée dans la Descente reste à terre d'un chapitre à l'autre (s.fallen) ;
  // une Braise de vie la ranime (entre deux chapitres). La braise offerte chaque jour se garde (BRAISE.max en réserve),
  // comme le booster gratuit ; les autres viennent des gardiens (première victoire) ou des cendres.
  isFallen(id) { return !!this.s.fallen?.[id]; }
  fallenIds() { return Object.keys(this.s.fallen || {}).filter((id) => this.owns(id)); }
  braises(now = this.clock().getTime()) {
    const d = new Date(now), day = today(d), bf = this.s.braiseFree || {};
    const start = this.s.createdAt ? (this.s.createdDay || today(new Date(this.s.createdAt))) : day;
    const free = Math.max(0, !bf.day ? Math.min(BRAISE.max, BRAISE.perDay * (1 + Math.max(0, dayGap(start, day)))) : bf.day === day ? (bf.left || 0) : Math.min(BRAISE.max, (bf.left || 0) + Math.max(0, dayGap(bf.day, day)) * BRAISE.perDay));
    const earned = Math.max(0, this.s.braises || 0);
    return { free, earned, total: free + earned, nextAt: free < BRAISE.max ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() : null };
  }
  reviveFallen(id) {
    if (!this.s.fallen?.[id]) throw new Error('Cette créature n’est pas tombée.');
    if (this.s.descent.run) throw new Error('Termine d’abord ton chapitre : une Braise de vie se pose entre deux chapitres.');
    const b = this.braises();
    if (b.free > 0) this.s.braiseFree = { day: today(this.clock()), left: b.free - 1 };
    else if (b.earned > 0) this.s.braises = b.earned - 1;
    else throw new Error('Tu n’as plus de Braise de vie.');
    delete this.s.fallen[id];
    this.s.stats.revived = (this.s.stats.revived || 0) + 1;
    this.persist();
    return this.braises();
  }
  buyBraise() {
    if (this.s.ash < BRAISE.ash) throw new Error(`Il te faut ${BRAISE.ash} cendres.`);
    this.s.ash -= BRAISE.ash;
    this.s.braises = Math.max(0, this.s.braises || 0) + 1;
    this.persist();
    return this.braises();
  }

  canBuy(type) {
    const def = BOOSTERS[type];
    return (this.s.tickets[type] || 0) > 0 || (type === 'standard' && this.freePack().stock > 0) || (!def.rewardOnly && this.s.shards >= def.price);
  }

  openBooster(type, { faction } = {}) {
    const def = BOOSTERS[type];
    if (!def) throw new Error('Booster inconnu');
    if (type === 'faction' && !FACTION_ORDER.includes(faction)) throw new Error('Choisis une faction.');
    let paidWith;
    const free = type === 'standard' ? this.freePack() : null;
    let gift = 0;
    if ((this.s.tickets[type] || 0) > 0) { this.s.tickets[type]--; paidWith = 'ticket'; if (type === 'standard' && this.s.welcomeGift > 0) { gift = (ECONOMY.start.tickets.standard || 2) - this.s.welcomeGift + 1; this.s.welcomeGift--; } }
    else if (free && free.stock > 0) { this.s.freePack = { day: today(this.clock()), left: free.stock - 1 }; paidWith = 'free'; }
    else if (!def.rewardOnly && this.s.shards >= def.price) { this.s.shards -= def.price; /* v728 : un booster de récompense (Abysse, prix 0) ne s'achète jamais */ this.s.stats.shardsSpent += def.price; paidWith = 'shards'; }
    else if (def.rewardOnly) throw new Error('Ce booster ne s’obtient qu’en récompense.');
    else throw new Error(`Il te manque ${def.price - this.s.shards} éclats (tu en as ${this.s.shards}). La Descente et les Duels des Sceaux en rapportent.`);

    const ev = this.event();
    const res = drawBooster(type, this.catalog, { rng: this.rng, pity: this.s.pity, faction, event: ev });
    this.s.pity = res.pity;
    // v394 : le premier Booster de l'Abysse garantit une Secrète pas encore possédée (la dernière carte)
    if (type === 'abysse' && !this.s.stats.abyssSecret) {
      const sec = (this.catalog.byRarity.S || []).filter((c) => !this.owns(c.id));
      const pool = sec.length ? sec : this.catalog.byRarity.S || [];
      if (pool.length) { const c = pool[Math.floor(this.rng() * pool.length)]; res.cards[res.cards.length - 1] = { id: c.id, rarity: 'S', variant: c.variants.includes('holo') ? 'holo' : 'normal', slot: 'mPlus' }; }
      this.s.stats.abyssSecret = Date.now();
    }
    // Mode Créateur : rareté (et variante) imposées pour la dernière carte du prochain booster
    if (this.s.settings.dev && this.s.devForce) {
      const pool = this.catalog.byRarity[this.s.devForce.rarity] || [];
      if (pool.length) {
        const card = pool[Math.floor(this.rng() * pool.length)];
        const v = this.s.devForce.variant && card.variants.includes(this.s.devForce.variant) ? this.s.devForce.variant : res.cards[res.cards.length - 1].variant;
        res.cards[res.cards.length - 1] = { ...res.cards[res.cards.length - 1], id: card.id, rarity: card.rarity, variant: v };
      }
      this.s.devForce = null;
    }
    this.s.stats.boosters++;
    const rewards = { shards: 0, ash: 0, xp: XP.booster };
    const cards = res.cards.map((d) => {
      const r = this.addCard(d.id, d.variant, 'booster');
      rewards.shards += r.shards; rewards.ash += r.ash; rewards.xp += r.xp;
      return { ...d, ...r };
    });
    this.s.xp += XP.booster;
    const opening = { t: Date.now(), type, faction: faction || null, event: type === 'event' ? ev.key : null, paidWith, gift, guaranteed: res.guaranteed, cards, rewards };
    this.s.history.unshift({ t: opening.t, type, faction: opening.faction, cards: cards.map((c) => ({ id: c.id, v: c.variant, n: c.isNewCard })) });
    this.s.history = this.s.history.slice(0, 30);
    // Statistiques de chance
    const st = this.s.stats;
    cards.forEach((c) => { st.pulls[this.catalog.get(c.id).rarity]++; });
    const hrKeys = ['HR', 'M', 'S'];
    st.expHR += boosterOdds(type).slots.reduce((a, sl) => a + hrKeys.reduce((b, k) => b + sl.odds[k], 0) / 100, 0);
    st.gotHR += cards.filter((c) => RI(this.catalog.get(c.id).rarity) >= RI('HR')).length;
    const score = cards.reduce((a, c) => a + LUCK_POINTS[this.catalog.get(c.id).rarity] + (c.variant !== 'normal' ? LUCK_POINTS.variant : 0), 0);
    this.s.best = [...this.s.best, { t: opening.t, type, faction: opening.faction, score, cards: cards.map((c) => ({ id: c.id, v: c.variant })) }]
      .sort((a, b) => b.score - a.score || b.t - a.t).slice(0, 5);
    // Missions du jour
    this.track('booster', 1);
    this.track('new', cards.filter((c) => c.isNewCard).length);
    this.track('rare', cards.filter((c) => RI(this.catalog.get(c.id).rarity) >= RI('R')).length);
    this.track('variant', cards.filter((c) => c.variant !== 'normal').length);
    cards.forEach((c) => this.track('faction', 1, this.catalog.get(c.id).faction));
    const progress = this.checkProgress();
    this.persist();
    return { opening, progress };
  }

  // Ajoute une carte, calcule récompenses de découverte ou cendres de doublon.
  addCard(id, variant = 'normal', source = 'booster') {
    const card = this.catalog.get(id);
    if (!card) throw new Error(`Carte inconnue : ${id}`);
    let e = this.s.collection[id];
    const isNewCard = !e;
    if (!e) e = this.s.collection[id] = { n: 0, v: {}, lv: 1, first: Date.now(), isNew: true };
    const isNewVariant = !e.v[variant];
    e.n++;
    e.v[variant] = (e.v[variant] || 0) + 1;
    // v373 : une finition (holo, or, cosmique) débloque aussi la version normale (décision du propriétaire)
    if (variant !== 'normal' && !e.v.normal) { e.v.normal = 1; e.n++; }
    this.s.stats.cards++;
    const out = { isNewCard, isNewVariant, shards: 0, ash: 0, xp: 0 };
    if (isNewCard) {
      out.shards = ECONOMY.discoveryShards[card.rarity];
      out.xp = XP.discovery[card.rarity];
      this.s.recent = [id, ...this.s.recent.filter((x) => x !== id)].slice(0, 12);
      if (this.s.deciphered[id]) delete this.s.deciphered[id];
    } else if (!isNewVariant) {
      // doublon : il ne rapporte rien tout seul, il se brûle dans la Fournaise
      out.dup = true;
      out.burn = this.burnValue(id, variant);
      out.xp = XP.duplicate;
    } else {
      out.xp = XP.duplicate * 2;
      e.isNew = true;
    }
    if (source !== 'reward') {
      this.s.shards += out.shards;
      this.s.ash += out.ash;
      this.s.stats.ashEarned += out.ash;
      this.s.xp += out.xp;
    }
    return out;
  }

  markSeen(id) {
    const e = this.s.collection[id];
    if (e && e.isNew) { e.isNew = false; this.persist(); }
  }
  markAllSeen() {
    Object.values(this.s.collection).forEach((e) => { e.isNew = false; });
    this.persist();
  }

  // Coffre de la semaine : jouer 5 jours différents dans la semaine (lundi → dimanche) ouvre un coffre d'or
  markPlayed() {
    const w = weekIndex(this.clock()), d = today(this.clock());
    if (!this.s.week || this.s.week.w !== w) this.s.week = { w, days: [], claimed: false };
    if (!this.s.week.days.includes(d)) this.s.week.days.push(d);
  }
  weekChest() { this.markPlayed(); const k = this.s.week; return { days: k.days.length, need: WEEK_DAYS, ready: k.days.length >= WEEK_DAYS && !k.claimed, claimed: k.claimed }; }
  claimWeekChest() {
    const wc = this.weekChest();
    if (!wc.ready) throw new Error(wc.claimed ? 'Le coffre de la semaine est déjà ouvert.' : `Joue ${WEEK_DAYS} jours cette semaine pour l’ouvrir.`);
    this.s.week.claimed = true; this.addChests({ or: 1 }); /* v851 : plus de jeton du Choc en récompense (un seul par jour) */ this.persist();
    return 'or';
  }
  /* v644 : éclats de l'offrande pour le n-ième jour d'une série (affichage) */
  dailyGainFor(n) { return ECONOMY.daily.base + Math.min(ECONOMY.daily.maxStreakBonus, (Math.max(1, n) - 1) * ECONOMY.daily.perStreakDay); }

  claimDaily() {
    if (!this.canDailyClaim()) throw new Error('L’offrande du jour a déjà été récupérée.');
    const { streak, amount } = this.dailyAmount();
    this.s.daily = { last: today(this.clock()), streak };
    this.s.shards += amount;
    // 7e jour d'affilée : un coffre de fer en plus (et ainsi de suite tous les 7 jours)
    const chest = streak % 7 === 0 ? 'fer' : null;
    if (chest) this.addChests({ [chest]: 1 });
    this.s.stats.daily++;
    this.track('daily', 1);
    const progress = this.checkProgress();
    this.persist();
    return { amount, streak, chest, progress };
  }

  // L'invocation de cartes manquantes avec des cendres a été retirée (v230) : la collection
  // se construit avec les boosters et la Descente. Les cendres servent aux niveaux.

  decipher(id) {
    if (this.nameKnown(id)) throw new Error('Ce nom est déjà connu.');
    if (this.s.ash < ECONOMY.decipherAsh) throw new Error(`Il te manque ${ECONOMY.decipherAsh - this.s.ash} cendres (tu en as ${this.s.ash}).`);
    this.s.ash -= ECONOMY.decipherAsh;
    this.s.deciphered[id] = true;
    this.persist();
  }

  // Missions du jour -------------------------------------------------------
  missions() {
    const day = today(this.clock());
    const m = this.s.missions;
    if (m.day !== day) {
      const rnd = seededRng('missions:' + day);
      // v404 : un débutant (moins de 10 cartes) n'a ni doublons à brûler ni chance raisonnable de variante
      const few = Object.keys(this.s.collection).length < 10;
      const pool = MISSIONS.filter((d) => !few || !['burn', 'variant'].includes(d.kind));
      const list = [];
      while (list.length < 3 && pool.length) {
        const def = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
        if (list.some((x) => x.kind === def.kind)) continue;
        const faction = def.kind === 'faction' ? FACTION_ORDER[Math.floor(rnd() * FACTION_ORDER.length)] : null;
        const fname = faction ? this.catalog.faction[faction]?.name || faction : '';
        // v348 : missions à la mesure du joueur — l'étage visé suit le record (60 %, entre 4 et 20) ; « Ouvre 2 coffres »
        // devient « Ouvre un coffre » pour qui n'en a pas deux d'avance
        let n = def.n, shards = def.shards, text = def.text.replace('{faction}', fname);
        if (def.kind === 'chest' && this.chestCount() < 2) { n = 1; shards = 20; text = 'Ouvre un coffre'; }
        list.push({ key: def.key, kind: def.kind, n, shards, faction, text, p: 0, claimed: false });
      }
      this.s.missions = { day, list, bonus: false };
    }
    return this.s.missions;
  }
  track(kind, amount = 1, faction = null) {
    if (!amount) return;
    for (const x of this.missions().list) {
      if (x.kind !== kind || x.p >= x.n) continue;
      if (kind === 'faction' && x.faction !== faction) continue;
      x.p = kind === 'depth' ? Math.min(x.n, Math.max(x.p, amount)) : Math.min(x.n, x.p + amount);
    }
  }
  missionsToClaim() {
    const m = this.missions();
    return m.list.filter((x) => x.p >= x.n && !x.claimed).length;
  }
  claimMission(i) {
    if (!Number.isInteger(i)) throw new Error('Mission pas encore accomplie.'); /* v754 */
    const m = this.missions();
    const x = m.list[i];
    if (!x || x.claimed || x.p < x.n) throw new Error('Mission pas encore accomplie.');
    x.claimed = true; this.codexXp(CODEX_XP.mission, 'mission');
    this.s.shards += x.shards;
    this.s.xp += 20;
    const progress = this.checkProgress();
    this.persist();
    return { shards: x.shards, progress };
  }

  // Apparence affichée partout : celle choisie par le joueur, sinon la plus rare possédée
  shownVariant(id) {
    const e = this.entry(id);
    if (!e) return 'normal';
    if (e.show && e.v[e.show] > 0) return e.show;
    return SHOW_ORDER.find((v) => e.v[v] > 0) || 'normal';
  }
  setShownVariant(id, v) {
    const e = this.entry(id);
    if (!e || !(e.v[v] > 0)) throw new Error('Tu ne possèdes pas cette finition.');
    e.show = v;
    this.persist();
  }
  // Tirage des Ombres (local : participation et prix ; le tirage et le classement sont sur le serveur)
  shadowState() {
    const sh = (this.s.shadow && typeof this.s.shadow === 'object') ? this.s.shadow : (this.s.shadow = {});
    sh.paid ||= {}; sh.prizes ||= {};
    return sh;
  }
  // Récompense de participation, une fois par jour
  shadowPay(day) {
    const sh = this.shadowState();
    if (sh.paid[day]) return 0;
    /* v728 : un jour de plus de 13 jours (sorti de la liste) ne se repaie pas ; liste rangée par date */
    const old = Object.keys(sh.paid).sort();
    if (old.length >= 13 && day <= old[old.length - 13]) return 0;
    sh.paid = Object.fromEntries(Object.entries(sh.paid).sort(([a], [b]) => (a < b ? -1 : 1)).slice(-13));
    sh.paid[day] = true;
    this.s.shards += SHADOW.participation;
    this.persist();
    return SHADOW.participation;
  }
  // Prix d'une semaine (rang 1 à 3, validé par le serveur), une seule fois
  shadowPrize(week, rank) {
    const sh = this.shadowState();
    if (sh.prizes[week] !== undefined) return null;
    sh.prizes[week] = rank;
    const chest = SHADOW.prizes[rank - 1] || null;
    if (chest) this.addChests({ [chest]: 1 });
    this.persist();
    return chest;
  }
  // v512 : Versus Booster. La mise est payée par le jeu (éclats de la sauvegarde) ; le serveur ouvre les boosters
  // et dit ce que chaque joueur encaisse (supabase/08-versus.sql). Chaque défi n'est encaissé qu'une fois.
  versusPay(stake) {
    if (!(stake > 0)) throw new Error('Prix invalide.');
    if (this.s.shards < stake) throw new Error(`Il te manque ${stake - this.s.shards} éclats pour ce défi.`);
    this.s.shards -= stake;
    this.s.stats.shardsSpent += stake;
    this.s.versus.spent += stake;
    this.persist();
  }
  versusRefund(stake) { if (stake > 0) { this.s.shards += stake; this.s.stats.shardsSpent = Math.max(0, this.s.stats.shardsSpent - stake); this.s.versus.spent = Math.max(0, this.s.versus.spent - stake); this.persist(); } }
  // res = réponse de versus_claim : { result: win|tie|lose|refund|already|wait, cards, stake, packs, trophy, chest }
  // v735 : chacun garde ses cartes ; butin du gagnant donné par le jeu (VERSUS_PRIZE, js/core/versus.js)
  /* v807 : Ligues du Choc, une par mois (à l'heure du joueur). Au changement de mois, la ligue où l'on finit donne sa
     récompense (s'il y a eu au moins un duel) ; les points repartent de zéro. Lecture paresseuse (ops.js : lazy). */
  chocLeague() {
    const v = this.s.versus, m = today(this.clock()).slice(0, 7);
    if (!v.lg || typeof v.lg !== 'object') v.lg = { m, pts: 0, top: 0, played: 0 };
    const lg = v.lg;
    if (lg.m !== m) {
      const tier = leagueIdx(lg.pts), rw = lg.played ? LEAGUE_REWARD[LEAGUES[tier].k] : null;
      if (rw) this.grant(rw, 'choc');
      v.lgLast = { m: lg.m, tier, pts: lg.pts || 0, top: lg.top || 0, played: lg.played || 0, reward: !!rw };
      v.lg = { m, pts: 0, top: 0, played: 0 };
      this.persist();
    }
    return v.lg;
  }
  versusApply(id, res) {
    const v = this.s.versus;
    if (!res || v.done[id] || !['win', 'tie', 'lose', 'refund'].includes(res.result)) return null;
    v.done[id] = res.result;
    const keys = Object.keys(v.done);
    if (keys.length > 200) for (const k of keys.slice(0, keys.length - 200)) delete v.done[k];
    const out = { result: res.result, cards: [], shards: 0, trophy: null, chest: null };
    if (res.result === 'refund') { this.versusRefund(res.stake); out.shards = res.stake; return out; }
    v.played++;
    if (res.result === 'win') v.wins++; else if (res.result === 'tie') v.ties++; else v.losses++;
    for (const c of res.cards || []) {
      if (!this.catalog.get(c.id)) continue; // carte d'une version plus récente du jeu
      const r = this.addCard(c.id, c.variant || 'normal', 'booster');
      out.cards.push({ ...c, ...r });
    }
    // butin du jeu : seulement pour les boosters du jour qui comptent encore
    const day = today(this.clock());
    if (v.prizeDay !== day) { v.prizeDay = day; v.prizePacks = 0; }
    const packs = Math.max(1, Math.min(3, res.packs || 1)), counted = Math.max(0, Math.min(packs, VERSUS_PRIZE.packsPerDay - (v.prizePacks || 0)));
    v.prizePacks = (v.prizePacks || 0) + counted;
    out.counted = counted; out.packs = packs;
    /* v807 : la Série ardente (une défaite l'éteint, une égalité la garde) multiplie le butin en éclats d'une victoire */
    const before = v.streak || 0, after = res.result === 'win' ? before + 1 : res.result === 'lose' ? 0 : before;
    out.streak = { before, after, broken: res.result === 'lose' && before >= 2 };
    out.mult = res.result === 'win' ? streakMult(after) : 1;
    if (counted > 0 && (res.result === 'win' || res.result === 'tie')) {
      out.shards = Math.round((res.stake || 0) * VERSUS_PRIZE[res.result] * out.mult * counted / packs / 5) * 5;
      if (out.shards > 0) this.grant({ shards: out.shards }, 'versus');
    }
    if (counted > 0 && res.result === 'win' && STREAK_CHESTS[after]) { const k = STREAK_CHESTS[after]; this.addChests({ [k]: 1 }); out.streakChest = k; }
    /* v807 : Ligue du mois : points gagnés ou perdus à chaque duel (même au-delà du butin du jour) */
    const lg = this.chocLeague(), old = lg.pts || 0, tierBefore = leagueIdx(old);
    lg.pts = Math.max(0, old + leagueDelta(res.result, before)); lg.played = (lg.played || 0) + 1;
    const tierAfter = leagueIdx(lg.pts);
    lg.top = Math.max(lg.top || 0, tierAfter); v.lgTop = Math.max(v.lgTop || 0, tierAfter);
    out.league = { before: tierBefore, after: tierAfter, pts: lg.pts, delta: lg.pts - old };
    /* plus belle carte jamais sortie au Choc (tableau de chasse) */
    for (const c of res.cards || []) { const pts = c.pts ?? cardPts(c); if (this.catalog.get(c.id) && pts > (v.bestCard?.pts || 0)) v.bestCard = { id: c.id, variant: c.variant || 'normal', pts }; }
    if (counted > 0 && res.result === 'win' && Array.isArray(res.choices) && res.choices.length) {
      /* v736 : le gagnant choisit ensuite sa carte parmi celles de l'adversaire (versusPick) */
      (v.pick ||= {})[id] = true; out.pick = true; out.choices = res.choices;
    } else if (counted > 0 && res.result === 'win') {
      const tr = res.trophy, tc = tr && this.catalog.get(tr.id);
      if (tc && VERSUS_PRIZE.trophyRar.includes(tc.rarity)) { const r = this.addCard(tr.id, tr.variant || 'normal', 'booster'); out.trophy = { ...tr, ...r }; }
      else if (res.chest === 'abyssal' || tc) { this.addChests({ abyssal: 1 }); out.chest = 'abyssal'; }
    }
    v.streak = after;
    v.best = Math.max(v.best || 0, v.streak);
    v.won += out.cards.length + (out.trophy ? 1 : 0);
    this.s.xp += 10;
    out.progress = this.checkProgress();
    this.persist();
    return out;
  }

  /* v811 : le nouveau Choc des Boosters. v838 : un jeton chaque jour, qui ne se garde pas ; ceux gagnés ailleurs
     (coffre de la semaine, Tournoi du Cercle, Codex) vont jusqu'à CHOC.tokensCap et se jouent le jour même. Jamais en vente. Lecture paresseuse (ops.js). */
  chocTokens() {
    const day = today(this.clock());
    let c = this.s.choc;
    if (!c || typeof c !== 'object') c = this.s.choc = { n: CHOC.tokensMax, day, done: {} };
    c.done ||= {};
    /* v838 : chaque jour, la réserve repart à un jeton : ceux qui n'ont pas servi la veille (jeton du jour ou gagné ailleurs) sont perdus */
    if (c.day !== day) { c.n = CHOC.tokensMax; c.day = day; }
    return c;
  }
  chocGive(n = 1) { const c = this.chocTokens(); c.n = Math.min(CHOC.tokensCap, c.n + Math.max(0, n | 0)); }
  // pris par le serveur de partie juste avant de créer ou rejoindre une partie (rendu si elle ne commence jamais)
  chocSpend() {
    const c = this.chocTokens();
    if (c.n < 1) throw new Error('Plus de jeton du Choc : un nouveau arrive demain.');
    c.n--; this.persist();
  }
  // res = réponse de choc_claim : { result: win|draw|lose|already, cards: [cartes gardées], take: carte prise | null, foe }
  chocApply(id, res) {
    const c = this.chocTokens(), v = this.s.versus;
    if (!res || c.done[id] || !['win', 'draw', 'lose'].includes(res.result)) return null;
    c.done[id] = res.result;
    const keys = Object.keys(c.done); if (keys.length > 200) for (const k of keys.slice(0, keys.length - 200)) delete c.done[k];
    const result = res.result === 'draw' ? 'tie' : res.result;
    const out = { result, cards: [], take: null, shards: 0 };
    for (const x of res.cards || []) { if (!this.catalog.get(x?.id)) continue; const r = this.addCard(x.id, x.variant || 'normal', 'booster'); out.cards.push({ ...x, ...r }); }
    v.played++;
    if (result === 'win') v.wins++; else if (result === 'tie') v.ties++; else v.losses++;
    const before = v.streak || 0, after = result === 'win' ? before + 1 : result === 'lose' ? 0 : before;
    out.streak = { before, after, broken: result === 'lose' && before >= 2 };
    out.mult = result === 'win' ? streakMult(after) : 1;
    if (result === 'win') { out.shards = CHOC.winShards * out.mult; this.grant({ shards: out.shards }, 'versus'); }
    if (result === 'win' && STREAK_CHESTS[after]) { const k = STREAK_CHESTS[after]; this.addChests({ [k]: 1 }); out.streakChest = k; }
    const lg = this.chocLeague(), old = lg.pts || 0, tierBefore = leagueIdx(old);
    lg.pts = Math.max(0, old + leagueDelta(result, before)); lg.played = (lg.played || 0) + 1;
    const tierAfter = leagueIdx(lg.pts);
    lg.top = Math.max(lg.top || 0, tierAfter); v.lgTop = Math.max(v.lgTop || 0, tierAfter);
    out.league = { before: tierBefore, after: tierAfter, pts: lg.pts, delta: lg.pts - old };
    const tk = res.take, tc = tk && this.catalog.get(tk.id);
    if (result === 'win' && tc) {
      const r = this.addCard(tk.id, tk.variant || 'normal', 'booster'); out.take = { ...tk, ...r };
      const foe = typeof res.foe === 'string' ? res.foe.replace(/[<>&"]/g, '').slice(0, 24) : '';
      const tr = (v.trophies ||= {}); tr[tk.id] = { f: foe, d: today(this.clock()) };
      const ks = Object.keys(tr); if (ks.length > 30) for (const k of ks.slice(0, ks.length - 30)) delete tr[k];
    }
    for (const x of [...(res.cards || []), ...(tc ? [tk] : [])]) { const pts = cardPts(x); if (this.catalog.get(x.id) && pts > (v.bestCard?.pts || 0)) v.bestCard = { id: x.id, variant: x.variant || 'normal', pts }; }
    v.streak = after; v.best = Math.max(v.best || 0, after);
    v.won += out.cards.length + (out.take ? 1 : 0);
    this.s.xp += 10;
    this.markPlayed?.();
    out.progress = this.checkProgress();
    this.persist();
    return out;
  }
  // v736 : butin choisi par le gagnant (réponse de versus_pick : { trophy } ou { chest: 'abyssal' }), une seule fois
  versusPickApply(id, res) {
    const v = this.s.versus;
    if (!v.pick?.[id] || !res) return null;
    delete v.pick[id];
    const out = { trophy: null, chest: null };
    const tc = res.trophy && this.catalog.get(res.trophy.id);
    if (tc && VERSUS_PRIZE.trophyRar.includes(tc.rarity)) {
      const r = this.addCard(res.trophy.id, res.trophy.variant || 'normal', 'booster'); out.trophy = { ...res.trophy, ...r }; v.won++;
      /* v807 : carte trophée : « Gagnée au Choc contre X » (pseudo donné par le serveur, 30 dernières) */
      const foe = typeof res.foe === 'string' ? res.foe.replace(/[<>&"]/g, '').slice(0, 24) : '';
      const tr = (v.trophies ||= {}); tr[res.trophy.id] = { f: foe, d: today(this.clock()) };
      const ks = Object.keys(tr); if (ks.length > 30) for (const k of ks.slice(0, ks.length - 30)) delete tr[k];
    }
    else if (res.chest === 'abyssal' || tc) { this.addChests({ abyssal: 1 }); out.chest = 'abyssal'; }
    out.progress = this.checkProgress();
    this.persist();
    return out;
  }
  // v519 : partie terminée contre un autre joueur (résultat donné par le serveur, encaissé une seule fois)
  mpReward(game, id, result) {
    const m = this.s.mp;
    if (!['win', 'lose', 'draw'].includes(result) || m.done[id]) return null;
    m.done[id] = result;
    const keys = Object.keys(m.done); if (keys.length > 200) for (const k of keys.slice(0, keys.length - 200)) delete m.done[k];
    const day = today(this.clock());
    if (m.day !== day) { m.day = day; m.paid = 0; }
    const st = (m[game] ||= { wins: 0, losses: 0, draws: 0 });
    let shards = 0;
    if (result === 'win') { st.wins++; if (m.paid < MP_REWARD.paidPerDay) { m.paid++; shards = MP_REWARD.win; this.grant({ shards }, 'mp'); } }
    else if (result === 'lose') st.losses++; else st.draws++;
    this.s.xp += MP_REWARD.xp;
    const progress = this.checkProgress();
    this.persist();
    return { shards, progress };
  }
  // Doublons et Fournaise -------------------------------------------------
  // Un doublon = un exemplaire en plus du premier, dans la même finition (chaque finition gardée une fois).
  spare(id) { const e = this.s.collection[id]; return e ? Object.values(e.v).reduce((a, k) => a + Math.max(0, (k || 0) - 1), 0) : 0; }
  spareCount(r) { return this.catalog.byRarity[r].reduce((a, c) => a + this.spare(c.id), 0); }
  // Cendres rendues par un exemplaire brûlé : rareté × finition
  // v280 : Sublimer — la finition suivante contre des cendres, si la carte est déjà possédée dans la finition précédente
  sublimeInfo(id) {
    const card = this.catalog.get(id), e = this.s.collection[id];
    if (!card || !e) return null;
    const order = FIN_ORDER.filter((v) => v === 'normal' || card.variants.includes(v));
    const to = order.find((v, i) => i > 0 && !e.v[v] && e.v[order[i - 1]]);
    if (!to) return null;
    return { to, from: order[order.indexOf(to) - 1], cost: sublimeObs(card.rarity, to) }; /* v615 : en obsidiennes */
  }
  sublime(id) {
    const x = this.sublimeInfo(id);
    if (!x) throw new Error('Rien à sublimer pour cette carte.');
    this.spendObs(x.cost); /* v615 : obsidiennes au lieu des cendres */
    this.addCard(id, x.to, 'reward');
    const progress = this.checkProgress();
    this.persist();
    return { ...x, progress };
  }
  burnValue(id, variant = 'normal') { return Math.round((ECONOMY.burnAsh[this.catalog.get(id)?.rarity] || 0) * (ECONOMY.burnFinish[variant] || 1)); }
  // Brûle n exemplaires d'une finition. Le dernier exemplaire peut partir : la créature quitte alors la collection.
  burn(id, variant = 'normal', n = 1) {
    const e = this.s.collection[id];
    if (!e || !((e.v[variant] || 0) >= n) || !Number.isInteger(n) || n < 1) throw new Error('Tu ne possèdes pas assez d’exemplaires de cette version.');
    const last = e.n - n <= 0;
    if (last) {
      if (this.isFav(id)) throw new Error('Cette créature est dans tes favoris : retire-la des favoris pour pouvoir la brûler.');
      if (this.uniqueCount() <= TEAM.active) throw new Error(`Garde au moins ${TEAM.active} créatures pour pouvoir combattre.`);
      if (this.s.descent.run?.team?.some((m) => m.id === id)) throw new Error('Cette créature est en plein chapitre de la Descente.');
    }
    const ash = this.burnValue(id, variant) * n;
    e.v[variant] -= n; if (!e.v[variant]) delete e.v[variant];
    e.n -= n;
    if (last) this.forget(id);
    this.s.ash += ash;
    this.s.stats.ashEarned += ash;
    this.s.stats.burned = (this.s.stats.burned || 0) + n;
    this.track('burn', n);
    const progress = this.checkProgress();
    this.persist();
    return { ash, gone: last, progress };
  }
  // Brûle tous les doublons (ou seulement ceux de la liste d'ids) en gardant un exemplaire de chaque finition
  burnSpares(ids = null) {
    let ash = 0, n = 0;
    for (const id of ids || Object.keys(this.s.collection)) {
      const e = this.s.collection[id];
      if (!e || !this.catalog.get(id)) continue; // v310 : carte d'une version plus récente du jeu : on n'y touche pas
      for (const [v, k] of Object.entries(e.v)) if (k > 1) { const x = this.burnValue(id, v) * (k - 1); ash += x; n += k - 1; e.n -= k - 1; e.v[v] = 1; }
    }
    if (!n) return { ash: 0, n: 0, progress: [] };
    this.s.ash += ash;
    this.s.stats.ashEarned += ash;
    this.s.stats.burned = (this.s.stats.burned || 0) + n;
    this.track('burn', n);
    const progress = this.checkProgress();
    this.persist();
    return { ash, n, progress };
  }
  spareAsh(ids = null) {
    let ash = 0, n = 0;
    for (const id of ids || Object.keys(this.s.collection)) { const e = this.s.collection[id]; if (e && this.catalog.get(id)) for (const [v, k] of Object.entries(e.v)) if (k > 1) { ash += this.burnValue(id, v) * (k - 1); n += k - 1; } }
    return { ash, n };
  }
  // Une créature qui quitte la collection quitte aussi l'équipe, la vitrine, l'avatar et sa forme
  forget(id) {
    delete this.s.collection[id];
    if (this.s.fallen) delete this.s.fallen[id]; /* v676 : une créature qui revient repart debout */
    this.s.team = (this.s.team || []).filter((x) => x !== id);
    this.s.showcase = this.s.showcase.filter((x) => x !== id);
    if (this.s.avatar === id) this.s.avatar = null;
    delete this.s.forms[id];
  }
  // Niveau d'une créature : acheté avec des cendres (coût = base de la rareté × niveau actuel)
  upgradeCost(id) {
    const e = this.entry(id), lv = e?.lv || 1, c = this.catalog.get(id);
    return !c || lv >= MAX_LEVEL ? 0 : Math.round(ECONOMY.levelAsh[c.rarity] * lv * (1 + LEVEL_STEEP * Math.max(0, lv - 4))); // v310 : carte inconnue (version plus récente) ignorée
  }
  upgrade(id) {
    const e = this.entry(id);
    if (!e) throw new Error('Tu ne possèdes pas cette créature.');
    const lv = e.lv || 1;
    if (lv >= MAX_LEVEL) throw new Error('Niveau maximum atteint.');
    const cost = this.upgradeCost(id);
    if (this.s.ash < cost) throw new Error(`Il te manque ${cost - this.s.ash} cendres (tu en as ${this.s.ash}). Brûle des doublons dans la Fournaise.`);
    this.s.ash -= cost;
    e.lv = lv + 1;
    this.s.xp += 10;
    const progress = this.checkProgress();
    this.persist();
    return { level: e.lv, cost, progress };
  }

  // L'équipe : les cartes combattent ---------------------------------------
  // Niveau d'une carte (1 à MAX_LEVEL), monté avec des cendres.
  cardLevelInfo(id) { const e = this.entry(id), level = Math.min(MAX_LEVEL, e?.lv || 1); return { level, cost: e ? this.upgradeCost(id) : 0, max: MAX_LEVEL }; }
  cardLevel(id) { return this.cardLevelInfo(id).level; }
  teamCost(ids = this.s.team) { return ids.reduce((a, id) => a + (COST[this.catalog.get(id)?.rarity] || 0), 0); }
  // Équipe valable : cartes possédées (v495 : plus de budget de rareté). Complétée automatiquement si besoin
  // (et 5 Communes offertes à qui n'a pas encore 3 créatures).
  team() {
    let t = (this.s.team || []).filter((id) => this.owns(id));
    // remplissage automatique seulement tant que le joueur n'a jamais composé son équipe lui-même
    if (t.length < TEAM.active && !this.s.teamSet) {
      if (this.welcomePending()) t = []; // nouveau joueur : il ouvre d'abord ses boosters de bienvenue
      else if (this.uniqueCount() < TEAM.active) { // filet de sécurité : plus de booster à ouvrir et pas assez de créatures
        STARTER.forEach((id) => { if (!this.owns(id)) { this.addCard(id, 'normal', 'reward'); this.s.collection[id].isNew = false; } });
        t = STARTER.slice(); // rôles complémentaires, dans le bon ordre
      } else t = this.autoTeam(t);
    }
    if (t.join() !== (this.s.team || []).join()) { this.s.team = t; this.persist(); }
    return t;
  }
  // Nouveau joueur : pas encore assez de créatures, mais des boosters de bienvenue à ouvrir
  welcomePending() { return this.uniqueCount() < TEAM.active && (this.s.tickets.standard || 0) > 0; }
  // Équipe suggérée : force, synergies et rôles complémentaires (synergy.js)
  suggestTeam() {
    const owned = Object.keys(this.s.collection).filter((id) => !this.isFallen(id)).map((id) => this.catalog.get(id)).filter(Boolean); /* v668 */
    return suggestTeam(owned, (id) => this.cardLevel(id));
  }
  teamSynergies(ids = this.team()) { return teamSynergies(ids.map((id) => this.catalog.get(id)).filter(Boolean), (id) => this.cardLevel(id)); }
  // Complète l'équipe avec les meilleures cartes possédées
  autoTeam(keep = []) {
    const t = keep.slice(), size = TEAM.active + TEAM.reserve;
    const cards = Object.keys(this.s.collection).map((id) => this.catalog.get(id)).filter((c) => c && !t.includes(c.id) && !this.isFallen(c.id)) /* v668 : jamais une créature à terre */
      .sort((a, b) => this.cardPower(b.id) - this.cardPower(a.id) || RI(b.rarity) - RI(a.rarity) || b.power - a.power); /* v495 : plus de budget, les plus fortes d'abord (rareté × niveau) */
    for (const c of cards) {
      if (t.length >= size) break;
      t.push(c.id);
    }
    return t;
  }
  setTeam(ids) {
    const list = [...new Set(ids)].filter((id) => this.owns(id)).slice(0, TEAM.active + TEAM.reserve);
    if (this.s.descent.run) throw new Error('Termine d’abord ton chapitre de la Descente.');
    this.s.team = list;
    this.s.teamSet = true;
    this.persist();
    return list;
  }
  // Équipes enregistrées (4 au plus) : un nom et 5 cartes, rechargées d'un toucher
  teamPresets() { return Array.isArray(this.s.teamPresets) ? this.s.teamPresets : (this.s.teamPresets = []); }
  saveTeamPreset(name, ids = this.s.team) {
    const list = this.teamPresets(), nm = String(name || '').trim().slice(0, 18);
    if (!nm) throw new Error('Donne un nom à cette équipe.');
    if (!ids.length) throw new Error('Ton équipe est vide.');
    const i = list.findIndex((p) => p.name.toLowerCase() === nm.toLowerCase());
    if (i < 0 && list.length >= 4) throw new Error('4 équipes au plus : supprimes-en une d’abord.');
    const p = { name: nm, ids: ids.slice(0, TEAM.active + TEAM.reserve) };
    if (i >= 0) list[i] = p; else list.push(p);
    this.persist();
    return p;
  }
  loadTeamPreset(i) {
    const p = this.teamPresets()[i];
    if (!p) throw new Error('Équipe introuvable.');
    const missing = p.ids.filter((id) => !this.owns(id)).length;
    const team = this.setTeam(p.ids);
    return { team, missing };
  }
  deleteTeamPreset(i) { const list = this.teamPresets(); if (list[i]) { list.splice(i, 1); this.persist(); } }
  // La carte qui porte le pouvoir ultime : la Mythique ou Secrète la plus rare de l'équipe
  ultCard(ids = this.s.team) {
    return ids.map((id) => this.catalog.get(id)).filter(canUlt).sort((a, b) => RI(b.rarity) - RI(a.rarity))[0] || null;
  }
  ultimate(ids = this.s.team) { const c = this.ultCard(ids); const key = ultOf(c); return { key, ...(ULTS[key] || {}), card: c?.id || null, power: 1 + 0.08 * ((c ? this.cardLevel(c.id) : 1) - 1) }; }

  // Coffres : chaque coffre contient des boosters (ajoutés aux boosters à ouvrir)
  chestCount() { return Object.values(this.s.chests).reduce((a, n) => a + n, 0); }
  addChests(chests = {}) { for (const [k, n] of Object.entries(chests || {})) if (CHESTS[k]) this.s.chests[k] = (this.s.chests[k] || 0) + n; }
  openChest(type) {
    if (!CHESTS[type]) throw new Error('Coffre inconnu.');
    if (!(this.s.chests[type] > 0)) throw new Error('Tu n’as pas ce coffre.');
    this.s.chests[type]--;
    const packs = CHESTS[type].packs.slice();
    packs.forEach((k) => { this.s.tickets[k] = (this.s.tickets[k] || 0) + 1; });
    if (CHESTS[type].shards) this.s.shards += CHESTS[type].shards; // éclats (bois et fer)
    if (CHESTS[type].ash) { this.s.ash += CHESTS[type].ash; this.s.stats.ashEarned += CHESTS[type].ash; } // cendres (tous les coffres)
    this.s.stats.chests = (this.s.stats.chests || 0) + 1;
    this.track('chest', 1);
    this.checkProgress();
    this.persist();
    return packs;
  }

  // v404 : ouvrir tous les coffres d'un coup (16 coffres demandaient 48 touchers) : totaux des gains
  openAllChests() {
    const out = { n: 0, shards: 0, ash: 0, packs: {} };
    const sh0 = this.s.shards, ash0 = this.s.ash;
    for (const t of Object.keys(CHESTS)) {
      while ((this.s.chests[t] || 0) > 0) { this.openChest(t).forEach((k) => { out.packs[k] = (out.packs[k] || 0) + 1; }); out.n++; }
    }
    out.shards = this.s.shards - sh0; out.ash = this.s.ash - ash0;
    return out;
  }
  // Créature de la semaine : la même pour tout le monde, elle apparaît comme élite redoutable (étage 8 et plus).
  // La vaincre donne sa carte, une fois par semaine.
  weekly() {
    const w = weekIndex(this.clock());
    const pool = this.catalog.cards.filter((c) => c.rarity === 'R' || c.rarity === 'HR');
    let h = 2166136261 ^ w; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const card = pool[h % pool.length];
    const done = this.s.weekly?.week === w && this.s.weekly.done;
    return { week: w, id: card.id, done };
  }

  // La Descente -------------------------------------------------------------
  descent() {
    const d = this.s.descent;
    const day = today(this.clock());
    if (d.day !== day) { d.day = day; d.used = 0; d.bestToday = 0; }
    if (d.run?.battle && d.run.battle.ver !== 2) upgradeDuel(d.run.battle); // combat en cours d'avant la refonte
    // combat en cours d'avant l'ordre d'initiative (v262) : il passe aux nouvelles règles
    const b = d.run?.battle;
    if (b && !b.init && !b.over && !b.initPending) { if (b.turn === 'ally') startInitiative(b); else b.initPending = true; }
    return d;
  }
  // Règle du jour (celle de l'expédition en cours si elle a commencé la veille)
  rule(day = this.descent().run?.day || this.descent().day) { return dailyRule(day, Object.fromEntries(Object.entries(this.catalog.faction).map(([k, f]) => [k, f.name]))); }
  // v348 : force réelle des premiers ennemis en Cauchemar (+35 % PV, +25 % ATQ, ≈ ×1,3), exprimée en étage « normal »
  // équivalent, plancher de difficulté compris : une équipe au niveau 10 y affronte dès l'étage 1 l'équivalent de l'étage 25 environ
  nightmareEquiv(start = 1, tier = 1) {
    const team = this.team(); if (!team.length) return start;
    const eff = Math.max(start, floorFloor(team.reduce((a, id) => a + this.cardLevel(id), 0) / team.length));
    const nt = NIGHT_TIERS[tier] || NIGHT_TIERS[1];
    const want = enemyScale(eff) * Math.sqrt(nt.hp * nt.atk);
    let f = eff; while (enemyScale(f) < want && f < 200) f++;
    return f;
  }
  // v348 : cadre de profil acheté avec des cendres (cosmétique)
  buyAshFrame(k) {
    const cost = ASH_FRAMES[k];
    if (!cost) throw new Error('Cadre inconnu.');
    if (this.s.frames.includes(k)) throw new Error('Tu as déjà ce cadre.');
    if (this.s.ash < cost) throw new Error(`Il te manque ${cost - this.s.ash} cendres.`);
    this.s.ash -= cost; this.s.frames.push(k); this.persist();
    return k;
  }
  cardPower(id) { const c = this.catalog.get(id); return c ? cardPower(c.rarity, this.cardLevel(id)) : 1; }
  teamPower(ids = this.team()) { return ids.length ? ids.reduce((a, id) => a + this.cardPower(id), 0) / ids.length : 1; }
  // Bonus contre une créature : posséder sa carte ou la maîtriser à la chasse
  knows(id) { return this.owns(id) || this.huntKills(id) >= HUNT_STAGES[2].k; }
  huntKills(id) { return this.s.hunt[id] || 0; }
  huntCount() { return Object.keys(this.s.hunt).length; }

  // Mode Cauchemar : débloqué au record de l'étage 20
  nightmareUnlocked() { return (this.descent().best || 0) >= NIGHTMARE_AT; }
  // v367 : record par palier de Cauchemar (l'ancien record unique compte pour le palier I)
  nightBest(t) { const d = this.descent(); return Math.max(d.nightBest?.[t] || 0, t === 1 ? d.bestNightmare || 0 : 0); }
  /* v536 : étages gagnés en Cauchemar, par palier (avant : un seul record par palier, qui privait de récompense les chapitres plus anciens) */
  nightFloors(t) { const d = this.descent(); return (d.nightFloors ||= {})[t] ||= []; }
  nightTierOpen(t) {
    if (t <= 1) return this.nightmareUnlocked();
    const f = this.descent().nightFloors?.[t - 1];
    return this.nightmareUnlocked() && (f && f.length ? f.length >= NIGHT_TIER_OPEN : this.nightBest(t - 1) >= NIGHT_TIER_OPEN);
  }
  nightTiersOpen() { return [1, 2, 3].filter((t) => this.nightTierOpen(t)); }
  // v406 : premiers étages des chapitres ouverts (chaque gardien vaincu ouvre le chapitre suivant)
  startFloors() {
    const best = this.descent().best || 0, out = [1];
    for (let f = DESCENT.bossEvery; f <= best && f < FINAL_FLOOR; f += DESCENT.bossEvery) out.push(f + 1); /* v394 : pas de départ après le fond */
    return out;
  }
  // v406 : chapitre en cours de la campagne (le premier qui n'est pas terminé)
  chapterNow() { return Math.min(Math.floor((this.descent().best || 0) / CHAPTER) + 1, Math.ceil(FINAL_FLOOR / CHAPTER)); }
  // Persévérance du chapitre (0 à GRIT.max défaites retenues) et ennemis affaiblis d'autant
  grit(ch) { const x = this.descent().grit; return x && x.ch === ch ? Math.min(GRIT.max, x.n || 0) : 0; }
  gritMult(ch) { return 1 - GRIT.step * this.grit(ch); }
  campaignDone() { return (this.descent().best || 0) >= FINAL_FLOOR; }
  /* v795 : Les Veilles : chapitre de saison (étages 101 à 105) ouvert après la victoire contre l'Abysse ; un Veilleur par saison
     du Codex, la saison venant du jour où le chapitre commence */
  veilleKey(day = this.descent().day) { const k = seasonFor(day)?.key; return VEILLES[k] ? k : 's1-ames'; }
  veilleOpen() { return !!this.s.bossesBeaten?.abysse; }
  veille(day) { const key = this.veilleKey(day); return { key, ...VEILLES[key], open: this.veilleOpen(), state: (this.s.veilles || {})[key] || null }; }
  runBoss(run) { return run?.veille && VEILLES[run.veille] ? VEILLES[run.veille].boss : bossOf(run.floor); }
  // Première victoire à cet étage (campagne : record ; Cauchemar : record du palier)
  firstClear(run, floor = run.floor) { if (run.veille) return !((this.s.veilles || {})[run.veille]?.floors || []).includes(floor); return run.nightmare ? !this.nightFloors(run.nightTier || 1).includes(floor) : floor > (this.descent().best || 0); }
  floorReward(run, floor = run.floor) {
    const r = { ...floorFirstReward(floor) }, nt = nightTier(run);
    if (run.veille && floor % CHAPTER === 0) r.chests = { abyssal: 1 }; /* v795 : le Veilleur vaincu : coffre abyssal (et 2 tickets premium) */
    if (floor % CHAPTER === 0) r.braises = chapterOf(floor) >= BRAISE.lateFrom ? BRAISE.bossLate : BRAISE.boss; /* v668 : Braises de vie du gardien */
    if (!nt) return r;
    const out = { ...r };
    if (r.shards) out.shards = Math.round(r.shards * nt.shards);
    if (r.chests) out.chests = Object.fromEntries(Object.entries(r.chests).map(([c, n]) => [shiftChest(c, nt.chest), n]));
    return out;
  }
  // ——— Présages et Gouffre (v334) ———
  omensOpen() { return !!this.s.bossesBeaten?.devoreur; }
  chooseOmen(key) {
    const run = this.s.descent.run;
    if (!run || run.phase !== 'omen') throw new Error('Aucun présage à choisir.');
    if (!(run.omenOffer || []).includes(key)) throw new Error('Présage inconnu.');
    run.omen = key; run.omenOffer = null; run.phase = 'doors';
    this.s.stats.omens = { ...(this.s.stats.omens || {}), [key]: ((this.s.stats.omens || {})[key] || 0) + 1 };
    this.persist();
    return OMENS[key];
  }
  // Bonus proposés après une victoire (Présage de la Soif : plus de source ; on garde deux propositions)
  rewardsFor(run, room) {
    const list = floorRewards(run.day, run.floor, room, run.blessings);
    if (run.omen !== 'soif' || !list.includes('rest')) return list;
    // la source est remplacée par le trésor (l'autel reste aussi rare que sans présage)
    const out = list.filter((r) => r !== 'rest');
    if (!out.includes('treasure')) out.push('treasure');
    return out;
  }
  restHeal(run = this.s.descent.run) { const k = this.rule(run?.day).key; return k === 'sources' ? 0.6 : k === 'disette' ? 0.15 : 0.3; }
  startRun({ cursed = false, nightmare = false, start = 1, veille = false } = {}) {
    const vk = veille ? this.veilleKey() : null;
    if (vk && !this.veilleOpen()) throw new Error('Les Veilles s’ouvrent quand tu as vaincu l’Abysse, au fond de la Descente.');
    if (vk) { start = VEILLE_START; nightmare = 0; }
    const tier = nightmare === true ? 1 : Math.max(0, Math.min(3, Number(nightmare) || 0));
    if (tier && !this.nightmareUnlocked()) throw new Error(`Le mode Cauchemar s’ouvre quand tu as atteint l’étage ${NIGHTMARE_AT}.`);
    if (tier > 1 && !this.nightTierOpen(tier)) throw new Error(`${NIGHT_TIERS[tier].name} s’ouvre quand tu as gagné ${NIGHT_TIER_OPEN} étages en ${NIGHT_TIERS[tier - 1].name}.`);
    if (!vk && !this.startFloors().includes(start)) throw new Error('Ce chapitre n’est pas encore ouvert : bats d’abord le gardien qui le précède.');
    /* v406 : le Cauchemar se joue sur les chapitres déjà terminés */
    if (tier && start + CHAPTER - 1 > (this.descent().best || 0)) throw new Error('Le Cauchemar se joue sur un chapitre que tu as déjà terminé.');
    const d = this.descent();
    if (d.run) throw new Error('Un chapitre est déjà en cours.');
    const team = this.team();
    if (team.length < TEAM.active) throw new Error(`Il faut au moins ${TEAM.active} créatures dans ton équipe.`);
    if (team.filter((id) => !this.isFallen(id)).length < TEAM.active) throw new Error(`Il faut au moins ${TEAM.active} créatures debout dans ton équipe : ranime les autres avec une Braise de vie, ou remplace-les.`); /* v668 */
    const free = false; /* v406 : plus de torches, la campagne se joue librement */
    d.runs = (d.runs || 0) + 1;
    const ult = this.ultimate(team.filter((id) => !this.isFallen(id))); /* v676 : le pouvoir d'équipe vient des créatures debout */
    d.run = {
      v: 3, day: d.day, floor: start, cleared: start - 1, start, veille: vk || undefined, phase: 'doors', cursed: false, free, nightmare: !!tier, nightTier: tier || undefined, blessings: [], altar: null,
      gauge: this.rule(d.day).key === 'lune' ? FERVOR_MAX - 2 : this.rule(d.day).key === 'reserve' ? 0 : FERVOR_START, ult: { key: ult.key, power: ult.power, card: ult.card },
      team: team.map((id) => { const u = duelUnit(this.catalog.get(id), { level: this.cardLevel(id), form: this.formOf(id) }); const dn = this.isFallen(id); return { id, hp: dn ? 0 : u.maxHp, maxHp: u.maxHp, fallen: dn, form: this.formOf(id) }; }).sort((a, b) => (a.fallen ? 1 : 0) - (b.fallen ? 1 : 0)), /* v668 : les créatures à terre restent à terre, derrière les autres */
      shards: 0, chests: [], kills: {}, bestBefore: d.best || 0, nightBefore: tier ? this.nightBest(tier) : undefined, minFloor: tier ? floorFloor(team.reduce((a, id) => a + this.cardLevel(id), 0) / team.length) : 1, /* v420 : campagne = force fixe par étage ; le plancher ne vaut plus qu'en Cauchemar */
    };
    // v334 : présage de départ, dès que le premier gardien est tombé
    if (this.omensOpen()) { d.run.phase = 'omen'; d.run.omenOffer = omenChoices(d.day); }
    this.persist();
    return d.run;
  }
  // ——— Épreuves du jour (v407) ———
  // Trois combats par jour, réglés sur la force réelle du joueur (ses 5 meilleures cartes, pas l'équipe choisie : une équipe
  // affaiblie exprès ne rend pas les Épreuves plus faciles). Chaque victoire rapporte sa récompense ; une défaite est définitive
  // pour la journée. Les ennemis sont les mêmes pour tout le monde le même jour, à la force de chacun.
  trials() {
    const day = today(this.clock());
    let t = this.s.trials;
    if (!t || (t.day !== day && !t.battle)) t = this.s.trials = { day, done: [null, null, null], score: 0, cur: null, battle: null }; /* v536 : une Épreuve commencée avant minuit se termine */
    return t;
  }
  trialPower() {
    const ids = Object.keys(this.s.collection).filter((id) => this.owns(id) && this.catalog.get(id));
    /* force des Épreuves : la rareté y pèse moins que dans cardPower (mesuré : à force égale, des Rares au niveau 7 gagnaient bien plus que des Hyper rares au niveau 5) */
    const pw = (id) => { const c = this.catalog.get(id); return (TRIAL_RAR === 1 ? cardPower(c.rarity, 1) : Math.sqrt(cardPower(c.rarity, 1))) * (1 + 0.08 * (this.cardLevel(id) - 1)); };
    const best = (list) => { const top = list.map(pw).sort((a, b) => b - a).slice(0, TEAM.active + TEAM.reserve); return top.length ? top.reduce((a, b) => a + b, 0) / top.length : 1; };
    return Math.max(best(ids), best(this.team()));
  }
  // Étage « équivalent » de chaque Épreuve : celui que la force du joueur atteint en expédition (powerFor), plus un écart
  // propre à l'Épreuve (combat, élite, gardien). Réglé par simulation pour viser environ 6 victoires sur 10.
  trialFloor(i) {
    const p = this.trialPower(), base = floorForPower(p); /* v499 : même courbe que la force conseillée de la Descente */
    const k = Math.max(0.2, Math.min(1, (45 - base) / 39)); /* l'écart se resserre avec la force (gros écarts mesurés en profondeur) */
    return Math.max(2, Math.min(FINAL_FLOOR, Math.round(base + TRIAL_OFFSET[i] * k)));
  }
  trialBoss() {
    const beaten = BOSS_ORDER.filter((k) => this.s.bossesBeaten?.[k]);
    if (!beaten.length) return null;
    return beaten[Math.floor(rngOf(`trial-boss:${this.trials().day}`)() * beaten.length)];
  }
  trialInfo(i) {
    const room = TRIALS[i].room === 'boss' && !this.trialBoss() ? 'elite' : TRIALS[i].room;
    return { ...TRIALS[i], room, floor: this.trialFloor(i), boss: room === 'boss' ? this.trialBoss() : null, reward: this.trialReward(i), state: this.trials().done[i] };
  }
  trialReward(i) {
    /* v420 : relevé après la mesure sur 30 jours (bois avant l'étage 5, fer avant 15, or avant 30, abyssal ensuite) */
    const best = this.descent().best || 0, ti = best >= 30 ? 3 : best >= 15 ? 2 : best >= 5 ? 1 : 0;
    return { chests: { [CHEST_ORDER[Math.max(0, ti - (i < 2 ? 1 : 0))]]: 1 }, shards: 40 + 20 * i };
  }
  startTrial(i) {
    const t = this.trials();
    if (!TRIALS[i]) throw new Error('Épreuve inconnue.');
    if (t.done[i]) throw new Error('Cette Épreuve est déjà jouée aujourd’hui.');
    if (t.battle && t.cur !== i) throw new Error('Termine d’abord l’Épreuve en cours.');
    if (t.battle) return t;
    const team = this.team();
    if (team.length < TEAM.active) throw new Error(`Il faut au moins ${TEAM.active} créatures dans ton équipe.`);
    const info = this.trialInfo(i), F = info.floor, room = info.room, rule = this.rule(t.day), seed = `trial:${t.day}:${i}`;
    const sc = enemyScale(F), lvl = enemyLevel(F, room);
    const enemies = floorEnemies(this.catalog, seed, F, room).map((e) => duelUnit(this.catalog.get(e.id), { side: 'enemy', scale: sc, level: e.boss || e.elite ? lvl : enemyLevel(F, 'fight'), boss: e.boss, elite: e.elite }));
    for (const e of enemies) {
      if (!e.boss && !e.elite) e.atk = Math.round(e.atk * FIGHT_ATK + 0.4);
      const f = this.catalog.get(e.id)?.faction;
      if (rule.key === 'furie' && f === rule.faction) e.atk = Math.round(e.atk * 1.25 + 0.4);
      if (rule.key === 'sommeil' && f === rule.faction) { e.maxHp = Math.max(1, Math.round(e.maxHp * 0.75)); e.hp = e.maxHp; }
      if (e.boss && F >= AWAKEN_AT) e.awakened = true;
      const m = TRIAL_MULT[i]; e.maxHp = Math.round(e.maxHp * m); e.hp = e.maxHp; e.atk = Math.round(e.atk * m + 0.4);
    }
    if (F >= 4) foeTraits(seed, F, room, enemies.length).forEach((k, j) => { if (k && !enemies[j].boss) { enemies[j].trait = k; if (k === 'carapace') enemies[j].shield = 1; } });
    if (rule.key === 'nuee') enemies.forEach((e) => { if (!e.boss && !e.elite && !e.trait) e.trait = 'explosif'; });
    const ult = this.ultimate(team), known = {};
    enemies.forEach((e) => { if (this.knows(e.id)) known[e.id] = true; });
    const allies = team.map((id) => duelUnit(this.catalog.get(id), { level: this.cardLevel(id), form: this.formOf(id) }));
    const st = createDuel(allies, enemies, { fervor: rule.key === 'lune' ? FERVOR_MAX - 2 : rule.key === 'reserve' ? 0 : FERVOR_START, ult: ult.key, power: ult.power, known, ruleMult: rule.key === 'instable' ? 1.25 : 1, boss: info.boss, discovered: this.s.weakSeen || {}, seed: this.seed('trial') });
    if (rule.key === 'marque') st.markMult = 2;
    startInitiative(st);
    t.cur = i; t.battle = st; t.room = room; t.floor = F; t.ult = { key: ult.key, power: ult.power, card: ult.card };
    this.persist();
    return t;
  }
  // Objet « expédition » attendu par l'écran de combat
  trialRun() { const t = this.trials(); return t.battle ? { trial: true, battle: t.battle, floor: t.floor, room: t.room, day: t.day, ult: t.ult, team: [], free: false } : null; }
  finishTrial() {
    const t = this.trials(), st = t.battle, i = t.cur;
    if (!st?.over) throw new Error('Aucune Épreuve terminée.');
    const won = st.over === 'won' && Object.values(st.units).some((u) => u.side === 'ally' && u.hp > 0);
    this.learnRelations(st);
    this.s.weakSeen = { ...(this.s.weakSeen || {}), ...(st.discovered || {}) };
    for (const id of st.kills) { const before = huntStage(this.s.hunt[id] || 0); this.s.hunt[id] = (this.s.hunt[id] || 0) + 1; if (huntStage(this.s.hunt[id]) === 3 && before < 3) this.s.shards += 100; }
    const out = { i, won, report: battleReport(st, (uid) => (st.units[uid]?.boss && st.bossKey ? BOSSES[st.bossKey].name : this.catalog.get(st.units[uid]?.id)?.name) || 'Une créature'), boss: st.bossKey || null };
    t.done[i] = won ? 'won' : 'lost'; t.battle = null; t.cur = null;
    if (won) {
      const r = this.trialReward(i), allies = Object.values(st.units).filter((u) => u.side === 'ally');
      const hpPct = Math.round((allies.reduce((a, u) => a + Math.max(0, u.hp), 0) / Math.max(1, allies.reduce((a, u) => a + u.maxHp, 0))) * 100);
      this.grant(r, 'trial'); this.codexXp(CODEX_XP.trial, 'trial');
      out.reward = r; out.points = 100 + hpPct;
      t.score = (t.score || 0) + out.points;
      this.track('win', 1); this.track('trial', 1);
      out.fame = this.gainFame(allies.filter((u) => u.hp > 0).map((u) => u.id), 1);
      out.season = this.seasonWin();
      if (!this.s.stats.firstWin) { this.s.stats.firstWin = Date.now(); this.s.shards += FIRST_WIN; out.firstWin = FIRST_WIN; }
    }
    this.s.stats.trials = (this.s.stats.trials || 0) + 1;
    if (won) this.s.stats.trialWins = (this.s.stats.trialWins || 0) + 1;
    out.score = t.score; out.day = t.day; out.allDone = t.done.every(Boolean);
    if (out.allDone && t.done.every((x) => x === 'won')) { this.s.stats.trialPerfect = (this.s.stats.trialPerfect || 0) + 1; out.perfect = true; }
    this.emit('trialEnd', out);
    this.checkProgress();
    this.persist();
    return out;
  }
  // Abandon d'une Épreuve en cours : elle compte comme perdue
  abandonTrial() {
    const t = this.trials();
    if (!t.battle) throw new Error('Aucune Épreuve en cours.');
    t.battle.over = 'lost';
    return this.finishTrial();
  }
  autoTrial() { autoDuel(this.trials().battle); return this.finishTrial(); }

  // ——— v540 : les coups d'un combat (Descente : 'run', Épreuve : 'trial') passent par le jeu : le serveur de partie les rejoue
  // un par un depuis le même départ (même graine) et c'est son combat qui compte. Seuls les résultats de défense (esquive,
  // parade) et du lancer chargé viennent du joueur.
  duelState(where) {
    const st = where === 'trial' ? this.trials().battle : where === 'run' ? this.s.descent.run?.battle : null;
    if (!st) throw new Error('Aucun combat en cours.');
    return st;
  }
  duelAct(where, uid, key, t = null, rhythm = 0) {
    const st = this.duelState(where);
    st.rhythm = [RHYTHM.good, RHYTHM.perfect].includes(rhythm) ? rhythm : 0;
    const ev = duelActRaw(st, uid, key, t);
    this.persist();
    return ev;
  }
  duelUlt(where) { const ev = useUlt(this.duelState(where)); this.persist(); return ev; }
  duelPass(where) { const ev = beginEnemyTurn(this.duelState(where)); this.persist(); return ev; }
  // ennemi suivant (avec les tours passés : gel, Brisure) ; son coup se joue ensuite avec duelEnemy
  duelNext(where) {
    const st = this.duelState(where), s = nextEnemy(st);
    st.nextQte = s ? { a: s.a, qte: !!s.qte } : null;
    return s ? { s, skips: takeSkips(st) } : null;
  }
  duelEnemy(where, a, res = 'none') {
    const st = this.duelState(where), q = st.nextQte;
    const d = q && q.a === a && q.qte && (res === 'dodge' || res === 'parry') ? res : 'none'; // une défense seulement sur un coup qui se défend
    st.nextQte = null;
    const ev = enemyAct(st, a, d);
    this.persist();
    return ev;
  }
  duelEndEnemy(where) { const ev = endEnemyTurn(this.duelState(where)); this.persist(); return ev; }

  // ——— Duels des Sceaux ———
  // Main du joueur : 5 cartes possédées (complétée par les cartes de départ prêtées s'il en manque)
  sceauxHand() {
    const owned = Object.keys(this.s.collection);
    const saved = (this.s.sceaux.hand || []).filter((id) => this.owns(id) || STARTER.includes(id));
    return saved.length === 5 ? saved : SC.autoHand(this.catalog, owned);
  }
  setSceauxHand(ids) {
    const list = [...new Set(ids)].filter((id) => this.owns(id) || STARTER.includes(id));
    if (list.length !== 5) throw new Error('Choisis exactement 5 cartes.');
    this.s.sceaux.hand = list; this.persist(); return list;
  }
  sceauxOpen() { return true; } /* v520 : la Salle des jeux est ouverte dès le départ (décision du propriétaire du 20 octobre 2026 ; avant : après le premier gardien) */
  /* v455 : Mode Créateur, Salle des jeux ouverte comme si le premier gardien était vaincu (sans toucher à la campagne) */
  devGames() { return !!(this.s.settings?.dev && this.s.devGames); }
  sceauxUnlocked() { return SC.RIVALS.filter((_, i) => SC.rivalUnlocked(this.s, i)).length; }
  sceauxDaily() {
    const n = this.sceauxUnlocked(), known = [...new Set(SC.RIVALS.slice(0, n).map((r) => r.rule))].filter((k) => k !== 'classique' && SC.RULE_LIST.includes(k));
    return SC.dailyChallenge(today(this.clock()), n, known);
  }
  sceauxDailyOpen() { return !!this.s.sceaux.beaten?.initie; } /* v403 : le défi du jour s'ouvre après une victoire contre Ilda */
  sceauxStart({ rival, daily = false, awake = false } = {}) {
    const sc = this.s.sceaux;
    if (sc.cur?.over && !sc.cur.rewarded) this.sceauxFinish(); /* v819 : une partie finie mais pas encaissée (app coupée avant l'écran de fin) n'est plus écrasée sans ses récompenses */
    let R = SC.RIVAL[rival], seed = null;
    if (daily) {
      if (!this.sceauxDailyOpen()) throw new Error('Le défi du jour s’ouvre après ta première victoire contre Ilda.');
      const d = this.sceauxDaily();
      if (sc.dailyDone === today(this.clock())) throw new Error('Défi du jour déjà relevé. Reviens demain !');
      if (sc.dailyTried === today(this.clock())) throw new Error('Tu as déjà tenté le défi du jour. Nouveau défi demain !'); /* v538 : un seul essai (le défi est le même toute la journée : le rejouer, c'est le connaître par cœur) */
      R = { ...SC.RIVAL[d.rival], rule: d.rule }; seed = d.seed;
    } else {
      const i = SC.RIVALS.findIndex((r) => r.key === rival);
      if (i < 0) throw new Error('Adversaire inconnu.');
      if (!SC.rivalUnlocked(this.s, i)) throw new Error('Bats d’abord l’adversaire précédent.');
      if (awake) { if (!sc.beaten[rival]) throw new Error('Bats-le d’abord une fois.'); R = SC.awakened(R); }
    }
    if (seed == null) seed = this.seed('sceaux');
    sc.cur = SC.newGame(this.catalog, { hand: this.sceauxHand(), rival: R, seed, daily });
    sc.cur.rs = sessSeed(seed);
    if (daily) { sc.cur.dailyDay = today(this.clock()); sc.dailyTried = sc.cur.dailyDay; } /* v536 : un défi commencé avant minuit compte pour son jour ; v538 : essai noté dès le départ */
    sc.cur.ruleKey = R.rule; sc.cur.rule = R.rule;
    this.persist();
    return sc.cur;
  }
  sceauxPlay(handIdx, cell) {
    const st = this.s.sceaux.cur;
    if (!st) throw new Error('Aucune partie en cours.');
    const flips = SC.place(this.catalog, st, 'p', handIdx, cell);
    this.persist();
    return flips;
  }
  sceauxAi() {
    const st = this.s.sceaux.cur;
    if (!st || st.over || st.turn !== 'o') return null;
    const ai = st.ai || { level: Math.min(4, st.level || SC.RIVAL[st.rival].level), slip: 0 }; // sans réglage : force d'avant v304 (le niveau 5 jouait comme le 4)
    const m = SC.aiMove(this.catalog, st, ai.level, sessRng(st), ai.slip, ai.tol ?? Infinity);
    const flips = SC.place(this.catalog, st, 'o', m[0], m[1]);
    this.persist();
    return { cell: m[1], flips };
  }
  // Fin de partie : récompenses (une seule fois par partie, plafonnées par jour), titres, historique
  sceauxFinish() {
    const sc = this.s.sceaux, st = sc.cur;
    if (!st || !st.over) throw new Error('La partie n’est pas terminée.');
    if (st.rewarded) return st.result;
    const day = today(this.clock());
    if (sc.day !== day) { sc.day = day; sc.paidToday = 0; }
    const R = st.awake ? SC.awakened(SC.RIVAL[st.rival]) : SC.RIVAL[st.rival];
    sc.awake ||= {};
    const out = { result: st.over, shards: 0, first: false, title: null, daily: st.daily, capped: false };
    if (st.over === 'won') { this.codexXp(CODEX_XP.game, 'game');
      sc.wins++; sc.streak++; sc.best = Math.max(sc.best, sc.streak);
      out.chests = [];
      if (st.awake) { if (!sc.awake[R.key]) { sc.awake[R.key] = Date.now(); out.first = true; out.shards += SC.SCEAUX_REWARD.firstAwake; out.chests.push(SC.sceauxChest(R.key, true)); } }
      else if (!sc.beaten[R.key]) { sc.beaten[R.key] = Date.now(); out.first = true; out.shards += SC.SCEAUX_REWARD.firstWin; out.chests.push(SC.sceauxChest(R.key)); }
      if (st.daily && sc.dailyDone !== (st.dailyDay || day)) { sc.dailyDone = st.dailyDay || day; out.shards += SC.SCEAUX_REWARD.daily; out.chests.push('bois'); }
      out.chests = out.chests.filter(Boolean); out.chests.forEach((c) => { this.s.chests[c] = (this.s.chests[c] || 0) + 1; }); /* v408 */
      if (sc.paidToday < SC.SCEAUX_REWARD.dailyPaid) { sc.paidToday++; out.shards += R.reward; } else { out.capped = true; out.shards += SC.SCEAUX_REWARD.afterCap; } // v348 : un petit gain reste au-delà du plafond
      const t = st.awake ? (Object.keys(sc.awake).length >= SC.RIVALS.length ? 'Vainqueur des Implacables' : null) : SC.SCEAUX_TITLES[R.key] || (sc.wins === 1 ? SC.SCEAUX_TITLES.initie : null);
      if (t && !this.s.titles.includes(t)) { this.s.titles.push(t); out.title = t; }
      if (R.key === 'echo' && !this.s.frames.includes('sceaux')) { this.s.frames.push('sceaux'); out.frame = 'sceaux'; }
      // Trophée : une carte adverse capturée, une fois par jour
      if (sc.trophyDay !== day) { const ch = SC.trophyChoices(this.catalog, st); if (ch.length) { st.trophy = ch; out.trophy = ch; } }
    } else if (st.over === 'lost') { sc.losses++; sc.streak = 0; } else { sc.draws++; if (st.daily && sc.dailyDone !== (st.dailyDay || day)) { sc.dailyDone = st.dailyDay || day; out.shards += 10; } }
    this.s.shards += out.shards;
    out.xp = st.forfeit ? 0 : SC.SCEAUX_REWARD.xp; this.s.xp += out.xp; /* v754 : pas d'expérience pour un abandon */ // v348 : chaque partie terminée donne un peu d'expérience
    sc.history.unshift({ t: Date.now(), rival: R.key, r: st.over, s: st.final });
    sc.history = sc.history.slice(0, 20);
    this.tourneyAfter(st, out); /* v795 */
    st.rewarded = true; st.result = out;
    this.track('sceaux', 1);
    this.checkProgress();
    this.persist();
    return out;
  }
  // Garde la carte choisie parmi les trophées de la partie (une fois par jour)
  sceauxTrophy(id) {
    const sc = this.s.sceaux, st = sc.cur, day = today(this.clock());
    if (!st?.trophy?.includes(id) || sc.trophyDay === day) throw new Error('Butin indisponible.');
    sc.trophyDay = day; st.trophy = null;
    const r = this.addCard(id, 'normal', 'reward');
    this.checkProgress(); /* v536 : un ensemble ou un succès complété par le butin compte tout de suite */
    this.persist();
    return r;
  }
  sceauxQuit() { this.s.sceaux.cur = null; this.persist(); }
  /* v795 : Tournoi du Cercle : chaque semaine (du lundi au dimanche), un des quatre jeux ; il faut battre ses 8 adversaires
     d'affilée, dans l'ordre des salles. Une défaite (ou une égalité) arrête la série : on peut recommencer depuis la 1re manche.
     4 manches gagnées : coffre d'or ; les 8 : coffre abyssal et 2 tickets premium (une fois par semaine chacun).
     La meilleure manche de la semaine part sur la fiche du joueur (classement entre amis). */
  tourneyWeek(day = today(this.clock())) { const [y, m, d] = day.split('-').map(Number); return Math.floor((Date.UTC(y, m - 1, d) / 86400000 + 3) / 7); }
  tourney() {
    const week = this.tourneyWeek(), game = TOURNEY_GAMES[week % TOURNEY_GAMES.length], t = this.s.tourney?.week === week ? this.s.tourney : null;
    return { week, game, tables: tourneyTables(game), round: t?.round || 0, alive: t ? t.alive !== false : true, best: t?.best || 0, champ: !!t?.champ, gold: !!t?.gold, wins: this.s.tourneyWins || 0 };
  }
  tourneyPlay() {
    const T = this.tourney();
    let t = this.s.tourney;
    if (!t || t.week !== T.week) t = this.s.tourney = { week: T.week, game: T.game, round: 0, alive: true, best: 0 };
    if (t.alive === false || t.round >= T.tables.length) { t.round = 0; t.alive = true; }
    const sv = this.s[T.game];
    if (sv?.cur && !sv.cur.over) throw new Error('Termine d’abord ta partie en cours de ce jeu.');
    const key = T.tables[t.round];
    const cur = T.game === 'sceaux' ? this.sceauxStart({ rival: key }) : T.game === 'pacte' ? this.pacteStart({ table: key }) : T.game === 'cryptes' ? this.cryptesStart({ table: key }) : this.encheresStart({ table: key });
    cur.tourney = { week: T.week, round: t.round };
    this.persist();
    return cur;
  }
  tourneyAfter(st, out) {
    const t = this.s.tourney;
    if (!st?.tourney || !t || t.week !== st.tourney.week || t.round !== st.tourney.round || t.alive === false) return;
    if (st.over !== 'won' || st.forfeit) { t.alive = false; out.tourney = { lost: true, round: t.round }; return; }
    t.round++; t.best = Math.max(t.best || 0, t.round);
    const r = (out.tourney = { round: t.round, of: tourneyTables(t.game).length });
    this.emit('progress', [{ kind: 'tourney', name: t.round >= r.of ? 'Champion du Cercle cette semaine !' : `Manche ${t.round} sur ${r.of} gagnée` }]);
    if (t.round >= 4 && !t.gold) { t.gold = Date.now(); this.s.chests.or = (this.s.chests.or || 0) + 1; r.chest = 'or'; /* v851 : sans jeton du Choc */ }
    if (t.round >= r.of) { r.champ = true; if (!t.champ) { t.champ = Date.now(); this.s.tourneyWins = (this.s.tourneyWins || 0) + 1; this.s.chests.abyssal = (this.s.chests.abyssal || 0) + 1; this.grant({ tickets: { premium: 2 } }, 'tourney'); r.reward = true; } }
  }
  // ——— v427 : les Enchères de Mammon (enchères à l'aveugle à trois), ouvertes avec la Salle des jeux ———
  encheresUnlocked() { return EN.TABLES.filter((_, i) => EN.tableUnlocked(this.s, i)).length; }
  encheresDailyOpen() { return !!this.s.encheres.beaten?.etal; }
  encheresDaily() { const day = today(this.clock()); return { table: EN.dailyTable(day, this.encheresUnlocked()), seed: [...`encheres:${day}`].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261) }; }
  encheresStart({ table, daily = false } = {}) {
    const en = this.s.encheres;
    if (en.cur?.over && !en.cur.rewarded) this.encheresFinish(); /* v819 : une partie finie mais pas encaissée (app coupée avant l'écran de fin) n'est plus écrasée sans ses récompenses */
    if (!this.sceauxOpen()) throw new Error('Les Enchères de Mammon s’ouvrent après ton premier gardien.');
    let seed = null;
    if (daily) {
      if (!this.encheresDailyOpen()) throw new Error('Le défi du jour s’ouvre après ta première victoire à l’Étal des curiosités.');
      if (en.dailyDone === today(this.clock())) throw new Error('Défi du jour déjà relevé. Reviens demain !');
      if (en.dailyTried === today(this.clock())) throw new Error('Tu as déjà tenté le défi du jour. Nouveau défi demain !'); /* v538 : un seul essai (le défi est le même toute la journée : le rejouer, c'est le connaître par cœur) */
      const d = this.encheresDaily(); table = d.table; seed = d.seed;
    } else {
      const i = EN.TABLES.findIndex((t) => t.key === table);
      if (i < 0) throw new Error('Table inconnue.');
      if (!EN.tableUnlocked(this.s, i)) throw new Error('Gagne d’abord à la table précédente.');
    }
    if (seed == null) seed = this.seed('encheres');
    en.cur = EN.newGame(this.catalog, { table, seed, daily });
    en.cur.rs = sessSeed(seed);
    if (daily) { en.cur.dailyDay = today(this.clock()); en.dailyTried = en.cur.dailyDay; } /* v536 : un défi commencé avant minuit compte pour son jour ; v538 : essai noté dès le départ */
    this.persist();
    return en.cur;
  }
  // Une manche : ton offrande, celles des deux enchérisseurs, puis le lot part (ou reste sur la table)
  encheresBid(offer) {
    const st = this.s.encheres.cur;
    if (!st || st.over) throw new Error('Aucune vente en cours.');
    const ev = EN.resolve(st, { p: offer, ...EN.aiBids(st, sessRng(st)) });
    this.persist();
    return ev;
  }
  encheresFinish() {
    const en = this.s.encheres, st = en.cur;
    if (!st || !st.over) throw new Error('La vente n’est pas terminée.');
    if (st.rewarded) return st.result;
    const day = today(this.clock());
    if (en.day !== day) { en.day = day; en.paidToday = 0; }
    const T = EN.TABLE[st.table], R = EN.ENCHERES_REWARD;
    const out = { result: st.over, shards: 0, first: false, title: null, daily: st.daily, capped: false, chests: [] };
    if (st.over === 'won') { this.codexXp(CODEX_XP.game, 'game');
      en.wins++; en.streak++; en.best = Math.max(en.best, en.streak);
      if (!en.beaten[T.key]) { en.beaten[T.key] = Date.now(); out.first = true; out.shards += R.firstWin; out.chests.push(T.chest); }
      if (st.daily && en.dailyDone !== (st.dailyDay || day)) { en.dailyDone = st.dailyDay || day; out.shards += R.daily; out.chests.push('bois'); }
      if (en.paidToday < R.dailyPaid) { en.paidToday++; out.shards += T.reward; } else { out.capped = true; out.shards += R.afterCap; }
      out.chests.forEach((c) => { this.s.chests[c] = (this.s.chests[c] || 0) + 1; });
      /* v492 : le titre d'origine reste attaché à la 4e salle ; la 8e et les hauts faits ont le leur */
      const titles = [];
      if (T.key === 'grande') titles.push(EN.ENCHERES_TITLE);
      if (T.key === EN.TABLES.at(-1).key) titles.push(EN.LAST_TITLE);
      en.feats ||= {};
      if (EN.featOk(st) && !en.feats[T.key]) { en.feats[T.key] = Date.now(); out.feat = EN.FEATS[T.key].text; out.shards += EN.FEAT_SHARDS; }
      if (EN.TABLES.every((t) => en.feats[t.key])) titles.push(EN.FEATS_TITLE);
      for (const t of titles) if (!this.s.titles.includes(t)) { this.s.titles.push(t); out.title = out.title ? `${out.title}, ${t}` : t; }
    } else { en.losses++; en.streak = 0; }
    this.s.shards += out.shards;
    out.xp = st.forfeit ? 0 : R.xp; this.s.xp += out.xp; /* v754 : pas d'expérience pour un abandon */
    en.history.unshift({ t: Date.now(), table: T.key, r: st.over, s: st.final?.scores });
    en.history = en.history.slice(0, 20);
    this.tourneyAfter(st, out); /* v795 */
    st.rewarded = true; st.result = out;
    this.track('encheres', 1);
    this.checkProgress();
    this.persist();
    return out;
  }
  encheresQuit() { this.s.encheres.cur = null; this.persist(); }
  // ——— v449 : Le Pacte (tenter sa chance à deux), ouvert avec la Salle des jeux ———
  pacteUnlocked() { return PA.TABLES.filter((_, i) => PA.tableUnlocked(this.s, i)).length; }
  pacteDailyOpen() { return !!this.s.pacte.beaten?.novice; }
  /* v466 : défis du jour de la Salle des jeux encore à relever (pastille de l'onglet Jeux, tuiles, Accueil) */
  gamesDailyLeft() {
    if (!this.sceauxOpen()) return [];
    const day = today(this.clock());
    return [['sceaux', this.sceauxDailyOpen(), this.s.sceaux], ['pacte', this.pacteDailyOpen(), this.s.pacte], ['cryptes', this.cryptesDailyOpen(), this.s.cryptes], ['encheres', this.encheresDailyOpen(), this.s.encheres]]
      .filter(([, open, sv]) => open && sv?.dailyDone !== day && sv?.dailyTried !== day).map(([k]) => k);
  }
  /* v538 : état du défi du jour d'un jeu : 'won' (gagné), 'tried' (essai utilisé), 'open' (à relever) */
  dailyState(k) { const sv = this.s[k], day = today(this.clock()); return sv?.dailyDone === day ? 'won' : sv?.dailyTried === day ? 'tried' : 'open'; }
  pacteDaily() { const day = today(this.clock()); return { table: PA.dailyTable(day, this.pacteUnlocked()), seed: [...`pacte:${day}`].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261) }; }
  pacteStart({ table, daily = false } = {}) {
    const pa = this.s.pacte;
    if (pa.cur?.over && !pa.cur.rewarded) this.pacteFinish(); /* v819 : une partie finie mais pas encaissée (app coupée avant l'écran de fin) n'est plus écrasée sans ses récompenses */
    if (!this.sceauxOpen()) throw new Error('Le Pacte s’ouvre après ton premier gardien.');
    let seed = null;
    if (daily) {
      if (!this.pacteDailyOpen()) throw new Error('Le défi du jour s’ouvre après ta première victoire au Pacte du novice.');
      if (pa.dailyDone === today(this.clock())) throw new Error('Défi du jour déjà relevé. Reviens demain !');
      if (pa.dailyTried === today(this.clock())) throw new Error('Tu as déjà tenté le défi du jour. Nouveau défi demain !'); /* v538 : un seul essai (le défi est le même toute la journée : le rejouer, c'est le connaître par cœur) */
      const d = this.pacteDaily(); table = d.table; seed = d.seed;
    } else {
      const i = PA.TABLES.findIndex((x) => x.key === table);
      if (i < 0) throw new Error('Table inconnue.');
      if (!PA.tableUnlocked(this.s, i)) throw new Error('Gagne d’abord le pacte précédent.');
    }
    if (seed == null) seed = this.seed('pacte');
    pa.cur = PA.newGame(this.catalog, { table, seed, daily });
    pa.cur.rs = sessSeed(seed);
    if (daily) { pa.cur.dailyDay = today(this.clock()); pa.dailyTried = pa.cur.dailyDay; } /* v536 : un défi commencé avant minuit compte pour son jour ; v538 : essai noté dès le départ */
    this.persist();
    return pa.cur;
  }
  pacteDraw() { const st = this.s.pacte.cur; if (!st || st.over || st.turn !== 'p') throw new Error('Ce n’est pas ton tour.'); const ev = PA.draw(st); this.persist(); return ev; }
  pacteStop() { const st = this.s.pacte.cur; if (!st || st.over || st.turn !== 'p') throw new Error('Ce n’est pas ton tour.'); const ev = PA.stop(st); this.persist(); return ev; }
  pacteDouble() { const st = this.s.pacte.cur; if (!st || st.over || st.turn !== 'p') throw new Error('Ce n’est pas ton tour.'); const ev = PA.double(st); this.persist(); return ev; } /* v561 : Double ou rien */
  pacteAi() { const st = this.s.pacte.cur; if (!st || st.over || st.turn !== 'a') return []; const evs = PA.aiTurn(st, sessRng(st)); this.persist(); return evs; }
  pacteFinish() {
    const pa = this.s.pacte, st = pa.cur;
    if (!st || !st.over) throw new Error('La partie n’est pas terminée.');
    if (st.rewarded) return st.result;
    const day = today(this.clock());
    if (pa.day !== day) { pa.day = day; pa.paidToday = 0; }
    const T = PA.TABLE[st.table], R = PA.PACTE_REWARD;
    const out = { result: st.over, shards: 0, first: false, title: null, daily: st.daily, capped: false, chests: [] };
    if (st.over === 'won') { this.codexXp(CODEX_XP.game, 'game');
      pa.wins++; pa.streak++; pa.best = Math.max(pa.best, pa.streak);
      if (!pa.beaten[T.key]) { pa.beaten[T.key] = Date.now(); out.first = true; out.shards += R.firstWin; out.chests.push(T.chest); }
      if (st.daily && pa.dailyDone !== (st.dailyDay || day)) { pa.dailyDone = st.dailyDay || day; out.shards += R.daily; out.chests.push('bois'); }
      if (pa.paidToday < R.dailyPaid) { pa.paidToday++; out.shards += T.reward; } else { out.capped = true; out.shards += R.afterCap; }
      out.chests.forEach((c) => { this.s.chests[c] = (this.s.chests[c] || 0) + 1; });
      /* v492 : le titre d'origine reste attaché à la 4e salle ; la 8e et les hauts faits ont le leur */
      const titles = [];
      if (T.key === 'mammon') titles.push(PA.PACTE_TITLE);
      if (T.key === PA.TABLES.at(-1).key) titles.push(PA.LAST_TITLE);
      pa.feats ||= {};
      if (PA.featOk(st) && !pa.feats[T.key]) { pa.feats[T.key] = Date.now(); out.feat = PA.FEATS[T.key].text; out.shards += PA.FEAT_SHARDS; }
      if (PA.TABLES.every((t) => pa.feats[t.key])) titles.push(PA.FEATS_TITLE);
      for (const t of titles) if (!this.s.titles.includes(t)) { this.s.titles.push(t); out.title = out.title ? `${out.title}, ${t}` : t; }
    } else { pa.losses++; pa.streak = 0; }
    this.s.shards += out.shards;
    out.xp = st.forfeit ? 0 : R.xp; this.s.xp += out.xp; /* v754 : pas d'expérience pour un abandon */
    pa.history.unshift({ t: Date.now(), table: T.key, r: st.over, s: st.final?.scores });
    pa.history = pa.history.slice(0, 20);
    this.tourneyAfter(st, out); /* v795 */
    st.rewarded = true; st.result = out;
    this.track('pacte', 1);
    this.checkProgress();
    this.persist();
    return out;
  }
  pacteQuit() { this.s.pacte.cur = null; this.persist(); }
  // v540 : quitter une partie de mini-jeu en cours : elle compte comme perdue (avant : l'écran modifiait la partie lui-même)
  gameForfeit(k) {
    const st = this.s[k]?.cur;
    if (!st || st.over) return null;
    st.forfeit = true; /* v754 : un abandon ne rapporte pas d'expérience (sinon : lancer puis quitter en boucle) */
    if (k === 'sceaux') { st.over = 'lost'; st.final = SC.score(st); return this.sceauxFinish(); }
    if (k === 'pacte') { st.over = 'lost'; st.final = { scores: { ...st.scores } }; return this.pacteFinish(); }
    if (k === 'cryptes') { st.over = 'lost'; st.final = { scores: { p: CR.scoreOf(st, 'p'), a: CR.scoreOf(st, 'a') } }; return this.cryptesFinish(); }
    if (k === 'encheres') { st.over = 'lost'; st.final = { scores: { p: 0, a: 0, b: 0 }, order: ['a', 'b', 'p'] }; return this.encheresFinish(); }
    return null;
  }
  // reprise d'une partie des Cryptes : les cartes retournées se referment
  cryptesResume() { const st = this.s.cryptes.cur; if (st && !st.over) { st.open = []; this.persist(); } }
  // ——— v450 : Les Cryptes (mémoire à deux, pouvoirs des factions), ouvertes avec la Salle des jeux ———
  cryptesUnlocked() { return CR.TABLES.filter((_, i) => CR.tableUnlocked(this.s, i)).length; }
  cryptesDailyOpen() { return !!this.s.cryptes.beaten?.ossuaire; }
  cryptesDaily() { const day = today(this.clock()); return { table: CR.dailyTable(day, this.cryptesUnlocked()), seed: [...`cryptes:${day}`].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261) }; }
  cryptesStart({ table, daily = false } = {}) {
    const cr = this.s.cryptes;
    if (cr.cur?.over && !cr.cur.rewarded) this.cryptesFinish(); /* v819 : une partie finie mais pas encaissée (app coupée avant l'écran de fin) n'est plus écrasée sans ses récompenses */
    if (!this.sceauxOpen()) throw new Error('Les Cryptes s’ouvrent après ton premier gardien.');
    let seed = null;
    if (daily) {
      if (!this.cryptesDailyOpen()) throw new Error('Le défi du jour s’ouvre après ta première victoire à l’Ossuaire.');
      if (cr.dailyDone === today(this.clock())) throw new Error('Défi du jour déjà relevé. Reviens demain !');
      if (cr.dailyTried === today(this.clock())) throw new Error('Tu as déjà tenté le défi du jour. Nouveau défi demain !'); /* v538 : un seul essai (le défi est le même toute la journée : le rejouer, c'est le connaître par cœur) */
      const d = this.cryptesDaily(); table = d.table; seed = d.seed;
    } else {
      const i = CR.TABLES.findIndex((x) => x.key === table);
      if (i < 0) throw new Error('Table inconnue.');
      if (!CR.tableUnlocked(this.s, i)) throw new Error('Gagne d’abord dans la crypte précédente.');
    }
    if (seed == null) seed = this.seed('cryptes');
    cr.cur = CR.newGame(this.catalog, { table, seed, daily });
    cr.cur.rs = sessSeed(seed);
    if (daily) { cr.cur.dailyDay = today(this.clock()); cr.dailyTried = cr.cur.dailyDay; } /* v536 : un défi commencé avant minuit compte pour son jour ; v538 : essai noté dès le départ */
    this.persist();
    return cr.cur;
  }
  cryptesFlip(i) { const st = this.s.cryptes.cur; if (!st || st.over || st.turn !== 'p') throw new Error('Ce n’est pas ton tour.'); const ev = CR.flip(st, i, sessRng(st)); this.persist(); return ev; }
  cryptesPower(picks) { const st = this.s.cryptes.cur; if (!st || st.over) throw new Error('Aucune partie en cours.'); const ev = CR.usePower(st, picks, sessRng(st)); this.persist(); return ev; }
  // un geste de l'adversaire (une carte retournée), pour que l'écran le montre pas à pas
  cryptesAi() { const st = this.s.cryptes.cur; if (!st || st.over || st.turn !== 'a') return null; const r = sessRng(st), ev = CR.flip(st, CR.aiPick(st, r), r); this.persist(); return ev; }
  cryptesFinish() {
    const cr = this.s.cryptes, st = cr.cur;
    if (!st || !st.over) throw new Error('La partie n’est pas terminée.');
    if (st.rewarded) return st.result;
    const day = today(this.clock());
    if (cr.day !== day) { cr.day = day; cr.paidToday = 0; }
    const T = CR.TABLE[st.table], R = CR.CRYPTES_REWARD;
    const out = { result: st.over, shards: 0, first: false, title: null, daily: st.daily, capped: false, chests: [] };
    if (st.over === 'won') { this.codexXp(CODEX_XP.game, 'game');
      cr.wins++; cr.streak++; cr.best = Math.max(cr.best, cr.streak);
      if (!cr.beaten[T.key]) { cr.beaten[T.key] = Date.now(); out.first = true; out.shards += R.firstWin; out.chests.push(T.chest); }
      if (st.daily && cr.dailyDone !== (st.dailyDay || day)) { cr.dailyDone = st.dailyDay || day; out.shards += R.daily; out.chests.push('bois'); }
      if (cr.paidToday < R.dailyPaid) { cr.paidToday++; out.shards += T.reward; } else { out.capped = true; out.shards += R.afterCap; }
      out.chests.forEach((c) => { this.s.chests[c] = (this.s.chests[c] || 0) + 1; });
      /* v492 : le titre d'origine reste attaché à la 4e salle ; la 8e et les hauts faits ont le leur */
      const titles = [];
      if (T.key === 'puits') titles.push(CR.CRYPTES_TITLE);
      if (T.key === CR.TABLES.at(-1).key) titles.push(CR.LAST_TITLE);
      cr.feats ||= {};
      if (CR.featOk(st) && !cr.feats[T.key]) { cr.feats[T.key] = Date.now(); out.feat = CR.FEATS[T.key].text; out.shards += CR.FEAT_SHARDS; }
      if (CR.TABLES.every((t) => cr.feats[t.key])) titles.push(CR.FEATS_TITLE);
      for (const t of titles) if (!this.s.titles.includes(t)) { this.s.titles.push(t); out.title = out.title ? `${out.title}, ${t}` : t; }
    } else { cr.losses++; cr.streak = 0; }
    this.s.shards += out.shards;
    out.xp = st.forfeit ? 0 : R.xp; this.s.xp += out.xp; /* v754 : pas d'expérience pour un abandon */
    cr.history.unshift({ t: Date.now(), table: T.key, r: st.over, s: st.final?.scores });
    cr.history = cr.history.slice(0, 20);
    this.tourneyAfter(st, out); /* v795 */
    st.rewarded = true; st.result = out;
    this.track('cryptes', 1);
    this.checkProgress();
    this.persist();
    return out;
  }
  cryptesQuit() { this.s.cryptes.cur = null; this.persist(); }
  // Trois objectifs pour l'accueil : un proche (Descente), un de progression (gardien ou Sceaux),
  // un de collection (le royaume le plus proche d'être complet). Chacun mène à son écran.
  goals() {
    const out = [], d = this.descent(), best = d.best || 0;
    let bf = 0;
    for (let f = 5; f <= 60; f += 5) if (!this.s.bossesBeaten[bossOf(f)]) { bf = f; break; }
    if (d.run) out.push({ kind: 'run', title: `Reprends le chapitre ${chapterOf(d.run.start || d.run.floor)}`, sub: `Étage ${d.run.floor} · ton équipe t’attend dans l’Abysse`, href: '#/descente', icon: 'descend' });
    else {
      // v406 : la campagne avance chapitre par chapitre : l'objectif est le gardien du chapitre en cours
      const ch = this.chapterNow(), bossF = ch * CHAPTER, B = BOSSES[bossOf(bossF)], chest = CHESTS[(bossF / CHAPTER) % 2 ? 'or' : 'abyssal'];
      if (this.campaignDone()) out.push({ kind: 'depth', title: 'Rejoue un chapitre en Cauchemar', sub: `Tu as atteint le fond de l’Abysse : le Cauchemar redonne les récompenses de chaque étage, en plus généreux`, href: '#/descente', icon: 'depth' });
      else out.push({ kind: 'depth', title: best ? `Termine le chapitre ${ch}` : 'Commence la Descente', sub: best ? `Étage ${bossF} : ${B.name} · ${chest.name.toLowerCase()} à la clé` : 'Chapitre 1 : quatre étages, puis le gardien · une récompense à chaque étage', href: '#/descente', icon: 'depth', p: best - (ch - 1) * CHAPTER, n: CHAPTER });
    }
    // équipe trop faible pour la suite, et assez de cendres pour la renforcer
    // v328 : dès la première expédition, Renforcer est mis sur le chemin (avant, le niveau demandé valait 1 jusqu'à l'étage 8,
    // et des joueurs finissaient le mois avec une équipe entière au niveau 1 et des cendres plein les poches)
    // v345 : « trop faible » se juge sur la force (rareté × niveau), plus sur le niveau seul ; au tout début, niveau 2 au moins
    const team = this.team(), tp = team.length ? team.reduce((a, id) => a + this.cardPower(id), 0) / team.length : 1;
    const short = tp < advisedPower(Math.max(best + 1, 4));
    const weak = team.map((id) => ({ id, lv: this.cardLevel(id) })).filter((x) => x.lv < MAX_LEVEL && (short || x.lv < (best >= 1 ? 2 : 1))).sort((a, b) => a.lv - b.lv)[0];
    if (weak && this.s.ash >= this.upgradeCost(weak.id)) {
      const c = this.catalog.get(weak.id), cost = this.upgradeCost(weak.id);
      const forge = { kind: 'forge', title: `Renforce ${c.name}`, sub: `Niveau ${weak.lv} → ${weak.lv + 1} pour ${cost} cendres (tu en as ${this.s.ash}) : plus de PV et d’attaque`, href: '#/renfort', icon: 'level-up' };
      // jamais rien monté : c'est l'objectif principal (affiché en grand), sauf pendant une expédition
      if (!d.run && team.every((id) => this.cardLevel(id) <= 1)) out.unshift(forge); else out.push(forge);
    }
    // v328 : équipe au niveau maximal et cendres qui dorment : Sublimer (finition supérieure) devient l'objectif
    if (team.length && this.shopOn() && team.every((id) => this.cardLevel(id) >= MAX_LEVEL)) { /* v615 : en obsidiennes, seulement quand l'Échoppe est ouverte */
      const sub = Object.keys(this.s.collection).map((id) => ({ id, x: this.sublimeInfo(id) })).filter((o) => o.x && o.x.cost <= this.obs())
        .sort((a, b) => (this.isFav(b.id) - this.isFav(a.id)) || (b.x.cost - a.x.cost))[0];
      if (sub) out.push({ kind: 'sublime', title: `Sublime ${this.catalog.get(sub.id).name}`, sub: `${VARIANTS[sub.x.to].name} pour ${sub.x.cost} obsidiennes (tu en as ${this.obs()}) · Fournaise → Sublimer`, href: '#/fournaise', icon: 'holo' });
    }
    if (bf && bf > best && out.length < 3 && !out.some((x) => x.sub?.includes(BOSSES[bossOf(bf)].name))) { /* v411 : jamais un gardien déjà dépassé */ const B = BOSSES[bossOf(bf)]; out.push({ kind: 'boss', title: `Vaincs ${B.name.replace(/^(Le|La|Les|L’) ?/, (m) => m.toLowerCase())}`, /* v731 : article en minuscule */ sub: `Gardien de l’étage ${bf} · son récit t’attend dans le Bestiaire`, href: '#/descente', icon: 'crest-boss' }); }
    else if (!bf && this.sceauxOpen()) {
      const i = SC.RIVALS.findIndex((r) => !this.s.sceaux.beaten[r.key]);
      if (i >= 0 && SC.rivalUnlocked(this.s, i)) out.push({ kind: 'sceaux', title: `Bats ${SC.RIVALS[i].name} aux Duels des Sceaux`, sub: `${SC.RIVALS[i].title} · première victoire : +${SC.SCEAUX_REWARD.firstWin} éclats`, href: '#/sceaux', icon: 'seal' });
    }
    // v328 : les Duels des Sceaux s'ouvrent après le premier gardien ; la première partie devient un objectif
    const sc = this.s.sceaux;
    if (this.sceauxOpen() && !(sc.wins + sc.losses + sc.draws) && !sc.cur && !out.some((x) => x.kind === 'sceaux')) out.push({ kind: 'sceaux', title: 'Joue ta première partie des Sceaux', sub: 'Un jeu de cartes à part, en 2 minutes, contre 8 rivaux · Aventure → Jeux', href: '#/sceaux', icon: 'seal' });
    // v331 : des éclats qui dorment alors qu'aucun booster n'a jamais été acheté (étude joueurs : jusqu'à 4 000 éclats inutilisés)
    if (!this.s.stats.shardsSpent && this.s.shards >= BOOSTERS.standard.price) out.push({ kind: 'shop', title: 'Ouvre un booster avec tes éclats', sub: `Tu as ${this.s.shards} éclats : un booster standard coûte ${BOOSTERS.standard.price}`, href: '#/boutique', icon: 'ticket' });
    // collection : un ensemble presque complet, sinon le royaume le plus avancé
    const set = this.catalog.sets.map((x) => ({ x, ...this.setProgress(x.key) })).filter((x) => !x.done && x.owned > 0 && x.total - x.owned <= 3).sort((a, b) => (a.total - a.owned) - (b.total - b.owned))[0];
    if (set) {
      const left = set.total - set.owned;
      out.push({ kind: 'collection', title: left === 1 ? `Plus qu’une créature pour l’ensemble ${set.x.name}` : `Plus que ${left} créatures pour l’ensemble ${set.x.name}`, sub: `${set.owned} / ${set.total} · une récompense t’attend au bout`, href: '#/succes', icon: 'book', p: set.owned, n: set.total });
    } else {
      const fac = FACTION_ORDER.map((f) => ({ f, ...this.factionProgress(f) })).filter((x) => x.owned < x.total).sort((a, b) => b.owned / b.total - a.owned / a.total || (a.total - a.owned) - (b.total - b.owned))[0];
      if (fac) {
        const left = fac.total - fac.owned, name = this.catalog.faction[fac.f].name;
        out.push({ kind: 'collection', title: left === 1 ? `Plus qu’une créature pour compléter ${name}` : left <= 10 ? `Plus que ${left} créatures pour compléter ${name}` : `Complète le royaume ${name}`, sub: `${fac.owned} / ${fac.total} · une récompense t’attend au bout`, href: `#/faction/${fac.f}`, icon: 'book', faction: fac.f, p: fac.owned, n: fac.total });
      }
    }
    // v407 : Épreuves du jour encore à jouer (une fois le premier chapitre commencé), s'il reste une place
    const tl = this.trials().done.filter((x) => !x).length;
    if (out.length < 3 && best >= 1 && tl && this.team().length >= TEAM.active) out.push({ kind: 'trial', title: tl === 3 ? 'Joue tes Épreuves du jour' : `Encore ${tl} Épreuve${tl > 1 ? 's' : ''} du jour`, sub: 'Trois combats à ta mesure · un coffre par victoire', href: '#/epreuves', icon: 'crest-elite' });
    return out.slice(0, 3);
  }
  // Forme choisie pour une carte (corrompue si débloquée et sélectionnée)
  formOf(id) { return this.s.forms?.[id] === 'corrompue' && formUnlocked(this, id) ? 'corrompue' : null; }
  setForm(id, form) {
    if (form === 'corrompue' && !formUnlocked(this, id)) throw new Error('Cette forme n’est pas encore libérée.');
    if (this.s.descent.run) throw new Error('Termine d’abord ton chapitre de la Descente.');
    if (form === 'corrompue') this.s.forms[id] = 'corrompue'; else delete this.s.forms[id];
    this.persist();
  }
  // Relations rencontrées pendant un combat : elles entrent dans le Bestiaire
  learnRelations(st) {
    const out = [];
    for (const k of Object.keys(st?.relSeen || {})) if (!this.s.relations[k]) { this.s.relations[k] = Date.now(); out.push(k); }
    return out;
  }
  // v307 : entre deux combats, échanger la place de deux créatures de l'expédition (les 3 premières combattent)
  swapRunTeam(i, j) {
    const run = this.s.descent.run;
    if (!run || run.phase === 'battle') throw new Error('Impossible pendant un combat.');
    const t = run.team, a = t[i], b = t[j];
    if (!a || !b || i === j) throw new Error('Choisis deux créatures.');
    if (a.fallen || b.fallen) throw new Error('Une créature tombée ne peut plus changer de place.');
    [t[i], t[j]] = [b, a];
    this.persist();
    return t;
  }
  runUnits() {
    const run = this.s.descent.run, b = run.blessings;
    return run.team.filter((m) => !m.fallen).map((m) => {
      const u = duelUnit(this.catalog.get(m.id), { level: run.devLevel || this.cardLevel(m.id), form: m.form || null });
      if (m.talent) { u.talent = m.talent; if (m.talent === 'vif') u.atk += 2; }
      if (b.includes('blades')) u.atk += 1;
      if (b.includes('ward')) u.shield = 1;
      return { ...u, maxHp: m.maxHp, hp: Math.min(m.hp, m.maxHp) };
    });
  }
  // v398 : premiers pas (record < 3 étages) : les mécaniques arrivent par paliers. Élites dès l'étage 3, objectifs et
  // traits des ennemis dès l'étage 4, dé lancé automatiquement et sans Assaut conjoint aux étages 1 et 2 (écran de combat)
  novice() { return (this.descent().best || 0) < 3; }
  doors() {
    const run = this.s.descent.run; if (!run) return [];
    let out = floorDoors(run.day, run.floor);
    if (this.novice() && run.floor < 3 && !run.free) out = out.filter((r) => r !== 'elite');
    /* v406 : plus de Gouffre (il sautait des étages de la campagne et leurs récompenses) */
    return out;
  }
  // Ce qu'une porte rapporte si on gagne (affiché dessus avant de choisir)
  doorPreview(room) {
    const run = this.s.descent.run; if (!run) return null;
    const k = room === 'boss' ? 3 : room === 'elite' ? 2 : 1, f = Math.min(run.floor, SHARD_FLOOR_CAP);
    return { rewards: this.rewardsFor(run, room), talent: room !== 'fight' && run.team.some((m) => !m.fallen && !m.talent), shards: (8 + 2 * f) * k, ash: run.free ? 0 : Math.round((2 + f / 2) * k) };
  }
  chooseDoor(room) {
    const run = this.s.descent.run;
    if (!run || run.phase !== 'doors') throw new Error('Aucune porte à choisir.');
    if (!this.doors().includes(room)) throw new Error('Porte inconnue.');
    const rule = this.rule(run.day);
    const out = { room };
    // (v250 : les Pactes de l'Abîme ne sont plus proposés ; choosePact reste pour une expédition sauvegardée en plein choix)
    return this.startBattle(room, out);
  }
  // Pacte accepté (clé) ou refusé (null), puis le combat commence
  choosePact(key) {
    const run = this.s.descent.run;
    if (!run || run.phase !== 'pact') throw new Error('Aucun pacte à choisir.');
    if (key && !(run.pactOffer || []).includes(key)) throw new Error('Pacte inconnu.');
    const room = run.pendingRoom;
    run.pact = key || null; run.pactOffer = null; run.pendingRoom = null;
    if (key) this.s.stats.pacts = (this.s.stats.pacts || 0) + 1;
    this._pactGo = room; /* v754 : startBattle n'accepte une salle qu'à travers une porte ouverte (ou un pacte accepté) */
    try { return this.startBattle(room, { room, pact: key }); } finally { this._pactGo = null; }
  }
  // v595 : ennemis d'une salle de la Descente (même calcul pour le vrai combat et le banc d'essai du Labo)
  foesFor(run, room, rule = this.rule(run.day)) {
    const eff = room === 'boss' ? run.floor : Math.max(run.floor, run.minFloor || 1);
    const sc = enemyScale(eff);
    const lvl = enemyLevel(eff, room);
    const list = floorEnemies(this.catalog, run.day, run.floor, room) /* v434 : plus d'événement de la semaine dans la Descente */;
    if (room === 'boss' && run.veille && VEILLES[run.veille] && this.catalog.get(VEILLES[run.veille].card)) list[0].id = VEILLES[run.veille].card; /* v795 : la créature qui veille */
    const enemies = list.map((e) => duelUnit(this.catalog.get(e.id), { side: 'enemy', scale: sc, level: e.boss || e.elite ? lvl : enemyLevel(eff, 'fight'), boss: e.boss, elite: e.elite }));
    for (const e of enemies) {
      // combats ordinaires : des ennemis qui frappent plus fort, pour que chaque combat ait un enjeu
      if (!e.boss && !e.elite) e.atk = Math.round(e.atk * FIGHT_ATK + 0.4);
      const f = this.catalog.get(e.id)?.faction;
      if (rule.key === 'furie' && f === rule.faction) e.atk = Math.round(e.atk * 1.25 + 0.4);
      if (rule.key === 'sommeil' && f === rule.faction) { e.maxHp = Math.max(1, Math.round(e.maxHp * 0.75)); e.hp = e.maxHp; }
      const nt = nightTier(run); if (nt) { e.maxHp = Math.round(e.maxHp * nt.hp); e.hp = e.maxHp; e.atk = Math.round(e.atk * nt.atk + 0.4); }
      if (run.omen === 'avare') e.atk = Math.round(e.atk * 1.1 + 0.4);
      { const k = (e.boss ? bossEase(run.floor) : lateSoft(run.floor)) * (run.nightmare || run.noGrit ? 1 : this.gritMult(chapterOf(run.start || 1))); if (k !== 1) { e.maxHp = Math.max(1, Math.round(e.maxHp * k)); e.hp = e.maxHp; e.atk = Math.max(1, Math.round(e.atk * k)); } if (!run.nightmare) { const h = earlyHp(run.floor, e.boss); if (h !== 1) { e.maxHp = Math.max(1, Math.round(e.maxHp * h)); e.hp = e.maxHp; } } } /* v460, v509 */
      // Gardien éveillé (Cauchemar, ou à partir de l'étage 30) : sa phase 2 commence dès le premier tour
      if (e.boss && !run.veille && (run.nightmare || run.floor >= AWAKEN_AT)) e.awakened = true; /* v795 : un Veilleur entre en Furie à mi-vie */
    }
    // un ennemi nommé : plus coriace, il rapporte un butin en plus
    if (!(this.novice() && run.floor < 4)) foeTraits(run.day, run.floor, room, enemies.length).forEach((t, i) => { if (t && !enemies[i].boss && !enemies[i].weekly) { enemies[i].trait = t; if (t === 'carapace') enemies[i].shield = 1; } });
    if (rule.key === 'nuee') enemies.forEach((e) => { if (!e.boss && !e.elite && !e.weekly && !e.trait) e.trait = 'explosif'; });
    const nm = namedFoe(run.day, run.floor, room), nf = nm && enemies.find((e) => !e.boss && !e.weekly);
    if (nf) { nf.title = nm; nf.named = true; nf.maxHp = Math.round(nf.maxHp * 1.3); nf.hp = nf.maxHp; nf.atk = Math.round(nf.atk * 1.15 + 0.4); }
    return enemies;
  }
  // v735 : Torches de la Descente (TORCHES par jour, sans réserve ; d.used remis à zéro chaque jour par descent())
  torches() { const d = this.descent(); return { left: Math.max(0, TORCHES - (d.used || 0)), max: TORCHES }; }
  startBattle(room, out = { room }) {
    const run = this.s.descent.run;
    /* v754 : seulement devant ses portes, et par une porte proposée : avant, une app modifiée pouvait lancer le gardien
       depuis n'importe quel étage, ou relancer un combat mal parti */
    if (!run || !((run.phase === 'doors' && this.doors().includes(room)) || (this._pactGo && this._pactGo === room))) throw new Error('Aucune porte à choisir.');
    out = { room, ...(out?.pact ? { pact: out.pact } : {}) };
    const rule = this.rule(run.day);
    if (room === 'fight' || room === 'elite' || room === 'boss') {
      if (!run.devFree) { /* v735 : une Torche par combat (les essais du Mode Créateur n'en brûlent pas) */
        const d = this.descent();
        if ((d.used || 0) >= TORCHES) throw new Error('Tes Torches sont éteintes : ton équipe se repose. Elles se rallument à minuit.');
        d.used = (d.used || 0) + 1;
      }
      // les créatures du Bestiaire, corrompues ; l'état du duel est gardé dans l'expédition (reprise exacte)
      // plancher : ennemis ordinaires et élites au moins au niveau de l'étage équivalent à l'équipe (pas les gardiens)
      const enemies = this.foesFor(run, room, rule); /* v595 : construction des ennemis partagée avec le banc d'essai du Mode Créateur */
      const known = {};
      enemies.forEach((e) => { if (this.knows(e.id)) known[e.id] = true; });
      run.battle = createDuel(this.runUnits(), enemies, { fervor: run.gauge || 0, ult: run.ult.key, power: run.ult.power, known, ruleMult: rule.key === 'instable' ? 1.25 : 1, boss: room === 'boss' ? this.runBoss(run) : null, pact: room === 'fight' ? null : run.pact || null, relics: OMENS[run.omen]?.relic ? [OMENS[run.omen].relic] : [], blessings: run.blessings, discovered: this.s.weakSeen || {}, seed: this.seed('duel'), goal: this.goalFor(run, room), refPow: refPowFor(Math.max(run.floor, run.minFloor || 1)) });
      if (rule.key === 'marque') run.battle.markMult = 2;
      if (run.omen === 'soif') run.battle.soif = true;
      if (run.omen) run.battle.omen = run.omen;
      startInitiative(run.battle); // v262 : chaque créature joue à son tour (ordre d'initiative, PA personnels)
      run.room = room; run.phase = 'battle'; out.battle = true;
    }
    if (run.phase === 'cleared') this.clearFloor();
    this.persist();
    return out;
  }
  // Objectif bonus du combat : le même pour un étage donné du jour
  goalFor(run, room) {
    if (run.floor < 4 && (this.descent().best || 0) < 5) return null; // dévoilés progressivement (v398 : dès l'étage 4)
    const keys = Object.keys(GOALS).filter((k) => GOALS[k].rooms.includes(room));
    return keys[Math.floor(rngOf(`goal:${run.day}:${run.floor}:${room}`)() * keys.length)];
  }
  // Talents proposés après une élite : 3 couples (créature encore debout sans talent, talent), toujours les mêmes pour l'étage
  talentOffers(run) {
    const r = rngOf(`talent:${run.day}:${run.floor}`);
    const team = run.team.filter((m) => !m.fallen && !m.talent).map((m) => m.id);
    const tal = Object.keys(TALENTS).filter((k) => !TALENTS[k].legacy);
    for (let i = tal.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [tal[i], tal[j]] = [tal[j], tal[i]]; } /* v540 : mélange identique partout (un tri au hasard dépend du navigateur) */
    const out = [];
    for (let i = 0; i < 3 && team.length; i++) out.push({ id: team[Math.floor(r() * team.length)], talent: tal[i] });
    return out;
  }
  chooseTalent(i) {
    const run = this.s.descent.run;
    const o = run?.talentOffer?.[i];
    if (!o) throw new Error('Aucun talent à choisir.');
    const m = run.team.find((x) => x.id === o.id);
    m.talent = o.talent;
    if (o.talent === 'robuste') { const add = Math.round(m.maxHp * 0.25); m.maxHp += add; m.hp += add; }
    run.talentOffer = null;
    this.persist();
    return o;
  }
  // Bonus choisi après une victoire : source (soin), autel (bénédiction) ou trésor (éclats)
  chooseReward(room) {
    const run = this.s.descent.run;
    if (!run || run.phase !== 'reward' || !(run.rewards || []).includes(room)) throw new Error('Bonus indisponible.');
    if (run.talentOffer?.length) throw new Error('Choisis d’abord un talent.');
    const rule = this.rule(run.day);
    const out = { room };
    run.rewardsBak = run.rewards; // pour revenir en arrière depuis l'autel
    run.rewards = null;
    run.phase = 'cleared';
    if (room === 'rest') {
      const k = this.restHeal(run);
      run.team.forEach((m) => { if (!m.fallen) m.hp = Math.min(m.maxHp, m.hp + Math.ceil(m.maxHp * k)); });
    } else if (room === 'treasure') {
      out.shards = this.gainShards((15 + Math.min(run.floor, SHARD_FLOOR_CAP) * 6) * (rule.key === 'disette' ? 2 : 1));
    } else if (room === 'altar') {
      run.altar = blessingChoices(run.day, run.floor, run.blessings);
      if (run.altar.length) { run.phase = 'altar'; out.altar = run.altar; }
      else { run.altar = null; run.team.forEach((m) => { if (!m.fallen) m.hp = m.maxHp; }); out.healed = true; }
    }
    this.persist();
    return out;
  }
  // v308 : montant réel d'un gain d'éclats dans la Descente (bonus compris), pour l'annoncer avant de choisir
  shardsPreview(n) {
    const run = this.s.descent.run; if (!run) return 0;
    const k = DESCENT_SHARDS * (run.blessings.includes('greed') ? 1.3 : 1) * (this.rule(run.day).key === 'ruee' ? 1.5 : this.rule(run.day).key === 'nuee' ? 1.25 : 1) * (run.omen === 'avare' ? 1.5 : 1) * (run.free ? 0.5 : 1) * (nightTier(run)?.shards || 1);
    return Math.round(n * k);
  }
  treasurePreview() { const run = this.s.descent.run; return run ? this.shardsPreview((15 + Math.min(run.floor, SHARD_FLOOR_CAP) * 6) * (this.rule(run.day).key === 'disette' ? 2 : 1)) : 0; }
  gainShards(n) {
    const run = this.s.descent.run;
    // DESCENT_SHARDS : part des éclats de la Descente (économie resserrée), bonus compris
    const got = this.shardsPreview(n);
    run.shards += got;
    return got;
  }
  clearFloor() {
    const run = this.s.descent.run;
    run.cleared = run.floor;
    if (run.veille) { const v = ((this.s.veilles ||= {})[run.veille] ||= { floors: [] }); if (!v.floors.includes(run.floor)) v.floors.push(run.floor); return; } /* v795 : le record de la Descente reste à 100 */
    /* v406 : en Cauchemar, le record du palier avance étage par étage (il décide des premières victoires) */
    if (run.nightmare) { const d = this.s.descent, t = run.nightTier || 1; const nf = this.nightFloors(t); if (!nf.includes(run.floor)) nf.push(run.floor); if (run.floor > this.nightBest(t)) (d.nightBest ||= {})[t] = run.floor; if (t === 1 && run.floor > (d.bestNightmare || 0)) d.bestNightmare = run.floor; }
    this.recordDepth(run.floor);
  }
  // Fin du combat : PV, chutes, Bestiaire de chasse, éclats et coffres, ou défaite.
  finishBattle() {
    const run = this.s.descent.run;
    if (!run || run.phase !== 'battle' || !run.battle?.over) throw new Error('Aucun combat terminé.');
    const st = run.battle, room = run.room;
    const units = Object.values(st.units).filter((u) => u.side === 'ally');
    run.team.forEach((m) => {
      const u = units.find((x) => x.id === m.id);
      if (!u) return;
      m.hp = Math.max(0, Math.min(m.maxHp, u.hp));
      if (m.hp <= 0) m.fallen = true;
    });
    // v307 : la formation de fin de combat (permutations comprises) devient celle des étages suivants
    const ord = (st.order?.ally || []).map((uid) => st.units[uid]?.id).filter(Boolean);
    if (ord.length) {
      const pos = (m) => { const i = ord.indexOf(m.id); return (m.fallen ? 1000 : 0) + (i < 0 ? 99 : i); }; // les créatures tombées passent à la fin
      run.team = run.team.slice().sort((a, b) => pos(a) - pos(b));
    }
    const carry = this.rule(run.day).key === 'reserve' ? FERVOR_MAX : FERVOR_CARRY; // v334 : Réserve de Ferveur
    run.gauge = Math.min(carry, st.fervor ?? st.gauge ?? 0); // une partie de la Ferveur se garde d'un combat à l'autre (3 au plus)
    const relNew = this.learnRelations(st);
    const bossKey = st.bossKey;
    const pactUsed = st.pact || null;
    run.pact = null;
    this.s.weakSeen = { ...(this.s.weakSeen || {}), ...(st.discovered || {}) };
    const discovered = [];
    for (const id of st.kills) {
      if (!this.s.hunt[id]) discovered.push(id);
      const before = huntStage(this.s.hunt[id] || 0);
      this.s.hunt[id] = (this.s.hunt[id] || 0) + 1;
      run.kills[id] = (run.kills[id] || 0) + 1;
      if (huntStage(this.s.hunt[id]) === 3 && before < 3) this.s.shards += 100;
    }
    run.battle = null;
    const won = st.over === 'won' && run.team.some((m) => !m.fallen);
    const out = { room, won, discovered, relNew, pact: pactUsed, report: battleReport(st, (uid) => (st.units[uid]?.boss && bossKey ? BOSSES[bossKey].name : this.catalog.get(st.units[uid]?.id)?.name) || 'Une créature') };
    if (bossKey) {
      out.boss = { key: bossKey, log: (st.bossLog || []).slice(), interrupts: st.stats?.interrupts || 0, feasts: st.stats?.feasts || 0, weak: Object.keys(st.discovered || {}), first: won && !this.s.bossesBeaten[bossKey] };
      // v392 : première victoire contre L'Abysse (étage 100) : titre, cadre et deux coffres abyssaux
      if (won && bossKey === 'abysse' && !this.s.bossesBeaten.abysse) { this.grant({ title: 'Vainqueur de l’Abysse', frame: 'oeil', chests: { abyssal: 2 } }, 'abysse'); out.abyss = true; }
      if (won) { this.s.bossesBeaten[bossKey] = this.s.bossesBeaten[bossKey] || Date.now(); const bw = (this.s.bossWins ||= {}); bw[bossKey] = (bw[bossKey] || 0) + 1; } // v348 : victoires par gardien (présentation courte après 3)
    }
    if (!won && pactUsed === 'gardien') run.shards = 0; // le prix du Pacte du Gardien
    // (v271 : la créature de la semaine est retirée ; un combat commencé avant reste valable mais ne donne plus sa carte)
    // (v406 : le ticket premium laissé par un gardien une fois sur quatre est remplacé par le coffre de sa première victoire)
    const goal = goalState(st);
    if (goal) out.goal = goal;
    if (won) {
      const hunt = room === 'elite' && this.rule(run.day).key === 'chasse';
      out.shards = this.gainShards((8 + 2 * Math.min(run.floor, SHARD_FLOOR_CAP)) * (room === 'boss' ? 3 : room === 'elite' ? 2 : 1) * (hunt ? 2 : 1));
      // cendres de combat : de quoi faire monter son équipe même sans doublons (pas en descente libre)
      if (!run.free) { out.ash = Math.round((2 + Math.min(run.floor, SHARD_FLOOR_CAP) / 2) * (room === 'boss' ? 3 : room === 'elite' ? 2 : 1)); this.s.ash += out.ash; this.s.stats.ashEarned += out.ash; run.ashGot = (run.ashGot || 0) + out.ash; /* v729 : compté dans le bilan */ }
      const named = Object.values(st.units).find((u) => u.side === 'enemy' && u.named);
      if (named) out.named = { title: named.title, id: named.id, shards: this.gainShards(20 + Math.min(run.floor, SHARD_FLOOR_CAP) * 4) };
      // objectif réussi : éclats en plus et 1 Ferveur pour la suite
      if (goal?.state === 'done') { out.goalShards = this.gainShards((3 + Math.min(run.floor, SHARD_FLOOR_CAP)) * (room === 'boss' ? 2 : 1)); run.gauge = Math.min(carry, run.gauge + 1); this.s.stats.goals = (this.s.stats.goals || 0) + 1; }
      /* v753 : plus de talent après une élite (décision du propriétaire : un choix de plus, et ça baissait la difficulté) */
      // exploits de l'expédition (fêtés dans le résumé)
      const F = (run.feats ||= { hit: 0, syn: 0, breaks: 0, parries: 0, perfect: 0, crits: 0, kills: 0, wins: 0 }), S = st.stats || {};
      F.hit = Math.max(F.hit, S.maxHit || 0); F.syn += (S.named || 0) + (S.combos || 0); F.breaks += S.breaks || 0; F.parries += S.parries || 0; F.perfect += S.perfect || 0; F.crits += S.crits || 0; F.kills += st.kills.length; F.wins++; if (run.free || !this.firstClear(run)) this.codexXp(CODEX_XP.win, 'win');
      // v406 : première victoire à cet étage : sa récompense (éclats, cendres, coffre ; coffre d'or ou abyssal pour un gardien)
      if (!run.free && this.firstClear(run)) {
        const r = this.floorReward(run);
        if (r.shards) { this.s.shards += r.shards; this.s.stats.shardsEarned = (this.s.stats.shardsEarned || 0) + r.shards; }
        if (r.ash) { this.s.ash += r.ash; this.s.stats.ashEarned += r.ash; }
        if (r.braises) { this.s.braises = Math.max(0, this.s.braises || 0) + r.braises; out.braises = r.braises; }
        for (const [c, n] of Object.entries(r.chests || {})) for (let i = 0; i < n; i++) { run.chests.push(c); out.chest = c; }
        out.first = r; run.wonFirst = run.floor; /* v676 : pour l'en-tête après la victoire */ this.codexXp(run.floor % 5 === 0 ? CODEX_XP.boss : CODEX_XP.floor, run.floor % 5 === 0 ? 'boss' : 'floor');
        const fl = (run.firstLoot ||= { shards: 0, ash: 0 }); fl.shards += r.shards || 0; fl.ash += r.ash || 0;
      }
      // toute première victoire : un vrai cadeau (une seule fois)
      if (!this.s.stats.firstWin) { this.s.stats.firstWin = Date.now(); this.s.shards += FIRST_WIN; out.firstWin = FIRST_WIN; }
      // défis de créature : combats gagnés, ennemis achevés, gardiens achevés
      const cs = (this.s.cstats ||= {});
      run.team.filter((m) => !m.fallen).forEach((m) => { (cs[m.id] ||= {}).w = (cs[m.id].w || 0) + 1; });
      for (const [id, n] of Object.entries(st.finishedBy || {})) { (cs[id] ||= {}).k = (cs[id].k || 0) + n; (run.fin ||= {})[id] = (run.fin[id] || 0) + n; }
      for (const id of Object.keys(st.bossBy || {})) (cs[id] ||= {}).b = (cs[id].b || 0) + 1;
      out.fame = this.gainFame(run.team.filter((m) => !m.fallen).map((m) => m.id), room === 'boss' || room === 'elite' ? 2 : 1);
      // v406 : le gardien termine le chapitre (l'expédition s'arrête, l'équipe se repose avant le chapitre suivant).
      // v394 : l'étage 100 est le fond de la Descente : la victoire contre L'Abysse donne le Booster de l'Abysse
      // (v406 : à la première victoire, et à la première de chaque palier de Cauchemar)
      if (room === 'boss') {
        const summit = !run.veille && run.floor >= FINAL_FLOOR;
        if (run.veille && out.first) { const v = ((this.s.veilles ||= {})[run.veille] ||= { floors: [] }); v.won = v.won || Date.now(); this.grant({ tickets: { premium: 2 } }, 'veille'); out.veilleWon = true; } /* v795 */
        if (summit && out.first) { this.grant({ tickets: { abysse: 1 } }, 'summit'); this.s.stats.summits = (this.s.stats.summits || 0) + 1; out.abyssPack = true; }
        this.clearFloor();
        this.track('win', 1);
        out.chapter = run.veille ? 0 : chapterOf(run.floor);
        if (summit) out.summit = true;
        out.summary = this.endRun(false);
        if (this.s.descent.grit?.ch === out.chapter) delete this.s.descent.grit;
        Object.assign(out.summary, { veilleWon: !!out.veilleWon, chapterDone: out.chapter, summit: !!summit, report: out.report, abyss: !!out.abyss, abyssPack: !!out.abyssPack, free: !!run.free, boss: out.boss, bossChest: out.first ? out.chest : null, braises: out.braises || 0 });
        return out;
      }
      run.phase = 'reward';
      run.rewards = this.rewardsFor(run, room);
      out.rewards = run.rewards;
      this.clearFloor();
      this.track('win', 1);
      this.checkProgress();
      this.persist();
    } else {
      out.lost = true;
      out.summary = this.endRun(true);
      out.summary.report = out.report;
    }
    return out;
  }
  // Résolution automatique d'un combat en cours (simulations)
  autoResolve() { autoDuel(this.s.descent.run.battle); return this.finishBattle(); }
  // Retour depuis l'autel : on peut encore choisir un autre bonus (source ou trésor)
  cancelAltar() {
    const run = this.s.descent.run;
    if (!run || run.phase !== 'altar' || !run.rewardsBak) throw new Error('Impossible de revenir en arrière.');
    run.altar = null; run.phase = 'reward'; run.rewards = run.rewardsBak; run.rewardsBak = null;
    this.persist();
  }
  chooseBlessing(key) {
    const run = this.s.descent.run;
    if (!run || run.phase !== 'altar' || !run.altar.includes(key)) throw new Error('Bénédiction indisponible.');
    run.blessings.push(key);
    if (key === 'vigor') run.team.forEach((m) => { if (!m.fallen) { m.maxHp = Math.round(m.maxHp * 1.2); m.hp = m.maxHp; } });
    run.altar = null;
    run.phase = 'cleared';
    this.clearFloor();
    this.persist();
  }
  recordDepth(floor) {
    const d = this.descent(), run = d.run;
    // (v406 : les paliers des profondeurs 40, 50, 60… sont remplacés par les coffres abyssaux des gardiens)
    d.best = Math.max(d.best, floor);
    const adv = (run?.start || 1) > 1; // v331 : un départ avancé compte pour le record, pas pour les classements
    // une expédition commencée la veille ne compte pas pour le classement du jour (le donjon change chaque jour) ;
    // v328 : elle compte en revanche pour le record personnel (d.best) et pour la mission du jour « atteins l'étage N »
    if ((!run || run.day === d.day) && !adv) d.bestToday = Math.max(d.bestToday, floor);
    this.track('depth', floor);
  }
  // Renommée : chaque victoire rapporte des points aux créatures restées debout ; un palier franchi s'annonce
  gainFame(ids, n = 1) {
    const ups = [];
    for (const id of ids) {
      const before = fameTier(this.s.fame[id]);
      this.s.fame[id] = (this.s.fame[id] || 0) + n;
      const t = fameTier(this.s.fame[id]);
      if (t > before) ups.push({ kind: 'fame', id, tier: t, name: `${this.catalog.get(id)?.name || 'Une créature'} devient ${FAME_TIERS[t - 1].name}` });
    }
    if (ups.length) this.emit('progress', ups);
    return ups;
  }
  // Favoris : une étoile sur la carte, et sa dernière copie ne peut pas être brûlée
  // v528 : portrait montré aux autres joueurs : celui choisi, sinon la 1re carte de la vitrine, sinon le favori le plus rare, sinon la créature la plus rare
  shownAvatar() {
    const s = this.s, has = (id) => id && s.collection?.[id] && this.catalog.get(id);
    if (has(s.avatar) || (s.avatar && (s.portraits || []).includes(s.avatar))) return s.avatar; /* v890 : portrait du Gardien */
    const sc = (s.showcase || []).find(has); if (sc) return sc;
    const rank = (id) => RARITY_ORDER.indexOf(this.catalog.get(id).rarity);
    const pick = (ids) => ids.filter(has).sort((a, b) => rank(b) - rank(a) || a.localeCompare(b))[0] || null;
    return pick(Object.keys(s.favs || {})) || pick(Object.keys(s.collection || {}));
  }
  isFav(id) { return !!this.s.favs?.[id]; }
  toggleFav(id) { const f = (this.s.favs ||= {}); if (f[id]) delete f[id]; else f[id] = Date.now(); this.persist(); return !!f[id]; }
  // Défis de créature : trois par créature, récompensés en cendres une fois chacun
  challenges(id) {
    const c = this.s.cstats?.[id] || {}, done = this.s.cdone?.[id] || {};
    return CHALLENGES.map((x) => ({ ...x, v: Math.min(c[x.stat] || 0, x.n), ok: (c[x.stat] || 0) >= x.n, claimed: !!done[x.key] }));
  }
  claimChallenge(id, key) {
    const x = this.challenges(id).find((y) => y.key === key);
    if (!x || !x.ok || x.claimed) throw new Error('Défi pas encore réussi.');
    ((this.s.cdone ||= {})[id] ||= {})[key] = Date.now();
    this.s.ash += x.ash; this.s.fame[id] = (this.s.fame[id] || 0) + x.fame;
    this.persist();
    return x;
  }
  fameOf(id) { return this.s.fame?.[id] || 0; }
  // Saison du mois : remise à zéro au changement de mois, paliers de profondeur récompensés une fois
  season() {
    const id = seasonId(this.clock());
    if (this.s.season.id !== id || this.s.season.v !== 2) this.s.season = { id, best: 0, claimed: [], v: 2 }; /* v407 : saison des Épreuves (l'ancienne comptait des étages) */
    return this.s.season;
  }
  // v407 : une victoire de plus aux Épreuves du jour ce mois-ci ; les paliers franchis se gagnent une fois
  seasonWin() {
    const se = this.season(), ev = [];
    se.best = (se.best || 0) + 1;
    for (const st of SEASON_STEPS) {
      if (se.best < st.wins || se.claimed.includes(st.wins)) continue;
      se.claimed.push(st.wins);
      this.grant(st.reward);
      ev.push({ kind: 'season', name: `Saison : ${st.wins} Épreuves gagnées`, reward: st.reward });
    }
    if (ev.length) this.emit('progress', ev);
    return ev;
  }
  nextFloor() {
    const run = this.s.descent.run;
    if (!run || run.phase !== 'cleared') throw new Error('Termine d’abord cet étage.');
    if (run.team.every((m) => m.fallen)) throw new Error('Toute ton équipe est tombée : le chapitre est perdu.');
    run.floor++;
    run.phase = 'doors';
    this.persist();
    return run.floor;
  }
  // Fin d'expédition : coffre selon la profondeur (une qualité de moins si l'équipe tombe ;
  // en descente maudite, une de plus, mais rien si l'équipe tombe). Éclats : moitié perdue si l'équipe tombe.
  // Abandon : compte comme une défaite (moitié des éclats, coffre d'un rang plus bas, rien si maudite ; la torche reste utilisée)
  // v377 : tant que rien n'a été joué (présage, ou premières portes sans combat), l'expédition s'annule sans conséquence :
  // la torche est rendue et rien ne compte (ni défaite, ni abandon, ni présage choisi)
  canCancelRun() {
    const run = this.s.descent.run;
    if (!run || run.battle) return false;
    if (run.phase === 'omen') return true;
    return run.phase === 'doors' && run.floor === (run.start || 1) && run.cleared === (run.start || 1) - 1 && !run.shards && !run.chests.length && !run.blessings.length && run.team.every((m) => (m.fallen ? this.isFallen(m.id) : m.hp === m.maxHp)) /* v676 : une créature déjà à terre au départ n'empêche pas d'annuler */;
  }
  cancelRun() {
    const d = this.s.descent, run = d.run;
    if (!this.canCancelRun()) throw new Error('Le chapitre a commencé : il faut l’abandonner.');
    d.runs = Math.max(0, (d.runs || 0) - 1);
    const om = this.s.stats.omens;
    if (run.omen && om?.[run.omen]) om[run.omen]--;
    d.run = null;
    this.persist();
  }
  abandonPreview() {
    const run = this.s.descent.run;
    if (!run) return null;
    return { shards: run.shards, chest: null, kept: run.chests.length, cursed: false, free: !!run.free, chapter: chapterOf(run.start || 1) };
  }
  abandonRun() {
    const run = this.s.descent.run;
    if (!run) throw new Error('Aucun chapitre en cours.');
    run.battle = null; run.phase = 'doors'; run.altar = null; run.rewards = null; run.talentOffer = null;
    this.s.stats.abandons = (this.s.stats.abandons || 0) + 1;
    const grit = this.s.descent.grit; /* v497 : un abandon ne compte pas pour la Persévérance */
    const summary = this.endRun(true);
    if (grit) this.s.descent.grit = grit; else delete this.s.descent.grit;
    summary.abandoned = true;
    this.persist();
    return summary;
  }
  endRun(wiped = false) {
    const d = this.s.descent, run = d.run;
    if (!run) throw new Error('Aucun chapitre en cours.');
    if (wiped && !run.nightmare && !run.veille && chapterOf(run.start || 1) >= this.chapterNow()) { const c = chapterOf(run.start || 1); d.grit = { ch: c, n: d.grit?.ch === c ? Math.min(GRIT.max, (d.grit.n || 0) + 1) : 1 }; }
    // v406 : plus de coffre de fin ni de perte : tout ce qui a été gagné est gardé ; une équipe tombée recommence le chapitre
    const shards = run.shards, chests = run.chests.slice();
    chests.forEach((c) => { this.s.chests[c] = (this.s.chests[c] || 0) + 1; });
    /* v668 : chapitre gagné : les créatures tombées restent à terre (une Braise de vie les ranime). Chapitre perdu ou abandonné :
       il recommence et toute l'équipe repart debout (mesuré : avec les morts gardées après une défaite, il aurait fallu
       ranimer 6 à 9 créatures par chapitre) */
    const down = wiped ? [] : run.team.filter((m) => m.fallen).map((m) => m.id);
    if (down.length) { const f = (this.s.fallen ||= {}); down.forEach((id) => { f[id] = 1; }); }
    this.s.shards += shards;
    const summary = { wiped, floor: run.cleared, day: run.day, chests, shards, kills: run.kills, free: run.free, cursed: run.cursed, nightmare: !!run.nightmare, nightTier: run.nightmare ? run.nightTier || 1 : 0, start: run.start || 1, chapter: run.veille ? 0 : chapterOf(run.start || 1), veille: run.veille || undefined, firstLoot: run.firstLoot || null, fallen: down, ash: run.ashGot || 0 };
    if (!run.free && !run.veille && run.cleared > 0 && run.bestBefore !== undefined && run.cleared > run.bestBefore) summary.record = true;
    // bilan : la créature qui a achevé le plus d'ennemis, le prochain palier de coffre, les éclats vers un booster
    if (run.feats) summary.feats = { ...run.feats };
    const mvp = Object.entries(run.fin || {}).sort((a, b) => b[1] - a[1])[0];
    if (mvp && mvp[1] >= 2) summary.mvp = { id: mvp[0], n: mvp[1] };
    summary.shardsNow = this.s.shards;
    if (run.nightmare && run.cleared > (run.nightBefore || 0)) summary.nightmareRecord = true;
    // v331 : bilan personnel des modes à risque (affiché au vestibule : la famille roguelite perdait deux fois plus sans le voir)
    for (const [k, on] of [['cursed', run.cursed], ['night', run.nightmare]]) if (on) { const r = ((d.risk ||= {})[k] ||= { n: 0, lost: 0 }); r.n++; if (wiped) r.lost++; }
    this.emit('descentEnd', summary);
    d.last = summary;
    d.run = null;
    this.s.xp += Math.max(0, run.cleared - (run.start || 1) + 1) * 8;
    this.checkProgress();
    this.persist();
    return summary;
  }

  // Passage au nouveau système (une fois) : les héros, l'équipement et les pactes disparaissent.
  // Les coffres de l'Arsenal sont gardés (ils contiennent désormais des boosters) ; le reste devient des éclats.
  // Une carte qui change de rareté peut perdre une variante (pas d'or pour les Communes et Peu communes) :
  // les exemplaires concernés deviennent holographiques, rien n'est perdu.
  // Cartes retirées du jeu : chaque exemplaire possédé est remboursé en cendres, et la carte disparaît des équipes et des parties en cours
  dropRemoved() {
    const s = this.s, gone = Object.keys(REMOVED_CARDS).filter((id) => !this.catalog.get(id));
    if (!gone.length || !gone.some((id) => JSON.stringify(s).includes(`"${id}"`))) return;
    const has = (o) => o && gone.some((id) => JSON.stringify(o).includes(`"${id}"`));
    for (const id of gone) {
      const e = s.collection[id];
      if (e) { const n = Object.values(e.v || {}).reduce((a, k) => a + (k || 0), 0) || 1; s.ash += n * (ECONOMY.craftAsh[REMOVED_CARDS[id]] || 0); delete s.collection[id]; }
      if (s.deciphered) delete s.deciphered[id];
    }
    const keep = (id) => !gone.includes(id);
    if (Array.isArray(s.team)) s.team = s.team.filter(keep);
    if (Array.isArray(s.teamPresets)) s.teamPresets.forEach((p) => { if (Array.isArray(p.team)) p.team = p.team.filter(keep); if (Array.isArray(p.ids)) p.ids = p.ids.filter(keep); });
    if (s.sceaux) { if (Array.isArray(s.sceaux.hand)) s.sceaux.hand = s.sceaux.hand.filter(keep); if (has(s.sceaux.cur)) s.sceaux.cur = null; }
    const run = s.descent?.run;
    if (run) {
      if (has(run.battle)) { run.battle = null; run.phase = 'doors'; }
      if (Array.isArray(run.team)) run.team = run.team.filter((m) => keep(m.id));
      if (!run.team?.length) s.descent.run = null;
    }
    this.persist();
  }
  fixVariants() {
    let changed = false;
    for (const [id, e] of Object.entries(this.s.collection)) {
      const card = this.catalog.get(id);
      if (!card) continue;
      for (const v of Object.keys(e.v)) {
        if (!e.v[v] || card.variants.includes(v)) continue;
        const to = card.variants.includes('holo') ? 'holo' : 'normal';
        e.v[to] = (e.v[to] || 0) + e.v[v]; delete e.v[v]; changed = true;
      }
    }
    if (changed) this.persist();
  }
  convertHeroes() {
    const s = this.s;
    if (s.army === 1) return;
    let shards = 0;
    const a = s.arsenal;
    if (a && typeof a === 'object') {
      this.addChests(a.chests || {});
      if (a.pending?.type) this.addChests({ [a.pending.type]: 1 });
      const val = { C: 10, R: 25, E: 60, L: 150 };
      shards += Object.values(a.items || {}).reduce((t, it) => t + (val[it?.r] || 10) * (1 + (it?.f || 0)), 0);
      shards += Math.round((a.fer || 0) / 2);
      for (const [k, n] of Object.entries(a.keys || {})) shards += (n || 0) * (k === 'abyssal' ? 400 : 150);
    }
    if (s.heroes && typeof s.heroes === 'object') {
      const lv = (xp) => { let l = 1, t = xp || 0; while (t >= 40 + 25 * (l - 1)) { t -= 40 + 25 * (l - 1); l++; } return l; };
      shards += Object.values(s.heroes).reduce((t, h) => t + 15 * (lv(h?.xp) - 1), 0);
    }
    for (const k of ['baume', 'elixir', 'parchemin']) if (s.items?.[k]) { shards += s.items[k] * ITEM_REFUND[k]; delete s.items[k]; }
    // expédition de l'ancien système : close, butin rendu et torche rendue
    const d = s.descent;
    if (d?.run && d.run.v !== 3) {
      const l = d.run.loot || {};
      shards += l.shards || 0; s.ash += l.ash || 0;
      for (const [t, n] of Object.entries(l.tickets || {})) s.tickets[t] = (s.tickets[t] || 0) + n;
      this.addChests(l.chests || {});
      if (d.used > 0) d.used--;
      d.run = null;
    }
    for (const k of ['heroes', 'party', 'invocation', 'invXp', 'pacts', 'arsenal', 'heroNews', 'pactNews']) delete s[k];
    if (d) { delete d.team; delete d.wounds; delete d.xp; delete d.cursed; }
    s.shards += shards;
    s.army = 1;
    if (Object.keys(s.collection).length) s.armyNews = { shards };
    this.persist();
  }

  // (v340 : la boutique d'objets et le sac — Torche bénie — sont retirés du jeu ; s.items reste dans la sauvegarde, inutilisé)

  setTitle(t) { if (this.s.titles.includes(t)) { this.s.title = t; this.persist(); } }
  setFrame(f) { if (this.s.frames.includes(f)) { this.s.frame = f; this.persist(); } }
  /* v482 : habillage (finition de prestige) d'une carte possédée ; null = aucun */
  setDress(id, k) {
    if (!this.owns(id)) throw new Error('Tu ne possèdes pas cette carte.');
    if (k && !(this.s.finishes || []).includes(k)) throw new Error('Finition pas encore acquise.');
    const d = (this.s.dress ||= {});
    if (k) d[id] = k; else delete d[id];
    this.persist();
  }
  setSachet(k, slot = 'standard') { if (!k || (this.s.sachets || []).includes(k)) { this.s[slot === 'premium' ? 'sachetPrem' : 'sachet'] = k || null; this.persist(); } } /* v565 : habillage des boosters, null = d'origine ; v587 : un sachet pour le standard (s.sachet), un pour le premium (s.sachetPrem) */
  setCboard(k) { if (!k || (this.s.cboards || []).includes(k)) { this.s.cboard = k || null; this.persist(); } } /* v898 : plateau des Cryptes, null = plateau d'origine */
  setCback(k) { if (!k || (this.s.cbacks || []).includes(k)) { this.s.cback = k || null; this.persist(); } } /* v898 : dos des cartes des Cryptes */
  setPboard(k) { if (!k || (this.s.pboards || []).includes(k)) { this.s.pboard = k || null; this.persist(); } } /* v895 : plateau du Pacte, null = plateau d'origine */
  setMat(k) { if (!k || (this.s.mats || []).includes(k)) { this.s.mat = k || null; this.persist(); } } /* v632 : tapis de jeu, null = plateau d'origine */
  setFond(k) { if (!k || (this.s.fonds || []).includes(k)) { this.s.fond = k || null; this.persist(); } } /* v632 : fond de profil, null = fond d'origine */
  setPlate(k) { if (!k || (this.s.plates || []).includes(k)) { this.s.plate = k || null; this.persist(); } } /* v564 : plaque de pseudo, null = aucune */
  emotesOwned() { return [...FREE_EMOTES, ...(this.s.emotes || [])]; } /* v564 : réactions en ligne (les 4 premières sont à tous) */
  setBack(k) { if (!k || (this.s.backs || []).includes(k)) { this.s.back = k || null; this.persist(); } } /* v473 : null = dos par défaut */
  setName(n) { this.s.name = String(n || '').replace(/[<>]/g, '').trim().slice(0, 16); this.persist(); }
  setAvatar(id) { if (this.owns(id) || (this.s.portraits || []).includes(id)) { this.s.avatar = id; this.persist(); } } /* v890 : ou un portrait hors collection */
  /* v890 : objets du Gardien (CREATOR_KIT), réservés au compte du créateur : opération « dev », refusée par le serveur sans le badge */
  needsCreatorKit() { const s = this.s, k = CREATOR_KIT; return !(s.titles || []).includes(k.title) || !(s.frames || []).includes(k.frame) || !(s.fonds || []).includes(k.fond) || !(s.portraits || []).includes(k.portrait); }
  creatorKit() {
    const s = this.s, k = CREATOR_KIT, add = (l, v) => { if (!l.includes(v)) l.push(v); };
    add(s.titles ||= [], k.title); add(s.frames ||= [], k.frame); add(s.fonds ||= [], k.fond); add(s.portraits ||= [], k.portrait);
    this.persist();
  }
  toggleShowcase(id) {
    if (!this.owns(id)) return;
    const i = this.s.showcase.indexOf(id);
    if (i >= 0) this.s.showcase.splice(i, 1);
    else { this.s.showcase.unshift(id); this.s.showcase = this.s.showcase.slice(0, 3); }
    this.persist();
  }
  setSetting(k, v) { this.s.settings[k] = v; this.persist(); }

  grant(reward, why) {
    if (!reward) return;
    if (reward.shards) this.s.shards += reward.shards;
    if (reward.ash) this.s.ash += reward.ash;
    for (const [k, n] of Object.entries(reward.tickets || {})) this.s.tickets[k] = (this.s.tickets[k] || 0) + n;
    if (reward.title && !this.s.titles.includes(reward.title)) this.s.titles.push(reward.title);
    if (reward.frame && !this.s.frames.includes(reward.frame)) this.s.frames.push(reward.frame);
    if (reward.back && !(this.s.backs ||= []).includes(reward.back)) this.s.backs.push(reward.back);
    for (const b of reward.backs || []) if (!(this.s.backs ||= []).includes(b)) this.s.backs.push(b);
    if (reward.finish && !(this.s.finishes ||= []).includes(reward.finish)) this.s.finishes.push(reward.finish); /* v482 */
    if (reward.plate && !(this.s.plates ||= []).includes(reward.plate)) this.s.plates.push(reward.plate); /* v564 */
    if (reward.mat && !(this.s.mats ||= []).includes(reward.mat)) this.s.mats.push(reward.mat); /* v632 */
    if (reward.pboard && !(this.s.pboards ||= []).includes(reward.pboard)) this.s.pboards.push(reward.pboard); /* v895 */
    if (reward.cboard && !(this.s.cboards ||= []).includes(reward.cboard)) this.s.cboards.push(reward.cboard); /* v898 */
    if (reward.cback && !(this.s.cbacks ||= []).includes(reward.cback)) this.s.cbacks.push(reward.cback);
    if (reward.fond && !(this.s.fonds ||= []).includes(reward.fond)) this.s.fonds.push(reward.fond); /* v632 */
    if (reward.sachet && !(this.s.sachets ||= []).includes(reward.sachet)) this.s.sachets.push(reward.sachet); /* v565 */
    for (const e of [reward.emote, ...(reward.emotes || [])]) if (e && !(this.s.emotes ||= []).includes(e)) this.s.emotes.push(e);
    if (reward.codexPremium) this.codex().premium = true; /* v548 : Codex enluminé acheté (4,99 €) */
    if (reward.obs) this.s.obs = (this.s.obs || 0) + reward.obs; /* v474 : obsidiennes (achetées en euros) */
    if (reward.chests) this.addChests(reward.chests);
    if (reward.chocTok) this.chocGive(reward.chocTok); /* v811 : jetons du Choc */
  }

  // ——— v470 : ÉBAUCHE du pass de saison (Codex) et de la boutique en argent réel (Échoppe), cachés hors Mode Créateur ———
  /* v680 : ouverts à tous le premier jour de la Saison I (CODEX_OPEN) ; avant, seulement en aperçu Créateur */
  codexOn() { return today(this.clock()) >= CODEX_OPEN || !!(this.s.settings?.dev && this.s.devCodex); }
  /* v684 : l'Échoppe peut ouvrir avant le Codex (CODEX.shopFrom) ; le Codex montre alors « bientôt » */
  shopOn() { return this.codexOn() || !!(CODEX.shopFrom && today(this.clock()) >= CODEX.shopFrom); }
  /* v538 : la saison commence le CODEX.starts. Les points gagnés avant (anciennes versions, essais du Mode Créateur) sont remis à zéro
     au premier passage après cette date ; la voie enluminée déjà débloquée reste. */
  /* v550 : trois saisons d'un mois (SEASONS), à l'heure du joueur ; un Codex par saison */
  codexSeason() { return seasonFor(today(this.clock())); }
  codexLive() { const d = today(this.clock()), se = this.codexSeason(); return d >= se.starts && d <= se.ends; }
  codex() {
    const se = this.codexSeason();
    if (!this.s.codex || this.s.codex.season !== se.key) {
      /* fin de saison : ce qui était atteint mais pas récupéré est donné, rien ne se perd */
      const left = pendingOf(this.s.codex);
      left.forEach((r) => this.grant(r, 'codex'));
      if (left.length) this.s.codexPast = { season: this.s.codex.season, n: left.length, day: today(this.clock()) };
      this.s.codex = freshCodex(se.key);
    }
    const c = this.s.codex;
    if (!c.live && this.codexLive()) { Object.assign(c, { xp: 0, free: [], prem: [], log: {} }); c.live = true; }
    return c;
  }
  codexXp(n, why) {
    if (!n) return;
    if (!this.codexLive() && why !== 'dev') return; /* v728 : hors saison (avant ou après la dernière), rien ne se gagne ; v538 : avant la saison, rien ne se gagne (sauf essais du Mode Créateur) */
    const c = this.codex(), max = CODEX.tiers * CODEX.xpPerTier;
    const add = Math.max(0, Math.min(n, max - c.xp));
    const before = codexTier(c);
    c.xp += add; c.log[why] = (c.log[why] || 0) + add;
    if (add && why !== 'dev' && this.codexLive()) this.emit('progress', [{ kind: 'codex', xp: add, tier: codexTier(c), up: codexTier(c) > before }]); /* v680 : « +N points du Codex » */
    this.questBump(why);
  }
  /* v680 : défis de la saison (trois par semaine, les mêmes pour tous). Un défi rempli donne CODEX.questXp points. */
  quests() {
    const c = this.codex(), se = this.codexSeason(), w = seasonWeek(se, today(this.clock()));
    const qw = c.qw && c.qw.w === w ? c.qw : { w, n: {}, done: [] }; /* lecture seule : la semaine n'est écrite que par questBump */
    const list = questsFor(se.key, w).map((q) => ({ ...q, have: Math.min(q.n, qw.n[q.key] || 0), done: qw.done.includes(q.key) }));
    const next = new Date(`${se.starts}T00:00:00`); next.setDate(next.getDate() + 7 * (w + 1));
    return { week: w + 1, list, ends: today(next) > se.ends ? se.ends : today(new Date(next - 864e5)) };
  }
  questBump(why) {
    if (!this.codexLive()) return;
    const kind = Object.keys(QUEST_KINDS).find((k) => QUEST_KINDS[k].why.includes(why));
    if (!kind) return;
    const { list } = this.quests(), q = list.find((x) => x.key === kind), c = this.s.codex, w = seasonWeek(this.codexSeason(), today(this.clock()));
    if (!q || q.done) return;
    if (!c.qw || c.qw.w !== w) c.qw = { w, n: {}, done: [] };
    c.qw.n[kind] = (c.qw.n[kind] || 0) + 1;
    if (c.qw.n[kind] >= q.n) {
      c.qw.done.push(kind);
      const max = CODEX.tiers * CODEX.xpPerTier, add = Math.max(0, Math.min(CODEX.questXp, max - c.xp));
      c.xp += add; c.log.quest = (c.log.quest || 0) + add;
      this.emit('progress', [{ kind: 'quest', name: q.label.replace('{n}', q.n), reward: null }]);
    }
  }
  /* v680 : acheter un palier en obsidiennes (pendant la saison) */
  codexBuyTier() {
    if (!this.codexLive()) throw new Error('La saison n’a pas encore commencé.');
    const c = this.codex(), t = codexTier(c);
    if (t >= CODEX.tiers) throw new Error('Tu as déjà atteint le dernier palier.');
    this.spendObs(CODEX.tierObs);
    c.xp = Math.min(CODEX.tiers * CODEX.xpPerTier, c.xp + CODEX.xpPerTier); /* v728 : un palier entier en plus (avant : la progression déjà faite était perdue) */ c.log.bought = (c.log.bought || 0) + 1;
    this.persist();
    return t + 1;
  }
  codexClaim(track, tier) {
    if (!Number.isInteger(tier) || (track !== 'free' && track !== 'prem')) throw new Error('Palier pas encore atteint.'); /* v754 : "5" ou "05" encaissait le même palier à l'infini */
    const c = this.codex(), t = tiersOf(c.season)[tier - 1];
    if (!t || tier > codexTier(c)) throw new Error('Palier pas encore atteint.');
    if (track === 'prem' && !c.premium) throw new Error(`La voie enluminée demande le ${CODEX.premiumName}.`);
    const r = t[track];
    if (!r || c[track].includes(tier)) throw new Error('Rien à récupérer ici.');
    c[track].push(tier); this.grant(r, 'codex'); this.persist();
    return r;
  }
  codexClaimAll() {
    const c = this.codex(), got = [];
    for (const t of tiersOf(c.season)) {
      if (t.tier > codexTier(c)) break;
      for (const tr of ['free', 'prem']) if (t[tr] && !c[tr].includes(t.tier) && (tr === 'free' || c.premium)) { c[tr].push(t.tier); this.grant(t[tr], 'codex'); got.push(t[tr]); }
    }
    this.persist();
    return got;
  }
  /* Achat SIMULÉ en euros (aperçu Créateur) : le vrai paiement passera par l'App Store (identifiant `store` de chaque article) */
  shopBuy(id) {
    /* v680 : achat simulé réservé à l'aperçu Créateur (le vrai paiement passe par iapApply, vérifié par le serveur) */
    if (!(this.s.settings?.dev && this.s.devCodex)) throw new Error('Achat simulé réservé au Mode Créateur.');
    const it = SHOP.find((x) => x.id === id), bought = (this.s.purchases ||= []);
    if (!it) throw new Error('Article inconnu.');
    if (it.once && bought.includes(id)) throw new Error('Déjà acheté.');
    if (it.kind === 'codex' && this.codex().premium) throw new Error('Déjà débloqué pour cette saison.');
    this.grant(it.give, 'shop');
    bought.push(id); this.persist();
    return it;
  }
  shopOwned(id) { return !!(this.s.purchases || []).includes(id); }
  /* v680 : achats payés (App Store, Google Play), vérifiés par le serveur auprès de RevenueCat (serveur/iap.mjs) :
     chaque transaction n'est donnée qu'une fois (`s.iapDone`). Appelée seulement par le serveur de partie (op `iapSync`). */
  iapApply(txs) {
    const done = (this.s.iapDone ||= []), bought = (this.s.purchases ||= []), got = [];
    for (const t of Array.isArray(txs) ? txs : []) {
      const id = String(t?.id || ''), it = SHOP.find((x) => x.store === t?.product);
      if (!id || !it || done.includes(id)) continue;
      done.push(id);
      let give = it.give;
      if ((it.kind === 'codex' && this.codex().premium) || (it.once && bought.includes(it.id))) give = { obs: it.refund || 0 }; /* déjà acquis : jamais perdu */
      this.grant(give, 'shop');
      if (!bought.includes(it.id)) bought.push(it.id);
      got.push({ id: it.id, name: it.name, give });
    }
    if (got.length) this.persist();
    return got;
  }
  // v474 : dépenses en obsidiennes (cosmétiques seulement)
  obs() { return this.s.obs || 0; }
  spendObs(n) {
    if (!this.shopOn()) throw new Error('L’Échoppe n’est pas encore ouverte.');
    if (this.obs() < n) throw new Error(`Il te manque ${n - this.obs()} obsidiennes.`);
    this.s.obs -= n;
  }
  catalogOwned(id) {
    const it = CATALOG.find((x) => x.id === id); if (!it) return false;
    const g = it.give;
    return (!g.frame || this.s.frames.includes(g.frame)) && (!g.plate || (this.s.plates || []).includes(g.plate)) && (!g.mat || (this.s.mats || []).includes(g.mat)) && (!g.pboard || (this.s.pboards || []).includes(g.pboard)) && (!g.cboard || (this.s.cboards || []).includes(g.cboard)) && (!g.cback || (this.s.cbacks || []).includes(g.cback)) && (!g.fond || (this.s.fonds || []).includes(g.fond)) && (!g.emote || (this.s.emotes || []).includes(g.emote))
      && (g.emotes || []).every((e) => (this.s.emotes || []).includes(e)) && (!g.finish || (this.s.finishes || []).includes(g.finish)) && (!g.back || (this.s.backs || []).includes(g.back)) && (!g.sachet || (this.s.sachets || []).includes(g.sachet)) && (g.backs || []).every((b) => (this.s.backs || []).includes(b));
  }
  catalogCost(id) { /* un lot ne fait pas payer ce qu'on a déjà : on retire le prix des dos déjà possédés, jamais sous 0 */
    const it = CATALOG.find((x) => x.id === id); if (!it) return 0;
    if (it.kind !== 'bundle') return it.cost;
    const list = it.give.backs || it.give.emotes || [], mine = it.give.backs ? this.s.backs || [] : this.s.emotes || []; /* v564 : lot de réactions */
    const have = list.filter((b) => mine.includes(b)).length;
    return Math.max(0, Math.round(it.cost * (1 - have / list.length)));
  }
  catalogBuy(id) {
    const it = CATALOG.find((x) => x.id === id);
    if (!it) throw new Error('Article inconnu.');
    if (this.catalogOwned(id)) throw new Error('Tu l’as déjà.');
    const cost = this.catalogCost(id);
    this.spendObs(cost); this.grant(it.give, 'shop');
    (this.s.purchases ||= []).push(id); this.persist();
    return it;
  }
  codexUnlock() { return this.shopBuy('codex'); } /* v548 : plus d'achat en obsidiennes : même chemin que l'achat en euros */

  achievementValue(a) {
    const c = a.cond;
    switch (c.type) {
      case 'unique': return this.uniqueCount();
      case 'rarity': return this.rarityCount(c.r);
      case 'factions': return Object.keys(this.s.factionsDone).length;
      case 'sets': return Object.keys(this.s.setsDone).length;
      case 'evolines': return this.completeLines();
      case 'boosters': return this.s.stats.boosters;
      case 'variants': return this.variantCount();
      case 'crafted': return this.s.stats.crafted;
      case 'burned': return this.s.stats.burned || 0;
      case 'daily': return this.s.stats.daily;
      case 'depth': return this.s.descent.best || 0;
      case 'hunted': return this.huntCount();
      case 'mastered': return Object.values(this.s.hunt).filter((k) => k >= HUNT_STAGES[2].k).length;
      case 'trophies': return Object.values(this.s.hunt).filter((k) => k >= HUNT_STAGES[3].k).length;
      case 'trialWins': return this.s.stats.trialWins || 0; /* v421 */
      case 'trialPerfect': return this.s.stats.trialPerfect || 0;
      case 'chocWins': return this.s.versus?.wins || 0; /* v807 : Choc des Boosters */
      case 'chocStreak': return this.s.versus?.best || 0;
      case 'chocLeague': return this.s.versus?.lgTop || 0;
      case 'finish': return Object.values(this.s.collection).filter((e) => (e.v?.[c.v] || 0) > 0).length;
      case 'cardLevel': return Math.max(0, ...Object.keys(this.s.collection).filter((id) => this.catalog.get(id)).map((id) => this.cardLevel(id)));
      default: return 0;
    }
  }
  achievementTarget(a) { return a.cond.n === 'all' ? this.total() : a.cond.n; }

  // Vérifie succès, ensembles, factions et niveaux ; applique les récompenses.
  checkProgress() {
    const events = [];
    for (let pass = 0; pass < 4; pass++) {
      let changed = false;
      for (const f of FACTION_ORDER) {
        if (this.s.factionsDone[f]) continue;
        if (this.factionProgress(f).ratio >= 1) {
          this.s.factionsDone[f] = Date.now();
          const reward = { shards: 250, frame: f };
          this.grant(reward);
          events.push({ kind: 'faction', key: f, name: this.catalog.faction[f].name, reward });
          changed = true;
        }
      }
      for (const set of this.catalog.sets) {
        if (this.s.setsDone[set.key]) continue;
        if (set.cards.every((id) => this.owns(id))) {
          this.s.setsDone[set.key] = Date.now();
          this.grant(set.reward);
          events.push({ kind: 'set', key: set.key, name: set.name, reward: set.reward });
          changed = true;
        }
      }
      for (const a of this.catalog.achievements) {
        if (this.s.achievements[a.key]) continue;
        if (this.achievementValue(a) >= this.achievementTarget(a)) {
          this.s.achievements[a.key] = Date.now();
          this.grant(a.reward);
          events.push({ kind: 'achievement', key: a.key, name: a.name, reward: a.reward });
          changed = true;
        }
      }
      if (!changed) break;
    }
    // Niveaux
    const { level } = levelFromXp(this.s.xp);
    while (this.s.level < level) {
      this.s.level++;
      const reward = { ...XP.levelReward(this.s.level) };
      const t = LEVEL_TITLES.find(([n]) => n === this.s.level);
      if (t) reward.title = t[1];
      const fr = LEVEL_FRAMES.find(([n]) => n === this.s.level);
      if (fr && !this.s.frames.includes(fr[1])) reward.frame = fr[1];
      this.grant(reward);
      events.push({ kind: 'level', level: this.s.level, reward });
    }
    /* v875 : cadres ajoutés aux niveaux et aux succès déjà atteints : donnés sans annonce */
    for (const [n, f] of LEVEL_FRAMES) if (this.s.level >= n && !this.s.frames.includes(f)) this.s.frames.push(f);
    for (const a of this.catalog.achievements) if (a.reward?.frame && this.s.achievements[a.key] && !this.s.frames.includes(a.reward.frame)) this.s.frames.push(a.reward.frame);
    if (events.length) this.emit('progress', events);
    return events;
  }

  // Outils de développement -----------------------------------------------
  devGrant(reward) { this.grant(reward); this.persist(); }
  // ——— Pouvoirs du Créateur (mode développeur) ———
  devGive(id, variant = 'normal', n = 1) {
    const c = this.catalog.get(id);
    if (!c) throw new Error('Carte inconnue.');
    const v = c.variants.includes(variant) ? variant : 'normal';
    for (let i = 0; i < n; i++) this.addCard(id, v, 'reward');
    this.checkProgress(); this.persist();
  }
  devAllVariants() {
    this.catalog.cards.forEach((c) => c.variants.forEach((v) => { if (!this.entry(c.id)?.v[v]) this.addCard(c.id, v, 'reward'); }));
    this.checkProgress(); this.persist();
  }
  devDuplicates(n = 10) {
    ['C', 'PC', 'R', 'HR', 'M'].forEach((r) => this.catalog.byRarity[r].slice(0, n).forEach((c) => { for (let i = 0; i < 2; i++) this.addCard(c.id, 'normal', 'reward'); }));
    this.persist();
  }
  devChests() { this.addChests({ bois: 5, fer: 5, or: 3, abyssal: 3 }); this.persist(); }
  // v420 : revivre la campagne depuis le début (Mode Créateur) : record, gardiens et Cauchemar à zéro, collection gardée
  devResetCampaign() {
    const d = this.descent();
    d.run = null; d.best = 0; d.bestToday = 0; d.bestNightmare = 0; d.nightBest = {}; d.nightFloors = {}; d.last = null; d.risk = {};
    this.s.bossesBeaten = {}; this.s.bossWins = {}; this.s.storySeen = {}; this.s.fallen = {}; /* v668 */
    this.persist();
  }
  /* v769 : Mode Créateur : Booster(s) de l'Abysse à volonté ; first = rejouer la première fois (Secrète pas encore possédée garantie) */
  devAbyss(first = false, n = 1) { const k = Math.max(1, Math.min(50, +n || 1)); this.s.tickets.abysse = (this.s.tickets.abysse || 0) + k; if (first) this.s.stats.abyssSecret = 0; this.persist(); }
  devFreePacks() { this.s.freePack = { day: null }; this.persist(); }
  devChocTokens() { this.chocGive(3); this.persist(); } /* v811 */
  devMissions() { this.missions().list.forEach((x) => { x.p = x.n; }); this.persist(); }
  // power : l'équipe prend le niveau attendu à cet étage (pour essayer la difficulté réelle)
  devFloor(n, { power = false } = {}) {
    const run = this.s.descent.run; if (!run) throw new Error('Lance d’abord une Descente.');
    run.floor = Math.max(1, n); run.phase = 'doors';
    if (power) {
      run.devLevel = expectedLevel(run.floor);
      run.team.forEach((m) => { const u = duelUnit(this.catalog.get(m.id), { level: run.devLevel, form: m.form || null }); m.maxHp = u.maxHp; if (!m.fallen) m.hp = u.maxHp; });
    }
    this.persist();
    return run.devLevel || null;
  }
  // v387 : Mode Créateur, aller tout de suite devant un gardien (lance une expédition si besoin, passe le présage)
  devBoss(key, { power = false } = {}) {
    const i = BOSS_ORDER.indexOf(key);
    if (i < 0) throw new Error('Gardien inconnu.');
    if (!this.s.descent.run) { this.s.fallen = {}; this.startRun(); } /* v668 : outil d'essai, l'équipe repart debout */
    const run = this.s.descent.run;
    if (run.phase === 'omen') this.chooseOmen(run.omenOffer[0]);
    run.devFree = true; /* v735 : essais du Mode Créateur, sans Torche */
    run.battle = null; run.altar = null; run.rewards = null; run.talentOffer = null;
    return { floor: (i + 1) * DESCENT.bossEvery, level: this.devFloor((i + 1) * DESCENT.bossEvery, { power }) };
  }
  /* v795 : Mode Créateur, affronter le Veilleur d'une saison (essai : la Veille s'ouvre même sans l'Abysse vaincu, sans Torche) */
  devVeille(season, { power = false } = {}) {
    if (!VEILLES[season]) throw new Error('Saison inconnue.');
    const d = this.s.descent;
    if (d.run && !d.run.veille) d.run = null;
    if (!d.run) { this.s.fallen = {}; const had = this.s.bossesBeaten.abysse; this.s.bossesBeaten.abysse = had || 1; try { this.startRun({ veille: true }); } finally { if (!had) delete this.s.bossesBeaten.abysse; } }
    const run = d.run;
    if (run.phase === 'omen') this.chooseOmen(run.omenOffer[0]);
    run.veille = season; run.devFree = true;
    run.battle = null; run.altar = null; run.rewards = null; run.talentOffer = null;
    return { floor: VEILLE_START + 4, level: this.devFloor(VEILLE_START + 4, { power }) };
  }
  devUnlockAll() {
    this.catalog.cards.forEach((c) => { if (!this.owns(c.id)) this.addCard(c.id, 'normal', 'reward'); });
    const progress = this.checkProgress();
    this.persist();
    return progress;
  }
  reset() {
    const settings = this.s.settings, old = this.s;
    this.s = defaultSave();
    this.s.settings = { ...this.s.settings, ...settings };
    /* v739 : effacer sa partie ne redonne pas les cadeaux déjà reçus (sinon : effacer et rouvrir les boosters de bienvenue
       jusqu'à tirer une carte très rare). Pas de 2e cadeau de bienvenue, booster gratuit, offrande et Épreuves du jour gardés. */
    keepGifts(this.s, old);
    this.s.erased = (old.erased || 0) + 1;
    this.s.resetAt = Date.now(); /* v412 : partie effacée exprès : la partie en ligne ne doit pas revenir toute seule */
    this.persist();
  }
  /* v754 : jour de création à l’heure du joueur (le serveur tourne à l’heure universelle, décalée de son fuseau par `clock`) */
  noteCreatedDay() { try { if (!this.s.createdDay && this.s.createdAt) this.s.createdDay = today(new Date(this.s.createdAt + (this.clock().getTime() - Date.now()))); } catch (e) { /* rien */ } }
  replaceSave(save) { this.s = save; this.noteCreatedDay(); try { this.convertHeroes(); this.fixVariants(); } catch (e) { /* rien */ } this.persist(); }
  bestCards(n = 3) {
    return Object.keys(this.s.collection)
      .map((id) => this.catalog.get(id))
      .filter(Boolean)
      .sort((a, b) => RI(b.rarity) - RI(a.rarity) || b.power - a.power)
      .slice(0, n);
  }
  rarityLabel(r) { return RARITY[r].name; }
}
