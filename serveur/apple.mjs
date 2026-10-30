// v925 : « Continuer avec Apple » et la suppression du compte (règle 5.1.1(v) d'Apple : supprimer son compte doit aussi
// couper le lien avec Apple). À la connexion, le téléphone donne le code d'autorisation d'Apple ; le serveur l'échange
// contre un jeton de renouvellement (gardé dans apple_tokens, supabase/23-apple.sql, jamais lisible par un joueur).
// À la suppression du compte, le serveur rend ce jeton à Apple (révocation). Clé « Sign in with Apple » du propriétaire
// dans les secrets de la fonction (APPLE_SIWA_KEY, APPLE_SIWA_KEY_ID, APNS_TEAM_ID), jamais dans le dépôt.
export const CLIENT_ID = 'com.abyssalgame.abyssal';
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uStr = (s) => b64u(new TextEncoder().encode(s));
function pemToDer(pem) {
  const b = String(pem).replace(/-----[A-Z ]+-----/g, '').replace(/\\n/g, '').replace(/\s+/g, '');
  const bin = atob(b); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
// « Secret client » demandé par Apple : un jeton ES256 signé avec la clé .p8, valable 1 h
export async function clientSecret({ key, keyId, teamId, now = Date.now() }) {
  const k = await crypto.subtle.importKey('pkcs8', pemToDer(key), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const iat = Math.floor(now / 1000);
  const head = b64uStr(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const body = b64uStr(JSON.stringify({ iss: teamId, iat, exp: iat + 3600, aud: 'https://appleid.apple.com', sub: CLIENT_ID }));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64u(sig)}`;
}
const form = (o) => Object.entries(o).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

// Code d'autorisation (à usage unique, 5 min) → jeton de renouvellement
export async function exchange({ code, secret, fetchFn = fetch }) {
  const res = await fetchFn('https://appleid.apple.com/auth/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form({ client_id: CLIENT_ID, client_secret: secret, code, grant_type: 'authorization_code' }) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.refresh_token) throw new Error(`Apple : ${res.status} ${String(j.error || '').slice(0, 60)}`);
  return j.refresh_token;
}
export async function revoke({ token, secret, fetchFn = fetch }) {
  const res = await fetchFn('https://appleid.apple.com/auth/revoke', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form({ client_id: CLIENT_ID, client_secret: secret, token, token_type_hint: 'refresh_token' }) });
  return res.ok;
}

// Une requête du jeu : { action: 'store', code } ou { action: 'revoke' } ; db = { get(uid), set(uid, tok), del(uid) }
export async function handleApple({ uid, body }, { db, getSecret, fetchFn = fetch }) {
  if (body?.action === 'store') {
    const code = String(body.code || '');
    if (!/^[A-Za-z0-9._-]{10,600}$/.test(code)) return { status: 400, body: { error: 'Code illisible.' } };
    const tok = await exchange({ code, secret: await getSecret(), fetchFn });
    await db.set(uid, tok);
    return { status: 200, body: { ok: true } };
  }
  if (body?.action === 'revoke') {
    const tok = await db.get(uid);
    if (!tok) return { status: 200, body: { ok: true, none: true } };
    const ok = await revoke({ token: tok, secret: await getSecret(), fetchFn });
    if (ok) await db.del(uid);
    return { status: 200, body: { ok } };
  }
  return { status: 400, body: { error: 'Action inconnue.' } };
}
