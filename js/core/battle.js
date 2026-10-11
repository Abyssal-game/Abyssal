// Combat au tour par tour : 3 héros contre les créatures de l'Abysse.
// Frise d'initiative, énergie, mécaniques de classe, intentions ennemies annoncées
// (dont les attaques préparées, à interrompre ou à parer) et jauge d'invocation.
// Moteur pur : l'état est un objet JSON (sauvegardé à chaque action, reprise exacte).
import { SKILLS, FAMILIES, GAUGE } from './heroes.js';

export { SKILLS };
export const FRONT = 3;
export const MAX_ENERGY = 3;

function rand(st) {
  st.seed = (st.seed + 0x6D2B79F5) | 0;
  let t = st.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const tick = (u) => (100 / Math.max(1, u.spd)) * (u.st.frozen ? 1.5 : 1);
const other = (side) => (side === 'ally' ? 'enemy' : 'ally');

// ——— Création ———
export function createBattle(heroes, enemies, seed = 1, { gauge = 0, invocation = null, mastery = {}, dmgMult = 1 } = {}) {
  const st = { seed: seed | 0, now: 0, over: null, units: {}, order: { ally: [], enemy: [] }, gauge, inv: invocation, mastery, dmgMult, log: [], kills: [] };
  for (const u of [...heroes, ...enemies]) {
    const x = JSON.parse(JSON.stringify(u));
    x.ct = tick(x) * (0.3 + rand(st) * 0.6);
    if (x.ward) x.st.shield = 1;
    st.units[x.uid] = x;
    st.order[x.side].push(x.uid);
  }
  front(st, 'enemy').forEach((e) => setIntent(st, e));
  return st;
}

export const alive = (st, side) => st.order[side].map((id) => st.units[id]).filter((u) => u.hp > 0);
export const front = (st, side) => alive(st, side).slice(0, FRONT);
export const bench = (st, side) => alive(st, side).slice(FRONT);
export function current(st) {
  if (st.over) return null;
  return [...front(st, 'ally'), ...front(st, 'enemy')].sort((a, b) => a.ct - b.ct)[0] || null;
}
export function timeline(st, n = 8) {
  const list = [...front(st, 'ally'), ...front(st, 'enemy')].map((u) => ({ uid: u.uid, ct: u.ct, t: tick(u) }));
  const out = [];
  for (let i = 0; i < n && list.length; i++) { list.sort((a, b) => a.ct - b.ct); out.push(list[0].uid); list[0].ct += list[0].t; }
  return out;
}

// ——— Intentions ennemies (affichées au joueur avant qu'elles ne frappent) ———
const pickHero = (st, how = 'random') => {
  let hs = front(st, 'ally');
  if (!hs.length) return null;
  // un héros caché dans l'ombre ne peut pas être visé (sauf s'il est seul)
  if (hs.some((h) => !h.st.stealth)) hs = hs.filter((h) => !h.st.stealth);
  const taunt = hs.filter((h) => h.st.taunt || h.st.bear);
  if (taunt.length) return taunt[0].uid;
  if (how === 'weak') return hs.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0].uid;
  return hs[Math.floor(rand(st) * hs.length)].uid;
};
export function setIntent(st, e) {
  if (e.hp <= 0) return;
  if (e.st.charging) { e.intent = { k: e.family === 'controleur' && !e.boss ? 'stunheavy' : 'heavy', t: e.intent?.t || pickHero(st) }; return; }
  const pattern = e.boss ? ['attack', 'charge', 'aoe', 'attack'] : FAMILIES[e.family].pattern;
  let k = pattern[e.turns % pattern.length];
  if (k === 'heal' && !front(st, 'enemy').some((x) => x.hp < x.maxHp * 0.7)) k = 'attack';
  e.intent = { k, t: ['attack', 'hunt', 'poison', 'charge', 'double'].includes(k) ? pickHero(st, k === 'hunt' ? 'weak' : 'random') : null };
}
// Estimation affichée (dégâts prévus) pour l'intention d'un ennemi
export function intentPreview(st, e) {
  const i = e.intent;
  if (!i) return null;
  const a = e.atk * (e.st.enraged ? 1.4 : 1) * (e.st.weak ? 0.75 : 1);
  const m = { attack: 1, hunt: 1.35, double: 1.2, poison: 0.7, heavy: 2.2, stunheavy: 1.4, aoe: 0.6 }[i.k];
  return { ...i, dmg: m ? Math.round(a * m) : 0 };
}

// ——— Effets ———
function heal(st, u, n, ev) {
  if (u.hp <= 0) return;
  const h = Math.min(Math.round(n), u.maxHp - u.hp);
  if (h > 0) { u.hp += h; ev.push({ t: 'heal', u: u.uid, d: h, hp: u.hp }); }
}
function gain(st, n) { st.gauge = Math.min(100, (st.gauge || 0) + n); }
function hurt(st, src, tgt, amount, ev, kind = 'hit', extra = {}) {
  if (tgt.hp <= 0) return 0;
  // Égide du paladin : il reçoit le coup à la place de l'allié protégé
  if (tgt.side === 'ally' && tgt.st.protectedBy && kind !== 'dot' && !extra.covered) {
    const p = st.units[tgt.st.protectedBy];
    if (p && p.hp > 0 && p.st.protecting && front(st, 'ally').includes(p)) {
      ev.push({ t: 'cover', u: p.uid, v: tgt.uid });
      const d = hurt(st, src, p, amount * 0.7, ev, kind, { ...extra, covered: true });
      p.res = Math.min(100, (p.res || 0) + d * 2);
      return d;
    }
  }
  let d = Math.max(1, Math.round(amount * (kind === 'hit' && src ? st.dmgMult || 1 : 1)));
  if (kind !== 'dot') {
    if (tgt.dodge && src && rand(st) < tgt.dodge) { ev.push({ t: 'dodge', u: tgt.uid }); return 0; }
    if (tgt.st.shield) { tgt.st.shield = 0; ev.push({ t: 'block', u: tgt.uid }); return 0; }
    d = Math.max(1, d - (tgt.armor || 0));
    if (tgt.st.defend) d = Math.ceil(d / 2);
  }
  d = Math.min(d, tgt.hp);
  // pacte céleste : survit une fois au coup fatal
  const saved = tgt.lastStand && d >= tgt.hp && tgt.hp > 1;
  if (saved) { d = tgt.hp - 1; tgt.lastStand = false; }
  tgt.hp -= d;
  ev.push({ t: kind, a: src?.uid || null, u: tgt.uid, d, hp: tgt.hp, ...extra });
  if (saved) { ev.push({ t: 'status', u: tgt.uid, s: 'Sauvé !' }); heal(st, tgt, tgt.maxHp * 0.3, ev); }
  // pacte abyssal : renvoie une partie des dégâts
  if (tgt.thorns && src && src.side !== tgt.side && src.hp > 0 && kind === 'hit' && d > 0) hurt(st, null, src, d * tgt.thorns, ev, 'dot');
  if (tgt.side === 'ally') {
    gain(st, GAUGE.hurt);
    if (tgt.id === 'brenna') tgt.res = Math.min(100, (tgt.res || 0) + 18);
  }
  if (tgt.hp <= 0) {
    ev.push({ t: 'die', u: tgt.uid });
    if (tgt.side === 'enemy') {
      st.kills.push(tgt.id);
      front(st, 'ally').forEach((h) => {
        if (h.id === 'ossian') h.res = Math.min(100, (h.res || 0) + 20);
        if (h.killEnergy) { h.energy = Math.min(MAX_ENERGY, h.energy + 1); heal(st, h, h.maxHp * 0.1, ev); }
        if (h.killHealTeam) front(st, 'ally').forEach((x) => heal(st, x, x.maxHp * h.killHealTeam, ev));
      });
    }
    if (tgt.st.protecting) front(st, 'ally').forEach((h) => { if (h.st.protectedBy === tgt.uid) h.st.protectedBy = null; });
    // un ennemi de réserve entre en ligne et annonce son intention ; une créature de réserve prend la relève
    front(st, 'enemy').forEach((e) => { if (!e.intent) setIntent(st, e); if (e.ct < st.now) e.ct = st.now + tick(e) * 0.5; });
    front(st, 'ally').forEach((h) => { if (h.ct < st.now) { h.ct = st.now + tick(h) * 0.5; if (!h.entered) { h.entered = true; ev.push({ t: 'status', u: h.uid, s: 'Entre en jeu' }); } } });
  } else if (tgt.side === 'enemy' && !tgt.st.enraged && (tgt.family === 'enrage' || tgt.boss) && tgt.hp < tgt.maxHp / 2) {
    tgt.st.enraged = true;
    ev.push({ t: 'status', u: tgt.uid, s: 'Enragé !' });
  }
  return d;
}
function check(st) {
  if (!alive(st, 'enemy').length) st.over = 'won';
  else if (!alive(st, 'ally').length) st.over = 'lost';
}
// Multiplicateur subi par une cible (marque, exposition, maîtrise du Bestiaire)
const taken = (st, t) => 1 + (t.st.mark ? 0.3 : 0) + (t.st.exposed ? 0.3 : 0) + (t.side === 'enemy' ? (st.mastery[t.id] === true ? 0.1 : st.mastery[t.id] || 0) : 0);
const defOf = (u) => u.def * (u.st.armorUp ? 1.5 : 1) * (u.st.bear ? 1.5 : 1);
const dmg = (st, base, t, mult = 1) => Math.max(1, base * mult * taken(st, t) - defOf(t) * 0.4);

// ——— Début de tour ———
export function beginTurn(st) {
  const u = current(st);
  if (!u) return { ev: [], skip: true };
  const ev = [];
  st.now = u.ct;
  u.st.defend = false;
  for (const k of ['mark', 'exposed', 'taunt', 'armorUp', 'inspired', 'weak', 'bear']) if (u.st[k]) u.st[k]--;
  if (u.st.regen) { u.st.regen--; heal(st, u, u.maxHp * 0.06, ev); }
  if (u.regenTurn && u.hp > 0) heal(st, u, u.maxHp * u.regenTurn, ev);
  if (u.st.protecting) { u.st.protecting--; if (!u.st.protecting) front(st, 'ally').forEach((h) => { if (h.st.protectedBy === u.uid) h.st.protectedBy = null; }); }
  if (u.st.burn) { u.st.burn--; hurt(st, null, u, Math.max(3, u.maxHp * 0.06), ev, 'dot', { burn: true }); }
  if (u.hp > 0 && u.st.poison) { u.st.poison--; hurt(st, null, u, Math.max(3, u.maxHp * 0.06), ev, 'dot', { poison: true }); }
  if (u.hp > 0 && u.st.frozen) u.st.frozen--;
  if (u.hp > 0 && u.kind === 'hero') u.energy = Math.min(MAX_ENERGY, u.energy + 1);
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

// ——— Cibles ———
export function targets(st, actor, kind) {
  if (kind === 'enemy') return front(st, 'enemy').map((f) => f.uid);
  if (kind === 'ally') return front(st, 'ally').map((f) => f.uid);
  return [];
}
export function canInvoke(st) { return !!st.inv && (st.gauge || 0) >= 100; }

// ——— Action ———
// a : { actor, action: 'attack'|'skill'|'defend'|'item'|'invoke'|'enemy', skill, target,
//       strike: 'perfect'|'good'|'miss' (frappe en rythme), parry: idem (parade du héros visé) }
const STRIKE = { perfect: 1.3, good: 1.1, miss: 1 };
export function act(st, a) {
  const u = st.units[a.actor];
  const ev = [];
  if (!u || u.hp <= 0 || st.over) return ev;
  let speed = 1;
  if (u.kind === 'enemy') enemyAct(st, u, a, ev);
  else {
    const s = STRIKE[a.strike] || 1;
    if (a.strike === 'perfect') { gain(st, GAUGE.perfect); if (u.perfectEnergy) u.energy = Math.min(MAX_ENERGY, u.energy + 1); }
    const t = a.target ? st.units[a.target] : null;
    const base = Math.max(u.atk, u.mag * 0.7);
    const stealth = !!u.st.stealth;
    const boost = (tgt) => (u.st.inspired ? 1.25 : 1) * (u.st.bear ? 1.3 : 1) * (stealth ? 2 : 1) * (u.id === 'kael' && tgt.hp < tgt.maxHp / 2 ? 1.35 : 1)
      * (1 + (u.pactDmg || 0) + (u.burnBonus && tgt.st.burn ? u.burnBonus : 0) + (u.eliteBonus && (tgt.elite || tgt.boss) ? u.eliteBonus : 0));
    const hit = (tgt, amount, extra = {}) => {
      if (!tgt || tgt.hp <= 0) return 0;
      const pierce = u.pierce ? defOf(tgt) * 0.4 * u.pierce : 0; // pacte primordial : ignore une partie de la défense
      const d = hurt(st, u, tgt, (amount + pierce) * boost(tgt), ev, 'hit', stealth ? { ...extra, crit: true } : extra);
      if (u.lifesteal && d) heal(st, u, d * u.lifesteal, ev);
      if (d && tgt.hp > 0 && u.burnChance && rand(st) < u.burnChance) { tgt.st.burn = Math.max(tgt.st.burn, 2); ev.push({ t: 'status', u: tgt.uid, s: 'Brûlure' }); }
      if (d && tgt.hp > 0 && u.poisonChance && rand(st) < u.poisonChance) { tgt.st.poison = Math.max(tgt.st.poison, 2); ev.push({ t: 'status', u: tgt.uid, s: 'Poison' }); }
      return d;
    };
    if (a.action === 'attack') {
      const target = t && t.hp > 0 ? t : front(st, 'enemy')[0];
      const wasMarked = target?.st.mark;
      hit(target, dmg(st, base, target, s), { crit: a.strike === 'perfect' });
      if (target && target.hp > 0 && rand(st) < (u.fury ? 0.25 : 0) + (u.furyChance || 0)) hit(target, dmg(st, base, target, 0.8));
      if (u.id === 'brenna') u.res = Math.min(100, (u.res || 0) + 12);
      if (u.id === 'sylea' && wasMarked) u.energy = Math.min(MAX_ENERGY, u.energy + 1);
    } else if (a.action === 'defend') {
      u.st.defend = true;
      u.energy = Math.min(MAX_ENERGY, u.energy + 1);
      ev.push({ t: 'defend', u: u.uid });
      speed = 0.7;
    } else if (a.action === 'item') {
      if (t && a.heal) heal(st, t, t.maxHp * a.heal, ev);
      if (a.healAll) front(st, 'ally').forEach((f) => heal(st, f, f.maxHp * a.healAll, ev));
      ev.push({ t: 'item', u: u.uid, item: a.item });
    } else if (a.action === 'swap') {
      // remplacement tactique : une créature de réserve prend la place de celle qui joue (une fois par combat)
      const r = st.units[a.target];
      const oi = st.order.ally.indexOf(u.uid), ri = st.order.ally.indexOf(a.target);
      if (!r || r.hp <= 0 || st.swapped || ri < 0 || !bench(st, 'ally').includes(r)) return act(st, { ...a, action: 'defend' });
      st.order.ally[oi] = r.uid; st.order.ally[ri] = u.uid;
      st.swapped = true;
      r.ct = st.now + tick(r) * 0.4; r.entered = true;
      ev.push({ t: 'swap', u: u.uid, v: r.uid });
    } else if (a.action === 'invoke') {
      if (!canInvoke(st)) return act(st, { ...a, action: 'attack' });
      invoke(st, u, ev);
    } else if (a.action === 'skill') {
      const sk = SKILLS[a.skill];
      if (!sk || u.energy < sk.cost || !u.skills.includes(a.skill)) return act(st, { ...a, action: 'attack' });
      u.energy -= sk.cost;
      ev.push({ t: 'skill', u: u.uid, name: sk.name, key: a.skill });
      const foes = front(st, 'enemy');
      switch (a.skill) {
        case 'fendoir': { const tt = t && t.hp > 0 ? t : foes[0]; hit(tt, dmg(st, u.atk, tt, (1.2 + (u.res || 0) / 100) * s), { crit: a.strike === 'perfect' }); u.res = 0; break; }
        case 'defi': u.st.taunt = 2; u.st.armorUp = 2; u.res = Math.min(100, (u.res || 0) + 25); ev.push({ t: 'status', u: u.uid, s: 'Défi !' }); break;
        case 'egide': if (t && t.uid !== u.uid) { t.st.protectedBy = u.uid; u.st.protecting = 2; ev.push({ t: 'status', u: t.uid, s: 'Protégé' }); } else { u.st.armorUp = 2; ev.push({ t: 'status', u: u.uid, s: 'Garde' }); } break;
        case 'lumiere': { const tt = t || u; heal(st, tt, (tt.maxHp * 0.25 + (u.res || 0) * 0.6 + u.mag) * (1 + (u.healBoost || 0)), ev); u.res = 0; break; }
        case 'marque': if (t) { t.st.mark = 3; ev.push({ t: 'status', u: t.uid, s: 'Marqué' }); hit(t, dmg(st, u.atk, t, 0.6 * s)); } break;
        case 'volee': foes.forEach((f) => hit(f, dmg(st, u.atk, f, (f.st.mark ? u.volley || 1.7 : 0.8)))); break;
        case 'feu': {
          const tt = t && t.hp > 0 ? t : foes[0];
          const shatter = tt?.st.frozen;
          hit(tt, dmg(st, u.mag, tt, 1.5 * s * (shatter ? u.shatter || 2 : 1)), { crit: a.strike === 'perfect', shatter });
          if (tt && tt.hp > 0) { if (shatter) tt.st.frozen = 0; else { tt.st.burn = 3; ev.push({ t: 'status', u: tt.uid, s: 'Brûlure' }); } }
          break;
        }
        case 'givre': {
          const tt = t && t.hp > 0 ? t : foes[0];
          const shatter = tt?.st.burn;
          hit(tt, dmg(st, u.mag, tt, 1.1 * s * (shatter ? u.shatter || 2 : 1)), { crit: a.strike === 'perfect', shatter });
          if (tt && tt.hp > 0) {
            if (shatter) tt.st.burn = 0; else tt.st.frozen = 2;
            if (tt.st.charging) { tt.st.charging = false; tt.turns++; setIntent(st, tt); ev.push({ t: 'interrupt', u: tt.uid }); }
            else if (!shatter) ev.push({ t: 'status', u: tt.uid, s: 'Gelé' });
          }
          break;
        }
        // Compétences des créatures (prototype v2)
        case 'c_garde': { const w = front(st, 'ally').filter((h) => h.uid !== u.uid).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0]; u.st.armorUp = 2; if (w) { w.st.protectedBy = u.uid; u.st.protecting = 2; ev.push({ t: 'status', u: w.uid, s: 'Protégé' }); } else ev.push({ t: 'status', u: u.uid, s: 'Garde' }); break; }
        case 'c_frappe': { const tt = t && t.hp > 0 ? t : foes[0]; hit(tt, dmg(st, Math.max(u.atk, u.mag), tt, 1.8 * s), { crit: a.strike === 'perfect' }); break; }
        case 'c_soin': { const tt = t && t.hp > 0 ? t : front(st, 'ally').sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0]; heal(st, tt, tt.maxHp * 0.25 + u.mag, ev); break; }
        case 'c_venin': { const tt = t && t.hp > 0 ? t : foes[0]; hit(tt, dmg(st, Math.max(u.atk, u.mag), tt, 0.7 * s), { crit: a.strike === 'perfect' }); if (tt && tt.hp > 0) { tt.st.poison = 3; ev.push({ t: 'status', u: tt.uid, s: 'Poison' }); } break; }
        case 'c_entrave': {
          const tt = t && t.hp > 0 ? t : foes[0];
          hit(tt, dmg(st, Math.max(u.atk, u.mag), tt, 0.6 * s), { crit: a.strike === 'perfect' });
          if (tt && tt.hp > 0) {
            if (tt.st.charging) { tt.st.charging = false; tt.turns++; setIntent(st, tt); ev.push({ t: 'interrupt', u: tt.uid }); }
            if (!tt.boss) { tt.st.stun = 1; ev.push({ t: 'status', u: tt.uid, s: 'Étourdi' }); }
          }
          break;
        }
        case 'c_cri': front(st, 'ally').forEach((h) => { h.st.inspired = 2; }); gain(st, 10); ev.push({ t: 'status', u: u.uid, s: 'Ralliement !' }); break;
        case 'c_vague': foes.forEach((f) => hit(f, dmg(st, u.mag, f, 0.8))); break;
        // Sorts de l'Arsenal (u.sp : puissance selon la rareté)
        case 'seisme': foes.forEach((f) => { if (hit(f, dmg(st, u.atk, f, 0.8 * (u.sp || 1)))) u.res = Math.min(100, (u.res || 0) + 10); }); break;
        case 'rempart': front(st, 'ally').forEach((h) => { h.st.shield = 1; }); ev.push({ t: 'status', u: u.uid, s: 'Rempart !' }); break;
        case 'jugement': { const tt = t && t.hp > 0 ? t : foes[0]; hit(tt, dmg(st, u.mag, tt, 1.3 * s * (u.sp || 1)), { crit: a.strike === 'perfect' }); if (tt && tt.hp > 0) { tt.st.exposed = 2; ev.push({ t: 'status', u: tt.uid, s: 'Exposé' }); } break; }
        case 'priere': front(st, 'ally').forEach((h) => heal(st, h, h.maxHp * 0.15 * (u.sp || 1) * (1 + (u.healBoost || 0)), ev)); break;
        case 'gorge': {
          const tt = t && t.hp > 0 ? t : foes[0];
          hit(tt, dmg(st, u.atk, tt, 0.8 * s * (u.sp || 1)), { crit: a.strike === 'perfect' });
          if (tt && tt.hp > 0 && tt.st.charging) { tt.st.charging = false; tt.turns++; setIntent(st, tt); ev.push({ t: 'interrupt', u: tt.uid }); }
          break;
        }
        case 'percant': { const tt = t && t.hp > 0 ? t : foes[0]; if (tt) hit(tt, Math.max(1, u.atk * 2 * s * (u.sp || 1) * taken(st, tt)), { crit: a.strike === 'perfect' }); break; }
        // Nouvelles classes
        case 'ombre': u.st.stealth = 2; front(st, 'enemy').forEach((e) => { if (e.intent?.t === u.uid) e.intent.t = pickHero(st); }); ev.push({ t: 'status', u: u.uid, s: 'Dans l’ombre' }); break;
        case 'execution': { const tt = t && t.hp > 0 ? t : foes[0]; if (tt) hit(tt, dmg(st, u.atk, tt, (tt.hp < tt.maxHp * 0.3 ? u.execMult || 2.6 : 1.5) * s), { crit: a.strike === 'perfect' }); break; }
        case 'ours': u.st.bear = 3; ev.push({ t: 'status', u: u.uid, s: 'Forme d’ours' }); break;
        case 'seve': { const tt = t || u; heal(st, tt, tt.maxHp * 0.2 + u.mag * 0.5, ev); tt.st.regen = 3; ev.push({ t: 'status', u: tt.uid, s: 'Régénération' }); break; }
        case 'hymne': front(st, 'ally').forEach((h) => { h.st.inspired = u.songTurns || 2; }); gain(st, 10); ev.push({ t: 'status', u: u.uid, s: 'Hymne !' }); break;
        case 'dissonance': foes.forEach((f) => { hit(f, dmg(st, u.mag, f, 0.5)); if (f.hp > 0) f.st.weak = u.songTurns || 2; }); gain(st, 10); break;
        case 'drain': { const tt = t && t.hp > 0 ? t : foes[0]; const d = hit(tt, dmg(st, u.mag, tt, 1.2 * s), { crit: a.strike === 'perfect' }); if (d) heal(st, u, d * 0.5, ev); break; }
        case 'macabre': { const souls = Math.floor((u.res || 0) / 20); foes.forEach((f) => hit(f, dmg(st, u.mag, f, 0.5 + 0.25 * souls))); u.res = 0; break; }
        case 'venin': { const tt = t && t.hp > 0 ? t : foes[0]; hit(tt, dmg(st, u.atk, tt, 0.8 * s * (u.sp || 1))); if (tt && tt.hp > 0) { tt.st.poison = 3; ev.push({ t: 'status', u: tt.uid, s: 'Poison' }); } break; }
        case 'eventail': foes.forEach((f) => hit(f, dmg(st, u.atk, f, 0.7 * (u.sp || 1)))); break;
        case 'ronces': foes.forEach((f) => { hit(f, dmg(st, u.mag, f, 0.6 * (u.sp || 1))); if (f.hp > 0) f.st.poison = Math.max(f.st.poison, 2); }); break;
        case 'renouveau': front(st, 'ally').forEach((h) => { h.st.regen = 3; heal(st, h, h.maxHp * 0.06 * (u.sp || 1), ev); }); ev.push({ t: 'status', u: u.uid, s: 'Renouveau' }); break;
        case 'berceuse': { const tt = t && t.hp > 0 ? t : foes[0]; if (tt) { if (tt.st.charging) { tt.st.charging = false; tt.turns++; setIntent(st, tt); ev.push({ t: 'interrupt', u: tt.uid }); } tt.st.stun = 1; ev.push({ t: 'status', u: tt.uid, s: 'Endormi' }); } break; }
        case 'ballade': front(st, 'ally').forEach((h) => { h.energy = Math.min(MAX_ENERGY, h.energy + 1); }); gain(st, 10); ev.push({ t: 'status', u: u.uid, s: 'Ballade !' }); break;
        case 'malediction': { const tt = t && t.hp > 0 ? t : foes[0]; if (tt) { tt.st.exposed = 3; tt.st.weak = 2; ev.push({ t: 'status', u: tt.uid, s: 'Maudit' }); } break; }
        case 'pacte': { const c = Math.min(u.hp - 1, Math.round(u.maxHp * 0.15)); u.hp -= c; ev.push({ t: 'dot', a: null, u: u.uid, d: c, hp: u.hp }); u.energy = Math.min(MAX_ENERGY, u.energy + 2); break; }
        case 'meteore': foes.forEach((f) => { hit(f, dmg(st, u.mag, f, 1.2 * (u.sp || 1))); if (f.hp > 0) f.st.burn = Math.max(f.st.burn, 2); }); break;
        case 'blizzard': foes.forEach((f) => { const sh = f.st.burn; hit(f, dmg(st, u.mag, f, 0.6 * (u.sp || 1) * (sh ? u.shatter || 2 : 1)), { shatter: !!sh }); if (f.hp > 0) { if (sh) f.st.burn = 0; else f.st.frozen = Math.max(f.st.frozen, 1); } }); break;
        default: break;
      }
    }
    if (stealth && !(a.action === 'skill' && a.skill === 'ombre')) u.st.stealth = 0;
    if (a.action !== 'invoke') gain(st, GAUGE.action + (u.gaugeBonus || 0));
  }
  u.ct = Math.max(u.ct, st.now) + tick(u) * speed;
  check(st);
  st.log = [...st.log, ...ev].slice(-30);
  return ev;
}

function enemyAct(st, e, a, ev) {
  const intent = e.intent || { k: 'attack', t: pickHero(st) };
  const atk = e.atk * (e.st.enraged ? 1.4 : 1) * (e.st.weak ? 0.75 : 1);
  // cible annoncée ; si elle est tombée ou cachée dans l'ombre, une autre
  const tgtOf = () => { const t = intent.t && st.units[intent.t]; const taunt = front(st, 'ally').find((h) => h.st.taunt || h.st.bear); return taunt || (t && t.hp > 0 && !t.st.stealth ? t : st.units[pickHero(st)]); };
  const strikeHero = (mult, extra = {}) => {
    const t = tgtOf();
    if (!t) return 0;
    if (extra.parryable && a.parry === 'perfect') {
      ev.push({ t: 'parry', u: t.uid, a: e.uid });
      gain(st, GAUGE.perfect);
      if (t.perfectEnergy) t.energy = Math.min(MAX_ENERGY, t.energy + 1);
      return hurt(st, t, e, dmg(st, Math.max(t.atk, t.mag * 0.7), e, 0.8), ev, 'hit', { counter: true }) && 0;
    }
    const m = mult * (extra.parryable && a.parry === 'good' ? 0.5 : 1);
    return hurt(st, e, t, dmg(st, atk, t, m), ev, 'hit', { dodge: extra.parryable && a.parry === 'good', heavy: !!extra.parryable });
  };
  ev.push({ t: 'intent', u: e.uid, k: intent.k });
  switch (intent.k) {
    case 'attack': strikeHero(1); break;
    case 'hunt': strikeHero(1.35); break;
    case 'double': strikeHero(0.6); if (!st.over) strikeHero(0.6); break;
    case 'poison': { const t = tgtOf(); strikeHero(0.7); if (t && t.hp > 0) { t.st.poison = 3; ev.push({ t: 'status', u: t.uid, s: 'Poison' }); } break; }
    case 'aoe': front(st, 'ally').forEach((h) => hurt(st, e, h, dmg(st, Math.max(atk, e.mag), h, 0.6), ev, 'hit', { aoe: true })); break;
    case 'guard': front(st, 'enemy').forEach((x) => { x.st.shield = 1; }); ev.push({ t: 'status', u: e.uid, s: 'Bouclier' }); break;
    case 'heal': { const w = front(st, 'enemy').sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0]; if (w) heal(st, w, w.maxHp * 0.25, ev); break; }
    case 'charge': e.st.charging = true; ev.push({ t: 'charge', u: e.uid }); break;
    case 'heavy': e.st.charging = false; strikeHero(2.2, { parryable: true }); break;
    case 'stunheavy': { e.st.charging = false; const t = tgtOf(); const d = strikeHero(1.4, { parryable: true }); if (t && d && t.hp > 0) { t.st.stun = 1; ev.push({ t: 'status', u: t.uid, s: 'Étourdi' }); } break; }
    default: strikeHero(1);
  }
  if (intent.k !== 'charge') e.turns++;
  if (intent.k === 'charge') { e.intent = { k: e.family === 'controleur' && !e.boss ? 'stunheavy' : 'heavy', t: intent.t }; return; }
  setIntent(st, e);
}

// ——— Invocations ———
function invoke(st, u, ev) {
  const inv = st.inv, p = inv.power;
  const team = st.order.ally.map((id) => st.units[id]);
  const lvl = team.reduce((a, h) => a + h.level, 0) / Math.max(1, team.length);
  st.gauge = 0;
  st.invUses = (st.invUses || 0) + 1;
  ev.push({ t: 'summon', u: u.uid, inv: inv.key });
  if (inv.key === 'sceau') {
    front(st, 'ally').forEach((h) => { heal(st, h, h.maxHp * 0.2 * p, ev); h.st.shield = 1; });
  } else if (inv.key === 'aegis') {
    front(st, 'ally').forEach((h) => { h.st.shield = 1; h.energy = Math.min(MAX_ENERGY, h.energy + 2); ev.push({ t: 'status', u: h.uid, s: 'Égide' }); });
  } else if (inv.key === 'phenix' || inv.key === 'revive') {
    const fallen = st.order.ally.map((id) => st.units[id]).filter((h) => h.hp <= 0);
    if (fallen.length) fallen.forEach((h) => { h.hp = Math.round(h.maxHp * 0.4 * p); h.ct = st.now + tick(h) * 0.5; ev.push({ t: 'revive', u: h.uid, hp: h.hp }); });
    else front(st, 'ally').forEach((h) => { heal(st, h, h.maxHp * 0.35 * p, ev); h.st.poison = 0; h.st.burn = 0; });
  } else if (inv.key === 'bahamut' || inv.key === 'nova') {
    front(st, 'enemy').forEach((e) => { hurt(st, null, e, (30 + 7 * lvl) * p * taken(st, e), ev, 'hit', { big: true }); if (e.hp > 0) { e.st.exposed = 2; } });
  } else if (inv.key === 'fenrir' || inv.key === 'smite') {
    const t = front(st, 'enemy').sort((x, y) => y.hp - x.hp)[0];
    if (t) { hurt(st, null, t, (70 + 14 * lvl) * p * taken(st, t), ev, 'hit', { big: true }); if (t.hp <= 0) st.gauge = 50; }
  }
}

// ——— Intelligence artificielle des héros (mode auto, simulations) ———
export function plan(st, u) {
  const foes = front(st, 'enemy'), allies = front(st, 'ally');
  const A = (action, extra = {}) => ({ actor: u.uid, action, ...extra });
  if (canInvoke(st)) {
    const anyFallen = st.order.ally.some((id) => st.units[id].hp <= 0);
    const lowTeam = allies.reduce((a, h) => a + h.hp / h.maxHp, 0) / allies.length < 0.55;
    if (!['phenix', 'revive', 'sceau'].includes(st.inv.key) || anyFallen || lowTeam) return A('invoke');
  }
  const prey = () => (foes.find((f) => f.st.mark) || foes.slice().sort((x, y) => x.hp - y.hp)[0])?.uid;
  const charging = foes.find((f) => f.st.charging);
  const has = (k) => u.skills.includes(k) && u.energy >= SKILLS[k].cost;
  if (u.creature) {
    const hurtAlly = allies.filter((h) => h.hp < h.maxHp * 0.55).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
    if (has('c_entrave') && charging) return A('skill', { skill: 'c_entrave', target: charging.uid });
    if (has('c_soin') && hurtAlly) return A('skill', { skill: 'c_soin', target: hurtAlly.uid });
    if (has('c_garde') && (charging || hurtAlly) && !u.st.protecting) return A('skill', { skill: 'c_garde' });
    if (has('c_cri') && !allies.some((h) => h.st.inspired)) return A('skill', { skill: 'c_cri' });
    if (has('c_vague') && foes.length >= 2) return A('skill', { skill: 'c_vague' });
    const tough = foes.slice().sort((x, y) => y.hp - x.hp)[0];
    if (has('c_venin') && tough && !tough.st.poison) return A('skill', { skill: 'c_venin', target: tough.uid });
    if (has('c_frappe') && u.energy >= 2) return A('skill', { skill: 'c_frappe', target: prey() });
    return A('attack', { target: prey() });
  }
  // Sorts de l'Arsenal
  if (has('meteore') && foes.length >= 2) return A('skill', { skill: 'meteore' });
  if (has('blizzard') && foes.length >= 2 && (foes.some((f) => f.st.burn) || foes.length >= 3)) return A('skill', { skill: 'blizzard' });
  if (has('seisme') && foes.length >= 3) return A('skill', { skill: 'seisme' });
  if (has('gorge') && charging) return A('skill', { skill: 'gorge', target: charging.uid });
  if (has('rempart') && charging && allies.length >= 2) return A('skill', { skill: 'rempart' });
  if (has('priere') && allies.filter((h) => h.hp < h.maxHp * 0.65).length >= 2) return A('skill', { skill: 'priere' });
  if (has('jugement') && u.energy >= 2) return A('skill', { skill: 'jugement', target: foes.slice().sort((x, y) => y.hp - x.hp)[0]?.uid });
  if (has('percant') && u.energy >= 3) return A('skill', { skill: 'percant', target: prey() });
  if (u.id === 'kael') {
    const weak = foes.filter((f) => f.hp < f.maxHp * 0.3).sort((x, y) => x.hp - y.hp)[0];
    if (weak && has('execution')) return A('skill', { skill: 'execution', target: weak.uid });
    if (!u.st.stealth && has('ombre') && u.energy >= 2) return A('skill', { skill: 'ombre' });
  }
  if (u.id === 'thalia') {
    const low = allies.filter((h) => h.hp < h.maxHp * 0.55 && !h.st.regen).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
    if (low && has('seve')) return A('skill', { skill: 'seve', target: low.uid });
    if (!u.st.bear && has('ours') && (charging || u.hp > u.maxHp * 0.6)) return A('skill', { skill: 'ours' });
  }
  if (u.id === 'lucien') {
    if (!allies.some((h) => h.st.inspired) && has('hymne')) return A('skill', { skill: 'hymne' });
    if (foes.length >= 2 && !foes.some((f) => f.st.weak) && has('dissonance')) return A('skill', { skill: 'dissonance' });
  }
  if (u.id === 'ossian') {
    if ((u.res || 0) >= 60 && has('macabre') && foes.length >= 2) return A('skill', { skill: 'macabre' });
    if (has('drain')) return A('skill', { skill: 'drain', target: prey() });
  }
  if (has('berceuse') && charging) return A('skill', { skill: 'berceuse', target: charging.uid });
  if (has('ballade') && allies.filter((h) => h.energy < 2).length >= 2) return A('skill', { skill: 'ballade' });
  if (has('renouveau') && allies.filter((h) => h.hp < h.maxHp * 0.7).length >= 2) return A('skill', { skill: 'renouveau' });
  if (has('ronces') && foes.length >= 2) return A('skill', { skill: 'ronces' });
  if (has('eventail') && foes.length >= 3) return A('skill', { skill: 'eventail' });
  if (has('venin') && prey() && !st.units[prey()].st.poison) return A('skill', { skill: 'venin', target: prey() });
  if (has('malediction') && u.energy >= 2) return A('skill', { skill: 'malediction', target: foes.slice().sort((x, y) => y.hp - x.hp)[0]?.uid });
  if (has('pacte') && u.energy <= 1 && u.hp > u.maxHp * 0.6) return A('skill', { skill: 'pacte' });
  if (u.id === 'aldric') {
    const low = allies.filter((h) => h.hp < h.maxHp * 0.45).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
    if (low && has('lumiere')) return A('skill', { skill: 'lumiere', target: low.uid });
    const threatened = charging && st.units[charging.intent?.t];
    if (threatened && threatened.uid !== u.uid && !threatened.st.protectedBy && has('egide')) return A('skill', { skill: 'egide', target: threatened.uid });
  }
  if (u.id === 'morgane') {
    if (charging && has('givre')) return A('skill', { skill: 'givre', target: charging.uid });
    const frozen = foes.find((f) => f.st.frozen), burning = foes.find((f) => f.st.burn);
    if (frozen && has('feu')) return A('skill', { skill: 'feu', target: frozen.uid });
    if (burning && has('givre')) return A('skill', { skill: 'givre', target: burning.uid });
    if (has('feu')) return A('skill', { skill: 'feu', target: foes.slice().sort((x, y) => y.hp - x.hp)[0]?.uid });
  }
  if (u.id === 'sylea') {
    if (!foes.some((f) => f.st.mark) && has('marque')) return A('skill', { skill: 'marque', target: foes.slice().sort((x, y) => y.hp - x.hp)[0]?.uid });
    if (foes.length >= 2 && has('volee')) return A('skill', { skill: 'volee' });
  }
  if (u.id === 'brenna') {
    if ((u.res || 0) >= 60 && has('fendoir')) return A('skill', { skill: 'fendoir', target: prey() });
    if (charging && !u.st.taunt && has('defi') && u.hp > u.maxHp * 0.5) return A('skill', { skill: 'defi' });
  }
  return A('attack', { target: prey() });
}

export function autoBattle(st, { strike = 'miss', parry = 'miss', max = 600 } = {}) {
  for (let i = 0; i < max && !st.over; i++) {
    const b = beginTurn(st);
    if (b.skip || st.over) continue;
    const u = current(st);
    const a = u.kind === 'enemy' ? { actor: u.uid, action: 'enemy', parry } : { ...plan(st, u), strike };
    act(st, a);
  }
  if (!st.over) st.over = 'lost';
  return st;
}
