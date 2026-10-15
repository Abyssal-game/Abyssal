// Modération des pseudos (classements publics) : filtre de base, joueurs masqués sur cet appareil.
// Les deux listes de mots sont recopiées à l'identique dans supabase/06-signalements.sql
// (un test vérifie qu'elles restent synchronisées) : le serveur refuse les mêmes pseudos.

// Mots refusés n'importe où dans le pseudo, même collés à d'autres lettres (assez longs pour ne pas
// toucher des mots innocents).
export const BANNED_PARTS = [
  'nazi', 'hitler', 'siegheil', 'whitepower', 'pedophil', 'pedoph', 'salope', 'connard', 'connasse',
  'encule', 'batard', 'putain', 'niquetamere', 'tamere', 'nigger', 'nigga', 'faggot',
  'fuck', 'bitch', 'pussy', 'penis', 'vagin', 'porno', 'pornhub', 'tapette', 'gouine', 'bougnoul',
  'youpin', 'bamboula', 'chinetoque', 'merde', 'couille', 'branleur', 'pouffiasse',
  'trisomique', 'terroriste', 'jihad', 'djihad',
];

// Mots courts refusés seulement quand ils forment un mot entier (« con » oui, « Faucon » non).
export const BANNED_WORDS = [
  'con', 'cons', 'conne', 'pd', 'fdp', 'ntm', 'tg', 'pute', 'putes', 'bite', 'cul', 'anus', 'sexe', 'sex',
  'viol', 'violeur', 'nique', 'niquer', 'negre', 'negro', 'cunt', 'cock', 'slut', 'whore',
  'kkk', 'pedale', 'zizi', 'shit', 'admin', 'moderateur', 'modo',
];

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't' };

// Minuscules, sans accents, chiffres « déguisés » remis en lettres.
export function normalizePseudo(s) {
  return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[013457]/g, (d) => LEET[d]);
}

// null si le pseudo est accepté, sinon le message à afficher.
export function pseudoProblem(pseudo) {
  const p = String(pseudo ?? '').trim();
  if (p.length < 3 || p.length > 16) return 'Pseudo invalide : 3 à 16 caractères.';
  if (!/^[\p{L}\p{N}_ -]+$/u.test(p)) return 'Pseudo invalide : lettres, chiffres, espaces, - ou _ seulement.';
  const n = normalizePseudo(p);
  const squashed = n.replace(/[^a-z]/g, '');
  const words = n.split(/[^a-z]+/).filter(Boolean);
  if (BANNED_PARTS.some((w) => squashed.includes(w)) || words.some((w) => BANNED_WORDS.includes(w))) {
    return 'Ce pseudo n’est pas accepté. Choisis-en un autre.';
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
