// v693 : notifications envoyées par le serveur (serveur/push.mjs, supabase/17-notifications.sql)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { messageOf, apnsJwt, drain, apnsSender, TOPIC } from '../serveur/push.mjs';

const KINDS = ['turn', 'challenge', 'accepted', 'found', 'end', 'wager', 'wager_done', 'friend', 'friend_ok'];

test('un texte pour chaque notification, dans les 6 langues, avec le pseudo et le jeu', () => {
  for (const lang of ['fr', 'en', 'es', 'de', 'it', 'pt']) {
    for (const kind of KINDS) {
      for (const res of kind === 'end' ? ['win', 'lose', 'draw'] : [undefined]) {
        const m = messageOf(kind, { who: 'Bob', game: 'pacte', res }, lang);
        assert.ok(m && m.title && m.body, `${lang} ${kind}`);
        assert.ok(m.body.includes('Bob'), `${lang} ${kind} : pseudo`);
        assert.ok(!/\{[wg]\}/.test(m.title + m.body), `${lang} ${kind} : marqueur oublié`);
        assert.match(m.route, /^#\//);
      }
    }
  }
  assert.equal(messageOf('turn', { who: 'Bob', game: 'sceaux' }, 'xx').title, 'À toi de jouer !');
  assert.equal(messageOf('inconnu', {}, 'fr'), null);
  assert.equal(messageOf('turn', { game: 'cryptes' }, 'fr').route, '#/cryptes');
});

test('jeton Apple ES256 signé et vérifiable', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const der = Buffer.from(await crypto.subtle.exportKey('pkcs8', pair.privateKey)).toString('base64');
  const pem = `-----BEGIN PRIVATE KEY-----\n${der.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
  const jwt = await apnsJwt({ key: pem, keyId: 'ABC123DEFG', teamId: 'TEAM123456', now: 1_700_000_000_000 });
  const [h, b, s] = jwt.split('.');
  const dec = (x) => JSON.parse(Buffer.from(x, 'base64url').toString());
  assert.deepEqual(dec(h), { alg: 'ES256', kid: 'ABC123DEFG' });
  assert.deepEqual(dec(b), { iss: 'TEAM123456', iat: 1_700_000_000 });
  const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey, Buffer.from(s, 'base64url'), new TextEncoder().encode(`${h}.${b}`));
  assert.ok(ok);
});

test('file vidée : envoyée, adresse morte retirée, erreur passagère retentée, Android ignoré', async () => {
  const rows = [
    { id: 1, kind: 'turn', data: { who: 'Bob', game: 'sceaux' }, tokens: [{ token: 'a1', platform: 'ios', lang: 'fr' }] },
    { id: 2, kind: 'friend', data: { who: 'Eve' }, tokens: [{ token: 'mort', platform: 'ios', lang: 'en' }] },
    { id: 3, kind: 'friend', data: { who: 'Eve' }, tokens: [{ token: 'panne', platform: 'ios', lang: 'fr' }] },
    { id: 4, kind: 'friend', data: { who: 'Eve' }, tokens: [{ token: 'and', platform: 'android', lang: 'fr' }] },
  ];
  const doneIds = [], dropped = [], payloads = [];
  const send = async (t, p) => { payloads.push([t, p]); return t === 'mort' ? { status: 410, reason: 'Unregistered' } : t === 'panne' ? { status: 503, reason: 'ServiceUnavailable' } : { status: 200 }; };
  const out = await drain({ take: async () => rows, done: async (ids) => doneIds.push(...ids), drop: async (t) => dropped.push(t), send });
  assert.deepEqual(doneIds, [1, 2, 4]);
  assert.deepEqual(dropped, ['mort']);
  assert.equal(out.sent, 1);
  assert.equal(payloads[0][1].aps.alert.title, 'À toi de jouer !');
  assert.equal(payloads[1][1].aps.alert.title, 'Friend request');
  assert.equal(payloads[0][1].route, '#/sceaux');
});

test('envoi Apple : production d’abord, serveur d’essai si le jeton vient d’une app lancée depuis Xcode', async () => {
  const calls = [];
  const fetchFn = async (url, opt) => {
    calls.push([url, opt.headers]);
    if (url.includes('sandbox')) return { status: 200, json: async () => ({}) };
    return { status: 400, json: async () => ({ reason: 'BadDeviceToken' }) };
  };
  const send = apnsSender({ getJwt: async () => 'JWT', fetchFn });
  const r = await send('abcd', { aps: {} });
  assert.equal(r.status, 200);
  assert.equal(calls.length, 2);
  assert.match(calls[0][0], /^https:\/\/api\.push\.apple\.com\/3\/device\/abcd$/);
  assert.equal(calls[0][1]['apns-topic'], TOPIC);
  assert.equal(calls[0][1].authorization, 'bearer JWT');
  /* une autre erreur ne passe pas au serveur d'essai */
  calls.length = 0;
  const send2 = apnsSender({ getJwt: async () => 'JWT', fetchFn: async (url) => { calls.push(url); return { status: 429, json: async () => ({ reason: 'TooManyRequests' }) }; } });
  assert.equal((await send2('x', {})).status, 429);
  assert.equal(calls.length, 1);
});

test('le SQL 17 ne laisse lire la file à personne et ne bloque jamais un coup', () => {
  const sql = fs.readFileSync(new URL('../supabase/17-notifications.sql', import.meta.url), 'utf8');
  assert.match(sql, /revoke all on public\.push_queue from anon, authenticated/);
  assert.match(sql, /revoke all on public\.push_tokens from anon, authenticated/);
  for (const fn of ['push_on_match', 'push_on_versus', 'push_on_friend']) assert.match(sql, new RegExp(`function public\\.${fn}\\(\\)[\\s\\S]*?exception when others then return new;`), fn);
  for (const k of KINDS) if (k !== 'end') assert.ok(sql.includes(`'${k}'`), `type ${k} posé par la base`);
});

// v917 : Android par Firebase Cloud Messaging
test('Android : message FCM, jeton Google signé RS256, adresse morte retirée', async () => {
  const { fcmMessage, fcmJwt, fcmSender, FCM_CHANNEL } = await import('../serveur/push.mjs');
  const m = fcmMessage('tok', { title: 'T', body: 'B', route: '#/amis' }, { kind: 'friend', data: {} });
  assert.equal(m.message.token, 'tok');
  assert.equal(m.message.data.route, '#/amis');
  assert.equal(m.message.android.notification.channel_id, FCM_CHANNEL);
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const der = Buffer.from(await crypto.subtle.exportKey('pkcs8', pair.privateKey)).toString('base64');
  const sa = { client_email: 'x@p.iam.gserviceaccount.com', private_key: `-----BEGIN PRIVATE KEY-----\n${der}\n-----END PRIVATE KEY-----\n`, project_id: 'p' };
  const jwt = await fcmJwt({ sa, now: 1_700_000_000_000 });
  const [h, b, s] = jwt.split('.');
  const body = JSON.parse(Buffer.from(b, 'base64url').toString());
  assert.equal(body.iss, sa.client_email); assert.equal(body.exp - body.iat, 3600);
  assert.match(body.scope, /firebase\.messaging/);
  assert.ok(await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, pair.publicKey, Buffer.from(s, 'base64url'), new TextEncoder().encode(`${h}.${b}`)));
  const calls = [];
  const send = fcmSender({ projectId: 'p', getToken: async () => 'GT', fetchFn: async (url, opt) => { calls.push([url, opt]); return url && JSON.parse(opt.body).message.token === 'mort' ? { status: 404, json: async () => ({ error: { status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] } }) } : { status: 200, json: async () => ({}) }; } });
  const rows = [{ id: 7, kind: 'friend', data: { who: 'Eve' }, tokens: [{ token: 'AbC:x_y', platform: 'android', lang: 'fr' }, { token: 'mort', platform: 'android', lang: 'fr' }] }];
  const dropped = [], doneIds = [];
  const out = await drain({ take: async () => rows, done: async (ids) => doneIds.push(...ids), drop: async (t) => dropped.push(t), send: async () => ({ status: 200 }), sendAndroid: send });
  assert.equal(out.sent, 1); assert.deepEqual(dropped, ['mort']); assert.deepEqual(doneIds, [7]);
  assert.match(calls[0][0], /projects\/p\/messages:send$/);
  assert.equal(calls[0][1].headers.authorization, 'Bearer GT');
  assert.equal(JSON.parse(calls[0][1].body).message.notification.title, 'Demande d’ami');
});
