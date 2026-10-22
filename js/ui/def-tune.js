// v594 : réglages de la barre de défense (demande du propriétaire : « tester toutes les défenses et faire un réglage en
// direct »). Les valeurs par défaut sont celles du jeu. Le Labo des défenses (Mode Créateur) peut les changer ; ses réglages
// ne s'appliquent aux vrais combats que si l'option « Utiliser mes réglages dans mes vrais combats » est cochée, et seulement
// sur cet appareil (localStorage). Rien de tout ça ne change le moteur ni le serveur : seul le geste du joueur est jugé ici.

export const DEF_DEFAULTS = {
  /* v599 : réglages du propriétaire au Labo des défenses (22 octobre 2026) */
  durNormal: 820, durElite: 800, durBoss: 780,
  multFast: 0.72, multSlow: 1.3, multFeint: 1.45, multBeat: 0.85,
  accelNormal: 1.7, accelElite: 1.3, accelEliteRand: 1.0,
  impactMin: 0.55, impactRand: 0.35,
  dodgeMul: 1, floorNormal: 170, floorElite: 150, floorBoss: 130, dodgeMax: 270, eliteMinus: 50, bossMinus: 100,
  parryRatio: 0.05, parryMinNormal: 30, parryMinElite: 20, parryMinBoss: 17,
  gapFirst: 650, gapFirstRand: 450, gapMin: 140, gapRand: 360, pause: 180,
  moveAmp: 0.1, tolPx: 2, missShare: 0.33,
};

// [clé, nom, explication, min, max, pas, unité]
export const DEF_GROUPS = [
  ['Vitesse du curseur', [
    ['durNormal', 'Passage · ennemi normal', 'Temps pour traverser la barre. Plus long = plus lent, plus facile.', 400, 1600, 10, 'ms'],
    ['durElite', 'Passage · élite', '', 400, 1600, 10, 'ms'],
    ['durBoss', 'Passage · gardien', '', 400, 1600, 10, 'ms'],
    ['multFast', 'Coup rapide (f)', 'Multiplie la durée du passage.', 0.3, 1.2, 0.01, '×'],
    ['multSlow', 'Coup lent (l)', '', 0.8, 2.2, 0.01, '×'],
    ['multFeint', 'Feinte (x, H)', 'Durée totale d’une feinte (arrêt compris).', 1, 2.5, 0.01, '×'],
    ['multBeat', 'En mesure (Horloger)', '', 0.5, 1.2, 0.01, '×'],
    ['accelNormal', 'Accélération · normal', '1 = vitesse régulière ; plus haut = lent au début, très rapide à la fin.', 1, 3, 0.05, ''],
    ['accelElite', 'Accélération · élite et gardien (mini)', 'Tirée au hasard entre ce mini et mini + écart.', 1, 3, 0.05, ''],
    ['accelEliteRand', 'Accélération · écart au hasard', '', 0, 2, 0.05, ''],
  ]],
  ['Zone d’esquive (or)', [
    ['dodgeMul', 'Taille de la zone d’or', 'Multiplie la durée de base de chaque attaque (coup 200 ms, chargé 165, zone 175…).', 0.4, 2, 0.01, '×'],
    ['floorNormal', 'Minimum · normal', 'La zone ne descend jamais sous ce temps.', 40, 400, 5, 'ms'],
    ['floorElite', 'Minimum · élite', '', 40, 400, 5, 'ms'],
    ['floorBoss', 'Minimum · gardien', '', 40, 400, 5, 'ms'],
    ['dodgeMax', 'Maximum', 'La zone ne dépasse jamais ce temps.', 150, 600, 5, 'ms'],
    ['eliteMinus', 'Retrait · élite', 'Temps retiré à la zone contre une élite.', 0, 120, 5, 'ms'],
    ['bossMinus', 'Retrait · gardien', '', 0, 120, 5, 'ms'],
    ['impactMin', 'Position de l’impact (mini)', 'Où finit la zone sur la barre : 0,55 = un peu après le milieu.', 0.3, 0.95, 0.01, ''],
    ['impactRand', 'Position de l’impact · écart au hasard', '0 = toujours au même endroit.', 0, 0.6, 0.01, ''],
    ['moveAmp', 'Zone mobile (m) · amplitude', 'De combien la zone se balance.', 0, 0.3, 0.01, ''],
  ]],
  ['Parade (trait blanc)', [
    ['parryRatio', 'Taille du trait blanc', 'Part de la zone d’or (0,2 = son dernier cinquième).', 0.05, 0.8, 0.01, '×'],
    ['parryMinNormal', 'Minimum · normal', '', 10, 200, 1, 'ms'],
    ['parryMinElite', 'Minimum · élite', '', 10, 200, 1, 'ms'],
    ['parryMinBoss', 'Minimum · gardien', '', 10, 200, 1, 'ms'],
  ]],
  ['Rythme et jugement', [
    ['gapFirst', 'Attente avant le 1er coup', 'Plus un temps au hasard (ligne suivante).', 0, 1500, 10, 'ms'],
    ['gapFirstRand', 'Attente avant le 1er coup · hasard', '', 0, 1500, 10, 'ms'],
    ['gapMin', 'Attente entre deux coups', '', 0, 1500, 10, 'ms'],
    ['gapRand', 'Attente entre deux coups · hasard', '', 0, 1500, 10, 'ms'],
    ['pause', 'Pause après chaque coup', 'Temps où le résultat reste affiché.', 0, 800, 10, 'ms'],
    ['tolPx', 'Tolérance du toucher', 'Marge autour de la zone, en pixels de barre.', 0, 30, 1, 'px'],
    ['missShare', 'Ratés permis pour une esquive', 'Au-delà de cette part de coups ratés, la séquence compte comme « touché » (0,33 = un sur trois).', 0, 1, 0.01, ''],
  ]],
];

const KEY = 'abyssal.defTune', ON = 'abyssal.defTune.on';
export function readTune() {
  try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; }
}
export function saveTune(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* rien */ } }
export const tuneInGame = () => { try { return localStorage.getItem(ON) === '1'; } catch (e) { return false; } };
export const setTuneInGame = (v) => { try { v ? localStorage.setItem(ON, '1') : localStorage.removeItem(ON); } catch (e) { /* rien */ } };
/* réglages complets : ceux du Labo si demandé (lab = true, ou option cochée pour les vrais combats), sinon ceux du jeu */
export function getTune(lab = false) {
  if (!lab && !tuneInGame()) return { ...DEF_DEFAULTS };
  const o = readTune(), t = { ...DEF_DEFAULTS };
  for (const k of Object.keys(DEF_DEFAULTS)) if (typeof o[k] === 'number' && Number.isFinite(o[k])) t[k] = o[k];
  return t;
}
