// Réglages : son, animations, accessibilité, sauvegarde, outils de développement.
import { resetTips } from '../ui/coach.js';
import { TUTOS, tuto } from '../ui/tutos.js';
import { icon } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, openSheet, bindActions } from '../ui/dom.js';
import { exportCode, importCode } from '../core/save.js';
import { drawBooster } from '../core/boosters.js';
import { RARITIES, RARITY_ORDER, BOOSTERS } from '../config.js';
import { sfx, audioInfo } from '../ui/sound.js';
import { MUSIC_DEMO, musicPreview } from '../ui/music.js';
import { sync, onSync, refreshProfile, eraseOnline } from '../cloud/sync.js';
import { isLoggedIn } from '../cloud/cloud.js';
import { openCreator } from './creator.js';
import { showWelcome } from './welcome.js';
import { shareFile } from '../native.js';
import { onPresence, presence } from '../cloud/presence.js';
/* v418 : code du Mode Créateur choisi par le propriétaire ; seule son empreinte SHA-256 (en majuscules) est dans le code */
const CREATOR_HASH = '3274532b664a7813ce3cb1ed2bb1955a2f2638118a3d0b76cf8f58b050cfb3e0';
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
        <h2>Son et animations</h2>
        ${toggle('sound', 'Effets sonores', 'Ouverture, révélation, combat. Le mode silencieux de l’iPhone peut les couper.')}
        <div class="set-row col"><label for="vol"><b>Volume</b></label><input id="vol" type="range" min="0" max="1" step="0.05" value="${s.volume}" ${s.sound ? '' : 'disabled'}></div>
        ${toggle('music', 'Musique d’ambiance', 'Une ambiance différente selon le lieu : Accueil, Butin, Descente, combat, gardien, et chaque jeu de la Salle des jeux.')}
        <div class="set-row col"><label for="mvol"><b>Volume de la musique</b></label><input id="mvol" type="range" min="0" max="1" step="0.05" value="${s.musicVol ?? 0.55}" ${s.sound && s.music !== false ? '' : 'disabled'}></div>
        ${s.sound && s.music !== false ? `<div class="set-row col"><b>Écouter les ambiances</b><div class="set-sfx">${MUSIC_DEMO.map(([n], i) => `<button class="chip" data-mus="${i}">${n}</button>`).join('')}</div></div>` : ''}
        ${window.Capacitor?.isNativePlatform?.() ? '' : toggle('loud', 'Son même en mode silencieux', 'Le jeu reste audible quand le bouton silencieux de l’iPhone est activé (iOS 17 ou plus). Peut couper la musique d’une autre app.')}
        ${toggle('haptics', 'Vibrations', 'Petites vibrations sur les coups, les victoires et les cartes rares. Sur iPhone, il faut iOS 18 ou plus.')}
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
  // devient un bloc replié « Avancé » en bas de l'onglet Jeu (copie de secours et effacement)
  function tabSave() {
    return `<details class="panel dc-fold set-adv"><summary>${icon('seal')} Avancé : copie de secours, effacement</summary><div class="stack">
        ${isLoggedIn() ? '<p class="small">Ta partie est sauvegardée <b>automatiquement</b> sur ton compte en ligne : tu n’as rien à faire, et tu la retrouves sur n’importe quel appareil en te connectant. Une copie de secours reste possible ici.</p>' : '<p class="small"><b>Sans compte</b>, ta partie n’est gardée que sur ce téléphone : elle serait perdue si tu supprimes l’application ou changes de téléphone. <a href="#/compte">Crée un compte</a> pour la sauvegarder en ligne, ou garde une copie de secours ici.</p>'}
        ${app.persistent ? '' : '<p class="small err">Le stockage local est indisponible : la progression sera perdue à la fermeture.</p>'}
        <div class="row gap wrap">
          <button class="btn small" data-act="export">${icon('copy')}Copier le code</button>
          <button class="btn small" data-act="download">${icon('download')}Fichier de sauvegarde</button>
          <button class="btn small" data-act="import">${icon('upload')}Importer</button>
        </div>
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
    async export() {
      const code = exportCode(g.s);
      try { await navigator.clipboard.writeText(code); toast('Code de sauvegarde copié. Garde-le dans tes notes.', { kind: 'success', icon: 'copy' }); }
      catch (e) {
        const sh = openSheet(`<h2>Code de sauvegarde</h2><p class="small">Copie ce texte et garde-le précieusement.</p><textarea class="input" readonly>${esc(code)}</textarea>`, { label: 'Code de sauvegarde' });
        sh.body.querySelector('textarea').select();
      }
    },
    async download() {
      const name = `abyssal-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, text = JSON.stringify(g.s, null, 1);
      try { if (await shareFile(name, text)) return; } catch (e) { toast(esc(`Partage impossible : ${e.message || e}`), { kind: 'error', icon: 'info' }); return; }
      const blob = new Blob([text], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast('Fichier de sauvegarde créé.', { kind: 'success', icon: 'download' });
    },
    import() {
      const sh = openSheet(`<h2>Importer une sauvegarde</h2>
        <p class="small">Colle un code de sauvegarde ABYSSAL ou choisis un fichier. <b>La progression actuelle de cet appareil sera remplacée.</b></p>
        <textarea class="input" id="imp-code" placeholder="ABYSSAL1:…"></textarea>
        <div class="row gap wrap"><label class="btn small">${icon('upload')}Choisir un fichier<input type="file" id="imp-file" accept=".json,application/json,text/plain" hidden></label><button class="btn primary small" id="imp-go">Importer</button></div>
        <p class="small err" id="imp-err" role="alert"></p>`, { label: 'Importer' });
      const ta = sh.body.querySelector('#imp-code');
      sh.body.querySelector('#imp-file').addEventListener('change', async (e) => { const f = e.target.files[0]; if (f) ta.value = await f.text(); });
      sh.body.querySelector('#imp-go').addEventListener('click', async () => {
        let save;
        try { save = importCode(ta.value); } catch (err) { sh.body.querySelector('#imp-err').textContent = err.message; return; }
        const n = Object.keys(save.collection || {}).length;
        if (!(await confirmBox(`Remplacer ta progression par cette sauvegarde (${n} créatures, ${fmt(save.shards)} éclats) ?`, { ok: 'Remplacer', danger: true }))) return;
        g.replaceSave(save);
        app.applySettings();
        sh.close();
        toast('Sauvegarde importée.', { kind: 'success', icon: 'upload' });
        app.refresh();
      });
    },
    async reset() {
      if (!(await confirmBox('Effacer définitivement toute ta progression, sur cet appareil <b>et sur ton compte en ligne</b> ?', { ok: 'Effacer', danger: true }))) return;
      if (!(await confirmBox('Dernière confirmation : la collection, les éclats et les succès seront perdus. Pense à exporter d’abord.', { ok: 'Tout effacer', danger: true }))) return;
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
        g.setSetting('dev', true); sh.close(); toast('Mode Créateur activé.', { icon: 'crown' }); render();
      });
    },
    creator() { if (!g.s.settings.dev) g.setSetting('dev', true); render(); openCreator(app); },
    dev(el) {
      const x = el.dataset.x;
      if (x === 'shards') g.devGrant({ shards: 1000 });
      if (x === 'ash') g.devGrant({ ash: 1000 });
      if (x === 'tickets') g.devGrant({ tickets: Object.fromEntries(Object.keys(BOOSTERS).map((k) => [k, 5])) });
      if (x === 'pity') { g.s.pity = { sinceHR: 0, sinceM: 0 }; g.persist(); }
      if (x === 'pityhr') { g.s.pity.sinceHR = 9; g.persist(); }
      if (x === 'all') g.devUnlockAll();
      if (x === 'off') { g.setSetting('dev', false); render(); return; }
      if (x === 'sim') return simulate(app);
      toast('Fait.', { icon: 'code' });
    },
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

function simulate(app) {
  const N = 10000;
  const rows = Object.keys(BOOSTERS).map((type) => {
    const count = {}; let cards = 0; let pity = { sinceHR: 0, sinceM: 0 }, guar = 0;
    for (let i = 0; i < N; i++) {
      const r = drawBooster(type, app.catalog, { pity, faction: 'infernal' });
      pity = r.pity; if (r.guaranteed) guar++;
      r.cards.forEach((c) => { count[c.rarity] = (count[c.rarity] || 0) + 1; cards++; });
    }
    return `<tr><th scope="row">${esc(BOOSTERS[type].name)}</th>${RARITY_ORDER.map((k) => `<td>${(((count[k] || 0) / cards) * 100).toFixed(2).replace('.', ',')} %</td>`).join('')}<td>${guar}</td></tr>`;
  }).join('');
  openSheet(`<h2>Simulation : ${fmt(N)} boosters par type</h2><p class="small muted">Tirages réels du jeu, sans rien enregistrer. Pourcentages par carte obtenue ; la dernière colonne compte les garanties déclenchées.</p>
    <div class="table-wrap"><table class="odds"><thead><tr><th></th>${RARITIES.map((r) => `<th style="color:${r.color}">${r.short}</th>`).join('')}<th>Gar.</th></tr></thead><tbody>${rows}</tbody></table></div>`, { label: 'Simulation' });
}
