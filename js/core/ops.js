// v539 : le serveur de partie. La progression d'un compte est tenue par le serveur (supabase/functions/partie) :
// le téléphone joue tout de suite (même moteur), note chaque action (une « opération ») et l'envoie ; le serveur la rejoue
// avec le même code et c'est son résultat qui compte. Ce fichier dit, pour chaque méthode du jeu, comment elle est traitée.
//
//   sync  : rejouée par le serveur (le téléphone l'applique tout de suite, le serveur la refait ensuite)
//   first : faite d'abord par le serveur, le téléphone attend la réponse (tirages au hasard, récompenses en ligne)
//   lazy  : lecture qui change parfois la partie (missions du jour, cartes de départ) : notée seulement quand elle la change
//   local : rien à envoyer (réservé)
//   dev   : outils du Mode Créateur : acceptés seulement pour un compte au badge « Créateur »
// v540 (étape 2) : les combats et les mini-jeux sont rejoués coup par coup par le serveur, depuis le même départ (même graine,
// `game.seed`) : plus aucun état de partie n'est envoyé par le téléphone.
export const OPS = {
  // collection, boutique, Fournaise
  markSeen: { kind: 'sync' }, markAllSeen: { kind: 'sync' }, decipher: { kind: 'sync' }, setShownVariant: { kind: 'sync' },
  sublime: { kind: 'sync' }, burn: { kind: 'sync' }, burnSpares: { kind: 'sync' }, upgrade: { kind: 'sync' }, buyAshFrame: { kind: 'sync' },
  openChest: { kind: 'sync' }, openAllChests: { kind: 'sync' },
  openBooster: { kind: 'first' },
  // jour, missions, semaine
  claimDaily: { kind: 'sync' }, claimMission: { kind: 'sync' }, claimWeekChest: { kind: 'sync' }, missions: { kind: 'sync', lazy: (s) => s.missions?.day },
  team: { kind: 'sync', lazy: (s) => Object.keys(s.collection || {}).length }, // lecture qui peut prêter les cartes de départ
  // équipe, profil, personnalisation
  setTeam: { kind: 'sync' }, saveTeamPreset: { kind: 'sync' }, deleteTeamPreset: { kind: 'sync' }, setForm: { kind: 'sync' }, toggleFav: { kind: 'sync' },
  claimChallenge: { kind: 'sync' }, setTitle: { kind: 'sync' }, setFrame: { kind: 'sync' }, setDress: { kind: 'sync' }, setBack: { kind: 'sync' }, setPlate: { kind: 'sync' },
  setName: { kind: 'sync' }, setAvatar: { kind: 'sync' }, toggleShowcase: { kind: 'sync' }, reset: { kind: 'sync' },
  // Descente
  chooseOmen: { kind: 'sync' }, startRun: { kind: 'sync' }, startBattle: { kind: 'sync' }, choosePact: { kind: 'sync' }, chooseTalent: { kind: 'sync' },
  chooseReward: { kind: 'sync' }, cancelAltar: { kind: 'sync' }, chooseBlessing: { kind: 'sync' }, swapRunTeam: { kind: 'sync' }, nextFloor: { kind: 'sync' },
  cancelRun: { kind: 'sync' }, abandonRun: { kind: 'sync' },
  finishBattle: { kind: 'sync' },
  // coups d'un combat (Descente ou Épreuve) : rejoués un par un
  duelAct: { kind: 'sync' }, duelUlt: { kind: 'sync' }, duelPass: { kind: 'sync' }, duelNext: { kind: 'sync' }, duelEnemy: { kind: 'sync' }, duelEndEnemy: { kind: 'sync' },
  // Épreuves
  startTrial: { kind: 'sync' }, finishTrial: { kind: 'sync' }, abandonTrial: { kind: 'sync' },
  // mini-jeux contre l'Abysse : chaque coup (le tien et celui de l'adversaire) est rejoué
  setSceauxHand: { kind: 'sync' }, sceauxStart: { kind: 'sync' }, sceauxFinish: { kind: 'sync' }, sceauxTrophy: { kind: 'sync' }, sceauxQuit: { kind: 'sync' },
  pacteStart: { kind: 'sync' }, pacteFinish: { kind: 'sync' }, pacteQuit: { kind: 'sync' },
  cryptesStart: { kind: 'sync' }, cryptesFinish: { kind: 'sync' }, cryptesQuit: { kind: 'sync' }, cryptesResume: { kind: 'sync' },
  encheresStart: { kind: 'sync' }, encheresFinish: { kind: 'sync' }, encheresQuit: { kind: 'sync' }, gameForfeit: { kind: 'sync' },
  sceauxPlay: { kind: 'sync' }, sceauxAi: { kind: 'sync' }, pacteDraw: { kind: 'sync' }, pacteStop: { kind: 'sync' }, pacteDouble: { kind: 'sync' }, pacteAi: { kind: 'sync' },
  cryptesFlip: { kind: 'sync' }, cryptesPower: { kind: 'sync' }, cryptesAi: { kind: 'sync' }, encheresBid: { kind: 'sync' },
  // Codex et Échoppe (obsidiennes)
  codex: { kind: 'sync', lazy: (s) => `${s.codex?.season}:${s.codex?.live ? 1 : 0}` }, /* v550 : changement de saison (et récompenses oubliées données) */
  codexClaim: { kind: 'sync' }, codexClaimAll: { kind: 'sync' }, catalogBuy: { kind: 'sync' }, codexUnlock: { kind: 'sync' },
  // en ligne : le serveur vérifie lui-même le résultat (Pari des Boosters, parties en ligne, Tirage des Ombres)
  versusCreate: { kind: 'first', net: true }, versusAccept: { kind: 'first', net: true }, versusClaim: { kind: 'first', net: true },
  mpClaim: { kind: 'first', net: true }, shadowPay: { kind: 'first', net: true }, shadowClaim: { kind: 'first', net: true },
  // Mode Créateur
  shopBuy: { kind: 'dev' }, devGrant: { kind: 'dev' }, devGive: { kind: 'dev' }, devAllVariants: { kind: 'dev' }, devDuplicates: { kind: 'dev' },
  devChests: { kind: 'dev' }, devResetCampaign: { kind: 'dev' }, devFreePacks: { kind: 'dev' }, devMissions: { kind: 'dev' }, devFloor: { kind: 'dev' },
  devBoss: { kind: 'dev' }, devUnlockAll: { kind: 'dev' }, devObs: { kind: 'dev' }, devCodexXp: { kind: 'dev' }, devCodexPrem: { kind: 'dev' },
  devCodexReset: { kind: 'dev' }, devSnapshot: { kind: 'dev' }, autoResolve: { kind: 'dev' }, autoTrial: { kind: 'dev' },
};

// Parties en cours (combats, mini-jeux) : rejouées par le serveur ; leur empreinte entre dans `digest`
export const SESS = ['descent.run.battle', 'trials.battle', 'sceaux.cur', 'pacte.cur', 'cryptes.cur', 'encheres.cur'];

// Réglages et petites marques de l'interface : libres (ils ne rapportent rien). Les outils du Mode Créateur seulement au créateur.
export const FREE = ['settings', 'tips', 'seenIntro', 'giftShown', 'notifAsked', 'storySeen', 'lore', 'armyNews', 'shadow.asked'];
export const FREE_DEV = ['devForce', 'devGames', 'devCodex'];

export const getPath = (o, p) => p.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
export function setPath(o, p, v) {
  const ks = p.split('.'), last = ks.pop();
  let x = o;
  for (const k of ks) { if (x[k] == null || typeof x[k] !== 'object') return false; x = x[k]; }
  if (v === undefined) delete x[last]; else x[last] = v;
  return true;
}
export const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

// Empreinte de ce qui compte (monnaies, collection, progression) : si celle du téléphone diffère de celle du serveur,
// le téléphone reprend la partie du serveur. Les dates et les marques de l'interface n'y entrent pas.
// empreinte d'une partie en cours : graine, tour, fin, points de vie ou scores
function sessPrint(x) {
  if (!x || typeof x !== 'object') return '-';
  if (x.units) return `${x.seed}:${x.round}:${x.turn}:${x.over || ''}:${Object.values(x.units).reduce((a, u) => a + (u.hp || 0), 0)}`;
  return `${x.rs ?? ''}:${x.over || ''}:${x.turn || ''}:${JSON.stringify(x.scores || x.final || '')}`;
}
export function digest(s) {
  const col = Object.keys(s.collection || {}).sort().map((id) => { const e = s.collection[id] || {}; return `${id}:${e.lv || 1}:${Object.entries(e.v || {}).filter(([, n]) => n > 0).map(([k, n]) => `${k}${n}`).sort().join('')}`; }).join(',');
  const parts = [s.shards, s.ash, s.obs || 0, s.xp, JSON.stringify(s.tickets || {}), JSON.stringify(s.chests || {}), col,
    s.descent?.best || 0, s.descent?.run ? `${s.descent.run.floor}:${s.descent.run.phase}:${s.descent.run.shards}` : '-',
    (s.titles || []).length, (s.frames || []).length, Object.keys(s.achievements || {}).length, (s.missions?.list || []).map((x) => `${x.p}${x.claimed ? 'c' : ''}`).join(''),
    s.seedBase ?? '-', s.seedN || 0, ...SESS.map((p) => sessPrint(getPath(s, p)))];
  let h = 2166136261;
  for (const ch of parts.join('|')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h.toString(36);
}
