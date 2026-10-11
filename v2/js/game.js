// ABYSSAL v2 (prototype) : état du joueur et règles.
// Boucle : boosters → équipe de créatures → Descente → coffre plein de boosters.
// Sauvegarde séparée (abyssal.v2) : la version actuelle du jeu n'est jamais touchée.
import { TABLES, PITY, RARITY_ORDER } from '../../js/config.js';
import { rollRarity, rollVariant, cryptoRandom } from '../../js/core/boosters.js';
import { createDuel, autoDuel, duelUnit } from './duel.js';
import { DESCENT, floorDoors, floorEnemies, blessingChoices, dailyRule } from '../../js/core/descent.js';

// Bénédictions de l'autel adaptées au duel de cartes
export const BLESS2 = {
  blades: { name: 'Lames affûtées', desc: '+1 en attaque pour toutes tes créatures.' },
  vigor:  { name: 'Vigueur', desc: '+20 % de PV maximum et soin complet.' },
  ward:   { name: 'Sceau protecteur', desc: 'Chaque créature commence chaque combat avec un bouclier.' },
  greed:  { name: 'Avidité', desc: '+30 % d’éclats pour le reste de l’expédition.' },
};
// Force des créatures corrompues selon la profondeur
export const enemyScale = (floor) => 1 + 0.11 * (floor - 1);
import { today } from '../../js/core/save.js';
import { POOL, STARTER, COST, BUDGET, TEAM, MAX_LEVEL, levelFromDups, roleOf, canUlt, ultOf, ULTS } from './units.js';

export const SAVE_KEY = 'abyssal.v2';
export const PRICE = { standard: 100 };
export const FREE = { everyHours: 6, max: 3 };

// Coffres : la profondeur atteinte décide du coffre ; il contient des boosters.
export const CHESTS = {
  bois:    { name: 'Coffre de bois',  color: '#B07A45', packs: ['standard'], desc: '1 booster' },
  fer:     { name: 'Coffre de fer',   color: '#A9B6C9', packs: ['standard', 'standard'], desc: '2 boosters' },
  or:      { name: 'Coffre d’or',     color: '#F2C14E', packs: ['standard', 'premium'], desc: '2 boosters, dont 1 premium' },
  abyssal: { name: 'Coffre abyssal',  color: '#B04BFF', packs: ['premium', 'premium'], desc: '2 boosters premium, variantes plus fréquentes' },
};
export const CHEST_ORDER = ['bois', 'fer', 'or', 'abyssal'];
export const chestForDepth = (floor) => (floor >= 15 ? 'abyssal' : floor >= 10 ? 'or' : floor >= 5 ? 'fer' : floor >= 1 ? 'bois' : null);
const shiftChest = (c, n) => { const i = c ? CHEST_ORDER.indexOf(c) + n : n - 1; return i < 0 ? null : CHEST_ORDER[Math.min(CHEST_ORDER.length - 1, i)]; };

const PACKS = {
  standard: { slots: ['base', 'base', 'base', 'base', 'pcPlus'], variantMult: 1 },
  premium:  { slots: ['base', 'pcPlus', 'pcPlus', 'pcPlus', 'rPlus'], variantMult: 2 },
};

function defaults(now) {
  return {
    v: 1, createdAt: now, shards: 300, ash: 0,
    cards: {},            // id -> { n: exemplaires, v: { variante: nombre } }
    team: [],             // 5 ids : 3 au combat, 2 en réserve
    chests: { bois: 0, fer: 0, or: 0, abyssal: 0 },
    free: { stock: 2, since: now },
    pity: { sinceHR: 0, sinceM: 0 },
    seen: {},             // créatures déjà vaincues (page du bestiaire)
    descent: { day: null, used: 0, best: 0, bestToday: 0, run: null, last: null },
    tips: {}, stats: { packs: 0, runs: 0, wins: 0 },
  };
}

export class Game2 {
  constructor(catalog, storage, { rng = cryptoRandom, clock = () => new Date(), enemyCards = null } = {}) {
    this.catalog = catalog; this.storage = storage; this.rng = rng; this.clock = clock;
    this.pool = POOL.map((id) => catalog.get(id)).filter(Boolean);
    this.enemies = { cards: enemyCards || catalog.cards };
    let s = null;
    try { const t = storage.getItem(SAVE_KEY); if (t) s = JSON.parse(t); } catch (e) { s = null; }
    this.s = s && s.v ? { ...defaults(this.clock().getTime()), ...s } : this.newSave();
  }
  newSave() {
    const s = defaults(this.clock().getTime());
    STARTER.forEach((id) => { s.cards[id] = { n: 1, v: { normal: 1 } }; });
    s.team = STARTER.slice();
    return s;
  }
  persist() { try { this.storage.setItem(SAVE_KEY, JSON.stringify(this.s)); } catch (e) { /* stockage plein */ } }
  reset() { this.s = this.newSave(); this.persist(); }

  // ——— Collection et niveaux ———
  owns(id) { return !!this.s.cards[id]; }
  entry(id) { return this.s.cards[id]; }
  levelInfo(id) { const e = this.entry(id); return levelFromDups(e ? e.n - 1 : 0); }
  level(id) { return this.levelInfo(id).level; }
  ownedCards() { return this.pool.filter((c) => this.owns(c.id)); }
  // Ajoute une carte : nouvelle recrue, ou doublon qui fait monter de niveau (cendres au niveau maximum)
  addCard(id, variant = 'normal') {
    const c = this.catalog.get(id);
    const e = this.s.cards[id];
    if (!e) { this.s.cards[id] = { n: 1, v: { [variant]: 1 } }; return { id, variant, isNew: true }; }
    const before = this.level(id);
    if (before >= MAX_LEVEL) { const ash = 5 * COST[c.rarity]; this.s.ash += ash; e.v[variant] = (e.v[variant] || 0) + 1; return { id, variant, ash }; }
    e.n++; e.v[variant] = (e.v[variant] || 0) + 1;
    const after = this.level(id);
    return { id, variant, dup: true, levelUp: after > before ? after : 0, level: after };
  }

  // ——— Équipe ———
  teamCost(ids = this.s.team) { return ids.reduce((a, id) => a + (COST[this.catalog.get(id)?.rarity] || 0), 0); }
  setTeam(ids) {
    const list = [...new Set(ids)].filter((id) => this.owns(id)).slice(0, TEAM.active + TEAM.reserve);
    if (this.teamCost(list) > BUDGET) throw new Error(`Ton équipe dépasse le budget de ${BUDGET} points.`);
    if (this.s.descent.run) throw new Error('Termine d’abord ton expédition.');
    this.s.team = list;
    this.persist();
    return list;
  }
  // La carte qui porte le pouvoir ultime : la Mythique ou Secrète la plus rare de l'équipe
  ultCard(ids = this.s.team) {
    return ids.map((id) => this.catalog.get(id)).filter(canUlt).sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity))[0] || null;
  }
  ultimate(ids = this.s.team) { const c = this.ultCard(ids); const key = ultOf(c); return { key, ...ULTS[key], card: c?.id || null, power: 1 + 0.08 * ((c ? this.level(c.id) : 1) - 1) }; }

  // ——— Boosters ———
  freePack(now = this.clock().getTime()) {
    const f = this.s.free, step = FREE.everyHours * 3600000;
    if (f.stock < FREE.max) {
      const gained = Math.floor((now - f.since) / step);
      if (gained > 0) { f.stock = Math.min(FREE.max, f.stock + gained); f.since = f.stock >= FREE.max ? now : f.since + gained * step; }
    } else f.since = now;
    return { stock: f.stock, nextAt: f.stock >= FREE.max ? null : f.since + step };
  }
  drawPack(kind = 'standard') {
    const def = PACKS[kind];
    const pity = this.s.pity;
    const cards = def.slots.map((slot, i) => {
      let r = rollRarity(TABLES[slot].weights, this.rng);
      if (i === def.slots.length - 1 && pity.sinceHR + 1 >= PITY.hr && RARITY_ORDER.indexOf(r) < RARITY_ORDER.indexOf('HR')) r = 'HR';
      // rareté absente du prototype : on prend la plus proche disponible
      let list = this.pool.filter((c) => c.rarity === r);
      for (let d = 1; !list.length && d < 6; d++) list = this.pool.filter((c) => Math.abs(RARITY_ORDER.indexOf(c.rarity) - RARITY_ORDER.indexOf(r)) === d);
      const card = list[Math.floor(this.rng() * list.length)];
      return { id: card.id, variant: rollVariant(card, def.variantMult, this.rng) };
    });
    const best = Math.max(...cards.map((c) => RARITY_ORDER.indexOf(this.catalog.get(c.id).rarity)));
    pity.sinceHR = best >= RARITY_ORDER.indexOf('HR') ? 0 : pity.sinceHR + 1;
    pity.sinceM = best >= RARITY_ORDER.indexOf('M') ? 0 : pity.sinceM + 1;
    this.s.stats.packs++;
    return cards.map((c) => ({ ...c, ...this.addCard(c.id, c.variant) }));
  }
  canBuy() { return this.freePack().stock > 0 || this.s.shards >= PRICE.standard; }
  buyPack() {
    const f = this.freePack();
    if (f.stock > 0) { this.s.free.stock--; if (this.s.free.stock === FREE.max - 1) this.s.free.since = this.clock().getTime(); }
    else if (this.s.shards >= PRICE.standard) this.s.shards -= PRICE.standard;
    else throw new Error('Pas assez d’éclats.');
    const res = this.drawPack('standard');
    this.persist();
    return res;
  }
  // ——— Coffres ———
  chestCount() { return Object.values(this.s.chests).reduce((a, n) => a + n, 0); }
  openChest(type) {
    if (!(this.s.chests[type] > 0)) throw new Error('Tu n’as pas ce coffre.');
    this.s.chests[type]--;
    const packs = CHESTS[type].packs.map((k) => ({ kind: k, cards: this.drawPack(k) }));
    this.persist();
    return packs;
  }

  // ——— La Descente ———
  descent() {
    const d = this.s.descent, day = today(this.clock());
    if (d.day !== day) { d.day = day; d.used = 0; d.bestToday = 0; }
    return d;
  }
  rule(day = this.descent().run?.day || this.descent().day) { return dailyRule(day, Object.fromEntries(Object.entries(this.catalog.faction).map(([k, f]) => [k, f.name]))); }
  torchesLeft() { return Math.max(0, DESCENT.torches - this.descent().used); }
  startRun({ cursed = false } = {}) {
    const d = this.descent();
    if (d.run) throw new Error('Une expédition est déjà en cours.');
    const team = this.s.team.filter((id) => this.owns(id));
    if (team.length < TEAM.active) throw new Error(`Il faut au moins ${TEAM.active} créatures dans ton équipe.`);
    const free = this.torchesLeft() <= 0; // après les torches du jour : on peut jouer, sans coffre
    if (!free) d.used++;
    this.s.stats.runs++;
    const ult = this.ultimate(team);
    d.run = {
      day: d.day, floor: 1, cleared: 0, phase: 'doors', cursed: cursed && !free, free, blessings: [], altar: null,
      gauge: this.rule(d.day).key === 'lune' ? 50 : 0, ult: { key: ult.key, power: ult.power, card: ult.card },
      team: team.map((id) => { const u = duelUnit(this.catalog.get(id), { level: this.level(id) }); return { id, hp: u.maxHp, maxHp: u.maxHp, fallen: false }; }),
      shards: 0, chests: [], newSeen: [],
    };
    this.persist();
    return d.run;
  }
  runUnits() {
    const run = this.s.descent.run;
    const b = run.blessings;
    return run.team.filter((m) => !m.fallen).map((m) => {
      const u = duelUnit(this.catalog.get(m.id), { level: this.level(m.id) });
      if (b.includes('blades')) u.atk += 1;
      if (b.includes('ward')) u.shield = 1;
      return { ...u, maxHp: m.maxHp, hp: Math.min(m.hp, m.maxHp) };
    });
  }
  doors() { const run = this.s.descent.run; return run ? floorDoors(run.day, run.floor) : []; }
  // Coffre visé à la profondeur actuelle (affiché au joueur pour l'inciter à descendre)
  chestNow(run = this.s.descent.run) {
    if (!run || run.free) return null;
    return shiftChest(chestForDepth(run.cleared), run.cursed ? 1 : 0);
  }
  chooseDoor(room) {
    const run = this.s.descent.run;
    if (!run || run.phase !== 'doors' || !this.doors().includes(room)) throw new Error('Porte indisponible.');
    const rule = this.rule(run.day);
    const out = { room };
    if (room === 'fight' || room === 'elite' || room === 'boss') {
      // les mêmes créatures que la version actuelle, transformées en cartes de duel corrompues
      const sc = enemyScale(run.floor);
      const enemies = floorEnemies(this.enemies, run.day, run.floor, room).map((e) => duelUnit(this.catalog.get(e.id), { side: 'enemy', scale: sc, boss: e.boss, elite: e.elite }));
      for (const e of enemies) {
        const f = this.catalog.get(e.id)?.faction;
        if (rule.key === 'furie' && f === rule.faction) e.atk = Math.round(e.atk * 1.25 + 0.4);
        if (rule.key === 'sommeil' && f === rule.faction) { e.maxHp = Math.max(1, Math.round(e.maxHp * 0.75)); e.hp = e.maxHp; }
      }
      const known = {};
      enemies.forEach((e) => { if (this.owns(e.id)) known[e.id] = true; });
      const allies = this.runUnits();
      run.battle = createDuel(allies, enemies, { gauge: run.gauge, ult: run.ult.key, power: run.ult.power, known, ruleMult: rule.key === 'instable' ? 1.25 : 1 });
      run.room = room; run.phase = 'battle'; out.battle = true;
    } else if (room === 'rest') {
      const k = rule.key === 'sources' ? 0.8 : 0.4;
      run.team.forEach((m) => { if (!m.fallen) m.hp = Math.min(m.maxHp, m.hp + Math.ceil(m.maxHp * k)); });
      run.phase = 'cleared';
    } else if (room === 'treasure') {
      out.shards = this.gainShards(15 + run.floor * 6);
      run.phase = 'cleared';
    } else if (room === 'altar') {
      run.altar = blessingChoices(run.day, run.floor, run.blessings).filter((k) => BLESS2[k]).concat(Object.keys(BLESS2).filter((k) => !run.blessings.includes(k))).filter((k, i, a) => a.indexOf(k) === i).slice(0, 3);
      if (run.altar.length) { run.phase = 'altar'; out.altar = run.altar; }
      else { run.altar = null; run.phase = 'cleared'; }
    }
    if (run.phase === 'cleared') this.clearFloor();
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
    const run = this.s.descent.run, d = this.s.descent;
    run.cleared = run.floor;
    d.best = Math.max(d.best, run.floor);
    if (run.day === d.day) d.bestToday = Math.max(d.bestToday, run.floor);
  }
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
    run.gauge = st.gauge || 0;
    const discovered = [];
    for (const id of st.kills) if (!this.s.seen[id]) { this.s.seen[id] = Date.now(); discovered.push(id); run.newSeen.push(id); }
    run.battle = null;
    const won = st.over === 'won' && run.team.some((m) => !m.fallen);
    const out = { room, won, discovered };
    if (won) {
      this.s.stats.wins++;
      out.shards = this.gainShards((8 + 3 * run.floor) * (room === 'boss' ? 3 : room === 'elite' ? 2 : 1) * (room === 'elite' && this.rule(run.day).key === 'chasse' ? 2 : 1));
      // les gardiens donnent un coffre tout de suite ; règle « Chasse aux élites » : les élites aussi
      if (!run.free && (room === 'boss' || (room === 'elite' && this.rule(run.day).key === 'chasse'))) {
        const c = room === 'boss' ? chestForDepth(run.floor) : 'bois';
        run.chests.push(c); out.chest = c;
      }
      run.phase = 'cleared';
      this.clearFloor();
      this.persist();
    } else {
      out.lost = true;
      out.summary = this.endRun(true);
    }
    return out;
  }
  autoResolve() { autoDuel(this.s.descent.run.battle); return this.finishBattle(); }
  chooseBlessing(key) {
    const run = this.s.descent.run;
    if (!run || run.phase !== 'altar' || !run.altar.includes(key)) throw new Error('Bénédiction indisponible.');
    run.blessings.push(key);
    if (key === 'vigor') run.team.forEach((m) => { if (!m.fallen) { m.maxHp = Math.round(m.maxHp * 1.2); m.hp = m.maxHp; } });
    run.altar = null; run.phase = 'cleared';
    this.clearFloor();
    this.persist();
  }
  nextFloor() {
    const run = this.s.descent.run;
    if (!run || run.phase !== 'cleared') throw new Error('Termine d’abord cet étage.');
    run.floor++; run.phase = 'doors';
    this.persist();
  }
  // Fin d'expédition : coffre selon la profondeur (une qualité de moins si l'équipe tombe ;
  // en descente maudite, une de plus, mais rien si l'équipe tombe).
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
    const summary = { wiped, floor: run.cleared, chests, shards, newSeen: run.newSeen, free: run.free, cursed: run.cursed };
    d.last = summary; d.run = null;
    this.persist();
    return summary;
  }
}
export { COST, BUDGET, TEAM, roleOf };
