// ABYSSAL : gardiens à mécaniques uniques (données). Le moteur (duel.js) lit ces fiches :
// chaque gardien suit un « motif » d'intentions selon sa phase et le tour, et ses actions spéciales
// sont des intentions comme les autres (annoncées un tour à l'avance, interrompues par le gel ou la
// Brisure). Ajouter un gardien = ajouter une fiche ici, sans toucher au moteur.

// Lois de l'Architecte : une règle du combat change, annoncée un tour avant.
export const LAWS = {
  silence: { name: 'Loi du silence', desc: 'Tes compétences coûtent 1 PA de plus.' },
  fer:     { name: 'Loi du fer', desc: 'L’Architecte subit 40 % de dégâts en moins, sauf s’il est brisé.' },
  echo:    { name: 'Loi de l’écho', desc: 'Chaque coup porté à l’Architecte renvoie 2 dégâts à l’attaquant.' },
  hate:    { name: 'Loi de la hâte', desc: 'Tes créatures gagnent 1 PA de plus à chaque tour, mais les ennemis frappent 30 % plus fort.' },
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
    counter: 'Gèle-le ou brise-le pendant qu’il prépare son festin. Un Rempart réduit la morsure.',
    story: 'Avant les Sceaux, le Dévoreur était un gouffre sans fond où l’on jetait les condamnés. À force de recevoir, il a appris à réclamer. Les premiers Scelleurs ne l’ont pas vaincu : ils l’ont seulement rassasié assez longtemps pour fermer la porte.',
    pattern: (phase, round) => (round % (phase === 2 ? 2 : 3) === 2 ? 'gorge' : 'hit'),
  },
  matriarche: {
    name: 'La Matriarche du Givre', title: 'Mère des hivers éternels',
    intro: 'Le souffle se fige dans ta gorge. Sur un trône de glace, une silhouette lève lentement la main.',
    mechanic: 'Elle rassemble le froid pendant un tour, puis déchaîne une Tempête de givre sur toute ton équipe et gèle ta créature la plus forte (deux en phase 2).',
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
    story: 'Il a bâti les Sceaux. Personne ne lui a dit qu’il serait enfermé derrière. Depuis, il retouche les plans de sa prison, une règle à la fois, en attendant que l’une d’elles finisse par céder.',
    pattern: (phase, round) => (round % 2 === 1 ? 'decree' : phase === 2 && round % 4 === 0 ? 'charge' : 'hit'),
  },
  eclipse: {
    name: 'L’Éclipse', title: 'Le soleil qui dévore la lune',
    intro: 'La lumière vacille. Au centre de l’arène, un disque noir se lève, cerclé de feu.',
    mechanic: 'Ses faiblesses changent selon son aspect (soleil ou lune). Le changement est annoncé un tour avant.',
    counter: 'Garde des créatures de factions différentes et frappe avec celles qui exploitent l’aspect du moment.',
    story: 'Quand le jour et la nuit se sont disputé le ciel, l’Éclipse est née de leur collision. Elle n’appartient à aucun des deux, et les trahit tour à tour.',
    pattern: (phase, round) => (round % (phase === 2 ? 2 : 3) === 2 ? 'shift' : phase === 2 && round % 3 === 0 ? 'channel' : 'hit'),
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
    mechanic: 'Il entonne un Chant, puis lance sa Complainte au tour suivant : toute ton équipe est frappée, perd ses boucliers et ses bonus d’attaque, et tu perds 2 Ferveur. En phase 2, la marée monte et ronge tes créatures à chaque tour.',
    counter: 'Brise-le pendant le Chant, esquive la Complainte et dépense ta Ferveur avant qu’elle ne tombe. Une Brisure retient la marée un tour.',
    story: 'Ce sont les marins d’une flotte entière, engloutie en une nuit. Ils ont chanté jusqu’au fond, et l’Abysse a trouvé leur chant trop beau pour le laisser s’éteindre.',
    pattern: (phase, round) => (round % (phase === 2 ? 2 : 3) === 2 ? 'chant' : 'hit'),
  },
  chaines: {
    name: 'Le Seigneur des Chaînes', title: 'Nul ne quitte sa forge',
    intro: 'Des chaînes chauffées à blanc pendent du plafond. Une enclume résonne, et chaque coup fait trembler tes os.',
    mechanic: 'Il lance ses Chaînes sur ta créature la plus forte : elle est frappée et enchaînée (elle ne pourra pas agir à ton prochain tour). En phase 2, sa forge s’embrase : il gagne +1 ATQ à chaque tour où il n’est pas brisé.',
    counter: 'Esquive les Chaînes, libère l’enchaînée avec une Prière, et brise-le souvent pour éteindre sa forge.',
    story: 'Il a forgé les chaînes qui tiennent l’Abysse fermé. Puis il a compris qu’on ne lui ouvrirait jamais, et il s’est mis à forger pour l’autre camp.',
    pattern: (phase, round) => (round % (phase === 2 ? 2 : 3) === 2 ? 'chain' : 'hit'),
  },
  horloge: {
    name: 'L’Horloger', title: 'Le temps lui doit tout',
    intro: 'Un tic-tac emplit la salle, trop lent, puis trop rapide. Au centre, des rouages dorés tournent autour d’une silhouette sans âge.',
    mechanic: 'Il annonce « Remonter le temps » : au tour suivant, il retrouve les PV qu’il avait à l’annonce (un quart de ses PV au plus). En phase 2, le temps s’emballe et il frappe deux fois de suite.',
    counter: 'Brise-le ou gèle-le pendant qu’il remonte le temps, ou garde tes plus gros coups pour juste après.',
    story: 'Il a réglé l’horloge des Sceaux pour qu’elle ne sonne jamais la fin. Depuis, chaque seconde qui passe lui appartient un peu plus.',
    pattern: (phase, round) => (round % 3 === 1 ? 'wind' : phase === 2 ? 'tick2' : 'hit'),
  },
};
// Étages 5 à 25 : les cinq premiers gardiens ; 30 à 50 : les cinq nouveaux ; puis le cycle des dix recommence
export const BOSS_ORDER = ['devoreur', 'matriarche', 'roi', 'architecte', 'eclipse', 'essaim', 'bourreau', 'choeur', 'chaines', 'horloge'];
// Gardien d'un étage (tous les 5 étages)
export const bossOf = (floor) => BOSS_ORDER[(Math.max(1, Math.floor(floor / 5)) - 1) % BOSS_ORDER.length];
