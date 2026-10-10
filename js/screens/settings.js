// Réglages : son, animations, accessibilité, sauvegarde, outils de développement.
import { icon } from '../ui/icons.js';
import { esc, fmt, toast, confirmBox, openSheet, bindActions } from '../ui/dom.js';
import { exportCode, importCode } from '../core/save.js';
import { drawBooster } from '../core/boosters.js';
import { RARITIES, RARITY_ORDER, BOOSTERS } from '../config.js';
import { sfx } from '../ui/sound.js';
import { sync, onSync, refreshProfile } from '../cloud/sync.js';
import { openCreator } from './creator.js';

export default function settings(app, root) {
  const g = app.game;
  let taps = 0;

  function toggle(key, label, desc) {
    const on = !!g.s.settings[key];
    return `<div class="set-row"><div><b>${label}</b>${desc ? `<p class="small muted">${desc}</p>` : ''}</div><button class="switch" role="switch" aria-checked="${on}" data-act="toggle" data-k="${key}" aria-label="${esc(label)}"><i></i></button></div>`;
  }
  function seg(key, label, opts) {
    return `<div class="set-row col"><b>${label}</b><div class="seg" role="radiogroup" aria-label="${esc(label)}">${opts.map(([v, l]) => `<button class="seg-b" role="radio" data-act="seg" data-k="${key}" data-v="${v}" aria-checked="${g.s.settings[key] === v}" aria-pressed="${g.s.settings[key] === v}">${l}</button>`).join('')}</div></div>`;
  }

  function render() {
    const s = g.s.settings;
    root.innerHTML = `
      <header class="screen-head"><h1>Réglages</h1></header>
      <section class="panel stack">
        <h2>Son et animations</h2>
        ${toggle('sound', 'Effets sonores', 'Sons synthétisés : ouverture, révélation, succès.')}
        <div class="set-row col"><label for="vol"><b>Volume</b></label><input id="vol" type="range" min="0" max="1" step="0.05" value="${s.volume}" ${s.sound ? '' : 'disabled'}></div>
        ${seg('motion', 'Animations', [['auto', 'Selon l’appareil'], ['reduced', 'Réduites'], ['full', 'Complètes']])}
        ${toggle('fastOpen', 'Ouverture rapide des boosters', 'Affiche directement le récapitulatif, sans révéler les cartes une par une.')}
      </section>
      <section class="panel stack">
        <h2>Sauvegarde</h2>
        <p class="small">Ta progression est enregistrée <b>uniquement sur cet appareil</b>, dans ce navigateur, après chaque action. Elle n’est synchronisée nulle part. Pour la conserver ou la transférer, exporte-la régulièrement.</p>
        ${app.persistent ? '' : '<p class="small err">Le stockage local est indisponible : la progression sera perdue à la fermeture.</p>'}
        <div class="row gap wrap">
          <button class="btn small" data-act="export">${icon('copy')}Copier le code</button>
          <button class="btn small" data-act="download">${icon('download')}Fichier de sauvegarde</button>
          <button class="btn small" data-act="import">${icon('upload')}Importer</button>
        </div>
        <p class="small muted">Dernier enregistrement : ${new Date(g.s.updatedAt).toLocaleString('fr-FR')}.</p>
      </section>
      <section class="panel stack">
        <h2>Zone sensible</h2>
        <button class="btn danger small" data-act="reset">${icon('trash')}Effacer toute la progression</button>
      </section>
      ${sync.profile?.badge === 'createur' || s.dev ? `<section class="panel stack cr-entry"><h2>${icon('crown')} Mode Créateur</h2>
        <p class="small muted">Réservé au badge Créateur : ressources, cartes, variantes, boosters imposés, rituels et Descente à volonté.</p>
        <button class="btn gold block" data-act="creator">${s.dev ? 'Ouvrir les pouvoirs' : 'Activer le Mode Créateur'}</button></section>` : ''}
      <section class="panel stack about">
        <h2>À propos</h2>
        <p class="small">ABYSSAL — Le Bestiaire interdit. Créé par <b>Alexis Seguin</b>.</p>
        <p class="small muted" data-act="version">Version ${esc(app.version)} · ${app.catalog.cards.length} cartes</p>
      </section>`;
    root.querySelector('#vol')?.addEventListener('change', (e) => { g.setSetting('volume', Number(e.target.value)); app.applySettings(); sfx.tap(); });
  }

  function devPanel() {
    return `<section class="panel stack dev">
      <h2>${icon('code')} Outils de développement</h2>
      <p class="small muted">Pour tester l’économie et les tirages. Ces actions modifient réellement la sauvegarde.</p>
      <div class="row gap wrap">
        <button class="btn small" data-act="dev" data-x="shards">+1 000 éclats</button>
        <button class="btn small" data-act="dev" data-x="ash">+1 000 cendres</button>
        <button class="btn small" data-act="dev" data-x="tickets">+5 tickets de chaque</button>
        <button class="btn small" data-act="dev" data-x="pity">Garanties à zéro</button>
        <button class="btn small" data-act="dev" data-x="pityhr">Garantie HR au prochain</button>
        <button class="btn small" data-act="dev" data-x="sim">Simuler 10 000 boosters</button>
        <button class="btn small" data-act="dev" data-x="all">Tout débloquer</button>
        <button class="btn small" data-act="dev" data-x="off">Désactiver ce mode</button>
      </div>
    </section>`;
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
    download() {
      const blob = new Blob([JSON.stringify(g.s, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `abyssal-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
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
      if (!(await confirmBox('Effacer définitivement toute ta progression sur cet appareil ?', { ok: 'Continuer', danger: true }))) return;
      if (!(await confirmBox('Dernière confirmation : la collection, les éclats et les succès seront perdus. Pense à exporter d’abord.', { ok: 'Tout effacer', danger: true }))) return;
      g.reset();
      app.applySettings();
      toast('Progression effacée.', { icon: 'trash' });
      app.go('');
    },
    creator() { if (!g.s.settings.dev) g.setSetting('dev', true); render(); openCreator(app); },
    version() {
      if (++taps >= 7) { taps = 0; g.setSetting('dev', !g.s.settings.dev); toast(g.s.settings.dev ? 'Mode développeur activé.' : 'Mode développeur désactivé.', { icon: 'code' }); render(); }
    },
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
  return () => off();
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
