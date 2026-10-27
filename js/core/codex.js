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
  /* v678 (décision du propriétaire du 23 octobre 2026) : les saisons commencent quand le vrai paiement marche.
     Saison I = ce mois-là, puis une saison par mois dans l'ordre de SEASONS. Pour tout décaler : changer ce seul mois.
     v680 (décision du propriétaire du 23 octobre 2026) : Saison I le 1er décembre 2026, avec le vrai paiement (RevenueCat).
     Le Codex et l'Échoppe s'ouvrent à tous le premier jour de la Saison I (`g.codexOn()`). */
  from: '2026-12',
  tierObs: 100,                          // v680 : prix d'un palier acheté en obsidiennes (« Acheter un palier »)
  questXp: 150,
  shopFrom: null,                        // v684 : jour d'ouverture de l'Échoppe à tous ('AAAA-MM-JJ'), avant le Codex ; null = elle ouvre avec le Codex                          // v680 : points de Codex d'un défi de la saison (un palier)
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
export const CODEX_XP_LABEL = { floor: 'Étage franchi (1re fois)', boss: 'Gardien vaincu (1re fois)', win: 'Autre victoire dans la Descente', trial: 'Épreuve du jour gagnée', game: 'Partie gagnée dans le Cercle de l’Abysse', mission: 'Mission du jour', quest: 'Défi de la semaine' }; /* v680 */

// Cosmétiques propres au Codex et à l'Échoppe (v472 : cadres peints par Gemini, assets/frames/<clé>.webp, posés par .pf-<clé>)
export const CODEX_FRAMES = {
  /* v685 : Saison II « L’Hiver éternel » */ 'cx-vif-aurore': 'Cadre vivant de l’Aurore', 'cx-vif-blizzard': 'Cadre vivant du Blizzard',
  /* v630 : Saison I « La Nuit des Âmes », voie enluminée */ 'cx-vif-feux-follets': 'Cadre vivant des Feux follets', 'cx-vif-brume': 'Cadre vivant de la Brume des âmes',
    'cx-fondateur': 'Cadre du Fondateur', /* v638 */ 'cx-vif-fondateur': 'Cadre vivant du Fondateur',   /* v472 : réserve (saison II ou Échoppe), images prêtes dans assets/frames/ */
  'cx-os': 'Couronne d’ossements',   'cx-chaines': 'Cadre des chaînes forgées', 'cx-ruche': 'Cadre de la ruche d’ambre',
  /* v479 : catalogue de l'Échoppe (store/boutique-cosmetiques.md) : Nuit des Âmes, Hiver éternel, Cœurs maudits, les sept trônes, trophées des gardiens */
  'cx-lanternes': 'Cadre des lanternes d’âmes', 'cx-voile': 'Cadre du voile des trépassés',   /* v582 */ 'cx-vif-brasier': 'Cadre vivant du Brasier', 'cx-vif-givre': 'Cadre vivant du Givre éternel', 'cx-vif-abysse': 'Cadre vivant de l’Abysse', 'cx-vif-sang': 'Cadre vivant du Sang royal', 'cx-vif-foudre': 'Cadre vivant de la Foudre', 'cx-vif-ames': 'Cadre vivant des Âmes errantes', 'cx-vif-etoiles': 'Cadre vivant de la Voûte céleste', 'cx-vif-soleil-noir': 'Cadre vivant du Soleil noir', 'cx-vif-maree': 'Cadre vivant de la Marée luminescente', 'cx-vif-rouages': 'Cadre vivant des Rouages', /* v588 */ 'cx-vif-venin': 'Cadre vivant du Venin', 'cx-vif-ambre': 'Cadre vivant de l’Ambre', 'cx-vif-obsidienne': 'Cadre vivant de l’Obsidienne', /* v591 */ 'cx-vif-meduse': 'Cadre vivant de la Méduse', 'cx-vif-serpent': 'Cadre vivant du Serpent', 'cx-vif-sablier': 'Cadre vivant du Sablier', 'cx-vif-araignee': 'Cadre vivant de la Veuve noire', 'cx-vif-loup': 'Cadre vivant du Loup de givre', 'cx-vif-orchidee': 'Cadre vivant de l’Orchidée', /* v585 */ 'cx-vif-dragon': 'Cadre vivant du Dragon', 'cx-vif-phenix': 'Cadre vivant du Phénix', 'cx-vif-amethyste': 'Cadre vivant de l’Améthyste', 'cx-vif-kraken': 'Cadre vivant du Kraken', 'cx-vif-nacre': 'Cadre vivant de la Nacre noire',   'cx-meute': 'Cadre de la meute',   'cx-eclipse': 'Cadre de l’Éclipse', 'cx-balance': 'Cadre du Juge des Sceaux',
  /* v480 */ 'cx-geode': 'Cadre de la géode d’améthyste', 'cx-pages': 'Cadre du grimoire déchiré', 'cx-corbeau': 'Cadre des corbeaux',   /* v550 : Saison I « La Nuit des Âmes » et Saison II « La Veillée de Noël » (images Gemini attendues) */
  'cx-citrouilles': 'Cadre des citrouilles sculptées', 'cx-ames': 'Couronne du Passeur des Âmes',
  /* v547 : Saison III « L'Hiver éternel », exclusifs de la voie enluminée (images Gemini attendues) */
  /* v565 : nouvelle image */ 'cx-hiver': 'Couronne de la Matriarche du Givre',
  /* v552 : Saisons IV à XII (février à octobre 2027, images Gemini attendues) */
  'cx-coeur-maudit': 'Couronne du Cœur maudit',   /* v565 : remplacements après le tri du 21 octobre 2026 */   /* v532 */ 'cx-carnaval': 'Cadre du carnaval des ombres', 'cx-phalenes': 'Cadre des phalènes', };
// Dos de cartes (v473 : images Gemini, assets/backs/<clé>.webp, tools/back-art.py ; choisis au Profil)
export const CODEX_BACKS = { /* v685 */ 'dos-lac-gele': 'Dos vivant du Lac gelé', /* v687 */ 'dos-larme-givre': 'Dos vivant de la Larme de givre', /* v630 */ 'dos-vif-lanternes': 'Dos vivant des Lanternes flottantes', 'dos-codex': 'Dos du Codex', 'dos-abime': 'Dos de l’Abîme', 'dos-fondateur': 'Dos du Fondateur', /* v638 */ 'dos-vif-fondateur': 'Dos vivant du Fondateur',
  /* réserve : collection « Les sept royaumes » (Échoppe ou saison II) */
  'dos-infernal': 'Dos du royaume Infernal', 'dos-abyssal': 'Dos du royaume Abyssal', 'dos-celeste': 'Dos du royaume Céleste', 'dos-sauvage': 'Dos du royaume Sauvage',
  'dos-necrotique': 'Dos du royaume Nécrotique', 'dos-primordial': 'Dos du royaume Primordial', 'dos-artificiel': 'Dos du royaume Artificiel',
  /* v480 : catalogue de l'Échoppe */ 'dos-ames': 'Dos de la Nuit des Âmes', 'dos-roses': 'Dos des cœurs maudits', 'dos-lune-sang': 'Dos de la Lune de sang', 'dos-devoreur': 'Dos du Dévoreur', 'dos-horloger': 'Dos de l’Horloger', 'dos-miroirs': 'Dos de la Sorcière des Miroirs', 'dos-jumeaux': 'Dos des Jumeaux du Crépuscule', 'dos-titan': 'Dos du Titan Endormi',
  /* v481 */ 'dos-abysse': 'Dos de L’Abysse', 'dos-mosaique': 'Dos de la mosaïque d’or', 'dos-encre': 'Dos de l’encre et du dragon', 'dos-alchimie': 'Dos de l’alchimiste', 'dos-reliquaire': 'Dos du reliquaire', 'dos-tapisserie': 'Dos de la chasse maudite', 'dos-vivant': 'Dos de chair vivante', 'dos-nebuleuse': 'Dos de la nébuleuse', 'dos-vitrail': 'Dos du vitrail de cathédrale',
  /* v550 */ 'dos-cimetiere': 'Dos du cimetière des âmes',
  /* v547 */   /* v552 */ 'dos-coeurs': 'Dos du cœur enchaîné',   /* v565 */ 'dos-passeur': 'Dos du Passeur', 'dos-aurore': 'Dos de l’aurore noire',
  'dos-vif-hiver': 'Dos vivant de l’Hiver', 'dos-vif-coeur': 'Dos vivant du Cœur maudit',
  /* v569 : dos vivants de l'Échoppe (dos fixes animés par tools/back-anim.py, mode lueur) et palier 30 de la Saison I */
  'dos-vif-nebuleuse': 'Dos vivant de la nébuleuse', 'dos-vif-abysse': 'Dos vivant de l’Abysse', 'dos-vif-devoreur': 'Dos vivant du Dévoreur',
  'dos-vif-lune-sang': 'Dos vivant de la Lune de sang', 'dos-vif-coeur-mecanique': 'Dos vivant du cœur mécanique', 'dos-vif-passeur': 'Dos vivant du Passeur',
  /* v572 */ 'dos-vif-chandelles': 'Dos vivant des chandelles', 'dos-vif-orage': 'Dos vivant de l’orage', 'dos-vif-ame': 'Dos vivant de l’âme captive', 
  /* v577 */ 'dos-vif-phenix': 'Dos vivant du Phénix', 'dos-vif-kraken': 'Dos vivant du Kraken', 'dos-vif-couronne': 'Dos vivant de la Couronne damnée', 'dos-vif-sablier': 'Dos vivant du Sablier éternel', 'dos-vif-coeur-dragon': 'Dos vivant du Cœur de dragon', 'dos-vif-portail': 'Dos vivant du Portail des Royaumes', 'dos-vif-destrier': 'Dos vivant du Destrier cauchemar', 'dos-vif-hydre': 'Dos vivant de l’Hydre', 'dos-vif-orchidee': 'Dos vivant de l’Orchidée d’obsidienne', 'dos-vif-astrolabe': 'Dos vivant de l’Astrolabe', 'dos-vif-meduse': 'Dos vivant de la Méduse des abysses', 'dos-vif-geode': 'Dos vivant de la Géode de sang', 'dos-vif-corbeau': 'Dos vivant du Corbeau roi', 'dos-vif-arbre': 'Dos vivant de l’Arbre-monde', /* v578 */ 'dos-vif-ailes': 'Dos vivant des Ailes d’or', 'dos-vif-main-ombre': 'Dos vivant de la Main d’ombre', 'dos-vif-masque': 'Dos vivant du Masque d’apparat', 'dos-vif-perle': 'Dos vivant de la Perle noire', 'dos-vif-trone': 'Dos vivant du Trône de l’Abysse',
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
export const LIVE_BACKS = ['dos-larme-givre', 'dos-lac-gele', 'dos-vif-lanternes', 'dos-vif-hiver', 'dos-vif-coeur', 'dos-vif-passeur', 'dos-vif-nebuleuse', 'dos-vif-abysse', 'dos-vif-devoreur', 'dos-vif-lune-sang', 'dos-vif-coeur-mecanique', 'dos-vif-chandelles', 'dos-vif-orage', 'dos-vif-ame', 
  /* v573 : tous les dos peints passent en dos vivants (même clé, fichier animé ; l'image fixe reste dans store/backs/<clé>-fixe.webp).
     dos-abysse, dos-coeur-mecanique, dos-devoreur, dos-eclipse, dos-lune-sang, dos-nebuleuse, dos-passeur montrent désormais l'animation de leur jumeau dos-vif-… (version fixe supprimée) */
  'dos-codex', 'dos-abime', 'dos-fondateur', 'dos-vif-fondateur', 'dos-infernal', 'dos-abyssal', 'dos-celeste', 'dos-sauvage', 'dos-necrotique', 'dos-primordial', 'dos-artificiel', 'dos-ames', 'dos-roses', 'dos-horloger', 'dos-miroirs', 'dos-jumeaux', 'dos-titan', 'dos-mosaique', 'dos-encre', 'dos-alchimie', 'dos-reliquaire', 'dos-tapisserie', 'dos-vivant', 'dos-vitrail', 'dos-cimetiere', 'dos-presents', 'dos-coeurs', 'dos-aurore', 'dos-carnaval', 'dos-phalene', 'dos-abysse', 'dos-coeur-mecanique', 'dos-devoreur', 'dos-lune-sang', 'dos-nebuleuse', 'dos-passeur', 'dos-vif-phenix', 'dos-vif-kraken', 'dos-vif-couronne', 'dos-vif-sablier', 'dos-vif-coeur-dragon', 'dos-vif-portail', 'dos-vif-destrier', 'dos-vif-hydre', 'dos-vif-orchidee', 'dos-vif-astrolabe', 'dos-vif-meduse', 'dos-vif-geode', 'dos-vif-corbeau', 'dos-vif-arbre', 'dos-vif-ailes', 'dos-vif-main-ombre', 'dos-vif-masque', 'dos-vif-perle', 'dos-vif-trone'];
const BV = (k, cost) => ({ id: k, kind: 'back', live: true, give: { back: k }, cost }); /* v569 : dos vivant vendu à l'Échoppe */
export const SACHETS = { /* v685 */ 'sachet-vif-hiver': 'Sachet vivant de l’Hiver éternel', /* v630 */ 'sachet-vif-ames': 'Sachet vivant de la Nuit des Âmes', 'sachet-fondateur': 'Sachet du Fondateur', /* v638 */ 'sachet-vif-fondateur': 'Sachet vivant du Fondateur',
  /* v570 : sachets vendus à l'Échoppe */ 'sachet-braise': 'Sachet de braise', 'sachet-lune-sang': 'Sachet de la Lune de sang', 'sachet-souverain': 'Sachet du Souverain',
  /* v572 : sachets vivants */ 'sachet-vif-eclipse': 'Sachet vivant de l’éclipse',
  /* v578 */ 'sachet-vif-phenix': 'Sachet vivant du Phénix', 'sachet-vif-kraken': 'Sachet vivant du Kraken', 'sachet-vif-dragon': 'Sachet vivant du Dragon', 'sachet-vif-astrolabe': 'Sachet vivant de l’Astrolabe', 'sachet-vif-givre-noir': 'Sachet vivant du Givre noir', 'sachet-vif-orage': 'Sachet vivant de l’Orage', 'sachet-vif-foret': 'Sachet vivant de la Forêt ancienne', /* v579 */ 'sachet-vif-necro': 'Sachet vivant du Spectre vert', 'sachet-vif-automate': 'Sachet vivant de l’Automate', 'sachet-vif-celeste': 'Sachet vivant des Ailes d’or', 'sachet-vif-infernal': 'Sachet vivant des Cornes ardentes', /* v588 */ 'sachet-vif-meduse': 'Sachet vivant de la Méduse', 'sachet-vif-corbeau': 'Sachet vivant du Corbeau', 'sachet-vif-sablier': 'Sachet vivant du Sablier', 'sachet-vif-araignee': 'Sachet vivant de la Veuve noire', 'sachet-vif-scorpion': 'Sachet vivant du Scorpion', 'sachet-vif-loup': 'Sachet vivant du Loup de givre', 'sachet-vif-orchidee': 'Sachet vivant de l’Orchidée', 'sachet-vif-geode': 'Sachet vivant de la Géode', 'sachet-vif-coeur': 'Sachet vivant du Cœur de rubis' };
const SA = (k, cost) => ({ id: k, kind: 'sachet', give: { sachet: k }, cost });
export const PLATES = { /* v685 */ 'pl-glacier': 'Plaque du Glacier', 'pl-cerf-givre': 'Plaque du Cerf de givre', /* v638 */ 'pl-fondateur': 'Plaque du Fondateur', /* v630 */ 'pl-lanternes': 'Plaque des Lanternes', 'pl-barque': 'Plaque de la Barque du Passeur', 'pl-braise': 'Plaque de braise',
  'pl-givre': 'Plaque de givre', 
  /* v572 */ 'pl-sang': 'Plaque de sang', 'pl-dragon': 'Plaque du dragon',
  /* v580 */ 'pl-kraken': 'Plaque du Kraken', 'pl-automate': 'Plaque de l’Automate', 'pl-empereur': 'Plaque de l’Empereur',
  /* v589 */ 'pl-meduse': 'Plaque de la Méduse', 'pl-corbeau': 'Plaque du Corbeau', 'pl-serpent': 'Plaque du Serpent', 'pl-araignee': 'Plaque de la Veuve noire', 'pl-loup': 'Plaque du Loup de givre', 'pl-lune': 'Plaque de la Lune d’argent', 'pl-ambre': 'Plaque de l’Ambre', 'pl-astrolabe': 'Plaque de l’Astrolabe',
  /* v692 */ 'pl-titan': 'Plaque du Titan', 'pl-forge': 'Plaque de la Forge', 'pl-racines': 'Plaque des Racines', 'pl-aile': 'Plaque de l’Aile céleste', 'pl-tombes': 'Plaque de la Nécropole', 'pl-encre': 'Plaque de l’Encre de l’Abysse' };
export const EMOTES = {
  're-salut': { text: 'Salutations.', free: true, pic: 'o-salut' }, 're-bien': { text: 'Bien joué.', free: true, pic: 'o-bien' },
  're-merci': { text: 'Merci.', free: true, pic: 'o-merci' }, 're-aie': { text: 'Aïe…', free: true, pic: 'o-aie' },
  're-mammon': { text: 'Tu me dois déjà trois cartes.', who: 'banquier', name: 'Mammon' }, 're-souveraine': { text: 'Incline-toi, ce sera plus simple.', who: 'souverain', name: 'La Souveraine du Néant' },
  're-archiviste': { text: 'J’ai déjà archivé ta défaite.', who: 'archiviste', name: 'L’Archiviste' }, 're-ilda': { text: 'Même moi, j’aurais vu ce coup.', who: 'initie', name: 'Ilda' },
  're-orvel': { text: 'Cette carte ira bien dans ma vitrine.', who: 'collectionneur', name: 'Maître Orvel' }, 're-vesna': { text: 'Trois coups d’avance. Toi ? Zéro.', who: 'stratege', name: 'Sœur Vesna' },
  're-maitre': { text: 'Relis les règles. Lentement.', who: 'maitre', name: 'Le Maître des Sceaux' }, 're-echo': { text: 'L’Abîme a ri. Moi aussi.', who: 'echo', name: 'L’Écho de l’Abîme' },
  /* v586 : réactions des 20 gardiens (portrait = leur figure peinte, assets/bosses) */
  're-g-devoreur': { text: 'Ta main ? Un amuse-bouche.', boss: 'devoreur', name: 'Le Dévoreur' },
  're-g-matriarche': { text: 'Tu trembles ? C’est le froid.', boss: 'matriarche', name: 'La Matriarche du Givre' },
  're-g-roi': { text: 'Joli visage. Je le prends.', boss: 'roi', name: 'Le Roi sans Visage' },
  're-g-architecte': { text: 'Ton plan a des fissures.', boss: 'architecte', name: 'L’Architecte' },
  're-g-eclipse': { text: 'Ta chance vient de s’éteindre.', boss: 'eclipse', name: 'L’Éclipse' },
  're-g-essaim': { text: 'Tu bourdonnes pour rien.', boss: 'essaim', name: 'La Reine des Essaims' },
  're-g-bourreau': { text: 'Bouge pas, je prends tes mesures.', boss: 'bourreau', name: 'Le Bourreau' },
  're-g-choeur': { text: 'Tu coules ? Chante, au moins.', boss: 'choeur', name: 'Le Chœur des Noyés' },
  're-g-chaines': { text: 'Tu tires sur tes chaînes ? Mignon.', boss: 'chaines', name: 'Le Seigneur des Chaînes' },
  're-g-horloge': { text: 'Tic-tac… ton tour, c’est long.', boss: 'horloge', name: 'L’Horloger' },
  're-g-miroirs': { text: 'Ton reflet joue mieux que toi.', boss: 'miroirs', name: 'La Sorcière des Miroirs' },
  're-g-golem': { text: 'Frappe plus fort, j’ai senti une brise.', boss: 'golem', name: 'Le Golem de Cendres' },
  're-g-peste': { text: 'Ton jeu sent la fin.', boss: 'peste', name: 'La Peste Grise' },
  're-g-chasseur': { text: 'Je t’ai vu venir de loin.', boss: 'chasseur', name: 'Le Chasseur Sans Ombre' },
  're-g-voeux': { text: 'Fais un vœu : gagner, peut-être ?', boss: 'voeux', name: 'La Dame des Vœux' },
  're-g-titan': { text: 'Réveille-moi quand tu joues bien.', boss: 'titan', name: 'Le Titan Endormi' },
  're-g-jumeaux': { text: 'À deux contre toi, c’est presque juste.', boss: 'jumeaux', name: 'Les Jumeaux du Crépuscule' },
  're-g-juge': { text: 'Coupable de mauvais jeu.', boss: 'juge', name: 'Le Juge des Sceaux' },
  're-g-bete': { text: 'Ta défaite était écrite.', boss: 'bete', name: 'La Bête de l’Apocalypse' },
  're-g-abysse': { text: 'Plus tu descends, plus je souris.', boss: 'abysse', name: 'L’Abysse' },
  /* v630 : réactions de la Saison I (portrait propre assets/emotes/<clé>.webp, exclusives au Codex : jamais à l'Échoppe) */
  're-feu-follet': { text: 'Suis-moi… droit vers ta défaite.', pic: 'a-feu-follet', name: 'Le Feu follet', codex: true },
  're-passeur': { text: 'Prépare ta pièce, je t’emmène.', pic: 'a-passeur', name: 'Le Passeur des Âmes', codex: true },
  /* v685 : Saison II */ 're-blizzard': { text: 'Tu as froid aux yeux ?', pic: 'a-blizzard', name: 'Le Blizzard', codex: true },
  're-sentinelle': { text: 'Nul ne passe. Toi encore moins.', pic: 'a-sentinelle', name: 'La Sentinelle du givre', codex: true },
};
export const FREE_EMOTES = Object.keys(EMOTES).filter((k) => EMOTES[k].free);
export const PAID_EMOTES = Object.keys(EMOTES).filter((k) => !EMOTES[k].free);
export const ARBITRE_EMOTES = PAID_EMOTES.filter((k) => EMOTES[k].who);
export const BOSS_EMOTES = PAID_EMOTES.filter((k) => EMOTES[k].boss);
const PL = (k, cost) => ({ id: k, kind: 'plate', give: { plate: k }, cost });
/* v632 : tapis de jeu (plateau des Duels des Sceaux, assets/tapis/<clé>.webp, 896 × 1200) et fonds de profil (en-tête du profil,
   vu aussi par les autres joueurs : assets/fonds/<clé>.webp, 1024 × 572) */
export const TAPIS = { 'tp-mammon': 'Tapis du Banquier Mammon', 'tp-abysse': 'Tapis de l’Autel de l’Abysse', 'tp-obsidienne': 'Tapis d’obsidienne et d’or', 'tp-givre': 'Tapis de la Glace noire',
  /* v690 */ 'tp-braise': 'Tapis de la Forge infernale', 'tp-marees': 'Tapis des Marées noires', 'tp-racines': 'Tapis du Réveil des Racines', 'tp-celeste': 'Tapis du Parvis céleste', 'tp-rouages': 'Tapis de la Forge sans Maître', 'tp-tombes': 'Tapis de la Nécropole', 'tp-dragon': 'Tapis du Dragon primordial' };
export const FONDS = { 'fp-trone': 'Fond du Trône de braise', 'fp-cathedrale': 'Fond de la Cathédrale engloutie', 'fp-bibliotheque': 'Fond de la Bibliothèque interdite', 'fp-foret': 'Fond de la Forêt sous la lune', /* v638 */ 'fp-fondateur': 'Fond de la Salle des Premiers Scelleurs',
  /* v691 */ 'fp-abysse': 'Fond du Bord de l’Abysse', 'fp-glacier': 'Fond du Palais de la Matriarche', 'fp-forge': 'Fond de la Forge sans Maître', 'fp-titan': 'Fond du Titan endormi', 'fp-necropole': 'Fond de la Nécropole des lanternes', 'fp-ciel': 'Fond des Ruines célestes', 'fp-tresor': 'Fond de l’Antre du Trésor', 'fp-epave': 'Fond du Cimetière des navires' };
const TP = (k, cost) => ({ id: k, kind: 'mat', give: { mat: k }, cost });
const FP = (k, cost) => ({ id: k, kind: 'fond', give: { fond: k }, cost });
const RE = (k, cost) => ({ id: k, kind: 'emote', give: { emote: k }, cost });
export const ROYAUMES = ['dos-infernal', 'dos-abyssal', 'dos-celeste', 'dos-sauvage', 'dos-necrotique', 'dos-primordial', 'dos-artificiel'];
/* v535 : cadres de la meute, des corbeaux, des chaînes et des roses noires retirés de la vente (leur ornement cachait le visage de la créature) */
/* v562 : tri du propriétaire (Atelier des cosmétiques, 21 octobre 2026) : 25 objets retirés (RETIRED_COSM). Ils restent
   connus (CODEX_FRAMES, FINISHES, CSS) pour les parties qui les auraient, mais ne se gagnent ni ne s'achètent plus. */
/* v583 : tri du 22 octobre 2026 : 71 cosmétiques définitivement supprimés (code, images, saisons, Échoppe) ;
   retirés des parties qui les avaient (migrate, js/core/save.js). */
export const REMOVED_COSM = ['tp-eclipse', /* v758 : l’éclipse au centre gênait la lecture des cartes */ 'cx-vif-chandelles', 'cx-vif-lune', 'dos-vif-forge', 'dos-vif-oeil-or', 'dos-vif-tresor', 'sachet-vif-lanterne', 'sachet-vif-spectre', 'sachet-vif-empereur', 'sachet-vif-tresor', 'pl-or-noir', 'pl-foudre', 'pl-souverain', 'pl-nacre', 'pl-foret', 'pl-sablier', 'pl-orchidee', 'pl-cristal', 'pl-tresor', 'pl-phenix', 'cx-encre', 'cx-sang', 'cx-or', 'cx-abime', 'cx-givre', 'cx-braise', 'cx-serpents', 'cx-vitrail', 'cx-rouages', 'cx-racines', 'cx-yeux', 'cx-houx', 'cx-aurore', 'cx-roses', 'cx-prince', 'cx-leviathan', 'cx-seraphin', 'cx-liche', 'cx-ouroboros', 'cx-automate', 'cx-gueule', 'cx-horloger', 'cx-constellation', 'cx-sablier', 'cx-souverain', 'cx-guirlandes', 'cx-glace-noire', 'cx-loups-neige', 'cx-coeurs', 'cx-epines', 'cx-mandragore', 'cx-arbre-monde', 'cx-masques', 'cx-arlequin', 'cx-lune-pale', 'cx-jardin-lune', 'cx-lune-reine', 'cx-flammes', 'cx-solstice-feu', 'cx-marees', 'cx-corail', 'cx-profondeurs', 'cx-forge-titans', 'cx-enclume', 'cx-titan', 'cx-plumes', 'cx-epis', 'cx-faucheur', 'cx-anniversaire', 'cx-veilleuses', 'cx-reliquaire-ames', 'cx-cristaux-sang', 'dos-blizzard', 'dos-hiver', 'dos-mandragore', 'dos-racines', 'dos-bal', 'dos-lune-pale', 'dos-jardin', 'dos-phenix', 'dos-brasier', 'dos-marees', 'dos-leviathan', 'dos-forge-titans', 'dos-marteau', 'dos-moissons', 'dos-epouvantail', 'dos-anniversaire', 'dos-glas', 'dos-veillee', 'sachet-ames',
  /* v593 : revue des doublons du 22 octobre 2026 (Mode Créateur) : 21 objets supprimés, plus dos-eclipse (même image que dos-vif-eclipse) */
  'cx-vif-corbeau', 'cx-vif-rubis', 'cx-vif-perle', 'cx-vif-foret', 'dos-vif-eclipse', 'dos-eclipse', 'dos-solstice', 'dos-carte-abysse', 'dos-art-deco', 'dos-tarot',
  'sachet-vif-sang', 'sachet-givre', 'sachet-vif-ecrin', 'sachet-obsidienne', 'sachet-vif-abysse', 'sachet-grimoire',
  'pl-obsidienne', 'pl-grimoire', 'pl-ossuaire', 'pl-pierre', 'pl-eclipse', 'pl-abysse',
  /* v674 : plus de saison de Noël : ses objets sont supprimés */ 'cx-noel', 'dos-vif-veillee', 'sachet-veillee', 'dos-presents'];
export const RETIRED_COSM = ['cx-fondateur', 'cx-os', 'cx-ruche', 'cx-lanternes', 'cx-voile', 'cx-eclipse', 'cx-balance', 'cx-geode', 'cx-pages', 'cx-corbeau', 'cx-carnaval', 'cx-phalenes',
  'fin-vitrail', 'fin-constellee', 'fin-ossuaire', 'fin-nacree', 'fin-runique', 'fin-scellee', 'fin-draconique', 'fin-feux-follets', 'fin-houx', 'fin-noel', 'fin-roses', 'fin-coeurs', 'fin-hiver'];
/* v584 : l'Échoppe rangée (demande du propriétaire du 22 octobre 2026) : 20 objets par catégorie (cadres, dos, sachets,
   plaques), une rareté selon la beauté de l'objet (les plus beaux sont les plus rares et les plus chers), un prix par rareté.
   Les dos et sachets qui ne sont plus en vente vont dans PASS_RESERVE (gardés pour les saisons du Codex). Tout est vivant. */
export const COSM_PRICE = { rare: 180, epic: 280, leg: 420, myth: 600 };
export const COSM_RARITY = {
  /* cadres (10 en vente ; 10 de plus attendus, prompts §257-266) */
  'cx-vif-soleil-noir': 'myth', 'cx-vif-dragon': 'myth', 'cx-vif-phenix': 'myth', 'cx-vif-amethyste': 'leg', 'cx-vif-kraken': 'epic', 'cx-vif-nacre': 'epic', 'cx-vif-sang': 'leg', 'cx-vif-brasier': 'leg', 'cx-vif-givre': 'leg',
  'cx-vif-ames': 'epic', 'cx-vif-abysse': 'epic', 'cx-vif-maree': 'epic', 'cx-vif-foudre': 'rare', 'cx-vif-etoiles': 'rare', 'cx-vif-rouages': 'rare', 'cx-vif-venin': 'rare', 'cx-vif-ambre': 'rare', 'cx-vif-obsidienne': 'rare',
  /* v591 */ 'cx-vif-sablier': 'leg', 'cx-vif-meduse': 'epic', 'cx-vif-serpent': 'epic', 'cx-vif-loup': 'epic', 'cx-vif-araignee': 'rare', 'cx-vif-orchidee': 'rare',
  /* dos */
  'dos-vif-phenix': 'myth', 'dos-vif-ailes': 'myth', 'dos-vif-couronne': 'myth', 'dos-vif-kraken': 'myth', 'dos-vif-portail': 'myth',
  'dos-vif-nebuleuse': 'leg', 'dos-vitrail': 'leg', 'dos-vif-lune-sang': 'leg', 'dos-vif-trone': 'leg', 'dos-vif-meduse': 'leg', 'dos-vif-coeur-dragon': 'leg', 'dos-vif-corbeau': 'leg', 'dos-vif-abysse': 'leg', 'dos-vif-coeur-mecanique': 'leg',
  'dos-vif-astrolabe': 'epic', 'dos-vif-orchidee': 'epic', 'dos-vif-sablier': 'epic', 'dos-vif-hydre': 'epic', 'dos-abyssal': 'epic', 'dos-infernal': 'epic', 'dos-vif-perle': 'epic', 'dos-vif-masque': 'epic', 'dos-mosaique': 'epic', 'dos-vif-destrier': 'epic', 'dos-vif-ame': 'epic', 'dos-vif-main-ombre': 'epic', 'dos-vif-arbre': 'epic', 'dos-vif-geode': 'epic', 'dos-vif-devoreur': 'epic',
  'dos-sauvage': 'rare', 'dos-necrotique': 'rare', 'dos-primordial': 'rare', 'dos-artificiel': 'rare', 'dos-celeste': 'rare', 'dos-phalene': 'rare', 'dos-vif-chandelles': 'rare', 'dos-miroirs': 'rare', 'dos-reliquaire': 'rare', 'dos-horloger': 'rare', 'dos-abime': 'rare', 'dos-vif-orage': 'rare', 'dos-jumeaux': 'rare', 'dos-titan': 'rare', 'dos-encre': 'rare', 'dos-tapisserie': 'rare', 'dos-vivant': 'rare', 'dos-alchimie': 'rare',
  /* sachets */
  'sachet-vif-dragon': 'myth', 'sachet-vif-eclipse': 'myth', 
  'sachet-vif-phenix': 'leg', 'sachet-vif-kraken': 'epic', 'sachet-vif-astrolabe': 'epic', 'sachet-vif-infernal': 'epic', 'sachet-souverain': 'epic',
  'sachet-vif-celeste': 'rare', 'sachet-vif-givre-noir': 'rare', 'sachet-braise': 'rare', 'sachet-vif-orage': 'rare', 'sachet-lune-sang': 'rare', 'sachet-vif-necro': 'rare', 'sachet-vif-automate': 'rare', 'sachet-vif-foret': 'rare',
  /* v588 */ 'sachet-vif-meduse': 'leg', 'sachet-vif-araignee': 'leg', 'sachet-vif-coeur': 'epic', 'sachet-vif-corbeau': 'epic', 'sachet-vif-loup': 'epic', 'sachet-vif-orchidee': 'epic', 'sachet-vif-sablier': 'rare', 'sachet-vif-geode': 'rare', 'sachet-vif-scorpion': 'rare',
  /* plaques */
  'pl-empereur': 'myth', 
  'pl-sang': 'leg', 'pl-kraken': 'leg', 'pl-automate': 'leg',
  'pl-braise': 'epic', 'pl-givre': 'epic', 'pl-dragon': 'epic', 
  /* v632 : tapis et fonds de profil */ 'tp-mammon': 'leg', 'tp-abysse': 'leg', 'tp-obsidienne': 'epic', 'tp-givre': 'epic', /* v690 */ 'tp-braise': 'epic', 'tp-marees': 'epic', 'tp-racines': 'rare', 'tp-celeste': 'epic', 'tp-rouages': 'leg', 'tp-tombes': 'epic', 'tp-dragon': 'leg', 'fp-trone': 'leg', 'fp-cathedrale': 'leg', 'fp-bibliotheque': 'epic', 'fp-foret': 'epic', /* v691 */ 'fp-abysse': 'leg', 'fp-glacier': 'epic', 'fp-forge': 'leg', 'fp-titan': 'myth', 'fp-necropole': 'epic', 'fp-ciel': 'leg', 'fp-tresor': 'epic', 'fp-epave': 'epic',
  /* v589 */ 'pl-corbeau': 'leg', 'pl-loup': 'leg', 'pl-araignee': 'epic', 'pl-ambre': 'epic', 'pl-meduse': 'rare', 'pl-serpent': 'rare', 'pl-lune': 'rare', 'pl-astrolabe': 'rare',
  /* v692 */ 'pl-titan': 'leg', 'pl-forge': 'epic', 'pl-racines': 'rare', 'pl-aile': 'leg', 'pl-tombes': 'epic', 'pl-encre': 'epic',
};
const SHOP_FRAMES = ['cx-vif-dragon', 'cx-vif-phenix', 'cx-vif-soleil-noir', 'cx-vif-amethyste', 'cx-vif-sablier', 'cx-vif-sang', 'cx-vif-brasier', 'cx-vif-givre', 'cx-vif-kraken', 'cx-vif-nacre', 'cx-vif-ames', 'cx-vif-abysse', 'cx-vif-maree', 'cx-vif-meduse', 'cx-vif-serpent', 'cx-vif-loup', 'cx-vif-foudre', 'cx-vif-etoiles', 'cx-vif-rouages', 'cx-vif-venin', 'cx-vif-ambre', 'cx-vif-obsidienne', 'cx-vif-araignee', 'cx-vif-orchidee'];
/* v586 (« je veux tout ») : tous les dos, sachets et plaques sont en vente, rangés par rareté ; seul le dos de l'alchimiste
   reste de côté (triangle lumineux proche de l'œil dans le triangle) */
const OFF_SALE = ['dos-alchimie'];
const ORDER = ['myth', 'leg', 'epic', 'rare'];
const shopOf = (re) => Object.keys(COSM_RARITY).filter((k) => re.test(k) && !OFF_SALE.includes(k)).sort((a, b) => ORDER.indexOf(COSM_RARITY[a]) - ORDER.indexOf(COSM_RARITY[b]));
const SHOP_BACKS = shopOf(/^dos-/);
const SHOP_SACHETS = shopOf(/^sachet-/);
const SHOP_PLATES = shopOf(/^pl-/);
const SHOP_MATS = shopOf(/^tp-/), SHOP_FONDS = shopOf(/^fp-/); /* v632 */
/* gardés pour les saisons du Codex (plus en vente ; ceux qui les ont les gardent) */
export const PASS_RESERVE = [...Object.keys(COSM_RARITY).filter((k) => /^(dos|sachet|pl)-/.test(k) && ![...SHOP_BACKS, ...SHOP_SACHETS, ...SHOP_PLATES].includes(k))];
const RZ = (mk, k, extra) => ({ ...mk(k, COSM_PRICE[COSM_RARITY[k]]), r: COSM_RARITY[k], live: true, ...extra });
export const CATALOG = [
  ...SHOP_FRAMES.map((k) => RZ(F, k)), ...SHOP_BACKS.map((k) => RZ(B, k)), ...SHOP_SACHETS.map((k) => RZ(SA, k)), ...SHOP_PLATES.map((k) => RZ(PL, k)), ...SHOP_MATS.map((k) => RZ(TP, k, { live: false })), ...SHOP_FONDS.map((k) => RZ(FP, k, { live: false })),
  ...PAID_EMOTES.filter((k) => !EMOTES[k].codex).map((k) => ({ ...RE(k, 100), r: 'rare' })), /* v630 : sans les réactions du Codex */
  { id: 'arbitres', kind: 'bundle', name: 'Le Cercle des arbitres', give: { emotes: ARBITRE_EMOTES }, cost: 600, desc: 'Les huit réactions des arbitres d’un coup (800 à l’unité).' },
  { id: 'gardiens', kind: 'bundle', name: 'Les vingt gardiens', give: { emotes: BOSS_EMOTES }, cost: 1500, desc: 'Les vingt réactions des gardiens d’un coup (2 000 à l’unité).' },
  { id: 'royaumes', kind: 'bundle', name: 'Les sept royaumes', give: { backs: ROYAUMES }, cost: Math.round(ROYAUMES.reduce((n, k) => n + COSM_PRICE[COSM_RARITY[k]], 0) * 0.8 / 10) * 10, desc: 'Les sept dos vivants des royaumes d’un coup, moins cher qu’à l’unité.' },
];
// Exclusifs du Codex enluminé (jamais en vente). v547 : tous les cosmétiques de la voie enluminée (Saison I : l'hiver),
// plus les anciens objets du Codex gardés pour une saison future (encre, sang, enluminé, Abîme, dos du Codex).
export const CODEX_ONLY = ['dos-codex',
  /* v550 */ 'cx-lanternes', 'cx-voile', 'cx-citrouilles', 'cx-ames', 'dos-ames', 'dos-cimetiere', 'fin-spectrale', 'fin-feux-follets', 'fin-ames',
  'cx-hiver', 'fin-givree', 'fin-aurore', 'fin-hiver'];

// Paliers. v547 (retour du propriétaire : « on gagne énormément en gratuit et peu en payant ») : la voie gratuite donne un
// palier sur deux (éclats, cendres, coffres, tickets) ; la voie enluminée donne quelque chose à CHAQUE palier, tout sur le
// thème de la saison (l'Hiver éternel), cosmétique seulement et jamais en vente à l'Échoppe (CODEX_ONLY).
// Palier 30 : la récompense ultime (couronne animée, finition, titre). null = rien à ce palier.
const FREE = (t) => (t === CODEX.tiers ? { chests: { abyssal: 1 } }
  : t % 10 === 0 ? { chests: { [t < 15 ? 'fer' : 'or']: 1 } }
  : t === 5 || t === 15 || t === 25 ? { tickets: { standard: 1 } }
  : t === 3 || t === 13 || t === 23 ? { chocTok: 1 } /* v811 : un jeton du Choc des Boosters */
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
/* v674 (décision du propriétaire du 23 octobre 2026 : « des saisons qui ont vraiment un sens avec l'identité du jeu, pas de
   fêtes de la vraie vie ») : plus de saison de Noël ni de Saint-Valentin. Chaque saison est une « veille » : depuis que le
   Rêveur remue sous la Fosse (docs/canon.md), un royaume ou une figure du Bestiaire veille pour qu'il ne s'éveille pas.
   Les clés restent (rien n'est encore sorti) ; seuls l'ordre, les dates et les noms changent. */
export const SEASONS = [
  { key: 's1-ames', num: 'I', name: 'La Nuit des Âmes', art: 'assets/ui/cx-saison-ames.webp',
    best: ['cx-ames', 'dos-vif-passeur', 'dos-vif-lanternes'], pitch: 'Au royaume Nécrotique, les morts veillent, lanterne à la main, sur le passage des âmes. Une récompense à chaque palier : cadres vivants, dos de cartes, sachet, plaques, réactions et titres de la Nuit des Âmes, introuvables à l’Échoppe. Au palier 30, la Couronne du Passeur des Âmes et le Dos vivant du Passeur.',
    titles: ['Veilleur des tombes', 'Porteur de lanterne', 'Ami des feux follets', 'Voix des trépassés', 'Gardien des âmes perdues', 'Celui qui ne dort pas'],
    /* v630 : les 8 places vides remplies (paliers 3, 6, 8, 10, 14, 15, 18, 20, 24, 25) */
    items: [{ plate: 'pl-lanternes' }, { back: 'dos-ames' }, { emote: 're-feu-follet' }, { frame: 'cx-vif-feux-follets' }, { sachet: 'sachet-vif-ames' }, { back: 'dos-cimetiere' }, { emote: 're-passeur' }, { back: 'dos-vif-lanternes' }, { plate: 'pl-barque' }, { frame: 'cx-vif-brume' }],
    ultimate: { frame: 'cx-ames', back: 'dos-vif-passeur', title: 'Passeur des Âmes' } },
  { key: 's3-hiver', num: 'II', name: 'L’Hiver éternel', art: 'assets/ui/cx-saison1.webp',
    best: ['cx-hiver', 'dos-vif-hiver', 'cx-vif-aurore'], pitch: 'La Matriarche du Givre a offert son royaume à l’hiver pour qu’il ne change jamais, et son froid tient les dormeurs éveillés. Une récompense à chaque palier : cadres vivants, dos de cartes, sachet, plaques, réactions et titres de l’Hiver éternel, introuvables à l’Échoppe. Au palier 30, la Couronne de la Matriarche du Givre et le Dos vivant de l’Hiver.',
    titles: ['Veilleur du long hiver', 'Marcheur des neiges', 'Chasseur d’aurores', 'Cœur de givre', 'Voix du blizzard', 'Sujet de la Matriarche'],
    /* v685 : paliers 3, 6, 8, 10, 14, 15, 18, 20, 24, 25 (palier 6 : Larme de givre, v687) */
    items: [{ plate: 'pl-glacier' }, { back: 'dos-larme-givre' }, { emote: 're-blizzard' }, { frame: 'cx-vif-aurore' }, { sachet: 'sachet-vif-hiver' }, { back: 'dos-lac-gele' }, { emote: 're-sentinelle' }, { back: 'dos-aurore' }, { plate: 'pl-cerf-givre' }, { frame: 'cx-vif-blizzard' }],
    ultimate: { frame: 'cx-hiver', back: 'dos-vif-hiver', title: 'Souverain de l’Hiver éternel' } },
  { key: 's9-marees', num: 'III', name: 'Les Marées noires', art: 'assets/ui/cx-saison-marees.webp',
    best: [], pitch: 'Sous la Fosse, quelque chose rêve. Les Abyssaux veillent à ce que les marées le bercent encore. Une récompense à chaque palier : titres et obsidiennes des Marées noires, introuvables à l’Échoppe.',
    titles: ['Écume noire', 'Chanteur des profondeurs', 'Pêcheur de perles', 'Marcheur des abysses', 'Voix de la marée', 'Cœur de corail'],
    items: [null, null, null, null, null, null],
    ultimate: { title: 'Seigneur des Marées' } },
  { key: 's5-racines', num: 'IV', name: 'Le Réveil des Racines', art: 'assets/ui/cx-saison-racines.webp',
    best: [], pitch: 'La Forêt Première ne dort que d’un œil : ses racines sentent ce qui remue sous la terre. Une récompense à chaque palier : titres et obsidiennes du Réveil des Racines, introuvables à l’Échoppe.',
    titles: ['Graine de l’Abysse', 'Éveilleur de sève', 'Ami des mandragores', 'Voix de la forêt', 'Cœur de chêne', 'Racine profonde'],
    items: [null, null, null, null, null, null],
    ultimate: { title: 'Gardien des Racines' } },
  { key: 's6-carnaval', num: 'V', name: 'La Cour sans Visage', art: 'assets/ui/cx-saison-cour.webp',
    best: ['dos-carnaval'], pitch: 'Les courtisans du Roi sans Visage dansent encore, et chaque masque cache un dormeur. Une récompense à chaque palier : titres, un dos de cartes et des obsidiennes de la Cour sans Visage, introuvables à l’Échoppe.',
    titles: ['Danseur masqué', 'Visage de velours', 'Rire dans l’ombre', 'Courtisan sans visage', 'Invité du bal', 'Celui qui change de visage'],
    items: [null, { back: 'dos-carnaval' }, null, null, null, null],
    ultimate: { title: 'Héritier du Roi sans Visage' } },
  { key: 's4-coeurs', num: 'VI', name: 'Le Pacte de sang', art: 'assets/ui/cx-saison-pacte.webp',
    best: ['cx-coeur-maudit', 'dos-vif-coeur', 'dos-coeurs'], pitch: 'À la Géhenne, on vend son cœur aux démons pour ne jamais s’endormir. Le prix se paie toujours. Une récompense à chaque palier : cadres, dos de cartes et titres du Pacte de sang, introuvables à l’Échoppe. Au palier 30, la Couronne du Cœur maudit et le Dos vivant du Cœur maudit.',
    titles: ['Signataire de sang', 'Porteur de roses noires', 'Cœur épineux', 'Âme engagée', 'Briseur de serments', 'Créancier des démons'],
    items: [null, { back: 'dos-roses' }, null, null, null, { back: 'dos-coeurs' }, null, null],
    ultimate: { frame: 'cx-coeur-maudit', back: 'dos-vif-coeur', title: 'Souverain des Cœurs maudits' } },
  { key: 's7-lune', num: 'VII', name: 'Les Jardins de la Lune pâle', art: 'assets/ui/cx-saison-lune.webp',
    best: [], pitch: 'Dans les jardins des Sept Cieux, la lune pâle veille sur ceux qui refusent de dormir. Une récompense à chaque palier : titres et obsidiennes des Jardins de la Lune pâle, introuvables à l’Échoppe.',
    titles: ['Cueilleur de rosée', 'Ami des phalènes', 'Promeneur nocturne', 'Fleur de minuit', 'Enfant de la lune', 'Gardien des jardins'],
    items: [null, null, null, null, null, null],
    ultimate: { title: 'Jardinier de la Lune pâle' } },
  { key: 's10-forge', num: 'VIII', name: 'La Forge Sans Maître', art: 'assets/ui/cx-saison-forge.webp',
    best: [], pitch: 'Depuis que l’Horloger a disparu, la Forge n’a jamais cessé de produire. Personne ne sait pour qui. Une récompense à chaque palier : titres et obsidiennes de la Forge Sans Maître, introuvables à l’Échoppe.',
    titles: ['Apprenti forgeron', 'Frappeur d’enclume', 'Main de fer', 'Souffle de la forge', 'Cœur d’acier', 'Rouage infatigable'],
    items: [null, null, null, null, null, null],
    ultimate: { title: 'Héritier de la Forge' } },
  { key: 's8-solstice', num: 'IX', name: 'Le Brasier des Titans', art: 'assets/ui/cx-saison-titans.webp',
    best: [], pitch: 'Les Titans font semblant de dormir sous les montagnes : tant qu’ils veillent, le Rêveur ne s’éveille pas. Leur brasier, lui, ne s’éteint jamais. Une récompense à chaque palier : titres et obsidiennes du Brasier des Titans, introuvables à l’Échoppe.',
    titles: ['Porteur de torche', 'Danseur des braises', 'Enfant du brasier', 'Cœur ardent', 'Flamme qui ne s’éteint pas', 'Ami du phénix'],
    items: [null, null, null, null, null, null],
    ultimate: { title: 'Cœur des Titans' } },
  { key: 's11-moissons', num: 'X', name: 'Les Moissons d’ombre', art: 'assets/ui/cx-saison-moissons.webp',
    best: [], pitch: 'Dans les champs d’ombre, on fauche ce que le Rêveur a semé dans les songes des vivants. Une récompense à chaque palier : titres et obsidiennes des Moissons d’ombre, introuvables à l’Échoppe.',
    titles: ['Glaneur d’ombres', 'Ami des corbeaux', 'Gardien des champs', 'Lame de la récolte', 'Veilleur des granges', 'Épouvantail vivant'],
    items: [null, null, null, null, null, null],
    ultimate: { title: 'Faucheur des Ombres' } },
  { key: 's12-anniv', num: 'XI', name: 'Les Pages perdues', art: 'assets/ui/cx-saison-pages.webp',
    best: ['dos-codex'], pitch: 'Chaque page retrouvée rend un peu de sens au Bestiaire. Certaines n’auraient jamais dû être écrites. Une récompense à chaque palier : titres, un dos de cartes et des obsidiennes des Pages perdues, introuvables à l’Échoppe.',
    titles: ['Lecteur du Bestiaire', 'Témoin de l’Abysse', 'Chercheur de pages', 'Gardien des pages', 'Plume de l’Abysse', 'Mémoire du Bestiaire'],
    items: [null, { back: 'dos-codex' }, null, null, null, null, null, null],
    ultimate: { title: 'Gardien des Pages perdues' } },
];
/* v678 : dates calculées depuis CODEX.from (un mois par saison, du 1er au dernier jour du mois) */
SEASONS.forEach((se, i) => {
  const [y0, m0] = CODEX.from.split('-').map(Number), m = m0 - 1 + i, y = y0 + Math.floor(m / 12), mo = (m % 12) + 1;
  const last = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  const ym = `${y}-${String(mo).padStart(2, '0')}`;
  se.starts = `${ym}-01`; se.ends = `${ym}-${last}`;
});
for (const se of SEASONS) { /* v552 : tout objet d'une voie enluminée est exclusif au Codex */
  for (const r of [...se.items, se.ultimate]) for (const k of [r?.frame, r?.back, r?.finish, r?.sachet, r?.plate, r?.emote]) /* v630 : plaques et réactions aussi */ if (k && !CODEX_ONLY.includes(k)) CODEX_ONLY.push(k);
  se.title = `Saison ${se.num} · ${se.name}`; se.prem = premOf(se); se.tiers = Array.from({ length: CODEX.tiers }, (_, i) => ({ tier: i + 1, free: FREE(i + 1), prem: se.prem[i + 1] || null })); }
// la saison d'un jour (date du joueur) : celle qui le contient, sinon la prochaine, sinon la dernière
export function seasonFor(day) { return SEASONS.find((se) => day <= se.ends) || SEASONS[SEASONS.length - 1]; }
export const seasonByKey = (k) => SEASONS.find((se) => se.key === k) || null;
export const tiersOf = (k) => (seasonByKey(k) || SEASONS[0]).tiers;
export const CODEX_TIERS = SEASONS[0].tiers; // (tests, outils) : la première saison
export const CODEX_OPEN = SEASONS[0].starts; // v680 : le Codex et l'Échoppe s'ouvrent à tous ce jour-là

// ——— v680 : défis de la saison (demande du propriétaire : « on fait les 3 améliorations ») ———
// Trois défis par semaine de saison (semaine 1 = jours 1 à 7 du mois…), les mêmes pour tous. Ils se remplissent avec ce qui
// donne déjà des points de Codex (`codexXp(n, why)`) ; un défi rempli donne CODEX.questXp points tout de suite.
export const QUEST_KINDS = {
  descent: { why: ['floor', 'boss', 'win'], label: 'Gagne {n} combats dans la Descente', n: [8, 10, 12] },
  trial: { why: ['trial'], label: 'Gagne {n} Épreuves du jour', n: [4, 5, 6] },
  game: { why: ['game'], label: 'Gagne {n} parties du Cercle de l’Abysse', n: [3, 4, 5] },
  mission: { why: ['mission'], label: 'Récupère {n} missions du jour', n: [8, 10, 12] },
};
const dayNum = (d) => Math.round(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5);
export const seasonWeek = (se, day) => Math.max(0, Math.floor((dayNum(day) - dayNum(se.starts)) / 7)); // 0 = première semaine
export function questsFor(seasonKey, week) {
  let h = 2166136261; for (const ch of `${seasonKey}:${week}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const keys = Object.keys(QUEST_KINDS), skip = h % keys.length; /* trois des quatre sortes, une différente chaque semaine */
  return keys.filter((_, i) => i !== skip).map((k, i) => { const q = QUEST_KINDS[k]; return { key: k, n: q.n[(h >>> (4 + i * 3)) % q.n.length], label: q.label }; });
}

// ——— L'Échoppe en euros : les obsidiennes et le Pack du Fondateur (prix affichés seulement) ———
export const SHOP = [
  ...OBS_PACKS.map((p) => ({ id: p.id, kind: 'obs', name: `${p.n + p.bonus} obsidiennes`, price: p.price, store: p.store, give: { obs: p.n + p.bonus }, bonus: p.bonus })),
  { id: 'codex', kind: 'codex', name: 'Codex enluminé', price: CODEX.price, store: CODEX.store, give: { codexPremium: true }, refund: 500 }, /* v680 : acheté deux fois pour une même saison : 500 obsidiennes à la place */ /* v548 : vendu dans l'onglet du Codex, une fois par saison */
  { id: 'fondateur', name: 'Pack du Fondateur', price: '4,99 €', store: 'com.abyssalgame.abyssal.pack.fondateur', once: true, refund: 600,
    /* v638 : pack refait (images Gemini « Premiers Gardiens ») : cadre, dos, sachet et plaque vivants, fond de profil */
    give: { title: 'Fondateur', frame: 'cx-vif-fondateur', back: 'dos-vif-fondateur', sachet: 'sachet-vif-fondateur', plate: 'pl-fondateur', fond: 'fp-fondateur', obs: 600 },
    desc: 'Vendu une seule fois. Le cadre, le dos de cartes, le sachet de booster et la plaque vivants du Fondateur, son fond de profil, le titre « Fondateur » (badge au classement) et 600 obsidiennes.' },
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
