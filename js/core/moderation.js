// Modération des pseudos (classements publics) : filtre de base, joueurs masqués sur cet appareil.
// Les deux listes de mots sont recopiées à l'identique dans supabase/06-signalements.sql
// (un test vérifie qu'elles restent synchronisées) : le serveur refuse les mêmes pseudos.

// v551 (demande du propriétaire) : insultes dans les six langues du jeu, déguisées de toutes les façons (chiffres à la place
// des lettres, lettres doublées, espaces / tirets / _ entre les lettres), et noms réservés (le jeu, le compte du créateur,
// l'équipe). Les trois listes sont recopiées à l'identique dans supabase/06-signalements.sql (un test le vérifie, un autre
// compare le jeu et le serveur sur des centaines de pseudos).

// Mots refusés n'importe où dans le pseudo, même collés à d'autres lettres (assez longs pour ne pas toucher des mots innocents).
export const BANNED_PARTS = [
  'nazi', 'hitler', 'siegheil', 'heilhitler', 'whitepower', 'pedophil', 'pedoph', 'salope', 'connard', 'connasse',
  'encule', 'batard', 'putain', 'niquetamere', 'tamere', 'nigger', 'nigga', 'faggot',
  'fuck', 'bitch', 'pussy', 'penis', 'vagin', 'porno', 'pornhub', 'tapette', 'gouine', 'bougnoul',
  'youpin', 'bamboula', 'chinetoque', 'merde', 'couille', 'branleur', 'pouffiasse',
  'trisomique', 'terroriste', 'jihad', 'djihad',
  /* français */ 'petasse', 'enfoire', 'salaud', 'pedophile', 'grossepute', 'filsdepute', 'trouduc', 'suceuse', 'enculer', 'negresse', 'chintok',
  /* anglais */ 'asshole', 'bastard', 'motherf', 'cocksuck', 'dickhead', 'shithead', 'wanker', 'killyourself', 'blowjob', 'dildo', 'fvck', 'phuck', 'biatch',
  /* espagnol */ 'hijodeputa', 'cabron', 'gilipollas', 'pendejo', 'maricon', 'mierda', 'joder', 'culero', 'chingad', 'malparid',
  /* allemand */ 'scheisse', 'arschloch', 'hurensohn', 'fotze', 'wichser', 'schlampe', 'missgeburt', 'schwuchtel', 'ficken', 'fickdich',
  /* italien */ 'vaffanculo', 'stronzo', 'stronza', 'cazzo', 'puttana', 'frocio', 'minchia', 'coglion', 'porcodio', 'porcamadonna', 'bastardo',
  /* portugais */ 'caralho', 'fodase', 'buceta', 'arrombad', 'filhodaputa', 'cuzao', 'vagabunda',
];

// Mots courts refusés seulement quand ils forment un mot entier (« con » oui, « Faucon » non).
export const BANNED_WORDS = [
  'con', 'cons', 'conne', 'pd', 'fdp', 'ntm', 'tg', 'pute', 'putes', 'bite', 'cul', 'anus', 'sexe', 'sex',
  'viol', 'violeur', 'nique', 'niquer', 'negre', 'negro', 'cunt', 'cock', 'slut', 'whore',
  'kkk', 'pedale', 'zizi', 'shit', 'admin', 'moderateur', 'modo',
  /* v551 */ 'pede', 'pedo', 'dick', 'fag', 'kys', 'puta', 'putas', 'zorra', 'polla', 'verga', 'hure', 'neger', 'fick', 'figa',
  'twat', 'retard', 'rapist', 'viado', 'otario', 'porra', 'foder', 'puto', 'fck', 'fuk', 'staff', 'support', 'moderator', 'mod', 'officiel', 'official',
];

// Noms réservés : refusés n'importe où dans le pseudo, même déguisés (« Abyssal », « Le Gardien », l'équipe du jeu).
export const RESERVED = ['abysal', 'abisal', 'abyzal', 'abizal', 'abysai', 'abisai', 'legardien', 'leguardien', 'createur', 'creator', 'developpeur', 'developer'];

// Chiffres et signes qui remplacent des lettres. Le « 1 » est essayé comme i puis comme l.
const LEET = { 0: 'o', 1: 'i', 2: 'z', 3: 'e', 4: 'a', 5: 's', 6: 'g', 7: 't', 8: 'b', 9: 'g' };

// Minuscules, sans accents, chiffres « déguisés » remis en lettres.
export function normalizePseudo(s, one = 'i') {
  return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss').replace(/[0-9]/g, (d) => (d === '1' ? one : LEET[d]));
}
const collapse = (t) => t.replace(/(.)\1+/g, '$1'); /* « fuuuck », « connnard » */
// mots du pseudo ; des lettres seules séparées (« p u t e », « B-1-T-C-H ») forment un mot
function wordsOf(n) {
  const out = [];
  let run = '';
  for (const w of n.split(/[^a-z]+/).filter(Boolean)) {
    if (w.length === 1) { run += w; continue; }
    if (run) { out.push(run); run = ''; }
    out.push(w);
  }
  if (run) out.push(run);
  return out;
}
const PARTS_C = BANNED_PARTS.map(collapse), RES_C = RESERVED.map(collapse);
/* « kkk » ne se ramène pas à « k » (sinon « Agent K » serait refusé) */
const WORDS_C = BANNED_WORDS.map((w) => (collapse(w).length > 1 ? collapse(w) : w));
const badWord = (w) => BANNED_WORDS.includes(w) || WORDS_C.includes(collapse(w));

// null si le pseudo est accepté, sinon le message à afficher.
export function pseudoProblem(pseudo) {
  const p = String(pseudo ?? '').trim();
  if (p.length < 3 || p.length > 16) return 'Pseudo invalide : 3 à 16 caractères.';
  /* v551 : lettres de l'alphabet latin seulement (les lettres d'autres alphabets peuvent imiter les nôtres) */
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿŒœÆæ0-9_ -]+$/.test(p)) return 'Pseudo invalide : lettres, chiffres, espaces, - ou _ seulement.';
  if (p.replace(/[^0-9]/g, '').includes('1488')) return 'Ce pseudo n’est pas accepté. Choisis-en un autre.';
  for (const one of ['i', 'l']) {
    const n = normalizePseudo(p, one), sq = collapse(n.replace(/[^a-z]/g, ''));
    if (RES_C.some((w) => sq.includes(w))) return 'Ce nom est réservé. Choisis-en un autre.';
    if (PARTS_C.some((w) => sq.includes(w)) || wordsOf(n).some(badWord)) return 'Ce pseudo n’est pas accepté. Choisis-en un autre.';
  }
  return null;
}

// Pseudo attribué par le serveur quand un pseudo a été signalé par plusieurs joueurs.
export const isMaskedPseudo = (p) => /^Joueur-[0-9a-f]{8}$/.test(String(p || ''));

// ——— Joueurs masqués (sur cet appareil seulement) ————————————————————————
const BLOCK_KEY = 'abyssal.blocked';
function readBlocked() {
  try { const v = JSON.parse(localStorage.getItem(BLOCK_KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch (e) { return []; }
}
function writeBlocked(list) { try { localStorage.setItem(BLOCK_KEY, JSON.stringify(list)); } catch (e) { /* rien */ } }
export const blockedIds = () => readBlocked();
export const isBlocked = (id) => !!id && readBlocked().includes(id);
export function setBlocked(id, on) {
  if (!id) return;
  const list = readBlocked().filter((x) => x !== id);
  if (on) list.push(id);
  writeBlocked(list.slice(-500));
}
export function clearBlocked() { writeBlocked([]); }
