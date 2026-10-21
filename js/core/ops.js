// v539 : le serveur de partie. La progression d'un compte est tenue par le serveur (supabase/functions/partie) :
// le téléphone joue tout de suite (même moteur), note chaque action (une « opération ») et l'envoie ; le serveur la rejoue
// avec le même code et c'est son résultat qui compte. Ce fichier dit, pour chaque méthode du jeu, comment elle est traitée.
//
//   sync  : rejouée par le serveur (le téléphone l'applique tout de suite, le serveur la refait ensuite)
//   first : faite d'abord par le serveur, le téléphone attend la réponse (tirages au hasard, récompenses en ligne)
//   lazy  : lecture qui change parfois la partie (missions du jour, cartes de départ) : notée seulement quand elle la change
//   local : coups d'une partie en cours (combat, mini-jeu) : jamais envoyés, seul l'état de la partie compte (étape 2 : rejoués)
//   dev   : outils du Mode Créateur : acceptés seulement pour un compte au badge « Créateur »
// sess : parties en cours (combat, mini-jeu) dont l'état est joint à l'opération, tel que le téléphone l'avait juste avant.
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
  claimChallenge: { kind: 'sync' }, setTitle: { kind: 'sync' }, setFrame: { kind: 'sync' }, setDress: { kind: 'sync' }, setBack: { kind: 'sync' },
  setName: { kind: 'sync' }, setAvatar: { kind: 'sync' }, toggleShowcase: { kind: 'sync' }, reset: { kind: 'sync' },
  // Descente
  chooseOmen: { kind: 'sync' }, startRun: { kind: 'sync' }, startBattle: { kind: 'sync' }, choosePact: { kind: 'sync' }, chooseTalent: { kind: 'sync' },
  chooseReward: { kind: 'sync' }, cancelAltar: { kind: 'sync' }, chooseBlessing: { kind: 'sync' }, swapRunTeam: { kind: 'sync' }, nextFloor: { kind: 'sync' },
  cancelRun: { kind: 'sync' }, abandonRun: { kind: 'sync' },
  finishBattle: { kind: 'sync', sess: ['descent.run.battle'] },
  // Épreuves
  startTrial: { kind: 'sync' }, finishTrial: { kind: 'sync', sess: ['trials.battle'] }, abandonTrial: { kind: 'sync', sess: ['trials.battle'] },
  // mini-jeux contre l'Abysse : départ et fin rejoués, les coups restent sur le téléphone (étape 2)
  setSceauxHand: { kind: 'sync' }, sceauxStart: { kind: 'sync' }, sceauxFinish: { kind: 'sync', sess: ['sceaux.cur'] }, sceauxTrophy: { kind: 'sync', sess: ['sceaux.cur'] }, sceauxQuit: { kind: 'sync' },
  pacteStart: { kind: 'sync' }, pacteFinish: { kind: 'sync', sess: ['pacte.cur'] }, pacteQuit: { kind: 'sync' },
  cryptesStart: { kind: 'sync' }, cryptesFinish: { kind: 'sync', sess: ['cryptes.cur'] }, cryptesQuit: { kind: 'sync' },
  encheresStart: { kind: 'sync' }, encheresFinish: { kind: 'sync', sess: ['encheres.cur'] }, encheresQuit: { kind: 'sync' },
  sceauxPlay: { kind: 'local' }, sceauxAi: { kind: 'local' }, pacteDraw: { kind: 'local' }, pacteStop: { kind: 'local' }, pacteAi: { kind: 'local' },
  cryptesFlip: { kind: 'local' }, cryptesPower: { kind: 'local' }, cryptesAi: { kind: 'local' }, encheresBid: { kind: 'local' },
  // Codex et Échoppe (obsidiennes)
  codexClaim: { kind: 'sync' }, codexClaimAll: { kind: 'sync' }, catalogBuy: { kind: 'sync' }, codexUnlock: { kind: 'sync' },
  // en ligne : le serveur vérifie lui-même le résultat (Pari des Boosters, parties en ligne, Tirage des Ombres)
  versusCreate: { kind: 'first', net: true }, versusAccept: { kind: 'first', net: true }, versusClaim: { kind: 'first', net: true },
  mpClaim: { kind: 'first', net: true }, shadowPay: { kind: 'first', net: true }, shadowClaim: { kind: 'first', net: true },
  // Mode Créateur
  shopBuy: { kind: 'dev' }, devGrant: { kind: 'dev' }, devGive: { kind: 'dev' }, devAllVariants: { kind: 'dev' }, devDuplicates: { kind: 'dev' },
  devChests: { kind: 'dev' }, devResetCampaign: { kind: 'dev' }, devFreePacks: { kind: 'dev' }, devMissions: { kind: 'dev' }, devFloor: { kind: 'dev' },
  devBoss: { kind: 'dev' }, devUnlockAll: { kind: 'dev' }, devObs: { kind: 'dev' }, devCodexXp: { kind: 'dev' }, devCodexPrem: { kind: 'dev' },
  devCodexReset: { kind: 'dev' }, devSnapshot: { kind: 'dev' }, autoResolve: { kind: 'dev', sess: ['descent.run.battle'] }, autoTrial: { kind: 'dev', sess: ['trials.battle'] },
};

// Parties en cours : leur état vient du téléphone (étape 1). Le serveur garde l'identité de la partie (adversaire, salle, défi du jour) :
// une partie truquée ne peut pas se faire passer pour une autre.
export const SESS = ['descent.run.battle', 'trials.battle', 'sceaux.cur', 'pacte.cur', 'cryptes.cur', 'encheres.cur'];
export const SESS_ID = {
  'sceaux.cur': ['rival', 'awake', 'daily', 'dailyDay', 'ruleKey', 'rule'],
  'pacte.cur': ['table', 'daily', 'dailyDay'],
  'cryptes.cur': ['table', 'daily', 'dailyDay'],
  'encheres.cur': ['table', 'daily', 'dailyDay'],
};

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
export function digest(s) {
  const col = Object.keys(s.collection || {}).sort().map((id) => { const e = s.collection[id] || {}; return `${id}:${e.lv || 1}:${Object.entries(e.v || {}).filter(([, n]) => n > 0).map(([k, n]) => `${k}${n}`).sort().join('')}`; }).join(',');
  const parts = [s.shards, s.ash, s.obs || 0, s.xp, JSON.stringify(s.tickets || {}), JSON.stringify(s.chests || {}), col,
    s.descent?.best || 0, s.descent?.run ? `${s.descent.run.floor}:${s.descent.run.phase}:${s.descent.run.shards}` : '-',
    (s.titles || []).length, (s.frames || []).length, Object.keys(s.achievements || {}).length, (s.missions?.list || []).map((x) => `${x.p}${x.claimed ? 'c' : ''}`).join('')];
  let h = 2166136261;
  for (const ch of parts.join('|')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h.toString(36);
}
