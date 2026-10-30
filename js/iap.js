// v680 : paiements dans l'app (App Store, plus tard Google Play), par RevenueCat (module natif @revenuecat/purchases-capacitor).
// Le téléphone paie ; il ne se donne rien lui-même : il demande ensuite au serveur de partie (op `iapSync`) de vérifier
// les achats du compte auprès de RevenueCat et de les donner (une seule fois chacun). Hors de l'app, ou dans une app trop
// ancienne pour avoir le module, les achats en euros restent fermés (avec la raison).
import { IAP_KEY, IAP_MIN_BUILD } from './config.js';
import { SHOP } from './core/codex.js';
import * as cloud from './cloud/cloud.js';

const cap = () => (typeof window !== 'undefined' ? window.Capacitor : null);
const P = () => cap()?.Plugins?.Purchases || null;
const PENDING = 'abyssal.iapPending';
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* rien */ } };
let configuredFor = null, products = {}, loading = null;
/* v926 : numéro de build de l'app installée (une app trop ancienne n'a pas les achats validés par le magasin) */
let nativeBuild = 0;
try { cap()?.Plugins?.App?.getInfo?.().then((i) => { nativeBuild = Number(i?.build) || 0; }).catch(() => {}); } catch (e) { /* rien */ }

/* 'ok', ou pourquoi les achats en euros ne sont pas possibles ici */
export function iapStatus() {
  const c = cap();
  if (!c?.isNativePlatform?.()) return 'web';
  if (!(c.isPluginAvailable?.('Purchases') && P())) return 'old-app';
  if (!IAP_KEY[c.getPlatform?.()]) return 'closed';
  if (nativeBuild && nativeBuild < (IAP_MIN_BUILD[c.getPlatform?.()] || 0)) return 'old-app';
  if (!cloud.isLoggedIn()) return 'login';
  return 'ok';
}
/* v908 : sur Android, le magasin est Google Play (Google refuse une app qui renvoie vers l'App Store) */
export const onAndroid = () => cap()?.getPlatform?.() === 'android';
export const IAP_WHY = {
  web: 'Les achats se font dans l’application ABYSSAL (App Store).',
  get 'old-app'() { return onAndroid() ? 'Mets l’application à jour depuis Google Play pour acheter.' : 'Mets l’application à jour depuis l’App Store pour acheter.'; },
  closed: 'Les achats ouvrent bientôt.',
  login: 'Connecte-toi à ton compte pour acheter.',
};

async function ensure() {
  const uid = cloud.currentUser()?.id;
  if (!uid) throw new Error(IAP_WHY.login);
  if (configuredFor === uid) return;
  const p = P();
  if (!configuredFor) await p.configure({ apiKey: IAP_KEY[cap().getPlatform()], appUserID: uid });
  else await p.logIn({ appUserID: uid });
  configuredFor = uid; products = {};
}

/* les prix de l'App Store, dans la monnaie du joueur (chargés une fois) */
export function loadPrices() {
  if (iapStatus() !== 'ok') return Promise.resolve(products);
  if (Object.keys(products).length) return Promise.resolve(products);
  loading ||= (async () => {
    try {
      await ensure();
      const r = await P().getProducts({ productIdentifiers: SHOP.map((x) => x.store), type: 'NON_SUBSCRIPTION' });
      for (const pr of r?.products || []) products[pr.identifier] = pr;
    } catch (e) { /* prix affichés par défaut */ }
    loading = null;
    return products;
  })();
  return loading;
}
export const priceOf = (it) => products[it?.store]?.priceString || it?.price || '';

// Le serveur vérifie et donne ce qui a été payé ; renvoie [{ id, name, give }]
async function claim(app) {
  const got = await app.partie.first('iapSync');
  lsSet(PENDING, null);
  return got || [];
}

/* achat d'un article de SHOP (obsidiennes, Codex enluminé, Pack du Fondateur) ; null si le joueur a annulé */
export async function iapBuy(app, id) {
  const st = iapStatus();
  if (st !== 'ok') throw new Error(IAP_WHY[st]);
  const it = SHOP.find((x) => x.id === id);
  await loadPrices();
  const prod = products[it?.store];
  if (!prod) throw new Error(onAndroid() ? 'Cet article n’est pas disponible sur Google Play pour l’instant. Réessaie plus tard.' : 'Cet article n’est pas disponible sur l’App Store pour l’instant. Réessaie plus tard.');
  lsSet(PENDING, '1'); /* si l'app se ferme avant la vérification, on la refait au prochain lancement */
  try { await P().purchaseStoreProduct({ product: prod }); }
  catch (e) {
    if (e?.userCancelled || String(e?.code) === '1') { lsSet(PENDING, null); return null; }
    lsSet(PENDING, null);
    throw new Error(e?.message ? `Achat impossible : ${e.message}.` : onAndroid() ? 'Achat impossible : erreur de Google Play.' : 'Achat impossible : erreur de l’App Store.');
  }
  try { return await claim(app); }
  catch (e) { throw new Error('Ton achat est bien payé : il sera ajouté dès que le serveur l’aura vérifié (au prochain lancement ou avec « Restaurer mes achats »).'); }
}

/* « Restaurer mes achats » : redemande à l'App Store, puis le serveur donne ce qui manque */
export async function iapRestore(app) {
  const st = iapStatus();
  if (st !== 'ok') throw new Error(IAP_WHY[st]);
  await ensure();
  await P().restorePurchases();
  return claim(app);
}

/* au lancement : un achat payé dont la vérification n'a pas eu lieu (app fermée, réseau coupé) */
export async function iapResume(app) {
  if (lsGet(PENDING) !== '1' || iapStatus() !== 'ok') return [];
  try { await ensure(); return await claim(app); } catch (e) { return []; }
}
