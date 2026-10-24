// Mode Créateur : tous les pouvoirs sur sa propre partie (réservé au badge « Créateur »).
import { RARITIES, VARIANTS, BOOSTERS, VERSION } from '../config.js';
import { icon } from '../ui/icons.js';
import { openSheet, esc, toast, confirmBox, fmt } from '../ui/dom.js';
import { migrate } from '../core/save.js';
import { BOSSES, BOSS_ORDER } from '../core/bosses.js';
import { openCosmeticsLab } from './cosmetics-lab.js';
import { openCosmeticsReview } from './cosmetics-review.js'; /* v592 */
import { openDefenseLab } from './defense-lab.js'; /* v594 */
import { sfx, audioInfo } from '../ui/sound.js'; /* v622 */
import { openServerState } from './server-state.js'; /* v678 */
import { perfOn, setPerf, perfLog, perfClear, perfReport } from '../ui/perf.js'; /* v601 */

const SNAP = 'abyssal.snapshot';
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function openCreator(app) {
  const g = app.game, cat = app.catalog;
  const sheet = openSheet('', { full: true, cls: 'creator', label: 'Mode Créateur', onClose: () => app.refresh() });
  let snap = null;
  const ui = { bpow: false };
  try { snap = JSON.parse(localStorage.getItem(SNAP) || 'null'); } catch (e) { snap = null; }

  const B = (x, label, cls = '') => `<button class="btn small ${cls}" data-x="${x}">${label}</button>`;
  function draw() {
    const d = g.descent(), f = g.s.devForce;
    sheet.setContent(`
      <h2>${icon('crown')} Mode Créateur</h2>
      <p class="small muted">Tous les pouvoirs sur ta partie. Tant que le mode est actif, tes scores de Descente ne sont pas envoyés au classement mondial, pour qu’il reste équitable.</p>
      <div class="cr-state small">${fmt(g.s.shards)} éclats · ${fmt(g.s.ash)} cendres · ${g.uniqueCount()}/${g.total()} créatures</div>

      <section class="cr-sec"><h3>État du serveur</h3>
        <p class="small muted">Vérifie ce qui est installé sur Supabase et dit quels fichiers SQL coller ou recoller.</p>
        <div class="row gap wrap">${B('srv', 'Vérifier le serveur', 'gold')}</div></section>

      <section class="cr-sec"><h3>Sauvegarde de sécurité</h3>
        <p class="small muted">${snap ? `Copie de ta vraie partie du ${new Date(snap.t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} (${Object.keys(snap.s.collection || {}).length} créatures).` : 'Fais une copie de ta vraie partie avant de jouer les dieux : tu pourras la retrouver d’un geste.'}</p>
        <div class="row gap wrap">${B('snap', `${icon('download')}Copier ma partie actuelle`)}${snap ? B('restore', `${icon('upload')}Revenir à la copie`, 'gold') : ''}</div></section>

      <section class="cr-sec"><h3>Ressources</h3><div class="row gap wrap">
        ${B('shards', '+10 000 éclats')}${B('ash', '+10 000 cendres')}${B('tickets', '+10 boosters de chaque')}${B('chests', 'Des coffres de chaque')}${B('free', 'Recharger les boosters gratuits')}
      </div></section>

      <section class="cr-sec"><h3>Cartes</h3><div class="row gap wrap">
        ${B('all', 'Toutes les cartes')}${B('variants', 'Toutes les variantes')}${B('dups', 'Doublons pour tester')}
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
        <div class="row gap wrap cr-fv">${['', 'holo', 'gold', 'galaxy', 'crystal', 'prism'].map((v) => `<button class="chip" data-fvar="${v}" aria-pressed="${(f?.variant || '') === v}">${v ? esc(VARIANTS[v].short) : 'Au hasard'}</button>`).join('')}</div>
      </section>

      <section class="cr-sec"><h3>Descente</h3>
        <div class="row gap wrap">${B('missions', 'Accomplir les missions')}${B('campaign', 'Remettre la campagne à zéro', 'danger')}</div>
        <p class="small muted">Remettre à zéro : record, gardiens vaincus et Cauchemar repartent de rien, pour revivre la campagne et ses récompenses. Ta collection, tes niveaux et tes coffres ne bougent pas.</p>
        <form class="cr-give" id="floor"><input class="input plain" name="n" type="number" min="1" max="200" placeholder="Étage" ${d.run ? '' : 'disabled'}><button class="btn small" type="submit" ${d.run ? '' : 'disabled'}>Aller à l’étage</button><button class="btn small" type="submit" name="power" value="1" ${d.run ? '' : 'disabled'}>Avec la puissance attendue</button></form>
        <p class="small muted">${d.run ? `Chapitre en cours : étage ${d.run.floor}.` : 'Lance une Descente pour pouvoir sauter d’étage.'}</p>
      </section>

      <section class="cr-sec"><h3>Cercle de l’Abysse</h3>
        <p class="small muted">${g.s.devGames ? 'Ouverte : tu peux jouer aux jeux comme si le gardien de l’étage 5 était vaincu.' : 'Ouvre les jeux (Duels des Sceaux, Cryptes, Pacte, Enchères) comme si le gardien de l’étage 5 était vaincu.'} Ta campagne ne change pas, et tout se referme si tu désactives le Mode Créateur.</p>
        <div class="row gap wrap">${B('games', g.s.devGames ? 'Refermer le Cercle de l’Abysse' : 'Ouvrir le Cercle de l’Abysse', g.s.devGames ? '' : 'gold')}</div></section>

      <section class="cr-sec"><h3>Codex et Échoppe (ébauche)</h3>
        <p class="small muted">${g.s.devCodex ? 'Affichés : onglet Butin → Codex. Toi seul les vois (Mode Créateur).' : 'Le futur pass de saison et la boutique en argent réel, encore cachés aux joueurs. Les achats y sont simulés.'}</p>
        <div class="row gap wrap">${B('codex', g.s.devCodex ? 'Cacher le Codex et l’Échoppe' : 'Afficher le Codex et l’Échoppe', g.s.devCodex ? '' : 'gold')}${g.s.devCodex ? B('codexgo', 'Ouvrir le Codex', '') : ''}</div></section>

      <section class="cr-sec"><h3>Revue de l’Échoppe</h3>
        <p class="small muted">Chaque objet en vente, un par un, tel que les joueurs le verront (profil, classement, partie en ligne, booster, plateau). Touche Garder ou Supprimer, puis « Copier la liste à supprimer » et colle-la dans la conversation avec Claude. Ton tri reste sur ce téléphone.</p>
        <div class="row gap wrap">${B('shoprev', 'Passer l’Échoppe en revue', 'gold')}</div></section>

      <section class="cr-sec"><h3>Atelier des cosmétiques</h3>
        <p class="small muted">Tous les cadres, dos et finitions en aperçu, pour trier ceux à garder, à retirer ou à revoir.</p>
        <div class="row gap wrap">${B('lab', 'Ouvrir l’Atelier', 'gold')}${B('revue', 'Revue des doublons', '')}</div></section>

      <section class="cr-sec"><h3>Labo des combats</h3>
        <p class="small muted">Essaie des combats de la Descente à n’importe quel étage, règle la force des ennemis, note chaque étage : une courbe règle les autres. Et la barre de défense, réglable en direct. Copie ensuite ton rapport pour me l’envoyer.</p>
        <div class="row gap wrap">${B('labo', 'Ouvrir le Labo des combats', 'gold')}${B('deflab', 'Labo des défenses', '')}</div></section>

      <section class="cr-sec" translate="no"><h3>Moniteur de fluidité</h3>
        <p class="small muted">Allumé, chaque combat est suivi image par image : un compteur d’images par seconde s’affiche en haut à gauche, et chaque saccade est notée avec ce que le combat faisait à ce moment-là (coup, effet, barre de défense…), ainsi que le délai entre tes touchers et l’écran. Joue quelques combats, puis copie le rapport et colle-le dans la conversation.</p>
        <p class="small">${perfOn() ? '<b class="dc-good">Allumé</b>' : 'Éteint'} · ${perfLog().length} combat(s) relevé(s)${perfLog()[0] ? ` · dernier : ${perfLog()[0].fps} i/s, ${perfLog()[0].nHitch} saccade(s)` : ''}</p>
        <div class="row gap wrap">${B('perf', perfOn() ? 'Éteindre le moniteur' : 'Allumer le moniteur', perfOn() ? '' : 'gold')}${B('perfcopy', 'Copier le rapport', '')}${perfLog().length ? B('perfclear', 'Effacer les relevés', '') : ''}</div></section>

      <section class="cr-sec" translate="no"><h3>Son (diagnostic)</h3>
        <p class="small muted">${(() => { const a = audioInfo(); return `Son : ${esc(a.state)} · ${a.samples}${a.expected != null ? `/${a.expected}` : ''} sons chargés · session ${esc(String(a.session))}${a.enabled ? '' : ' · coupé dans les réglages'}${a.diag.failGet || a.diag.failDecode || a.diag.err ? ` · échecs lecture ${a.diag.failGet}, décodage ${a.diag.failDecode}${a.diag.err ? ` · ${esc(a.diag.err)}` : ''}` : ''}`; })()}</p>
        <div class="row gap wrap">${B('sndtest', 'Tester le son', '')}</div></section>

      <section class="cr-sec"><h3>Affronter un gardien</h3>
        <p class="small muted">Te place devant la porte du gardien (un chapitre est lancé si besoin, le présage est passé). Coche la case pour monter ton équipe au niveau attendu à cet étage.</p>
        <label class="small cr-bpow"><input type="checkbox" id="bpow" ${ui.bpow ? 'checked' : ''}> Équipe à la puissance de l’étage</label>
        <div class="cr-bosses">${BOSS_ORDER.map((k, i) => `<button class="btn small" data-boss="${k}"><b>${(i + 1) * 5}</b> · ${esc(BOSSES[k].name)}</button>`).join('')}</div>
      </section>

      <section class="cr-sec"><button class="btn danger block" data-x="off">Désactiver le Mode Créateur</button></section>`);
  }

  sheet.body.addEventListener('click', async (e) => {
    const fr = e.target.closest('[data-force]'), fv = e.target.closest('[data-fvar]'), b = e.target.closest('[data-x]');
    if (fr) { g.s.devForce = g.s.devForce?.rarity === fr.dataset.force ? null : { rarity: fr.dataset.force, variant: g.s.devForce?.variant || '' }; g.persist(); return draw(); }
    if (fv) { if (!g.s.devForce) g.s.devForce = { rarity: 'M', variant: '' }; g.s.devForce.variant = fv.dataset.fvar; g.persist(); return draw(); }
    if (e.target.id === 'bpow') { ui.bpow = e.target.checked; return; }
    const bb = e.target.closest('[data-boss]');
    if (bb) {
      try {
        const r = g.devBoss(bb.dataset.boss, { power: ui.bpow });
        sheet.close(); app.go('descente');
        toast(`Étage ${r.floor} : ${esc(BOSSES[bb.dataset.boss].name)}${r.level ? `, équipe au niveau ${r.level}` : ''}.`, { icon: 'crown' });
      } catch (err) { toast(esc(err.message), { kind: 'error' }); }
      return;
    }
    if (!b) return;
    const x = b.dataset.x;
    try {
      if (x === 'snap') { localStorage.setItem(SNAP, JSON.stringify({ t: Date.now(), s: g.s })); snap = JSON.parse(localStorage.getItem(SNAP)); toast('Copie de ta partie enregistrée sur cet appareil.', { kind: 'success', icon: 'download' }); }
      if (x === 'restore') {
        if (!(await confirmBox('Remplacer la partie actuelle par la copie de sécurité ?', { ok: 'Revenir à la copie' }))) return;
        const dev = g.s.settings.dev;
        await app.partie.first('devSnapshot', snap.s); g.s.settings.dev = dev; g.persist(); app.applySettings(); /* v539 : par le serveur de partie */
        toast('Partie restaurée.', { kind: 'success', icon: 'upload' });
      }
      if (x === 'shards') g.devGrant({ shards: 10000 });
      if (x === 'ash') g.devGrant({ ash: 10000 });
      if (x === 'tickets') g.devGrant({ tickets: Object.fromEntries(Object.keys(BOOSTERS).map((k) => [k, 10])) });
      if (x === 'chests') g.devChests();
      if (x === 'free') g.devFreePacks();
      if (x === 'all') g.devUnlockAll();
      if (x === 'variants') g.devAllVariants();
      if (x === 'dups') g.devDuplicates(10);
      if (x === 'campaign') { if (!(await confirmBox('Remettre la campagne à zéro ? Le record, les gardiens vaincus et le Cauchemar repartent de rien (ta collection est gardée).', { ok: 'Remettre à zéro', danger: true }))) return; g.devResetCampaign(); }
      if (x === 'missions') g.devMissions();
      if (x === 'games') { g.s.devGames = !g.s.devGames; g.persist(); app.chrome?.(); }
      if (x === 'codex') { g.s.devCodex = !g.s.devCodex; g.persist(); app.chrome?.(); } /* v470 */
      if (x === 'srv') { openServerState(); return; } /* v678 */
      if (x === 'lab') { openCosmeticsLab(app); return; } /* v556 */
      if (x === 'revue') { openCosmeticsReview(app); return; } /* v592 */
      if (x === 'shoprev') { sheet.close(); app.shopReview = true; app.go('codex'); return; } /* v688 */
      if (x === 'deflab') { openDefenseLab(app); return; } /* v594 */
      if (x === 'labo') { sheet.close(); app.go('labo'); return; } /* v595 */
      if (x === 'sndtest') { app.applySettings(); sfx.victory?.(); setTimeout(draw, 900); return; } /* v622 */
      if (x === 'perf') { setPerf(!perfOn()); toast(perfOn() ? 'Moniteur allumé : lance un combat.' : 'Moniteur éteint.', { icon: 'check' }); return draw(); } /* v601 */
      if (x === 'perfclear') { perfClear(); return draw(); }
      if (x === 'perfcopy') {
        const st = g.s.settings || {}, txt = perfReport({ version: VERSION, extra: `effets ${st.quality === 'light' ? 'allégés' : 'complets'} · vitesse ${st.combatFast || 1} · animations réduites ${matchMedia('(prefers-reduced-motion: reduce)').matches ? 'oui' : 'non'}${document.documentElement.classList.contains('standalone') ? ' · app de l’écran d’accueil' : ''}` });
        try { await navigator.clipboard.writeText(txt); toast('Rapport copié : colle-le dans la conversation avec Claude.', { kind: 'success', icon: 'check' }); }
        catch (e) { openSheet(`<h3>Rapport de fluidité</h3><p class="small muted">Copie ce texte à la main :</p><textarea class="input plain" style="width:100%;height:50vh" readonly>${esc(txt)}</textarea>`); }
        return;
      }
      if (x === 'codexgo') { sheet.close(); app.go('codex'); return; }
      if (x === 'off') { g.s.settings.devCode = false; g.setSetting('dev', false); sheet.close(); toast('Mode Créateur désactivé.', { icon: 'crown' }); return; }
      if (!['snap', 'restore'].includes(x)) toast('C’est fait.', { kind: 'success', icon: 'crown' });
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
      if (e.target.id === 'floor') { const lv = g.devFloor(Number(f.get('n')), { power: e.submitter?.name === 'power' }); toast(`Chapitre placé à l’étage ${Number(f.get('n'))}${lv ? `, équipe au niveau ${lv}` : ''}.`, { icon: 'crown' }); }
    } catch (err) { toast(esc(err.message), { kind: 'error' }); }
    draw();
  });
  draw();
}
