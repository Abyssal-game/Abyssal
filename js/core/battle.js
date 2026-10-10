// Combat au tour par tour (façon Final Fantasy X / Clair Obscur) : frise d'initiative,
// énergie, compétences tirées des capacités des cartes, parade et frappe en rythme.
// Moteur pur : l'état est un objet JSON (sauvegardé à chaque action, reprise exacte).

export const FRONT = 3;
export const MAX_ENERGY = 3;

// ——— Hasard reproductible stocké dans l'état ———
function rand(st) {
  st.seed = (st.seed + 0x6D2B79F5) | 0;
  let t = st.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ——— Compétences : une par capacité de la carte (ou un coup puissant par défaut) ———
export const SKILLS = {
  power:     { name: 'Coup puissant',      cost: 1, target: 'enemy',   desc: 'Frappe à 160 %.' },
  strike:    { name: 'Éruption',           cost: 1, target: 'enemy',   desc: 'Un jet de flammes qui ignore la défense.' },
  curse:     { name: 'Malédiction',        cost: 2, target: 'enemies', desc: 'Blesse tous les ennemis en première ligne.' },
  cataclysm: { name: 'Cataclysme',         cost: 3, target: 'enemies', desc: 'Dévaste toute la ligne ennemie.' },
  bless:     { name: 'Bénédiction',        cost: 2, target: 'allies',  desc: 'Soigne toute la première ligne.' },
  drain:     { name: 'Morsure vampirique', cost: 1, target: 'enemy',   desc: 'Frappe et récupère les PV infligés.' },
  venom:     { name: 'Crocs venimeux',     cost: 1, target: 'enemy',   desc: 'Frappe et empoisonne 3 tours.' },
  drown:     { name: 'Engloutir',          cost: 2, target: 'enemy',   desc: 'Étourdit la cible pendant son prochain tour.' },
  command:   { name: 'Cri de guerre',      cost: 2, target: 'allies',  desc: '+30 % d’attaque pour la première ligne.' },
  guard:     { name: 'Provocation',        cost: 1, target: 'self',    desc: 'Attire les coups et réduit les dégâts subis de moitié.' },
  aegis:     { name: 'Égide',              cost: 1, target: 'ally',    desc: 'Un bouclier qui annule le prochain coup.' },
  regen:     { name: 'Régénération',       cost: 1, target: 'self',    desc: 'Récupère 35 % de ses PV.' },
  frenzy:    { name: 'Frénésie',           cost: 2, target: 'enemy',   desc: 'Deux coups d’affilée.' },
  first:     { name: 'Coup éclair',        cost: 1, target: 'enemy',   desc: 'Frappe et rejoue très vite.' },
  devour:    { name: 'Dévorer',            cost: 2, target: 'enemy',   desc: 'Frappe à 150 % ; si la cible meurt, gagne en force.' },
  fear:      { name: 'Effroi',             cost: 2, target: 'enemies', desc: 'Les ennemis perdent 25 % d’attaque.' },
  elusive:   { name: 'Disparition',        cost: 1, target: 'self',    desc: 'Insaisissable jusqu’à son prochain tour.' },
  armor:     { name: 'Carapace',           cost: 1, target: 'self',    desc: 'Défense doublée pendant 2 tours.' },
  omen:      { name: 'Présage',            cost: 1, target: 'allies',  desc: '+1 énergie à toute la première ligne.' },
  charge:    { name: 'Charge',             cost: 1, target: 'enemy',   desc: 'Frappe à 140 % et rejoue vite.' },
  relic:     { name: 'Reliquat',           cost: 1, target: 'enemy',   desc: 'Frappe ; à sa mort, laissera un Reste.' },
  death:     { name: 'Souffle mortel',     cost: 2, target: 'enemy',   desc: 'Frappe à 180 %.' },
};
export function skillsOf(u) {
  const keys = Object.keys(u.abil || {}).filter((k) => SKILLS[k]);
  return (keys.length ? keys : ['power']).slice(0, 2);
}

// ——— Création ———
const tick = (u) => 100 / Math.max(1, u.spd);
export function createBattle(allies, enemies, seed = 1) {
  const st = { seed: seed | 0, now: 0, over: null, round: 0, units: {}, order: { ally: [], enemy: [] }, log: [] };
  for (const u of [...allies, ...enemies]) {
    const x = {
      uid: u.uid, id: u.id, name: u.name, rarity: u.rarity, faction: u.faction, side: u.side, remnant: !!u.remnant,
      atk: u.atk, def: u.def, spd: u.spd, maxHp: u.maxHp, hp: u.hp, abil: { ...u.abil }, energy: 1, fury: !!u.fury,
      st: { stun: 0, poison: 0, shield: u.abil.aegis ? 1 : 0, guard: 0, defend: false, hidden: u.abil.elusive ? 1 : 0, armorT: 0, atkUp: 0, fear: 0 },
      ct: 0,
    };
    x.ct = tick(x) * (0.35 + rand(st) * 0.5) * (u.abil.first || u.abil.charge ? 0.3 : 1);
    st.units[x.uid] = x;
    st.order[x.side].push(x.uid);
  }
  return st;
}

export const alive = (st, side) => st.order[side].map((id) => st.units[id]).filter((u) => u.hp > 0);
export const front = (st, side) => alive(st, side).slice(0, FRONT);
export const bench = (st, side) => alive(st, side).slice(FRONT);
const other = (side) => (side === 'ally' ? 'enemy' : 'ally');

// Prochain à jouer : le plus petit compteur parmi les premières lignes.
export function current(st) {
  if (st.over) return null;
  const list = [...front(st, 'ally'), ...front(st, 'enemy')];
  return list.sort((a, b) => a.ct - b.ct)[0] || null;
}
// Frise : les prochains tours (prévision à état constant).
export function timeline(st, n = 8) {
  const list = [...front(st, 'ally'), ...front(st, 'enemy')].map((u) => ({ uid: u.uid, ct: u.ct, t: tick(u) }));
  const out = [];
  for (let i = 0; i < n && list.length; i++) {
    list.sort((a, b) => a.ct - b.ct);
    out.push(list[0].uid);
    list[0].ct += list[0].t;
  }
  return out;
}

// Début de tour : poison, régénération, énergie, étourdissement. Renvoie les événements et
// indique si l'unité perd son tour.
export function beginTurn(st) {
  const u = current(st);
  if (!u) return { ev: [], skip: true };
  const ev = [];
  st.now = u.ct;
  u.st.defend = false;
  if (u.st.hidden) u.st.hidden--;
  if (u.st.guard) u.st.guard--;
  if (u.st.armorT) u.st.armorT--;
  if (u.st.poison) { u.st.poison--; hurt(st, null, u, Math.max(1, Math.round(u.maxHp * 0.06)), ev, 'poison'); }
  if (u.hp > 0 && u.abil.regen) heal(u, u.abil.regen + 1, ev);
  if (u.hp > 0) { u.energy = Math.min(MAX_ENERGY, u.energy + 1); }
  if (u.hp > 0 && u.st.stun) {
    u.st.stun--;
    ev.push({ t: 'stunned', u: u.uid });
    u.ct += tick(u);
    check(st);
    return { ev, skip: true };
  }
  check(st);
  return { ev, skip: u.hp <= 0 || !!st.over };
}

// ——— Effets ———
function heal(u, n, ev) {
  if (u.hp <= 0) return;
  const h = Math.min(Math.round(n), u.maxHp - u.hp);
  if (h > 0) { u.hp += h; ev.push({ t: 'heal', u: u.uid, d: h, hp: u.hp }); }
}
function hurt(st, src, tgt, amount, ev, kind = 'hit', extra = {}) {
  if (tgt.hp <= 0) return 0;
  let d = Math.max(1, Math.round(amount));
  if (kind === 'hit' || kind === 'skill') {
    if (tgt.st.shield) { tgt.st.shield = 0; ev.push({ t: 'block', u: tgt.uid }); return 0; }
    d = Math.max(1, d - (tgt.abil.armor || 0));
    if (tgt.st.defend) d = Math.ceil(d / 2);
    if (tgt.st.guard) d = Math.ceil(d * 0.6);
  }
  d = Math.min(d, tgt.hp);
  tgt.hp -= d;
  ev.push({ t: kind, a: src?.uid || null, u: tgt.uid, d, hp: tgt.hp, ...extra });
  if (tgt.hp <= 0) die(st, tgt, src, ev);
  return d;
}
function die(st, u, killer, ev) {
  ev.push({ t: 'die', u: u.uid });
  if (u.abil.death) front(st, other(u.side)).forEach((f) => hurt(st, u, f, u.abil.death * 2, ev, 'burst'));
  if (u.abil.relic && !u.remnant) {
    const r = { uid: `${u.uid}r`, id: u.id, name: 'Reste', rarity: 'C', faction: u.faction, side: u.side, remnant: true, atk: 2, def: 0, spd: 2, maxHp: 8, hp: 8, abil: {}, energy: 0, st: { stun: 0, poison: 0, shield: 0, guard: 0, defend: false, hidden: 0, armorT: 0, atkUp: 0, fear: 0 }, ct: st.now + 50 };
    st.units[r.uid] = r;
    const list = st.order[u.side];
    list.splice(list.indexOf(u.uid) + 1, 0, r.uid);
    ev.push({ t: 'summon', u: r.uid });
  }
  if (killer && killer.hp > 0 && killer.abil.devour) { killer.atk += 1; killer.maxHp += 3; killer.hp += 3; ev.push({ t: 'grow', u: killer.uid }); }
  // un remplaçant entre en première ligne : il joue un peu après
  for (const side of ['ally', 'enemy']) front(st, side).forEach((f) => { if (f.ct < st.now) f.ct = st.now + tick(f) * 0.5; });
}
function check(st) {
  if (!alive(st, 'enemy').length) st.over = 'won';
  else if (!alive(st, 'ally').length) st.over = 'lost';
}
const atkOf = (u) => u.atk * (1 + (u.st.atkUp ? 0.3 : 0)) * (u.st.fear ? 0.75 : 1);
const defOf = (u) => u.def * (u.st.armorT ? 2 : 1);
const dmg = (a, t, mult = 1, ignoreDef = false) => Math.max(1, atkOf(a) * mult - (ignoreDef ? 0 : defOf(t) * 0.35));

// Cibles valides pour une action
export function targets(st, actor, kind) {
  const foes = front(st, other(actor.side));
  if (kind === 'enemy') {
    const taunt = foes.filter((f) => f.st.guard);
    const visible = (taunt.length ? taunt : foes).filter((f) => !f.st.hidden);
    return (visible.length ? visible : foes).map((f) => f.uid);
  }
  if (kind === 'ally') return front(st, actor.side).map((f) => f.uid);
  if (kind === 'swap') return bench(st, actor.side).map((f) => f.uid);
  return [];
}

// ——— Action ———
// act : { actor, action: 'attack'|'defend'|'skill'|'item'|'swap', skill, target, item,
//         strike: 'perfect'|'good'|'miss' (frappe en rythme de l'attaquant),
//         parry:  'perfect'|'good'|'miss' (parade du défenseur) }
const STRIKE = { perfect: 1.35, good: 1.1, miss: 1 };
export function act(st, a) {
  const u = st.units[a.actor];
  const ev = [];
  if (!u || u.hp <= 0 || st.over) return ev;
  const tgt = a.target ? st.units[a.target] : null;
  const sMult = STRIKE[a.strike] || 1;
  // la parade ne concerne qu'une attaque visant un seul allié
  const parried = (t) => (t && t.side === 'ally' && u.side === 'enemy' ? a.parry : null);
  const single = (t, mult, opts = {}) => {
    if (!t || t.hp <= 0) return 0;
    const p = parried(t);
    if (p === 'perfect') {
      ev.push({ t: 'parry', u: t.uid, a: u.uid });
      hurt(st, t, u, dmg(t, u, 0.6), ev, 'hit', { counter: true });
      return 0;
    }
    const m = mult * sMult * (p === 'good' ? 0.5 : 1);
    return hurt(st, u, t, dmg(u, t, m, opts.ignoreDef), ev, opts.kind || 'hit', { crit: a.strike === 'perfect', dodge: p === 'good' });
  };
  let speed = 1;
  if (a.action === 'attack') {
    if (tgt) single(tgt, 1);
    if (u.fury && tgt && tgt.hp > 0 && rand(st) < 0.2) single(tgt, 1);
  } else if (a.action === 'defend') {
    u.st.defend = true;
    u.energy = Math.min(MAX_ENERGY, u.energy + 1);
    ev.push({ t: 'defend', u: u.uid });
    speed = 0.7;
  } else if (a.action === 'swap') {
    if (tgt && tgt.side === u.side) {
      const list = st.order[u.side];
      const i = list.indexOf(u.uid), j = list.indexOf(tgt.uid);
      [list[i], list[j]] = [list[j], list[i]];
      tgt.ct = st.now + tick(tgt) * 0.4;
      ev.push({ t: 'swap', u: u.uid, v: tgt.uid });
    }
  } else if (a.action === 'item') {
    if (tgt && a.heal) heal(tgt, tgt.maxHp * a.heal, ev);
    if (a.healAll) front(st, u.side).forEach((f) => heal(f, f.maxHp * a.healAll, ev));
    ev.push({ t: 'item', u: u.uid, item: a.item });
  } else if (a.action === 'skill') {
    const k = a.skill, sk = SKILLS[k];
    if (!sk || u.energy < sk.cost) return act(st, { ...a, action: 'attack' });
    u.energy -= sk.cost;
    ev.push({ t: 'skill', u: u.uid, name: sk.name, key: k });
    const foes = front(st, other(u.side));
    const mag = 1 + (u.abil[k] || 1) * 0.15;
    switch (k) {
      case 'power': single(tgt, 1.6); break;
      case 'strike': single(tgt, 1.3 * mag, { ignoreDef: true, kind: 'skill' }); break;
      case 'curse': foes.forEach((f) => hurt(st, u, f, dmg(u, f, 0.7 * mag * sMult), ev, 'skill')); break;
      case 'cataclysm': foes.forEach((f) => hurt(st, u, f, dmg(u, f, 1.1 * mag * sMult), ev, 'skill')); break;
      case 'bless': front(st, u.side).forEach((f) => heal(f, f.maxHp * 0.25 * mag, ev)); break;
      case 'drain': { const d = single(tgt, 1.1); if (d) heal(u, d, ev); break; }
      case 'venom': { single(tgt, 0.9); if (tgt && tgt.hp > 0) { tgt.st.poison = 3; ev.push({ t: 'status', u: tgt.uid, s: 'Poison' }); } break; }
      case 'drown': { single(tgt, 0.6); if (tgt && tgt.hp > 0) { tgt.st.stun = 1; ev.push({ t: 'status', u: tgt.uid, s: 'Étourdi' }); } break; }
      case 'command': front(st, u.side).forEach((f) => { f.st.atkUp = 1; ev.push({ t: 'status', u: f.uid, s: 'ATQ +30 %' }); }); break;
      case 'guard': u.st.guard = 2; ev.push({ t: 'status', u: u.uid, s: 'Provocation' }); break;
      case 'aegis': if (tgt) { tgt.st.shield = 1; ev.push({ t: 'status', u: tgt.uid, s: 'Égide' }); } break;
      case 'regen': heal(u, u.maxHp * 0.35, ev); break;
      case 'frenzy': single(tgt, 0.9); if (tgt && tgt.hp > 0) single(tgt, 0.9); break;
      case 'first': single(tgt, 1.1); speed = 0.45; break;
      case 'devour': single(tgt, 1.5); break;
      case 'fear': foes.forEach((f) => { f.st.fear = 1; ev.push({ t: 'status', u: f.uid, s: 'Effroi' }); }); break;
      case 'elusive': u.st.hidden = 1; ev.push({ t: 'status', u: u.uid, s: 'Insaisissable' }); break;
      case 'armor': u.st.armorT = 2; ev.push({ t: 'status', u: u.uid, s: 'Carapace' }); break;
      case 'omen': front(st, u.side).forEach((f) => { f.energy = Math.min(MAX_ENERGY, f.energy + 1); }); ev.push({ t: 'status', u: u.uid, s: '+1 énergie' }); break;
      case 'charge': single(tgt, 1.4); speed = 0.6; break;
      case 'relic': single(tgt, 1.2); break;
      case 'death': single(tgt, 1.8); break;
      default: single(tgt, 1);
    }
  }
  u.ct = Math.max(u.ct, st.now) + tick(u) * speed;
  st.round++;
  check(st);
  st.log = [...st.log, ...ev].slice(-30);
  return ev;
}

// ——— Intelligence artificielle (ennemis, et alliés en mode automatique) ———
export function plan(st, u) {
  const foes = front(st, other(u.side)), friends = front(st, u.side);
  const opts = skillsOf(u).filter((k) => u.energy >= SKILLS[k].cost);
  const pickFoe = () => {
    const ids = targets(st, u, 'enemy');
    const list = ids.map((id) => st.units[id]);
    return (rand(st) < 0.55 ? list.sort((x, y) => x.hp - y.hp)[0] : list[Math.floor(rand(st) * list.length)])?.uid;
  };
  const hurtAlly = friends.filter((f) => f.hp < f.maxHp * 0.5).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
  if (hurtAlly && opts.includes('bless')) return { actor: u.uid, action: 'skill', skill: 'bless' };
  if (u.hp < u.maxHp * 0.4 && opts.includes('regen')) return { actor: u.uid, action: 'skill', skill: 'regen' };
  if (hurtAlly && opts.includes('aegis') && !hurtAlly.st.shield) return { actor: u.uid, action: 'skill', skill: 'aegis', target: hurtAlly.uid };
  const attackSkills = opts.filter((k) => ['enemy', 'enemies'].includes(SKILLS[k].target));
  if (attackSkills.length && rand(st) < 0.65) {
    const k = attackSkills[Math.floor(rand(st) * attackSkills.length)];
    return { actor: u.uid, action: 'skill', skill: k, target: SKILLS[k].target === 'enemy' ? pickFoe() : null };
  }
  const support = opts.filter((k) => ['self', 'allies'].includes(SKILLS[k].target) && k !== 'bless' && k !== 'regen');
  if (support.length && rand(st) < 0.3) return { actor: u.uid, action: 'skill', skill: support[0] };
  if (!foes.length) return { actor: u.uid, action: 'defend' };
  return { actor: u.uid, action: 'attack', target: pickFoe() };
}

// Joue automatiquement jusqu'à la fin (simulations et tests). timing : réussite des actions en rythme.
export function autoBattle(st, { strike = 'miss', parry = 'miss', max = 400 } = {}) {
  for (let i = 0; i < max && !st.over; i++) {
    const b = beginTurn(st);
    if (b.skip || st.over) continue;
    const u = current(st);
    const p = plan(st, u);
    act(st, { ...p, strike: u.side === 'ally' ? strike : null, parry: u.side === 'enemy' ? parry : null });
  }
  if (!st.over) st.over = 'lost';
  return st;
}
