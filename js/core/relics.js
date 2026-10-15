// ABYSSAL : reliques de la Chasse aux Reliques (données). Une relique dure le temps d'une chasse.
// cat : catégorie (vie, savoir, fureur, ruse). Quatre reliques au plus, une seule de chaque.
// Les effets de combat sont appliqués par le moteur (duel.js, st.relics) ; ceux de la chasse par game.js.
export const RELICS = {
  coeur:    { name: 'Cœur du Titan', cat: 'vie', icon: 'stat-hp', gain: '+35 % de PV max pour toute l’équipe.', cost: 'Tes attaques ne donnent de la Ferveur qu’une fois sur deux.' },
  oeil:     { name: 'Œil du Traître', cat: 'savoir', icon: 'danger', gain: 'Les faiblesses de tous les ennemis sont révélées dès le début du combat.', cost: 'Tes créatures subissent 15 % de dégâts en plus.' },
  couronne: { name: 'Couronne des Cendres', cat: 'fureur', icon: 'crown', gain: '+1 ATQ à toute l’équipe par quart de PV perdu par l’équipe (jusqu’à +3).', cost: 'Aucun : elle ne sert qu’aux équipes en danger.' },
  miroir:   { name: 'Miroir de l’Abîme', cat: 'ruse', icon: 'showcase', gain: 'Une fois par combat, la première attaque chargée ennemie (coup chargé, déflagration, festin, tempête, copie) lui renvoie la moitié des dégâts infligés.', cost: 'Tes créatures commencent chaque combat avec 1 PA de moins.' },
  lanterne: { name: 'Lanterne des Noyés', cat: 'vie', icon: 'streak', gain: 'Après chaque combat gagné, l’équipe récupère 15 % de ses PV.', cost: 'Les marchands te font payer 25 % plus cher.' },
  sablier:  { name: 'Sablier fêlé', cat: 'ruse', icon: 'hourglass', gain: 'Tes créatures commencent chaque combat avec 1 PA de plus.', cost: '−10 % de PV max pour toute l’équipe.' },
  dent:     { name: 'Dent du Léviathan', cat: 'fureur', icon: 'swords', gain: '+30 % de dégâts contre les élites et les gardiens.', cost: 'Tu commences chaque combat avec 1 Ferveur de moins.' },
};
export const RELIC_KEYS = Object.keys(RELICS);
export const RELIC_MAX = 4;
