// ABYSSAL : gardiens à mécaniques uniques (données). Le moteur (duel.js) lit ces fiches :
// chaque gardien suit un « motif » d'intentions selon sa phase et le tour, et ses actions spéciales
// sont des intentions comme les autres (annoncées un tour à l'avance, interrompues par le gel ou la
// Brisure). Ajouter un gardien = ajouter une fiche ici, sans toucher au moteur.

// Lois de l'Architecte : une règle du combat change, annoncée un tour avant.
export const LAWS = {
  silence: { name: 'Loi du silence', desc: 'Tes compétences coûtent 1 Ferveur de plus.' },
  fer:     { name: 'Loi du fer', desc: 'L’Architecte subit 40 % de dégâts en moins, sauf s’il est brisé.' },
  echo:    { name: 'Loi de l’écho', desc: 'Chaque coup porté à l’Architecte renvoie 2 dégâts à l’attaquant.' },
  hate:    { name: 'Loi de la hâte', desc: 'Tu as 4 actions par tour, mais les ennemis frappent 30 % plus fort.' },
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
};
export const BOSS_ORDER = ['devoreur', 'matriarche', 'roi', 'architecte', 'eclipse'];
// Gardien d'un étage (tous les 5 étages)
export const bossOf = (floor) => BOSS_ORDER[(Math.max(1, Math.floor(floor / 5)) - 1) % BOSS_ORDER.length];
