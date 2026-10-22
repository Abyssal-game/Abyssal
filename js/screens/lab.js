// v595 : Labo des combats (Mode Créateur, route #/labo). Demande du propriétaire du 22 octobre 2026 : « tester en direct la
// difficulté des ennemis étage par étage, la noter, et qu'un algorithme suive mes notes pour régler les autres étages ».
// Onglet Difficulté : combat d'essai (bac à sable, js/core/lab.js) à n'importe quel étage, force des ennemis réglable,
// note du ressenti, courbe proposée pour les 100 étages, simulation au pilote automatique, rapport à copier.
// Onglet Défenses : le Labo des défenses (v594). Outil en français seulement (translate="no").
import { icon } from '../ui/icons.js';
import { esc, toast, openSheet, confirmBox } from '../ui/dom.js';
import { runDuel } from './duel-ui.js';
import { openDefenseLab } from './defense-lab.js';
import { labBattle, labEngine, labSimulate, labSummary, fitCurve, noteValue, LAB_ROOMS, LAB_NOTES, LAB_DEF, LAB_EASE } from '../core/lab.js';
import { BOSSES } from '../core/bosses.js';
import { readAtk, readQte, readPow, saveAtk, saveQte, savePow, syncLab, formHTML, fieldValue, describe, NEW } from './lab-forge.js';
import { VERSION } from '../config.js';

const NKEY = 'abyssal.labNotes';
const readNotes = () => { try { const a = JSON.parse(localStorage.getItem(NKEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const saveNotes = (a) => { try { localStorage.setItem(NKEY, JSON.stringify(a)); } catch (e) { /* rien */ } };
const x2 = (v) => (+v).toFixed(2).replace('.', ',');
const SIM_FLOORS = [1, 5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export default function labScreen(app, root) {
  const g = app.game, cat = app.catalog;
  if (!g.s.settings.dev) { root.innerHTML = '<p class="center muted">Le Labo des combats est réservé au Mode Créateur.</p>'; return; }
  const ui = (app.state.lab ||= { useAtk: true, usePow: true, tab: 'diff', floor: 10, room: 'fight', level: 'mine', hp: 1, atk: 1, def: 'mid', result: null, sim: null, curveSim: null, simBusy: false });
  let battle = null, alive = true;
  root.setAttribute('translate', 'no');
  syncLab(); /* v596 : inventions du Labo rendues jouables */

  const inv = () => { const P = readPow(); return { attacks: ui.useAtk ? readAtk() : null, skills: ui.usePow ? P.skills : null, teamUlt: ui.usePow ? P.ult : null }; };
  const cfg = () => ({ floor: ui.floor, room: ui.room, level: ui.level, hp: ui.hp, atk: ui.atk, ...inv() });
  function preview() {
    const { st, team, run } = labBattle(g, { ...cfg(), seed: 7 });
    const foes = st.order.enemy.map((id) => st.units[id]);
    return `<div class="lb-prev"><p class="small muted">${esc(team.label)} · ennemis de l’étage ${run.floor} (exemple : ils changent à chaque combat)</p>
      ${foes.map((e) => `<span class="lb-foe ${e.boss ? 'boss' : e.elite ? 'elite' : ''}"><b>${esc(e.boss && st.bossKey ? BOSSES[st.bossKey].name : cat.get(e.id)?.name || e.id)}</b><small>PV ${e.maxHp} · ATQ ${e.atk}${e.boss ? ' · gardien' : e.elite ? ' · élite' : ''}</small></span>`).join('')}</div>`;
  }
  const seg = (k, list) => `<div class="lb-seg">${list.map(([v, l]) => `<button class="${String(ui[k]) === String(v) ? 'on' : ''}" data-set="${k}" data-v="${v}">${esc(l)}</button>`).join('')}</div>`;
  const slider = (k, label, min, max, step) => `<div class="lb-sl"><div class="lb-slh"><b>${esc(label)}</b><span>× ${x2(ui[k])}</span>${ui[k] !== 1 ? `<button class="dl-rst" data-a="one" data-k="${k}">↺ 1</button>` : ''}</div>
    <div class="dl-pr"><button class="dl-step" data-a="dec" data-k="${k}">−</button><input type="range" min="${min}" max="${max}" step="${step}" value="${ui[k]}" data-k="${k}"><button class="dl-step" data-a="inc" data-k="${k}">+</button></div></div>`;

  function chart(c) {
    const W = 340, H = 170, X = (f) => 26 + (f - 1) * (W - 34) / 99, lo = 0.4, hi = 2.2, Y = (m) => H - 18 - (Math.min(hi, Math.max(lo, m)) - lo) * (H - 30) / (hi - lo);
    const path = (arr, step = 1) => arr.map((m, i) => [i + 1, m]).filter(([f]) => step === 1 || f % step === 0).map(([f, m], i) => `${i ? 'L' : 'M'}${X(f).toFixed(1)},${Y(m).toFixed(1)}`).join(' ');
    const dots = (k, cls) => ['hp', 'atk'].flatMap((s) => c.points[k][s].map(([f, m]) => `<circle class="${cls} ${s}" cx="${X(f).toFixed(1)}" cy="${Y(m).toFixed(1)}" r="3.5"/>`)).join('');
    const ticks = [1, 25, 50, 75, 100].map((f) => `<text x="${X(f)}" y="${H - 4}" text-anchor="middle">${f}</text>`).join('') + [0.5, 1, 1.5, 2].map((m) => `<text x="2" y="${Y(m) + 3}">${x2(m).replace(',00', '').replace(/0$/, '')}</text><line class="grid" x1="26" x2="${W - 8}" y1="${Y(m)}" y2="${Y(m)}"/>`).join('');
    return `<svg class="lb-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbe proposée">${ticks}
      <line class="base" x1="26" x2="${W - 8}" y1="${Y(1)}" y2="${Y(1)}"/>
      <path class="foe hp" d="${path(c.foe.hp)}"/><path class="foe atk" d="${path(c.foe.atk)}"/>
      <path class="boss hp" d="${path(c.boss.hp, 5)}"/><path class="boss atk" d="${path(c.boss.atk, 5)}"/>${dots('foe', 'foe')}${dots('boss', 'boss')}</svg>
      <p class="lb-leg small"><span class="foe">━ Combats et élites · PV</span> <span class="foe">┅ ATQ</span> <span class="boss">━ Gardiens · PV</span> <span class="boss">┅ ATQ</span><br><span class="muted">Ligne blanche = le jeu aujourd’hui (× 1). Au-dessus : ennemis plus forts.</span></p>`;
  }

  function diffTab() {
    const notes = readNotes(), c = fitCurve(notes), R = ui.result;
    return `
      <section class="cr-sec lb-box"><h3>${icon('swords')} Essayer un combat</h3>
        <div class="lb-row"><b>Étage</b><div class="dl-pr"><button class="dl-step" data-a="fl" data-v="-5">−5</button><button class="dl-step" data-a="fl" data-v="-1">−</button>
          <input type="range" min="1" max="100" step="1" value="${ui.floor}" data-k="floor"><button class="dl-step" data-a="fl" data-v="1">+</button><button class="dl-step" data-a="fl" data-v="5">+5</button></div><span class="lb-fl">${ui.room === 'boss' ? Math.max(5, Math.round(ui.floor / 5) * 5) : ui.floor}</span></div>
        ${seg('room', Object.entries(LAB_ROOMS))}
        ${ui.room === 'boss' ? '<p class="small muted">Les gardiens ne sont qu’aux étages 5, 10, 15… : l’étage est arrondi.</p>' : ''}
        <p class="small lb-lab">Ton équipe</p>
        ${seg('level', [['mine', 'La tienne'], ['type', 'Équipe type'], ['1', 'Niv. 1'], ['5', 'Niv. 5'], ['10', 'Niv. 10']])}
        <p class="small muted">« Équipe type » : 5 cartes à la force conseillée pour cet étage (comme un joueur qui a bien renforcé son équipe).</p>
        ${slider('hp', 'PV des ennemis', 0.3, 3, 0.05)}${slider('atk', 'Attaque des ennemis', 0.3, 3, 0.05)}
        ${preview()}
        <label class="lf-b"><input type="checkbox" data-tog="useAtk" ${ui.useAtk ? 'checked' : ''}> Avec mes attaques inventées (${readAtk().filter((a) => a.on !== false).length} actives)</label>
        <label class="lf-b"><input type="checkbox" data-tog="usePow" ${ui.usePow ? 'checked' : ''}> Avec mes pouvoirs inventés (${readPow().skills.filter((a) => a.on !== false).length} compétence(s)${readPow().ult?.on !== false && readPow().ult ? ', pouvoir d’équipe' : ''})</label>
        <button class="btn gold block lb-go" data-a="fight">${icon('swords')}Combattre</button>
        <div class="lb-simrow">${seg('def', Object.entries(LAB_DEF).map(([k, v]) => [k, v[0]]))}
          <button class="btn block" data-a="sim" ${ui.simBusy ? 'disabled' : ''}>Simuler 30 combats (pilote automatique)</button>
          ${ui.sim ? `<p class="small lb-simres">${esc(ui.sim.label)} : <b>${ui.sim.win} %</b> de victoires · ${ui.sim.lost} % de PV perdus · ${ui.sim.fallen} créature(s) tombée(s) · ${ui.sim.rounds} tours en moyenne</p>` : ''}</div>
      </section>
      ${R ? `<section class="cr-sec lb-box lb-res"><h3>${R.won ? '<span class="dc-good">Victoire</span>' : '<span class="dc-bad">Défaite</span>'} · ${esc(LAB_ROOMS[R.room])} étage ${R.floor}</h3>
        <p class="small">PV perdus : <b>${R.lost} %</b> · créatures tombées : <b>${R.fallen}</b> · ${R.rounds} tours · ennemis PV × ${x2(R.hp)}, ATQ × ${x2(R.atk)}</p>
        <p class="small lb-lab">Ton ressenti sur cet étage</p>
        <div class="lb-notes">${Object.entries(LAB_NOTES).map(([k, [l]]) => `<button class="lb-n n-${k}" data-a="note" data-v="${k}">${esc(l)}</button>`).join('')}</div>
        <p class="small muted">La note est gardée avec la force essayée. « Trop facile » propose des ennemis 25 % plus forts, « Trop dur » 22 % plus faibles.</p>
        <div class="row gap"><button class="btn small" data-a="again">Rejouer</button><button class="btn small" data-a="harder">Rejouer +15 %</button><button class="btn small" data-a="softer">Rejouer −15 %</button></div></section>` : ''}
      <section class="cr-sec lb-box"><h3>${icon('book')} Mes notes (${notes.length})</h3>
        ${notes.length ? `<div class="lb-nl">${notes.map((n, i) => { const v = noteValue(n); return `<div class="lb-ni"><span><b>${esc(LAB_ROOMS[n.room])} · étage ${n.floor}</b><small>essayé PV × ${x2(n.hp)}, ATQ × ${x2(n.atk)} · ${esc(LAB_NOTES[n.note]?.[0] || '')}${n.won != null ? ` · ${n.won ? 'gagné' : 'perdu'}, ${n.lost} % PV perdus` : ''}</small><small class="lb-keep">retenu : PV × ${x2(v.hp)}, ATQ × ${x2(v.atk)}</small></span><button class="dl-rst" data-a="del" data-i="${i}">✕</button></div>`; }).join('')}</div>`
        : '<p class="small muted">Joue un combat, puis note-le. Quelques étages suffisent (par exemple 1, 5, 12, 20, 35, 50, 75, 100, en combat et en gardien) : la courbe relie tes notes et règle tous les autres étages.</p>'}
        <button class="btn small" data-a="addnote">Noter la force actuelle sans combattre</button></section>
      <section class="cr-sec lb-box"><h3>${icon('crown')} Courbe proposée</h3>${chart(c)}
        ${c.raised.length ? `<details class="dl-g"><summary>${c.raised.length} correction(s) : la force ne doit jamais baisser d’un étage au suivant</summary><p class="small">${c.raised.slice(0, 40).map(esc).join('<br>')}</p></details>` : ''}
        <button class="btn block" data-a="cursim" ${ui.simBusy ? 'disabled' : ''}>Comparer le jeu actuel et la courbe (simulation)</button>
        <p class="small muted">Joue 12 combats par étage (${SIM_FLOORS.join(', ')}), avec l’équipe type et la défense choisie plus haut. Prend une à deux minutes.</p>
        ${ui.curveSim ? curveSimHTML() : ''}</section>
      <div class="cl-foot"><button class="btn gold block" data-a="copy">${icon('download')}Copier le rapport</button>
        <button class="btn small block" data-a="clear">Effacer mes notes</button></div>`;
  }
  function curveSimHTML() {
    const s = ui.curveSim;
    return `<table class="lb-tab small"><tr><th>Étage</th><th>Combat<br>jeu → courbe</th><th>Gardien<br>jeu → courbe</th></tr>
      ${s.rows.map((r) => `<tr><td>${r.floor}</td><td>${r.fight ? `${r.fight[0].win} % → <b>${r.fight[1].win} %</b>` : '…'}</td><td>${r.boss ? `${r.boss[0].win} % → <b>${r.boss[1].win} %</b>` : '—'}</td></tr>`).join('')}</table>
      <p class="small muted">${esc(LAB_DEF[s.def][0])} · pourcentage de victoires${s.done ? '' : ' · en cours…'}</p>`;
  }

  const item = (type, i, o, extra = '') => `<details class="dl-g lf-it" ${ui.openIt === `${type}:${i}` ? 'open' : ''} data-it="${type}:${i}"><summary><b>${type === 'qte' ? `${i} · ` : ''}${esc(o.name || '')}</b>${o.on === false ? ' <small class="muted">(éteinte)</small>' : ''}</summary>
      <div class="lf-form">${formHTML(type, i, o)}</div>
      <div class="row gap wrap lf-acts"><button class="btn small" data-a="dup" data-t="${type}" data-i="${i}">Dupliquer</button><button class="btn small" data-a="rm" data-t="${type}" data-i="${i}">Supprimer</button></div></details>${extra ? `<div class="lf-try">${extra}</div>` : ''}`;
  const where = () => `${LAB_ROOMS[ui.room]} étage ${ui.floor}, réglages de l’onglet Difficulté`;
  function atkTab() {
    const L = readAtk();
    return `<section class="cr-sec lb-box"><h3>${icon('swords')} Attaques des ennemis</h3>
      <p class="small muted">Invente une attaque avec des briques, puis essaie-la en combat (${esc(where())}). Les ennemis l’utilisent selon sa fréquence ; la séquence décide de la défense à jouer. Jusqu’à 10 attaques.</p>
      ${L.map((a, i) => item('atk', i, a, `<button class="btn small gold" data-a="tryatk" data-i="${i}">Essayer en combat</button>`)).join('') || '<p class="small muted">Aucune attaque inventée.</p>'}
      ${L.length < 10 ? '<button class="btn block" data-a="new" data-t="atk">+ Nouvelle attaque</button>' : ''}</section>`;
  }
  function defTab() {
    const L = readQte();
    return `<section class="cr-sec lb-box"><h3>${icon('shield')} Labo des défenses</h3><p class="small muted">La barre de défense contre chaque attaque, réglable en direct.</p><button class="btn gold block" data-a="deflab">Ouvrir le Labo des défenses</button></section>
      <section class="cr-sec lb-box"><h3>Nouvelles défenses</h3>
      <p class="small muted">Invente un geste de défense avec des briques. Chacune a un numéro (0 à 9) : mets ce chiffre dans la séquence d’une attaque inventée pour que les ennemis l’utilisent, ou essaie-la tout de suite.</p>
      ${L.map((q, i) => item('qte', i, q, `<button class="btn small gold" data-a="tryqte" data-i="${i}">Essayer</button>`)).join('') || '<p class="small muted">Aucune défense inventée.</p>'}
      ${L.length < 10 ? '<button class="btn block" data-a="new" data-t="qte">+ Nouvelle défense</button>' : ''}</section>`;
  }
  function powTab() {
    const P = readPow();
    return `<section class="cr-sec lb-box"><h3>${icon('crown')} Compétences inventées</h3>
      <p class="small muted">Un nouveau pouvoir pour tes créatures (toutes, ou un rôle). Il apparaît à côté de leurs actions dans les combats d’essai. Jusqu’à 3.</p>
      ${P.skills.map((k, i) => item('skill', i, k)).join('') || '<p class="small muted">Aucune compétence inventée.</p>'}
      ${P.skills.length < 3 ? '<button class="btn block" data-a="new" data-t="skill">+ Nouvelle compétence</button>' : ''}</section>
      <section class="cr-sec lb-box"><h3>Pouvoir d’équipe inventé</h3>
      <p class="small muted">Remplace le pouvoir d’équipe (jauge de Ferveur pleine) dans les combats d’essai.</p>
      ${P.ult ? item('ult', 0, P.ult) : '<button class="btn block" data-a="new" data-t="ult">+ Inventer un pouvoir d’équipe</button>'}</section>
      <button class="btn gold block" data-a="trypow">${icon('swords')}Essayer mes pouvoirs en combat</button><p class="small muted center">${esc(where())}</p>`;
  }

  function render() {
    if (battle) return;
    root.innerHTML = `<div class="lb-wrap">
      <h2 class="lb-title">${icon('crown')} Labo des combats</h2>
      <p class="small muted">Réservé au Mode Créateur. Tout ce qui se passe ici est un essai : rien n’est gagné ni perdu, rien n’est envoyé au serveur. Le rapport te permet de m’envoyer tes réglages pour que je les applique au jeu.</p>
      <div class="lb-tabs">${[['diff', 'Difficulté'], ['atk', 'Attaques'], ['def', 'Défenses'], ['pow', 'Pouvoirs']].map(([k, l]) => `<button class="${ui.tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
      ${ui.tab === 'def' ? defTab() : ui.tab === 'atk' ? atkTab() : ui.tab === 'pow' ? powTab() : diffTab()}
      ${ui.tab !== 'diff' ? `<div class="cl-foot"><button class="btn gold block" data-a="copy">${icon('download')}Copier le rapport</button></div>` : ''}
    </div>`;
  }

  function fight(over = {}) {
    const conf = { ...cfg(), ...over }, { st, run } = labBattle(g, conf);
    battle = runDuel(app, root, { title: `Essai · ${LAB_ROOMS[run.room]} étage ${run.floor}`, run, engine: labEngine(st),
      onAbandon: () => { if (battle) battle.stop(); battle = null; document.body.classList.remove('battle-mode'); app.chrome(); render(); window.scrollTo(0, 0); },
      onEnd: () => {
        battle = null; if (!alive) return;
        ui.result = { ...labSummary(st), floor: run.floor, room: run.room, hp: conf.hp, atk: conf.atk, level: conf.level };
        app.chrome(); render(); window.scrollTo(0, root.querySelector('.lb-res')?.offsetTop - 60 || 0);
      } });
  }
  function addNote(note, from) {
    const n = readNotes();
    const r = from || { floor: ui.room === 'boss' ? Math.max(5, Math.round(ui.floor / 5) * 5) : ui.floor, room: ui.room, hp: ui.hp, atk: ui.atk, level: ui.level };
    n.push({ floor: r.floor, room: r.room, hp: r.hp, atk: r.atk, level: r.level, note, won: r.won ?? null, lost: r.lost ?? null, t: Date.now() });
    n.sort((a, b) => a.floor - b.floor || a.room.localeCompare(b.room));
    saveNotes(n);
  }
  const later = () => new Promise((r) => setTimeout(r, 0));
  async function simNow() {
    ui.simBusy = true; render();
    await later();
    const r = labSimulate(g, cfg(), 30, ui.def);
    ui.sim = { ...r, label: `${LAB_ROOMS[ui.room]} étage ${ui.floor} · ${LAB_DEF[ui.def][0]}` };
    ui.simBusy = false; if (alive && !battle) render();
  }
  async function curveSim() {
    const c = fitCurve(readNotes());
    ui.simBusy = true; ui.curveSim = { def: ui.def, rows: SIM_FLOORS.map((floor) => ({ floor })), done: false }; render();
    for (const row of ui.curveSim.rows) {
      for (const room of ['fight', 'boss']) {
        if (room === 'boss' && row.floor % 5) continue;
        await later(); if (!alive) return;
        const base = { floor: row.floor, room, level: 'type' };
        row[room] = [labSimulate(g, base, 12, ui.def), labSimulate(g, { ...base, curve: c.at }, 12, ui.def)];
      }
      if (alive && !battle) { const box = root.querySelector('.lb-tab'); if (box) box.outerHTML = curveSimHTML().split('</table>')[0] + '</table>'; else render(); }
    }
    ui.curveSim.done = true; ui.simBusy = false; if (alive && !battle) render();
  }
  function inventions() {
    const A = readAtk(), Q = readQte(), P = readPow(), out = [];
    if (A.length) out.push('', `Attaques inventées (${A.length}) :`, ...A.map((a, i) => `- ${a.name}${a.on === false ? ' (éteinte)' : ''} : ${describe('atk', a)}`));
    if (Q.length) out.push('', `Défenses inventées (${Q.length}) :`, ...Q.map((q, i) => `- n° ${i} ${q.name} : ${describe('qte', q)}`));
    if (P.skills.length) out.push('', `Compétences inventées (${P.skills.length}) :`, ...P.skills.map((k) => `- ${k.name}${k.on === false ? ' (éteinte)' : ''} : ${describe('skill', k)}`));
    if (P.ult) out.push('', `Pouvoir d’équipe inventé : ${P.ult.name} : ${describe('ult', P.ult)}`);
    return out;
  }
  function report() {
    const notes = readNotes(), c = fitCurve(notes);
    const pts = (k) => [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100].filter((f) => k === 'foe' || f % 5 === 0).map((f) => `${f}: PV ${x2(c[k].hp[f - 1])} ATQ ${x2(c[k].atk[f - 1])}`).join(' · ');
    const s = ui.curveSim;
    return [`Labo des combats (${VERSION}) :`, '', `Notes (${notes.length}) :`,
      ...(notes.length ? notes.map((n) => { const v = noteValue(n); return `- ${LAB_ROOMS[n.room]} étage ${n.floor} : essayé PV ×${x2(n.hp)} ATQ ×${x2(n.atk)} (${n.level === 'mine' ? 'mon équipe' : n.level === 'type' ? 'équipe type' : `niv. ${n.level}`}) · ${LAB_NOTES[n.note]?.[0]}${n.won != null ? ` · ${n.won ? 'gagné' : 'perdu'}, ${n.lost} % PV perdus` : ''} → retenu PV ×${x2(v.hp)} ATQ ×${x2(v.atk)}`; }) : ['- aucune']),
      '', 'Courbe proposée (multiplicateur sur le jeu actuel) :', `Combats et élites : ${pts('foe')}`, `Gardiens : ${pts('boss')}`,
      ...(c.raised.length ? ['', `Corrections (jamais de baisse d’un étage au suivant) : ${c.raised.length}`] : []),
      ...(s?.done ? ['', `Simulation (${LAB_DEF[s.def][0]}, équipe type, victoires jeu → courbe) :`, ...s.rows.map((r) => `- étage ${r.floor} : combat ${r.fight?.[0].win} % → ${r.fight?.[1].win} %${r.boss ? ` · gardien ${r.boss[0].win} % → ${r.boss[1].win} %` : ''}`)] : []),
      ...inventions(),
      '', `JSON : ${JSON.stringify({ notes: notes.map(({ floor, room, hp, atk, note }) => ({ floor, room, hp, atk, note })), attaques: readAtk(), defenses: readQte(), pouvoirs: readPow() })}`,
      `Réglages actuels : FOE_EASE ${JSON.stringify(LAB_EASE.FOE_EASE)} · BOSS_EASE ${JSON.stringify(LAB_EASE.BOSS_EASE)}`].join('\n');
  }

  const clampF = (v) => Math.min(100, Math.max(1, Math.round(v)));
  const store = { atk: [readAtk, saveAtk], qte: [readQte, saveQte] };
  function setField(el) {
    const [type, i, k, v] = fieldValue(el);
    if (type === 'skill' || type === 'ult') { const P = readPow(); if (type === 'ult') P.ult[k] = v; else P.skills[i][k] = v; savePow(P); }
    else { const L = store[type][0](); L[i][k] = v; store[type][1](L); }
    const lab = el.closest('.lf-n')?.querySelector('b'); if (lab) lab.textContent = String(+(+v).toFixed(2)).replace('.', ',');
    if (k === 'name') { const sm = el.closest('details')?.querySelector('summary b'); if (sm) sm.textContent = (type === 'qte' ? `${i} · ` : '') + v; }
  }
  root.addEventListener('toggle', (e) => { const d = e.target.closest?.('details[data-it]'); if (d && d.open) ui.openIt = d.dataset.it; }, true);
  root.addEventListener('input', (e) => {
    if (e.target.matches('[data-f]') && e.target.type !== 'checkbox' && e.target.tagName !== 'SELECT') { setField(e.target); return; }
    const r = e.target.closest('input[type="range"][data-k]'); if (!r) return;
    const k = r.dataset.k; ui[k] = k === 'floor' ? clampF(+r.value) : +(+r.value).toFixed(2);
    const box = r.closest('.lb-sl, .lb-row'); const sp = box?.querySelector('.lb-slh span, .lb-fl'); if (sp) sp.textContent = k === 'floor' ? String(ui.floor) : `× ${x2(ui[k])}`;
  });
  root.addEventListener('change', (e) => {
    if (e.target.matches('[data-f]')) { setField(e.target); return; }
    if (e.target.matches('[data-tog]')) { ui[e.target.dataset.tog] = e.target.checked; ui.sim = null; return; }
    if (e.target.matches('input[type="range"][data-k]')) { ui.sim = null; render(); }
  });
  root.addEventListener('click', async (e) => {
    if (battle) return;
    const t = e.target.closest('[data-tab]'); if (t) { ui.tab = t.dataset.tab; render(); return; }
    const s = e.target.closest('[data-set]'); if (s) { ui[s.dataset.set] = s.dataset.v; ui.sim = null; render(); return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'deflab') return openDefenseLab(app);
    if (a === 'new' || a === 'dup' || a === 'rm') {
      const type = b.dataset.t, i = +b.dataset.i;
      if (a === 'rm' && !(await confirmBox('Supprimer cette invention ?', { ok: 'Supprimer', danger: true }))) return;
      if (type === 'skill' || type === 'ult') {
        const P = readPow();
        if (type === 'ult') P.ult = a === 'rm' ? null : NEW.ult(); else if (a === 'new') P.skills.push(NEW.skill()); else if (a === 'dup') P.skills.splice(i + 1, 0, { ...P.skills[i], name: `${P.skills[i].name} (copie)` }); else P.skills.splice(i, 1);
        P.skills = P.skills.slice(0, 3); savePow(P); ui.openIt = a === 'new' ? `${type}:${type === 'ult' ? 0 : P.skills.length - 1}` : ui.openIt;
      } else {
        const L = store[type][0]();
        if (a === 'new') L.push(NEW[type]()); else if (a === 'dup') L.splice(i + 1, 0, { ...L[i], name: `${L[i].name} (copie)` }); else L.splice(i, 1);
        store[type][1](L.slice(0, 10)); ui.openIt = a === 'new' ? `${type}:${L.length - 1}` : ui.openIt;
      }
      render(); return;
    }
    if (a === 'tryatk') { const L = readAtk().map((x, j) => ({ ...x, on: j === +b.dataset.i, chance: j === +b.dataset.i ? Math.max(0.5, x.chance ?? 0.3) : 0 })); return fight({ attacks: L }); }
    if (a === 'tryqte') return openDefenseLab(app, { seq: String(+b.dataset.i) });
    if (a === 'trypow') { const P = readPow(); return fight({ skills: P.skills, teamUlt: P.ult }); }
    if (a === 'fl') { ui.floor = clampF(ui.floor + +b.dataset.v); ui.sim = null; render(); return; }
    if (a === 'dec' || a === 'inc') { const k = b.dataset.k; ui[k] = Math.min(3, Math.max(0.3, +(ui[k] + (a === 'inc' ? 0.05 : -0.05)).toFixed(2))); ui.sim = null; render(); return; }
    if (a === 'one') { ui[b.dataset.k] = 1; ui.sim = null; render(); return; }
    if (a === 'fight') return fight();
    if (a === 'again') return fight();
    if (a === 'harder' || a === 'softer') { const k = a === 'harder' ? 1.15 : 1 / 1.15; ui.hp = +Math.min(3, ui.hp * k).toFixed(2); ui.atk = +Math.min(3, ui.atk * k).toFixed(2); return fight(); }
    if (a === 'note') { addNote(b.dataset.v, ui.result); ui.result = null; toast('Note gardée.', { icon: 'check' }); render(); return; }
    if (a === 'addnote') {
      const sh = openSheet(`<h2 class="center">Noter sans combattre</h2><p class="small center">${esc(LAB_ROOMS[ui.room])} étage ${ui.floor} · PV × ${x2(ui.hp)}, ATQ × ${x2(ui.atk)}</p><div class="lb-notes">${Object.entries(LAB_NOTES).map(([k, [l]]) => `<button class="lb-n n-${k}" data-nn="${k}">${esc(l)}</button>`).join('')}</div>`, { label: 'Noter' });
      sh.el.setAttribute('translate', 'no');
      sh.body.addEventListener('click', (ev) => { const n = ev.target.closest('[data-nn]'); if (!n) return; addNote(n.dataset.nn); sh.close(); render(); });
      return;
    }
    if (a === 'del') { const n = readNotes(); n.splice(+b.dataset.i, 1); saveNotes(n); render(); return; }
    if (a === 'clear') { if (!(await confirmBox('Effacer toutes tes notes de difficulté ?', { ok: 'Effacer', danger: true }))) return; saveNotes([]); ui.curveSim = null; render(); return; }
    if (a === 'sim') return simNow();
    if (a === 'cursim') return curveSim();
    if (a === 'copy') {
      const txt = report();
      try { await navigator.clipboard.writeText(txt); toast('Rapport copié : colle-le dans la conversation avec Claude.', { kind: 'success', icon: 'check' }); }
      catch (err) { const s2 = openSheet(`<h2 class="center">Ton rapport</h2><p class="small muted center">Sélectionne tout le texte et copie-le.</p><textarea class="input cl-txt" readonly>${esc(txt)}</textarea>`, { label: 'Ton rapport' }); s2.el.setAttribute('translate', 'no'); }
    }
  });
  render();
  return () => { alive = false; if (battle) { battle.stop(); battle = null; } document.body.classList.remove('battle-mode'); };
}
