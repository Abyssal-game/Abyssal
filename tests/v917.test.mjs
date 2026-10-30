// v917 : demande de note, connexion Apple / Google, tableau de bord du créateur, notifications Android.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { reviewDue } from '../js/review.js';
import { SOCIAL, PUSH_ANDROID } from '../js/config.js';

test('note : au 1er, 3e et 10e gardien ou au fond de l’Abysse, 3 fois au plus, 45 jours d’écart', () => {
  const now = Date.UTC(2026, 10, 1);
  assert.equal(reviewDue({ n: 0, last: 0 }, now, 1, false), true);
  assert.equal(reviewDue({ n: 0, last: 0 }, now, 2, false), false);
  assert.equal(reviewDue({ n: 0, last: 0 }, now, 7, true), true);
  assert.equal(reviewDue({ n: 1, last: now - 10 * 86400000 }, now, 3, false), false);
  assert.equal(reviewDue({ n: 1, last: now - 50 * 86400000 }, now, 3, false), true);
  assert.equal(reviewDue({ n: 3, last: 0 }, now, 10, false), false);
});

test('connexion Apple / Google : le jeton reçoit l’empreinte du nonce, Supabase le nonce lui-même', async () => {
  globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
  const { nonces, socialProviders, cancelled } = await import('../js/social.js');
  const { raw, hashed } = await nonces();
  const h = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))).toString('hex');
  assert.equal(hashed, h);
  assert.deepEqual(socialProviders(), []); /* hors application : aucun bouton */
  assert.ok(cancelled(new Error('The user canceled the sign-in flow.')));
  assert.ok(!cancelled(new Error('invalid audience')));
  assert.equal(typeof SOCIAL.apple, 'boolean');
  assert.ok(Number.isInteger(PUSH_ANDROID) && (PUSH_ANDROID === 0 || PUSH_ANDROID >= 921), 'Android : seulement les builds qui contiennent google-services.json (le 920 ne l’a pas)');
});

test('tableau de bord : SQL réservé au créateur, sans e-mail ni pseudo, et vérifié par l’état du serveur', async () => {
  const sql = fs.readFileSync(new URL('../supabase/22-tableau-de-bord.sql', import.meta.url), 'utf8');
  assert.match(sql, /badge = 'createur'/);
  assert.match(sql, /revoke execute on function public\.createur_stats\(\) from public, anon/);
  assert.doesNotMatch(sql.replace(/--.*$/gm, ''), /'email'|'pseudo'/);
  assert.match(fs.readFileSync(new URL('../js/screens/server-state.js', import.meta.url), 'utf8'), /22-tableau-de-bord\.sql/);
  globalThis.document ??= undefined;
  const { dashboardHTML } = await import('../js/screens/dashboard.js').catch(() => ({}));
  if (dashboardHTML) {
    const html = dashboardHTML({ comptes: 10, actifs: { jour: 2, semaine: 5 }, nouveaux: { semaine: 3 }, etapes: [{ k: 'compte', n: 10 }, { k: 'gardien', n: 4 }], retour: { j1: 3, j1_base: 6 }, jours: [{ d: '2026-10-30', n: 2 }], telephones: { ios: 1 } });
    assert.match(html, /Premier gardien vaincu/); assert.match(html, /6 arrêtés ici/); assert.match(html, /50 %/);
  }
});

test('notifications : une adresse Android garde ses majuscules', () => {
  const sql = fs.readFileSync(new URL('../supabase/17-notifications.sql', import.meta.url), 'utf8');
  assert.match(sql, /case when p_platform = 'ios' then lower\(p_token\) else p_token end/);
});
