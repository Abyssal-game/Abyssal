// v427 : Les Énigmes des Sceaux — trois casse-têtes par jour sur le plateau des Sceaux.
import * as EG from '../core/enigmes.js';
import * as SC from '../core/sceaux.js';
import { scCard } from './sceaux.js';
import { openRuleHelp } from '../ui/sceaux-demo.js';
import { icon, picon } from '../ui/icons.js';
import { esc, fmt, toast } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { tuto } from '../ui/tutos.js';

const RULE_MED = { classique: 'sc-rule-classique', sacre: 'sc-rule-sacre', identique: 'sc-rule-identique', somme: 'sc-rule-somme' };
const ROMAN = ['I', 'II', 'III'];
const starRow = (n, max = 3) => `<span class="eg-stars">${'★'.repeat(n)}<i>${'★'.repeat(max - n)}</i></span>`;

export default function enigmesScreen(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.enigmes ||= { k: null, sel: null });
  let busy = false, timer = 0, gone = false;
  const wait = (ms) => new Promise((r) => { timer = setTimeout(r, app.reduced() ? Math.min(ms, 150) : ms); });

  function lobby() {
    ui.k = null;
    document.body.classList.remove('battle-mode');
    document.querySelector('.sc-scene')?.remove();
    setScene('menu');
    if (!g.sceauxOpen()) {
      root.innerHTML = `<header class="screen-head ui-hero bn-enigmes"><h1>Les Énigmes des Sceaux</h1><p class="muted">Trois casse-têtes par jour.</p></header>
        <section class="panel tr-lock">${icon('lock')}<b>Encore scellées</b><p class="small">Vaincs ton <b>premier gardien</b> dans la Descente (étage 5) pour ouvrir les Énigmes.</p><a class="btn primary block" href="#/descente">${icon('p:descend')}Aller à la Descente</a></section>`;
      return;
    }
    const e = g.enigmes(), list = g.enigmePuzzles(), R = EG.ENIGME_REWARD;
    root.innerHTML = `<header class="screen-head ui-hero bn-enigmes"><h1>Les Énigmes des Sceaux</h1><p class="muted">Trouve la pose qui capture le plus de cartes. Trois énigmes par jour, les mêmes pour tous.</p>
        <span class="sc-rec">${e.solved} énigme${e.solved > 1 ? 's' : ''} résolue${e.solved > 1 ? 's' : ''} · ${e.starsTotal} ★${e.streak ? ` · série de ${e.streak} jour${e.streak > 1 ? 's' : ''}` : ''}</span></header>
      <div class="eg-list">${list.map((pz, k) => {
        const done = e.done[k], st = e.stars[k], left = EG.TRIES - e.tries[k];
        return `<button class="panel eg-tile ${done ? (st ? 'won' : 'lost') : ''}" data-eg="open" data-k="${k}">
          <span class="eg-num">${ROMAN[k]}</span>
          <span class="eg-txt"><b>${esc(EG.LEVELS[k].name)} · ${esc(SC.RULES[pz.rule].name)}</b><span class="small">Capture ${pz.goal} cartes en une seule pose</span>
          <span class="small muted">${done ? (st ? `Résolue : ${st} étoile${st > 1 ? 's' : ''}` : 'Ratée : regarde la solution') : `${left} essai${left > 1 ? 's' : ''} · +${R.shards[k]} à +${R.shards[k] + 2 * R.perStar} éclats`}</span></span>
          ${done ? starRow(st) : icon('next')}</button>`;
      }).join('')}</div>
      <p class="small muted center">Les trois énigmes résolues le même jour : ${e.chest === e.day ? 'coffre de bois gagné aujourd’hui !' : 'un coffre de bois.'} Nouvelles énigmes chaque jour.</p>
      <details class="panel dc-fold dc-how"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/help.webp"><span class="dc-sum-t">Comment ça marche</span></summary>
        <ol class="how-steps">${[['cards', '#7FA8D8', 'Le plateau', 'Des cartes sont déjà posées : les bleues sont à toi, les rouges à l’adversaire. Tu as une petite main imposée.'],
          ['swords', '#E0485E', 'Ta pose', 'Choisis une carte, puis une case libre. Elle capture comme aux Duels des Sceaux (règle de l’énigme comprise : Identique, Somme et Combo).'],
          ['crown', '#F2C14E', 'Le but', 'Capturer exactement le nombre de cartes demandé (ou plus) en une seule pose.'],
          ['hourglass', '#9FE0FF', 'Trois essais', '3 étoiles du premier coup, 2 au deuxième, 1 au troisième. Après trois essais ratés, la solution t’est montrée.']]
          .map(([ic, c, t, d], i) => `<li style="--hc:${c}"><span class="how-ic">${picon(ic)}<em>${i + 1}</em></span><span><b>${t}</b><span class="small">${d}</span></span></li>`).join('')}</ol></details>`;
    tuto(app, 'enigmes');
  }

  function scene() {
    let el = document.querySelector('.sc-scene');
    if (!el) { el = document.createElement('div'); document.body.prepend(el); }
    el.className = 'sc-scene th-salle';
    el.style.backgroundImage = 'url(assets/sceaux/salle.webp)';
  }
  // Plateau de l'énigme (st : état après une pose, pour montrer les captures)
  function view({ st = null, mark = null, msg = '' } = {}) {
    const k = ui.k, pz = g.enigmePuzzles()[k], e = g.enigmes();
    if (!pz) return lobby();
    document.body.classList.add('battle-mode');
    setScene(null); scene();
    const board = st ? st.board : pz.board, hand = st ? st.hands.p : pz.hand, done = e.done[k], left = EG.TRIES - e.tries[k];
    const can = !busy && !done && !st;
    const cell = (c, i) => {
      if (!c) return `<button class="sc-cell ${i === SC.CENTER ? 'heart' : ''} ${ui.sel != null && can ? 'can' : ''}" data-eg="cell" data-i="${i}" aria-label="Case ${i + 1}"></button>`;
      return `<div class="sc-cell full ${i === SC.CENTER ? 'heart' : ''} ${mark?.cell === i ? 'drop' : ''} ${mark?.flips?.includes(i) ? 'eg-took' : ''}" data-i="${i}">${scCard(cat, c.id, { vals: c.vals, owner: c.owner, back: true })}</div>`;
    };
    root.innerHTML = `<div class="sc-game eg-game ${app.reduced() ? 'rm' : ''}">
      <div class="sc-bar"><button class="btn small ghost" data-eg="back" aria-label="Retour aux énigmes">${icon('back')}</button>
        <span class="eg-head"><b>${esc(EG.LEVELS[k].name)}</b><small>Capture <b>${pz.goal}</b> cartes en une pose</small></span>
        <span class="eg-tries" aria-label="${left} essais restants">${Array.from({ length: EG.TRIES }, (_, n) => `<i class="${n < left ? 'on' : ''}"></i>`).join('')}</span></div>
      <div class="sc-sub"><span></span><button class="sc-rule" data-eg="rule">${RULE_MED[pz.rule] ? `<img class="sc-ricon" alt="" src="assets/icons/${RULE_MED[pz.rule]}.webp">` : ''}${esc(SC.RULES[pz.rule].name)}</button></div>
      <div class="sc-bwrap"><div class="sc-board"><div class="sc-plate">${board.map(cell).join('')}</div></div></div>
      <p class="sc-msg">${msg || (done ? (e.stars[k] ? `Résolue : ${starRow(e.stars[k])}` : 'Énigme terminée.') : ui.sel == null ? 'Touche une de tes cartes, puis une case libre.' : 'Touche une case libre pour poser la carte.')}</p>
      <div class="sc-tray ${can ? 'on' : ''}"><div class="sc-hand-row">${hand.map((id, h) => `<button class="sc-hc ${ui.sel === h && can ? 'sel' : ''}" data-eg="pick" data-h="${h}" ${can ? '' : 'disabled'}>${ui.sel === h && can ? '<span class="sc-halo"></span>' : ''}${scCard(cat, id, { owner: 'p' })}</button>`).join('')}</div></div>
    </div>`;
  }
  // Fin d'une énigme : récompense, ou la solution après trois essais
  function result(out) {
    const k = ui.k, pz = g.enigmePuzzles()[k];
    const el = document.createElement('div');
    el.className = `sc-end ${out.ok ? 'won' : 'lost'}`;
    let sol = '';
    if (out.failed) {
      const s = pz.solutions[0], c = cat.get(pz.hand[s.h]);
      sol = `<p class="sc-caps">La solution : poser <b>${esc(c.name)}</b> sur la case ${['en haut à gauche', 'en haut au milieu', 'en haut à droite', 'au milieu à gauche', 'du centre', 'au milieu à droite', 'en bas à gauche', 'en bas au milieu', 'en bas à droite'][s.cell]}.</p>`;
    }
    el.innerHTML = `<div class="sc-end-in"><h1 class="sc-draw">${out.ok ? 'Énigme résolue !' : 'Énigme ratée'}</h1>
      ${out.ok ? `<p class="eg-big">${starRow(out.stars)}</p><p class="sc-gain">${icon('crystal')} <b>+${fmt(out.shards)}</b> éclats · +${out.xp} XP</p>` : sol}
      ${out.chest ? `<a class="sc-gain sc-chestwin" href="#/coffres">${icon('p:chest')} <b>Coffre de bois</b> gagné : les trois énigmes du jour !</a>` : ''}
      ${out.streak > 1 ? `<p class="small muted center">Série : ${out.streak} jours de suite</p>` : ''}
      <div class="sc-end-act">${out.failed ? '<button class="btn primary dc-plq dc-plq-red" data-x="show">Voir la solution</button>' : ''}<button class="btn dc-plq dc-plq-dark" data-x="back">Retour aux énigmes</button></div></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-x]'); if (!b) return;
      el.remove();
      if (b.dataset.x === 'show') showSolution();
      else lobby();
    });
  }
  function showSolution() {
    const pz = g.enigmePuzzles()[ui.k], s = pz.solutions[0], r = EG.tryMove(cat, pz, s.h, s.cell);
    view({ st: r.st, mark: { cell: s.cell, flips: r.flips.map((f) => f.cell) }, msg: `La solution : ${r.n} cartes capturées en une pose.` });
  }
  async function attempt(h, cell) {
    const k = ui.k, pz = g.enigmePuzzles()[k];
    let out;
    try { out = g.enigmeTry(k, h, cell); } catch (err) { toast(esc(err.message), { kind: 'error' }); return; }
    busy = true; ui.sel = null;
    const r = EG.tryMove(cat, pz, h, cell), flips = r.flips.map((f) => f.cell);
    app.sfx.pose?.();
    view({ st: r.st, mark: { cell, flips: [] }, msg: '' });
    await wait(350);
    if (gone) return;
    view({ st: r.st, mark: { cell, flips }, msg: `${out.n} carte${out.n > 1 ? 's' : ''} capturée${out.n > 1 ? 's' : ''} sur ${pz.goal}` });
    if (out.n) app.sfx.capture?.();
    await wait(out.ok ? 900 : 1400);
    busy = false;
    if (gone) return;
    app.chrome?.();
    if (out.ok) { (out.chest ? app.sfx.victory : app.sfx.solved)?.(); result(out); } /* v441 : son « solved » ; la fanfare seulement pour les trois énigmes du jour */
    else if (out.failed) { app.sfx.defeat?.(); result(out); }
    else { app.sfx.error?.(); view({ msg: `Pas tout à fait : ${out.n} sur ${pz.goal}. Encore ${out.left} essai${out.left > 1 ? 's' : ''}.` }); }
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-eg]');
    if (!b || b.disabled || busy) return;
    const k = b.dataset.eg;
    if (k === 'open') {
      ui.k = Number(b.dataset.k); ui.sel = null; app.sfx.enter?.();
      if (g.enigmes().done[ui.k]) return showSolution(); /* énigme terminée : on revoit sa solution */
      view(); tuto(app, 'enigmes-play'); return;
    }
    if (k === 'back') return lobby();
    if (k === 'rule') return openRuleHelp(app, g.enigmePuzzles()[ui.k].rule);
    if (k === 'pick') { ui.sel = Number(b.dataset.h); app.sfx.tap?.(); return view(); }
    if (k === 'cell' && ui.sel != null) attempt(ui.sel, Number(b.dataset.i));
  });

  if (ui.k != null && g.sceauxOpen()) view(); else lobby();
  return () => { gone = true; clearTimeout(timer); document.body.classList.remove('battle-mode'); ['.sc-end', '.sc-scene'].forEach((q) => document.querySelector(q)?.remove()); };
}
