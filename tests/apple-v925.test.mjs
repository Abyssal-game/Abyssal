// v925 : « Continuer avec Apple » : jeton gardé à la connexion, rendu à Apple à la suppression du compte (serveur/apple.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { clientSecret, handleApple, CLIENT_ID } from '../serveur/apple.mjs';

test('secret client : jeton ES256 pour appleid.apple.com, signé avec la clé .p8', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const der = Buffer.from(await crypto.subtle.exportKey('pkcs8', pair.privateKey)).toString('base64');
  const jwt = await clientSecret({ key: `-----BEGIN PRIVATE KEY-----\n${der}\n-----END PRIVATE KEY-----`, keyId: 'KEY1234567', teamId: 'TEAM123456', now: 1_700_000_000_000 });
  const [h, b, s] = jwt.split('.');
  const dec = (x) => JSON.parse(Buffer.from(x, 'base64url').toString());
  assert.deepEqual(dec(h), { alg: 'ES256', kid: 'KEY1234567' });
  assert.deepEqual(dec(b), { iss: 'TEAM123456', iat: 1_700_000_000, exp: 1_700_003_600, aud: 'https://appleid.apple.com', sub: CLIENT_ID });
  assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey, Buffer.from(s, 'base64url'), new TextEncoder().encode(`${h}.${b}`)));
});

test('connexion : le code devient un jeton gardé ; suppression : le jeton est rendu à Apple puis effacé', async () => {
  const store = new Map(), calls = [];
  const db = { get: async (u) => store.get(u) || null, set: async (u, t) => store.set(u, t), del: async (u) => store.delete(u) };
  const fetchFn = async (url, opt) => { calls.push([url, opt.body]); return url.endsWith('/token') ? { ok: true, json: async () => ({ refresh_token: 'RT1' }) } : { ok: true, json: async () => ({}) }; };
  const ctx = { db, getSecret: async () => 'SECRET', fetchFn };
  assert.equal((await handleApple({ uid: 'u1', body: { action: 'store', code: 'c.abc-123_XYZ' } }, ctx)).status, 200);
  assert.equal(store.get('u1'), 'RT1');
  assert.match(calls[0][1], /grant_type=authorization_code/); assert.match(calls[0][1], /client_secret=SECRET/);
  const r = await handleApple({ uid: 'u1', body: { action: 'revoke' } }, ctx);
  assert.equal(r.body.ok, true); assert.equal(store.has('u1'), false);
  assert.match(calls[1][0], /\/auth\/revoke$/); assert.match(calls[1][1], /token=RT1/); assert.match(calls[1][1], /token_type_hint=refresh_token/);
  assert.deepEqual((await handleApple({ uid: 'u2', body: { action: 'revoke' } }, ctx)).body, { ok: true, none: true });
  assert.equal((await handleApple({ uid: 'u1', body: { action: 'store', code: 'bad code!' } }, ctx)).status, 400);
});

test('le jeu coupe le lien Apple avant de supprimer le compte, et la fonction est publiée', () => {
  assert.match(fs.readFileSync(new URL('../js/screens/account.js', import.meta.url), 'utf8'), /appleRevoke\(\)[\s\S]{0,120}deleteAccount\(\)/);
  assert.match(fs.readFileSync(new URL('../.github/workflows/serveur.yml', import.meta.url), 'utf8'), /functions deploy apple/);
  assert.match(fs.readFileSync(new URL('../supabase/23-apple.sql', import.meta.url), 'utf8'), /revoke all on public\.apple_tokens from public, anon, authenticated/);
});
