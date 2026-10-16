// Duels des Sceaux : accueil (adversaires, défi du jour, main), plateau 3 × 3 et fin de partie.
import * as SC from '../core/sceaux.js';
import { openRuleHelp } from '../ui/sceaux-demo.js';
import { STARTER } from '../core/army.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil, picon, crestHTML } from '../ui/icons.js';
import { openSheet, esc, fmt, toast, confirmBox } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { tuto } from '../ui/tutos.js';

const V = SC.showVal;
const RULE_ICON = { identique: 'sc-same', somme: 'sc-sum', abime: 'sc-abyss', sacre: 'sc-sacre', instable: 'sc-instable', faction: 'sc-faction', usure: 'sc-usure', archive: 'sc-archive', neant: 'sc-neant' };
// « Comment ça marche » : même présentation que la Descente (icône, couleur, numéro)
const HOW = [['cards', '#7FA8D8', 'Ta main', '5 cartes. Chacune a quatre valeurs, une par côté (de 1 à 10 ; 10 s’écrit A).'],
  ['seal', '#E8C35A', 'Le plateau', 'À tour de rôle, chacun pose une carte sur une case libre du plateau de 3 × 3.'],
  ['swords', '#E0485E', 'Capturer', 'Si ta valeur est plus grande que celle d’en face d’une carte adverse voisine, tu la captures. À égalité, rien ne se passe.'],
  ['crown', '#F2C14E', 'La victoire', 'Après les 9 poses, on compte les cartes de chaque couleur, plus celle restée en main. À 5 contre 5, celui qui tient la case centrale (le cœur du Sceau) gagne.'],
  ['holo', '#FF8AD8', 'Pouvoirs de rareté', 'Les Hyper rares sont Inviolables (bouclier doré : elles résistent à la première capture). Les Mythiques ont la Fureur (épées en flammes : elles capturent aussi à égalité quand tu les poses). Les Secrètes ont les deux.'],
  ['rule', '#B48CFF', 'Règles spéciales', 'Certains adversaires jouent avec une règle en plus : Identique, Somme (avec Combo en cascade), cases sacrées, plateau instable, fraternité, Abîme, Usure, Archives ou Néant.'],
  ['crystal', '#7FE0A0', 'Butin', 'Une fois par jour, après une victoire, tu gardes une carte adverse que tu contrôles sur le plateau (Hyper rare au plus).'],
  ['hourglass', '#9FE0FF', 'Adversaires et défi', 'Bats chaque adversaire pour débloquer le suivant. Un défi du jour t’attend aussi.'],
  ['danger', '#FF5468', 'Revanches implacables', 'Une fois un adversaire battu, tu peux l’affronter implacable : main plus rare, jeu plus fin, récompense ×1,5 et +150 éclats la première fois.']];
// Salle de chaque adversaire (assets/sceaux) : le plateau reste le même, le décor change
const THEME = { initie: 'salle', collectionneur: 'salle-artificiel', stratege: 'salle-celeste', maitre: 'salle-necrotique', echo: 'salle-abyssal', banquier: 'salle-necrotique', archiviste: 'salle-artificiel', souverain: 'salle-abyssal' };
const RIVAL_OF = (st) => (st.awake ? SC.awakened(SC.RIVAL[st.rival]) : SC.RIVAL[st.rival]);
const stars = (n) => `${'★'.repeat(n)}${'☆'.repeat(Math.max(0, 5 - n))}`;
const PERK_IC = { rempart: '<img alt="" src="assets/icons/pk-rempart.webp">', fureur: '<img alt="" src="assets/icons/pk-fureur.webp">' };
const themeOf = (r) => THEME[r] || 'salle';
// Portrait peint de l'adversaire (assets/sceaux/rival-*.webp), avec l'ancienne image de créature en secours
const rivalPic = (cat, R) => `<img alt="" src="assets/sceaux/rival-${R.key}.webp" onerror="this.onerror=null;this.src='${artUrl(cat.get(R.portrait), { lite: true })}'">`;
// Petite carte du jeu : illustration, nom, emblème de faction et quatre valeurs sur les bords
function scCard(cat, id, { vals = null, owner = '', cls = '', back = false, guard = null } = {}) {
  const c = cat.get(id);
  const v = vals || SC.sideValues(c);
  return `<span class="sc-card ${owner ? `sc-${owner}` : ''} ${cls} r-${c.rarity}" data-id="${id}">
    <img alt="" src="${artUrl(c, { lite: true })}"><span class="sc-veil"></span>${back ? '<img class="sc-back" alt="" src="assets/sceaux/dos.webp">' : ''}
    <i class="sc-v t">${V(v[0])}</i><i class="sc-v r">${V(v[1])}</i><i class="sc-v b">${V(v[2])}</i><i class="sc-v l">${V(v[3])}</i>
    <span class="sc-sig">${sigil(c.faction)}</span><span class="sc-nm">${esc(c.name)}</span>${SC.perksOf(c).map((k) => `<i class="sc-perk ${k}" title="${SC.PERKS[k].name}">${PERK_IC[k]}</i>`).join('')}${guard === false && SC.perksOf(c).includes('rempart') ? '<i class="sc-perk broken"></i>' : ''}</span>`;
}

export default function sceauxScreen(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.sceaux ||= { sel: null });
  let busy = false, timer = 0;
  const wait = (ms) => new Promise((r) => { timer = setTimeout(r, app.reduced() ? Math.min(ms, 60) : ms); });

  function lobby() {
    document.body.classList.remove('battle-mode', 'sc-lost');
    document.querySelector('.sc-scene')?.remove();
    setScene('menu');
    // les Duels des Sceaux s'ouvrent après le premier gardien vaincu : un nouveau joueur découvre d'abord la Descente
    if (!g.sceauxOpen()) {
      root.innerHTML = `<header class="screen-head ui-hero bn-sceaux"><h1>Duels des Sceaux</h1><p class="muted">Un jeu de cartes à part, contre les arbitres des Sceaux.</p></header>
        <section class="panel tr-lock">${icon('lock')}<b>Encore scellés</b><p class="small">Vaincs ton <b>premier gardien</b> dans la Descente (étage 5) pour ouvrir les Duels des Sceaux.</p><a class="btn primary block" href="#/descente">${icon('p:descend')}Aller à la Descente</a></section>`;
      return;
    }
    const sc = g.s.sceaux, hand = g.sceauxHand(), d = g.sceauxDaily();
    const dailyDone = sc.dailyDone === todayKey();
    const R = SC.RIVAL[d.rival];
    root.innerHTML = `<header class="screen-head ui-hero bn-sceaux"><h1>Duels des Sceaux</h1><p class="muted">Pose tes cartes sur le plateau et capture celles de l’adversaire.</p>
        <span class="sc-rec">${sc.wins} victoire${sc.wins > 1 ? 's' : ''} · ${sc.losses} défaite${sc.losses > 1 ? 's' : ''} · ${sc.draws} égalité${sc.draws > 1 ? 's' : ''}</span></header>
      <button class="panel sc-daily ${dailyDone ? 'done' : ''}" data-sc="daily" ${dailyDone ? 'disabled' : ''}>
        <img alt="" src="assets/icons/hourglass.webp"><span><b>Défi du jour</b><span class="small">${esc(R.name)} · règle « ${esc(SC.RULES[d.rule].name)} »</span>
        <span class="small muted">${dailyDone ? 'Relevé aujourd’hui. Nouveau défi demain.' : `+${SC.SCEAUX_REWARD.daily} éclats en plus en cas de victoire`}</span></span>${dailyDone ? icon('check') : icon('next')}</button>
      <h2 class="section-title">Adversaires</h2>
      ${(() => { const items = SC.RIVALS.map((r, i) => { const open = SC.rivalUnlocked(g.s, i), won = sc.beaten[r.key]; return [open, `<button class="sc-rival ${open ? '' : 'locked'} ${won ? 'won' : ''}" data-sc="play" data-r="${r.key}" ${open ? '' : 'disabled'} style="background-image:linear-gradient(90deg, rgba(12, 13, 20, .97) 38%, rgba(12, 13, 20, .45) 72%, rgba(12, 13, 20, .15)), url(assets/sceaux/${themeOf(r.key)}.webp)">
        <span class="sc-por">${rivalPic(cat, r)}</span>
        <span class="sc-ri"><b>${esc(r.name)}</b><span class="small">${esc(r.title)} · ${stars(r.level)}</span>
        <span class="small muted">${open ? `Règle « ${esc(SC.RULES[r.rule].name)} » · +${r.reward} éclats${won ? '' : ` · 1re victoire +${SC.SCEAUX_REWARD.firstWin}`}` : `Bats ${esc(SC.RIVALS[i - 1].name)} pour l’affronter`}</span></span>
        ${won ? `<span class="sc-won">${icon('check')}</span>` : open ? icon('next') : icon('p:mysteries')}</button>${won ? `<button class="sc-awake ${(sc.awake || {})[r.key] ? 'won' : ''}" data-sc="awake" data-r="${r.key}">${icon('skull')}<span><b>Revanche implacable</b><small>${stars(Math.min(5, r.level + 1))} · +${Math.round(r.reward * 1.5)} éclats${(sc.awake || {})[r.key] ? ' · battu' : ` · 1re victoire +${SC.SCEAUX_REWARD.firstAwake}`}</small></span>${(sc.awake || {})[r.key] ? icon('check') : icon('next')}</button>` : ''}`]; }); const o = items.filter((x) => x[0]).map((x) => x[1]).join(''), l = items.filter((x) => !x[0]); return `<div class="sc-rivals">${o}</div>${l.length ? `<details class="panel dc-fold"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/mysteries.webp"><span class="dc-sum-t">Adversaires à venir (${l.length})</span></summary><div class="sc-rivals">${l.map((x) => x[1]).join('')}</div></details>` : ''}`; })()}
      <details class="panel dc-fold sc-handfold"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/cards.webp"><span class="dc-sum-t">Ta main</span></summary>
        <div class="sc-row">${hand.map((id) => scCard(cat, id, { owner: 'p' })).join('')}</div>
        ${hand.some((id) => !g.owns(id)) ? '<p class="small muted">Les cartes de départ qui te manquent sont prêtées pour la partie.</p>' : ''}
        <button class="btn block dc-plq dc-plq-dark" data-sc="hand">${icon('p:cards')}Composer ma main</button></details>
      <p class="small muted center">Récompenses : ${SC.SCEAUX_REWARD.dailyPaid} victoires payées par jour (${Math.max(0, SC.SCEAUX_REWARD.dailyPaid - (sc.day === todayKey() ? sc.paidToday : 0))} restantes aujourd’hui). Au-delà, tu peux jouer pour le plaisir.</p>
      <details class="panel dc-fold dc-how"><summary><img class="picon dc-sum-ic" alt="" src="assets/icons/help.webp"><span class="dc-sum-t">Comment ça marche</span></summary>
        <ol class="how-steps">${HOW.map(([ic, c, t, d], i) => `<li style="--hc:${c}"><span class="how-ic">${picon(ic)}<em>${i + 1}</em></span><span><b>${t}</b><span class="small">${d}</span></span></li>`).join('')}</ol>
        <button class="btn small gold block sc-demo-b" data-sc="demo" data-k="classique">${icon('p:rule')}Voir comment on capture (animation)</button>
        ${Object.entries(SC.RULES).filter(([k]) => k !== 'classique').map(([k, r]) => `<button class="sc-rl sc-rl-b" data-sc="demo" data-k="${k}"><span><b>${esc(r.name)}</b> : ${esc(r.desc)}</span><span class="sc-rl-play">▶ Voir</span></button>`).join('')}
        <p class="small muted center">Toutes les cartes ont le même total de valeurs (20) : une Commune bien placée peut capturer une Mythique.</p></details>`;
    tuto(app, 'sceaux').then(() => { if (Object.keys(sc.beaten || {}).length) tuto(app, 'sceaux-awake'); });
  }
  const todayKey = () => { const d = g.clock(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

  // ——— Partie ———
  // Décor fixe derrière l'écran (hors de #view, qui est animé)
  function scene(rival) {
    let el = document.querySelector('.sc-scene');
    if (!el) { el = document.createElement('div'); document.body.prepend(el); }
    const t = themeOf(rival);
    el.className = `sc-scene th-${t}`;
    el.style.backgroundImage = `url(assets/sceaux/${t}.webp)`;
  }
  // Score affiché : propriétaires visibles (une capture en cours d'animation n'est comptée qu'à la fin)
  const shownScore = (st, pending) => {
    const s = { p: st.hands.p.length, o: st.hands.o.length };
    st.board.forEach((c, i) => { if (c) s[pending?.has(i) ? (c.owner === 'p' ? 'o' : 'p') : c.owner]++; });
    return s;
  };
  function boardView({ pending = null, drop = null, intro = false, shake = false } = {}) {
    const st = g.s.sceaux.cur;
    if (!st) return lobby();
    document.body.classList.add('battle-mode');
    setScene(null);
    scene(st.rival);
    const R = RIVAL_OF(st), s = shownScore(st, pending), myTurn = st.turn === 'p' && !st.over && !busy;
    const rs = (i) => `${i === st.cells.blessed ? '<span class="sc-rs bless"></span>' : ''}${i === st.cells.cursed ? '<span class="sc-rs curse"></span>' : ''}`;
    const tags = (i) => `${i === st.cells.blessed ? '<span class="sc-tag bless">+1</span>' : ''}${i === st.cells.cursed ? '<span class="sc-tag curse">−1</span>' : ''}`;
    const cell = (c, i) => {
      if (!c) return `<button class="sc-cell ${i === SC.CENTER ? 'heart' : ''} ${ui.sel != null && myTurn ? 'can' : ''}" style="--d:${i * 45}ms" data-sc="cell" data-i="${i}" aria-label="Case ${i + 1}${i === st.cells.blessed ? ', bénie' : i === st.cells.cursed ? ', maudite' : ''}">${rs(i)}${tags(i)}</button>`;
      const own = pending?.has(i) ? (c.owner === 'p' ? 'o' : 'p') : c.owner;
      return `<div class="sc-cell full ${i === SC.CENTER ? 'heart' : ''} ${drop === i ? 'drop' : ''}" style="--d:${i * 45}ms" data-i="${i}">${scCard(cat, c.id, { vals: c.vals, owner: own, back: true, guard: c.guard })}${rs(i)}${tags(i)}</div>`;
    };
    root.innerHTML = `<div class="sc-game ${app.reduced() ? 'rm' : ''}">
      <div class="sc-bar"><span class="sc-who ${st.turn === 'o' && !st.over ? 'on' : ''}"><span class="sc-med">${rivalPic(cat, R)}</span><span><b>${esc(R.name)}</b><small>${esc(R.title)}</small></span></span>
        <span class="sc-score" aria-label="Score : toi ${s.p}, ${esc(R.name)} ${s.o}"><b class="p">${s.p}</b><i>·</i><b class="o">${s.o}</b></span>
        <button class="btn small ghost" data-sc="quit" aria-label="Quitter la partie">${icon('close')}</button></div>
      <div class="sc-sub"><span class="sc-ohand" aria-label="${st.hands.o.length} cartes dans sa main">${'<i></i>'.repeat(st.hands.o.length)}</span>
        <button class="sc-rule" data-sc="rules">${RULE_ICON[st.rule] ? `<img class="sc-ricon" alt="" src="assets/icons/${RULE_ICON[st.rule]}.webp">` : icon('p:rule')}${esc(SC.RULES[st.rule].name)}</button></div>
      <div class="sc-bwrap"><div class="sc-board ${intro ? 'intro' : ''} ${shake ? 'shake' : ''}"><div class="sc-plate">${st.board.map(cell).join('')}</div></div></div>
      <p class="sc-msg">${st.over || (busy && st.turn === 'p') ? '' : myTurn ? (ui.sel == null ? 'Touche une de tes cartes, puis une case libre.' : 'Touche une case libre pour poser la carte.') : `${esc(R.name)} réfléchit…`}</p>
      <div class="sc-tray ${myTurn ? 'on' : ''}"><div class="sc-hand-row">${st.hands.p.map((id, k) => `<button class="sc-hc ${ui.sel === k ? 'sel' : ''}" data-sc="pick" data-k="${k}" ${myTurn ? '' : 'disabled'}>${ui.sel === k ? '<span class="sc-halo"></span>' : ''}${scCard(cat, id, { owner: 'p' })}</button>`).join('')}</div></div>
    </div>`;
  }
  // Trait de lumière entre la carte posée et la carte capturée
  function beam(grid, a, b, who) {
    const ax = a % 3, ay = Math.floor(a / 3), bx = b % 3, by = Math.floor(b / 3), h = ay === by;
    const el = document.createElement('span');
    el.className = `sc-beam ${who} ${h ? 'h' : 'v'} ${(h ? bx < ax : by < ay) ? 'rev' : ''}`;
    el.style.left = `${((h ? Math.min(ax, bx) : ax) + 0.5) / 3 * 100}%`;
    el.style.top = `${((h ? ay : Math.min(ay, by)) + 0.5) / 3 * 100}%`;
    grid.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }
  // Pose puis captures, une par une : trait, comparaison, carte qui se retourne, éclat du sceau, score
  async function animateMove(m, cellsBefore) {
    busy = true;
    const st = g.s.sceaux.cur;
    const pending = new Set(m.flips.filter((f) => !f.blocked).map((f) => f.cell));
    boardView({ pending, drop: m.cell });
    app.sfx.pose?.();
    const board = root.querySelector('.sc-board');
    board?.classList.add('flash'); setTimeout(() => board?.classList.remove('flash'), 300);
    await wait(340);
    let shown = null;
    for (const f of m.flips) {
      const grid = root.querySelector('.sc-plate');
      const el = grid?.querySelector(`.sc-cell[data-i="${f.cell}"]`);
      if (!el) break;
      if (f.blocked) { el.insertAdjacentHTML('beforeend', `<span class="sc-block">${PERK_IC.rempart}Inviolable !</span>`); el.querySelector('.sc-perk.rempart')?.classList.add('gone'); app.sfx.block?.(); await wait(650); continue; }
      if (f.rule && f.rule !== shown) {
        shown = f.rule;
        const b = document.createElement('div'); b.className = `sc-combo ${f.rule}`; b.innerHTML = `<img class="sc-cburst" alt="" src="assets/fx/burst.webp"><img class="sc-cico" alt="" src="assets/icons/${{ identique: 'sc-same', somme: 'sc-sum', combo: 'sc-combo', fureur: 'sc-combo' }[f.rule]}.webp"><span>${{ identique: 'Identique !', somme: 'Somme !', combo: 'Combo !', fureur: 'Fureur !' }[f.rule]}</span>`;
        root.querySelector('.sc-board')?.appendChild(b); setTimeout(() => b.remove(), 1100);
        (f.rule === 'combo' ? app.sfx.crit : f.rule === 'fureur' ? app.sfx.fury : app.sfx.skill)?.(); await wait(380);
      }
      beam(grid, f.from ?? m.cell, f.cell, m.who);
      const cmp = f.rule === 'identique' || f.rule === 'fureur' ? `${V(f.mine)} = ${V(f.theirs)}` : f.rule === 'somme' ? `${V(f.mine)} + ${V(f.theirs)}` : `${V(f.mine)} &gt; ${V(f.theirs)}`;
      el.insertAdjacentHTML('beforeend', `<span class="sc-cmp d${(f.dir + 2) % 4}">${cmp}</span><span class="sc-seal ${m.who}"></span>`);
      const card = el.querySelector('.sc-card');
      card.classList.add('cap');
      app.sfx.capture?.();
      await wait(470);
      card.classList.remove('sc-p', 'sc-o'); card.classList.add(`sc-${m.who}`);
      pending.delete(f.cell);
      const s = shownScore(st, pending), sb = root.querySelector('.sc-score');
      if (sb) { sb.querySelector('.p').textContent = s.p; sb.querySelector('.o').textContent = s.o; sb.querySelector(`.${m.who}`).classList.add('bump'); }
      await wait(220);
    }
    if (m.flips.length) await wait(420);
    busy = false;
    const moved = cellsBefore && (cellsBefore.blessed !== st.cells.blessed || cellsBefore.cursed !== st.cells.cursed);
    boardView({ shake: moved && !st.over });
  }
  async function aiTurn() {
    const st = g.s.sceaux.cur;
    if (!st || st.over || st.turn !== 'o') return;
    busy = true;
    await wait(700);
    if (!g.s.sceaux.cur) return;
    const before = { ...st.cells };
    const r = g.sceauxAi();
    if (r) await animateMove({ ...r, who: 'o' }, before);
    busy = false;
    if (g.s.sceaux.cur?.over) { await wait(500); end(); }
  }
  // Boîte de dialogue de l'adversaire (touche pour fermer)
  function dialog(R, text, sub) {
    document.querySelector('.sc-dlg')?.remove();
    const el = document.createElement('div');
    el.className = 'sc-dlg';
    el.innerHTML = `<b class="n">${esc(R.name)}</b><div class="sc-dlg-in"><span class="sc-dlg-por">${rivalPic(cat, R)}</span><p>« ${esc(text)} »</p></div><small><span>${sub}</span><span>Touche pour fermer</span></small>`;
    document.body.appendChild(el);
    const close = () => { el.remove(); document.removeEventListener('pointerdown', close, true); };
    document.addEventListener('pointerdown', close, true);
    setTimeout(close, 3600);
  }
  function end() {
    const st = g.s.sceaux.cur;
    if (!st?.over) return;
    const out = g.sceauxFinish();
    const R = RIVAL_OF(st), f = st.final;
    app.chrome?.();
    (st.over === 'won' ? app.sfx.victory : st.over === 'lost' ? app.sfx.defeat : app.sfx.tap)?.();
    const caps = st.log.reduce((a, l) => { a[l.who] += l.flips.length; return a; }, { p: 0, o: 0 });
    document.querySelector('.sc-dlg')?.remove();
    if (st.over === 'lost') document.body.classList.add('sc-lost');
    const el = document.createElement('div');
    el.className = `sc-end ${st.over}`;
    el.innerHTML = `${st.over === 'won' && !app.reduced() ? '<div class="sc-rays"></div>' : ''}<div class="sc-end-in">${st.over === 'draw' ? '<h1 class="sc-draw">Égalité</h1>' : crestHTML(st.over === 'won', st.over === 'won' ? 'Victoire' : 'Défaite', '', 'sc-crest')}
      <div class="sc-final"><span class="sc-score"><b class="p">${f.p}</b><i>contre</i><b class="o">${f.o}</b></span></div>
      ${st.tiebreak ? `<p class="sc-caps"><b>Égalité de cartes</b> : ${st.over === 'won' ? 'tu tiens' : 'il tient'} le cœur du Sceau.</p>` : ''}
      <p class="sc-caps">Tes captures : <b>${caps.p}</b> · Les siennes : <b>${caps.o}</b></p>
      ${out.trophy?.length ? `<div class="sc-trophy"><img class="sc-tico" alt="" src="assets/icons/sc-trophy.webp"><b>Butin du jour</b><span class="small">Garde une de ces cartes :</span><div class="sc-tro-row">${out.trophy.map((id) => `<button class="sc-tro" data-tro="${id}">${scCard(cat, id, { owner: 'p' })}</button>`).join('')}</div></div>` : ''}
      <p class="sc-say">${rivalPic(cat, R)}<span>« ${esc(st.over === 'won' ? R.win : st.over === 'lost' ? R.lose : 'Partie nulle. On recommence ?')} »</span></p>
      ${out.shards ? `<p class="sc-gain">${icon('crystal')} <b>+${fmt(out.shards)}</b> éclats${out.first ? ' (première victoire)' : ''}</p>` : ''}
      ${out.capped ? '<p class="small muted">Plus de victoires payées aujourd’hui : tu joues pour la gloire.</p>' : ''}
      ${out.title ? `<p class="sc-gain">${icon('p:titles')} Nouveau titre : <b>${esc(out.title)}</b></p>` : ''}
      ${out.frame ? `<p class="sc-gain">${icon('p:titles')} Nouveau cadre de profil : <b>Cadre des Sceaux</b></p>` : ''}
      <div class="sc-end-act">${st.daily ? '' : '<button class="btn primary dc-plq dc-plq-red" data-x="again">Revanche</button>'}<button class="btn dc-plq dc-plq-dark" data-x="back">Retour</button></div></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e) => {
      const tb = e.target.closest('[data-tro]');
      if (tb) {
        try { const r = g.sceauxTrophy(tb.dataset.tro); app.sfx.reveal?.(cat.get(tb.dataset.tro).rarity); el.querySelector('.sc-trophy').innerHTML = `<b>Butin gagné</b><span class="small">${esc(cat.get(tb.dataset.tro).name)} rejoint ta collection${r.isNewCard ? ' (nouvelle carte !)' : ''}.</span>`; app.chrome?.(); }
        catch (err) { toast(esc(err.message), { kind: 'error' }); }
        return;
      }
      const b = e.target.closest('[data-x]');
      if (!b) return;
      el.remove();
      document.body.classList.remove('sc-lost');
      const rival = st.rival, awake = st.awake;
      g.sceauxQuit();
      if (b.dataset.x === 'again') start({ rival, awake });
      else lobby();
    });
  }
  function start(opts) {
    try { g.sceauxStart(opts); } catch (e) { toast(esc(e.message), { kind: 'error' }); return; }
    ui.sel = null;
    const st = g.s.sceaux.cur, R = RIVAL_OF(st);
    boardView({ intro: true });
    app.sfx.enter?.();
    dialog(R, R.hello, st.first === 'p' ? 'Tu commences.' : `${esc(R.name)} commence.`);
    tuto(app, 'sceaux-board').then(() => (SC.ruleHas(st, 'identique') || SC.ruleHas(st, 'somme') ? tuto(app, 'sceaux-combo') : null))
      .then(() => { if ([...st.hands.p, ...st.hands.o].some((id) => SC.perksOf(cat.get(id)).length)) tuto(app, 'sceaux-perks'); });
    aiTurn();
  }
  // Règles en cours de partie : la même présentation que le volet « Comment ça marche »
  function rules() {
    const sh = openSheet(`<div class="sc-rules"><h2>Règles des Sceaux</h2>
      <ol class="how-steps">${HOW.map(([ic, c, t, d], i) => `<li style="--hc:${c}"><span class="how-ic">${picon(ic)}<em>${i + 1}</em></span><span><b>${t}</b><span class="small">${d}</span></span></li>`).join('')}</ol>
      ${Object.entries(SC.RULES).filter(([k]) => k !== 'classique').map(([k, r]) => `<button class="sc-rl sc-rl-b" data-sc="demo" data-k="${k}"><span><b>${esc(r.name)}</b> : ${esc(r.desc)}</span><span class="sc-rl-play">▶ Voir</span></button>`).join('')}
      ${Object.entries(SC.PERKS).map(([k, p]) => `<p class="small"><b><span class="sc-pkic">${PERK_IC[k]}</span>${esc(p.name)}</b> (${p.rar.join(', ')}) : ${esc(p.desc)}</p>`).join('')}
      <p class="small muted">Victoires payées : ${SC.SCEAUX_REWARD.dailyPaid} par jour. Première victoire contre un adversaire : +${SC.SCEAUX_REWARD.firstWin} éclats. Défi du jour : +${SC.SCEAUX_REWARD.daily}.</p></div>`, { label: 'Règles des Sceaux' });
    // la fenêtre est hors de l'écran des Sceaux : ses boutons « Voir » ont leur propre écouteur
    sh.body.addEventListener('click', (e) => { const b = e.target.closest('[data-sc="demo"]'); if (b) openRuleHelp(app, b.dataset.k); });
  }
  function handSheet() {
    const owned = Object.keys(g.s.collection).filter((id) => cat.get(id));
    const pool = [...new Set([...owned, ...STARTER])];
    let pick = g.sceauxHand().slice();
    const sh = openSheet('', { full: true, label: 'Composer ma main' });
    const draw = () => {
      sh.setContent(`<div class="sc-pick"><h2>Ta main <small>${pick.length} / 5</small></h2>
        <p class="small muted">Varie les directions fortes : une carte forte en haut, une autre forte à droite… ${owned.length < 5 ? 'Les cartes de départ te sont prêtées tant que ta collection est petite.' : ''}</p>
        <div class="row gap"><button class="btn small" data-p="auto">${icon('sparkle')}Main conseillée</button><button class="btn small primary" data-p="ok" ${pick.length === 5 ? '' : 'disabled'}>Valider</button></div>
        <div class="sc-grid">${pool.map((id) => `<button class="sc-pc ${pick.includes(id) ? 'on' : ''}" data-p="t" data-id="${id}">${scCard(cat, id, { owner: pick.includes(id) ? 'p' : '' })}${g.owns(id) ? '' : '<em>prêtée</em>'}</button>`).join('')}</div></div>`);
    };
    sh.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-p]');
      if (!b) return;
      if (b.dataset.p === 't') { const id = b.dataset.id; pick = pick.includes(id) ? pick.filter((x) => x !== id) : pick.length < 5 ? [...pick, id] : pick; app.sfx.tap(); draw(); }
      if (b.dataset.p === 'auto') { pick = SC.autoHand(cat, owned); draw(); }
      if (b.dataset.p === 'ok') { try { g.setSceauxHand(pick); sh.close(); lobby(); } catch (err) { toast(esc(err.message), { kind: 'error' }); } }
    });
    draw();
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sc]');
    if (!b || b.disabled) return;
    const k = b.dataset.sc;
    if (k === 'rules') { const cur = g.s.sceaux.cur; return cur && !cur.over ? openRuleHelp(app, cur.rule, { onAll: rules }) : rules(); } // v329 : la pastille de règle ouvre son animation
    if (k === 'demo') return openRuleHelp(app, b.dataset.k);
    if (k === 'hand') return handSheet();
    if (k === 'daily') return start({ daily: true });
    if (k === 'play') return start({ rival: b.dataset.r });
    if (k === 'awake') return start({ rival: b.dataset.r, awake: true });
    if (k === 'quit') {
      if (busy) return;
      const leave = () => { const st = g.s.sceaux.cur; if (st && !st.over) { st.over = 'lost'; st.final = SC.score(st); g.sceauxFinish(); } g.sceauxQuit(); lobby(); };
      if (!g.s.sceaux.cur?.over) { confirmBox('Abandonner la partie ? Elle sera comptée comme une défaite.', { ok: 'Abandonner', cancel: 'Reprendre la partie', danger: true }).then((yes) => { if (yes) leave(); }); return; }
      return leave();
    }
    const st = g.s.sceaux.cur;
    if (!st || st.over || busy || st.turn !== 'p') return;
    if (k === 'pick') { ui.sel = Number(b.dataset.k); app.sfx.tap(); return boardView(); }
    if (k === 'cell' && ui.sel != null) {
      let flips;
      const before = { ...st.cells }, cell = Number(b.dataset.i);
      try { flips = g.sceauxPlay(ui.sel, cell); } catch (err) { toast(esc(err.message), { kind: 'error' }); return; }
      ui.sel = null;
      document.querySelector('.sc-dlg')?.remove();
      animateMove({ cell, flips, who: 'p' }, before).then(async () => {
        if (g.s.sceaux.cur?.over) { busy = true; await wait(500); busy = false; end(); }
        else aiTurn();
      });
    }
  });

  if (g.s.sceaux.cur && !g.s.sceaux.cur.rewarded) { boardView(); if (g.s.sceaux.cur.over) end(); else aiTurn(); }
  else { if (g.s.sceaux.cur) g.sceauxQuit(); lobby(); }
  return () => { clearTimeout(timer); document.body.classList.remove('battle-mode', 'sc-lost'); ['.sc-end', '.sc-scene', '.sc-dlg'].forEach((q) => document.querySelector(q)?.remove()); };
}
