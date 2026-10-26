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
  claimChallenge: { kind: 'sync' }, setTitle: { kind: 'sync' }, setFrame: { kind: 'sync' }, setDress: { kind: 'sync' }, setBack: { kind: 'sync' }, setPlate: { kind: 'sync' }, setMat: { kind: 'sync' }, setFond: { kind: 'sync' }, setSachet: { kind: 'sync' },
  setName: { kind: 'sync' }, setAvatar: { kind: 'sync' }, toggleShowcase: { kind: 'sync' }, reset: { kind: 'sync' },
  // Descente
  chooseOmen: { kind: 'sync' }, startRun: { kind: 'sync' }, startBattle: { kind: 'sync' }, choosePact: { kind: 'sync' }, chooseTalent: { kind: 'sync' },
  chooseReward: { kind: 'sync' }, cancelAltar: { kind: 'sync' }, chooseBlessing: { kind: 'sync' }, swapRunTeam: { kind: 'sync' }, nextFloor: { kind: 'sync' },
  cancelRun: { kind: 'sync' }, abandonRun: { kind: 'sync' }, reviveFallen: { kind: 'sync' }, buyBraise: { kind: 'sync' }, /* v668 : Braises de vie */
  finishBattle: { kind: 'sync' },
  // coups d'un combat (Descente ou Épreuve) : rejoués un par un
  duelAct: { kind: 'sync' }, duelUlt: { kind: 'sync' }, duelPass: { kind: 'sync' }, duelNext: { kind: 'sync' }, duelEnemy: { kind: 'sync' }, duelEndEnemy: { kind: 'sync' },
  // Épreuves
  startTrial: { kind: 'sync' }, finishTrial: { kind: 'sync' }, abandonTrial: { kind: 'sync' },
  // mini-jeux contre l'Abysse : chaque coup (le tien et celui de l'adversaire) est rejoué
  setSceauxHand: { kind: 'sync' }, sceauxStart: { kind: 'sync' }, sceauxFinish: { kind: 'sync' }, sceauxTrophy: { kind: 'sync' }, sceauxQuit: { kind: 'sync' },
  pacteStart: { kind: 'sync' }, pacteFinish: { kind: 'sync' }, pacteQuit: { kind: 'sync' },
  cryptesStart: { kind: 'sync' }, cryptesFinish: { kind: 'sync' }, cryptesQuit: { kind: 'sync' }, cryptesResume: { kind: 'sync' },
  encheresStart: { kind: 'sync' }, encheresFinish: { kind: 'sync' }, encheresQuit: { kind: 'sync' }, gameForfeit: { kind: 'sync' }, tourneyPlay: { kind: 'sync' },
  sceauxPlay: { kind: 'sync' }, sceauxAi: { kind: 'sync' }, pacteDraw: { kind: 'sync' }, pacteStop: { kind: 'sync' }, pacteDouble: { kind: 'sync' }, pacteAi: { kind: 'sync' },
  cryptesFlip: { kind: 'sync' }, cryptesPower: { kind: 'sync' }, cryptesAi: { kind: 'sync' }, encheresBid: { kind: 'sync' },
  // Codex et Échoppe (obsidiennes)
  codex: { kind: 'sync', lazy: (s) => `${s.codex?.season}:${s.codex?.live ? 1 : 0}` }, /* v550 : changement de saison (et récompenses oubliées données) */
  codexClaim: { kind: 'sync' }, codexClaimAll: { kind: 'sync' }, catalogBuy: { kind: 'sync' }, codexUnlock: { kind: 'dev' }, codexBuyTier: { kind: 'sync' }, /* v680 */
  // v680 : achats payés (App Store) : le serveur les vérifie lui-même auprès de RevenueCat (serveur/iap.mjs)
  iapSync: { kind: 'first', net: true },
  // en ligne : le serveur vérifie lui-même le résultat (Choc des Boosters, parties en ligne, Tirage des Ombres)
  versusCreate: { kind: 'first', net: true }, versusAccept: { kind: 'first', net: true }, versusClaim: { kind: 'first', net: true }, versusPick: { kind: 'first', net: true },
  mpClaim: { kind: 'first', net: true }, shadowPay: { kind: 'first', net: true }, shadowClaim: { kind: 'first', net: true },
  // Mode Créateur
  shopBuy: { kind: 'dev' }, devGrant: { kind: 'dev' }, devGive: { kind: 'dev' }, devAllVariants: { kind: 'dev' }, devDuplicates: { kind: 'dev' },
  devChests: { kind: 'dev' }, devResetCampaign: { kind: 'dev' }, devFreePacks: { kind: 'dev' }, devAbyss: { kind: 'dev' }, devMissions: { kind: 'dev' }, devFloor: { kind: 'dev' },
  devBoss: { kind: 'dev' }, devVeille: { kind: 'dev' }, devUnlockAll: { kind: 'dev' }, devObs: { kind: 'dev' }, devCodexXp: { kind: 'dev' }, devCodexPrem: { kind: 'dev' },
  devCodexReset: { kind: 'dev' }, devSnapshot: { kind: 'dev' }, autoResolve: { kind: 'dev' }, autoTrial: { kind: 'dev' },
};

// Parties en cours (combats, mini-jeux) : rejouées par le serveur ; leur empreinte entre dans `digest`
export const SESS = ['descent.run.battle', 'trials.battle', 'sceaux.cur', 'pacte.cur', 'cryptes.cur', 'encheres.cur'];

// Réglages et petites marques de l'interface : libres (ils ne rapportent rien). Les outils du Mode Créateur seulement au créateur.
export const FREE = ['settings', 'tips', 'seenIntro', 'giftShown', 'notifAsked', 'storySeen', 'lore', 'armyNews', 'shadow.asked', 'shadow.drew'];
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
    s.descent?.best || 0, s.braises || 0, Object.keys(s.fallen || {}).sort().join(','), /* v668 */ s.descent?.run ? `${s.descent.run.floor}:${s.descent.run.phase}:${s.descent.run.shards}` : '-',
    (s.titles || []).length, (s.frames || []).length, (s.backs || []).length, (s.sachets || []).length, (s.plates || []).length, (s.emotes || []).length, (s.mats || []).length, (s.fonds || []).length, (s.finishes || []).length, /* v574 : cosmétiques comptés */ Object.keys(s.achievements || {}).length, (s.missions?.list || []).map((x) => `${x.p}${x.claimed ? 'c' : ''}`).join(''),
    s.codex ? `${s.codex.season}:${s.codex.premium ? 1 : 0}:${s.codex.xp || 0}:${(s.codex.free || []).length}:${(s.codex.prem || []).length}` : '-', (s.purchases || []).length, /* v728 : Codex et achats comptés (un Codex payé n'arrivait jamais sur le téléphone) */
    s.seedBase ?? '-', s.seedN || 0, ...SESS.map((p) => sessPrint(getPath(s, p)))];
  let h = 2166136261;
  for (const ch of parts.join('|')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h.toString(36);
}

/* v754 : forme des arguments que le serveur accepte pour chaque opération. Une app modifiée pouvait envoyer "5" au lieu de 5
   (palier du Codex encaissé à l'infini, carte des Sceaux rejouée sans quitter la main, même carte des Cryptes retournée deux fois).
   i = entier, I = entier ou rien, n = nombre ou rien, s = texte, S = texte ou rien, b = vrai/faux ou rien,
   as = liste de textes, AS = liste de textes ou rien, ai = liste d'entiers, o = objet ou rien (vérifié par la méthode), * = tout.
   Une opération absente de la liste n'est pas vérifiée ici (la méthode s'en charge). Au-delà des arguments décrits : refusé. */
export const ARGS = {
  devAbyss: ['b', 'I'], /* v769 */
  markSeen: ['s'], markAllSeen: [], decipher: ['s'], setShownVariant: ['s', 'S'], sublime: ['s'], burn: ['s', 'S', 'I'], burnSpares: ['AS'], upgrade: ['s'],
  buyAshFrame: ['s'], openChest: ['s'], openAllChests: [], openBooster: ['s', { faction: 'S' }],
  claimDaily: [], claimMission: ['i'], claimWeekChest: [], missions: [], team: [],
  setTeam: ['as'], saveTeamPreset: ['S', 'AS'], deleteTeamPreset: ['i'], setForm: ['s', 'S'], toggleFav: ['s'], claimChallenge: ['s', 's'],
  setTitle: ['S'], setFrame: ['S'], setDress: ['s', 'S'], setBack: ['S'], setPlate: ['S'], setMat: ['S'], setFond: ['S'], setSachet: ['S', 'S'],
  setName: ['S'], setAvatar: ['S'], toggleShowcase: ['s'], reset: [],
  chooseOmen: ['s'], startRun: [{ cursed: 'b', nightmare: '*', start: 'I', veille: 'b' }], startBattle: ['s', { room: 'S', pact: 'S' }], choosePact: ['S'], chooseTalent: ['i'],
  chooseReward: ['s'], cancelAltar: [], chooseBlessing: ['s'], swapRunTeam: ['i', 'i'], nextFloor: [], cancelRun: [], abandonRun: [], reviveFallen: ['s'], buyBraise: [],
  finishBattle: [], duelAct: ['s', 's', 's', 'S', 'n'], duelUlt: ['s'], duelPass: ['s'], duelNext: ['s'], duelEnemy: ['s', 's', 'S'], duelEndEnemy: ['s'],
  startTrial: ['i'], finishTrial: [], abandonTrial: [],
  setSceauxHand: ['as'], sceauxStart: [{ rival: 'S', daily: 'b', awake: 'b' }], sceauxFinish: [], sceauxTrophy: ['s'], sceauxQuit: [],
  pacteStart: [{ table: 'S', daily: 'b' }], pacteFinish: [], pacteQuit: [], cryptesStart: [{ table: 'S', daily: 'b' }], cryptesFinish: [], cryptesQuit: [], cryptesResume: [],
  encheresStart: [{ table: 'S', daily: 'b' }], encheresFinish: [], encheresQuit: [], gameForfeit: ['s'], tourneyPlay: [],
  sceauxPlay: ['i', 'i'], sceauxAi: [], pacteDraw: [], pacteStop: [], pacteDouble: [], pacteAi: [], cryptesFlip: ['i'], cryptesPower: ['ai'], cryptesAi: [], encheresBid: ['i'],
  codex: [], codexClaim: ['s', 'i'], codexClaimAll: [], catalogBuy: ['s'], codexBuyTier: [], shadowPay: ['s'],
};
const isInt = (v) => Number.isInteger(v);
function argOk(t, v) {
  if (t === '*') return true;
  if (t && typeof t === 'object') {
    if (v == null) return true;
    if (typeof v !== 'object' || Array.isArray(v)) return false;
    return Object.keys(v).every((k) => Object.hasOwn(t, k) && argOk(t[k], v[k]));
  }
  if (v == null) return ['I', 'n', 'S', 'b', 'AS', 'o'].includes(t);
  switch (t) {
    case 'i': case 'I': return isInt(v);
    case 'n': return typeof v === 'number' && Number.isFinite(v);
    case 's': case 'S': return typeof v === 'string' && v.length <= 200;
    case 'b': return typeof v === 'boolean';
    case 'as': case 'AS': return Array.isArray(v) && v.length <= 600 && v.every((x) => typeof x === 'string' && x.length <= 200);
    case 'ai': return Array.isArray(v) && v.length <= 40 && v.every(isInt);
    case 'o': return typeof v === 'object' && !Array.isArray(v);
    default: return false;
  }
}
// vrai si les arguments ont la forme attendue (ou si l'opération n'a pas de forme décrite)
export function argsOk(m, args) {
  const spec = ARGS[m];
  if (!spec) return true;
  if (!Array.isArray(args) || args.length > spec.length) return false;
  return spec.every((t, i) => (i < args.length ? argOk(t, args[i]) : !(t === 'i' || t === 's' || t === 'as' || t === 'ai')));
}
