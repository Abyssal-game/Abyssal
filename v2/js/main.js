// ABYSSAL v2 (prototype) : démarrage, barre du haut, onglets et navigation.
// Page servie depuis v2/ avec <base href="../"> : elle réutilise les cartes, illustrations et styles du jeu.
import { loadCatalogData, createCatalog } from '../../js/core/catalog.js';
import { loadArtManifest } from '../../js/art/assets.js';
import { setCardCatalog } from '../../js/ui/card.js';
import { icon } from '../../js/ui/icons.js';
import { toast, esc, fmt, reducedMotion } from '../../js/ui/dom.js';
import { sfx, configureSound } from '../../js/ui/sound.js';
import { Game2 } from './game.js';
import { descentScreen, teamScreen, boostersScreen, collectionScreen, chestsScreen } from './screens.js';

const TABS = [['', 'swords', 'Descente'], ['equipe', 'user', 'Équipe'], ['boosters', 'booster', 'Boosters'], ['collection', 'cards', 'Collection'], ['coffres', 'lock', 'Coffres']];
const SCREENS = { '': descentScreen, equipe: teamScreen, boosters: boostersScreen, collection: collectionScreen, coffres: chestsScreen };

const app = {
  state: {}, sfx, route: '',
  go(p) { location.hash = '#/' + p; },
  reduced() { return reducedMotion({ motion: 'auto' }); },
  chrome,
};
window.__abyssal2 = app; // accès pour les tests automatisés

function chrome() {
  const g = app.game;
  document.getElementById('topbar').innerHTML = `
    <span class="top-brand v2-brand"><b>ABYSSAL</b><span class="small muted">Prototype</span></span>
    <div class="wallet"><span class="pill shards" title="Éclats">${icon('crystal')}<span>${fmt(g.s.shards)}</span></span><span class="pill ash" title="Cendres">${icon('ash')}<span>${fmt(g.s.ash)}</span></span></div>`;
  const free = g.freePack().stock, chests = g.chestCount(), torches = g.torchesLeft();
  document.getElementById('tabbar').innerHTML = TABS.map(([k, ic, label]) => {
    const cur = k === app.route ? ' aria-current="page"' : '';
    const badge = k === 'boosters' && free ? `<span class="badge">${free}</span>` : k === 'coffres' && chests ? `<span class="badge">${chests}</span>` : k === '' && torches && !g.descent().run ? `<span class="badge">${torches}</span>` : '';
    if (k === 'boosters') return `<a class="tab tab-main" href="#/boosters"${cur}><span class="orb">${icon(ic)}</span>${label}${badge}</a>`;
    return `<a class="tab" href="#/${k}"${cur}>${icon(ic)}${label}${badge}</a>`;
  }).join('');
}

let current = null;
function render() {
  const route = (location.hash.replace(/^#\/?/, '').split('/')[0]) || '';
  app.route = SCREENS[route] ? route : '';
  if (current?.stop) current.stop();
  const old = document.getElementById('view');
  const view = old.cloneNode(false); // nouvel élément : aucun écouteur ne reste d'un écran précédent
  old.replaceWith(view);
  document.body.classList.remove('battle-mode');
  chrome();
  current = SCREENS[app.route](app, view);
  window.scrollTo(0, 0);
}

async function boot() {
  try { if (!localStorage.getItem('abyssal.access')) { location.href = './'; return; } } catch (e) { /* rien */ }
  try {
    const [data] = await Promise.all([loadCatalogData('./'), loadArtManifest('./')]);
    const catalog = createCatalog(data);
    setCardCatalog(catalog);
    app.catalog = catalog;
    app.game = new Game2(catalog, localStorage);
    configureSound({ sound: true, volume: 0.7 });
    window.addEventListener('hashchange', render);
    render();
    if (!app.game.s.tips.v2hello) {
      app.game.s.tips.v2hello = 1; app.game.persist();
      toast('Bienvenue dans le prototype ! Tu commences avec 5 créatures et 2 boosters gratuits. Ta partie de la version actuelle n’est pas touchée.', { icon: 'sparkle', ms: 7000 });
    }
  } catch (e) {
    console.error(e);
    document.getElementById('view').innerHTML = `<p class="center">Impossible d’ouvrir le prototype : ${esc(e.message)}</p>`;
  }
}
boot();
