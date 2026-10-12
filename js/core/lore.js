// ABYSSAL : bestiaire narratif (données). Trois sortes de récits, tous débloqués par le jeu :
// - les fragments de royaume : un quart, la moitié, puis toute la faction en collection ;
// - les récits des gardiens : en battant chaque gardien (Descente ou Chasse aux Reliques) ;
// - les formes corrompues : quand la forme s'éveille (voir forms.js).
// Les relations entre créatures (relations.js) se découvrent en combat.
import { BOSSES, BOSS_ORDER } from './bosses.js';
import { FORMS, formUnlocked } from './forms.js';
import { RELATIONS } from './relations.js';

export const FRAG_STEPS = [0.25, 0.5, 1];
export const FRAGMENTS = {
  infernal: [
    { title: 'Le premier contrat', text: 'La Géhenne n’a pas été conquise : elle a été achetée. Le premier démon a signé avec le feu lui-même, et le feu a demandé, en échange, que plus rien ne soit jamais donné gratuitement.' },
    { title: 'Les greffiers de cuivre', text: 'Sous la cité, des milliers de greffiers recopient les dettes à la lueur du fleuve. Aucun n’a le droit de lever les yeux. Ceux qui l’ont fait ont vu leur propre nom en bas de la page.' },
    { title: 'La clause oubliée', text: 'Le contrat originel avait une dernière ligne, effacée par la chaleur. Les démons les plus vieux la cherchent encore. On dit qu’elle libère celui qui la lit… ou qu’elle le rend propriétaire de la Géhenne entière.' },
  ],
  abyssal: [
    { title: 'La dernière mer', text: 'Il y avait une mer sous toutes les mers. Quand la lumière a cessé d’y descendre, les choses qui y vivaient ont appris à voir avec la pression, et à aimer le noir.' },
    { title: 'Les dormeurs', text: 'Au fond des Fosses, des formes immenses rêvent. Leurs rêves remontent en bulles et crèvent à la surface sous forme de tempêtes. Les marins appellent ça « le temps qu’il fait ».' },
    { title: 'Le réveil promis', text: 'Les Fosses ne remontent jamais rien. Sauf une fois, dit-on, à la fin : ce jour-là, la mer se retirera d’un coup, et ce qui dormait verra enfin le ciel.' },
  ],
  celeste: [
    { title: 'L’escalier', text: 'Les Sept Cieux sont empilés comme des marches. Chaque ange connaît la sienne et ignore la suivante. Le silence au sommet n’est pas de la paix : c’est une absence que personne n’ose nommer.' },
    { title: 'La Chute', text: 'Le jour de la Chute, un tiers des chœurs s’est tu. Les anges restés en haut chantent depuis plus fort, pour couvrir le bruit de ceux qui tombent encore.' },
    { title: 'Le trône vide', text: 'Un séraphin est monté jusqu’à la dernière marche. Il n’y avait qu’un trône vide et une plume posée dessus. Il est redescendu sans rien dire, et il n’a plus jamais chanté.' },
  ],
  sauvage: [
    { title: 'Avant les villes', text: 'La Forêt Première couvrait tout. Les premiers humains y vivaient comme des proies polies, et la forêt les tolérait comme on tolère une mauvaise herbe.' },
    { title: 'La mémoire des souches', text: 'Chaque arbre abattu laisse une souche qui se souvient. Sous la terre, les racines se parlent, et elles tiennent le compte. La forêt n’oublie rien : elle attend.' },
    { title: 'La grande chasse', text: 'Quand la dernière ville tombera, toutes les bêtes de la Forêt courront ensemble une seule nuit. Les loups l’appellent la Grande Chasse. Ils s’y entraînent à chaque pleine lune.' },
  ],
  necrotique: [
    { title: 'Les portes mal fermées', text: 'Chaque tombe est une porte vers le Pays sans Retour. La plupart sont bien scellées. Les autres grincent les soirs de brume, et quelque chose les pousse doucement de l’autre côté.' },
    { title: 'Le péage', text: 'Les morts paient leur passage avec un souvenir. Ceux qui refusent de payer restent sur le seuil : ce sont eux que les vivants appellent fantômes.' },
    { title: 'La reine des cendres', text: 'Au cœur du Pays sans Retour règne une reine qui a payé tous ses souvenirs pour ne plus jamais souffrir. Elle ne sait plus pourquoi elle règne, mais elle n’abandonnera jamais son trône.' },
  ],
  primordial: [
    { title: 'La carte', text: 'Les Terres d’Avant ne sont sur aucune carte : elles sont le relief sur lequel tout a été posé. Les montagnes sont des épaules de titans qui ont oublié de se relever.' },
    { title: 'Le premier feu', text: 'Les dragons anciens ont allumé le premier feu pour se réchauffer, pas pour éclairer. La lumière est venue après, par accident, et elle leur a toujours fait un peu mal aux yeux.' },
    { title: 'Le réveil des titans', text: 'Si les titans se relèvent, les royaumes glisseront de leurs épaules comme la neige d’un toit. Les Scelleurs l’ont compris : c’est pour eux, d’abord, qu’ils ont gravé les Sceaux.' },
  ],
  artificiel: [
    { title: 'L’artisan', text: 'La Forge Sans Maître avait un maître. Il a construit la première machine pour l’aider, puis une seconde pour aider la première. Un matin, plus personne n’a eu besoin de lui.' },
    { title: 'La chaîne', text: 'La Forge produit toujours. Personne ne sait ce que veulent les machines qu’elle fabrique : elles-mêmes l’ignorent, mais elles obéissent avec une ferveur parfaite à un ordre que plus personne ne donne.' },
    { title: 'Le jour où', text: '« Ce qui est construit obéit. Jusqu’au jour où. » La fin de la devise a été limée sur toutes les enclumes. Les golems les plus anciens la murmurent quand ils se croient seuls.' },
  ],
};

// Tous les récits, avec leur état (débloqué ou non) et une indication pour les débloquer
export function loreEntries(g, cat) {
  const out = [];
  for (const f of Object.keys(FRAGMENTS)) {
    const p = g.factionProgress(f), ratio = p.total ? p.owned / p.total : 0;
    FRAGMENTS[f].forEach((fr, i) => out.push({ key: `frag:${f}:${i}`, kind: 'frag', faction: f, title: fr.title, text: fr.text, unlocked: ratio >= FRAG_STEPS[i],
      hint: `Possède ${FRAG_STEPS[i] === 1 ? 'toutes les créatures' : FRAG_STEPS[i] === 0.5 ? 'la moitié des créatures' : 'un quart des créatures'} de ${cat.faction[f].name} (${p.owned} / ${p.total}).` }));
  }
  for (const k of BOSS_ORDER) {
    const b = BOSSES[k];
    out.push({ key: `boss:${k}`, kind: 'boss', boss: k, title: b.name, sub: b.title, text: b.story, mechanic: b.mechanic, counter: b.counter, unlocked: !!g.s.bossesBeaten[k], hint: 'Vaincs ce gardien dans la Descente ou la Chasse aux Reliques.' });
  }
  for (const [id, f] of Object.entries(FORMS)) {
    out.push({ key: `form:${id}`, kind: 'form', id, title: f.name, sub: f.title, text: f.lore, unlocked: formUnlocked(g, id), hint: g.owns(id) ? f.condText : `Possède ${cat.get(id)?.name || 'cette carte'}, puis : ${f.condText.charAt(0).toLowerCase()}${f.condText.slice(1)}.` });
  }
  for (const r of RELATIONS) out.push({ key: `rel:${r.key}`, kind: 'rel', rel: r, title: r.name, text: r.desc, unlocked: !!g.s.relations[r.key], hint: r.type === 'legende' ? 'Réunis ces créatures dans ton équipe et combats.' : 'Rencontre-la en combat.' });
  return out;
}
// Récits débloqués pas encore lus (pour la pastille « nouveau ») ; markLoreRead les note comme lus
export const unreadLore = (g, cat) => loreEntries(g, cat).filter((e) => e.unlocked && !g.s.lore[e.key]);
export function markLoreRead(g, keys) {
  let n = 0;
  for (const k of keys) if (!g.s.lore[k]) { g.s.lore[k] = Date.now(); n++; }
  if (n) g.persist();
  return n;
}
