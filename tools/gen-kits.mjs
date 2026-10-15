// Génère l'identité de combat de chaque créature (js/core/kits-data.js), sauf les 12 écrites à la main (kits.js).
//
// Tout vient des données de la carte :
//   - le passif : sa première capacité (Charge → Ruée, Venin → Venin…) ; le second passif, débloqué par l'Éveil,
//     vient de sa deuxième capacité (sinon l'Éveil renforce le premier) ;
//   - la frappe : un effet propre à sa faction, nommé d'après sa nature (Démon → Griffe, Ange → Lame…) ;
//   - la répartition attaque / PV : le rapport attaque / PV imprimé sur la carte, comparé aux autres cartes du même rôle ;
//   - la compétence : un modèle de son rôle (3 par rôle) composé d'effets élémentaires (OPS de kits.js), réglé sur un
//     budget de puissance qui dépend de son coût (actions, recharge) et un peu de sa rareté. Les Hyper rares,
//     Mythiques et Secrètes y ajoutent un effet tiré de leur capacité : leur combinaison est unique.
// Usage : node tools/gen-kits.mjs   (puis npm test)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { roleOf } from '../js/core/army.js';
import { ABILITY_PASSIVE, OPS, opsValue, describeOps } from '../js/core/kits.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HAND = ['INF-001', 'NEC-001', 'CEL-001', 'ABY-003', 'CEL-018', 'NEC-017', 'SAU-031', 'INF-012', 'SAU-043', 'ABY-039', 'SAU-049', 'CEL-031'];
const cards = fs.readdirSync(path.join(ROOT, 'data/cards')).flatMap((f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/cards', f), 'utf8')));
const hash = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };
const pick = (arr, id, salt = '') => arr[hash(id + salt) % arr.length];

// ——— Vocabulaire ———
// Adjectif de faction, accordé (masculin, féminin)
const FAC_ADJ = {
  infernal: ['ardent', 'ardente'], abyssal: ['abyssal', 'abyssale'], celeste: ['céleste', 'céleste'], sauvage: ['sauvage', 'sauvage'],
  necrotique: ['funèbre', 'funèbre'], artificiel: ['mécanique', 'mécanique'], primordial: ['primordial', 'primordiale'],
};
// Nom de la frappe selon la nature de la créature : [mot, genre]
const STRIKE_NOUN = [
  [/Démon|Oni|Djinn|Damné/, ['Griffe', 'f']], [/Ange|Archange|Saint/, ['Lame', 'f']], [/Dragon/, ['Croc', 'm']],
  [/Automate|Golem|Construction|Divinité artificielle/, ['Poing', 'm']], [/Lycanthrope|Bête/, ['Morsure', 'f']],
  [/Mort-vivant|Goule|Vampire/, ['Étreinte', 'f']], [/Spectre|Esprit des morts/, ['Toucher', 'm']], [/marine|marin|eaux/, ['Lame de fond', 'f']],
  [/Yōkai/, ['Maléfice', 'm']], [/Esprit/, ['Souffle', 'm']], [/Géant|Titan/, ['Masse', 'f']], [/Serpent/, ['Crochet', 'm']],
  [/Insecte|Essaim/, ['Dard', 'm']], [/Chimère|Cavalier/, ['Ruade', 'f']], [/Élémentaire/, ['Décharge', 'f']], [/Entité|cosmique/, ['Caresse du vide', 'f']],
  [/Plante/, ['Épine', 'f']], [/Objet|alchimique/, ['Éclat', 'm']], [/Divinité|Dieu/, ['Jugement', 'm']], [/Créature céleste/, ['Rayon', 'm']],
  [/.*/, ['Assaut', 'm']],
];
// (la frappe de chaque faction et les textes de la fiche sont dans kits.js : FAC_STRIKE, ROLE_TXT)
const ROLE_NOUN = { protecteur: 'Protecteur', degats: 'Chasseur', soin: 'Guérisseur', poison: 'Empoisonneur', controle: 'Entraveur', soutien: 'Meneur', zone: 'Fléau' };
const ABILITY_ADJ = { charge: 'fonceur', guard: 'inflexible', drain: 'vampirique', first: 'vif', strike: 'explosif', curse: 'maudit', bless: 'béni', aegis: 'protégé', relic: 'éternel', command: 'inspirant', drown: 'étouffant', regen: 'tenace', venom: 'venimeux', frenzy: 'frénétique', armor: 'cuirassé', omen: 'prophétique', cataclysm: 'dévastateur', elusive: 'insaisissable', devour: 'vorace', fear: 'terrifiant' };
const DEFAULT_ABILITY = ['first', 'frenzy', 'charge']; // créatures sans capacité (rôle Assaut)

// ——— Modèles de compétence par rôle : effets, coût, icône peinte, noms possibles ———
const T = (ops, ap, cd, icon, names) => ({ ops, ap, cd, icon, names });
const MOVE_TEMPLATES = {
  degats: [
    T([{ op: 'hit', on: 'tn', m: 0.7 }], 1, 2, 'frenesie', [['Balayage', 'm'], ['Tourbillon', 'm'], ['Fauchage', 'm']]),
    T([{ op: 'hit', on: 't', m: 1.4 }, { op: 'brk', on: 't', n: 2 }], 1, 3, 'ecrasement', [['Fracas', 'm'], ['Frappe brutale', 'f'], ['Assaut furieux', 'm']]),
    T([{ op: 'mark', on: 't' }, { op: 'hit', on: 't', m: 1.0 }], 1, 3, 'embuscade', [['Traque', 'f'], ['Embuscade', 'f'], ['Battue', 'f']]),
  ],
  protecteur: [
    T([{ op: 'shield', on: 'self' }, { op: 'shield', on: 'ally' }], 1, 3, 'carapace', [['Carapace', 'f'], ['Mur', 'm'], ['Bouclier double', 'm']]),
    T([{ op: 'taunt', on: 'self' }, { op: 'defend', on: 'self' }], 1, 3, 'provoc', [['Défi', 'm'], ['Provocation', 'f'], ['Cri de garde', 'm']]),
    T([{ op: 'shield', on: 'team' }], 1, 3, 'egide', [['Muraille', 'f'], ['Forteresse', 'f'], ['Bastion', 'm']]),
  ],
  soin: [
    T([{ op: 'heal', on: 'team', p: 0.15 }], 1, 3, 'hymne', [['Chant', 'm'], ['Cantique', 'm'], ['Psaume', 'm']]),
    T([{ op: 'heal', on: 'ally', p: 0.3 }, { op: 'boost', on: 'ally', n: 2 }], 1, 3, 'grace', [['Grâce', 'f'], ['Souffle de vie', 'm'], ['Faveur', 'f']]),
    T([{ op: 'heal', on: 'ally', p: 0.22 }, { op: 'cleanse', on: 'ally' }, { op: 'shield', on: 'ally' }], 1, 3, 'sanctuaire', [['Sanctuaire', 'm'], ['Refuge', 'm'], ['Onction', 'f']]),
  ],
  poison: [
    T([{ op: 'hit', on: 't', m: 1.0 }, { op: 'poison', on: 't', n: 3 }], 1, 2, 'venin', [['Épines', 'f'], ['Aiguillon', 'm'], ['Crachat', 'm']]),
    T([{ op: 'poison', on: 'foes', n: 2 }], 1, 3, 'nuee', [['Miasme', 'm'], ['Nuée', 'f'], ['Brume', 'f']]),
    T([{ op: 'hit', on: 't', m: 0.6 }, { op: 'slow', on: 't' }, { op: 'poison', on: 't', n: 2 }], 1, 2, 'linceul', [['Linceul', 'm'], ['Voile', 'm'], ['Encre', 'f']]),
  ],
  controle: [
    T([{ op: 'slow', on: 'foes' }], 1, 3, 'terreur', [['Terreur', 'f'], ['Épouvante', 'f'], ['Glas', 'm']]),
    T([{ op: 'freeze', on: 't' }, { op: 'slow', on: 'n' }], 2, 3, 'noyade', [['Geôle', 'f'], ['Étau', 'm'], ['Prison', 'f']]),
    T([{ op: 'hit', on: 't', m: 0.8 }, { op: 'freeze', on: 't' }], 2, 3, 'sceau', [['Sceau', 'm'], ['Gel', 'm'], ['Pétrification', 'f']]),
  ],
  soutien: [
    T([{ op: 'boost', on: 'team', n: 2 }], 1, 3, 'ralliement', [['Ralliement', 'm'], ['Cri de guerre', 'm'], ['Exhortation', 'f']]),
    T([{ op: 'mark', on: 't' }, { op: 'hit', on: 't', m: 0.8 }], 1, 2, 'marque', [['Désignation', 'f'], ['Sentence', 'f'], ['Jugement', 'm']]),
    T([{ op: 'fervor', on: 'self', n: 2 }], 1, 3, 'presage', [['Ferveur', 'f'], ['Prophétie', 'f'], ['Invocation', 'f']]),
  ],
  zone: [
    T([{ op: 'hit', on: 'foes', m: 0.6 }], 1, 3, 'cataclysme', [['Déluge', 'm'], ['Onde', 'f'], ['Embrasement', 'm']]),
    T([{ op: 'hit', on: 'foes', m: 0.45 }, { op: 'brk', on: 'foes', n: 1 }], 1, 3, 'maree', [['Raz', 'm'], ['Éboulement', 'm'], ['Tempête', 'f']]),
    T([{ op: 'hit', on: 'tn', m: 0.8 }, { op: 'poison', on: 'tn', n: 1 }], 1, 2, 'bombe', [['Explosion', 'f'], ['Déflagration', 'f'], ['Gerbe', 'f']]),
  ],
};
// Ce modèle frappe même derrière une Garde
MOVE_TEMPLATES.poison[0].reach = true;
// Effet en plus des Hyper rares, Mythiques et Secrètes, selon leur capacité
const RARE_EXTRA = {
  charge: { op: 'brk', on: 't', n: 2 }, first: { op: 'brk', on: 't', n: 1 }, frenzy: { op: 'boost', on: 'self', n: 2 }, devour: { op: 'heal', on: 'self', p: 0.15 },
  guard: { op: 'defend', on: 'self' }, armor: { op: 'shield', on: 'self' }, aegis: { op: 'shield', on: 'self' }, regen: { op: 'heal', on: 'self', p: 0.15 },
  bless: { op: 'heal', on: 'low', p: 0.12 }, venom: { op: 'poison', on: 't', n: 2 }, drain: { op: 'heal', on: 'self', p: 0.12 }, fear: { op: 'slow', on: 't' },
  drown: { op: 'slow', on: 't' }, curse: { op: 'mark', on: 't' }, command: { op: 'boost', on: 'team', n: 1 }, omen: { op: 'fervor', on: 'self', n: 1 },
  relic: { op: 'fervor', on: 'self', n: 1 }, cataclysm: { op: 'brk', on: 'foes', n: 1 }, strike: { op: 'brk', on: 't', n: 2 }, elusive: { op: 'defend', on: 'self' },
};
// Budget de puissance d'une compétence : selon actions et recharge, puis un peu selon la rareté
const BUDGET = { '1/2': 1.45, '1/3': 1.9, '2/3': 2.9 };
const RARITY_BONUS = { C: 0, PC: 0.1, R: 0.2, HR: 0.3, M: 0.45, S: 0.6 };
const SCALE = { hit: ['m', 0.3, 2.4, 0.05], poison: ['n', 1, 6, 1], heal: ['p', 0.08, 0.4, 0.01], boost: ['n', 1, 3, 1], brk: ['n', 1, 4, 1], fervor: ['n', 1, 3, 1] };
const round = (x, step) => Math.round(x / step) * step;
function fit(ops, budget) {
  // ajuste les quantités réglables (dégâts, poison, soin…) pour que la valeur approche le budget
  let best = ops, bestErr = Infinity;
  for (let k = 0.4; k <= 2.2; k += 0.02) {
    const cand = ops.map((o) => { const S = SCALE[o.op]; if (!S) return o; const [f, lo, hi, step] = S; return { ...o, [f]: +Math.min(hi, Math.max(lo, round(o[f] * k, step))).toFixed(2) }; });
    const err = Math.abs(opsValue(cand) - budget);
    if (err < bestErr - 1e-9) { best = cand; bestErr = err; }
  }
  return best;
}

// « de » + nom de la créature, avec élision et article (Lucifer → de Lucifer, Le Roi → du Roi, L’Ange → de l’Ange)
function ofName(name) {
  const n = name.split(',')[0].trim();
  if (/^Le /.test(n)) return `du ${n.slice(3)}`;
  if (/^La /.test(n)) return `de la ${n.slice(3)}`;
  if (/^Les /.test(n)) return `des ${n.slice(4)}`;
  if (/^L[’']/.test(n)) return `de l’${n.slice(2)}`;
  return /^[AEIOUYÉÈÊÂÎÔÛŒaeiouyéèh]/.test(n) ? `d’${n}` : `de ${n}`;
}

const out = {};
// rapport attaque / PV moyen par rôle (pour la répartition)
const ratio = (c) => (c.stats?.atk || 1) / Math.max(1, c.stats?.hp || 1);
const roleMean = {};
for (const c of cards) (roleMean[roleOf(c)] ||= []).push(ratio(c));
for (const r of Object.keys(roleMean)) roleMean[r] = roleMean[r].reduce((a, b) => a + b, 0) / roleMean[r].length;

for (const c of cards.sort((a, b) => a.id.localeCompare(b.id))) {
  if (HAND.includes(c.id)) continue;
  const role = roleOf(c);
  const abil = (c.abilities || []).map((a) => a.key).filter((k) => ABILITY_PASSIVE[k]);
  if (!abil.length) abil.push(pick(DEFAULT_ABILITY, c.id));
  const passive = ABILITY_PASSIVE[abil[0]], passive2 = abil[1] ? ABILITY_PASSIVE[abil[1]] : null;
  // répartition : (rapport de la carte / moyenne du rôle)^0,3, bornée à ±8 %, produit 1
  const sh = Math.min(1.08, Math.max(0.92, (ratio(c) / roleMean[role]) ** 0.3));
  const stat = { atk: +sh.toFixed(2) };
  // frappe
  const [noun, g] = STRIKE_NOUN.find(([re]) => re.test(c.category))[1];
  const adj = FAC_ADJ[c.faction][g === 'f' ? 1 : 0];
  const strikeName = noun.includes(' ') ? noun : `${noun} ${adj}`; // un nom composé garde sa forme (« Lame de fond »)
  // compétence
  const tpls = MOVE_TEMPLATES[role];
  const tpl = tpls[hash(c.id + abil.join()) % tpls.length];
  let ops = tpl.ops.map((o) => ({ ...o }));
  const rare = ['HR', 'M', 'S'].includes(c.rarity);
  if (rare) {
    const ex = { ...RARE_EXTRA[abil[1] || abil[0]] };
    // un effet sur la cible n'a de sens que si la compétence vise un ennemi
    const targetsEnemy = ops.some((o) => ['t', 'tn'].includes(o.on));
    if (['t'].includes(ex.on) && !targetsEnemy) { ex.on = ex.op === 'brk' ? 'foes' : ex.op === 'poison' || ex.op === 'slow' ? 'foes' : 'self'; if (ex.op === 'mark') Object.assign(ex, { op: 'fervor', on: 'self', n: 1 }); }
    // un ralentissement de la cible n'ajoute rien si elle est déjà gelée
    if (ex.op === 'slow' && ex.on === 't' && ops.some((o) => o.op === 'freeze')) Object.assign(ex, { op: 'brk', n: 1 });
    if (!ops.some((o) => o.op === ex.op && o.on === ex.on)) ops.push(ex);
  }
  const budget = BUDGET[`${tpl.ap}/${tpl.cd}`] + RARITY_BONUS[c.rarity];
  ops = fit(ops, budget);
  // effets fixes (ralentir, provoquer…) sous le budget : un effet réglable de son rôle complète
  if (opsValue(ops) < budget * 0.85) {
    const onEnemy = ops.some((o) => ['t', 'tn'].includes(o.on)), allFoes = ops.some((o) => o.on === 'foes');
    const fill = onEnemy ? { op: 'hit', on: 't', m: 0.5 } : allFoes ? { op: 'brk', on: 'foes', n: 1 }
      : role === 'protecteur' ? { op: 'heal', on: 'self', p: 0.1 } : role === 'soin' ? { op: 'heal', on: 'low', p: 0.1 } : { op: 'fervor', on: 'self', n: 1 };
    // effet déjà présent et plafonné, compétence nettement trop faible : un renfort d'équipe complète à la place (lot 500)
    const alt = ops.some((o) => o.op === fill.op && o.on === fill.on) && opsValue(ops) < budget * 0.7 ? { op: 'boost', on: 'team', n: 1 } : fill;
    if (!ops.some((o) => o.op === alt.op && o.on === alt.on)) ops = fit([...ops, alt], budget);
  }
  const [mn, mg] = pick(tpl.names, c.id, 'mv');
  const mname = ['M', 'S'].includes(c.rarity) ? `${mn} ${ofName(c.name)}` : mn.includes(' ') ? mn : `${mn} ${FAC_ADJ[c.faction][mg === 'f' ? 1 : 0]}`;
  const move = { name: mname, icon: tpl.icon, ap: tpl.ap, cd: tpl.cd, ops, ...(tpl.reach ? { reach: true } : {}) };
  // entrée compacte (kits.js la complète : textes de la fiche, effets de la frappe)
  out[c.id] = { s: `${ROLE_NOUN[role]} ${ABILITY_ADJ[abil[0]]}`, r: role, f: c.faction, a: stat.atk, k: strikeName, p: passive, ...(passive2 && passive2 !== passive ? { p2: passive2 } : {}), m: move };
}

// Vérification : chaque effet existe et chaque compétence se décrit
for (const [id, k] of Object.entries(out)) {
  k.m.ops.forEach((o) => { if (!OPS[o.op]) throw new Error(`${id} : effet inconnu ${o.op}`); });
  describeOps(k.m.ops);
}
const body = Object.entries(out).map(([id, k]) => `  ${JSON.stringify(id)}: ${JSON.stringify(k)},`).join('\n');
fs.writeFileSync(path.join(ROOT, 'js/core/kits-data.js'), `// Généré par tools/gen-kits.mjs : ne pas modifier à la main.\n// Identité de combat de chaque créature (sauf les 12 écrites à la main dans kits.js).\nexport const GEN_KITS = {\n${body}\n};\n`);
console.log(`${Object.keys(out).length} identités générées → js/core/kits-data.js`);
