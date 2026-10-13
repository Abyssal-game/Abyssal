// Pouvoirs signature des créatures pour les Salles Oubliées (plateau tactique).
// Chaque créature a UN pouvoir, choisi selon ce qu'elle est (catégorie, capacités, rôle) :
// un ange soigne, un mort-vivant draine, un dragon crache, un automate se blinde…
// La liste des attributions est générée dans data/powers.json (tools/powers.py) et peut y être
// corrigée carte par carte : le fichier a toujours le dernier mot.
import { roleOf } from './army.js';

// range : portée en cases (1 = corps à corps) · acts : actions dépensées (1 ou 2) ·
// eff : ce que fait la carte (résolu par dungeon.js) · fits : catégories, capacités, rôles et
// factions qui vont bien avec ce pouvoir · bans : catégories qui ne doivent jamais l'avoir.
export const POWERS = {
  // ——— Lumière, soin, protection ———
  grace:     { name: 'Grâce', icon: 'heart', acts: 1, range: 3, desc: 'Rend des PV à un allié (ou à elle-même) et le libère du poison et du gel.',
    eff: { type: 'heal', mult: 1, cleanse: true }, fits: { cat: ['Ange', 'Archange', 'Créature céleste', 'Esprit', 'Divinité'], ab: ['bless', 'regen'], role: ['soin'], fac: ['celeste'] }, bans: ['Mort-vivant', 'Goule', 'Spectre', 'Démon', 'Vampire', 'Esprit des morts', 'Ange déchu', 'Bête', 'Insecte', 'Essaim', 'Golem', 'Automate', 'Construction'] },
  hymne:     { name: 'Hymne', icon: 'heart', acts: 2, range: 0, desc: 'Rend des PV à toute ton équipe, où qu’elle soit dans la salle.',
    eff: { type: 'heal', mult: 0.7, all: true }, fits: { cat: ['Archange', 'Ange', 'Créature céleste', 'Divinité', 'Divinité mésopotamienne'], ab: ['bless'], role: ['soin'] }, bans: ['Mort-vivant', 'Goule', 'Spectre', 'Démon', 'Vampire', 'Esprit des morts', 'Ange déchu', 'Bête', 'Insecte', 'Essaim', 'Automate', 'Golem'] },
  egide:     { name: 'Égide', icon: 'shield', acts: 1, range: 3, desc: 'Pose un bouclier sur un allié : il absorbe les prochains dégâts (selon sa magie).',
    eff: { type: 'shield', mult: 1 }, fits: { cat: ['Ange', 'Archange', 'Créature céleste', 'Golem', 'Automate', 'Construction'], ab: ['aegis', 'armor', 'relic'], role: ['protecteur'] } },
  sanctuaire:{ name: 'Sanctuaire', icon: 'shield', acts: 2, range: 0, desc: 'Bouclier sur tous tes alliés à 2 cases ou moins.',
    eff: { type: 'shield', mult: 0.6, radius: 2 }, fits: { cat: ['Archange', 'Divinité', 'Créature céleste', 'Titanide'], ab: ['aegis', 'relic'], role: ['protecteur'] } },
  jugement:  { name: 'Jugement', icon: 'sparkle', acts: 1, range: 3, desc: 'Un trait de lumière. Jet de D20 : réussite, dégâts ×1,5 ; critique, ×2 et la cible est marquée.',
    eff: { type: 'strike', mult: 1.5, dc: 10, critOn: ['mark'] }, fits: { cat: ['Ange', 'Archange', 'Ange déchu', 'Créature céleste'], ab: ['strike', 'curse'], role: ['degats'], fac: ['celeste'] } },
  // ——— Mort, sang, ombre ———
  drain:     { name: 'Baiser de sang', icon: 'skull', acts: 1, range: 1, desc: 'Mord un ennemi et récupère autant de PV que de dégâts infligés.',
    eff: { type: 'strike', mult: 1, on: ['drain'] }, fits: { cat: ['Vampire', 'Mort-vivant', 'Goule', 'Spectre', 'Esprit des morts', 'Démone', 'Insecte'], ab: ['drain'], fac: ['necrotique'] } },
  releve:    { name: 'Relève des morts', icon: 'skull', acts: 2, range: 1, desc: 'Fait sortir du sol une goule qui combat pour toi (elle tombe à la fin de la salle).',
    eff: { type: 'summon', key: 'goule' }, fits: { cat: ['Mort-vivant', 'Esprit des morts', 'Spectre', 'Divinité nordique', 'Dieu oublié'], ab: ['relic', 'omen'], fac: ['necrotique'] }, bans: ['Ange', 'Archange', 'Bête', 'Automate'] },
  maledict:  { name: 'Malédiction', icon: 'eye', acts: 1, range: 3, desc: 'La cible subit +50 % de dégâts pendant 2 tours et perd 2 en attaque.',
    eff: { type: 'curse', turns: 2 }, fits: { cat: ['Spectre', 'Esprit des morts', 'Démon de la Goétie', 'Yōkai', 'Esprit', 'Créature égyptienne', 'Dieu oublié'], ab: ['curse', 'omen', 'fear'] } },
  terreur:   { name: 'Terreur', icon: 'skull', acts: 1, range: 2, desc: 'Les ennemis à 2 cases ou moins reculent d’une case et perdent leur prochain déplacement.',
    eff: { type: 'fear', radius: 2 }, fits: { cat: ['Spectre', 'Démon', 'Bête infernale', 'Entité du Néant', 'Esprit', 'Yōkai', 'Géant'], ab: ['fear'] } },
  linceul:   { name: 'Linceul', icon: 'eye', acts: 1, range: 0, desc: 'Elle devient insaisissable jusqu’à son prochain tour : les ennemis ne peuvent pas la viser.',
    eff: { type: 'status', self: true, s: 'elusive', turns: 1 }, fits: { cat: ['Spectre', 'Esprit', 'Esprit des morts', 'Yōkai', 'Ange déchu'], ab: ['elusive'] } },
  // ——— Feu, enfer, destruction ———
  brasier:   { name: 'Brasier', icon: 'flame', acts: 1, range: 3, desc: 'Boule de feu : dégâts sur la cible et sur tout ce qui l’entoure (moitié).',
    eff: { type: 'burst', mult: 1, radius: 1, splash: 0.5 }, fits: { cat: ['Démon', 'Démone', 'Bête infernale', 'Dragon', 'Élémentaire'], ab: ['cataclysm', 'strike'], fac: ['infernal'] } },
  souffle:   { name: 'Souffle', icon: 'flame', acts: 2, range: 3, desc: 'Un souffle en ligne droite qui traverse jusqu’à 3 cases. Jet de D20 par cible.',
    eff: { type: 'line', len: 3, mult: 1.2, dc: 9 }, fits: { cat: ['Dragon', 'Dragon primordial', 'Serpent primordial', 'Chimère', 'Bête infernale'], ab: ['cataclysm'] } },
  cataclysme:{ name: 'Cataclysme', icon: 'flame', acts: 2, range: 0, desc: 'Frappe tous les ennemis de la salle (60 % de son attaque). Elle ne peut rien faire d’autre ce tour-ci.',
    eff: { type: 'all', mult: 0.6 }, fits: { cat: ['Titan', 'Dragon primordial', 'Entité abyssale', 'Entité du Néant', 'Divinité'], ab: ['cataclysm'], role: ['zone'] } },
  pacte:     { name: 'Pacte noir', icon: 'flame', acts: 1, range: 1, desc: 'Sacrifie 3 PV : dégâts ×2 et +D6 sur un ennemi adjacent.',
    eff: { type: 'strike', mult: 2, die: 6, selfCost: 3 }, fits: { cat: ['Démon', 'Démon de la Goétie', 'Démone', 'Ange déchu'], ab: ['curse', 'devour'], fac: ['infernal'] } },
  // ——— Poison, essaim, nature ———
  venin:     { name: 'Venin', icon: 'skull', acts: 1, range: 1, desc: 'Morsure empoisonnée : la cible perd 3 PV au début de chacun de ses tours (3 tours).',
    eff: { type: 'strike', mult: 0.8, on: ['poison:3'] }, fits: { cat: ['Insecte', 'Essaim', 'Créature marine', 'Serpent primordial', 'Chimère', 'Bête'], ab: ['venom'] } },
  nuee:      { name: 'Nuée', icon: 'skull', acts: 1, range: 2, desc: 'Un nuage qui empoisonne la cible et ses voisins.',
    eff: { type: 'burst', mult: 0.4, radius: 1, splash: 1, on: ['poison:2'] }, fits: { cat: ['Essaim', 'Insecte', 'Esprit des eaux', 'Créature alchimique'], ab: ['venom', 'cataclysm'] } },
  bond:      { name: 'Bond', icon: 'swords', acts: 1, range: 3, desc: 'Saute sur un ennemi jusqu’à 3 cases : déplacement gratuit puis attaque ×1,2.',
    eff: { type: 'leap', mult: 1.2 }, fits: { cat: ['Bête', 'Bête primordiale', 'Chimère', 'Yōkai', 'Bête infernale'], ab: ['charge', 'first'], role: ['degats'], fac: ['sauvage'] } },
  frenesie:  { name: 'Frénésie', icon: 'swords', acts: 1, range: 1, desc: 'Deux attaques d’affilée (70 % chacune), avec un jet de D20 pour chacune.',
    eff: { type: 'multi', n: 2, mult: 0.7, dc: 9 }, fits: { cat: ['Bête', 'Bête primordiale', 'Chimère', 'Démon', 'Vampire'], ab: ['frenzy', 'devour'] } },
  devorer:   { name: 'Dévorer', icon: 'skull', acts: 1, range: 1, desc: 'Attaque ×1,3. Si la cible meurt, elle gagne +2 en attaque pour la salle.',
    eff: { type: 'strike', mult: 1.3, onKill: 'atk:2' }, fits: { cat: ['Bête primordiale', 'Bête', 'Créature marine', 'Entité abyssale', 'Démon'], ab: ['devour'] } },
  regen:     { name: 'Régénération', icon: 'heart', acts: 1, range: 0, desc: 'Récupère des PV à chacun de ses tours pendant 3 tours (elle seule).',
    eff: { type: 'status', self: true, s: 'regen', turns: 3 }, fits: { cat: ['Bête', 'Géant', 'Créature marine', 'Esprit des eaux', 'Élémentaire', 'Serpent primordial'], ab: ['regen'] } },
  // ——— Eau, abysse, néant ———
  noyade:    { name: 'Noyade', icon: 'eye', acts: 1, range: 3, desc: 'Attire un ennemi jusqu’à elle et le gèle : il perd son prochain tour.',
    eff: { type: 'pull', on: ['freeze'] }, fits: { cat: ['Créature marine', 'Esprit marin', 'Esprit des eaux', 'Entité abyssale'], ab: ['drown'], fac: ['abyssal'] } },
  maree:     { name: 'Marée', icon: 'flame', acts: 2, range: 0, desc: 'Une vague tout autour d’elle : dégâts et recul d’une case pour chaque ennemi adjacent.',
    eff: { type: 'ring', mult: 1, on: ['push:1'] }, fits: { cat: ['Créature marine', 'Esprit marin', 'Esprit des eaux', 'Entité abyssale', 'Géant'], ab: ['cataclysm', 'drown'], role: ['zone'] } },
  abime:     { name: 'Regard de l’Abîme', icon: 'eye', acts: 1, range: 4, desc: 'À 4 cases : la cible est gelée (jet de D20, DD 10). Critique : les voisins aussi.',
    eff: { type: 'freeze', dc: 10, critRadius: 1 }, fits: { cat: ['Entité abyssale', 'Entité du Néant', 'Esprit', 'Yōkai'], ab: ['drown', 'fear', 'omen'], role: ['controle'] } },
  tentacules:{ name: 'Tentacules', icon: 'swords', acts: 1, range: 2, desc: 'Frappe jusqu’à 3 ennemis différents à 2 cases ou moins (70 % chacun).',
    eff: { type: 'nearest', n: 3, radius: 2, mult: 0.7 }, fits: { cat: ['Créature marine', 'Entité abyssale', 'Entité du Néant', 'Chimère'], ab: ['frenzy', 'cataclysm'] } },
  // ——— Machines, pierre, titans ———
  carapace:  { name: 'Carapace', icon: 'shield', acts: 1, range: 0, desc: 'Jusqu’à son prochain tour, chaque coup reçu est réduit de 3.',
    eff: { type: 'status', self: true, s: 'armor', turns: 1 }, fits: { cat: ['Automate', 'Golem', 'Construction', 'Construction maudite', 'Géant', 'Titan'], ab: ['armor'] } },
  provoc:    { name: 'Provocation', icon: 'shield', acts: 1, range: 0, desc: 'Jusqu’à son prochain tour, les ennemis à 3 cases ou moins ne peuvent viser qu’elle, et elle encaisse mieux (−2).',
    eff: { type: 'taunt', radius: 3, turns: 1 }, fits: { cat: ['Golem', 'Géant', 'Titan', 'Automate', 'Construction'], ab: ['guard'], role: ['protecteur'] } },
  martel:    { name: 'Coup de marteau', icon: 'swords', acts: 2, range: 1, desc: 'Attaque ×1,5 + D6. Jet de D20 : réussite, la cible recule de 2 cases ; critique, elle est aussi étourdie.',
    eff: { type: 'strike', mult: 1.5, die: 6, dc: 10, on: ['push:2'], critOn: ['freeze'] }, fits: { cat: ['Géant', 'Titan', 'Golem', 'Automate', 'Construction'], ab: ['strike', 'armor'], role: ['degats'] } },
  engrenage: { name: 'Engrenage', icon: 'sparkle', acts: 1, range: 2, desc: 'Remonte un allié : il regagne une action ce tour-ci (une fois par tour).',
    eff: { type: 'refresh', once: true }, fits: { cat: ['Automate', 'Construction', 'Créature alchimique'], ab: ['command', 'omen'], fac: ['artificiel'] } },
  canon:     { name: 'Canon', icon: 'swords', acts: 1, range: 4, desc: 'Tir à 4 cases. Jet de D20 : réussite, dégâts normaux ; critique, ×2.',
    eff: { type: 'strike', mult: 1, dc: 9 }, fits: { cat: ['Automate', 'Construction', 'Construction maudite'], ab: ['strike', 'first'], fac: ['artificiel'] } },
  // ——— Guerre, commandement, ruse ———
  charge:    { name: 'Charge', icon: 'swords', acts: 1, range: 3, desc: 'Fonce en ligne droite sur un ennemi (déplacement gratuit) : dégâts +1 par case parcourue.',
    eff: { type: 'leap', mult: 1, perCell: 1, straight: true }, fits: { cat: ['Créature mythologique', 'Bête', 'Dragon', 'Titanide', 'Divinité nordique'], ab: ['charge'], role: ['degats'] } },
  ralliement:{ name: 'Cri de ralliement', icon: 'sparkle', acts: 1, range: 0, desc: 'Tes alliés à 3 cases ou moins gagnent +2 en attaque jusqu’à ton prochain tour.',
    eff: { type: 'buff', stat: 'atk', n: 2, radius: 3, turns: 1 }, fits: { cat: ['Divinité nordique', 'Divinité mésopotamienne', 'Créature mythologique', 'Titanide', 'Géant', 'Ange'], ab: ['command'], role: ['soutien'] } },
  embuscade: { name: 'Embuscade', icon: 'swords', acts: 1, range: 1, desc: 'Attaque ×2 sur un ennemi qui n’a pas encore agi ce tour-ci (sinon ×1).',
    eff: { type: 'strike', mult: 1, freshMult: 2 }, fits: { cat: ['Yōkai', 'Bête', 'Vampire', 'Démone', 'Insecte', 'Créature mythologique'], ab: ['first', 'elusive'] } },
  marque:    { name: 'Marque du chasseur', icon: 'sparkle', acts: 1, range: 4, desc: 'Marque un ennemi 2 tours : il subit +50 % de dégâts et tes jets contre lui ont +3.',
    eff: { type: 'mark', turns: 2 }, fits: { cat: ['Créature mythologique', 'Bête', 'Divinité', 'Créature égyptienne'], ab: ['omen', 'command'], role: ['soutien'] } },
  foudre:    { name: 'Foudre', icon: 'sparkle', acts: 1, range: 4, desc: 'Un éclair à 4 cases qui saute sur un deuxième ennemi voisin (moitié).',
    eff: { type: 'chain', mult: 1, hops: 1, hopMult: 0.5 }, fits: { cat: ['Divinité', 'Divinité nordique', 'Divinité mésopotamienne', 'Élémentaire', 'Dieu oublié', 'Dragon primordial'], ab: ['strike', 'cataclysm'] } },
  illusion:  { name: 'Illusion', icon: 'eye', acts: 1, range: 4, desc: 'Échange sa place avec un allié ou un ennemi visible à 4 cases ou moins.',
    eff: { type: 'swap' }, fits: { cat: ['Yōkai', 'Esprit', 'Créature alchimique', 'Spectre', 'Démon de la Goétie'], ab: ['elusive', 'omen'] } },
  sceau:     { name: 'Sceau', icon: 'sparkle', acts: 1, range: 3, desc: 'Pose un piège sur une case libre : le premier ennemi qui y entre subit des dégâts et s’arrête.',
    eff: { type: 'trap' }, fits: { cat: ['Créature alchimique', 'Divinité', 'Créature égyptienne', 'Automate', 'Yōkai'], ab: ['omen', 'relic'], role: ['controle'] } },
  ecrasement:{ name: 'Écrasement', icon: 'swords', acts: 2, range: 1, desc: 'Frappe tous les ennemis adjacents (attaque ×1 chacun). Jet de D20 unique.',
    eff: { type: 'ring', mult: 1, dc: 9 }, fits: { cat: ['Géant', 'Titan', 'Dragon', 'Bête primordiale', 'Golem'], ab: ['cataclysm', 'strike'], role: ['zone'] } },
  presage:   { name: 'Présage', icon: 'eye', acts: 1, range: 0, desc: 'Pioche 2 cartes d’action et ses prochains jets de dés ont +2 jusqu’à son prochain tour.',
    eff: { type: 'draw', n: 2, s: 'lucky', turns: 1 }, fits: { cat: ['Esprit', 'Divinité', 'Dieu oublié', 'Créature égyptienne', 'Yōkai', 'Démon de la Goétie'], ab: ['omen'] } },
};

const CAT_FALLBACK = {
  'Divinité nordique': ['Divinité'], 'Divinité mésopotamienne': ['Divinité'], 'Dieu oublié': ['Divinité'], 'Créature égyptienne': ['Divinité'],
  'Titanide': ['Titan'], 'Démone': ['Démon'], 'Démon de la Goétie': ['Démon'], 'Esprit marin': ['Esprit des eaux'], 'Goule': ['Mort-vivant'],
  'Construction maudite': ['Construction'], 'Bête infernale': ['Bête', 'Démon'], 'Serpent primordial': ['Dragon'], 'Dragon primordial': ['Dragon'],
};
const hashOf = (s) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

// Pouvoir le plus logique pour une carte (sans tenir compte des corrections de data/powers.json)
export function suggestPower(card) {
  const cats = [card.category, ...(CAT_FALLBACK[card.category] || [])];
  const abs = (card.abilities || []).map((a) => a.key);
  const role = roleOf(card);
  const scored = Object.entries(POWERS).map(([key, p]) => {
    if ((p.bans || []).includes(card.category)) return [key, -1];
    let s = 0;
    const f = p.fits || {};
    if ((f.cat || []).includes(card.category)) s += 4;
    else if (cats.some((c) => (f.cat || []).includes(c))) s += 2;
    for (const a of abs) if ((f.ab || []).includes(a)) s += 3;
    if ((f.role || []).includes(role)) s += 1;
    if ((f.fac || []).includes(card.faction)) s += 1;
    return [key, s];
  }).filter(([, s]) => s > 0);
  if (!scored.length) return 'embuscade';
  const best = Math.max(...scored.map(([, s]) => s));
  // parmi les pouvoirs à 1 point du meilleur, on varie selon la carte (deux anges n'ont pas forcément le même)
  const top = scored.filter(([, s]) => s >= best - 1).map(([k]) => k);
  return top[hashOf(card.id) % top.length];
}

// Pouvoir d'une carte : la correction de data/powers.json d'abord, sinon la suggestion
export function powerOf(card, catalog) {
  const key = catalog?.powers?.[card.id];
  return POWERS[key] ? key : suggestPower(card);
}
