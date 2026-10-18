import * as EN from './encheres.js';
import * as PA from './pacte.js';
import * as CR from './cryptes.js';
// Titres et cadres : d'où vient chacun (pour expliquer comment débloquer ceux qui manquent).
import { LEVEL_TITLES, FRAMES, ASH_FRAMES } from '../config.js';
import { SCEAUX_TITLES, RIVALS } from './sceaux.js';

const lc = (t) => t.charAt(0).toLowerCase() + t.slice(1);

export function unlockSources(cat) {
  const titles = new Map(), frames = new Map();
  const add = (m, k, how) => { if (!k) return; const l = m.get(k) || []; if (!l.includes(how)) l.push(how); m.set(k, l); };
  frames.set('base', ['Offert dès le départ.']);
  for (const [k, n] of Object.entries(ASH_FRAMES)) frames.set(k, [`À acheter ${n} cendres à la Fournaise.`]);
  for (const [n, t] of LEVEL_TITLES) add(titles, t, n === 1 ? 'Offert dès le départ.' : `Atteins le niveau ${n} de profil (l’expérience se gagne en jouant).`);
  for (const a of cat.achievements) {
    const how = `Succès « ${a.name} » : ${lc(a.desc)}`;
    add(titles, a.reward?.title, how); add(frames, a.reward?.frame, how);
  }
  for (const s of cat.sets) {
    const how = `Complète l’ensemble « ${s.name} » (${s.cards.length} créatures, voir Succès › Ensembles).`;
    add(titles, s.reward?.title, how); add(frames, s.reward?.frame, how);
  }
  for (const f of Object.keys(cat.faction)) add(frames, f, `Possède toutes les créatures de la faction ${cat.faction[f].name}.`);
  const rival = (k) => RIVALS.find((r) => r.key === k)?.name || '';
  add(titles, SCEAUX_TITLES.initie, 'Gagne ton premier Duel des Sceaux (Aventure › Jeux › Duels des Sceaux).');
  for (const k of ['maitre', 'echo', 'souverain']) add(titles, SCEAUX_TITLES[k], `Bats ${rival(k)} aux Duels des Sceaux.`);
  add(titles, 'Vainqueur des Implacables', 'Bats tous les adversaires en revanche implacable aux Duels des Sceaux.');
  add(frames, 'sceaux', `Bats ${rival('echo')} aux Duels des Sceaux.`);
  /* v459 : titres des jeux de la Salle des jeux */
  for (const [M, title, game, last] of [[EN, EN.ENCHERES_TITLE, 'les Enchères de Mammon', 'la dernière vente'], [PA, PA.PACTE_TITLE, 'le Pacte', 'le dernier pacte'], [CR, CR.CRYPTES_TITLE, 'les Cryptes', 'la dernière crypte']]) add(titles, title, `Gagne ${last}, « ${M.TABLES.at(-1).name} », dans ${game} (Aventure › Jeux).`);
  add(titles, 'Vainqueur de l’Abysse', 'Vaincs L’Abysse, le gardien de l’étage 100 de la Descente.');
  add(frames, 'oeil', 'Vaincs L’Abysse, le gardien de l’étage 100 de la Descente.');
  return {
    titles: [...titles].map(([name, how]) => ({ name, how: how.join(' Ou : ') })),
    frames: Object.keys(FRAMES).filter((k) => frames.has(k)).map((k) => ({ key: k, name: FRAMES[k], how: frames.get(k).join(' Ou : ') })),
  };
}
