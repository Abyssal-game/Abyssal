// ABYSSAL : formes corrompues (données). Une créature touchée par l'Abîme peut combattre sous une
// autre forme : même carte, même niveau, mais un autre passif. La forme originelle n'est jamais
// perdue : le joueur choisit la forme à emmener (s.forms[id] = 'corrompue' ou absent).
// cond : { boss: clé } (vaincre ce gardien), { level: n } (niveau de la carte), { depth: n } (étage atteint).
export const FORMS = {
  'NEC-001': { name: 'Sentinelle Creuse', title: 'Elle garde désormais le vide', cond: { boss: 'devoreur' }, condText: 'Vaincre le Dévoreur',
    passive: 'vengeance', passiveName: 'Vengeance', passiveDesc: 'Gagne +2 ATQ chaque fois qu’une de tes créatures tombe. En échange, 20 % de PV max en moins.', hp: 0.8, atk: 1,
    lore: 'Le Dévoreur a mangé la crypte qu’elle gardait. Elle est restée debout dans le noir, à garder ce qui n’existe plus, et sa rancune a remplacé ses os.' },
  'CEL-005': { name: 'Statue Fêlée', title: 'L’ivoire a bu l’Abîme', cond: { level: 3 }, condText: 'Atteindre le niveau 3 avec cette carte',
    passive: 'shatter', passiveName: 'Éclats', passiveDesc: 'Chacune de ses attaques retire 1 Brisure de plus. En échange, 25 % de PV max en moins.', hp: 0.75, atk: 1,
    lore: 'Une fissure, puis une autre. La sentinelle a cessé de protéger le jour où elle a compris qu’elle aimait le bruit de ce qui se brise.' },
  'SAU-001': { name: 'Loup de l’Abîme', title: 'Il hurle pour les absents', cond: { boss: 'matriarche' }, condText: 'Vaincre la Matriarche du Givre',
    passive: 'frenzy', passiveName: 'Meute brisée', passiveDesc: 'Inflige 50 % de dégâts en plus dès qu’une de tes créatures est tombée. En échange, −1 ATQ.', hp: 1, atk: -1,
    lore: 'Sa meute est morte de froid au pied du trône de glace. Il a survécu, seul, et il ne chasse plus pour manger.' },
  'CEL-031': { name: 'Phénix de Cendre', title: 'Il renaît, mais plus froid', cond: { depth: 15 }, condText: 'Atteindre l’étage 15 de la Descente',
    passive: 'rebirth', passiveName: 'Renaissance noire', passiveDesc: 'Une fois par combat, se relève avec 30 % de ses PV quand il tombe. En échange, il commence chaque combat à 70 % de ses PV.', hp: 1, atk: 0,
    lore: 'À force de mourir et de renaître au fond de l’Abysse, ses flammes ont perdu leur couleur. Il brûle toujours, mais plus rien ne s’éclaire autour de lui.' },
};
export function formUnlocked(g, id) {
  const f = FORMS[id];
  if (!f || !g.owns(id)) return false;
  if (f.cond.boss) return !!g.s.bossesBeaten?.[f.cond.boss];
  if (f.cond.level) return g.cardLevel(id) >= f.cond.level;
  if (f.cond.depth) return (g.s.descent?.best || 0) >= f.cond.depth;
  return false;
}
