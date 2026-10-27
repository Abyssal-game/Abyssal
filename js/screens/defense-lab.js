// v594 : Labo des défenses (Mode Créateur, demande du propriétaire du 22 octobre 2026 : « tester toutes les défenses autant
// de fois que je veux, faire un réglage moi-même en direct, puis t'envoyer les réglages »). La barre est exactement celle
// des combats (js/ui/def-bar.js) ; les réglages (js/ui/def-tune.js) restent sur l'appareil et peuvent, en option,
// s'appliquer aux vrais combats. « Copier mes réglages » donne le texte à coller dans la conversation.
// Outil en français seulement (translate="no").
import { icon } from '../ui/icons.js';
import { esc, toast, openSheet, confirmBox } from '../ui/dom.js';
import { hap } from '../ui/sound.js';
import { playBar, defVerdict, FAM_RHYTHM, KIND_RHYTHM, BOSS_ASSAULT, CUSTOM_QTE } from '../ui/def-bar.js';
import { syncLab } from './lab-forge.js';
import { DEF_DEFAULTS, DEF_GROUPS, getTune, readTune, saveTune, tuneInGame, setTuneInGame } from '../ui/def-tune.js';
import { defenseWindow } from '../core/duel.js';
import { INTENTS } from '../core/skills.js';
import { BOSSES } from '../core/bosses.js';
import { VERSION } from '../config.js';

const LETTERS = { n: 'Coup simple', f: 'Coup rapide', l: 'Coup lent', x: 'Feinte', m: 'Zone mobile', h: 'Coup chargé', H: 'Coup chargé avec feinte', o: 'Cercle (gros coup)', O: 'Cercle rapide (anneau rouge)' }; /* v871 : o, O ; v874 : plus d'hésitation */
const FAM = { predateur: 'Prédateur', assassin: 'Assassin', berserker: 'Berserker', protecteur: 'Garde du corps', mage: 'Mage', parasite: 'Parasite', controleur: 'Contrôleur', soutien: 'Instigateur', gardien: 'Gardien' };
/* durée de base de la zone d'or selon l'attaque (defenseWindow) : on prend le type d'attaque qui correspond le mieux */
const KIND_OF = { h: 'heavy', H: 'heavy', o: 'heavy', O: 'heavy' };
const PARAMS = DEF_GROUPS.flatMap(([, list]) => list);
const LN = (L) => LETTERS[L] || (CUSTOM_QTE[L] ? `n° ${L} ${CUSTOM_QTE[L].name || ''}` : L);
const fmtV = (v, step) => (step < 1 ? (+v).toFixed(step < 0.1 ? 2 : 1).replace('.', ',') : String(Math.round(v)));

/* toutes les attaques qu'on peut tester : [id, groupe, nom, séquence, rang imposé, gardien, kind] */
function attacks() {
  const L = [];
  for (const [k, n] of Object.entries(LETTERS)) L.push([`l-${k}`, 'Un seul coup', n, k, null, null, KIND_OF[k] || 'hit']);
  for (const [k, q] of Object.entries(FAM_RHYTHM)) L.push([`f-${k}`, 'Familles d’ennemis (coup ordinaire)', FAM[k] || k, q, null, null, 'hit']);
  for (const [k, q] of Object.entries(KIND_RHYTHM)) L.push([`k-${k}`, 'Attaques spéciales', INTENTS[k]?.name || k, q, null, null, k]);
  for (const [k, q] of Object.entries(CUSTOM_QTE)) L.push([`q-${k}`, 'Mes défenses inventées', `n° ${k} · ${q.name || 'Défense inventée'}`, k, null, null, 'hit']);
  for (const [k, A] of Object.entries(BOSS_ASSAULT)) L.push([`b-${k}`, 'Assauts des gardiens', `${BOSSES[k]?.name || k} · ${A.name}`, A.seq, 'boss', k, 'heavy']);
  return L;
}

export function openDefenseLab(app, { seq = null } = {}) {
  syncLab(); /* v597 : défenses inventées (chiffres 0 à 9) */
  const ALL = attacks();
  const ui = { tier: 'normal', atk: seq ? 'custom' : 'l-n', custom: seq || '', loop: false, running: false, last: null, open: {} };
  let stats = { seq: 0, parry: 0, dodge: 0, none: 0, hits: [] };
  let tune = readTune();
  let tap = null, alive = true;
  const T = () => getTune(true);
  const cur = () => ALL.find((a) => a[0] === ui.atk) || ALL[0];
  const tierOf = () => cur()[4] || ui.tier;
  const seqOf = () => (ui.atk === 'custom' ? (ui.custom.replace(/[^nflxmhH0-9]/g, '') || 'n') : cur()[3]);
  const beatOf = () => (cur()[5] ? BOSS_ASSAULT[cur()[5]].beat || 0 : 0);
  const fakeSt = (L) => ({ units: { a: { intent: { kind: ui.atk === 'custom' ? KIND_OF[L] || 'hit' : (/[hH]/.test(L) ? 'heavy' : cur()[6]) }, level: 1, boss: tierOf() === 'boss', elite: tierOf() === 'elite' }, t: { level: 1 } } });
  const winOf = (L) => defenseWindow(fakeSt(L), 'a', 't', T());

  const sheet = openSheet('', { full: true, cls: 'dl-lab', label: 'Labo des défenses', onClose: () => { alive = false; tap = null; } });
  sheet.el.setAttribute('translate', 'no');

  const figOf = () => {
    const b = cur()[5];
    if (b) return `<img class="dl-fig boss" alt="" src="assets/bosses/${b === 'jumeaux' ? 'jumeaux' : b}.webp" onerror="this.remove()">`;
    return `<img class="dl-fig" alt="" src="assets/bosses/${tierOf() === 'boss' ? 'devoreur' : 'golem'}.webp" onerror="this.remove()">`;
  };
  const pct = (n, d) => (d ? Math.round((100 * n) / d) : 0);
  function statsHTML() {
    const h = stats.hits, n = h.length;
    const c = (r) => h.filter((x) => x.res === r).length;
    const ms = h.filter((x) => x.ms != null).map((x) => x.ms);
    const avg = ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) : null;
    return `<div class="dl-stats"><span><b>${stats.seq}</b> attaques</span><span><b>${n}</b> coups</span>
      <span class="p"><b>${pct(c('parry'), n)} %</b> parades</span><span class="d"><b>${pct(c('dodge'), n)} %</b> esquives</span><span class="k"><b>${pct(c('none'), n)} %</b> touchés</span>
      ${avg != null ? `<span><b>${avg > 0 ? '+' : ''}${avg} ms</b> écart moyen</span>` : ''}</div>`;
  }
  function lastHTML() {
    const l = ui.last; if (!l) return '<p class="small muted center">Lance une attaque, puis touche n’importe où dans le cadre noir au bon moment.</p>';
    const nm = { parry: 'Parade', dodge: 'Esquive', none: 'Touché' };
    return `<div class="dl-last"><b class="r-${l.verdict}">Bilan : ${l.verdict === 'parry' ? 'tout paré (contre-attaque)' : l.verdict === 'dodge' ? 'esquivé (éraflé)' : 'touché'}</b>
      ${l.hits.map((x) => `<span class="r-${x.res}">Coup ${x.i + 1} (${esc(LN(x.letter))}) : ${nm[x.res]}${x.ms != null ? ` · ${x.ms > 0 ? '+' : ''}${x.ms} ms` : ' · pas touché'}</span>`).join('')}
      <small class="muted">Écart = moment du toucher par rapport à l’impact (fin de la zone d’or) : négatif = en avance.</small></div>`;
  }
  function infoHTML() {
    const q = seqOf(), t = T();
    const D0 = tierOf() === 'boss' ? t.durBoss : tierOf() === 'elite' ? t.durElite : t.durNormal;
    const rows = [...new Set(q)].map((L) => { const w = winOf(L), feint = L === 'x' || L === 'H';
      const D = D0 * (L === 'f' ? t.multFast : L === 'l' ? t.multSlow : 1) * (feint ? t.multFeint : 1) * (beatOf() ? t.multBeat : 1);
      if (CUSTOM_QTE[L]) { const C = CUSTOM_QTE[L]; return `<span><b>${esc(LN(L))}</b> : passage ${Math.round(D0 * (C.speed || 1) * (C.feint ? t.multFeint : 1) * (C.bounce ? 1.6 : 1))} ms · zone d’or ×${C.zone || 1} · trait blanc ${Math.round((C.parry || 0.2) * 100)} % de la zone</span>`; }
      if (L === 'o' || L === 'O') { const R = (tierOf() === 'boss' ? t.ringBoss : tierOf() === 'elite' ? t.ringElite : t.ringNormal) * (L === 'O' ? t.ringFast : 1); return `<span><b>${esc(LETTERS[L])}</b> : resserrement ${Math.round(R)} ms · parade ${Math.max(t.ringParryMin, Math.min(t.ringParryMax, Math.round(w.dodge * t.ringParry)))} ms</span>`; }
      return `<span><b>${esc(LETTERS[L])}</b> : passage ${Math.round(D)} ms · zone d’or ${w.dodge} ms · trait blanc ${w.parry} ms</span>`; });
    return `<div class="dl-info small">${rows.join('')}</div>`;
  }
  function paramHTML([k, name, help, min, max, step, unit]) {
    const v = T()[k], changed = Math.abs(v - DEF_DEFAULTS[k]) > 1e-9;
    return `<div class="dl-p ${changed ? 'chg' : ''}"><div class="dl-ph"><b>${esc(name)}</b><span class="dl-v">${fmtV(v, step)} ${esc(unit)}</span>
        ${changed ? `<button class="dl-rst" data-l="reset1" data-k="${k}" title="Valeur du jeu">↺ ${fmtV(DEF_DEFAULTS[k], step)}</button>` : ''}</div>
      <div class="dl-pr"><button class="dl-step" data-l="dec" data-k="${k}">−</button><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-k="${k}"><button class="dl-step" data-l="inc" data-k="${k}">+</button></div>
      ${help ? `<small class="muted">${esc(help)}</small>` : ''}</div>`;
  }
  function draw() {
    const groups = [...new Set(ALL.map((a) => a[1]))];
    const changed = PARAMS.filter((p) => Math.abs(T()[p[0]] - DEF_DEFAULTS[p[0]]) > 1e-9).length;
    const fig = sheet.body.querySelector('.dl-figw'); if (fig) fig.innerHTML = figOf();
    const rest = sheet.body.querySelector('.dl-rest'); if (!rest) return;
    rest.innerHTML = `
      <div class="dl-ctl">
        <div class="dl-tier ${cur()[4] ? 'off' : ''}">${['normal', 'elite', 'boss'].map((t) => `<button class="${tierOf() === t ? 'on' : ''}" data-l="tier" data-v="${t}">${{ normal: 'Ennemi', elite: 'Élite', boss: 'Gardien' }[t]}</button>`).join('')}</div>
        <select class="input plain dl-sel" data-l="atk">${groups.map((gname) => `<optgroup label="${esc(gname)}">${ALL.filter((a) => a[1] === gname).map((a) => `<option value="${a[0]}" ${a[0] === ui.atk ? 'selected' : ''}>${esc(a[2])} · ${esc(a[3])}</option>`).join('')}</optgroup>`).join('')}
          <option value="custom" ${ui.atk === 'custom' ? 'selected' : ''}>Séquence libre…</option></select>
        ${ui.atk === 'custom' ? `<input class="input plain dl-cust" data-l="cust" value="${esc(ui.custom)}" placeholder="ex. nfxh, ou 0 pour ta défense n° 0" maxlength="8">` : ''}
        <p class="small muted dl-legend">n simple · f rapide · l lent · x feinte · m zone mobile · h chargé · H chargé avec feinte · 0 à 9 : tes défenses inventées</p>
        ${infoHTML()}
        <div class="row gap dl-go"><button class="btn gold block" data-l="go" ${ui.running ? 'disabled' : ''}>${icon('swords')}Lancer l’attaque</button>
          <button class="btn ${ui.loop ? 'gold' : ''}" data-l="loop">${ui.loop ? 'Enchaîner ✓' : 'Enchaîner'}</button></div>
      </div>
      <div class="dl-res">${lastHTML()}${statsHTML()}<button class="btn small" data-l="zero">Remettre les compteurs à zéro</button></div>
      <h3 class="dl-h">Réglages ${changed ? `<small>(${changed} changé${changed > 1 ? 's' : ''})</small>` : ''}</h3>
      ${DEF_GROUPS.map(([title, list]) => `<details class="dl-g" data-g="${esc(title)}" ${ui.open[title] ? 'open' : ''}><summary>${esc(title)}</summary>${list.map(paramHTML).join('')}</details>`).join('')}
      <label class="dl-ingame"><input type="checkbox" data-l="ingame" ${tuneInGame() ? 'checked' : ''}> Utiliser mes réglages dans mes vrais combats (sur ce téléphone seulement)</label>
      <div class="cl-foot"><button class="btn gold block" data-l="copy">${icon('download')}Copier mes réglages</button>
        <button class="btn small block" data-l="resetall">Tout remettre comme dans le jeu</button></div>`;
  }
  function shell() {
    sheet.setContent(`
      <h2>${icon('shield')} Labo des défenses</h2>
      <p class="small muted">La barre est exactement celle des combats. Choisis une attaque, lance-la autant de fois que tu veux, et règle la barre en direct plus bas. Tes réglages restent sur ce téléphone ; « Copier mes réglages » te donne un texte à me coller pour que je les mette dans le jeu.</p>
      <div class="dv cb dl-arena"><span class="dl-figw"></span><div class="dv-mid"><span class="dv-msg">Touche ici au bon moment</span></div></div>
      <div class="dl-rest"></div>`);
    draw();
  }
  const redraw = () => { const y = sheet.el.scrollTop; draw(); sheet.el.scrollTop = y; };
  /* la piste (arène) n'est jamais redessinée : une attaque en cours continue même si l'on touche un réglage */
  const updLive = () => { /* sans tout redessiner pendant qu'on glisse un curseur */
    const i = sheet.body.querySelector('.dl-info'); if (i) i.outerHTML = infoHTML();
  };

  async function launch() {
    if (ui.running || !alive) return;
    ui.running = true; redraw();
    const arena = sheet.body.querySelector('.dl-arena'), mid = arena.querySelector('.dv-mid');
    { const r = arena.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) arena.scrollIntoView({ block: 'center' }); } /* la piste toujours visible */
    const hits = [], q = seqOf(), t = T();
    const name = ui.atk === 'custom' ? 'Séquence libre' : cur()[2];
    const res = await playBar({ mid, dv: arena, letters: [...q], tier: tierOf(), win: winOf, beat: beatOf(), titleHTML: esc(name.split(' · ').pop()),
      reduced: false, alive: () => alive, setTap: (f) => { tap = f; }, sfx: app.sfx, hap, T: t, onResult: (h) => hits.push(h) });
    if (!alive) return;
    const v = defVerdict(res.length ? res : ['none'], t);
    if (v === 'parry') app.sfx.perfect?.(); else if (v === 'dodge') app.sfx.hit?.();
    stats.seq++; stats[v]++; stats.hits.push(...hits);
    ui.last = { verdict: v, hits };
    ui.running = false; redraw();
    if (ui.loop && alive) setTimeout(() => { if (ui.loop && alive && !ui.running) launch(); }, 1100);
  }

  const setK = (k, v) => {
    const p = PARAMS.find((x) => x[0] === k); if (!p) return;
    const [, , , min, max, step] = p;
    v = Math.min(max, Math.max(min, Math.round(v / step) * step));
    v = +v.toFixed(4);
    if (Math.abs(v - DEF_DEFAULTS[k]) < 1e-9) delete tune[k]; else tune[k] = v;
    saveTune(tune);
  };

  sheet.body.addEventListener('pointerdown', (e) => {
    if (tap && e.target.closest('.dl-arena')) { e.preventDefault(); tap(e.timeStamp); }
  });
  sheet.body.addEventListener('input', (e) => {
    const r = e.target.closest('input[type="range"][data-k]');
    if (r) { setK(r.dataset.k, +r.value); const box = r.closest('.dl-p'); const p = PARAMS.find((x) => x[0] === r.dataset.k);
      box.querySelector('.dl-v').textContent = `${fmtV(T()[p[0]], p[5])} ${p[6]}`; box.classList.toggle('chg', Math.abs(T()[p[0]] - DEF_DEFAULTS[p[0]]) > 1e-9); updLive(); return; }
    if (e.target.matches('[data-l="cust"]')) { ui.custom = e.target.value; updLive(); }
  });
  sheet.body.addEventListener('change', (e) => {
    if (e.target.matches('input[type="range"]')) { redraw(); return; }
    if (e.target.matches('[data-l="atk"]')) { if (ui.running) { e.target.value = ui.atk; return; } ui.atk = e.target.value; redraw(); return; }
    if (e.target.matches('[data-l="ingame"]')) { setTuneInGame(e.target.checked); toast(e.target.checked ? 'Tes réglages s’appliquent maintenant à tes vrais combats (sur ce téléphone).' : 'Tes vrais combats reprennent les réglages du jeu.', { icon: 'info' }); }
  });
  sheet.body.addEventListener('toggle', (e) => { const d = e.target.closest?.('details[data-g]'); if (d) ui.open[d.dataset.g] = d.open; }, true);
  sheet.body.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-l]'); if (!b || b.matches('select,input')) return;
    const k = b.dataset.l;
    if (k === 'go') return launch();
    if (k === 'loop') { ui.loop = !ui.loop; redraw(); if (ui.loop && !ui.running) launch(); return; }
    if (k === 'tier') { if (ui.running) return; ui.tier = b.dataset.v; redraw(); return; }
    if (k === 'zero') { stats = { seq: 0, parry: 0, dodge: 0, none: 0, hits: [] }; ui.last = null; redraw(); return; }
    if (k === 'dec' || k === 'inc') { const p = PARAMS.find((x) => x[0] === b.dataset.k); setK(p[0], T()[p[0]] + (k === 'inc' ? p[5] : -p[5])); redraw(); return; }
    if (k === 'reset1') { delete tune[b.dataset.k]; saveTune(tune); redraw(); return; }
    if (k === 'resetall') { if (!(await confirmBox('Remettre tous les réglages comme dans le jeu ?', { ok: 'Remettre' }))) return; tune = {}; saveTune(tune); redraw(); return; }
    if (k === 'copy') {
      const txt = report();
      try { await navigator.clipboard.writeText(txt); toast('Réglages copiés : colle-les dans la conversation avec Claude.', { kind: 'success', icon: 'check' }); }
      catch (err) { const s2 = openSheet(`<h2 class="center">Tes réglages</h2><p class="small muted center">Sélectionne tout le texte et copie-le.</p><textarea class="input cl-txt" readonly>${esc(txt)}</textarea>`, { label: 'Tes réglages' }); s2.el.setAttribute('translate', 'no'); }
    }
  });

  function report() {
    const t = T(), ch = PARAMS.filter((p) => Math.abs(t[p[0]] - DEF_DEFAULTS[p[0]]) > 1e-9);
    const h = stats.hits, n = h.length, c = (r) => h.filter((x) => x.res === r).length;
    return [`Réglages des défenses (Labo, ${VERSION}) :`, '',
      ...(ch.length ? ch.map((p) => `- ${p[1]} (${p[0]}) : ${fmtV(DEF_DEFAULTS[p[0]], p[5])} → ${fmtV(t[p[0]], p[5])} ${p[6]}`.trim()) : ['- aucun changement']),
      '', `JSON : ${JSON.stringify(Object.fromEntries(ch.map((p) => [p[0], t[p[0]]])))}`,
      '', `Essais : ${stats.seq} attaques, ${n} coups · parades ${pct(c('parry'), n)} %, esquives ${pct(c('dodge'), n)} %, touchés ${pct(c('none'), n)} %`].join('\n');
  }
  shell();
}
