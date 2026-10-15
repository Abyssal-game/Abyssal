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
  if (m.includes('rate limit') || m.includes('too many requests') || status === 429) return 'Trop de tentatives : réessaie dans quelques minutes.';
  if (m.includes('unable to validate email') || m.includes('invalid email') || m.includes('invalid format')) return 'Adresse e-mail invalide.';
  if (m.includes('same password') || m.includes('different from the old')) return 'Choisis un mot de passe différent de l’ancien.';
  if (m.includes('otp_expired') || m.includes('expired') || m.includes('invalid or has expired')) return 'Ce lien a expiré : demande-en un nouveau.';
  if (m.includes('duplicate') || m.includes('profiles_pseudo_key') || status === 409) return 'Ce pseudo est déjà pris.';
  if (m.includes('check constraint') || m.includes('violates check')) return 'Pseudo invalide : 3 à 16 lettres, chiffres, espaces, - ou _.';
  if (status === 401 || status === 403) return 'Session expirée : reconnecte-toi.';
  if (status >= 500) return 'Le serveur ne répond pas correctement. Réessaie dans un instant.';
  return body?.msg || body?.message || `Erreur ${status}`;
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
export async function signUp(email, password) {
  const r = await call('/auth/v1/signup', { method: 'POST', auth: false, body: { email: email.trim(), password, data: {} } });
  if (r?.access_token) store(r);
  return { loggedIn: !!r?.access_token, user: r?.user || r };
}
// Mot de passe oublié : Supabase envoie un lien qui ramène au jeu avec un jeton « recovery » (voir consumeAuthHash).
export async function recover(email) {
  await call('/auth/v1/recover', { method: 'POST', auth: false, body: { email: email.trim() } });
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
  await authed('/rest/v1/saves?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: { user_id: currentUser().id, data, updated_at: new Date().toISOString() },
  });
  return Date.now();
}

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
// Signaler le pseudo d'un autre joueur : renvoie 'ok', ou 'masqué' si le pseudo vient d'être masqué.
export async function reportPseudo(target, reason) {
  return authed('/rest/v1/rpc/report_pseudo', { method: 'POST', body: { p_target: target, p_reason: reason } });
}
export async function deleteAccount() {
  await authed('/rest/v1/rpc/delete_my_account', { method: 'POST', body: {} });
  setSession(null);
}

// ——— Classement de la Descente ——————————————————————————————————————
export async function submitScore(day, floor, cursed) {
  await authed('/rest/v1/rpc/submit_score', { method: 'POST', body: { p_day: day, p_floor: floor, p_cursed: !!cursed } });
}
export async function leaderboard(day, limit = 20) {
  return authed(`/rest/v1/descent_scores?day=eq.${day}&select=floor,cursed,user_id,profiles(pseudo,avatar,title,badge)&order=floor.desc,updated_at.asc&limit=${limit}`);
}

// Tirage des Ombres : le serveur tire le booster du jour et tient le classement de la semaine
export async function shadowDraw(faction) { return authed('/rest/v1/rpc/shadow_draw', { method: 'POST', body: { p_faction: faction } }); }
export async function shadowMine(day) {
  const me = currentUser()?.id;
  const rows = await authed(`/rest/v1/shadow_draws?day=eq.${day}&user_id=eq.${me}&select=cards,score,faction,day`);
  return rows?.[0] || null;
}
export async function shadowDay(day, limit = 10) {
  return authed(`/rest/v1/shadow_draws?day=eq.${day}&select=score,faction,user_id,created_at,profiles(pseudo,avatar,badge)&order=score.desc,created_at.asc&limit=${limit}`);
}
export async function shadowWeek(week, limit = 10) { return authed('/rest/v1/rpc/shadow_week', { method: 'POST', body: { p_week: week, p_limit: limit } }); }
export async function shadowClaim(week) { return authed('/rest/v1/rpc/shadow_claim', { method: 'POST', body: { p_week: week } }); }

// Badges attribués par le serveur
export const BADGES = { createur: { name: 'Créateur', cls: 'b-createur' } };
export function badgeHTML(key) {
  const b = BADGES[key];
  return b ? `<span class="pbadge ${b.cls}">${b.name}</span>` : '';
}
