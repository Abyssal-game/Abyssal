// Connexion au serveur (Supabase) sans bibliothèque externe : compte, sauvegarde en ligne,
// profil public et classement. Tout passe par l'API HTTP de Supabase.
// La clé « publishable » est faite pour être publique : la sécurité repose sur les règles
// de la base (chaque joueur ne peut lire et écrire que ses propres données).

export const CLOUD = {
  url: 'https://zwyxnrvvctanzsssyirm.supabase.co',
  key: 'sb_publishable_NnHT8lRRVHtEF5omI3aTrQ_sXQJfbkx',
};
const SESSION_KEY = 'abyssal.session';

let session = null;
try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { session = null; }
const listeners = new Set();
export function onAuth(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function setSession(s) {
  session = s;
  try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch (e) { /* rien */ }
  listeners.forEach((f) => f(s));
}
export const currentUser = () => session?.user || null;
export const isLoggedIn = () => !!session?.access_token;

// Messages d'erreur compréhensibles
function frError(status, body) {
  const m = String(body?.msg || body?.message || body?.error_description || body?.error || '').toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid_grant') || m.includes('invalid credentials')) return 'E-mail ou mot de passe incorrect.';
  if (m.includes('email not confirmed')) return 'Ce compte n’est pas encore confirmé.';
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'Les inscriptions sont fermées pour le moment.';
  if (m.includes('already registered') || m.includes('already exists') || m.includes('already been registered')) return 'Un compte existe déjà avec cet e-mail : connecte-toi.';
  if (m.includes('password should') || m.includes('password is too short') || m.includes('weak password') || m.includes('weak_password')) return 'Mot de passe trop faible : 8 caractères au moins, avec une majuscule, une minuscule, un chiffre et un symbole (! ? # …).';
  // v324 : le service d'e-mails intégré à Supabase n'envoie que quelques e-mails par heure pour tout le jeu
  if (m.includes('email rate limit') || m.includes('over_email_send_rate_limit')) return 'Trop d’e-mails envoyés en ce moment : réessaie dans une heure.';
  if (m.includes('rate limit') || m.includes('too many requests') || status === 429) return 'Trop de tentatives : réessaie dans quelques minutes.';
  if (m.includes('unable to validate email') || m.includes('invalid email') || m.includes('invalid format')) return 'Adresse e-mail invalide.';
  if (m.includes('same password') || m.includes('different from the old')) return 'Choisis un mot de passe différent de l’ancien.';
  if (m.includes('otp_expired') || m.includes('expired') || m.includes('invalid or has expired')) return 'Ce lien a expiré : demande-en un nouveau.';
  if (m.includes('duplicate') || m.includes('profiles_pseudo_key') || status === 409) return 'Ce pseudo est déjà pris.';
  if (m.includes('check constraint') || m.includes('violates check')) return 'Pseudo invalide : 3 à 16 lettres, chiffres, espaces, - ou _.';
  if (m.includes('mp_') || m.includes('sceaux_mp') || m.includes('pacte_mp')) return 'Les parties contre d’autres joueurs ne sont pas encore ouvertes sur le serveur.'; /* v519 : supabase/09-multijoueur.sql pas encore collé */
  if (m.includes('versus_')) return 'Le Pari des Boosters n’est pas encore ouvert sur le serveur.'; /* v512 : supabase/08-versus.sql pas encore collé */
  if (m.includes('friend_') || m.includes('player_cards')) return 'Les amis ne sont pas encore ouverts sur le serveur.';
  if (status === 401 || status === 403) return 'Session expirée : reconnecte-toi.';
  if (status >= 500) return 'Le serveur ne répond pas correctement. Réessaie dans un instant.';
  return body?.msg || body?.message || 'Une erreur est survenue. Réessaie dans un instant.';
}

async function call(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
  let res;
  try {
    res = await fetch(CLOUD.url + path, {
      method,
      headers: { apikey: CLOUD.key, 'Content-Type': 'application/json', ...(auth && session ? { Authorization: `Bearer ${session.access_token}` } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    throw new Error('Pas de connexion au serveur. Vérifie ton réseau.');
  }
  const txt = await res.text();
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
  if (!res.ok) { const err = new Error(frError(res.status, data)); err.status = res.status; throw err; }
  return data;
}

function store(tok) {
  setSession({ access_token: tok.access_token, refresh_token: tok.refresh_token, expires_at: Date.now() + (tok.expires_in || 3600) * 1000, user: { id: tok.user?.id, email: tok.user?.email } });
}

export async function signIn(email, password) {
  const tok = await call('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email: email.trim(), password } });
  store(tok);
  return currentUser();
}
// Inscription. Avec la confirmation par e-mail (réglage Supabase par défaut), la réponse n'a pas de jeton :
// le joueur reçoit un lien, qui ramène au jeu connecté (voir consumeAuthHash). Sans confirmation, il est connecté tout de suite.
// v322 : les liens des e-mails (confirmation, mot de passe oublié) ramènent toujours à l'adresse publique du jeu,
// même si le « Site URL » de Supabase est mal réglé (l'adresse doit figurer dans les Redirect URLs de Supabase).
const RETURN_TO = '?redirect_to=' + encodeURIComponent('https://abyssal-game.github.io/Abyssal/');
export async function signUp(email, password) {
  const r = await call('/auth/v1/signup' + RETURN_TO, { method: 'POST', auth: false, body: { email: email.trim(), password, data: {} } });
  if (r?.access_token) store(r);
  return { loggedIn: !!r?.access_token, user: r?.user || r };
}
// Mot de passe oublié : Supabase envoie un lien qui ramène au jeu avec un jeton « recovery » (voir consumeAuthHash).
export async function recover(email) {
  await call('/auth/v1/recover' + RETURN_TO, { method: 'POST', auth: false, body: { email: email.trim() } });
}
// Nouveau mot de passe (après un lien de récupération, ou connecté).
export async function updatePassword(password) {
  const u = await call('/auth/v1/user', { method: 'PUT', body: { password } });
  if (session && u?.id) setSession({ ...session, user: { id: u.id, email: u.email } });
  return u;
}
// v318 : les liens des e-mails de Supabase (confirmation, récupération, lien magique) reviennent sur le site avec les jetons
// dans la partie « # » de l'adresse. On les lit une fois, on ouvre la session, et on nettoie l'adresse.
// Renvoie le type du lien ('signup', 'recovery', 'magiclink', 'email_change'…) ou null s'il n'y a rien.
export function consumeAuthHash() {
  const h = location.hash || '';
  if (!/^#(?!\/)/.test(h) || !/(^|&)access_token=/.test(h.slice(1))) {
    const m = /(^|[#&?])error_description=([^&]+)/.exec(h);
    if (m) { history.replaceState(null, '', location.pathname + location.search + '#/compte'); return { type: 'error', message: decodeURIComponent(m[2].replace(/\+/g, ' ')) }; }
    return null;
  }
  const q = new URLSearchParams(h.slice(1));
  const tok = { access_token: q.get('access_token'), refresh_token: q.get('refresh_token'), expires_in: Number(q.get('expires_in')) || 3600 };
  let user = null;
  try { user = JSON.parse(atob(tok.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch (e) { user = null; }
  setSession({ access_token: tok.access_token, refresh_token: tok.refresh_token, expires_at: Date.now() + tok.expires_in * 1000, user: { id: user?.sub, email: user?.email } });
  const type = q.get('type') || 'magiclink';
  history.replaceState(null, '', location.pathname + location.search + (type === 'recovery' ? '#/compte/motdepasse' : '#/compte'));
  return { type };
}
async function refresh() {
  if (!session?.refresh_token) throw new Error('Session expirée : reconnecte-toi.');
  try {
    const tok = await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: session.refresh_token } });
    store(tok);
  } catch (e) {
    if (e.status === 400 || e.status === 401) setSession(null);
    throw e;
  }
}
export async function signOut() {
  try { if (session) await call('/auth/v1/logout', { method: 'POST' }); } catch (e) { /* on se déconnecte quand même */ }
  setSession(null);
}

// Appel authentifié : rafraîchit la session si elle expire.
async function authed(path, opts = {}) {
  if (!session) throw new Error('Connecte-toi d’abord.');
  if (Date.now() > session.expires_at - 60000) await refresh();
  try { return await call(path, opts); }
  catch (e) {
    if (e.status === 401) { await refresh(); return call(path, opts); }
    throw e;
  }
}

// ——— Sauvegarde ————————————————————————————————————————————————————
export async function pullSave() {
  const rows = await authed(`/rest/v1/saves?user_id=eq.${currentUser().id}&select=data,updated_at`);
  return rows && rows[0] ? rows[0] : null;
}
export async function pushSave(data) {
  const iso = new Date().toISOString();
  await authed('/rest/v1/saves?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: { user_id: currentUser().id, data, updated_at: iso },
  });
  return { at: Date.now(), iso }; /* v536 : la marque écrite sert à reconnaître une écriture venue d'un autre appareil */
}
// v536 : seulement la marque de la sauvegarde en ligne (léger, avant chaque envoi)
export async function pullSaveStamp() {
  const rows = await authed(`/rest/v1/saves?user_id=eq.${currentUser().id}&select=updated_at`);
  return rows && rows[0] ? rows[0].updated_at : null;
}

// v539 : serveur de partie (supabase/functions/partie) : il rejoue les actions du joueur et tient sa progression
export async function partieCall(body) { return authed('/functions/v1/partie', { method: 'POST', body }); }

// ——— Profil ————————————————————————————————————————————————————————
export async function getProfile() {
  const rows = await authed(`/rest/v1/profiles?id=eq.${currentUser().id}&select=*`);
  return rows && rows[0] ? rows[0] : null;
}
export async function saveProfile(p) {
  await authed('/rest/v1/profiles?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: { id: currentUser().id, ...p, updated_at: new Date().toISOString() },
  });
}
// v500 : mise à jour du profil sans toucher au pseudo (définitif : seul setPseudo l'envoie)
export async function updateProfile(p) {
  await authed(`/rest/v1/profiles?id=eq.${currentUser().id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { ...p, updated_at: new Date().toISOString() } });
}

// ——— Amis (v500, supabase/07-amis.sql) ——————————————————————————————————
// 'sent' | 'accepted' | 'pending' | 'already'
export async function friendRequest(pseudo) { return authed('/rest/v1/rpc/friend_request', { method: 'POST', body: { p_pseudo: pseudo } }); }
export async function friendRespond(id, accept) { return authed('/rest/v1/rpc/friend_respond', { method: 'POST', body: { p_other: id, p_accept: !!accept } }); }
export async function friendRemove(id) { return authed('/rest/v1/rpc/friend_remove', { method: 'POST', body: { p_other: id } }); }
export async function friendList() { return (await authed('/rest/v1/rpc/friend_list', { method: 'POST', body: {} })) || []; }
// Fiche d'un ami (ou la sienne) : null si elle n'existe pas ou si on n'est pas amis
export async function playerCard(id) {
  const rows = await authed(`/rest/v1/player_cards?id=eq.${id}&select=data,updated_at`);
  return rows && rows[0] ? rows[0] : null;
}
// v528 : profil d'un joueur, ami ou non (supabase/10-profils.sql) : sans sa collection si on n'est pas amis
export async function publicProfile(id) { return authed('/rest/v1/rpc/public_profile', { method: 'POST', body: { p_id: id } }); }
export async function publishCard(data) {
  await authed('/rest/v1/player_cards?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: { id: currentUser().id, data, updated_at: new Date().toISOString() } });
}

// ——— Versus Booster (v512, supabase/08-versus.sql) ————————————————————————————
export async function versusList() { return (await authed('/rest/v1/rpc/versus_list', { method: 'POST', body: {} })) || { open: [], mine: [] }; }
export async function versusCreate(type, faction, factions, packs, to = null) {
  return authed('/rest/v1/rpc/versus_create', { method: 'POST', body: { p_type: type, p_faction: faction || null, p_factions: factions || null, p_packs: packs, p_to: to } });
}
// v516 : composition libre [{ type, faction?, factions? }, …]
export async function versusCreateMix(lineup, to = null) { return authed('/rest/v1/rpc/versus_create_mix', { method: 'POST', body: { p_lineup: lineup, p_to: to } }); }
export async function versusAccept(id) { return authed('/rest/v1/rpc/versus_accept', { method: 'POST', body: { p_id: id } }); }
export async function versusCancel(id) { return authed('/rest/v1/rpc/versus_cancel', { method: 'POST', body: { p_id: id } }); }
export async function versusClaim(id) { return authed('/rest/v1/rpc/versus_claim', { method: 'POST', body: { p_id: id } }); }

// ——— Mini-jeux contre d'autres joueurs (v519, supabase/09-multijoueur.sql) ——————————————
const rpc = (fn, body = {}) => authed(`/rest/v1/rpc/${fn}`, { method: 'POST', body });
/* v608 : joueurs en ligne (liste lisible par le seul compte « Le Gardien », supabase/16-en-ligne.sql) */
/* v693 : adresse de notification du téléphone (supabase/17-notifications.sql) */
export const pushRegister = (token, platform, lang) => rpc('push_register', { p_token: token, p_platform: platform, p_lang: lang });
export const pushUnregister = (token) => rpc('push_unregister', { p_token: token });
export const onlinePing = () => rpc('online_ping');
export const onlineLeave = () => rpc('online_leave');
export const onlineList = async () => (await rpc('online_list')) || [];
export const mpList = async (game) => (await rpc('mp_list', { p_game: game })) || [];
export const mpGet = (id) => rpc('mp_get', { p_id: id });
export const mpEmote = (id, key) => rpc('mp_emote', { p_id: id, p_key: key }); /* v564 : réaction en ligne */
export const mpLeave = (id) => rpc('mp_leave', { p_id: id });
export const mpCancel = (id) => rpc('mp_cancel', { p_id: id }); /* v527 : annule seulement une partie encore en attente */
export const mpClaim = (id) => rpc('mp_claim', { p_id: id });
export const mpRanking = async (game, limit = 30) => (await rpc('mp_ranking', { p_game: game, p_limit: limit })) || [];
export const sceauxMpNew = (hand, to = null, pace = 'slow') => rpc('sceaux_mp_new', { p_hand: hand, p_to: to, p_pace: pace });
export const sceauxMpJoin = (id, hand) => rpc('sceaux_mp_join', { p_id: id, p_hand: hand });
export const sceauxMpPlay = (id, idx, cell) => rpc('sceaux_mp_play', { p_id: id, p_idx: idx, p_cell: cell });
// v523 : le Pacte en ligne (action : 'draw' tirer une carte, 'stop' s'arrêter)
export const pacteMpNew = (to = null, pace = 'slow') => rpc('pacte_mp_new', { p_to: to, p_pace: pace });
export const pacteMpJoin = (id) => rpc('pacte_mp_join', { p_id: id });
export const pacteMpAct = (id, action) => rpc('pacte_mp_act', { p_id: id, p_action: action });
// v525 : Enchères en ligne et Cryptes entre amis (move : { offer } ou { flip } / { picks })
export const mpNew = (game, to = null, pace = 'slow') => rpc('mp_new', { p_game: game, p_to: to, p_pace: pace });
export const mpJoin = (id) => rpc('mp_join', { p_id: id });
export const mpAct = (id, move) => rpc('mp_act', { p_id: id, p_move: move });
export const mpFriendRecord = async (game) => (await rpc('mp_friend_record', { p_game: game })) || [];

// Signaler le pseudo d'un autre joueur : renvoie 'ok', ou 'masqué' si le pseudo vient d'être masqué.
export async function reportPseudo(target, reason) {
  return authed('/rest/v1/rpc/report_pseudo', { method: 'POST', body: { p_target: target, p_reason: reason } });
}
export async function deleteAccount() {
  await authed('/rest/v1/rpc/delete_my_account', { method: 'POST', body: {} });
  setSession(null);
}

// ——— Classement de la Descente ——————————————————————————————————————
// v538 : une Épreuve gagnée (le serveur fait le total du jour, supabase/11-anti-triche.sql)
export async function trialWin(day, idx, hp) {
  return authed('/rest/v1/rpc/trial_win', { method: 'POST', body: { p_day: day, p_idx: idx, p_hp: Math.max(0, Math.min(100, Math.round(hp))) } });
}
export async function submitScore(day, floor, cursed) {
  await authed('/rest/v1/rpc/submit_score', { method: 'POST', body: { p_day: day, p_floor: floor, p_cursed: !!cursed } });
}
/* v564 : cadre et plaque des autres joueurs (colonnes de 15-vitrine.sql) ; sans elles, la lecture reprend sans */
let cosmCols = true;
async function withCosm(url) {
  if (cosmCols) { try { return await authed(url(',frame,plate')); } catch (e) { if (!/frame|plate|column|42703/i.test(String(e?.message || e))) throw e; cosmCols = false; } }
  return authed(url(''));
}
export async function leaderboard(day, limit = 20) {
  return withCosm((x) => `/rest/v1/descent_scores?day=eq.${day}&select=floor,cursed,user_id,profiles(pseudo,avatar,title,badge${x})&order=floor.desc,updated_at.asc&limit=${limit}`);
}

// Tirage des Ombres : le serveur tire le booster du jour et tient le classement de la semaine
export async function shadowDraw(faction) { return authed('/rest/v1/rpc/shadow_draw', { method: 'POST', body: { p_faction: faction } }); }
export async function shadowMine(day) {
  const me = currentUser()?.id;
  const rows = await authed(`/rest/v1/shadow_draws?day=eq.${day}&user_id=eq.${me}&select=cards,score,faction,day`);
  return rows?.[0] || null;
}
export async function shadowDay(day, limit = 10) {
  return withCosm((x) => `/rest/v1/shadow_draws?day=eq.${day}&select=score,faction,user_id,created_at,profiles(pseudo,avatar,badge${x})&order=score.desc,created_at.asc&limit=${limit}`);
}
export async function shadowWeek(week, limit = 10) { return authed('/rest/v1/rpc/shadow_week', { method: 'POST', body: { p_week: week, p_limit: limit } }); }
export async function shadowClaim(week) { return authed('/rest/v1/rpc/shadow_claim', { method: 'POST', body: { p_week: week } }); }

// Badges attribués par le serveur
export const BADGES = { createur: { name: 'Créateur', cls: 'b-createur' } };
export function badgeHTML(key) {
  const b = BADGES[key];
  return b ? `<span class="pbadge ${b.cls}">${b.name}</span>` : '';
}

/* v678 : sonde sans effet pour l'écran « État du serveur » (Mode Créateur) : ne lève jamais d'erreur */
export async function probe(path, body) {
  try {
    const res = await fetch(CLOUD.url + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { apikey: CLOUD.key, 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const txt = await res.text(); let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
    return { ok: res.ok, status: res.status, code: data?.code || '', msg: String(data?.message || data?.msg || ''), data };
  } catch (e) { return { ok: false, status: 0, code: 'net', msg: 'Pas de connexion au serveur.' }; }
}
