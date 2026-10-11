// Mode Créateur : tous les pouvoirs sur sa propre partie (réservé au badge « Créateur »).
import { RARITIES, VARIANTS, BOOSTERS } from '../config.js';
import { icon } from '../ui/icons.js';
import { openSheet, esc, toast, confirmBox, fmt } from '../ui/dom.js';
import { migrate } from '../core/save.js';

const SNAP = 'abyssal.snapshot';
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function openCreator(app) {
  const g = app.game, cat = app.catalog;
  const sheet = openSheet('', { full: true, cls: 'creator', label: 'Mode Créateur', onClose: () => app.refresh() });
  let snap = null;
  try { snap = JSON.parse(localStorage.getItem(SNAP) || 'null'); } catch (e) { snap = null; }

  const B = (x, label, cls = '') => `<button class="btn small ${cls}" data-x="${x}">${label}</button>`;
  function draw() {
    const d = g.descent(), f = g.s.devForce;
    sheet.setContent(`
      <h2>${icon('crown')} Mode Créateur</h2>
      <p class="small muted">Tous les pouvoirs sur ta partie. Tant que le mode est actif, tes scores de Descente ne sont pas envoyés au classement mondial, pour qu’il reste équitable.</p>
      <div class="cr-state small">${fmt(g.s.shards)} éclats · ${fmt(g.s.ash)} cendres · ${g.uniqueCount()}/${g.total()} créatures · ${g.torchesLeft()} torche${g.torchesLeft() > 1 ? 's' : ''}</div>

      <section class="cr-sec"><h3>Sauvegarde de sécurité</h3>
        <p class="small muted">${snap ? `Copie de ta vraie partie du ${new Date(snap.t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} (${Object.keys(snap.s.collection || {}).length} créatures).` : 'Fais une copie de ta vraie partie avant de jouer les dieux : tu pourras la retrouver d’un geste.'}</p>
        <div class="row gap wrap">${B('snap', `${icon('download')}Copier ma partie actuelle`)}${snap ? B('restore', `${icon('upload')}Revenir à la copie`, 'gold') : ''}</div></section>

      <section class="cr-sec"><h3>Ressources</h3><div class="row gap wrap">
        ${B('shards', '+10 000 éclats')}${B('ash', '+10 000 cendres')}${B('tickets', '+10 boosters de chaque')}${B('items', '+5 de chaque objet')}${B('arsenal', 'Coffres et 200 fer')}${B('free', 'Recharger les boosters gratuits')}
      </div></section>

      <section class="cr-sec"><h3>Cartes</h3><div class="row gap wrap">
        ${B('all', 'Toutes les cartes')}${B('variants', 'Toutes les variantes')}${B('dups', 'Doublons pour tester')}${B('levels', 'Héros et invocations niveau 20')}
      </div>
        <form class="cr-give" id="give">
          <input class="input plain" name="q" list="cr-cards" placeholder="Nom d’une carte…" autocomplete="off">
          <datalist id="cr-cards">${cat.cards.map((c) => `<option value="${esc(c.name)}">`).join('')}</datalist>
          <select class="input plain" name="v">${Object.keys(VARIANTS).map((v) => `<option value="${v}">${esc(VARIANTS[v].name)}</option>`).join('')}</select>
          <button class="btn small primary" type="submit">Donner</button>
        </form></section>

      <section class="cr-sec"><h3>Prochain booster</h3>
        <p class="small muted">${f ? `Imposé : une carte <b>${esc(RARITIES.find((r) => r.key === f.rarity)?.name || f.rarity)}</b>${f.variant ? ` en <b>${esc(VARIANTS[f.variant].name)}</b>` : ''} en dernière position.` : 'La dernière carte du prochain booster peut être imposée.'}</p>
        <div class="row gap wrap">${RARITIES.map((r) => `<button class="chip" data-force="${r.key}" style="--chip:${r.color}" aria-pressed="${f?.rarity === r.key}">${r.name}</button>`).join('')}</div>
        <div class="row gap wrap cr-fv">${['', 'holo', 'chroma', 'gold', 'galaxy', 'corrupt', 'ancestral'].map((v) => `<button class="chip" data-fvar="${v}" aria-pressed="${(f?.variant || '') === v}">${v ? esc(VARIANTS[v].short) : 'Au hasard'}</button>`).join('')}</div>
      </section>

      <section class="cr-sec"><h3>Rituel et Descente</h3>
        <div class="set-row"><div><b>Rituels toujours réussis</b></div><button class="switch" role="switch" aria-checked="${!!g.s.devRitual}" data-x="ritual"><i></i></button></div>
        <div class="row gap wrap">${B('torches', 'Rendre les torches')}${B('heal', 'Soigner tous les héros')}${B('missions', 'Accomplir les missions')}</div>
        <form class="cr-give" id="floor"><input class="input plain" name="n" type="number" min="1" max="200" placeholder="Étage" ${d.run ? '' : 'disabled'}><button class="btn small" type="submit" ${d.run ? '' : 'disabled'}>Aller à l’étage</button></form>
        <p class="small muted">${d.run ? `Expédition en cours : étage ${d.run.floor}.` : 'Lance une Descente pour pouvoir sauter d’étage.'}</p>
      </section>

      <section class="cr-sec"><button class="btn danger block" data-x="off">Désactiver le Mode Créateur</button></section>`);
  }

  sheet.body.addEventListener('click', async (e) => {
    const fr = e.target.closest('[data-force]'), fv = e.target.closest('[data-fvar]'), b = e.target.closest('[data-x]');
    if (fr) { g.s.devForce = g.s.devForce?.rarity === fr.dataset.force ? null : { rarity: fr.dataset.force, variant: g.s.devForce?.variant || '' }; g.persist(); return draw(); }
    if (fv) { if (!g.s.devForce) g.s.devForce = { rarity: 'M', variant: '' }; g.s.devForce.variant = fv.dataset.fvar; g.persist(); return draw(); }
    if (!b) return;
    const x = b.dataset.x;
    try {
      if (x === 'snap') { localStorage.setItem(SNAP, JSON.stringify({ t: Date.now(), s: g.s })); snap = JSON.parse(localStorage.getItem(SNAP)); toast('Copie de ta partie enregistrée sur cet appareil.', { kind: 'success', icon: 'download' }); }
      if (x === 'restore') {
        if (!(await confirmBox('Remplacer la partie actuelle par la copie de sécurité ?', { ok: 'Revenir à la copie' }))) return;
        const dev = g.s.settings.dev;
        g.replaceSave(migrate(snap.s)); g.s.settings.dev = dev; g.persist(); app.applySettings();
        toast('Partie restaurée.', { kind: 'success', icon: 'upload' });
      }
      if (x === 'shards') g.devGrant({ shards: 10000 });
      if (x === 'ash') g.devGrant({ ash: 10000 });
      if (x === 'tickets') g.devGrant({ tickets: Object.fromEntries(Object.keys(BOOSTERS).map((k) => [k, 10])) });
      if (x === 'items') g.devItems(5);
      if (x === 'arsenal') g.devArsenal();
      if (x === 'free') g.devFreePacks();
      if (x === 'all') g.devUnlockAll();
      if (x === 'variants') g.devAllVariants();
      if (x === 'dups') g.devDuplicates(10);
      if (x === 'levels') g.devMaxLevels();
      if (x === 'ritual') { g.s.devRitual = !g.s.devRitual; g.persist(); }
      if (x === 'torches') g.devTorches();
      if (x === 'heal') g.devHealAll();
      if (x === 'missions') g.devMissions();
      if (x === 'off') { g.setSetting('dev', false); sheet.close(); toast('Mode Créateur désactivé.', { icon: 'crown' }); return; }
      if (!['snap', 'restore', 'ritual'].includes(x)) toast('C’est fait.', { kind: 'success', icon: 'crown' });
    } catch (err) { toast(esc(err.message), { kind: 'error' }); }
    draw();
  });
  sheet.body.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      if (e.target.id === 'give') {
        const q = norm(String(f.get('q') || ''));
        const c = cat.cards.find((x) => norm(x.name) === q) || cat.cards.find((x) => norm(x.name).includes(q) && q);
        if (!c) throw new Error('Carte introuvable.');
        g.devGive(c.id, String(f.get('v')));
        toast(`<b>${esc(c.name)}</b> ajoutée (${esc(VARIANTS[String(f.get('v'))].name)}).`, { kind: 'success', icon: 'crown' });
      }
      if (e.target.id === 'floor') { g.devFloor(Number(f.get('n'))); toast(`Expédition placée à l’étage ${Number(f.get('n'))}.`, { icon: 'crown' }); }
    } catch (err) { toast(esc(err.message), { kind: 'error' }); }
    draw();
  });
  draw();
}
