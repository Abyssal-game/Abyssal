// Point d'entrée : chargement des données, état du joueur, navigation.
import { startTranslator } from './i18n.js'; /* v506 : langues (en premier : le dictionnaire est chargé avant le reste) */
import { loadCatalogData, createCatalog } from './core/catalog.js';
import { Game } from './core/game.js';
import { loadArtManifest, artUrl, hasRealArt, setCardBack } from './art/assets.js';
import { setCardCatalog, setFameLookup, setApexLookup, setFavLookup, setDressLookup } from './ui/card.js';
import { MAX_LEVEL } from './core/army.js';
import { fameTier } from './core/renown.js';
import { icon, EMBLEM } from './ui/icons.js';
import { toast, esc, fmt, reducedMotion, closeTopSheet, openSheet, handlePopstate, afterHistory } from './ui/dom.js';
import { sfx, configureSound, audioCtx, audioCtxIfAny } from './ui/sound.js';
import { musicRoute, configureMusic } from './ui/music.js';
import { setPackSkin } from './ui/vitrine.js'; /* v565 : sachet de booster */
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
import friendsScreen from './screens/friends.js';
import menuScreen from './screens/menu.js';
import sceauxScreen from './screens/sceaux.js';
import gamesScreen from './screens/games.js';
import codexScreen from './screens/codex.js';
import { claimable } from './core/codex.js';
import encheresScreen from './screens/encheres.js';
import versusScreen from './screens/versus.js';
import pacteScreen from './screens/pacte.js';
import cryptesScreen from './screens/cryptes.js';
import trialsScreen from './screens/trials.js';
import shadowScreen, { claimShadowPrize } from './screens/shadow.js';
import { forgeScreen, furnaceScreen } from './screens/forge.js';
import { teamScreen, chestsScreen } from './screens/army.js';
import { startSync, sync, onSync } from './cloud/sync.js';
import { startPartie, first, firstMany, flush as flushPartie } from './cloud/partie.js';
import { consumeAuthHash, isLoggedIn } from './cloud/cloud.js';
import { startPresence } from './cloud/presence.js';
import { showWelcome } from './screens/welcome.js';
import { showGate } from './ui/gate.js';
import { mpw, checkTurns } from './cloud/mpwatch.js';
import { syncDaily, maybeAsk } from './notify.js';
import { onAuth } from './cloud/cloud.js';
import { setScene } from './ui/scene.js';
import { initNative, isNative } from './native.js';
startTranslator();

const ROUTES = {
  '': homeScreen, antre: homeScreen, collection: collectionScreen, boutique: shopScreen, bestiaire: bestiaryScreen,
  factions: factionsScreen, faction: factionsScreen, succes: achievementsScreen, profil: profileScreen,
  parametres: settingsScreen, descente: descentScreen, compte: accountScreen, amis: friendsScreen, menu: menuScreen, equipe: teamScreen, coffres: chestsScreen, heros: descentScreen, arsenal: chestsScreen, marchand: descentScreen, sceaux: sceauxScreen, encheres: encheresScreen, versus: versusScreen, pacte: pacteScreen, cryptes: cryptesScreen, jeux: gamesScreen, codex: codexScreen, epreuves: trialsScreen, epreuve: descentScreen, tirage: shadowScreen, renfort: forgeScreen, fournaise: furnaceScreen,
};
const TABS = [
  ['antre', 'tab-home', 'Accueil'], ['collection', 'tab-collection', 'Collection'], ['boutique', 'tab-butin', 'Butin'], /* v428 : boosters, coffres et Tirage (v432 : « Butin ») */
  ['descente', 'tab-adventure', 'Aventure'], ['menu', 'tab-more', 'Sanctuaire'],
];
// icônes peintes de la barre du bas (assets/icons)
const tabIcon = (k) => `<img class="tab-pic" alt="" src="assets/icons/${k}.webp">`;
const TAB_OF = { '': 'antre', antre: 'antre', collection: 'collection', boutique: 'boutique', codex: 'boutique', descente: 'descente', menu: 'menu', bestiaire: 'menu', factions: 'menu', faction: 'menu', succes: 'menu', profil: 'menu', parametres: 'menu', compte: 'menu', amis: 'menu', equipe: 'collection', renfort: 'collection', fournaise: 'collection', coffres: 'boutique', heros: 'descente', arsenal: 'boutique', marchand: 'descente', sceaux: 'descente', encheres: 'descente', versus: 'descente', pacte: 'descente', cryptes: 'descente', jeux: 'descente', epreuves: 'descente', epreuve: 'descente', tirage: 'boutique' };
// Fond illustré de chaque page (l'Accueil et la Descente posent le leur)
const ROUTE_SCENE = { boutique: 'shop', codex: 'shop', tirage: 'shadow', renfort: 'collection', fournaise: 'collection', collection: 'collection', equipe: 'team', coffres: 'chests', bestiaire: 'bestiary', succes: 'trophies', profil: 'profile', menu: 'menu', parametres: 'menu', compte: 'menu', amis: 'menu', factions: 'factions', faction: 'factions' };
// Page parente des sous-pages (bouton retour en haut)
const PARENT = { amis: 'menu', bestiaire: 'menu', factions: 'bestiaire', faction: 'bestiaire', succes: 'menu', profil: 'menu', parametres: 'menu', compte: 'menu', heros: 'descente', arsenal: 'coffres', marchand: 'descente', sceaux: 'jeux', encheres: 'jeux', versus: 'jeux', pacte: 'jeux', cryptes: 'jeux' };
// Sous-onglets de chaque onglet principal (barre en haut de la page)
// v425 : pages rangées sous un autre sous-onglet (allumé sur elles)
const SUB_OF = { fournaise: 'renfort', sceaux: 'jeux', encheres: 'jeux', versus: 'jeux', pacte: 'jeux', cryptes: 'jeux' };
const SUBNAV = {
  collection: [['collection', 'cards', 'Cartes'], ['equipe', 'team-ic', 'Équipe'], ['renfort', 'furnace', 'Forge']], /* v422 : Renforcer + Fournaise */
  boutique: [['boutique', 'booster', 'Boosters'], ['coffres', 'chest', 'Coffres'], ['tirage', 'shadow', 'Tirage'], ['codex', 'book', 'Codex']], /* v470 : Codex et Échoppe, en Mode Créateur seulement */ /* v428 : les coffres rejoignent le Butin */
  descente: [['descente', 'descend', 'Descente'], ['epreuves', 'crest-elite', 'Épreuves'], ['jeux', 'seal', 'Jeux']],
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
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__abyssal = app; /* accès pour les tests automatisés (v499 : seulement en local) */
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__abyssalProg = (ev) => onProgress(ev);

function applySettings() {
  const s = app.game.s.settings;
  setCardBack(app.game.s.back); /* v473 : dos de cartes choisi au Profil */
  setPackSkin(app.game.s.sachet);
  document.documentElement.classList.toggle('reduce-motion', s.motion === 'reduced');
  document.documentElement.classList.toggle('fx-light', s.quality === 'light');
  configureSound(s);
  configureMusic(s);
}

// Explication des deux monnaies (toucher le compteur en haut à droite)
const WALLET = {
  shards: ['Éclats', 'La monnaie principale. Ils servent à acheter des boosters (onglet Butin).', 'Tu en gagnes avec l’offrande du jour, les missions, les succès, les nouvelles créatures découvertes la première victoire à chaque étage de la Descente, les Épreuves du jour et les coffres (bois et fer en donnent ; or et abyssal donnent des boosters).', 'boutique', 'Aller au Butin'],
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

// v528 : toucher le pseudo ou le portrait d'un joueur ouvre son profil (ami ou non), même depuis une fenêtre
function openProfile(e) {
  const p = e.target.closest('[data-profile]');
  if (!p || (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ')) return;
  e.preventDefault(); e.stopPropagation();
  app.sfx?.tap?.();
  while (closeTopSheet()) { /* ferme les fenêtres ouvertes */ }
  app.go(`amis/${p.dataset.profile}`);
}
document.addEventListener('click', openProfile, true);
document.addEventListener('keydown', openProfile, true);

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-obs]')) { (app.state.codex ||= { tab: 'codex' }).tab = 'shop'; app.sfx?.tap?.(); app.go('codex'); return; }
  const b = e.target.closest('[data-wallet]');
  if (!b) return;
  const [name, what, how, route, go] = WALLET[b.dataset.wallet];
  const n = b.dataset.wallet === 'shards' ? app.game.s.shards : app.game.s.ash;
  const sh = openSheet(`<div class="wal-sheet"><span class="wal-big">${icon(b.dataset.wallet === 'shards' ? 'crystal' : 'ash')}</span><h2>${name}</h2><p class="wal-n">${fmt(n)}</p><p>${what}</p><p class="small muted">${how}</p><a class="btn primary block" href="#/${route}">${go}</a></div>`, { label: name });
  sh.body.querySelector('a').addEventListener('click', (ev) => { ev.preventDefault(); sh.close(); app.go(route); }); /* v536 : sh.close() annulait le lien (history.back) */
});

// v541 : la barre du haut et celle du bas ne sont redessinées que si elles changent (images gardées, moins de travail à chaque toucher)
const htmlOf = new WeakMap();
function setIf(el, html) { if (htmlOf.get(el) !== html) { htmlOf.set(el, html); el.innerHTML = html; } }
function renderChrome() {
  const g = app.game, s = g.s, lv = g.levelInfo();
  const avatarCard = g.shownAvatar() && g.catalog.get(g.shownAvatar()); /* v545 : même portrait que celui montré aux autres */
  const top = document.getElementById('topbar');
  const parent = PARENT[app.route];
  setIf(top, `
    ${parent !== undefined ? `<a class="top-back" href="#/${parent}" aria-label="Retour" data-parent="${parent}">${icon('back')}</a>` : ''}
    <a class="top-brand" href="#/profil" aria-label="Profil : niveau ${lv.level}, ${esc(s.title)}">
      <span class="top-avatar pf pf-${s.frame}">${avatarCard ? `<img alt="" src="${artUrl(avatarCard, { lite: true })}">` : EMBLEM}</span>
      <span class="top-meta"><b>${esc(sync.profile?.pseudo || s.name || 'Toi')}</b><span class="top-lv"><span class="lv">Niv. ${lv.level}</span><span class="xpbar" aria-hidden="true"><i style="width:${(lv.into / lv.need) * 100}%"></i></span></span></span>
    </a>
    <div class="wallet">
      <button class="pill shards" data-wallet="shards" title="Éclats" aria-label="${fmt(s.shards)} éclats : à quoi ça sert ?">${icon('crystal')}<span>${fmt(s.shards)}</span></button>
      <button class="pill ash" data-wallet="ash" title="Cendres" aria-label="${fmt(s.ash)} cendres : à quoi ça sert ?">${icon('ash')}<span>${fmt(s.ash)}</span></button>
      ${g.codexOn() ? `<button class="pill obs" data-obs title="Obsidiennes" aria-label="${fmt(g.obs())} obsidiennes : ouvrir l’Échoppe"><img class="obs-i" alt="" src="assets/icons/obsidienne.webp"><span>${fmt(g.obs())}</span></button>` : ''}
    </div>`);
  top.classList.toggle('has-obs', g.codexOn()); /* v489 : obsidiennes à côté des cendres (tant que l'Échoppe est cachée, seulement en Mode Créateur) */
  // v319 : le bouton retour du haut revient en arrière dans l'historique quand la page précédente est bien le parent,
  // sinon il remplace la page courante : jamais d'entrée d'historique en plus
  const tb = top.querySelector('.top-back');
  if (tb && !tb.dataset.on) tb.dataset.on = '1', tb.addEventListener('click', (e) => {
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
    if (r === 'codex') return claimable(g.codex()) || '';
    // v404 : pastilles plus calmes — plus de « 99+ » permanent sur la Fournaise ; Renforcer seulement si l'Accueil le conseille aussi
    if (r === 'renfort') return g.goals().some((x) => x.kind === 'forge' && /Renforce/.test(x.title)) ? '↑' : '';
    if (r === 'collection') return nNewSub || '';
    if (r === 'jeux') return (g.gamesDailyLeft().length + mpw.turns + mpw.games) || ''; /* v466 : défis du jour à relever ; v519 : coups à jouer en ligne */
    if (r === 'epreuves') { const n = g.trials().done.filter((x) => !x).length; return g.team().length >= 3 && n ? n : ''; } /* v407 */
    return '';
  };
  const nNewSub = g.newCount() > 99 ? '99+' : g.newCount();
  const sn = document.getElementById('subnav');
  // v404 : sous-onglets encore fermés cachés (Sceaux avant le premier gardien, Tirage sans compte)
  const shown0 = sub && sub.filter(([r]) => (r !== 'tirage' || isLoggedIn() || app.route === 'tirage') && (r !== 'codex' || g.codexOn()));
  const shown = shown0 && shown0.length > 1 ? shown0 : null; /* v422 : pas de barre pour un seul sous-onglet */
  document.body.classList.toggle('has-subnav', !!shown);
  setIf(sn, shown ? shown.map(([r, ic, label]) => { const bd = subBadge(r); return `<a class="sn-tab${r === 'jeux' && !g.sceauxOpen() ? ' locked' : ''}" href="#/${r}"${r === (SUB_OF[app.route] || app.route) ? ' aria-current="page"' : ''}><img class="sn-ic" alt="" src="assets/icons/${ic}.webp"><span>${label}</span>${bd ? `<i class="sn-badge">${bd}</i>` : ''}</a>`; }).join('') : '');
  const nNew = g.newCount();
  const ticketCount = Object.values(s.tickets).reduce((a, b) => a + b, 0) + (g.welcomePending() ? 0 : g.freePack().stock); /* v404 : « 2 » comme l'annonce l'Accueil au tout début */
  setIf(document.getElementById('tabbar'), TABS.map(([key, ic, label]) => {
    const cur = key === tab ? ' aria-current="page"' : '';
    // moins de pastilles : un chiffre seulement pour ce qui attend d'être ouvert (boosters, coffres), sinon un simple point
    const dot = '<span class="badge dot"></span>';
    const badge = key === 'boutique' && ticketCount + g.chestCount() ? `<span class="badge">${ticketCount + g.chestCount()}</span>` /* v428 : boosters et coffres à ouvrir */
      : key === 'collection' && nNew ? dot
      : key === 'antre' && (g.canDailyClaim() || g.missionsToClaim()) ? dot
      : key === 'descente' && (mpw.turns + mpw.games) ? `<span class="badge">${mpw.turns + mpw.games}</span>` /* v521 : en ligne, à toi de jouer ou défi à voir */
      : key === 'menu' && mpw.friends ? `<span class="badge">${mpw.friends}</span>` /* v521 : demandes d'ami */
      : key === 'descente' && g.team().length >= 3 && (g.descent().run || g.trials().done.some((x) => !x)) ? dot : ''; /* v407 : Épreuves du jour à jouer */
    if (key === 'boutique') return `<a class="tab tab-main" href="#/boutique"${cur}><span class="orb">${tabIcon(ic)}</span>${label}${badge}</a>`;
    return `<a class="tab" href="#/${key}"${cur}>${tabIcon(ic)}${label}${badge}</a>`;
  }).join(''));
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
/* v557 (demande du propriétaire : les succès et niveaux couvraient l'écran) : une petite pastille en haut de l'écran
   (« Succès · nom », « Niveau 12 », « 3 récompenses ») ; un toucher ouvre le détail. Les annonces suivantes s'y ajoutent. */
const KIND_LABEL = { achievement: 'Succès', set: 'Ensemble complété', faction: 'Faction complétée', fame: 'Renommée', season: 'Saison', level: 'Niveau' };
const KIND_ICON = { achievement: 'trophy', set: 'star', faction: 'shield', fame: 'star', season: 'trophy', level: 'up' };
let progList = [], progEl = null, progTimer = 0;
function progLine(e) { return e.kind === 'level' ? `Niveau ${e.level}` : esc(e.name); }
function paintProgress() {
  if (!progEl) {
    progEl = document.createElement('button'); progEl.className = 'prog-chip'; progEl.type = 'button';
    progEl.addEventListener('click', () => { const list = progList; hideProgress(); openProgress(list); });
    document.body.appendChild(progEl);
  }
  const one = progList.length === 1 ? progList[0] : null;
  progEl.innerHTML = `<span class="pc-ic">${one?.kind === 'level' ? '<img class="picon" alt="" src="assets/icons/xp.webp">' : icon(one ? KIND_ICON[one.kind] || 'trophy' : 'trophy')}</span>
    <span class="pc-t">${one ? `<small>${KIND_LABEL[one.kind] || ''}</small><b>${one.kind === 'level' ? one.level : esc(one.name)}</b>` : `<b>${progList.length} récompenses</b>`}</span><span class="pc-go">Voir</span>`;
  requestAnimationFrame(() => progEl.classList.add('in'));
  clearTimeout(progTimer); progTimer = setTimeout(hideProgress, 7000);
}
function hideProgress() { clearTimeout(progTimer); progList = []; progEl?.classList.remove('in'); }
function openProgress(list) {
  if (!list.length) return;
  const total = list.reduce((t, e) => t + (e.reward?.shards || 0), 0);
  const sh = openSheet(`<h2 class="center">${list.length > 1 ? `${list.length} récompenses` : esc(KIND_LABEL[list[0].kind] || 'Récompense')}</h2>
    <div class="prog-list">${list.map((e) => `<div class="prog-row"><span class="pc-ic">${e.kind === 'level' ? '<img class="picon" alt="" src="assets/icons/xp.webp">' : icon(KIND_ICON[e.kind] || 'trophy')}</span><span><small>${KIND_LABEL[e.kind] || ''}</small><b>${progLine(e)}</b>${rewardText(e.reward) ? `<em>${rewardText(e.reward)}</em>` : ''}</span></div>`).join('')}</div>
    ${total ? `<p class="small muted center">+${fmt(total)} éclats au total.</p>` : ''}
    <button class="btn block" data-prog="succes">Voir mes succès</button>`, { label: 'Récompenses' });
  sh.el.querySelector('[data-prog]')?.addEventListener('click', () => { sh.close(); app.go('succes'); });
}
function onProgress(events) {
  const lv = events.filter((e) => e.kind === 'level');
  if (lv.length > 1) events = [...events.filter((e) => e.kind !== 'level'), { kind: 'level', level: lv[lv.length - 1].level, reward: lv.reduce((r, e) => ({ shards: (r.shards || 0) + (e.reward?.shards || 0), tickets: { ...r.tickets, ...e.reward?.tickets }, title: e.reward?.title || r.title }), {}) }];
  if (!events.length) return;
  const k = events[events.length - 1].kind;
  try { (k === 'fame' ? sfx.fame : k === 'season' ? sfx.season : sfx.achievement)(); } catch (e) { /* le son ne bloque rien */ }
  progList = [...progList.filter((e) => !(e.kind === 'level' && events.some((x) => x.kind === 'level'))), ...events];
  paintProgress();
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
    setDressLookup(() => null); /* v569 : finitions de cartes retirées pour l'instant (v482 : app.game.s.dress) */
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
    startPartie(app); /* v539 : serveur de partie (anti-triche) */
    app.partie = { first, firstMany, flush: flushPartie };
    startSync(app);
    let shownPseudo = null;
    onSync(() => { const ps = sync.profile?.pseudo || null; if (ps !== shownPseudo) { shownPseudo = ps; renderChrome(); } }); /* v422 : le pseudo en ligne s'affiche en haut dès qu'il arrive */
    startPresence();
    setInterval(autoClaim, 5000);
    setTimeout(() => checkTurns(app, { force: true }), 6000); setInterval(() => checkTurns(app), 120000); /* v519 : « À toi de jouer » en ligne */
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkTurns(app); else syncDaily(app.game); }); /* v521 : notification du booster du jour reprogrammée en quittant l'app */
    setTimeout(() => syncDaily(app.game), 8000); setInterval(() => maybeAsk(app), 30000); /* v422 : l'Accueil n'a plus de boutons « +50 » : on encaisse aussi sans changer de page */
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
  /* v536 : en anglais, main.js arrive après l'événement load (dictionnaire chargé d'abord) : on enregistre tout de suite si la page est déjà chargée */
  const hadCtrl = !!navigator.serviceWorker.controller; /* première visite : pas de rechargement quand le service worker prend la main */
  const regSW = () => {
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
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadCtrl && !reloaded) { reloaded = true; location.reload(); } });
  };
  if (document.readyState === 'complete') regSW(); else window.addEventListener('load', regSW);
}

window.addEventListener('popstate', handlePopstate);
boot();
