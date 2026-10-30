// v917 : « Continuer avec Apple » (iPhone) et « Continuer avec Google » (iPhone et Android), dans l'application seulement,
// par le module natif SocialLogin (@capgo/capacitor-social-login). Le téléphone reçoit un jeton d'identité signé, que
// Supabase vérifie (cloud.signInIdToken) : pas de mot de passe à inventer. Une application plus ancienne, sans le module,
// ou un fournisseur pas encore réglé (SOCIAL dans js/config.js) : les boutons n'apparaissent pas.
// Le nonce : un nombre tiré au hasard ; Apple et Google reçoivent son empreinte SHA-256 (gravée dans le jeton), Supabase
// le nombre lui-même et vérifie qu'ils correspondent (un jeton volé ne peut pas resservir).
import { SOCIAL } from './config.js';
import * as cloud from './cloud/cloud.js';

const C = () => (typeof window !== 'undefined' ? window.Capacitor : null);
const isNative = () => !!C()?.isNativePlatform?.();
const plugin = () => (isNative() && C()?.isPluginAvailable?.('SocialLogin') ? C().Plugins.SocialLogin : null);
const os = () => C()?.getPlatform?.() || 'web';

export function socialProviders() {
  if (!plugin()) return [];
  const out = [];
  if (os() === 'ios' && SOCIAL.apple) out.push('apple');
  /* règle 4.8 d'Apple : sur iPhone, Google seulement si « Continuer avec Apple » est proposé aussi */
  if (SOCIAL.google?.web && (os() === 'android' || (os() === 'ios' && SOCIAL.google.ios && SOCIAL.apple))) out.push('google');
  return out;
}

let ready = null;
function init(P) {
  if (!ready) {
    ready = P.initialize({
      ...(os() === 'ios' && SOCIAL.apple ? { apple: {} } : {}),
      ...(SOCIAL.google?.web ? { google: { webClientId: SOCIAL.google.web, ...(SOCIAL.google.ios ? { iOSClientId: SOCIAL.google.ios } : {}), mode: 'online' } } : {}),
    }).catch((e) => { ready = null; throw e; });
  }
  return ready;
}

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export async function nonces() {
  const raw = hex(crypto.getRandomValues(new Uint8Array(24)));
  return { raw, hashed: hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))) };
}
export const cancelled = (e) => /cancel|annul|1001|12501|16:|user denied|dismiss/i.test(String(e?.message || e?.code || e));

/* Ouvre la fenêtre d'Apple ou de Google, puis la session Supabase. Renvoie null si le joueur a fermé la fenêtre. */
export async function socialLogin(provider) {
  const P = plugin();
  if (!P) throw new Error('Connexion indisponible sur cet appareil.');
  await init(P);
  const { raw, hashed } = await nonces();
  let r;
  try {
    r = await P.login({ provider, options: provider === 'apple' ? { scopes: ['email'], nonce: hashed } : { scopes: ['email', 'profile'], nonce: hashed } });
  } catch (e) { if (cancelled(e)) return null; throw e; }
  const idToken = r?.result?.idToken;
  if (!idToken) throw new Error('La connexion n’a pas abouti. Réessaie.');
  const u = await cloud.signInIdToken(provider, idToken, raw);
  /* v925 : le code d'autorisation d'Apple part au serveur, qui garde de quoi couper le lien si le compte est supprimé */
  const code = provider === 'apple' ? (r?.result?.authorizationCode || r?.result?.accessToken?.token || '') : '';
  if (code) cloud.appleStore(code).catch(() => {});
  return u;
}
