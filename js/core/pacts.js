// Pactes : chaque héros peut se lier à une carte de créature possédée.
// La faction de la carte choisit le type d'effet ; sa rareté en fixe le niveau
// (1 : bonus simple, 2 : effet déclenché, 3 : règle de combat modifiée).
// Les niveaux se cumulent. Les variantes (holo, or…) restent purement cosmétiques.

export const PACT_UNLOCK = 2; // étage record à atteindre pour sceller des pactes

export const tierOf = (rarity) => ({ C: 1, PC: 1, R: 2, HR: 2, M: 3, S: 3 }[rarity] || 1);
export const TIER_NAMES = { 1: 'Pacte simple', 2: 'Pacte fort', 3: 'Pacte légendaire' };

// Textes de chaque niveau, par faction
export const PACT_FX = {
  infernal:   { name: 'Brasier',   t: ['+10 % de dégâts.', '25 % de chances d’enflammer la cible (Brûlure).', 'Les ennemis en feu subissent +40 % de ses dégâts.'] },
  celeste:    { name: 'Grâce',     t: ['+10 % de PV maximum.', 'Se soigne de 4 % de ses PV à chaque tour.', 'Une fois par combat, survit à un coup fatal et récupère 30 % de ses PV.'] },
  abyssal:    { name: 'Abysses',   t: ['+15 % de PV maximum.', 'Un bouclier annule le premier coup reçu à chaque combat.', 'Renvoie 30 % des dégâts reçus à l’attaquant.'] },
  sauvage:    { name: 'Instinct',  t: ['+1 en vitesse.', '15 % de chances de frapper une seconde fois.', 'Chaque ennemi vaincu lui rend 1 énergie et 10 % de ses PV.'] },
  necrotique: { name: 'Moisson',   t: ['Vol de vie de 6 %.', '30 % de chances d’empoisonner la cible.', 'Chaque ennemi vaincu soigne toute l’équipe de 12 % de ses PV.'] },
  primordial: { name: 'Fondation', t: ['+20 % de défense.', 'Ses coups ignorent une partie de la défense ennemie.', '+40 % de dégâts contre les élites et les gardiens.'] },
  artificiel: { name: 'Mécanisme', t: ['+1 énergie au début de chaque combat.', 'Chaque action remplit la jauge d’invocation de 3 points de plus.', 'Une frappe ou une parade parfaite lui rend 1 énergie.'] },
};

export function pactOf(card) {
  if (!card || !PACT_FX[card.faction]) return null;
  const tier = tierOf(card.rarity);
  return { id: card.id, faction: card.faction, tier, name: PACT_FX[card.faction].name, lines: PACT_FX[card.faction].t.slice(0, tier) };
}

// Applique un pacte à une unité de héros (appelé par makeHero)
export function applyPact(u, pact) {
  if (!pact) return;
  const t = pact.tier, f = pact.faction;
  u.pact = { faction: f, tier: t };
  const at = (n) => t >= n;
  if (f === 'infernal') { u.pactDmg = 0.1; if (at(2)) u.burnChance = 0.25; if (at(3)) u.burnBonus = 0.4; }
  if (f === 'celeste') { u.maxHp = Math.round(u.maxHp * 1.1); if (at(2)) u.regenTurn = 0.04; if (at(3)) u.lastStand = true; }
  if (f === 'abyssal') { u.maxHp = Math.round(u.maxHp * 1.15); if (at(2)) u.ward = true; if (at(3)) u.thorns = 0.3; }
  if (f === 'sauvage') { u.spd += 1; if (at(2)) u.furyChance = 0.15; if (at(3)) u.killEnergy = true; }
  if (f === 'necrotique') { u.lifesteal = (u.lifesteal || 0) + 0.06; if (at(2)) u.poisonChance = 0.3; if (at(3)) u.killHealTeam = 0.12; }
  if (f === 'primordial') { u.def = Math.round(u.def * 1.2) + 1; if (at(2)) u.pierce = 0.6; if (at(3)) u.eliteBonus = 0.4; }
  if (f === 'artificiel') { u.energy = Math.min(3, u.energy + 1); if (at(2)) u.gaugeBonus = (u.gaugeBonus || 0) + 3; if (at(3)) u.perfectEnergy = true; }
}
