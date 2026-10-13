// Service worker d'ABYSSAL : l'application et les données sont mises en cache
// pour fonctionner hors ligne après une première visite. Incrémenter VERSION à
// chaque publication pour que les joueurs reçoivent la mise à jour.
const VERSION = 'abyssal-v183';
const ART_CACHE = 'abyssal-media';  // images du jeu : gardées entre les versions
const FONT_CACHE = 'abyssal-fonts';
const CORE = [
  './', 'index.html', 'manifest.webmanifest',
  'css/base.css', 'css/card.css', 'css/screens.css', 'css/army.css',
  'js/main.js', 'js/config.js',
  'js/core/catalog.js', 'js/core/game.js', 'js/core/save.js', 'js/core/boosters.js', 'js/core/bosses.js', 'js/core/relations.js', 'js/core/pacts.js', 'js/core/forms.js', 'js/core/relics.js', 'js/core/sceaux.js', 'js/screens/sceaux.js', 'js/screens/trial.js', 'js/core/lore.js',
  'js/art/geometry.js', 'js/art/scenes.js', 'js/art/creatures.js', 'js/art/procedural.js', 'js/art/assets.js',
  'js/ui/dom.js', 'js/ui/icons.js', 'js/ui/card.js', 'js/ui/sound.js',
  'js/screens/home.js', 'js/screens/collection.js', 'js/screens/shop.js', 'js/screens/opening.js', 'js/screens/detail.js',
  'js/screens/bestiary.js', 'js/screens/factions.js', 'js/screens/achievements.js', 'js/screens/profile.js',
  'js/screens/settings.js', 'js/screens/furnace.js', 'js/screens/shadow.js', 'js/screens/forge.js', 'js/screens/salles.js', 'js/core/dungeon.js', 'js/core/powers.js', 'js/screens/chest-open.js', 'js/screens/descent.js', 'js/screens/items.js', 'js/screens/account.js', 'js/screens/creator.js', 'js/screens/menu.js', 'js/screens/welcome.js', 'js/cloud/cloud.js', 'js/cloud/sync.js', 'js/cloud/presence.js', 'js/ui/tutos.js', 'js/core/descent.js', 'js/core/skills.js', 'js/ui/coach.js',
  'js/core/army.js', 'js/core/duel.js', 'js/screens/army.js', 'js/screens/duel-ui.js', 'js/ui/chest.js', 'js/ui/scene.js',
  'data/factions.json', 'data/sets.json', 'data/abilities.json', 'data/achievements.json', 'data/lore.json', 'data/powers.json',
  'data/cards/infernal.json', 'data/cards/abyssal.json', 'data/cards/celeste.json', 'data/cards/sauvage.json',
  'data/cards/necrotique.json', 'data/cards/primordial.json', 'data/cards/artificiel.json',
  'assets/art/manifest.json',
  ...['standard', 'premium', 'event', 'infernal', 'abyssal', 'celeste', 'sauvage', 'necrotique', 'primordial', 'artificiel'].map((k) => `assets/packs/${k}.webp`),
  'assets/backs/back.webp', 'assets/brand/emblem.webp', 'assets/brand/title.webp', 'assets/brand/loading.webp', 'assets/brand/seal-big.webp',
  ...['bg-1', 'bg-2', 'bg-3', 'bg-4', 'bg-boss', 'f-1', 'f-2', 'f-3', 'f-4', 'f-5', 'f-6', 'f-7', 'f-8', 'f-9', 'f-10', 'f-11', 'f-12', 'f-13', 'f-14', 'f-15', 'f-16', 'g-1', 'g-2', 'g-3', 'g-4', 'g-5', 'g-6', 'g-7', 'g-8'].map((k) => `assets/battle/${k}.webp`),
  ...['home', 'descent', 'shop', 'collection', 'team', 'chests', 'bestiary', 'trophies', 'profile', 'menu', 'factions', 'door-fight', 'door-elite', 'door-boss', 'rest', 'altar', 'treasure'].map((k) => `assets/scenes/${k}.webp`),
  ...['infernal', 'abyssal', 'celeste', 'necrotique', 'sauvage', 'primordial', 'artificiel'].map((k) => `assets/factions/${k}.webp`),
  ...['holo', 'gold-leaf', 'gold-frame', 'cosmic', 'cosmic-frame', 'seal-frame'].map((k) => `assets/variants/${k}.webp`),
  ...['tuto-1', 'tuto-2', 'tuto-3', 'tuto-4', 'tile-boosters', 'tile-adventure', 'today', 'bn-collection', 'bn-standard', 'bn-faction', 'bn-event', 'bn-premium', 'bn-rule', 'bn-expedition', 'bn-ranking', 'open-bg', 'open-epic', 'chest-bg', 'bn-victory', 'bn-defeat', 'bn-trophies', 'bn-bestiary', 'bn-settings', 'bn-profile', 'bn-weekly', 'bn-streak', 'bn-cursed', 'btn-red', 'btn-dark', 'bless-frame', 'plate-title', 'ribbon', 'crest-victory', 'crest-defeat', 'bn-level', 'bn-achieve', 'rar-C', 'rar-PC', 'rar-R', 'rar-HR', 'rar-M', 'rar-S', 'slot-gold', 'slot-silver', 'bn-ritual', 'bn-sceaux', 'bn-salles', 'bn-furnace', 'bn-shadow', 'bn-descente'].map((k) => `assets/ui/${k}.webp`),
  ...['table', 'floor', 'wall', 'pillar', 'door-closed', 'door-open', 'chest-closed', 'chest-open', 'portal', 'trap', 'goule', 'base-ally', 'base-enemy', 'base-elite', 'base-boss', 'card-power', 'card-item', 'card-back', 'd20', 'd6', 'frame'].map((k) => `assets/salles/${k}.webp`),
  ...['booster', 'book', 'crystal', 'holo', 'ritual', 'depth', 'crown', 'chest', 'cards', 'swords', 'dodge', 'seal', 'hunt', 'streak', 'tab-home', 'tab-collection', 'tab-boosters', 'tab-adventure', 'tab-more', 'avatar', 'showcase', 'illus', 'team', 'history', 'stat-atk', 'stat-hp', 'role-garde', 'role-assaut', 'role-soin', 'role-venin', 'role-gel', 'role-cri', 'role-deferlante', 'gem-fv', 'gem-fv0', 'gem-ap', 'gem-ap0', 'crest-boss', 'crest-elite', 'danger', 'power', 'in-hit', 'in-heavy', 'in-charge', 'in-channel', 'in-blast', 'in-shield', 'in-heal', 'in-rally', 'in-poison', 'in-frost', 'st-poison', 'st-frost', 'st-shield', 'st-mark', 'st-defend', 'st-guard', 'st-exposed', 'st-slow', 'st-broken', 'set-game', 'set-tutos', 'set-save', 'set-about', 'online', 'rule', 'torch-on', 'torch-off', 'door-fight', 'door-elite', 'door-boss', 'stairs-up', 'stairs-down', 'hand', 'act-attack', 'act-defend', 'act-swap', 'act-rempart', 'act-estoc', 'act-priere', 'act-contagion', 'act-entrave', 'act-marque', 'act-raz', 'discover', 'xp', 'luck', 'titles', 'stats', 'openings', 'genesis', 'chronicles', 'conflicts', 'figures', 'mysteries', 'account', 'settings', 'creator', 'cur-shard', 'cur-ash', 'combo', 'team-ic', 'descend', 'free-pack', 'ticket', 'hourglass', 'feats', 'help'].map((k) => `assets/icons/${k}.webp`),
  ...['slash', 'impact', 'dodge', 'heal', 'venom', 'frost', 'seal', 'death', 'd20', 'd20-crit', 'd20-fumble'].map((k) => `assets/fx/${k}.webp`),
  ...['salle', 'salle-artificiel', 'salle-celeste', 'salle-necrotique', 'salle-abyssal', 'plateau', 'case', 'dos', 'benie', 'maudite', 'rival-initie', 'rival-collectionneur', 'rival-stratege', 'rival-maitre', 'rival-echo'].map((k) => `assets/sceaux/${k}.webp`),
  ...['infernal', 'abyssal', 'celeste', 'sauvage', 'necrotique', 'primordial', 'artificiel'].map((k) => `assets/realms/${k}.webp`),
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon.png',
];

// Une nouvelle version s'installe d'elle-même, sans attendre que toutes les fenêtres soient fermées
// (sur iPhone, une app « fermée » reste souvent ouverte en arrière-plan) ; la page se recharge alors seule.
// « reload » : on télécharge les fichiers frais, jamais une copie gardée par le navigateur.
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  // Les illustrations et les polices gardent leur cache d'une version à l'autre (elles ne changent presque jamais)
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== ART_CACHE && k !== FONT_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Polices Google : cache au fil de l'eau
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) {
    e.respondWith(caches.open(FONT_CACHE).then(async (c) => {
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
  // Images (illustrations, icônes, décors, effets) : tout de suite depuis le cache, puis mise à jour
  // discrète en arrière-plan (une image remplacée apparaît à l'ouverture suivante, sans tout
  // retélécharger à chaque version)
  if (url.pathname.includes('/assets/') && /\.(webp|png|jpg)$/.test(url.pathname)) {
    e.respondWith(caches.open(ART_CACHE).then(async (c) => {
      const hit = await c.match(req);
      // une seule vérification par version du jeu (réponse « inchangée » très légère si l'image n'a pas bougé)
      if (hit && hit.headers.get('x-sw-ver') === VERSION) return hit;
      // revalidation auprès du serveur (pas du cache HTTP du navigateur) : une image remplacée arrive vraiment
      const fresh = fetch(new Request(req, { cache: 'no-cache' })).then(async (res) => {
        if (!res.ok) return null;
        const h = new Headers(res.headers); h.set('x-sw-ver', VERSION);
        const body = await res.clone().blob();
        await c.put(req, new Response(body, { status: res.status, statusText: res.statusText, headers: h }));
        return res;
      }).catch(() => null);
      if (hit) { e.waitUntil(fresh); return hit; }
      return (await fresh) || Response.error();
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
