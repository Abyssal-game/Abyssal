// Point d'entrée : chargement des données, état du joueur, navigation.
import { loadCatalogData, createCatalog } from './core/catalog.js';
import { Game } from './core/game.js';
import { loadArtManifest, artUrl, hasRealArt } from './art/assets.js';
import { setCardCatalog } from './ui/card.js';
import { icon, EMBLEM } from './ui/icons.js';
import { toast, esc, fmt, reducedMotion, closeTopSheet, openSheet } from './ui/dom.js';
import { sfx, configureSound } from './ui/sound.js';
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
import { teamScreen, chestsScreen } from './screens/army.js';
import { startSync } from './cloud/sync.js';
import { startPresence } from './cloud/presence.js';
import { showWelcome } from './screens/welcome.js';
import { setScene } from './ui/scene.js';

const ROUTES = {
  '': homeScreen, antre: homeScreen, collection: collectionScreen, boutique: shopScreen, bestiaire: bestiaryScreen,
  factions: factionsScreen, faction: factionsScreen, succes: achievementsScreen, profil: profileScreen,
  parametres: settingsScreen, descente: descentScreen, compte: accountScreen, menu: menuScreen, equipe: teamScreen, coffres: chestsScreen, heros: descentScreen, arsenal: chestsScreen, marchand: descentScreen, sceaux: sceauxScreen,
};
const TABS = [
  ['antre', 'tab-home', 'Accueil'], ['collection', 'tab-collection', 'Collection'], ['boutique', 'tab-boosters', 'Boosters'],
  ['descente', 'tab-adventure', 'Aventure'], ['menu', 'tab-more', 'Sanctuaire'],
];
// icônes peintes de la barre du bas (assets/icons)
const tabIcon = (k) => `<img class="tab-pic" alt="" src="assets/icons/${k}.webp">`;
const TAB_OF = { '': 'antre', antre: 'antre', collection: 'collection', boutique: 'boutique', descente: 'descente', menu: 'menu', bestiaire: 'menu', factions: 'menu', faction: 'menu', succes: 'menu', profil: 'menu', parametres: 'menu', compte: 'menu', equipe: 'descente', coffres: 'descente', heros: 'descente', arsenal: 'descente', marchand: 'descente', sceaux: 'descente' };
// Fond illustré de chaque page (l'Accueil et la Descente posent le leur)
const ROUTE_SCENE = { boutique: 'shop', collection: 'collection', equipe: 'team', coffres: 'chests', bestiaire: 'bestiary', succes: 'trophies', profil: 'profile', menu: 'menu', parametres: 'menu', compte: 'menu', factions: 'factions', faction: 'factions' };
// Page parente des sous-pages (bouton retour en haut)
const PARENT = { bestiaire: 'menu', factions: 'bestiaire', faction: 'bestiaire', succes: 'menu', profil: 'menu', parametres: 'menu', compte: 'menu', equipe: 'descente', coffres: 'descente', heros: 'descente', arsenal: 'descente', marchand: 'descente', sceaux: 'descente' };

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
  go(path) { location.hash = '#/' + path; },
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
  configureSound(s);
}

// Explication des deux monnaies (toucher le compteur en haut à droite)
const WALLET = {
  shards: ['Éclats', 'La monnaie principale. Ils servent à acheter des boosters dans la Boutique.', 'Tu en gagnes avec l’offrande du jour, les missions, les succès, les nouvelles créatures découvertes et surtout dans la Descente (combats, trésors, gardiens).', 'boutique', 'Aller aux Boosters'],
  ash: ['Cendres', 'Ce qui reste de tes doublons. Elles servent au Rituel d’élévation (holographique, or, cosmique), à invoquer une carte manquante et à déchiffrer les noms inconnus.', 'Tu en gagnes à chaque doublon obtenu dans un booster : plus la carte est rare, plus elle en donne.', 'collection', 'Aller à la Collection'],
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
  document.documentElement.style.setProperty('--vh-gap', `${Math.max(0, h - innerHeight)}px`);
}
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
    ${parent !== undefined ? `<a class="top-back" href="#/${parent}" aria-label="Retour">${icon('back')}</a>` : ''}
    <a class="top-brand" href="#/profil" aria-label="Profil : niveau ${lv.level}, ${esc(s.title)}">
      <span class="top-avatar pf pf-${s.frame}">${avatarCard ? `<img alt="" src="${artUrl(avatarCard, { lite: true })}">` : EMBLEM}<span class="lv">${lv.level}</span></span>
      <span class="top-meta"><b>${esc(s.title)}</b><span class="xpbar" aria-hidden="true"><i style="width:${(lv.into / lv.need) * 100}%"></i></span></span>
    </a>
    <div class="wallet">
      <button class="pill shards" data-wallet="shards" title="Éclats" aria-label="${fmt(s.shards)} éclats : à quoi ça sert ?">${icon('crystal')}<span>${fmt(s.shards)}</span></button>
      <button class="pill ash" data-wallet="ash" title="Cendres" aria-label="${fmt(s.ash)} cendres : à quoi ça sert ?">${icon('ash')}<span>${fmt(s.ash)}</span></button>
    </div>`;
  const tab = TAB_OF[app.route] ?? 'antre';
  const nNew = g.newCount();
  const ticketCount = Object.values(s.tickets).reduce((a, b) => a + b, 0) + g.freePack().stock;
  document.getElementById('tabbar').innerHTML = TABS.map(([key, ic, label]) => {
    const cur = key === tab ? ' aria-current="page"' : '';
    const badge = key === 'collection' && nNew ? `<span class="badge">${nNew > 99 ? '99+' : nNew}</span>` : key === 'boutique' && ticketCount ? `<span class="badge">${ticketCount}</span>` : key === 'antre' && (g.canDailyClaim() || g.missionsToClaim()) ? '<span class="badge">!</span>' : key === 'descente' && (g.chestCount() || g.torchesLeft()) ? `<span class="badge">${g.chestCount() || g.torchesLeft()}</span>` : '';
    if (key === 'boutique') return `<a class="tab tab-main" href="#/boutique"${cur}><span class="orb">${tabIcon(ic)}</span>${label}${badge}</a>`;
    return `<a class="tab" href="#/${key}"${cur}>${tabIcon(ic)}${label}${badge}</a>`;
  }).join('');
}

let lastShards = null;
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
  const key = location.hash || '#/';
  const same = key === scrollKey;
  const keepY = same ? window.scrollY : (scrollMem.get(key) || 0);
  scrollKey = null; // pas d'enregistrement pendant le changement de page
  const screen = ROUTES[route] || homeScreen;
  if (app.cleanup) { try { app.cleanup(); } catch (e) { /* rien */ } app.cleanup = null; }
  app.route = ROUTES[route] ? route : '';
  app.params = params.map(decodeURIComponent);
  renderChrome();
  setScene(ROUTE_SCENE[app.route] || null);
  // Nouvel élément à chaque affichage : les écouteurs de l'écran précédent disparaissent avec lui
  // (sinon ils s'accumulent et un toucher déclenche l'action plusieurs fois).
  const old = document.getElementById('view');
  const view = old.cloneNode(false);
  old.replaceWith(view);
  view.classList.remove('view-in');
  if (!same) view.classList.add('view-in');
  view.innerHTML = '';
  app.cleanup = screen(app, view, app.params) || null;
  window.scrollTo(0, keepY);
  scrollKey = key;
  // les images différées peuvent encore ajuster la hauteur : on recolle une fois la page posée
  if (keepY) requestAnimationFrame(() => { if (scrollKey === key && Math.abs(window.scrollY - keepY) > 2) window.scrollTo(0, keepY); });
}

// Notifications de progression (succès, ensembles, niveaux)
function rewardText(r = {}) {
  const parts = [];
  if (r.shards) parts.push(`${fmt(r.shards)} éclats`);
  for (const [k, n] of Object.entries(r.tickets || {})) parts.push(`${n} ticket${n > 1 ? 's' : ''} ${k === 'premium' ? 'premium' : 'standard'}`);
  if (r.title) parts.push(`titre « ${esc(r.title)} »`);
  if (r.frame) parts.push('un cadre de profil');
  if (r.special) parts.push('une Édition des Sceaux');
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
  events.forEach((e, i) => setTimeout(() => {
    if (e.kind === 'achievement') toast(`Succès débloqué : <b>${esc(e.name)}</b><br><span class="small muted">${rewardText(e.reward)}</span>`, { kind: 'ach', ms: 4200 });
    if (e.kind === 'set') toast(`Ensemble complété : <b>${esc(e.name)}</b><br><span class="small muted">${rewardText(e.reward)}</span>`, { kind: 'epic', icon: 'star', ms: 5000 });
    if (e.kind === 'faction') toast(`Faction complétée : <b>${esc(e.name)}</b><br><span class="small muted">${rewardText(e.reward)}</span>`, { kind: 'epic', icon: 'shield', ms: 5000 });
    if (e.kind === 'level') toast(`<img class="picon toast-xp" alt="" src="assets/icons/xp.webp"><span>Niveau <b>${e.level}</b> atteint !<br><span class="small">${rewardText(e.reward)}</span></span>`, { kind: 'level', ms: 3800 });
    sfx.achievement();
  }, (app.holdToasts ? 0 : 300) + i * 650));
}

// Accès restreint pendant la construction : un code est demandé une seule fois par appareil.
// (Protection légère : elle tient les curieux à l'écart, la vraie protection viendra des comptes.)
const ACCESS_HASH = '6016f8fa5aae569fac3bf7f8245f811cba41bade40f8d879c0bff10dce79a76a';
async function sha(txt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function accessGranted() { try { return localStorage.getItem('abyssal.access') === ACCESS_HASH; } catch (e) { return false; } }
function askAccess(bootEl) {
  return new Promise((resolve) => {
    const box = document.createElement('form');
    box.className = 'gate';
    box.innerHTML = `<p class="gate-t">Accès réservé</p><p class="small muted">ABYSSAL est en construction. Entre le code d’accès.</p>
      <input class="input" type="password" autocomplete="off" autocapitalize="characters" placeholder="Code d’accès" aria-label="Code d’accès">
      <button class="btn primary block" type="submit">Entrer</button><p class="gate-err small"></p>`;
    bootEl.querySelector('.boot-inner').appendChild(box);
    const input = box.querySelector('input');
    box.addEventListener('submit', async (e) => {
      e.preventDefault();
      const h = await sha('abyssal:' + input.value.trim().toUpperCase());
      if (h === ACCESS_HASH) { try { localStorage.setItem('abyssal.access', h); } catch (err) { /* rien */ } box.remove(); resolve(); }
      else { box.querySelector('.gate-err').textContent = 'Code incorrect.'; input.value = ''; }
    });
  });
}

async function boot() {
  const bootEl = document.getElementById('boot');
  if (!accessGranted() && crypto.subtle) { await askAccess(bootEl); window.__introUntil = performance.now() + 300; }
  try {
    const [data] = await Promise.all([loadCatalogData('./'), loadArtManifest('./')]);
    const catalog = createCatalog(data);
    setCardCatalog(catalog);
    const { storage, persistent } = storageOrMemory();
    app.catalog = catalog;
    app.game = new Game(catalog, storage);
    app.persistent = persistent;
    app.game.on('change', () => { renderChrome(); pulseWallet(); });
    app.game.on('progress', (ev) => (app.pendingProgress ? app.pendingProgress.push(...ev) : onProgress(ev)));
    app.game.on('error', (m) => toast(esc(m), { kind: 'error', icon: 'info', ms: 6000 }));
    app.flushProgress = () => { const ev = app.pendingProgress || []; app.pendingProgress = null; if (ev.length) onProgress(ev); };
    app.applySettings = applySettings;
    applySettings();
    startSync(app);
    startPresence();
    lastShards = app.game.s.shards;
    window.addEventListener('hashchange', render);
    render();
    const wait = Math.max(0, (window.__introUntil || 0) - performance.now());
    let done = false;
    const finish = () => { if (done) return; done = true; bootEl.classList.add('out'); setTimeout(() => bootEl.remove(), 900); };
    setTimeout(finish, wait);
    setTimeout(() => showWelcome(app), wait + 700);
    bootEl.addEventListener('click', finish); // un toucher passe l'introduction
    if (!persistent) toast('Le stockage local est désactivé dans ce navigateur : ta progression ne sera pas conservée après fermeture.', { kind: 'error', icon: 'info', ms: 9000 });
    if (app.game.loadedFrom && app.game.loadedFrom.endsWith('backup')) toast('La sauvegarde principale était abîmée : la copie de secours a été restaurée.', { kind: 'error', icon: 'info', ms: 8000 });
    document.addEventListener('pointerdown', () => configureSound(app.game.s.settings), { once: true });
  } catch (e) {
    console.error(e);
    bootEl.querySelector('.err').textContent = `Impossible d’ouvrir le Bestiaire : ${e.message}. Vérifie ta connexion puis recharge la page.`;
  }
}

// Service worker et mises à jour
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      const notify = (w) => {
        toast('Une nouvelle version d’ABYSSAL est prête. <b>Touche ici pour l’installer.</b>', { icon: 'refresh', ms: 15000 });
        document.getElementById('toasts').lastElementChild?.addEventListener('click', () => w.postMessage('skipWaiting'));
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

window.addEventListener('popstate', () => closeTopSheet());
boot();
