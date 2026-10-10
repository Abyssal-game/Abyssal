// État du joueur et règles de progression. Toute modification passe par ici
// et est enregistrée immédiatement : une carte affichée est une carte sauvegardée.
import { BOOSTERS, FREE_PACK, ECONOMY, XP, LEVEL_TITLES, RARITY_ORDER, FACTION_ORDER, RARITY, MISSIONS, MISSION_BONUS, FUSION, LUCK_POINTS, RITUAL, ITEMS } from '../config.js';
import { drawBooster, cryptoRandom, currentEvent, boosterOdds } from './boosters.js';
import { loadSave, writeSave, defaultSave, today } from './save.js';
import { DESCENT, makeUnit, fight, floorDoors, floorEnemies, roomLoot, blessingChoices, factionBonus, cardLevel } from './descent.js';

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
    return (this.s.tickets[type] || 0) > 0 || (type === 'standard' && this.freePack().stock > 0) || this.s.shards >= def.price;
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
    const success = this.rng() * 100 < chance;
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
    return d;
  }
  torchesLeft() { return Math.max(0, DESCENT.torches - this.descent().used); }
  isWounded(id) { return (this.s.descent.wounds[id] || 0) > this.clock().getTime(); }
  woundLeft(id) { return Math.max(0, (this.s.descent.wounds[id] || 0) - this.clock().getTime()); }
  cardLevel(id) { return cardLevel(this.s.descent.xp[id] || 0); }
  // La variante possédée qui donne le plus de puissance
  bestCombatVariant(id) {
    const e = this.entry(id);
    if (!e) return 'normal';
    return Object.keys(e.v).filter((v) => e.v[v] > 0).sort((a, b) => (DESCENT.variantBonus[b] || 0) - (DESCENT.variantBonus[a] || 0))[0] || 'normal';
  }
  teamUnits(ids, blessings = []) {
    const cards = ids.map((id) => this.catalog.get(id)).filter(Boolean);
    const fb = factionBonus(cards);
    return cards.map((c) => makeUnit(c, { level: this.cardLevel(c.id), variant: this.bestCombatVariant(c.id), bonus: c.faction === fb.faction ? fb.bonus : 0, blessings }));
  }
  setTeam(ids) {
    const list = [...new Set(ids)].filter((id) => this.owns(id)).slice(0, DESCENT.teamSize);
    this.descent().team = list;
    this.persist();
    return list;
  }
  startRun({ cursed = false } = {}) {
    const d = this.descent();
    if (d.run) throw new Error('Une expédition est déjà en cours.');
    if (this.torchesLeft() <= 0) throw new Error('Plus de torche aujourd’hui : reviens demain.');
    const team = d.team.filter((id) => this.owns(id) && !this.isWounded(id));
    if (team.length < 3) throw new Error('Il faut au moins 3 cartes en état de combattre dans ton équipe.');
    const units = this.teamUnits(team);
    d.used++;
    d.runs++;
    d.cursed = cursed;
    d.run = {
      day: d.day, floor: 1, cleared: 0, cursed, phase: 'doors', blessings: [], altar: null,
      team: units.map((u) => ({ id: u.id, variant: u.variant, hp: u.maxHp, maxHp: u.maxHp, fallen: false, xp: 0 })),
      loot: { shards: 0, ash: 0, tickets: {} },
    };
    this.persist();
    return d.run;
  }
  runUnits() {
    const run = this.s.descent.run;
    const units = this.teamUnits(run.team.map((m) => m.id), run.blessings);
    return units.map((u, i) => ({ ...u, maxHp: run.team[i].maxHp, hp: run.team[i].hp, fallen: run.team[i].fallen })).filter((u) => !u.fallen && u.hp > 0);
  }
  doors() { const run = this.s.descent.run; return run ? floorDoors(run.day, run.floor) : []; }
  addLoot(l) {
    const run = this.s.descent.run;
    const k = (run.blessings.includes('greed') ? 1.3 : 1) * (run.cursed ? DESCENT.cursedLoot : 1);
    const got = { shards: Math.round((l.shards || 0) * k), ash: Math.round((l.ash || 0) * k), tickets: l.tickets || {} };
    run.loot.shards += got.shards; run.loot.ash += got.ash;
    for (const [t, n] of Object.entries(got.tickets)) run.loot.tickets[t] = (run.loot.tickets[t] || 0) + n;
    return got;
  }
  chooseDoor(room) {
    const run = this.s.descent.run;
    if (!run || run.phase !== 'doors') throw new Error('Aucune porte à choisir.');
    if (!this.doors().includes(room)) throw new Error('Porte inconnue.');
    const out = { room };
    if (room === 'fight' || room === 'elite' || room === 'boss') {
      const allies = this.runUnits();
      const enemies = floorEnemies(this.catalog, run.day, run.floor, room);
      const res = fight(allies, enemies, this.rng);
      out.fight = { allies, enemies, events: res.events, won: res.won };
      // reporte les PV et les chutes sur l'équipe
      const byId = Object.fromEntries(res.allies.filter((u) => !u.remnant).map((u) => [u.id, u]));
      run.team.forEach((m) => {
        const u = byId[m.id];
        if (!u) return;
        m.hp = Math.max(0, u.hp);
        if (m.hp <= 0) m.fallen = true;
        else { m.xp += DESCENT.xpPerFight * (room === 'boss' ? 3 : room === 'elite' ? 2 : 1); }
      });
      if (res.won) {
        out.loot = this.addLoot(roomLoot(run.floor, room, this.rng));
        run.phase = 'cleared';
        this.track('win', 1);
      } else {
        out.lost = true;
        out.summary = this.endRun(true);
        return out;
      }
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
    const d = this.s.descent;
    d.bestToday = Math.max(d.bestToday, floor);
    d.best = Math.max(d.best, floor);
    this.track('depth', floor);
  }
  nextFloor() {
    const run = this.s.descent.run;
    if (!run || run.phase !== 'cleared') throw new Error('Termine d’abord cet étage.');
    run.floor++;
    run.phase = 'doors';
    this.persist();
    return run.floor;
  }
  // Fin d'expédition : butin (moitié perdue en cas de défaite), blessures ou pertes des cartes tombées.
  endRun(wiped = false) {
    const d = this.s.descent, run = d.run;
    if (!run) throw new Error('Aucune expédition en cours.');
    const loot = { ...run.loot, tickets: { ...run.loot.tickets } };
    if (wiped) { loot.shards = Math.floor(loot.shards / 2); loot.ash = Math.floor(loot.ash / 2); loot.tickets = {}; }
    this.s.shards += loot.shards;
    this.s.ash += loot.ash;
    for (const [t, n] of Object.entries(loot.tickets)) this.s.tickets[t] = (this.s.tickets[t] || 0) + n;
    const now = this.clock().getTime();
    const fallen = [], lostCards = [], levelUps = [];
    for (const m of run.team) {
      if (m.xp) {
        const before = this.cardLevel(m.id);
        d.xp[m.id] = (d.xp[m.id] || 0) + m.xp;
        if (this.cardLevel(m.id) > before) levelUps.push({ id: m.id, level: this.cardLevel(m.id) });
      }
      if (!m.fallen) continue;
      fallen.push(m.id);
      if (run.cursed) {
        const e = this.s.collection[m.id];
        if (!e) continue;
        const v = e.v[m.variant] > 0 ? m.variant : Object.keys(e.v).find((k) => e.v[k] > 0);
        e.v[v]--; e.n--;
        lostCards.push({ id: m.id, variant: v, gone: e.n <= 0 });
        if (e.n <= 0) {
          delete this.s.collection[m.id];
          if (this.s.avatar === m.id) this.s.avatar = null;
          this.s.showcase = this.s.showcase.filter((x) => x !== m.id);
          d.team = d.team.filter((x) => x !== m.id);
        }
      } else d.wounds[m.id] = now + DESCENT.woundHours * 3600000;
    }
    const summary = { wiped, floor: run.cleared, loot, fallen, lostCards, levelUps, cursed: run.cursed };
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
    this.s.items[k] = this.itemCount(k) + 1;
    const day = today(this.clock());
    if (this.s.itemBuys.day !== day) this.s.itemBuys = { day };
    this.s.itemBuys[k] = (this.s.itemBuys[k] || 0) + 1;
    this.persist();
  }
  useItem(k, target = null) {
    if (!this.itemCount(k)) throw new Error('Tu n’as pas cet objet.');
    const d = this.descent();
    if (k === 'baume') { if (!this.isWounded(target)) throw new Error('Cette carte n’est pas blessée.'); delete d.wounds[target]; }
    else if (k === 'elixir') { const n = Object.keys(d.wounds).filter((id) => this.isWounded(id)).length; if (!n) throw new Error('Aucune carte blessée.'); d.wounds = {}; }
    else if (k === 'torche') d.used--;
    else if (k === 'encens') { if (this.s.ritualBoost) throw new Error('Un encens brûle déjà pour ton prochain rituel.'); this.s.ritualBoost = 15; }
    else if (k === 'parchemin') { if (!this.owns(target)) throw new Error('Choisis une carte que tu possèdes.'); d.xp[target] = (d.xp[target] || 0) + 60; }
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
