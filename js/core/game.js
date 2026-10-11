// État du joueur et règles de progression. Toute modification passe par ici
// et est enregistrée immédiatement : une carte affichée est une carte sauvegardée.
import { BOOSTERS, FREE_PACK, ECONOMY, XP, LEVEL_TITLES, RARITY_ORDER, FACTION_ORDER, RARITY, MISSIONS, MISSION_BONUS, FUSION, LUCK_POINTS, RITUAL, ITEMS } from '../config.js';
import { drawBooster, cryptoRandom, currentEvent, boosterOdds } from './boosters.js';
import { loadSave, writeSave, defaultSave, today } from './save.js';
import { createBattle, autoBattle } from './battle.js';
import { DESCENT, floorDoors, floorEnemies, roomLoot, blessingChoices } from './descent.js';
import { pactOf, PACT_UNLOCK } from './pacts.js';
import { BASES, SLOT_ORDER, CHESTS, GEAR_RARITY, canUse, gearBonus, itemScore, rollChest, forgeCost, salvageValue, LEG_PITY } from './gear.js';
import { HEROES, HERO_ORDER, INVOCATIONS, makeHero, levelOf, invocationPower, enemyLevel, huntStage, HUNT_STAGES, totalXpFor } from './heroes.js';

const RI = (r) => RARITY_ORDER.indexOf(r);

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
    try { this.convertOldKeys(); } catch (e) { /* rien */ }
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
    else throw new Error('Pas assez d’éclats.');

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
    this.track('daily', 1);
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

  // Fusion de doublons -----------------------------------------------------
  // Un doublon = un exemplaire normal en plus du premier (les variantes sont gardées).
  spare(id) { const e = this.s.collection[id]; return e ? Math.max(0, (e.v.normal || 0) - 1) : 0; }
  spareCount(r) { return this.catalog.byRarity[r].reduce((a, c) => a + this.spare(c.id), 0); }
  // Retire n doublons d'une rareté (en commençant par les cartes les plus doublées).
  takeSpares(r, n, exclude = null) {
    const donors = this.catalog.byRarity[r].filter((c) => c.id !== exclude && this.spare(c.id) > 0).sort((a, b) => this.spare(b.id) - this.spare(a.id));
    const used = [];
    let left = n;
    while (left > 0 && donors.some((c) => this.spare(c.id) > 0)) {
      for (const c of donors) {
        if (!left) break;
        if (!this.spare(c.id)) continue;
        const e = this.s.collection[c.id];
        e.v.normal--; e.n--; left--; used.push(c.id);
      }
    }
    return used;
  }
  fuse(r) {
    const next = FUSION.next[r];
    if (!next) throw new Error('Cette rareté ne peut pas être fusionnée.');
    if (this.spareCount(r) < FUSION.cost) throw new Error(`Il faut ${FUSION.cost} doublons.`);
    const used = this.takeSpares(r, FUSION.cost);
    const pool = this.catalog.byRarity[next];
    const weights = pool.map((c) => (this.owns(c.id) ? 1 : FUSION.unownedWeight));
    let x = this.rng() * weights.reduce((a, b) => a + b, 0);
    let pick = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) { x -= weights[i]; if (x < 0) { pick = pool[i]; break; } }
    const r2 = this.addCard(pick.id, 'normal', 'fusion');
    this.s.stats.fused++;
    this.track('fuse', 1);
    const progress = this.checkProgress();
    this.persist();
    return { id: pick.id, used, ...r2, progress };
  }

  // Rituel d'élévation -----------------------------------------------------
  ritualTarget(id, from) {
    const card = this.catalog.get(id);
    const i = RITUAL.ladder.indexOf(from);
    if (i < 0) return null;
    return RITUAL.ladder.slice(i + 1).find((v) => card.variants.includes(v)) || null;
  }
  ritualSpare(r, id) { return this.spareCount(r) - (this.catalog.get(id).rarity === r ? this.spare(id) : 0); }
  ritualChance(id, from, offer = {}, forbidden = false) {
    const to = this.ritualTarget(id, from);
    if (!to) return 0;
    const card = this.catalog.get(id);
    const pts = Object.entries(offer).reduce((a, [r, n]) => a + (RITUAL.points[r] || 0) * (n || 0), 0);
    if (!pts) return 0;
    let c = pts * RITUAL.perPoint[to] * RITUAL.rarityMult[card.rarity] + (this.s.fervor[`${id}:${to}`] || 0) * RITUAL.fervor + (this.s.ritualBoost || 0);
    c = forbidden ? Math.min(RITUAL.forbiddenCap, c * RITUAL.forbiddenMult) : Math.min(RITUAL.cap, c);
    return Math.round(c * 10) / 10;
  }
  ritual(id, from, offer = {}, forbidden = false) {
    const e = this.s.collection[id];
    if (!e || !(e.v[from] > 0)) throw new Error('Tu ne possèdes pas cette carte dans cette version.');
    const to = this.ritualTarget(id, from);
    if (!to) throw new Error('Cette carte ne peut plus être élevée.');
    for (const [r, n] of Object.entries(offer)) if (n > this.ritualSpare(r, id)) throw new Error('Pas assez de doublons pour cette offrande.');
    const chance = this.ritualChance(id, from, offer, forbidden);
    if (!chance) throw new Error('Choisis au moins une offrande.');
    const used = Object.entries(offer).flatMap(([r, n]) => (n ? this.takeSpares(r, n, id) : []));
    const success = (this.s.settings.dev && this.s.devRitual) || this.rng() * 100 < chance;
    this.s.ritualBoost = 0;
    const key = `${id}:${to}`;
    let lost = false;
    this.s.stats.rituals++;
    this.track('ritual', 1);
    if (success) {
      e.v[from]--; e.v[to] = (e.v[to] || 0) + 1; e.isNew = true;
      delete this.s.fervor[key];
      this.s.stats.ritualsWon++;
      this.s.xp += 30;
    } else {
      this.s.fervor[key] = (this.s.fervor[key] || 0) + 1;
      if (forbidden) {
        e.v[from]--; e.n--;
        if (e.n <= 0) {
          lost = true;
          delete this.s.collection[id];
          if (this.s.avatar === id) this.s.avatar = null;
          this.s.showcase = this.s.showcase.filter((x) => x !== id);
        }
      }
    }
    const progress = this.checkProgress();
    this.persist();
    return { success, chance, to, used, lost, progress };
  }

  // La Descente -------------------------------------------------------------
  descent() {
    const d = this.s.descent;
    const day = today(this.clock());
    if (d.day !== day) { d.day = day; d.used = 0; d.bestToday = 0; }
    if ((d.best || 0) >= 3 && HERO_ORDER.some((k) => !this.s.heroes[k] && HEROES[k].unlock <= d.best)) this.unlockHeroes();
    // expédition de l'ancien système (cartes au combat) : on la clôt en rendant tout le butin
    if (d.run && d.run.v !== 2) {
      const l = d.run.loot || {};
      this.s.shards += l.shards || 0; this.s.ash += l.ash || 0;
      for (const [t, n] of Object.entries(l.tickets || {})) this.s.tickets[t] = (this.s.tickets[t] || 0) + n;
      d.run = null;
    }
    return d;
  }
  torchesLeft() { return Math.max(0, DESCENT.torches - this.descent().used); }

  // Héros
  hero(key) { return (this.s.heroes[key] ||= { xp: 0, wound: 0 }); }
  heroLevel(key) { return levelOf(this.hero(key).xp).level; }
  heroInfo(key) { return levelOf(this.hero(key).xp); }
  heroWounded(key) { return (this.hero(key).wound || 0) > this.clock().getTime(); }
  woundLeft(key) { return Math.max(0, (this.hero(key).wound || 0) - this.clock().getTime()); }
  ownedHeroes() { return HERO_ORDER.filter((k) => this.s.heroes[k]); }
  // Nouveaux héros : ils rejoignent l'Antre quand le record de profondeur atteint leur étage.
  // Ils arrivent avec un niveau proche de celui de l'équipe, pour être jouables tout de suite.
  unlockHeroes() {
    const best = this.s.descent.best || 0, got = [];
    for (const k of HERO_ORDER) {
      const need = HEROES[k].unlock;
      if (this.s.heroes[k] || !need || best < need) continue;
      const lv = Math.max(1, Math.round(this.s.party.reduce((a, h) => a + this.heroLevel(h), 0) / Math.max(1, this.s.party.length)) - 1);
      this.s.heroes[k] = { xp: totalXpFor(lv), wound: 0 };
      got.push(k);
    }
    if (got.length) this.s.heroNews = [...(this.s.heroNews || []), ...got];
    return got;
  }
  takeHeroNews() { const n = this.s.heroNews || []; if (n.length) { this.s.heroNews = []; this.persist(); } return n; }
  setParty(keys) {
    const list = [...new Set(keys)].filter((k) => this.s.heroes[k]).slice(0, DESCENT.teamSize);
    this.s.party = list;
    this.persist();
    return list;
  }
  heroUnit(key, blessings = []) { return makeHero(key, { level: this.heroLevel(key), wounded: this.heroWounded(key), blessings, gear: this.gearOf(key), pact: this.pactFor(key) }); }

  // Pactes : une carte possédée liée à un héros (une carte par héros, un héros par carte)
  pactsOpen() { return (this.s.descent.best || 0) >= PACT_UNLOCK; }
  pactCard(hero) { const id = this.s.pacts?.[hero]; return id && this.owns(id) ? this.catalog.get(id) : null; }
  pactFor(hero) { return this.pactsOpen() ? pactOf(this.pactCard(hero)) : null; }
  pactHolder(id) { return Object.keys(this.s.pacts || {}).find((h) => this.s.pacts[h] === id) || null; }
  setPact(hero, id) {
    if (this.s.descent.run) throw new Error('Termine d’abord ton expédition pour changer de pacte.');
    if (!this.pactsOpen()) throw new Error(`Les pactes se débloquent en atteignant l’étage ${PACT_UNLOCK} de la Descente.`);
    if (!this.s.heroes[hero]) throw new Error('Héros inconnu.');
    if (id && !this.owns(id)) throw new Error('Tu ne possèdes pas cette carte.');
    this.s.pacts ||= {};
    const other = id && this.pactHolder(id);
    if (other) delete this.s.pacts[other];
    if (id) this.s.pacts[hero] = id; else delete this.s.pacts[hero];
    this.persist();
  }
  // Connaissance d'un ennemi : posséder sa carte (+10 %) et le maîtriser à la chasse (+10 %), plafonné à +20 %.
  knowledge(id) { return Math.min(0.2, (this.owns(id) ? 0.1 : 0) + (this.huntKills(id) >= HUNT_STAGES[2].k ? 0.1 : 0)); }

  // L'Arsenal : équipement des héros, coffres, clés, forge ----------------------
  arsenal() {
    const a = this.s.arsenal;
    for (const k of ['items', 'eq', 'chests', 'keys']) if (!a[k] || typeof a[k] !== 'object') a[k] = {};
    return a;
  }
  gearItem(id) { return this.arsenal().items[id] || null; }
  equipped(hero) { return (this.arsenal().eq[hero] ||= {}); }
  equippedItems(hero) { const e = this.equipped(hero); return SLOT_ORDER.map((sl) => e[sl] && this.gearItem(e[sl])).filter(Boolean); }
  gearOf(hero) { return gearBonus(this.equippedItems(hero)); }
  wearer(id) {
    for (const [h, e] of Object.entries(this.arsenal().eq)) for (const sl of SLOT_ORDER) if (e[sl] === id) return h;
    return null;
  }
  // Puissance indicative d'un héros (niveau + équipement)
  heroPower(hero) { return this.heroLevel(hero) * 10 + this.equippedItems(hero).reduce((a, it) => a + itemScore(it), 0); }
  chestCount(type) { return this.arsenal().chests[type] || 0; }
  keyCount(k) { return this.arsenal().keys[k] || 0; }
  newGearCount() { return Object.values(this.arsenal().items).filter((it) => it.isNew).length; }
  addChests(chests = {}, keys = {}) {
    const a = this.arsenal();
    for (const [k, n] of Object.entries(chests)) if (CHESTS[k]) a.chests[k] = (a.chests[k] || 0) + n;
    // les clés n'existent plus : celles qui arrivent encore sont changées en éclats
    for (const [k, n] of Object.entries(keys || {})) this.s.shards += n * (k === 'abyssal' ? 400 : 150);
  }
  convertOldKeys() {
    const a = this.arsenal(), n = Object.entries(a.keys || {}).filter(([, v]) => v > 0);
    if (!n.length) return;
    this.addChests({}, a.keys); a.keys = {}; this.persist();
  }
  noRunLock() { if (this.s.descent.run) throw new Error('Termine d’abord ton expédition pour changer l’équipement.'); }
  equip(id, hero) {
    this.noRunLock();
    const it = this.gearItem(id);
    if (!it) throw new Error('Objet introuvable.');
    if (!this.s.heroes[hero] || !canUse(it.b, hero)) throw new Error('Ce héros ne peut pas utiliser cet objet.');
    const prev = this.wearer(id);
    const slot = BASES[it.b].slot;
    if (prev) delete this.equipped(prev)[slot];
    this.equipped(hero)[slot] = id;
    it.isNew = false;
    this.persist();
  }
  unequip(hero, slot) { this.noRunLock(); delete this.equipped(hero)[slot]; this.persist(); }
  // Équipe automatiquement le meilleur objet de chaque emplacement
  autoEquip(hero) {
    this.noRunLock();
    for (const slot of SLOT_ORDER) {
      const cur = this.equipped(hero)[slot];
      const best = Object.entries(this.arsenal().items)
        .filter(([id, it]) => BASES[it.b].slot === slot && canUse(it.b, hero) && (!this.wearer(id) || id === cur))
        .sort((x, y) => itemScore(y[1]) - itemScore(x[1]))[0];
      if (best) this.equipped(hero)[slot] = best[0];
    }
    this.persist();
  }
  pushItem(it) {
    const a = this.arsenal();
    a.seq = (a.seq || 0) + 1;
    const id = `g${a.seq}`;
    a.items[id] = { ...it, at: this.clock().getTime(), isNew: true };
    return id;
  }
  chestCtx() {
    const heroes = this.ownedHeroes();
    const eqScore = (h, slot) => { const id = this.equipped(h)[slot]; return id && this.gearItem(id) ? itemScore(this.gearItem(id)) : 0; };
    return { heroes, party: this.s.party, eqScore };
  }
  openChest(type) {
    const c = CHESTS[type], a = this.arsenal();
    if (!c) throw new Error('Coffre inconnu.');
    if (a.pending) throw new Error('Choisis d’abord ton objet dans le coffre déjà ouvert.');
    if (!this.chestCount(type)) throw new Error('Tu n’as pas ce coffre.');
    a.chests[type]--;
    const pity = type === 'bois' ? 0 : a.pity || 0;
    const { items, gotL } = rollChest(this.rng, type, this.chestCtx(), pity);
    if (type !== 'bois') a.pity = gotL ? 0 : pity + 1;
    a.opened = (a.opened || 0) + 1;
    this.track('chest', 1);
    let out;
    if (c.choice) { a.pending = { type, items }; out = { type, choice: true, items }; }
    else { const ids = items.map((it) => this.pushItem(it)); out = { type, items, ids }; }
    this.checkProgress();
    this.persist();
    return out;
  }
  // Coffre à choix : l'objet gardé rejoint l'Arsenal, les autres sont fondus en fer runique.
  chooseChestItem(i) {
    const a = this.arsenal(), p = a.pending;
    if (!p || !p.items[i]) throw new Error('Aucun objet à choisir.');
    const id = this.pushItem(p.items[i]);
    const fer = p.items.reduce((s, it, j) => s + (j === i ? 0 : GEAR_RARITY[it.r].fer), 0);
    a.fer = (a.fer || 0) + fer;
    a.pending = null;
    this.persist();
    return { id, fer };
  }
  forge(id) {
    const it = this.gearItem(id), a = this.arsenal();
    if (!it) throw new Error('Objet introuvable.');
    if (it.f >= GEAR_RARITY[it.r].forge) throw new Error('Rang de forge maximum atteint.');
    if (this.wearer(id)) this.noRunLock();
    const cost = forgeCost(it);
    if ((a.fer || 0) < cost.fer) throw new Error('Pas assez de fer runique.');
    if (this.s.shards < cost.shards) throw new Error('Pas assez d’éclats.');
    a.fer -= cost.fer;
    this.s.shards -= cost.shards;
    this.s.stats.shardsSpent += cost.shards;
    it.f++;
    this.track('forge', 1);
    this.persist();
    return it.f;
  }
  salvage(ids) {
    const a = this.arsenal();
    let fer = 0, n = 0;
    for (const id of [].concat(ids)) {
      const it = this.gearItem(id);
      if (!it || this.wearer(id)) continue;
      fer += salvageValue(it);
      delete a.items[id];
      n++;
    }
    a.fer = (a.fer || 0) + fer;
    this.persist();
    return { fer, n };
  }
  markGearSeen() { Object.values(this.arsenal().items).forEach((it) => { it.isNew = false; }); this.persist(); }

  // Invocations
  invocationUnlocked(key) {
    const u = INVOCATIONS[key]?.unlock;
    if (!u) return false;
    return !!(u.start || (u.card && this.owns(u.card)) || (u.depth && this.s.descent.best >= u.depth));
  }
  invocationLevel(key) { return levelOf(this.s.invXp[key] || 0).level; }
  invocationVariant(key) {
    const e = this.entry(INVOCATIONS[key].card);
    if (!e) return 'normal';
    return ['galaxy', 'special', 'gold', 'ancestral', 'chroma', 'corrupt', 'holo', 'alt'].find((v) => e.v[v] > 0) || 'normal';
  }
  setInvocation(key) { if (this.invocationUnlocked(key)) { this.s.invocation = key; this.persist(); } }

  // Bestiaire de chasse
  huntKills(id) { return this.s.hunt[id] || 0; }
  huntCount() { return Object.keys(this.s.hunt).length; }

  startRun({ cursed = false } = {}) {
    const d = this.descent();
    if (d.run) throw new Error('Une expédition est déjà en cours.');
    if (this.torchesLeft() <= 0) throw new Error('Plus de torche aujourd’hui : reviens demain.');
    const party = this.s.party.filter((k) => this.s.heroes[k]);
    if (party.length < DESCENT.teamSize) throw new Error(`Choisis ${DESCENT.teamSize} héros pour ton équipe.`);
    d.used++;
    d.runs++;
    d.cursed = cursed;
    const inv = this.invocationUnlocked(this.s.invocation) ? this.s.invocation : 'phenix';
    d.run = {
      v: 2, day: d.day, floor: 1, cleared: 0, cursed, phase: 'doors', blessings: [], altar: null, gauge: 0, inv, invXp: 0,
      team: party.map((k) => { const u = this.heroUnit(k); return { id: k, hp: u.maxHp, maxHp: u.maxHp, fallen: false, xp: 0 }; }),
      loot: { shards: 0, ash: 0, tickets: {}, chests: {}, keys: {} }, kills: {},
    };
    this.persist();
    return d.run;
  }
  runUnits() {
    const run = this.s.descent.run;
    return run.team.filter((m) => !m.fallen && m.hp > 0).map((m) => {
      const u = this.heroUnit(m.id, run.blessings);
      return { ...u, maxHp: m.maxHp, hp: Math.min(m.hp, m.maxHp) };
    });
  }
  // Danger estimé d'un étage (comparaison des niveaux)
  floorDanger(floor) {
    const run = this.s.descent.run;
    const team = run ? run.team.filter((m) => !m.fallen) : this.s.party.map((k) => ({ id: k }));
    const lv = team.reduce((a, m) => a + this.heroLevel(m.id), 0) / Math.max(1, team.length);
    const gap = enemyLevel(floor, 'fight') - lv;
    const hp = run ? run.team.reduce((a, m) => a + (m.fallen ? 0 : m.hp), 0) / run.team.reduce((a, m) => a + m.maxHp, 0) : 1;
    const score = gap + (1 - hp) * 6;
    return { level: enemyLevel(floor, 'fight'), heroLevel: Math.round(lv), label: score <= -2 ? 'Facile' : score <= 1 ? 'Équilibré' : score <= 4 ? 'Dangereux' : 'Mortel', score };
  }
  doors() { const run = this.s.descent.run; return run ? floorDoors(run.day, run.floor) : []; }
  addLoot(l) {
    const run = this.s.descent.run;
    const k = (run.blessings.includes('greed') ? 1.3 : 1) * (run.cursed ? DESCENT.cursedLoot : 1);
    const got = { shards: Math.round((l.shards || 0) * k), ash: Math.round((l.ash || 0) * k), tickets: l.tickets || {}, chests: l.chests || {}, keys: l.keys || {} };
    run.loot.shards += got.shards; run.loot.ash += got.ash;
    for (const [t, n] of Object.entries(got.tickets)) run.loot.tickets[t] = (run.loot.tickets[t] || 0) + n;
    run.loot.chests ||= {}; run.loot.keys ||= {};
    for (const [t, n] of Object.entries(got.chests)) run.loot.chests[t] = (run.loot.chests[t] || 0) + n;
    for (const [t, n] of Object.entries(got.keys)) run.loot.keys[t] = (run.loot.keys[t] || 0) + n;
    return got;
  }
  chooseDoor(room) {
    const run = this.s.descent.run;
    if (!run || run.phase !== 'doors') throw new Error('Aucune porte à choisir.');
    if (!this.doors().includes(room)) throw new Error('Porte inconnue.');
    const out = { room };
    if (room === 'fight' || room === 'elite' || room === 'boss') {
      // Le combat se joue au tour par tour : son état est gardé dans l'expédition (reprise exacte).
      const enemies = floorEnemies(this.catalog, run.day, run.floor, room);
      const mastery = {};
      enemies.forEach((e) => { const k = this.knowledge(e.id); if (k) mastery[e.id] = k; });
      const power = invocationPower(this.invocationLevel(run.inv));
      run.battle = createBattle(this.runUnits(), enemies, Math.floor(this.rng() * 2 ** 31), { gauge: run.gauge, invocation: { key: run.inv, power }, mastery });
      run.room = room;
      run.phase = 'battle';
      out.battle = true;
      this.persist();
      return out;
    } else if (room === 'rest') {
      run.team.forEach((m) => { if (!m.fallen) m.hp = Math.min(m.maxHp, m.hp + Math.ceil(m.maxHp * 0.4)); });
      run.phase = 'cleared';
    } else if (room === 'treasure') {
      out.loot = this.addLoot(roomLoot(run.floor, room, this.rng));
      run.phase = 'cleared';
    } else if (room === 'altar') {
      run.altar = blessingChoices(run.day, run.floor, run.blessings);
      if (run.altar.length) { run.phase = 'altar'; out.altar = run.altar; }
      else { run.altar = null; run.team.forEach((m) => { if (!m.fallen) m.hp = m.maxHp; }); run.phase = 'cleared'; out.healed = true; }
    }
    if (run.phase === 'cleared') { run.cleared = run.floor; this.recordDepth(run.floor); }
    this.persist();
    return out;
  }
  // Fin du combat : PV, chutes, expérience, Bestiaire de chasse, butin ou défaite.
  finishBattle() {
    const run = this.s.descent.run;
    if (!run || run.phase !== 'battle' || !run.battle?.over) throw new Error('Aucun combat terminé.');
    const st = run.battle, room = run.room, won = st.over === 'won';
    const heroes = Object.values(st.units).filter((u) => u.kind === 'hero');
    const xp = Math.round((12 + 4 * run.floor) * (room === 'boss' ? 2.5 : room === 'elite' ? 1.5 : 1));
    run.team.forEach((m) => {
      const u = heroes.find((h) => h.id === m.id);
      if (!u) return;
      m.hp = Math.max(0, Math.min(m.maxHp, u.hp));
      if (m.hp <= 0) m.fallen = true;
      m.xp += m.fallen ? Math.round(xp / 2) : xp;
    });
    run.gauge = st.gauge || 0;
    run.invXp += 6 + 15 * (st.invUses || 0);
    // Bestiaire de chasse
    const discovered = [];
    for (const id of st.kills) {
      if (!this.s.hunt[id]) discovered.push(id);
      const before = huntStage(this.s.hunt[id] || 0);
      this.s.hunt[id] = (this.s.hunt[id] || 0) + 1;
      run.kills[id] = (run.kills[id] || 0) + 1;
      const after = huntStage(this.s.hunt[id]);
      if (after === 3 && before < 3) { this.s.shards += 100; }
    }
    run.battle = null;
    const wiped = run.team.every((m) => m.fallen);
    const out = { room, won: won && !wiped, xp, discovered };
    if (won && !wiped) {
      out.loot = this.addLoot(roomLoot(run.floor, room, this.rng));
      run.phase = 'cleared';
      run.cleared = run.floor;
      this.recordDepth(run.floor);
      this.track('win', 1);
      this.persist();
    } else {
      out.lost = true;
      out.summary = this.endRun(true);
    }
    return out;
  }
  // Objet utilisé en plein combat (baume : 50 % des PV d'un héros ; élixir : 40 % à toute l'équipe).
  battleItem(k) {
    if (!['baume', 'elixir'].includes(k)) throw new Error('Objet inutilisable en combat.');
    if (!this.itemCount(k)) throw new Error('Tu n’as pas cet objet.');
    this.s.items[k]--;
    return k === 'baume' ? { heal: 0.5 } : { healAll: 0.4 };
  }
  // Résolution automatique d'un combat en cours (simulations, mode rapide).
  autoResolve(timing = {}) {
    const run = this.s.descent.run;
    autoBattle(run.battle, timing);
    return this.finishBattle();
  }
  chooseBlessing(key) {
    const run = this.s.descent.run;
    if (!run || run.phase !== 'altar' || !run.altar.includes(key)) throw new Error('Bénédiction indisponible.');
    run.blessings.push(key);
    if (key === 'vigor') run.team.forEach((m) => { if (!m.fallen) { m.maxHp = Math.round(m.maxHp * 1.2); m.hp = m.maxHp; } });
    run.altar = null;
    run.phase = 'cleared';
    run.cleared = run.floor;
    this.recordDepth(run.floor);
    this.persist();
  }
  recordDepth(floor) {
    const d = this.descent(), run = d.run;
    const before = d.best;
    d.best = Math.max(d.best, floor);
    if (before < PACT_UNLOCK && d.best >= PACT_UNLOCK) this.s.pactNews = true;
    this.unlockHeroes();
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
  // Fin d'expédition : butin (moitié perdue en cas de défaite, tout en descente maudite),
  // expérience des héros et de l'invocation, héros tombés affaiblis quelques heures.
  endRun(wiped = false) {
    const d = this.s.descent, run = d.run;
    if (!run) throw new Error('Aucune expédition en cours.');
    const loot = { ...run.loot, tickets: { ...run.loot.tickets }, chests: { ...(run.loot.chests || {}) }, keys: { ...(run.loot.keys || {}) } };
    if (wiped) {
      const k = run.cursed ? 0 : 0.5;
      loot.shards = Math.floor(loot.shards * k); loot.ash = Math.floor(loot.ash * k); loot.tickets = {};
      // les coffres sont perdus avec l'équipe ; les clés aussi en descente maudite
      loot.chests = {};
      if (run.cursed) loot.keys = {};
    }
    this.addChests(loot.chests, loot.keys);
    this.s.shards += loot.shards;
    this.s.ash += loot.ash;
    for (const [t, n] of Object.entries(loot.tickets)) this.s.tickets[t] = (this.s.tickets[t] || 0) + n;
    const now = this.clock().getTime();
    const fallen = [], levelUps = [];
    for (const m of run.team) {
      const h = this.hero(m.id);
      const before = levelOf(h.xp).level;
      h.xp += m.xp;
      const after = levelOf(h.xp).level;
      if (after > before) levelUps.push({ id: m.id, level: after });
      if (m.fallen) { fallen.push(m.id); h.wound = now + DESCENT.woundHours * 3600000; }
    }
    const invBefore = this.invocationLevel(run.inv);
    this.s.invXp[run.inv] = (this.s.invXp[run.inv] || 0) + run.invXp;
    const invUp = this.invocationLevel(run.inv) > invBefore ? { key: run.inv, level: this.invocationLevel(run.inv) } : null;
    const summary = { wiped, floor: run.cleared, day: run.day, loot, fallen, levelUps, invUp, kills: run.kills, cursed: run.cursed, lostCards: [] };
    this.emit('descentEnd', summary);
    d.last = summary;
    d.run = null;
    this.s.xp += run.cleared * 8;
    this.checkProgress();
    this.persist();
    return summary;
  }

  // Boutique d'objets --------------------------------------------------------
  itemCount(k) { return this.s.items[k] || 0; }
  boughtToday(k) { const b = this.s.itemBuys; return b.day === today(this.clock()) ? b[k] || 0 : 0; }
  buyItem(k) {
    const it = ITEMS[k];
    if (!it) throw new Error('Objet inconnu.');
    if (it.limit && this.boughtToday(k) >= it.limit) throw new Error(`Limite atteinte : ${it.limit} par jour.`);
    if (this.s.shards < it.price) throw new Error('Pas assez d’éclats.');
    this.s.shards -= it.price;
    this.s.stats.shardsSpent += it.price;
    if (it.arsenal) this.addChests(it.arsenal.chests, it.arsenal.keys);
    else this.s.items[k] = this.itemCount(k) + 1;
    const day = today(this.clock());
    if (this.s.itemBuys.day !== day) this.s.itemBuys = { day };
    this.s.itemBuys[k] = (this.s.itemBuys[k] || 0) + 1;
    this.persist();
  }
  useItem(k, target = null) {
    if (!this.itemCount(k)) throw new Error('Tu n’as pas cet objet.');
    const d = this.descent();
    if (k === 'baume') { if (!this.s.heroes[target] || !this.heroWounded(target)) throw new Error('Ce héros n’est pas blessé.'); this.hero(target).wound = 0; }
    else if (k === 'elixir') { const hurt = this.ownedHeroes().filter((h) => this.heroWounded(h)); if (!hurt.length) throw new Error('Aucun héros blessé.'); hurt.forEach((h) => { this.hero(h).wound = 0; }); }
    else if (k === 'torche') { if (d.used <= 0) throw new Error('Toutes tes torches du jour sont déjà disponibles.'); d.used--; }
    else if (k === 'encens') { if (this.s.ritualBoost) throw new Error('Un encens brûle déjà pour ton prochain rituel.'); this.s.ritualBoost = 15; }
    else if (k === 'parchemin') { if (!this.s.heroes[target]) throw new Error('Choisis un héros.'); this.hero(target).xp += 80; }
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
    if (reward.chests || reward.keys) this.addChests(reward.chests, reward.keys);
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
  devMaxLevels() { HERO_ORDER.forEach((k) => { this.hero(k).xp = Math.max(this.hero(k).xp, totalXpFor(20)); }); Object.keys(INVOCATIONS).forEach((k) => { this.s.invXp[k] = Math.max(this.s.invXp[k] || 0, totalXpFor(20)); }); this.persist(); }
  devArsenal() { this.addChests({ bois: 5, fer: 5, or: 3, abyssal: 3 }); this.arsenal().fer = (this.arsenal().fer || 0) + 200; this.persist(); }
  devHealAll() { HERO_ORDER.forEach((k) => { if (this.s.heroes[k]) this.s.heroes[k].wound = 0; }); this.persist(); }
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
