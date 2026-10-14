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
import { BOOSTERS, FREE_PACK, ECONOMY, XP, LEVEL_TITLES, RARITY_ORDER, FACTION_ORDER, RARITY, MISSIONS, LUCK_POINTS, ITEMS, SHOW_ORDER, SHADOW } from '../config.js';
import { drawBooster, cryptoRandom, currentEvent, boosterOdds, weekIndex } from './boosters.js';
import { loadSave, writeSave, defaultSave, today } from './save.js';
import { rngOf, DESCENT, CHESTS, CHEST_FLOORS, floorDoors, floorEnemies, eventSwap, namedFoe, floorRewards, enemyLevel, floorFloor, blessingChoices, dailyRule, chestForDepth, shiftChest, enemyScale, expectedLevel, huntStage, HUNT_STAGES } from './descent.js';
import { createDuel, autoDuel, duelUnit, bossPowerOf, upgradeDuel, battleReport, GOALS, goalState } from './duel.js';
import { bossOf, BOSSES } from './bosses.js';
import { pactChoices, PACTS } from './pacts.js';
import { FORMS, formUnlocked } from './forms.js';
import * as SC from './sceaux.js';
import { FERVOR_START, FERVOR_MAX, FERVOR_CARRY, TALENTS } from './skills.js';
// Créature de la semaine : à partir de cet étage ; gardien vaincu : chance de le recruter
export const WEEKLY_FLOOR = 8;
export const BOSS_RECRUIT = 0.25;
export const FIGHT_ATK = 1; // force des ennemis ordinaires (réglée par simulation)
export const DESCENT_SHARDS = 0.15; // éclats gagnés dans la Descente : 15 % des montants de base
import { STARTER, COST, BUDGET, TEAM, ULTS, MAX_LEVEL, canUlt, ultOf, roleOf } from './army.js';

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
export const AWAKEN_AT = 30;   // gardiens éveillés à partir de cet étage

export class Game {
  constructor(catalog, storage, { rng = cryptoRandom, clock = () => new Date() } = {}) {
    this.catalog = catalog;
    this.storage = storage;
    this.rng = rng;
    this.clock = clock;
    this.listeners = {};
    const { save, source } = loadSave(storage);
    this.s = save;
    this.loadedFrom = source;
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
    const streak = this.s.daily.last === today(y) ? this.s.daily.streak + 1 : 1;
    return { streak, amount: ECONOMY.daily.base + Math.min(ECONOMY.daily.maxStreakBonus, (streak - 1) * ECONOMY.daily.perStreakDay) };
  }

  // Actions ----------------------------------------------------------------
  // Booster gratuit du jour : un par jour (heure locale), sans réserve. Pas récupéré aujourd'hui = perdu.
  // s.freePack.day : le jour où il a été ouvert. nextAt : minuit, si celui du jour est déjà pris.
  freePack(now = this.clock().getTime()) {
    const d = new Date(now);
    const taken = this.s.freePack.day === today(d);
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
    return { stock: taken ? 0 : FREE_PACK.perDay, nextAt: taken ? midnight : null };
  }

  canBuy(type) {
    const def = BOOSTERS[type];
    // le booster premium ne s'achète plus : il se gagne (gardiens de la Descente)
    return (this.s.tickets[type] || 0) > 0 || (type === 'standard' && this.freePack().stock > 0) || (!def.rewardOnly && this.s.shards >= def.price);
  }

  openBooster(type, { faction } = {}) {
    const def = BOOSTERS[type];
    if (!def) throw new Error('Booster inconnu');
    if (type === 'faction' && !FACTION_ORDER.includes(faction)) throw new Error('Choisis une faction.');
    let paidWith;
    const free = type === 'standard' ? this.freePack() : null;
    if ((this.s.tickets[type] || 0) > 0) { this.s.tickets[type]--; paidWith = 'ticket'; }
    else if (free && free.stock > 0) { this.s.freePack = { day: today(this.clock()) }; paidWith = 'free'; }
    else if (this.s.shards >= def.price) { this.s.shards -= def.price; this.s.stats.shardsSpent += def.price; paidWith = 'shards'; }
    else throw new Error(`Il te manque ${def.price - this.s.shards} éclats (tu en as ${this.s.shards}). La Descente et les Duels des Sceaux en rapportent.`);

    const ev = this.event();
    const res = drawBooster(type, this.catalog, { rng: this.rng, pity: this.s.pity, faction, event: ev });
    this.s.pity = res.pity;
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
      const pool = [...MISSIONS];
      const list = [];
      while (list.length < 3 && pool.length) {
        const def = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
        if (list.some((x) => x.kind === def.kind)) continue;
        const faction = def.kind === 'faction' ? FACTION_ORDER[Math.floor(rnd() * FACTION_ORDER.length)] : null;
        const fname = faction ? this.catalog.faction[faction]?.name || faction : '';
        list.push({ key: def.key, kind: def.kind, n: def.n, shards: def.shards, faction, text: def.text.replace('{faction}', fname), p: 0, claimed: false });
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
    x.claimed = true;
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
  burnValue(id, variant = 'normal') { return Math.round((ECONOMY.burnAsh[this.catalog.get(id).rarity] || 0) * (ECONOMY.burnFinish[variant] || 1)); }
  // Brûle n exemplaires d'une finition. Le dernier exemplaire peut partir : la créature quitte alors la collection.
  burn(id, variant = 'normal', n = 1) {
    const e = this.s.collection[id];
    if (!e || !((e.v[variant] || 0) >= n) || n < 1) throw new Error('Tu ne possèdes pas assez d’exemplaires de cette version.');
    const last = e.n - n <= 0;
    if (last) {
      if (this.isFav(id)) throw new Error('Cette créature est dans tes favoris : retire-la des favoris pour pouvoir la brûler.');
      if (this.uniqueCount() <= TEAM.active) throw new Error(`Garde au moins ${TEAM.active} créatures pour pouvoir combattre.`);
      if (this.s.descent.run?.team?.some((m) => m.id === id)) throw new Error('Cette créature est en pleine expédition.');
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
      if (!e) continue;
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
    for (const id of ids || Object.keys(this.s.collection)) { const e = this.s.collection[id]; if (e) for (const [v, k] of Object.entries(e.v)) if (k > 1) { ash += this.burnValue(id, v) * (k - 1); n += k - 1; } }
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
    const e = this.entry(id), lv = e?.lv || 1;
    return lv >= MAX_LEVEL ? 0 : ECONOMY.levelAsh[this.catalog.get(id).rarity] * lv;
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
  // Équipe valable : cartes possédées, budget respecté. Complétée automatiquement si besoin
  // (et 5 Communes offertes à qui n'a pas encore 3 créatures).
  team() {
    let t = (this.s.team || []).filter((id) => this.owns(id));
    // budget dépassé (par exemple après un changement de rareté) : on retire les dernières cartes
    while (t.length && this.teamCost(t) > BUDGET) t = t.slice(0, -1);
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
  // Complète l'équipe avec les meilleures cartes possédées, sans dépasser le budget
  autoTeam(keep = []) {
    const t = keep.slice(), size = TEAM.active + TEAM.reserve;
    const cards = Object.keys(this.s.collection).map((id) => this.catalog.get(id)).filter((c) => c && !t.includes(c.id))
      .sort((a, b) => RI(b.rarity) - RI(a.rarity) || this.cardLevel(b.id) - this.cardLevel(a.id) || b.power - a.power);
    for (const c of cards) {
      if (t.length >= size) break;
      const left = size - t.length - 1; // place gardée pour compléter avec des Communes
      if (this.teamCost(t) + COST[c.rarity] + left <= BUDGET) t.push(c.id);
    }
    return t;
  }
  setTeam(ids) {
    const list = [...new Set(ids)].filter((id) => this.owns(id)).slice(0, TEAM.active + TEAM.reserve);
    if (this.teamCost(list) > BUDGET) throw new Error(`Ton équipe dépasse le budget de ${BUDGET} points.`);
    if (this.s.descent.run) throw new Error('Termine d’abord ton expédition.');
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
    return d;
  }
  // Règle du jour (celle de l'expédition en cours si elle a commencé la veille)
  rule(day = this.descent().run?.day || this.descent().day) { return dailyRule(day, Object.fromEntries(Object.entries(this.catalog.faction).map(([k, f]) => [k, f.name]))); }
  torchesLeft() { return Math.max(0, DESCENT.torches - this.descent().used); }
  // Bonus contre une créature : posséder sa carte ou la maîtriser à la chasse
  knows(id) { return this.owns(id) || this.huntKills(id) >= HUNT_STAGES[2].k; }
  huntKills(id) { return this.s.hunt[id] || 0; }
  huntCount() { return Object.keys(this.s.hunt).length; }

  // Mode Cauchemar : débloqué au record de l'étage 20
  nightmareUnlocked() { return (this.descent().best || 0) >= NIGHTMARE_AT; }
  startRun({ cursed = false, nightmare = false } = {}) {
    if (nightmare && !this.nightmareUnlocked()) throw new Error(`Le mode Cauchemar s’ouvre quand tu as atteint l’étage ${NIGHTMARE_AT}.`);
    const d = this.descent();
    if (d.run) throw new Error('Une expédition est déjà en cours.');
    const team = this.team();
    if (team.length < TEAM.active) throw new Error(`Il faut au moins ${TEAM.active} créatures dans ton équipe.`);
    const free = this.torchesLeft() <= 0; // après les torches du jour : on peut rejouer, sans coffre
    if (!free) d.used++;
    d.runs = (d.runs || 0) + 1;
    const ult = this.ultimate(team);
    d.run = {
      v: 3, day: d.day, floor: 1, cleared: 0, phase: 'doors', cursed: cursed && !free, free, nightmare: !!nightmare, blessings: [], altar: null,
      gauge: this.rule(d.day).key === 'lune' ? FERVOR_MAX - 2 : FERVOR_START, ult: { key: ult.key, power: ult.power, card: ult.card },
      team: team.map((id) => { const u = duelUnit(this.catalog.get(id), { level: this.cardLevel(id), form: this.formOf(id) }); return { id, hp: u.maxHp, maxHp: u.maxHp, fallen: false, form: this.formOf(id) }; }),
      shards: 0, chests: [], kills: {}, bestBefore: d.best || 0, minFloor: floorFloor(team.reduce((a, id) => a + this.cardLevel(id), 0) / team.length),
    };
    this.persist();
    return d.run;
  }
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
  sceauxOpen() { const sc = this.s.sceaux; return Object.keys(this.s.bossesBeaten || {}).length > 0 || (sc.wins + sc.losses + sc.draws) > 0 || !!sc.cur; }
  sceauxUnlocked() { return SC.RIVALS.filter((_, i) => SC.rivalUnlocked(this.s, i)).length; }
  sceauxDaily() { return SC.dailyChallenge(today(this.clock()), this.sceauxUnlocked()); }
  sceauxStart({ rival, daily = false, awake = false } = {}) {
    const sc = this.s.sceaux;
    let R = SC.RIVAL[rival], seed = Math.floor(this.rng() * 2 ** 31);
    if (daily) {
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
    const m = SC.aiMove(this.catalog, st, st.level || SC.RIVAL[st.rival].level, this.rng);
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
    if (st.over === 'won') {
      sc.wins++; sc.streak++; sc.best = Math.max(sc.best, sc.streak);
      if (st.awake) { if (!sc.awake[R.key]) { sc.awake[R.key] = Date.now(); out.first = true; out.shards += SC.SCEAUX_REWARD.firstAwake; } }
      else if (!sc.beaten[R.key]) { sc.beaten[R.key] = Date.now(); out.first = true; out.shards += SC.SCEAUX_REWARD.firstWin; }
      if (st.daily && sc.dailyDone !== day) { sc.dailyDone = day; out.shards += SC.SCEAUX_REWARD.daily; }
      if (sc.paidToday < SC.SCEAUX_REWARD.dailyPaid) { sc.paidToday++; out.shards += R.reward; } else out.capped = true;
      const t = st.awake ? (Object.keys(sc.awake).length >= SC.RIVALS.length ? 'Éveilleur des Sceaux' : null) : SC.SCEAUX_TITLES[R.key] || (sc.wins === 1 ? SC.SCEAUX_TITLES.initie : null);
      if (t && !this.s.titles.includes(t)) { this.s.titles.push(t); out.title = t; }
      if (R.key === 'echo' && !this.s.frames.includes('sceaux')) { this.s.frames.push('sceaux'); out.frame = 'sceaux'; }
      // Trophée : une carte adverse capturée, une fois par jour
      if (sc.trophyDay !== day) { const ch = SC.trophyChoices(this.catalog, st); if (ch.length) { st.trophy = ch; out.trophy = ch; } }
    } else if (st.over === 'lost') { sc.losses++; sc.streak = 0; } else { sc.draws++; if (st.daily && sc.dailyDone !== day) { sc.dailyDone = day; out.shards += 10; } }
    this.s.shards += out.shards;
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
    if (!st?.trophy?.includes(id) || sc.trophyDay === day) throw new Error('Trophée indisponible.');
    sc.trophyDay = day; st.trophy = null;
    const r = this.addCard(id, 'normal', 'reward');
    this.persist();
    return r;
  }
  sceauxQuit() { this.s.sceaux.cur = null; this.persist(); }
  // Trois objectifs pour l'accueil : un proche (Descente), un de progression (gardien ou Sceaux),
  // un de collection (le royaume le plus proche d'être complet). Chacun mène à son écran.
  goals() {
    const out = [], d = this.descent(), best = d.best || 0;
    let bf = 0;
    for (let f = 5; f <= 60; f += 5) if (!this.s.bossesBeaten[bossOf(f)]) { bf = f; break; }
    if (d.run) out.push({ kind: 'run', title: `Reprends ton expédition à l’étage ${d.run.floor}`, sub: 'Ton équipe t’attend dans l’Abysse', href: '#/descente', icon: 'descend' });
    else {
      // prochain palier : un meilleur coffre ou le prochain gardien, le plus proche des deux
      const nf = CHEST_FLOORS.find((f) => f > best) || (Math.floor(best / 5) + 1) * 5;
      const target = bf && bf > best && bf < nf ? bf : nf;
      const chest = chestForDepth(target);
      const what = target === bf ? `le gardien ${BOSSES[bossOf(bf)].name} t’y attend` : `${CHESTS[chest].name.toLowerCase()} à la clé`;
      out.push({ kind: 'depth', title: best ? `Atteins l’étage ${target}` : 'Lance ta première expédition', sub: best ? `Ton record : étage ${best} · ${what}` : 'Descends dans l’Abysse : un coffre t’attend dès l’étage 3', href: '#/descente', icon: 'depth', p: Math.min(best, target), n: target });
    }
    // équipe trop faible pour la suite, et assez de cendres pour la renforcer
    const team = this.team(), need = expectedLevel(Math.max(best + 1, 4));
    const weak = team.map((id) => ({ id, lv: this.cardLevel(id) })).filter((x) => x.lv < Math.min(MAX_LEVEL, need)).sort((a, b) => a.lv - b.lv)[0];
    if (weak && this.s.ash >= this.upgradeCost(weak.id)) {
      const c = this.catalog.get(weak.id);
      out.push({ kind: 'forge', title: `Renforce ${c.name}`, sub: `Niveau ${weak.lv} · tu as ${this.s.ash} cendres, de quoi le faire monter`, href: '#/renfort', icon: 'level-up' });
    }
    if (bf && out.length < 3 && !out.some((x) => x.sub?.includes(BOSSES[bossOf(bf)].name))) { const B = BOSSES[bossOf(bf)]; out.push({ kind: 'boss', title: `Vaincs ${B.name}`, sub: `Gardien de l’étage ${bf} · son récit t’attend dans le Bestiaire`, href: '#/descente', icon: 'crest-boss' }); }
    else if (!bf && this.sceauxOpen()) {
      const i = SC.RIVALS.findIndex((r) => !this.s.sceaux.beaten[r.key]);
      if (i >= 0 && SC.rivalUnlocked(this.s, i)) out.push({ kind: 'sceaux', title: `Bats ${SC.RIVALS[i].name} aux Duels des Sceaux`, sub: `${SC.RIVALS[i].title} · première victoire : +${SC.SCEAUX_REWARD.firstWin} éclats`, href: '#/sceaux', icon: 'seal' });
    }
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
    return out.slice(0, 3);
  }
  // Forme choisie pour une carte (corrompue si débloquée et sélectionnée)
  formOf(id) { return this.s.forms?.[id] === 'corrompue' && formUnlocked(this, id) ? 'corrompue' : null; }
  setForm(id, form) {
    if (form === 'corrompue' && !formUnlocked(this, id)) throw new Error('Cette forme n’est pas encore éveillée.');
    if (this.s.descent.run) throw new Error('Termine d’abord ton expédition.');
    if (form === 'corrompue') this.s.forms[id] = 'corrompue'; else delete this.s.forms[id];
    this.persist();
  }
  // Relations rencontrées pendant un combat : elles entrent dans le Bestiaire
  learnRelations(st) {
    const out = [];
    for (const k of Object.keys(st?.relSeen || {})) if (!this.s.relations[k]) { this.s.relations[k] = Date.now(); out.push(k); }
    return out;
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
  doors() { const run = this.s.descent.run; return run ? floorDoors(run.day, run.floor) : []; }
  // Coffre rapporté si l'on remonte maintenant
  chestNow(run = this.s.descent.run) {
    if (!run || run.free) return null;
    return shiftChest(chestForDepth(run.cleared), (run.cursed ? 1 : 0) + (run.nightmare ? 1 : 0));
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
      const wk = this.weekly();
      const list = eventSwap(this.catalog, floorEnemies(this.catalog, run.day, run.floor, room), run.day, run.floor, this.event().factions);
      const hunt = room === 'elite' && run.floor >= WEEKLY_FLOOR && !wk.done;
      if (hunt) list.forEach((e) => { if (e.elite) e.id = wk.id; });
      const enemies = list.map((e) => duelUnit(this.catalog.get(e.id), { side: 'enemy', scale: sc, level: e.boss || e.elite ? lvl : enemyLevel(eff, 'fight'), boss: e.boss, elite: e.elite }));
      for (const e of enemies) {
        // combats ordinaires : des ennemis qui frappent plus fort, pour que chaque combat ait un enjeu
        if (!e.boss && !e.elite) e.atk = Math.round(e.atk * FIGHT_ATK + 0.4);
        // la créature de la semaine est une proie redoutable : plus solide et plus forte qu'une élite
        if (hunt && e.elite && e.id === wk.id) { e.maxHp = Math.round(e.maxHp * 1.7); e.hp = e.maxHp; e.atk = Math.round(e.atk * 1.25 + 0.5); e.brkMax = 9; e.brk = 9; e.weekly = true; }
        const f = this.catalog.get(e.id)?.faction;
        if (rule.key === 'furie' && f === rule.faction) e.atk = Math.round(e.atk * 1.25 + 0.4);
        if (rule.key === 'sommeil' && f === rule.faction) { e.maxHp = Math.max(1, Math.round(e.maxHp * 0.75)); e.hp = e.maxHp; }
        if (run.nightmare) { e.maxHp = Math.round(e.maxHp * 1.35); e.hp = e.maxHp; e.atk = Math.round(e.atk * 1.25 + 0.4); }
        // Gardien éveillé (Cauchemar, ou à partir de l'étage 30) : sa phase 2 commence dès le premier tour
        if (e.boss && (run.nightmare || run.floor >= AWAKEN_AT)) e.awakened = true;
      }
      // un ennemi nommé : plus coriace, il rapporte un butin en plus
      const nm = namedFoe(run.day, run.floor, room), nf = nm && enemies.find((e) => !e.boss && !e.weekly);
      if (nf) { nf.title = nm; nf.named = true; nf.maxHp = Math.round(nf.maxHp * 1.3); nf.hp = nf.maxHp; nf.atk = Math.round(nf.atk * 1.15 + 0.4); }
      const known = {};
      enemies.forEach((e) => { if (this.knows(e.id)) known[e.id] = true; });
      run.battle = createDuel(this.runUnits(), enemies, { fervor: run.gauge || 0, ult: run.ult.key, power: run.ult.power, known, ruleMult: rule.key === 'instable' ? 1.25 : 1, boss: room === 'boss' ? bossOf(run.floor) : null, pact: room === 'fight' ? null : run.pact || null, blessings: run.blessings, discovered: this.s.weakSeen || {}, seed: this.rng ? Math.floor(this.rng() * 2 ** 31) : null, goal: this.goalFor(run, room) });
      run.room = room; run.phase = 'battle'; out.battle = true;
    }
    if (run.phase === 'cleared') this.clearFloor();
    this.persist();
    return out;
  }
  // Objectif bonus du combat : le même pour un étage donné du jour
  goalFor(run, room) {
    if (run.floor < 3 && (this.descent().best || 0) < 5) return null; // dévoilés progressivement
    const keys = Object.keys(GOALS).filter((k) => GOALS[k].rooms.includes(room));
    return keys[Math.floor(rngOf(`goal:${run.day}:${run.floor}:${room}`)() * keys.length)];
  }
  // Talents proposés après une élite : 3 couples (créature encore debout sans talent, talent), toujours les mêmes pour l'étage
  talentOffers(run) {
    const r = rngOf(`talent:${run.day}:${run.floor}`);
    const team = run.team.filter((m) => !m.fallen && !m.talent).map((m) => m.id);
    const tal = Object.keys(TALENTS).sort(() => r() - 0.5);
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
      const k = rule.key === 'sources' ? 0.6 : 0.3;
      run.team.forEach((m) => { if (!m.fallen) m.hp = Math.min(m.maxHp, m.hp + Math.ceil(m.maxHp * k)); });
    } else if (room === 'treasure') {
      out.shards = this.gainShards(15 + Math.min(run.floor, SHARD_FLOOR_CAP) * 6);
    } else if (room === 'altar') {
      run.altar = blessingChoices(run.day, run.floor, run.blessings);
      if (run.altar.length) { run.phase = 'altar'; out.altar = run.altar; }
      else { run.altar = null; run.team.forEach((m) => { if (!m.fallen) m.hp = m.maxHp; }); out.healed = true; }
    }
    this.persist();
    return out;
  }
  gainShards(n) {
    const run = this.s.descent.run;
    // DESCENT_SHARDS : part des éclats de la Descente (économie resserrée)
    const k = DESCENT_SHARDS * (run.blessings.includes('greed') ? 1.3 : 1) * (this.rule(run.day).key === 'ruee' ? 1.5 : 1) * (run.free ? 0.5 : 1) * (run.nightmare ? 1.5 : 1);
    const got = Math.round(n * k);
    run.shards += got;
    return got;
  }
  clearFloor() {
    const run = this.s.descent.run;
    run.cleared = run.floor;
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
    run.gauge = Math.min(FERVOR_CARRY, st.fervor ?? st.gauge ?? 0); // une partie de la Ferveur se garde d'un combat à l'autre (3 au plus)
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
    const out = { room, won, discovered, relNew, pact: pactUsed, report: battleReport(st, (uid) => this.catalog.get(st.units[uid]?.id)?.name || 'Une créature') };
    if (bossKey) {
      out.boss = { key: bossKey, log: (st.bossLog || []).slice(), interrupts: st.stats?.interrupts || 0, feasts: st.stats?.feasts || 0, weak: Object.keys(st.discovered || {}), first: won && !this.s.bossesBeaten[bossKey] };
      if (won) { this.s.bossesBeaten[bossKey] = this.s.bossesBeaten[bossKey] || Date.now(); }
    }
    if (!won && pactUsed === 'gardien') run.shards = 0; // le prix du Pacte du Gardien
    const wk = this.weekly();
    if (won && !wk.done && st.kills.includes(wk.id)) {
      this.s.weekly = { week: wk.week, done: true };
      out.weekly = { id: wk.id, ...this.addCard(wk.id, 'normal', 'booster') };
    }
    // gardien vaincu : une chance sur quatre qu'il rejoigne ta collection (la vraie voie vers les grandes créatures)
    if (won && room === 'boss' && !run.free) {
      const b = Object.values(st.units).find((u) => u.boss);
      if (b && this.rng() < BOSS_RECRUIT) out.recruit = { id: b.id, ...this.addCard(b.id, 'normal', 'booster') };
    }
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
      if (goal?.state === 'done') { out.goalShards = this.gainShards((3 + Math.min(run.floor, SHARD_FLOOR_CAP)) * (room === 'boss' ? 2 : 1)); run.gauge = Math.min(FERVOR_CARRY, run.gauge + 1); this.s.stats.goals = (this.s.stats.goals || 0) + 1; }
      if (room === 'elite') { const t = this.talentOffers(run); if (t.length) { run.talentOffer = t; out.talents = t; } }
      // les gardiens donnent un coffre tout de suite ; règle « Chasse aux élites » : les élites aussi
      // économie : un coffre de gardien seulement la première fois qu'on bat ce gardien
      if (!run.free && ((room === 'boss' && out.boss?.first) || hunt)) {
        const c = room === 'boss' ? shiftChest(chestForDepth(run.floor), -1) || 'bois' : 'bois';
        run.chests.push(c); out.chest = c;
      }
      // toute première victoire : un vrai cadeau (une seule fois)
      if (!this.s.stats.firstWin) { this.s.stats.firstWin = Date.now(); this.s.shards += FIRST_WIN; out.firstWin = FIRST_WIN; }
      // défis de créature : combats gagnés, ennemis achevés, gardiens achevés
      const cs = (this.s.cstats ||= {});
      run.team.filter((m) => !m.fallen).forEach((m) => { (cs[m.id] ||= {}).w = (cs[m.id].w || 0) + 1; });
      for (const [id, n] of Object.entries(st.finishedBy || {})) { (cs[id] ||= {}).k = (cs[id].k || 0) + n; (run.fin ||= {})[id] = (run.fin[id] || 0) + n; }
      for (const id of Object.keys(st.bossBy || {})) (cs[id] ||= {}).b = (cs[id].b || 0) + 1;
      out.fame = this.gainFame(run.team.filter((m) => !m.fallen).map((m) => m.id), room === 'boss' || room === 'elite' ? 2 : 1);
      run.phase = 'reward';
      run.rewards = floorRewards(run.day, run.floor, room, run.blessings);
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
    d.best = Math.max(d.best, floor);
    if (!run || !run.free) this.seasonDepth(floor);
    // une expédition commencée la veille ne compte pas pour le record ni les missions du jour
    if (!run || run.day === d.day) { d.bestToday = Math.max(d.bestToday, floor); this.track('depth', floor); }
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
    if (this.s.season.id !== id) this.s.season = { id, best: 0, claimed: [] };
    return this.s.season;
  }
  seasonDepth(floor) {
    const se = this.season(), ev = [];
    se.best = Math.max(se.best, floor);
    for (const st of SEASON_STEPS) {
      if (se.best < st.floor || se.claimed.includes(st.floor)) continue;
      se.claimed.push(st.floor);
      this.grant(st.reward);
      ev.push({ kind: 'season', floor: st.floor, name: `Saison : étage ${st.floor} atteint`, reward: st.reward });
    }
    if (ev.length) this.emit('progress', ev);
    return ev;
  }
  nextFloor() {
    const run = this.s.descent.run;
    if (!run || run.phase !== 'cleared') throw new Error('Termine d’abord cet étage.');
    if (run.team.every((m) => m.fallen)) throw new Error('Toute ton équipe est tombée : remonte à la surface.');
    run.floor++;
    run.phase = 'doors';
    this.persist();
    return run.floor;
  }
  // Fin d'expédition : coffre selon la profondeur (une qualité de moins si l'équipe tombe ;
  // en descente maudite, une de plus, mais rien si l'équipe tombe). Éclats : moitié perdue si l'équipe tombe.
  // Abandon : compte comme une défaite (moitié des éclats, coffre d'un rang plus bas, rien si maudite ; la torche reste utilisée)
  abandonPreview() {
    const run = this.s.descent.run;
    if (!run) return null;
    const chest = run.free || run.cursed ? null : shiftChest(chestForDepth(run.cleared), (run.nightmare ? 1 : 0) - 1);
    return { shards: run.cursed ? 0 : Math.floor(run.shards / 2), chest, kept: run.cursed ? 0 : run.chests.length, cursed: !!run.cursed, free: !!run.free };
  }
  abandonRun() {
    const run = this.s.descent.run;
    if (!run) throw new Error('Aucune expédition en cours.');
    run.battle = null; run.phase = 'doors'; run.altar = null; run.rewards = null; run.talentOffer = null;
    this.s.stats.abandons = (this.s.stats.abandons || 0) + 1;
    const summary = this.endRun(true);
    summary.abandoned = true;
    this.persist();
    return summary;
  }
  endRun(wiped = false) {
    const d = this.s.descent, run = d.run;
    if (!run) throw new Error('Aucune expédition en cours.');
    let chest = null;
    if (!run.free) {
      chest = shiftChest(chestForDepth(run.cleared), (run.cursed ? 1 : 0) + (run.nightmare ? 1 : 0) - (wiped ? 1 : 0));
      if (wiped && run.cursed) chest = null;
    }
    let shards = run.shards;
    if (wiped) shards = run.cursed ? 0 : Math.floor(shards / 2);
    const chests = [...(wiped && run.cursed ? [] : run.chests), ...(chest ? [chest] : [])];
    chests.forEach((c) => { this.s.chests[c] = (this.s.chests[c] || 0) + 1; });
    this.s.shards += shards;
    const summary = { wiped, floor: run.cleared, day: run.day, chests, shards, kills: run.kills, free: run.free, cursed: run.cursed, nightmare: !!run.nightmare };
    if (!run.free && run.cleared > 0 && run.bestBefore !== undefined && run.cleared > run.bestBefore) summary.record = true;
    // bilan : la créature qui a achevé le plus d'ennemis, le prochain palier de coffre, les éclats vers un booster
    const mvp = Object.entries(run.fin || {}).sort((a, b) => b[1] - a[1])[0];
    if (mvp && mvp[1] >= 2) summary.mvp = { id: mvp[0], n: mvp[1] };
    const nf = CHEST_FLOORS.find((f) => f > run.cleared);
    if (nf && !run.free) summary.nextChest = { floor: nf, chest: chestForDepth(nf) };
    summary.shardsNow = this.s.shards;
    if (run.nightmare && run.cleared > (d.bestNightmare || 0)) { d.bestNightmare = run.cleared; summary.nightmareRecord = true; }
    this.emit('descentEnd', summary);
    d.last = summary;
    d.run = null;
    this.s.xp += run.cleared * 8;
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

  // Boutique d'objets --------------------------------------------------------
  itemCount(k) { return this.s.items[k] || 0; }
  boughtToday(k) { const b = this.s.itemBuys; return b.day === today(this.clock()) ? b[k] || 0 : 0; }
  buyItem(k) {
    const it = ITEMS[k];
    if (!it) throw new Error('Objet inconnu.');
    if (it.limit && this.boughtToday(k) >= it.limit) throw new Error(`Limite atteinte : ${it.limit} par jour.`);
    if (this.s.shards < it.price) throw new Error(`Il te manque ${it.price - this.s.shards} éclats (tu en as ${this.s.shards}).`);
    this.s.shards -= it.price;
    this.s.stats.shardsSpent += it.price;
    if (it.chests) this.addChests(it.chests);
    else this.s.items[k] = this.itemCount(k) + 1;
    const day = today(this.clock());
    if (this.s.itemBuys.day !== day) this.s.itemBuys = { day };
    this.s.itemBuys[k] = (this.s.itemBuys[k] || 0) + 1;
    this.persist();
  }
  useItem(k, target = null) {
    if (!this.itemCount(k)) throw new Error('Tu n’as pas cet objet.');
    const d = this.descent();
    if (k === 'torche') { if (d.used <= 0) throw new Error('Toutes tes torches du jour sont déjà disponibles.'); d.used--; }
    else throw new Error('Objet inconnu.');
    this.s.items[k]--;
    this.persist();
  }

  setTitle(t) { if (this.s.titles.includes(t)) { this.s.title = t; this.persist(); } }
  setFrame(f) { if (this.s.frames.includes(f)) { this.s.frame = f; this.persist(); } }
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
    if (reward.chests) this.addChests(reward.chests);
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
      case 'cardLevel': return Math.max(0, ...Object.keys(this.s.collection).map((id) => this.cardLevel(id)));
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
  devTorches() { this.descent().used = 0; this.persist(); }
  devFreePacks() { this.s.freePack = { day: null }; this.persist(); }
  devMissions() { this.missions().list.forEach((x) => { x.p = x.n; }); this.persist(); }
  devItems(n = 5) { Object.keys(ITEMS).forEach((k) => { this.s.items[k] = (this.s.items[k] || 0) + n; }); this.persist(); }
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
