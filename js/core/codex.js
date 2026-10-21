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
  'cx-encre': 'Cadre d’encre', 'cx-sang': 'Cadre de sang séché', 'cx-or': 'Cadre enluminé', 'cx-abime': 'Cadre de l’Abîme',
  'cx-fondateur': 'Cadre du Fondateur', 'cx-givre': 'Cadre de givre', 'cx-braise': 'Cadre des braises éternelles',
  /* v472 : réserve (saison II ou Échoppe), images prêtes dans assets/frames/ */
  'cx-os': 'Couronne d’ossements', 'cx-serpents': 'Cadre des serpents d’obsidienne', 'cx-vitrail': 'Cadre du vitrail céleste', 'cx-rouages': 'Cadre des rouages',
  'cx-racines': 'Cadre des racines anciennes', 'cx-yeux': 'Cadre aux mille yeux', 'cx-chaines': 'Cadre des chaînes forgées', 'cx-ruche': 'Cadre de la ruche d’ambre',
  /* v479 : catalogue de l'Échoppe (store/boutique-cosmetiques.md) : Nuit des Âmes, Hiver éternel, Cœurs maudits, les sept trônes, trophées des gardiens */
  'cx-lanternes': 'Cadre des lanternes d’âmes', 'cx-voile': 'Cadre du voile des trépassés', 'cx-houx': 'Couronne du solstice noir', 'cx-aurore': 'Cadre de l’aurore boréale',
  'cx-roses': 'Cadre des roses noires', 'cx-prince': 'Couronne du Prince des Enfers', 'cx-leviathan': 'Cadre du Léviathan', 'cx-seraphin': 'Cadre du Séraphin',
  'cx-meute': 'Cadre de la meute', 'cx-liche': 'Cadre de la Liche', 'cx-ouroboros': 'Cadre de l’Ouroboros', 'cx-automate': 'Cadre de l’Automate',
  'cx-gueule': 'Cadre de la Gueule du Dévoreur', 'cx-eclipse': 'Cadre de l’Éclipse', 'cx-horloger': 'Cadre de l’Horloger', 'cx-balance': 'Cadre du Juge des Sceaux',
  /* v480 */ 'cx-constellation': 'Cadre des constellations', 'cx-geode': 'Cadre de la géode d’améthyste', 'cx-sablier': 'Cadre du sablier éternel', 'cx-pages': 'Cadre du grimoire déchiré', 'cx-corbeau': 'Cadre des corbeaux', 'cx-souverain': 'Couronne du Souverain de l’Abysse',
  /* v550 : Saison I « La Nuit des Âmes » et Saison II « La Veillée de Noël » (images Gemini attendues) */
  'cx-citrouilles': 'Cadre des citrouilles sculptées', 'cx-ames': 'Couronne du Passeur des Âmes',
  'cx-guirlandes': 'Cadre des guirlandes d’or', 'cx-noel': 'Couronne de la Veillée',
  /* v547 : Saison III « L'Hiver éternel », exclusifs de la voie enluminée (images Gemini attendues) */
  'cx-glace-noire': 'Cadre de glace noire', 'cx-loups-neige': 'Cadre de la meute des neiges', 'cx-hiver': 'Couronne de la Reine de l’Hiver',
  /* v552 : Saisons IV à XII (février à octobre 2027, images Gemini attendues) */
  'cx-coeurs': 'Cadre des cœurs liés', 'cx-epines': 'Cadre des épines', 'cx-coeur-maudit': 'Couronne du Cœur maudit', 'cx-mandragore': 'Couronne de mandragore', 'cx-arbre-monde': 'Couronne de l’Arbre-Monde', 'cx-masques': 'Cadre des masques de velours', 'cx-arlequin': 'Couronne de l’Arlequin noir', 'cx-lune-pale': 'Cadre de la lune pâle', 'cx-jardin-lune': 'Cadre des fleurs de lune', 'cx-lune-reine': 'Couronne de la Reine de la Lune', 'cx-flammes': 'Cadre des flammes dansantes', 'cx-solstice-feu': 'Couronne du Solstice de feu', 'cx-marees': 'Cadre des marées noires', 'cx-corail': 'Cadre de corail noir', 'cx-profondeurs': 'Couronne des Profondeurs', 'cx-forge-titans': 'Cadre de la forge des Titans', 'cx-enclume': 'Cadre de l’enclume', 'cx-titan': 'Couronne du Titan forgeron', 'cx-plumes': 'Cadre des plumes noires', 'cx-epis': 'Cadre des épis d’or', 'cx-faucheur': 'Couronne du Faucheur', 'cx-anniversaire': 'Couronne de la Première Année',
  /* v532 */ 'cx-carnaval': 'Cadre du carnaval des ombres', 'cx-phalenes': 'Cadre des phalènes', 'cx-cristaux-sang': 'Cadre des cristaux de sang',
};
// Dos de cartes (v473 : images Gemini, assets/backs/<clé>.webp, tools/back-art.py ; choisis au Profil)
export const CODEX_BACKS = { 'dos-codex': 'Dos du Codex', 'dos-abime': 'Dos de l’Abîme', 'dos-fondateur': 'Dos du Fondateur',
  /* réserve : collection « Les sept royaumes » (Échoppe ou saison II) */
  'dos-infernal': 'Dos du royaume Infernal', 'dos-abyssal': 'Dos du royaume Abyssal', 'dos-celeste': 'Dos du royaume Céleste', 'dos-sauvage': 'Dos du royaume Sauvage',
  'dos-necrotique': 'Dos du royaume Nécrotique', 'dos-primordial': 'Dos du royaume Primordial', 'dos-artificiel': 'Dos du royaume Artificiel',
  /* v480 : catalogue de l'Échoppe */ 'dos-ames': 'Dos de la Nuit des Âmes', 'dos-solstice': 'Dos du solstice noir', 'dos-roses': 'Dos des cœurs maudits', 'dos-lune-sang': 'Dos de la Lune de sang', 'dos-devoreur': 'Dos du Dévoreur', 'dos-eclipse': 'Dos de l’Éclipse', 'dos-horloger': 'Dos de l’Horloger', 'dos-miroirs': 'Dos de la Sorcière des Miroirs', 'dos-jumeaux': 'Dos des Jumeaux du Crépuscule', 'dos-titan': 'Dos du Titan Endormi',
  /* v481 */ 'dos-abysse': 'Dos de L’Abysse', 'dos-tarot': 'Dos du tarot interdit', 'dos-mosaique': 'Dos de la mosaïque d’or', 'dos-encre': 'Dos de l’encre et du dragon', 'dos-alchimie': 'Dos de l’alchimiste', 'dos-carte-abysse': 'Dos de la carte de l’Abysse', 'dos-reliquaire': 'Dos du reliquaire', 'dos-tapisserie': 'Dos de la chasse maudite', 'dos-art-deco': 'Dos d’or noir', 'dos-vivant': 'Dos de chair vivante', 'dos-nebuleuse': 'Dos de la nébuleuse', 'dos-vitrail': 'Dos du vitrail de cathédrale',
  /* v550 */ 'dos-cimetiere': 'Dos du cimetière des âmes', 'dos-presents': 'Dos des présents',
  /* v547 */ 'dos-blizzard': 'Dos du blizzard', 'dos-hiver': 'Dos de l’Hiver éternel',
  /* v552 */ 'dos-coeurs': 'Dos du cœur enchaîné', 'dos-mandragore': 'Dos de la mandragore', 'dos-racines': 'Dos des racines éveillées', 'dos-bal': 'Dos du bal masqué', 'dos-lune-pale': 'Dos de la lune pâle', 'dos-jardin': 'Dos du jardin nocturne', 'dos-phenix': 'Dos du phénix', 'dos-brasier': 'Dos du grand brasier', 'dos-marees': 'Dos des marées noires', 'dos-leviathan': 'Dos du Léviathan', 'dos-forge-titans': 'Dos de la forge des Titans', 'dos-marteau': 'Dos du marteau runique', 'dos-moissons': 'Dos des moissons d’ombre', 'dos-epouvantail': 'Dos de l’épouvantail', 'dos-anniversaire': 'Dos de l’anniversaire',
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
  'fin-hiver': { name: 'Hiver éternel', desc: 'Couronne de glace, neige qui tombe sans fin. Récompense ultime de la Saison I.' },
};
// Catalogue de l'Échoppe, en obsidiennes (le Codex enluminé donne aussi givre, braises et dos de l'Abîme)
const F = (k, cost) => ({ id: k, kind: 'frame', give: { frame: k }, cost });
const B = (k, cost) => ({ id: k, kind: 'back', give: { back: k }, cost });
const FN = (k, cost) => ({ id: k, kind: 'finish', give: { finish: k }, cost });
export const ROYAUMES = ['dos-infernal', 'dos-abyssal', 'dos-celeste', 'dos-sauvage', 'dos-necrotique', 'dos-primordial', 'dos-artificiel'];
/* v535 : cadres de la meute, des corbeaux, des chaînes et des roses noires retirés de la vente (leur ornement cachait le visage de la créature) */
/* v562 : tri du propriétaire (Atelier des cosmétiques, 21 octobre 2026) : 25 objets retirés (RETIRED_COSM). Ils restent
   connus (CODEX_FRAMES, FINISHES, CSS) pour les parties qui les auraient, mais ne se gagnent ni ne s'achètent plus. */
export const RETIRED_COSM = ['cx-fondateur', 'cx-os', 'cx-ruche', 'cx-lanternes', 'cx-voile', 'cx-eclipse', 'cx-balance', 'cx-geode', 'cx-pages', 'cx-corbeau', 'cx-carnaval', 'cx-phalenes',
  'fin-vitrail', 'fin-constellee', 'fin-ossuaire', 'fin-nacree', 'fin-runique', 'fin-scellee', 'fin-draconique', 'fin-feux-follets', 'fin-houx', 'fin-noel', 'fin-roses', 'fin-coeurs', 'fin-hiver'];
export const CATALOG = [ F('cx-serpents', 120), F('cx-vitrail', 120), F('cx-rouages', 120), F('cx-yeux', 140), 
  F('cx-prince', 250), F('cx-leviathan', 250), F('cx-seraphin', 250), F('cx-liche', 250), F('cx-ouroboros', 250), F('cx-automate', 250), F('cx-gueule', 200), F('cx-horloger', 200), 
  F('cx-constellation', 280), F('cx-sablier', 180), F('cx-souverain', 450),
  B('dos-abime', 140), B('dos-lune-sang', 200), B('dos-devoreur', 200), B('dos-eclipse', 200), B('dos-horloger', 200), B('dos-miroirs', 200), B('dos-jumeaux', 200), B('dos-titan', 200),
  B('dos-abysse', 280), B('dos-tarot', 200), B('dos-mosaique', 200), B('dos-encre', 200), B('dos-alchimie', 200), B('dos-carte-abysse', 200), B('dos-reliquaire', 280), B('dos-tapisserie', 200), B('dos-art-deco', 280), B('dos-vivant', 280), B('dos-nebuleuse', 280), B('dos-vitrail', 200), ...ROYAUMES.map((k) => B(k, 120)),
  FN('fin-estampe', 300), FN('fin-imperiale', 450), FN('fin-neant', 450), F('cx-cristaux-sang', 280), B('dos-phalene', 200), B('dos-coeur-mecanique', 280),
  { id: 'royaumes', kind: 'bundle', name: 'Les sept royaumes', give: { backs: ROYAUMES }, cost: 600, desc: 'Les sept dos des royaumes d’un coup (840 à l’unité).' },
];
// Exclusifs du Codex enluminé (jamais en vente). v547 : tous les cosmétiques de la voie enluminée (Saison I : l'hiver),
// plus les anciens objets du Codex gardés pour une saison future (encre, sang, enluminé, Abîme, dos du Codex).
export const CODEX_ONLY = ['cx-encre', 'cx-sang', 'cx-or', 'cx-abime', 'dos-codex',
  /* v550 */ 'cx-lanternes', 'cx-voile', 'cx-citrouilles', 'cx-ames', 'dos-ames', 'dos-cimetiere', 'fin-spectrale', 'fin-feux-follets', 'fin-ames',
  'cx-guirlandes', 'cx-noel', 'dos-presents', 'fin-houx', 'fin-noel',
  'cx-givre', 'cx-houx', 'cx-aurore', 'cx-glace-noire', 'cx-loups-neige', 'cx-hiver', 'dos-solstice', 'dos-blizzard', 'dos-hiver', 'fin-givree', 'fin-aurore', 'fin-hiver'];

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
  ITEM_AT.forEach((t, n) => { if (items[n]) out[t] = items[n]; });
  out[CODEX.tiers] = ultimate;
  return out;
}
export const SEASONS = [
  { key: 's1-ames', num: 'I', name: 'La Nuit des Âmes', starts: '2026-11-01', ends: '2026-11-30', art: 'assets/ui/cx-saison-ames.webp',
    best: ['cx-ames', 'dos-cimetiere', 'dos-ames'], pitch: 'Une récompense à chaque palier : cadres, dos de cartes, finitions et titres de la Nuit des Âmes, introuvables à l’Échoppe. Au palier 30, la Couronne du Passeur des Âmes et la finition Nuit des Âmes.',
    titles: ['Veilleur des tombes', 'Porteur de lanterne', 'Ami des feux follets', 'Voix des trépassés', 'Gardien des âmes perdues', 'Celui qui ne dort pas'],
    items: [null, { back: 'dos-ames' }, { finish: 'fin-spectrale' }, { frame: 'cx-citrouilles' }, null, { back: 'dos-cimetiere' }],
    ultimate: { frame: 'cx-ames', finish: 'fin-ames', title: 'Passeur des Âmes' } },
  { key: 's2-noel', num: 'II', name: 'La Veillée de Noël', starts: '2026-12-01', ends: '2026-12-31', art: 'assets/ui/cx-saison-noel.webp',
    best: ['cx-noel', 'dos-presents', 'cx-houx'], pitch: 'Une récompense à chaque palier : cadres, dos de cartes, finitions et titres de la Veillée de Noël, introuvables à l’Échoppe. Au palier 30, la Couronne de la Veillée et le titre Gardien de la Veillée.',
    titles: ['Porteur de chandelles', 'Chanteur de minuit', 'Gardien du houx', 'Hôte de la Veillée', 'Messager des présents', 'Cœur de braise'],
    items: [{ frame: 'cx-houx' }, { back: 'dos-solstice' }, null, { frame: 'cx-guirlandes' }, null, { back: 'dos-presents' }],
    ultimate: { frame: 'cx-noel', title: 'Gardien de la Veillée' } },
  { key: 's3-hiver', num: 'III', name: 'L’Hiver éternel', starts: '2027-01-01', ends: '2027-01-31', art: 'assets/ui/cx-saison1.webp',
    best: ['cx-hiver', 'dos-hiver', 'cx-aurore'], pitch: 'Une récompense à chaque palier : cadres, dos de cartes, finitions et titres de l’Hiver éternel, introuvables à l’Échoppe. Au palier 30, la Couronne de la Reine de l’Hiver et le titre Souverain de l’Hiver éternel.',
    titles: ['Veilleur du long hiver', 'Marcheur des neiges', 'Chasseur d’aurores', 'Cœur de givre', 'Voix du blizzard', 'Gardien du solstice'],
    items: [{ frame: 'cx-givre' }, { back: 'dos-blizzard' }, { finish: 'fin-givree' }, { frame: 'cx-aurore' }, { frame: 'cx-glace-noire' }, null, { frame: 'cx-loups-neige' }, { finish: 'fin-aurore' }, { back: 'dos-hiver' }],
    ultimate: { frame: 'cx-hiver', title: 'Souverain de l’Hiver éternel' } },
  /* v552 : une saison par mois toute l'année (calendrier validé par le propriétaire le 21 octobre 2026) */
  { key: 's4-coeurs', num: 'IV', name: 'Les Cœurs maudits', starts: '2027-02-01', ends: '2027-02-28', art: 'assets/ui/cx-saison-coeurs.webp',
    best: ['cx-coeur-maudit', 'dos-coeurs', 'cx-coeurs'], pitch: 'Une récompense à chaque palier : cadres, dos de cartes, finitions et titres des Cœurs maudits, introuvables à l’Échoppe. Au palier 30, la Couronne du Cœur maudit et le titre Souverain des Cœurs maudits.',
    titles: ['Amant des ombres', 'Porteur de roses noires', 'Cœur épineux', 'Âme liée', 'Briseur de serments', 'Soupir de l’Abysse'],
    items: [{ frame: 'cx-coeurs' }, { back: 'dos-roses' }, { finish: 'fin-ecarlate' }, { frame: 'cx-epines' }, null, { back: 'dos-coeurs' }, null, { frame: 'cx-roses' }],
    ultimate: { frame: 'cx-coeur-maudit', title: 'Souverain des Cœurs maudits' } },
  { key: 's5-racines', num: 'V', name: 'Le Réveil des Racines', starts: '2027-03-01', ends: '2027-03-31', art: 'assets/ui/cx-saison-racines.webp',
    best: ['cx-arbre-monde', 'dos-racines', 'cx-mandragore'], pitch: 'Une récompense à chaque palier : cadres, dos de cartes, finitions et titres du Réveil des Racines, introuvables à l’Échoppe. Au palier 30, la Couronne de l’Arbre-Monde et la finition Réveil des Racines.',
    titles: ['Graine de l’Abysse', 'Éveilleur de sève', 'Ami des mandragores', 'Voix de la forêt', 'Cœur de chêne', 'Racine profonde'],
    items: [{ frame: 'cx-racines' }, { back: 'dos-mandragore' }, { finish: 'fin-seve' }, { frame: 'cx-mandragore' }, null, { back: 'dos-racines' }],
    ultimate: { frame: 'cx-arbre-monde', finish: 'fin-racines', title: 'Gardien des Racines' } },
  { key: 's6-carnaval', num: 'VI', name: 'Le Carnaval des Ombres', starts: '2027-04-01', ends: '2027-04-30', art: 'assets/ui/cx-saison-carnaval.webp',
    best: ['cx-arlequin', 'dos-bal', 'cx-masques'], pitch: 'Une récompense à chaque palier : cadres, dos de cartes, finitions et titres du Carnaval des Ombres, introuvables à l’Échoppe. Au palier 30, la Couronne de l’Arlequin noir et la finition Carnaval des Ombres.',
    titles: ['Danseur masqué', 'Visage de velours', 'Rire dans l’ombre', 'Maître des confettis', 'Invité du bal', 'Celui qui change de visage'],
    items: [null, { back: 'dos-carnaval' }, { finish: 'fin-masques' }, { frame: 'cx-masques' }, null, { back: 'dos-bal' }],
    ultimate: { frame: 'cx-arlequin', finish: 'fin-carnaval', title: 'Maître du Carnaval' } },
  { key: 's7-lune', num: 'VII', name: 'Les Jardins de la Lune pâle', starts: '2027-05-01', ends: '2027-05-31', art: 'assets/ui/cx-saison-lune.webp',
    best: ['cx-lune-reine', 'dos-jardin', 'cx-lune-pale'], pitch: 'Une récompense à chaque palier : cadres, dos de cartes, finitions et titres des Jardins de la Lune pâle, introuvables à l’Échoppe. Au palier 30, la Couronne de la Reine de la Lune et la finition Jardins de la Lune.',
    titles: ['Cueilleur de rosée', 'Ami des phalènes', 'Promeneur nocturne', 'Fleur de minuit', 'Enfant de la lune', 'Gardien des jardins'],
    items: [{ frame: 'cx-lune-pale' }, { back: 'dos-lune-pale' }, { finish: 'fin-lune' }, { frame: 'cx-jardin-lune' }, null, { back: 'dos-jardin' }],
    ultimate: { frame: 'cx-lune-reine', finish: 'fin-jardins', title: 'Jardinier de la Lune pâle' } },
  { key: 's8-solstice', num: 'VIII', name: 'Le Solstice de feu', starts: '2027-06-01', ends: '2027-06-30', art: 'assets/ui/cx-saison-solstice.webp',
    best: ['cx-solstice-feu', 'dos-phenix', 'cx-flammes'], pitch: 'Une récompense à chaque palier : cadres, dos de cartes, finitions et titres du Solstice de feu, introuvables à l’Échoppe. Au palier 30, la Couronne du Solstice de feu et la finition Solstice de feu.',
    titles: ['Porteur de torche', 'Danseur des braises', 'Enfant du brasier', 'Cœur ardent', 'Flamme qui ne s’éteint pas', 'Ami du phénix'],
    items: [{ frame: 'cx-braise' }, { back: 'dos-phenix' }, { finish: 'fin-incandescente' }, { frame: 'cx-flammes' }, null, { back: 'dos-brasier' }],
    ultimate: { frame: 'cx-solstice-feu', finish: 'fin-solstice', title: 'Enfant du Solstice' } },
  { key: 's9-marees', num: 'IX', name: 'Les Marées noires', starts: '2027-07-01', ends: '2027-07-31', art: 'assets/ui/cx-saison-marees.webp',
    best: ['cx-profondeurs', 'dos-leviathan', 'cx-marees'], pitch: 'Une récompense à chaque palier : cadres, dos de cartes, finitions et titres des Marées noires, introuvables à l’Échoppe. Au palier 30, la Couronne des Profondeurs et la finition Profondeurs.',
    titles: ['Écume noire', 'Chanteur des profondeurs', 'Pêcheur de perles', 'Marcheur des abysses', 'Voix de la marée', 'Cœur de corail'],
    items: [{ frame: 'cx-marees' }, { back: 'dos-marees' }, { finish: 'fin-marees' }, { frame: 'cx-corail' }, null, { back: 'dos-leviathan' }],
    ultimate: { frame: 'cx-profondeurs', finish: 'fin-profondeurs', title: 'Seigneur des Marées' } },
  { key: 's10-forge', num: 'X', name: 'La Forge des Titans', starts: '2027-08-01', ends: '2027-08-31', art: 'assets/ui/cx-saison-forge.webp',
    best: ['cx-titan', 'dos-forge-titans', 'cx-enclume'], pitch: 'Une récompense à chaque palier : cadres, dos de cartes, finitions et titres de la Forge des Titans, introuvables à l’Échoppe. Au palier 30, la Couronne du Titan forgeron et la finition Acier des Titans.',
    titles: ['Apprenti forgeron', 'Frappeur d’enclume', 'Main de fer', 'Souffle de la forge', 'Cœur d’acier', 'Marteau des Titans'],
    items: [{ frame: 'cx-forge-titans' }, { back: 'dos-forge-titans' }, { finish: 'fin-forge' }, { frame: 'cx-enclume' }, null, { back: 'dos-marteau' }],
    ultimate: { frame: 'cx-titan', finish: 'fin-titans', title: 'Forgeron des Titans' } },
  { key: 's11-moissons', num: 'XI', name: 'Les Moissons d’ombre', starts: '2027-09-01', ends: '2027-09-30', art: 'assets/ui/cx-saison-moissons.webp',
    best: ['cx-faucheur', 'dos-moissons', 'cx-plumes'], pitch: 'Une récompense à chaque palier : cadres, dos de cartes, finitions et titres des Moissons d’ombre, introuvables à l’Échoppe. Au palier 30, la Couronne du Faucheur et la finition Moissons d’ombre.',
    titles: ['Glaneur d’ombres', 'Ami des corbeaux', 'Gardien des champs', 'Lame de la récolte', 'Veilleur des granges', 'Épouvantail vivant'],
    items: [{ frame: 'cx-plumes' }, { back: 'dos-moissons' }, { finish: 'fin-ble-noir' }, { frame: 'cx-epis' }, null, { back: 'dos-epouvantail' }],
    ultimate: { frame: 'cx-faucheur', finish: 'fin-moissons', title: 'Faucheur des Ombres' } },
  { key: 's12-anniv', num: 'XII', name: 'L’Anniversaire de l’Abysse', starts: '2027-10-01', ends: '2027-10-31', art: 'assets/ui/cx-saison-anniv.webp',
    best: ['cx-anniversaire', 'dos-anniversaire', 'cx-abime'], pitch: 'Une récompense à chaque palier : cadres, dos de cartes, finitions et titres de l’Anniversaire de l’Abysse, introuvables à l’Échoppe. Au palier 30, la Couronne de la Première Année et la finition Anniversaire de l’Abysse.',
    titles: ['Lecteur du Bestiaire', 'Témoin de l’Abysse', 'Fidèle de la première heure', 'Gardien des pages', 'Plume de l’Abysse', 'Mémoire du Bestiaire'],
    items: [{ frame: 'cx-encre' }, { back: 'dos-codex' }, { finish: 'fin-premiere-page' }, { frame: 'cx-sang' }, { frame: 'cx-or' }, { back: 'dos-anniversaire' }, null, { frame: 'cx-abime' }],
    ultimate: { frame: 'cx-anniversaire', finish: 'fin-anniversaire', title: 'Témoin de la première année' } },
];
for (const se of SEASONS) { /* v552 : tout objet d'une voie enluminée est exclusif au Codex */
  for (const r of [...se.items, se.ultimate]) for (const k of [r?.frame, r?.back, r?.finish]) if (k && !CODEX_ONLY.includes(k)) CODEX_ONLY.push(k);
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
    give: { title: 'Fondateur', back: 'dos-fondateur', obs: 600 }, /* v562 : cadre du Fondateur retiré (tri du propriétaire) */
    desc: 'Vendu une seule fois. Le dos de cartes du Fondateur, le titre « Fondateur » (badge au classement) et 600 obsidiennes.' },
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
