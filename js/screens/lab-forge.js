// v596-v598 : ateliers du Labo des combats (Mode Créateur) : attaques des ennemis, défenses (nouveaux gestes de la barre),
// pouvoirs de tes créatures et pouvoir d'équipe, inventés à partir de briques. Tout reste sur l'appareil (localStorage) et ne
// sert que dans les combats d'essai du Labo ; le rapport décrit chaque invention pour que Claude l'écrive dans le vrai jeu.
import { esc } from '../ui/dom.js';
import { CUSTOM_QTE, QTE_BRICKS, KIND_RHYTHM } from '../ui/def-bar.js';

const RK = { atk: 'abyssal.labAtk', qte: 'abyssal.labQte', pow: 'abyssal.labPow' };
const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? d; } catch (e) { return d; } };
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* rien */ } };
export const readAtk = () => rd(RK.atk, []);
export const readQte = () => rd(RK.qte, []);
export const readPow = () => ({ skills: [], ult: null, ...rd(RK.pow, {}) });
export const saveAtk = (v) => { wr(RK.atk, v); syncLab(); };
export const saveQte = (v) => { wr(RK.qte, v); syncLab(); };
export const savePow = (v) => wr(RK.pow, v);

/* rend les inventions jouables : défenses → chiffres 0 à 9 d'une séquence ; séquence de chaque attaque inventée */
export function syncLab() {
  for (const k of Object.keys(CUSTOM_QTE)) delete CUSTOM_QTE[k];
  readQte().forEach((q, i) => { if (i < 10) CUSTOM_QTE[String(i)] = q; });
  for (const k of Object.keys(KIND_RHYTHM)) if (/^lab\d/.test(k)) delete KIND_RHYTHM[k];
  readAtk().forEach((a, i) => { KIND_RHYTHM[`lab${i}`] = cleanSeq(a.seq) || (a.target === 'all' ? 'lx' : 'n'); });
}
export const cleanSeq = (q) => String(q || '').replace(/[^nflxmhH0-9]/g, '').slice(0, 6);

const ROLES = [['all', 'Toutes'], ['protecteur', 'Protecteur'], ['degats', 'Attaquant'], ['soin', 'Soigneur'], ['poison', 'Empoisonneur'], ['controle', 'Entraveur'], ['soutien', 'Soutien'], ['zone', 'Fléau']];
/* [clé, nom, type, options] ; type : text, seq, sel (liste [valeur, nom]), num ([min, max, pas]), bool */
export const FIELDS = {
  atk: [
    ['name', 'Nom', 'text'], ['on', 'Active dans les combats d’essai', 'bool'],
    ['who', 'Qui l’utilise', 'sel', [['any', 'Tous les ennemis'], ['normal', 'Ennemis ordinaires'], ['elite', 'Élites'], ['boss', 'Gardiens']]],
    ['chance', 'Fréquence (part des tours)', 'num', [0, 1, 0.05]],
    ['target', 'Cible', 'sel', [['one', 'Une créature (comme d’habitude)'], ['weakest', 'La plus affaiblie'], ['strongest', 'La plus forte'], ['all', 'Toute l’équipe']]],
    ['mult', 'Force de chaque coup (× attaque)', 'num', [0.1, 4, 0.05]], ['hits', 'Nombre de coups', 'num', [1, 5, 1]],
    ['poison', 'Poison posé', 'num', [0, 8, 1]], ['freeze', 'Gèle la cible', 'bool'], ['strip', 'Retire boucliers et bonus', 'bool'],
    ['fervor', 'Retire de la Ferveur', 'num', [0, 3, 1]], ['drain', 'Vol de vie (part des dégâts)', 'num', [0, 1, 0.05]],
    ['prep', 'Se prépare un tour avant (annoncée)', 'bool'], ['big', 'Grosse attaque (danger, protège moins)', 'bool'],
    ['seq', 'Séquence de défense', 'seq'],
  ],
  qte: [
    ['name', 'Nom', 'text'], ['base', 'Geste', 'sel', [['tap', 'Toucher'], ['hold', 'Maintenir puis relâcher']]],
    ['speed', 'Durée du passage (× normale)', 'num', [0.4, 2.5, 0.05]], ['zone', 'Taille de la zone d’or (×)', 'num', [0.3, 2.5, 0.05]],
    ['parry', 'Taille du trait blanc (part de la zone)', 'num', [0.05, 0.8, 0.01]], ['accel', 'Accélération (1 = régulière)', 'num', [1, 3, 0.05]],
    ['feint', 'Feinte (s’arrête puis fonce)', 'bool'], ['move', 'Zone mobile (amplitude)', 'num', [0, 0.3, 0.01]],
    ['hide', 'Zone cachée (visible seulement à cette distance ; 0 = toujours)', 'num', [0, 0.5, 0.01]],
    ['reverse', 'Le curseur part de la droite', 'bool'], ['bounce', 'Le curseur rebondit (seul le retour compte)', 'bool'],
  ],
  skill: [
    ['name', 'Nom', 'text'], ['on', 'Active dans les combats d’essai', 'bool'], ['who', 'Créatures qui l’ont', 'sel', ROLES],
    ['ap', 'Coût en PA', 'num', [0, 3, 1]], ['fervor', 'Coût en Ferveur', 'num', [0, 5, 1]], ['once', 'Une fois par combat', 'bool'],
    ['target', 'Cible', 'sel', [['enemy', 'Un ennemi'], ['allEnemies', 'Tous les ennemis'], ['ally', 'Une alliée'], ['allAllies', 'Toute l’équipe'], ['self', 'Elle-même']]],
    ['mult', 'Dégâts de chaque coup (× attaque)', 'num', [0, 4, 0.05]], ['hits', 'Nombre de coups', 'num', [1, 5, 1]], ['brk', 'Points de Brisure par coup', 'num', [0, 3, 1]],
    ['poison', 'Poison posé', 'num', [0, 8, 1]], ['freeze', 'Gèle', 'bool'], ['mark', 'Marque', 'bool'],
    ['heal', 'Soin (part des PV max)', 'num', [0, 1, 0.05]], ['shield', 'Bouclier', 'bool'], ['boost', 'Bonus d’attaque', 'num', [0, 5, 1]],
    ['cleanse', 'Purifie (poison, gel)', 'bool'], ['paGain', 'Donne des PA', 'num', [0, 2, 1]], ['fervorGain', 'Donne de la Ferveur', 'num', [0, 3, 1]],
  ],
  ult: [
    ['name', 'Nom', 'text'], ['on', 'Remplace le pouvoir d’équipe dans les combats d’essai', 'bool'],
    ['target', 'Cible', 'sel', [['enemy', 'Tous les ennemis'], ['ally', 'Toute l’équipe']]],
    ['mult', 'Dégâts (× attaque de la 1re créature)', 'num', [0, 6, 0.1]], ['hits', 'Nombre de coups', 'num', [1, 5, 1]], ['brk', 'Points de Brisure', 'num', [0, 3, 1]],
    ['poison', 'Poison posé', 'num', [0, 8, 1]], ['freeze', 'Gèle', 'bool'], ['mark', 'Marque', 'bool'],
    ['heal', 'Soin (part des PV max)', 'num', [0, 1, 0.05]], ['shield', 'Bouclier', 'bool'], ['boost', 'Bonus d’attaque', 'num', [0, 5, 1]],
    ['cleanse', 'Purifie', 'bool'], ['paGain', 'Donne des PA', 'num', [0, 2, 1]], ['fervorGain', 'Donne de la Ferveur', 'num', [0, 3, 1]],
  ],
};
export const NEW = {
  atk: () => ({ name: 'Nouvelle attaque', on: true, who: 'any', chance: 0.3, target: 'one', mult: 1.2, hits: 1, poison: 0, freeze: false, strip: false, fervor: 0, drain: 0, prep: false, big: false, seq: 'n' }),
  qte: () => ({ ...QTE_BRICKS, name: 'Nouvelle défense' }),
  skill: () => ({ name: 'Nouveau pouvoir', on: true, who: 'all', ap: 1, fervor: 0, once: false, target: 'enemy', mult: 1.5, hits: 1, brk: 1, poison: 0, freeze: false, mark: false, heal: 0, shield: false, boost: 0, cleanse: false, paGain: 0, fervorGain: 0 }),
  ult: () => ({ name: 'Pouvoir d’équipe inventé', on: true, target: 'enemy', mult: 2, hits: 1, brk: 2, poison: 0, freeze: false, mark: false, heal: 0, shield: false, boost: 0, cleanse: false, paGain: 0, fervorGain: 0 }),
};
const nv = (v) => String(+(+v).toFixed(2)).replace('.', ',');

/* formulaire d'une invention ; data-f = « type:index:clé » */
export function formHTML(type, idx, obj) {
  return FIELDS[type].map(([k, label, kind, o]) => {
    const id = `${type}:${idx}:${k}`, v = obj[k];
    if (kind === 'bool') return `<label class="lf-b"><input type="checkbox" data-f="${id}" ${v ? 'checked' : ''}> ${esc(label)}</label>`;
    if (kind === 'sel') return `<label class="lf-r"><span>${esc(label)}</span><select class="input plain" data-f="${id}">${o.map(([x, l]) => `<option value="${x}" ${x === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
    if (kind === 'text') return `<label class="lf-r"><span>${esc(label)}</span><input class="input plain" data-f="${id}" value="${esc(v || '')}" maxlength="40"></label>`;
    if (kind === 'seq') return `<label class="lf-r"><span>${esc(label)}</span><input class="input plain" data-f="${id}" value="${esc(v || '')}" maxlength="6" placeholder="ex. nfh ou n0"><small class="muted">Lettres n f l x m h H comme dans le Labo des défenses ; un chiffre 0 à 9 = ta défense inventée de ce numéro.</small></label>`;
    return `<div class="lf-r lf-n"><span>${esc(label)} <b>${nv(v ?? 0)}</b></span><input type="range" min="${o[0]}" max="${o[1]}" step="${o[2]}" value="${v ?? 0}" data-f="${id}"></div>`;
  }).join('');
}
/* lit un champ modifié ; renvoie [type, index, clé, valeur] */
export function fieldValue(el) {
  const [type, idx, k] = el.dataset.f.split(':');
  const f = FIELDS[type].find((x) => x[0] === k);
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (f[2] === 'num') v = +(+v).toFixed(2);
  if (f[2] === 'seq') v = cleanSeq(v);
  return [type, +idx, k, v];
}
/* description en français d'une invention, pour le rapport */
export function describe(type, o) {
  const pick = (k) => { const f = FIELDS[type].find((x) => x[0] === k); if (!f || o[k] == null || o[k] === '' || o[k] === false || (f[2] === 'num' && !+o[k] && k !== 'chance')) return null;
    const v = f[2] === 'sel' ? f[3].find((x) => x[0] === o[k])?.[1] : f[2] === 'bool' ? 'oui' : f[2] === 'num' ? nv(o[k]) : o[k]; return `${f[1]} : ${v}`; };
  return FIELDS[type].filter(([k]) => k !== 'name' && k !== 'on').map(([k]) => pick(k)).filter(Boolean).join(' · ');
}
