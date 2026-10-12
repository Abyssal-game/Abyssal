// Service worker d'ABYSSAL : l'application et les données sont mises en cache
// pour fonctionner hors ligne après une première visite. Incrémenter VERSION à
// chaque publication pour que les joueurs reçoivent la mise à jour.
const VERSION = 'abyssal-v90';
const CORE = [
  './', 'index.html', 'manifest.webmanifest',
  'css/base.css', 'css/card.css', 'css/screens.css', 'css/army.css',
  'js/main.js', 'js/config.js',
  'js/core/catalog.js', 'js/core/game.js', 'js/core/save.js', 'js/core/boosters.js',
  'js/art/geometry.js', 'js/art/scenes.js', 'js/art/creatures.js', 'js/art/procedural.js', 'js/art/assets.js',
  'js/ui/dom.js', 'js/ui/icons.js', 'js/ui/card.js', 'js/ui/sound.js',
  'js/screens/home.js', 'js/screens/collection.js', 'js/screens/shop.js', 'js/screens/opening.js', 'js/screens/detail.js',
  'js/screens/bestiary.js', 'js/screens/factions.js', 'js/screens/achievements.js', 'js/screens/profile.js',
  'js/screens/settings.js', 'js/screens/ritual.js', 'js/screens/chest-open.js', 'js/screens/descent.js', 'js/screens/items.js', 'js/screens/account.js', 'js/screens/creator.js', 'js/screens/menu.js', 'js/screens/welcome.js', 'js/cloud/cloud.js', 'js/cloud/sync.js', 'js/cloud/presence.js', 'js/ui/tutos.js', 'js/core/descent.js', 'js/core/skills.js', 'js/ui/coach.js',
  'js/core/army.js', 'js/core/duel.js', 'js/screens/army.js', 'js/screens/duel-ui.js', 'js/ui/chest.js', 'js/ui/scene.js',
  'data/factions.json', 'data/sets.json', 'data/abilities.json', 'data/achievements.json', 'data/lore.json',
  'data/cards/infernal.json', 'data/cards/abyssal.json', 'data/cards/celeste.json', 'data/cards/sauvage.json',
  'data/cards/necrotique.json', 'data/cards/primordial.json', 'data/cards/artificiel.json',
  'assets/art/manifest.json',
  ...['standard', 'premium', 'event', 'infernal', 'abyssal', 'celeste', 'sauvage', 'necrotique', 'primordial', 'artificiel'].map((k) => `assets/packs/${k}.webp`),
  'assets/backs/back.webp', 'assets/brand/emblem.webp', 'assets/brand/title.webp', 'assets/brand/loading.webp', 'assets/brand/seal-big.webp',
  ...['bg-1', 'bg-2', 'bg-3', 'bg-4', 'bg-boss'].map((k) => `assets/battle/${k}.webp`),
  ...['home', 'descent', 'shop', 'collection', 'team', 'chests', 'bestiary', 'trophies', 'profile', 'menu', 'factions', 'door-fight', 'door-elite', 'door-boss', 'rest', 'altar', 'treasure'].map((k) => `assets/scenes/${k}.webp`),
  ...['holo', 'gold-leaf', 'gold-frame', 'cosmic', 'cosmic-frame', 'seal-frame'].map((k) => `assets/variants/${k}.webp`),
  ...['tuto-1', 'tuto-2', 'tuto-3', 'tuto-4', 'tile-boosters', 'tile-adventure', 'today', 'bn-collection', 'bn-standard', 'bn-faction', 'bn-event', 'bn-premium', 'bn-rule', 'bn-expedition', 'bn-ranking', 'open-bg', 'open-epic', 'chest-bg', 'bn-victory', 'bn-defeat', 'bn-trophies', 'bn-bestiary', 'bn-settings', 'bn-profile', 'bn-weekly', 'bn-streak'].map((k) => `assets/ui/${k}.webp`),
  ...['booster', 'book', 'crystal', 'holo', 'ritual', 'depth', 'crown', 'chest', 'cards', 'swords', 'dodge', 'seal', 'hunt', 'streak', 'tab-home', 'tab-collection', 'tab-boosters', 'tab-adventure', 'tab-more', 'avatar', 'showcase', 'illus', 'team', 'history', 'stat-atk', 'stat-hp', 'role-garde', 'role-assaut', 'role-soin', 'role-venin', 'role-gel', 'role-cri', 'role-deferlante', 'in-hit', 'in-heavy', 'in-charge', 'in-channel', 'in-blast', 'in-shield', 'in-heal', 'in-rally', 'in-poison', 'in-frost', 'st-poison', 'st-frost', 'st-shield', 'st-mark', 'st-defend', 'st-guard', 'st-exposed', 'st-slow', 'st-broken', 'set-game', 'set-tutos', 'set-save', 'set-about', 'online'].map((k) => `assets/icons/${k}.webp`),
  ...['slash', 'impact', 'dodge', 'heal', 'venom', 'frost', 'seal', 'death', 'd20', 'd20-crit', 'd20-fumble'].map((k) => `assets/fx/${k}.webp`),
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
  // Prototype v2 : toujours le réseau d'abord (il change souvent), le cache en secours hors ligne
  if (url.pathname.includes('/v2/')) {
    e.respondWith(fetch(req).then((res) => { if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone())); return res; }).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  // Application : cache d'abord (version figée), réseau en secours
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && url.pathname.match(/\.(js|css|json|png|webp|webmanifest|html)$/)) caches.open(VERSION).then((c) => c.put(req, res.clone()));
    return res;
  }).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
