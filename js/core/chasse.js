// v858 : La Grande Chasse (idée retenue par le propriétaire le 27 octobre 2026). Chaque semaine (lundi → dimanche), un
// monstre colossal se dresse pour TOUS les joueurs. Il combat seul, sans serviteurs, avec des pouvoirs écrasants. Chaque
// joueur l'affronte une fois par jour : le combat dure HUNT.rounds tours (ou jusqu'à ce que ton équipe tombe), et tous les
// dégâts infligés s'ajoutent à ceux des autres joueurs, comptés par le serveur de partie (table `chasse_*`, supabase/20).
// Si la bête tombe avant la fin de la semaine, chaque chasseur reçoit sa part du butin.
// Les monstres sont des fiches de gardien (BOSSES) : le moteur de combat (duel.js) les joue comme les autres gardiens.
import { BOSSES } from './bosses.js';
import { weekIndex } from './boosters.js';

// Réglages (mesurés par simulation, tools/chasse-sim.mjs)
export const HUNT = {
  rounds: 8,        // tours du combat : au-delà, la bête se détourne (le combat s'arrête, les dégâts comptent)
  fury: 4,          // tour où la bête entre en Furie (pouvoirs plus fréquents, passifs plus durs)
  hp: 14,           // PV : ×14 un gardien de la force de l'équipe (elle ne tombe jamais en un seul combat)
  atk: 1.8,         // ATQ : ×1,8 un gardien de la force de l'équipe
  floorGap: 14,     // la bête frappe comme un gardien 14 étages plus profond que la force de l'équipe
  perHunter: 350,   // PV ajoutés à la bête de la semaine par chaque nouveau chasseur (SQL : chasse_add ; mesure : 25 à 150 dégâts par combat)
  baseHp: 600,      // PV de départ de la bête de la semaine
  fightShards: 60,  // éclats de chaque combat de la Chasse
};

// Butin de la semaine, si la bête est tombée (réclamé une fois, vérifié par le serveur)
export const HUNT_LOOT = {
  base: { chests: { or: 1 }, shards: 200 },                    // tout chasseur (au moins un combat)
  faithful: { days: 4, reward: { tickets: { premium: 1 } } },  // au moins 4 jours de chasse cette semaine
  top: { n: 10, reward: { chests: { abyssal: 1 }, title: 'Fléau des Colosses' } }, // les 10 plus gros dégâts
};

const H = (o) => ({ ...o, hunt: true });
export const HUNT_BOSSES = {
  'h-leviathan': H({ name: 'Le Léviathan Noir', title: 'Celui qui boit les océans', card: 'ABY-046', faction: 'abyssal',
    intro: 'La salle se remplit d’une eau noire qui monte sans bruit. Au loin, un œil grand comme une porte s’ouvre.',
    mechanic: 'La Marée noire ronge tes créatures à chaque tour. Il chante une Complainte qui frappe toute ton équipe et te vole ta Ferveur, puis dévore ta créature la plus vigoureuse. En Furie, la nuit tombe : la morsure de l’eau double.',
    counter: 'Garde peu de Ferveur avant sa Complainte, brise-le pendant qu’il chante.',
    passive: ['tide'], furyPassive: ['night'],
    pattern: (phase, round) => (round % 3 === 1 ? 'chant' : round % 3 === 2 ? 'gorge' : 'tick2') }),
  'h-hydre': H({ name: 'L’Hydre Mère', title: 'Chaque tête tranchée en fait pousser deux', card: 'SAU-044', faction: 'sauvage',
    intro: 'Neuf cous se dressent d’un marais de sang. Neuf gueules sifflent ton nom en même temps.',
    mechanic: 'Elle se régénère et la marée de son marais ronge tes créatures à chaque tour. Ses têtes frappent deux ou trois fois de suite, et son essaim empoisonne toute ton équipe. En Furie, chaque tour lui donne +1 ATQ et la nuit dévore tes créatures.',
    counter: 'Brise-la : brisée, elle ne se régénère plus. Tes Soigneurs purifient le poison.',
    passive: ['regen', 'tide'], furyPassive: ['forge', 'night'],
    pattern: (phase, round) => (round % 3 === 1 ? 'brood' : phase === 2 && round % 2 === 0 ? 'flurry' : 'tick2') }),
  'h-colosse': H({ name: 'Le Colosse d’Obsidienne', title: 'La montagne qui marche', card: 'PRI-046', faction: 'primordial',
    intro: 'Le plafond tremble. Ce que tu prenais pour une montagne se lève, et te regarde.',
    mechanic: 'Sa forge intérieure lui donne +1 ATQ à chaque tour. Il charge des coups qui écrasent, enchaîne ta créature la plus forte et fait pleuvoir la roche sur toute ton équipe. En Furie, la nuit ronge tes créatures.',
    counter: 'Interromps ses charges par le gel ou la Brisure ; un Protecteur encaisse le coup chargé.',
    passive: ['forge'], furyPassive: ['night'],
    pattern: (phase, round) => (round % 3 === 1 ? 'charge' : round % 3 === 2 ? 'chain' : phase === 2 ? 'flurry' : 'channel') }),
  'h-tiamat': H({ name: 'Tiamat, Mère des Monstres', title: 'Le chaos avant le monde', card: 'PRI-048', faction: 'primordial',
    intro: 'Cinq têtes de dragon s’ouvrent l’une après l’autre. Chacune crache une couleur que tu n’as jamais vue.',
    mechanic: 'Elle condamne ta créature la plus affaiblie puis l’exécute, dévore ta plus vigoureuse et souffle une déflagration sur toute ton équipe. La marée du chaos ronge tes créatures ; en Furie, elle gagne +1 ATQ à chaque tour.',
    counter: 'Mets la condamnée en réserve ou en défense ; brise Tiamat pendant qu’elle concentre son souffle.',
    passive: ['tide'], furyPassive: ['forge'],
    pattern: (phase, round) => (round % 3 === 1 ? 'sentence' : round % 3 === 2 ? 'channel' : 'gorge') }),
  'h-fenrir': H({ name: 'Fenrir, le Loup du Crépuscule', title: 'Il a mangé le soleil', card: 'SAU-049', faction: 'sauvage',
    intro: 'Les chaînes qui le tenaient pendent, brisées. Le loup n’a plus faim de viande : il a faim de lumière.',
    mechanic: 'Il désigne une proie, se cache puis bondit sur ta créature la plus affaiblie, et lacère en rafales. Chaque tour lui donne +1 ATQ et la marée de sang ronge tes créatures ; en Furie, il se régénère et la nuit dévore ton équipe.',
    counter: 'Protège ou retire la proie ; la Marque le révèle quand il se cache.',
    passive: ['forge', 'tide'], furyPassive: ['regen', 'night'],
    pattern: (phase, round) => (round % 4 === 1 ? 'hunt' : round % 2 === 0 ? 'ambush' : 'flurry') }),
  'h-moloch': H({ name: 'Moloch, le Dieu-Fournaise', title: 'Il exige toujours plus', card: 'INF-055', faction: 'infernal',
    intro: 'Une statue de bronze ouvre ses bras brûlants. Dans son ventre, un feu qui n’a jamais été rassasié.',
    mechanic: 'La nuit de la fournaise dévore tes créatures à chaque tour. Il t’accorde un vœu puis réclame son prix sur toute ton équipe et s’en soigne ; il condamne et exécute. En Furie, il gagne +1 ATQ à chaque tour.',
    counter: 'Profite du vœu pour le briser avant le prix ; mets la condamnée à l’abri.',
    passive: ['night'], furyPassive: ['forge'],
    pattern: (phase, round) => (round % 3 === 1 ? 'wish' : round % 3 === 2 ? 'sentence' : 'tick2') }),
  'h-apophis': H({ name: 'Apophis, le Serpent du Chaos', title: 'Il avale la lumière chaque nuit', card: 'PRI-049', faction: 'primordial',
    intro: 'Un anneau d’écailles noires fait le tour de la salle. Puis un deuxième. La tête, tu ne la vois pas encore.',
    mechanic: 'Il se régénère, la marée du chaos ronge tes créatures, il dresse un miroir qui renvoie ton prochain coup, empoisonne sans relâche et lâche un essaim sur toute ton équipe. En Furie, la nuit dévore ton équipe.',
    counter: 'Frappe avec le poison quand le miroir est dressé ; brise-le pour couper sa régénération.',
    passive: ['regen', 'tide'], furyPassive: ['night'],
    pattern: (phase, round) => (round % 3 === 1 ? 'mirror' : round % 3 === 2 ? 'brood' : phase === 2 ? 'flurry' : 'poison') }),
  'h-horloge': H({ name: 'Le Dragon d’Horlogerie', title: 'Le temps est son armure', card: 'ART-041', faction: 'artificiel',
    intro: 'Mille engrenages s’emboîtent dans un vacarme de cloches. Un dragon de laiton déploie des ailes faites d’aiguilles.',
    mechanic: 'Il remonte le temps pour effacer tes coups, frappe deux fois de suite, enchaîne ta créature la plus forte. Chaque tour lui donne +1 ATQ ; en Furie, la nuit ronge tes créatures.',
    counter: 'Brise-le ou gèle-le pendant qu’il remonte le temps : sinon tes dégâts s’effacent.',
    passive: ['forge'], furyPassive: ['night'],
    pattern: (phase, round) => (round % 4 === 1 ? 'wind' : round % 2 === 0 ? 'tick2' : 'chain') }),
};
Object.assign(BOSSES, HUNT_BOSSES);
export const HUNT_ORDER = Object.keys(HUNT_BOSSES);
// Monstres dont l'image Gemini est arrivée (assets/bosses/combat-<clé>.webp) ; les autres prennent l'illustration de leur carte
export const HUNT_ART = new Set([]);
export const PASSIVES = {
  aura: { name: 'Présence écrasante', desc: 'Toutes les bêtes de la Chasse : à chaque tour, tes créatures au combat perdent 9 % de leurs PV (14 % en Furie). Ça peut être mortel.' },
  tide: { name: 'Marée noire', desc: 'Ronge tes créatures au combat à chaque tour (4 % de leurs PV, jamais mortel).' },
  night: { name: 'Nuit dévorante', desc: 'Dévore tes créatures au combat à chaque tour (8 % de leurs PV, jamais mortel).' },
  forge: { name: 'Rage montante', desc: '+1 ATQ à chaque tour où elle n’est pas brisée.' },
  regen: { name: 'Régénération', desc: 'Récupère 2 % de ses PV à chaque tour où elle n’est pas brisée.' },
};

// Semaine de la Chasse (lundi → dimanche, heure du joueur) et sa bête
export const huntWeek = (date) => weekIndex(date);
export const huntBossOf = (week) => HUNT_ORDER[((week % HUNT_ORDER.length) + HUNT_ORDER.length) % HUNT_ORDER.length];
// Récompense de la semaine (la bête est tombée), selon la participation du joueur
export function huntLoot({ days = 0, rank = 0 } = {}) {
  if (!days) return null;
  const r = { chests: { ...HUNT_LOOT.base.chests }, shards: HUNT_LOOT.base.shards };
  if (days >= HUNT_LOOT.faithful.days) r.tickets = { ...HUNT_LOOT.faithful.reward.tickets };
  if (rank && rank <= HUNT_LOOT.top.n) { for (const [k, n] of Object.entries(HUNT_LOOT.top.reward.chests)) r.chests[k] = (r.chests[k] || 0) + n; r.title = HUNT_LOOT.top.reward.title; }
  return r;
}
