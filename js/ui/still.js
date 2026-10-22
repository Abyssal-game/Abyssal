// v609 : copie fixe (première image) d'une image animée, pour les écrans qui la répètent beaucoup (déchirure d'un booster :
// le sachet y est copié 14 fois ; ouverture : le dos de carte jusqu'à 6 fois). Sur iPhone, 14 grandes images animées
// redessinées 10 fois par seconde épuisaient la mémoire et fermaient l'app.
const cache = new Map(); // adresse absolue → Promise<adresse de la copie fixe (blob:) ou adresse d'origine>
const done = new Map(); // adresse absolue → adresse prête (pour un usage immédiat)
const abs = (u) => new URL(u, document.baseURI).href;

export function stillOf(url) {
  if (!url || typeof document === 'undefined') return Promise.resolve(url);
  const key = abs(url);
  if (!cache.has(key)) {
    cache.set(key, new Promise((res) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0);
          c.toBlob((b) => { const u = b ? URL.createObjectURL(b) : key; done.set(key, u); res(u); }, 'image/webp', 0.9);
        } catch (e) { done.set(key, key); res(key); }
      };
      img.onerror = () => { done.set(key, key); res(key); };
      img.src = key;
    }));
  }
  return cache.get(key);
}
// copie fixe déjà prête, sinon null
export const stillNow = (url) => (url ? done.get(abs(url)) || null : null);
// adresse du dos de carte actuel (variable --card-back posée par setCardBack)
export function backUrl() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--card-back');
  const m = /url\(["']?([^"')]+)["']?\)/.exec(v || '');
  return m ? m[1] : null;
}
