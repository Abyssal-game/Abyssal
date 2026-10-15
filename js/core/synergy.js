// Synergies d'équipe : ce que chaque créature apporte à l'équipe et ce dont elle profite,
// d'après son rôle, ses passifs et sa compétence propre (kits.js). Sert à suggérer une équipe,
// à montrer les synergies de l'équipe et à filtrer la collection.
import { roleOf, COST, BUDGET, TEAM } from './army.js';
import { CREATURE_KITS, KIT_LEVELS, moveDefOf } from './kits.js';

// Ce qu'une créature peut apporter (provides) ou rechercher (wants)
export const TAGS = {
  slow: 'du gel', poison: 'du poison', mark: 'sa Marque', heal: 'des soins', guard: 'sa protection', boost: 'de l’attaque', attack: 'ses dégâts',
};
// « à » + nom (Le Roi → au Roi, Les → aux)
// v311 : « de Le Rêveur » → « du Rêveur », « dans Le Royaume » → « dans le Royaume »
export const deName = (n) => (/^Le /.test(n) ? `du ${n.slice(3)}` : /^Les /.test(n) ? `des ${n.slice(4)}` : /^La /.test(n) ? `de la ${n.slice(3)}` : /^[AEIOUYÉÈÊH]/i.test(n) ? `d’${n}` : `de ${n}`);
export const lowArt = (n) => n.replace(/^(Le|La|Les) /, (m) => m.toLowerCase());
export const toName = (n) => (/^Le /.test(n) ? `au ${n.slice(3)}` : /^Les /.test(n) ? `aux ${n.slice(4)}` : `à ${n}`);
const ROLE_GIVES = { controle: ['slow'], poison: ['poison'], soutien: ['mark', 'boost'], soin: ['heal'], protecteur: ['guard'], degats: ['attack'], zone: ['attack'] };
const ROLE_WANTS = { degats: ['mark', 'boost'], zone: ['boost'], protecteur: ['heal'], poison: ['slow'], controle: ['attack'], soin: ['guard'], soutien: ['attack'] };
const PASSIVE_GIVES = { venin: ['poison'], malediction: ['mark'], engloutir: ['slow'], commandement: ['boost'], choeur: ['boost'], benediction: ['heal'], regeneration: [], egide: ['guard'], sentinelle: ['guard'], presage: ['attack'] };
const PASSIVE_WANTS = { chasseur: ['poison'], filaments: ['poison'], profondeurs: ['slow'], presage: ['slow'], attiser: ['mark'], colere: ['heal'], sentinelle: ['heal'], choeur: ['attack'], commandement: ['attack'], faim: ['mark'], devoreur: ['mark'], elue: ['guard'] };
const OP_GIVES = { slow: 'slow', freeze: 'slow', poison: 'poison', mark: 'mark', heal: 'heal', shield: 'guard', taunt: 'guard', boost: 'boost' };

// Ce que la créature apporte et recherche, au niveau donné (les passifs et la compétence se débloquent)
export function tagsOf(card, level = 1) {
  const role = roleOf(card), k = CREATURE_KITS[card.id];
  const gives = new Set(ROLE_GIVES[role] || []), wants = new Set(ROLE_WANTS[role] || []);
  if (k) {
    if (k.strike.burn || k.strike.splashPoison) gives.add('poison');
    const ps = level >= KIT_LEVELS.passive ? [k.passive, ...(level >= KIT_LEVELS.awaken && k.passive2 ? [k.passive2] : [])] : [];
    ps.forEach((p) => { (PASSIVE_GIVES[p] || []).forEach((t) => gives.add(t)); (PASSIVE_WANTS[p] || []).forEach((t) => wants.add(t)); });
    const M = level >= KIT_LEVELS.move ? moveDefOf(k) : null;
    (M?.ops || []).forEach((o) => { if (OP_GIVES[o.op]) gives.add(OP_GIVES[o.op]); });
  }
  return { role, gives, wants };
}

// Synergies d'une équipe : une ligne par créature qui profite de ce qu'une autre apporte
export function teamSynergies(cards, levelOf) {
  const T = cards.map((c) => ({ c, ...tagsOf(c, levelOf(c.id)) }));
  const out = [];
  for (const a of T) for (const t of a.wants) {
    const b = T.find((x) => x !== a && x.gives.has(t));
    if (b) out.push({ a: a.c.id, b: b.c.id, tag: t });
  }
  return out;
}

// Force d'une créature seule (rareté et niveau), pour départager
const RW = { C: 1, PC: 1.15, R: 1.3, HR: 1.45, M: 1.6, S: 1.75 };
const unitPower = (c, lv) => RW[c.rarity] * (1 + 0.08 * (lv - 1)) * (1 + (lv >= 3 ? 0.06 : 0) + (lv >= 6 ? 0.06 : 0) + (lv >= 9 ? 0.04 : 0));
// Note d'une équipe : force, synergies, et les rôles qui la font tenir (un protecteur, un soigneur)
export function teamScore(cards, levelOf) {
  const roles = new Set(cards.map((c) => roleOf(c)));
  const front = cards.slice(0, TEAM.active);
  return cards.reduce((x, c, i) => x + unitPower(c, levelOf(c.id)) * (i < TEAM.active ? 1 : 0.45), 0)
    + 0.35 * teamSynergies(cards, levelOf).length
    + (front.some((c) => roleOf(c) === 'protecteur') ? 0.6 : 0) + (roles.has('soin') ? 0.6 : 0) + roles.size * 0.1;
}

// Suggestion : on part des meilleures créatures et on ajoute, une à une, celle qui améliore le plus la note,
// sans dépasser le budget (en gardant de quoi compléter avec des Communes)
export function suggestTeam(owned, levelOf) {
  const size = TEAM.active + TEAM.reserve, cost = (l) => l.reduce((x, c) => x + COST[c.rarity], 0);
  const byPow = owned.slice().sort((a, b) => unitPower(b, levelOf(b.id)) - unitPower(a, levelOf(a.id)));
  // les plus fortes, plus les meilleures petites raretés (pour compléter sans dépasser le budget)
  const pool = [...new Set([...byPow.slice(0, 30), ...['C', 'PC', 'R'].flatMap((r) => byPow.filter((c) => c.rarity === r).slice(0, 10))])];
  let best = null;
  for (const start of pool.slice(0, 6)) {
    const t = [start];
    while (t.length < size) {
      const left = size - t.length - 1;
      let pick = null, ps = -Infinity;
      for (const c of pool) {
        if (t.includes(c) || cost(t) + COST[c.rarity] + left > BUDGET) continue;
        const s = teamScore([...t, c], levelOf);
        if (s > ps) { ps = s; pick = c; }
      }
      if (!pick) break;
      t.push(pick);
    }
    // ordre : protecteur et attaquants au combat, soutiens en réserve
    const order = { protecteur: 0, degats: 1, soin: 2, zone: 3, poison: 3, controle: 4, soutien: 5 };
    t.sort((a, b) => order[roleOf(a)] - order[roleOf(b)] || unitPower(b, levelOf(b.id)) - unitPower(a, levelOf(a.id)));
    const s = teamScore(t, levelOf);
    if (!best || s > best.s) best = { t, s };
  }
  return best ? best.t.map((c) => c.id) : [];
}
