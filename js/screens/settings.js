// Réglages : son, animations, accessibilité, sauvegarde (le Mode Créateur est dans creator.js).
import { notifSupported, pushSupported, enable as notifEnable } from '../notify.js';
import { resetTips } from '../ui/coach.js';
import { TUTOS, tuto } from '../ui/tutos.js';
import { icon, EMBLEM, picon } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, openSheet, bindActions, withPending, paint } from '../ui/dom.js';
import { sfx, haptic } from '../ui/sound.js';
import { partie, pendingOps } from '../cloud/partie.js';
/* v539 : où vit la progression (serveur de partie, ou ancienne sauvegarde tant qu'il n'est pas en place) */
const partieLine = () => (partie.mode === 'server' ? `Progression gardée par le serveur${pendingOps() ? ` · ${pendingOps()} action${pendingOps() > 1 ? 's' : ''} à envoyer` : ''}` : partie.mode === 'legacy' ? 'Progression : ancienne sauvegarde en ligne' : 'Progression : serveur pas encore joint');
import { MUSIC_DEMO, musicPreview } from '../ui/music.js';
import { sync, onSync, refreshProfile, eraseOnline } from '../cloud/sync.js';
import { isLoggedIn, onlineList } from '../cloud/cloud.js';
import { artUrl } from '../art/assets.js';
import { profileAttrs } from '../ui/report.js';
/* v608 : le nombre de joueurs en ligne et leur liste ne sont montrés qu'au compte du créateur, « Le Gardien » */
const isGardien = () => (sync.profile?.pseudo || '').trim().toLowerCase() === 'le gardien';
import { openCreator } from './creator.js';
import { showWelcome } from './welcome.js';
import { onPresence, presence } from '../cloud/presence.js';
import { liveOn, liveStatus, liveCheck, onLiveStatus } from '../live.js';

/* v618 : état des mises à jour à distance (application iPhone) */
function liveLine(st = liveStatus()) {
  switch (st.state) {
    case 'checking': return 'Recherche d’une mise à jour…';
    case 'downloading': return `Téléchargement de la mise à jour : ${st.done} / ${st.total} fichiers…`;
    case 'ready': return `Mise à jour v${st.v} prête : elle s’installera au prochain lancement de l’app.`;
    case 'uptodate': return 'Ton jeu est à jour.';
    case 'needApp': return window.Capacitor?.getPlatform?.() === 'android' ? 'Une nouvelle version demande de mettre à jour l’application sur le Play Store.' : 'Une nouvelle version demande de mettre à jour l’application sur l’App Store.';
    case 'offline': return 'Impossible de vérifier les mises à jour pour l’instant.';
    case 'unsigned': return 'Mise à jour refusée : elle n’est pas signée.';
    case 'error': return 'La mise à jour n’a pas pu se télécharger : nouvel essai plus tard.';
    default: return st.ready ? `Mise à jour v${st.ready} prête : elle s’installera au prochain lancement de l’app.` : 'Le jeu se met à jour tout seul.';
  }
}
/* v620 : cause technique d'un échec (aide au diagnostic), jamais traduite */
function liveWhy(st = liveStatus()) { return (st.state === 'offline' || st.state === 'error') && st.msg ? esc(st.msg) : ''; }
import { LANGS, LANG, setLang, t } from '../i18n.js';
import { iapStatus, iapRestore, IAP_WHY } from '../iap.js';
/* v418 : code du Mode Créateur choisi par le propriétaire ; seule son empreinte SHA-256 (en majuscules) est dans le code */
const CREATOR_HASH = 'a0f19d9e26a8d1b7c87d32cc8bbfb9f61d58de4b518cf9e145d36c787a37ac37';
async function sha256(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }

export default function settings(app, root) {
  const g = app.game;

  function toggle(key, label, desc) {
    const on = !!g.s.settings[key];
    return `<div class="set-row"><div><b>${label}</b>${desc ? `<p class="small muted">${desc}</p>` : ''}</div><button class="switch" role="switch" aria-checked="${on}" data-act="toggle" data-k="${key}" aria-label="${esc(label)}"><i></i></button></div>`;
  }
  function seg(key, label, opts) {
    return `<div class="set-row col"><b>${label}</b><div class="seg" role="radiogroup" aria-label="${esc(label)}">${opts.map(([v, l]) => `<button class="seg-b" role="radio" data-act="seg" data-k="${key}" data-v="${v}" aria-checked="${g.s.settings[key] === v}" aria-pressed="${g.s.settings[key] === v}">${l}</button>`).join('')}</div></div>`;
  }

  const ui = (app.state.settings ||= { tab: 'jeu' });
  const TABS = [['jeu', 'Jeu', 'set-game', 'dodge'], ['tutos', 'Tutoriels', 'set-tutos', 'book'], ['about', 'À propos', 'set-about', 'crown']];
  const tabIcon = (k) => `<img class="picon" alt="" src="assets/icons/${k}.webp">`;

  function tabJeu(s) {
    return `<section class="panel stack">
        <h2>Langue</h2>
        <div class="seg lang-grid" role="radiogroup" aria-label="Langue" translate="no">${Object.entries(LANGS).map(([k, l]) => `<button class="seg-b" role="radio" data-act="lang" data-v="${k}" aria-checked="${LANG === k}" aria-pressed="${LANG === k}">${l}</button>`).join('')}</div>
      </section>
      <!-- v699 : le combat juste après la langue (réglage le plus utilisé) ; les ambiances repliées -->
      <section class="panel stack">
        <h2>Combat</h2>
        ${seg('defense', 'Défense active en combat', [['on', 'Manuelle'], ['auto', 'Automatique']])}
        <p class="small muted set-note">Manuelle : chaque attaque ennemie se défend sur la barre, coup par coup (enchaînements, feintes, coups chargés) ; sur le trait blanc, c’est une parade parfaite. Automatique : rien à toucher, mais seulement 4 esquives sur 10 et jamais de parade parfaite (moins de Ferveur et de PA).</p>
        ${seg('decor', 'Décor des combats', [['riche', 'Riche'], ['sobre', 'Sobre']])}
        <p class="small muted set-note">Sobre : la salle reste en place, sans particules ni flammes qui vacillent. Plus reposant, et un peu plus économe en batterie.</p>
        ${seg('quality', 'Effets des combats', [['auto', 'Complets'], ['light', 'Allégés']])}
        <p class="small muted set-note">Allégés : moins de particules, ni secousses de caméra ni éclairs, décor sobre. À essayer si les combats saccadent.</p>
      </section>
      <section class="panel stack">
        <h2>Son et musique</h2>
        ${toggle('sound', 'Effets sonores', 'Ouverture, révélation, combat. Le mode silencieux de l’iPhone peut les couper.')}
        <div class="set-row col"><label for="vol"><b>Volume</b></label><input id="vol" type="range" min="0" max="1" step="0.05" value="${s.volume}" ${s.sound ? '' : 'disabled'}></div>
        ${toggle('music', 'Musique d’ambiance', 'Une ambiance différente selon le lieu : Accueil, Butin, Descente, combat, gardien, et chaque jeu du Cercle de l’Abysse.')}
        <div class="set-row col"><label for="mvol"><b>Volume de la musique</b></label><input id="mvol" type="range" min="0" max="1" step="0.05" value="${s.musicVol ?? 0.55}" ${s.sound && s.music !== false ? '' : 'disabled'}></div>
        ${s.sound && s.music !== false ? `<details class="dc-fold set-amb"><summary>${icon('sound')} Écouter les ambiances</summary><div class="set-sfx">${MUSIC_DEMO.map(([n], i) => `<button class="chip" data-mus="${i}">${n}</button>`).join('')}</div></details>` : ''}
        ${window.Capacitor?.isNativePlatform?.() ? '' : toggle('loud', 'Son même en mode silencieux', 'Le jeu reste audible quand le bouton silencieux de l’iPhone est activé (iOS 17 ou plus). Peut couper la musique d’une autre app.')}
        ${toggle('haptics', 'Vibrations', 'Petites vibrations sur les coups, les victoires et les cartes rares. Dans l’app, le téléphone vibre vraiment ; sur le site web, l’iPhone ne vibre presque pas.')}
        ${s.haptics !== false ? `${seg('hapLevel', 'Force des vibrations', [['0', 'Discrètes'], ['1', 'Normales'], ['2', 'Intenses']])}<p class="small muted set-note">Discrètes : seulement les grands moments (coups forts, victoires, cartes rares). Intenses : chaque vibration est plus marquée.</p>` : ''}
        ${notifSupported() ? `<div class="set-row"><div><b>Notifications</b><p class="small muted">${pushSupported() ? 'Booster du jour (10 h), offrande du soir, série en danger, Tirage des Ombres, à toi de jouer en ligne, défis reçus, défi relevé au Choc des Boosters, demandes d’ami.' : 'Booster du jour (10 h), offrande du soir, série en danger, Tirage des Ombres, et rappel 2 h avant la fin du délai quand c’est à toi de jouer en ligne.'}</p></div><button class="switch" role="switch" aria-checked="${!!s.notif}" data-act="notif" aria-label="Notifications"><i></i></button></div>` : ''}
      </section>
      <section class="panel stack">
        <h2>Affichage</h2>
        ${seg('motion', 'Animations', [['auto', 'Selon l’appareil'], ['reduced', 'Réduites'], ['full', 'Complètes']])}
        ${toggle('fastOpen', 'Ouverture rapide des boosters', 'Affiche directement le récapitulatif, sans révéler les cartes une par une.')}
      </section>
`;
  }
  /* v732 : médaillon de chaque groupe de tutoriels (images peintes : assets/icons/tuto-<clé>.webp quand elles arrivent) */
  const TUTO_PAINTED = new Set(['combat', 'descente', 'cercle', 'cartes', 'reglages']);
  const tic = (k, fb) => picon(TUTO_PAINTED.has(k) ? `tuto-${k}` : fb);
  const TUTO_IC = { 'Combat': tic('combat', 'swords'), 'Descente': tic('descente', 'door-boss'), 'Cercle de l’Abysse': tic('cercle', 'seal'), 'Cartes': tic('cartes', 'cards'), 'Réglages': tic('reglages', 'settings') };
  function tabTutos() {
    const seen = g.s.tips || {};
    /* v545 : l'ancien groupe « Aventure » séparé en Descente et Cercle de l’Abysse (jeux regroupés) */
    const DESC = ['army-doors', 'dc-torches', 'trials', 'cb-talent', 'dc-nightmare'];
    const GAMES = ['sceaux', 'sceaux-board', 'sceaux-sacre', 'sceaux-combo', 'sceaux-perks', 'sceaux-awake', 'pacte', 'pacte-play', 'cryptes', 'cryptes-play', 'encheres', 'encheres-play'];
    const grp = (t) => (GAMES.includes(t.key) ? 'Cercle de l’Abysse' : DESC.includes(t.key) || t.group === 'Aventure' ? 'Descente' : t.group);
    const ord = (t) => { const k = [DESC, GAMES].map((l) => l.indexOf(t.key)).find((x) => x >= 0); return k ?? TUTOS.indexOf(t); };
    const ORDER = ['Combat', 'Descente', 'Cercle de l’Abysse', 'Cartes', 'Réglages'];
    const groups = [...new Set(TUTOS.map(grp))].sort((a, b) => (ORDER.indexOf(a) + 99) % 99 - (ORDER.indexOf(b) + 99) % 99);
    const inGroup = (gr) => TUTOS.filter((t) => grp(t) === gr).sort((a, b) => ord(a) - ord(b));
    return `<section class="panel stack">
        <h2>Revoir les tutoriels</h2>
        <p class="small muted">Touche un tutoriel pour le relire. Ceux que tu n’as pas encore rencontrés apparaîtront d’eux-mêmes au bon moment, ou touche-les pour les lire dès maintenant.</p>
        <button class="set-tuto big" data-act="welcome"><span class="set-tuto-ic">${icon('sparkle')}</span><span><b>Le guide de départ</b><span class="small muted">Les bases d’ABYSSAL en quelques pages</span></span>${icon('next')}</button>
        ${groups.map((gr) => { const list = inGroup(gr), left = list.filter((t) => !seen[t.key]).length; /* v732 : un groupe replié par thème */
          return `<details class="set-tuto-grp" data-g="${esc(gr)}"${ui.tg?.has(gr) ? ' open' : ''}><summary><span class="set-tuto-gic">${TUTO_IC[gr] || picon('book')}</span><span><b>${esc(gr)}</b><span class="small muted">${list.length} tutoriel${list.length > 1 ? 's' : ''}${left ? ` · <em>${left} à découvrir</em>` : ''}</span></span>${icon('next')}</summary><div class="set-tuto-in">${list.map((t) => `<button class="set-tuto ${seen[t.key] ? '' : 'new'}" data-act="tuto" data-k="${t.key}"><span class="set-tuto-ic">${icon('info')}</span><span><b>${esc(t.title)}</b><span class="small muted">${seen[t.key] ? 'Déjà vu' : 'Pas encore rencontré'}</span></span>${icon('next')}</button>`).join('')}</div></details>`; }).join('')}
        <button class="btn small ghost" data-act="guide">${icon('back')}Réactiver toutes les bulles d’aide</button>
      </section>`;
  }
  // v329 : depuis le compte obligatoire, la sauvegarde est automatique (compte en ligne) ; l'ancien onglet Sauvegarde
  // devient un bloc replié « Avancé » en bas de l'onglet Jeu. v515 : plus de copie de secours (code ou fichier) : la partie vit sur le compte
  function tabSave() {
    return `<details class="panel dc-fold set-adv"><summary>${icon('seal')} Avancé : effacement</summary><div class="stack">
        <p class="small">Ta partie est liée à <b>ton compte</b> et sauvegardée en ligne automatiquement : tu n’as rien à faire, et tu la retrouves sur n’importe quel appareil en te connectant avec ton e-mail.</p>
        ${app.persistent ? '' : '<p class="small err">Le stockage local est indisponible : la progression sera perdue à la fermeture.</p>'}
        <p class="small muted">Dernier enregistrement : ${new Date(g.s.updatedAt).toLocaleString('fr-FR')}.</p>
        <button class="btn danger small" data-act="reset">${icon('trash')}Effacer toute la progression</button>
      </div></details>`;
  }
  function tabAbout(s) {
    /* v622 : le Mode Créateur et le test du son ne sont plus ici (tuile du Sanctuaire, pouvoirs du créateur) */
    return `      <section class="panel stack about">
        <h2>À propos</h2>
        <p class="small">ABYSSAL — Le Bestiaire interdit.</p>
        <p class="small muted" data-act="vtap">Version ${esc(app.version)} · ${app.catalog.cards.length} cartes</p>
        <p class="small muted set-partie">${partieLine()}</p>
        ${liveOn() ? `<p class="small muted set-live">${liveLine()}</p><p class="small muted set-live-why" translate="no">${liveWhy()}</p><button class="btn ghost small block" data-act="livecheck">${icon('eye')} Chercher une mise à jour</button>` : ''}
        <a class="btn ghost small block" href="confidentialite.html" target="_blank" rel="noopener">${icon('book')} Politique de confidentialité</a>
        <!-- v700 : Apple vérifie qu'on trouve facilement la restauration des achats et la suppression du compte -->
        ${iapStatus() !== 'web' ? `<button class="btn ghost small block" data-act="restore">${icon('star')} Restaurer mes achats</button>` : ''}
        <a class="btn ghost small block" href="#/compte">${icon('user')} Mon compte (mot de passe, suppression)</a>
      </section>
      ${isGardien() ? `<button class="online-pill gardien" data-act="online" aria-live="polite"><img class="on-ic" alt="" src="assets/icons/online.webp"><span class="on-dot"></span><span class="on-t">Connexion…</span><span class="on-see">Voir</span></button><div class="on-inline"><p class="small muted center">Chargement des pseudos…</p></div>` : ''}`;
  }
  function paintPill(p = presence) {
    const pill = root.querySelector('.online-pill'); if (!pill) return;
    pill.classList.toggle('live', p.status === 'on');
    pill.querySelector('.on-t').innerHTML = p.status === 'on' ? `<b>${fmt(p.count)}</b> joueur${p.count > 1 ? 's' : ''} en ligne` : p.status === 'connecting' ? 'Connexion…' : 'Hors ligne';
  }
  /* v608 : liste des joueurs connectés (comptes vus depuis moins de 2 min 30) */
  function openOnline() {
    const sh = openSheet('<h2>Joueurs en ligne</h2><p class="small muted">Chargement…</p>', { label: 'Joueurs en ligne' });
    const load = async () => {
      let rows;
      try { rows = await onlineList(); } catch (e) {
        if (!sh.closed) sh.setContent(`<h2>Joueurs en ligne</h2><p class="small muted">${onErr(e)}</p>`);
        return;
      }
      if (sh.closed) return;
      const ago = (t) => { const n = Math.max(0, Math.round((Date.now() - new Date(t).getTime()) / 1000)); return n < 60 ? 'à l’instant' : `il y a ${Math.floor(n / 60)} min`; };
      sh.setContent(`<h2>Joueurs en ligne</h2>
        <p class="small muted">Comptes connectés : <b>${fmt(rows.length)}</b>${presence.count != null ? ` · appareils ouverts : <b>${fmt(presence.count)}</b>` : ''}</p>
        <p class="small muted">Touche un joueur pour voir son profil.</p>
        <div class="on-list">${rows.length ? rows.map((r) => { const av = r.avatar && app.catalog.get(r.avatar); return `<div class="lb-row"${profileAttrs(r.id)}><span class="lb-av">${av ? `<img alt="" src="${artUrl(av, { lite: true })}">` : EMBLEM}</span><span class="lb-name"><b translate="no">${esc(r.pseudo)}</b>${r.title ? `<span class="small muted">${esc(r.title)}</span>` : ''}<span class="small muted on-ago">Niv. ${fmt(r.level || 1)} · ${ago(r.seen_at)}</span></span></div>`; }).join('') : '<p class="small muted center">Aucun compte connecté pour l’instant.</p>'}</div>
        <button class="btn ghost small block" data-on-refresh>Actualiser</button>`);
      sh.body.querySelector('[data-on-refresh]')?.addEventListener('click', load);
      sh.body.querySelectorAll('[data-profile]').forEach((x) => x.addEventListener('click', () => sh.close()));
    };
    load();
  }
  /* v657 : les pseudos des joueurs connectés s'affichent directement sous la pastille (avant : seulement dans la fenêtre « Voir ») */
  const onErr = (e) => /404|PGRST202|function|schema cache/i.test(String(e?.message || e) + ' ' + (e?.status || '')) ? 'La liste n’est pas encore ouverte sur le serveur : colle <b>supabase/16-en-ligne.sql</b> dans Supabase → SQL Editor → New query → Run.' : /créateur|gardien|42501|P0001/i.test(String(e?.message || e)) ? 'Le serveur ne reconnaît pas ce compte comme « Le Gardien ».' : 'Liste indisponible pour l’instant. Réessaie dans un moment.';
  async function paintInline() {
    const box = root.querySelector('.on-inline'); if (!box) return;
    let rows;
    try { rows = await onlineList(); } catch (e) { if (box.isConnected) box.innerHTML = `<p class="small muted center">${onErr(e)}</p>`; return; }
    if (!box.isConnected) return;
    box.innerHTML = rows.length ? `<p class="small muted">Comptes connectés : <b>${fmt(rows.length)}</b></p>` + rows.map((r) => `<div class="on-name"${profileAttrs(r.id)}><b translate="no">${esc(r.pseudo || '?')}</b><span class="small muted"> · Niv. ${fmt(r.level || 1)}</span></div>`).join('') : '<p class="small muted center">Aucun compte connecté pour l’instant.</p>';
  }
  function render() {
    const s = g.s.settings;
    const body = { jeu: (x) => tabJeu(x) + tabSave(), tutos: tabTutos, about: tabAbout }[ui.tab] || ((x) => tabJeu(x) + tabSave());
    paint(root, `
      <header class="screen-head ui-hero bn-settings"><h1>Réglages</h1><p class="muted">Langue, son, combat, tutoriels.</p></header>
      <nav class="set-tabs" role="tablist">${TABS.map(([k, l, ic, fb]) => `<button class="set-tab" role="tab" aria-selected="${ui.tab === k}" data-act="tab" data-k="${k}">${tabIcon(ic, fb)}<span>${l}</span></button>`).join('')}</nav>
      <div class="set-body">${body(s)}</div>`);
    paintPill(); if (isGardien() && ui.tab === 'about') paintInline();
    root.querySelectorAll('[data-mus]').forEach((b) => !b.__b && (b.__b = 1) && b.addEventListener('click', () => { musicPreview(MUSIC_DEMO[+b.dataset.mus][1]); root.querySelectorAll('[data-mus]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }));
    /* v707 : paint() garde les blocs inchangés : on n'ajoute un écouteur qu'une fois */
    const once = (el) => (el && !el.__b ? ((el.__b = 1), el) : null);
    const mv = once(root.querySelector('#mvol'));
    mv?.addEventListener('input', (e) => { g.s.settings.musicVol = Number(e.target.value); app.applySettings(); });
    mv?.addEventListener('change', (e) => g.setSetting('musicVol', Number(e.target.value)));
    once(root.querySelector('#vol'))?.addEventListener('change', (e) => { g.setSetting('volume', Number(e.target.value)); app.applySettings(); sfx.tap(); });
  }

  /* v732 : on retient les groupes de tutoriels ouverts */
  root.addEventListener('toggle', (e) => { const d = e.target; if (!d.matches?.('.set-tuto-grp')) return; ui.tg ||= new Set(); if (d.open) ui.tg.add(d.dataset.g); else ui.tg.delete(d.dataset.g); }, true);
  bindActions(root, {
    toggle(el) { g.setSetting(el.dataset.k, !g.s.settings[el.dataset.k]); app.applySettings(); render(); },
    seg(el) { g.setSetting(el.dataset.k, el.dataset.v); app.applySettings(); render(); if (el.dataset.k === 'hapLevel') haptic('crit'); /* v705 : essai de la force choisie */ },
    async notif() { await notifEnable(app, !g.s.settings.notif); render(); },
    lang(el) { if (el.dataset.v !== LANG) setLang(el.dataset.v); },
    async reset() {
      if (!(await confirmBox('Effacer définitivement toute ta progression, sur cet appareil <b>et sur ton compte en ligne</b> ?', { ok: 'Effacer', danger: true }))) return;
      if (!(await confirmBox('Dernière confirmation : la collection, les éclats et les succès seront perdus.', { ok: 'Tout effacer', danger: true }))) return;
      g.reset();
      app.applySettings();
      let online = null;
      try { online = await eraseOnline(); } catch (e) { online = false; }
      toast(online === false && isLoggedIn() ? 'Progression effacée sur ce téléphone, mais pas encore en ligne (réseau). Garde l’app ouverte quelques secondes.' : 'Progression effacée.', { icon: 'trash' });
      app.go('');
    },
    /* v707 : changer d'onglet quand les onglets sont collés en haut : on repart du début du nouvel onglet,
       onglets à la même place (avant, la page sautait quand le nouvel onglet était plus court) */
    tab(el) {
      const nav = root.querySelector('.set-tabs'), head = root.querySelector('.screen-head');
      const lim = head && nav ? Math.max(0, head.getBoundingClientRect().bottom + window.scrollY + (parseFloat(getComputedStyle(nav).marginTop) || 0) - (parseFloat(getComputedStyle(nav).top) || 0)) : 0;
      const stuck = window.scrollY > lim;
      ui.tab = el.dataset.k; sfx.tap(); render();
      if (stuck) window.scrollTo(0, lim);
    },
    online() { openOnline(); },
    livecheck() { liveCheck({ force: true }); },
    async restore() {
      const st = iapStatus(); if (st !== 'ok') { toast(esc(t(IAP_WHY[st])), { icon: 'info' }); return; }
      try { const got = await withPending(iapRestore(app), t('Vérification de tes achats…')); toast(got.length ? t('{n} achat(s) ajouté(s).', { n: got.length }) : t('Tout est déjà à toi : rien à restaurer.'), { kind: got.length ? 'success' : 'info', icon: got.length ? 'star' : 'check' }); }
      catch (err) { toast(esc(err.message), { kind: 'error' }); }
    },
    /* v707 : à la fermeture de la bulle, seule la ligne change (« Déjà vu ») : plus de page redessinée qui saute */
    tuto(el) { tuto(app, el.dataset.k, { force: true }).then(() => { const b = root.querySelector(`[data-act="tuto"][data-k="${el.dataset.k}"]`); if (!b) return render(); b.classList.remove('new'); const m = b.querySelector('.small.muted'); if (m) m.textContent = t('Déjà vu'); }); },
    welcome() { showWelcome(app, { force: true }); },
    guide() { resetTips(app); toast('Les bulles d’aide réapparaîtront au bon moment.', { icon: 'info' }); render(); },
    // v412 : Mode Créateur sans badge en ligne (l'app iPhone n'a pas toujours le profil) : 7 touchers sur la version, puis le code
    vtap() {
      ui.vtaps = (ui.vtaps || 0) + 1;
      if (ui.vtaps < 7 || g.s.settings.dev) return;
      ui.vtaps = 0;
      const sh = openSheet('<h2 class="center">Mode Créateur</h2><p class="small muted center">Entre le code du créateur.</p><input class="input" id="crcode" autocomplete="off" autocapitalize="none" spellcheck="false"><button class="btn gold block" id="crok">Valider</button>', { cls: 'sheet-small', label: 'Code créateur' });
      sh.body.querySelector('#crok').addEventListener('click', async () => {
        const v = String(sh.body.querySelector('#crcode').value || '').trim().toUpperCase();
        let ok = false;
        try { ok = (await sha256(v)) === CREATOR_HASH; } catch (e) { ok = false; }
        if (!ok) { toast('Code incorrect.', { kind: 'error' }); return; }
        g.s.settings.devCode = true; /* v462 : ouvert par le code : le profil en ligne sans badge ne le referme plus */
        g.setSetting('dev', true); sh.close(); toast('Mode Créateur activé : il est dans le Sanctuaire.', { icon: 'crown' }); render();
      });
    },
    creator() { if (!g.s.settings.dev) g.setSetting('dev', true); render(); openCreator(app); },
  });
  render();
  // le badge peut arriver du serveur après l'affichage
  const before = sync.profile?.badge;
  let wasG = isGardien();
  const off = onSync(() => { if (sync.profile?.badge !== before || isGardien() !== wasG) { wasG = isGardien(); render(); } });
  const onTick = setInterval(() => { if (!document.hidden && isGardien() && ui.tab === 'about') paintInline(); }, 30000);
  refreshProfile(false);
  // v413 : joueurs en ligne, seulement ici (en bas de À propos), mis à jour en direct
  const offP = onPresence(paintPill);
  const offL = onLiveStatus((st) => { const el = root.querySelector('.set-live'); if (el) el.textContent = liveLine(st); const w = root.querySelector('.set-live-why'); if (w) w.innerHTML = liveWhy(st); });
  return () => { off(); offP(); offL(); clearInterval(onTick); };
}

