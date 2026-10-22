// v470 : ÉBAUCHE du pass de saison (« Le Codex de l'Abîme ») et de la boutique en argent réel (« L'Échoppe »).
// Caché : visible seulement en Mode Créateur, option « Codex et Échoppe » (`s.devCodex`). Rien ne se paie encore :
// les achats sont simulés (aperçu), le vrai paiement passera plus tard par l'App Store (identifiants `store`).
// Règle du propriétaire (17 octobre 2026) : en argent réel, seulement du cosmétique (cadres, dos de cartes, titres,
// pack fondateur, pass de saison) ; jamais d'éclats, de cendres, de coffres ni de boosters. La voie gratuite du Codex,
// elle, se gagne en jouant et peut donner éclats, cendres, coffres et tickets.

// ——— Réglages de la saison (à modifier ici) ———
export const CODEX = {
  name: 'Le Codex de l’Abîme',
  premiumName: 'Codex enluminé',
  tiers: 30,                             // nombre de paliers
  xpPerTier: 150,                        // points de Codex par palier (v550 : 150 pour une saison d'un mois : ≈ 18 jours pour un joueur très actif, ≈ un mois pour un joueur régulier)
  price: '4,99 €',                       // v548 : le Codex enluminé se paie en euros (décision du propriétaire), plus en obsidiennes
  store: 'com.abyssalgame.abyssal.codex',
};

// ——— v474 : la monnaie payante, les Obsidiennes (achetées en euros, dépensées seulement en cosmétiques) ———
// Règle : les joueurs gratuits gardent les cosmétiques simples (cadres dessinés en CSS, titres, dos de l'Abysse) gagnés
// en jouant ; les cosmétiques peints (cadres et dos Gemini) viennent du Codex enluminé ou de l'Échoppe, en obsidiennes.
export const OBS = { name: 'Obsidiennes', one: 'obsidienne' };
export const OBS_PACKS = [
  { id: 'obs-100', n: 100, bonus: 0, price: '0,99 €', store: 'com.abyssalgame.abyssal.obsidiennes.100' },
  { id: 'obs-500', n: 500, bonus: 100, price: '4,99 €', store: 'com.abyssalgame.abyssal.obsidiennes.500' },
  { id: 'obs-1000', n: 1000, bonus: 300, price: '9,99 €', store: 'com.abyssalgame.abyssal.obsidiennes.1000' },
  { id: 'obs-2000', n: 2000, bonus: 800, price: '19,99 €', store: 'com.abyssalgame.abyssal.obsidiennes.2000' },
];

// Points de Codex gagnés en jouant
export const CODEX_XP = {
  floor: 20,      // première victoire à un étage de la Descente
  boss: 60,       // première victoire contre un gardien (fin de chapitre)
  win: 5,         // toute autre victoire dans la Descente
  trial: 30,      // Épreuve du jour gagnée
  game: 15,       // partie gagnée dans le Cercle de l’Abysse
  mission: 15,    // mission du jour encaissée
};
export const CODEX_XP_LABEL = { floor: 'Étage franchi (1re fois)', boss: 'Gardien vaincu (1re fois)', win: 'Autre victoire dans la Descente', trial: 'Épreuve du jour gagnée', game: 'Partie gagnée dans le Cercle de l’Abysse', mission: 'Mission du jour' };

// Cosmétiques propres au Codex et à l'Échoppe (v472 : cadres peints par Gemini, assets/frames/<clé>.webp, posés par .pf-<clé>)
export const CODEX_FRAMES = {
    'cx-fondateur': 'Cadre du Fondateur',   /* v472 : réserve (saison II ou Échoppe), images prêtes dans assets/frames/ */
  'cx-os': 'Couronne d’ossements',   'cx-chaines': 'Cadre des chaînes forgées', 'cx-ruche': 'Cadre de la ruche d’ambre',
  /* v479 : catalogue de l'Échoppe (store/boutique-cosmetiques.md) : Nuit des Âmes, Hiver éternel, Cœurs maudits, les sept trônes, trophées des gardiens */
  'cx-lanternes': 'Cadre des lanternes d’âmes', 'cx-voile': 'Cadre du voile des trépassés',   /* v582 */ 'cx-vif-brasier': 'Cadre vivant du Brasier', 'cx-vif-givre': 'Cadre vivant du Givre éternel', 'cx-vif-abysse': 'Cadre vivant de l’Abysse', 'cx-vif-sang': 'Cadre vivant du Sang royal', 'cx-vif-foudre': 'Cadre vivant de la Foudre', 'cx-vif-ames': 'Cadre vivant des Âmes errantes', 'cx-vif-etoiles': 'Cadre vivant de la Voûte céleste', 'cx-vif-soleil-noir': 'Cadre vivant du Soleil noir', 'cx-vif-maree': 'Cadre vivant de la Marée luminescente', 'cx-vif-rouages': 'Cadre vivant des Rouages', /* v585 */ 'cx-vif-dragon': 'Cadre vivant du Dragon', 'cx-vif-phenix': 'Cadre vivant du Phénix', 'cx-vif-amethyste': 'Cadre vivant de l’Améthyste', 'cx-vif-kraken': 'Cadre vivant du Kraken', 'cx-vif-foret': 'Cadre vivant de la Forêt ancienne', 'cx-vif-nacre': 'Cadre vivant de la Nacre noire',   'cx-meute': 'Cadre de la meute',   'cx-eclipse': 'Cadre de l’Éclipse', 'cx-balance': 'Cadre du Juge des Sceaux',
  /* v480 */ 'cx-geode': 'Cadre de la géode d’améthyste', 'cx-pages': 'Cadre du grimoire déchiré', 'cx-corbeau': 'Cadre des corbeaux',   /* v550 : Saison I « La Nuit des Âmes » et Saison II « La Veillée de Noël » (images Gemini attendues) */
  'cx-citrouilles': 'Cadre des citrouilles sculptées', 'cx-ames': 'Couronne du Passeur des Âmes',
  'cx-noel': 'Couronne de la Veillée',
  /* v547 : Saison III « L'Hiver éternel », exclusifs de la voie enluminée (images Gemini attendues) */
  /* v565 : nouvelle image */ 'cx-hiver': 'Couronne de la Reine de l’Hiver',
  /* v552 : Saisons IV à XII (février à octobre 2027, images Gemini attendues) */
  'cx-coeur-maudit': 'Couronne du Cœur maudit',   /* v565 : remplacements après le tri du 21 octobre 2026 */   /* v532 */ 'cx-carnaval': 'Cadre du carnaval des ombres', 'cx-phalenes': 'Cadre des phalènes', };
// Dos de cartes (v473 : images Gemini, assets/backs/<clé>.webp, tools/back-art.py ; choisis au Profil)
export const CODEX_BACKS = { 'dos-codex': 'Dos du Codex', 'dos-abime': 'Dos de l’Abîme', 'dos-fondateur': 'Dos du Fondateur',
  /* réserve : collection « Les sept royaumes » (Échoppe ou saison II) */
  'dos-infernal': 'Dos du royaume Infernal', 'dos-abyssal': 'Dos du royaume Abyssal', 'dos-celeste': 'Dos du royaume Céleste', 'dos-sauvage': 'Dos du royaume Sauvage',
  'dos-necrotique': 'Dos du royaume Nécrotique', 'dos-primordial': 'Dos du royaume Primordial', 'dos-artificiel': 'Dos du royaume Artificiel',
  /* v480 : catalogue de l'Échoppe */ 'dos-ames': 'Dos de la Nuit des Âmes', 'dos-solstice': 'Dos du solstice noir', 'dos-roses': 'Dos des cœurs maudits', 'dos-lune-sang': 'Dos de la Lune de sang', 'dos-devoreur': 'Dos du Dévoreur', 'dos-eclipse': 'Dos de l’Éclipse', 'dos-horloger': 'Dos de l’Horloger', 'dos-miroirs': 'Dos de la Sorcière des Miroirs', 'dos-jumeaux': 'Dos des Jumeaux du Crépuscule', 'dos-titan': 'Dos du Titan Endormi',
  /* v481 */ 'dos-abysse': 'Dos de L’Abysse', 'dos-tarot': 'Dos du tarot interdit', 'dos-mosaique': 'Dos de la mosaïque d’or', 'dos-encre': 'Dos de l’encre et du dragon', 'dos-alchimie': 'Dos de l’alchimiste', 'dos-carte-abysse': 'Dos de la carte de l’Abysse', 'dos-reliquaire': 'Dos du reliquaire', 'dos-tapisserie': 'Dos de la chasse maudite', 'dos-art-deco': 'Dos d’or noir', 'dos-vivant': 'Dos de chair vivante', 'dos-nebuleuse': 'Dos de la nébuleuse', 'dos-vitrail': 'Dos du vitrail de cathédrale',
  /* v550 */ 'dos-cimetiere': 'Dos du cimetière des âmes', 'dos-presents': 'Dos des présents',
  /* v547 */   /* v552 */ 'dos-coeurs': 'Dos du cœur enchaîné',   /* v565 */ 'dos-passeur': 'Dos du Passeur', 'dos-aurore': 'Dos de l’aurore noire',
  'dos-vif-veillee': 'Dos vivant de la Veillée', 'dos-vif-hiver': 'Dos vivant de l’Hiver', 'dos-vif-coeur': 'Dos vivant du Cœur maudit',
  /* v569 : dos vivants de l'Échoppe (dos fixes animés par tools/back-anim.py, mode lueur) et palier 30 de la Saison I */
  'dos-vif-nebuleuse': 'Dos vivant de la nébuleuse', 'dos-vif-abysse': 'Dos vivant de L’Abysse', 'dos-vif-devoreur': 'Dos vivant du Dévoreur', 'dos-vif-eclipse': 'Dos vivant de l’Éclipse',
  'dos-vif-lune-sang': 'Dos vivant de la Lune de sang', 'dos-vif-coeur-mecanique': 'Dos vivant du cœur mécanique', 'dos-vif-passeur': 'Dos vivant du Passeur',
  /* v572 */ 'dos-vif-forge': 'Dos vivant de la forge', 'dos-vif-chandelles': 'Dos vivant des chandelles', 'dos-vif-orage': 'Dos vivant de l’orage', 'dos-vif-ame': 'Dos vivant de l’âme captive', 'dos-vif-oeil-or': 'Dos vivant de l’œil d’or',
  /* v577 */ 'dos-vif-phenix': 'Dos vivant du Phénix', 'dos-vif-kraken': 'Dos vivant du Kraken', 'dos-vif-couronne': 'Dos vivant de la Couronne damnée', 'dos-vif-sablier': 'Dos vivant du Sablier éternel', 'dos-vif-coeur-dragon': 'Dos vivant du Cœur de dragon', 'dos-vif-portail': 'Dos vivant du Portail des Royaumes', 'dos-vif-destrier': 'Dos vivant du Destrier cauchemar', 'dos-vif-hydre': 'Dos vivant de l’Hydre', 'dos-vif-orchidee': 'Dos vivant de l’Orchidée d’obsidienne', 'dos-vif-astrolabe': 'Dos vivant de l’Astrolabe', 'dos-vif-meduse': 'Dos vivant de la Méduse des abysses', 'dos-vif-geode': 'Dos vivant de la Géode de sang', 'dos-vif-corbeau': 'Dos vivant du Corbeau roi', 'dos-vif-tresor': 'Dos vivant du Trésor du dragon', 'dos-vif-arbre': 'Dos vivant de l’Arbre-monde', /* v578 */ 'dos-vif-ailes': 'Dos vivant des Ailes d’or', 'dos-vif-main-ombre': 'Dos vivant de la Main d’ombre', 'dos-vif-masque': 'Dos vivant du Masque d’apparat', 'dos-vif-perle': 'Dos vivant de la Perle noire', 'dos-vif-trone': 'Dos vivant du Trône de l’Abysse',
  /* v532 */ 'dos-carnaval': 'Dos du carnaval des ombres', 'dos-phalene': 'Dos de la grande phalène', 'dos-coeur-mecanique': 'Dos du cœur mécanique' };

// v482 : finitions de prestige (« habillages ») : un cadre peint posé sur une carte qu'on possède, sans rien changer à
// ses valeurs. Achetée une fois, une finition s'applique à autant de cartes qu'on veut (une par carte), au choix dans sa fiche.
export const FINISHES = {
  'fin-ecarlate': { name: 'Écarlate', desc: 'Laque rouge sang et filets d’or.' },
  'fin-givree': { name: 'Givrée', desc: 'Glace bleutée sur une âme d’argent.' },
  'fin-spectrale': { name: 'Spectrale', desc: 'Brume spectrale et visages d’esprits.' },
  'fin-vitrail': { name: 'Vitrail', desc: 'Verre de cathédrale serti de plomb.' },
  /* v532 */
  'fin-estampe': { name: 'Estampe', desc: 'Encre au pinceau et sceau vermillon.' },
  'fin-incandescente': { name: 'Incandescente', desc: 'Roche volcanique et lave qui rougeoie.' },
  'fin-constellee': { name: 'Constellée', desc: 'Astrolabe d’or et constellations de diamants.' },
  'fin-ossuaire': { name: 'Ossuaire', desc: 'Os, crânes et fils d’argent noirci.' },
  'fin-nacree': { name: 'Nacrée', desc: 'Nacre irisée, perles et or blanc.' },
  'fin-runique': { name: 'Runique', desc: 'Pierre ancienne aux gravures bleues.' },
  'fin-scellee': { name: 'Scellée', desc: 'Chaînes de fer et sceaux de cire.' },
  'fin-draconique': { name: 'Draconique', desc: 'Écailles de bronze et griffes de dragon.' },
  'fin-imperiale': { name: 'Impériale', desc: 'Or massif, velours violet et améthystes.' },
  'fin-neant': { name: 'Néant', desc: 'Une déchirure dans la réalité.' },
  /* v550 : exclusives des Saisons I et II */
  'fin-feux-follets': { name: 'Feux follets', desc: 'Petites flammes bleues qui dansent sur le bord de la carte.' },
  'fin-ames': { name: 'Nuit des Âmes', desc: 'Lanternes et âmes en spirale. Récompense ultime de la Saison I.' },
  'fin-houx': { name: 'Houx et rubans', desc: 'Branches de houx, baies rouges et ruban de velours.' },
  'fin-noel': { name: 'Veillée de Noël', desc: 'Or chaud, bougies et neige qui scintille. Récompense ultime de la Saison II.' },
  /* v552 : exclusives des Saisons IV à XII */
  'fin-roses': { name: 'Roses noires', desc: 'Tiges d’épines et roses noires au bord de la carte.' },
  'fin-coeurs': { name: 'Cœurs maudits', desc: 'Rubis, roses noires et chaînes d’or rose. Récompense ultime de la Saison IV.' },
  'fin-seve': { name: 'Sève', desc: 'Lianes vertes et gouttes de sève dorée au bord de la carte.' },
  'fin-racines': { name: 'Réveil des Racines', desc: 'Bois vivant, bourgeons et lumière de printemps. Récompense ultime de la Saison V.' },
  'fin-masques': { name: 'Masques', desc: 'Petits masques dorés et rubans de soie au bord de la carte.' },
  'fin-carnaval': { name: 'Carnaval des Ombres', desc: 'Velours, plumes et confettis d’or. Récompense ultime de la Saison VI.' },
  'fin-lune': { name: 'Lune pâle', desc: 'Argent lunaire et fines étoiles au bord de la carte.' },
  'fin-jardins': { name: 'Jardins de la Lune', desc: 'Argent, fleurs blanches et clair de lune. Récompense ultime de la Saison VII.' },
  'fin-solstice': { name: 'Solstice de feu', desc: 'Or en fusion, flammes et plumes de phénix. Récompense ultime de la Saison VIII.' },
  'fin-marees': { name: 'Marées noires', desc: 'Vague d’encre et écume d’argent au bord de la carte.' },
  'fin-profondeurs': { name: 'Profondeurs', desc: 'Nacre noire, perles et écume d’argent. Récompense ultime de la Saison IX.' },
  'fin-forge': { name: 'Forge des Titans', desc: 'Fer noirci et lueur de métal en fusion au bord de la carte.' },
  'fin-titans': { name: 'Acier des Titans', desc: 'Acier noir, rivets d’or et métal en fusion. Récompense ultime de la Saison X.' },
  'fin-ble-noir': { name: 'Blé noir', desc: 'Épis de blé dorés et noirs au bord de la carte.' },
  'fin-moissons': { name: 'Moissons d’ombre', desc: 'Blé d’or noir, plumes de corbeau et lune de récolte. Récompense ultime de la Saison XI.' },
  'fin-premiere-page': { name: 'Première page', desc: 'Parchemin ancien et enluminures au bord de la carte.' },
  'fin-anniversaire': { name: 'Anniversaire de l’Abysse', desc: 'Or, obsidienne et l’œil de l’Abysse en majesté. Récompense ultime de la Saison XII.' },
  /* v547 : exclusives de la Saison III (voie enluminée) */
  'fin-aurore': { name: 'Aurore boréale', desc: 'Voiles d’aurore verts et violets dans la glace.' },
  'fin-hiver': { name: 'Hiver éternel', desc: 'Couronne de glace, neige qui tombe sans fin. Récompense ultime de la Saison III.' },
};
// Catalogue de l'Échoppe, en obsidiennes (le Codex enluminé donne aussi givre, braises et dos de l'Abîme)
const F = (k, cost) => ({ id: k, kind: 'frame', give: { frame: k }, cost });
const B = (k, cost) => ({ id: k, kind: 'back', live: LIVE_BACKS.includes(k), give: { back: k }, cost }); /* v573 : vivant si animé */
const FN = (k, cost) => ({ id: k, kind: 'finish', give: { finish: k }, cost });
/* v564 : plaques de pseudo (bannière peinte derrière le pseudo : profil, classements, parties en ligne ; images assets/plates/<clé>.webp,
   décor CSS en attendant) et réactions en ligne (pendant une partie contre un joueur ; portraits des arbitres des jeux) */
// v565 : « dos vivants » (WebP animés, tools/back-anim.py) et habillages de booster (« sachets » : remplacent le visuel des boosters
// standard, Alliances et premium ; les boosters de faction gardent le leur ; assets/packs/<clé>.webp, tools/sachet-art.py)
export const LIVE_BACKS = ['dos-vif-veillee', 'dos-vif-hiver', 'dos-vif-coeur', 'dos-vif-passeur', 'dos-vif-nebuleuse', 'dos-vif-abysse', 'dos-vif-devoreur', 'dos-vif-eclipse', 'dos-vif-lune-sang', 'dos-vif-coeur-mecanique', 'dos-vif-forge', 'dos-vif-chandelles', 'dos-vif-orage', 'dos-vif-ame', 'dos-vif-oeil-or',
  /* v573 : tous les dos peints passent en dos vivants (même clé, fichier animé ; l'image fixe reste dans store/backs/<clé>-fixe.webp).
     dos-abysse, dos-coeur-mecanique, dos-devoreur, dos-eclipse, dos-lune-sang, dos-nebuleuse, dos-passeur montrent désormais l'animation de leur jumeau dos-vif-… (version fixe supprimée) */
  'dos-codex', 'dos-abime', 'dos-fondateur', 'dos-infernal', 'dos-abyssal', 'dos-celeste', 'dos-sauvage', 'dos-necrotique', 'dos-primordial', 'dos-artificiel', 'dos-ames', 'dos-solstice', 'dos-roses', 'dos-horloger', 'dos-miroirs', 'dos-jumeaux', 'dos-titan', 'dos-tarot', 'dos-mosaique', 'dos-encre', 'dos-alchimie', 'dos-carte-abysse', 'dos-reliquaire', 'dos-tapisserie', 'dos-art-deco', 'dos-vivant', 'dos-vitrail', 'dos-cimetiere', 'dos-presents', 'dos-coeurs', 'dos-aurore', 'dos-carnaval', 'dos-phalene', 'dos-abysse', 'dos-coeur-mecanique', 'dos-devoreur', 'dos-eclipse', 'dos-lune-sang', 'dos-nebuleuse', 'dos-passeur', 'dos-vif-phenix', 'dos-vif-kraken', 'dos-vif-couronne', 'dos-vif-sablier', 'dos-vif-coeur-dragon', 'dos-vif-portail', 'dos-vif-destrier', 'dos-vif-hydre', 'dos-vif-orchidee', 'dos-vif-astrolabe', 'dos-vif-meduse', 'dos-vif-geode', 'dos-vif-corbeau', 'dos-vif-tresor', 'dos-vif-arbre', 'dos-vif-ailes', 'dos-vif-main-ombre', 'dos-vif-masque', 'dos-vif-perle', 'dos-vif-trone'];
const BV = (k, cost) => ({ id: k, kind: 'back', live: true, give: { back: k }, cost }); /* v569 : dos vivant vendu à l'Échoppe */
export const SACHETS = { 'sachet-veillee': 'Sachet de la Veillée', 'sachet-fondateur': 'Sachet du Fondateur',
  /* v570 : sachets vendus à l'Échoppe */ 'sachet-obsidienne': 'Sachet d’obsidienne', 'sachet-grimoire': 'Sachet du grimoire', 'sachet-braise': 'Sachet de braise', 'sachet-givre': 'Sachet de givre', 'sachet-lune-sang': 'Sachet de la Lune de sang', 'sachet-souverain': 'Sachet du Souverain',
  /* v572 : sachets vivants */ 'sachet-vif-abysse': 'Sachet vivant de l’œil de l’Abysse', 'sachet-vif-spectre': 'Sachet vivant du spectre', 'sachet-vif-eclipse': 'Sachet vivant de l’éclipse',
  /* v578 */ 'sachet-vif-phenix': 'Sachet vivant du Phénix', 'sachet-vif-kraken': 'Sachet vivant du Kraken', 'sachet-vif-tresor': 'Sachet vivant du Trésor', 'sachet-vif-dragon': 'Sachet vivant du Dragon', 'sachet-vif-astrolabe': 'Sachet vivant de l’Astrolabe', 'sachet-vif-sang': 'Sachet vivant du Sang royal', 'sachet-vif-givre-noir': 'Sachet vivant du Givre noir', 'sachet-vif-ecrin': 'Sachet vivant de l’Écrin', 'sachet-vif-orage': 'Sachet vivant de l’Orage', 'sachet-vif-foret': 'Sachet vivant de la Forêt ancienne', /* v579 */ 'sachet-vif-necro': 'Sachet vivant du Spectre vert', 'sachet-vif-automate': 'Sachet vivant de l’Automate', 'sachet-vif-celeste': 'Sachet vivant des Ailes d’or', 'sachet-vif-infernal': 'Sachet vivant des Cornes ardentes', 'sachet-vif-empereur': 'Sachet vivant de l’Empereur' };
const SA = (k, cost) => ({ id: k, kind: 'sachet', give: { sachet: k }, cost });
export const PLATES = { 'pl-obsidienne': 'Plaque d’obsidienne', 'pl-grimoire': 'Plaque du grimoire', 'pl-braise': 'Plaque de braise',
  'pl-givre': 'Plaque de givre', 'pl-or-noir': 'Plaque d’or noir', 'pl-abysse': 'Plaque de l’Abysse', 'pl-souverain': 'Plaque du Souverain',
  /* v572 */ 'pl-ossuaire': 'Plaque de l’ossuaire', 'pl-sang': 'Plaque de sang', 'pl-pierre': 'Plaque des gargouilles', 'pl-nacre': 'Plaque de nacre noire', 'pl-dragon': 'Plaque du dragon', 'pl-eclipse': 'Plaque de l’éclipse',
  /* v580 */ 'pl-phenix': 'Plaque du Phénix', 'pl-kraken': 'Plaque du Kraken', 'pl-tresor': 'Plaque du Trésor', 'pl-cristal': 'Plaque d’améthyste', 'pl-foudre': 'Plaque de la Foudre', 'pl-foret': 'Plaque de la Forêt ancienne', 'pl-automate': 'Plaque de l’Automate', 'pl-empereur': 'Plaque de l’Empereur' };
export const EMOTES = {
  're-salut': { text: 'Salutations.', free: true }, 're-bien': { text: 'Bien joué.', free: true },
  're-merci': { text: 'Merci.', free: true }, 're-aie': { text: 'Aïe…', free: true },
  're-mammon': { text: 'Hé hé hé…', who: 'banquier', name: 'Mammon' }, 're-souveraine': { text: 'À genoux.', who: 'souverain', name: 'La Souveraine du Néant' },
  're-archiviste': { text: 'Prévisible.', who: 'archiviste', name: 'L’Archiviste' }, 're-ilda': { text: 'Oh non… !', who: 'initie', name: 'Ilda' },
  're-orvel': { text: 'Quel coup !', who: 'collectionneur', name: 'Maître Orvel' }, 're-vesna': { text: 'Patience.', who: 'stratege', name: 'Sœur Vesna' },
  're-maitre': { text: 'Les règles sont les règles.', who: 'maitre', name: 'Le Maître des Sceaux' }, 're-echo': { text: 'L’Abîme t’attend.', who: 'echo', name: 'L’Écho de l’Abîme' },
};
export const FREE_EMOTES = Object.keys(EMOTES).filter((k) => EMOTES[k].free);
export const PAID_EMOTES = Object.keys(EMOTES).filter((k) => !EMOTES[k].free);
const PL = (k, cost) => ({ id: k, kind: 'plate', give: { plate: k }, cost });
const RE = (k, cost) => ({ id: k, kind: 'emote', give: { emote: k }, cost });
export const ROYAUMES = ['dos-infernal', 'dos-abyssal', 'dos-celeste', 'dos-sauvage', 'dos-necrotique', 'dos-primordial', 'dos-artificiel'];
/* v535 : cadres de la meute, des corbeaux, des chaînes et des roses noires retirés de la vente (leur ornement cachait le visage de la créature) */
/* v562 : tri du propriétaire (Atelier des cosmétiques, 21 octobre 2026) : 25 objets retirés (RETIRED_COSM). Ils restent
   connus (CODEX_FRAMES, FINISHES, CSS) pour les parties qui les auraient, mais ne se gagnent ni ne s'achètent plus. */
/* v583 : tri du 22 octobre 2026 : 71 cosmétiques définitivement supprimés (code, images, saisons, Échoppe) ;
   retirés des parties qui les avaient (migrate, js/core/save.js). */
export const REMOVED_COSM = ['cx-encre', 'cx-sang', 'cx-or', 'cx-abime', 'cx-givre', 'cx-braise', 'cx-serpents', 'cx-vitrail', 'cx-rouages', 'cx-racines', 'cx-yeux', 'cx-houx', 'cx-aurore', 'cx-roses', 'cx-prince', 'cx-leviathan', 'cx-seraphin', 'cx-liche', 'cx-ouroboros', 'cx-automate', 'cx-gueule', 'cx-horloger', 'cx-constellation', 'cx-sablier', 'cx-souverain', 'cx-guirlandes', 'cx-glace-noire', 'cx-loups-neige', 'cx-coeurs', 'cx-epines', 'cx-mandragore', 'cx-arbre-monde', 'cx-masques', 'cx-arlequin', 'cx-lune-pale', 'cx-jardin-lune', 'cx-lune-reine', 'cx-flammes', 'cx-solstice-feu', 'cx-marees', 'cx-corail', 'cx-profondeurs', 'cx-forge-titans', 'cx-enclume', 'cx-titan', 'cx-plumes', 'cx-epis', 'cx-faucheur', 'cx-anniversaire', 'cx-veilleuses', 'cx-reliquaire-ames', 'cx-cristaux-sang', 'dos-blizzard', 'dos-hiver', 'dos-mandragore', 'dos-racines', 'dos-bal', 'dos-lune-pale', 'dos-jardin', 'dos-phenix', 'dos-brasier', 'dos-marees', 'dos-leviathan', 'dos-forge-titans', 'dos-marteau', 'dos-moissons', 'dos-epouvantail', 'dos-anniversaire', 'dos-glas', 'dos-veillee', 'sachet-ames'];
export const RETIRED_COSM = ['cx-fondateur', 'cx-os', 'cx-ruche', 'cx-lanternes', 'cx-voile', 'cx-eclipse', 'cx-balance', 'cx-geode', 'cx-pages', 'cx-corbeau', 'cx-carnaval', 'cx-phalenes',
  'fin-vitrail', 'fin-constellee', 'fin-ossuaire', 'fin-nacree', 'fin-runique', 'fin-scellee', 'fin-draconique', 'fin-feux-follets', 'fin-houx', 'fin-noel', 'fin-roses', 'fin-coeurs', 'fin-hiver'];
/* v584 : l'Échoppe rangée (demande du propriétaire du 22 octobre 2026) : 20 objets par catégorie (cadres, dos, sachets,
   plaques), une rareté selon la beauté de l'objet (les plus beaux sont les plus rares et les plus chers), un prix par rareté.
   Les dos et sachets qui ne sont plus en vente vont dans PASS_RESERVE (gardés pour les saisons du Codex). Tout est vivant. */
export const COSM_PRICE = { rare: 180, epic: 280, leg: 420, myth: 600 };
export const COSM_RARITY = {
  /* cadres (10 en vente ; 10 de plus attendus, prompts §257-266) */
  'cx-vif-soleil-noir': 'myth', 'cx-vif-dragon': 'myth', 'cx-vif-phenix': 'myth', 'cx-vif-amethyste': 'leg', 'cx-vif-kraken': 'epic', 'cx-vif-foret': 'epic', 'cx-vif-nacre': 'epic', 'cx-vif-sang': 'leg', 'cx-vif-brasier': 'leg', 'cx-vif-givre': 'leg',
  'cx-vif-ames': 'epic', 'cx-vif-abysse': 'epic', 'cx-vif-maree': 'epic', 'cx-vif-foudre': 'rare', 'cx-vif-etoiles': 'rare', 'cx-vif-rouages': 'rare',
  /* dos */
  'dos-vif-phenix': 'myth', 'dos-vif-ailes': 'myth', 'dos-vif-couronne': 'myth', 'dos-vif-kraken': 'myth', 'dos-vif-tresor': 'myth', 'dos-vif-portail': 'myth',
  'dos-vif-nebuleuse': 'leg', 'dos-vitrail': 'leg', 'dos-vif-lune-sang': 'leg', 'dos-vif-trone': 'leg', 'dos-vif-eclipse': 'leg', 'dos-vif-meduse': 'leg', 'dos-vif-coeur-dragon': 'leg', 'dos-vif-corbeau': 'leg', 'dos-vif-abysse': 'leg', 'dos-vif-coeur-mecanique': 'leg',
  'dos-vif-astrolabe': 'epic', 'dos-vif-orchidee': 'epic', 'dos-vif-sablier': 'epic', 'dos-vif-hydre': 'epic', 'dos-abyssal': 'epic', 'dos-infernal': 'epic', 'dos-vif-perle': 'epic', 'dos-vif-masque': 'epic', 'dos-mosaique': 'epic', 'dos-vif-destrier': 'epic', 'dos-vif-ame': 'epic', 'dos-vif-oeil-or': 'epic', 'dos-vif-main-ombre': 'epic', 'dos-vif-arbre': 'epic', 'dos-vif-geode': 'epic', 'dos-vif-devoreur': 'epic',
  'dos-sauvage': 'rare', 'dos-necrotique': 'rare', 'dos-primordial': 'rare', 'dos-artificiel': 'rare', 'dos-celeste': 'rare', 'dos-phalene': 'rare', 'dos-art-deco': 'rare', 'dos-vif-chandelles': 'rare', 'dos-miroirs': 'rare', 'dos-reliquaire': 'rare', 'dos-horloger': 'rare', 'dos-abime': 'rare', 'dos-vif-orage': 'rare', 'dos-vif-forge': 'rare', 'dos-tarot': 'rare', 'dos-jumeaux': 'rare', 'dos-titan': 'rare', 'dos-encre': 'rare', 'dos-tapisserie': 'rare', 'dos-carte-abysse': 'rare', 'dos-vivant': 'rare', 'dos-alchimie': 'rare',
  /* sachets */
  'sachet-vif-dragon': 'myth', 'sachet-vif-eclipse': 'myth', 'sachet-vif-tresor': 'myth',
  'sachet-vif-phenix': 'leg', 'sachet-vif-abysse': 'leg', 'sachet-vif-empereur': 'leg', 'sachet-vif-ecrin': 'leg',
  'sachet-vif-sang': 'epic', 'sachet-vif-kraken': 'epic', 'sachet-vif-astrolabe': 'epic', 'sachet-vif-infernal': 'epic', 'sachet-vif-spectre': 'epic', 'sachet-souverain': 'epic',
  'sachet-vif-celeste': 'rare', 'sachet-vif-givre-noir': 'rare', 'sachet-braise': 'rare', 'sachet-vif-orage': 'rare', 'sachet-lune-sang': 'rare', 'sachet-vif-necro': 'rare', 'sachet-vif-automate': 'rare',
  'sachet-givre': 'rare', 'sachet-vif-foret': 'rare', 'sachet-grimoire': 'rare', 'sachet-obsidienne': 'rare',
  /* plaques */
  'pl-empereur': 'myth', 'pl-tresor': 'myth', 'pl-phenix': 'myth',
  'pl-sang': 'leg', 'pl-kraken': 'leg', 'pl-cristal': 'leg', 'pl-automate': 'leg',
  'pl-braise': 'epic', 'pl-givre': 'epic', 'pl-souverain': 'epic', 'pl-nacre': 'epic', 'pl-dragon': 'epic', 'pl-foret': 'epic',
  'pl-eclipse': 'rare', 'pl-or-noir': 'rare', 'pl-ossuaire': 'rare', 'pl-abysse': 'rare', 'pl-foudre': 'rare', 'pl-grimoire': 'rare', 'pl-obsidienne': 'rare', 'pl-pierre': 'rare',
};
const SHOP_FRAMES = ['cx-vif-dragon', 'cx-vif-phenix', 'cx-vif-soleil-noir', 'cx-vif-amethyste', 'cx-vif-sang', 'cx-vif-brasier', 'cx-vif-givre', 'cx-vif-kraken', 'cx-vif-nacre', 'cx-vif-foret', 'cx-vif-ames', 'cx-vif-abysse', 'cx-vif-maree', 'cx-vif-foudre', 'cx-vif-etoiles', 'cx-vif-rouages'];
const SHOP_BACKS = ['dos-vif-phenix', 'dos-vif-ailes', 'dos-vif-couronne', 'dos-vif-nebuleuse', 'dos-vitrail', 'dos-vif-lune-sang', 'dos-vif-trone',
  'dos-vif-astrolabe', 'dos-vif-orchidee', 'dos-vif-sablier', 'dos-vif-hydre', 'dos-abyssal', 'dos-infernal',
  'dos-sauvage', 'dos-necrotique', 'dos-primordial', 'dos-artificiel', 'dos-celeste', 'dos-phalene', 'dos-art-deco'];
const SHOP_SACHETS = ['sachet-vif-dragon', 'sachet-vif-eclipse', 'sachet-vif-tresor', 'sachet-vif-phenix', 'sachet-vif-abysse', 'sachet-vif-empereur', 'sachet-vif-ecrin',
  'sachet-vif-sang', 'sachet-vif-kraken', 'sachet-vif-astrolabe', 'sachet-vif-infernal', 'sachet-vif-spectre', 'sachet-souverain',
  'sachet-vif-celeste', 'sachet-vif-givre-noir', 'sachet-braise', 'sachet-vif-orage', 'sachet-lune-sang', 'sachet-vif-necro', 'sachet-vif-automate'];
const SHOP_PLATES = ['pl-empereur', 'pl-tresor', 'pl-phenix', 'pl-sang', 'pl-kraken', 'pl-cristal', 'pl-automate', 'pl-braise', 'pl-givre', 'pl-souverain', 'pl-nacre', 'pl-dragon', 'pl-foret',
  'pl-eclipse', 'pl-or-noir', 'pl-ossuaire', 'pl-abysse', 'pl-foudre', 'pl-grimoire', 'pl-obsidienne'];
/* gardés pour les saisons du Codex (plus en vente ; ceux qui les ont les gardent) */
export const PASS_RESERVE = [...Object.keys(COSM_RARITY).filter((k) => /^(dos|sachet|pl)-/.test(k) && ![...SHOP_BACKS, ...SHOP_SACHETS, ...SHOP_PLATES].includes(k))];
const RZ = (mk, k, extra) => ({ ...mk(k, COSM_PRICE[COSM_RARITY[k]]), r: COSM_RARITY[k], live: true, ...extra });
export const CATALOG = [
  ...SHOP_FRAMES.map((k) => RZ(F, k)), ...SHOP_BACKS.map((k) => RZ(B, k)), ...SHOP_SACHETS.map((k) => RZ(SA, k)), ...SHOP_PLATES.map((k) => RZ(PL, k)),
  ...PAID_EMOTES.map((k) => ({ ...RE(k, 100), r: 'rare' })),
  { id: 'arbitres', kind: 'bundle', name: 'Le Cercle des arbitres', give: { emotes: PAID_EMOTES }, cost: 600, desc: 'Les huit réactions des arbitres d’un coup (800 à l’unité).' },
  { id: 'royaumes', kind: 'bundle', name: 'Les sept royaumes', give: { backs: ROYAUMES }, cost: Math.round(ROYAUMES.reduce((n, k) => n + COSM_PRICE[COSM_RARITY[k]], 0) * 0.8 / 10) * 10, desc: 'Les sept dos vivants des royaumes d’un coup, moins cher qu’à l’unité.' },
];
// Exclusifs du Codex enluminé (jamais en vente). v547 : tous les cosmétiques de la voie enluminée (Saison I : l'hiver),
// plus les anciens objets du Codex gardés pour une saison future (encre, sang, enluminé, Abîme, dos du Codex).
export const CODEX_ONLY = ['dos-codex',
  /* v550 */ 'cx-lanternes', 'cx-voile', 'cx-citrouilles', 'cx-ames', 'dos-ames', 'dos-cimetiere', 'fin-spectrale', 'fin-feux-follets', 'fin-ames',
  'cx-noel', 'dos-presents', 'fin-houx', 'fin-noel',
  'cx-hiver', 'dos-solstice', 'fin-givree', 'fin-aurore', 'fin-hiver'];

// Paliers. v547 (retour du propriétaire : « on gagne énormément en gratuit et peu en payant ») : la voie gratuite donne un
// palier sur deux (éclats, cendres, coffres, tickets) ; la voie enluminée donne quelque chose à CHAQUE palier, tout sur le
// thème de la saison (l'Hiver éternel), cosmétique seulement et jamais en vente à l'Échoppe (CODEX_ONLY).
// Palier 30 : la récompense ultime (couronne animée, finition, titre). null = rien à ce palier.
const FREE = (t) => (t === CODEX.tiers ? { chests: { abyssal: 1 } }
  : t % 10 === 0 ? { chests: { [t < 15 ? 'fer' : 'or']: 1 } }
  : t === 5 || t === 15 || t === 25 ? { tickets: { standard: 1 } }
  : t % 2 === 0 ? (t % 4 === 0 ? { ash: 15 + 3 * t } : { shards: 30 + 6 * t })
  : null);
// v550 : trois saisons d'un mois (décision du propriétaire, 21 octobre 2026). Dates à l'heure du joueur (minuit chez lui).
// Chaque voie enluminée suit le même plan : titres aux paliers 1, 5, 12, 17, 22, 27 ; cosmétiques de la saison aux paliers
// 3, 6, 8, 10, 14, 15, 18, 20, 24, 25 (dans l'ordre de la liste) ; obsidiennes ailleurs ; palier 30 = récompense ultime.
const TITLE_AT = [1, 5, 12, 17, 22, 27], ITEM_AT = [3, 6, 8, 10, 14, 15, 18, 20, 24, 25];
const OBS_AT = { 23: 30, 26: 30, 28: 30, 29: 50 };
function premOf({ titles, items, ultimate }) {
  const out = {};
  for (let t = 1; t <= CODEX.tiers; t++) out[t] = { obs: OBS_AT[t] || 20 };
  TITLE_AT.forEach((t, n) => { if (titles[n]) out[t] = { title: titles[n] }; });
  ITEM_AT.forEach((t, n) => { out[t] = items[n] || { obs: 10 }; }); /* v583 : place vide (objet supprimé) = 10 obsidiennes, pour que la voie enluminée ne rende pas son prix en obsidiennes */
  out[CODEX.tiers] = ultimate;
  return out;
}
export const SEASONS = [
  { key: 's1-ames', num: 'I', name: 'La Nuit des Âmes', starts: '2026-11-01', ends: '2026-11-30', art: 'assets/ui/cx-saison-ames.webp',
    best: ['cx-ames', 'dos-vif-passeur', 'dos-ames'], pitch: 'Une récompense à chaque palier : cadres, dos de cartes et titres de la Nuit des Âmes, introuvables à l’Échoppe. Au palier 30, la Couronne du Passeur des Âmes et le Dos vivant du Passeur.',
    titles: ['Veilleur des tombes', 'Porteur de lanterne', 'Ami des feux follets', 'Voix des trépassés', 'Gardien des âmes perdues', 'Celui qui ne dort pas'],
    items: [null, { back: 'dos-ames' }, null /* v573 : dos fixe du Passeur retiré (le palier 30 donne le dos vivant) */, null, null, { back: 'dos-cimetiere' }, null, null],
    ultimate: { frame: 'cx-ames', back: 'dos-vif-passeur', title: 'Passeur des Âmes' } },
  { key: 's2-noel', num: 'II', name: 'La Veillée de Noël', starts: '2026-12-01', ends: '2026-12-31', art: 'assets/ui/cx-saison-noel.webp',
    best: ['cx-noel', 'dos-vif-veillee', 'dos-solstice'], pitch: 'Une récompense à chaque palier : cadres, dos de cartes et titres de la Veillée de Noël, introuvables à l’Échoppe. Au palier 30, la Couronne de la Veillée et le Dos vivant de la Veillée.',
    titles: ['Porteur de chandelles', 'Chanteur de minuit', 'Gardien du houx', 'Hôte de la Veillée', 'Messager des présents', 'Cœur de braise'],
    items: [null, { back: 'dos-solstice' }, { sachet: 'sachet-veillee' }, null, null, null],
    ultimate: { frame: 'cx-noel', back: 'dos-vif-veillee', title: 'Gardien de la Veillée' } },
  { key: 's3-hiver', num: 'III', name: 'L’Hiver éternel', starts: '2027-01-01', ends: '2027-01-31', art: 'assets/ui/cx-saison1.webp',
    best: ['cx-hiver', 'dos-vif-hiver', 'dos-aurore'], pitch: 'Une récompense à chaque palier : cadres, dos de cartes et titres de l’Hiver éternel, introuvables à l’Échoppe. Au palier 30, la Couronne de la Reine de l’Hiver et le Dos vivant de l’Hiver.',
    titles: ['Veilleur du long hiver', 'Marcheur des neiges', 'Chasseur d’aurores', 'Cœur de givre', 'Voix du blizzard', 'Gardien du solstice'],
    items: [null, null, null, null, null, null, null, { back: 'dos-aurore' }, null],
    ultimate: { frame: 'cx-hiver', back: 'dos-vif-hiver', title: 'Souverain de l’Hiver éternel' } },
  /* v552 : une saison par mois toute l'année (calendrier validé par le propriétaire le 21 octobre 2026) */
  { key: 's4-coeurs', num: 'IV', name: 'Les Cœurs maudits', starts: '2027-02-01', ends: '2027-02-28', art: 'assets/ui/cx-saison-coeurs.webp',
    best: ['cx-coeur-maudit', 'dos-vif-coeur', 'dos-coeurs'], pitch: 'Une récompense à chaque palier : cadres, dos de cartes et titres des Cœurs maudits, introuvables à l’Échoppe. Au palier 30, la Couronne du Cœur maudit et le Dos vivant du Cœur maudit.',
    titles: ['Amant des ombres', 'Porteur de roses noires', 'Cœur épineux', 'Âme liée', 'Briseur de serments', 'Soupir de l’Abysse'],
    items: [null, { back: 'dos-roses' }, null, null, null, { back: 'dos-coeurs' }, null, null],
    ultimate: { frame: 'cx-coeur-maudit', back: 'dos-vif-coeur', title: 'Souverain des Cœurs maudits' } },
  { key: 's5-racines', num: 'V', name: 'Le Réveil des Racines', starts: '2027-03-01', ends: '2027-03-31', art: 'assets/ui/cx-saison-racines.webp',
    best: [], pitch: 'Une récompense à chaque palier : cadres, dos de cartes et titres du Réveil des Racines, introuvables à l’Échoppe.',
    titles: ['Graine de l’Abysse', 'Éveilleur de sève', 'Ami des mandragores', 'Voix de la forêt', 'Cœur de chêne', 'Racine profonde'],
    items: [null, null, null, null, null, null],
    ultimate: { title: 'Gardien des Racines' } },
  { key: 's6-carnaval', num: 'VI', name: 'Le Carnaval des Ombres', starts: '2027-04-01', ends: '2027-04-30', art: 'assets/ui/cx-saison-carnaval.webp',
    best: ['dos-carnaval'], pitch: 'Une récompense à chaque palier : cadres, dos de cartes et titres du Carnaval des Ombres, introuvables à l’Échoppe.',
    titles: ['Danseur masqué', 'Visage de velours', 'Rire dans l’ombre', 'Maître des confettis', 'Invité du bal', 'Celui qui change de visage'],
    items: [null, { back: 'dos-carnaval' }, null, null, null, null],
    ultimate: { title: 'Maître du Carnaval' } },
  { key: 's7-lune', num: 'VII', name: 'Les Jardins de la Lune pâle', starts: '2027-05-01', ends: '2027-05-31', art: 'assets/ui/cx-saison-lune.webp',
    best: [], pitch: 'Une récompense à chaque palier : cadres, dos de cartes et titres des Jardins de la Lune pâle, introuvables à l’Échoppe.',
    titles: ['Cueilleur de rosée', 'Ami des phalènes', 'Promeneur nocturne', 'Fleur de minuit', 'Enfant de la lune', 'Gardien des jardins'],
    items: [null, null, null, null, null, null],
    ultimate: { title: 'Jardinier de la Lune pâle' } },
  { key: 's8-solstice', num: 'VIII', name: 'Le Solstice de feu', starts: '2027-06-01', ends: '2027-06-30', art: 'assets/ui/cx-saison-solstice.webp',
    best: [], pitch: 'Une récompense à chaque palier : cadres, dos de cartes et titres du Solstice de feu, introuvables à l’Échoppe.',
    titles: ['Porteur de torche', 'Danseur des braises', 'Enfant du brasier', 'Cœur ardent', 'Flamme qui ne s’éteint pas', 'Ami du phénix'],
    items: [null, null, null, null, null, null],
    ultimate: { title: 'Enfant du Solstice' } },
  { key: 's9-marees', num: 'IX', name: 'Les Marées noires', starts: '2027-07-01', ends: '2027-07-31', art: 'assets/ui/cx-saison-marees.webp',
    best: [], pitch: 'Une récompense à chaque palier : cadres, dos de cartes et titres des Marées noires, introuvables à l’Échoppe.',
    titles: ['Écume noire', 'Chanteur des profondeurs', 'Pêcheur de perles', 'Marcheur des abysses', 'Voix de la marée', 'Cœur de corail'],
    items: [null, null, null, null, null, null],
    ultimate: { title: 'Seigneur des Marées' } },
  { key: 's10-forge', num: 'X', name: 'La Forge des Titans', starts: '2027-08-01', ends: '2027-08-31', art: 'assets/ui/cx-saison-forge.webp',
    best: [], pitch: 'Une récompense à chaque palier : cadres, dos de cartes et titres de la Forge des Titans, introuvables à l’Échoppe.',
    titles: ['Apprenti forgeron', 'Frappeur d’enclume', 'Main de fer', 'Souffle de la forge', 'Cœur d’acier', 'Marteau des Titans'],
    items: [null, null, null, null, null, null],
    ultimate: { title: 'Forgeron des Titans' } },
  { key: 's11-moissons', num: 'XI', name: 'Les Moissons d’ombre', starts: '2027-09-01', ends: '2027-09-30', art: 'assets/ui/cx-saison-moissons.webp',
    best: [], pitch: 'Une récompense à chaque palier : cadres, dos de cartes et titres des Moissons d’ombre, introuvables à l’Échoppe.',
    titles: ['Glaneur d’ombres', 'Ami des corbeaux', 'Gardien des champs', 'Lame de la récolte', 'Veilleur des granges', 'Épouvantail vivant'],
    items: [null, null, null, null, null, null],
    ultimate: { title: 'Faucheur des Ombres' } },
  { key: 's12-anniv', num: 'XII', name: 'L’Anniversaire de l’Abysse', starts: '2027-10-01', ends: '2027-10-31', art: 'assets/ui/cx-saison-anniv.webp',
    best: ['dos-codex'], pitch: 'Une récompense à chaque palier : cadres, dos de cartes et titres de l’Anniversaire de l’Abysse, introuvables à l’Échoppe.',
    titles: ['Lecteur du Bestiaire', 'Témoin de l’Abysse', 'Fidèle de la première heure', 'Gardien des pages', 'Plume de l’Abysse', 'Mémoire du Bestiaire'],
    items: [null, { back: 'dos-codex' }, null, null, null, null, null, null],
    ultimate: { title: 'Témoin de la première année' } },
];
for (const se of SEASONS) { /* v552 : tout objet d'une voie enluminée est exclusif au Codex */
  for (const r of [...se.items, se.ultimate]) for (const k of [r?.frame, r?.back, r?.finish, r?.sachet]) if (k && !CODEX_ONLY.includes(k)) CODEX_ONLY.push(k);
  se.title = `Saison ${se.num} · ${se.name}`; se.prem = premOf(se); se.tiers = Array.from({ length: CODEX.tiers }, (_, i) => ({ tier: i + 1, free: FREE(i + 1), prem: se.prem[i + 1] || null })); }
// la saison d'un jour (date du joueur) : celle qui le contient, sinon la prochaine, sinon la dernière
export function seasonFor(day) { return SEASONS.find((se) => day <= se.ends) || SEASONS[SEASONS.length - 1]; }
export const seasonByKey = (k) => SEASONS.find((se) => se.key === k) || null;
export const tiersOf = (k) => (seasonByKey(k) || SEASONS[0]).tiers;
export const CODEX_TIERS = SEASONS[0].tiers; // (tests, outils) : la première saison

// ——— L'Échoppe en euros : les obsidiennes et le Pack du Fondateur (prix affichés seulement) ———
export const SHOP = [
  ...OBS_PACKS.map((p) => ({ id: p.id, kind: 'obs', name: `${p.n + p.bonus} obsidiennes`, price: p.price, store: p.store, give: { obs: p.n + p.bonus }, bonus: p.bonus })),
  { id: 'codex', kind: 'codex', name: 'Codex enluminé', price: CODEX.price, store: CODEX.store, give: { codexPremium: true } }, /* v548 : vendu dans l'onglet du Codex, une fois par saison */
  { id: 'fondateur', name: 'Pack du Fondateur', price: '4,99 €', store: 'com.abyssalgame.abyssal.fondateur', once: true,
    give: { title: 'Fondateur', back: 'dos-fondateur', sachet: 'sachet-fondateur', obs: 600 }, /* v562 : cadre retiré ; v565 : sachet du Fondateur */
    desc: 'Vendu une seule fois. Le dos de cartes et le sachet de booster du Fondateur, le titre « Fondateur » (badge au classement) et 600 obsidiennes.' },
];

// ——— État ———
export const freshCodex = (season = SEASONS[0].key) => ({ season, xp: 0, premium: false, free: [], prem: [], log: {} });
/* les récompenses atteintes mais pas récupérées d'un Codex (fin de saison : elles sont données au joueur) */
export function pendingOf(c) {
  const out = [];
  if (!c || !seasonByKey(c.season)) return out;
  for (const t of tiersOf(c.season)) {
    if (t.tier > codexTier(c)) break;
    if (t.free && !c.free.includes(t.tier)) out.push(t.free);
    if (c.premium && t.prem && !c.prem.includes(t.tier)) out.push(t.prem);
  }
  return out;
}
export const codexTier = (c) => Math.min(CODEX.tiers, Math.floor(c.xp / CODEX.xpPerTier));
export const tierProgress = (c) => (codexTier(c) >= CODEX.tiers ? 1 : (c.xp % CODEX.xpPerTier) / CODEX.xpPerTier);
export const claimable = (c) => tiersOf(c.season).filter((t) => t.tier <= codexTier(c) && ((t.free && !c.free.includes(t.tier)) || (c.premium && t.prem && !c.prem.includes(t.tier)))).length;
