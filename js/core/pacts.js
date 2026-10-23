// ABYSSAL : Pactes de l'Abîme (données). Proposés avant les combats d'élite et de gardien dans la
// Descente. Facultatifs, temporaires (le temps d'un combat), et toujours un avantage contre un coût.
// Les effets sont appliqués par le moteur (duel.js) selon st.pact ; ce fichier ne contient que les textes.
export const PACTS = {
  sang:    { name: 'Pacte du Sang', gain: 'Tes créatures infligent 30 % de dégâts en plus.', cost: 'Au début de chacun de tes tours, chacune perd 6 % de ses PV max (elle ne peut pas en mourir).', color: '#C0182F' },
  reflet:  { name: 'Pacte du Reflet', gain: 'Chaque action spéciale ennemie te renvoie son écho : +1 Ferveur, et un bouclier sur ta créature la plus faible quand c’est une protection ou un soin.', cost: 'Tu commences le combat avec 2 Ferveur de moins.', color: '#7FB6FF' },
  gardien: { name: 'Pacte du Serment', gain: 'La première de tes créatures qui tombe se relève aussitôt avec 35 % de ses PV.', cost: 'Si ton équipe tombe malgré tout, tu perds aussi tous les éclats du chapitre.', color: '#F2C14E' },
  cendre:  { name: 'Pacte de Cendre', gain: 'Ta Ferveur commence pleine (6).', cost: 'Tous tes soins sont réduits de moitié.', color: '#FF8A3D' },
  ombre:   { name: 'Pacte de l’Ombre', gain: 'Le premier coup de chacun de tes tours inflige 50 % de dégâts en plus.', cost: 'Tes créatures ont 20 % de PV max en moins pour ce combat.', color: '#B78CFF' },
};
export const PACT_KEYS = Object.keys(PACTS);
// Trois pactes au choix, toujours les mêmes pour un étage donné (pas de relance)
export function pactChoices(seedStr) {
  let h = 2166136261;
  for (const ch of seedStr) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const keys = PACT_KEYS.slice();
  const out = [];
  while (out.length < 3) { h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0; out.push(keys.splice(h % keys.length, 1)[0]); }
  return out;
}
