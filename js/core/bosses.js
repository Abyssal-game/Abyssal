// ABYSSAL : gardiens à mécaniques uniques (données). Le moteur (duel.js) lit ces fiches :
// chaque gardien suit un « motif » d'intentions selon sa phase et le tour, et ses actions spéciales
// sont des intentions comme les autres (annoncées un tour à l'avance, interrompues par le gel ou la
// Brisure). Ajouter un gardien = ajouter une fiche ici, sans toucher au moteur.

// Lois de l'Architecte : une règle du combat change, annoncée un tour avant.
export const LAWS = {
  silence: { name: 'Loi du silence', desc: 'Tes compétences coûtent 1 PA de plus.' },
  fer:     { name: 'Loi du fer', desc: 'L’Architecte subit 40 % de dégâts en moins, sauf s’il est brisé.' },
  echo:    { name: 'Loi de l’écho', desc: 'Chaque coup porté à l’Architecte renvoie 2 dégâts à l’attaquant.' },
  hate:    { name: 'Loi de l’urgence', desc: 'Tes créatures gagnent 1 PA de plus à chaque tour, mais les ennemis frappent 30 % plus fort.' },
};

// Aspects de l'Éclipse : ses faiblesses et résistances changent (×1,6 / ×0,5).
export const ASPECTS = {
  soleil: { name: 'Aspect du soleil', weak: ['necrotique', 'abyssal'], resist: ['celeste', 'infernal'] },
  lune:   { name: 'Aspect de la lune', weak: ['celeste', 'infernal'], resist: ['necrotique', 'abyssal'] },
};

export const BOSSES = {
  devoreur: {
    name: 'Le Dévoreur', title: 'La faim qui ne dort jamais',
    intro: 'Une gueule s’ouvre dans la roche. Elle a avalé des armées entières, et elle a encore faim.',
    mechanic: 'Il annonce « Dévorer » : il arrache des PV à ta créature la plus vigoureuse et s’en nourrit. Chaque festin réussi le rend plus fort.',
    counter: 'Gèle-le ou brise-le pendant qu’il prépare son festin. Un Protecteur réduit la morsure.',
    story: 'Avant les Sceaux, le Dévoreur était un gouffre sans fond où l’on jetait les condamnés. À force de recevoir, il a appris à réclamer. Les premiers Scelleurs ne l’ont pas vaincu : ils l’ont seulement rassasié assez longtemps pour fermer la porte.',
    pattern: (phase, round) => (round % (phase === 2 ? 2 : 3) === (phase === 2 ? 0 : 2) ? 'gorge' : 'hit'),
  },
  matriarche: {
    name: 'La Matriarche du Givre', title: 'Mère des hivers éternels',
    intro: 'Le souffle se fige dans ta gorge. Sur un trône de glace, une silhouette lève lentement la main.',
    mechanic: 'Elle rassemble le froid pendant un tour, puis déchaîne une Tempête de givre sur toute ton équipe et gèle ta créature la plus forte (deux en Furie).',
    counter: 'Interromps l’incantation (gel ou Brisure), mets ta créature menacée en défense. Tes Soigneurs dégèlent ton équipe.',
    story: 'Elle a gelé son propre royaume pour qu’il ne change plus jamais. Quand l’Abysse a voulu l’emporter, elle s’est offerte à lui en échange d’un hiver sans fin. On dit qu’elle pleure encore, mais que ses larmes gèlent avant de tomber.',
    pattern: (phase, round) => (round % 3 === 1 ? 'gather' : 'hit'),
  },
  roi: {
    name: 'Le Roi sans Visage', title: 'Celui qui porte tous les masques',
    intro: 'Un roi sans traits te salue d’une révérence parfaite. Son visage lisse se met à ressembler au tien.',
    mechanic: 'Il annonce quelle compétence de ton équipe il va copier, puis la retourne contre toi au tour suivant.',
    counter: 'Lis ce qu’il copie : défends la cible, ou gèle-le avant qu’il ne s’en serve.',
    story: 'Il n’a jamais eu de visage à lui. Il a régné en portant celui de ses sujets, un par un, jusqu’à ce qu’il n’en reste plus aucun. L’Abysse l’a accueilli parce qu’il savait déjà vivre sans se souvenir de qui il était.',
    pattern: (phase, round) => (round % (phase === 2 ? 2 : 3) === 1 ? 'mimic' : 'hit'),
  },
  architecte: {
    name: 'L’Architecte', title: 'Celui qui redessine les règles',
    intro: 'Des lignes de lumière se tracent sur le sol. Quelque chose mesure la salle, et toi avec.',
    mechanic: 'Tous les deux tours, il impose une nouvelle Loi qui change les règles du combat. Chaque Loi est annoncée un tour avant.',
    counter: 'Adapte-toi à chaque Loi : brise-le sous la Loi du fer, ménage tes compétences sous la Loi du silence.',
    story: 'Il croit avoir bâti les Sceaux. Personne ne lui a dit qu’il serait enfermé derrière. Depuis, il retouche les plans de sa prison, une règle à la fois, en attendant que l’une d’elles finisse par céder.',
    pattern: (phase, round) => (round % 2 === 1 ? 'decree' : phase === 2 && round % 4 === 0 ? 'charge' : 'hit'),
  },
  eclipse: {
    name: 'L’Éclipse', title: 'Le soleil qui dévore la lune',
    intro: 'La lumière vacille. Au centre de l’arène, un disque noir se lève, cerclé de feu.',
    mechanic: 'Ses faiblesses changent selon son aspect (soleil ou lune). Le changement est annoncé un tour avant.',
    counter: 'Garde des créatures de factions différentes et frappe avec celles qui exploitent l’aspect du moment.',
    story: 'Quand le jour et la nuit se sont disputé le ciel, l’Éclipse est née de leur collision. Elle n’appartient à aucun des deux, et les trahit tour à tour.',
    pattern: (phase, round) => (round % (phase === 2 ? 2 : 3) === (phase === 2 ? 0 : 2) ? 'shift' : phase === 2 && round % 3 === 0 ? 'channel' : 'hit'),
  },
  // v383 : cinq nouveaux gardiens pour les étages 30 à 50 (toujours déchaînés à ces profondeurs : leur phase 2 joue dès le début)
  essaim: {
    name: 'La Reine des Essaims', title: 'Mère de mille dards',
    intro: 'Le sol vibre d’un bourdonnement sourd. Des alvéoles s’ouvrent dans les murs, et quelque chose d’immense s’y redresse.',
    mechanic: 'Elle annonce « La ruche s’éveille », puis lâche son Essaim au tour suivant : toute ton équipe est frappée et empoisonnée. Plus tes créatures sont empoisonnées, plus elle se régénère.',
    counter: 'Brise-la ou gèle-la pendant que la ruche s’éveille, esquive l’Essaim, et purifie le poison (Prière).',
    story: 'Elle n’a jamais été seule : chacune de ses filles porte un morceau de sa mémoire. Quand les Scelleurs ont muré sa ruche, elle a simplement appris à pondre dans la pierre.',
    pattern: (phase, round) => (round % (phase === 2 ? 2 : 3) === 1 ? 'brood' : 'hit'),
  },
  bourreau: {
    name: 'Le Bourreau', title: 'La sentence ne se discute pas',
    intro: 'Une cloche sonne une seule fois. Au fond de la salle, une hache plus grande qu’un homme racle lentement le sol.',
    mechanic: 'Il prononce une Sentence contre ta créature la plus affaiblie, puis l’exécute au tour suivant : un coup terrible, encore plus fort si elle a perdu la moitié de ses PV. Chaque exécution mortelle le rend plus fort.',
    counter: 'Permute la condamnée en réserve (la hache frappe dans le vide), défends-la, ou brise-le avant l’exécution.',
    story: 'Il a exécuté tant de condamnés au nom des Sceaux qu’il ne se souvient plus d’un seul visage. L’Abysse lui a seulement demandé de continuer, et il n’a jamais su dire non.',
    pattern: (phase, round) => (round % (phase === 2 ? 2 : 3) === 1 ? 'sentence' : 'hit'),
  },
  choeur: {
    name: 'Le Chœur des Noyés', title: 'Ils chantent pour ne pas oublier',
    intro: 'De l’eau noire monte entre les dalles. Des voix, des centaines, entonnent un chant que tu connais sans l’avoir jamais entendu.',
    mechanic: 'Il entonne un Chant, puis lance sa Complainte au tour suivant : toute ton équipe est frappée, perd ses boucliers et ses bonus d’attaque, et tu perds 2 Ferveur. En Furie, la marée monte et ronge tes créatures à chaque tour.',
    counter: 'Brise-le pendant le Chant, esquive la Complainte et dépense ta Ferveur avant qu’elle ne tombe. Une Brisure retient la marée un tour.',
    story: 'Ce sont les marins d’une flotte entière, engloutie en une nuit. Ils ont chanté jusqu’au fond, et l’Abysse a trouvé leur chant trop beau pour le laisser s’éteindre.',
    pattern: (phase, round) => (round % (phase === 2 ? 2 : 3) === (phase === 2 ? 0 : 2) ? 'chant' : 'hit'),
  },
  chaines: {
    name: 'Le Seigneur des Chaînes', title: 'Nul ne quitte sa forge',
    intro: 'Des chaînes chauffées à blanc pendent du plafond. Une enclume résonne, et chaque coup fait trembler tes os.',
    mechanic: 'Il lance ses Chaînes sur ta créature la plus forte : elle est frappée et enchaînée (elle ne pourra pas agir à ton prochain tour). En Furie, sa forge s’embrase : il gagne +1 ATQ à chaque tour où il n’est pas brisé.',
    counter: 'Esquive les Chaînes, libère l’enchaînée avec une Prière, et brise-le souvent pour éteindre sa forge.',
    story: 'Il croit avoir forgé les chaînes des Sceaux, celles qui tiennent l’Abysse fermé. Puis il a compris qu’on ne lui ouvrirait jamais, et il s’est mis à forger pour l’autre camp.',
    pattern: (phase, round) => (round % (phase === 2 ? 2 : 3) === (phase === 2 ? 0 : 2) ? 'chain' : 'hit'),
  },
  horloge: {
    name: 'L’Horloger', title: 'Le temps lui doit tout',
    intro: 'Un tic-tac emplit la salle, trop lent, puis trop rapide. Au centre, des rouages dorés tournent autour d’une silhouette sans âge.',
    mechanic: 'Il annonce « Remonter le temps » : au tour suivant, il retrouve les PV qu’il avait à l’annonce (un quart de ses PV au plus). En Furie, le temps s’emballe et il frappe deux fois de suite.',
    counter: 'Brise-le ou gèle-le pendant qu’il remonte le temps, ou garde tes plus gros coups pour juste après.',
    story: 'Il a réglé l’horloge des Sceaux pour qu’elle ne sonne jamais la fin. Celui que tu affrontes n’est qu’un rêve de l’Abysse à son image : le vrai Horloger, l’un des sept qui posèrent la main sur la reliure, personne ne l’a revu depuis.',
    pattern: (phase, round) => (round % 3 === 1 ? 'wind' : phase === 2 ? 'tick2' : 'hit'),
  },
  // v387 : étages 55 à 75
  miroirs: {
    name: 'La Sorcière des Miroirs', title: 'Elle te rend chaque coup',
    intro: 'Des éclats de verre flottent dans l’air. Dans chacun, une femme sourit, et aucun reflet ne sourit de la même façon.',
    mechanic: 'Elle dresse un Miroir : le prochain coup que tu lui portes se retourne contre ton attaquant (60 % des dégâts), puis le miroir se brise.',
    counter: 'Brise le miroir avec un petit coup (une attaque faible, une créature robuste), puis frappe fort. Le poison passe à travers.',
    story: 'Elle a passé sa vie à se regarder vieillir. Un jour, elle a refusé, et son reflet a pris sa place. Personne ne sait laquelle des deux est sortie du miroir.',
    pattern: (phase, round) => (round % (phase === 2 ? 2 : 3) === 1 ? 'mirror' : 'hit'),
  },
  golem: {
    name: 'Le Golem de Cendres', title: 'Plus on le frappe, plus il durcit',
    intro: 'Un tas de cendres se soulève, se tasse, prend forme. Au cœur de la masse, une braise bat comme un cœur.',
    mechanic: 'Chaque coup qu’il reçoit durcit son Armure de cendres (−6 % de dégâts par couche, 8 couches au plus). Une Brisure fait tomber toute la carapace.',
    counter: 'Fêle-le puis brise-le avec un coup de rupture pour remettre sa carapace à zéro, et garde tes gros coups pour juste après.',
    story: 'On l’a bâti avec les cendres des créatures brûlées à la Fournaise. Il se souvient de chacune, et il les venge une couche à la fois.',
    pattern: (phase, round) => (round % (phase === 2 ? 2 : 3) === (phase === 2 ? 0 : 2) ? 'charge' : 'hit'),
  },
  peste: {
    name: 'La Peste Grise', title: 'Elle voyage de souffle en souffle',
    intro: 'Une brume grise rampe sur le sol. Là où elle passe, la pierre se couvre de taches.',
    mechanic: 'Elle empoisonne sans relâche, et à chaque tour le poison saute d’une créature empoisonnée à ses voisines saines (deux fois plus en Furie). Tous les trois tours, elle prépare une vague sur toute ton équipe.',
    counter: 'Purifie vite (Prière) avant que la contagion ne gagne toute l’équipe, et brise-la pendant qu’elle prépare sa vague.',
    story: 'Elle n’a ni corps ni nom. Elle était une maladie, puis une prière murmurée par ceux qu’elle emportait, et l’Abysse a fini par lui donner un visage.',
    pattern: (phase, round) => (round % 3 === 2 ? 'channel' : 'poison'),
  },
  chasseur: {
    name: 'Le Chasseur Sans Ombre', title: 'Tu ne le vois qu’au dernier instant',
    intro: 'Une flèche se plante à tes pieds. Tu cherches le tireur. Il n’y a personne, et pourtant quelque chose respire derrière toi.',
    mechanic: 'Un tour sur deux, il disparaît dans l’ombre (−70 % de dégâts reçus) et prépare une Embuscade sur ta créature la plus affaiblie, au tour suivant.',
    counter: 'Une Marque le révèle (plus de réduction). Pendant qu’il se cache, soigne et protège la créature visée, puis frappe quand il réapparaît.',
    story: 'Il a vendu son ombre pour ne plus jamais manquer sa cible. Depuis, aucune lumière ne le touche, et aucune proie ne lui échappe.',
    pattern: (phase, round) => (round % 2 === 0 ? 'ambush' : 'hit'),
  },
  voeux: {
    name: 'La Dame des Vœux', title: 'Tout se paie, un jour',
    intro: 'Une femme voilée t’attend, un plateau d’argent à la main. « Fais un vœu », dit-elle. « Je te l’accorde. Le prix viendra plus tard. »',
    mechanic: 'Elle exauce un Vœu : tu gagnes 3 Ferveur et tes créatures 1 PA. Au tour suivant, elle réclame son Prix : un coup sur toute ton équipe, qui la soigne de la moitié des dégâts.',
    counter: 'Profite du cadeau tout de suite (compétences, Assaut conjoint ou pouvoir d’équipe), puis esquive ou pare le Prix.',
    story: 'Elle a exaucé tous les vœux des Scelleurs : la gloire, la puissance, l’oubli. Le prix était écrit dans le Bestiaire, et la ligne a été effacée. Elle attend encore qu’on le lui paie.',
    pattern: (phase, round) => (round % 3 === 1 ? 'wish' : 'hit'),
  },
  // v392 : étages 80 à 100
  titan: {
    name: 'Le Titan Endormi', title: 'Ne le réveille pas',
    intro: 'Une montagne respire. Des temples entiers se sont écroulés sur ses épaules sans qu’il ouvre les yeux.',
    mechanic: 'Il dort pendant 3 tours et ne fait rien. Au 4e, il se réveille dans un Séisme qui frappe toute ton équipe, d’autant plus fort que tu l’as blessé pendant son sommeil. Ensuite, il frappe lourdement.',
    counter: 'Profite de son sommeil pour l’affaiblir et charger ta Ferveur, mais garde tes créatures en forme pour le réveil : esquive ou pare le Séisme.',
    story: 'Les premiers Scelleurs ont bâti leurs temples sur son dos, croyant qu’il était une montagne. L’Abysse, lui, savait. Il attendait seulement que quelqu’un le dérange.',
    pattern: (phase, round) => (round <= 3 ? 'slumber' : round === 4 ? 'quake' : round % 3 === 2 ? 'charge' : 'hit'),
  },
  jumeaux: {
    name: 'Les Jumeaux du Crépuscule', title: 'Le jour et la nuit, enchaînés',
    intro: 'Deux silhouettes se font face, liées au poignet par une chaîne de lumière. Elles se tournent vers toi en même temps.',
    mechanic: 'Deux gardiens liés : le Jumeau du Jour et le Jumeau de la Nuit. Quand l’un tombe, l’autre devient fou de chagrin : il se soigne et frappe bien plus fort.',
    counter: 'Affaiblis-les tous les deux avant d’en abattre un, puis achève le second très vite.',
    story: 'Ils sont nés le même soir, l’un au coucher du soleil, l’autre au lever de la lune. L’Abysse les a enchaînés pour que l’un ne puisse jamais survivre à l’autre.',
    pattern: (phase, round) => (round % 3 === 2 ? 'channel' : 'hit'),
  },
  juge: {
    name: 'Le Juge des Sceaux', title: 'La loi, c’est lui',
    intro: 'Un marteau frappe trois coups. « L’accusé se lèvera », dit une voix sans visage. Tu comprends que l’accusé, c’est toi.',
    mechanic: 'Un tour sur deux, il rend un Verdict : à ton tour suivant, une action est interdite à toute ton équipe (attaquer, utiliser une compétence, ou se défendre).',
    counter: 'Lis le Verdict et prépare ton tour : si l’attaque est interdite, garde des PA pour les compétences, et inversement.',
    story: 'Il croit avoir écrit les lois des Sceaux, puis il a jugé ceux qui les auraient écrites avec lui. Personne n’a jamais gagné un procès contre lui. Personne n’a jamais su de quoi il était accusé.',
    pattern: (phase, round) => (round % 2 === 1 ? 'verdict' : round % 4 === 0 ? 'charge' : 'hit'),
  },
  bete: {
    name: 'La Bête de l’Apocalypse', title: 'Sept têtes, sept couronnes',
    intro: 'La salle tremble sous une respiration de forge. Sept têtes se lèvent, et chacune te regarde.',
    mechanic: 'Elle grandit : +1 ATQ et 2 % de ses PV max en plus, un tour sur deux (à chaque tour en Furie). Plus le combat dure, plus elle est terrible. Une Brisure la fait rétrécir.',
    counter: 'Frappe vite et fort : dépense ta Ferveur tôt (pouvoir d’équipe ou Assaut conjoint), et brise-la dès que possible.',
    story: 'On dit qu’elle sortira le jour où le dernier Sceau cédera. Elle ne sait pas compter les jours, alors elle grandit en attendant.',
    pattern: (phase, round) => (round % 3 === 0 ? 'channel' : 'hit'),
  },
  abysse: {
    name: 'L’Abysse', title: 'Ce qui attend au fond',
    intro: 'Il n’y a plus de salle, plus de mur, plus de sol. Seulement un œil immense qui s’ouvre dans le noir, et qui te reconnaît.',
    mechanic: 'Le combat final, en trois phases. Phase 1 : il frappe et lance des déflagrations. Sous 2/3 de ses PV, il rappelle les pouvoirs des gardiens vaincus. Sous 1/3, il se déchaîne : la nuit dévore tes créatures à chaque tour et ses coups redoublent.',
    counter: 'Garde ta Ferveur et tes meilleures créatures pour la dernière phase, et brise-le pour retenir la nuit.',
    story: 'Les Sceaux n’enfermaient pas seulement des monstres : ils gardaient l’Abysse endormi, et tous les gardiens que tu as vaincus n’étaient que ses rêves. Mais l’Abysse lui-même est le rêve de quelque chose qui dort sous toutes les fosses. Tu viens de le réveiller.',
    pattern: (phase, round) => (round % 3 === 0 ? 'channel' : 'hit'),
  },
};
// Un gardien tous les 5 étages, jusqu'à L'Abysse à l'étage 100 ; au-delà, le cycle des vingt recommence
export const BOSS_ORDER = ['devoreur', 'matriarche', 'roi', 'architecte', 'eclipse', 'essaim', 'bourreau', 'choeur', 'chaines', 'horloge', 'miroirs', 'golem', 'peste', 'chasseur', 'voeux', 'titan', 'jumeaux', 'juge', 'bete', 'abysse'];
// L'Abysse, phase 2 : il rappelle un pouvoir de gardien vaincu, à tour de rôle
export const ABYSS_ECHOES = ['gorge', 'gather', 'brood', 'sentence', 'mirror', 'wish'];
// Gardien d'un étage (tous les 5 étages)
export const bossOf = (floor) => BOSS_ORDER[(Math.max(1, Math.floor(floor / 5)) - 1) % BOSS_ORDER.length];

/* v795 : Les Veilles (chapitre de saison après l'étage 100, 5 étages, étages 101 à 105).
   Depuis que le Rêveur remue, une créature du Bestiaire veille pour lui ; mais le sommeil la gagne et le rêve de l'Abysse
   la retourne contre toi. Chaque saison du Codex a son Veilleur : la créature (carte qui porte ses valeurs et son image)
   et un mélange de pouvoirs des gardiens. La saison vient du jour où le chapitre commence (seasonFor), la même pour tous. */
const V = (name, title, intro, mechanic, counter, story, pattern) => ({ name, title, intro, mechanic, counter, story, pattern, veille: true });
export const VEILLEURS = {
  'v-ames': V('Ereshkigal, la Veilleuse des Âmes', 'Reine du Pays sans Retour',
    'Les âmes ne passent plus le fleuve. Sur l’autre rive, une reine compte les vivants qu’il lui manque.',
    'Elle condamne ta créature la plus affaiblie, puis l’exécute au tour suivant. Entre deux sentences, elle concentre une déflagration.',
    'Mets la condamnée en réserve ou en défense, et brise la reine pendant qu’elle concentre sa déflagration.',
    'Pendant la Nuit des Âmes, Ereshkigal tient la porte des morts fermée pour que le Rêveur n’entende pas leurs voix. Elle n’a pas dormi depuis un siècle.',
    (phase, round) => (round % (phase === 2 ? 2 : 3) === 1 ? 'sentence' : round % 3 === 0 ? 'channel' : 'hit')),
  'v-hiver': V('Le Loup des Derniers Hivers', 'Le froid qui mord',
    'La neige tombe à l’envers, vers le ciel. Un loup immense marche sans laisser de traces.',
    'Il rassemble le froid puis lâche une Tempête de givre sur toute ton équipe ; il disparaît dans la neige et bondit sur ta créature la plus affaiblie.',
    'Interromps la tempête par le gel ou la Brisure. Pose la Marque sur lui quand il se cache : il redevient visible.',
    'Le dernier loup de l’hiver garde le froid autour du Rêveur, pour que son sommeil reste lourd. Mais le froid commence à lui geler l’esprit.',
    (phase, round) => (round % 3 === 1 ? 'gather' : round % (phase === 2 ? 2 : 4) === 0 ? 'ambush' : 'hit')),
  'v-marees': V('Léviathan, le Veilleur des Marées', 'Prince de l’Envie',
    'La mer monte dans la salle, noire et silencieuse. Quelque chose d’immense respire sous la surface.',
    'Il chante une Complainte qui frappe toute ton équipe et vole ta Ferveur, puis dévore ta créature la plus vigoureuse.',
    'Garde peu de Ferveur avant sa Complainte et interromps son festin par le gel ou la Brisure.',
    'Léviathan tient les marées noires loin du rivage où dort le Rêveur. Il envie ceux qui dorment : c’est par là que le rêve est entré.',
    (phase, round) => (round % 3 === 2 ? 'chant' : round % (phase === 2 ? 2 : 4) === 0 ? 'gorge' : 'hit')),
  'v-racines': V('La Reine des Ronces', 'Couronne d’épines',
    'Les racines ont percé le sol des Sceaux. Au cœur des ronces, une reine se lève, couverte de fleurs empoisonnées.',
    'Elle éveille un essaim qui empoisonne toute ton équipe, et enchaîne ta créature la plus forte dans ses ronces.',
    'Tes Soigneurs purifient le poison ; brise-la avant que l’essaim ne sorte.',
    'Les racines de la Forêt Première tiennent le sol au-dessus du Rêveur. Leur reine veille depuis le premier printemps, et ses épines ont commencé à rêver.',
    (phase, round) => (round % 3 === 1 ? 'brood' : round % (phase === 2 ? 2 : 3) === 0 ? 'chain' : 'hit')),
  'v-cour': V('Tezcatlipoca, le Veilleur sans Visage', 'Le miroir fumant',
    'Une fumée sombre s’élève d’un miroir d’obsidienne. Ton reflet te fait une révérence que tu n’as pas faite.',
    'Il copie une compétence de ton équipe et la retourne contre toi ; il dresse un miroir qui renvoie ton prochain coup.',
    'Frappe avec le poison quand le miroir est dressé, et brise-le pendant qu’il copie.',
    'À la Cour sans Visage, chacun porte un masque pour que le Rêveur ne reconnaisse personne en rêve. Tezcatlipoca les a tous essayés.',
    (phase, round) => (round % 3 === 1 ? 'mimic' : round % (phase === 2 ? 2 : 3) === (phase === 2 ? 0 : 2) ? 'mirror' : 'hit')),
  'v-pacte': V('Lilith, la Veilleuse du Pacte', 'Mère de la Nuit',
    'Une main se tend vers toi, paume ouverte. « Fais un vœu. Je ne demanderai presque rien. »',
    'Elle accorde un vœu (Ferveur et PA pour toi), puis réclame son prix sur toute ton équipe et s’en soigne ; elle dévore ta créature la plus vigoureuse.',
    'Profite du vœu pour la briser avant que le prix ne tombe, et mets tes créatures en défense.',
    'Lilith a signé un pacte de sang avec les royaumes : elle veille, et en échange on lui doit une nuit. La nuit est longue.',
    (phase, round) => (round % 3 === 1 ? 'wish' : round % (phase === 2 ? 2 : 4) === 0 ? 'gorge' : 'hit')),
  'v-lune': V('Kyūbi, la Veilleuse de la Lune pâle', 'Renarde aux neuf queues',
    'Neuf lueurs dansent entre les arbres d’argent. Laquelle est la vraie renarde ?',
    'Elle se cache sous un voile (presque aucun dégât) puis bondit sur ta créature la plus affaiblie ; elle dresse un miroir qui renvoie ton prochain coup.',
    'La Marque la révèle ; frappe avec le poison quand le miroir est dressé.',
    'Dans les jardins de la Lune pâle, Kyūbi garde les rêves légers loin du Rêveur. Les rêves lourds, elle les mange. Elle en a trop mangé.',
    (phase, round) => (round % 2 === 0 ? 'ambush' : round % (phase === 2 ? 3 : 5) === 1 ? 'mirror' : 'hit')),
  'v-forge': V('Héphaïstos, le Veilleur de la Forge', 'Le forgeron des dieux',
    'L’enclume sonne seule dans la Forge Sans Maître. Un forgeron venu d’ailleurs lève son marteau sans te regarder.',
    'Il charge des coups énormes et enchaîne ta créature la plus forte ; en Furie, il frappe plus souvent.',
    'Interromps ses charges par le gel ou la Brisure ; un Protecteur encaisse le coup chargé.',
    'Héphaïstos forge les chaînes qui tiennent le Rêveur. Mais il ne se souvient plus pour qui il les forge.',
    (phase, round) => (round % (phase === 2 ? 2 : 3) === (phase === 2 ? 0 : 2) ? 'charge' : round % 3 === 0 ? 'chain' : 'hit')),
  'v-titans': V('Surtr, le Veilleur du Brasier', 'Le Noir du Muspellheim',
    'Le sol fond. Une épée de feu se lève au-dessus d’une silhouette noire comme le charbon.',
    'Il rassemble la chaleur puis déchaîne une tempête de flammes sur toute ton équipe, et concentre des déflagrations.',
    'Interromps ses incantations par le gel ou la Brisure ; garde tes Soigneurs debout.',
    'Surtr entretient le brasier où les Titans font semblant de dormir. Si le feu s’éteint, ils se lèveront. Le feu le dévore lui aussi.',
    (phase, round) => (round % 3 === 1 ? 'gather' : round % (phase === 2 ? 2 : 3) === (phase === 2 ? 0 : 2) ? 'channel' : 'hit')),
  'v-moissons': V('Le Faucheur des Souvenirs', 'Il prend ce qui reste',
    'Les champs d’ombre sont mûrs. Une faux passe, et tu oublies le nom de ta première créature.',
    'Il condamne ta créature la plus affaiblie puis l’exécute ; il éveille un essaim qui empoisonne toute ton équipe.',
    'Mets la condamnée à l’abri, purifie le poison, et brise-le pendant ses préparatifs.',
    'Le Faucheur moissonne les souvenirs qui pourraient réveiller le Rêveur. Il n’en garde aucun pour lui, et c’est ce qui le rend si triste.',
    (phase, round) => (round % 3 === 1 ? 'sentence' : round % (phase === 2 ? 2 : 3) === (phase === 2 ? 0 : 2) ? 'brood' : 'hit')),
  'v-pages': V('Les Moires, Veilleuses des Pages perdues', 'Le fil, la mesure et la coupe',
    'Trois sœurs tiennent un fil d’argent. L’une le file, l’autre le mesure. La troisième lève ses ciseaux.',
    'Elles mesurent ta créature la plus affaiblie (condamnée), la coupent au tour suivant, et enchaînent ta créature la plus forte.',
    'Mets la condamnée à l’abri ou en défense, et brise les Moires avant la coupe.',
    'Les Moires rangent les pages perdues du Bestiaire pour que personne ne lise celle du Rêveur. Une page leur manque. Elles te soupçonnent.',
    (phase, round) => (round % (phase === 2 ? 2 : 3) === 1 ? 'sentence' : round % 3 === 0 ? 'chain' : 'hit')),
};
Object.assign(BOSSES, VEILLEURS);
// saison du Codex → son Veilleur et la carte qui le porte (image et valeurs)
export const VEILLES = {
  's1-ames': { boss: 'v-ames', card: 'NEC-043' }, 's3-hiver': { boss: 'v-hiver', card: 'SAU-048' }, 's9-marees': { boss: 'v-marees', card: 'ABY-045' },
  's5-racines': { boss: 'v-racines', card: 'SAU-046' }, 's6-carnaval': { boss: 'v-cour', card: 'PRI-070' }, 's4-coeurs': { boss: 'v-pacte', card: 'INF-051' },
  's7-lune': { boss: 'v-lune', card: 'SAU-045' }, 's10-forge': { boss: 'v-forge', card: 'ART-046' }, 's8-solstice': { boss: 'v-titans', card: 'PRI-041' },
  's11-moissons': { boss: 'v-moissons', card: 'NEC-039' }, 's12-anniv': { boss: 'v-pages', card: 'NEC-070' },
};
export const VEILLE_START = 101; // étages 101 à 105
