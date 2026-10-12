// Duels des Sceaux : accueil (adversaires, défi du jour, main), plateau 3 × 3 et fin de partie.
import * as SC from '../core/sceaux.js';
import { STARTER } from '../core/army.js';
import { artUrl } from '../art/assets.js';
import { icon, sigil, crestHTML } from '../ui/icons.js';
import { openSheet, esc, fmt, toast } from '../ui/dom.js';
import { setScene } from '../ui/scene.js';
import { tuto } from '../ui/tutos.js';

const V = SC.showVal;
// Petite carte du jeu : illustration, nom, emblème de faction et quatre valeurs sur les bords
function scCard(cat, id, { vals = null, owner = '', cls = '' } = {}) {
  const c = cat.get(id);
  const v = vals || SC.sideValues(c);
  return `<span class="sc-card ${owner ? `sc-${owner}` : ''} ${cls} r-${c.rarity}" data-id="${id}">
    <img alt="" src="${artUrl(c, { lite: true })}"><span class="sc-veil"></span>
    <i class="sc-v t">${V(v[0])}</i><i class="sc-v r">${V(v[1])}</i><i class="sc-v b">${V(v[2])}</i><i class="sc-v l">${V(v[3])}</i>
    <span class="sc-sig">${sigil(c.faction)}</span><span class="sc-nm">${esc(c.name)}</span></span>`;
}

export default function sceauxScreen(app, root) {
  const g = app.game, cat = app.catalog;
  const ui = (app.state.sceaux ||= { sel: null });
  let busy = false, timer = 0;
  const wait = (ms) => new Promise((r) => { timer = setTimeout(r, app.reduced() ? Math.min(ms, 60) : ms); });

  function lobby() {
    document.body.classList.remove('battle-mode');
    setScene('menu');
    const sc = g.s.sceaux, hand = g.sceauxHand(), d = g.sceauxDaily();
    const dailyDone = sc.dailyDone === todayKey();
    const R = SC.RIVAL[d.rival];
    root.innerHTML = `<header class="screen-head ui-hero bn-sceaux"><h1>Duels des Sceaux</h1><p class="muted">Pose tes cartes sur le plateau et capture celles de l’adversaire.</p>
        <span class="sc-rec">${sc.wins} victoire${sc.wins > 1 ? 's' : ''} · ${sc.losses} défaite${sc.losses > 1 ? 's' : ''} · ${sc.draws} égalité${sc.draws > 1 ? 's' : ''}</span></header>
      <div class="row gap wrap sc-top"><button class="btn small" data-sc="rules">${icon('p:help')}Règles</button><button class="btn small" data-sc="hand">${icon('p:cards')}Composer ma main</button></div>
      <section class="panel sc-hand"><span class="small muted">Ta main</span><div class="sc-row">${hand.map((id) => scCard(cat, id, { owner: 'p' })).join('')}</div>
        ${hand.some((id) => !g.owns(id)) ? '<p class="small muted">Les cartes de départ qui te manquent sont prêtées pour la partie.</p>' : ''}</section>
      <button class="panel sc-daily ${dailyDone ? 'done' : ''}" data-sc="daily" ${dailyDone ? 'disabled' : ''}>
        <img alt="" src="assets/icons/hourglass.webp"><span><b>Défi du jour</b><span class="small">${esc(R.name)} · règle « ${esc(SC.RULES[d.rule].name)} »</span>
        <span class="small muted">${dailyDone ? 'Relevé aujourd’hui. Nouveau défi demain.' : `+${SC.SCEAUX_REWARD.daily} éclats en plus en cas de victoire`}</span></span>${dailyDone ? icon('check') : icon('next')}</button>
      <h2 class="section-title">Adversaires</h2>
      <div class="sc-rivals">${SC.RIVALS.map((r, i) => { const open = SC.rivalUnlocked(g.s, i), won = sc.beaten[r.key]; return `<button class="sc-rival ${open ? '' : 'locked'} ${won ? 'won' : ''}" data-sc="play" data-r="${r.key}" ${open ? '' : 'disabled'}>
        <span class="sc-por"><img alt="" src="${artUrl(cat.get(r.portrait), { lite: true })}"></span>
        <span class="sc-ri"><b>${esc(r.name)}</b><span class="small">${esc(r.title)} · ${'★'.repeat(r.level)}${'☆'.repeat(4 - r.level)}</span>
        <span class="small muted">${open ? `Règle « ${esc(SC.RULES[r.rule].name)} » · +${r.reward} éclats${won ? '' : ` · 1re victoire +${SC.SCEAUX_REWARD.firstWin}`}` : `Bats ${esc(SC.RIVALS[i - 1].name)} pour l’affronter`}</span></span>
        ${won ? `<span class="sc-won">${icon('check')}</span>` : open ? icon('next') : icon('p:mysteries')}</button>`; }).join('')}</div>
      <p class="small muted center">Récompenses : ${SC.SCEAUX_REWARD.dailyPaid} victoires payées par jour (${Math.max(0, SC.SCEAUX_REWARD.dailyPaid - (sc.day === todayKey() ? sc.paidToday : 0))} restantes aujourd’hui). Au-delà, tu peux jouer pour le plaisir.</p>`;
    tuto(app, 'sceaux');
  }
  const todayKey = () => { const d = g.clock(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

  // ——— Partie ———
  function boardView(last = null) {
    const st = g.s.sceaux.cur;
    if (!st) return lobby();
    document.body.classList.add('battle-mode');
    setScene(null);
    const R = SC.RIVAL[st.rival], s = SC.score(st);
    const cell = (c, i) => {
      const tags = `${i === st.cells.blessed ? '<span class="sc-tag bless">+1</span>' : ''}${i === st.cells.cursed ? '<span class="sc-tag curse">−1</span>' : ''}`;
      if (!c) return `<button class="sc-cell ${ui.sel != null && st.turn === 'p' && !st.over ? 'can' : ''} ${i === st.cells.blessed ? 'blessed' : ''} ${i === st.cells.cursed ? 'cursed' : ''}" data-sc="cell" data-i="${i}" aria-label="Case ${i + 1}">${tags}</button>`;
      const fl = last?.flips?.find((f) => f.cell === i);
      return `<div class="sc-cell full ${last?.cell === i ? 'drop' : ''} ${fl ? 'flip' : ''}">${scCard(cat, c.id, { vals: c.vals, owner: c.owner })}${fl ? `<span class="sc-cmp d${(fl.dir + 2) % 4}">${V(fl.mine)} &gt; ${V(fl.theirs)}</span>` : ''}${tags}</div>`;
    };
    root.innerHTML = `<div class="sc-game">
      <div class="sc-bar"><span class="sc-who o"><img alt="" src="${artUrl(cat.get(R.portrait), { lite: true })}"><span><b>${esc(R.name)}</b><small>${st.hands.o.length} carte${st.hands.o.length > 1 ? 's' : ''} en main</small></span></span>
        <span class="sc-score"><b class="o">${s.o}</b><i>·</i><b class="p">${s.p}</b></span>
        <button class="btn small ghost" data-sc="quit" aria-label="Quitter la partie">${icon('close')}</button></div>
      <p class="sc-rule small">${st.rule !== 'classique' ? `${icon('p:rule')} ${esc(SC.RULES[st.rule].name)} : ${esc(SC.RULES[st.rule].desc)}` : 'Règles classiques'}</p>
      <div class="sc-board">${st.board.map(cell).join('')}</div>
      <p class="sc-msg">${st.over ? '' : st.turn === 'p' ? (ui.sel == null ? 'Touche une de tes cartes, puis une case libre.' : 'Touche une case libre pour poser la carte.') : `${esc(R.name)} réfléchit…`}</p>
      <div class="sc-hand-row">${st.hands.p.map((id, k) => `<button class="sc-hc ${ui.sel === k ? 'sel' : ''}" data-sc="pick" data-k="${k}" ${st.turn !== 'p' || st.over ? 'disabled' : ''}>${scCard(cat, id, { owner: 'p' })}</button>`).join('')}</div>
    </div>`;
  }
  async function aiTurn() {
    const st = g.s.sceaux.cur;
    if (!st || st.over || st.turn !== 'o') return;
    busy = true;
    await wait(650);
    if (!g.s.sceaux.cur) return;
    const r = g.sceauxAi();
    app.sfx.slash?.();
    boardView(r);
    if (r?.flips.length) { await wait(250); app.sfx.reveal?.('R'); }
    busy = false;
    if (g.s.sceaux.cur?.over) { await wait(900); end(); }
  }
  function end() {
    const st = g.s.sceaux.cur;
    if (!st?.over) return;
    const out = g.sceauxFinish();
    const R = SC.RIVAL[st.rival], f = st.final;
    app.chrome?.();
    (st.over === 'won' ? app.sfx.victory : st.over === 'lost' ? app.sfx.defeat : app.sfx.tap)?.();
    const el = document.createElement('div');
    el.className = 'sc-end';
    el.innerHTML = `<div class="sc-end-in">${st.over === 'draw' ? '<h1 class="sc-draw">Égalité</h1>' : crestHTML(st.over === 'won', st.over === 'won' ? 'Victoire' : 'Défaite', '', 'sc-crest')}
      <p class="sc-final"><b>${f.p}</b> contre <b>${f.o}</b></p>
      <p class="sc-say"><img alt="" src="${artUrl(cat.get(R.portrait), { lite: true })}"><span>« ${esc(st.over === 'won' ? R.win : st.over === 'lost' ? R.lose : 'Partie nulle. On recommence ?')} »</span></p>
      ${out.shards ? `<p class="sc-gain">${icon('crystal')} <b>+${fmt(out.shards)}</b> éclats${out.first ? ' (première victoire)' : ''}</p>` : ''}
      ${out.capped ? '<p class="small muted">Plus de victoires payées aujourd’hui : tu joues pour la gloire.</p>' : ''}
      ${out.title ? `<p class="sc-gain">${icon('p:titles')} Nouveau titre : <b>${esc(out.title)}</b></p>` : ''}
      ${out.frame ? `<p class="sc-gain">${icon('p:titles')} Nouveau cadre de profil : <b>Cadre des Sceaux</b></p>` : ''}
      <div class="sc-end-act">${st.daily ? '' : '<button class="btn primary dc-plq dc-plq-red" data-x="again">Revanche</button>'}<button class="btn dc-plq dc-plq-dark" data-x="back">Retour</button></div></div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-x]');
      if (!b) return;
      el.remove();
      const rival = st.rival;
      g.sceauxQuit();
      if (b.dataset.x === 'again') start({ rival });
      else lobby();
    });
  }
  function start(opts) {
    try { g.sceauxStart(opts); } catch (e) { toast(esc(e.message), { kind: 'error' }); return; }
    ui.sel = null;
    const st = g.s.sceaux.cur, R = SC.RIVAL[st.rival];
    boardView();
    toast(`<b>${esc(R.name)}</b> : « ${esc(R.hello)} »<br><span class="small">${st.first === 'p' ? 'Tu commences.' : `${esc(R.name)} commence.`}</span>`, { ms: 3200 });
    tuto(app, 'sceaux-board');
    aiTurn();
  }
  function rules() {
    openSheet(`<div class="sc-rules"><h2>Règles des Sceaux</h2>
      <ul class="small"><li>Chaque joueur a <b>5 cartes</b>. Chaque carte a quatre valeurs : <b>haut, droite, bas, gauche</b> (de 1 à 10 ; 10 s’écrit A).</li>
      <li>À tour de rôle, on pose une carte sur une <b>case libre</b> du plateau de 3 × 3.</li>
      <li>Si une valeur de ta carte est <b>plus grande</b> que la valeur d’en face d’une carte adverse voisine, tu la <b>captures</b> : elle passe de ta couleur. À valeur égale, rien ne se passe.</li>
      <li>Après les 9 poses, on compte les cartes de chaque couleur sur le plateau, plus la carte restée en main. Le plus grand total gagne ; <b>5 contre 5</b>, c’est une égalité.</li>
      <li>Toutes les cartes ont le même total de valeurs (20) : une Mythique a des pointes plus fortes, mais aussi des côtés plus faibles. Une Commune bien placée peut la capturer.</li></ul>
      <h3>Règles spéciales</h3>${Object.values(SC.RULES).map((r) => `<p class="small"><b>${esc(r.name)}</b> : ${esc(r.desc)}</p>`).join('')}
      <p class="small muted">Victoires payées : ${SC.SCEAUX_REWARD.dailyPaid} par jour. Première victoire contre un adversaire : +${SC.SCEAUX_REWARD.firstWin} éclats. Défi du jour : +${SC.SCEAUX_REWARD.daily}.</p></div>`, { label: 'Règles des Sceaux' });
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
    if (k === 'rules') return rules();
    if (k === 'hand') return handSheet();
    if (k === 'daily') return start({ daily: true });
    if (k === 'play') return start({ rival: b.dataset.r });
    if (k === 'quit') {
      if (!g.s.sceaux.cur?.over && !confirm('Abandonner la partie ? Elle sera comptée comme une défaite.')) return;
      const st = g.s.sceaux.cur;
      if (st && !st.over) { st.over = 'lost'; st.final = SC.score(st); g.sceauxFinish(); }
      g.sceauxQuit(); return lobby();
    }
    const st = g.s.sceaux.cur;
    if (!st || st.over || busy || st.turn !== 'p') return;
    if (k === 'pick') { ui.sel = Number(b.dataset.k); app.sfx.tap(); return boardView(); }
    if (k === 'cell' && ui.sel != null) {
      let flips;
      try { flips = g.sceauxPlay(ui.sel, Number(b.dataset.i)); } catch (err) { toast(esc(err.message), { kind: 'error' }); return; }
      ui.sel = null;
      app.sfx.slash?.();
      boardView({ cell: Number(b.dataset.i), flips });
      if (flips.length) app.sfx.reveal?.('R');
      if (g.s.sceaux.cur?.over) { busy = true; setTimeout(() => { busy = false; end(); }, app.reduced() ? 100 : 900); }
      else aiTurn();
    }
  });

  if (g.s.sceaux.cur && !g.s.sceaux.cur.rewarded) { boardView(); if (g.s.sceaux.cur.over) end(); else aiTurn(); }
  else { if (g.s.sceaux.cur) g.sceauxQuit(); lobby(); }
  return () => { clearTimeout(timer); document.body.classList.remove('battle-mode'); document.querySelector('.sc-end')?.remove(); };
}
