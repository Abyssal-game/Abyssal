// État du joueur et règles de progression. Toute modification passe par ici
// et est enregistrée immédiatement : une carte affichée est une carte sauvegardée.
import { BOOSTERS, ECONOMY, XP, LEVEL_TITLES, RARITY_ORDER, FACTION_ORDER, RARITY } from '../config.js';
import { drawBooster, cryptoRandom, currentEvent } from './boosters.js';
import { loadSave, writeSave, defaultSave, today } from './save.js';

const RI = (r) => RARITY_ORDER.indexOf(r);

export function levelFromXp(xp) {
  let level = 1, rest = xp;
  while (rest >= XP.toNext(level)) { rest -= XP.toNext(level); level++; }
  return { level, into: rest, need: XP.toNext(level) };
}

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
  }

  // Événements -------------------------------------------------------------
  on(evt, fn) { (this.listeners[evt] ||= []).push(fn); return () => { this.listeners[evt] = this.listeners[evt].filter((f) => f !== fn); }; }
  emit(evt, payload) { (this.listeners[evt] || []).forEach((f) => f(payload)); }

  persist() {
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
  canBuy(type) {
    const def = BOOSTERS[type];
    return (this.s.tickets[type] || 0) > 0 || this.s.shards >= def.price;
  }

  openBooster(type, { faction } = {}) {
    const def = BOOSTERS[type];
    if (!def) throw new Error('Booster inconnu');
    if (type === 'faction' && !FACTION_ORDER.includes(faction)) throw new Error('Choisis une faction.');
    let paidWith;
    if ((this.s.tickets[type] || 0) > 0) { this.s.tickets[type]--; paidWith = 'ticket'; }
    else if (this.s.shards >= def.price) { this.s.shards -= def.price; this.s.stats.shardsSpent += def.price; paidWith = 'shards'; }
    else throw new Error('Pas assez d’éclats.');

    const ev = this.event();
    const res = drawBooster(type, this.catalog, { rng: this.rng, pity: this.s.pity, faction, event: ev });
    this.s.pity = res.pity;
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
    if (!e) e = this.s.collection[id] = { n: 0, v: {}, first: Date.now(), isNew: true };
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
      out.ash = ECONOMY.duplicateAsh[card.rarity];
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

  claimDaily() {
    if (!this.canDailyClaim()) throw new Error('L’offrande du jour a déjà été récupérée.');
    const { streak, amount } = this.dailyAmount();
    this.s.daily = { last: today(this.clock()), streak };
    this.s.shards += amount;
    this.s.stats.daily++;
    const progress = this.checkProgress();
    this.persist();
    return { amount, streak, progress };
  }

  craftCost(id) { return ECONOMY.craftAsh[this.catalog.get(id).rarity]; }
  craft(id) {
    const c = this.catalog.get(id);
    if (this.owns(id)) throw new Error('Tu possèdes déjà cette carte.');
    const cost = ECONOMY.craftAsh[c.rarity];
    if (cost === undefined) throw new Error('Les cartes secrètes ne peuvent pas être invoquées.');
    if (this.s.ash < cost) throw new Error('Pas assez de cendres.');
    this.s.ash -= cost;
    this.s.stats.crafted++;
    const r = this.addCard(id, 'normal', 'craft');
    const progress = this.checkProgress();
    this.persist();
    return { ...r, progress };
  }

  decipher(id) {
    if (this.nameKnown(id)) throw new Error('Ce nom est déjà connu.');
    if (this.s.ash < ECONOMY.decipherAsh) throw new Error('Pas assez de cendres.');
    this.s.ash -= ECONOMY.decipherAsh;
    this.s.deciphered[id] = true;
    this.persist();
  }

  arenaResult(result) {
    const amount = ECONOMY.arena[result];
    this.s.shards += amount;
    if (result === 'win') { this.s.stats.arenaWins++; this.s.xp += XP.arenaWin; }
    else if (result === 'loss') this.s.stats.arenaLosses++;
    else this.s.stats.arenaDraws++;
    const progress = this.checkProgress();
    this.persist();
    return { amount, progress };
  }

  setTitle(t) { if (this.s.titles.includes(t)) { this.s.title = t; this.persist(); } }
  setFrame(f) { if (this.s.frames.includes(f)) { this.s.frame = f; this.persist(); } }
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
    if (reward.special) this.addCard(reward.special, 'special', 'reward');
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
      case 'daily': return this.s.stats.daily;
      case 'arena': return this.s.stats.arenaWins;
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
  replaceSave(save) { this.s = save; this.persist(); }
  bestCards(n = 3) {
    return Object.keys(this.s.collection)
      .map((id) => this.catalog.get(id))
      .filter(Boolean)
      .sort((a, b) => RI(b.rarity) - RI(a.rarity) || b.power - a.power)
      .slice(0, n);
  }
  rarityLabel(r) { return RARITY[r].name; }
}
