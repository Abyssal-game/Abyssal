// v928 : séquences de défense des attaques ennemies (sorties de js/ui/def-bar.js) : l'écran de combat, le Labo des défenses
// et les simulations de la campagne (js/core/lab.js) lisent la même séquence. Une lettre par touche :
// n simple · f rapide · l lent · x feinte · m zone mobile · h chargé · H chargé avec feinte · o cercle · O cercle rapide.
import { intentInfo } from './duel.js';

/* rythme des ennemis (déplacé de duel-ui.js en v594) */
export const FAM_RHYTHM = { predateur: 'nf', assassin: 'ff', berserker: 'x', protecteur: 'n', mage: 'l', parasite: 'nf', controleur: 'm', soutien: 'n', gardien: 'nx' };
/* v871 : les gros coups se défendent au cercle (o : un cercle ; O : rapide, avec une hésitation ; oo : deux à la suite) */
export const KIND_RHYTHM = { tick2: 'ff', poison: 'nf', flurry: 'fff', grab: 'nx', chain: 'nnf', frost: 'm', heavy: 'o', gorge: 'o', execute: 'oO', ambush: 'xf', blast: 'lo' };
/* chaque gardien : nom de son Assaut et sa séquence (de 3 à 5 coups, rythme propre ; l'Horloger frappe en mesure) */
export const BOSS_ASSAULT = {
  devoreur: { name: 'La Faim sans fond', seq: 'fxo' },
  matriarche: { name: 'L’Hiver mordant', seq: 'mmx' },
  roi: { name: 'Le Reflet volé', seq: 'xnx' },
  architecte: { name: 'L’Effondrement', seq: 'lxO' },
  eclipse: { name: 'Éclipse totale', seq: 'mox' },
  essaim: { name: 'La Nuée', seq: 'ffff' },
  bourreau: { name: 'La Hache du Bourreau', seq: 'oxO' },
  choeur: { name: 'Le Chant des Noyés', seq: 'lmx' },
  chaines: { name: 'Les Mille Chaînes', seq: 'nnnf' },
  horloge: { name: 'L’Heure exacte', seq: 'nnnn', beat: 320 },
  miroirs: { name: 'Le Palais des Miroirs', seq: 'xxn' },
  golem: { name: 'Avalanche de cendres', seq: 'llO' },
  peste: { name: 'Le Souffle gris', seq: 'mfx' },
  chasseur: { name: 'La Traque', seq: 'fxf' },
  voeux: { name: 'Le Prix à payer', seq: 'nmo' },
  titan: { name: 'Le Réveil du Titan', seq: 'Oxf' },
  jumeaux: { name: 'Crépuscule double', seq: 'ffxx' },
  juge: { name: 'Le Jugement', seq: 'onx' },
  bete: { name: 'L’Apocalypse', seq: 'fxmO' },
  abysse: { name: 'La Nuit sans fin', seq: 'xfmxO' },
};

/* attaques qui, chez un gardien, deviennent son Assaut */
export const ASSAULT_K = ['heavy', 'blast', 'gorge', 'blizzard', 'copy', 'swarm', 'execute', 'lament', 'ambush', 'price', 'quake', 'chain', 'tick2'];
export const assaultOf = (st, s) => { const e = st.units[s.a]; return e?.boss && ASSAULT_K.includes(s.kind) && BOSS_ASSAULT[st.bossKey] || null; };
/* séquence d'une attaque : l'Assaut du gardien, sinon propre au coup, sinon au rythme de la famille ; une élite ajoute un coup rapide */
export function seqOf(st, s) {
  const A = assaultOf(st, s);
  if (A) return A.seq;
  const e = st.units[s.a];
  let q = KIND_RHYTHM[s.kind] || (intentInfo(st, e)?.aoe ? 'lx' : FAM_RHYTHM[e?.fam] || 'n');
  if (e?.elite && !e.boss && q.length < 3 && !/[hHoO]/.test(q)) q += 'f';
  return q;
}
