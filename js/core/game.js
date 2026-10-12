// État du joueur et règles de progression. Toute modification passe par ici
// et est enregistrée immédiatement : une carte affichée est une carte sauvegardée.
import { BOOSTERS, FREE_PACK, ECONOMY, XP, LEVEL_TITLES, RARITY_ORDER, FACTION_ORDER, RARITY, MISSIONS, MISSION_BONUS, LUCK_POINTS, RITUAL, ITEMS } from '../config.js';
import { drawBooster, cryptoRandom, currentEvent, boosterOdds, weekIndex } from './boosters.js';
import { loadSave, writeSave, defaultSave, today } from './save.js';
import { DESCENT, CHESTS, floorDoors, floorEnemies, floorRewards, enemyLevel, blessingChoices, dailyRule, chestForDepth, shiftChest, enemyScale, huntStage, HUNT_STAGES } from './descent.js';
import { createDuel, autoDuel, duelUnit, bossPowerOf, upgradeDuel, battleReport } from './duel.js';
import { bossOf, BOSSES } from './bosses.js';
import { pactChoices, PACTS } from './pacts.js';
import { FORMS, formUnlocked } from './forms.js';
import * as SC from './sceaux.js';
import { FERVOR_START, FERVOR_MAX } from './skills.js';
// Créature de la semaine : à partir de cet étage ; gardien vaincu : chance de le recruter
export const WEEKLY_FLOOR = 8;
export const BOSS_RECRUIT = 0.25;
import { STARTER, COST, BUDGET, TEAM, ULTS, levelFromDups, canUlt, ultOf } from './army.js';

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
  // Boosters gratuits accumulés (un toutes les FREE_PACK.everyHours, FREE_PACK.max au plus).
  freePack(now = this.clock().getTime()) {
    const per = FREE_PACK.everyHours * 3600000;
    let { stock, since } = this.s.freePack;
    if (stock < FREE_PACK.max) {
      const gained = Math.floor((now - since) / per);
      if (gained > 0) { stock = Math.min(FREE_PACK.max, stock + gained); since += gained * per; }
    }
    if (stock >= FREE_PACK.max) since = now;
    return { stock, since, nextAt: stock >= FREE_PACK.max ? null : since + per };
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
    else if (free && free.stock > 0) { this.s.freePack = { stock: free.stock - 1, since: free.since }; paidWith = 'free'; }
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
    // niveau de la créature : chaque exemplaire en plus la renforce
    out.level = levelFromDups(e.n - 1).level;
    out.levelUp = !isNewCard && levelFromDups(e.n - 2).level < out.level ? out.level : 0;
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
    // 7e jour d'affilée : un coffre de fer en plus (et ainsi de suite tous les 7 jours)
    const chest = streak % 7 === 0 ? 'fer' : null;
    if (chest) this.addChests({ [chest]: 1 });
    this.s.stats.daily++;
    this.track('daily', 1);
    const progress = this.checkProgress();
    this.persist();
    return { amount, streak, chest, progress };
  }

  craftCost(id) { return ECONOMY.craftAsh[this.catalog.get(id).rarity]; }
  craft(id) {
    const c = this.catalog.get(id);
    if (this.owns(id)) throw new Error('Tu possèdes déjà cette carte.');
    const cost = ECONOMY.craftAsh[c.rarity];
    if (cost === undefined) throw new Error('Les cartes secrètes ne peuvent pas être invoquées.');
    if (this.s.ash < cost) throw new Error(`Il te manque ${cost - this.s.ash} cendres (tu en as ${this.s.ash}). Les doublons en donnent.`);
    this.s.ash -= cost;
    this.s.stats.crafted++;
    const r = this.addCard(id, 'normal', 'craft');
    const progress = this.checkProgress();
    this.persist();
    return { ...r, progress };
  }

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
    return m.list.filter((x) => x.p >= x.n && !x.claimed).length + (!m.bonus && m.list.every((x) => x.claimed) ? 1 : 0);
  }
  claimMission(i) {
    const m = this.missions();
    if (i === 'bonus') {
      if (m.bonus || !m.list.every((x) => x.claimed)) throw new Error('Termine d’abord les trois missions.');
      m.bonus = true;
      this.grant(MISSION_BONUS);
      this.persist();
      return MISSION_BONUS;
    }
    const x = m.list[i];
    if (!x || x.claimed || x.p < x.n) throw new Error('Mission pas encore accomplie.');
    x.claimed = true;
    this.s.shards += x.shards;
    this.s.xp += 20;
    const progress = this.checkProgress();
    this.persist();
    return { shards: x.shards, progress };
  }

  // Doublons ---------------------------------------------------------------
  // Un doublon = un exemplaire normal en plus du premier (les variantes sont gardées).
  spare(id) { const e = this.s.collection[id]; return e ? Math.max(0, (e.v.normal || 0) - 1) : 0; }
  spareCount(r) { return this.catalog.byRarity[r].reduce((a, c) => a + this.spare(c.id), 0); }

  // Rituel d'élévation -----------------------------------------------------
  ritualTarget(id, from) {
    const card = this.catalog.get(id);
    const i = RITUAL.ladder.indexOf(from);
    if (i < 0) return null;
    return RITUAL.ladder.slice(i + 1).find((v) => card.variants.includes(v)) || null;
  }
  // Coût en cendres (réduit par l'ancienne ferveur et l'encens)
  ritualCost(id, from) {
    const to = this.ritualTarget(id, from);
    if (!to) return 0;
    const card = this.catalog.get(id);
    const off = Math.min(50, (this.s.fervor[`${id}:${to}`] || 0) * RITUAL.fervor) + (this.s.ritualBoost || 0);
    return Math.max(10, Math.round(RITUAL.cost[to] * RITUAL.rarityMult[card.rarity] * (1 - off / 100) / 5) * 5);
  }
  ritual(id, from) {
    const e = this.s.collection[id];
    if (!e || !(e.v[from] > 0)) throw new Error('Tu ne possèdes pas cette carte dans cette version.');
    const to = this.ritualTarget(id, from);
    if (!to) throw new Error('Cette carte ne peut plus être élevée.');
    const cost = this.ritualCost(id, from);
    if (this.s.ash < cost) throw new Error(`Il te manque ${cost - this.s.ash} cendres (tu en as ${this.s.ash}). Les doublons en donnent.`);
    this.s.ash -= cost;
    this.s.ritualBoost = 0;
    delete this.s.fervor[`${id}:${to}`];
    e.v[from]--; e.v[to] = (e.v[to] || 0) + 1; e.isNew = true;
    this.s.stats.rituals++;
    this.s.stats.ritualsWon++;
    this.s.xp += 30;
    this.track('ritual', 1);
    const progress = this.checkProgress();
    this.persist();
    return { success: true, cost, to, progress };
  }

  // L'équipe : les cartes combattent ---------------------------------------
  // Niveau d'une carte : chaque exemplaire en plus (doublon) la fait progresser.
  cardLevelInfo(id) { const e = this.entry(id); return levelFromDups(e ? e.n - 1 : 0); }
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
      if (this.uniqueCount() < TEAM.active) {
        STARTER.forEach((id) => { if (!this.owns(id)) { this.addCard(id, 'normal', 'reward'); this.s.collection[id].isNew = false; } });
        t = STARTER.slice(); // rôles complémentaires, dans le bon ordre
      } else t = this.autoTeam(t);
    }
    if (t.join() !== (this.s.team || []).join()) { this.s.team = t; this.persist(); }
    return t;
  }
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

  startRun({ cursed = false } = {}) {
    const d = this.descent();
    if (d.run) throw new Error('Une expédition est déjà en cours.');
    const team = this.team();
    if (team.length < TEAM.active) throw new Error(`Il faut au moins ${TEAM.active} créatures dans ton équipe.`);
    const free = this.torchesLeft() <= 0; // après les torches du jour : on peut rejouer, sans coffre
    if (!free) d.used++;
    d.runs = (d.runs || 0) + 1;
    const ult = this.ultimate(team);
    d.run = {
      v: 3, day: d.day, floor: 1, cleared: 0, phase: 'doors', cursed: cursed && !free, free, blessings: [], altar: null,
      gauge: this.rule(d.day).key === 'lune' ? FERVOR_MAX - 2 : FERVOR_START, ult: { key: ult.key, power: ult.power, card: ult.card },
      team: team.map((id) => { const u = duelUnit(this.catalog.get(id), { level: this.cardLevel(id), form: this.formOf(id) }); return { id, hp: u.maxHp, maxHp: u.maxHp, fallen: false, form: this.formOf(id) }; }),
      shards: 0, chests: [], kills: {},
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
  sceauxUnlocked() { return SC.RIVALS.filter((_, i) => SC.rivalUnlocked(this.s, i)).length; }
  sceauxDaily() { return SC.dailyChallenge(today(this.clock()), this.sceauxUnlocked()); }
  sceauxStart({ rival, daily = false } = {}) {
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
    const m = SC.aiMove(this.catalog, st, SC.RIVAL[st.rival].level, this.rng);
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
    const R = SC.RIVAL[st.rival];
    const out = { result: st.over, shards: 0, first: false, title: null, daily: st.daily, capped: false };
    if (st.over === 'won') {
      sc.wins++; sc.streak++; sc.best = Math.max(sc.best, sc.streak);
      if (!sc.beaten[R.key]) { sc.beaten[R.key] = Date.now(); out.first = true; out.shards += SC.SCEAUX_REWARD.firstWin; }
      if (st.daily && sc.dailyDone !== day) { sc.dailyDone = day; out.shards += SC.SCEAUX_REWARD.daily; }
      if (sc.paidToday < SC.SCEAUX_REWARD.dailyPaid) { sc.paidToday++; out.shards += R.reward; } else out.capped = true;
      const t = SC.SCEAUX_TITLES[R.key] || (sc.wins === 1 ? SC.SCEAUX_TITLES.initie : null);
      if (t && !this.s.titles.includes(t)) { this.s.titles.push(t); out.title = t; }
      if (R.key === 'echo' && !this.s.frames.includes('sceaux')) { this.s.frames.push('sceaux'); out.frame = 'sceaux'; }
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
  sceauxQuit() { this.s.sceaux.cur = null; this.persist(); }
  // Trois objectifs pour l'accueil : un proche (Descente), un de progression (gardien ou Sceaux),
  // un de collection (le royaume le plus proche d'être complet). Chacun mène à son écran.
  goals() {
    const out = [], d = this.descent(), best = d.best || 0;
    if (d.run) out.push({ kind: 'run', title: `Reprends ton expédition à l’étage ${d.run.floor}`, sub: 'Ton équipe t’attend dans l’Abysse', href: '#/descente', icon: 'descend' });
    else {
      const target = best < 3 ? 3 : (Math.floor(best / 5) + 1) * 5;
      const chest = target >= 15 ? 'abyssal' : target >= 10 ? 'or' : target >= 5 ? 'fer' : 'bois';
      out.push({ kind: 'depth', title: `Atteins l’étage ${target}`, sub: best ? `Ton record : étage ${best} · ${(CHESTS[chest]?.name || 'un coffre').toLowerCase()} à la clé` : 'Ta première descente t’attend', href: '#/descente', icon: 'depth', p: Math.min(best, target), n: target });
    }
    let bf = 0;
    for (let f = 5; f <= 60; f += 5) if (!this.s.bossesBeaten[bossOf(f)]) { bf = f; break; }
    if (bf) { const B = BOSSES[bossOf(bf)]; out.push({ kind: 'boss', title: `Vaincs ${B.name}`, sub: `Gardien de l’étage ${bf} · son récit t’attend dans le Bestiaire`, href: '#/descente', icon: 'crest-boss' }); }
    else {
      const i = SC.RIVALS.findIndex((r) => !this.s.sceaux.beaten[r.key]);
      if (i >= 0 && SC.rivalUnlocked(this.s, i)) out.push({ kind: 'sceaux', title: `Bats ${SC.RIVALS[i].name} aux Duels des Sceaux`, sub: `${SC.RIVALS[i].title} · première victoire : +${SC.SCEAUX_REWARD.firstWin} éclats`, href: '#/sceaux', icon: 'seal' });
    }
    const fac = FACTION_ORDER.map((f) => ({ f, ...this.factionProgress(f) })).filter((x) => x.owned < x.total).sort((a, b) => b.owned / b.total - a.owned / a.total || (a.total - a.owned) - (b.total - b.owned))[0];
    if (fac) {
      const left = fac.total - fac.owned, name = this.catalog.faction[fac.f].name;
      out.push({ kind: 'collection', title: left === 1 ? `Plus qu’une créature pour compléter ${name}` : left <= 10 ? `Plus que ${left} créatures pour compléter ${name}` : `Complète le royaume ${name}`, sub: `${fac.owned} / ${fac.total} · une récompense t’attend au bout`, href: `#/faction/${fac.f}`, icon: 'book', faction: fac.f, p: fac.owned, n: fac.total });
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
      const u = duelUnit(this.catalog.get(m.id), { level: this.cardLevel(m.id), form: m.form || null });
      if (b.includes('blades')) u.atk += 1;
      if (b.includes('ward')) u.shield = 1;
      return { ...u, maxHp: m.maxHp, hp: Math.min(m.hp, m.maxHp) };
    });
  }
  doors() { const run = this.s.descent.run; return run ? floorDoors(run.day, run.floor) : []; }
  // Coffre rapporté si l'on remonte maintenant
  chestNow(run = this.s.descent.run) {
    if (!run || run.free) return null;
    return shiftChest(chestForDepth(run.cleared), run.cursed ? 1 : 0);
  }
  chooseDoor(room) {
    const run = this.s.descent.run;
    if (!run || run.phase !== 'doors') throw new Error('Aucune porte à choisir.');
    if (!this.doors().includes(room)) throw new Error('Porte inconnue.');
    const rule = this.rule(run.day);
    const out = { room };
    // Élite ou gardien : un Pacte de l'Abîme est proposé avant le combat (facultatif)
    if ((room === 'elite' || room === 'boss') && !run.free) {
      run.pactOffer = pactChoices(`${run.day}:${run.floor}:${room}`); run.pendingRoom = room; run.phase = 'pact';
      this.persist();
      return { room, pact: run.pactOffer };
    }
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
      const sc = enemyScale(run.floor);
      const lvl = enemyLevel(run.floor, room);
      const wk = this.weekly();
      const list = floorEnemies(this.catalog, run.day, run.floor, room);
      const hunt = room === 'elite' && run.floor >= WEEKLY_FLOOR && !wk.done;
      if (hunt) list.forEach((e) => { if (e.elite) e.id = wk.id; });
      const enemies = list.map((e) => duelUnit(this.catalog.get(e.id), { side: 'enemy', scale: sc, level: e.boss || e.elite ? lvl : enemyLevel(run.floor, 'fight'), boss: e.boss, elite: e.elite }));
      for (const e of enemies) {
        // la créature de la semaine est une proie redoutable : plus solide et plus forte qu'une élite
        if (hunt && e.elite && e.id === wk.id) { e.maxHp = Math.round(e.maxHp * 1.7); e.hp = e.maxHp; e.atk = Math.round(e.atk * 1.25 + 0.5); e.brkMax = 9; e.brk = 9; e.weekly = true; }
        const f = this.catalog.get(e.id)?.faction;
        if (rule.key === 'furie' && f === rule.faction) e.atk = Math.round(e.atk * 1.25 + 0.4);
        if (rule.key === 'sommeil' && f === rule.faction) { e.maxHp = Math.max(1, Math.round(e.maxHp * 0.75)); e.hp = e.maxHp; }
      }
      const known = {};
      enemies.forEach((e) => { if (this.knows(e.id)) known[e.id] = true; });
      run.battle = createDuel(this.runUnits(), enemies, { fervor: run.gauge || 0, ult: run.ult.key, power: run.ult.power, known, ruleMult: rule.key === 'instable' ? 1.25 : 1, boss: room === 'boss' ? bossOf(run.floor) : null, pact: room === 'fight' ? null : run.pact || null, blessings: run.blessings, discovered: this.s.weakSeen || {}, seed: this.rng ? Math.floor(this.rng() * 2 ** 31) : null });
      run.room = room; run.phase = 'battle'; out.battle = true;
    }
    if (run.phase === 'cleared') this.clearFloor();
    this.persist();
    return out;
  }
  // Bonus choisi après une victoire : source (soin), autel (bénédiction) ou trésor (éclats)
  chooseReward(room) {
    const run = this.s.descent.run;
    if (!run || run.phase !== 'reward' || !(run.rewards || []).includes(room)) throw new Error('Bonus indisponible.');
    const rule = this.rule(run.day);
    const out = { room };
    run.rewardsBak = run.rewards; // pour revenir en arrière depuis l'autel
    run.rewards = null;
    run.phase = 'cleared';
    if (room === 'rest') {
      const k = rule.key === 'sources' ? 0.6 : 0.3;
      run.team.forEach((m) => { if (!m.fallen) m.hp = Math.min(m.maxHp, m.hp + Math.ceil(m.maxHp * k)); });
    } else if (room === 'treasure') {
      out.shards = this.gainShards(15 + run.floor * 6);
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
    const k = (run.blessings.includes('greed') ? 1.3 : 1) * (this.rule(run.day).key === 'ruee' ? 1.5 : 1) * (run.free ? 0.5 : 1);
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
    run.gauge = st.fervor ?? st.gauge ?? 0; // la Ferveur se garde d'un combat à l'autre
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
    if (won) {
      const hunt = room === 'elite' && this.rule(run.day).key === 'chasse';
      out.shards = this.gainShards((8 + 3 * run.floor) * (room === 'boss' ? 3 : room === 'elite' ? 2 : 1) * (hunt ? 2 : 1));
      // les gardiens donnent un coffre tout de suite ; règle « Chasse aux élites » : les élites aussi
      if (!run.free && (room === 'boss' || hunt)) {
        const c = room === 'boss' ? chestForDepth(run.floor) : 'bois';
        run.chests.push(c); out.chest = c;
      }
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
    // une expédition commencée la veille ne compte pas pour le record ni les missions du jour
    if (!run || run.day === d.day) { d.bestToday = Math.max(d.bestToday, floor); this.track('depth', floor); }
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
  endRun(wiped = false) {
    const d = this.s.descent, run = d.run;
    if (!run) throw new Error('Aucune expédition en cours.');
    let chest = null;
    if (!run.free) {
      chest = shiftChest(chestForDepth(run.cleared), (run.cursed ? 1 : 0) - (wiped ? 1 : 0));
      if (wiped && run.cursed) chest = null;
    }
    let shards = run.shards;
    if (wiped) shards = run.cursed ? 0 : Math.floor(shards / 2);
    const chests = [...(wiped && run.cursed ? [] : run.chests), ...(chest ? [chest] : [])];
    chests.forEach((c) => { this.s.chests[c] = (this.s.chests[c] || 0) + 1; });
    this.s.shards += shards;
    const summary = { wiped, floor: run.cleared, day: run.day, chests, shards, kills: run.kills, free: run.free, cursed: run.cursed };
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
        if (!e.v[v] || card.variants.includes(v) || v === 'special') continue;
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
    else if (k === 'encens') { if (this.s.ritualBoost) throw new Error('Un encens brûle déjà pour ton prochain rituel.'); this.s.ritualBoost = 15; }
    else throw new Error('Objet inconnu.');
    this.s.items[k]--;
    this.persist();
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
  devFreePacks() { this.s.freePack = { stock: FREE_PACK.max, since: Date.now() }; this.persist(); }
  devMissions() { this.missions().list.forEach((x) => { x.p = x.n; }); this.persist(); }
  devItems(n = 5) { Object.keys(ITEMS).forEach((k) => { this.s.items[k] = (this.s.items[k] || 0) + n; }); this.persist(); }
  devFloor(n) { const run = this.s.descent.run; if (!run) throw new Error('Lance d’abord une Descente.'); run.floor = Math.max(1, n); run.phase = 'doors'; this.persist(); }
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
