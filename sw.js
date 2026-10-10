// Service worker d'ABYSSAL : l'application et les données sont mises en cache
// pour fonctionner hors ligne après une première visite. Incrémenter VERSION à
// chaque publication pour que les joueurs reçoivent la mise à jour.
const VERSION = 'abyssal-v30';
const CORE = [
  './', 'index.html', 'manifest.webmanifest',
  'css/base.css', 'css/card.css', 'css/screens.css',
  'js/main.js', 'js/config.js',
  'js/core/catalog.js', 'js/core/game.js', 'js/core/save.js', 'js/core/boosters.js',
  'js/art/geometry.js', 'js/art/scenes.js', 'js/art/creatures.js', 'js/art/procedural.js', 'js/art/assets.js',
  'js/ui/dom.js', 'js/ui/icons.js', 'js/ui/card.js', 'js/ui/sound.js',
  'js/screens/home.js', 'js/screens/collection.js', 'js/screens/shop.js', 'js/screens/opening.js', 'js/screens/detail.js',
  'js/screens/bestiary.js', 'js/screens/factions.js', 'js/screens/achievements.js', 'js/screens/profile.js',
  'js/screens/settings.js', 'js/screens/fusion.js', 'js/screens/ritual.js', 'js/screens/descent.js', 'js/screens/items.js', 'js/screens/account.js', 'js/screens/creator.js', 'js/cloud/cloud.js', 'js/cloud/sync.js', 'js/core/descent.js',
  'data/factions.json', 'data/sets.json', 'data/abilities.json', 'data/achievements.json', 'data/lore.json',
  'data/cards/infernal.json', 'data/cards/abyssal.json', 'data/cards/celeste.json', 'data/cards/sauvage.json',
  'data/cards/necrotique.json', 'data/cards/primordial.json', 'data/cards/artificiel.json',
  'assets/art/manifest.json',
  ...['standard', 'premium', 'event', 'infernal', 'abyssal', 'celeste', 'sauvage', 'necrotique', 'primordial', 'artificiel'].map((k) => `assets/packs/${k}.webp`),
  'assets/backs/back.webp',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Polices Google : cache au fil de l'eau
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) {
    e.respondWith(caches.open(VERSION + '-fonts').then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); c.put(req, res.clone()); return res; } catch (err) { return Response.error(); }
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // Liste des illustrations : toujours le réseau d'abord, pour voir les nouvelles images sans attendre
  if (url.pathname.endsWith('/assets/art/manifest.json')) {
    e.respondWith(fetch(req).then((res) => { if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone())); return res; }).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  // Illustrations définitives : réseau, puis cache
  if (url.pathname.includes('/assets/art/') && !url.pathname.endsWith('manifest.json')) {
    e.respondWith(caches.open(VERSION + '-art').then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  // Application : cache d'abord (version figée), réseau en secours
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && url.pathname.match(/\.(js|css|json|png|webp|webmanifest|html)$/)) caches.open(VERSION).then((c) => c.put(req, res.clone()));
    return res;
  }).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
