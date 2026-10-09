// Moteur de duel de l'Arène (prototype). Règles complètes et déterministes :
// tours, mana, pioche, invocation, attaques, capacités et passifs de faction.
// Chaque action renvoie un nouvel état ; rien ne dépend de l'interface.

export const RULES = {
  heroHp: 25,
  boardMax: 5,
  handMax: 8,
  startHand: 3,
  maxMana: 10,
  turnLimit: 40,
};

const clone = (o) => JSON.parse(JSON.stringify(o));
const abilityMap = (card) => Object.fromEntries((card.abilities || []).map((a) => [a.key, a.value ?? true]));

function makeUnit(state, card, owner) {
  const ab = abilityMap(card);
  return {
    uid: ++state.seq, id: card.id, name: card.name, faction: card.faction, owner,
    atk: card.stats.atk, hp: card.stats.hp, maxHp: card.stats.hp, def: card.stats.def, spd: card.stats.spd, mag: card.stats.mag, cost: card.stats.cost,
    ab, aegis: !!ab.aegis, elusive: !!ab.elusive, sick: !ab.charge, attacks: 0, drowned: 0, poisoned: false, bonusAtk: 0,
  };
}

const TOKEN = { id: 'TOKEN', name: 'Reste', faction: 'necrotique', abilities: [], stats: { atk: 1, hp: 2, def: 0, spd: 1, mag: 0, cost: 0 } };

export function createDuel({ decks, names = ['Toi', 'Adversaire'], heroHp = [RULES.heroHp, RULES.heroHp], rng = Math.random, cards }) {
  // decks : listes d'identifiants ; cards : Map id -> carte
  const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const state = {
    turn: 0, active: 0, seq: 0, winner: null, over: false, log: [],
    players: [0, 1].map((p) => ({ name: names[p], hp: heroHp[p], maxHp: heroHp[p], deck: shuffle(decks[p]), hand: [], board: [], mana: 0, maxMana: 0, fatigue: 0 })),
  };
  const lib = cards instanceof Map ? cards : new Map(cards.map((c) => [c.id, c]));
  state.lib = Object.fromEntries([...new Set([...decks[0], ...decks[1]])].map((id) => [id, slim(lib.get(id))]));
  state.lib.TOKEN = TOKEN;
  for (let i = 0; i < RULES.startHand; i++) { draw(state, 0); draw(state, 1); }
  draw(state, 1); // le second joueur pioche une carte de plus
  return startTurn(state, 0);
}

function slim(c) { return { id: c.id, name: c.name, faction: c.faction, rarity: c.rarity, abilities: c.abilities, stats: c.stats }; }

function log(state, text, kind = 'info') { state.log.push({ text, kind }); if (state.log.length > 60) state.log.shift(); }

function draw(state, p) {
  const pl = state.players[p];
  if (pl.deck.length === 0) {
    pl.fatigue++;
    pl.hp -= pl.fatigue;
    log(state, `${pl.name} n’a plus de cartes : ${pl.fatigue} dégât(s) d’épuisement.`, 'damage');
    return;
  }
  const id = pl.deck.shift();
  if (pl.hand.length >= RULES.handMax) { log(state, `${pl.name} a la main pleine : ${state.lib[id].name} est défaussée.`); return; }
  pl.hand.push(id);
}

function startTurn(state, p) {
  state.active = p;
  state.turn++;
  const pl = state.players[p];
  pl.maxMana = Math.min(RULES.maxMana, pl.maxMana + 1);
  pl.mana = pl.maxMana;
  draw(state, p);
  for (const u of pl.board) {
    u.sick = false;
    u.attacks = 0;
    if (u.drowned > 0) u.drowned--;
    if (u.ab.regen && u.hp < u.maxHp) { u.hp = Math.min(u.maxHp, u.hp + u.ab.regen); }
    if (u.poisoned) { u.hp -= 1; log(state, `${u.name} souffre du venin.`, 'damage'); }
  }
  resolveDeaths(state);
  checkEnd(state);
  if (state.turn > RULES.turnLimit * 2 && !state.over) {
    state.over = true;
    const [a, b] = state.players;
    state.winner = a.hp === b.hp ? 'draw' : a.hp > b.hp ? 0 : 1;
    log(state, 'Limite de tours atteinte.');
  }
  return state;
}

// Valeurs effectives -------------------------------------------------------
export function effAtk(state, u) {
  let a = u.atk + u.bonusAtk;
  if (u.faction === 'infernal' && u.hp < u.maxHp) a += 2;
  if (u.faction === 'sauvage') a += Math.min(3, state.players[u.owner].board.filter((x) => x !== u && x.faction === 'sauvage').length);
  return Math.max(0, a);
}
export function reduction(state, u) {
  let r = Math.floor(u.def / 3) + (u.ab.armor || 0);
  if (u.faction === 'artificiel') r += Math.min(2, state.players[u.owner].board.filter((x) => x !== u && x.faction === 'artificiel').length);
  return r;
}

function damageUnit(state, u, amount, source) {
  if (amount <= 0) return 0;
  if (u.aegis) { u.aegis = false; log(state, `L’Égide de ${u.name} absorbe le coup.`); return 0; }
  const dealt = Math.max(1, amount - reduction(state, u));
  u.hp -= dealt;
  if (source && source.ab.venom && u.hp > 0) u.poisoned = true;
  return dealt;
}

function damageHero(state, p, amount) {
  state.players[p].hp -= amount;
}

function resolveDeaths(state) {
  for (let guard = 0; guard < 20; guard++) {
    const dead = [];
    state.players.forEach((pl) => pl.board.forEach((u) => { if (u.hp <= 0) dead.push(u); }));
    if (!dead.length) return;
    for (const u of dead) {
      const pl = state.players[u.owner];
      pl.board = pl.board.filter((x) => x !== u);
      log(state, `${u.name} est vaincu.`, 'death');
    }
    for (const u of dead) {
      // Moisson nécrotique
      state.players.forEach((pl) => pl.board.forEach((x) => { if (x.faction === 'necrotique' && x.hp > 0) x.bonusAtk++; }));
      if (u.ab.death) {
        const foe = state.players[1 - u.owner];
        foe.board.forEach((x) => damageUnit(state, x, u.ab.death, u));
        log(state, `Dernier souffle de ${u.name} : ${u.ab.death} dégâts aux ennemis.`, 'damage');
      }
      if (u.ab.relic) {
        const pl = state.players[u.owner];
        if (pl.board.length < RULES.boardMax) { pl.board.push(makeUnit(state, TOKEN, u.owner)); log(state, `${u.name} laisse un Reste.`); }
      }
    }
  }
}

function checkEnd(state) {
  const [a, b] = state.players;
  if (a.hp <= 0 || b.hp <= 0) {
    state.over = true;
    state.winner = a.hp <= 0 && b.hp <= 0 ? 'draw' : a.hp <= 0 ? 1 : 0;
  }
}

function dangerous(units, state) {
  return units.slice().sort((x, y) => effAtk(state, y) - effAtk(state, x) || y.hp - x.hp)[0];
}

// Actions ------------------------------------------------------------------
export function canPlay(state, p, i) {
  if (state.over || state.active !== p) return false;
  const pl = state.players[p];
  const card = state.lib[pl.hand[i]];
  return !!card && card.stats.cost <= pl.mana && pl.board.length < RULES.boardMax;
}

export function play(state0, p, i) {
  if (!canPlay(state0, p, i)) throw new Error('Invocation impossible.');
  const state = clone(state0);
  const pl = state.players[p], foe = state.players[1 - p];
  const id = pl.hand.splice(i, 1)[0];
  const card = state.lib[id];
  pl.mana -= card.stats.cost;
  const u = makeUnit(state, card, p);
  pl.board.push(u);
  log(state, `${pl.name} invoque ${u.name}.`, 'play');
  const ab = u.ab;
  if (u.faction === 'celeste') pl.board.forEach((x) => { x.poisoned = false; x.drowned = 0; if (x !== u) x.hp = Math.min(x.maxHp, x.hp + 1); });
  if (ab.bless) { pl.hp = Math.min(pl.maxHp, pl.hp + ab.bless); pl.board.forEach((x) => { if (x !== u) x.hp = Math.min(x.maxHp, x.hp + ab.bless); }); log(state, `Bénédiction : +${ab.bless} PV.`, 'heal'); }
  if (ab.command) pl.board.forEach((x) => { if (x !== u) x.bonusAtk += ab.command; });
  if (ab.strike && foe.board.length) { const t = dangerous(foe.board, state); const d = damageUnit(state, t, ab.strike, u); log(state, `Éruption : ${d} dégâts à ${t.name}.`, 'damage'); }
  if (ab.drown && foe.board.length) { const t = dangerous(foe.board, state); t.drowned = 2; log(state, `${t.name} est englouti.`); }
  if (ab.curse) { damageHero(state, 1 - p, ab.curse); log(state, `Malédiction : ${ab.curse} dégâts à ${foe.name}.`, 'damage'); }
  if (ab.cataclysm) { state.players.forEach((q) => q.board.forEach((x) => { if (x !== u) damageUnit(state, x, ab.cataclysm, u); })); log(state, `Cataclysme : ${ab.cataclysm} dégâts à toutes les créatures.`, 'damage'); }
  if (ab.omen) draw(state, p);
  resolveDeaths(state);
  checkEnd(state);
  return state;
}

export function canAttack(state, p, uid) {
  if (state.over || state.active !== p) return false;
  const u = state.players[p].board.find((x) => x.uid === uid);
  if (!u || u.sick || u.drowned > 0 || effAtk(state, u) <= 0) return false;
  return u.attacks < (u.ab.frenzy ? 2 : 1);
}

// Cibles légales : liste d'uid, et 'hero' si le héros est attaquable.
export function targets(state, p, uid) {
  const u = state.players[p].board.find((x) => x.uid === uid);
  if (!u) return [];
  const foe = state.players[1 - p];
  const visible = foe.board.filter((x) => !x.elusive && !(x.ab.fear && effAtk(state, u) <= 2));
  const guards = visible.filter((x) => x.ab.guard);
  if (guards.length) return guards.map((x) => x.uid);
  return [...visible.map((x) => x.uid), 'hero'];
}

export function attack(state0, p, uid, target) {
  if (!canAttack(state0, p, uid)) throw new Error('Cette créature ne peut pas attaquer.');
  if (!targets(state0, p, uid).includes(target)) throw new Error('Cible interdite.');
  const state = clone(state0);
  const pl = state.players[p], foe = state.players[1 - p];
  const a = pl.board.find((x) => x.uid === uid);
  a.attacks++;
  a.elusive = false;
  const atk = effAtk(state, a);
  if (target === 'hero') {
    damageHero(state, 1 - p, atk);
    if (a.ab.drain) pl.hp = Math.min(pl.maxHp, pl.hp + atk);
    log(state, `${a.name} frappe ${foe.name} : ${atk} dégâts.`, 'damage');
  } else {
    const t = foe.board.find((x) => x.uid === target);
    const first = a.ab.first || a.spd >= t.spd + 3;
    const hpBefore = t.hp;
    const dealt = damageUnit(state, t, atk, a);
    log(state, `${a.name} attaque ${t.name} : ${dealt} dégâts.`, 'damage');
    if (a.ab.drain && dealt) pl.hp = Math.min(pl.maxHp, pl.hp + dealt);
    if (a.faction === 'abyssal' && t.hp > 0 && dealt) t.drowned = Math.max(t.drowned, 2);
    if (a.faction === 'primordial' && t.hp < 0) { damageHero(state, 1 - p, -t.hp); log(state, `Écrasement : ${-t.hp} dégâts reportés sur ${foe.name}.`, 'damage'); }
    const killed = t.hp <= 0;
    if (killed && a.ab.devour) { a.atk += 1; a.maxHp += 2; a.hp += 2; log(state, `${a.name} dévore sa proie.`); }
    if (!(first && killed)) {
      const back = effAtk(state, t);
      if (back > 0 && hpBefore > 0) {
        const r = damageUnit(state, a, back, t);
        if (t.faction === 'abyssal' && a.hp > 0 && r) a.drowned = Math.max(a.drowned, 2);
        log(state, `${t.name} riposte : ${r} dégâts.`, 'damage');
      }
    }
  }
  resolveDeaths(state);
  checkEnd(state);
  return state;
}

export function endTurn(state0, p) {
  if (state0.over || state0.active !== p) throw new Error('Ce n’est pas ton tour.');
  const state = clone(state0);
  return startTurn(state, 1 - p);
}
