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
import { FINAL_FLOOR, BOOSTERS, FREE_PACK, ECONOMY, XP, LEVEL_TITLES, RARITY_ORDER, FACTION_ORDER, RARITY, MISSIONS, LUCK_POINTS, ASH_FRAMES, SHOW_ORDER, SHADOW, SUBLIME_ASH, VARIANTS } from '../config.js';
import { drawBooster, cryptoRandom, currentEvent, boosterOdds, weekIndex } from './boosters.js';
import { loadSave, writeSave, defaultSave, today, SAVE_STASH_KEY } from './save.js';
import { CODEX, CODEX_XP, CODEX_TIERS, SHOP, CATALOG, codexState, codexTier } from './codex.js';
import { rngOf, DESCENT, CHESTS, CHEST_ORDER, CHEST_FLOORS, floorDoors, floorEnemies, namedFoe, floorRewards, enemyLevel, floorFloor, blessingChoices, dailyRule, chestForDepth, shiftChest, enemyScale, lateSoft, bossEase, expectedLevel, cardPower, powerFor, huntStage, HUNT_STAGES, foeTraits, OMENS, omenChoices, CHAPTER, chapterOf, floorFirstReward } from './descent.js';
import { createDuel, autoDuel, duelUnit, bossPowerOf, upgradeDuel, battleReport, GOALS, goalState, startInitiative } from './duel.js';
import { bossOf, BOSSES, BOSS_ORDER } from './bosses.js';
import { pactChoices, PACTS } from './pacts.js';
import { FORMS, formUnlocked } from './forms.js';
import * as SC from './sceaux.js';
import * as EN from './encheres.js';
import * as PA from './pacte.js';
import * as CR from './cryptes.js';
import { FERVOR_START, FERVOR_MAX, FERVOR_CARRY, TALENTS } from './skills.js';
// Créature de la semaine : à partir de cet étage ; gardien vaincu : chance de le recruter
export const WEEKLY_FLOOR = 8;
/* v493 : force attendue d'une équipe à un étage (powerFor), plafonnée à ce qu'une équipe au maximum peut avoir */
export const REF_POW_MAX = 2.8; /* v495 : plus de budget d'équipe, le plafond suit la force conseillée de l'étage 100 */
export const REF_TOL = 1.15; // marge : une équipe jusqu'à 15 % sous la force conseillée n'est pas pénalisée
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
export const TRIAL_MULT = [1.3, 1.8, 1.25]; // PV et attaque des ennemis
export const AWAKEN_AT = 30;   // gardiens éveillés à partir de cet étage

// v348 : nombre de jours entre deux dates « AAAA-MM-JJ » (heure locale)
const dayGap = (a, b) => { const p = (x) => { const [y, m, d] = x.split('-').map(Number); return new Date(y, m - 1, d).getTime(); }; return Math.round((p(b) - p(a)) / 864e5); };

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
    try { this.dropRemoved(); } catch (e) { /* rien */ }
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
    const stock = !fp.day ? FREE_PACK.perDay : fp.day === day ? (fp.left || 0) : Math.min(FREE_PACK.max, (fp.left || 0) + dayGap(fp.day, day) * FREE_PACK.perDay);
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
    return { stock, nextAt: stock ? null : midnight };
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
    if ((this.s.tickets[type] || 0) > 0) { this.s.tickets[type]--; paidWith = 'ticket'; }
    else if (free && free.stock > 0) { this.s.freePack = { day: today(this.clock()), left: free.stock - 1 }; paidWith = 'free'; }
    else if (this.s.shards >= def.price) { this.s.shards -= def.price; this.s.stats.shardsSpent += def.price; paidWith = 'shards'; }
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
    const opening = { t: Date.now(), type, faction: faction || null, event: type === 'event' ? ev.key : null, paidWith, guaranteed: res.guaranteed, cards, rewards };
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
    this.s.week.claimed = true; this.addChests({ or: 1 }); this.persist();
    return 'or';
  }
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
    sh.paid = Object.fromEntries(Object.entries(sh.paid).slice(-13));
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
  // Doublons et Fournaise -------------------------------------------------
  // Un doublon = un exemplaire en plus du premier, dans la même finition (chaque finition gardée une fois).
  spare(id) { const e = this.s.collection[id]; return e ? Object.values(e.v).reduce((a, k) => a + Math.max(0, (k || 0) - 1), 0) : 0; }
  spareCount(r) { return this.catalog.byRarity[r].reduce((a, c) => a + this.spare(c.id), 0); }
  // Cendres rendues par un exemplaire brûlé : rareté × finition
  // v280 : Sublimer — la finition suivante contre des cendres, si la carte est déjà possédée dans la finition précédente
  sublimeInfo(id) {
    const card = this.catalog.get(id), e = this.s.collection[id];
    if (!card || !e) return null;
    const order = ['normal', ...['holo', 'gold', 'galaxy'].filter((v) => card.variants.includes(v))];
    const to = order.find((v, i) => i > 0 && !e.v[v] && e.v[order[i - 1]]);
    if (!to) return null;
    return { to, from: order[order.indexOf(to) - 1], cost: Math.round((ECONOMY.burnAsh[card.rarity] || 0) * SUBLIME_ASH[to]) };
  }
  sublime(id) {
    const x = this.sublimeInfo(id);
    if (!x) throw new Error('Rien à sublimer pour cette carte.');
    if (this.s.ash < x.cost) throw new Error(`Il te manque ${x.cost - this.s.ash} cendres (tu en as ${this.s.ash}).`);
    this.s.ash -= x.cost;
    this.addCard(id, x.to, 'reward');
    const progress = this.checkProgress();
    this.persist();
    return { ...x, progress };
  }
  burnValue(id, variant = 'normal') { return Math.round((ECONOMY.burnAsh[this.catalog.get(id)?.rarity] || 0) * (ECONOMY.burnFinish[variant] || 1)); }
  // Brûle n exemplaires d'une finition. Le dernier exemplaire peut partir : la créature quitte alors la collection.
  burn(id, variant = 'normal', n = 1) {
    const e = this.s.collection[id];
    if (!e || !((e.v[variant] || 0) >= n) || n < 1) throw new Error('Tu ne possèdes pas assez d’exemplaires de cette version.');
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
    this.s.team = (this.s.team || []).filter((x) => x !== id);
    this.s.showcase = this.s.showcase.filter((x) => x !== id);
    if (this.s.avatar === id) this.s.avatar = null;
    delete this.s.forms[id];
  }
  // Niveau d'une créature : acheté avec des cendres (coût = base de la rareté × niveau actuel)
  upgradeCost(id) {
    const e = this.entry(id), lv = e?.lv || 1, c = this.catalog.get(id);
    return !c || lv >= MAX_LEVEL ? 0 : ECONOMY.levelAsh[c.rarity] * lv; // v310 : carte inconnue (version plus récente) ignorée
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
    const owned = Object.keys(this.s.collection).map((id) => this.catalog.get(id)).filter(Boolean);
    return suggestTeam(owned, (id) => this.cardLevel(id));
  }
  teamSynergies(ids = this.team()) { return teamSynergies(ids.map((id) => this.catalog.get(id)).filter(Boolean), (id) => this.cardLevel(id)); }
  // Complète l'équipe avec les meilleures cartes possédées
  autoTeam(keep = []) {
    const t = keep.slice(), size = TEAM.active + TEAM.reserve;
    const cards = Object.keys(this.s.collection).map((id) => this.catalog.get(id)).filter((c) => c && !t.includes(c.id))
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
  ultimate(ids = this.s.team) { const c = this.ultCard(ids); const key = ultOf(c); return { key, ...ULTS[key], card: c?.id || null, power: 1 + 0.08 * ((c ? this.cardLevel(c.id) : 1) - 1) }; }

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
  nightTierOpen(t) { return t <= 1 ? this.nightmareUnlocked() : this.nightmareUnlocked() && this.nightBest(t - 1) >= NIGHT_TIER_OPEN; }
  nightTiersOpen() { return [1, 2, 3].filter((t) => this.nightTierOpen(t)); }
  // v406 : premiers étages des chapitres ouverts (chaque gardien vaincu ouvre le chapitre suivant)
  startFloors() {
    const best = this.descent().best || 0, out = [1];
    for (let f = DESCENT.bossEvery; f <= best && f < FINAL_FLOOR; f += DESCENT.bossEvery) out.push(f + 1); /* v394 : pas de départ après le fond */
    return out;
  }
  // v406 : chapitre en cours de la campagne (le premier qui n'est pas terminé)
  chapterNow() { return Math.min(Math.floor((this.descent().best || 0) / CHAPTER) + 1, Math.ceil(FINAL_FLOOR / CHAPTER)); }
  campaignDone() { return (this.descent().best || 0) >= FINAL_FLOOR; }
  // Première victoire à cet étage (campagne : record ; Cauchemar : record du palier)
  firstClear(run, floor = run.floor) { return floor > (run.nightmare ? this.nightBest(run.nightTier || 1) : this.descent().best || 0); }
  floorReward(run, floor = run.floor) {
    const r = floorFirstReward(floor), nt = nightTier(run);
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
  startRun({ cursed = false, nightmare = false, start = 1 } = {}) {
    const tier = nightmare === true ? 1 : Math.max(0, Math.min(3, Number(nightmare) || 0));
    if (tier && !this.nightmareUnlocked()) throw new Error(`Le mode Cauchemar s’ouvre quand tu as atteint l’étage ${NIGHTMARE_AT}.`);
    if (tier > 1 && !this.nightTierOpen(tier)) throw new Error(`${NIGHT_TIERS[tier].name} s’ouvre quand tu as atteint l’étage ${NIGHT_TIER_OPEN} en ${NIGHT_TIERS[tier - 1].name}.`);
    if (!this.startFloors().includes(start)) throw new Error('Ce chapitre n’est pas encore ouvert : bats d’abord le gardien qui le précède.');
    /* v406 : le Cauchemar se joue sur les chapitres déjà terminés */
    if (tier && start + CHAPTER - 1 > (this.descent().best || 0)) throw new Error('Le Cauchemar se joue sur un chapitre que tu as déjà terminé.');
    const d = this.descent();
    if (d.run) throw new Error('Un chapitre est déjà en cours.');
    const team = this.team();
    if (team.length < TEAM.active) throw new Error(`Il faut au moins ${TEAM.active} créatures dans ton équipe.`);
    const free = false; /* v406 : plus de torches, la campagne se joue librement */
    d.runs = (d.runs || 0) + 1;
    const ult = this.ultimate(team);
    d.run = {
      v: 3, day: d.day, floor: start, cleared: start - 1, start, phase: 'doors', cursed: false, free, nightmare: !!tier, nightTier: tier || undefined, blessings: [], altar: null,
      gauge: this.rule(d.day).key === 'lune' ? FERVOR_MAX - 2 : this.rule(d.day).key === 'reserve' ? 0 : FERVOR_START, ult: { key: ult.key, power: ult.power, card: ult.card },
      team: team.map((id) => { const u = duelUnit(this.catalog.get(id), { level: this.cardLevel(id), form: this.formOf(id) }); return { id, hp: u.maxHp, maxHp: u.maxHp, fallen: false, form: this.formOf(id) }; }),
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
    if (!t || t.day !== day) t = this.s.trials = { day, done: [null, null, null], score: 0, cur: null, battle: null };
    return t;
  }
  trialPower() {
    const ids = Object.keys(this.s.collection).filter((id) => this.owns(id) && this.catalog.get(id));
    /* force des Épreuves : la rareté y pèse moins que dans cardPower (mesuré : à force égale, des Rares au niveau 7 gagnaient bien plus que des Hyper rares au niveau 5) */
    const pw = (id) => { const c = this.catalog.get(id); return Math.sqrt(cardPower(c.rarity, 1)) * (1 + 0.08 * (this.cardLevel(id) - 1)); };
    const best = (list) => { const top = list.map(pw).sort((a, b) => b - a).slice(0, TEAM.active + TEAM.reserve); return top.length ? top.reduce((a, b) => a + b, 0) / top.length : 1; };
    return Math.max(best(ids), best(this.team()));
  }
  // Étage « équivalent » de chaque Épreuve : celui que la force du joueur atteint en expédition (powerFor), plus un écart
  // propre à l'Épreuve (combat, élite, gardien). Réglé par simulation pour viser environ 6 victoires sur 10.
  trialFloor(i) {
    const p = this.trialPower(), base = 6 + 22 * (p - 1);
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
    const st = createDuel(allies, enemies, { fervor: rule.key === 'lune' ? FERVOR_MAX - 2 : rule.key === 'reserve' ? 0 : FERVOR_START, ult: ult.key, power: ult.power, known, ruleMult: rule.key === 'instable' ? 1.25 : 1, boss: info.boss, discovered: this.s.weakSeen || {}, seed: this.rng ? Math.floor(this.rng() * 2 ** 31) : null });
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
  sceauxOpen() { const sc = this.s.sceaux; return Object.keys(this.s.bossesBeaten || {}).length > 0 || (sc.wins + sc.losses + sc.draws) > 0 || !!sc.cur || this.devGames(); }
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
    let R = SC.RIVAL[rival], seed = Math.floor(this.rng() * 2 ** 31);
    if (daily) {
      if (!this.sceauxDailyOpen()) throw new Error('Le défi du jour s’ouvre après ta première victoire contre Ilda.');
      const d = this.sceauxDaily();
      if (sc.dailyDone === today(this.clock())) throw new Error('Défi du jour déjà relevé. Reviens demain !');
      R = { ...SC.RIVAL[d.rival], rule: d.rule }; seed = d.seed;
    } else {
      const i = SC.RIVALS.findIndex((r) => r.key === rival);
      if (i < 0) throw new Error('Adversaire inconnu.');
      if (!SC.rivalUnlocked(this.s, i)) throw new Error('Bats d’abord l’adversaire précédent.');
      if (awake) { if (!sc.beaten[rival]) throw new Error('Bats-le d’abord une fois.'); R = SC.awakened(R); }
    }
    sc.cur = SC.newGame(this.catalog, { hand: this.sceauxHand(), rival: R, seed, daily });
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
    const m = SC.aiMove(this.catalog, st, ai.level, this.rng, ai.slip, ai.tol ?? Infinity);
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
      if (st.daily && sc.dailyDone !== day) { sc.dailyDone = day; out.shards += SC.SCEAUX_REWARD.daily; out.chests.push('bois'); }
      out.chests = out.chests.filter(Boolean); out.chests.forEach((c) => { this.s.chests[c] = (this.s.chests[c] || 0) + 1; }); /* v408 */
      if (sc.paidToday < SC.SCEAUX_REWARD.dailyPaid) { sc.paidToday++; out.shards += R.reward; } else { out.capped = true; out.shards += SC.SCEAUX_REWARD.afterCap; } // v348 : un petit gain reste au-delà du plafond
      const t = st.awake ? (Object.keys(sc.awake).length >= SC.RIVALS.length ? 'Vainqueur des Implacables' : null) : SC.SCEAUX_TITLES[R.key] || (sc.wins === 1 ? SC.SCEAUX_TITLES.initie : null);
      if (t && !this.s.titles.includes(t)) { this.s.titles.push(t); out.title = t; }
      if (R.key === 'echo' && !this.s.frames.includes('sceaux')) { this.s.frames.push('sceaux'); out.frame = 'sceaux'; }
      // Trophée : une carte adverse capturée, une fois par jour
      if (sc.trophyDay !== day) { const ch = SC.trophyChoices(this.catalog, st); if (ch.length) { st.trophy = ch; out.trophy = ch; } }
    } else if (st.over === 'lost') { sc.losses++; sc.streak = 0; } else { sc.draws++; if (st.daily && sc.dailyDone !== day) { sc.dailyDone = day; out.shards += 10; } }
    this.s.shards += out.shards;
    out.xp = SC.SCEAUX_REWARD.xp; this.s.xp += out.xp; // v348 : chaque partie terminée donne un peu d'expérience
    sc.history.unshift({ t: Date.now(), rival: R.key, r: st.over, s: st.final });
    sc.history = sc.history.slice(0, 20);
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
    this.persist();
    return r;
  }
  sceauxQuit() { this.s.sceaux.cur = null; this.persist(); }
  // ——— v427 : les Enchères de Mammon (enchères à l'aveugle à trois), ouvertes avec la Salle des jeux ———
  encheresUnlocked() { return EN.TABLES.filter((_, i) => EN.tableUnlocked(this.s, i)).length; }
  encheresDailyOpen() { return !!this.s.encheres.beaten?.etal; }
  encheresDaily() { const day = today(this.clock()); return { table: EN.dailyTable(day, this.encheresUnlocked()), seed: [...`encheres:${day}`].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261) }; }
  encheresStart({ table, daily = false } = {}) {
    const en = this.s.encheres;
    if (!this.sceauxOpen()) throw new Error('Les Enchères de Mammon s’ouvrent après ton premier gardien.');
    let seed = Math.floor(this.rng() * 2 ** 31);
    if (daily) {
      if (!this.encheresDailyOpen()) throw new Error('Le défi du jour s’ouvre après ta première victoire à l’Étal des curiosités.');
      if (en.dailyDone === today(this.clock())) throw new Error('Défi du jour déjà relevé. Reviens demain !');
      const d = this.encheresDaily(); table = d.table; seed = d.seed;
    } else {
      const i = EN.TABLES.findIndex((t) => t.key === table);
      if (i < 0) throw new Error('Table inconnue.');
      if (!EN.tableUnlocked(this.s, i)) throw new Error('Gagne d’abord à la table précédente.');
    }
    en.cur = EN.newGame(this.catalog, { table, seed, daily });
    this.persist();
    return en.cur;
  }
  // Une manche : ton offrande, celles des deux enchérisseurs, puis le lot part (ou reste sur la table)
  encheresBid(offer) {
    const st = this.s.encheres.cur;
    if (!st || st.over) throw new Error('Aucune vente en cours.');
    const ev = EN.resolve(st, { p: offer, ...EN.aiBids(st, this.rng) });
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
      if (st.daily && en.dailyDone !== day) { en.dailyDone = day; out.shards += R.daily; out.chests.push('bois'); }
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
    out.xp = R.xp; this.s.xp += out.xp;
    en.history.unshift({ t: Date.now(), table: T.key, r: st.over, s: st.final?.scores });
    en.history = en.history.slice(0, 20);
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
      .filter(([, open, sv]) => open && sv?.dailyDone !== day).map(([k]) => k);
  }
  pacteDaily() { const day = today(this.clock()); return { table: PA.dailyTable(day, this.pacteUnlocked()), seed: [...`pacte:${day}`].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261) }; }
  pacteStart({ table, daily = false } = {}) {
    const pa = this.s.pacte;
    if (!this.sceauxOpen()) throw new Error('Le Pacte s’ouvre après ton premier gardien.');
    let seed = Math.floor(this.rng() * 2 ** 31);
    if (daily) {
      if (!this.pacteDailyOpen()) throw new Error('Le défi du jour s’ouvre après ta première victoire au Pacte du novice.');
      if (pa.dailyDone === today(this.clock())) throw new Error('Défi du jour déjà relevé. Reviens demain !');
      const d = this.pacteDaily(); table = d.table; seed = d.seed;
    } else {
      const i = PA.TABLES.findIndex((x) => x.key === table);
      if (i < 0) throw new Error('Table inconnue.');
      if (!PA.tableUnlocked(this.s, i)) throw new Error('Gagne d’abord le pacte précédent.');
    }
    pa.cur = PA.newGame(this.catalog, { table, seed, daily });
    this.persist();
    return pa.cur;
  }
  pacteDraw() { const st = this.s.pacte.cur; if (!st || st.over || st.turn !== 'p') throw new Error('Ce n’est pas ton tour.'); const ev = PA.draw(st); this.persist(); return ev; }
  pacteStop() { const st = this.s.pacte.cur; if (!st || st.over || st.turn !== 'p') throw new Error('Ce n’est pas ton tour.'); const ev = PA.stop(st); this.persist(); return ev; }
  pacteAi() { const st = this.s.pacte.cur; if (!st || st.over || st.turn !== 'a') return []; const evs = PA.aiTurn(st, this.rng); this.persist(); return evs; }
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
      if (st.daily && pa.dailyDone !== day) { pa.dailyDone = day; out.shards += R.daily; out.chests.push('bois'); }
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
    out.xp = R.xp; this.s.xp += out.xp;
    pa.history.unshift({ t: Date.now(), table: T.key, r: st.over, s: st.final?.scores });
    pa.history = pa.history.slice(0, 20);
    st.rewarded = true; st.result = out;
    this.track('pacte', 1);
    this.checkProgress();
    this.persist();
    return out;
  }
  pacteQuit() { this.s.pacte.cur = null; this.persist(); }
  // ——— v450 : Les Cryptes (mémoire à deux, pouvoirs des factions), ouvertes avec la Salle des jeux ———
  cryptesUnlocked() { return CR.TABLES.filter((_, i) => CR.tableUnlocked(this.s, i)).length; }
  cryptesDailyOpen() { return !!this.s.cryptes.beaten?.ossuaire; }
  cryptesDaily() { const day = today(this.clock()); return { table: CR.dailyTable(day, this.cryptesUnlocked()), seed: [...`cryptes:${day}`].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261) }; }
  cryptesStart({ table, daily = false } = {}) {
    const cr = this.s.cryptes;
    if (!this.sceauxOpen()) throw new Error('Les Cryptes s’ouvrent après ton premier gardien.');
    let seed = Math.floor(this.rng() * 2 ** 31);
    if (daily) {
      if (!this.cryptesDailyOpen()) throw new Error('Le défi du jour s’ouvre après ta première victoire à l’Ossuaire.');
      if (cr.dailyDone === today(this.clock())) throw new Error('Défi du jour déjà relevé. Reviens demain !');
      const d = this.cryptesDaily(); table = d.table; seed = d.seed;
    } else {
      const i = CR.TABLES.findIndex((x) => x.key === table);
      if (i < 0) throw new Error('Table inconnue.');
      if (!CR.tableUnlocked(this.s, i)) throw new Error('Gagne d’abord dans la crypte précédente.');
    }
    cr.cur = CR.newGame(this.catalog, { table, seed, daily });
    this.persist();
    return cr.cur;
  }
  cryptesFlip(i) { const st = this.s.cryptes.cur; if (!st || st.over || st.turn !== 'p') throw new Error('Ce n’est pas ton tour.'); const ev = CR.flip(st, i, this.rng); this.persist(); return ev; }
  cryptesPower(picks) { const st = this.s.cryptes.cur; if (!st || st.over) throw new Error('Aucune partie en cours.'); const ev = CR.usePower(st, picks, this.rng); this.persist(); return ev; }
  // un geste de l'adversaire (une carte retournée), pour que l'écran le montre pas à pas
  cryptesAi() { const st = this.s.cryptes.cur; if (!st || st.over || st.turn !== 'a') return null; const ev = CR.flip(st, CR.aiPick(st, this.rng), this.rng); this.persist(); return ev; }
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
      if (st.daily && cr.dailyDone !== day) { cr.dailyDone = day; out.shards += R.daily; out.chests.push('bois'); }
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
    out.xp = R.xp; this.s.xp += out.xp;
    cr.history.unshift({ t: Date.now(), table: T.key, r: st.over, s: st.final?.scores });
    cr.history = cr.history.slice(0, 20);
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
    const short = tp < powerFor(Math.max(best + 1, 4));
    const weak = team.map((id) => ({ id, lv: this.cardLevel(id) })).filter((x) => x.lv < MAX_LEVEL && (short || x.lv < (best >= 1 ? 2 : 1))).sort((a, b) => a.lv - b.lv)[0];
    if (weak && this.s.ash >= this.upgradeCost(weak.id)) {
      const c = this.catalog.get(weak.id), cost = this.upgradeCost(weak.id);
      const forge = { kind: 'forge', title: `Renforce ${c.name}`, sub: `Niveau ${weak.lv} → ${weak.lv + 1} pour ${cost} cendres (tu en as ${this.s.ash}) : plus de PV et d’attaque`, href: '#/renfort', icon: 'level-up' };
      // jamais rien monté : c'est l'objectif principal (affiché en grand), sauf pendant une expédition
      if (!d.run && team.every((id) => this.cardLevel(id) <= 1)) out.unshift(forge); else out.push(forge);
    }
    // v328 : équipe au niveau maximal et cendres qui dorment : Sublimer (finition supérieure) devient l'objectif
    if (team.length && team.every((id) => this.cardLevel(id) >= MAX_LEVEL)) {
      const sub = Object.keys(this.s.collection).map((id) => ({ id, x: this.sublimeInfo(id) })).filter((o) => o.x && o.x.cost <= this.s.ash)
        .sort((a, b) => (this.isFav(b.id) - this.isFav(a.id)) || (b.x.cost - a.x.cost))[0];
      if (sub) out.push({ kind: 'sublime', title: `Sublime ${this.catalog.get(sub.id).name}`, sub: `${VARIANTS[sub.x.to].name} pour ${sub.x.cost} cendres (tu en as ${this.s.ash}) · Fournaise → Sublimer`, href: '#/fournaise', icon: 'holo' });
    }
    if (bf && bf > best && out.length < 3 && !out.some((x) => x.sub?.includes(BOSSES[bossOf(bf)].name))) { /* v411 : jamais un gardien déjà dépassé */ const B = BOSSES[bossOf(bf)]; out.push({ kind: 'boss', title: `Vaincs ${B.name}`, sub: `Gardien de l’étage ${bf} · son récit t’attend dans le Bestiaire`, href: '#/descente', icon: 'crest-boss' }); }
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
    return this.startBattle(room, { room, pact: key });
  }
  startBattle(room, out = { room }) {
    const run = this.s.descent.run;
    const rule = this.rule(run.day);
    if (room === 'fight' || room === 'elite' || room === 'boss') {
      // les créatures du Bestiaire, corrompues ; l'état du duel est gardé dans l'expédition (reprise exacte)
      // plancher : ennemis ordinaires et élites au moins au niveau de l'étage équivalent à l'équipe (pas les gardiens)
      const eff = room === 'boss' ? run.floor : Math.max(run.floor, run.minFloor || 1);
      const sc = enemyScale(eff);
      const lvl = enemyLevel(eff, room);
      const list = floorEnemies(this.catalog, run.day, run.floor, room) /* v434 : plus d'événement de la semaine dans la Descente */;
      const enemies = list.map((e) => duelUnit(this.catalog.get(e.id), { side: 'enemy', scale: sc, level: e.boss || e.elite ? lvl : enemyLevel(eff, 'fight'), boss: e.boss, elite: e.elite }));
      for (const e of enemies) {
        // combats ordinaires : des ennemis qui frappent plus fort, pour que chaque combat ait un enjeu
        if (!e.boss && !e.elite) e.atk = Math.round(e.atk * FIGHT_ATK + 0.4);
        const f = this.catalog.get(e.id)?.faction;
        if (rule.key === 'furie' && f === rule.faction) e.atk = Math.round(e.atk * 1.25 + 0.4);
        if (rule.key === 'sommeil' && f === rule.faction) { e.maxHp = Math.max(1, Math.round(e.maxHp * 0.75)); e.hp = e.maxHp; }
        const nt = nightTier(run); if (nt) { e.maxHp = Math.round(e.maxHp * nt.hp); e.hp = e.maxHp; e.atk = Math.round(e.atk * nt.atk + 0.4); }
        if (run.omen === 'avare') e.atk = Math.round(e.atk * 1.1 + 0.4);
        { const k = e.boss ? bossEase(run.floor) : lateSoft(run.floor); if (k !== 1) { e.maxHp = Math.max(1, Math.round(e.maxHp * k)); e.hp = e.maxHp; e.atk = Math.max(1, Math.round(e.atk * k)); } } /* v460 */
        // Gardien éveillé (Cauchemar, ou à partir de l'étage 30) : sa phase 2 commence dès le premier tour
        if (e.boss && (run.nightmare || run.floor >= AWAKEN_AT)) e.awakened = true;
      }
      // un ennemi nommé : plus coriace, il rapporte un butin en plus
      if (!(this.novice() && run.floor < 4)) foeTraits(run.day, run.floor, room, enemies.length).forEach((t, i) => { if (t && !enemies[i].boss && !enemies[i].weekly) { enemies[i].trait = t; if (t === 'carapace') enemies[i].shield = 1; } });
      if (rule.key === 'nuee') enemies.forEach((e) => { if (!e.boss && !e.elite && !e.weekly && !e.trait) e.trait = 'explosif'; });
      const nm = namedFoe(run.day, run.floor, room), nf = nm && enemies.find((e) => !e.boss && !e.weekly);
      if (nf) { nf.title = nm; nf.named = true; nf.maxHp = Math.round(nf.maxHp * 1.3); nf.hp = nf.maxHp; nf.atk = Math.round(nf.atk * 1.15 + 0.4); }
      const known = {};
      enemies.forEach((e) => { if (this.knows(e.id)) known[e.id] = true; });
      run.battle = createDuel(this.runUnits(), enemies, { fervor: run.gauge || 0, ult: run.ult.key, power: run.ult.power, known, ruleMult: rule.key === 'instable' ? 1.25 : 1, boss: room === 'boss' ? bossOf(run.floor) : null, pact: room === 'fight' ? null : run.pact || null, relics: OMENS[run.omen]?.relic ? [OMENS[run.omen].relic] : [], blessings: run.blessings, discovered: this.s.weakSeen || {}, seed: this.rng ? Math.floor(this.rng() * 2 ** 31) : null, goal: this.goalFor(run, room), refPow: refPowFor(Math.max(run.floor, run.minFloor || 1)) });
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
    const tal = Object.keys(TALENTS).filter((k) => !TALENTS[k].legacy).sort(() => r() - 0.5);
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
    /* v406 : en Cauchemar, le record du palier avance étage par étage (il décide des premières victoires) */
    if (run.nightmare) { const d = this.s.descent, t = run.nightTier || 1; if (run.floor > this.nightBest(t)) (d.nightBest ||= {})[t] = run.floor; if (t === 1 && run.floor > (d.bestNightmare || 0)) d.bestNightmare = run.floor; }
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
      if (!run.free) { out.ash = Math.round((2 + Math.min(run.floor, SHARD_FLOOR_CAP) / 2) * (room === 'boss' ? 3 : room === 'elite' ? 2 : 1)); this.s.ash += out.ash; this.s.stats.ashEarned += out.ash; }
      const named = Object.values(st.units).find((u) => u.side === 'enemy' && u.named);
      if (named) out.named = { title: named.title, id: named.id, shards: this.gainShards(20 + Math.min(run.floor, SHARD_FLOOR_CAP) * 4) };
      // objectif réussi : éclats en plus et 1 Ferveur pour la suite
      if (goal?.state === 'done') { out.goalShards = this.gainShards((3 + Math.min(run.floor, SHARD_FLOOR_CAP)) * (room === 'boss' ? 2 : 1)); run.gauge = Math.min(carry, run.gauge + 1); this.s.stats.goals = (this.s.stats.goals || 0) + 1; }
      if (room === 'elite') { const t = this.talentOffers(run); if (t.length) { run.talentOffer = t; out.talents = t; } }
      // exploits de l'expédition (fêtés dans le résumé)
      const F = (run.feats ||= { hit: 0, syn: 0, breaks: 0, parries: 0, perfect: 0, crits: 0, kills: 0, wins: 0 }), S = st.stats || {};
      F.hit = Math.max(F.hit, S.maxHit || 0); F.syn += (S.named || 0) + (S.combos || 0); F.breaks += S.breaks || 0; F.parries += S.parries || 0; F.perfect += S.perfect || 0; F.crits += S.crits || 0; F.kills += st.kills.length; F.wins++; if (run.free || !this.firstClear(run)) this.codexXp(CODEX_XP.win, 'win');
      // v406 : première victoire à cet étage : sa récompense (éclats, cendres, coffre ; coffre d'or ou abyssal pour un gardien)
      if (!run.free && this.firstClear(run)) {
        const r = this.floorReward(run);
        if (r.shards) { this.s.shards += r.shards; this.s.stats.shardsEarned = (this.s.stats.shardsEarned || 0) + r.shards; }
        if (r.ash) { this.s.ash += r.ash; this.s.stats.ashEarned += r.ash; }
        for (const [c, n] of Object.entries(r.chests || {})) for (let i = 0; i < n; i++) { run.chests.push(c); out.chest = c; }
        out.first = r; this.codexXp(run.floor % 5 === 0 ? CODEX_XP.boss : CODEX_XP.floor, run.floor % 5 === 0 ? 'boss' : 'floor');
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
        const summit = run.floor >= FINAL_FLOOR;
        if (summit && out.first) { this.grant({ tickets: { abysse: 1 } }, 'summit'); this.s.stats.summits = (this.s.stats.summits || 0) + 1; out.abyssPack = true; }
        this.clearFloor();
        this.track('win', 1);
        out.chapter = chapterOf(run.floor);
        if (summit) out.summit = true;
        out.summary = this.endRun(false);
        Object.assign(out.summary, { chapterDone: out.chapter, summit: !!summit, report: out.report, abyss: !!out.abyss, abyssPack: !!out.abyssPack, free: !!run.free, boss: out.boss, bossChest: out.first ? out.chest : null });
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
    return run.phase === 'doors' && run.floor === (run.start || 1) && run.cleared === (run.start || 1) - 1 && !run.shards && !run.chests.length && !run.blessings.length && run.team.every((m) => !m.fallen && m.hp === m.maxHp);
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
    const summary = this.endRun(true);
    summary.abandoned = true;
    this.persist();
    return summary;
  }
  endRun(wiped = false) {
    const d = this.s.descent, run = d.run;
    if (!run) throw new Error('Aucun chapitre en cours.');
    // v406 : plus de coffre de fin ni de perte : tout ce qui a été gagné est gardé ; une équipe tombée recommence le chapitre
    const shards = run.shards, chests = run.chests.slice();
    chests.forEach((c) => { this.s.chests[c] = (this.s.chests[c] || 0) + 1; });
    this.s.shards += shards;
    const summary = { wiped, floor: run.cleared, day: run.day, chests, shards, kills: run.kills, free: run.free, cursed: run.cursed, nightmare: !!run.nightmare, nightTier: run.nightmare ? run.nightTier || 1 : 0, start: run.start || 1, chapter: chapterOf(run.start || 1), firstLoot: run.firstLoot || null };
    if (!run.free && run.cleared > 0 && run.bestBefore !== undefined && run.cleared > run.bestBefore) summary.record = true;
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
  setBack(k) { if (!k || (this.s.backs || []).includes(k)) { this.s.back = k || null; this.persist(); } } /* v473 : null = dos par défaut */
  setName(n) { this.s.name = String(n || '').replace(/[<>]/g, '').trim().slice(0, 16); this.persist(); }
  setAvatar(id) { if (this.owns(id)) { this.s.avatar = id; this.persist(); } }
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
    if (reward.obs) this.s.obs = (this.s.obs || 0) + reward.obs; /* v474 : obsidiennes (achetées en euros) */
    if (reward.chests) this.addChests(reward.chests);
  }

  // ——— v470 : ÉBAUCHE du pass de saison (Codex) et de la boutique en argent réel (Échoppe), cachés hors Mode Créateur ———
  codexOn() { return !!(this.s.settings?.dev && this.s.devCodex); }
  codex() { return codexState(this.s); }
  codexXp(n, why) {
    if (!n) return;
    const c = this.codex(), max = CODEX.tiers * CODEX.xpPerTier;
    const add = Math.max(0, Math.min(n, max - c.xp));
    c.xp += add; c.log[why] = (c.log[why] || 0) + add;
  }
  codexClaim(track, tier) {
    const c = this.codex(), t = CODEX_TIERS[tier - 1];
    if (!t || tier > codexTier(c)) throw new Error('Palier pas encore atteint.');
    if (track === 'prem' && !c.premium) throw new Error(`La voie enluminée demande le ${CODEX.premiumName}.`);
    const r = t[track];
    if (!r || c[track].includes(tier)) throw new Error('Rien à récupérer ici.');
    c[track].push(tier); this.grant(r, 'codex'); this.persist();
    return r;
  }
  codexClaimAll() {
    const c = this.codex(), got = [];
    for (const t of CODEX_TIERS) {
      if (t.tier > codexTier(c)) break;
      for (const tr of ['free', 'prem']) if (t[tr] && !c[tr].includes(t.tier) && (tr === 'free' || c.premium)) { c[tr].push(t.tier); this.grant(t[tr], 'codex'); got.push(t[tr]); }
    }
    this.persist();
    return got;
  }
  /* Achat SIMULÉ en euros (aperçu Créateur) : le vrai paiement passera par l'App Store (identifiant `store` de chaque article) */
  shopBuy(id) {
    if (!this.codexOn()) throw new Error('L’Échoppe n’est pas encore ouverte.');
    const it = SHOP.find((x) => x.id === id), bought = (this.s.purchases ||= []);
    if (!it) throw new Error('Article inconnu.');
    if (it.once && bought.includes(id)) throw new Error('Déjà acheté.');
    this.grant(it.give, 'shop');
    bought.push(id); this.persist();
    return it;
  }
  shopOwned(id) { return !!(this.s.purchases || []).includes(id); }
  // v474 : dépenses en obsidiennes (cosmétiques seulement)
  obs() { return this.s.obs || 0; }
  spendObs(n) {
    if (!this.codexOn()) throw new Error('L’Échoppe n’est pas encore ouverte.');
    if (this.obs() < n) throw new Error(`Il te manque ${n - this.obs()} obsidiennes.`);
    this.s.obs -= n;
  }
  catalogOwned(id) {
    const it = CATALOG.find((x) => x.id === id); if (!it) return false;
    const g = it.give;
    return (!g.frame || this.s.frames.includes(g.frame)) && (!g.finish || (this.s.finishes || []).includes(g.finish)) && (!g.back || (this.s.backs || []).includes(g.back)) && (g.backs || []).every((b) => (this.s.backs || []).includes(b));
  }
  catalogCost(id) { /* un lot ne fait pas payer ce qu'on a déjà : on retire le prix des dos déjà possédés, jamais sous 0 */
    const it = CATALOG.find((x) => x.id === id); if (!it) return 0;
    if (it.kind !== 'bundle') return it.cost;
    const have = (it.give.backs || []).filter((b) => (this.s.backs || []).includes(b)).length;
    return Math.max(0, Math.round(it.cost * (1 - have / it.give.backs.length)));
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
  codexUnlock() {
    if (this.codex().premium) throw new Error('Déjà débloqué pour cette saison.');
    this.spendObs(CODEX.cost); this.codex().premium = true; this.persist();
  }

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
      this.grant(reward);
      events.push({ kind: 'level', level: this.s.level, reward });
    }
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
    d.run = null; d.best = 0; d.bestToday = 0; d.bestNightmare = 0; d.nightBest = {}; d.last = null; d.risk = {};
    this.s.bossesBeaten = {}; this.s.bossWins = {}; this.s.storySeen = {};
    this.persist();
  }
  devFreePacks() { this.s.freePack = { day: null }; this.persist(); }
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
    if (!this.s.descent.run) this.startRun();
    const run = this.s.descent.run;
    if (run.phase === 'omen') this.chooseOmen(run.omenOffer[0]);
    run.battle = null; run.altar = null; run.rewards = null; run.talentOffer = null;
    return { floor: (i + 1) * DESCENT.bossEvery, level: this.devFloor((i + 1) * DESCENT.bossEvery, { power }) };
  }
  devUnlockAll() {
    this.catalog.cards.forEach((c) => { if (!this.owns(c.id)) this.addCard(c.id, 'normal', 'reward'); });
    const progress = this.checkProgress();
    this.persist();
    return progress;
  }
  reset() {
    const settings = this.s.settings;
    this.s = defaultSave();
    this.s.settings = { ...this.s.settings, ...settings };
    this.s.resetAt = Date.now(); /* v412 : partie effacée exprès : la partie en ligne ne doit pas revenir toute seule */
    this.persist();
  }
  replaceSave(save) { this.s = save; try { this.convertHeroes(); this.fixVariants(); } catch (e) { /* rien */ } this.persist(); }
  bestCards(n = 3) {
    return Object.keys(this.s.collection)
      .map((id) => this.catalog.get(id))
      .filter(Boolean)
      .sort((a, b) => RI(b.rarity) - RI(a.rarity) || b.power - a.power)
      .slice(0, n);
  }
  rarityLabel(r) { return RARITY[r].name; }
}
