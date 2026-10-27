// Mode Créateur : tous les pouvoirs sur sa propre partie (réservé au badge « Créateur »).
import { RARITIES, VARIANTS, BOOSTERS, VERSION } from '../config.js';
import { icon } from '../ui/icons.js';
import { openSheet, esc, toast, confirmBox, fmt } from '../ui/dom.js';
import { migrate } from '../core/save.js';
import { BOSSES, BOSS_ORDER, VEILLES } from '../core/bosses.js';
import { SEASONS } from '../core/codex.js';
import { showWelcome } from './welcome.js'; /* v804 */
import { errLog, errClear } from '../ui/errlog.js'; /* v804 */
import { openDefenseLab } from './defense-lab.js'; /* v594 */
import { sfx, audioInfo } from '../ui/sound.js'; /* v622 */
import { openServerState } from './server-state.js'; /* v678 */
import { perfOn, setPerf, perfLog, perfClear, perfReport } from '../ui/perf.js'; /* v601 */
import { partieErrs, partie } from '../cloud/partie.js'; /* v740 */
import { openPack } from './opening.js'; /* v769 */
import { playEnding, playPrologue, CINE_SCENES } from './ending.js';
import { LANGS, LANG } from '../i18n.js';
import { DEV_DAYS, chocDev, setChocDev } from './choc-dev.js'; /* v843 */
import { LEAGUES } from '../core/versus.js';

const SNAP = 'abyssal.snapshot';
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function openCreator(app) {
  const g = app.game, cat = app.catalog;
  const sheet = openSheet('', { full: true, cls: 'creator', label: 'Mode Créateur', onClose: () => app.refresh() });
  let snap = null;
  const ui = { bpow: false };
  try { snap = JSON.parse(localStorage.getItem(SNAP) || 'null'); } catch (e) { snap = null; }

  /* v785 : réglages des cinématiques, gardés sur l'appareil */
  const CINE_KEY = 'abyssal.cineDev';
  let cine = { film: 'prologue', lang: LANG, start: 0, name: '' };
  try { cine = { ...cine, ...JSON.parse(localStorage.getItem(CINE_KEY) || '{}') }; } catch (e) { /* rien */ }
  if (!CINE_SCENES[cine.film]) cine.film = 'prologue';
  if (!LANGS[cine.lang]) cine.lang = LANG;
  const saveCine = () => { try { localStorage.setItem(CINE_KEY, JSON.stringify(cine)); } catch (e) { /* rien */ } };
  /* v803 : réglages du duel d'essai du Choc, gardés sur l'appareil */
  const B = (x, label, cls = '') => `<button class="btn small ${cls}" data-x="${x}">${label}</button>`;
  /* v804 : Mode Créateur rangé en 4 onglets (le dernier ouvert est retenu sur l'appareil) */
  const TABS = [['test', 'Tester'], ['partie', 'Ma partie'], ['ateliers', 'Ateliers'], ['diag', 'Diagnostic']];
  let tab = 'test';
  try { tab = localStorage.getItem('abyssal.crTab') || 'test'; } catch (e) { /* rien */ }
  if (!TABS.some(([k]) => k === tab)) tab = 'test';
  const S = (title, body, cls = '') => `<section class="cr-sec ${cls}"><h3>${title}</h3>${body}</section>`;
  const P = (txt) => `<p class="small muted">${txt}</p>`;
  const row = (...bs) => `<div class="row gap wrap">${bs.join('')}</div>`;
  function tabTest(d, f) {
    const cd = chocDev();
    return `
      ${S('Affronter un gardien', `${P('Te place devant la porte du gardien (un chapitre est lancé si besoin, le présage est passé, sans Torche). Coche la case pour monter ton équipe au niveau attendu à cet étage.')}
        <label class="small cr-bpow"><input type="checkbox" id="bpow" ${ui.bpow ? 'checked' : ''}> Équipe à la puissance de l’étage</label>
        <div class="cr-bosses">${BOSS_ORDER.map((k, i) => `<button class="btn small" data-boss="${k}"><b>${(i + 1) * 5}</b> · ${esc(BOSSES[k].name)}</button>`).join('')}</div>
        <p class="small">Les Veilles (étage 105)</p>
        <div class="cr-bosses">${SEASONS.filter((se) => VEILLES[se.key]).map((se) => `<button class="btn small" data-veille="${se.key}"><b>${se.num}</b> · ${esc(BOSSES[VEILLES[se.key].boss].name)}</button>`).join('')}</div>`)}
      ${S('Aller à un étage', `<form class="cr-give" id="floor"><input class="input plain" name="n" type="number" min="1" max="200" placeholder="Étage" ${d.run ? '' : 'disabled'}><button class="btn small" type="submit" ${d.run ? '' : 'disabled'}>Y aller</button><button class="btn small" type="submit" name="power" value="1" ${d.run ? '' : 'disabled'}>Avec la puissance attendue</button></form>
        ${P(d.run ? `Chapitre en cours : étage ${d.run.floor}.` : 'Lance d’abord un chapitre dans la Descente.')}`)}
      ${S('Choc des Boosters (banc d’essai)', `${P('Tout ici change seulement l’affichage du Choc sur cet appareil et la partie d’essai. Les vraies parties en ligne gardent le vrai jour (heure de Paris), ta vraie ligue et ta vraie série.')}
        <p class="small">Jour de la semaine</p>
        <div class="row gap wrap">${DEV_DAYS.map(([k, n]) => `<button class="chip" data-cday="${k}" aria-pressed="${(cd.day || '') === k}">${n}${k === 'sat' ? ' · premium' : k === 'sun' ? ' · mystère' : ''}</button>`).join('')}</div>
        <p class="small">Ligue affichée</p>
        <div class="row gap wrap">${[['', 'Ma vraie ligue'], ...LEAGUES.map((L) => [String(L.min + Math.round(((LEAGUES[LEAGUES.indexOf(L) + 1]?.min ?? L.min + 200) - L.min) * 0.6)), L.name])].map(([k, n]) => `<button class="chip" data-clg="${k}" aria-pressed="${String(cd.lg ?? '') === k}">${n}</button>`).join('')}</div>
        <p class="small">Série ardente affichée</p>
        <div class="row gap wrap">${[['', 'Ma vraie série'], ['0', '0'], ['2', '2'], ['4', '4'], ['7', '7'], ['10', '10']].map(([k, n]) => `<button class="chip" data-cstk="${k}" aria-pressed="${String(cd.streak ?? '') === k}">${n}</button>`).join('')}</div>
        <label class="small cr-bpow"><input type="checkbox" id="chall" ${cd.hall ? 'checked' : ''}> Panthéon d’hier simulé (joueurs et parties inventés, chaque partie se revoit)</label>
        ${row(B('chocgo', 'Ouvrir le Choc', 'gold'), B('choc', 'Jouer une partie d’essai'), B('chochall', 'Voir le Panthéon simulé'))}
        ${row(B('chocmonth', 'Bilan de fin de mois'), B('choctok', '+3 jetons du Choc'))}`, 'cr-choc')}
      ${S('Boosters', `${P(f ? `Prochain booster : une carte <b>${esc(RARITIES.find((r) => r.key === f.rarity)?.name || f.rarity)}</b>${f.variant ? ` en <b>${esc(VARIANTS[f.variant].name)}</b>` : ''} en dernière position.` : 'Impose la dernière carte du prochain booster (aussi celui de l’Abysse) :')}
        <div class="row gap wrap">${RARITIES.map((r) => `<button class="chip" data-force="${r.key}" style="--chip:${r.color}" aria-pressed="${f?.rarity === r.key}">${r.name}</button>`).join('')}</div>
        <div class="row gap wrap cr-fv">${['', 'holo', 'gold', 'galaxy', 'crystal', 'prism'].map((v) => `<button class="chip" data-fvar="${v}" aria-pressed="${(f?.variant || '') === v}">${v ? esc(VARIANTS[v].short) : 'Au hasard'}</button>`).join('')}</div>
        <p class="small">Booster de l’Abysse${g.s.tickets.abysse ? ` · ${g.s.tickets.abysse} en réserve` : ''}</p>
        ${row(B('abyss', 'Ouvrir un Booster de l’Abysse', 'gold'), B('abyss1', 'Comme la première fois'), B('abyss5', '+5 en réserve'))}`)}
      ${S('Cinématiques et guide', `${P('Le prologue ou la fin, dans la langue de ton choix (texte et voix), à partir de la scène voulue. La langue du jeu ne change pas.')}
        <div class="seg cr-cine-seg">${['prologue', 'fin'].map((k) => `<button class="seg-b" aria-pressed="${cine.film === k}" aria-checked="${cine.film === k}" data-cfilm="${k}">${k === 'prologue' ? 'Prologue' : 'Fin de la Descente'}</button>`).join('')}</div>
        <div class="seg lang-grid cr-cine-seg">${Object.entries(LANGS).map(([k, n]) => `<button class="seg-b" aria-pressed="${cine.lang === k}" aria-checked="${cine.lang === k}" data-clang="${k}">${esc(n)}</button>`).join('')}</div>
        <label class="small muted">À partir de la scène
          <select class="input plain" id="cine-start">${CINE_SCENES[cine.film].map((n, i) => `<option value="${i}"${i === cine.start ? ' selected' : ''}>${i + 1} · ${esc(n)}</option>`).join('')}</select></label>
        ${cine.film === 'fin' ? `<label class="small muted">Nom écrit sur le vélin
          <input class="input plain" id="cine-name" maxlength="20" value="${esc(cine.name || '')}" placeholder="Ton pseudo"></label>` : ''}
        ${row(B('cine', `Lancer ${cine.film === 'prologue' ? 'le prologue' : 'la fin'}`, 'gold'), B('guide', 'Revoir le guide de bienvenue'))}`, 'cr-cine')}`;
  }
  function tabPartie() {
    return `
      ${S('Sauvegarde de sécurité', `${P(snap ? `Copie de ta vraie partie du ${new Date(snap.t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} (${Object.keys(snap.s.collection || {}).length} créatures).` : 'Fais une copie de ta vraie partie avant de jouer les dieux : tu pourras la retrouver d’un geste.')}
        ${row(B('snap', `${icon('download')}Copier ma partie actuelle`), snap ? B('restore', `${icon('upload')}Revenir à la copie`, 'gold') : '')}`)}
      ${S('Ressources', row(B('shards', '+10 000 éclats'), B('ash', '+10 000 cendres'), B('tickets', '+10 boosters de chaque'), B('chests', 'Des coffres de chaque'), B('free', 'Recharger les boosters gratuits'), B('choctok', '+3 jetons du Choc')))}
      ${S('Cartes', `${row(B('all', 'Toutes les cartes'), B('variants', 'Toutes les finitions'), B('dups', 'Doublons pour tester'))}
        <form class="cr-give" id="give">
          <input class="input plain" name="q" list="cr-cards" placeholder="Nom d’une carte…" autocomplete="off">
          <datalist id="cr-cards">${cat.cards.map((c) => `<option value="${esc(c.name)}">`).join('')}</datalist>
          <select class="input plain" name="v">${Object.keys(VARIANTS).map((v) => `<option value="${v}">${esc(VARIANTS[v].name)}</option>`).join('')}</select>
          <button class="btn small primary" type="submit">Donner</button>
        </form>`)}
      ${S('Descente', `${row(B('missions', 'Accomplir les missions du jour'), B('campaign', 'Remettre la campagne à zéro', 'danger'))}
        ${P('Remettre à zéro : record, gardiens vaincus et Cauchemar repartent de rien, pour revivre la campagne et ses récompenses. Ta collection, tes niveaux et tes coffres ne bougent pas.')}`)}`;
  }
  function tabAteliers() {
    return `
      ${S('Labo des combats', `${P('Essaie des combats de la Descente à n’importe quel étage, règle la force des ennemis, note chaque étage : une courbe règle les autres. Le Labo des défenses règle la barre d’esquive et de parade en direct. Copie ensuite ton rapport pour me l’envoyer.')}
        ${row(B('labo', 'Labo des combats', 'gold'), B('deflab', 'Labo des défenses'))}`)}
      ${S('Codex et Échoppe', `${P(g.codexLive?.() ? 'Le Codex est ouvert à tous.' : g.s.devCodex ? 'Affichés pour toi seul : onglet Butin → Codex. Les achats y sont simulés.' : 'Le pass de saison et la boutique, encore cachés aux joueurs : affiche-les pour toi seul.')}
        ${row(B('codex', g.s.devCodex ? 'Cacher le Codex et l’Échoppe' : 'Afficher le Codex et l’Échoppe', g.s.devCodex ? '' : 'gold'), g.s.devCodex ? B('codexgo', 'Ouvrir le Codex') : '')}
        <p class="small">Revue de l’Échoppe</p>${P('Chaque objet en vente, un par un, tel que les joueurs le verront. Garder ou Supprimer, puis « Copier la liste à supprimer » et colle-la dans la conversation.')}
        ${row(B('shoprev', 'Passer l’Échoppe en revue'))}`)}`;
  }
  function tabDiag() {
    const errs = errLog();
    return `
      ${S('Signaler un problème', `${P('Copie en un geste tout ce qui m’aide à trouver un bug : version, appareil, état du serveur de partie, dernières erreurs de l’app et du serveur, dernier relevé de fluidité. Colle-le dans la conversation avec ta description.')}
        ${row(B('report', `${icon('check')}Copier le rapport complet`, 'gold'))}`)}
      ${S('Erreurs de l’app', `${P('Les 25 dernières erreurs survenues sur ce téléphone (même quand rien ne s’est vu à l’écran).')}
        <p class="small">${errs.length ? errs.slice(0, 5).map((x) => `${esc(new Date(x.t).toLocaleString('fr-FR'))} · ${esc(x.r)} · <b>${esc(x.m)}</b>`).join('<br>') : 'Aucune erreur.'}</p>
        ${row(errs.length ? B('errlogclear', 'Effacer') : '')}`)}
      ${S('Journal du serveur', `${P('Actions que le serveur de partie a refusées sur cet appareil (les 30 dernières).')}
        <p class="small">${partieErrs().length ? partieErrs().slice(0, 5).map((x) => `${esc(new Date(x.t).toLocaleString('fr-FR'))} · <b>${esc(x.m)}</b> · ${esc(x.e)}`).join('<br>') : 'Rien de refusé.'}</p>`)}
      ${S('Moniteur de fluidité', `${P('Allumé, chaque combat est suivi image par image : compteur d’images par seconde en haut à gauche, chaque saccade notée avec ce que le combat faisait, et le délai entre tes touchers et l’écran. Joue quelques combats, puis copie le rapport.')}
        <p class="small">${perfOn() ? '<b class="dc-good">Allumé</b>' : 'Éteint'} · ${perfLog().length} combat(s) relevé(s)${perfLog()[0] ? ` · dernier : ${perfLog()[0].fps} i/s, ${perfLog()[0].nHitch} saccade(s)` : ''}</p>
        ${row(B('perf', perfOn() ? 'Éteindre le moniteur' : 'Allumer le moniteur', perfOn() ? '' : 'gold'), B('perfcopy', 'Copier le rapport'), perfLog().length ? B('perfclear', 'Effacer les relevés') : '')}`)}
      ${S('État du serveur', `${P('Vérifie ce qui est installé sur Supabase et dit quels fichiers SQL coller ou recoller.')}${row(B('srv', 'Vérifier le serveur'))}`)}
      ${S('Son', `${P((() => { const a = audioInfo(); return `Son : ${esc(a.state)} · ${a.samples}${a.expected != null ? `/${a.expected}` : ''} sons chargés · session ${esc(String(a.session))}${a.enabled ? '' : ' · coupé dans les réglages'}${a.diag.failGet || a.diag.failDecode || a.diag.err ? ` · échecs lecture ${a.diag.failGet}, décodage ${a.diag.failDecode}${a.diag.err ? ` · ${esc(a.diag.err)}` : ''}` : ''}`; })())}${row(B('sndtest', 'Tester le son'))}`)}`;
  }
  function draw() {
    const d = g.descent(), f = g.s.devForce;
    const body = tab === 'partie' ? tabPartie() : tab === 'ateliers' ? tabAteliers() : tab === 'diag' ? tabDiag() : tabTest(d, f);
    sheet.setContent(`
      <h2>${icon('crown')} Mode Créateur</h2>
      <div class="cr-state small">${fmt(g.s.shards)} éclats · ${fmt(g.s.ash)} cendres · ${g.uniqueCount()}/${g.total()} créatures · ${esc(VERSION)}</div>
      <div class="seg cr-tabs" role="tablist">${TABS.map(([k, l]) => `<button class="seg-b" role="tab" data-crtab="${k}" aria-pressed="${tab === k}" aria-selected="${tab === k}">${l}</button>`).join('')}</div>
      ${body}
      <section class="cr-sec"><button class="btn danger block" data-x="off">Désactiver le Mode Créateur</button>
        ${P('Tant que le mode est actif, tes scores de Descente ne sont pas envoyés au classement mondial.')}</section>`);
  }

  /* v843 : ouvre le Choc, ou le redessine si on y est déjà (sans garder la partie affichée) */
  const goChoc = () => { if (/^#\/versus/.test(location.hash)) { app.holdRefresh = null; app.refresh(); } else app.go('versus'); };
  sheet.body.addEventListener('click', async (e) => {
    const fr = e.target.closest('[data-force]'), fv = e.target.closest('[data-fvar]'), b = e.target.closest('[data-x]');
    if (fr) { g.s.devForce = g.s.devForce?.rarity === fr.dataset.force ? null : { rarity: fr.dataset.force, variant: g.s.devForce?.variant || '' }; g.persist(); return draw(); }
    if (fv) { if (!g.s.devForce) g.s.devForce = { rarity: 'M', variant: '' }; g.s.devForce.variant = fv.dataset.fvar; g.persist(); return draw(); }
    if (e.target.id === 'bpow') { ui.bpow = e.target.checked; return; }
    const tb = e.target.closest('[data-crtab]');
    if (tb) { tab = tb.dataset.crtab; try { localStorage.setItem('abyssal.crTab', tab); } catch (er) { /* rien */ } draw(); (sheet.el || sheet.body)?.scrollTo?.({ top: 0 }); return; }
    const cdy = e.target.closest('[data-cday]'), clg = e.target.closest('[data-clg]'), cst = e.target.closest('[data-cstk]'); /* v843 */
    if (cdy || clg || cst) {
      const o = chocDev();
      if (cdy) o.day = cdy.dataset.cday || undefined;
      if (clg) o.lg = clg.dataset.clg === '' ? undefined : +clg.dataset.clg;
      if (cst) o.streak = cst.dataset.cstk === '' ? undefined : +cst.dataset.cstk;
      setChocDev(o); return draw();
    }
    if (e.target.id === 'chall') { setChocDev({ ...chocDev(), hall: e.target.checked }); return; }
    const cf = e.target.closest('[data-cfilm]'), cl = e.target.closest('[data-clang]');
    if (cf) { cine.film = cf.dataset.cfilm; cine.start = 0; saveCine(); return draw(); }
    if (cl) { cine.lang = cl.dataset.clang; saveCine(); return draw(); }
    const vb = e.target.closest('[data-veille]');
    if (vb) {
      try { g.devVeille(vb.dataset.veille, { power: ui.bpow }); sheet.close(); app.go('descente'); toast(`Étage 105 : ${esc(BOSSES[VEILLES[vb.dataset.veille].boss].name)}.`, { icon: 'crown' }); } catch (err) { toast(esc(err.message), { kind: 'error' }); }
      return;
    }
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
      if (x === 'choctok') g.devChocTokens(); /* v811 */
      if (x === 'abyss' || x === 'abyss1') { g.devAbyss(x === 'abyss1'); sheet.close(); setTimeout(() => openPack(app, 'abysse', { onDone: () => openCreator(app) }), 350); return; } /* v769 : fenêtre fermée pendant l'ouverture, rouverte après */
      if (x === 'abyss5') g.devAbyss(false, 5);
      if (x === 'chocgo' || x === 'chochall' || x === 'chocmonth') { /* v843 */
        if (x === 'chochall') setChocDev({ ...chocDev(), hall: true });
        const o = chocDev(), pts = Number.isFinite(o.lg) ? o.lg : (g.chocLeague().pts || 0), tier = LEAGUES.reduce((a, L, k) => (pts >= L.min ? k : a), 0);
        app.state.chocDev = x === 'chochall' ? 'hall' : x === 'chocmonth' ? { month: { m: new Date().toISOString().slice(0, 7), tier, pts, played: 3 } } : null;
        sheet.close(); setTimeout(goChoc, 300); return;
      }
      if (x === 'choc') { sheet.close(); app.state.chocTrain = true; setTimeout(goChoc, 300); return; } /* v813 : le nouveau Choc (entraînement) */
      if (x === 'cine') { /* v785 : prologue ou fin, langue et scène de départ au choix */
        cine.start = +(sheet.el?.querySelector('#cine-start')?.value ?? document.getElementById('cine-start')?.value ?? 0) || 0;
        const nm = document.getElementById('cine-name'); if (nm) cine.name = nm.value.trim();
        saveCine();
        const o = { lang: cine.lang, start: cine.start };
        sheet.close();
        setTimeout(() => (cine.film === 'fin' ? playEnding(app, { ...o, intro: false, name: cine.name || undefined }) : playPrologue(app, { ...o, intro: false })).then(() => openCreator(app)), 350);
        return;
      }
      if (x === 'all') g.devUnlockAll();
      if (x === 'variants') g.devAllVariants();
      if (x === 'dups') g.devDuplicates(10);
      if (x === 'campaign') { if (!(await confirmBox('Remettre la campagne à zéro ? Le record, les gardiens vaincus et le Cauchemar repartent de rien (ta collection est gardée).', { ok: 'Remettre à zéro', danger: true }))) return; g.devResetCampaign(); }
      if (x === 'missions') g.devMissions();
      if (x === 'codex') { g.s.devCodex = !g.s.devCodex; g.persist(); app.chrome?.(); } /* v470 */
      if (x === 'srv') { openServerState(); return; } /* v678 */
      if (x === 'guide') { sheet.close(); setTimeout(() => showWelcome(app, { force: true }), 350); return; } /* v804 */
      if (x === 'errlogclear') { errClear(); return draw(); }
      if (x === 'report') { /* v804 : rapport complet pour signaler un problème */
        const st = g.s.settings || {}, pl = perfLog()[0];
        const txt = [`Rapport ABYSSAL · ${VERSION} · ${new Date().toLocaleString('fr-FR')}`,
          `Appareil : ${navigator.userAgent}`, `Écran : ${innerWidth} × ${innerHeight} · ${devicePixelRatio}x${document.documentElement.classList.contains('standalone') ? ' · app' : ''} · langue ${LANG}`,
          `Serveur de partie : ${partie.mode === 'server' ? 'actif (progression gardée par le serveur)' : partie.mode === 'legacy' ? 'ancien système' : 'pas encore joint'}${partie.error ? ` · dernière erreur : ${partie.error}` : ''} · actions en attente ${(() => { try { return JSON.parse(localStorage.getItem('abyssal.ops') || '[]').length; } catch (er) { return '?'; } })()}`,
          `Page : ${location.hash || '#/'} · effets ${st.quality === 'light' ? 'allégés' : 'complets'} · vitesse ${st.combatFast || 1}`,
          `Partie : ${g.uniqueCount()}/${g.total()} créatures · record ${g.descent().best || 0} · chapitre en cours ${g.descent().run ? `étage ${g.descent().run.floor}` : 'aucun'}`,
          '', 'Erreurs de l’app :', ...(errLog().map((x) => `${new Date(x.t).toISOString()} ${x.v} ${x.r} : ${x.m}${x.w ? ` (${x.w})` : ''}`).slice(0, 15)), errLog().length ? '' : 'aucune',
          '', 'Refus du serveur :', ...(partieErrs().map((x) => `${new Date(x.t).toISOString()} ${x.m} : ${x.e}`).slice(0, 15)), partieErrs().length ? '' : 'aucun',
          '', `Fluidité : ${pl ? `${pl.fps} i/s, ${pl.nHitch} saccade(s) au dernier combat relevé` : 'aucun relevé'}`].join('\n');
        try { await navigator.clipboard.writeText(txt); toast('Rapport copié : colle-le dans la conversation avec ta description.', { kind: 'success', icon: 'check' }); }
        catch (er) { openSheet(`<h3>Rapport</h3><p class="small muted">Copie ce texte à la main :</p><textarea class="input plain" style="width:100%;height:50vh" readonly>${esc(txt)}</textarea>`); }
        return;
      }
      if (x === 'shoprev') { sheet.close(); app.shopReview = true; app.go('codex'); return; } /* v688 */
      if (x === 'deflab') { openDefenseLab(app); return; } /* v594 */
      if (x === 'labo') { sheet.close(); app.go('labo'); return; } /* v595 */
      if (x === 'sndtest') { app.applySettings(); sfx.victory?.(); setTimeout(draw, 900); return; } /* v622 */
      if (x === 'perf') { setPerf(!perfOn()); toast(perfOn() ? 'Moniteur allumé : lance un combat.' : 'Moniteur éteint.', { icon: 'check' }); return draw(); } /* v601 */
      if (x === 'perfclear') { perfClear(); return draw(); }
      if (x === 'errcopy') {
        const txt = `Journal du serveur · ${VERSION}\n` + (partieErrs().map((e) => `${new Date(e.t).toISOString()} ${e.m} : ${e.e}`).join('\n') || 'Rien de refusé.');
        try { await navigator.clipboard.writeText(txt); toast('Journal copié : colle-le dans la conversation avec Claude.', { kind: 'success', icon: 'check' }); }
        catch (e) { openSheet(`<h3>Journal du serveur</h3><textarea class="input plain" style="width:100%;height:50vh" readonly>${esc(txt)}</textarea>`); }
        return;
      }
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
