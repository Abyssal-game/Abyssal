// Génère les 100 fiches de profils (J001 à J100), stables (graine fixe).
import fs from 'node:fs';
const dir = new URL('.', import.meta.url).pathname;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const r = rng(20261016);
const pick = (a) => a[Math.floor(r() * a.length)];
const between = (a, b) => a + Math.floor(r() * (b - a + 1));
const FACTIONS = ['infernal', 'abyssal', 'celeste', 'sauvage', 'necrotique', 'primordial', 'artificiel'];

const FAM = {
  A: { nom: 'Collectionneur', n: 20, motiv: ['compléter le Bestiaire', 'obtenir des Secrètes', 'admirer les illustrations', 'collectionner les finitions holo/or/cosmique', 'finir une faction préférée', 'avoir les cartes les plus rares à montrer'], pref: ['ouvertures de boosters', 'classeur et ensembles', 'fiches et récits des créatures', 'finitions et Sublimer'] },
  B: { nom: 'Stratège', n: 20, motiv: ['maîtriser les synergies', 'comprendre chaque passif', 'battre les gardiens avec des équipes originales', 'optimiser l’ordre d’initiative', 'trouver des contres', 'gagner aux Sceaux par le calcul'], pref: ['combats tactiques', 'composition d’équipe', 'Duels des Sceaux', 'lecture des intentions ennemies'] },
  C: { nom: 'Roguelite', n: 15, motiv: ['battre son record d’étage', 'prendre des risques (Maudite, Cauchemar)', 'découvrir des combinaisons de talents', 'vaincre tous les gardiens', 'le classement du jour'], pref: ['Descente', 'talents et bénédictions', 'Mode Cauchemar', 'Descente maudite'] },
  D: { nom: 'Occasionnel', n: 15, motiv: ['se détendre quelques minutes', 'récupérer les récompenses du jour', 'ouvrir un booster en passant', 'voir de jolies créatures', 'avoir un objectif simple'], pref: ['offrande et missions du jour', 'boosters gratuits', 'une expédition rapide', 'collection'] },
  E: { nom: 'Très investi', n: 10, motiv: ['optimiser la progression', 'monter toutes les cartes de l’équipe', 'top du classement', 'compléter tous les succès', 'rentabiliser chaque ressource'], pref: ['Descente profonde', 'Fournaise et niveaux', 'saisons et paliers', 'Sceaux (revanches implacables)'] },
  F: { nom: 'Univers et style', n: 10, motiv: ['l’atmosphère dark fantasy', 'les illustrations', 'les récits du Bestiaire', 'la musique et les sons', 'la mythologie des créatures'], pref: ['Bestiaire et Récits', 'fiches de cartes', 'ouvertures animées', 'royaumes et fragments'] },
  G: { nom: 'Sceptique', n: 10, motiv: ['trouver une raison de rester', 'juger la profondeur réelle', 'vérifier si le jeu respecte son temps', 'comparer avec les références du genre'], pref: ['examiner tous les modes', 'tester les limites', 'lire les probabilités', 'chercher les bugs'] },
};
const EXP = ['débutant (joue peu aux jeux vidéo)', 'intermédiaire', 'confirmé', 'expert (joue depuis l’enfance)'];
const MOBILE = ['quasi aucun jeu mobile', 'quelques jeux casual (match-3, puzzles)', 'joueur de gacha/collection (Pokémon TCG Pocket, Genshin…)', 'joueur de jeux de cartes (Hearthstone, Marvel Snap, Slay the Spire)', 'joueur de roguelites (Hades, Balatro, Slay the Spire)', 'touche-à-tout mobile'];
const CONTEXTE = ['étudiant(e), joue dans les transports', 'parent de jeunes enfants, joue le soir', 'employé(e) de bureau, joue à la pause déjeuner', 'retraité(e), beaucoup de temps libre', 'lycéen(ne) de 16 ans', 'travailleur(se) de nuit, sessions irrégulières', 'joueur(se) PC qui teste un jeu mobile', 'illustrateur(rice), sensible au dessin', 'fan de mythologie et de folklore', 'commercial(e) itinérant(e), sessions de 3 minutes', 'enseignant(e), joue le week-end', 'développeur(se), lit les règles en détail', 'infirmier(e) en horaires décalés', 'adolescent(e) compétitif(ve)', 'collectionneur(se) de cartes physiques', 'joueur(se) de jeux de rôle sur table'];
const RETOUR = { quotidien: 0.93, frequent: 0.75, irregulier: 0.5, weekend: 0.3 };
const SATIS = ['sentir une progression visible chaque jour', 'être surpris par une carte rare', 'gagner un combat serré grâce à une bonne décision', 'comprendre enfin une mécanique', 'voir sa collection se remplir', 'battre son record', 'une interface claire et rapide', 'des récompenses justes', 'une belle illustration', 'un défi à sa mesure', 'découvrir une histoire', 'des sessions qui finissent proprement'];
const ABANDON = ['trop de menus', 'progression trop lente de la collection', 'combats trop longs pour une pause', 'combats répétitifs', 'doublons sans intérêt', 'difficulté qui bloque', 'manque de nouveaux objectifs', 'règles mal expliquées', 'impression de déjà-vu', 'rien de nouveau après 2 semaines', 'textes trop nombreux', 'compte obligatoire au lancement', 'récompenses trop maigres', 'jeu trop facile', 'absence de multijoueur direct', 'bug ou incohérence'];

const out = [];
let id = 1;
for (const [k, F] of Object.entries(FAM)) {
  for (let i = 0; i < F.n; i++, id++) {
    const habit = k === 'E' ? pick(['quotidien', 'quotidien', 'frequent']) : k === 'D' ? pick(['quotidien', 'frequent', 'irregulier', 'irregulier', 'weekend']) : k === 'G' ? pick(['frequent', 'irregulier', 'irregulier']) : pick(['quotidien', 'frequent', 'frequent', 'irregulier', 'weekend']);
    const days = Array.from({ length: 30 }, (_, d) => (d === 0 ? true : habit === 'weekend' ? ([5, 6].includes((d + 1) % 7) ? r() < 0.85 : r() < 0.12) : r() < RETOUR[habit]));
    const minutes = k === 'D' ? between(4, 12) : k === 'E' ? between(45, 120) : k === 'G' ? between(10, 40) : between(10, 50);
    const exp = k === 'D' ? pick(EXP.slice(0, 2)) : k === 'E' || k === 'B' ? pick(EXP.slice(1)) : pick(EXP);
    const skill = { 'débutant (joue peu aux jeux vidéo)': 0.35, intermédiaire: 0.6, confirmé: 0.8, 'expert (joue depuis l’enfance)': 0.92 }[exp] ?? 0.6;
    const runsPerDay = minutes < 10 ? 1 : minutes < 25 ? between(1, 2) : minutes < 60 ? 3 : between(3, 5);
    const P = {
      id: `J${String(id).padStart(3, '0')}`, famille: k, familleNom: F.nom,
      contexte: pick(CONTEXTE), experience: exp, mobile: pick(MOBILE), preference: pick(F.pref), motivation: pick(F.motiv),
      toleranceDifficulte: pick(['faible', 'moyenne', 'élevée']), rapportCollection: k === 'A' ? pick(['passionné', 'complétionniste', 'chasseur de rareté']) : pick(['indifférent', 'curieux', 'apprécie', 'passionné']),
      interetStrategie: k === 'B' || k === 'E' ? pick(['élevé', 'très élevé']) : pick(['faible', 'moyen', 'élevé']), patienceTutoriels: pick(['lit tout', 'survole', 'saute tout', 'lit si bloqué']),
      minutesParJour: minutes, toleranceInterface: pick(['faible', 'moyenne', 'élevée']), attentesProgression: pick(['rapide et visible', 'régulière', 'lente mais méritée', 'objectifs à long terme']),
      habitudeRetour: habit, satisfaction: [pick(SATIS), pick(SATIS)].filter((x, j, a) => a.indexOf(x) === j), risquesAbandon: [pick(ABANDON), pick(ABANDON)].filter((x, j, a) => a.indexOf(x) === j),
      factionPreferee: pick(FACTIONS),
      // paramètres du simulateur (comportement mesuré par le moteur)
      seed: 1000 + id * 37, days, skill, parry: skill * 0.35, dodge: 0.3 + skill * 0.2, runsPerDay, freeRuns: k === 'E' || (k === 'C' && r() < 0.6),
      buy: k === 'A' ? pick(['standard', 'event', 'faction']) : k === 'F' ? pick(['standard', 'event']) : pick(['standard', 'standard', 'faction', 'save']), keepShards: pick([0, 0, 200, 600]),
      favFaction: null, furnace: k === 'D' ? r() < 0.4 : r() < 0.85, upgrade: k === 'D' ? r() < 0.4 : r() < 0.9, teamStyle: k === 'F' || k === 'A' ? pick(['auto', 'favoris']) : 'auto',
      door: pick(['fight', 'elite', 'fight', 'source', 'treasure']), cursed: k === 'C' ? 0.4 : k === 'E' ? 0.2 : 0.03, nightmare: k === 'C' || k === 'E' ? 0.6 : 0.1,
      retreatHp: pick([0.25, 0.35, 0.5]), prudence: k === 'C' ? 0.3 : pick([0.5, 0.8, 1]),
      sceauxPerDay: k === 'B' ? between(2, 5) : k === 'E' ? between(2, 4) : k === 'D' ? (r() < 0.3 ? 1 : 0) : between(0, 2), sceauxSkill: Math.max(1, Math.min(5, Math.round(skill * 5))), sceauxDaily: r() < 0.7,
    };
    P.favFaction = P.factionPreferee;
    out.push(P);
  }
}
fs.writeFileSync(dir + 'profils.json', JSON.stringify(out, null, 1));
console.log(out.length, 'profils ;', Object.entries(FAM).map(([k, f]) => `${k}=${f.n}`).join(' '));
