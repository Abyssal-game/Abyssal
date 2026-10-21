// Réglages : son, animations, accessibilité, sauvegarde (le Mode Créateur est dans creator.js).
import { notifSupported, enable as notifEnable } from '../notify.js';
import { resetTips } from '../ui/coach.js';
import { TUTOS, tuto } from '../ui/tutos.js';
import { icon } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, openSheet, bindActions } from '../ui/dom.js';
import { sfx, audioInfo } from '../ui/sound.js';
import { partie, pendingOps } from '../cloud/partie.js';
/* v539 : où vit la progression (serveur de partie, ou ancienne sauvegarde tant qu'il n'est pas en place) */
const partieLine = () => (partie.mode === 'server' ? `Progression gardée par le serveur${pendingOps() ? ` · ${pendingOps()} action${pendingOps() > 1 ? 's' : ''} à envoyer` : ''}` : partie.mode === 'legacy' ? 'Progression : ancienne sauvegarde en ligne' : 'Progression : serveur pas encore joint');
import { MUSIC_DEMO, musicPreview } from '../ui/music.js';
import { sync, onSync, refreshProfile, eraseOnline } from '../cloud/sync.js';
import { isLoggedIn } from '../cloud/cloud.js';
import { openCreator } from './creator.js';
import { showWelcome } from './welcome.js';
import { onPresence, presence } from '../cloud/presence.js';
import { LANGS, LANG, setLang } from '../i18n.js';
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
      <section class="panel stack">
        <h2>Son et animations</h2>
        ${toggle('sound', 'Effets sonores', 'Ouverture, révélation, combat. Le mode silencieux de l’iPhone peut les couper.')}
        <div class="set-row col"><label for="vol"><b>Volume</b></label><input id="vol" type="range" min="0" max="1" step="0.05" value="${s.volume}" ${s.sound ? '' : 'disabled'}></div>
        ${toggle('music', 'Musique d’ambiance', 'Une ambiance différente selon le lieu : Accueil, Butin, Descente, combat, gardien, et chaque jeu de la Salle des jeux.')}
        <div class="set-row col"><label for="mvol"><b>Volume de la musique</b></label><input id="mvol" type="range" min="0" max="1" step="0.05" value="${s.musicVol ?? 0.55}" ${s.sound && s.music !== false ? '' : 'disabled'}></div>
        ${s.sound && s.music !== false ? `<div class="set-row col"><b>Écouter les ambiances</b><div class="set-sfx">${MUSIC_DEMO.map(([n], i) => `<button class="chip" data-mus="${i}">${n}</button>`).join('')}</div></div>` : ''}
        ${window.Capacitor?.isNativePlatform?.() ? '' : toggle('loud', 'Son même en mode silencieux', 'Le jeu reste audible quand le bouton silencieux de l’iPhone est activé (iOS 17 ou plus). Peut couper la musique d’une autre app.')}
        ${toggle('haptics', 'Vibrations', 'Petites vibrations sur les coups, les victoires et les cartes rares. Dans l’app, le téléphone vibre vraiment ; sur le site web, l’iPhone ne vibre presque pas.')}
        ${notifSupported() ? `<div class="set-row"><div><b>Notifications</b><p class="small muted">Booster gratuit du jour (10 h) et rappel 2 h avant la fin du délai quand c’est à toi de jouer en ligne.</p></div><button class="switch" role="switch" aria-checked="${!!s.notif}" data-act="notif" aria-label="Notifications"><i></i></button></div>` : ''}
        ${seg('motion', 'Animations', [['auto', 'Selon l’appareil'], ['reduced', 'Réduites'], ['full', 'Complètes']])}
        ${seg('defense', 'Défense active en combat', [['on', 'Manuelle'], ['auto', 'Automatique']])}
        <p class="small muted set-note">Manuelle : touche dans la zone dorée pour esquiver, sur le trait blanc pour une parade parfaite. Automatique : rien à toucher, mais seulement 4 esquives sur 10 et jamais de parade parfaite (moins de Ferveur et de PA).</p>
        ${seg('decor', 'Décor des combats', [['riche', 'Riche'], ['sobre', 'Sobre']])}
        <p class="small muted set-note">Sobre : la salle reste en place, sans particules ni flammes qui vacillent. Plus reposant, et un peu plus économe en batterie.</p>
        ${seg('quality', 'Effets des combats', [['auto', 'Complets'], ['light', 'Allégés']])}
        <p class="small muted set-note">Allégés : moins de particules, ni secousses de caméra ni éclairs, décor sobre. À essayer si les combats saccadent.</p>
        ${toggle('fastOpen', 'Ouverture rapide des boosters', 'Affiche directement le récapitulatif, sans révéler les cartes une par une.')}
      </section>
`;
  }
  function tabTutos() {
    const seen = g.s.tips || {};
    const groups = [...new Set(TUTOS.map((t) => t.group))];
    return `<section class="panel stack">
        <h2>Revoir les tutoriels</h2>
        <p class="small muted">Touche un tutoriel pour le relire. Ceux que tu n’as pas encore rencontrés apparaîtront d’eux-mêmes au bon moment, ou touche-les pour les lire dès maintenant.</p>
        <button class="set-tuto big" data-act="welcome"><span class="set-tuto-ic">${icon('sparkle')}</span><span><b>Le guide de départ</b><span class="small muted">Les bases d’ABYSSAL en quelques pages</span></span>${icon('next')}</button>
        ${groups.map((gr) => `<h3 class="set-tuto-g">${esc(gr)}</h3>${TUTOS.filter((t) => t.group === gr).map((t) => `<button class="set-tuto ${seen[t.key] ? '' : 'new'}" data-act="tuto" data-k="${t.key}"><span class="set-tuto-ic">${icon('info')}</span><span><b>${esc(t.title)}</b><span class="small muted">${seen[t.key] ? 'Déjà vu' : 'Pas encore rencontré'}</span></span>${icon('next')}</button>`).join('')}`).join('')}
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
    return `${sync.profile?.badge === 'createur' || s.dev ? `<section class="panel stack cr-entry"><h2>${icon('crown')} Mode Créateur</h2>
        <p class="small muted">Réservé au badge Créateur : ressources, cartes, variantes, boosters imposés et Descente à volonté.</p>
        <button class="btn gold block" data-act="creator">${s.dev ? 'Ouvrir les pouvoirs' : 'Activer le Mode Créateur'}</button></section>` : ''}
      <section class="panel stack about">
        <h2>À propos</h2>
        <p class="small">ABYSSAL — Le Bestiaire interdit.</p>
        <p class="small muted" data-act="vtap">Version ${esc(app.version)} · ${app.catalog.cards.length} cartes</p>
        <p class="small muted set-partie">${partieLine()}</p>
        ${s.dev ? `<p class="small muted set-audio">${(() => { const a = audioInfo(); return `Son : ${esc(a.state)} · ${a.samples}${a.expected != null ? `/${a.expected}` : ''} sons chargés · session ${esc(String(a.session))}${a.enabled ? '' : ' · coupé dans les réglages'}${a.diag.failGet || a.diag.failDecode || a.diag.err ? ` · échecs lecture ${a.diag.failGet}, décodage ${a.diag.failDecode}${a.diag.err ? ` · ${esc(a.diag.err)}` : ''}` : ''}`; })()}</p>
        <button class="btn ghost small" data-act="sndtest">${icon('dodge')} Tester le son</button>` : ''}
        <a class="btn ghost small" href="confidentialite.html" target="_blank" rel="noopener">${icon('book')} Politique de confidentialité</a>
      </section>
      <div class="online-pill" role="status" aria-live="polite"><img class="on-ic" alt="" src="assets/icons/online.webp"><span class="on-dot"></span><span class="on-t">Connexion…</span></div>`;
  }
  function paintPill(p = presence) {
    const pill = root.querySelector('.online-pill'); if (!pill) return;
    pill.classList.toggle('live', p.status === 'on');
    pill.querySelector('.on-t').innerHTML = p.status === 'on' ? `<b>${fmt(p.count)}</b> joueur${p.count > 1 ? 's' : ''} en ligne` : p.status === 'connecting' ? 'Connexion…' : 'Hors ligne';
  }
  function render() {
    const s = g.s.settings;
    const body = { jeu: (x) => tabJeu(x) + tabSave(), tutos: tabTutos, about: tabAbout }[ui.tab] || ((x) => tabJeu(x) + tabSave());
    root.innerHTML = `
      <header class="screen-head ui-hero bn-settings"><h1>Réglages</h1><p class="muted">Jeu, son, tutoriels.</p></header>
      <nav class="set-tabs" role="tablist">${TABS.map(([k, l, ic, fb]) => `<button class="set-tab" role="tab" aria-selected="${ui.tab === k}" data-act="tab" data-k="${k}">${tabIcon(ic, fb)}<span>${l}</span></button>`).join('')}</nav>
      <div class="set-body">${body(s)}</div>`;
    paintPill();
    root.querySelectorAll('[data-mus]').forEach((b) => b.addEventListener('click', () => { musicPreview(MUSIC_DEMO[+b.dataset.mus][1]); root.querySelectorAll('[data-mus]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }));
    root.querySelector('#mvol')?.addEventListener('input', (e) => { g.s.settings.musicVol = Number(e.target.value); app.applySettings(); });
    root.querySelector('#mvol')?.addEventListener('change', (e) => g.setSetting('musicVol', Number(e.target.value)));
    root.querySelector('#vol')?.addEventListener('change', (e) => { g.setSetting('volume', Number(e.target.value)); app.applySettings(); sfx.tap(); });
  }

  bindActions(root, {
    toggle(el) { g.setSetting(el.dataset.k, !g.s.settings[el.dataset.k]); app.applySettings(); render(); },
    seg(el) { g.setSetting(el.dataset.k, el.dataset.v); app.applySettings(); render(); },
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
    tab(el) { ui.tab = el.dataset.k; sfx.tap(); render(); },
    sndtest() { app.applySettings(); sfx.victory?.(); setTimeout(render, 900); },
    tuto(el) { tuto(app, el.dataset.k, { force: true }).then(() => render()); },
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
        g.setSetting('dev', true); sh.close(); toast('Mode Créateur activé.', { icon: 'crown' }); render();
      });
    },
    creator() { if (!g.s.settings.dev) g.setSetting('dev', true); render(); openCreator(app); },
  });
  render();
  // le badge peut arriver du serveur après l'affichage
  const before = sync.profile?.badge;
  const off = onSync(() => { if (sync.profile?.badge !== before) render(); });
  refreshProfile(false);
  // v413 : joueurs en ligne, seulement ici (en bas de À propos), mis à jour en direct
  const offP = onPresence(paintPill);
  return () => { off(); offP(); };
}

