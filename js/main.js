// Point d'entrée : chargement des données, état du joueur, navigation.
import { loadCatalogData, createCatalog } from './core/catalog.js';
import { Game } from './core/game.js';
import { loadArtManifest, artUrl, hasRealArt } from './art/assets.js';
import { setCardCatalog, setFameLookup, setApexLookup, setFavLookup } from './ui/card.js';
import { MAX_LEVEL } from './core/army.js';
import { fameTier } from './core/renown.js';
import { icon, EMBLEM } from './ui/icons.js';
import { toast, esc, fmt, reducedMotion, closeTopSheet, openSheet, handlePopstate, afterHistory } from './ui/dom.js';
import { sfx, configureSound, audioCtx, audioCtxIfAny } from './ui/sound.js';
import { musicRoute, configureMusic } from './ui/music.js';
import { VERSION } from './config.js';
import { openCardDetail } from './screens/detail.js';

import homeScreen from './screens/home.js';
import collectionScreen from './screens/collection.js';
import shopScreen from './screens/shop.js';
import bestiaryScreen from './screens/bestiary.js';
import factionsScreen from './screens/factions.js';
import achievementsScreen from './screens/achievements.js';
import profileScreen from './screens/profile.js';
import settingsScreen from './screens/settings.js';
import descentScreen from './screens/descent.js';
import accountScreen from './screens/account.js';
import menuScreen from './screens/menu.js';
import sceauxScreen from './screens/sceaux.js';
import masquesScreen from './screens/masques.js';
import gamesScreen from './screens/games.js';
import encheresScreen from './screens/encheres.js';
import enigmesScreen from './screens/enigmes.js';
import trialsScreen from './screens/trials.js';
import shadowScreen, { claimShadowPrize } from './screens/shadow.js';
import { forgeScreen, furnaceScreen } from './screens/forge.js';
import { teamScreen, chestsScreen } from './screens/army.js';
import { startSync, sync, onSync } from './cloud/sync.js';
import { consumeAuthHash, isLoggedIn } from './cloud/cloud.js';
import { startPresence } from './cloud/presence.js';
import { showWelcome } from './screens/welcome.js';
import { showGate } from './ui/gate.js';
import { onAuth } from './cloud/cloud.js';
import { setScene } from './ui/scene.js';
import { initNative, isNative } from './native.js';

const ROUTES = {
  '': homeScreen, antre: homeScreen, collection: collectionScreen, boutique: shopScreen, bestiaire: bestiaryScreen,
  factions: factionsScreen, faction: factionsScreen, succes: achievementsScreen, profil: profileScreen,
  parametres: settingsScreen, descente: descentScreen, compte: accountScreen, menu: menuScreen, equipe: teamScreen, coffres: chestsScreen, heros: descentScreen, arsenal: chestsScreen, marchand: descentScreen, sceaux: sceauxScreen, masques: masquesScreen, encheres: encheresScreen, enigmes: enigmesScreen, jeux: gamesScreen, epreuves: trialsScreen, epreuve: descentScreen, tirage: shadowScreen, renfort: forgeScreen, fournaise: furnaceScreen,
};
const TABS = [
  ['antre', 'tab-home', 'Accueil'], ['collection', 'tab-collection', 'Collection'], ['boutique', 'tab-boosters', 'Boosters'],
  ['descente', 'tab-adventure', 'Aventure'], ['menu', 'tab-more', 'Sanctuaire'],
];
// icônes peintes de la barre du bas (assets/icons)
const tabIcon = (k) => `<img class="tab-pic" alt="" src="assets/icons/${k}.webp">`;
const TAB_OF = { '': 'antre', antre: 'antre', collection: 'collection', boutique: 'boutique', descente: 'descente', menu: 'menu', bestiaire: 'menu', factions: 'menu', faction: 'menu', succes: 'menu', profil: 'menu', parametres: 'menu', compte: 'menu', equipe: 'collection', renfort: 'collection', fournaise: 'collection', coffres: 'descente', heros: 'descente', arsenal: 'descente', marchand: 'descente', sceaux: 'descente', masques: 'descente', encheres: 'descente', enigmes: 'descente', jeux: 'descente', epreuves: 'descente', epreuve: 'descente', tirage: 'boutique' };
// Fond illustré de chaque page (l'Accueil et la Descente posent le leur)
const ROUTE_SCENE = { boutique: 'shop', tirage: 'shadow', renfort: 'collection', fournaise: 'collection', collection: 'collection', equipe: 'team', coffres: 'chests', bestiaire: 'bestiary', succes: 'trophies', profil: 'profile', menu: 'menu', parametres: 'menu', compte: 'menu', factions: 'factions', faction: 'factions' };
// Page parente des sous-pages (bouton retour en haut)
const PARENT = { bestiaire: 'menu', factions: 'bestiaire', faction: 'bestiaire', succes: 'menu', profil: 'menu', parametres: 'menu', compte: 'menu', heros: 'descente', arsenal: 'coffres', marchand: 'descente', sceaux: 'jeux', masques: 'jeux', encheres: 'jeux', enigmes: 'jeux' };
// Sous-onglets de chaque onglet principal (barre en haut de la page)
// v425 : pages rangées sous un autre sous-onglet (allumé sur elles)
const SUB_OF = { fournaise: 'renfort', sceaux: 'jeux', masques: 'jeux', encheres: 'jeux', enigmes: 'jeux' };
const SUBNAV = {
  collection: [['collection', 'cards', 'Cartes'], ['equipe', 'team-ic', 'Équipe'], ['renfort', 'furnace', 'Forge']], /* v422 : Renforcer + Fournaise */
  boutique: [['boutique', 'booster', 'Boosters'], ['tirage', 'shadow', 'Tirage']],
  descente: [['descente', 'descend', 'Descente'], ['epreuves', 'crest-elite', 'Épreuves'], ['jeux', 'seal', 'Jeux'], ['coffres', 'chest', 'Coffres']], /* v422 : les coffres se gagnent dans l'Aventure */
};

function storageOrMemory() {
  try {
    const k = '__abyssal_test__';
    localStorage.setItem(k, '1'); localStorage.removeItem(k);
    return { storage: localStorage, persistent: true };
  } catch (e) {
    const m = new Map();
    return { storage: { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }, persistent: false };
  }
}

const app = {
  route: '', params: [], cleanup: null, state: {}, version: VERSION,
  go(path) { afterHistory(() => { location.hash = '#/' + path; }); },
  back() { history.length > 1 ? history.back() : app.go(''); },
  openCard(id, opts) { return openCardDetail(app, id, opts); },
  reduced() { return reducedMotion(app.game.s.settings); },
  sfx,
  hasRealArt,
  refresh() { render(); },
  chrome() { renderChrome(); },
};
window.__abyssal = app; // accès pour les tests automatisés

function applySettings() {
  const s = app.game.s.settings;
  document.documentElement.classList.toggle('reduce-motion', s.motion === 'reduced');
  document.documentElement.classList.toggle('fx-light', s.quality === 'light');
  configureSound(s);
  configureMusic(s);
}

// Explication des deux monnaies (toucher le compteur en haut à droite)
const WALLET = {
  shards: ['Éclats', 'La monnaie principale. Ils servent à acheter des boosters (onglet Boosters).', 'Tu en gagnes avec l’offrande du jour, les missions, les succès, les nouvelles créatures découvertes la première victoire à chaque étage de la Descente, les Épreuves du jour et les coffres (bois et fer en donnent ; or et abyssal donnent des boosters).', 'boutique', 'Aller aux Boosters'],
  ash: ['Cendres', 'Ce qui reste des cartes brûlées dans la Fournaise. Elles font monter le niveau de tes créatures et permettent de sublimer une carte vers une finition plus rare.', 'Chaque combat gagné dans la Descente en donne, la première victoire à chaque étage encore plus, et les coffres aussi. Brûle tes doublons dans la Fournaise (Collection → Forge) : plus la carte est rare, plus elle en donne, et les finitions rares encore plus.', 'fournaise', 'Aller à la Fournaise'],
};
// iPhone, app posée sur l'écran d'accueil : la hauteur annoncée par le navigateur peut être plus
// courte que l'écran réel (une bande noire reste en bas). On mesure la vraie hauteur et on la donne
// au CSS (--app-h) pour que les pages plein écran et la barre d'onglets aillent jusqu'en bas.
function fitHeight() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  // installée sur l'écran d'accueil, en portrait, le jeu occupe tout l'écran : on prend sa hauteur réelle
  const h = standalone && innerHeight > innerWidth ? Math.max(screen.height, innerHeight) : innerHeight;
  document.documentElement.style.setProperty('--app-h', `${h}px`);
  // partie de l'écran que l'iPhone peut ne pas afficher sous la zone visible : le bas des pages plein écran remonte d'autant
  // v336 : la hauteur vraiment visible est la plus petite des mesures du navigateur (sur l'app posée à l'écran
  // d'accueil, innerHeight peut annoncer tout l'écran alors qu'une bande en bas n'affiche rien)
  const vis = Math.min(innerHeight, window.visualViewport?.height || innerHeight, document.documentElement.clientHeight || innerHeight);
  document.documentElement.style.setProperty('--vh-gap', `${Math.max(0, Math.round(h - vis))}px`);
  document.documentElement.classList.toggle('standalone', !!standalone);
}
window.visualViewport?.addEventListener('resize', () => fitHeight());
fitHeight();
addEventListener('resize', fitHeight);
addEventListener('orientationchange', () => setTimeout(fitHeight, 300));

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-wallet]');
  if (!b) return;
  const [name, what, how, route, go] = WALLET[b.dataset.wallet];
  const n = b.dataset.wallet === 'shards' ? app.game.s.shards : app.game.s.ash;
  const sh = openSheet(`<div class="wal-sheet"><span class="wal-big">${icon(b.dataset.wallet === 'shards' ? 'crystal' : 'ash')}</span><h2>${name}</h2><p class="wal-n">${fmt(n)}</p><p>${what}</p><p class="small muted">${how}</p><a class="btn primary block" href="#/${route}">${go}</a></div>`, { label: name });
  sh.body.querySelector('a').addEventListener('click', () => sh.close());
});

function renderChrome() {
  const g = app.game, s = g.s, lv = g.levelInfo();
  const avatarCard = s.avatar && g.catalog.get(s.avatar);
  const top = document.getElementById('topbar');
  const parent = PARENT[app.route];
  top.innerHTML = `
    ${parent !== undefined ? `<a class="top-back" href="#/${parent}" aria-label="Retour" data-parent="${parent}">${icon('back')}</a>` : ''}
    <a class="top-brand" href="#/profil" aria-label="Profil : niveau ${lv.level}, ${esc(s.title)}">
      <span class="top-avatar pf pf-${s.frame}">${avatarCard ? `<img alt="" src="${artUrl(avatarCard, { lite: true })}">` : EMBLEM}<span class="lv">${lv.level}</span></span>
      <span class="top-meta"><b>${esc(sync.profile?.pseudo || s.name || 'Toi')}</b><span class="xpbar" aria-hidden="true"><i style="width:${(lv.into / lv.need) * 100}%"></i></span></span>
    </a>
    <div class="wallet">
      <button class="pill shards" data-wallet="shards" title="Éclats" aria-label="${fmt(s.shards)} éclats : à quoi ça sert ?">${icon('crystal')}<span>${fmt(s.shards)}</span></button>
      <button class="pill ash" data-wallet="ash" title="Cendres" aria-label="${fmt(s.ash)} cendres : à quoi ça sert ?">${icon('ash')}<span>${fmt(s.ash)}</span></button>
    </div>`;
  // v319 : le bouton retour du haut revient en arrière dans l'historique quand la page précédente est bien le parent,
  // sinon il remplace la page courante : jamais d'entrée d'historique en plus
  top.querySelector('.top-back')?.addEventListener('click', (e) => {
    e.preventDefault();
    const parent = e.currentTarget.dataset.parent;
    if (app.prevHash === `#/${parent}` || (parent === '' && (app.prevHash === '#/' || app.prevHash === ''))) history.back();
    else location.replace(`#/${parent}`);
  });
  const tab = TAB_OF[app.route] ?? 'antre';
  // sous-onglets : seulement sur les pages d'un groupe
  const sub = SUBNAV[tab] && SUBNAV[tab].some(([r]) => r === (SUB_OF[app.route] || app.route)) ? SUBNAV[tab] : null;
  const subBadge = (r) => {
    if (r === 'coffres') return g.chestCount() || '';
    // v404 : pastilles plus calmes — plus de « 99+ » permanent sur la Fournaise ; Renforcer seulement si l'Accueil le conseille aussi
    if (r === 'renfort') return g.goals().some((x) => x.kind === 'forge' && /Renforce/.test(x.title)) ? '↑' : '';
    if (r === 'collection') return nNewSub || '';
    if (r === 'jeux') { if (!g.sceauxOpen()) return ''; const n = g.enigmes().done.filter((x) => !x).length; return n || ''; } /* v427 : énigmes du jour à résoudre */
    if (r === 'epreuves') { const n = g.trials().done.filter((x) => !x).length; return g.team().length >= 3 && n ? n : ''; } /* v407 */
    return '';
  };
  const nNewSub = g.newCount() > 99 ? '99+' : g.newCount();
  const sn = document.getElementById('subnav');
  // v404 : sous-onglets encore fermés cachés (Sceaux avant le premier gardien, Tirage sans compte)
  const shown0 = sub && sub.filter(([r]) => (r !== 'tirage' || isLoggedIn() || app.route === 'tirage'));
  const shown = shown0 && shown0.length > 1 ? shown0 : null; /* v422 : pas de barre pour un seul sous-onglet */
  document.body.classList.toggle('has-subnav', !!shown);
  sn.innerHTML = shown ? shown.map(([r, ic, label]) => { const bd = subBadge(r); return `<a class="sn-tab${r === 'jeux' && !g.sceauxOpen() ? ' locked' : ''}" href="#/${r}"${r === (SUB_OF[app.route] || app.route) ? ' aria-current="page"' : ''}><img class="sn-ic" alt="" src="assets/icons/${ic}.webp"><span>${label}</span>${bd ? `<i class="sn-badge">${bd}</i>` : ''}</a>`; }).join('') : '';
  const nNew = g.newCount();
  const ticketCount = Object.values(s.tickets).reduce((a, b) => a + b, 0) + (g.welcomePending() ? 0 : g.freePack().stock); /* v404 : « 2 » comme l'annonce l'Accueil au tout début */
  document.getElementById('tabbar').innerHTML = TABS.map(([key, ic, label]) => {
    const cur = key === tab ? ' aria-current="page"' : '';
    // moins de pastilles : un chiffre seulement pour ce qui attend d'être ouvert (boosters, coffres), sinon un simple point
    const dot = '<span class="badge dot"></span>';
    const badge = key === 'boutique' && ticketCount ? `<span class="badge">${ticketCount}</span>` /* v404 : les boosters à ouvrir seulement (les coffres ont leur chiffre sur leur sous-onglet) */
      : key === 'collection' && nNew ? dot
      : key === 'antre' && (g.canDailyClaim() || g.missionsToClaim()) ? dot
      : key === 'descente' && g.team().length >= 3 && (g.descent().run || g.trials().done.some((x) => !x)) ? dot : ''; /* v407 : Épreuves du jour à jouer */
    if (key === 'boutique') return `<a class="tab tab-main" href="#/boutique"${cur}><span class="orb">${tabIcon(ic)}</span>${label}${badge}</a>`;
    return `<a class="tab" href="#/${key}"${cur}>${tabIcon(ic)}${label}${badge}</a>`;
  }).join('');
}

let lastShards = null;
let lastTabIdx = -1;
function pulseWallet() {
  const s = app.game.s;
  if (lastShards !== null && s.shards !== lastShards) document.querySelector('.pill.shards')?.classList.add('bump');
  lastShards = s.shards;
}

// Mémoire de défilement : chaque page retrouve sa position quand on y revient.
const scrollMem = new Map();
let scrollKey = null;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
let scrollRaf = 0;
window.addEventListener('scroll', () => {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; if (scrollKey !== null && !document.body.classList.contains('has-sheet')) scrollMem.set(scrollKey, window.scrollY); });
}, { passive: true });

function render() {
  const [route, ...params] = (location.hash.replace(/^#\/?/, '') || '').split('/');
  // v311 : anciennes adresses (fonctions retirées) : renvoyées vers leur page actuelle, sans entrée d'historique en plus
  const ALIAS = { heros: 'descente', marchand: 'descente', epreuve: 'descente', arsenal: 'coffres' };
  if (ALIAS[route]) { location.replace(`#/${ALIAS[route]}`); return; }
  const key = location.hash || '#/';
  if (app.curHash !== key) { app.prevHash = app.curHash; app.curHash = key; }
  const same = key === scrollKey;
  const keepY = same ? window.scrollY : (scrollMem.get(key) || 0);
  scrollKey = null; // pas d'enregistrement pendant le changement de page
  const screen = ROUTES[route] || homeScreen;
  if (app.cleanup) { try { app.cleanup(); } catch (e) { /* rien */ } app.cleanup = null; }
  if (app.route !== (ROUTES[route] ? route : '') && app.game) sfx.nav();
  app.route = ROUTES[route] ? route : '';
  musicRoute(app.route);
  app.params = params.map(decodeURIComponent);
  renderChrome();
  setScene(ROUTE_SCENE[app.route] || null);
  // Nouvel élément à chaque affichage : les écouteurs de l'écran précédent disparaissent avec lui
  // (sinon ils s'accumulent et un toucher déclenche l'action plusieurs fois).
  const old = document.getElementById('view');
  const view = old.cloneNode(false);
  old.replaceWith(view);
  view.classList.remove('view-in');
  if (!same) {
    // changement d'onglet : la page glisse du côté de l'onglet choisi
    const ti = TABS.findIndex(([k]) => k === (TAB_OF[app.route] || 'antre')), dir = lastTabIdx < 0 || ti === lastTabIdx ? 0 : ti > lastTabIdx ? 1 : -1;
    lastTabIdx = ti;
    view.style.setProperty('--vdx', `${dir * 26}px`);
    view.classList.add('view-in');
  }
  view.innerHTML = '';
  app.cleanup = screen(app, view, app.params) || null;
  window.scrollTo(0, keepY);
  scrollKey = key;
  // les images différées peuvent encore ajuster la hauteur : on recolle une fois la page posée
  if (keepY) requestAnimationFrame(() => { if (scrollKey === key && Math.abs(window.scrollY - keepY) > 2) window.scrollTo(0, keepY); });
  setTimeout(autoClaim, 400);
}

// v331 : offrande du jour, missions terminées et coffre de la semaine versés automatiquement, avec une annonce
// (l'étude joueurs montrait des récompenses restées en attente toute une séance faute d'aller les toucher sur l'Accueil)
let claiming = false;
// v364 : quelques secondes après le lancement, les fonds des écrans principaux sont décodés un par un en arrière-plan :
// changer d'onglet ne décode plus une grande image sur le moment (gardés en mémoire tant que l'app tourne)
const warmed = [];
setTimeout(() => {
  const list = ['home', 'collection', 'menu', 'descent', 'shop'].map((n) => `assets/scenes/${n}.webp`).concat('assets/brand/title.webp');
  const next = () => { const u = list.shift(); if (!u) return; const im = new Image(); im.src = u; warmed.push(im); (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => setTimeout(next, 400)); };
  next();
}, 4000);
function autoClaim() {
  const g = app.game;
  if (!g || claiming || document.body.classList.contains('gated') || document.getElementById('boot') || document.querySelector('.opening, .sheet-wrap')) return;
  if (g.welcomePending() || app.route === 'descente' && g.s.descent.run?.phase === 'battle' || app.route === 'epreuves' && g.s.trials?.battle || document.body.classList.contains('battle-mode')) return;
  claiming = true;
  try {
    let any = false;
    if (g.canDailyClaim()) { const r = g.claimDaily(); any = true; toast(`Offrande du jour : <b>+${fmt(r.amount)} éclats</b>${r.streak > 1 ? ` · série de ${r.streak} jours` : ''}${r.chest ? ' et <b>un coffre de fer</b>' : ''}.`, { kind: r.chest ? 'epic' : 'success', icon: 'crystal' }); }
    g.missions().list.forEach((x, i) => { if (x.p >= x.n && !x.claimed) { const r = g.claimMission(i); any = true; toast(`Mission accomplie : ${esc(x.text)} · <b>+${fmt(r.shards)} éclats</b>`, { kind: 'success', icon: 'check' }); } });
    if (g.weekChest().ready) { g.claimWeekChest(); any = true; toast('Coffre de la semaine : <b>un coffre d’or</b> rejoint tes coffres !', { kind: 'epic', icon: 'trophy' }); }
    if (any) { app.sfx.coin?.(); renderChrome(); app.refreshView?.(); }
  } catch (e) { /* une récompense déjà prise ailleurs : rien */ }
  claiming = false;
}

// Notifications de progression (succès, ensembles, niveaux)
function rewardText(r = {}) {
  const parts = [];
  if (r.shards) parts.push(`${fmt(r.shards)} éclats`);
  for (const [k, n] of Object.entries(r.tickets || {})) parts.push(`${n} ticket${n > 1 ? 's' : ''} ${k === 'premium' ? 'premium' : 'standard'}`);
  if (r.title) parts.push(`titre « ${esc(r.title)} »`);
  if (r.frame) parts.push('un cadre de profil');
  const ch = { bois: 'coffre de bois', fer: 'coffre de fer', or: 'coffre d’or', abyssal: 'coffre abyssal' };
  for (const [k, n] of Object.entries(r.chests || {})) parts.push(`${n} ${ch[k] || 'coffre'}`);
  return parts.join(', ');
}
app.rewardText = rewardText;
function onProgress(events) {
  const lv = events.filter((e) => e.kind === 'level');
  if (lv.length > 1) events = [...events.filter((e) => e.kind !== 'level'), { kind: 'level', level: lv[lv.length - 1].level, reward: lv.reduce((r, e) => ({ shards: (r.shards || 0) + (e.reward?.shards || 0), tickets: { ...r.tickets, ...e.reward?.tickets }, title: e.reward?.title || r.title }), {}) }];
  if (events.length > 2) {
    const names = events.map((e) => (e.kind === 'level' ? `niveau ${e.level}` : esc(e.name)));
    const total = events.reduce((t, e) => t + (e.reward?.shards || 0), 0);
    toast(`<b>${events.length} récompenses</b> : ${names.join(', ')}<br><span class="small muted">+${fmt(total)} éclats au total. Détails dans Succès.</span>`, { kind: 'epic', icon: 'trophy', ms: 6000 });
    sfx.achievement();
    return;
  }
  events.forEach((e) => { // v292 : les annonces passent l'une après l'autre (file de toast), le son joue à l'affichage
    const snd = { onShow: () => (e.kind === 'fame' ? sfx.fame : e.kind === 'season' ? sfx.season : sfx.achievement)() };
    if (e.kind === 'achievement') toast(`Succès débloqué : <b>${esc(e.name)}</b><br><span class="small muted">${rewardText(e.reward)}</span>`, { kind: 'ach', ms: 4200 , ...snd });
    if (e.kind === 'set') toast(`Ensemble complété : <b>${esc(e.name)}</b><br><span class="small muted">${rewardText(e.reward)}</span>`, { kind: 'epic', icon: 'star', ms: 5000 , ...snd });
    if (e.kind === 'faction') toast(`Faction complétée : <b>${esc(e.name)}</b><br><span class="small muted">${rewardText(e.reward)}</span>`, { kind: 'epic', icon: 'shield', ms: 5000 , ...snd });
    if (e.kind === 'fame') toast(`Renommée : <b>${esc(e.name)}</b>`, { kind: 'epic', icon: 'star', ms: 4200 , ...snd });
    if (e.kind === 'season') toast(`<b>${esc(e.name)}</b><br><span class="small muted">${rewardText(e.reward)}</span>`, { kind: 'epic', icon: 'trophy', ms: 4600 , ...snd });
    if (e.kind === 'level') toast(`<img class="picon toast-xp" alt="" src="assets/icons/xp.webp"><span>Niveau <b>${e.level}</b> atteint !<br><span class="small">${rewardText(e.reward)}</span></span>`, { kind: 'level', ms: 3800 , ...snd });
  });
}

async function boot() {
  const bootEl = document.getElementById('boot');
  try {
    const [data] = await Promise.all([loadCatalogData('./'), loadArtManifest('./')]);
    const catalog = createCatalog(data);
    setCardCatalog(catalog);
    const { storage, persistent } = storageOrMemory();
    app.catalog = catalog;
    app.game = new Game(catalog, storage);
    app.persistent = persistent;
    setFavLookup((id) => app.game.isFav(id));
    setApexLookup((id) => !!app.game.s.collection[id] && app.game.cardLevel(id) >= MAX_LEVEL);
    setFameLookup((id) => (app.game.s.collection[id] ? fameTier(app.game.s.fame[id]) : 0));
    app.game.on('change', () => { renderChrome(); pulseWallet(); });
    app.game.on('progress', (ev) => (app.pendingProgress ? app.pendingProgress.push(...ev) : onProgress(ev)));
    app.game.on('error', (m) => toast(esc(m), { kind: 'error', icon: 'info', ms: 6000 }));
    app.flushProgress = () => { const ev = app.pendingProgress || []; app.pendingProgress = null; if (ev.length) onProgress(ev); };
    app.applySettings = applySettings;
    applySettings();
    // v318 : lien reçu par e-mail (confirmation d'inscription, mot de passe oublié) : ouvre la session avant tout
    const authLink = consumeAuthHash();
    startSync(app);
    let shownPseudo = null;
    onSync(() => { const ps = sync.profile?.pseudo || null; if (ps !== shownPseudo) { shownPseudo = ps; renderChrome(); } }); /* v422 : le pseudo en ligne s'affiche en haut dès qu'il arrive */
    startPresence();
    setInterval(autoClaim, 5000); /* v422 : l'Accueil n'a plus de boutons « +50 » : on encaisse aussi sans changer de page */
    setTimeout(() => claimShadowPrize(app), 5000); // coffre du Tirage des Ombres de la semaine passée
    lastShards = app.game.s.shards;
    window.addEventListener('hashchange', render);
    render();
    const wait = Math.max(0, (window.__introUntil || 0) - performance.now());
    let done = false;
    const finish = () => { if (done) return; done = true; applySettings(); render(); bootEl.classList.add('out'); setTimeout(() => bootEl.remove(), 900); setTimeout(() => showGate(app, () => showWelcome(app)), 700); };
    // v325 : compte obligatoire — après une déconnexion ou une suppression du compte, l'écran de compte revient
    onAuth((sess) => { if (!sess && done) setTimeout(() => showGate(app), 300); });
    // v293 : iPhone et navigateurs n'autorisent le son qu'après un premier toucher. L'écran d'ouverture attend donc
    // « Touche pour entrer » : ce toucher lance la musique et les sons dès l'arrivée au menu (sauf si on a déjà touché l'écran, ex. code d'accès).
    setTimeout(() => {
      if (navigator.userActivation?.hasBeenActive) return finish();
      const t = document.createElement('p'); t.className = 'boot-tap'; t.textContent = 'Touche l’écran pour entrer';
      bootEl.querySelector('.boot-inner')?.appendChild(t);
    }, wait);
    // « click » (après le relâchement du doigt) : c'est ce geste qu'iPhone accepte pour débloquer le son
    bootEl.addEventListener('click', () => { if (performance.now() >= (window.__introUntil || 0) - 2000) finish(); });
    if (!persistent) toast('Le stockage local est désactivé dans ce navigateur : ta progression ne sera pas conservée après fermeture.', { kind: 'error', icon: 'info', ms: 9000 });
    if (app.game.unreadable) toast('Ta partie précédente n’a pas pu être lue par cette version du jeu. Elle est gardée de côté : ferme et rouvre l’app pour recevoir la mise à jour, elle sera restaurée.', { kind: 'error', icon: 'info', ms: 12000 });
    if (app.game.restoredStash) toast('Ta partie a été restaurée.', { kind: 'success', icon: 'check' });
    if (authLink?.type === 'error') toast(`Ce lien n’a pas fonctionné : ${esc(authLink.message)}`, { kind: 'error', icon: 'info', ms: 8000 });
    else if (authLink?.type === 'recovery') toast('Choisis ton nouveau mot de passe.', { icon: 'key', ms: 6000 });
    else if (authLink) toast('Compte confirmé : tu es connecté, ta partie sera sauvegardée en ligne.', { kind: 'success', icon: 'user', ms: 7000 }); // startSync a déjà pris la session en compte
    if (app.game.loadedFrom && app.game.loadedFrom.endsWith('backup')) toast('La sauvegarde principale était abîmée : la copie de secours a été restaurée.', { kind: 'error', icon: 'info', ms: 8000 });
    document.addEventListener('pointerdown', () => applySettings(), { once: true });
    document.addEventListener('click', () => applySettings(), { once: true });
  } catch (e) {
    console.error(e);
    bootEl.querySelector('.err').textContent = `Impossible d’ouvrir le Bestiaire : ${e.message}. Vérifie ta connexion puis recharge la page.`;
  }
}

// Image introuvable (hors ligne, réseau coupé) : on la masque au lieu du carré « ? » de Safari (v305)
document.addEventListener('error', (e) => { const t = e.target; if (t && t.tagName === 'IMG') { t.style.visibility = 'hidden'; t.dataset.broken = '1'; } }, true);
document.addEventListener('load', (e) => { const t = e.target; if (t && t.tagName === 'IMG' && t.dataset.broken) { t.style.visibility = ''; delete t.dataset.broken; } }, true);

// Application des stores : bouton retour, son coupé en arrière-plan (rien dans un navigateur)
initNative({ suspendAudio: () => audioCtxIfAny()?.suspend?.().catch(() => {}), resumeAudio: () => audioCtxIfAny()?.resume?.().catch(() => {}) }); // v370 : ne crée plus le son hors d'un toucher

// Service worker et mises à jour (version web seulement : l'application des stores se met à jour par le store)
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !isNative()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      const notify = (w) => {
        toast('Une nouvelle version d’ABYSSAL est prête. <b>Touche ici pour l’installer.</b>', { icon: 'refresh', ms: 15000, onClick: () => w.postMessage('skipWaiting') });
      };
      if (reg.waiting && navigator.serviceWorker.controller) notify(reg.waiting);
      // au retour dans l'app (iPhone : elle reste souvent ouverte en arrière-plan), on cherche une mise à jour
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) notify(w); });
      });
    }).catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
  });
}

window.addEventListener('popstate', handlePopstate);
boot();
