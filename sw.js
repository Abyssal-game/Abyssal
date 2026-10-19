// Service worker d'ABYSSAL : l'application et les données sont mises en cache
// pour fonctionner hors ligne après une première visite. Incrémenter VERSION à
// chaque publication pour que les joueurs reçoivent la mise à jour.
const VERSION = 'abyssal-v490';
const ART_CACHE = 'abyssal-media';  // images du jeu : gardées entre les versions
const FONT_CACHE = 'abyssal-fonts';
const CORE = [
  './', 'index.html', 'manifest.webmanifest',
  'css/base.css', 'css/card.css', 'css/screens.css', 'css/army.css', 'css/diorama.css',
  'js/main.js', 'js/config.js', 'js/native.js',
  'js/core/catalog.js', 'js/core/game.js', 'js/core/save.js', 'js/core/boosters.js', 'js/core/bosses.js', 'js/core/relations.js', 'js/core/pacts.js', 'js/core/forms.js', 'js/core/relics.js', 'js/core/sceaux.js', 'js/screens/sceaux.js', 'js/screens/games.js', 'js/core/encheres.js', 'js/core/pacte.js', 'js/core/cryptes.js', 'js/screens/encheres.js', 'js/screens/pacte.js', 'js/screens/cryptes.js', 'js/core/lore.js',
  'js/art/geometry.js', 'js/art/scenes.js', 'js/art/creatures.js', 'js/art/procedural.js', 'js/art/assets.js',
  'js/ui/dom.js', 'js/ui/icons.js', 'js/ui/card.js', 'js/ui/sound.js', 'js/ui/music.js', 'js/ui/diorama.js',
  'js/screens/home.js', 'js/screens/collection.js', 'js/screens/shop.js', 'js/screens/opening.js', 'js/screens/detail.js',
  'js/screens/bestiary.js', 'js/screens/factions.js', 'js/screens/achievements.js', 'js/screens/profile.js',
  'js/screens/settings.js', 'js/screens/furnace.js', 'js/screens/shadow.js', 'js/screens/forge.js', 'js/screens/chest-open.js', 'js/screens/descent.js', 'js/screens/trials.js', 'js/screens/account.js', 'js/screens/creator.js', 'js/screens/menu.js', 'js/screens/welcome.js', 'js/cloud/cloud.js', 'js/cloud/sync.js', 'js/cloud/presence.js', 'js/ui/tutos.js', 'js/ui/report.js', 'js/ui/gate.js', 'js/ui/sceaux-demo.js', 'js/core/moderation.js', 'js/core/descent.js', 'js/core/story.js', 'js/core/skills.js', 'js/ui/coach.js',
  'js/core/army.js', 'js/core/duel.js', 'js/core/kits.js', 'js/core/kits-data.js', 'js/core/synergy.js', 'js/core/renown.js', 'js/core/unlocks.js', 'js/screens/army.js', 'js/screens/duel-ui.js', 'js/ui/chest.js', 'js/ui/scene.js',
  'data/factions.json', 'data/sets.json', 'data/abilities.json', 'data/achievements.json', 'data/lore.json',
  'data/cards/infernal.json', 'data/cards/abyssal.json', 'data/cards/celeste.json', 'data/cards/sauvage.json',
  'data/cards/necrotique.json', 'data/cards/primordial.json', 'data/cards/artificiel.json',
  'assets/art/manifest.json',
  ...['standard', 'premium', 'event', 'infernal', 'abyssal', 'celeste', 'sauvage', 'necrotique', 'primordial', 'artificiel', 'abysse', 'abysse2', 'standard2', 'event2'].map((k) => `assets/packs/${k}.webp`),
  'assets/backs/back.webp', 'assets/brand/emblem.webp', 'assets/brand/title.webp', 'assets/brand/loading.webp',
  ...['bg-1', 'bg-2', 'bg-3', 'bg-4', 'bg-boss', 'f-1', 'f-2', 'f-3', 'f-4', 'f-5', 'f-6', 'f-7', 'f-8', 'f-9', 'f-10', 'f-11', 'f-12', 'f-13', 'f-14', 'f-15', 'f-16', 'g-1', 'g-2', 'g-3', 'g-4', 'g-5', 'g-6', 'g-7', 'g-8'].map((k) => `assets/battle/${k}.webp`),
  ...['home', 'descent', 'shop', 'collection', 'team', 'chests', 'bestiary', 'trophies', 'profile', 'menu', 'factions', 'door-fight', 'door-elite', 'door-boss', 'door-gouffre', 'door-epreuve', 'rest', 'altar', 'treasure'].map((k) => `assets/scenes/${k}.webp`),
  ...['infernal', 'abyssal', 'celeste', 'necrotique', 'sauvage', 'primordial', 'artificiel'].map((k) => `assets/factions/${k}.webp`),
  ...['holo', 'gold-leaf', 'gold-frame', 'cosmic', 'cosmic-frame', 'seal-frame', 'enluminee-frame', 'enluminee-frame2', 'abyssale-frame', 'argentee-frame', 'argentee-frame2'].map((k) => `assets/variants/${k}.webp`),
  ...['tuto-1', 'tuto-2', 'tuto-3', 'tuto-4', 'today', 'bn-collection', 'bn-standard', 'bn-faction', 'bn-event', 'bn-premium', 'bn-abysse', 'bn-rule', 'bn-expedition', 'bn-ranking', 'open-bg', 'open-epic', 'chest-bg', 'bn-victory', 'bn-defeat', 'bn-trophies', 'bn-bestiary', 'bn-settings', 'bn-profile', 'bn-weekly', 'bn-streak', 'bn-cursed', 'btn-red', 'btn-dark', 'bless-frame', 'plate-title', 'ribbon', 'crest-victory', 'crest-defeat', 'bn-level', 'bn-achieve', 'rar-C', 'rar-PC', 'rar-R', 'rar-HR', 'rar-M', 'rar-S', 'slot-gold', 'slot-silver', 'bn-ritual', 'bn-sceaux', 'bn-encheres', 'bn-jeux', 'bn-pacte', 'bn-cryptes', 'bn-furnace', 'bn-shadow', 'bn-descente', 'bn-boosters', 'bn-renfort'].map((k) => `assets/ui/${k}.webp`),
  ...['sc-rule-classique', 'sc-rule-sacre', 'sc-rule-identique', 'sc-rule-somme', 'booster', 'book', 'crystal', 'holo', 'ritual', 'depth', 'crown', 'chest', 'cards', 'swords', 'dodge', 'seal', 'hunt', 'streak', 'tab-home', 'tab-collection', 'tab-boosters', 'tab-butin', 'tab-adventure', 'tab-more', 'avatar', 'showcase', 'illus', 'team', 'history', 'stat-atk', 'stat-hp', 'hp-ring', 'role-garde', 'role-assaut', 'role-soin', 'role-venin', 'role-gel', 'role-cri', 'role-deferlante', 'gem-fv', 'gem-fv0', 'gem-ap', 'gem-ap0', 'crest-boss', 'crest-elite', 'danger', 'power', 'in-hit', 'in-heavy', 'in-charge', 'in-channel', 'in-blast', 'in-shield', 'in-heal', 'in-rally', 'in-poison', 'in-frost', 'st-poison', 'st-frost', 'st-shield', 'st-mark', 'st-defend', 'st-guard', 'st-exposed', 'st-slow', 'st-broken', 'set-game', 'set-tutos', 'set-save', 'set-about', 'online', 'rule', 'torch-on', 'torch-off', 'door-fight', 'door-elite', 'door-boss', 'omen', 'stairs-up', 'stairs-down', 'hand', 'act-attack', 'act-defend', 'act-swap', 'act-rempart', 'act-estoc', 'act-priere', 'act-contagion', 'act-entrave', 'act-marque', 'act-raz', 'discover', 'xp', 'luck', 'titles', 'stats', 'openings', 'genesis', 'chronicles', 'conflicts', 'figures', 'mysteries', 'account', 'settings', 'creator', 'cur-shard', 'cur-ash', 'combo', 'team-ic', 'descend', 'free-pack', 'ticket', 'hourglass', 'feats', 'help'].map((k) => `assets/icons/${k}.webp`),
  // tous les effets de combat (v305 : crit.webp du « Coup fatal » manquait hors ligne → carré « ? » sur iPhone)
  ...['boost', 'break', 'burst', 'collapse', 'crit', 'curse', 'd20', 'd20-crit', 'd20-fumble', 'death', 'dodge', 'fervor', 'frost', 'fx-duo', 'fx-enrage', 'fx-explode', 'fx-rune', 'heal', 'iceshatter', 'impact', 'kill-crack', 'kill-embers', 'kill-shatter', 'parry', 'prey', 'role-claw', 'strike', 'foe-strike', 'crit-strike', 'role-frost', 'role-heal', 'role-mark', 'role-shock', 'role-venom', 'role-wave', 'seal', 'shield', 'slash', 'swallow', 'syn-beam', 'taunt', 'ult-seal', 'venom', 'fx-parry', 'fx-break', 'fx-dodge', 'fx-venom', 'fx-shield', 'fx-taunt', 'fx-boost', 'fx-curse', 'fx-iceshatter', 'fx-prey', 'fx-collapse', 'fx-swallow', 'ult-sceau', 'ult-revive', 'ult-nova', 'ult-smite', 'ult-aegis', 'dice-ring', 'dice-charge', 'dice-perfect', 'dice-land', 'circle-infernal', 'circle-abyssal', 'circle-celeste', 'circle-sauvage', 'circle-necrotique', 'circle-primordial', 'circle-artificiel', 'sk-estoc', 'sk-contagion', 'sk-entrave', 'sk-marque', 'sk-raz', 'sk-rempart', 'sk-priere', 'def-ring', 'def-clash'].map((k) => `assets/fx/${k}.webp`),
  ...['salle', 'salle-artificiel', 'salle-celeste', 'salle-necrotique', 'salle-abyssal', 'plateau', 'case', 'dos', 'benie', 'maudite', 'rival-initie', 'rival-collectionneur', 'rival-stratege', 'rival-maitre', 'rival-echo', 'rival-banquier', 'rival-archiviste', 'rival-souverain', 'salle-pacte', 'salle-cryptes', 'salle-encheres'].map((k) => `assets/sceaux/${k}.webp`),
  ...['cr-plateau', 'cr-dos', 'cr-paire', 'pa-table', 'pa-sceau', 'pa-gardien', 'pa-offrande', 'pa-brisure', 'en-salle', 'en-jeton', 'en-malediction', 'en-marteau'].map((k) => `assets/jeux/${k}.webp`),
  ...['infernal', 'abyssal', 'celeste', 'sauvage', 'necrotique', 'primordial', 'artificiel'].map((k) => `assets/realms/${k}.webp`),
  ...['devoreur', 'matriarche', 'roi', 'architecte', 'eclipse', 'essaim', 'bourreau', 'choeur', 'chaines', 'horloge', 'miroirs', 'golem', 'peste', 'chasseur', 'voeux', 'titan', 'jumeaux', 'juge', 'bete', 'abysse', 'jumeaux-nuit', 'abysse-2'].map((k) => `assets/bosses/${k}.webp`),
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon.png',
  'css/fonts.css', ...['Alegreya-0f8ee632.woff2', 'Alegreya-2e945cf5.woff2', 'Alegreya-88cee5eb.woff2', 'Alegreya-db6a5c78.woff2', 'AlegreyaSans-0c0c571a.woff2', 'AlegreyaSans-2a89a09d.woff2', 'AlegreyaSans-3e467a04.woff2', 'AlegreyaSans-8a53b32d.woff2', 'AlegreyaSans-8bed4c5f.woff2', 'AlegreyaSans-a73a507d.woff2', 'AlegreyaSans-b9a4a97d.woff2', 'AlegreyaSans-f03ce63a.woff2', 'Cinzel-1bec9af0.woff2', 'Cinzel-c0fe750f.woff2'].map((k) => `assets/fonts/${k}`),
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
  // v468 : de même pour les listes des musiques et des sons (une liste périmée rendait une nouvelle musique muette)
  if (/\/assets\/(art|music|sfx)\/manifest\.json$/.test(url.pathname)) {
    e.respondWith(fetch(new Request(req, { cache: 'no-cache' })).then((res) => { if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone())); return res; }).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  // Images (illustrations, icônes, décors, effets) : tout de suite depuis le cache, puis mise à jour
  // discrète en arrière-plan (une image remplacée apparaît à l'ouverture suivante, sans tout
  // retélécharger à chaque version)
  if (url.pathname.includes('/assets/') && /\.(webp|png|jpg|mp3)$/.test(url.pathname)) {
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
      // v365 : les effets de combat (assets/fx) attendent la vérification (réponse « inchangée » très légère) :
      // une ancienne copie sur fond noir ne doit jamais s'afficher avec le code qui suppose la transparence
      if (hit && url.pathname.includes('/assets/fx/')) return (await fresh) || hit;
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
