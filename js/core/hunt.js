// ABYSSAL : Chasse aux Reliques (données et règles pures, sans affichage).
//
// Une chasse est une suite de 9 salles. Avant chaque salle, on choisit entre deux chemins :
// combat, événement, marchand, relique ou rencontre singulière. La 9e salle est le Gardien du Reliquaire.
// Le butin gagné est « en jeu » : il est perdu si l'équipe tombe. Il devient « à l'abri » aux seuils
// (après les salles 3 et 6), chez le Passeur du marchand, ou quand on sort volontairement.
// Les reliques (4 au plus) ne durent que le temps de la chasse.
import { RELICS, RELIC_KEYS, RELIC_MAX } from './relics.js';
import { BOSS_ORDER } from './bosses.js';

export const HUNT = {
  rooms: 9,             // la dernière est le gardien
  seuils: [3, 6],       // après ces salles, le butin en jeu est mis à l'abri
  paidPerDay: 2,        // chasses payées par jour ; ensuite on peut rejouer, sans butin
  lootCap: 450,         // butin d'éclats maximal par chasse
  floorOf: (step) => Math.round(1 + step * 0.8), // force des ennemis : de l'étage 2 (salle 1) à l'étage 8 (gardien) de la Descente
};
export const ROOMS = {
  combat:   { name: 'Combat', icon: 'p:swords', desc: 'Des créatures corrompues gardent le passage.' },
  event:    { name: 'Événement', icon: 'p:mysteries', desc: 'Quelque chose t’attend dans l’ombre. Un choix à faire.' },
  merchant: { name: 'Marchand', icon: 'p:ticket', desc: 'Soins, reliques et le Passeur, qui met ton butin à l’abri.' },
  relic:    { name: 'Relique', icon: 'p:crown', desc: 'Un reliquaire scellé : choisis une relique.' },
  special:  { name: 'Rencontre singulière', icon: 'p:hunt', desc: 'Une élite redoutable. Double butin, et une relique si tu gagnes.' },
  boss:     { name: 'Gardien du Reliquaire', icon: 'p:crest-boss', desc: 'Le gardien de la chasse. Coffre garanti si tu le vaincs.' },
};
const WEIGHTS = [['combat', 4], ['event', 3], ['relic', 2], ['merchant', 1.4], ['special', 1]];

export function hash(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}
export function rngOf(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hash(String(seed));
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pickW = (rnd, list) => { const tot = list.reduce((a, [, w]) => a + w, 0); let x = rnd() * tot; for (const [k, w] of list) { x -= w; if (x < 0) return k; } return list[0][0]; };

// Deux chemins différents pour la salle « step » (1 à 9)
export function pathChoices(seed, step) {
  if (step >= HUNT.rooms) return ['boss'];
  const rnd = rngOf(`${seed}:path:${step}`);
  // pas de marchand ni de rencontre singulière tout de suite, et un combat est toujours proposé à la salle 1
  const pool = WEIGHTS.filter(([k]) => step > 1 || (k !== 'merchant' && k !== 'special'));
  const a = step === 1 ? 'combat' : pickW(rnd, pool);
  let b = pickW(rnd, pool.filter(([k]) => k !== a));
  return [a, b];
}
// Reliques proposées (sans celles déjà portées)
export function relicOffer(seed, tag, owned = [], n = 2) {
  const rnd = rngOf(`${seed}:relic:${tag}`);
  const pool = RELIC_KEYS.filter((k) => !owned.includes(k));
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}
export const bossOfHunt = (seed) => BOSS_ORDER[hash(`${seed}:boss`) % BOSS_ORDER.length];
// Butin d'éclats d'une salle de combat
export const combatLoot = (step, room) => Math.round((12 + 4 * step) * (room === 'boss' ? 3 : room === 'special' ? 2 : 1));

// Marchand : prix (la Lanterne des Noyés les augmente de 25 %)
export const SHOP = {
  heal:   { name: 'Onguent', desc: 'Toute l’équipe récupère 35 % de ses PV.', price: 35 },
  revive: { name: 'Souffle des noyés', desc: 'Une créature tombée se relève avec la moitié de ses PV.', price: 60 },
  relic:  { name: 'Relique', desc: 'Achète l’une des reliques du marchand.', price: 80 },
  passeur: { name: 'Le Passeur', desc: 'Met tout ton butin en jeu à l’abri, contre 15 % de ce butin.', price: 0 },
};
export const shopPrice = (k, relics = []) => Math.round(SHOP[k].price * (relics.includes('lanterne') ? 1.25 : 1));

// Événements : chaque choix a des effets simples, appliqués par game.js.
// Effets : heal (part des PV), hurt (part des PV, sans tuer), loot (éclats en jeu), relic (une relique au hasard),
// lose (perdre la dernière relique), fervor (Ferveur), secure (mettre le butin à l'abri), risk (pile ou face).
export const EVENTS = [
  { key: 'fontaine', title: 'La fontaine noire', text: 'Une eau sombre coule d’une vasque fendue. Elle sent le fer et la menthe.',
    choices: [{ label: 'Boire', effect: { heal: 0.35 }, desc: 'L’équipe récupère 35 % de ses PV.' }, { label: 'Remplir les gourdes et repartir', effect: { fervor: 2 }, desc: '+2 Ferveur.' }] },
  { key: 'autel', title: 'L’autel des offrandes', text: 'Un autel couvert de pièces fondues. Une voix demande « un peu de toi ».',
    choices: [{ label: 'Offrir ton sang', effect: { hurt: 0.2, relic: 1 }, desc: 'L’équipe perd 20 % de ses PV ; tu reçois une relique.' }, { label: 'Passer ton chemin', effect: {}, desc: 'Rien ne se passe.' }] },
  { key: 'pendu', title: 'Le pendu qui parle', text: 'Un squelette pendu te propose un pari : « Pile, je double ton butin. Face, je le garde. »',
    choices: [{ label: 'Parier la moitié de ton butin en jeu', effect: { risk: 0.5 }, desc: 'Une chance sur deux de gagner autant, ou de le perdre.' }, { label: 'Refuser', effect: {}, desc: 'Rien ne se passe.' }] },
  { key: 'coffre', title: 'Le coffre qui respire', text: 'Un coffre se soulève doucement, comme une poitrine endormie.',
    choices: [{ label: 'L’ouvrir', effect: { loot: 40, hurt: 0.15 }, desc: '+40 éclats en jeu, mais il mord : −15 % de PV.' }, { label: 'Le laisser dormir', effect: { fervor: 1 }, desc: '+1 Ferveur.' }] },
  { key: 'sanctuaire', title: 'Le sanctuaire oublié', text: 'Une petite chapelle intacte. Ici, rien ne peut t’atteindre.',
    choices: [{ label: 'Y déposer ton butin', effect: { secure: 1 }, desc: 'Ton butin en jeu est mis à l’abri.' }, { label: 'Prier', effect: { heal: 0.2, fervor: 1 }, desc: '+20 % de PV et +1 Ferveur.' }] },
  { key: 'collectionneur', title: 'Le collectionneur de reliques', text: 'Un vieil homme aux doigts bagués lorgne tes reliques. « Je t’en donne un bon prix. »',
    choices: [{ label: 'Vendre ta dernière relique', effect: { lose: 1, loot: 70 }, desc: 'Tu perds ta dernière relique ; +70 éclats en jeu.', needRelic: true }, { label: 'Refuser', effect: {}, desc: 'Rien ne se passe.' }] },
  { key: 'brume', title: 'La brume des souvenirs', text: 'Une brume tiède. Tes créatures y revoient leurs anciens combats.',
    choices: [{ label: 'Avancer dans la brume', effect: { fervor: 3, hurt: 0.1 }, desc: '+3 Ferveur, −10 % de PV.' }, { label: 'La contourner', effect: { heal: 0.1 }, desc: '+10 % de PV.' }] },
  { key: 'miroir', title: 'Le miroir brisé', text: 'Un éclat de miroir montre ton équipe… plus forte, ou plus morte.',
    choices: [{ label: 'Le toucher', effect: { relic: 1, hurt: 0.3 }, desc: 'Une relique, mais −30 % de PV.' }, { label: 'Le briser', effect: { loot: 25 }, desc: '+25 éclats en jeu.' }] },
];
export const EVENT = Object.fromEntries(EVENTS.map((e) => [e.key, e]));
export const eventOf = (seed, step) => EVENTS[hash(`${seed}:event:${step}`) % EVENTS.length].key;
export const COFFRE_HUNT = 'or'; // coffre du Gardien du Reliquaire

export { RELICS, RELIC_KEYS, RELIC_MAX };
