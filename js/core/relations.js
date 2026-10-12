// ABYSSAL : relations entre créatures (données). Trois sortes de liens, tous configurables ici :
// - prédation : une famille chasse une autre (+20 % de dégâts contre elle) ;
// - rivalité : deux familles qui se haïssent (+15 % de dégâts dans les deux sens, annoncé en combat) ;
// - légende : des créatures issues d'un même mythe, plus fortes ensemble (+1 ATQ, +10 % PV, +2 ATQ à trois).
// Le joueur les découvre en combat ; elles apparaissent ensuite dans le Bestiaire.

// Familles : regroupent les catégories des cartes (champ « category »)
export const FAMILIES = {
  ange:      { name: 'Anges', cats: ['Ange', 'Archange', 'Créature céleste', 'Esprit céleste', 'Saint', 'Construction sacrée'] },
  demon:     { name: 'Démons', cats: ['Démon', 'Démone', 'Démon de la Goétie', 'Bête infernale', 'Ange déchu', 'Oni', 'Démon mésopotamien', 'Démone mésopotamienne', 'Démone primordiale', 'Démon des îles', 'Djinn', 'Plante infernale', 'Damné'] },
  mort:      { name: 'Morts-vivants', cats: ['Mort-vivant', 'Vampire', 'Spectre', 'Goule', 'Esprit des morts'] },
  dragon:    { name: 'Dragons et serpents', cats: ['Dragon', 'Dragon primordial', 'Serpent primordial'] },
  bete:      { name: 'Bêtes', cats: ['Bête', 'Lycanthrope', 'Chimère', 'Créature mythologique', 'Bête primordiale'] },
  marin:     { name: 'Créatures des eaux', cats: ['Créature marine', 'Esprit marin', 'Esprit des eaux', 'Divinité marine'] },
  automate:  { name: 'Constructions', cats: ['Automate', 'Golem', 'Construction', 'Construction maudite', 'Créature alchimique', 'Automate cosmique', 'Divinité artificielle', 'Objet maudit'] },
  geant:     { name: 'Géants et titans', cats: ['Géant', 'Titan', 'Titanide'] },
  essaim:    { name: 'Essaims et insectes', cats: ['Essaim', 'Insecte', 'Insecte sacré'] },
};
const FAM_OF = {};
for (const [k, f] of Object.entries(FAMILIES)) f.cats.forEach((c) => { FAM_OF[c] = k; });
export const familyOf = (card) => FAM_OF[card?.category] || null;

export const RELATIONS = [
  { key: 'p-dragon-bete', type: 'proie', a: 'dragon', b: 'bete', name: 'Le festin des écailles', desc: 'Les dragons et serpents infligent +20 % de dégâts aux bêtes.' },
  { key: 'p-bete-essaim', type: 'proie', a: 'bete', b: 'essaim', name: 'Gueule contre nuée', desc: 'Les bêtes infligent +20 % de dégâts aux essaims et insectes.' },
  { key: 'p-ange-mort', type: 'proie', a: 'ange', b: 'mort', name: 'La lumière qui délivre', desc: 'Les anges infligent +20 % de dégâts aux morts-vivants.' },
  { key: 'p-geant-automate', type: 'proie', a: 'geant', b: 'automate', name: 'Briseurs de machines', desc: 'Les géants et titans infligent +20 % de dégâts aux constructions.' },
  { key: 'p-marin-demon', type: 'proie', a: 'marin', b: 'demon', name: 'L’eau qui éteint', desc: 'Les créatures des eaux infligent +20 % de dégâts aux démons.' },
  { key: 'r-ange-demon', type: 'rival', a: 'ange', b: 'demon', name: 'La Guerre d’en haut', desc: 'Anges et démons se haïssent : +15 % de dégâts dans les deux sens.' },
  { key: 'r-dragon-geant', type: 'rival', a: 'dragon', b: 'geant', name: 'La querelle des anciens', desc: 'Dragons et géants se disputent le monde : +15 % de dégâts dans les deux sens.' },
  { key: 'l-ragnarok', type: 'legende', ids: ['SAU-049', 'ABY-046', 'NEC-041', 'PRI-041', 'PRI-040'], name: 'Ragnarök', desc: 'Fenrir, Jörmungandr, Hel, Surtr et Ymir : ensemble dans ton équipe, ils gagnent +1 ATQ et +10 % de PV (+2 ATQ à trois).' },
  { key: 'l-messine', type: 'legende', ids: ['ABY-030', 'ABY-031'], name: 'Le détroit de Messine', desc: 'Scylla et Charybde : ensemble dans ton équipe, +1 ATQ et +10 % de PV.' },
  { key: 'l-heros-grecs', type: 'legende', ids: ['SAU-044', 'SAU-043', 'SAU-042', 'SAU-033'], name: 'Les épreuves des héros', desc: 'Hydre, Cerbère, Chimère et Minotaure : ensemble, +1 ATQ et +10 % de PV (+2 ATQ à trois).' },
  { key: 'l-chaos', type: 'legende', ids: ['ABY-045', 'PRI-049', 'ABY-046', 'PRI-048'], name: 'Les serpents du chaos', desc: 'Léviathan, Apophis, Jörmungandr et Tiamat : ensemble, +1 ATQ et +10 % de PV (+2 ATQ à trois).' },
  { key: 'l-mesopotamie', type: 'legende', ids: ['INF-028', 'INF-037', 'PRI-048'], name: 'Les tablettes de Sumer', desc: 'Lamashtu, Pazuzu et Tiamat : ensemble, +1 ATQ et +10 % de PV (+2 ATQ à trois).' },
];
export const RELATION = Object.fromEntries(RELATIONS.map((r) => [r.key, r]));

// Multiplicateur de dégâts lié aux familles, et la relation qui s'applique (pour la découverte)
export function relationMult(a, t) {
  if (!a?.family || !t?.family) return { m: 1, rel: null };
  for (const r of RELATIONS) {
    if (r.type === 'proie' && r.a === a.family && r.b === t.family) return { m: 1.2, rel: r.key };
    if (r.type === 'rival' && ((r.a === a.family && r.b === t.family) || (r.b === a.family && r.a === t.family))) return { m: 1.15, rel: r.key };
  }
  return { m: 1, rel: null };
}
// Légendes actives dans une équipe (liste d'ids) : [{ key, members }]
export function activeLegends(ids) {
  return RELATIONS.filter((r) => r.type === 'legende').map((r) => ({ key: r.key, members: r.ids.filter((id) => ids.includes(id)) })).filter((x) => x.members.length >= 2);
}
// Relations qui concernent une carte (pour le Bestiaire)
export function relationsOf(card) {
  const f = familyOf(card);
  return RELATIONS.filter((r) => (r.type === 'legende' ? r.ids.includes(card.id) : f && (r.a === f || r.b === f)));
}
