// ABYSSAL : données du combat tactique (aucune logique d'affichage).
// Chaque rôle a un kit réutilisable : attaque de base, compétence signature, passif.
// Les créatures héritent du kit de leur rôle ; rareté et niveau changent les chiffres.
import { roleOf } from './army.js';

// ——— Ressources du joueur ———————————————————————————————————————————
export const AP_MAX = 3;          // points d'action d'équipe par tour
export const FERVOR_CARRY = 3;    // Ferveur gardée au plus d'un combat à l'autre
export const FERVOR_MAX = 6;      // Ferveur : jauge commune, gardée d'un combat à l'autre
export const FERVOR_START = 2;    // au début d'une expédition
export const ACTS_PER_UNIT = 2;   // une créature agit au plus 2 fois par tour
export const ULT_COST = { ap: 1, fervor: FERVOR_MAX }; // le pouvoir d'équipe vide la Ferveur
// v262 (à la Clair Obscur) : chaque créature joue à son tour, dans l'ordre d'initiative, et a ses propres PA.
export const PA_START = 2;        // PA de chaque créature au début du combat
export const PA_TURN = 1;         // +1 PA au début de chacun de ses tours
export const PA_MAX = 6;          // PA gardés au plus
export const PA_GAIN = 1;         // l'attaque et la défense rapportent 1 PA ; la parade parfaite aussi

// ——— Kits par rôle ——————————————————————————————————————————————————
// kw : nom de la capacité (compatibilité) ; basic : attaque de base ; skill : compétence signature ;
// passive : passif ou réaction. target : 'enemy' | 'ally' | 'none'. dice : jet de D20 (dc : difficulté).
// v348 : une seule table des difficultés de jet (DD), lue par le moteur (duel.js) et par les descriptions ci-dessous
export const DICE_DC = { estoc: { base: 10, elite: 1, boss: 3 }, contagion: { base: 9, elite: 0, boss: 2 }, entrave: { base: 8, elite: 3, boss: 6 } };
const dcText = (k) => { const d = DICE_DC[k]; return `${d.base} ou plus${d.elite ? ` ; +${d.elite} contre une élite` : ''}, +${d.boss} contre un gardien`; };
export const KITS = {
  protecteur: {
    kw: 'garde', name: 'Protecteur', icon: 'shield',
    basic: { name: 'Coup de bouclier', desc: 'Dégâts normaux, +1 Brisure en plus.' },
    skill: { key: 'rempart', pa: 1, name: 'Rempart', icon: 'shield', ap: 1, fervor: 1, target: 'ally', desc: 'Jusqu’à ton prochain tour, protège un allié : les coups qui le visent la frappent à sa place, et elle en prend 40 % de moins.' },
    passive: { name: 'Riposte', desc: 'Les ennemis doivent la viser en premier (sauf les assassins). Chaque coup qu’elle encaisse charge sa riposte (3 au plus) : sa prochaine attaque fait +1 dégât et +1 Brisure par charge. Son attaque est un coup de rupture. Après une parade parfaite, elle contre-attaque.' },
  },
  degats: {
    kw: 'assaut', name: 'Attaquant', icon: 'swords',
    basic: { name: 'Frappe', desc: 'Dégâts normaux.' },
    skill: { key: 'estoc', pa: 2, name: 'Coup d’estoc', icon: 'swords', ap: 2, fervor: 2, target: 'enemy', dice: { dc: DICE_DC.estoc.base }, desc: `Coup de rupture. Jet de D20 (${dcText('estoc')}). Réussite : dégâts ×2, +3 Brisure, et la cible est marquée. Critique : ×3 et +4 Brisure. Partielle : ×1,2. Échec critique : moitié des dégâts, et ta créature est déséquilibrée (+25 % de dégâts subis).` },
    passive: { name: 'Achèvement', desc: '+50 % de dégâts sur une cible brisée ou sous 30 % de ses PV. Contre-attaque après une parade parfaite.' },
  },
  soin: {
    kw: 'soin', name: 'Soigneur', icon: 'heart',
    basic: { name: 'Frappe', desc: 'Dégâts normaux.' },
    skill: { key: 'priere', pa: 2, name: 'Prière', icon: 'heart', ap: 1, fervor: 2, target: 'ally', desc: 'Soigne un allié de 30 % de ses PV maximum ; ce qui dépasse devient un bouclier (20 % de ses PV max au plus). Le libère du poison et du gel (+1 PA s’il en avait).' },
    passive: { name: 'Souffle de vie', desc: 'À la fin de ton tour, soigne un peu l’allié le plus blessé.' },
  },
  poison: {
    kw: 'venin', name: 'Empoisonneur', icon: 'skull',
    basic: { name: 'Morsure', desc: 'Dégâts normaux et +2 poison. Traverse les boucliers.' },
    skill: { key: 'contagion', pa: 2, name: 'Contagion', icon: 'skull', ap: 1, fervor: 2, target: 'enemy', dice: { dc: DICE_DC.contagion.base }, desc: `Jet de D20 (${dcText('contagion')}). Réussite : le poison de la cible double et se propage à ses voisins. Critique : à tous les ennemis. Partielle : double seulement sur la cible. Une cible saine reçoit d’abord 3 poison.` },
    passive: { name: 'Givre-venin', desc: 'Sur une cible gelée, le poison appliqué est doublé.' },
  },
  controle: {
    kw: 'gel', name: 'Entraveur', icon: 'eye',
    basic: { name: 'Morsure du froid', desc: 'Dégâts normaux, +2 Brisure sur une cible gelée.' },
    skill: { key: 'entrave', pa: 2, name: 'Entrave glaciale', icon: 'eye', ap: 1, fervor: 2, target: 'enemy', dice: { dc: DICE_DC.entrave.base }, desc: `Jet de D20 (${dcText('entrave')} ; bonus selon la rareté : Rare +1, Hyper rare +2, Mythique +3, Secrète +4). Réussite : la cible est gelée et perd sa prochaine action (sa charge est annulée). Critique : gelée et +3 Brisure ; une Mythique ou Secrète la gèle 2 tours (sauf élites et gardiens). Partielle : elle recule de 2 places dans l’ordre du tour (1 pour un gardien) ; si elle a déjà joué, elle est ralentie.` },
    passive: { name: 'Éclats de givre', desc: 'Tes coups sur une cible gelée font +2 Brisure.' },
  },
  soutien: {
    kw: 'cri', name: 'Soutien', icon: 'sparkle',
    basic: { name: 'Frappe', desc: 'Dégâts normaux.' },
    skill: { key: 'marque', pa: 1, name: 'Marque du chasseur', icon: 'sparkle', ap: 1, fervor: 1, target: 'enemy', desc: 'Marque un ennemi : le prochain coup d’une AUTRE de tes créatures fait +50 % de dégâts et +2 Brisure, puis la Marque part (2 tours au plus). +3 à tes jets de dés contre lui, et sa faiblesse est révélée.' },
    passive: { name: 'Cri de guerre', desc: 'Au début de chaque tour, tes créatures au combat gagnent +1 en attaque. Hâte (2 PA, une fois par tour) : une de tes créatures joue juste après elle.' },
  },
  zone: {
    kw: 'deferlante', name: 'Fléau', icon: 'flame',
    basic: { name: 'Vague', desc: 'Touche aussi les voisins de la cible (moitié des dégâts).' },
    skill: { key: 'raz', pa: 3, name: 'Raz-de-marée', icon: 'flame', ap: 2, fervor: 3, target: 'none', desc: 'Coup de rupture. Frappe tous les ennemis au combat (70 % de son attaque), +1 Brisure à chacun, et consomme toutes les Marques. Un ennemi à 6 poisons ou plus détone (poison × 1,5).' },
    passive: { name: 'Marée montante', desc: 'Renforcée par un Cri de guerre, sa Vague frappe les voisins à pleine puissance.' },
  },
};
export const kitOf = (card) => KITS[roleOf(card)];
// Compatibilité : nom court de la capacité (Garde, Assaut…) affiché partout dans le jeu
export const KEYWORDS = Object.fromEntries(Object.values(KITS).map((k) => [k.kw, { name: k.name, icon: k.icon, desc: `${k.passive.desc} Compétence : ${k.skill.name}.` }]));
export const keywordOf = (card) => kitOf(card).kw;

// Actions communes à toutes les créatures
export const COMMON_ACTS = {
  attack: { name: 'Attaque', icon: 'swords', ap: 1, fervor: 0, target: 'enemy', desc: 'Dégâts fiables. +1 PA, +1 Ferveur.' },
  defend: { name: 'Défense', icon: 'shield', ap: 1, fervor: 0, target: 'none', desc: 'Jusqu’à son prochain tour, elle subit 50 % de dégâts en moins. +1 PA.' },
  swap:   { name: 'Permuter', icon: 'back', ap: 1, fervor: 0, target: 'reserve', desc: 'Une créature de la réserve prend sa place et joue tout de suite (une fois par tour). PV, PA et états sont conservés.' },
};

// ——— Jets de dés (D20) ——————————————————————————————————————————————
// 1 naturel : échec critique · total < DD : réussite partielle · total ≥ DD : réussite · 20 naturel : critique.
export const DICE_TIERS = {
  fumble:  { name: 'Échec critique', color: '#FF4D6A' },
  partial: { name: 'Réussite partielle', color: '#F2A54E' },
  success: { name: 'Réussite', color: '#7FE0A0' },
  crit:    { name: 'Réussite critique', color: '#F2C14E' },
};
export function diceChance(dc, mod) {
  let ok = 1; // le 20 naturel réussit toujours
  for (let r = 2; r <= 19; r++) if (r + mod >= dc) ok++;
  return Math.round((ok / 20) * 100);
}

// ——— Faiblesses : chaque faction craint une autre faction ——————————————
// (affichées une fois découvertes : en l'exploitant, ou grâce à la Marque)
export const WEAK_TO = {
  sauvage: 'infernal',     // le feu dévore la forêt
  infernal: 'abyssal',     // l'eau noire éteint les braises
  abyssal: 'artificiel',   // la foudre des machines traverse les eaux
  artificiel: 'primordial', // les forces premières rouillent le métal
  primordial: 'sauvage',   // la vie dompte le chaos
  celeste: 'necrotique',   // la mort ternit la lumière
  necrotique: 'celeste',   // la lumière brûle les morts
};
export const WEAK_MULT = 1.5, RESIST_MULT = 0.75; // une créature résiste à sa propre faction

// ——— Familles de comportement des ennemis ————————————————————————————
export const AI_FAMILIES = {
  predateur:  { name: 'Prédateur', desc: 'Attaque la créature la plus blessée.', counter: 'Soigne ou protège ta créature blessée, ou mets-la en réserve.' },
  assassin:   { name: 'Assassin', desc: 'Ignore les Protecteurs et vise la créature la plus fragile.', counter: 'Protège ta créature fragile avec un Rempart ou une Défense.' },
  berserker:  { name: 'Berserker', desc: 'Frappe plus fort quand il perd des PV (+50 % sous la moitié).', counter: 'Achève-le d’un coup, ou gèle-le.' },
  protecteur: { name: 'Garde du corps', desc: 'Couvre d’un bouclier l’allié qui prépare une attaque, sinon le plus blessé.', counter: 'Les Empoisonneurs traversent ses boucliers.' },
  mage:       { name: 'Mage', desc: 'Concentre son énergie, puis frappe toute ton équipe.', counter: 'Gèle-le pendant sa concentration, ou prépare une parade.' },
  parasite:   { name: 'Parasite', desc: 'Empoisonne ta créature la plus dangereuse.', counter: 'La Prière purge le poison.' },
  controleur: { name: 'Contrôleur', desc: 'Gèle régulièrement ta créature la plus forte.', counter: 'Esquive son sort, ou garde un Soigneur pour la libérer.' },
  soutien:    { name: 'Instigateur', desc: 'Soigne, renforce les autres ennemis, ou leur désigne une proie.', counter: 'Abats-le en premier, ou mets la proie désignée en réserve.' },
  gardien:    { name: 'Gardien', desc: 'Prépare des attaques dévastatrices annoncées.', counter: 'Brise sa garde ou interromps sa charge.' },
};
export function aiFamily(card, { boss = false, uid = '' } = {}) {
  if (boss) return 'gardien';
  const r = roleOf(card);
  if (r === 'degats') { let h = 0; for (const ch of card.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return ['predateur', 'assassin', 'berserker'][h % 3]; }
  return { protecteur: 'protecteur', soin: 'soutien', poison: 'parasite', controle: 'controleur', soutien: 'soutien', zone: 'mage' }[r] || 'predateur';
}

// Intentions ennemies (annoncées au début de ton tour)
// qte : déclenche la défense active ; danger : 1 à 3.
export const INTENTS = {
  hit:     { name: 'Attaque',        icon: 'swords',  desc: 'Frappe la cible annoncée.' },
  heavy:   { name: 'Coup chargé',    icon: 'skull',   desc: 'Frappe la cible annoncée avec plus de deux fois sa force.' },
  charge:  { name: 'Se charge',      icon: 'sparkle', desc: 'N’attaque pas ce tour-ci : coup chargé au tour suivant. Gèle-le ou brise-le pour l’interrompre.' },
  channel: { name: 'Concentration',  icon: 'sparkle', desc: 'Prépare une attaque sur toute ton équipe pour le tour suivant.' },
  blast:   { name: 'Déflagration',   icon: 'flame',   desc: 'Frappe toutes tes créatures au combat.' },
  shield:  { name: 'Protection',     icon: 'shield',  desc: 'Donne un bouclier à un allié (bloque un coup).' },
  heal:    { name: 'Soin',           icon: 'heart',   desc: 'Soigne l’ennemi le plus blessé.' },
  hunt:    { name: 'Désigne une proie', icon: 'eye', desc: 'Désigne ta créature la plus affaiblie : pendant 2 tours, tous les ennemis la visent et lui font +20 % de dégâts. Mets-la en réserve ou protège-la.' },
  rally:   { name: 'Renfort',        icon: 'sparkle', desc: 'Les autres ennemis gagnent +2 en attaque pour ce tour.' },
  poison:  { name: 'Empoisonnement', icon: 'skull',   desc: 'Frappe et empoisonne la cible (+3 poison).' },
  frost:   { name: 'Sort de gel',    icon: 'eye',     desc: 'Gèle la cible : elle ne pourra pas agir à ton prochain tour.' },
  gorge:    { name: 'Dévorer',        icon: 'skull',   desc: 'Arrache des PV à la cible (plus d’une fois et demie sa force) et s’en nourrit. Chaque festin réussi lui donne +1 ATQ (+2 en phase 2). Gel ou Brisure l’interrompent.' },
  gather:   { name: 'Le froid monte', icon: 'sparkle', desc: 'N’attaque pas ce tour-ci : Tempête de givre au tour suivant. Gel ou Brisure l’interrompent.' },
  blizzard: { name: 'Tempête de givre', icon: 'flame', desc: 'Frappe toute ton équipe et gèle ta créature la plus forte (deux en phase 2).' },
  mimic:    { name: 'Copie',          icon: 'eye',     desc: 'Observe ton équipe : au tour suivant, il retourne contre toi la compétence annoncée. Gel ou Brisure l’interrompent.' },
  copy:     { name: 'Imitation',      icon: 'skull',   desc: 'Utilise contre toi la compétence copiée.' },
  decree:   { name: 'Décret',         icon: 'sparkle', desc: 'Impose une nouvelle Loi qui change les règles du combat à partir de ton prochain tour.' },
  shift:    { name: 'Bascule',        icon: 'sparkle', desc: 'Change d’aspect : ses faiblesses et résistances s’inversent à partir de ton prochain tour.' },
  brood:    { name: 'La ruche s’éveille', icon: 'sparkle', desc: 'N’attaque pas ce tour-ci : Essaim au tour suivant. Gel ou Brisure l’interrompent.' },
  swarm:    { name: 'Essaim',         icon: 'skull',   desc: 'Frappe toute ton équipe et empoisonne chaque créature (+3 poison, +5 en phase 2).' },
  sentence: { name: 'Sentence',       icon: 'eye',     desc: 'Condamne ta créature la plus affaiblie : il l’exécutera au tour suivant. Permute-la en réserve, défends-la, ou brise-le.' },
  execute:  { name: 'Coup de hache',  icon: 'skull',   desc: 'Frappe la condamnée avec deux fois sa force (trois fois si elle a perdu la moitié de ses PV). Si elle tombe, il gagne +3 ATQ.' },
  chant:    { name: 'Chant des noyés', icon: 'sparkle', desc: 'N’attaque pas ce tour-ci : Complainte au tour suivant. Gel ou Brisure l’interrompent.' },
  lament:   { name: 'Complainte',     icon: 'flame',   desc: 'Frappe toute ton équipe, retire ses boucliers et ses bonus d’attaque, et te fait perdre 2 Ferveur.' },
  chain:    { name: 'Chaînes',        icon: 'eye',     desc: 'Frappe ta créature la plus forte et l’enchaîne : elle ne pourra pas agir à ton prochain tour.' },
  wind:     { name: 'Remonter le temps', icon: 'sparkle', desc: 'Au tour suivant, il retrouve les PV qu’il a maintenant (un quart de ses PV au plus). Gel ou Brisure l’interrompent.' },
  rewind:   { name: 'Retour en arrière', icon: 'heart', desc: 'Il retrouve les PV qu’il avait quand il a remonté le temps.' },
  tick2:    { name: 'Double tic',     icon: 'swords',  desc: 'Frappe deux fois de suite la cible annoncée.' },
  mirror:   { name: 'Miroir',         icon: 'shield',  desc: 'Le prochain coup que tu lui portes se retourne contre ton attaquant (60 % des dégâts). Le poison passe à travers.' },
  ambush:   { name: 'Embuscade',      icon: 'skull',   desc: 'Surgit de l’ombre et frappe ta créature la plus affaiblie avec plus de deux fois sa force.' },
  wish:     { name: 'Vœu exaucé',     icon: 'heart',   desc: 'Te donne 3 Ferveur et 1 PA à tes créatures. Au tour suivant, elle réclame son Prix sur toute ton équipe.' },
  price:    { name: 'Le Prix',        icon: 'flame',   desc: 'Frappe toute ton équipe ; la Dame se soigne de la moitié des dégâts.' },
  slumber:  { name: 'Il dort',        icon: 'sparkle', desc: 'Le Titan dort et ne fait rien. Chaque dégât que tu lui fais rendra son réveil plus violent.' },
  quake:    { name: 'Séisme',         icon: 'flame',   desc: 'Le Titan se réveille : frappe toute ton équipe, d’autant plus fort qu’il a été blessé pendant son sommeil.' },
  flurry:   { name: 'Rafale',         icon: 'swords',  desc: 'Frappe trois fois de suite la cible annoncée.' },
  grab:     { name: 'Étreinte',       icon: 'eye',     desc: 'Agrippe la cible : un coup, puis elle ne pourra pas agir à ton prochain tour si elle ne se libère pas.' },
  verdict:  { name: 'Verdict',        icon: 'eye',     desc: 'Interdit une action (attaquer, compétence ou se défendre) à toute ton équipe jusqu’à sa prochaine action.' },
};

// Pouvoirs des gardiens. weak : la capacité qui les contre. Phase 2 sous 50 % des PV.
export const BOSS_POWERS = {
  carapace: { name: 'Carapace', desc: 'Un tour sur deux, se couvre d’un bouclier qui bloque un coup (à chaque tour en phase 2).', weak: 'venin', counter: 'Les Empoisonneurs traversent sa carapace.' },
  givre:    { name: 'Souffle de givre', desc: 'Un tour sur deux, gèle ta créature la plus forte (à chaque tour en phase 2).', weak: 'soin', counter: 'Tes Soigneurs dégèlent tes créatures, et la Prière aussi.' },
  fureur:   { name: 'Fureur croissante', desc: 'Gagne +1 en attaque à chaque tour (+2 en phase 2).', weak: 'gel', counter: 'Gelé ou brisé, il ne gagne pas de fureur.' },
  devoreur: { name: 'Dévoreur', desc: 'Récupère 15 % de ses PV à chaque tour (20 % en phase 2).', weak: 'assaut', counter: 'Un coup d’Attaquant l’empêche de se soigner au tour suivant.' },
};
export const bossPowerOf = (floor) => ['carapace', 'givre', 'fureur', 'devoreur'][(Math.max(1, Math.floor(floor / 5)) - 1) % 4];

// ——— Combinaisons (affichées dans les règles et les fiches) ————————————
export const SYNERGIES = [
  { roles: ['soutien', 'degats'], name: 'Chasse', desc: 'Marque, puis le coup d’une autre créature : +50 % de dégâts et +2 Brisure. Avec le Coup d’estoc : +3 au jet en plus.' },
  { roles: ['controle', 'degats'], name: 'Bris de glace', desc: 'Un Coup d’estoc sur une cible gelée : +3 au jet et +2 Brisure.' },
  { roles: ['poison', 'zone'], name: 'Détonation', desc: 'Accumule 6 poisons ou plus, puis Raz-de-marée : le poison explose (× 1,5 en dégâts d’un coup).' },
  { roles: ['soutien', null], name: 'Hâte', desc: 'Le Soutien fait jouer une autre créature juste après lui : Marque, puis le gros coup tout de suite.' },
  { roles: ['controle', 'poison'], name: 'Givre-venin', desc: 'Le poison appliqué sur une cible gelée est doublé.' },
  { roles: ['poison', 'poison'], name: 'Épidémie', desc: 'Accumule le poison, puis Contagion pour le propager.' },
  { roles: ['protecteur', 'soin'], name: 'Bastion', desc: 'Rempart sur l’allié menacé, puis Prière : il est soigné et reçoit un bouclier. Chaque coup encaissé par le Protecteur charge sa riposte.' },
  { roles: ['soutien', 'zone'], name: 'Grande marée', desc: 'Renforcée par un Cri de guerre, la Vague frappe les voisins à pleine puissance.' },
  { roles: ['degats', null], name: 'Hallali', desc: 'Une cible brisée subit +50 % de dégâts, et l’Attaquant l’exécute (+50 % encore).' },
  { roles: ['protecteur', null], name: 'Coup de rupture', desc: 'Jauge de Brisure vide : l’ennemi est Fêlé. L’attaque d’un Protecteur, un Coup d’estoc, un Raz-de-marée ou un coup qui consomme une Marque le brise : son attaque annoncée est annulée.' },
  { roles: ['protecteur', null], name: 'Parade et riposte', desc: 'Parade parfaite : aucun dégât, +1 PA, +2 Ferveur, Brisure de l’attaquant, et contre-attaque des Protecteurs et des Attaquants.' },
];
export const synergiesFor = (role) => SYNERGIES.filter((s) => s.roles.includes(role) || s.roles[1] === null);

// ——— Bénédictions de combat (autel de la Descente) —————————————————————
export const COMBAT_BLESSINGS = {
  parade:  { name: 'Lame-miroir', desc: 'Chaque parade parfaite donne +1 Ferveur de plus et +1 Brisure.' },
  brise:   { name: 'Marteau de rupture', desc: 'Toutes tes attaques font +1 Brisure.' },
  venin:   { name: 'Fiole noire', desc: 'Le poison que tu appliques est augmenté de 1, et Contagion gagne +3 au jet.' },
  relais:  { name: 'Relais d’ombre', desc: 'Ta première permutation de chaque combat donne +2 PA à la créature qui entre.' },
  curee:   { name: 'Curée', desc: 'Tes attaques de base font +50 % de dégâts aux ennemis brisés.' },
  sursis:  { name: 'Sursis', desc: 'Une fois par combat, une créature qui devrait tomber survit à 1 PV avec un bouclier.' },
  des:     { name: 'Faveur du destin', desc: '+2 à tous tes jets de dés.' },
  ferveur: { name: 'Braise sacrée', desc: 'Chaque combat commence avec +1 Ferveur.' },
};

// ——— Talents d'expédition (récompense des élites) : un par créature, pour l'expédition en cours ———
// v253 : chaque talent change une règle du combat (plus de simples bonus de chiffres). Instinct et Carapace
// restent reconnus pour les expéditions en cours, mais ne sont plus proposés (legacy).
export const TALENTS = {
  brise:     { name: 'Brise-garde', desc: 'Ses attaques font +1 Brisure.' },
  garde:     { name: 'Garde d’airain', desc: 'Commence chaque combat avec un bouclier.' },
  sangsue:   { name: 'Sangsue', desc: 'Récupère 30 % des dégâts qu’elle inflige.' },
  epines:    { name: 'Épines', desc: 'Renvoie 2 dégâts à chaque ennemi qui la blesse.' },
  faim:      { name: 'Faim abyssale', desc: 'Quand elle achève un ennemi : +1 Ferveur de plus (une fois par combat).' },
  elan:      { name: 'Élan', desc: 'Quand elle achève un ennemi, chacune de tes créatures au combat gagne 1 PA (une fois par tour).' },
  remanence: { name: 'Rémanence', desc: 'La Marque et la Brèche qu’elle pose durent 1 tour de plus.' },
  rempart:   { name: 'Dernière muraille', desc: 'La première Brisure de chaque combat donne un bouclier à toute ton équipe au combat.' },
  vigilance: { name: 'Vigilance', desc: 'Ses attaques interrompent un ennemi qui se charge ou se concentre.' },
  ardente:   { name: 'Ferveur ardente', desc: 'Sa compétence signature coûte 1 PA de moins.' },
  tenacite:  { name: 'Ténacité', desc: 'La première fois qu’elle devrait tomber dans un combat, elle tient à 1 PV.' },
  perce:     { name: 'Perce-armure', desc: 'Ses attaques ignorent les boucliers.' },
  vif:       { name: 'Instinct', desc: '+2 en attaque.', legacy: true },
  robuste:   { name: 'Carapace', desc: '+25 % de PV maximum (et autant de soin).', legacy: true },
};
